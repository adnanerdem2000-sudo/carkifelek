/* =========================================================================
   DÜŞEN ZEMİN — gerçek zamanlı "son kalan kazanır" altıgen kat oyunu
     · Üst üste 3 kat altıgen karo. Bastığın karo yanar ve kısa süre sonra
       düşer; düşen karonun yerinden alt kata düşersin, en alt kattan düşen
       elenir. Son ayakta kalan turu kazanır.
     · Modlar: Klasik Altıgen · Renk Çılgınlığı · Dönen Kollar
     · Her cihaz kendi karakterini simüle eder ve konumunu hızlı kanaldan
       (ui.fast, ~10/sn) yayar. Yöneten cihaz (yerel ya da oda kurucusu)
       karo durumundan (hangi karo ne zaman düşer — mutlak saatle), elemeden
       ve sıralamadan sorumludur; bildirilen konumları hız sınırı ve "altında
       karo var mı" denetimiyle doğrular. Karo değişiklikleri olay listesi
       olarak (hızlı kanal) ve saniyede bir sıkıştırılmış tam liste olarak
       (görüntü) gider; tüm tahta 10/sn gönderilmez.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, flash, initial } = window.CFX;

/* ------------------------------------------------------------------ sabitler ve yardımcılar */
const TAU = Math.PI * 2, SQ3 = Math.sqrt(3);
const S = 46, RIN = S * SQ3 / 2, HWD = S * SQ3;       // altıgen dış yarıçapı, iç yarıçapı, merkezler arası
const PR = 15, FOOT = 6;                              // karakter yarıçapı, ayak payı (kenarda durabilme)
const BASE = 250, BOT_K = .9, AIR_K = 1.08, KNOCK_DECAY = 3.2;
const JUMP_MS = 520, SJUMP_MS = 820, JH = 34, SJH = 60;
const GZ = 4.4, VZ_MAX = 6;                           // kat/sn² düşme ivmesi
const GRACE = 260, STALE_MS = 2000, TICK = 100;
const COUNT_MS = 3600, END_MS = 6500, FALL_ANIM = 650;
const HAF_DELAY = 1700, ZIP_MS = 9000, HAF_MS = 8000, KAL_MS = 10000;
const PIL_R = 30, BUMP_R = 21, BUMP_K = 430, ARM_W = 16;
const PTS = [10, 7, 5, 4, 3, 2, 1, 0];
const START_GRACE = 900;
const MAXV = 1100;               // kol / tampon itkisiyle ulaşılabilen en yüksek hız (ışınlanmayı yine engeller)
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pickR = arr => arr[Math.floor(Math.random() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const optNum = (v, allowed, def) => { const n = parseInt(v, 10); return allowed.includes(n) ? n : def; };
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const mixCache = new Map();
function mix(a, b, t) {
  t = Math.round(clamp(t, 0, 1) * 40) / 40;
  const key = a + b + t; let v = mixCache.get(key); if (v) return v;
  const x = hex2rgb(a), y = hex2rgb(b); v = rgb2hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
  if (mixCache.size > 4000) mixCache.clear();
  mixCache.set(key, v); return v;
}
const shade = (h, t) => (t < 0 ? mix(h, '#140a1e', -t) : mix(h, '#ffffff', t));

const MODES = {
  klasik: { name: 'Klasik Altıgen', short: 'Klasik', icon: '🔷', NF: 3, RAD: 7, delay: 650 },
  renk: { name: 'Renk Çılgınlığı', short: 'Renk', icon: '🎨', NF: 3, RAD: 6, delay: 1000 },
  sumo: { name: 'Dönen Kollar', short: 'Kollar', icon: '🌀', NF: 3, RAD: 7, delay: 750 }
};
const ITEMS = {
  zip: { name: 'Süper Zıplama', short: 'Zıplama', col: '#6dff8a', desc: '9 sn çok yükseğe ve uzağa zıplarsın' },
  haf: { name: 'Hafif Adım', short: 'Hafif', col: '#9fe8ff', desc: '8 sn bastığın karolar çok daha geç düşer' },
  kal: { name: 'Kalkan', short: 'Kalkan', col: '#ffd34d', desc: '10 sn tampon, kol ve itişmeler seni fırlatamaz' }
};
const ITEM_IDS = Object.keys(ITEMS);
const COLS = ['#ff4f6d', '#4f8cff', '#ffd84a', '#3ddc84'];
const COL_NAMES = ['KIRMIZI', 'MAVİ', 'SARI', 'YEŞİL'];
const FLOOR_COL = ['#36e0d0', '#ff5fb0', '#ffc93d', '#9d86ff'];

/* ------------------------------------------------------------------ altıgen geometri */
const geoCache = {};
function geom(RAD) {
  if (geoCache[RAD]) return geoCache[RAD];
  const cells = [], key = new Map();
  for (let r = -RAD; r <= RAD; r++) for (let q = -RAD; q <= RAD; q++) {
    const s = -q - r; if (Math.abs(s) > RAD) continue;
    key.set(q + ',' + r, cells.length);
    cells.push({ q, r, x: S * SQ3 * (q + r / 2), y: S * 1.5 * r, ring: Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) });
  }
  const nb = cells.map(c => DIRS.map(([dq, dr]) => key.get((c.q + dq) + ',' + (c.r + dr))).filter(k => k !== undefined));
  const hd = (a, b) => Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs((-a.q - a.r) - (-b.q - b.r)));
  const nb2 = cells.map(c => cells.map((d, k) => (hd(c, d) === 2 ? k : -1)).filter(k => k >= 0));
  return (geoCache[RAD] = { RAD, cells, key, nb, nb2, hd, NT: cells.length, LIM: 1.5 * S * RAD + .5 * S });
}
function axialRound(x, y) {
  const qf = (SQ3 / 3 * x - y / 3) / S, rf = (2 / 3 * y) / S, sf = -qf - rf;
  let q = Math.round(qf), r = Math.round(rf); const s = Math.round(sf);
  const dq = Math.abs(q - qf), dr = Math.abs(r - rf), ds = Math.abs(s - sf);
  if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s;
  return [q, r];
}
function cellAt(G, x, y) { const [q, r] = axialRound(x, y); const k = G.key.get(q + ',' + r); return k === undefined ? -1 : k; }
function nearestCell(G, x, y) { let b = 0, bd = 1e18; G.cells.forEach((c, k) => { const d = (c.x - x) ** 2 + (c.y - y) ** 2; if (d < bd) { bd = d; b = k; } }); return b; }
function insideHex(dx, dy, rin) { const ax = Math.abs(dx), ay = Math.abs(dy); return ax <= rin && ax * .5 + ay * SQ3 / 2 <= rin; }
const RIM_N = [[Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)], [0, 1], [Math.cos(5 * Math.PI / 6), Math.sin(5 * Math.PI / 6)]];
function rimClamp(G, b) {
  const L = G.LIM;
  for (const [nx, ny] of RIM_N) {
    const d = b.x * nx + b.y * ny;
    if (Math.abs(d) <= L) continue;
    const s = Math.sign(d), over = d - s * L;
    b.x -= over * nx; b.y -= over * ny;
    const vn = (b.vx || 0) * nx + (b.vy || 0) * ny; if (vn * s > 0) { b.vx -= vn * nx; b.vy -= vn * ny; }
    const kn = (b.kx || 0) * nx + (b.ky || 0) * ny; if (kn * s > 0) { b.kx -= 1.6 * kn * nx; b.ky -= 1.6 * kn * ny; }
  }
}

/* ------------------------------------------------------------------ arena (mod + tohum → her cihazda aynı) */
const arenaCache = {};
function arena(mode, seed) {
  const id = mode + ':' + seed; if (arenaCache[id]) return arenaCache[id];
  const M = MODES[mode] || MODES.klasik, G = geom(M.RAD), NF = M.NF, NT = G.NT, rr = mulberry(seed);
  const A = { mode, NF, G, NT, delay: M.delay, col: null, block: new Uint8Array(NF * NT), blocks: [], arms: null };
  if (mode === 'renk') {
    A.col = new Uint8Array(NF * NT);
    for (let f = 0; f < NF; f++) {
      const n = 10 + f * 2, cs = [];
      for (let i = 0; i < n; i++) cs.push({ x: (rr() * 2 - 1) * G.LIM, y: (rr() * 2 - 1) * G.LIM, c: i % 4 });
      G.cells.forEach((c, k) => { let b = 0, bd = 1e18; cs.forEach((s, i) => { const d = (c.x - s.x) ** 2 + (c.y - s.y) ** 2; if (d < bd) { bd = d; b = i; } }); A.col[f * NT + k] = cs[b].c; });
    }
  }
  if (mode === 'sumo') {
    A.arms = [];
    const k0 = G.key.get('0,0');
    for (let f = 0; f < NF; f++) {
      A.block[f * NT + k0] = 1; A.blocks.push({ f, k: k0, x: 0, y: 0, r: PIL_R, pil: true });
      const cand = G.cells.map((c, k) => k).filter(k => G.cells[k].ring >= 2 && G.cells[k].ring <= G.RAD - 2);
      const got = [];
      for (let t = 0; t < 300 && got.length < 3; t++) { const k = cand[Math.floor(rr() * cand.length)]; if (got.some(j => G.hd(G.cells[j], G.cells[k]) < 3)) continue; got.push(k); }
      got.forEach(k => { A.block[f * NT + k] = 1; A.blocks.push({ f, k, x: G.cells[k].x, y: G.cells[k].y, r: BUMP_R, pil: false }); });
      A.arms.push({ n: f === 0 ? 1 : 2, w: (f % 2 ? -1 : 1) * (.85 + f * .18), a0: rr() * TAU });
    }
  }
  return (arenaCache[id] = A);
}

/* ------------------------------------------------------------------ zemin desteği (her iki tarafta aynı) */
function callGone(calls, c, T) { if (!calls) return false; for (const x of calls) if (x.c === c && T >= x.at && T < x.until) return true; return false; }
function callWarn(calls, c, T) { if (!calls) return false; for (const x of calls) if (x.c === c && T >= x.w && T < x.at) return true; return false; }
function tileSolid(A, F, calls, idx, T) {
  const fa = F[idx]; if (fa && T >= fa) return false;
  if (A.col && calls && calls.length && callGone(calls, A.col[idx], T)) return false;
  return true;
}
// (x,y) noktasını taşıyan karo (önce bulunduğu hücre, sonra ayak payıyla komşular); yoksa -1
function supportCell(A, F, calls, f, x, y, T, extra) {
  if (f < 0 || f >= A.NF) return -1;
  const G = A.G, base = f * A.NT, [q, r] = axialRound(x, y);
  const k0 = G.key.get(q + ',' + r);
  if (k0 !== undefined && tileSolid(A, F, calls, base + k0, T)) return k0;
  for (const [dq, dr] of DIRS) {
    const k = G.key.get((q + dq) + ',' + (r + dr)); if (k === undefined) continue;
    const c = G.cells[k];
    if (insideHex(x - c.x, y - c.y, RIN + FOOT + (extra || 0)) && tileSolid(A, F, calls, base + k, T)) return k;
  }
  return -1;
}
function hopH(b) { return b.air > 0 ? Math.sin(Math.PI * clamp(1 - b.air / b.airMax, 0, 1)) * (b.airMax > 600 ? SJH : JH) : 0; }
function armAngle(arm, T, t0) { return arm.a0 + arm.w * (T - t0) / 1000; }
function armPush(A, b, env) {
  const arm = A.arms[b.f]; if (!arm) return;
  const th = armAngle(arm, env.T, env.t0), L = A.G.LIM + 8, side = Math.sign(arm.w), m = PR + ARM_W / 2;
  for (let i = 0; i < arm.n; i++) {
    const a = th + i * TAU / arm.n, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    const al = b.x * ux + b.y * uy; if (al < PIL_R - 6 || al > L + PR) continue;
    const pd = b.x * nx + b.y * ny; if (Math.abs(pd) >= m) continue;
    const sd = pd === 0 ? side : Math.sign(pd);
    b.x += nx * (sd * m - pd); b.y += ny * (sd * m - pd);
    if (sd === side) {   // kolun önündeyiz: süpürülüyoruz
      const sp = Math.abs(arm.w) * al, vn = (b.vx * nx + b.vy * ny) * side;
      if (vn < sp) { b.vx += nx * side * (sp - vn); b.vy += ny * side * (sp - vn); }
      if (!env.kal) { const kk = sp * .9 + 170; b.kx = nx * side * kk + ux * 70; b.ky = ny * side * kk + uy * 70; if (env.onBump) env.onBump(null); }
    }
  }
}
// Ortak hareket adımı: yerel oyuncu ve botlar (girdi, itki, engeller, kenar korkuluğu)
function phys(A, b, ix, iy, dt, env) {
  const air = b.air > 0, tr = air ? 3.5 : 13, k = 1 - Math.exp(-tr * dt), spd = env.spd * (air ? AIR_K : 1);
  b.vx += (ix * spd - b.vx) * k; b.vy += (iy * spd - b.vy) * k;
  const kd = Math.exp(-KNOCK_DECAY * dt); b.kx *= kd; b.ky *= kd;
  b.x += (b.vx + b.kx) * dt; b.y += (b.vy + b.ky) * dt;
  const h = hopH(b);
  for (const o of A.blocks) {
    if (o.f !== b.f || (!o.pil && h > 22)) continue;
    const bi = o.f * A.NT + o.k; if (env.F && env.F[bi] && env.T >= env.F[bi]) continue;
    const dx = b.x - o.x, dy = b.y - o.y, d = Math.hypot(dx, dy), m = o.r + PR; if (d >= m) continue;
    const nx = d > 1e-6 ? dx / d : 1, ny = d > 1e-6 ? dy / d : 0;
    b.x = o.x + nx * m; b.y = o.y + ny * m;
    const vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= vn * nx; b.vy -= vn * ny; }
    if (!o.pil && !env.kal) { b.kx = nx * BUMP_K; b.ky = ny * BUMP_K; if (env.onBump) env.onBump(o); }
  }
  if (A.arms && h < 14) armPush(A, b, env);
  if (!env.kal && env.others) for (const o of env.others) {
    const dx = b.x - o.x, dy = b.y - o.y, d = Math.hypot(dx, dy); if (d >= 2 * PR || d < .01) continue;
    const p = (2 * PR - d) * .5; b.x += dx / d * p; b.y += dy / d * p;
  }
  rimClamp(A.G, b);
}

/* ------------------------------------------------------------------ KURALLAR (yöneten cihaz) */
let uiRef = null;
function fastOut(o) { if (uiRef && uiRef.fast && uiRef.mode === 'online') { try { uiRef.fast(o); } catch { /* */ } } }
const pname = (st, i) => (st.players[i] ? st.players[i].name : '?');
const arenaOf = st => arena(st.mode, st.seed);
const aliveList = st => st.players.map((_, i) => i).filter(i => !st.out[i]);
function setPhase(st, ph, ms) { st.phase = ph; st.endsAt = Date.now() + ms; st.phaseDur = Math.max(1, ms); }
const alignT = (st, T) => st.t0 + Math.ceil((T - st.t0) / 10) * 10;
function encTiles(st) {
  let s = ''; const F = st.fall;
  for (let i = 0; i < F.length; i++) if (F[i]) s += i.toString(36).padStart(2, '0') + Math.max(0, Math.round((F[i] - st.t0) / 10)).toString(36).padStart(4, '0');
  return s;
}
function decTiles(s, cb) { if (typeof s !== 'string') return; for (let i = 0; i + 6 <= s.length; i += 6) cb(parseInt(s.slice(i, i + 2), 36), parseInt(s.slice(i + 2, i + 6), 36) * 10); }

function newBot(x, y) { return { x, y, vx: 0, vy: 0, kx: 0, ky: 0, air: 0, airMax: JUMP_MS, f: 0, z: 0, fall: -1, vz: 0, tgt: -1, jump: false, drop: false, re: 0, sk: rnd(.55, .95), wob: 0, jcd: 0 }; }
function spawnCells(A, n) {
  const G = A.G, used = new Set(), out = [], off = Math.random() * TAU, R0 = G.LIM * .52;
  for (let i = 0; i < n; i++) {
    const a = off + i / n * TAU, tx = Math.cos(a) * R0, ty = Math.sin(a) * R0;
    let best = -1, bd = 1e18;
    G.cells.forEach((c, k) => { if (used.has(k) || A.block[k] || c.ring < 1) return; const d = (c.x - tx) ** 2 + (c.y - ty) ** 2; if (d < bd) { bd = d; best = k; } });
    used.add(best); out.push(best);
  }
  return out;
}
function newRound(st, ctx) {
  st.round++;
  st.seed = (Math.random() * 1e9) | 0;
  const A = arenaOf(st), n = st.players.length, now = Date.now();
  st.fall = Array(A.NF * A.NT).fill(0); st.pend = [];
  st.fl = Array(n).fill(0); st.out = Array(n).fill(false); st.outAt = Array(n).fill(0); st.place = Array(n).fill(0);
  st.group = []; st.lastElimAt = 0; st.last3 = false; st.last2 = false; st.startN = n;
  st.fx = st.players.map(() => ({ zip: 0, haf: 0, kal: 0 }));
  st.items = []; st.calls = []; st.nextCallAt = 0; st.callN = 0; st.lastCol = -1; st.sudden = false; st.ring = A.G.RAD; st.nextRingAt = 0; st.last = null;
  const sp = spawnCells(A, n), G = A.G;
  st.pos = sp.map(k => ({ x: G.cells[k].x, y: G.cells[k].y, f: 0, t: now, j: 0, d: 0, as: 0, ds: 0 }));
  st.bot = {}; st.players.forEach((p, i) => { if (p.isBot) st.bot[i] = newBot(st.pos[i].x, st.pos[i].y); });
  st.t0 = now; st.spawnVer++;
  setPhase(st, 'count', COUNT_MS);
  ctx.emit({ t: 'round', round: st.round }, `Tur ${st.round}/${st.rounds} · ${MODES[st.mode].name} · ${n} oyuncu`, 'gold');
  ctx.sync();
}
function startPlay(st, ctx) {
  const now = Date.now();
  setPhase(st, 'play', st.dur * 1000); st.playAt = now;
  st.nextItemAt = now + rnd(3000, 5000); st.nextCallAt = now + 3000;
  st.pos.forEach(p => { p.t = now; });
  ctx.emit({ t: 'go' }, 'BAŞLA! Durma, karolar düşüyor!');
}
// Karoyu tetikle: düşme anı mutlak saatle (tur başına göre 10 ms adımlı) saklanır
function trig(st, A, idx, pi, now) {
  if (st.fall[idx] || A.block[idx]) return false;
  const d = pi >= 0 && st.fx[pi] && st.fx[pi].haf > now ? HAF_DELAY : A.delay;
  const fa = alignT(st, Math.max(now, st.playAt + START_GRACE) + d);   // başlangıçta kısa bir nefes payı
  st.fall[idx] = fa; st.pend.push(idx);
  uiTile(st.spawnVer, idx, fa);
  return true;
}
function eliminate(st, pi, now, ctx) {
  if (st.out[pi]) return;
  const A = arenaOf(st), before = aliveList(st).length;
  st.out[pi] = true; st.outAt[pi] = now; st.fl[pi] = A.NF;
  if (now - st.lastElimAt < 150 && st.group.length) { st.group.push(pi); st.group.forEach(j => { st.place[j] = before; }); }
  else { st.group = [pi]; st.place[pi] = before; }
  st.lastElimAt = now;
  const p = st.pos[pi]; if (p) { p.f = A.NF; p.d = 1; }
  ctx.emit({ t: 'elim', pi, place: before }, `💥 ${pname(st, pi)} elendi — ${before}. sıra`, 'bad');
  const al = aliveList(st).length;
  if (al === 3 && st.startN >= 4 && !st.last3) { st.last3 = true; ctx.emit({ t: 'last', n: 3 }, '🔥 SON 3 OYUNCU!', 'gold'); }
  else if (al === 2 && st.startN >= 3 && !st.last2) { st.last2 = true; ctx.emit({ t: 'last', n: 2 }, '⚔️ SON 2! Kim dayanacak?', 'gold'); }
  st.dirty = true;
}
function setFloor(st, A, pi, f, now, ctx, forced) {
  if (st.out[pi]) return;
  if (f >= A.NF) { eliminate(st, pi, now, ctx); return; }
  if (f <= st.fl[pi]) return;
  st.fl[pi] = f;
  if (st.pos[pi]) st.pos[pi].f = Math.max(st.pos[pi].f || 0, f);
  ctx.emit({ t: 'floor', pi, f, forced: !!forced }, `⬇️ ${pname(st, pi)} ${f + 1}. kata düştü`);
  st.dirty = true;
}
// Kesin sağlam: hücrenin merkez bölgesinde hiç tetiklenmemiş karo
function solidSure(st, A, g, x, y, now) {
  const k = cellAt(A.G, x, y); if (k < 0) return false;
  const c = A.G.cells[k], idx = g * A.NT + k;
  if (!insideHex(x - c.x, y - c.y, RIN - 10) || st.fall[idx] || A.block[idx]) return false;
  if (A.col && (callGone(st.calls, A.col[idx], now) || callGone(st.calls, A.col[idx], now + 300))) return false;
  return true;
}
// İstemcinin "düştüm" bildirimi: kat yalnızca artabilir; arada kesin sağlam karo varsa orada durdurulur
function claimFall(st, A, pi, f, x, y, now, ctx) {
  if (st.out[pi] || st.phase !== 'play') return;
  f = Math.trunc(f); if (!Number.isFinite(f) || f <= st.fl[pi]) return;
  f = Math.min(f, A.NF);
  let forced = false; dzStats.claims++;
  if (Number.isFinite(x) && Number.isFinite(y)) for (let g = st.fl[pi] + 1; g < f; g++) if (solidSure(st, A, g, x, y, now)) { f = g; forced = true; dzStats.clamped++; break; }
  setFloor(st, A, pi, f, now, ctx, forced);
}
// Yöneten cihazın düşürmesi: altında karo kalmamış (gecikme toleransı aşılmış) oyuncu
const dzStats = { forced: 0, stale: 0, claims: 0, clamped: 0, corrections: 0 };
function forceFall(st, A, pi, now, ctx) {
  const p = st.pos[pi]; dzStats.forced++;
  for (let g = st.fl[pi] + 1; g < A.NF; g++) if (supportCell(A, st.fall, st.calls, g, p.x, p.y, now) >= 0) { setFloor(st, A, pi, g, now, ctx, true); p.f = g; p.d = 0; return; }
  eliminate(st, pi, now, ctx);
}
// Hızlı kanaldan gelen konum: hız sınırı, kat tekdüzeliği, karo tetikleme ve destek denetimi
function applyPos(st, pi, m, now, ctx) {
  if (st.phase !== 'play' || !st.players[pi] || st.players[pi].isBot || st.out[pi] || !m) return false;
  const x = +m.x, y = +m.y, f = Math.trunc(+m.f);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(f)) return false;
  const A = arenaOf(st), G = A.G, p = st.pos[pi];
  if (f > st.fl[pi]) claimFall(st, A, pi, f, x, y, now, ctx);
  if (st.out[pi]) return true;
  const dtt = clamp((now - p.t) / 1000, 0, 1.5), maxd = MAXV * dtt * 1.3 + 50, d = dist(x, y, p.x, p.y);
  const b = { x, y, vx: 0, vy: 0, kx: 0, ky: 0 };
  if (d > maxd) { const k = maxd / d; b.x = p.x + (x - p.x) * k; b.y = p.y + (y - p.y) * k; }
  rimClamp(G, b);
  const stale = f < st.fl[pi];
  p.x = Math.round(b.x * 10) / 10; p.y = Math.round(b.y * 10) / 10; p.t = now;
  const jj = m.j ? 1 : 0, dd = m.d ? 1 : 0;
  p.as = jj ? (p.j ? p.as : now) : 0; p.ds = dd ? (p.d ? p.ds : now) : 0; p.j = jj; p.d = dd;
  if (!stale) p.f = Math.max(f, st.fl[pi]);
  const air = jj && now - p.as < SJUMP_MS + 450, falling = dd && now - p.ds < 2500;
  if (stale || air || falling) return true;
  p.f = st.fl[pi];
  const F = st.fl[pi], base = F * A.NT;
  if (Array.isArray(m.s)) for (const idx of m.s.slice(0, 16)) {
    if (!Number.isInteger(idx) || idx < base || idx >= base + A.NT) continue;
    const c = G.cells[idx - base]; if (dist(c.x, c.y, p.x, p.y) > HWD * 1.6) continue;
    if (tileSolid(A, st.fall, st.calls, idx, now)) trig(st, A, idx, pi, now);
  }
  const k = supportCell(A, st.fall, st.calls, F, p.x, p.y, now);
  if (k >= 0) trig(st, A, base + k, pi, now);
  if (supportCell(A, st.fall, st.calls, F, p.x, p.y, now - GRACE, 4) < 0) forceFall(st, A, pi, now, ctx);   // +4: yuvarlanmış konum payı
  return true;
}
function hostPosIn(seat, m, cid) {
  const R0 = window.CFX && window.CFX.Room, g = R0 && R0.game;
  if (!g || !g.state || g.def.id !== 'dusenzemin' || !R0.isRunner() || g.result) return;
  if (cid !== undefined && (!g.players[seat] || g.players[seat].cid !== cid)) return;
  try { applyPos(g.state, seat, m, Date.now(), R0.ctx()); } catch (e) { console.error(e); }
}
// Ses gelmeyen (kopmuş ya da sekmesi arka planda) oyuncu yerinde duruyor kabul edilir
function humansTick(st, A, now, ctx) {
  st.players.forEach((pl, pi) => {
    if (pl.isBot || st.out[pi]) return;
    const p = st.pos[pi]; if (now - p.t < STALE_MS) return;
    p.j = 0; p.d = 0; dzStats.stale++;
    const f = st.fl[pi], k = supportCell(A, st.fall, st.calls, f, p.x, p.y, now);
    if (k >= 0) trig(st, A, f * A.NT + k, pi, now);
    else if (supportCell(A, st.fall, st.calls, f, p.x, p.y, now - GRACE, 4) < 0) forceFall(st, A, pi, now, ctx);
  });
}
function freshTile(st, A, f, k, T) {
  const idx = f * A.NT + k;
  if (A.block[idx] || st.fall[idx]) return false;
  if (A.col) for (const c of st.calls) if (c.c === A.col[idx] && T >= c.w - 50 && T < c.until + 200) return false;
  return true;
}
function itemsTick(st, A, now, ctx) {
  const G = A.G;
  for (let i = st.items.length - 1; i >= 0; i--) { const it = st.items[i], k = cellAt(G, it.x, it.y); if (k < 0 || !tileSolid(A, st.fall, st.calls, it.f * A.NT + k, now)) { st.items.splice(i, 1); st.dirty = true; } }
  if (now >= st.nextItemAt) {
    st.nextItemAt = now + rnd(4500, 7500);
    if (st.items.length < 2 + Math.ceil(st.players.length / 3)) {
      const floors = [...new Set(aliveList(st).map(i => st.fl[i]).filter(f => f < A.NF))];
      if (floors.length) {
        const f = pickR(floors);
        for (let t = 0; t < 40; t++) {
          const k = Math.floor(Math.random() * A.NT), c = G.cells[k];
          if (!freshTile(st, A, f, k, now) || c.ring > G.RAD - 1) continue;
          if (st.pos.some((p, j) => !st.out[j] && st.fl[j] === f && dist(p.x, p.y, c.x, c.y) < 120) || st.items.some(o => o.f === f && dist(o.x, o.y, c.x, c.y) < 200)) continue;
          st.items.push({ id: ++st.idc, k: pickR(ITEM_IDS), f, x: Math.round(c.x), y: Math.round(c.y) }); st.dirty = true; break;
        }
      }
    }
  }
  for (let i = st.items.length - 1; i >= 0; i--) {
    const it = st.items[i];
    for (const pi of aliveList(st)) {
      const p = st.pos[pi]; if (st.fl[pi] !== it.f || p.d) continue;
      if (dist(p.x, p.y, it.x, it.y) > PR + 20) continue;
      const fx = st.fx[pi], dur = it.k === 'zip' ? ZIP_MS : it.k === 'haf' ? HAF_MS : KAL_MS;
      fx[it.k] = now + dur;
      st.items.splice(i, 1); st.dirty = true;
      ctx.emit({ t: 'pick', pi, k: it.k, x: it.x, y: it.y, f: it.f }, `✨ ${pname(st, pi)}: ${ITEMS[it.k].name}!`);
      break;
    }
  }
}
// Renk Çılgınlığı: bir renk anons edilir, uyarıdan sonra o renkteki karolar bir süre yok olur
function callsTick(st, A, now, ctx) {
  if (now < st.nextCallAt) return;
  const floors = new Set(aliveList(st).map(i => st.fl[i]));
  const cnt = [0, 0, 0, 0];
  for (const f of floors) { if (f >= A.NF) continue; for (let k = 0; k < A.NT; k++) { const idx = f * A.NT + k; if (!st.fall[idx]) cnt[A.col[idx]]++; } }
  let pool = [0, 1, 2, 3].filter(c => cnt[c] > 0 && c !== st.lastCol); if (!pool.length) pool = [0, 1, 2, 3].filter(c => c !== st.lastCol);
  const c = pickR(pool), n = st.callN++;
  const warn = Math.max(1500, 2600 - n * 90), gone = Math.min(3200, 2000 + n * 80);
  st.calls.push({ c, w: now, at: now + warn, until: now + warn + gone });
  if (st.calls.length > 4) st.calls.shift();
  st.lastCol = c;
  st.nextCallAt = now + warn + gone + Math.max(1200, 3400 - n * 130);
  ctx.emit({ t: 'call', c, at: now + warn }, `🎨 ${COL_NAMES[c]} karolar düşecek!`);
  st.dirty = true;
}
// Süre bitince ani ölüm: kenardan merkeze halka halka çöküş (tüm katlarda)
function suddenTick(st, A, now, ctx) {
  if (!st.sudden && now >= st.endsAt) {
    st.sudden = true; st.nextRingAt = now;
    ctx.emit({ t: 'sudden' }, '⏰ Süre doldu: ANİ ÖLÜM! Zemin kenardan çöküyor.', 'bad'); st.dirty = true;
  }
  if (!st.sudden || now < st.nextRingAt || st.ring < 0) return;
  const G = A.G;
  for (let f = 0; f < A.NF; f++) G.cells.forEach((c, k) => {
    if (c.ring !== st.ring) return;
    const idx = f * A.NT + k; if (st.fall[idx]) return;
    const a = Math.atan2(c.y, c.x);
    st.fall[idx] = alignT(st, now + 700 + ((a + Math.PI) / TAU) * 500); st.pend.push(idx); uiTile(st.spawnVer, idx, st.fall[idx]);
  });
  st.ring--; st.nextRingAt = now + 1800;
}

/* ---- botlar ---- */
function freshComps(st, A, f, T) {
  const G = A.G, comp = new Int16Array(A.NT).fill(-1), sizes = [];
  for (let k = 0; k < A.NT; k++) {
    if (comp[k] >= 0 || !freshTile(st, A, f, k, T)) continue;
    const id = sizes.length, qu = [k]; comp[k] = id; let n = 0;
    while (qu.length) { const c = qu.pop(); n++; for (const nb of G.nb[c]) if (comp[nb] < 0 && freshTile(st, A, f, nb, T)) { comp[nb] = id; qu.push(nb); } }
    sizes.push(n);
  }
  return { comp, sizes };
}
// Bot planı: zamana duyarlı BFS ile (varana kadar düşmeyecek karolardan geçerek) en ferah taze bölgeye yürü;
// alan daralınca boşluğun üstünden zıpla ya da alt kat daha iyiyse bilerek düş.
function botPlan(st, A, pi, b, T) {
  const G = A.G, f = b.f, NT = A.NT, base = f * NT;
  let cur = cellAt(G, b.x, b.y); if (cur < 0) cur = nearestCell(G, b.x, b.y);
  const others = aliveList(st).filter(j => j !== pi && st.fl[j] === f).map(j => st.pos[j]);
  const crowd = k => { let c = 0; const cc = G.cells[k]; for (const o of others) { const d = dist(cc.x, cc.y, o.x, o.y); if (d < 160) c += (160 - d) / 160; } return c; };
  const items = st.items.filter(it => it.f === f);
  const noise = 4 - 3.4 * b.sk, stepT = HWD / (BASE * BOT_K) * 1000;
  const FC = freshComps(st, A, f, T);
  const passable = (k, depth) => {
    const idx = base + k; if (A.block[idx]) return false;
    const fa = st.fall[idx]; if (fa && fa < T + (depth + .5) * stepT + 60) return false;
    if (A.col) for (const c of st.calls) if (c.c === A.col[idx] && T + depth * stepT + 200 >= c.at && T + depth * stepT < c.until + 150) return false;
    return true;
  };
  const dep = new Int8Array(NT).fill(-1), par = new Int16Array(NT).fill(-1), qu = [cur]; dep[cur] = 0;
  let best = -1, bv = -1e9;
  for (let h = 0; h < qu.length; h++) {
    const c = qu[h], d = dep[c];
    if (d >= 1 && FC.comp[c] >= 0) {
      const cc = G.cells[c];
      let v = Math.min(FC.sizes[FC.comp[c]], 45) + .4 * G.nb[c].filter(m => FC.comp[m] >= 0).length - d * 2.2 - 3 * crowd(c) - cc.ring * .12 + Math.random() * noise;
      for (const it of items) if (dist(cc.x, cc.y, it.x, it.y) < 60 && d <= 4) v += 6 - d;
      if (d === 1 && par[c] === cur && b.tgt === c) v += 1.5;
      if (v > bv) { bv = v; best = c; }
    }
    if (d >= 7) continue;
    for (const n of G.nb[c]) if (dep[n] < 0 && passable(n, d + 1)) { dep[n] = d + 1; par[n] = c; qu.push(n); }
  }
  let jump = false, drop = false, tgt = -1;
  if (best >= 0) { let c = best; while (par[c] !== cur && par[c] >= 0) c = par[c]; tgt = c; }
  if (best < 0 || bv < 6) {   // dar alan: boşluğun üstünden atla
    for (const n of G.nb2[cur]) {
      if (FC.comp[n] < 0) continue;
      const v = Math.min(FC.sizes[FC.comp[n]], 45) - 3 - 3 * crowd(n) + Math.random() * noise;
      if (v > bv + 2) { bv = v; tgt = n; best = n; jump = true; }
    }
  }
  const bestSize = best >= 0 && FC.comp[best] >= 0 ? FC.sizes[FC.comp[best]] : 0;
  if (f < A.NF - 1 && (best < 0 || bestSize <= 4)) {   // bilinçli düşüş: alttaki kat buradan daha ferahsa
    const FL = freshComps(st, A, f + 1, T);
    for (const n of [cur, ...G.nb[cur]]) {
      const idx = base + n, fa = st.fall[idx];
      if (A.block[idx] || (fa ? fa - T > 400 : n !== cur)) continue;
      if (FL.comp[n] < 0) continue;
      const v = Math.min(FL.sizes[FL.comp[n]], 45) * .85 - 4 - (n === cur ? 0 : 1) + Math.random() * noise;
      if (v > bv + 6) { bv = v; tgt = n; jump = false; drop = true; }
    }
  }
  if (tgt < 0) {   // hiçbir şey yoksa en geç düşecek sağlam komşu
    let bt = -1;
    for (const n of G.nb[cur]) { const idx = base + n; if (A.block[idx] || !tileSolid(A, st.fall, st.calls, idx, T)) continue; const v = st.fall[idx] || 1e15; if (v > bt) { bt = v; tgt = n; } }
    if (tgt < 0) tgt = pickR(G.nb[cur]);
  }
  b.tgt = tgt; b.jump = jump; b.drop = drop;
}
function botSub(st, A, pi, b, h, T, ctx) {
  const NT = A.NT;
  if (b.fall >= 0) {
    b.vz = Math.min(VZ_MAX, b.vz + GZ * h); b.z += b.vz * h;
    b.vx *= .985; b.vy *= .985; b.x += (b.vx + b.kx) * h * .5; b.y += (b.vy + b.ky) * h * .5; rimClamp(A.G, b);
    if (b.z >= b.fall) {
      const to = b.fall;
      if (to >= A.NF) { eliminate(st, pi, T, ctx); return; }
      const kk = supportCell(A, st.fall, st.calls, to, b.x, b.y, T);
      if (kk >= 0) { b.fall = -1; b.z = to; b.f = to; b.vz = 0; b.air = 0; trig(st, A, to * NT + kk, pi, T); b.re = 0; }
      else { b.fall = to + 1; if (b.fall < A.NF) setFloor(st, A, pi, b.fall, T, ctx); }
    }
    return;
  }
  const G = A.G, fx = st.fx[pi];
  if (b.tgt >= 0 && !b.drop) {   // hedef yolda düşecekse yeniden planla
    const c0 = G.cells[b.tgt], tf = st.fall[b.f * NT + b.tgt];
    if (tf && tf - T < dist(c0.x, c0.y, b.x, b.y) / (BASE * BOT_K) * 1000 + 90) b.re = 0;
  }
  if (T >= b.re || b.tgt < 0) { botPlan(st, A, pi, b, T); b.re = T + rnd(450, 750); }
  const c = G.cells[b.tgt] || G.cells[0];
  const dx = c.x - b.x, dy = c.y - b.y, d = Math.hypot(dx, dy);
  if (d < S * .45 && !b.drop) b.re = 0;
  let ix = 0, iy = 0;
  if (d > 1) { ix = dx / d; iy = dy / d; }
  b.wob = clamp(b.wob + (Math.random() - .5) * h * 6, -1, 1);
  const wa = b.wob * (1 - b.sk) * .7; if (wa) { const cs = Math.cos(wa), sn = Math.sin(wa); [ix, iy] = [ix * cs - iy * sn, ix * sn + iy * cs]; }
  if (b.air <= 0 && T >= b.jcd) {
    const zip = fx.zip > T, reach = (zip ? SJUMP_MS : JUMP_MS) / 1000 * BASE * BOT_K * AIR_K * .95;
    let jumpNow = false;
    const cur = cellAt(G, b.x, b.y), fa = cur >= 0 ? st.fall[b.f * NT + cur] : 0, left = fa ? fa - T : 1e9;
    if (b.jump && ((d < reach + 25 && d > HWD * .8) || left < 140)) jumpNow = true;
    if (!jumpNow && fa && left > 0 && left < 120 && d > S * .5 && Math.random() < .3 + b.sk * .5) jumpNow = true;
    if (!jumpNow && A.arms) {
      const arm = A.arms[b.f], r = Math.hypot(b.x, b.y);
      if (arm && r > PIL_R && r < G.LIM + PR) {
        const th = armAngle(arm, T, st.t0), phi = Math.atan2(b.y, b.x), sd = Math.sign(arm.w);
        for (let i = 0; i < arm.n; i++) { let dl = ((phi - (th + i * TAU / arm.n)) * sd) % TAU; if (dl < 0) dl += TAU; const tt = dl / Math.abs(arm.w); if (tt < .2 + .1 * b.sk && Math.random() < .35 + .6 * b.sk) jumpNow = true; }
      }
    }
    if (jumpNow) {
      b.airMax = zip ? SJUMP_MS : JUMP_MS; b.air = b.airMax; b.jcd = T + b.airMax + 200;
      const sp = BASE * BOT_K; if (d > 1) { b.vx = dx / d * sp; b.vy = dy / d * sp; }
    }
  }
  const others = [];
  aliveList(st).forEach(j => { if (j !== pi && st.fl[j] === b.f && !st.pos[j].d && !(st.pos[j].j)) others.push(st.pos[j]); });
  // tempo: karolar boşa harcanmasın diye yalnızca gerektiği kadar hızlı yürü
  let spd = BASE * BOT_K;
  if (!b.jump && b.air <= 0) {
    const cur = cellAt(G, b.x, b.y), fa = cur >= 0 ? st.fall[b.f * NT + cur] : 0;
    const tf = st.fall[b.f * NT + b.tgt], need = Math.max(fa ? (d + S * .3) / Math.max(.08, (fa - T) / 1000) * 1.35 : 0, tf ? BASE : 0);
    spd = clamp(Math.max(need, BASE * (.42 + (1 - b.sk) * .35)), BASE * .4, BASE * BOT_K);
    if (A.arms || b.drop) spd = Math.max(spd, BASE * .6);
  }
  phys(A, b, ix, iy, h, { T, t0: st.t0, spd, kal: fx.kal > T, others, F: st.fall });
  if (b.air > 0) { b.air -= h * 1000; if (b.air <= 0) b.air = 0; }
  if (b.air <= 0) {
    const kk = supportCell(A, st.fall, st.calls, b.f, b.x, b.y, T);
    if (kk < 0) { b.fall = b.f + 1; b.z = b.f; b.vz = .4; if (b.fall < A.NF) setFloor(st, A, pi, b.fall, T, ctx); }
    else trig(st, A, b.f * NT + kk, pi, T);
  }
}
function stepBots(st, A, dt, now, ctx) {
  const n = Math.max(1, Math.ceil(dt / .025)), h = dt / n;
  for (const k of Object.keys(st.bot)) {
    const pi = +k, b = st.bot[k]; if (st.out[pi]) continue;
    for (let s = 0; s < n; s++) { botSub(st, A, pi, b, h, now - (n - s - 1) * h * 1000, ctx); if (st.out[pi] || st.phase !== 'play') break; }
    if (st.out[pi]) continue;
    st.pos[pi] = { x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, f: b.fall >= 0 ? b.fall : b.f, t: now, j: b.air > 0 ? 1 : 0, d: b.fall >= 0 ? 1 : 0, as: 0, ds: 0 };
    if (st.phase !== 'play') return;
  }
}
function flushFast(st) {
  const arr = [];
  for (const k of Object.keys(st.bot)) { const pi = +k; if (st.out[pi]) continue; const p = st.pos[pi]; arr.push([pi, Math.round(p.x), Math.round(p.y), p.f, p.j, p.d]); }
  const e = []; for (const idx of st.pend) e.push(idx, Math.round((st.fall[idx] - st.t0) / 10));
  st.pend = [];
  uiFeedBots(st.spawnVer, arr);
  if (arr.length || e.length) fastOut({ t: 'h', v: st.spawnVer, p: arr, e });
}
function endRound(st, ctx) {
  if (st.phase !== 'play') return;
  const al = aliveList(st);
  al.forEach(i => { st.place[i] = 1; });
  const rows = st.players.map((_, i) => { const pl = st.place[i] || 1; return { pi: i, place: pl, pts: PTS[Math.min(pl - 1, PTS.length - 1)] }; });
  rows.forEach(r => { st.scores[r.pi] += r.pts; st.places[r.pi].push(r.place); });
  st.last = { round: st.round, rows };
  st.items = [];
  setPhase(st, 'end', END_MS);
  const wins = rows.filter(r => r.place === 1).map(r => r.pi);
  ctx.emit({ t: 'roundEnd', wins }, wins.length === 1 ? `🏆 ${pname(st, wins[0])} son ayakta kalan oldu!` : `🤝 Berabere: ${wins.map(i => pname(st, i)).join(', ')}`, 'gold');
  ctx.sync();
}
function finish(st, ctx) {
  setPhase(st, 'over', 0);
  const sumP = i => st.places[i].reduce((a, b) => a + b, 0);
  const ranking = st.players.map((p, i) => ({ pi: i, score: st.scores[i], label: st.rounds > 1 ? `${st.scores[i]} puan · ${st.places[i].map(x => x + '.').join(' ')}` : `${st.places[i][0]}. oldu · ${st.scores[i]} puan` }))
    .sort((a, b) => b.score - a.score || sumP(a.pi) - sumP(b.pi));
  const best = pname(st, ranking[0].pi);
  const title = st.rounds > 1 ? `${best} Düşen Zemin şampiyonu!` : `${best} son ayakta kalan!`;
  const note = `Puan: sıralamaya göre ${PTS.slice(0, Math.min(st.players.length, 5)).join('-')}… · ${st.rounds} tur · ${MODES[st.mode].name}`;
  ctx.emit({ t: 'over' }, `🏁 Oyun bitti! ${title}`, 'gold');
  ctx.sync();
  ctx.later(900, () => ctx.end({ title, ranking, note }));
}
function tick(st, ctx) {
  const now = Date.now(), dt = clamp((now - st.lastTick) / 1000, 0, .25); st.lastTick = now;
  const A = arenaOf(st);
  if (st.phase === 'count') { if (now >= st.endsAt) { startPlay(st, ctx); st.dirty = true; } }
  else if (st.phase === 'play') {
    stepBots(st, A, dt, now, ctx);
    if (st.phase === 'play') humansTick(st, A, now, ctx);
    if (st.phase === 'play' && st.pu) itemsTick(st, A, now, ctx);
    if (st.phase === 'play' && st.mode === 'renk') callsTick(st, A, now, ctx);
    if (st.phase === 'play') suddenTick(st, A, now, ctx);
    if (st.phase === 'play' && aliveList(st).length <= (st.startN >= 2 ? 1 : 0)) endRound(st, ctx);
    flushFast(st);
  } else if (st.phase === 'end') { if (now >= st.endsAt) { if (st.round < st.rounds) newRound(st, ctx); else finish(st, ctx); } }
  if (st.dirty || now - st.lastSync >= 1000) { st.dirty = false; st.lastSync = now; ctx.sync(); }
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
    const st = {
      mode: MODES[opts.mod] ? opts.mod : 'klasik', dur: optNum(opts.sure, [45, 60, 90, 120], 60), rounds: optNum(opts.tur, [1, 3], 1), pu: opts.guc !== '0',
      players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })),
      online: players.map(() => true), scores: players.map(() => 0), places: players.map(() => []),
      round: 0, phase: 'count', endsAt: 0, phaseDur: 1, playAt: 0, t0: 0, seed: 1, spawnVer: 0,
      fall: [], pend: [], fl: [], out: [], outAt: [], place: [], group: [], lastElimAt: 0, startN: players.length,
      pos: [], fx: [], items: [], idc: 0, calls: [], nextCallAt: 0, callN: 0, lastCol: -1, sudden: false, ring: 0, nextRingAt: 0, nextItemAt: 0,
      bot: {}, last: null, last3: false, last2: false, lastTick: Date.now(), lastSync: 0, loopId: 0, dirty: false
    };
    newRound(st, ctx);
    runLoop(st, ctx);
    return st;
  },
  action(st, pi, a, ctx) {
    if (!a || typeof a.t !== 'string') return;
    if (a.t === 'fall') {
      if (st.phase !== 'play' || st.out[pi] || !st.players[pi] || st.players[pi].isBot) return;
      claimFall(st, arenaOf(st), pi, +a.f, +a.x, +a.y, Date.now(), ctx);
      if (st.dirty) { st.dirty = false; ctx.sync(); }
    }
  },
  view(st, viewer) {
    const n = st.players.length, me = Number.isInteger(viewer) && viewer >= 0 && viewer < n ? viewer : -1;
    return {
      mode: st.mode, seed: st.seed, t0: st.t0, playAt: st.playAt, phase: st.phase, endsAt: st.endsAt, phaseDur: st.phaseDur, round: st.round, rounds: st.rounds,
      dur: st.dur, pu: st.pu, sudden: st.sudden, me, spawnVer: st.spawnVer, startN: st.startN,
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, online: st.online[i] !== false, score: st.scores[i] })),
      fl: st.fl.slice(), out: st.out.slice(), place: st.place.slice(), places: st.places.map(a => a.slice()),
      pos: st.pos.map(p => [Math.round(p.x), Math.round(p.y), p.f | 0]),
      tiles: encTiles(st), calls: st.calls.map(c => ({ c: c.c, w: c.w, at: c.at, until: c.until })),
      items: st.items.map(o => ({ id: o.id, k: o.k, f: o.f, x: o.x, y: o.y })),
      fx: st.fx.map(f => ({ zip: f.zip, haf: f.haf, kal: f.kal })),
      last: st.phase === 'end' || st.phase === 'over' ? st.last : null
    };
  },
  turnOf() { return null; },
  skipTurn() { /* gerçek zamanlı: kopan oyuncu yerinde durur ve karosu düşer */ },
  botAct() { /* botlar yöneten cihazdaki döngüde hareket eder */ },
  botDelay: 900,
  onPresence(st, pi, online, ctx) {
    st.online[pi] = online; st.dirty = true;
    // uzun süre bağlantısı yoksa (çekirdek ~12 sn sonra bildirir) elenir; genelde çoktan düşmüştür
    if (!online && st.phase === 'play' && !st.out[pi] && !st.players[pi].isBot) eliminate(st, pi, Date.now(), ctx);
  },
  resume(st, ctx) {
    if (st.phase === 'over') return;
    const now = Date.now(); st.lastTick = now; st.pos.forEach(p => { p.t = now; });
    runLoop(st, ctx);
  }
};

/* ------------------------------------------------------------------ ARAYÜZ (her cihaz) */
let root = null, ui = null, V = null, A = null, TL = null, pred = null, crumb = null;
let cv = null, cg = null, stageEl = null, miniCv = null, jumpBtn = null, joyEl = null;
let cam = { x: 0, y: 0, z: 0, s: .8 }, sw = 300, sh = 300, dpr = 1, snapCam = true;
let av = null, rp = [], keys = new Set(), joy = { on: false, id: null, bx: 0, by: 0, dx: 0, dy: 0 };
let raf = 0, lastT = 0, hudT = null, ro = null, popT = null, toastT = null, frameN = 0, layoutAt = 0;
let parts = [], anims = [], stepped = [], lastSend = 0, lastSent = null, seenSpawn = -1, seenKey = '', lastSec = -1;
const perfAcc = { step: 0, draw: 0, mini: 0, n: 0, gap: 0, last: 0 };
let bgGrad = null, chipKey = '', sideKey = '', specT = -1, outAtLocal = 0, stepSndAt = 0, bumpSndAt = 0, dustAt = {}, lastCallKey = '';
const INTERP = 120, JR = 46, TILT = .8, DROP = 95, TH = 15, BEAN_K = 1.25;
const pnow = () => performance.now();
const hostClock = () => (ui && ui.hostNow ? ui.hostNow() : Date.now());
const q = s => root && root.querySelector(s);
const isTouch = () => (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
const phoneW = () => innerWidth < 760;
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const vAlive = v => v.players.map((_, i) => i).filter(i => !v.out[i]);
const snd = {
  ok() { return Sound.ctx && Sound.enabled && Sound.ctx.state === 'running'; },
  step() { if (!this.ok()) return; Sound.tone(520 + Math.random() * 160, .05, { type: 'triangle', gain: .05 }); },
  jump() { if (!this.ok()) return; Sound.tone(360, .16, { type: 'square', gain: .06, slide: 820 }); },
  land() { if (!this.ok()) return; Sound.noise(.12, { filter: 'lowpass', freq: 500, gain: .3, decayPow: 2 }); },
  fall() { if (!this.ok()) return; Sound.tone(700, .7, { type: 'sine', gain: .12, slide: 110 }); Sound.noise(.6, { filter: 'bandpass', freq: 700, q: .5, gain: .12, decayPow: 1 }); },
  bump() { if (!this.ok()) return; Sound.tone(180, .14, { type: 'square', gain: .1, slide: 420 }); Sound.noise(.08, { freq: 1500, q: 1, gain: .2 }); },
  pick() { if (!this.ok()) return; [880, 1175, 1568].forEach((f, i) => Sound.tone(f, .12, { type: 'triangle', gain: .12, when: i * .05 })); },
  warn() { if (!this.ok()) return; Sound.tone(980, .09, { type: 'square', gain: .06 }); Sound.tone(740, .12, { type: 'square', gain: .06, when: .1 }); },
  crumble() { if (!this.ok()) return; Sound.noise(.25, { filter: 'lowpass', freq: 900, gain: .16, decayPow: 1.5 }); }
};

/* ---- sahne dönüşümleri ---- */
function persp(d) { return d >= 0 ? 1 / (1 + d * .55) : 1 - d * 1.15; }
function xfOf(d) { const k = persp(d), s = cam.s * k; return { d, k, s, ox: sw / 2 - cam.x * s, oy: sh * .5 + (d * DROP - cam.y * TILT) * s, sy: s * TILT }; }
function toClient(x, y, z) { if (!cv) return null; const r = cv.getBoundingClientRect(), xf = xfOf(z - cam.z); return [r.left + xf.ox + x * xf.s, r.top + xf.oy + y * xf.sy]; }
function camScale() {
  if (!A) return .8;
  const G = A.G, fw = 2 * (G.LIM + PR + 8) / Math.cos(Math.PI / 6) + 40, fh = 2 * (G.LIM + PR + 8) * TILT + 110;
  return phoneW() ? clamp(Math.min(sw / 560, sh / 640), .5, 1.05) : clamp(Math.min(sw / fw, sh / fh), .45, 1.1);
}
function focus() {
  if (av && V && V.me >= 0 && !V.out[V.me] && !av.gone) return av;
  if (av && av.gone && pnow() - outAtLocal < 900) return av;
  if (V) {
    const al = vAlive(V);
    if (!al.includes(specT)) specT = al.length ? al[0] : -1;
    if (specT >= 0 && rp[specT]) return rp[specT];
  }
  return { x: 0, y: 0, z: 0, vx: 0, vy: 0 };
}
function camFollow(dt) {
  cam.s = camScale();
  const f = focus(), ph = phoneW();
  const fz = Math.min(f.z || 0, A ? A.NF - .8 : 2);
  const fx = ph ? f.x + (f.vx || 0) * .15 : f.x * .2, fy = ph ? f.y + (f.vy || 0) * .15 : f.y * .25;
  const k = snapCam ? 1 : 1 - Math.exp(-dt * 6), kz = snapCam ? 1 : 1 - Math.exp(-dt * 5);
  cam.x += (fx - cam.x) * k; cam.y += (fy - cam.y) * k; cam.z += (fz - cam.z) * kz;
  if (A) { const L = A.G.LIM; cam.x = clamp(cam.x, -L * .75, L * .75); cam.y = clamp(cam.y, -L * .8, L * .8); }
  snapCam = false;
}
function resize() {
  if (!stageEl || !cv) return;
  layout();
  const r = stageEl.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return;
  sw = r.width; sh = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(sw * dpr); cv.height = Math.round(sh * dpr);
  if (miniCv) { const w = miniCv.clientWidth, h = miniCv.clientHeight; miniCv.width = Math.round(w * dpr); miniCv.height = Math.round(h * dpr); }
  snapCam = true;
}
function layout() {
  if (!stageEl) return;
  const top = stageEl.getBoundingClientRect().top + (window.scrollY || 0), ph = phoneW();
  const h = ph ? clamp(innerHeight - top - 10, 330, 1000) : clamp(innerHeight - top - 16, 470, 800);
  if (Math.abs(stageEl.offsetHeight - h) > 2) stageEl.style.height = Math.round(h) + 'px';
}

/* ---- karo tablosu (istemci) ---- */
function uiTile(sv, idx, fa) { if (root && TL && sv === seenSpawn && idx >= 0 && idx < TL.length) { TL[idx] = fa; pred[idx] = 0; } }
function parseTiles(v) {
  if (!TL) return;
  const seen = new Uint8Array(TL.length), T = hostClock();
  decTiles(v.tiles, (idx, rel) => { if (idx >= 0 && idx < TL.length) { TL[idx] = v.t0 + rel; pred[idx] = 0; seen[idx] = 1; } });
  for (let i = 0; i < TL.length; i++) {
    if (seen[i]) continue;
    if (pred[i]) { if (T - pred[i] > 1500) { TL[i] = 0; pred[i] = 0; } }
    else TL[i] = 0;
  }
}
const myDelay = T => (V && V.me >= 0 && V.fx[V.me] && V.fx[V.me].haf > T ? HAF_DELAY : A.delay);
function localTrig(f, k, T) {
  const idx = f * A.NT + k;
  if (TL[idx] || A.block[idx]) return;
  TL[idx] = Math.max(T, (V.playAt || 0) + START_GRACE) + myDelay(T); pred[idx] = T; stepped.push(idx);
  const t = pnow(); if (t - stepSndAt > 110) { stepSndAt = t; snd.step(); }
}

/* ---- uzaktaki oyuncular ---- */
function mkRemote(p, f) { return { buf: [], x: p[0], y: p[1], z: f, vz: 0, f, j: 0, jumpT: 0, walk: 0, ph: 0, at: 0, p0: null, vx: 0, vy: 0, h: Math.PI / 2, hop: 0, sq: 0 }; }
function feed(pi, x, y, f, j, d) {
  if (!V || !root || !V.players[pi] || (pi === V.me && av)) return;
  if (V.phase !== 'play' || V.out[pi]) return;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const t = pnow();
  let r = rp[pi]; if (!r) r = rp[pi] = mkRemote([x, y], f | 0);
  const last = r.buf[r.buf.length - 1];
  if (last) { const dd = dist(last.x, last.y, x, y), lim = MAXV * Math.max(.1, (t - last.t) / 1000) * 1.3 + 90; if (dd > lim) { r.buf = []; r.p0 = null; r.x = x; r.y = y; } }
  r.buf.push({ t, x, y, f: f | 0, j: j ? 1 : 0, d: d ? 1 : 0 });
  if (r.buf.length > 14) r.buf.shift();
  r.at = t;
}
function uiFeedBots(sv, arr) { if (!root || sv !== seenSpawn) return; arr.forEach(a => feed(a[0], a[1], a[2], a[3], a[4], a[5])); }
function onFast(m) {
  if (!m || !V) return;
  if (m.t === 'p') {
    if (ui && ui.isHost) hostPosIn(m.seat, m, m.id);
    feed(m.seat, +m.x, +m.y, +m.f, m.j, m.d);
  } else if (m.t === 'h') {
    if (ui && ui.isHost) return;
    if (m.v !== seenSpawn) return;
    if (Array.isArray(m.p)) m.p.forEach(a => { if (Array.isArray(a) && V.players[a[0]] && V.players[a[0]].isBot) feed(a[0], +a[1], +a[2], +a[3], a[4], a[5]); });
    if (Array.isArray(m.e) && TL) for (let i = 0; i + 1 < m.e.length; i += 2) { const idx = m.e[i] | 0; if (idx >= 0 && idx < TL.length) { TL[idx] = V.t0 + (+m.e[i + 1]) * 10; pred[idx] = 0; } }
  }
}
function stepRemotes(dt, t) {
  const rt = t - INTERP, T = hostClock();
  V.players.forEach((_, i) => {
    if (i === V.me && av) return;
    let r = rp[i]; if (!r) r = rp[i] = mkRemote(V.pos[i], V.fl[i]);
    const ox = r.x, oy = r.y, b = r.buf;
    let tx = r.x, ty = r.y, tf = r.f, tj = 0;
    if (V.out[i]) { tf = A.NF + 1.6; }
    else if (V.phase !== 'play' || !b.length || t - r.at > 1500) {
      tx = V.pos[i][0]; ty = V.pos[i][1]; tf = Math.max(V.fl[i], V.pos[i][2] | 0);
      if (V.phase !== 'play' || dist(tx, ty, r.x, r.y) > 220) { r.x = tx; r.y = ty; }
      if (V.phase === 'count') { r.z = tf; r.vz = 0; }
    } else {
      while (b.length >= 2 && b[1].t <= rt) r.p0 = b.shift();
      const a = b[0];
      if (b.length >= 2 && rt > a.t) { const c = b[1], u = (rt - a.t) / Math.max(1, c.t - a.t); tx = a.x + (c.x - a.x) * u; ty = a.y + (c.y - a.y) * u; }
      else if (rt > a.t && r.p0) { const p0 = r.p0, dtt = Math.max(1, a.t - p0.t), ext = Math.min(rt - a.t, 110); tx = a.x + (a.x - p0.x) / dtt * ext; ty = a.y + (a.y - p0.y) / dtt * ext; }
      else { tx = a.x; ty = a.y; }
      tf = Math.max(a.f, V.fl[i] || 0); tj = a.j;
    }
    const k = 1 - Math.exp(-dt * 22);
    r.x += (tx - r.x) * k; r.y += (ty - r.y) * k;
    r.f = tf;
    if (r.z < tf) { r.vz = Math.min(VZ_MAX, r.vz + GZ * dt); r.z = Math.min(tf, r.z + r.vz * dt); if (r.z >= tf && tf < A.NF) { r.vz = 0; r.sq = 1; } }
    else if (r.z > tf + .01) { r.z = tf; r.vz = 0; }
    if (tj && !r.j) r.jumpT = t;
    r.j = tj;
    const jd = V.fx[i] && V.fx[i].zip > T ? SJUMP_MS : JUMP_MS;
    r.hop = r.j || t - r.jumpT < jd ? Math.sin(Math.PI * clamp((t - r.jumpT) / jd, 0, 1)) * (jd > 600 ? SJH : JH) : 0;
    r.sq = Math.max(0, r.sq - dt * 4);
    const sp = Math.hypot(r.x - ox, r.y - oy) / Math.max(dt, 1e-3);
    r.vx = (r.x - ox) / Math.max(dt, 1e-3); r.vy = (r.y - oy) / Math.max(dt, 1e-3);
    if (sp > 20) r.h = Math.atan2(r.vy, r.vx);
    r.walk = clamp(sp / 160, 0, 1); r.ph += sp * dt / 11;
    if (sp > 80 && r.z === Math.round(r.z) && !r.hop) dust(i, r.x, r.y, r.z, t);
  });
}

/* ---- yerel oyuncu ---- */
function newAv(p, f) { return { x: p[0], y: p[1], vx: 0, vy: 0, kx: 0, ky: 0, air: 0, airMax: JUMP_MS, f, z: f, vz: 0, fall: -1, h: Math.PI / 2, walk: 0, ph: 0, sq: 0, gone: false, elimSent: false, hop: 0 }; }
function inputDir() {
  let ix = 0, iy = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) ix -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) ix += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) iy -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) iy += 1;
  if (joy.on) { ix = joy.dx; iy = joy.dy; }
  const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
  return [ix, iy];
}
function othersFor(f) {
  const out = [];
  V.players.forEach((_, i) => { if (i === V.me || V.out[i]) return; const r = rp[i]; if (r && Math.abs(r.z - f) < .05 && r.hop < 8) out.push(r); });
  return out;
}
function stepMe(dt, t) {
  if (!av || !V || V.me < 0) return;
  const me = V.me, T = hostClock();
  av.sq = Math.max(0, av.sq - dt * 4);
  if (av.gone || V.out[me]) {
    if (!av.gone && av.fall < 0) { av.fall = A.NF; }
    if (av.gone || av.fall >= 0) { av.vz = Math.min(VZ_MAX, av.vz + GZ * dt); av.z += av.vz * dt; if (av.z >= A.NF && !av.gone) { av.gone = true; outAtLocal = pnow(); } }
    av.hop = 0; return;
  }
  if (V.phase !== 'play') { av.walk = Math.max(0, av.walk - dt * 6); av.hop = 0; return; }
  const [ix, iy] = inputDir();
  const n = Math.max(1, Math.ceil(dt / .017)), h = dt / n, fx = V.fx[me] || {};
  const env = { T, t0: V.t0, spd: BASE, kal: fx.kal > T, others: othersFor(av.f), F: TL, onBump: () => { const tt = pnow(); if (tt - bumpSndAt > 250) { bumpSndAt = tt; snd.bump(); anims.push({ k: 'ring', x: av.x, y: av.y, z: av.f, col: '#ffffff', start: tt, dur: 380, r: 40 }); } } };
  for (let s = 0; s < n; s++) {
    const Ts = T - (n - s - 1) * h * 1000; env.T = Ts;
    if (av.fall >= 0) {
      av.vz = Math.min(VZ_MAX, av.vz + GZ * h); av.z += av.vz * h;
      av.vx *= .985; av.vy *= .985; av.x += (av.vx + av.kx) * h * .5; av.y += (av.vy + av.ky) * h * .5; rimClamp(A.G, av);
      if (av.z >= av.fall) {
        if (av.fall >= A.NF) {
          av.gone = true; outAtLocal = pnow();
          if (!av.elimSent) { av.elimSent = true; sendPos(t); ui.send({ t: 'fall', f: A.NF, x: Math.round(av.x), y: Math.round(av.y) }); }
          break;
        }
        const k = supportCell(A, TL, V.calls, av.fall, av.x, av.y, Ts);
        if (k >= 0) {
          av.f = av.fall; av.z = av.f; av.fall = -1; av.vz = 0; av.air = 0; av.sq = 1;
          localTrig(av.f, k, Ts); snd.land(); landDust(av.x, av.y, av.f, t); sendPos(t);
        } else av.fall += 1;
      }
      continue;
    }
    env.others = othersFor(av.f);
    phys(A, av, ix, iy, h, env);
    if (av.air > 0) { av.air -= h * 1000; if (av.air <= 0) { av.air = 0; av.sq = .7; snd.land(); landDust(av.x, av.y, av.f, t); } }
    if (av.air <= 0) {
      const k = supportCell(A, TL, V.calls, av.f, av.x, av.y, Ts);
      if (k < 0) { av.fall = av.f + 1; av.vz = .4; av.z = av.f; snd.fall(); sendPos(t); if (av.fall >= A.NF) pop('AŞAĞI!', 'bad'); }
      else localTrig(av.f, k, Ts);
    }
  }
  const sp = Math.hypot(av.vx, av.vy);
  if (sp > 20 && av.fall < 0) av.h = Math.atan2(av.vy, av.vx);
  av.walk = av.fall >= 0 ? 0 : clamp(sp / 160, 0, 1); av.ph += sp * dt / 11;
  av.hop = hopH(av);
  if (sp > 80 && av.fall < 0 && av.air <= 0) dust(me, av.x, av.y, av.f, t);
  if (t - lastSend > 100 && (stepped.length || !lastSent || dist(lastSent[0], lastSent[1], av.x, av.y) > 1 || lastSent[2] !== (av.fall >= 0 ? av.fall : av.f) || lastSent[3] !== (av.air > 0) || t - lastSend > 400)) sendPos(t);
}
function sendPos(t) {
  if (!av || !ui || !V || V.me < 0) return;
  lastSend = t || pnow();
  const f = av.fall >= 0 ? av.fall : av.f;
  lastSent = [av.x, av.y, f, av.air > 0];
  const m = { t: 'p', x: Math.round(av.x), y: Math.round(av.y), f, j: av.air > 0 ? 1 : 0, d: av.fall >= 0 ? 1 : 0 };
  if (stepped.length) m.s = stepped.splice(0, 16);
  if (ui.isHost) hostPosIn(V.me, m);
  if (ui.mode === 'online' && ui.fast) ui.fast(m);
}
function doJump() {
  if (!av || !V || V.me < 0 || V.phase !== 'play' || V.out[V.me] || av.gone || av.fall >= 0 || av.air > 0) return;
  Sound.init();
  const T = hostClock(), sup = V.fx[V.me] && V.fx[V.me].zip > T;
  av.airMax = sup ? SJUMP_MS : JUMP_MS; av.air = av.airMax;
  const [ix, iy] = inputDir(), m = Math.hypot(ix, iy);
  if (m > .2) { av.vx = ix / m * BASE * AIR_K; av.vy = iy / m * BASE * AIR_K; }
  snd.jump(); sendPos(pnow());
  if (jumpBtn) { jumpBtn.classList.remove('hit'); void jumpBtn.offsetWidth; jumpBtn.classList.add('hit'); }
}

/* ---- parçacıklar ---- */
function dust(i, x, y, z, t) {
  if ((dustAt[i] || 0) > t - 90 || parts.length > 240) return; dustAt[i] = t;
  parts.push({ x: x + rnd(-6, 6), y: y + rnd(-3, 3), z, hgt: 2, vx: rnd(-14, 14), vy: rnd(-8, 8), vh: rnd(10, 30), g: 40, life: .5, max: .5, r: rnd(3, 6), c: 'rgba(255,255,255,.55)', k: 'dust' });
}
function landDust(x, y, z, t) { for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; parts.push({ x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 6, z, hgt: 2, vx: Math.cos(a) * 70, vy: Math.sin(a) * 45, vh: 25, g: 60, life: .45, max: .45, r: rnd(3, 6), c: 'rgba(255,255,255,.7)', k: 'dust' }); } void t; }
function crumbleParts(x, y, z, col) { if (parts.length > 260) return; for (let i = 0; i < 4; i++) parts.push({ x: x + rnd(-20, 20), y: y + rnd(-16, 16), z, hgt: 0, vx: rnd(-30, 30), vy: rnd(-20, 20), vh: rnd(30, 80), g: 520, life: .9, max: .9, r: rnd(4, 8), c: col, k: 'chunk' }); }
function stepParts(dt) {
  for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.hgt += p.vh * dt; p.vh -= p.g * dt; p.vx *= .96; p.vy *= .96; }
  parts = parts.filter(p => p.life > 0);
}
function pop(text, cls) {
  const p = q('.dz-pop'); if (!p) return;
  p.textContent = text; p.className = 'dz-pop'; void p.offsetWidth; p.className = 'dz-pop show ' + (cls || '');
  clearTimeout(popT); popT = setTimeout(() => { if (p) p.className = 'dz-pop'; }, 1300);
}
function toast(text, cls) {
  const t = q('.dz-toast'); if (!t) return;
  t.textContent = text; t.className = 'dz-toast show ' + (cls || ''); clearTimeout(toastT);
  toastT = setTimeout(() => { if (t) t.className = 'dz-toast'; }, 1800);
}
const posOf = i => (V && i === V.me && av ? av : rp[i]) || (V && V.pos[i] ? { x: V.pos[i][0], y: V.pos[i][1], z: V.fl[i] } : { x: 0, y: 0, z: 0 });

/* ---- çizim ---- */
const HEXV = Array.from({ length: 6 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 3; return [Math.cos(a), Math.sin(a)]; });
function hexPath(g, X, Y, rx, ry) { g.beginPath(); for (let i = 0; i < 6; i++) { const v = HEXV[i]; if (i) g.lineTo(X + v[0] * rx, Y + v[1] * ry); else g.moveTo(X + v[0] * rx, Y + v[1] * ry); } g.closePath(); }
function sidePath(g, X, Y, rx, ry, th) {
  g.beginPath(); g.moveTo(X + HEXV[1][0] * rx, Y + HEXV[1][1] * ry);
  g.lineTo(X + HEXV[2][0] * rx, Y + HEXV[2][1] * ry + th); g.lineTo(X + HEXV[3][0] * rx, Y + HEXV[3][1] * ry + th);
  g.lineTo(X + HEXV[4][0] * rx, Y + HEXV[4][1] * ry + th); g.lineTo(X + HEXV[5][0] * rx, Y + HEXV[5][1] * ry); g.closePath();
}
function tileBase(f, idx) { return A.col ? COLS[A.col[idx]] : FLOOR_COL[f % FLOOR_COL.length]; }
function drawRim(g, xf, f, dk) {
  const L = A.G.LIM + PR + 4, col = mix(FLOOR_COL[f % FLOOR_COL.length], '#120a2c', dk);
  const pts = Array.from({ length: 6 }, (_, i) => { const a = i * Math.PI / 3, R = L / Math.cos(Math.PI / 6); return [xf.ox + Math.cos(a) * R * xf.s, xf.oy + Math.sin(a) * R * xf.sy]; });
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
  g.fillStyle = `rgba(10,4,30,${.35 * (1 - dk)})`; g.fill();
  g.lineWidth = Math.max(1.5, 4 * xf.s); g.strokeStyle = col; g.globalAlpha *= .75; g.stroke(); g.globalAlpha /= .75;
  g.lineWidth = Math.max(1, 1.5 * xf.s); g.strokeStyle = 'rgba(255,255,255,.35)'; g.stroke();
}
// Karo prizması önceden çizilmiş sprite olarak saklanır: karede karo başına tek drawImage
const SPR_Q = 1.6, sprCache = new Map();
function tileSprite(top, crack, hi) {
  const key = top + crack + (hi ? 'h' : ''); let sp = sprCache.get(key); if (sp) return sp;
  if (sprCache.size > 500) sprCache.clear();
  const rx = S * .94 * SPR_Q, ry = S * .94 * TILT * SPR_Q, th = TH * SPR_Q;
  const w = Math.ceil(2 * RIN * .94 * SPR_Q) + 6, h = Math.ceil(2 * ry + th) + 6, X = w / 2, Y = ry + 3;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  sidePath(g, X, Y, rx, ry, th); g.fillStyle = shade(top, -.48); g.fill();
  hexPath(g, X, Y, rx, ry); g.fillStyle = top; g.fill();
  g.lineWidth = 2.2; g.strokeStyle = hi ? 'rgba(255,255,255,.95)' : shade(top, .4); g.stroke();
  if (!hi) { hexPath(g, X - rx * .08, Y - ry * .12, rx * .55, ry * .5); g.fillStyle = 'rgba(255,255,255,.10)'; g.fill(); }
  if (crack) {
    g.strokeStyle = 'rgba(60,15,40,.6)'; g.lineWidth = 2.6; g.beginPath();
    g.moveTo(X - rx * .45, Y - ry * .15); g.lineTo(X - rx * .1, Y + ry * .05); g.lineTo(X + rx * .2, Y + ry * .4);
    g.moveTo(X - rx * .1, Y + ry * .05); g.lineTo(X + rx * .4, Y - ry * .3);
    if (crack > 1) { g.moveTo(X + rx * .05, Y - ry * .55); g.lineTo(X - rx * .1, Y + ry * .05); }
    g.stroke();
  }
  sp = { c, cx: X, cy: Y }; sprCache.set(key, sp); return sp;
}
function blitTile(g, sp, X, Y, sc) { const k = sc / SPR_Q; g.drawImage(sp.c, X - sp.cx * k, Y - sp.cy * k, sp.c.width * k, sp.c.height * k); }
// Üst kat bu hücrede ve tüm komşularında sağlamsa alttaki karolar görünmez: çizme
function coverOf(f, T) {
  const NT = A.NT, base = f * NT, G = A.G, calls = V.calls || [], ok = new Uint8Array(NT), cov = new Uint8Array(NT);
  for (let k = 0; k < NT; k++) { const fa = TL[base + k]; ok[k] = (!fa || fa - T > 120) && tileSolid(A, TL, calls, base + k, T + 120) ? 1 : 0; }
  for (let k = 0; k < NT; k++) { if (!ok[k] || G.nb[k].length < 6) continue; let all = 1; for (const n of G.nb[k]) if (!ok[n]) { all = 0; break; } cov[k] = all; }
  return cov;
}
function drawFloor(g, f, xf, T, t, up) {
  const NT = A.NT, base = f * NT, cells = A.G.cells;
  const hidden = (X, Y) => { if (!up) return false; const xu = (X - up.xf.ox) / up.xf.s, yu = (Y - up.xf.oy) / up.xf.sy, ku = cellAt(A.G, xu, yu); return ku >= 0 && up.cov[ku] === 1; };
  const alpha = xf.d < 0 ? clamp(1 + xf.d * 1.7, 0, 1) : 1; if (alpha <= .02) return;
  g.globalAlpha = alpha;
  const dk = Math.round(clamp(xf.d * .34, 0, .62) * 10) / 10, near = Math.abs(xf.d) < .6;
  drawRim(g, xf, f, dk);
  const calls = V.calls || [];
  // 1) düşen karolar (kalanların altında)
  for (let k = 0; k < NT; k++) {
    const idx = base + k, fa = TL[idx];
    let p = -1;
    if (fa && T >= fa) { p = (T - fa) / FALL_ANIM; if (p < .05 && !crumb[idx]) { crumb[idx] = 1; if (near) crumbleParts(cells[k].x, cells[k].y, f, tileBase(f, idx)); } }
    else if (A.col) { for (const c of calls) if (c.c === A.col[idx] && T >= c.at && T < c.until) { p = (T - c.at) / FALL_ANIM; break; } }
    if (p < 0 || p >= 1) continue;
    const c = cells[k], X = xf.ox + c.x * xf.s, Y = xf.oy + c.y * xf.sy + p * p * 240 * xf.s;
    g.globalAlpha = alpha * (1 - p);
    blitTile(g, tileSprite(mix(tileBase(f, idx), '#120a2c', clamp(dk + p * .5, 0, .85)), 0, false), X, Y, xf.s * (1 - .35 * p));
  }
  g.globalAlpha = alpha;
  // 2) sağlam karolar
  const warnCols = A.col ? [0, 1, 2, 3].map(c => callWarn(calls, c, T)) : null, blink = Math.round((.5 + .5 * Math.sin(t / 70)) * 2) / 2;
  for (let k = 0; k < NT; k++) {
    const idx = base + k, fa = TL[idx];
    if (fa && T >= fa) continue;
    let rise = 1;
    if (A.col) {
      let gone = false;
      for (const c of calls) if (c.c === A.col[idx]) { if (T >= c.at && T < c.until) gone = true; else if (T >= c.until && T < c.until + 320) rise = (T - c.until) / 320; }
      if (gone) continue;
    }
    const c = cells[k];
    let X = xf.ox + c.x * xf.s, Y = xf.oy + c.y * xf.sy, top = tileBase(f, idx), crack = 0;
    if (hidden(X, Y)) continue;
    if (fa) {
      const u = Math.round(clamp(1 - (fa - T) / 750, 0, 1) * 4) / 4;
      top = mix(top, '#fff6c8', .3 + .5 * u);
      crack = u > .6 ? 2 : u > .3 ? 1 : 0;
      if (u > .5) { X += Math.sin(t * .09 + idx * 3.1) * 2.2 * u * xf.s; Y += Math.cos(t * .11 + idx) * 1.2 * u * xf.s; }
    }
    if (warnCols && warnCols[A.col[idx]]) top = mix(top, '#ffffff', .25 + .45 * blink);
    if (rise < 1) { Y += (1 - rise) * 60 * xf.s; g.globalAlpha = alpha * rise; }
    if (dk) top = mix(top, '#120a2c', dk);
    blitTile(g, tileSprite(top, near ? crack : 0, !!fa && near), X, Y, xf.s);
    if (rise < 1) g.globalAlpha = alpha;
  }
  g.globalAlpha = 1;
}
function drawArms(g, f, xf, T) {
  if (!A.arms || !A.arms[f]) return;
  const arm = A.arms[f], th = armAngle(arm, T, V.t0), L = A.G.LIM + 8, alpha = xf.d < 0 ? clamp(1 + xf.d * 1.7, 0, 1) : 1;
  const dk = clamp(xf.d * .34, 0, .62);
  g.save(); g.globalAlpha = alpha; g.lineCap = 'round';
  for (let i = 0; i < arm.n; i++) {
    const a = th + i * TAU / arm.n, c = Math.cos(a), s = Math.sin(a);
    const x0 = xf.ox + c * PIL_R * xf.s, y0 = xf.oy + s * PIL_R * xf.sy, x1 = xf.ox + c * L * xf.s, y1 = xf.oy + s * L * xf.sy, lift = 12 * xf.s;
    g.strokeStyle = 'rgba(10,4,30,.35)'; g.lineWidth = ARM_W * xf.s; g.beginPath(); g.moveTo(x0, y0 + 4 * xf.s); g.lineTo(x1, y1 + 4 * xf.s); g.stroke();
    g.strokeStyle = mix('#ff8a00', '#120a2c', dk); g.lineWidth = ARM_W * xf.s; g.beginPath(); g.moveTo(x0, y0 - lift); g.lineTo(x1, y1 - lift); g.stroke();
    g.setLineDash([10 * xf.s, 10 * xf.s]); g.strokeStyle = mix('#2a1144', '#120a2c', dk); g.lineWidth = ARM_W * .55 * xf.s; g.stroke(); g.setLineDash([]);
    g.fillStyle = mix('#ffe14a', '#120a2c', dk); g.beginPath(); g.arc(x1, y1 - lift, ARM_W * .62 * xf.s, 0, TAU); g.fill();
  }
  g.restore();
}
function drawBlock(g, o, xf, t) {
  const X = xf.ox + o.x * xf.s, Y = xf.oy + o.y * xf.sy, s = xf.s, dk = clamp(xf.d * .34, 0, .62);
  const alpha = xf.d < 0 ? clamp(1 + xf.d * 1.7, 0, 1) : 1; if (alpha <= .02) return;
  g.save(); g.globalAlpha = alpha;
  if (o.pil) {
    const hgt = 42 * s, r = o.r * s;
    g.fillStyle = mix('#5b2a9a', '#120a2c', dk); g.fillRect(X - r, Y - hgt, 2 * r, hgt);
    g.beginPath(); g.ellipse(X, Y, r, r * TILT, 0, 0, Math.PI); g.fill();
    g.fillStyle = mix('#c77dff', '#120a2c', dk); g.beginPath(); g.ellipse(X, Y - hgt, r, r * TILT, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2 * s; g.stroke();
    g.fillStyle = mix('#ffe14a', '#120a2c', dk); g.beginPath(); g.ellipse(X, Y - hgt, r * .4, r * .4 * TILT, 0, 0, TAU); g.fill();
  } else {
    const hgt = (18 + Math.sin(t / 300 + o.k) * 1.5) * s, r = o.r * s;
    g.fillStyle = 'rgba(10,4,30,.35)'; g.beginPath(); g.ellipse(X, Y + 3 * s, r * 1.1, r * TILT * 1.1, 0, 0, TAU); g.fill();
    g.fillStyle = mix('#c2183f', '#120a2c', dk); g.fillRect(X - r, Y - hgt, 2 * r, hgt);
    g.beginPath(); g.ellipse(X, Y, r, r * TILT, 0, 0, Math.PI); g.fill();
    const gr = g.createRadialGradient(X - r * .3, Y - hgt - r * .3, r * .1, X, Y - hgt, r);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(.5, mix('#ff4f6d', '#120a2c', dk)); gr.addColorStop(1, mix('#a3123a', '#120a2c', dk));
    g.fillStyle = gr; g.beginPath(); g.ellipse(X, Y - hgt, r, r * TILT, 0, 0, TAU); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 2.5 * s; g.beginPath(); g.ellipse(X, Y - hgt, r * .62, r * .62 * TILT, 0, 0, TAU); g.stroke();
  }
  g.restore();
}
function drawItemIcon(g, k, s) {
  g.save(); g.scale(s, s); g.lineJoin = 'round'; g.lineCap = 'round';
  if (k === 'zip') {
    g.strokeStyle = '#0d5a26'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(-8, 10);
    for (let i = 0; i < 4; i++) { g.lineTo(i % 2 ? -8 : 8, 6 - i * 4); } g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -13); g.lineTo(8, -4); g.lineTo(3, -4); g.lineTo(3, 2); g.lineTo(-3, 2); g.lineTo(-3, -4); g.lineTo(-8, -4); g.closePath(); g.fill();
    g.strokeStyle = '#0d5a26'; g.lineWidth = 1.5; g.stroke();
  } else if (k === 'haf') {
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-9, 11); g.quadraticCurveTo(-10, -6, 9, -12); g.quadraticCurveTo(6, 6, -9, 11); g.fill();
    g.strokeStyle = '#2a6f8a'; g.lineWidth = 1.6; g.stroke();
    g.beginPath(); g.moveTo(-11, 13); g.quadraticCurveTo(-1, 1, 6, -8); g.stroke();
  } else {
    g.beginPath(); g.moveTo(0, -12); g.lineTo(10, -7); g.lineTo(9, 2); g.quadraticCurveTo(6, 9, 0, 13); g.quadraticCurveTo(-6, 9, -9, 2); g.lineTo(-10, -7); g.closePath();
    g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = '#8a5a00'; g.lineWidth = 1.8; g.stroke();
    g.fillStyle = '#ffb627'; g.beginPath(); g.moveTo(0, -7); g.lineTo(5, -4); g.lineTo(4.5, 1); g.quadraticCurveTo(3, 5, 0, 7); g.closePath(); g.fill();
  }
  g.restore();
}
function drawItem(g, it, xf, t) {
  const b = Math.sin(t / 280 + it.id) * 3, X = xf.ox + it.x * xf.s, Y = xf.oy + it.y * xf.sy, s = xf.s, col = ITEMS[it.k].col;
  const alpha = xf.d < 0 ? clamp(1 + xf.d * 1.7, 0, 1) : 1; if (alpha <= .02) return;
  g.save(); g.globalAlpha = alpha * (xf.d > .5 ? .6 : 1);
  g.fillStyle = 'rgba(10,4,30,.35)'; g.beginPath(); g.ellipse(X, Y, 13 * s, 5 * s, 0, 0, TAU); g.fill();
  const cy = Y - (24 + b) * s;
  const gl = g.createRadialGradient(X, cy, 0, X, cy, 30 * s); gl.addColorStop(0, col + 'aa'); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(X - 30 * s, cy - 30 * s, 60 * s, 60 * s);
  const gr = g.createRadialGradient(X - 5 * s, cy - 6 * s, 2 * s, X, cy, 17 * s); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, col);
  g.fillStyle = gr; g.beginPath(); g.arc(X, cy, 16 * s, 0, TAU); g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 2 * s; g.stroke();
  g.translate(X, cy); drawItemIcon(g, it.k, s * .85);
  g.restore();
}
function drawBean(g, X, Y, s, o) {
  const t = o.t, hop = o.hop || 0, falling = o.falling;
  g.save(); g.globalAlpha = o.alpha;
  if (!falling) { const sh = clamp(1 - hop / 90, .4, 1); g.fillStyle = `rgba(10,4,30,${.35 * sh})`; g.beginPath(); g.ellipse(X, Y, 17 * s * sh, 7 * s * sh, 0, 0, TAU); g.fill(); }
  if (o.ring) { g.strokeStyle = o.ring; g.lineWidth = 2.5 * s; g.globalAlpha = o.alpha * (.6 + .3 * Math.sin(t / 200)); g.beginPath(); g.ellipse(X, Y, 25 * s, 10 * s, 0, 0, TAU); g.stroke(); g.globalAlpha = o.alpha; }
  g.translate(X, Y - hop * s); g.scale(s * BEAN_K, s * BEAN_K);
  const sq = o.sq || 0, sx = 1 + .22 * sq, sy = 1 - .26 * sq;
  const fx = Math.cos(o.h || 0), fy = Math.sin(o.h || 0), walk = o.walk || 0, ph = o.ph || 0;
  const c = o.col, dk = shade(c, -.4), lt = shade(c, .45);
  const bob = falling ? 0 : Math.abs(Math.sin(ph)) * 2.4 * walk;
  // ayaklar
  if (!falling) { const s1 = Math.sin(ph) * 4 * walk; g.fillStyle = dk; g.beginPath(); g.ellipse(-6 + fx * s1, -1 + fy * s1 * .5, 5, 3, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(6 - fx * s1, -1 - fy * s1 * .5, 5, 3, 0, 0, TAU); g.fill(); }
  g.translate(0, -bob); g.scale(sx, sy);
  // kollar (düşerken çırpınır)
  g.strokeStyle = dk; g.lineWidth = 4;
  if (falling) { const w = Math.sin(t / 60) * 5; g.beginPath(); g.moveTo(-11, -22); g.lineTo(-19, -38 + w); g.moveTo(11, -22); g.lineTo(19, -38 - w); g.stroke(); }
  else { const w = Math.sin(ph) * 3 * walk; g.beginPath(); g.moveTo(-12, -16); g.lineTo(-16, -9 + w); g.moveTo(12, -16); g.lineTo(16, -9 - w); g.stroke(); }
  // gövde: jöle fasulye
  const gr = g.createRadialGradient(-5, -26, 2, 0, -17, 20); gr.addColorStop(0, lt); gr.addColorStop(.6, c); gr.addColorStop(1, shade(c, -.15));
  g.beginPath(); g.moveTo(0, -36); g.bezierCurveTo(13, -36, 14, -22, 13, -12); g.bezierCurveTo(12, -2, 6, 0, 0, 0); g.bezierCurveTo(-6, 0, -12, -2, -13, -12); g.bezierCurveTo(-14, -22, -13, -36, 0, -36); g.closePath();
  g.fillStyle = gr; g.fill(); g.lineWidth = 2.2; g.strokeStyle = dk; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-6, -28, 3, 5, -.4, 0, TAU); g.fill();
  // yüz (baktığı yöne kayar; arkası dönükse gizlenir)
  if (fy > -.6 || falling) {
    const ex = fx * 4, ey = -22 + fy * 2;
    g.fillStyle = 'rgba(20,10,40,.85)'; g.beginPath(); g.ellipse(ex, ey, 9.5, 5.6, 0, 0, TAU); g.fill();
    const blink = !falling && Math.sin(t / 900 + c.length * 7) > .985;
    [-1, 1].forEach(sd => {
      const x = ex + sd * 4;
      if (blink) { g.strokeStyle = '#ffffff'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - 2, ey); g.lineTo(x + 2, ey); g.stroke(); }
      else { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x + fx * .8, ey, falling ? 2.6 : 2.1, falling ? 3.2 : 2.7, 0, 0, TAU); g.fill(); }
    });
    if (falling) { g.fillStyle = '#2a0a20'; g.beginPath(); g.ellipse(ex, -13, 2.4, 3, 0, 0, TAU); g.fill(); }
  }
  // güçlendirme simgeleri
  if (o.kal) { g.strokeStyle = `rgba(255,211,77,${.55 + .3 * Math.sin(t / 150)})`; g.lineWidth = 2.5; g.beginPath(); g.ellipse(0, -18, 20, 24, 0, 0, TAU); g.stroke(); }
  if (o.haf) { g.fillStyle = 'rgba(159,232,255,.85)'; for (let i = 0; i < 2; i++) { const a = t / 300 + i * Math.PI; g.beginPath(); g.ellipse(Math.cos(a) * 16, -6 + Math.sin(a) * 4, 4, 2, a, 0, TAU); g.fill(); } }
  if (o.zip) { g.strokeStyle = '#6dff8a'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 4; i++) g.lineTo(i % 2 ? -5 : 5, 3 + i * 2.5); g.stroke(); }
  g.restore();
}
function pill(g, X, Y, text, bg, fg) {
  g.save();
  g.font = '900 11px "Nunito","Segoe UI",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = Math.min(110, g.measureText(text).width + 12);
  g.beginPath(); if (g.roundRect) g.roundRect(X - w / 2, Y - 8, w, 16, 8); else g.rect(X - w / 2, Y - 8, w, 16);
  g.fillStyle = bg; g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = fg; g.fillText(text, X, Y + .5, 100);
  g.restore();
}
function drawPlayer(g, i, pos, T, t) {
  const p = V.players[i], me = i === V.me, xf = xfOf(pos.z - cam.z);
  const alpha0 = xf.d < 0 ? clamp(1 + xf.d * 1.7, 0, 1) : 1; if (alpha0 <= .02) return;
  const X = xf.ox + pos.x * xf.s, Y = xf.oy + pos.y * xf.sy, f = V.fx[i] || {};
  const falling = Math.abs(pos.z - Math.round(pos.z)) > .02 || (me && av && av.fall >= 0);
  let alpha = alpha0 * (p.online ? 1 : .55);
  if (pos.z > A.NF - .2) alpha *= clamp(1 - (pos.z - A.NF + .2) / 1.2, 0, 1);
  drawBean(g, X, Y, xf.s, { t, col: p.color, h: pos.h, walk: pos.walk, ph: pos.ph, hop: pos.hop, sq: pos.sq, falling, alpha, ring: me && V.phase === 'play' && !V.out[i] ? '#ffffff' : null, kal: f.kal > T, haf: f.haf > T, zip: f.zip > T });
  if (alpha > .3 && xf.d > -.3 && xf.d < 1.2) pill(g, X, Y - ((pos.hop || 0) + 58) * xf.s, me ? 'SEN' : p.name, me ? '#ffffff' : p.color, '#1a0b3d');
  if (!p.online && alpha > .2) { g.save(); g.font = '900 12px "Nunito",sans-serif'; g.fillStyle = '#ffffff'; g.fillText('z z', X + 18 * xf.s, Y - 40 * xf.s); g.restore(); }
}
function drawParts(g, maxZ) {
  for (const p of parts) {
    if (Math.abs(p.z - maxZ) > .01) continue;
    const xf = xfOf(p.z - cam.z), X = xf.ox + p.x * xf.s, Y = xf.oy + p.y * xf.sy - p.hgt * xf.s, a = clamp(p.life / p.max, 0, 1);
    g.globalAlpha = a * (xf.d < 0 ? clamp(1 + xf.d * 1.7, 0, 1) : 1);
    if (p.k === 'chunk') { g.fillStyle = p.c; g.beginPath(); g.moveTo(X, Y - p.r * xf.s); g.lineTo(X + p.r * xf.s, Y); g.lineTo(X, Y + p.r * .6 * xf.s); g.lineTo(X - p.r * xf.s, Y); g.closePath(); g.fill(); }
    else { g.fillStyle = p.c; g.beginPath(); g.arc(X, Y, p.r * xf.s * (1.6 - a * .6), 0, TAU); g.fill(); }
  }
  g.globalAlpha = 1;
}
function drawAnims(g, t) {
  anims = anims.filter(a => t - a.start < a.dur);
  for (const a of anims) {
    const u = clamp((t - a.start) / a.dur, 0, 1), xf = xfOf(a.z - cam.z), X = xf.ox + a.x * xf.s, Y = xf.oy + a.y * xf.sy;
    if (a.k === 'ring') { g.save(); g.globalAlpha = 1 - u; g.strokeStyle = a.col; g.lineWidth = 3 * (1 - u) + 1; g.beginPath(); g.ellipse(X, Y, (10 + u * a.r) * xf.s, (10 + u * a.r) * xf.sy, 0, 0, TAU); g.stroke(); g.restore(); }
    else if (a.k === 'text') {
      const s = u < .2 ? .5 + u / .2 * .7 : u < .3 ? 1.2 - (u - .2) * 2 : 1;
      g.save(); g.globalAlpha = u > .7 ? (1 - u) / .3 : 1; g.translate(X, Y - 50 * xf.s - u * 30); g.scale(s, s);
      g.font = `${a.size || 24}px "Bungee","Arial Black",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 5; g.strokeStyle = a.stroke || '#3a0a2a'; g.lineJoin = 'round'; g.strokeText(a.txt, 0, 0); g.fillStyle = a.col || '#ffe14a'; g.fillText(a.txt, 0, 0);
      g.restore();
    }
  }
}
let abyssSpr = null;
function drawAbyss(g, t) {
  const d = A.NF + .45 - cam.z, xf = xfOf(d), X = xf.ox, Y = xf.oy, R = (A.G.LIM * 1.5) * xf.s;
  if (!abyssSpr) {
    const c = document.createElement('canvas'); c.width = 256; c.height = Math.round(256 * TILT); const a = c.getContext('2d');
    a.scale(1, TILT); const gr = a.createRadialGradient(128, 128, 6, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,63,164,.55)'); gr.addColorStop(.45, 'rgba(160,30,140,.32)'); gr.addColorStop(1, 'rgba(40,6,60,0)');
    a.fillStyle = gr; a.beginPath(); a.arc(128, 128, 128, 0, TAU); a.fill(); abyssSpr = c;
  }
  g.drawImage(abyssSpr, X - R, Y - R * TILT, 2 * R, 2 * R * TILT);
  g.strokeStyle = '#ffb3e0'; g.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const k = ((t / 2400) + i * .37) % 1, a = i * 2.4, rr = (.15 + (i % 4) * .17) * R;
    g.globalAlpha = Math.sin(k * Math.PI) * .6;
    g.beginPath(); g.arc(X + Math.cos(a) * rr, Y + Math.sin(a) * rr * TILT - k * 14, 3 + k * 6, 0, TAU); g.stroke();
  }
  g.globalAlpha = 1;
}
function draw(t) {
  const g = cg, T = hostClock();
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!bgGrad || bgGrad.h !== sh) { bgGrad = g.createLinearGradient(0, 0, 0, sh); bgGrad.addColorStop(0, '#1d0b45'); bgGrad.addColorStop(1, '#07021a'); bgGrad.h = sh; }
  g.fillStyle = bgGrad; g.fillRect(0, 0, sw, sh);
  drawAbyss(g, t);
  // oyuncular kat kovalarına: z ∈ (f-1, f] → f katının hemen üstünde çizilir
  const buckets = Array.from({ length: A.NF + 1 }, () => []);
  V.players.forEach((_, i) => {
    const pos = posOf(i); if (!pos || pos.z > A.NF + 1.2) return;
    if (i !== V.me && !rp[i]) return;
    const b = clamp(Math.ceil(pos.z - 1e-3), 0, A.NF); buckets[b].push({ i, pos });
  });
  const drawBucket = b => {
    const list = buckets[b].map(o => ({ y: o.pos.y, o }));
    if (b < A.NF) {
      (V.items || []).forEach(it => { if (it.f === b) list.push({ y: it.y, it }); });
      A.blocks.forEach(o => { if (o.f === b) { const bi = o.f * A.NT + o.k; if (!(TL[bi] && T >= TL[bi])) list.push({ y: o.y, bl: o }); } });
    }
    list.sort((a, c) => a.y - c.y);
    const xf = xfOf(b - cam.z);
    for (const e of list) { if (e.it) drawItem(g, e.it, xf, t); else if (e.bl) drawBlock(g, e.bl, xf, t); else drawPlayer(g, e.o.i, e.o.pos, T, t); }
  };
  drawBucket(A.NF);
  for (let f = A.NF - 1; f >= 0; f--) {
    const d = f - cam.z; if (d < -.65) continue;
    const xf = xfOf(d), ud = d - 1;
    const up = f > 0 && ud >= 0 ? { xf: xfOf(ud), cov: coverOf(f - 1, T) } : null;
    drawFloor(g, f, xf, T, t, up);
    drawArms(g, f, xf, T);
    drawParts(g, f);
    drawBucket(f);
  }
  drawAnims(g, t);
}
function drawMini() {
  if (!miniCv || !V || !A) return;
  const g = miniCv.getContext('2d'), w = miniCv.width, h = miniCv.height, T = hostClock(), t = pnow();
  if (!w || !h) return;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
  const NF = A.NF, rowH = h / NF, G = A.G, sc = Math.min((w - 20 * dpr) / (2 * (G.LIM + S)), (rowH - 6 * dpr) / (2 * (G.LIM + S) * .86));
  const fz = Math.round(clamp(focus().z || 0, 0, NF - 1));
  for (let f = 0; f < NF; f++) {
    const cx = 10 * dpr + (w - 10 * dpr) / 2, cy = rowH * f + rowH / 2, on = f === fz;
    g.fillStyle = on ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.25)';
    g.beginPath(); if (g.roundRect) g.roundRect(2 * dpr, rowH * f + 2 * dpr, w - 4 * dpr, rowH - 4 * dpr, 7 * dpr); else g.rect(2 * dpr, rowH * f + 2 * dpr, w - 4 * dpr, rowH - 4 * dpr); g.fill();
    if (on) { g.strokeStyle = '#ffffff'; g.lineWidth = 1.5 * dpr; g.stroke(); }
    g.font = `900 ${10 * dpr}px "Nunito",sans-serif`; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,.6)'; g.fillText(String(f + 1), 5 * dpr, rowH * f + 4 * dpr);
    const r = Math.max(1, S * .8 * sc), base = f * A.NT;
    for (let k = 0; k < A.NT; k++) {
      const idx = base + k; if (!tileSolid(A, TL, V.calls, idx, T)) continue;
      const c = G.cells[k]; g.fillStyle = TL[idx] ? '#fff6c8' : tileBase(f, idx);
      g.fillRect(cx + c.x * sc - r, cy + c.y * sc * .86 - r * .8, r * 2, r * 1.6);
    }
    V.players.forEach((p, i) => {
      if (V.out[i]) return; const pos = posOf(i); if (Math.round(clamp(pos.z, 0, NF - 1)) !== f || Math.abs(pos.z - f) > .5) return;
      const me = i === V.me, rr = (me ? 3.4 : 2.6) * dpr;
      g.fillStyle = p.color; g.beginPath(); g.arc(cx + pos.x * sc, cy + pos.y * sc * .86, rr, 0, TAU); g.fill();
      g.strokeStyle = me ? '#ffffff' : '#1a0b3d'; g.lineWidth = (me ? 1.6 : 1) * dpr; g.stroke();
    });
  }
  void t;
}
function frame() {
  raf = 0; if (!root || !cv) return;
  raf = requestAnimationFrame(frame);
  if (!V || !A || !TL) return;
  const t = pnow(), dt = clamp((t - (lastT || t)) / 1000, 0, .25); lastT = t; frameN++;
  const p0 = pnow(); stepMe(dt, t); stepRemotes(dt, t); stepParts(dt); camFollow(dt);
  const p1 = pnow(); draw(t);
  const p2 = pnow(); if (frameN % 4 === 0) drawMini();
  const p3 = pnow(); perfAcc.step += p1 - p0; perfAcc.draw += p2 - p1; perfAcc.mini += p3 - p2; perfAcc.n++; perfAcc.gap += t - perfAcc.last; perfAcc.last = t;
}

/* ---- HUD ---- */
function chipTag(v, i) {
  if (v.out[i]) return `<span class="dz-tag out">💀 ${v.place[i]}.</span>`;
  if (v.phase === 'end' && v.place[i] === 1) return '<span class="dz-tag win">🏆</span>';
  return `<span class="dz-tag fl f${Math.min(v.fl[i], 3)}">K${v.fl[i] + 1}</span>`;
}
function renderHud() {
  const v = V, me = v.me;
  const ck = JSON.stringify([v.players.map(p => [p.name, p.online, p.score]), v.fl, v.out, v.place, me, v.phase, v.round]);
  if (ck !== chipKey) {
    chipKey = ck;
    const box = q('.dz-players'); box.classList.toggle('compact', v.players.length > 4);
    box.innerHTML = v.players.map((p, i) => `<div class="g-chip dz-chip ${i === me ? 'me' : ''} ${!p.online || v.out[i] ? 'off' : ''}" style="--pc:${p.color}">
      <span class="av" style="--pc:${p.color}">${initial(p.name)}</span><b>${esc(p.name)}${i === me ? '<small> · sen</small>' : ''}</b>${chipTag(v, i)}<span class="g-num">${p.score}</span></div>`).join('');
  }
  const al = vAlive(v).length, n = v.players.length;
  let st = '', cls = '';
  if (v.phase === 'count') st = me < 0 ? '👀 Tur başlıyor…' : '⏳ Hazırlan! Bastığın karo yanar ve düşer — durma!';
  else if (v.phase === 'play') {
    if (me < 0) st = `👀 İzliyorsun · Hayatta ${al}/${n}`;
    else if (v.out[me]) st = `👀 Elendin — ${v.place[me]}. oldun · izliyorsun`;
    else { st = `🟢 Kat ${Math.min(v.fl[me], A.NF - 1) + 1}/${A.NF} · Hayatta ${al}/${n}`; cls = 'dz-live'; }
  } else if (v.phase === 'end') { st = `🏁 Tur ${v.round}/${v.rounds} bitti!`; cls = 'win'; }
  else { st = '🏆 Oyun bitti!'; cls = 'win'; }
  q('.dz-status').innerHTML = `<span class="g-turn ${cls}">${st}</span>`;
  const md = MODES[v.mode]; q('.dz-mode').textContent = `${md.icon} ${md.short} · Tur ${v.round}/${v.rounds}`;
  q('.dz-alive').textContent = `👥 ${al}/${n}`;
}
function renderSide() {
  const v = V, side = q('.dz-side'); if (!side) return;
  const key = `${v.mode}:${v.pu}`;
  if (key !== sideKey) {
    sideKey = key;
    const rules = {
      klasik: ['⬢ Üst üste 3 kat var. Bastığın karo yanar ve ~0,6 sn sonra düşer.', '⬇️ Düşen karonun yerinden alt kata düşersin; en alttan düşen elenir.', '🦘 Zıplayarak boşlukların üstünden geç — inişte karo yine tetiklenir.', '🏆 Son ayakta kalan kazanır. Süre bitince zemin kenardan çöker.'],
      renk: ['🎨 Karolar dört renkte. Bir renk anons edilir: uyarıdan sonra o renkteki karolar bir süre yok olur!', '🏃 Anons gelince başka renge koş ya da zıpla.', '⬢ Bastığın karolar da (1 sn sonra) kalıcı olarak düşer.', '🏆 Son ayakta kalan kazanır.'],
      sumo: ['🌀 Her katta dönen kollar var: önüne gelen fırlatılır — üstünden zıpla!', '🔴 Kırmızı tamponlar seni geri sektirir.', '⬢ Bastığın karo ~0,75 sn sonra düşer; en alttan düşen elenir.', '🛡️ Kalkan, kol ve tampon itkisini engeller.']
    }[v.mode];
    const md = MODES[v.mode];
    side.innerHTML = `<h3 class="dz-h">${md.icon} ${esc(md.name)}</h3>
      <ul class="dz-rules">${rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
      ${v.pu ? `<div class="dz-legend"><span class="dz-lh">Güçlendirmeler</span>${ITEM_IDS.map(k => `<div class="dz-li"><canvas data-ic="${k}" width="64" height="64"></canvas><span><b>${esc(ITEMS[k].name)}</b><small>${esc(ITEMS[k].desc)}</small></span></div>`).join('')}</div>` : '<p class="dz-sub">Güçlendirmeler kapalı.</p>'}
      <p class="dz-keys">${isTouch() ? '👆 Ekranda parmağını sürükleyerek yürü · sağ alttaki <b>ZIPLA</b> ile zıpla' : '⌨️ <b>WASD / oklar</b> ile yürü · <b>Boşluk</b> ile zıpla · fareyle sürükleyerek de yürüyebilirsin'}</p>
      <div class="dz-board"></div>`;
    side.querySelectorAll('canvas[data-ic]').forEach(c => { const g = c.getContext('2d'); g.clearRect(0, 0, 64, 64); g.translate(32, 32); g.fillStyle = ITEMS[c.dataset.ic].col; g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.fill(); drawItemIcon(g, c.dataset.ic, 1.6); });
  }
  const rows = v.players.map((p, i) => ({ p, i })).sort((a, b) => b.p.score - a.p.score || (v.out[a.i] ? 1 : 0) - (v.out[b.i] ? 1 : 0));
  q('.dz-board').innerHTML = `<span class="dz-lh">Puan durumu${v.rounds > 1 ? ` · tur ${v.round}/${v.rounds}` : ''}</span><ol class="dz-res">${rows.map(({ p, i }) => `<li style="--pc:${p.color}" class="${v.out[i] ? 'out' : ''}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><span class="dz-rn"><b>${esc(p.name)}${i === v.me ? ' (sen)' : ''}</b><small>${v.out[i] ? `${v.place[i]}. oldu` : `Kat ${Math.min(v.fl[i], A.NF - 1) + 1}`}${p.isBot ? ' · bilgisayar' : ''}${v.places[i].length ? ' · ' + v.places[i].map(x => x + '.').join(' ') : ''}</small></span><span class="dz-pts">${p.score}</span></li>`).join('')}</ol>`;
}
function renderOverlays() {
  const v = V, me = v.me;
  const cnt = q('.dz-count');
  if (v.phase === 'count') {
    const md = MODES[v.mode];
    const tip = { klasik: 'Durma! Bastığın karo düşer.', renk: 'Anons edilen renkten uzak dur!', sumo: 'Dönen kolların üstünden zıpla!' }[v.mode];
    cnt.innerHTML = `<div class="dz-ccard"><small>TUR ${v.round}/${v.rounds}</small><h3>${md.icon} ${esc(md.name)}</h3><p class="dz-ctip">${esc(tip)}</p><b class="dz-cnum">3</b><p class="dz-chint">${isTouch() ? 'Sürükle: yürü · ZIPLA: zıpla' : 'WASD / oklar: yürü · Boşluk: zıpla'}</p></div>`;
    cnt.hidden = false;
  } else cnt.hidden = true;
  const en = q('.dz-end');
  if ((v.phase === 'end' || v.phase === 'over') && v.last) {
    const L = v.last, rows = L.rows.slice().sort((a, b) => a.place - b.place);
    const wins = rows.filter(r => r.place === 1);
    const h3 = wins.length === 1 ? `🏆 ${esc(v.players[wins[0].pi].name)}` : '🤝 Berabere!';
    en.innerHTML = `<div class="dz-ecard"><small>TUR ${L.round}/${v.rounds}</small><h3>${h3}</h3><p class="dz-esub">${wins.length === 1 ? 'Son ayakta kalan!' : 'Aynı anda düştüler'}</p>
      <ol class="dz-res">${rows.map(r => { const p = v.players[r.pi]; return `<li class="${r.place === 1 ? 'win' : ''}" style="--pc:${p.color}"><span class="dz-pl">${r.place}.</span><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><span class="dz-rn"><b>${esc(p.name)}${r.pi === me ? ' (sen)' : ''}</b></span><span class="dz-pts">+${r.pts}</span></li>`; }).join('')}</ol>
      <p class="dz-enext">${v.phase === 'over' || v.round >= v.rounds ? 'Sonuçlar geliyor…' : 'Sıradaki tur birazdan başlıyor…'}</p></div>`;
    en.hidden = false;
  } else en.hidden = true;
  const spec = q('.dz-spec');
  const showSpec = v.phase === 'play' && (me < 0 || v.out[me]);
  spec.hidden = !showSpec;
  if (showSpec) {
    const tEl = spec.querySelector('.dz-spec-t'), nEl = spec.querySelector('.dz-spec-n');
    tEl.innerHTML = me >= 0 ? `Elendin – <b>${v.place[me]}.</b> oldun` : 'İzleyici modu';
    const al = vAlive(v); if (!al.includes(specT)) specT = al.length ? al[0] : -1;
    nEl.innerHTML = specT >= 0 ? `👀 <b style="color:${v.players[specT].color}">${esc(v.players[specT].name)}</b> izleniyor` : '';
  }
  if (jumpBtn) { jumpBtn.hidden = me < 0 || v.out[me]; jumpBtn.disabled = v.phase !== 'play'; }
  if (me < 0 || v.out[me]) { joy.on = false; joy.dx = joy.dy = 0; if (joyEl) joyEl.hidden = true; const hint = q('.dz-joyhint'); if (hint) hint.hidden = true; }
}
function hudTick() {
  if (!V || !root || !A) return;
  const v = V, T = hostClock(), left = Math.max(0, v.endsAt - T), secs = Math.ceil(left / 1000);
  const tm = q('.dz-timer'), tb = tm.querySelector('b');
  tb.textContent = v.phase === 'play' ? (v.sudden ? 'ANİ ÖLÜM' : mmss(secs)) : v.phase === 'count' ? mmss(v.dur) : '—';
  tm.classList.toggle('urgent', v.phase === 'play' && (v.sudden || secs <= 10));
  const bar = q('.dz-bar i'); if (bar) bar.style.width = (v.phase === 'play' && !v.sudden ? clamp(left / (v.phaseDur || 1), 0, 1) * 100 : v.phase === 'count' ? 100 : 0) + '%';
  const cn = q('.dz-cnum'); if (cn && v.phase === 'count') cn.textContent = Math.max(1, secs);
  if (secs !== lastSec) { if (v.phase === 'count' && secs > 0 && secs <= 3) Sound.tick(.8); else if (v.phase === 'play' && !v.sudden && secs <= 5 && secs > 0) Sound.tick(.5); lastSec = secs; }
  // renk anonsu
  const callEl = q('.dz-call');
  if (callEl) {
    let cur = null; for (const c of v.calls || []) if (T < c.until && T >= c.w) cur = c;
    if (cur && v.phase === 'play') {
      const warn = T < cur.at, k = `${cur.c}:${cur.at}:${warn}`;
      if (k !== lastCallKey) {
        lastCallKey = k;
        callEl.style.setProperty('--cc', COLS[cur.c]);
        callEl.innerHTML = `<i></i><span>${warn ? `<b>${COL_NAMES[cur.c]}</b> düşecek!` : `<b>${COL_NAMES[cur.c]}</b> yok oldu!`}</span><em><u></u></em>`;
        callEl.classList.toggle('gone', !warn);
        if (warn) snd.warn();
      }
      const u = warn ? clamp((cur.at - T) / Math.max(1, cur.at - cur.w), 0, 1) : clamp((cur.until - T) / Math.max(1, cur.until - cur.at), 0, 1);
      const bu = callEl.querySelector('u'); if (bu) bu.style.width = (u * 100) + '%';
      callEl.hidden = false;
    } else { callEl.hidden = true; lastCallKey = ''; }
  }
  const me = v.me, fxEl = q('.dz-fx');
  if (fxEl) {
    const f = me >= 0 ? v.fx[me] : null, chips = [];
    if (f && v.phase === 'play' && !v.out[me]) ITEM_IDS.forEach(k => { if (f[k] > T) chips.push(`<span class="dz-fxc ${k}">${{ zip: '🦘', haf: '🪶', kal: '🛡️' }[k]} ${ITEMS[k].short} ${Math.ceil((f[k] - T) / 1000)}</span>`); });
    const s = chips.join(''); if (fxEl.innerHTML !== s) fxEl.innerHTML = s;
  }
  if (pnow() - layoutAt > 1500) { layoutAt = pnow(); layout(); }
}
function render(v) {
  V = v;
  if (!v || !root || !MODES[v.mode]) return;
  const me = v.me;
  if (v.spawnVer !== seenSpawn) {
    seenSpawn = v.spawnVer;
    A = arena(v.mode, v.seed);
    TL = new Float64Array(A.NF * A.NT); pred = new Float64Array(A.NF * A.NT); crumb = new Uint8Array(A.NF * A.NT);
    rp = []; v.pos.forEach((p, i) => { rp[i] = mkRemote(p, v.fl[i]); });
    av = me >= 0 ? newAv(v.pos[me], v.fl[me]) : null;
    parts = []; anims = []; stepped = []; snapCam = true; specT = -1; outAtLocal = 0; lastSent = null;
    cam.z = 0;
  }
  parseTiles(v);
  if (me >= 0 && !av) av = newAv(v.pos[me], v.fl[me]);
  if (av && me >= 0 && v.phase === 'play') {   // yöneten cihazın düzeltmeleri
    const local = av.fall >= 0 ? av.fall : av.f;
    if (v.out[me] && !av.gone && av.fall < A.NF) { av.fall = A.NF; if (av.vz <= 0) av.vz = .4; }
    else if (!v.out[me] && v.fl[me] > local) { av.fall = v.fl[me]; if (av.vz <= 0) av.vz = .4; dzStats.corrections++; }
  }
  const key = `${v.round}:${v.phase}`;
  if (key !== seenKey) { seenKey = key; lastSec = -1; if (v.phase === 'count') requestAnimationFrame(resize); }
  const wrap = q('.dz'); wrap.dataset.phase = v.phase; wrap.dataset.mode = v.mode;
  renderHud(); renderSide(); renderOverlays(); hudTick();
  if (!raf) raf = requestAnimationFrame(frame);
}

/* ---- olaylar ---- */
function onEvent(e) {
  if (!root || !V || !A) return;
  const me = ui ? ui.me : -1, t = pnow();
  const P = i => (V.players[i] ? V.players[i].name : '?');
  if (e.t === 'round') Sound.special();
  else if (e.t === 'go') { pop('BAŞLA!', 'good'); Sound.stop(); Sound.whoosh(); }
  else if (e.t === 'floor') {
    const pos = posOf(e.pi);
    if (e.pi === me) { pop(`KAT ${e.f + 1}`, 'pink'); if (e.forced) flash('bad'); }
    else anims.push({ k: 'ring', x: pos.x, y: pos.y, z: e.f, col: V.players[e.pi] ? V.players[e.pi].color : '#fff', start: t, dur: 600, r: 50 });
  } else if (e.t === 'elim') {
    if (e.pi === me) { pop(`ELENDİN! ${e.place}.`, 'bad'); flash('bad'); Sound.bankrupt(); outAtLocal = pnow(); }
    else { Sound.bad(); toast(`💥 ${P(e.pi)} elendi (${e.place}.)`, 'bad'); }
  } else if (e.t === 'last') {
    const banner = window.CFX.banner; if (banner) banner(e.n === 3 ? 'SON 3!' : 'SON 2!', 'pink');
    Sound.special();
  } else if (e.t === 'pick') {
    anims.push({ k: 'ring', x: e.x, y: e.y, z: e.f, col: ITEMS[e.k].col, start: t, dur: 500, r: 46 }, { k: 'text', x: e.x, y: e.y, z: e.f, txt: ITEMS[e.k].short.toLocaleUpperCase('tr-TR') + '!', col: ITEMS[e.k].col, start: t, dur: 1000, size: 20 });
    if (e.pi === me) { snd.pick(); toast(`${ITEMS[e.k].name}: ${ITEMS[e.k].desc}`, 'ok'); } else Sound.tick(.3);
  } else if (e.t === 'call') { snd.warn(); pop(`${COL_NAMES[e.c]}!`, 'pink'); }
  else if (e.t === 'sudden') { pop('ANİ ÖLÜM!', 'bad'); Sound.bad(); }
  else if (e.t === 'roundEnd') {
    Sound.solve();
    const won = Array.isArray(e.wins) && e.wins.includes(me);
    pop(won ? 'KAZANDIN!' : e.wins && e.wins.length === 1 ? `${P(e.wins[0]).toLocaleUpperCase('tr-TR')} KAZANDI` : 'BERABERE', won ? 'good' : 'pink');
    if (won) FX.confetti(110); else FX.confetti(40);
  }
}

/* ---- giriş ---- */
function onDown(e) {
  if (e.target.closest && e.target.closest('button')) return;
  if (!V || V.me < 0 || V.out[V.me] || joy.on) return;
  e.preventDefault(); Sound.init();
  const r = stageEl.getBoundingClientRect();
  joy.on = true; joy.id = e.pointerId; joy.bx = e.clientX - r.left; joy.by = e.clientY - r.top; joy.dx = joy.dy = 0;
  try { stageEl.setPointerCapture(e.pointerId); } catch { /* */ }
  if (joyEl) { joyEl.hidden = false; joyEl.style.left = joy.bx + 'px'; joyEl.style.top = joy.by + 'px'; joyEl.querySelector('i').style.transform = ''; }
  const hint = q('.dz-joyhint'); if (hint) hint.hidden = true;
}
function onMove(e) {
  if (!joy.on || e.pointerId !== joy.id) return;
  const r = stageEl.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  let dx = (x - joy.bx) / JR, dy = (y - joy.by) / JR; const l = Math.hypot(dx, dy);
  if (l > 1.25) { joy.bx = x - dx / l * JR * 1.25; joy.by = y - dy / l * JR * 1.25; if (joyEl) { joyEl.style.left = joy.bx + 'px'; joyEl.style.top = joy.by + 'px'; } }
  if (l > 1) { dx /= l; dy /= l; }
  const dead = Math.hypot(dx, dy) < .14;
  // ekran eğik çizildiği için dikey girdiyi dünyaya çevir (TILT telafisi yok: doğal his)
  joy.dx = dead ? 0 : dx; joy.dy = dead ? 0 : dy;
  if (joyEl) joyEl.querySelector('i').style.transform = `translate(${dx * JR * .7}px, ${dy * JR * .7}px)`;
}
function onUp(e) { if (e.pointerId !== joy.id) return; joy.on = false; joy.id = null; joy.dx = joy.dy = 0; if (joyEl) joyEl.hidden = true; }
function onKey(e) {
  if (!V || !root || (e.target && e.target.closest && e.target.closest('input,textarea,select'))) return;
  const codes = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'];
  if (e.type === 'keydown') {
    if (codes.includes(e.code)) { keys.add(e.code); if (V.me >= 0) e.preventDefault(); }
    else if (e.code === 'Space' && V.me >= 0) { e.preventDefault(); if (!e.repeat) doJump(); }
  } else keys.delete(e.code);
}
function onBlur() { keys.clear(); joy.on = false; joy.dx = joy.dy = 0; if (joyEl) joyEl.hidden = true; }
function cycleSpec(dir) {
  if (!V) return; const al = vAlive(V); if (!al.length) return;
  const i = al.indexOf(specT); specT = al[((i < 0 ? 0 : i + dir) % al.length + al.length) % al.length];
  snapCam = false; renderOverlays();
}

function mount(r, api) {
  root = r; ui = api; uiRef = api; V = null; A = null; TL = null; av = null; rp = []; keys = new Set(); parts = []; anims = []; stepped = [];
  seenSpawn = -1; seenKey = ''; chipKey = ''; sideKey = ''; lastT = 0; snapCam = true; specT = -1; dustAt = {}; lastCallKey = '';
  root.innerHTML = `<div class="g-wrap dz">
    <div class="dz-hud"><div class="dz-players"></div><div class="dz-status"></div></div>
    <div class="dz-main">
      <div class="dz-stage">
        <canvas class="dz-cv" aria-label="Düşen Zemin arenası"></canvas>
        <div class="dz-tl"><span class="dz-mode"></span><div class="dz-row"><span class="dz-timer">⏱ <b>0:00</b></span><span class="dz-alive"></span></div><div class="dz-bar"><i></i></div><div class="dz-fx"></div></div>
        <canvas class="dz-mini" aria-label="Kat haritası"></canvas>
        <div class="dz-call" hidden></div>
        <div class="dz-joy" hidden><i></i></div>
        <div class="dz-joyhint" hidden><i></i><span>Sürükle ve yürü</span></div>
        <button type="button" class="dz-jump" aria-label="Zıpla"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 8h-4.5v6h-5v-6H5z" fill="currentColor"/><rect x="7" y="19" width="10" height="2.4" rx="1.2" fill="currentColor"/></svg><span>ZIPLA</span></button>
        <div class="dz-pop" aria-live="polite"></div>
        <div class="dz-toast" aria-live="polite"></div>
        <div class="dz-spec" hidden><button type="button" class="dz-sb" data-d="-1" aria-label="Önceki oyuncu">◀</button><div class="dz-spec-b"><span class="dz-spec-t"></span><span class="dz-spec-n"></span></div><button type="button" class="dz-sb" data-d="1" aria-label="Sonraki oyuncu">▶</button></div>
        <div class="dz-count" hidden></div>
        <div class="dz-end" hidden></div>
      </div>
      <aside class="dz-side g-panel"></aside>
    </div>
  </div>`;
  cv = q('.dz-cv'); cg = cv.getContext('2d'); stageEl = q('.dz-stage'); miniCv = q('.dz-mini'); jumpBtn = q('.dz-jump'); joyEl = q('.dz-joy');
  if (isTouch()) q('.dz-joyhint').hidden = false;
  stageEl.addEventListener('pointerdown', onDown); stageEl.addEventListener('pointermove', onMove);
  stageEl.addEventListener('pointerup', onUp); stageEl.addEventListener('pointercancel', onUp);
  stageEl.addEventListener('contextmenu', e => e.preventDefault());
  jumpBtn.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); doJump(); });
  jumpBtn.addEventListener('click', e => e.preventDefault());
  root.querySelectorAll('.dz-sb').forEach(b => { b.addEventListener('pointerdown', e => e.stopPropagation()); b.addEventListener('click', () => cycleSpec(+b.dataset.d)); });
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
  raf = 0; root = null; ui = null; uiRef = null; V = null; A = null; TL = null; cv = null; cg = null; stageEl = null; miniCv = null; jumpBtn = null; joyEl = null; av = null; rp = [];
}

window.CFX.registerGame(Object.assign({
  id: 'dusenzemin', name: 'Düşen Zemin', icon: '🟪', color: '#ff5fb0', min: 2, max: 8, hotseat: false, bot: true, localMin: 1,
  tagline: 'Basınca düşen altıgenler: son ayakta kalan kazanır!',
  rules: 'Üst üste dizili altıgen katlarda koş: bastığın karo yanar ve kısa süre sonra düşer, sen de alt kata inersin. En alt kattan düşen elenir; son ayakta kalan turu kazanır. Zıplayarak boşlukları aş, güçlendirmeleri kap.',
  options: [
    { key: 'mod', label: 'Arena', def: 'klasik', choices: [{ v: 'klasik', label: '🔷 Klasik Altıgen' }, { v: 'renk', label: '🎨 Renk Çılgınlığı' }, { v: 'sumo', label: '🌀 Dönen Kollar' }] },
    { key: 'sure', label: 'Süre (sonra ani ölüm)', def: '60', choices: [{ v: '45', label: '45 sn' }, { v: '60', label: '60 sn' }, { v: '90', label: '90 sn' }, { v: '120', label: '120 sn' }] },
    { key: 'guc', label: 'Güçlendirmeler', def: '1', choices: [{ v: '1', label: 'Açık' }, { v: '0', label: 'Kapalı' }] },
    { key: 'tur', label: 'Tur sayısı', def: '1', choices: [{ v: '1', label: '1 tur' }, { v: '3', label: '3 tur' }] }
  ],
  mount, render, onEvent, onFast, unmount,
  // test ve geliştirme için dışa açık yardımcılar
  _dz: { stats: dzStats, frames: () => frameN, perf: () => perfAcc, MODES, ITEMS, S, RIN, HWD, PR, GRACE, PTS, HAF_DELAY, JUMP_MS, BASE, geom, arena, cellAt, axialRound, supportCell, tileSolid, insideHex, trig, applyPos, claimFall, forceFall, eliminate, endRound, newRound, encTiles, decTiles, phys, rimClamp, freshTile, botPlan, humansTick, tick,
    av: () => av, rp: () => rp, TL: () => TL, cam: () => cam, A: () => A, toClient: (x, y, z) => toClient(x, y, z), keys: () => keys }
}, RULES));
})();
