/* hero reel: one scene at a time, nine seconds each.
   The rotation stops on hover over the stage and on focus anywhere in the reel; everything stops
   off screen, under reduced motion and from the visible Pause button. A scene picked from its tab
   plays at once: focus holds the rotation, never the scene. */
(function () {
  var reel = document.querySelector('.reel');
  if (!reel) return;
  var tabs = [].slice.call(reel.querySelectorAll('[role="tab"]'));
  var scenes = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
  var btn = reel.querySelector('[data-loop-toggle]');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var SCENE_MS = 9000;
  var s = { seen: false, hover: false, focus: false, stageFocus: false, held: reduce.matches };
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
    var animate = s.seen && !s.held, rotate = animate && !s.hover && !s.focus;
    reel.classList.toggle('is-running', animate);
    reel.classList.toggle('is-held', s.held);
    // the ambient loop (the smear) holds still while the pointer or focus is on the stage itself
    reel.classList.toggle('is-still', s.hover || s.stageFocus);
    if (rotate && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    if (!rotate && raf) { cancelAnimationFrame(raf); raf = 0; }
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
  reel.addEventListener('focusin', function (e) { s.focus = true; s.stageFocus = stage.contains(e.target); sync(); });
  reel.addEventListener('focusout', function () { s.focus = false; s.stageFocus = false; sync(); });
  reduce.addEventListener('change', function (e) { s.held = e.matches; sync(); });
  new IntersectionObserver(function (e) { s.seen = e[0].isIntersecting; sync(); }).observe(reel);
  show(0);
})();
