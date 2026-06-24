/* Gallery — layout toggle (scroll / grid) + series switcher menu.
   Shared by every /gallery/ page. Degrades safely: if anything is
   missing the page is still a plain vertical scroll of photos. */
(function () {
  var body = document.body;
  var series = document.getElementById('series');
  var KEY = 'harsh-gallery-layout';

  function applyLayout(l) {
    if (!series) return;
    series.setAttribute('data-layout', l);
    body.setAttribute('data-gallery-layout', l);
    try { localStorage.setItem(KEY, l); } catch (e) {}
  }

  if (series) {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    applyLayout(saved === 'grid' ? 'grid' : 'vertical');

    var layoutBtn = document.getElementById('gfnLayout');
    if (layoutBtn) layoutBtn.addEventListener('click', function () {
      applyLayout(series.getAttribute('data-layout') === 'grid' ? 'vertical' : 'grid');
    });

    /* In grid (contact-sheet) mode, clicking a frame opens it in the
       full-size scroll, positioned on that photo. */
    series.addEventListener('click', function (e) {
      if (series.getAttribute('data-layout') !== 'grid') return;
      var fig = e.target.closest('.frame');
      if (!fig) return;
      applyLayout('vertical');
      requestAnimationFrame(function () {
        fig.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* Series switcher menu (the floating nav's centre button) */
  var sBtn = document.getElementById('gfnSeries');
  var menu = document.getElementById('gfnMenu');
  if (sBtn && menu) {
    var setOpen = function (open) {
      if (open) menu.removeAttribute('hidden'); else menu.setAttribute('hidden', '');
      sBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    sBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(menu.hasAttribute('hidden'));
    });
    document.addEventListener('click', function (e) {
      if (!menu.hasAttribute('hidden') && !menu.contains(e.target) && e.target !== sBtn) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  /* Parity with the rest of the site */
  var nav = document.getElementById('nav');
  if (nav) window.addEventListener('scroll', function () {
    if (window.scrollY > 8) nav.classList.add('scrolled'); else nav.classList.remove('scrolled');
  });
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
