/* ═══════════════════════════════════════════════════════════════════════
   PORTFOLIO HUB — folder fan + reorderable tiles
   ═══════════════════════════════════════════════════════════════════════
   Two techniques adapted from Made With Gsap, both rebuilt rather than
   transplanted, because the source structures don't match this page:

   075 "Pinned scroll fan" — the original pins a 500vh runway and pops cards
   into a rotating ring as you scrub. There's no runway here: four folder
   tiles sit in a grid and each holds a 2–3 card .peek-stack. What carries
   over is the idea, not the plumbing — an index-driven angular spread with
   an elastic arrival. It runs on hover and focus instead of scroll, and the
   arc comes from pairing rotation with lateral offset rather than rotating
   about a far-off centre, which needs no origin gymnastics for 2–3 cards.

   063 "Long-press reorder rail" — the original reorders a single horizontal
   flex rail, computing neighbour offsets as "one item width plus the gap".
   This grid wraps to 4 / 2 / 1 columns, so that linear maths is wrong at
   every breakpoint. The long-press gate and the lift feel are kept; the
   shuffle is rebuilt on Flip, which measures real positions and therefore
   survives wrapping. Order persists, or reordering is just a party trick.

   Deliberately mouse + keyboard only. A touch long-press drag needs
   touch-action:none on the tiles, and these tiles fill most of a phone
   screen — that would cost the page its scrolling to buy a flourish.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (!window.gsap) return;

  var reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var grid    = document.querySelector('.creative-grid');
  if (!grid) return;

  /* Declared up here on purpose: the fan below reads `lifted` to stay out of
     the way during a drag, but the reorder block that owns it is further down
     and may bail early (no Draggable, coarse pointer). Relying on var hoisting
     to make it read as undefined-and-falsy would work by accident, not design. */
  var lifted   = null;
  var suppress = false;

  var tiles = Array.prototype.slice.call(grid.querySelectorAll('.creative-tile'));
  if (!tiles.length) return;

  /* ─── 1. PEEK FAN (MWG 075, re-derived) ──────────────────────────────
     Resting transforms live in styles.css on .peek-back-a / .peek-back-b.
     GSAP writes inline transforms, which would silently drop those, so the
     rest state is restated here and set explicitly on init. The CSS stays
     as the no-JS fallback. */
  var REST = {
    'peek-back-a': { rotation: -9, xPercent: -12, yPercent:  8 },
    'peek-back-b': { rotation:  7, xPercent:  14, yPercent: -3 },
    'peek-front':  { rotation:  0, xPercent:   0, yPercent:  0 }
  };

  function restOf(peek) {
    for (var cls in REST) if (peek.classList.contains(cls)) return REST[cls];
    return REST['peek-front'];
  }

  tiles.forEach(function (tile) {
    var peeks = Array.prototype.slice.call(tile.querySelectorAll('.peek'));
    if (peeks.length < 2) return;

    peeks.forEach(function (p) { gsap.set(p, restOf(p)); });

    /* Spread widens with the stack: two cards open gently, three need more
       angle before the middle one reads as its own card. */
    var n      = peeks.length;
    var spread = n > 2 ? 17 : 13;
    var lift   = n > 2 ? 24 : 19;

    /* RISE is what makes this legible. .peek-stack sits at z-index 0, behind
       the folder body, with roughly its bottom third tucked inside the mouth —
       so rotating in place just wiggles an occluded sliver. Pulling the cards
       up and out first is what turns the gesture into a folder being opened,
       which is the metaphor the page is already dressed in. */
    var RISE = 30;

    function fan(open) {
      peeks.forEach(function (p, i) {
        var rest   = restOf(p);
        var offset = i - (n - 1) / 2;          /* centre the fan on the stack */
        gsap.to(p, {
          rotation:  open ? offset * spread        : rest.rotation,
          xPercent:  open ? offset * lift          : rest.xPercent,
          yPercent:  open ? rest.yPercent - RISE   : rest.yPercent,
          duration:  reduced ? 0 : 0.55,
          ease:      open ? 'elastic.out(0.5, 0.45)' : 'power3.out',
          overwrite: true
        });
      });
    }

    tile.addEventListener('pointerenter', function () { if (!lifted) fan(true);  });
    tile.addEventListener('pointerleave', function () { fan(false); });
    tile.addEventListener('focusin',      function () { fan(true);  });
    tile.addEventListener('focusout',     function () { fan(false); });
  });

  /* ─── 2. REORDER (MWG 063, rebuilt on Flip) ──────────────────────────── */

  if (!window.Draggable || !window.Flip) return;
  if (!matchMedia('(pointer:fine)').matches) return;

  gsap.registerPlugin(Draggable, Flip);

  var KEY       = 'harsh-portfolio-order';
  var HOLD_MS   = 400;
  var MOVE_SLOP = 8;

  /* href is the stable identity — the tiles have no ids and their text can
     change. If the saved set no longer matches the page (a folder added or
     removed), the stored order is discarded rather than partly applied. */
  function currentKeys() {
    return Array.prototype.slice.call(grid.querySelectorAll('.creative-tile'))
      .map(function (t) { return t.getAttribute('href'); });
  }

  function saveOrder() {
    try { localStorage.setItem(KEY, JSON.stringify(currentKeys())); } catch (e) {}
  }

  function restoreOrder() {
    var saved;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return; }
    if (!Array.isArray(saved)) return;

    var live = currentKeys();
    if (saved.length !== live.length) return;
    for (var i = 0; i < saved.length; i++) if (live.indexOf(saved[i]) === -1) return;

    saved.forEach(function (href) {
      var t = grid.querySelector('.creative-tile[href="' + href + '"]');
      if (t) grid.appendChild(t);
    });
  }

  restoreOrder();

  /* Move a tile to a new index and let Flip animate every sibling from where
     it actually was to where it actually lands. That is the whole reason for
     preferring Flip over 063's offset arithmetic: it reads real geometry, so
     a tile moving between grid rows animates correctly at any breakpoint. */
  function placeAt(tile, index) {
    var order = Array.prototype.slice.call(grid.querySelectorAll('.creative-tile'));
    var from  = order.indexOf(tile);
    if (from === index || index < 0 || index >= order.length) return;

    var state = Flip.getState(order);
    order.splice(from, 1);
    order.splice(index, 0, tile);
    order.forEach(function (t) { grid.appendChild(t); });

    Flip.from(state, {
      duration: reduced ? 0 : 0.42,
      ease: 'power3.inOut',
      absolute: true
    });
    saveOrder();
  }

  function indexUnderPointer(x, y, exclude) {
    var order = Array.prototype.slice.call(grid.querySelectorAll('.creative-tile'));
    var best = -1, bestDist = Infinity;
    order.forEach(function (t, i) {
      if (t === exclude) return;
      var b  = t.getBoundingClientRect();
      var dx = x - (b.left + b.width / 2);
      var dy = y - (b.top  + b.height / 2);
      var d  = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  tiles.forEach(function (tile) {
    var timer = null, sx = 0, sy = 0, drag = null;

    function cancelHold() { if (timer) { clearTimeout(timer); timer = null; } }

    tile.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || lifted) return;
      sx = e.clientX; sy = e.clientY;

      timer = setTimeout(function () {
        timer  = null;
        lifted = tile;
        grid.classList.add('is-reordering');
        tile.classList.add('is-lifted');

        /* Scale the .folder, not the tile. Draggable owns the tile's transform
           and rewrites it every frame, which flattens any scale tween running
           on the same element. The folder is a child Draggable never touches. */
        gsap.to(tile.querySelector('.folder') || tile, {
          scale: 0.94, duration: reduced ? 0 : 0.2, ease: 'back.out(3)'
        });

        drag = Draggable.create(tile, {
          type: 'x,y',
          onDrag: function () {
            var i = indexUnderPointer(this.pointerX, this.pointerY, tile);
            var order = Array.prototype.slice.call(grid.querySelectorAll('.creative-tile'));
            if (i > -1 && order[i] !== tile) {
              /* Flip re-measures, so the dragged tile's own offset has to be
                 cleared first or it inherits a stale x/y after the reflow. */
              var px = this.x, py = this.y;
              gsap.set(tile, { x: 0, y: 0 });
              placeAt(tile, i);
              gsap.set(tile, { x: px, y: py });
            }
          },
          onDragEnd: function () {
            gsap.to(tile.querySelector('.folder') || tile, {
              scale: 1, duration: reduced ? 0 : 0.3, ease: 'back.out(1.6)'
            });
            gsap.to(tile, {
              x: 0, y: 0,
              duration: reduced ? 0 : 0.3, ease: 'back.out(1.6)',
              onComplete: function () { gsap.set(tile, { clearProps: 'transform' }); }
            });
            if (drag) { drag.kill(); drag = null; }
            tile.classList.remove('is-lifted');
            grid.classList.remove('is-reordering');
            lifted   = null;
            suppress = true;             /* the release must not follow the link */
            saveOrder();
          }
        })[0];

        drag.startDrag(e);
      }, HOLD_MS);
    });

    tile.addEventListener('pointermove', function (e) {
      if (!timer) return;
      if (Math.abs(e.clientX - sx) > MOVE_SLOP || Math.abs(e.clientY - sy) > MOVE_SLOP) cancelHold();
    });

    tile.addEventListener('pointerup',     cancelHold);
    tile.addEventListener('pointercancel', cancelHold);

    /* Keyboard equivalent. Drag-to-reorder with no keyboard path is a hole,
       and this is four items — Cmd/Ctrl + arrow is enough. */
    tile.addEventListener('keydown', function (e) {
      if (!(e.metaKey || e.ctrlKey)) return;
      var order = Array.prototype.slice.call(grid.querySelectorAll('.creative-tile'));
      var i = order.indexOf(tile), to = i;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = i + 1;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = i - 1;
      else return;
      if (to < 0 || to >= order.length) return;
      e.preventDefault();
      placeAt(tile, to);
      tile.focus();
    });
  });

  /* A drag ends with a pointerup over a link. Swallow exactly one click. */
  document.addEventListener('click', function (e) {
    if (!suppress) return;
    suppress = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  grid.addEventListener('dragstart', function (e) { e.preventDefault(); });
})();
