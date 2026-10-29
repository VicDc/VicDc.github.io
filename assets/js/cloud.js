/* hero point cloud: the Copernicus GLO-30 tile from Watershed-AI, one point per measured cell.
   Turns once every two minutes, a sweep lights it every seven seconds, the highest point is the
   one orange "found" point. Pauses off screen, on hover, on focus and under reduced motion. */
(function () {
  var fig = document.querySelector('.cloud');
  var canvas = document.getElementById('cloud');
  if (!fig || !canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var callout = fig.querySelector('.callout');
  var btn = fig.querySelector('[data-loop-toggle]');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var BINS = 7, SWEEP_MS = 7000, TURN_MS = 120000, EXAG = 1.6;
  var pts = null, peak = null, colours = null;
  var W = 0, H = 0, dpr = 1, t0 = performance.now(), elapsed = 0, last = 0, raf = 0;
  var s = { seen: false, hover: false, focus: false, held: reduce.matches };

  function readColours() {
    var probe = document.createElement('span');
    probe.style.display = 'none';
    fig.appendChild(probe);
    var mix = [];
    for (var i = 0; i < BINS; i++) {
      var p = i / (BINS - 1);
      probe.style.color = p < 0.5
        ? 'color-mix(in oklch, var(--point-mid) ' + (p * 200) + '%, var(--point-lo))'
        : 'color-mix(in oklch, var(--point-hi) ' + ((p - 0.5) * 200) + '%, var(--point-mid))';
      mix.push(getComputedStyle(probe).color);
    }
    probe.style.color = 'var(--color-accent)';
    var accent = getComputedStyle(probe).color;
    probe.style.color = 'var(--point-hi)';
    var lit = getComputedStyle(probe).color;
    probe.remove();
    colours = { bins: mix, accent: accent, lit: lit };
  }

  function load(d) {
    var w = d.w, h = d.h, z = d.z, min = Infinity, max = -Infinity, i;
    for (i = 0; i < z.length; i++) { if (z[i] < min) min = z[i]; if (z[i] > max) max = z[i]; }
    var span = Math.max(w, h) * d.cell_m, pk = 0;
    pts = new Float32Array(z.length * 4);
    for (i = 0; i < z.length; i++) {
      var x = i % w, y = (i / w) | 0;
      pts[i * 4] = (x - w / 2) * d.cell_m / span;
      pts[i * 4 + 1] = (y - h / 2) * d.cell_m / span;
      pts[i * 4 + 2] = (z[i] - min) / span * EXAG;
      pts[i * 4 + 3] = (z[i] - min) / (max - min);
      if (z[i] === max) pk = i;
    }
    peak = pk;
  }

  function resize() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    draw();
  }

  function draw() {
    if (!pts || !W) return;
    var ang = elapsed / TURN_MS * Math.PI * 2 + 0.6;
    var ca = Math.cos(ang), sa = Math.sin(ang), tilt = 0.62, ct = Math.cos(tilt), st = Math.sin(tilt);
    var sweep = ((elapsed % SWEEP_MS) / SWEEP_MS);
    sweep = sweep < 0.5 ? 2 * sweep * sweep : 1 - Math.pow(-2 * sweep + 2, 2) / 2;
    var sx = -0.62 + sweep * 1.24;
    var scale = Math.min(W, H) * 1.25, cx = W * 0.5, cy = H * 0.56, cam = 2.4;
    var size = Math.max(1.1, W / 520) * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var buckets = [], i, b;
    for (b = 0; b < BINS * 3 + 1; b++) buckets.push([]);
    var n = pts.length / 4, px = 0, py = 0;
    for (i = 0; i < n; i++) {
      var x = pts[i * 4], y = pts[i * 4 + 1], z = pts[i * 4 + 2];
      var rx = x * ca - y * sa, ry = x * sa + y * ca;
      var vy = -z * ct + ry * st, vz = ry * ct + z * st;
      var k = cam / (cam + vz);
      var X = (cx + rx * scale * k) * dpr, Y = (cy + vy * scale * k) * dpr;
      if (i === peak) { px = X / dpr; py = Y / dpr; continue; }
      var depth = Math.min(2, Math.max(0, Math.round((vz + 0.5) * 2)));
      var lit = Math.abs(x - sx) < 0.025;
      b = lit ? BINS * 3 : depth * BINS + Math.round(pts[i * 4 + 3] * (BINS - 1));
      buckets[b].push(X, Y);
    }
    var alpha = [1, 0.7, 0.42];
    for (b = 0; b < buckets.length; b++) {
      var arr = buckets[b];
      if (!arr.length) continue;
      var lit2 = b === BINS * 3;
      ctx.fillStyle = lit2 ? colours.lit : colours.bins[b % BINS];
      ctx.globalAlpha = lit2 ? 1 : alpha[(b / BINS) | 0];
      var sz = lit2 ? size * 1.3 : size;
      for (i = 0; i < arr.length; i += 2) ctx.fillRect(arr[i], arr[i + 1], sz, sz);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = colours.accent;
    ctx.beginPath(); ctx.arc(px * dpr, py * dpr, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
    if (callout) { callout.style.transform = 'translate(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px)'; fig.classList.add('is-drawn'); }
  }

  function frame(now) {
    elapsed += now - last; last = now;
    draw();
    raf = requestAnimationFrame(frame);
  }

  function sync() {
    var run = s.seen && !s.hover && !s.focus && !s.held;
    if (run && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
    if (btn) btn.textContent = s.held ? 'Play' : 'Pause';
  }

  Promise.resolve(window.DEM)
    .then(function (d) {
      if (!d) return;
      load(d); readColours();
      elapsed = SWEEP_MS * 0.5; // the still frame shows the sweep mid-scene
      resize();
      new ResizeObserver(resize).observe(canvas);
      new IntersectionObserver(function (e) { s.seen = e[0].isIntersecting; sync(); }).observe(fig);
      new MutationObserver(function () { readColours(); draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    })
    .catch(function () { /* no data: the caption still says what belongs here */ });

  if (btn) btn.addEventListener('click', function () { s.held = !s.held; sync(); });
  [['pointerenter', 'hover', true], ['pointerleave', 'hover', false], ['focusin', 'focus', true], ['focusout', 'focus', false]].forEach(function (a) {
    fig.addEventListener(a[0], function () { s[a[1]] = a[2]; sync(); });
  });
  reduce.addEventListener('change', function (e) { s.held = e.matches; sync(); });
})();
