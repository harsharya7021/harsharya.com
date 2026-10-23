/* ═══════════════════════════════════════════════════════════════════════
   ESSAY PAGES — opening paragraph + reading progress
   ═══════════════════════════════════════════════════════════════════════
   097 "Tightening word lines" — each line is parked fully justified across
   the column, then scrubbed back to its natural width as it crosses the
   viewport, so the sentence reforms into focus.

   Applied to the OPENING PARAGRAPH ONLY, not the body. The original runs on
   a whole article, and these essays are ~2,100 words: splitting all of that
   means thousands of extra nodes, a re-split on every resize, and — the real
   objection — long-form copy that sits visibly spread apart until a scrub
   completes. Text that withholds itself is an accessibility problem before
   it is a style. One paragraph gives the effect somewhere to land without
   putting the reading at risk, and everything below it is ordinary prose.

   autoSplit + onSplit is used deliberately: SplitText measures line boxes,
   so a resize or a late font swap invalidates the parked positions. The
   returned timeline is what GSAP tears down and rebuilds on each re-split.

   The progress rail is NOT from the collection — it is a few lines of
   ScrollTrigger and it would be odd to credit it otherwise.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  var body = document.querySelector('.post-body');
  if (!body) return;

  var reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ─── 1. Reading progress rail ───────────────────────────────────────
     Useful rather than decorative, so it runs under reduced motion too —
     it reports position, it doesn't perform. */
  (function () {
    var rail = document.createElement('div');
    rail.className = 'post-rail';
    rail.setAttribute('aria-hidden', 'true');
    rail.innerHTML = '<span></span>';
    document.body.appendChild(rail);

    var fill = rail.firstChild;
    gsap.set(fill, { scaleX: 0, transformOrigin: '0 50%' });

    ScrollTrigger.create({
      trigger: body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: function (self) { gsap.set(fill, { scaleX: self.progress }); }
    });
  })();

  /* ─── 2. Lede tightening (MWG 097) ───────────────────────────────────── */
  if (reduced || !window.SplitText) return;

  /* The first <p> is not always the lede — some posts open with a standfirst
     or a byline. Take the first direct-child paragraph with enough words to
     actually break across lines. */
  var lede = null;
  Array.prototype.slice.call(body.children).some(function (el) {
    if (el.tagName !== 'P') return false;
    if ((el.textContent || '').trim().split(/\s+/).length < 25) return false;
    lede = el;
    return true;
  });
  if (!lede) return;

  lede.classList.add('post-lede');

  SplitText.create(lede, {
    type: 'lines,words',
    linesClass: 'pl-line',
    wordsClass: 'pl-word',
    autoSplit: true,
    onSplit: function (self) {
      var tl = gsap.timeline();
      var colWidth = lede.clientWidth;
      var colLeft  = lede.getBoundingClientRect().left;

      self.lines.forEach(function (line) {
        var words = Array.prototype.slice.call(line.querySelectorAll('.pl-word'));
        if (words.length < 2) return;

        var totalWords = words.reduce(function (acc, w) {
          return acc + w.getBoundingClientRect().width;
        }, 0);
        var gaps = words.length - 1;
        var gapSize = Math.max(colWidth - totalWords, 0) / gaps;

        /* Park each word so the line reads fully justified edge to edge. */
        var target = 0;
        words.forEach(function (w, i) {
          var r = w.getBoundingClientRect();
          gsap.set(w, { x: target - (r.left - colLeft) });
          target += r.width + (i < gaps ? gapSize : 0);
        });

        tl.to(words, {
          x: 0,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: line,
            start: 'top bottom',
            end: 'top 62%',
            scrub: 0.25
          }
        }, 0);
      });

      return tl;   /* handed back so GSAP reverts it cleanly on re-split */
    }
  });
})();
