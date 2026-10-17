/* =========================================================================
   OYUN SALONU — BUKALEMUN SAKLAMBAÇ
   Saklananlar haritada bir yer seçer, bir eşyaya dönüşür (şekil, açı, boy)
   ve kendini boyar; Ebe gözlerini kapatıp sayar, sonra süre ve arama hakkı
   bitene kadar şüphelendiği yerleri arar. Her tur Ebe değişir.
   Haritalar (Lunapark, Mutfak, Orman Kampı) tuvale kodla çizilir; süsler ve
   kılık değiştirmiş oyuncular AYNI çizim fonksiyonuyla çizildiği için iyi
   saklanan biri gerçekten bir süs eşyası gibi görünür.
   Gizlilik: saklanma evresinde Ebe'nin görüntüsünde hiçbir saklananın yeri
   yoktur; arama evresinde kılıklar isim/kimlik olmadan, karışık sırayla gider.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial } = window.CFX;

/* ------------------------------------------------------------------ yardımcılar */
const W = 1600, H = 1000;                   // dünya boyutu (harita birimi)
const PROBE_R = 48;                         // arama dairesinin yarıçapı
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pickR = arr => arr[Math.floor(Math.random() * arr.length)];
const shuf = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const TAU = Math.PI * 2;
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const HEX = /^#[0-9a-f]{6}$/i;
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
const shade = (h, t) => t < 0 ? mix(h, '#140a1e', -t) : mix(h, '#ffffff', t);
const cdist = (a, b) => { const x = hex2rgb(a), y = hex2rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) / 441.7; };
const jitterColor = (h, amt) => { const c = hex2rgb(h); const d = rnd(-amt, amt) * 255; return rgb2hex(c[0] + d + rnd(-6, 6), c[1] + d + rnd(-6, 6), c[2] + d + rnd(-6, 6)); };

/* ------------------------------------------------------------------ renkler ve desenler */
const PALETTE = [
  '#ffffff', '#f6e7c8', '#e0a868', '#b98a5a', '#7a4a2a', '#2d2d3a',
  '#8a9099', '#c9ced6', '#ff4f6d', '#d63a3a', '#ff8fc8', '#c9a0ff',
  '#ff9a3c', '#ffd84a', '#fff27a', '#b6e35a', '#5cc85a', '#2f8f4e',
  '#2bd9c0', '#4fb7f0', '#3d6bff', '#27357a', '#9b5cff', '#86d061'
];
const PATS = [
  { id: 'duz', name: 'Düz' }, { id: 'cizgili', name: 'Çizgili' }, { id: 'puan', name: 'Puantiyeli' },
  { id: 'kare', name: 'Kareli' }, { id: 'benek', name: 'Benekli' }
];
const PAT_IDS = PATS.map(p => p.id);

/* ------------------------------------------------------------------ eşya şekilleri
   Her şekil yerel koordinatta (yarıçap = 100) SVG yol verisiyle tanımlanır.
   Parça rolleri: body (ana renk + desen), c1/c1d/c1l, c2/c2d/c2l, #renk,
   hl (parlama), glow (ışık halesi). w verilirse parça çizgi olarak çizilir.     */
const SHAPES = {
  balon: { name: 'Balon', r: 30, parts: () => [
    { d: 'M0 58 Q16 78 -4 96 T6 128', r: '#6b6478', w: 4, no: 1 },
    { d: 'M-10 60 L10 60 L0 46 Z', r: 'c1d' },
    { d: 'M0 -100 C36 -100 62 -68 62 -27 C62 15 30 48 0 50 C-30 48 -62 15 -62 -27 C-62 -68 -36 -100 0 -100Z', r: 'body' },
    { e: [-27, -58, 11, 20, .35], r: 'hl' }] },
  top: { name: 'Top', r: 26, parts: () => [
    { e: [0, 0, 90, 90, 0], r: 'body' },
    { d: 'M-88 -8 Q0 30 88 -8', r: 'c1d', w: 5, no: 1, a: .35 },
    { e: [-32, -38, 20, 12, -.6], r: 'hl' }] },
  varil: { name: 'Varil', r: 32, parts: () => [
    { d: 'M-56 -80 Q-70 0 -56 82 Q0 96 56 82 Q70 0 56 -80 Z', r: 'body' },
    { d: 'M-64 -50 L64 -50 L66 -34 L-66 -34 Z', r: 'c2' },
    { d: 'M-66 32 L66 32 L64 48 L-64 48 Z', r: 'c2' },
    { e: [0, -80, 56, 15, 0], r: 'c1d' },
    { e: [0, -80, 40, 9, 0], r: 'c1l', no: 1 }] },
  cop: { name: 'Çöp kutusu', r: 30, parts: () => [
    { d: 'M-58 -52 L58 -52 L46 92 L-46 92 Z', r: 'body' },
    { d: 'M-28 -40 L-22 84 M0 -40 L0 86 M28 -40 L22 84', r: 'c1d', w: 6, no: 1, a: .55 },
    { rr: [-70, -74, 140, 26, 11], r: 'c2' },
    { rr: [-20, -90, 40, 18, 8], r: 'c2d' }] },
  lamba: { name: 'Lamba', r: 44, parts: () => [
    { e: [0, -48, 72, 72, 0], r: 'glow' },
    { d: 'M-34 96 L34 96 L22 74 L-22 74 Z', r: 'c2' },
    { rr: [-7, -40, 14, 118, 5], r: 'c2' },
    { d: 'M-36 -30 L36 -30 L26 -72 L-26 -72 Z', r: 'body' },
    { rr: [-30, -34, 60, 10, 4], r: 'c2d' },
    { d: 'M-40 -70 L40 -70 L0 -102 Z', r: 'c2' }] },
  icecek: { name: 'İçecek', r: 28, parts: () => [
    { d: 'M14 -64 L36 -116', r: 'c2l', w: 10 },
    { d: 'M-55 -50 L55 -50 L42 92 L-42 92 Z', r: 'body' },
    { rr: [-63, -68, 126, 24, 11], r: 'c2' }] },
  hediye: { name: 'Hediye kutusu', r: 30, parts: () => [
    { d: 'M-70 -40 L70 -40 L70 90 L-70 90 Z', r: 'body' },
    { rr: [-80, -62, 160, 30, 6], r: 'body' },
    { d: 'M-13 -62 L13 -62 L13 90 L-13 90 Z', r: 'c2' },
    { d: 'M-70 16 L70 16 L70 38 L-70 38 Z', r: 'c2' },
    { d: 'M0 -62 C-34 -104 -60 -70 0 -62 Z M0 -62 C34 -104 60 -70 0 -62 Z', r: 'c2' }] },
  koni: { name: 'Trafik konisi', r: 30, parts: () => [
    { rr: [-76, 66, 152, 26, 7], r: 'c1d' },
    { d: 'M-12 -92 Q0 -102 12 -92 L52 70 L-52 70 Z', r: 'body' },
    { d: 'M-25 -30 L25 -30 L31 -8 L-31 -8 Z', r: 'c2' },
    { d: 'M-38 22 L38 22 L44 44 L-44 44 Z', r: 'c2' }] },
  pamuk: { name: 'Pamuk şeker', r: 32, parts: () => [
    { rr: [-5, 0, 10, 100, 4], r: '#efe2c4' },
    { blob: [0, -40, 70, 58, 9, .13, 1], r: 'body' },
    { d: 'M-22 2 L22 2 L7 34 L-7 34 Z', r: 'c2' }] },
  semsiye: { name: 'Şemsiye', r: 46, parts: () => [
    { e: [0, 96, 26, 8, 0], r: 'c2d' },
    { rr: [-5, -24, 10, 120, 4], r: 'c2' },
    { d: 'M-100 -20 Q-92 -95 0 -100 Q92 -95 100 -20 Q75 -4 50 -20 Q25 -4 0 -20 Q-25 -4 -50 -20 Q-75 -4 -100 -20 Z', r: 'body' },
    { e: [0, -104, 7, 7, 0], r: 'c2' }] },
  tencere: { name: 'Tencere', r: 34, parts: () => [
    { rr: [-98, -26, 28, 16, 7], r: 'c1d' }, { rr: [70, -26, 28, 16, 7], r: 'c1d' },
    { d: 'M-75 -30 L75 -30 L75 50 Q75 82 45 82 L-45 82 Q-75 82 -75 50 Z', r: 'body' },
    { e: [0, -30, 80, 14, 0], r: 'c1l' },
    { d: 'M-72 -32 Q0 -90 72 -32 Z', r: 'c2' },
    { rr: [-14, -80, 28, 16, 6], r: 'c2d' }] },
  kupa: { name: 'Kupa', r: 28, parts: () => [
    { d: 'M48 -32 C98 -32 98 42 44 42', r: 'c1', w: 17 },
    { rr: [-58, -56, 108, 142, 16], r: 'body' },
    { e: [-4, -56, 50, 11, 0], r: 'c2' }] },
  sise: { name: 'Şişe', r: 34, parts: () => [
    { d: 'M-14 -72 L14 -72 L14 -40 Q40 -26 40 0 L40 82 Q40 96 27 96 L-27 96 Q-40 96 -40 82 L-40 0 Q-40 -26 -14 -40 Z', r: 'body' },
    { d: 'M-40 14 L40 14 L40 56 L-40 56 Z', r: 'c2l' },
    { rr: [-17, -94, 34, 24, 5], r: 'c2' },
    { rr: [-30, -2, 8, 70, 4], r: 'hl' }] },
  elma: { name: 'Elma', r: 24, parts: () => [
    { d: 'M0 -55 Q4 -82 12 -96', r: '#6b4a2b', w: 8 },
    { d: 'M0 -55 C25 -80 85 -70 85 -5 C85 55 45 90 20 82 C10 78 -10 78 -20 82 C-45 90 -85 55 -85 -5 C-85 -70 -25 -80 0 -55 Z', r: 'body' },
    { d: 'M8 -78 Q40 -112 64 -88 Q36 -64 8 -78 Z', r: 'c2' },
    { e: [-42, -24, 12, 20, .3], r: 'hl' }] },
  limon: { name: 'Limon', r: 24, parts: () => [
    { d: 'M-98 0 Q-80 -8 -70 -30 C-50 -72 50 -72 70 -30 Q80 -8 98 0 Q80 8 70 30 C50 72 -50 72 -70 30 Q-80 8 -98 0 Z', r: 'body' },
    { d: 'M60 -26 Q90 -64 120 -52 Q98 -18 60 -26 Z', r: 'c2' },
    { e: [-26, -30, 22, 10, -.2], r: 'hl' }] },
  saksi: { name: 'Saksı çiçeği', r: 32, parts: () => [
    { e: [-36, -42, 16, 46, -.5], r: 'c2' }, { e: [36, -42, 16, 46, .5], r: 'c2' },
    { e: [-62, -12, 14, 38, -1.1], r: 'c2' }, { e: [62, -12, 14, 38, 1.1], r: 'c2' },
    { e: [0, -62, 17, 50, 0], r: 'c2l' },
    { d: 'M-58 14 L58 14 L44 96 L-44 96 Z', r: 'body' },
    { rr: [-68, -8, 136, 26, 6], r: 'c1d' }] },
  kaktus: { name: 'Kaktüs', r: 32, parts: () => [
    { d: 'M-24 -20 L-50 -20 Q-64 -20 -64 -36 L-64 -62 Q-64 -74 -53 -74 Q-42 -74 -42 -62 L-42 -40 L-24 -40 Z', r: 'c2' },
    { d: 'M24 -40 L50 -40 Q64 -40 64 -56 L64 -78 Q64 -90 53 -90 Q42 -90 42 -78 L42 -60 L24 -60 Z', r: 'c2' },
    { rr: [-25, -96, 50, 146, 25], r: 'c2' },
    { d: 'M-8 -70 L-8 30 M8 -80 L8 30', r: 'c2d', w: 4, no: 1, a: .5 },
    { e: [0, -98, 11, 10, 0], r: '#ff6fb5' },
    { d: 'M-48 50 L48 50 L38 98 L-38 98 Z', r: 'body' },
    { rr: [-57, 34, 114, 20, 5], r: 'c1d' }] },
  havlu: { name: 'Kâğıt havlu', r: 30, parts: () => [
    { d: 'M48 -12 L64 -10 L66 74 L48 80 Z', r: 'c1l' },
    { d: 'M-50 -70 L50 -70 L50 86 Q0 100 -50 86 Z', r: 'body' },
    { e: [0, -70, 50, 14, 0], r: 'c1l' },
    { e: [0, -70, 17, 6, 0], r: 'c2d', no: 1 }] },
  caydanlik: { name: 'Çaydanlık', r: 36, parts: () => [
    { d: 'M44 -50 C102 -58 102 34 56 36', r: 'c2', w: 13 },
    { d: 'M-50 2 L-102 -46 L-90 -56 L-38 -22 Z', r: 'c1' },
    { d: 'M-58 -24 C-58 -62 58 -62 58 -24 L70 50 Q70 82 40 82 L-40 82 Q-70 82 -70 50 Z', r: 'body' },
    { d: 'M-40 -45 Q0 -86 40 -45 Z', r: 'c2' },
    { e: [0, -74, 10, 10, 0], r: 'c2d' }] },
  kavanoz: { name: 'Kavanoz', r: 28, parts: () => [
    { rr: [-56, -46, 112, 142, 22], r: 'body' },
    { rr: [-50, -76, 100, 32, 8], r: 'c2' },
    { rr: [-40, -30, 11, 92, 5], r: 'hl' }] },
  kaya: { name: 'Kaya', r: 36, parts: () => [
    { poly: [[-92, 40], [-80, -20], [-40, -62], [10, -72], [62, -48], [94, 4], [84, 56], [30, 80], [-50, 78]], r: 'body' },
    { d: 'M-24 -40 L-4 -6 L-18 30 M30 -20 L48 12', r: 'c2', w: 6, no: 1 },
    { e: [-30, -38, 26, 10, -.4], r: 'hl', a: .5 }] },
  cali: { name: 'Çalı', r: 38, parts: () => [
    { blob: [0, 6, 94, 78, 7, .15, 2], r: 'body' },
    { dots: [[-40, -20, 9], [20, -40, 8], [50, 10, 9], [-10, 30, 8], [-60, 30, 7], [30, 50, 7]], r: 'c2' }] },
  mantar: { name: 'Mantar', r: 30, parts: () => [
    { d: 'M-26 -10 L26 -10 Q32 60 38 86 Q0 98 -38 86 Q-32 60 -26 -10 Z', r: 'c2' },
    { d: 'M-94 -2 C-94 -82 94 -82 94 -2 Q60 12 0 10 Q-60 12 -94 -2 Z', r: 'body' },
    { d: 'M-70 2 Q0 20 70 2', r: 'c1d', w: 4, no: 1, a: .6 }] },
  kutuk: { name: 'Kütük', r: 34, parts: () => [
    { d: 'M-70 66 L-98 94 L-46 86 Z M70 66 L98 94 L46 86 Z', r: 'c1d' },
    { d: 'M-70 -40 L70 -40 L70 76 Q0 96 -70 76 Z', r: 'body' },
    { d: 'M-42 -24 L-44 76 M-6 -24 L-6 86 M34 -24 L38 78', r: 'c1d', w: 5, no: 1, a: .6 },
    { e: [0, -40, 70, 20, 0], r: 'c2' },
    { e: [0, -40, 44, 12, 0], r: 'c2d', w: 3, no: 1 }, { e: [0, -40, 20, 6, 0], r: 'c2d', w: 3, no: 1 }] },
  cadir: { name: 'Çadır', r: 50, parts: () => [
    { d: 'M-60 -10 L-112 92 M60 -10 L112 92', r: '#7a6a55', w: 3, no: 1 },
    { d: 'M0 -96 L102 82 L-102 82 Z', r: 'body' },
    { d: 'M0 -30 L40 82 L-40 82 Z', r: 'c2' },
    { d: 'M0 -30 L-40 82 L-58 82 Z', r: 'c2l' },
    { d: 'M0 -96 L0 -114', r: '#7a5a3a', w: 6 }] },
  fener: { name: 'Fener', r: 30, parts: () => [
    { e: [0, 0, 80, 80, 0], r: 'glow' },
    { d: 'M-28 -64 Q0 -112 28 -64', r: 'c2', w: 7, no: 1 },
    { d: 'M-44 -50 L44 -50 L28 -74 L-28 -74 Z', r: 'c2' },
    { rr: [-38, -52, 76, 104, 10], r: 'body' },
    { d: 'M0 -50 L0 50', r: 'c2', w: 6, no: 1 },
    { rr: [-48, 48, 96, 22, 6], r: 'c2' }] },
  sandik: { name: 'Sandık', r: 34, parts: () => [
    { d: 'M-82 -16 L82 -16 L82 76 Q82 84 74 84 L-74 84 Q-82 84 -82 76 Z', r: 'body' },
    { d: 'M-82 -14 L-82 -40 Q-82 -76 0 -76 Q82 -76 82 -40 L82 -14 Z', r: 'body' },
    { d: 'M-60 -72 L-42 -74 L-42 84 L-60 84 Z M42 -74 L60 -72 L60 84 L42 84 Z', r: 'c2' },
    { rr: [-13, -26, 26, 30, 5], r: 'c2d' }] },
  cam: { name: 'Çam fidanı', r: 42, parts: () => [
    { rr: [-11, 58, 22, 38, 4], r: 'c2' },
    { d: 'M0 -102 L46 -40 L22 -40 L66 14 L36 14 L86 70 L-86 70 L-36 14 L-66 14 L-22 -40 L-46 -40 Z', r: 'body' }] }
};
const SHAPE_IDS = Object.keys(SHAPES);
// Hitbox yarıçapı (dünya birimi): şekil yarıçapı × boy
const propR = p => (SHAPES[p.shape] ? SHAPES[p.shape].r : 30) * (p.scale || 1);

/* ---- yol önbelleği (yalnızca tarayıcıda) ---- */
function blobPts(cx, cy, rx, ry, bumps, amp, ph, n = 72) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU; const k = 1 + amp * Math.cos(bumps * a + ph) + amp * .35 * Math.sin((bumps + 3) * a + ph * 2); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  return pts;
}
function pathOf(part) {
  const p = new Path2D();
  if (part.d) return new Path2D(part.d);
  if (part.e) { const [x, y, rx, ry, rot] = part.e; p.ellipse(x, y, rx, ry, rot, 0, TAU); return p; }
  if (part.rr) { const [x, y, w, h, r] = part.rr; rrPath(p, x, y, w, h, r); return p; }
  if (part.poly) { part.poly.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); return p; }
  if (part.blob) { blobPts(...part.blob).forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); return p; }
  if (part.dots) { part.dots.forEach(([x, y, r]) => { p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); }); return p; }
  return p;
}
function rrPath(p, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r); p.lineTo(x + w, y + h - r);
  p.quadraticCurveTo(x + w, y + h, x + w - r, y + h); p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y); p.closePath();
}
const shapeCache = {};
function shapeParts(id) {
  if (shapeCache[id]) return shapeCache[id];
  const def = SHAPES[id] || SHAPES.top;
  const parts = def.parts().map(pt => Object.assign({}, pt, { path: pathOf(pt) }));
  return (shapeCache[id] = parts);
}

/* ---- eşya deseni (yerel koordinatta, klipli) ---- */
const SPOTS = {};
function spotsFor(id) {
  if (SPOTS[id]) return SPOTS[id];
  const r = mulberry(hashStr(id) + 7), out = [];
  for (let i = 0; i < 70 && out.length < 11; i++) {
    const x = r() * 220 - 110, y = r() * 220 - 110, s = 10 + r() * 16;
    if (out.every(o => dist(o[0], o[1], x, y) > o[2] + s + 8)) out.push([x, y, s, r() * 3]);
  }
  return (SPOTS[id] = out);
}
function propPattern(g, pat, c2, id) {
  g.fillStyle = c2;
  if (pat === 'cizgili') { for (let y = -130; y < 130; y += 44) g.fillRect(-140, y, 280, 22); }
  else if (pat === 'puan') { let row = 0; for (let y = -126; y < 130; y += 36, row++) for (let x = -126 + (row % 2) * 18; x < 130; x += 36) { g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); } }
  else if (pat === 'kare') { for (let y = -126, j = 0; y < 130; y += 36, j++) for (let x = -126 + (j % 2) * 36; x < 130; x += 72) g.fillRect(x, y, 36, 36); }
  else if (pat === 'benek') { for (const [x, y, s, a] of spotsFor(id)) { g.beginPath(); g.ellipse(x, y, s, s * .78, a, 0, TAU); g.fill(); } }
}

/* ---- tek bir eşyayı çiz (süs ve kılık için ortak) ----
   p: { shape, x, y, rot (derece), scale, c1, c2, pat }   mode: 'normal' | 'flat'     */
const GRAD = new WeakMap();
function shadeGrad(g) {
  let gr = GRAD.get(g);
  if (!gr) { gr = g.createLinearGradient(-90, -110, 80, 110); gr.addColorStop(0, 'rgba(255,255,255,.34)'); gr.addColorStop(.45, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(20,5,40,.30)'); GRAD.set(g, gr); }
  return gr;
}
function roleColor(role, c1, c2) {
  switch (role) {
    case 'body': case 'c1': return c1;
    case 'c1d': return shade(c1, -.28); case 'c1l': return shade(c1, .25);
    case 'c2': return c2; case 'c2d': return shade(c2, -.3); case 'c2l': return shade(c2, .3);
    default: return role;
  }
}
function drawProp(g, p, mode) {
  const def = SHAPES[p.shape]; if (!def) return;
  const R = def.r * (p.scale || 1), flat = mode === 'flat';
  g.save(); g.translate(p.x, p.y);
  if (!flat) { g.fillStyle = 'rgba(30,10,40,.22)'; g.beginPath(); g.ellipse(0, R * .78, R * .92, R * .3, 0, 0, TAU); g.fill(); }
  g.rotate((p.rot || 0) * Math.PI / 180); g.scale(R / 100, R / 100);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const c1 = p.c1, c2 = p.c2;
  for (const pt of shapeParts(p.shape)) {
    const role = pt.r;
    if (role === 'glow') { if (flat) continue; const e = pt.e; const gr = g.createRadialGradient(e[0], e[1], 0, e[0], e[1], e[2]); gr.addColorStop(0, 'rgba(255,244,170,.55)'); gr.addColorStop(1, 'rgba(255,244,170,0)'); g.fillStyle = gr; g.fill(pt.path); continue; }
    if (role === 'hl') { if (flat) continue; g.globalAlpha = pt.a || .4; g.fillStyle = '#fff'; g.fill(pt.path); g.globalAlpha = 1; continue; }
    const col = roleColor(role, c1, c2);
    if (pt.w) {
      if (pt.a) g.globalAlpha = pt.a;
      if (!pt.no && !flat) { g.strokeStyle = shade(col, -.5); g.lineWidth = pt.w + 7; g.stroke(pt.path); }
      g.strokeStyle = col; g.lineWidth = pt.w; g.stroke(pt.path); g.globalAlpha = 1; continue;
    }
    g.fillStyle = col; g.fill(pt.path);
    if (role === 'body' && p.pat && p.pat !== 'duz') { g.save(); g.clip(pt.path); propPattern(g, p.pat, c2, p.shape); g.restore(); }
    if (!flat) {
      g.save(); g.clip(pt.path); g.fillStyle = shadeGrad(g); g.fillRect(-140, -140, 280, 280); g.restore();
      if (!pt.no) { g.strokeStyle = shade(col, -.52); g.lineWidth = 6.5; g.stroke(pt.path); }
    }
  }
  g.restore();
}

/* ---- bukalemun (bulunan oyuncu) ---- */
function drawChameleon(g, x, y, size, color, t = 0, closed = false) {
  g.save(); g.translate(x, y); g.scale(size / 100, size / 100);
  const dark = shade(color, -.45), light = shade(color, .45);
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.fillStyle = 'rgba(30,10,40,.25)'; g.beginPath(); g.ellipse(0, 62, 80, 18, 0, 0, TAU); g.fill();
  // kuyruk
  g.strokeStyle = dark; g.lineWidth = 26; g.beginPath(); g.moveTo(-40, 20); g.bezierCurveTo(-96, 18, -100, 74, -64, 78); g.bezierCurveTo(-38, 80, -36, 52, -56, 52); g.stroke();
  g.strokeStyle = color; g.lineWidth = 17; g.stroke();
  // bacaklar
  g.strokeStyle = dark; g.lineWidth = 13;
  [[-22, 26, -30, 58], [20, 28, 26, 60]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); });
  // gövde
  g.fillStyle = color; g.beginPath(); g.moveTo(-50, 14); g.bezierCurveTo(-50, -40, 30, -52, 56, -22); g.bezierCurveTo(100, -10, 104, 18, 70, 26); g.bezierCurveTo(40, 40, -30, 44, -50, 14); g.closePath(); g.fill();
  g.strokeStyle = dark; g.lineWidth = 6; g.stroke();
  g.fillStyle = light; g.beginPath(); g.moveTo(-40, 22); g.bezierCurveTo(-10, 38, 40, 34, 66, 22); g.bezierCurveTo(30, 28, -10, 30, -40, 22); g.fill();
  // sırt dikenleri
  g.fillStyle = dark; for (let i = 0; i < 5; i++) { const sx = -36 + i * 16; g.beginPath(); g.moveTo(sx - 6, -30 + i * -2 + (i > 2 ? i * 3 : 0)); g.lineTo(sx, -44 + (i > 2 ? i * 3 : 0)); g.lineTo(sx + 6, -30 + (i > 2 ? i * 3 : 0)); g.fill(); }
  // benekler
  g.fillStyle = shade(color, .2); [[-20, -6, 7], [4, -16, 6], [-4, 8, 5], [26, -6, 5]].forEach(([a, b, r]) => { g.beginPath(); g.arc(a, b, r, 0, TAU); g.fill(); });
  // göz
  g.fillStyle = light; g.beginPath(); g.arc(62, -16, 19, 0, TAU); g.fill(); g.strokeStyle = dark; g.lineWidth = 5; g.stroke();
  if (closed) { g.strokeStyle = '#1b0a2a'; g.lineWidth = 6; g.beginPath(); g.arc(62, -18, 10, .15 * Math.PI, .85 * Math.PI); g.stroke(); }
  else { const lx = Math.cos(t * 2) * 4, ly = Math.sin(t * 3) * 3; g.fillStyle = '#fff'; g.beginPath(); g.arc(64 + lx * .5, -16, 11, 0, TAU); g.fill(); g.fillStyle = '#1b0a2a'; g.beginPath(); g.arc(66 + lx, -16 + ly, 6, 0, TAU); g.fill(); }
  // ağız
  g.strokeStyle = dark; g.lineWidth = 4; g.beginPath(); g.moveTo(74, 10); g.quadraticCurveTo(86, 14, 94, 6); g.stroke();
  g.restore();
}

/* ------------------------------------------------------------------ zemin desen karoları
   makeTile(p, c1, c2, s, k): s×s dünya birimlik karo, k piksel/birim çözünürlükte  */
function makeTile(p, c1, c2, s, k) {
  const th0 = p === 'altigen' ? s / 3 * Math.sqrt(3) : s;          // altıgen karo dikdörtgen
  const cv = document.createElement('canvas'); cv.width = Math.max(2, Math.round(s * k)); cv.height = Math.max(2, Math.round(th0 * k));
  const g = cv.getContext('2d'); g.scale(cv.width / s, cv.height / th0);
  const r = mulberry(hashStr(p + c1 + c2 + s));
  const wrap = (fn) => { for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) { g.save(); g.translate(dx, dy); fn(); g.restore(); } };
  g.fillStyle = c1; g.fillRect(0, 0, s, s);
  g.fillStyle = c2; g.strokeStyle = c2; g.lineCap = 'round'; g.lineJoin = 'round';
  switch (p) {
    case 'cizgili': g.fillRect(0, 0, s / 2, s); break;
    case 'kare': g.fillRect(0, 0, s / 2, s / 2); g.fillRect(s / 2, s / 2, s / 2, s / 2);
      g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(0, 0, s, 1.2); g.fillRect(0, 0, 1.2, s); break;
    case 'puan': [[s / 4, s / 4], [3 * s / 4, 3 * s / 4]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, s * .13, 0, TAU); g.fill(); }); break;
    case 'benek': { const sp = []; for (let i = 0; i < 6; i++) sp.push([r() * s, r() * s, s * (.06 + r() * .08), r() * 3]);
      wrap(() => sp.forEach(([x, y, rr, a]) => { g.beginPath(); g.ellipse(x, y, rr, rr * .75, a, 0, TAU); g.fill(); })); break; }
    case 'zigzag': g.lineWidth = s * .16; for (let y = -s; y <= s * 2; y += s / 2) { g.beginPath(); g.moveTo(0, y); g.lineTo(s / 2, y + s / 4); g.lineTo(s, y); g.stroke(); } break;
    case 'cim': { g.lineWidth = .9; const bl = []; for (let i = 0; i < 26; i++) bl.push([r() * s, r() * s, 2 + r() * 3, r() - .5]);
      wrap(() => bl.forEach(([x, y, l, a]) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + a * 2, y - l); g.stroke(); }));
      g.fillStyle = shade(c1, .18); for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(r() * s, r() * s, .9, 0, TAU); g.fill(); } break; }
    case 'cicek': { g.lineWidth = .9; const bl = []; for (let i = 0; i < 18; i++) bl.push([r() * s, r() * s, 2 + r() * 3, r() - .5]);
      wrap(() => bl.forEach(([x, y, l, a]) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + a * 2, y - l); g.stroke(); }));
      const fl = []; for (let i = 0; i < 3; i++) fl.push([r() * s, r() * s, ['#ff8fc8', '#fff27a', '#ffffff', '#c9a0ff'][Math.floor(r() * 4)]]);
      wrap(() => fl.forEach(([x, y, c]) => { g.fillStyle = c; for (let k2 = 0; k2 < 5; k2++) { const a = k2 / 5 * TAU; g.beginPath(); g.arc(x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 1.7, 0, TAU); g.fill(); } g.fillStyle = '#ffb627'; g.beginPath(); g.arc(x, y, 1.2, 0, TAU); g.fill(); })); break; }
    case 'tahta': { const ph = s / 4; g.lineWidth = s * .025;
      for (let i = 0; i < 4; i++) { const y = i * ph; g.globalAlpha = .9; g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke(); const sx = (i % 2 ? .3 : .75) * s; g.beginPath(); g.moveTo(sx, y); g.lineTo(sx, y + ph); g.stroke();
        g.globalAlpha = .25; for (let j = 0; j < 2; j++) { const yy = y + ph * (.3 + j * .35); g.beginPath(); g.moveTo(0, yy); g.bezierCurveTo(s * .3, yy - 1.5, s * .6, yy + 1.5, s, yy); g.stroke(); } }
      g.globalAlpha = 1; break; }
    case 'su': { g.lineWidth = s * .05; g.globalAlpha = .7; for (let i = 0; i < 3; i++) { const y = (i + .5) * s / 3, ox = (i % 2) * s / 4; g.beginPath(); for (let x = -s / 2; x <= s; x += s / 2) { g.moveTo(x + ox, y); g.quadraticCurveTo(x + ox + s / 8, y - s * .07, x + ox + s / 4, y); } g.stroke(); }
      g.globalAlpha = 1; g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(r() * s, r() * s, s * .02, 0, TAU); g.fill(); } break; }
    case 'altigen': { const R = s / 3, th = th0; g.lineWidth = s * .035;
      const hex = (cx, cy) => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.fillStyle = shade(c1, (r() - .5) * .08); g.fill(); g.stroke(); };
      for (const [cx, cy] of [[0, 0], [3 * R, 0], [0, th], [3 * R, th], [1.5 * R, th / 2]]) hex(cx, cy); break; }
    case 'tugla': { g.lineWidth = s * .06; g.fillStyle = shade(c1, .08);
      for (let row = 0; row < 3; row++) { const y = row * s / 3, off = (row % 2) * s / 4; for (let x = -s / 2 + off; x < s; x += s / 2) { const p2 = new Path2D(); rrPath(p2, x + 1.2, y + 1.2, s / 2 - 2.4, s / 3 - 2.4, s * .06); g.fill(p2); g.stroke(p2); } } break; }
    case 'konfeti': { const cols = ['#ff4f6d', '#ffd84a', '#2bd9c0', '#3d6bff', '#9b5cff', '#ff9a3c', '#5cc85a']; const pc = [];
      for (let i = 0; i < 14; i++) pc.push([r() * s, r() * s, r() * 3, cols[Math.floor(r() * cols.length)]]);
      wrap(() => pc.forEach(([x, y, a, c]) => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = c; g.fillRect(-2.2, -1, 4.4, 2); g.restore(); })); break; }
    case 'cakil': { const st = []; for (let i = 0; i < 16; i++) st.push([r() * s, r() * s, 1.2 + r() * 3, r() * 3, r()]);
      wrap(() => st.forEach(([x, y, rr, a, t]) => { g.fillStyle = t < .5 ? c2 : t < .8 ? shade(c1, .18) : shade(c2, -.2); g.beginPath(); g.ellipse(x, y, rr, rr * .7, a, 0, TAU); g.fill(); })); break; }
    case 'kilim': { const a = s; const navy = '#27357a', gold = '#ffb627';
      g.fillStyle = c2; g.beginPath(); g.moveTo(a / 2, a * .08); g.lineTo(a * .92, a / 2); g.lineTo(a / 2, a * .92); g.lineTo(a * .08, a / 2); g.closePath(); g.fill();
      g.fillStyle = navy; g.beginPath(); g.moveTo(a / 2, a * .22); g.lineTo(a * .78, a / 2); g.lineTo(a / 2, a * .78); g.lineTo(a * .22, a / 2); g.closePath(); g.fill();
      g.fillStyle = c1; g.beginPath(); g.moveTo(a / 2, a * .34); g.lineTo(a * .66, a / 2); g.lineTo(a / 2, a * .66); g.lineTo(a * .34, a / 2); g.closePath(); g.fill();
      g.fillStyle = gold; g.beginPath(); g.moveTo(a / 2, a * .43); g.lineTo(a * .57, a / 2); g.lineTo(a / 2, a * .57); g.lineTo(a * .43, a / 2); g.closePath(); g.fill();
      g.fillStyle = navy; [[0, 0], [a, 0], [0, a], [a, a]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x, y - a * .14); g.lineTo(x + a * .14, y); g.lineTo(x, y + a * .14); g.lineTo(x - a * .14, y); g.closePath(); g.fill(); }); break; }
    case 'gingham': g.globalAlpha = .55; g.fillRect(0, 0, s / 2, s); g.fillRect(0, 0, s, s / 2); g.globalAlpha = 1; break;
    case 'toplar': { const cols = ['#ff4f6d', '#ffd84a', '#3d6bff', '#5cc85a', '#ff8fc8', '#ffffff']; const bs = [];
      for (let i = 0; i < 40 && bs.length < 9; i++) { const x = r() * s, y = r() * s; if (bs.every(b => Math.hypot(b[0] - x, b[1] - y) > s * .2)) bs.push([x, y, cols[Math.floor(r() * cols.length)]]); }
      wrap(() => bs.forEach(([x, y, c]) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, s * .11, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(x - s * .035, y - s * .035, s * .03, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = .8; g.beginPath(); g.arc(x, y, s * .11, 0, TAU); g.stroke(); })); break; }
    default: break;
  }
  return cv;
}

/* ------------------------------------------------------------------ harita modeli
   Bölge (region): { k:'rect'|'ell'|'blob'|'poly'|'line', geometri…, f:{p,c1,c2,s,a,n}, n:'ad', edge:[renk,kalınlık], lift }
   Zemin rengi hem çizimde hem de bilgisayarın "bu eşya zemine uyuyor mu" hesabında kullanılır.          */
function catmull(pts, seg = 10) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let t = 0; t < seg; t++) {
      const u = t / seg, u2 = u * u, u3 = u2 * u;
      out.push([.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
        .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function prepRegion(rg) {
  if (rg.k === 'blob') { rg.pts = blobPts(rg.cx, rg.cy, rg.rx, rg.ry, rg.b || 5, rg.amp || .08, rg.ph || 0, 60); rg.kk = 'poly'; }
  else if (rg.k === 'line') { rg.sm = rg.smooth === false ? rg.pts : catmull(rg.pts, 12); rg.kk = 'line'; }
  else rg.kk = rg.k;
  return rg;
}
function inPoly(pts, x, y) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; }
function segDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy; let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = clamp(t, 0, 1); return Math.hypot(px - ax - t * dx, py - ay - t * dy); }
function hitRegion(rg, x, y) {
  switch (rg.kk) {
    case 'rect': { let lx = x, ly = y; if (rg.rot) { const cx = rg.x + rg.w / 2, cy = rg.y + rg.h / 2, a = -rg.rot * Math.PI / 180, dx = x - cx, dy = y - cy; lx = cx + dx * Math.cos(a) - dy * Math.sin(a); ly = cy + dx * Math.sin(a) + dy * Math.cos(a); } return lx >= rg.x && lx <= rg.x + rg.w && ly >= rg.y && ly <= rg.y + rg.h; }
    case 'ell': return ((x - rg.cx) / rg.rx) ** 2 + ((y - rg.cy) / rg.ry) ** 2 <= 1;
    case 'poly': return inPoly(rg.pts, x, y);
    case 'line': { const s = rg.sm; for (let i = 0; i < s.length - 1; i++) if (segDist(x, y, s[i][0], s[i][1], s[i + 1][0], s[i + 1][1]) <= rg.w / 2) return true; return false; }
    default: return false;
  }
}
function groundAt(map, x, y) {
  for (let i = map.regions.length - 1; i >= 0; i--) { const rg = map.regions[i]; if (rg.ground !== false && hitRegion(rg, x, y)) return rg; }
  return map.baseRegion;
}
const groundCols = rg => rg.cols || [rg.f.c1, rg.f.c2 || rg.f.c1];

/* ---- süs eşyalarını (decoy) tohuma göre yerleştir ---- */
function genDecoys(map, seed) {
  const r = mulberry(seed * 977 + hashStr(map.id)), out = [];
  const ok = (x, y, R) => x > R * .7 && x < W - R * .7 && y > map.top + R * .55 && y < H - R * .6 && out.every(o => dist(o.x, o.y, x, y) > (propR(o) + R) * .78);
  const lookOf = (sp, i) => sp.looks[(i + Math.floor(r() * 2) * (sp.mixLooks ? 1 : 0)) % sp.looks.length];
  const add = (sp, x, y, i) => {
    const [c1, c2, pat] = lookOf(sp, i), sc = sp.sc ? sp.sc[0] + r() * (sp.sc[1] - sp.sc[0]) : .9 + r() * .2;
    const R = SHAPES[sp.s].r * sc;
    let rot = sp.rot ? sp.rot[0] + r() * (sp.rot[1] - sp.rot[0]) : (r() - .5) * 10;
    if (sp.fall && r() < sp.fall) rot = r() < .5 ? 90 : -90;
    if (!ok(x, y, R)) return false;
    out.push({ shape: sp.s, x: Math.round(x), y: Math.round(y), rot: Math.round(rot), scale: +sc.toFixed(2), c1, c2, pat: pat || 'duz' });
    return true;
  };
  for (const sp of map.decoys) {
    if (sp.pts) sp.pts.forEach(([x, y], i) => { for (let t = 0; t < 8; t++) if (add(sp, x + (t ? (r() - .5) * 30 : 0), y + (t ? (r() - .5) * 30 : 0), i)) break; });
    else if (sp.ring) { const [cx, cy, rx, ry] = sp.ring; for (let i = 0; i < sp.n; i++) { const a = (i / sp.n) * TAU + (sp.ph || 0) + (r() - .5) * .25; for (let t = 0; t < 6; t++) if (add(sp, cx + Math.cos(a) * rx * (1 + (r() - .5) * .12 * t), cy + Math.sin(a) * ry * (1 + (r() - .5) * .12 * t), i)) break; } }
    else {
      let placed = 0;
      for (let t = 0; t < sp.n * 40 && placed < sp.n; t++) {
        let x, y;
        if (sp.area) { const [cx, cy, rx, ry] = sp.area, a = r() * TAU, d = Math.sqrt(r()); x = cx + Math.cos(a) * rx * d; y = cy + Math.sin(a) * ry * d; }
        else { const [bx, by, bw, bh] = sp.box; x = bx + r() * bw; y = by + r() * bh; }
        if (add(sp, x, y, placed)) placed++;
      }
    }
  }
  return out;
}

/* ---- çizim yardımcıları (zemin katmanı) ---- */
function regionPath(rg) {
  const p = new Path2D();
  if (rg.kk === 'rect') rrPath(p, 0, 0, rg.w, rg.h, rg.r || 0);
  else if (rg.kk === 'ell') p.ellipse(0, 0, rg.rx, rg.ry, 0, 0, TAU);
  else if (rg.kk === 'poly') { rg.pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); }
  else if (rg.kk === 'line') { rg.sm.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); }
  return p;
}
function regionFrame(g, rg) {
  if (rg.kk === 'rect') { g.translate(rg.x + rg.w / 2, rg.y + rg.h / 2); if (rg.rot) g.rotate(rg.rot * Math.PI / 180); g.translate(-rg.w / 2, -rg.h / 2); }
  else if (rg.kk === 'ell') g.translate(rg.cx, rg.cy);
}
function fillStyleFor(g, f, k) {
  if (!f.p || f.p === 'duz' || f.p === 'radyal') return f.c1;
  const tile = makeTile(f.p, f.c1, f.c2 || shade(f.c1, -.15), f.s || 40, k);
  const pat = g.createPattern(tile, 'repeat');
  try { pat.setTransform(new DOMMatrix().rotate(f.a || 0).scale(1 / k)); } catch { /* eski tarayıcı */ }
  return pat;
}
function paintRegion(g, rg, k) {
  const f = rg.f, path = regionPath(rg);
  g.save(); regionFrame(g, rg);
  const isLine = rg.kk === 'line';
  if (isLine) { g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = rg.w; }
  if (rg.lift) { g.save(); g.translate(rg.lift * .4, rg.lift); g.fillStyle = 'rgba(40,15,50,.22)'; g.strokeStyle = 'rgba(40,15,50,.22)'; isLine ? g.stroke(path) : g.fill(path); g.restore(); }
  const st = fillStyleFor(g, f, k);
  if (isLine) { g.strokeStyle = st; g.stroke(path); }
  else { g.fillStyle = st; g.fill(path); }
  if (f.p === 'radyal') {           // çadır / atlıkarınca tepesi: dilimler
    const n = f.n || 12, R = Math.max(rg.rx, rg.ry) + 2;
    g.save(); g.clip(path); g.fillStyle = f.c2;
    for (let i = 0; i < n; i += 2) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, i / n * TAU, (i + 1) / n * TAU); g.closePath(); g.fill(); }
    const gr = g.createRadialGradient(-R * .25, -R * .3, R * .1, 0, 0, R); gr.addColorStop(0, 'rgba(255,255,255,.25)'); gr.addColorStop(.6, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(30,0,40,.28)');
    g.fillStyle = gr; g.fillRect(-R, -R, 2 * R, 2 * R); g.restore();
  }
  if (rg.edge) { g.strokeStyle = rg.edge[0]; g.lineWidth = rg.edge[1]; if (isLine) { g.lineWidth = rg.w + rg.edge[1]; } g.stroke(path); if (isLine) { g.strokeStyle = st; g.lineWidth = rg.w; g.stroke(path); } }
  if (rg.inner) { g.save(); g.clip(path); g.strokeStyle = rg.inner; g.lineWidth = 10; g.globalAlpha = .35; g.stroke(path); g.restore(); }
  g.restore();
}
// Küçük çizim kısayolları
const D = {
  circle(g, x, y, r, fill, stroke, lw) { g.beginPath(); g.arc(x, y, r, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } },
  ell(g, x, y, rx, ry, fill, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fillStyle = fill; g.fill(); },
  rr(g, x, y, w, h, r, fill, stroke, lw) { const p = new Path2D(); rrPath(p, x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(p); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(p); } return p; },
  text(g, s, x, y, size, fill, stroke, font) { g.font = `${size}px ${font || '"Bungee","Arial Black","Segoe UI Black",sans-serif'}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if (stroke) { g.lineWidth = size * .22; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(s, x, y); } g.fillStyle = fill; g.fillText(s, x, y); },
  glow(g, x, y, r, col) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); },
  flower(g, x, y, s, c) { g.fillStyle = c; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.beginPath(); g.arc(x + Math.cos(a) * s, y + Math.sin(a) * s, s * .8, 0, TAU); g.fill(); } D.circle(g, x, y, s * .6, '#ffb627'); },
  scallops(g, cx, cy, R, n, c1, c2) { for (let i = 0; i < n; i++) { const a = i / n * TAU, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; D.circle(g, x, y, R * TAU / n * .55, i % 2 ? c1 : c2, shade(i % 2 ? c1 : c2, -.35), 1.5); } },
  bulbs(g, cx, cy, R, n, col) { for (let i = 0; i < n; i++) { const a = i / n * TAU, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; D.glow(g, x, y, 9, 'rgba(255,240,150,.7)'); D.circle(g, x, y, 3.2, col || '#fff7c2'); } },
  shadowBlob(g, x, y, rx, ry, a = .22) { g.fillStyle = `rgba(40,15,50,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); },
  bench(g, x, y, w, rot, col = '#b5743f') { g.save(); g.translate(x, y); g.rotate(rot); D.shadowBlob(g, 3, 8, w / 2 + 4, 12); for (let i = 0; i < 3; i++) D.rr(g, -w / 2, -14 + i * 10, w, 8, 3, i % 2 ? shade(col, .1) : col, shade(col, -.45), 1.5); D.rr(g, -w / 2 - 4, -16, 6, 34, 2, '#5b4a6b'); D.rr(g, w / 2 - 2, -16, 6, 34, 2, '#5b4a6b'); g.restore(); },
  sprinkle(g, r, n, box, fn) { for (let i = 0; i < n; i++) fn(box[0] + r() * box[2], box[1] + r() * box[3], r); }
};

/* ------------------------------------------------------------------ HARİTALAR */
const L = (c1, c2, p) => [c1, c2, p || 'duz'];
const MAPS = {
  /* ================================================================ LUNAPARK */
  lunapark: {
    id: 'lunapark', name: 'Lunapark', icon: '🎡', top: 132,
    base: { p: 'tugla', c1: '#ecd9b8', c2: '#d4b98f', s: 38 }, baseName: 'Arnavut kaldırımı',
    catalog: ['balon', 'top', 'varil', 'cop', 'lamba', 'icecek', 'hediye', 'koni', 'pamuk', 'semsiye'],
    regions: [
      { k: 'blob', cx: 150, cy: 935, rx: 280, ry: 150, b: 5, amp: .07, f: { p: 'cicek', c1: '#8fd36a', c2: '#76bf55', s: 46 }, n: 'Çiçekli çimen' },
      { k: 'blob', cx: 1560, cy: 205, rx: 170, ry: 100, b: 4, amp: .08, ph: 1, f: { p: 'cicek', c1: '#8fd36a', c2: '#76bf55', s: 46 }, n: 'Çiçekli çimen' },
      { k: 'blob', cx: 430, cy: 255, rx: 120, ry: 62, b: 6, amp: .1, f: { p: 'konfeti', c1: '#f3e9ff', s: 40 }, n: 'Konfetili zemin', cols: ['#f3e9ff', '#ff4f6d', '#ffd84a', '#2bd9c0'] },
      { k: 'blob', cx: 1180, cy: 935, rx: 150, ry: 55, b: 6, amp: .1, ph: 2, f: { p: 'konfeti', c1: '#f3e9ff', s: 40 }, n: 'Konfetili zemin', cols: ['#f3e9ff', '#ff4f6d', '#ffd84a', '#2bd9c0'] },
      { k: 'rect', x: -20, y: 466, w: 1640, h: 88, f: { p: 'cizgili', c1: '#ffd6ad', c2: '#ffbd86', s: 34, a: 45 }, n: 'Şeritli yol', edge: ['#e59a62', 4] },
      { k: 'rect', x: 746, y: 550, w: 108, h: 470, f: { p: 'cizgili', c1: '#ffd6ad', c2: '#ffbd86', s: 34, a: 45 }, n: 'Şeritli yol', edge: ['#e59a62', 4] },
      { k: 'rect', x: 1335, y: 610, w: 280, h: 400, f: { p: 'kare', c1: '#bff3ea', c2: '#ffffff', s: 46 }, n: 'Kafe karoları', edge: ['#7fd6c8', 4] },
      { k: 'rect', x: 1010, y: 660, w: 280, h: 215, r: 34, f: { p: 'toplar', c1: '#7fd0ff', s: 52 }, n: 'Top havuzu', edge: ['#2b7fd6', 16], lift: 8, cols: ['#ff4f6d', '#ffd84a', '#3d6bff', '#5cc85a', '#ff8fc8'] },
      { k: 'rect', x: 555, y: 170, w: 175, h: 95, r: 8, f: { p: 'cizgili', c1: '#ffd84a', c2: '#2d2d3a', s: 38, a: 45 }, n: 'Bakım alanı', edge: ['#2d2d3a', 4] },
      { k: 'ell', cx: 800, cy: 650, rx: 335, ry: 235, f: { p: 'kare', c1: '#ff9fd0', c2: '#fff1f8', s: 48 }, n: 'Damalı meydan', edge: ['#e76aa9', 6] },
      { k: 'ell', cx: 800, cy: 650, rx: 128, ry: 128, f: { p: 'radyal', c1: '#ff4f6d', c2: '#fff3d6', n: 16 }, n: 'Atlıkarınca', lift: 12 },
      { k: 'ell', cx: 270, cy: 318, rx: 122, ry: 122, f: { p: 'radyal', c1: '#3d6bff', c2: '#ffd84a', n: 14 }, n: 'Mavi çadır', lift: 14 },
      { k: 'ell', cx: 1375, cy: 335, rx: 108, ry: 108, f: { p: 'radyal', c1: '#2bd9a0', c2: '#ffffff', n: 12 }, n: 'Yeşil çadır', lift: 14 },
      { k: 'rect', x: 1045, y: 165, w: 180, h: 70, r: 6, f: { p: 'cizgili', c1: '#ff8fc8', c2: '#ffffff', s: 30, a: 0 }, n: 'Pamuk şeker standı', lift: 10 },
      { k: 'rect', x: 862, y: 168, w: 130, h: 66, r: 6, f: { p: 'cizgili', c1: '#3d6bff', c2: '#ffffff', s: 26, a: 0 }, n: 'Bilet gişesi', lift: 10 },
      { k: 'ell', cx: 640, cy: 960, rx: 62, ry: 34, f: { p: 'puan', c1: '#ffd84a', c2: '#ffffff', s: 26 }, n: 'Patlamış mısır arabası önü' },
      { k: 'rect', x: 105, y: 690, w: 240, h: 72, r: 6, f: { p: 'cizgili', c1: '#ff4f6d', c2: '#ffffff', s: 34, a: 0 }, n: 'Hediye standı', lift: 10 },
      { k: 'ell', cx: 470, cy: 855, rx: 82, ry: 82, f: { p: 'su', c1: '#4fb7f0', c2: '#b4e9ff', s: 44 }, n: 'Fıskiye havuzu', edge: ['#c9ced6', 18] }
    ],
    decoys: [
      { s: 'lamba', pts: [[115, 448], [520, 448], [1090, 448], [1490, 448], [330, 576], [1265, 576], [585, 815], [1350, 620]], looks: [L('#fff27a', '#27357a'), L('#fff27a', '#2d2d3a'), L('#ffd84a', '#9b5cff')], rot: [-2, 2], sc: [.95, 1.05] },
      { s: 'balon', area: [645, 340, 95, 70], n: 7, looks: [L('#ff4f6d', '#ffffff', 'cizgili'), L('#ffd84a', '#ff9a3c', 'puan'), L('#4fb7f0', '#ffffff'), L('#ff8fc8', '#ffffff'), L('#5cc85a', '#fff27a', 'puan'), L('#9b5cff', '#ffffff'), L('#ff9a3c', '#ffffff', 'cizgili')], rot: [-12, 12] },
      { s: 'balon', pts: [[1240, 262], [1450, 690], [700, 700]], looks: [L('#ff8fc8', '#ffffff', 'puan'), L('#2bd9c0', '#ffffff'), L('#ffd84a', '#ff4f6d', 'cizgili')], rot: [-10, 10] },
      { s: 'top', area: [1150, 768, 110, 75], n: 6, looks: [L('#ff4f6d', '#ffffff'), L('#ffd84a', '#ffffff'), L('#3d6bff', '#ffffff'), L('#5cc85a', '#ffffff'), L('#ffffff', '#ff4f6d', 'cizgili'), L('#ff8fc8', '#ffffff', 'puan')] },
      { s: 'top', pts: [[560, 610], [880, 840]], looks: [L('#ffffff', '#3d6bff', 'cizgili'), L('#ff9a3c', '#ffffff'), L('#9b5cff', '#ffd84a', 'puan')] },
      { s: 'varil', area: [445, 370, 45, 70], n: 3, looks: [L('#ff4f6d', '#ffd84a'), L('#3d6bff', '#ffffff'), L('#b98a5a', '#7a4a2a', 'cizgili')] },
      { s: 'varil', area: [1215, 385, 50, 60], n: 3, looks: [L('#2bd9a0', '#ffffff'), L('#ffd84a', '#ff4f6d'), L('#b98a5a', '#7a4a2a', 'cizgili')] },
      { s: 'cop', pts: [[205, 588], [1150, 448], [430, 448], [1390, 575], [905, 945]], looks: [L('#5cc85a', '#2f8f4e'), L('#9b5cff', '#27357a'), L('#ff9a3c', '#7a4a2a')], fall: .12 },
      { s: 'icecek', area: [1135, 290, 95, 32], n: 4, looks: [L('#ff4f6d', '#ffffff', 'cizgili'), L('#ffd84a', '#ffffff', 'puan'), L('#4fb7f0', '#ffffff'), L('#ff8fc8', '#ffffff', 'cizgili')], fall: .15 },
      { s: 'icecek', area: [1470, 820, 100, 150], n: 4, looks: [L('#ffffff', '#ff4f6d', 'cizgili'), L('#2bd9c0', '#ffffff'), L('#ff9a3c', '#ffffff', 'puan')], fall: .1 },
      { s: 'hediye', area: [225, 835, 115, 50], n: 5, looks: [L('#ff4f6d', '#ffd84a', 'puan'), L('#3d6bff', '#ffffff'), L('#5cc85a', '#ff4f6d', 'cizgili'), L('#ffd84a', '#9b5cff', 'kare'), L('#ff8fc8', '#ffffff', 'puan')] },
      { s: 'koni', area: [642, 220, 82, 40], n: 5, looks: [L('#ff9a3c', '#ffffff'), L('#ff9a3c', '#ffffff'), L('#ffd84a', '#2d2d3a')], fall: .15 },
      { s: 'pamuk', pts: [[1000, 225], [1272, 205], [1300, 300]], looks: [L('#ff8fc8', '#ffffff'), L('#9fd8ff', '#ffffff', 'cizgili'), L('#c9a0ff', '#ff8fc8', 'puan')] },
      { s: 'semsiye', area: [1470, 760, 90, 160], n: 4, looks: [L('#ff4f6d', '#ffffff', 'cizgili'), L('#2bd9c0', '#ffffff', 'cizgili'), L('#ffd84a', '#ff9a3c', 'cizgili'), L('#9b5cff', '#fff27a', 'puan')] }
    ],
    back(g) {
      const gr = g.createLinearGradient(0, 0, 0, 135); gr.addColorStop(0, '#4b2fb8'); gr.addColorStop(.55, '#ff7eb6'); gr.addColorStop(1, '#ffc98a');
      g.fillStyle = gr; g.fillRect(0, 0, W, 135);
      const r = mulberry(11); for (let i = 0; i < 60; i++) D.circle(g, r() * W, r() * 55, r() * 1.6 + .4, 'rgba(255,255,255,.85)');
      // dönme dolap
      const cx = 290, cy = 70, R = 60;
      g.strokeStyle = '#ffe3f2'; g.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke(); }
      g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke(); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R * .62, 0, TAU); g.stroke();
      g.strokeStyle = '#6a3fb5'; g.lineWidth = 7; g.beginPath(); g.moveTo(cx - 40, 134); g.lineTo(cx, cy); g.lineTo(cx + 40, 134); g.stroke();
      const cab = ['#ff4f6d', '#ffd84a', '#2bd9c0', '#3d6bff', '#ff9a3c', '#9b5cff'];
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + .13, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; D.rr(g, x - 7, y - 2, 14, 12, 4, cab[i % 6], '#4a2a6a', 1.5); D.circle(g, x, y - 3, 2.2, '#fff7c2'); }
      D.circle(g, cx, cy, 7, '#ffd84a', '#6a3fb5', 2);
      // hız treni
      g.strokeStyle = '#7c4fd6'; g.lineWidth = 3;
      const ty = x => 92 - 46 * Math.max(0, Math.sin((x - 840) / 70)) * (x < 1300 ? 1 : 0) - 18 * Math.sin((x - 840) / 33);
      for (let x = 850; x < 1300; x += 26) { g.beginPath(); g.moveTo(x, ty(x)); g.lineTo(x, 134); g.stroke(); }
      g.strokeStyle = '#ff4f6d'; g.lineWidth = 6; g.beginPath(); for (let x = 840; x <= 1300; x += 5) x === 840 ? g.moveTo(x, ty(x)) : g.lineTo(x, ty(x)); g.stroke();
      g.strokeStyle = '#ffe3f2'; g.lineWidth = 2; g.stroke();
      [1010, 1036].forEach((x, i) => { D.rr(g, x - 11, ty(x) - 16, 22, 13, 5, i ? '#ffd84a' : '#2bd9c0', '#4a2a6a', 2); D.circle(g, x - 4, ty(x) - 19, 4, '#ffcf9e'); D.circle(g, x + 5, ty(x) - 19, 4, '#7a4a2a'); });
      // serbest düşme kulesi
      D.rr(g, 1478, 8, 22, 126, 6, '#6a3fb5'); for (let y = 16; y < 130; y += 14) D.circle(g, 1489, y, 2.6, y % 28 ? '#ffd84a' : '#ff8fc8');
      D.rr(g, 1466, 46, 46, 16, 7, '#ff4f6d', '#4a2a6a', 2);
      // uzak çadırlar
      [[480, '#ff4f6d'], [560, '#3d6bff'], [1360, '#2bd9a0'], [720, '#ff9a3c']].forEach(([x, c]) => { g.fillStyle = c; g.beginPath(); g.moveTo(x - 34, 134); g.lineTo(x, 84); g.lineTo(x + 34, 134); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - 12, 134); g.lineTo(x, 84); g.lineTo(x + 12, 134); g.fill(); g.strokeStyle = '#4a2a6a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 84); g.lineTo(x, 70); g.stroke(); g.fillStyle = '#ffd84a'; g.beginPath(); g.moveTo(x, 70); g.lineTo(x + 14, 75); g.lineTo(x, 80); g.fill(); });
      // tabela
      D.rr(g, 640, 14, 320, 84, 20, '#2a0f5c', '#ffd84a', 5);
      for (let i = 0; i < 26; i++) { const t = i / 26, x = 652 + t * 296; D.circle(g, x, 22, 3, i % 2 ? '#fff7c2' : '#ff8fc8'); D.circle(g, x, 90, 3, i % 2 ? '#ff8fc8' : '#fff7c2'); }
      D.text(g, 'LUNAPARK', 800, 57, 46, '#ffe14a', '#c4148a');
      // bayrak dizisi
      const fl = ['#ff4f6d', '#ffd84a', '#2bd9c0', '#3d6bff', '#ff9a3c', '#9b5cff'];
      for (let s = 0; s < 4; s++) { const x0 = s * 400, x1 = x0 + 400; g.strokeStyle = '#5b3a7a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, 8); g.quadraticCurveTo((x0 + x1) / 2, 46, x1, 8); g.stroke();
        for (let i = 1; i < 12; i++) { const t = i / 12, x = x0 + t * 400, y = 8 + 2 * t * (1 - t) * 38; if (x > 630 && x < 970) continue; g.fillStyle = fl[(i + s) % 6]; g.beginPath(); g.moveTo(x - 9, y); g.lineTo(x + 9, y); g.lineTo(x, y + 18); g.fill(); } }
      // çit
      g.fillStyle = '#c98fb8'; g.fillRect(0, 122, W, 5);
      for (let x = 4; x < W; x += 16) { D.rr(g, x, 112, 10, 26, 3, '#fff6fb', '#c98fb8', 1.5); }
      g.fillStyle = '#fff6fb'; g.fillRect(0, 118, W, 4);
    },
    decor(g) {
      const r = mulberry(21);
      // seksek
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3;
      [[130, 482], [176, 482], [222, 470], [222, 506], [268, 482], [314, 470], [314, 506]].forEach(([x, y], i) => { g.strokeRect(x, y, 44, i === 2 || i === 3 || i === 5 || i === 6 ? 34 : 54); D.text(g, String(i + 1), x + 22, y + (i === 2 || i === 3 || i === 5 || i === 6 ? 17 : 27), 16, 'rgba(255,255,255,.95)', null, '"Nunito","Segoe UI",sans-serif'); });
      // atlıkarınca süsleri
      D.scallops(g, 800, 650, 128, 32, '#ffd84a', '#ff4f6d'); D.bulbs(g, 800, 650, 108, 24);
      D.circle(g, 800, 650, 26, '#ffd84a', '#b5651d', 3); D.circle(g, 800, 650, 12, '#ff4f6d'); g.fillStyle = '#ff4f6d'; g.beginPath(); g.moveTo(800, 650); g.lineTo(800, 610); g.lineTo(828, 620); g.lineTo(800, 630); g.fill();
      // çadır süsleri
      [[270, 318, 122, '#3d6bff', '#ffd84a'], [1375, 335, 108, '#2bd9a0', '#ffffff']].forEach(([x, y, R, a, b]) => { D.scallops(g, x, y, R, 28, a, b); D.circle(g, x, y, 16, '#ffd84a', '#8a5a00', 3); g.strokeStyle = '#5b3a7a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 46); g.stroke(); g.fillStyle = '#ff4f6d'; g.beginPath(); g.moveTo(x, y - 46); g.lineTo(x + 30, y - 38); g.lineTo(x, y - 30); g.fill(); });
      // stand önleri
      [[1045, 235, 180, 'PAMUK ŞEKER', '#ff8fc8'], [105, 762, 240, 'HEDİYE', '#ff4f6d'], [862, 234, 130, 'BİLET', '#3d6bff']].forEach(([x, y, w, t, c]) => {
        D.shadowBlob(g, x + w / 2, y + 40, w / 2 + 10, 14, .18);
        D.rr(g, x + 8, y, w - 16, 34, 6, '#c98a4f', '#7a4a2a', 3); D.rr(g, x + 8, y, w - 16, 8, 3, '#e8b27a');
        for (let i = 0; i < Math.floor(w / 34); i++) D.circle(g, x + 4 + (i + .5) * (w / Math.floor(w / 34)), y, w / Math.floor(w / 34) / 2, i % 2 ? '#ffffff' : c, shade(c, -.35), 1.5);
        D.rr(g, x + w / 2 - 70, y - 32, 140, 26, 8, '#2a0f5c', '#ffd84a', 2.5); D.text(g, t, x + w / 2, y - 19, 13, '#ffe14a');
      });
      // top havuzu köşe direkleri
      [[1010, 660], [1290, 660], [1010, 875], [1290, 875]].forEach(([x, y]) => D.circle(g, x, y, 14, '#ffd84a', '#b5651d', 3));
      // fıskiye
      D.circle(g, 470, 855, 26, '#e7ebf1', '#9aa3ae', 3); D.circle(g, 470, 855, 14, '#8fd8ff');
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2.5; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.moveTo(470, 855); g.quadraticCurveTo(470 + Math.cos(a) * 30, 832 + Math.sin(a) * 10, 470 + Math.cos(a) * 52, 855 + Math.sin(a) * 40); g.stroke(); }
      for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; D.rr(g, 470 + Math.cos(a) * 91 - 7, 855 + Math.sin(a) * 91 - 5, 14, 10, 3, i % 2 ? '#d9dee6' : '#c2c8d2'); }
      for (let i = 0; i < 6; i++) D.circle(g, 430 + r() * 80, 820 + r() * 70, 2.6, '#ffd84a', '#b58a00', 1);
      // banklar ve balon arabası
      D.bench(g, 360, 930, 70, -.2); D.bench(g, 590, 935, 70, .2);
      D.shadowBlob(g, 648, 408, 44, 10); D.rr(g, 612, 382, 72, 30, 6, '#ff4f6d', '#8a1a3a', 3); D.rr(g, 612, 382, 72, 9, 4, '#ffd84a');
      D.circle(g, 624, 414, 8, '#2d2d3a', '#000', 1); D.circle(g, 672, 414, 8, '#2d2d3a', '#000', 1);
      // bakım tabelası
      D.rr(g, 590, 140, 104, 24, 5, '#ffffff', '#2d2d3a', 2.5); D.text(g, 'BAKIMDA', 642, 152, 13, '#d63a3a');
      // çimen çiçekleri ve konfeti serpintisi
      D.sprinkle(g, r, 14, [30, 820, 240, 170], (x, y) => D.flower(g, x, y, 5, pickRnd(r, ['#ff8fc8', '#fff27a', '#ffffff', '#c9a0ff'])));
      const cf = ['#ff4f6d', '#ffd84a', '#2bd9c0', '#3d6bff', '#9b5cff'];
      D.sprinkle(g, r, 120, [0, 140, W, 860], (x, y) => { g.save(); g.translate(x, y); g.rotate(r() * 3); g.fillStyle = cf[Math.floor(r() * 5)]; g.globalAlpha = .7; g.fillRect(-2.5, -1.2, 5, 2.4); g.restore(); });
      g.globalAlpha = 1;
      // patlamış mısır arabası
      D.shadowBlob(g, 640, 948, 46, 12); D.rr(g, 606, 900, 68, 46, 6, '#d63a3a', '#7a1a2a', 3);
      g.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) g.fillRect(612 + i * 16, 904, 8, 38);
      D.rr(g, 612, 880, 56, 24, 8, 'rgba(220,240,255,.8)', '#8a9099', 2);
      for (let i = 0; i < 14; i++) D.circle(g, 618 + (i * 37) % 46, 884 + (i * 13) % 16, 4, i % 3 ? '#fff6d8' : '#ffd84a');
      D.circle(g, 616, 948, 7, '#2d2d3a'); D.circle(g, 664, 948, 7, '#2d2d3a'); D.text(g, 'MISIR', 640, 924, 10, '#ffe14a', '#7a1a2a');
      // çiçek saksıları
      [[905, 975], [1340, 980], [700, 470], [900, 470]].forEach(([x, y]) => { D.shadowBlob(g, x + 3, y + 8, 30, 10); D.circle(g, x, y, 26, '#d9734a', '#8a3a1a', 3); D.circle(g, x, y, 19, '#7a4a2a'); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; D.flower(g, x + Math.cos(a) * 10, y + Math.sin(a) * 10, 4, ['#ff8fc8', '#fff27a', '#ffffff'][i % 3]); } });
      // rögar kapakları
      [[980, 510], [420, 960]].forEach(([x, y]) => { D.circle(g, x, y, 16, '#9aa3ae', '#6b7480', 2); g.strokeStyle = '#6b7480'; g.lineWidth = 1.5; for (let i = -10; i <= 10; i += 5) { g.beginPath(); g.moveTo(x - 12, y + i); g.lineTo(x + 12, y + i); g.stroke(); } });
    }
  },

  /* ================================================================ MUTFAK */
  mutfak: {
    id: 'mutfak', name: 'Mutfak', icon: '🍳', top: 100,
    base: { p: 'kare', c1: '#f4efe4', c2: '#3a3a4a', s: 84 }, baseName: 'Damalı yer karosu',
    catalog: ['tencere', 'kupa', 'sise', 'elma', 'limon', 'saksi', 'kaktus', 'havlu', 'caydanlik', 'kavanoz'],
    regions: [
      { k: 'rect', x: 1200, y: 570, w: 420, h: 450, f: { p: 'altigen', c1: '#8fe0d2', c2: '#5fbfb1', s: 66 }, n: 'Altıgen fayans' },
      { k: 'rect', x: 520, y: 500, w: 590, h: 350, r: 6, f: { p: 'kilim', c1: '#d63a3a', c2: '#f6e7c8', s: 116 }, n: 'Kilim', edge: ['#27357a', 14], lift: 4, cols: ['#d63a3a', '#f6e7c8', '#27357a', '#ffb627'] },
      { k: 'ell', cx: 345, cy: 700, rx: 150, ry: 150, f: { p: 'gingham', c1: '#ffffff', c2: '#e04848', s: 44 }, n: 'Kareli masa örtüsü', lift: 14, cols: ['#ffffff', '#ef9a9a', '#e04848'] },
      { k: 'blob', cx: 1110, cy: 935, rx: 95, ry: 45, b: 5, amp: .14, f: { p: 'duz', c1: '#fbfbff' }, n: 'Süt birikintisi' },
      { k: 'rect', x: 685, y: 318, w: 240, h: 78, r: 26, f: { p: 'cizgili', c1: '#ffd84a', c2: '#ff9a3c', s: 28, a: 0 }, n: 'Çizgili paspas' },
      { k: 'rect', x: -10, y: 100, w: 1210, h: 200, f: { p: 'tahta', c1: '#e0a868', c2: '#b97a3f', s: 64 }, n: 'Ahşap tezgâh', lift: 10 },
      { k: 'rect', x: -10, y: 100, w: 200, h: 920, f: { p: 'tahta', c1: '#e0a868', c2: '#b97a3f', s: 64, a: 90 }, n: 'Ahşap tezgâh', lift: 10 },
      { k: 'rect', x: 1400, y: 100, w: 220, h: 470, r: 12, f: { p: 'duz', c1: '#f4f7fb' }, n: 'Buzdolabı', edge: ['#c9d3de', 6], lift: 14 },
      { k: 'rect', x: 375, y: 118, w: 250, h: 165, r: 14, f: { p: 'duz', c1: '#2f3542' }, n: 'Ocak', edge: ['#1c2029', 6] },
      { k: 'rect', x: 700, y: 122, w: 205, h: 155, r: 20, f: { p: 'duz', c1: '#c3ced9' }, n: 'Evye', edge: ['#94a2b1', 6] },
      { k: 'rect', x: 955, y: 140, w: 160, h: 104, r: 18, rot: -6, f: { p: 'tahta', c1: '#f0cf9a', c2: '#d8ae6e', s: 34 }, n: 'Kesme tahtası', edge: ['#c4945a', 4] },
      { k: 'rect', x: 225, y: 150, w: 115, h: 120, r: 6, rot: 8, f: { p: 'puan', c1: '#4fb7f0', c2: '#ffffff', s: 30 }, n: 'Puantiyeli bez' },
      { k: 'rect', x: 30, y: 350, w: 125, h: 150, r: 6, rot: -4, f: { p: 'cizgili', c1: '#5cc85a', c2: '#ffffff', s: 26, a: 90 }, n: 'Çizgili örtü' },
      { k: 'ell', cx: 1300, cy: 430, rx: 78, ry: 62, f: { p: 'puan', c1: '#9b5cff', c2: '#c9a0ff', s: 28 }, n: 'Kedi minderi', edge: ['#6a3fb5', 12], lift: 6 },
      { k: 'blob', cx: 600, cy: 440, rx: 70, ry: 34, b: 6, amp: .16, ph: 1.4, f: { p: 'benek', c1: '#fbf6ea', c2: '#e6d9bd', s: 30 }, n: 'Dökülmüş un' }
    ],
    decoys: [
      { s: 'tencere', pts: [[440, 168], [562, 238], [255, 420], [1250, 560]], looks: [L('#d63a3a', '#c9ced6'), L('#3d6bff', '#ffffff', 'puan'), L('#c9ced6', '#8a9099'), L('#ff9a3c', '#2d2d3a')] },
      { s: 'caydanlik', pts: [[562, 165], [395, 640]], looks: [L('#ff4f6d', '#ffffff'), L('#2bd9c0', '#27357a', 'puan')] },
      { s: 'kupa', area: [345, 720, 100, 85], n: 3, looks: [L('#ffffff', '#7a4a2a', 'puan'), L('#4fb7f0', '#7a4a2a'), L('#ffd84a', '#7a4a2a', 'cizgili')], fall: .1 },
      { s: 'kupa', pts: [[1170, 205], [650, 260], [1180, 650], [800, 900]], looks: [L('#ff8fc8', '#7a4a2a'), L('#ffffff', '#3d6bff', 'cizgili'), L('#5cc85a', '#7a4a2a'), L('#d63a3a', '#f6e7c8', 'puan')], fall: .25 },
      { s: 'sise', area: [1350, 235, 40, 110], n: 4, looks: [L('#5cc85a', '#ffffff'), L('#4fb7f0', '#ffffff'), L('#b98a5a', '#ffd84a'), L('#ff4f6d', '#ffffff')], fall: .2 },
      { s: 'sise', pts: [[930, 250], [1000, 600]], looks: [L('#2f8f4e', '#f6e7c8'), L('#b6e35a', '#ffffff')], fall: .5 },
      { s: 'elma', area: [345, 680, 85, 80], n: 3, looks: [L('#ff4f6d', '#5cc85a'), L('#b6e35a', '#2f8f4e'), L('#ffd84a', '#5cc85a')] },
      { s: 'elma', pts: [[650, 600], [980, 760], [560, 930], [1420, 880]], looks: [L('#ff4f6d', '#5cc85a'), L('#d63a3a', '#2f8f4e'), L('#b6e35a', '#5cc85a')] },
      { s: 'limon', area: [1035, 190, 55, 28], n: 3, looks: [L('#fff27a', '#5cc85a'), L('#ffd84a', '#5cc85a'), L('#b6e35a', '#2f8f4e')], rot: [-30, 30] },
      { s: 'limon', pts: [[760, 760], [1290, 760], [255, 900]], looks: [L('#fff27a', '#5cc85a'), L('#ffd84a', '#2f8f4e')], rot: [-40, 40] },
      { s: 'saksi', pts: [[60, 140], [300, 135], [930, 128], [95, 560]], looks: [L('#d9734a', '#5cc85a'), L('#ffffff', '#2f8f4e', 'puan'), L('#ff8fc8', '#5cc85a'), L('#4fb7f0', '#2f8f4e', 'cizgili')] },
      { s: 'kaktus', pts: [[150, 150], [660, 140], [1150, 140], [95, 880]], looks: [L('#d9734a', '#5cc85a'), L('#ffd84a', '#2f8f4e', 'puan'), L('#ffffff', '#5cc85a', 'cizgili')] },
      { s: 'havlu', pts: [[645, 200], [95, 470], [1330, 175]], looks: [L('#ffffff', '#8a9099', 'puan'), L('#ffffff', '#b98a5a'), L('#fff27a', '#b98a5a', 'cizgili')], fall: .3 },
      { s: 'kavanoz', box: [40, 620, 110, 210], n: 4, looks: [L('#ff4f6d', '#ffffff', 'kare'), L('#ffb627', '#d63a3a', 'kare'), L('#b6e35a', '#27357a'), L('#ff9a3c', '#ffffff', 'puan')] },
      { s: 'kavanoz', pts: [[820, 180], [1080, 280]], looks: [L('#c9a0ff', '#ffffff'), L('#ffb627', '#7a4a2a')] }
    ],
    back(g) {
      g.fillStyle = '#dff5ef'; g.fillRect(0, 0, W, 102);
      g.strokeStyle = '#bfe3da'; g.lineWidth = 2; for (let y = 0; y < 102; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (y / 20) % 2 ? 0 : 20; x < W; x += 40) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 20); g.stroke(); } }
      // pencere
      const gr = g.createLinearGradient(0, 6, 0, 100); gr.addColorStop(0, '#6fc3ff'); gr.addColorStop(1, '#c9ecff');
      D.rr(g, 560, 4, 480, 98, 8, gr, '#ffffff', 8);
      D.circle(g, 960, 34, 18, '#ffe14a'); D.glow(g, 960, 34, 46, 'rgba(255,240,150,.6)');
      [[640, 40], [760, 26], [870, 60]].forEach(([x, y]) => { D.circle(g, x, y, 13, '#fff'); D.circle(g, x + 15, y - 6, 15, '#fff'); D.circle(g, x + 32, y, 12, '#fff'); });
      g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.beginPath(); g.moveTo(800, 4); g.lineTo(800, 100); g.moveTo(560, 52); g.lineTo(1040, 52); g.stroke();
      // perdeler (puantiyeli)
      [[520, 1], [1080, -1]].forEach(([x, s]) => { g.fillStyle = '#ff8fc8'; g.beginPath(); g.moveTo(x - 40 * s, 0); g.lineTo(x + 50 * s, 0); g.quadraticCurveTo(x + 20 * s, 50, x + 46 * s, 102); g.lineTo(x - 40 * s, 102); g.fill();
        g.fillStyle = '#ffffff'; for (let yy = 10; yy < 100; yy += 16) for (let xx = -30; xx < 40; xx += 16) D.circle(g, x + (xx + (yy % 32 ? 8 : 0)) * s, yy, 3, '#fff'); D.rr(g, s > 0 ? x - 40 : x - 50, 54, 90, 8, 3, '#ffd84a'); });
      // raf ve askılar
      D.rr(g, 40, 62, 300, 10, 3, '#b97a3f', '#7a4a2a', 2);
      [['#ff4f6d', 70], ['#ffd84a', 110], ['#4fb7f0', 150], ['#5cc85a', 270], ['#c9a0ff', 300]].forEach(([c, x]) => { D.rr(g, x - 12, 30, 24, 32, 6, c, shade(c, -.4), 2); D.rr(g, x - 13, 24, 26, 9, 3, '#ffffff', '#8a9099', 1.5); });
      D.rr(g, 190, 28, 54, 34, 8, '#ffffff', '#8a9099', 2); D.text(g, 'UN', 217, 46, 13, '#7a4a2a');
      // saat
      D.circle(g, 1250, 50, 34, '#ffffff', '#ff4f6d', 7); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; D.circle(g, 1250 + Math.cos(a) * 24, 50 + Math.sin(a) * 24, 2, '#2d2d3a'); }
      g.strokeStyle = '#2d2d3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(1250, 50); g.lineTo(1250, 32); g.moveTo(1250, 50); g.lineTo(1264, 56); g.stroke(); D.circle(g, 1250, 50, 4, '#ff4f6d');
      // kepçe/spatula askısı
      D.rr(g, 1300, 14, 90, 6, 3, '#8a9099'); [[1318, '#8a9099'], [1345, '#b98a5a'], [1372, '#ff9a3c']].forEach(([x, c], i) => { g.strokeStyle = c; g.lineWidth = 5; g.beginPath(); g.moveTo(x, 20); g.lineTo(x, 70); g.stroke(); i === 0 ? D.circle(g, x, 78, 11, c) : D.rr(g, x - 9, 66, 18, 24, 4, c); });
      g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 96, W, 6);
    },
    decor(g) {
      const r = mulberry(31);
      // tezgâh kenarı
      g.fillStyle = '#a8703a'; g.fillRect(190, 296, 1010, 12); g.fillRect(186, 300, 12, 720);
      g.fillStyle = 'rgba(40,15,50,.18)'; g.fillRect(198, 308, 1002, 14); g.fillRect(198, 308, 14, 712);
      // ocak gözleri
      [[440, 168, 1], [562, 168, 0], [440, 238, 0], [562, 238, 1]].forEach(([x, y, hot]) => { D.circle(g, x, y, 42, '#1c2029'); g.strokeStyle = hot ? '#ff5a2a' : '#4a5160'; g.lineWidth = 4; for (const rr of [18, 30, 40]) { g.beginPath(); g.arc(x, y, rr, 0, TAU); g.stroke(); } if (hot) D.glow(g, x, y, 50, 'rgba(255,90,40,.35)'); });
      for (let i = 0; i < 4; i++) D.circle(g, 410 + i * 60, 274, 7, '#c3ced9', '#1c2029', 2);
      // evye
      D.rr(g, 718, 140, 170, 118, 18, '#8fa0b3', '#6f8094', 4); const sg = g.createLinearGradient(0, 140, 0, 258); sg.addColorStop(0, 'rgba(255,255,255,.35)'); sg.addColorStop(1, 'rgba(0,0,0,.1)'); D.rr(g, 722, 144, 162, 110, 16, sg);
      D.circle(g, 803, 200, 9, '#5b6878', '#3d4856', 2); g.strokeStyle = '#d9e1ea'; g.lineWidth = 10; g.beginPath(); g.moveTo(803, 118); g.lineTo(803, 150); g.quadraticCurveTo(803, 168, 820, 172); g.stroke(); g.strokeStyle = '#94a2b1'; g.lineWidth = 2; g.stroke();
      [[790, 190], [812, 215], [770, 225]].forEach(([x, y]) => D.ell(g, x, y, 4, 6, 'rgba(160,220,255,.9)'));
      // bıçak
      g.save(); g.translate(1010, 262); g.rotate(-.1); D.rr(g, 0, -5, 60, 10, 5, '#d9e1ea', '#8a9099', 1.5); D.rr(g, 58, -6, 40, 12, 5, '#2d2d3a'); g.restore();
      // buzdolabı
      g.fillStyle = '#c9d3de'; g.fillRect(1406, 262, 208, 5); D.rr(g, 1420, 150, 12, 90, 6, '#c3ced9', '#94a2b1', 2); D.rr(g, 1420, 290, 12, 140, 6, '#c3ced9', '#94a2b1', 2);
      [[1480, 150, '#ff4f6d'], [1540, 190, '#ffd84a'], [1500, 330, '#3d6bff'], [1560, 410, '#5cc85a']].forEach(([x, y, c]) => D.circle(g, x, y, 11, c, shade(c, -.4), 2));
      D.text(g, 'A', 1580, 140, 26, '#ff9a3c', '#8a4a00'); D.text(g, 'B', 1470, 230, 26, '#9b5cff', '#4a2a8a');
      g.save(); g.translate(1520, 470); g.rotate(.06); D.rr(g, -42, -34, 84, 68, 3, '#ffffff', '#c9d3de', 2); drawChameleon(g, 0, 2, 26, '#5cc85a'); D.circle(g, 0, -34, 6, '#ff4f6d'); g.restore();
      g.fillStyle = '#ff4f6d'; g.beginPath(); g.moveTo(1585, 280); g.bezierCurveTo(1585, 268, 1600, 268, 1600, 282); g.bezierCurveTo(1600, 296, 1585, 300, 1585, 306); g.bezierCurveTo(1585, 300, 1570, 296, 1570, 282); g.bezierCurveTo(1570, 268, 1585, 268, 1585, 280); g.fill();
      // kilim saçakları
      g.strokeStyle = '#f6e7c8'; g.lineWidth = 3; for (let y = 508; y < 845; y += 9) { g.beginPath(); g.moveTo(513, y); g.lineTo(498, y + 2); g.moveTo(1117, y); g.lineTo(1132, y + 2); g.stroke(); }
      // sandalyeler ve tabaklar
      [[512, 700, Math.PI / 2], [345, 872, 0], [345, 528, Math.PI]].forEach(([x, y, a]) => { g.save(); g.translate(x, y); g.rotate(a); D.shadowBlob(g, 0, 6, 46, 30, .15); D.rr(g, -40, -26, 80, 56, 10, '#c98a4f', '#7a4a2a', 3); D.rr(g, -42, 22, 84, 14, 6, '#a8703a', '#7a4a2a', 3); g.restore(); });
      [[275, 640], [420, 760]].forEach(([x, y]) => { D.circle(g, x, y, 34, '#ffffff', '#c9d3de', 2); D.circle(g, x, y, 25, '#ffffff', '#4fb7f0', 3); });
      D.circle(g, 345, 700, 40, '#ffffff', '#3d6bff', 4); D.circle(g, 345, 700, 30, '#eef6ff');
      // uyuyan kedi
      g.save(); g.translate(1318, 446); D.shadowBlob(g, 0, 10, 40, 12, .18);
      D.ell(g, 0, 0, 36, 26, '#ff9a3c'); g.strokeStyle = '#c96a1a'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 0, 36, 26, 0, 0, TAU); g.stroke();
      g.strokeStyle = '#ff9a3c'; g.lineWidth = 11; g.lineCap = 'round'; g.beginPath(); g.arc(-4, 6, 34, .3, 1.9); g.stroke();
      D.circle(g, -24, -10, 15, '#ffab5c', '#c96a1a', 3); g.fillStyle = '#ffab5c'; [[-34, -22], [-16, -24]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x - 6, y + 6); g.lineTo(x, y - 6); g.lineTo(x + 6, y + 6); g.fill(); });
      g.strokeStyle = '#7a3a10'; g.lineWidth = 2; [[-29, -10], [-19, -10]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 3, .1 * Math.PI, .9 * Math.PI); g.stroke(); });
      g.strokeStyle = '#e07a2a'; g.lineWidth = 3; [[0, -18, 6, 14], [12, -14, 16, 12]].forEach(([a, b2, c, d2]) => { g.beginPath(); g.moveTo(a, b2); g.lineTo(c, d2); g.stroke(); });
      D.text(g, 'z', 4, -38, 14, '#ffffff', '#6a3fb5'); D.text(g, 'z', 16, -52, 11, '#ffffff', '#6a3fb5'); g.restore();
      // kedi kabı ve pati izleri
      D.ell(g, 1250, 935, 40, 26, '#ff8fc8'); D.ell(g, 1250, 930, 30, 17, '#7a4a2a'); D.text(g, 'MİNNOŞ', 1250, 958, 10, '#ffffff', '#c4148a');
      for (let i = 0; i < 7; i++) { const x = 1210 - i * 60, y = 905 - i * 32 + (i % 2) * 18; g.fillStyle = 'rgba(122,74,42,.35)'; D.ell(g, x, y, 9, 7, 'rgba(122,74,42,.35)'); [[-8, -9], [0, -12], [8, -9]].forEach(([dx, dy]) => D.circle(g, x + dx, y + dy, 3, 'rgba(122,74,42,.35)')); }
      // kırıntılar
      D.sprinkle(g, r, 40, [200, 330, 1000, 650], (x, y) => D.circle(g, x, y, 1.6 + r() * 1.5, pickRnd(r, ['#e0a868', '#fff27a', '#b98a5a'])));
    }
  },

  /* ================================================================ ORMAN KAMPI */
  orman: {
    id: 'orman', name: 'Orman Kampı', icon: '🏕️', top: 132,
    base: { p: 'cim', c1: '#86d061', c2: '#6db94c', s: 40 }, baseName: 'Çimen',
    catalog: ['kaya', 'cali', 'mantar', 'kutuk', 'cadir', 'fener', 'sandik', 'cam', 'kupa', 'tencere'],
    regions: [
      { k: 'rect', x: -10, y: 120, w: 1620, h: 75, f: { p: 'cim', c1: '#5fa94a', c2: '#4c933c', s: 40 }, n: 'Koyu çimen' },
      { k: 'blob', cx: 300, cy: 270, rx: 240, ry: 112, b: 5, amp: .07, f: { p: 'cakil', c1: '#dcc48e', c2: '#c2a66e', s: 50 }, n: 'Kamp alanı' },
      { k: 'blob', cx: 290, cy: 845, rx: 255, ry: 130, b: 6, amp: .08, ph: 1, f: { p: 'cicek', c1: '#9ad86e', c2: '#86c95a', s: 40 }, n: 'Çiçekli çayır' },
      { k: 'ell', cx: 780, cy: 305, rx: 115, ry: 70, f: { p: 'benek', c1: '#d7b48a', c2: '#b98a5a', s: 50 }, n: 'Talaşlı zemin' },
      { k: 'line', pts: [[-20, 980], [120, 880], [300, 700], [470, 600], [560, 560], [760, 565], [1000, 560], [1220, 560], [1420, 600], [1620, 560]], w: 64, f: { p: 'cakil', c1: '#e6cc98', c2: '#cfae74', s: 44 }, n: 'Toprak yol' },
      { k: 'ell', cx: 560, cy: 560, rx: 150, ry: 118, f: { p: 'cakil', c1: '#c89a68', c2: '#a87b4f', s: 46 }, n: 'Kamp ateşi alanı', edge: ['#b0855a', 5] },
      { k: 'line', pts: [[1000, 120], [1040, 260], [1150, 380], [1120, 520], [1060, 650], [1130, 790], [1250, 880], [1290, 1020]], w: 175, f: { p: 'cakil', c1: '#eadbb0', c2: '#d4c08c', s: 46 }, n: 'Kumlu kıyı' },
      { k: 'line', pts: [[1000, 120], [1040, 260], [1150, 380], [1120, 520], [1060, 650], [1130, 790], [1250, 880], [1290, 1020]], w: 112, f: { p: 'su', c1: '#4fb7f0', c2: '#a8e4ff', s: 56 }, n: 'Dere' },
      { k: 'rect', x: 1000, y: 528, w: 215, h: 66, rot: -6, r: 4, f: { p: 'tahta', c1: '#b98a5a', c2: '#7a4a2a', s: 44, a: 90 }, n: 'Tahta köprü', lift: 10 },
      { k: 'blob', cx: 1440, cy: 830, rx: 200, ry: 160, b: 5, amp: .09, ph: 2, f: { p: 'cakil', c1: '#b9bec6', c2: '#8a9099', s: 44 }, n: 'Çakıllık' },
      { k: 'ell', cx: 1430, cy: 330, rx: 132, ry: 100, f: { p: 'puan', c1: '#4f9a3f', c2: '#6fbb55', s: 30 }, n: 'Yosunlu alan' },
      { k: 'rect', x: 720, y: 760, w: 250, h: 160, rot: 8, r: 4, f: { p: 'gingham', c1: '#ffffff', c2: '#e04848', s: 40 }, n: 'Piknik örtüsü', cols: ['#ffffff', '#ef9a9a', '#e04848'] }
    ],
    decoys: [
      { s: 'cadir', area: [300, 265, 185, 62], n: 4, looks: [L('#ff9a3c', '#ffd84a'), L('#5cc85a', '#2f8f4e'), L('#4fb7f0', '#ffffff', 'cizgili'), L('#d63a3a', '#f6e7c8')], sc: [.9, 1.05], rot: [-3, 3] },
      { s: 'kaya', area: [1440, 830, 170, 130], n: 6, looks: [L('#8a9099', '#5b6370'), L('#a7adb6', '#6b7480', 'benek'), L('#c9ced6', '#8a9099'), L('#6b7480', '#4a515c', 'benek')], rot: [-30, 30] },
      { s: 'kaya', pts: [[960, 300], [1215, 690], [1155, 960], [1010, 440], [560, 470]], looks: [L('#a7adb6', '#6b7480'), L('#8a9099', '#5b6370', 'benek')], rot: [-30, 30] },
      { s: 'cali', box: [30, 150, 1540, 50], n: 6, looks: [L('#3f9a52', '#ff4f6d'), L('#2f8f4e', '#c9a0ff'), L('#5cc85a', '#ffffff', 'benek')] },
      { s: 'cali', pts: [[60, 760], [540, 930], [840, 640], [1560, 470]], looks: [L('#5cc85a', '#ff4f6d'), L('#3f9a52', '#fff27a', 'benek')] },
      { s: 'mantar', ring: [1430, 330, 88, 66], n: 7, ph: .3, looks: [L('#ff4f6d', '#ffffff', 'benek'), L('#ff4f6d', '#f6e7c8', 'benek'), L('#b98a5a', '#f6e7c8'), L('#ff9a3c', '#ffffff', 'puan')], sc: [.85, 1.15] },
      { s: 'mantar', pts: [[150, 640], [660, 760]], looks: [L('#ff4f6d', '#ffffff', 'benek'), L('#c9a0ff', '#ffffff', 'puan')] },
      { s: 'kutuk', area: [780, 305, 90, 48], n: 4, looks: [L('#9c6b3f', '#f0cf9a'), L('#7a4a2a', '#e0a868'), L('#b98a5a', '#f6e7c8')] },
      { s: 'fener', ring: [560, 560, 178, 140], n: 4, ph: .7, looks: [L('#fff27a', '#2d2d3a'), L('#ffd84a', '#d63a3a'), L('#fff27a', '#2f8f4e')] },
      { s: 'sandik', pts: [[545, 300], [1015, 905], [150, 455]], looks: [L('#b98a5a', '#2d2d3a', 'cizgili'), L('#d63a3a', '#ffd84a'), L('#9c6b3f', '#c9ced6')] },
      { s: 'cam', box: [40, 175, 1500, 40], n: 4, looks: [L('#2f8f4e', '#7a4a2a'), L('#3f9a52', '#7a4a2a', 'benek'), L('#256f3d', '#7a4a2a')] },
      { s: 'cam', area: [1545, 600, 40, 150], n: 3, looks: [L('#2f8f4e', '#7a4a2a'), L('#3f9a52', '#7a4a2a')] },
      { s: 'kupa', area: [845, 840, 95, 48], n: 3, looks: [L('#4fb7f0', '#ffffff', 'puan'), L('#d63a3a', '#ffffff', 'puan'), L('#ffffff', '#27357a')], fall: .15 },
      { s: 'kupa', pts: [[470, 520], [650, 620]], looks: [L('#5cc85a', '#ffffff', 'puan'), L('#ffd84a', '#7a4a2a')] },
      { s: 'tencere', pts: [[600, 540], [905, 790], [520, 620]], looks: [L('#2d2d3a', '#8a9099'), L('#c9ced6', '#8a9099'), L('#d63a3a', '#2d2d3a')] }
    ],
    back(g) {
      const gr = g.createLinearGradient(0, 0, 0, 135); gr.addColorStop(0, '#7cc8ff'); gr.addColorStop(1, '#e2f6ff');
      g.fillStyle = gr; g.fillRect(0, 0, W, 135);
      D.glow(g, 1400, 40, 90, 'rgba(255,240,150,.8)'); D.circle(g, 1400, 40, 26, '#ffe14a');
      [[200, 34], [620, 22], [980, 44], [1220, 18]].forEach(([x, y]) => { g.fillStyle = 'rgba(255,255,255,.95)'; [[0, 0, 16], [18, -8, 20], [40, 0, 15], [20, 6, 16]].forEach(([dx, dy, rr]) => { g.beginPath(); g.arc(x + dx, y + dy, rr, 0, TAU); g.fill(); }); });
      const mt = (pts, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, 135); pts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(W, 135); g.fill(); };
      mt([[0, 90], [120, 40], [260, 85], [420, 30], [560, 80], [720, 46], [880, 92], [1040, 36], [1200, 84], [1360, 52], [1520, 88], [1600, 60]], '#a9bfec');
      [[120, 40], [420, 30], [1040, 36]].forEach(([x, y]) => { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 22, y + 16); g.lineTo(x + 8, y + 12); g.lineTo(x - 4, y + 18); g.lineTo(x - 20, y + 14); g.fill(); });
      mt([[0, 110], [180, 70], [340, 104], [520, 64], [700, 106], [900, 72], [1080, 104], [1280, 70], [1460, 100], [1600, 80]], '#86a6dc');
      const r = mulberry(41);
      for (let x = -10; x < W + 20; x += 18) { const h = 34 + r() * 30, c = r() < .5 ? '#2f7a43' : '#3c8f50'; g.fillStyle = c; g.beginPath(); g.moveTo(x - 16, 136); g.lineTo(x, 136 - h); g.lineTo(x + 16, 136); g.fill(); g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.moveTo(x, 136 - h); g.lineTo(x + 16, 136); g.lineTo(x + 3, 136); g.fill(); }
      // tabela
      g.fillStyle = '#7a4a2a'; g.fillRect(84, 92, 8, 44); g.fillRect(150, 92, 8, 44); D.rr(g, 66, 74, 110, 36, 6, '#b98a5a', '#5b3a1e', 3); D.text(g, 'KAMP', 121, 92, 18, '#fff6d8', '#5b3a1e');
    },
    decor(g) {
      const r = mulberry(51);
      // çimen tutamları, taşlar ve yapraklar
      D.sprinkle(g, r, 90, [0, 190, W, 810], (x, y) => { g.strokeStyle = 'rgba(47,120,60,.55)'; g.lineWidth = 2; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + i * 5, y - 9 - (i ? 0 : 4)); g.stroke(); } });
      D.sprinkle(g, r, 30, [0, 190, W, 810], (x, y) => D.ell(g, x, y, 4 + r() * 3, 3 + r() * 2, pickRnd(r, ['#e98a3a', '#d6c04a', '#c9573a']), r() * 3));
      // dere: basamak taşları, sazlar, nilüferler
      [[1100, 800], [1150, 830], [1205, 850]].forEach(([x, y]) => { D.ell(g, x, y, 20, 13, '#c9ced6'); D.ell(g, x - 4, y - 4, 11, 6, '#e7ebf1'); });
      [[1105, 240], [1170, 680], [1080, 470]].forEach(([x, y]) => { D.ell(g, x, y, 16, 11, '#5cc85a'); g.fillStyle = '#4fb7f0'; g.beginPath(); g.moveTo(x, y); g.arc(x, y, 17, -.3, .3); g.fill(); D.flower(g, x + 6, y - 2, 3, '#ffffff'); });
      [[940, 210], [960, 225], [1190, 470], [1210, 455], [1015, 700], [1310, 820]].forEach(([x, y]) => { g.strokeStyle = '#3c8f50'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y + 20); g.quadraticCurveTo(x + 3, y, x - 2, y - 20); g.stroke(); D.ell(g, x - 2, y - 16, 4, 10, '#7a4a2a'); });
      // köprü korkulukları
      g.save(); g.translate(1107, 561); g.rotate(-6 * Math.PI / 180); g.fillStyle = '#5b3a1e'; g.fillRect(-112, -38, 224, 7); g.fillRect(-112, 31, 224, 7); for (let x = -108; x <= 108; x += 54) { D.circle(g, x, -35, 6, '#7a4a2a'); D.circle(g, x, 35, 6, '#7a4a2a'); } g.restore();
      // kamp ateşi
      const fx = 560, fy = 560;
      [[-1, -.3], [1, .3], [0, 1.4]].forEach(([s, a], i) => { g.save(); g.translate(fx + [-95, 95, 0][i], fy + [10, 10, 85][i]); g.rotate(a * .3 + (i === 2 ? Math.PI / 2 * 0 : 0)); D.shadowBlob(g, 0, 10, 58, 14, .2); D.rr(g, -52, -14, 104, 28, 14, '#9c6b3f', '#5b3a1e', 3); D.ell(g, 52, 0, 9, 14, '#f0cf9a'); g.strokeStyle = '#7a4a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(-40, -4); g.lineTo(30, -4); g.moveTo(-30, 5); g.lineTo(40, 5); g.stroke(); g.restore(); });
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; D.ell(g, fx + Math.cos(a) * 42, fy + Math.sin(a) * 34, 11, 8, i % 2 ? '#9aa3ae' : '#b9bec6'); }
      g.save(); g.translate(fx, fy); [[.6, '#7a4a2a'], [-.6, '#9c6b3f']].forEach(([a, c]) => { g.save(); g.rotate(a); D.rr(g, -34, -7, 68, 14, 7, c, '#4a2a12', 2); g.restore(); }); g.restore();
      D.glow(g, fx, fy - 10, 110, 'rgba(255,170,60,.45)');
      [[34, '#ff5a2a'], [25, '#ff9a3c'], [15, '#ffe14a']].forEach(([s, c]) => { g.fillStyle = c; g.beginPath(); g.moveTo(fx - s * .8, fy + 6); g.quadraticCurveTo(fx - s, fy - s * .6, fx, fy - s * 1.6); g.quadraticCurveTo(fx + s, fy - s * .6, fx + s * .8, fy + 6); g.quadraticCurveTo(fx, fy + s * .4, fx - s * .8, fy + 6); g.fill(); });
      // odun yığını
      for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) { const x = 890 + i * 26 + row * 13, y = 270 - row * 22; D.circle(g, x, y, 13, '#c98a4f', '#7a4a2a', 2.5); D.circle(g, x, y, 6, 'rgba(0,0,0,0)', '#9c6b3f', 1.5); }
      g.save(); g.translate(700, 250); g.rotate(-.5); D.rr(g, -4, -36, 8, 60, 3, '#9c6b3f', '#5b3a1e', 1.5); D.rr(g, -14, -44, 26, 14, 3, '#c9ced6', '#6b7480', 2); g.restore();
      // çamaşır ipi
      [[420, 175], [560, 196]].forEach(([x, y]) => { D.circle(g, x, y, 6, '#7a4a2a'); });
      g.strokeStyle = '#f6e7c8'; g.lineWidth = 2; g.beginPath(); g.moveTo(420, 175); g.quadraticCurveTo(490, 200, 560, 196); g.stroke();
      [[445, 184, '#ff4f6d'], [475, 191, '#ffd84a'], [508, 195, '#4fb7f0'], [536, 196, '#c9a0ff']].forEach(([x, y, c]) => D.rr(g, x - 9, y, 18, 22, 3, c, shade(c, -.4), 1.5));
      // piknik sepeti
      g.save(); g.translate(990, 790); g.rotate(.2); D.shadowBlob(g, 0, 18, 44, 12); D.rr(g, -38, -22, 76, 44, 10, '#d9a05b', '#8a5a2a', 3); g.strokeStyle = '#b07a3a'; g.lineWidth = 2; for (let x = -30; x <= 30; x += 10) { g.beginPath(); g.moveTo(x, -20); g.lineTo(x, 20); g.stroke(); } g.strokeStyle = '#8a5a2a'; g.lineWidth = 5; g.beginPath(); g.arc(0, -22, 26, Math.PI, 0); g.stroke(); g.restore();
      // çayır çiçekleri ve kelebekler
      D.sprinkle(g, r, 16, [70, 740, 440, 200], (x, y) => D.flower(g, x, y, 5 + r() * 2, pickRnd(r, ['#ff8fc8', '#fff27a', '#ffffff', '#c9a0ff', '#ff9a3c'])));
      [[420, 760, '#ff8fc8'], [180, 900, '#ffd84a'], [1300, 250, '#4fb7f0']].forEach(([x, y, c]) => { g.fillStyle = c; D.ell(g, x - 7, y, 8, 11, c, -.4); D.ell(g, x + 7, y, 8, 11, c, .4); g.fillStyle = '#2d2d3a'; g.fillRect(x - 1.5, y - 8, 3, 16); });
      // peri halkası
      for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; D.circle(g, 1430 + Math.cos(a) * 112, 330 + Math.sin(a) * 84, 2.2, 'rgba(255,255,255,.7)'); }
      // ateş böcekleri
      D.sprinkle(g, r, 14, [0, 140, W, 90], (x, y) => { D.glow(g, x, y, 10, 'rgba(255,250,150,.8)'); D.circle(g, x, y, 1.8, '#fffbd0'); });
    }
  }
};
function pickRnd(r, arr) { return arr[Math.floor(r() * arr.length)]; }
Object.values(MAPS).forEach(m => { m.regions.forEach(prepRegion); m.baseRegion = prepRegion({ k: 'rect', x: 0, y: 0, w: W, h: H, f: m.base, n: m.baseName }); });
const MAP_IDS = Object.keys(MAPS);
const MAP_NAMES = { lunapark: 'Lunapark', mutfak: 'Mutfak', orman: 'Orman Kampı' };
const decoyCache = new Map();
function decoysOf(mapId, seed) {
  const key = mapId + ':' + seed;
  if (!decoyCache.has(key)) { if (decoyCache.size > 12) decoyCache.clear(); decoyCache.set(key, genDecoys(MAPS[mapId], seed)); }
  return decoyCache.get(key);
}

/* ------------------------------------------------------------------ KURALLAR (yöneten cihaz) */
const COME_MS = 3200, REVEAL_MS = 6500, PROBE_GAP = 550, PENALTY_MS = 3000, SURVIVE_CAP = 120;
const optNum = (v, allowed, def) => { const n = parseInt(v, 10); return allowed.includes(n) ? n : def; };
const hiderIds = st => Object.keys(st.hiders).map(Number);
function lookOf(h) { return { shape: h.shape, x: h.spot ? h.spot.x : 0, y: h.spot ? h.spot.y : 0, rot: h.rot, scale: h.scale, c1: h.c1, c2: h.c2, pat: h.pat }; }
function spotOk(map, x, y, R) { return x >= R * .6 && x <= W - R * .6 && y >= map.top + R * .5 && y <= H - R * .5; }
function clampSpot(map, x, y) { return { x: Math.round(clamp(x, 24, W - 24)), y: Math.round(clamp(y, map.top + 24, H - 24)) }; }

function randomSpot(st, shape, scale) {
  const map = MAPS[st.mapId], decoys = decoysOf(st.mapId, st.seed), R = SHAPES[shape].r * scale;
  for (let t = 0; t < 200; t++) {
    const x = rnd(40, W - 40), y = rnd(map.top + 40, H - 40);
    if (decoys.every(d => dist(d.x, d.y, x, y) > (propR(d) + R) * .8)) return clampSpot(map, x, y);
  }
  return clampSpot(map, rnd(60, W - 60), rnd(map.top + 60, H - 60));
}
// Bilgisayar saklanırken: aynı şekilden bir süsün yanına geçer, rengini/desenini (küçük kusurlarla) taklit eder
function botDisguise(st, pi) {
  const map = MAPS[st.mapId], decoys = decoysOf(st.mapId, st.seed);
  const taken = hiderIds(st).filter(k => k !== pi && st.hiders[k].spot).map(k => st.hiders[k].spot);
  for (let t = 0; t < 120; t++) {
    const d = pickR(decoys); if (!map.catalog.includes(d.shape)) continue;
    const scale = +clamp(d.scale + rnd(-.07, .07), .8, 1.3).toFixed(2), R = SHAPES[d.shape].r * scale;
    const a = rnd(0, TAU), dd = (propR(d) + R) * rnd(.9, 1.45);
    const x = d.x + Math.cos(a) * dd, y = d.y + Math.sin(a) * dd;
    if (!spotOk(map, x, y, R)) continue;
    if (decoys.some(o => o !== d && dist(o.x, o.y, x, y) < (propR(o) + R) * .78)) continue;
    if (taken.some(s => dist(s.x, s.y, x, y) < R * 2.2)) continue;
    let c1 = d.c1, c2 = d.c2, pat = d.pat; const q = Math.random();
    if (q < .5) { c1 = jitterColor(c1, .025); c2 = jitterColor(c2, .03); }
    else if (q < .82) { c1 = jitterColor(c1, .07); c2 = jitterColor(c2, .09); }
    else { const gc = groundCols(groundAt(map, x, y)); c1 = jitterColor(gc[0], .05); c2 = gc[1] || c2; if (Math.random() < .5) pat = pickR(PAT_IDS); }
    const rot = Math.round(((d.rot + rnd(-10, 10)) % 360 + 360) % 360);
    return { spot: clampSpot(map, x, y), shape: d.shape, rot, scale, c1, c2, pat };
  }
  const shape = pickR(map.catalog);
  return { spot: randomSpot(st, shape, 1), shape, rot: 0, scale: 1, c1: pickR(PALETTE), c2: pickR(PALETTE), pat: 'duz' };
}
// Bilgisayar ararken: yalnızca Ebe'nin ekranında görünenleri (süsler + kimliksiz kılıklar) değerlendirir
function botProbeTarget(st) {
  const map = MAPS[st.mapId], decoys = decoysOf(st.mapId, st.seed);
  const objs = decoys.map(d => Object.assign({ orig: true }, d))
    .concat(st.discOrder.filter(k => !st.hiders[k].found).map(k => Object.assign({ orig: false }, lookOf(st.hiders[k]))));
  const cand = objs.filter(o => st.probes.every(p => dist(p.x, p.y, o.x, o.y) > PROBE_R * .9));
  if (!cand.length) return { x: rnd(60, W - 60), y: rnd(map.top + 60, H - 60) };
  const ws = cand.map(o => {
    const gc = groundCols(groundAt(map, o.x, o.y));
    const gm = Math.min(cdist(o.c1, gc[0]), cdist(o.c1, gc[1] || gc[0]));
    let sm = .55, twin = 0;
    for (const d of decoys) {
      if (d.shape !== o.shape || (o.orig && d.x === o.x && d.y === o.y)) continue;
      const dd = dist(d.x, d.y, o.x, o.y); if (dd > 320) continue;
      const m = cdist(d.c1, o.c1) + cdist(d.c2, o.c2) * .5 + (d.pat !== o.pat ? .12 : 0) + Math.abs(d.scale - o.scale) * .3;
      sm = Math.min(sm, m); if (dd < 150 && m < .07) twin = .3;
    }
    const camo = Math.min(gm * 1.1, sm);
    const unfamiliar = !o.orig && Math.random() < .3 ? .55 : 0;
    const s = camo * 2.1 + twin + unfamiliar + Math.random() * .75;
    return Math.exp(3 * s);
  });
  let tot = ws.reduce((a, b) => a + b, 0), r = Math.random() * tot, k = 0;
  while (k < ws.length - 1 && (r -= ws[k]) > 0) k++;
  const o = cand[k], j = rnd(0, 14), a = rnd(0, TAU);
  return { x: o.x + Math.cos(a) * j, y: o.y + Math.sin(a) * j };
}

function arm(st, ctx) {
  const pid = st.pid;
  ctx.later(Math.max(0, st.endsAt - Date.now()) + 40, () => {
    if (st.pid !== pid) return;
    if (Date.now() < st.endsAt - 25) { arm(st, ctx); return; }
    if (st.phase === 'hide') endHide(st, ctx);
    else if (st.phase === 'come') startSeek(st, ctx);
    else if (st.phase === 'seek') endSeek(st, ctx, 'time');
    else if (st.phase === 'reveal') nextRound(st, ctx);
  });
}
function setPhase(st, ph, ms) { st.phase = ph; st.pid++; st.endsAt = Date.now() + ms; st.dur = ms; }
function pname(st, pi) { return st.players[pi] ? st.players[pi].name : '?'; }

function startRound(st, ctx) {
  st.round++;
  st.seeker = st.order[st.round - 1];
  let mid = st.mapOpt;
  if (!MAPS[mid]) { const prev = st.mapId; const pool = MAP_IDS.filter(m => m !== prev); mid = pickR(pool.length ? pool : MAP_IDS); }
  st.mapId = mid; st.seed = rndi(1, 999999999);
  const map = MAPS[mid];
  st.hiders = {};
  st.players.forEach((p, i) => {
    if (i === st.seeker) return;
    st.hiders[i] = { spot: null, shape: pickR(map.catalog), rot: 0, scale: 1, c1: pickR(PALETTE), c2: pickR(PALETTE), pat: 'duz', ready: false, found: false, foundAt: 0, taunt: false, auto: false };
  });
  st.probes = []; st.taunts = []; st.discOrder = []; st.lastProbeAt = 0; st.seekStart = 0;
  st.probesLeft = st.probesMax ? st.probesMax : null;
  st.last = null;
  setPhase(st, 'hide', st.hideS * 1000);
  ctx.emit({ t: 'phase', ph: 'hide', round: st.round, seeker: st.seeker, map: mid },
    `Tur ${st.round}/${st.total} · ${map.name} · Ebe: ${pname(st, st.seeker)}. Saklanma süresi ${st.hideS} sn!`, 'gold');
  arm(st, ctx);
  hiderIds(st).forEach(pi => { if (st.players[pi].isBot) schedBotHide(st, pi, ctx); });
  // Bağlantısı kopuk saklananlar: rastgele bir yere kilitlenir (tur onları beklemesin)
  const off = hiderIds(st).filter(pi => !st.players[pi].isBot && st.online[pi] === false);
  off.forEach(pi => { if (st.phase === 'hide') lockHider(st, pi, ctx); });
  ctx.sync();
}
function schedBotHide(st, pi, ctx) {
  const pid = st.pid, ms = rnd(1800, Math.max(2500, Math.min(9000, st.endsAt - Date.now() - 2500)));
  ctx.later(ms, () => {
    const h = st.hiders[pi]; if (st.pid !== pid || st.phase !== 'hide' || !h || h.ready) return;
    Object.assign(h, botDisguise(st, pi));
    markReady(st, pi, ctx);
  });
}
function markReady(st, pi, ctx, how) {
  const h = st.hiders[pi]; if (!h) return;
  if (!h.spot) h.spot = randomSpot(st, h.shape, h.scale);
  h.ready = true;
  const ids = hiderIds(st), n = ids.filter(k => st.hiders[k].ready).length;
  ctx.emit({ t: 'ready', pi }, how || `${pname(st, pi)} saklandı (${n}/${ids.length}).`);
  if (ids.every(k => st.hiders[k].ready)) endHide(st, ctx); else ctx.sync();
}
function endHide(st, ctx) {
  if (st.phase !== 'hide') return;
  hiderIds(st).forEach(k => { const h = st.hiders[k]; if (!h.spot) { h.spot = randomSpot(st, h.shape, h.scale); h.auto = true; } h.ready = true; });
  setPhase(st, 'come', COME_MS);
  ctx.emit({ t: 'phase', ph: 'come', round: st.round, seeker: st.seeker }, `Herkes yerinde! Ebe ${pname(st, st.seeker)} geliyor…`);
  arm(st, ctx); ctx.sync();
}
function startSeek(st, ctx) {
  if (st.phase !== 'come') return;
  const sk = st.players[st.seeker];
  if (sk && !sk.isBot && st.online[st.seeker] === false) {
    st.seekStart = Date.now();
    finishRound(st, ctx, 'skip'); return;
  }
  setPhase(st, 'seek', st.seekS * 1000);
  st.seekStart = Date.now();
  st.discOrder = shuf(hiderIds(st));
  ctx.emit({ t: 'phase', ph: 'seek', round: st.round, seeker: st.seeker },
    `Arama başladı! ${st.probesMax ? st.probesMax + ' arama hakkı' : 'Sınırsız arama (her boş arama 3 sn)'}, ${st.seekS} sn.`, 'gold');
  arm(st, ctx);
  if (sk && sk.isBot) schedBotSeek(st, ctx, true);
  hiderIds(st).forEach(pi => {
    if (!st.players[pi].isBot || Math.random() > .35) return;
    const pid = st.pid;
    ctx.later(rnd(7000, Math.max(8000, st.seekS * 1000 - 6000)), () => { if (st.pid === pid && st.phase === 'seek') doTaunt(st, pi, ctx); });
  });
  ctx.sync();
}
function schedBotSeek(st, ctx, first) {
  const pid = st.pid;
  ctx.later(first ? rnd(2600, 4200) : rnd(3000, 6000), () => {
    if (st.pid !== pid || st.phase !== 'seek') return;
    const t = botProbeTarget(st);
    doProbe(st, st.seeker, t.x, t.y, ctx);
    if (st.pid === pid && st.phase === 'seek') schedBotSeek(st, ctx, false);
  });
}
function doProbe(st, pi, x, y, ctx) {
  if (st.phase !== 'seek' || pi !== st.seeker) return false;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const now = Date.now();
  if (now - st.lastProbeAt < PROBE_GAP) return false;
  st.lastProbeAt = now;
  x = Math.round(clamp(x, 0, W)); y = Math.round(clamp(y, 0, H));
  const hits = hiderIds(st).filter(k => { const h = st.hiders[k]; return !h.found && h.spot && dist(x, y, h.spot.x, h.spot.y) <= PROBE_R + propR(h) * .4; });
  st.probes.push({ x, y, hit: hits.length > 0 });
  if (hits.length) {
    hits.forEach(k => { st.hiders[k].found = true; st.hiders[k].foundAt = now; });
    const found = hits.map(k => ({ pi: k, name: pname(st, k), color: st.players[k].color, x: st.hiders[k].spot.x, y: st.hiders[k].spot.y }));
    ctx.emit({ t: 'probe', x, y, hit: true, found }, `🔍 ${pname(st, pi)} buldu: ${found.map(f => f.name).join(', ')}!`, 'good');
  } else {
    if (st.probesLeft != null) st.probesLeft = Math.max(0, st.probesLeft - 1);
    else { st.endsAt -= PENALTY_MS; st.dur = Math.max(1, st.dur); arm(st, ctx); }
    ctx.emit({ t: 'probe', x, y, hit: false, left: st.probesLeft, pen: st.probesLeft == null });
  }
  const ids = hiderIds(st);
  if (ids.length && ids.every(k => st.hiders[k].found)) endSeek(st, ctx, 'all');
  else if (st.probesLeft === 0) endSeek(st, ctx, 'probes');
  else if (Date.now() >= st.endsAt) endSeek(st, ctx, 'time');
  else ctx.sync();
  return true;
}
function doTaunt(st, pi, ctx) {
  const h = st.hiders[pi];
  if (st.phase !== 'seek' || !h || h.found || h.taunt) return;
  h.taunt = true;
  const R = propR(h), a = rnd(0, TAU), d = rnd(.5, 2.6) * R;
  const t = { x: Math.round(clamp(h.spot.x + Math.cos(a) * d, 10, W - 10)), y: Math.round(clamp(h.spot.y + Math.sin(a) * d, 10, H - 10)), at: Date.now() };
  st.taunts.push(t);
  ctx.emit({ t: 'taunt', x: t.x, y: t.y }, '🔊 Bir yerden kıkırdama sesi geldi!', 'gold');
  ctx.sync();
}
function endSeek(st, ctx, reason) { if (st.phase !== 'seek') return; finishRound(st, ctx, reason); }
function finishRound(st, ctx, reason) {
  const now = Date.now(), ids = hiderIds(st);
  const rows = [];
  const foundN = ids.filter(k => st.hiders[k].found).length, all = ids.length > 0 && foundN === ids.length;
  const remain = Math.max(0, Math.round((st.endsAt - now) / 1000));
  if (reason !== 'skip') {
    const sp = foundN * 100 + (all ? 2 * remain : 0);
    rows.push({ pi: st.seeker, pts: sp, role: 'seeker', note: `${foundN} kişi buldu${all ? ` · +${2 * remain} süre bonusu` : ''}` });
    ids.forEach(k => {
      const h = st.hiders[k], until = h.found ? h.foundAt : now;
      const secs = Math.max(0, (until - st.seekStart) / 1000);
      let pts = Math.min(SURVIVE_CAP, 10 * Math.floor(secs / 5)), note = `${Math.floor(secs)} sn dayandı`;
      if (!h.found) { pts += 150; note += ' · sona kadar saklandı +150'; if (h.taunt) { pts += 50; note += ' · ses bonusu +50'; } }
      rows.push({ pi: k, pts, role: 'hider', found: h.found, note });
    });
    rows.forEach(r => { st.scores[r.pi] += r.pts; });
  }
  st.last = { reason, round: st.round, rows, foundN, total: ids.length };
  setPhase(st, 'reveal', REVEAL_MS);
  const why = { all: 'Ebe herkesi buldu!', time: 'Süre doldu!', probes: 'Arama hakları bitti!', left: 'Ebe oyundan düştü, tur bitti.', skip: 'Ebe bağlı olmadığı için tur geçildi.' }[reason] || 'Tur bitti.';
  ctx.emit({ t: 'reveal', reason, foundN, total: ids.length }, `${why} (${foundN}/${ids.length} bulundu)`, reason === 'all' ? 'good' : 'gold');
  arm(st, ctx); ctx.sync();
}
function nextRound(st, ctx) {
  if (st.round < st.total) { startRound(st, ctx); return; }
  setPhase(st, 'over', 0);
  const ranking = st.players.map((p, i) => ({ pi: i, score: st.scores[i], label: `${st.scores[i]} puan` })).sort((a, b) => b.score - a.score);
  const best = st.players[ranking[0].pi];
  ctx.emit({ t: 'over' }, `Oyun bitti! En iyi bukalemun: ${best.name}.`, 'gold');
  ctx.sync();
  ctx.later(600, () => ctx.end({ title: `${best.name} saklambaç şampiyonu!`, ranking, note: `${st.total} tur oynandı · Bulunan saklanan: 100 puan, sona kadar saklanmak: 150 puan.` }));
}
function lockHider(st, pi, ctx) {
  const h = st.hiders[pi]; if (!h || h.ready) return;
  if (!h.spot) { h.spot = randomSpot(st, h.shape, h.scale); h.auto = true; }
  markReady(st, pi, ctx, `${pname(st, pi)} bağlantısı koptu; son hâli kilitlendi.`);
}

const RULES = {
  setup(players, opts, ctx) {
    opts = opts || {};
    const n = players.length;
    const humans = players.map((p, i) => p.isBot ? -1 : i).filter(i => i >= 0), bots = players.map((p, i) => p.isBot ? i : -1).filter(i => i >= 0);
    const cycles = optNum(opts.tur, [1, 2], 1);
    let base;
    if (humans.length === 1 && bots.length) base = [bots[0], humans[0]].concat(bots.slice(1));   // tek insan: önce saklanır, sonra Ebe olur
    else { const s = Math.floor(Math.random() * n); base = players.map((_, i) => (i + s) % n); }
    const order = []; for (let c = 0; c < cycles; c++) order.push(...base);
    const st = {
      players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })),
      hideS: optNum(opts.saklan, [30, 45, 60, 90], 45), seekS: optNum(opts.ara, [60, 90, 120, 180], 90),
      probesMax: optNum(opts.hak, [8, 12, 20, 0], 12), cycles, mapOpt: MAPS[opts.harita] ? opts.harita : (opts.harita === 'rastgele' ? 'rastgele' : 'lunapark'),
      order, round: 0, total: order.length, phase: 'start', pid: 0, endsAt: 0, dur: 1,
      seeker: -1, mapId: null, seed: 1, hiders: {}, discOrder: [], probes: [], probesLeft: null, taunts: [], lastProbeAt: 0, seekStart: 0,
      scores: players.map(() => 0), last: null, online: players.map(() => true)
    };
    startRound(st, ctx);
    return st;
  },
  action(st, pi, a, ctx) {
    const h = st.hiders[pi];
    if (a.t === 'cfg') {
      if (st.phase !== 'hide' || !h || h.ready) return;
      const map = MAPS[st.mapId];
      if (a.spot && Number.isFinite(a.spot.x) && Number.isFinite(a.spot.y)) h.spot = clampSpot(map, a.spot.x, a.spot.y);
      if (typeof a.shape === 'string' && map.catalog.includes(a.shape)) h.shape = a.shape;
      if (Number.isFinite(a.rot)) h.rot = Math.round(((a.rot % 360) + 360) % 360);
      if (Number.isFinite(a.scale)) h.scale = +clamp(a.scale, .8, 1.3).toFixed(2);
      if (typeof a.c1 === 'string' && HEX.test(a.c1)) h.c1 = a.c1.toLowerCase();
      if (typeof a.c2 === 'string' && HEX.test(a.c2)) h.c2 = a.c2.toLowerCase();
      if (PAT_IDS.includes(a.pat)) h.pat = a.pat;
      ctx.sync();
    } else if (a.t === 'ready') {
      if (st.phase !== 'hide' || !h || h.ready) return;
      if (!h.spot) return;
      markReady(st, pi, ctx);
    } else if (a.t === 'unready') {
      if (st.phase !== 'hide' || !h || !h.ready) return;
      h.ready = false; ctx.emit({ t: 'unready', pi }, `${pname(st, pi)} kılığını düzenliyor.`); ctx.sync();
    } else if (a.t === 'probe') {
      doProbe(st, pi, +a.x, +a.y, ctx);
    } else if (a.t === 'taunt') {
      doTaunt(st, pi, ctx);
    }
  },
  view(st, viewer) {
    const n = st.players.length, me = Number.isInteger(viewer) && viewer >= 0 && viewer < n ? viewer : -1;
    const role = me < 0 ? 'spect' : me === st.seeker ? 'seeker' : 'hider';
    const ids = hiderIds(st), now = Date.now();
    const v = {
      phase: st.phase, round: st.round, total: st.total, seeker: st.seeker, mapId: st.mapId, seed: st.seed, role, me,
      left: Math.max(0, st.endsAt - now), dur: st.dur || 1,
      probesLeft: st.probesLeft, probesMax: st.probesMax, hideS: st.hideS, seekS: st.seekS,
      probes: st.phase === 'seek' || st.phase === 'reveal' || st.phase === 'over' ? st.probes.map(p => ({ x: p.x, y: p.y, hit: p.hit })) : [],
      taunts: st.phase === 'seek' ? st.taunts.filter(t => now - t.at < 4000).map(t => ({ x: t.x, y: t.y, age: now - t.at })) : [],
      players: st.players.map((p, i) => {
        const h = st.hiders[i];
        return { name: p.name, color: p.color, isBot: p.isBot, online: st.online[i] !== false, score: st.scores[i],
          seeker: i === st.seeker, ready: h ? h.ready : false, found: h ? h.found : false };
      }),
      hiderCount: ids.length, readyCount: ids.filter(k => st.hiders[k].ready).length, foundCount: ids.filter(k => st.hiders[k].found).length,
      last: st.phase === 'reveal' || st.phase === 'over' ? st.last : null
    };
    if (role === 'hider' && st.hiders[me]) { const h = st.hiders[me]; v.mine = Object.assign(lookOf(h), { spot: h.spot ? { x: h.spot.x, y: h.spot.y } : null, ready: h.ready, found: h.found, taunt: h.taunt, auto: h.auto }); }
    if (st.phase === 'seek') {
      // Kimliksiz, karışık sıralı kılıklar (izleyicinin kendisi hariç)
      v.disguises = st.discOrder.filter(k => !st.hiders[k].found && k !== me).map(k => lookOf(st.hiders[k]));
      v.found = ids.filter(k => st.hiders[k].found).map(k => Object.assign(lookOf(st.hiders[k]), { name: pname(st, k), color: st.players[k].color, pi: k }));
    }
    if (st.phase === 'reveal' || st.phase === 'over') {
      v.all = ids.map(k => Object.assign(lookOf(st.hiders[k]), { name: pname(st, k), color: st.players[k].color, pi: k, found: st.hiders[k].found, taunt: st.hiders[k].taunt }));
    }
    return v;
  },
  turnOf() { return null; },
  skipTurn() { /* zaman tabanlı evreler: kopmalar onPresence ile işlenir */ },
  botAct() { /* bilgisayar hamleleri zamanlayıcılarla (ctx.later) yapılır */ },
  botDelay: 900,
  onPresence(st, pi, online, ctx) {
    st.online[pi] = online;
    if (online) return;
    if (st.phase === 'hide' && st.hiders[pi] && !st.hiders[pi].ready) lockHider(st, pi, ctx);
    else if (st.phase === 'seek' && pi === st.seeker) endSeek(st, ctx, 'left');
  },
  resume(st, ctx) {
    if (st.phase === 'over') return;
    arm(st, ctx);
    if (st.phase === 'hide') hiderIds(st).forEach(pi => { if (st.players[pi].isBot && !st.hiders[pi].ready) schedBotHide(st, pi, ctx); });
    if (st.phase === 'seek' && st.players[st.seeker] && st.players[st.seeker].isBot) schedBotSeek(st, ctx, true);
  }
};

/* ------------------------------------------------------------------ ARAYÜZ (her cihaz) */
let root = null, ui = null, V = null, built = '', phaseKey = '';
let cv = null, cg = null, stageEl = null, lensCv = null;
let scene = null;                                    // { mapId, seed, map, decoys, ground, k }
let cam = { s: .5, x: 0, y: 0 }, sw = 300, sh = 300, dpr = 1;
let draft = null, draftFor = '', tab = 'yer', slot = 'c1', picking = false, armed = true;
let anims = [], raf = 0, dirty = true, deadline = 0, lastSec = -1, hudT = null, sendT = null, toastT = null, lastTap = 0, frameN = 0;
let pointers = new Map(), gest = null, hover = null, ro = null, pendingHide = null;
const q = s => root && root.querySelector(s);
const qa = s => root ? [...root.querySelectorAll(s)] : [];
const now = () => performance.now();
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const lookFrom = m => ({ shape: m.shape, x: m.spot ? m.spot.x : 0, y: m.spot ? m.spot.y : 0, rot: m.rot, scale: m.scale, c1: m.c1, c2: m.c2, pat: m.pat });
const isHiding = () => V && V.role === 'hider' && V.phase === 'hide' && V.mine && !V.mine.ready;

/* ---------- sahne (zemin tuvali) ---------- */
function ensureScene(mapId, seed) {
  if (!mapId || !MAPS[mapId]) return;
  if (scene && scene.mapId === mapId && scene.seed === seed) return;
  const map = MAPS[mapId];
  if (!scene || scene.mapId !== mapId) {
    const k = Math.min(2, Math.max(1.25, (window.devicePixelRatio || 1) * .9));
    const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
    const g = c.getContext('2d'); g.scale(k, k);
    paintRegion(g, map.baseRegion, k);
    map.regions.forEach(rg => paintRegion(g, rg, k));
    map.back(g); map.decor(g);
    scene = { mapId, seed, map, ground: c, k, decoys: decoysOf(mapId, seed) };
  } else { scene.seed = seed; scene.decoys = decoysOf(mapId, seed); }
}
// Ortamdan renk al: önce dokunulan süs eşyası, yoksa zemin pikseli
function sampleAt(x, y) {
  if (!scene) return null;
  const ds = scene.decoys.slice().sort((a, b) => b.y - a.y);
  for (const d of ds) if (dist(d.x, d.y, x, y) < propR(d) * .8) return { c1: d.c1, c2: d.c2, from: SHAPES[d.shape].name };
  try {
    const k = scene.k, px = scene.ground.getContext('2d').getImageData(Math.round(x * k) - 1, Math.round(y * k) - 1, 3, 3).data;
    let r = 0, gg = 0, b = 0; for (let i = 0; i < px.length; i += 4) { r += px[i]; gg += px[i + 1]; b += px[i + 2]; }
    const rg = groundAt(scene.map, x, y);
    return { c1: rgb2hex(r / 9, gg / 9, b / 9), from: rg.n };
  } catch { return null; }
}
function nearColors(spot) {
  if (!scene || !spot) return [];
  const out = [], add = (c, why) => { if (c && HEX.test(c) && !out.some(o => cdist(o.c, c) < .02)) out.push({ c, why }); };
  const rg = groundAt(scene.map, spot.x, spot.y);
  groundCols(rg).forEach(c => add(c, rg.n));
  scene.decoys.map(d => [d, dist(d.x, d.y, spot.x, spot.y)]).sort((a, b) => a[1] - b[1]).slice(0, 3).forEach(([d]) => { add(d.c1, SHAPES[d.shape].name); add(d.c2, SHAPES[d.shape].name); });
  return out.slice(0, 8);
}

/* ---------- kamera ---------- */
function camLimits() { const contain = Math.min(sw / W, sh / H), cover = Math.max(sw / W, sh / H); return { contain, cover, min: contain * .96, max: Math.max(2.6, cover * 3) }; }
function clampCam() {
  const L2 = camLimits(); cam.s = clamp(cam.s, L2.min, L2.max);
  const vw = sw / cam.s, vh = sh / cam.s;
  cam.x = vw >= W ? (W - vw) / 2 : clamp(cam.x, 0, W - vw);
  cam.y = vh >= H ? (H - vh) / 2 : clamp(cam.y, 0, H - vh);
}
function fitCam(mode) {
  const L2 = camLimits();
  cam.s = mode === 'all' ? L2.contain : Math.min(L2.cover, L2.contain * 1.9);
  cam.x = W / 2 - sw / 2 / cam.s; cam.y = H / 2 - sh / 2 / cam.s + (scene ? scene.map.top * .35 : 0);
  clampCam(); requestDraw();
}
function fitReveal() {
  const pts = (V && V.all || []).filter(a => a.x || a.y);
  if (!pts.length) { fitCam('all'); return; }
  const m = 150, x0 = Math.min(...pts.map(p => p.x)) - m, x1 = Math.max(...pts.map(p => p.x)) + m, y0 = Math.min(...pts.map(p => p.y)) - m - 40, y1 = Math.max(...pts.map(p => p.y)) + m;
  const L2 = camLimits(), s = clamp(Math.min(sw / (x1 - x0), sh / (y1 - y0)), L2.contain, Math.max(L2.contain, L2.cover * 1.6));
  centerOn((x0 + x1) / 2, (y0 + y1) / 2, s);
}
function centerOn(x, y, s) { if (s) cam.s = s; cam.x = x - sw / 2 / cam.s; cam.y = y - sh / 2 / cam.s; clampCam(); requestDraw(); }
function zoomAt(sx, sy, f) { const wx = cam.x + sx / cam.s, wy = cam.y + sy / cam.s; const L2 = camLimits(); cam.s = clamp(cam.s * f, L2.min, L2.max); cam.x = wx - sx / cam.s; cam.y = wy - sy / cam.s; clampCam(); requestDraw(); }
const toWorld = (sx, sy) => [cam.x + sx / cam.s, cam.y + sy / cam.s];
function toClient(x, y) { const r = cv.getBoundingClientRect(); return [r.left + (x - cam.x) * cam.s, r.top + (y - cam.y) * cam.s]; }
function resize() {
  if (!stageEl || !cv) return;
  const r = stageEl.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return;
  const cx = cam.x + sw / 2 / cam.s, cy = cam.y + sh / 2 / cam.s, first = sw === 300 && sh === 300;
  sw = r.width; sh = r.height; dpr = Math.min(2.5, window.devicePixelRatio || 1);
  cv.width = Math.round(sw * dpr); cv.height = Math.round(sh * dpr);
  if (first) fitCam(); else centerOn(cx, cy);
  requestDraw();
}

/* ---------- çizim ---------- */
function requestDraw() { dirty = true; if (!raf && root) raf = requestAnimationFrame(frame); }
function frame() {
  raf = 0; if (!root || !cv) return;
  const t = now(); anims = anims.filter(a => t - a.start < a.dur);
  frameN++;
  const live = anims.length > 0 || (V && (V.phase === 'hide' || V.phase === 'come' || V.phase === 'seek') && V.role === 'hider') || (V && V.phase === 'reveal');
  if (dirty || (live && frameN % 2 === 0)) {
    dirty = false;
    drawScene(cg, sw, sh, cam, dpr, false);
    if (lensCv && V && V.role === 'hider' && (V.phase === 'hide' || V.phase === 'come')) drawLens();
  }
  if (live || dirty) raf = requestAnimationFrame(frame);
}
function sceneItems() {
  const items = []; if (!V || !scene) return items;
  const ph = V.phase;
  scene.decoys.forEach(d => items.push({ p: d }));
  if (V.role === 'hider' && V.mine && (ph === 'hide' || ph === 'come' || ph === 'seek') && !V.mine.found) {
    const m = isHiding() && draft ? draft : V.mine;
    if (m.spot) items.push({ p: lookFrom(m), me: true });
  }
  if (ph === 'seek') { (V.disguises || []).forEach(d => items.push({ p: d })); (V.found || []).forEach(f => items.push({ p: f, cham: f })); }
  if (ph === 'reveal' || ph === 'over') (V.all || []).forEach(a => items.push({ p: a, rev: a, cham: a.found ? a : null }));
  return items.sort((a, b) => a.p.y - b.p.y);
}
function pill(g, s, x, y, text, bg, fg = '#fff', size = 13) {
  g.save(); g.translate(x, y); g.scale(1 / s, 1 / s);
  g.font = `900 ${size}px "Nunito","Segoe UI",system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(text).width + 16, h = size + 10;
  const p = new Path2D(); rrPath(p, -w / 2, -h / 2, w, h, h / 2);
  g.fillStyle = 'rgba(20,6,40,.35)'; g.translate(0, 2); g.fill(p); g.translate(0, -2);
  g.fillStyle = bg; g.fill(p); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke(p);
  g.fillStyle = fg; g.fillText(text, 0, 1);
  g.restore();
}
function drawScene(g, w, h, cm, pr, lens) {
  g.setTransform(pr, 0, 0, pr, 0, 0);
  g.fillStyle = '#1a0b3d'; g.fillRect(0, 0, w, h);
  if (!scene) return;
  g.save(); g.scale(cm.s, cm.s); g.translate(-cm.x, -cm.y);
  g.drawImage(scene.ground, 0, 0, W, H);
  const t = now();
  const items = sceneItems();
  for (const it of items) {
    if (it.cham) {
      const pop = anims.find(a => a.t === 'pop' && Math.abs(a.x - it.p.x) < 2 && Math.abs(a.y - it.p.y) < 2);
      let k = 1; if (pop) { const u = (t - pop.start) / pop.dur; k = u < .35 ? u / .35 * 1.25 : 1.25 - .25 * Math.min(1, (u - .35) / .3); }
      const R = propR(it.p);
      if (pop && (t - pop.start) / pop.dur < .25) drawProp(g, it.p);
      drawChameleon(g, it.p.x, it.p.y + R * .1, Math.max(26, R * 1.15) * k, it.cham.color, t / 400);
    } else drawProp(g, it.p);
  }
  // arama izleri
  if (V && V.probes) for (const p of V.probes) {
    g.save(); g.translate(p.x, p.y);
    if (p.hit) { g.strokeStyle = 'rgba(255,225,74,.95)'; g.lineWidth = 4 / Math.max(.5, cm.s) * .6 + 2; g.setLineDash([]); g.beginPath(); g.arc(0, 0, PROBE_R, 0, TAU); g.stroke(); }
    else {
      g.fillStyle = 'rgba(20,6,40,.18)'; g.beginPath(); g.arc(0, 0, PROBE_R, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2.5; g.setLineDash([8, 7]); g.stroke(); g.setLineDash([]);
      g.strokeStyle = '#2a0f3c'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(-12, -12); g.lineTo(12, 12); g.moveTo(12, -12); g.lineTo(-12, 12); g.stroke();
      g.strokeStyle = '#ff5c7a'; g.lineWidth = 5; g.stroke();
    }
    g.restore();
  }
  // kendi kılığın
  const meIt = items.find(i => i.me);
  if (meIt && !lens) {
    const R = propR(meIt.p) + 12, col = V.players[V.me] ? V.players[V.me].color : '#fff';
    g.save(); g.translate(meIt.p.x, meIt.p.y); g.strokeStyle = col; g.lineWidth = 3.2 / Math.min(1, cm.s) * .7 + 1; g.setLineDash([10, 8]); g.lineDashOffset = -t / 40;
    g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke(); g.setLineDash([]); g.restore();
    pill(g, cm.s, meIt.p.x, meIt.p.y - R - 12 / cm.s, V.phase === 'seek' ? 'SEN (gizli)' : 'SEN', col, '#12052e');
  }
  // tur sonu: herkesin kılığı ve adı
  for (const it of items) if (it.rev) {
    const R = propR(it.p) + 10;
    g.save(); g.translate(it.p.x, it.p.y); g.strokeStyle = it.rev.color; g.lineWidth = 4; g.globalAlpha = .6 + .4 * Math.sin(t / 220);
    g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke(); g.restore();
    pill(g, cm.s, it.p.x, it.p.y - R - 12 / cm.s, (it.rev.found ? '💥 ' : '🦎 ') + it.rev.name, it.rev.color, '#12052e');
  }
  if (V && V.phase === 'seek') (V.found || []).forEach(f => pill(g, cm.s, f.x, f.y - propR(f) - 22 / cm.s, '💥 ' + f.name, f.color, '#12052e'));
  // canlandırmalar
  for (const a of anims) {
    const u = (t - a.start) / a.dur;
    if (a.t === 'probe' || a.t === 'aim') {
      const rr = PROBE_R * (.55 + .45 * Math.min(1, u * 2.2)), al = 1 - Math.max(0, (u - .6) / .4);
      g.save(); g.translate(a.x, a.y); g.globalAlpha = al;
      g.fillStyle = 'rgba(200,240,255,.28)'; g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.fill();
      g.strokeStyle = '#ffe14a'; g.lineWidth = 6; g.stroke(); g.strokeStyle = '#7a3a00'; g.lineWidth = 2; g.stroke();
      g.strokeStyle = '#ffb627'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(rr * .72, rr * .72); g.lineTo(rr * 1.25, rr * 1.25); g.stroke();
      g.restore();
    } else if (a.t === 'miss') {
      g.save(); g.globalAlpha = 1 - Math.max(0, (u - .55) / .45); pill(g, cm.s, a.x, a.y - PROBE_R - 18 / cm.s - u * 30, 'Burada kimse yok', '#2a0f5c', '#ffd6e6', 14); g.restore();
    } else if (a.t === 'ripple') {
      g.save(); g.translate(a.x, a.y);
      for (let i = 0; i < 3; i++) { const v = (u * 2.2 + i * .33) % 1; g.globalAlpha = (1 - v) * (1 - u * .6); g.strokeStyle = '#ffe14a'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 14 + v * 90, 0, TAU); g.stroke(); }
      g.globalAlpha = 1 - u; g.restore(); pill(g, cm.s, a.x, a.y, '🔊 kıkır kıkır!', '#ffb627', '#3a1500', 14);
    } else if (a.t === 'pop') {
      g.save(); g.translate(a.x, a.y); g.globalAlpha = 1 - u; g.strokeStyle = '#ffe14a'; g.lineWidth = 4;
      for (let i = 0; i < 10; i++) { const ang = i / 10 * TAU, r1 = 30 + u * 50, r2 = r1 + 18; g.beginPath(); g.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1); g.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2); g.stroke(); }
      g.restore();
    }
  }
  // fare önizlemesi
  if (!lens && hover && V) {
    if (V.phase === 'seek' && V.role === 'seeker' && armed) { g.save(); g.translate(hover[0], hover[1]); g.strokeStyle = 'rgba(255,225,74,.9)'; g.lineWidth = 3; g.setLineDash([6, 6]); g.beginPath(); g.arc(0, 0, PROBE_R, 0, TAU); g.stroke(); g.restore(); }
    if (picking) { const s = sampleAt(hover[0], hover[1]); if (s) { g.save(); g.translate(hover[0], hover[1] - 46 / cm.s); g.scale(1 / cm.s, 1 / cm.s); g.fillStyle = s.c1; g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill(); g.stroke(); g.restore(); } }
  }
  g.restore();
}
function drawLens() {
  const m = isHiding() && draft ? draft : V.mine; if (!m) return;
  const lg = lensCv.getContext('2d'), w = lensCv.clientWidth || 110, h = lensCv.clientHeight || 110, pr = Math.min(2.5, window.devicePixelRatio || 1);
  if (lensCv.width !== Math.round(w * pr)) { lensCv.width = Math.round(w * pr); lensCv.height = Math.round(h * pr); }
  if (!m.spot) { lg.setTransform(pr, 0, 0, pr, 0, 0); lg.fillStyle = '#12052e'; lg.fillRect(0, 0, w, h); lg.fillStyle = '#b9a8e6'; lg.font = '800 12px Nunito,sans-serif'; lg.textAlign = 'center'; lg.fillText('Yer seçilmedi', w / 2, h / 2); return; }
  const s = Math.max(1, w / (propR(m) * 5));
  drawScene(lg, w, h, { s, x: m.spot.x - w / 2 / s, y: m.spot.y - h / 2 / s }, pr, true);
}
function drawIcon(c, look) {
  const pr = 2, w = c.clientWidth || 52, h = c.clientHeight || 52;
  if (c.width !== w * pr) { c.width = w * pr; c.height = h * pr; }
  const g = c.getContext('2d'); g.setTransform(pr, 0, 0, pr, 0, 0); g.clearRect(0, 0, w, h);
  const R = SHAPES[look.shape].r, s = (w * .34) / R;
  g.save(); g.scale(s, s); drawProp(g, Object.assign({}, look, { x: w / 2 / s, y: h / 2 / s - R * .08, rot: 0, scale: 1 })); g.restore();
}
function drawPatIcon(c, pat, c1, c2) {
  const pr = 2, w = c.clientWidth || 40; if (c.width !== w * pr) { c.width = c.height = w * pr; }
  const g = c.getContext('2d'); g.setTransform(pr, 0, 0, pr, 0, 0); g.clearRect(0, 0, w, w);
  g.save(); g.translate(w / 2, w / 2); g.scale(w / 230, w / 230);
  const p = new Path2D(); rrPath(p, -100, -100, 200, 200, 40); g.fillStyle = c1; g.fill(p);
  if (pat !== 'duz') { g.save(); g.clip(p); propPattern(g, pat, c2, 'top'); g.restore(); }
  g.strokeStyle = shade(c1, -.5); g.lineWidth = 10; g.stroke(p); g.restore();
}

/* ---------- giriş: kaydır, yakınlaştır, dokun ---------- */
function ptr(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function onDown(e) {
  if (!V) return;
  e.preventDefault(); Sound.init();
  try { cv.setPointerCapture(e.pointerId); } catch { /* */ }
  const [x, y] = ptr(e); pointers.set(e.pointerId, { x, y });
  if (pointers.size === 1) {
    let drag = false;
    if (isHiding() && draft && draft.spot && !picking) { const [wx, wy] = toWorld(x, y); drag = dist(wx, wy, draft.spot.x, draft.spot.y) < propR(draft) + 8 / cam.s; }
    gest = { t: 'one', id: e.pointerId, sx: x, sy: y, cam0: { ...cam }, moved: false, drag, t0: now() };
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    gest = { t: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: cam.s, m0: [(a.x + b.x) / 2, (a.y + b.y) / 2], cam0: { ...cam } };
  }
}
function onMove(e) {
  if (!V) return;
  const [x, y] = ptr(e);
  if (e.pointerType === 'mouse' && !pointers.size) { hover = toWorld(x, y); if ((V.phase === 'seek' && V.role === 'seeker') || picking) requestDraw(); return; }
  if (!pointers.has(e.pointerId)) return;
  pointers.get(e.pointerId).x = x; pointers.get(e.pointerId).y = y;
  if (gest && gest.t === 'pinch' && pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), m = [(a.x + b.x) / 2, (a.y + b.y) / 2];
    const L2 = camLimits(), s = clamp(gest.s0 * d / gest.d0, L2.min, L2.max);
    const wx = gest.cam0.x + gest.m0[0] / gest.s0, wy = gest.cam0.y + gest.m0[1] / gest.s0;
    cam.s = s; cam.x = wx - m[0] / s; cam.y = wy - m[1] / s; clampCam(); requestDraw();
  } else if (gest && gest.t === 'one' && gest.id === e.pointerId) {
    const dx = x - gest.sx, dy = y - gest.sy;
    if (!gest.moved && Math.hypot(dx, dy) > 7) gest.moved = true;
    if (!gest.moved) return;
    if (gest.drag && isHiding()) { const [wx, wy] = toWorld(x, y); draft.spot = clampSpot(scene.map, wx, wy); updateHideInfo(); requestDraw(); }
    else { cam.x = gest.cam0.x - dx / cam.s; cam.y = gest.cam0.y - dy / cam.s; clampCam(); requestDraw(); }
  }
}
function onUp(e) {
  if (!pointers.has(e.pointerId)) return;
  const [x, y] = ptr(e);
  pointers.delete(e.pointerId);
  if (gest && gest.t === 'one' && gest.id === e.pointerId) {
    if (!gest.moved && e.type === 'pointerup' && now() - gest.t0 < 700) { const [wx, wy] = toWorld(x, y); onTap(wx, wy); }
    else if (gest.drag && gest.moved) sendCfg(true);
    gest = null;
  } else if (gest && gest.t === 'pinch') {
    if (pointers.size === 1) { const [id, p] = [...pointers.entries()][0]; gest = { t: 'one', id, sx: p.x, sy: p.y, cam0: { ...cam }, moved: true, drag: false, t0: 0 }; }
    else gest = null;
  }
  if (!pointers.size) gest = null;
}
function onWheel(e) { if (!V) return; e.preventDefault(); const [x, y] = ptr(e); zoomAt(x, y, Math.exp(-e.deltaY * .0016)); }
function onLeaveCanvas() { if (hover) { hover = null; requestDraw(); } }

function toast(text, cls) {
  const t = q('.sk-toast'); if (!t) return;
  t.textContent = text; t.className = 'sk-toast show ' + (cls || ''); clearTimeout(toastT);
  toastT = setTimeout(() => { if (t) t.className = 'sk-toast'; }, 1700);
}
function onTap(wx, wy) {
  if (!V || !scene) return;
  if (picking && isHiding()) {
    const s = sampleAt(wx, wy); picking = false;
    if (s) { draft[slot] = s.c1; if (s.c2 && slot === 'c1' && HEX.test(s.c2)) draft._sugg = s.c2; toast(`Renk alındı: ${s.from}`, 'ok'); Sound.buy(); sendCfg(true); }
    renderTab(); requestDraw(); return;
  }
  if (isHiding()) {
    if (wy < scene.map.top + 10) { toast('Burası gökyüzü/duvar — saklanamazsın!', 'bad'); Sound.bad(); return; }
    draft.spot = clampSpot(scene.map, wx, wy); Sound.tick(.4); sendCfg(true); updateHideInfo(); requestDraw();
    if (tab === 'yer' && !q('.sk-tabbody [data-shape]')) { /* yer sekmesi açık kalır */ }
    return;
  }
  if (V.phase === 'seek' && V.role === 'seeker') {
    if (!armed) { toast('Aramak için önce 🔍 ARA düğmesini aç.', 'bad'); return; }
    if (now() - lastTap < 520) return;
    lastTap = now();
    anims.push({ t: 'aim', x: wx, y: wy, start: now(), dur: 500 });
    ui.send({ t: 'probe', x: Math.round(wx), y: Math.round(wy) }); requestDraw();
  }
}
function sendCfg(now2) {
  if (!draft || !isHiding()) return;
  clearTimeout(sendT);
  const go = () => { sendT = null; if (isHiding()) ui.send({ t: 'cfg', spot: draft.spot, shape: draft.shape, rot: draft.rot, scale: draft.scale, c1: draft.c1, c2: draft.c2, pat: draft.pat }); };
  if (now2) go(); else sendT = setTimeout(go, 160);
}

/* ---------- yerleşim ---------- */
const CHAM_SVG = `<svg class="sk-chsvg" viewBox="0 0 200 150" aria-hidden="true">
  <path d="M62 96 C12 96 8 142 46 140 C72 138 70 112 52 114" fill="none" stroke="#2f8f4e" stroke-width="19" stroke-linecap="round"/>
  <path d="M62 96 C12 96 8 142 46 140 C72 138 70 112 52 114" fill="none" stroke="#5cc85a" stroke-width="11" stroke-linecap="round"/>
  <path d="M52 92 C52 40 132 30 152 58 C188 66 192 96 162 106 C132 118 72 120 52 92Z" fill="#5cc85a" stroke="#2f8f4e" stroke-width="5"/>
  <path d="M62 100 C92 114 142 112 164 102 C132 106 92 108 62 100Z" fill="#b6e35a"/>
  <circle cx="86" cy="70" r="6" fill="#86d061"/><circle cx="108" cy="58" r="5" fill="#86d061"/><circle cx="118" cy="80" r="4" fill="#86d061"/>
  <circle cx="152" cy="72" r="18" fill="#b6e35a" stroke="#2f8f4e" stroke-width="4"/>
  <path d="M141 73 Q152 83 163 73" stroke="#1b0a2a" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="170" cy="90" rx="7" ry="3.5" fill="#ff8fc8" opacity=".8"/>
  <path d="M166 98 Q176 102 184 95" stroke="#2f8f4e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M118 104 Q130 84 142 80" stroke="#2f8f4e" stroke-width="10" fill="none" stroke-linecap="round"/>
</svg>`;
function mountDom() {
  root.innerHTML = `<div class="g-wrap sk">
    <div class="sk-hud">
      <div class="sk-players"></div>
      <div class="sk-statusrow"><div class="sk-status"></div>
        <div class="sk-meters"><span class="sk-m sk-timer">⏱ <b>0:00</b></span><span class="sk-m sk-probes" hidden>🔍 <b>12</b></span><span class="sk-m sk-found" hidden>🦎 <b>0/0</b></span></div></div>
      <div class="sk-bar"><i></i></div>
    </div>
    <div class="sk-main">
      <div class="sk-stage">
        <canvas class="sk-cv" aria-label="Saklambaç haritası"></canvas>
        <div class="sk-mapname"></div><div class="sk-stimer">⏱ <b>0:00</b></div>
        <div class="sk-zoom"><button type="button" data-z="in" aria-label="Yakınlaştır">+</button><button type="button" data-z="out" aria-label="Uzaklaştır">−</button><button type="button" data-z="all" class="sk-zall">Tümü</button><button type="button" data-z="me" aria-label="Benim yerim" hidden>🎯</button></div>
        <div class="sk-fab"></div>
        <div class="sk-toast" aria-live="polite"></div>
        <div class="sk-black" hidden>${CHAM_SVG}<h3 class="sk-bh">Gözlerini kapat!</h3><p class="sk-bp">Sayıyor: <b class="sk-count">10</b></p><p class="sk-bready"></p></div>
      </div>
      <aside class="sk-side g-panel"></aside>
    </div>
  </div>`;
  cv = q('.sk-cv'); cg = cv.getContext('2d'); stageEl = q('.sk-stage');
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp); cv.addEventListener('pointerleave', onLeaveCanvas);
  cv.addEventListener('wheel', onWheel, { passive: false });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  if (window.ResizeObserver) { ro = new ResizeObserver(() => resize()); ro.observe(stageEl); }
  addEventListener('resize', resize);
}
function layoutKind(v) {
  if (v.phase === 'reveal' || v.phase === 'over') return 'reveal';
  if (v.phase === 'seek') return 'seek';
  return v.role === 'hider' ? 'hide' : 'wait';
}
function buildSide(kind) {
  built = kind; lensCv = null;
  const side = q('.sk-side');
  if (kind === 'hide') {
    side.innerHTML = `<div class="sk-lensrow"><canvas class="sk-lens"></canvas><div class="sk-lensinfo"><b class="sk-h">Kılığın</b><span class="sk-gi"></span><span class="sk-ri"></span></div></div>
      <div class="sk-tabs" role="tablist"><button type="button" data-tab="yer">📍 Yer</button><button type="button" data-tab="sekil">🧸 Şekil</button><button type="button" data-tab="boya">🎨 Boya</button></div>
      <div class="sk-tabbody"></div>
      <div class="sk-readyrow"></div>`;
    lensCv = q('.sk-lens');
  } else side.innerHTML = '<div class="sk-info"></div>';
}
function renderTab() {
  const body = q('.sk-tabbody'); if (!body || !V || !V.mine) return;
  const lock = !isHiding(), m = lock ? V.mine : draft;
  qa('.sk-tabs [data-tab]').forEach(b => { b.classList.toggle('on', b.dataset.tab === tab); b.setAttribute('aria-selected', b.dataset.tab === tab); });
  const dis = lock ? 'disabled' : '';
  if (tab === 'yer') {
    body.innerHTML = `<p class="sk-p">Haritaya <b>dokunarak</b> saklanacağın yeri seç. Kendi eşyanı sürükleyerek taşıyabilir, haritayı kaydırıp iki parmakla yakınlaştırabilirsin.</p>
      <p class="sk-tip">💡 Aynı eşyalardan oluşan bir grubun arasına saklan, sonra onlar gibi boyan!</p>
      <div class="sk-row"><button type="button" class="btn btn-ghost" data-act="goto" ${m.spot ? '' : 'disabled'}>🎯 Yerime git</button><button type="button" class="btn btn-ghost" data-act="randspot" ${dis}>🎲 Rastgele yer</button></div>`;
  } else if (tab === 'sekil') {
    body.innerHTML = `<div class="sk-shapes">${scene.map.catalog.map(id => `<button type="button" class="sk-shape ${m.shape === id ? 'on' : ''}" data-shape="${id}" ${dis}><canvas></canvas><span>${esc(SHAPES[id].name)}</span></button>`).join('')}</div>
      <div class="sk-ctl"><span>Açı</span><button type="button" data-act="rotl" ${dis} aria-label="Sola çevir">⟲</button><input type="range" min="0" max="359" step="1" value="${m.rot}" data-in="rot" ${dis} aria-label="Açı"><button type="button" data-act="rotr" ${dis} aria-label="Sağa çevir">⟳</button><b data-val="rot">${m.rot}°</b></div>
      <div class="sk-ctl"><span>Boy</span><button type="button" data-act="smaller" ${dis} aria-label="Küçült">−</button><input type="range" min="80" max="130" step="1" value="${Math.round(m.scale * 100)}" data-in="scale" ${dis} aria-label="Boy"><button type="button" data-act="bigger" ${dis} aria-label="Büyüt">+</button><b data-val="scale">%${Math.round(m.scale * 100)}</b></div>`;
    qa('.sk-shape').forEach(b => drawIcon(b.querySelector('canvas'), { shape: b.dataset.shape, c1: m.c1, c2: m.c2, pat: m.pat }));
  } else {
    const near = nearColors(m.spot);
    body.innerHTML = `<div class="sk-slots"><button type="button" data-slot="c1" class="${slot === 'c1' ? 'on' : ''}" ${dis}><i style="background:${m.c1}"></i>Ana renk</button><button type="button" data-slot="c2" class="${slot === 'c2' ? 'on' : ''}" ${dis}><i style="background:${m.c2}"></i>İkinci renk</button></div>
      <div class="sk-pal">${PALETTE.map(c => `<button type="button" data-col="${c}" style="--c:${c}" class="${m[slot] === c ? 'on' : ''}" aria-label="Renk ${c}" ${dis}></button>`).join('')}</div>
      <button type="button" class="btn ${picking ? 'btn-solve' : 'btn-vowel'} sk-pick" data-act="pick" ${dis}>${picking ? '👆 Haritada bir yere dokun…' : '💧 Ortamdan renk al'}</button>
      ${near.length ? `<div class="sk-near"><span>Yakındaki renkler</span><div class="sk-nearcols">${near.map(n => `<button type="button" data-col="${n.c}" style="--c:${n.c}" title="${esc(n.why)}" aria-label="${esc(n.why)} rengi" ${dis}></button>`).join('')}</div></div>` : '<p class="sk-tip">Önce bir yer seçersen etrafındaki renkleri burada görürsün.</p>'}
      <div class="sk-pats">${PATS.map(p => `<button type="button" data-pat="${p.id}" class="${m.pat === p.id ? 'on' : ''}" ${dis}><canvas></canvas><span>${p.name}</span></button>`).join('')}</div>`;
    qa('.sk-pats [data-pat]').forEach(b => drawPatIcon(b.querySelector('canvas'), b.dataset.pat, m.c1, m.c2));
  }
}
function updateHideInfo() {
  if (!V || !V.mine) return;
  const m = isHiding() && draft ? draft : V.mine;
  const gi = q('.sk-gi'); if (gi) gi.textContent = m.spot && scene ? `Zemin: ${groundAt(scene.map, m.spot.x, m.spot.y).n}` : 'Henüz yer seçmedin';
  const zm = q('[data-z="me"]'); if (zm) zm.hidden = !m.spot;
  const ri = q('.sk-ri'); if (ri) ri.textContent = `${V.readyCount}/${V.hiderCount} saklanan hazır`;
  const rr = q('.sk-readyrow');
  if (rr) {
    if (V.phase === 'come') rr.innerHTML = '<button type="button" class="btn btn-ghost sk-ready" disabled>🔒 Kılığın kilitlendi</button>';
    else if (V.mine.ready) rr.innerHTML = '<p class="sk-okmsg">✔ Saklandın! Diğerleri bekleniyor…</p><button type="button" class="btn btn-ghost sk-ready" data-act="unready">✎ Kılığı düzenle</button>';
    else rr.innerHTML = `<button type="button" class="btn btn-spin sk-ready" data-act="ready" ${m.spot ? '' : 'disabled'}>${m.spot ? '✔ HAZIRIM' : '📍 Önce bir yer seç'}</button>`;
  }
  requestDraw();
}
function renderHud() {
  const v = V, me = v.me;
  q('.sk-players').innerHTML = v.players.map((p, i) => {
    let tag;
    if (p.seeker) tag = '<span class="sk-tag ebe">👁 Ebe</span>';
    else if (v.phase === 'hide') tag = `<span class="sk-tag ${p.ready ? 'ok' : ''}">${p.ready ? '✓ hazır' : '⏳'}</span>`;
    else if (v.phase === 'seek' || v.phase === 'reveal' || v.phase === 'over') tag = `<span class="sk-tag ${p.found ? 'bad' : 'ok'}">${p.found ? '💥' : '🦎'}</span>`;
    else tag = '<span class="sk-tag">🦎</span>';
    return `<div class="g-chip ${p.seeker ? 'active' : ''} ${i === me ? 'me' : ''} ${p.online === false ? 'off' : ''}" style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><b>${esc(p.name)}${i === me ? '<small> · sen</small>' : ''}</b>${tag}<span class="g-num">${p.score}</span></div>`;
  }).join('');
  const sk = v.players[v.seeker], skn = sk ? esc(sk.name) : '?';
  let st = '', cls = '';
  if (v.phase === 'hide') {
    if (v.role === 'hider') { if (v.mine && v.mine.ready) st = '✔ Saklandın! Diğerleri bekleniyor…'; else { st = '🦎 Saklan! Yer seç, şekil değiştir, kendini boya'; cls = 'mine'; } }
    else if (v.role === 'seeker') { st = '🙈 Sen Ebe\'sin — gözlerini kapat ve say!'; }
    else st = `Saklananlar kılık değiştiriyor… Ebe: ${skn}`;
  } else if (v.phase === 'come') st = v.role === 'seeker' ? '👀 Hazır ol, geliyorsun!' : `🤫 Ebe ${skn} geliyor… kıpırdama!`;
  else if (v.phase === 'seek') {
    if (v.role === 'seeker') { st = '🔍 Ara! Şüphelendiğin yere dokun'; cls = 'mine'; }
    else if (v.role === 'hider') st = v.mine && v.mine.found ? '💥 Bulundun! Artık izliyorsun' : `🤫 Kıpırdama! Ebe ${skn} arıyor…`;
    else st = `Ebe ${skn} arıyor…`;
  } else if (v.phase === 'reveal') { st = `🎉 Tur ${v.round} bitti — kılıklar açıldı!`; cls = 'win'; }
  else { st = '🏆 Oyun bitti!'; cls = 'win'; }
  q('.sk-status').innerHTML = `<span class="g-turn ${cls}">${st}</span>`;
  const pr = q('.sk-probes'); pr.hidden = v.phase !== 'seek' && v.phase !== 'reveal';
  pr.querySelector('b').textContent = v.probesLeft == null ? '∞' : v.probesLeft;
  pr.title = v.probesLeft == null ? 'Sınırsız arama: her boş arama 3 saniye götürür' : 'Kalan arama hakkı';
  const fd = q('.sk-found'); fd.hidden = v.phase !== 'seek' && v.phase !== 'reveal' && v.phase !== 'over';
  fd.querySelector('b').textContent = `${v.foundCount}/${v.hiderCount}`;
  const zm = q('[data-z="me"]'); if (zm) { const m = isHiding() && draft ? draft : v.mine; zm.hidden = !(v.role === 'hider' && m && m.spot && !m.found && v.phase !== 'reveal' && v.phase !== 'over'); }
  q('.sk-mapname').textContent = `${MAPS[v.mapId].icon} ${MAPS[v.mapId].name} · Tur ${v.round}/${v.total}`;
}
function renderSide() {
  const v = V, info = q('.sk-info');
  const fab = q('.sk-fab');
  if (built === 'hide') { renderTab(); updateHideInfo(); fab.innerHTML = ''; }
  const sk = v.players[v.seeker], skn = sk ? esc(sk.name) : '?';
  if (built === 'wait') {
    const seeker = v.role === 'seeker';
    info.innerHTML = `<h3 class="sk-h">${seeker ? '🙈 Ebe sensin!' : '⏳ Saklanıyorlar'}</h3>
      <p class="sk-p">${seeker ? 'Saklananlar şu an haritada bir yer seçiyor, eşyaya dönüşüp kendilerini boyuyor. Süre bitince arama başlar.' : `Ebe <b>${skn}</b> gözlerini kapattı. Saklananlar kılık değiştiriyor.`}</p>
      <div class="sk-big"><b>${v.readyCount}/${v.hiderCount}</b><span>saklanan hazır</span></div>
      <ul class="sk-rules"><li>🔍 Arama hakkı: <b>${v.probesMax ? v.probesMax : 'Sınırsız'}</b>${v.probesMax ? '' : ' (boş arama −3 sn)'}</li><li>⏱ Arama süresi: <b>${v.seekS} sn</b></li><li>💡 Süslerle aynı görünen ama biraz farklı duran eşyalara dikkat!</li></ul>`;
    fab.innerHTML = '';
  } else if (built === 'seek') {
    const found = v.found || [];
    if (v.role === 'seeker') {
      info.innerHTML = `<h3 class="sk-h">🔍 Ara!</h3><p class="sk-p">Şüphelendiğin eşyaya <b>dokun</b>: büyüteç dairesinin içinde bir saklanan varsa bulunur. ${v.probesMax ? 'Boş aramalar hak götürür.' : 'Boş arama 3 saniye götürür.'}</p>
        <div class="sk-big"><b>${v.probesLeft == null ? '∞' : v.probesLeft}</b><span>${v.probesLeft == null ? 'sınırsız arama' : 'arama hakkı kaldı'}</span></div>${foundList(found, v)}`;
      fab.innerHTML = `<button type="button" class="sk-fbtn ara ${armed ? 'on' : ''}" data-act="arm">🔍 ARA <small>${armed ? 'açık' : 'kapalı'}</small></button>`;
    } else if (v.role === 'hider') {
      const m = v.mine || {};
      info.innerHTML = `<h3 class="sk-h">${m.found ? '💥 Bulundun!' : '🤫 Kıpırdama!'}</h3><p class="sk-p">${m.found ? 'Artık izleyicisin. Bakalım diğerleri dayanabilecek mi?' : `Ebe <b>${skn}</b> arıyor. Aramaları canlı görüyorsun. Sona kadar dayanırsan +150 puan!`}</p>
        ${m.found ? '' : `<p class="sk-tip">🔊 <b>Ses çıkar</b>: Ebe'nin ekranında yakınında bir ses dalgası belirir. Bulunmazsan +50 bonus!</p>`}${foundList(found, v)}`;
      fab.innerHTML = m.found ? '' : `<button type="button" class="sk-fbtn taunt" data-act="taunt" ${m.taunt ? 'disabled' : ''}>🔊 ${m.taunt ? 'Ses çıkardın' : 'Ses çıkar'} <small>+50</small></button>`;
    } else { info.innerHTML = `<h3 class="sk-h">👀 İzliyorsun</h3><p class="sk-p">Ebe <b>${skn}</b> arıyor.</p>${foundList(found, v)}`; fab.innerHTML = ''; }
  } else if (built === 'reveal') {
    const L2 = v.last || { rows: [] };
    const why = { all: 'Ebe herkesi buldu!', time: 'Süre doldu!', probes: 'Arama hakları bitti!', left: 'Ebe oyundan düştü.', skip: 'Ebe bağlı değildi, tur geçildi.' }[L2.reason] || 'Tur bitti';
    const rows = L2.rows.slice().sort((a, b) => b.pts - a.pts);
    info.innerHTML = `<h3 class="sk-h">${v.phase === 'over' ? '🏆 Oyun bitti' : `🎉 Tur ${v.round}/${v.total} bitti`}</h3><p class="sk-p">${why} <b>${L2.foundN || 0}/${L2.total || 0}</b> saklanan bulundu.</p>
      <ol class="sk-res">${rows.map(r => { const p = v.players[r.pi]; return `<li style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><span class="sk-rn"><b>${r.role === 'seeker' ? '👁 ' : r.found ? '💥 ' : '🦎 '}${esc(p.name)}</b><small>${esc(r.note)}</small></span><span class="sk-pts">+${r.pts}</span></li>`; }).join('')}</ol>
      ${v.phase === 'reveal' ? `<p class="sk-tip">${v.round < v.total ? 'Sıradaki tur birazdan başlıyor…' : 'Sonuçlar geliyor…'}</p>` : ''}`;
    fab.innerHTML = '';
  }
}
function foundList(found, v) {
  return `<div class="sk-flist"><span>Bulunanlar (${v.foundCount}/${v.hiderCount})</span>${found.length ? found.map(f => `<em style="--pc:${f.color}">💥 ${esc(f.name)}</em>`).join('') : '<em class="none">Henüz kimse bulunamadı</em>'}</div>`;
}
function renderBlack() {
  const b = q('.sk-black'); if (!b) return;
  const show = V.role !== 'hider' && (V.phase === 'hide' || V.phase === 'come');
  b.hidden = !show; cv.classList.toggle('blind', show);
  if (!show) return;
  q('.sk-bh').textContent = V.phase === 'come' ? 'Hazır ol!' : V.role === 'seeker' ? 'Gözlerini kapat!' : 'Saklanıyorlar…';
  q('.sk-bready').textContent = `${V.readyCount}/${V.hiderCount} kişi hazır`;
}
function hudTick() {
  if (!V || !root) return;
  const left = Math.max(0, deadline - now()), secs = Math.ceil(left / 1000);
  const tm = q('.sk-timer b'); if (tm) tm.textContent = V.phase === 'over' ? '—' : mmss(secs);
  const tm2 = q('.sk-stimer b'); if (tm2) tm2.textContent = V.phase === 'over' ? '—' : mmss(secs);
  q('.sk-stimer').classList.toggle('urgent', (V.phase === 'hide' || V.phase === 'seek') && secs <= 10);
  const bar = q('.sk-bar i'); if (bar) bar.style.width = (V.phase === 'over' ? 0 : clamp(left / (V.dur || 1), 0, 1) * 100) + '%';
  const urgent = (V.phase === 'hide' || V.phase === 'seek') && secs <= 10;
  q('.sk-timer').classList.toggle('urgent', urgent); q('.sk-bar').classList.toggle('urgent', urgent);
  q('.sk-bar').dataset.ph = V.phase;
  const cnt = q('.sk-count'); if (cnt) cnt.textContent = secs;
  const bp = q('.sk-bp'); if (bp) bp.firstChild.textContent = V.phase === 'come' ? 'Ebe geliyor: ' : V.role === 'seeker' ? 'Sayıyor: ' : 'Kalan süre: ';
  if (secs !== lastSec) {
    if ((V.phase === 'hide' || V.phase === 'seek') && secs <= 5 && secs > 0) Sound.tick(.8);
    else if (V.phase === 'come' && secs > 0) Sound.tick(.3);
    lastSec = secs;
  }
}
function render(v) {
  const prevPhase = V ? `${V.round}:${V.phase}` : '';
  V = v;
  if (!v || !v.mapId) return;
  ensureScene(v.mapId, v.seed);
  const kind = layoutKind(v);
  const pk = `${v.round}:${v.phase}`;
  if (v.role === 'hider' && v.phase === 'hide') {
    if (draftFor !== String(v.round)) { draft = Object.assign({}, v.mine, { spot: v.mine.spot ? { ...v.mine.spot } : null }); draftFor = String(v.round); picking = false; tab = draft.spot ? 'sekil' : 'yer'; slot = 'c1'; }
    else if (v.mine.ready) { draft = Object.assign({}, v.mine, { spot: v.mine.spot ? { ...v.mine.spot } : null }); }
  }
  if (built !== kind) buildSide(kind);
  root.querySelector('.sk').dataset.kind = kind; root.querySelector('.sk').dataset.role = v.role;
  if (pk !== phaseKey) {
    phaseKey = pk; armed = true; picking = picking && v.phase === 'hide';
    requestAnimationFrame(() => { resize(); if (v.phase === 'reveal') fitReveal(); else if (v.phase === 'seek' || v.phase === 'hide') fitCam(); });
    if (prevPhase && v.phase === 'hide') anims = [];
    if (v.phase === 'hide' || v.phase === 'seek') requestAnimationFrame(() => { if (!root) return; const sk = q('.sk'), r = stageEl.getBoundingClientRect(); if (sk.getBoundingClientRect().top < -8 || r.bottom > innerHeight + 2) { try { sk.scrollIntoView({ block: 'start' }); } catch { /* */ } } });
    (v.taunts || []).forEach(t => { if (t.age < 3000) anims.push({ t: 'ripple', x: t.x, y: t.y, start: now() - t.age, dur: 2600 }); });
  }
  deadline = now() + v.left;
  if (pendingHide && pendingHide.round === v.round) { const e = pendingHide; pendingHide = null; onEvent(e); }
  renderHud(); renderSide(); renderBlack(); hudTick();
  requestDraw();
}

/* ---------- düğmeler ---------- */
function onClick(e) {
  if (!V) return;
  const z = e.target.closest('[data-z]');
  if (z) {
    Sound.init(); const k = z.dataset.z;
    if (k === 'in') zoomAt(sw / 2, sh / 2, 1.35); else if (k === 'out') zoomAt(sw / 2, sh / 2, 1 / 1.35); else if (k === 'all') fitCam('all');
    else if (k === 'me') { const m = isHiding() && draft ? draft : V.mine; if (m && m.spot) centerOn(m.spot.x, m.spot.y, Math.max(cam.s, camLimits().cover * 1.2)); }
    return;
  }
  const tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; picking = false; Sound.tick(.3); renderTab(); return; }
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  const act = b.dataset.act;
  if (act === 'arm') { armed = !armed; Sound.tick(.5); renderSide(); requestDraw(); return; }
  if (act === 'taunt') { ui.send({ t: 'taunt' }); b.disabled = true; return; }
  if (act === 'unready') { ui.send({ t: 'unready' }); return; }
  if (act === 'goto') { const m = isHiding() ? draft : V.mine; if (m && m.spot) centerOn(m.spot.x, m.spot.y, Math.max(cam.s, camLimits().cover * 1.2)); return; }
  if (!isHiding()) return;
  if (act === 'ready') { if (!draft.spot) return; clearTimeout(sendT); sendCfg(true); ui.send({ t: 'ready' }); Sound.special(); picking = false; return; }
  if (act === 'randspot') { const sh2 = SHAPES[draft.shape]; let p = null; for (let t = 0; t < 80 && !p; t++) { const x = rnd(60, W - 60), y = rnd(scene.map.top + 50, H - 50); if (scene.decoys.every(d => dist(d.x, d.y, x, y) > propR(d) + sh2.r)) p = { x: Math.round(x), y: Math.round(y) }; } draft.spot = p || clampSpot(scene.map, W / 2, H / 2); centerOn(draft.spot.x, draft.spot.y); sendCfg(true); Sound.whoosh(); updateHideInfo(); return; }
  if (act === 'pick') { picking = !picking; renderTab(); if (picking) { const r = stageEl.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) stageEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } toast(picking ? 'Haritada rengini almak istediğin yere dokun' : 'İptal edildi'); return; }
  if (act === 'rotl' || act === 'rotr') { draft.rot = ((Math.round(draft.rot / 90) * 90 + (act === 'rotr' ? 90 : -90)) % 360 + 360) % 360; }
  else if (act === 'smaller' || act === 'bigger') draft.scale = +clamp(draft.scale + (act === 'bigger' ? .05 : -.05), .8, 1.3).toFixed(2);
  else if (b.dataset.shape) { draft.shape = b.dataset.shape; Sound.tick(.5); }
  else if (b.dataset.slot) { slot = b.dataset.slot; }
  else if (b.dataset.col) { draft[slot] = b.dataset.col; Sound.tick(.4); }
  else if (b.dataset.pat) { draft.pat = b.dataset.pat; Sound.tick(.4); }
  else return;
  sendCfg(true); renderTab(); requestDraw();
}
function onInput(e) {
  const inp = e.target.closest('[data-in]'); if (!inp || !isHiding()) return;
  if (inp.dataset.in === 'rot') { draft.rot = +inp.value; const l = q('[data-val="rot"]'); if (l) l.textContent = draft.rot + '°'; }
  else { draft.scale = +(inp.value / 100).toFixed(2); const l = q('[data-val="scale"]'); if (l) l.textContent = '%' + inp.value; }
  sendCfg(false); requestDraw();
}

function onEvent(e) {
  if (!root) return;
  const me = ui ? ui.me : -1;
  if (e.t === 'phase') {
    if (e.ph === 'hide') { if (!V || V.round !== e.round) { pendingHide = e; return; } const seeker = e.seeker === me; banner(seeker ? 'GÖZLERİNİ KAPAT!' : me < 0 ? 'SAKLANIYORLAR' : 'SAKLAN!', seeker ? 'pink' : 'good'); Sound.special(); }
    else if (e.ph === 'come') { banner('EBE GELİYOR…', 'pink'); Sound.stop(); }
    else if (e.ph === 'seek') { Sound.whoosh(); banner(e.seeker === me ? 'ARA!' : 'KIPIRDAMA!', e.seeker === me ? 'good' : 'pink'); }
  } else if (e.t === 'probe') {
    const t = now();
    anims.push({ t: 'probe', x: e.x, y: e.y, start: t, dur: 750 });
    if (e.hit) {
      const mine = e.found.some(f => f.pi === me);
      e.found.forEach(f => anims.push({ t: 'pop', x: f.x, y: f.y, start: t, dur: 950 }));
      banner(`BULUNDU: ${e.found.map(f => f.name.toLocaleUpperCase('tr-TR')).join(', ')}!`, mine ? 'bad' : 'good');
      if (mine) { Sound.bankrupt(); flash('bad'); } else { Sound.good(); }
      if (cv) { const [x, y] = toClient(e.found[0].x, e.found[0].y); FX.burst(x, y, 40); }
    } else {
      anims.push({ t: 'miss', x: e.x, y: e.y, start: t, dur: 1800 });
      if (V && V.role === 'seeker') Sound.bad();
      else { Sound.tick(.2); const m = V && V.mine; if (m && m.spot && !m.found && dist(m.spot.x, m.spot.y, e.x, e.y) < PROBE_R + propR(m) + 70) { banner('AZ KALDI!', 'pink'); } }
      if (e.pen && V && V.role === 'seeker') toast('Boş arama: −3 saniye!', 'bad');
    }
    requestDraw();
  } else if (e.t === 'taunt') { anims.push({ t: 'ripple', x: e.x, y: e.y, start: now(), dur: 2600 }); Sound.special(); requestDraw(); }
  else if (e.t === 'reveal') {
    const msg = { all: 'HEPSİ BULUNDU!', time: 'SÜRE DOLDU!', probes: 'HAKLAR BİTTİ!', left: 'EBE DÜŞTÜ!', skip: 'TUR GEÇİLDİ' }[e.reason] || 'TUR BİTTİ';
    banner(msg, e.reason === 'all' ? 'good' : 'pink'); Sound.solve(); if (e.reason !== 'all') FX.confetti(50);
  } else if (e.t === 'ready' || e.t === 'unready') { if (e.pi !== me) Sound.tick(.4); }
}

function mount(r, api) {
  root = r; ui = api; V = null; built = ''; phaseKey = ''; scene = null; draft = null; draftFor = ''; anims = []; picking = false; armed = true; sw = 300; sh = 300; hover = null; pointers = new Map(); gest = null; lastSec = -1; pendingHide = null;
  mountDom();
  root.addEventListener('click', onClick); root.addEventListener('input', onInput);
  hudT = setInterval(hudTick, 200);
}
function unmount() {
  if (root) { root.removeEventListener('click', onClick); root.removeEventListener('input', onInput); }
  removeEventListener('resize', resize);
  if (ro) { ro.disconnect(); ro = null; }
  clearInterval(hudT); clearTimeout(sendT); clearTimeout(toastT); if (raf) cancelAnimationFrame(raf);
  raf = 0; root = null; ui = null; V = null; cv = null; cg = null; stageEl = null; lensCv = null; scene = null; built = ''; draft = null;
}

CFX.registerGame(Object.assign({
  id: 'saklambac', name: 'Bukalemun Saklambaç', icon: '🦎', color: '#7ee05a', min: 2, max: 6, hotseat: false, bot: true, localMin: 1,
  tagline: 'Eşyaya dönüş, kendini boya, Ebe\'ye yakalanma!',
  rules: 'Ebe gözlerini kapatıp sayarken saklananlar haritada bir yer seçer, bir eşyaya dönüşür ve kendini ortama göre boyar. Sonra Ebe süre ve arama hakkı bitene kadar şüphelendiği yerleri arar. Her tur Ebe değişir; bulan da saklanan da puan toplar.',
  options: [
    { key: 'saklan', label: 'Saklanma süresi', def: '45', choices: [{ v: '30', label: '30 sn' }, { v: '45', label: '45 sn' }, { v: '60', label: '60 sn' }, { v: '90', label: '90 sn' }] },
    { key: 'ara', label: 'Arama süresi', def: '90', choices: [{ v: '60', label: '60 sn' }, { v: '90', label: '90 sn' }, { v: '120', label: '120 sn' }, { v: '180', label: '180 sn' }] },
    { key: 'hak', label: 'Arama hakkı', def: '12', choices: [{ v: '8', label: '8' }, { v: '12', label: '12' }, { v: '20', label: '20' }, { v: '0', label: 'Sınırsız' }] },
    { key: 'tur', label: 'Tur', def: '1', choices: [{ v: '1', label: 'Herkes 1 kez Ebe' }, { v: '2', label: 'Herkes 2 kez Ebe' }] },
    { key: 'harita', label: 'Harita', def: 'lunapark', choices: [{ v: 'lunapark', label: '🎡 Lunapark' }, { v: 'mutfak', label: '🍳 Mutfak' }, { v: 'orman', label: '🏕️ Orman Kampı' }, { v: 'rastgele', label: '🎲 Rastgele' }] }
  ],
  mount, render, onEvent, unmount,
  // test ve geliştirme için dışa açık yardımcılar
  _sk: { MAPS, SHAPES, decoysOf, groundAt, propR, PROBE_R, botDisguise, botProbeTarget, W, H, cam: () => cam, scene: () => scene, draft: () => draft, toClient: (x, y) => cv ? toClient(x, y) : null }
}, RULES));
})();
