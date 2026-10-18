/* =========================================================================
   BOYA SAVAŞI — gerçek zamanlı alan boyama (üstten görünüm, 2–8 kişi)
     · Herkes Tek (her oyuncu kendi rengi) ya da Takım (iki takım, otomatik denge)
     · Zemin 120×80 hücrelik bir boya ızgarası; ızgaranın sahibi yöneten cihaz
       (yerel ya da oda kurucusu). Kurucu, doğrulanmış konum ve atışlardan boya
       basar, değişen hücreleri sıra numaralı, sıkıştırılmış farklar hâlinde
       hızlı kanaldan yayar (ui.fast ~10/sn) ve 2,5 sn'de bir tam görüntü
       (RLE + base64) gönderir. Katılımcılar kendi altlarını tahminle boyar,
       farklar/tam görüntü gelince uzlaşır.
     · Boyandığın (şlap!) zaman 2,6 sn sonra üssünde yeniden doğarsın.
     · Kendi boyanda hızlı, rakip boyasında yavaş; boya tankı zamanla dolar.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, flash, initial } = window.CFX;

/* ------------------------------------------------------------------ sabitler */
const W = 1440, H = 960, CS = 12, GW = W / CS, GH = H / CS, GN = GW * GH, B = 24, R = 20, BLK = 255;
const SPEED = 235, OWN_K = 1.3, ENEMY_K = .6, HASTE_K = 1.35, BOT_K = .93, MAXV = SPEED * OWN_K * HASTE_K;
const ROLL_R = 26, BIG_ROLL_R = 44;
const SHOT_V = 760, SHOT_RANGE = 340, BIG_RANGE = 400, SPLASH_R = 30, BIG_SPLASH_R = 44, TRAIL_R = 10, TRAIL_STEP = 30, HIT_R = R + 8;
const FIRE_MS = 200, INK_COST = 7, INK_REFILL = 14, INK_OWN = 34, INK_IDLE_MS = 450;
const HIT_DMG = 50, BIG_DMG = 100, HP_REGEN = 70, HP_WAIT = 1100;
const RESPAWN_MS = 2600, PROTECT_MS = 1700, COUNT_MS = 3600, REVEAL_MS = 7800, TICK = 100, SNAP_MS = 2500;
const BOMB_FUSE = 650, BOMB_R = 84, BOMB_KILL = 74, HASTE_MS = 5500, BIG_MS = 6500, SPLAT_R = 52, BASE_R = 54;
const TAU = Math.PI * 2;
const TEAM = [{ name: 'Pembe Takım', short: 'Pembe', color: '#ff3fa4' }, { name: 'Turkuaz Takım', short: 'Turkuaz', color: '#19e3d0' }];
const ITEMS = {
  bomba: { name: 'Boya Bombası', desc: 'Bulunduğun yerde kocaman patlar, yakındaki rakipleri boyar', col: '#ff5a3c' },
  hiz: { name: 'Hız', desc: '5 sn çok hızlı koşarsın', col: '#ffe14a' },
  rulo: { name: 'Dev Rulo', desc: '6 sn iki kat geniş boyar, iri atış yaparsın', col: '#5aa2ff' }
};
const ITEM_IDS = Object.keys(ITEMS);
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

/* ------------------------------------------------------------------ boya ızgarası: basma, sayma, kodlama */
const cellIdx = (x, y) => clamp(Math.floor(y / CS), 0, GH - 1) * GW + clamp(Math.floor(x / CS), 0, GW - 1);
const cellAt = (grid, x, y) => grid[cellIdx(x, y)];
// Daire biçiminde boya basar; set(i, v) değişen her hücre için çağrılır. Merkez hücre her zaman dahildir.
function stampGrid(grid, x, y, r, v, set) {
  const i0 = Math.max(0, Math.floor((x - r) / CS)), i1 = Math.min(GW - 1, Math.floor((x + r) / CS));
  const j0 = Math.max(0, Math.floor((y - r) / CS)), j1 = Math.min(GH - 1, Math.floor((y + r) / CS));
  const r2 = r * r, ci = cellIdx(x, y); let n = 0;
  for (let j = j0; j <= j1; j++) {
    const cy = (j + .5) * CS - y;
    for (let i = i0; i <= i1; i++) {
      const cx = (i + .5) * CS - x, k = j * GW + i;
      if (cx * cx + cy * cy > r2 && k !== ci) continue;
      const o = grid[k]; if (o === BLK || o === v) continue;
      if (set) set(k, v, o); else grid[k] = v;
      n++;
    }
  }
  return n;
}
function countGrid(grid) { const c = new Array(10).fill(0); let tot = 0; for (let i = 0; i < GN; i++) { const v = grid[i]; if (v === BLK) continue; tot++; if (v < 10) c[v]++; } return { c, tot }; }
const b64e = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
const b64d = str => { const s = atob(str), o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return o; };
// Fark: değişen hücreler sıralanır; ardışık ve aynı değerli olanlar [indeks(2B), uzunluk(1B), değer(1B)] koşusuna dönüşür
function encDiff(grid, idx) {
  const s0 = idx.slice().sort((a, b) => a - b), out = [];
  let k = 0;
  while (k < s0.length) {
    const s = s0[k], v = grid[s]; let n = 1;
    while (k + n < s0.length && s0[k + n] === s + n && grid[s + n] === v && n < 255) n++;
    out.push(s >> 8, s & 255, n, v); k += n;
  }
  return b64e(Uint8Array.from(out));
}
function decDiff(str) { const b = b64d(str), runs = []; for (let i = 0; i + 3 < b.length; i += 4) runs.push([(b[i] << 8) | b[i + 1], b[i + 2], b[i + 3]]); return runs; }
function applyRuns(grid, runs) { let n = 0; for (const [s, len, v] of runs) for (let k = 0; k < len; k++) { const i = s + k; if (i < GN && grid[i] !== BLK && grid[i] !== v) { grid[i] = v; n++; } } return n; }
// Tam görüntü: [değer, uzunluk≤255] çiftleriyle RLE
function encFull(grid) { const out = []; let i = 0; while (i < GN) { const v = grid[i]; let n = 1; while (i + n < GN && grid[i + n] === v && n < 255) n++; out.push(v, n); i += n; } return b64e(Uint8Array.from(out)); }
function decFull(str, grid) { const b = b64d(str); let i = 0; for (let k = 0; k + 1 < b.length; k += 2) { const v = b[k], n = b[k + 1]; for (let m = 0; m < n && i < GN; m++) grid[i++] = v; } return i === GN; }

/* ------------------------------------------------------------------ çizim yardımcıları */
function rrPath(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const D = {
  circle(g, x, y, r, fill, stroke, lw) { g.beginPath(); g.arc(x, y, Math.max(.1, r), 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } },
  ell(g, x, y, rx, ry, fill, rot = 0, stroke, lw) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } },
  rr(g, x, y, w, h, r, fill, stroke, lw) { rrPath(g, x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } },
  shadow(g, x, y, rx, ry, a = .25) { g.fillStyle = `rgba(20,8,40,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); },
  text(g, s, x, y, size, fill, stroke, font) { g.font = `${size}px ${font || '"Bungee","Arial Black","Segoe UI Black",sans-serif'}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if (stroke) { g.lineWidth = size * .22; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(s, x, y); } g.fillStyle = fill; g.fillText(s, x, y); },
  glow(g, x, y, r, col) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
};
// Boya lekesi: düzensiz kenarlı yumuşak daire (sıçrama, şlap)
function blob(g, x, y, r, col, seed, spikes = 9) {
  const rr = mulberry(seed * 7919 + 13);
  g.fillStyle = col; g.beginPath();
  for (let k = 0; k <= spikes * 2; k++) { const a = k / (spikes * 2) * TAU, d = r * (k % 2 ? .62 + rr() * .2 : .9 + rr() * .3); const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d; k ? g.lineTo(px, py) : g.moveTo(px, py); }
  g.closePath(); g.fill();
  for (let k = 0; k < 5; k++) { const a = rr() * TAU, d = r * (1.15 + rr() * .45); D.circle(g, x + Math.cos(a) * d, y + Math.sin(a) * d, r * (.1 + rr() * .1), col); }
}

/* ------------------------------------------------------------------ HARİTALAR (180° dönme simetrisi: iki taraf eşit) */
const rc = (x, y, w, h, s, t = 'w', extra) => Object.assign({ k: 'r', x, y, w, h, s, t }, extra || {});
const cc = (x, y, r, s, t = 'w', extra) => Object.assign({ k: 'c', x, y, r, s, t }, extra || {});
function rotO(o) { return o.k === 'c' ? Object.assign({}, o, { x: W - o.x, y: H - o.y, rot: 1 }) : Object.assign({}, o, { x: W - o.x - o.w, y: H - o.y - o.h, rot: 1 }); }
const MAPDEFS = {
  sehir: {
    id: 'sehir', name: 'Şehir Meydanı', icon: '🏙️', tip: 'Ortadaki fıskiyenin çevresi en çok çekişilen yer!',
    mid: [cc(720, 480, 78, 'fountain')],
    half: [rc(240, 296, 46, 116, 'planter'), rc(240, 548, 46, 116, 'planter'), rc(420, 186, 124, 76, 'kiosk'), rc(420, 698, 124, 76, 'kiosk', 'w', { c2: 1 }),
      cc(566, 404, 16, 'lamp'), cc(566, 556, 16, 'lamp'), rc(604, 92, 104, 30, 'bench'), cc(330, 812, 19, 'bin'), cc(196, 214, 22, 'tree')],
    spawnL: [[86, 480], [104, 128], [104, 832], [470, 80]]
  },
  oyuncak: {
    id: 'oyuncak', name: 'Oyuncak Odası', icon: '🧸', tip: 'Blok duvarların arasındaki geçitler kısa yoldur.',
    mid: [rc(684, 444, 72, 72, 'toybox')],
    half: [rc(300, 214, 64, 64, 'block', 'w', { col: '#ff5d6c', ch: 'A' }), rc(300, 682, 64, 64, 'block', 'w', { col: '#5aa2ff', ch: 'B' }),
      rc(522, 276, 46, 152, 'blocks'), rc(522, 532, 46, 152, 'blocks'), cc(400, 480, 40, 'ball'), cc(622, 126, 32, 'yoyo'), rc(176, 300, 40, 104, 'book'), rc(176, 556, 40, 104, 'book', 'w', { col: '#2bd96b' })],
    spawnL: [[86, 480], [104, 128], [104, 832], [470, 80]]
  },
  sahil: {
    id: 'sahil', name: 'Sahil', icon: '🏖️', tip: 'Dereye girilmez ama atışlar üstünden geçer; köprüleri tut!',
    mid: [],
    half: [rc(676, 24, 88, 120, 'water', 'l'), rc(676, 240, 88, 192, 'water', 'l'), rc(382, 150, 92, 70, 'castle'), cc(300, 650, 26, 'palm'), cc(520, 836, 24, 'palm'),
      cc(504, 330, 30, 'umbrella', 'w', { col: '#ff5d6c' }), cc(214, 334, 28, 'rock'), cc(560, 610, 30, 'umbrella', 'w', { col: '#5aa2ff' })],
    spawnL: [[86, 480], [104, 128], [104, 832], [470, 80]]
  }
};
const MAP_IDS = Object.keys(MAPDEFS);
function inObs(o, x, y, pad = 0) { if (o.k === 'c') return Math.hypot(x - o.x, y - o.y) < o.r + pad; return x > o.x - pad && x < o.x + o.w + pad && y > o.y - pad && y < o.y + o.h + pad; }
const mapCache = {};
function mapOf(id) {
  if (mapCache[id]) return mapCache[id];
  const d = MAPDEFS[id] || MAPDEFS.sehir;
  const obs = d.mid.concat(d.half, d.half.map(rotO));
  const spawnR = d.spawnL.map(p => [W - p[0], H - p[1]]), spawns = [];
  d.spawnL.forEach((p, k) => spawns.push(p, spawnR[k]));
  const mask = new Uint8Array(GN); let total = 0;
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const x = (i + .5) * CS, y = (j + .5) * CS;
    const blk = x < B || x > W - B || y < B || y > H - B || obs.some(o => inObs(o, x, y));
    mask[j * GW + i] = blk ? BLK : 0; if (!blk) total++;
  }
  return (mapCache[d.id] = Object.assign({}, d, { obs, walls: obs.filter(o => o.t === 'w'), spawns, teamSpawns: [d.spawnL, spawnR], mask, total }));
}

/* ------------------------------------------------------------------ fizik */
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
function collide(map, b) {
  for (let it = 0; it < 3; it++) {
    let hit = false;
    for (const o of map.obs) {
      const p = obsPush(o, b.x, b.y, R); if (!p) continue;
      hit = true; b.x += p[0] * p[2]; b.y += p[1] * p[2];
      const vn = b.vx * p[0] + b.vy * p[1]; if (vn < 0) { b.vx -= vn * p[0]; b.vy -= vn * p[1]; }
    }
    if (b.x < B + R) { b.x = B + R; if (b.vx < 0) b.vx = 0; hit = true; }
    if (b.x > W - B - R) { b.x = W - B - R; if (b.vx > 0) b.vx = 0; hit = true; }
    if (b.y < B + R) { b.y = B + R; if (b.vy < 0) b.vy = 0; hit = true; }
    if (b.y > H - B - R) { b.y = H - B - R; if (b.vy > 0) b.vy = 0; hit = true; }
    if (!hit) break;
  }
}
function moveBody(map, b, ix, iy, spd, dt) {
  const k = 1 - Math.exp(-14 * dt);
  b.vx += (ix * spd - b.vx) * k; b.vy += (iy * spd - b.vy) * k;
  const sp = Math.hypot(b.vx, b.vy), n = Math.max(1, Math.ceil(sp * dt / 8));
  for (let i = 0; i < n; i++) { b.x += b.vx * dt / n; b.y += b.vy * dt / n; collide(map, b); }
}
// Atış duvara çarpar; su (alçak engel) üstünden geçer
function shotBlocked(map, x, y) {
  if (x < B || x > W - B || y < B || y > H - B) return true;
  for (const o of map.walls) if (inObs(o, x, y)) return true;
  return false;
}
function losShot(map, x0, y0, x1, y1) { const d = dist(x0, y0, x1, y1), n = Math.ceil(d / 12); for (let k = 1; k < n; k++) { const u = k / n; if (shotBlocked(map, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u)) return false; } return true; }
function paintK(grid, x, y, code) { const v = cellAt(grid, x, y); return v === code ? OWN_K : (v && v !== BLK) ? ENEMY_K : 1; }

/* ------------------------------------------------------------------ yol bulma (botlar) */
const NC = 24, NX = W / NC, NY = H / NC, NN = NX * NY;
const navCache = {};
function navOf(id) {
  if (navCache[id]) return navCache[id];
  const map = mapOf(id), walk = new Uint8Array(NN), open = new Uint8Array(NN);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) walk[j * NX + i] = circleFree(map, (i + .5) * NC, (j + .5) * NC, R + 2) ? 1 : 0;
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
const ncx = c => (c % NX + .5) * NC, ncy = c => (Math.floor(c / NX) + .5) * NC;
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
function pathTo(f, tc) { const out = []; let c = tc, k = 0; while (c >= 0 && k++ < NN) { out.push([ncx(c), ncy(c)]); if (f.d[c] === 0) break; c = f.par[c]; } out.reverse(); return out.slice(1, 60); }
function losNav(nav, x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1), n = Math.ceil(d / (NC * .5));
  for (let k = 1; k <= n; k++) { const u = k / n, i = Math.floor((x0 + (x1 - x0) * u) / NC), j = Math.floor((y0 + (y1 - y0) * u) / NC); if (i < 0 || j < 0 || i >= NX || j >= NY || !nav.walk[j * NX + i]) return false; }
  return true;
}

/* ------------------------------------------------------------------ KURALLAR (yöneten cihaz) */
let uiRef = null;
function fastOut(o) { if (uiRef && uiRef.fast && uiRef.mode === 'online') { try { uiRef.fast(o); } catch { /* */ } } }
const pname = (st, i) => (st.players[i] ? st.players[i].name : '?');
function setPhase(st, ph, ms) { st.phase = ph; st.endsAt = Date.now() + ms; st.phaseDur = Math.max(1, ms); }
function newBot() { return { vx: 0, vy: 0, wp: null, re: 0, mode: 'paint', tgt: -1, goal: null, goalAt: 0, sx: 0, sy: 0, sAt: 0, jit: null, jitUntil: 0, side: 1, sideAt: 0, seeAt: 0, aimJ: rnd(-.08, .08) }; }
function hostInit(st) { st._mk = new Uint8Array(GN); st._chg = []; st._shots = []; st._hits = []; st._dirty = false; st._uiSynced = false; }
function setCellFn(st) {
  return (k, v, o) => { st.grid[k] = v; st.cnt[o]--; st.cnt[v]++; if (!st._mk[k]) { st._mk[k] = 1; st._chg.push(k); } };
}
function stamp(st, x, y, r, v) { if (!st._set) st._set = setCellFn(st); return stampGrid(st.grid, x, y, r, v, st._set); }
// Takımları dengele: önce insanlar, sonra botlar sırayla küçük takıma (eşitlikte dönüşümlü)
function balanceTeams(players) {
  const idx = players.map((_, i) => i);
  const order = shuf(idx.filter(i => !players[i].isBot)).concat(shuf(idx.filter(i => players[i].isBot)));
  const team = players.map(() => 0), cnt = [0, 0]; let t = Math.random() < .5 ? 0 : 1;
  for (const i of order) { const k = cnt[0] === cnt[1] ? t : (cnt[0] < cnt[1] ? 0 : 1); team[i] = k; cnt[k]++; if (cnt[0] === cnt[1]) t = 1 - t; }
  return team;
}
function rollSeg(st, i, x0, y0, x1, y1, now) {
  const d = dist(x0, y0, x1, y1); if (d < 1.5) return 0;
  const r = st.fx[i].big > now ? BIG_ROLL_R : ROLL_R, n = Math.max(1, Math.ceil(d / 10)); let c = 0;
  for (let k = 1; k <= n; k++) c += stamp(st, x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, r, st.code[i]);
  st.stats[i].pt += c;
  return c;
}
const isEnemy = (st, i, j, now) => j !== i && st.code[j] !== st.code[i] && !st.dead[j] && !(st.prot[j] > now);

function startPlay(st, ctx) {
  const now = Date.now();
  setPhase(st, 'play', st.dur * 1000); st.playAt = now; st.lastK = now;
  st.nextItemAt = now + rnd(5000, 8000);
  st.pos.forEach(p => { p.t = now; });
  ctx.emit({ t: 'go' }, '🎨 BOYA! Süre başladı.');
}
function respawn(st, i, now) {
  const s = st.spawn[i];
  st.pos[i] = { x: s[0], y: s[1], a: Math.atan2(H / 2 - s[1], W / 2 - s[0]), f: 0, m: 0, t: now };
  st.dead[i] = 0; st.life[i]++; st.prot[i] = now + PROTECT_MS; st.hp[i] = 100; st.ink[i] = 100; st.fq[i] = 0;
  if (st.bot[i]) Object.assign(st.bot[i], { vx: 0, vy: 0, wp: null, re: 0, goal: null, tgt: -1 });
}
function splat(st, v, by, now, ctx, how) {
  if (st.dead[v] || st.phase !== 'play') return false;
  const p = st.pos[v];
  st.dead[v] = now + RESPAWN_MS; st.hp[v] = 0; st.fq[v] = 0; p.f = 0; p.m = 0;
  const c = by >= 0 ? st.code[by] : 0;
  if (c) { const n = stamp(st, p.x, p.y, SPLAT_R, c); st.stats[by].pt += n; st.stats[by].sp++; }
  st.stats[v].dn++;
  if (st.bot[v]) { st.bot[v].vx = st.bot[v].vy = 0; }
  st._dirty = true;
  ctx.emit({ t: 'splat', v, by, x: Math.round(p.x), y: Math.round(p.y), c: c ? st.pal[c - 1] : '#ffffff', how },
    how === 'bomb' ? `💣 ${pname(st, v)} bombayla boyandı! (${pname(st, by)})` : `💦 ŞLAP! ${pname(st, v)} boyandı (${pname(st, by)})`);
  return true;
}
function fire(st, i, ang, now) {
  if (st.phase !== 'play' || st.dead[i] || st.ink[i] < INK_COST || now - st.lastShot[i] < FIRE_MS - 15) return null;
  const p = st.pos[i], big = st.fx[i].big > now ? 1 : 0, c = Math.cos(ang), s = Math.sin(ang);
  st.ink[i] -= INK_COST; st.lastShot[i] = now; st.stats[i].sh++;
  const sh = { id: ++st.sid, o: i, c: st.code[i], x: p.x + c * (R + 4), y: p.y + s * (R + 4), vx: c, vy: s, a: ang, d: 0, tr: 0, max: big ? BIG_RANGE : SHOT_RANGE, big };
  st.shots.push(sh); st._shots.push(sh);
  return sh;
}
function landShot(st, s, x, y) { const n = stamp(st, x, y, s.big ? BIG_SPLASH_R : SPLASH_R, s.c); if (st.stats[s.o]) st.stats[s.o].pt += n; }
function hitPlayer(st, j, s, now, ctx) {
  st.hp[j] -= s.big ? BIG_DMG : HIT_DMG; st.hitAt[j] = now;
  const n = stamp(st, st.pos[j].x, st.pos[j].y, 18, s.c); if (st.stats[s.o]) st.stats[s.o].pt += n;
  st._hits.push([s.id, Math.round(s.x), Math.round(s.y), j]);
  if (st.hp[j] <= 0) splat(st, j, s.o, now, ctx, 'shot');
}
function stepShots(st, dt, now, ctx) {
  const map = mapOf(st.mapId), n = st.players.length;
  for (let k = st.shots.length - 1; k >= 0; k--) {
    const s = st.shots[k]; let travel = SHOT_V * dt, done = false;
    while (travel > 1e-6 && !done) {
      const step = Math.min(12, travel, s.max - s.d); travel -= step;
      const nx = s.x + s.vx * step, ny = s.y + s.vy * step;
      if (shotBlocked(map, nx, ny)) { landShot(st, s, s.x, s.y); done = true; break; }
      s.x = nx; s.y = ny; s.d += step; s.tr += step;
      if (s.tr >= TRAIL_STEP) { s.tr = 0; const c = stamp(st, s.x, s.y, TRAIL_R * (s.big ? 1.4 : 1), s.c); if (st.stats[s.o]) st.stats[s.o].pt += c; }
      for (let j = 0; j < n; j++) {
        if (j === s.o || st.code[j] === s.c || st.dead[j] || st.prot[j] > now) continue;
        if (dist(s.x, s.y, st.pos[j].x, st.pos[j].y) < HIT_R + (s.big ? 6 : 0)) { hitPlayer(st, j, s, now, ctx); done = true; break; }
      }
      if (!done && s.d >= s.max - 1e-3) { landShot(st, s, s.x, s.y); done = true; }
    }
    if (done) st.shots.splice(k, 1);
  }
}
function regen(st, dt, now) {
  for (let i = 0; i < st.players.length; i++) {
    if (st.dead[i]) continue;
    const p = st.pos[i];
    if (now - st.lastShot[i] > INK_IDLE_MS) st.ink[i] = Math.min(100, st.ink[i] + dt * (cellAt(st.grid, p.x, p.y) === st.code[i] ? INK_OWN : INK_REFILL));
    if (now - st.hitAt[i] > HP_WAIT) st.hp[i] = Math.min(100, st.hp[i] + HP_REGEN * dt);
  }
}
function humanFire(st, now) {
  for (let i = 0; i < st.players.length; i++) {
    if (st.players[i].isBot || st.botCtl[i] || st.dead[i] || !st.fq[i]) continue;
    if (now - st.pos[i].t > 1500) { st.fq[i] = 0; continue; }
    if (now - st.lastShot[i] < FIRE_MS - 15) continue;
    if (st.ink[i] < INK_COST) { st.fq[i] = 0; continue; }
    fire(st, i, st.pos[i].a, now); st.fq[i]--;
  }
}
// Hızlı kanaldan gelen konum/nişan/atış sayacı: hız sınırı, duvar ve hayat sayacı doğrulanır
function applyPos(st, i, x, y, a, f, fc, l) {
  if (!st.players[i] || st.players[i].isBot || st.botCtl[i]) return false;
  const okLife = l === st.life[i];
  if (Number.isFinite(fc)) { const d = fc - st.fc[i]; if (d > 0 && d < 60 && okLife && st.phase === 'play' && !st.dead[i]) st.fq[i] = Math.min(3, st.fq[i] + d); st.fc[i] = fc; }
  if (st.phase !== 'play' || st.dead[i] || !okLife) return false;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const p = st.pos[i], now = Date.now(), map = mapOf(st.mapId);
  const maxd = MAXV * clamp((now - p.t) / 1000, 0, 1.5) * 1.35 + 50, d = dist(x, y, p.x, p.y);
  if (d > maxd) { const k = maxd / d; x = p.x + (x - p.x) * k; y = p.y + (y - p.y) * k; }
  x = clamp(x, B + R, W - B - R); y = clamp(y, B + R, H - B - R);
  if (!circleFree(map, x, y, R - 6)) { x = p.x; y = p.y; }
  rollSeg(st, i, p.x, p.y, x, y, now);
  st.pos[i] = { x, y, a: Number.isFinite(a) ? a : p.a, f: f ? 1 : 0, m: dist(x, y, p.x, p.y) > 1 ? 1 : 0, t: now };
  return true;
}
function hostPosIn(seat, m, cid) {
  const R0 = window.CFX && window.CFX.Room, g = R0 && R0.game;
  if (!g || !g.state || g.def.id !== 'boyasavasi' || !R0.isRunner() || g.result) return;
  if (cid !== undefined && (!g.players[seat] || g.players[seat].cid !== cid)) return;
  applyPos(g.state, seat, +m.x, +m.y, +m.a, m.f, +m.fc, m.l);
}
function spawnItems(st, now) {
  if (!st.pu || now < st.nextItemAt) return false;
  st.nextItemAt = now + rnd(7000, 10000);
  if (st.items.length >= 4) return false;
  const nav = navOf(st.mapId), map = mapOf(st.mapId);
  for (let t = 0; t < 80; t++) {
    const c = Math.floor(Math.random() * NN); if (!nav.walk[c] || nav.open[c] < 26) continue;
    const x = Math.round(ncx(c)), y = Math.round(ncy(c)), x2 = W - x, y2 = H - y;
    if (!circleFree(map, x2, y2, R + 2)) continue;
    const near = (px, py) => st.pos.some(p => dist(p.x, p.y, px, py) < 160) || st.items.some(o => dist(o.x, o.y, px, py) < 200) || st.spawn.some(s => dist(s[0], s[1], px, py) < 200);
    if (near(x, y) || near(x2, y2)) continue;
    const k = pickR(ITEM_IDS);
    st.items.push({ id: ++st.iid, k, x, y });
    if (dist(x, y, x2, y2) > 140) st.items.push({ id: ++st.iid, k, x: x2, y: y2 });
    return true;
  }
  return false;
}
function pickups(st, now, ctx) {
  let any = false;
  for (let k = st.items.length - 1; k >= 0; k--) {
    const it = st.items[k];
    for (let i = 0; i < st.players.length; i++) {
      if (st.dead[i]) continue;
      const p = st.pos[i]; if (dist(p.x, p.y, it.x, it.y) > R + 18) continue;
      if (it.k === 'bomba') st.bombs.push({ x: it.x, y: it.y, at: now + BOMB_FUSE, o: i, c: st.code[i] });
      else if (it.k === 'hiz') st.fx[i].spd = now + HASTE_MS;
      else st.fx[i].big = now + BIG_MS;
      st.items.splice(k, 1); any = true;
      ctx.emit({ t: 'pick', pi: i, k: it.k, x: it.x, y: it.y }, `${it.k === 'bomba' ? '💣' : it.k === 'hiz' ? '⚡' : '🖌️'} ${pname(st, i)}: ${ITEMS[it.k].name}!`);
      if (st.bot[i]) st.bot[i].re = 0;
      break;
    }
  }
  return any;
}
function bombTick(st, now, ctx) {
  let any = false;
  for (let k = st.bombs.length - 1; k >= 0; k--) {
    const b = st.bombs[k]; if (now < b.at) continue;
    st.bombs.splice(k, 1); any = true;
    const n = stamp(st, b.x, b.y, BOMB_R, b.c); if (st.stats[b.o]) st.stats[b.o].pt += n;
    ctx.emit({ t: 'boom', x: b.x, y: b.y, c: st.pal[b.c - 1], o: b.o });
    for (let j = 0; j < st.players.length; j++) if (st.code[j] !== b.c && !st.dead[j] && !(st.prot[j] > now) && dist(st.pos[j].x, st.pos[j].y, b.x, b.y) < BOMB_KILL + R) splat(st, j, b.o, now, ctx, 'bomb');
  }
  return any;
}
// Değişen hücreleri, bot konumlarını, yeni atışları ve isabetleri tek mesajda yay (her tik)
function flushW(st) {
  const w = { t: 'w', s: st.seq };
  if (st._chg.length) { st.seq++; w.s = st.seq; w.d = encDiff(st.grid, st._chg); for (const i of st._chg) st._mk[i] = 0; st._chg.length = 0; }
  const b = [];
  Object.keys(st.bot).forEach(k => { const i = +k; if (!st.dead[i] && (st.players[i].isBot || st.botCtl[i])) { const p = st.pos[i]; b.push([i, Math.round(p.x), Math.round(p.y), Math.round(p.a * 100), p.f ? 1 : 0]); } });
  if (b.length) w.b = b;
  if (st._shots.length) { w.sh = st._shots.map(s => [s.id, s.o, Math.round(s.x), Math.round(s.y), Math.round(s.a * 1000), s.big]); st._shots.length = 0; }
  if (st._hits.length) { w.x = st._hits.slice(); st._hits.length = 0; }
  w.k = st.ink.map(v => Math.round(v));
  if (!st._uiSynced && root && V) { st._uiSynced = true; applySnap(st.seq, encFull(st.grid)); }   // geri yüklemeden sonra kurucunun kendi ekranı
  uiW(w);
  fastOut(w);
  return w;
}
function finalCounts(st) {
  const { c, tot } = countGrid(st.grid), ncode = st.mode === 'takim' ? 2 : st.players.length;
  const pct = Array.from({ length: ncode }, (_, k) => Math.round(c[k + 1] / tot * 1000) / 10);
  const cnt = Array.from({ length: ncode }, (_, k) => c[k + 1]);
  const best = Math.max(...cnt), win = cnt.map((v, k) => (v === best && v > 0 ? k + 1 : 0)).filter(Boolean);
  return { pct, cnt, total: tot, win };
}
function startReveal(st, ctx) {
  st.shots = []; st.bombs = []; st.items = [];
  st.players.forEach((_, i) => { st.pos[i].f = 0; st.fq[i] = 0; });
  const fc = finalCounts(st);
  st.final = Object.assign(fc, { snap: encFull(st.grid), s: st.seq });
  setPhase(st, 'reveal', REVEAL_MS);
  ctx.emit({ t: 'reveal' }, '⏱ Süre doldu! Boyalar sayılıyor…', 'gold');
  ctx.sync();
}
function finish(st, ctx) {
  if (st.phase === 'over') return;
  setPhase(st, 'over', 0);
  const F = st.final || finalCounts(st), team = st.mode === 'takim';
  const pctOf = i => F.pct[st.code[i] - 1] || 0;
  const ranking = st.players.map((p, i) => ({ pi: i, score: Math.round(pctOf(i) * 10), pt: st.stats[i].pt,
    label: team ? `${TEAM[st.team[i]].short} %${pctOf(i).toFixed(1)} · ${st.stats[i].sp} şlap` : `%${pctOf(i).toFixed(1)} alan · ${st.stats[i].sp} şlap` }))
    .sort((a, b) => b.score - a.score || b.pt - a.pt).map(({ pi, score, label }) => ({ pi, score, label }));
  let title;
  if (team) title = F.win.length === 1 ? `${TEAM[F.win[0] - 1].name} kazandı! 🎉` : 'Berabere! İki takım eşit boyadı.';
  else title = F.win.length === 1 ? `${pname(st, F.win[0] - 1)} alanı kapladı! 🎨` : `Berabere: ${F.win.map(c => pname(st, c - 1)).join(' & ')}`;
  const note = `${MAPDEFS[st.mapId].name} · ${team ? 'Takım' : 'Herkes Tek'} · ${st.dur} sn. Puan = boyalı zeminin yüzdesi (×10). Şlap: rakibi boyama sayısı.`;
  ctx.emit({ t: 'over' }, `🏁 ${title}`, 'gold');
  ctx.sync();
  ctx.end({ title, ranking, note });
}

/* ---- botlar ---- */
function paintGoal(st, i, fM) {
  const my = st.code[i]; let best = -1, bs = -1e9;
  for (let t = 0; t < 46; t++) {
    const c = Math.floor(Math.random() * NN), dd = fM.d[c]; if (dd < 3 || dd > 24) continue;
    const gi = Math.floor(ncx(c) / CS), gj = Math.floor(ncy(c) / CS); let n = 0;
    for (let b = -4; b <= 4; b++) for (let a = -4; a <= 4; a++) {
      const x = gi + a, y = gj + b; if (x < 0 || y < 0 || x >= GW || y >= GH) continue;
      const v = st.grid[y * GW + x]; if (v !== BLK && v !== my) n += v ? 1.35 : 1;
    }
    const s = n - dd * 1.1 + Math.random() * 4;
    if (s > bs) { bs = s; best = c; }
  }
  return best;
}
function botPlan(st, i, b, now, nav, map) {
  const me = st.pos[i], mc = cellOf(nav, me.x, me.y);
  if (mc < 0) { b.wp = null; return; }
  const fM = bfs(nav, [mc]);
  // dövüş: görüş hattındaki en yakın rakip
  let tg = -1, td = 1e9;
  if (st.ink[i] >= 20) for (let j = 0; j < st.players.length; j++) {
    if (!isEnemy(st, i, j, now)) continue;
    const q = st.pos[j], d = dist(me.x, me.y, q.x, q.y);
    if (d < 470 && d < td && losShot(map, me.x, me.y, q.x, q.y)) { td = d; tg = j; }
  }
  if (tg >= 0) {
    if (b.tgt !== tg) b.seeAt = now;
    b.tgt = tg; b.mode = 'fight';
    const q = st.pos[tg];
    b.wp = td > 250 ? pathTo(fM, cellOf(nav, q.x, q.y)) : null;
    if (now > b.sideAt) { b.side = Math.random() < .5 ? -1 : 1; b.sideAt = now + rnd(700, 1500); }
    return;
  }
  b.tgt = -1;
  // güçlendirme
  if (st.items.length) {
    let best = null, bd = 1e9;
    for (const it of st.items) { const c = cellOf(nav, it.x, it.y); if (c < 0 || fM.d[c] < 0 || fM.d[c] > 16) continue; if (fM.d[c] < bd) { bd = fM.d[c]; best = { it, c }; } }
    if (best) { b.mode = 'item'; b.wp = pathTo(fM, best.c); b.wp.push([best.it.x, best.it.y]); return; }
  }
  // boya: boyanmamış / rakip boyalı bölgeye
  b.mode = 'paint';
  if (!b.goal || now > b.goalAt || dist(me.x, me.y, b.goal[0], b.goal[1]) < 36 || cellAt(st.grid, b.goal[0], b.goal[1]) === st.code[i]) {
    const c = paintGoal(st, i, fM);
    if (c >= 0) { b.goal = [ncx(c), ncy(c)]; b.goalAt = now + rnd(2500, 4200); }
  }
  b.wp = b.goal ? pathTo(fM, cellOf(nav, b.goal[0], b.goal[1])) : null;
}
function botSteer(st, i, b, p, nav, map, now) {
  if (b.jit != null && now < b.jitUntil) return [Math.cos(b.jit), Math.sin(b.jit)];
  if (b.mode === 'fight' && b.tgt >= 0 && !b.wp) {
    const q = st.pos[b.tgt], d = dist(p.x, p.y, q.x, q.y) || 1, ux = (q.x - p.x) / d, uy = (q.y - p.y) / d;
    const rad = clamp((d - 210) / 160, -1, 1);
    let dx = ux * rad - uy * b.side * .85, dy = uy * rad + ux * b.side * .85;
    const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
    if (!circleFree(map, p.x + dx * 34, p.y + dy * 34, R)) { b.side = -b.side; dx = ux * rad - uy * b.side * .85; dy = uy * rad + ux * b.side * .85; const m2 = Math.hypot(dx, dy) || 1; dx /= m2; dy /= m2; }
    return [dx, dy];
  }
  if (!b.wp || !b.wp.length) return [0, 0];
  while (b.wp.length > 1 && dist(p.x, p.y, b.wp[0][0], b.wp[0][1]) < 18) b.wp.shift();
  for (let k = Math.min(b.wp.length - 1, 8); k > 0; k--) if (losNav(nav, p.x, p.y, b.wp[k][0], b.wp[k][1])) { b.wp.splice(0, k); break; }
  const t = b.wp[0], dx = t[0] - p.x, dy = t[1] - p.y, d = Math.hypot(dx, dy);
  if (d < 8) { if (b.wp.length === 1) { b.wp = null; b.re = Math.min(b.re, now + 100); } return [0, 0]; }
  return [dx / d, dy / d];
}
function stepBots(st, dt, now) {
  const map = mapOf(st.mapId), nav = navOf(st.mapId);
  for (const k of Object.keys(st.bot)) {
    const i = +k, b = st.bot[k];
    if (!(st.players[i].isBot || st.botCtl[i])) continue;
    const p = st.pos[i];
    if (st.dead[i]) { b.vx = b.vy = 0; continue; }
    if (now >= b.re) { botPlan(st, i, b, now, nav, map); b.re = now + rnd(380, 650); }
    const [ix, iy] = botSteer(st, i, b, p, nav, map, now);
    const spd = SPEED * paintK(st.grid, p.x, p.y, st.code[i]) * (st.fx[i].spd > now ? HASTE_K : 1) * BOT_K;
    const body = { x: p.x, y: p.y, vx: b.vx, vy: b.vy }, n = Math.max(1, Math.ceil(dt / .034));
    for (let s = 0; s < n; s++) moveBody(map, body, ix, iy, spd, dt / n);
    b.vx = body.vx; b.vy = body.vy;
    rollSeg(st, i, p.x, p.y, body.x, body.y, now);
    const sp = Math.hypot(b.vx, b.vy), mv = Math.atan2(b.vy, b.vx);
    let aim = p.a, f = 0;
    if (b.mode === 'fight' && b.tgt >= 0 && isEnemy(st, i, b.tgt, now)) {
      const q = st.pos[b.tgt], d = dist(body.x, body.y, q.x, q.y);
      aim = Math.atan2(q.y - body.y, q.x - body.x) + b.aimJ + rnd(-.07, .07);
      if (d < SHOT_RANGE + 40 && now - b.seeAt > 280 && losShot(map, body.x, body.y, q.x, q.y)) f = 1;
    } else if (sp > 30) {
      const a2 = mv + Math.sin(now / 260 + i * 1.7) * .75, tv = cellAt(st.grid, body.x + Math.cos(a2) * 190, body.y + Math.sin(a2) * 190);
      if (st.ink[i] > 42 && tv !== BLK && tv !== st.code[i]) { aim = a2; f = 1; } else aim = lerpAng(aim, mv, .35);
    }
    if (f) fire(st, i, aim, now);
    st.pos[i] = { x: body.x, y: body.y, a: +aim.toFixed(3), f, m: sp > 25 ? 1 : 0, t: now };
    if (ix || iy) {
      if (now - b.sAt > 700) { if (dist(body.x, body.y, b.sx, b.sy) < 12) { b.re = 0; b.wp = null; b.goal = null; b.jit = rnd(0, TAU); b.jitUntil = now + 380; } b.sx = body.x; b.sy = body.y; b.sAt = now; }
    }
  }
}

/* ---- ana döngü (yöneten cihazda, 10/sn) ---- */
function tick(st, ctx) {
  const now = Date.now(), dt = clamp((now - st.lastTick) / 1000, 0, .25); st.lastTick = now;
  let dirty = false;
  if (st.phase === 'count') { if (now >= st.endsAt) { startPlay(st, ctx); dirty = true; } }
  else if (st.phase === 'play') {
    for (let i = 0; i < st.players.length; i++) if (st.dead[i] && now >= st.dead[i]) { respawn(st, i, now); dirty = true; }
    regen(st, dt, now);
    humanFire(st, now);
    stepBots(st, dt, now);
    stepShots(st, dt, now, ctx);
    if (bombTick(st, now, ctx)) dirty = true;
    if (spawnItems(st, now)) dirty = true;
    if (pickups(st, now, ctx)) dirty = true;
    flushW(st);
    if (now >= st.endsAt) { startReveal(st, ctx); return; }
    if (now - st.lastK >= SNAP_MS) { st.lastK = now; fastOut({ t: 'k', s: st.seq, d: encFull(st.grid) }); }
  } else if (st.phase === 'reveal') { if (now >= st.endsAt) { finish(st, ctx); return; } }
  if (st._dirty || dirty || now - st.lastSync >= 1000) { st._dirty = false; st.lastSync = now; ctx.sync(); }
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
    const n = players.length, mode = opts.mod === 'takim' ? 'takim' : 'ffa';
    const mapId = MAPDEFS[opts.harita] ? opts.harita : (opts.harita === 'rastgele' ? pickR(MAP_IDS) : 'sehir');
    const map = mapOf(mapId), now = Date.now();
    const team = mode === 'takim' ? balanceTeams(players) : players.map(() => -1);
    const st = {
      mode, mapId, dur: optNum(opts.sure, [60, 90, 120], 90), pu: opts.guc !== '0',
      players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })),
      online: players.map(() => true), team,
      code: players.map((_, i) => (mode === 'takim' ? team[i] + 1 : i + 1)),
      pal: mode === 'takim' ? TEAM.map(t => t.color) : players.map(p => p.color),
      phase: 'count', endsAt: 0, phaseDur: 1, playAt: 0,
      grid: Uint8Array.from(map.mask), cnt: new Array(10).fill(0), total: map.total, seq: 0, snap0: null,
      spawn: [], pos: [], life: Array(n).fill(0), dead: Array(n).fill(0), prot: Array(n).fill(0), hp: Array(n).fill(100), hitAt: Array(n).fill(0),
      ink: Array(n).fill(100), lastShot: Array(n).fill(0), fq: Array(n).fill(0), fc: Array(n).fill(0),
      fx: players.map(() => ({ spd: 0, big: 0 })), stats: players.map(() => ({ sp: 0, dn: 0, pt: 0, sh: 0 })),
      shots: [], sid: 0, items: [], iid: 0, nextItemAt: 0, bombs: [], bot: {}, botCtl: Array(n).fill(false),
      final: null, lastTick: now, lastSync: 0, lastK: 0, loopId: 0
    };
    st.cnt[0] = map.total;
    hostInit(st);
    const ti = [0, 0];
    st.spawn = players.map((_, i) => (mode === 'takim' ? map.teamSpawns[team[i]][ti[team[i]]++ % 4] : map.spawns[i % map.spawns.length]).slice());
    st.pos = st.spawn.map(s => ({ x: s[0], y: s[1], a: +Math.atan2(H / 2 - s[1], W / 2 - s[0]).toFixed(3), f: 0, m: 0, t: now }));
    st.spawn.forEach((s, i) => stamp(st, s[0], s[1], BASE_R, st.code[i]));
    for (const i of st._chg) st._mk[i] = 0; st._chg.length = 0;
    st.snap0 = { s: 0, d: encFull(st.grid) };
    players.forEach((p, i) => { if (p.isBot) st.bot[i] = newBot(); });
    setPhase(st, 'count', COUNT_MS);
    ctx.emit({ t: 'start' }, `🎨 Boya Savaşı · ${map.name} · ${mode === 'takim' ? 'Takım' : 'Herkes Tek'} · ${st.dur} sn`, 'gold');
    runLoop(st, ctx);
    return st;
  },
  action(st, pi, a, ctx) {
    // Gerçek zamanlı girdiler hızlı kanaldan gelir; güvenilir kanal yalnızca yedek konum içindir
    if (!a || typeof a.t !== 'string') return;
    if (a.t === 'pos') applyPos(st, pi, +a.x, +a.y, +a.a, a.f, +a.fc, a.l);
    void ctx;
  },
  view(st, viewer) {
    const n = st.players.length, me = Number.isInteger(viewer) && viewer >= 0 && viewer < n ? viewer : -1, now = Date.now();
    return {
      mode: st.mode, mapId: st.mapId, phase: st.phase, endsAt: st.endsAt, phaseDur: st.phaseDur, dur: st.dur, pu: st.pu, me, seq: st.seq,
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, online: st.online[i] !== false, team: st.team[i], code: st.code[i], bc: !!st.botCtl[i] })),
      pal: st.pal.slice(), pos: st.pos.map(p => [Math.round(p.x), Math.round(p.y), +(+p.a).toFixed(2)]),
      life: st.life.slice(), dead: st.dead.map(t => (t > now ? t : 0)), prot: st.prot.map(t => (t > now ? t : 0)),
      fx: st.fx.map(f => ({ spd: f.spd > now ? f.spd : 0, big: f.big > now ? f.big : 0 })), stats: st.stats.map(s => ({ sp: s.sp, dn: s.dn })),
      items: st.items.map(o => ({ id: o.id, k: o.k, x: o.x, y: o.y })), bombs: st.bombs.map(b => ({ x: b.x, y: b.y, at: b.at, c: b.c })),
      snap: st.phase === 'count' ? st.snap0 : null,
      final: st.phase === 'reveal' || st.phase === 'over' ? st.final : null
    };
  },
  turnOf() { return null; },
  skipTurn() { /* gerçek zamanlı: kopan oyuncuyu bilgisayar devralır (onPresence) */ },
  botAct() { /* botlar yöneten cihazdaki döngüde hareket eder */ },
  botDelay: 900,
  onPresence(st, pi, online, ctx) {
    st.online[pi] = online;
    if (st.players[pi].isBot || st.phase === 'over') return;
    if (!online && !st.botCtl[pi]) {
      st.botCtl[pi] = true; st.bot[pi] = newBot(); st.life[pi]++; st.fq[pi] = 0;
      ctx.emit({ t: 'ctl', pi, on: true }, `🤖 ${pname(st, pi)} için bilgisayar devraldı.`, 'gold');
    } else if (online && st.botCtl[pi]) {
      st.botCtl[pi] = false; delete st.bot[pi]; st.life[pi]++; st.fq[pi] = 0;
      ctx.emit({ t: 'ctl', pi, on: false }, `🎮 ${pname(st, pi)} yeniden kontrolde.`, 'good');
    }
    ctx.sync();
  },
  resume(st, ctx) {
    if (st.phase === 'over') return;
    hostInit(st);
    const now = Date.now(); st.lastTick = now; st.pos.forEach(p => { p.t = now; });
    runLoop(st, ctx);
  },
  serialize(st) { const o = {}; for (const k of Object.keys(st)) if (k[0] !== '_') o[k] = st[k]; o.grid = encFull(st.grid); return o; },
  deserialize(o) { const st = Object.assign({}, o), g = new Uint8Array(GN); decFull(o.grid, g); st.grid = g; hostInit(st); return st; }
};

/* ------------------------------------------------------------------ ARAYÜZ (her cihaz) */
let root = null, ui = null, V = null;
let cv = null, cg = null, stageEl = null, miniCv = null, joyL = null, joyR = null;
let scene = null, cam = { x: 0, y: 0, s: .7 }, sw = 300, sh = 300, dpr = 1, snapCam = true, shake = { a: 0, t: 0 };
let G = new Uint8Array(GN), snapSeq = -1, gridSeq = 0, diffBuf = [], preds = [], paintDirty = true, paintAt = 0;
let paintCv = null, paintCtx = null, paintImg = null, paintU32 = null, smallCv = null, smallCtx = null, smallImg = null, smallU32 = null;
const s1 = new Uint8Array(GN), s2 = new Uint8Array(GN * 4), s4 = new Uint8Array(GN * 16);
let palB = [], palD = [], palL = [], palKey = '';
let av = null, rp = [], myLife = -1, meSplat = false, deadInfo = [], shotsV = [], pendingOwn = [], parts = [], anims = [];
let keys = new Set(), mouse = { x: 0, y: 0, in: false, down: false, at: 0 }, stickL = { on: false, id: null, bx: 0, by: 0, dx: 0, dy: 0 }, stickR = { on: false, id: null, bx: 0, by: 0, dx: 0, dy: 0, t0: 0, moved: false };
let ink = 100, lastFire = 0, fireCount = 0, burstUntil = 0, aimA = 0, lastSend = 0, lastSent = null, lastF = 0, lastDrip = 0;
let raf = 0, lastT = 0, hudT = null, ro = null, popT = null, frameN = 0, chipKey = '', sideKey = '', seenKey = '', lastSec = -1, covAt = 0, cov = null, revealT0 = 0, revealStage = -1, layoutAt = 0;
const INTERP = 120, JR = 46, prof = { n: 0, np: 0, paint: 0, draw: 0, mini: 0 };
const pnow = () => performance.now();
const hostClock = () => (ui && ui.hostNow ? ui.hostNow() : Date.now());
const q = s => root && root.querySelector(s);
const isTouch = () => (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
const phoneW = () => innerWidth < 760;
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const myCode = () => (V && V.me >= 0 ? V.players[V.me].code : 0);
const colOfCode = c => (V && V.pal[c - 1]) || '#ffffff';
const bodyCol = i => (V.mode === 'takim' ? V.pal[V.players[i].code - 1] : V.players[i].color);
const codeName = c => (V.mode === 'takim' ? TEAM[c - 1].name : (V.players[c - 1] ? V.players[c - 1].name : '?'));
const snd = {
  ok(n, gap) { return Sound.ok && Sound.ok(n, gap); },
  shoot() { if (!this.ok('bya-shot', 70)) return; Sound.noise(.07, { freq: 1300, q: 1.4, gain: .14 }); Sound.tone(420, .06, { type: 'square', gain: .03, slide: 210 }); },
  splash(near) { if (!this.ok('bya-spl', 90)) return; Sound.noise(.12, { filter: 'lowpass', freq: 900, gain: near ? .22 : .08, decayPow: 2 }); },
  hit() { if (!this.ok('bya-hit', 120)) return; Sound.tone(300, .12, { type: 'triangle', gain: .16, slide: 160 }); Sound.noise(.1, { freq: 700, q: 1, gain: .2 }); },
  splat() { if (!this.ok('bya-splat', 200)) return; Sound.noise(.4, { filter: 'lowpass', freq: 650, gain: .55, decayPow: 1.6 }); Sound.tone(520, .32, { type: 'sine', gain: .18, slide: 90 }); Sound.tone(980, .12, { type: 'triangle', gain: .08, when: .05, slide: 300 }); },
  boom() { if (!this.ok('bya-boom', 200)) return; Sound.noise(.7, { filter: 'lowpass', freq: 420, gain: .7, decayPow: 2 }); Sound.tone(140, .45, { type: 'sawtooth', gain: .1, slide: 45 }); },
  respawn() { if (!this.ok('bya-resp', 300)) return; [523, 784, 1047].forEach((f, i) => Sound.tone(f, .14, { type: 'triangle', gain: .14, when: i * .07 })); },
  drum() { if (!this.ok('bya-drum', 1000)) return; for (let i = 0; i < 22; i++) Sound.noise(.06, { filter: 'lowpass', freq: 500 + i * 40, gain: .18 + i * .015, when: i * .11, decayPow: 2 }); },
  empty() { if (!this.ok('bya-empty', 500)) return; Sound.tone(200, .08, { type: 'square', gain: .05 }); Sound.tone(150, .1, { type: 'square', gain: .05, when: .08 }); }
};

/* ---- sahne: zemin ve engel katmanları (bir kez çizilir) ---- */
function drawBasePads(g, map) {
  map.spawns.forEach(([x, y]) => {
    g.save(); g.globalAlpha = .55; D.circle(g, x, y, 40, null, '#ffffff', 3); g.setLineDash([8, 8]); D.circle(g, x, y, 52, null, 'rgba(255,255,255,.7)', 2); g.restore();
  });
}
const FLOORS = {
  sehir(g, r) {
    g.fillStyle = '#5f5a78'; g.fillRect(0, 0, W, H);
    const cols = ['#6b6686', '#656080', '#716c8c', '#625d7c'];
    for (let y = 0; y < H; y += 40) for (let x = (y / 40) % 2 ? -20 : 0; x < W; x += 40) D.rr(g, x + 2, y + 2, 36, 36, 6, cols[Math.floor(r() * 4)]);
    for (let k = 0; k < 2; k++) { g.strokeStyle = k ? 'rgba(255,225,74,.22)' : 'rgba(255,255,255,.14)'; g.lineWidth = k ? 8 : 16; g.beginPath(); g.arc(720, 480, k ? 196 : 150, 0, TAU); g.stroke(); }
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; g.save(); g.translate(720 + Math.cos(a) * 172, 480 + Math.sin(a) * 172); g.rotate(a); D.rr(g, -10, -6, 20, 12, 3, i % 2 ? '#857fa3' : '#7a7498'); g.restore(); }
    // yaya geçidi şeritleri (simetrik)
    [[200, 900], [1240, 60]].forEach(([x, y]) => { for (let k = 0; k < 6; k++) D.rr(g, x - 70 + k * 24, y - 18, 14, 36, 3, 'rgba(255,255,255,.18)'); });
    [[360, 480], [1080, 480]].forEach(([x, y]) => { D.circle(g, x, y, 22, '#4f4a66', '#3d3852', 3); for (let k = -1; k <= 1; k++) D.rr(g, x - 14, y + k * 7 - 2, 28, 4, 2, '#3d3852'); });
  },
  oyuncak(g, r) {
    for (let y = 0; y < H; y += 60) for (let x = 0; x < W; x += 60) { g.fillStyle = ((x + y) / 60) % 2 ? '#7d73a6' : '#73699c'; g.fillRect(x, y, 60, 60); }
    D.ell(g, 720, 480, 340, 236, '#3f4766'); D.ell(g, 720, 480, 322, 220, '#4e5878');
    g.strokeStyle = '#d8cfa8'; g.lineWidth = 6; g.setLineDash([18, 12]); g.beginPath(); g.ellipse(720, 480, 296, 198, 0, 0, TAU); g.stroke(); g.setLineDash([]);
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; D.circle(g, 720 + Math.cos(a) * 250, 480 + Math.sin(a) * 160, 9, i % 2 ? '#d8cfa8' : '#8f97b5'); }
    // tren rayı (kapalı döngü)
    g.save(); g.lineJoin = 'round';
    rrPath(g, 150, 70, W - 300, H - 140, 120); g.strokeStyle = '#8a5a35'; g.lineWidth = 26; g.setLineDash([6, 12]); g.stroke(); g.setLineDash([]);
    rrPath(g, 141, 61, W - 282, H - 122, 129); g.strokeStyle = '#b8bdc9'; g.lineWidth = 3; g.stroke();
    rrPath(g, 159, 79, W - 318, H - 158, 111); g.stroke(); g.restore();
    const stars = []; for (let i = 0; i < 26; i++) stars.push([40 + r() * 640, 40 + r() * 880, r()]);
    stars.concat(stars.map(([x, y, s]) => [W - x, H - y, s])).forEach(([x, y, s]) => { g.fillStyle = s < .5 ? 'rgba(255,225,74,.35)' : 'rgba(255,255,255,.22)'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 3.5 : 8; k ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); });
  },
  sahil(g, r) {
    g.fillStyle = '#b89a6a'; g.fillRect(0, 0, W, H);
    const dots = []; for (let i = 0; i < 1400; i++) dots.push([r() * 720, r() * H, r()]);
    dots.concat(dots.map(([x, y, s]) => [W - x, H - y, s])).forEach(([x, y, s]) => D.circle(g, x, y, s * 1.8 + .6, s < .5 ? '#a98c5d' : '#c7aa78'));
    const gr = g.createLinearGradient(560, 0, 880, 0); gr.addColorStop(0, 'rgba(90,70,40,0)'); gr.addColorStop(.5, 'rgba(90,70,40,.28)'); gr.addColorStop(1, 'rgba(90,70,40,0)'); g.fillStyle = gr; g.fillRect(560, 0, 320, H);
    // dere
    const wg = g.createLinearGradient(676, 0, 764, 0); wg.addColorStop(0, '#2f8fd8'); wg.addColorStop(.5, '#49b3f0'); wg.addColorStop(1, '#2f8fd8');
    g.fillStyle = wg; g.fillRect(676, 0, 88, H);
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2;
    for (let y = 10; y < H; y += 26) { g.beginPath(); g.moveTo(684, y); g.quadraticCurveTo(700, y - 6, 716, y); g.quadraticCurveTo(732, y + 6, 748, y); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.7)'; for (let y = 0; y < H; y += 12) { D.circle(g, 676, y, 4, 'rgba(255,255,255,.55)'); D.circle(g, 764, y + 6, 4, 'rgba(255,255,255,.55)'); }
    // köprüler (üstünden yürünür ve boyanır)
    [[144, 240], [432, 528], [720, 816]].forEach(([y0, y1]) => {
      D.shadow(g, 720, y1 + 6, 70, 8, .3);
      g.fillStyle = '#8a6440'; g.fillRect(660, y0, 120, y1 - y0);
      for (let x = 662; x < 778; x += 14) D.rr(g, x, y0 + 2, 12, y1 - y0 - 4, 3, x % 28 ? '#a77a4f' : '#9a6f46');
      g.fillStyle = '#5e3f24'; g.fillRect(656, y0 - 4, 128, 6); g.fillRect(656, y1 - 2, 128, 6);
    });
    // havlular (simetrik)
    [[240, 470, '#ff5d6c', '#ffffff'], [430, 760, '#2bd96b', '#ffe14a']].forEach(([x, y, a, b]) => {
      [[x, y], [W - x - 70, H - y - 110]].forEach(([px, py]) => { g.save(); g.globalAlpha = .55; for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? a : b; g.fillRect(px, py + k * 18, 70, 18); } g.restore(); });
    });
    const sh = []; for (let i = 0; i < 18; i++) sh.push([60 + r() * 560, 60 + r() * 840, r() * TAU, r()]);
    sh.concat(sh.map(([x, y, a, s]) => [W - x, H - y, a + Math.PI, s])).forEach(([x, y, a, s]) => {
      g.save(); g.translate(x, y); g.rotate(a);
      if (s < .5) { g.fillStyle = '#ff9f80'; g.beginPath(); for (let k = 0; k < 10; k++) { const an = k * Math.PI / 5, rr = k % 2 ? 3 : 8; k ? g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : g.moveTo(rr, 0); } g.closePath(); g.fill(); }
      else { D.ell(g, 0, 0, 7, 5, '#fff3e0', 0, '#d9b98a', 1.2); g.strokeStyle = '#d9b98a'; g.lineWidth = 1; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(0, 4); g.lineTo(k * 4, -4); g.stroke(); } }
      g.restore();
    });
  }
};
const BORDER = { sehir: ['#3a3552', '#4d4769', '#26223a'], oyuncak: ['#7a4e2d', '#9b6a40', '#4e2f17'], sahil: ['#c9b07c', '#e2cc98', '#8a7148'] };
function drawBorder(g, id) {
  const [base, top, dk] = BORDER[id] || BORDER.sehir;
  g.fillStyle = dk; g.fillRect(0, 0, W, B); g.fillRect(0, H - B, W, B); g.fillRect(0, 0, B, H); g.fillRect(W - B, 0, B, H);
  g.fillStyle = base; g.fillRect(3, 3, W - 6, B - 8); g.fillRect(3, H - B + 3, W - 6, B - 8); g.fillRect(3, 3, B - 8, H - 6); g.fillRect(W - B + 3, 3, B - 8, H - 6);
  g.fillStyle = top; g.fillRect(3, 3, W - 6, 5); g.fillRect(3, H - B + 3, W - 6, 4);
  if (id === 'sehir') { g.fillStyle = 'rgba(255,255,255,.08)'; for (let x = 0; x < W; x += 30) { g.fillRect(x, 6, 2, B - 12); g.fillRect(x + 15, H - B + 6, 2, B - 12); } }
  if (id === 'sahil') { for (let x = 10; x < W; x += 40) { D.circle(g, x, 12, 6, '#f6e6c0'); D.circle(g, x + 20, H - 12, 6, '#f6e6c0'); } }
  g.fillStyle = 'rgba(10,4,24,.25)'; g.fillRect(B, B, W - 2 * B, 8); g.fillRect(B, B, 8, H - 2 * B);
}
function drawObs(g, o, mid) {
  const x = o.x, y = o.y, s = o.s;
  if (o.k === 'r') D.rr(g, x + 6, y + 10, o.w, o.h, 10, 'rgba(20,8,40,.28)'); else if (s !== 'umbrella' && s !== 'palm' && s !== 'tree') D.circle(g, x + 5, y + 8, o.r, 'rgba(20,8,40,.28)');
  if (s === 'water') return;
  if (s === 'fountain') {
    D.circle(g, x, y, o.r, '#b7b1cd', '#4d4769', 4); D.circle(g, x, y, o.r - 12, '#3fa6e6');
    const gr = g.createRadialGradient(x - 20, y - 20, 5, x, y, o.r - 12); gr.addColorStop(0, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); D.circle(g, x, y, o.r - 12, gr);
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; D.circle(g, x + Math.cos(a) * (o.r - 6), y + Math.sin(a) * (o.r - 6), 4, '#d6d1e8'); }
    D.circle(g, x, y, 18, '#d6d1e8', '#4d4769', 3); D.circle(g, x, y, 8, '#8fd6ff');
  } else if (s === 'planter') {
    D.rr(g, x, y, o.w, o.h, 8, '#8a5a35', '#4e2f17', 3); D.rr(g, x + 6, y + 6, o.w - 12, o.h - 12, 6, '#5a3a1e');
    const rr = mulberry(x * 3 + y); for (let k = 0; k < 9; k++) D.circle(g, x + 10 + rr() * (o.w - 20), y + 10 + rr() * (o.h - 20), 9 + rr() * 5, rr() < .5 ? '#2f8a3a' : '#45a843');
    for (let k = 0; k < 6; k++) D.circle(g, x + 10 + rr() * (o.w - 20), y + 10 + rr() * (o.h - 20), 3, rr() < .5 ? '#ff8fc8' : '#fff27a');
  } else if (s === 'kiosk') {
    D.rr(g, x, y, o.w, o.h, 8, '#fff3d6', '#5b3a2a', 3);
    const n = 7, sw0 = o.w / n; g.save(); rrPath(g, x, y, o.w, o.h * .62, 8); g.clip();
    for (let k = 0; k < n; k++) { g.fillStyle = k % 2 ? '#ffffff' : (o.c2 ? '#2f7bff' : '#ff4f6d'); g.fillRect(x + k * sw0, y, sw0, o.h * .62); }
    g.restore();
    for (let k = 0; k < n; k++) D.circle(g, x + (k + .5) * sw0, y + o.h * .62, sw0 / 2, k % 2 ? '#ffffff' : (o.c2 ? '#2f7bff' : '#ff4f6d'));
    D.rr(g, x + 10, y + o.h - 16, o.w - 20, 10, 4, '#b5743f');
  } else if (s === 'lamp') {
    D.glow(g, x, y, 46, 'rgba(255,240,170,.35)'); D.circle(g, x, y, o.r, '#3a3552', '#1d1930', 3); D.circle(g, x, y, o.r * .55, '#fff6b0');
  } else if (s === 'bench') {
    for (let k = 0; k < 3; k++) D.rr(g, x, y + k * (o.h / 3), o.w, o.h / 3 - 2, 3, k % 2 ? '#c98a4f' : '#b5743f', '#6e3f1a', 1.5);
  } else if (s === 'bin') {
    D.circle(g, x, y, o.r, '#2bd96b', '#13753a', 3); D.circle(g, x, y, o.r * .62, '#1f9e50'); D.rr(g, x - 6, y - 2, 12, 4, 2, '#13753a');
  } else if (s === 'tree') {
    D.circle(g, x + 6, y + 10, o.r + 12, 'rgba(20,8,40,.25)');
    D.circle(g, x, y, o.r + 12, '#2f8a3a'); D.circle(g, x - 6, y - 6, o.r + 2, '#45a843'); D.circle(g, x - 10, y - 10, o.r * .5, '#6cc957');
    for (let k = 0; k < 5; k++) { const a = k * 1.3; D.circle(g, x + Math.cos(a) * 18, y + Math.sin(a) * 16, 3.5, '#ff5d6c'); }
  } else if (s === 'block') {
    const c = o.col || '#ff5d6c'; D.rr(g, x, y, o.w, o.h, 8, c, shade(c, -.4), 3); D.rr(g, x + 7, y + 7, o.w - 14, o.h - 14, 6, shade(c, .25));
    D.text(g, o.rot ? (o.ch === 'A' ? 'C' : 'D') : o.ch, x + o.w / 2, y + o.h / 2 + 2, 30, '#ffffff', shade(c, -.45));
  } else if (s === 'blocks') {
    const cols = ['#ff5d6c', '#ffe14a', '#2bd96b', '#5aa2ff', '#b98bff'], n = 4, hh = o.h / n;
    for (let k = 0; k < n; k++) { const c = cols[(k + (o.rot ? 2 : 0) + (y > 480 ? 1 : 0)) % cols.length]; D.rr(g, x, y + k * hh, o.w, hh - 2, 6, c, shade(c, -.4), 2.5); D.circle(g, x + o.w / 2, y + k * hh + hh / 2 - 1, 7, shade(c, .3)); }
  } else if (s === 'ball') {
    const cols = ['#ff5d6c', '#ffffff', '#5aa2ff', '#ffe14a', '#ffffff', '#2bd96b'];
    for (let k = 0; k < 6; k++) { g.fillStyle = cols[k]; g.beginPath(); g.moveTo(x, y); g.arc(x, y, o.r, k / 6 * TAU, (k + 1) / 6 * TAU); g.closePath(); g.fill(); }
    D.circle(g, x, y, o.r, null, '#2d2340', 3); D.circle(g, x, y, 7, '#ffffff', '#2d2340', 2); D.ell(g, x - o.r * .35, y - o.r * .4, o.r * .25, o.r * .14, 'rgba(255,255,255,.55)', -.6);
  } else if (s === 'toybox') {
    D.rr(g, x, y, o.w, o.h, 8, '#ffb627', '#8a4a00', 3); D.rr(g, x, y + o.h * .38, o.w, 10, 2, '#ff7a3d');
    g.fillStyle = '#ffffff'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 6 : 14; const px = x + o.w / 2 + Math.cos(a) * rr, py = y + o.h * .66 + Math.sin(a) * rr; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); g.fill();
  } else if (s === 'yoyo') {
    D.circle(g, x, y, o.r, '#ff4f6d', '#8a1a3a', 3); D.circle(g, x, y, o.r * .6, '#ff8fa3'); D.circle(g, x, y, 6, '#ffffff', '#8a1a3a', 2);
    g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 40, y + 10, x + 50, y + 44); g.stroke();
  } else if (s === 'book') {
    const c = o.col || '#b98bff'; D.rr(g, x, y, o.w, o.h, 5, c, shade(c, -.45), 3); D.rr(g, x + o.w - 9, y + 4, 6, o.h - 8, 2, '#fff8e8'); D.rr(g, x + 6, y + o.h / 2 - 12, o.w - 18, 24, 3, shade(c, .35));
  } else if (s === 'castle') {
    D.rr(g, x, y, o.w, o.h, 6, '#e5c98c', '#9a7a44', 3);
    [[x - 6, y - 6], [x + o.w - 22, y - 6], [x - 6, y + o.h - 22], [x + o.w - 22, y + o.h - 22]].forEach(([px, py]) => D.rr(g, px, py, 28, 28, 5, '#f0d89c', '#9a7a44', 2.5));
    D.rr(g, x + o.w / 2 - 14, y + o.h / 2 - 14, 28, 28, 4, '#f6e2ad', '#9a7a44', 2);
    g.strokeStyle = '#5b3a7a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + o.w / 2, y + o.h / 2); g.lineTo(x + o.w / 2, y + o.h / 2 - 26); g.stroke();
    g.fillStyle = o.rot ? '#19e3d0' : '#ff3fa4'; g.beginPath(); g.moveTo(x + o.w / 2, y + o.h / 2 - 26); g.lineTo(x + o.w / 2 + 16, y + o.h / 2 - 21); g.lineTo(x + o.w / 2, y + o.h / 2 - 16); g.fill();
  } else if (s === 'palm') {
    D.circle(g, x + 8, y + 12, o.r + 26, 'rgba(20,8,40,.22)');
    D.circle(g, x, y, o.r * .55, '#8a5a35');
    for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + (o.rot ? .4 : 0); D.ell(g, x + Math.cos(a) * 26, y + Math.sin(a) * 26, 30, 10, k % 2 ? '#2f8a3a' : '#3fa04a', a); }
    D.circle(g, x - 5, y - 3, 6, '#6e4a2a'); D.circle(g, x + 5, y + 2, 6, '#6e4a2a'); D.circle(g, x + 1, y - 7, 5, '#7a5634');
  } else if (s === 'umbrella') {
    const c = o.col || '#ff5d6c'; D.circle(g, x + 8, y + 12, o.r + 14, 'rgba(20,8,40,.22)');
    for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#ffffff' : c; g.beginPath(); g.moveTo(x, y); g.arc(x, y, o.r + 10, k / 8 * TAU, (k + 1) / 8 * TAU); g.closePath(); g.fill(); }
    D.circle(g, x, y, o.r + 10, null, shade(c, -.4), 2.5); D.circle(g, x, y, 5, '#ffe14a', '#8a6a00', 2);
  } else if (s === 'rock') {
    g.fillStyle = '#7d7890'; g.beginPath(); const rr = mulberry(Math.round(x + y));
    for (let k = 0; k <= 9; k++) { const a = k / 9 * TAU, d = o.r * (.85 + rr() * .3); k ? g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d) : g.moveTo(x + d, y); } g.closePath(); g.fill();
    g.strokeStyle = '#4d4769'; g.lineWidth = 3; g.stroke(); D.ell(g, x - 7, y - 8, 9, 5, 'rgba(255,255,255,.3)', -.5);
  }
  void mid;
}
function ensureScene(id) {
  if (!MAPDEFS[id] || (scene && scene.id === id)) return;
  const map = mapOf(id), k = clamp((window.devicePixelRatio || 1) * .75, 1, 1.5);
  const mk = () => { const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k); const g = c.getContext('2d'); g.scale(k, k); return [c, g]; };
  const [fl, fg] = mk(); FLOORS[id](fg, mulberry(id.length * 101 + 7)); drawBasePads(fg, map);
  const [ob, og] = mk(); map.obs.forEach(o => drawObs(og, o)); drawBorder(og, id);
  const th = document.createElement('canvas'); th.width = 240; th.height = 160; const tg = th.getContext('2d'); tg.drawImage(fl, 0, 0, 240, 160); tg.drawImage(ob, 0, 0, 240, 160);
  scene = { id, map, floor: fl, obs: ob, thumb: th };
}

/* ---- boya katmanı: Scale2x ×2 ile yuvarlatılmış kenarlar, alt kenarda koyu çizgi ---- */
function scale2x(src, w, h, dst) {
  const w2 = w * 2;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const E = src[row + x], Bv = y > 0 ? src[row - w + x] : E, Hv = y < h - 1 ? src[row + w + x] : E, Dv = x > 0 ? src[row + x - 1] : E, Fv = x < w - 1 ? src[row + x + 1] : E;
      let e0 = E, e1 = E, e2 = E, e3 = E;
      if (Bv !== Hv && Dv !== Fv) { if (Dv === Bv) e0 = Dv; if (Bv === Fv) e1 = Fv; if (Dv === Hv) e2 = Dv; if (Hv === Fv) e3 = Fv; }
      const o = (2 * y) * w2 + 2 * x; dst[o] = e0; dst[o + 1] = e1; dst[o + w2] = e2; dst[o + w2 + 1] = e3;
    }
  }
}
const pack = (r, g, b, a) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
function ensurePal() {
  const key = V ? V.pal.join(',') : ''; if (key === palKey) return; palKey = key;
  palB = [0]; palD = [0]; palL = [0];
  (V ? V.pal : []).forEach(c => { const [r, g, b] = hex2rgb(c), [r2, g2, b2] = hex2rgb(shade(c, -.38)), [r3, g3, b3] = hex2rgb(shade(c, .35)); palB.push(pack(r, g, b, 242)); palD.push(pack(r2, g2, b2, 250)); palL.push(pack(r3, g3, b3, 246)); });
  paintDirty = true;
}
function renderPaint() {
  if (!paintCtx) return;
  ensurePal();
  for (let i = 0; i < GN; i++) { const v = G[i]; s1[i] = v === BLK || v >= palB.length ? 0 : v; }
  scale2x(s1, GW, GH, s2); scale2x(s2, GW * 2, GH * 2, s4);
  const w4 = GW * 4, h4 = GH * 4, px = paintU32;
  for (let y = 0; y < h4; y++) {
    const row = y * w4;
    for (let x = 0; x < w4; x++) {
      const o = row + x, v = s4[o];
      if (!v) { px[o] = 0; continue; }
      const b1 = y < h4 - 1 ? s4[o + w4] : v, b2 = y < h4 - 2 ? s4[o + 2 * w4] : v, a1 = y > 0 ? s4[o - w4] : v;
      px[o] = (b1 !== v || b2 !== v) ? palD[v] : a1 !== v ? palL[v] : palB[v];
    }
  }
  paintCtx.putImageData(paintImg, 0, 0);
  for (let i = 0; i < GN; i++) { const v = s1[i]; smallU32[i] = v ? palB[v] : 0; }
  smallCtx.putImageData(smallImg, 0, 0);
  paintDirty = false;
}
function initPaintCanvases() {
  paintCv = document.createElement('canvas'); paintCv.width = GW * 4; paintCv.height = GH * 4; paintCtx = paintCv.getContext('2d');
  paintImg = paintCtx.createImageData(GW * 4, GH * 4); paintU32 = new Uint32Array(paintImg.data.buffer);
  smallCv = document.createElement('canvas'); smallCv.width = GW; smallCv.height = GH; smallCtx = smallCv.getContext('2d');
  smallImg = smallCtx.createImageData(GW, GH); smallU32 = new Uint32Array(smallImg.data.buffer);
}
function resetGrid(mapId) { G = Uint8Array.from(mapOf(mapId).mask); snapSeq = -1; gridSeq = 0; diffBuf = []; preds = []; paintDirty = true; }
function applySnap(s, d) {
  if (s <= snapSeq) return;
  const tmp = new Uint8Array(GN); if (!decFull(d, tmp)) return;
  G = tmp; snapSeq = s;
  diffBuf.filter(e => e.s > s).sort((a, b) => a.s - b.s).forEach(e => applyRuns(G, e.r));
  const t = pnow(), code = myCode(); preds = preds.filter(p => t - p.t < 450);
  if (code) preds.forEach(p => { if (G[p.i] !== BLK) G[p.i] = code; });
  paintDirty = true;
}
// Yöneten cihazın tik mesajı (yerelde doğrudan, online'da hızlı kanaldan)
function uiW(w) {
  if (!root || !V) return;
  if (w.d) {
    const runs = decDiff(w.d);
    diffBuf.push({ s: w.s, r: runs }); if (diffBuf.length > 90) diffBuf.shift();
    if (w.s > snapSeq) { applyRuns(G, runs); paintDirty = true; }
    gridSeq = Math.max(gridSeq, w.s);
  }
  if (Array.isArray(w.b)) w.b.forEach(a => { if (Array.isArray(a) && V.players[a[0]] && (V.players[a[0]].isBot || V.players[a[0]].bc)) feed(a[0], +a[1], +a[2], a[3] / 100, a[4]); });
  if (Array.isArray(w.sh)) w.sh.forEach(a => {
    if (!Array.isArray(a)) return;
    const [id, o, x, y, am, big] = a;
    if (o === V.me && av) { const p = pendingOwn.shift(); if (p) p.hid = id; return; }
    spawnShotV({ hid: id, o, x, y, a: am / 1000, big, col: V.players[o] ? colOfCode(V.players[o].code) : '#fff' });
  });
  if (Array.isArray(w.x)) w.x.forEach(a => {
    if (!Array.isArray(a)) return;
    const [id, x, y, j] = a, k = shotsV.findIndex(s => s.hid === id);
    const col = k >= 0 ? shotsV[k].col : '#fff'; if (k >= 0) shotsV.splice(k, 1);
    splashParts(x, y, col, 8, 120); anims.push({ k: 'ring', x, y, col, start: pnow(), dur: 300, r: 30 });
    if (j === V.me) { snd.hit(); addShake(4); hitFlash = pnow(); }
  });
  if (Array.isArray(w.k) && V.me >= 0 && Number.isFinite(w.k[V.me]) && Math.abs(w.k[V.me] - ink) > 18) ink = w.k[V.me];
}
let hitFlash = 0;

/* ---- kamera ---- */
function camScale() {
  const fit = Math.min(sw / W, sh / H);
  if (!V || V.me < 0 || V.phase === 'reveal' || V.phase === 'over') return fit * .98;
  return phoneW() ? clamp(Math.min(sw / 560, sh / 720), .5, 1.05) : clamp(Math.max(fit * 1.08, .68), .5, 1);
}
function clampCam() {
  const vw = sw / cam.s, vh = sh / cam.s, m = 24;
  cam.x = vw >= W + 2 * m ? (W - vw) / 2 : clamp(cam.x, -m, W - vw + m);
  cam.y = vh >= H + 2 * m ? (H - vh) / 2 : clamp(cam.y, -m, H - vh + m);
}
function camFollow(dt) {
  const ts = camScale(); cam.s = snapCam ? ts : cam.s + (ts - cam.s) * (1 - Math.exp(-dt * 4));
  const fin = V.phase === 'reveal' || V.phase === 'over';
  const f = av && V.me >= 0 && !fin ? av : { x: W / 2, y: H / 2 };
  const lead = f === av ? 40 : 0;
  const tx = f.x + Math.cos(aimA) * lead - sw / 2 / cam.s, ty = f.y + Math.sin(aimA) * lead - sh / 2 / cam.s, k = snapCam ? 1 : 1 - Math.exp(-dt * 7);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; clampCam();
  if (fin && sh / cam.s > H * 1.35) cam.y = -14 / cam.s;   // dar ekranda harita üstte, sonuç kartı altta
  snapCam = false;
}
const toScreen = (x, y) => [(x - cam.x) * cam.s, (y - cam.y) * cam.s];
const toWorld = (sx, sy) => [sx / cam.s + cam.x, sy / cam.s + cam.y];
function toClient(x, y) { const r = cv.getBoundingClientRect(), s = toScreen(x, y); return [r.left + s[0], r.top + s[1]]; }
function addShake(a) { shake.a = Math.max(shake.a, a); shake.t = pnow(); }
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
  const h = ph ? clamp(innerHeight - top - 10, 320, 1000) : clamp(innerHeight - top - 16, 460, 760);
  if (Math.abs(stageEl.offsetHeight - h) > 2) stageEl.style.height = Math.round(h) + 'px';
}

/* ---- uzaktaki oyuncular ---- */
function mkRemote(p) { return { buf: [], x: p[0], y: p[1], a: p[2] || 0, f: 0, walk: 0, ph: 0, at: 0, p0: null, vx: 0, vy: 0, life: -1 }; }
function feed(i, x, y, a, f) {
  if (!V || !root || !V.players[i] || (i === V.me && av)) return;
  if (V.phase !== 'play' || isDead(i)) return;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const t = pnow(); let r = rp[i]; if (!r) r = rp[i] = mkRemote(V.pos[i]);
  const last = r.buf[r.buf.length - 1];
  if (last && dist(last.x, last.y, x, y) > MAXV * Math.max(.1, (t - last.t) / 1000) * 1.3 + 120) { r.buf = []; r.p0 = null; r.x = x; r.y = y; }
  r.buf.push({ t, x, y, a: Number.isFinite(a) ? a : r.a }); if (r.buf.length > 14) r.buf.shift();
  r.at = t; r.f = f ? 1 : 0;
}
function onFast(m) {
  if (!m || !V) return;
  if (m.t === 'p') {
    if (ui && ui.isHost) hostPosIn(m.seat, m, m.id);
    if (V.players[m.seat] && !V.players[m.seat].bc && m.l === V.life[m.seat]) feed(m.seat, +m.x, +m.y, +m.a, m.f);
  } else if (ui && ui.isHost) return;
  else if (m.t === 'w') uiW(m);
  else if (m.t === 'k' && Number.isFinite(m.s) && typeof m.d === 'string' && V.phase === 'play') applySnap(m.s, m.d);
}
const isDead = i => !!(V && ((V.dead[i] && V.dead[i] > hostClock() - 400) || (deadInfo[i] && deadInfo[i].life === V.life[i])));
function stepRemotes(dt, t) {
  const rt = t - INTERP;
  V.players.forEach((_, i) => {
    if (i === V.me && av) return;
    let r = rp[i]; if (!r) r = rp[i] = mkRemote(V.pos[i]);
    if (r.life !== V.life[i]) { r.life = V.life[i]; r.x = V.pos[i][0]; r.y = V.pos[i][1]; r.buf = []; r.p0 = null; }
    const ox = r.x, oy = r.y, b = r.buf;
    let tx = r.x, ty = r.y, ta = r.a;
    if (V.phase !== 'play' || isDead(i)) { if (V.phase === 'count') { tx = V.pos[i][0]; ty = V.pos[i][1]; ta = V.pos[i][2]; } }
    else if (!b.length || t - r.at > 1500) { tx = V.pos[i][0]; ty = V.pos[i][1]; ta = V.pos[i][2]; }
    else {
      while (b.length >= 2 && b[1].t <= rt) r.p0 = b.shift();
      const a = b[0];
      if (b.length >= 2 && rt > a.t) { const c = b[1], u = (rt - a.t) / Math.max(1, c.t - a.t); tx = a.x + (c.x - a.x) * u; ty = a.y + (c.y - a.y) * u; ta = lerpAng(a.a, c.a, u); }
      else if (rt > a.t && r.p0) { const p0 = r.p0, dtt = Math.max(1, a.t - p0.t), ext = Math.min(rt - a.t, 110); tx = a.x + (a.x - p0.x) / dtt * ext; ty = a.y + (a.y - p0.y) / dtt * ext; ta = a.a; }
      else { tx = a.x; ty = a.y; ta = a.a; }
    }
    const k = 1 - Math.exp(-dt * 22);
    r.x += (tx - r.x) * k; r.y += (ty - r.y) * k; r.a = lerpAng(r.a, ta, Math.min(1, dt * 14));
    const sp = Math.hypot(r.x - ox, r.y - oy) / Math.max(dt, 1e-3);
    r.vx = (r.x - ox) / Math.max(dt, 1e-3); r.vy = (r.y - oy) / Math.max(dt, 1e-3);
    r.walk = clamp(sp / 150, 0, 1); r.ph += sp * dt / 13;
    if (sp > 60 && V.phase === 'play') rollDrops(i, r.x, r.y, r.vx, r.vy, t);
  });
}

/* ---- yerel oyuncu ---- */
function autoTarget(x, y) {
  if (!V) return null; const code = myCode(), map = mapOf(V.mapId), now = hostClock(); let best = null, bd = SHOT_RANGE + 70;
  V.players.forEach((p, j) => {
    if (j === V.me || p.code === code || isDead(j) || V.prot[j] > now) return;
    const o = posOf(j), d = dist(x, y, o.x, o.y); if (d < bd && losShot(map, x, y, o.x, o.y)) { bd = d; best = o; }
  });
  return best;
}
function stepMe(dt, t) {
  if (!av || !V || V.me < 0) return;
  const me = V.me, map = mapOf(V.mapId), now = hostClock(), code = myCode(), f = V.fx[me] || {};
  const alive = V.phase === 'play' && !meSplat && !(V.dead[me] > now);
  if (!alive) { av.vx = av.vy = 0; av.walk = Math.max(0, av.walk - dt * 6); return; }
  let ix = 0, iy = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) ix -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) ix += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) iy -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) iy += 1;
  if (stickL.on) { ix = stickL.dx; iy = stickL.dy; }
  const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
  const spd = SPEED * paintK(G, av.x, av.y, code) * (f.spd > now ? HASTE_K : 1);
  const ox = av.x, oy = av.y, n = Math.max(1, Math.ceil(dt / .034));
  for (let k = 0; k < n; k++) moveBody(map, av, ix, iy, spd, dt / n);
  const sp = Math.hypot(av.vx, av.vy);
  if (sp > 20) av.h = lerpAng(av.h, Math.atan2(av.vy, av.vx), Math.min(1, dt * 14));
  av.walk = clamp(sp / 150, 0, 1); av.ph += sp * dt / 13;
  // tahmini boya (yerel): altımızı hemen boya, yöneten cihazın farkı gelince uzlaş
  const moved = dist(ox, oy, av.x, av.y);
  if (moved > 1 && code) {
    const r = f.big > now ? BIG_ROLL_R : ROLL_R, steps = Math.max(1, Math.ceil(moved / 10));
    for (let k = 1; k <= steps; k++) stampGrid(G, ox + (av.x - ox) * k / steps, oy + (av.y - oy) * k / steps, r, code, (i, v) => { G[i] = v; preds.push({ i, t }); paintDirty = true; });
    if (preds.length > 1500) preds.splice(0, preds.length - 1500);
  }
  if (sp > 60) rollDrops(me, av.x, av.y, av.vx, av.vy, t);
  // nişan
  let firing = false;
  const mouseAim = !isTouch() && mouse.in && t - mouse.at < 4000;
  if (stickR.on && Math.hypot(stickR.dx, stickR.dy) > .3) { aimA = Math.atan2(stickR.dy, stickR.dx); firing = true; }
  else if (mouseAim) { const [wx, wy] = toWorld(mouse.x, mouse.y); aimA = Math.atan2(wy - av.y, wx - av.x); firing = mouse.down; }
  else if (sp > 20) aimA = lerpAng(aimA, av.h, Math.min(1, dt * 10));
  if (keys.has('Space') || burstUntil > t) { const tg = autoTarget(av.x, av.y); if (tg) aimA = Math.atan2(tg.y - av.y, tg.x - av.x); firing = true; }
  // boya tankı ve atış
  if (t - lastFire > INK_IDLE_MS) ink = Math.min(100, ink + dt * (cellAt(G, av.x, av.y) === code ? INK_OWN : INK_REFILL));
  if (firing && t - lastFire >= FIRE_MS) {
    if (ink >= INK_COST) {
      lastFire = t; ink -= INK_COST; fireCount++;
      const big = f.big > now ? 1 : 0, s = spawnShotV({ o: me, x: av.x + Math.cos(aimA) * (R + 4), y: av.y + Math.sin(aimA) * (R + 4), a: aimA, big, col: colOfCode(code), own: true });
      pendingOwn.push(s); if (pendingOwn.length > 8) pendingOwn.shift();
      snd.shoot(); recoil = t;
      sendPos(t, true);
    } else if (t - lastFire > 600) { lastFire = t - FIRE_MS + 300; snd.empty(); toastLow(); }
  }
  av.f = firing ? 1 : 0;
  if (t - lastSend > 95 && (!lastSent || dist(lastSent[0], lastSent[1], av.x, av.y) > 1 || Math.abs(lastSent[2] - aimA) > .06 || lastF !== av.f || t - lastSend > 450)) sendPos(t);
}
let recoil = 0, lowToastAt = 0;
function toastLow() { if (pnow() - lowToastAt < 2500) return; lowToastAt = pnow(); pop('BOYA BİTTİ!', 'bad'); }
function sendPos(t, force) {
  if (!av || !ui || !V || V.me < 0) return;
  if (!force && t - lastSend < 60) return;
  lastSend = t || pnow(); lastSent = [av.x, av.y, aimA]; lastF = av.f;
  const m = { t: 'p', x: Math.round(av.x), y: Math.round(av.y), a: +aimA.toFixed(2), f: av.f ? 1 : 0, fc: fireCount, l: V.life[V.me] };
  if (ui.isHost) hostPosIn(V.me, m);
  if (ui.mode === 'online' && ui.fast) ui.fast(m);
}

/* ---- atış görselleri, parçacıklar, canlandırmalar ---- */
function spawnShotV(o) {
  const s = { hid: o.hid || 0, o: o.o, x: o.x, y: o.y, vx: Math.cos(o.a), vy: Math.sin(o.a), d: 0, max: o.big ? BIG_RANGE : SHOT_RANGE, big: o.big, col: o.col, own: !!o.own, born: pnow() };
  shotsV.push(s); if (shotsV.length > 140) shotsV.shift();
  return s;
}
function stepShotsV(dt, t) {
  if (!scene) return;
  const map = scene.map;
  for (let k = shotsV.length - 1; k >= 0; k--) {
    const s = shotsV[k]; let travel = SHOT_V * dt, done = false;
    while (travel > 1e-6 && !done) {
      const step = Math.min(12, travel, s.max - s.d); travel -= step;
      const nx = s.x + s.vx * step, ny = s.y + s.vy * step;
      if (shotBlocked(map, nx, ny)) { done = true; break; }
      s.x = nx; s.y = ny; s.d += step;
      if (s.d >= s.max - 1e-3) done = true;
    }
    if (Math.random() < dt * 9 && parts.length < 260) parts.push({ x: s.x, y: s.y, vx: rnd(-10, 10), vy: rnd(-10, 10), z: 6, vz: 0, life: .5, max: .5, r: rnd(2, 3.5), c: s.col, k: 'drop' });
    if (done) {
      shotsV.splice(k, 1);
      splashParts(s.x, s.y, s.col, s.big ? 12 : 7, s.big ? 170 : 120);
      anims.push({ k: 'splash', x: s.x, y: s.y, col: s.col, r: s.big ? 30 : 20, start: t, dur: 420, seed: Math.floor(s.x + s.y) });
      if (av && dist(s.x, s.y, av.x, av.y) < 260) snd.splash(s.own);
    }
  }
}
function splashParts(x, y, col, n, sp) { for (let i = 0; i < n && parts.length < 300; i++) { const a = rnd(0, TAU), s = rnd(sp * .3, sp); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, z: rnd(4, 12), vz: rnd(60, 160), life: rnd(.4, .75), max: .75, r: rnd(2.5, 5), c: col, k: 'drop' }); } }
function rollDrops(i, x, y, vx, vy, t) {
  if ((rollAt[i] || 0) > t - 90 || parts.length > 240 || !V.players[i]) return; rollAt[i] = t;
  const s = Math.hypot(vx, vy) || 1, col = bodyCol(i);
  parts.push({ x: x - vx / s * 16 + rnd(-6, 6), y: y - vy / s * 16 + rnd(-6, 6), vx: -vx * .1 + rnd(-20, 20), vy: -vy * .1 + rnd(-20, 20), z: 4, vz: rnd(40, 90), life: .45, max: .45, r: rnd(2.5, 4), c: col, k: 'drop' });
}
let rollAt = {};
function stepParts(dt) {
  for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .9; p.vy *= .9; if (p.k === 'drop') { p.vz -= 520 * dt; p.z = Math.max(0, p.z + p.vz * dt); } }
  parts = parts.filter(p => p.life > 0);
}
function pop(text, cls) {
  const p = q('.bya-pop'); if (!p) return;
  p.textContent = text; p.className = 'bya-pop'; void p.offsetWidth; p.className = 'bya-pop show ' + (cls || '');
  clearTimeout(popT); popT = setTimeout(() => { if (p) p.className = 'bya-pop'; }, 1200);
}
const posOf = i => (V && i === V.me && av ? av : rp[i]) || (V && V.pos[i] ? { x: V.pos[i][0], y: V.pos[i][1], a: V.pos[i][2] } : { x: W / 2, y: H / 2, a: 0 });

/* ---- karakter çizimi: yuvarlak, sevimli boyacı ---- */
function drawPainter(g, o) {
  const t = o.t, walk = o.walk || 0, bob = Math.abs(Math.sin(o.ph || 0)) * 3 * walk, c = o.col, dk = shade(c, -.42), lt = shade(c, .45);
  const ax = Math.cos(o.a || 0), ay = Math.sin(o.a || 0);
  g.save(); g.translate(o.x, o.y); g.globalAlpha = o.alpha == null ? 1 : o.alpha;
  if (o.ring) { const a = .55 + .35 * Math.sin(t / 200); g.save(); g.globalAlpha *= a; D.ell(g, 0, 16, 30, 11, null, 0, o.ring, 3); g.restore(); }
  D.shadow(g, 0, 17, 21 - bob * .4, 7, .3);
  const s1 = Math.sin(o.ph || 0) * 4 * walk; D.ell(g, -8, 16 + s1 * .5, 6.5, 4.5, dk); D.ell(g, 8, 16 - s1 * .5, 6.5, 4.5, dk);
  g.translate(0, -bob);
  // tank (sırtta, nişanın tersinde)
  const bx = -ax * 17, by = -ay * 13 - 4;
  D.rr(g, bx - 8, by - 12, 16, 24, 7, '#e9e4f5', '#2d2340', 2);
  if (o.ink != null) { const h = 18 * clamp(o.ink / 100, 0, 1); D.rr(g, bx - 5, by + 9 - h, 10, h, 4, c); }
  else D.rr(g, bx - 5, by - 6, 10, 15, 4, c);
  // gövde
  const gr = g.createRadialGradient(-7, -9, 3, 0, 0, R + 2); gr.addColorStop(0, lt); gr.addColorStop(.6, c); gr.addColorStop(1, shade(c, -.15));
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fillStyle = gr; g.fill(); g.lineWidth = 2.5; g.strokeStyle = dk; g.stroke();
  // kafa üstü boya damlası tutam
  g.fillStyle = c; g.beginPath(); g.moveTo(-6, -R + 3); g.quadraticCurveTo(0, -R - 14, 7, -R + 2); g.closePath(); g.fill(); g.stroke();
  if (o.band) { g.save(); g.beginPath(); g.arc(0, 0, R - 1, Math.PI * 1.08, Math.PI * 1.92); g.strokeStyle = o.band; g.lineWidth = 5; g.stroke(); g.restore(); }
  // yüz
  const ex = ax * 5, ey = ay * 3 - 2, blink = Math.sin(t / 900 + o.seed) > .985;
  [-1, 1].forEach(sd => {
    const x = sd * 7 + ex; D.ell(g, x, ey - 1, 5, 6, '#ffffff');
    if (blink) { g.strokeStyle = '#2d2340'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 3, ey); g.lineTo(x + 3, ey); g.stroke(); }
    else { D.circle(g, x + ax * 1.6, ey + ay * 1.6, 2.8, '#2d2340'); D.circle(g, x + ax * 1.6 - 1, ey + ay * 1.6 - 1.2, 1, '#ffffff'); }
  });
  D.ell(g, -12 + ex, 6 + ey, 4, 2.4, 'rgba(255,120,160,.55)'); D.ell(g, 12 + ex, 6 + ey, 4, 2.4, 'rgba(255,120,160,.55)');
  g.strokeStyle = '#2d2340'; g.lineWidth = 1.8; g.beginPath(); g.arc(ex, 5 + ey, 4, .2, Math.PI - .2); g.stroke();
  // boya tabancası (nişan yönünde)
  const rec = o.recoil ? clamp(1 - (t - o.recoil) / 120, 0, 1) * 4 : 0;
  g.save(); g.rotate(o.a || 0); g.translate(-rec, 0);
  D.rr(g, R - 8, -6, 24, 12, 5, '#3a3552', '#1d1930', 2); D.rr(g, R + 12, -4.5, 9, 9, 3, c, dk, 1.5); D.rr(g, R - 4, 4, 7, 9, 2, '#3a3552');
  if (o.big) D.rr(g, R - 2, -11, 16, 6, 3, '#ffe14a', '#8a6a00', 1.2);
  g.restore();
  if (o.prot) { const a = .5 + .25 * Math.sin(t / 120); D.circle(g, 0, -1, R + 9, `rgba(255,255,255,${.08 * a})`, `rgba(255,255,255,${a})`, 2); }
  if (o.speed && walk > .2) { g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2.5; g.lineCap = 'round'; const fx = Math.cos(o.h || 0), fy = Math.sin(o.h || 0); for (let i = -1; i <= 1; i++) { const sx = -fx * 28 - fy * i * 9, sy = -fy * 28 + fx * i * 9; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - fx * 14, sy - fy * 14); g.stroke(); } g.lineCap = 'butt'; }
  g.restore();
}
function drawGhost(g, x, y, col, t, since) {
  const u = clamp((t - since) / 2400, 0, 1);
  g.save();
  g.globalAlpha = .85 * (1 - u * .5); blob(g, x, y + 4, 26, col, Math.floor(x * 7 + y), 8);
  const gy = y - 10 - u * 46, wob = Math.sin(t / 160) * 3;
  g.globalAlpha = .9 - u * .5;
  g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.arc(x + wob, gy, 12, Math.PI, 0); g.lineTo(x + wob + 12, gy + 12);
  for (let k = 0; k < 3; k++) g.quadraticCurveTo(x + wob + 12 - k * 8 - 4, gy + (k % 2 ? 8 : 16), x + wob + 12 - (k + 1) * 8, gy + 12);
  g.closePath(); g.fill(); g.strokeStyle = col; g.lineWidth = 2; g.stroke();
  g.strokeStyle = '#2d2340'; g.lineWidth = 1.8;
  [-4, 4].forEach(dx => { g.beginPath(); g.moveTo(x + wob + dx - 2, gy - 3); g.lineTo(x + wob + dx + 2, gy + 1); g.moveTo(x + wob + dx + 2, gy - 3); g.lineTo(x + wob + dx - 2, gy + 1); g.stroke(); });
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
  const p = V.players[i], me = i === V.me;
  if (isDead(i)) { const di = deadInfo[i]; drawGhost(g, di ? di.x : pos.x, di ? di.y : pos.y, di ? di.c : '#ffffff', t, di ? di.t : t - 1000); return; }
  let alpha = 1; if (!p.online && !p.bc) alpha = .6;
  const col = bodyCol(i), f = V.fx[i] || {};
  drawPainter(g, { x: pos.x, y: pos.y, col, a: me ? aimA : pos.a, h: me ? av.h : Math.atan2(pos.vy || 0, pos.vx || 0), walk: pos.walk, ph: pos.ph, t, alpha, seed: i * 1.7,
    ring: V.phase === 'play' || V.phase === 'count' ? (me ? '#ffffff' : null) : null, band: V.mode === 'takim' ? p.color : null,
    ink: me ? ink : null, prot: V.prot[i] > now, big: f.big > now, speed: f.spd > now, recoil: me ? recoil : 0 });
  pill(g, pos.x, pos.y - R - 22, me ? 'SEN' : p.name + (p.bc ? ' 🤖' : ''), me ? '#ffffff' : col, '#1a0b3d');
}
function drawItemIcon(g, k, s) {
  g.save(); g.scale(s, s);
  if (k === 'bomba') {
    D.circle(g, 0, 2, 11, '#2d2340', '#120a1e', 2); blob(g, 3, 4, 6, '#ff3fa4', 3, 6); D.circle(g, -4, -2, 3, 'rgba(255,255,255,.4)');
    D.rr(g, -3, -12, 6, 5, 1.5, '#7d8794'); g.strokeStyle = '#c9a57a'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -12); g.quadraticCurveTo(6, -18, 9, -15); g.stroke(); D.circle(g, 9, -15, 3, '#ffe14a');
  } else if (k === 'hiz') {
    g.fillStyle = '#ffe14a'; g.strokeStyle = '#8a5a00'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(3, -14); g.lineTo(-8, 2); g.lineTo(-1, 2); g.lineTo(-4, 14); g.lineTo(8, -3); g.lineTo(1, -3); g.closePath(); g.fill(); g.stroke();
  } else {
    D.rr(g, -12, -11, 24, 11, 5, '#5aa2ff', '#1f3ca8', 1.8); D.rr(g, -12, -4, 24, 4, 2, '#ff3fa4');
    g.strokeStyle = '#3a3552'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(12, -6); g.lineTo(15, -6); g.lineTo(15, 3); g.lineTo(2, 3); g.lineTo(2, 13); g.stroke(); g.lineCap = 'butt';
  }
  g.restore();
}
function drawItems(g, t) {
  for (const it of V.items) {
    const b = Math.sin(t / 300 + it.id) * 3, col = ITEMS[it.k] ? ITEMS[it.k].col : '#fff';
    D.shadow(g, it.x, it.y + 16, 14, 5, .25);
    D.glow(g, it.x, it.y - 6 + b, 34, 'rgba(255,255,220,.4)');
    const gr = g.createRadialGradient(it.x - 6, it.y - 12 + b, 2, it.x, it.y - 6 + b, 20); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, shade(col, .2));
    D.circle(g, it.x, it.y - 6 + b, 19, gr, '#ffffff', 2.5);
    g.save(); g.translate(it.x, it.y - 6 + b); drawItemIcon(g, it.k, .95); g.restore();
  }
  for (const bm of V.bombs) {
    const left = clamp((bm.at - hostClock()) / BOMB_FUSE, 0, 1), pulse = 1 + Math.sin(t / 50) * .1;
    D.circle(g, bm.x, bm.y, BOMB_R * (1 - left * .5), null, colOfCode(bm.c), 3);
    g.save(); g.translate(bm.x, bm.y); g.scale(pulse * 1.3, pulse * 1.3); drawItemIcon(g, 'bomba', 1); g.restore();
  }
}
function drawShots(g) {
  for (const s of shotsV) {
    const r = s.big ? 9 : 6.5;
    D.circle(g, s.x - s.vx * 10, s.y - s.vy * 10, r * .55, s.col);
    D.circle(g, s.x - s.vx * 18, s.y - s.vy * 18, r * .35, s.col);
    D.circle(g, s.x, s.y, r, s.col, shade(s.col, -.4), 1.5); D.circle(g, s.x - r * .3, s.y - r * .35, r * .3, 'rgba(255,255,255,.7)');
  }
}
function drawParts(g) {
  for (const p of parts) {
    const a = clamp(p.life / p.max, 0, 1);
    g.globalAlpha = a; D.circle(g, p.x, p.y - (p.z || 0), p.r, p.c);
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
      D.text(g, a.txt, 0, 0, a.size || 26, a.col || '#ffe14a', a.stroke || '#2d0a3d'); g.restore();
    } else if (a.k === 'ring') { g.save(); g.globalAlpha = 1 - u; D.circle(g, a.x, a.y, 8 + u * (a.r || 60), null, a.col || '#fff', 4 * (1 - u) + 1); g.restore(); }
    else if (a.k === 'splash') { g.save(); g.globalAlpha = (1 - u) * .9; const s = u < .25 ? u / .25 : 1; blob(g, a.x, a.y, a.r * (.6 + s * .5), a.col, a.seed, 7); g.restore(); }
    else if (a.k === 'boom') {
      g.save(); g.globalAlpha = 1 - u; const s = u < .2 ? u / .2 : 1;
      blob(g, a.x, a.y, BOMB_R * s, a.col, a.seed, 12); D.circle(g, a.x, a.y, BOMB_R * (.8 + u * .6), null, '#ffffff', 5 * (1 - u) + 1); g.restore();
    }
  }
}
function drawAim(g, t) {
  if (!av || !V || V.me < 0 || V.phase !== 'play' || meSplat || isDead(V.me)) return;
  const f = V.fx[V.me] || {}, big = f.big > hostClock(), max = big ? BIG_RANGE : SHOT_RANGE, col = colOfCode(myCode()), map = scene.map;
  const cx = Math.cos(aimA), cy = Math.sin(aimA); let d = R + 8;
  while (d < max && !shotBlocked(map, av.x + cx * d, av.y + cy * d)) d += 8;
  g.save(); g.globalAlpha = av.f ? .75 : .38;
  for (let k = R + 16; k < d; k += 22) D.circle(g, av.x + cx * k, av.y + cy * k, 2.6, '#ffffff');
  D.circle(g, av.x + cx * d, av.y + cy * d, (big ? BIG_SPLASH_R : SPLASH_R) * .55, null, col, 2.5);
  g.restore(); void t;
}
function draw(t) {
  const g = cg, now = hostClock();
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#160833'; g.fillRect(0, 0, sw, sh);
  let shx = 0, shy = 0; if (shake.a > .1) { const k = Math.max(0, 1 - (t - shake.t) / 450); shx = rnd(-1, 1) * shake.a * k; shy = rnd(-1, 1) * shake.a * k; if (k <= 0) shake.a = 0; }
  g.save(); g.translate(shx, shy); g.scale(cam.s, cam.s); g.translate(-cam.x, -cam.y);
  const x0 = clamp(cam.x, 0, W), y0 = clamp(cam.y, 0, H), x1 = clamp(cam.x + sw / cam.s, 0, W), y1 = clamp(cam.y + sh / cam.s, 0, H);
  if (x1 > x0 && y1 > y0) {
    const k = scene.floor.width / W;
    g.drawImage(scene.floor, x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k, x0, y0, x1 - x0, y1 - y0);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'medium';
    const pk = paintCv.width / W; g.drawImage(paintCv, x0 * pk, y0 * pk, (x1 - x0) * pk, (y1 - y0) * pk, x0, y0, x1 - x0, y1 - y0);
    g.drawImage(scene.obs, x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k, x0, y0, x1 - x0, y1 - y0);
  }
  drawItems(g, t); drawAim(g, t);
  const list = [];
  V.players.forEach((_, i) => { const pos = i === V.me && av ? av : rp[i]; if (pos) list.push({ y: pos.y, i, pos }); });
  list.sort((a, b) => a.y - b.y);
  for (const it of list) drawPlayer(g, it.i, it.pos, t, now);
  drawShots(g); drawParts(g); drawAnims(g, t);
  g.restore();
  if (hitFlash && t - hitFlash < 260) { g.fillStyle = `rgba(255,255,255,${.25 * (1 - (t - hitFlash) / 260)})`; g.fillRect(0, 0, sw, sh); }
}
function drawMini() {
  if (!miniCv || !V || !scene) return;
  const g = miniCv.getContext('2d'), w = miniCv.width, h = miniCv.height, sx = w / W, sy = h / H;
  if (!w || !h) return;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
  g.drawImage(scene.thumb, 0, 0, w, h);
  g.imageSmoothingEnabled = false; g.drawImage(smallCv, 0, 0, w, h); g.imageSmoothingEnabled = true;
  if (V.me >= 0 && V.phase === 'play') { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = Math.max(1, dpr); g.strokeRect(cam.x * sx, cam.y * sy, sw / cam.s * sx, sh / cam.s * sy); }
  V.players.forEach((p, i) => {
    if (isDead(i)) return;
    const pos = posOf(i), me = i === V.me, r = (me ? 4.4 : 3.4) * dpr;
    D.circle(g, pos.x * sx, pos.y * sy, r, bodyCol(i), me ? '#ffffff' : '#1a0b3d', (me ? 2 : 1.2) * dpr);
  });
}
function frame() {
  raf = 0; if (!root || !cv) return;
  raf = requestAnimationFrame(frame);
  if (!V || !scene) return;
  const t = pnow(), dt = clamp((t - (lastT || t)) / 1000, 0, .25); lastT = t; frameN++;
  stepMe(dt, t); stepRemotes(dt, t); stepShotsV(dt, t); stepParts(dt); camFollow(dt);
  const t1 = pnow();
  if (paintDirty && t - paintAt > 85) { paintAt = t; renderPaint(); prof.paint += pnow() - t1; prof.np++; }
  const t2 = pnow(); draw(t); prof.draw += pnow() - t2;
  if (frameN % 4 === 0) { const t3 = pnow(); drawMini(); prof.mini += pnow() - t3; }
  prof.n++;
}

/* ---- HUD ---- */
function coverage() {
  const n = V.mode === 'takim' ? 2 : V.players.length, c = new Array(n + 1).fill(0); let tot = 0;
  for (let i = 0; i < GN; i++) { const v = G[i]; if (v === BLK) continue; tot++; if (v && v <= n) c[v]++; }
  return { pct: Array.from({ length: n }, (_, k) => (tot ? c[k + 1] / tot * 100 : 0)), tot };
}
function covGroups() {
  if (V.mode === 'takim') return [0, 1].map(k => ({ code: k + 1, name: TEAM[k].short, col: TEAM[k].color, members: V.players.map((p, i) => i).filter(i => V.players[i].code === k + 1) }));
  return V.players.map((p, i) => ({ code: i + 1, name: p.name, col: p.color, members: [i] }));
}
function renderCov(force) {
  if (!V) return;
  const t = pnow(); if (!force && t - covAt < 250) return; covAt = t;
  const F = (V.phase === 'reveal' || V.phase === 'over') && V.final;
  cov = F ? { pct: F.pct } : coverage();
  const bar = q('.bya-cov'); if (!bar) return;
  const gr = covGroups();
  if (bar.children.length !== gr.length + 1) bar.innerHTML = gr.map(o => `<i style="--c:${o.col}"><b></b></i>`).join('') + '<i class="rest"></i>';
  let used = 0;
  gr.forEach((o, k) => { const el = bar.children[k], p = cov.pct[o.code - 1] || 0; used += p; el.style.width = p + '%'; el.firstChild.textContent = p >= 7 ? `%${Math.round(p)}` : ''; });
  bar.lastChild.style.width = Math.max(0, 100 - used) + '%';
  root.querySelectorAll('.bya-pc[data-c]').forEach(el => { const s = `%${(cov.pct[+el.dataset.c - 1] || 0).toFixed(0)}`; if (el.textContent !== s) el.textContent = s; });
  const lead = q('.bya-board');
  if (lead && t - (lead._t || 0) > 900) {
    lead._t = t;
    const rows = gr.map(o => ({ o, p: cov.pct[o.code - 1] || 0 })).sort((a, b) => b.p - a.p);
    lead.innerHTML = `<span class="bya-lh">Canlı alan payı</span><ol class="bya-res">${rows.map(({ o, p }) => `<li style="--pc:${o.col}"><span class="av" style="--pc:${o.col}">${V.mode === 'takim' ? '★' : initial(o.name)}</span><span class="bya-rn"><b>${esc(V.mode === 'takim' ? TEAM[o.code - 1].name : o.name)}${o.members.includes(V.me) ? ' (sen)' : ''}</b><small>${o.members.map(i => esc(V.players[i].name) + ' · ' + V.stats[i].sp + ' şlap').join(', ')}</small></span><span class="bya-pts">%${p.toFixed(1)}</span></li>`).join('')}</ol>`;
  }
}
function renderHud() {
  const v = V, me = v.me;
  const ck = JSON.stringify([v.players.map(p => [p.name, p.online, p.bc, p.code]), me, v.mode]);
  if (ck !== chipKey) {
    chipKey = ck;
    const box = q('.bya-players');
    box.classList.toggle('compact', v.players.length > 3);
    if (v.mode === 'takim') {
      box.innerHTML = [0, 1].map(k => `<div class="g-chip bya-chip bya-team ${v.players[me] && v.players[me].code === k + 1 ? 'mine' : ''}" style="--pc:${TEAM[k].color}"><b>${esc(TEAM[k].short)}</b><span class="bya-mem">${v.players.map((p, i) => (p.code === k + 1 ? `<span class="av ${i === me ? 'me' : ''} ${!p.online && !p.bc ? 'off' : ''}" style="--pc:${p.color}" title="${esc(p.name)}">${initial(p.name)}</span>` : '')).join('')}</span><span class="g-num bya-pc" data-c="${k + 1}">%0</span></div>`).join('');
    } else {
      box.innerHTML = v.players.map((p, i) => `<div class="g-chip bya-chip ${i === me ? 'me active' : ''} ${!p.online && !p.bc ? 'off' : ''}" style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><b>${esc(p.name)}${p.bc ? ' 🤖' : ''}</b><span class="g-num bya-pc" data-c="${p.code}">%0</span></div>`).join('');
    }
    renderCov(true);
  }
}
function statusText() {
  const v = V, me = v.me, now = hostClock();
  if (v.phase === 'count') return me < 0 ? ['👀 Oyun başlıyor…', ''] : ['⏳ Hazırlan! Birazdan boyamaya başlıyoruz', ''];
  if (v.phase === 'reveal') return ['📊 Boyalar sayılıyor…', 'win'];
  if (v.phase === 'over') return ['🏁 Oyun bitti!', 'win'];
  if (me < 0) return ['👀 İzliyorsun', ''];
  if (meSplat || v.dead[me] > now) return [`💦 Boyandın! ${Math.max(1, Math.ceil(((v.dead[me] || now + 2000) - now) / 1000))} sn sonra üste doğacaksın`, 'bad'];
  if (ink < INK_COST) return ['🪣 Boya bitti! Kendi renginde dur, tank dolsun', 'bad'];
  const f = v.fx[me] || {};
  if (f.big > now) return [`🖌️ DEV RULO! ${Math.ceil((f.big - now) / 1000)} sn`, 'mine'];
  if (f.spd > now) return [`⚡ HIZ! ${Math.ceil((f.spd - now) / 1000)} sn`, 'mine'];
  return ['🎨 Sıra sende: boya ve ateş et!', 'mine'];
}
function renderSide() {
  const v = V, side = q('.bya-side'); if (!side) return;
  const key = `${v.mode}:${v.pu}:${v.mapId}`;
  if (key !== sideKey) {
    sideKey = key;
    const map = MAPDEFS[v.mapId];
    const rules = ['🎨 Yürüdüğün yer senin rengine boyanır; tabancayla uzağa boya at.', '🏆 Süre bitince zeminin en çoğunu kaplayan renk kazanır.', '💦 İki isabet alan rakip “şlap” olur, 2,6 sn sonra üssünde doğar.',
      '🏃 Kendi boyanda hızlı, rakip boyasında yavaşsın.', '🪣 Ateş etmezken tank dolar; kendi renginde çok daha hızlı.'];
    if (v.mode === 'takim') rules.splice(1, 0, '🤝 Takım: aynı renkteki arkadaşına boya işlemez.');
    side.innerHTML = `<h3 class="bya-h">🎨 ${v.mode === 'takim' ? 'Takım' : 'Herkes Tek'}</h3><p class="bya-map">${map.icon} ${esc(map.name)} · ${esc(map.tip)}</p>
      <ul class="bya-rules">${rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
      ${v.pu ? `<div class="bya-legend"><span class="bya-lh">Güçlendirmeler</span>${ITEM_IDS.map(k => `<div class="bya-li"><canvas data-ic="${k}" width="64" height="64"></canvas><span><b>${esc(ITEMS[k].name)}</b><small>${esc(ITEMS[k].desc)}</small></span></div>`).join('')}</div>` : '<p class="bya-sub">Güçlendirmeler kapalı.</p>'}
      <p class="bya-keys">${isTouch() ? '👈 Sol yarıda sürükle: yürü · 👉 sağ yarıda sürükle: nişan al ve ateş et · sağa kısa dokun: otomatik nişanla ateş' : '⌨️ <b>WASD</b> ile yürü, <b>fareyle</b> nişan al, <b>tıkla/basılı tut</b>: ateş · ya da <b>oklar</b> + <b>Boşluk</b> (otomatik nişan)'}</p>
      <div class="bya-board"></div>`;
    side.querySelectorAll('canvas[data-ic]').forEach(c => { const g = c.getContext('2d'); g.clearRect(0, 0, 64, 64); g.translate(32, 32); drawItemIcon(g, c.dataset.ic, 1.7); });
  }
}
function renderOverlays() {
  const v = V, me = v.me;
  const cnt = q('.bya-count');
  if (v.phase === 'count') {
    const map = MAPDEFS[v.mapId], code = myCode();
    const who = me < 0 ? 'İzle ve eğlen!' : v.mode === 'takim' ? `Takımın: <b style="color:${colOfCode(code)}">${esc(TEAM[code - 1].name)}</b>` : `Rengin: <b style="color:${colOfCode(code)}">● ${esc(v.players[me].name)}</b>`;
    cnt.innerHTML = `<div class="bya-ccard"><small>${map.icon} ${esc(map.name).toLocaleUpperCase('tr-TR')} · ${v.dur} SN</small><h3>🎨 ${v.mode === 'takim' ? 'Takım Savaşı' : 'Herkes Tek'}</h3><p class="bya-cwho">${who}</p><b class="bya-cnum">3</b><p class="bya-chint">${isTouch() ? 'Sol: yürü · Sağ: nişan + ateş' : 'WASD + fare · ya da oklar + Boşluk'}</p></div>`;
    cnt.hidden = false;
  } else cnt.hidden = true;
  const rv = q('.bya-reveal');
  if ((v.phase === 'reveal' || v.phase === 'over') && v.final) {
    if (rv.hidden || !rv.firstChild) buildReveal();
    rv.hidden = false;
  } else { rv.hidden = true; rv.innerHTML = ''; revealStage = -1; }
}
function buildReveal() {
  const v = V, F = v.final, rv = q('.bya-reveal'), gr = covGroups();
  rv.innerHTML = `<div class="bya-rcard"><small>SÜRE DOLDU!</small><h3 class="bya-rtitle">Boyalar sayılıyor…</h3><div class="bya-bars">${gr.map(o => `<div class="bya-brow" data-c="${o.code}" style="--c:${o.col}"><span class="bya-bname">${v.mode === 'takim' ? '★ ' : ''}${esc(v.mode === 'takim' ? TEAM[o.code - 1].short : o.name)}${o.members.includes(v.me) ? ' (sen)' : ''}</span><span class="bya-btrack"><i></i></span><b class="bya-bpct">%0</b></div>`).join('')}</div><p class="bya-rnote">Boyasız alan: %${Math.max(0, 100 - F.pct.reduce((s, x) => s + x, 0)).toFixed(1)}</p></div>`;
  revealT0 = pnow() - clamp(REVEAL_MS - Math.max(0, v.endsAt - hostClock()), 0, REVEAL_MS); revealStage = 0;
  if (F.snap) { const tmp = new Uint8Array(GN); if (decFull(F.snap, tmp)) { G = tmp; snapSeq = 1e9; paintDirty = true; } }
  shotsV = []; snapCam = false;
}
function revealTick() {
  if (revealStage < 0 || !V || !V.final) return;
  const el = pnow() - revealT0, F = V.final, rv = q('.bya-reveal'); if (!rv || rv.hidden) return;
  const maxP = Math.max(1, ...F.pct);
  if (revealStage === 0 && el > 500) {
    revealStage = 1; snd.drum();
    rv.querySelectorAll('.bya-brow').forEach(r => { const p = F.pct[+r.dataset.c - 1] || 0; r.querySelector('i').style.width = (p / maxP * 100) + '%'; });
  }
  if (revealStage >= 1) {
    const u = clamp((el - 500) / 2600, 0, 1), e = 1 - Math.pow(1 - u, 3);
    rv.querySelectorAll('.bya-brow').forEach(r => { const p = (F.pct[+r.dataset.c - 1] || 0) * e, s = `%${p.toFixed(1)}`, b = r.querySelector('.bya-bpct'); if (b.textContent !== s) b.textContent = s; });
  }
  if (revealStage === 1 && el > 3300) {
    revealStage = 2;
    rv.querySelectorAll('.bya-brow').forEach(r => r.classList.toggle('win', F.win.includes(+r.dataset.c)));
    const t = rv.querySelector('.bya-rtitle'), names = F.win.map(c => codeName(c));
    t.textContent = F.win.length === 1 ? `🏆 ${names[0]} kazandı!` : `🤝 Berabere: ${names.join(' & ')}`;
    t.classList.add('win');
    const mine = V.me >= 0 && F.win.includes(myCode());
    Sound.fanfare(); FX.confetti(mine ? 180 : 110); if (mine) flash('good');
  }
}
function hudTick() {
  if (!V || !root) return;
  const v = V, now = hostClock(), left = Math.max(0, v.endsAt - now), secs = Math.ceil(left / 1000);
  const tm = q('.bya-timer'), tb = tm.querySelector('b');
  tb.textContent = v.phase === 'play' ? mmss(secs) : v.phase === 'count' ? mmss(v.dur) : '0:00';
  tm.classList.toggle('urgent', v.phase === 'play' && secs <= 10);
  const cn = q('.bya-cnum'); if (cn && v.phase === 'count') cn.textContent = Math.max(1, secs);
  if (secs !== lastSec) {
    if (v.phase === 'count' && secs > 0 && secs <= 3) Sound.tick(.8);
    else if (v.phase === 'play' && secs <= 10 && secs > 0) Sound.tick(secs <= 5 ? .9 : .5);
    lastSec = secs;
  }
  const [st, cls] = statusText(), se = q('.bya-status');
  const html = `<span class="g-turn ${cls}">${st}</span>`; if (se.innerHTML !== html) se.innerHTML = html;
  const me = v.me, tank = q('.bya-tank');
  if (tank) {
    tank.hidden = me < 0 || v.phase !== 'play';
    if (me >= 0) { tank.style.setProperty('--c', colOfCode(myCode())); tank.querySelector('i').style.height = clamp(ink, 0, 100) + '%'; tank.classList.toggle('low', ink < 20); }
  }
  const dl = q('.bya-dead');
  if (dl) {
    const dead = me >= 0 && v.phase === 'play' && (meSplat || v.dead[me] > now);
    if (dead) { const s = Math.max(1, Math.ceil(((v.dead[me] || now + 2000) - now) / 1000)), di = deadInfo[me], by = di && di.by >= 0 && v.players[di.by] ? v.players[di.by].name : ''; const h = `<b>ŞLAP!</b><span>${by ? `${esc(by)} seni boyadı` : 'Boyandın'}</span><em>${s}</em>`; if (dl.innerHTML !== h) dl.innerHTML = h; }
    dl.hidden = !dead;
  }
  renderCov(false);
  revealTick();
  if (pnow() - layoutAt > 1500) { layoutAt = pnow(); layout(); }
}
function render(v) {
  const prev = V; V = v;
  if (!v || !v.mapId || !root) return;
  if (!prev || prev.mapId !== v.mapId) resetGrid(v.mapId);
  ensureScene(v.mapId); ensurePal();
  if (v.snap && v.snap.d) applySnap(v.snap.s, v.snap.d);
  const me = v.me;
  if (me >= 0) {
    if (!av || myLife !== v.life[me]) {
      const keepA = av ? aimA : v.pos[me][2];
      av = { x: v.pos[me][0], y: v.pos[me][1], vx: 0, vy: 0, h: v.pos[me][2], walk: 0, ph: 0, f: 0 }; aimA = keepA;
      if (myLife >= 0 && v.phase === 'play' && !v.players[me].bc) { snd.respawn(); anims.push({ k: 'ring', x: av.x, y: av.y, col: '#ffffff', start: pnow(), dur: 600, r: 60 }); ink = 100; }
      myLife = v.life[me]; meSplat = false; snapCam = myLife === 0 || snapCam; lastSent = null;
    }
    if (v.dead[me] > hostClock()) meSplat = true;
  } else av = null;
  const key = v.phase;
  if (key !== seenKey) { seenKey = key; lastSec = -1; if (v.phase === 'count' || v.phase === 'reveal') requestAnimationFrame(resize); if (v.phase !== 'play') onBlur(); }
  root.querySelector('.bya').dataset.phase = v.phase;
  root.querySelector('.bya').dataset.mode = v.mode;
  renderHud(); renderSide(); renderOverlays(); hudTick();
  if (!raf) raf = requestAnimationFrame(frame);
}

/* ---- olaylar ---- */
function onEvent(e) {
  if (!root || !V) return;
  const me = ui ? ui.me : -1, t = pnow();
  if (e.t === 'go') { pop('BOYA!', 'good'); Sound.stop(); Sound.whoosh(); }
  else if (e.t === 'splat') {
    deadInfo[e.v] = { x: e.x, y: e.y, c: e.c, t, life: V.life[e.v], by: e.by };
    anims.push({ k: 'splash', x: e.x, y: e.y, col: e.c, r: SPLAT_R, start: t, dur: 900, seed: e.x + e.y }, { k: 'text', x: e.x, y: e.y, txt: 'ŞLAP!', col: '#ffffff', stroke: shade(e.c, -.5), start: t, dur: 1000 }, { k: 'ring', x: e.x, y: e.y, col: e.c, start: t, dur: 500, r: 80 });
    splashParts(e.x, e.y, e.c, 22, 260); snd.splat();
    if (e.v === me) { meSplat = true; addShake(14); flash('bad'); if (av) { av.vx = av.vy = 0; } }
    else if (e.by === me) { pop('ŞLAP! +1', 'good'); Sound.good(); addShake(5); }
    else if (av && dist(av.x, av.y, e.x, e.y) < 300) addShake(3);
    if (cv && (e.v === me || e.by === me)) { const c = toClient(e.x, e.y); FX.burst(c[0], c[1], 24, e.by === me); }
  } else if (e.t === 'pick') {
    splashParts(e.x, e.y - 6, ITEMS[e.k].col, 12, 140); anims.push({ k: 'ring', x: e.x, y: e.y - 6, col: '#fff6b0', start: t, dur: 450, r: 40 });
    if (e.pi === me) { Sound.buy(); pop(e.k === 'bomba' ? 'BOMBA!' : e.k === 'hiz' ? 'HIZ!' : 'DEV RULO!', 'good'); } else Sound.tick(.3);
  } else if (e.t === 'boom') {
    anims.push({ k: 'boom', x: e.x, y: e.y, col: e.c, start: t, dur: 800, seed: e.x * 3 + e.y });
    splashParts(e.x, e.y, e.c, 30, 320); snd.boom();
    if (av) { const d = dist(av.x, av.y, e.x, e.y); if (d < 500) addShake(12 * (1 - d / 500) + 3); }
  } else if (e.t === 'reveal') { pop('SÜRE DOLDU!', 'pink'); Sound.bad(); }
  else if (e.t === 'ctl') { if (e.pi === me && !e.on) pop('KONTROL SENDE!', 'good'); }
}

/* ---- giriş ---- */
function stagePt(e) { const r = stageEl.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function onDown(e) {
  if (e.target.closest && e.target.closest('button')) return;
  if (!V || V.me < 0) return;
  Sound.init();
  const [x, y] = stagePt(e);
  if (e.pointerType === 'mouse') { mouse.x = x; mouse.y = y; mouse.in = true; mouse.at = pnow(); if (e.button === 0) { mouse.down = true; e.preventDefault(); } return; }
  e.preventDefault();
  const right = x > sw / 2;
  const st = right ? stickR : stickL; if (st.on) return;
  st.on = true; st.id = e.pointerId; st.bx = x; st.by = y; st.dx = st.dy = 0; st.t0 = pnow(); st.moved = false;
  try { stageEl.setPointerCapture(e.pointerId); } catch { /* */ }
  const el = right ? joyR : joyL; if (el) { el.hidden = false; el.style.left = x + 'px'; el.style.top = y + 'px'; el.querySelector('i').style.transform = ''; }
  const hint = q('.bya-hint'); if (hint) hint.hidden = true;
}
function onMove(e) {
  const [x, y] = stagePt(e);
  if (e.pointerType === 'mouse') { mouse.x = x; mouse.y = y; mouse.in = true; mouse.at = pnow(); return; }
  const st = e.pointerId === stickL.id && stickL.on ? stickL : e.pointerId === stickR.id && stickR.on ? stickR : null; if (!st) return;
  const el = st === stickR ? joyR : joyL;
  let dx = (x - st.bx) / JR, dy = (y - st.by) / JR; const l = Math.hypot(dx, dy);
  if (l > 1.25) { st.bx = x - dx / l * JR * 1.25; st.by = y - dy / l * JR * 1.25; if (el) { el.style.left = st.bx + 'px'; el.style.top = st.by + 'px'; } }
  if (l > 1) { dx /= l; dy /= l; }
  if (l > .3) st.moved = true;
  const dead = Math.hypot(dx, dy) < .14;
  st.dx = dead ? 0 : dx; st.dy = dead ? 0 : dy;
  if (el) el.querySelector('i').style.transform = `translate(${dx * JR * .7}px, ${dy * JR * .7}px)`;
}
function onUp(e) {
  if (e.pointerType === 'mouse') { if (e.button === 0) mouse.down = false; return; }
  for (const st of [stickL, stickR]) {
    if (!st.on || e.pointerId !== st.id) continue;
    if (st === stickR && !st.moved && pnow() - st.t0 < 260) burstUntil = pnow() + FIRE_MS * 3 - 20;   // kısa dokunuş: otomatik nişanla 3 atış
    st.on = false; st.id = null; st.dx = st.dy = 0;
    const el = st === stickR ? joyR : joyL; if (el) el.hidden = true;
  }
}
function onLeave(e) { if (e.pointerType === 'mouse') { mouse.in = false; mouse.down = false; } }
function onKey(e) {
  if (!V || !root || (e.target && e.target.closest && e.target.closest('input,textarea,select'))) return;
  const codes = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space'];
  if (!codes.includes(e.code)) return;
  if (e.type === 'keydown') { keys.add(e.code); if (V.me >= 0) e.preventDefault(); if (e.code === 'Space' || e.code.startsWith('Arrow')) mouse.at = 0; }
  else keys.delete(e.code);
}
function onBlur() { keys.clear(); mouse.down = false; for (const st of [stickL, stickR]) { st.on = false; st.dx = st.dy = 0; } if (joyL) joyL.hidden = true; if (joyR) joyR.hidden = true; }

function mount(r, api) {
  root = r; ui = api; uiRef = api; V = null; scene = null; av = null; rp = []; keys = new Set(); parts = []; anims = []; shotsV = []; pendingOwn = []; deadInfo = []; rollAt = {};
  chipKey = ''; sideKey = ''; seenKey = ''; lastT = 0; myLife = -1; meSplat = false; snapCam = true; ink = 100; fireCount = 0; burstUntil = 0; lastSent = null; revealStage = -1; covAt = 0;
  mouse = { x: 0, y: 0, in: false, down: false, at: 0 }; stickL = { on: false, id: null, bx: 0, by: 0, dx: 0, dy: 0 }; stickR = { on: false, id: null, bx: 0, by: 0, dx: 0, dy: 0, t0: 0, moved: false };
  initPaintCanvases(); G = new Uint8Array(GN); snapSeq = -1; diffBuf = []; preds = []; palKey = '';
  root.innerHTML = `<div class="g-wrap bya">
    <div class="bya-hud">
      <div class="bya-top"><span class="bya-timer">⏱ <b>0:00</b></span><div class="bya-cov" aria-label="Alan payı"></div></div>
      <div class="bya-players"></div>
    </div>
    <div class="bya-main">
      <div class="bya-stage">
        <canvas class="bya-cv" aria-label="Boya Savaşı arenası"></canvas>
        <div class="bya-status"></div>
        <div class="bya-tank" hidden title="Boya tankı"><span class="bya-tk"><i></i></span><small>BOYA</small></div>
        <canvas class="bya-mini" aria-label="Mini harita"></canvas>
        <div class="bya-joy l" hidden><i></i></div><div class="bya-joy r" hidden><i></i></div>
        <div class="bya-hint" hidden><span class="l"><i></i>Yürü</span><span class="r"><i></i>Nişan + ateş</span></div>
        <div class="bya-pop" aria-live="polite"></div>
        <div class="bya-dead" hidden></div>
        <div class="bya-count" hidden></div>
        <div class="bya-reveal" hidden></div>
      </div>
      <aside class="bya-side g-panel"></aside>
    </div>
  </div>`;
  cv = q('.bya-cv'); cg = cv.getContext('2d'); stageEl = q('.bya-stage'); miniCv = q('.bya-mini'); joyL = q('.bya-joy.l'); joyR = q('.bya-joy.r');
  if (isTouch()) q('.bya-hint').hidden = false;
  stageEl.addEventListener('pointerdown', onDown); stageEl.addEventListener('pointermove', onMove);
  stageEl.addEventListener('pointerup', onUp); stageEl.addEventListener('pointercancel', onUp); stageEl.addEventListener('pointerleave', onLeave);
  stageEl.addEventListener('contextmenu', e => e.preventDefault());
  if (window.ResizeObserver) { ro = new ResizeObserver(() => resize()); ro.observe(stageEl); }
  addEventListener('resize', resize); addEventListener('pointerup', onUp);
  document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKey); addEventListener('blur', onBlur);
  hudT = setInterval(hudTick, 120);
  requestAnimationFrame(resize);
}
function unmount() {
  removeEventListener('resize', resize); removeEventListener('blur', onBlur); removeEventListener('pointerup', onUp);
  document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKey);
  if (ro) { ro.disconnect(); ro = null; }
  clearInterval(hudT); clearTimeout(popT); if (raf) cancelAnimationFrame(raf);
  raf = 0; root = null; ui = null; uiRef = null; V = null; cv = null; cg = null; stageEl = null; miniCv = null; joyL = null; joyR = null; scene = null; av = null; rp = [];
}

CFX.registerGame(Object.assign({
  id: 'boyasavasi', name: 'Boya Savaşı', icon: '🖌️', color: '#ff3fa4', min: 2, max: 8, hotseat: false, bot: true, localMin: 1,
  tagline: 'Zemini rengine boya, en çok alanı kapla!',
  rules: 'Gerçek zamanlı alan boyama: yürüdüğün yer senin rengine boyanır, tabancanla uzağa boya atarsın. Rakibe iki kez isabet ettirirsen “şlap” olur ve üssünde yeniden doğar. Süre bitince zeminin en çoğunu kaplayan renk (ya da takım) kazanır.',
  options: [
    { key: 'mod', label: 'Mod', def: 'ffa', choices: [{ v: 'ffa', label: '🎨 Herkes Tek' }, { v: 'takim', label: '🤝 Takım' }] },
    { key: 'sure', label: 'Süre', def: '90', choices: [{ v: '60', label: '60 sn' }, { v: '90', label: '90 sn' }, { v: '120', label: '120 sn' }] },
    { key: 'harita', label: 'Arena', def: 'sehir', choices: [{ v: 'sehir', label: '🏙️ Şehir Meydanı' }, { v: 'oyuncak', label: '🧸 Oyuncak Odası' }, { v: 'sahil', label: '🏖️ Sahil' }, { v: 'rastgele', label: '🎲 Rastgele' }] },
    { key: 'guc', label: 'Güçlendirmeler', def: '1', choices: [{ v: '1', label: 'Açık' }, { v: '0', label: 'Kapalı' }] }
  ],
  mount, render, onEvent, onFast, unmount,
  // test ve geliştirme için dışa açık yardımcılar
  _bs: { W, H, GW, GH, GN, CS, R, BLK, MAPDEFS, mapOf, navOf, bfs, cellOf, circleFree, moveBody, shotBlocked, stampGrid, countGrid, encDiff, decDiff, applyRuns, encFull, decFull,
    balanceTeams, applyPos, fire, stepShots, splat, respawn, tick, finalCounts, startReveal, flushW, hostInit, SHOT_RANGE, RESPAWN_MS, PROTECT_MS, INK_COST,
    G: () => G, av: () => av, rp: () => rp, cam: () => cam, ink: () => ink, toClient: (x, y) => (cv ? toClient(x, y) : null), snapSeq: () => snapSeq, shotsV: () => shotsV, prof }
}, RULES));
})();
