/* ===========================================================
   GLOBE — photos on the map, Apple-Photos style.
   A dotted land globe (Three.js points, baked lattice in
   globe-data.js) the visitor can spin and zoom. Photo pins are
   DOM buttons projected onto the sphere every frame:

   · world level — one pin per nation state (India, Malaysia)
   · click India — the camera flies in and the pin splits into
     its constituent states (Himachal, Rajasthan, Kerala)
   · click a state (or a single-series country) — off to that
     series page.

   Requires THREE (r128), gsap, window.GLOBE_LAND. Degrades by
   hiding itself (the series cards below remain).
   =========================================================== */
(function () {
  'use strict';
  var host = document.getElementById('gm');
  if (!host) return;
  function bail() { host.setAttribute('data-off', ''); }
  if (!window.THREE || !window.gsap || !window.GLOBE_LAND) return bail();
  var reduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ---------- the atlas ---------- */
  var WORLD = [
    {
      id: 'india', name: 'India', lat: 22.6, lon: 79.3,
      states: [
        { name: 'Himachal',  href: 'shimla.html',   lat: 31.10, lon: 77.17, count: 10, cover: '../assets/life/shimla/shimla-01.jpg' },
        { name: 'Rajasthan', href: 'jodhpur.html',  lat: 26.24, lon: 73.02, count: 7,  cover: '../assets/life/jodhpur/jodhpur-01.jpg' },
        { name: 'Kerala',    href: 'kerala.html',   lat: 8.74,  lon: 76.72, count: 6,  cover: '../assets/life/kerala/varkala-01.jpg' }
      ]
    },
    {
      id: 'malaysia', name: 'Malaysia', lat: 4.2, lon: 102.0,
      href: 'malaysia.html', count: 3, cover: '../assets/life/malaysia/malaysia-01.jpg',
      states: []
    }
  ];
  WORLD.forEach(function (c) {
    if (c.states.length) {
      c.count = c.states.reduce(function (s, x) { return s + x.count; }, 0);
      c.cover = c.states[0].cover;
    }
  });
  var TOTAL = WORLD.reduce(function (s, c) { return s + c.count; }, 0);

  /* ---------- three ---------- */
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch (e) { return bail(); }

  var canvas = renderer.domElement;
  canvas.className = 'gm-canvas';
  host.appendChild(canvas);

  var pinsEl = document.createElement('div'); pinsEl.className = 'gm-pins';
  var label = document.createElement('div'); label.className = 'gm-label';
  label.innerHTML = 'Photos by geography<em>' + WORLD.length + ' places · ' + TOTAL + ' frames</em>';
  var back = document.createElement('button'); back.type = 'button';
  back.className = 'gm-back'; back.textContent = '← world';
  var hint = document.createElement('div'); hint.className = 'gm-hint';
  hint.textContent = 'drag to spin · click a pin';
  host.appendChild(pinsEl); host.appendChild(label); host.appendChild(back); host.appendChild(hint);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 10);
  var group = new THREE.Group();
  group.rotation.order = 'XYZ';                    /* pitch after yaw */
  scene.add(group);

  /* body of the globe — occludes far-side dots, a shade under the canvas */
  var shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.99, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xefede6 })
  );
  group.add(shell);

  /* land dots */
  function vec(lat, lon, r) {
    var p = (lat * Math.PI) / 180, l = (lon * Math.PI) / 180;
    return new THREE.Vector3(
      r * Math.cos(p) * Math.sin(l),
      r * Math.sin(p),
      r * Math.cos(p) * Math.cos(l)
    );
  }
  var land = window.GLOBE_LAND, pos = new Float32Array(land.length / 2 * 3);
  for (var i = 0; i < land.length; i += 2) {
    var v = vec(land[i], land[i + 1], 1);
    pos[(i / 2) * 3] = v.x; pos[(i / 2) * 3 + 1] = v.y; pos[(i / 2) * 3 + 2] = v.z;
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  var dotTex = (function () {                       /* round sprite */
    var c = document.createElement('canvas'); c.width = c.height = 32;
    var x = c.getContext('2d');
    x.fillStyle = '#1a1a1a'; x.beginPath(); x.arc(16, 16, 14, 0, 6.2832); x.fill();
    var t = new THREE.CanvasTexture(c); return t;
  })();
  var dots = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.0135, map: dotTex, color: 0x211f19,
    transparent: true, alphaTest: 0.4, sizeAttenuation: true
  }));
  group.add(dots);

  /* ---------- state ---------- */
  var D_WORLD = 3.05, D_COUNTRY = 2.45;
  var BASE_PITCH = 0.32;                 /* the globe is firm on its axis:
                                            it spins about Y; vertical drag is
                                            damped and springs back to this */
  var st = { yaw: -1.3, pitch: BASE_PITCH, camZ: D_WORLD };  /* opens facing India */
  var velY = 0, velP = 0, dragging = false, dragMoved = 0;
  var level = 'world', flying = false, idleT = performance.now();
  var navving = false;

  camera.position.set(0, 0, st.camZ);

  /* ---------- pins ---------- */
  function makePin(d, cls) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'gm-pin ' + cls;
    b.setAttribute('aria-label', d.name + ' — ' + d.count + ' photos');
    b.innerHTML =
      '<span class="gm-pin__card" style="background-image:url(\'' + d.cover + '\')">' +
      '<span class="gm-pin__count">' + String(d.count).padStart(2, '0') + '</span></span>' +
      '<span class="gm-pin__name">' + d.name + '</span>';
    b.style.display = 'none';
    pinsEl.appendChild(b);
    return { el: b, data: d, v: vec(d.lat, d.lon, 1.0) };
  }
  var worldPins = WORLD.map(function (c) { return makePin(c, 'gm-pin--country'); });
  var statePins = {};
  WORLD.forEach(function (c) {
    statePins[c.id] = c.states.map(function (s) { return makePin(s, 'gm-pin--state'); });
  });
  function activePins() { return level === 'world' ? worldPins : statePins[level] || []; }

  function showPins(pins) {
    pins.forEach(function (p) { p.el.style.display = ''; });
    if (!reduced) {
      gsap.fromTo(pins.map(function (p) { return p.el.firstChild; }),
        { scale: 0.4, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)', stagger: 0.07,
          clearProps: 'transform,opacity' });   /* keep the inline cover image! */
    }
  }
  function hidePins(pins) { pins.forEach(function (p) { p.el.style.display = 'none'; }); }

  /* ---------- navigation ---------- */
  function norm(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function flyTo(lat, lon, dist, dur, cb) {
    flying = true; velY = velP = 0;
    var ty = st.yaw + norm(-(lon * Math.PI) / 180 - st.yaw);
    var tp = (lat * Math.PI) / 180;
    gsap.to(st, {
      yaw: ty, pitch: tp, camZ: dist,
      duration: reduced ? 0 : (dur || 1.15), ease: 'power3.inOut', overwrite: true,
      onComplete: function () { flying = false; if (cb) cb(); }
    });
  }
  /* match-cut hand-off: the pin's photograph expands to fill the
     viewport, we navigate underneath it, and the series page opens
     with the same image covering the screen before it recedes
     (series.js reads the sessionStorage key and takes it from there) */
  function travel(pinEl, data) {
    if (navving) return; navving = true;
    var card = pinEl.querySelector('.gm-pin__card');
    var r = card.getBoundingClientRect();
    var ov = document.createElement('div');
    ov.className = 'gm-travel';
    ov.style.backgroundImage = 'url(\'' + data.cover + '\')';
    ov.style.left = r.left + 'px'; ov.style.top = r.top + 'px';
    ov.style.width = r.width + 'px'; ov.style.height = r.height + 'px';
    document.body.appendChild(ov);
    try { sessionStorage.setItem('gm-cover', data.cover); } catch (e) {}
    gsap.to([pinsEl, hint, label, back], { opacity: 0, duration: 0.3, ease: 'power1.in' });
    gsap.to(ov, {
      left: 0, top: 0, width: window.innerWidth, height: window.innerHeight,
      duration: reduced ? 0 : 0.85, ease: 'expo.inOut',
      onComplete: function () { window.location.href = data.href; }
    });
  }
  function enterCountry(c) {
    hidePins(worldPins);
    level = c.id; host.classList.add('is-country');
    label.innerHTML = c.name + '<em>' + String(c.count).padStart(2, '0') + ' frames</em>';
    flyTo(c.lat, c.lon, D_COUNTRY, 1.15, function () { showPins(statePins[c.id]); });
  }
  function exitCountry() {
    if (level === 'world') return;
    hidePins(statePins[level]);
    level = 'world'; host.classList.remove('is-country');
    label.innerHTML = 'Photos by geography<em>' + WORLD.length + ' places · ' + TOTAL + ' frames</em>';
    gsap.to(st, { camZ: D_WORLD, pitch: BASE_PITCH, duration: reduced ? 0 : 0.9, ease: 'power3.inOut', overwrite: true });
    showPins(worldPins);
    idleT = performance.now();
  }

  worldPins.forEach(function (p) {
    p.el.addEventListener('click', function () {
      if (dragMoved > 6 || navving) return;
      var c = p.data;
      if (c.states.length) enterCountry(c);
      else flyTo(c.lat, c.lon, 2.6, 0.7, function () { travel(p.el, c); });
    });
  });
  WORLD.forEach(function (c) {
    statePins[c.id].forEach(function (p) {
      p.el.addEventListener('click', function () {
        if (dragMoved > 6 || navving) return;
        flyTo(p.data.lat, p.data.lon, 2.35, 0.55, function () { travel(p.el, p.data); });
      });
    });
  });
  back.addEventListener('click', exitCountry);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') exitCountry(); });

  /* ---------- drag / zoom ---------- */
  var px = 0, py = 0, pid = null;
  canvas.addEventListener('pointerdown', function (e) {
    pid = e.pointerId; px = e.clientX; py = e.clientY;
    dragging = true; dragMoved = 0; velY = velP = 0;
    canvas.classList.add('is-drag');
    try { canvas.setPointerCapture(pid); } catch (err) {}
  });
  window.addEventListener('pointermove', function (e) {
    if (!dragging || e.pointerId !== pid) return;
    var dx = e.clientX - px, dy = e.clientY - py;
    px = e.clientX; py = e.clientY;
    dragMoved = Math.max(dragMoved, Math.abs(dx), Math.abs(dy));
    var k = 0.0042 * (st.camZ / D_WORLD);
    st.yaw += dx * k;
    /* axis-firm: vertical drag gives, but only a little */
    st.pitch = Math.max(-0.9, Math.min(1.1, st.pitch + dy * k * 0.3));
    velY = dx * k; velP = 0;
    idleT = performance.now();
  });
  window.addEventListener('pointerup', function (e) {
    if (e.pointerId !== pid) return;
    dragging = false; pid = null;
    canvas.classList.remove('is-drag');
    setTimeout(function () { dragMoved = 0; }, 60);
  });
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    st.camZ = Math.max(1.85, Math.min(3.4, st.camZ + e.deltaY * 0.0016));
    if (level !== 'world' && st.camZ > 2.85) exitCountry();
    idleT = performance.now();
  }, { passive: false });

  /* ---------- loop ---------- */
  var W = 0, H = 0;
  function resize() {
    var r = host.getBoundingClientRect();
    W = Math.max(r.width, 1); H = Math.max(r.height, 1);
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  var vTmp = new THREE.Vector3();
  function tick(now) {
    requestAnimationFrame(tick);

    if (!dragging && !flying) {
      st.yaw += velY; velY *= 0.94;
      /* spring the axis back upright (world level only — a country view
         keeps the pitch the flight gave it) */
      if (level === 'world') st.pitch += (BASE_PITCH - st.pitch) * 0.07;
      if (!reduced && level === 'world' && now - idleT > 3800) st.yaw += 0.0011;
    }
    group.rotation.y = st.yaw;
    group.rotation.x = st.pitch;
    camera.position.z = st.camZ;
    renderer.render(scene, camera);

    group.updateMatrixWorld();
    var pins = activePins();
    for (var i = 0; i < pins.length; i++) {
      var p = pins[i];
      if (p.el.style.display === 'none') continue;
      vTmp.copy(p.v).applyMatrix4(group.matrixWorld);
      var facing = vTmp.z;                          /* camera sits on +z */
      vTmp.project(camera);
      var sx = (vTmp.x * 0.5 + 0.5) * W;
      var sy = (-vTmp.y * 0.5 + 0.5) * H;
      p.el.style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px) translate(-50%,-100%)';
      var vis = facing > 0.32 ? 1 : facing > 0.12 ? (facing - 0.12) / 0.2 : 0;
      p.el.style.opacity = vis.toFixed(2);
      p.el.style.pointerEvents = vis > 0.55 ? 'auto' : 'none';
    }
  }
  showPins(worldPins);
  requestAnimationFrame(tick);
  /* globe is live → it's the navigation now; retire the series-card grid
     (it stays as the fallback whenever the globe can't render) */
  document.body.classList.add('gm-live');
})();
