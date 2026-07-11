/* ===========================================================
   SLITS — Aikawa-style WebGL gallery engine. Two modes:

   · 'slits'  — every photo a thin vertical sliver in one
                horizontal draggable strip; hover widens, click
                FLIP-expands to a dark field.
   · 'scroll' — big centred photographs in one vertical column,
                virtual scroll with lerped glide; click zooms.

   The DOM is the source of truth: placeholder elements carry
   the geometry (GSAP animates them), and a WebGL layer reads
   their live rects every frame to paint the photos with
   cover-fit UVs, velocity wobble, RGB drift and a ripple pulse
   on zoom. No WebGL / small screens → the same DOM shows plain
   <img>s: identical interactions minus distortion.

   window.SlitGallery.create(seriesEl, { mode, title, openAt })
   → { open(i), measure(), leave(cb), destroy() }
   =========================================================== */
(function () {
  'use strict';

  /* ---------- utils ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function pad(n) { return String(n).padStart(2, '0'); }
  var GL_OK = (function () {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  })();

  /* ---------- shaders ---------- */
  var VERT = [
    'precision mediump float;',
    'attribute vec2 aPos;',
    'uniform vec2  uRes;',
    'uniform vec4  uRect;',
    'uniform float uVel;',
    'uniform float uAxis;',                  // 0 = horizontal strip, 1 = vertical column
    'uniform float uSeed;',
    'uniform float uTime;',
    'varying vec2  vUv;',
    'void main(){',
    '  vUv = aPos;',
    '  vec2 p = uRect.xy + aPos * uRect.zw;',
    /* Deformation is driven by velocity alone, with spatial phase —
       nothing oscillates over time. Still = perfectly crisp;
       motion = the image bends into it like dragged cloth. */
    '  float v = clamp(uVel, -34.0, 34.0);',
    /* horizontal strip: slats lean + bow into the motion */
    '  p.x += (1.0 - uAxis) * ((aPos.y - 0.5) * 0.42 + sin(3.14159 * aPos.y) * 0.30) * v;',
    /* vertical column: the photo bows across its width (centre lags)
       and breathes slightly along the scroll */
    '  p.y += uAxis * sin(3.14159 * aPos.x) * v * 0.6;',
    '  p.y += uAxis * (aPos.y - 0.5) * abs(v) * 0.22;',
    '  vec2 clip = (p / uRes) * 2.0 - 1.0;',
    '  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTex;',
    'uniform vec2  uImg;',
    'uniform vec4  uRect;',
    'uniform float uAlpha, uDim, uLoad, uVel, uBulge, uTime, uAxis;',
    'uniform vec3  uColor;',
    'uniform vec3  uCanvas;',
    'void main(){',
    '  vec2 uv = vUv;',
    '  if (uBulge > 0.001) {',
    '    vec2 c = uv - 0.5; float l = length(c);',
    '    uv += c * sin(l * 11.0 - uTime * 6.5) * uBulge * 0.075;',
    '    uv -= c * uBulge * 0.10;',
    '  }',
    '  float ra = uRect.z / max(uRect.w, 1.0);',
    '  float ia = uImg.x / max(uImg.y, 1.0);',
    '  vec2 s = (ra < ia) ? vec2(ra / ia, 1.0) : vec2(1.0, ia / ra);',
    '  vec2 tuv = (uv - 0.5) * s + 0.5;',
    /* refraction ridges: silent at reading speed, blossom on hard flicks */
    '  float cv = clamp(uVel, -34.0, 34.0);',
    '  float g = smoothstep(4.0, 32.0, abs(cv));',
    '  tuv.y += uAxis * sin(vUv.y * 15.7) * cv * 0.0007 * g;',
    '  tuv.x += (1.0 - uAxis) * sin(vUv.x * 9.4) * cv * 0.0006 * g;',
    '  float sh = cv * 0.00012 * g;',
    '  vec3 col;',
    '  col.r = texture2D(uTex, tuv + vec2(sh * (1.0 - uAxis), sh * uAxis)).r;',
    '  col.g = texture2D(uTex, tuv).g;',
    '  col.b = texture2D(uTex, tuv - vec2(sh * (1.0 - uAxis), sh * uAxis)).b;',
    '  col = mix(uColor, col, uLoad);',
    '  col = mix(col, uCanvas, uDim * 0.82);',
    '  gl_FragColor = vec4(col * uAlpha, uAlpha);',
    '}'
  ].join('\n');

  /* ---------- minimal GL renderer (subdivided quad) ---------- */
  function Renderer(canvas) {
    var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true })
          || canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: true });
    if (!gl) return null;

    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('slits shader:', gl.getShaderInfoLog(s)); return null;
      }
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    var SX = 32, SY = 8, verts = [], idx = [];
    for (var y = 0; y <= SY; y++) for (var x = 0; x <= SX; x++) verts.push(x / SX, y / SY);
    for (var r = 0; r < SY; r++) for (var c = 0; c < SX; c++) {
      var a = r * (SX + 1) + c, b = a + 1, d = a + SX + 1, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
    var vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    var ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    var nIdx = idx.length;

    var aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var U = {};
    ['uRes', 'uRect', 'uVel', 'uAxis', 'uSeed', 'uTime', 'uTex', 'uImg', 'uAlpha',
     'uDim', 'uLoad', 'uBulge', 'uColor', 'uCanvas'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n);
    });

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    var cw = 0, ch = 0;
    return {
      resize: function (w, h, dpr) {
        cw = w; ch = h;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
      },
      texture: function (source) {
        var t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        return t;
      },
      begin: function (time, axis, canvasCol) {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(U.uRes, cw, ch);
        gl.uniform1f(U.uTime, time);
        gl.uniform1f(U.uAxis, axis);
        gl.uniform3fv(U.uCanvas, canvasCol);
      },
      draw: function (p, rect, vel) {
        gl.uniform4f(U.uRect, rect.left, rect.top, rect.width, rect.height);
        gl.uniform1f(U.uVel, vel * p.velMul);
        gl.uniform1f(U.uSeed, p.seed);
        gl.uniform1f(U.uAlpha, p.alpha);
        gl.uniform1f(U.uDim, p.dim);
        gl.uniform1f(U.uLoad, p.tex ? p.load : 0);
        gl.uniform1f(U.uBulge, p.bulge);
        gl.uniform2f(U.uImg, p.natW || 4, p.natH || 3);
        gl.uniform3fv(U.uColor, p.color);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, p.tex || this._blank || (this._blank = this.texture(document.createElement('canvas'))));
        gl.uniform1i(U.uTex, 0);
        gl.drawElements(gl.TRIANGLES, nIdx, gl.UNSIGNED_SHORT, 0);
      },
      dispose: function () {
        var ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      }
    };
  }

  /* ---------- engine ---------- */
  function create(seriesEl, opts) {
    opts = opts || {};
    var gsap = window.gsap;
    if (!gsap) return null;

    var MODE = (opts.mode === 'scroll') ? 'scroll' : 'slits';
    var AXIS = (MODE === 'scroll') ? 1 : 0;

    var frames = Array.prototype.slice.call(seriesEl.querySelectorAll('.frame'));
    var data = frames.map(function (f, i) {
      var img = f.querySelector('img');
      return { src: img ? img.getAttribute('src') : '', alt: img ? img.alt : '', no: pad(i + 1) };
    });
    var n = data.length;
    if (!n) return null;

    var isTouch = window.matchMedia('(hover:none)').matches;
    /* file:// taints canvas textures in Chrome — DOM fallback there */
    var useGL = GL_OK && !opts.forceDom && location.protocol !== 'file:' &&
                window.matchMedia('(min-width:821px)').matches;

    /* ----- build DOM ----- */
    var stage = document.createElement('div');
    stage.className = 'sg-stage sg-stage--' + MODE;
    stage.setAttribute('role', 'region');
    stage.setAttribute('aria-label', (opts.title || 'Series') + ' — photo ' + (MODE === 'scroll' ? 'column' : 'strip'));
    if (useGL) stage.setAttribute('data-gl', '');

    var track = document.createElement('div'); track.className = 'sg-track';
    var items = data.map(function (d, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'sg-item'; b.dataset.i = i;
      b.setAttribute('aria-label', 'Open photo ' + d.no + (d.alt ? ' — ' + d.alt : ''));
      var im = document.createElement('img');
      im.className = 'sg-img'; im.alt = ''; im.decoding = 'async'; im.src = d.src;
      b.appendChild(im);
      track.appendChild(b);
      return b;
    });
    stage.appendChild(track);

    var zoombg = document.createElement('div'); zoombg.className = 'sg-zoombg'; stage.appendChild(zoombg);

    var canvas = null, R = null;
    if (useGL) {
      canvas = document.createElement('canvas'); canvas.className = 'sg-canvas';
      stage.appendChild(canvas);
      R = Renderer(canvas);
      if (!R) { useGL = false; stage.removeAttribute('data-gl'); canvas.remove(); canvas = null; }
    }

    function ghost() {
      var g = document.createElement('div'); g.className = 'sg-ghost';
      var im = document.createElement('img'); im.alt = ''; g.appendChild(im);
      stage.appendChild(g); return g;
    }
    var ghostA = ghost(), ghostB = ghost();

    var title = document.createElement('div'); title.className = 'sg-title';
    title.innerHTML = (opts.title || '') + '<em>' + pad(n) + ' frames</em>';
    var count = document.createElement('div'); count.className = 'sg-count';
    count.innerHTML = '<b>01</b><span>/ ' + pad(n) + '</span>';
    var countB = count.querySelector('b');
    var hint = document.createElement('div'); hint.className = 'sg-hint';
    var progress = document.createElement('div'); progress.className = 'sg-progress';
    var progressI = document.createElement('i'); progress.appendChild(progressI);
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button'; closeBtn.className = 'sg-close'; closeBtn.textContent = '✕ close';
    [title, count, hint, progress, closeBtn].forEach(function (e) { stage.appendChild(e); });

    var cursor = document.createElement('div'); cursor.className = 'sg-cursor';
    var cursorS = document.createElement('span'); cursor.appendChild(cursorS);

    seriesEl.appendChild(stage);
    document.body.appendChild(cursor);

    /* ----- state ----- */
    var vw = 0, vh = 0, baseW = 0, baseH = 0, gap = 0;
    var minP = 0, maxP = 0, lockedP = null;         /* travel bounds along the axis */
    var pos = 0, targetP = 0, fling = 0, vel = 0, prevPos = 0;
    var mode = 'strip';                              /* strip | zoom (interaction state) */
    var cur = 0, busy = false, dead = false, leaving = false;
    var hot = -1, dragging = false, dragMoved = 0;
    var wheelAcc = 0, wheelT = 0, userMoved = false, lastInput = 0;
    var sizes = [];                                  /* scroll mode: per-item {w,h} */
    var introT = null, raf = 0, t0 = performance.now();
    var CANVAS_COL = [0.957, 0.953, 0.937];

    var planes = data.map(function (d, i) {
      return {
        el: items[i], img: items[i].querySelector('img'),
        tex: null, natW: 4, natH: 3,
        seed: Math.random(),
        alpha: 1, dim: 0, load: 0, bulge: 0, velMul: 1,
        color: [0.914, 0.902, 0.875]
      };
    });

    /* textures + average colour from the same <img> elements */
    planes.forEach(function (p, i) {
      var im = p.img;
      function ready() {
        p.natW = im.naturalWidth || 4; p.natH = im.naturalHeight || 3;
        try {
          var c = document.createElement('canvas'); c.width = c.height = 2;
          var cx = c.getContext('2d', { willReadFrequently: true });
          cx.drawImage(im, 0, 0, 2, 2);
          var px = cx.getImageData(0, 0, 1, 1).data;
          p.color = [px[0] / 255, px[1] / 255, px[2] / 255];
        } catch (e) { /* fine */ }
        if (R) {
          var src = im, MAX = 2048;
          if (Math.max(p.natW, p.natH) > MAX) {
            var k = MAX / Math.max(p.natW, p.natH);
            var oc = document.createElement('canvas');
            oc.width = Math.round(p.natW * k); oc.height = Math.round(p.natH * k);
            oc.getContext('2d').drawImage(im, 0, 0, oc.width, oc.height);
            src = oc;
          }
          try {
            p.tex = R.texture(src);
            gsap.to(p, { load: 1, duration: 0.9, ease: 'power2.out', delay: i * 0.03 });
          } catch (err) { /* tainted canvas etc. */ }
        } else {
          p.load = 1;
        }
        if (MODE === 'scroll') queueMeasure();       /* aspect now known */
      }
      if (im.complete && im.naturalWidth) ready();
      else im.addEventListener('load', ready, { once: true });
    });

    /* ----- layout ----- */
    var measureQ = 0;
    function queueMeasure() {
      if (measureQ) return;
      measureQ = requestAnimationFrame(function () { measureQ = 0; measure(); });
    }

    function itemCenter(k) {
      /* centre of item k along the travel axis, in track coords */
      if (MODE === 'slits') return k * (baseW + gap) + baseW / 2;
      var c = 0;
      for (var i = 0; i < k; i++) c += sizes[i].h + gap;
      return c + sizes[k].h / 2;
    }

    function measure() {
      vw = window.innerWidth; vh = window.innerHeight;

      if (MODE === 'slits') {
        gap = clamp(vw * 0.011, 9, 16);
        baseW = clamp((vw * 0.62 - (n - 1) * gap) / n, 56, 110);
        baseH = clamp(vh * 0.52, 240, 560);
        items.forEach(function (b, i) {
          gsap.set(b, {
            width: (i === hot ? baseW * 1.55 : baseW), height: baseH,
            marginRight: i === n - 1 ? 0 : gap, marginBottom: 0
          });
        });
        var trackW = n * baseW + (n - 1) * gap + (hot > -1 ? baseW * 0.55 : 0);
        var edge = Math.max(vw * 0.07, 40);
        if (trackW <= vw - edge * 2) { lockedP = (vw - trackW) / 2; minP = maxP = lockedP; }
        else { lockedP = null; maxP = edge; minP = vw - trackW - edge; }
      } else {
        gap = Math.max(vh * 0.085, 56);
        sizes = planes.map(function (p) {
          var ar = (p.natW || 3) / (p.natH || 2);
          var w = Math.min(vw * 0.56, 1080), h = w / ar;
          var maxH = vh * 0.84;
          if (h > maxH) { h = maxH; w = h * ar; }
          return { w: w, h: h };
        });
        items.forEach(function (b, i) {
          gsap.set(b, {
            width: sizes[i].w, height: sizes[i].h,
            marginBottom: i === n - 1 ? 0 : gap, marginRight: 0
          });
        });
        lockedP = null;
        maxP = vh / 2 - itemCenter(0);               /* first photo centred */
        minP = vh / 2 - itemCenter(n - 1);           /* last photo centred  */
        if (minP > maxP) { lockedP = (minP + maxP) / 2; minP = maxP = lockedP; }
      }

      targetP = clamp(targetP, minP - 1, maxP + 1);
      if (lockedP !== null) targetP = lockedP;
      /* until the visitor scrolls, keep the first photo pinned centred
         while late-arriving aspect ratios reshuffle the column */
      else if (!userMoved && mode === 'strip') targetP = maxP;

      hint.textContent = (mode === 'zoom') ? '' :
        MODE === 'scroll'
          ? (isTouch ? 'swipe · tap to zoom' : 'scroll · click to zoom')
          : lockedP !== null
            ? (isTouch ? 'tap to zoom' : 'click to zoom')
            : (isTouch ? 'swipe · tap to zoom' : 'drag · scroll · click to zoom');

      if (R) R.resize(vw, vh, Math.min(window.devicePixelRatio || 1, 2));
      if (mode === 'zoom') fitGhost(activeGhost, cur, true);
    }

    function applyTrack() {
      if (MODE === 'slits') gsap.set(track, { x: pos, y: 0 });
      else gsap.set(track, { x: 0, y: pos });
    }

    /* ----- intro ----- */
    var introDone = false, pendingOpen = (typeof opts.openAt === 'number') ? opts.openAt : -1;
    function intro() {
      measure();
      /* start with the first photo centred (or a requested one) */
      pos = targetP = (lockedP !== null) ? lockedP
        : (typeof opts.startAt === 'number' && MODE === 'scroll')
          ? clamp(vh / 2 - itemCenter(opts.startAt), minP, maxP)
          : maxP;
      prevPos = pos;
      applyTrack();
      gsap.set(stage, { autoAlpha: 0 });
      introT = gsap.timeline({
        onComplete: function () {
          introDone = true;
          if (pendingOpen > -1) { var k = pendingOpen; pendingOpen = -1; open(k); }
        }
      });
      introT.to(stage, { autoAlpha: 1, duration: 0.35, ease: 'power1.out' }, 0);
      introT.from(items, {
        yPercent: MODE === 'slits' ? 130 : 16,
        opacity: MODE === 'slits' ? 1 : 0.001,
        duration: MODE === 'slits' ? 1.1 : 0.9,
        ease: 'power4.out',
        stagger: { each: MODE === 'slits' ? 0.032 : 0.08 },
        clearProps: 'opacity'
      }, 0.08);
      introT.from([title, count, hint, progress], { opacity: 0, duration: 0.6, ease: 'power2.out' }, 0.55);
    }

    /* ----- zoom (shared by both modes) ----- */
    var activeGhost = ghostA;
    function fitRect(i) {
      var p = planes[i], ar = (p.natW || 4) / (p.natH || 3);
      var th = Math.min(vh * 0.82, (vw * 0.9) / ar);
      var tw = th * ar;
      return { left: (vw - tw) / 2, top: (vh - th) / 2, width: tw, height: th };
    }
    function setGhostRect(g, r) { gsap.set(g, { left: r.left, top: r.top, width: r.width, height: r.height }); }
    function fitGhost(g, i, snap) {
      var r = fitRect(i);
      if (snap) setGhostRect(g, r);
      else gsap.to(g, { left: r.left, top: r.top, width: r.width, height: r.height, duration: 0.9, ease: 'expo.inOut' });
    }
    function ghostImg(g, i) { g.querySelector('img').src = data[i].src; }

    function open(i) {
      if (busy || mode === 'zoom' || dead || leaving) return;
      if (!introDone) { pendingOpen = i; return; }
      busy = true; mode = 'zoom'; cur = i;
      stage.classList.add('is-zoom');
      hot = -1; stage.classList.remove('is-hovering');
      fling = 0;
      hint.textContent = '';

      var r = items[i].getBoundingClientRect();
      activeGhost = ghostA;
      ghostImg(ghostA, i);
      setGhostRect(ghostA, r);
      ghostA.classList.add('on');
      planes[i].el = ghostA; planes[i].dim = 0;

      planes.forEach(function (p, k) {
        if (k === i) return;
        gsap.to(p, { alpha: 0, duration: 0.5, ease: 'power2.in', delay: Math.abs(k - i) * 0.028 });
      });
      if (!useGL) gsap.to(track, { opacity: 0, duration: 0.5, ease: 'power2.in' });

      gsap.fromTo(planes[i], { bulge: 0 }, {
        bulge: 0.65, duration: 0.46, ease: 'sine.inOut', yoyo: true, repeat: 1
      });
      fitGhost(ghostA, i);
      countB.textContent = data[i].no;
      gsap.delayedCall(0.95, function () { busy = false; });
      closeBtn.focus({ preventScroll: true });
    }

    function step(dir) {
      if (busy || mode !== 'zoom' || dead || leaving) return;
      busy = true;
      var j = (cur + dir + n) % n;
      var out = activeGhost, inn = (activeGhost === ghostA) ? ghostB : ghostA;

      ghostImg(inn, j);
      var rIn = fitRect(j);
      setGhostRect(inn, { left: rIn.left + dir * vw * 0.55, top: rIn.top, width: rIn.width, height: rIn.height });
      inn.classList.add('on');
      planes[j].el = inn; planes[j].dim = 0; planes[j].alpha = 0;

      gsap.to(planes[j], { alpha: 1, duration: 0.5, ease: 'power2.out' });
      gsap.to(inn, { left: rIn.left, duration: 0.85, ease: 'expo.out' });
      gsap.fromTo(planes[j], { bulge: 0.5 }, { bulge: 0, duration: 0.8, ease: 'power2.out' });

      var pOut = planes[cur];
      gsap.to(out, {
        left: parseFloat(out.style.left) - dir * vw * 0.55, duration: 0.7, ease: 'expo.in',
        onComplete: function () { out.classList.remove('on'); pOut.el = items[planes.indexOf(pOut)]; }
      });
      gsap.to(pOut, { alpha: 0, duration: 0.55, ease: 'power2.in' });

      cur = j; activeGhost = inn;
      countB.textContent = data[j].no;
      gsap.delayedCall(0.8, function () { busy = false; });
    }

    function close() {
      if (busy || mode !== 'zoom' || dead || leaving) return;
      busy = true;
      stage.classList.remove('is-zoom');
      var i = cur, g = activeGhost;
      /* bring the photo's spot into travel range so it lands on-screen */
      if (lockedP === null) {
        var want = clamp((MODE === 'scroll' ? vh / 2 : vw / 2) - itemCenter(i), minP, maxP);
        if (Math.abs(want - pos) > (MODE === 'scroll' ? vh : vw) * 0.4) {
          pos = targetP = want; applyTrack();
        } else targetP = want;
      }
      var r = items[i].getBoundingClientRect();
      gsap.to(g, { left: r.left, top: r.top, width: r.width, height: r.height, duration: 0.8, ease: 'expo.inOut' });
      gsap.fromTo(planes[i], { bulge: 0 }, { bulge: 0.4, duration: 0.4, ease: 'sine.inOut', yoyo: true, repeat: 1 });
      planes.forEach(function (p, k) {
        if (k === i) return;
        gsap.to(p, { alpha: 1, duration: 0.55, ease: 'power2.out', delay: 0.25 + Math.abs(k - i) * 0.024 });
      });
      if (!useGL) gsap.to(track, { opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.2 });
      gsap.delayedCall(0.82, function () {
        g.classList.remove('on');
        planes[i].el = items[i];
        mode = 'strip'; busy = false;
        measure();                                   /* restores the hint */
        items[i].focus({ preventScroll: true });
      });
    }

    /* ----- pointer: drag / hover / click ----- */
    var pid = null, downX = 0, downY = 0, lastPX = 0, lastPY = 0, lastT = 0, sampleV = 0;

    function onDown(e) {
      if (e.button > 0) return;
      pid = e.pointerId;
      downX = lastPX = e.clientX; downY = lastPY = e.clientY;
      dragMoved = 0; sampleV = 0; lastT = performance.now();
      if (mode === 'strip') { dragging = true; fling = 0; }
      try { stage.setPointerCapture(pid); } catch (err) { /* synthetic pointers */ }
    }
    function onMove(e) {
      moveCursor(e);
      if (pid !== e.pointerId) { hover(e); return; }
      var dx = e.clientX - lastPX, dy = e.clientY - lastPY;
      lastPX = e.clientX; lastPY = e.clientY;
      dragMoved = Math.max(dragMoved, Math.abs(e.clientX - downX), Math.abs(e.clientY - downY));
      if (dragging && mode === 'strip' && lockedP === null) {
        userMoved = true; lastInput = performance.now();
        var d = (MODE === 'scroll') ? dy : dx;
        var over = (targetP > maxP || targetP < minP) ? 0.35 : 1;
        targetP += d * over;
        var now = performance.now(), dt = Math.max(now - lastT, 1); lastT = now;
        sampleV = lerp(sampleV, d * (16.7 / dt), 0.4);
      }
      if (!dragging) hover(e);
    }
    function onUp(e) {
      if (pid !== e.pointerId) return;
      try { stage.releasePointerCapture(pid); } catch (err) { /* synthetic pointers */ }
      pid = null;
      if (dragging) { dragging = false; fling = clamp(sampleV, -70, 70); }
      if (mode === 'zoom' && dragMoved > 60) {
        step((MODE === 'scroll' ? lastPY < downY : lastPX < downX) ? 1 : -1);
        dragMoved = 100; /* poison the click */
      }
    }
    function onClick(e) {
      if (dragMoved > 8 || busy || dead || leaving) return;
      if (mode === 'strip') {
        /* pointer capture retargets the click to the stage, so hit-test
           the coordinates instead of trusting e.target */
        var el = document.elementFromPoint(e.clientX, e.clientY);
        var b = el && el.closest ? el.closest('.sg-item') : null;
        if (b) open(parseInt(b.dataset.i, 10));
      } else {
        var hit = document.elementFromPoint(e.clientX, e.clientY);
        if (hit && hit.closest && hit.closest('.sg-close')) { close(); return; }
        var rx = e.clientX / vw;
        if (rx < 0.22) step(-1);
        else if (rx > 0.78) step(1);
        else close();
      }
    }
    function hover(e) {
      if (mode !== 'strip' || dragging) return;
      var b = e.target.closest ? e.target.closest('.sg-item') : null;
      var i = b ? parseInt(b.dataset.i, 10) : -1;
      if (i === hot) return;
      if (MODE === 'slits') {
        if (hot > -1) gsap.to(items[hot], { width: baseW, duration: 0.55, ease: 'power3.out' });
        hot = i;
        stage.classList.toggle('is-hovering', hot > -1);
        items.forEach(function (el, k) { el.classList.toggle('is-hot', k === hot); });
        if (hot > -1 && !isTouch) gsap.to(items[hot], { width: baseW * 1.55, duration: 0.55, ease: 'power3.out' });
      } else {
        hot = i; /* cursor label only — no widen/dim in the column */
      }
    }
    function clearHover() {
      if (MODE === 'slits' && hot > -1) gsap.to(items[hot], { width: baseW, duration: 0.5, ease: 'power3.out' });
      hot = -1; stage.classList.remove('is-hovering');
      items.forEach(function (el) { el.classList.remove('is-hot'); });
    }

    function onWheel(e) {
      e.preventDefault();
      if (dead || leaving) return;
      if (mode === 'strip') {
        if (lockedP === null) {
          userMoved = true; lastInput = performance.now();
          fling = 0;
          /* the column reads weightier — deliberately more resistant */
          targetP -= (e.deltaY + (MODE === 'slits' ? e.deltaX : 0)) * (MODE === 'scroll' ? 0.55 : 0.9);
        }
      } else {
        var now = performance.now();
        if (now - wheelT > 900) wheelAcc = 0;
        wheelT = now;
        wheelAcc += e.deltaY + e.deltaX;
        if (Math.abs(wheelAcc) > 120 && !busy) {
          step(wheelAcc > 0 ? 1 : -1);
          wheelAcc = 0;
        }
      }
    }
    function onKey(e) {
      if (dead || leaving) return;
      if (mode === 'zoom') {
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') step(1);
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') step(-1);
      } else if (lockedP === null) {
        var kDir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1
                 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
        if (!kDir) return;
        userMoved = true; lastInput = performance.now(); fling = 0;
        if (MODE === 'scroll') {
          /* step exactly one photograph */
          var kBest = 0, kBd = 1e9;
          for (var q = 0; q < n; q++) {
            var qD = Math.abs((vh / 2 - itemCenter(q)) - targetP);
            if (qD < kBd) { kBd = qD; kBest = q; }
          }
          var kNext = clamp(kBest + kDir, 0, n - 1);
          targetP = clamp(vh / 2 - itemCenter(kNext), minP, maxP);
        } else {
          targetP -= kDir * (baseW + gap) * 3;
        }
      }
    }

    /* ----- custom cursor ----- */
    var cx = -100, cy = -100, cxL = -100, cyL = -100, cursorOn = false;
    function moveCursor(e) {
      cx = e.clientX; cy = e.clientY;
      if (!cursorOn && !isTouch) { cursorOn = true; cursor.classList.add('on'); }
    }
    function cursorLabel() {
      if (mode === 'zoom') {
        cursor.classList.add('inv');
        var rx = cx / vw;
        return rx < 0.22 ? '← prev' : rx > 0.78 ? 'next →' : 'close';
      }
      cursor.classList.remove('inv');
      if (hot > -1) return 'zoom';
      if (lockedP !== null) return '';
      return MODE === 'scroll' ? 'scroll' : 'drag';
    }
    stage.addEventListener('pointerleave', function () {
      cursorOn = false; cursor.classList.remove('on'); clearHover();
    });

    /* ----- main loop ----- */
    function loop(now) {
      if (dead) return;
      raf = requestAnimationFrame(loop);
      var t = (now - t0) / 1000;

      if (mode === 'strip') {
        if (!dragging && lockedP === null) {
          targetP += fling; fling *= (MODE === 'scroll' ? 0.9 : 0.94);
          if (Math.abs(fling) < 0.08) fling = 0;
          if (targetP > maxP) targetP = lerp(targetP, maxP, 0.16);
          if (targetP < minP) targetP = lerp(targetP, minP, 0.16);
          /* magnetic settle: when the scroll comes to rest, a photograph
             should be sitting composed in the frame */
          if (MODE === 'scroll' && fling === 0 && now - lastInput > 240) {
            var sBest = 0, sBd = 1e9;
            for (var s = 0; s < n; s++) {
              var sD = Math.abs((vh / 2 - itemCenter(s)) - targetP);
              if (sD < sBd) { sBd = sD; sBest = s; }
            }
            targetP = lerp(targetP, clamp(vh / 2 - itemCenter(sBest), minP, maxP), 0.09);
          }
        }
        if (lockedP !== null) targetP = lockedP;
        pos = lerp(pos, targetP, dragging ? 0.42 : 0.1);
        applyTrack();
      }
      vel = lerp(vel, pos - prevPos, 0.22); prevPos = pos;

      /* hud */
      if (lockedP === null && maxP > minP) {
        var pr = (maxP - pos) / (maxP - minP);
        progressI.style.width = (10 + clamp(pr, 0, 1) * 90) + '%';
      } else progressI.style.width = '100%';
      if (mode === 'strip') {
        var mid = (MODE === 'scroll' ? vh : vw) / 2, best = 0, bd = 1e9;
        for (var i = 0; i < n; i++) {
          var rc = items[i].getBoundingClientRect();
          var c = (MODE === 'scroll') ? rc.top + rc.height / 2 : rc.left + rc.width / 2;
          var d = Math.abs(c - mid);
          if (d < bd) { bd = d; best = i; }
        }
        countB.textContent = pad(best + 1);
      }

      /* cursor */
      cxL = lerp(cxL, cx, 0.28); cyL = lerp(cyL, cy, 0.28);
      cursor.style.transform = 'translate(' + cxL + 'px,' + cyL + 'px) translate(-50%,-50%)';
      var lbl = cursorLabel();
      if (cursorS.textContent !== lbl) cursorS.textContent = lbl;
      cursor.classList.toggle('on', cursorOn && !!lbl);

      /* GL paint */
      if (R) {
        R.begin(t, AXIS, CANVAS_COL);
        var zoomers = [];
        for (var k = 0; k < n; k++) {
          var p = planes[k];
          p.dim = lerp(p.dim, (MODE === 'slits' && mode === 'strip' && hot > -1 && k !== hot) ? 1 : 0, 0.12);
          if (p.alpha <= 0.004) continue;
          if (p.el !== items[k]) { zoomers.push(p); continue; }
          var rect = items[k].getBoundingClientRect();
          if (MODE === 'scroll') {
            if (rect.bottom < -160 || rect.top > vh + 160) continue;
          } else if (rect.right < -120 || rect.left > vw + 120) continue;
          R.draw(p, rect, vel);
        }
        for (var z = 0; z < zoomers.length; z++) {
          R.draw(zoomers[z], zoomers[z].el.getBoundingClientRect(), vel * 0.4);
        }
      }
    }

    /* ----- listeners ----- */
    var offs = [];
    function on(el, ev, fn, o) { el.addEventListener(ev, fn, o); offs.push(function () { el.removeEventListener(ev, fn, o); }); }
    on(stage, 'pointerdown', onDown);
    on(stage, 'pointermove', onMove);
    on(stage, 'pointerup', onUp);
    on(stage, 'pointercancel', onUp);
    on(stage, 'click', onClick);
    on(stage, 'wheel', onWheel, { passive: false });
    on(document, 'keydown', onKey);
    on(window, 'resize', queueMeasure);
    on(closeBtn, 'click', function (e) { e.stopPropagation(); close(); });

    intro();
    raf = requestAnimationFrame(loop);

    return {
      open: open,
      measure: measure,
      /* graceful exit: fade the stage, then hand back to the caller */
      leave: function (cb) {
        if (leaving) return;
        leaving = true;
        cursor.classList.remove('on');
        if (introT) introT.kill();
        gsap.to(stage, {
          autoAlpha: 0, duration: 0.4, ease: 'power2.in',
          onComplete: function () { if (cb) cb(); }
        });
      },
      destroy: function () {
        dead = true;
        cancelAnimationFrame(raf);
        if (measureQ) cancelAnimationFrame(measureQ);
        offs.forEach(function (f) { f(); });
        if (introT) introT.kill();
        gsap.killTweensOf(planes);
        gsap.killTweensOf(items);
        gsap.killTweensOf([stage, track, ghostA, ghostB]);
        if (R) R.dispose();
        stage.remove(); cursor.remove();
      }
    };
  }

  window.SlitGallery = {
    supported: function () { return !!window.gsap; },
    glSupported: function () { return GL_OK; },
    create: create
  };
})();
