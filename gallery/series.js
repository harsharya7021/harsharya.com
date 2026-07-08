/* Gallery — frosted floating nav + soft motion.
   Builds the nav from one config, reads the current series from
   <body data-series>, and degrades safely (a no-JS visitor still
   has the header "All series" link, the top nav and the cards). */
(function () {
  var body = document.body;
  var reduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  var SERIES = [
    { id: 'kerala',   name: 'Kerala',   count: 6,  cover: '../assets/life/kerala/varkala-01.jpg' },
    { id: 'jodhpur',  name: 'Jodhpur',  count: 7,  cover: '../assets/life/jodhpur/jodhpur-01.jpg' },
    { id: 'shimla',   name: 'Shimla',   count: 10, cover: '../assets/life/shimla/shimla-01.jpg' },
    { id: 'malaysia', name: 'Malaysia', count: 3,  cover: '../assets/life/malaysia/malaysia-01.jpg' }
  ];
  function pad(n){ return String(n).padStart(2, '0'); }
  function find(id){ for (var i=0;i<SERIES.length;i++){ if (SERIES[i].id===id) return i; } return -1; }

  var ICON = {
    back:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5l-7 7 7 7M4 12h15"/></svg>',
    prev:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    next:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    grid:  '<svg class="i-grid" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></svg>',
    scroll:'<svg class="i-scroll" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="4.5" width="16" height="6" rx="2"/><rect x="4" y="13.5" width="16" height="6" rx="2"/></svg>'
  };

  var seriesEl = document.getElementById('series');
  var current  = body.getAttribute('data-series');
  var curIdx   = current ? find(current) : -1;

  function menuItems() {
    return SERIES.map(function (s) {
      return '<a href="' + s.id + '.html" data-go' + (s.id === current ? ' class="is-current"' : '') +
             '><span>' + s.name + '</span><em>' + pad(s.count) + '</em></a>';
    }).join('');
  }

  /* Build the nav */
  var nav = document.createElement('nav');
  nav.className = 'gnav';
  nav.setAttribute('aria-label', 'Gallery navigation');

  if (seriesEl && curIdx > -1) {
    var s = SERIES[curIdx];
    nav.innerHTML =
      '<a class="gnav__btn gnav__back" href="index.html" data-go aria-label="All series">' +
        '<span class="gnav__ico">' + ICON.back + '</span><span class="gnav__lbl">All series</span></a>' +
      '<span class="gnav__sep"></span>' +
      '<button class="gnav__arrow gnav__prev" type="button" aria-label="Previous series">' + ICON.prev + '</button>' +
      '<button class="gnav__cat" id="gnavCat" type="button" aria-haspopup="true" aria-expanded="false">' +
        '<span class="gnav__thumb" style="background-image:url(\'' + s.cover + '\')"></span>' +
        '<span class="gnav__cat-text"><span class="gnav__kicker">Series</span>' +
        '<span class="gnav__name">' + s.name + '<span class="gnav__chev">▲</span></span></span></button>' +
      '<button class="gnav__arrow gnav__next" type="button" aria-label="Next series">' + ICON.next + '</button>' +
      '<span class="gnav__sep"></span>' +
      '<button class="gnav__btn gnav__layout" id="gnavLayout" type="button" aria-label="Toggle scroll or grid layout">' +
        '<span class="gnav__ico gnav__ico--layout">' + ICON.grid + ICON.scroll + '</span>' +
        '<span class="gnav__lbl gnav__lbl--layout">Grid</span></button>' +
      '<div class="gnav__menu" id="gnavMenu" role="menu">' + menuItems() + '</div>';
  } else {
    /* index */
    nav.innerHTML =
      '<a class="gnav__btn gnav__back" href="../life/index.html" aria-label="Back to Life">' +
        '<span class="gnav__ico">' + ICON.back + '</span><span class="gnav__lbl">Life</span></a>' +
      '<span class="gnav__sep"></span>' +
      '<button class="gnav__cat" id="gnavCat" type="button" aria-haspopup="true" aria-expanded="false">' +
        '<span class="gnav__cat-text"><span class="gnav__kicker">Gallery</span>' +
        '<span class="gnav__name">All series<span class="gnav__chev">▲</span></span></span></button>' +
      '<div class="gnav__menu" id="gnavMenu" role="menu">' + menuItems() + '</div>';
  }

  var oldNav = document.querySelector('.gfn');
  if (oldNav) oldNav.remove();
  body.appendChild(nav);

  /* smooth page exit for internal gallery links */
  function smoothGo(href) {
    if (!href) return;
    if (reduced) { window.location.href = href; return; }
    body.classList.add('is-leaving');
    setTimeout(function () { window.location.href = href; }, 230);
  }
  nav.querySelectorAll('a[data-go]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); smoothGo(a.getAttribute('href')); });
  });
  var headerBack = document.querySelector('.series-back');
  if (headerBack) headerBack.addEventListener('click', function (e) { e.preventDefault(); smoothGo(headerBack.getAttribute('href')); });
  window.addEventListener('pageshow', function () { body.classList.remove('is-leaving'); });

  /* prev / next series */
  if (curIdx > -1) {
    var prevS = SERIES[(curIdx - 1 + SERIES.length) % SERIES.length];
    var nextS = SERIES[(curIdx + 1) % SERIES.length];
    var pBtn = nav.querySelector('.gnav__prev'), nBtn = nav.querySelector('.gnav__next');
    if (pBtn) pBtn.addEventListener('click', function () { smoothGo(prevS.id + '.html'); });
    if (nBtn) nBtn.addEventListener('click', function () { smoothGo(nextS.id + '.html'); });
  }

  /* layout toggle (persisted) */
  var KEY = 'harsh-gallery-layout';
  function applyLayout(l) {
    if (!seriesEl) return;
    seriesEl.setAttribute('data-layout', l);
    body.setAttribute('data-gallery-layout', l);
    var lbl = nav.querySelector('.gnav__lbl--layout');
    if (lbl) lbl.textContent = (l === 'grid' ? 'Scroll' : 'Grid');
    try { localStorage.setItem(KEY, l); } catch (e) {}
  }
  if (seriesEl) {
    var saved = null; try { saved = localStorage.getItem(KEY); } catch (e) {}
    applyLayout(saved === 'grid' ? 'grid' : 'vertical');
    var layoutBtn = nav.querySelector('#gnavLayout');
    if (layoutBtn) layoutBtn.addEventListener('click', function () {
      applyLayout(seriesEl.getAttribute('data-layout') === 'grid' ? 'vertical' : 'grid');
    });
    seriesEl.addEventListener('click', function (e) {
      if (seriesEl.getAttribute('data-layout') !== 'grid') return;
      var fig = e.target.closest('.frame'); if (!fig) return;
      applyLayout('vertical');
      requestAnimationFrame(function () { fig.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    });
  }

  /* series menu */
  var catBtn = nav.querySelector('#gnavCat'), menu = nav.querySelector('#gnavMenu');
  if (catBtn && menu) {
    var setOpen = function (open) { menu.classList.toggle('open', open); catBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); };
    catBtn.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!menu.classList.contains('open')); });
    document.addEventListener('click', function (e) { if (!nav.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }

  /* soft reveal of each frame as it scrolls in */
  if (seriesEl && !reduced && 'IntersectionObserver' in window) {
    seriesEl.classList.add('reveal-on');
    var io = new IntersectionObserver(function (entries, ob) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); ob.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
    seriesEl.querySelectorAll('.frame').forEach(function (f) { io.observe(f); });
  }

  /* ── sliced prints: scroll-velocity shear ─────────────────────
     Every photo becomes N vertical strips of itself. While you
     scroll, each strip lags behind the page by its own amount
     (edges > centre, odd > even), so the print visibly tears into
     columns mid-flight and snaps back flush when the page rests.
     Strips also assemble from alternating offsets the first time
     a frame scrolls into view. Vertical layout only; the grid
     shows plain prints, and reduced-motion never slices at all. */
  if (seriesEl && !reduced) {
    var SLICE_N = 10, groups = [];

    var sliceIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        for (var i = 0; i < groups.length; i++) {
          if (groups[i].el === en.target) { groups[i].revealTo = 1; }
        }
        sliceIO.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    seriesEl.querySelectorAll('.frame-media').forEach(function (media) {
      var img = media.querySelector('img');
      if (!img) return;
      function build() {
        if (media.classList.contains('is-sliced')) return;
        var wrap = document.createElement('div');
        wrap.className = 'fx-slices';
        wrap.style.setProperty('--n', SLICE_N);
        var url = (img.currentSrc || img.src);
        var slices = [];
        for (var i = 0; i < SLICE_N; i++) {
          var s = document.createElement('div');
          s.className = 'fx-slice';
          s.style.backgroundImage = 'url("' + url + '")';
          s.style.backgroundPositionX = (i / (SLICE_N - 1) * 100) + '%';
          wrap.appendChild(s); slices.push(s);
        }
        media.appendChild(wrap);
        media.classList.add('is-sliced');
        groups.push({ el: media, slices: slices, reveal: 0, revealTo: 0 });
        sliceIO.observe(media);
      }
      if (img.complete && img.naturalWidth) build();
      else img.addEventListener('load', build, { once: true });
    });

    /* one shared loop: smoothed scroll velocity + per-strip transforms */
    var lastY = window.scrollY, vel = 0;
    var mid = (SLICE_N - 1) / 2;
    (function shear() {
      var y = window.scrollY, dy = y - lastY; lastY = y;
      if (dy > 90) dy = 90; else if (dy < -90) dy = -90;
      vel += (dy - vel) * 0.14;                       /* chase the scrollbar softly */
      if (Math.abs(vel) < 0.02) vel = 0;
      var inGrid = seriesEl.getAttribute('data-layout') === 'grid';
      for (var g = 0; g < groups.length; g++) {
        var grp = groups[g];
        grp.reveal += (grp.revealTo - grp.reveal) * 0.075;
        var pending = 1 - grp.reveal;
        if (inGrid) continue;                          /* grid shows the plain print */
        for (var i = 0; i < grp.slices.length; i++) {
          var edge = Math.abs(i - mid) / mid;          /* 0 centre → 1 edge          */
          var lag  = vel * 1.55 * (0.5 + 0.5 * edge) * ((i % 2) ? 1.18 : 0.86);
          var asm  = pending * (26 + edge * 30) * ((i % 2) ? 1 : -1);  /* assembly offsets */
          grp.slices[i].style.transform = 'translate3d(0,' + (lag + asm).toFixed(2) + 'px,0)';
        }
      }
      requestAnimationFrame(shear);
    })();
  }

  /* parity with the rest of the site */
  var topNav = document.getElementById('nav');
  if (topNav) window.addEventListener('scroll', function () {
    if (window.scrollY > 8) topNav.classList.add('scrolled'); else topNav.classList.remove('scrolled');
  });
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
