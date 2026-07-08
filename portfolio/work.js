/* Work — inline lightbox for the portfolio folders.
   Any element with [data-embed] opens its src in an on-site overlay
   (iframe). [data-embed-mode="video"] uses a 16:9 frame; anything
   else uses a large scrollable box (launch films, the collage, PDFs).
   Nothing navigates away. */
(function () {
  var box, iframe, cap;

  function ensure() {
    if (box) return;
    box = document.createElement('div');
    box.className = 'wk-lb';
    box.innerHTML =
      '<div class="wk-lb__frame">' +
        '<span class="wk-lb__cap"></span>' +
        '<button class="wk-lb__close" type="button" aria-label="Close">Close ✕</button>' +
        '<iframe allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen title="Embedded piece" loading="lazy"></iframe>' +
      '</div>';
    document.body.appendChild(box);
    iframe = box.querySelector('iframe');
    cap = box.querySelector('.wk-lb__cap');
    box.querySelector('.wk-lb__close').addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  function open(src, mode, label) {
    ensure();
    box.classList.toggle('wk-lb--video', mode === 'video');
    cap.textContent = label || '';
    iframe.src = src;
    box.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
  }
  function close() {
    if (!box) return;
    box.classList.remove('is-open');
    iframe.src = 'about:blank';
    document.documentElement.style.overflow = '';
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-embed]');
    if (!t) return;
    e.preventDefault();
    open(t.getAttribute('data-embed'), t.getAttribute('data-embed-mode') || 'page', t.getAttribute('data-embed-label') || '');
  });

  /* portfolio hub: rotate the photos peeking out of each folder (Life-style) */
  document.querySelectorAll('.peek-front').forEach(function (g) {
    var imgs = g.querySelectorAll('img');
    if (imgs.length < 2) return;
    var i = 0; imgs[0].classList.add('active');
    setInterval(function () {
      imgs[i].classList.remove('active');
      i = (i + 1) % imgs.length;
      imgs[i].classList.add('active');
    }, 3500);
  });

  /* site parity: year + nav shadow on scroll */
  var y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
  var nav = document.getElementById('nav');
  if (nav) window.addEventListener('scroll', function () {
    if (window.scrollY > 8) nav.classList.add('scrolled'); else nav.classList.remove('scrolled');
  }, { passive: true });
})();
