/* =========================================================================
   OYUN SALONU — PATİLİ YARIŞ · ÇİZİM
   Tüm görseller kodla tuvale çizilir (resim dosyası yok): yumuşak 3B çizgi
   film görünümü için radyal degradeler, kenar ışığı, zemin gölgesi, ezilme-
   esneme ve kulak/kuyruk yay fiziği. Karakterler ayak tabanı orijinli,
   sağa bakan bir iskelet üzerine katman katman giydirilir.
   ========================================================================= */
(function (root) {
'use strict';
const NS = root.PatiliYaris = root.PatiliYaris || {};
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

/* ------------------------------------------------------------------ renk */
const hex2rgb = h => { if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; };
const rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const SHC = new Map();
function mix(a, b, t) { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); }
function shade(h, t) { const k = h + t; let v = SHC.get(k); if (!v) { v = t < 0 ? mix(h, '#1d1028', -t) : mix(h, '#ffffff', t); SHC.set(k, v); } return v; }
const rgba = (h, a) => { const c = hex2rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };

/* ------------------------------------------------------------------ temel şekiller */
let LW = 1;                                  // çizgi kalınlığı çarpanı (küçük çizimde kalın)
function ballGrad(g, x, y, r, col) {
  const gr = g.createRadialGradient(x - r * .38, y - r * .45, r * .06, x, y, r * 1.06);
  gr.addColorStop(0, shade(col, .42)); gr.addColorStop(.5, col); gr.addColorStop(1, shade(col, -.3));
  return gr;
}
function rim(g, x, y, rx, ry, a0 = .1, a1 = 1.25) {
  g.beginPath(); g.ellipse(x, y, Math.max(.1, rx - 1.1), Math.max(.1, ry - 1.1), 0, a0, a1);
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.2 * LW; g.stroke();
}
function blob(g, x, y, rx, ry, col, o = {}) {
  g.beginPath(); g.ellipse(x, y, rx, ry, o.rot || 0, 0, TAU);
  g.fillStyle = o.flat ? col : ballGrad(g, x, y, Math.max(rx, ry), col); g.fill();
  if (o.line !== false) { g.lineWidth = 1.5 * LW; g.strokeStyle = shade(col, -.58); g.stroke(); }
  if (o.rim !== false && !o.flat) rim(g, x, y, rx, ry);
}
const ball = (g, x, y, r, col, o) => blob(g, x, y, r, r, col, o);
function limb(g, x0, y0, x1, y1, w, col, line = true) {
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
  if (line) { g.strokeStyle = shade(col, -.58); g.lineWidth = w + 2.4 * LW; g.stroke(); }
  g.strokeStyle = col; g.lineWidth = w; g.stroke();
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l * w * .22, ny = dx / l * w * .22;
  g.beginPath(); g.moveTo(x0 - Math.abs(nx), y0 - Math.abs(ny)); g.lineTo(x1 - Math.abs(nx), y1 - Math.abs(ny));
  g.strokeStyle = rgba(shade(col, .5), .45); g.lineWidth = w * .32; g.stroke();
}
function poly(g, pts, col, line = true, grad) {
  g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath();
  g.fillStyle = grad || col; g.fill();
  if (line) { g.lineWidth = 1.4 * LW; g.strokeStyle = shade(col, -.58); g.lineJoin = 'round'; g.stroke(); }
}
function rrect(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function star(g, x, y, r, n = 5, inner = .45, rot = -Math.PI / 2) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rr = i % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath();
}
function heart(g, x, y, s) {
  g.beginPath(); g.moveTo(x, y + s * .35);
  g.bezierCurveTo(x - s * 1.1, y - s * .35, x - s * .45, y - s * 1.05, x, y - s * .45);
  g.bezierCurveTo(x + s * .45, y - s * 1.05, x + s * 1.1, y - s * .35, x, y + s * .35); g.closePath();
}

/* ------------------------------------------------------------------ türler */
const SP = {
  tilki: { main: '#ff8a3d', belly: '#fff3e2', acc: '#5a2a12', inner: '#ffd2b0', nose: '#2b1a14', ear: 'fox', tail: 'fox', muzzle: 'fox' },
  panda: { main: '#f7f6f2', belly: '#ffffff', acc: '#2b2b35', inner: '#2b2b35', nose: '#22222b', ear: 'round', tail: 'nub', muzzle: 'panda', limbAcc: true },
  tavsan: { main: '#efe6f7', belly: '#ffffff', acc: '#d9c8ea', inner: '#ffb3cf', nose: '#ff7aa8', ear: 'bunny', tail: 'puff', muzzle: 'bunny' },
  kedi: { main: '#f2a65a', belly: '#fff4e4', acc: '#c46d25', inner: '#ffc2c2', nose: '#ff8fa3', ear: 'cat', tail: 'cat', muzzle: 'cat' },
  penguen: { main: '#33405e', belly: '#ffffff', acc: '#ffa21f', inner: '#33405e', nose: '#ffa21f', ear: 'none', tail: 'nub', muzzle: 'beak', flipper: true },
  ayicik: { main: '#b07a45', belly: '#f1d3a8', acc: '#7a4f28', inner: '#e8b98a', nose: '#2b1a14', ear: 'round', tail: 'nub', muzzle: 'bear' },
  kurbaga: { main: '#6fd36a', belly: '#e8f7b0', acc: '#3e9a3b', inner: '#6fd36a', nose: '#2f6b2b', ear: 'none', tail: 'none', muzzle: 'frog', frogEyes: true },
  rakun: { main: '#8f93a0', belly: '#f2f2f6', acc: '#2e2f38', inner: '#d6d7de', nose: '#22222b', ear: 'cat', tail: 'raccoon', muzzle: 'raccoon', mask: true },
  ejderha: { main: '#7fd35a', belly: '#ffe28a', acc: '#4a9a35', inner: '#fff1c2', nose: '#2f6b2b', ear: 'horns', tail: 'dragon', muzzle: 'dragon', wings: true },
  unicorn: { main: '#fbf7ff', belly: '#ffffff', acc: '#c9b6ff', inner: '#ffd1ec', nose: '#ff9cc8', ear: 'unicorn', tail: 'unicorn', muzzle: 'horse' }
};
const RAINBOW = ['#ff4f6d', '#ff9a3c', '#ffd84a', '#5cd35a', '#4fb3ff', '#9b6bff'];
function palOf(look, B) {
  const sp = SP[look.char] || SP.tilki;
  const p = { main: sp.main, belly: sp.belly, acc: sp.acc, inner: sp.inner, nose: sp.nose, sp, fx: null };
  const sk = look.skin && B[look.skin];
  if (sk) {
    if (look.char === 'panda') { p.main = sk.c[0]; p.belly = sk.c[1]; }
    else { p.main = sk.c[0]; p.belly = sk.c[1]; p.acc = shade(sk.c[0], -.32); }
    if (look.char === 'penguen') p.acc = sp.acc;
    p.fx = sk.st === 'gold' ? 'gold' : sk.st === 'galaxy' ? 'galaxy' : null;
  }
  return p;
}

/* ------------------------------------------------------------------ poz */
function computePose(P) {
  const t = P.t || 0, ph = (P.ph || 0) * TAU;
  const o = { bob: 0, lean: 0, legs: [{ a: 0, k: .15 }, { a: 0, k: .15 }], arms: [{ a: .2 }, { a: -.1 }], tilt: 0, eyes: 'open', mouth: 'smile', sx: 1, sy: 1, rot: 0, ry: 0 };
  const s = Math.sin(ph), c = Math.cos(ph);
  switch (P.k) {
    case 'run':
      o.legs[1] = { a: .95 * s, k: Math.max(0, -c) * 1.15 + .15 }; o.legs[0] = { a: -.95 * s, k: Math.max(0, c) * 1.15 + .15 };
      o.arms[1] = { a: -1.05 * s }; o.arms[0] = { a: 1.05 * s };
      o.bob = -Math.abs(c) * 2.6; o.lean = .14; o.mouth = 'open'; o.tilt = s * .04;
      break;
    case 'jump':
      o.legs[1] = { a: .95, k: 1.25 }; o.legs[0] = { a: -.35, k: .95 }; o.arms[1] = { a: 2.3 }; o.arms[0] = { a: -2.2 };
      o.lean = .06; o.mouth = 'grin'; break;
    case 'fall': {
      const w = Math.sin(t * 22) * .45;
      o.legs[1] = { a: .35, k: .35 }; o.legs[0] = { a: -.25, k: .25 }; o.arms[1] = { a: 2.5 + w }; o.arms[0] = { a: -2.4 - w };
      o.mouth = 'o'; break;
    }
    case 'slide':
      o.rot = -1.12; o.legs[1] = { a: 1.25, k: .1 }; o.legs[0] = { a: 1.0, k: .35 }; o.arms[1] = { a: -2.7 }; o.arms[0] = { a: -2.3 };
      o.mouth = 'grin'; o.lean = 0; break;
    case 'stun':
      o.lean = Math.sin(t * 11) * .16; o.tilt = Math.sin(t * 9) * .2; o.legs[1] = { a: .35, k: .2 }; o.legs[0] = { a: -.35, k: .2 };
      o.arms[1] = { a: .5 }; o.arms[0] = { a: -.4 }; o.eyes = 'spiral'; o.mouth = 'wavy'; o.sy = .96; o.sx = 1.03; break;
    case 'stuck':
      o.legs[1] = { a: .5, k: .6 }; o.legs[0] = { a: -.5, k: .4 }; o.arms[1] = { a: 1.9 + Math.sin(t * 18) * .3 }; o.arms[0] = { a: -1.6 };
      o.eyes = 'hurt'; o.mouth = 'wavy'; o.lean = .2 + Math.sin(t * 18) * .05; break;
    case 'spin':
      o.rot = t * 16; o.legs[1] = { a: .6, k: .3 }; o.legs[0] = { a: -.6, k: .3 }; o.arms[1] = { a: 2.3 }; o.arms[0] = { a: -2.2 }; o.eyes = 'hurt'; o.mouth = 'o'; break;
    case 'win': {
      const hop = Math.abs(Math.sin(t * 6));
      o.bob = -hop * 10; o.arms[1] = { a: 2.45 + Math.sin(t * 12) * .2 }; o.arms[0] = { a: -2.45 - Math.sin(t * 12) * .2 };
      o.legs[1] = { a: .25 * hop, k: .5 * hop }; o.legs[0] = { a: -.2 * hop, k: .4 * hop }; o.eyes = 'happy'; o.mouth = 'grin';
      o.sy = 1 + (hop < .15 ? -.08 : .03); o.sx = 2 - o.sy; break;
    }
    case 'idle': default: {
      const br = Math.sin(t * 2.4);
      o.sy = 1 + br * .018; o.sx = 1 - br * .012; o.bob = 0;
      o.arms[1] = { a: .18 + br * .05 }; o.arms[0] = { a: -.12 - br * .05 };
      o.legs[1] = { a: .1, k: .1 }; o.legs[0] = { a: -.1, k: .1 };
      const wv = (t % 5.5);
      if (P.wave && wv < 1.3) { o.arms[1] = { a: 2.4 + Math.sin(wv * 14) * .35 }; o.mouth = 'open'; }
      o.tilt = Math.sin(t * .9) * .05;
      break;
    }
  }
  if (P.k === 'jump' || P.k === 'fall') { const st = clamp((P.vy || 0) / 1400, -.5, .5); o.sy = 1 - st * .22; o.sx = 1 + st * .16; }
  if (P.sq) { o.sy *= 1 - P.sq; o.sx *= 1 + P.sq * .8; }
  if (P.blink && o.eyes === 'open') o.eyes = 'closed';
  return o;
}

/* ------------------------------------------------------------------ türe özgü parçalar */
function earDraw(g, pal, K, side) {
  const { hx, hy, hr } = K, sp = pal.sp, e = K.ear || 0;
  const back = side === 0;
  const main = back ? shade(pal.main, -.12) : pal.main;
  const ox = back ? -6 : 6, oy = -hr * .62;
  g.save(); g.translate(hx + ox * hr / 17.5, hy + oy);
  switch (sp.ear) {
    case 'fox': case 'cat': {
      const h = sp.ear === 'fox' ? 15 : 11, w = sp.ear === 'fox' ? 7.5 : 7;
      g.rotate((back ? -.32 : .22) + e * .6);
      poly(g, [-w, 4, w, 4, 1, -h], main);
      poly(g, [-w * .5, 2.5, w * .55, 2.5, 1, -h * .62], pal.inner, false);
      if (sp.ear === 'fox') poly(g, [-w * .35, -h * .55, w * .45, -h * .55, 1, -h], pal.acc, false);
      break;
    }
    case 'round':
      g.rotate((back ? -.3 : .25) + e * .3);
      ball(g, 0, -1, 6.5, pal.sp.limbAcc ? pal.acc : main);
      if (!pal.sp.limbAcc) ball(g, .5, -.5, 3.4, pal.inner, { line: false, rim: false });
      break;
    case 'bunny': {
      g.rotate((back ? -.35 : .12) + e * 1.1);
      blob(g, 0, -13, 5.2, 14, main);
      blob(g, .3, -12, 2.6, 10, pal.inner, { line: false, rim: false });
      break;
    }
    case 'horns':
      g.rotate((back ? -.4 : .25) + e * .15);
      poly(g, [-3, 3, 3, 3, 2, -11], '#fff1c2');
      break;
    case 'unicorn':
      g.rotate((back ? -.35 : .25) + e * .5);
      poly(g, [-5, 3, 5, 3, 1, -10], main); poly(g, [-2.5, 2, 2.5, 2, 1, -6], pal.inner, false);
      break;
    default: break;
  }
  g.restore();
}
function tailDraw(g, pal, K) {
  const sp = pal.sp, t = K.t, a = (K.tail || 0), wag = Math.sin(t * (K.k === 'run' ? 14 : 3)) * (K.k === 'run' ? .18 : .12);
  const bx = K.bx - K.brx * .78, by = K.by + 5;
  g.save(); g.translate(bx, by); g.rotate(a * .8 + wag);
  switch (sp.tail) {
    case 'fox': {
      g.rotate(-.55);
      blob(g, -11, -2, 13.5, 7.2, pal.main, { rot: -.3 });
      blob(g, -21.5, -6.5, 5.2, 4.6, pal.belly, { rot: -.3, line: false });
      break;
    }
    case 'cat': {
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-10, 2, -14, -10, -10 + Math.sin(t * 3) * 3, -18);
      g.strokeStyle = shade(pal.main, -.58); g.lineWidth = 6.4; g.stroke();
      g.strokeStyle = pal.main; g.lineWidth = 4; g.stroke();
      break;
    }
    case 'raccoon': {
      g.rotate(-.5);
      blob(g, -10, -2, 12, 6.3, pal.main, { rot: -.3 });
      for (let i = 0; i < 3; i++) { g.save(); g.translate(-6 - i * 5.5, -.5 - i * 1.6); g.rotate(-.3); g.fillStyle = pal.acc; g.fillRect(-1.5, -4.6, 2.8, 9.2); g.restore(); }
      break;
    }
    case 'puff': ball(g, -2, -2, 5.2, pal.belly); break;
    case 'nub': ball(g, -1, -1, 3.8, pal.sp.limbAcc ? pal.acc : pal.main); break;
    case 'dragon': {
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-12, 6, -20, -2);
      g.strokeStyle = shade(pal.main, -.58); g.lineWidth = 8; g.stroke(); g.strokeStyle = pal.main; g.lineWidth = 5.5; g.stroke();
      poly(g, [-18, -6, -27, -4, -20, 3], pal.acc);
      break;
    }
    case 'unicorn': {
      for (let i = 0; i < 4; i++) {
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-10, -4 + i * 3, -18 - i, 4 + i * 3.2 + Math.sin(t * 5 + i) * 1.5);
        g.strokeStyle = RAINBOW[(i * 2) % 6]; g.lineWidth = 3.6; g.lineCap = 'round'; g.stroke();
      }
      break;
    }
    default: break;
  }
  g.restore();
}
function muzzleDraw(g, pal, K, P) {
  const { hx, hy } = K, sp = pal.sp;
  switch (sp.muzzle) {
    case 'fox': blob(g, hx + 9, hy + 6, 9.5, 6.4, pal.belly, { line: false, rim: false }); break;
    case 'panda': break;
    case 'bunny': case 'cat': blob(g, hx + 9, hy + 6.5, 7, 4.8, pal.belly, { line: false, rim: false }); break;
    case 'bear': case 'raccoon': blob(g, hx + 10, hy + 6, 7.5, 5.5, pal.belly, { line: false, rim: false }); break;
    case 'horse': blob(g, hx + 10, hy + 6, 8, 6, shade(pal.main, -.04), { line: false, rim: false }); break;
    case 'dragon': blob(g, hx + 10, hy + 5, 8.5, 6, shade(pal.main, .1), { line: false, rim: false }); break;
    case 'frog': blob(g, hx + 6, hy + 7, 11, 6, pal.belly, { line: false, rim: false }); break;
    default: break;
  }
  if (sp.mask) { g.fillStyle = pal.acc; g.beginPath(); g.ellipse(hx + 7, hy - 1, 11, 5, -.05, 0, TAU); g.fill(); }
}
function noseMouth(g, pal, K, pose) {
  const { hx, hy } = K, sp = pal.sp;
  g.lineCap = 'round';
  if (sp.muzzle === 'beak') {
    poly(g, [hx + 13, hy + 1, hx + 23, hy + 4.5, hx + 13, hy + 8], pal.nose);
  } else if (sp.muzzle !== 'frog') {
    blob(g, hx + 16.5, hy + 3.2, 2.6, 2, pal.nose, { line: false, rim: false });
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(hx + 15.8, hy + 2.5, .8, 0, TAU); g.fill();
  }
  const mx = hx + (sp.muzzle === 'frog' ? 8 : 14), my = hy + (sp.muzzle === 'frog' ? 7 : 8);
  g.strokeStyle = '#3a1a1a'; g.lineWidth = 1.3 * LW; g.fillStyle = '#c2364e';
  switch (pose.mouth) {
    case 'open': case 'grin':
      g.beginPath(); g.moveTo(mx - 3.5, my - .5); g.quadraticCurveTo(mx, my + (pose.mouth === 'grin' ? 6 : 4.5), mx + 3.5, my - .5); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ff8fa3'; g.beginPath(); g.ellipse(mx, my + 2, 1.8, 1.1, 0, 0, TAU); g.fill();
      break;
    case 'o': g.beginPath(); g.ellipse(mx, my + 1.4, 2, 2.6, 0, 0, TAU); g.fill(); g.stroke(); break;
    case 'wavy': g.beginPath(); g.moveTo(mx - 4, my + 1); for (let i = 1; i <= 4; i++) g.lineTo(mx - 4 + i * 2, my + 1 + (i % 2 ? -1.2 : 1.2)); g.stroke(); break;
    default: g.beginPath(); g.moveTo(mx - 3, my); g.quadraticCurveTo(mx - 1.5, my + 2.4, mx, my + .5); g.quadraticCurveTo(mx + 1.5, my + 2.4, mx + 3, my); g.stroke(); break;
  }
  if (sp.muzzle === 'bunny') { g.fillStyle = '#fff'; g.fillRect(mx - 1.6, my + .2, 3.2, 2.6); g.strokeRect(mx - 1.6, my + .2, 3.2, 2.6); }
  if (sp.ear === 'cat' && !sp.mask) {
    g.strokeStyle = 'rgba(60,30,30,.55)'; g.lineWidth = .8 * LW;
    for (const d of [-1.5, 1.5]) { g.beginPath(); g.moveTo(hx + 12, hy + 5 + d); g.lineTo(hx + 22, hy + 4 + d * 2); g.stroke(); }
  }
}
function eyesDraw(g, pal, K, pose) {
  const { hx, hy } = K, sp = pal.sp;
  const E = sp.frogEyes ? [[hx + 1, hy - 14, 5, 5.6], [hx + 11, hy - 14.5, 5.4, 6]] : [[hx + 3, hy - 1, 3.6, 4.6], [hx + 11, hy - 1.2, 4, 5]];
  if (sp.frogEyes) E.forEach(e => ball(g, e[0], e[1] + 1, e[2] + 2.2, pal.main));
  if (sp.muzzle === 'panda') { g.fillStyle = pal.acc; E.forEach(e => { g.beginPath(); g.ellipse(e[0] - .5, e[1] + .8, e[2] + 2.2, e[3] + 1.6, -.4, 0, TAU); g.fill(); }); }
  g.lineCap = 'round';
  E.forEach(([x, y, rx, ry], i) => {
    if (pose.eyes === 'closed') { g.strokeStyle = '#2b1a2e'; g.lineWidth = 1.6 * LW; g.beginPath(); g.moveTo(x - rx, y + 1); g.quadraticCurveTo(x, y + 2.5, x + rx, y + 1); g.stroke(); return; }
    if (pose.eyes === 'happy') { g.strokeStyle = '#2b1a2e'; g.lineWidth = 1.8 * LW; g.beginPath(); g.moveTo(x - rx, y + 1.5); g.quadraticCurveTo(x, y - 3.5, x + rx, y + 1.5); g.stroke(); return; }
    if (pose.eyes === 'hurt') { g.strokeStyle = '#2b1a2e'; g.lineWidth = 1.6 * LW; const d = i ? -1 : 1; g.beginPath(); g.moveTo(x - rx * d, y - 2.5); g.lineTo(x + rx * d * .6, y); g.lineTo(x - rx * d, y + 2.5); g.stroke(); return; }
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(40,20,40,.55)'; g.lineWidth = .9 * LW; g.stroke();
    if (pose.eyes === 'spiral') {
      g.strokeStyle = '#2b1a2e'; g.lineWidth = 1 * LW; g.beginPath();
      for (let a = 0; a < 10; a += .4) { const rr = a * .32; g.lineTo(x + Math.cos(a + K.t * 8) * rr, y + Math.sin(a + K.t * 8) * rr); }
      g.stroke(); return;
    }
    const px = x + rx * .25, py = y + ry * .1;
    const ig = g.createRadialGradient(px - .6, py - .8, .3, px, py, ry * .8);
    ig.addColorStop(0, '#5a3b2a'); ig.addColorStop(.6, '#2b1a1e'); ig.addColorStop(1, '#120a10');
    g.fillStyle = ig; g.beginPath(); g.ellipse(px, py, rx * .72, ry * .78, 0, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(px + rx * .2, py - ry * .35, rx * .3, 0, TAU); g.fill();
    g.beginPath(); g.arc(px - rx * .3, py + ry * .35, rx * .14, 0, TAU); g.fill();
  });
  // yanak allığı
  g.fillStyle = 'rgba(255,110,140,.38)';
  g.beginPath(); g.ellipse(hx + 6, hy + 7.5, 3.6, 2, 0, 0, TAU); g.fill();
  if (!sp.frogEyes) { g.beginPath(); g.ellipse(hx - 3.5, hy + 6.5, 2.6, 1.7, 0, 0, TAU); g.fill(); }
}

/* ------------------------------------------------------------------ kozmetikler
   Her çizim (g, renkler, K) alır; K anahtar noktalar (baş, gövde, eller…)      */
const HATS = {
  cap(g, c, K) { const { hx, hy, hr } = K; g.save(); g.translate(hx, hy - hr * .55); g.rotate(-.12);
    g.beginPath(); g.ellipse(0, 0, hr * .95, hr * .62, 0, Math.PI, TAU); g.closePath(); g.fillStyle = ballGrad(g, 0, -4, hr, c[0]); g.fill(); g.strokeStyle = shade(c[0], -.55); g.lineWidth = 1.4 * LW; g.stroke();
    blob(g, hr * .95, 1, hr * .62, 2.6, shade(c[0], -.1), { rim: false }); ball(g, 0, -hr * .6, 2, c[1], { rim: false });
    g.fillStyle = c[1]; g.beginPath(); g.arc(hr * .2, -hr * .25, 3.2, 0, TAU); g.fill(); g.restore(); },
  beanie(g, c, K) { const { hx, hy, hr } = K; g.save(); g.translate(hx, hy - hr * .45);
    g.beginPath(); g.ellipse(0, 0, hr * .98, hr * .78, 0, Math.PI, TAU); g.closePath(); g.fillStyle = ballGrad(g, 0, -5, hr, c[0]); g.fill(); g.strokeStyle = shade(c[0], -.55); g.lineWidth = 1.4 * LW; g.stroke();
    g.strokeStyle = rgba(shade(c[0], -.25), .7); g.lineWidth = 1.2; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 4, -1); g.lineTo(i * 4.6, -hr * .65); g.stroke(); }
    rrect(g, -hr, -3, hr * 2, 6, 3); g.fillStyle = shade(c[0], -.12); g.fill(); g.stroke();
    ball(g, 0, -hr * .82, 4.5, c[1]); g.restore(); },
  party(g, c, K) { const { hx, hy, hr } = K; g.save(); g.translate(hx + 1, hy - hr * .7); g.rotate(.18);
    const gr = g.createLinearGradient(-8, 0, 8, 0); gr.addColorStop(0, shade(c[0], .3)); gr.addColorStop(1, shade(c[0], -.2));
    poly(g, [-9, 2, 9, 2, 0, -22], c[0], true, gr);
    g.fillStyle = c[1]; [[-3, -4], [3, -9], [-1, -14], [2, -2]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); });
    ball(g, 0, -22, 3.4, c[1]); g.restore(); },
  cowboy(g, c, K) { const { hx, hy, hr } = K; g.save(); g.translate(hx, hy - hr * .62); g.rotate(-.06);
    blob(g, 0, 1, hr * 1.45, 4.2, shade(c[0], -.08), { rim: false });
    g.beginPath(); g.moveTo(-hr * .7, 0); g.quadraticCurveTo(-hr * .75, -15, -3, -13); g.lineTo(0, -10); g.lineTo(3, -13); g.quadraticCurveTo(hr * .75, -15, hr * .7, 0); g.closePath();
    g.fillStyle = ballGrad(g, 0, -8, hr, c[0]); g.fill(); g.strokeStyle = shade(c[0], -.55); g.lineWidth = 1.4 * LW; g.stroke();
    g.fillStyle = c[1]; g.fillRect(-hr * .7, -4, hr * 1.4, 3); g.restore(); },
  tophat(g, c, K) { const { hx, hy, hr } = K; g.save(); g.translate(hx, hy - hr * .7); g.rotate(-.08);
    blob(g, 0, 0, hr * 1.05, 3.4, c[0], { rim: false });
    rrect(g, -hr * .62, -21, hr * 1.24, 21, 2); g.fillStyle = ballGrad(g, -3, -14, 16, c[0]); g.fill(); g.strokeStyle = shade(c[0], -.6); g.lineWidth = 1.4 * LW; g.stroke();
    g.fillStyle = c[1]; g.fillRect(-hr * .62, -6.5, hr * 1.24, 4); g.restore(); },
  pirate(g, c, K) { const { hx, hy, hr } = K; g.save(); g.translate(hx, hy - hr * .62);
    g.beginPath(); g.moveTo(-hr * 1.15, 1); g.quadraticCurveTo(-hr * .6, -6, -hr * .4, -14); g.quadraticCurveTo(0, -20, hr * .4, -14); g.quadraticCurveTo(hr * .6, -6, hr * 1.15, 1); g.quadraticCurveTo(0, -4, -hr * 1.15, 1);
    g.fillStyle = ballGrad(g, 0, -8, hr, c[0]); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1.2 * LW; g.stroke();
    g.fillStyle = c[1]; g.beginPath(); g.arc(0, -9, 3.4, 0, TAU); g.fill(); g.fillStyle = c[0]; g.fillRect(-1.6, -9.6, 1.2, 1.2); g.fillRect(.4, -9.6, 1.2, 1.2); g.restore(); },
  chef(g, c, K) { const { hx, hy, hr } = K; g.save(); g.translate(hx, hy - hr * .62);
    rrect(g, -hr * .62, -6, hr * 1.24, 8, 2); g.fillStyle = c[0]; g.fill(); g.strokeStyle = '#b8bccc'; g.lineWidth = 1.2; g.stroke();
    [[-7, -12, 7], [0, -16, 8.5], [7, -12, 7]].forEach(([x, y, r]) => ball(g, x, y, r, c[0])); g.restore(); },
  flowers(g, c, K) { const { hx, hy, hr } = K; g.save(); g.translate(hx, hy);
    for (let i = 0; i < 6; i++) { const a = -2.7 + i * .44, x = Math.cos(a) * hr * .95, y = Math.sin(a) * hr * .95;
      g.fillStyle = i % 2 ? c[0] : '#fff'; for (let k = 0; k < 5; k++) { const b = k * TAU / 5; g.beginPath(); g.arc(x + Math.cos(b) * 2.6, y + Math.sin(b) * 2.6, 2.2, 0, TAU); g.fill(); }
      g.fillStyle = c[1]; g.beginPath(); g.arc(x, y, 1.7, 0, TAU); g.fill(); }
    g.restore(); },
  headphones(g, c, K) { const { hx, hy, hr } = K; g.save(); g.translate(hx, hy);
    g.beginPath(); g.arc(0, 0, hr * 1.04, Math.PI * 1.08, Math.PI * 1.92); g.strokeStyle = shade(c[0], -.3); g.lineWidth = 5; g.stroke(); g.strokeStyle = c[0]; g.lineWidth = 3; g.stroke();
    blob(g, -1, 1, 5, 7.5, c[0]); blob(g, -1, 1, 2.6, 4.8, c[1], { line: false, rim: false }); g.restore(); },
  mushroom(g, c, K) { const { hx, hy, hr } = K; g.save(); g.translate(hx, hy - hr * .55);
    g.beginPath(); g.ellipse(0, 0, hr * 1.2, hr * .85, 0, Math.PI, TAU); g.closePath(); g.fillStyle = ballGrad(g, 0, -6, hr, c[0]); g.fill(); g.strokeStyle = shade(c[0], -.55); g.lineWidth = 1.4 * LW; g.stroke();
    g.fillStyle = c[1]; [[-8, -5, 3.2], [3, -10, 3.8], [10, -3, 2.6], [-2, -3, 2]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }); g.restore(); },
  viking(g, c, K) { const { hx, hy, hr } = K; g.save(); g.translate(hx, hy - hr * .35);
    poly(g, [-hr * .8, -6, -hr * 1.35, -18, -hr * 1.2, -24, -hr * .95, -12], c[1]); poly(g, [hr * .8, -6, hr * 1.35, -18, hr * 1.2, -24, hr * .95, -12], c[1]);
    g.beginPath(); g.ellipse(0, -2, hr * 1.0, hr * .82, 0, Math.PI, TAU); g.closePath(); g.fillStyle = ballGrad(g, 0, -8, hr, c[0]); g.fill(); g.strokeStyle = shade(c[0], -.55); g.lineWidth = 1.4 * LW; g.stroke();
    g.fillStyle = shade(c[0], -.2); g.fillRect(-hr, -4, hr * 2, 3.6); g.fillRect(-1.5, -hr * .8, 3, hr * .8); g.restore(); },
  wizard(g, c, K) { const { hx, hy, hr } = K; g.save(); g.translate(hx, hy - hr * .65); g.rotate(-.1);
    blob(g, 0, 0, hr * 1.25, 3.6, c[0], { rim: false });
    g.beginPath(); g.moveTo(-hr * .72, -1); g.quadraticCurveTo(-2, -18, 4, -30 + Math.sin(K.t * 3) * 1.5); g.quadraticCurveTo(4, -16, hr * .72, -1); g.closePath();
    g.fillStyle = ballGrad(g, -2, -12, 18, c[0]); g.fill(); g.strokeStyle = shade(c[0], -.6); g.lineWidth = 1.4 * LW; g.stroke();
    g.fillStyle = c[1]; star(g, -2, -10, 3.2); g.fill(); star(g, 3, -19, 2); g.fill(); g.restore(); },
  propeller(g, c, K) { const { hx, hy, hr } = K; g.save(); g.translate(hx, hy - hr * .5);
    g.beginPath(); g.ellipse(0, 0, hr * .95, hr * .62, 0, Math.PI, TAU); g.closePath();
    for (let i = 0; i < 3; i++) { g.save(); g.clip(); g.fillStyle = [c[0], c[1], c[2]][i]; g.fillRect(-hr + i * hr * .67, -hr, hr * .67, hr); g.restore(); }
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#666'; g.fillRect(-.8, -hr * .62 - 5, 1.6, 5);
    const a = K.t * 22, w = Math.abs(Math.cos(a)) * 11 + 2; g.fillStyle = c[2]; g.beginPath(); g.ellipse(0, -hr * .62 - 5, w, 2, 0, 0, TAU); g.fill(); g.restore(); },
  crown(g, c, K) { const { hx, hy, hr } = K; g.save(); g.translate(hx + 1, hy - hr * .72); g.rotate(-.06);
    const gr = g.createLinearGradient(0, -14, 0, 2); gr.addColorStop(0, shade(c[0], .45)); gr.addColorStop(1, shade(c[0], -.25));
    poly(g, [-11, 2, 11, 2, 12, -10, 6, -4, 0, -14, -6, -4, -12, -10], c[0], true, gr);
    g.fillStyle = c[1]; [[-6, -2], [0, -4], [6, -2]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 1.9, 0, TAU); g.fill(); });
    g.fillStyle = 'rgba(255,255,255,.8)'; star(g, -8 + (K.t * 6 % 16), -8, 1.6, 4, .3); g.fill(); g.restore(); }
};
const GLASSES = {
  _frame(g, K, cb) { const { hx, hy } = K; g.save(); g.translate(hx, hy); cb(3, -1, 11, -1.2); g.restore(); },
  shades(g, c, K) { GLASSES._frame(g, K, (ax, ay, bx, by) => {
    g.fillStyle = c[0]; rrect(g, ax - 5, ay - 3.5, 9, 7, 3); g.fill(); rrect(g, bx - 4.5, by - 4, 10, 7.5, 3); g.fill();
    g.strokeStyle = c[0]; g.lineWidth = 1.6; g.beginPath(); g.moveTo(ax + 4, ay - 1); g.lineTo(bx - 4.5, by - 1); g.moveTo(ax - 5, ay - 1); g.lineTo(ax - 12, ay - 3); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(bx - 2, by - 3, 2, 3); g.fillRect(ax - 3, ay - 2.5, 1.6, 2.6); }); },
  round(g, c, K) { GLASSES._frame(g, K, (ax, ay, bx, by) => { g.strokeStyle = c[0]; g.lineWidth = 1.5;
    g.beginPath(); g.arc(ax, ay, 4.6, 0, TAU); g.moveTo(bx + 5.2, by); g.arc(bx, by, 5.2, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(ax + 4.6, ay); g.lineTo(bx - 5.2, by); g.moveTo(ax - 4.6, ay); g.lineTo(ax - 12, ay - 2); g.stroke(); g.fillStyle = 'rgba(200,230,255,.25)'; g.fill(); }); },
  heart(g, c, K) { GLASSES._frame(g, K, (ax, ay, bx, by) => { g.fillStyle = c[0]; heart(g, ax, ay + 1.5, 5); g.fill(); heart(g, bx, by + 2, 6); g.fill();
    g.strokeStyle = shade(c[0], -.4); g.lineWidth = 1.3; g.beginPath(); g.moveTo(ax + 4, ay - 1); g.lineTo(bx - 5, by - 1); g.stroke(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(bx - 2, by - 2, 1.3, 0, TAU); g.fill(); }); },
  star(g, c, K) { GLASSES._frame(g, K, (ax, ay, bx, by) => { g.fillStyle = c[0]; star(g, ax, ay, 6, 5, .5); g.fill(); star(g, bx, by, 7, 5, .5); g.fill();
    g.strokeStyle = shade(c[0], -.45); g.lineWidth = 1; star(g, bx, by, 7, 5, .5); g.stroke(); g.fillStyle = 'rgba(60,40,0,.55)'; g.beginPath(); g.arc(ax, ay, 2.2, 0, TAU); g.arc(bx, by, 2.6, 0, TAU); g.fill(); }); },
  ski(g, c, K) { const { hx, hy, hr } = K; g.save(); g.translate(hx, hy);
    g.strokeStyle = c[1]; g.lineWidth = 3; g.beginPath(); g.arc(0, -1, hr * 1.02, Math.PI * .8, Math.PI * 1.15); g.stroke();
    rrect(g, -1, -6.5, 18, 10, 5); const gr = g.createLinearGradient(0, -6, 0, 4); gr.addColorStop(0, shade(c[0], .4)); gr.addColorStop(1, shade(c[0], -.3)); g.fillStyle = gr; g.fill(); g.strokeStyle = c[1]; g.lineWidth = 2; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(3, -4.5, 6, 2); g.restore(); },
  monocle(g, c, K) { GLASSES._frame(g, K, (ax, ay, bx, by) => { g.strokeStyle = c[0]; g.lineWidth = 1.6; g.beginPath(); g.arc(bx, by, 5.6, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(220,240,255,.3)'; g.fill(); g.lineWidth = .8; g.beginPath(); g.moveTo(bx, by + 5.6); g.quadraticCurveTo(bx - 3, by + 14, bx - 8, by + 18); g.stroke(); }); },
  aviator(g, c, K) { GLASSES._frame(g, K, (ax, ay, bx, by) => {
    const gr = g.createLinearGradient(0, -5, 0, 5); gr.addColorStop(0, '#7a4a1a'); gr.addColorStop(1, '#2a1406');
    g.fillStyle = gr; g.beginPath(); g.ellipse(ax, ay + .5, 4.4, 4.6, .2, 0, TAU); g.fill(); g.beginPath(); g.ellipse(bx, by + .5, 5.4, 5.2, -.15, 0, TAU); g.fill();
    g.strokeStyle = c[0]; g.lineWidth = 1.1; g.stroke(); g.beginPath(); g.moveTo(ax + 3, ay - 3); g.lineTo(bx - 4, by - 3.5); g.moveTo(ax - 4, ay - 1); g.lineTo(ax - 12, ay - 3); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(bx - 2.5, by - 2.5, 2, 2); }); },
  pixel(g, c, K) { GLASSES._frame(g, K, (ax, ay, bx, by) => { g.fillStyle = c[0];
    g.fillRect(ax - 6, ay - 3, 22, 2.4); [[ax - 5, ay - .6], [ax - 2.5, ay - .6], [ax, ay - .6], [bx - 4, by - .4], [bx - 1.5, by - .4], [bx + 1, by - .4], [bx + 3.5, by - .4]].forEach(([x, y]) => g.fillRect(x, y, 2.5, 2.5));
    [[ax - 2.5, ay + 1.9], [bx - 1.5, by + 2.1], [bx + 1, by + 2.1]].forEach(([x, y]) => g.fillRect(x, y, 2.5, 2.5));
    g.fillStyle = '#fff'; g.fillRect(ax - 5, ay - .6, 2.5, 2.5); g.fillRect(bx - 4, by - .4, 2.5, 2.5); }); },
  visor(g, c, K) { const { hx, hy } = K; g.save(); g.translate(hx, hy);
    g.shadowColor = c[0]; g.shadowBlur = 6; rrect(g, -3, -5, 22, 7.5, 3.5);
    const gr = g.createLinearGradient(-3, 0, 19, 0); gr.addColorStop(0, c[1]); gr.addColorStop(1, c[0]); g.fillStyle = gr; g.fill(); g.shadowBlur = 0;
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(2 + (K.t * 20 % 12), -4, 2, 5.5); g.restore(); },
  laser(g, c, K) { const { hx, hy } = K; g.save(); g.translate(hx, hy);
    g.shadowColor = c[0]; g.shadowBlur = 8; g.fillStyle = c[0];
    [[3, -1, 3.4], [11, -1.2, 3.8]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
    g.globalAlpha = .35 + .25 * Math.sin(K.t * 12); g.strokeStyle = c[0]; g.lineWidth = 2; g.beginPath(); g.moveTo(11, -1); g.lineTo(40, 2); g.moveTo(3, -1); g.lineTo(34, 2); g.stroke();
    g.globalAlpha = 1; g.shadowBlur = 0; g.restore(); }
};
// tişört desenleri (gövde kırpılmış alanda)
function shirtPattern(g, st, c, K) {
  const { bx, by, brx, bry, t } = K;
  switch (st) {
    case 'stripes': g.fillStyle = c[1]; for (let y = by - bry; y < by + bry; y += 6) g.fillRect(bx - brx - 2, y, brx * 2 + 4, 3); break;
    case 'dots': g.fillStyle = c[1]; for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) { g.beginPath(); g.arc(bx + x * 6 + (y % 2) * 3, by + y * 6, 1.7, 0, TAU); g.fill(); } break;
    case 'stars': g.fillStyle = c[1]; [[-4, -5], [5, -1], [-2, 5], [7, 7], [-8, 2]].forEach(([x, y]) => { star(g, bx + x, by + y, 2.6); g.fill(); }); break;
    case 'hearts': g.fillStyle = c[1]; [[-4, -4], [5, 0], [-1, 6], [-8, 3]].forEach(([x, y]) => { heart(g, bx + x, by + y, 2.6); g.fill(); }); break;
    case 'jersey': g.fillStyle = c[1]; g.fillRect(bx - brx, by - 3, brx * 2, 2.4); g.font = `bold 9px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('10', bx + 2, by + 4); break;
    case 'hawaii': [[-5, -5, c[1]], [4, 2, '#ffe14a'], [-3, 6, '#ff3fa4'], [7, -6, c[1]]].forEach(([x, y, cc]) => { g.fillStyle = cc; for (let k = 0; k < 5; k++) { const a = k * TAU / 5; g.beginPath(); g.arc(bx + x + Math.cos(a) * 2, by + y + Math.sin(a) * 2, 1.6, 0, TAU); g.fill(); } }); break;
    case 'hoodie': g.fillStyle = shade(c[0], -.15); rrect(g, bx - 5, by + 2, 11, 6, 2); g.fill(); g.strokeStyle = c[1]; g.lineWidth = 1; g.beginPath(); g.moveTo(bx + 4, by - bry + 3); g.lineTo(bx + 3, by - 3); g.moveTo(bx + 7, by - bry + 3); g.lineTo(bx + 7, by - 4); g.stroke(); break;
    case 'tux': g.fillStyle = c[1]; g.beginPath(); g.moveTo(bx + 1, by - bry); g.lineTo(bx + 10, by - bry); g.lineTo(bx + 6, by + bry); g.lineTo(bx + 2, by + bry); g.closePath(); g.fill();
      g.fillStyle = '#e8433a'; g.beginPath(); g.moveTo(bx + 5, by - bry + 3); g.lineTo(bx + 1, by - bry + .5); g.lineTo(bx + 1, by - bry + 5.5); g.closePath(); g.moveTo(bx + 5, by - bry + 3); g.lineTo(bx + 9, by - bry + .5); g.lineTo(bx + 9, by - bry + 5.5); g.closePath(); g.fill();
      g.fillStyle = '#222'; [0, 5].forEach(d => { g.beginPath(); g.arc(bx + 5.5, by - 2 + d, .9, 0, TAU); g.fill(); }); break;
    case 'rainbow': RAINBOW.forEach((cc, i) => { g.fillStyle = cc; g.fillRect(bx - brx - 2, by - bry + i * (bry * 2 / 6), brx * 2 + 4, bry * 2 / 6 + .5); }); break;
    default: g.fillStyle = rgba(c[1] || shade(c[0], -.2), .9); g.fillRect(bx - brx, by + bry * .55, brx * 2, 3); break;
  }
}
const SHIRT_LONG = { hoodie: 1, tux: 1 };
const PANTS_SHORT = { shorts: 1, tutu: 1 };
function pantsFill(g, st, c, x0, y0, x1, y1) {
  switch (st) {
    case 'plaid': { const gr = g.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i <= 6; i++) { gr.addColorStop(i / 6, i % 2 ? c[1] : c[0]); } return gr; }
    case 'camo': { const gr = g.createLinearGradient(x0, y0, x1, y1 + 5); gr.addColorStop(0, c[0]); gr.addColorStop(.3, c[1]); gr.addColorStop(.55, c[0]); gr.addColorStop(.8, '#7a8a4a'); gr.addColorStop(1, c[1]); return gr; }
    case 'goldpants': { const gr = g.createLinearGradient(x0 - 6, y0, x1 + 6, y1); gr.addColorStop(0, '#fff2b0'); gr.addColorStop(.5, c[0]); gr.addColorStop(1, c[1]); return gr; }
    default: return c[0];
  }
}
// kostüm verisi: gövde ve kol/bacak rengi, eller, başlık
const COSTUME = {
  bee: { body: c => c[0], limb: c => c[1], pat: 'bee' },
  clownsuit: { body: c => c[0], limb: c => c[1], pat: 'clown' },
  ninja: { body: c => c[0], limb: c => c[0], pat: 'ninja' },
  superhero: { body: c => c[0], limb: c => c[0], pat: 'hero', boots: c => c[1] },
  dino: { body: c => c[0], limb: c => c[0], pat: 'dino' },
  captain: { body: c => c[0], limb: c => '#2b2b35', pat: 'captain', boots: () => '#2b1a14' },
  knight: { body: c => c[0], limb: c => c[0], pat: 'knight', boots: c => shade(c[0], -.2) },
  astronaut: { body: c => c[0], limb: c => c[0], pat: 'astro', boots: c => '#cfd4dd' },
  icequeen: { body: c => c[0], limb: c => c[1], pat: 'ice' }
};
const BACK_ACC = { angelwings: 1, butterfly: 1, jetpack: 1, backpack: 1, cape: 1, dragonwings: 1, guitar: 1 };
function wings(g, K, col, col2, kind) {
  const { bx, by, t } = K, flap = Math.sin(t * (K.k === 'run' || K.k === 'jump' || K.k === 'fall' ? 16 : 4)) * .25;
  g.save(); g.translate(bx - 6, by - 6);
  for (const s of [0, 1]) {
    g.save(); g.rotate(-.5 - flap + s * .35); g.globalAlpha = s ? 1 : .8;
    if (kind === 'angel') { const gr = g.createLinearGradient(0, 0, -24, -10); gr.addColorStop(0, col); gr.addColorStop(1, col2);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-10, -20, -26, -16); g.quadraticCurveTo(-22, -10, -24, -6); g.quadraticCurveTo(-18, -2, -20, 2); g.quadraticCurveTo(-10, 4, 0, 0);
      g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(120,150,200,.7)'; g.lineWidth = 1; g.stroke(); }
    else if (kind === 'butterfly') { g.fillStyle = col; g.beginPath(); g.ellipse(-10, -8, 11, 8, -.6, 0, TAU); g.fill(); g.fillStyle = col2; g.beginPath(); g.ellipse(-8, 4, 7, 5, .4, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(-13, -10, 2.4, 0, TAU); g.fill(); g.strokeStyle = shade(col, -.5); g.lineWidth = 1; g.beginPath(); g.ellipse(-10, -8, 11, 8, -.6, 0, TAU); g.stroke(); }
    else { g.fillStyle = col; g.beginPath(); g.moveTo(0, 0); g.lineTo(-8, -18); g.lineTo(-26, -14); g.quadraticCurveTo(-20, -9, -22, -4); g.quadraticCurveTo(-15, -4, -16, 1); g.quadraticCurveTo(-8, -1, 0, 0); g.fill();
      g.strokeStyle = shade(col, -.5); g.lineWidth = 1.2; g.stroke(); g.strokeStyle = col2; g.beginPath(); g.moveTo(-8, -18); g.lineTo(-12, -2); g.moveTo(-8, -18); g.lineTo(-20, -6); g.stroke(); }
    g.restore();
  }
  g.restore();
}
const ACC = {
  scarf(g, c, K) { const { bx, by, bry, t } = K, y = by - bry + 3; g.save();
    const fl = K.k === 'run' || K.k === 'jump' || K.k === 'fall' ? 1 : .3;
    g.beginPath(); g.moveTo(bx - 4, y); for (let i = 1; i <= 5; i++) g.lineTo(bx - 4 - i * 4, y + 1 + Math.sin(t * 14 - i) * 2.2 * fl + i * (1 - fl) * 2.2);
    g.strokeStyle = shade(c[0], -.5); g.lineWidth = 6; g.lineCap = 'round'; g.stroke(); g.strokeStyle = c[0]; g.lineWidth = 4.2; g.stroke();
    rrect(g, bx - 10, y - 3, 20, 6, 3); g.fillStyle = c[0]; g.fill(); g.strokeStyle = shade(c[0], -.5); g.lineWidth = 1; g.stroke();
    g.fillStyle = c[1]; g.fillRect(bx - 6, y - 3, 2.4, 6); g.fillRect(bx + 1, y - 3, 2.4, 6); g.restore(); },
  bowtie(g, c, K) { const { bx, by, bry } = K, x = bx + 8, y = by - bry + 6; poly(g, [x, y, x - 6, y - 4, x - 6, y + 4], c[0]); poly(g, [x, y, x + 6, y - 4, x + 6, y + 4], c[0]); ball(g, x, y, 1.8, shade(c[0], -.15), { rim: false }); },
  medal(g, c, K) { const { bx, by, bry } = K; g.strokeStyle = c[1]; g.lineWidth = 2; g.beginPath(); g.moveTo(bx - 3, by - bry + 2); g.lineTo(bx + 4, by - 1); g.lineTo(bx + 10, by - bry + 3); g.stroke();
    ball(g, bx + 4, by + 2, 4.2, c[0]); g.fillStyle = shade(c[0], -.3); star(g, bx + 4, by + 2, 2.2); g.fill(); },
  balloon(g, c, K) { const { hx, hy, t } = K; const x = K.handB[0] - 12 + Math.sin(t * 2) * 3, y = hy - 30 + Math.cos(t * 1.7) * 2;
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = .8; g.beginPath(); g.moveTo(K.handB[0], K.handB[1]); g.quadraticCurveTo(x + 4, (y + K.handB[1]) / 2, x, y + 12); g.stroke();
    blob(g, x, y, 9, 11, c[0]); poly(g, [x - 2, y + 12, x + 2, y + 12, x, y + 10], c[0], false); },
  backpack(g, c, K) { const { bx, by, brx } = K; rrect(g, bx - brx - 6, by - 10, 10, 17, 4); g.fillStyle = ballGrad(g, bx - brx - 2, by - 4, 12, c[0]); g.fill(); g.strokeStyle = shade(c[0], -.55); g.lineWidth = 1.3; g.stroke();
    rrect(g, bx - brx - 7, by - 1, 6, 7, 2); g.fillStyle = c[1]; g.fill(); g.stroke(); },
  guitar(g, c, K) { const { bx, by } = K; g.save(); g.translate(bx - 8, by - 2); g.rotate(-.9);
    g.fillStyle = '#5a3214'; g.fillRect(-1.5, -24, 3, 18); ball(g, 0, 2, 7, c[0]); ball(g, 0, -6, 5.4, c[0], { rim: false }); g.fillStyle = '#2b1a14'; g.beginPath(); g.arc(0, 0, 2, 0, TAU); g.fill(); g.restore(); },
  wand(g, c, K) { const [x, y] = K.handF; g.save(); g.translate(x, y); g.rotate(-.6); g.strokeStyle = '#5a3a7a'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(0, 2); g.lineTo(0, -14); g.stroke();
    g.fillStyle = c[0]; g.shadowColor = c[0]; g.shadowBlur = 6; star(g, 0, -16, 5, 5, .45, -Math.PI / 2 + K.t * 2); g.fill(); g.shadowBlur = 0; g.restore(); },
  angelwings(g, c, K) { wings(g, K, c[0], c[1], 'angel'); },
  butterfly(g, c, K) { wings(g, K, c[0], c[1], 'butterfly'); },
  dragonwings(g, c, K) { wings(g, K, c[0], c[1], 'dragon'); },
  jetpack(g, c, K) { const { bx, by, brx, t } = K; g.save(); g.translate(bx - brx - 3, by - 6);
    for (const dx of [-3, 3]) { rrect(g, dx - 3.5, -9, 7, 17, 3); g.fillStyle = ballGrad(g, dx, -2, 9, c[0]); g.fill(); g.strokeStyle = shade(c[0], -.55); g.lineWidth = 1.2; g.stroke(); }
    if (K.k === 'jump' || K.k === 'fall' || K.k === 'run') { const f = 6 + Math.sin(t * 40) * 2; for (const dx of [-3, 3]) { g.fillStyle = c[1]; g.beginPath(); g.moveTo(dx - 2.6, 8); g.lineTo(dx, 8 + f); g.lineTo(dx + 2.6, 8); g.fill(); g.fillStyle = '#ffe14a'; g.beginPath(); g.moveTo(dx - 1.2, 8); g.lineTo(dx, 8 + f * .6); g.lineTo(dx + 1.2, 8); g.fill(); } }
    g.restore(); },
  halo(g, c, K) { const { hx, hy, hr, t } = K; g.save(); g.shadowColor = c[0]; g.shadowBlur = 8; g.strokeStyle = c[0]; g.lineWidth = 2.6; g.beginPath(); g.ellipse(hx, hy - hr - 7 + Math.sin(t * 3) * 1.2, 10, 3, -.1, 0, TAU); g.stroke(); g.restore(); },
  cape(g, c, K) { const { bx, by, bry, t } = K; const fl = K.k === 'run' || K.k === 'jump' || K.k === 'fall' ? 1 : .25;
    g.beginPath(); g.moveTo(bx - 2, by - bry + 2); g.quadraticCurveTo(bx - 18, by - 2 + Math.sin(t * 10) * 3 * fl, bx - 16 - 12 * fl, by + 12 + Math.sin(t * 12) * 3 * fl);
    g.lineTo(bx - 4 - 6 * fl, by + 16); g.quadraticCurveTo(bx - 6, by + 4, bx + 4, by - bry + 2); g.closePath();
    const gr = g.createLinearGradient(bx, by - bry, bx - 26, by + 16); gr.addColorStop(0, shade(c[0], .15)); gr.addColorStop(1, shade(c[0], -.3)); g.fillStyle = gr; g.fill(); g.strokeStyle = shade(c[0], -.55); g.lineWidth = 1.2; g.stroke();
    g.fillStyle = c[1]; g.beginPath(); g.arc(bx + 2, by - bry + 3, 2.2, 0, TAU); g.fill(); }
};
const SHOES = {
  sneaker(g, c, x, y, a) { g.save(); g.translate(x, y); g.rotate(a); rrect(g, -4.5, -3.5, 12, 6.5, 3); g.fillStyle = ballGrad(g, 0, -2, 8, c[0]); g.fill(); g.strokeStyle = shade(c[0], -.55); g.lineWidth = 1.2; g.stroke();
    g.fillStyle = c[1]; g.fillRect(-4.5, 1.6, 12, 1.6); g.fillRect(-1, -3.5, 2, 4); g.restore(); },
  boot(g, c, x, y, a) { g.save(); g.translate(x, y); g.rotate(a); rrect(g, -4, -9, 8, 11, 2.5); g.fillStyle = c[0]; g.fill(); rrect(g, -4.5, -3.5, 12, 6.5, 3); g.fill(); g.strokeStyle = c[1]; g.lineWidth = 1.2; g.stroke(); g.fillStyle = c[1]; g.fillRect(-4.5, 2, 12, 1.6); g.restore(); },
  slipper(g, c, x, y, a) { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = shade(c[0], -.3); g.fillRect(-4.5, 1.5, 12, 2); rrect(g, -1, -3, 8, 4.5, 2); g.fillStyle = c[0]; g.fill(); g.strokeStyle = shade(c[0], -.5); g.lineWidth = 1; g.stroke(); g.restore(); return true; },
  rainboot(g, c, x, y, a) { g.save(); g.translate(x, y); g.rotate(a); rrect(g, -4.2, -10, 8.4, 12, 3); g.fillStyle = ballGrad(g, -1, -5, 10, c[0]); g.fill(); g.strokeStyle = c[1]; g.lineWidth = 1.2; g.stroke(); rrect(g, -4.5, -3.5, 12, 6.5, 3); g.fillStyle = c[0]; g.fill(); g.stroke(); g.restore(); },
  neon(g, c, x, y, a) { g.save(); g.translate(x, y); g.rotate(a); g.shadowColor = c[0]; g.shadowBlur = 6; rrect(g, -4.5, -3.5, 12, 6.5, 3); g.fillStyle = c[1]; g.fill(); g.shadowBlur = 0; g.fillStyle = c[0]; g.fillRect(-4.5, 1.4, 12, 2); g.restore(); },
  clown(g, c, x, y, a) { g.save(); g.translate(x, y); g.rotate(a); blob(g, 3, -.5, 9, 4.5, c[0]); ball(g, 9, -1.5, 2, c[1], { rim: false }); g.restore(); },
  cloud(g, c, x, y, a) { g.save(); g.translate(x, y); g.rotate(a); [[-2, 0, 4], [3, -1, 4.6], [7, 0, 3.6]].forEach(([px, py, r]) => ball(g, px, py, r, c[0], { line: false })); g.fillStyle = c[1]; g.fillRect(-5, 2, 15, 1.6); g.restore(); },
  rocket(g, c, x, y, a, K) { g.save(); g.translate(x, y); g.rotate(a); rrect(g, -4.5, -3.5, 12, 6.5, 3); g.fillStyle = ballGrad(g, 0, -2, 8, c[0]); g.fill(); g.strokeStyle = shade(c[0], -.55); g.lineWidth = 1.1; g.stroke();
    if (K && K.k !== 'idle') { const f = 4 + Math.sin(K.t * 40) * 1.5; g.fillStyle = c[1]; g.beginPath(); g.moveTo(-4.5, -2); g.lineTo(-4.5 - f, .5); g.lineTo(-4.5, 2.5); g.fill(); } g.restore(); }
};

/* ------------------------------------------------------------------ karakteri çiz
   look: görünüm · P: { k, ph, t, vy, sq, ear, tail, blink, wave, headOnly }      */
function drawChar(g, look, P, B) {
  B = B || (NS.shop && NS.shop.BYID) || {};
  const pal = palOf(look, B), sp = pal.sp;
  const pose = computePose(P);
  const it = k => (look[k] && B[look[k]]) || null;
  const costume = it('costume'), shirt = costume ? null : it('shirt'), pants = costume ? null : it('pants');
  const shoes = it('shoes'), hat = it('hat'), glasses = it('glasses'), acc = it('acc');
  const cs = costume && COSTUME[costume.st];
  const t = P.t || 0;
  g.save();
  if (pose.rot) g.rotate(pose.rot);
  g.scale(pose.sx, pose.sy);
  const hipX = 0, hipY = -13 + pose.bob;
  const K = { t, k: P.k, ear: P.ear || 0, tail: P.tail || 0, bx: 0, by: -25 + pose.bob, brx: 12.5, bry: 13, hx: 4, hy: -49 + pose.bob, hr: 17.5 };
  // kol/bacak renkleri
  const furLimb = sp.limbAcc ? pal.acc : pal.main;
  const legCol = cs ? cs.limb(costume.c) : pants ? null : furLimb;
  const armCol = cs ? cs.limb(costume.c) : (shirt && SHIRT_LONG[shirt.st]) ? shirt.c[0] : furLimb;
  const pawCol = sp.flipper ? pal.main : furLimb;
  // ön/arka koordinat
  const leg = (L, back) => {
    const dir = a => [Math.sin(a), Math.cos(a)];
    const [d1x, d1y] = dir(L.a), [d2x, d2y] = dir(L.a - L.k);
    const hx = hipX + (back ? -3 : 3), hy = hipY;
    const kx = hx + d1x * 7.5, ky = hy + d1y * 7.5, fx = kx + d2x * 7, fy = ky + d2y * 7;
    return { hx, hy, kx, ky, fx, fy, fa: (L.a - L.k) * .6 };
  };
  const drawLeg = (L, back) => {
    const q = leg(L, back), dk = back ? -.16 : 0;
    let thigh = legCol, shin = legCol;
    if (pants && !cs) { thigh = pants.c[0]; shin = PANTS_SHORT[pants.st] ? furLimb : pants.c[0]; if (pants.st === 'tutu') thigh = furLimb; }
    if (pants && pants.st === 'goldpants') { thigh = shin = '#ffc93c'; }
    limb(g, q.hx, q.hy, q.kx, q.ky, 7.6, dk ? shade(thigh, dk) : thigh);
    limb(g, q.kx, q.ky, q.fx, q.fy, 7, dk ? shade(shin, dk) : shin);
    if (pants && pants.st === 'starleg') { g.fillStyle = pants.c[1]; star(g, (q.kx + q.fx) / 2, (q.ky + q.fy) / 2, 1.8); g.fill(); }
    if (pants && pants.st === 'track') { g.strokeStyle = pants.c[1]; g.lineWidth = 1.1; g.beginPath(); g.moveTo(q.hx + 2, q.hy); g.lineTo(q.kx + 2, q.ky); g.lineTo(q.fx + 2, q.fy); g.stroke(); }
    const bootsCol = cs && cs.boots ? cs.boots(costume.c) : null;
    const fx = q.fx + 2, fy = q.fy + 1;
    if (shoes && SHOES[shoes.st]) SHOES[shoes.st](g, back ? shoes.c.map(c => shade(c, -.15)) : shoes.c, fx, fy, q.fa, K);
    else if (bootsCol) SHOES.boot(g, [back ? shade(bootsCol, -.15) : bootsCol, shade(bootsCol, -.4)], fx, fy, q.fa);
    else { const fc = sp.muzzle === 'beak' ? pal.acc : (back ? shade(pawCol, -.16) : pawCol); blob(g, fx + 1, fy - 1, 6, 3.6, fc, { rot: q.fa, rim: false }); }
  };
  const arm = (A, back) => {
    const sx = (back ? -2 : 4), sy = -31 + pose.bob + (back ? 1 : 0);
    const L = Math.abs(A.a) > 1.7 ? 13.5 : 11;
    const ex = sx + Math.sin(A.a) * L, ey = sy + Math.cos(A.a) * L;
    return { sx, sy, ex, ey };
  };
  const upper = (fn) => { g.save(); g.translate(hipX, hipY); g.rotate(pose.lean); g.translate(-hipX, -hipY); fn(); g.restore(); };
  const qa = arm(pose.arms[0], true), qb = arm(pose.arms[1], false);
  // el konumları (dönmüş çerçevede yaklaşık)
  K.handB = [qa.ex, qa.ey]; K.handF = [qb.ex, qb.ey];
  if (P.headOnly) {
    LW = P.lw || 1.6;
    g.translate(-K.hx, -K.hy);
    headGroup(g, look, pal, K, pose, hat, glasses, costume, cs, P);
    if (acc && acc.st === 'halo') ACC.halo(g, acc.c, K);
    g.restore(); LW = 1; return;
  }
  LW = P.lw || 1;
  // sırt aksesuarları ve kuyruk
  upper(() => {
    if (acc && BACK_ACC[acc.st] && ACC[acc.st]) ACC[acc.st](g, acc.c, K);
    if (costume && costume.st === 'superhero') ACC.cape(g, [costume.c[1], costume.c[2]], K);
    if (sp.wings && !(acc && BACK_ACC[acc.st])) wings(g, K, shade(pal.main, -.1), pal.belly, 'dragon');
    if (costume && costume.st === 'bee') wings(g, K, 'rgba(220,240,255,.85)', 'rgba(255,255,255,.6)', 'butterfly');
    if (costume && costume.st === 'icequeen') { g.save(); g.globalAlpha = .75; ACC.cape(g, ['#bfe6ff', '#ffffff'], K); g.restore(); }
    if (costume && costume.st === 'captain') ACC.cape(g, [shade(costume.c[0], -.15), costume.c[1]], K);
    if (!(costume && costume.st === 'dino')) tailDraw(g, pal, K);
    else { g.save(); g.translate(K.bx - 12, K.by + 6); poly(g, [0, -6, -16, 2, 0, 4], costume.c[0]); g.restore(); }
  });
  // arka bacak & arka kol
  drawLeg(pose.legs[0], true);
  upper(() => {
    limb(g, qa.sx, qa.sy, qa.ex, qa.ey, 6.4, shade(armCol, -.16));
    ball(g, qa.ex, qa.ey, 3.6, shade(cs ? cs.limb(costume.c) : pawCol, -.16), { rim: false });
  });
  // pantolon oturağı
  if (pants && !cs) {
    const pc = pantsFill(g, pants.st, pants.c, -10, hipY - 6, 10, hipY + 4);
    if (pants.st === 'tutu') { g.beginPath(); for (let i = 0; i <= 10; i++) { const a = Math.PI * (i / 10); g.lineTo(Math.cos(a) * -15, hipY + 1 + (i % 2 ? 5 : 2)); } g.lineTo(-15, hipY - 5); g.lineTo(15, hipY - 5); g.closePath(); g.fillStyle = pants.c[0]; g.fill(); g.strokeStyle = shade(pants.c[0], -.4); g.lineWidth = 1; g.stroke(); }
    else blob(g, 0, hipY - 2, 11.5, 6.5, typeof pc === 'string' ? pc : pants.c[0], { rim: false });
  }
  // gövde
  upper(() => {
    const { bx, by, brx, bry } = K;
    const bodyCol = cs ? cs.body(costume.c) : shirt ? shirt.c[0] : pal.main;
    if (pal.fx && !cs && !shirt) fxFill(g, pal, bx, by, brx, bry, t);
    else blob(g, bx, by, brx, bry, bodyCol);
    if (!cs && !shirt) blob(g, bx + 3, by + 2, brx * .62, bry * .7, pal.belly, { line: false, rim: false });
    if (shirt) { g.save(); g.beginPath(); g.ellipse(bx, by, brx - .6, bry - .6, 0, 0, TAU); g.clip(); shirtPattern(g, shirt.st, shirt.c, K); g.restore(); rim(g, bx, by, brx, bry); }
    if (cs) costumeBody(g, costume, K);
  });
  drawLeg(pose.legs[1], false);
  if (pants && pants.st === 'cargo') { const q = leg(pose.legs[1], false); g.fillStyle = shade(pants.c[0], -.25); g.fillRect(q.kx - 2, q.ky - 5, 4.5, 4); }
  upper(() => {
    if (acc && !BACK_ACC[acc.st] && ['scarf', 'bowtie', 'medal'].includes(acc.st)) ACC[acc.st](g, acc.c, K);
    const frontArm = () => {
      limb(g, qb.sx, qb.sy, qb.ex, qb.ey, 6.4, armCol);
      if (shirt && !SHIRT_LONG[shirt.st]) { const mx = qb.sx + (qb.ex - qb.sx) * .42, my = qb.sy + (qb.ey - qb.sy) * .42; limb(g, qb.sx, qb.sy, mx, my, 7.4, shirt.c[0]); }
      ball(g, qb.ex, qb.ey, 3.7, cs && costume.st !== 'clownsuit' ? (costume.st === 'astronaut' ? '#cfd4dd' : cs.limb(costume.c)) : pawCol, { rim: false });
      if (acc && (acc.st === 'wand' || acc.st === 'balloon') && ACC[acc.st]) ACC[acc.st](g, acc.c, K);
    };
    const raised = Math.abs(pose.arms[1].a) > 1.7;
    if (raised) frontArm();
    // baş
    g.save(); g.translate(K.hx, K.hy); g.rotate(pose.tilt); g.translate(-K.hx, -K.hy);
    headGroup(g, look, pal, K, pose, hat, glasses, costume, cs, P);
    if (acc && acc.st === 'halo') ACC.halo(g, acc.c, K);
    g.restore();
    if (!raised) frontArm();
  });
  g.restore();
  LW = 1;
}
function fxFill(g, pal, x, y, rx, ry, t) {
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (pal.fx === 'gold') {
    const gr = g.createLinearGradient(x - rx, y - ry, x + rx, y + ry); gr.addColorStop(0, '#fff6c8'); gr.addColorStop(.35, '#ffc93c'); gr.addColorStop(.7, '#e09a12'); gr.addColorStop(1, '#ffe27a');
    g.fillStyle = gr; g.fill(); g.strokeStyle = '#8a5a00'; g.lineWidth = 1.4 * LW; g.stroke();
    g.save(); g.clip(); const sx = x - rx * 2 + ((t * 30) % (rx * 4)); g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.moveTo(sx, y - ry); g.lineTo(sx + 5, y - ry); g.lineTo(sx - 3, y + ry); g.lineTo(sx - 8, y + ry); g.fill(); g.restore();
  } else {
    const gr = g.createRadialGradient(x - rx * .3, y - ry * .3, 1, x, y, Math.max(rx, ry) * 1.1); gr.addColorStop(0, '#a98bff'); gr.addColorStop(.6, '#5b3cc4'); gr.addColorStop(1, '#241060');
    g.fillStyle = gr; g.fill(); g.strokeStyle = '#1a0a40'; g.lineWidth = 1.4 * LW; g.stroke();
    g.save(); g.clip(); g.fillStyle = '#fff';
    for (let i = 0; i < 9; i++) { const a = i * 2.4 + t * .3, rr = (i * 37 % 10) / 10; g.globalAlpha = .5 + .5 * Math.sin(t * 3 + i); g.beginPath(); g.arc(x + Math.cos(a) * rx * rr, y + Math.sin(a * 1.3) * ry * rr, .9, 0, TAU); g.fill(); }
    g.restore(); g.globalAlpha = 1;
  }
}
function costumeBody(g, costume, K) {
  const { bx, by, brx, bry, t } = K, c = costume.c;
  g.save(); g.beginPath(); g.ellipse(bx, by, brx - .6, bry - .6, 0, 0, TAU); g.clip();
  switch (costume.st) {
    case 'bee': g.fillStyle = c[1]; for (let y = by - bry + 4; y < by + bry; y += 8) g.fillRect(bx - brx, y, brx * 2, 4); break;
    case 'clownsuit': g.fillStyle = c[1]; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(bx - 6 + i * 4.5, by - 4 + (i % 2) * 7, 2.4, 0, TAU); g.fill(); } break;
    case 'ninja': g.fillStyle = c[1]; g.fillRect(bx - brx, by + 2, brx * 2, 3.4); break;
    case 'superhero': g.fillStyle = c[2]; g.beginPath(); g.moveTo(bx + 1, by - 6); g.lineTo(bx + 10, by - 6); g.lineTo(bx + 5.5, by + 4); g.closePath(); g.fill(); g.fillStyle = c[1]; g.fillRect(bx - brx, by + 5, brx * 2, 3); break;
    case 'dino': g.fillStyle = c[1]; g.beginPath(); g.ellipse(bx + 4, by + 3, 7, 8, 0, 0, TAU); g.fill(); break;
    case 'captain': g.fillStyle = c[1]; [-4, 1, 6].forEach(d => { g.beginPath(); g.arc(bx + 5, by + d, 1.2, 0, TAU); g.fill(); }); g.fillRect(bx - brx, by + 6, brx * 2, 2.4); break;
    case 'knight': { const gr = g.createLinearGradient(bx - brx, by - bry, bx + brx, by + bry); gr.addColorStop(0, '#f2f5f8'); gr.addColorStop(.5, c[0]); gr.addColorStop(1, '#6d7682'); g.fillStyle = gr; g.fillRect(bx - brx, by - bry, brx * 2, bry * 2);
      g.fillStyle = c[1]; g.fillRect(bx + 2, by - 6, 3, 12); g.fillRect(bx - 2, by - 2, 11, 3); break; }
    case 'astro': g.fillStyle = c[1]; g.fillRect(bx - 1, by - 5, 10, 7); g.fillStyle = '#19e3d0'; g.fillRect(bx + 1, by - 3, 2, 2); g.fillStyle = '#ff3fa4'; g.fillRect(bx + 4.5, by - 3, 2, 2); break;
    case 'ice': g.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 5; i++) { star(g, bx - 6 + i * 4, by - 6 + (i % 2) * 8, 2.2, 6, .4); g.fill(); } break;
    default: break;
  }
  g.restore();
  rim(g, bx, by, brx, bry);
}
function headGroup(g, look, pal, K, pose, hat, glasses, costume, cs, P) {
  const sp = pal.sp, { hx, hy, hr } = K;
  const hood = costume && (costume.st === 'dino' || costume.st === 'ninja' || costume.st === 'bee' || costume.st === 'knight' || costume.st === 'astronaut');
  if (!(costume && (costume.st === 'dino' || costume.st === 'knight' || costume.st === 'astronaut'))) earDraw(g, pal, K, 0);
  if (costume && costume.st === 'dino') { // başlık kapüşon
    for (let i = 0; i < 4; i++) poly(g, [hx - 12 + i * 6, hy - hr + 3 - i * .5, hx - 8 + i * 6, hy - hr - 6 - (i === 1 || i === 2 ? 2 : 0), hx - 4 + i * 6, hy - hr + 3], costume.c[1]);
  }
  if (sp.muzzle === 'horse') { // yele
    for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(hx - 10 + i * 1.5, hy - 12 + i * 5, 5.2, 0, TAU); g.fillStyle = RAINBOW[i]; g.fill(); }
  }
  if (pal.fx) fxFill(g, pal, hx, hy, hr, hr, K.t); else ball(g, hx, hy, hr, pal.main);
  if (costume && costume.st === 'dino') { g.save(); g.beginPath(); g.arc(hx, hy, hr - .5, 0, TAU); g.clip(); g.fillStyle = costume.c[0]; g.beginPath(); g.arc(hx - 4, hy - 2, hr + 1, Math.PI * .55, Math.PI * 1.95); g.lineTo(hx + 10, hy - hr); g.fill(); g.restore(); }
  if (costume && (costume.st === 'ninja' || costume.st === 'bee')) {
    g.save(); g.beginPath(); g.arc(hx, hy, hr - .5, 0, TAU); g.clip(); g.fillStyle = costume.st === 'ninja' ? costume.c[0] : costume.c[1];
    if (costume.st === 'ninja') { g.fillRect(hx - hr, hy - hr, hr * 2, hr * .75); g.fillRect(hx - hr, hy + 4, hr * 2, hr); }
    else { g.beginPath(); g.arc(hx, hy - 4, hr + .5, Math.PI, TAU); g.fill(); }
    g.restore();
    if (costume.st === 'ninja') { g.fillStyle = costume.c[1]; g.fillRect(hx - hr, hy - 9, hr * 2, 3); g.beginPath(); g.moveTo(hx - hr + 1, hy - 8); g.lineTo(hx - hr - 9, hy - 12 + Math.sin(K.t * 12) * 2); g.lineTo(hx - hr - 8, hy - 5 + Math.sin(K.t * 12 + 1) * 2); g.closePath(); g.fill(); }
    if (costume.st === 'bee') { g.strokeStyle = '#22222b'; g.lineWidth = 1.2; [[-3, -1], [5, 1]].forEach(([dx, s]) => { g.beginPath(); g.moveTo(hx + dx, hy - hr + 2); g.quadraticCurveTo(hx + dx + s * 2, hy - hr - 8, hx + dx + 3 + s * 2, hy - hr - 11); g.stroke(); ball(g, hx + dx + 3 + s * 2, hy - hr - 11, 2, '#22222b', { rim: false }); }); }
  }
  muzzleDraw(g, pal, K, P);
  if (sp.ear === 'cat' && !sp.mask && !hood) { g.strokeStyle = shade(pal.main, -.3); g.lineWidth = 1.6; g.lineCap = 'round'; [-4, 0, 4].forEach(d => { g.beginPath(); g.moveTo(hx + d, hy - hr + 1.5); g.lineTo(hx + d * 1.1, hy - hr + 6); g.stroke(); }); }
  eyesDraw(g, pal, K, pose);
  noseMouth(g, pal, K, pose);
  if (sp.ear === 'unicorn') { g.save(); g.translate(hx + 8, hy - hr + 2); g.rotate(.35); const gr = g.createLinearGradient(-3, 0, 3, -14); gr.addColorStop(0, '#ffd84a'); gr.addColorStop(1, '#fff6c8'); poly(g, [-3.2, 1, 3.2, 1, 0, -15], '#e0a91c', true, gr); g.strokeStyle = 'rgba(200,140,0,.6)'; g.lineWidth = .8; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(-3 + i * .7, -i * 3.5); g.lineTo(3 - i * .7, -i * 3.5 - 1.2); g.stroke(); } g.restore(); }
  if (sp.ear === 'horns') for (let i = 0; i < 3; i++) poly(g, [hx - 14 + i * 2, hy - 6 + i * 6, hx - 21 + i * 1.5, hy - 4 + i * 6, hx - 15 + i * 2, hy - 1 + i * 6], pal.acc);
  if (!(costume && (costume.st === 'dino' || costume.st === 'knight' || costume.st === 'astronaut'))) earDraw(g, pal, K, 1);
  if (costume && costume.st === 'clownsuit') { ball(g, hx + 16.5, hy + 3, 3.6, '#ff2a2a'); g.save(); for (let i = 0; i < 4; i++) { ball(g, hx - 12 + i * 3, hy - hr + 3 - Math.abs(i - 1.5) * 1.5, 4.6, ['#ff3fa4', '#19e3d0', '#ffe14a', '#5aa2ff'][i], { rim: false }); } g.restore(); }
  if (costume && costume.st === 'superhero') { g.fillStyle = costume.c[1]; rrect(g, hx - 1, hy - 5, 17, 6, 3); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(hx + 3, hy - 2, 1.6, 0, TAU); g.arc(hx + 11, hy - 2, 1.8, 0, TAU); g.fill(); }
  if (costume && costume.st === 'captain') { g.fillStyle = '#111'; g.beginPath(); g.ellipse(hx + 11, hy - 1.2, 4.6, 4.2, 0, 0, TAU); g.fill(); g.strokeStyle = '#111'; g.lineWidth = 1; g.beginPath(); g.moveTo(hx + 7, hy - 4); g.lineTo(hx - 12, hy - 10); g.stroke(); HATS.pirate(g, ['#2a2230', costume.c[1]], K); }
  if (costume && costume.st === 'icequeen') HATS.crown(g, ['#e8f6ff', '#7fd3ff'], K);
  if (costume && costume.st === 'knight') {
    g.save(); g.beginPath(); g.arc(hx, hy, hr + 1.5, 0, TAU);
    const gr = g.createLinearGradient(hx - hr, hy - hr, hx + hr, hy + hr); gr.addColorStop(0, '#f6f9fc'); gr.addColorStop(.5, costume.c[0]); gr.addColorStop(1, '#5d6672'); g.fillStyle = gr; g.fill(); g.strokeStyle = '#3a404a'; g.lineWidth = 1.4; g.stroke();
    g.fillStyle = '#20242c'; rrect(g, hx + 1, hy - 4, 17, 4, 2); g.fill(); g.fillRect(hx + 8, hy - 1, 2, 8);
    g.fillStyle = costume.c[1]; g.beginPath(); g.moveTo(hx - 2, hy - hr); g.quadraticCurveTo(hx - 14, hy - hr - 12 + Math.sin(K.t * 6) * 2, hx - 20, hy - hr + 2); g.quadraticCurveTo(hx - 10, hy - hr - 2, hx - 2, hy - hr + 3); g.fill(); g.restore();
  }
  if (costume && costume.st === 'astronaut') {
    g.save(); g.beginPath(); g.arc(hx + 1, hy, hr + 4, 0, TAU);
    const gr = g.createRadialGradient(hx - 6, hy - 8, 2, hx, hy, hr + 5); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(.6, 'rgba(180,220,255,.18)'); gr.addColorStop(1, 'rgba(120,170,230,.45)');
    g.fillStyle = gr; g.fill(); g.strokeStyle = '#e8ecf2'; g.lineWidth = 2.6; g.stroke(); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.6; g.beginPath(); g.arc(hx + 1, hy, hr, -2.6, -1.9); g.stroke(); g.restore();
  }
  const hideHat = costume && (costume.st === 'knight' || costume.st === 'astronaut' || costume.st === 'captain' || costume.st === 'icequeen');
  if (glasses && GLASSES[glasses.st] && !(costume && (costume.st === 'knight' || costume.st === 'superhero'))) GLASSES[glasses.st](g, glasses.c, K);
  if (hat && HATS[hat.st] && !hideHat) HATS[hat.st](g, hat.c, K);
  if (pose.eyes === 'spiral' && P.k === 'stun') {
    for (let i = 0; i < 3; i++) { const a = K.t * 6 + i * TAU / 3; g.fillStyle = i % 2 ? '#ffe14a' : '#fff6b0'; star(g, hx + Math.cos(a) * 16, hy - hr - 4 + Math.sin(a) * 4, 3.4); g.fill(); g.strokeStyle = '#b88a00'; g.lineWidth = .6; g.stroke(); }
  }
}

/* ------------------------------------------------------------------ baş simgesi (HUD) */
const headCache = new Map();
function headIcon(look, size, ring) {
  const key = JSON.stringify(look) + '|' + size + '|' + (ring || '');
  let c = headCache.get(key);
  if (c) return c;
  if (headCache.size > 80) headCache.clear();
  c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  if (ring) { g.beginPath(); g.arc(size / 2, size / 2, size / 2 - 1, 0, TAU); g.fillStyle = ring; g.fill(); g.beginPath(); g.arc(size / 2, size / 2, size / 2 - 3, 0, TAU); g.fillStyle = 'rgba(255,255,255,.92)'; g.fill(); }
  g.translate(size / 2 - size * .04, size / 2 + size * .08);
  const s = size / 52; g.scale(s, s);
  drawChar(g, look, { k: 'idle', t: 0, headOnly: true, lw: Math.max(1, 1.4 / s * .9) });
  headCache.set(key, c);
  return c;
}

/* ------------------------------------------------------------------ dünyalar */
const WORLD = {
  cayir: { sky: ['#5ec8ff', '#bdeeff', '#eaffd6'], far: '#9fdc8c', mid: '#74c95f', near: '#4fb34a', grass: '#6ad84e', grassD: '#3c9f35', dirt: '#b07a45', dirtD: '#8c5c30', plat: '#c98a4f', crate: '#cf8f4a', spike: '#3d8a32', haz: '#8a5a30', pit: null, sun: '#fff6b0', fog: 'rgba(255,255,255,.18)' },
  seker: { sky: ['#ff9ad5', '#ffd0ea', '#fff0f8'], far: '#ffc6ea', mid: '#e8b3ff', near: '#ffa0d0', grass: '#ff8fc8', grassD: '#e0569e', dirt: '#e8b46a', dirtD: '#c98f45', plat: '#7a4424', crate: '#5ad1c8', spike: '#ffffff', haz: '#ff4f6d', pit: null, sun: '#ffffff', fog: 'rgba(255,255,255,.2)' },
  buzul: { sky: ['#7cc4ff', '#cfeaff', '#f4fbff'], far: '#e3f2ff', mid: '#bfdcf5', near: '#95c3e8', grass: '#ffffff', grassD: '#cfe4f5', dirt: '#8ccaf0', dirtD: '#5fa6d8', plat: '#bfe6ff', crate: '#a8dcff', spike: '#d8f2ff', haz: '#6aa9d8', pit: null, sun: '#ffffff', fog: 'rgba(255,255,255,.25)' },
  volkan: { sky: ['#3b1640', '#c4483a', '#ffb067'], far: '#5a2a3a', mid: '#3e2232', near: '#2c1a26', grass: '#5a4a52', grassD: '#3b2f36', dirt: '#3b2f36', dirtD: '#251c22', plat: '#6b5a62', crate: '#7a6a70', spike: '#1f1720', haz: '#ff6a00', pit: 'lava', sun: '#ffd28a', fog: 'rgba(255,140,60,.12)' },
  gece: { sky: ['#070b2e', '#1c2360', '#3b3a7e'], far: '#1a2050', mid: '#141a40', near: '#0f1330', grass: '#59607e', grassD: '#3a3f5c', dirt: '#2a2f4a', dirtD: '#1c2036', plat: '#7f8aa8', crate: '#c08a4a', spike: '#ff8a00', haz: '#ffd84a', pit: null, sun: '#fff6d8', fog: 'rgba(120,140,255,.08)' }
};
const PAR_W = 1600;
function makeLayer(world, which) {
  const W = WORLD[world], c = document.createElement('canvas');
  const H = 620; c.width = PAR_W; c.height = H;
  const g = c.getContext('2d'), rnd = mulberry(world.length * 97 + which * 13 + 5);
  const R = (a, b) => a + rnd() * (b - a);
  const wrap = (fn) => { fn(0); fn(PAR_W); fn(-PAR_W); };
  const col = which === 0 ? W.far : which === 1 ? W.mid : W.near;
  const base = which === 0 ? 360 : which === 1 ? 420 : 470;
  g.fillStyle = col;
  if (world === 'cayir' || world === 'seker') {
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= PAR_W; x += 10) { const y = base - 40 * Math.sin(x / PAR_W * TAU * (which + 2)) - 25 * Math.sin(x / PAR_W * TAU * (which * 2 + 5) + 1.3); g.lineTo(x, y); }
    g.lineTo(PAR_W, H); g.closePath(); const gr = g.createLinearGradient(0, base - 70, 0, H); gr.addColorStop(0, shade(col, .12)); gr.addColorStop(1, shade(col, -.15)); g.fillStyle = gr; g.fill();
    for (let i = 0; i < 9 + which * 5; i++) {
      const x = R(0, PAR_W), y0 = base - 40 * Math.sin(x / PAR_W * TAU * (which + 2)) - 25 * Math.sin(x / PAR_W * TAU * (which * 2 + 5) + 1.3);
      wrap(o => {
        if (world === 'cayir') {
          if (which === 2) { g.fillStyle = shade(W.near, -.25); g.fillRect(x + o - 3, y0 - 30, 6, 32); ball(g, x + o, y0 - 44, 22, shade(W.near, .05), { line: false }); ball(g, x + o - 14, y0 - 34, 14, shade(W.near, -.05), { line: false }); ball(g, x + o + 14, y0 - 36, 15, W.near, { line: false }); }
          else { ball(g, x + o, y0 - 8, 14 + which * 4, shade(col, -.08), { line: false, rim: false }); }
        } else {
          if (which === 2) { g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.moveTo(x + o, y0); g.lineTo(x + o, y0 - 50); g.stroke(); ball(g, x + o, y0 - 64, 16, RAINBOW[i % 6], { line: false }); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; g.beginPath(); g.arc(x + o, y0 - 64, 9, 0, 4.5); g.stroke(); }
          else { [[0, 0, 22], [-18, 6, 16], [18, 6, 17]].forEach(([dx, dy, r]) => ball(g, x + o + dx, y0 - 14 + dy, r + which * 4, shade(col, .1), { line: false, rim: false })); }
        }
      });
    }
  } else if (world === 'buzul' || world === 'volkan') {
    const n = which === 0 ? 5 : which === 1 ? 7 : 9;
    for (let i = 0; i < n; i++) {
      const x = (i + R(-.3, .3)) * PAR_W / n, w = R(240, 420) * (which === 0 ? 1.3 : 1), h = R(140, 240) * (which === 0 ? 1.25 : 1);
      wrap(o => {
        const gr = g.createLinearGradient(0, base - h, 0, H); gr.addColorStop(0, shade(col, world === 'buzul' ? .25 : .1)); gr.addColorStop(1, shade(col, -.2));
        g.fillStyle = gr; g.beginPath(); g.moveTo(x + o - w / 2, H); g.lineTo(x + o - w * .1, base - h); g.lineTo(x + o + w * .08, base - h + 12); g.lineTo(x + o + w / 2, H); g.closePath(); g.fill();
        if (world === 'buzul') { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x + o - w * .1 - w * .14, base - h + h * .28); g.lineTo(x + o - w * .1, base - h); g.lineTo(x + o + w * .08, base - h + 12); g.lineTo(x + o + w * .2, base - h + h * .3); g.lineTo(x + o + w * .04, base - h + h * .22); g.lineTo(x + o - w * .06, base - h + h * .32); g.closePath(); g.fill(); }
      });
    }
    if (which === 2) for (let i = 0; i < 12; i++) {
      const x = R(0, PAR_W);
      wrap(o => {
        if (world === 'buzul') { g.fillStyle = '#2e6b5a'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x + o - 22 + k * 5, H - 120 - k * 26); g.lineTo(x + o, H - 168 - k * 26); g.lineTo(x + o + 22 - k * 5, H - 120 - k * 26); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x + o - 10 + k * 3, H - 150 - k * 26); g.lineTo(x + o, H - 168 - k * 26); g.lineTo(x + o + 10 - k * 3, H - 150 - k * 26); g.fill(); g.fillStyle = '#2e6b5a'; } }
        else { g.strokeStyle = '#2a1a1e'; g.lineWidth = 6; g.beginPath(); g.moveTo(x + o, H - 90); g.quadraticCurveTo(x + o + 10, H - 160, x + o + 4, H - 200); g.stroke(); g.fillStyle = '#2a3a22'; for (let k = 0; k < 5; k++) { g.save(); g.translate(x + o + 4, H - 200); g.rotate(-2.6 + k * .9); g.beginPath(); g.ellipse(18, 0, 22, 6, 0, 0, TAU); g.fill(); g.restore(); } }
      });
    }
    if (world === 'volkan' && which === 0) {
      const vx = PAR_W * .55; g.fillStyle = '#4a1e2c'; g.beginPath(); g.moveTo(vx - 380, H); g.lineTo(vx - 70, base - 250); g.lineTo(vx + 70, base - 250); g.lineTo(vx + 380, H); g.closePath(); g.fill();
      const gr = g.createLinearGradient(0, base - 250, 0, base - 120); gr.addColorStop(0, '#ff8a2a'); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(vx - 70, base - 250); g.lineTo(vx + 70, base - 250); g.lineTo(vx + 40, base - 130); g.lineTo(vx - 50, base - 150); g.fill();
    }
  } else { // gece: şehir silüeti
    const n = which === 0 ? 22 : which === 1 ? 16 : 11;
    let x = 0;
    while (x < PAR_W) {
      const w = R(50, 120) * (1 + which * .3), h = R(120, 300) * (which === 0 ? 1.2 : which === 1 ? 1 : .75);
      const bx = x;
      wrap(o => {
        g.fillStyle = shade(col, R(-.05, .1)); g.fillRect(bx + o, base - h, w, H);
        g.fillStyle = which === 2 ? 'rgba(255,214,120,.85)' : 'rgba(255,230,150,.55)';
        const r2 = mulberry(Math.floor(bx) + which * 1000);
        for (let wy = base - h + 12; wy < H - 10; wy += 16) for (let wx = bx + 8; wx < bx + w - 8; wx += 13) if (r2() < .33) g.fillRect(wx + o, wy, 6, 8);
        if (which === 1 && r2() < .3) { g.fillStyle = '#ff3b5c'; g.beginPath(); g.arc(bx + o + w / 2, base - h - 14, 3, 0, TAU); g.fill(); g.fillStyle = shade(col, .1); g.fillRect(bx + o + w / 2 - 1, base - h - 14, 2, 14); }
      });
      x += w + R(4, 26) - (n - 10);
    }
  }
  return c;
}
const layerCache = {};
function layers(world) { if (!layerCache[world]) layerCache[world] = [0, 1, 2].map(i => makeLayer(world, i)); return layerCache[world]; }
const patCache = {};
function groundPattern(g, world) {
  if (patCache[world]) return patCache[world];
  const W = WORLD[world], c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), rnd = mulberry(world.length * 31 + 7);
  x.fillStyle = W.dirt; x.fillRect(0, 0, 128, 128);
  if (world === 'seker') { // bisküvi delikleri ve çikolata parçaları
    for (let i = 0; i < 10; i++) { x.fillStyle = W.dirtD; x.beginPath(); x.arc(rnd() * 128, rnd() * 128, 2.6, 0, TAU); x.fill(); }
    for (let i = 0; i < 6; i++) { x.fillStyle = '#6b3a1f'; x.beginPath(); x.ellipse(rnd() * 128, rnd() * 128, 5, 3.4, rnd() * 3, 0, TAU); x.fill(); }
  } else if (world === 'gece') { // tuğla
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2;
    for (let y = 0; y < 128; y += 16) { x.beginPath(); x.moveTo(0, y); x.lineTo(128, y); x.stroke(); for (let k = 0; k < 4; k++) { const bx = k * 32 + (y / 16 % 2) * 16; x.beginPath(); x.moveTo(bx, y); x.lineTo(bx, y + 16); x.stroke(); } }
  } else if (world === 'buzul') { // buz çatlakları
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) { let px = rnd() * 128, py = rnd() * 128; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 3; k++) { px += (rnd() - .5) * 40; py += (rnd() - .3) * 30; x.lineTo(px, py); } x.stroke(); }
  } else if (world === 'volkan') { // kızgın çatlaklar
    x.strokeStyle = 'rgba(255,110,20,.75)'; x.lineWidth = 2;
    for (let i = 0; i < 5; i++) { let px = rnd() * 128, py = rnd() * 128; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 3; k++) { px += (rnd() - .5) * 36; py += (rnd() - .5) * 36; x.lineTo(px, py); } x.stroke(); }
    for (let i = 0; i < 8; i++) { x.fillStyle = W.dirtD; x.beginPath(); x.arc(rnd() * 128, rnd() * 128, 3 + rnd() * 4, 0, TAU); x.fill(); }
  } else { // çakıl taşları
    for (let i = 0; i < 12; i++) { x.fillStyle = rnd() < .5 ? W.dirtD : shade(W.dirt, .15); x.beginPath(); x.ellipse(rnd() * 128, rnd() * 128, 3 + rnd() * 3, 2 + rnd() * 2, rnd() * 3, 0, TAU); x.fill(); }
  }
  patCache[world] = g.createPattern(c, 'repeat');
  return patCache[world];
}
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// gökyüzü + paralaks katmanları (ekran koordinatı). Gökyüzü ve ölçeklenmiş katmanlar önbelleğe alınır:
// her karede yalnız birebir kopyalama yapılır (telefonlarda büyük kazanç).
let skyC = { key: '', c: null }, layC = {};
function skyBase(world, w, h, dpr) {
  const W = WORLD[world], c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(h * dpr));
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, W.sky[0]); gr.addColorStop(.55, W.sky[1]); gr.addColorStop(1, W.sky[2]);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const sx = w * .78, sy = h * .2, sr = Math.min(w, h) * .08;
  if (world === 'gece') {
    g.fillStyle = 'rgba(255,255,255,.85)'; const r2 = mulberry(11);
    for (let i = 0; i < 70; i++) { const x = r2() * w, y = r2() * h * .6; g.globalAlpha = .35 + .65 * r2(); g.fillRect(x, y, 1.6, 1.6); }
    g.globalAlpha = 1;
    const mg = g.createRadialGradient(sx, sy, sr * .2, sx, sy, sr * 2.4); mg.addColorStop(0, 'rgba(255,250,220,.5)'); mg.addColorStop(1, 'rgba(255,250,220,0)'); g.fillStyle = mg; g.fillRect(sx - sr * 2.4, sy - sr * 2.4, sr * 4.8, sr * 4.8);
    g.fillStyle = W.sun; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill(); g.fillStyle = 'rgba(200,190,160,.5)'; g.beginPath(); g.arc(sx - sr * .3, sy - sr * .2, sr * .2, 0, TAU); g.arc(sx + sr * .35, sy + sr * .3, sr * .14, 0, TAU); g.fill();
  } else {
    const sg = g.createRadialGradient(sx, sy, sr * .3, sx, sy, sr * 3); sg.addColorStop(0, rgba(W.sun, .9)); sg.addColorStop(.3, rgba(W.sun, .35)); sg.addColorStop(1, rgba(W.sun, 0));
    g.fillStyle = sg; g.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6); g.fillStyle = W.sun; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
  }
  if (world === 'buzul') { // kutup ışığı
    g.globalAlpha = .28; for (let k = 0; k < 2; k++) { const ag = g.createLinearGradient(0, h * .05, 0, h * .4); ag.addColorStop(0, k ? 'rgba(160,120,255,0)' : 'rgba(80,255,190,0)'); ag.addColorStop(.5, k ? '#b48cff' : '#5affc8'); ag.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = ag; g.beginPath(); g.moveTo(0, h * .3); for (let x = 0; x <= w; x += 20) g.lineTo(x, h * (.16 + k * .06) + Math.sin(x / 120 + k) * h * .05); g.lineTo(w, h * .45); g.lineTo(0, h * .45); g.fill(); } g.globalAlpha = 1;
  }
  return c;
}
function scaledLayer(world, i, s, dpr) {
  const key = world + i + '|' + Math.round(s * dpr * 50);
  if (layC[key]) return layC[key];
  if (Object.keys(layC).length > 12) layC = {};
  const src = layers(world)[i], c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(PAR_W * s * dpr)); c.height = Math.max(1, Math.round(620 * s * dpr));
  const g = c.getContext('2d'); g.drawImage(src, 0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = WORLD[world].fog; g.fillRect(0, 0, c.width, c.height);
  layC[key] = c; return c;
}
function drawSky(g, world, w, h, camX, camY, scale, t, dpr) {
  dpr = dpr || 1;
  const W = WORLD[world];
  const key = world + '|' + Math.round(w) + '|' + Math.round(h) + '|' + dpr;
  if (skyC.key !== key) skyC = { key, c: skyBase(world, w, h, dpr) };
  g.drawImage(skyC.c, 0, 0, w, h);
  // bulutlar
  if (world !== 'gece' && world !== 'volkan') {
    g.fillStyle = 'rgba(255,255,255,.88)';
    for (let i = 0; i < 6; i++) {
      const cw = 900, x = ((i * 260 - camX * .05 - t * 6) % cw + cw) % cw * (w / cw * 1.4) - 80, y = h * (.08 + (i % 3) * .09), s = (.7 + (i % 2) * .4) * Math.max(.6, scale);
      g.beginPath(); [[0, 0, 22], [24, -8, 26], [50, 0, 20], [26, 6, 22]].forEach(([dx, dy, r]) => { g.moveTo(x + dx * s + r * s, y + dy * s); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); }); g.fill();
    }
  } else if (world === 'volkan') { // duman
    g.fillStyle = 'rgba(60,30,40,.35)';
    for (let i = 0; i < 5; i++) { const x = ((i * 300 - camX * .04 - t * 10) % 1500 + 1500) % 1500 * (w / 1200) - 100, y = h * (.12 + (i % 2) * .08); g.beginPath(); g.arc(x, y, 40 * Math.max(.6, scale), 0, TAU); g.arc(x + 40, y + 10, 30 * Math.max(.6, scale), 0, TAU); g.fill(); }
  }
  const fac = [.12, .3, .55];
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const W2 = Math.round(w * dpr), H2 = Math.round(h * dpr);
  for (let i = 0; i < 3; i++) {
    const s = Math.max(.55, scale) * (1 + i * .08);
    const img = scaledLayer(world, i, s, dpr), lw = img.width, lh = img.height;
    const ox = -Math.round(((camX * fac[i] * scale * dpr) % lw + lw) % lw);
    const oy = Math.round(H2 - lh + (H2 * .12) - (camY - 300) * fac[i] * scale * .5 * dpr + i * 6 * s * dpr);
    for (let x = ox; x < W2; x += lw) g.drawImage(img, x, oy);
    if (oy + lh < H2) { g.fillStyle = shade(i === 0 ? W.far : i === 1 ? W.mid : W.near, 0); g.fillRect(0, oy + lh - 1, W2, H2 - oy - lh + 1); }
  }
  g.restore();
}

// zemin parçası (dünya koordinatı)
function drawSeg(g, world, s, bottom, prevJoined, nextJoined) {
  const W = WORLD[world];
  g.beginPath(); g.moveTo(s.x0, s.y0); g.lineTo(s.x1, s.y1); g.lineTo(s.x1, bottom); g.lineTo(s.x0, bottom); g.closePath();
  g.fillStyle = groundPattern(g, world); g.fill();
  // üst gölge degradesi (derinlik)
  const ty = Math.min(s.y0, s.y1);
  const gr = g.createLinearGradient(0, ty, 0, ty + 160); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.28)');
  g.fillStyle = gr; g.fill();
  if (!prevJoined) { const eg = g.createLinearGradient(s.x0, 0, s.x0 + 18, 0); eg.addColorStop(0, 'rgba(0,0,0,.35)'); eg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = eg; g.fillRect(s.x0, s.y0, 18, bottom - s.y0); }
  if (!nextJoined) { const eg = g.createLinearGradient(s.x1, 0, s.x1 - 18, 0); eg.addColorStop(0, 'rgba(0,0,0,.35)'); eg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = eg; g.fillRect(s.x1 - 18, s.y1, 18, bottom - s.y1); }
  // yüzey şeridi
  const top = s.ice ? '#dff4ff' : W.grass, topD = s.ice ? '#7fc4ef' : W.grassD;
  const th = world === 'gece' ? 10 : 13;
  g.beginPath(); g.moveTo(s.x0 - (prevJoined ? 0 : 3), s.y0 - 2); g.lineTo(s.x1 + (nextJoined ? 0 : 3), s.y1 - 2); g.lineTo(s.x1 + (nextJoined ? 0 : 3), s.y1 + th); g.lineTo(s.x0 - (prevJoined ? 0 : 3), s.y0 + th); g.closePath();
  const tg = g.createLinearGradient(0, ty - 2, 0, ty + th); tg.addColorStop(0, shade(top, .25)); tg.addColorStop(.5, top); tg.addColorStop(1, topD); g.fillStyle = tg; g.fill();
  if (world === 'seker' && !s.ice) { // krema damlaları ve şeker serpintisi
    g.fillStyle = W.grass; const n = Math.floor((s.x1 - s.x0) / 26);
    for (let i = 0; i < n; i++) { const x = s.x0 + 13 + i * 26, y = s.y0 + (s.y1 - s.y0) * ((x - s.x0) / (s.x1 - s.x0)); const dl = 6 + ((i * 7919) % 9); g.beginPath(); g.moveTo(x - 6, y + th - 2); g.lineTo(x - 6, y + th + dl - 4); g.arc(x - 1, y + th + dl - 4, 5, Math.PI, 0, true); g.lineTo(x + 4, y + th - 2); g.fill(); }
    for (let i = 0; i < n * 2; i++) { const x = s.x0 + 6 + i * 13, y = s.y0 + (s.y1 - s.y0) * ((x - s.x0) / (s.x1 - s.x0)); g.fillStyle = RAINBOW[i % 6]; g.fillRect(x, y + 2 + (i % 3) * 3, 4, 1.8); }
  } else if (world === 'cayir') {
    g.strokeStyle = W.grassD; g.lineWidth = 2; g.beginPath();
    const n = Math.floor((s.x1 - s.x0) / 9);
    for (let i = 0; i < n; i++) { const x = s.x0 + 4 + i * 9, y = s.y0 + (s.y1 - s.y0) * ((x - s.x0) / (s.x1 - s.x0)); g.moveTo(x, y + th - 1); g.lineTo(x + 2, y + th + 4 + (i % 3) * 2); }
    g.stroke();
  } else if (world === 'gece') {
    g.fillStyle = '#ffd84a'; const n = Math.floor((s.x1 - s.x0) / 40);
    for (let i = 0; i < n; i++) { const x = s.x0 + 10 + i * 40, y = s.y0 + (s.y1 - s.y0) * ((x - s.x0) / (s.x1 - s.x0)); g.fillRect(x, y + th - 2, 18, 3); }
  } else if (world === 'buzul' && !s.ice) {
    g.fillStyle = '#ffffff'; const n = Math.floor((s.x1 - s.x0) / 30);
    for (let i = 0; i < n; i++) { const x = s.x0 + 15 + i * 30, y = s.y0 + (s.y1 - s.y0) * ((x - s.x0) / (s.x1 - s.x0)); g.beginPath(); g.arc(x, y + th - 1, 6 + (i % 2) * 2, 0, Math.PI); g.fill(); }
  }
  if (s.ice) { g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(s.x0 + 6, s.y0 + 2); g.lineTo(s.x1 - 6, s.y1 + 2); g.stroke(); }
}
function drawPit(g, world, p, bottom, t) {
  if (WORLD[world].pit !== 'lava') return;
  const y = bottom - 60;
  const gr = g.createLinearGradient(0, y - 30, 0, bottom); gr.addColorStop(0, 'rgba(255,140,40,0)'); gr.addColorStop(.3, '#ff7a1a'); gr.addColorStop(1, '#c62a0a');
  g.fillStyle = gr; g.beginPath(); g.moveTo(p.x0, bottom);
  for (let x = p.x0; x <= p.x1; x += 12) g.lineTo(x, y + Math.sin(x * .05 + t * 3) * 5);
  g.lineTo(p.x1, bottom); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,230,120,.8)'; for (let x = p.x0 + 20; x < p.x1 - 10; x += 47) { const ph = (t * 1.3 + x * .13) % 2; if (ph < 1) { g.beginPath(); g.arc(x, y - ph * 18, 3 * (1 - ph) + 1, 0, TAU); g.fill(); } }
}
function drawPlat(g, world, x, y, w, moving) {
  const W = WORLD[world], h = 18;
  g.fillStyle = 'rgba(0,0,0,.18)'; rrect(g, x + 4, y + 8, w - 4, h, 8); g.fill();
  rrect(g, x, y - 2, w, h, 8);
  const gr = g.createLinearGradient(0, y - 2, 0, y + h); gr.addColorStop(0, shade(W.plat, .3)); gr.addColorStop(.5, W.plat); gr.addColorStop(1, shade(W.plat, -.3));
  g.fillStyle = gr; g.fill(); g.strokeStyle = shade(W.plat, -.55); g.lineWidth = 1.6; g.stroke();
  if (world === 'cayir') { g.strokeStyle = rgba(shade(W.plat, -.4), .6); g.lineWidth = 1; for (let k = 30; k < w; k += 34) { g.beginPath(); g.moveTo(x + k, y); g.lineTo(x + k, y + h - 4); g.stroke(); } g.fillStyle = W.grass; rrect(g, x + 2, y - 4, w - 4, 6, 3); g.fill(); }
  else if (world === 'seker') { g.strokeStyle = shade(W.plat, -.45); g.lineWidth = 1.4; for (let k = 22; k < w - 6; k += 22) { g.beginPath(); g.moveTo(x + k, y); g.lineTo(x + k, y + h - 4); g.stroke(); } g.fillStyle = '#fff'; g.globalAlpha = .4; g.fillRect(x + 6, y + 1, w - 12, 2); g.globalAlpha = 1; }
  else if (world === 'buzul') { g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x + 8, y + 1, w * .5, 2.4); g.fillStyle = '#fff'; rrect(g, x + 1, y - 5, w - 2, 6, 3); g.fill(); for (let k = 12; k < w - 8; k += 26) { g.fillStyle = 'rgba(220,245,255,.9)'; g.beginPath(); g.moveTo(x + k, y + h - 3); g.lineTo(x + k + 4, y + h + 7); g.lineTo(x + k + 8, y + h - 3); g.fill(); } }
  else if (world === 'volkan') { g.fillStyle = 'rgba(255,110,20,.6)'; g.fillRect(x + w * .3, y + h - 6, w * .25, 2); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 6, y + 1, w - 12, 2); }
  else { g.strokeStyle = '#ffd84a'; g.lineWidth = 2; for (let k = 6; k < w - 10; k += 16) { g.beginPath(); g.moveTo(x + k, y + h - 4); g.lineTo(x + k + 8, y + 2); g.stroke(); } if (moving) { g.fillStyle = '#2bff88'; g.beginPath(); g.arc(x + w / 2, y + h / 2, 2.4, 0, TAU); g.fill(); } }
}
function drawBlock(g, world, b, t) {
  const W = WORLD[world];
  if (b.k === 'bar') {
    // üstten sarkan engel: altından kay!
    const by = b.y + b.h, bw = b.w, x = b.x;
    const H2 = 64;
    g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(x + 6, by + 6, bw, 6);
    // destek sütunları/zincirler
    g.strokeStyle = world === 'gece' ? '#8892b0' : world === 'seker' ? '#ffffff' : '#6b4a2a'; g.lineWidth = 4;
    for (const dx of [14, bw - 14]) { g.beginPath(); g.moveTo(x + dx, b.y); g.lineTo(x + dx, by - H2 + 4); g.stroke(); }
    rrect(g, x, by - H2, bw, H2, 12);
    const col = world === 'gece' ? '#3b3f6e' : world === 'seker' ? '#7a4424' : world === 'buzul' ? '#9fd6ff' : world === 'volkan' ? '#4a3a42' : '#8a5a30';
    const gr = g.createLinearGradient(0, by - H2, 0, by); gr.addColorStop(0, shade(col, .25)); gr.addColorStop(1, shade(col, -.25)); g.fillStyle = gr; g.fill();
    g.strokeStyle = shade(col, -.55); g.lineWidth = 2; g.stroke();
    // alt kenarda uyarı şeridi
    g.save(); rrect(g, x, by - 14, bw, 14, 6); g.clip();
    for (let k = -14; k < bw + 14; k += 14) { g.fillStyle = (k / 14) % 2 ? '#22222b' : '#ffd84a'; g.beginPath(); g.moveTo(x + k, by); g.lineTo(x + k + 7, by - 14); g.lineTo(x + k + 14, by - 14); g.lineTo(x + k + 7, by); g.fill(); }
    g.restore();
    // tabela
    const cx = x + bw / 2, cy = by - H2 / 2 - 6;
    if (world === 'gece') { g.shadowColor = '#ff3fa4'; g.shadowBlur = 10; }
    g.fillStyle = world === 'gece' ? '#ff3fa4' : '#fff';
    g.font = `900 18px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('KAY ▼', cx, cy); g.shadowBlur = 0;
    return;
  }
  const x = b.x, y = b.y, s = b.w;
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 5, y + 5, s, b.h);
  rrect(g, x, y, s, b.h, world === 'buzul' ? 8 : 6);
  if (world === 'seker') {
    const c = ['#5ad1c8', '#ff8fc8', '#ffd84a', '#9b6bff'][(b.id * 7) % 4];
    const gr = g.createLinearGradient(x, y, x + s, y + b.h); gr.addColorStop(0, shade(c, .3)); gr.addColorStop(1, shade(c, -.25)); g.fillStyle = gr; g.fill(); g.strokeStyle = shade(c, -.55); g.lineWidth = 1.6; g.stroke();
    g.fillStyle = '#fff'; g.fillRect(x + s / 2 - 4, y, 8, b.h); g.fillRect(x, y + b.h / 2 - 4, s, 8);
    g.beginPath(); g.ellipse(x + s / 2 - 8, y - 2, 8, 5, -.4, 0, TAU); g.ellipse(x + s / 2 + 8, y - 2, 8, 5, .4, 0, TAU); g.fill();
  } else if (world === 'buzul') {
    const gr = g.createLinearGradient(x, y, x + s, y + b.h); gr.addColorStop(0, 'rgba(240,252,255,.95)'); gr.addColorStop(1, 'rgba(120,190,240,.95)'); g.fillStyle = gr; g.fill(); g.strokeStyle = '#5fa6d8'; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(x + 6, y + 6, 6, s - 20); g.fillRect(x + 14, y + 6, 3, 10);
  } else if (world === 'volkan') {
    const gr = g.createLinearGradient(x, y, x + s, y + b.h); gr.addColorStop(0, '#8a7a80'); gr.addColorStop(1, '#3b2f36'); g.fillStyle = gr; g.fill(); g.strokeStyle = '#1f1720'; g.lineWidth = 1.6; g.stroke();
    g.strokeStyle = 'rgba(255,110,20,.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 10, y + 12); g.lineTo(x + 22, y + 26); g.lineTo(x + 18, y + 40); g.stroke();
  } else {
    const c = world === 'gece' ? '#c08a4a' : W.crate;
    const gr = g.createLinearGradient(x, y, x + s, y + b.h); gr.addColorStop(0, shade(c, .3)); gr.addColorStop(1, shade(c, -.25)); g.fillStyle = gr; g.fill(); g.strokeStyle = shade(c, -.6); g.lineWidth = 1.8; g.stroke();
    g.strokeStyle = shade(c, -.4); g.lineWidth = 4; g.beginPath(); g.moveTo(x + 7, y + 7); g.lineTo(x + s - 7, y + b.h - 7); g.moveTo(x + s - 7, y + 7); g.lineTo(x + 7, y + b.h - 7); g.stroke();
    g.strokeStyle = shade(c, -.55); g.lineWidth = 1.5; g.strokeRect(x + 4, y + 4, s - 8, b.h - 8);
  }
}
const FONT = '"Bungee","Nunito","Arial Black",sans-serif';
function drawHaz(g, world, h, t, T, E) {
  const W = WORLD[world];
  switch (h.k) {
    case 'spike': {
      const n = Math.max(2, Math.round(h.w / 16)), sw = h.w / n;
      for (let i = 0; i < n; i++) {
        const x = h.x + i * sw;
        if (world === 'gece') { // trafik konisi
          const gr = g.createLinearGradient(x, 0, x + sw, 0); gr.addColorStop(0, '#ffb04a'); gr.addColorStop(1, '#d95a00');
          poly(g, [x + 1, h.y, x + sw - 1, h.y, x + sw / 2, h.y - 24], '#ff8a00', true, gr); g.fillStyle = '#fff'; g.fillRect(x + sw * .3, h.y - 14, sw * .4, 4);
        } else if (world === 'seker') { // şeker kamışı dikeni
          poly(g, [x + 1, h.y, x + sw - 1, h.y, x + sw / 2, h.y - 24], '#ffffff');
          g.fillStyle = '#ff4f6d'; g.beginPath(); g.moveTo(x + sw * .25, h.y - 6); g.lineTo(x + sw * .7, h.y - 10); g.lineTo(x + sw * .62, h.y - 14); g.lineTo(x + sw * .32, h.y - 11); g.fill();
        } else {
          const c = world === 'buzul' ? '#d8f2ff' : world === 'volkan' ? '#2c2230' : '#4a9a3a';
          const gr = g.createLinearGradient(x, 0, x + sw, 0); gr.addColorStop(0, shade(c, .35)); gr.addColorStop(1, shade(c, -.3));
          poly(g, [x + 1, h.y, x + sw - 1, h.y, x + sw / 2, h.y - 24], c, true, gr);
          if (world === 'volkan') { g.fillStyle = 'rgba(255,120,30,.8)'; g.beginPath(); g.arc(x + sw / 2, h.y - 22, 1.6, 0, TAU); g.fill(); }
        }
      }
      if (world === 'cayir') { g.fillStyle = '#3c8a32'; rrect(g, h.x - 4, h.y - 8, h.w + 8, 10, 5); g.fill(); g.fillStyle = '#ff6fa8'; for (let i = 0; i < n; i += 2) { g.beginPath(); g.arc(h.x + i * sw + sw / 2, h.y - 6, 2.4, 0, TAU); g.fill(); } }
      break;
    }
    case 'hammer': {
      const [hx, hy, a] = E.hammerHead(h, t);
      g.strokeStyle = world === 'gece' ? '#9aa3b8' : '#6b4a2a'; g.lineWidth = world === 'gece' ? 3 : 6; g.lineCap = 'round';
      if (world === 'gece') { g.setLineDash([5, 4]); }
      g.beginPath(); g.moveTo(h.x, h.y); g.lineTo(hx, hy); g.stroke(); g.setLineDash([]);
      ball(g, h.x, h.y, 7, '#8892a0');
      if (world === 'gece') { ball(g, hx, hy, 28, '#3b3f4a'); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(hx - 9, hy - 9, 7, 0, TAU); g.fill(); }
      else if (world === 'seker') { ball(g, hx, hy, 28, '#ff8fc8'); g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); for (let k = 0; k < 18; k += .3) g.lineTo(hx + Math.cos(k + t) * k * 1.3, hy + Math.sin(k + t) * k * 1.3); g.stroke(); }
      else {
        g.save(); g.translate(hx, hy); g.rotate(-a);
        const c = world === 'buzul' ? '#9fd6ff' : world === 'volkan' ? '#5a4a52' : '#b07a45';
        rrect(g, -32, -20, 64, 40, 10); const gr = g.createLinearGradient(0, -20, 0, 20); gr.addColorStop(0, shade(c, .3)); gr.addColorStop(1, shade(c, -.3)); g.fillStyle = gr; g.fill(); g.strokeStyle = shade(c, -.6); g.lineWidth = 2; g.stroke();
        g.fillStyle = shade(c, -.35); g.fillRect(-32, -6, 64, 4); g.restore();
      }
      break;
    }
    case 'log': {
      const lx = E.logPos(h, t), ly = h.y - h.r, span = h.xb - h.xa, u = (lx - h.xa) / span;
      const al = Math.min(1, Math.min(u, 1 - u) * 8);
      g.globalAlpha = al; g.save(); g.translate(lx, ly); g.rotate(-(t * h.v) / h.r);
      if (world === 'seker') { ball(g, 0, 0, h.r, '#e8b46a'); g.beginPath(); g.arc(0, 0, h.r * .85, 0, TAU); g.fillStyle = '#ff8fc8'; g.fill(); g.fillStyle = '#e8b46a'; g.beginPath(); g.arc(0, 0, h.r * .32, 0, TAU); g.fill(); for (let k = 0; k < 8; k++) { g.fillStyle = RAINBOW[k % 6]; g.save(); g.rotate(k * .8); g.fillRect(h.r * .5, -1, 5, 2); g.restore(); } }
      else if (world === 'buzul') { ball(g, 0, 0, h.r, '#ffffff'); g.fillStyle = 'rgba(160,210,240,.6)'; g.beginPath(); g.arc(6, 4, 6, 0, TAU); g.arc(-8, -3, 4, 0, TAU); g.fill(); }
      else if (world === 'volkan') { ball(g, 0, 0, h.r, '#5a4a52'); g.strokeStyle = 'rgba(255,110,20,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-10, -8); g.lineTo(2, 0); g.lineTo(-4, 12); g.stroke(); }
      else if (world === 'gece') { ball(g, 0, 0, h.r, '#22222b'); g.fillStyle = '#8892a0'; g.beginPath(); g.arc(0, 0, h.r * .5, 0, TAU); g.fill(); g.fillStyle = '#22222b'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(Math.cos(k * 1.26) * h.r * .3, Math.sin(k * 1.26) * h.r * .3, 2, 0, TAU); g.fill(); } }
      else { ball(g, 0, 0, h.r, '#8a5a30'); g.fillStyle = '#e8c08a'; g.beginPath(); g.arc(0, 0, h.r * .72, 0, TAU); g.fill(); g.strokeStyle = '#b07a45'; g.lineWidth = 1.5; for (const rr of [.5, .28]) { g.beginPath(); g.arc(0, 0, h.r * rr, 0, TAU); g.stroke(); } }
      g.restore(); g.globalAlpha = 1;
      break;
    }
    case 'geyser': {
      const on = E.geyserOn(h, t), u = ((t + h.ph) % h.p + h.p) % h.p;
      g.fillStyle = '#2c1a26'; rrect(g, h.x - 26, h.y - 10, 52, 14, 6); g.fill(); g.fillStyle = '#ff6a00'; g.beginPath(); g.ellipse(h.x, h.y - 8, 16, 4, 0, 0, TAU); g.fill();
      if (on > 0) {
        const hh = h.h * Math.min(1, on * 4) * (1 - Math.max(0, on - .8) * 2);
        const gr = g.createLinearGradient(0, h.y - hh, 0, h.y); gr.addColorStop(0, '#ffe27a'); gr.addColorStop(.4, '#ff8a1a'); gr.addColorStop(1, '#d6300a');
        g.fillStyle = gr; g.beginPath(); g.moveTo(h.x - h.w / 2, h.y); g.quadraticCurveTo(h.x - h.w / 2 - 6, h.y - hh * .5, h.x - 10, h.y - hh); g.quadraticCurveTo(h.x, h.y - hh - 16, h.x + 10, h.y - hh); g.quadraticCurveTo(h.x + h.w / 2 + 6, h.y - hh * .5, h.x + h.w / 2, h.y); g.fill();
        g.fillStyle = '#ffe27a'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(h.x + Math.sin(t * 9 + k * 2) * 18, h.y - hh - 6 - (t * 80 + k * 20) % 30, 3, 0, TAU); g.fill(); }
      } else if (h.p - u < .6) { // uyarı köpükleri
        g.fillStyle = 'rgba(255,170,60,.9)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(h.x - 8 + k * 8, h.y - 12 - ((t * 60 + k * 9) % 14), 2.6, 0, TAU); g.fill(); }
      }
      break;
    }
    case 'mud': {
      const c = world === 'seker' ? '#6b3a1f' : world === 'buzul' ? '#f4fbff' : world === 'gece' ? '#3a4a8a' : '#7a5232';
      g.fillStyle = c; g.beginPath(); g.moveTo(h.x, h.y + 4);
      for (let x = h.x; x <= h.x + h.w; x += 14) g.lineTo(x, h.y - 6 - Math.sin(x * .09 + t * 2) * 2.5);
      g.lineTo(h.x + h.w, h.y + 4); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.3)'; for (let x = h.x + 20; x < h.x + h.w - 10; x += 60) { const ph = (t + x * .07) % 2; g.beginPath(); g.arc(x, h.y - 6, 2 + ph * 2, 0, TAU); g.fill(); }
      break;
    }
    case 'pad': {
      g.fillStyle = '#22222b'; rrect(g, h.x, h.y - 6, h.w, 8, 3); g.fill();
      for (let k = 0; k < 4; k++) { const ph = ((t * 3 - k * .25) % 1 + 1) % 1; g.fillStyle = `rgba(43,255,136,${.35 + .65 * ph})`; const x = h.x + 14 + k * 26; g.beginPath(); g.moveTo(x, h.y - 6); g.lineTo(x + 10, h.y - 2); g.lineTo(x, h.y + 2); g.lineTo(x + 4, h.y - 2); g.fill(); }
      break;
    }
    case 'conv': {
      g.fillStyle = '#2b2b35'; rrect(g, h.x, h.y - 8, h.w, 12, 6); g.fill();
      const dir = h.v > 0 ? 1 : -1, off = ((t * h.v * .5) % 20 + 20) % 20;
      g.fillStyle = h.v > 0 ? '#2bff88' : '#ff3b5c';
      for (let x = h.x + 8 + off; x < h.x + h.w - 8; x += 20) { g.beginPath(); g.moveTo(x, h.y - 6); g.lineTo(x + 6 * dir, h.y - 2); g.lineTo(x, h.y + 2); g.fill(); }
      ball(g, h.x + 6, h.y - 2, 6, '#8892a0', { rim: false }); ball(g, h.x + h.w - 6, h.y - 2, 6, '#8892a0', { rim: false });
      break;
    }
    case 'spring': {
      const x = h.x, w = h.w, comp = (T && T._spr && T._spr[h.id] && t - T._spr[h.id] < .25) ? 1 - (t - T._spr[h.id]) * 4 : 0;
      const top = h.y - 20 + comp * 10;
      g.strokeStyle = '#8892a0'; g.lineWidth = 3; g.beginPath();
      for (let k = 0; k <= 4; k++) g.lineTo(x + w / 2 + (k % 2 ? 12 : -12), h.y - 2 - (h.y - 2 - top) * k / 4); g.stroke();
      const c = world === 'seker' ? '#ff4f6d' : world === 'gece' ? '#19e3d0' : '#ff3fa4';
      rrect(g, x - 2, top - 7, w + 4, 9, 4); const gr = g.createLinearGradient(0, top - 7, 0, top + 2); gr.addColorStop(0, shade(c, .35)); gr.addColorStop(1, shade(c, -.25)); g.fillStyle = gr; g.fill(); g.strokeStyle = shade(c, -.55); g.lineWidth = 1.4; g.stroke();
      g.fillStyle = '#2b2b35'; g.fillRect(x + 2, h.y - 3, w - 4, 3);
      break;
    }
    default: break;
  }
}
function drawDeco(g, world, d, t) {
  const s = d.s; g.save(); g.translate(d.x, d.y); g.scale(s * (d.f ? -1 : 1), s);
  switch (world) {
    case 'cayir':
      if (d.k === 0) { for (let i = 0; i < 3; i++) { g.strokeStyle = '#3c9f35'; g.lineWidth = 2; g.beginPath(); g.moveTo(-8 + i * 8, 0); g.lineTo(-8 + i * 8 + Math.sin(t + i) * 2, -14 - i * 3); g.stroke(); const c = ['#ff6fa8', '#ffe14a', '#ffffff'][i]; g.fillStyle = c; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(-8 + i * 8 + Math.cos(k * 1.26) * 3, -16 - i * 3 + Math.sin(k * 1.26) * 3, 2.4, 0, TAU); g.fill(); } g.fillStyle = '#ff9a3c'; g.beginPath(); g.arc(-8 + i * 8, -16 - i * 3, 1.8, 0, TAU); g.fill(); } }
      else if (d.k === 1) { ball(g, 0, -12, 14, '#4fb34a'); ball(g, -12, -8, 10, '#5fc65a'); ball(g, 12, -8, 10, '#47a843'); g.fillStyle = '#ff4f6d'; [[-4, -18], [6, -14], [-10, -10]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); }); }
      else if (d.k === 2) { g.fillStyle = '#f3e3c8'; rrect(g, -4, -14, 8, 14, 3); g.fill(); g.beginPath(); g.ellipse(0, -14, 12, 9, 0, Math.PI, TAU); g.fillStyle = '#e8433a'; g.fill(); g.fillStyle = '#fff'; [[-5, -17], [4, -19], [0, -15]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); }); }
      else if (d.k === 3) { g.fillStyle = '#c98a4f'; for (const x of [-18, 0, 18]) g.fillRect(x - 3, -28, 6, 28); g.fillRect(-22, -22, 44, 5); g.fillRect(-22, -12, 44, 5); }
      else { g.strokeStyle = '#3c9f35'; g.lineWidth = 2; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-6 + i * 3, 0); g.quadraticCurveTo(-8 + i * 4, -10, -10 + i * 5 + Math.sin(t * 2 + i) * 2, -16); g.stroke(); } }
      break;
    case 'seker':
      if (d.k === 0 || d.k === 3) { g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -34); g.stroke(); ball(g, 0, -44, 12, RAINBOW[(d.x / 7 | 0) % 6]); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, -44, 6, 0, 4.6); g.stroke(); }
      else if (d.k === 1) { g.lineWidth = 6; g.lineCap = 'round'; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -30); g.arc(-8, -30, 8, 0, Math.PI, true); g.stroke(); g.strokeStyle = '#ff4f6d'; g.setLineDash([4, 5]); g.stroke(); g.setLineDash([]); }
      else if (d.k === 2) { [['#ff8fc8', -9], ['#5ad1c8', 0], ['#ffd84a', 9]].forEach(([c, x]) => { g.beginPath(); g.ellipse(x, -7, 6, 8, 0, Math.PI, TAU); g.lineTo(x + 6, 0); g.lineTo(x - 6, 0); g.fillStyle = c; g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(x - 2, -10, 1.6, 0, TAU); g.fill(); }); }
      else { g.fillStyle = '#e8b46a'; g.beginPath(); g.moveTo(-10, 0); g.lineTo(-12, -12); g.lineTo(12, -12); g.lineTo(10, 0); g.fill(); ball(g, 0, -16, 11, '#ff8fc8'); ball(g, 0, -27, 3.6, '#ff2a4a', { rim: false }); }
      break;
    case 'buzul':
      if (d.k === 0) { ball(g, 0, -10, 11, '#ffffff'); ball(g, 0, -27, 8, '#ffffff'); g.fillStyle = '#222'; g.beginPath(); g.arc(-2, -29, 1.2, 0, TAU); g.arc(3, -29, 1.2, 0, TAU); g.fill(); g.fillStyle = '#ff8a00'; g.beginPath(); g.moveTo(4, -26); g.lineTo(11, -25); g.lineTo(4, -24); g.fill(); g.fillStyle = '#e8433a'; g.fillRect(-7, -21, 14, 3); }
      else if (d.k === 1 || d.k === 4) { g.fillStyle = '#2e6b5a'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-14 + k * 3, -8 - k * 14); g.lineTo(0, -30 - k * 14); g.lineTo(14 - k * 3, -8 - k * 14); g.fill(); } g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-6, -50); g.lineTo(0, -58); g.lineTo(6, -50); g.fill(); g.fillStyle = '#6b4a2a'; g.fillRect(-2, -8, 4, 8); }
      else if (d.k === 2) { g.fillStyle = 'rgba(180,230,255,.9)'; poly(g, [-6, 0, -9, -16, -3, -26, 3, -14, 0, 0], '#bfe6ff'); poly(g, [2, 0, 6, -20, 11, -10, 8, 0], '#9fd6ff'); }
      else { ball(g, 0, -6, 9, '#ffffff', { line: false }); ball(g, 10, -4, 6, '#f4fbff', { line: false }); }
      break;
    case 'volkan':
      if (d.k === 0 || d.k === 3) { g.strokeStyle = '#4a3020'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(6, -30, 2, -54); g.stroke(); g.fillStyle = '#3a8a3a'; for (let k = 0; k < 5; k++) { g.save(); g.translate(2, -54); g.rotate(-2.8 + k * .95 + Math.sin(t + k) * .05); g.beginPath(); g.ellipse(16, 0, 18, 4.5, 0, 0, TAU); g.fill(); g.restore(); } }
      else if (d.k === 1) { ball(g, 0, -8, 10, '#5a4a52'); ball(g, 10, -5, 6, '#4a3a42'); }
      else if (d.k === 2) { g.fillStyle = '#7a5a3a'; rrect(g, -7, -30, 14, 30, 4); g.fill(); g.fillStyle = '#ffe14a'; g.fillRect(-4, -24, 3, 3); g.fillRect(2, -24, 3, 3); g.fillStyle = '#2b1a14'; g.fillRect(-4, -15, 9, 3); }
      else { g.strokeStyle = '#3a8a3a'; g.lineWidth = 2; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-10 + i * 5, -10, -14 + i * 7, -14); g.stroke(); } }
      break;
    case 'gece':
      if (d.k === 0) { g.fillStyle = '#59607e'; g.fillRect(-2, -60, 4, 60); g.fillRect(-2, -60, 14, 3); g.shadowColor = '#ffe9a0'; g.shadowBlur = 12; g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(12, -56, 4, 0, TAU); g.fill(); g.shadowBlur = 0; }
      else if (d.k === 1) { g.fillStyle = '#7a6a5a'; rrect(g, -12, -30, 24, 30, 3); g.fill(); g.fillStyle = '#5a4a3a'; g.fillRect(-14, -30, 28, 4); g.fillRect(-8, -40, 2, 10); g.fillRect(6, -40, 2, 10); }
      else if (d.k === 2) { g.fillStyle = '#8892b0'; g.fillRect(-1, -46, 2, 46); g.strokeStyle = '#8892b0'; g.lineWidth = 2; g.beginPath(); g.moveTo(-10, -40); g.lineTo(10, -40); g.moveTo(-6, -34); g.lineTo(6, -34); g.stroke(); g.fillStyle = Math.sin(t * 4) > 0 ? '#ff3b5c' : '#5a1a2a'; g.beginPath(); g.arc(0, -48, 2.5, 0, TAU); g.fill(); }
      else if (d.k === 3) { g.shadowColor = '#19e3d0'; g.shadowBlur = 10; g.strokeStyle = '#19e3d0'; g.lineWidth = 3; rrect(g, -20, -44, 40, 22, 6); g.stroke(); g.fillStyle = '#19e3d0'; g.font = `900 10px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PATİ', 0, -33); g.shadowBlur = 0; g.fillStyle = '#59607e'; g.fillRect(-1, -22, 2, 22); }
      else { g.fillStyle = '#3a8a5a'; rrect(g, -8, -16, 16, 16, 4); g.fill(); g.fillStyle = '#59607e'; g.fillRect(-9, -18, 18, 3); }
      break;
    default: break;
  }
  g.restore();
}
function drawCoin(g, x, y, t, id) {
  const sx = Math.abs(Math.cos(t * 3 + id * .7));
  g.save(); g.translate(x, y); g.scale(Math.max(.15, sx), 1);
  const gr = g.createRadialGradient(-3, -4, 1, 0, 0, 11); gr.addColorStop(0, '#fff6c0'); gr.addColorStop(.5, '#ffc93c'); gr.addColorStop(1, '#d98a00');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill(); g.strokeStyle = '#a86400'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = '#c47a00'; g.beginPath(); g.arc(0, 2, 3.2, 0, TAU); g.fill();
  [[-4, -3], [-1.4, -5.4], [1.6, -5.4], [4, -3]].forEach(([px, py]) => { g.beginPath(); g.arc(px, py, 1.5, 0, TAU); g.fill(); });
  g.restore();
}
function drawBox(g, x, y, t, taken) {
  const bob = Math.sin(t * 3 + x) * 4;
  g.save(); g.translate(x, y + bob);
  if (taken) g.globalAlpha = .25;
  const hue = (t * 60 + x) % 360;
  g.shadowColor = `hsl(${hue},100%,60%)`; g.shadowBlur = taken ? 0 : 14;
  rrect(g, -17, -17, 34, 34, 8);
  const gr = g.createLinearGradient(-17, -17, 17, 17); gr.addColorStop(0, `hsl(${hue},95%,72%)`); gr.addColorStop(1, `hsl(${(hue + 60) % 360},90%,52%)`);
  g.fillStyle = gr; g.fill(); g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2.5; g.stroke();
  g.fillStyle = '#fff'; g.font = `900 22px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, 1.5);
  g.restore();
}
function drawBanana(g, x, y) {
  g.save(); g.translate(x, y - 4);
  g.fillStyle = '#ffd84a'; g.strokeStyle = '#a07800'; g.lineWidth = 1.4;
  for (const [a, l] of [[-.9, 14], [.2, 13], [1.1, 12]]) { g.save(); g.rotate(a); g.beginPath(); g.ellipse(l * .5, 0, l * .55, 4, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
  g.fillStyle = '#6b4a10'; g.beginPath(); g.arc(0, -1, 2.5, 0, TAU); g.fill();
  g.restore();
}
function drawFlag(g, x, y, t, passed, col) {
  g.fillStyle = '#e8e8f0'; g.fillRect(x - 1.5, y - 70, 3, 70);
  g.fillStyle = passed ? (col || '#2bff88') : '#ff3fa4';
  g.beginPath(); g.moveTo(x + 1.5, y - 70); for (let k = 0; k <= 5; k++) g.lineTo(x + 1.5 + k * 6, y - 70 + Math.sin(t * 6 + k) * 2 + k * .4); g.lineTo(x + 31, y - 54); for (let k = 5; k >= 0; k--) g.lineTo(x + 1.5 + k * 6, y - 54 + Math.sin(t * 6 + k) * 2); g.fill();
  g.fillStyle = '#fff'; g.font = `900 9px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(passed ? '✓' : '🐾', x + 16, y - 62);
}
function drawGate(g, x, y, t, finish) {
  const h = 150, w = 120;
  g.save(); g.translate(x, y);
  for (const dx of [-w / 2, w / 2]) { rrect(g, dx - 7, -h, 14, h, 6); const gr = g.createLinearGradient(dx - 7, 0, dx + 7, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#b8bccc'); g.fillStyle = gr; g.fill(); g.strokeStyle = '#6b7080'; g.lineWidth = 1.5; g.stroke(); }
  rrect(g, -w / 2 - 12, -h - 26, w + 24, 34, 10); g.fillStyle = finish ? '#22222b' : '#ff3fa4'; g.fill();
  if (finish) { g.save(); rrect(g, -w / 2 - 12, -h - 26, w + 24, 34, 10); g.clip(); for (let i = 0; i < 18; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) { g.fillStyle = '#fff'; g.fillRect(-w / 2 - 12 + i * 8.5, -h - 26 + j * 8.5, 8.5, 8.5); } g.restore(); }
  g.fillStyle = finish ? '#ffe14a' : '#fff'; g.font = `900 16px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.strokeStyle = '#22222b'; g.lineWidth = 4; g.strokeText(finish ? 'BİTİŞ' : 'BAŞLA', 0, -h - 9); g.fillText(finish ? 'BİTİŞ' : 'BAŞLA', 0, -h - 9);
  // bayraklar
  for (let i = 0; i < 7; i++) { const fx = -w / 2 + i * (w / 6); g.fillStyle = RAINBOW[i % 6]; g.beginPath(); g.moveTo(fx - 5, -h + 10); g.lineTo(fx + 5, -h + 10); g.lineTo(fx, -h + 20 + Math.sin(t * 5 + i) * 2); g.fill(); }
  g.restore();
  // zemin çizgisi
  g.save(); g.translate(x, y); for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#fff' : '#22222b'; g.fillRect(-6, -2 + i * 0, 12, 4); } g.restore();
}

/* ------------------------------------------------------------------ güç simgeleri */
const POWERS = {
  turbo: { s: 'TURBO', n: 'Turbo', i: '🚀', c: '#ff8a00', d: 'Kısa süre çok hızlı koş!' },
  kalkan: { s: 'KALKAN', n: 'Kalkan', i: '🛡️', c: '#19e3d0', d: 'Bir saldırıyı engeller.' },
  muz: { s: 'MUZ', n: 'Muz Kabuğu', i: '🍌', c: '#ffd84a', d: 'Arkana muz bırak, kayan kayar!' },
  bulut: { s: 'BULUT', n: 'Yağmur Bulutu', i: '🌧️', c: '#7f9bd6', d: 'Öndekinin üstüne yağmur: yavaşlar.' },
  miknatis: { s: 'MIKNATIS', n: 'Ters Mıknatıs', i: '🧲', c: '#ff3b5c', d: 'Öndekini biraz geri çeker.' },
  sakiz: { s: 'SAKIZ', n: 'Yapışkan Sakız', i: '🍬', c: '#ff8fc8', d: 'En yakın rakip yere yapışır.' },
  simsek: { s: 'ŞİMŞEK', n: 'Şimşek', i: '⚡', c: '#ffe14a', d: 'Öndeki herkes çarpılır!' },
  yay: { s: 'YAY', n: 'Yaylı Ayakkabı', i: '🦘', c: '#2bff88', d: '5 saniye süper zıplama.' }
};

NS.art = {
  TAU, mix, shade, rgba, ball, blob, limb, poly, rrect, star, heart, ballGrad,
  SP, WORLD, RAINBOW, POWERS, FONT,
  computePose, drawChar, headIcon, drawSky, drawSeg, drawPit, drawPlat, drawBlock, drawHaz, drawDeco, drawCoin, drawBox, drawBanana, drawFlag, drawGate, layers
};
})(typeof window !== 'undefined' ? window : globalThis);
