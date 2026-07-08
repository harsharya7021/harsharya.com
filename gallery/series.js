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

  /* layout toggle (persisted).  Layouts: 'ribbon' (horizontal filmstrip,
     desktop opt-in pages only), 'vertical' (calm column), 'grid' (contact
     sheet).  On non-ribbon pages / mobile / reduced-motion the pill just
     swaps vertical<->grid exactly as before. */
  var KEY = 'harsh-gallery-layout';
  var isDesktop = function () { return window.matchMedia('(min-width:821px)').matches; };
  var ribbonPage = !!(seriesEl && seriesEl.getAttribute('data-ribbon') === 'on');
  var canRibbon = ribbonPage && !reduced && isDesktop();
  var ribbon = null;

  function applyLayout(l) {
    if (!seriesEl) return;
    if (l === 'ribbon' && !canRibbon) l = 'vertical';     // no ribbon off desktop
    if (l !== 'ribbon' && ribbon) { ribbon.destroy(); ribbon = null; }
    seriesEl.setAttribute('data-layout', l);
    body.setAttribute('data-gallery-layout', l);
    var lbl = nav.querySelector('.gnav__lbl--layout');
    if (lbl) lbl.textContent = (l === 'grid' ? (canRibbon ? 'Ribbon' : 'Scroll') : 'Grid');
    if (l === 'ribbon' && !ribbon) ribbon = makeRibbon(seriesEl);
    try { localStorage.setItem(KEY, l); } catch (e) {}
  }

  if (seriesEl) {
    var saved = null; try { saved = localStorage.getItem(KEY); } catch (e) {}
    var initial = (saved === 'grid') ? 'grid'
                : canRibbon ? (saved === 'vertical' ? 'vertical' : 'ribbon')
                : 'vertical';
    applyLayout(initial);

    var layoutBtn = nav.querySelector('#gnavLayout');
    if (layoutBtn) layoutBtn.addEventListener('click', function () {
      var cur = seriesEl.getAttribute('data-layout');
      applyLayout(cur === 'grid' ? (canRibbon ? 'ribbon' : 'vertical') : 'grid');
    });

    seriesEl.addEventListener('click', function (e) {
      if (seriesEl.getAttribute('data-layout') !== 'grid') return;
      var fig = e.target.closest('.frame'); if (!fig) return;
      applyLayout(canRibbon ? 'ribbon' : 'vertical');
      requestAnimationFrame(function () { fig.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    });

    window.addEventListener('resize', function () {
      var now = ribbonPage && !reduced && isDesktop();
      if (now !== canRibbon) {
        canRibbon = now;
        var cur = seriesEl.getAttribute('data-layout');
        applyLayout(cur === 'grid' ? 'grid' : (canRibbon ? 'ribbon' : 'vertical'));
      } else if (ribbon) { ribbon.measure(); }
    });
  }

  /* ── the ribbon controller ──────────────────────────────────
     Wraps the existing .series-list in a sticky stage, force-loads
     the prints (they live in horizontal overflow), and runs one rAF
     loop: vertical scroll progress -> track translateX, and each
     print rotates/scales by its distance from centre (the curve).
     Fully reversible; destroy() puts everything back for grid. */
  function makeRibbon(el) {
    var list = el.querySelector('.series-list');
    var frames = Array.prototype.slice.call(el.querySelectorAll('.frame'));
    if (!list || !frames.length) return null;
    el.classList.remove('reveal-on');                 // ribbon owns visibility
    frames.forEach(function (f) { var im = f.querySelector('img'); if (im) { im.loading = 'eager'; if (im.getAttribute('loading') !== 'eager') im.setAttribute('loading', 'eager'); } });

    var stage = document.createElement('div');
    stage.className = 'ribbon-stage';
    el.insertBefore(stage, list); stage.appendChild(list);

    var hud = document.createElement('div'); hud.className = 'ribbon-hud';
    var bar = document.createElement('div'); bar.className = 'ribbon-hud__bar'; hud.appendChild(bar);
    var count = document.createElement('div'); count.className = 'ribbon-count';
    count.innerHTML = '<b>01</b><span>/ ' + pad(frames.length) + '</span>';
    var hint = document.createElement('div'); hint.className = 'ribbon-hint'; hint.textContent = 'Scroll →';
    document.body.appendChild(hud); document.body.appendChild(count); document.body.appendChild(hint);
    var countB = count.querySelector('b');

    var travel = 0, ticking = false;

    function measure() {
      var vw = window.innerWidth;
      var firstW = frames[0].offsetWidth || 0;
      var lastW = frames[frames.length - 1].offsetWidth || 0;
      list.style.paddingLeft = Math.max(0, (vw - firstW) / 2) + 'px';
      list.style.paddingRight = Math.max(0, (vw - lastW) / 2) + 'px';
      travel = Math.max(0, list.scrollWidth - vw);
      el.style.height = (travel * 0.92 + window.innerHeight) + 'px';   // scroll distance for the pin
      render();
    }
    function prog() {
      var r = el.getBoundingClientRect();
      var d = el.offsetHeight - window.innerHeight;
      return d <= 0 ? 0 : Math.min(1, Math.max(0, -r.top / d));
    }
    function render() {
      var p = prog();
      var x = -p * travel;
      list.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      var cx = window.innerWidth / 2;
      var reach = window.innerWidth * 0.6;
      for (var i = 0; i < frames.length; i++) {
        var fr = frames[i];
        var fcx = fr.offsetLeft + fr.offsetWidth / 2 + x;      // on-screen centre
        var d = (fcx - cx) / reach;
        if (d > 1.35) d = 1.35; else if (d < -1.35) d = -1.35;
        var ad = Math.abs(d);
        fr.style.transform =
          'translateZ(' + (-ad * 130).toFixed(1) + 'px) rotateY(' + (-d * 22).toFixed(2) + 'deg) scale(' + (1 - ad * 0.11).toFixed(3) + ')';
      }
      bar.style.width = (p * 100) + '%';
      countB.textContent = pad(Math.round(p * (frames.length - 1)) + 1);
    }
    function onScroll() {
      if (window.scrollY > 4) document.body.setAttribute('data-ribbon-scrolled', '1');
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { render(); ticking = false; });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    frames.forEach(function (f) { var im = f.querySelector('img'); if (im && !im.complete) im.addEventListener('load', measure, { once: true }); });
    measure();

    return {
      measure: measure,
      destroy: function () {
        window.removeEventListener('scroll', onScroll);
        el.insertBefore(list, stage); stage.remove();
        el.style.height = '';
        list.style.transform = ''; list.style.paddingLeft = ''; list.style.paddingRight = '';
        frames.forEach(function (f) { f.style.transform = ''; });
        hud.remove(); count.remove(); hint.remove();
        document.body.removeAttribute('data-ribbon-scrolled');
      }
    };
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

  /* parity with the rest of the site */
  var topNav = document.getElementById('nav');
  if (topNav) window.addEventListener('scroll', function () {
    if (window.scrollY > 8) topNav.classList.add('scrolled'); else topNav.classList.remove('scrolled');
  });
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
