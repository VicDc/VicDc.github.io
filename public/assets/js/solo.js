/* one looping point scene on a case page: holds still until seen, pauses off screen, on hover,
   on focus, under reduced motion and from its visible Pause button (scenes.js and cloud.js read
   the classes this sets). */
(function () {
  var fig = document.querySelector('.solo');
  if (!fig) return;
  var btn = fig.querySelector('[data-loop-toggle]');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var s = { seen: false, hover: false, focus: false, held: reduce.matches };
  function sync() {
    fig.classList.toggle('is-running', s.seen && !s.hover && !s.focus && !s.held);
    fig.classList.toggle('is-held', s.held);
    if (btn) btn.textContent = s.held ? 'Play' : 'Pause';
  }
  if (btn) btn.addEventListener('click', function () { s.held = !s.held; sync(); });
  [['pointerenter', 'hover', true], ['pointerleave', 'hover', false]].forEach(function (a) {
    fig.addEventListener(a[0], function () { s[a[1]] = a[2]; sync(); });
  });
  // focus on the Pause button is choosing, so it does not hold the scene
  fig.addEventListener('focusin', function (e) { s.focus = e.target !== btn; sync(); });
  fig.addEventListener('focusout', function () { s.focus = false; sync(); });
  reduce.addEventListener('change', function (e) { s.held = e.matches; sync(); });
  new IntersectionObserver(function (e) { s.seen = e[0].isIntersecting; sync(); }).observe(fig);
  sync();
})();
