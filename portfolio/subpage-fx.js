/* ═══════════════════════════════════════════════════════════════════════
   PORTFOLIO SUBPAGES — /design, /code, /videos
   ═══════════════════════════════════════════════════════════════════════
   Shared by all three pages; each one has the same .wk-head + .wk-card
   structure, so one file covers them. (/code now shows its films through
   the MWG 121 showcase instead of cards, so there the drift finds nothing
   to move — by design.)

   044 "Mask effect" — the cursor spotlight that recoloured the header —
   used to live here too. It was taken out: on the page it read as a stain
   following the cursor, not as print misregistration.

   001 "Card stack" — the original pins a stage and parades cards across it
   horizontally via containerAnimation. Not adopted in that form: these
   pages exist to be clicked, and pinning a stage would hijack the scroll
   and fight the data-embed lightbox. What is kept is the useful half — the
   per-card randomised rotation/offset scrubbed against scroll — at roughly
   a fifth of the original amplitude, since these cards sit in normal flow
   rather than flying across a pinned viewport.

   047 is deliberately absent. Its infinite loop and squash timing are both
   driven by Lenis (`new Lenis({orientation:'horizontal', infinite:true})`
   plus `lenis.on('scroll', ScrollTrigger.update)`). Lenis was removed from
   this site on purpose — it stuttered against the live WebGL — and /code
   has three cards, which is not an infinite carousel.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (!window.gsap) return;
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;

  /* ─── CARD DRIFT (MWG 001, un-pinned) ─────────────────────────────── */
  (function () {
    if (!window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    var cards = gsap.utils.toArray('.wk-card');
    if (!cards.length) return;

    cards.forEach(function (card) {
      /* 001's ranges are 30–50% x and 10–20° rotation, sized for cards
         crossing a pinned viewport. In a static grid those values would
         collide with neighbours and shear the poster art, so everything is
         scaled down to a drift you feel rather than watch. */
      function sign() { return Math.random() < 0.5 ? 1 : -1; }
      var v = {
        x: (Math.random() * 4 + 4) * sign(),
        y: (Math.random() * 3 + 3) * sign(),
        r: (Math.random() * 2 + 1.6) * sign()
      };

      gsap.fromTo(card,
        { xPercent: v.x,  yPercent: v.y,  rotation: v.r },
        {
          xPercent: -v.x, yPercent: -v.y, rotation: -v.r,
          ease: 'none',
          scrollTrigger: {
            trigger: card,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.5
          }
        }
      );
    });

    (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
      ScrollTrigger.refresh();
    });
  })();
})();
