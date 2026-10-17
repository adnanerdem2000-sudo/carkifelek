/* =========================================================================
   OYUN SALONU — HAİN KİM?
   Gizli hain bulmaca oyunu (4–8 kişi). Mürettebat görev yapar, aralarına
   karışan hain(ler) oyuncuları buz kalıbına çevirip dondurur. Donmuş biri
   bulunursa ya da acil düğmeye basılırsa toplantı yapılır, sohbet edilir ve
   oylanır. Harita tuvale kodla çizilir; duvarlar, tüneller, görev noktaları.
   Gizlilik: rol bilgisi yalnızca oyuncunun kendi görüntüsünde bulunur
   (hainler birbirini görür). Konumlar hızlı kanaldan, kararlar kurucudan.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial } = window.CFX;

/* ------------------------------------------------------------------ yardımcılar */
const W = 2400, H = 1600, CELL = 20, GW = W / CELL, GH = H / CELL;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pickR = arr => arr[Math.floor(Math.random() * arr.length)];
const shuf = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
const shade = (h, t) => t < 0 ? mix(h, '#140a1e', -t) : mix(h, '#ffffff', t);
const trLow = s => String(s).toLocaleLowerCase('tr-TR');
const trUp = s => String(s).toLocaleUpperCase('tr-TR');

/* ------------------------------------------------------------------ sabitler */
const SPEED = 235, GHOST_SPEED = 300, BOT_SPEED = 205, PR = 15;
const VIS = 330, VIS_DARK = 140, VIS_TRAITOR = 350;
const FREEZE_R = 100, REPORT_R = 125, USE_R = 90, VENT_R = 70, BUTTON_R = 150, SLACK = 55;
const INTRO_MS = 5200, EJECT_MS = 8200, OVER_MS = 5600, OFFLINE_MS = 15000;
const SAB_CD = 30000, SAB_FIRST = 15000, REACTOR_MS = 40000, BUTTON_CD = 15000, FIRST_FREEZE = 12000;

const TASKS = {
  kablo: { n: 'Kablo bağla', icon: '🔌' },
  sayi: { n: 'Sayıları sırayla bas', icon: '🔢' },
  ibre: { n: 'İbreyi durdur', icon: '🎯' },
  yukle: { n: 'Dosya yükle', icon: '📤' },
  cop: { n: 'Çöpü boşalt', icon: '🗑️' },
  termo: { n: 'Isıyı ayarla', icon: '🌡️' }
};
const HOODS = ['anten', 'kedi', 'tavsan', 'ayi', 'anten2', 'kedi', 'tavsan', 'ayi'];

/* ------------------------------------------------------------------ haritalar
   Odalar ve koridorlar dikdörtgen (20 birimlik ızgaraya oturur). Dışarısı duvar.
   blocks: odaların içindeki katı eşyalar (görüşü kesmez, yürümeyi engeller).        */
const ROOM = (id, n, x, y, w, h, floor, deco) => ({ id, n, x, y, w, h, floor, deco });
const MAPS = {
  kar: {
    id: 'kar', name: 'Kar Araştırma İstasyonu', icon: '❄️',
    theme: { out: '#dfeefa', out2: '#c4dcf0', wallTop: '#9fc3e6', wallFace: '#5e86b8', wallEdge: '#3b5f8f', hall: { p: 'grate', c1: '#a9b8cc', c2: '#93a4bb' }, label: 'rgba(40,70,120,.5)', night: '#0d1838' },
    reactorName: 'Reaktör', lightsName: 'Elektrik Odası',
    rooms: [
      ROOM('gozlem', 'Gözlem Kulesi', 120, 120, 420, 340, { p: 'plank', c1: '#c98f5a', c2: '#b37a48' }, 'gozlem'),
      ROOM('lab', 'Laboratuvar', 900, 100, 600, 340, { p: 'tile', c1: '#eef6ff', c2: '#cfe0f3' }, 'lab'),
      ROOM('revir', 'Revir', 1860, 120, 420, 340, { p: 'tile', c1: '#e8fff6', c2: '#bfeedd' }, 'revir'),
      ROOM('reaktor', 'Reaktör', 100, 600, 460, 420, { p: 'grate', c1: '#8a96ad', c2: '#76839b' }, 'reaktor'),
      ROOM('kumanda', 'Kumanda Merkezi', 880, 560, 640, 480, { p: 'check', c1: '#d7e6f7', c2: '#b9d0ea' }, 'kumanda'),
      ROOM('mutfak', 'Kafeterya', 1840, 600, 460, 420, { p: 'check', c1: '#fff1d6', c2: '#ffd8a8' }, 'kafeterya'),
      ROOM('depo', 'Depo', 120, 1140, 420, 360, { p: 'plank', c1: '#a8865f', c2: '#94724d' }, 'depo'),
      ROOM('elektrik', 'Elektrik Odası', 900, 1180, 600, 320, { p: 'grate', c1: '#7d8aa3', c2: '#6a7790' }, 'elektrik'),
      ROOM('garaj', 'Kar Garajı', 1860, 1140, 420, 360, { p: 'concrete', c1: '#b9c2cf', c2: '#a7b1c0' }, 'garaj')
    ],
    halls: [[540, 240, 360, 120], [1500, 240, 360, 120], [560, 740, 320, 120], [1520, 740, 320, 120], [540, 1280, 360, 120], [1500, 1280, 360, 120],
      [1140, 440, 120, 120], [1140, 1040, 120, 140], [260, 460, 120, 140], [260, 1020, 120, 120], [2020, 460, 120, 140], [2020, 1020, 120, 120]],
    blocks: [{ k: 'round', x: 330, y: 810, r: 78 }, { k: 'rect', x: 1020, y: 220, w: 120, h: 60 }, { k: 'rect', x: 1260, y: 220, w: 120, h: 60 },
      { k: 'round', x: 1980, y: 740, r: 40 }, { k: 'round', x: 2160, y: 880, r: 40 }, { k: 'rect', x: 180, y: 1260, w: 100, h: 80 }, { k: 'rect', x: 1960, y: 1240, w: 140, h: 80 },
      { k: 'rect', x: 1960, y: 220, w: 120, h: 60 }, { k: 'rect', x: 2120, y: 220, w: 120, h: 60 }],
    button: { x: 1200, y: 800, r: 72 },
    stations: [
      { x: 200, y: 180, t: 'ibre', n: 'Teleskobu ayarla' }, { x: 470, y: 410, t: 'yukle', n: 'Gözlem verisini yükle' },
      { x: 960, y: 160, t: 'sayi', n: 'Numuneleri sırala' }, { x: 1440, y: 160, t: 'kablo', n: 'Mikroskop kabloları' }, { x: 1320, y: 390, t: 'termo', n: 'Kuluçka ısısı' },
      { x: 1920, y: 400, t: 'yukle', n: 'Hasta kayıtları' }, { x: 2220, y: 400, t: 'sayi', n: 'İlaç dolabı şifresi' },
      { x: 500, y: 650, t: 'kablo', n: 'Soğutma kabloları' },
      { x: 940, y: 620, t: 'kablo', n: 'Telsiz kabloları' }, { x: 1460, y: 990, t: 'ibre', n: 'Anten ayarı' },
      { x: 2240, y: 660, t: 'cop', n: 'Çöpü boşalt' }, { x: 1900, y: 970, t: 'termo', n: 'Çorba ısısı' },
      { x: 190, y: 1190, t: 'cop', n: 'Hurdayı boşalt' }, { x: 470, y: 1450, t: 'kablo', n: 'Jeneratör kabloları' },
      { x: 1440, y: 1450, t: 'sayi', n: 'Sigorta sırası' },
      { x: 1920, y: 1450, t: 'ibre', n: 'Kar motoru yakıtı' }, { x: 2220, y: 1190, t: 'yukle', n: 'Rota haritası' }
    ],
    lights: { x: 960, y: 1230 },
    reactor: [{ x: 170, y: 660 }, { x: 170, y: 960 }],
    vents: [{ x: 460, y: 190, l: [1, 2] }, { x: 490, y: 960, l: [0, 2] }, { x: 300, y: 1450, l: [0, 1] },
      { x: 2200, y: 190, l: [4, 5] }, { x: 2240, y: 960, l: [3, 5] }, { x: 2100, y: 1440, l: [3, 4] },
      { x: 1060, y: 390, l: [7, 8] }, { x: 960, y: 990, l: [6, 8] }, { x: 1340, y: 1260, l: [6, 7] }]
  },
  luna: {
    id: 'luna', name: 'Lunapark Gecesi', icon: '🎡',
    theme: { out: '#173b2a', out2: '#1f4d36', wallTop: '#7b3fc4', wallFace: '#4a1d86', wallEdge: '#2a0d55', hall: { p: 'brick', c1: '#e9c79c', c2: '#d6ad7c' }, label: 'rgba(80,20,90,.45)', night: '#12052e' },
    reactorName: 'Jeneratör', lightsName: 'Elektrik Kulübesi',
    rooms: [
      ROOM('meydan', 'Ana Meydan', 900, 560, 600, 460, { p: 'check', c1: '#ffb3d6', c2: '#fff0f7' }, 'meydan'),
      ROOM('atli', 'Atlıkarınca', 140, 140, 500, 420, { p: 'brick', c1: '#ffe0b2', c2: '#ffcf8f' }, 'atli'),
      ROOM('dolap', 'Dönme Dolap', 960, 100, 480, 300, { p: 'tile', c1: '#c8f0ff', c2: '#9fdcf5' }, 'dolap'),
      ROOM('korku', 'Korku Tüneli', 1780, 120, 480, 360, { p: 'check', c1: '#5c3c86', c2: '#4a2d70' }, 'korku'),
      ROOM('gise', 'Gişe', 100, 720, 380, 320, { p: 'plank', c1: '#e9b57a', c2: '#d49d62' }, 'gise'),
      ROOM('arabalar', 'Çarpışan Arabalar', 1800, 640, 500, 440, { p: 'tile', c1: '#3a4d9a', c2: '#31428a' }, 'arabalar'),
      ROOM('mutfak', 'Pamuk Şeker Mutfağı', 160, 1180, 480, 320, { p: 'check', c1: '#fff6fb', c2: '#ffd1ea' }, 'pamuk'),
      ROOM('elektrik', 'Elektrik Kulübesi', 960, 1220, 440, 280, { p: 'grate', c1: '#8a8fa8', c2: '#767b95' }, 'elektrikL'),
      ROOM('jenerator', 'Jeneratör', 1720, 1240, 560, 260, { p: 'grate', c1: '#9a8c7a', c2: '#857766' }, 'jenerator')
    ],
    halls: [[640, 300, 320, 120], [1440, 200, 340, 120], [1140, 400, 120, 160], [480, 820, 420, 120], [1500, 780, 300, 120], [1140, 1020, 120, 200],
      [640, 1320, 320, 120], [1400, 1340, 320, 120], [240, 560, 120, 160], [240, 1040, 120, 140], [2000, 480, 120, 160], [2040, 1080, 120, 160]],
    blocks: [{ k: 'round', x: 390, y: 350, r: 92 }, { k: 'round', x: 1200, y: 230, r: 64 }, { k: 'rect', x: 1980, y: 800, w: 140, h: 120 },
      { k: 'rect', x: 1900, y: 220, w: 80, h: 80 }, { k: 'rect', x: 2080, y: 340, w: 80, h: 60 }, { k: 'rect', x: 240, y: 840, w: 120, h: 60 },
      { k: 'rect', x: 320, y: 1300, w: 160, h: 60 }, { k: 'round', x: 1880, y: 1380, r: 50 }, { k: 'round', x: 2080, y: 1380, r: 50 }],
    button: { x: 1200, y: 790, r: 72 },
    stations: [
      { x: 190, y: 190, t: 'kablo', n: 'Atlıkarınca kabloları' }, { x: 590, y: 510, t: 'ibre', n: 'Müzik kutusu ayarı' },
      { x: 1010, y: 150, t: 'yukle', n: 'Bilet verisini yükle' }, { x: 1390, y: 350, t: 'sayi', n: 'Kabin kilitleri' },
      { x: 1830, y: 420, t: 'cop', n: 'Örümcek ağlarını boşalt' }, { x: 2210, y: 420, t: 'kablo', n: 'Hayalet ışıkları' },
      { x: 150, y: 770, t: 'sayi', n: 'Kasa şifresi' }, { x: 430, y: 990, t: 'yukle', n: 'Günlük satışlar' },
      { x: 1850, y: 1030, t: 'termo', n: 'Pist soğutması' }, { x: 2250, y: 690, t: 'ibre', n: 'Araba hızı' },
      { x: 210, y: 1450, t: 'termo', n: 'Şeker kazanı ısısı' }, { x: 590, y: 1230, t: 'cop', n: 'Çöpü boşalt' },
      { x: 1350, y: 1450, t: 'kablo', n: 'Ampul kabloları' }, { x: 2000, y: 1460, t: 'sayi', n: 'Yakıt vanaları' },
      { x: 950, y: 610, t: 'yukle', n: 'Anons sistemi' }, { x: 1450, y: 970, t: 'cop', n: 'Mısır kutularını boşalt' }
    ],
    lights: { x: 1010, y: 1270 },
    reactor: [{ x: 1770, y: 1290 }, { x: 2230, y: 1290 }],
    vents: [{ x: 590, y: 200, l: [1, 2] }, { x: 430, y: 770, l: [0, 2] }, { x: 230, y: 1230, l: [0, 1] },
      { x: 2200, y: 180, l: [4, 5] }, { x: 2240, y: 1020, l: [3, 5] }, { x: 2230, y: 1450, l: [3, 4] },
      { x: 1010, y: 350, l: [7, 8] }, { x: 1450, y: 610, l: [6, 8] }, { x: 1020, y: 1450, l: [6, 7] }]
  }
};
const MAP_IDS = Object.keys(MAPS);

/* ---- ızgara: yürünebilir alan, katı eşyalar, görüş engeli, bot yol bulma ---- */
function buildGrid(m) {
  const walk = new Uint8Array(GW * GH);
  const fillR = (x, y, w, h) => { for (let cy = Math.floor(y / CELL); cy < Math.ceil((y + h) / CELL); cy++) for (let cx = Math.floor(x / CELL); cx < Math.ceil((x + w) / CELL); cx++) if (cx >= 0 && cy >= 0 && cx < GW && cy < GH) walk[cy * GW + cx] = 1; };
  m.rooms.forEach(r => fillR(r.x, r.y, r.w, r.h));
  m.halls.forEach(h => fillR(h[0], h[1], h[2], h[3]));
  const solid = new Uint8Array(GW * GH);
  for (let i = 0; i < solid.length; i++) solid[i] = walk[i] ? 0 : 1;
  const solidRound = (x, y, r) => { for (let cy = Math.floor((y - r) / CELL); cy <= Math.floor((y + r) / CELL); cy++) for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++) { if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) continue; if (dist(cx * CELL + CELL / 2, cy * CELL + CELL / 2, x, y) <= r) solid[cy * GW + cx] = 1; } };
  m.blocks.forEach(b => {
    if (b.k === 'round') solidRound(b.x, b.y, b.r);
    else for (let cy = b.y / CELL; cy < (b.y + b.h) / CELL; cy++) for (let cx = b.x / CELL; cx < (b.x + b.w) / CELL; cx++) solid[cy * GW + cx] = 1;
  });
  solidRound(m.button.x, m.button.y, m.button.r);
  const clear = new Uint8Array(GW * GH);
  for (let cy = 1; cy < GH - 1; cy++) for (let cx = 1; cx < GW - 1; cx++) {
    let ok = 1;
    for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if (solid[(cy + dy) * GW + cx + dx]) { ok = 0; break; }
    clear[cy * GW + cx] = ok;
  }
  m.walk = walk; m.solid = solid; m.clear = clear;
  m.allPts = m.rooms.map(r => [r.x + r.w / 2, r.y + r.h / 2]);
}
MAP_IDS.forEach(id => buildGrid(MAPS[id]));
const cellOf = (x, y) => [clamp(Math.floor(x / CELL), 0, GW - 1), clamp(Math.floor(y / CELL), 0, GH - 1)];
const solidAt = (m, x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return true; return m.solid[Math.floor(y / CELL) * GW + Math.floor(x / CELL)] === 1; };
const opaqueAt = (m, x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return true; return m.walk[Math.floor(y / CELL) * GW + Math.floor(x / CELL)] === 0; };
const FEET = [[1, 0], [-1, 0], [0, -.6], [0, .5], [.72, -.42], [-.72, -.42], [.72, .36], [-.72, .36]];
function freeAt(m, x, y) { for (const [a, b] of FEET) if (solidAt(m, x + a * PR, y + b * PR)) return false; return true; }
function los(m, x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1), n = Math.ceil(d / 9);
  for (let i = 1; i < n; i++) { const t = i / n; if (opaqueAt(m, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
  return true;
}
function roomAt(m, x, y) {
  for (const r of m.rooms) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
  return null;
}
const roomName = (m, x, y) => { const r = roomAt(m, x, y); return r ? r.n : 'Koridor'; };
// Hareket: eksen eksen dene (duvarda kayar)
function moveIn(m, x, y, dx, dy, ghost) {
  if (ghost) return [clamp(x + dx, 20, W - 20), clamp(y + dy, 20, H - 20)];
  let nx = x, ny = y;
  if (dx && freeAt(m, x + dx, y)) nx = x + dx;
  if (dy && freeAt(m, nx, y + dy)) ny = y + dy;
  return [nx, ny];
}
function nearestClear(m, x, y) {
  const [cx, cy] = cellOf(x, y);
  if (m.clear[cy * GW + cx]) return [cx, cy];
  for (let r = 1; r < 8; r++) {
    let best = null, bd = 1e9;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || !m.clear[ny * GW + nx]) continue;
      const d = dist(nx * CELL + 10, ny * CELL + 10, x, y); if (d < bd) { bd = d; best = [nx, ny]; }
    }
    if (best) return best;
  }
  return null;
}
function clearLine(m, x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1), n = Math.ceil(d / 8);
  for (let i = 1; i <= n; i++) { const t = i / n, [cx, cy] = cellOf(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t); if (!m.clear[cy * GW + cx]) return false; }
  return true;
}
// BFS ile yol, sonra görüş hattıyla düzleştirme
function findPath(m, sx, sy, tx, ty) {
  const s = nearestClear(m, sx, sy), g = nearestClear(m, tx, ty);
  if (!s || !g) return [[tx, ty]];
  const si = s[1] * GW + s[0], gi = g[1] * GW + g[0];
  const prev = new Int32Array(GW * GH).fill(-1), q = new Int32Array(GW * GH);
  let qh = 0, qt = 0; q[qt++] = si; prev[si] = si;
  const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (qh < qt) {
    const i = q[qh++]; if (i === gi) break;
    const cx = i % GW, cy = (i / GW) | 0;
    for (const [dx, dy] of N8) {
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const ni = ny * GW + nx; if (prev[ni] !== -1 || !m.clear[ni]) continue;
      if (dx && dy && (!m.clear[cy * GW + nx] || !m.clear[ny * GW + cx])) continue;
      prev[ni] = i; q[qt++] = ni;
    }
  }
  if (prev[gi] === -1) return [[tx, ty]];
  const cells = []; for (let i = gi; i !== si; i = prev[i]) cells.push(i); cells.reverse();
  const pts = cells.map(i => [(i % GW) * CELL + CELL / 2, ((i / GW) | 0) * CELL + CELL / 2]);
  if (freeAt(m, tx, ty) && pts.length && clearLine(m, pts[pts.length - 1][0], pts[pts.length - 1][1], tx, ty)) pts.push([tx, ty]);
  const out = []; let cx = sx, cy = sy, k = 0;
  while (k < pts.length) {
    let j = pts.length - 1;
    while (j > k && !clearLine(m, cx, cy, pts[j][0], pts[j][1])) j--;
    out.push(pts[j]); cx = pts[j][0]; cy = pts[j][1]; k = j + 1;
  }
  return out;
}
function spawnPts(m, n) {
  const out = [];
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i / n * TAU; out.push([Math.round(m.button.x + Math.cos(a) * (m.button.r + 70)), Math.round(m.button.y + Math.sin(a) * (m.button.r + 62))]); }
  return out;
}

/* ------------------------------------------------------------------ KURALLAR (yöneten cihaz) */
const HK = { force: null, speed: 1 };              // test kancaları (force: hain koltukları)
const optNum = (v, allowed, def) => { const n = parseInt(v, 10); return allowed.includes(n) ? n : def; };
let uiRef = null;                                    // yöneten cihazdaki arayüz (yerel bot konumlarını çizmek için)
let loopTok = 0;
const pname = (st, pi) => st.players[pi] ? st.players[pi].name : '?';
const isT = (st, pi) => st.role[pi] === 'T';
const mapOf = st => MAPS[st.mapId];
function counts(st) {
  let C = 0, T = 0;
  st.players.forEach((_, i) => { if (!st.alive[i]) return; if (isT(st, i)) T++; else C++; });
  return { C, T };
}
function visionOf(st, pi) {
  if (!st.alive[pi]) return 99999;
  if (isT(st, pi)) return VIS_TRAITOR;
  return st.sab && st.sab.k === 'lights' ? VIS_DARK : VIS;
}
function canSee(st, viewer, x, y) {
  const p = st.pos[viewer]; if (!p) return false;
  return dist(p.x, p.y, x, y) <= visionOf(st, viewer) && los(mapOf(st), p.x, p.y - 12, x, y - 12);
}
function setPhase(st, ph, ms) { st.phase = ph; st.pid++; st.endsAt = ms ? Date.now() + ms : 0; st.dur = ms || 1; }
function arm(st, ctx) {
  if (!st.endsAt) return;
  const pid = st.pid;
  ctx.later(Math.max(0, st.endsAt - Date.now()) + 30, () => {
    if (st.pid !== pid) return;
    if (Date.now() < st.endsAt - 25) { arm(st, ctx); return; }
    if (st.phase === 'intro') startPlay(st, ctx);
    else if (st.phase === 'meeting') startVote(st, ctx);
    else if (st.phase === 'vote') tally(st, ctx);
    else if (st.phase === 'eject') { if (!checkWin(st, ctx)) startPlay(st, ctx); }
    else if (st.phase === 'over') finish(st, ctx);
  });
}
function teleport(st, pi, x, y) {
  st.pos[pi] = { x: Math.round(x), y: Math.round(y), h: Math.PI / 2, mv: 0, t: Date.now() };
  st.tpN[pi]++;
  if (st.players[pi].isBot) { const b = st.bots[pi]; if (b) { b.path = []; b.goal = null; b.wait = 0; } localRemote(pi, true); }
}
function gather(st) {
  const pts = spawnPts(mapOf(st), st.players.length);
  st.players.forEach((_, i) => teleport(st, i, pts[i][0], pts[i][1]));
}
// Yerel modda botların konumunu bu cihazın çizimine aktar; online modda hızlı kanaldan yay
function localRemote(pi, snap) {
  const g = window.CFX && window.CFX.Room && window.CFX.Room.game;
  const st = g && g.state; if (!st || !st.pos[pi]) return;
  const p = st.pos[pi];
  if (typeof onRemotePos === 'function') onRemotePos(pi, p.x, p.y, p.h, p.mv, !st.alive[pi], snap);
  if (uiRef && uiRef.mode === 'online' && uiRef.fast) { try { uiRef.fast({ t: 'p', s: pi, x: Math.round(p.x), y: Math.round(p.y), h: +p.h.toFixed(2), mv: p.mv, gh: st.alive[pi] ? 0 : 1, n: st.tpN[pi] }); } catch { /* */ } }
}
// Hızlı kanaldan gelen konum: yöneten cihazda hız ve duvar denetimiyle kaydedilir
function hostPosUpdate(seat, x, y, h, mv, n, cid) {
  const R0 = window.CFX && window.CFX.Room, g = R0 && R0.game;
  if (!g || !g.state || g.def.id !== 'hainkim' || !R0.isRunner() || g.result) return;
  const st = g.state;
  if (!Number.isInteger(seat) || !st.players[seat] || st.players[seat].isBot) return;
  if (cid && g.players[seat] && g.players[seat].cid && g.players[seat].cid !== cid) return;
  if (st.phase !== 'play' || !Number.isFinite(x) || !Number.isFinite(y) || n !== st.tpN[seat]) return;
  const p = st.pos[seat], now = Date.now(), ghost = !st.alive[seat];
  const maxd = (ghost ? GHOST_SPEED : SPEED) * (now - p.t) / 1000 * 1.5 + 80, d = dist(x, y, p.x, p.y);
  if (d > maxd) { const k = maxd / d; x = p.x + (x - p.x) * k; y = p.y + (y - p.y) * k; }
  x = clamp(x, 20, W - 20); y = clamp(y, 20, H - 20);
  if (!ghost && !freeAt(mapOf(st), x, y)) return;
  st.pos[seat] = { x: Math.round(x), y: Math.round(y), h: Number.isFinite(h) ? +h.toFixed(2) : p.h, mv: mv ? 1 : 0, t: now };
}

function startPlay(st, ctx) {
  const now = Date.now(), first = st.phase === 'intro';
  st.meeting = null; st.eject = st.phase === 'eject' ? st.eject : null;
  setPhase(st, 'play', 0);
  st.players.forEach((_, i) => { if (isT(st, i)) st.cd[i] = now + (first ? Math.min(FIRST_FREEZE, st.cdMs) : st.cdMs); });
  st.sabReadyAt = now + (first ? SAB_FIRST : SAB_CD * .6);
  st.btnReadyAt = now + (first ? 8000 : BUTTON_CD);
  st.players.forEach((p, i) => { if (p.isBot && st.bots[i]) Object.assign(st.bots[i], { path: [], goal: null, wait: now + rnd(300, 1500), doing: null }); });
  ctx.emit({ t: 'play', first }, first ? `Oyun başladı! ${mapOf(st).name} · ${st.nT} hain aramızda.` : 'Herkes görevlerine dönüyor…', first ? 'gold' : '');
  ctx.sync();
}
function taskWinCheck(st) { return st.taskTotal > 0 && st.taskDone >= st.taskTotal; }
function checkWin(st, ctx) {
  if (st.phase === 'over') return true;
  const c = counts(st);
  let w = null, why = '';
  if (c.T === 0) { w = 'crew'; why = st.players.some((_, i) => isT(st, i) && st.left[i] && !st.ejected[i]) && !st.players.some((_, i) => isT(st, i) && st.ejected[i]) ? 'Hain oyundan ayrıldı!' : 'Bütün hainler yakalandı!'; }
  else if (c.T >= c.C) { w = 'traitor'; why = 'Hainler sayıca üstün geldi!'; }
  else if (taskWinCheck(st)) { w = 'crew'; why = 'Bütün görevler tamamlandı!'; }
  if (!w) return false;
  endGame(st, ctx, w, why);
  return true;
}
function endGame(st, ctx, w, why) {
  if (st.phase === 'over') return;
  st.winner = w; st.why = why; st.sab = null;
  setPhase(st, 'over', OVER_MS);
  ctx.emit({ t: 'over', w }, `${w === 'crew' ? '🎉 Mürettebat kazandı' : '😈 Hainler kazandı'}: ${why} Hain${st.nT > 1 ? 'ler' : ''}: ${st.players.map((p, i) => isT(st, i) ? p.name : null).filter(Boolean).join(', ')}.`, w === 'crew' ? 'good' : 'bad');
  arm(st, ctx); ctx.sync();
}
function finish(st, ctx) {
  const rows = st.players.map((p, i) => {
    const s = st.stats[i], won = (st.winner === 'traitor') === isT(st, i);
    let score = won ? 100 : 0, label;
    if (isT(st, i)) { score += s.freezes * 40; label = `😈 Hain · ${s.freezes} dondurma`; }
    else { score += s.tasks * 10 + s.correct * 25; label = `🛰️ Mürettebat · ${s.tasks} görev · ${s.correct} doğru oy`; }
    if (st.alive[i]) score += 15;
    return { pi: i, score, label: `${label} · ${score} puan`, won };
  }).sort((a, b) => (b.won - a.won) || (b.score - a.score));
  ctx.end({
    title: st.winner === 'crew' ? 'Mürettebat kazandı! 🎉' : 'Hainler kazandı! 😈',
    ranking: rows.map(r => ({ pi: r.pi, score: r.score, label: r.label })),
    note: `${st.why} Kazanan taraf +100 · görev 10 · doğru oy 25 · dondurma 40 · hayatta kalan 15 puan.`
  });
}
function doFreeze(st, pi, tg, ctx) {
  const now = Date.now(), p = st.pos[tg];
  st.alive[tg] = false; st.frozenBy[tg] = pi; st.cd[pi] = now + st.cdMs; st.stats[pi].freezes++;
  st.bodies.push({ pi: tg, x: p.x, y: p.y, at: now });
  if (st.sab && st.sab.k === 'reactor') st.sab.holds = st.sab.holds.map(h => h === tg ? -1 : h);
  // Tanıklar (bilgisayar oyuncular): hain görüş alanındaysa hatırla
  st.players.forEach((pl, i) => {
    if (!pl.isBot || !st.alive[i] || isT(st, i) || i === tg) return;
    const b = st.bots[i]; if (!b) return;
    if (canSee(st, i, st.pos[pi].x, st.pos[pi].y)) { b.sus[pi] = (b.sus[pi] || 0) + 200; b.wit = pi; }
  });
  if (st.players[tg].isBot && st.bots[tg]) Object.assign(st.bots[tg], { path: [], goal: null, doing: null });
  ctx.emit({ t: 'fz' });
  if (!checkWin(st, ctx)) ctx.sync();
}
function completeTask(st, pi, k, ctx) {
  const tk = st.tasks[pi][k]; if (!tk || tk.done) return false;
  tk.done = true;
  if (!isT(st, pi)) { st.taskDone++; st.stats[pi].tasks++; }
  ctx.emit({ t: 'task', pi });
  if (!checkWin(st, ctx)) ctx.sync();
  return true;
}
function startSab(st, pi, k, ctx) {
  const now = Date.now();
  st.sab = k === 'reactor' ? { k, endsAt: now + REACTOR_MS, holds: [-1, -1] } : { k };
  st.sabReadyAt = now + 999999999;
  const m = mapOf(st);
  ctx.emit({ t: 'sab', k }, k === 'reactor' ? `☢️ ${m.reactorName} alarmı! İki kişi ${REACTOR_MS / 1000} saniye içinde iki paneli aynı anda tutmalı!` : `💡 Işıklar söndü! ${m.lightsName} panelinden şalterleri kaldırın.`, 'bad');
  ctx.sync();
}
function endSab(st, ctx, how) {
  if (!st.sab) return;
  const k = st.sab.k; st.sab = null; st.sabReadyAt = Date.now() + SAB_CD;
  ctx.emit({ t: 'sabfix', k }, k === 'reactor' ? `✅ ${mapOf(st).reactorName} dengelendi${how ? ' — ' + how : ''}.` : `✅ Işıklar geri geldi${how ? ' — ' + how : ''}.`, 'good');
  ctx.sync();
}
function startMeeting(st, ctx, caller, reason, body) {
  const now = Date.now();
  // Toplantıda herkes kimlerin donduğunu öğrenir; buz kalıpları kaldırılır
  st.players.forEach((p, i) => {
    if (!st.alive[i]) st.pubOut[i] = true;
    if (p.isBot && st.bots[i]) { const b = st.bots[i]; b.lastRoom = roomName(mapOf(st), st.pos[i].x, st.pos[i].y); b.said = 0; }
  });
  botsAtReport(st, caller, body);
  st.bodies = []; st.sab = null; st.sabReadyAt = now + SAB_CD;
  st.meeting = { caller, reason, body: body == null ? -1 : body, votes: {}, n: ++st.meetN, revealed: false };
  gather(st);
  setPhase(st, 'meeting', st.talkMs);
  const log = reason === 'body' ? `🧊 ${pname(st, caller)} donmuş ${pname(st, body)} oyuncusunu buldu! Toplantı başladı.` : `🚨 ${pname(st, caller)} acil toplantı çağırdı!`;
  ctx.emit({ t: 'meet', reason, caller, body: body == null ? -1 : body }, log, 'gold');
  scheduleBotTalk(st, ctx);
  arm(st, ctx); ctx.sync();
}
function startVote(st, ctx) {
  if (st.phase !== 'meeting') return;
  setPhase(st, 'vote', st.voteMs);
  ctx.emit({ t: 'vote' }, `🗳️ Oylama başladı! ${st.voteMs / 1000} saniye.`);
  scheduleBotVotes(st, ctx);
  arm(st, ctx); ctx.sync();
}
function allVoted(st) { return st.players.every((_, i) => !st.alive[i] || st.meeting.votes[i] !== undefined); }
function tally(st, ctx) {
  if (st.phase !== 'vote') return;
  const m = st.meeting, cnt = {}; let skip = 0;
  Object.keys(m.votes).forEach(k => { const v = m.votes[k]; if (!st.alive[+k]) return; if (v === -1) skip++; else cnt[v] = (cnt[v] || 0) + 1; });
  let max = 0; Object.values(cnt).forEach(c => { if (c > max) max = c; });
  const top = Object.keys(cnt).filter(k => cnt[k] === max).map(Number);
  let out = -1, why = '';
  if (max === 0 || skip > max) why = 'skip';
  else if (top.length > 1 || skip === max) why = 'tie';
  else out = top[0];
  // doğru oylar: bir haine oy verenler
  Object.keys(m.votes).forEach(k => { const v = m.votes[k]; if (v >= 0 && isT(st, v) && !isT(st, +k)) st.stats[+k].correct++; });
  if (out >= 0) { st.alive[out] = false; st.pubOut[out] = true; st.ejected[out] = true; }
  const c = counts(st);
  st.eject = { pi: out, why, traitor: out >= 0 ? isT(st, out) : null, left: c.T, votes: Object.assign({}, m.votes), cnt, skip, at: Date.now() };
  m.revealed = true;
  setPhase(st, 'eject', EJECT_MS);
  const nm = out >= 0 ? pname(st, out) : '';
  const log = out < 0 ? (why === 'tie' ? '⚖️ Oylar eşit — kimse uzaklaştırılmadı.' : '⏭️ Atlandı — kimse uzaklaştırılmadı.')
    : st.reveal ? `🎈 ${nm} uzaklaştırıldı… ${isT(st, out) ? 'HAİNDİ!' : 'hain DEĞİLDİ.'}` : `🎈 ${nm} uzaklaştırıldı.`;
  ctx.emit({ t: 'eject', pi: out }, log, out >= 0 && st.reveal ? (isT(st, out) ? 'good' : 'bad') : '');
  arm(st, ctx); ctx.sync();
}
function makeLeft(st, pi, ctx) {
  if (st.left[pi]) return;
  st.left[pi] = true;
  const wasAlive = st.alive[pi];
  st.alive[pi] = false; st.pubOut[pi] = true;
  if (!isT(st, pi)) { const undone = st.tasks[pi].filter(t => !t.done).length; st.taskTotal -= undone; st.tasks[pi].forEach(t => { t.done = true; t.gone = true; }); }
  if (st.sab && st.sab.k === 'reactor') st.sab.holds = st.sab.holds.map(h => h === pi ? -1 : h);
  ctx.emit({ t: 'left', pi }, `👻 ${pname(st, pi)} ${OFFLINE_MS / 1000} saniyedir bağlı değil; ${wasAlive ? 'hayalet oldu' : 'oyundan çıktı'}.`, 'bad');
  if (checkWin(st, ctx)) return;
  if (st.phase === 'vote' && allVoted(st)) { const pid = st.pid; ctx.later(900, () => { if (st.pid === pid) tally(st, ctx); }); }
  ctx.sync();
}
function tick(st, ctx) {
  const now = Date.now();
  st.players.forEach((p, i) => { if (!p.isBot && st.online[i] === false && !st.left[i] && st.offSince[i] && now - st.offSince[i] > OFFLINE_MS) makeLeft(st, i, ctx); });
  if (st.phase !== 'play') return;
  if (st.sab && st.sab.k === 'reactor') {
    const sb = st.sab, m = mapOf(st);
    let changed = false;
    sb.holds = sb.holds.map((h, k) => {
      if (h < 0) return h;
      const p = st.pos[h];
      if (!st.alive[h] || !p || dist(p.x, p.y, m.reactor[k].x, m.reactor[k].y) > USE_R + SLACK) { changed = true; return -1; }
      return h;
    });
    if (sb.holds[0] >= 0 && sb.holds[1] >= 0 && sb.holds[0] !== sb.holds[1]) { endSab(st, ctx, `${pname(st, sb.holds[0])} ve ${pname(st, sb.holds[1])} başardı`); }
    else if (now >= sb.endsAt) { endGame(st, ctx, 'traitor', `${m.reactorName} zamanında dengelenemedi!`); return; }
    else if (changed) ctx.sync();
  }
  if (st.phase !== 'play') return;
  st.tk = (st.tk || 0) + 1;
  botsStep(st, ctx, .1, st.tk % 5 === 0);
}
function startLoop(st, ctx) {
  const tok = ++loopTok;
  const step = () => { if (tok !== loopTok || st.phase === 'over') return; try { tick(st, ctx); } catch (e) { console.error(e); } ctx.later(100, step); };
  ctx.later(100, step);
}

const RULES = {
  setup(players, opts, ctx) {
    opts = opts || {};
    const n = players.length;
    let mapId = opts.harita === 'luna' ? 'luna' : opts.harita === 'rastgele' ? pickR(MAP_IDS) : 'kar';
    let nT = optNum(opts.hain, [1, 2], 1); const wanted2 = nT === 2;
    if (n < 6) nT = 1;
    const m = MAPS[mapId];
    const seats = shuf(players.map((_, i) => i));
    let traitors = seats.slice(0, nT);
    if (HK.force && HK.force.length) traitors = HK.force.filter(i => i < n).slice(0, 2);
    nT = traitors.length;
    const tasksPer = optNum(opts.gorev, [4, 6, 8], 6);
    const st = {
      players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })),
      mapId, nT, tasksPer, cdMs: optNum(opts.cd, [20, 30, 45], 30) * 1000, talkMs: optNum(opts.toplanti, [45, 60, 90], 60) * 1000, voteMs: 30000,
      reveal: opts.acik !== '0',
      role: players.map((_, i) => traitors.includes(i) ? 'T' : 'C'),
      alive: players.map(() => true), pubOut: players.map(() => false), left: players.map(() => false), ejected: players.map(() => false),
      online: players.map(() => true), offSince: players.map(() => 0), frozenBy: players.map(() => -1),
      tasks: players.map(() => shuf(m.stations.map((_, k) => k)).slice(0, tasksPer).map(s => ({ s, done: false }))),
      taskDone: 0, taskTotal: 0,
      pos: players.map(() => ({ x: m.button.x, y: m.button.y + 150, h: 0, mv: 0, t: Date.now() })), tpN: players.map(() => 0),
      cd: players.map(() => 0), emerg: players.map(() => 1), sabReadyAt: 0, btnReadyAt: 0,
      bodies: [], sab: null, meeting: null, eject: null, meetN: 0,
      chat: [], chatSeq: 0, lastChat: players.map(() => 0),
      stats: players.map(() => ({ tasks: 0, freezes: 0, correct: 0 })),
      bots: players.map(p => p.isBot ? { path: [], goal: null, wait: 0, doing: null, sus: {}, seen: {}, wit: -1, skipBias: 0, lastRoom: '', said: 0 } : null),
      phase: 'intro', pid: 0, endsAt: 0, dur: 1, winner: null, why: '', wanted2
    };
    st.taskTotal = st.role.filter(r => r === 'C').length * tasksPer;
    gather(st);
    setPhase(st, 'intro', INTRO_MS);
    ctx.emit({ t: 'intro' }, `🚨 Hain Kim? · ${m.icon} ${m.name} · ${n} oyuncu, ${nT} hain.${wanted2 && nT === 1 ? ' (2 hain için en az 6 oyuncu gerekir.)' : ''}`, 'gold');
    arm(st, ctx); startLoop(st, ctx);
    return st;
  },
  action(st, pi, a, ctx) {
    const now = Date.now(), m = mapOf(st), me = st.pos[pi];
    const near = (x, y, r) => me && dist(me.x, me.y, x, y) <= r + SLACK;
    switch (a.t) {
      case 'task': {
        if (st.phase !== 'play' || st.left[pi]) return;
        const k = a.k | 0, tk = st.tasks[pi][k]; if (!tk || tk.done) return;
        const s = m.stations[tk.s]; if (!near(s.x, s.y, USE_R)) { ctx.emit({ t: 'far', pi }); return; }
        completeTask(st, pi, k, ctx); return;
      }
      case 'freeze': {
        const tg = a.pi | 0;
        if (st.phase !== 'play' || !isT(st, pi) || !st.alive[pi] || now < st.cd[pi] - 150) return;
        if (!st.players[tg] || tg === pi || !st.alive[tg] || isT(st, tg)) return;
        const tp = st.pos[tg]; if (!near(tp.x, tp.y, FREEZE_R)) { ctx.emit({ t: 'far', pi }); return; }
        doFreeze(st, pi, tg, ctx); return;
      }
      case 'report': {
        if (st.phase !== 'play' || !st.alive[pi]) return;
        const b = st.bodies.find(x => x.pi === (a.pi | 0)); if (!b || !near(b.x, b.y, REPORT_R)) return;
        startMeeting(st, ctx, pi, 'body', b.pi); return;
      }
      case 'emerg': {
        if (st.phase !== 'play' || !st.alive[pi] || st.emerg[pi] <= 0 || now < st.btnReadyAt) return;
        if (st.sab && st.sab.k === 'reactor') return;
        if (!near(m.button.x, m.button.y, BUTTON_R)) return;
        st.emerg[pi]--; startMeeting(st, ctx, pi, 'button', null); return;
      }
      case 'vent': {
        if (st.phase !== 'play' || !isT(st, pi) || !st.alive[pi]) return;
        const v = m.vents[a.from | 0], to = a.to | 0; if (!v || !v.l.includes(to) || !near(v.x, v.y, VENT_R)) return;
        const w = m.vents[to]; teleport(st, pi, w.x, w.y + 14);
        ctx.emit({ t: 'vent', x1: v.x, y1: v.y, x2: w.x, y2: w.y }); ctx.sync(); return;
      }
      case 'sab': {
        if (st.phase !== 'play' || !isT(st, pi) || !st.alive[pi] || st.sab || now < st.sabReadyAt) return;
        if (a.k !== 'lights' && a.k !== 'reactor') return;
        startSab(st, pi, a.k, ctx); return;
      }
      case 'fix': {
        if (st.phase !== 'play' || !st.alive[pi] || !st.sab || st.sab.k !== 'lights' || !near(m.lights.x, m.lights.y, USE_R)) return;
        endSab(st, ctx, `${pname(st, pi)} şalterleri kaldırdı`); return;
      }
      case 'hold': {
        if (st.phase !== 'play' || !st.alive[pi] || !st.sab || st.sab.k !== 'reactor') return;
        const k = a.p === 1 ? 1 : 0, P = m.reactor[k], sb = st.sab;
        if (a.on) { if (!near(P.x, P.y, USE_R)) return; if (sb.holds[1 - k] === pi) sb.holds[1 - k] = -1; sb.holds[k] = pi; }
        else if (sb.holds[k] === pi) sb.holds[k] = -1;
        if (sb.holds[0] >= 0 && sb.holds[1] >= 0 && sb.holds[0] !== sb.holds[1]) endSab(st, ctx, `${pname(st, sb.holds[0])} ve ${pname(st, sb.holds[1])} başardı`);
        else ctx.sync();
        return;
      }
      case 'chat': {
        const tx = String(a.tx || '').replace(/\s+/g, ' ').trim().slice(0, 120); if (!tx) return;
        if (now - st.lastChat[pi] < 700) return;
        const ghost = !st.alive[pi];
        if (!ghost && st.phase !== 'meeting' && st.phase !== 'vote') return;
        st.lastChat[pi] = now;
        const msg = addChat(st, { pi, tx, g: ghost ? 1 : 0 });
        ctx.emit({ t: 'chat', m: ghost ? null : msg });
        if (!ghost) botsHear(st, ctx, pi, tx);
        ctx.sync(); return;
      }
      case 'vote': {
        if (st.phase !== 'vote' || !st.alive[pi] || st.meeting.votes[pi] !== undefined) return;
        const v = a.v | 0; if (v !== -1 && (!st.players[v] || !st.alive[v])) return;
        st.meeting.votes[pi] = v;
        ctx.emit({ t: 'voted', pi });
        if (allVoted(st)) { const pid = st.pid; ctx.later(900, () => { if (st.pid === pid) tally(st, ctx); }); }
        ctx.sync(); return;
      }
      default: return;
    }
  },
  view(st, viewer) {
    const n = st.players.length, me = Number.isInteger(viewer) && viewer >= 0 && viewer < n ? viewer : -1;
    const over = st.phase === 'over', ghost = me >= 0 && !st.alive[me], traitor = me >= 0 && isT(st, me);
    const truth = over || ghost || traitor || me < 0;
    const now = Date.now(), m = mapOf(st);
    const v = {
      phase: st.phase, mapId: st.mapId, me, endsAt: st.endsAt, dur: st.dur, nT: st.nT, tasksPer: st.tasksPer,
      role: me < 0 ? 'spect' : (traitor ? 'traitor' : 'crew'), alive: me >= 0 && st.alive[me], left: me >= 0 && st.left[me],
      opts: { cd: st.cdMs / 1000, talk: st.talkMs / 1000, vote: st.voteMs / 1000, reveal: st.reveal },
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, online: st.online[i] !== false && !st.left[i],
        out: truth ? !st.alive[i] : st.pubOut[i], ej: st.ejected[i], left: st.left[i] })),
      taskPct: st.taskTotal ? clamp(st.taskDone / st.taskTotal, 0, 1) : 1,
      bodies: st.bodies.map(b => ({ pi: b.pi, x: b.x, y: b.y })),
      sab: st.sab ? { k: st.sab.k, endsAt: st.sab.endsAt || 0, holds: st.sab.holds ? st.sab.holds.map(h => h >= 0) : null, mine: st.sab.holds ? st.sab.holds.map(h => h === me) : null } : null,
      pos: {}, tp: null, chat: [], meeting: null, eject: null
    };
    st.players.forEach((_, i) => { if (st.alive[i] || truth) { const p = st.pos[i]; v.pos[i] = { x: p.x, y: p.y, h: p.h, g: st.alive[i] ? 0 : 1, n: st.tpN[i] }; } });
    if (me >= 0) {
      const p = st.pos[me];
      v.tp = { n: st.tpN[me], x: p.x, y: p.y };
      v.tasks = st.tasks[me].map(t => ({ s: t.s, done: t.done, gone: !!t.gone }));
      v.emerg = st.emerg[me]; v.btnReadyAt = st.btnReadyAt;
      if (traitor) { v.mates = st.players.map((_, i) => isT(st, i) && i !== me ? i : -1).filter(i => i >= 0); v.cdAt = st.cd[me]; v.sabReadyAt = st.sabReadyAt; }
      if (ghost && st.frozenBy[me] >= 0) v.frozenBy = st.frozenBy[me];
      v.stats = st.stats[me];
    }
    v.chat = st.chat.filter(c => !c.g || ghost || me < 0 || over).slice(-50);
    if (st.meeting) {
      const mt = st.meeting;
      v.meeting = { caller: mt.caller, reason: mt.reason, body: mt.body, n: mt.n, voted: st.players.map((_, i) => mt.votes[i] !== undefined), myVote: me >= 0 && mt.votes[me] !== undefined ? mt.votes[me] : null };
      if (mt.revealed) v.meeting.votes = Object.assign({}, mt.votes);
    }
    if (st.phase === 'eject' && st.eject) {
      const e = st.eject;
      v.eject = { pi: e.pi, why: e.why, traitor: st.reveal ? e.traitor : null, left: st.reveal ? e.left : null, at: e.at, cnt: e.cnt, skip: e.skip };
    }
    if (over) {
      v.winner = st.winner; v.why = st.why;
      v.roles = st.role.slice(); v.allStats = st.stats.map(s => Object.assign({}, s));
    }
    v.now = now; v.vents = traitor || over ? m.vents.length : 0;
    return v;
  },
  turnOf() { return null; },
  skipTurn() { /* gerçek zamanlı: kopmalar onPresence + tick ile işlenir */ },
  botAct() { /* bilgisayar oyuncular tick döngüsüyle oynar */ },
  botDelay: 900,
  onPresence(st, pi, online, ctx) {
    st.online[pi] = online; st.offSince[pi] = online ? 0 : Date.now();
    ctx.sync();
  },
  resume(st, ctx) {
    if (st.phase === 'over') { arm(st, ctx); return; }
    const now = Date.now();
    st.players.forEach((_, i) => { st.pos[i].t = now; if (!st.players[i].isBot && st.online[i] === false) st.offSince[i] = now; });
    arm(st, ctx); startLoop(st, ctx);
    if (st.phase === 'meeting') scheduleBotTalk(st, ctx);
    if (st.phase === 'vote') scheduleBotVotes(st, ctx);
  }
};
function addChat(st, m) { m.id = ++st.chatSeq; m.at = Date.now(); st.chat.push(m); if (st.chat.length > 60) st.chat.splice(0, st.chat.length - 60); return m; }

/* ------------------------------------------------------------------ BİLGİSAYAR OYUNCULAR */
function setGoal(st, pi, goal) {
  const b = st.bots[pi], p = st.pos[pi], m = mapOf(st);
  b.goal = goal; b.doing = null;
  b.path = st.alive[pi] ? findPath(m, p.x, p.y, goal.x, goal.y) : [[goal.x, goal.y]];
  b.repath = Date.now() + 900;
}
function botMove(st, pi, dt) {
  const b = st.bots[pi], p = st.pos[pi];
  if (!b.path.length) { if (p.mv) { p.mv = 0; localRemote(pi); } return true; }
  const sp = (st.alive[pi] ? BOT_SPEED : GHOST_SPEED * .8) * dt;
  let left = sp;
  while (left > 0 && b.path.length) {
    const [tx, ty] = b.path[0], d = dist(p.x, p.y, tx, ty);
    if (d <= left) { p.x = tx; p.y = ty; b.path.shift(); left -= d; }
    else { p.h = Math.atan2(ty - p.y, tx - p.x); p.x += (tx - p.x) / d * left; p.y += (ty - p.y) / d * left; left = 0; }
  }
  p.mv = 1; p.t = Date.now();
  localRemote(pi);
  return !b.path.length;
}
function nearestBody(st, pi) {
  let best = null, bd = 1e9; const p = st.pos[pi];
  for (const b of st.bodies) { if (!canSee(st, pi, b.x, b.y)) continue; const d = dist(p.x, p.y, b.x, b.y); if (d < bd) { bd = d; best = b; } }
  return best;
}
function witnesses(st, tr, tg) {
  const P = st.pos[tr], Q = st.pos[tg];
  return st.players.some((_, i) => i !== tg && i !== tr && st.alive[i] && !isT(st, i) && (canSee(st, i, P.x, P.y) || canSee(st, i, Q.x, Q.y)));
}
function botsStep(st, ctx, dt, memo) {
  const now = Date.now(), m = mapOf(st);
  // reaktör: en yakın iki canlı bot paneli tutar
  const reactorAssign = {};
  if (st.sab && st.sab.k === 'reactor') {
    const cand = st.players.map((p, i) => i).filter(i => st.players[i].isBot && st.alive[i] && !isT(st, i));
    const used = new Set();
    [0, 1].forEach(k => { const h = st.sab.holds[k]; if (h >= 0) { used.add(h); if (st.players[h].isBot) reactorAssign[h] = k; } });
    [0, 1].forEach(k => {
      if (st.sab.holds[k] >= 0) return;
      const P = m.reactor[k];
      const c = cand.filter(i => !used.has(i)).sort((a, b2) => dist(st.pos[a].x, st.pos[a].y, P.x, P.y) - dist(st.pos[b2].x, st.pos[b2].y, P.x, P.y))[0];
      if (c != null) { reactorAssign[c] = k; used.add(c); }
    });
  }
  let lightsFixer = -1;
  if (st.sab && st.sab.k === 'lights') {
    const cand = st.players.map((p, i) => i).filter(i => st.players[i].isBot && st.alive[i] && !isT(st, i));
    cand.sort((a, b2) => dist(st.pos[a].x, st.pos[a].y, m.lights.x, m.lights.y) - dist(st.pos[b2].x, st.pos[b2].y, m.lights.x, m.lights.y));
    if (cand.length) lightsFixer = cand[0];
  }
  for (let pi = 0; pi < st.players.length; pi++) {
    if (st.phase !== 'play') return;
    if (!st.players[pi].isBot) continue;
    const b = st.bots[pi], p = st.pos[pi];
    if (memo && st.alive[pi] && !isT(st, pi)) st.players.forEach((_, j) => { if (j !== pi && st.alive[j] && canSee(st, pi, st.pos[j].x, st.pos[j].y)) b.seen[j] = [Math.round(st.pos[j].x), Math.round(st.pos[j].y), now]; });
    if (b.wait > now) continue;
    if (st.alive[pi] && isT(st, pi)) { botTraitor(st, ctx, pi, dt); continue; }
    // canlı mürettebat
    if (st.alive[pi]) {
      const body = nearestBody(st, pi);
      if (body) {
        if (dist(p.x, p.y, body.x, body.y) <= REPORT_R - 10) { startMeeting(st, ctx, pi, 'body', body.pi); return; }
        if (!b.goal || b.goal.k !== 'report' || b.goal.pi !== body.pi) setGoal(st, pi, { k: 'report', pi: body.pi, x: body.x, y: body.y });
        botMove(st, pi, dt); continue;
      }
      if (reactorAssign[pi] != null) {
        const k = reactorAssign[pi], P = m.reactor[k];
        if (!b.goal || b.goal.k !== 'hold' || b.goal.p !== k) setGoal(st, pi, { k: 'hold', p: k, x: P.x, y: P.y + 30 });
        if (botMove(st, pi, dt) || dist(p.x, p.y, P.x, P.y) < USE_R - 10) {
          if (st.sab && st.sab.holds[k] !== pi) RULES.action(st, pi, { t: 'hold', p: k, on: true }, ctx);
        }
        continue;
      }
      if (pi === lightsFixer) {
        if (!b.goal || b.goal.k !== 'fix') setGoal(st, pi, { k: 'fix', x: m.lights.x, y: m.lights.y + 30 });
        if (botMove(st, pi, dt) || dist(p.x, p.y, m.lights.x, m.lights.y) < USE_R - 10) {
          if (!b.doing) b.doing = { k: 'fix', until: now + rnd(1800, 3200) };
          else if (now >= b.doing.until) { b.doing = null; RULES.action(st, pi, { t: 'fix' }, ctx); }
        }
        continue;
      }
      if (b.goal && (b.goal.k === 'hold' || b.goal.k === 'fix' || b.goal.k === 'report')) b.goal = null;
    }
    // görevler (hayaletler de yapar)
    if (st.left[pi]) continue;
    botTasks(st, ctx, pi, dt);
  }
}
function botTasks(st, ctx, pi, dt) {
  const b = st.bots[pi], p = st.pos[pi], m = mapOf(st), now = Date.now();
  if (b.doing) {
    if (now >= b.doing.until) {
      const k = b.doing.k; b.doing = null; b.goal = null;
      if (typeof k === 'number') { completeTask(st, pi, k, ctx); b.wait = now + rnd(200, 900); }
    }
    return;
  }
  if (!b.goal || (b.goal.k !== 'task' && b.goal.k !== 'wander')) {
    const todo = st.tasks[pi].map((t, k) => ({ t, k })).filter(o => !o.t.done);
    if (todo.length) {
      todo.sort((a, c) => dist(p.x, p.y, m.stations[a.t.s].x, m.stations[a.t.s].y) - dist(p.x, p.y, m.stations[c.t.s].x, m.stations[c.t.s].y));
      const o = Math.random() < .75 ? todo[0] : pickR(todo), s = m.stations[o.t.s];
      setGoal(st, pi, { k: 'task', i: o.k, x: s.x + rnd(-14, 14), y: s.y + rnd(18, 34) });
    } else { const r = pickR(m.rooms); setGoal(st, pi, { k: 'wander', x: r.x + rnd(60, r.w - 60), y: r.y + rnd(60, r.h - 60) }); }
  }
  const arrived = botMove(st, pi, dt);
  if (arrived || (b.goal.k === 'task' && dist(p.x, p.y, m.stations[st.tasks[pi][b.goal.i].s].x, m.stations[st.tasks[pi][b.goal.i].s].y) < USE_R - 20)) {
    if (b.goal.k === 'task') { b.path = []; b.doing = { k: b.goal.i, until: now + rnd(2600, 5200) / HK.speed }; p.mv = 0; localRemote(pi); }
    else { b.goal = null; b.wait = now + rnd(800, 2500); }
  }
}
function botTraitor(st, ctx, pi, dt) {
  const b = st.bots[pi], p = st.pos[pi], m = mapOf(st), now = Date.now();
  const crew = st.players.map((_, i) => i).filter(i => st.alive[i] && !isT(st, i));
  // sabotaj
  if (!st.sab && now >= st.sabReadyAt && crew.length > 1 && Math.random() < .0045 * HK.speed) { startSab(st, pi, Math.random() < .62 ? 'lights' : 'reactor', ctx); return; }
  if (!b.huntAt || b.huntAt < st.cd[pi]) b.huntAt = st.cd[pi] + rnd(1500, 9000);
  const ready = now >= st.cd[pi] && now >= b.huntAt;
  if (ready) {
    const tg = crew.filter(i => dist(p.x, p.y, st.pos[i].x, st.pos[i].y) <= FREEZE_R - 15 && los(m, p.x, p.y - 12, st.pos[i].x, st.pos[i].y - 12))
      .sort((a, c) => dist(p.x, p.y, st.pos[a].x, st.pos[a].y) - dist(p.x, p.y, st.pos[c].x, st.pos[c].y))[0];
    if (tg != null && (!witnesses(st, pi, tg) || Math.random() < .002)) {
      doFreeze(st, pi, tg, ctx);
      if (st.phase !== 'play') return;
      // kaç: yakında tünel varsa kullan
      const vi = m.vents.map((v, k) => [k, dist(p.x, p.y, v.x, v.y)]).sort((a, c) => a[1] - c[1])[0];
      if (vi && vi[1] < 420 && Math.random() < .6) setGoal(st, pi, { k: 'vent', v: vi[0], x: m.vents[vi[0]].x, y: m.vents[vi[0]].y + 14 });
      else { const r = pickR(m.rooms.filter(rr => !roomAt(m, p.x, p.y) || rr.id !== roomAt(m, p.x, p.y).id)); setGoal(st, pi, { k: 'wander', x: r.x + r.w / 2, y: r.y + r.h / 2 + 40 }); }
      b.doing = null;
      return;
    }
    // av: yalnız kalan birine yaklaş
    if (!b.goal || b.goal.k !== 'hunt' || now > b.repath) {
      const lone = crew.filter(i => !crew.some(j => j !== i && dist(st.pos[i].x, st.pos[i].y, st.pos[j].x, st.pos[j].y) < 380))
        .sort((a, c) => dist(p.x, p.y, st.pos[a].x, st.pos[a].y) - dist(p.x, p.y, st.pos[c].x, st.pos[c].y));
      const t = lone.length ? lone[0] : (Math.random() < .3 ? pickR(crew) : null);
      if (t != null) { setGoal(st, pi, { k: 'hunt', pi: t, x: st.pos[t].x, y: st.pos[t].y }); b.doing = null; }
    }
  }
  if (b.doing) { if (now >= b.doing.until) { b.doing = null; b.goal = null; } return; }
  if (!b.goal) {
    const s = pickR(m.stations);
    setGoal(st, pi, { k: 'fake', x: s.x + rnd(-14, 14), y: s.y + rnd(18, 34) });
  }
  const arrived = botMove(st, pi, dt);
  if (arrived) {
    if (b.goal.k === 'vent') { const v = m.vents[b.goal.v]; const to = pickR(v.l); RULES.action(st, pi, { t: 'vent', from: b.goal.v, to }, ctx); b.goal = null; b.wait = now + rnd(400, 900); }
    else if (b.goal.k === 'fake') { b.doing = { k: 'fake', until: now + rnd(2500, 5000) }; p.mv = 0; localRemote(pi); }
    else b.goal = null;
  }
}
// Rapor anında: cesedin yakınında görülenler şüpheli olur
function botsAtReport(st, caller, body) {
  const now = Date.now();
  const bodies = st.bodies.slice();
  st.players.forEach((pl, i) => {
    if (!pl.isBot || isT(st, i)) return;
    const b = st.bots[i];
    for (const bd of bodies) for (const j of Object.keys(b.seen)) {
      const [x, y, t] = b.seen[j]; if (+j === i || now - t > 25000) continue;
      const d = dist(x, y, bd.x, bd.y); if (d < 420) b.sus[j] = (b.sus[j] || 0) + 12 + 30 * (1 - d / 420) * (1 - (now - t) / 25000);
    }
    if (caller !== i && body != null) b.sus[caller] = (b.sus[caller] || 0) - 4;
  });
}
function botSay(st, ctx, pi, tx) {
  if (st.phase !== 'meeting' && st.phase !== 'vote') return;
  if (!st.alive[pi]) return;
  const msg = addChat(st, { pi, tx, g: 0 });
  ctx.emit({ t: 'chat', m: msg }); ctx.sync();
}
function topSus(st, pi) {
  const b = st.bots[pi]; let best = -1, bv = -1e9;
  Object.keys(b.sus).forEach(k => { const j = +k; if (j === pi || !st.alive[j]) return; if (b.sus[k] > bv) { bv = b.sus[k]; best = j; } });
  return [best, bv];
}
function scheduleBotTalk(st, ctx) {
  const pid = st.pid;
  st.players.forEach((pl, i) => {
    if (!pl.isBot || !st.alive[i]) return;
    const b = st.bots[i];
    if (Math.random() > (b.wit >= 0 || st.meeting.caller === i ? 1 : .75)) return;
    ctx.later(rnd(1500, Math.min(9000, st.talkMs - 3000)) / HK.speed, () => {
      if (st.pid !== pid || !st.alive[i]) return;
      const room = b.lastRoom || 'Koridor';
      let tx;
      const crewNames = st.players.map((_, j) => j).filter(j => j !== i && st.alive[j] && !isT(st, j));
      if (isT(st, i)) tx = pickR([`Ben ${room} tarafındaydım, görev yapıyordum.`, crewNames.length ? `${pname(st, pickR(crewNames))} biraz garip dolaşıyordu… 🤔` : 'Ben bir şey görmedim.', 'Kanıt yok, bence atlayalım.', `${room} çok sessizdi, kimseyi görmedim.`]);
      else if (b.wit >= 0 && st.alive[b.wit]) tx = pickR([`${pname(st, b.wit)} dondurdu! Kendi gözümle gördüm! 😱`, `Gördüm! ${pname(st, b.wit)} hain!`]);
      else {
        const [j, s] = topSus(st, i);
        if (st.meeting.caller === i && st.meeting.reason === 'body') tx = `Donmuş oyuncuyu ${room} tarafında buldum! ${j >= 0 && s > 20 ? pname(st, j) + ' oralardaydı.' : ''}`;
        else if (j >= 0 && s > 22) tx = pickR([`${pname(st, j)} oralardaydı, bence şüpheli.`, `Bence ${pname(st, j)}. Az önce o taraftan geliyordu.`]);
        else tx = pickR([`Ben ${room} odasındaydım, görev yapıyordum.`, 'Hiçbir şey görmedim 🤷', 'Kanıt yok, bence atlayalım.', `${room} tarafında kimse yoktu.`]);
      }
      botSay(st, ctx, i, tx);
    });
  });
}
function scheduleBotVotes(st, ctx) {
  const pid = st.pid;
  st.players.forEach((pl, i) => {
    if (!pl.isBot || !st.alive[i]) return;
    ctx.later(rnd(2500, Math.min(14000, st.voteMs - 4000)) / HK.speed, () => {
      if (st.pid !== pid || st.phase !== 'vote' || !st.alive[i] || st.meeting.votes[i] !== undefined) return;
      const b = st.bots[i], votes = st.meeting.votes;
      let v = -1;
      if (isT(st, i)) {
        const c = {}; Object.values(votes).forEach(x => { if (x >= 0 && !isT(st, x)) c[x] = (c[x] || 0) + 1; });
        const best = Object.keys(c).sort((a, z) => c[z] - c[a])[0];
        if (best != null && Math.random() < .7) v = +best;
        else if (Math.random() < .2) { const cr = st.players.map((_, j) => j).filter(j => st.alive[j] && !isT(st, j)); if (cr.length) v = pickR(cr); }
      } else {
        const [j, s] = topSus(st, i), noise = rnd(-8, 8);
        if (j >= 0 && s + noise >= 35 - b.skipBias * 4) v = j;
        else if (j >= 0 && s > 10 && Object.values(votes).filter(x => x === j).length >= 1 && Math.random() < .45) v = j;
      }
      RULES.action(st, i, { t: 'vote', v }, ctx);
    });
  });
}
// İnsan oyuncunun sohbeti botları etkiler: isim + suçlama kelimesi → şüphe
function botsHear(st, ctx, pi, tx) {
  const low = trLow(tx), acc = /hain|şüpheli|supheli|gördüm|gordum|dondurdu|yalan|o yaptı|bence/.test(low);
  const named = st.players.map((p, j) => j).filter(j => j !== pi && low.includes(trLow(st.players[j].name)));
  st.players.forEach((pl, i) => {
    if (!pl.isBot || i === pi || !st.alive[i]) return;
    const b = st.bots[i];
    if (/atla|geç|kanıt yok/.test(low)) b.skipBias++;
    named.forEach(j => {
      if (j === i) {
        if (acc && !b.defended && st.phase !== 'eject') { b.defended = 1; const pid = st.pid; ctx.later(rnd(1200, 2600), () => { if (st.pid === pid) botSay(st, ctx, i, pickR(['Ben değilim! 😤', 'Hayır, ben görev yapıyordum!', `Neden ben? ${pname(st, pi)} asıl sen şüphelisin!`])); b.defended = 0; }); if (!isT(st, i)) b.sus[pi] = (b.sus[pi] || 0) + 8; }
        return;
      }
      if (acc && !isT(st, i)) b.sus[j] = (b.sus[j] || 0) + (st.players[pi].isBot ? 10 : 18);
    });
  });
}

/* ------------------------------------------------------------------ ÇİZİM (her cihaz) */
const D = {
  circle(g, x, y, r, fill, stroke, lw) { g.beginPath(); g.arc(x, y, r, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } },
  ell(g, x, y, rx, ry, fill, stroke, lw, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } },
  rr(g, x, y, w, h, r, fill, stroke, lw) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } },
  text(g, s, x, y, size, fill, stroke, font) { g.font = `${size}px ${font || '"Bungee","Arial Black","Segoe UI Black",sans-serif'}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if (stroke) { g.lineWidth = size * .22; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(s, x, y); } g.fillStyle = fill; g.fillText(s, x, y); },
  glow(g, x, y, r, col) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); },
  shadow(g, x, y, rx, ry, a = .22) { g.fillStyle = `rgba(20,10,40,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); },
  star(g, x, y, r, n, fill) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fillStyle = fill; g.fill(); },
  flake(g, x, y, r, col) { g.strokeStyle = col; g.lineWidth = Math.max(1, r * .18); g.lineCap = 'round'; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); } }
};

/* ---- zemin desenleri ---- */
function paintFloor(g, x, y, w, h, f, r) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = f.c1; g.fillRect(x, y, w, h);
  if (f.p === 'tile') {
    g.strokeStyle = f.c2; g.lineWidth = 3;
    for (let xx = x; xx <= x + w; xx += 40) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + h); g.stroke(); }
    for (let yy = y; yy <= y + h; yy += 40) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.35)'; for (let xx = x; xx < x + w; xx += 40) for (let yy = y; yy < y + h; yy += 40) g.fillRect(xx + 4, yy + 4, 8, 3);
  } else if (f.p === 'check') {
    g.fillStyle = f.c2; for (let xx = x, i = 0; xx < x + w; xx += 40, i++) for (let yy = y, j = 0; yy < y + h; yy += 40, j++) if ((i + j) % 2) g.fillRect(xx, yy, 40, 40);
  } else if (f.p === 'plank') {
    for (let yy = y, j = 0; yy < y + h; yy += 20, j++) {
      const off = (j * 53) % 120;
      g.fillStyle = j % 2 ? f.c2 : shade(f.c1, -.04); g.fillRect(x, yy, w, 20);
      g.strokeStyle = shade(f.c2, -.25); g.lineWidth = 2; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke();
      for (let xx = x - off; xx < x + w; xx += 120) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + 20); g.stroke(); }
      if (r() < .6) D.circle(g, x + r() * w, yy + 10, 2, shade(f.c2, -.3));
    }
  } else if (f.p === 'grate') {
    g.strokeStyle = f.c2; g.lineWidth = 4; g.lineCap = 'round';
    for (let xx = x, i = 0; xx < x + w; xx += 20, i++) for (let yy = y, j = 0; yy < y + h; yy += 20, j++) { g.beginPath(); if ((i + j) % 2) { g.moveTo(xx + 5, yy + 5); g.lineTo(xx + 15, yy + 13); } else { g.moveTo(xx + 15, yy + 5); g.lineTo(xx + 5, yy + 13); } g.stroke(); }
    g.strokeStyle = shade(f.c1, -.25); g.lineWidth = 2; for (let xx = x; xx <= x + w; xx += 80) g.strokeRect(xx, y - 2, 80, h + 4);
  } else if (f.p === 'concrete') {
    for (let i = 0; i < w * h / 600; i++) D.circle(g, x + r() * w, y + r() * h, r() * 2.4 + .6, r() < .5 ? f.c2 : shade(f.c1, .12));
    g.strokeStyle = shade(f.c2, -.15); g.lineWidth = 2; for (let xx = x; xx <= x + w; xx += 140) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + h); g.stroke(); }
  } else if (f.p === 'brick') {
    for (let yy = y, j = 0; yy < y + h; yy += 20, j++) for (let xx = x - (j % 2) * 20; xx < x + w; xx += 40) { D.rr(g, xx + 1.5, yy + 1.5, 37, 17, 4, (Math.floor(xx / 40) + j) % 3 ? f.c1 : f.c2); }
    g.globalCompositeOperation = 'destination-over'; g.fillStyle = shade(f.c2, -.2); g.fillRect(x, y, w, h); g.globalCompositeOperation = 'source-over';
  }
  g.restore();
}

/* ---- oda süsleri ---- */
const DECO = {
  gozlem(g, r, rm) {
    const cx = rm.x + rm.w / 2, cy = rm.y + rm.h / 2 + 10;
    D.circle(g, cx, cy, 110, '#3a2a6a'); D.circle(g, cx, cy, 104, '#241650');
    for (let i = 0; i < 40; i++) { const a = r() * TAU, d = r() * 95; D.star(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d, r() * 4 + 2, 5, r() < .5 ? '#ffe14a' : '#ffffff'); }
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 60, cy - 30); g.lineTo(cx - 10, cy - 50); g.lineTo(cx + 40, cy - 20); g.lineTo(cx + 70, cy + 30); g.stroke();
    // teleskop
    D.shadow(g, rm.x + 120, rm.y + 110, 46, 14);
    g.save(); g.translate(rm.x + 120, rm.y + 90); g.rotate(-.6); D.rr(g, -14, -60, 28, 90, 10, '#d9dee6', '#5b6370', 3); D.rr(g, -18, -70, 36, 18, 6, '#5aa2ff', '#27357a', 3); g.restore();
    D.circle(g, rm.x + 120, rm.y + 104, 12, '#5b6370');
    [[rm.x + 340, rm.y + 60], [rm.x + 380, rm.y + 270]].forEach(([x, y]) => { D.rr(g, x - 30, y - 18, 60, 36, 6, '#8fd8ff', '#27357a', 3); D.flake(g, x, y, 10, '#ffffff'); });
  },
  lab(g, r, rm) {
    [[1020, 220], [1260, 220]].forEach(([x, y]) => {
      D.shadow(g, x + 64, y + 66, 66, 10); D.rr(g, x, y, 120, 60, 8, '#ffffff', '#7a8aa3', 3); D.rr(g, x + 4, y + 4, 112, 14, 5, '#dfe9f6');
      const cols = ['#ff4f9a', '#2bd9c0', '#ffd84a', '#9b5cff'];
      for (let i = 0; i < 4; i++) { const fx = x + 18 + i * 28; D.rr(g, fx - 6, y + 22, 12, 24, 4, cols[i], shade(cols[i], -.4), 2); D.circle(g, fx, y + 22, 7, 'rgba(255,255,255,.7)', '#7a8aa3', 1.5); }
    });
    D.circle(g, 1200, 380, 26, '#c9f7ff', '#4fb7f0', 4); D.text(g, '🧪', 1200, 381, 24, '#000', null, 'sans-serif');
  },
  revir(g, r, rm) {
    [[1960, 220], [2120, 220]].forEach(([x, y]) => { D.shadow(g, x + 62, y + 66, 64, 10); D.rr(g, x, y, 120, 60, 10, '#ffffff', '#8aa', 3); D.rr(g, x + 4, y + 4, 34, 52, 10, '#e9f3ff'); D.rr(g, x + 40, y + 6, 76, 48, 8, '#7fe3c2', '#3aa98a', 2); });
    D.rr(g, 2050, 330, 60, 60, 10, '#ff5c7a'); D.rr(g, 2070, 336, 20, 48, 3, '#fff'); D.rr(g, 2056, 350, 48, 20, 3, '#fff');
  },
  reaktor(g, r, rm) {
    D.shadow(g, 330, 830, 96, 26);
    D.circle(g, 330, 810, 80, '#40506e', '#1d2742', 5); D.circle(g, 330, 810, 58, '#2bd9c0', '#0f6f73', 4);
    D.glow(g, 330, 810, 70, 'rgba(160,255,240,.6)'); D.circle(g, 330, 810, 24, '#e8fffb');
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; D.circle(g, 330 + Math.cos(a) * 70, 810 + Math.sin(a) * 70, 5, '#ffe14a', '#8a6a00', 1.5); }
    g.strokeStyle = '#5d6b85'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(410, 810); g.lineTo(540, 810); g.moveTo(330, 890); g.lineTo(330, 1000); g.stroke();
    g.strokeStyle = '#8392ad'; g.lineWidth = 5; g.stroke();
  },
  kumanda(g, r, rm) {
    for (let i = 0; i < 5; i++) { const x = 960 + i * 115; D.rr(g, x, 575, 90, 40, 6, '#27357a', '#101a45', 3); D.rr(g, x + 6, 580, 78, 28, 4, i % 2 ? '#2bd9c0' : '#5aa2ff'); for (let k = 0; k < 3; k++) g.fillRect(x + 12, 586 + k * 7, 30 + r() * 30, 3); }
    g.strokeStyle = 'rgba(80,110,160,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(1200, 800, 150, 0, TAU); g.stroke(); g.beginPath(); g.arc(1200, 800, 190, 0, TAU); g.setLineDash([12, 12]); g.stroke(); g.setLineDash([]);
  },
  kafeterya(g, r, rm) {
    [[1980, 740], [2160, 880]].forEach(([x, y]) => { D.shadow(g, x, y + 30, 46, 12); D.circle(g, x, y, 42, '#ffffff', '#c98a4f', 4); D.circle(g, x, y, 30, '#ffe7c2'); D.text(g, '🍲', x, y, 22, '#000', null, 'sans-serif');
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .6; D.circle(g, x + Math.cos(a) * 62, y + Math.sin(a) * 62, 13, '#ff7a59', '#a33a22', 2); } });
    D.rr(g, 1860, 620, 260, 34, 6, '#c98a4f', '#7a4a2a', 3); for (let i = 0; i < 5; i++) D.circle(g, 1890 + i * 50, 637, 10, ['#ffd84a', '#ff4f6d', '#5cc85a', '#fff', '#ff9a3c'][i], '#7a4a2a', 1.5);
  },
  depo(g, r, rm) {
    [[180, 1260, 100, 80]].forEach(([x, y, w, h]) => { D.shadow(g, x + w / 2, y + h + 4, w / 2 + 6, 10); D.rr(g, x, y, w, h, 6, '#c98a4f', '#7a4a2a', 3); g.strokeStyle = '#7a4a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + h); g.moveTo(x + w, y); g.lineTo(x, y + h); g.stroke(); });
    [[380, 1180], [420, 1210], [360, 1230]].forEach(([x, y], i) => { D.circle(g, x, y, 18, ['#ff7a59', '#5aa2ff', '#ffd84a'][i], '#333', 2.5); D.circle(g, x, y, 9, 'rgba(255,255,255,.35)'); });
    for (let i = 0; i < 6; i++) D.rr(g, 160 + i * 34, 1420, 26, 26, 4, ['#e0a868', '#b98a5a'][i % 2], '#7a4a2a', 2);
  },
  elektrik(g, r, rm) {
    for (let i = 0; i < 6; i++) { const x = 1040 + i * 70; D.rr(g, x, 1192, 52, 64, 6, '#c9ced6', '#5b6370', 3); D.rr(g, x + 8, 1200, 36, 20, 3, '#2d2d3a'); D.circle(g, x + 16, 1238, 5, i % 2 ? '#5cc85a' : '#ff4f6d'); D.circle(g, x + 36, 1238, 5, '#ffd84a'); }
    g.strokeStyle = '#ffd84a'; g.lineWidth = 4; g.setLineDash([16, 10]); g.beginPath(); g.moveTo(920, 1340); g.bezierCurveTo(1100, 1300, 1250, 1420, 1480, 1360); g.stroke(); g.setLineDash([]);
  },
  garaj(g, r, rm) {
    D.shadow(g, 2030, 1330, 80, 16);
    D.rr(g, 1960, 1240, 140, 80, 22, '#ff4f6d', '#8a1a3a', 4); D.rr(g, 1990, 1256, 60, 40, 12, '#2d2d3a'); D.rr(g, 2060, 1250, 30, 60, 8, '#ffd84a', '#8a6a00', 2);
    g.strokeStyle = '#5b6370'; g.lineWidth = 6; g.beginPath(); g.moveTo(1950, 1330); g.lineTo(2110, 1330); g.moveTo(1950, 1232); g.lineTo(2110, 1232); g.stroke();
    D.ell(g, 2150, 1420, 50, 18, 'rgba(40,40,60,.35)');
    [[2240, 1300], [2240, 1340]].forEach(([x, y]) => D.circle(g, x, y, 18, '#2d2d3a', '#000', 2));
  },
  meydan(g, r, rm) {
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 6; g.beginPath(); g.arc(1200, 790, 170, 0, TAU); g.stroke();
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; D.circle(g, 1200 + Math.cos(a) * 200, 790 + Math.sin(a) * 200, 6, ['#ffe14a', '#ff4f9a', '#2bd9c0'][i % 3]); D.glow(g, 1200 + Math.cos(a) * 200, 790 + Math.sin(a) * 200, 16, 'rgba(255,240,150,.5)'); }
    [[960, 990]].forEach(([x, y]) => { D.rr(g, x - 40, y - 10, 80, 22, 6, '#b5743f', '#5b3a1f', 3); });
  },
  atli(g, r, rm) {
    const cx = 390, cy = 350;
    D.shadow(g, cx, cy + 20, 104, 30);
    D.circle(g, cx, cy, 94, '#ff4f6d', '#8a1a3a', 4);
    g.save(); g.beginPath(); g.arc(cx, cy, 90, 0, TAU); g.clip(); g.fillStyle = '#fff3d6';
    for (let i = 0; i < 16; i += 2) { g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 92, i / 16 * TAU, (i + 1) / 16 * TAU); g.closePath(); g.fill(); } g.restore();
    for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; D.circle(g, cx + Math.cos(a) * 94, cy + Math.sin(a) * 94, 7, i % 2 ? '#ffe14a' : '#ff4f6d', '#8a1a3a', 1.5); }
    D.circle(g, cx, cy, 20, '#ffe14a', '#b5651d', 3); g.fillStyle = '#ff4f6d'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy - 40); g.lineTo(cx + 26, cy - 30); g.lineTo(cx, cy - 22); g.fill();
  },
  dolap(g, r, rm) {
    const cx = 1200, cy = 230;
    D.shadow(g, cx, cy + 40, 80, 20);
    g.strokeStyle = '#ffe3f2'; g.lineWidth = 4; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 62, cy + Math.sin(a) * 62); g.stroke(); }
    g.lineWidth = 7; g.beginPath(); g.arc(cx, cy, 62, 0, TAU); g.stroke();
    const cab = ['#ff4f6d', '#ffd84a', '#2bd9c0', '#3d6bff', '#ff9a3c', '#9b5cff'];
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + .13; D.rr(g, cx + Math.cos(a) * 62 - 9, cy + Math.sin(a) * 62 - 7, 18, 14, 5, cab[i % 6], '#4a2a6a', 2); }
    D.circle(g, cx, cy, 12, '#ffd84a', '#6a3fb5', 3);
  },
  korku(g, r, rm) {
    D.rr(g, 1900, 220, 80, 80, 10, '#2a1640', '#140a24', 3); D.text(g, '👻', 1940, 258, 40, '#000', null, 'sans-serif');
    D.rr(g, 2080, 340, 80, 60, 10, '#3a2a50', '#140a24', 3); D.text(g, '🕸️', 2120, 370, 34, '#000', null, 'sans-serif');
    for (let i = 0; i < 6; i++) D.glow(g, 1820 + r() * 420, 150 + r() * 300, 30, 'rgba(160,255,120,.25)');
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; [[1790, 130], [2250, 130]].forEach(([x, y]) => { for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + (x < 2000 ? 1 : -1) * (30 + k * 12), y + 60 - k * 12); g.stroke(); } });
  },
  gise(g, r, rm) {
    D.shadow(g, 300, 905, 70, 10); D.rr(g, 240, 840, 120, 60, 8, '#3d6bff', '#1a2a7a', 3); D.rr(g, 248, 846, 104, 18, 5, '#ffffff'); D.text(g, 'BİLET', 300, 856, 13, '#3d6bff');
    for (let i = 0; i < 6; i++) { D.circle(g, 140 + i * 60, 1000, 7, '#ffd84a', '#8a6a00', 2); if (i < 5) { g.strokeStyle = '#ff4f6d'; g.lineWidth = 4; g.beginPath(); g.moveTo(147 + i * 60, 1000); g.quadraticCurveTo(170 + i * 60, 1014, 193 + i * 60, 1000); g.stroke(); } }
  },
  arabalar(g, r, rm) {
    g.strokeStyle = '#ffe14a'; g.lineWidth = 6; g.setLineDash([20, 14]); g.strokeRect(1830, 670, 440, 380); g.setLineDash([]);
    D.rr(g, 1980, 800, 140, 120, 14, '#ffe14a', '#8a6a00', 4); D.text(g, 'BİP!', 2050, 860, 28, '#ff4f6d', '#8a1a3a');
    [[1880, 720, '#ff4f6d'], [2210, 760, '#2bd9c0'], [1900, 980, '#9b5cff'], [2200, 1000, '#ff9a3c']].forEach(([x, y, c]) => { D.shadow(g, x, y + 16, 34, 10); D.rr(g, x - 30, y - 20, 60, 40, 16, c, shade(c, -.4), 3); D.circle(g, x, y - 2, 10, '#2d2d3a'); g.strokeStyle = '#555'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y - 20); g.lineTo(x, y - 46); g.stroke(); D.circle(g, x, y - 48, 4, '#ffe14a'); });
  },
  pamuk(g, r, rm) {
    D.shadow(g, 400, 1366, 86, 10); D.rr(g, 320, 1300, 160, 60, 10, '#ff8fc8', '#a3306e', 3);
    [[360, 1316], [440, 1316]].forEach(([x, y]) => { D.circle(g, x, y + 10, 20, '#ffffff', '#ccc', 2); D.circle(g, x, y + 4, 16, '#ffc3e4'); D.circle(g, x - 6, y, 10, '#ffd9ef'); });
    for (let i = 0; i < 7; i++) { const x = 200 + i * 60; g.fillStyle = '#efe2c4'; g.fillRect(x - 2, 1440, 4, 24); D.circle(g, x, 1436, 12, ['#ff8fc8', '#9fd8ff', '#c9a0ff'][i % 3]); }
  },
  elektrikL(g, r, rm) {
    for (let i = 0; i < 4; i++) { const x = 1100 + i * 70; D.rr(g, x, 1232, 52, 64, 6, '#c9ced6', '#5b6370', 3); D.rr(g, x + 8, 1240, 36, 20, 3, '#2d2d3a'); D.circle(g, x + 26, 1278, 6, ['#5cc85a', '#ff4f6d', '#ffd84a', '#2bd9c0'][i]); }
    g.strokeStyle = '#ffd84a'; g.lineWidth = 4; g.setLineDash([14, 10]); g.beginPath(); g.moveTo(980, 1380); g.bezierCurveTo(1100, 1340, 1250, 1460, 1390, 1400); g.stroke(); g.setLineDash([]);
  },
  jenerator(g, r, rm) {
    [[1880, 1380], [2080, 1380]].forEach(([x, y]) => { D.shadow(g, x, y + 30, 58, 16); D.circle(g, x, y, 52, '#6b5a48', '#2d2219', 4); D.circle(g, x, y, 36, '#ffb627', '#7a4a00', 3); D.glow(g, x, y, 46, 'rgba(255,200,80,.45)'); D.text(g, '⚡', x, y + 2, 30, '#000', null, 'sans-serif'); });
    g.strokeStyle = '#5b4a3a'; g.lineWidth = 10; g.beginPath(); g.moveTo(1932, 1380); g.lineTo(2028, 1380); g.stroke();
  }
};

/* ---- istasyon, tünel, panel çizimleri ---- */
function drawStation(g, s) {
  const x = s.x, y = s.y - 6;
  D.shadow(g, x, y + 16, 26, 7, .25);
  if (s.t === 'kablo') { D.rr(g, x - 22, y - 20, 44, 36, 6, '#8a96ad', '#3b4660', 3); ['#ff4f6d', '#5aa2ff', '#ffd84a', '#5cc85a'].forEach((c, i) => D.rr(g, x - 16 + i * 9, y - 12, 6, 20, 2, c)); }
  else if (s.t === 'sayi') { D.rr(g, x - 20, y - 22, 40, 40, 6, '#2d2d3a', '#111', 3); for (let i = 0; i < 9; i++) D.rr(g, x - 14 + (i % 3) * 10, y - 16 + Math.floor(i / 3) * 10, 8, 8, 2, i === 4 ? '#2bd9c0' : '#c9ced6'); }
  else if (s.t === 'ibre') { D.circle(g, x, y - 4, 20, '#ffffff', '#3b4660', 3); g.strokeStyle = '#5cc85a'; g.lineWidth = 5; g.beginPath(); g.arc(x, y - 4, 13, -2.2, -1.2); g.stroke(); g.strokeStyle = '#ff4f6d'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 9, y - 14); g.stroke(); }
  else if (s.t === 'yukle') { D.rr(g, x - 22, y - 22, 44, 30, 5, '#27357a', '#101a45', 3); D.rr(g, x - 17, y - 18, 34, 20, 3, '#5aa2ff'); D.text(g, '⇧', x, y - 8, 14, '#ffffff', null, 'sans-serif'); D.rr(g, x - 6, y + 8, 12, 8, 2, '#5b6370'); }
  else if (s.t === 'cop') { D.rr(g, x - 18, y - 20, 36, 38, 6, '#5cc85a', '#22691a', 3); D.rr(g, x - 22, y - 26, 44, 10, 4, '#2f8f4e', '#22691a', 2); D.text(g, '♻', x, y, 16, '#ffffff', null, 'sans-serif'); }
  else if (s.t === 'termo') { D.circle(g, x, y - 4, 19, '#ffffff', '#3b4660', 3); g.lineWidth = 5; g.strokeStyle = '#5aa2ff'; g.beginPath(); g.arc(x, y - 4, 12, Math.PI * .8, Math.PI * 1.5); g.stroke(); g.strokeStyle = '#ff4f6d'; g.beginPath(); g.arc(x, y - 4, 12, Math.PI * 1.5, Math.PI * 2.2); g.stroke(); D.circle(g, x, y - 4, 5, '#3b4660'); }
}
function drawVent(g, v) {
  D.ell(g, v.x, v.y, 26, 17, '#5b6370', '#2d2d3a', 3);
  g.save(); g.beginPath(); g.ellipse(v.x, v.y, 22, 13, 0, 0, TAU); g.clip(); g.fillStyle = '#1b1b28'; g.fillRect(v.x - 24, v.y - 16, 48, 32);
  g.strokeStyle = '#8a96ad'; g.lineWidth = 3; for (let k = -16; k <= 16; k += 8) { g.beginPath(); g.moveTo(v.x + k, v.y - 14); g.lineTo(v.x + k, v.y + 14); g.stroke(); } g.restore();
}
function drawLightsPanel(g, p) {
  D.shadow(g, p.x, p.y + 14, 26, 7);
  D.rr(g, p.x - 22, p.y - 28, 44, 42, 6, '#ffe14a', '#5b4a00', 3);
  g.save(); g.beginPath(); g.rect(p.x - 20, p.y - 26, 40, 38); g.clip(); g.strokeStyle = '#2d2d3a'; g.lineWidth = 5; for (let k = -40; k < 40; k += 12) { g.beginPath(); g.moveTo(p.x + k, p.y + 14); g.lineTo(p.x + k + 20, p.y - 28); g.stroke(); } g.restore();
  D.rr(g, p.x - 12, p.y - 18, 24, 22, 4, '#2d2d3a'); D.text(g, '⚡', p.x, p.y - 7, 14, '#ffe14a', null, 'sans-serif');
}
function drawReactorPanel(g, p) {
  D.shadow(g, p.x, p.y + 14, 26, 7);
  D.rr(g, p.x - 20, p.y - 30, 40, 44, 8, '#3b4660', '#1d2742', 3); D.rr(g, p.x - 14, p.y - 24, 28, 30, 6, '#2bd9c0'); D.text(g, '✋', p.x, p.y - 9, 18, '#000', null, 'sans-serif');
}
function drawButtonTable(g, m) {
  const b = m.button;
  D.shadow(g, b.x, b.y + 22, b.r + 8, 22, .3);
  D.circle(g, b.x, b.y, b.r, '#b5743f', '#5b3a1f', 4); D.circle(g, b.x, b.y, b.r - 12, '#c98a4f');
  D.circle(g, b.x, b.y + 4, 30, '#5b6370', '#2d2d3a', 3);
}

/* ---- sahne: tüm harita bir kez tuvale çizilir ---- */
let sceneCache = {};
function buildScene(mapId) {
  if (sceneCache[mapId]) return sceneCache[mapId];
  const m = MAPS[mapId], T = m.theme;
  const k = Math.min(1.25, Math.max(1, (window.devicePixelRatio || 1) * .7));
  const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
  const g = c.getContext('2d'); g.scale(k, k);
  const r = mulberry(mapId === 'kar' ? 7 : 13);
  // dışarısı
  g.fillStyle = T.out; g.fillRect(0, 0, W, H);
  if (mapId === 'kar') {
    for (let i = 0; i < 70; i++) D.ell(g, r() * W, r() * H, 60 + r() * 120, 20 + r() * 40, T.out2);
    for (let i = 0; i < 260; i++) D.circle(g, r() * W, r() * H, r() * 3 + 1, '#ffffff');
    for (let i = 0; i < 60; i++) { const x = r() * W, y = r() * H; const [cx, cy] = cellOf(x, y); let near = false; for (let dy = -4; dy <= 4 && !near; dy++) for (let dx = -4; dx <= 4; dx++) { const nx = cx + dx, ny = cy + dy; if (nx >= 0 && ny >= 0 && nx < GW && ny < GH && m.walk[ny * GW + nx]) { near = true; break; } } if (near) continue; drawPine(g, x, y, 26 + r() * 20); }
  } else {
    for (let i = 0; i < 80; i++) D.ell(g, r() * W, r() * H, 50 + r() * 100, 20 + r() * 40, T.out2);
    for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * H; const [cx, cy] = cellOf(x, y); let near = false; for (let dy = -4; dy <= 4 && !near; dy++) for (let dx = -4; dx <= 4; dx++) { const nx = cx + dx, ny = cy + dy; if (nx >= 0 && ny >= 0 && nx < GW && ny < GH && m.walk[ny * GW + nx]) { near = true; break; } } if (near) continue; drawTree(g, x, y, 24 + r() * 18, r); }
    for (let i = 0; i < 160; i++) D.circle(g, r() * W, r() * H, 1.5, 'rgba(255,240,150,.5)');
  }
  // duvarlar: yürünebilir alanın 2 hücre çevresi
  const wall = new Uint8Array(GW * GH);
  for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) {
    if (m.walk[cy * GW + cx]) continue;
    let w = 0; for (let dy = -2; dy <= 2 && !w; dy++) for (let dx = -2; dx <= 2; dx++) { const nx = cx + dx, ny = cy + dy; if (nx >= 0 && ny >= 0 && nx < GW && ny < GH && m.walk[ny * GW + nx]) { w = 1; break; } }
    wall[cy * GW + cx] = w;
  }
  D.shadow(g, 0, 0, 0, 0);
  g.fillStyle = 'rgba(10,10,30,.25)';
  for (let i = 0; i < wall.length; i++) if (wall[i]) g.fillRect((i % GW) * CELL + 8, ((i / GW) | 0) * CELL + 10, CELL, CELL);
  g.fillStyle = T.wallTop;
  for (let i = 0; i < wall.length; i++) if (wall[i]) g.fillRect((i % GW) * CELL - .5, ((i / GW) | 0) * CELL - .5, CELL + 1, CELL + 1);
  // zemin
  m.halls.forEach(h => paintFloor(g, h[0], h[1], h[2], h[3], T.hall, r));
  m.rooms.forEach(rm => paintFloor(g, rm.x, rm.y, rm.w, rm.h, rm.floor, r));
  // ön yüzler (kuzey duvarları) ve dış çizgi
  for (let cy = 1; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) {
    const i = cy * GW + cx; if (!m.walk[i] || m.walk[i - GW]) continue;
    const x = cx * CELL, y = cy * CELL - CELL;
    const gr = g.createLinearGradient(0, y, 0, y + CELL); gr.addColorStop(0, shade(T.wallFace, .15)); gr.addColorStop(1, T.wallFace);
    g.fillStyle = gr; g.fillRect(x - .5, y, CELL + 1, CELL);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x - .5, y + CELL, CELL + 1, 5);
  }
  g.strokeStyle = T.wallEdge; g.lineWidth = 3; g.beginPath();
  for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) {
    const i = cy * GW + cx; if (!wall[i]) continue;
    const x = cx * CELL, y = cy * CELL, isOut = (nx, ny) => nx < 0 || ny < 0 || nx >= GW || ny >= GH || (!wall[ny * GW + nx] && !m.walk[ny * GW + nx]);
    if (isOut(cx, cy - 1)) { g.moveTo(x, y); g.lineTo(x + CELL, y); }
    if (isOut(cx, cy + 1)) { g.moveTo(x, y + CELL); g.lineTo(x + CELL, y + CELL); }
    if (isOut(cx - 1, cy)) { g.moveTo(x, y); g.lineTo(x, y + CELL); }
    if (isOut(cx + 1, cy)) { g.moveTo(x + CELL, y); g.lineTo(x + CELL, y + CELL); }
  }
  g.stroke();
  // yan duvar gölgeleri
  g.fillStyle = 'rgba(20,10,40,.12)';
  for (let cy = 0; cy < GH; cy++) for (let cx = 1; cx < GW; cx++) { const i = cy * GW + cx; if (m.walk[i] && !m.walk[i - 1]) g.fillRect(cx * CELL, cy * CELL, 8, CELL); }
  // oda adları, süsler
  m.rooms.forEach(rm => { if (DECO[rm.deco]) { g.save(); DECO[rm.deco](g, r, rm); g.restore(); } });
  m.rooms.forEach(rm => D.text(g, trUp(rm.n), rm.x + rm.w / 2, rm.y + rm.h - 22, 20, T.label));
  drawButtonTable(g, m);
  m.vents.forEach(v => drawVent(g, v));
  m.stations.forEach(s => drawStation(g, s));
  drawLightsPanel(g, m.lights); m.reactor.forEach(p => drawReactorPanel(g, p));
  const th = document.createElement('canvas'); th.width = 240; th.height = 160; const tg = th.getContext('2d');
  tg.fillStyle = 'rgba(10,6,30,.9)'; tg.fillRect(0, 0, 240, 160);
  const s = 240 / W; tg.fillStyle = mapId === 'kar' ? '#9fc3e6' : '#c38bff';
  m.halls.forEach(h => tg.fillRect(h[0] * s, h[1] * s, h[2] * s, h[3] * s));
  m.rooms.forEach(rm => { tg.fillRect(rm.x * s, rm.y * s, rm.w * s, rm.h * s); });
  tg.strokeStyle = 'rgba(255,255,255,.7)'; tg.lineWidth = 1; m.rooms.forEach(rm => tg.strokeRect(rm.x * s + .5, rm.y * s + .5, rm.w * s - 1, rm.h * s - 1));
  sceneCache[mapId] = { c, k, thumb: th };
  return sceneCache[mapId];
}
function drawPine(g, x, y, s) {
  D.shadow(g, x + 4, y + s * .9, s * .8, s * .25, .2);
  g.fillStyle = '#7a5a3a'; g.fillRect(x - s * .1, y + s * .4, s * .2, s * .5);
  for (let i = 0; i < 3; i++) { const yy = y - s * .6 + i * s * .4, ww = s * (.5 + i * .25); g.fillStyle = i % 2 ? '#2f8f6e' : '#3aa87f'; g.beginPath(); g.moveTo(x, yy - s * .35); g.lineTo(x + ww, yy + s * .35); g.lineTo(x - ww, yy + s * .35); g.closePath(); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x, yy - s * .35); g.lineTo(x + ww * .45, yy - s * .05); g.lineTo(x - ww * .45, yy - s * .05); g.closePath(); g.fill(); }
}
function drawTree(g, x, y, s, r) {
  D.shadow(g, x + 4, y + s * .6, s, s * .3, .3);
  D.circle(g, x, y, s, '#2f7a4e'); D.circle(g, x - s * .35, y - s * .3, s * .55, '#3d9a62'); D.circle(g, x + s * .3, y - s * .2, s * .4, '#48ad6e');
  if (r() < .5) for (let i = 0; i < 5; i++) D.circle(g, x + (r() - .5) * s * 1.4, y + (r() - .5) * s * 1.2, 2.5, ['#ffe14a', '#ff8fc8', '#7fe3ff'][i % 3]);
}

/* ---- yaratıklar: anten ya da hayvan kukuletalı yuvarlak bulutçuklar ---- */
function drawBlob(g, x, y, color, seat, o = {}) {
  const t = o.t || 0, walk = o.walk || 0, face = o.face == null ? 1 : o.face, hood = HOODS[seat % HOODS.length];
  const bob = o.ghost ? Math.sin(t / 300 + seat) * 4 : Math.abs(Math.sin(t / 90)) * 4 * walk;
  const S = o.s || 1;
  g.save(); g.translate(x, y); g.scale(S, S);
  if (o.alpha != null) g.globalAlpha = o.alpha;
  if (!o.ghost && !o.noShadow) D.shadow(g, 0, 0, 18, 6, .28);
  g.translate(0, -bob);
  // ayaklar
  if (!o.ghost) { const ph = Math.sin(t / 90) * walk * 4; D.ell(g, -8 + ph, -2, 7, 4.5, shade(color, -.35)); D.ell(g, 8 - ph, -2, 7, 4.5, shade(color, -.35)); }
  g.scale(face, 1);
  const lt = shade(color, .35), dk = shade(color, -.38);
  // kulak / anten (gövdenin arkası)
  if (hood === 'kedi') { [[-1], [1]].forEach(([s]) => { g.beginPath(); g.moveTo(s * 6, -36); g.lineTo(s * 18, -52); g.lineTo(s * 19, -30); g.closePath(); g.fillStyle = color; g.fill(); g.strokeStyle = dk; g.lineWidth = 2.5; g.stroke(); g.beginPath(); g.moveTo(s * 10, -37); g.lineTo(s * 17, -47); g.lineTo(s * 17, -34); g.fillStyle = '#ffb3d1'; g.fill(); }); }
  else if (hood === 'tavsan') { [[-1], [1]].forEach(([s]) => { D.ell(g, s * 9, -50, 6, 15, color, dk, 2.5, s * .2); D.ell(g, s * 9, -50, 3, 10, '#ffb3d1', null, 0, s * .2); }); }
  else if (hood === 'ayi') { [[-1], [1]].forEach(([s]) => { D.circle(g, s * 15, -38, 8, color, dk, 2.5); D.circle(g, s * 15, -38, 4, lt); }); }
  else { const sw = Math.sin(t / 200 + seat) * 3; g.strokeStyle = dk; g.lineWidth = 2.5; g.lineCap = 'round'; [[-1], [1]].forEach(([s]) => { g.beginPath(); g.moveTo(s * 6, -36); g.quadraticCurveTo(s * 10 + sw, -50, s * 13 + sw, -54); g.stroke(); D.circle(g, s * 13 + sw, -55, hood === 'anten2' ? 5.5 : 4.5, hood === 'anten2' ? '#ffe14a' : lt, dk, 2); }); }
  // gövde
  g.beginPath();
  if (o.ghost) { g.moveTo(-19, -22); g.bezierCurveTo(-19, -48, 19, -48, 19, -22); g.lineTo(19, -4); for (let i = 0; i < 4; i++) { const xx = 19 - (i + 1) * 9.5; g.quadraticCurveTo(xx + 4.75, -4 + (i % 2 ? -6 : 6) + Math.sin(t / 150 + i) * 2, xx, -4); } g.closePath(); }
  else g.ellipse(0, -22, 20, 19, 0, 0, TAU);
  const gr = g.createRadialGradient(-7, -32, 3, 0, -22, 24); gr.addColorStop(0, lt); gr.addColorStop(.55, color); gr.addColorStop(1, shade(color, -.18));
  g.fillStyle = gr; g.fill(); g.strokeStyle = dk; g.lineWidth = 2.5; g.stroke();
  D.ell(g, 2, -14, 11, 7, 'rgba(255,255,255,.28)');
  // yüz
  const look = o.look || 0, ex = 2 + look * 1.5;
  if (o.closed) { g.strokeStyle = '#1b0a2a'; g.lineWidth = 2.5; [[-5], [9]].forEach(([s]) => { g.beginPath(); g.arc(s + ex - 2, -27, 4, .2, Math.PI - .2); g.stroke(); }); }
  else {
    const blink = !o.ghost && ((t + seat * 777) % 3600) < 120;
    [[-5], [9]].forEach(([s]) => {
      if (blink) { g.strokeStyle = '#1b0a2a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(s + ex - 6, -27); g.lineTo(s + ex + 2, -27); g.stroke(); return; }
      D.ell(g, s + ex - 2, -27, 5, 6.2, '#ffffff', 'rgba(20,10,30,.55)', 1.2); D.circle(g, s + ex - 1 + look, -26.5, 2.8, '#1b0a2a'); D.circle(g, s + ex - .2 + look, -28, 1, '#ffffff');
    });
  }
  D.ell(g, -9 + ex, -19, 3.5, 2, 'rgba(255,120,170,.55)'); D.ell(g, 15 + ex, -19, 3.5, 2, 'rgba(255,120,170,.55)');
  g.strokeStyle = '#1b0a2a'; g.lineWidth = 2; g.beginPath(); if (o.sad) g.arc(2 + ex, -14, 3.5, Math.PI + .3, -.3); else g.arc(2 + ex, -20, 3.5, .3, Math.PI - .3); g.stroke();
  if (o.ghost) { g.strokeStyle = 'rgba(255,240,150,.95)'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(0, -58, 11, 4, 0, 0, TAU); g.stroke(); }
  g.restore();
}
function drawIce(g, x, y, color, seat, t) {
  g.save(); g.translate(x, y);
  D.shadow(g, 0, 2, 26, 8, .3);
  drawBlob(g, 0, -2, color, seat, { t: 0, closed: true, noShadow: true, s: .92 });
  const gr = g.createLinearGradient(-28, -64, 28, 4); gr.addColorStop(0, 'rgba(230,250,255,.82)'); gr.addColorStop(.5, 'rgba(160,220,255,.55)'); gr.addColorStop(1, 'rgba(120,190,255,.75)');
  D.rr(g, -28, -64, 56, 66, 12, gr, '#ffffff', 3);
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-20, -54); g.lineTo(-20, -30); g.moveTo(-13, -56); g.lineTo(-13, -46); g.stroke();
  g.strokeStyle = 'rgba(120,180,240,.8)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(10, -60); g.lineTo(4, -44); g.lineTo(14, -36); g.stroke();
  const tw = (t / 400) % 1; D.star(g, 18, -58 + 4 * Math.sin(t / 300), 5 + tw * 2, 4, '#ffffff'); D.star(g, -22, -6, 3.5, 4, '#e6f8ff');
  g.restore();
}

/* ------------------------------------------------------------------ ARAYÜZ (her cihaz) */
let root = null, ui = null, V = null, cv = null, cg = null, stageEl = null, miniCv = null, ejCv = null;
let scene = null, sceneId = '';
let cam = { x: 0, y: 0, s: .6 }, sw = 300, sh = 300, dpr = 1;
let av = null, tpSeen = -1, others = {}, keys = new Set(), joy = { on: false, id: null, dx: 0, dy: 0 };
let lastSend = 0, lastSent = null, raf = 0, lastT = 0, hudT = null, phaseKey = '', anims = [], toastT = null, ro = null;
let modal = null, bodiesSeen = new Set(), miniBig = false, ghostChat = false, taskOpen = true, lastAlive = true, ghostSplashAt = 0;
let target = { use: null, report: null, freeze: null }, visPoly = null, visR = VIS, meetKey = '', voteSel = null, chatShown = '', lastTick = -1, ejKey = '';
const q = s => root && root.querySelector(s);
const qa = s => root ? [...root.querySelectorAll(s)] : [];
const now = () => performance.now();
const hostClock = () => (ui && ui.hostNow ? ui.hostNow() : Date.now());
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const isTouch = () => (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
const phoneW = () => innerWidth <= 860;
const lerpAng = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a + d * k; };
const curMap = () => V && MAPS[V.mapId];
const amGhost = () => V && V.me >= 0 && !V.alive;
const living = () => V && V.me >= 0 && V.alive && V.phase !== 'over';
const pcol = i => V && V.players[i] ? V.players[i].color : '#fff';
const pnm = i => V && V.players[i] ? V.players[i].name : '?';

/* ---------- uzak oyuncular ---------- */
function onRemotePos(seat, x, y, h, mv, g, snap) {
  if (!V || seat === V.me || !Number.isFinite(x) || !Number.isFinite(y)) return;
  if (g && living()) { delete others[seat]; return; }
  let o = others[seat];
  if (!o || snap === true || dist(o.x, o.y, x, y) > 260) { others[seat] = { x, y, h: h || 0, tx: x, ty: y, th: h || 0, walk: 0, mv: mv ? 1 : 0, g: g ? 1 : 0, at: now() }; return; }
  o.tx = x; o.ty = y; if (Number.isFinite(h)) o.th = h; o.mv = mv ? 1 : 0; o.g = g ? 1 : 0; o.at = now();
}
function onFast(m) {
  if (!m || m.t !== 'p') return;
  const fromHost = m.s != null, seat = fromHost ? +m.s : +m.seat;
  if (!fromHost) hostPosUpdate(+m.seat, +m.x, +m.y, +m.h, m.mv, m.n, m.id);
  const o = others[seat]; if (o && o.vn != null && m.n != null && m.n < o.vn) return;
  onRemotePos(seat, +m.x, +m.y, +m.h, m.mv, m.gh, false);
}
function stepOthers(dt) {
  const k = 1 - Math.exp(-dt * 10);
  for (const s of Object.keys(others)) {
    const o = others[s], ox = o.x, oy = o.y;
    o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k; o.h = lerpAng(o.h, o.th, k);
    const sp = Math.hypot(o.x - ox, o.y - oy) / Math.max(dt, 1e-3);
    o.walk = clamp(sp / 90, 0, 1);
  }
}

/* ---------- kendi karakterin ---------- */
function canMove() { return V && V.phase === 'play' && V.me >= 0 && !V.left && av && !modal; }
function stepMe(dt) {
  if (!canMove()) { if (av) av.walk = Math.max(0, (av.walk || 0) - dt * 5); return; }
  let vx = 0, vy = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) vx -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) vx += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) vy -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) vy += 1;
  if (joy.on) { vx = joy.dx; vy = joy.dy; }
  let mag = Math.hypot(vx, vy);
  if (mag > 1) { vx /= mag; vy /= mag; mag = 1; }
  const ghost = amGhost();
  if (mag > .05) {
    const sp = (ghost ? GHOST_SPEED : SPEED) * mag * dt;
    const ux = vx / mag, uy = vy / mag;
    const steps = Math.max(1, Math.ceil(sp / 10));
    for (let k = 0; k < steps; k++) { const [nx, ny] = moveIn(curMap(), av.x, av.y, ux * sp / steps, uy * sp / steps, ghost); av.x = nx; av.y = ny; } av.h = lerpAng(av.h, Math.atan2(uy, ux), Math.min(1, dt * 12));
    av.walk = Math.min(1, (av.walk || 0) + dt * 5); av.mv = 1;
  } else { av.walk = Math.max(0, (av.walk || 0) - dt * 5); av.mv = 0; }
  const t = now();
  if (t - lastSend > 120 && (!lastSent || dist(lastSent[0], lastSent[1], av.x, av.y) > 1.5 || lastSent[2] !== av.mv || t - lastSend > 1000)) sendPos();
}
function sendPos() {
  if (!av || !ui || !V || !V.tp) return;
  lastSend = now(); lastSent = [av.x, av.y, av.mv];
  const x = Math.round(av.x), y = Math.round(av.y), h = +av.h.toFixed(2), mv = av.mv ? 1 : 0;
  if (ui.isHost) hostPosUpdate(V.me, x, y, h, mv, V.tp.n);
  if (ui.fast && ui.mode === 'online') ui.fast({ t: 'p', x, y, h, mv, gh: amGhost() ? 1 : 0, n: V.tp.n });
}

/* ---------- kamera ---------- */
function resize() {
  if (!stageEl || !cv) return;
  const r = stageEl.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return;
  sw = r.width; sh = r.height; dpr = Math.min(2.5, window.devicePixelRatio || 1);
  cv.width = Math.round(sw * dpr); cv.height = Math.round(sh * dpr);
  camScale();
}
function camScale() {
  if (V && V.me < 0) cam.s = clamp(Math.min(sw / W, sh / H) * 1.02, .1, 1);
  else cam.s = clamp(Math.min(sw, sh * 1.15) / (VIS * 2.05), .42, 1.25);
}
function follow(dt, snap) {
  let fx, fy;
  if (av && V && V.me >= 0) { fx = av.x; fy = av.y - 30; }
  else { fx = W / 2; fy = H / 2; }
  const tx = fx - sw / 2 / cam.s, ty = fy - sh / 2 / cam.s, k = snap ? 1 : 1 - Math.exp(-dt * 8);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  const vw = sw / cam.s, vh = sh / cam.s;
  cam.x = vw >= W ? (W - vw) / 2 : clamp(cam.x, -30, W - vw + 30);
  cam.y = vh >= H ? (H - vh) / 2 : clamp(cam.y, -30, H - vh + 30);
}

/* ---------- görüş ---------- */
function myVis() {
  if (!V || !living()) return 99999;
  if (V.role === 'traitor') return VIS_TRAITOR;
  return V.sab && V.sab.k === 'lights' ? VIS_DARK : VIS;
}
function computeVis() {
  visR += (myVis() - visR) * .12; if (Math.abs(myVis() - visR) < 1) visR = myVis();
  if (!living() || !av) { visPoly = null; return; }
  const m = curMap(), ex = av.x, ey = av.y - 12, n = 200, pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, dx = Math.cos(a), dy = Math.sin(a);
    let r = 0, hit = false;
    while (r < visR) { r += 8; if (opaqueAt(m, ex + dx * r, ey + dy * r)) { hit = true; break; } }
    if (hit) { let lo = r - 8, hi = r; for (let k = 0; k < 3; k++) { const mid = (lo + hi) / 2; if (opaqueAt(m, ex + dx * mid, ey + dy * mid)) hi = mid; else lo = mid; } r = Math.min(visR, hi + (dy < -.3 ? 20 : 6)); }
    pts.push([ex + dx * Math.min(r, visR), ey + dy * Math.min(r, visR)]);
  }
  visPoly = { x: ex, y: ey, pts, r: visR };
}
function seen(x, y) {
  if (!visPoly) return true;
  return dist(visPoly.x, visPoly.y, x, y - 12) <= visPoly.r + 8 && los(curMap(), visPoly.x, visPoly.y, x, y - 14);
}

/* ---------- çizim ---------- */
function frame() {
  raf = 0; if (!root || !cv) return;
  const t = now(), dt = clamp((t - (lastT || t)) / 1000, 0, .25); lastT = t;
  anims = anims.filter(a => t - a.start < a.dur);
  stepMe(dt); stepOthers(dt); follow(dt);
  computeVis();
  draw(t);
  if (ejCv && !q('.hk-eject').hidden) drawEject(t);
  raf = requestAnimationFrame(frame);
}
function nameplate(g, x, y, text, col, red) {
  g.save(); g.translate(x, y); g.scale(1 / cam.s, 1 / cam.s);
  g.font = '900 12px "Nunito","Segoe UI",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(text).width + 14;
  D.rr(g, -w / 2, -9, w, 18, 9, 'rgba(18,6,40,.72)', red ? '#ff5c7a' : col, 2);
  g.fillStyle = red ? '#ffb3c1' : '#ffffff'; g.fillText(text, 0, 1);
  g.restore();
}
function draw(t) {
  const g = cg; g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const m = curMap();
  g.fillStyle = m ? m.theme.night : '#12052e'; g.fillRect(0, 0, sw, sh);
  if (!V || !scene || !m) return;
  g.save(); g.scale(cam.s, cam.s); g.translate(-cam.x, -cam.y);
  g.drawImage(scene.c, 0, 0, W, H);
  const play = V.phase === 'play' || V.phase === 'intro';
  // acil düğmesi
  const b = m.button, pulse = (Math.sin(t / 300) + 1) / 2;
  D.glow(g, b.x, b.y, 50 + pulse * 10, `rgba(255,60,90,${.25 + pulse * .2})`);
  D.ell(g, b.x, b.y + 2, 24, 18, '#d81b3c', '#6a0717', 3); D.ell(g, b.x - 6, b.y - 4, 9, 5, 'rgba(255,255,255,.6)');
  // görev işaretleri
  if (play && V.tasks && V.me >= 0 && !V.left) {
    V.tasks.forEach(tk => {
      if (tk.done) return;
      const s = m.stations[tk.s];
      g.strokeStyle = `rgba(255,225,74,${.55 + pulse * .4})`; g.lineWidth = 4; g.beginPath(); g.arc(s.x, s.y - 6, 32 + pulse * 4, 0, TAU); g.stroke();
      D.text(g, '!', s.x, s.y - 52 - pulse * 6, 22, '#ffe14a', '#7a3a00');
    });
  }
  if (play && V.sab) {
    const pts = V.sab.k === 'lights' ? [m.lights] : m.reactor;
    pts.forEach((p, k) => {
      const held = V.sab.holds && V.sab.holds[k];
      g.strokeStyle = held ? `rgba(43,255,136,${.7 + pulse * .3})` : `rgba(255,59,92,${.5 + pulse * .5})`; g.lineWidth = 5; g.beginPath(); g.arc(p.x, p.y - 8, 36 + pulse * 6, 0, TAU); g.stroke();
    });
  }
  if (play && V.role === 'traitor' && V.alive) m.vents.forEach(v => { if (av && dist(av.x, av.y, v.x, v.y) < VENT_R + 60) { g.strokeStyle = `rgba(255,59,92,${.5 + pulse * .4})`; g.lineWidth = 3; g.beginPath(); g.ellipse(v.x, v.y, 34, 23, 0, 0, TAU); g.stroke(); } });
  // varlıklar
  const items = [];
  if (play) (V.bodies || []).forEach(bd => { if (seen(bd.x, bd.y)) items.push({ y: bd.y, body: bd }); });
  if (V.phase !== 'meeting' && V.phase !== 'vote') {
    Object.keys(others).forEach(s => { const o = others[s], i = +s; if (!V.players[i]) return; if (o.g && living()) return; if (V.players[i].out && !o.g && living()) return; if (!seen(o.x, o.y)) return; items.push({ y: o.y, o, i }); });
    if (av && V.me >= 0 && !V.left) items.push({ y: av.y, o: av, i: V.me, me: true });
  }
  items.sort((a, c) => a.y - c.y);
  const mates = new Set(V.mates || []);
  for (const it of items) {
    if (it.body) { drawIce(g, it.body.x, it.body.y, pcol(it.body.pi), it.body.pi, t); continue; }
    const o = it.o, ghost = it.me ? amGhost() : !!o.g;
    drawBlob(g, o.x, o.y, pcol(it.i), it.i, { t, walk: o.walk || 0, face: Math.cos(o.h || 0) >= -0.1 ? 1 : -1, look: clamp(Math.cos(o.h || 0), -1, 1), ghost, alpha: ghost ? .55 : 1 });
    nameplate(g, o.x, o.y - (ghost ? 74 : 70), it.me ? pnm(it.i) + ' (sen)' : pnm(it.i), pcol(it.i), mates.has(it.i) || (it.me && V.role === 'traitor'));
  }
  // canlandırmalar (dünya)
  for (const a of anims) {
    const u = (t - a.start) / a.dur;
    if (a.t === 'puff') { if (!seen(a.x, a.y)) continue; g.save(); g.globalAlpha = 1 - u; for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU; D.circle(g, a.x + Math.cos(ang) * u * 50, a.y - 10 + Math.sin(ang) * u * 30, 12 * (1 - u * .5), '#c9ced6'); } g.restore(); }
    else if (a.t === 'frost') { if (!seen(a.x, a.y)) continue; g.save(); g.globalAlpha = 1 - u; g.strokeStyle = '#bff3ff'; g.lineWidth = 4; for (let i = 0; i < 10; i++) { const ang = i / 10 * TAU, r1 = 20 + u * 60; g.beginPath(); g.moveTo(a.x + Math.cos(ang) * r1, a.y - 30 + Math.sin(ang) * r1); g.lineTo(a.x + Math.cos(ang) * (r1 + 16), a.y - 30 + Math.sin(ang) * (r1 + 16)); g.stroke(); } D.flake(g, a.x, a.y - 30, 26 + u * 20, '#ffffff'); g.restore(); }
  }
  g.restore();
  if (visPoly) drawFog(g);
  if (play && av && V.me >= 0 && !V.left) drawArrows(g, t);
}
function drawFog(g) {
  const s = cam.s, P = visPoly, sx = x => (x - cam.x) * s, sy = y => (y - cam.y) * s;
  const dark = V.sab && V.sab.k === 'lights' && V.role !== 'traitor', col = dark ? 'rgba(4,2,16,.93)' : 'rgba(6,3,24,.74)';
  g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.beginPath(); g.rect(-2, -2, sw + 4, sh + 4);
  P.pts.forEach(([x, y], i) => i ? g.lineTo(sx(x), sy(y)) : g.moveTo(sx(x), sy(y))); g.closePath();
  g.fillStyle = col; g.fill('evenodd');
  g.beginPath(); P.pts.forEach(([x, y], i) => i ? g.lineTo(sx(x), sy(y)) : g.moveTo(sx(x), sy(y))); g.closePath(); g.clip();
  const cx = sx(P.x), cy = sy(P.y), r = P.r * s;
  const gr = g.createRadialGradient(cx, cy, r * .62, cx, cy, r + 1);
  gr.addColorStop(0, dark ? 'rgba(4,2,16,0)' : 'rgba(6,3,24,0)'); gr.addColorStop(1, col);
  g.fillStyle = gr; g.fillRect(cx - r - 2, cy - r - 2, 2 * r + 4, 2 * r + 4);
  g.restore();
}
function drawArrows(g, t) {
  const m = curMap(), tg = [];
  (V.tasks || []).forEach(tk => { if (!tk.done) tg.push([m.stations[tk.s].x, m.stations[tk.s].y, '#ffe14a']); });
  if (V.sab && V.alive) (V.sab.k === 'lights' ? [m.lights] : m.reactor).forEach(p => tg.push([p.x, p.y, '#ff3b5c']));
  const cx = sw / 2, cy = sh / 2, pad = 30;
  g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const [x, y, c] of tg) {
    const px = (x - cam.x) * cam.s, py = (y - cam.y) * cam.s;
    if (px > pad && py > pad && px < sw - pad && py < sh - pad) continue;
    const a = Math.atan2(py - cy, px - cx);
    const k = Math.min((sw / 2 - pad) / Math.max(1e-3, Math.abs(Math.cos(a))), (sh / 2 - pad) / Math.max(1e-3, Math.abs(Math.sin(a))));
    const ax = cx + Math.cos(a) * k, ay = cy + Math.sin(a) * k;
    g.save(); g.translate(ax, ay); g.rotate(a); g.globalAlpha = .75 + Math.sin(t / 250) * .2;
    g.beginPath(); g.moveTo(14, 0); g.lineTo(-8, -10); g.lineTo(-4, 0); g.lineTo(-8, 10); g.closePath(); g.fillStyle = c; g.fill(); g.strokeStyle = 'rgba(20,6,40,.8)'; g.lineWidth = 2.5; g.stroke();
    g.restore();
  }
  g.restore();
}
function drawMini() {
  if (!miniCv || !scene || !V) return;
  const w = miniCv.clientWidth || 150, h = miniCv.clientHeight || 100, pr = Math.min(2, dpr || 1);
  if (miniCv.width !== Math.round(w * pr)) { miniCv.width = Math.round(w * pr); miniCv.height = Math.round(h * pr); }
  const g = miniCv.getContext('2d'); g.setTransform(pr, 0, 0, pr, 0, 0); g.clearRect(0, 0, w, h);
  g.drawImage(scene.thumb, 0, 0, w, h);
  const k = w / W, m = curMap(), t = now();
  (V.tasks || []).forEach(tk => { if (tk.done) return; const s = m.stations[tk.s]; D.circle(g, s.x * k, s.y * k, 3.2, '#ffe14a', '#7a3a00', 1); });
  if (V.sab) (V.sab.k === 'lights' ? [m.lights] : m.reactor).forEach(p => { if (Math.sin(t / 200) > -.3) D.circle(g, p.x * k, p.y * k, 4, '#ff3b5c', '#fff', 1); });
  D.circle(g, m.button.x * k, m.button.y * k, 3, '#ff5c7a');
  if (V.role === 'traitor') m.vents.forEach(v => D.rr(g, v.x * k - 2.5, v.y * k - 1.5, 5, 3, 1, '#c9ced6'));
  if (amGhost() || V.me < 0) Object.keys(others).forEach(s => { const o = others[s]; D.circle(g, o.x * k, o.y * k, 2.6, pcol(+s), null); });
  if (av && V.me >= 0) D.circle(g, av.x * k, av.y * k, 4, pcol(V.me), '#fff', 1.5);
}

/* ---------- hedefler ve düğmeler ---------- */
function computeTargets() {
  target = { use: null, report: null, freeze: null };
  if (!V || V.phase !== 'play' || V.me < 0 || V.left || !av) return;
  const m = curMap(), p = av, d = (x, y) => dist(p.x, p.y, x, y);
  const uses = [];
  if (V.alive && V.sab) {
    if (V.sab.k === 'lights' && d(m.lights.x, m.lights.y) <= USE_R) uses.push({ k: 'fix', pr: 0, dd: d(m.lights.x, m.lights.y) });
    if (V.sab.k === 'reactor') m.reactor.forEach((r2, k) => { if (d(r2.x, r2.y) <= USE_R) uses.push({ k: 'hold', p: k, pr: 0, dd: d(r2.x, r2.y) }); });
  }
  (V.tasks || []).forEach((tk, i) => { if (tk.done) return; const s = m.stations[tk.s]; if (d(s.x, s.y) <= USE_R) uses.push({ k: 'task', i, s: tk.s, pr: 1, dd: d(s.x, s.y) }); });
  if (V.alive && d(m.button.x, m.button.y) <= BUTTON_R) uses.push({ k: 'emerg', pr: 2, dd: 0 });
  if (V.alive && V.role === 'traitor') m.vents.forEach((v, k) => { if (d(v.x, v.y) <= VENT_R) uses.push({ k: 'vent', v: k, pr: 1.5, dd: d(v.x, v.y) }); });
  uses.sort((a, c) => a.pr - c.pr || a.dd - c.dd);
  target.use = uses[0] || null;
  if (V.alive) {
    let best = null, bd = 1e9;
    (V.bodies || []).forEach(bd2 => { const dd = d(bd2.x, bd2.y); if (dd <= REPORT_R && dd < bd && seen(bd2.x, bd2.y)) { bd = dd; best = bd2.pi; } });
    target.report = best;
  }
  if (V.alive && V.role === 'traitor') {
    const mates = new Set(V.mates || []); let best = null, bd = 1e9;
    Object.keys(others).forEach(s => { const i = +s, o = others[s]; if (o.g || mates.has(i) || (V.players[i] && V.players[i].out)) return; const dd = d(o.x, o.y); if (dd <= FREEZE_R && dd < bd && seen(o.x, o.y)) { bd = dd; best = i; } });
    target.freeze = best;
  }
}
const USE_LABEL = { task: ['🔧', 'Görev'], fix: ['💡', 'Onar'], hold: ['✋', 'Tut'], emerg: ['🚨', 'Acil'], vent: ['🕳️', 'Tünel'] };
function hudTick() {
  if (!V || !root) return;
  computeTargets();
  const hn = hostClock();
  // eylem düğmeleri
  const show = V.phase === 'play' && V.me >= 0 && !V.left;
  const acts = q('.hk-acts'); acts.hidden = !show;
  if (show) {
    const ub = q('[data-act="use"]'), u = target.use;
    const [ic, lb] = u ? USE_LABEL[u.k] : ['✋', 'Kullan'];
    ub.querySelector('b').textContent = ic; ub.querySelector('small').textContent = lb + (isTouch() ? '' : ' (E)');
    ub.disabled = !u; ub.classList.toggle('ready', !!u);
    const rb = q('[data-act="report"]'); rb.hidden = !V.alive; rb.disabled = target.report == null; rb.classList.toggle('ready', target.report != null);
    const fb = q('[data-act="freeze"]'), sb = q('[data-act="sab"]');
    const tr = V.role === 'traitor' && V.alive; fb.hidden = !tr; sb.hidden = !tr;
    if (tr) {
      const left = Math.ceil(Math.max(0, (V.cdAt || 0) - hn) / 1000);
      fb.querySelector('i').textContent = left > 0 ? left : ''; fb.classList.toggle('cd', left > 0); fb.disabled = left > 0 || target.freeze == null; fb.classList.toggle('ready', left <= 0 && target.freeze != null);
      const sl = Math.ceil(Math.max(0, (V.sabReadyAt || 0) - hn) / 1000);
      sb.querySelector('i').textContent = V.sab ? '' : (sl > 0 && sl < 999 ? sl : ''); sb.disabled = !!V.sab; sb.classList.toggle('cd', !V.sab && sl > 0 && sl < 999);
    }
    const gc = q('[data-act="gchat"]'); gc.hidden = !amGhost();
  }
  // sabotaj uyarısı
  const al = q('.hk-alert');
  if (V.phase === 'play' && V.sab) {
    al.hidden = false;
    const m = curMap();
    if (V.sab.k === 'reactor') { const s = Math.max(0, Math.ceil((V.sab.endsAt - hn) / 1000)); al.innerHTML = `☢️ ${esc(trUp(m.reactorName))} ALARMI <b>${s}</b> <small>${(V.sab.holds || []).filter(Boolean).length}/2 panel</small>`; al.className = 'hk-alert red'; if (s !== lastTick) { lastTick = s; if (s <= 40) alarmBeep(s <= 10); } }
    else { al.innerHTML = `💡 IŞIKLAR KAPALI <small>${esc(m.lightsName)}</small>`; al.className = 'hk-alert yel'; }
  } else al.hidden = true;
  // zaman göstergesi (toplantı)
  if (V.endsAt && (V.phase === 'meeting' || V.phase === 'vote')) {
    const s = Math.max(0, Math.ceil((V.endsAt - hn) / 1000)), el = q('.hk-mtime b');
    if (q('.hk-meet')) q('.hk-meet').dataset.ph = V.phase;
    if (el) el.textContent = mmss(s);
    const ring = q('.hk-mtime'); if (ring) { ring.style.setProperty('--p', clamp((V.endsAt - hn) / (V.dur || 1), 0, 1)); ring.classList.toggle('urgent', s <= 10); }
    if (s !== lastTick) { lastTick = s; if (s <= 5 && s > 0) Sound.tick(.8); }
  }
  if (miniCv) drawMini();
  updateEject(); updateEmergModal();
}
function alarmBeep(fast) { try { if (!Sound.ctx || !Sound.enabled || Sound.ctx.state !== 'running') return; Sound.tone(fast ? 880 : 740, .18, { type: 'square', gain: .06 }); Sound.tone(fast ? 660 : 520, .2, { type: 'square', gain: .05, when: .2 }); } catch { /* */ } }
function iceSound() { try { if (!Sound.ctx || !Sound.enabled || Sound.ctx.state !== 'running') return; Sound.tone(1800, .5, { type: 'sine', gain: .12, slide: 600 }); Sound.noise(.45, { filter: 'highpass', freq: 5000, gain: .25, decayPow: 2 }); Sound.tone(2600, .25, { type: 'triangle', gain: .08, when: .15 }); } catch { /* */ } }
function sirenSound() { try { if (!Sound.ctx || !Sound.enabled || Sound.ctx.state !== 'running') return; for (let i = 0; i < 3; i++) { Sound.tone(600, .28, { type: 'sawtooth', gain: .07, when: i * .5, slide: 1100 }); Sound.tone(1100, .2, { type: 'sawtooth', gain: .06, when: i * .5 + .28, slide: 600 }); } } catch { /* */ } }

function doUse() {
  const u = target.use; if (!u || !canMove()) return;
  Sound.init();
  if (u.k === 'task') openTask(u.i, u.s);
  else if (u.k === 'fix') openLights();
  else if (u.k === 'hold') openReactor(u.p);
  else if (u.k === 'emerg') openEmerg();
  else if (u.k === 'vent') openVent(u.v);
}
function doReport() { if (target.report == null || !canMove()) return; sendPos(); ui.send({ t: 'report', pi: target.report }); }
function doFreezeBtn() { if (target.freeze == null || !canMove()) return; if ((V.cdAt || 0) > hostClock() + 100) return; sendPos(); ui.send({ t: 'freeze', pi: target.freeze }); }
function toast(text, cls) {
  const t = q('.hk-toast'); if (!t) return;
  t.textContent = text; t.className = 'hk-toast show ' + (cls || ''); clearTimeout(toastT);
  toastT = setTimeout(() => { if (t) t.className = 'hk-toast'; }, 1800);
}

/* ---------- giriş ---------- */
function joyDown(e) {
  if (!canMove()) return; e.preventDefault(); e.stopPropagation(); Sound.init();
  const el = e.currentTarget; try { el.setPointerCapture(e.pointerId); } catch { /* */ }
  joy.on = true; joy.id = e.pointerId; joyMove(e);
}
function joyMove(e) {
  if (!joy.on || e.pointerId !== joy.id) return;
  const el = q('.hk-joy'), r = el.getBoundingClientRect(), Rr = r.width / 2;
  let dx = (e.clientX - r.left - Rr) / Rr, dy = (e.clientY - r.top - Rr) / Rr; const l = Math.hypot(dx, dy);
  if (l > 1) { dx /= l; dy /= l; }
  const dead = l < .14;
  joy.dx = dead ? 0 : dx; joy.dy = dead ? 0 : dy;
  const k = el.querySelector('i'); if (k) k.style.transform = `translate(${dx * Rr * .55}px, ${dy * Rr * .55}px)`;
}
function joyUp(e) { if (e.pointerId !== joy.id) return; joy.on = false; joy.dx = joy.dy = 0; const k = q('.hk-joy i'); if (k) k.style.transform = ''; }
function onKey(e) {
  if (!V || !root || (e.target.closest && e.target.closest('input,textarea,select'))) return;
  const codes = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'];
  if (e.type === 'keydown') {
    if (codes.includes(e.code)) { if (V.phase === 'play') { keys.add(e.code); e.preventDefault(); } }
    else if (e.code === 'KeyE' || e.code === 'Space') { if (V.phase === 'play' && !e.repeat) { e.preventDefault(); if (modal) { if (modal.kind === 'emerg') { const b = q('.hk-bigred'); if (b) b.click(); } } else doUse(); } }
    else if (e.code === 'KeyR' && !e.repeat) doReport();
    else if (e.code === 'KeyQ' && !e.repeat) doFreezeBtn();
    else if (e.code === 'KeyF' && !e.repeat && V.role === 'traitor' && V.alive && V.phase === 'play' && !modal) openSab();
    else if (e.code === 'Escape' && modal) closeModal();
  } else keys.delete(e.code);
}
function onBlur() { keys.clear(); joy.on = false; joy.dx = joy.dy = 0; }

/* ---------- mini oyunlar ve pencereler ---------- */
let mgRaf = 0;
function openModal(kind, title, data) {
  closeModal(true);
  modal = Object.assign({ kind }, data || {});
  keys.clear(); joy.on = false; joy.dx = joy.dy = 0; const k = q('.hk-joy i'); if (k) k.style.transform = '';
  const el = q('.hk-modal'); el.hidden = false; el.dataset.kind = kind;
  q('.hk-mgt').textContent = title;
  const body = q('.hk-mgb'); body.innerHTML = ''; body.className = 'hk-mgb';
  if (av) { av.mv = 0; sendPos(); }
  return body;
}
function closeModal(silent) {
  if (!modal) return;
  if (modal.kind === 'reactor' && modal.holding) { ui.send({ t: 'hold', p: modal.p, on: false }); }
  cancelAnimationFrame(mgRaf); mgRaf = 0;
  if (modal.cleanup) try { modal.cleanup(); } catch { /* */ }
  modal = null;
  const el = q('.hk-modal'); if (el) { el.hidden = true; q('.hk-mgb').innerHTML = ''; }
  if (!silent) Sound.tick(.3);
}
function mgDone(body, after) {
  if (!modal) return;
  modal.finished = true;
  body.classList.add('ok');
  const b = document.createElement('div'); b.className = 'hk-mgok'; b.textContent = '✔ TAMAM!'; body.appendChild(b);
  Sound.good(); if (after) after();
  const mm = modal; setTimeout(() => { if (modal === mm) closeModal(true); }, 750);
}
function svgPt(svg, e, vw, vh) { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * vw, (e.clientY - r.top) / r.height * vh]; }
const MG = {
  kablo(body, done) {
    const cols = ['#ff4f6d', '#5aa2ff', '#ffd84a', '#5cc85a'], L = shuf([0, 1, 2, 3]), Rt = shuf([0, 1, 2, 3]);
    const y = i => 34 + i * 52;
    body.innerHTML = `<p class="hk-mgp">Aynı renkteki uçları birleştir — sürükle ya da önce soldakine sonra sağdakine dokun.</p>
      <svg class="hk-wires" viewBox="0 0 300 220" role="img" aria-label="Kablolar"><rect x="0" y="0" width="300" height="220" rx="16" fill="#1d2440"/>
      <g class="ln"></g><line class="drag" x1="0" y1="0" x2="0" y2="0" stroke-width="12" stroke-linecap="round" visibility="hidden"/>
      ${L.map((c, i) => `<g data-l="${c}" class="nd"><rect x="2" y="${y(i) - 12}" width="40" height="24" rx="6" fill="${cols[c]}"/><circle cx="46" cy="${y(i)}" r="13" fill="${cols[c]}" stroke="#fff" stroke-width="3"/></g>`).join('')}
      ${Rt.map((c, i) => `<g data-r="${c}" class="nd"><rect x="258" y="${y(i) - 12}" width="40" height="24" rx="6" fill="${cols[c]}"/><circle cx="254" cy="${y(i)}" r="13" fill="${cols[c]}" stroke="#fff" stroke-width="3"/></g>`).join('')}</svg>`;
    const svg = body.querySelector('svg'), dl = svg.querySelector('.drag'), ln = svg.querySelector('.ln'), ok = new Set();
    let sel = null, moved = false;
    const ly = c => y(L.indexOf(c)), ry = c => y(Rt.indexOf(c));
    const pick = (c) => { sel = c; svg.querySelectorAll('[data-l]').forEach(n => n.classList.toggle('sel', +n.dataset.l === c)); };
    const tryJoin = (rc) => {
      if (sel == null) return;
      if (rc === sel && !ok.has(sel)) {
        ok.add(sel); ln.insertAdjacentHTML('beforeend', `<line x1="46" y1="${ly(sel)}" x2="254" y2="${ry(sel)}" stroke="${cols[sel]}" stroke-width="12" stroke-linecap="round"/>`);
        Sound.tick(.6); if (ok.size === 4) done();
      } else { Sound.bad(); }
      pick(null); dl.setAttribute('visibility', 'hidden');
    };
    svg.addEventListener('pointerdown', e => {
      const l = e.target.closest('[data-l]'), r = e.target.closest('[data-r]');
      if (l && !ok.has(+l.dataset.l)) { e.preventDefault(); pick(+l.dataset.l); moved = false; try { svg.setPointerCapture(e.pointerId); } catch { /* */ } dl.setAttribute('stroke', cols[sel]); dl.setAttribute('x1', 46); dl.setAttribute('y1', ly(sel)); const [px, py] = svgPt(svg, e, 300, 220); dl.setAttribute('x2', px); dl.setAttribute('y2', py); dl.setAttribute('visibility', 'visible'); }
      else if (r && sel != null) tryJoin(+r.dataset.r);
    });
    svg.addEventListener('pointermove', e => { if (sel == null || dl.getAttribute('visibility') === 'hidden') return; const [px, py] = svgPt(svg, e, 300, 220); moved = true; dl.setAttribute('x2', px); dl.setAttribute('y2', py); });
    svg.addEventListener('pointerup', e => {
      if (sel == null) return;
      const [px, py] = svgPt(svg, e, 300, 220);
      if (!moved) { dl.setAttribute('visibility', 'hidden'); return; }
      let hit = null; Rt.forEach((c, i) => { if (Math.abs(py - y(i)) < 24 && px > 200) hit = c; });
      if (hit != null) tryJoin(hit); else { pick(null); dl.setAttribute('visibility', 'hidden'); }
    });
  },
  sayi(body, done) {
    const nums = shuf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); let next = 1;
    body.innerHTML = `<p class="hk-mgp">Sayılara <b>1'den 10'a</b> sırayla dokun.</p><div class="hk-nums">${nums.map(n => `<button type="button" data-n="${n}">${n}</button>`).join('')}</div>`;
    body.querySelector('.hk-nums').addEventListener('click', e => {
      const b = e.target.closest('[data-n]'); if (!b || modal.finished) return;
      const n = +b.dataset.n;
      if (n === next) { b.classList.add('on'); Sound.tick(.3 + n * .05); next++; if (next > 10) done(); }
      else if (n >= next) { next = 1; body.querySelectorAll('[data-n]').forEach(x => x.classList.remove('on')); const g = body.querySelector('.hk-nums'); g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake'); Sound.bad(); }
    });
  },
  ibre(body, done) {
    let hits = 0, ph = 0, sp = 2.4, z = rnd(25, 125), last = now();
    body.innerHTML = `<p class="hk-mgp">İbre <b>yeşil bölgedeyken</b> DURDUR'a bas (2 kez).</p>
      <svg class="hk-gauge" viewBox="0 0 240 140"><path d="M20 120 A100 100 0 0 1 220 120" fill="none" stroke="#2d2d4a" stroke-width="26"/><path class="zone" fill="none" stroke="#2bff88" stroke-width="26"/>
      <line class="ndl" x1="120" y1="120" x2="120" y2="30" stroke="#ff4f6d" stroke-width="7" stroke-linecap="round"/><circle cx="120" cy="120" r="12" fill="#fff" stroke="#2d2d4a" stroke-width="4"/></svg>
      <div class="hk-dots"><i></i><i></i></div><button type="button" class="btn btn-solve hk-mgbtn" data-mg="stop">DURDUR!</button>`;
    const zone = body.querySelector('.zone'), ndl = body.querySelector('.ndl');
    const pt = a => [120 - Math.cos(a * Math.PI / 180) * 100, 120 - Math.sin(a * Math.PI / 180) * 100];
    const setZone = () => { const [x1, y1] = pt(z), [x2, y2] = pt(z + 30); zone.setAttribute('d', `M${x1} ${y1} A100 100 0 0 1 ${x2} ${y2}`); };
    setZone();
    let ang = 90;
    const loop = () => { if (!modal || modal.kind !== 'task') return; const t = now(), dt = (t - last) / 1000; last = t; ph += dt * sp; ang = 90 - 86 * Math.sin(ph); const [x, y] = pt(ang); ndl.setAttribute('x2', x); ndl.setAttribute('y2', y); mgRaf = requestAnimationFrame(loop); };
    mgRaf = requestAnimationFrame(loop);
    body.querySelector('[data-mg="stop"]').addEventListener('click', () => {
      if (modal.finished) return;
      if (ang >= z - 2 && ang <= z + 32) { hits++; body.querySelectorAll('.hk-dots i')[hits - 1].classList.add('on'); Sound.tick(.7); if (hits >= 2) { cancelAnimationFrame(mgRaf); done(); return; } z = rnd(25, 125); sp += .8; setZone(); }
      else { Sound.bad(); const g = body.querySelector('.hk-gauge'); g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake'); }
    });
  },
  yukle(body, done) {
    let prog = 0, hold = false, last = now();
    body.innerHTML = `<p class="hk-mgp">Düğmeyi <b>basılı tut</b>, dosya yüklensin.</p>
      <div class="hk-up"><span class="f">📁</span><span class="fly">📄</span><span class="c">☁️</span></div><div class="hk-prog"><i></i></div><b class="hk-pct">%0</b>
      <button type="button" class="btn btn-vowel hk-mgbtn" data-mg="hold">⬆ BASILI TUT</button>`;
    const btn = body.querySelector('[data-mg="hold"]'), bar = body.querySelector('.hk-prog i'), pct = body.querySelector('.hk-pct'), up = body.querySelector('.hk-up');
    const on = e => { e.preventDefault(); hold = true; up.classList.add('go'); try { btn.setPointerCapture(e.pointerId); } catch { /* */ } };
    const off = () => { hold = false; up.classList.remove('go'); };
    btn.addEventListener('pointerdown', on); btn.addEventListener('pointerup', off); btn.addEventListener('pointercancel', off); btn.addEventListener('lostpointercapture', off);
    btn.addEventListener('contextmenu', e => e.preventDefault());
    const loop = () => { if (!modal || modal.kind !== 'task') return; const t = now(), dt = (t - last) / 1000; last = t; if (hold) prog = Math.min(1, prog + dt / 2.6); bar.style.width = prog * 100 + '%'; pct.textContent = '%' + Math.floor(prog * 100); if (prog >= 1) { off(); done(); return; } mgRaf = requestAnimationFrame(loop); };
    mgRaf = requestAnimationFrame(loop);
  },
  cop(body, done) {
    let lvl = 1, hy = 0, drag = false, last = now();
    body.innerHTML = `<p class="hk-mgp">Kolu <b>aşağı çek</b> ve tut; çöp boşalsın.</p>
      <div class="hk-trash"><div class="bin"><div class="lvl"><span>🍌</span><span>🥫</span><span>📰</span><span>🍎</span><span>🧃</span><span>🥡</span></div></div><div class="track"><div class="hdl" role="slider" aria-label="Çöp kolu" tabindex="0"></div></div></div>`;
    const tr = body.querySelector('.track'), hd = body.querySelector('.hdl'), lv = body.querySelector('.lvl');
    const setH = v => { hy = clamp(v, 0, 1); hd.style.top = `calc(${hy * 100}% - ${hy * 48}px)`; };
    hd.addEventListener('pointerdown', e => { e.preventDefault(); drag = true; try { hd.setPointerCapture(e.pointerId); } catch { /* */ } });
    hd.addEventListener('pointermove', e => { if (!drag) return; const r = tr.getBoundingClientRect(); setH((e.clientY - r.top - 24) / (r.height - 48)); });
    const up = () => { drag = false; };
    hd.addEventListener('pointerup', up); hd.addEventListener('pointercancel', up);
    const loop = () => { if (!modal || modal.kind !== 'task') return; const t = now(), dt = (t - last) / 1000; last = t; if (!drag && hy > 0) setH(hy - dt * 3); if (hy > .88) { lvl = Math.max(0, lvl - dt / 1.3); lv.classList.add('go'); } else lv.classList.remove('go'); lv.style.height = lvl * 100 + '%'; if (lvl <= 0) { done(); return; } mgRaf = requestAnimationFrame(loop); };
    mgRaf = requestAnimationFrame(loop);
  },
  termo(body, done) {
    const tgt = rndi(16, 30); let cur = tgt + (Math.random() < .5 ? -1 : 1) * rndi(5, 9);
    body.innerHTML = `<p class="hk-mgp">Isıyı hedefe getir: <b class="hk-tgt">${tgt}°</b></p>
      <div class="hk-termo"><button type="button" data-mg="-" aria-label="Azalt">−</button><div class="hk-deg"><b>${cur}°</b><small>şimdi</small></div><button type="button" data-mg="+" aria-label="Artır">+</button></div>
      <input type="range" min="5" max="40" value="${cur}" class="hk-range" aria-label="Isı">
      <button type="button" class="btn btn-spin hk-mgbtn" data-mg="ok" disabled>✔ ONAYLA</button>`;
    const deg = body.querySelector('.hk-deg b'), rng = body.querySelector('.hk-range'), okb = body.querySelector('[data-mg="ok"]');
    const set = v => { cur = clamp(v, 5, 40); deg.textContent = cur + '°'; rng.value = cur; okb.disabled = cur !== tgt; body.querySelector('.hk-deg').classList.toggle('hit', cur === tgt); Sound.tick(.3); };
    body.addEventListener('click', e => { const b = e.target.closest('[data-mg]'); if (!b || modal.finished) return; if (b.dataset.mg === '-') set(cur - 1); else if (b.dataset.mg === '+') set(cur + 1); else if (b.dataset.mg === 'ok' && cur === tgt) done(); });
    rng.addEventListener('input', () => set(+rng.value));
  }
};
function openTask(i, s) {
  const m = curMap(), st = m.stations[s], T = TASKS[st.t];
  const body = openModal('task', `${T.icon} ${st.n}`, { i, s });
  q('.hk-modal').dataset.room = roomName(m, st.x, st.y);
  MG[st.t](body, () => mgDone(body, () => { ui.send({ t: 'task', k: i }); }));
}
function openLights() {
  const body = openModal('lights', '💡 Şalterleri kaldır');
  const sw0 = [0, 1, 2, 3, 4].map(() => Math.random() < .5); if (sw0.filter(x => !x).length < 2) { sw0[0] = false; sw0[3] = false; }
  body.innerHTML = `<p class="hk-mgp">Bütün şalterleri <b>yukarı</b> kaldır, ışıklar yansın.</p><div class="hk-sws">${sw0.map((u, k) => `<button type="button" class="hk-sw ${u ? 'up' : ''}" data-sw="${k}" aria-label="Şalter ${k + 1}"><i></i></button>`).join('')}</div>`;
  body.querySelector('.hk-sws').addEventListener('click', e => {
    const b = e.target.closest('[data-sw]'); if (!b || modal.finished) return;
    b.classList.toggle('up'); Sound.tick(.5);
    if (body.querySelectorAll('.hk-sw.up').length === 5) mgDone(body, () => ui.send({ t: 'fix' }));
  });
}
function openReactor(p) {
  const body = openModal('reactor', `☢️ ${curMap().reactorName} paneli ${p + 1}`, { p, holding: false });
  body.innerHTML = `<p class="hk-mgp">Elini panelde <b>basılı tut</b>. Aynı anda diğer panelde de biri olmalı!</p>
    <button type="button" class="hk-hand" aria-label="El tarayıcı"><span>✋</span></button><p class="hk-rst"></p>`;
  const hb = body.querySelector('.hk-hand');
  const on = e => { e.preventDefault(); if (!modal || modal.holding) return; modal.holding = true; hb.classList.add('on'); try { hb.setPointerCapture(e.pointerId); } catch { /* */ } sendPos(); ui.send({ t: 'hold', p, on: true }); Sound.tick(.6); };
  const off = () => { if (!modal || !modal.holding) return; modal.holding = false; hb.classList.remove('on'); ui.send({ t: 'hold', p, on: false }); };
  hb.addEventListener('pointerdown', on); hb.addEventListener('pointerup', off); hb.addEventListener('pointercancel', off); hb.addEventListener('lostpointercapture', off);
  hb.addEventListener('contextmenu', e => e.preventDefault());
  updateReactorModal();
}
function updateReactorModal() {
  if (!modal || modal.kind !== 'reactor') return;
  const el = q('.hk-rst'); if (!el) return;
  if (!V.sab || V.sab.k !== 'reactor') { closeModal(true); return; }
  const h = V.sab.holds || [false, false];
  el.innerHTML = `Panel 1: ${h[0] ? '✅' : '⬜'} · Panel 2: ${h[1] ? '✅' : '⬜'}`;
}
function emergWhy() {
  const left = V.emerg || 0, cdS = Math.ceil(Math.max(0, (V.btnReadyAt || 0) - hostClock()) / 1000), crisis = V.sab && V.sab.k === 'reactor';
  return left <= 0 ? 'Acil toplantı hakkını kullandın.' : crisis ? 'Kriz sırasında acil toplantı çağrılamaz!' : cdS > 0 ? `Düğme ${cdS} saniye sonra hazır.` : '';
}
function updateEmergModal() {
  if (!modal || modal.kind !== 'emerg') return;
  const why = emergWhy(), b = q('.hk-bigred'), r = q('.hk-mgb .hk-rst');
  if (b) b.disabled = !!why; if (r && r.textContent !== why) r.textContent = why;
}
function openEmerg() {
  const body = openModal('emerg', '🚨 Acil toplantı');
  body.innerHTML = `<p class="hk-mgp">Herkesi masaya çağır, konuşup oylayın. Kalan hakkın: <b>${V.emerg || 0}</b></p>
    <button type="button" class="hk-bigred"><span>ACİL</span></button><p class="hk-rst"></p>`;
  updateEmergModal();
  body.querySelector('.hk-bigred').addEventListener('click', () => { if (emergWhy()) return; sendPos(); ui.send({ t: 'emerg' }); closeModal(true); });
}
function openVent(v) {
  const m = curMap(), vt = m.vents[v];
  const body = openModal('vent', '🕳️ Tünel');
  body.innerHTML = `<p class="hk-mgp">Gizli tünelden nereye çıkmak istiyorsun?</p><div class="hk-vlist">${vt.l.map(k => `<button type="button" class="btn btn-ghost" data-vent="${k}">➡ ${esc(roomName(m, m.vents[k].x, m.vents[k].y))}</button>`).join('')}</div>`;
  body.querySelector('.hk-vlist').addEventListener('click', e => { const b = e.target.closest('[data-vent]'); if (!b) return; sendPos(); ui.send({ t: 'vent', from: v, to: +b.dataset.vent }); closeModal(true); });
}
function openSab() {
  if (!V || V.role !== 'traitor' || !V.alive || V.phase !== 'play') return;
  const body = openModal('sab', '⚠️ Sabotaj');
  const m = curMap(), sl = Math.ceil(Math.max(0, (V.sabReadyAt || 0) - hostClock()) / 1000), dis = V.sab || sl > 0;
  body.innerHTML = `<p class="hk-mgp">${V.sab ? 'Şu an bir sabotaj sürüyor.' : sl > 0 ? `Sabotaj ${sl} saniye sonra hazır.` : 'Bir sabotaj seç:'}</p>
    <div class="hk-vlist"><button type="button" class="btn btn-vowel" data-sab="lights" ${dis ? 'disabled' : ''}>💡 Işıkları kapat<small>görüş daralır</small></button>
    <button type="button" class="btn btn-danger" data-sab="reactor" ${dis ? 'disabled' : ''}>☢️ ${esc(m.reactorName)} alarmı<small>${REACTOR_MS / 1000} sn</small></button></div>`;
  body.querySelector('.hk-vlist').addEventListener('click', e => { const b = e.target.closest('[data-sab]'); if (!b || b.disabled) return; ui.send({ t: 'sab', k: b.dataset.sab }); closeModal(true); });
}

/* ---------- sohbet ---------- */
function chatHtml(list) {
  if (!list.length) return '<li class="sys">Henüz mesaj yok. İlk sen yaz!</li>';
  return list.map(c => `<li class="${c.g ? 'g' : ''} ${c.pi === V.me ? 'mine' : ''}" style="--pc:${pcol(c.pi)}"><span class="av" style="--pc:${pcol(c.pi)}">${initial(pnm(c.pi))}</span><div><b>${c.g ? '👻 ' : ''}${esc(pnm(c.pi))}</b><span>${esc(c.tx)}</span></div></li>`).join('');
}
function renderChats() {
  const key = V.chat.length ? V.chat[V.chat.length - 1].id + ':' + V.chat.length : '0';
  if (key === chatShown && !qa('.hk-clist').some(ol => !ol.dataset.k || ol.dataset.k !== key)) return;
  chatShown = key;
  qa('.hk-clist').forEach(ol => {
    const g = ol.closest('.hk-gchat'), list = g ? V.chat.filter(c => c.g) : V.chat;
    const atEnd = ol.scrollTop + ol.clientHeight >= ol.scrollHeight - 30;
    ol.innerHTML = chatHtml(list); ol.dataset.k = key;
    if (atEnd || !ol.dataset.scrolled) { ol.scrollTop = ol.scrollHeight; ol.dataset.scrolled = '1'; }
  });
}
function chatForm(ph) { return `<form class="hk-cform" autocomplete="off"><input type="text" maxlength="120" placeholder="${esc(ph)}" aria-label="Mesaj" enterkeyhint="send"><button type="submit" class="btn btn-vowel" aria-label="Gönder">➤</button></form>`; }
function onSubmit(e) {
  const f = e.target.closest('.hk-cform'); if (!f) return;
  e.preventDefault();
  const inp = f.querySelector('input'), tx = inp.value.trim(); if (!tx) return;
  ui.send({ t: 'chat', tx }); inp.value = ''; Sound.tick(.4);
}

/* ---------- toplantı ekranı ---------- */
function buildMeet() {
  const el = q('.hk-meet'), mt = V.meeting;
  const body = mt.reason === 'body';
  el.innerHTML = `<div class="hk-mbox">
    <header class="hk-mh"><div class="hk-mtt"><b>${body ? '🧊 DONMUŞ OYUNCU BULUNDU!' : '🚨 ACİL TOPLANTI'}</b><span>${body ? `${esc(pnm(mt.caller))}, ${esc(pnm(mt.body))} oyuncusunu buz kalıbı hâlinde buldu.` : `${esc(pnm(mt.caller))} acil düğmeye bastı.`}</span></div>
      <div class="hk-mtime"><b>0:00</b><span class="hk-mph">Tartışma</span></div></header>
    <div class="hk-mbody"><div class="hk-mcards"></div>
      <section class="hk-chat"><ol class="hk-clist" aria-live="polite"></ol>${chatForm('Mesaj yaz…')}</section></div>
    <footer class="hk-mfoot"><button type="button" class="btn btn-ghost hk-skip" data-vote="-1">⏭️ Atla</button><span class="hk-mstat"></span><div class="hk-skips"></div></footer></div>`;
  el.querySelector('.hk-mcards').innerHTML = V.players.map((p, i) => `<button type="button" class="hk-card" data-vote="${i}" style="--pc:${p.color}"><canvas width="96" height="96"></canvas><span class="nm">${esc(p.name)}</span><span class="bd"></span><span class="chips"></span><span class="cf">✔ OYLA</span></button>`).join('');
  el.querySelectorAll('.hk-card').forEach((c, i) => { const g = c.querySelector('canvas').getContext('2d'); g.clearRect(0, 0, 96, 96); drawBlob(g, 48, 84, V.players[i].color, i, { t: 0, s: 1.25, sad: V.players[i].out, closed: V.players[i].out }); });
  voteSel = null; chatShown = '';
}
function updateMeet() {
  const el = q('.hk-meet'), mt = V.meeting; if (!mt) return;
  const voting = V.phase === 'vote', reveal = V.phase === 'eject' && mt.votes;
  const canVote = voting && V.alive && mt.myVote == null;
  el.dataset.ph = V.phase;
  q('.hk-mph').textContent = voting ? 'Oylama' : V.phase === 'eject' ? 'Sonuç' : 'Tartışma';
  if (V.phase === 'eject') { q('.hk-mtime b').textContent = '📊'; q('.hk-mtime').style.setProperty('--p', 1); }
  const cnt = {}; let skipV = [];
  if (reveal) Object.keys(mt.votes).forEach(k => { const v2 = mt.votes[k]; if (v2 === -1) skipV.push(+k); else (cnt[v2] = cnt[v2] || []).push(+k); });
  el.querySelectorAll('.hk-card').forEach(c => {
    const i = +c.dataset.vote, p = V.players[i];
    c.classList.toggle('dead', !!p.out); c.classList.toggle('me', i === V.me); c.classList.toggle('voted', !!mt.voted[i]);
    c.classList.toggle('sel', voteSel === i && canVote); c.classList.toggle('mine', mt.myVote === i);
    c.disabled = !canVote || p.out;
    const badges = [];
    if (i === mt.caller) badges.push('<em class="b-call">📢</em>');
    if (p.out) badges.push(`<em class="b-out">${p.ej ? '🎈' : p.left ? '👻' : '❄️'}</em>`);
    else if (mt.voted[i] && !reveal) badges.push('<em class="b-vote">✓ oy verdi</em>');
    if ((V.mates || []).includes(i) || (i === V.me && V.role === 'traitor')) badges.push('<em class="b-tr">😈</em>');
    c.querySelector('.bd').innerHTML = badges.join('');
    c.querySelector('.chips').innerHTML = reveal && cnt[i] ? cnt[i].map(v2 => `<i style="--pc:${pcol(v2)}" title="${esc(pnm(v2))}"></i>`).join('') : '';
  });
  const sk = q('.hk-skip'); sk.disabled = !canVote; sk.classList.toggle('mine', mt.myVote === -1);
  q('.hk-skips').innerHTML = reveal && skipV.length ? `<span>Atla:</span>${skipV.map(v2 => `<i style="--pc:${pcol(v2)}" title="${esc(pnm(v2))}"></i>`).join('')}` : '';
  const nv = mt.voted.filter(Boolean).length, na = V.players.filter(p => !p.out).length;
  let stx;
  if (V.phase === 'meeting') stx = `💬 Konuşun! Oylama ${V.opts.talk} sn sonra açılır.`;
  else if (voting) stx = !V.alive ? `👻 Hayaletler oy veremez · ${nv}/${na} oy` : mt.myVote != null ? `✔ Oyunu verdin · ${nv}/${na} oy` : `🗳️ Bir oyuncuya dokun ya da Atla · ${nv}/${na} oy`;
  else stx = '📊 Oylar açıklandı!';
  q('.hk-mstat').textContent = stx;
  const inp = q('.hk-meet .hk-cform input');
  if (inp) { inp.placeholder = V.alive ? 'Mesaj yaz…' : '👻 Yalnız hayaletler görür…'; inp.disabled = V.me < 0 || V.phase === 'eject'; }
}
function onMeetClick(e) {
  const c = e.target.closest('[data-vote]'); if (!c || c.disabled || !V || V.phase !== 'vote') return;
  const v2 = +c.dataset.vote;
  if (v2 === -1) { ui.send({ t: 'vote', v: -1 }); Sound.special(); return; }
  if (voteSel === v2 && e.target.closest('.cf')) { ui.send({ t: 'vote', v: v2 }); Sound.special(); voteSel = null; return; }
  voteSel = voteSel === v2 ? null : v2; Sound.tick(.4); updateMeet();
}

/* ---------- uzaklaştırma canlandırması ---------- */
function updateEject() {
  const el = q('.hk-eject'); if (!el) return;
  const e = V && V.eject, show = V && V.phase === 'eject' && e && hostClock() - e.at > 2600;
  if (!!show === !el.hidden) return;
  el.hidden = !show;
  if (show) {
    ejKey = String(e.at); el.dataset.t0 = String(now());
    const nm = e.pi >= 0 ? pnm(e.pi) : '';
    const l1 = e.pi < 0 ? (e.why === 'tie' ? 'Oylar eşit! Kimse uzaklaştırılmadı.' : 'Oylama atlandı. Kimse uzaklaştırılmadı.') : e.traitor == null ? `${nm} uzaklaştırıldı.` : e.traitor ? `${nm} HAİNDİ!` : `${nm} hain DEĞİLDİ.`;
    const l2 = e.left == null || e.pi < 0 ? '' : e.left === 0 ? 'Hiç hain kalmadı!' : `${e.left} hain kaldı.`;
    el.dataset.l1 = l1; el.dataset.l2 = l2;
    el.querySelector('b').textContent = ''; el.querySelector('span').textContent = '';
    Sound.whoosh();
    requestAnimationFrame(() => { if (!ejCv) return; const r = el.getBoundingClientRect(); ejCv.width = Math.round(r.width * dpr); ejCv.height = Math.round(r.height * dpr); });
  }
}
function drawEject(t) {
  const el = q('.hk-eject'), e = V && V.eject; if (!e) return;
  const g = ejCv.getContext('2d'), w = ejCv.width / dpr, h = ejCv.height / dpr, el0 = +el.dataset.t0 || t, u = (t - el0) / 1000;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const kar = V.mapId === 'kar';
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, kar ? '#0b1d4a' : '#2a0c52'); gr.addColorStop(1, kar ? '#3a6fb0' : '#8a2a7a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const r = mulberry(5);
  for (let i = 0; i < 90; i++) { const x = r() * w, y = (r() * h + (kar ? u * (20 + r() * 40) : 0)) % h; if (kar) D.circle(g, x, y, r() * 2.4 + .8, 'rgba(255,255,255,.85)'); else D.star(g, x, y, r() * 2.5 + 1, 4, `rgba(255,240,180,${.4 + .5 * Math.abs(Math.sin(u * 2 + i))})`); }
  if (kar) { g.fillStyle = '#e6f3ff'; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 20) g.lineTo(x, h - 40 - 18 * Math.sin(x / 90)); g.lineTo(w, h); g.fill(); }
  else { g.fillStyle = '#1a0838'; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 30) g.lineTo(x, h - 30 - (x % 90 < 45 ? 30 : 0)); g.lineTo(w, h); g.fill(); }
  if (e.pi >= 0) {
    const k = clamp(u / 4.6, 0, 1), x = -60 + (w + 120) * k, y = h * .5 - h * .4 * k + Math.sin(u * 3) * 10, sc = clamp(Math.min(w, h) / 300, .9, 2.2);
    g.save(); g.translate(x, y); g.rotate(Math.sin(u * 2) * .15);
    const bcols = ['#ff4f6d', '#ffd84a', '#2bd9c0'];
    bcols.forEach((c, i) => { const bx = (i - 1) * 22 * sc, by = -120 * sc - (i === 1 ? 14 * sc : 0); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -60 * sc); g.lineTo(bx, by + 22 * sc); g.stroke(); D.ell(g, bx, by, 17 * sc, 21 * sc, c, shade(c, -.35), 2); D.ell(g, bx - 5 * sc, by - 7 * sc, 4 * sc, 6 * sc, 'rgba(255,255,255,.6)'); });
    drawBlob(g, 0, 0, pcol(e.pi), e.pi, { t: t, s: 1.6 * sc, walk: .4, sad: e.traitor === false, noShadow: true });
    g.restore();
  }
  const l1 = el.dataset.l1 || '', l2 = el.dataset.l2 || '', n1 = clamp(Math.floor((u - .6) * 22), 0, l1.length), n2 = clamp(Math.floor((u - .6 - l1.length / 22 - .4) * 22), 0, l2.length);
  const b = el.querySelector('b'), s = el.querySelector('span');
  if (b.textContent.length !== n1) { b.textContent = l1.slice(0, n1); if (n1 > 0 && n1 % 2 === 0) Sound.tick(.2); }
  if (s.textContent.length !== n2) s.textContent = l2.slice(0, n2);
}

/* ---------- yerleşim ---------- */
function mountDom() {
  const kb = !isTouch();
  root.innerHTML = `<div class="g-wrap hk">
    <div class="hk-hud">
      <div class="hk-tbar" title="Ortak görev çubuğu"><span>📋 GÖREVLER</span><div class="hk-tb"><i></i></div><b class="hk-tp">%0</b></div>
      <span class="hk-role"></span>
    </div>
    <div class="hk-main">
      <div class="hk-stage">
        <canvas class="hk-cv" aria-label="Hain Kim haritası"></canvas>
        <div class="hk-tasks"></div>
        <canvas class="hk-mini" data-act="mini" aria-label="Mini harita (büyütmek için dokun)"></canvas>
        <div class="hk-alert" hidden></div>
        <div class="hk-joy" hidden aria-label="Yürüme kolu"><i></i></div>
        <div class="hk-acts" hidden>
          <button type="button" data-act="gchat" class="hk-ab gc" hidden><b>💬</b><small>Hayalet sohbeti</small></button>
          <button type="button" data-act="sab" class="hk-ab sab" hidden><b>⚠️</b><small>Sabotaj${kb ? ' (F)' : ''}</small><i></i></button>
          <button type="button" data-act="freeze" class="hk-ab frz" hidden><b>❄️</b><small>Dondur${kb ? ' (Q)' : ''}</small><i></i></button>
          <button type="button" data-act="report" class="hk-ab rep"><b>📢</b><small>Rapor${kb ? ' (R)' : ''}</small></button>
          <button type="button" data-act="use" class="hk-ab use"><b>✋</b><small>Kullan</small></button>
        </div>
        <div class="hk-toast" aria-live="polite"></div>
        <div class="hk-gchat" hidden><header><b>👻 Hayalet sohbeti</b><button type="button" data-act="gchat" aria-label="Kapat">✕</button></header><ol class="hk-clist"></ol>${chatForm('Hayaletlere yaz…')}</div>
        <div class="hk-modal" hidden><div class="hk-mg"><header><b class="hk-mgt"></b><button type="button" class="hk-x" data-act="close" aria-label="Kapat">✕</button></header><div class="hk-mgb"></div></div></div>
      </div>
      <aside class="hk-side g-panel"></aside>
    </div>
    <div class="hk-ov">
      <div class="hk-intro" hidden></div>
      <div class="hk-meet" hidden></div>
      <div class="hk-eject" hidden><canvas></canvas><div class="hk-ejtext"><b></b><span></span></div></div>
      <div class="hk-over" hidden></div>
      <div class="hk-splash" hidden></div>
    </div>
  </div>`;
  cv = q('.hk-cv'); cg = cv.getContext('2d'); stageEl = q('.hk-stage'); miniCv = q('.hk-mini'); ejCv = q('.hk-eject canvas');
  const j = q('.hk-joy'); j.addEventListener('pointerdown', joyDown); j.addEventListener('pointermove', joyMove); j.addEventListener('pointerup', joyUp); j.addEventListener('pointercancel', joyUp);
  cv.addEventListener('contextmenu', e => e.preventDefault());
  if (window.ResizeObserver) { ro = new ResizeObserver(() => resize()); ro.observe(stageEl); }
  addEventListener('resize', resize);
  document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKey); addEventListener('blur', onBlur);
}
function renderHud() {
  const v = V, m = curMap();
  q('.hk-tb i').style.width = Math.round(v.taskPct * 100) + '%';
  q('.hk-tp').textContent = '%' + Math.round(v.taskPct * 100);
  const role = q('.hk-role');
  let rt, rc;
  if (v.me < 0) { rt = '👀 İzleyici'; rc = 'sp'; }
  else if (v.phase === 'over') { rt = v.role === 'traitor' ? '😈 Hain' : '🛰️ Mürettebat'; rc = v.role === 'traitor' ? 'tr' : 'cr'; }
  else if (!v.alive) { rt = v.role === 'traitor' ? '👻 Hayalet hain' : '👻 Hayalet'; rc = 'gh'; }
  else if (v.role === 'traitor') { rt = `😈 HAİN${(v.mates || []).length ? ' · ' + v.mates.map(i => esc(pnm(i))).join(', ') : ''}`; rc = 'tr'; }
  else { rt = '🛰️ Mürettebat'; rc = 'cr'; }
  role.innerHTML = rt; role.className = 'hk-role ' + rc;
  // görev listesi
  const tl = q('.hk-tasks');
  if (v.me >= 0 && v.tasks && v.phase !== 'over' && !v.left) {
    const done = v.tasks.filter(t => t.done).length, fake = v.role === 'traitor';
    tl.hidden = false; tl.classList.toggle('open', taskOpen);
    tl.innerHTML = `<button type="button" class="hk-th" data-act="tasks" aria-expanded="${taskOpen}">${fake ? '🎭 Sahte görevler' : '📋 Görevlerin'} <b>${done}/${v.tasks.length}</b><i>${taskOpen ? '▴' : '▾'}</i></button>
      ${taskOpen ? `<ul>${v.tasks.map(t => { const s = m.stations[t.s]; return `<li class="${t.done ? 'ok' : ''}">${t.done ? '✔' : TASKS[s.t].icon} <b>${esc(roomName(m, s.x, s.y))}:</b> ${esc(s.n)}</li>`; }).join('')}</ul>
      ${fake ? '<p>Hain görevleri sayılmaz — oyalanıyormuş gibi yap!</p>' : !v.alive ? '<p>👻 Hayaletken de görevlerini bitirip ekibe yardım edebilirsin.</p>' : ''}` : ''}`;
  } else tl.hidden = true;
  // yan panel
  const side = q('.hk-side'), mates = new Set(v.mates || []);
  const st = i => { const p = v.players[i]; if (p.left) return '👻 ayrıldı'; if (p.ej) return '🎈 uzaklaştırıldı'; if (p.out) return '❄️ donmuş'; return p.online ? '' : '📵 bağlantı yok'; };
  side.innerHTML = `<h3 class="hk-h">${m.icon} ${esc(m.name)}</h3>
    <ul class="hk-plist">${v.players.map((p, i) => `<li class="${p.out ? 'out' : ''} ${i === v.me ? 'me' : ''}" style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><b>${esc(p.name)}${i === v.me ? ' <small>(sen)</small>' : ''}${mates.has(i) || (i === v.me && v.role === 'traitor') ? ' 😈' : ''}${v.roles ? (v.roles[i] === 'T' ? ' 😈' : '') : ''}</b><span>${st(i)}</span></li>`).join('')}</ul>
    <div class="hk-help">${isTouch() ? '<p>🕹️ Sol alttaki kolla yürü. Sağ alttaki düğmelerle görev yap, rapor et.</p>' : '<p>⌨️ <b>WASD / oklar</b>: yürü · <b>E / boşluk</b>: kullan · <b>R</b>: rapor' + (v.role === 'traitor' ? ' · <b>Q</b>: dondur · <b>F</b>: sabotaj' : '') + '</p>'}
    <p>${v.role === 'traitor' ? '😈 Yalnız kalan birini dondur, tünellerden kaç, sabotaj yap. Yakalanma!' : '🛰️ Görevleri bitir. Buz kalıbı görürsen rapor et; toplantıda haini oyla!'}</p>
    <p class="dim">Hain: ${v.nT} · Dondurma bekleme: ${v.opts.cd} sn · Tartışma: ${v.opts.talk} sn · Oylama: ${v.opts.vote} sn</p></div>`;
}
function renderIntro() {
  const el = q('.hk-intro'), tr = V.role === 'traitor';
  const who = V.me < 0 ? [] : tr ? [V.me].concat(V.mates || []) : V.players.map((_, i) => i);
  el.className = 'hk-intro ' + (tr ? 'tr' : V.me < 0 ? 'sp' : 'cr');
  el.innerHTML = `<div class="hk-icard"><small>${V.me < 0 ? 'İZLEYİCİ' : 'SENİN ROLÜN'}</small>
    <h2>${V.me < 0 ? 'Oyunu izliyorsun' : tr ? 'Sen bir HAİNSİN 😈' : 'Sen bir MÜRETTEBATSIN'}</h2>
    <p>${tr ? ((V.mates || []).length ? `Diğer hain: <b>${V.mates.map(i => esc(pnm(i))).join(', ')}</b>. Birlikte herkesi dondurun!` : 'Herkesi tek tek dondur, yakalanma!') : `Aranızda <b>${V.nT}</b> hain var. Görevlerini yap, haini bul!`}</p>
    <canvas class="hk-icv"></canvas></div>`;
  el.hidden = false;
  const c = el.querySelector('canvas'), w = Math.min(560, innerWidth - 60), n = Math.max(1, who.length), hgt = 120;
  c.width = Math.round(w * dpr); c.height = Math.round(hgt * dpr); c.style.width = w + 'px'; c.style.height = hgt + 'px';
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const gap = Math.min(80, (w - 20) / n), x0 = w / 2 - gap * (n - 1) / 2, sc = clamp(gap / 64, .7, 1.25);
  who.forEach((i, k) => { const big = i === V.me; drawBlob(g, x0 + k * gap, hgt - 22 + (big ? 6 : 0), pcol(i), i, { t: 0, s: big ? sc * 1.2 : sc }); g.font = `900 ${gap < 70 ? 10 : 12}px Nunito, sans-serif`; g.textAlign = 'center'; g.fillStyle = tr ? '#ffb3c1' : '#fff'; g.fillText(pnm(i).length > 11 ? pnm(i).slice(0, 10) + '…' : pnm(i), x0 + k * gap, hgt - 4); });
}
function renderOver() {
  const el = q('.hk-over'), w = V.winner, mine = V.me >= 0 && ((w === 'traitor') === (V.role === 'traitor'));
  const trs = V.players.map((_, i) => i).filter(i => V.roles[i] === 'T');
  el.className = 'hk-over ' + (w === 'crew' ? 'cr' : 'tr');
  el.innerHTML = `<div class="hk-icard"><small>${V.me < 0 ? 'OYUN BİTTİ' : mine ? 'KAZANDIN! 🎉' : 'KAYBETTİN…'}</small><h2>${w === 'crew' ? 'MÜRETTEBAT KAZANDI!' : 'HAİNLER KAZANDI!'}</h2><p>${esc(V.why)}</p>
    <canvas class="hk-icv"></canvas><p class="hk-trs">${trs.length > 1 ? 'Hainler' : 'Hain'}: <b>${trs.map(i => esc(pnm(i))).join(', ')}</b></p></div>`;
  el.hidden = false;
  const c = el.querySelector('canvas'), cw = Math.min(420, innerWidth - 60), hgt = 120;
  c.width = Math.round(cw * dpr); c.height = Math.round(hgt * dpr); c.style.width = cw + 'px'; c.style.height = hgt + 'px';
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const win = V.players.map((_, i) => i).filter(i => (V.roles[i] === 'T') === (w === 'traitor'));
  const gap = Math.min(78, (cw - 20) / Math.max(1, win.length)), x0 = cw / 2 - gap * (win.length - 1) / 2;
  win.forEach((i, k) => drawBlob(g, x0 + k * gap, hgt - 14, pcol(i), i, { t: 0, s: clamp(gap / 62, .7, 1.2), ghost: V.players[i].out && !V.players[i].ej ? false : false }));
  if (mine) { Sound.fanfare(); FX.confetti(140); } else Sound.bankrupt();
}
function ghostSplash(by) {
  const el = q('.hk-splash');
  el.innerHTML = `<div class="hk-icard"><h2>❄️ Donduruldun!</h2><p>${by != null && by >= 0 ? `<b style="color:${pcol(by)}">${esc(pnm(by))}</b> seni buz kalıbına çevirdi!` : 'Buz kalıbına dönüştün!'}</p><p>Artık bir hayaletsin: görevlerine devam edebilir, yalnız hayaletlerle sohbet edebilirsin.</p></div>`;
  el.hidden = false; ghostSplashAt = now();
  setTimeout(() => { if (root && now() - ghostSplashAt >= 4000) el.hidden = true; }, 4100);
  el.onclick = () => { el.hidden = true; };
}

function render(v) {
  const prev = V; V = v;
  if (!v || !v.mapId) return;
  if (sceneId !== v.mapId) { scene = buildScene(v.mapId); sceneId = v.mapId; }
  const firstPaint = !prev;
  if (v.me >= 0 && v.tp && v.tp.n !== tpSeen) { tpSeen = v.tp.n; av = { x: v.tp.x, y: v.tp.y, h: Math.PI / 2, walk: 0, mv: 0 }; lastSent = null; if (modal) closeModal(true); follow(0, true); }
  if (v.me < 0) av = null;
  // diğer oyuncular
  Object.keys(v.pos).forEach(s => {
    const i = +s; if (i === v.me) return;
    const p = v.pos[s], o = others[i];
    if (!o || o.vn !== p.n) { onRemotePos(i, p.x, p.y, p.h, 0, p.g, true); if (others[i]) others[i].vn = p.n; }
    else o.g = p.g;
  });
  Object.keys(others).forEach(s => { if (!v.pos[s]) delete others[s]; });
  // yeni buz kalıpları
  if (v.phase === 'play') (v.bodies || []).forEach(b => { if (bodiesSeen.has(b.pi)) return; bodiesSeen.add(b.pi); if (!firstPaint && seen(b.x, b.y)) { anims.push({ t: 'frost', x: b.x, y: b.y, start: now(), dur: 900 }); iceSound(); } });
  else if (v.phase === 'meeting') bodiesSeen.clear();
  // hayalet oldun
  if (v.me >= 0 && lastAlive && !v.alive && v.phase === 'play' && !firstPaint && !v.left) { if (modal) closeModal(true); iceSound(); flash('bad'); ghostSplash(v.frozenBy); anims.push({ t: 'frost', x: av ? av.x : 0, y: av ? av.y : 0, start: now(), dur: 900 }); }
  lastAlive = v.me < 0 || v.alive;
  const pk = v.phase + ':' + (v.meeting ? v.meeting.n : '');
  const phaseChanged = pk !== phaseKey;
  if (phaseChanged) {
    phaseKey = pk; keys.clear();
    if (v.phase !== 'play' && modal) closeModal(true);
    if (v.phase !== 'play') { ghostChat = false; }
    requestAnimationFrame(() => { resize(); follow(0, true); });
    if (v.phase === 'intro') { renderIntro(); Sound.special(); }
    if (v.phase === 'play' && firstPaint === false && prev && prev.phase === 'intro') { banner('GÖREVLERE!', 'good'); }
  }
  q('.hk-intro').hidden = v.phase !== 'intro';
  const meetOn = v.phase === 'meeting' || v.phase === 'vote' || v.phase === 'eject';
  const mk = v.meeting ? String(v.meeting.n) : '';
  if (meetOn && v.meeting && mk !== meetKey) { meetKey = mk; buildMeet(); }
  q('.hk-meet').hidden = !(meetOn && v.meeting);
  if (meetOn && v.meeting) updateMeet();
  if (v.phase === 'over' && phaseChanged) renderOver();
  q('.hk-over').hidden = v.phase !== 'over';
  q('.hk-gchat').hidden = !(ghostChat && amGhost() && v.phase === 'play');
  root.querySelector('.hk').dataset.phase = v.phase; root.querySelector('.hk').dataset.role = v.role;
  root.querySelector('.hk').classList.toggle('touch', isTouch());
  q('.hk-joy').hidden = !(isTouch() && v.phase === 'play' && v.me >= 0 && !v.left);
  q('.hk-mini').classList.toggle('big', miniBig);
  renderHud(); renderChats(); updateReactorModal(); hudTick();
}

/* ---------- düğmeler ---------- */
function onClick(e) {
  if (!V) return;
  if (e.target.closest('.hk-meet')) { onMeetClick(e); return; }
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const act = b.dataset.act; Sound.init();
  if (act === 'use') doUse();
  else if (act === 'report') doReport();
  else if (act === 'freeze') doFreezeBtn();
  else if (act === 'sab') openSab();
  else if (act === 'close') closeModal();
  else if (act === 'mini') { miniBig = !miniBig; q('.hk-mini').classList.toggle('big', miniBig); Sound.tick(.3); }
  else if (act === 'tasks') { taskOpen = !taskOpen; renderHud(); Sound.tick(.3); }
  else if (act === 'gchat') { ghostChat = !ghostChat; q('.hk-gchat').hidden = !ghostChat; chatShown = ''; renderChats(); if (ghostChat) { const i = q('.hk-gchat input'); if (i && !isTouch()) i.focus(); } }
}
function onEvent(e) {
  if (!root) return;
  const me = ui ? ui.me : -1;
  if (e.t === 'sab') { if (e.k === 'reactor') { sirenSound(); banner('☢️ ALARM!', 'bad'); } else { Sound.bad(); banner('💡 IŞIKLAR SÖNDÜ!', 'pink'); } flash('bad'); }
  else if (e.t === 'sabfix') { Sound.good(); banner('✅ DÜZELDİ!', 'good'); }
  else if (e.t === 'meet') { sirenSound(); banner(e.reason === 'body' ? '🧊 DONMUŞ OYUNCU!' : '🚨 ACİL TOPLANTI!', 'pink'); flash('bad'); }
  else if (e.t === 'vote') { Sound.special(); banner('🗳️ OYLAMA!', 'good'); }
  else if (e.t === 'voted') { if (e.pi !== me) Sound.tick(.5); }
  else if (e.t === 'chat') { if (e.m && e.m.pi !== me) Sound.tick(.25); }
  else if (e.t === 'task') { if (e.pi === me) { toast('✔ Görev tamamlandı!', 'ok'); } }
  else if (e.t === 'vent') { anims.push({ t: 'puff', x: e.x1, y: e.y1, start: now(), dur: 600 }, { t: 'puff', x: e.x2, y: e.y2, start: now(), dur: 600 }); }
  else if (e.t === 'far') { if (e.pi === me) toast('Biraz daha yaklaş!', 'bad'); }
  else if (e.t === 'left') { Sound.bad(); }
  else if (e.t === 'play' && e.first) { Sound.whoosh(); }
}
function mount(r, api) {
  root = r; ui = api; uiRef = api; V = null; scene = null; sceneId = ''; others = {}; av = null; tpSeen = -1; keys = new Set(); anims = []; modal = null;
  bodiesSeen = new Set(); miniBig = false; ghostChat = false; taskOpen = !phoneW(); lastAlive = true; phaseKey = ''; meetKey = ''; chatShown = ''; voteSel = null; lastT = 0; sw = 300; sh = 300;
  mountDom();
  root.addEventListener('click', onClick); root.addEventListener('submit', onSubmit);
  hudT = setInterval(hudTick, 100);
  raf = requestAnimationFrame(frame);
}
function unmount() {
  if (root) { root.removeEventListener('click', onClick); root.removeEventListener('submit', onSubmit); }
  removeEventListener('resize', resize); removeEventListener('blur', onBlur);
  document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKey);
  if (ro) { ro.disconnect(); ro = null; }
  clearInterval(hudT); clearTimeout(toastT); if (raf) cancelAnimationFrame(raf); cancelAnimationFrame(mgRaf);
  raf = 0; root = null; ui = null; uiRef = null; V = null; cv = null; cg = null; stageEl = null; miniCv = null; ejCv = null; modal = null; av = null; others = {};
}

CFX.registerGame(Object.assign({
  id: 'hainkim', name: 'Hain Kim?', icon: '🚨', color: '#ff5c7a', min: 4, max: 8, hotseat: false, bot: true, localMin: 1,
  tagline: 'Görevleri yap, aranızdaki haini bul — buz kalıbı olma!',
  rules: 'Mürettebat haritada görev yapar; aralarına karışan hain(ler) yalnız kalanları dondurup buz kalıbına çevirir, tünellerden kaçar ve sabotaj yapar. Bir buz kalıbı bulunursa ya da acil düğmeye basılırsa toplantı açılır: konuşun, oylayın, en çok oyu alan uzaklaştırılır. Görevler biterse ya da hainler yakalanırsa mürettebat, hainler sayıca eşitlenirse hainler kazanır.',
  options: [
    { key: 'hain', label: 'Hain sayısı', def: '1', choices: [{ v: '1', label: '1 hain' }, { v: '2', label: '2 hain (6+ kişi)' }] },
    { key: 'gorev', label: 'Görev sayısı', def: '6', choices: [{ v: '4', label: '4' }, { v: '6', label: '6' }, { v: '8', label: '8' }] },
    { key: 'cd', label: 'Dondurma bekleme süresi', def: '30', choices: [{ v: '20', label: '20 sn' }, { v: '30', label: '30 sn' }, { v: '45', label: '45 sn' }] },
    { key: 'toplanti', label: 'Tartışma süresi', def: '60', choices: [{ v: '45', label: '45 sn' }, { v: '60', label: '60 sn' }, { v: '90', label: '90 sn' }] },
    { key: 'oylama', label: 'Oylama süresi', def: '30', choices: [{ v: '30', label: '30 sn' }] },
    { key: 'acik', label: 'Uzaklaştırma açıklaması', def: '1', choices: [{ v: '1', label: 'Açık' }, { v: '0', label: 'Kapalı' }] },
    { key: 'harita', label: 'Harita', def: 'kar', choices: [{ v: 'kar', label: '❄️ Kar İstasyonu' }, { v: 'luna', label: '🎡 Lunapark Gecesi' }, { v: 'rastgele', label: '🎲 Rastgele' }] }
  ],
  mount, render, onEvent, onFast, unmount,
  // test ve geliştirme için dışa açık yardımcılar
  _hk: { HK, MAPS, TASKS, W, H, findPath, freeAt, los, roomName, buildScene, cam: () => cam, av: () => av, others: () => others, target: () => target, modal: () => modal, setAv: (x, y) => { if (av) { av.x = x; av.y = y; sendPos(); } }, doUse: () => doUse(), RULES }
}, RULES));
})();
