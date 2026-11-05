"""Records the portfolio previews from the live canvas scenes, frame by frame on a fake clock.

Usage: python scripts/render-previews.py OUTPUT_DIR [name ...]
Needs the playwright Python package and ffmpeg on the PATH.
"""
import base64, functools, http.server, pathlib, subprocess, sys, threading
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'public'
FPS, SECONDS = 24, 9
# Scenes keep the 960x540 layout of the first previews, drawn with more pixels: 1632x918.
LAYOUT_W, LAYOUT_H, SCALE = 960, 540, 1.7

# name: page, canvas, tab to open, CRF. Dense point clouds need a higher CRF to stay near 2 MB.
SCENES = {
    'malaria': ('/portfolio/', '#cloud', None, 27),
    'hookus-pocus': ('/portfolio/', '#scene-hookus canvas', 'tab-hookus', 20),
    'business-plan': ('/portfolio/', '#scene-bp canvas', 'tab-bp', 20),
    'whatsapp': ('/portfolio/', '#scene-wa canvas', 'tab-wa', 20),
    'sherpa': ('/portfolio/', '#scene-sherpa canvas', 'tab-sherpa', 20),
    'lisai': ('/lisai/', '#scene-lis canvas', None, 20),
    'watershed': ('/watershed/', '#cloud', None, 27),
}
# The LIS scene loops every 10.8 s: the 9 s video plays it a little faster to reach the end.
SCENE_MS = {'lisai': 10800}

# Fake clock (capture only).
INIT = """
let now = 0, id = 0, queue = new Map();
performance.now = () => now;
window.requestAnimationFrame = (cb) => { queue.set(++id, cb); return id; };
window.cancelAnimationFrame = (i) => queue.delete(i);
window.__step = (ms) => { now += ms; const due = [...queue.values()]; queue.clear(); due.forEach((cb) => cb(now)); };
"""
STAGE_CSS = f"""
.reel, .solo {{ position: fixed !important; inset: 0 auto auto 0 !important; z-index: 9999; width: {LAYOUT_W}px !important; margin: 0 !important; }}
.reel-stage {{ width: {LAYOUT_W}px !important; height: {LAYOUT_H}px !important; aspect-ratio: auto !important; max-height: none !important; }}
.scene {{ display: block !important; }}
.scene-cap, .callout {{ display: none !important; }}
.scene canvas {{ width: {LAYOUT_W}px !important; height: {LAYOUT_H}px !important; }}
"""
# Flattens the transparent canvas on the page background and returns a PNG.
GRAB = """(selector) => {
  const src = document.querySelector(selector);
  const out = document.createElement('canvas');
  out.width = src.width; out.height = src.height;
  const ctx = out.getContext('2d');
  ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(src, 0, 0);
  return out.toDataURL('image/png').split(',')[1];
}"""


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def record(browser, base, name, out_dir):
    path, selector, tab, crf = SCENES[name]
    step = SCENE_MS.get(name, SECONDS * 1000) / (FPS * SECONDS)
    context = browser.new_context(viewport={'width': 1280, 'height': 800}, device_scale_factor=SCALE)
    page = context.new_page()
    page.add_init_script(INIT)
    page.goto(base + path, wait_until='load')
    page.add_style_tag(content=STAGE_CSS)
    page.evaluate('document.fonts.ready.then(() => 0)')
    for _ in range(100):
        if page.evaluate('document.querySelector(".reel, .solo").classList.contains("is-running")'):
            break
        page.wait_for_timeout(100)
    else:
        raise RuntimeError(f'{name}: the scene never started')
    if tab:
        page.evaluate(f'document.getElementById("{tab}").click()')
    page.wait_for_timeout(300)
    page.evaluate('window.__step(0)')

    encoder = subprocess.Popen([
        'ffmpeg', '-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'png', '-framerate', str(FPS), '-i', '-',
        '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf), '-movflags', '+faststart', '-an',
        str(out_dir / f'{name}.mp4'),
    ], stdin=subprocess.PIPE)
    for frame in range(FPS * SECONDS):
        encoder.stdin.write(base64.b64decode(page.evaluate(GRAB, selector)))
        if frame < FPS * SECONDS - 1:
            page.evaluate(f'window.__step({step})')
    encoder.stdin.close()
    if encoder.wait():
        raise RuntimeError(f'{name}: ffmpeg failed')
    context.close()
    print(name, (out_dir / f'{name}.mp4').stat().st_size // 1024, 'KB', flush=True)


def main():
    out_dir = pathlib.Path(sys.argv[1])
    out_dir.mkdir(parents=True, exist_ok=True)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name in sys.argv[2:] or SCENES:
            record(browser, base, name, out_dir)
        browser.close()


if __name__ == '__main__':
    main()
