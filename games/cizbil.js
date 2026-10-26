/* =========================================================================
   OYUN SALONU — ÇİZ BİL
   Sırası gelen oyuncu üç kelimeden birini gizlice seçip çizer; diğerleri
   sohbet kutusuna tahmin yazar. Erken bilen çok puan alır, çizen her bilen
   için puan kazanır. 2–8 kişi online ya da tek telefonda "elden ele".
   Çizim; kalem, fırça, marker, sprey, neon, silgi, boya kovası, şekiller,
   desenler ve geri al / yinele içeren ortak çizim kitiyle yapılır. Her işlem
   (op) kimlikli bir günlükle tahmin edenlere canlı aktarılır.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial, clamp, centerOf } = CFX;

/* @@PAINTKIT-BEGIN — bu blok Çiz Bil ve Telefon Çiz'de birebir aynıdır (kaynak: ortak çizim kiti) */
/* ---------- ÇİZİM KİTİ ----------
   İşlem günlüğü (op): { i, t, k, c, a, w, d, f, p }
   t: 's' serbest çizgi · 'l' düz çizgi · 'r' dikdörtgen · 'o' elips · 'f' boya kovası · 'x' temizle · 'b' zemin rengi
   k: 0 kalem · 1 fırça · 2 marker · 3 sprey · 4 neon · 5 silgi
   c: renk 'rrggbb' · a: opaklık 5–100 · w: kalınlık (tuval genişliğinin binde biri) · d: desen (0 düz) · f: dolu şekil
   p: koordinatlar 0–1000 (iki eksende de tuvale göre).
   Boya kovası her cihazda aynı sabit çözünürlüklü "sınır rasterı" üzerinde, yalnızca tam sayı/IEEE
   aritmetiğiyle hesaplanır; böylece tohum noktası + renk aynıysa dolan bölge her cihazda birebir aynıdır. */
const PK = (() => {
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64I = {}; [...B64].forEach((ch, i) => { B64I[ch] = i; });
const enc = p => { let s = ''; for (const n of p) s += B64[(n >> 6) & 63] + B64[n & 63]; return s; };
const dec = s => { const o = []; for (let i = 0; i + 1 < s.length; i += 2) o.push(((B64I[s[i]] | 0) << 6) | (B64I[s[i + 1]] | 0)); return o; };
const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
const HAS_DOM = typeof document !== 'undefined';

const PALETTE = ['1b1530', '4a4458', '9a95ab', 'ffffff', 'e8222e', 'ff7a1a', 'ffd60a', '2fbf4a', '1a8cff', '6b3dff', 'ff4fb8', '8b5a2b',
  'ffe0c4', 'f1c27d', 'c68642', '7a4a2a', 'ffb3c7', 'ffe5a3', 'b8f2c9', 'b3d9ff', 'd9c2ff', '39ff14', '00f0ff', 'ff00e6'];
const PAL_NAMES = ['Siyah', 'Koyu gri', 'Gri', 'Beyaz', 'Kırmızı', 'Turuncu', 'Sarı', 'Yeşil', 'Mavi', 'Mor', 'Pembe', 'Kahverengi',
  'Açık ten', 'Buğday ten', 'Esmer ten', 'Koyu ten', 'Pastel pembe', 'Pastel sarı', 'Pastel yeşil', 'Pastel mavi', 'Lila', 'Neon yeşil', 'Neon mavi', 'Neon pembe'];
const PATTERNS = ['Düz', 'Noktalı', 'Çizgili', 'Kareli', 'Yıldız', 'Kalp', 'Zikzak', 'Tuğla', 'Çim', 'Dama', 'Dalga'];
const NPAT = PATTERNS.length - 1;
const PAT_U = 34;                                   // desen karosu: tuval genişliğinin binde 34'ü
const TOOLS = [
  { id: 'pen', t: 's', k: 0, name: 'Kalem', key: 'p' },
  { id: 'brush', t: 's', k: 1, name: 'Fırça', key: 'b' },
  { id: 'marker', t: 's', k: 2, name: 'Marker', key: 'm' },
  { id: 'spray', t: 's', k: 3, name: 'Sprey', key: 's' },
  { id: 'neon', t: 's', k: 4, name: 'Neon', key: 'n' },
  { id: 'eraser', t: 's', k: 5, name: 'Silgi', key: 'e' },
  { id: 'fill', t: 'f', name: 'Boya kovası', key: 'g' },
  { id: 'line', t: 'l', name: 'Düz çizgi', key: 'l' },
  { id: 'rect', t: 'r', name: 'Dikdörtgen', key: 'r' },
  { id: 'ellipse', t: 'o', name: 'Elips', key: 'o' },
  { id: 'picker', t: '', name: 'Damlalık', key: 'i' }
];
const TOOL = {}; TOOLS.forEach(t => { TOOL[t.id] = t; });
const QUICK = ['pen', 'brush', 'fill', 'eraser'];
const SIZE_PRESETS = [3, 6, 12, 22, 40];
const STROKE_MAX = 1500;                            // tek çizgide en çok nokta (uzunsa bölünür)

/* ---------- kodlama / doğrulama ---------- */
function unpack(w, maxPts) {
  if (!w || typeof w !== 'object') return null;
  const t = w.t;
  if (typeof t !== 'string' || t.length !== 1 || !'slrofxb'.includes(t)) return null;
  const i = w.i; if (!Number.isInteger(i) || i < 0 || i > 1e7) return null;
  const op = { i, t };
  if (t === 'x') return op;
  op.c = typeof w.c === 'string' && /^[0-9a-fA-F]{6}$/.test(w.c) ? w.c.toLowerCase() : '1b1530';
  if (t === 'b') return op;
  op.a = cl(Math.round(+w.a) || 100, 5, 100);
  op.d = cl(w.d | 0, 0, NPAT);
  let p = typeof w.p === 'string' ? (/^[A-Za-z0-9_-]*$/.test(w.p) ? dec(w.p) : null) : Array.isArray(w.p) ? w.p.map(v => Math.round(+v) || 0) : null;
  if (!p) return null;
  p = p.map(v => cl(v, 0, 1000)); if (p.length % 2) p.pop();
  if (t === 'f') { if (p.length !== 2) return null; op.p = p; return op; }
  op.w = cl(Math.round(+w.w) || 6, 1, 80);
  if (t === 's') {
    op.k = cl(w.k | 0, 0, 5); if (op.k === 5 || op.k === 3) op.d = 0;
    if (p.length < 2 || p.length / 2 > (maxPts || STROKE_MAX)) return null;
    op.p = p; if (w.e) op.e = 1; return op;
  }
  if (p.length !== 4) return null;
  op.f = w.f ? 1 : 0; op.p = p; return op;
}
function pack(op) { const o = {}; for (const k in op) if (k !== 'e') o[k] = op[k]; if (o.p) o.p = enc(o.p); return o; }
const meta = op => ({ k: op.k, c: op.c, a: op.a, w: op.w, d: op.d });
const npts = ops => ops.reduce((s, o) => s + (o.t === 's' && o.p ? o.p.length >> 1 : 0), 0);
function rdp(p, eps) {
  const n = p.length >> 1; if (n <= 2) return p.slice();
  const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let md = 0, mi = -1;
    const ax = p[a * 2], ay = p[a * 2 + 1], bx = p[b * 2], by = p[b * 2 + 1], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    for (let i = a + 1; i < b; i++) { const d = L === 0 ? Math.hypot(p[i * 2] - ax, p[i * 2 + 1] - ay) : Math.abs(dy * p[i * 2] - dx * p[i * 2 + 1] + bx * ay - by * ax) / L; if (d > md) { md = d; mi = i; } }
    if (md > eps && mi > 0) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  const o = []; for (let i = 0; i < n; i++) if (keep[i]) o.push(p[i * 2], p[i * 2 + 1]); return o;
}

/* ---------- belirlenimci sınır rasterı ---------- */
function rNew(W, H) { return { W, H, k: new Uint32Array(W * H), tab: new Map() }; }
function keyOf(op) {
  if (op.t === 's' && op.k === 5) return 0;
  const a = op.t === 's' && op.k === 2 ? Math.round(op.a * 0.5) : op.a;
  return ((parseInt(op.c, 16) ^ (a << 24) ^ Math.imul(op.d | 0, 0x9E3779B1) ^ (op.t === 's' && op.k === 3 ? 0x2545F491 : 0)) >>> 0) || 1;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// sprey damlaları (birim uzayında; y ekseni en-boy oranıyla düzeltilir → daire)
function sprayDots(op, asp, cb) {
  const p = op.p, n = p.length >> 1, R = op.w * 1.1, cnt = cl(Math.round(op.w * 0.6) + 4, 5, 28), sz = Math.max(1.2, op.w * 0.09);
  for (let k = 0; k < n; k++) {
    const r = rng((Math.imul(op.i + 1, 0x9E3779B1) ^ Math.imul(k + 1, 0x85EBCA77)) >>> 0);
    let got = 0;
    for (let tr = 0; tr < cnt * 4 && got < cnt; tr++) {
      const u = r() * 2 - 1, v = r() * 2 - 1;
      if (u * u + v * v > 1) continue;
      got++; cb(p[2 * k] + u * R, p[2 * k + 1] + v * R * asp, sz);
    }
  }
}
// kalem yolu: p0 → (k) kontrol Pk, bitiş orta(Pk, Pk+1) → son nokta (görünür çizim ile aynı geometri)
function flatten(p, sx, sy) {
  const n = p.length >> 1, out = [p[0] * sx, p[1] * sy];
  if (n === 1) return out;
  let x0 = out[0], y0 = out[1];
  for (let k = 1; k < n - 1; k++) {
    const cx = p[2 * k] * sx, cy = p[2 * k + 1] * sy, ex = (cx + p[2 * k + 2] * sx) / 2, ey = (cy + p[2 * k + 3] * sy) / 2;
    const len = Math.abs(cx - x0) + Math.abs(cy - y0) + Math.abs(ex - cx) + Math.abs(ey - cy);
    const st = cl(Math.ceil(len / 3), 1, 8);
    for (let j = 1; j <= st; j++) { const t = j / st, u = 1 - t; out.push(u * u * x0 + 2 * u * t * cx + t * t * ex, u * u * y0 + 2 * u * t * cy + t * t * ey); }
    x0 = ex; y0 = ey;
  }
  out.push(p[2 * n - 2] * sx, p[2 * n - 1] * sy);
  return out;
}
function rCap(R, x0, y0, x1, y1, r, key) {
  const { W, H, k } = R;
  const mnx = Math.max(0, Math.floor(Math.min(x0, x1) - r)), mxx = Math.min(W - 1, Math.ceil(Math.max(x0, x1) + r));
  const mny = Math.max(0, Math.floor(Math.min(y0, y1) - r)), mxy = Math.min(H - 1, Math.ceil(Math.max(y0, y1) + r));
  const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy, r2 = r * r;
  for (let y = mny; y <= mxy; y++) {
    const py = y + 0.5;
    for (let x = mnx; x <= mxx; x++) {
      const px = x + 0.5;
      let t = L2 ? ((px - x0) * dx + (py - y0) * dy) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = x0 + t * dx - px, ey = y0 + t * dy - py;
      if (ex * ex + ey * ey <= r2) k[y * W + x] = key;
    }
  }
}
function rRect(R, x0, y0, x1, y1, key) {
  const { W, H, k } = R;
  for (let y = Math.max(0, Math.ceil(y0 - 0.5)); y <= Math.min(H - 1, Math.floor(y1 - 0.5)); y++)
    for (let x = Math.max(0, Math.ceil(x0 - 0.5)); x <= Math.min(W - 1, Math.floor(x1 - 0.5)); x++) k[y * W + x] = key;
}
function rEll(R, cx, cy, rx, ry, rin, key) {      // rin: kalınlığın yarısı (0 = dolu)
  const { W, H, k } = R;
  const ox = rx + rin, oy = ry + rin, ix = rx - rin, iy = ry - rin;
  if (ox <= 0 || oy <= 0) return;
  for (let y = Math.max(0, Math.floor(cy - oy)); y <= Math.min(H - 1, Math.ceil(cy + oy)); y++) {
    const dy = y + 0.5 - cy;
    for (let x = Math.max(0, Math.floor(cx - ox)); x <= Math.min(W - 1, Math.ceil(cx + ox)); x++) {
      const dx = x + 0.5 - cx;
      if ((dx * dx) / (ox * ox) + (dy * dy) / (oy * oy) > 1) continue;
      if (rin > 0 && ix > 0 && iy > 0 && (dx * dx) / (ix * ix) + (dy * dy) / (iy * iy) < 1) continue;
      k[y * W + x] = key;
    }
  }
}
function rasterOp(R, op, asp) {
  const sx = R.W / 1000, sy = R.H / 1000, key = keyOf(op);
  if (key) R.tab.set(key, [op.c, op.a, op.d | 0]);
  const t = op.t;
  if (t === 's') {
    if (op.k === 3) {
      sprayDots(op, asp, (x, y, s) => {
        const px = Math.floor(x * sx), py = Math.floor(y * sy), q = s * sx >= 2 ? 2 : 1;
        for (let yy = py; yy < py + q; yy++) for (let xx = px; xx < px + q; xx++) if (xx >= 0 && yy >= 0 && xx < R.W && yy < R.H) R.k[yy * R.W + xx] = key;
      });
      return;
    }
    const r = Math.max(0.8, op.w * sx * (op.k === 1 ? 0.3 : 0.5));
    const f = flatten(op.p, sx, sy);
    if (f.length === 2) { rCap(R, f[0], f[1], f[0], f[1], r, key); return; }
    for (let j = 2; j < f.length; j += 2) rCap(R, f[j - 2], f[j - 1], f[j], f[j + 1], r, key);
    return;
  }
  const [a0, b0, a1, b1] = op.p, x0 = Math.min(a0, a1) * sx, x1 = Math.max(a0, a1) * sx, y0 = Math.min(b0, b1) * sy, y1 = Math.max(b0, b1) * sy;
  const r = Math.max(0.8, op.w * sx * 0.5);
  if (t === 'l') rCap(R, a0 * sx, b0 * sy, a1 * sx, b1 * sy, r, key);
  else if (t === 'r') {
    if (op.f) rRect(R, x0, y0, x1, y1, key);
    else { rCap(R, x0, y0, x1, y0, r, key); rCap(R, x1, y0, x1, y1, r, key); rCap(R, x1, y1, x0, y1, r, key); rCap(R, x0, y1, x0, y0, r, key); }
  } else if (t === 'o') rEll(R, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, op.f ? 0 : r, key);
}
// 4-komşulu tarama satırı doldurma → [y, x0, x1, ...]
function rFlood(R, fx, fy) {
  const { W, H, k } = R;
  const sx0 = cl(Math.floor(fx), 0, W - 1), sy0 = cl(Math.floor(fy), 0, H - 1);
  const target = k[sy0 * W + sx0], seen = new Uint8Array(W * H), runs = [], stack = [sx0, sy0];
  while (stack.length) {
    const y = stack.pop(), x = stack.pop(), row = y * W;
    if (seen[row + x] || k[row + x] !== target) continue;
    let l = x, r = x;
    while (l > 0 && !seen[row + l - 1] && k[row + l - 1] === target) l--;
    while (r < W - 1 && !seen[row + r + 1] && k[row + r + 1] === target) r++;
    for (let i = l; i <= r; i++) seen[row + i] = 1;
    runs.push(y, l, r);
    for (const ny of [y - 1, y + 1]) {
      if (ny < 0 || ny >= H) continue;
      const nr = ny * W; let inSpan = false;
      for (let i = l; i <= r; i++) {
        const ok = !seen[nr + i] && k[nr + i] === target;
        if (ok && !inSpan) { stack.push(i, ny); inSpan = true; } else if (!ok) inSpan = false;
      }
    }
  }
  return Int32Array.from(runs);
}
function rRuns(R, runs, key) { const { W, k } = R; for (let j = 0; j < runs.length; j += 3) { const row = runs[j] * W; for (let x = runs[j + 1]; x <= runs[j + 2]; x++) k[row + x] = key; } }
// test/teşhis: rasteri RGBA piksellerine çevir (desenler piksel fonksiyonuyla)
function patAt(d, u, v) {
  switch (d) {
    case 1: return (u - 0.5) * (u - 0.5) + (v - 0.5) * (v - 0.5) < 0.04;
    case 2: return ((u + v) % 1) < 0.3;
    case 3: return u < 0.14 || v < 0.14;
    case 4: return Math.abs(u - 0.5) + Math.abs(v - 0.5) < 0.3;
    case 5: { const x = (u - 0.5) * 2.6, y = (0.45 - v) * 2.6, q = x * x + y * y - 1; return q * q * q - x * x * y * y * y < 0; }
    case 6: { const tri = Math.abs(((u * 2) % 1) - 0.5) * 2; return Math.abs(v - 0.35 - 0.3 * tri) < 0.08; }
    case 7: return v < 0.08 || (v < 0.5 ? u < 0.08 : Math.abs(u - 0.5) < 0.04) || Math.abs(v - 0.5) < 0.04;
    case 8: return v > 0.35 && Math.abs(((u * 3) % 1) - 0.5) < 0.1 + (1 - v) * 0;
    case 9: return (u < 0.5) !== (v < 0.5);
    case 10: { const tri = Math.abs(((u * 2) % 1) - 0.5) * 2; return Math.abs(v - 0.5 + 0.25 * (tri - 0.5)) < 0.07; }
    default: return true;
  }
}
function rPixels(R) {
  const { W, H, k } = R, out = new Uint32Array(W * H), T = PAT_U / 1000 * W;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const key = k[y * W + x]; if (!key) { out[y * W + x] = 0xffffffff; continue; }
    const e = R.tab.get(key) || ['000000', 100, 0];
    const on = e[2] ? patAt(e[2], (x % T) / T, (y % T) / T) : true;
    out[y * W + x] = on ? ((parseInt(e[0], 16) << 8) | Math.round(e[1] * 2.55)) >>> 0 : 0xffffffff;
  }
  return out;
}

/* ---------- işlem uygulama (raster + isteğe bağlı tuval) ---------- */
function newScene(RW, RH) { return { RW, RH, asp: RW / RH, R: rNew(RW, RH), bg: null, masks: new WeakMap(), tmp: null }; }
function sceneApply(S, op, g, W, H) {
  if (op.t === 'x') { S.R = rNew(S.RW, S.RH); S.bg = null; if (g) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); } return; }
  if (op.t === 'b') { S.bg = op.c; return; }
  if (op.t === 'f') {
    let m = S.masks.get(op);
    if (!m) { m = { runs: rFlood(S.R, op.p[0] / 1000 * S.RW, op.p[1] / 1000 * S.RH), mc: null }; S.masks.set(op, m); }
    const key = keyOf(op); S.R.tab.set(key, [op.c, op.a, op.d | 0]); rRuns(S.R, m.runs, key);
    if (g && W > 1 && HAS_DOM) { if (!m.mc) m.mc = maskCanvas(m.runs, S.RW, S.RH); drawFill(S, g, W, H, op, m.mc); }
    return;
  }
  rasterOp(S.R, op, S.asp);
  if (g && W > 1) drawOp(g, W, H, op, S.asp);
}
function lastClear(ops) { for (let j = ops.length - 1; j >= 0; j--) if (ops[j].t === 'x') return j + 1; return 0; }
function replay(ops, RW, RH) { const S = newScene(RW, RH); for (let j = lastClear(ops); j < ops.length; j++) sceneApply(S, ops[j], null, 0, 0); return S; }

/* ---------- tuvale çizim ---------- */
const patCache = new Map();
function patTile(d, col, s) {
  const t = document.createElement('canvas'); t.width = t.height = s;
  const g = t.getContext('2d'); g.fillStyle = g.strokeStyle = '#' + col; g.lineCap = 'round'; g.lineJoin = 'round';
  const L = (w, pts) => { g.lineWidth = Math.max(1, s * w); g.beginPath(); g.moveTo(pts[0] * s, pts[1] * s); for (let j = 2; j < pts.length; j += 2) g.lineTo(pts[j] * s, pts[j + 1] * s); g.stroke(); };
  const C = (x, y, r) => { g.beginPath(); g.arc(x * s, y * s, r * s, 0, Math.PI * 2); g.fill(); };
  g.globalAlpha = 0.2; g.fillRect(0, 0, s, s); g.globalAlpha = 1;      // hafif zemin tonu: desenli alan "dolu" görünsün
  switch (d) {
    case 1: C(0.5, 0.5, 0.17); C(0, 0, 0.17); C(1, 0, 0.17); C(0, 1, 0.17); C(1, 1, 0.17); break;
    case 2: L(0.2, [0, 1, 1, 0]); L(0.2, [-0.5, 0.5, 0.5, -0.5]); L(0.2, [0.5, 1.5, 1.5, 0.5]); break;
    case 3: g.fillRect(0, 0, s, Math.max(1, s * 0.12)); g.fillRect(0, 0, Math.max(1, s * 0.12), s); break;
    case 4: { g.beginPath(); for (let j = 0; j < 10; j++) { const r = (j % 2 ? 0.17 : 0.4) * s, an = -Math.PI / 2 + j * Math.PI / 5; g.lineTo(s / 2 + Math.cos(an) * r, s / 2 + Math.sin(an) * r); } g.closePath(); g.fill(); break; }
    case 5: { g.beginPath(); g.moveTo(0.5 * s, 0.82 * s); g.bezierCurveTo(0.08 * s, 0.55 * s, 0.14 * s, 0.16 * s, 0.5 * s, 0.34 * s); g.bezierCurveTo(0.86 * s, 0.16 * s, 0.92 * s, 0.55 * s, 0.5 * s, 0.82 * s); g.fill(); break; }
    case 6: L(0.13, [-0.25, 0.65, 0, 0.35, 0.25, 0.65, 0.5, 0.35, 0.75, 0.65, 1, 0.35, 1.25, 0.65]); break;
    case 7: { const w = Math.max(1, s * 0.08); g.fillRect(0, 0, s, w); g.fillRect(0, s / 2 - w / 2, s, w); g.fillRect(0, 0, w, s / 2); g.fillRect(s / 2 - w / 2, s / 2, w, s / 2); break; }
    case 8: { const bl = [[0.12, 1, 0.05, 0.38], [0.3, 1, 0.38, 0.5], [0.5, 1, 0.48, 0.3], [0.7, 1, 0.8, 0.45], [0.88, 1, 0.93, 0.36]]; for (const b of bl) L(0.09, b); break; }
    case 9: g.fillRect(0, 0, s / 2, s / 2); g.fillRect(s / 2, s / 2, s / 2, s / 2); break;
    case 10: { g.lineWidth = Math.max(1, s * 0.12); g.beginPath(); g.moveTo(0, 0.5 * s); g.quadraticCurveTo(0.25 * s, 0.2 * s, 0.5 * s, 0.5 * s); g.quadraticCurveTo(0.75 * s, 0.8 * s, s, 0.5 * s); g.stroke(); break; }
    default: g.fillRect(0, 0, s, s);
  }
  return t;
}
function patternFor(g, d, col, W) {
  const T = PAT_U / 1000 * W, px = Math.max(6, Math.round(T)), key = d + ':' + col + ':' + px;
  let tile = patCache.get(key);
  if (!tile) { if (patCache.size > 80) patCache.clear(); tile = patTile(d, col, px); patCache.set(key, tile); }
  const pat = g.createPattern(tile, 'repeat');
  if (pat && pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix([T / px, 0, 0, T / px, 0, 0]));
  return pat || '#' + col;
}
const lum = c => { const n = parseInt(c, 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
const tileBg = c => (lum(c) > 0.78 ? '#2b2150' : '#fbf8ff');
function light(c, f) { const n = parseInt(c, 16), m = v => Math.round(v + (255 - v) * f); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => m(v).toString(16).padStart(2, '0')).join(''); }
function tracePath(g, p, sx, sy) {
  const n = p.length >> 1;
  g.beginPath(); g.moveTo(p[0] * sx, p[1] * sy);
  if (n === 1) { g.lineTo(p[0] * sx + 0.01, p[1] * sy); return; }
  for (let k = 1; k < n - 1; k++) { const ax = p[2 * k] * sx, ay = p[2 * k + 1] * sy, bx = p[2 * k + 2] * sx, by = p[2 * k + 3] * sy; g.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2); }
  g.lineTo(p[2 * n - 2] * sx, p[2 * n - 1] * sy);
}
function drawOp(g, W, H, op, asp) {
  const sx = W / 1000, sy = H / 1000, t = op.t;
  if (t === 'x' || t === 'b' || t === 'f') return;
  g.save();
  const col = '#' + op.c, a = op.a / 100, w = Math.max(1, op.w * sx);
  const style = op.d ? patternFor(g, op.d, op.c, W) : col;
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (t === 's') {
    const k = op.k;
    if (k === 3) { g.globalAlpha = a; g.fillStyle = col; sprayDots(op, asp, (x, y, s) => { const q = Math.max(1, s * sx); g.fillRect(x * sx - q / 2, y * sy - q / 2, q, q); }); }
    else {
      tracePath(g, op.p, sx, sy);
      if (k === 5) { g.globalCompositeOperation = 'destination-out'; g.strokeStyle = '#000'; g.lineWidth = w; g.stroke(); }
      else if (k === 1) { g.globalAlpha = a * 0.92; g.strokeStyle = style; g.lineWidth = w * 0.6; g.shadowColor = col; g.shadowBlur = w * 0.7; g.stroke(); }
      else if (k === 2) { g.globalAlpha = a * 0.5; g.strokeStyle = style; g.lineWidth = w; g.lineCap = 'square'; g.stroke(); }
      else if (k === 4) { g.globalAlpha = a; g.strokeStyle = style; g.lineWidth = w; g.shadowColor = col; g.shadowBlur = w * 1.6; g.stroke(); g.shadowBlur = w * 0.5; g.strokeStyle = light(op.c, 0.72); g.lineWidth = w * 0.38; g.stroke(); }
      else { g.globalAlpha = a; g.strokeStyle = style; g.lineWidth = w; g.stroke(); }
    }
  } else {
    const [a0, b0, a1, b1] = op.p;
    g.globalAlpha = a; g.strokeStyle = g.fillStyle = style; g.lineWidth = w;
    g.beginPath();
    if (t === 'l') { g.moveTo(a0 * sx, b0 * sy); g.lineTo(a1 * sx, b1 * sy); g.stroke(); }
    else {
      const x0 = Math.min(a0, a1) * sx, y0 = Math.min(b0, b1) * sy, x1 = Math.max(a0, a1) * sx, y1 = Math.max(b0, b1) * sy;
      if (t === 'r') g.rect(x0, y0, x1 - x0, y1 - y0);
      else g.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.max(0.1, (x1 - x0) / 2), Math.max(0.1, (y1 - y0) / 2), 0, 0, Math.PI * 2);
      if (op.f) g.fill(); else g.stroke();
    }
  }
  g.restore();
}
function maskCanvas(runs, RW, RH) {
  let x0 = RW, y0 = RH, x1 = -1, y1 = -1;
  for (let j = 0; j < runs.length; j += 3) { const y = runs[j]; if (y < y0) y0 = y; if (y > y1) y1 = y; if (runs[j + 1] < x0) x0 = runs[j + 1]; if (runs[j + 2] > x1) x1 = runs[j + 2]; }
  if (x1 < 0) return null;
  const bx = Math.max(0, x0 - 1), by = Math.max(0, y0 - 1), bw = Math.min(RW - 1, x1 + 1) - bx + 1, bh = Math.min(RH - 1, y1 + 1) - by + 1;
  const c = document.createElement('canvas'); c.width = bw; c.height = bh;
  const g = c.getContext('2d'), img = g.createImageData(bw, bh), A = img.data;
  const m = new Uint8Array(bw * bh);
  for (let j = 0; j < runs.length; j += 3) {           // 1 piksel genişletme: kenarlarda kâğıt rengi sızmasın
    const y = runs[j], xa = Math.max(bx, runs[j + 1] - 1), xb = Math.min(bx + bw - 1, runs[j + 2] + 1);
    for (let yy = Math.max(by, y - 1); yy <= Math.min(by + bh - 1, y + 1); yy++) { const row = (yy - by) * bw; for (let x = xa; x <= xb; x++) m[row + x - bx] = 1; }
  }
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {      // 3×3 yumuşatma: büyütülünce kenar basamaklanmasın
    let s = 0, c = 0;
    for (let yy = y - 1; yy <= y + 1; yy++) { if (yy < 0 || yy >= bh) continue; for (let xx = x - 1; xx <= x + 1; xx++) { if (xx < 0 || xx >= bw) continue; s += m[yy * bw + xx]; c++; } }
    const a = m[y * bw + x] ? Math.max(170, Math.round(s / c * 255)) : Math.round(s / 9 * 255 * 0.85);
    A[(y * bw + x) * 4 + 3] = a;
  }
  g.putImageData(img, 0, 0);
  return { cv: c, x: bx, y: by, w: bw, h: bh };
}
function drawFill(S, g, W, H, op, m) {
  if (!m) return;
  const sx = W / S.RW, sy = H / S.RH;
  const dx = Math.floor(m.x * sx), dy = Math.floor(m.y * sy), dw = Math.max(1, Math.ceil((m.x + m.w) * sx) - dx), dh = Math.max(1, Math.ceil((m.y + m.h) * sy) - dy);
  if (!S.tmp) S.tmp = document.createElement('canvas');
  const t = S.tmp; if (t.width < dw) t.width = dw; if (t.height < dh) t.height = dh;
  const tg = t.getContext('2d');
  tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, dw, dh);
  tg.imageSmoothingEnabled = true; tg.drawImage(m.cv, m.x * sx - dx, m.y * sy - dy, m.w * sx, m.h * sy);
  tg.globalCompositeOperation = 'source-in';
  tg.translate(-dx, -dy); tg.fillStyle = op.d ? patternFor(tg, op.d, op.c, W) : '#' + op.c; tg.fillRect(dx, dy, dw, dh);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = op.a / 100; g.drawImage(t, 0, 0, dw, dh, dx, dy, dw, dh); g.restore();
}
function canvasSize(el, dprMax) {
  const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return null;
  const dpr = Math.min(dprMax || 2.5, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
  return [Math.max(1, Math.round(w * dpr)), Math.max(1, Math.round(h * dpr))];
}
// salt-okunur çizim (albüm, küçük resimler)
function paintStatic(el, ops, RW, RH, dprMax) {
  if (!el) return;
  const sz = canvasSize(el, dprMax); if (!sz) return;
  if (el.width !== sz[0] || el.height !== sz[1]) { el.width = sz[0]; el.height = sz[1]; }
  const g = el.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, sz[0], sz[1]);
  const S = newScene(RW, RH);
  for (let j = lastClear(ops); j < ops.length; j++) sceneApply(S, ops[j], g, sz[0], sz[1]);
  el.style.backgroundColor = S.bg ? '#' + S.bg : '';
}

class Painter {
  constructor(cv, RW, RH) {
    this.cv = cv; this.g = cv.getContext('2d'); this.RW = RW; this.RH = RH;
    this.base = document.createElement('canvas'); this.bg2 = this.base.getContext('2d');
    this.ops = []; this.live = []; this.S = newScene(RW, RH); this.raf = 0; this.to = 0;
  }
  fit() {
    const sz = canvasSize(this.cv); if (!sz) return false;
    if (sz[0] !== this.cv.width || sz[1] !== this.cv.height) { this.cv.width = this.base.width = sz[0]; this.cv.height = this.base.height = sz[1]; this.rebuild(); }
    return true;
  }
  setOps(ops, live) { this.ops = ops; this.live = live || []; this.rebuild(); }
  rebuild() {
    const masks = this.S.masks; this.S = newScene(this.RW, this.RH); this.S.masks = masks;
    const W = this.base.width, H = this.base.height;
    this.bg2.setTransform(1, 0, 0, 1, 0, 0); this.bg2.clearRect(0, 0, W, H);
    for (let j = lastClear(this.ops); j < this.ops.length; j++) sceneApply(this.S, this.ops[j], this.bg2, W, H);
    this.show();
  }
  push(op) { this.ops.push(op); sceneApply(this.S, op, this.bg2, this.base.width, this.base.height); this.show(); }
  pop() { const op = this.ops.pop(); this.rebuild(); return op; }
  get bg() { return this.S.bg; }
  show() {
    if (this.raf) return;
    const run = () => { if (!this.raf) return; cancelAnimationFrame(this.raf); clearTimeout(this.to); this.raf = 0; this.paint(); };
    this.raf = requestAnimationFrame(run); this.to = setTimeout(run, 80);
  }
  paint() {
    const g = this.g, W = this.cv.width, H = this.cv.height;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.clearRect(0, 0, W, H); if (this.base.width > 1) g.drawImage(this.base, 0, 0);
    for (const op of this.live) drawOp(g, W, H, op, this.S.asp);
    const bg = this.S.bg ? '#' + this.S.bg : '';
    if (this.cv.style.backgroundColor !== bg) this.cv.style.backgroundColor = bg;
  }
  destroy() { cancelAnimationFrame(this.raf); clearTimeout(this.to); this.raf = 0; }
}

/* ---------- simgeler ---------- */
const SV = b => `<svg viewBox="0 0 24 24" aria-hidden="true">${b}</svg>`;
const ICON = {
  pen: SV('<path d="M4 20l1.2-4.6L15.6 5a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z"/><path d="M13.5 7l3.5 3.5"/>'),
  brush: SV('<path d="M20 4c-3 1.2-7.6 5.4-9.4 7.8l1.6 1.6C14.6 11.6 18.8 7 20 4z"/><path d="M9.6 12.8c-2.6 0-4 1.8-4 4 0 1.4-.8 2.4-1.6 3 3.4.6 7.6-.4 7.6-4.6"/>'),
  marker: SV('<path d="M7 17l-2 3h5l1-1"/><path d="M8 16l7.6-10.4a2 2 0 0 1 2.8-.4l1.4 1a2 2 0 0 1 .4 2.8L12 19z"/>'),
  spray: SV('<rect x="5" y="10" width="8" height="11" rx="2"/><path d="M7 10V7h4v3"/><path d="M15.5 5h.01M18 3.5h.01M18 6.5h.01M20.5 5h.01M20.5 8h.01M18 9.5h.01" stroke-width="2.4"/>'),
  neon: SV('<path d="M12 2.8l1.9 5.6 5.7 1.9-5.7 1.9L12 17.8l-1.9-5.6-5.7-1.9 5.7-1.9z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/>'),
  eraser: SV('<path d="M9 20h11"/><path d="M4.6 14.6l9-9a2 2 0 0 1 2.8 0l3 3a2 2 0 0 1 0 2.8L11 19.8H8.6z"/><path d="M9 10.2l5.8 5.8"/>'),
  fill: SV('<path d="M4 11.5L11.5 4l7 7-7.5 7.5a2 2 0 0 1-2.8 0L4 14.3a2 2 0 0 1 0-2.8z"/><path d="M4.5 12h13.5"/><path d="M20.5 14.5s1.8 2.4 1.8 3.6a1.8 1.8 0 0 1-3.6 0c0-1.2 1.8-3.6 1.8-3.6z"/>'),
  line: SV('<path d="M5 19L19 5"/><circle cx="5" cy="19" r="1.6"/><circle cx="19" cy="5" r="1.6"/>'),
  rect: SV('<rect x="3.5" y="6" width="17" height="12" rx="1.5"/>'),
  ellipse: SV('<ellipse cx="12" cy="12" rx="9" ry="6.6"/>'),
  picker: SV('<path d="M20 4a2.4 2.4 0 0 0-3.4 0l-2.3 2.3-1.2-1.2-1.8 1.8 6 6 1.8-1.8-1.2-1.2L20 7.4A2.4 2.4 0 0 0 20 4z"/><path d="M11.5 8.5L4.6 15.4a2 2 0 0 0-.6 1.4V20h3.2a2 2 0 0 0 1.4-.6l6.9-6.9"/><path d="M6.5 15.5h6"/>'),
  undo: SV('<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  redo: SV('<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
  trash: SV('<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>'),
  shapes: SV('<path d="M8.5 3.5l5 8.5h-10z"/><circle cx="16.5" cy="16" r="4.5"/><rect x="3.5" y="14.5" width="6" height="6" rx="1"/>'),
  bg: SV('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 16l5-5 4 4 2.5-2.5 5.5 5.5"/><circle cx="15.5" cy="9" r="1.6"/>'),
  stroke: SV('<rect x="4" y="6" width="16" height="12" rx="2"/>'),
  filled: SV('<rect x="4" y="6" width="16" height="12" rx="2" fill="currentColor"/>'),
  reset: SV('<path d="M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5"/>'),
  ghost: SV('<path d="M6 20V10a6 6 0 0 1 12 0v10l-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6z"/><path d="M10 10h.01M14 10h.01" stroke-width="2.6"/>')
};

/* ---------- etkileşimli tahta (çizen) ---------- */
const SKEY = 'cf.paint.v1';
function loadSet() {
  const def = { tool: 'pen', c: '1b1530', a: 100, d: 0, f: 0, ws: { pen: 6, brush: 16, marker: 18, spray: 22, neon: 9, eraser: 26, line: 6, rect: 6, ellipse: 6 }, recent: ['e8222e', '1a8cff', 'ffd60a', '2fbf4a', 'ff4fb8', 'ffffff'] };
  try { const s = JSON.parse(localStorage.getItem(SKEY) || 'null'); if (s && typeof s === 'object') { Object.assign(def.ws, s.ws || {}); ['c', 'a', 'd', 'f'].forEach(k => { if (s[k] != null) def[k] = s[k]; }); if (Array.isArray(s.recent)) def.recent = s.recent.filter(c => /^[0-9a-f]{6}$/.test(c)).slice(0, 8); if (TOOL[s.tool] && s.tool !== 'picker') def.tool = s.tool; } } catch { /* depolama kapalı olabilir */ }
  if (!/^[0-9a-f]{6}$/.test(def.c)) def.c = '1b1530';
  def.a = cl(def.a | 0 || 100, 5, 100); def.d = cl(def.d | 0, 0, NPAT); def.f = def.f ? 1 : 0;
  return def;
}
function saveSet(s) { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch { /* */ } }

class Board {
  // cfg: { K (css öneki), bar, cv, wrap (yakınlaştırılan öğe), frame (tuval çerçevesi), painter, store {ops, redo, nid},
  //        canDraw(), emit(type, op), confirm(title, text, yes) → Promise, maxPts, maxOps, maxFills, simplify, paper }
  constructor(cfg) {
    this.cfg = cfg; this.K = cfg.K; this.p = cfg.painter; this.st = cfg.store;
    this.set = loadSet(); this.cur = null; this.curPid = null; this.ptrs = new Map(); this.pz = null; this.zs = 1; this.ztx = 0; this.zty = 0;
    this.prevTool = 'pen'; this.sprayT = null; this.toastT = null; this.lastPatCol = '';
    this.onDown = this.onDown.bind(this); this.onMove = this.onMove.bind(this); this.onUp = this.onUp.bind(this);
    this.onKey = this.onKey.bind(this); this.onDocDown = this.onDocDown.bind(this); this.onBar = this.onBar.bind(this); this.onInput = this.onInput.bind(this);
    const cv = cfg.cv;
    cv.addEventListener('pointerdown', this.onDown); cv.addEventListener('pointermove', this.onMove);
    cv.addEventListener('pointerup', this.onUp); cv.addEventListener('pointercancel', this.onUp); cv.addEventListener('lostpointercapture', this.onUp);
    cv.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', this.onKey); document.addEventListener('pointerdown', this.onDocDown, true);
    const zr = document.createElement('button'); zr.type = 'button'; zr.className = cfg.K + '-zreset'; zr.innerHTML = ICON.reset; zr.title = 'Yakınlaştırmayı sıfırla'; zr.setAttribute('aria-label', 'Yakınlaştırmayı sıfırla');
    zr.addEventListener('click', () => this.resetZoom()); cfg.frame.appendChild(zr); this.zr = zr;
    this.build();
  }
  get ops() { return this.p.ops; }
  id() { return this.st.nid++; }
  destroy() {
    const cv = this.cfg.cv;
    cv.removeEventListener('pointerdown', this.onDown); cv.removeEventListener('pointermove', this.onMove);
    cv.removeEventListener('pointerup', this.onUp); cv.removeEventListener('pointercancel', this.onUp); cv.removeEventListener('lostpointercapture', this.onUp);
    document.removeEventListener('keydown', this.onKey); document.removeEventListener('pointerdown', this.onDocDown, true);
    clearInterval(this.sprayT); clearTimeout(this.toastT); if (this.zr) this.zr.remove();
  }
  /* ----- araç çubuğu ----- */
  build() {
    const K = this.K, s = this.set;
    const tb = (id, extra = '') => `<button type="button" class="${K}-b ${K}-t" data-tool="${id}" title="${TOOL[id].name} (${TOOL[id].key.toUpperCase()})" aria-label="${TOOL[id].name}" ${extra}>${ICON[id]}</button>`;
    this.cfg.bar.innerHTML = `<div class="${K}" data-open="">
      <div class="${K}-panels">
        <section class="${K}-panel ${K}-p-tools" data-panel="tools">
          <h4>Araçlar</h4>
          <div class="${K}-tools">${TOOLS.map(t => `<button type="button" class="${K}-tool" data-tool="${t.id}" title="${t.name} (${t.key.toUpperCase()})">${ICON[t.id]}<span>${t.name}</span></button>`).join('')}</div>
          <div class="${K}-seg" role="group" aria-label="Şekil"><button type="button" data-fm="0">${ICON.stroke}<span>Çerçeve</span></button><button type="button" data-fm="1">${ICON.filled}<span>Dolu</span></button></div>
          <button type="button" class="${K}-wide ${K}-clr2" data-act="clear">${ICON.trash}<span>Tuvali temizle</span></button>
        </section>
        <section class="${K}-panel ${K}-p-colors" data-panel="colors">
          <h4>Renk <span class="${K}-hex"></span></h4>
          <div class="${K}-pal">${PALETTE.map((c, i) => `<button type="button" class="${K}-sw" data-col="${c}" style="--sw:#${c}" title="${PAL_NAMES[i]}" aria-label="${PAL_NAMES[i]}"></button>`).join('')}</div>
          <div class="${K}-crow">
            <label class="${K}-custom" title="Özel renk"><input type="color" class="${K}-cin" value="#${s.c}" aria-label="Özel renk seç"><span>+</span></label>
            <div class="${K}-recent" aria-label="Son renkler"></div>
          </div>
          <div class="${K}-orow"><span>Opaklık</span><input type="range" class="${K}-ar" min="5" max="100" step="5" aria-label="Opaklık"><b class="${K}-av"></b></div>
          <button type="button" class="${K}-wide" data-act="bg">${ICON.bg}<span>Zemini bu renge boya</span></button>
        </section>
        <section class="${K}-panel ${K}-p-size" data-panel="size">
          <h4>Kalınlık <b class="${K}-wv"></b></h4>
          <div class="${K}-srow"><input type="range" class="${K}-wr" min="1" max="80" aria-label="Kalınlık"><span class="${K}-prev"><i></i></span></div>
          <div class="${K}-pre">${SIZE_PRESETS.map(w => `<button type="button" data-w="${w}" aria-label="Kalınlık ${w}"><i style="--d:${Math.round(3 + w * 0.55)}px"></i></button>`).join('')}</div>
        </section>
        <section class="${K}-panel ${K}-p-pat" data-panel="pattern">
          <h4>Desen</h4>
          <div class="${K}-pats">${PATTERNS.map((n, i) => `<button type="button" class="${K}-pt" data-pat="${i}" title="${n}"><canvas width="44" height="44"></canvas><span>${n}</span></button>`).join('')}</div>
        </section>
        <section class="${K}-panel ${K}-p-acts" data-panel="acts">
          <button type="button" class="${K}-b" data-act="undo" title="Geri al (Ctrl+Z)" aria-label="Geri al">${ICON.undo}<span>Geri al</span></button>
          <button type="button" class="${K}-b" data-act="redo" title="Yinele (Ctrl+Y)" aria-label="Yinele">${ICON.redo}<span>Yinele</span></button>
          <button type="button" class="${K}-b ${K}-danger" data-act="clear" title="Temizle" aria-label="Temizle">${ICON.trash}<span>Temizle</span></button>
        </section>
      </div>
      <div class="${K}-bar">
        <div class="${K}-row">
          ${QUICK.map(id => tb(id)).join('')}
          <button type="button" class="${K}-b ${K}-more" data-open-p="tools" aria-label="Tüm araçlar" title="Tüm araçlar">${ICON.shapes}</button>
          <button type="button" class="${K}-b" data-act="undo" aria-label="Geri al" title="Geri al (Ctrl+Z)">${ICON.undo}</button>
          <button type="button" class="${K}-b" data-act="redo" aria-label="Yinele" title="Yinele (Ctrl+Y)">${ICON.redo}</button>
        </div>
        <div class="${K}-row">
          <button type="button" class="${K}-b ${K}-cur" data-open-p="colors" aria-label="Renkler"><i></i></button>
          <div class="${K}-quick"></div>
          <button type="button" class="${K}-b ${K}-szb" data-open-p="size" aria-label="Kalınlık"><i></i></button>
          <button type="button" class="${K}-b ${K}-ptb" data-open-p="pattern" aria-label="Desen"><canvas width="40" height="40"></canvas></button>
        </div>
      </div>
      <div class="${K}-toast" hidden></div>
    </div>`;
    this.el = this.cfg.bar.querySelector('.' + K);
    this.el.addEventListener('click', this.onBar); this.el.addEventListener('input', this.onInput); this.el.addEventListener('change', this.onInput);
    this.refresh(true);
  }
  q(s) { return this.el.querySelector(s); }
  qa(s) { return this.el.querySelectorAll(s); }
  refresh(force) {
    if (!this.el) return;
    const K = this.K, s = this.set, tl = TOOL[s.tool], can = this.cfg.canDraw(), w = s.ws[s.tool] || 6;
    this.el.classList.toggle('off', !can);
    this.qa('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === s.tool));
    const more = this.q(`.${K}-more`); more.innerHTML = QUICK.includes(s.tool) ? ICON.shapes : ICON[s.tool]; more.classList.toggle('on', !QUICK.includes(s.tool));
    this.qa('[data-fm]').forEach(b => b.classList.toggle('on', +b.dataset.fm === s.f));
    this.qa('[data-col]').forEach(b => b.classList.toggle('on', b.dataset.col === s.c));
    this.qa('[data-pat]').forEach(b => b.classList.toggle('on', +b.dataset.pat === s.d));
    this.qa('[data-w]').forEach(b => b.classList.toggle('on', +b.dataset.w === w));
    const rgba = `rgba(${parseInt(s.c.slice(0, 2), 16)},${parseInt(s.c.slice(2, 4), 16)},${parseInt(s.c.slice(4, 6), 16)},${s.a / 100})`;
    this.el.style.setProperty('--kc', '#' + s.c); this.el.style.setProperty('--kca', rgba); this.el.style.setProperty('--kpb', tileBg(s.c));
    this.el.style.setProperty('--kw', Math.round(cl(3 + w * 0.42, 3, 30)) + 'px');
    this.q(`.${K}-hex`).textContent = '#' + s.c.toUpperCase();
    const wr = this.q(`.${K}-wr`); if (+wr.value !== w) wr.value = w; this.q(`.${K}-wv`).textContent = w;
    const ar = this.q(`.${K}-ar`); if (+ar.value !== s.a) ar.value = s.a; this.q(`.${K}-av`).textContent = s.a + '%';
    const cin = this.q(`.${K}-cin`); if (document.activeElement !== cin && cin.value !== '#' + s.c) cin.value = '#' + s.c;
    const rec = s.recent.filter(c => c !== s.c);
    this.q(`.${K}-recent`).innerHTML = rec.slice(0, 6).map(c => `<button type="button" class="${K}-sw" data-col="${c}" style="--sw:#${c}" aria-label="Son renk #${c}"></button>`).join('');
    this.q(`.${K}-quick`).innerHTML = rec.slice(0, 4).map(c => `<button type="button" class="${K}-b ${K}-qs" data-col="${c}" style="--sw:#${c}" aria-label="Renk #${c}"><i></i></button>`).join('');
    const patOk = tl.t !== '' && !(tl.t === 's' && (tl.k === 3 || tl.k === 5));
    this.el.dataset.tool = s.tool; this.el.classList.toggle('nopat', !patOk); this.el.classList.toggle('shape', tl.t === 'r' || tl.t === 'o');
    if (force || this.lastPatCol !== s.c + s.d) { this.lastPatCol = s.c + s.d; this.paintPats(); }
    const dis = !can;
    this.qa('button, input').forEach(b => { b.disabled = dis; });
    if (can) {
      this.qa('[data-act="undo"]').forEach(b => { b.disabled = !this.ops.length && !this.cur; });
      this.qa('[data-act="redo"]').forEach(b => { b.disabled = !this.st.redo.length; });
      this.qa('[data-act="clear"]').forEach(b => { b.disabled = !this.ops.length || this.ops[this.ops.length - 1].t === 'x'; });
    }
    this.cfg.frame.classList.toggle(K + '-zoomed', this.zs > 1.01);
  }
  paintPats() {
    const s = this.set;
    const tile = (cv, d) => {
      const g = cv.getContext('2d'), W = cv.width; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, W);
      g.fillStyle = tileBg(s.c); g.fillRect(0, 0, W, W);
      if (!d) { g.fillStyle = '#' + s.c; g.fillRect(0, 0, W, W); return; }
      g.fillStyle = patternFor(g, d, s.c, W * 1000 / (PAT_U * 2.2)); g.fillRect(0, 0, W, W);
    };
    this.qa('[data-pat] canvas').forEach(cv => tile(cv, +cv.parentElement.dataset.pat));
    const bt = this.q(`.${this.K}-ptb canvas`);
    if (s.d) tile(bt, s.d);
    else {                                             // desen yokken: dört desenli küçük mozaik (düğmenin anlamı belli olsun)
      const g = bt.getContext('2d'), W = bt.width, h = W / 2; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#fbf8ff'; g.fillRect(0, 0, W, W);
      [1, 4, 2, 9].forEach((d, j) => { g.save(); g.beginPath(); g.rect((j % 2) * h, (j >> 1) * h, h, h); g.clip(); g.fillStyle = patternFor(g, d, j % 3 ? '6b3dff' : 'ff4fb8', W * 1000 / (PAT_U * 3.2)); g.fillRect(0, 0, W, W); g.restore(); });
    }
  }
  open(p) { this.el.dataset.open = this.el.dataset.open === p ? '' : p; }
  close() { if (this.el) this.el.dataset.open = ''; }
  onDocDown(e) { if (this.el && this.el.dataset.open && !this.el.contains(e.target)) this.close(); }
  save() { saveSet(this.set); }
  setTool(id) {
    if (!TOOL[id]) return;
    if ((id === 'picker' || id === 'eraser') && this.set.tool !== 'picker' && this.set.tool !== 'eraser') this.prevTool = this.set.tool;
    this.set.tool = id; this.save(); this.refresh();
  }
  setColor(c, keep) {
    this.set.c = c; if (!keep) this.addRecent(c);
    if (this.set.tool === 'eraser' || this.set.tool === 'picker') this.set.tool = this.prevTool && this.prevTool !== 'eraser' && this.prevTool !== 'picker' ? this.prevTool : 'pen';
    this.save(); this.refresh();
  }
  addRecent(c) { const r = this.set.recent.filter(x => x !== c); r.unshift(c); this.set.recent = r.slice(0, 8); }
  onBar(e) {
    const b = e.target.closest('button'); if (!b || b.disabled || !this.cfg.canDraw()) return;
    if (b.dataset.openP) { this.open(b.dataset.openP); return; }
    if (b.dataset.tool) { this.setTool(b.dataset.tool); if (b.closest('[data-panel]')) this.close(); return; }
    if (b.dataset.col) { this.setColor(b.dataset.col); this.close(); return; }
    if (b.dataset.pat != null) { this.set.d = +b.dataset.pat; const tl = TOOL[this.set.tool]; if (tl.t === '' || (tl.t === 's' && (tl.k === 3 || tl.k === 5))) this.set.tool = 'fill'; this.save(); this.refresh(); this.close(); return; }
    if (b.dataset.w) { this.set.ws[this.set.tool] = +b.dataset.w; this.save(); this.refresh(); return; }
    if (b.dataset.fm != null) { this.set.f = +b.dataset.fm; if (!(this.set.tool === 'rect' || this.set.tool === 'ellipse')) this.set.tool = 'rect'; this.save(); this.refresh(); return; }
    const a = b.dataset.act;
    if (a === 'undo') this.undo(); else if (a === 'redo') this.redo(); else if (a === 'clear') { this.close(); this.clear(); }
    else if (a === 'bg') { this.close(); this.commit({ i: this.id(), t: 'b', c: this.set.c }); this.toast('Zemin boyandı'); }
  }
  onInput(e) {
    const t = e.target, K = this.K;
    if (t.classList.contains(K + '-wr')) { this.set.ws[this.set.tool] = cl(+t.value | 0, 1, 80); this.refresh(); if (e.type === 'change') this.save(); }
    else if (t.classList.contains(K + '-ar')) { this.set.a = cl(+t.value | 0, 5, 100); this.refresh(); if (e.type === 'change') this.save(); }
    else if (t.classList.contains(K + '-cin')) { const c = t.value.replace('#', '').toLowerCase(); if (/^[0-9a-f]{6}$/.test(c)) this.setColor(c, e.type !== 'change'); }
  }
  toast(msg) {
    const t = this.q(`.${this.K}-toast`); if (!t) return;
    t.textContent = msg; t.hidden = false; t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
    clearTimeout(this.toastT); this.toastT = setTimeout(() => { t.hidden = true; }, 1800);
  }
  onKey(e) {
    if (!this.cfg.canDraw() || !this.cfg.cv.isConnected) return;
    const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
    const mod = e.ctrlKey || e.metaKey, k = (e.key || '').toLowerCase();
    if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); this.undo(); return; }
    if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); this.redo(); return; }
    if (mod || e.altKey) return;
    if (k === '[' || k === ']') { const w = this.set.ws[this.set.tool] || 6; this.set.ws[this.set.tool] = cl(w + (k === ']' ? Math.max(1, Math.round(w * 0.2)) : -Math.max(1, Math.round(w * 0.2))), 1, 80); this.save(); this.refresh(); return; }
    const t = TOOLS.find(x => x.key === k); if (t) { this.setTool(t.id); }
  }
  /* ----- komutlar ----- */
  commit(op, type) {
    this.p.push(op); this.st.redo.length = 0;
    if (op.c && op.t !== 'b' && !(op.t === 's' && op.k === 5)) this.addRecent(op.c);
    this.cfg.emit(type || 'add', op); this.refresh();
  }
  undo() {
    if (this.cur) this.finish();
    if (!this.ops.length) return;
    const op = this.p.pop(); this.st.redo.push(op);
    this.cfg.emit('undo', op); this.refresh();
  }
  redo() {
    if (this.cur) this.finish();
    const op = this.st.redo.pop(); if (!op) return;
    this.p.push(op); this.cfg.emit('redo', op); this.refresh();
  }
  async clear() {
    if (!this.ops.length || this.ops[this.ops.length - 1].t === 'x') return;
    if (this.cur) this.finish();
    const ok = this.cfg.confirm ? await this.cfg.confirm('Tuvali temizle', 'Tüm çizim silinecek. (Geri al ile geri getirebilirsin.)', 'Temizle') : true;
    if (!ok || !this.cfg.canDraw()) return;
    this.commit({ i: this.id(), t: 'x' });
  }
  budgetOk(kind) {
    const c = this.cfg;
    if (c.maxOps && this.ops.length >= c.maxOps) { this.toast('Tuval dolu! Biraz geri al ya da temizle.'); return false; }
    if (kind === 's' && c.maxPts && npts(this.ops) >= c.maxPts - 40) { this.toast('Tuval dolu! Biraz geri al ya da temizle.'); return false; }
    if (kind === 'f' && c.maxFills && this.ops.filter(o => o.t === 'f').length >= c.maxFills) { this.toast('Çok fazla boya kovası kullanıldı.'); return false; }
    return true;
  }
  /* ----- girdi ----- */
  unit(e) {
    const r = this.cfg.cv.getBoundingClientRect();
    return [cl(Math.round((e.clientX - r.left) / r.width * 1000), 0, 1000), cl(Math.round((e.clientY - r.top) / r.height * 1000), 0, 1000)];
  }
  onDown(e) {
    if (!this.cfg.canDraw() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.pointerType });
    if (this.ptrs.size === 2 && e.pointerType === 'touch') { this.cancelCur(); this.pinchStart(); return; }
    if (this.ptrs.size > 1) return;
    try { this.cfg.cv.setPointerCapture(e.pointerId); } catch { /* */ }
    this.close();
    const [x, y] = this.unit(e), s = this.set, tl = TOOL[s.tool];
    if (tl.id === 'picker') { this.pick(x, y); return; }
    if (tl.t === 'f') { if (this.budgetOk('f')) this.commit({ i: this.id(), t: 'f', c: s.c, a: s.a, d: s.d, p: [x, y] }); return; }
    if (!this.budgetOk(tl.t === 's' ? 's' : 'o')) return;
    const op = { i: this.id(), t: tl.t, c: s.c, a: s.a, w: s.ws[tl.id] || 6, d: (tl.k === 3 || tl.k === 5) ? 0 : s.d };
    if (tl.t === 's') { op.k = tl.k; op.p = [x, y]; } else { op.f = s.f; op.p = [x, y, x, y]; }
    this.cur = op; this.curPid = e.pointerId; this.p.live = [op]; this.p.show();
    if (op.t === 's') {
      this.cfg.emit('begin', op);
      if (op.k === 3) { clearInterval(this.sprayT); this.sprayT = setInterval(() => { const c = this.cur; if (!c || c !== op) { clearInterval(this.sprayT); return; } if (c.p.length >> 1 < STROKE_MAX) { c.p.push(c.p[c.p.length - 2], c.p[c.p.length - 1]); this.p.show(); this.cfg.emit('pts', c); } }, 90); }
    }
    this.refresh();
  }
  onMove(e) {
    if (this.ptrs.has(e.pointerId)) this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.pointerType });
    if (this.pz) { e.preventDefault(); this.pinchMove(); return; }
    const op = this.cur; if (!op || this.curPid !== e.pointerId) return;
    e.preventDefault();
    if (op.t === 's') {
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      const cw = this.cfg.cv.clientWidth || 300, ch = this.cfg.cv.clientHeight || 300, minD = op.k === 3 ? 3 : 1.8;
      let added = false;
      for (const ev of (evs.length ? evs : [e])) {
        const [x, y] = this.unit(ev), p = op.p, lx = p[p.length - 2], ly = p[p.length - 1];
        if (Math.hypot((x - lx) * cw / 1000, (y - ly) * ch / 1000) < minD) continue;
        if ((p.length >> 1) >= STROKE_MAX) { this.split(); return; }
        p.push(x, y); added = true;
      }
      if (added) { this.p.show(); this.cfg.emit('pts', op); }
    } else {
      let [x, y] = this.unit(e);
      if (e.shiftKey && op.t !== 'l') { const asp = this.p.RW / this.p.RH, dx = x - op.p[0], dy = (y - op.p[1]) / asp, m = Math.max(Math.abs(dx), Math.abs(dy)); x = cl(Math.round(op.p[0] + Math.sign(dx || 1) * m), 0, 1000); y = cl(Math.round(op.p[1] + Math.sign(dy || 1) * m * asp), 0, 1000); }
      op.p[2] = x; op.p[3] = y; this.p.show();
    }
  }
  onUp(e) {
    this.ptrs.delete(e.pointerId);
    if (this.pz) { if (this.ptrs.size < 2) this.pz = null; return; }
    if (!this.cur || (e && this.curPid !== e.pointerId)) return;
    this.finish();
  }
  split() {                                           // çok uzun çizgi: kes ve aynı ayarlarla devam et
    const op = this.cur, lx = op.p[op.p.length - 2], ly = op.p[op.p.length - 1];
    this.finish();
    if (!this.budgetOk('s')) return;
    const n = Object.assign({}, op, { i: this.id(), p: [lx, ly] }); delete n.e;
    this.cur = n; this.p.live = [n]; this.cfg.emit('begin', n);
  }
  finish() {
    const op = this.cur; if (!op) return;
    this.cur = null; this.curPid = null; this.p.live = []; clearInterval(this.sprayT);
    if (op.t === 's') {
      if (this.cfg.simplify && op.k !== 3) op.p = rdp(op.p, this.cfg.simplify);
      this.commit(op, 'end'); return;
    }
    const dx = Math.abs(op.p[2] - op.p[0]), dy = Math.abs(op.p[3] - op.p[1]);
    if ((op.t === 'l' && dx + dy < 3) || (op.t !== 'l' && (dx < 3 || dy < 3))) { this.p.show(); this.refresh(); return; }
    this.commit(op, 'add');
  }
  cancelCur() {
    const op = this.cur; if (!op) return;
    this.cur = null; this.curPid = null; this.p.live = []; this.p.show(); clearInterval(this.sprayT);
    if (op.t === 's') this.cfg.emit('cancel', op);
    this.refresh();
  }
  pick(x, y) {
    const cv = this.cfg.cv, px = cl(Math.floor(x / 1000 * cv.width), 0, cv.width - 1), py = cl(Math.floor(y / 1000 * cv.height), 0, cv.height - 1);
    this.p.paint();
    let d; try { d = cv.getContext('2d').getImageData(px, py, 1, 1).data; } catch { return; }
    const bg = this.p.bg || this.cfg.paper || 'ffffff', bn = parseInt(bg, 16), al = d[3] / 255;
    const mix = (v, b) => Math.round(v * al + b * (1 - al));
    const c = [mix(d[0], (bn >> 16) & 255), mix(d[1], (bn >> 8) & 255), mix(d[2], bn & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
    this.set.tool = this.prevTool && this.prevTool !== 'picker' ? this.prevTool : 'pen';
    this.setColor(c); this.toast('Renk alındı #' + c.toUpperCase());
  }
  /* ----- iki parmakla yakınlaştırma ----- */
  pinchStart() {
    const [a, b] = [...this.ptrs.values()];
    this.pz = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, s0: this.zs, tx0: this.ztx, ty0: this.zty };
  }
  pinchMove() {
    const v = [...this.ptrs.values()]; if (v.length < 2) return;
    const [a, b] = v, z = this.pz, r = this.cfg.frame.getBoundingClientRect();
    const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const s = cl(z.s0 * d / z.d0, 1, 4);
    const cx = (z.mx - r.left - z.tx0) / z.s0, cy = (z.my - r.top - z.ty0) / z.s0;
    this.zoom(s, mx - r.left - cx * s, my - r.top - cy * s);
  }
  zoom(s, tx, ty) {
    const r = this.cfg.frame.getBoundingClientRect();
    this.zs = s; this.ztx = cl(tx, r.width - r.width * s, 0); this.zty = cl(ty, r.height - r.height * s, 0);
    if (s <= 1.01) { this.zs = 1; this.ztx = this.zty = 0; }
    this.cfg.wrap.style.transform = this.zs > 1 ? `translate(${this.ztx}px,${this.zty}px) scale(${this.zs})` : '';
    this.cfg.frame.classList.toggle(this.K + '-zoomed', this.zs > 1.01);
  }
  resetZoom() { this.zoom(1, 0, 0); }
}

return { enc, dec, unpack, pack, meta, npts, rdp, keyOf, rNew, rasterOp, rFlood, rRuns, rPixels, replay, newScene, sceneApply, lastClear,
  drawOp, paintStatic, Painter, Board, ICON, PALETTE, PATTERNS, TOOLS, STROKE_MAX, light };
})();
/* @@PAINTKIT-END */

/* ---------- kelime havuzu: kategori → zorluk (k: kolay, o: orta, z: zor) ---------- */
const RAW = {
  hayvan: {
    k: `KEDİ,KÖPEK,BALIK,KUŞ,TAVŞAN,FİL,ZÜRAFA,ASLAN,MAYMUN,AYI,YILAN,ÖRÜMCEK,KELEBEK,ARI,İNEK,AT,KOYUN,TAVUK,ÖRDEK,FARE,BALİNA,AHTAPOT,PENGUEN,BAYKUŞ,KURBAĞA,KARINCA,SALYANGOZ,DOMUZ,CİVCİV,KAPLUMBAĞA,YUNUS,KAPLAN`,
    o: `KANGURU,DEVE,ZEBRA,GERGEDAN,PAPAĞAN,FLAMİNGO,YARASA,KİRPİ,SİNCAP,TİLKİ,KURT,GEYİK,YENGEÇ,ISTAKOZ,DENİZANASI,KARTAL,KUĞU,HOROZ,KEÇİ,KOALA,PANDA,TİMSAH,KÖPEKBALIĞI,DİNOZOR,SOLUCAN,MARTI,ÇEKİRGE,KAZ,HİNDİ,KARGA,LEYLEK,DENİZATI,HAMSTER,LEOPAR,GORİL,KUNDUZ,AKREP,SİVRİSİNEK,KARİDES,EŞEK,MANDA,KÖSTEBEK,TIRTIL,SERÇE,GÜVERCİN,PELİKAN`,
    z: `KUTUP AYISI,SU AYGIRI,TAVUS KUŞU,DEVE KUŞU,UĞUR BÖCEĞİ,BUKALEMUN,DENİZ YILDIZI,ATEŞ BÖCEĞİ,AĞAÇKAKAN,KARINCAYİYEN,YUSUFÇUK,KERTENKELE,DENİZ AYISI,PİRANA,KUTUP TİLKİSİ,TEMBEL HAYVAN,SAKSAĞAN`
  },
  yiyecek: {
    k: `ELMA,ARMUT,MUZ,ÇİLEK,KARPUZ,KİRAZ,ÜZÜM,LİMON,PORTAKAL,HAVUÇ,DOMATES,MISIR,MANTAR,EKMEK,PEYNİR,YUMURTA,PASTA,DONDURMA,PİZZA,HAMBURGER,PATATES,SOĞAN,BİBER,SİMİT,SÜT,BAL,KURABİYE,ŞEKER,ÇORBA,ÇAY,KAHVE`,
    o: `LAHMACUN,DÖNER,BAKLAVA,MANTI,KÖFTE,SUCUK,ZEYTİN,KUMPİR,PİDE,BÖREK,LOKUM,MAKARNA,ÇİKOLATA,SANDVİÇ,ANANAS,NAR,İNCİR,KAVUN,ŞEFTALİ,PATLICAN,SALATALIK,KARNABAHAR,KEK,BROKOLİ,SARIMSAK,KABAK,AVOKADO,CEVİZ,FINDIK,FISTIK,TOST,POĞAÇA,KRUVASAN,SPAGETTİ,SOSİS,SALATA,AYRAN,LİMONATA,PANKEK,LOLİPOP,KESTANE,ERİK,KAYISI,BEZELYE,DÜRÜM`,
    z: `PAMUK ŞEKER,PATLAMIŞ MISIR,HİNDİSTAN CEVİZİ,MİDYE DOLMA,KÜNEFE,KOKOREÇ,MENEMEN,TÜRK KAHVESİ,İSKENDER,KARNIYARIK,AŞURE,YAPRAK SARMA,ÇİĞ KÖFTE,MERCİMEK ÇORBASI,KAZANDİBİ,ELMA ŞEKERİ,SÜTLAÇ,GÖZLEME,MISIR GEVREĞİ,DONDURMA KÜLAHI`
  },
  esya: {
    k: `KAPI,PENCERE,MERDİVEN,MASA,SANDALYE,YATAK,LAMBA,SAAT,TELEFON,TELEVİZYON,BİLGİSAYAR,KİTAP,KALEM,MAKAS,ANAHTAR,ŞEMSİYE,GÖZLÜK,ŞAPKA,AYAKKABI,ÇORAP,ELDİVEN,TİŞÖRT,PANTOLON,ÇANTA,TOP,BALON,UÇURTMA,ARABA,OTOBÜS,BİSİKLET,UÇAK,GEMİ,TREN,KAYIK,ROKET,BARDAK,ÇATAL,KAŞIK,BIÇAK,TABAK,TENCERE,ŞİŞE,MUM,ZİL,DAVUL,GİTAR,TAÇ,KILIÇ,BAYRAK,SABUN,HAVLU,TARAK,AYNA,YASTIK,KUTU,HEDİYE,ZARF,KUPA,SİLGİ,CETVEL,YÜZÜK,KRAVAT,DÜĞME,ÇEKİÇ,ÇİVİ,KOVA,FIRÇA,SALINCAK,BEBEK,HALKA,ETEK,ELBİSE,MONT,ATKI,BERE`,
    o: `PUSULA,HARİTA,DÜRBÜN,KAMERA,RADYO,KULAKLIK,MİKROFON,KLAVYE,PİL,AMPUL,PRİZ,MIKNATIS,TESTERE,TORNAVİDA,KÜREK,BUZDOLABI,FIRIN,ÜTÜ,SÜPÜRGE,VANTİLATÖR,ŞÖMİNE,KOLTUK,HALI,PERDE,DOLAP,VAZO,SAKSI,TAKVİM,ZAR,SATRANÇ,BUMERANG,PARAŞÜT,HELİKOPTER,DENİZALTI,TRAKTÖR,KAMYON,AMBULANS,MOTOSİKLET,KAYKAY,PATEN,KIZAK,YELKENLİ,ÇAPA,DÜMEN,KEMAN,PİYANO,TROMPET,KUM SAATİ,DİŞ FIRÇASI,EL FENERİ,KASK,MASKE,PELERİN,KEMER,BİLEZİK,CÜZDAN,BAVUL,SEPET,MEŞALE,KÜRDAN,TERMOMETRE,KİLİT,ÇAYDANLIK,MİKSER,KUMANDA,İĞNE,İPLİK,TERLİK,ÇİZME,HALTER,RAKET,DEFTER,ÇEKİRDEK,ÇİT,BACA`,
    z: `ÇAMAŞIR MAKİNESİ,TRAFİK LAMBASI,ASANSÖR,YÜRÜYEN MERDİVEN,AKVARYUM,HAMAK,TERAZİ,AKORDEON,BAĞLAMA,ARP,KUKLA,UYDU,MİKROSKOP,TELESKOP,FOTOĞRAF MAKİNESİ,SICAK HAVA BALONU,TELEFERİK,İTFAİYE ARABASI,CANKURTARAN SİMİDİ,TAHTEREVALLİ,SABUN KÖPÜĞÜ,YAĞMURLUK,OYUN HAMURU,BİLARDO,ŞAMDAN,PERİSKOP,ROBOT SÜPÜRGE,DİKİŞ MAKİNESİ,TOST MAKİNESİ,SIRT ÇANTASI,SÖRF TAHTASI,BULAŞIK MAKİNESİ,ÇALAR SAAT,KAR KÜREĞİ,SU BARDAĞI,KAR TOPU`
  },
  meslek: {
    k: `DOKTOR,ÖĞRETMEN,POLİS,AŞÇI,PİLOT,ASTRONOT,İTFAİYECİ,ÇİFTÇİ,BALIKÇI,RESSAM,ŞARKICI,FUTBOLCU,HEMŞİRE,BERBER,POSTACI,ŞOFÖR,GARSON,ASKER,DİŞÇİ,KASAP`,
    o: `DALGIÇ,PALYAÇO,SİHİRBAZ,MARANGOZ,TERZİ,FIRINCI,BAHÇIVAN,KAPTAN,FOTOĞRAFÇI,VETERİNER,BOKSÖR,BALERİN,GAZETECİ,HAKEM,CANKURTARAN,BEKÇİ,ÇOBAN,MADENCİ,MİMAR,KUAFÖR,TESİSATÇI,ELEKTRİKÇİ,SİMİTÇİ,DONDURMACI,KAMERAMAN`,
    z: `ARKEOLOG,KÜTÜPHANECİ,ARICI,DEDEKTİF,CAMBAZ,BİLİM İNSANI,ORKESTRA ŞEFİ,HEYKELTIRAŞ,JOKEY,TRAFİK POLİSİ,BASKETBOLCU,DAĞCI,HOKKABAZ,ÇÖPÇÜ`
  },
  mekan: {
    k: `EV,OKUL,HASTANE,PARK,PLAJ,ÇADIR,KALE,KÖPRÜ,BAHÇE,MUTFAK,SINIF,MARKET,HAVUZ,SİNEMA,KULE`,
    o: `STADYUM,ŞATO,PİRAMİT,DÖNME DOLAP,KAYDIRAK,ÇİFTLİK,DEĞİRMEN,KÜTÜPHANE,HAVALİMANI,LUNAPARK,MÜZE,OTEL,KAMP ALANI,LİMAN,İSTASYON,ÇEŞME,KUYU,AHIR,KÖY,PAZAR,BANYO,TÜNEL,MAĞAZA,POSTANE,ECZANE,SİRK`,
    z: `DENİZ FENERİ,SAAT KULESİ,GÖKDELEN,BENZİN İSTASYONU,HAYVANAT BAHÇESİ,YAYA GEÇİDİ,PARK YERİ,KUM KALESİ,AĞAÇ EV,METRO,ÇAMAŞIRHANE,BUZ PATENİ PİSTİ,SU PARKI,UZAY İSTASYONU,KAYAK MERKEZİ`
  },
  doga: {
    k: `GÜNEŞ,AY,YILDIZ,BULUT,YAĞMUR,KAR,ŞİMŞEK,GÖKKUŞAĞI,AĞAÇ,ÇİÇEK,YAPRAK,DAĞ,DENİZ,ADA,ATEŞ,TAŞ,KUM,GÜL,KAKTÜS,PALMİYE,LALE,ÇİM`,
    o: `VOLKAN,ŞELALE,MAĞARA,GÖL,NEHİR,ORMAN,ÇÖL,DALGA,RÜZGAR,KASIRGA,BUZ,KAR TANESİ,AYÇİÇEĞİ,PAPATYA,ÇAM AĞACI,KAYA,GEZEGEN,DÜNYA,BUZDAĞI,SİS,GÖKTAŞI`,
    z: `KUYRUKLU YILDIZ,AY TUTULMASI,KUZEY IŞIKLARI,KUM FIRTINASI,YAĞMUR ORMANI,ÖRÜMCEK AĞI,ARI KOVANI,KUŞ YUVASI,MERCAN,DEPREM,GÜN BATIMI,SONBAHAR`
  },
  masal: {
    k: `PRENSES,KRAL,KRALİÇE,PRENS,EJDERHA,CADI,PERİ,DEV,CÜCE,HAYALET,ROBOT,UZAYLI,KORSAN,ŞÖVALYE`,
    o: `DENİZKIZI,VAMPİR,MUMYA,ZOMBİ,KURT ADAM,SÜPER KAHRAMAN,CİN,SİHİRLİ DEĞNEK,UÇAN HALI,HAZİNE SANDIĞI,HAZİNE HARİTASI,KORSAN GEMİSİ,MAĞARA ADAMI,KARDAN ADAM,BÜYÜLÜ AYNA,CANAVAR,KELOĞLAN,UZAY GEMİSİ,UÇAN DAİRE,SİNEMA BİLETİ`,
    z: `KIRMIZI BAŞLIKLI KIZ,ÜÇ KÜÇÜK DOMUZ,ÇİZMELİ KEDİ,CAM AYAKKABI,BALKABAĞI ARABA,ALTIN YUMURTA,SİHİRLİ LAMBA,TEK BOYNUZLU AT,FASULYE SIRIĞI,NASREDDİN HOCA,ZAMAN MAKİNESİ,KIRMIZI HALI,ÜÇ BOYUTLU GÖZLÜK,UYUYAN GÜZEL`
  },
  eylem: {
    k: `KOŞMAK,YÜZMEK,UYUMAK,ZIPLAMAK,AĞLAMAK,GÜLMEK,UÇMAK,OKUMAK,YAZMAK,İÇMEK`,
    o: `ESNEMEK,ALKIŞLAMAK,DÜŞMEK,TIRMANMAK,DANS ETMEK,SARILMAK,BAĞIRMAK,BOYAMAK,KAZMAK,ÇİZMEK,SALLANMAK,EL SALLAMAK,SÜPÜRMEK`,
    z: `BALIK TUTMAK,ŞARKI SÖYLEMEK,KAYAK YAPMAK,HAPŞIRMAK,SÖRF YAPMAK,YEMEK PİŞİRMEK,ÇAMAŞIR ASMAK,DİŞ FIRÇALAMAK,FOTOĞRAF ÇEKMEK,BULAŞIK YIKAMAK,ÇİÇEK SULAMAK,İP ATLAMAK,FISILDAMAK,HORLAMAK,SAKLAMBAÇ OYNAMAK,KAMP YAPMAK,DUŞ ALMAK`
  }
};
const CATS = [
  { v: 'all', label: 'Hepsi' }, { v: 'hayvan', label: 'Hayvanlar' }, { v: 'yiyecek', label: 'Yiyecek' }, { v: 'esya', label: 'Eşyalar' },
  { v: 'meslek', label: 'Meslekler' }, { v: 'mekan', label: 'Mekânlar' }, { v: 'doga', label: 'Doğa' }, { v: 'masal', label: 'Filmler & Masallar' },
  { v: 'eylem', label: 'Hareketler' }, { v: 'zor', label: 'Zor kelimeler' }
];
const CAT_LABEL = {}; CATS.forEach(c => { CAT_LABEL[c.v] = c.label; });
const DIFF = { k: { label: 'Kolay', mult: 1 }, o: { label: 'Orta', mult: 1.25 }, z: { label: 'Zor', mult: 1.5 } };
const WORDS = [];
(() => {
  const seen = new Set();
  for (const c of Object.keys(RAW)) for (const d of ['k', 'o', 'z']) for (const raw of RAW[c][d].split(',')) {
    const w = raw.trim().replace(/\s+/g, ' ');
    if (w && !seen.has(w)) { seen.add(w); WORDS.push({ w, d, c }); }
  }
})();

/* ---------- sabitler ---------- */
const RW = 600, RH = 450;                  // boya kovası sınır rasteri (4:3)
const PAPER = 'fbf8ff';
const MAX_PTS = 9600, MAX_OPS = 1000, MAX_FILLS = 110, CHUNK = 240;     // yöneten cihaz sınırları
const C_MAX_PTS = 9000, C_MAX_OPS = 940, C_MAX_FILLS = 100;           // çizen cihaz sınırları (biraz daha sıkı → senkron bozulmaz)
const CHOOSE_MS = 20000, REVEAL_MS = 3600, GUESS_GAP = 500;
const ORDER_BONUS = [20, 10, 5];

/* ---------- yardımcılar ---------- */
const TRMAP = { 'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'I': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U', 'Â': 'A', 'Î': 'I', 'Û': 'U' };
const norm = s => [...String(s || '').toLocaleUpperCase('tr-TR')].map(c => TRMAP[c] || c).join('').replace(/[^A-Z0-9]/g, '');
const tokens = s => String(s || '').toLocaleUpperCase('tr-TR').split(/[^A-ZÇĞIİÖŞÜÂÎÛ0-9]+/u).map(norm).filter(Boolean);
function lev(a, b, cap = 2) {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
// Tahmini sınıflandır: ok | near | part | wrong  (yakın tahminler yalnızca yazana gösterilir → kelime sızmaz)
// Türkçe karakterler normalize edilir (ç=c, ğ=g, ı/i=I, ö=o, ş=s, ü=u); ekli hâller ve 1–2 harf hatası "yakın" sayılır.
function judge(guess, answer) {
  const A = norm(answer), G = norm(guess);
  if (!G) return 'empty';
  if (G === A) return 'ok';
  const T = tokens(guess), aw = tokens(answer);
  for (let i = 0; i < T.length; i++) for (let j = i + 1; j <= T.length; j++) if (T.slice(i, j).join('') === A) return 'ok';
  const tol = A.length >= 8 ? 2 : 1;
  if (A.length >= 3 && G.length >= 3 && lev(G, A) <= tol) return 'near';
  if (A.length >= 3 && G.includes(A)) return 'near';
  if (aw.length > 1 && T.some(t => t.length >= 2 && aw.includes(t))) return 'part';
  if (A.length >= 4 && T.some(t => t.length >= 4 && (lev(t, A) <= tol || (t.length > A.length && t.startsWith(A))))) return 'near';
  return 'wrong';
}
const isLetterCh = c => /[A-ZÇĞIİÖŞÜ]/u.test(c);

/* ---------- kurallar (yöneten cihaz) ---------- */
const nOf = st => st.pl.length;
function chat(st, m) { m.id = ++st.chatSeq; st.chat.push(m); if (st.chat.length > 50) st.chat.splice(0, st.chat.length - 50); return m; }
function sysChat(st, ctx, tx, cls) { const m = chat(st, { k: 'sys', tx, cls }); ctx.emit({ t: 'chat', m, tn: st.turn }); }
function wordPool(st) {
  return WORDS.map((x, i) => i).filter(i => st.cat === 'all' || (st.cat === 'zor' ? WORDS[i].d === 'z' : WORDS[i].c === st.cat));
}
function pickChoices(st) {
  const used = new Set(st.used), all = wordPool(st);
  let pool = all.filter(i => !used.has(i)); if (pool.length < 3) pool = all.slice();
  const out = [], take = list => { const c = list.filter(i => !out.includes(i)); if (!c.length) return false; out.push(c[Math.floor(Math.random() * c.length)]); return true; };
  const wants = st.diffOpt === 'mix' ? ['k', 'o', 'z'] : [st.diffOpt, st.diffOpt, st.diffOpt];
  for (const d of wants) { if (!take(pool.filter(i => WORDS[i].d === d))) take(pool); }
  while (out.length < 3 && take(WORDS.map((x, i) => i))) { /* yedek */ }
  const order = { k: 0, o: 1, z: 2 };
  return out.sort((a, b) => order[WORDS[a].d] - order[WORDS[b].d]);
}
function resetCanvas(st) { st.ops = []; st.live = null; st.redo = []; st.nid = 0; st.npts = 0; st.rev = (st.rev || 0) + 1; }
function nextTurn(st, ctx) {
  const n = nOf(st);
  for (let guard = 0; guard <= n * st.rounds; guard++) {
    st.turn++;
    if (st.turn >= st.total) { finish(st, ctx); return; }
    const d = st.turn % n;
    const others = st.on.some((o, i) => o && i !== d);
    if (st.on[d] || !others) break;
    sysChat(st, ctx, `${st.pl[d].name} bağlı değil, çizim sırası geçti.`, 'bad');
  }
  st.drawer = st.turn % n;
  st.phase = 'choose'; st.choices = pickChoices(st); st.word = ''; st.diff = 'k';
  st.got = st.pl.map(() => null); st.gain = st.pl.map(() => 0); st.hints = [];
  resetCanvas(st); st.reason = '';
  st.chooseEnd = st.local ? 0 : Date.now() + CHOOSE_MS;
  st.tk++;
  ctx.emit({ t: 'turn', drawer: st.drawer, tn: st.turn });
  ctx.sync();
  arm(st, ctx);
}
function startDraw(st, ctx, k) {
  const wi = st.choices[k]; if (wi == null) return;
  st.used.push(wi);
  st.word = WORDS[wi].w; st.diff = WORDS[wi].d; st.wcat = WORDS[wi].c; st.choices = [];
  st.phase = 'draw'; st.startAt = Date.now(); st.endAt = st.startAt + st.drawSec * 1000;
  st.tk++;
  const lens = st.word.split(' ').map(w => [...w].length);
  sysChat(st, ctx, `✏️ ${st.pl[st.drawer].name} çiziyor · ${lens.join(' + ')} harf`, 'gold');
  ctx.emit({ t: 'start', drawer: st.drawer, tn: st.turn });
  if (!guessers(st).length) { endTurn(st, ctx, 'empty'); return; }
  ctx.sync();
  arm(st, ctx);
}
const guessers = st => st.pl.map((_, i) => i).filter(i => i !== st.drawer && st.on[i]);
function maxHints(st) {
  if (!st.hintOn) return 0;
  const L = [...st.word].filter(isLetterCh).length;
  return clamp(Math.floor(L * 0.4), L >= 3 ? 1 : 0, Math.min(6, Math.max(0, L - 2)));
}
function revealHint(st, ctx, want) {
  if (st.phase !== 'draw' || st.hints.length >= Math.min(want, maxHints(st))) return;
  const chars = [...st.word];
  const free = chars.map((c, i) => i).filter(i => isLetterCh(chars[i]) && !st.hints.includes(i));
  if (!free.length) return;
  st.hints.push(free[Math.floor(Math.random() * free.length)]);
  sysChat(st, ctx, '💡 İpucu: bir harf açıldı.', '');
  ctx.emit({ t: 'hint', tn: st.turn });
  ctx.sync();
}
function arm(st, ctx) {
  const tk = st.tk, now = Date.now();
  const at = (t, fn) => ctx.later(Math.max(0, t - now), () => { if (st.tk === tk) fn(); });
  if (st.phase === 'choose' && st.chooseEnd) {
    at(st.chooseEnd, () => {
      if (st.on[st.drawer]) { sysChat(st, ctx, `${st.pl[st.drawer].name} için kelime otomatik seçildi.`, ''); startDraw(st, ctx, Math.floor(Math.random() * st.choices.length)); }
      else { sysChat(st, ctx, `${st.pl[st.drawer].name} bağlı değil, çizim sırası geçti.`, 'bad'); nextTurn(st, ctx); }
    });
  } else if (st.phase === 'draw') {
    const dur = st.endAt - st.startAt, mh = maxHints(st);
    for (let j = 1; j <= mh; j++) at(st.startAt + dur * (0.3 + 0.55 * j / (mh + 1)), () => revealHint(st, ctx, j));
    at(st.endAt, () => endTurn(st, ctx, 'time'));
  } else if (st.phase === 'reveal') {
    at(st.revealEnd, () => nextTurn(st, ctx));
  }
}
function endTurn(st, ctx, reason) {
  if (st.phase !== 'draw') return;
  if (st.live) { st.ops.push(st.live); st.live = null; st.rev++; }
  st.phase = 'reveal'; st.reason = reason; st.revealEnd = Date.now() + REVEAL_MS; st.tk++;
  const ok = st.got.filter(x => x != null).length;
  const why = reason === 'all' ? 'Herkes bildi!' : reason === 'left' ? `${st.pl[st.drawer].name} ayrıldı.` : reason === 'time' ? 'Süre doldu.' : reason === 'empty' ? 'Tahmin edecek kimse kalmadı.' : 'Tur bitti.';
  sysChat(st, ctx, `${why} Kelime: ${st.word}`, ok ? 'good' : 'bad');
  ctx.emit({ t: 'reveal', word: st.word, ok, reason, tn: st.turn });
  ctx.sync();
  arm(st, ctx);
}
function finish(st, ctx) {
  st.phase = 'end'; st.tk++; st.turn = st.total - 1;
  ctx.sync();
  const order = st.pl.map((_, i) => i).sort((a, b) => st.score[b] - st.score[a] || a - b);
  const top = st.score[order[0]], tie = order.filter(i => st.score[i] === top).length > 1;
  ctx.end({
    title: tie ? 'Berabere bitti!' : `${st.pl[order[0]].name} kazandı!`,
    ranking: order.map(i => ({ pi: i, score: st.score[i], label: `${st.score[i]} puan` })),
    note: `${st.total} çizim yapıldı · ${st.correct} doğru tahmin · Kategori: ${CAT_LABEL[st.cat] || 'Hepsi'}`
  });
}
function correct(st, pi, ctx) {
  const order = st.got.filter(x => x != null).length;
  const dur = st.endAt - st.startAt, frac = clamp((st.endAt - Date.now()) / dur, 0, 1);
  const mult = DIFF[st.diff].mult;
  const pts = Math.round((30 + 70 * frac + (ORDER_BONUS[order] || 0)) * mult);
  const dp = Math.round((10 + 20 * frac) * mult);           // çizen de hıza göre puan alır
  st.got[pi] = pts; st.score[pi] += pts; st.gain[pi] += pts; st.correct++;
  st.score[st.drawer] += dp; st.gain[st.drawer] += dp;
  const m = chat(st, { k: 'ok', pi });
  chat(st, { k: 'me', to: pi, tx: st.word, pts });
  ctx.emit({ t: 'chat', m, tn: st.turn, pts });
  const g = guessers(st);
  if (g.length && g.every(i => st.got[i] != null)) endTurn(st, ctx, 'all');
  else ctx.sync();
}
/* çizim işlemleri (yöneten cihaz) — her değişiklik rev'i bir artırır, olay da rev taşır */
const fills = st => st.ops.reduce((s, o) => s + (o.t === 'f' ? 1 : 0), 0);
function commitLive(st) { if (st.live) { st.ops.push(st.live); st.live = null; } }
function drawOk(st, pi) { return st.phase === 'draw' && pi === st.drawer; }
function addPts(st, pi, a, ctx) {
  if (!drawOk(st, pi)) return;
  if (!Number.isInteger(a.s) || typeof a.p !== 'string' || a.p.length > CHUNK * 2 || !/^[A-Za-z0-9_-]*$/.test(a.p)) return;
  const p = PK.dec(a.p).map(v => clamp(v, 0, 1000)); if (p.length % 2) p.pop();
  let op = st.live && st.live.i === a.s ? st.live : null, o = 0;
  if (!op) {
    if (a.s < st.nid || !p.length || st.ops.length >= MAX_OPS || st.npts + p.length / 2 > MAX_PTS) return;
    op = PK.unpack(Object.assign({}, a.m || {}, { i: a.s, t: 's', p }));
    if (!op) return;
    commitLive(st);
    st.live = op; st.nid = a.s + 1;                 // yinele yığını çizgi bitince temizlenir (iptal edilen çizgi yığını bozmasın)
  } else {
    if (op.p.length + p.length > PK.STROKE_MAX * 2 || st.npts + p.length / 2 > MAX_PTS) return;
    o = op.p.length; for (const v of p) op.p.push(v);
  }
  st.npts += p.length / 2; st.rev++;
  const end = !!a.e;
  if (end) { commitLive(st); st.redo = []; }
  ctx.emit({ t: 'pts', s: op.i, m: PK.meta(op), p: PK.enc(p), o, e: end ? 1 : 0, rev: st.rev, tn: st.turn });
}
function addOp(st, pi, a, ctx) {
  if (!drawOk(st, pi)) return;
  const op = PK.unpack(a.op); if (!op || op.t === 's') return;
  if (op.i < st.nid || st.ops.length >= MAX_OPS) return;
  if (op.t === 'f' && fills(st) >= MAX_FILLS) return;
  commitLive(st);
  st.ops.push(op); st.redo = []; st.nid = op.i + 1; st.rev++;
  ctx.emit({ t: 'op', op: PK.pack(op), rev: st.rev, tn: st.turn });
}
function undoOp(st, pi, a, ctx) {
  if (!drawOk(st, pi) || !Number.isInteger(a.s)) return;
  let op = null;
  if (st.live && st.live.i === a.s) { op = st.live; st.live = null; }
  else if (st.ops.length && st.ops[st.ops.length - 1].i === a.s) op = st.ops.pop();
  if (!op) return;
  if (op.t === 's') st.npts -= op.p.length / 2;
  if (!a.nr) st.redo.push(op);
  st.rev++;
  ctx.emit({ t: 'undo', s: a.s, rev: st.rev, tn: st.turn });
}
function redoOp(st, pi, a, ctx) {
  if (!drawOk(st, pi) || !st.redo.length) return;
  const op = st.redo[st.redo.length - 1]; if (op.i !== a.s) return;
  if (op.t === 's' && st.npts + op.p.length / 2 > MAX_PTS) return;
  st.redo.pop(); commitLive(st);
  st.ops.push(op); if (op.t === 's') st.npts += op.p.length / 2; st.rev++;
  ctx.emit({ t: 'redo', op: PK.pack(op), rev: st.rev, tn: st.turn });
}

/* ---------- arayüz durumu ---------- */
let root = null, ui = null, V = null;
const M = { turn: -1, rev: -1, redo: [], nid: 0, live: null };      // çizim modeli (görünüm + canlı olaylar)
let P = null, B = null;                                                // tuval ressamı + çizen araç çubuğu
let chatList = [], extras = [], lastChatId = 0;
let deadline = 0, dur = 1, timerT = null, lastTickSec = -1;
let pend = null, flushT = null;
const sent = new WeakMap(), dead = new WeakSet();
let peekShow = false, peekT = null, localReveal = false, lastKey = '';
let ro = null;
const q = s => root && root.querySelector(s);

const isLocal = () => ui && ui.mode === 'local';
const amDrawer = () => !!V && (isLocal() || ui.me === V.drawer);
const canDraw = () => !!V && V.phase === 'draw' && amDrawer();

/* ---------- tuval modeli ---------- */
function fitCanvas() { if (P && P.fit()) P.show(); }
function adopt(v) {
  const ops = (v.ops || []).map(o => PK.unpack(o)).filter(Boolean);
  const live = v.live ? PK.unpack(v.live) : null;
  M.live = live; M.rev = v.rev; M.nid = v.nid;
  if (P) P.setOps(ops, live ? [live] : []);
}
function syncModel(v) {
  if (v.turn !== M.turn) {
    M.turn = v.turn; M.redo.length = 0; pend = null;
    if (B) { B.cancelCur(); B.resetZoom(); B.close(); }
    adopt(v); return;
  }
  if (amDrawer() && !isLocal() && V && ui.me === v.drawer) return;     // çizen kendi (daha güncel) modelini korur
  if (isLocal()) return;
  if (v.rev !== M.rev) adopt(v);
}
function commitLiveLocal() { if (M.live) { const l = M.live; M.live = null; P.live = []; delete l.e; P.push(l); } }
function applyEv(e) {
  if (e.rev !== M.rev + 1) { M.rev = -9; return; }        // sıra dışı: bir sonraki görünümde düzelir
  M.rev = e.rev;
  if (e.t === 'pts') {
    let lv = M.live;
    if (!lv || lv.i !== e.s) {
      commitLiveLocal();
      if (e.o !== 0) { M.rev = -9; return; }
      lv = PK.unpack(Object.assign({}, e.m, { i: e.s, t: 's', p: e.p })); if (!lv) return;
      M.live = lv; P.live = [lv];
    } else {
      const add = PK.dec(e.p), have = lv.p.length;
      if (e.o > have) { M.rev = -9; return; }
      for (let j = have - e.o; j < add.length; j++) lv.p.push(clamp(add[j], 0, 1000));
    }
    if (e.e) commitLiveLocal(); else P.show();
  } else if (e.t === 'op' || e.t === 'redo') {
    commitLiveLocal(); const op = PK.unpack(e.op); if (op) P.push(op);
  } else if (e.t === 'undo') {
    if (M.live && M.live.i === e.s) { M.live = null; P.live = []; P.show(); }
    else if (P.ops.length && P.ops[P.ops.length - 1].i === e.s) P.pop();
  }
}

/* ---------- çizen: tahtadan gelen işlemleri gönder ---------- */
function send(a) { if (isLocal() && V) a.as = V.drawer; ui.send(a); }
function flushStroke(end) {
  const op = pend; if (!op || dead.has(op)) return;
  let o = sent.get(op) || 0;
  const m = PK.meta(op);
  do {
    const part = op.p.slice(o, o + CHUNK);
    if (!part.length && !end) break;
    const last = o + part.length >= op.p.length;
    send({ t: 'pts', s: op.i, m, p: PK.enc(part), e: end && last ? 1 : 0 });
    o += part.length;
  } while (o < op.p.length);
  sent.set(op, o);
}
function boardEmit(type, op) {
  if (!canDraw()) return;
  if (type === 'begin') { if (pend) flushStroke(true); pend = op; sent.set(op, 0); if (!flushT) flushT = setInterval(() => { if (pend) flushStroke(false); else { clearInterval(flushT); flushT = null; } }, 100); }
  else if (type === 'end') { if (pend === op) { flushStroke(true); pend = null; } }
  else if (type === 'cancel') { dead.add(op); if ((sent.get(op) || 0) > 0) send({ t: 'undo', s: op.i, nr: 1 }); if (pend === op) pend = null; }
  else if (type === 'add') { if (pend) { flushStroke(true); pend = null; } send({ t: 'op', op: PK.pack(op) }); if (op.t === 'f') Sound.tick(0.4); }
  else if (type === 'undo') { if (pend) { flushStroke(true); pend = null; } send({ t: 'undo', s: op.i }); Sound.whoosh(); }
  else if (type === 'redo') { send({ t: 'redo', s: op.i }); Sound.tick(0.5); }
}

/* ---------- çizim (render) ---------- */
function timeLabel(ms) { return String(Math.max(0, Math.ceil(ms / 1000))); }
function renderPlayers(v) {
  const box = q('.cb-players');
  box.innerHTML = v.players.map((p, i) => {
    const st = v.phase === 'end' ? '' : i === v.drawer ? '<span class="cb-st draw"><em>çiziyor </em>✏️</span>' : p.got ? '<span class="cb-st ok"><em>bildi </em>✓</span>' : '';
    const gain = (v.phase === 'reveal' || v.phase === 'end') && p.gain ? `<span class="cb-gain">+${p.gain}</span>` : '';
    return `<div class="cb-pl ${i === v.drawer && v.phase !== 'end' ? 'drawer' : ''} ${p.got ? 'got' : ''} ${p.on ? '' : 'off'} ${ui.me === i ? 'me' : ''}" style="--pc:${p.color}" data-pi="${i}">
      <span class="av" style="--pc:${p.color}">${initial(p.name)}</span>
      <span class="cb-pn"><b>${esc(p.name)}${ui.me === i ? ' <small>(sen)</small>' : ''}</b>${st}</span>
      <span class="cb-sc">${p.score}${gain}</span></div>`;
  }).join('');
}
function maskHTML(v) {
  const knows = !!v.word;
  if (knows && !(isLocal() && v.phase === 'draw' && !peekShow)) {
    return `<span class="cb-reveal">${esc(v.word)}</span>`;
  }
  const words = v.mask || [];
  const total = words.reduce((s, w) => s + w.length, 0);
  return `<span class="cb-mask">${words.map(w => `<span class="cb-mw">${w.map(c => `<i class="${c ? 'hint' : ''}">${c ? esc(c) : ''}</i>`).join('')}</span>`).join('')}</span><small class="cb-cnt">${total}</small>`;
}
function renderHead(v) {
  const head = q('.cb-word');
  let inner = '';
  if (v.phase === 'draw' || v.phase === 'reveal' || v.phase === 'end') inner = maskHTML(v);
  else inner = `<span class="cb-wait">${v.phase === 'choose' ? 'Kelime seçiliyor…' : ''}</span>`;
  if (isLocal() && v.phase === 'draw') inner += `<button type="button" class="cb-peek" data-act="peek" aria-label="Kelimeyi göster">${peekShow ? '🙈' : '👁'}</button>`;
  head.innerHTML = inner;
  const L = v.word ? [...v.word].length : (v.mask || []).reduce((s, w) => s + w.length + 1, -1);
  head.style.setProperty('--n', Math.max(7, L || 0));
  q('.cb-round').textContent = v.phase === 'end' ? 'Oyun bitti' : `Tur ${v.round}/${v.rounds} · Çizim ${Math.min(v.turn + 1, v.total)}/${v.total}`;
  const diff = q('.cb-diff');
  if ((v.phase === 'draw' || v.phase === 'reveal') && v.diff) { diff.hidden = false; diff.className = 'cb-diff d-' + v.diff; diff.textContent = (v.wcat && v.cat === 'all' ? CAT_LABEL[v.wcat] + ' · ' : '') + DIFF[v.diff].label; } else diff.hidden = true;
}
function renderStatus(v) {
  const st = q('.cb-status'), p = v.players, dn = p[v.drawer] ? `<b style="color:${p[v.drawer].color}">${esc(p[v.drawer].name)}</b>` : '';
  let h;
  const meGot = typeof ui.me === 'number' && ui.me >= 0 && p[ui.me] && p[ui.me].got;
  if (v.phase === 'end') h = '<span class="g-turn win">Oyun bitti!</span>';
  else if (v.phase === 'reveal') h = `<span class="g-turn">${v.okCount ? `${v.okCount} kişi bildi` : 'Kimse bilemedi'}</span>`;
  else if (isLocal()) h = v.phase === 'choose' ? `<span class="g-turn mine">⭐ Sıra: ${esc(p[v.drawer].name)} · kelime seç</span>` : `<span class="g-turn mine">✏️ ${esc(p[v.drawer].name)} çiziyor · bilen olunca dokun</span>`;
  else if (amDrawer()) h = v.phase === 'choose' ? '<span class="g-turn mine">⭐ Sıra sende · kelime seç</span>' : '<span class="g-turn mine">⭐ Sıra sende · çiz!</span>';
  else if (ui.me < 0) h = `<span class="g-turn">👀 İzliyorsun · Sıra: ${dn}</span>`;
  else if (v.phase === 'choose') h = `<span class="g-turn">Sıra: ${dn} · kelime seçiyor</span>`;
  else if (meGot) h = '<span class="g-turn win">Bildin! ✓ Diğerleri bekleniyor</span>';
  else h = `<span class="g-turn">Çizen: ${dn} · tahmin et!</span>`;
  st.innerHTML = h;
}
function renderOverlay(v) {
  const ov = q('.cb-over'), p = v.players;
  let h = '';
  if (v.phase === 'choose') {
    const name = esc(p[v.drawer].name);
    if (v.choices && (!isLocal() || localReveal)) {
      h = `<div class="cb-card"><p class="cb-ot">${isLocal() ? `${name}, bir kelime seç` : 'Çizeceğin kelimeyi seç'}</p><div class="cb-choices">${v.choices.map((c, k) => `<button type="button" class="cb-choice d-${c.d}" data-pick="${k}"><b>${esc(c.w)}</b><small>${DIFF[c.d].label}${DIFF[c.d].mult > 1 ? ` · +%${Math.round((DIFF[c.d].mult - 1) * 100)} puan` : ''}</small></button>`).join('')}</div>${v.left != null ? '<p class="cb-os">Süre bitince rastgele seçilir</p>' : ''}</div>`;
    } else if (v.choices && isLocal()) {
      h = `<div class="cb-card"><div class="cb-big">📱</div><p class="cb-ot">Telefonu <b style="color:${p[v.drawer].color}">${name}</b> alsın</p><p class="cb-os">Kelimeleri yalnızca çizen görsün.</p><button type="button" class="btn btn-spin" data-act="showChoices">Kelimeleri göster</button></div>`;
    } else {
      h = `<div class="cb-card"><div class="cb-big cb-pulse">✏️</div><p class="cb-ot"><b style="color:${p[v.drawer].color}">${name}</b> kelime seçiyor…</p>${v.cat !== 'all' ? `<p class="cb-os">Kategori: ${esc(CAT_LABEL[v.cat] || '')}</p>` : ''}</div>`;
    }
  } else if (v.phase === 'reveal' || v.phase === 'end') {
    const who = p.map((x, i) => ({ x, i })).filter(o => o.x.gain);
    h = `<div class="cb-card cb-rev"><p class="cb-os">${v.phase === 'end' ? 'Son kelime' : 'Kelime'}</p><div class="cb-revw">${[...(v.word || '')].map((c, k) => c === ' ' ? '<i class="sp"> </i>' : `<i style="--k:${k}">${esc(c)}</i>`).join('')}</div>
      <p class="cb-os">${v.okCount ? `${v.okCount} kişi bildi` : 'Kimse bilemedi 😅'}</p>
      ${who.length ? `<div class="cb-gains">${who.map(o => `<span style="--pc:${o.x.color}">${esc(o.x.name)} <b>+${o.x.gain}</b></span>`).join('')}</div>` : ''}</div>`;
  }
  if (ov.dataset.h !== h) { ov.innerHTML = h; ov.dataset.h = h; }   // aynı içerikte animasyonlar yeniden başlamasın
  ov.hidden = !h;
  ov.classList.toggle('rev', v.phase === 'reveal' || v.phase === 'end');
}
function renderTools() {
  const t = q('.cb-tools'); if (!t || !V) return;
  const show = amDrawer() && V.phase === 'draw';
  t.hidden = !show;
  q('.cb-studio').classList.toggle('has-tools', show);
  q('.cb-board').classList.toggle('can', canDraw());
  if (B) B.refresh();
}
function renderAward(v) {
  const box = q('.cb-award');
  if (!isLocal() || v.phase !== 'draw') { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  box.innerHTML = `<span class="cb-al">Kim bildi?</span>` + v.players.map((p, i) => i === v.drawer ? '' :
    `<button type="button" class="cb-aw ${p.got ? 'done' : ''}" style="--pc:${p.color}" data-award="${i}" ${p.got ? 'disabled' : ''}>${p.got ? '✓ ' : 'Bildi: '}${esc(p.name)}</button>`).join('') +
    `<button type="button" class="cb-aw end" data-act="endTurn">⏭ Turu bitir</button>`;
}
function chatLine(m) {
  const p = V && V.players[m.pi];
  const nm = p ? `<b style="color:${p.color}">${esc(p.name)}</b>` : '';
  if (m.k === 'g') return `<li class="g">${nm}<span>${esc(m.tx)}</span></li>`;
  if (m.k === 'ok') return `<li class="ok">${nm}<span>bildi! ✓</span></li>`;
  if (m.k === 'me') return `<li class="me">🎉 <span>Bildin! <b>${esc(m.tx)}</b> · +${m.pts}</span></li>`;
  if (m.k === 'near') return `<li class="near">🔥 <span>“${esc(m.tx)}” — Yakın!</span></li>`;
  if (m.k === 'part') return `<li class="near">🧩 <span>“${esc(m.tx)}” — kelimelerden biri doğru!</span></li>`;
  return `<li class="sys ${m.cls || ''}"><span>${esc(m.tx)}</span></li>`;
}
function renderChat() {
  const ol = q('.cb-msgs'); if (!ol) return;
  const nearBottom = ol.scrollHeight - ol.scrollTop - ol.clientHeight < 60;
  const items = [];
  let ei = 0;
  const ex = extras.slice().sort((a, b) => a.after - b.after);
  for (const m of chatList) { while (ei < ex.length && ex[ei].after < m.id) items.push(ex[ei++]); items.push(m); }
  while (ei < ex.length) items.push(ex[ei++]);
  ol.innerHTML = items.slice(-70).map(m => m.k ? chatLine(m) : `<li class="sys ${m.cls || ''}"><span>${esc(m.tx)}</span></li>`).join('') || '<li class="sys"><span>Tahminler burada görünür.</span></li>';
  if (nearBottom || ol.dataset.init !== '1') { ol.scrollTop = ol.scrollHeight; ol.dataset.init = '1'; }
}
function renderForm(v) {
  const inp = q('.cb-in'), btn = q('.cb-send'), form = q('.cb-form');
  form.hidden = isLocal();
  if (isLocal()) return;
  const me = ui.me, spect = typeof me !== 'number' || me < 0;
  let ph = 'Tahminini yaz…', dis = false;
  if (spect) { ph = 'İzleyiciler yazamaz'; dis = true; }
  else if (v.phase === 'draw' && me === v.drawer) { ph = 'Çizerken yazamazsın ✏️'; dis = true; }
  else if (v.phase === 'draw' && v.players[me].got) { ph = 'Bildin! ✓ Bekle…'; dis = true; }
  else if (v.phase === 'end') { ph = 'Oyun bitti'; dis = true; }
  else if (v.phase !== 'draw') ph = 'Sohbet et…';
  inp.placeholder = ph;
  if (inp.disabled !== dis) { inp.disabled = dis; if (dis) inp.blur(); }
  btn.disabled = dis;
}
function render(v) {
  const prev = V; V = v;
  if (!root) return;
  const key = v.turn + ':' + v.phase;
  if (key !== lastKey) {
    if (!prev || prev.turn !== v.turn) localReveal = false;
    peekShow = false; lastKey = key;
    if (prev && prev.phase === 'draw' && v.phase !== 'draw' && B) { if (pend) { flushStroke(true); pend = null; } B.cancelCur(); B.close(); }
  }
  syncModel(v);
  dur = v.dur || 1; deadline = v.left != null ? performance.now() + v.left : 0;
  chatList = v.chat || []; lastChatId = chatList.length ? chatList[chatList.length - 1].id : lastChatId;
  const cbEl = root.querySelector('.cb');
  cbEl.dataset.phase = v.phase;
  cbEl.classList.toggle('is-drawer', amDrawer() && !isLocal());
  cbEl.classList.toggle('is-local', isLocal());
  renderPlayers(v); renderHead(v); renderStatus(v); renderOverlay(v); renderTools(); renderAward(v); renderForm(v); renderChat();
  fitCanvas();
  tickTimer();
}
function tickTimer() {
  const bar = q('.cb-timer i'), num = q('.cb-time'); if (!bar || !V) return;
  if (!deadline) { bar.style.transform = 'scaleX(0)'; num.textContent = V.phase === 'choose' ? '…' : '–'; num.classList.remove('low'); bar.parentElement.classList.remove('low'); return; }
  const left = Math.max(0, deadline - performance.now()), f = clamp(left / dur, 0, 1);
  bar.style.transform = `scaleX(${f})`;
  const s = Math.ceil(left / 1000);
  num.textContent = timeLabel(left);
  const low = V.phase === 'draw' && s <= 10;
  num.classList.toggle('low', low); bar.parentElement.classList.toggle('low', low);
  if (V.phase === 'draw' && s <= 5 && s > 0 && s !== lastTickSec) { lastTickSec = s; Sound.tick(0.8); }
}

/* ---------- olaylar ---------- */
function onEvent(e) {
  if (!root || !V) return;
  if (e.tn != null && e.tn !== V.turn && e.t !== 'turn') return;
  if (e.t === 'pts' || e.t === 'op' || e.t === 'undo' || e.t === 'redo') {
    if (amDrawer() || !P) return;                     // çizen kendi işlemlerini zaten uyguladı
    applyEv(e);
    if (e.t === 'op' && e.op && e.op.t === 'f') Sound.tick(0.25);
  } else if (e.t === 'chat') {
    const m = e.m; if (!m || m.id <= lastChatId) return;
    chatList.push(m); lastChatId = m.id; renderChat();
    if (m.k === 'ok') {
      const mine = m.pi === ui.me;
      Sound.good();
      if (mine) { flash('good'); banner('BİLDİN! ✓', 'good'); }
      const chip = q(`.cb-pl[data-pi="${m.pi}"]`); if (chip) { const [x, y] = centerOf(chip); FX.burst(x, y, 26); }
    } else if (m.k === 'g') Sound.tick(0.3);
  } else if (e.t === 'turn') { Sound.whoosh(); }
  else if (e.t === 'start') { Sound.stop(); if (e.drawer === ui.me && !isLocal()) banner('ÇİZ!', 'pink'); }
  else if (e.t === 'hint') Sound.special();
  else if (e.t === 'reveal') {
    if (e.ok) { Sound.solve(); FX.confetti(50); } else Sound.bad();
    banner(e.word, e.ok ? 'good' : 'bad');
  }
}
function addLog(tx, cls) { extras.push({ after: lastChatId, tx, cls }); if (extras.length > 20) extras.shift(); renderChat(); }

/* ---------- kurulum ---------- */
function onClick(e) {
  const b = e.target.closest('button'); if (!b || b.disabled || !V) return;
  if (b.closest('.cb-tools') || b.closest('.cbk-zreset')) return;
  if (b.dataset.pick != null) { Sound.init(); send({ t: 'pick', k: +b.dataset.pick }); b.closest('.cb-choices').querySelectorAll('button').forEach(x => { x.disabled = true; }); return; }
  if (b.dataset.award != null) { Sound.init(); send({ t: 'award', who: +b.dataset.award }); return; }
  const act = b.dataset.act;
  if (act === 'showChoices') { localReveal = true; Sound.tick(0.5); renderOverlay(V); }
  else if (act === 'peek') { peekShow = !peekShow; clearTimeout(peekT); if (peekShow) peekT = setTimeout(() => { peekShow = false; if (V) renderHead(V); }, 2500); renderHead(V); }
  else if (act === 'endTurn') { send({ t: 'endTurn' }); }
}
function onSubmit(e) {
  e.preventDefault();
  const inp = q('.cb-in'); const tx = inp.value.replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!tx || inp.disabled) return;
  Sound.init(); ui.send({ t: 'guess', tx }); inp.value = ''; inp.focus();
}
function mount(r, api) {
  root = r; ui = api; V = null;
  M.turn = -1; M.rev = -1; M.redo = []; M.nid = 0; M.live = null; pend = null;
  chatList = []; extras = []; lastChatId = 0; lastKey = '';
  root.innerHTML = `<div class="g-wrap cb">
    <div class="cb-players"></div>
    <section class="cb-stage">
      <div class="g-status cb-status"></div>
      <div class="cb-head">
        <span class="cb-time">–</span>
        <div class="cb-word"></div>
      </div>
      <div class="cb-timer"><i></i></div>
      <div class="cb-meta"><span class="cb-round"></span><span class="cb-diff" hidden></span></div>
      <div class="cb-studio">
        <div class="cb-board"><div class="cbk-zoom"><canvas aria-label="Çizim tuvali"></canvas></div><div class="cb-over" hidden></div></div>
        <div class="cb-tools" hidden></div>
      </div>
      <div class="cb-award" hidden></div>
    </section>
    <section class="cb-chat">
      <ol class="cb-msgs" aria-live="polite"></ol>
      <form class="cb-form" autocomplete="off">
        <input class="cb-in" maxlength="40" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="send" aria-label="Tahmin">
        <button type="submit" class="btn btn-vowel cb-send">Gönder</button>
      </form>
    </section>
  </div>`;
  const cv = q('canvas');
  P = new PK.Painter(cv, RW, RH);
  B = new PK.Board({
    K: 'cbk', bar: q('.cb-tools'), cv, wrap: q('.cbk-zoom'), frame: q('.cb-board'), painter: P, store: M,
    canDraw, emit: boardEmit, confirm: (a, b, c) => CFX.confirmBox(a, b, c),
    maxPts: C_MAX_PTS, maxOps: C_MAX_OPS, maxFills: C_MAX_FILLS, simplify: 0, paper: PAPER
  });
  root.addEventListener('click', onClick);
  q('.cb-form').addEventListener('submit', onSubmit);
  if (window.ResizeObserver) { ro = new ResizeObserver(() => fitCanvas()); ro.observe(q('.cb-board')); }
  addEventListener('resize', fitCanvas);
  fitCanvas();
  timerT = setInterval(tickTimer, 200);
}
function unmount() {
  clearInterval(timerT); timerT = null; clearInterval(flushT); flushT = null; clearTimeout(peekT);
  if (ro) { ro.disconnect(); ro = null; }
  removeEventListener('resize', fitCanvas);
  if (B) { B.destroy(); B = null; }
  if (P) { P.destroy(); P = null; }
  if (root) root.removeEventListener('click', onClick);
  root = null; ui = null; V = null; pend = null;
}

CFX.registerGame({
  id: 'cizbil', name: 'Çiz Bil', icon: '🎨', color: '#ff3fa4', min: 2, max: 8, hotseat: true, bot: false, localMin: 2,
  tagline: 'Çiz, tahmin et, en hızlı bilen kazansın',
  rules: 'Sırası gelen üç kelimeden birini seçip çizer (kalem, fırça, sprey, neon, boya kovası, şekiller, desenler), diğerleri tahminini yazar. Ne kadar erken bilirsen o kadar çok puan; çizen de her bilen için puan alır. Tek telefonda oynarken herkes sesli tahmin eder, çizen bileni seçer.',
  options: [
    { key: 'cat', label: 'Kategori', def: 'all', choices: CATS.map(c => ({ v: c.v, label: c.label })) },
    { key: 'diff', label: 'Zorluk', def: 'mix', choices: [{ v: 'mix', label: 'Karışık' }, { v: 'k', label: 'Kolay' }, { v: 'o', label: 'Orta' }, { v: 'z', label: 'Zor' }] },
    { key: 'rounds', label: 'Tur sayısı (herkes kaç kez çizsin)', def: '2', choices: [{ v: '1', label: '1' }, { v: '2', label: '2' }, { v: '3', label: '3' }, { v: '4', label: '4' }] },
    { key: 'time', label: 'Çizim süresi', def: '80', choices: [{ v: '60', label: '60 sn' }, { v: '80', label: '80 sn' }, { v: '100', label: '100 sn' }, { v: '120', label: '120 sn' }] },
    { key: 'hint', label: 'İpucu harfleri', def: 'on', choices: [{ v: 'on', label: 'Açık' }, { v: 'off', label: 'Kapalı' }] }
  ],
  setup(players, opts, ctx) {
    const rounds = clamp(+opts.rounds || 2, 1, 4), sec = [60, 80, 100, 120].includes(+opts.time) ? +opts.time : 80;
    const cat = CAT_LABEL[opts.cat] ? opts.cat : 'all';
    const diffOpt = ['mix', 'k', 'o', 'z'].includes(opts.diff) ? opts.diff : 'mix';
    const st = {
      pl: players.map(p => ({ name: p.name, color: p.color })), score: players.map(() => 0), on: players.map(() => true),
      local: ctx.mode === 'local', rounds, drawSec: sec, total: players.length * rounds, turn: -1, drawer: 0,
      cat, diffOpt, hintOn: opts.hint !== 'off',
      phase: 'choose', choices: [], word: '', diff: 'k', wcat: '', got: [], gain: [], hints: [], used: [],
      ops: [], live: null, redo: [], nid: 0, npts: 0, rev: 0,
      chat: [], chatSeq: 0, tk: 0, startAt: 0, endAt: 0, chooseEnd: 0, revealEnd: 0,
      reason: '', correct: 0, lastGuess: players.map(() => 0)
    };
    chat(st, { k: 'sys', tx: `🎨 Çiz Bil başladı! ${CAT_LABEL[cat]} · ${diffOpt === 'mix' ? 'karışık zorluk' : DIFF[diffOpt].label.toLocaleLowerCase('tr-TR')} · herkes ${rounds} kez çizecek, süre ${sec} sn.`, cls: 'gold' });
    nextTurn(st, ctx);                       // ilk turu hemen hazırla (ilk görünüm boş kalmasın)
    return st;
  },
  action(st, pi, a, ctx) {
    if (st.phase === 'end') return;
    switch (a.t) {
      case 'pick': {
        if (st.phase !== 'choose' || pi !== st.drawer) return;
        const k = a.k | 0; if (k < 0 || k >= st.choices.length) return;
        startDraw(st, ctx, k); return;
      }
      case 'pts': addPts(st, pi, a, ctx); return;
      case 'op': addOp(st, pi, a, ctx); return;
      case 'undo': undoOp(st, pi, a, ctx); return;
      case 'redo': redoOp(st, pi, a, ctx); return;
      case 'award': {
        if (!st.local || st.phase !== 'draw' || pi !== st.drawer) return;
        const w = a.who | 0; if (w === st.drawer || w < 0 || w >= nOf(st) || st.got[w] != null) return;
        correct(st, w, ctx); return;
      }
      case 'endTurn': {
        if (!st.local || st.phase !== 'draw' || pi !== st.drawer) return;
        endTurn(st, ctx, 'manual'); return;
      }
      case 'guess': {
        if (st.local || typeof a.tx !== 'string') return;
        const tx = a.tx.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
        if (!tx) return;
        const now = Date.now(); if (now - st.lastGuess[pi] < GUESS_GAP) return; st.lastGuess[pi] = now;
        if (st.phase === 'draw') {
          if (pi === st.drawer || st.got[pi] != null) return;     // çizen ve bilen yazamaz (kelime sızmasın)
          const j = judge(tx, st.word);
          if (j === 'ok') { correct(st, pi, ctx); return; }
          if (j === 'near' || j === 'part') { chat(st, { k: j, to: pi, tx }); ctx.sync(); return; }
        }
        const m = chat(st, { k: 'g', pi, tx });
        ctx.emit({ t: 'chat', m, tn: st.turn });          // yanlış tahmin: herkes görür (senkron yok, çizim büyük olabilir)
        return;
      }
      default:
    }
  },
  view(st, viewer) {
    const all = viewer === 'all';
    const isDrawer = all || viewer === st.drawer;
    const ended = st.phase === 'reveal' || st.phase === 'end';
    const knows = st.phase !== 'choose' && (isDrawer || ended || (typeof viewer === 'number' && viewer >= 0 && st.got[viewer] != null));
    const now = Date.now();
    let left = null, d = 1;
    if (st.phase === 'draw') { left = Math.max(0, st.endAt - now); d = st.endAt - st.startAt; }
    else if (st.phase === 'choose' && st.chooseEnd) { left = Math.max(0, st.chooseEnd - now); d = CHOOSE_MS; }
    else if (st.phase === 'reveal') { left = Math.max(0, st.revealEnd - now); d = REVEAL_MS; }
    // Bilmeyen için yalnızca harf sayısı + açılan ipuçları. "all" (tek cihaz) da maskeyi alır: telefonu herkes görür.
    let mask = null;
    if (st.word && (!knows || all)) {
      let k = 0;
      mask = st.word.split(' ').map(w => { const r = [...w].map(c => { const i = k++; return st.hints.includes(i) ? c : ''; }); k++; return r; });
    }
    return {
      phase: st.phase, turn: st.turn, total: st.total, rounds: st.rounds, round: Math.min(st.rounds, Math.floor(Math.max(0, st.turn) / nOf(st)) + 1),
      drawer: st.drawer, left, dur: d, diff: st.phase === 'choose' ? null : st.diff, cat: st.cat, wcat: st.phase === 'choose' ? '' : st.wcat,
      word: knows ? st.word : null, mask,
      choices: st.phase === 'choose' && isDrawer ? st.choices.map(i => ({ w: WORDS[i].w, d: WORDS[i].d })) : null,
      okCount: st.got.filter(x => x != null).length,
      players: st.pl.map((p, i) => ({ name: p.name, color: p.color, score: st.score[i], on: st.on[i], got: st.got[i] != null, gain: ended ? st.gain[i] : 0 })),
      ops: st.ops.map(PK.pack), live: st.live ? PK.pack(st.live) : null, nid: st.nid, rev: st.rev,
      chat: st.chat.filter(m => m.to == null || m.to === viewer).slice(-40)
    };
  },
  turnOf(st) { return st.phase === 'choose' ? st.drawer : null; },
  skipTurn(st, pi, ctx) {
    // Kelime seçimi bekleniyor: çizen bağlıysa kelime otomatik seçilir; bağlı değilse
    // (çizen yokken tur oynanamaz) çizim sırası geçer.
    if (st.phase !== 'choose' || st.drawer !== pi) return;
    if (st.on[pi]) { sysChat(st, ctx, `${st.pl[pi].name} için kelime otomatik seçildi.`, ''); startDraw(st, ctx, Math.floor(Math.random() * st.choices.length)); return; }
    sysChat(st, ctx, `${st.pl[pi].name} bağlı değil, çizim sırası geçti.`, 'bad');
    nextTurn(st, ctx);
  },
  onPresence(st, pi, online, ctx) {
    st.on[pi] = online;
    if (online || st.phase !== 'draw') return;
    if (pi === st.drawer) { endTurn(st, ctx, 'left'); return; }
    const g = guessers(st);
    if (!g.length) endTurn(st, ctx, 'empty');
    else if (g.every(i => st.got[i] != null)) endTurn(st, ctx, 'all');
  },
  resume(st, ctx) { st.tk++; if (st.phase === 'end') return; arm(st, ctx); },
  mount, render, onEvent, unmount,
  log(text, cls) { addLog(text, cls); },
  _test: { judge, norm, WORDS, CATS, PK, pickChoices }
});
})();
