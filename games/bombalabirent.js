/* =========================================================================
   BOMBA LABİRENT — gerçek zamanlı ızgara arenası (2–8 oyuncu)
     · Modlar: Klasik (son kalan, 3'te 2 / 5'te 3) · Takım · Altın Avı
     · Arenalar: Bahçe · Buz Diyarı (kayma) · Lav Mağarası (fışkıran çatlaklar)
       · Fabrika (taşıyıcı bantlar) · Rastgele
     · Her cihaz kendi karakterini ızgaraya oturan yumuşak hareketle yerelde
       simüle eder ve konumunu hızlı kanaldan (ui.fast) yayar. Yöneten cihaz
       (yerel ya da oda kurucusu) bombaları doğrular, patlama zamanını mutlak
       kurucu saatiyle belirler, sandıkları kırar, güçleri dağıtır, ölümlere ve
       botlara karar verir.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, flash, initial } = window.CFX;

/* ------------------------------------------------------------------ sabitler ve yardımcılar */
const TICK = 50, FUSE = 2500, FLAME = 550, RM_FUSE = 10000, COUNT_MS = 3200, END_MS = 4800;
const SPD0 = 3.3, SPD_K = .5, SPD_MAX = 4, SLOW_SPD = 2.1, ICE_K = 1.15, BELT = 1.6;
const SLIDE_SP = 9, CURSE_MS = 12000, SHIELD_IMM = 1600, RESPAWN_MS = 3000, SPAWN_IMM = 2400, CURSE_CD = 1500;
const SHRINK_IV = 330, SHRINK_WARN = 1100, SHRINK_LEAD = 1500;
const LAVA_P = 7000, LAVA_WARN = 1700, LAVA_BURN = 800, LAVA_LEAD = 2500;
const REMOTE_GRACE = 120, MAX_B = 8, MAX_R = 8, HGT = .3;
const TAU = Math.PI * 2;
const DX = [0, -1, 1, 0, 0], DY = [0, 0, 0, -1, 1];
const BELTD = { L: 1, R: 2, U: 3, D: 4 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pickR = arr => arr[Math.floor(Math.random() * arr.length)];
const shuf = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const optNum = (v, allowed, def) => { const n = parseInt(v, 10); return allowed.includes(n) ? n : def; };
const r2 = v => Math.round(v * 100) / 100;
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
const shade = (h, t) => /^#[0-9a-f]{6}$/i.test(h) ? (t < 0 ? mix(h, '#140a1e', -t) : mix(h, '#ffffff', t)) : h;
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const MODES = {
  klasik: { name: 'Klasik', icon: '💣' },
  takim: { name: 'Takım', icon: '🤝' },
  altin: { name: 'Altın Avı', icon: '🪙' }
};
const THEMES = {
  bahce: { name: 'Bahçe', icon: '🌷', desc: 'Klasik çim saha: taş sütunlar ve tahta sandıklar.' },
  buz: { name: 'Buz Diyarı', icon: '❄️', desc: 'Ortadaki buzda kayarsın: tuşu bırakınca durmazsın!' },
  lav: { name: 'Lav Mağarası', icon: '🌋', desc: 'Çatlaklar parlayınca uzak dur: lav fışkırır!' },
  fabrika: { name: 'Fabrika', icon: '🏭', desc: 'Taşıyıcı bantlar seni taşır; ters yöne yürümek zordur.' }
};
const THEME_IDS = Object.keys(THEMES);
const ITEMS = {
  bomba: { name: 'Bomba+', desc: 'Aynı anda bir bomba daha', col: '#5a6cff', w: 11 },
  alev: { name: 'Alev+', desc: 'Patlama menzili +1', col: '#ff6a2a', w: 11 },
  hiz: { name: 'Hız', desc: 'Daha hızlı koşarsın', col: '#2bd96b', w: 7 },
  tekme: { name: 'Tekme', desc: 'Bombaya doğru yürü: kayarak gider', col: '#ffb627', w: 4 },
  eldiven: { name: 'Eldiven', desc: 'Bombanın üstünde tekrar bas: fırlat', col: '#ff5fb0', w: 3 },
  kalkan: { name: 'Kalkan', desc: 'Bir patlamayı engeller', col: '#5ad1ff', w: 4 },
  kumanda: { name: 'Uzaktan Kumanda', desc: 'Bombalarını istediğin an patlat', col: '#c77dff', w: 2 },
  kafatasi: { name: 'Kafatası', desc: 'Rastgele lanet! Dokunduğuna bulaşır', col: '#8a8494', w: 3 },
  altin: { name: 'Altın', desc: 'Altın Avı puanı', col: '#ffd84a', w: 0 }
};
const PU_IDS = ['bomba', 'alev', 'hiz', 'tekme', 'eldiven', 'kalkan', 'kumanda', 'kafatasi'];
const CURSES = { ters: { name: 'Ters kontrol', icon: '🔄' }, yavas: { name: 'Kaplumbağa', icon: '🐢' }, surekli: { name: 'Durmadan bomba', icon: '💣' } };
const CURSE_IDS = Object.keys(CURSES);
const TEAMS = [{ name: 'Kırmızı', col: '#ff4f6d', icon: '🔴' }, { name: 'Mavi', col: '#4f8cff', icon: '🔵' }];
const SKILL = {
  kolay: { think: 300, margin: 230, chase: .25, rand: 2.4, bombP: .55 },
  normal: { think: 130, margin: 150, chase: .75, rand: 1.1, bombP: .9 },
  zor: { think: 60, margin: 130, chase: 1.1, rand: .45, bombP: 1 }
};

/* ------------------------------------------------------------------ arena ve ızgara */
const dims = n => (n <= 5 ? [15, 13] : [17, 15]);
const solidCh = c => c === '#' || c === 'c' || c === 'X';
function isPillar(x, y, W, H) { return x === 0 || y === 0 || x === W - 1 || y === H - 1 || (x % 2 === 0 && y % 2 === 0); }
function spawnList(W, H) {
  const mx = Math.floor(W / 2), my = Math.floor(H / 2);
  return [[1, 1], [W - 2, H - 2], [W - 2, 1], [1, H - 2], [mx, 1], [mx, H - 2], [1, my], [W - 2, my]];
}
const spiralCache = {};
function spiralOf(W, H) {
  const key = W + 'x' + H; if (spiralCache[key]) return spiralCache[key];
  const out = []; let x0 = 1, y0 = 1, x1 = W - 2, y1 = H - 2;
  while (x0 <= x1 && y0 <= y1) {
    for (let x = x0; x <= x1; x++) out.push([x, y0]);
    for (let y = y0 + 1; y <= y1; y++) out.push([x1, y]);
    if (y1 > y0) for (let x = x1 - 1; x >= x0; x--) out.push([x, y1]);
    if (x1 > x0) for (let y = y1 - 1; y > y0; y--) out.push([x0, y]);
    x0++; y0++; x1--; y1--;
  }
  return (spiralCache[key] = out.filter(([x, y]) => !isPillar(x, y, W, H)).map(([x, y]) => y * W + x));
}
function genArena(theme, W, H, used, mode) {
  const N = W * H, grid = Array(N).fill('.'), feat = Array(N).fill('.');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isPillar(x, y, W, H)) grid[y * W + x] = '#';
  const clear = new Set();
  used.forEach(([x, y]) => { clear.add(y * W + x); for (let d = 1; d <= 4; d++) { const k = (y + DY[d]) * W + x + DX[d]; if (grid[k] === '.') clear.add(k); } });
  const cracks = [];
  if (theme === 'buz') {
    for (let y = 3; y <= H - 4; y++) for (let x = 3; x <= W - 4; x++) if (grid[y * W + x] === '.') feat[y * W + x] = 'i';
  } else if (theme === 'fabrika') {
    const r1 = 3, r2 = H - 4, mx = Math.floor(W / 2), c = mx % 2 ? mx : mx - 1;
    for (let x = 2; x <= W - 3; x++) { feat[r1 * W + x] = 'R'; feat[r2 * W + x] = 'L'; }
    for (let y = 5; y <= H - 6; y++) feat[y * W + c] = 'D';
  } else if (theme === 'lav') {
    const sp = spawnList(W, H), cand = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const k = y * W + x; if (grid[k] !== '.' || clear.has(k)) continue;
      if (sp.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 3)) continue;
      cand.push([x, y]);
    }
    const want = Math.round(N / 18), taken = new Set();
    for (const [x, y] of shuf(cand)) {
      if (cracks.length >= want) break;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => taken.has((y + b) * W + x + a))) continue;
      taken.add(y * W + x); feat[y * W + x] = 'l';
      cracks.push([x, y, randInt(0, LAVA_P / 250 - 1) * 250]);
    }
  }
  const dens = mode === 'altin' ? .6 : .72;
  for (let k = 0; k < N; k++) if (grid[k] === '.' && !clear.has(k) && feat[k] !== 'l' && !BELTD[feat[k]] && Math.random() < dens) grid[k] = 'c';
  return { grid, feat: feat.join(''), cracks };
}
function mkWorld(W, H, grid, feat, bombs, extraSolid) {
  const bm = new Map(); for (const b of bombs) bm.set(b.y * W + b.x, b.id);
  return {
    W, H,
    solid: (x, y) => x < 0 || y < 0 || x >= W || y >= H || solidCh(grid[y * W + x]) || (extraSolid ? extraSolid(y * W + x) : false),
    bomb: (x, y) => bm.get(y * W + x),
    feat: (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '.' : feat[y * W + x])
  };
}
function blockedFor(Wd, b, x, y) {
  if (Wd.solid(x, y)) return true;
  const id = Wd.bomb(x, y);
  return id != null && !(b.pass && b.pass.includes(id));
}
// Izgaraya oturan hareket: önce şeride hizalan, sonra ilerle; önü kapalıysa karo ortasında dur
function tryMove(Wd, b, dir, s) {
  const dx = DX[dir], dy = DY[dir], a = dx ? 'x' : 'y', o = dx ? 'y' : 'x', sg = dx || dy;
  const cell = (av, ov) => (dx ? [av, ov] : [ov, av]);
  const blk = (av, ov) => { const [x, y] = cell(av, ov); return blockedFor(Wd, b, x, y); };
  let rem = s;
  const ca = Math.round(b[a]), co = Math.round(b[o]), off = b[o] - co;
  if (Math.abs(off) > 1e-4) {
    const before = (b[a] - ca) * sg < -1e-4;
    if (before || !blk(ca + sg, co)) { const m = Math.min(Math.abs(off), rem); b[o] -= Math.sign(off) * m; rem -= m; if (Math.abs(b[o] - co) < 1e-4) b[o] = co; }
    else {
      const co2 = co + Math.sign(off);
      if (Math.abs(off) > .2 && !blk(ca, co2) && !blk(ca + sg, co2)) { const m = Math.min(1 - Math.abs(off), rem); b[o] += Math.sign(off) * m; rem -= m; }
      else { b.blk = cell(ca + sg, co); return s - rem; }
    }
  }
  if (rem <= 1e-6) return s - rem;
  const co3 = Math.round(b[o]);
  if (Math.abs(b[o] - co3) > 1e-4) return s - rem;
  const ca2 = Math.round(b[a]);
  if (!blk(ca2 + sg, co3)) { b[a] += sg * rem; rem = 0; }
  else {
    const to = (ca2 - b[a]) * sg;
    if (to > 0) { const m = Math.min(to, rem); b[a] += sg * m; rem -= m; }
    if ((ca2 - b[a]) * sg < .03) b.blk = cell(ca2 + sg, co3);
  }
  return s - rem;
}
// Ortak hareket adımı (yerel oyuncu ve botlar): buzda kayma, bantta taşınma
function stepBody(Wd, b, dir, spd, dt) {
  b.blk = null;
  let left = dt, moved = 0;
  while (left > 1e-6) {
    const h = Math.min(left, .03); left -= h;
    const tx = Math.round(b.x), ty = Math.round(b.y), f = Wd.feat(tx, ty);
    let md = dir, s = spd * h;
    const belt = BELTD[f] || 0;
    if (f === 'i') { s *= ICE_K; if (!dir && b.ice) md = b.md; }
    else if (!dir && b.ice && b.md) {
      const a = DX[b.md] ? 'x' : 'y', sg = DX[b.md] || DY[b.md], c = Math.round(b[a]), to = (c - b[a]) * sg;
      if (to > 1e-4) { const m = Math.min(to, s); b[a] += sg * m; moved += m; } else { b.ice = false; b.md = 0; }
      continue;
    }
    if (belt) {
      if (!dir) { md = belt; s = BELT * h; }
      else if ((DX[dir] !== 0) === (DX[belt] !== 0)) { s = dir === belt ? s + BELT * h : s - BELT * h; if (s < 0) { md = belt; s = -s; } }
    }
    if (!md) { b.ice = false; continue; }
    const m = tryMove(Wd, b, md, s);
    moved += m;
    if (f === 'i') { if (m > 1e-5) { b.md = md; b.ice = true; } else if (!dir) { b.md = 0; b.ice = false; } }
    else if (dir && m > 1e-5) { b.md = dir; b.ice = false; }
  }
  if (dir) b.d = dir;
  b.m = moved > 1e-3 ? 1 : 0;
  return moved;
}
const overlaps = (b, x, y) => Math.abs(b.x - x) < .8 && Math.abs(b.y - y) < .8;
function updPass(b, bombs) { b.pass = (b.pass || []).filter(id => { const bb = bombs.find(o => o.id === id); return bb && overlaps(b, bb.x, bb.y); }); }
const speedOf = p => (p.curse === 'yavas' ? SLOW_SPD : SPD0 + Math.min(SPD_MAX, p.s || 0) * SPD_K);

/* ------------------------------------------------------------------ patlama hesapları */
// Alev karoları: duvarda durur, sandığı kırıp durur, başka bombaya değince onu da tutuşturup durur
function flameSet(W, H, grid, x, y, r, passCrates, bAt) {
  const out = [{ k: y * W + x, kind: 'c' }];
  for (let d = 1; d <= 4; d++) for (let i = 1; i <= r; i++) {
    const tx = x + DX[d] * i, ty = y + DY[d] * i; if (tx < 0 || ty < 0 || tx >= W || ty >= H) break;
    const k = ty * W + tx, c = grid[k];
    if (c === '#' || c === 'X') break;
    const end = i === r || (c === 'c' && !(passCrates && passCrates.has(k))) || (bAt && bAt.has(k));
    out.push({ k, kind: end ? 'LRUD'[d - 1] : (d <= 2 ? 'h' : 'v') });
    if (end) break;
  }
  return out;
}
function mergeKind(a, b) {
  if (!a || a === b) return b;
  const H = 'hLR', V = 'vUD';
  if (H.includes(a) && H.includes(b)) return 'h';
  if (V.includes(a) && V.includes(b)) return 'v';
  return 'c';
}
function bombRest(b) { if (b.fl) return [b.fl.x1, b.fl.y1]; if (b.sl) return [b.sl.x0 + b.sl.dx * b.sl.n, b.sl.y0 + b.sl.dy * b.sl.n]; return [b.x, b.y]; }
function nextErupt(t0, ph, after) { let k = Math.ceil((after - t0 - ph) / LAVA_P); if (k < 0) k = 0; return t0 + ph + k * LAVA_P; }
function lavaOn(t0, ph, now) { if (!t0 || now < t0 + ph) return false; return ((now - t0 - ph) % LAVA_P) < LAVA_BURN; }
// Tehlike haritası: her karo için ölümcül zaman aralıkları (kurucu saati)
function dangerMap(st, now, extra) {
  const W = st.W, H = st.H, N = W * H, iv = new Array(N).fill(null);
  const add = (k, a, b) => { (iv[k] || (iv[k] = [])).push(a, b); };
  for (const f of st.fire) add(f.y * W + f.x, -Infinity, f.until + 90);
  const bs = st.bombs.map(b => { const [x, y] = bombRest(b); return { x, y, r: b.r, E: b.rm ? Math.min(b.ex, Math.max(now + 400, b.at + 1500)) : b.ex, k: y * W + x }; });
  if (extra) bs.push(extra);
  if (bs.length) {
    const bAt = new Map(); bs.forEach((b, i) => bAt.set(b.k, i));
    const fl = bs.map(b => flameSet(W, H, st.grid, b.x, b.y, b.r, null, bAt));
    for (let it = 0; it < bs.length; it++) {
      let ch = false;
      bs.forEach((b, i) => fl[i].forEach(f => { const j = bAt.get(f.k); if (j != null && j !== i && bs[j].E > b.E) { bs[j].E = b.E; ch = true; } }));
      if (!ch) break;
    }
    const order = bs.map((b, i) => i).sort((a, b) => bs[a].E - bs[b].E), gone = new Set();
    for (const i of order) {
      const b = bs[i];
      for (const f of flameSet(W, H, st.grid, b.x, b.y, b.r, gone, bAt)) { add(f.k, b.E - 90, b.E + FLAME + 130); if (st.grid[f.k] === 'c') gone.add(f.k); }
    }
  }
  if (st.cracks && st.lavaT0) for (const [x, y, ph] of st.cracks) { let T = nextErupt(st.lavaT0, ph, now - LAVA_BURN - 200); for (let q = 0; q < 2; q++, T += LAVA_P) add(y * W + x, T - 300, T + LAVA_BURN + 150); }
  if (st.shrink) { const ord = spiralOf(W, H); for (let i = 0; i < ord.length; i++) { const L = st.shrink.start + i * st.shrink.iv; if (L > now + 6000) break; add(ord[i], L - 250, Infinity); } }
  return iv;
}
function lethal(iv, k, a, b) { const l = iv[k]; if (!l) return false; for (let i = 0; i < l.length; i += 2) if (l[i] < b && l[i + 1] > a) return true; return false; }
function firstDanger(iv, k, from) { const l = iv[k]; if (!l) return Infinity; let m = Infinity; for (let i = 0; i < l.length; i += 2) if (l[i + 1] > from) m = Math.min(m, Math.max(from, l[i])); return m; }

/* ------------------------------------------------------------------ KURALLAR (yöneten cihaz) */
let uiRef = null;
function fastOut(o) { if (uiRef && uiRef.fast && uiRef.mode === 'online') { try { uiRef.fast(o); } catch { /* */ } } }
const pname = (st, i) => (st.players[i] ? st.players[i].name : '?');
function setPhase(st, ph, ms) { st.phase = ph; st.endsAt = Date.now() + ms; st.phaseDur = Math.max(1, ms); }
const enemies = (st, a, b) => a !== b && (st.mode !== 'takim' || st.players[a].team !== st.players[b].team);
function newBot() { return { nx: null, ny: null, tgt: -1, tgtUntil: 0, think: 0, idle: 0, md: 0, ice: false, pass: [], det: 0, kickAt: 0 }; }
function worldOfState(st) { return mkWorld(st.W, st.H, st.grid, st.feat, st.bombs.filter(b => !b.fl)); }
const restBombAt = (st, x, y) => st.bombs.find(b => !b.fl && b.x === x && b.y === y);
const fireAt = (st, x, y, now) => st.fire.find(f => f.x === x && f.y === y && f.until > now);
const playerAtTile = (st, x, y, except) => st.pl.findIndex((p, i) => i !== except && p.alive && Math.round(p.x) === x && Math.round(p.y) === y);
const inside = (st, x, y) => x > 0 && y > 0 && x < st.W - 1 && y < st.H - 1;

function spawnsFor(st) {
  const n = st.players.length, W = st.W, H = st.H, sp = spawnList(W, H);
  if (st.mode === 'takim') {
    const mx = Math.floor(W / 2), my = Math.floor(H / 2);
    const side = [[[1, 1], [1, H - 2], [1, my], [mx, 1]], [[W - 2, H - 2], [W - 2, 1], [W - 2, my], [mx, H - 2]]];
    const c = [0, 0];
    return st.players.map(p => side[p.team][c[p.team]++ % 4]);
  }
  const pts = sp.slice(0, n <= 4 ? 4 : 8), order = shuf(st.players.map((_, i) => i)), out = [];
  order.forEach((pi, k) => { out[pi] = pts[k % pts.length]; });
  return out;
}
function startRound(st, ctx) {
  st.round++;
  const now = Date.now(), n = st.players.length;
  let th = st.harita; if (!THEMES[th]) { const pool = THEME_IDS.filter(t => t !== st.arena); th = pickR(pool.length ? pool : THEME_IDS); }
  st.arena = th;
  [st.W, st.H] = dims(n);
  const sp = spawnsFor(st);
  const A = genArena(th, st.W, st.H, sp, st.mode);
  st.grid = A.grid; st.feat = A.feat; st.cracks = A.cracks; st.spawns = sp;
  st.bombs = []; st.fire = []; st.fireLog = []; st.items = []; st.sudden = false; st.shrink = null; st.shrinkK = 0; st.endPending = 0; st.last = null; st.lavaT0 = 0; st.pending = [];
  st.rk = st.players.map(() => 0);
  st.pl = st.players.map((_, i) => ({ x: sp[i][0], y: sp[i][1], d: 4, m: 0, t: now, alive: true, deadAt: 0, imm: 0, b: 1, r: 2, s: 0, kick: false, glove: false, shield: false, remote: false, curse: null, cu: 0, ccd: 0, respawnAt: 0 }));
  st.tpv = st.tpv.map(v => v + 1);
  st.bot = {}; st.players.forEach((p, i) => { if (p.isBot || st.ai[i]) st.bot[i] = newBot(); });
  setPhase(st, 'count', COUNT_MS);
  const md = MODES[st.mode];
  ctx.emit({ t: 'round', round: st.round }, st.mode === 'altin' ? `${md.icon} Altın Avı · ${THEMES[th].name}: en çok altını topla!` : `Tur ${st.round} · ${md.icon} ${md.name} · ${THEMES[th].icon} ${THEMES[th].name}`, 'gold');
  ctx.sync();
}
function startPlay(st, ctx) {
  const now = Date.now();
  setPhase(st, 'play', st.dur * 1000); st.playAt = now;
  if (st.arena === 'lav') st.lavaT0 = now + LAVA_LEAD;
  st.nextCoinAt = now + 2500;
  st.pl.forEach(p => { p.t = now; });
  ctx.emit({ t: 'go' }, 'BAŞLA! Sandıkları patlat, rakiplerini köşeye sıkıştır.');
}
function addPassAll(st, b) {
  for (const k of Object.keys(st.bot)) { const m = st.bot[k], p = st.pl[k]; if (p.alive && overlaps(p, b.x, b.y) && !m.pass.includes(b.id)) m.pass.push(b.id); }
}
function placeBomb(st, pi, a, ctx, now) {
  const p = st.pl[pi]; if (!p || !p.alive || st.phase !== 'play') return false;
  let x = Math.round(p.x), y = Math.round(p.y);
  const tx = a && Number.isInteger(a.x) ? a.x : null, ty = a && Number.isInteger(a.y) ? a.y : null;
  if (tx != null && ty != null && Math.abs(tx - p.x) <= 1.3 && Math.abs(ty - p.y) <= 1.3 && Math.abs(tx - p.x) + Math.abs(ty - p.y) <= 1.6) { x = tx; y = ty; }
  if (!inside(st, x, y) || solidCh(st.grid[y * st.W + x])) return false;
  const here = restBombAt(st, x, y);
  if (here) { if (p.glove && !here.sl) return throwBomb(st, pi, here, a && a.d ? a.d | 0 : p.d, ctx, now); return false; }
  if (st.bombs.filter(b => b.o === pi).length >= p.b) return false;
  if (fireAt(st, x, y, now)) return false;
  const b = { id: ++st.idc, x, y, o: pi, r: p.r, at: now, ex: now + (p.remote ? RM_FUSE : FUSE), rm: p.remote ? 1 : 0 };
  st.bombs.push(b); addPassAll(st, b);
  ctx.emit({ t: 'bomb', id: b.id, pi, x, y });
  st.dirty = true;
  return true;
}
function landFree(st, x, y, id) { return inside(st, x, y) && !solidCh(st.grid[y * st.W + x]) && !st.bombs.some(b => b.id !== id && !b.fl && b.x === x && b.y === y) && playerAtTile(st, x, y, -1) < 0; }
function throwBomb(st, pi, b, d, ctx, now) {
  if (!(d >= 1 && d <= 4)) d = st.pl[pi].d || 4;
  const W = st.W, H = st.H; let tx = b.x, ty = b.y, hops = 0, ok = false;
  for (let i = 0; i < 40; i++) {
    tx += DX[d]; ty += DY[d]; hops++;
    if (tx < 1) tx += W - 2; if (tx > W - 2) tx -= W - 2; if (ty < 1) ty += H - 2; if (ty > H - 2) ty -= H - 2;
    if (hops >= 3 && landFree(st, tx, ty, b.id)) { ok = true; break; }
  }
  if (!ok) return false;
  const dur = 380 + hops * 60;
  b.fl = { x0: b.x, y0: b.y, x1: tx, y1: ty, t0: now, dur, d, hops };
  b.x = tx; b.y = ty; b.ex = Math.max(b.ex, now + dur + 650);
  ctx.emit({ t: 'throw', id: b.id, pi });
  st.dirty = true;
  return true;
}
function slideFree(st, x, y, id) { return inside(st, x, y) && !solidCh(st.grid[y * st.W + x]) && !st.bombs.some(b => b.id !== id && !b.fl && b.x === x && b.y === y) && playerAtTile(st, x, y, -1) < 0; }
function kickBomb(st, pi, a, ctx, now) {
  const p = st.pl[pi]; if (!p || !p.alive || !p.kick || st.phase !== 'play') return false;
  const b = st.bombs.find(o => o.id === a.id); if (!b || b.fl || b.sl) return false;
  const d = a.d | 0; if (d < 1 || d > 4) return false;
  const ex = b.x - DX[d], ey = b.y - DY[d];
  if (Math.abs(p.x - ex) > 1.15 || Math.abs(p.y - ey) > 1.15) return false;
  let n = 0; while (n < 30 && slideFree(st, b.x + DX[d] * (n + 1), b.y + DY[d] * (n + 1), b.id)) n++;
  if (n <= 0) return false;
  b.sl = { x0: b.x, y0: b.y, dx: DX[d], dy: DY[d], t0: now, n, sp: SLIDE_SP };
  ctx.emit({ t: 'kick', id: b.id, pi });
  st.dirty = true;
  return true;
}
function remoteDet(st, pi, ctx, now) {
  const p = st.pl[pi]; if (!p || !p.alive || st.phase !== 'play') return false;
  const own = st.bombs.filter(b => b.o === pi && b.rm && !b.fl).sort((a, b) => a.at - b.at);
  if (!own.length) return false;
  detonate(st, [own[0]], ctx, now);
  return true;
}
function stepSlides(st, now) {
  for (const b of st.bombs) {
    const s = b.sl; if (!s) continue;
    const prog = Math.min(s.n, (now - s.t0) * s.sp / 1000);
    const want = Math.round(prog), cur = Math.round((b.x - s.x0) * s.dx + (b.y - s.y0) * s.dy);
    for (let k = cur + 1; k <= want; k++) {
      const nx = s.x0 + s.dx * k, ny = s.y0 + s.dy * k;
      if (!slideFree(st, nx, ny, b.id)) { s.n = k - 1; break; }
      b.x = nx; b.y = ny;
    }
    if ((now - s.t0) * s.sp / 1000 >= s.n) { b.x = s.x0 + s.dx * s.n; b.y = s.y0 + s.dy * s.n; delete b.sl; st.dirty = true; addPassAll(st, b); }
  }
}
function stepFlights(st, now) {
  for (const b of st.bombs) if (b.fl && now >= b.fl.t0 + b.fl.dur) {
    delete b.fl; st.dirty = true;
    if (!landFree(st, b.x, b.y, b.id)) {   // iniş karesi bu arada doldu: bir kare daha zıpla
      for (let d = 1; d <= 4; d++) { const x = b.x + DX[d], y = b.y + DY[d]; if (landFree(st, x, y, b.id)) { b.x = x; b.y = y; break; } }
    }
    addPassAll(st, b);
  }
}
function rollDrop(st) {
  if (st.mode === 'altin') { const r = Math.random(); if (r < .45) return { k: 'altin', v: Math.random() < .12 ? 3 : 1 }; if (r < .67) return { k: pickW() }; return null; }
  return Math.random() < .38 ? { k: pickW() } : null;
}
function pickW() { const tot = PU_IDS.reduce((s, k) => s + ITEMS[k].w, 0); let r = Math.random() * tot; for (const k of PU_IDS) { r -= ITEMS[k].w; if (r <= 0) return k; } return 'bomba'; }
// Zincirleme patlama: aynı anda patlayan tüm bombalar, alev karoları, kırılan sandıklar
function detonate(st, first, ctx, now) {
  const W = st.W, H = st.H, queue = first.slice(), done = new Set(), fireMap = new Map(), crates = new Set(), burned = [];
  let owner = first[0] ? first[0].o : -1;
  while (queue.length) {
    const b = queue.shift(); if (done.has(b.id)) continue; done.add(b.id);
    st.bombs = st.bombs.filter(o => o.id !== b.id);
    if (b.sl) { delete b.sl; }
    const bAt = new Map(); st.bombs.forEach(o => { if (!o.fl && !done.has(o.id)) bAt.set(o.y * W + o.x, o); });
    for (const f of flameSet(W, H, st.grid, b.x, b.y, b.r, null, bAt)) {
      const prev = fireMap.get(f.k);
      fireMap.set(f.k, { kind: mergeKind(prev && prev.kind, f.kind), o: prev ? prev.o : b.o });
      if (st.grid[f.k] === 'c') crates.add(f.k);
      const nb = bAt.get(f.k); if (nb) queue.push(nb);
    }
  }
  // eşyalar yanar
  st.items = st.items.filter(it => { const k = it.y * W + it.x; if (fireMap.has(k) && it.at <= now) { burned.push([it.x, it.y, it.k]); return false; } return true; });
  const cr = [];
  crates.forEach(k => {
    st.grid[k] = '.'; const x = k % W, y = (k - x) / W; cr.push(k);
    const dr = rollDrop(st); if (dr) st.items.push({ id: ++st.idc, x, y, k: dr.k, v: dr.v || 0, at: now + FLAME - 60 });
  });
  const fl = [];
  fireMap.forEach((f, k) => {
    const x = k % W, y = (k - x) / W, ex = st.fire.find(o => o.x === x && o.y === y);
    if (ex) { ex.kind = mergeKind(ex.kind, f.kind); ex.at = now; ex.until = now + FLAME; ex.o = f.o; }
    else st.fire.push({ x, y, kind: f.kind, at: now, until: now + FLAME, o: f.o });
    fl.push([x, y, f.kind]);
  });
  // ölü sahibinin uzaktan kumandalı bombaları artık normal fitille patlar (değişiklik yok)
  ctx.emit({ t: 'boom', at: now, o: owner, n0: done.size, f: fl, cr, ib: burned });
  st.dirty = true;
}
function hurt(st, pi, by, how, ctx, now, force) {
  const p = st.pl[pi]; if (!p || !p.alive) return false;
  if (!force && p.imm > now) return false;
  if (!force && p.shield) { p.shield = false; p.imm = now + SHIELD_IMM; ctx.emit({ t: 'shield', pi }, `🛡️ ${pname(st, pi)} kalkanıyla kurtuldu!`); st.dirty = true; return false; }
  p.alive = false; p.deadAt = now; p.m = 0; p.curse = null;
  st.deaths[pi]++;
  if (st.mode !== 'altin') st.pl.forEach((q, j) => { if (q.alive && j !== pi) st.surv[j]++; });
  const credit = by >= 0 && by !== pi && enemies(st, by, pi);
  if (credit) { st.kills[by]++; st.rk[by]++; }
  st.bombs.forEach(b => { if (b.o === pi && b.rm) { b.rm = 0; b.ex = Math.min(b.ex, now + FUSE); } });
  let lost = 0;
  if (st.mode === 'altin') {
    lost = Math.min(st.coins[pi], Math.max(st.coins[pi] > 0 ? 1 : 0, Math.floor(st.coins[pi] / 2)));
    st.coins[pi] -= lost; scatterCoins(st, Math.round(p.x), Math.round(p.y), lost, now);
    p.respawnAt = now + RESPAWN_MS;
  }
  const P = pname(st, pi);
  const msg = how === 'ezil' ? `🧱 ${P} düşen blokların altında kaldı!` : how === 'lav' ? `🌋 ${P} lava yakalandı — PUF!` :
    by === pi ? `💥 ${P} kendi bombasına yakalandı — PUF!` : by >= 0 ? `💥 ${P}, ${pname(st, by)} tarafından PUF edildi!` : `💥 ${P} PUF oldu!`;
  ctx.emit({ t: 'die', pi, by, how, x: r2(p.x), y: r2(p.y), lost }, msg + (lost ? ` (${lost} altın düştü)` : ''), 'bad');
  st.dirty = true;
  checkWin(st, now);
  return true;
}
function scatterCoins(st, x0, y0, total, now) {
  if (total <= 0) return;
  const W = st.W, seen = new Set([y0 * W + x0]), q = [[x0, y0]], spots = [];
  while (q.length && spots.length < 6) {
    const [x, y] = q.shift();
    if (!solidCh(st.grid[y * W + x]) && !st.items.some(it => it.x === x && it.y === y)) spots.push([x, y]);
    for (let d = 1; d <= 4; d++) { const nx = x + DX[d], ny = y + DY[d], k = ny * W + nx; if (inside(st, nx, ny) && !seen.has(k) && st.grid[k] !== '#' && st.grid[k] !== 'X') { seen.add(k); q.push([nx, ny]); } }
  }
  if (!spots.length) return;
  const n = Math.min(spots.length, total), base = Math.floor(total / n); let extra = total - base * n;
  for (let i = 0; i < n; i++) { const v = base + (extra-- > 0 ? 1 : 0); if (v > 0) st.items.push({ id: ++st.idc, x: spots[i][0], y: spots[i][1], k: 'altin', v, at: now + FLAME + 120 }); }
}
function aliveIdx(st) { return st.pl.map((p, i) => (p.alive ? i : -1)).filter(i => i >= 0); }
function checkWin(st, now) {
  if (st.mode === 'altin' || st.phase !== 'play' || st.endPending) return;
  const al = aliveIdx(st);
  const done = st.mode === 'takim' ? new Set(al.map(i => st.players[i].team)).size <= 1 : al.length <= 1;
  if (done) { st.endPending = now + 750; if (st.shrink) st.shrink.stop = now; }
}
function applyItem(st, pi, it, ctx, now) {
  const p = st.pl[pi], P = pname(st, pi);
  let log = null;
  switch (it.k) {
    case 'bomba': p.b = Math.min(MAX_B, p.b + 1); break;
    case 'alev': p.r = Math.min(MAX_R, p.r + 1); break;
    case 'hiz': p.s = Math.min(SPD_MAX, p.s + 1); break;
    case 'tekme': p.kick = true; log = `🦶 ${P} Tekme aldı: bombaları kaydırabilir!`; break;
    case 'eldiven': p.glove = true; log = `🧤 ${P} Eldiven aldı: bombaları fırlatabilir!`; break;
    case 'kalkan': p.shield = true; break;
    case 'kumanda': p.remote = true; log = `📡 ${P} Uzaktan Kumanda aldı!`; break;
    case 'kafatasi': { const c = pickR(CURSE_IDS); p.curse = c; p.cu = now + CURSE_MS; p.ccd = now + CURSE_CD; log = `☠️ ${P} lanetlendi: ${CURSES[c].name}!`; break; }
    case 'altin': st.coins[pi] += it.v || 1; break;
    default: break;
  }
  ctx.emit({ t: 'pick', pi, k: it.k, x: it.x, y: it.y, v: it.v || 0, c: p.curse }, log, it.k === 'kafatasi' ? 'bad' : null);
  st.dirty = true;
}
function respawn(st, pi, ctx, now) {
  const D = dangerMap(st, now), W = st.W;
  const cands = st.spawns.concat(spawnList(st.W, st.H)).filter(([x, y]) => !solidCh(st.grid[y * W + x]) && !restBombAt(st, x, y));
  let best = null, bs = -1e9;
  for (const [x, y] of cands) {
    if (lethal(D, y * W + x, now - 100, now + 3500)) continue;
    let md = 99; st.pl.forEach((q, j) => { if (j !== pi && q.alive) md = Math.min(md, Math.abs(q.x - x) + Math.abs(q.y - y)); });
    const s = md + Math.random(); if (s > bs) { bs = s; best = [x, y]; }
  }
  if (!best) { // en kötü ihtimalle herhangi bir boş ve güvenli karo
    for (let k = 0; k < W * st.H && !best; k++) { const x = k % W, y = (k - x) / W; if (inside(st, x, y) && st.grid[k] === '.' && !restBombAt(st, x, y) && !lethal(D, k, now - 100, now + 3000)) best = [x, y]; }
  }
  if (!best) { st.pl[pi].respawnAt = now + 600; return; }
  const p = st.pl[pi];
  Object.assign(p, { x: best[0], y: best[1], alive: true, imm: now + SPAWN_IMM, respawnAt: 0, t: now, m: 0, d: 4, curse: null });
  st.tpv[pi]++;
  if (st.bot[pi]) Object.assign(st.bot[pi], newBot());
  ctx.emit({ t: 'respawn', pi, x: best[0], y: best[1] });
  st.dirty = true;
}
function endRound(st, ctx) {
  if (st.phase !== 'play') return;
  const now = Date.now(), al = aliveIdx(st);
  let winner = -1, team = -1;
  if (st.mode === 'klasik') { if (al.length === 1) { winner = al[0]; st.wins[winner]++; } }
  else if (st.mode === 'takim') { const ts = new Set(al.map(i => st.players[i].team)); if (ts.size === 1) { team = [...ts][0]; st.teamWins[team]++; al.forEach(i => { st.wins[i]++; }); st.players.forEach((p, i) => { if (p.team === team && !al.includes(i)) st.wins[i]++; }); } }
  const rows = st.players.map((p, i) => ({ pi: i, alive: st.pl[i].alive, k: st.rk[i], coins: st.coins[i], win: st.mode === 'klasik' ? i === winner : st.mode === 'takim' ? p.team === team : false }));
  st.last = { round: st.round, winner, team, draw: st.mode !== 'altin' && winner < 0 && team < 0, rows };
  st.bombs = []; st.fire = []; if (st.shrink && !st.shrink.stop) st.shrink.stop = now;
  setPhase(st, 'end', st.mode === 'altin' ? 1800 : END_MS);
  let msg;
  if (st.mode === 'klasik') msg = winner >= 0 ? `🏆 Turu ${pname(st, winner)} kazandı! (${st.wins[winner]}/${st.need})` : '🤝 Berabere! Kimse ayakta kalmadı.';
  else if (st.mode === 'takim') msg = team >= 0 ? `🏆 ${TEAMS[team].icon} ${TEAMS[team].name} takım turu kazandı! (${st.teamWins[team]}/${st.need})` : '🤝 Berabere!';
  else msg = '⏱ Süre doldu! Altınlar sayılıyor…';
  ctx.emit({ t: 'roundEnd', winner, team, draw: st.last.draw }, msg, 'gold');
  ctx.sync();
}
function gameDecided(st) {
  if (st.mode === 'altin') return true;
  if (st.round >= st.bestOf * 2 + 1) return true;
  if (st.mode === 'takim') return Math.max(...st.teamWins) >= st.need;
  return Math.max(...st.wins) >= st.need;
}
function finish(st, ctx) {
  setPhase(st, 'over', 0);
  const n = st.players.length;
  let ranking, title, note;
  if (st.mode === 'altin') {
    ranking = st.players.map((p, i) => ({ pi: i, score: st.coins[i], label: `${st.coins[i]} altın` })).sort((a, b) => b.score - a.score || st.kills[b.pi] - st.kills[a.pi]);
    title = `${pname(st, ranking[0].pi)} altın avının kralı! 🪙`; note = 'Altın Avı: patlatılan sandıklardan ve yerden altın topla; PUF olursan altınlarının yarısı yere saçılır.';
  } else if (st.mode === 'takim') {
    const wt = st.teamWins[0] === st.teamWins[1] ? -1 : (st.teamWins[0] > st.teamWins[1] ? 0 : 1);
    ranking = st.players.map((p, i) => ({ pi: i, score: (p.team === wt ? 100000 : 0) + st.teamWins[p.team] * 10000 + st.kills[i] * 100 + st.surv[i], label: `${TEAMS[p.team].icon} ${st.teamWins[p.team]} tur${st.kills[i] ? ` · ${st.kills[i]}💥` : ''}` })).sort((a, b) => b.score - a.score);
    title = wt >= 0 ? `${TEAMS[wt].icon} ${TEAMS[wt].name} takım kazandı!` : 'Takımlar berabere!';
    note = `Takım maçı: ${st.teamWins[0]} – ${st.teamWins[1]} · ${st.round} tur oynandı.`;
  } else {
    ranking = st.players.map((p, i) => ({ pi: i, score: st.wins[i] * 10000 + st.kills[i] * 100 + st.surv[i], label: `${st.wins[i]} galibiyet${st.kills[i] ? ` · ${st.kills[i]}💥` : ''}` })).sort((a, b) => b.score - a.score);
    title = st.wins[ranking[0].pi] > 0 ? `${pname(st, ranking[0].pi)} labirentin kralı! 💣` : 'Kimse tur kazanamadı!';
    note = `Klasik: ${st.bestOf === 1 ? 'tek tur' : `${st.bestOf} turda ${st.need} galibiyet alan kazanır`} · ${st.round} tur oynandı. 💥 = patlatılan rakip.`;
  }
  void n;
  ctx.emit({ t: 'over' }, `🏁 Oyun bitti! ${title}`, 'gold');
  ctx.sync();
  ctx.later(900, () => ctx.end({ title, ranking, note }));
}
function nextRound(st, ctx) { if (gameDecided(st)) finish(st, ctx); else startRound(st, ctx); }

/* ---- bot zekâsı ---- */
function bfsBot(st, s0, now, stepMs, D, margin) {
  const W = st.W, N = W * st.H, dist = new Int16Array(N).fill(-1), par = new Int32Array(N).fill(-1), qu = new Int32Array(N), list = [];
  const bAt = new Set(); st.bombs.forEach(b => { if (!b.fl) bAt.add(b.y * W + b.x); });
  let h = 0, t = 0; dist[s0] = 0; qu[t++] = s0; list.push(s0);
  while (h < t) {
    const c = qu[h++], x = c % W, y = (c - x) / W, dc = dist[c];
    if (dc > 40) continue;
    for (let d = 1; d <= 4; d++) {
      const nx = x + DX[d], ny = y + DY[d], k = ny * W + nx;
      if (dist[k] >= 0 || solidCh(st.grid[k]) || bAt.has(k)) continue;
      const tIn = now + (dc + .45) * stepMs, tOut = now + (dc + 1.55) * stepMs;
      if (lethal(D, k, tIn - margin, tOut + margin)) continue;
      dist[k] = dc + 1; par[k] = c; qu[t++] = k; list.push(k);
    }
  }
  return { dist, par, list };
}
const okStop = (st, k) => { const f = st.feat[k]; return f !== 'i' && !BELTD[f]; };
// Zaman genişletilmiş arama: beklemeyi (alevin sönmesini) ve bant hızını hesaba katar
function moveSlots(st, c, d, spd) {
  const b = BELTD[st.feat[c]] || 0; if (!b || (DX[b] !== 0) !== (DX[d] !== 0)) return 2;
  const eff = b === d ? spd + BELT : spd - BELT; return clamp(Math.ceil(2 * spd / Math.max(.5, eff)), 1, 6);
}
function searchT(st, s0, now, stepMs, D, margin, goal) {
  const W = st.W, N = W * st.H, h = stepMs / 2, S = Math.ceil(4200 / h) + 1, spd = 1000 / stepMs;
  const bAt = new Set(); st.bombs.forEach(b => { if (!b.fl) bAt.add(b.y * W + b.x); });
  const layers = Array.from({ length: S + 8 }, () => []), first = new Map();
  const push = (s, k, fa) => { const key = s * N + k; if (s > S || first.has(key)) return; first.set(key, fa); layers[s].push(k); };
  push(0, s0, -1);
  for (let s = 0; s <= S; s++) for (const c of layers[s]) {
    const t = now + s * h, fa = first.get(s * N + c);
    if (goal(c, t, s)) return { k: c, slot: s, first: fa };
    if (okStop(st, c) && !lethal(D, c, t - margin * .5, t + h + margin * .5)) push(s + 1, c, fa === -1 ? -3 : fa);
    const x = c % W, y = (c - x) / W;
    if (s > 0 && lethal(D, c, t, t + h * .55)) continue;
    for (let d = 1; d <= 4; d++) {
      const k = (y + DY[d]) * W + x + DX[d];
      if (solidCh(st.grid[k]) || bAt.has(k)) continue;
      const ms = moveSlots(st, c, d, spd), tE = t + ms * h;
      if (lethal(D, k, t + h * .45 - margin, tE + h * .55 + margin)) continue;
      push(s + ms, k, fa === -1 ? k : fa);
    }
  }
  return null;
}
function safeWait(st, D, k, arr, margin) { return okStop(st, k) && !lethal(D, k, arr - margin, arr + 2600); }
function crateHits(st, x, y, r, D, now) {
  let n = 0; const W = st.W;
  for (let d = 1; d <= 4; d++) for (let i = 1; i <= r; i++) {
    const tx = x + DX[d] * i, ty = y + DY[d] * i, k = ty * W + tx, c = st.grid[k];
    if (c === '#' || c === 'X' || c === undefined) break;
    if (st.bombs.some(b => !b.fl && b.x === tx && b.y === ty)) break;
    if (c === 'c') { if (!lethal(D, k, now, now + 4000)) n++; break; }
  }
  return n;
}
function enemyLine(st, pi, x, y, r) {
  let n = 0; const W = st.W;
  st.pl.forEach((q, j) => {
    if (!q.alive || !enemies(st, pi, j)) return;
    const qx = Math.round(q.x), qy = Math.round(q.y);
    if (qx !== x && qy !== y) return;
    const dd = Math.abs(qx - x) + Math.abs(qy - y); if (dd > r) return;
    const d = qx === x ? (qy > y ? 4 : 3) : (qx > x ? 2 : 1);
    for (let i = 1; i < dd; i++) { const c = st.grid[(y + DY[d] * i) * W + x + DX[d] * i]; if (solidCh(c)) return; }
    n++;
  });
  return n;
}
function botDecide(st, pi, m, now, D, ctx) {
  const p = st.pl[pi], S = SKILL[st.skill] || SKILL.normal, W = st.W;
  const stepMs = 1000 / speedOf(p);
  const cx = Math.round(p.x), cy = Math.round(p.y), s0 = cy * W + cx;
  const B = bfsBot(st, s0, now, stepMs, D, S.margin);
  const arrOf = k => now + B.dist[k] * stepMs;
  const goTo = k => {
    if (k === s0 || B.dist[k] < 0) { m.nx = m.ny = null; return; }
    let c = k; while (B.par[c] !== s0 && B.par[c] >= 0) c = B.par[c];
    m.nx = c % W; m.ny = (c - m.nx) / W;
  };
  const hereSafe = !lethal(D, s0, now - 60, now + 3000) && okStop(st, s0);
  if (!hereSafe) {
    const occ = new Set(); st.pl.forEach((q, j) => { if (j !== pi && q.alive) occ.add(Math.round(q.y) * W + Math.round(q.x)); });
    const R = searchT(st, s0, now, stepMs, D, S.margin, (k, t, sl) => sl > 0 && !occ.has(k) && safeWait(st, D, k, t, S.margin)) || searchT(st, s0, now, stepMs, D, S.margin, (k, t, sl) => sl > 0 && safeWait(st, D, k, t, S.margin));
    m.idle = 0; m.tgt = R ? R.k : -1;
    if (R) { if (R.first >= 0) { m.nx = R.first % W; m.ny = (R.first - m.nx) / W; } else { m.nx = m.ny = null; } return; }
    let best = s0, bt = firstDanger(D, s0, now);
    for (const k of B.list) { if (B.dist[k] !== 1) continue; const t = firstDanger(D, k, arrOf(k)); if (t > bt + 50) { bt = t; best = k; } }
    goTo(best);
    return;
  }
  // bomba bırakmalı mı?
  let blockedHere = false;
  const mine = st.bombs.filter(b => b.o === pi).length;
  if (mine < p.b && p.curse !== 'surekli' && !restBombAt(st, cx, cy) && !fireAt(st, cx, cy, now)) {
    const cr = crateHits(st, cx, cy, p.r, D, now), en = enemyLine(st, pi, cx, cy, p.r);
    const near = [];
    st.pl.forEach((q, j) => { if (q.alive && enemies(st, pi, j) && Math.abs(q.x - cx) + Math.abs(q.y - cy) <= p.r + 3) near.push(j); });
    const E = now + (p.remote ? 1500 : FUSE);
    let D2 = null, trap = 0;
    if (near.length && st.skill !== 'kolay' && (st.skill === 'zor' || Math.random() < .6)) {
      D2 = dangerMap(st, now, { x: cx, y: cy, r: p.r, E, k: s0 });
      for (const j of near) {   // rakibin kaçış yolu kalmıyor mu?
        const q = st.pl[j], ek = Math.round(q.y) * W + Math.round(q.x), sm = 1000 / speedOf(q);
        if (!lethal(D2, ek, now, now + 3500)) continue;
        if (!searchT(st, ek, now, sm, D2, 40, (k, t, sl) => safeWait(st, D2, k, t, 40))) trap++;
      }
    }
    const want = (cr > 0 && Math.random() < S.bombP) || (en > 0 && Math.random() < S.chase) || trap > 0 || (m.idle > 3 && cr > 0);
    if (want) {
      if (!D2) D2 = dangerMap(st, now, { x: cx, y: cy, r: p.r, E, k: s0 });
      const ok = !!searchT(st, s0, now, stepMs, D2, S.margin, (k, t, sl) => sl > 0 && k !== s0 && t < E - 300 && safeWait(st, D2, k, t, S.margin));
      if (ok && placeBomb(st, pi, { x: cx, y: cy }, ctx, now)) { m.think = 0; m.idle = 0; m.nx = m.ny = null; return; }
      if (!ok) blockedHere = true;
    }
  }
  // hedef seç: eşya, sandık, rakip
  let best = -1, bs = -1e9;
  const itemAt = new Map(); st.items.forEach(it => { if (it.at <= now + 400) itemAt.set(it.y * W + it.x, it); });
  let anyCrate = false;
  const anyCrateLeft = !st.sudden && st.grid.filter(c => c === 'c').length > 4;
  const occ = new Set(); st.pl.forEach((q, j) => { if (j !== pi && q.alive) occ.add(Math.round(q.y) * W + Math.round(q.x)); });
  for (const k of B.list) {
    const arr = arrOf(k);
    if (!safeWait(st, D, k, arr, S.margin)) continue;
    const x = k % W, y = (k - x) / W, it = itemAt.get(k);
    let s = -B.dist[k] * .55 + Math.random() * S.rand;
    if (it) s += it.k === 'kafatasi' ? -8 : it.k === 'altin' ? 6 + 2 * (it.v || 1) : (it.k === 'bomba' && p.b < 3) || (it.k === 'alev' && p.r < 4) ? 8 : 5;
    const cr = crateHits(st, x, y, p.r, D, now); if (cr) anyCrate = true;
    s += Math.min(2, cr) * 2.2;
    s += enemyLine(st, pi, x, y, p.r) * (anyCrateLeft ? 3 : 5) * S.chase;
    if (occ.has(k) && k !== s0) s -= 3;
    if (k === s0 && blockedHere) s -= 5;
    if (!anyCrateLeft && st.skill !== 'kolay') { let md = 99; st.pl.forEach((q, j) => { if (q.alive && enemies(st, pi, j)) md = Math.min(md, Math.abs(q.x - x) + Math.abs(q.y - y)); }); s -= Math.max(0, md - 2) * .35 * S.chase; }
    if (k === m.tgt) s += 1.2;
    if (s > bs) { bs = s; best = k; }
  }
  if (!anyCrate && (best < 0 || bs < 1)) {   // sandık kalmadı: rakibe yaklaş
    let bd = 1e9;
    for (const k of B.list) {
      const arr = arrOf(k); if (!safeWait(st, D, k, arr, S.margin)) continue;
      const x = k % W, y = (k - x) / W; let md = 99;
      st.pl.forEach((q, j) => { if (q.alive && enemies(st, pi, j)) md = Math.min(md, Math.abs(q.x - x) + Math.abs(q.y - y)); });
      const s = md + B.dist[k] * .15 + Math.random() * .8; if (md >= 1 && s < bd) { bd = s; best = k; }
    }
  }
  if (best === s0 || best < 0) m.idle += S.think / 1000 + .1; else m.idle = 0;
  if (m.idle > 4 && B.list.length > 1) { const opts = B.list.filter(k => k !== s0 && safeWait(st, D, k, arrOf(k), S.margin)); if (opts.length) { best = pickR(opts); m.idle = 0; } }
  m.tgt = best; goTo(best);
}
function botRemote(st, pi, m, now, ctx) {
  if (now < m.det) return;
  m.det = now + 250;
  const p = st.pl[pi], own = st.bombs.filter(b => b.o === pi && b.rm && !b.fl && now - b.at > 450);
  if (!own.length) return;
  const b = own.sort((a, c) => a.at - c.at)[0], W = st.W;
  // zincirleme patlamaları da hesaba kat: bu bomba şimdi patlarsa nereler yanar?
  const fake = Object.assign({}, st, { fire: [], cracks: [], shrink: null, bombs: st.bombs.map(x => (x === b ? Object.assign({}, x, { rm: 0, ex: now }) : Object.assign({}, x, { rm: 0, ex: x.rm ? now + RM_FUSE : x.ex }))) });
  const D = dangerMap(fake, now), win = [now - 100, now + FLAME + 250];
  const me = Math.round(p.y) * W + Math.round(p.x), nx = m.nx != null ? m.ny * W + m.nx : me;
  if (!lethal(D, me, win[0], win[1]) && !lethal(D, nx, win[0], win[1])) detonate(st, [b], ctx, now);
}
function stepBots(st, dt, now, ctx) {
  let D = null, Wd = null;
  for (const k of Object.keys(st.bot)) {
    if (st.phase !== 'play') return;
    const pi = +k, p = st.pl[pi], m = st.bot[k];
    if (!p.alive) continue;
    if (!D || st.dirty) { D = dangerMap(st, now); Wd = worldOfState(st); }
    const S = SKILL[st.skill] || SKILL.normal, stepMs = 1000 / speedOf(p);
    if (p.remote) botRemote(st, pi, m, now, ctx);
    if (m.nx != null) {
      const kk = m.ny * st.W + m.nx, dist = Math.abs(p.x - m.nx) + Math.abs(p.y - m.ny), arr = now + dist * stepMs;
      if (solidCh(st.grid[kk]) || (restBombAt(st, m.nx, m.ny) && !m.pass.includes(restBombAt(st, m.nx, m.ny).id)) || (dist > .5 && lethal(D, kk, arr - S.margin, arr + stepMs * .6 + S.margin))) { m.nx = m.ny = null; m.think = 0; }
      else if (dist < .04) { m.nx = m.ny = null; m.think = Math.min(m.think, now); }
    }
    if (m.nx == null && now >= m.think) {
      if (st.dirty) { D = dangerMap(st, now); Wd = worldOfState(st); }
      botDecide(st, pi, m, now, D, ctx);
      const atC = Math.abs(p.x - Math.round(p.x)) < .05 && Math.abs(p.y - Math.round(p.y)) < .05;
      m.think = now + (atC ? S.think : 40);
      if (st.dirty) { D = dangerMap(st, now); Wd = worldOfState(st); }
    }
    let dir = 0;
    if (m.nx != null) dir = Math.abs(p.x - m.nx) > .02 ? (m.nx > p.x ? 2 : 1) : (m.ny > p.y ? 4 : 3);
    const body = { x: p.x, y: p.y, d: p.d, md: m.md, ice: m.ice, pass: m.pass };
    stepBody(Wd, body, dir, speedOf(p), dt);
    // hedef karoyu geçmeyelim
    if (m.nx != null && dir) {
      if ((dir === 2 && body.x > m.nx && p.x <= m.nx) || (dir === 1 && body.x < m.nx && p.x >= m.nx)) body.x = m.nx;
      if ((dir === 4 && body.y > m.ny && p.y <= m.ny) || (dir === 3 && body.y < m.ny && p.y >= m.ny)) body.y = m.ny;
    }
    p.x = Math.round(body.x * 1000) / 1000; p.y = Math.round(body.y * 1000) / 1000; p.d = body.d; p.m = body.m; p.t = now;
    m.md = body.md; m.ice = body.ice; updPass(body, st.bombs.filter(b => !b.fl)); m.pass = body.pass;
  }
}
function broadcastBots(st) {
  const arr = [];
  for (const k of Object.keys(st.bot)) { const p = st.pl[k]; if (p.alive) arr.push([+k, r2(p.x), r2(p.y), p.d, p.m ? 1 : 0]); }
  arr.forEach(a => uiFeed(a[0], a[1], a[2], a[3], a[4]));
  if (arr.length && st.castN++ % 2 === 0) fastOut({ t: 'b', p: arr });
}

/* ---- ana döngü (yöneten cihazda, 20/sn) ---- */
function tick(st, ctx) {
  const now = Date.now(), dt = clamp((now - st.lastTick) / 1000, 0, .25); st.lastTick = now;
  st.dirty = false;
  if (st.phase === 'count') { if (now >= st.endsAt) { startPlay(st, ctx); st.dirty = true; } }
  else if (st.phase === 'play') playTick(st, ctx, now, dt);
  else if (st.phase === 'end') { if (now >= st.endsAt) { nextRound(st, ctx); st.dirty = true; } }
  if (st.dirty || now - st.lastSync >= 1000) { st.lastSync = now; ctx.sync(); }
}
function playTick(st, ctx, now, dt) {
  const W = st.W;
  stepBots(st, dt, now, ctx);
  if (st.phase !== 'play') return;
  // lanetler
  st.pl.forEach((p, i) => {
    if (p.curse && now >= p.cu) { p.curse = null; st.dirty = true; ctx.emit({ t: 'cure', pi: i }); }
    if (p.alive && p.curse === 'surekli') placeBomb(st, i, null, ctx, now);
  });
  stepSlides(st, now); stepFlights(st, now);
  // fitili biten bombalar
  const due = st.bombs.filter(b => !b.fl && b.ex <= now).sort((a, b) => a.ex - b.ex);
  if (due.length) detonate(st, due, ctx, now);
  // alevin içine giren bombalar
  for (let guard = 0; guard < 5; guard++) {
    const hot = st.bombs.filter(b => !b.fl && fireAt(st, b.x, b.y, now - 1));
    if (!hot.length) break; detonate(st, hot, ctx, now);
  }
  // lav fışkırması
  if (st.cracks.length && st.lavaT0) for (const [x, y, ph] of st.cracks) {
    if (!lavaOn(st.lavaT0, ph, now)) continue;
    const b = restBombAt(st, x, y); if (b) detonate(st, [b], ctx, now);
    st.items = st.items.filter(it => !(it.x === x && it.y === y && it.at <= now) || (st.dirty = true, false));
    st.pl.forEach((p, i) => { if (p.alive && Math.round(p.x) === x && Math.round(p.y) === y && graceOk(st, i, now, nextErupt(st.lavaT0, ph, now - LAVA_BURN))) hurt(st, i, -1, 'lav', ctx, now); });
  }
  // ani ölüm: düşen bloklar
  if (st.shrink) {
    const ord = spiralOf(W, st.H);
    while (st.shrinkK < ord.length && st.shrink.start + st.shrinkK * st.shrink.iv <= Math.min(now, st.shrink.stop || Infinity)) {
      if (st.endPending) break;
      const k = ord[st.shrinkK], L = st.shrink.start + st.shrinkK * st.shrink.iv; st.shrinkK++;
      const x = k % W, y = (k - x) / W;
      st.grid[k] = 'X';
      st.items = st.items.filter(it => !(it.x === x && it.y === y));
      st.bombs = st.bombs.filter(b => b.fl || !(b.x === x && b.y === y));
      st.fire = st.fire.filter(f => !(f.x === x && f.y === y));
      st.pending = st.pending || [];
      st.pl.forEach((p, i) => { if (p.alive && Math.round(p.x) === x && Math.round(p.y) === y) { if (graceOk(st, i, now, L)) hurt(st, i, -1, 'ezil', ctx, now, true); else st.pending.push([i, L]); } });
      st.dirty = true;
    }
    if (st.pending && st.pending.length) st.pending = st.pending.filter(([i, L]) => { const p = st.pl[i]; if (!p.alive) return false; if (graceOk(st, i, now, L)) { hurt(st, i, -1, 'ezil', ctx, now, true); return false; } return true; });
  }
  st.fire.forEach(f => { if (f.until <= now && !f.gone) { f.gone = 1; st.fireLog.push(f); } });
  st.fire = st.fire.filter(f => f.until > now);
  st.fireLog = st.fireLog.filter(f => f.until > now - 500);
  // alevler oyuncuları yakar (uzaktaki insanlar için konumları gecikmeli geldiğinden alev penceresi gecikme kadar kaydırılır)
  for (const f of st.fire.concat(st.fireLog)) st.pl.forEach((p, i) => {
    if (!p.alive || Math.round(p.x) !== f.x || Math.round(p.y) !== f.y) return;
    const gr = graceOf(st, i); if (now - f.at >= gr && now <= f.until + gr) hurt(st, i, f.o, 'alev', ctx, now);
  });
  // eşya toplama ve lanet bulaştırma
  st.pl.forEach((p, i) => {
    if (!p.alive) return;
    const x = Math.round(p.x), y = Math.round(p.y);
    const ix = st.items.findIndex(it => it.x === x && it.y === y && it.at <= now);
    if (ix >= 0) { const it = st.items[ix]; st.items.splice(ix, 1); applyItem(st, i, it, ctx, now); }
    if (p.curse && now >= p.ccd) st.pl.forEach((q, j) => {
      if (j === i || !q.alive || q.curse || !p.curse || Math.abs(q.x - p.x) + Math.abs(q.y - p.y) > .75) return;
      q.curse = p.curse; q.cu = p.cu; q.ccd = now + CURSE_CD; p.curse = null;
      ctx.emit({ t: 'curse', pi: j, from: i, c: q.curse }, `☠️ Lanet ${pname(st, i)} → ${pname(st, j)} bulaştı! (${CURSES[q.curse].name})`, 'bad'); st.dirty = true;
    });
  });
  // altın avı: yeniden doğma ve altın yağmuru
  if (st.mode === 'altin') {
    st.pl.forEach((p, i) => { if (!p.alive && p.respawnAt && now >= p.respawnAt) respawn(st, i, ctx, now); });
    if (now >= st.nextCoinAt) {
      st.nextCoinAt = now + 2600;
      if (st.items.filter(it => it.k === 'altin').length < 3 + Math.ceil(st.players.length / 2)) {
        for (let tries = 0; tries < 40; tries++) {
          const x = randInt(1, W - 2), y = randInt(1, st.H - 2), k = y * W + x;
          if (st.grid[k] !== '.' || restBombAt(st, x, y) || st.items.some(it => it.x === x && it.y === y) || st.pl.some(p => p.alive && Math.abs(p.x - x) + Math.abs(p.y - y) < 2.5)) continue;
          st.items.push({ id: ++st.idc, x, y, k: 'altin', v: Math.random() < .15 ? 3 : 1, at: now }); st.dirty = true; break;
        }
      }
    }
  }
  // süre
  if (!st.sudden && now >= st.endsAt) {
    if (st.mode === 'altin') { endRound(st, ctx); return; }
    st.sudden = true; st.shrink = { start: now + SHRINK_LEAD, iv: SHRINK_IV }; st.shrinkK = 0;
    ctx.emit({ t: 'sudden' }, '⏰ Süre doldu: ANİ ÖLÜM! Arena daralıyor, bloklar düşüyor!', 'bad');
    st.dirty = true;
  }
  if (st.endPending && now >= st.endPending) { endRound(st, ctx); return; }
  broadcastBots(st);
}
// Uzaktaki insan oyuncular için gecikme payı: konum ~bir ağ gecikmesi kadar eski
function isRemote(st, pi) { const p = st.players[pi]; return !(p.isBot || st.bot[pi] || pi === st.hostPi || !p.cid); }
function graceOf(st, pi) { return isRemote(st, pi) ? clamp(st.lag[pi] == null ? REMOTE_GRACE : st.lag[pi] + 40, REMOTE_GRACE, 450) : 0; }
function graceOk(st, pi, now, since) { return now - since >= graceOf(st, pi); }
function runLoop(st, ctx) {
  const id = ++st.loopId;
  const step = () => {
    if (st.loopId !== id || st.phase === 'over') return;
    try { tick(st, ctx); } catch (e) { console.error(e); }
    if (st.phase !== 'over') ctx.later(TICK, step);
  };
  ctx.later(TICK, step);
}
// Hızlı kanaldan gelen konum: hız sınırı ve duvar denetimiyle
function applyPos(st, pi, x, y, d, mv, ht) {
  if (st.phase !== 'play') return false;
  const p = st.pl[pi]; if (!p || !p.alive || st.bot[pi] || !st.players[pi] || st.players[pi].isBot) return false;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const now = Date.now(), maxd = (speedOf(p) * ICE_K + BELT) * 1.5 * clamp((now - p.t) / 1000, 0, 1.2) + .7;
  const ddx = x - p.x, ddy = y - p.y, dd = Math.hypot(ddx, ddy);
  if (dd > maxd) { const k = maxd / dd; x = p.x + ddx * k; y = p.y + ddy * k; }
  const tx = Math.round(x), ty = Math.round(y);
  if (!inside(st, tx, ty) || solidCh(st.grid[ty * st.W + tx])) return false;
  p.x = r2(x); p.y = r2(y); if (d >= 1 && d <= 4) p.d = d; p.m = mv ? 1 : 0; p.t = now;
  if (Number.isFinite(ht) && ht > 0) { const lag = clamp(now - ht, 0, 600); st.lag[pi] = st.lag[pi] == null ? lag : st.lag[pi] * .8 + lag * .2; }
  return true;
}
function hostPosIn(seat, x, y, d, m, cid, ht) {
  const R0 = window.CFX && window.CFX.Room, g = R0 && R0.game;
  if (!g || !g.state || g.def.id !== 'bombalabirent' || !R0.isRunner() || g.result) return;
  if (cid !== undefined && (!g.players[seat] || g.players[seat].cid !== cid)) return;
  applyPos(g.state, seat, x, y, d, m, ht);
}

const RULES = {
  setup(players, opts, ctx) {
    opts = opts || {};
    const mode = MODES[opts.mod] ? opts.mod : 'klasik';
    const bestOf = optNum(opts.tur, [1, 3, 5], 3);
    const humans = players.map((p, i) => (p.isBot ? -1 : i)).filter(i => i >= 0);
    const st = {
      mode, harita: THEMES[opts.harita] ? opts.harita : (opts.harita === 'rastgele' ? 'rastgele' : 'bahce'),
      skill: SKILL[opts.zeka] ? opts.zeka : 'normal', bestOf, need: Math.ceil(bestOf / 2), dur: optNum(opts.sure, [60, 90, 120, 180], 120),
      players: players.map((p, i) => ({ name: p.name, color: p.color, isBot: !!p.isBot, cid: p.cid || null, team: i % 2 })),
      online: players.map(() => true), ai: players.map((p, i) => ctx.mode === 'local' && !p.isBot && humans.indexOf(i) >= 4),
      wins: players.map(() => 0), kills: players.map(() => 0), surv: players.map(() => 0), deaths: players.map(() => 0), coins: players.map(() => 0), teamWins: [0, 0], rk: [],
      tpv: players.map(() => 0), hostPi: ctx.hostPi, lag: players.map(() => null), fireLog: [],
      round: 0, phase: 'count', endsAt: 0, phaseDur: 1, playAt: 0, arena: null, W: 15, H: 13, grid: [], feat: '', cracks: [], spawns: [], lavaT0: 0,
      bombs: [], fire: [], items: [], pl: [], sudden: false, shrink: null, shrinkK: 0, endPending: 0, nextCoinAt: 0, idc: 0,
      bot: {}, last: null, lastTick: Date.now(), lastSync: 0, loopId: 0, castN: 0, dirty: false, pending: []
    };
    if (mode === 'takim' && players.length >= 2) {   // takımlar: insanları iki tarafa dağıt
      const hum = shuf(humans), bots = shuf(players.map((p, i) => (p.isBot ? i : -1)).filter(i => i >= 0));
      hum.concat(bots).forEach((pi, k) => { st.players[pi].team = k % 2; });
    }
    startRound(st, ctx);
    runLoop(st, ctx);
    return st;
  },
  action(st, pi, a, ctx) {
    if (!a || typeof a.t !== 'string' || st.phase !== 'play') return;
    const now = Date.now();
    if (a.t === 'bomb') { if (placeBomb(st, pi, a, ctx, now)) ctx.sync(); else ctx.emit({ t: 'nobomb', pi, x: a.x, y: a.y }); }
    else if (a.t === 'kick') { if (kickBomb(st, pi, a, ctx, now)) ctx.sync(); }
    else if (a.t === 'det') { if (remoteDet(st, pi, ctx, now)) ctx.sync(); }
  },
  view(st, viewer) {
    const n = st.players.length, me = viewer === 'all' ? 'all' : (Number.isInteger(viewer) && viewer >= 0 && viewer < n ? viewer : -1);
    const mine = me === 'all' ? st.players.map((p, i) => (!p.isBot && !st.ai[i] ? i : -1)).filter(i => i >= 0) : me >= 0 ? [me] : [];
    return {
      mode: st.mode, arena: st.arena, W: st.W, H: st.H, grid: st.grid.join(''), feat: st.feat, cracks: st.cracks, lavaT0: st.lavaT0,
      phase: st.phase, round: st.round, bestOf: st.bestOf, need: st.need, endsAt: st.endsAt, phaseDur: st.phaseDur, dur: st.dur, sudden: st.sudden,
      shrink: st.shrink, skill: st.skill, me, mine,
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, team: p.team, online: st.online[i] !== false, ai: !!st.ai[i], wins: st.wins[i], kills: st.kills[i], coins: st.coins[i] })),
      pl: st.pl.map(p => ({ x: r2(p.x), y: r2(p.y), d: p.d, alive: p.alive, imm: p.imm, b: p.b, r: p.r, s: p.s, kick: p.kick, glove: p.glove, shield: p.shield, remote: p.remote, curse: p.curse, cu: p.cu, respawnAt: p.respawnAt, deadAt: p.deadAt })),
      tpv: st.tpv.slice(), teamWins: st.teamWins.slice(),
      bombs: st.bombs.map(b => ({ id: b.id, x: b.x, y: b.y, o: b.o, r: b.r, at: b.at, ex: b.ex, rm: b.rm, sl: b.sl || null, fl: b.fl || null })),
      fire: st.fire.map(f => [f.x, f.y, f.kind, f.at, f.until]),
      items: st.items.map(it => ({ id: it.id, x: it.x, y: it.y, k: it.k, v: it.v, at: it.at })),
      last: st.phase === 'end' || st.phase === 'over' ? st.last : null
    };
  },
  turnOf() { return null; },
  skipTurn() { /* gerçek zamanlı: kopmalar onPresence ile işlenir */ },
  botAct() { /* botlar yöneten cihazdaki döngüde oynar */ },
  botDelay: 900,
  onPresence(st, pi, online, ctx) {
    st.online[pi] = online;
    if (!st.players[pi] || st.players[pi].isBot) return;
    if (!online) {
      st.ai[pi] = true; st.bot[pi] = newBot();
      ctx.emit({ t: 'ai', pi, on: true }, `🤖 ${pname(st, pi)} dönene kadar bilgisayar oynuyor.`, 'gold');
    } else if (st.ai[pi]) {
      st.ai[pi] = false; delete st.bot[pi]; st.tpv[pi]++;
      if (st.pl[pi]) st.pl[pi].t = Date.now();
      ctx.emit({ t: 'ai', pi, on: false }, `🎮 ${pname(st, pi)} kontrolü geri aldı.`, 'good');
    }
    ctx.sync();
  },
  resume(st, ctx) {
    if (st.phase === 'over') return;
    const now = Date.now(); st.lastTick = now; st.pl.forEach(p => { p.t = now; });
    runLoop(st, ctx);
  }
};

/* ------------------------------------------------------------------ ARAYÜZ (her cihaz) */
let root = null, ui = null, V = null;
let cv = null, cg = null, stageEl = null, padEl = null, dpadEl = null, bombBtn = null, detBtn = null;
let ts = 24, cw = 300, ch = 300, dpr = 1, ox = 0, oy = 0;
let avs = {}, rp = [], keys = new Map(), keyOrder = 0, pending = [], seenBombs = new Set(), seenTpv = [];
let raf = 0, lastT = 0, hudT = null, ro = null, popT = null, toastT = null, frameN = 0;
let parts = [], anims = [], shake = 0, sendAt = {}, sentTile = {}, lastSentAt = {}, kickAt = {}, bombAt = {}, chipKey = '', sideKey = '', mineKey = '', lastSec = -1, seenKey = '';
let bg = null, bgKey = '', sprites = null, spriteKey = '', touchDir = 0, padPtr = null, lavaSnd = {}, landSeen = 0;
const INTERP_C = 130, INTERP_H = 70;
const pnow = () => performance.now();
const hostClock = () => (ui && ui.hostNow ? ui.hostNow() : Date.now());
const q = s => root && root.querySelector(s);
const isTouch = () => (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
const phoneW = () => innerWidth < 760;
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const isMine = i => !!(V && V.mine && V.mine.includes(i));
const KEYSETS = [
  { L: ['KeyA'], R: ['KeyD'], U: ['KeyW'], D: ['KeyS'], B: ['Space'], X: ['KeyE', 'KeyQ'] },
  { L: ['ArrowLeft'], R: ['ArrowRight'], U: ['ArrowUp'], D: ['ArrowDown'], B: ['Enter', 'NumpadEnter'], X: ['ShiftRight', 'Slash', 'Period'] },
  { L: ['KeyJ'], R: ['KeyL'], U: ['KeyI'], D: ['KeyK'], B: ['KeyU'], X: ['KeyO'] },
  { L: ['Numpad4'], R: ['Numpad6'], U: ['Numpad8'], D: ['Numpad5', 'Numpad2'], B: ['Numpad0'], X: ['NumpadDecimal'] }
];
const KEY_HELP = ['WASD + Boşluk (E: patlat)', 'Oklar + Enter (Sağ Shift: patlat)', 'IJKL + U (O: patlat)', 'Num 8456 + Num 0 (Num .: patlat)'];
const snd = {
  ok() { return Sound.ctx && Sound.enabled && Sound.ctx.state === 'running'; },
  plop() { if (!this.ok()) return; Sound.tone(300, .08, { type: 'sine', gain: .2, slide: 180 }); Sound.noise(.05, { freq: 900, q: 1, gain: .12 }); },
  boom(big) { if (!this.ok()) return; Sound.noise(big ? .9 : .6, { filter: 'lowpass', freq: big ? 380 : 520, gain: big ? .75 : .55, decayPow: 2 }); Sound.tone(110, .4, { type: 'sawtooth', gain: .1, slide: 40 }); Sound.noise(.2, { freq: 2600, q: .8, gain: .18, when: .03 }); },
  crate() { if (!this.ok()) return; Sound.noise(.18, { freq: 1500, q: 2, gain: .2, when: .04 }); Sound.tone(190, .12, { type: 'square', gain: .05, when: .04, slide: 120 }); },
  puf() { if (!this.ok()) return; Sound.tone(700, .35, { type: 'triangle', gain: .16, slide: 140 }); Sound.noise(.35, { freq: 1200, q: .6, gain: .25 }); Sound.tone(1400, .5, { type: 'sine', gain: .06, when: .3, slide: 2200 }); },
  kick() { if (!this.ok()) return; Sound.tone(160, .1, { type: 'square', gain: .14, slide: 90 }); Sound.noise(.08, { freq: 600, q: 1, gain: .2 }); },
  toss() { if (!this.ok()) return; Sound.tone(260, .3, { type: 'triangle', gain: .12, slide: 760 }); },
  curse() { if (!this.ok()) return; [330, 311, 294, 277].forEach((f, i) => Sound.tone(f, .2, { type: 'sawtooth', gain: .06, when: i * .08 })); },
  coin() { if (!this.ok()) return; Sound.tone(1320, .07, { type: 'square', gain: .07 }); Sound.tone(1760, .16, { type: 'triangle', gain: .14, when: .06 }); },
  thud() { if (!this.ok()) return; Sound.noise(.22, { filter: 'lowpass', freq: 260, gain: .4, decayPow: 2 }); },
  lava() { if (!this.ok()) return; Sound.noise(.6, { filter: 'lowpass', freq: 300, gain: .35, decayPow: 1.4 }); Sound.tone(70, .5, { type: 'sawtooth', gain: .06 }); },
  shield() { if (!this.ok()) return; [880, 1320, 1760].forEach((f, i) => Sound.tone(f, .18, { type: 'sine', gain: .1, when: i * .05 })); }
};

/* ---- çizim yardımcıları ---- */
function rrPath(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const D = {
  circle(g, x, y, r, fill, stroke, lw) { g.beginPath(); g.arc(x, y, Math.max(.1, r), 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } },
  ell(g, x, y, rx, ry, fill, rot = 0, stroke, lw) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } },
  rr(g, x, y, w, h, r, fill, stroke, lw) { rrPath(g, x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } },
  text(g, s, x, y, size, fill, stroke) { g.font = `${size}px "Bungee","Arial Black","Segoe UI Black",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; if (stroke) { g.lineWidth = size * .22; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(s, x, y); } g.fillStyle = fill; g.fillText(s, x, y); }
};
const PAL = {
  bahce: { f1: '#7ccc5a', f2: '#6fbf4f', wall: '#a8614a', wallT: '#c97a5f', pil: '#9aa3ad', pilT: '#c4ccd4', crate: '#c98a4f', crateT: '#e0a46a', crateL: '#8a5326', bgc: '#3d7a2e' },
  buz: { f1: '#f4f8fd', f2: '#e8eff8', wall: '#7aa6d6', wallT: '#a9cdf2', pil: '#8fd3f2', pilT: '#d4f3ff', crate: '#f4f8ff', crateT: '#ffffff', crateL: '#9db7d6', bgc: '#6f93c0' },
  lav: { f1: '#4a3540', f2: '#3f2c37', wall: '#2b1d26', wallT: '#4a3343', pil: '#3a2c36', pilT: '#5d4656', crate: '#8a6a55', crateT: '#a8836a', crateL: '#4e3a2c', bgc: '#1d1218' },
  fabrika: { f1: '#8e9bab', f2: '#828fa0', wall: '#4b5566', wallT: '#6c788b', pil: '#5d6a7e', pilT: '#8796ad', crate: '#c9a46a', crateT: '#e0bf86', crateL: '#8a6a3a', bgc: '#3b4352' }
};
function blockSprite(kind, theme, s) {
  const P = PAL[theme] || PAL.bahce, h = Math.round(s * HGT), c = document.createElement('canvas');
  c.width = Math.ceil(s * dpr); c.height = Math.ceil((s + h) * dpr);
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const lw = Math.max(1, s * .05);
  if (kind === 'wall' || kind === 'pil' || kind === 'X') {
    const top = kind === 'wall' ? P.wallT : kind === 'X' ? '#9a8f9e' : P.pilT, side = kind === 'wall' ? P.wall : kind === 'X' ? '#6d6577' : P.pil;
    D.rr(g, 0, h * .15, s, s + h * .85, s * .12, shade(side, -.25));
    D.rr(g, 0, s - h * .1, s, h * 1.1, s * .1, side);
    D.rr(g, s * .02, 0, s * .96, s, s * .14, top, shade(side, -.35), lw);
    if (theme === 'bahce' && kind === 'pil') { D.circle(g, s * .3, s * .3, s * .1, '#8fd46a'); D.circle(g, s * .42, s * .24, s * .07, '#a8e07e'); g.strokeStyle = 'rgba(80,90,100,.35)'; g.lineWidth = lw; g.beginPath(); g.moveTo(s * .2, s * .62); g.lineTo(s * .45, s * .55); g.lineTo(s * .7, s * .7); g.stroke(); }
    else if (theme === 'bahce' && kind === 'wall') { g.strokeStyle = 'rgba(90,30,20,.35)'; g.lineWidth = lw; for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(s * .08, s * i / 3); g.lineTo(s * .92, s * i / 3); g.stroke(); } g.beginPath(); g.moveTo(s * .5, s * .06); g.lineTo(s * .5, s * .33); g.moveTo(s * .3, s * .33); g.lineTo(s * .3, s * .66); g.moveTo(s * .7, s * .33); g.lineTo(s * .7, s * .66); g.stroke(); }
    else if (theme === 'buz' && kind !== 'X') { g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.moveTo(s * .16, s * .2); g.lineTo(s * .4, s * .14); g.lineTo(s * .2, s * .45); g.closePath(); g.fill(); D.circle(g, s * .72, s * .68, s * .05, 'rgba(255,255,255,.8)'); }
    else if (theme === 'lav' && kind !== 'X') { g.strokeStyle = 'rgba(255,120,40,.55)'; g.lineWidth = lw; g.beginPath(); g.moveTo(s * .25, s * .2); g.lineTo(s * .45, s * .45); g.lineTo(s * .38, s * .7); g.moveTo(s * .45, s * .45); g.lineTo(s * .72, s * .55); g.stroke(); }
    else if (theme === 'fabrika' && kind !== 'X') { [[.18, .18], [.82, .18], [.18, .82], [.82, .82]].forEach(([a, b]) => D.circle(g, s * a, s * b, s * .055, shade(top, -.3))); g.fillStyle = 'rgba(255,214,74,.85)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(s * (.12 + i * .28), s - h * .1 + h * .2); g.lineTo(s * (.26 + i * .28), s - h * .1 + h * .2); g.lineTo(s * (.18 + i * .28), s + h * .8); g.lineTo(s * (.04 + i * .28), s + h * .8); g.closePath(); g.fill(); } }
    else if (kind === 'X') { g.strokeStyle = 'rgba(40,30,50,.45)'; g.lineWidth = lw * 1.4; g.beginPath(); g.moveTo(s * .25, s * .25); g.lineTo(s * .75, s * .75); g.moveTo(s * .75, s * .25); g.lineTo(s * .25, s * .75); g.stroke(); }
  } else if (kind === 'crate') {
    D.rr(g, s * .04, h * .2, s * .92, s + h * .75, s * .1, shade(P.crateL, -.2));
    D.rr(g, s * .04, s - h * .05, s * .92, h, s * .08, P.crateL);
    D.rr(g, s * .05, 0, s * .9, s * .95, s * .1, P.crate, shade(P.crateL, -.3), lw);
    if (theme === 'buz') { D.rr(g, s * .05, 0, s * .9, s * .3, s * .1, '#ffffff'); g.strokeStyle = '#9db7d6'; g.lineWidth = lw; g.beginPath(); g.moveTo(s * .2, s * .55); g.lineTo(s * .8, s * .55); g.stroke(); D.circle(g, s * .5, s * .55, s * .09, '#ff5d73'); }
    else if (theme === 'lav') { D.ell(g, s * .5, s * .48, s * .4, s * .38, P.crateT, 0, shade(P.crateL, -.3), lw); g.strokeStyle = 'rgba(60,30,20,.6)'; g.lineWidth = lw; g.beginPath(); g.moveTo(s * .3, s * .35); g.lineTo(s * .5, s * .5); g.lineTo(s * .7, s * .4); g.stroke(); D.circle(g, s * .35, s * .62, s * .05, 'rgba(60,30,20,.5)'); }
    else if (theme === 'fabrika') { g.fillStyle = P.crateT; g.fillRect(s * .1, s * .06, s * .8, s * .38); g.strokeStyle = shade(P.crateL, -.2); g.lineWidth = lw; g.beginPath(); g.moveTo(s * .5, s * .06); g.lineTo(s * .5, s * .9); g.stroke(); D.rr(g, s * .4, s * .35, s * .2, s * .14, 2, '#ffffff'); }
    else { g.strokeStyle = shade(P.crateL, -.1); g.lineWidth = lw * 1.2; g.strokeRect(s * .16, s * .12, s * .68, s * .7); g.beginPath(); g.moveTo(s * .16, s * .12); g.lineTo(s * .84, s * .82); g.moveTo(s * .84, s * .12); g.lineTo(s * .16, s * .82); g.stroke(); D.rr(g, s * .1, s * .06, s * .8, s * .1, 2, P.crateT); }
  }
  return c;
}
function ensureSprites(theme) {
  const key = `${theme}:${ts.toFixed(2)}:${dpr}`;
  if (sprites && spriteKey === key) return;
  spriteKey = key;
  sprites = { wall: blockSprite('wall', theme, ts), pil: blockSprite('pil', theme, ts), crate: blockSprite('crate', theme, ts), X: blockSprite('X', theme, ts) };
}
function ensureBg() {
  const key = `${V.arena}:${V.W}:${V.H}:${V.feat}:${ts.toFixed(2)}:${dpr}:${V.round}`;
  if (bg && bgKey === key) return;
  bgKey = key;
  const P = PAL[V.arena] || PAL.bahce, c = document.createElement('canvas');
  c.width = Math.ceil(cw * dpr); c.height = Math.ceil(ch * dpr);
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const r = mulberry(V.round * 131 + V.W);
  g.fillStyle = P.bgc; g.fillRect(0, 0, cw, ch);
  for (let y = 0; y < V.H; y++) for (let x = 0; x < V.W; x++) {
    const px = ox + x * ts, py = oy + y * ts, f = V.feat[y * V.W + x];
    g.fillStyle = (x + y) % 2 ? P.f1 : P.f2; g.fillRect(px, py, ts + .5, ts + .5);
    if (V.arena === 'bahce' && r() < .18) { const fx = px + r() * ts, fy = py + r() * ts; g.fillStyle = pickRnd(r, ['#ffffff', '#ffe14a', '#ff8fc8']); g.beginPath(); g.arc(fx, fy, ts * .05, 0, TAU); g.fill(); }
    if (V.arena === 'bahce' && r() < .35) { g.strokeStyle = 'rgba(60,140,40,.5)'; g.lineWidth = 1; const gx = px + r() * ts, gy = py + r() * ts; g.beginPath(); g.moveTo(gx - 2, gy); g.lineTo(gx, gy - 4); g.lineTo(gx + 2, gy); g.stroke(); }
    if (V.arena === 'lav' && r() < .25) D.circle(g, px + r() * ts, py + r() * ts, ts * .04, 'rgba(255,120,60,.25)');
    if (V.arena === 'fabrika') { g.strokeStyle = 'rgba(40,50,60,.18)'; g.lineWidth = 1; g.strokeRect(px + 1.5, py + 1.5, ts - 3, ts - 3); D.circle(g, px + 4, py + 4, 1.2, 'rgba(40,50,60,.3)'); }
    if (V.arena === 'buz' && r() < .2) { g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1; const sx = px + r() * ts, sy = py + r() * ts; g.beginPath(); g.moveTo(sx - 2, sy); g.lineTo(sx + 2, sy); g.moveTo(sx, sy - 2); g.lineTo(sx, sy + 2); g.stroke(); }
    if (f === 'i') {
      const gr = g.createLinearGradient(px, py, px + ts, py + ts); gr.addColorStop(0, '#7fd0ff'); gr.addColorStop(.5, '#c4ecff'); gr.addColorStop(1, '#5fbcf5');
      g.fillStyle = gr; g.fillRect(px, py, ts + .5, ts + .5);
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = Math.max(1, ts * .04); g.beginPath(); g.moveTo(px + ts * .15, py + ts * .7); g.lineTo(px + ts * .45, py + ts * .3); g.moveTo(px + ts * .55, py + ts * .85); g.lineTo(px + ts * .8, py + ts * .5); g.stroke();
    } else if (f === 'l') {
      D.rr(g, px + ts * .08, py + ts * .08, ts * .84, ts * .84, ts * .2, '#2a1a22');
      g.strokeStyle = '#ff6a1a'; g.lineWidth = Math.max(1.5, ts * .07); g.lineCap = 'round';
      g.beginPath(); g.moveTo(px + ts * .2, py + ts * .3); g.lineTo(px + ts * .45, py + ts * .5); g.lineTo(px + ts * .35, py + ts * .78); g.moveTo(px + ts * .45, py + ts * .5); g.lineTo(px + ts * .78, py + ts * .4); g.moveTo(px + ts * .6, py + ts * .45); g.lineTo(px + ts * .7, py + ts * .78); g.stroke(); g.lineCap = 'butt';
    } else if (BELTD[f]) {
      D.rr(g, px, py + ts * .06, ts + .5, ts * .88, 0, '#2d3440');
      g.fillStyle = '#4a5363'; g.fillRect(px, py + ts * .1, ts + .5, ts * .8);
    }
  }
  bg = c;
}
function pickRnd(r, arr) { return arr[Math.floor(r() * arr.length)]; }
const sx_ = x => ox + (x + .5) * ts, sy_ = y => oy + (y + .5) * ts;

function drawIcon(g, k, s) {
  g.save(); g.scale(s / 24, s / 24); g.lineJoin = 'round'; g.lineCap = 'round';
  if (k === 'bomba') {
    D.circle(g, -1, 2, 7.5, '#2d2340', '#120a1e', 1.6); D.circle(g, -3.5, -.5, 2.2, 'rgba(255,255,255,.55)');
    g.strokeStyle = '#c9a57a'; g.lineWidth = 2; g.beginPath(); g.moveTo(3, -4); g.quadraticCurveTo(6, -9, 8, -8); g.stroke();
    D.circle(g, 8.5, -8.5, 2.4, '#ffe14a'); D.text(g, '+', 7, 6, 10, '#ffffff', '#1a0b3d');
  } else if (k === 'alev') {
    g.beginPath(); g.moveTo(0, -11); g.bezierCurveTo(7, -4, 9, 2, 8, 5); g.arc(0, 4, 8, 0.1, Math.PI - .1); g.bezierCurveTo(-9, 1, -5, -3, -2, -5); g.bezierCurveTo(-1, -7, 0, -9, 0, -11); g.closePath();
    g.fillStyle = '#ff5a1a'; g.fill(); g.strokeStyle = '#8a2200'; g.lineWidth = 1.4; g.stroke();
    g.beginPath(); g.moveTo(0, -3); g.bezierCurveTo(4, 1, 5, 4, 4, 6); g.arc(0, 6, 4, 0, Math.PI); g.bezierCurveTo(-5, 3, -2, 0, 0, -3); g.fillStyle = '#ffe14a'; g.fill();
  } else if (k === 'hiz') {
    g.beginPath(); g.moveTo(3, -11); g.lineTo(-6, 2); g.lineTo(0, 2); g.lineTo(-3, 11); g.lineTo(7, -3); g.lineTo(1, -3); g.closePath();
    g.fillStyle = '#fff36a'; g.fill(); g.strokeStyle = '#1d6b3a'; g.lineWidth = 1.6; g.stroke();
  } else if (k === 'tekme') {
    g.beginPath(); g.moveTo(-6, -10); g.lineTo(2, -10); g.lineTo(2, 0); g.lineTo(9, 3); g.quadraticCurveTo(11, 8, 7, 9); g.lineTo(-7, 9); g.closePath();
    g.fillStyle = '#9a5a2a'; g.fill(); g.strokeStyle = '#4a2a10'; g.lineWidth = 1.6; g.stroke(); D.rr(g, -8, 7, 18, 3.5, 1.5, '#4a2a10'); g.strokeStyle = '#ffd08a'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-4, -5); g.lineTo(0, -5); g.moveTo(-4, -2); g.lineTo(0, -2); g.stroke();
  } else if (k === 'eldiven') {
    g.beginPath(); g.moveTo(-7, 9); g.lineTo(-8, -2); g.quadraticCurveTo(-8, -6, -5, -6); g.lineTo(-5, -9); g.quadraticCurveTo(-5, -12, -2, -11); g.lineTo(1, -11); g.quadraticCurveTo(4, -11, 4, -8); g.lineTo(4, -4); g.lineTo(7, -6); g.quadraticCurveTo(10, -5, 8, -1); g.lineTo(5, 4); g.lineTo(6, 9); g.closePath();
    g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = '#a3245a'; g.lineWidth = 1.6; g.stroke(); D.rr(g, -8, 6, 15, 4, 1.5, '#ff5fb0');
  } else if (k === 'kalkan') {
    g.beginPath(); g.moveTo(0, -11); g.lineTo(9, -7); g.lineTo(8, 2); g.quadraticCurveTo(6, 8, 0, 11); g.quadraticCurveTo(-6, 8, -8, 2); g.lineTo(-9, -7); g.closePath();
    g.fillStyle = '#2f7bd8'; g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 1.8; g.stroke();
    g.fillStyle = '#ffe14a'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2.3 : 5.2; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
  } else if (k === 'kumanda') {
    D.rr(g, -6, -6, 12, 17, 3, '#3a3f4f', '#12141c', 1.4); D.circle(g, 0, -1, 3.4, '#ff3b5c', '#7a0010', 1); D.rr(g, -3.5, 5, 3, 3, 1, '#9aa3ad'); D.rr(g, .5, 5, 3, 3, 1, '#9aa3ad');
    g.strokeStyle = '#12141c'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(3, -6); g.lineTo(6, -11); g.stroke(); D.circle(g, 6, -11, 1.8, '#ffe14a');
  } else if (k === 'kafatasi') {
    D.circle(g, 0, -2, 8.5, '#f4f0ea', '#3a2c40', 1.5); D.rr(g, -5, 3, 10, 7, 2.5, '#f4f0ea', '#3a2c40', 1.5);
    D.ell(g, -3.2, -2, 2.6, 3, '#3a2c40'); D.ell(g, 3.2, -2, 2.6, 3, '#3a2c40'); g.fillStyle = '#3a2c40'; g.beginPath(); g.moveTo(0, 1.5); g.lineTo(-1.3, 4); g.lineTo(1.3, 4); g.fill();
    g.strokeStyle = '#3a2c40'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-2, 7); g.lineTo(-2, 10); g.moveTo(0, 7); g.lineTo(0, 10); g.moveTo(2, 7); g.lineTo(2, 10); g.stroke();
  } else if (k === 'altin') {
    D.circle(g, 0, 0, 9.5, '#ffd84a', '#a36b00', 1.8); D.circle(g, 0, 0, 6.5, null, '#e6a800', 1.4);
    g.fillStyle = '#fff3b0'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2 : 4.6; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
  }
  g.restore();
}
function drawItem(g, it, t, now) {
  const x = sx_(it.x), y = sy_(it.y);
  if (it.k === 'altin') {
    const b = Math.sin(t / 260 + it.id) * ts * .05, w = Math.abs(Math.cos(t / 420 + it.id));
    D.ell(g, x, y + ts * .3, ts * .22, ts * .07, 'rgba(30,12,50,.25)');
    g.save(); g.translate(x, y - ts * .05 + b); g.scale(.35 + .65 * w, 1); drawIcon(g, 'altin', ts * (it.v > 1 ? .9 : .72)); g.restore();
    if (it.v > 1) D.text(g, '×' + it.v, x + ts * .3, y - ts * .3, Math.max(9, ts * .28), '#fff3b0', '#5a3a00');
    return;
  }
  const age = now - it.at, sc = age < 0 ? 0 : age < 260 ? .4 + .6 * Math.sin(age / 260 * Math.PI / 2) * 1.1 : 1;
  if (sc <= 0) return;
  const b = Math.sin(t / 300 + it.id) * ts * .04, s = ts * .8 * Math.min(1.1, sc), col = ITEMS[it.k] ? ITEMS[it.k].col : '#fff';
  D.ell(g, x, y + ts * .32, ts * .26, ts * .07, 'rgba(30,12,50,.25)');
  g.save(); g.translate(x, y - ts * .04 + b);
  const gr = g.createLinearGradient(0, -s / 2, 0, s / 2); gr.addColorStop(0, shade(col, .45)); gr.addColorStop(1, col);
  D.rr(g, -s / 2, -s / 2, s, s, s * .22, gr, '#ffffff', Math.max(1.5, ts * .06));
  if (it.k === 'kafatasi') { D.rr(g, -s / 2, -s / 2, s, s, s * .22, 'rgba(60,20,80,.35)'); }
  drawIcon(g, it.k, s * .82);
  g.globalAlpha = .5 + .5 * Math.sin(t / 200 + it.id); D.circle(g, -s * .3, -s * .3, s * .07, '#ffffff'); g.globalAlpha = 1;
  g.restore();
}
function bombVisual(b, now) {
  if (b.fl) {
    const u = clamp((now - b.fl.t0) / b.fl.dur, 0, 1), W = V.W, H = V.H;
    let x = b.fl.x0 + DX[b.fl.d] * b.fl.hops * u, y = b.fl.y0 + DY[b.fl.d] * b.fl.hops * u;
    const wr = (v, n) => { const span = n - 2; let w = ((v - 1) % span + span) % span + 1; if (w > n - 1.5) w -= span; return w; };
    x = wr(x, W); y = wr(y, H);
    return { x, y, z: Math.sin(u * Math.PI) * (1.1 + b.fl.hops * .12) };
  }
  if (b.sl) { const pr = Math.min(b.sl.n, Math.max(0, (now - b.sl.t0) * b.sl.sp / 1000)); return { x: b.sl.x0 + b.sl.dx * pr, y: b.sl.y0 + b.sl.dy * pr, z: 0 }; }
  return { x: b.x, y: b.y, z: 0 };
}
function drawBomb(g, b, t, now, ghost) {
  const vis = bombVisual(b, now), x = sx_(vis.x), y = sy_(vis.y) - vis.z * ts;
  const left = b.rm ? 99999 : b.ex - now, k = clamp(1 - left / FUSE, 0, 1);
  const wob = b.rm ? Math.sin(t / 300) * .03 : Math.sin(t / (150 - k * 90)) * (.05 + k * .1);
  const s = ts * (.36 + (k > .8 ? (k - .8) * .3 : 0));
  D.ell(g, sx_(vis.x), sy_(vis.y) + ts * .28, ts * .28 * (1 - vis.z * .25), ts * .08, 'rgba(20,8,40,.3)');
  g.save(); g.translate(x, y + ts * .06); g.scale(1 + wob, 1 - wob); if (ghost) g.globalAlpha = .7;
  const col = V.players[b.o] ? V.players[b.o].color : '#ffffff';
  const gr = g.createRadialGradient(-s * .35, -s * .4, s * .1, 0, 0, s); gr.addColorStop(0, '#5b4a78'); gr.addColorStop(.5, '#2d2340'); gr.addColorStop(1, '#140a22');
  D.circle(g, 0, 0, s, gr, '#0a0414', Math.max(1, ts * .04));
  g.strokeStyle = col; g.lineWidth = Math.max(1.5, ts * .07); g.beginPath(); g.arc(0, 0, s * .82, Math.PI * .15, Math.PI * .85); g.stroke();
  D.ell(g, -s * .35, -s * .38, s * .22, s * .14, 'rgba(255,255,255,.55)', -.6);
  D.rr(g, -s * .22, -s * 1.12, s * .44, s * .3, s * .08, '#7d8794');
  g.strokeStyle = '#d8b88a'; g.lineWidth = Math.max(1.2, ts * .05); g.beginPath(); g.moveTo(0, -s * 1.1); g.quadraticCurveTo(s * .4, -s * 1.6, s * .7, -s * 1.4); g.stroke();
  if (b.rm) { const on = Math.sin(t / 120) > 0; D.circle(g, s * .7, -s * 1.4, s * .2, on ? '#ff3b5c' : '#7a0010'); if (on) { g.globalAlpha = .4; D.circle(g, s * .7, -s * 1.4, s * .45, '#ff3b5c'); g.globalAlpha = 1; } }
  else { const f = .6 + .4 * Math.sin(t / 50); D.circle(g, s * .7, -s * 1.4, s * (.2 + .12 * f), '#ffe14a'); D.circle(g, s * .7, -s * 1.4, s * .1, '#ffffff'); }
  if (k > .75 && !b.rm) { g.globalAlpha = (k - .75) * 2.4 * (.5 + .5 * Math.sin(t / 40)); D.circle(g, 0, 0, s, '#ff5a3c'); }
  g.restore();
}
function drawFire(g, f, now) {
  const [x, y, kind, at, until] = f; if (until <= now) return;
  const u = clamp((now - at) / (until - at), 0, 1), w = (u < .12 ? u / .12 : 1 - Math.max(0, (u - .55) / .45) * .85) * ts;
  const cx = sx_(x), cy = sy_(y) - ts * .08, fl = Math.sin(now / 35 + x * 3 + y) * .06;
  const layer = (sc, col) => {
    const hw = w * (.44 + fl) * sc, half = ts * .52;
    g.fillStyle = col;
    if (kind === 'c') { g.beginPath(); g.arc(cx, cy, hw * 1.15, 0, TAU); g.fill(); return; }
    const hor = 'hLR'.includes(kind);
    let x0 = -half, x1 = half;
    if (kind === 'L') x0 = -half * .55; if (kind === 'R') x1 = half * .55; if (kind === 'U') x0 = -half * .55; if (kind === 'D') x1 = half * .55;
    g.save(); g.translate(cx, cy); if (!hor) g.rotate(Math.PI / 2);
    rrPath(g, x0, -hw, x1 - x0, hw * 2, (kind === 'h' || kind === 'v') ? 0 : hw); g.fill();
    if (kind === 'L' || kind === 'U') { g.beginPath(); g.arc(x0 + hw * .2, 0, hw, 0, TAU); g.fill(); g.beginPath(); g.rect(x0 + hw * .2, -hw, half - x0, hw * 2); g.fill(); }
    if (kind === 'R' || kind === 'D') { g.beginPath(); g.arc(x1 - hw * .2, 0, hw, 0, TAU); g.fill(); g.beginPath(); g.rect(-half, -hw, x1 - hw * .2 + half, hw * 2); g.fill(); }
    g.restore();
  };
  layer(1.08, 'rgba(255,90,30,.92)'); layer(.78, '#ffb627'); layer(.48, '#fff3b0');
}
function drawGuy(g, x, y, s, col, o) {
  const t = o.t, d = o.d || 4, walk = o.walk || 0, ph = o.ph || 0;
  const dk = shade(col, -.42), lt = shade(col, .45);
  const bob = Math.abs(Math.sin(ph)) * .06 * s * walk;
  g.save(); g.globalAlpha = o.alpha == null ? 1 : o.alpha;
  if (o.team != null) { g.strokeStyle = TEAMS[o.team].col; g.lineWidth = Math.max(1.5, s * .07); g.beginPath(); g.ellipse(x, y + s * .3, s * .38, s * .14, 0, 0, TAU); g.stroke(); }
  D.ell(g, x, y + s * .3, s * .3, s * .1, 'rgba(20,8,40,.3)');
  const sw = Math.sin(ph) * s * .09 * walk;
  D.ell(g, x - s * .15 + (DX[d] ? sw : 0), y + s * .27 + (DY[d] ? sw * .5 : 0), s * .11, s * .075, dk);
  D.ell(g, x + s * .15 - (DX[d] ? sw : 0), y + s * .27 - (DY[d] ? sw * .5 : 0), s * .11, s * .075, dk);
  const by = y - s * .04 - bob;
  if (o.curse) { g.globalAlpha *= .55 + .3 * Math.sin(t / 90); D.circle(g, x, by, s * .48, 'rgba(160,60,200,.35)'); g.globalAlpha = o.alpha == null ? 1 : o.alpha; }
  // anten
  g.strokeStyle = dk; g.lineWidth = Math.max(1.2, s * .05); g.beginPath(); g.moveTo(x, by - s * .3); g.quadraticCurveTo(x + s * .05, by - s * .45, x + s * .1 + Math.sin(t / 300) * s * .03, by - s * .5); g.stroke();
  D.circle(g, x + s * .1 + Math.sin(t / 300) * s * .03, by - s * .52, s * .075, '#fff6d0', dk, Math.max(1, s * .035));
  const gr = g.createRadialGradient(x - s * .12, by - s * .14, s * .04, x, by, s * .38); gr.addColorStop(0, lt); gr.addColorStop(.6, col); gr.addColorStop(1, shade(col, -.15));
  D.ell(g, x, by, s * .34, s * .32, gr, 0, dk, Math.max(1.4, s * .055));
  D.ell(g, x, by + s * .1, s * .19, s * .12, 'rgba(255,255,255,.3)');
  if (d !== 3) {
    const fx = DX[d] * s * .08, fy = DY[d] * s * .04;
    const blink = Math.sin(t / 900 + col.length * 7) > .985;
    [-1, 1].forEach(k => {
      const ex = x + k * s * .115 + fx, ey = by - s * .07 + fy;
      if (blink) { g.strokeStyle = '#2d2340'; g.lineWidth = Math.max(1, s * .04); g.beginPath(); g.moveTo(ex - s * .06, ey); g.lineTo(ex + s * .06, ey); g.stroke(); }
      else { D.ell(g, ex, ey, s * .085, s * .1, '#ffffff', 0, dk, Math.max(.8, s * .025)); D.circle(g, ex + DX[d] * s * .03, ey + DY[d] * s * .03 + s * .01, s * .05, '#2d2340'); D.circle(g, ex + DX[d] * s * .03 - s * .02, ey - s * .02, s * .018, '#ffffff'); }
    });
    D.ell(g, x - s * .2 + fx, by + s * .05 + fy, s * .055, s * .035, 'rgba(255,110,150,.6)'); D.ell(g, x + s * .2 + fx, by + s * .05 + fy, s * .055, s * .035, 'rgba(255,110,150,.6)');
    g.strokeStyle = '#2d2340'; g.lineWidth = Math.max(1, s * .035); g.beginPath(); g.arc(x + fx, by + s * .06 + fy, s * .05, .2, Math.PI - .2); g.stroke();
  } else { D.ell(g, x, by + s * .14, s * .06, s * .04, dk); }
  if (o.shield) { const a = .55 + .25 * Math.sin(t / 160); D.circle(g, x, by, s * .5, `rgba(90,200,255,${.14 * a})`, `rgba(160,230,255,${a})`, Math.max(1.5, s * .06)); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = Math.max(1, s * .04); g.beginPath(); g.arc(x, by, s * .42, -2.4, -1.7); g.stroke(); }
  if (o.curse) { g.save(); g.translate(x, by - s * .78 + Math.sin(t / 200) * s * .04); drawIcon(g, 'kafatasi', s * .5); g.restore(); }
  if (o.speed && walk > .3) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = Math.max(1, s * .04); for (let i = -1; i <= 1; i++) { const lx = x - DX[d] * s * .45 + DY[d] * i * s * .14, ly = by - DY[d] * s * .45 + DX[d] * i * s * .14; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx - DX[d] * s * .25, ly - DY[d] * s * .25); g.stroke(); } }
  if (o.label) {
    const ly = by - s * (o.curse ? 1.12 : .82), fs = Math.max(9, Math.min(13, s * .34));
    g.font = `900 ${fs}px "Nunito","Segoe UI",system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(o.label).width + 8;
    D.rr(g, x - w / 2, ly - fs * .62, w, fs * 1.24, fs * .6, '#ffffff', 'rgba(0,0,0,.35)', 1);
    g.fillStyle = '#1a0b3d'; g.fillText(o.label, x, ly + .5);
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x - 4, ly + fs * .6); g.lineTo(x + 4, ly + fs * .6); g.lineTo(x, ly + fs * .6 + 4); g.fill();
  }
  if (o.off) D.text(g, 'z z', x + s * .35, by - s * .4, Math.max(9, s * .3), '#ffffff', '#1a0b3d');
  g.restore();
}
function drawGhost(g, x, y, s, col, u) {
  g.save(); g.globalAlpha = Math.max(0, 1 - u) * .9;
  const yy = y - u * s * 1.6, sw = Math.sin(u * 12) * s * .08;
  g.translate(x + sw, yy);
  g.beginPath(); g.moveTo(-s * .26, s * .22); g.lineTo(-s * .26, -s * .02); g.arc(0, -s * .02, s * .26, Math.PI, 0); g.lineTo(s * .26, s * .22);
  for (let i = 0; i < 4; i++) g.quadraticCurveTo(s * .26 - (i + .5) * s * .13, (i % 2 ? s * .3 : s * .14), s * .26 - (i + 1) * s * .13, s * .22);
  g.closePath(); g.fillStyle = 'rgba(255,255,255,.95)'; g.fill(); g.strokeStyle = col; g.lineWidth = Math.max(1.2, s * .05); g.stroke();
  D.ell(g, -s * .09, -s * .04, s * .04, s * .06, '#2d2340'); D.ell(g, s * .09, -s * .04, s * .04, s * .06, '#2d2340');
  D.ell(g, -s * .15, s * .06, s * .045, s * .03, col); D.ell(g, s * .15, s * .06, s * .045, s * .03, col);
  D.ell(g, 0, s * .07, s * .04, s * .03, '#2d2340');
  g.restore();
}

/* ---- dünya (istemci tarafı) ---- */
function landedK(now) {
  if (!V || !V.shrink) return 0;
  const ord = spiralOf(V.W, V.H), until = V.shrink.stop ? Math.min(now, V.shrink.stop) : now;
  return clamp(Math.floor((until - V.shrink.start) / V.shrink.iv) + 1, 0, ord.length);
}
function clientWorld(now) {
  const bs = [];
  for (const b of V.bombs) { if (b.fl) continue; const vis = bombVisual(b, now); bs.push({ id: b.id, x: Math.round(vis.x), y: Math.round(vis.y) }); }
  for (const p of pending) bs.push({ id: p.id, x: p.x, y: p.y });
  let extra = null;
  const nl = landedK(now);
  if (nl > 0) { const ord = spiralOf(V.W, V.H), set = new Set(ord.slice(0, nl)); extra = k => set.has(k); }
  return { Wd: mkWorld(V.W, V.H, V.grid, V.feat, bs, extra), bs };
}

/* ---- yerel oyuncu(lar) ---- */
function seatInput(seat) {
  const idx = V.mine.indexOf(seat); if (idx < 0) return 0;
  let best = 0, bt = -1;
  const sets = V.mine.length === 1 ? [KEYSETS[0], KEYSETS[1]] : idx < 4 ? [KEYSETS[idx]] : [];
  for (const ks of sets) for (const [dk, d] of [['L', 1], ['R', 2], ['U', 3], ['D', 4]]) for (const c of ks[dk]) { const tt = keys.get(c); if (tt != null && tt > bt) { bt = tt; best = d; } }
  if (idx === 0 && touchDir) best = touchDir;
  return best;
}
function stepMine(dt, t, now) {
  if (!V || !V.mine.length) return;
  const W = clientWorld(now);
  for (const seat of V.mine) {
    const p = V.pl[seat]; let b = avs[seat];
    if (!p) continue;
    if (!b) b = avs[seat] = { x: p.x, y: p.y, d: p.d || 4, md: 0, ice: false, pass: [], walk: 0, ph: 0 };
    // yeni bombaların üstündeysem geçebilirim
    for (const bb of W.bs) if (!seenBombs.has(seat + ':' + bb.id)) { seenBombs.add(seat + ':' + bb.id); if (overlaps(b, bb.x, bb.y) && !b.pass.includes(bb.id)) b.pass.push(bb.id); }
    updPass(b, W.bs);
    if (V.phase !== 'play' || !p.alive) { b.walk = Math.max(0, b.walk - dt * 6); b.m = 0; continue; }
    let dir = seatInput(seat);
    if (dir && p.curse === 'ters') dir = [0, 2, 1, 4, 3][dir];
    const ox0 = b.x, oy0 = b.y;
    stepBody(W.Wd, b, dir, speedOf(p), dt);
    const sp = Math.hypot(b.x - ox0, b.y - oy0) / Math.max(dt, 1e-3);
    b.walk = clamp(sp / 3, 0, 1); b.ph += sp * dt * 5.5;
    // tekme isteği
    if (b.blk && dir && p.kick) {
      const id = W.Wd.bomb(b.blk[0], b.blk[1]);
      if (id != null && typeof id === 'number' && (kickAt[id] || 0) < t - 500) { kickAt[id] = t; sendPos(seat, t, true); ui.send({ t: 'kick', as: seat, id, d: dir }); }
    }
    const tile = Math.round(b.x) + ',' + Math.round(b.y);
    if ((t - (lastSentAt[seat] || 0) > 100 && (Math.abs((sendAt[seat] || [0, 0])[0] - b.x) > .01 || Math.abs((sendAt[seat] || [0, 0])[1] - b.y) > .01)) || t - (lastSentAt[seat] || 0) > 450 || (tile !== sentTile[seat] && t - (lastSentAt[seat] || 0) > 45)) sendPos(seat, t);
  }
}
function sendPos(seat, t, force) {
  const b = avs[seat]; if (!b || !ui || !V) return;
  if (!force && V.phase !== 'play') return;
  lastSentAt[seat] = t || pnow(); sendAt[seat] = [b.x, b.y]; sentTile[seat] = Math.round(b.x) + ',' + Math.round(b.y);
  const x = r2(b.x), y = r2(b.y), m = b.m ? 1 : 0;
  if (ui.isHost) hostPosIn(seat, x, y, b.d, m);
  if (ui.mode === 'online' && ui.fast) ui.fast({ t: 'p', x, y, d: b.d, m, h: Math.round(hostClock()) });
}
function pressBomb(seat) {
  if (!V || V.phase !== 'play' || !isMine(seat)) return;
  const p = V.pl[seat], b = avs[seat]; if (!p || !p.alive || !b) return;
  const t = pnow(); if ((bombAt[seat] || 0) > t - 160) return; bombAt[seat] = t;
  Sound.init();
  const now = hostClock(), x = Math.round(b.x), y = Math.round(b.y);
  const W = clientWorld(now), on = W.Wd.bomb(x, y);
  if (on == null) {
    const mineN = V.bombs.filter(o => o.o === seat).length + pending.filter(o => o.seat === seat).length;
    const fire = V.fire.some(f => f[0] === x && f[1] === y && f[4] > now);
    if (mineN < p.b && !fire && !W.Wd.solid(x, y)) { const id = `p${seat}:${x},${y}`; pending.push({ id, seat, x, y, t, ht: now, rm: p.remote ? 1 : 0 }); if (!b.pass.includes(id)) b.pass.push(id); seenBombs.add(seat + ':' + id); snd.plop(); }
  }
  sendPos(seat, t, true);
  ui.send({ t: 'bomb', as: seat, x, y, d: b.d });
}
function pressDet(seat) { if (!V || V.phase !== 'play' || !isMine(seat)) return; const p = V.pl[seat]; if (!p || !p.alive || !p.remote) return; Sound.init(); ui.send({ t: 'det', as: seat }); }
function prunePending() {
  const t = pnow();
  pending = pending.filter(pd => {
    if (V.bombs.some(b => b.o === pd.seat && !b.fl && b.x === pd.x && b.y === pd.y)) { const b = avs[pd.seat]; const real = V.bombs.find(o => o.o === pd.seat && o.x === pd.x && o.y === pd.y); if (b && real && b.pass.includes(pd.id) && !b.pass.includes(real.id)) { b.pass.push(real.id); seenBombs.add(pd.seat + ':' + real.id); } return false; }
    return t - pd.t < 900;
  });
}

/* ---- uzaktaki oyuncular ---- */
function mkRemote(p) { return { buf: [], x: p.x, y: p.y, d: p.d || 4, walk: 0, ph: 0, at: 0 }; }
function feed(pi, x, y, d, mv) {
  if (!V || !root || !V.players[pi] || isMine(pi)) return;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const t = pnow();
  let r = rp[pi]; if (!r) r = rp[pi] = mkRemote({ x, y, d });
  const last = r.buf[r.buf.length - 1];
  if (last && Math.hypot(last.x - x, last.y - y) > 3) { r.buf = []; r.x = x; r.y = y; }
  r.buf.push({ t, x, y, d: d || r.d, m: mv });
  if (r.buf.length > 14) r.buf.shift();
  r.at = t;
}
function uiFeed(pi, x, y, d, m) { if (root) feed(pi, x, y, d, m); }
function onFast(m) {
  if (!m || !V) return;
  if (m.t === 'p') { if (ui && ui.isHost) hostPosIn(m.seat, +m.x, +m.y, m.d | 0, m.m, m.id, +m.h); feed(m.seat, +m.x, +m.y, m.d | 0, m.m); }
  else if (m.t === 'b' && Array.isArray(m.p)) { if (ui && ui.isHost) return; m.p.forEach(a => { if (Array.isArray(a)) feed(a[0] | 0, +a[1], +a[2], a[3] | 0, a[4]); }); }
}
function stepRemotes(dt, t) {
  const rt = t - (ui && ui.isHost ? INTERP_H : INTERP_C);
  V.players.forEach((_, i) => {
    if (isMine(i)) return;
    const p = V.pl[i]; if (!p) return;
    let r = rp[i]; if (!r) r = rp[i] = mkRemote(p);
    const ox0 = r.x, oy0 = r.y, b = r.buf;
    let tx = r.x, ty = r.y;
    if (V.phase !== 'play' || !p.alive || !b.length || t - r.at > 1200) { tx = p.x; ty = p.y; if (V.phase !== 'play' || !p.alive || Math.hypot(tx - r.x, ty - r.y) > 2) { r.x = tx; r.y = ty; } if (p.d) r.d = p.d; }
    else {
      while (b.length >= 2 && b[1].t <= rt) b.shift();
      const a = b[0];
      if (b.length >= 2 && rt > a.t) { const c = b[1], u = (rt - a.t) / Math.max(1, c.t - a.t); tx = a.x + (c.x - a.x) * u; ty = a.y + (c.y - a.y) * u; r.d = c.d || r.d; }
      else { tx = a.x; ty = a.y; r.d = a.d || r.d; }
    }
    const k = 1 - Math.exp(-dt * 25);
    r.x += (tx - r.x) * k; r.y += (ty - r.y) * k;
    const sp = Math.hypot(r.x - ox0, r.y - oy0) / Math.max(dt, 1e-3);
    r.walk = clamp(sp / 3, 0, 1); r.ph += sp * dt * 5.5;
  });
}
const posOf = i => (isMine(i) && avs[i] ? avs[i] : rp[i]) || (V && V.pl[i] ? V.pl[i] : { x: 0, y: 0 });

/* ---- parçacıklar ---- */
function burst(x, y, n, cols, sp, kind, grav) {
  for (let i = 0; i < n && parts.length < 420; i++) { const a = rnd(0, TAU), s = rnd(sp * .3, sp); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - sp * .3, life: rnd(.4, .85), max: .85, r: rnd(.05, .11), c: pickR(cols), k: kind || 'dot', g: grav == null ? 3 : grav, rot: rnd(0, TAU), vr: rnd(-12, 12) }); }
}
function stepParts(dt) { for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .93; p.vy = p.vy * .93 + p.g * dt; p.rot += p.vr * dt; } parts = parts.filter(p => p.life > 0); }
function drawParts(g) {
  for (const p of parts) {
    const a = clamp(p.life / p.max, 0, 1), x = sx_(p.x), y = sy_(p.y);
    g.globalAlpha = a;
    if (p.k === 'chip') { g.save(); g.translate(x, y); g.rotate(p.rot); g.fillStyle = p.c; g.fillRect(-p.r * ts, -p.r * ts * .4, p.r * ts * 2, p.r * ts * .8); g.restore(); }
    else if (p.k === 'smoke') D.circle(g, x, y, p.r * ts * (2.4 - a), p.c);
    else D.circle(g, x, y, p.r * ts * (.6 + a * .6), p.c);
  }
  g.globalAlpha = 1;
}
function pop(text, cls) {
  const p = q('.bl-pop'); if (!p) return;
  p.textContent = text; p.className = 'bl-pop'; void p.offsetWidth; p.className = 'bl-pop show ' + (cls || '');
  clearTimeout(popT); popT = setTimeout(() => { if (p) p.className = 'bl-pop'; }, 1200);
}
function toast(text, cls) {
  const t = q('.bl-toast'); if (!t) return;
  t.textContent = text; t.className = 'bl-toast show ' + (cls || ''); clearTimeout(toastT);
  toastT = setTimeout(() => { if (t) t.className = 'bl-toast'; }, 1700);
}

/* ---- ana çizim ---- */
function resize() {
  if (!stageEl || !cv || !V) return;
  const par = stageEl.parentElement.getBoundingClientRect(), r0 = stageEl.getBoundingClientRect(); if (par.width < 10) return;
  const r = { width: par.width }, top = r0.top + (window.scrollY || 0), ph = phoneW();
  const padH = padEl && !padEl.hidden ? padEl.offsetHeight + 10 : 0;
  const availH = ph ? Math.max(220, innerHeight - top - padH - 12) : Math.max(380, innerHeight - top - 18);
  const rows = V.H + HGT;
  ts = Math.min(r.width / V.W, availH / rows, 64);
  if (ph) ts = Math.min(r.width / V.W, Math.max(availH, r.width / V.W * rows * .8) / rows);
  ts = Math.max(12, Math.floor(ts * 4) / 4);
  cw = Math.round(ts * V.W); ch = Math.round(ts * rows);
  dpr = Math.min(2.5, window.devicePixelRatio || 1);
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  stageEl.style.height = ch + 'px'; stageEl.style.width = cw + 'px';
  ox = 0; oy = ts * HGT;
  bg = null; sprites = null;
}
function draw(t, now) {
  const g = cg;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  ensureBg(); ensureSprites(V.arena);
  g.clearRect(0, 0, cw, ch);
  let shx = 0, shy = 0;
  if (shake > 0) { shx = (Math.random() - .5) * shake * ts * .5; shy = (Math.random() - .5) * shake * ts * .5; }
  g.save(); g.translate(shx, shy);
  g.drawImage(bg, 0, 0, cw, ch);
  const W = V.W, H = V.H;
  // zemin üstü canlı katman: bantlar, lav, buz parıltısı, ani ölüm gölgeleri
  if (V.arena === 'fabrika') {
    g.save();
    for (let k = 0; k < W * H; k++) {
      const f = V.feat[k], d = BELTD[f]; if (!d || V.grid[k] === 'X') continue;
      const x = k % W, y = (k - x) / W, px = ox + x * ts, py = oy + y * ts;
      g.save(); g.beginPath(); g.rect(px, py + ts * .1, ts, ts * .8); g.clip();
      const off = ((now / 1000 * BELT) % 1) * ts * .5;
      g.translate(px + ts / 2, py + ts / 2); g.rotate([0, Math.PI, 0, -Math.PI / 2, Math.PI / 2][d]);
      g.strokeStyle = 'rgba(255,214,74,.75)'; g.lineWidth = Math.max(1.5, ts * .08);
      for (let i = -2; i <= 2; i++) { const cx = i * ts * .5 + off - ts * .25; g.beginPath(); g.moveTo(cx - ts * .1, -ts * .22); g.lineTo(cx + ts * .08, 0); g.lineTo(cx - ts * .1, ts * .22); g.stroke(); }
      g.restore();
    }
    g.restore();
  }
  if (V.arena === 'lav' && V.cracks) for (const [x, y, phs] of V.cracks) {
    if (V.grid[y * W + x] === 'X') continue;
    const px = sx_(x), py = sy_(y);
    if (!V.lavaT0) continue;
    const T = nextErupt(V.lavaT0, phs, now - LAVA_BURN), on = now >= T && now < T + LAVA_BURN, warn = !on && T - now < LAVA_WARN && T - now > 0;
    if (warn) { const u = 1 - (T - now) / LAVA_WARN; g.globalAlpha = .25 + .55 * u * (.6 + .4 * Math.sin(now / 60)); D.circle(g, px, py, ts * (.3 + .25 * u), '#ff7a1a'); g.globalAlpha = 1; }
    if (on) {
      const u = (now - T) / LAVA_BURN, hgt = ts * (1.2 * Math.sin(u * Math.PI));
      D.circle(g, px, py, ts * .45, 'rgba(255,90,30,.9)'); D.circle(g, px, py, ts * .3, '#ffb627');
      const gr = g.createLinearGradient(px, py, px, py - hgt); gr.addColorStop(0, '#ff5a1a'); gr.addColorStop(1, 'rgba(255,214,74,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(px - ts * .3, py); g.quadraticCurveTo(px, py - hgt * 1.3, px + ts * .3, py); g.fill();
      if (!lavaSnd[x + ',' + y + ':' + T]) { lavaSnd[x + ',' + y + ':' + T] = 1; snd.lava(); burst(x, y - .2, 6, ['#ff5a1a', '#ffb627', '#ffe14a'], 3, 'dot', 6); }
    }
  }
  if (V.arena === 'buz') for (let i = 0; i < 6; i++) { const k = (now / 1500 + i * .37) % 1, a = Math.sin(k * Math.PI), x = 3 + ((i * 5) % (W - 6)), y = 3 + ((i * 3) % (H - 6)); g.globalAlpha = a * .9; g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; const px = sx_(x + .2), py = sy_(y - .1), s = ts * .15 * a; g.beginPath(); g.moveTo(px - s, py); g.lineTo(px + s, py); g.moveTo(px, py - s); g.lineTo(px, py + s); g.stroke(); g.globalAlpha = 1; }
  // ani ölüm uyarı gölgeleri
  const falling = new Map();
  if (V.shrink) {
    const ord = spiralOf(W, H), stop = V.shrink.stop || Infinity;
    for (let i = 0; i < ord.length; i++) {
      const L = V.shrink.start + i * V.shrink.iv; if (L - SHRINK_WARN > now) break;
      if (L <= now - 200 || L > stop) continue;
      const k = ord[i], x = k % W, y = (k - x) / W, u = clamp(1 - (L - now) / SHRINK_WARN, 0, 1);
      if (L > now) { g.fillStyle = `rgba(20,8,40,${.15 + .4 * u})`; const s = ts * (.3 + .6 * u); g.fillRect(sx_(x) - s / 2, sy_(y) - s / 2, s, s); falling.set(k, u); }
      if (L <= now && L > now - 200 && landSeen < L) { landSeen = L; snd.thud(); burst(x, y + .3, 5, ['#d9d4de', '#a8a2b0'], 2, 'smoke', -.5); }
    }
  }
  // satır satır: bloklar, eşyalar, bombalar, oyuncular, alevler
  const hpx = ts * HGT;
  const nl = landedK(now), landed = nl ? new Set(spiralOf(W, H).slice(0, nl)) : null;
  const rowsP = Array.from({ length: H }, () => []);
  V.players.forEach((pl, i) => {
    const p = V.pl[i]; if (!p) return;
    if (!p.alive) return;
    const pos = posOf(i); rowsP[clamp(Math.round(pos.y), 0, H - 1)].push({ i, pos });
  });
  const bombRows = Array.from({ length: H }, () => []), air = [];
  for (const b of V.bombs) { if (b.fl) { air.push(b); continue; } const v = bombVisual(b, now); bombRows[clamp(Math.round(v.y), 0, H - 1)].push(b); }
  for (const pd of pending) if (!V.bombs.some(b => b.x === pd.x && b.y === pd.y)) bombRows[pd.y].push({ id: pd.id, x: pd.x, y: pd.y, o: pd.seat, r: 2, at: pd.ht, ex: pd.ht + (pd.rm ? RM_FUSE : FUSE), rm: pd.rm, ghost: true });
  const fireRows = Array.from({ length: H }, () => []);
  for (const f of V.fire) if (f[4] > now) fireRows[f[1]].push(f);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = y * W + x, c = V.grid[k];
      let spr = null;
      if (c === '#') spr = (x === 0 || y === 0 || x === W - 1 || y === H - 1) ? sprites.wall : sprites.pil;
      else if (c === 'c') spr = sprites.crate;
      else if (c === 'X' || (landed && landed.has(k))) spr = sprites.X;
      if (spr) g.drawImage(spr, ox + x * ts, oy + y * ts - hpx, ts, ts + hpx);
      const fu = falling.get(k);
      if (fu != null && fu > .7) { const dropY = (1 - (fu - .7) / .3) * ts * 3; g.globalAlpha = .9; g.drawImage(sprites.X, ox + x * ts, oy + y * ts - hpx - dropY, ts, ts + hpx); g.globalAlpha = 1; }
    }
    for (const it of V.items) if (it.y === y && V.grid[y * W + it.x] !== 'c') drawItem(g, it, t, now);
    for (const b of bombRows[y]) drawBomb(g, b, t, now, b.ghost);
    rowsP[y].sort((a, b) => a.pos.y - b.pos.y).forEach(({ i, pos }) => drawPlayer(g, i, pos, t, now));
    for (const f of fireRows[y]) drawFire(g, f, now);
  }
  for (const b of air) drawBomb(g, b, t, now);
  drawParts(g);
  drawAnims(g, t);
  g.restore();
}
function drawPlayer(g, i, pos, t, now) {
  const pl = V.players[i], p = V.pl[i]; if (!pl || !p) return;
  const me = isMine(i), imm = p.imm > now;
  let alpha = 1; if (imm && Math.sin(t / 60) > 0) alpha = .45; if (!pl.online && !pl.isBot) alpha *= .7;
  let label = null;
  if (me && V.phase !== 'end') label = V.mine.length > 1 ? `P${V.mine.indexOf(i) + 1}` : 'SEN';
  drawGuy(g, sx_(pos.x), sy_(pos.y), ts, pl.color, { t, d: pos.d || p.d, walk: pos.walk || 0, ph: pos.ph || 0, alpha, shield: p.shield, curse: p.curse, speed: p.s >= 2, label, team: V.mode === 'takim' ? pl.team : null, off: !pl.online && !pl.isBot && !pl.ai });
}
function drawAnims(g, t) {
  anims = anims.filter(a => t - a.start < a.dur);
  for (const a of anims) {
    const u = clamp((t - a.start) / a.dur, 0, 1), x = sx_(a.x), y = sy_(a.y);
    if (a.k === 'puf') {
      g.save(); g.globalAlpha = 1 - u;
      for (let i = 0; i < 8; i++) { const an = i / 8 * TAU, d = ts * (.15 + u * .55); D.circle(g, x + Math.cos(an) * d, y - ts * .1 + Math.sin(an) * d * .7, ts * .22 * (1 - u * .4), i % 2 ? '#ffffff' : '#e3dcea'); }
      if (u < .6) { g.translate(x, y - ts * (.5 + u * .4)); const s = u < .15 ? u / .15 : 1; g.scale(s, s); D.text(g, 'PUF!', 0, 0, Math.max(14, ts * .55), '#ffffff', a.col ? shade(a.col, -.5) : '#5a1a00'); }
      g.restore();
    } else if (a.k === 'ghost') drawGhost(g, x, y, ts, a.col, u);
    else if (a.k === 'text') {
      const s = u < .2 ? .5 + u / .2 * .7 : u < .3 ? 1.2 - (u - .2) * 2 : 1;
      g.save(); g.globalAlpha = u > .7 ? (1 - u) / .3 : 1; g.translate(x, y - ts * (.6 + u * .8)); g.scale(s, s);
      D.text(g, a.txt, 0, 0, Math.max(11, ts * (a.size || .45)), a.col || '#ffe14a', a.stroke || '#5a1a00'); g.restore();
    } else if (a.k === 'ring') { g.save(); g.globalAlpha = 1 - u; D.circle(g, x, y, ts * (.2 + u * (a.r || .8)), null, a.col || '#fff', Math.max(1, ts * .1 * (1 - u))); g.restore(); }
  }
}
function frame() {
  raf = 0; if (!root || !cv) return;
  raf = requestAnimationFrame(frame);
  if (!V || !V.W) return;
  const t = pnow(), dt = clamp((t - (lastT || t)) / 1000, 0, .25), now = hostClock(); lastT = t; frameN++;
  prunePending();
  stepMine(dt, t, now); stepRemotes(dt, t); stepParts(dt);
  shake = Math.max(0, shake - dt * 2.2);
  draw(t, now);
}

/* ---- HUD ---- */
function chipVal(v, i) { return v.mode === 'altin' ? `${v.players[i].coins}<small>🪙</small>` : v.mode === 'takim' ? `${v.players[i].kills}<small>PUF</small>` : `${v.players[i].wins}<small>/${v.need}</small>`; }
function renderHud() {
  const v = V;
  const ck = JSON.stringify([v.players.map(p => [p.name, p.online, p.wins, p.coins, p.kills, p.ai, p.team]), v.pl.map(p => p.alive), v.mine, v.phase, v.mode]);
  if (ck !== chipKey) {
    chipKey = ck;
    const box = q('.bl-players'); box.classList.toggle('compact', v.players.length > 4);
    box.innerHTML = v.players.map((p, i) => `<div class="g-chip bl-chip ${isMine(i) ? 'me' : ''} ${!v.pl[i].alive && v.phase === 'play' ? 'dead' : ''} ${!p.online && !p.isBot ? 'off' : ''}" style="--pc:${p.color}">
      <span class="av" style="--pc:${p.color}">${v.pl[i].alive || v.phase !== 'play' ? initial(p.name) : '👻'}</span><b title="${esc(p.name)}">${esc(p.name)}${isMine(i) ? (v.mine.length > 1 ? `<small> · P${v.mine.indexOf(i) + 1}</small>` : '<small> · sen</small>') : ''}</b>${v.mode === 'takim' ? `<span class="bl-tag" style="--tc:${TEAMS[p.team].col}">${TEAMS[p.team].icon}</span>` : ''}${p.ai ? '<span class="bl-tag ai">🤖</span>' : ''}<span class="g-num bl-val">${chipVal(v, i)}</span></div>`).join('');
  }
  const mine = v.mine, nm = i => `<b style="color:${v.players[i].color}">${esc(v.players[i].name)}</b>`;
  let st = '', cls = '';
  const al = v.pl.map((p, i) => (p.alive ? i : -1)).filter(i => i >= 0);
  if (v.phase === 'count') st = mine.length ? '⏳ Hazırlan… bombalar birazdan konuşacak!' : '👀 Tur başlıyor…';
  else if (v.phase === 'play') {
    const mySeat = mine.length === 1 ? mine[0] : -1;
    if (v.mode === 'altin') {
      if (mySeat >= 0 && !v.pl[mySeat].alive) { const s = Math.max(0, Math.ceil((v.pl[mySeat].respawnAt - hostClock()) / 1000)); st = `👻 PUF! ${s} sn sonra yeniden doğuyorsun`; }
      else if (mySeat >= 0) { st = `🪙 Altın topla! Sende: ${v.players[mySeat].coins}`; cls = 'mine'; }
      else st = '🪙 Altın Avı: en çok altını toplayan kazanır!';
    } else if (mySeat >= 0 && !v.pl[mySeat].alive) st = `👻 PUF oldun — izliyorsun · ayakta: ${al.length}`;
    else if (v.mode === 'takim') { const a = [0, 1].map(tm => al.filter(i => v.players[i].team === tm).length); st = `${TEAMS[0].icon} ${a[0]} ayakta · ${TEAMS[1].icon} ${a[1]} ayakta${v.sudden ? ' · ⚠️ ANİ ÖLÜM' : ''}`; if (mySeat >= 0) cls = 'mine'; }
    else { st = mine.length && mine.some(i => v.pl[i].alive) ? `💣 Son ayakta kalan kazanır · ayakta: ${al.length}${v.sudden ? ' · ⚠️ ANİ ÖLÜM' : ''}` : `👀 Ayakta: ${al.map(nm).join(', ')}`; if (mySeat >= 0) cls = 'mine'; }
    if (v.sudden && cls) cls += ' hot';
  } else if (v.phase === 'end') { st = v.last && v.last.draw ? '🤝 Berabere!' : `🏁 Tur ${v.round} bitti!`; cls = 'win'; }
  else { st = '🏆 Oyun bitti!'; cls = 'win'; }
  q('.bl-status').innerHTML = `<span class="g-turn ${cls}">${st}</span>`;
  const md = MODES[v.mode], th = THEMES[v.arena];
  q('.bl-mode').textContent = v.mode === 'altin' ? `${md.icon} ${md.name} · ${th.icon} ${th.name}` : v.mode === 'takim' ? `${md.icon} ${TEAMS[0].icon} ${v.teamWins[0]} – ${v.teamWins[1]} ${TEAMS[1].icon} · Tur ${v.round}` : `${md.icon} Tur ${v.round} · ${v.bestOf > 1 ? `${v.need} galibiyet` : 'tek tur'} · ${th.icon} ${th.name}`;
}
function mineStats() {
  const v = V, now = hostClock(), el = q('.bl-mine'); if (!el) return;
  const rows = v.mine.filter(i => v.pl[i]).map(i => {
    const p = v.pl[i], pre = v.mine.length > 1 ? `<i style="--pc:${v.players[i].color}">P${v.mine.indexOf(i) + 1}</i>` : '';
    const cs = p.curse ? `<span class="bl-st bad">${CURSES[p.curse].icon} ${Math.max(0, Math.ceil((p.cu - now) / 1000))}</span>` : '';
    return `<span class="bl-ms">${pre}<span class="bl-st">💣${p.b}</span><span class="bl-st">🔥${p.r}</span><span class="bl-st">👟${p.s}</span>${p.kick ? '<span class="bl-st on">🦶</span>' : ''}${p.glove ? '<span class="bl-st on">🧤</span>' : ''}${p.shield ? '<span class="bl-st on">🛡️</span>' : ''}${p.remote ? '<span class="bl-st on">📡</span>' : ''}${cs}</span>`;
  }).join('');
  if (rows !== mineKey) { mineKey = rows; el.innerHTML = rows; }
}
function renderSide() {
  const v = V, side = q('.bl-side'); if (!side) return;
  const key = `${v.mode}:${v.arena}:${v.mine.length}:${isTouch()}`;
  if (key !== sideKey) {
    sideKey = key;
    const rules = {
      klasik: ['💣 Bombanı bırak, 2,5 sn sonra artı şeklinde patlar.', '📦 Sandıklar kırılır, içinden güç çıkabilir.', '🏆 Turu son ayakta kalan kazanır.', '⏰ Süre bitince ANİ ÖLÜM: arena daralır!'],
      takim: ['🤝 İki takım: rakip takımı tamamen PUF eden turu alır.', '🔥 Dikkat: alevler takım arkadaşını da yakar!', '⏰ Süre bitince ANİ ÖLÜM: arena daralır.'],
      altin: ['🪙 Sandıklardan ve yerden altın topla.', '👻 PUF olursan altınlarının yarısı saçılır, 3 sn sonra yeniden doğarsın.', '⏱ Süre bitince en çok altını olan kazanır.']
    }[v.mode];
    const th = THEMES[v.arena];
    const keysTxt = isTouch() ? '👆 Sol alttaki yön tuşlarıyla yürü · <b>BOMBA</b> düğmesiyle bırak · Eldivenle bombanın üstünde tekrar bas: fırlat' :
      (v.mine.length > 1 ? v.mine.slice(0, 4).map((s, k) => `<b style="color:${v.players[s].color}">P${k + 1}</b>: ${KEY_HELP[k]}`).join('<br>') : '⌨️ <b>WASD / oklar</b>: yürü · <b>Boşluk / Enter</b>: bomba · <b>E</b>: uzaktan patlat · Eldivenle bombanın üstünde tekrar bas: fırlat');
    side.innerHTML = `<h3 class="bl-h">${MODES[v.mode].icon} ${esc(MODES[v.mode].name)}</h3><p class="bl-map">${th.icon} <b>${esc(th.name)}</b> · ${esc(th.desc)}</p>
      <ul class="bl-rules">${rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
      <div class="bl-legend"><span class="bl-lh">Güçler</span>${PU_IDS.map(k => `<div class="bl-li"><canvas data-ic="${k}" width="64" height="64"></canvas><span><b>${esc(ITEMS[k].name)}</b><small>${esc(ITEMS[k].desc)}</small></span></div>`).join('')}</div>
      <p class="bl-keys">${keysTxt}</p><div class="bl-board"></div>`;
    side.querySelectorAll('canvas[data-ic]').forEach(c => { const g = c.getContext('2d'); g.clearRect(0, 0, 64, 64); g.translate(32, 32); const col = ITEMS[c.dataset.ic].col; D.rr(g, -27, -27, 54, 54, 12, col, '#ffffff', 3); drawIcon(g, c.dataset.ic, 44); });
  }
  const rows = v.players.map((p, i) => ({ p, i })).sort((a, b) => (v.mode === 'altin' ? b.p.coins - a.p.coins : b.p.wins - a.p.wins || b.p.kills - a.p.kills));
  q('.bl-board').innerHTML = `<span class="bl-lh">Puan durumu</span><ol class="bl-res">${rows.map(({ p, i }) => `<li style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><span class="bl-rn"><b>${esc(p.name)}${isMine(i) ? (v.mine.length > 1 ? ` (P${v.mine.indexOf(i) + 1})` : ' (sen)') : ''}</b><small>${v.mode === 'takim' ? `${TEAMS[p.team].icon} ${TEAMS[p.team].name} · ` : ''}${p.kills} PUF${p.isBot ? ' · bilgisayar' : ''}</small></span><span class="bl-pts">${v.mode === 'altin' ? p.coins + ' 🪙' : v.mode === 'takim' ? v.teamWins[p.team] : p.wins}</span></li>`).join('')}</ol>`;
}
function renderOverlays() {
  const v = V;
  const cnt = q('.bl-count');
  if (v.phase === 'count') {
    const th = THEMES[v.arena], md = MODES[v.mode];
    const goal = v.mode === 'altin' ? 'En çok altını topla!' : v.mode === 'takim' ? 'Rakip takımı PUF et!' : 'Son ayakta kalan kazanır!';
    const me = v.mine.length === 1 ? v.mine[0] : -1;
    const role = me >= 0 && v.mode === 'takim' ? `<p class="bl-crole" style="color:${TEAMS[v.players[me].team].col}">${TEAMS[v.players[me].team].icon} ${TEAMS[v.players[me].team].name} takımdasın</p>` : me >= 0 ? `<p class="bl-crole"><span class="bl-dot" style="--pc:${v.players[me].color}"></span> Sen bu renksin</p>` : '';
    cnt.innerHTML = `<div class="bl-ccard"><small>${v.mode === 'altin' ? '' : `TUR ${v.round} · `}${th.icon} ${esc(th.name).toLocaleUpperCase('tr-TR')}</small><h3>${md.icon} ${esc(md.name)}</h3><p class="bl-cgoal">${goal}</p>${role}<p class="bl-cth">${esc(th.desc)}</p><b class="bl-cnum">3</b><p class="bl-chint">${isTouch() ? 'Yön tuşları: yürü · BOMBA: bırak' : (v.mine.length > 1 ? 'P1: WASD + Boşluk · P2: Oklar + Enter' : 'WASD / oklar: yürü · Boşluk: bomba')}</p></div>`;
    cnt.hidden = false;
  } else cnt.hidden = true;
  const en = q('.bl-end');
  if ((v.phase === 'end' || v.phase === 'over') && v.last) {
    const L = v.last; let h3, sub = '';
    if (v.mode === 'klasik') { h3 = L.winner >= 0 ? `🏆 ${esc(v.players[L.winner].name)} kazandı!` : '🤝 Berabere!'; sub = v.bestOf > 1 ? `${v.need} galibiyet alan oyunu kazanır` : 'Tek tur'; }
    else if (v.mode === 'takim') { h3 = L.team >= 0 ? `🏆 ${TEAMS[L.team].icon} ${TEAMS[L.team].name} takım!` : '🤝 Berabere!'; sub = `${TEAMS[0].icon} ${v.teamWins[0]} – ${v.teamWins[1]} ${TEAMS[1].icon} · hedef ${v.need}`; }
    else { h3 = '⏱ Süre doldu!'; sub = 'Altınlar sayılıyor…'; }
    const rows = L.rows.slice().sort((a, b) => (v.mode === 'altin' ? b.coins - a.coins : (b.win - a.win) || (v.players[b.pi].wins - v.players[a.pi].wins)));
    en.innerHTML = `<div class="bl-ecard ${L.draw ? 'draw' : ''}"><small>${v.mode === 'altin' ? 'ALTIN AVI' : `TUR ${L.round}`}</small><h3>${h3}</h3><p class="bl-esub">${sub}</p>
      <ol class="bl-res">${rows.map(r => { const p = v.players[r.pi]; return `<li class="${r.win ? 'win' : ''}" style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><span class="bl-rn"><b>${r.win ? '🏆 ' : ''}${esc(p.name)}${isMine(r.pi) ? (v.mine.length > 1 ? ` (P${v.mine.indexOf(r.pi) + 1})` : ' (sen)') : ''}</b><small>${r.alive ? 'ayakta kaldı' : 'PUF oldu'}${r.k ? ` · ${r.k} rakip patlattı` : ''}</small></span><span class="bl-pts">${v.mode === 'altin' ? r.coins + ' 🪙' : v.mode === 'takim' ? '' : `${p.wins}/${v.need}`}</span></li>`; }).join('')}</ol>
      <p class="bl-enext">${v.phase === 'over' ? 'Sonuçlar geliyor…' : 'Sıradaki tur birazdan…'}</p></div>`;
    en.hidden = false;
  } else en.hidden = true;
  // dokunmatik kontroller
  const myS = v.mine[0], p = myS != null ? v.pl[myS] : null;
  if (padEl) {
    const show = isTouch() && v.mine.length > 0;
    if (padEl.hidden === show) { padEl.hidden = !show; requestAnimationFrame(resize); }
    bombBtn.disabled = !p || !p.alive || v.phase !== 'play';
    detBtn.hidden = !p || !p.remote;
    bombBtn.classList.toggle('glove', !!(p && p.glove));
  }
}
function hudTick() {
  if (!V || !root) return;
  const v = V, now = hostClock(), left = Math.max(0, v.endsAt - now), secs = Math.ceil(left / 1000);
  const tm = q('.bl-timer'), tb = tm.querySelector('b');
  tb.textContent = v.phase === 'play' ? (v.sudden ? 'ANİ ÖLÜM' : mmss(secs)) : v.phase === 'count' ? mmss(v.dur) : '—';
  tm.classList.toggle('urgent', v.phase === 'play' && (v.sudden || secs <= 10));
  const cn = q('.bl-cnum'); if (cn && v.phase === 'count') cn.textContent = Math.max(1, secs);
  if (secs !== lastSec) {
    if (v.phase === 'count' && secs > 0 && secs <= 3) Sound.tick(.8);
    else if (v.phase === 'play' && !v.sudden && secs <= 5 && secs > 0) Sound.tick(.6);
    lastSec = secs;
  }
  mineStats();
  if (v.mode === 'altin' && v.phase === 'play') renderHud();
}
function render(v) {
  const prev = V; V = v;
  if (!v || !v.W || !root) return;
  if (!prev || prev.W !== v.W || prev.H !== v.H) requestAnimationFrame(resize);
  const key = `${v.round}:${v.phase}`;
  if (key !== seenKey) {
    if (v.phase === 'count' || !prev || prev.round !== v.round) { avs = {}; rp = []; pending = []; seenBombs = new Set(); parts = []; anims = []; landSeen = 0; lavaSnd = {}; }
    seenKey = key; lastSec = -1;
    if (v.phase === 'count') requestAnimationFrame(resize);
  }
  // kurucu konumu zorla değiştirdiyse (tur başı, yeniden doğma, kontrol geri alma) yerel karaktere uygula
  v.mine.forEach(i => { if (seenTpv[i] !== v.tpv[i]) { seenTpv[i] = v.tpv[i]; const p = v.pl[i]; avs[i] = { x: p.x, y: p.y, d: p.d || 4, md: 0, ice: false, pass: [], walk: 0, ph: 0 }; } });
  v.players.forEach((_, i) => { if (!isMine(i) && rp[i] && prev && prev.tpv && prev.tpv[i] !== v.tpv[i]) { rp[i] = mkRemote(v.pl[i]); } });
  const el = root.querySelector('.bl'); el.dataset.phase = v.phase; el.dataset.mode = v.mode; el.dataset.arena = v.arena;
  renderHud(); renderSide(); renderOverlays(); hudTick();
  if (!raf) raf = requestAnimationFrame(frame);
}

/* ---- olaylar ---- */
function onEvent(e) {
  if (!root || !V) return;
  const t = pnow(), mineHit = i => isMine(i);
  const P = i => (V.players[i] ? V.players[i].name : '?');
  if (e.t === 'round') Sound.special();
  else if (e.t === 'go') { pop('BAŞLA!', 'good'); Sound.stop(); }
  else if (e.t === 'bomb') { if (!mineHit(e.pi)) snd.plop(); }
  else if (e.t === 'nobomb') { if (mineHit(e.pi)) { pending = pending.filter(p => !(p.seat === e.pi && p.x === e.x && p.y === e.y)); } }
  else if (e.t === 'boom') {
    const big = (e.f || []).length > 14 || e.n0 > 1;
    snd.boom(big); if ((e.cr || []).length) snd.crate();
    shake = Math.min(1, shake + (big ? .6 : .35));
    (e.f || []).forEach(([x, y, k]) => { if (k === 'c' || Math.random() < .35) burst(x, y, k === 'c' ? 7 : 2, ['#ffe14a', '#ffb627', '#ff5a1a', '#ffffff'], 4, 'dot', -1); });
    const P0 = PAL[V.arena] || PAL.bahce;
    (e.cr || []).forEach(k => { const x = k % V.W, y = (k - x) / V.W; burst(x, y, 10, [P0.crate, P0.crateT, P0.crateL], 5, 'chip', 9); burst(x, y, 3, ['#d9d4de', '#bdb5c6'], 1.2, 'smoke', -1.5); });
    (e.ib || []).forEach(([x, y]) => { anims.push({ k: 'ring', x, y, col: '#ffffff', start: t, dur: 400, r: .6 }); burst(x, y, 6, ['#ffffff', '#cfc6da'], 2, 'smoke', -1); });
  } else if (e.t === 'die') {
    const col = V.players[e.pi] ? V.players[e.pi].color : '#ffffff';
    anims.push({ k: 'puf', x: e.x, y: e.y, col, start: t, dur: 900 }, { k: 'ghost', x: e.x, y: e.y, col, start: t + 250, dur: 2200 });
    burst(e.x, e.y, 14, ['#ffffff', '#e3dcea', col], 3.5, 'smoke', -1);
    snd.puf();
    if (mineHit(e.pi)) { pop('PUF!', 'bad'); flash('bad'); Sound.bad(); }
    else if (V.mine.includes(e.by)) { pop(`PUF! ${P(e.pi).toLocaleUpperCase('tr-TR')}`, 'good'); Sound.good(); }
    else pop(`PUF! ${P(e.pi).toLocaleUpperCase('tr-TR')}`, 'pink');
    if (e.lost) anims.push({ k: 'text', x: e.x, y: e.y, txt: `-${e.lost} 🪙`, col: '#ffe14a', start: t, dur: 1100, size: .4 });
  } else if (e.t === 'pick') {
    const it = ITEMS[e.k], col = it ? it.col : '#fff';
    if (e.k === 'altin') { snd.coin(); anims.push({ k: 'text', x: e.x, y: e.y, txt: `+${e.v || 1}`, col: '#ffe14a', start: t, dur: 800, size: .42 }); burst(e.x, e.y, 6, ['#ffe14a', '#fff3b0'], 3, 'dot', 2); }
    else {
      burst(e.x, e.y, 10, ['#ffffff', '#fff6b0', col], 3.5, 'dot', 1);
      anims.push({ k: 'ring', x: e.x, y: e.y, col, start: t, dur: 450, r: .7 });
      const txt = e.k === 'kafatasi' ? CURSES[e.c] ? CURSES[e.c].name.toLocaleUpperCase('tr-TR') : 'LANET!' : it.name.toLocaleUpperCase('tr-TR');
      anims.push({ k: 'text', x: e.x, y: e.y, txt, col: e.k === 'kafatasi' ? '#e3b8ff' : '#ffffff', stroke: e.k === 'kafatasi' ? '#3a0a50' : shade(col, -.5), start: t, dur: 1000, size: .36 });
      if (e.k === 'kafatasi') snd.curse(); else Sound.buy();
      if (mineHit(e.pi)) toast(e.k === 'kafatasi' ? `☠️ Lanet: ${CURSES[e.c] ? CURSES[e.c].name : ''}! Birine dokunarak bulaştır.` : `${it.name}: ${it.desc}`, e.k === 'kafatasi' ? 'bad' : 'ok');
    }
  } else if (e.t === 'shield') { const p = posOf(e.pi); anims.push({ k: 'ring', x: p.x, y: p.y, col: '#8cdcff', start: t, dur: 600, r: 1.1 }, { k: 'text', x: p.x, y: p.y, txt: 'KALKAN!', col: '#bfe8ff', stroke: '#1a3a7a', start: t, dur: 1000, size: .38 }); snd.shield(); }
  else if (e.t === 'curse') { snd.curse(); if (mineHit(e.pi)) toast(`☠️ Lanet sana bulaştı: ${CURSES[e.c].name}!`, 'bad'); else if (mineHit(e.from)) toast('Laneti başkasına bulaştırdın!', 'ok'); }
  else if (e.t === 'cure') { if (mineHit(e.pi)) toast('Lanet geçti.', 'ok'); }
  else if (e.t === 'kick') snd.kick();
  else if (e.t === 'throw') snd.toss();
  else if (e.t === 'respawn') { anims.push({ k: 'ring', x: e.x, y: e.y, col: '#fff6b0', start: t, dur: 700, r: 1.2 }); burst(e.x, e.y, 12, ['#fff6b0', '#ffffff', '#ffe14a'], 3, 'dot', 0); if (mineHit(e.pi)) pop('YENİDEN!', 'good'); }
  else if (e.t === 'sudden') { pop('ANİ ÖLÜM!', 'bad'); Sound.bad(); }
  else if (e.t === 'roundEnd') {
    Sound.solve();
    const won = (e.winner >= 0 && mineHit(e.winner)) || (e.team >= 0 && V.mine.some(i => V.players[i].team === e.team));
    pop(won ? 'KAZANDIN!' : e.draw ? 'BERABERE' : 'TUR BİTTİ', won ? 'good' : 'pink');
    if (won) FX.confetti(80);
  }
}

/* ---- giriş ---- */
function onKey(e) {
  if (!V || !root || (e.target && e.target.closest && e.target.closest('input,textarea,select'))) return;
  if (!document.body.dataset.game || document.body.dataset.game !== 'bombalabirent') return;
  const c = e.code;
  const sets = V.mine.length === 1 ? [[KEYSETS[0], 0], [KEYSETS[1], 0]] : V.mine.slice(0, 4).map((s, k) => [KEYSETS[k], k]);
  let used = false;
  for (const [ks, k] of sets) {
    const seat = V.mine[k]; if (seat == null) continue;
    const dirKey = ks.L.includes(c) || ks.R.includes(c) || ks.U.includes(c) || ks.D.includes(c);
    if (dirKey) { used = true; if (e.type === 'keydown') { if (!keys.has(c)) keys.set(c, ++keyOrder); } else keys.delete(c); }
    else if (ks.B.includes(c)) { used = true; if (e.type === 'keydown' && !e.repeat) pressBomb(seat); }
    else if (ks.X.includes(c)) { used = true; if (e.type === 'keydown' && !e.repeat) pressDet(seat); }
  }
  if (used && V.mine.length && V.phase !== 'over') e.preventDefault();
  if (e.type === 'keyup') keys.delete(c);
}
function onBlur() { keys.clear(); touchDir = 0; padPtr = null; if (dpadEl) dpadEl.dataset.d = '0'; }
function padDir(e) {
  const r = dpadEl.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  if (Math.hypot(dx, dy) < r.width * .1) return 0;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : (dy > 0 ? 4 : 3);
}
function onPadDown(e) { e.preventDefault(); Sound.init(); padPtr = e.pointerId; try { dpadEl.setPointerCapture(e.pointerId); } catch { /* */ } touchDir = padDir(e); dpadEl.dataset.d = String(touchDir); }
function onPadMove(e) { if (e.pointerId !== padPtr) return; touchDir = padDir(e); dpadEl.dataset.d = String(touchDir); }
function onPadUp(e) { if (e.pointerId !== padPtr) return; padPtr = null; touchDir = 0; dpadEl.dataset.d = '0'; }

function mount(r, api) {
  root = r; ui = api; uiRef = api; V = null; avs = {}; rp = []; keys = new Map(); parts = []; anims = []; pending = []; seenBombs = new Set(); seenTpv = [];
  seenKey = ''; chipKey = ''; sideKey = ''; mineKey = ''; lastT = 0; bg = null; sprites = null; touchDir = 0; shake = 0; kickAt = {}; bombAt = {}; lavaSnd = {}; landSeen = 0;
  root.innerHTML = `<div class="g-wrap bl">
    <div class="bl-hud"><div class="bl-players"></div><div class="bl-status"></div></div>
    <div class="bl-main">
      <div class="bl-col">
        <div class="bl-bar"><span class="bl-mode"></span><span class="bl-timer">⏱ <b>0:00</b></span><span class="bl-mine"></span></div>
        <div class="bl-stage">
          <canvas class="bl-cv" aria-label="Bomba Labirent arenası"></canvas>
          <div class="bl-pop" aria-live="polite"></div>
          <div class="bl-toast" aria-live="polite"></div>
          <div class="bl-count" hidden></div>
          <div class="bl-end" hidden></div>
        </div>
        <div class="bl-pad" hidden>
          <div class="bl-dpad" data-d="0" aria-label="Yön tuşları"><i class="u"></i><i class="l"></i><i class="r"></i><i class="d"></i><b></b></div>
          <div class="bl-btns"><button type="button" class="bl-det" hidden aria-label="Uzaktan patlat">📡<span>PATLAT</span></button><button type="button" class="bl-bomb" aria-label="Bomba bırak"><em></em><span>BOMBA</span></button></div>
        </div>
      </div>
      <aside class="bl-side g-panel"></aside>
    </div>
  </div>`;
  cv = q('.bl-cv'); cg = cv.getContext('2d'); stageEl = q('.bl-stage'); padEl = q('.bl-pad'); dpadEl = q('.bl-dpad'); bombBtn = q('.bl-bomb'); detBtn = q('.bl-det');
  dpadEl.addEventListener('pointerdown', onPadDown); dpadEl.addEventListener('pointermove', onPadMove);
  dpadEl.addEventListener('pointerup', onPadUp); dpadEl.addEventListener('pointercancel', onPadUp);
  [dpadEl, padEl, stageEl].forEach(el => el.addEventListener('contextmenu', e => e.preventDefault()));
  bombBtn.addEventListener('pointerdown', e => { e.preventDefault(); if (V && V.mine.length) pressBomb(V.mine[0]); });
  detBtn.addEventListener('pointerdown', e => { e.preventDefault(); if (V && V.mine.length) pressDet(V.mine[0]); });
  if (window.ResizeObserver) { ro = new ResizeObserver(() => resize()); ro.observe(stageEl); }
  addEventListener('resize', resize);
  document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKey); addEventListener('blur', onBlur);
  hudT = setInterval(hudTick, 200);
}
function unmount() {
  removeEventListener('resize', resize); removeEventListener('blur', onBlur);
  document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKey);
  if (ro) { ro.disconnect(); ro = null; }
  clearInterval(hudT); clearTimeout(popT); clearTimeout(toastT); if (raf) cancelAnimationFrame(raf);
  raf = 0; root = null; ui = null; uiRef = null; V = null; cv = null; cg = null; stageEl = null; padEl = null; dpadEl = null; bombBtn = null; detBtn = null; avs = {}; rp = []; bg = null; sprites = null;
}

CFX.registerGame(Object.assign({
  id: 'bombalabirent', name: 'Bomba Labirent', icon: '🧨', color: '#ff7a1a', min: 2, max: 8, hotseat: true, bot: true, localMin: 1,
  tagline: 'Bombanı bırak, kaç, labirentte son sen kal!',
  rules: 'Izgara arenada bomba bırak: 2,5 saniye sonra artı şeklinde patlar, sandıkları kırar ve zincirleme patlamalar yaratır. Sandıklardan Bomba+, Alev+, Hız, Tekme, Eldiven, Kalkan, Uzaktan Kumanda ve lanetli Kafatası çıkar. Klasik ve Takım\'da son ayakta kalan turu alır (süre bitince arena daralır); Altın Avı\'nda en çok altını toplayan kazanır. Tek cihazda iki kişi aynı klavyeyle oynayabilir.',
  options: [
    { key: 'mod', label: 'Mod', def: 'klasik', choices: [{ v: 'klasik', label: '💣 Klasik' }, { v: 'takim', label: '🤝 Takım' }, { v: 'altin', label: '🪙 Altın Avı' }] },
    { key: 'harita', label: 'Arena', def: 'bahce', choices: [{ v: 'bahce', label: '🌷 Bahçe' }, { v: 'buz', label: '❄️ Buz' }, { v: 'lav', label: '🌋 Lav' }, { v: 'fabrika', label: '🏭 Fabrika' }, { v: 'rastgele', label: '🎲 Rastgele' }] },
    { key: 'tur', label: 'Tur (Klasik/Takım)', def: '3', choices: [{ v: '1', label: 'Tek tur' }, { v: '3', label: '3\'te 2' }, { v: '5', label: '5\'te 3' }] },
    { key: 'sure', label: 'Süre', def: '120', choices: [{ v: '60', label: '60 sn' }, { v: '90', label: '90 sn' }, { v: '120', label: '2 dk' }, { v: '180', label: '3 dk' }] },
    { key: 'zeka', label: 'Bilgisayar', def: 'normal', choices: [{ v: 'kolay', label: 'Kolay' }, { v: 'normal', label: 'Normal' }, { v: 'zor', label: 'Zor' }] }
  ],
  mount, render, onEvent, onFast, unmount,
  // testler için dışa açık yardımcılar
  _bl: { RULES, genArena, spiralOf, mkWorld, tryMove, stepBody, flameSet, dangerMap, lethal, detonate, placeBomb, kickBomb, throwBomb, remoteDet, hurt, applyItem, endRound, startRound, stepSlides, stepFlights,
    botDecide, bfsBot, searchT, playTick, tick, applyPos, worldOfState, speedOf, dims, spawnList, nextErupt, lavaOn, FUSE, FLAME, SHRINK_IV, SHRINK_LEAD, LAVA_P, LAVA_BURN, LAVA_LEAD, SKILL,
    avs: () => avs, rp: () => rp, pending: () => pending, keys: () => keys, ts: () => ts, toClient: (x, y) => { if (!cv) return null; const r = cv.getBoundingClientRect(); return [r.left + sx_(x), r.top + sy_(y)]; }, frames: () => frameN }
}, RULES));
})();
