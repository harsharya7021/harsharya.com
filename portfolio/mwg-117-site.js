/* MWG 117 on /portfolio/design — site glue, not part of the template.

   A click on a collage opens that series' case study in the site lightbox;
   a click anywhere else keeps the template's own behaviour (next word).
   Each series' group in .media-pool can carry data-case / data-case-label;
   the template only reads the <img> sources, so these stay inert for it.

   Runs in the capture phase on the template's root, which is before the
   template's own click listener on the same element, so stopping the event
   here means the word doesn't also change. */
(function () {
  'use strict';
  var root = document.querySelector('.mwg_effect117');
  if (!root) return;

  var groups = Array.prototype.slice.call(root.querySelectorAll('.media-pool > div'));

  root.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.classList || !t.classList.contains('media')) return;

    var group = null;
    groups.forEach(function (g) {
      Array.prototype.forEach.call(g.querySelectorAll('img'), function (img) {
        if (img.src === t.src) group = g;
      });
    });
    var src = group && group.getAttribute('data-case');
    if (!src || !window.wkLightbox) return;               /* no case study: next word, as the template does */

    e.stopPropagation();
    e.preventDefault();
    window.wkLightbox.open(src, 'page', group.getAttribute('data-case-label') || '');
  }, true);
})();
