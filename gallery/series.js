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

  /* layout toggle (persisted). Fancy layouts, both built by slits.js:
     'slits' (horizontal slit strip) and 'scroll' (big photographs in a
     vertical column with a lerped virtual scroll). 'grid' is the
     contact sheet; 'vertical' the plain no-JS / reduced-motion column.
     The pill cycles slits → scroll → grid; the label always names the
     NEXT layout. Leaving a live stage fades it out first, and flow
     layouts arrive with a soft rise (gx-arrive). */
  var KEY = 'harsh-gallery-layout';
  var isDesktop = function () { return window.matchMedia('(min-width:821px)').matches; };
  var stripPage = !!(seriesEl && seriesEl.getAttribute('data-ribbon') === 'on'); // flag reused
  var canFancy = stripPage && !reduced && !!(window.SlitGallery && window.SlitGallery.supported());
  var engine = null, engineDesktop = isDesktop(), swapping = false;

  var CYCLE = { slits: 'scroll', scroll: 'grid', grid: 'slits' };
  var NICE = { slits: 'Slits', scroll: 'Scroll', grid: 'Grid', vertical: 'Scroll' };

  function nextLayout(l) {
    if (!canFancy) return l === 'grid' ? 'vertical' : 'grid';
    return CYCLE[l] || 'slits';
  }

  function makeEngine(m, el, openAt) {
    var tEl = document.querySelector('.series-title');
    var t = tEl ? tEl.textContent.replace(/\s*\.\s*$/, '').trim() : 'Series';
    return window.SlitGallery.create(el, { mode: m, title: t, openAt: (typeof openAt === 'number' ? openAt : undefined) });
  }

  function arrive() {
    seriesEl.classList.remove('gx-arrive');
    void seriesEl.offsetWidth;                       /* restart the animation */
    seriesEl.classList.add('gx-arrive');
    setTimeout(function () { seriesEl.classList.remove('gx-arrive'); }, 750);
  }

  function setLayout(l, openAt) {
    if (l === 'strip') l = 'slits';                  /* legacy saved value */
    if ((l === 'slits' || l === 'scroll') && !canFancy) l = 'vertical';
    if (engine) { engine.destroy(); engine = null; }
    if (l === 'slits' || l === 'scroll') {
      engine = makeEngine(l, seriesEl, openAt);
      if (!engine) { canFancy = false; l = 'vertical'; }
    }
    seriesEl.setAttribute('data-layout', l);
    body.setAttribute('data-gallery-layout', l);
    if (l === 'grid' || l === 'vertical') { arrive(); window.scrollTo(0, 0); }
    var lbl = nav.querySelector('.gnav__lbl--layout');
    if (lbl) lbl.textContent = NICE[nextLayout(l)] || 'Grid';
    try { localStorage.setItem(KEY, l); } catch (e) {}
  }

  function applyLayout(l, openAt) {
    if (!seriesEl || swapping) return;
    if (engine) {
      /* fade the live stage out, then let the next layout arrive.
         Reset the page scroll now, while the stage still covers it. */
      if (l === 'grid' || l === 'vertical') window.scrollTo(0, 0);
      swapping = true;
      engine.leave(function () {
        swapping = false;
        setLayout(l, openAt);
      });
    } else {
      setLayout(l, openAt);
    }
  }

  if (seriesEl) {
    var saved = null; try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (saved === 'strip') saved = 'slits';
    if (saved === 'vertical' && canFancy) saved = 'scroll';
    var initial = canFancy
      ? (saved === 'grid' || saved === 'scroll' ? saved : 'slits')
      : (saved === 'grid' ? 'grid' : 'vertical');
    setLayout(initial);

    var layoutBtn = nav.querySelector('#gnavLayout');
    if (layoutBtn) layoutBtn.addEventListener('click', function () {
      applyLayout(nextLayout(seriesEl.getAttribute('data-layout')));
    });

    seriesEl.addEventListener('click', function (e) {
      if (seriesEl.getAttribute('data-layout') !== 'grid') return;
      var fig = e.target.closest('.frame'); if (!fig) return;
      if (canFancy) {
        var idx = Array.prototype.indexOf.call(seriesEl.querySelectorAll('.frame'), fig);
        applyLayout('slits', idx);
      } else {
        applyLayout('vertical');
        requestAnimationFrame(function () { fig.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      }
    });

    window.addEventListener('resize', function () {
      /* the engine handles its own re-measure; recreate only when the
         GL/DOM breakpoint is crossed so the right renderer is active */
      var d = isDesktop();
      if (d !== engineDesktop) {
        engineDesktop = d;
        var cur = seriesEl.getAttribute('data-layout');
        if (engine && (cur === 'slits' || cur === 'scroll')) {
          engine.destroy(); engine = null; setLayout(cur);
        }
      }
    });
  }

  /* ── (the old vertical filmstrip controller lived here; it has been
     replaced by the slit-strip engine in slits.js. The 'strip' saved
     preference is migrated to 'slits' above.) ── */
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

  /* parity with the rest of the site */
  var topNav = document.getElementById('nav');
  if (topNav) window.addEventListener('scroll', function () {
    if (window.scrollY > 8) topNav.classList.add('scrolled'); else topNav.classList.remove('scrolled');
  });
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
