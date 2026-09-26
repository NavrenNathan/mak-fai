/*
 * lion-dragon.js  (cartoon edition)
 * Side-profile lion-dance dragon for Canvas 2D, drawn in a glowing cartoon
 * style: flat fills, hard outlines, gradient bands, additive glow.
 *
 * Turning around is a real 3D roll: the body is treated as a tube and the
 * head as a set of 3D parts, so when the dragon reverses direction it rolls
 * over its back as one piece and you see its other side.
 *
 * Usage:
 *   var dragon = LionDragon.create({ dpr: window.devicePixelRatio || 1 });
 *   dragon.prepare(21 * S);                      // optional warm-up
 *   dragon.draw(ctx, { segs, head, pearl, t, roar });
 *
 * segs[i]: x, y, a (heading), r (radius), f (flip -1..1). segs[0] = neck.
 * head:    x, y, a, flip (-1..1).
 */
(function (root) {
  'use strict';

  var TAU = Math.PI * 2;
  var DR = 100; // sprites are authored for a body radius of 100 units

  var C = {
    out: '#1b1503',
    yHi: '#fff6b0', y: '#f7da35', yMid: '#e9c21c', yDk: '#b98f0c', yDeep: '#6e5205',
    gDeep: '#051509', gDk: '#0b2a17', g: '#17613a', gLt: '#2f9858', gHi: '#79d69a',
    lime: '#83ec92', limeHi: '#e2ffdc',
    cream: '#f8f3da', red: '#c93a46', pink: '#ffb6a8', gold: '#ead25f', mouth: '#5a1216'
  };

  // ------------------------------------------------------------- helpers
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function wrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function sgnMin(v, m) { var a = Math.max(Math.abs(v), m); return v < 0 ? -a : a; }


  // ================================================== realistic fur toolkit
  // Shared render context (set by Dragon before building / drawing).
  var K = { real: 0, F: null, dpr: 1, outCol: C.out, cache: {}, cacheQ: 0 };

  var FUR = { hi: [255, 250, 150], lt: [246, 236, 84], main: [236, 218, 60], mid: [212, 190, 46],
    dk: [168, 146, 34], deep: [96, 80, 14], core: [52, 42, 6] };
  var WHITE = { hi: [255, 255, 255], lt: [248, 246, 238], main: [236, 233, 222], mid: [214, 210, 196],
    dk: [170, 165, 150], deep: [110, 106, 94], core: [60, 58, 50] };
  function mixc(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a == null ? 1 : a) + ')'; }
  function tone(v, P) {
    P = P || FUR; v = clamp(v, 0, 1);
    if (v < 0.2) return mixc(P.core, P.deep, v / 0.2);
    if (v < 0.4) return mixc(P.deep, P.dk, (v - 0.2) / 0.2);
    if (v < 0.6) return mixc(P.dk, P.mid, (v - 0.4) / 0.2);
    if (v < 0.78) return mixc(P.mid, P.main, (v - 0.6) / 0.18);
    if (v < 0.92) return mixc(P.main, P.lt, (v - 0.78) / 0.14);
    return mixc(P.lt, P.hi, (v - 0.92) / 0.08);
  }
  var LX = 0.28, LY = -0.96; // stage light: above and slightly in front

  function strand(g, x, y, ang, len, w, bend, col) {
    var c = Math.cos(ang), s = Math.sin(ang);
    var tx = x + c * len, ty = y + s * len;
    var mx = x + c * len * 0.5 - s * bend * len, my = y + s * len * 0.5 + c * bend * len;
    var px = -s * w * 0.5, py = c * w * 0.5;
    g.beginPath(); g.moveTo(x + px, y + py);
    g.quadraticCurveTo(mx + px * 0.45, my + py * 0.45, tx, ty);
    g.quadraticCurveTo(mx - px * 0.45, my - py * 0.45, x - px, y - py);
    g.closePath(); g.fillStyle = col; g.fill();
  }

  // ruffled fur trim along a polyline, made of real hair strands
  function furTrimReal(g, pts, thick, seed, o) {
    o = o || {};
    var R = rng(seed), folds = o.folds || 5, dens = o.dens == null ? 1.15 : o.dens;
    var total = 0, seg = [], i;
    for (i = 1; i < pts.length; i++) { var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
    function at(sv) {
      var acc = 0;
      for (var j = 0; j < seg.length; j++) {
        if (acc + seg[j] >= sv || j === seg.length - 1) {
          var r = seg[j] ? clamp((sv - acc) / seg[j], 0, 1) : 0, a = pts[j], b = pts[j + 1];
          var tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
          return { x: a[0] + tx * r, y: a[1] + ty * r, tx: tx / tl, ty: ty / tl };
        }
        acc += seg[j];
      }
    }
    var ph = R() * TAU;
    function th(u) { return thick * Math.pow(Math.sin(Math.PI * clamp(u, 0.02, 0.98)), 0.45) * (0.8 + 0.26 * Math.sin(u * folds * TAU + ph)); }
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    // warm glow + cast shadow under the trim
    if (!o.noGlow) {
      g.strokeStyle = 'rgba(255,215,70,0.13)'; g.lineWidth = thick * 3.6;
      g.beginPath(); pts.forEach(function (q, k) { k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.stroke();
    }
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = thick * 2.1;
    g.beginPath(); pts.forEach(function (q, k) { k ? g.lineTo(q[0] + 2, q[1] + thick * 0.45) : g.moveTo(q[0] + 2, q[1] + thick * 0.45); }); g.stroke();
    g.restore();
    var steps = Math.max(8, Math.round(total / 3));
    for (var s1 = 0; s1 <= steps; s1++) {
      var u1 = s1 / steps, q1 = at(u1 * total), w1 = th(u1), fold = Math.sin(u1 * folds * TAU + ph);
      g.beginPath(); g.ellipse(q1.x, q1.y, w1 * 0.95, w1 * 0.8, Math.atan2(q1.ty, q1.tx), 0, TAU);
      g.fillStyle = rgba(tone(0.5 + fold * 0.12)); g.fill();
    }
    var n = Math.round(total * thick * dens);
    var layers = [{ k: 0.3, lo: 0.22, hi: 0.52, w: 2.2, l: 1.0 }, { k: 0.43, lo: 0.5, hi: 0.86, w: 1.9, l: 0.95 },
      { k: 0.2, lo: 0.76, hi: 1.02, w: 1.3, l: 0.8 }, { k: 0.07, lo: 0.62, hi: 0.95, w: 1.1, l: 1.2 }];
    for (var L = 0; L < layers.length; L++) {
      var Ly = layers[L], cnt = Math.round(n * Ly.k);
      for (var m = 0; m < cnt; m++) {
        var u = R(), q = at(u * total), w = th(u), nx = -q.ty, ny = q.tx;
        var side = L === 3 ? (R() < 0.5 ? -1 : 1) : R() * 2 - 1;
        var bx = q.x + nx * side * w * 0.7, by = q.y + ny * side * w * 0.7;
        var f2 = Math.sin(u * folds * TAU + ph);
        var out = Math.atan2(ny * side, nx * side), along = Math.atan2(q.ty, q.tx) + (R() < 0.5 ? 0 : Math.PI);
        var ang = lerp(out, out + wrap(along - out), 0.25 + R() * 0.45) + (R() - 0.5) * 0.7;
        var lit = (Math.cos(ang) * LX + Math.sin(ang) * LY) * 0.5 + 0.5;
        var tv = lerp(Ly.lo, Ly.hi, R() * 0.5 + lit * 0.3 + (f2 * 0.5 + 0.5) * 0.2);
        strand(g, bx, by, ang, thick * (0.4 + R() * 0.5) * Ly.l, Ly.w * (0.7 + R() * 0.6), (R() - 0.5) * 0.4, rgba(tone(tv), 0.6 + R() * 0.4));
      }
    }
  }

  // shiny black-green fabric plate: satin sheen, sequin sparkle, glowing lime stripes
  function glossyPanel(g, rx, ry, seed) {
    var R = rng(seed);
    g.save();
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU);
    var gr = g.createRadialGradient(rx * 0.25, -ry * 0.45, 2, 0, 0, Math.max(rx, ry) * 1.1);
    gr.addColorStop(0, '#16502e'); gr.addColorStop(0.4, '#0b2a17'); gr.addColorStop(1, '#030b06');
    g.fillStyle = gr; g.fill(); g.clip();
    g.globalCompositeOperation = 'lighter';
    var sg = g.createLinearGradient(-rx, -ry, rx * 0.4, ry * 0.2);
    sg.addColorStop(0, 'rgba(120,190,150,0)'); sg.addColorStop(0.5, 'rgba(120,190,150,0.2)'); sg.addColorStop(1, 'rgba(120,190,150,0)');
    g.fillStyle = sg; g.beginPath(); g.ellipse(rx * 0.1, -ry * 0.35, rx * 0.8, ry * 0.25, -0.35, 0, TAU); g.fill();
    for (var i = 0; i < 30; i++) {
      g.fillStyle = 'rgba(225,245,235,' + (0.25 + R() * 0.55) + ')';
      g.beginPath(); g.arc((R() * 2 - 1) * rx, (R() * 2 - 1) * ry, 0.5 + R() * 1.1, 0, TAU); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    var n = 3 + (R() < 0.5 ? 1 : 0);
    g.translate(-rx * (0.05 + R() * 0.3), ry * (0.15 + R() * 0.25)); g.rotate(-0.5 + R() * 0.5);
    g.lineCap = 'round';
    for (var k = 0; k < n; k++) {
      var off = (k - (n - 1) / 2) * rx * 0.2;
      g.beginPath(); g.moveTo(-rx * 0.3, off + ry * 0.12); g.quadraticCurveTo(0, off - ry * 0.12, rx * 0.32, off + ry * 0.06);
      g.strokeStyle = 'rgba(120,255,150,0.25)'; g.lineWidth = rx * 0.2; g.stroke();
      g.strokeStyle = 'rgba(52,150,74,0.9)'; g.lineWidth = rx * 0.1; g.stroke();
      g.strokeStyle = C.lime; g.lineWidth = rx * 0.07; g.stroke();
      g.strokeStyle = 'rgba(226,255,220,0.6)'; g.lineWidth = rx * 0.025; g.stroke();
    }
    g.restore();
  }

  // shaggy real-hair lock, base at origin, pointing up (-y)
  function realLock(g, len, w, bend, seed, dark) {
    var R = rng(seed), n = Math.round(len * w * 0.22);
    // glow
    g.save(); g.globalAlpha = 0.5; lockPath(g, len, w * 1.3, bend);
    g.fillStyle = 'rgba(255,215,70,0.15)'; g.fill(); g.restore();
    for (var p = 0; p < 3; p++) {
      for (var i = 0; i < n; i++) {
        var bx = (R() - 0.5) * w, v = R();
        var ang = -Math.PI / 2 + bend * (0.6 + R() * 0.6) + (R() - 0.5) * 0.35 + bx * 0.004;
        var l = len * (0.55 + R() * 0.45) * (1 - Math.abs(bx) / w * 0.6);
        var lit = clamp(0.5 - bx / w * 0.4 + (1 - v) * 0.1, 0, 1);
        var tv = (p === 0 ? 0.22 + R() * 0.2 : p === 1 ? 0.5 + lit * 0.3 + R() * 0.1 : 0.76 + lit * 0.24) - (dark ? 0.16 : 0);
        strand(g, bx, R() * 4, ang, l * (p === 2 ? 0.85 : 1), p === 0 ? 3 : 2, bend * 0.4 + (R() - 0.5) * 0.2, rgba(tone(tv), 0.6 + R() * 0.4));
      }
    }
  }

  // plush fur ball in PIXEL space, used for the head's fur masses
  function plushSprite(seed, Rpx, white) {
    var P = white ? WHITE : FUR, R = rng(seed);
    var W = Math.ceil(Rpx * 2.7), c = K.F.make(W, W), g = c.getContext('2d'), cx = W / 2;
    var sw = clamp(Rpx / 55, 0.7, 2.2);
    var gr = g.createRadialGradient(cx - Rpx * 0.2, cx - Rpx * 0.35, Rpx * 0.1, cx, cx, Rpx);
    gr.addColorStop(0, rgba(tone(0.66, P))); gr.addColorStop(0.7, rgba(tone(0.44, P))); gr.addColorStop(1, rgba(tone(0.26, P), 0.9));
    g.beginPath(); g.arc(cx, cx, Rpx * 0.92, 0, TAU); g.fillStyle = gr; g.fill();
    var n = Math.round(Math.PI * Rpx * Rpx * 0.4 / (sw * sw));
    var passes = [{ k: 0.3, lo: 0.2, hi: 0.5, w: 2.4, l: 1.0 }, { k: 0.45, lo: 0.46, hi: 0.86, w: 2.0, l: 0.9 },
      { k: 0.2, lo: 0.72, hi: 1.0, w: 1.4, l: 0.75 }, { k: 0.05, lo: 0.85, hi: 1.04, w: 0.8, l: 1.1 }];
    for (var p = 0; p < passes.length; p++) {
      var Pp = passes[p], cnt = Math.round(n * Pp.k);
      for (var i = 0; i < cnt; i++) {
        var th = R() * TAU, u = p === 3 ? 0.82 + R() * 0.2 : Math.pow(R(), 0.55);
        var ex = Math.cos(th), ey = Math.sin(th);
        var dx = ex * 0.85, dy = ey * 0.85 + 0.15;
        var ang = Math.atan2(dy, dx) + (R() - 0.5) * 1.0;
        var lit = (ex * LX + ey * LY) * 0.5 + 0.5;
        var tv = lerp(Pp.lo, Pp.hi, R() * 0.55 + lit * 0.45) * (0.84 + u * 0.2);
        strand(g, cx + ex * Rpx * u * 0.88, cx + ey * Rpx * u * 0.88, ang, Rpx * (0.13 + R() * 0.17) * Pp.l,
          Pp.w * sw * (0.7 + R() * 0.6), (R() - 0.5) * 0.35, rgba(tone(tv, P), 0.55 + R() * 0.45));
      }
    }
    return { c: c, Rpx: Rpx };
  }
  function plushFor(seed, white) {
    var key = seed + (white ? 'w' : '');
    if (!K.cache[key]) K.cache[key] = plushSprite(seed, clamp(100 * K.cacheQ, 18, 170), white);
    return K.cache[key];
  }

  function Factory(opts) {
    this.make = opts.createCanvas || function (w, h) {
      var c = document.createElement('canvas'); c.width = w; c.height = h; return c;
    };
  }
  Factory.prototype.sprite = function (w, h, q, ox, oy) {
    var c = this.make(Math.max(2, Math.ceil(w * q)), Math.max(2, Math.ceil(h * q)));
    var g = c.getContext('2d');
    g.setTransform(q, 0, 0, q, 0, 0);
    g.translate(ox, oy);
    return { c: c, g: g, ox: ox, oy: oy, q: q };
  };

  // ---------------------------------------------------- cartoon fur rope
  // A chain of overlapping bumps with one shared outline: reads as a fuzzy
  // cartoon fur trim. Lit from the sprite's top.
  function furRope(g, pts, w, seed, lw) {
    var R = rng(seed), bumps = [], total = 0, i;
    var seg = [];
    for (i = 1; i < pts.length; i++) {
      var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      seg.push(d); total += d;
    }
    var step = w * 0.5, s = 0;
    while (s <= total) {
      var acc = 0, j = 0;
      while (j < seg.length - 1 && acc + seg[j] < s) { acc += seg[j]; j++; }
      var r = seg[j] ? (s - acc) / seg[j] : 0;
      var x = lerp(pts[j][0], pts[j + 1][0], r), y = lerp(pts[j][1], pts[j + 1][1], r);
      var u = s / total, taper = 0.45 + 0.55 * Math.pow(Math.sin(Math.PI * clamp(u, 0.03, 0.97)), 0.5);
      bumps.push({ x: x + (R() - 0.5) * w * 0.12, y: y + (R() - 0.5) * w * 0.12, r: w * 0.5 * taper * (0.85 + R() * 0.3) });
      s += step * (0.8 + R() * 0.4);
    }
    // glow halo
    g.fillStyle = 'rgba(255,220,80,0.16)';
    bumps.forEach(function (b) { g.beginPath(); g.arc(b.x, b.y, b.r * 1.9, 0, TAU); g.fill(); });
    // outline
    g.fillStyle = C.out;
    bumps.forEach(function (b) { g.beginPath(); g.arc(b.x, b.y, b.r + lw, 0, TAU); g.fill(); });
    // shadow side
    g.fillStyle = C.yDk;
    bumps.forEach(function (b) { g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill(); });
    // body
    g.fillStyle = C.y;
    bumps.forEach(function (b) { g.beginPath(); g.arc(b.x - b.r * 0.06, b.y - b.r * 0.16, b.r * 0.84, 0, TAU); g.fill(); });
    // lit tops
    g.fillStyle = C.yHi;
    bumps.forEach(function (b) {
      g.beginPath(); g.ellipse(b.x - b.r * 0.2, b.y - b.r * 0.42, b.r * 0.42, b.r * 0.24, -0.3, 0, TAU); g.fill();
    });
    // little fur flicks
    g.strokeStyle = C.yDk; g.lineWidth = lw * 0.55; g.lineCap = 'round';
    bumps.forEach(function (b, k) {
      if (k % 2) return;
      g.beginPath();
      g.moveTo(b.x - b.r * 0.3, b.y + b.r * 0.15);
      g.quadraticCurveTo(b.x, b.y + b.r * 0.45, b.x + b.r * 0.3, b.y + b.r * 0.1);
      g.stroke();
    });
  }

  // open C-curl over the top of a scale, flicked at the back, hooked at the front
  function curlPath(R, rad) {
    var pts = [], n = 26, wob = R() * TAU;
    var a0 = Math.PI * (0.86 + R() * 0.08), a1 = Math.PI * (1.96 + R() * 0.08);
    for (var i = 0; i <= n; i++) {
      var u = i / n, a = lerp(a0, a1, u), rr = rad * (1 + 0.07 * Math.sin(u * 2.5 * TAU + wob));
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.86]);
    }
    var b0 = pts[0], back = [];
    for (var j = 1; j <= 5; j++) { var v = j / 5; back.push([b0[0] - v * rad * 0.2, b0[1] + v * rad * 0.3]); }
    var he = pts[pts.length - 1], hook = [], cb = 1.0 + R() * 0.7;
    for (var k = 1; k <= 9; k++) {
      var w = k / 9, ab = a1 + w * cb, r3 = rad * (1 - w * 0.55);
      hook.push([Math.cos(ab) * r3 * 0.95 + he[0] * 0.05 * w, Math.sin(ab) * r3 * 0.86 + w * rad * 0.1]);
    }
    return back.reverse().concat(pts, hook);
  }

  // glowing lime crescent stripes
  function limeStripes(g, cx, cy, size, n, rot, lw) {
    g.save(); g.translate(cx, cy); g.rotate(rot); g.lineCap = 'round';
    for (var k = 0; k < n; k++) {
      var off = (k - (n - 1) / 2) * size * 0.22;
      g.beginPath();
      g.moveTo(-size * 0.34, off + size * 0.12);
      g.quadraticCurveTo(0, off - size * 0.14, size * 0.36, off + size * 0.05);
      g.strokeStyle = 'rgba(120,255,150,0.22)'; g.lineWidth = size * 0.2; g.stroke();
      g.strokeStyle = K.outCol; g.lineWidth = size * 0.1 + lw; g.stroke();
      g.strokeStyle = C.lime; g.lineWidth = size * 0.1; g.stroke();
      g.strokeStyle = C.limeHi; g.lineWidth = size * 0.03; g.stroke();
    }
    g.restore();
  }

  // cartoon fur lock (tapered flame), base at origin, pointing up (-y)
  function lockPath(g, len, w, bend) {
    g.beginPath();
    g.moveTo(-w * 0.5, 0);
    g.bezierCurveTo(-w * 0.6, -len * 0.45, bend * len * 0.4 - w * 0.2, -len * 0.8, bend * len, -len);
    g.bezierCurveTo(bend * len * 0.3 + w * 0.3, -len * 0.7, w * 0.6, -len * 0.4, w * 0.5, 0);
    g.closePath();
  }
  function drawLock(g, len, w, bend, lw, dark) {
    g.save();
    lockPath(g, len, w, bend);
    g.fillStyle = 'rgba(255,220,80,0.14)'; g.lineWidth = w * 0.8; g.strokeStyle = 'rgba(255,220,80,0.12)'; g.stroke();
    var gr = g.createLinearGradient(0, 0, bend * len, -len);
    gr.addColorStop(0, dark ? C.yDeep : C.yDk);
    gr.addColorStop(0.45, dark ? C.yDk : C.y);
    gr.addColorStop(1, dark ? C.yMid : C.yHi);
    g.fillStyle = gr; g.fill();
    g.strokeStyle = K.outCol; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke();
    // inner groove
    g.beginPath(); g.moveTo(0, -len * 0.08);
    g.quadraticCurveTo(bend * len * 0.15, -len * 0.55, bend * len * 0.7, -len * 0.85);
    g.strokeStyle = dark ? C.yDeep : C.yDk; g.lineWidth = lw * 0.7; g.lineCap = 'round'; g.stroke();
    g.restore();
  }

  function buildSprites(F, q) {
    if (K.real >= 0.5) return buildRealSprites(F, q);
    var S = { scales: [], locks: [], darkLocks: [], tails: [] };
    var lw = 2.4;
    for (var i = 0; i < 6; i++) {
      var R = rng(900 + i * 53), sp = F.sprite(190, 180, q, 95, 96), g = sp.g;
      // fabric panel (subtle raised plate with a satin sheen)
      g.save(); g.translate(0, 8);
      g.beginPath(); g.ellipse(0, 0, 52, 46, 0, 0, TAU);
      var pg = g.createRadialGradient(10, -18, 4, 0, 0, 56);
      pg.addColorStop(0, C.g); pg.addColorStop(0.6, C.gDk); pg.addColorStop(1, C.gDeep);
      g.fillStyle = pg; g.fill();
      g.beginPath(); g.ellipse(6, -16, 30, 9, -0.3, 0, TAU); g.fillStyle = 'rgba(160,240,190,0.16)'; g.fill();
      g.restore();
      limeStripes(g, -6 + (R() - 0.5) * 16, 18 + R() * 8, 46, 3 + (R() < 0.4 ? 1 : 0), -0.35 + R() * 0.4, lw);
      furRope(g, curlPath(R, 50), 24 + R() * 4, 1900 + i, lw);
      S.scales.push(sp);
    }
    for (var l = 0; l < 5; l++) {
      var R2 = rng(4000 + l * 17);
      var ls = F.sprite(120, 130, q, 60, 122);
      drawLock(ls.g, 95 + R2() * 20, 30 + R2() * 8, -0.35 - R2() * 0.25, lw, false);
      S.locks.push(ls);
      var ds = F.sprite(120, 130, q, 60, 122);
      drawLock(ds.g, 85 + R2() * 20, 28 + R2() * 8, -0.3 - R2() * 0.25, lw, true);
      S.darkLocks.push(ds);
      var ts = F.sprite(140, 190, q, 70, 182);
      drawLock(ts.g, 150 + R2() * 25, 36 + R2() * 8, -0.25 - R2() * 0.3, lw, false);
      S.tails.push(ts);
    }
    S.ear = buildEar(F, q);
    S.beard = buildBeard(F, q);
    return S;
  }

  function buildRealSprites(F, q) {
    var S = { scales: [], locks: [], darkLocks: [], tails: [] };
    for (var i = 0; i < 6; i++) {
      var R = rng(900 + i * 53), sp = F.sprite(190, 180, q, 95, 96), g = sp.g;
      g.save(); g.translate(0, 8); glossyPanel(g, 52, 47, 2000 + i); g.restore();
      furTrimReal(g, curlPath(R, 50), 14 + R() * 3, 3000 + i, { folds: 4 + (i % 3), dens: 1.2 });
      S.scales.push(sp);
    }
    for (var l = 0; l < 5; l++) {
      var R2 = rng(4000 + l * 17);
      var ls = F.sprite(130, 140, q, 65, 130);
      realLock(ls.g, 95 + R2() * 20, 30 + R2() * 8, -0.35 - R2() * 0.25, 4100 + l, false); S.locks.push(ls);
      var ds = F.sprite(130, 140, q, 65, 130);
      realLock(ds.g, 85 + R2() * 20, 28 + R2() * 8, -0.3 - R2() * 0.25, 4200 + l, true); S.darkLocks.push(ds);
      var ts = F.sprite(150, 200, q, 75, 190);
      realLock(ts.g, 150 + R2() * 25, 38 + R2() * 8, -0.25 - R2() * 0.3, 4300 + l, false); S.tails.push(ts);
    }
    S.ear = buildEar(F, q);
    S.beard = buildBeard(F, q);
    return S;
  }

  // --------------------------------------------------------- head drawing
  // bumpy cartoon fur ellipse (in current transform units)
  function furEllipse(g, cx, cy, rx, ry, rot, seed, o) {
    o = o || {};
    if (K.real >= 0.5) return realEllipse(g, cx, cy, rx, ry, rot, seed, o);
    var R = rng(seed), n = o.bumps || 16, amp = o.amp == null ? 0.09 : o.amp, lw = o.lw;
    var upx = o.upx == null ? 0 : o.upx, upy = o.upy == null ? -1 : o.upy;
    g.save(); g.translate(cx, cy); g.rotate(rot || 0);
    var cr = Math.cos(-(rot || 0)), sr = Math.sin(-(rot || 0));
    var ux = upx * cr - upy * sr, uy = upx * sr + upy * cr;
    var ph = R() * TAU;
    g.beginPath();
    for (var i = 0; i <= n; i++) {
      var a = ph + i / n * TAU, am = ph + (i - 0.5) / n * TAU;
      var x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      var k = 1 + amp * (1.6 + R() * 0.8);
      var mx = Math.cos(am) * rx * k, my = Math.sin(am) * ry * k;
      if (i === 0) g.moveTo(x, y); else g.quadraticCurveTo(mx, my, x, y);
    }
    g.closePath();
    if (o.glow) {
      g.save(); g.shadowColor = 'rgba(255,215,70,0.6)'; g.shadowBlur = o.glow;
      g.fillStyle = C.yMid; g.fill(); g.restore();
    }
    var cols = o.white ? ['#ffffff', '#f4f1e6', '#d9d3bf', '#a39c86'] : [C.yHi, C.y, C.yMid, C.yDk];
    var gr = g.createLinearGradient(ux * rx, uy * ry, -ux * rx, -uy * ry);
    gr.addColorStop(0, cols[0]); gr.addColorStop(0.35, cols[1]); gr.addColorStop(0.72, cols[2]); gr.addColorStop(1, cols[3]);
    g.fillStyle = gr; g.fill();
    g.strokeStyle = K.outCol; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke();
    // fur flicks
    g.strokeStyle = o.white ? '#b8b19c' : C.yDk; g.lineWidth = lw * 0.6; g.lineCap = 'round';
    var flicks = o.flicks == null ? 7 : o.flicks;
    for (var f = 0; f < flicks; f++) {
      var fa = R() * TAU, fr = Math.sqrt(R()) * 0.7;
      var fx = Math.cos(fa) * rx * fr, fy = Math.sin(fa) * ry * fr, fs = Math.min(rx, ry) * 0.16;
      g.beginPath(); g.moveTo(fx - fs, fy); g.quadraticCurveTo(fx, fy + fs * 0.8, fx + fs, fy - fs * 0.1); g.stroke();
    }
    // specular hotspot toward the light
    g.beginPath();
    g.ellipse(ux * rx * 0.42 - uy * rx * 0.12, uy * ry * 0.5, rx * 0.34, ry * 0.16, Math.atan2(uy, ux) + Math.PI / 2, 0, TAU);
    g.fillStyle = 'rgba(255,255,230,0.35)'; g.fill();
    g.restore();
  }

  function realEllipse(g, cx, cy, rx, ry, rot, seed, o) {
    var sp = plushFor(seed, o.white);
    var upx = o.upx == null ? 0 : o.upx, upy = o.upy == null ? -1 : o.upy;
    var cr = Math.cos(-(rot || 0)), sr = Math.sin(-(rot || 0));
    var ux = upx * cr - upy * sr, uy = upx * sr + upy * cr;
    g.save(); g.translate(cx, cy); g.rotate(rot || 0);
    g.scale(rx / 100, ry / 100);
    g.rotate(Math.atan2(ux * ry, -uy * rx));           // keep the lit side facing the stage light
    var k = 100 / sp.Rpx, w = sp.c.width * k;
    g.drawImage(sp.c, -w / 2, -w / 2, w, w);
    g.restore();
  }

  function eyeDecal(g, lw, t) {
    // glow
    var gl = g.createRadialGradient(0, 0, 30, 0, 0, 95);
    gl.addColorStop(0, 'rgba(140,255,160,0.35)'); gl.addColorStop(1, 'rgba(140,255,160,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 95, 0, TAU); g.fill();
    // plush donut
    furEllipse(g, 0, 2, 70, 66, 0, 71, { lw: lw, bumps: 20, amp: 0.08, flicks: 9 });
    // eye
    g.beginPath(); g.arc(4, 4, 44, 0, TAU); g.fillStyle = C.out; g.fill();
    var eg = g.createRadialGradient(-10, -10, 4, 4, 4, 42);
    eg.addColorStop(0, '#ffffff'); eg.addColorStop(0.7, C.cream); eg.addColorStop(1, '#bdb89c');
    g.beginPath(); g.arc(4, 4, 41, 0, TAU); g.fillStyle = eg; g.fill();
    g.save(); g.translate(10, 6);
    g.beginPath(); g.arc(0, 0, 31, 0, TAU); g.fillStyle = C.gLt; g.fill();
    g.lineWidth = lw; g.strokeStyle = K.outCol; g.stroke();
    g.beginPath(); g.arc(0, 0, 25, 0, TAU); g.fillStyle = C.limeHi; g.fill();
    g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fillStyle = C.gDeep; g.fill();
    g.beginPath();
    for (var i = 0; i <= 60; i++) {
      var u = i / 60, a = u * TAU * 1.7 + t * 0.6, rr = 19 * (1 - u * 0.82);
      i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(130,255,150,0.35)'; g.lineWidth = 9; g.stroke();
    g.strokeStyle = C.lime; g.lineWidth = 5; g.stroke();
    g.beginPath(); g.arc(0, 0, 5.5, 0, TAU); g.fillStyle = '#000'; g.fill();
    g.restore();
    g.beginPath(); g.ellipse(-12, -16, 11, 6, -0.6, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.95)'; g.fill();
    g.beginPath(); g.arc(22, 22, 3, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fill();
    // heavy brow
    furEllipse(g, -4, -52, 66, 24, -0.08, 72, { lw: lw, bumps: 14, amp: 0.12, flicks: 5 });
  }

  function crownDecal(g, lw, R, w, h, medal) {
    g.save();
    g.beginPath(); g.ellipse(0, 0, w, h, 0, 0, TAU);
    var gg = g.createLinearGradient(0, -h, 0, h);
    gg.addColorStop(0, C.gHi); gg.addColorStop(0.4, C.gLt); gg.addColorStop(1, C.g);
    g.fillStyle = gg; g.fill();
    g.strokeStyle = K.outCol; g.lineWidth = lw; g.stroke();
    g.clip();
    // painted scrolls
    g.lineCap = 'round';
    for (var i = 0; i < 9; i++) {
      var x = (R() * 2 - 1) * w * 0.75, y = (R() * 2 - 1) * h * 0.7, r = 8 + R() * 10, dir = R() < 0.5 ? 1 : -1, a0 = R() * TAU;
      g.beginPath();
      for (var k = 0; k <= 30; k++) {
        var u = k / 30, a = a0 + dir * u * TAU * 1.4, rr = r * (1 - u * 0.8);
        k ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.strokeStyle = C.gDk; g.lineWidth = 4.5; g.stroke();
      g.strokeStyle = [C.limeHi, C.gold, C.lime][i % 3]; g.lineWidth = 2.4; g.stroke();
    }
    // sheen
    g.beginPath(); g.ellipse(-w * 0.1, -h * 0.55, w * 0.7, h * 0.25, 0, 0, TAU); g.fillStyle = 'rgba(230,255,230,0.22)'; g.fill();
    g.restore();
    if (medal) {
      g.save(); g.translate(-w * 0.35, h * 0.35);
      [[20, C.out], [18, C.gold], [13, C.gDk], [9, C.cream], [5, C.gLt]].forEach(function (rc) {
        g.beginPath(); g.arc(0, 0, rc[0], 0, TAU); g.fillStyle = rc[1]; g.fill();
      });
      g.restore();
    }
  }

  function buildEar(F, q) {
    var sp = F.sprite(140, 120, q, 70, 64), g = sp.g;
    g.beginPath(); g.ellipse(0, 0, 44, 36, -0.25, 0, TAU); g.fillStyle = C.out; g.fill();
    var eg = g.createRadialGradient(-4, 4, 3, 0, 4, 36);
    eg.addColorStop(0, C.g); eg.addColorStop(1, C.gDeep);
    g.beginPath(); g.ellipse(2, 4, 32, 24, -0.25, 0, TAU); g.fillStyle = eg; g.fill();
    var pts = [];
    for (var i = 0; i <= 20; i++) { var a = lerp(Math.PI * 0.85, Math.PI * 2.15, i / 20); pts.push([Math.cos(a) * 44, Math.sin(a) * 36]); }
    if (K.real >= 0.5) furTrimReal(g, pts, 14, 555, { folds: 3, dens: 1.3, noGlow: true }); else furRope(g, pts, 22, 555, 2.4);
    return sp;
  }
  function earDecal(g, lw) {
    var sp = K.ear; if (!sp) return;
    var k = 1 / sp.q;
    g.save(); g.scale(k, k); g.drawImage(sp.c, -sp.ox * sp.q, -sp.oy * sp.q); g.restore();
  }

  function pompom(g, x, y, r, lw) {
    g.beginPath(); g.arc(x, y, r + lw, 0, TAU); g.fillStyle = C.out; g.fill();
    var gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    gr.addColorStop(0, '#b6f5ae'); gr.addColorStop(0.5, '#3fb35a'); gr.addColorStop(1, '#0f4a24');
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = gr; g.fill();
    g.beginPath(); g.arc(x + r * 0.2, y, r * 0.52, 0, TAU); g.strokeStyle = C.cream; g.lineWidth = r * 0.14; g.stroke();
    g.beginPath(); g.arc(x + r * 0.22, y, r * 0.3, 0, TAU); g.fillStyle = C.red; g.fill();
    g.beginPath(); g.arc(x + r * 0.28, y - r * 0.06, r * 0.12, 0, TAU); g.fillStyle = C.pink; g.fill();
    g.beginPath(); g.ellipse(x - r * 0.38, y - r * 0.42, r * 0.28, r * 0.16, -0.5, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.75)'; g.fill();
  }

  // --------------------------------------------------------------- dragon
  function Dragon(opts) {
    opts = opts || {};
    this.F = new Factory(opts);
    this.dpr = opts.dpr || 1;
    this.detail = opts.detail || 1.4;
    this.headScale = opts.headScale || 1.3;
    this.realism = opts.realism == null ? 1 : opts.realism;
    this.q = 0; this.S = null;
  }
  Dragon.prototype._ctx = function () {
    K.real = clamp(this.realism, 0, 1); K.F = this.F; K.dpr = this.dpr;
    K.outCol = 'rgba(27,21,3,' + (1 - K.real * 0.72).toFixed(3) + ')';
  };
  Dragon.prototype._ensure = function (Rmax) {
    this._ctx();
    var want = clamp((Rmax * this.dpr * this.detail) / DR, 0.2, 2.5);
    var mode = K.real >= 0.5;
    if (this.S && this.mode === mode && Math.abs(want - this.q) / this.q < 0.3) { K.ear = this.S.ear; K.beard = this.S.beard; return; }
    this.q = want; this.mode = mode; this.S = buildSprites(this.F, want); K.ear = this.S.ear; K.beard = this.S.beard;
    K.cache = {}; K.cacheQ = 0;
  };
  // change realism at runtime: 0 = cartoon, 1 = most realistic
  Dragon.prototype.setRealism = function (v) { this.realism = v; };
  Dragon.prototype.prepare = function (Rmax) {
    this._ensure(Rmax);
    if (K.real < 0.5) return;
    K.cacheQ = (Rmax / DR) * this.headScale * this.dpr * 1.25;
    [301, 302, 303, 304, 399, 401, 304 + 1, 305 - 1 + 0].forEach(function (sd) { plushFor(sd, false); });
    [306, 409, 411].forEach(function (sd) { plushFor(sd, false); });
    [520, 521].forEach(function (sd) { plushFor(sd, true); });
  };

  Dragon.prototype.draw = function (ctx, st) {
    var segs = st.segs, N = segs.length;
    if (!N) return;
    var t = st.t || 0, roar = st.roar || 0, pearl = st.pearl;
    var cum = [0], Rmax = 0, i;
    for (i = 0; i < N; i++) {
      if (i) cum.push(cum[i - 1] + Math.hypot(segs[i].x - segs[i - 1].x, segs[i].y - segs[i - 1].y));
      if (segs[i].r > Rmax) Rmax = segs[i].r;
    }
    if (Rmax <= 0) return;
    var total = cum[N - 1];
    this._ensure(Rmax);
    var S = this.S, U = Rmax / DR;
    var LW = Math.max(1.3, Rmax * 0.055);   // outline width in px

    // roll angle per segment: f=1 -> 0 (right side showing), f=-1 -> PI (left side)
    var rho = [];
    for (i = 0; i < N; i++) rho.push(Math.acos(clamp(segs[i].f == null ? 1 : segs[i].f, -1, 1)));

    function at(s) {
      s = clamp(s, 0, total);
      var lo = 0, hi = N - 1;
      while (hi - lo > 1) { var md = (lo + hi) >> 1; if (cum[md] <= s) lo = md; else hi = md; }
      var a = segs[lo], b = segs[hi], sp = cum[hi] - cum[lo], r = sp ? (s - cum[lo]) / sp : 0;
      return { x: lerp(a.x, b.x, r), y: lerp(a.y, b.y, r), a: a.a + wrap(b.a - a.a) * r, r: lerp(a.r, b.r, r), rho: lerp(rho[lo], rho[hi], r) };
    }
    // point on the tube surface: psi measured from the back (0) toward this
    // dragon's right side (+PI/2) and belly (PI). Returns screen pos + depth.
    function surf(p, psi, k) {
      var pp = psi + p.rho, off = Math.cos(pp) * p.r * (k || 1);
      var nx = Math.sin(p.a), ny = -Math.cos(p.a);
      return { x: p.x + nx * off, y: p.y + ny * off, depth: Math.sin(pp), up: Math.cos(pp) };
    }
    function stamp(sp, x, y, a, sy, rot, sc, fx) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(a); ctx.scale(1, sy);
      if (rot) ctx.rotate(rot);
      var k = sc / sp.q;
      ctx.scale(fx ? -k : k, k);
      ctx.drawImage(sp.c, -sp.ox * sp.q, -sp.oy * sp.q);
      ctx.restore();
    }

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';

    var neck = Rmax * 0.4, tailLen = Math.min(total * 0.12, Rmax * 3.2);

    // ---- collect fringe locks (crest on the back, fringe on the belly)
    var locksBack = [], locksFront = [], gapL = 30 * U, n = 0;
    for (var sl = neck; sl < total - Rmax * 0.3; sl += gapL, n++) {
      var pl = at(sl), tl = pl.r / Rmax;
      if (tl < 0.1) continue;
      tl = Math.max(tl, 0.3);
      var sway = Math.sin(t * 2.4 + n * 0.8) * 0.12;
      // crest (psi = 0)
      var cst = surf(pl, 0, 0.9);
      var crest = { sp: S.locks[n % S.locks.length], x: cst.x, y: cst.y, a: pl.a, sy: sgnMin(cst.up, 0.16),
        rot: -0.45 + sway + (hash(n) - 0.5) * 0.3, sc: U * tl * (0.62 + hash(n + 7) * 0.3) };
      (cst.depth > 0.45 ? locksFront : locksBack).push(crest);
      // belly (psi = PI)
      if (n % 2 === 0) {
        var bl = surf(pl, Math.PI, 0.88);
        locksBack.push({ sp: S.darkLocks[n % S.darkLocks.length], x: bl.x, y: bl.y, a: pl.a, sy: sgnMin(bl.up, 0.16),
          rot: -0.6 + sway, sc: U * tl * (0.45 + hash(n + 3) * 0.2) });
      }
    }
    function drawLocks(list) { list.forEach(function (L) { stamp(L.sp, L.x, L.y, L.a, L.sy, L.rot, L.sc, false); }); }

    // ---- 1. glow halo around the whole body
    ctx.save();
    ctx.shadowColor = 'rgba(255,212,60,0.55)';
    ctx.shadowBlur = Rmax * 1.3;
    ribbon(ctx, segs, 1.02);
    ctx.fillStyle = C.gDk; ctx.fill();
    ctx.restore();

    // ---- 2. locks that sit behind the body
    drawLocks(locksBack);

    // ---- 3. tail fan (flat fan in the body plane, foreshortens with roll)
    var tp = at(total - Rmax * 0.15), tailUp = sgnMin(Math.cos(tp.rho), 0.2);
    for (var tt = 0; tt < 7; tt++) {
      var spread = (tt - 3) * 0.26 + Math.sin(t * 3 + tt * 0.9) * 0.1;
      stamp(S.tails[tt % S.tails.length], tp.x, tp.y, tp.a, tailUp, -Math.PI / 2 + spread, U * (0.95 - Math.abs(tt - 3) * 0.08), tt > 3);
    }

    // ---- 4. body tube: base, cylinder shading, light from the top of screen
    ribbon(ctx, segs, 1);
    var bg = C.gDk; ctx.fillStyle = bg; ctx.fill();
    band(ctx, segs, function () { return -0.62; }, function () { return 0.62; }, 'rgba(23,97,58,0.9)');
    band(ctx, segs, function () { return -0.3; }, function () { return 0.3; }, 'rgba(47,152,88,0.35)');
    // screen-top highlight / bottom shadow (tie to where "up" is on screen)
    band(ctx, segs, function (s) { return 0.35 * Math.cos(s.a); }, function (s) { return 0.85 * Math.cos(s.a); }, 'rgba(150,240,180,0.22)');
    band(ctx, segs, function (s) { return -0.55 * Math.cos(s.a); }, function (s) { return -1 * Math.cos(s.a); }, 'rgba(0,0,0,0.35)');

    // ---- 5. scales on the visible side of the tube
    var rows = [0.72, 1.45, 2.2];
    var colGap = 88 * U, cols = [];
    for (var sc = neck * 0.8; sc < total - tailLen * 0.55; sc += colGap) cols.push(sc);
    for (var ci = cols.length - 1; ci >= 0; ci--) {
      var list = [];
      for (var side = -1; side <= 1; side += 2) {
        for (var ri = 0; ri < rows.length; ri++) {
          var hid = ci * 11 + ri * 3 + (side > 0 ? 0 : 50);
          var sA = cols[ci] + (ri % 2 ? colGap * 0.5 : 0) + (hash(hid) - 0.5) * colGap * 0.2;
          if (sA > total - tailLen * 0.55) continue;
          var p = at(sA), tpr = p.r / Rmax;
          if (tpr < 0.26) continue;
          var psi = side * rows[ri];
          var q = surf(p, psi, 0.86);
          if (q.depth < 0.1) continue;
          list.push({ q: q, p: p, side: side, hid: hid, tp: tpr });
        }
      }
      list.sort(function (a, b) { return a.q.depth - b.q.depth; });
      for (var li = 0; li < list.length; li++) {
        var it = list[li];
        var squash = Math.pow(it.q.depth, 0.75) * it.side;
        var wig = Math.sin(t * 1.7 + ci * 0.9 + li) * 0.05;
        stamp(S.scales[Math.floor(hash(it.hid + 2) * S.scales.length)], it.q.x, it.q.y, it.p.a, squash, wig,
          U * it.tp * (0.9 + hash(it.hid + 4) * 0.15), false);
      }
    }

    // ---- 5b. sequin sparkle on the visible fabric (realistic mode)
    if (K.real >= 0.5) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (var sq = neck, sk = 0; sq < total - tailLen * 0.3; sq += 9 * U, sk++) {
        var ps2 = at(sq), psi2 = (hash(sk + 900) * 2 - 1) * 2.6, qq = surf(ps2, psi2, 0.85);
        if (qq.depth < 0.2) continue;
        var tw = Math.max(0, Math.sin(t * 3.1 + sk * 2.7));
        var al = (0.15 + 0.7 * tw * tw) * qq.depth;
        ctx.fillStyle = 'rgba(235,255,240,' + al.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(qq.x, qq.y, (0.6 + hash(sk + 901) * 1.1) * Math.max(1, Rmax / 30), 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // ---- 6. outline (hard in cartoon mode, soft in realistic mode)
    ribbon(ctx, segs, 1);
    ctx.strokeStyle = K.outCol; ctx.lineWidth = LW; ctx.lineJoin = 'round'; ctx.stroke();

    // ---- 7. crest locks facing the viewer
    drawLocks(locksFront);

    // ---- 8. additive glow near the pearl
    if (pearl) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (var gs = 0; gs < total; gs += Rmax * 0.8) {
        var pg = at(gs), d = Math.hypot(pg.x - pearl.x, pg.y - pearl.y), lit = clamp(1 - d / (Rmax * 11), 0, 1);
        if (lit <= 0) continue;
        var rg = ctx.createRadialGradient(pg.x, pg.y, 0, pg.x, pg.y, pg.r * 2.2);
        rg.addColorStop(0, 'rgba(255,236,140,' + 0.32 * lit + ')'); rg.addColorStop(1, 'rgba(255,236,140,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(pg.x, pg.y, pg.r * 2.2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // ---- 9. head
    drawHead(ctx, st, U * this.headScale, LW, t, roar, pearl, Rmax, segs);

    ctx.restore();
  };

  // --------------------------------------------------------------- 3D head
  // ------------------------------------------------------ head pieces
  // Southern lion head, built like the real costume: a painted shell with
  // separate fur pieces (brow rolls, lip roll, jaw roll, beard) attached.
  var NAVY = '#0c1426', GOLD1 = '#f4cf45', GOLD2 = '#b88410';

  // big lion eye: navy socket, thick white D-ring, navy ball with lashes,
  // gold ring iris, gold lower lid. Authored ~60 units wide.
  function lionEye(g, lw, t, gx) {
    g.save();
    // glow
    var gl = g.createRadialGradient(0, 0, 20, 0, 0, 90);
    gl.addColorStop(0, 'rgba(255,230,120,0.22)'); gl.addColorStop(1, 'rgba(255,230,120,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 90, 0, TAU); g.fill();
    // gold lower lid (metallic rim under the eye)
    g.beginPath(); g.ellipse(2, 10, 66, 52, -0.08, 0, Math.PI); g.closePath();
    var lg = g.createLinearGradient(0, 10, 0, 62); lg.addColorStop(0, GOLD1); lg.addColorStop(1, GOLD2);
    g.fillStyle = lg; g.fill(); g.strokeStyle = K.outCol; g.lineWidth = lw; g.stroke();
    // navy socket with sheen
    g.beginPath(); roundedD(g, 0, 0, 62, 50);
    var sg = g.createLinearGradient(0, -50, 0, 50);
    sg.addColorStop(0, '#34466e'); sg.addColorStop(0.45, '#15213d'); sg.addColorStop(1, '#070b16');
    g.fillStyle = sg; g.fill(); g.strokeStyle = '#000'; g.lineWidth = lw * 1.2; g.stroke();
    // thick white D-shaped ring
    g.beginPath(); roundedD(g, 2, 2, 50, 40);
    g.fillStyle = '#f6f5ef'; g.fill();
    g.beginPath(); roundedD(g, 4, 3, 38, 30);
    // navy eyeball
    var eg = g.createRadialGradient(-6, -12, 3, 4, 4, 40);
    eg.addColorStop(0, '#3a5184'); eg.addColorStop(0.5, '#142347'); eg.addColorStop(1, '#050913');
    g.fillStyle = eg; g.fill();
    g.save(); g.clip();
    // fine dark lashes radiating inside the ball
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1;
    for (var i = 0; i < 20; i++) {
      var a = i / 20 * TAU;
      g.beginPath(); g.moveTo(4 + Math.cos(a) * 16, 3 + Math.sin(a) * 13); g.lineTo(4 + Math.cos(a) * 40, 3 + Math.sin(a) * 32); g.stroke();
    }
    g.restore();
    // gold ring iris (looks slightly toward gx)
    var ix = 10 + gx * 6, iy = 8;
    g.beginPath(); g.arc(ix, iy, 17, 0, TAU); g.fillStyle = '#000'; g.fill();
    var ig = g.createLinearGradient(ix - 15, iy - 15, ix + 15, iy + 15);
    ig.addColorStop(0, '#fff0a0'); ig.addColorStop(0.4, GOLD1); ig.addColorStop(1, GOLD2);
    g.beginPath(); g.arc(ix, iy, 15.5, 0, TAU); g.fillStyle = ig; g.fill();
    g.beginPath(); g.arc(ix - 1, iy, 10, 0, TAU); g.fillStyle = '#f3efd8'; g.fill();
    g.beginPath(); g.arc(ix - 2, iy, 7.5, 0, TAU); g.fillStyle = '#122040'; g.fill();
    g.beginPath(); g.arc(ix - 2, iy, 4, 0, TAU); g.fillStyle = '#000'; g.fill();
    g.beginPath(); g.ellipse(ix - 6, iy - 5, 3.5, 2.2, -0.6, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.95)'; g.fill();
    // glassy highlight on the socket
    g.beginPath(); g.ellipse(-18, -24, 16, 6, -0.4, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
    // thin green accent line around the socket (keeps the green theme)
    g.beginPath(); roundedD(g, 0, 0, 65, 53); g.strokeStyle = C.lime; g.lineWidth = lw * 0.8; g.stroke();
    g.restore();
  }
  // D shape: flat-ish back edge, rounded front, slightly peaked top-front
  function roundedD(g, cx, cy, rx, ry) {
    g.moveTo(cx - rx * 0.8, cy - ry * 0.55);
    g.bezierCurveTo(cx - rx * 0.4, cy - ry * 1.12, cx + rx * 0.7, cy - ry * 1.1, cx + rx, cy - ry * 0.2);
    g.bezierCurveTo(cx + rx * 1.1, cy + ry * 0.6, cx + rx * 0.5, cy + ry * 1.05, cx - rx * 0.1, cy + ry);
    g.bezierCurveTo(cx - rx * 0.75, cy + ry * 0.95, cx - rx * 1.02, cy + ry * 0.3, cx - rx * 0.8, cy - ry * 0.55);
    g.closePath();
  }

  // painted ruyi-cloud panel: white fluffy border, gold foil, green fill, navy line
  function cloudPanel(g, lw, w, h, seed) {
    var R = rng(seed);
    g.save();
    // white plush border
    g.beginPath(); cloudPath(g, w, h, 1.0);
    g.fillStyle = '#fbfaf4'; g.fill();
    g.strokeStyle = K.outCol; g.lineWidth = lw; g.stroke();
    if (K.real >= 0.5) {
      g.save(); g.clip();
      for (var f = 0; f < 90; f++) {
        var fx = (R() * 2 - 1) * w, fy = (R() * 2 - 1) * h;
        strand(g, fx, fy, R() * TAU, 5 + R() * 6, 1.4, 0.2, 'rgba(210,205,190,' + (0.3 + R() * 0.4) + ')');
      }
      g.restore();
    }
    // gold foil inner
    g.beginPath(); cloudPath(g, w * 0.78, h * 0.7, 0.9);
    var gg = g.createLinearGradient(-w, -h, w, h);
    gg.addColorStop(0, '#fff3a8'); gg.addColorStop(0.5, GOLD1); gg.addColorStop(1, GOLD2);
    g.fillStyle = gg; g.fill(); g.strokeStyle = NAVY; g.lineWidth = lw * 1.1; g.stroke();
    // green fill
    g.beginPath(); cloudPath(g, w * 0.55, h * 0.45, 0.8);
    var fg = g.createLinearGradient(0, -h, 0, h);
    fg.addColorStop(0, C.gHi); fg.addColorStop(1, C.g);
    g.fillStyle = fg; g.fill(); g.strokeStyle = NAVY; g.lineWidth = lw; g.stroke();
    // navy scroll
    g.beginPath();
    for (var k = 0; k <= 30; k++) {
      var u = k / 30, a = u * TAU * 1.3, rr = h * 0.32 * (1 - u * 0.8);
      k ? g.lineTo(w * 0.1 + Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(w * 0.1 + Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.strokeStyle = NAVY; g.lineWidth = lw * 1.2; g.lineCap = 'round'; g.stroke();
    // foil glint
    g.beginPath(); g.ellipse(-w * 0.35, -h * 0.35, w * 0.18, h * 0.08, -0.4, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill();
    g.restore();
  }
  function cloudPath(g, w, h, k) {
    // three-lobed cloud
    g.moveTo(-w, h * 0.2);
    g.bezierCurveTo(-w * 1.05, -h * 0.7, -w * 0.4, -h * 1.05, -w * 0.1, -h * 0.55);
    g.bezierCurveTo(w * 0.1, -h * 1.1 * k, w * 0.85, -h * 1.0, w * 0.8, -h * 0.2);
    g.bezierCurveTo(w * 1.1, h * 0.1, w * 0.9, h * 0.95, w * 0.3, h * 0.85);
    g.bezierCurveTo(w * 0.05, h * 1.1, -w * 0.5, h * 1.05, -w * 0.6, h * 0.75);
    g.bezierCurveTo(-w * 0.95, h * 0.9, -w * 1.05, h * 0.6, -w, h * 0.2);
    g.closePath();
  }

  // green/black striped fuzzy pompom with a white fluffy cap facing forward
  function stripedPompom(g, x, y, r, lw, t, seed) {
    var R = rng(seed);
    g.save(); g.translate(x, y + Math.sin(t * 5 + seed) * r * 0.08); // springy wobble
    // stalk
    g.strokeStyle = '#8a8f96'; g.lineWidth = r * 0.18; g.beginPath(); g.moveTo(-r * 0.6, r * 0.9); g.lineTo(0, 0); g.stroke();
    g.beginPath(); g.arc(0, 0, r + lw, 0, TAU); g.fillStyle = K.outCol; g.fill();
    var bg = g.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
    bg.addColorStop(0, '#2f8a48'); bg.addColorStop(1, '#06200f');
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fillStyle = bg; g.fill();
    g.save(); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.clip();
    // curved stripes wrapping the ball
    for (var k = -2; k <= 2; k++) {
      g.beginPath(); g.ellipse(r * 0.35 + k * r * 0.42, 0, r * 0.22, r * 1.05, 0, 0, TAU);
      g.fillStyle = k % 2 ? '#0a0f0b' : '#2a9a4c'; g.fill();
    }
    // fuzz
    for (var i = 0; i < 110; i++) {
      var a = R() * TAU, u = Math.sqrt(R()) * r;
      strand(g, Math.cos(a) * u, Math.sin(a) * u, a, r * 0.22, 0.9, 0, 'rgba(130,220,140,' + (0.1 + R() * 0.2) + ')');
    }
    g.restore();
    // white fluffy cap on the front
    g.beginPath(); g.ellipse(r * 0.45, -r * 0.05, r * 0.42, r * 0.55, 0, 0, TAU);
    g.fillStyle = '#fbfbf6'; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = lw * 0.6; g.stroke();
    for (var j = 0; j < 40; j++) {
      var aa = R() * TAU, uu = Math.sqrt(R()) * r * 0.42;
      strand(g, r * 0.45 + Math.cos(aa) * uu, Math.sin(aa) * uu * 1.2, aa, r * 0.16, 0.9, 0, 'rgba(205,205,195,' + (0.3 + R() * 0.4) + ')');
    }
    g.beginPath(); g.ellipse(-r * 0.4, -r * 0.45, r * 0.25, r * 0.12, -0.5, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
    g.restore();
  }

  // horn on the forehead with a white fluff collar
  function horn(g, lw, t) {
    g.save();
    furEllipse(g, 0, 0, 30, 16, 0, 520, { lw: lw, white: true, bumps: 12, amp: 0.14, flicks: 3 });
    g.beginPath();
    g.moveTo(-14, -6); g.bezierCurveTo(-16, -40, 4, -62, 18, -70);
    g.bezierCurveTo(14, -52, 18, -30, 14, -6); g.closePath();
    var hg = g.createLinearGradient(-16, 0, 18, -70);
    hg.addColorStop(0, C.g); hg.addColorStop(0.5, GOLD1); hg.addColorStop(1, '#fff5b8');
    g.fillStyle = hg; g.fill(); g.strokeStyle = K.outCol; g.lineWidth = lw; g.stroke();
    // white pompom tip
    furEllipse(g, 18, -72, 12, 11, 0, 521, { lw: lw, white: true, bumps: 10, amp: 0.15, flicks: 1 });
    g.restore();
  }

  // the painted shell (not fur): green gloss with scallop lines
  function shell(g, cx, cy, rx, ry, lw, upx, upy, seed) {
    g.save(); g.translate(cx, cy);
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU);
    var sg = g.createLinearGradient(upx * rx, upy * ry, -upx * rx, -upy * ry);
    sg.addColorStop(0, C.gHi); sg.addColorStop(0.35, C.gLt); sg.addColorStop(0.75, C.g); sg.addColorStop(1, C.gDk);
    g.fillStyle = sg; g.fill(); g.strokeStyle = K.outCol; g.lineWidth = lw; g.stroke();
    g.clip();
    var R = rng(seed);
    g.lineCap = 'round';
    for (var i = 0; i < 7; i++) {
      var x = (R() * 2 - 1) * rx * 0.8, y = (R() * 2 - 1) * ry * 0.7, r = 10 + R() * 12, a0 = R() * TAU;
      g.beginPath();
      for (var k = 0; k <= 28; k++) { var u = k / 28, a = a0 + u * TAU * 1.3, rr = r * (1 - u * 0.8); k ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      g.strokeStyle = 'rgba(8,30,16,0.6)'; g.lineWidth = 4.5; g.stroke();
      g.strokeStyle = [GOLD1, C.limeHi, C.lime][i % 3]; g.lineWidth = 2.2; g.stroke();
    }
    g.beginPath(); g.ellipse(upx * rx * 0.35, upy * ry * 0.5, rx * 0.5, ry * 0.18, 0, 0, TAU);
    g.fillStyle = 'rgba(230,255,235,0.2)'; g.fill();
    g.restore();
  }

  // long straight yellow beard fringe (sprite), anchor top-center
  function buildBeard(F, q) {
    var sp = F.sprite(300, 190, q, 150, 12), g = sp.g, R = rng(8080);
    if (K.real >= 0.5) {
      for (var p = 0; p < 3; p++) {
        for (var i = 0; i < 520; i++) {
          var x = (R() - 0.5) * 260, edge = 1 - Math.abs(x) / 130;
          var len = (45 + R() * 85) * (0.35 + Math.pow(edge, 0.7) * 0.65);
          var by = 36 * Math.sqrt(Math.max(0, 1 - Math.pow(x / 132, 2))) - 4;
          var tv = p === 0 ? 0.3 + R() * 0.2 : p === 1 ? 0.55 + R() * 0.25 : 0.8 + R() * 0.2;
          strand(g, x, by + R() * 6, Math.PI / 2 + (R() - 0.5) * 0.12 + x * 0.0012, len * (p === 2 ? 0.8 : 1), p === 0 ? 3 : 2, (R() - 0.5) * 0.15, rgba(tone(tv), 0.6 + R() * 0.4));
        }
      }
    } else {
      for (var j = 0; j < 22; j++) {
        var bx = -120 + j * 11.5, bl = 90 + R() * 60;
        g.save(); g.translate(bx, 36 * Math.sqrt(Math.max(0, 1 - Math.pow(bx / 132, 2))) - 4); g.scale(1, -1);
        drawLock(g, bl, 14, (R() - 0.5) * 0.15, 2.2, j % 3 === 0);
        g.restore();
      }
    }
    return sp;
  }

  // --------------------------------------------------------------- 3D head
  function drawHead(ctx, st, HU, LWpx, t, roar, pearl, Rmax, segs) {
    var head = st.head || {};
    var hx = head.x != null ? head.x : segs[0].x, hy = head.y != null ? head.y : segs[0].y;
    var ha = head.a != null ? head.a : segs[0].a;
    var flip = head.flip != null ? head.flip : (segs[0].f == null ? 1 : segs[0].f);
    var rho = Math.acos(clamp(flip, -1, 1)), cr = Math.cos(rho), sr = Math.sin(rho);
    var bob = Math.sin(t * 2.2) * 0.035;
    var wantQ = HU * K.dpr * 1.25;
    if (!K.cacheQ || Math.abs(wantQ - K.cacheQ) / K.cacheQ > 0.3) { K.cache = {}; K.cacheQ = wantQ; }
    var lw = LWpx / HU;
    var la = ha + bob;
    var upx = -Math.sin(la), upy = -Math.cos(la);

    // x forward, Y up, Z = right side. Roll about x.
    function P(x, Y, Z) { return { x: x, y: -(Y * cr - Z * sr), d: Z * cr + Y * sr }; }
    function projR(ry, rz) { return Math.sqrt(ry * ry * cr * cr + rz * rz * sr * sr); }
    var parts = [];
    function add(d, fn) { parts.push({ d: d, fn: fn }); }
    function fur(cx, cY, rx, ry, rz, bias, seed, o) {
      var p = P(cx, cY, 0), ryp = projR(ry, rz); o = o || {};
      add(p.d + bias, function () {
        furEllipse(ctx, p.x, p.y, rx, ryp, (o.rot || 0) * (cr >= 0 ? 1 : -1), seed,
          { lw: lw, bumps: o.bumps || 18, amp: o.amp, upx: upx, upy: upy, flicks: o.flicks, white: o.white });
      });
    }
    function decal(x, Y, Z, phi, bias, fn, minFace) {
      var p = P(x, Y, Z), face = Math.sin(phi + rho), side = phi >= 0 ? 1 : -1;
      if (face < 0.06 && !minFace) return;
      var sq = minFace ? sgnMin(face, minFace) * side : face * side;
      add(p.d + bias, function () { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, sq); fn(); ctx.restore(); });
    }
    // cranium shell
    var CX = 125, CY = 45, CRX = 145, CRY = 118, CRZ = 102;
    function onShell(x, phi, k) {
      var e = Math.sqrt(Math.max(0, 1 - Math.pow((x - CX) / CRX, 2))) * (k || 1);
      return [x, CY + CRY * e * Math.cos(phi), CRZ * e * Math.sin(phi)];
    }

    ctx.save();
    ctx.translate(hx, hy); ctx.rotate(la); ctx.scale(HU, HU);

    // soft glow behind the head
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    var hg = ctx.createRadialGradient(170, 0, 40, 170, 0, 300);
    hg.addColorStop(0, 'rgba(255,214,70,0.26)'); hg.addColorStop(1, 'rgba(255,214,70,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(170, 0, 300, 0, TAU); ctx.fill();
    ctx.restore();

    var jawOpen = 0.08 + 0.07 * (Math.sin(t * 1.3) * 0.5 + 0.5) + roar * 0.4;
    function jawPt(x, Y) { // rotate a point around the hinge (115, -40)
      var dx = x - 115, dy = Y + 30, c = Math.cos(-jawOpen), s2 = Math.sin(-jawOpen);
      return [115 + dx * c - dy * s2, -30 + dx * s2 + dy * c];
    }

    // --- mouth interior (red throat, teeth)
    var mc = P(262, -44, 0), mry = projR(20, 70);
    add(-70, function () {
      ctx.beginPath(); ctx.ellipse(mc.x, mc.y, 106, mry + 6, 0, 0, TAU);
      var mg = ctx.createRadialGradient(mc.x, mc.y, 5, mc.x, mc.y, 112);
      mg.addColorStop(0, '#8a1c20'); mg.addColorStop(0.6, '#4a0e12'); mg.addColorStop(1, '#120405');
      ctx.fillStyle = mg; ctx.fill();
      // tongue
      ctx.beginPath(); ctx.ellipse(mc.x + 10, mc.y + mry * 0.4, 50, Math.max(4, mry * 0.35), 0, 0, TAU); ctx.fillStyle = '#c23a45'; ctx.fill();
    });

    // --- beard fringe hanging from the jaw
    var bj = jawPt(248, -76), bp = P(bj[0], bj[1], 0);
    add(-60, function () {
      var sp = K.beard; if (!sp) return;
      ctx.save(); ctx.translate(bp.x, bp.y);
      ctx.rotate(-jawOpen * 0.5 * (cr >= 0 ? 1 : -1) + Math.sin(t * 1.9) * 0.04);
      ctx.scale(1, sgnMin(cr, 0.15));
      var k = 1 / sp.q; ctx.scale(k, k);
      ctx.drawImage(sp.c, -sp.ox * sp.q, -sp.oy * sp.q);
      ctx.restore();
    });

    // --- lower jaw: the biggest fur roll
    var jc = jawPt(248, -76);
    fur(jc[0], jc[1], 130, 42, 88, -50, 301, { rot: jawOpen, bumps: 18, amp: 0.1 });

    // --- back of head / mane and side cheek fur
    fur(20, -5, 95, 118, 116, -30, 302, { bumps: 18, amp: 0.12, flicks: 8 });
    [1, -1].forEach(function (s) {
      var ck = onShell(115, 1.75 * s, 1.04);
      decal(ck[0], ck[1], ck[2], 1.75 * s, 3, function () {
        furEllipse(ctx, 0, 0, 105, 62, 0.1, 400 + s, { lw: lw, bumps: 16, amp: 0.1, upx: 0, upy: -1 });
      });
      var lc = onShell(135, 2.35 * s, 1.03);
      decal(lc[0], lc[1], lc[2], 2.35 * s, 2, function () {
        furEllipse(ctx, 0, 0, 110, 52, -0.05, 410 + s, { lw: lw, bumps: 16, amp: 0.1, upx: 0, upy: -1 });
      });
    });

    // --- the painted shell (cranium)
    var sc = P(CX, CY, 0), sry = projR(CRY, CRZ);
    add(0, function () { shell(ctx, sc.x, sc.y, CRX, sry, lw, upx, upy, 909); });

    // side panel painting + medallion
    [1, -1].forEach(function (s) {
      var c = onShell(95, 1.15 * s, 0.98);
      decal(c[0], c[1], c[2], 1.15 * s, 2, function () { crownDecal(ctx, lw, rng(778), 62, 42, true); });
    });

    // --- ears (fur rim, white edge) at the top back
    [1, -1].forEach(function (s) {
      var ea = onShell(55, 0.7 * s, 0.9);
      decal(ea[0], ea[1] + 58 * Math.cos(0.7), ea[2] + 58 * Math.sin(0.7 * s), 1.25 * s, -2, function () { earDecal(ctx, lw); }, 0.5);
    });

    // --- snout shell (painted), with cloud panels and the upper lip roll
    var nc = P(298, 28, 0), nry = projR(56, 60);
    add(6, function () { shell(ctx, nc.x, nc.y, 70, nry, lw, upx, upy, 910); });
    [1, -1].forEach(function (s) {
      decal(262, 16, 60 * s, 1.35 * s, 8, function () { cloudPanel(ctx, lw, 54, 30, 611); });
      decal(335, 40, 40 * s, 0.9 * s, 9, function () { cloudPanel(ctx, lw, 34, 22, 612); });
    });
    // nose top panel (seen when rolling)
    decal(310, 80, 0, 0.0001, 9, function () { cloudPanel(ctx, lw, 60, 30, 613); });
    // upper lip fur roll across the front
    fur(302, -12, 92, 30, 76, 12, 303, { bumps: 18, amp: 0.1, flicks: 6 });

    // --- brow rolls: thick fur over each eye, merging over the forehead
    fur(170, 122, 128, 50, 84, 10, 304, { bumps: 22, amp: 0.1, flicks: 9 });
    [1, -1].forEach(function (s) {
      var br = onShell(226, 0.74 * s, 1.16);
      decal(br[0], br[1], br[2], 0.74 * s, 14, function () {
        furEllipse(ctx, -4, -6, 84, 30, 0.14, 305 + s, { lw: lw, bumps: 16, amp: 0.1, upx: 0, upy: -1 });
      });
    });

    // --- eyes (big, set forward on the shell, under the brows)
    var gx = 0;
    if (pearl) {
      var dxp = (pearl.x - hx) * Math.cos(-ha) - (pearl.y - hy) * Math.sin(-ha);
      gx = clamp(dxp / (Rmax * 6), -1, 1);
    }
    [1, -1].forEach(function (s) {
      var ey = onShell(242, 1.28 * s, 1.06);
      decal(ey[0], ey[1], ey[2], 1.28 * s, 12, function () { lionEye(ctx, lw, t, gx); });
    });

    // --- horn on top with white fluff collar
    var hp = P(190, 166, 0);
    add(hp.d + 16, function () {
      ctx.save(); ctx.translate(hp.x, hp.y); ctx.scale(1, sgnMin(cr, 0.3)); horn(ctx, lw, t); ctx.restore();
    });

    // --- nose pompoms on springs (spheres, no foreshortening)
    [1, -1].forEach(function (s) {
      var pz = P(362, 70, 30 * s);
      add(pz.d + 20, function () { stripedPompom(ctx, pz.x, pz.y, 25, lw, t, s > 0 ? 7 : 8); });
    });

    parts.sort(function (a, b) { return a.d - b.d; });
    for (var i = 0; i < parts.length; i++) parts[i].fn();
    ctx.restore();

    if (pearl) {
      var d2 = Math.hypot(hx - pearl.x, hy - pearl.y), l2 = clamp(1 - d2 / (Rmax * 10), 0, 1);
      if (l2 > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        var pg = ctx.createRadialGradient(pearl.x, pearl.y, 0, pearl.x, pearl.y, Rmax * 6);
        pg.addColorStop(0, 'rgba(255,245,180,' + 0.25 * l2 + ')'); pg.addColorStop(1, 'rgba(255,245,180,0)');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(pearl.x, pearl.y, Rmax * 6, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
  }

  // --------------------------------------------------------- body shapes
  function ribbon(ctx, segs, k) {
    var N = segs.length;
    ctx.beginPath();
    for (var a = 0; a < N; a++) {
      var p = segs[a], nx = Math.sin(p.a), ny = -Math.cos(p.a);
      a ? ctx.lineTo(p.x + nx * p.r * k, p.y + ny * p.r * k) : ctx.moveTo(p.x + nx * p.r * k, p.y + ny * p.r * k);
    }
    // rounded tail tip
    var e = segs[N - 1];
    ctx.arc(e.x, e.y, Math.max(e.r * k, 0.5), e.a - Math.PI / 2 + Math.PI, e.a + Math.PI / 2 + Math.PI, true);
    for (var b = N - 1; b >= 0; b--) {
      var q = segs[b], mx = Math.sin(q.a), my = -Math.cos(q.a);
      ctx.lineTo(q.x - mx * q.r * k, q.y - my * q.r * k);
    }
    ctx.closePath();
  }
  // strip between two local offsets (+1 = local up edge, -1 = local down edge)
  function band(ctx, segs, loFn, hiFn, fill) {
    var N = segs.length;
    ctx.beginPath();
    for (var i = 0; i < N; i++) {
      var s = segs[i], nx = Math.sin(s.a), ny = -Math.cos(s.a), o = hiFn(s) * s.r;
      i ? ctx.lineTo(s.x + nx * o, s.y + ny * o) : ctx.moveTo(s.x + nx * o, s.y + ny * o);
    }
    for (var j = N - 1; j >= 0; j--) {
      var s2 = segs[j], mx = Math.sin(s2.a), my = -Math.cos(s2.a), o2 = loFn(s2) * s2.r;
      ctx.lineTo(s2.x + mx * o2, s2.y + my * o2);
    }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }

  var api = {
    create: function (opts) { return new Dragon(opts); },
    _build: function (opts, q) { return buildSprites(new Factory(opts), q); }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LionDragon = api;
})(typeof window !== 'undefined' ? window : this);
