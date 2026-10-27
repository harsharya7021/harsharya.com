/* THE SHELF — see shelf.css.
   Desktop with a mouse: the books are split into shelves that fit the width;
   a book opens on hover or keyboard focus and closes when the pointer or
   focus leaves it; when a book near the end of a shelf opens, the shelf
   slides left so the whole book shows, and slides back when it closes.
   Touch screens and phones: shelves of shorter spines, tap a book to open
   it full width, tap it again to put it back. */
(function () {
  var shelf = document.getElementById('bkShelf');
  if (!shelf) return;
  var books = [].slice.call(shelf.querySelectorAll('.bk-book'));
  var fine = window.matchMedia('(min-width: 651px) and (hover: hover) and (pointer: fine)');
  var GAP = 3, INFO = 320, ROOM = 44;
  var touch = false, lastW = 0, io = null;

  // the sizes are on each book's own style attribute (read there, so it works
  // while a book is between shelves and not in the page)
  function num(el, name) { return parseFloat(el.style.getPropertyValue(name) || getComputedStyle(el).getPropertyValue(name)) || 0; }
  function links(b, on) { b.querySelectorAll('a').forEach(function (a) { a.tabIndex = on ? 0 : -1; }); }

  function shift(b) {
    var row = b.closest('.bk-row'), track = row.firstElementChild, left = 0;
    for (var k = track.firstElementChild; k && k !== b; k = k.nextElementSibling) left += num(k, '--swd') + GAP;
    var s = Math.max(0, left + num(b, '--cw') + INFO + ROOM - row.clientWidth);
    row.classList.add('is-active');
    track.style.transform = s ? 'translateX(' + (-s) + 'px)' : '';
  }
  function settle(row) {
    if (!row || row.querySelector('.bk-book.is-open')) return;
    row.classList.remove('is-active');
    row.firstElementChild.style.transform = '';
  }
  function open(b) {
    if (b.classList.contains('is-open')) return;
    books.forEach(function (o) { if (o !== b && o.classList.contains('is-open')) close(o); });
    b.classList.add('is-open'); b.setAttribute('aria-expanded', 'true'); links(b, true);
    var img = b.querySelector('.bk-cover img'); if (img && img.loading === 'lazy') img.loading = 'eager';
    if (!touch) shift(b);
    else {
      var nav = document.getElementById('nav'), off = (nav ? nav.offsetHeight : 0) + 16;
      var top = b.getBoundingClientRect().top + window.scrollY - off;
      window.scrollTo({ top: top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }
  function close(b) {
    if (!b.classList.contains('is-open')) return;
    b.classList.remove('is-open'); b.setAttribute('aria-expanded', 'false'); links(b, false);
    if (!touch) settle(b.closest('.bk-row'));
  }

  function layout() {
    touch = !fine.matches;
    books.forEach(close);
    shelf.classList.toggle('is-touch', touch);
    var W = shelf.clientWidth; lastW = W;
    shelf.querySelectorAll('.bk-row').forEach(function (r) { r.remove(); });
    var row = null, used = 0;
    books.forEach(function (b) {
      var w = num(b, touch ? '--swm' : '--swd');
      if (!row || used + w > W) {
        row = document.createElement('div'); row.className = 'bk-row';
        row.appendChild(document.createElement('div')).className = 'bk-track';
        row.setAttribute('role', 'presentation');
        shelf.appendChild(row); used = 0;
      }
      row.firstElementChild.appendChild(b); used += w + GAP;
    });
    shelf.classList.add('is-laid');
    // covers sit folded away (clipped), so lazy loading alone would fetch them
    // only once a book opens; fetch a shelf's covers as it nears the screen
    if (io) io.disconnect();
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (!e.isIntersecting) return; e.target.querySelectorAll('.bk-cover img[loading="lazy"]').forEach(function (i) { i.loading = 'eager'; }); io.unobserve(e.target); });
      }, { rootMargin: '600px 0px' });
      shelf.querySelectorAll('.bk-row').forEach(function (r) { io.observe(r); });
    }
  }

  books.forEach(function (b) {
    links(b, false);
    b.addEventListener('pointerenter', function (e) { if (!touch && e.pointerType === 'mouse') open(b); });
    b.addEventListener('pointerleave', function (e) { if (!touch && e.pointerType === 'mouse') close(b); });
    b.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;            // the Goodreads link
      if (touch) { b.classList.contains('is-open') ? close(b) : open(b); }
      else open(b);
    });
    b.addEventListener('keydown', function (e) {
      if (e.target !== b) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.classList.contains('is-open') ? close(b) : open(b); }
      else if (e.key === 'Escape') close(b);
    });
    b.addEventListener('focus', function () { if (!touch && b.matches(':focus-visible')) open(b); });
    b.addEventListener('focusout', function (e) { if (!b.contains(e.relatedTarget)) close(b); });
  });

  layout();
  var t = 0;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { if (shelf.clientWidth !== lastW || touch !== !fine.matches) layout(); }, 150); });
  if (fine.addEventListener) fine.addEventListener('change', layout);
})();
