/* THE FILM RING — the site's additions to MWG 061 (/life/mwg-061.js stays the
   template). Asked for:
   1. Every title on the IMDb list comes round. The ring holds 15 posters at a
      time, as the template does; each poster faces the middle of the ring and
      the viewer stands on the ring, so the one moment a poster is out of sight
      is when it sweeps past the camera — that is when it takes the next title
      in line (/life/films.json). 638 titles, one every 1.3 s.
   2. Click (or Enter) a poster for its card: my review where there is one,
      otherwise the day I logged it. The ring slows while the card is open.
   Also: the ring only turns while it is on screen (so the line starts when
   someone arrives, and nothing spins unseen), and it stands still for
   prefers-reduced-motion. */
window.addEventListener('DOMContentLoaded', function () {
  var root = document.querySelector('.mwg_effect061');
  if (!root || !window.gsap) return;
  var container = root.querySelector('.container');
  var imgs = [].slice.call(root.querySelectorAll('img'));
  var N = imgs.length, angle = 360 / N;
  var spins = gsap.getTweensOf(container).filter(function (t) { return t.vars && t.vars.rotationY === 360; });
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var films = null, next = N, last = [], onScreen = false, cardOpen = false;
  var card = document.getElementById('frCard');

  function setRun() {
    var run = onScreen && !reduce;
    spins.forEach(function (t) { run ? t.resume() : t.pause(); t.timeScale(cardOpen ? 0.2 : 1); });
  }
  spins.forEach(function (t) { t.pause(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; setRun(); }, { threshold: 0.05 }).observe(root);
  } else { onScreen = true; setRun(); }

  function poster(f) { return '/life/films/posters/' + f.i + '.webp'; }
  function label(f) { return f.t + (f.y ? ' (' + f.y + ')' : '') + ' — show details'; }
  function show(img, k) {
    var f = films[k % films.length];
    img.dataset.k = k % films.length;
    img.src = poster(f);
    img.setAttribute('aria-label', label(f));
  }
  function preload(k) { if (films) { var p = new Image(); p.src = poster(films[k % films.length]); } }

  fetch('/life/films.json').then(function (r) { return r.json(); }).then(function (list) {
    films = list;
    imgs.forEach(function (img) { var f = films[+img.dataset.k]; if (f) img.setAttribute('aria-label', label(f)); });
    preload(next); preload(next + 1);
  });

  // a poster passes the camera at 180° from its starting place on the ring
  gsap.ticker.add(function () {
    if (!films) return;
    var rot = gsap.getProperty(container, 'rotationY');
    for (var i = 0; i < N; i++) {
      var d = (((angle * i + rot - 180) % 360) + 360) % 360;
      if (last[i] !== undefined && d < last[i] - 180) { show(imgs[i], next++); preload(next + 1); }
      last[i] = d;
    }
  });

  // ── the card ──
  if (!card) return;
  var titleEl = card.querySelector('.fr-title'), metaEl = card.querySelector('.fr-meta'),
      qEl = card.querySelector('.fr-q'), rateEl = card.querySelector('.fr-rate'), link = card.querySelector('.fr-imdb'),
      xBtn = card.querySelector('.fr-x'), opener = null;
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function day(iso) { var p = iso.split('-'); return +p[2] + ' ' + months[+p[1] - 1] + ' ' + p[0]; }
  function openCard(img) {
    if (!films) return;
    var f = films[+img.dataset.k]; if (!f) return;
    titleEl.textContent = f.t;
    metaEl.textContent = [f.d, f.y, f.ty].filter(Boolean).join(' · ');
    rateEl.textContent = f.r ? 'Rated ' + f.r + '/10' : '';
    rateEl.hidden = !f.r;
    if (f.q) { qEl.textContent = f.q; qEl.classList.remove('is-date'); }
    else { qEl.textContent = 'Logged on ' + day(f.a) + '.'; qEl.classList.add('is-date'); }
    link.href = 'https://www.imdb.com/title/' + f.i + '/';
    opener = img; card.hidden = false; cardOpen = true; setRun();
    requestAnimationFrame(function () { card.classList.add('is-in'); });
    xBtn.focus({ preventScroll: true });
  }
  function closeCard() {
    if (card.hidden) return;
    card.classList.remove('is-in'); card.hidden = true; cardOpen = false; setRun();
    if (opener) opener.focus({ preventScroll: true });
  }
  imgs.forEach(function (img) {
    img.setAttribute('role', 'button'); img.tabIndex = 0;
    img.addEventListener('click', function (e) { e.stopPropagation(); openCard(img); });
    img.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(img); } });
  });
  xBtn.addEventListener('click', closeCard);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCard(); });
  document.addEventListener('click', function (e) { if (!card.hidden && !card.contains(e.target)) closeCard(); });
});
