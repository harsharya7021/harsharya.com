/* ═══════════════════════════════════════════════════════════════════════
   INERTIA GRID
   ───────────────────────────────────────────────────────────────────────
   Hovering a card in a photo grid knocks it along the direction the mouse
   was travelling, with force proportional to how fast you were moving, and
   it springs back to where it started with a small kick of rotation. Move
   slowly and nothing much happens; sweep across the grid and the whole
   thing scatters and settles behind you.

   After the madewithgsap InertiaPlugin demo (free effect 001). Uses
   InertiaPlugin when it's on the page and falls back to a two-stage
   throw-and-settle when it isn't, so the site never depends on it loading.

   Bound by delegation, because the gallery rebuilds its grid whenever the
   layout pill is cycled — there's nothing stable to attach listeners to.

   Off entirely for coarse pointers and prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  if (!window.gsap) return;

  var mm = window.matchMedia;
  if (mm && (mm('(prefers-reduced-motion:reduce)').matches ||
             mm('(hover:none)').matches || mm('(pointer:coarse)').matches)) return;

  /* The outer card moves, never the image inside it — the grids clip their
     media boxes, and the gallery already runs its own CSS hover nudge on
     .frame-media. Driving different elements lets the two compose instead
     of fighting over the transform. */
  var SEL = '.series[data-layout="grid"] .frame, .off-grid .off-cell, .gx-grid .gx-card';

  var inertia = !!window.InertiaPlugin;
  if (inertia) { try { gsap.registerPlugin(InertiaPlugin); } catch (e) { inertia = false; } }

  var oldX = 0, oldY = 0, dx = 0, dy = 0, z = 10;

  window.addEventListener('pointermove', function (e) {
    dx = e.clientX - oldX;
    dy = e.clientY - oldY;
    oldX = e.clientX;
    oldY = e.clientY;
  }, { passive: true });

  function clamp(v, n) { return v < -n ? -n : v > n ? n : v; }

  function fling(el) {
    var vx = clamp(dx, 55), vy = clamp(dy, 55);
    if (Math.abs(vx) < 1 && Math.abs(vy) < 1) return;   /* a still cursor gets nothing */

    el.style.zIndex = ++z;
    /* promoted only while it's actually moving — a Miami page carries 70+
       of these, and holding them all on their own layer costs more than
       the animation does */
    el.style.willChange = 'transform';

    var tl = gsap.timeline({
      onComplete: function () {
        el.style.zIndex = '';
        el.style.willChange = '';
        tl.kill();
      }
    });
    tl.timeScale(1.15);

    /* overwrite rather than kill: a re-hover mid-flight hands the card to a
       new tween that still ends at 0, instead of abandoning it wherever it
       happened to be */
    if (inertia) {
      tl.to(el, {
        overwrite: 'auto',
        inertia: {
          x: { velocity: vx * 26, end: 0 },
          y: { velocity: vy * 26, end: 0 }
        }
      });
    } else {
      /* throw, then settle — the same shape InertiaPlugin draws with end:0 */
      tl.to(el, { x: vx * 0.85, y: vy * 0.85, duration: 0.2, ease: 'power2.out', overwrite: 'auto' })
        .to(el, { x: 0, y: 0, duration: 0.85, ease: 'elastic.out(1, 0.5)' });
    }

    /* a knock of rotation that unwinds itself. ±10° — the demo's ±15 reads
       as a toy; these are photographs in frames. */
    tl.fromTo(el, { rotate: 0 }, {
      duration: 0.4,
      rotate: (Math.random() - 0.5) * 20,
      yoyo: true,
      repeat: 1,
      ease: 'power1.inOut'
    }, '<');
  }

  /* mouseenter, via delegation: ignore moves that stay inside the same card */
  document.addEventListener('mouseover', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var el = t.closest(SEL);
    if (!el) return;
    if (e.relatedTarget && el.contains(e.relatedTarget)) return;
    fling(el);
  }, { passive: true });
})();
