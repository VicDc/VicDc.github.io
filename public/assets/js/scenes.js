/* hero reel scenes drawn as points, in the smear's material: purple points, orange for what was found.
   Every figure comes from the projects themselves:
   - hookus-pocus: docs/results/2026-10-14-openrouter-haiku55-s2-ablation.md (37 scenarios, 3 seeds),
     forbidden actions blocked 0.417 baseline, 1.000 full; allowed actions blocked 0.000.
   - Business Plan AI: output/reports/business_plan_intake_scenario_D_iter3_draft.md and its validation
     workbook: capital 26,910 (own 7,500, loan 19,410, own share 27.9%), break-even 225 nights claimed,
     361 with the 620/month rent, 730 available.
   - WhatsApp Toolkit: the sample contacts and pacing settings in docs/screenshots/agent.png.
   - Sherpa Alzheimer: the flow in its README and user guide (role, retrieval, the 0.55 citation gate,
     the supervisor); which drawn sources pass is a depiction, no score is printed.
   Each scene draws frame t (ms into its 9 s turn); a held reel shows the last frame. */
(function () {
  // the home page reel, or one looping figure on a case page (.solo, run by solo.js)
  var reel = document.querySelector('.reel, .solo');
  var solo = reel && reel.classList.contains('solo');
  if (!reel) return;
  var SCENE_MS = 9000;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var col = {};

  function readColours() {
    var probe = document.createElement('span');
    probe.style.display = 'none';
    reel.appendChild(probe);
    var get = function (v) { probe.style.color = v; return getComputedStyle(probe).color; };
    col = {
      lo: get('var(--point-lo)'), mid: get('var(--point-mid)'), hi: get('var(--point-hi)'),
      accent: get('var(--color-accent)'), ink: get('var(--color-ink)'), ink2: get('var(--color-ink-2)'),
      muted: get('var(--color-muted)'), rule: get('var(--color-rule-2)')
    };
    var font = getComputedStyle(document.body).fontFamily;
    col.font = function (px, w) { return (w || 300) + ' ' + px + 'px ' + font; };
    probe.remove();
  }

  // seeded random, so a still frame is the same frame every time
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  var ease = function (x) { x = Math.max(0, Math.min(1, x)); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
  function dot(ctx, x, y, r) { ctx.fillRect(x - r / 2, y - r / 2, r, r); }
  function text(ctx, s, x, y, px, colour, w, align) {
    ctx.font = col.font(px, w); ctx.fillStyle = colour; ctx.textAlign = align || 'left'; ctx.fillText(s, x, y);
  }

  /* ---------- hookus-pocus: the action gate ---------- */
  function gate(ctx, W, H, t) {
    var r = rng(7), half = SCENE_MS / 2, full = t >= half;
    var gx = W * 0.56, top = H * 0.2, bot = H * 0.78, travel = 2600;
    var phaseStart = full ? half : 0, local = t - phaseStart;
    // the gate: a plane of points
    ctx.fillStyle = col.rule;
    for (var gy = top; gy <= bot; gy += 6) for (var d = 0; d < 3; d++) dot(ctx, gx + d * 4, gy + d * 2, 1.4);
    var leaked = 0, stopped = 0;
    for (var i = 0; i < 170; i++) {
      var born = r() * half - 2600 * 0.7, bad = r() < 0.34, z = r(), y = top + 8 + r() * (bot - top - 16);
      var blocked = bad && r() < (full ? 1 : 0.417);
      if (born > local) continue;
      var p = (local - born) / travel, size = 2 + z * 2.6, x = W * 0.06 + p * (W * 0.9);
      ctx.globalAlpha = 0.45 + z * 0.55;
      if (blocked && x >= gx - 6) {
        stopped++;
        var fade = Math.max(0, 1 - (local - born - travel * (gx - W * 0.06) / (W * 0.9)) / 1400);
        ctx.globalAlpha *= 0.25 + fade * 0.75;
        ctx.fillStyle = col.accent; dot(ctx, gx - 8 - z * 10, y, size + 0.6);
        continue;
      }
      if (p > 1) { if (bad) leaked++; continue; }
      ctx.fillStyle = bad ? col.accent : (z > 0.5 ? col.hi : col.mid);
      dot(ctx, x, y, size);
      if (bad && x > gx) leaked++;
    }
    ctx.globalAlpha = 1;
    text(ctx, full ? 'Every guardrail on' : 'No guardrails', W * 0.06, H * 0.1, 15, col.ink, 400);
    text(ctx, 'Forbidden actions blocked', W * 0.06, H * 0.1 + 20, 12, col.muted);
    text(ctx, full ? '1.00' : '0.42', W * 0.06, H * 0.1 + 52, 30, full ? col.ink : col.accent, 300);
    text(ctx, 'Action gate', gx, top - 12, 12, col.ink2, 400, 'center');
    text(ctx, 'Agent actions', W * 0.06, bot + 22, 12, col.muted);
    text(ctx, 'Executed', W * 0.96, bot + 22, 12, col.muted, 300, 'right');
    text(ctx, 'Allowed actions blocked: 0.00', W * 0.96, H * 0.1 + 52, 12, col.ink2, 300, 'right');
  }

  /* ---------- Business Plan AI: the numbers re-derived ---------- */
  function ledger(ctx, W, H, t) {
    var base = H * 0.78, s = Math.max(4, Math.min(W, H) / 60), cols = 6;
    function stack(x, n, from, colourAt, delay) {
      // n points, cols wide, dropping in from above in order
      for (var i = 0; i < n; i++) {
        var k = from + i, cx = x + (k % cols) * s, cy = base - Math.floor(k / cols) * s;
        var land = delay + i * 14, p = ease((t - land) / 420);
        if (p <= 0) continue;
        ctx.globalAlpha = p;
        ctx.fillStyle = colourAt(i);
        dot(ctx, cx, cy - (1 - p) * 40, s * 0.55);
      }
      ctx.globalAlpha = 1;
    }
    var gw = cols * s;
    // capital, one point = 250 euro: own 30, loan 78
    var x0 = W * 0.08;
    stack(x0, 30, 0, function () { return col.hi; }, 0);
    stack(x0, 78, 30, function () { return col.lo; }, 350);
    // nights, one point = 5 nights: capacity 146, claimed 45, re-derived 72 (45 + 27 for the rent)
    var x1 = W * 0.4, x2 = x1 + gw + s * 3, x3 = x2 + gw + s * 3;
    stack(x1, 146, 0, function () { return col.lo; }, 700);
    stack(x2, 45, 0, function () { return col.mid; }, 2200);
    stack(x3, 45, 0, function () { return col.mid; }, 3100);
    stack(x3, 27, 45, function () { return col.accent; }, 4000);
    var shown = function (at) { return Math.max(0, Math.min(1, (t - at) / 500)); };
    var lbl = base + 22;
    text(ctx, 'Start-up capital', x0, lbl, 12, col.ink2, 400);
    text(ctx, '26,910 €', x0, lbl + 18, 12, col.muted);
    text(ctx, 'Available', x1, lbl, 12, col.ink2, 400);
    text(ctx, '730', x1, lbl + 18, 12, col.muted);
    text(ctx, 'Claimed', x2, lbl, 12, col.ink2, 400);
    text(ctx, '225', x2, lbl + 18, 12, col.muted);
    text(ctx, 'Re-derived', x3, lbl, 12, col.ink2, 400);
    text(ctx, '361', x3, lbl + 18, 12, col.muted);
    text(ctx, 'Break-even, nights a year', x1, H * 0.1, 15, col.ink, 400);
    text(ctx, 'Verified in Python, no model in the loop', x1, H * 0.1 + 20, 12, col.muted);
    ctx.globalAlpha = shown(1600);
    text(ctx, 'Own capital 27.9 %', x0, base - 24 * s, 13, col.ink, 400);
    text(ctx, 'inside the 25 to 30 % band', x0, base - 24 * s + 18, 12, col.muted);
    ctx.globalAlpha = shown(4500);
    text(ctx, '+136 nights', x3 + gw + s * 2, base - 10 * s, 15, col.accent, 400);
    text(ctx, 'rent of 620 € a month', x3 + gw + s * 2, base - 10 * s + 18, 12, col.ink2);
    text(ctx, 'was left out', x3 + gw + s * 2, base - 10 * s + 34, 12, col.ink2);
    ctx.globalAlpha = 1;
  }

  /* ---------- WhatsApp Toolkit: a campaign moving through its stages ---------- */
  var people = [
    ['Mario Rossi', 'sent', 0], ['Giulia Bianchi', 'sent', 900], ['Giovanni Verdi', 'check', 1800],
    ['Anna Neri', 'missing', 2700], ['Paolo Gialli', 'sent', 3600], ['Francesca Azzurri', 'typing', 4700],
    ['Roberto Viola', 'queue', 0], ['Elena Marrone', 'queue', 0]
  ];
  function campaign(ctx, W, H, t) {
    var left = W * 0.27, right = W * 0.94, top = H * 0.2, row = (H * 0.62) / people.length;
    var stops = { queue: 0, check: 0.3, missing: 0.52, typing: 0.72, sent: 1 };
    var heads = [['Queue', 0], ['Name check', 0.3], ['Typing', 0.72], ['Sent', 1]];
    heads.forEach(function (h) { text(ctx, h[0], left + h[1] * (right - left), top - 16, 12, col.muted, 300, h[1] === 1 ? 'right' : h[1] ? 'center' : 'left'); });
    people.forEach(function (p, i) {
      var y = top + i * row + row / 2, end = stops[p[1]];
      var prog = p[1] === 'queue' ? 0 : end * ease((t - p[2]) / 1500);
      var x = left + prog * (right - left);
      // the lane, as points
      ctx.fillStyle = col.rule;
      for (var lx = left; lx <= right; lx += 8) dot(ctx, lx, y, 1.2);
      // the trail
      ctx.fillStyle = col.mid;
      for (var k = 1; k < 9; k++) { var tx = x - k * 6; if (tx < left) break; ctx.globalAlpha = 0.6 - k * 0.06; dot(ctx, tx, y, 2.4); }
      ctx.globalAlpha = 1;
      var arrived = p[1] !== 'queue' && t > p[2] + 1500;
      var hot = p[1] === 'check' && arrived;
      ctx.fillStyle = hot ? col.accent : p[1] === 'missing' && arrived ? col.muted : col.hi;
      dot(ctx, x, y, hot ? 8 : 6);
      text(ctx, p[0], left - 16, y + 4, 13, p[1] === 'queue' ? col.muted : col.ink2, 300, 'right');
      if (arrived && p[1] === 'check') text(ctx, 'WhatsApp says “Gianni V.”: under 0.6, waits for you', x + 12, y + 4, 12, col.accent, 400);
      if (arrived && p[1] === 'missing') text(ctx, 'Not found', x + 12, y + 4, 12, col.muted);
      if (arrived && p[1] === 'typing') text(ctx, 'typing…', x + 12, y + 4, 12, col.ink2);
    });
    text(ctx, 'Pauses of 6 to 33 s, a break every 25 messages, 50 a day at most', left, H * 0.9, 12, col.muted);
  }

  /* ---------- Sherpa Alzheimer: retrieval through the 0.55 gate ---------- */
  var roles = ['Patient', 'Caregiver', 'Doctor'];
  function sherpa(ctx, W, H, t) {
    var r = rng(11), mid = H * 0.5;
    var qx = W * 0.08, dbx = W * 0.36, gx = W * 0.6, sx = W * 0.82;
    // the knowledge base: a cloud of source points
    var pick = [];
    for (var i = 0; i < 260; i++) {
      var a = r() * Math.PI * 2, d = Math.sqrt(r()), z = r();
      var x = dbx + Math.cos(a) * d * W * 0.12, y = mid + Math.sin(a) * d * H * 0.24;
      var chosen = i % 22 === 0, pass = chosen && r() < 0.5;
      if (chosen) pick.push([x, y, pass, z]);
      ctx.globalAlpha = 0.35 + z * 0.5;
      ctx.fillStyle = z > 0.6 ? col.mid : col.lo;
      dot(ctx, x, y, 1.6 + z * 1.6);
    }
    ctx.globalAlpha = 1;
    // the gate
    ctx.fillStyle = col.rule;
    for (var gy = mid - H * 0.26; gy <= mid + H * 0.26; gy += 6) for (var k = 0; k < 3; k++) dot(ctx, gx + k * 4, gy + k * 2, 1.4);
    // the question travels in, the persona cycles
    var role = roles[Math.min(2, Math.floor(t / 3000))];
    var q = ease(t / 1200);
    ctx.fillStyle = col.hi;
    for (var tr = 0; tr < 8; tr++) { ctx.globalAlpha = q < 1 ? 0.7 - tr * 0.08 : 0; dot(ctx, qx + q * (dbx - qx - W * 0.12) - tr * 6, mid, 2.4); }
    ctx.globalAlpha = 1;
    dot(ctx, qx + q * (dbx - qx - W * 0.12), mid, 7);
    // retrieved sources leave the cloud for the gate; the ones under 0.55 stop and fade
    pick.forEach(function (p, n) {
      var start = 1300 + n * 140, go = ease((t - start) / 1400);
      if (go <= 0) return;
      var x = p[0] + go * (gx - 10 - p[0]), y = p[1] + go * (mid + (p[1] - mid) * 0.5 - p[1]);
      if (go >= 1) {
        if (!p[2]) { ctx.globalAlpha = Math.max(0.15, 1 - (t - start - 1400) / 900); ctx.fillStyle = col.muted; dot(ctx, x, y, 4); ctx.globalAlpha = 1; return; }
        var on = ease((t - start - 1500) / 1400);
        x = gx + 14 + on * (sx - gx - 14); y = y + on * (mid - y);
      }
      ctx.fillStyle = p[2] ? col.accent : col.hi;
      dot(ctx, x, y, 5);
    });
    // the supervisor, then the answer
    var done = Math.max(0, Math.min(1, (t - 6200) / 600));
    ctx.fillStyle = col.ink; dot(ctx, sx, mid, 9);
    ctx.globalAlpha = done; ctx.fillStyle = col.accent;
    for (var ax = sx + 14; ax < W * 0.96; ax += 7) dot(ctx, ax, mid, 2.4);
    ctx.globalAlpha = 1;
    text(ctx, role, qx, mid - 18, 13, col.ink, 400);
    text(ctx, 'asks', qx, mid + 26, 12, col.muted);
    text(ctx, 'Knowledge base', dbx, mid - H * 0.28, 12, col.ink2, 400, 'center');
    text(ctx, 'Score 0.55 or more', gx, mid - H * 0.28, 12, col.ink2, 400, 'center');
    text(ctx, 'Supervisor', sx, mid - 20, 12, col.ink2, 400, 'center');
    ctx.globalAlpha = done;
    text(ctx, 'Answer, citing only', sx, mid + 30, 12, col.accent, 400, 'center');
    text(ctx, 'what cleared the gate', sx, mid + 46, 12, col.accent, 400, 'center');
    ctx.globalAlpha = 1;
    text(ctx, 'Tone adapts to the role: patient, caregiver or doctor', W * 0.08, H * 0.9, 12, col.muted);
  }

  /* ---------- LisAI: a hand on the 21 MediaPipe landmarks spelling C, I, A, O ---------- */
  // the hand is drawn, not tracked: LIS letter shapes posed on MediaPipe's hand layout
  var FINGERS = [ // base (x, y), segment lengths
    [[-0.3, 0.88], [0.4, 0.26, 0.2]], [[-0.1, 0.92], [0.45, 0.29, 0.21]],
    [[0.12, 0.88], [0.42, 0.27, 0.2]], [[0.32, 0.8], [0.33, 0.21, 0.18]]
  ];
  var LETTERS = [ // finger curls (index, middle, ring, pinky), thumb [curl, spread], yaw
    ['C', [0.42, 0.42, 0.42, 0.42], [0.25, 0.9], 1.15],
    ['I', [1, 1, 1, 0], [0.85, 0.2], 0.25],
    ['A', [1, 1, 1, 1], [0, 0.05], 0.35],
    ['O', [0.68, 0.7, 0.72, 0.75], [0.55, 0.85], 1.1]
  ];
  function rot(v, a, axis) { // rotate [x,y,z] about x or y
    var c = Math.cos(a), s = Math.sin(a);
    return axis === 'x' ? [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c] : [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
  }
  function pose(curls, thumb) {
    var p = [[0, 0, 0]];
    // thumb: CMC, MCP, IP, tip; curl folds it across the palm, spread opens it out
    var dir = [-0.15 - thumb[1] * 0.65 + thumb[0] * 0.9, 0.7, thumb[0] * 0.5], base = [-0.2, 0.22, 0.06];
    var lens = [0.3, 0.25, 0.2], cur = base.slice();
    p.push(cur.slice());
    for (var k = 0; k < 3; k++) {
      var a = (thumb[0] * 0.5 - thumb[1] * 0.25) * (k + 1) * 0.5;
      var d = rot(dir, a, 'y'), n = Math.hypot(d[0], d[1], d[2]);
      cur = [cur[0] + d[0] / n * lens[k], cur[1] + d[1] / n * lens[k], cur[2] + d[2] / n * lens[k]];
      p.push(cur.slice());
    }
    FINGERS.forEach(function (f, i) {
      var c = curls[i], at = [f[0][0], f[0][1], 0], ang = 0, bends = [1.3, 1.4, 0.8];
      p.push(at.slice());
      for (var k = 0; k < 3; k++) {
        ang += c * bends[k];
        var d = [0, Math.cos(ang), Math.sin(ang)];
        at = [at[0], at[1] + d[1] * f[1][k], at[2] + d[2] * f[1][k]];
        p.push(at.slice());
      }
    });
    return p; // 21 landmarks in MediaPipe order
  }
  var BONES = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
  function lis(ctx, W, H, t) {
    t = Math.max(0, t);
    var step = SCENE_MS / LETTERS.length, li = Math.min(LETTERS.length - 1, Math.floor(t / step));
    var into = (t - li * step) / step, prev = LETTERS[Math.max(0, li - 1)], cur = LETTERS[li];
    var m = li === 0 ? 1 : ease(into / 0.3), mix = function (a, b) { return a + (b - a) * m; };
    var curls = cur[1].map(function (c, i) { return mix(prev[1][i], c); });
    var thumb = [mix(prev[2][0], cur[2][0]), mix(prev[2][1], cur[2][1])];
    var yaw = mix(prev[3], cur[3]) + Math.sin(t / 1400) * 0.12, read = into > 0.45;
    var pts = pose(curls, thumb).map(function (v) { return rot(rot([v[0], v[1] - 0.75, v[2]], -0.25, 'x'), yaw, 'y'); });
    var scale = Math.min(W * 0.6, H * 0.37), cx = W * 0.5, cy = H * 0.46;
    var proj = pts.map(function (v) { var k = 4 / (4 + v[2]); return [cx + v[0] * scale * k, cy - v[1] * scale * k, v[2]]; });
    // the palm as a field of points (wrist, index base, pinky base), then the bones as runs of points
    var pr = rng(5);
    ctx.fillStyle = col.lo;
    for (var k = 0; k < 140; k++) {
      var u = pr(), v = pr(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
      var A = proj[0], B = u < 0.5 ? proj[5] : proj[9], C = v < 0.5 ? proj[17] : proj[13];
      ctx.globalAlpha = 0.55; dot(ctx, A[0] + (B[0] - A[0]) * u + (C[0] - A[0]) * v, A[1] + (B[1] - A[1]) * u + (C[1] - A[1]) * v, 2);
    }
    ctx.fillStyle = col.mid;
    BONES.forEach(function (b) {
      var a = proj[b[0]], c = proj[b[1]], n = Math.max(3, Math.round(Math.hypot(c[0] - a[0], c[1] - a[1]) / 4));
      for (var k = 1; k < n; k++) { var f = k / n, z = a[2] + (c[2] - a[2]) * f; ctx.globalAlpha = 0.55 + 0.35 * (1 - z); dot(ctx, a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f, 2.6 - z); }
    });
    ctx.globalAlpha = 1;
    proj.forEach(function (q, i) { ctx.fillStyle = read ? col.accent : col.hi; dot(ctx, q[0], q[1], (i === 0 ? 9 : 7) - q[2] * 2); });
    // the subtitle: letters read so far
    var spelled = LETTERS.slice(0, li + (read ? 1 : 0)).map(function (l) { return l[0]; }).join(' ');
    text(ctx, spelled || ' ', W * 0.5, H * 0.86, 30, col.ink, 300, 'center');
    if (read) text(ctx, cur[0], cx + scale * 1.3, H * 0.3, 52, col.accent, 300, 'center');
    if (li === LETTERS.length - 1 && into > 0.75) text(ctx, '“ciao”', W * 0.5, H * 0.94, 15, col.ink2, 400, 'center');
    text(ctx, '21 hand landmarks of 543 per frame', W * 0.06, H * 0.08, 12, col.muted);
  }

  var defs = { 'scene-hookus': gate, 'scene-bp': ledger, 'scene-wa': campaign, 'scene-sherpa': sherpa, 'scene-lis': lis };
  var live = [];
  Object.keys(defs).forEach(function (id) {
    var sc = document.getElementById(id);
    var cv = sc && sc.querySelector('canvas');
    if (!cv) return;
    live.push({ scene: sc, canvas: cv, ctx: cv.getContext('2d'), draw: defs[id], t: 0 });
  });
  if (!live.length) return;

  function paint(item) {
    var r = item.canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!r.width) return;
    if (item.canvas.width !== Math.round(r.width * dpr)) { item.canvas.width = Math.round(r.width * dpr); item.canvas.height = Math.round(r.height * dpr); }
    item.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    item.ctx.clearRect(0, 0, r.width, r.height);
    item.draw(item.ctx, r.width, r.height, Math.min(SCENE_MS - 1, item.t));
  }

  var raf = 0, last = 0;
  function frame(now) {
    // a rAF timestamp can sit a hair before performance.now(): never step time backwards
    var dt = Math.max(0, now - last); last = now;
    live.forEach(function (it) {
      if (!it.scene.classList.contains('is-active')) return;
      it.t = solo ? (it.t + dt) % (SCENE_MS + 1800) : Math.min(SCENE_MS, it.t + dt);
      paint(it);
    });
    raf = requestAnimationFrame(frame);
  }
  function sync() {
    // a scene restarts each time it becomes active
    live.forEach(function (it) {
      var on = it.scene.classList.contains('is-active');
      if (on && !it.on) it.t = reduce.matches || reel.classList.contains('is-held') ? SCENE_MS : 0;
      it.on = on;
      if (on) paint(it);
    });
    var run = reel.classList.contains('is-running');
    if (run && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  readColours();
  var mo = new MutationObserver(sync);
  mo.observe(reel, { attributes: true, attributeFilter: ['class'] });
  reel.addEventListener('click', function (e) { if (e.target.closest('[data-loop-toggle]')) live.forEach(function (it) { if (it.on && reel.classList.contains('is-held')) { it.t = SCENE_MS; paint(it); } }); });
  live.forEach(function (it) { mo.observe(it.scene, { attributes: true, attributeFilter: ['class'] }); });
  new MutationObserver(function () { readColours(); live.forEach(paint); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('resize', function () { live.forEach(function (it) { if (it.on) paint(it); }); });
  if (document.fonts) document.fonts.ready.then(function () { live.forEach(function (it) { if (it.on) paint(it); }); });
  sync();
})();
