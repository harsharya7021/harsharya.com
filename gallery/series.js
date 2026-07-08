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

  /* layout toggle (persisted).  Layouts: 'strip' (vertical pieced
     filmstrip w/ parallax + zoom, desktop opt-in pages), 'vertical'
     (calm column fallback), 'grid' (contact sheet). The pill swaps
     strip<->grid; off desktop / reduced-motion it's vertical<->grid. */
  var KEY = 'harsh-gallery-layout';
  var isDesktop = function () { return window.matchMedia('(min-width:821px)').matches; };
  var stripPage = !!(seriesEl && seriesEl.getAttribute('data-ribbon') === 'on'); // flag reused
  var canStrip = stripPage && !reduced && isDesktop();
  var strip = null;

  function applyLayout(l) {
    if (!seriesEl) return;
    if (l === 'strip' && !canStrip) l = 'vertical';
    if (l !== 'strip' && strip) { strip.destroy(); strip = null; }
    seriesEl.setAttribute('data-layout', l);
    body.setAttribute('data-gallery-layout', l);
    var lbl = nav.querySelector('.gnav__lbl--layout');
    if (lbl) lbl.textContent = (l === 'grid' ? (canStrip ? 'Strip' : 'Scroll') : 'Grid');
    if (l === 'strip' && !strip) strip = makeStrip(seriesEl);
    try { localStorage.setItem(KEY, l); } catch (e) {}
  }

  if (seriesEl) {
    var saved = null; try { saved = localStorage.getItem(KEY); } catch (e) {}
    var initial = (saved === 'grid') ? 'grid'
                : canStrip ? (saved === 'vertical' ? 'vertical' : 'strip')
                : 'vertical';
    applyLayout(initial);

    var layoutBtn = nav.querySelector('#gnavLayout');
    if (layoutBtn) layoutBtn.addEventListener('click', function () {
      var cur = seriesEl.getAttribute('data-layout');
      applyLayout(cur === 'grid' ? (canStrip ? 'strip' : 'vertical') : 'grid');
    });

    seriesEl.addEventListener('click', function (e) {
      if (seriesEl.getAttribute('data-layout') !== 'grid') return;
      var fig = e.target.closest('.frame'); if (!fig) return;
      applyLayout(canStrip ? 'strip' : 'vertical');
      requestAnimationFrame(function () { fig.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    });

    window.addEventListener('resize', function () {
      var now = stripPage && !reduced && isDesktop();
      if (now !== canStrip) {
        canStrip = now;
        var cur = seriesEl.getAttribute('data-layout');
        applyLayout(cur === 'grid' ? 'grid' : (canStrip ? 'strip' : 'vertical'));
      } else if (strip) { strip.measure(); }
    });
  }

  /* ── the strip controller ───────────────────────────────────
     A normal vertical scroll, but one rAF loop parallaxes each photo
     inside its frame (image taller than the frame) and scales/softens
     the frames as they leave centre — the surreal "pull back". Click a
     frame to zoom it to focus on a dark field (a FLIP animation from
     its place in the strip); click / Esc drops it back. Reversible. */
  function makeStrip(el) {
    var list = el.querySelector('.series-list');
    var frames = Array.prototype.slice.call(el.querySelectorAll('.frame'));
    if (!list || !frames.length) return null;
    el.classList.remove('reveal-on');
    frames.forEach(function (f) { var im = f.querySelector('img'); if (im) im.loading = 'eager'; });

    var hud = document.createElement('div'); hud.className = 'strip-hud';
    var bar = document.createElement('div'); bar.className = 'strip-hud__bar'; hud.appendChild(bar);
    var count = document.createElement('div'); count.className = 'strip-count';
    count.innerHTML = '<b>01</b><span>/ ' + pad(frames.length) + '</span>';
    document.body.appendChild(hud); document.body.appendChild(count);
    var countB = count.querySelector('b');

    var ticking = false;

    function render() {
      var vh = window.innerHeight, mid = vh / 2, nearest = 0, nd = 1e9;
      for (var i = 0; i < frames.length; i++) {
        var fr = frames[i], media = fr.querySelector('.frame-media'), img = fr.querySelector('img');
        if (!media || !img) continue;
        var r = media.getBoundingClientRect();
        var c = r.top + r.height / 2;
        var d = (c - mid) / vh;
        var cl = d < -1.1 ? -1.1 : d > 1.1 ? 1.1 : d;
        var ad = Math.abs(cl);
        img.style.transform = 'translate3d(0,' + (cl * -r.height * 0.13).toFixed(1) + 'px,0)';
        media.style.transform = 'scale(' + (1 - ad * 0.07).toFixed(3) + ')';
        media.style.filter = ad > 0.14 ? 'blur(' + (ad * 1.6).toFixed(2) + 'px)' : 'none';
        fr.style.opacity = (1 - ad * 0.3).toFixed(3);
        var ac = Math.abs(c - mid); if (ac < nd) { nd = ac; nearest = i; }
      }
      var lr = list.getBoundingClientRect();
      var total = list.scrollHeight - vh;
      bar.style.width = (total <= 0 ? 0 : Math.min(1, Math.max(0, -lr.top / total)) * 100) + '%';
      countB.textContent = pad(nearest + 1);
    }
    function onScroll() { if (ticking) return; ticking = true; requestAnimationFrame(function () { render(); ticking = false; }); }
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ── zoom to focus (FLIP) ── */
    var focus, fbox, fimg, fcap, focused = null;
    function buildFocus() {
      focus = document.createElement('div'); focus.className = 'strip-focus';
      fbox = document.createElement('div'); fbox.className = 'strip-focus__box';
      fimg = document.createElement('img');
      fcap = document.createElement('div'); fcap.className = 'strip-focus__cap';
      fbox.appendChild(fimg); focus.appendChild(fbox); focus.appendChild(fcap);
      document.body.appendChild(focus);
      focus.addEventListener('click', closeFocus);
    }
    function openFocus(fr) {
      if (focused) return;
      if (!focus) buildFocus();
      var media = fr.querySelector('.frame-media'), img = fr.querySelector('img');
      var r = media.getBoundingClientRect();
      focused = fr;
      fimg.src = img.currentSrc || img.src;
      var t = fr.querySelector('.frame-text'); fcap.textContent = t ? t.textContent : '';
      var ar = (img.naturalWidth || 3) / (img.naturalHeight || 2);
      var th = Math.min(window.innerHeight * 0.86, (window.innerWidth * 0.92) / ar);
      var tw = th * ar;
      var tx = (window.innerWidth - tw) / 2, ty = (window.innerHeight - th) / 2;
      fbox.style.left = tx + 'px'; fbox.style.top = ty + 'px';
      fbox.style.width = tw + 'px'; fbox.style.height = th + 'px';
      fbox.style.transformOrigin = 'top left';
      fbox.style.transition = 'none';
      fbox.style.transform = 'translate(' + (r.left - tx) + 'px,' + (r.top - ty) + 'px) scale(' + (r.width / tw) + ',' + (r.height / th) + ')';
      media.style.visibility = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      requestAnimationFrame(function () {
        focus.classList.add('on');
        fbox.style.transition = '';
        fbox.style.transform = 'none';
      });
    }
    function closeFocus() {
      if (!focused) return;
      var fr = focused, media = fr.querySelector('.frame-media');
      var r = media.getBoundingClientRect();
      var tx = parseFloat(fbox.style.left), ty = parseFloat(fbox.style.top),
          tw = parseFloat(fbox.style.width), th = parseFloat(fbox.style.height);
      fbox.style.transform = 'translate(' + (r.left - tx) + 'px,' + (r.top - ty) + 'px) scale(' + (r.width / tw) + ',' + (r.height / th) + ')';
      focus.classList.remove('on');
      var done = function () {
        media.style.visibility = '';
        document.documentElement.style.overflow = '';
        fbox.removeEventListener('transitionend', done);
        focused = null;
      };
      fbox.addEventListener('transitionend', done);
    }
    var clickH = function (e) { var fr = e.target.closest('.frame'); if (!fr) return; e.preventDefault(); openFocus(fr); };
    var keyH = function (e) { if (e.key === 'Escape') closeFocus(); };
    el.addEventListener('click', clickH);
    document.addEventListener('keydown', keyH);

    frames.forEach(function (f) { var im = f.querySelector('img'); if (im && !im.complete) im.addEventListener('load', render, { once: true }); });
    render();

    return {
      measure: render,
      destroy: function () {
        window.removeEventListener('scroll', onScroll);
        el.removeEventListener('click', clickH);
        document.removeEventListener('keydown', keyH);
        if (focused) { focused.querySelector('.frame-media').style.visibility = ''; focused = null; document.documentElement.style.overflow = ''; }
        frames.forEach(function (f) {
          var m = f.querySelector('.frame-media'), im = f.querySelector('img');
          if (m) { m.style.transform = ''; m.style.filter = ''; m.style.visibility = ''; }
          if (im) im.style.transform = ''; f.style.opacity = '';
        });
        hud.remove(); count.remove();
        if (focus) { focus.remove(); focus = null; }
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
