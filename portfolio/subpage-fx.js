/* ═══════════════════════════════════════════════════════════════════════
   PORTFOLIO SUBPAGES — /design, /code, /videos
   ═══════════════════════════════════════════════════════════════════════
   Shared by all three pages; each one has the same .wk-head + .wk-card
   structure, so one file covers them.

   044 "Mask effect" — a duplicate of the block sits on top under a radial
   mask, and the cursor punches a spotlight through to a recoloured version
   underneath. Core GSAP only: two quickTo calls driving two CSS variables.
   Used here on the page header, where the duplicate is set in the pop
   palette so the reveal reads as print misregistration rather than a
   generic spotlight — which is the language the rest of the site is in.

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

  /* ─── 1. HEADER SPOTLIGHT (MWG 044) ──────────────────────────────────
     Desktop fine-pointer only — there is no cursor to follow on touch, and
     the duplicate would just be dead weight in the DOM. */
  (function () {
    var head = document.querySelector('.wk-head');
    if (!head || !matchMedia('(pointer:fine)').matches) return;

    var dup = head.cloneNode(true);
    dup.classList.add('wk-head--dup');
    dup.setAttribute('aria-hidden', 'true');

    /* The clone contains a real "← Portfolio" link. aria-hidden hides it
       from screen readers but does NOT remove it from the tab order, which
       would leave a keyboard user landing on an invisible duplicate link.
       inert handles that where supported; the tabindex pass is the floor. */
    dup.setAttribute('inert', '');
    dup.querySelectorAll('a, button, input, [tabindex]').forEach(function (el) {
      el.setAttribute('tabindex', '-1');
      el.removeAttribute('href');
    });

    /* Both copies go into a wrapper of their own rather than being pinned to
       .wk-wrap. An absolutely positioned element resolves left/right against
       its container's PADDING box, so anchoring to .wk-wrap put the duplicate
       36px left of the original — outside the page's horizontal padding. A
       bare wrapper in normal flow has the same content box the header already
       had, so top/left/right:0 lands exactly on top. */
    var stack = document.createElement('div');
    stack.className = 'wk-head-stack';
    head.parentNode.insertBefore(stack, head);
    stack.appendChild(head);
    stack.appendChild(dup);
    head.classList.add('wk-head--masked');

    /* These carry UNITLESS numbers; the CSS multiplies by 1%. quickTo tweens
       a numeric property — hand it "50%" and it parses to NaN, the gradient
       becomes invalid, mask-image computes to none, and the duplicate paints
       in full over the real header. The unit has to live in the stylesheet. */
    var xTo = gsap.quickTo(dup, '--wk-mx', { duration: 0.42, ease: 'power3' });
    var yTo = gsap.quickTo(dup, '--wk-my', { duration: 0.42, ease: 'power3' });

    /* Parked off the top of the block, so nothing shows until a pointer
       actually arrives. */
    gsap.set(dup, { '--wk-mx': 50, '--wk-my': -40 });

    var wrap = head.parentNode;
    wrap.addEventListener('pointermove', function (e) {
      var b = dup.getBoundingClientRect();
      xTo(gsap.utils.mapRange(b.left, b.left + b.width, 0, 100, e.clientX));
      yTo(gsap.utils.mapRange(b.top,  b.top  + b.height, 0, 100, e.clientY));
    });
    wrap.addEventListener('pointerleave', function () {
      yTo(-40);
    });
  })();

  /* ─── 2. CARD DRIFT (MWG 001, un-pinned) ─────────────────────────────── */
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
