/* ═══════════════════════════════════════════════════════════════════════
   DESIGN SHOWCASE — word & scatter  (/portfolio/design)
   ═══════════════════════════════════════════════════════════════════════
   MWG 117: one big word at a time, with images scattered around it on
   three depth layers — the nearer the layer, the harder it follows the
   pointer. A click dismisses the set and bursts in the next one.

   Departures, each forced by the page rather than taste:

   1. ONE SLOT PER SERIES, ONE ARTIFACT PER SERIES. 117 switches between
      "areas of work" with six pictures each. Here each slot is a design
      series and shows a single artifact — the piece that stands for the
      series everywhere else on the site. A slot whose series is not made
      yet holds an empty frame instead of a picture, so the pager already
      says how many are coming. The slots live in the page as a
      <template>, one block per series (word, label, one <img> or one
      [data-blank]); the words, the pager and the artifact are all built
      from it, so finishing a series is a one-block edit and nothing in
      here changes. The scatter maths for a set of many is kept intact —
      give a block several images and it bursts a cluster as 117 does.

   2. A BLOCK, NOT A VIEWPORT. The original is a dark 100vh root sized
      off the window. Here the stage is a bounded block on the page's own
      canvas, between the header and the case-study card, and the scatter
      is sized off the block — on an ellipse rather than a circle, because
      the block is twice as wide as it is tall and a circle would leave
      both ends empty. A lone artifact is not scattered at random: the
      slot becomes a poster — the word moves over to the left (work.css)
      and the artifact takes the right third on the near layer, above the
      word on a phone — so the two compose instead of colliding. The pictures are
      served from pieces/assets/scatter/: finished collages keyed to real
      transparency so they float on the canvas as loose paper, photographs
      just downsized — a sixth of the weight of the case-study originals.
      (How each kind is drawn: see work.css.)

   3. RELAYOUT ON RESIZE. 117 places each image once; resize a bounded
      block and the set is either cramped or spilling over the edges.
      Every media keeps its angle and distance factor, so a resize just
      re-solves the positions and eases there. The parallax also eases
      back to rest when the pointer leaves the block, instead of leaving
      the set displaced wherever the cursor last was.

   4. REDUCED MOTION gets the same showcase with no tweens and no
      parallax: each slot is simply set, and a click swaps the set. The
      video wheel hides itself under that preference, but it is a
      decoration over a grid that has the same films; these images ARE
      the work, so taking the block away would take the work away with
      it. (Not "the same tweens at zero duration": GSAP does not fire a
      zero-duration tween's onStart, so the swap would half-happen.)

   5. A PAGER OF BUTTONS, plus arrow keys. The original's <li> marks are
      not focusable. The whole stage still advances on click, as in 117.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (!window.gsap) return;

  var stage = document.querySelector('.ws-stage');
  if (!stage) return;

  var pool = stage.querySelector('template.ws-pool');
  if (!pool || !('content' in pool)) return;

  var blocks = Array.prototype.slice.call(pool.content.querySelectorAll('[data-word]'));
  if (blocks.length < 2) return;        /* one slot is a picture, not a switch */

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var series = blocks.map(function (block) {
    var medias = [];
    Array.prototype.slice.call(block.children).forEach(function (el) {
      if (el.tagName === 'IMG') {
        medias.push({ src: el.getAttribute('src'), framed: el.hasAttribute('data-framed') });
      } else if (el.hasAttribute('data-blank')) {
        medias.push({ blank: true, text: el.textContent.trim() });
      }
    });
    return {
      word: block.getAttribute('data-word') || '',
      label: block.getAttribute('data-label') || '',
      medias: medias
    };
  });
  var n = series.length;

  /* ─── build the words and the pager from the template ───────────────── */
  var scene    = stage.querySelector('.ws-scene');
  var layers   = Array.prototype.slice.call(stage.querySelectorAll('.ws-layer'));
  var wordsBox = stage.querySelector('.ws-words');
  var pager    = stage.querySelector('.ws-pager');
  var label    = stage.querySelector('.ws-label');
  if (!scene || layers.length < 1 || !wordsBox || !pager) return;

  var words = series.map(function (s) {
    var p = document.createElement('p');
    p.className = 'ws-word';
    p.textContent = s.word;
    wordsBox.appendChild(p);
    return p;
  });

  var marks = series.map(function (s, i) {
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ws-mark';
    b.textContent = (i < 9 ? '0' : '') + (i + 1);
    b.setAttribute('aria-label', 'Series ' + (i + 1) + ' of ' + n + ' — ' + s.word);
    li.appendChild(b);
    pager.appendChild(li);
    return b;
  });

  var current   = 0;
  var animating = false;
  var active    = [];
  var pointer   = { x: 0, y: 0 };

  /* The closer the layer (higher index), the stronger the parallax. */
  var PARALLAX = [18, 36, 64];

  function setPager(index) {
    marks.forEach(function (mark, i) {
      var on = i === index;
      mark.classList.toggle('is-active', on);
      if (on) mark.setAttribute('aria-current', 'true');
      else mark.removeAttribute('aria-current');
    });
    if (label) label.textContent = series[index].label;
    stage.classList.toggle('is-solo', series[index].medias.length === 1);
  }

  /* Deal the medias across the layers as evenly as a shuffle allows, so
     a set of four never lands entirely on the far plane. */
  function shuffledLayerIds(count) {
    var ids = [];
    for (var i = 0; i < count; i++) ids.push(i % layers.length);
    for (var k = ids.length - 1; k > 0; k--) {
      var j = Math.floor(Math.random() * (k + 1));
      var t = ids[k]; ids[k] = ids[j]; ids[j] = t;
    }
    return ids;
  }

  /* ─── placement, solved off the stage's own size ─────────────────────── */
  function solve(item) {
    var rx = stage.clientWidth  * 0.36;
    var ry = stage.clientHeight * 0.32;
    if (item.solo) {
      /* Due right, level with the word, on a wide viewport — the word has
         moved over to leave it the right third (work.css); straight above
         the word on a narrow one, where there is no room beside it. Keyed
         off the viewport, not the block: the stylesheet's breakpoint is a
         viewport query, and the block is 72px narrower than the viewport,
         so between 768 and 840px the two would disagree and the artifact
         would land above a word that had already moved aside for it. */
      item.angle = matchMedia('(min-width: 768px)').matches ? 0 : -Math.PI / 2;
    }
    item.baseX = Math.cos(item.angle) * rx * item.dist;
    item.baseY = Math.sin(item.angle) * ry * item.dist;
  }

  function targetX(item) { return item.baseX - pointer.x * item.strength * 2; }
  function targetY(item) { return item.baseY - pointer.y * item.strength * 2; }

  function applyParallax() {
    active.forEach(function (item) {
      item.xTo(targetX(item));
      item.yTo(targetY(item));
    });
  }

  function dismiss() {
    var outgoing = active.splice(0);
    outgoing.forEach(function (item, i) {
      if (reduced) { item.el.remove(); return; }
      gsap.to(item.el, {
        scale: 0.7,
        autoAlpha: 0,
        duration: 0.28,
        ease: 'expo.in',
        delay: i * 0.015,
        onComplete: function () { item.el.remove(); }
      });
    });
  }

  function show(index) {
    var set   = series[index].medias;
    var count = set.length;
    var solo  = count === 1;
    var ids   = shuffledLayerIds(count);
    var start = Math.random() * Math.PI * 2;
    var items = [];

    set.forEach(function (media, i) {
      /* A lone artifact always takes the near layer: in front of the word,
         and with the strongest pull toward the pointer. */
      var layerIndex = solo ? layers.length - 1 : ids[i];
      var layer = layers[layerIndex];

      var el;
      if (media.blank) {
        el = document.createElement('div');
        el.className = 'ws-media ws-media--blank';
        el.textContent = media.text;
      } else {
        el = document.createElement('img');
        el.className = 'ws-media ' + (media.framed ? 'ws-media--framed' : 'ws-media--cut');
        el.alt = '';                      /* decorative here; the case study carries the alts */
        el.decoding = 'async';
        el.draggable = false;
        el.src = media.src;
      }
      layer.appendChild(el);

      var item = {
        el: el,
        solo: solo,
        angle: start + (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35,
        dist: solo ? 0.78 : 0.72 + Math.random() * 0.4,
        rot: solo ? -5 : (Math.random() - 0.5) * 28,
        strength: PARALLAX[layerIndex]
      };
      solve(item);

      if (reduced) {
        gsap.set(el, {
          xPercent: -50, yPercent: -50,
          x: item.baseX, y: item.baseY,
          rotation: item.rot, scale: 1, autoAlpha: 1
        });
      } else {
        gsap.fromTo(el, {
          xPercent: -50,
          yPercent: -50,
          x: item.baseX * 0.15,
          y: item.baseY * 0.15,
          rotation: item.rot * 0.3,
          scale: 0.35,
          autoAlpha: 0
        }, {
          xPercent: -50,
          yPercent: -50,
          x: targetX(item),
          y: targetY(item),
          rotation: item.rot,
          scale: 1,
          autoAlpha: 1,
          duration: 0.55,
          ease: 'expo.out',
          delay: i * 0.02
        });
      }

      /* Created after the burst tween so, when both touch x/y at once,
         the later one wins the render — as in 117. */
      item.xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
      item.yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });

      items.push(item);
    });

    active = items;
  }

  function goTo(index) {
    if (animating || index === current) return;

    var outgoing = words[current];
    var incoming = words[index];

    if (reduced) {
      dismiss();
      gsap.set(outgoing, { autoAlpha: 0, scale: 1 });
      outgoing.classList.remove('is-active');
      gsap.set(incoming, { autoAlpha: 1, scale: 1 });
      incoming.classList.add('is-active');
      setPager(index);
      current = index;
      show(index);
      return;
    }

    animating = true;

    var tl = gsap.timeline({
      onComplete: function () { animating = false; }
    });

    tl.add(dismiss);
    tl.to(outgoing, {
      scale: 0.82,
      duration: 0.3,
      ease: 'expo.in',
      onComplete: function () {
        gsap.set(outgoing, { autoAlpha: 0 });
        outgoing.classList.remove('is-active');
      }
    }, '<');

    tl.add(function () { show(index); });

    tl.fromTo(incoming, {
      autoAlpha: 1,
      scale: 0.6
    }, {
      scale: 1,
      duration: 0.5,
      ease: 'expo.out',
      immediateRender: false,
      onStart: function () {
        incoming.classList.add('is-active');
        setPager(index);
      }
    }, '<');

    current = index;
  }

  function next() { goTo((current + 1) % n); }
  function prev() { goTo((current - 1 + n) % n); }

  /* ─── input ──────────────────────────────────────────────────────────── */
  stage.addEventListener('click', function (e) {
    var mark = e.target.closest && e.target.closest('.ws-mark');
    if (mark) {
      var i = marks.indexOf(mark);
      if (i !== -1) goTo(i);
      return;
    }
    next();
  });

  /* Arrow keys while focus is inside the block (i.e. on a pager button). */
  stage.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prev(); }
  });

  function onMove(e) {
    var b = stage.getBoundingClientRect();
    pointer.x = (e.clientX - b.left) / b.width  - 0.5;
    pointer.y = (e.clientY - b.top)  / b.height - 0.5;
    applyParallax();
  }
  function onLeave() {
    pointer.x = 0;
    pointer.y = 0;
    applyParallax();
  }

  /* 117 keys the parallax off width alone; a fine pointer is the real
     condition — a tablet in landscape has the width and no cursor. */
  var mm = gsap.matchMedia();
  if (!reduced) {
    mm.add('(min-width: 768px) and (pointer: fine)', function () {
      stage.addEventListener('pointermove', onMove);
      stage.addEventListener('pointerleave', onLeave);
      return function () {
        stage.removeEventListener('pointermove', onMove);
        stage.removeEventListener('pointerleave', onLeave);
        onLeave();
      };
    });
  }

  var rs;
  addEventListener('resize', function () {
    clearTimeout(rs);
    rs = setTimeout(function () {
      active.forEach(function (item) {
        solve(item);
        if (reduced) gsap.set(item.el, { x: targetX(item), y: targetY(item) });
        else { item.xTo(targetX(item)); item.yTo(targetY(item)); }
      });
    }, 160);
  });

  /* ─── go ─────────────────────────────────────────────────────────────── */
  gsap.set(words, { autoAlpha: 0, scale: 1 });
  gsap.set(words[0], { autoAlpha: 1 });
  words[0].classList.add('is-active');
  setPager(0);

  /* The block was hidden until there was something to put in it; it has
     to be laid out before solve() can read a size. The live region is
     armed only now, so the build above is not read out as a change. */
  stage.hidden = false;
  wordsBox.setAttribute('aria-live', 'polite');
  show(0);

  /* The other slots' pictures are not fetched until they are shown, so
     warm them once the first burst has settled: a click then bursts in a
     picture, not a placeholder filling in. */
  setTimeout(function () {
    series.forEach(function (s, i) {
      if (i === current) return;
      s.medias.forEach(function (media) {
        if (media.blank) return;
        var im = new Image(); im.src = media.src;
      });
    });
  }, 1800);
})();
