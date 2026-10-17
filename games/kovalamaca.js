/* =========================================================================
   KOVALAMACA — gerçek zamanlı, üstten görünümlü ebelemece partisi
     · Modlar: Ebelemece · Sıcak Patates · Dondurmaca
     · Yöneten cihaz (yerel ya da oda kurucusu): kurallar, botlar, dokunma
       doğrulaması, güçlendirmeler ve gizli bomba fitili
     · Her cihaz kendi karakterini yerelde simüle eder (duvar çarpışması, buz
       fiziği) ve konumunu hızlı kanaldan (ui.fast, ~10/sn) yayar; diğer
       oyuncular ara değerlemeyle (interpolation) yumuşakça çizilir.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, flash, initial } = window.CFX;

/* ------------------------------------------------------------------ sabitler ve yardımcılar */
const W = 1600, H = 1100, B = 40;            // dünya boyutu ve kenar bandı (çit/çalı)
const R = 22;                                // karakter yarıçapı
const TAG_R = 2 * R + 4, TAG_TOL = 58;       // dokunma mesafesi ve gecikme toleransı
const BASE = 235, EBE_K = 1.05, SPD_K = 1.45, BOT_RUN = .9, BOT_CHASE = .93;
const MAXV = BASE * EBE_K * SPD_K;
const TICK = 100, COUNT_MS = 3600, END_MS = 6500, NOBACK_MS = 2000, THAW_IMM = 1500, SHIELD_IMM = 1200;
const SPEED_MS = 4000, INV_MS = 3000, SLIP_MS = 1200, TP_D = 210, PICK_R = R + 18, BANANA_R = R + 12;
const FUSE_MIN = 20000, FUSE_MAX = 40000, REBOMB_MS = 2200;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pickR = arr => arr[Math.floor(Math.random() * arr.length)];
const shuf = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const lerpAng = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a + d * k; };
const optNum = (v, allowed, def) => { const n = parseInt(v, 10); return allowed.includes(n) ? n : def; };
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
const shade = (h, t) => /^#[0-9a-f]{6}$/i.test(h) ? (t < 0 ? mix(h, '#140a1e', -t) : mix(h, '#ffffff', t)) : h;

const MODES = {
  ebe: { name: 'Ebelemece', icon: '👑' },
  patates: { name: 'Sıcak Patates', icon: '💣' },
  dondurma: { name: 'Dondurmaca', icon: '❄️' }
};
const ITEMS = {
  hiz: { name: 'Hız Ayakkabısı', short: 'Hız', held: false, w: 1, col: '#ff4f6d' },
  gorunmez: { name: 'Görünmezlik', short: 'Görünmez', held: false, w: .8, col: '#b8c6ff' },
  muz: { name: 'Muz', short: 'Muz', held: true, w: 1, col: '#ffd84a' },
  kalkan: { name: 'Kalkan', short: 'Kalkan', held: false, w: .8, col: '#5aa2ff' },
  isin: { name: 'Işınlanma', short: 'Işınlan', held: true, w: .9, col: '#c77dff' }
};
const ITEM_IDS = Object.keys(ITEMS);
const ANIMALS = ['kedi', 'ayi', 'tavsan', 'kurbaga', 'tilki', 'panda', 'penguen', 'civciv'];
const ANIMAL_NAMES = { kedi: 'Kedi', ayi: 'Ayı', tavsan: 'Tavşan', kurbaga: 'Kurbağa', tilki: 'Tilki', panda: 'Panda', penguen: 'Penguen', civciv: 'Civciv' };

/* ------------------------------------------------------------------ çizim yardımcıları */
function rrPath(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const D = {
  circle(g, x, y, r, fill, stroke, lw) { g.beginPath(); g.arc(x, y, Math.max(.1, r), 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } },
  ell(g, x, y, rx, ry, fill, rot = 0, stroke, lw) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } },
  rr(g, x, y, w, h, r, fill, stroke, lw) { rrPath(g, x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } },
  shadow(g, x, y, rx, ry, a = .22) { g.fillStyle = `rgba(30,12,50,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); },
  flower(g, x, y, s, c) { g.fillStyle = c; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.beginPath(); g.arc(x + Math.cos(a) * s, y + Math.sin(a) * s, s * .75, 0, TAU); g.fill(); } D.circle(g, x, y, s * .55, '#ffb627'); },
  text(g, s, x, y, size, fill, stroke, font) { g.font = `${size}px ${font || '"Bungee","Arial Black","Segoe UI Black",sans-serif'}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if (stroke) { g.lineWidth = size * .22; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(s, x, y); } g.fillStyle = fill; g.fillText(s, x, y); },
  glow(g, x, y, r, col) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
};
function smoothPath(g, pts, closed) {
  g.beginPath();
  const n = pts.length, P = i => pts[closed ? (i + n) % n : clamp(i, 0, n - 1)];
  g.moveTo(P(0)[0], P(0)[1]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) g.closePath();
}
function fence(g, post, rail, base) {
  g.fillStyle = base; g.fillRect(0, 0, W, B); g.fillRect(0, H - B, W, B); g.fillRect(0, 0, B, H); g.fillRect(W - B, 0, B, H);
  g.fillStyle = rail; g.fillRect(6, 16, W - 12, 6); g.fillRect(6, H - 22, W - 12, 6); g.fillRect(16, 6, 6, H - 12); g.fillRect(W - 22, 6, 6, H - 12);
  for (let x = 10; x < W - 10; x += 22) { D.rr(g, x, 6, 12, 28, 5, post, shade(post, -.3), 1.5); D.rr(g, x, H - 34, 12, 28, 5, post, shade(post, -.3), 1.5); }
  for (let y = 34; y < H - 34; y += 22) { D.rr(g, 6, y, 28, 12, 5, post, shade(post, -.3), 1.5); D.rr(g, W - 34, y, 28, 12, 5, post, shade(post, -.3), 1.5); }
}

/* ---- 3/4 görünümlü süs eşyaları (y'ye göre oyuncularla sıralanır) ---- */
function drawTree(g, x, y, s, fade, t, seed) {
  D.shadow(g, x + 10 * s, y + 6, 46 * s, 16 * s, .25);
  D.rr(g, x - 8 * s, y - 36 * s, 16 * s, 40 * s, 6 * s, '#9a6237', '#5e3a1e', 2);
  g.save(); g.globalAlpha *= fade;
  const cy = y - 66 * s, sway = Math.sin(t / 900 + seed) * 1.5;
  const blobs = [[-26, 8, 30], [24, 10, 30], [0, -16, 36], [-14, 20, 28], [14, 22, 28]];
  blobs.forEach(([dx, dy, r]) => D.circle(g, x + dx * s + sway, cy + dy * s, r * s, '#2f8a3a'));
  blobs.forEach(([dx, dy, r]) => D.circle(g, x + dx * s - 4 * s + sway, cy + dy * s - 5 * s, r * s * .82, '#45a843'));
  blobs.forEach(([dx, dy, r]) => D.circle(g, x + dx * s - 9 * s + sway, cy + dy * s - 10 * s, r * s * .45, '#6cc957'));
  const r = mulberry(seed * 977 + 3);
  for (let i = 0; i < 6; i++) { const a = r() * TAU, d = r() * 34 * s; D.circle(g, x + Math.cos(a) * d + sway, cy + Math.sin(a) * d * .8, 4 * s, i % 2 ? '#ff5d6c' : '#ffd1e6', 'rgba(90,20,30,.4)', 1); }
  g.restore();
}
function drawPine(g, x, y, s, fade) {
  D.shadow(g, x + 8 * s, y + 5, 38 * s, 13 * s, .22);
  D.rr(g, x - 6 * s, y - 20 * s, 12 * s, 24 * s, 4, '#7a4a2a', '#4a2a14', 1.5);
  g.save(); g.globalAlpha *= fade;
  [[0, -18, 40, 34], [0, -48, 32, 30], [0, -76, 22, 26]].forEach(([dx, dy, w, h]) => {
    g.fillStyle = '#2f7d55'; g.beginPath(); g.moveTo(x - w * s, y + dy * s); g.lineTo(x, y + (dy - h - 10) * s); g.lineTo(x + w * s, y + dy * s); g.closePath(); g.fill();
    g.strokeStyle = '#1d5a3a'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x - w * .55 * s, y + (dy - h * .55) * s); g.lineTo(x, y + (dy - h - 10) * s); g.lineTo(x + w * .55 * s, y + (dy - h * .55) * s);
    g.quadraticCurveTo(x + w * .2 * s, y + (dy - h * .35) * s, x, y + (dy - h * .5) * s); g.quadraticCurveTo(x - w * .2 * s, y + (dy - h * .35) * s, x - w * .55 * s, y + (dy - h * .55) * s); g.fill();
  });
  g.restore();
}
function drawSnowman(g, x, y, t, fade) {
  D.shadow(g, x + 8, y + 8, 46, 15, .2);
  g.save(); g.globalAlpha *= fade;
  const ball = (cx, cy, r) => { const gr = g.createRadialGradient(cx - r * .35, cy - r * .4, r * .1, cx, cy, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#cfe0f2'); D.circle(g, cx, cy, r, gr, '#9fb8d6', 2); };
  ball(x, y - 4, 40); ball(x, y - 50, 29); ball(x, y - 86, 21);
  D.rr(g, x - 24, y - 70, 48, 9, 4, '#ff4f6d', '#a3243a', 1.5); D.rr(g, x + 8, y - 66, 10, 24, 3, '#ff4f6d', '#a3243a', 1.5);
  [-58, -46, -34].forEach(dy => D.circle(g, x, y + dy + 8, 3, '#2d2340'));
  D.circle(g, x - 7, y - 91, 2.8, '#2d2340'); D.circle(g, x + 7, y - 91, 2.8, '#2d2340');
  g.fillStyle = '#ff8a00'; g.beginPath(); g.moveTo(x - 2, y - 86); g.lineTo(x + 16, y - 82); g.lineTo(x - 2, y - 80); g.fill();
  g.strokeStyle = '#2d2340'; g.lineWidth = 2; g.beginPath(); g.arc(x, y - 82, 7, .3, Math.PI - .3); g.stroke();
  D.ell(g, x, y - 104, 20, 5, '#2d2340'); D.rr(g, x - 13, y - 126, 26, 22, 4, '#2d2340'); D.rr(g, x - 13, y - 110, 26, 5, 2, '#ff4f6d');
  g.strokeStyle = '#7a4a2a'; g.lineWidth = 3.5; g.lineCap = 'round';
  const w = Math.sin(t / 500) * 3;
  g.beginPath(); g.moveTo(x - 26, y - 52); g.lineTo(x - 50, y - 70 + w); g.moveTo(x - 42, y - 64 + w); g.lineTo(x - 48, y - 78 + w); g.stroke();
  g.beginPath(); g.moveTo(x + 26, y - 52); g.lineTo(x + 50, y - 66 - w); g.moveTo(x + 43, y - 62 - w); g.lineTo(x + 52, y - 74 - w); g.stroke();
  g.lineCap = 'butt';
  g.restore();
}
function drawSpringRider(g, x, y, t, col, kind) {
  D.shadow(g, x + 3, y + 4, 22, 8, .2);
  g.strokeStyle = '#7d8794'; g.lineWidth = 3;
  g.beginPath(); for (let i = 0; i <= 12; i++) { const yy = y - i * 1.6, xx = x + (i % 2 ? 5 : -5); i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke();
  const b = Math.sin(t / 380 + x) * 1.5;
  D.ell(g, x, y - 26 + b, 20, 15, col, 0, shade(col, -.35), 2.5);
  D.circle(g, x + 14, y - 40 + b, 11, col, shade(col, -.35), 2.5);
  D.circle(g, x + 17, y - 42 + b, 2.2, '#2d2340');
  if (kind === 'duck') { g.fillStyle = '#ff8a00'; g.beginPath(); g.moveTo(x + 23, y - 40 + b); g.lineTo(x + 32, y - 37 + b); g.lineTo(x + 23, y - 34 + b); g.fill(); }
  else { D.ell(g, x + 8, y - 50 + b, 4, 7, shade(col, -.2), -.4); D.rr(g, x - 22, y - 32 + b, 6, 14, 3, shade(col, -.3)); }
  D.ell(g, x - 4, y - 30 + b, 7, 4, shade(col, .4));
}
function drawTopiary(g, x, y, fade) {
  D.shadow(g, x + 6, y + 5, 28, 10, .22);
  D.rr(g, x - 16, y - 20, 32, 24, 6, '#d9734a', '#8a3a1a', 2); D.rr(g, x - 19, y - 23, 38, 7, 3, '#e9895e', '#8a3a1a', 1.5);
  g.save(); g.globalAlpha *= fade;
  D.rr(g, x - 3, y - 36, 6, 14, 2, '#7a4a2a');
  D.circle(g, x, y - 58, 27, '#2f7d3a', '#1d5a28', 2); D.circle(g, x - 6, y - 64, 18, '#45a043'); D.circle(g, x - 10, y - 69, 8, '#6cc957');
  [[-12, -48], [14, -60], [4, -78], [-18, -66]].forEach(([dx, dy]) => D.circle(g, x + dx, y + dy, 3, '#ff8fc8'));
  g.restore();
}

/* ------------------------------------------------------------------ HARİTALAR */
const MAPS = {};
/* ===================== OYUN PARKI ===================== */
MAPS.park = (() => {
  const trees = [[560, 210], [1010, 175], [150, 590], [1490, 600], [640, 935], [1000, 940], [1480, 985], [140, 985], [800, 315]];
  const riders = [[1062, 560, '#ffd84a', 'duck'], [520, 585, '#ff8fc8', 'horse']];
  const obs = [
    { k: 'r', x: 250, y: 190, w: 84, h: 250 },            // dikey kaydırak
    { k: 'r', x: 1170, y: 790, w: 260, h: 84 },           // yatay kaydırak
    { k: 'c', x: 390, y: 840, r: 66 },                    // atlıkarınca
    { k: 'r', x: 1106, y: 226, w: 26, h: 112 }, { k: 'r', x: 1424, y: 226, w: 26, h: 112 },   // salıncak ayakları
    { k: 'r', x: 1250, y: 520, w: 130, h: 36 },           // bank
    { k: 'r', x: 96, y: 340, w: 36, h: 120 }              // bank
  ].concat(trees.map(([x, y]) => ({ k: 'c', x, y, r: 30 }))).concat(riders.map(([x, y]) => ({ k: 'c', x, y, r: 20 })));
  return {
    id: 'park', name: 'Oyun Parkı', icon: '🛝', base: { sp: 1, dust: '#efe2bd' },
    zones: [{ k: 'rr', x: 600, y: 420, w: 400, h: 260, r: 46, sp: .72, dust: '#f3d98e', n: 'Kum havuzu' }],
    obs,
    spawns: [[180, 300], [420, 120], [1240, 120], [1515, 420], [1500, 760], [800, 1030], [260, 700], [1150, 1010]],
    center: [[800, 760], [880, 760]],
    props: trees.map(([x, y], i) => ({ x, y, fade: [60, 125], draw: (g, t, f) => drawTree(g, x, y, 1, f, t, i + 1) }))
      .concat(riders.map(([x, y, c, k]) => ({ x, y, fade: [30, 60], draw: (g, t) => drawSpringRider(g, x, y, t, c, k) }))),
    paint(g) {
      const r = mulberry(7);
      g.fillStyle = '#79c955'; g.fillRect(0, 0, W, H);
      g.save(); g.globalAlpha = .45; g.fillStyle = '#86d663';
      for (let x = -H; x < W; x += 130) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 65, 0); g.lineTo(x + 65 + H, H); g.lineTo(x + H, H); g.fill(); }
      g.restore();
      for (let i = 0; i < 700; i++) { const x = r() * W, y = r() * H; g.strokeStyle = r() < .5 ? '#5aa83e' : '#9be27a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x, y - 6); g.lineTo(x + 3, y); g.stroke(); }
      // yürüyüş yolu
      const loop = [[300, 560], [480, 330], [800, 380], [1120, 330], [1330, 640], [1120, 760], [800, 760], [480, 760]];
      g.lineJoin = 'round'; g.lineCap = 'round';
      smoothPath(g, loop, true); g.strokeStyle = '#d7b47a'; g.lineWidth = 84; g.stroke();
      smoothPath(g, loop, true); g.strokeStyle = '#ecd29c'; g.lineWidth = 70; g.stroke();
      [[[300, 560], [140, 760], [90, 1060]], [[1330, 640], [1450, 860], [1560, 1000]], [[800, 760], [800, 1060]], [[1120, 330], [1300, 120], [1400, 40]], [[480, 330], [380, 140], [300, 40]]].forEach(p => {
        smoothPath(g, p, false); g.strokeStyle = '#d7b47a'; g.lineWidth = 62; g.stroke(); smoothPath(g, p, false); g.strokeStyle = '#ecd29c'; g.lineWidth = 50; g.stroke();
      });
      g.lineCap = 'butt';
      // çiçek tarhları
      [[700, 180, 70, 26], [1300, 420, 54, 22], [180, 470, 30, 60], [1250, 1000, 70, 24], [560, 1010, 60, 22]].forEach(([x, y, rx, ry]) => {
        D.ell(g, x, y, rx + 6, ry + 6, '#6e4a2a'); D.ell(g, x, y, rx, ry, '#8a5c34');
        for (let i = 0; i < Math.round(rx * ry / 90); i++) { const a = r() * TAU, d = Math.sqrt(r()); D.flower(g, x + Math.cos(a) * d * rx * .85, y + Math.sin(a) * d * ry * .8, 4.5, pickRnd(r, ['#ff8fc8', '#fff27a', '#ffffff', '#c9a0ff', '#ff5d6c'])); }
      });
      for (let i = 0; i < 70; i++) D.flower(g, r() * (W - 100) + 50, r() * (H - 100) + 50, 3, pickRnd(r, ['#ffffff', '#fff27a', '#ffc2e0']));
      // kum havuzu
      D.rr(g, 588, 408, 424, 284, 52, '#b5743f', '#7a4a22', 3);
      for (let i = 0; i < 30; i++) { const a = i / 30; g.strokeStyle = 'rgba(80,40,10,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(600 + a * 400, 410); g.lineTo(600 + a * 400, 420); g.stroke(); g.beginPath(); g.moveTo(600 + a * 400, 680); g.lineTo(600 + a * 400, 690); g.stroke(); }
      D.rr(g, 600, 420, 400, 260, 46, '#f6dc95');
      for (let i = 0; i < 520; i++) D.circle(g, 610 + r() * 380, 430 + r() * 240, r() * 1.8 + .5, r() < .5 ? '#e7c773' : '#fff0c2');
      g.strokeStyle = 'rgba(200,160,80,.5)'; g.lineWidth = 3; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(800, 550, 40 + i * 26, .2 + i, 1.4 + i); g.stroke(); }
      // kumdan kale + kova
      D.shadow(g, 708, 512, 46, 12); D.rr(g, 670, 470, 76, 40, 6, '#e8c46a', '#b58a3a', 2);
      [[664, 452], [726, 452], [695, 440]].forEach(([x, y], i) => { D.rr(g, x, y, 26, i === 2 ? 34 : 26, 4, '#f0d080', '#b58a3a', 2); for (let k = 0; k < 3; k++) D.rr(g, x + 1 + k * 9, y - 6, 6, 7, 1, '#f0d080', '#b58a3a', 1.2); });
      g.strokeStyle = '#5b3a7a'; g.lineWidth = 2; g.beginPath(); g.moveTo(708, 440); g.lineTo(708, 420); g.stroke(); g.fillStyle = '#ff4f6d'; g.beginPath(); g.moveTo(708, 420); g.lineTo(724, 425); g.lineTo(708, 430); g.fill();
      D.shadow(g, 905, 628, 22, 8); D.rr(g, 890, 600, 30, 28, 6, '#3d9bff', '#1f5fb0', 2); D.ell(g, 905, 600, 15, 5, '#7fc4ff', 0, '#1f5fb0', 2);
      g.strokeStyle = '#ff4f6d'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(860, 640); g.lineTo(840, 600); g.stroke(); D.ell(g, 836, 594, 9, 6, '#ff4f6d', .5); g.lineCap = 'butt';
      // dikey kaydırak (250,190,84,250)
      D.shadow(g, 300, 448, 54, 14);
      D.rr(g, 252, 192, 80, 64, 8, '#3d6bff', '#1f3ca8', 3);               // platform
      for (let i = 0; i < 4; i++) D.rr(g, 258, 200 + i * 13, 68, 6, 2, '#6f94ff');
      D.rr(g, 262, 252, 60, 186, 26, '#ffd84a', '#c98a00', 3);              // kaydırma oluğu
      D.rr(g, 276, 258, 32, 170, 16, '#fff3a8');
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(286, 270); g.lineTo(286, 410); g.stroke();
      D.rr(g, 256, 170, 12, 30, 4, '#ff4f6d', '#a3243a', 2); D.rr(g, 316, 170, 12, 30, 4, '#ff4f6d', '#a3243a', 2);
      for (let i = 0; i < 3; i++) D.rr(g, 262, 174 + i * 9, 60, 4, 2, '#c2c8d2');
      // yatay kaydırak (1170,790,260,84)
      D.shadow(g, 1300, 882, 140, 14);
      D.rr(g, 1366, 792, 62, 80, 8, '#ff4f6d', '#a3243a', 3);
      for (let i = 0; i < 4; i++) D.rr(g, 1374 + i * 13, 798, 6, 68, 2, '#ff8fa3');
      D.rr(g, 1172, 802, 200, 60, 26, '#2bd9c0', '#138a7a', 3); D.rr(g, 1180, 816, 186, 32, 16, '#b4fff3');
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(1195, 826); g.lineTo(1350, 826); g.stroke();
      D.rr(g, 1432, 796, 26, 12, 4, '#ffd84a', '#b5891a', 2); D.rr(g, 1432, 856, 26, 12, 4, '#ffd84a', '#b5891a', 2);
      // salıncak ayakları + oturaklar
      [[1106, 226], [1424, 226]].forEach(([x, y]) => { D.shadow(g, x + 16, y + 116, 24, 8); D.rr(g, x, y, 26, 112, 8, '#b5743f', '#6e3f1a', 2.5); D.rr(g, x + 6, y + 8, 14, 96, 6, '#d18d55'); });
      [1200, 1278, 1356].forEach((x, i) => { D.shadow(g, x, 316, 22, 7); D.rr(g, x - 20, 298, 40, 12, 5, ['#ff4f6d', '#ffd84a', '#3d6bff'][i], 'rgba(0,0,0,.35)', 2); });
      // atlıkarınca tabanı
      D.shadow(g, 398, 852, 78, 22); D.circle(g, 390, 840, 70, '#c2c8d2', '#7d8794', 3);
      // banklar
      [[1250, 520, 130, 36, 0], [96, 340, 36, 120, 1]].forEach(([x, y, w, h, v]) => {
        D.shadow(g, x + w / 2 + 4, y + h / 2 + 8, w / 2 + 6, h / 2 + 4);
        for (let i = 0; i < 3; i++) v ? D.rr(g, x + i * 12, y, 10, h, 3, i % 2 ? '#c98a4f' : '#b5743f', '#6e3f1a', 1.5) : D.rr(g, x, y + i * 12, w, 10, 3, i % 2 ? '#c98a4f' : '#b5743f', '#6e3f1a', 1.5);
      });
      // ağaç dipleri
      trees.forEach(([x, y]) => D.circle(g, x, y, 34, 'rgba(70,120,40,.35)'));
      fence(g, '#fff4dc', '#d8b88a', '#5aa63d');
    },
    dyn(g, t) {   // dönen atlıkarınca
      const a = t / 1400, cx = 390, cy = 840;
      const cols = ['#ff4f6d', '#ffd84a', '#3d6bff', '#2bd9a0', '#ff9a3c', '#9b5cff'];
      for (let i = 0; i < 12; i++) { g.fillStyle = cols[i % 6]; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 62, a + i / 12 * TAU, a + (i + 1) / 12 * TAU); g.closePath(); g.fill(); }
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 62, 0, TAU); g.stroke();
      for (let i = 0; i < 4; i++) { const b = a + i / 4 * TAU; D.circle(g, cx + Math.cos(b) * 44, cy + Math.sin(b) * 44, 6, '#fff', '#7d8794', 2); }
      D.circle(g, cx, cy, 14, '#ffd84a', '#b5891a', 3);
    },
    top(g, t) {   // salıncak üst kirişi ve zincirler (oyuncuların üstünde)
      [1200, 1278, 1356].forEach((x, i) => { const sw = Math.sin(t / 600 + i * 1.7) * 4; g.strokeStyle = 'rgba(90,96,110,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 14, 246); g.lineTo(x - 16 + sw, 298); g.moveTo(x + 14, 246); g.lineTo(x + 16 + sw, 298); g.stroke(); });
      D.shadow(g, 1278, 262, 160, 6, .12);
      D.rr(g, 1104, 236, 348, 16, 8, '#ff7a3d', '#a3401a', 2.5); D.rr(g, 1110, 239, 336, 5, 3, '#ffb27a');
    }
  };
})();

/* ===================== BUZ PİSTİ ===================== */
MAPS.buz = (() => {
  const banks = [];
  [[470, 380, 1], [1130, 380, -1], [470, 720, 1], [1130, 720, -1]].forEach(([x, y, s], k) => {
    const v = k < 2 ? 1 : -1;
    banks.push({ k: 'c', x, y, r: 48, bank: 1 }, { k: 'c', x: x + 55 * s, y: y + 22 * v, r: 38, bank: 1 }, { k: 'c', x: x - 30 * s, y: y + 34 * v, r: 32, bank: 1 });
  });
  const pines = [[95, 95, 30], [1505, 95, 30], [95, 1005, 30], [1505, 1005, 30], [800, 88, 26], [800, 1012, 26], [88, 550, 26], [1512, 550, 26], [420, 92, 24], [1180, 1008, 24]];
  const obs = banks.concat([{ k: 'c', x: 800, y: 550, r: 42 }, { k: 'r', x: 178, y: 505, w: 30, h: 90 }, { k: 'r', x: 1392, y: 505, w: 30, h: 90 }])
    .concat(pines.map(([x, y, r]) => ({ k: 'c', x, y, r })));
  return {
    id: 'buz', name: 'Buz Pisti', icon: '⛸️', base: { sp: .9, dust: '#ffffff' },
    zones: [{ k: 'rr', x: 150, y: 150, w: 1300, h: 800, r: 130, sp: 1, ice: true, dust: '#e9fbff', n: 'Buz' }],
    obs, banks,
    spawns: [[300, 260], [800, 260], [1300, 260], [1300, 840], [800, 840], [300, 840], [300, 550], [1300, 550]],
    center: [[690, 550], [910, 550]],
    props: [{ x: 800, y: 550, fade: [44, 140], draw: (g, t, f) => drawSnowman(g, 800, 550, t, f) }]
      .concat(pines.map(([x, y, r]) => ({ x, y, fade: [44, 120], draw: (g, t, f) => drawPine(g, x, y, r / 28, f) }))),
    paint(g) {
      const r = mulberry(19);
      g.fillStyle = '#eef5ff'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 260; i++) D.ell(g, r() * W, r() * H, 20 + r() * 50, 8 + r() * 18, r() < .5 ? 'rgba(255,255,255,.8)' : 'rgba(200,220,245,.45)', r() * 3);
      // pist
      const gr = g.createLinearGradient(150, 150, 1450, 950); gr.addColorStop(0, '#b6e2ff'); gr.addColorStop(.5, '#d8f3ff'); gr.addColorStop(1, '#a9dcff');
      D.rr(g, 138, 138, 1324, 824, 140, '#ffffff', '#9cc8ea', 3);
      D.rr(g, 150, 150, 1300, 800, 130, gr);
      g.save(); rrPath(g, 150, 150, 1300, 800, 130); g.clip();
      g.globalAlpha = .35; g.fillStyle = '#ffffff';
      for (let x = -800; x < W; x += 220) { g.beginPath(); g.moveTo(x, 150); g.lineTo(x + 70, 150); g.lineTo(x + 870, 950); g.lineTo(x + 800, 950); g.fill(); }
      g.globalAlpha = 1;
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5;
      for (let i = 0; i < 90; i++) { const x = 160 + r() * 1280, y = 160 + r() * 780, rr = 40 + r() * 160, a = r() * TAU; g.beginPath(); g.arc(x, y, rr, a, a + .4 + r() * .8); g.stroke(); }
      g.fillStyle = 'rgba(255,93,115,.55)'; g.fillRect(795, 150, 10, 800);
      g.fillStyle = 'rgba(79,140,255,.45)'; g.fillRect(515, 150, 12, 800); g.fillRect(1073, 150, 12, 800);
      g.strokeStyle = 'rgba(79,140,255,.6)'; g.lineWidth = 5; g.beginPath(); g.arc(800, 550, 96, 0, TAU); g.stroke();
      [[330, 300], [1270, 300], [330, 800], [1270, 800]].forEach(([x, y]) => { g.strokeStyle = 'rgba(255,93,115,.5)'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 54, 0, TAU); g.stroke(); D.circle(g, x, y, 8, 'rgba(255,93,115,.6)'); });
      g.fillStyle = 'rgba(79,140,255,.25)'; g.beginPath(); g.arc(208, 550, 64, -Math.PI / 2, Math.PI / 2); g.fill(); g.beginPath(); g.arc(1392, 550, 64, Math.PI / 2, Math.PI * 1.5); g.fill();
      g.restore();
      // pist kenarı reklam şeritleri
      for (let i = 0; i < 26; i++) { const x = 290 + i * 40; g.fillStyle = i % 2 ? '#ff5d73' : '#4f8cff'; g.fillRect(x, 141, 26, 5); g.fillRect(x, 954, 26, 5); }
      // kalecik
      [[178, 505, 1], [1392, 505, -1]].forEach(([x, y]) => { D.shadow(g, x + 15, y + 96, 26, 7); D.rr(g, x, y, 30, 90, 6, 'rgba(255,255,255,.5)', '#ff3b5c', 4);
        g.strokeStyle = 'rgba(160,170,190,.7)'; g.lineWidth = 1; for (let k = 8; k < 90; k += 8) { g.beginPath(); g.moveTo(x + 3, y + k); g.lineTo(x + 27, y + k); g.stroke(); } for (let k = 8; k < 30; k += 8) { g.beginPath(); g.moveTo(x + k, y + 3); g.lineTo(x + k, y + 87); g.stroke(); } });
      // kar yığınları
      for (let i = 0; i < banks.length; i += 3) {
        const grp = banks.slice(i, i + 3);
        grp.forEach(o => D.shadow(g, o.x + 8, o.y + 12, o.r + 6, o.r * .45, .18));
        grp.forEach(o => { const gg = g.createRadialGradient(o.x - o.r * .4, o.y - o.r * .5, o.r * .15, o.x, o.y, o.r * 1.05); gg.addColorStop(0, '#ffffff'); gg.addColorStop(.7, '#eef6ff'); gg.addColorStop(1, '#c4d8ef'); D.circle(g, o.x, o.y, o.r, gg); });
        grp.forEach(o => { g.strokeStyle = 'rgba(140,170,210,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(o.x, o.y, o.r, .2, Math.PI * .9); g.stroke(); });
        grp.forEach(o => { for (let k = 0; k < 4; k++) { const a = r() * TAU, d = r() * o.r * .7; D.circle(g, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d, 1.6, '#ffffff'); } });
      }
      // kenar: kar duvarı ve buz sarkıtları
      g.fillStyle = '#dbe9fa'; g.fillRect(0, 0, W, B); g.fillRect(0, H - B, W, B); g.fillRect(0, 0, B, H); g.fillRect(W - B, 0, B, H);
      for (let x = 0; x < W; x += 34) { D.circle(g, x + 17, 20, 22, '#ffffff', '#b9cde6', 1.5); D.circle(g, x + 17, H - 20, 22, '#ffffff', '#b9cde6', 1.5); }
      for (let y = 34; y < H - 34; y += 34) { D.circle(g, 20, y + 17, 22, '#ffffff', '#b9cde6', 1.5); D.circle(g, W - 20, y + 17, 22, '#ffffff', '#b9cde6', 1.5); }
      for (let x = 50; x < W - 50; x += 46) { g.fillStyle = 'rgba(170,215,255,.9)'; g.beginPath(); g.moveTo(x, 40); g.lineTo(x + 8, 40); g.lineTo(x + 4, 52 + (x % 3) * 4); g.fill(); }
    },
    dyn(g, t) {   // pist parıltıları
      for (let i = 0; i < 14; i++) {
        const k = (t / 1700 + i * .37) % 1, x = 200 + ((i * 397) % 1200), y = 190 + ((i * 263) % 720), a = Math.sin(k * Math.PI);
        g.globalAlpha = a * .9; g.strokeStyle = '#ffffff'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x - 6 * a, y); g.lineTo(x + 6 * a, y); g.moveTo(x, y - 6 * a); g.lineTo(x, y + 6 * a); g.stroke();
      }
      g.globalAlpha = 1;
    }
  };
})();

/* ===================== LABİRENT BAHÇE ===================== */
MAPS.labirent = (() => {
  const C = 8, RW = 5, cw = (W - 2 * B) / C, ch = (H - 2 * B) / RW, T = 34;
  const rr = mulberry(20241017);
  const hW = Array.from({ length: RW + 1 }, () => Array(C).fill(true));
  const vW = Array.from({ length: C + 1 }, () => Array(RW).fill(true));
  const seen = Array.from({ length: RW }, () => Array(C).fill(false));
  const stack = [[0, 0]]; seen[0][0] = true;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy, dx, dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < C && y < RW && !seen[y][x]);
    if (!nb.length) { stack.pop(); continue; }
    const [nx, ny, dx, dy] = nb[Math.floor(rr() * nb.length)];
    if (dx === 1) vW[cx + 1][cy] = false; else if (dx === -1) vW[cx][cy] = false; else if (dy === 1) hW[cy + 1][cx] = false; else hW[cy][cx] = false;
    seen[ny][nx] = true; stack.push([nx, ny]);
  }
  // çıkmaz sokakları aç: kovalamaca için döngülü bir labirent
  for (let y = 0; y < RW; y++) for (let x = 0; x < C; x++) {
    const n = [hW[y][x], hW[y + 1][x], vW[x][y], vW[x + 1][y]].filter(Boolean).length; if (n < 3) continue;
    const o = [];
    if (y > 0 && hW[y][x]) o.push(() => { hW[y][x] = false; });
    if (y < RW - 1 && hW[y + 1][x]) o.push(() => { hW[y + 1][x] = false; });
    if (x > 0 && vW[x][y]) o.push(() => { vW[x][y] = false; });
    if (x < C - 1 && vW[x + 1][y]) o.push(() => { vW[x + 1][y] = false; });
    if (o.length) o[Math.floor(rr() * o.length)]();
  }
  for (let y = 1; y < RW; y++) for (let x = 0; x < C; x++) if (hW[y][x] && rr() < .16) hW[y][x] = false;
  for (let x = 1; x < C; x++) for (let y = 0; y < RW; y++) if (vW[x][y] && rr() < .16) vW[x][y] = false;
  vW[4][1] = vW[4][2] = vW[4][3] = false; hW[2][3] = hW[2][4] = hW[3][3] = hW[3][4] = false;   // fıskiyeli orta avlu
  const hedges = [];
  for (let y = 1; y < RW; y++) for (let x = 0; x < C; x++) if (hW[y][x]) hedges.push({ k: 'r', x: B + x * cw - T / 2, y: B + y * ch - T / 2, w: cw + T, h: T });
  for (let x = 1; x < C; x++) for (let y = 0; y < RW; y++) if (vW[x][y]) hedges.push({ k: 'r', x: B + x * cw - T / 2, y: B + y * ch - T / 2, w: T, h: ch + T });
  const cc = (x, y) => [B + (x + .5) * cw, B + (y + .5) * ch];
  const tops = [cc(1, 1), cc(6, 1), cc(1, 3), cc(6, 3)].map(([x, y]) => [x, y + 14]);
  const obs = hedges.concat([{ k: 'c', x: 800, y: 550, r: 48 }]).concat(tops.map(([x, y]) => ({ k: 'c', x, y, r: 22 })));
  return {
    id: 'labirent', name: 'Labirent Bahçe', icon: '🌿', base: { sp: 1, dust: '#efe3c4' }, zones: [], obs, hedges,
    spawns: [cc(0, 0), cc(7, 0), cc(0, 4), cc(7, 4), cc(2, 2), cc(5, 2), cc(3, 0), cc(4, 4)],
    center: [cc(3, 2), cc(4, 2)],
    props: tops.map(([x, y]) => ({ x, y, fade: [36, 100], draw: (g, t, f) => drawTopiary(g, x, y, f) })),
    paint(g) {
      const r = mulberry(33);
      g.fillStyle = '#e8dcbc'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 2600; i++) D.circle(g, r() * W, r() * H, r() * 2 + .6, pickRnd(r, ['#d6c79f', '#f4ead0', '#cbb98c', '#efe3c4']));
      // hücre içi küçük çimen adacıkları ve çiçekler
      for (let y = 0; y < RW; y++) for (let x = 0; x < C; x++) {
        if (r() < .5 || (x >= 3 && x <= 4 && y >= 1 && y <= 3)) continue;
        const [cx, cy] = cc(x, y), ox = (r() - .5) * 60, oy = (r() - .5) * 60;
        D.ell(g, cx + ox, cy + oy, 34, 20, 'rgba(120,190,90,.55)');
        for (let k = 0; k < 6; k++) D.flower(g, cx + ox + (r() - .5) * 50, cy + oy + (r() - .5) * 26, 3.4, pickRnd(r, ['#ff8fc8', '#fff27a', '#ffffff', '#c9a0ff']));
      }
      // avlu taşları
      D.circle(g, 800, 550, 150, 'rgba(255,255,255,.35)');
      for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; D.rr(g, 800 + Math.cos(a) * 118 - 10, 550 + Math.sin(a) * 118 - 7, 20, 14, 4, i % 2 ? '#d9cfb6' : '#cbbf9f'); }
      // fıskiye havuzu
      D.shadow(g, 806, 562, 62, 20);
      D.circle(g, 800, 550, 56, '#cfd6de', '#8f99a6', 3); D.circle(g, 800, 550, 46, '#5fb8f0');
      D.circle(g, 800, 550, 14, '#e7ebf1', '#8f99a6', 2);
      // çalılar
      const allH = hedges.concat([{ x: 0, y: 0, w: W, h: B }, { x: 0, y: H - B, w: W, h: B }, { x: 0, y: 0, w: B, h: H }, { x: W - B, y: 0, w: B, h: H }]);
      allH.forEach(o => D.rr(g, o.x + 4, o.y + 9, o.w, o.h, 14, 'rgba(40,30,20,.25)'));
      allH.forEach(o => D.rr(g, o.x, o.y, o.w, o.h, 14, '#2d7a37'));
      allH.forEach(o => D.rr(g, o.x + 3, o.y + 2, o.w - 6, o.h - 9, 12, '#3f9a44'));
      allH.forEach(o => {
        const n = Math.round((o.w * o.h) / 260);
        for (let i = 0; i < n; i++) { const x = o.x + 6 + r() * (o.w - 12), y = o.y + 5 + r() * (o.h - 16); D.circle(g, x, y, 4 + r() * 4, r() < .5 ? '#4fae4a' : '#58b852'); }
        for (let i = 0; i < n / 7; i++) D.circle(g, o.x + 6 + r() * (o.w - 12), o.y + 5 + r() * (o.h - 16), 2.6, pickRnd(r, ['#ff8fc8', '#ffffff', '#fff27a']));
      });
    },
    dyn(g, t) {   // fıskiye
      for (let i = 0; i < 3; i++) { const k = ((t / 1600) + i / 3) % 1; g.strokeStyle = `rgba(255,255,255,${.6 * (1 - k)})`; g.lineWidth = 2; g.beginPath(); g.arc(800, 550, 16 + k * 28, 0, TAU); g.stroke(); }
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t / 3000; g.strokeStyle = 'rgba(220,245,255,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(800, 548); g.quadraticCurveTo(800 + Math.cos(a) * 18, 526 + Math.sin(a) * 6, 800 + Math.cos(a) * 34, 550 + Math.sin(a) * 26); g.stroke(); }
    }
  };
})();
function pickRnd(r, arr) { return arr[Math.floor(r() * arr.length)]; }
const MAP_IDS = Object.keys(MAPS);

/* ------------------------------------------------------------------ fizik: çarpışma, bölgeler, hareket */
function obsPush(o, x, y, r) {
  if (o.k === 'c') { const dx = x - o.x, dy = y - o.y, d = Math.hypot(dx, dy), m = r + o.r; if (d >= m) return null; if (d < 1e-6) return [1, 0, m]; return [dx / d, dy / d, m - d]; }
  const cx = clamp(x, o.x, o.x + o.w), cy = clamp(y, o.y, o.y + o.h), dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 > 1e-9) { const d = Math.sqrt(d2); return [dx / d, dy / d, r - d]; }
  const l = x - o.x, rt = o.x + o.w - x, t = y - o.y, bt = o.y + o.h - y, m = Math.min(l, rt, t, bt);
  if (m === l) return [-1, 0, l + r]; if (m === rt) return [1, 0, rt + r]; if (m === t) return [0, -1, t + r]; return [0, 1, bt + r];
}
function circleFree(map, x, y, r) {
  if (x < B + r || x > W - B - r || y < B + r || y > H - B - r) return false;
  for (const o of map.obs) if (obsPush(o, x, y, r)) return false;
  return true;
}
function inZone(z, x, y) {
  if (x < z.x || x > z.x + z.w || y < z.y || y > z.y + z.h) return false;
  if (z.k !== 'rr') return true;
  const cx = clamp(x, z.x + z.r, z.x + z.w - z.r), cy = clamp(y, z.y + z.r, z.y + z.h - z.r);
  return Math.hypot(x - cx, y - cy) <= z.r;
}
function zoneAt(map, x, y) { for (const z of map.zones) if (inZone(z, x, y)) return z; return map.base; }
function collide(map, b, bounce) {
  for (let it = 0; it < 3; it++) {
    let hit = false;
    for (const o of map.obs) {
      const p = obsPush(o, b.x, b.y, R); if (!p) continue;
      hit = true; b.x += p[0] * p[2]; b.y += p[1] * p[2];
      const vn = b.vx * p[0] + b.vy * p[1];
      if (vn < 0) { b.vx -= (1 + bounce) * vn * p[0]; b.vy -= (1 + bounce) * vn * p[1]; }
    }
    if (b.x < B + R) { b.x = B + R; if (b.vx < 0) b.vx = -b.vx * bounce; hit = true; }
    if (b.x > W - B - R) { b.x = W - B - R; if (b.vx > 0) b.vx = -b.vx * bounce; hit = true; }
    if (b.y < B + R) { b.y = B + R; if (b.vy < 0) b.vy = -b.vy * bounce; hit = true; }
    if (b.y > H - B - R) { b.y = H - B - R; if (b.vy > 0) b.vy = -b.vy * bounce; hit = true; }
    if (!hit) break;
  }
}
// Ortak hareket adımı (yerel oyuncu ve botlar): buzda düşük tutunma, muzda kayma
function moveBody(map, b, ix, iy, spd, dt, slip) {
  const z = zoneAt(map, b.x, b.y), ice = !!z.ice;
  const tr = slip ? (ice ? .35 : .9) : ice ? 2.3 : 15;
  const s = spd * z.sp, k = 1 - Math.exp(-tr * dt);
  b.vx += (ix * s - b.vx) * k; b.vy += (iy * s - b.vy) * k;
  const sp = Math.hypot(b.vx, b.vy), n = Math.max(1, Math.ceil(sp * dt / 10));
  for (let i = 0; i < n; i++) { b.x += b.vx * dt / n; b.y += b.vy * dt / n; collide(map, b, ice || slip ? .55 : 0); }
}
// Işınlanma: bakılan yönde en uzak boş nokta (ince çalıların üstünden atlayabilir)
function dashTarget(map, x, y, h) {
  const c = Math.cos(h), s = Math.sin(h);
  for (let d = TP_D; d >= 30; d -= 10) { const tx = Math.round(x + c * d), ty = Math.round(y + s * d); if (circleFree(map, tx, ty, R)) return [tx, ty]; }
  return [Math.round(x), Math.round(y)];
}

/* ------------------------------------------------------------------ yol bulma (botlar) */
const NC = 25, NX = Math.ceil(W / NC), NY = Math.ceil(H / NC), NN = NX * NY;
const navCache = {};
function navOf(id) {
  if (navCache[id]) return navCache[id];
  const map = MAPS[id], walk = new Uint8Array(NN), open = new Uint8Array(NN);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) walk[j * NX + i] = circleFree(map, (i + .5) * NC, (j + .5) * NC, R + 3) ? 1 : 0;
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    let n = 0; for (let b = -3; b <= 3; b++) for (let a = -3; a <= 3; a++) { const x = i + a, y = j + b; if (x >= 0 && y >= 0 && x < NX && y < NY && walk[y * NX + x]) n++; }
    open[j * NX + i] = n;
  }
  return (navCache[id] = { walk, open });
}
function cellOf(nav, x, y) {
  const i0 = clamp(Math.floor(x / NC), 0, NX - 1), j0 = clamp(Math.floor(y / NC), 0, NY - 1), c0 = j0 * NX + i0;
  if (nav.walk[c0]) return c0;
  let best = -1, bd = 1e9;
  for (let rad = 1; rad <= 4 && best < 0; rad++) for (let b = -rad; b <= rad; b++) for (let a = -rad; a <= rad; a++) {
    if (Math.max(Math.abs(a), Math.abs(b)) !== rad) continue;
    const i = i0 + a, j = j0 + b; if (i < 0 || j < 0 || i >= NX || j >= NY || !nav.walk[j * NX + i]) continue;
    const d = dist(x, y, (i + .5) * NC, (j + .5) * NC); if (d < bd) { bd = d; best = j * NX + i; }
  }
  return best;
}
const cx_ = c => (c % NX + .5) * NC, cy_ = c => (Math.floor(c / NX) + .5) * NC;
const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function bfs(nav, srcs) {
  const d = new Int16Array(NN).fill(-1), par = new Int32Array(NN).fill(-1), qu = new Int32Array(NN);
  let h = 0, t = 0;
  for (const s of srcs) if (s >= 0 && d[s] < 0) { d[s] = 0; qu[t++] = s; }
  while (h < t) {
    const c = qu[h++], i = c % NX, j = (c - i) / NX;
    for (const [a, b] of N8) {
      const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= NX || y >= NY) continue;
      const n = y * NX + x; if (!nav.walk[n] || d[n] >= 0) continue;
      if (a && b && (!nav.walk[j * NX + x] || !nav.walk[y * NX + i])) continue;
      d[n] = d[c] + 1; par[n] = c; qu[t++] = n;
    }
  }
  return { d, par };
}
function pathTo(f, tc) { const out = []; let c = tc, k = 0; while (c >= 0 && k++ < NN) { out.push([cx_(c), cy_(c)]); if (f.d[c] === 0) break; c = f.par[c]; } out.reverse(); return out.slice(1, 60); }
function los(nav, x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1), n = Math.ceil(d / (NC * .5));
  for (let k = 1; k <= n; k++) {
    const u = k / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
    if (u * d < 18) continue;
    const i = Math.floor(x / NC), j = Math.floor(y / NC);
    if (i < 0 || j < 0 || i >= NX || j >= NY || !nav.walk[j * NX + i]) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ KURALLAR (yöneten cihaz) */
let uiRef = null;
function fastOut(o) { if (uiRef && uiRef.fast && uiRef.mode === 'online') { try { uiRef.fast(o); } catch { /* */ } } }
const pname = (st, i) => (st.players[i] ? st.players[i].name : '?');
const isChaser = (st, i) => (st.mode === 'dondurma' ? st.ebes.includes(i) : st.it === i);
const chasers = st => (st.mode === 'dondurma' ? st.ebes.slice() : (st.it >= 0 ? [st.it] : []));
function setPhase(st, ph, ms) { st.phase = ph; st.endsAt = Date.now() + ms; st.phaseDur = Math.max(1, ms); }
function newBot() { return { vx: 0, vy: 0, wp: null, re: 0, mode: 'idle', tgt: -1, w: null, wAt: 0, sx: 0, sy: 0, sAt: 0, jit: null, jitUntil: 0, fear: Math.round(rnd(320, 470)), useAt: 0, hold: 0 }; }
function bumpBots(st) { Object.keys(st.bot).forEach(k => { st.bot[k].re = 0; }); }

function chooseRoles(st, k) {
  const n = st.players.length, idx = [...Array(n).keys()];
  const on = idx.filter(i => st.online[i] !== false);
  const pool = shuf(on.length >= k ? on : idx).sort((a, b) => st.roleCount[a] - st.roleCount[b]);
  return pool.slice(0, Math.min(k, n - 1));
}
function startRound(st, ctx) {
  const n = st.players.length;
  st.round++;
  let mid = st.mapOpt; if (!MAPS[mid]) { const pool = MAP_IDS.filter(m => m !== st.mapId); mid = pickR(pool.length ? pool : MAP_IDS); }
  st.mapId = mid;
  const map = MAPS[mid];
  st.frozen = Array(n).fill(false); st.out = Array(n).fill(false); st.outAt = Array(n).fill(0); st.imm = Array(n).fill(0);
  st.fx = Array.from({ length: n }, () => ({ spd: 0, inv: 0, sh: false, slip: 0, item: null }));
  st.ebeMs = Array(n).fill(0); st.stats = Array.from({ length: n }, () => ({ tg: 0, fr: 0, rs: 0, pk: 0 }));
  st.items = []; st.bananas = []; st.noBack = null; st.sudden = false; st.it = -1; st.ebes = []; st.fuseAt = 0; st.nextBombAt = 0; st.last = null;
  const roles = chooseRoles(st, st.mode === 'dondurma' ? (n >= 5 ? 2 : 1) : 1);
  roles.forEach(pi => { st.roleCount[pi]++; });
  if (st.mode === 'dondurma') st.ebes = roles; else st.it = roles[0];
  const sp = shuf(map.spawns), cen = map.center; let k = 0;
  const midX = W / 2, midY = H / 2;
  st.pos = st.players.map((_, i) => {
    const ri = roles.indexOf(i), s = ri >= 0 ? cen[ri % cen.length] : sp[k++ % sp.length];
    return { x: s[0], y: s[1], h: +Math.atan2(midY - s[1], midX - s[0]).toFixed(2), m: 0, t: Date.now() };
  });
  st.bot = {}; st.players.forEach((p, i) => { if (p.isBot) st.bot[i] = newBot(); });
  st.spawnVer++;
  setPhase(st, 'count', COUNT_MS);
  const who = st.mode === 'dondurma' ? `Dondurucu: ${roles.map(i => pname(st, i)).join(', ')}` : st.mode === 'ebe' ? `Ebe: ${pname(st, st.it)}` : `Bomba: ${pname(st, st.it)}`;
  ctx.emit({ t: 'round', round: st.round }, `Tur ${st.round}/${st.rounds} · ${map.name} · ${who}`, 'gold');
  ctx.sync();
}
function startPlay(st, ctx) {
  const now = Date.now();
  setPhase(st, 'play', st.dur * 1000); st.playAt = now;
  if (st.mode === 'ebe') st.itSince = now;
  if (st.mode === 'patates') st.fuseAt = now + rnd(FUSE_MIN, FUSE_MAX);
  st.nextItemAt = now + rnd(2000, 4000);
  st.pos.forEach(p => { p.t = now; });
  ctx.emit({ t: 'go' }, 'KOŞ! Tur başladı.');
}
function allFrozen(st) { const run = st.players.map((_, i) => i).filter(i => !st.ebes.includes(i)); return run.length > 0 && run.every(i => st.frozen[i]); }
function alive(st) { return st.players.map((_, i) => i).filter(i => !st.out[i]); }

function shieldBlock(st, a, b, ctx) {
  const f = st.fx[b]; if (!f.sh) return false;
  f.sh = false; st.imm[b] = Date.now() + SHIELD_IMM;
  const pa = st.pos[a], pb = st.pos[b];
  ctx.emit({ t: 'shield', a, b, x: Math.round((pa.x + pb.x) / 2), y: Math.round((pa.y + pb.y) / 2) }, `🛡️ ${pname(st, b)} kalkanla korundu!`);
  return true;
}
// a, b'ye dokundu: moda göre anlamı yöneten cihaz belirler
function touch(st, a, b, ctx) {
  if (a === b || st.phase !== 'play' || st.out[a] || st.out[b]) return false;
  const now = Date.now(), pa = st.pos[a], pb = st.pos[b], mx = Math.round((pa.x + pb.x) / 2), my = Math.round((pa.y + pb.y) / 2);
  if (st.mode === 'dondurma') {
    const ae = st.ebes.includes(a), be = st.ebes.includes(b);
    if (ae && !be && !st.frozen[b]) {
      if (st.imm[b] > now) return false;
      if (shieldBlock(st, a, b, ctx)) return true;
      st.frozen[b] = true; st.stats[a].fr++; st.pos[b] = { x: pb.x, y: pb.y, h: pb.h, m: 0, t: now };
      if (st.bot[b]) { st.bot[b].vx = st.bot[b].vy = 0; }
      ctx.emit({ t: 'tag', kind: 'freeze', a, b, x: mx, y: my }, `❄️ ${pname(st, b)} dondu! (${pname(st, a)})`);
      bumpBots(st);
      if (allFrozen(st)) endRound(st, ctx, 'frozen');
      return true;
    }
    if (!ae && !be && !st.frozen[a] && st.frozen[b]) {
      st.frozen[b] = false; st.imm[b] = now + THAW_IMM; st.stats[a].rs++; st.pos[b].t = now;
      ctx.emit({ t: 'tag', kind: 'thaw', a, b, x: mx, y: my }, `🤝 ${pname(st, b)} çözüldü! (kurtaran ${pname(st, a)})`, 'good');
      bumpBots(st);
      return true;
    }
    return false;
  }
  if (st.it !== a) return false;
  if (st.imm[b] > now) return false;
  const nb = st.noBack; if (nb && nb.a === a && nb.b === b && nb.until > now) return false;
  if (shieldBlock(st, a, b, ctx)) return true;
  if (st.mode === 'ebe') { st.ebeMs[a] += now - st.itSince; st.itSince = now; }
  st.it = b; st.noBack = { a: b, b: a, until: now + NOBACK_MS }; st.stats[a].tg++;
  ctx.emit({ t: 'tag', kind: st.mode === 'ebe' ? 'ebe' : 'pass', a, b, x: mx, y: my },
    st.mode === 'ebe' ? `👑 TOP! ${pname(st, a)} → ${pname(st, b)}. Yeni Ebe: ${pname(st, b)}` : `💣 Bomba geçti: ${pname(st, a)} → ${pname(st, b)}`);
  bumpBots(st);
  return true;
}
// İstemcinin "dokundum" iddiası: son bildirilen konumlarla, gecikme toleransıyla doğrulanır
function claimTouch(st, a, b, x, y, ctx) {
  if (st.phase !== 'play' || !Number.isInteger(b) || b < 0 || b >= st.players.length || b === a) return false;
  const now = Date.now(), pa = st.pos[a];
  if (Number.isFinite(x) && Number.isFinite(y) && !st.players[a].isBot && !st.frozen[a] && !st.out[a]) {
    const maxd = MAXV * clamp((now - pa.t) / 1000, 0, 1.5) * 1.35 + 60;
    if (dist(x, y, pa.x, pa.y) <= maxd) st.pos[a] = { x, y, h: pa.h, m: pa.m, t: now };
  }
  const p1 = st.pos[a], p2 = st.pos[b];
  if (dist(p1.x, p1.y, p2.x, p2.y) > TAG_R + TAG_TOL) return false;
  return touch(st, a, b, ctx);
}
// Hızlı kanaldan gelen konum: hız sınırıyla kaydedilir
function applyPos(st, pi, x, y, h, m) {
  if (st.phase !== 'play' || !st.players[pi] || st.players[pi].isBot || st.frozen[pi] || st.out[pi]) return false;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const p = st.pos[pi], now = Date.now(), maxd = MAXV * clamp((now - p.t) / 1000, 0, 1.5) * 1.35 + 60, d = dist(x, y, p.x, p.y);
  if (d > maxd) { const k = maxd / d; x = p.x + (x - p.x) * k; y = p.y + (y - p.y) * k; }
  st.pos[pi] = { x: Math.round(clamp(x, B + R, W - B - R)), y: Math.round(clamp(y, B + R, H - B - R)), h: Number.isFinite(h) ? +h.toFixed(2) : p.h, m: m ? 1 : 0, t: now };
  return true;
}
function hostPosIn(seat, x, y, h, m, cid) {
  const R0 = window.CFX && window.CFX.Room, g = R0 && R0.game;
  if (!g || !g.state || g.def.id !== 'kovalamaca' || !R0.isRunner() || g.result) return;
  if (cid !== undefined && (!g.players[seat] || g.players[seat].cid !== cid)) return;
  applyPos(g.state, seat, x, y, h, m);
}
function useItem(st, pi, a, ctx) {
  const f = st.fx[pi], now = Date.now();
  if (st.phase !== 'play' || !f || !f.item || st.out[pi] || st.frozen[pi]) return false;
  const p = st.pos[pi], map = MAPS[st.mapId], hh = Number.isFinite(+a.h) ? +a.h : p.h;
  if (f.item === 'muz') {
    let bx = p.x - Math.cos(hh) * 34, by = p.y - Math.sin(hh) * 34;
    if (!circleFree(map, bx, by, 10)) { bx = p.x; by = p.y; }
    st.bananas.push({ id: ++st.idc, x: Math.round(bx), y: Math.round(by), by: pi, armAt: now + 600 });
    if (st.bananas.length > 8) st.bananas.shift();
    f.item = null;
    ctx.emit({ t: 'use', k: 'muz', pi, x: Math.round(bx), y: Math.round(by) }, `🍌 ${pname(st, pi)} yere muz kabuğu attı!`);
  } else if (f.item === 'isin') {
    let tx, ty;
    if (st.players[pi].isBot || !Number.isFinite(+a.x) || !Number.isFinite(+a.y)) [tx, ty] = dashTarget(map, p.x, p.y, hh);
    else { tx = Math.round(+a.x); ty = Math.round(+a.y); if (dist(tx, ty, p.x, p.y) > TP_D + 90 || !circleFree(map, tx, ty, R - 4)) return false; }
    const x0 = Math.round(p.x), y0 = Math.round(p.y);
    st.pos[pi] = { x: tx, y: ty, h: +hh.toFixed(2), m: 1, t: now };
    if (st.bot[pi]) { st.bot[pi].re = 0; st.bot[pi].wp = null; }
    f.item = null;
    ctx.emit({ t: 'use', k: 'isin', pi, x0, y0, x: tx, y: ty }, `✨ ${pname(st, pi)} ışınlandı!`);
  } else return false;
  ctx.sync();
  return true;
}
function spawnItems(st, now) {
  if (!st.pu || now < st.nextItemAt) return false;
  st.nextItemAt = now + rnd(4500, 7500);
  if (st.items.length >= 2 + Math.ceil(st.players.length / 3)) return false;
  const nav = navOf(st.mapId);
  for (let t = 0; t < 60; t++) {
    const c = Math.floor(Math.random() * NN); if (!nav.walk[c] || nav.open[c] < 22) continue;
    const x = Math.round(cx_(c)), y = Math.round(cy_(c));
    if (st.pos.some(p => dist(p.x, p.y, x, y) < 170) || st.items.some(o => dist(o.x, o.y, x, y) < 230)) continue;
    const tot = ITEM_IDS.reduce((s, k) => s + ITEMS[k].w, 0); let rr = Math.random() * tot, k = ITEM_IDS[0];
    for (const id of ITEM_IDS) { rr -= ITEMS[id].w; if (rr <= 0) { k = id; break; } }
    st.items.push({ id: ++st.idc, k, x, y });
    return true;
  }
  return false;
}
function pickups(st, now, ctx) {
  let any = false;
  for (let k = st.items.length - 1; k >= 0; k--) {
    const it = st.items[k];
    for (let i = 0; i < st.players.length; i++) {
      if (st.out[i] || st.frozen[i]) continue;
      const p = st.pos[i]; if (dist(p.x, p.y, it.x, it.y) > PICK_R) continue;
      const f = st.fx[i]; if (ITEMS[it.k].held && f.item) continue;
      if (it.k === 'hiz') f.spd = now + SPEED_MS; else if (it.k === 'gorunmez') f.inv = now + INV_MS; else if (it.k === 'kalkan') f.sh = true; else f.item = it.k;
      st.stats[i].pk++;
      st.items.splice(k, 1); any = true;
      ctx.emit({ t: 'pick', pi: i, k: it.k, x: it.x, y: it.y }, `${pname(st, i)}: ${ITEMS[it.k].name}!`);
      if (st.bot[i]) st.bot[i].re = 0;
      break;
    }
  }
  return any;
}
function bananaCheck(st, now, ctx) {
  let any = false;
  for (let k = st.bananas.length - 1; k >= 0; k--) {
    const bn = st.bananas[k]; if (bn.armAt > now) continue;
    for (let i = 0; i < st.players.length; i++) {
      if (st.out[i] || st.frozen[i] || st.fx[i].slip > now) continue;
      const p = st.pos[i]; if (dist(p.x, p.y, bn.x, bn.y) > BANANA_R) continue;
      st.fx[i].slip = now + SLIP_MS; st.bananas.splice(k, 1); any = true;
      const b = st.bot[i]; if (b) { const s = Math.hypot(b.vx, b.vy) || 1; b.vx = b.vx / s * Math.max(s, 160); b.vy = b.vy / s * Math.max(s, 160); }
      ctx.emit({ t: 'slip', pi: i, x: bn.x, y: bn.y }, `🍌 ${pname(st, i)} muza bastı, kaydı!`);
      break;
    }
  }
  return any;
}
function autoTouch(st, ctx) {
  let any = false; const n = st.players.length;
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
    if (a === b || st.phase !== 'play') continue;
    const pa = st.pos[a], pb = st.pos[b];
    if (dist(pa.x, pa.y, pb.x, pb.y) > TAG_R) continue;
    if (touch(st, a, b, ctx)) { any = true; if (st.mode !== 'dondurma') return true; }
  }
  return any;
}
function giveBomb(st, ctx) {
  const al = alive(st); if (al.length <= 1) { endRound(st, ctx, 'last'); return; }
  const on = al.filter(i => st.online[i] !== false), pi = pickR(on.length ? on : al), now = Date.now();
  st.it = pi; st.noBack = null; st.fuseAt = now + (st.sudden ? rnd(3500, 6500) : rnd(FUSE_MIN, FUSE_MAX));
  ctx.emit({ t: 'bomb', pi }, `💣 Yeni bomba: ${pname(st, pi)}!`, 'gold');
  bumpBots(st);
}
function explode(st, ctx) {
  const pi = st.it, now = Date.now(), p = st.pos[pi];
  st.out[pi] = true; st.outAt[pi] = now; st.it = -1; st.noBack = null; st.fx[pi].item = null; st.fx[pi].sh = false;
  if (st.bot[pi]) { st.bot[pi].vx = st.bot[pi].vy = 0; }
  st.pos[pi] = { x: p.x, y: p.y, h: p.h, m: 0, t: now };
  ctx.emit({ t: 'boom', pi, x: Math.round(p.x), y: Math.round(p.y) }, `💥 PUF! Bomba ${pname(st, pi)} elindeyken patladı — elendi!`, 'bad');
  bumpBots(st);
  if (alive(st).length <= 1) { endRound(st, ctx, 'last'); return; }
  st.nextBombAt = now + REBOMB_MS;
}
function bombTick(st, now, ctx) {
  if (alive(st).length <= 1) { endRound(st, ctx, 'last'); return true; }
  if (!st.sudden && now >= st.endsAt) {
    st.sudden = true;
    if (st.it >= 0 && st.fuseAt - now > 6500) st.fuseAt = now + rnd(3000, 6000);
    ctx.emit({ t: 'sudden' }, '⏰ Süre doldu: ANİ ÖLÜM! Fitiller artık çok kısa.', 'bad');
    return true;
  }
  if (st.it < 0) { if (now >= st.nextBombAt) { giveBomb(st, ctx); return true; } return false; }
  if (now >= st.fuseAt) { explode(st, ctx); return true; }
  return false;
}
function endRound(st, ctx, reason) {
  if (st.phase !== 'play') return;
  const now = Date.now(), n = st.players.length, el = now - st.playAt, rows = [];
  let win = null, winner = -1;
  if (st.mode === 'ebe') {
    if (st.it >= 0) { st.ebeMs[st.it] += now - st.itSince; st.itSince = now; }
    const minE = Math.min(...st.ebeMs);
    for (let i = 0; i < n; i++) rows.push({ pi: i, pts: Math.max(0, Math.round((el - st.ebeMs[i]) / 1000)), note: `${Math.round(st.ebeMs[i] / 1000)} sn Ebe kaldı`, win: st.ebeMs[i] === minE });
  } else if (st.mode === 'patates') {
    const al = alive(st); winner = al.length === 1 ? al[0] : -1;
    for (let i = 0; i < n; i++) {
      if (!st.out[i]) rows.push({ pi: i, pts: Math.round(el / 1000) + (i === winner ? 50 : 0), note: i === winner ? 'Son kalan! +50' : 'Hayatta kaldı', win: i === winner });
      else { const s = Math.round((st.outAt[i] - st.playAt) / 1000); rows.push({ pi: i, pts: s, note: `${s} sn dayandı`, win: false }); }
    }
  } else {
    win = reason === 'frozen' ? 'ebe' : 'run';
    for (let i = 0; i < n; i++) {
      const isE = st.ebes.includes(i), w = (win === 'ebe') === isE, s = st.stats[i];
      rows.push({ pi: i, pts: (w ? 100 : 0) + s.fr * 10 + s.rs * 15, note: isE ? `Dondurucu · ${s.fr} dondurma` : `${s.rs} kurtarma${st.frozen[i] ? ' · donmuş' : ''}`, win: w, ebe: isE });
    }
  }
  rows.forEach(r => { st.scores[r.pi] += r.pts; if (st.mode === 'ebe') st.ebeTot[r.pi] += Math.round(st.ebeMs[r.pi] / 1000); });
  st.last = { reason, round: st.round, rows, win, winner };
  st.items = []; st.bananas = []; st.noBack = null;
  setPhase(st, 'end', END_MS);
  let msg;
  if (st.mode === 'ebe') msg = `⏱ Süre doldu! En az Ebe kalan: ${rows.filter(r => r.win).map(r => pname(st, r.pi)).join(', ')}.`;
  else if (st.mode === 'patates') msg = winner >= 0 ? `🏆 Son kalan: ${pname(st, winner)}!` : '🏁 Tur bitti.';
  else msg = win === 'ebe' ? '❄️ Herkes dondu! Dondurucular kazandı.' : '⏱ Süre doldu! Kaçanlar kazandı.';
  ctx.emit({ t: 'roundEnd', reason, win, winner, wins: rows.filter(r => r.win).map(r => r.pi) }, msg, 'gold');
  ctx.sync();
}
function finish(st, ctx) {
  setPhase(st, 'over', 0);
  const lab = i => st.mode === 'ebe' ? `${st.scores[i]} sn kaçtı · ${st.ebeTot[i]} sn Ebe` : `${st.scores[i]} puan`;
  const ranking = st.players.map((p, i) => ({ pi: i, score: st.scores[i], label: lab(i) })).sort((a, b) => b.score - a.score);
  const best = pname(st, ranking[0].pi);
  let title;
  if (st.mode === 'ebe') title = `${best} en az Ebe kalan oldu!`;
  else if (st.mode === 'patates') title = `${best} sıcak patates şampiyonu!`;
  else title = st.rounds === 1 && st.last ? (st.last.win === 'ebe' ? 'Dondurucular kazandı! ❄️' : 'Kaçanlar kazandı! 🏃') : `${best} dondurmaca şampiyonu!`;
  const note = (st.mode === 'ebe' ? 'Puan: Ebe olmadığın saniye.' : st.mode === 'patates' ? 'Puan: dayandığın saniye; son kalana +50.' : 'Kazanan takıma +100, her dondurma +10, her kurtarma +15.') + ` ${st.rounds} tur oynandı.`;
  ctx.emit({ t: 'over' }, `🏁 Oyun bitti! ${title}`, 'gold');
  ctx.sync();
  ctx.later(900, () => ctx.end({ title, ranking, note }));
}
function nextRound(st, ctx) { if (st.round < st.rounds) startRound(st, ctx); else finish(st, ctx); }

/* ---- botlar ---- */
function nearestThreat(st, pi) {
  let best = null; const p = st.pos[pi];
  for (const j of chasers(st)) { if (j === pi || st.out[j]) continue; const q = st.pos[j], d = dist(p.x, p.y, q.x, q.y); if (!best || d < best.d) best = { j, x: q.x, y: q.y, d }; }
  return best;
}
function targetsOf(st, pi, now) {
  return st.players.map((_, j) => j).filter(j => j !== pi && !st.out[j] && !isChaser(st, j) && !(st.mode === 'dondurma' && st.frozen[j]) && !(st.imm[j] > now) &&
    !(st.noBack && st.noBack.a === pi && st.noBack.b === j && st.noBack.until > now));
}
function botReplan(st, pi, b, now, nav) {
  const me = st.pos[pi], mc = cellOf(nav, me.x, me.y);
  if (mc < 0) { b.wp = null; return; }
  const fM = bfs(nav, [mc]);
  if (isChaser(st, pi)) {
    let best = -1, bd = 1e9;
    for (const j of targetsOf(st, pi, now)) {
      const q = st.pos[j];
      if (st.fx[j].inv > now && dist(me.x, me.y, q.x, q.y) > 110) continue;
      const c = cellOf(nav, q.x, q.y); if (c < 0 || fM.d[c] < 0) continue;
      const dd = fM.d[c] + (st.fx[j].sh ? 6 : 0) - (b.tgt === j ? 3 : 0) + Math.random() * 2;
      if (dd < bd) { bd = dd; best = j; }
    }
    b.tgt = best;
    if (best >= 0) { const q = st.pos[best]; b.mode = 'chase'; b.wp = pathTo(fM, cellOf(nav, q.x, q.y)); b.wp.push([q.x, q.y]); return; }
  } else {
    b.tgt = -1;
    const th = chasers(st).filter(j => j !== pi && !st.out[j] && !(st.fx[j].inv > now && dist(st.pos[j].x, st.pos[j].y, me.x, me.y) > 130));
    const tc = th.map(j => cellOf(nav, st.pos[j].x, st.pos[j].y)).filter(c => c >= 0);
    const fC = tc.length ? bfs(nav, tc) : null;
    const danger = fC && fC.d[mc] >= 0 ? fC.d[mc] * NC : 9999;
    if (danger < b.fear) {
      let best = -1, bs = -1e9;
      for (let c = 0; c < NN; c++) {
        const dm = fM.d[c]; if (dm < 0 || dm > 16) continue;
        const dc = fC.d[c]; if (dc < 0) continue;
        const s = dc - .55 * dm + nav.open[c] * .12 + Math.random() * .6;
        if (s > bs) { bs = s; best = c; }
      }
      b.mode = 'flee'; b.wp = best >= 0 ? pathTo(fM, best) : null; return;
    }
    if (st.mode === 'dondurma') {
      let best = -1, bd = 1e9;
      st.players.forEach((_, j) => {
        if (j === pi || !st.frozen[j] || st.ebes.includes(j)) return;
        const c = cellOf(nav, st.pos[j].x, st.pos[j].y); if (c < 0 || fM.d[c] < 0) return;
        if (fC && fC.d[c] >= 0 && fC.d[c] < fM.d[c] - 3) return;
        if (fM.d[c] < bd) { bd = fM.d[c]; best = j; }
      });
      if (best >= 0) { const q = st.pos[best]; b.mode = 'rescue'; b.wp = pathTo(fM, cellOf(nav, q.x, q.y)); b.wp.push([q.x, q.y]); return; }
    }
    if (st.items.length) {
      let best = null, bd = 1e9;
      for (const it of st.items) {
        if (ITEMS[it.k].held && st.fx[pi].item) continue;
        const c = cellOf(nav, it.x, it.y); if (c < 0 || fM.d[c] < 0 || fM.d[c] * NC > 560) continue;
        if (fC && fC.d[c] >= 0 && fC.d[c] < fM.d[c] + 4) continue;
        if (fM.d[c] < bd) { bd = fM.d[c]; best = { it, c }; }
      }
      if (best) { b.mode = 'item'; b.wp = pathTo(fM, best.c); b.wp.push([best.it.x, best.it.y]); return; }
    }
  }
  // gezin
  if (!b.w || now > b.wAt || dist(me.x, me.y, b.w[0], b.w[1]) < 40) {
    for (let t = 0; t < 30; t++) { const c = Math.floor(Math.random() * NN); if (fM.d[c] > 4 && fM.d[c] < 30) { b.w = [cx_(c), cy_(c)]; b.wAt = now + rnd(2500, 4500); break; } }
  }
  b.mode = 'wander';
  b.wp = b.w ? pathTo(fM, cellOf(nav, b.w[0], b.w[1])) : null;
}
function botSteer(st, pi, b, p, nav, now) {
  if (b.jit != null && now < b.jitUntil) return [Math.cos(b.jit), Math.sin(b.jit)];
  if (isChaser(st, pi) && b.tgt >= 0 && !st.out[b.tgt]) {
    const q = st.pos[b.tgt], d = dist(p.x, p.y, q.x, q.y);
    if (d > 1 && d < 230 && los(nav, p.x, p.y, q.x, q.y)) return [(q.x - p.x) / d, (q.y - p.y) / d];
  }
  if (!b.wp || !b.wp.length) return [0, 0];
  while (b.wp.length > 1 && dist(p.x, p.y, b.wp[0][0], b.wp[0][1]) < 20) b.wp.shift();
  for (let i = Math.min(b.wp.length - 1, 8); i > 0; i--) if (los(nav, p.x, p.y, b.wp[i][0], b.wp[i][1])) { b.wp.splice(0, i); break; }
  const t = b.wp[0], dx = t[0] - p.x, dy = t[1] - p.y, d = Math.hypot(dx, dy);
  if (d < 8) { if (b.wp.length === 1) { b.wp = null; b.re = Math.min(b.re, now + 120); } return [0, 0]; }
  return [dx / d, dy / d];
}
function botItems(st, pi, b, now, ctx) {
  const f = st.fx[pi]; if (!f.item || now < b.useAt) return;
  b.useAt = now + 250;
  const p = st.pos[pi];
  if (f.item === 'isin') {
    if (isChaser(st, pi)) {
      const q = b.tgt >= 0 ? st.pos[b.tgt] : null;
      if (q) { const d = dist(p.x, p.y, q.x, q.y); if (d > 120 && d < 240 && Math.random() < .5) useItem(st, pi, { h: Math.atan2(q.y - p.y, q.x - p.x) }, ctx); }
    } else {
      const th = nearestThreat(st, pi);
      if (th && th.d < 115) {
        let h = Math.atan2(p.y - th.y, p.x - th.x);
        if (b.wp && b.wp.length) { const w = b.wp[Math.min(2, b.wp.length - 1)]; h = Math.atan2(w[1] - p.y, w[0] - p.x); }
        useItem(st, pi, { h }, ctx);
      }
    }
  } else if (f.item === 'muz') {
    if (!isChaser(st, pi)) { const th = nearestThreat(st, pi); if (th && th.d < 210 && Math.hypot(b.vx, b.vy) > 80) useItem(st, pi, { h: p.h }, ctx); }
    else if (!b.hold) b.hold = now + rnd(2500, 6000);
    else if (now > b.hold) { b.hold = 0; useItem(st, pi, { h: p.h }, ctx); }
  }
}
function stepBots(st, dt, now, ctx) {
  const map = MAPS[st.mapId], nav = navOf(st.mapId);
  for (const k of Object.keys(st.bot)) {
    if (st.phase !== 'play') return;
    const pi = +k, b = st.bot[k], p = st.pos[pi];
    if (st.out[pi] || st.frozen[pi]) { b.vx = b.vy = 0; p.m = 0; continue; }
    const f = st.fx[pi], slip = f.slip > now;
    let ix = 0, iy = 0;
    if (!slip) {
      if (now >= b.re) { botReplan(st, pi, b, now, nav); b.re = now + rnd(300, 520); }
      [ix, iy] = botSteer(st, pi, b, p, nav, now);
      botItems(st, pi, b, now, ctx);
    }
    const q = st.pos[pi], body = { x: q.x, y: q.y, vx: b.vx, vy: b.vy };
    const spd = BASE * (isChaser(st, pi) ? BOT_CHASE * EBE_K : BOT_RUN) * (f.spd > now ? SPD_K : 1);
    moveBody(map, body, ix, iy, spd, dt, slip);
    b.vx = body.vx; b.vy = body.vy;
    const sp = Math.hypot(b.vx, b.vy), h = sp > 15 ? Math.atan2(b.vy, b.vx) : q.h;
    st.pos[pi] = { x: Math.round(body.x * 10) / 10, y: Math.round(body.y * 10) / 10, h: +h.toFixed(2), m: sp > 25 ? 1 : 0, t: now };
    if (ix || iy) {
      if (now - b.sAt > 700) { if (dist(body.x, body.y, b.sx, b.sy) < 10) { b.re = 0; b.jit = rnd(0, TAU); b.jitUntil = now + 350; } b.sx = body.x; b.sy = body.y; b.sAt = now; }
    }
  }
}
function broadcastBots(st) {
  const arr = [];
  for (const k of Object.keys(st.bot)) { const p = st.pos[k]; arr.push([+k, Math.round(p.x), Math.round(p.y), +(+p.h).toFixed(2), p.m ? 1 : 0]); }
  if (!arr.length) return;
  arr.forEach(a => uiFeed(a[0], a[1], a[2], a[3], a[4]));
  fastOut({ t: 'b', p: arr });
}

/* ---- ana döngü (yöneten cihazda, 10/sn) ---- */
function tick(st, ctx) {
  const now = Date.now(), dt = clamp((now - st.lastTick) / 1000, 0, .25); st.lastTick = now;
  let dirty = false;
  if (st.phase === 'count') { if (now >= st.endsAt) { startPlay(st, ctx); dirty = true; } }
  else if (st.phase === 'play') {
    stepBots(st, dt, now, ctx);
    if (st.phase === 'play') { if (spawnItems(st, now)) dirty = true; if (pickups(st, now, ctx)) dirty = true; if (bananaCheck(st, now, ctx)) dirty = true; }
    if (st.phase === 'play' && autoTouch(st, ctx)) dirty = true;
    if (st.phase === 'play' && st.mode === 'patates' && bombTick(st, now, ctx)) dirty = true;
    if (st.phase === 'play' && st.mode !== 'patates' && now >= st.endsAt) { endRound(st, ctx, 'time'); dirty = true; }
    if (st.phase === 'play') broadcastBots(st);
  } else if (st.phase === 'end') { if (now >= st.endsAt) { nextRound(st, ctx); dirty = true; } }
  if (dirty || now - st.lastSync >= 1000) { st.lastSync = now; ctx.sync(); }
}
function runLoop(st, ctx) {
  const id = ++st.loopId;
  const step = () => {
    if (st.loopId !== id || st.phase === 'over') return;
    try { tick(st, ctx); } catch (e) { console.error(e); }
    if (st.phase !== 'over') ctx.later(TICK, step);
  };
  ctx.later(TICK, step);
}

const RULES = {
  setup(players, opts, ctx) {
    opts = opts || {};
    const n = players.length;
    const st = {
      mode: MODES[opts.mod] ? opts.mod : 'ebe',
      mapOpt: MAPS[opts.harita] ? opts.harita : (opts.harita === 'rastgele' ? 'rastgele' : 'park'),
      dur: optNum(opts.sure, [60, 90, 120, 180], 90), rounds: optNum(opts.tur, [1, 3], 1), pu: opts.guc !== '0',
      players: players.map((p, i) => ({ name: p.name, color: p.color, isBot: !!p.isBot, an: ANIMALS[i % ANIMALS.length] })),
      online: players.map(() => true), scores: players.map(() => 0), ebeTot: players.map(() => 0), roleCount: players.map(() => 0),
      round: 0, phase: 'count', endsAt: 0, phaseDur: 1, playAt: 0, mapId: null, spawnVer: 0,
      pos: [], it: -1, ebes: [], frozen: [], out: [], outAt: [], imm: [], fx: [], ebeMs: [], itSince: 0, stats: [],
      fuseAt: 0, nextBombAt: 0, sudden: false, noBack: null, items: [], bananas: [], nextItemAt: 0, idc: 0,
      bot: {}, last: null, lastTick: Date.now(), lastSync: 0, loopId: 0
    };
    void n;
    startRound(st, ctx);
    runLoop(st, ctx);
    return st;
  },
  action(st, pi, a, ctx) {
    if (!a || typeof a.t !== 'string') return;
    if (a.t === 'tag') claimTouch(st, pi, a.b, +a.x, +a.y, ctx) && ctx.sync();
    else if (a.t === 'use') { if (!useItem(st, pi, a, ctx)) ctx.emit({ t: 'nouse', pi }); }
  },
  view(st, viewer) {
    const n = st.players.length, me = Number.isInteger(viewer) && viewer >= 0 && viewer < n ? viewer : -1, now = Date.now();
    const nb = st.noBack && st.noBack.until > now ? { a: st.noBack.a, b: st.noBack.b, until: st.noBack.until } : null;
    return {
      mode: st.mode, mapId: st.mapId, phase: st.phase, round: st.round, rounds: st.rounds, dur: st.dur, pu: st.pu,
      endsAt: st.endsAt, phaseDur: st.phaseDur, sudden: st.sudden, me, spawnVer: st.spawnVer,
      it: st.it, ebes: st.ebes.slice(), frozen: st.frozen.slice(), out: st.out.slice(),
      pos: st.pos.map(p => [Math.round(p.x), Math.round(p.y), +(+p.h).toFixed(2)]),
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, an: p.an, online: st.online[i] !== false, score: st.scores[i] })),
      ebeMs: st.ebeMs.slice(), itSince: st.itSince, playAt: st.playAt,
      items: st.items.map(o => ({ id: o.id, k: o.k, x: o.x, y: o.y })), bananas: st.bananas.map(o => ({ id: o.id, x: o.x, y: o.y })),
      fx: st.fx.map((f, i) => ({ spd: f.spd > now ? f.spd : 0, inv: f.inv > now ? f.inv : 0, sh: !!f.sh, slip: f.slip > now ? f.slip : 0, item: i === me ? f.item : null })),
      imm: st.imm.map(t => (t > now ? t : 0)), noBack: nb, bombIn: st.mode === 'patates' && st.it < 0 && st.phase === 'play' ? st.nextBombAt : 0,
      stats: st.stats.map(s => ({ fr: s.fr, rs: s.rs, tg: s.tg })),
      last: st.phase === 'end' || st.phase === 'over' ? st.last : null
    };
  },
  turnOf() { return null; },
  skipTurn() { /* gerçek zamanlı: kopmalar onPresence ile işlenir */ },
  botAct() { /* botlar yöneten cihazdaki döngüde hareket eder */ },
  botDelay: 900,
  onPresence(st, pi, online, ctx) {
    st.online[pi] = online;
    if (online || (st.phase !== 'play' && st.phase !== 'count')) return;
    const now = Date.now();
    const cand = st.players.map((_, j) => j).filter(j => j !== pi && !st.out[j] && st.online[j] !== false && !st.ebes.includes(j));
    if (!cand.length) return;
    if (st.mode !== 'dondurma' && st.it === pi) {
      const nx = pickR(cand);
      if (st.mode === 'ebe' && st.phase === 'play') { st.ebeMs[pi] += now - st.itSince; st.itSince = now; }
      st.it = nx; st.noBack = null;
      ctx.emit({ t: 'handoff', pi: nx, from: pi }, `${pname(st, pi)} bağlantısı koptu; ${st.mode === 'ebe' ? 'yeni Ebe' : 'bombayı alan'}: ${pname(st, nx)}`, 'gold');
    } else if (st.mode === 'dondurma' && st.ebes.includes(pi)) {
      const free = cand.filter(j => !st.frozen[j]), nx = pickR(free.length ? free : cand);
      st.ebes = st.ebes.map(e => (e === pi ? nx : e)); st.frozen[nx] = false; st.frozen[pi] = false;
      ctx.emit({ t: 'handoff', pi: nx, from: pi }, `${pname(st, pi)} bağlantısı koptu; yeni dondurucu: ${pname(st, nx)}`, 'gold');
      if (st.phase === 'play' && allFrozen(st)) endRound(st, ctx, 'frozen');
    } else return;
    bumpBots(st);
    ctx.sync();
  },
  resume(st, ctx) {
    if (st.phase === 'over') return;
    const now = Date.now(); st.lastTick = now; st.pos.forEach(p => { p.t = now; });
    runLoop(st, ctx);
  }
};

/* ------------------------------------------------------------------ ARAYÜZ (her cihaz) */
let root = null, ui = null, V = null;
let cv = null, cg = null, stageEl = null, miniCv = null, itemBtn = null, itemCv = null, joyEl = null;
let scene = null, cam = { x: 0, y: 0, s: .8 }, sw = 300, sh = 300, dpr = 1, snapCam = true;
let av = null, rp = [], keys = new Set(), joy = { on: false, id: null, bx: 0, by: 0, dx: 0, dy: 0 };
let raf = 0, lastT = 0, hudT = null, ro = null, popT = null, toastT = null, frameN = 0;
let parts = [], anims = [], lastSend = 0, lastSent = null, claimAt = {}, seenSpawn = -1, seenKey = '', lastSec = -1, wasFrozen = false, wasSlip = 0;
let dustAt = {}, chipKey = '', sideKey = '', bombTickAt = 0, usedAt = 0, lastItemKey = '', layoutAt = 0;
const INTERP = 120, JR = 46;
const pnow = () => performance.now();
const hostClock = () => (ui && ui.hostNow ? ui.hostNow() : Date.now());
const q = s => root && root.querySelector(s);
const isTouch = () => (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
const phoneW = () => innerWidth < 760;
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const vChaser = (v, i) => (v.mode === 'dondurma' ? v.ebes.includes(i) : v.it === i);
const snd = {
  ok() { return Sound.ctx && Sound.enabled && Sound.ctx.state === 'running'; },
  pop() { if (!this.ok()) return; Sound.tone(520, .09, { type: 'square', gain: .1, slide: 980 }); Sound.tone(1180, .14, { type: 'triangle', gain: .16, when: .05 }); },
  freeze() { if (!this.ok()) return; [1568, 2093, 2637].forEach((f, i) => Sound.tone(f, .3, { type: 'sine', gain: .09, when: i * .05 })); Sound.noise(.3, { freq: 7000, q: 1, gain: .14 }); },
  thaw() { if (!this.ok()) return; [660, 880, 1175].forEach((f, i) => Sound.tone(f, .16, { type: 'triangle', gain: .14, when: i * .06 })); },
  boom() { if (!this.ok()) return; Sound.noise(.8, { filter: 'lowpass', freq: 420, gain: .7, decayPow: 2 }); Sound.tone(120, .5, { type: 'sawtooth', gain: .12, slide: 40 }); Sound.noise(.25, { freq: 2500, q: .7, gain: .25, when: .05 }); },
  slip() { if (!this.ok()) return; Sound.tone(980, .4, { type: 'sine', gain: .12, slide: 220 }); },
  tp() { if (!this.ok()) return; Sound.tone(300, .28, { type: 'sine', gain: .12, slide: 1600 }); Sound.tone(900, .2, { type: 'triangle', gain: .08, when: .12, slide: 2400 }); },
  fuse() { if (!this.ok()) return; Sound.noise(.05, { freq: 5200, q: 3, gain: .12 }); Sound.tone(1400, .03, { type: 'square', gain: .03 }); },
  peel() { if (!this.ok()) return; Sound.tone(240, .12, { type: 'triangle', gain: .12, slide: 160 }); }
};

/* ---- sahne ---- */
function ensureScene(id) {
  if (!MAPS[id] || (scene && scene.id === id)) return;
  const map = MAPS[id], k = clamp((window.devicePixelRatio || 1) * .8, 1, 1.6);
  const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
  const g = c.getContext('2d'); g.scale(k, k); map.paint(g);
  const th = document.createElement('canvas'); th.width = 240; th.height = 165; th.getContext('2d').drawImage(c, 0, 0, 240, 165);
  scene = { id, map, ground: c, thumb: th };
}
function camScale() {
  return phoneW() ? clamp(Math.min(sw / 470, sh / 640), .55, 1.05) : clamp(Math.max(Math.min(sw / W, sh / H) * 1.04, .7), .5, 1.05);
}
function clampCam() {
  const vw = sw / cam.s, vh = sh / cam.s, m = 30;
  cam.x = vw >= W + 2 * m ? (W - vw) / 2 : clamp(cam.x, -m, W - vw + m);
  cam.y = vh >= H + 2 * m ? (H - vh) / 2 : clamp(cam.y, -m, H - vh + m);
}
function focusPos() {
  if (av && V && V.me >= 0 && !V.out[V.me]) return av;
  if (V) { const c = V.mode === 'dondurma' ? V.ebes[0] : V.it; if (c >= 0 && rp[c]) return rp[c]; }
  return { x: W / 2, y: H / 2, vx: 0, vy: 0 };
}
function camFollow(dt) {
  cam.s = camScale();
  const f = focusPos(), lead = f === av ? .22 : 0;
  const tx = f.x + (f.vx || 0) * lead - sw / 2 / cam.s, ty = f.y + (f.vy || 0) * lead - sh / 2 / cam.s, k = snapCam ? 1 : 1 - Math.exp(-dt * 7);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; clampCam(); snapCam = false;
}
const toScreen = (x, y) => [(x - cam.x) * cam.s, (y - cam.y) * cam.s];
function toClient(x, y) { const r = cv.getBoundingClientRect(), s = toScreen(x, y); return [r.left + s[0], r.top + s[1]]; }
function resize() {
  if (!stageEl || !cv) return;
  layout();
  const r = stageEl.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return;
  sw = r.width; sh = r.height; dpr = Math.min(2.5, window.devicePixelRatio || 1);
  cv.width = Math.round(sw * dpr); cv.height = Math.round(sh * dpr);
  if (miniCv) { const w = miniCv.clientWidth, h = miniCv.clientHeight; miniCv.width = Math.round(w * dpr); miniCv.height = Math.round(h * dpr); }
  snapCam = true;
}
function layout() {
  if (!stageEl) return;
  const top = stageEl.getBoundingClientRect().top + (window.scrollY || 0), ph = phoneW();
  const h = ph ? clamp(innerHeight - top - 10, 300, 1000) : clamp(innerHeight - top - 16, 460, 780);
  if (Math.abs(stageEl.offsetHeight - h) > 2) stageEl.style.height = Math.round(h) + 'px';
}

/* ---- uzaktaki oyuncular: ara değerleme tamponu ---- */
function mkRemote(p) { return { buf: [], x: p[0], y: p[1], h: p[2] || 0, walk: 0, ph: 0, at: 0, p0: null, vx: 0, vy: 0 }; }
function feed(pi, x, y, h, mv) {
  if (!V || !root || !V.players[pi] || (pi === V.me && av)) return;
  if (V.phase !== 'play' || V.frozen[pi] || V.out[pi]) return;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const t = pnow();
  let r = rp[pi]; if (!r) r = rp[pi] = mkRemote([x, y, h]);
  const last = r.buf[r.buf.length - 1];
  if (last) {
    const d = dist(last.x, last.y, x, y), lim = MAXV * Math.max(.1, (t - last.t) / 1000) * 1.3 + 90;
    if (d > lim) { r.buf = []; r.p0 = null; r.x = x; r.y = y; }
  }
  r.buf.push({ t, x, y, h: Number.isFinite(h) ? h : r.h, m: mv });
  if (r.buf.length > 14) r.buf.shift();
  r.at = t;
}
function uiFeed(pi, x, y, h, m) { if (root) feed(pi, x, y, h, m); }
function onFast(m) {
  if (!m || !V) return;
  if (m.t === 'p') {
    if (ui && ui.isHost) hostPosIn(m.seat, +m.x, +m.y, +m.h, m.m, m.id);
    feed(m.seat, +m.x, +m.y, +m.h, m.m);
  } else if (m.t === 'b' && Array.isArray(m.p)) {
    if (ui && ui.isHost) return;
    m.p.forEach(a => { if (Array.isArray(a) && V.players[a[0]] && V.players[a[0]].isBot) feed(a[0], +a[1], +a[2], +a[3], a[4]); });
  }
}
function stepRemotes(dt, t) {
  const rt = t - INTERP;
  V.players.forEach((_, i) => {
    if (i === V.me && av) return;
    let r = rp[i]; if (!r) r = rp[i] = mkRemote(V.pos[i]);
    const ox = r.x, oy = r.y, b = r.buf;
    let tx = r.x, ty = r.y, th = r.h;
    if (V.phase === 'end') { /* yerinde kal */ }
    else if (V.phase !== 'play' || V.frozen[i] || V.out[i] || !b.length || t - r.at > 1500) { tx = V.pos[i][0]; ty = V.pos[i][1]; th = V.pos[i][2]; if (V.phase !== 'play' || dist(tx, ty, r.x, r.y) > 200) { r.x = tx; r.y = ty; } }
    else {
      while (b.length >= 2 && b[1].t <= rt) r.p0 = b.shift();
      const a = b[0];
      if (b.length >= 2 && rt > a.t) { const c = b[1], u = (rt - a.t) / Math.max(1, c.t - a.t); tx = a.x + (c.x - a.x) * u; ty = a.y + (c.y - a.y) * u; th = lerpAng(a.h, c.h, u); }
      else if (rt > a.t && r.p0 && a.m) { const p0 = r.p0, dtt = Math.max(1, a.t - p0.t), ext = Math.min(rt - a.t, 110); tx = a.x + (a.x - p0.x) / dtt * ext; ty = a.y + (a.y - p0.y) / dtt * ext; th = a.h; }
      else { tx = a.x; ty = a.y; th = a.h; }
    }
    const k = 1 - Math.exp(-dt * 22);
    r.x += (tx - r.x) * k; r.y += (ty - r.y) * k; r.h = lerpAng(r.h, th, Math.min(1, dt * 12));
    const sp = Math.hypot(r.x - ox, r.y - oy) / Math.max(dt, 1e-3);
    r.vx = (r.x - ox) / Math.max(dt, 1e-3); r.vy = (r.y - oy) / Math.max(dt, 1e-3);
    r.walk = V.frozen[i] || V.out[i] ? 0 : clamp(sp / 150, 0, 1); r.ph += sp * dt / 13;
    if (sp > 70 && V.phase === 'play') dust(i, r.x, r.y, r.vx, r.vy, t);
  });
}

/* ---- yerel oyuncu ---- */
function stepMe(dt, t) {
  if (!av || !V || V.me < 0) return;
  const me = V.me, map = MAPS[V.mapId], now = hostClock(), f = V.fx[me] || {};
  const can = V.phase === 'play' && !V.out[me] && !V.frozen[me];
  if (!can) { av.vx = 0; av.vy = 0; av.walk = Math.max(0, av.walk - dt * 6); return; }
  const slip = f.slip > now;
  let ix = 0, iy = 0;
  if (!slip) {
    if (keys.has('ArrowLeft') || keys.has('KeyA')) ix -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) ix += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) iy -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) iy += 1;
    if (joy.on) { ix = joy.dx; iy = joy.dy; }
    const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
  }
  const spd = BASE * (vChaser(V, me) ? EBE_K : 1) * (f.spd > now ? SPD_K : 1);
  const n = Math.max(1, Math.ceil(dt / .034));          // yavaş karelerde de gerçek hız: alt adımlar
  for (let k = 0; k < n; k++) moveBody(map, av, ix, iy, spd, dt / n, slip);
  const sp = Math.hypot(av.vx, av.vy);
  if (sp > 20 && !slip) av.h = lerpAng(av.h, Math.atan2(av.vy, av.vx), Math.min(1, dt * 14));
  av.walk = clamp(sp / 150, 0, 1); av.ph += sp * dt / 13;
  if (sp > 70) dust(me, av.x, av.y, av.vx, av.vy, t);
  if (t - lastSend > 100 && (!lastSent || dist(lastSent[0], lastSent[1], av.x, av.y) > 1 || Math.abs(lastSent[2] - av.h) > .08 || t - lastSend > 450)) sendPos(t);
}
function sendPos(t) {
  if (!av || !ui || !V || V.me < 0) return;
  lastSend = t || pnow(); lastSent = [av.x, av.y, av.h];
  const x = Math.round(av.x), y = Math.round(av.y), h = +av.h.toFixed(2), m = Math.hypot(av.vx, av.vy) > 25 ? 1 : 0;
  if (ui.isHost) hostPosIn(V.me, x, y, h, m);
  if (ui.mode === 'online' && ui.fast) ui.fast({ t: 'p', x, y, h, m });
}
// Yerelde dokunmayı fark edince yöneten cihaza bildir (o doğrular)
function claims(t) {
  if (!V || V.phase !== 'play' || !av || V.me < 0) return;
  const me = V.me, now = hostClock();
  if (V.out[me] || V.frozen[me]) return;
  const chase = vChaser(V, me);
  V.players.forEach((_, j) => {
    if (j === me || V.out[j]) return;
    const r = rp[j]; if (!r) return;
    let ok;
    if (V.mode === 'dondurma') { const je = V.ebes.includes(j); ok = chase ? (!je && !V.frozen[j] && !(V.imm[j] > now)) : (!je && V.frozen[j]); }
    else ok = chase && !(V.imm[j] > now) && !(V.noBack && V.noBack.a === me && V.noBack.b === j && V.noBack.until > now);
    if (!ok || dist(av.x, av.y, r.x, r.y) > TAG_R) return;
    if ((claimAt[j] || 0) > t - 400) return;
    claimAt[j] = t; sendPos(t);
    ui.send({ t: 'tag', b: j, x: Math.round(av.x), y: Math.round(av.y) });
  });
}
function useItemUI() {
  if (!V || V.phase !== 'play' || V.me < 0 || !av) return;
  const f = V.fx[V.me]; if (!f || !f.item || V.frozen[V.me] || V.out[V.me]) return;
  if (pnow() - usedAt < 450) return; usedAt = pnow();
  Sound.init();
  if (f.item === 'isin') {
    const [tx, ty] = dashTarget(MAPS[V.mapId], av.x, av.y, av.h);
    ui.send({ t: 'use', x: tx, y: ty, h: +av.h.toFixed(2) });
    anims.push({ k: 'poof', x: av.x, y: av.y, start: pnow(), dur: 600, col: '#c77dff' }, { k: 'poof', x: tx, y: ty, start: pnow(), dur: 600, col: '#c77dff' });
    av.x = tx; av.y = ty; sendPos(pnow()); snd.tp();
  } else ui.send({ t: 'use', h: +av.h.toFixed(2) });
}

/* ---- parçacıklar ve canlandırmalar ---- */
function dust(i, x, y, vx, vy, t) {
  if ((dustAt[i] || 0) > t - 75) return; dustAt[i] = t;
  if (parts.length > 220) return;
  const z = zoneAt(scene.map, x, y), s = Math.hypot(vx, vy) || 1;
  parts.push({ x: x - vx / s * 10 + rnd(-5, 5), y: y + 15 + rnd(-3, 3), vx: -vx * .08 + rnd(-12, 12), vy: -vy * .08 - rnd(4, 14), life: .55, max: .55, r: rnd(4, 7), c: z.dust || '#efe2bd', k: z.ice ? 'spark' : 'dust' });
}
function burstParts(x, y, n, cols, sp = 160, k = 'spark') { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(sp * .3, sp); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: rnd(.5, .9), max: .9, r: rnd(3, 6), c: pickR(cols), k, g: 220 }); } }
function stepParts(dt) {
  for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .92; p.vy = p.vy * .92 + (p.g || 0) * dt; }
  parts = parts.filter(p => p.life > 0);
}
function pop(text, cls) {
  const p = q('.kv-pop'); if (!p) return;
  p.textContent = text; p.className = 'kv-pop'; void p.offsetWidth; p.className = 'kv-pop show ' + (cls || '');
  clearTimeout(popT); popT = setTimeout(() => { if (p) p.className = 'kv-pop'; }, 1200);
}
function toast(text, cls) {
  const t = q('.kv-toast'); if (!t) return;
  t.textContent = text; t.className = 'kv-toast show ' + (cls || ''); clearTimeout(toastT);
  toastT = setTimeout(() => { if (t) t.className = 'kv-toast'; }, 1700);
}
const posOf = i => (V && i === V.me && av ? av : rp[i]) || (V && V.pos[i] ? { x: V.pos[i][0], y: V.pos[i][1] } : { x: W / 2, y: H / 2 });

/* ---- çizim: hayvan karakterler ---- */
function drawEars(g, an, c, dk, lt) {
  const pink = '#ffb3cf';
  if (an === 'kedi') { [[-1], [1]].forEach(([s]) => { g.beginPath(); g.moveTo(s * 6, -19); g.lineTo(s * 19, -27); g.lineTo(s * 18, -9); g.closePath(); g.fillStyle = c; g.fill(); g.strokeStyle = dk; g.lineWidth = 2.5; g.stroke(); g.beginPath(); g.moveTo(s * 9, -18); g.lineTo(s * 17, -23); g.lineTo(s * 16, -13); g.closePath(); g.fillStyle = pink; g.fill(); }); }
  else if (an === 'ayi') { [-15, 15].forEach(x => { D.circle(g, x, -16, 8, c, dk, 2.5); D.circle(g, x, -16, 4, lt); }); }
  else if (an === 'tavsan') { [-8, 8].forEach((x, i) => { D.ell(g, x, -28, 5.5, 14, c, i ? .15 : -.15, dk, 2.5); D.ell(g, x, -27, 2.6, 9, pink, i ? .15 : -.15); }); }
  else if (an === 'kurbaga') { [-10, 10].forEach(x => D.circle(g, x, -17, 8.5, c, dk, 2.5)); }
  else if (an === 'tilki') { [[-1], [1]].forEach(([s]) => { g.beginPath(); g.moveTo(s * 5, -19); g.lineTo(s * 17, -33); g.lineTo(s * 20, -10); g.closePath(); g.fillStyle = c; g.fill(); g.strokeStyle = dk; g.lineWidth = 2.5; g.stroke(); g.beginPath(); g.moveTo(s * 13, -27); g.lineTo(s * 17, -33); g.lineTo(s * 18, -24); g.closePath(); g.fillStyle = '#2d2340'; g.fill(); }); }
  else if (an === 'panda') { [-15, 15].forEach(x => D.circle(g, x, -16, 7.5, '#2d2340', '#120a1e', 2)); }
  else if (an === 'civciv') { g.strokeStyle = dk; g.lineWidth = 2.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -21); g.quadraticCurveTo(-4, -30, -1, -33); g.moveTo(0, -21); g.quadraticCurveTo(5, -29, 7, -30); g.stroke(); g.lineCap = 'butt'; }
  else if (an === 'penguen') { g.strokeStyle = dk; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-2, -21); g.quadraticCurveTo(2, -29, 6, -27); g.stroke(); }
}
function drawFace(g, an, fx, fy, t, blink) {
  const ex = fx * 4.5, ey = fy * 2.5 - 1;
  if (an === 'tilki') { g.fillStyle = '#fff6ee'; g.beginPath(); g.moveTo(-14 + ex * .5, 2 + ey); g.quadraticCurveTo(0, 22 + ey, 14 + ex * .5, 2 + ey); g.quadraticCurveTo(0, 8 + ey, -14 + ex * .5, 2 + ey); g.fill(); }
  if (an === 'penguen') { D.ell(g, ex * .6, 2 + ey * .6, 15, 14, '#fff6ee'); }
  if (an === 'panda') { D.ell(g, -7 + ex, -2 + ey, 6, 7.5, '#2d2340', -.5); D.ell(g, 7 + ex, -2 + ey, 6, 7.5, '#2d2340', .5); }
  if (an === 'ayi') D.ell(g, ex * .9, 6 + ey, 8, 6, 'rgba(255,240,220,.85)');
  const eyeY = an === 'kurbaga' ? -16 : -3 + ey, eyeX = an === 'kurbaga' ? 10 : 7;
  [-1, 1].forEach(s => {
    const x = s * eyeX + ex;
    if (an === 'kurbaga') D.circle(g, s * 10 + ex * .4, -17, 5.5, '#ffffff');
    if (blink) { g.strokeStyle = '#2d2340'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 3, eyeY); g.lineTo(x + 3, eyeY); g.stroke(); }
    else { D.ell(g, x, eyeY, 3.2, 4, an === 'panda' ? '#ffffff' : '#2d2340'); if (an === 'panda') D.circle(g, x, eyeY, 2, '#2d2340'); D.circle(g, x - 1, eyeY - 1.6, 1.2, '#ffffff'); }
  });
  if (an !== 'penguen' && an !== 'civciv' && an !== 'kurbaga') { D.ell(g, -12 + ex, 5 + ey, 4, 2.4, 'rgba(255,120,160,.55)'); D.ell(g, 12 + ex, 5 + ey, 4, 2.4, 'rgba(255,120,160,.55)'); }
  const my = 5 + ey;
  if (an === 'penguen' || an === 'civciv') { g.fillStyle = '#ff9a1f'; g.beginPath(); g.moveTo(ex - 4.5, my - 1); g.lineTo(ex + 4.5, my - 1); g.lineTo(ex + fx * 3, my + 5); g.closePath(); g.fill(); g.strokeStyle = '#b5610a'; g.lineWidth = 1.2; g.stroke(); }
  else if (an === 'kurbaga') { g.strokeStyle = '#2d2340'; g.lineWidth = 2; g.beginPath(); g.arc(ex, my - 2, 9, .25, Math.PI - .25); g.stroke(); }
  else {
    D.ell(g, ex, my - 1, 2.4, 1.8, an === 'tavsan' || an === 'kedi' ? '#ff7aa8' : '#2d2340');
    g.strokeStyle = '#2d2340'; g.lineWidth = 1.6; g.beginPath(); g.arc(ex - 2.4, my + .6, 2.4, 0, Math.PI); g.arc(ex + 2.4, my + .6, 2.4, 0, Math.PI); g.stroke();
    if (an === 'kedi') { g.lineWidth = 1; g.beginPath(); g.moveTo(ex - 6, my); g.lineTo(ex - 15, my - 2); g.moveTo(ex - 6, my + 2); g.lineTo(ex - 15, my + 3); g.moveTo(ex + 6, my); g.lineTo(ex + 15, my - 2); g.moveTo(ex + 6, my + 2); g.lineTo(ex + 15, my + 3); g.stroke(); }
  }
}
function drawCrown(g, y, col, t, snow) {
  g.save(); g.translate(0, y + Math.sin(t / 260) * 1.5);
  D.glow(g, 0, 0, 26, snow ? 'rgba(140,230,255,.55)' : 'rgba(255,220,80,.6)');
  g.beginPath(); g.moveTo(-13, 6); g.lineTo(-15, -8); g.lineTo(-7, -1); g.lineTo(0, -12); g.lineTo(7, -1); g.lineTo(15, -8); g.lineTo(13, 6); g.closePath();
  const gr = g.createLinearGradient(0, -12, 0, 6); gr.addColorStop(0, snow ? '#e9fbff' : '#fff6b0'); gr.addColorStop(1, col); g.fillStyle = gr; g.fill();
  g.strokeStyle = snow ? '#2a7fb0' : '#9a5a00'; g.lineWidth = 2; g.stroke();
  if (snow) { g.strokeStyle = '#ffffff'; g.lineWidth = 1.6; for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI; g.beginPath(); g.moveTo(Math.cos(a) * 4, 1 + Math.sin(a) * 4); g.lineTo(-Math.cos(a) * 4, 1 - Math.sin(a) * 4); g.stroke(); } }
  else { D.circle(g, 0, 1, 2.6, '#ff3fa4'); D.circle(g, -8, 2, 1.8, '#19e3d0'); D.circle(g, 8, 2, 1.8, '#19e3d0'); }
  g.restore();
}
function drawBomb(g, y, t) {
  g.save(); g.translate(0, y + Math.sin(t / 140) * 1.2);
  D.glow(g, 0, 0, 28, 'rgba(255,90,40,.45)');
  D.circle(g, 0, 0, 11, '#2d2340', '#120a1e', 2); D.circle(g, -4, -4, 3.5, 'rgba(255,255,255,.35)');
  D.rr(g, -3.5, -14, 7, 5, 1.5, '#7d8794');
  g.strokeStyle = '#c9a57a'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -14); g.quadraticCurveTo(6, -20, 9, -17); g.stroke();
  const f = (Math.sin(t / 60) + 1) / 2;
  D.glow(g, 9, -17, 10, 'rgba(255,220,80,.9)');
  g.strokeStyle = '#ffe14a'; g.lineWidth = 1.6; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + t / 90; g.beginPath(); g.moveTo(9, -17); g.lineTo(9 + Math.cos(a) * (4 + f * 4), -17 + Math.sin(a) * (4 + f * 4)); g.stroke(); }
  g.restore();
}
function drawAnimal(g, o) {
  const t = o.t, walk = o.walk || 0, bob = o.soot || o.frozen ? 0 : Math.abs(Math.sin(o.ph || 0)) * 3.5 * walk;
  const fx = Math.cos(o.h || 0), fy = Math.sin(o.h || 0);
  g.save(); g.translate(o.x, o.y); g.globalAlpha = o.alpha == null ? 1 : o.alpha;
  if (o.ring) { const a = .55 + .35 * Math.sin(t / 200); g.strokeStyle = o.ring; g.globalAlpha *= a; g.lineWidth = 3.5; g.beginPath(); g.ellipse(0, 15, 31, 12, 0, 0, TAU); g.stroke(); g.globalAlpha = o.alpha == null ? 1 : o.alpha; }
  D.shadow(g, 0, 17, 20 - bob * .5, 7, .28);
  if (o.speed && walk > .2) { g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2.5; g.lineCap = 'round'; for (let i = -1; i <= 1; i++) { const sx = -fx * 30 - fy * i * 9, sy = -fy * 30 + fx * i * 9; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - fx * 16, sy - fy * 16); g.stroke(); } g.lineCap = 'butt'; }
  const c = o.col, dk = shade(c, -.38), lt = shade(c, .4);
  if (!o.soot) { const s1 = Math.sin(o.ph || 0) * 5 * walk; D.ell(g, -8 + fx * s1, 16 + fy * s1 * .6, 6, 4, dk); D.ell(g, 8 - fx * s1, 16 - fy * s1 * .6, 6, 4, dk); }
  g.translate(0, -bob);
  if (o.spin) g.rotate(o.spin);
  if (o.soot) g.translate(0, 4);
  drawEars(g, o.an, c, dk, lt);
  const gr = g.createRadialGradient(-7, -9, 3, 0, 0, R + 2); gr.addColorStop(0, lt); gr.addColorStop(.62, c); gr.addColorStop(1, shade(c, -.12));
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fillStyle = gr; g.fill(); g.lineWidth = 2.5; g.strokeStyle = dk; g.stroke();
  if (o.an !== 'penguen' && o.an !== 'tilki') D.ell(g, fx * 3, 9 + fy * 2, 11, 7, 'rgba(255,255,255,.28)');
  if (o.soot) {
    D.circle(g, 0, 0, R, 'rgba(45,38,52,.82)');
    g.strokeStyle = '#2d2340'; g.lineWidth = 2.5; g.lineCap = 'round';
    for (let i = -3; i <= 3; i++) { const a = -Math.PI / 2 + i * .32; g.beginPath(); g.moveTo(Math.cos(a) * 19, Math.sin(a) * 19); g.lineTo(Math.cos(a) * 28 + Math.sin(t / 200 + i) * 2, Math.sin(a) * 28); g.stroke(); }
    g.lineCap = 'butt';
    const blink = Math.sin(t / 700) > .93;
    [-7, 7].forEach(x => { D.circle(g, x, -3, 5.5, '#ffffff'); if (!blink) D.circle(g, x + Math.sin(t / 300) * 1.5, -3, 2.2, '#2d2340'); });
    D.ell(g, 0, 8, 4, 3.5, '#120a1e');
    for (let i = 0; i < 3; i++) { const k = ((t / 1400) + i / 3) % 1; g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * (1 - k) * .7; D.circle(g, Math.sin(k * 6 + i) * 8, -30 - k * 30, 5 + k * 7, '#8a8494'); }
    g.globalAlpha = o.alpha == null ? 1 : o.alpha;
  } else drawFace(g, o.an, fx, fy, t, !o.frozen && Math.sin(t / 900 + o.col.length) > .985);
  if (o.crown) drawCrown(g, -R - 10, '#ffb627', t, false);
  if (o.snowCrown) drawCrown(g, -R - 10, '#5ad1ff', t, true);
  if (o.bomb) drawBomb(g, -R - 14, t);
  if (o.frozen) {
    D.rr(g, -27, -31, 54, 54, 10, 'rgba(170,225,255,.45)', 'rgba(255,255,255,.9)', 2);
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-19, -22); g.lineTo(-10, -26); g.moveTo(-20, -14); g.lineTo(-17, -16); g.stroke();
    D.rr(g, 12, -28, 9, 4, 2, 'rgba(255,255,255,.6)');
  }
  if (o.shield) { const a = .6 + .2 * Math.sin(t / 180); D.circle(g, 0, -2, 31, `rgba(90,162,255,${.12 * a + .05})`, `rgba(140,200,255,${a})`, 2.5); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.beginPath(); g.arc(0, -2, 26, -2.4, -1.6); g.stroke(); }
  g.restore();
}
function pill(g, x, y, text, bg, fg) {
  const s = 1 / cam.s;
  g.save(); g.translate(x, y); g.scale(s, s);
  g.font = '900 11px "Nunito","Segoe UI",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = Math.min(120, g.measureText(text).width + 12);
  D.rr(g, -w / 2, -8, w, 16, 8, bg, 'rgba(0,0,0,.35)', 1);
  g.fillStyle = fg; g.fillText(text, 0, .5, 110);
  g.restore();
}
function drawPlayer(g, i, pos, t, now) {
  const p = V.players[i], f = V.fx[i] || {}, me = i === V.me;
  const inv = f.inv > now;
  if (inv && !me) {   // başkalarına yalnızca hafif bir parıltı
    g.save(); g.globalAlpha = .16 + .06 * Math.sin(t / 90);
    g.strokeStyle = '#ffffff'; g.lineWidth = 2;
    g.beginPath(); for (let k = 0; k <= 24; k++) { const a = k / 24 * TAU, rr = R + Math.sin(a * 5 + t / 80) * 2.5; k ? g.lineTo(pos.x + Math.cos(a) * rr, pos.y + Math.sin(a) * rr) : g.moveTo(pos.x + Math.cos(a) * rr, pos.y + Math.sin(a) * rr); } g.stroke();
    g.restore(); return;
  }
  const chase = vChaser(V, i), imm = V.imm[i] > now;
  const ring = V.phase === 'play' || V.phase === 'count' ? (chase ? (V.mode === 'dondurma' ? '#5ad1ff' : V.mode === 'patates' ? '#ff5a3c' : '#ffd84a') : (me ? 'rgba(255,255,255,.9)' : null)) : null;
  let alpha = inv ? .45 : 1; if (imm && Math.sin(t / 70) > 0) alpha *= .55;
  if (!p.online) alpha *= .6;
  drawAnimal(g, { x: pos.x, y: pos.y, col: p.color, an: p.an, h: pos.h, walk: pos.walk, ph: pos.ph, t, alpha, ring,
    crown: V.mode === 'ebe' && chase, snowCrown: V.mode === 'dondurma' && chase, bomb: V.mode === 'patates' && chase,
    frozen: V.frozen[i], soot: V.out[i], shield: f.sh, speed: f.spd > now, spin: f.slip > now ? ((f.slip - now) / SLIP_MS) * TAU * 1.5 : 0 });
  const label = me ? 'SEN' : p.name;
  const yOff = R + (chase ? (V.mode === 'patates' ? 46 : 38) : 16);
  pill(g, pos.x, pos.y - yOff, label, me ? '#ffffff' : p.color, '#1a0b3d');
  if (!p.online) { g.save(); g.globalAlpha = .9; D.text(g, 'z z', pos.x + 22, pos.y - 26, 12, '#ffffff', '#1a0b3d', '"Nunito",sans-serif'); g.restore(); }
}
function drawItemIcon(g, k, s) {
  g.save(); g.scale(s, s);
  if (k === 'hiz') {
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2; g.lineCap = 'round'; [-6, 0, 6].forEach(y => { g.beginPath(); g.moveTo(-17, y + 1); g.lineTo(-11, y + 1); g.stroke(); }); g.lineCap = 'butt';
    g.beginPath(); g.moveTo(-10, 5); g.lineTo(-10, -6); g.quadraticCurveTo(-9, -10, -4, -10); g.lineTo(0, -4); g.quadraticCurveTo(6, -2, 12, 0); g.quadraticCurveTo(15, 2, 14, 6); g.closePath();
    g.fillStyle = '#ff4f6d'; g.fill(); g.strokeStyle = '#8a1a3a'; g.lineWidth = 1.6; g.stroke();
    D.rr(g, -11, 5, 26, 5, 2.5, '#ffffff', '#8a1a3a', 1.4);
    g.strokeStyle = '#ffffff'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-3, -6); g.lineTo(1, -2); g.moveTo(-6, -4); g.lineTo(-2, 0); g.stroke();
  } else if (k === 'gorunmez') {
    g.beginPath(); g.moveTo(-11, 11); g.lineTo(-11, -1); g.arc(0, -1, 11, Math.PI, 0); g.lineTo(11, 11); for (let i = 0; i < 4; i++) g.quadraticCurveTo(11 - i * 5.5 - 2.75, i % 2 ? 14 : 7, 11 - (i + 1) * 5.5, 11); g.closePath();
    g.fillStyle = 'rgba(255,255,255,.92)'; g.fill(); g.strokeStyle = '#7f8fd6'; g.lineWidth = 1.8; g.stroke();
    D.ell(g, -4, -2, 2.2, 3, '#2d2340'); D.ell(g, 4, -2, 2.2, 3, '#2d2340'); D.ell(g, 0, 4, 2, 2.4, '#2d2340');
  } else if (k === 'muz') {
    g.beginPath(); g.moveTo(-12, -6); g.quadraticCurveTo(-8, 12, 12, 7); g.quadraticCurveTo(-2, 4, -7, -8); g.closePath();
    g.fillStyle = '#ffe14a'; g.fill(); g.strokeStyle = '#a77a00'; g.lineWidth = 1.8; g.stroke();
    g.fillStyle = '#6b4a1a'; g.beginPath(); g.arc(-10, -8, 2.2, 0, TAU); g.fill(); g.beginPath(); g.arc(12, 7, 1.6, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-8, -2); g.quadraticCurveTo(-5, 6, 4, 7); g.stroke();
  } else if (k === 'kalkan') {
    g.beginPath(); g.moveTo(0, -13); g.lineTo(11, -8); g.lineTo(10, 2); g.quadraticCurveTo(7, 10, 0, 14); g.quadraticCurveTo(-7, 10, -10, 2); g.lineTo(-11, -8); g.closePath();
    const gr = g.createLinearGradient(0, -13, 0, 14); gr.addColorStop(0, '#8cc4ff'); gr.addColorStop(1, '#2f5bd8'); g.fillStyle = gr; g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#ffe14a'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2.6 : 6; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r + 1) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r + 1); } g.closePath(); g.fill();
  } else if (k === 'isin') {
    D.circle(g, 0, 0, 12, '#5b2a9a', '#e3c2ff', 2);
    g.strokeStyle = '#e3c2ff'; g.lineWidth = 2; g.beginPath(); for (let a = 0; a < 9; a += .2) { const r = a * 1.2; a ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(0, 0); } g.stroke();
    [[-12, -11], [12, -9], [11, 12]].forEach(([x, y]) => { g.fillStyle = '#fff6b0'; g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 1.3, y - 1.3); g.lineTo(x + 4, y); g.lineTo(x + 1.3, y + 1.3); g.lineTo(x, y + 4); g.lineTo(x - 1.3, y + 1.3); g.lineTo(x - 4, y); g.lineTo(x - 1.3, y - 1.3); g.closePath(); g.fill(); });
  }
  g.restore();
}
function drawItems(g, t) {
  for (const it of V.items) {
    const b = Math.sin(t / 300 + it.id) * 3, col = ITEMS[it.k] ? ITEMS[it.k].col : '#fff';
    D.shadow(g, it.x, it.y + 16, 14, 5, .2);
    D.glow(g, it.x, it.y - 6 + b, 34, 'rgba(255,255,220,.45)');
    const gr = g.createRadialGradient(it.x - 6, it.y - 12 + b, 2, it.x, it.y - 6 + b, 20); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, shade(col, .25));
    D.circle(g, it.x, it.y - 6 + b, 19, gr, '#ffffff', 2.5);
    g.save(); g.translate(it.x, it.y - 6 + b); drawItemIcon(g, it.k, .95); g.restore();
    const a = t / 400 + it.id; D.circle(g, it.x + Math.cos(a) * 24, it.y - 6 + b + Math.sin(a) * 10, 2.2, '#fff6b0');
  }
}
function drawBananas(g) {
  for (const bn of V.bananas) {
    g.save(); g.translate(bn.x, bn.y); g.rotate((bn.id * 1.7) % TAU);
    D.shadow(g, 2, 4, 14, 5, .2);
    g.fillStyle = '#ffe14a'; g.strokeStyle = '#a77a00'; g.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) { g.save(); g.rotate(i / 3 * TAU); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(10, -4, 14, 3); g.quadraticCurveTo(7, 3, 0, 4); g.closePath(); g.fill(); g.stroke(); g.restore(); }
    D.circle(g, 0, 1, 4, '#f4cf3a', '#a77a00', 1.4); D.circle(g, 0, 1, 1.6, '#6b4a1a');
    g.restore();
  }
}
function drawParts(g) {
  for (const p of parts) {
    const a = clamp(p.life / p.max, 0, 1);
    g.globalAlpha = a * (p.k === 'dust' ? .7 : 1);
    if (p.k === 'spark') { g.strokeStyle = p.c; g.lineWidth = 2; const s = p.r * (.5 + a * .6); g.beginPath(); g.moveTo(p.x - s, p.y); g.lineTo(p.x + s, p.y); g.moveTo(p.x, p.y - s); g.lineTo(p.x, p.y + s); g.stroke(); }
    else D.circle(g, p.x, p.y, p.r * (1.6 - a * .6), p.c);
  }
  g.globalAlpha = 1;
}
function drawAnims(g, t) {
  anims = anims.filter(a => t - a.start < a.dur);
  for (const a of anims) {
    const u = clamp((t - a.start) / a.dur, 0, 1);
    if (a.k === 'text') {
      const s = u < .2 ? .5 + u / .2 * .7 : u < .3 ? 1.2 - (u - .2) * 2 : 1;
      g.save(); g.globalAlpha = u > .7 ? (1 - u) / .3 : 1; g.translate(a.x, a.y - 30 - u * 34); g.scale(s / Math.max(.7, cam.s) * .9, s / Math.max(.7, cam.s) * .9);
      D.text(g, a.txt, 0, 0, a.size || 28, a.col || '#ffe14a', a.stroke || '#5a1a00'); g.restore();
    } else if (a.k === 'ring') {
      g.save(); g.globalAlpha = 1 - u; D.circle(g, a.x, a.y, 10 + u * (a.r || 60), null, a.col || '#fff', 4 * (1 - u) + 1); g.restore();
    } else if (a.k === 'poof') {
      g.save(); g.globalAlpha = 1 - u;
      for (let i = 0; i < 7; i++) { const an = i / 7 * TAU, d = 8 + u * 30; D.circle(g, a.x + Math.cos(an) * d, a.y + Math.sin(an) * d * .7, 10 * (1 - u * .5), i % 2 ? (a.col || '#ffffff') : '#ffffff'); }
      g.restore();
    } else if (a.k === 'boom') {
      g.save(); g.translate(a.x, a.y - 10);
      const s = u < .15 ? u / .15 : 1; g.globalAlpha = u > .65 ? (1 - u) / .35 : 1;
      g.fillStyle = '#ffb627'; g.beginPath(); for (let i = 0; i < 16; i++) { const an = i / 16 * TAU, r = (i % 2 ? 34 : 58) * s; i ? g.lineTo(Math.cos(an) * r, Math.sin(an) * r) : g.moveTo(Math.cos(an) * r, Math.sin(an) * r); } g.closePath(); g.fill();
      g.strokeStyle = '#a3401a'; g.lineWidth = 3; g.stroke();
      for (let i = 0; i < 8; i++) { const an = i / 8 * TAU + .2, d = 30 * s + u * 30; D.circle(g, Math.cos(an) * d, Math.sin(an) * d, 14 * (1 - u * .4), i % 2 ? '#d9d4de' : '#a8a2b0'); }
      g.scale(s / Math.max(.7, cam.s), s / Math.max(.7, cam.s)); D.text(g, 'PUF!', 0, 0, 34, '#ffffff', '#5a1a00');
      g.restore();
    } else if (a.k === 'stars') {
      const p = posOf(a.pi); g.save();
      for (let i = 0; i < 3; i++) { const an = t / 180 + i / 3 * TAU; g.globalAlpha = 1 - u * .6; D.text(g, '★', p.x + Math.cos(an) * 18, p.y - 32 + Math.sin(an) * 6, 13, '#ffe14a', '#5a1a00', 'sans-serif'); }
      g.restore();
    }
  }
}
function drawProp(g, pr, t, list) {
  let fade = 1;
  if (pr.fade) for (const it of list) { if (it.pr) continue; const p = it.pos; if (Math.abs(p.x - pr.x) < pr.fade[0] + 20 && p.y < pr.y - 6 && p.y > pr.y - pr.fade[1] - 20) { fade = .42; break; } }
  pr.draw(g, t, fade);
}
function drawArrows(g, t, now) {
  if (!V || V.phase !== 'play' || V.me < 0 || V.out[V.me] || !av) return;
  const me = V.me, chase = vChaser(V, me), list = [];
  const visible = j => !(V.fx[j] && V.fx[j].inv > now);
  if (chase) {
    V.players.map((_, j) => j).filter(j => j !== me && !V.out[j] && !vChaser(V, j) && !(V.mode === 'dondurma' && V.frozen[j]) && visible(j))
      .map(j => ({ j, d: dist(av.x, av.y, posOf(j).x, posOf(j).y) })).sort((a, b) => a.d - b.d).slice(0, 2).forEach(o => list.push([o.j, '#ffe14a']));
  } else {
    V.players.forEach((_, j) => { if (j !== me && vChaser(V, j) && !V.out[j] && visible(j)) list.push([j, V.mode === 'dondurma' ? '#5ad1ff' : '#ff3b5c']); });
    if (V.mode === 'dondurma' && !V.frozen[me]) V.players.forEach((_, j) => { if (j !== me && V.frozen[j]) list.push([j, '#bff3ff']); });
  }
  const cxs = sw / 2, cys = sh / 2, m = 30;
  for (const [j, col] of list) {
    const p = posOf(j), [sx, sy] = toScreen(p.x, p.y);
    if (sx > -10 && sx < sw + 10 && sy > -10 && sy < sh + 10) continue;
    const dx = sx - cxs, dy = sy - cys, k = Math.min((sw / 2 - m) / Math.max(1e-3, Math.abs(dx)), (sh / 2 - m) / Math.max(1e-3, Math.abs(dy)));
    const ax = cxs + dx * k, ay = cys + dy * k, an = Math.atan2(dy, dx);
    g.save(); g.translate(ax, ay);
    g.globalAlpha = .88 + .12 * Math.sin(t / 150);
    D.circle(g, 0, 0, 15, 'rgba(18,5,46,.75)', col, 2.5);
    g.rotate(an); g.fillStyle = col; g.beginPath(); g.moveTo(21, 0); g.lineTo(12, -7); g.lineTo(12, 7); g.closePath(); g.fill();
    g.rotate(-an); D.circle(g, 0, 0, 8, V.players[j].color);
    g.restore();
  }
}
function draw(t) {
  const g = cg, now = hostClock();
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#160833'; g.fillRect(0, 0, sw, sh);
  g.save(); g.scale(cam.s, cam.s); g.translate(-cam.x, -cam.y);
  {   // zeminin yalnızca görünen kısmı
    const k = scene.ground.width / W, x0 = clamp(cam.x, 0, W), y0 = clamp(cam.y, 0, H), x1 = clamp(cam.x + sw / cam.s, 0, W), y1 = clamp(cam.y + sh / cam.s, 0, H);
    if (x1 > x0 && y1 > y0) g.drawImage(scene.ground, x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k, x0, y0, x1 - x0, y1 - y0);
  }
  if (scene.map.dyn) scene.map.dyn(g, t);
  drawBananas(g); drawItems(g, t); drawParts(g);
  const list = [];
  V.players.forEach((_, i) => { const pos = i === V.me && av ? av : rp[i]; if (pos) list.push({ y: pos.y, i, pos }); });
  (scene.map.props || []).forEach(pr => list.push({ y: pr.y, pr }));
  list.sort((a, b) => a.y - b.y);
  for (const it of list) { if (it.pr) drawProp(g, it.pr, t, list); else drawPlayer(g, it.i, it.pos, t, now); }
  if (scene.map.top) scene.map.top(g, t);
  drawAnims(g, t);
  g.restore();
  drawArrows(g, t, now);
}
function drawMini() {
  if (!miniCv || !V || !scene || miniCv.hidden) return;
  const g = miniCv.getContext('2d'), w = miniCv.width, h = miniCv.height, sx = w / W, sy = h / H, now = hostClock(), t = pnow();
  if (!w || !h) return;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
  g.globalAlpha = .92; g.drawImage(scene.thumb, 0, 0, w, h); g.globalAlpha = 1;
  g.fillStyle = 'rgba(18,5,46,.18)'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = Math.max(1, dpr); g.strokeRect(cam.x * sx, cam.y * sy, sw / cam.s * sx, sh / cam.s * sy);
  V.items.forEach(it => D.circle(g, it.x * sx, it.y * sy, 2 * dpr, '#fff6b0'));
  V.players.forEach((p, i) => {
    const me = i === V.me, f = V.fx[i] || {};
    if (!me && f.inv > now) return;
    const pos = posOf(i), x = pos.x * sx, y = pos.y * sy, r = (me ? 4.2 : 3.4) * dpr;
    if (vChaser(V, i) && V.phase === 'play') D.circle(g, x, y, r + (2 + Math.sin(t / 150) * 1.5) * dpr, null, V.mode === 'dondurma' ? '#5ad1ff' : V.mode === 'patates' ? '#ff5a3c' : '#ffd84a', 1.5 * dpr);
    D.circle(g, x, y, r, V.out[i] ? '#6d6577' : p.color, me ? '#ffffff' : V.frozen[i] ? '#bff3ff' : '#1a0b3d', (me ? 2 : 1.2) * dpr);
  });
}
function frame() {
  raf = 0; if (!root || !cv) return;
  raf = requestAnimationFrame(frame);
  if (!V || !scene) return;
  const t = pnow(), dt = clamp((t - (lastT || t)) / 1000, 0, .25); lastT = t; frameN++;
  stepMe(dt, t); stepRemotes(dt, t); stepParts(dt); claims(t); camFollow(dt);
  draw(t);
  if (frameN % 3 === 0) drawMini();
}

/* ---- HUD ---- */
function ebeSecs(v, i) { return Math.max(0, (v.ebeMs[i] || 0) + (v.mode === 'ebe' && v.phase === 'play' && v.it === i ? hostClock() - v.itSince : 0)) / 1000; }
function tagFor(v, i) {
  if (v.mode === 'ebe') return v.it === i ? '<span class="kv-tag ebe">👑 Ebe</span>' : '';
  if (v.mode === 'patates') return v.out[i] ? '<span class="kv-tag bad">💥</span>' : v.it === i ? '<span class="kv-tag hot">💣</span>' : '';
  return v.ebes.includes(i) ? '<span class="kv-tag ice">❄️ Ebe</span>' : v.frozen[i] ? '<span class="kv-tag frz">🧊</span>' : '';
}
function chipVal(v, i) { return v.mode === 'ebe' ? `${Math.floor(ebeSecs(v, i))}<small>sn</small>` : `${v.players[i].score}`; }
function renderHud() {
  const v = V, me = v.me;
  const ck = JSON.stringify([v.players.map(p => [p.name, p.online, p.score]), v.it, v.ebes, v.frozen, v.out, me, v.phase, v.mode, v.round]);
  if (ck !== chipKey) {
    chipKey = ck;
    q('.kv-players').classList.toggle('compact', v.players.length > 4);
    q('.kv-players').innerHTML = v.players.map((p, i) => `<div class="g-chip kv-chip ${vChaser(v, i) && v.phase !== 'end' ? 'active' : ''} ${i === me ? 'me' : ''} ${!p.online || v.out[i] ? 'off' : ''}" style="--pc:${p.color}" title="${esc(ANIMAL_NAMES[p.an] || '')}">
      <span class="av" style="--pc:${p.color}">${initial(p.name)}</span><b>${esc(p.name)}${i === me ? '<small> · sen</small>' : ''}</b>${tagFor(v, i)}<span class="g-num kv-val" data-i="${i}" title="${v.mode === 'ebe' ? 'Bu turdaki Ebe süresi' : 'Toplam puan'}">${chipVal(v, i)}</span></div>`).join('');
  }
  const nm = i => (v.players[i] ? `<b style="color:${v.players[i].color}">${esc(v.players[i].name)}</b>` : '?');
  let st = '', cls = '';
  const out = me >= 0 && v.out[me], fr = me >= 0 && v.frozen[me], ch = me >= 0 && vChaser(v, me);
  if (v.phase === 'count') st = me < 0 ? '👀 Tur başlıyor…' : ch ? (v.mode === 'patates' ? '💣 Bomba sende! Başlayınca birine dokun' : v.mode === 'dondurma' ? '❄️ Dondurucu sensin! Hazırlan…' : '👑 Ebe sensin! Hazırlan…') : '⏳ Hazırlan, birazdan koşuyoruz!';
  else if (v.phase === 'play') {
    if (me < 0) st = '👀 İzliyorsun';
    else if (v.mode === 'ebe') { if (ch) { st = '👑 EBE SENSİN! Birine dokun'; cls = 'mine'; } else st = `🏃 Kaç! Ebe: ${nm(v.it)}`; }
    else if (v.mode === 'patates') {
      if (out) st = '💥 PUF! Elendin — izliyorsun';
      else if (ch) { st = '💣 BOMBA SENDE! Hemen birine dokun!'; cls = 'mine hot'; }
      else st = v.it >= 0 ? `💣 Bomba: ${nm(v.it)} — uzak dur!` : '💣 Yeni bomba geliyor…';
    } else {
      const run = v.players.map((_, i) => i).filter(i => !v.ebes.includes(i)), nf = run.filter(i => v.frozen[i]).length;
      if (ch) { st = `❄️ DONDURUCU SENSİN! Donan: ${nf}/${run.length}`; cls = 'mine ice'; }
      else if (fr) st = '🧊 Dondun! Bir arkadaşın dokunup çözsün';
      else st = `🏃 Kaç ve donanları çöz! Donan: ${nf}/${run.length}`;
    }
  } else if (v.phase === 'end') { st = `🏁 Tur ${v.round}/${v.rounds} bitti!`; cls = 'win'; }
  else { st = '🏆 Oyun bitti!'; cls = 'win'; }
  q('.kv-status').innerHTML = `<span class="g-turn ${cls}">${st}</span>`;
  const md = MODES[v.mode]; q('.kv-mode').textContent = `${md.icon} ${md.name} · ${v.round}/${v.rounds}`;
}
function renderSide() {
  const v = V, side = q('.kv-side'); if (!side) return;
  const key = `${v.mode}:${v.pu}:${v.mapId}`;
  if (key !== sideKey) {
    sideKey = key;
    const rules = {
      ebe: ['👑 Ebe birine dokununca ebelik ona geçer.', '⏱ En az süre Ebe kalan kazanır (puan = Ebe olmadığın saniye).', '🔁 Yeni Ebe seni 2 saniye geri ebeleyemez.', '⚡ Ebe %5 daha hızlı koşar.'],
      patates: ['💣 Bomba dokunarak geçer; fitili gizli (20–40 sn).', '💥 Patladığında tutan elenir, yeni bomba gelir.', '🏆 Son kalan kazanır. Süre bitince ANİ ÖLÜM: fitiller kısalır!', '🔁 Bombayı az önce verene 2 saniye geri veremezsin.'],
      dondurma: ['❄️ Dondurucular dokunarak dondurur.', '🤝 Donmamış oyuncular donmuşlara dokunarak çözer.', '🏆 Süre bitmeden herkes donarsa dondurucular, yoksa kaçanlar kazanır.']
    }[v.mode];
    const md = MODES[v.mode], map = MAPS[v.mapId];
    side.innerHTML = `<h3 class="kv-h">${md.icon} ${esc(md.name)}</h3><p class="kv-map">${map.icon} ${esc(map.name)}${v.mapId === 'buz' ? ' · buz kaygandır, erken fren yap!' : v.mapId === 'park' ? ' · kum havuzunda yavaşlarsın' : ' · dar geçitlerde dikkat!'}</p>
      <ul class="kv-rules">${rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
      ${v.pu ? `<div class="kv-legend"><span class="kv-lh">Güçlendirmeler</span>${ITEM_IDS.map(k => `<div class="kv-li"><canvas data-ic="${k}" width="64" height="64"></canvas><span><b>${esc(ITEMS[k].name)}</b><small>${esc({ hiz: '4 sn çok hızlı koşarsın', gorunmez: '3 sn neredeyse görünmezsin', muz: 'Yere at, basan kayar', kalkan: 'Bir dokunuşu engeller', isin: 'Baktığın yöne ışınlan' }[k])}</small></span></div>`).join('')}</div>` : '<p class="kv-sub">Güçlendirmeler kapalı.</p>'}
      <p class="kv-keys">${isTouch() ? '👆 Ekranda parmağını sürükleyerek koş · sağ alttaki düğmeyle gücü kullan' : '⌨️ <b>WASD / oklar</b> ile koş · <b>Boşluk</b> ile gücü kullan · fareyle sürükleyerek de koşabilirsin'}</p>
      <div class="kv-board"></div>`;
    side.querySelectorAll('canvas[data-ic]').forEach(c => { const g = c.getContext('2d'); g.clearRect(0, 0, 64, 64); g.translate(32, 32); drawItemIcon(g, c.dataset.ic, 1.7); });
  }
  const rows = v.players.map((p, i) => ({ p, i })).sort((a, b) => b.p.score - a.p.score);
  q('.kv-board').innerHTML = `<span class="kv-lh">Puan durumu${v.rounds > 1 ? ` · tur ${v.round}/${v.rounds}` : ''}</span><ol class="kv-res">${rows.map(({ p, i }) => `<li style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><span class="kv-rn"><b>${esc(p.name)}${i === v.me ? ' (sen)' : ''}</b><small>${esc(ANIMAL_NAMES[p.an] || '')}${p.isBot ? ' · bilgisayar' : ''}</small></span><span class="kv-pts">${p.score}${v.mode === 'ebe' ? ' sn' : ''}</span></li>`).join('')}</ol>`;
}
function renderOverlays() {
  const v = V, me = v.me;
  // geri sayım kartı
  const cnt = q('.kv-count');
  if (v.phase === 'count') {
    const md = MODES[v.mode], map = MAPS[v.mapId], ch = me >= 0 && vChaser(v, me);
    const who = v.mode === 'dondurma' ? `Dondurucu: ${v.ebes.map(i => `<b style="color:${v.players[i].color}">${esc(v.players[i].name)}</b>`).join(', ')}` : `${v.mode === 'ebe' ? 'Ebe' : 'Bomba'}: <b style="color:${v.players[v.it] ? v.players[v.it].color : '#fff'}">${v.players[v.it] ? esc(v.players[v.it].name) : '?'}</b>`;
    const role = me < 0 ? 'İzle ve eğlen!' : ch ? (v.mode === 'ebe' ? '👑 EBE SENSİN!' : v.mode === 'patates' ? '💣 BOMBA SENDE!' : '❄️ DONDURUCU SENSİN!') : (v.mode === 'ebe' ? '🏃 Ebe\'den kaç!' : v.mode === 'patates' ? '🏃 Bombadan uzak dur!' : '🏃 Kaç, donanları çöz!');
    cnt.innerHTML = `<div class="kv-ccard"><small>TUR ${v.round}/${v.rounds} · ${map.icon} ${esc(map.name)}</small><h3>${md.icon} ${esc(md.name)}</h3><p class="kv-cwho">${who}</p><p class="kv-crole ${ch ? 'me' : ''}">${role}</p><b class="kv-cnum">3</b><p class="kv-chint">${isTouch() ? 'Ekranı sürükleyerek koş' : 'WASD / oklarla koş'}</p></div>`;
    cnt.hidden = false;
  } else cnt.hidden = true;
  // tur sonu kartı
  const en = q('.kv-end');
  if ((v.phase === 'end' || v.phase === 'over') && v.last) {
    const L = v.last, rows = L.rows.slice().sort((a, b) => b.pts - a.pts);
    let h3, sub = '';
    if (v.mode === 'ebe') { h3 = '⏱ Süre doldu!'; sub = 'En az Ebe kalan kazanır'; }
    else if (v.mode === 'patates') { h3 = L.winner >= 0 ? `🏆 Son kalan: ${esc(v.players[L.winner].name)}` : '🏁 Tur bitti'; sub = 'Dayandığın her saniye 1 puan'; }
    else { h3 = L.win === 'ebe' ? '❄️ Herkes dondu!' : '⏱ Süre doldu!'; sub = L.win === 'ebe' ? 'Dondurucular kazandı' : 'Kaçanlar kazandı'; }
    en.innerHTML = `<div class="kv-ecard"><small>TUR ${L.round}/${v.rounds}</small><h3>${h3}</h3><p class="kv-esub">${sub}</p>
      <ol class="kv-res">${rows.map(r => { const p = v.players[r.pi]; return `<li class="${r.win ? 'win' : ''}" style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><span class="kv-rn"><b>${r.win ? '🏆 ' : ''}${esc(p.name)}${r.pi === me ? ' (sen)' : ''}</b><small>${esc(r.note)}</small></span><span class="kv-pts">+${r.pts}</span></li>`; }).join('')}</ol>
      <p class="kv-enext">${v.phase === 'over' ? 'Sonuçlar geliyor…' : v.round < v.rounds ? 'Sıradaki tur birazdan başlıyor…' : 'Sonuçlar geliyor…'}</p></div>`;
    en.hidden = false;
  } else en.hidden = true;
  // güç düğmesi
  const f = me >= 0 ? v.fx[me] : null, item = f && f.item;
  const k2 = `${item}:${me}`;
  if (k2 !== lastItemKey) {
    lastItemKey = k2;
    const g = itemCv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 96, 96);
    if (item) { g.translate(48, 46); drawItemIcon(g, item, 2.3); }
    itemBtn.querySelector('span').textContent = item ? ITEMS[item].short : 'Boş';
    if (item && v.phase === 'play') { itemBtn.classList.remove('got'); void itemBtn.offsetWidth; itemBtn.classList.add('got'); }
  }
  itemBtn.disabled = !item || v.phase !== 'play' || v.frozen[me] || v.out[me];
  itemBtn.hidden = me < 0 || !v.pu;
}
function hudTick() {
  if (!V || !root) return;
  const v = V, now = hostClock(), left = Math.max(0, v.endsAt - now), secs = Math.ceil(left / 1000);
  const tm = q('.kv-timer'), tb = tm.querySelector('b');
  const sudden = v.mode === 'patates' && v.sudden;
  tb.textContent = v.phase === 'play' ? (sudden ? 'ANİ ÖLÜM' : mmss(secs)) : v.phase === 'count' ? mmss(v.dur) : '—';
  tm.classList.toggle('urgent', v.phase === 'play' && (sudden || secs <= 10));
  tm.title = v.mode === 'patates' ? 'Ani ölüme kalan süre' : 'Turun bitmesine kalan süre';
  const bar = q('.kv-bar i'); if (bar) bar.style.width = (v.phase === 'play' && !sudden ? clamp(left / (v.phaseDur || 1), 0, 1) * 100 : v.phase === 'count' ? 100 : 0) + '%';
  const cn = q('.kv-cnum'); if (cn && v.phase === 'count') cn.textContent = Math.max(1, secs);
  if (secs !== lastSec) {
    if (v.phase === 'count' && secs > 0 && secs <= 3) Sound.tick(.8);
    else if (v.phase === 'play' && v.mode !== 'patates' && secs <= 5 && secs > 0) Sound.tick(.6);
    lastSec = secs;
  }
  if (v.phase === 'play' && v.mode === 'patates' && v.it === v.me && v.me >= 0 && pnow() - bombTickAt > 520) { bombTickAt = pnow(); snd.fuse(); }
  if (v.mode === 'ebe') root.querySelectorAll('.kv-val[data-i]').forEach(el => { const s = `${Math.floor(ebeSecs(v, +el.dataset.i))}<small>sn</small>`; if (el.innerHTML !== s) el.innerHTML = s; });
  // etkin güçler
  const me = v.me, fxEl = q('.kv-fx');
  if (fxEl) {
    const f = me >= 0 ? v.fx[me] : null, chips = [];
    if (f && v.phase === 'play') {
      if (f.spd > now) chips.push(`<span class="kv-fxc spd">👟 ${Math.ceil((f.spd - now) / 1000)}</span>`);
      if (f.inv > now) chips.push(`<span class="kv-fxc inv">👻 ${Math.ceil((f.inv - now) / 1000)}</span>`);
      if (f.sh) chips.push('<span class="kv-fxc sh">🛡️ Kalkan</span>');
      if (v.imm[me] > now) chips.push('<span class="kv-fxc imm">✨ Korumada</span>');
      if (v.noBack && v.noBack.b === me && v.noBack.until > now && vChaser(v, v.noBack.a)) chips.push('<span class="kv-fxc imm">🔁 Geri ebelenemezsin</span>');
    }
    const s = chips.join(''); if (fxEl.innerHTML !== s) fxEl.innerHTML = s;
  }
  if (pnow() - layoutAt > 1500) { layoutAt = pnow(); layout(); }
}
function render(v) {
  V = v;
  if (!v || !v.mapId || !root) return;
  ensureScene(v.mapId);
  const me = v.me;
  if (v.spawnVer !== seenSpawn) {
    seenSpawn = v.spawnVer; rp = [];
    v.pos.forEach((p, i) => { rp[i] = mkRemote(p); });
    av = me >= 0 ? { x: v.pos[me][0], y: v.pos[me][1], vx: 0, vy: 0, h: v.pos[me][2], walk: 0, ph: 0 } : null;
    parts = []; claimAt = {}; snapCam = true; wasFrozen = false;
  }
  if (me >= 0 && !av) av = { x: v.pos[me][0], y: v.pos[me][1], vx: 0, vy: 0, h: v.pos[me][2], walk: 0, ph: 0 };
  const fr = me >= 0 && (v.frozen[me] || v.out[me]);
  if (fr && !wasFrozen && av) { av.x = v.pos[me][0]; av.y = v.pos[me][1]; av.vx = av.vy = 0; }
  wasFrozen = fr;
  if (me >= 0 && v.fx[me] && v.fx[me].slip && v.fx[me].slip !== wasSlip) {
    wasSlip = v.fx[me].slip;
    if (av) { const s = Math.hypot(av.vx, av.vy); if (s < 140) { av.vx += Math.cos(av.h) * 150; av.vy += Math.sin(av.h) * 150; } }
  }
  const key = `${v.round}:${v.phase}`;
  if (key !== seenKey) { seenKey = key; lastSec = -1; if (v.phase === 'count') requestAnimationFrame(resize); }
  root.querySelector('.kv').dataset.phase = v.phase;
  root.querySelector('.kv').dataset.mode = v.mode;
  renderHud(); renderSide(); renderOverlays(); hudTick();
  if (!raf) raf = requestAnimationFrame(frame);
}

/* ---- olaylar ---- */
function onEvent(e) {
  if (!root || !V) return;
  const me = ui ? ui.me : -1, t = pnow();
  const P = i => (V.players[i] ? V.players[i].name : '?');
  const at = (x, y) => { if (!cv) return null; const c = toClient(x, y); return c; };
  if (e.t === 'round') { Sound.special(); }
  else if (e.t === 'go') { pop('KOŞ!', 'good'); Sound.stop(); Sound.whoosh(); }
  else if (e.t === 'tag') {
    const pa = posOf(e.a), pb = posOf(e.b), x = (pa.x + pb.x) / 2, y = (pa.y + pb.y) / 2;
    const txt = { ebe: 'TOP!', pass: 'TOP!', freeze: 'BUZ!', thaw: 'ÇÖZ!' }[e.kind] || 'TOP!';
    const col = { ebe: '#ffe14a', pass: '#ff9a3c', freeze: '#bff3ff', thaw: '#8dffb0' }[e.kind];
    anims.push({ k: 'text', x, y, txt, col, stroke: e.kind === 'freeze' ? '#1a4a7a' : '#5a1a00', start: t, dur: 1000 }, { k: 'ring', x, y, col, start: t, dur: 500, r: 70 });
    burstParts(x, y - 10, 14, e.kind === 'freeze' ? ['#ffffff', '#bff3ff', '#7fd6ff'] : e.kind === 'thaw' ? ['#8dffb0', '#ffffff', '#ffe14a'] : ['#ffe14a', '#ff9a3c', '#ffffff'], 170, e.kind === 'freeze' ? 'spark' : 'dust');
    if (e.kind === 'freeze') { snd.freeze(); if (e.b === me) { pop('DONDUN!', 'ice'); flash('bad'); } }
    else if (e.kind === 'thaw') { snd.thaw(); if (e.b === me) { pop('ÇÖZÜLDÜN!', 'good'); Sound.good(); } else if (e.a === me) Sound.good(); }
    else {
      snd.pop();
      if (e.b === me) { pop(e.kind === 'ebe' ? 'EBE SENSİN!' : 'BOMBA SENDE!', 'bad'); Sound.bad(); flash('bad'); }
      else if (e.a === me) { pop(e.kind === 'ebe' ? 'KURTULDUN!' : 'BOMBAYI VERDİN!', 'good'); Sound.good(); }
    }
    const c = at(x, y); if (c && (e.a === me || e.b === me)) FX.burst(c[0], c[1], 26, e.kind !== 'freeze');
  } else if (e.t === 'shield') {
    anims.push({ k: 'ring', x: e.x, y: e.y, col: '#8cc4ff', start: t, dur: 600, r: 80 }, { k: 'text', x: e.x, y: e.y, txt: 'KALKAN!', col: '#bfe0ff', stroke: '#1a3a7a', start: t, dur: 1000, size: 22 });
    Sound.special(); if (e.b === me) toast('🛡️ Kalkanın seni korudu!', 'ok');
  } else if (e.t === 'pick') {
    burstParts(e.x, e.y - 6, 12, ['#fff6b0', '#ffffff', ITEMS[e.k] ? ITEMS[e.k].col : '#fff'], 140);
    anims.push({ k: 'ring', x: e.x, y: e.y - 6, col: '#fff6b0', start: t, dur: 450, r: 40 });
    if (e.pi === me) { Sound.buy(); toast(`${ITEMS[e.k].name}${ITEMS[e.k].held ? ' — düğmeyle kullan!' : '!'}`, 'ok'); }
    else Sound.tick(.3);
  } else if (e.t === 'use') {
    if (e.k === 'isin') {
      if (e.pi !== me) { anims.push({ k: 'poof', x: e.x0, y: e.y0, start: t, dur: 600, col: '#c77dff' }, { k: 'poof', x: e.x, y: e.y, start: t, dur: 600, col: '#c77dff' }); const r = rp[e.pi]; if (r) { r.x = e.x; r.y = e.y; r.buf = []; r.p0 = null; } snd.tp(); }
    } else { snd.peel(); if (e.pi === me) toast('🍌 Muz kabuğu bırakıldı', 'ok'); }
  } else if (e.t === 'nouse') { if (e.pi === me) toast('Şu an kullanılamıyor', 'bad'); }
  else if (e.t === 'slip') {
    anims.push({ k: 'stars', pi: e.pi, start: t, dur: SLIP_MS }, { k: 'text', x: e.x, y: e.y, txt: 'KAYDI!', col: '#ffe14a', start: t, dur: 900, size: 20 });
    snd.slip(); if (e.pi === me) { toast('🍌 Muza bastın!', 'bad'); }
  } else if (e.t === 'boom') {
    anims.push({ k: 'boom', x: e.x, y: e.y, start: t, dur: 1300 });
    burstParts(e.x, e.y, 26, ['#2d2340', '#6d6577', '#ffb627', '#ff5a3c'], 260, 'dust');
    snd.boom();
    if (e.pi === me) { pop('PUF!', 'bad'); flash('bad'); Sound.bankrupt(); }
    else pop(`PUF! ${P(e.pi).toLocaleUpperCase('tr-TR')}`, 'pink');
    const c = at(e.x, e.y); if (c) FX.burst(c[0], c[1], 40, true);
  } else if (e.t === 'bomb') { if (e.pi === me) { pop('BOMBA SENDE!', 'bad'); Sound.special(); } else Sound.tick(.5); }
  else if (e.t === 'sudden') { pop('ANİ ÖLÜM!', 'bad'); Sound.bad(); }
  else if (e.t === 'handoff') { if (e.pi === me) pop(V.mode === 'patates' ? 'BOMBA SENDE!' : V.mode === 'dondurma' ? 'DONDURUCU SENSİN!' : 'EBE SENSİN!', 'bad'); }
  else if (e.t === 'roundEnd') {
    Sound.solve();
    const won = Array.isArray(e.wins) && e.wins.includes(me);
    pop(won ? 'KAZANDIN!' : (V.mode === 'dondurma' ? (e.win === 'ebe' ? 'HERKES DONDU!' : 'SÜRE DOLDU!') : 'TUR BİTTİ'), won ? 'good' : 'pink');
    if (won) FX.confetti(70);
  }
}

/* ---- giriş ---- */
function onDown(e) {
  if (e.target.closest && e.target.closest('button')) return;
  if (!V || V.me < 0 || joy.on) return;
  e.preventDefault(); Sound.init();
  const r = stageEl.getBoundingClientRect();
  joy.on = true; joy.id = e.pointerId; joy.bx = e.clientX - r.left; joy.by = e.clientY - r.top; joy.dx = joy.dy = 0;
  try { stageEl.setPointerCapture(e.pointerId); } catch { /* */ }
  if (joyEl) { joyEl.hidden = false; joyEl.style.left = joy.bx + 'px'; joyEl.style.top = joy.by + 'px'; joyEl.querySelector('i').style.transform = ''; }
  const hint = q('.kv-joyhint'); if (hint) hint.hidden = true;
}
function onMove(e) {
  if (!joy.on || e.pointerId !== joy.id) return;
  const r = stageEl.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  let dx = (x - joy.bx) / JR, dy = (y - joy.by) / JR; const l = Math.hypot(dx, dy);
  if (l > 1.25) { joy.bx = x - dx / l * JR * 1.25; joy.by = y - dy / l * JR * 1.25; if (joyEl) { joyEl.style.left = joy.bx + 'px'; joyEl.style.top = joy.by + 'px'; } }
  if (l > 1) { dx /= l; dy /= l; }
  const dead = Math.hypot(dx, dy) < .14;
  joy.dx = dead ? 0 : dx; joy.dy = dead ? 0 : dy;
  if (joyEl) joyEl.querySelector('i').style.transform = `translate(${dx * JR * .7}px, ${dy * JR * .7}px)`;
}
function onUp(e) { if (e.pointerId !== joy.id) return; joy.on = false; joy.id = null; joy.dx = joy.dy = 0; if (joyEl) joyEl.hidden = true; }
function onKey(e) {
  if (!V || !root || (e.target && e.target.closest && e.target.closest('input,textarea,select'))) return;
  const codes = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'];
  if (e.type === 'keydown') {
    if (codes.includes(e.code)) { keys.add(e.code); if (V.me >= 0) e.preventDefault(); }
    else if ((e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') && V.me >= 0 && V.phase === 'play') { e.preventDefault(); if (!e.repeat) useItemUI(); }
  } else keys.delete(e.code);
}
function onBlur() { keys.clear(); joy.on = false; joy.dx = joy.dy = 0; if (joyEl) joyEl.hidden = true; }

function mount(r, api) {
  root = r; ui = api; uiRef = api; V = null; scene = null; av = null; rp = []; keys = new Set(); parts = []; anims = [];
  seenSpawn = -1; seenKey = ''; chipKey = ''; sideKey = ''; lastItemKey = ''; claimAt = {}; dustAt = {}; lastT = 0; wasFrozen = false; wasSlip = 0; snapCam = true;
  root.innerHTML = `<div class="g-wrap kv">
    <div class="kv-hud"><div class="kv-players"></div><div class="kv-status"></div></div>
    <div class="kv-main">
      <div class="kv-stage">
        <canvas class="kv-cv" aria-label="Kovalamaca arenası"></canvas>
        <div class="kv-tl"><span class="kv-mode"></span><span class="kv-timer">⏱ <b>0:00</b></span><div class="kv-bar"><i></i></div><div class="kv-fx"></div></div>
        <canvas class="kv-mini" aria-label="Mini harita"></canvas>
        <div class="kv-joy" hidden><i></i></div>
        <div class="kv-joyhint" hidden><i></i><span>Sürükle ve koş</span></div>
        <button type="button" class="kv-item" disabled aria-label="Güçlendirmeyi kullan"><canvas width="96" height="96"></canvas><span>Boş</span></button>
        <div class="kv-pop" aria-live="polite"></div>
        <div class="kv-toast" aria-live="polite"></div>
        <div class="kv-count" hidden></div>
        <div class="kv-end" hidden></div>
      </div>
      <aside class="kv-side g-panel"></aside>
    </div>
  </div>`;
  cv = q('.kv-cv'); cg = cv.getContext('2d'); stageEl = q('.kv-stage'); miniCv = q('.kv-mini'); itemBtn = q('.kv-item'); itemCv = itemBtn.querySelector('canvas'); joyEl = q('.kv-joy');
  if (isTouch()) q('.kv-joyhint').hidden = false;
  stageEl.addEventListener('pointerdown', onDown); stageEl.addEventListener('pointermove', onMove);
  stageEl.addEventListener('pointerup', onUp); stageEl.addEventListener('pointercancel', onUp);
  stageEl.addEventListener('contextmenu', e => e.preventDefault());
  itemBtn.addEventListener('pointerdown', e => e.stopPropagation());
  itemBtn.addEventListener('click', e => { e.preventDefault(); useItemUI(); });
  if (window.ResizeObserver) { ro = new ResizeObserver(() => resize()); ro.observe(stageEl); }
  addEventListener('resize', resize);
  document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKey); addEventListener('blur', onBlur);
  hudT = setInterval(hudTick, 150);
  requestAnimationFrame(resize);
}
function unmount() {
  removeEventListener('resize', resize); removeEventListener('blur', onBlur);
  document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKey);
  if (ro) { ro.disconnect(); ro = null; }
  clearInterval(hudT); clearTimeout(popT); clearTimeout(toastT); if (raf) cancelAnimationFrame(raf);
  raf = 0; root = null; ui = null; uiRef = null; V = null; cv = null; cg = null; stageEl = null; miniCv = null; itemBtn = null; itemCv = null; joyEl = null; scene = null; av = null; rp = [];
}

CFX.registerGame(Object.assign({
  id: 'kovalamaca', name: 'Kovalamaca', icon: '🏃', color: '#ff7a59', min: 2, max: 8, hotseat: false, bot: true, localMin: 1,
  tagline: 'Koş, kaç, dokun: üç modlu canlı ebelemece!',
  rules: 'Gerçek zamanlı kovalamaca: Ebelemece\'de Ebe birine dokunarak ebeliği devreder ve en az Ebe kalan kazanır. Sıcak Patates\'te fitili gizli bomba dokunarak geçer; patladığında elinde tutan elenir, son kalan kazanır. Dondurmaca\'da Ebeler dokunarak dondurur, arkadaşların dokunup çözer.',
  options: [
    { key: 'mod', label: 'Mod', def: 'ebe', choices: [{ v: 'ebe', label: '👑 Ebelemece' }, { v: 'patates', label: '💣 Sıcak Patates' }, { v: 'dondurma', label: '❄️ Dondurmaca' }] },
    { key: 'sure', label: 'Süre', def: '90', choices: [{ v: '60', label: '60 sn' }, { v: '90', label: '90 sn' }, { v: '120', label: '120 sn' }, { v: '180', label: '180 sn' }] },
    { key: 'harita', label: 'Harita', def: 'park', choices: [{ v: 'park', label: '🛝 Oyun Parkı' }, { v: 'buz', label: '⛸️ Buz Pisti' }, { v: 'labirent', label: '🌿 Labirent Bahçe' }, { v: 'rastgele', label: '🎲 Rastgele' }] },
    { key: 'guc', label: 'Güçlendirmeler', def: '1', choices: [{ v: '1', label: 'Açık' }, { v: '0', label: 'Kapalı' }] },
    { key: 'tur', label: 'Tur sayısı', def: '1', choices: [{ v: '1', label: '1 tur' }, { v: '3', label: '3 tur' }] }
  ],
  mount, render, onEvent, onFast, unmount,
  // test ve geliştirme için dışa açık yardımcılar
  _kv: { MAPS, ITEMS, W, H, R, TAG_R, TAG_TOL, NOBACK_MS, FUSE_MIN, FUSE_MAX, BASE, circleFree, moveBody, dashTarget, navOf, bfs, cellOf, NX, NY, NC, touch, claimTouch, applyPos, useItem, explode, endRound, startRound,
    cam: () => cam, av: () => av, rp: () => rp, toClient: (x, y) => (cv ? toClient(x, y) : null), keys: () => keys, scene: () => scene }
}, RULES));
})();
