/* Password gate scene: a Chinese dragon chasing the flaming pearl.
   Pre-launch only -- delete with the #pw-gate markup and CSS.
   The pearl follows the pointer; left alone it circles the kung fu
   performer in the photo and the dragon hunts it. Wrong password = roar,
   right password = the pearl bursts and the gate opens.

   Drawing order per frame: back clouds, body glow, pearl, far legs,
   crest + belly hair, scaled body, near legs, head, embers, front clouds. */
(function () {
  var gate = document.getElementById('pw-gate');
  if (!gate || getComputedStyle(gate).display === 'none') return;

  var canvas = gate.querySelector('.pwg-canvas');
  var ctx = canvas.getContext('2d');
  var photo = gate.querySelector('.pwg-photo');
  var hanzi = gate.querySelector('.pwg-hanzi');
  var input = document.getElementById('pw-gate-input');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W, H, S, N, SP, cx, cy, A, B;
  var trail = [], segs = [], embers = [], clouds = [];
  var head = { x: 0, y: 0, a: 0, v: 3, flip: 1, turn: 0 };
  var pearl = { x: 0, y: 0, pulse: 0 };
  var ptr = { x: 0, y: 0, t: -1e9 };
  var par = { x: 0, y: 0 };
  var roar = 0, bursting = false, burstR = 0, flash = 0;
  var t = 0, last = 0, raf = 0, stopped = false;

  var OUT = 'rgba(46,12,4,.72)';
  var GOLD = '#E9A42C', GOLD_HI = '#FFE28A', GOLD_LO = '#B5561A';
  var RED = '#C8102E', RED_HI = '#E8542A', CREAM = '#F7DFA8', BONE = '#F3D9A0';

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.max(0.55, Math.min(1.2, Math.min(W, H) / 860));
    N = W < 700 ? 46 : 64;
    SP = 11 * S;
    var wide = W >= 900;
    cx = wide ? W * 0.6 : W * 0.5;
    cy = H * 0.5;
    A = wide ? W * 0.27 : W * 0.4;
    B = H * (wide ? 0.32 : 0.42);
    clouds = [];
    for (var c = 0; c < 6; c++) {
      clouds.push({
        x: Math.random() * W, y: H * (0.12 + Math.random() * 0.76),
        s: (0.7 + Math.random() * 0.8) * S, v: (0.08 + Math.random() * 0.14) * S,
        front: c > 3, seed: Math.random() * 10
      });
    }
  }

  function seed() {
    head.x = -120 * S; head.y = H * 0.74; head.a = -0.35; head.v = 4 * S;
    pearl.x = cx; pearl.y = cy;
    trail.length = 0;
    for (var k = 0; k < N * SP / 1.5; k++) {
      trail.push({ x: head.x - Math.cos(head.a) * k * 1.5, y: head.y - Math.sin(head.a) * k * 1.5, f: 1 });
    }
  }

  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function spark(x, y, n, speed, spread) {
    for (var i = 0; i < n && embers.length < 240; i++) {
      var a = Math.random() * Math.PI * 2, s = (0.4 + Math.random()) * speed;
      embers.push({
        x: x + (Math.random() - 0.5) * spread, y: y + (Math.random() - 0.5) * spread,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.3, life: 1, decay: 0.008 + Math.random() * 0.018,
        r: (0.8 + Math.random() * 1.8) * S, red: Math.random() < 0.3
      });
    }
  }

  /* ---------------------------- simulation ---------------------------- */
  function step(f) {
    t += f / 60;
    var now = performance.now();
    var active = now - ptr.t < 2600;
    var tx, ty;
    if (active) { tx = ptr.x; ty = ptr.y; }
    else {
      tx = cx + A * Math.sin(t * 0.37) + A * 0.3 * Math.sin(t * 1.09 + 0.7);
      ty = cy + B * Math.sin(t * 0.53 + 1.2) + B * 0.22 * Math.cos(t * 1.31);
    }
    var k = 1 - Math.pow(1 - (active ? 0.16 : 0.05), f);
    pearl.x += (tx - pearl.x) * k; pearl.y += (ty - pearl.y) * k;
    pearl.pulse *= Math.pow(0.9, f);

    var dx = pearl.x - head.x, dy = pearl.y - head.y, dist = Math.hypot(dx, dy);
    var diff = wrap(Math.atan2(dy, dx) - head.a);
    var turn = (0.042 + roar * 0.06 + (bursting ? 0.05 : 0)) * f;
    var da = clamp(diff, -turn, turn) + Math.sin(t * 2.1) * 0.016 * f;
    head.a = wrap(head.a + da);
    head.turn += (da / f - head.turn) * 0.15 * f;
    var targetV = clamp(dist * 0.017, 2.6, 8) * S * (1 + roar * 0.9 + (bursting ? 1.6 : 0));
    head.v += (targetV - head.v) * 0.06 * f;
    head.x += Math.cos(head.a) * head.v * f;
    head.y += Math.sin(head.a) * head.v * f;
    head.flip += ((Math.cos(head.a) >= 0 ? 1 : -1) - head.flip) * 0.06 * f;
    trail.unshift({ x: head.x, y: head.y, f: head.flip });

    if (dist < 30 * S && Math.random() < 0.5 * f) spark(pearl.x, pearl.y, 2, 1.6 * S, 8 * S);

    roar *= Math.pow(0.962, f);
    flash *= Math.pow(0.9, f);
    if (bursting) burstR += 42 * S * f;

    sample();

    if (Math.random() < 0.4 * f) {
      var sg = segs[1 + Math.floor(Math.random() * (N - 2))];
      spark(sg.x, sg.y, 1, 0.5 * S, 12 * S);
    }
    for (var i = embers.length - 1; i >= 0; i--) {
      var e = embers[i];
      e.x += e.vx * f; e.y += e.vy * f;
      e.vx *= Math.pow(0.97, f); e.vy = e.vy * Math.pow(0.97, f) - 0.015 * f;
      e.life -= e.decay * f;
      if (e.life <= 0) embers.splice(i, 1);
    }
    for (var c = 0; c < clouds.length; c++) {
      var cl = clouds[c];
      cl.x += cl.v * f * (cl.front ? 1.6 : 1);
      if (cl.x - 220 * cl.s > W) { cl.x = -220 * cl.s; cl.y = H * (0.12 + Math.random() * 0.76); }
    }
    par.x += ((pearl.x / W - 0.5) - par.x) * 0.04 * f;
    par.y += ((pearl.y / H - 0.5) - par.y) * 0.04 * f;
  }

  function sample() {
    segs = [{ x: trail[0].x, y: trail[0].y, f: trail[0].f }];
    var need = SP, acc = 0, px = trail[0].x, py = trail[0].y, k = 1;
    for (; k < trail.length && segs.length < N; k++) {
      var qx = trail[k].x, qy = trail[k].y, d = Math.hypot(qx - px, qy - py);
      if (d > 0) {
        while (acc + d >= need && segs.length < N) {
          var r = (need - acc) / d;
          segs.push({ x: px + (qx - px) * r, y: py + (qy - py) * r, f: trail[k].f });
          need += SP;
        }
      }
      acc += d; px = qx; py = qy;
    }
    if (trail.length > k + 4) trail.length = k + 4;
    while (segs.length < N) { var l = segs[segs.length - 1]; segs.push({ x: l.x, y: l.y, f: l.f }); }
    for (var i = 0; i < N; i++) {
      var b = segs[i], a = segs[Math.min(i + 1, N - 1)];
      b.a = i < N - 1 && (b.x !== a.x || b.y !== a.y) ? Math.atan2(b.y - a.y, b.x - a.x) : (i ? segs[i - 1].a : head.a);
      if (i === 0) b.a = head.a;
      b.r = radius(i);
      b.nx = Math.sin(b.a); b.ny = -Math.cos(b.a);
      b.dx = Math.cos(b.a); b.dy = Math.sin(b.a);
      b.lit = clamp(1 - Math.hypot(b.x - pearl.x, b.y - pearl.y) / (240 * S), 0, 1);
    }
  }

  /* Neck narrow behind the head, full through the chest, long taper to
     the tail. */
  function radius(i) {
    var u = i / (N - 1);
    var neck = u < 0.08 ? 0.72 + 0.28 * (u / 0.08) : 1;
    return S * (4 + 17 * Math.pow(Math.sin(Math.PI * (0.14 + 0.86 * u)), 0.85)) * neck;
  }

  /* ------------------------------ helpers ----------------------------- */
  // a tapered, curving hair/flame lock from (x0,y0) to its tip (x1,y1)
  function lock(x0, y0, x1, y1, w, bend, fill) {
    var mx = (x0 + x1) / 2, my = (y0 + y1) / 2, ang = Math.atan2(y1 - y0, x1 - x0);
    var px = -Math.sin(ang), py = Math.cos(ang);
    ctx.beginPath();
    ctx.moveTo(x0 + px * w, y0 + py * w);
    ctx.quadraticCurveTo(mx + px * (w * 0.6 + bend), my + py * (w * 0.6 + bend), x1, y1);
    ctx.quadraticCurveTo(mx - px * (w * 0.6 - bend), my - py * (w * 0.6 - bend), x0 - px * w, y0 - py * w);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }

  function band(lo, hi, fill) {
    ctx.beginPath();
    for (var i = 0; i < N; i++) {
      var s = segs[i], x = s.x + s.nx * s.r * hi * s.f, y = s.y + s.ny * s.r * hi * s.f;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    for (var j = N - 1; j >= 0; j--) {
      var s2 = segs[j];
      ctx.lineTo(s2.x + s2.nx * s2.r * lo * s2.f, s2.y + s2.ny * s2.r * lo * s2.f);
    }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }

  function silhouette() {
    ctx.beginPath();
    for (var a = 0; a < N; a++) { var p = segs[a]; a ? ctx.lineTo(p.x + p.nx * p.r, p.y + p.ny * p.r) : ctx.moveTo(p.x + p.nx * p.r, p.y + p.ny * p.r); }
    for (var b = N - 1; b >= 0; b--) { var q = segs[b]; ctx.lineTo(q.x - q.nx * q.r, q.y - q.ny * q.r); }
    ctx.closePath();
  }

  /* ------------------------------ clouds ------------------------------ */
  function cloud(c) {
    var s = c.s, x = c.x, y = c.y;
    var lobes = [[0, 0, 46], [-52, 10, 34], [52, 8, 38], [-92, 20, 22], [94, 18, 24], [16, -26, 30]];
    ctx.save(); ctx.globalAlpha = c.front ? 0.5 : 0.8;
    for (var i = 0; i < lobes.length; i++) {
      var lx = x + lobes[i][0] * s, ly = y + lobes[i][1] * s + Math.sin(t * 0.4 + c.seed + i) * 3 * s, lr = lobes[i][2] * s;
      var g = ctx.createRadialGradient(lx, ly - lr * 0.3, lr * 0.1, lx, ly, lr);
      g.addColorStop(0, 'rgba(246,232,210,.11)'); g.addColorStop(1, 'rgba(246,232,210,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.fill();
    }
    // the auspicious-cloud curls
    ctx.strokeStyle = 'rgba(242,180,65,.16)'; ctx.lineWidth = 1.2 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x - 30 * s, y + 6 * s, 14 * s, Math.PI * 0.2, Math.PI * 1.7); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 32 * s, y + 4 * s, 16 * s, Math.PI * 1.3, Math.PI * 2.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 110 * s, y + 30 * s); ctx.quadraticCurveTo(x, y + 42 * s, x + 112 * s, y + 28 * s); ctx.stroke();
    ctx.restore();
  }

  /* ------------------------------- pearl ------------------------------ */
  function drawPearl() {
    var x = pearl.x, y = pearl.y, pr = 11 * S * (1 + pearl.pulse * 0.6);
    ctx.globalCompositeOperation = 'lighter';
    var hr = 90 * S * (1 + 0.08 * Math.sin(t * 3) + pearl.pulse);
    var g = ctx.createRadialGradient(x, y, 0, x, y, hr);
    g.addColorStop(0, 'rgba(255,214,140,.45)');
    g.addColorStop(0.35, 'rgba(242,120,60,.14)');
    g.addColorStop(1, 'rgba(230,59,82,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, hr, 0, Math.PI * 2); ctx.fill();
    for (var k = 0; k < 4; k++) {
      var a = t * 2.2 + k * Math.PI / 2, len = 30 * S * (1 + 0.18 * Math.sin(t * 7 + k));
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(pr * 0.7, -3 * S);
      ctx.bezierCurveTo(len * 0.5, -10 * S, len * 0.8, -2 * S, len, -8 * S);
      ctx.bezierCurveTo(len * 0.7, 4 * S, len * 0.4, 6 * S, pr * 0.7, 3 * S);
      ctx.fillStyle = k % 2 ? 'rgba(232,84,42,.5)' : 'rgba(200,16,46,.5)'; ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    var c = ctx.createRadialGradient(x - pr * 0.35, y - pr * 0.35, 0, x, y, pr);
    c.addColorStop(0, '#FFFFFF'); c.addColorStop(0.4, '#FFF1C4'); c.addColorStop(1, '#E9892E');
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, pr, 0, Math.PI * 2); ctx.fill();
  }

  function drawGlow() {
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(segs[0].x, segs[0].y);
    for (var i = 1; i < N; i++) ctx.lineTo(segs[i].x, segs[i].y);
    ctx.strokeStyle = 'rgba(242,110,40,.06)'; ctx.lineWidth = 70 * S; ctx.stroke();
    ctx.strokeStyle = 'rgba(242,180,65,.07)'; ctx.lineWidth = 36 * S; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  /* -------------------------------- legs ------------------------------ */
  function limb(x0, y0, x1, y1, w0, w1, col, far) {
    var ang = Math.atan2(y1 - y0, x1 - x0), px = -Math.sin(ang), py = Math.cos(ang);
    var mx = (x0 + x1) / 2, my = (y0 + y1) / 2, bulge = (w0 + w1) * 0.35;
    ctx.beginPath();
    ctx.moveTo(x0 + px * w0, y0 + py * w0);
    ctx.quadraticCurveTo(mx + px * (w0 + bulge), my + py * (w0 + bulge), x1 + px * w1, y1 + py * w1);
    ctx.arc(x1, y1, w1, ang + Math.PI / 2, ang - Math.PI / 2, true);
    ctx.quadraticCurveTo(mx - px * (w1 + bulge * 0.5), my - py * (w1 + bulge * 0.5), x0 - px * w0, y0 - py * w0);
    ctx.arc(x0, y0, w0, ang - Math.PI / 2, ang + Math.PI / 2, true);
    ctx.closePath();
    var g = ctx.createLinearGradient(x0 + px * w0, y0 + py * w0, x0 - px * w0, y0 - py * w0);
    g.addColorStop(0, far ? '#8E3A12' : GOLD_LO); g.addColorStop(0.55, col); g.addColorStop(1, far ? '#C8741C' : GOLD_HI);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.4 * S; ctx.stroke();
    ctx.strokeStyle = far ? 'rgba(122,42,10,.4)' : 'rgba(122,42,10,.55)'; ctx.lineWidth = 0.9 * S;
    for (var k = 1; k < 4; k++) {
      var u = k / 4, sx = x0 + (x1 - x0) * u, sy = y0 + (y1 - y0) * u, sw = w0 + (w1 - w0) * u;
      ctx.beginPath(); ctx.arc(sx + px * sw * 0.35, sy + py * sw * 0.35, sw * 0.55, ang + Math.PI * 0.6, ang + Math.PI * 1.4); ctx.stroke();
    }
  }

  function leg(i, phase, far) {
    var s = segs[i], r = s.r;
    var fs = (s.f < 0 ? -1 : 1) * Math.max(Math.abs(s.f), 0.35);
    var bx = -s.nx * fs, by = -s.ny * fs, dx = s.dx, dy = s.dy;
    var sw = Math.sin(t * 4.6 + phase), sh = far ? -r * 0.4 : 0;
    var hx = s.x + bx * r * 0.2 + dx * sh, hy = s.y + by * r * 0.2 + dy * sh;
    var kx = hx + bx * r * 1.35 - dx * r * (0.75 + sw * 0.55), ky = hy + by * r * 1.35 - dy * r * (0.75 + sw * 0.55);
    var fx = kx + dx * r * (1.05 + sw * 0.3) + bx * r * 0.45, fy = ky + dy * r * (1.05 + sw * 0.3) + by * r * 0.45;
    var col = far ? GOLD_LO : GOLD;

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // elbow flame tufts, behind the limb
    for (var q = 0; q < 3; q++) {
      lock(kx, ky, kx - dx * r * (1.2 + q * 0.3) - bx * r * (0.1 - q * 0.25) + Math.sin(t * 6 + q) * 3 * S,
        ky - dy * r * (1.2 + q * 0.3) - by * r * (0.1 - q * 0.25), r * 0.16, 2 * S, q % 2 ? RED_HI : RED);
    }
    // tapered limb: wide at the hip, narrow at the wrist, filled rather than
    // stroked so it reads as muscle, with a pale underside and scaled front
    limb(hx, hy, kx, ky, r * 0.42, r * 0.26, col, far);
    limb(kx, ky, fx, fy, r * 0.26, r * 0.17, col, far);

    // four talons, fanned forward and hooked down
    for (var c = 0; c < 4; c++) {
      var ca = Math.atan2(dy, dx) + (c - 1.5) * 0.42, cl = r * 0.8;
      var ex = fx + Math.cos(ca) * cl, ey = fy + Math.sin(ca) * cl;
      var hkx = ex + bx * r * 0.32, hky = ey + by * r * 0.32;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(ex, ey);
      ctx.strokeStyle = OUT; ctx.lineWidth = 4.4 * S; ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 2.6 * S; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.quadraticCurveTo(ex + Math.cos(ca) * r * 0.3, ey + Math.sin(ca) * r * 0.3, hkx, hky);
      ctx.strokeStyle = '#2A140A'; ctx.lineWidth = 2.2 * S; ctx.stroke();
      ctx.strokeStyle = 'rgba(247,223,168,.9)'; ctx.lineWidth = 0.9 * S; ctx.stroke();
    }
  }

  /* -------------------------------- body ------------------------------ */
  function drawBody() {
    var L1 = Math.round(N * 0.18), L2 = Math.round(N * 0.56);
    leg(L1, Math.PI, true); leg(L2, 0, true);

    // spine crest (flowing flame hair) and belly fringe, tail first
    for (var i = N - 2; i >= 2; i--) {
      var s = segs[i], r = s.r, nx = s.nx * s.f, ny = s.ny * s.f;
      var wave = Math.sin(t * 6.2 - i * 0.45);
      var len = r * (1.25 + 0.3 * wave) * (i < 6 ? 0.7 : 1);
      lock(s.x + nx * r * 0.75, s.y + ny * r * 0.75,
        s.x + nx * (r * 0.75 + len) - s.dx * r * 1.7, s.y + ny * (r * 0.75 + len) - s.dy * r * 1.7,
        r * 0.3, wave * 3 * S, i % 3 === 0 ? RED_HI : RED);
      if (i % 3 === 0) {
        lock(s.x + nx * r * 0.9, s.y + ny * r * 0.9,
          s.x + nx * (r * 0.9 + len * 0.6) - s.dx * r * 1.2, s.y + ny * (r * 0.9 + len * 0.6) - s.dy * r * 1.2,
          r * 0.12, 1.5 * S, GOLD_HI);
      }
      ctx.strokeStyle = 'rgba(247,223,168,.45)'; ctx.lineWidth = 1 * S;
      ctx.beginPath();
      ctx.moveTo(s.x - nx * r * 0.85, s.y - ny * r * 0.85);
      ctx.lineTo(s.x - nx * r * (1.3 + 0.15 * wave) - s.dx * r * 0.6, s.y - ny * r * (1.3 + 0.15 * wave) - s.dy * r * 0.6);
      ctx.stroke();
    }

    // tail flame fan
    var tl = segs[N - 1], tr = 46 * S;
    for (var q = -3; q <= 3; q++) {
      var ta = tl.a + Math.PI + q * 0.2 + Math.sin(t * 4.5 + q) * 0.14;
      lock(tl.x, tl.y, tl.x + Math.cos(ta) * tr * (1 - Math.abs(q) * 0.1), tl.y + Math.sin(ta) * tr * (1 - Math.abs(q) * 0.1),
        4 * S, Math.sin(t * 5 + q) * 4 * S, q % 2 ? RED_HI : q ? RED : GOLD_HI);
    }

    silhouette(); ctx.fillStyle = GOLD; ctx.fill();

    // cylindrical shading: dark back, highlight ridge, pale plated belly
    band(0.42, 1, 'rgba(122,42,10,.55)');
    band(0.12, 0.34, 'rgba(255,226,138,.35)');
    band(-0.14, -1, CREAM);

    // scales, tail to head so each row overlaps the one behind it
    for (var j = N - 2; j >= 1; j--) {
      var sc = segs[j], rr = sc.r, fx = sc.nx * sc.f, fy = sc.ny * sc.f;
      var stagger = (j % 2) * 0.18;
      for (var row = 0; row < 3; row++) {
        var o = 0.78 - row * 0.3 - stagger * 0.5;
        var ccx = sc.x + fx * rr * o, ccy = sc.y + fy * rr * o, sr = rr * (0.3 - row * 0.02);
        ctx.beginPath();
        ctx.arc(ccx, ccy, sr, sc.a + Math.PI / 2, sc.a + Math.PI * 1.5);
        ctx.closePath();
        ctx.fillStyle = row === 0 ? '#9C4213' : row === 1 ? '#C8741C' : '#E09A2A';
        ctx.fill();
        ctx.beginPath(); ctx.arc(ccx, ccy, sr, sc.a + Math.PI * 0.62, sc.a + Math.PI * 1.38);
        ctx.strokeStyle = row === 0 ? 'rgba(255,200,110,.35)' : 'rgba(255,230,160,.6)'; ctx.lineWidth = 1 * S; ctx.stroke();
      }
      // belly plates
      ctx.strokeStyle = 'rgba(150,80,30,.5)'; ctx.lineWidth = 1.1 * S;
      ctx.beginPath();
      ctx.moveTo(sc.x - fx * rr * 0.18 + sc.dx * rr * 0.1, sc.y - fy * rr * 0.18 + sc.dy * rr * 0.1);
      ctx.quadraticCurveTo(sc.x - fx * rr * 0.6 - sc.dx * rr * 0.12, sc.y - fy * rr * 0.6 - sc.dy * rr * 0.12,
        sc.x - fx * rr * 0.95, sc.y - fy * rr * 0.95);
      ctx.stroke();
    }

    silhouette(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.6 * S; ctx.lineJoin = 'round'; ctx.stroke();

    // light from the pearl rakes across whatever flies near it
    ctx.globalCompositeOperation = 'lighter';
    for (var m = 1; m < N; m += 2) {
      var lt = segs[m];
      if (lt.lit < 0.05) continue;
      var lg = ctx.createRadialGradient(lt.x, lt.y, 0, lt.x, lt.y, lt.r * 1.3);
      lg.addColorStop(0, 'rgba(255,214,150,' + (0.28 * lt.lit) + ')'); lg.addColorStop(1, 'rgba(255,214,150,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lt.x, lt.y, lt.r * 1.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    leg(L1, 0, false); leg(L2, Math.PI, false);
  }

  /* -------------------------------- head ------------------------------
     Local space: +x toward the nose, -y is the top of the head. One unit
     is roughly a pixel at S = 1. */
  function antler(dark) {
    ctx.beginPath();
    ctx.moveTo(-6, -24); ctx.bezierCurveTo(-18, -44, -34, -56, -60, -62);
    ctx.moveTo(-22, -40); ctx.quadraticCurveTo(-18, -56, -24, -70);
    ctx.moveTo(-40, -54); ctx.quadraticCurveTo(-40, -68, -50, -80);
    ctx.moveTo(-50, -59); ctx.quadraticCurveTo(-60, -52, -72, -52);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = OUT; ctx.lineWidth = 7.5; ctx.stroke();
    ctx.strokeStyle = dark ? '#B98A4A' : BONE; ctx.lineWidth = 4.6; ctx.stroke();
    if (!dark) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.2; ctx.stroke(); }
  }

  function drawHead() {
    var s = segs[0], k = S * 1.12;
    var fl = head.flip, fy = Math.abs(fl) < 0.2 ? (fl < 0 ? -0.2 : 0.2) : fl;
    var jaw = 0.16 + 0.08 * Math.sin(t * 2.4) + roar * 0.42;
    var bend = clamp(head.turn * 900, -40, 40) * (fy < 0 ? -1 : 1);
    ctx.save();
    ctx.translate(s.x, s.y); ctx.rotate(head.a); ctx.scale(k, k * fy);

    // mane streaming back off the skull
    for (var m = 0; m < 14; m++) {
      var u = m / 13, ang = -1.1 + u * 2.0;
      var wave = Math.sin(t * 4.8 + m * 0.9) * 8;
      var x0 = -18 + Math.cos(ang) * 10, y0 = Math.sin(ang) * 18;
      var x1 = -92 - 20 * Math.sin(u * Math.PI) + wave * 0.5, y1 = Math.sin(ang) * 46 + wave + bend * 0.4;
      lock(x0, y0, x1, y1, 7 - u * 2, wave * 0.8, m % 3 === 0 ? RED_HI : m % 3 === 1 ? RED : '#9E0C24');
    }

    antler(true);

    // cheek frill
    lock(-14, 2, -44, 14 + Math.sin(t * 5) * 3, 6, 4, RED);
    lock(-12, 6, -36, 24 + Math.sin(t * 5 + 1) * 3, 4, 3, GOLD_HI);

    // lower jaw + mouth, behind the upper head
    ctx.save(); ctx.translate(-16, 8); ctx.rotate(jaw);
    ctx.beginPath();
    ctx.moveTo(-10, -4); ctx.bezierCurveTo(10, -6, 44, -4, 70, 0);
    ctx.bezierCurveTo(66, 10, 46, 18, 22, 18); ctx.bezierCurveTo(6, 18, -6, 12, -12, 4); ctx.closePath();
    var jg = ctx.createLinearGradient(0, -6, 0, 18);
    jg.addColorStop(0, '#E9A42C'); jg.addColorStop(1, '#8E3A12');
    ctx.fillStyle = jg; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.4; ctx.stroke();
    // mouth cavity + tongue
    ctx.beginPath(); ctx.moveTo(-4, -4); ctx.bezierCurveTo(14, -6, 40, -5, 64, -1);
    ctx.bezierCurveTo(46, 4, 18, 5, -4, 2); ctx.closePath(); ctx.fillStyle = '#4A0A0C'; ctx.fill();
    var tw = Math.sin(t * 5.5) * 4;
    ctx.beginPath(); ctx.moveTo(4, -1);
    ctx.bezierCurveTo(30, -4, 56, 2 + tw, 84 + roar * 16, -6 + tw);
    ctx.bezierCurveTo(76, 2 + tw, 50, 6, 6, 3); ctx.closePath();
    ctx.fillStyle = '#D63048'; ctx.fill();
    // lower fangs
    ctx.fillStyle = '#FFF6E0';
    [[46, 7], [60, 8]].forEach(function (fz) {
      ctx.beginPath(); ctx.moveTo(fz[0], -2); ctx.lineTo(fz[0] + 2.5, -2 - fz[1]); ctx.lineTo(fz[0] + 5, -1.5); ctx.fill();
    });
    // beard
    for (var bd = 0; bd < 7; bd++) {
      var bw = Math.sin(t * 4 + bd) * 4;
      lock(8 + bd * 6, 16, -18 + bd * 4 + bw, 44 + bd * 2 + Math.abs(bw), 2.4, bw, bd % 2 ? CREAM : GOLD_HI);
    }
    ctx.restore();

    // upper head
    ctx.beginPath();
    ctx.moveTo(-30, -6);
    ctx.bezierCurveTo(-28, -26, -8, -32, 10, -26);
    ctx.bezierCurveTo(22, -22, 30, -16, 40, -14);
    ctx.bezierCurveTo(52, -12, 60, -17, 66, -11);
    ctx.bezierCurveTo(71, -6, 69, 2, 62, 3);
    ctx.lineTo(24, 4);
    ctx.bezierCurveTo(10, 10, -10, 14, -26, 10);
    ctx.closePath();
    var hg = ctx.createLinearGradient(0, -32, 0, 12);
    hg.addColorStop(0, GOLD_HI); hg.addColorStop(0.5, GOLD); hg.addColorStop(1, GOLD_LO);
    ctx.fillStyle = hg; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
    // snout ridge scales
    ctx.strokeStyle = 'rgba(122,42,10,.55)'; ctx.lineWidth = 1;
    for (var rs = 0; rs < 5; rs++) {
      ctx.beginPath(); ctx.arc(28 + rs * 7, -12 - (rs > 2 ? 1 : 0), 3.4, Math.PI * 0.9, Math.PI * 1.9); ctx.stroke();
    }
    // cheek plate
    ctx.beginPath(); ctx.moveTo(-18, -2); ctx.bezierCurveTo(-6, -8, 10, -6, 20, 0);
    ctx.strokeStyle = 'rgba(122,42,10,.5)'; ctx.lineWidth = 1.2; ctx.stroke();

    // upper teeth and fangs along the lip
    ctx.fillStyle = '#FFF6E0';
    for (var ut = 0; ut < 6; ut++) {
      var ux = 26 + ut * 6, long = ut === 0 || ut === 4;
      ctx.beginPath(); ctx.moveTo(ux, 3.6); ctx.lineTo(ux + 2.5, 3.6 + (long ? 10 : 4.5)); ctx.lineTo(ux + 5, 3.8); ctx.fill();
    }

    // nose: bulb, nostril, and the upward flame curl
    ctx.beginPath(); ctx.ellipse(60, -8, 7, 5.6, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#D46A1F'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(63, -7, 2.4, 1.6, -0.3, 0, Math.PI * 2); ctx.fillStyle = '#2A0A06'; ctx.fill();
    lock(56, -13, 64 + Math.sin(t * 5) * 2, -30, 3, -4, RED_HI);

    antler(false);

    // bushy flame brow over the eye
    for (var br = 0; br < 6; br++) {
      var bx0 = -2 + br * 5, sway = Math.sin(t * 6 + br) * 2.5;
      lock(bx0, -24, bx0 - 14 + sway, -38 - br * 1.5 + sway, 3.2, -3, br % 2 ? RED_HI : RED);
    }

    // eye: socket, glow, eyeball, gold iris, slit pupil, highlight
    ctx.beginPath(); ctx.moveTo(6, -14); ctx.quadraticCurveTo(18, -24, 30, -15); ctx.quadraticCurveTo(18, -8, 6, -14);
    ctx.fillStyle = '#3A1208'; ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    var eg = ctx.createRadialGradient(18, -15, 0, 18, -15, 18);
    eg.addColorStop(0, 'rgba(255,200,90,' + (0.35 + roar * 0.55) + ')'); eg.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(18, -15, 18, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath(); ctx.ellipse(18, -15, 8, 5.4, -0.12, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF4DA'; ctx.fill();
    ctx.beginPath(); ctx.arc(19.5, -15, 4.2, 0, Math.PI * 2);
    ctx.fillStyle = roar > 0.15 ? '#FF4A3A' : '#F2B441'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(19.5, -15, 1.1, 3.6, 0, 0, Math.PI * 2); ctx.fillStyle = '#120404'; ctx.fill();
    ctx.beginPath(); ctx.arc(21, -16.6, 1.1, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, -16); ctx.quadraticCurveTo(18, -23, 30, -16);
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.stroke();

    // whiskers: long barbels off the upper lip, swinging with each turn
    [[58, 0, 1], [48, 3, 1.35]].forEach(function (w, wi) {
      var px = w[0], py = w[1];
      for (var j = 1; j <= 30; j++) {
        var x = w[0] - j * 5.2 + j * 0.9 * w[2];
        var y = w[1] + j * 1.6 * w[2] + Math.sin(t * 3.8 - j * 0.3 + wi * 1.3) * j * 0.7 + bend * j / 30;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y);
        ctx.strokeStyle = 'rgba(255,233,176,' + (1 - j / 34) + ')'; ctx.lineWidth = 2.6 - j * 0.075;
        ctx.lineCap = 'round'; ctx.stroke();
        px = x; py = y;
      }
    });

    ctx.restore();
  }

  function drawEmbers() {
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < embers.length; i++) {
      var e = embers[i];
      ctx.fillStyle = e.red ? 'rgba(230,59,82,' + e.life * 0.9 + ')' : 'rgba(255,196,100,' + e.life + ')';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (0.5 + e.life * 0.5), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (var c = 0; c < clouds.length; c++) if (!clouds[c].front) cloud(clouds[c]);
    drawGlow();
    drawPearl();
    drawBody();
    drawHead();
    drawEmbers();
    for (var c2 = 0; c2 < clouds.length; c2++) if (clouds[c2].front) cloud(clouds[c2]);
    if (bursting) {
      ctx.globalCompositeOperation = 'lighter';
      var al = Math.max(0, 1 - burstR / (Math.max(W, H) * 1.2));
      ctx.strokeStyle = 'rgba(255,214,140,' + al + ')'; ctx.lineWidth = 14 * S * al + 1;
      ctx.beginPath(); ctx.arc(pearl.x, pearl.y, burstR, 0, Math.PI * 2); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    if (flash > 0.01) {
      ctx.fillStyle = 'rgba(' + (bursting ? '255,226,170' : '230,59,82') + ',' + flash + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (photo) photo.style.transform = 'translate3d(' + (-par.x * 22).toFixed(2) + 'px,' + (-par.y * 14).toFixed(2) + 'px,0)';
    if (hanzi) hanzi.style.transform = 'translate3d(' + (par.x * 34).toFixed(2) + 'px,' + (par.y * 22).toFixed(2) + 'px,0)';
  }

  /* ------------------------------ lifecycle --------------------------- */
  function frame(now) {
    if (stopped) return;
    var f = last ? Math.min((now - last) / 16.667, 3) : 1;
    last = now;
    step(f); draw();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    stopped = true; cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerdown', onMove);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVis);
    obs.disconnect();
  }

  function onMove(e) { ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = performance.now(); }
  function onResize() { resize(); if (reduce) { for (var i = 0; i < 40; i++) step(1); draw(); } }
  function onVis() {
    if (document.hidden) { cancelAnimationFrame(raf); last = 0; }
    else if (!stopped && !reduce) raf = requestAnimationFrame(frame);
  }

  /* The inline gate script re-arms the shake by removing and re-adding the
     class in one task, so both records arrive in a single batch. A record
     whose old value lacked "shake" means it was just (re)added. */
  var obs = new MutationObserver(function (records) {
    var shakeAdded = records.some(function (r) { return !/\bshake\b/.test(r.oldValue || ''); }) && gate.classList.contains('shake');
    if (gate.classList.contains('pw-gate-hide') && !bursting) {
      bursting = true; burstR = 0; flash = 0.35; pearl.pulse = 1;
      spark(pearl.x, pearl.y, 120, 7 * S, 6 * S);
      if (reduce) { draw(); stop(); return; }
      setTimeout(stop, 1600);
      return;
    }
    if (shakeAdded) {
      roar = 1; flash = 0.14;
      spark(segs[0].x, segs[0].y, 40, 3.2 * S, 10 * S);
      if (reduce) draw();
    }
  });
  obs.observe(gate, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });

  if (input) input.addEventListener('input', function () {
    pearl.pulse = Math.min(1, pearl.pulse + 0.35);
    spark(pearl.x, pearl.y, 4, 1.8 * S, 6 * S);
    if (reduce) draw();
  });

  resize(); seed();
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onMove, { passive: true });
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVis);

  if (reduce) {
    for (var i = 0; i < 300; i++) step(1);
    embers.length = 0;
    draw();
  } else {
    raf = requestAnimationFrame(frame);
  }
})();
