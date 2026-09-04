/* viciodc portfolio · shared JS
   1) missing-media placeholders: any <img data-ph> or <video data-ph> that
      fails to load is replaced by a dashed box showing the expected path.
      Drop the real file at that path and the page fixes itself.
   2) before/after slider (malaria)
*/

/* ---------- 1. missing-media placeholders ---------- */
(function () {
  function toPlaceholder(node) {
    var src = node.getAttribute('src') ||
      (node.querySelector('source') && node.querySelector('source').getAttribute('src')) || '?';
    var box = document.createElement('div');
    box.className = 'ph' + (node.dataset.ph === 'tall' ? ' tall' : '');
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', 'Missing media: ' + src);
    box.innerHTML =
      '<span class="ph-icon" aria-hidden="true">▢</span>' +
      '<code>' + src + '</code>' +
      '<span class="ph-note">drop the file at this path, keep this name</span>';
    node.replaceWith(box);
  }
  document.querySelectorAll('img[data-ph]').forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) { toPlaceholder(img); return; }
    img.addEventListener('error', function () { toPlaceholder(img); });
  });
  document.querySelectorAll('video[data-ph]').forEach(function (v) {
    v.addEventListener('error', function () { toPlaceholder(v); }, true);
    var s = v.querySelector('source');
    if (s) s.addEventListener('error', function () { toPlaceholder(v); });
  });
})();

/* ---------- 2. before/after slider ---------- */
(function () {
  document.querySelectorAll('.ba').forEach(function (ba) {
    var top = ba.querySelector('.top');
    var handle = ba.querySelector('.handle');
    var range = ba.querySelector('input[type=range]');
    if (!top || !range) return;
    function update(v) {
      top.style.clipPath = 'inset(0 ' + (100 - v) + '% 0 0)';
      if (handle) handle.style.left = v + '%';
    }
    range.addEventListener('input', function () { update(range.value); });
    update(range.value);
  });
})();
