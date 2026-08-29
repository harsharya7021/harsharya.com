/* ═══════════════════════════════════════════════════════════════════════
   MAPFX — the descent
   ───────────────────────────────────────────────────────────────────────
   Click a place on the globe and the photograph hard-cuts into a montage
   of that place seen from above: real satellite imagery, real streets,
   real contours, cut hard and descending — orbit, region, city, district,
   street — with the place name locked dead centre. The montage runs
   straight through the page navigation, so the load isn't a gap, it's the
   middle of the shot. It ends by pushing all the way into the deepest
   tile and handing off to the gallery, which scales up out of it.

   Imagery is real and licensed for this:
     · Esri World Imagery   — satellite
     · OpenStreetMap        — streets, and whatever transit actually exists
     · Esri World Topo      — terrain and contours
   Nothing is invented. A place without a metro doesn't get one.
   (Google Maps/Earth tiles are not usable this way under their terms.)

   Falls back to drawn plates if the network is unavailable, and to a
   plain fade under prefers-reduced-motion.

   Usage — departing:
     MapFX.warm('kochi')                       // on hover, optional
     MapFX.depart({ setId:'kochi', href:'kochi.html', hold:520 })
   Usage — arriving:
     MapFX.arrive({ onDone: fn })
   ═══════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /* ── the places ──────────────────────────────────────────────────────
     lat/lon are the real coordinates the imagery is centred on.          */
  var PLACES = {
    _default: { label: '', lat: 20, lon: 78 },
    kochi:    { label: 'Kochi',         lat: 9.9658,  lon: 76.2422 },
    kerala:   { label: 'Varkala',       lat: 8.7379,  lon: 76.7163 },
    jodhpur:  { label: 'Jodhpur',       lat: 26.2967, lon: 73.0169 },
    shimla:   { label: 'Shimla',        lat: 31.1048, lon: 77.1734 },
    malaysia: { label: 'Kuala Lumpur',  lat: 3.1478,  lon: 101.6953 },
    lakshadweep: { label: 'Lakshadweep', lat: 10.5593, lon: 72.1925 }
  };

  /* ── tile layers ─────────────────────────────────────────────────── */
  var LAYERS = {
    sat: {
      url: function (z, x, y) {
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/' + z + '/' + y + '/' + x;
      },
      credit: 'Esri · Maxar · Earthstar'
    },
    map: {
      url: function (z, x, y) {
        return 'https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png';
      },
      credit: '© OpenStreetMap'
    },
    topo: {
      url: function (z, x, y) {
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/' + z + '/' + y + '/' + x;
      },
      credit: 'Esri'
    }
  };

  /* The ladder. Depth 0 = orbit, 1 = street. Ordered shallow → deep so a
     montage can simply walk down it. */
  var LADDER = [
    { layer: 'sat',  z: 4  },   /* subcontinent */
    { layer: 'sat',  z: 7  },   /* region */
    { layer: 'topo', z: 9  },   /* terrain, contours */
    { layer: 'sat',  z: 11 },   /* the city in its landscape */
    { layer: 'map',  z: 13 },   /* streets — and whatever rail is real */
    { layer: 'sat',  z: 15 },   /* district */
    { layer: 'map',  z: 16 },   /* the grid you'd walk */
    { layer: 'sat',  z: 17 }    /* rooftops */
  ];

  /* Plates are 3×2 tiles — 768×512. Landscape, so it wastes nothing against
     a wide viewport, and big enough that the montage can crop into it
     without the imagery going to mush. Phones get 2×2. */
  var TILE = 256;
  function grid() {
    return (global.innerWidth || 1200) < 700 ? { x: 2, y: 2 } : { x: 3, y: 2 };
  }
  /* required attribution for the imagery, shown in the corner */
  var CREDIT = 'IMAGERY  ESRI · MAXAR · © OPENSTREETMAP';

  /* ── slippy-map maths ────────────────────────────────────────────── */
  function worldPx(lat, lon, z) {
    var n = Math.pow(2, z) * TILE;
    var x = (lon + 180) / 360 * n;
    var s = Math.sin(lat * Math.PI / 180);
    var y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n;
    return { x: x, y: y, n: n };
  }

  /* ── plate store ─────────────────────────────────────────────────── */
  var plates = {};            /* setId -> [plate] */
  var warming = {};           /* setId -> true once requested */
  var fallbacks = [];         /* drawn plates, used only if tiles fail */
  var credits = {};

  function plateList(setId) {
    var own = plates[setId] || [];
    var extra = (manifest[setId] || []).concat(manifest._base || []);
    var live = own.filter(function (p) { return p.ready; });
    return live.length ? live.concat(extra) : fallbacks.concat(extra);
  }

  /* stitch a 2×2 tile block centred on the place */
  function buildTilePlate(place, rung, onReady) {
    var G = grid();
    var PW = TILE * G.x, PH = TILE * G.y;
    var c = document.createElement('canvas');
    c.width = PW; c.height = PH;
    var g = c.getContext('2d');
    g.fillStyle = '#11161f'; g.fillRect(0, 0, PW, PH);

    var plate = {
      canvas: c, w: PW, h: PH,
      kind: rung.layer, z: rung.z, ready: false, tiles: 0,
      depth: (rung.z - LADDER[0].z) / (LADDER[LADDER.length - 1].z - LADDER[0].z)
    };

    /* Snap the block to tile boundaries so exactly G.x × G.y tiles cover it.
       Being up to half a tile off-centre costs nothing — every cut crops
       into this at random anyway — and it saves us the extra row and column
       an unaligned window would need. */
    var p = worldPx(place.lat, place.lon, rung.z);
    var tx0 = Math.round((p.x - PW / 2) / TILE);
    var ty0 = Math.round((p.y - PH / 2) / TILE);
    var max = Math.pow(2, rung.z);
    ty0 = Math.max(0, Math.min(max - G.y, ty0));
    var left = tx0 * TILE, top = ty0 * TILE;
    var want = 0, got = 0;

    for (var i = 0; i < G.x; i++) {
      for (var j = 0; j < G.y; j++) {
        var tx = tx0 + i, ty = ty0 + j;
        if (ty < 0 || ty >= max) continue;
        var wrapped = ((tx % max) + max) % max;
        want++;
        (function (tx, ty, wrapped) {
          var im = new Image();
          /* all three providers send Access-Control-Allow-Origin, so the
             montage canvas stays untainted and readable */
          im.crossOrigin = 'anonymous';
          im.referrerPolicy = 'no-referrer-when-downgrade';
          im.onload = function () {
            g.drawImage(im, tx * TILE - left, ty * TILE - top, TILE, TILE);
            plate.tiles++;
            if (++got >= want) { plate.ready = true; if (onReady) onReady(plate); }
            else if (plate.tiles >= 2) plate.ready = true;   /* usable early */
          };
          im.onerror = function () { if (++got >= want && plate.tiles) { plate.ready = true; if (onReady) onReady(plate); } };
          im.src = LAYERS[rung.layer].url(rung.z, wrapped, ty);
        })(tx, ty, wrapped);
      }
    }
    return plate;
  }

  /* Kick off the imagery for a place. Cheap to call more than once. */
  function warm(setId) {
    if (warming[setId]) return;
    warming[setId] = true;
    var place = PLACES[setId] || PLACES._default;
    /* a phone gets a shorter ladder — five rungs still reads as a descent,
       and it's twelve fewer tiles over a mobile connection */
    var rungs = (global.innerWidth || 1200) < 700
      ? LADDER.filter(function (r, i) { return i % 2 === 0 || i === LADDER.length - 1; })
      : LADDER;
    plates[setId] = rungs.map(function (rung) { return buildTilePlate(place, rung); });
  }

  /* ═══ FALLBACK PLATES — only ever seen if the tiles don't arrive ═══ */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function buildFallbacks() {
    if (fallbacks.length) return;
    var rand = mulberry32(20260821);
    for (var k = 0; k < 3; k++) {
      var c = document.createElement('canvas');
      c.width = 512; c.height = 512;
      var g = c.getContext('2d');
      var base = ['#25303C', '#2E3A2C', '#3A3630'][k];
      g.fillStyle = base; g.fillRect(0, 0, 512, 512);
      for (var i = 0; i < 2200; i++) {
        var v = 20 + rand() * 60;
        g.fillStyle = 'rgba(' + (v + 40) + ',' + (v + 46) + ',' + (v + 30) + ',' + (0.2 + rand() * 0.5) + ')';
        g.fillRect(rand() * 512, rand() * 512, 2 + rand() * 22, 2 + rand() * 16);
      }
      g.strokeStyle = 'rgba(140,170,200,.35)'; g.lineWidth = 2;
      for (i = 0; i < 5; i++) {
        g.beginPath();
        var x = rand() * 512, y = -10;
        g.moveTo(x, y);
        while (y < 522) { x += (rand() - 0.5) * 60; y += 26; g.lineTo(x, y); }
        g.stroke();
      }
      fallbacks.push({ canvas: c, w: 512, h: 512, kind: 'fallback', ready: true, depth: k / 2 });
    }
  }

  /* ═══ TYPE — the site's own stack, clean ══════════════════════════ */
  var DISPLAY = 'Anton, "Archivo Black", Impact, sans-serif';
  var MONO = '"Space Mono", ui-monospace, "SF Mono", Menlo, monospace';
  var ACCENT = '#ff5a00';

  /* ═══ THE DESCENT — the cut list ═════════════════════════════════ */
  /* dur   — how long this leg of the descent lasts
     until — how far ahead to generate cuts (a departing leg outlives its
             own duration because we don't know when the page will swap)
     start — how far down the descent we already are (0..1), so the leg
             that runs on the arriving page picks up where the departing
             one left off instead of climbing back to orbit             */
  function buildCuts(rand, setId, dur, until, start, cfg) {
    var cuts = [], t = 0, i = 0;
    while (t < until && i < 140) {
      var progress = start + (1 - start) * Math.min(1, t / dur);
      var roll = rand();
      var beat = i < 3 ? cfg.fast : (roll < 0.22 ? cfg.hold : cfg.beat);

      if (roll > 0.78 && i > 2) {
        /* split frame — two altitudes of the same place at once */
        var vertical = rand() < 0.5;
        var panes = [
          pane(rand, progress - 0.12, 0.86 + rand() * 0.14),
          pane(rand, progress + 0.16, 0.86 + rand() * 0.14)
        ];
        panes[0].box = vertical ? { x: 0, y: 0, w: 0.5, h: 1 } : { x: 0, y: 0, w: 1, h: 0.5 };
        panes[1].box = vertical ? { x: 0.5, y: 0, w: 0.5, h: 1 } : { x: 0, y: 0.5, w: 1, h: 0.5 };
        cuts.push({ t: t, panes: panes, gutter: true });
      } else if (roll > 0.62 && i > 2) {
        /* inset — a tighter window floating over the wider view */
        var back = pane(rand, progress - 0.1, 1);
        var front = pane(rand, progress + 0.22, 0.62 + rand() * 0.18);
        front.box = { x: 0.08 + rand() * 0.26, y: 0.14 + rand() * 0.26, w: 0.44 + rand() * 0.18, h: 0.36 + rand() * 0.16 };
        front.frame = true;
        cuts.push({ t: t, panes: [back, front] });
      } else {
        cuts.push({ t: t, panes: [pane(rand, progress, 0.82 + rand() * 0.18)] });
      }
      t += beat; i++;
    }
    return cuts;

    function pane(rand, depth, zoom) {
      return {
        depth: Math.max(0, Math.min(1, depth)),
        pick: rand(), zoom: zoom,
        cx: 0.5 + (rand() - 0.5) * 0.22,
        cy: 0.5 + (rand() - 0.5) * 0.22,
        plate: null
      };
    }
  }

  /* Resolve a pane to the loaded plate nearest the depth it wants. */
  var lastPlate = null;
  function resolve(pane, setId) {
    if (pane.plate && pane.plate.ready) return pane.plate;
    var all = plateList(setId);
    if (!all.length) return null;

    var best = null, bestD = 1e9;
    for (var i = 0; i < all.length; i++) {
      var p = all[i];
      var d = Math.abs((p.depth == null ? 0.5 : p.depth) - pane.depth);
      if (p === lastPlate) d += 0.22;               /* don't cut to itself */
      d += pane.pick * 0.06;                        /* a little jitter */
      /* the last frames want to be aerial, not a drawing — the push ends on
         whatever is up, and photography lands into photographs far better
         than a street map does */
      if (pane.depth > 0.86 && p.kind !== 'sat') d += 0.5;
      if (d < bestD) { bestD = d; best = p; }
    }
    if (!best) return null;
    lastPlate = best;
    pane.plate = best;

    /* Don't crop past the point where the tiles turn to mush. Variety comes
       from cutting between rungs of the ladder, not from magnifying one. */
    var zoom = Math.max(0.55, Math.min(1, pane.zoom));
    var sw = best.w * zoom, sh = best.h * zoom;
    pane.sw = sw; pane.sh = sh;
    pane.sx = Math.max(0, Math.min(best.w - sw, pane.cx * best.w - sw / 2));
    pane.sy = Math.max(0, Math.min(best.h - sh, pane.cy * best.h - sh / 2));
    return best;
  }

  /* ═══ INSTANCE ═══════════════════════════════════════════════════ */
  var live = [], running = false;

  function Curtain(data, cfg, onEnd) {
    this.cfg = cfg;
    this.data = data;
    this.setId = data.setId || '_default';
    this.place = PLACES[this.setId] || PLACES._default;
    this.label = (data.label || this.place.label || '').trim();
    this.coords = data.coords || fmtCoords(this.place.lat, this.place.lon);
    this.onEnd = onEnd || null;
    this.hudOffset = cfg.hudOffset || 0;
    this.rand = mulberry32(((Math.random() * 1e9) | 0));
    this.frame = 0;

    warm(this.setId);
    buildFallbacks();

    var host = document.createElement('div');
    host.className = 'mapfx-curtain';
    host.setAttribute('aria-hidden', 'true');
    var canvas = document.createElement('canvas');
    host.appendChild(canvas);
    document.body.appendChild(host);

    document.documentElement.classList.add('mapfx-curtain-open');

    this.host = host;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();

    this.dur = cfg.min + this.rand() * (cfg.max - cfg.min);
    this.start = Math.min(0.55, (cfg.depthOffset || 0) / 2600);
    this.cuts = buildCuts(this.rand, this.setId, this.dur,
                          this.dur * (cfg.noEnd ? 4 : 1.06), this.start, cfg);
    this.t0 = performance.now();
    this.state = 'playing';

    live.push(this);
    tick();

    var self = this;
    this._onResize = function () { self.resize(); };
    global.addEventListener('resize', this._onResize);
  }

  function fmtCoords(lat, lon) {
    return Math.abs(lat).toFixed(4) + '°' + (lat < 0 ? 'S' : 'N') + ' ' +
           Math.abs(lon).toFixed(4) + '°' + (lon < 0 ? 'W' : 'E');
  }

  /* offscreen frame the shutter blits out of */
  Curtain.prototype.buffer = function (w, h) {
    if (!this._buf || this._bufW !== w || this._bufH !== h) {
      this._buf = document.createElement('canvas');
      this._buf.width = w; this._buf.height = h;
      this._bufW = w; this._bufH = h;
    }
    return this._buf;
  };

  Curtain.prototype.resize = function () {
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    this.w = global.innerWidth;
    this.h = global.innerHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.stamp = null;
    this.slits = 0;
    this._buf = null;
  };

  Curtain.prototype.render = function (now) {
    var g = this.ctx, w = this.w, h = this.h;
    var el = now - this.t0;

    /* ── the ending ──────────────────────────────────────────────────
       The descent has already reached its deepest rung, so the push just
       carries on from the frame that's already up — no cut. It decelerates
       into the landing, and the page underneath starts its own move at the
       moment the curtain begins to lift, travelling the same direction at
       the same rate. Anything else reads as two motions, not one.        */
    if (this.state === 'playing' && !this.cfg.noEnd && el >= this.dur) {
      this.state = 'zoom';
      this.z0 = now;
      /* continue from the live frame if it's deep enough, else the deepest */
      var lp = this.lastPane;
      this.zoomPane = (lp && lp.plate && (lp.plate.depth || 0) >= 0.7)
        ? { plate: lp.plate, sw0: lp.sw, sh0: lp.sh, cx0: lp.sx + lp.sw / 2, cy0: lp.sy + lp.sh / 2 }
        : deepestPane(this.setId);
      /* Cue the page on the SAME frame the push begins, not at the dissolve.
         Both then run the identical curve over the identical window, so when
         the curtain lifts halfway through, the two layers are at the same
         point in the same move and the crossfade is invisible. Starting the
         page late is what made the arrival feel like a second, separate
         animation stapled on the end. */
      document.documentElement.classList.add('mapfx-landing');
      /* The host carries a solid ground so the very first frame can't flash.
         From here the canvas paints its own, and every slit the shutter
         closes has to reveal the PAGE — not this. */
      this.host.style.background = 'transparent';
    }

    if (this.state === 'zoom') {
      var p = Math.min(1, (now - this.z0) / this.cfg.zoom);
      var e = 1 - Math.pow(1 - p, 3);                /* ease-out — arriving */
      var pane = this.zoomPane;

      /* Compose the frame once into a buffer, then open it in slits.
         A plain opacity dissolve drops through the page's cream ground on
         its way out — map, then a beat of blank paper, then the gallery.
         The series pages ARE a slit gallery, so the aerial view closes like
         a shutter instead and the photographs are simply behind it. No
         blank frame, and the transition arrives speaking the page's own
         language. */
      var OPEN = 0.32;                               /* when the shutter starts */
      /* Type is gone before the shutter reaches it — a wordmark sliced into
         strips reads as broken, not designed. */
      var typeA = Math.max(0, 1 - p / (OPEN * 0.92));

      var b = this.buffer(w, h);
      var bg = b.getContext('2d');
      bg.clearRect(0, 0, w, h);
      if (pane && pane.plate) {
        var k = 1 - 0.32 * e;
        var sw = pane.sw0 * k, sh = pane.sh0 * k;
        var sx = pane.cx0 - sw / 2, sy = pane.cy0 - sh / 2;
        drawCover(bg, pane.plate.canvas, sx, sy, sw, sh, 0, 0, w, h);
        scrim(bg, w, h, this.label && this.cfg.stamp && typeA > 0.01);
        this.drawStamp(bg, w, h, typeA);
        this.drawHud(bg, w, h, el, typeA);
      }

      g.clearRect(0, 0, w, h);
      var rp = Math.max(0, (p - OPEN) / (1 - OPEN));
      var N = this.slits || (this.slits = Math.max(6, Math.min(18, Math.round(w / 108))));
      var mid = (N - 1) / 2 || 1;
      for (var i = 0; i < N; i++) {
        var dist = Math.abs(i - mid) / mid;          /* 0 centre → 1 edge */
        var q = (rp - dist * 0.4) / 0.52;            /* centre opens first */
        q = q < 0 ? 0 : q > 1 ? 1 : q;
        var o = q * q * (3 - 2 * q);
        if (o >= 1) continue;                        /* this slit is gone */
        var bx = Math.floor(i * w / N);
        var bw = Math.ceil(w / N) + 1;
        var bh = h * (1 - o);
        var by = (h - bh) / 2;
        /* 1:1 blit — the shutter closes over the image, it doesn't squash it */
        g.drawImage(b, bx, by, bw, bh, bx, by, bw, bh);
        if (o > 0.015 && o < 0.995) {                /* the closing edges */
          g.fillStyle = 'rgba(255,90,0,' + (0.95 * Math.min(1, (1 - o) * 2.2)) + ')';
          g.fillRect(bx, by, bw, 2.5);
          g.fillRect(bx, by + bh - 2.5, bw, 2.5);
        }
      }
      if (p >= 1) this.finish();
      return;
    }

    /* ── the montage ── */
    var cut = this.cuts[0], ci = 0;
    for (var c = 0; c < this.cuts.length; c++) {
      if (this.cuts[c].t <= el) { cut = this.cuts[c]; ci = c; } else break;
    }
    if (!cut) return;

    g.save();
    g.fillStyle = '#0E1219'; g.fillRect(0, 0, w, h);
    g.imageSmoothingEnabled = true;
    if (g.imageSmoothingQuality) g.imageSmoothingQuality = 'high';

    for (var pi = 0; pi < cut.panes.length; pi++) {
      var pane2 = cut.panes[pi];
      if (!resolve(pane2, this.setId)) continue;
      var box = pane2.box || { x: 0, y: 0, w: 1, h: 1 };
      var bx = box.x * w, by = box.y * h, bw = box.w * w, bh = box.h * h;
      if (cut.gutter) { bx += 1; by += 1; bw -= 2; bh -= 2; }
      g.save();
      g.beginPath(); g.rect(bx, by, bw, bh); g.clip();
      drawCover(g, pane2.plate.canvas, pane2.sx, pane2.sy, pane2.sw, pane2.sh, bx, by, bw, bh);
      g.restore();
      if (pane2.frame) {
        g.strokeStyle = 'rgba(246,243,235,.9)'; g.lineWidth = 2;
        g.strokeRect(bx, by, bw, bh);
      }
      if (pi === 0) this.lastPane = pane2;   /* the frame the push continues from */
    }

    scrim(g, w, h, this.label && this.cfg.stamp);
    this.drawStamp(g, w, h, 1);
    this.drawHud(g, w, h, el, 1);
    g.restore();
    this.frame++;
  };

  /* the pane the zoom-out finishes on — deepest plate we actually have */
  function deepestPane(setId) {
    var all = plateList(setId);
    if (!all.length) return null;
    var best = all[0];
    for (var i = 1; i < all.length; i++) {
      if ((all[i].depth || 0) > (best.depth || 0)) best = all[i];
    }
    return {
      plate: best,
      sw0: best.w, sh0: best.h,
      cx0: best.w / 2, cy0: best.h / 2
    };
  }

  function drawCover(g, img, sx, sy, sw, sh, dx, dy, dw, dh) {
    var s = Math.max(dw / sw, dh / sh);
    var w2 = sw * s, h2 = sh * s;
    g.drawImage(img, sx, sy, sw, sh, dx + (dw - w2) / 2, dy + (dh - h2) / 2, w2, h2);
  }

  function scrim(g, w, h, band) {
    var top = g.createLinearGradient(0, 0, 0, h * 0.2);
    top.addColorStop(0, 'rgba(10,12,18,.46)'); top.addColorStop(1, 'rgba(10,12,18,0)');
    g.fillStyle = top; g.fillRect(0, 0, w, h * 0.2);
    var bot = g.createLinearGradient(0, h, 0, h * 0.74);
    bot.addColorStop(0, 'rgba(10,12,18,.52)'); bot.addColorStop(1, 'rgba(10,12,18,0)');
    g.fillStyle = bot; g.fillRect(0, h * 0.74, w, h * 0.26);
    if (band) {
      var mid = g.createLinearGradient(0, h * 0.26, 0, h * 0.74);
      mid.addColorStop(0, 'rgba(10,12,18,0)');
      mid.addColorStop(0.5, 'rgba(10,12,18,.3)');
      mid.addColorStop(1, 'rgba(10,12,18,0)');
      g.fillStyle = mid; g.fillRect(0, h * 0.26, w, h * 0.48);
    }
  }

  /* the wordmark — the site's display face, set the way the site sets it */
  Curtain.prototype.drawStamp = function (g, w, h, alpha) {
    if (!this.label || !this.cfg.stamp) return;
    var size = Math.min(h * 0.27, w * 0.19);
    var kick = Math.max(10, Math.min(14, size * 0.085));
    g.save();
    g.globalAlpha = alpha;
    g.textAlign = 'center';

    /* mono kicker, uppercase, wide — matches .gx-card-no / .series-meta */
    g.font = '700 ' + kick + 'px ' + MONO;
    if ('letterSpacing' in g) g.letterSpacing = '0.22em';
    g.fillStyle = ACCENT;
    g.textBaseline = 'alphabetic';
    g.fillText('THE SERIES', w / 2, h / 2 - size * 0.62);

    /* Anton, uppercase, the site's tight tracking */
    g.font = '400 ' + size + 'px ' + DISPLAY;
    if ('letterSpacing' in g) g.letterSpacing = '-0.02em';
    g.textBaseline = 'middle';
    g.shadowColor = 'rgba(8,10,16,.55)';
    g.shadowBlur = size * 0.28;
    g.fillStyle = '#F6F3EB';
    g.fillText(this.label.toUpperCase(), w / 2, h / 2);
    g.shadowColor = 'transparent'; g.shadowBlur = 0;

    /* the orange rule the site uses under its headings */
    var rw = Math.min(w * 0.16, 150);
    g.fillStyle = ACCENT;
    g.fillRect(w / 2 - rw / 2, h / 2 + size * 0.6, rw, 3);

    if ('letterSpacing' in g) g.letterSpacing = '0em';
    g.restore();
  };

  Curtain.prototype.drawHud = function (g, w, h, el, alpha) {
    if (!this.cfg.hud || h < 260) return;
    var pad = Math.max(14, Math.round(w * 0.015));
    var fs = Math.max(9, Math.min(12, Math.round(w * 0.0092)));
    g.save();
    g.globalAlpha = alpha * 0.9;
    g.font = '400 ' + fs + 'px ' + MONO;
    if ('letterSpacing' in g) g.letterSpacing = '0.14em';
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgba(246,243,235,.85)';
    g.fillText(this.coords, pad, h - pad);

    var journey = Math.min(1, (el + this.hudOffset) / 2600);
    var alt = Math.round((1 - journey) * 9600) + 40;
    g.textAlign = 'right';
    g.fillText('ALT ' + alt + ' KM', w - pad, h - pad);

    g.textAlign = 'left';
    g.fillStyle = 'rgba(246,243,235,.5)';
    g.fillText(CREDIT, pad, pad + fs);

    if ('letterSpacing' in g) g.letterSpacing = '0em';
    g.restore();
  };

  Curtain.prototype.finish = function () {
    if (this.state === 'done') return;
    this.state = 'done';
    var i = live.indexOf(this);
    if (i > -1) live.splice(i, 1);
    global.removeEventListener('resize', this._onResize);
    document.documentElement.classList.remove('mapfx-curtain-open');
    if (this.host.parentNode) this.host.remove();
    /* the page is still settling — pulling the class now snaps it, which is
       exactly the jolt the whole ending is trying to avoid */
    setTimeout(function () {
      document.documentElement.classList.remove('mapfx-landing');
    }, 260);
    if (this.onEnd) this.onEnd();
  };

  function tick() {
    if (running) return;
    running = true;
    (function loop(now) {
      for (var i = live.length - 1; i >= 0; i--) live[i].render(now || performance.now());
      if (live.length) requestAnimationFrame(loop); else running = false;
    })(performance.now());
  }

  /* ═══ MANIFEST — Harsh's own stills, folded into the same deck ═══ */
  var manifest = {};
  function loadManifest(url) {
    return fetch(url).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.sets) return;
      var base = j.base || '';
      Object.keys(j.sets).forEach(function (setId) {
        manifest[setId] = manifest[setId] || [];
        (j.sets[setId] || []).forEach(function (file, i) {
          var im = new Image();
          im.onload = function () {
            manifest[setId].push({
              canvas: im, w: im.naturalWidth, h: im.naturalHeight,
              kind: 'still', ready: true, depth: (i % 5) / 4
            });
          };
          im.src = base + file;
        });
      });
    }).catch(function () {});
  }

  /* ═══ PUBLIC ═════════════════════════════════════════════════════ */
  var DEFAULTS = {
    min: 1150, max: 1700,
    beat: 150, fast: 74, hold: 260,
    zoom: 1050,                   /* the final push, ms */
    stamp: true, hud: true
  };

  function reduced() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion:reduce)').matches;
  }

  var MapFX = {
    HANDOFF: 'mapfx-travel',
    places: PLACES,
    warm: warm,
    manifest: loadManifest,

    /* leaving a page */
    depart: function (o) {
      try {
        sessionStorage.setItem(MapFX.HANDOFF, JSON.stringify({
          setId: o.setId, label: o.label || null, coords: o.coords || null, at: Date.now()
        }));
      } catch (e) {}
      if (reduced()) { location.href = o.href; return null; }
      var cur = new Curtain(o, Object.assign({}, DEFAULTS, { noEnd: true }, o.cfg || {}));
      setTimeout(function () { location.href = o.href; }, o.hold == null ? 520 : o.hold);
      return cur;
    },

    /* landing on one */
    arrive: function (o) {
      o = o || {};
      var data = null;
      try {
        var raw = sessionStorage.getItem(MapFX.HANDOFF);
        sessionStorage.removeItem(MapFX.HANDOFF);
        data = raw && JSON.parse(raw);
      } catch (e) {}
      if (!data || reduced()) return null;
      if (Date.now() - (data.at || 0) > 30000) return null;   /* stale back-button */

      var since = Math.min(2000, Date.now() - (data.at || Date.now()));
      var cfg = Object.assign({}, DEFAULTS, {
        hudOffset: since,
        depthOffset: since        /* carry on down, don't start again from orbit */
      }, o.cfg || {});
      return new Curtain(data, cfg, o.onDone || null);
    },

    /* for tuning */
    _internal: { Curtain: Curtain, buildCuts: buildCuts, plateList: plateList, LADDER: LADDER, DEFAULTS: DEFAULTS }
  };

  global.MapFX = MapFX;
})(window);
