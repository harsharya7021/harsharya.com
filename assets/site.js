/* ===========================================================
   site.js — shared micro-interactions for every page that
   renders the top .nav but ISN'T the home page (home has its
   own GSAP-driven copy inline in index.html).

   Right now this ships ONE thing: the magnetic cursor-pull on
   the nav links (and a primary .form-send button if present),
   matching the home page's feel — a soft lag toward the cursor
   and an eased spring back. Dependency-free (no GSAP needed),
   desktop fine-pointer only, and it bows out under
   prefers-reduced-motion.
   =========================================================== */
(function () {
  'use strict';
  if (window.__siteMagnetic) return;                 /* never double-bind */
  window.__siteMagnetic = true;

  var fine    = window.matchMedia('(pointer:fine)').matches;
  var reduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (!fine || reduced) return;

  var PULL_X = 0.4, PULL_Y = 0.5, EASE = 0.2;        /* same ratios as the home page */

  function bind(el) {
    var cx = 0, cy = 0, tx = 0, ty = 0, raf = 0;
    el.style.willChange = 'transform';

    function tick() {
      cx += (tx - cx) * EASE;
      cy += (ty - cy) * EASE;
      var done = Math.abs(tx - cx) < 0.15 && Math.abs(ty - cy) < 0.15;
      if (done) { cx = tx; cy = ty; }
      el.style.transform = 'translate(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px)';
      raf = done ? 0 : requestAnimationFrame(tick);
    }
    function start() { if (!raf) raf = requestAnimationFrame(tick); }

    el.addEventListener('pointermove', function (e) {
      var b = el.getBoundingClientRect();
      tx = (e.clientX - (b.left + b.width / 2)) * PULL_X;
      ty = (e.clientY - (b.top + b.height / 2)) * PULL_Y;
      start();
    });
    el.addEventListener('pointerleave', function () { tx = 0; ty = 0; start(); });
  }

  function init() {
    document.querySelectorAll('.nav-links a, .form-send').forEach(bind);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
