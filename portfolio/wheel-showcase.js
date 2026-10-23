/* ═══════════════════════════════════════════════════════════════════════
   VIDEO SHOWCASE — 3D tilt wheel  (/portfolio/videos)
   ═══════════════════════════════════════════════════════════════════════
   MWG 106: ten thumbnails orbit a ring, the whole ring leans toward the
   pointer, it drifts on its own, and scrolling pushes the tiles apart while
   the perspective eases to sell the stretch.

   Four departures, each forced by the page rather than taste:

   1. NO WHEEL HIJACK. The original binds `wheel` on its root and suggests
      body{overflow:hidden} — it assumes it owns the viewport. This page has
      a header, ten cards and a footer that all need to scroll. The spread is
      driven off ScrollTrigger velocity instead: same visual response to a
      fast scroll, with the page's own scrolling left alone.

   2. BUILT FROM THE GRID. Tiles are cloned from the existing .wk-card
      markup, so the videos are declared once. The ring carries the same
      data-embed attributes, and work.js delegates from document, so tiles
      open the same lightbox with no extra wiring.

   3. THE DRIFT PAUSES ON HOVER. A ring that never stops rotating makes
      every tile a moving target. Clicking a drifting thumbnail is a small
      act of violence; the orbit stops when a pointer is over the stage.

   4. DESKTOP ONLY, and the grid always stays. The ring is an addition, not
      a replacement — it is aria-hidden with tiles taken out of the tab
      order, because the grid underneath already carries all ten links in an
      order a screen reader and a keyboard can follow. Below 820px there is
      no ring at all: a 3D stage with touch-tilt competes with the one
      gesture a phone needs for this page.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (!window.gsap || !window.ScrollTrigger) return;
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  if (!matchMedia('(min-width: 821px) and (pointer: fine)').matches) return;

  var grid = document.querySelector('.wk-grid');
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.wk-card'));
  if (cards.length < 4) return;          /* a ring of three is just a triangle */

  gsap.registerPlugin(ScrollTrigger);

  var ratiosPending = cards.length;

  /* ─── stage, cloned from the grid ────────────────────────────────────── */
  var stage = document.createElement('section');
  stage.className = 'vw-stage';
  stage.setAttribute('aria-hidden', 'true');

  var ring = document.createElement('div');
  ring.className = 'vw-ring';
  stage.appendChild(ring);

  var label = document.createElement('p');
  label.className = 'vw-hint';
  label.textContent = 'Ten films, on a wheel — drag your eye around it, or scroll to fling it open. Everything is also listed below.';
  stage.appendChild(label);

  var tiles = cards.map(function (card) {
    var src    = card.querySelector('.wk-card__poster img');
    var anchor = card.querySelector('[data-embed]');
    if (!src || !anchor) return null;

    var a = document.createElement('a');
    a.className = 'vw-tile';
    a.href = anchor.getAttribute('href') || '#';
    a.setAttribute('tabindex', '-1');    /* the grid below owns the tab order */
    ['data-embed', 'data-embed-mode', 'data-embed-label'].forEach(function (k) {
      if (anchor.hasAttribute(k)) a.setAttribute(k, anchor.getAttribute(k));
    });

    /* The grid uses hqdefault.jpg, which YouTube always renders 480x360 — a
       4:3 canvas with the 16:9 frame letterboxed inside it. Cropping back out
       of that is what made these read as tall, badly-framed stills.
       maxresdefault is the true frame, full-bleed: measured across all ten of
       these it comes back 1280x720 with content edge to edge. It is not
       guaranteed to exist for every video, so fall back to whatever the grid
       already had. */
    var original = src.getAttribute('src');
    var img = document.createElement('img');
    img.alt = '';
    /* NOT lazy. Intersection logic does not cope with a 3D-transformed
       container — tiles sat undecoded, and since the box takes its height
       from the image, they rendered as 192x4px slivers. Ten thumbnails on
       the section that is the point of the page can load eagerly. */
    img.decoding = 'async';

    /* The tile holds a 16:9 box until the real proportions are known, then
       adopts them. That is what makes a vertical Short simply come out tall:
       nothing is hard-coded, the image reports its own shape. */
    var swapped = false;
    function adopt() {
      if (!img.naturalWidth || !img.naturalHeight) return;

      /* When a video has no maxres frame, YouTube does not 404 — it returns a
         120x90 grey "unavailable" tile with HTTP 200, so the error handler
         never runs and the wheel shows a placeholder among real stills. A real
         maxres frame is 1280 wide; anything under 400 is the grey one. */
      if (img.naturalWidth < 400 && !swapped) {
        swapped = true;
        img.src = original;
        return;                            /* the retry will call adopt again */
      }

      a.style.setProperty('--vw-ar', img.naturalWidth + ' / ' + img.naturalHeight);
      ratiosPending--;
      if (ratiosPending <= 0) { place(); ScrollTrigger.refresh(); }
    }
    img.addEventListener('load', adopt);
    img.addEventListener('error', function once() {
      img.removeEventListener('error', once);
      img.src = original;                  /* maxres is not guaranteed to exist */
    });
    img.src = original.replace(/\/(hq|sd|mq)default\.jpg/, '/maxresdefault.jpg');
    a.appendChild(img);

    ring.appendChild(a);
    return a;
  }).filter(Boolean);

  if (!tiles.length) return;
  grid.parentNode.insertBefore(stage, grid);

  /* ─── ring maths ─────────────────────────────────────────────────────── */
  var base = tiles.map(function (_, i) { return (i / tiles.length) * Math.PI * 2; });

  /* Some images may already be in cache and fired load before the listener
     was attached; adopt those now so the counter can reach zero. */
  tiles.forEach(function (t) {
    var i = t.querySelector('img');
    if (i && i.complete && i.naturalWidth) i.dispatchEvent(new Event('load'));
  });

  /* 106 rests at rotateX:90 — the ring dead flat, edge-on — and only leans
     once a pointer arrives. On a full-bleed demo that is fine; here the stage
     is one block among several, and a visitor who never crosses it sees a
     cramped horizontal row rather than a wheel. Resting at 76° keeps it
     legible as a ring from the first paint, and the pointer modulates around
     that instead of around flat. */
  var REST_X = 76;
  var transform = { rotateX: REST_X, rotateY: 0, rotateZ: 0 };
  var autoOffset     = { value: 0 };
  var scrollOffset   = { value: 0 };
  var spread         = { value: 0 };

  function place() {
    /* Radius comes off the STAGE, not the window. The original is full-bleed;
       this one is a bounded block, and sizing to the viewport would push tiles
       straight out through its edges. */
    var w = stage.clientWidth;
    stage.style.perspective = (100 + spread.value * 30) + 'vw';

    /* Ten tiles at 13vw need roughly 2.6 to sit shoulder to shoulder without
       stacking; the original's 3.5 was sized for smaller square tiles. */
    var radius = w / Math.max(1.9, 2.6 - spread.value * 0.12);
    var offset = autoOffset.value + scrollOffset.value;

    tiles.forEach(function (el, i) {
      var a = offset + base[i];
      /* xPercent/yPercent rather than a fixed CSS offset: tiles take their
         height from the image itself now, so nothing here may assume one.
         GSAP composes these with x/y, which a CSS translate would not. */
      gsap.set(el, {
        xPercent: -50, yPercent: -50,
        x: Math.sin(a) * radius, y: Math.cos(a) * radius
      });
    });
  }

  function renderTilt() {
    ring.style.transform =
      'translate3d(0, 0, -26vw) rotateX(' + transform.rotateX + 'deg) rotateY(' +
      transform.rotateY + 'deg) rotateZ(' + transform.rotateZ + 'deg)';

    /* Counter-spin each tile so the artwork stays upright however far the
       ring leans — otherwise the thumbnails read as tipped-over rubbish. */
    tiles.forEach(function (el) {
      gsap.set(el, {
        rotationX: -transform.rotateX,
        rotationY: -transform.rotateY,
        rotation:  -transform.rotateZ
      });
    });
  }

  var ease = { duration: 0.8, ease: 'power3' };
  var setX = gsap.quickTo(transform, 'rotateX', ease);
  var setY = gsap.quickTo(transform, 'rotateY', ease);
  var setZ = gsap.quickTo(transform, 'rotateZ', { duration: 0.8, ease: 'power3', onUpdate: renderTilt });

  stage.addEventListener('pointermove', function (e) {
    var b = stage.getBoundingClientRect();
    var px = (e.clientX - b.left) / b.width;
    var py = (e.clientY - b.top) / b.height;
    setY(px * 46 - 23);
    setX(py * 30 - 15 + REST_X);
    setZ(-px * 9 + 4.5);
  });

  /* ─── drift, paused while a pointer is over the stage ─────────────────── */
  var drift = gsap.to(autoOffset, {
    value: Math.PI * 2, duration: 26, repeat: -1, ease: 'none', onUpdate: place
  });

  stage.addEventListener('pointerenter', function () { drift.pause(); });
  stage.addEventListener('pointerleave', function () {
    drift.resume();
    setX(REST_X); setY(0); setZ(0);
  });

  /* ─── spread, from scroll velocity instead of the wheel event ─────────── */
  var setSpread = gsap.quickTo(spread,       'value', { duration: 1.3, ease: 'power2.out', onUpdate: place });
  var setOffset = gsap.quickTo(scrollOffset, 'value', { duration: 0.5, ease: 'power2',     onUpdate: place });

  var travel = 0, settle;
  ScrollTrigger.create({
    trigger: stage,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: function (self) {
      var v = self.getVelocity();
      travel += v / 9000;
      setOffset(travel);
      setSpread(Math.min(Math.abs(v) / 1400, 6));
      clearTimeout(settle);
      settle = setTimeout(function () { setSpread(0); }, 140);
    }
  });

  /* Kill the whole thing rather than let it sit mis-measured if the viewport
     crosses the breakpoint; a reload rebuilds it correctly. */
  var rs;
  addEventListener('resize', function () {
    clearTimeout(rs);
    rs = setTimeout(function () {
      if (!matchMedia('(min-width: 821px)').matches) {
        drift.kill();
        stage.remove();
      } else {
        place();
        ScrollTrigger.refresh();
      }
    }, 220);
  });

  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
    renderTilt();
    place();
    ScrollTrigger.refresh();
  });
})();
