/* Password gate scene: a dance dragon chasing the flaming pearl.
   Pre-launch only -- delete with the #pw-gate markup and CSS.
   The pearl follows the pointer; left alone it circles the kung fu
   performer in the photo and the dragon hunts it. Wrong password = roar,
   right password = the pearl bursts and the gate opens. */
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
  var trail = [], segs = [], embers = [];
  var head = { x: 0, y: 0, a: 0, v: 3, flip: 1 };
  var pearl = { x: 0, y: 0, pulse: 0 };
  var ptr = { x: 0, y: 0, t: -1e9 };
  var par = { x: 0, y: 0 };
  var roar = 0, bursting = false, burstR = 0, flash = 0;
  var t = 0, last = 0, raf = 0, stopped = false;

  var GOLD = '#F2B441', GOLD_HI = '#FFE3A1', RED = '#E63B52', RED_D = '#C8102E', OUT = 'rgba(58,16,6,.6)';

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.max(0.55, Math.min(1.25, Math.min(W, H) / 820));
    N = W < 700 ? 40 : 56;
    SP = 12.5 * S;
    var wide = W >= 900;
    cx = wide ? W * 0.64 : W * 0.5;
    cy = H * 0.5;
    A = wide ? W * 0.21 : W * 0.4;
    B = H * (wide ? 0.31 : 0.42);
  }

  function seed() {
    head.x = -80 * S; head.y = H * 0.72; head.a = -0.35; head.v = 4 * S;
    pearl.x = cx; pearl.y = cy;
    trail.length = 0;
    for (var k = 0; k < N * SP / 1.5; k++) {
      trail.push({ x: head.x - Math.cos(head.a) * k * 1.5, y: head.y - Math.sin(head.a) * k * 1.5, f: 1 });
    }
  }

  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function spark(x, y, n, speed, spread) {
    for (var i = 0; i < n && embers.length < 220; i++) {
      var a = Math.random() * Math.PI * 2, s = (0.4 + Math.random()) * speed;
      embers.push({
        x: x + (Math.random() - 0.5) * spread, y: y + (Math.random() - 0.5) * spread,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.3, life: 1, decay: 0.008 + Math.random() * 0.018,
        r: (0.8 + Math.random() * 1.8) * S, red: Math.random() < 0.3
      });
    }
  }

  function step(f) {
    t += f / 60;
    var now = performance.now();
    var active = now - ptr.t < 2600;
    var tx, ty;
    if (active) { tx = ptr.x; ty = ptr.y; }
    else {
      tx = cx + A * Math.sin(t * 0.41) + A * 0.35 * Math.sin(t * 1.13 + 0.7);
      ty = cy + B * Math.sin(t * 0.57 + 1.2) + B * 0.25 * Math.cos(t * 1.37);
    }
    var k = 1 - Math.pow(1 - (active ? 0.16 : 0.05), f);
    pearl.x += (tx - pearl.x) * k; pearl.y += (ty - pearl.y) * k;
    pearl.pulse *= Math.pow(0.9, f);

    var dx = pearl.x - head.x, dy = pearl.y - head.y, dist = Math.hypot(dx, dy);
    var diff = wrap(Math.atan2(dy, dx) - head.a);
    var turn = (0.045 + roar * 0.06 + (bursting ? 0.05 : 0)) * f;
    head.a = wrap(head.a + clamp(diff, -turn, turn) + Math.sin(t * 2.3) * 0.018 * f);
    var targetV = clamp(dist * 0.018, 2.6, 8.5) * S * (1 + roar * 0.9 + (bursting ? 1.6 : 0));
    head.v += (targetV - head.v) * 0.06 * f;
    head.x += Math.cos(head.a) * head.v * f;
    head.y += Math.sin(head.a) * head.v * f;
    head.flip += ((Math.cos(head.a) >= 0 ? 1 : -1) - head.flip) * 0.07 * f;
    trail.unshift({ x: head.x, y: head.y, f: head.flip });

    if (dist < 28 * S && Math.random() < 0.5 * f) spark(pearl.x, pearl.y, 2, 1.6 * S, 8 * S);

    roar *= Math.pow(0.962, f);
    flash *= Math.pow(0.9, f);
    if (bursting) burstR += 42 * S * f;

    sample();

    if (Math.random() < 0.45 * f) {
      var sg = segs[1 + Math.floor(Math.random() * (N - 2))];
      spark(sg.x, sg.y, 1, 0.5 * S, 10 * S);
    }
    for (var i = embers.length - 1; i >= 0; i--) {
      var e = embers[i];
      e.x += e.vx * f; e.y += e.vy * f;
      e.vx *= Math.pow(0.97, f); e.vy = e.vy * Math.pow(0.97, f) - 0.015 * f;
      e.life -= e.decay * f;
      if (e.life <= 0) embers.splice(i, 1);
    }

    var tgx = (pearl.x / W - 0.5), tgy = (pearl.y / H - 0.5);
    par.x += (tgx - par.x) * 0.04 * f; par.y += (tgy - par.y) * 0.04 * f;
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
    while (segs.length < N) segs.push({ x: segs[segs.length - 1].x, y: segs[segs.length - 1].y, f: segs[segs.length - 1].f });
    for (var i = 0; i < N; i++) {
      var b = segs[i], a = segs[Math.min(i + 1, N - 1)];
      segs[i].a = i < N - 1 && (b.x !== a.x || b.y !== a.y) ? Math.atan2(b.y - a.y, b.x - a.x) : (i ? segs[i - 1].a : head.a);
    }
    segs[0].a = head.a;
  }

  function radius(i) { return S * (5 + 17 * Math.sin(Math.PI * (0.18 + 0.82 * (i / (N - 1))))); }

  function drawPearl() {
    var x = pearl.x, y = pearl.y, pr = 11 * S * (1 + pearl.pulse * 0.6);
    ctx.globalCompositeOperation = 'lighter';
    var hr = 78 * S * (1 + 0.08 * Math.sin(t * 3) + pearl.pulse);
    var g = ctx.createRadialGradient(x, y, 0, x, y, hr);
    g.addColorStop(0, 'rgba(255,214,140,.42)');
    g.addColorStop(0.35, 'rgba(242,120,60,.14)');
    g.addColorStop(1, 'rgba(230,59,82,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, hr, 0, Math.PI * 2); ctx.fill();
    for (var k = 0; k < 3; k++) {
      var a = t * 2.4 + k * 2.094, len = 26 * S * (1 + 0.15 * Math.sin(t * 7 + k));
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(pr * 0.6, 0);
      ctx.quadraticCurveTo(len * 0.6, -7 * S, len, 0);
      ctx.quadraticCurveTo(len * 0.6, 7 * S, pr * 0.6, 0);
      ctx.fillStyle = 'rgba(230,59,82,.55)'; ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    var c = ctx.createRadialGradient(x - pr * 0.3, y - pr * 0.3, 0, x, y, pr);
    c.addColorStop(0, '#FFFFFF'); c.addColorStop(0.45, GOLD_HI); c.addColorStop(1, '#E9892E');
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, pr, 0, Math.PI * 2); ctx.fill();
  }

  function drawGlow() {
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(segs[0].x, segs[0].y);
    for (var i = 1; i < N; i++) ctx.lineTo(segs[i].x, segs[i].y);
    ctx.strokeStyle = 'rgba(242,110,40,.07)'; ctx.lineWidth = 58 * S; ctx.stroke();
    ctx.strokeStyle = 'rgba(242,180,65,.08)'; ctx.lineWidth = 30 * S; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  /* Body: fins, belly hair and legs go down first so their roots tuck
     under the ribbon; then the ribbon itself with a dark back band and a
     pale belly band -- both follow head.flip down the trail, so when the
     dragon turns over the roll ripples back along the body. */
  function side(i) { var f = segs[i].f; return f; }
  function nrm(i) { var a = segs[i].a; return [Math.sin(a), -Math.cos(a)]; }

  function band(lo, hi, fill) {
    ctx.beginPath();
    for (var i = 0; i < N; i++) {
      var s = segs[i], n = nrm(i), r = radius(i), f = side(i);
      var x = s.x + n[0] * r * hi * f, y = s.y + n[1] * r * hi * f;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    for (var j = N - 1; j >= 0; j--) {
      var s2 = segs[j], n2 = nrm(j), r2 = radius(j), f2 = side(j);
      ctx.lineTo(s2.x + n2[0] * r2 * lo * f2, s2.y + n2[1] * r2 * lo * f2);
    }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }

  function leg(i, phase, far) {
    var s = segs[i], r = radius(i), n = nrm(i), f = side(i);
    var fs = (f < 0 ? -1 : 1) * Math.max(Math.abs(f), 0.35);
    var bx = -n[0] * fs, by = -n[1] * fs, dx = Math.cos(s.a), dy = Math.sin(s.a);
    var sw = Math.sin(t * 5.2 + phase), sh = far ? -r * 0.35 : 0;
    var hx = s.x + bx * r * 0.3 + dx * sh, hy = s.y + by * r * 0.3 + dy * sh;
    var kx = hx + bx * r * 1.25 - dx * r * (0.7 + sw * 0.5), ky = hy + by * r * 1.25 - dy * r * (0.7 + sw * 0.5);
    var fx = kx + dx * r * (0.95 + sw * 0.3) + bx * r * 0.35, fy = ky + dy * r * (0.95 + sw * 0.3) + by * r * 0.35;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy);
    ctx.strokeStyle = OUT; ctx.lineWidth = r * 0.56 + 2.4 * S; ctx.stroke();
    ctx.strokeStyle = far ? '#B8461B' : GOLD; ctx.lineWidth = r * 0.56; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(kx, ky);
    ctx.lineTo(kx - dx * r * 0.9 - bx * r * 0.2, ky - dy * r * 0.9 - by * r * 0.2);
    ctx.strokeStyle = far ? 'rgba(200,16,46,.7)' : RED; ctx.lineWidth = 2.2 * S; ctx.stroke();
    for (var c = -1; c <= 1; c++) {
      var ca = Math.atan2(dy, dx) + c * 0.55, cl = r * 0.62;
      var ex = fx + Math.cos(ca) * cl + bx * r * 0.28, ey = fy + Math.sin(ca) * cl + by * r * 0.28;
      ctx.beginPath(); ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(fx + Math.cos(ca) * cl * 0.8, fy + Math.sin(ca) * cl * 0.8, ex, ey);
      ctx.strokeStyle = OUT; ctx.lineWidth = 3.4 * S; ctx.stroke();
      ctx.strokeStyle = '#FFF6E0'; ctx.lineWidth = 1.7 * S; ctx.stroke();
    }
  }

  function drawBody() {
    var L1 = Math.round(N * 0.2), L2 = Math.round(N * 0.6);
    leg(L1, Math.PI, true); leg(L2, 0, true);

    for (var i = N - 2; i >= 1; i--) {
      var s = segs[i], r = radius(i), n = nrm(i), f = side(i);
      var dxn = Math.cos(s.a), dyn = Math.sin(s.a), nx = n[0] * f, ny = n[1] * f;
      if (i % 2 === 0) {
        var fl = 1.95 + 0.3 * Math.sin(t * 7 - i * 0.6);
        ctx.beginPath();
        ctx.moveTo(s.x + nx * r * 0.8 + dxn * r * 0.5, s.y + ny * r * 0.8 + dyn * r * 0.5);
        ctx.quadraticCurveTo(s.x + nx * r * 1.75 + dxn * r * 0.2, s.y + ny * r * 1.75 + dyn * r * 0.2,
          s.x + nx * r * fl - dxn * r * 1.35, s.y + ny * r * fl - dyn * r * 1.35);
        ctx.quadraticCurveTo(s.x + nx * r * 1.15 - dxn * r * 0.6, s.y + ny * r * 1.15 - dyn * r * 0.6,
          s.x + nx * r * 0.8 - dxn * r * 0.7, s.y + ny * r * 0.8 - dyn * r * 0.7);
        ctx.closePath();
        ctx.fillStyle = i % 4 === 0 ? RED : GOLD; ctx.fill();
        ctx.strokeStyle = OUT; ctx.lineWidth = 1 * S; ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,214,140,.5)'; ctx.lineWidth = 1.1 * S;
      for (var b = 0; b < 3; b++) {
        var off = (b - 1) * 0.35 * r, bl = 1.35 + 0.22 * Math.sin(t * 6 + i + b);
        ctx.beginPath();
        ctx.moveTo(s.x - nx * r * 0.85 + dxn * off, s.y - ny * r * 0.85 + dyn * off);
        ctx.lineTo(s.x - nx * r * bl - dxn * (r * 0.45 - off), s.y - ny * r * bl - dyn * (r * 0.45 - off));
        ctx.stroke();
      }
    }

    var tl = segs[N - 1], tr = 36 * S;
    for (var q = -1; q <= 1; q++) {
      var ta = tl.a + Math.PI + q * 0.5 + Math.sin(t * 5 + q) * 0.18;
      ctx.beginPath(); ctx.moveTo(tl.x, tl.y);
      ctx.quadraticCurveTo(tl.x + Math.cos(ta + 0.32) * tr * 0.6, tl.y + Math.sin(ta + 0.32) * tr * 0.6, tl.x + Math.cos(ta) * tr, tl.y + Math.sin(ta) * tr);
      ctx.quadraticCurveTo(tl.x + Math.cos(ta - 0.32) * tr * 0.6, tl.y + Math.sin(ta - 0.32) * tr * 0.6, tl.x, tl.y);
      ctx.fillStyle = q ? RED : GOLD; ctx.fill();
    }

    ctx.beginPath();
    for (var i2 = 0; i2 < N; i2++) {
      var s3 = segs[i2], n3 = nrm(i2), r3 = radius(i2);
      i2 ? ctx.lineTo(s3.x + n3[0] * r3, s3.y + n3[1] * r3) : ctx.moveTo(s3.x + n3[0] * r3, s3.y + n3[1] * r3);
    }
    for (var j2 = N - 1; j2 >= 0; j2--) {
      var s4 = segs[j2], n4 = nrm(j2), r4 = radius(j2);
      ctx.lineTo(s4.x - n4[0] * r4, s4.y - n4[1] * r4);
    }
    ctx.closePath();
    ctx.fillStyle = GOLD; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.6 * S; ctx.lineJoin = 'round'; ctx.stroke();

    band(0.3, 0.98, 'rgba(170,62,20,.55)');
    band(-0.12, -0.9, 'rgba(255,232,178,.8)');

    for (var i3 = N - 2; i3 >= 1; i3--) {
      var s5 = segs[i3], r5 = radius(i3), n5 = nrm(i3), f5 = side(i3);
      var nx5 = n5[0] * f5, ny5 = n5[1] * f5;
      ctx.strokeStyle = 'rgba(120,40,10,.5)'; ctx.lineWidth = 1.1 * S;
      for (var row = 0; row < 2; row++) {
        var o = row ? 0.62 : 0.2, cxs = s5.x + nx5 * r5 * o, cys = s5.y + ny5 * r5 * o;
        ctx.beginPath(); ctx.arc(cxs, cys, r5 * 0.36, s5.a + Math.PI - 1.15, s5.a + Math.PI + 1.15); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(196,112,48,.5)'; ctx.lineWidth = 1 * S;
      ctx.beginPath();
      ctx.moveTo(s5.x - nx5 * r5 * 0.18, s5.y - ny5 * r5 * 0.18);
      ctx.lineTo(s5.x - nx5 * r5 * 0.88, s5.y - ny5 * r5 * 0.88);
      ctx.stroke();
      if (i3 % 6 === 3) {
        ctx.beginPath();
        ctx.moveTo(s5.x + n5[0] * r5 * 0.99, s5.y + n5[1] * r5 * 0.99);
        ctx.lineTo(s5.x - n5[0] * r5 * 0.99, s5.y - n5[1] * r5 * 0.99);
        ctx.strokeStyle = RED_D; ctx.lineWidth = 3.6 * S; ctx.stroke();
        ctx.strokeStyle = GOLD_HI; ctx.lineWidth = 0.9 * S; ctx.stroke();
      }
    }

    leg(L1, 0, false); leg(L2, Math.PI, false);
  }

  function drawHead() {
    var s = segs[0], k = S * 1.6;
    var fl = head.flip, fy = Math.abs(fl) < 0.18 ? (fl < 0 ? -0.18 : 0.18) : fl;
    var jaw = 0.12 + 0.07 * Math.sin(t * 2.6) + roar * 0.5;
    ctx.save();
    ctx.translate(s.x, s.y); ctx.rotate(head.a); ctx.scale(k, k * fy);

    for (var m = 0; m < 9; m++) {
      var ang = -0.95 + m * 0.2375, sway = Math.sin(t * 5 + m) * 4;
      var tx = -30 - 10 * Math.abs(Math.sin(ang)) + sway, ty = Math.sin(ang) * 34;
      ctx.beginPath(); ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(-18, ty * 0.7 + 6, tx, ty);
      ctx.quadraticCurveTo(-18, ty * 0.7 - 6, -6, 0);
      ctx.fillStyle = m % 2 ? RED : GOLD; ctx.fill();
    }

    ctx.lineCap = 'round';
    [[0, 1], [4, 0.75]].forEach(function (h) {
      ctx.save(); ctx.translate(h[0], 0); ctx.globalAlpha = h[1];
      ctx.beginPath(); ctx.moveTo(-2, -11); ctx.quadraticCurveTo(-12, -27, -31, -31);
      ctx.moveTo(-14, -24); ctx.quadraticCurveTo(-17, -35, -10, -41);
      ctx.strokeStyle = OUT; ctx.lineWidth = 5.2; ctx.stroke();
      ctx.strokeStyle = GOLD_HI; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    });

    ctx.save(); ctx.translate(-2, 4); ctx.rotate(jaw);
    ctx.beginPath(); ctx.moveTo(6, -2); ctx.quadraticCurveTo(22, -1, 34, 4);
    ctx.quadraticCurveTo(24, 14, 4, 12); ctx.quadraticCurveTo(-6, 8, -10, 4); ctx.closePath();
    ctx.fillStyle = '#D9662A'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#FFF6E0';
    for (var tt = 0; tt < 5; tt++) {
      var tx2 = 10 + tt * 5; ctx.beginPath(); ctx.moveTo(tx2, 0.2 + tt * 0.5); ctx.lineTo(tx2 + 2, -3.4 + tt * 0.5); ctx.lineTo(tx2 + 4, 0.6 + tt * 0.5); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,214,140,.7)'; ctx.lineWidth = 0.9;
    for (var bd = 0; bd < 4; bd++) {
      ctx.beginPath(); ctx.moveTo(2 + bd * 5, 11); ctx.quadraticCurveTo(-4 + bd * 4, 20, -12 + bd * 3 + Math.sin(t * 4 + bd) * 2, 26); ctx.stroke();
    }
    ctx.restore();

    var hg = ctx.createLinearGradient(-14, -22, 32, 10);
    hg.addColorStop(0, GOLD_HI); hg.addColorStop(0.5, GOLD); hg.addColorStop(1, '#C8541B');
    ctx.beginPath(); ctx.moveTo(-14, -12);
    ctx.bezierCurveTo(0, -22, 20, -16, 34, -8);
    ctx.quadraticCurveTo(42, -5, 38, 1);
    ctx.lineTo(8, 2); ctx.quadraticCurveTo(-6, 6, -14, 10); ctx.closePath();
    ctx.fillStyle = hg; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.3; ctx.stroke();

    ctx.fillStyle = '#FFF6E0';
    for (var ut = 0; ut < 4; ut++) {
      var ux = 12 + ut * 6; ctx.beginPath(); ctx.moveTo(ux, 1.4); ctx.lineTo(ux + 2, 5); ctx.lineTo(ux + 4, 1.6); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(33, -4.5, 2.6, 0.4, 5.4); ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke();

    ctx.beginPath(); ctx.moveTo(1, -15); ctx.quadraticCurveTo(12, -21, 21, -14);
    ctx.strokeStyle = RED; ctx.lineWidth = 2.6; ctx.stroke();

    ctx.globalCompositeOperation = 'lighter';
    var eg = ctx.createRadialGradient(10, -9, 0, 10, -9, 15);
    eg.addColorStop(0, 'rgba(255,200,90,' + (0.4 + roar * 0.5) + ')'); eg.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(10, -9, 15, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath(); ctx.ellipse(10, -9, 5.2, 3.8, -0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF6E0'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(11.6, -9, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = roar > 0.15 ? RED : '#1A0A06'; ctx.fill();
    ctx.beginPath(); ctx.arc(12.4, -10, 0.8, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();

    [[36, -2], [30, 6]].forEach(function (w, wi) {
      var px = w[0], py = w[1];
      for (var j = 1; j <= 22; j++) {
        var x = w[0] - j * 4.4, y = w[1] + j * (wi ? 1.4 : 0.8) + Math.sin(t * 4.2 - j * 0.35 + wi) * j * 0.55;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y);
        ctx.strokeStyle = 'rgba(255,227,161,' + (1 - j / 26) + ')'; ctx.lineWidth = 2.2 - j * 0.08; ctx.stroke();
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
    drawGlow();
    drawPearl();
    drawBody();
    drawHead();
    drawEmbers();
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
      spark(pearl.x, pearl.y, 110, 7 * S, 6 * S);
      if (reduce) { draw(); stop(); return; }
      setTimeout(stop, 1600);
      return;
    }
    if (shakeAdded) {
      roar = 1; flash = 0.14;
      spark(segs[0].x, segs[0].y, 36, 3.2 * S, 10 * S);
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
    for (var i = 0; i < 260; i++) step(1);
    embers.length = 0;
    draw();
  } else {
    raf = requestAnimationFrame(frame);
  }
})();
