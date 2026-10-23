/* ═══════════════════════════════════════════════════════════════════════
   LAUNCH FILMS — scroll index  (/portfolio/code)
   ═══════════════════════════════════════════════════════════════════════
   MWG 121: a numbered index where each item's words sit still at the
   middle of the viewport while its picture scrolls past between them; the
   picture opens like a shutter as it arrives (clip-path inset 15% → 0),
   drifts inside its own frame (parallax), closes again as it leaves, and
   the title hands over to the next one at the rule between items. The
   layout — fixed words clipped to their article — is pure CSS (work.css);
   this file adds the motion and the films.

   Departures, each forced by the page rather than taste:

   1. THE PICTURE IS THE FILM. 121 scrolls still photographs. Here each
      frame plays a muted ~15-second loop cut from the film itself — the
      title and three of its strongest moments, crossfaded, with the loop's
      seam crossfaded too. The loops were rendered frame-exact from the
      films' own GSAP timelines (films/previews/: H.264 ~0.45 MB each, a
      VP9 WebM fallback, and a WebP still) and start
      on the same frame as the still, so the swap from still to video is
      invisible. A loop downloads only when its frame first comes near the
      viewport and plays only while the frame is on screen.

   2. LANDSCAPE FRAMES. 121's media is a tall 4:5 portrait; the films are
      16:9 and centred, so a portrait crop would cut their lines in half.
      The frame keeps the films' shape, and the parallax overscan is 10%
      rather than 121's flat 200px — enough to feel, never enough to clip
      what a scene says.

   3. NO LENIS. 121 ships with Lenis smooth scroll. It was removed from
      this site on purpose (it stuttered against the live WebGL), and the
      effect does not need it — every tween here is scrubbed by
      ScrollTrigger off the browser's own scroll.

   4. REDUCED MOTION OR SAVE-DATA keeps the stills: no loops, no shutter,
      no parallax, no title hand-off. The fixed-words layout stays — it is
      positioning, not animation, like a sticky header.

   5. KEYBOARD. The links live in fixed, clipped columns, so focus can land
      on a link whose article is off-screen (the browser does not scroll
      for fixed elements). Focusing one scrolls its article to the middle.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var root = document.querySelector('.lf');
  if (!root) return;

  var items = Array.prototype.slice.call(root.querySelectorAll('.lf-item'));
  if (!items.length) return;

  var reduced  = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var WIDE     = '(min-width: 901px)';   /* the fixed layout's breakpoint, as in work.css */

  /* ─── 1. preview loops ─────────────────────────────────────────────── */
  var videos = [];
  var lightboxOpen = false;

  if (!reduced && !saveData && 'IntersectionObserver' in window) {
    items.forEach(function (item) {
      var media = item.querySelector('.lf-media');
      var img   = media && media.querySelector('.lf-pic');
      var src   = media && media.getAttribute('data-preview');
      if (!img || !src) return;

      var v = document.createElement('video');
      v.className = 'lf-pic';
      v.muted = true;  v.setAttribute('muted', '');          /* attribute too: iOS reads it */
      v.loop = true;
      v.playsInline = true; v.setAttribute('playsinline', '');
      v.preload = 'none';
      v.poster = img.getAttribute('src');                    /* same frame the loop starts on */
      v.setAttribute('aria-hidden', 'true');
      v.setAttribute('disablepictureinpicture', '');
      v.setAttribute('disableremoteplayback', '');
      v._src = src;                                          /* base path; .mp4 / .webm added on approach */
      media.replaceChild(v, img);
      videos.push(v);
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target.querySelector('video');
        if (!v) return;
        v._visible = e.isIntersecting;
        if (e.isIntersecting && !v._loaded) {                /* first approach: start buffering */
          v._loaded = true;
          /* H.264 first — every Safari, Chrome, Edge and Firefox plays it; the
             VP9 WebM is for Chromium builds shipped without proprietary codecs. */
          [['.mp4', 'video/mp4; codecs="avc1.640028"'], ['.webm', 'video/webm; codecs="vp9"']].forEach(function (f) {
            var s = document.createElement('source');
            s.src = v._src + f[0]; s.type = f[1];
            v.appendChild(s);
          });
          v.preload = 'auto';
          v.load();
        }
        sync(v);
      });
    }, { rootMargin: '25% 0px 25% 0px', threshold: [0, 0.3] });

    function sync(v) {
      /* The 25% margin above starts the download early; playback waits
         until a real slice of the frame is on screen. */
      var r = v.parentNode.getBoundingClientRect();
      var onScreen = v._visible && r.bottom > innerHeight * 0.1 && r.top < innerHeight * 0.9;
      if (onScreen && !lightboxOpen) {
        if (v.paused) {
          var p = v.play();
          if (p && p.catch) p.catch(function () {});         /* autoplay refused: the poster stays */
        }
      } else if (!v.paused) {
        v.pause();
      }
    }
    videos.forEach(function (v) { io.observe(v.parentNode); });
    addEventListener('scroll', function () { videos.forEach(function (v) { if (v._visible) sync(v); }); }, { passive: true });

    /* Pause the loops while the lightbox plays a film over them. work.js
       creates .wk-lb on first use, so watch for it, then watch its class.
       It is created and opened in the same task — by the time this hears
       about it the box is already open — so read the state once on attach. */
    var watching = false;
    function lightboxChanged(lb) {
      lightboxOpen = lb.classList.contains('is-open');
      videos.forEach(sync);
    }
    function watchLightbox() {
      var lb = document.querySelector('.wk-lb');
      if (!lb || watching) return;
      watching = true;
      new MutationObserver(function () { lightboxChanged(lb); })
        .observe(lb, { attributes: true, attributeFilter: ['class'] });
      lightboxChanged(lb);
    }
    new MutationObserver(watchLightbox).observe(document.body, { childList: true });
  }

  /* ─── 2. shutter, parallax, title hand-off (121) ───────────────────── */
  if (!reduced && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    items.forEach(function (item) {
      var media = item.querySelector('.lf-media');
      var pic   = media && media.querySelector('.lf-pic');
      if (!media) return;

      gsap.fromTo(media,
        { clipPath: 'inset(0% 15% 0% 15%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out',
          scrollTrigger: { trigger: media, start: 'top bottom', end: 'top 65%', scrub: true } });

      gsap.fromTo(media,
        { clipPath: 'inset(0% 0% 0% 0%)' },
        { clipPath: 'inset(0% 15% 0% 15%)', ease: 'power2.in', immediateRender: false,
          scrollTrigger: { trigger: media, start: 'bottom 35%', end: 'bottom top', scrub: true } });

      /* The picture is 110% of the frame's height; -1/11 of its own height
         is exactly the 10% overscan, so it travels the full spare band. */
      if (pic) {
        gsap.fromTo(pic, { yPercent: -100 / 11 }, { yPercent: 0, ease: 'none',
          scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true } });
      }
    });

    /* 121 fades only the left title through the hand-off and lets the right
       column be sliced by the rule. Here both columns go: with a paragraph
       on the right, a rule cutting through two half-read texts looked torn
       rather than wiped. */
    gsap.matchMedia().add(WIDE, function () {
      items.forEach(function (item, i) {
        var cols = item.querySelectorAll('.lf-title, .lf-desc');
        var next = items[i + 1] && items[i + 1].querySelectorAll('.lf-title, .lf-desc');
        if (!cols.length) return;
        var tl = gsap.timeline({ scrollTrigger: { trigger: item, start: 'bottom 60%', end: 'bottom 40%', scrub: true } });
        tl.to(cols, { yPercent: -15, autoAlpha: 0, ease: 'power2.inOut' }, 0);
        if (next && next.length) tl.fromTo(next, { yPercent: 15 }, { yPercent: 0, ease: 'power2.inOut' }, 0);
      });
    });

    (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
      ScrollTrigger.refresh();
    });
  }

  /* ─── 3. keyboard: bring a focused column's article to the middle ────── */
  root.addEventListener('focusin', function (e) {
    if (!matchMedia(WIDE).matches) return;
    if (!e.target.closest('.lf-content')) return;
    var item = e.target.closest('.lf-item');
    var r = item.getBoundingClientRect(), mid = innerHeight / 2;
    if (r.top > mid - 24 || r.bottom < mid + 24) {
      item.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    }
  });
})();
