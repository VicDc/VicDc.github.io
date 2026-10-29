/* project previews: short loops of each project's point scene. A preview plays only while its card
   is on screen; reduced motion keeps every poster still; one visible button pauses them all. */
(function () {
  var vids = [].slice.call(document.querySelectorAll('video[data-preview]'));
  if (!vids.length) return;
  var btn = document.querySelector('[data-preview-toggle]');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var held = false, seen = new Map();
  function sync(v) {
    var run = seen.get(v) && !held && !reduce.matches;
    if (run) { if (v.preload === 'none') v.preload = 'auto'; var p = v.play(); if (p) p.catch(function () {}); }
    else v.pause();
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { seen.set(e.target, e.isIntersecting); sync(e.target); });
  }, { rootMargin: '120px 0px' });
  vids.forEach(function (v) { io.observe(v); });
  if (btn) btn.addEventListener('click', function () {
    held = !held;
    btn.textContent = held ? 'Play previews' : 'Pause previews';
    btn.setAttribute('aria-pressed', held ? 'true' : 'false');
    vids.forEach(sync);
  });
  reduce.addEventListener('change', function () { vids.forEach(sync); });
})();
