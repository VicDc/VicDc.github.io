/* hero reel: one scene at a time, nine seconds each.
   Holds still until seen, pauses off screen, on hover, on focus, under reduced motion
   and from the visible Pause button; the tabs pick a scene by hand. */
(function () {
  var reel = document.querySelector('.reel');
  if (!reel) return;
  var tabs = [].slice.call(reel.querySelectorAll('[role="tab"]'));
  var scenes = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
  var btn = reel.querySelector('[data-loop-toggle]');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var SCENE_MS = 9000;
  var s = { seen: false, hover: false, focus: false, held: reduce.matches };
  var index = 0, spent = 0, last = 0, raf = 0;

  function show(i, moveFocus) {
    index = (i + scenes.length) % scenes.length;
    spent = 0;
    scenes.forEach(function (sc, k) { sc.classList.toggle('is-active', k === index); });
    tabs.forEach(function (t, k) {
      t.setAttribute('aria-selected', k === index ? 'true' : 'false');
      t.tabIndex = k === index ? 0 : -1;
    });
    if (moveFocus) tabs[index].focus();
  }

  function tick(now) {
    spent += now - last; last = now;
    if (spent >= SCENE_MS) show(index + 1);
    raf = requestAnimationFrame(tick);
  }

  function sync() {
    var run = s.seen && !s.hover && !s.focus && !s.held;
    reel.classList.toggle('is-running', run);
    reel.classList.toggle('is-held', s.held);
    if (run && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
    if (btn) btn.textContent = s.held ? 'Play' : 'Pause';
  }

  tabs.forEach(function (t, k) {
    t.addEventListener('click', function () { show(k); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1, true); }
    });
  });
  if (btn) btn.addEventListener('click', function () { s.held = !s.held; sync(); });
  var stage = reel.querySelector('.reel-stage');
  [['pointerenter', 'hover', true], ['pointerleave', 'hover', false]].forEach(function (a) {
    stage.addEventListener(a[0], function () { s[a[1]] = a[2]; sync(); });
  });
  reel.addEventListener('focusin', function () { s.focus = true; sync(); });
  reel.addEventListener('focusout', function () { s.focus = false; sync(); });
  reduce.addEventListener('change', function (e) { s.held = e.matches; sync(); });
  new IntersectionObserver(function (e) { s.seen = e[0].isIntersecting; sync(); }).observe(reel);
  show(0);
})();
