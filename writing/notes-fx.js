/* ═══════════════════════════════════════════════════════════════════════
   WRITING INDEX — notes list
   ═══════════════════════════════════════════════════════════════════════
   Two things, because this list had no motion whatsoever: rows only shifted
   their padding on hover.

   030 "Images on hover" — a masked thumbnail slides in and tracks the
   cursor as you move down the list. Kept close to the original: the mask
   div enters from -100% while the image inside enters from +90%, so the
   picture parallaxes within its own frame rather than just sliding.

   Two departures. The original anchors its container absolutely and adds
   window.scrollY to the pointer position; position:fixed does the same job
   against the viewport with no scroll arithmetic to get wrong. And only
   rows carrying data-note-img can summon anything — five of the entries
   here are unwritten "Coming soon" placeholders pointing at href="#", and
   showing a preview for an essay that doesn't exist would be a lie.

   The reveal is IntersectionObserver rather than ScrollTrigger, matching
   the pattern already used on the homepage, so this page needs core GSAP
   and nothing else.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (!window.gsap) return;

  var list = document.querySelector('.notes-list');
  if (!list) return;

  var rows    = Array.prototype.slice.call(list.querySelectorAll('.note-item'));
  var reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ─── 1. Arrival ──────────────────────────────────────────────────────
     Pre-hidden then revealed on first intersection. Gated on GSAP loading,
     so if the script never runs the rows are simply visible. */
  if (!reduced && rows.length) {
    gsap.set(rows, { opacity: 0, y: 14 });
    new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        obs.disconnect();
        gsap.to(rows, {
          opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.045
        });
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 }).observe(list);
  }

  /* ─── 2. Hover preview (MWG 030) ─────────────────────────────────────── */
  if (reduced || !matchMedia('(pointer:fine)').matches) return;

  var live = rows.filter(function (r) { return r.getAttribute('data-note-img'); });
  if (!live.length) return;

  /* Decode up front. The original parks real <img> tags in the DOM to force
     the fetch; Image() does the same without leaving nine hidden nodes in
     the markup. Held in an array so nothing is collected before first use. */
  var warm = live.map(function (r) {
    var i = new Image();
    i.src = r.getAttribute('data-note-img');
    return i;
  });

  var box = document.createElement('div');
  box.className = 'nt-preview';
  box.setAttribute('aria-hidden', 'true');
  document.body.appendChild(box);

  gsap.set(box, { yPercent: -50 });
  var yTo = gsap.quickTo(box, 'y', { duration: 0.5, ease: 'power4' });

  live.forEach(function (row) {
    row.addEventListener('mouseenter', function () {
      var frame = document.createElement('div');
      var img   = document.createElement('img');
      img.src = row.getAttribute('data-note-img');
      img.alt = '';
      frame.appendChild(img);
      box.appendChild(frame);

      gsap.fromTo([frame, img],
        { yPercent: function (i) { return i === 0 ? -100 : 90; } },
        { yPercent: 0, duration: 0.6, ease: 'expo.inOut' }
      );

      /* Old frames are left to be covered by the new one rather than removed
         on arrival — pulling one mid-transition makes it vanish instead of
         being replaced. Trim only once a real backlog builds. */
      while (box.children.length > 12) box.children[0].remove();
    });
  });

  list.addEventListener('mouseenter', function () { box.classList.add('on'); });
  list.addEventListener('mouseleave', function () {
    box.classList.remove('on');
    while (box.firstChild) box.firstChild.remove();
  });
  list.addEventListener('mousemove', function (e) { yTo(e.clientY); });
})();
