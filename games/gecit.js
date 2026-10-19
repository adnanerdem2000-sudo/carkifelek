/* =========================================================================
   GEÇİT KOŞUSU — sonsuz karşıya geçme yarışı (özgün, voksel görünümlü)
     · Parkur, kurucunun seçtiği tohumdan her cihazda AYNI üretilir; araç,
       tren, kütük ve vapur konumları mutlak kurucu saatinden (ui.hostNow)
       hesaplanır — araçları eşitlemeye gerek yoktur.
     · Her cihaz kendi hayvanının zıplamalarını yerelde simüle eder,
       çarpışmayı kendisi fark eder; zıplamalar hamle olarak kurucuya gider,
       hızlı kanaldan (ui.fast) diğerlerine yayılır. Kurucu her zıplamayı ve
       çarpışmayı belirlenimci parkura karşı küçük bir toleransla yeniden
       denetler ve sıralamaya o karar verir.
     · Modlar: Yarış · Hayatta Kal (kartal) · Puan Avı (altın)
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, flash, initial } = window.CFX;

/* ------------------------------------------------------------------ sabitler */
const COLS = 9, HOP = 130, MIN_ROW = -3, PAD = 4, SPAN = COLS + 2 * PAD;
const COUNT_MS = 3600, TICK = 50, RESPAWN_MS = 2000, LAG = 700, SPREAD = 150, LAND_TOL = 120;
const OFF_OUT = 9000, END_GRACE = 1300, RESULT_MS = 2600, BOT_FLUSH = 100, REMOTE_DELAY = 110;
const HW = .3, TRAIN_LEN = 14, TRAIN_SPD = 26, WARN = 1.7;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mod = (a, n) => ((a % n) + n) % n;
const optNum = (v, allowed, def) => { const n = parseInt(v, 10); return allowed.includes(n) ? n : def; };
const MODES = {
  yaris: { name: 'Yarış', icon: '🏁' },
  hayatta: { name: 'Hayatta Kal', icon: '🦅' },
  puan: { name: 'Puan Avı', icon: '🪙' }
};
const DIFFS = { kolay: .82, normal: 1, zor: 1.22 };
const DIFF_NAMES = { kolay: 'Kolay', normal: 'Normal', zor: 'Zor' };
const ANIMALS = ['tavuk', 'kedi', 'ordek', 'kurbaga', 'tilki', 'panda', 'tavsan', 'penguen'];
const ANIMAL_NAMES = { tavuk: 'Tavuk', kedi: 'Kedi', ordek: 'Ördek', kurbaga: 'Kurbağa', tilki: 'Tilki', panda: 'Panda', tavsan: 'Tavşan', penguen: 'Penguen' };
const CAUSES = ['car', 'train', 'water', 'edge', 'eagle', 'off'];
const CAUSE_TXT = { car: 'ezildi', train: 'trene yakalandı', water: 'suya düştü', edge: 'akıntıya kapıldı', eagle: 'kartala yem oldu', off: 'bağlantı koptu' };
const CAUSE_ICON = { car: '🚗', train: '🚆', water: '💦', edge: '🌊', eagle: '🦅', off: '🔌' };

/* ------------------------------------------------------------------ tohumlu rastgelelik */
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash2(a, b) {
  let h = Math.imul((a >>> 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return h >>> 0;
}

/* ------------------------------------------------------------------ PARKUR (belirlenimci) */
const VEH = { araba: 1.3, taksi: 1.3, dolmus: 1.75, otobus: 2.7, kamyon: 2.3, simit: 1.05 };
const CAR_COLS = ['#ff5a5f', '#5aa2ff', '#f4f1ea', '#2bd96b', '#b98bff', '#ff8a00', '#19e3d0', '#ff7eb6'];
class Course {
  constructor(seed, diff, coins) {
    this.seed = seed >>> 0; this.k = DIFFS[diff] || 1; this.coinsOn = !!coins;
    this.rows = new Map(); this.top = MIN_ROW - 1; this.seg = 0; this.path = 4; this.free = false; this.roadD = 1; this.riverD = -1;
    for (let r = MIN_ROW; r <= 2; r++) this.put(this.grass(r, null, 0, 'start'));
  }
  put(L) { this.rows.set(L.r, L); this.top = L.r; }
  lane(r) {
    if (r < MIN_ROW) return this.wall(r);
    while (this.top < r) this.genSeg();
    return this.rows.get(r);
  }
  wall(r) { let L = this.rows.get(r); if (!L) { L = { r, k: 'grass', wall: true, block: new Array(COLS).fill(1), coins: null }; this.rows.set(r, L); } return L; }
  genSeg() {
    const first = this.seg === 0, rng = mulberry(hash2(this.seed, 7919 + this.seg)); this.seg++;
    const r0 = this.top + 1, lv = clamp((r0 - 3) / 150, 0, 1);
    let gN = first ? 0 : (rng() < .5 ? 1 : rng() < .72 ? 2 : 3);
    if (lv > .6 && gN === 3) gN = 2;
    const x = rng();
    let type;
    if (first) type = 'road';
    else if (r0 < 9) type = x < .62 ? 'road' : 'river';
    else type = x < .44 ? 'road' : x < .76 ? 'river' : 'rail';
    for (let i = 0; i < gN; i++) this.put(this.grass(this.top + 1, rng, lv));
    let n;
    if (type === 'road') n = first ? 1 : 1 + Math.floor(rng() * Math.min(5, 2 + 3 * lv + .4));
    else if (type === 'river') n = 1 + Math.floor(rng() * Math.min(4, 2 + 2 * lv + .4));
    else n = rng() < .7 ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const r = this.top + 1;
      this.put(type === 'road' ? this.road(r, rng, lv) : type === 'river' ? this.river(r, rng, lv) : this.rail(r, rng));
    }
  }
  grass(r, rng, lv, kind) {
    const block = new Array(COLS).fill(0), L = { r, k: 'grass', block, coins: null };
    if (kind === 'start') { this.path = 4; this.free = false; L.start = true; return this.coin(L); }
    const open = new Set();
    if (this.free) { this.path = Math.floor(rng() * COLS); open.add(this.path); }
    else {
      const np = clamp(this.path + Math.floor(rng() * 5) - 2, 0, COLS - 1);
      for (let c = Math.min(np, this.path); c <= Math.max(np, this.path); c++) open.add(c);
      this.path = np;
    }
    this.free = false;
    const nObs = Math.floor(rng() * (2.2 + 3 * lv)) + (rng() < .4 ? 1 : 0);
    for (let i = 0; i < nObs; i++) {
      const c = Math.floor(rng() * COLS), q = rng();
      if (!open.has(c)) block[c] = q < .42 ? 1 : q < .62 ? 2 : q < .88 ? 3 : 4;
    }
    return this.coin(L);
  }
  road(r, rng, lv) {
    const d = rng() < .72 ? -this.roadD : this.roadD; this.roadD = d;
    const q = rng(), theme = q < .12 ? 'simit' : q < .36 ? 'heavy' : 'car', k = this.k;
    const s = (theme === 'simit' ? .75 + rng() * .4 : theme === 'heavy' ? 1.15 + rng() * 1.0 + lv * 1.0 : 1.6 + rng() * 1.5 + lv * 1.7) * k;
    const gmin = (theme === 'heavy' ? 2.6 : 2.2) - lv * .45 + (theme === 'simit' ? .5 : 0), gmax = gmin + 3.4 - lv * 1.3;
    const items = []; let pos = rng() * 2;
    for (let guard = 0; guard < 14; guard++) {
      const y = rng();
      const kind = theme === 'simit' ? (y < .7 ? 'simit' : 'araba') : theme === 'heavy' ? (y < .5 ? 'otobus' : 'kamyon') : (y < .5 ? 'araba' : y < .75 ? 'taksi' : 'dolmus');
      const len = VEH[kind];
      if (pos + len + gmin > SPAN) break;
      items.push({ o: pos, len, kind, col: CAR_COLS[Math.floor(rng() * CAR_COLS.length)] });
      pos += len + gmin + rng() * (gmax - gmin);
    }
    this.free = true;
    return this.coin({ r, k: 'road', d, s, items, theme, coins: null });
  }
  rail(r, rng) { this.free = true; const P = 6 + rng() * 4.5; return { r, k: 'rail', d: rng() < .5 ? 1 : -1, P, ph: rng() * P, coins: null }; }
  river(r, rng, lv) {
    const prev = this.rows.get(r - 1), k = this.k;
    const d = -this.riverD; this.riverD = d;
    const q = rng();
    let sub = q < .2 ? 'pad' : q < .34 ? 'ferry' : 'log';
    if (sub === 'pad' && prev && prev.sub === 'pad') sub = 'log';
    const L = { r, k: 'river', sub, d, s: 0, items: [], coins: null };
    if (sub === 'pad') {
      if (this.free) this.path = 1 + Math.floor(rng() * (COLS - 2));
      const cols = new Set([this.path]), nP = 3 + Math.floor(rng() * 2);
      for (let j = 0; j < 12 && cols.size < nP; j++) cols.add(Math.floor(rng() * COLS));
      L.items = [...cols].sort((a, b) => a - b).map(c => ({ o: c, len: 1, fl: rng() < .3 }));
      this.free = false;
    } else {
      const ferry = sub === 'ferry';
      L.s = (ferry ? .8 + rng() * .4 : .85 + rng() * .9 + lv * .7) * k;
      const gmin = ferry ? 1.6 : 1.1;
      let pos = rng() * 2;
      for (let guard = 0; guard < 14; guard++) {
        const len = ferry ? 3.2 : 2 + Math.floor(rng() * (lv > .5 ? 2 : 3));
        if (pos + len + gmin > SPAN) break;
        L.items.push({ o: pos, len });
        pos += len + gmin + rng() * (ferry ? 1.6 : 1.5 + lv * 1.2);
      }
      this.free = true;
    }
    return this.coin(L);
  }
  coin(L) {
    if (!this.coinsOn || (L.start && L.r < 1)) return L;
    const rng = mulberry(hash2(this.seed ^ 0xC01D, L.r)), coins = {};
    if (L.k === 'grass') { for (let c = 0; c < COLS; c++) if (!L.block[c] && rng() < .11) coins[c] = rng() < .06 ? 5 : 1; }
    else if (L.k === 'road') { for (let c = 0; c < COLS; c++) if (rng() < .08) coins[c] = rng() < .14 ? 5 : 1; }
    else if (L.k === 'river' && L.sub === 'pad') L.items.forEach(it => { if (rng() < .4) coins[it.o] = rng() < .2 ? 5 : 1; });
    L.coins = coins; return L;
  }
}
const courseCache = new Map();
function courseFor(seed, diff, coins) {
  const key = `${seed}:${diff}:${coins ? 1 : 0}`;
  let c = courseCache.get(key);
  if (!c) { c = new Course(seed, diff, coins); courseCache.set(key, c); if (courseCache.size > 6) courseCache.delete(courseCache.keys().next().value); }
  return c;
}

/* ------------------------------------------------------------------ hareketli nesneler */
const movX = (L, it, tau) => mod(it.o + L.d * L.s * tau, SPAN) - PAD;
function trainSpan(L, tau) {
  const u = mod(tau + L.ph, L.P);
  if (u * TRAIN_SPD > SPAN + TRAIN_LEN + 2) return null;
  const head = L.d > 0 ? -PAD + TRAIN_SPD * u : COLS - 1 + PAD - TRAIN_SPD * u;
  return L.d > 0 ? [head - TRAIN_LEN, head] : [head, head + TRAIN_LEN];
}
function trainWarn(L, tau) { const u = mod(tau + L.ph, L.P); return u > L.P - WARN || u * TRAIN_SPD < SPAN + TRAIN_LEN; }
function hitRoad(L, x, tau) {
  for (const it of L.items) { const a = movX(L, it, tau); if (x + HW > a - .42 && x - HW < a + it.len - .58) return true; }
  return false;
}
function hitTrain(L, x, tau) { const s = trainSpan(L, tau); return !!s && x + HW > s[0] && x - HW < s[1]; }
function support(L, x, tau, tol = 0) {
  if (L.sub === 'pad') { for (const it of L.items) if (Math.abs(x - it.o) <= .45 + tol) return true; return false; }
  for (const it of L.items) { const a = movX(L, it, tau); if (x >= a - .4 - tol && x <= a + it.len - .6 + tol) return true; }
  return false;
}
// Hayatta Kal: kartal çizgisi (şerit birimi) — zamanla hızlanır
function killLine(kf, tau) { const tt = Math.max(0, tau - 2.5); return MIN_ROW - .6 + tt * .42 * kf + .5 * .0075 * kf * tt * tt; }

/* ------------------------------------------------------------------ zıplama kaydı
   rec = { r, x, ts, v, fr, fx }: ts anında (fr, fx)'ten (r, x)'e zıplamaya başladı;
   HOP ms sonra indi; nehirde v (hücre/sn) hızla sürüklenir.                  */
function posAt(rec, t) {
  const dt = t - rec.ts;
  if (dt >= HOP) return { r: rec.r, x: rec.x + rec.v * (dt - HOP) / 1000, air: 0, u: 1 };
  const u = Math.max(0, dt / HOP);
  return { r: u < .5 ? rec.fr : rec.r, x: rec.fx + (rec.x - rec.fx) * u, air: 1, u };
}
function mkRec(r, x, ts) { return { r, x, ts, v: 0, fr: r, fx: x }; }
const recArr = rec => [rec.r, rec.x, rec.ts, rec.v, rec.fr, rec.fx];
const arrRec = a => (Array.isArray(a) && a.length >= 6 && a.every(Number.isFinite) ? { r: a[0], x: a[1], ts: a[2], v: a[3], fr: a[4], fx: a[5] } : null);
function tryHop(C, rec, d, t) {
  const cur = posAt(rec, t), land = posAt(rec, t + HOP);
  const r0 = rec.r, L0 = C.lane(r0);
  const nr = d === 'f' ? r0 + 1 : d === 'b' ? r0 - 1 : r0;
  if (nr < MIN_ROW) return null;
  const L = C.lane(nr), dx = d === 'l' ? -1 : d === 'r' ? 1 : 0;
  const drifting = L0.k === 'river' && L0.sub !== 'pad';
  let nx;
  if (L.k === 'river') {
    nx = (drifting ? land.x : Math.round(land.x)) + dx;
    if (L.sub === 'pad') { const rx = Math.round(nx); if (Math.abs(rx - nx) < .5) nx = rx; }
    if (nx < -.45 || nx > COLS - .55) return null;
  } else {
    nx = clamp(Math.round(land.x), 0, COLS - 1) + dx;
    if (nx < 0 || nx > COLS - 1) return null;
    if (L.k === 'grass' && L.block[nx]) return null;
  }
  const v = L.k === 'river' && L.sub !== 'pad' ? L.d * L.s : 0;
  return { r: nr, x: nx, ts: t, v, fr: r0, fx: cur.x };
}
function deathAt(C, rec, t, t0, kf) {
  const p = posAt(rec, t), L = C.lane(p.r), tau = (t - t0) / 1000;
  if (L.k === 'road') { if (hitRoad(L, p.x, tau)) return 'car'; }
  else if (L.k === 'rail') { if (hitTrain(L, p.x, tau)) return 'train'; }
  else if (L.k === 'river' && !p.air) { if (p.x < -.5 || p.x > COLS - .5) return 'edge'; if (!support(L, p.x, tau)) return 'water'; }
  if (kf && p.r < killLine(kf, tau)) return 'eagle';
  return null;
}

/* ------------------------------------------------------------------ KURALLAR (yöneten cihaz) */
let uiRef = null, botQ = [];
const isHostUi = () => !!(uiRef && uiRef.isHost);
function fastOut(o) { if (uiRef && uiRef.fast && uiRef.mode === 'online') { try { uiRef.fast(o); } catch { /* */ } } }
const pname = (st, i) => (st.players[i] ? st.players[i].name : '?');
const courseOf = st => courseFor(st.seed, st.diff, st.mode === 'puan');
const kfOf = st => (st.mode === 'hayatta' ? DIFFS[st.diff] || 1 : 0);
const tauOf = (st, t) => (t - st.t0) / 1000;

function startPlay(st, ctx) {
  if (st.phase !== 'count') return;
  st.phase = 'play';
  ctx.emit({ t: 'go' }, `${MODES[st.mode].icon} BAŞLA! ${MODES[st.mode].name} başladı.`);
}
function applyHop(st, pi, rec, at, ctx, human) {
  const p = st.p[pi], C = courseOf(st);
  p.rec = rec;
  if (rec.r > p.best) { p.best = rec.r; p.bestAt = at; }
  if (st.mode === 'puan') {
    const L = C.lane(rec.r), cx = Math.round(rec.x), v = L.coins && L.coins[cx], key = `${rec.r}:${cx}`;
    if (v && Math.abs(rec.x - cx) < .3 && !p.got.includes(key)) { p.got.push(key); p.coins += v; st.dirty = Math.max(st.dirty, 1); }
  }
  if (human) {
    const L = C.lane(rec.r), tl = rec.ts + HOP;
    if (L.k === 'river') {
      const ok = [-LAND_TOL, 0, LAND_TOL].some(o => support(L, rec.x + rec.v * Math.max(0, o) / 1000, tauOf(st, tl + o), .08));
      if (!ok) kill(st, pi, 'water', tl, ctx);
      else if (rec.x < -.6 || rec.x > COLS - .4) kill(st, pi, 'edge', tl, ctx);
    }
  }
}
function snap(st, pi, ctx) { const p = st.p[pi]; ctx.emit({ t: 'snap', pi, rec: recArr(p.rec), n: p.n, life: p.life }); }
function kill(st, pi, cause, at, ctx, dpos) {
  const p = st.p[pi];
  if (!p.alive || st.phase !== 'play') return;
  const pos = dpos || posAt(p.rec, at);
  p.alive = false; p.deadAt = at; p.cause = cause; p.deaths++; p.dpos = [pos.r, +(+pos.x).toFixed(3)];
  const puan = st.mode === 'puan';
  if (puan) p.respawnAt = Date.now() + RESPAWN_MS;
  const tail = puan ? ' Birazdan geri dönüyor.' : ` (${p.best} m)`;
  ctx.emit({ t: 'die', pi, cause, r: p.dpos[0], x: p.dpos[1], life: p.life }, `${CAUSE_ICON[cause]} ${pname(st, pi)} ${CAUSE_TXT[cause]}!${tail}`, 'bad');
  st.dirty = 2;
}
function respawn(st, pi, now, ctx) {
  const p = st.p[pi], C = courseOf(st);
  let r = p.dpos ? Math.min(p.dpos[0], p.best) : 0;
  while (r > MIN_ROW && C.lane(r).k !== 'grass') r--;
  const L = C.lane(r), want = p.dpos ? clamp(Math.round(p.dpos[1]), 0, COLS - 1) : 4;
  let col = want;
  for (let k = 0; k < COLS; k++) { const a = want + (k % 2 ? -1 : 1) * Math.ceil(k / 2); if (a >= 0 && a < COLS && !L.block[a]) { col = a; break; } }
  p.rec = mkRec(r, col, now - HOP - 10); p.alive = true; p.life++; p.cause = null; p.respawnAt = 0; p.dpos = null;
  if (st.bot[pi]) { st.bot[pi].next = now + 300; st.bot[pi].lastFwd = now; }
  ctx.emit({ t: 'respawn', pi, rec: recArr(p.rec), life: p.life, n: p.n });
  st.dirty = 2;
}
function hostHumanHop(st, pi, a, ctx) {
  const p = st.p[pi], now = Date.now();
  if (!p.alive || a.life !== p.life || !['f', 'b', 'l', 'r'].includes(a.d) || !Number.isInteger(a.n) || a.n <= p.n) return;
  let at = Number.isFinite(+a.at) ? +a.at : now;
  at = clamp(at, now - 1500, now + 80);
  at = Math.max(at, p.rec.ts + HOP, st.t0);
  const rec = tryHop(courseOf(st), p.rec, a.d, at);
  p.n = a.n;
  if (!rec) { snap(st, pi, ctx); return; }
  applyHop(st, pi, rec, at, ctx, true);
  if (p.alive && Number.isFinite(+a.r) && (+a.r !== rec.r || Math.abs(+a.x - rec.x) > .2)) snap(st, pi, ctx);
}
function hostDie(st, pi, a, ctx) {
  const p = st.p[pi], now = Date.now();
  if (!p.alive || a.life !== p.life || !CAUSES.includes(a.cause) || a.cause === 'off') return;
  let at = Number.isFinite(+a.at) ? +a.at : now; at = clamp(at, Math.max(st.t0, now - 3000), now);
  const dpos = Number.isFinite(+a.r) && Number.isFinite(+a.x) && Math.abs(+a.r - p.rec.r) <= 1 ? { r: +a.r, x: clamp(+a.x, -1, COLS) } : null;
  kill(st, pi, a.cause, at, ctx, dpos);
}

/* ---- botlar ---- */
const DIRS = ['f', 'l', 'r', 'b'];
function safeFor(C, rec, from, to, t0, kf) {
  for (let t = from; t < to; t += 40) if (deathAt(C, rec, t, t0, kf)) return false;
  return !deathAt(C, rec, to, t0, kf);
}
// Statik geçilebilirlik: çimendeki ağaçlar ve nilüferler (yol/ray/kütük şeritleri yatayda serbest sayılır)
function cellOpen(L, c) {
  if (c < 0 || c >= COLS) return false;
  if (L.k === 'grass') return !L.block[c];
  if (L.k === 'river' && L.sub === 'pad') return L.items.some(it => it.o === c);
  return true;
}
// Küçük Dijkstra: yakın şeritlerde ileriye giden en kısa statik yolun ilk adımı
function planStep(C, r, c, floor) {
  const R0 = Math.max(MIN_ROW, floor != null ? floor : r - 3), R1 = r + 4, NR = R1 - R0 + 1, N = NR * COLS;
  const dist = new Float64Array(N).fill(1e9), first = new Array(N).fill(null), done = new Uint8Array(N);
  const id = (rr, cc) => (rr - R0) * COLS + cc, lanes = [];
  for (let rr = R0; rr <= R1; rr++) lanes.push(C.lane(rr));
  const s = id(r, c); dist[s] = 0;
  for (;;) {
    let u = -1, bd = 1e9;
    for (let i = 0; i < N; i++) if (!done[i] && dist[i] < bd) { bd = dist[i]; u = i; }
    if (u < 0) return null;
    done[u] = 1;
    const ur = R0 + Math.floor(u / COLS), uc = u % COLS;
    if (ur === R1) return first[u];
    const Lu = lanes[ur - R0], moves = [['f', 1, 0, 1], ['l', 0, -1, 1.15], ['r', 0, 1, 1.15], ['b', -1, 0, 2.2]];
    for (const [d, dr, dc, w] of moves) {
      const vr = ur + dr, vc = uc + dc;
      if (vr < R0 || vr > R1 || vc < 0 || vc >= COLS) continue;
      const Lv = lanes[vr - R0];
      if (!cellOpen(Lv, vc)) continue;
      if (dr === 0 && Lu.k === 'river' && Lu.sub === 'pad' && !cellOpen(Lu, vc)) continue;
      const drift = Lv.k === 'river' && Lv.sub !== 'pad';
      let extra = Lv.k === 'road' || Lv.k === 'rail' ? .25 : 0;
      if (drift && dr === 0) extra += dc === Lv.d ? -.55 : 1 + 1.4 * Lv.s;   // akıntı yönünde beklemek ucuz, tersine zıplamak zor
      if (drift && dr !== 0 && (Lv.d > 0 ? vc >= COLS - 2 : vc <= 1)) extra += 3;   // akıntının götürdüğü kenar
      const v = id(vr, vc), nd = dist[u] + w + extra;
      if (nd < dist[v]) { dist[v] = nd; first[v] = u === s ? d : first[u]; }
    }
  }
}
// Bu hücreden ileri gidilemiyorsa (yalnızca geri dönüş varsa) çıkmaz sokaktır
function deadEnd(C, r, c) {
  if (!C.de) C.de = new Map();
  const key = r * 16 + c; let v = C.de.get(key);
  if (v === undefined) { v = planStep(C, r, c, r) == null; C.de.set(key, v); if (C.de.size > 4000) C.de.clear(); }
  return v;
}
function botDecide(st, pi, now) {
  const b = st.bot[pi], p = st.p[pi], C = courseOf(st), kf = kfOf(st);
  if (!p.alive || now < b.next || now < p.rec.ts + HOP) return null;
  b.next = now + b.think * (.7 + Math.random() * .6);
  const rec = p.rec, L0 = C.lane(rec.r), here = posAt(rec, now), sinceF = now - b.lastFwd;
  let W = b.win;
  const urgent = kf && rec.r - killLine(kf, tauOf(st, now) + 1.2) < 1.6;
  if (urgent) W *= .5;
  if (sinceF > 5000) W *= .6;
  if (sinceF > 9000) W = .12;
  const hop = {}; DIRS.forEach(d => { hop[d] = tryHop(C, rec, d, now); });
  const useful = d => { const h = hop[d]; if (!h || d === 'b') return true; const L = C.lane(h.r); if (L.k === 'river' && L.sub !== 'pad') return true; return !deadEnd(C, h.r, clamp(Math.round(h.x), 0, COLS - 1)); };
  const ok = (d, w) => !!hop[d] && useful(d) && safeFor(C, hop[d], now, now + HOP + w * 1000, st.t0, kf);
  const stayOk = safeFor(C, rec, now, now + HOP + Math.max(W, .3) * 1000, st.t0, kf);
  // ara sıra dikkatsiz zıplama (yalnızca iniş anında ölümcül değilse)
  if (Math.random() < b.oops && hop.f && !deathAt(C, hop.f, now + HOP + 10, st.t0, kf)) return 'f';
  if (st.mode === 'puan') {
    const coinAt = (r, x) => { const L = C.lane(r), c = Math.round(x); return L.coins && L.coins[c] && Math.abs(x - c) < .3 && !p.got.includes(`${r}:${c}`); };
    for (const d of ['l', 'r', 'f']) if (hop[d] && coinAt(hop[d].r, hop[d].x) && Math.random() < .75 && ok(d, W)) return d;
  }
  if (L0.k === 'river' && rec.v) {
    const fx = here.x + rec.v * .8;
    if (fx < -.3 || fx > COLS - .7) { const d = rec.v > 0 ? 'l' : 'r'; if (ok('f', .2)) return 'f'; if (ok(d, .2)) return d; if (ok('b', .2)) return 'b'; if (hop.f && !deathAt(C, hop.f, now + HOP + 10, st.t0, kf)) return 'f'; }
  }
  const drifting = L0.k === 'river' && L0.sub !== 'pad';
  const pc = drifting ? (L0.d > 0 ? Math.ceil(here.x - .05) : Math.floor(here.x + .05)) : Math.round(here.x);
  const plan = planStep(C, rec.r, clamp(pc, 0, COLS - 1), sinceF > 10000 ? rec.r - 8 : undefined);
  if (!stayOk) { const order = [...new Set([plan, 'f', 'l', 'r', 'b'].filter(Boolean))]; for (const w of [W, .25, .1]) for (const d of order) if (ok(d, w)) return d; return null; }
  if (sinceF > 12000) { if (ok('f', .05)) return 'f'; if (Math.random() < .25) { const d = DIRS.find(x => hop[x] && !deathAt(C, hop[x], now + HOP + 10, st.t0, kf)); if (d) return d; if (hop.f) return 'f'; } }
  if (!urgent && Math.random() < b.idle) return null;            // insan gibi ara sıra duraksar
  const L1 = C.lane(rec.r + 1);
  if (L1.k === 'river' && L1.sub !== 'pad' && !ok('f', W)) {          // akıntının götüreceği kenardan uzak dur
    const down = L1.d > 0 ? here.x > COLS - 3.2 : here.x < 2.2, d = L1.d > 0 ? 'l' : 'r';
    if (down && ok(d, W)) return d;
  }
  if (drifting) {
    if (plan === 'f' || plan == null) return ok('f', W) ? 'f' : null;
    if (plan === 'b') return ok('b', W) ? 'b' : null;
    const withDrift = (plan === 'r') === (L0.d > 0);
    if (withDrift) return null;                                       // akıntı zaten oraya taşıyor
    return ok(plan, W) ? plan : null;
  }
  if (plan && plan !== 'f') { if (ok(plan, W)) return plan; if (sinceF < 6000) return null; }
  if (ok('f', W)) return 'f';
  if (sinceF > 7000 && Math.random() < .3) { const d = Math.random() < .5 ? 'l' : 'r'; if (ok(d, .2)) return d; if (ok('b', .2)) return 'b'; }
  return null;
}
function botHop(st, pi, d, now, ctx) {
  const p = st.p[pi], b = st.bot[pi], rec = tryHop(courseOf(st), p.rec, d, now);
  if (!rec) return false;
  p.n++;
  applyHop(st, pi, rec, now, ctx, false);
  if (rec.r > b.maxR) { b.maxR = rec.r; b.lastFwd = now; }
  const Lt = courseOf(st).lane(rec.r);
  if (d === 'f' && !(Lt.k === 'river' && Lt.sub !== 'pad')) b.next = Math.max(b.next, now + HOP + b.pace * (.5 + Math.random()));
  const pkt = [pi, recArr(rec), p.n, p.life];
  botQ.push(pkt);
  uiFeed(pi, rec, p.n, p.life);
  return true;
}
function flushBots(st) {
  if (!botQ.length) return;
  const arr = botQ.map(q => [q[0], q[1].map(v => +(+v).toFixed(4)), q[2], q[3]]);
  botQ = [];
  fastOut({ t: 'b', p: arr });
}

/* ---- sıralama ve bitiş ---- */
function rankOf(st) {
  const P = st.p, idx = st.players.map((_, i) => i);
  if (st.mode === 'yaris') idx.sort((a, b) => P[b].best - P[a].best || P[a].bestAt - P[b].bestAt || a - b);
  else if (st.mode === 'hayatta') idx.sort((a, b) => (+P[b].alive - +P[a].alive) || (P[a].alive ? 0 : P[b].deadAt - P[a].deadAt) || P[b].best - P[a].best || P[a].bestAt - P[b].bestAt || a - b);
  else idx.sort((a, b) => P[b].coins - P[a].coins || P[b].best - P[a].best || P[a].deaths - P[b].deaths || a - b);
  return idx;
}
function labelOf(st, i) {
  const p = st.p[i];
  if (st.mode === 'puan') return `${p.coins} altın · ${p.best} m`;
  if (st.mode === 'hayatta') return p.alive ? `Hayatta · ${p.best} m` : `${Math.max(0, Math.round(tauOf(st, p.deadAt)))} sn · ${p.best} m`;
  return p.alive ? `${p.best} m` : `${p.best} m · ${CAUSE_TXT[p.cause] || 'elendi'}`;
}
function finish(st, ctx, reason) {
  if (st.phase === 'over') return;
  st.phase = 'over';
  const idx = rankOf(st), w = idx[0], n = st.players.length;
  const rows = idx.map(i => ({ pi: i, label: labelOf(st, i), best: st.p[i].best, coins: st.p[i].coins, alive: st.p[i].alive }));
  st.over = { reason, rows };
  let title;
  if (n === 1) title = st.mode === 'puan' ? `${st.p[w].coins} altın topladın!` : `${st.p[w].best} m yol aldın!`;
  else if (st.mode === 'yaris') title = `${pname(st, w)} en uzağa gitti! (${st.p[w].best} m)`;
  else if (st.mode === 'hayatta') title = reason === 'time' && idx.filter(i => st.p[i].alive).length > 1 ? `Süre doldu! En ileride: ${pname(st, w)}` : `${pname(st, w)} hayatta kalan son kişi!`;
  else title = `${pname(st, w)} altın avının şampiyonu!`;
  const note = { yaris: 'Herkes aynı parkurda koştu; ulaşılan en ileri şerit sayılır, eşitlikte önce ulaşan öne geçer.', hayatta: 'Kartal geride kalanı kapar; son kalan kazanır. Süre biterse en ileride olan öne geçer.', puan: 'Toplanan altınlar sayılır (büyük altın 5). Eşitlikte daha uzağa giden öne geçer.' }[st.mode] + ` Zorluk: ${DIFF_NAMES[st.diff]}.`;
  const why = reason === 'time' ? '⏱ Süre doldu!' : reason === 'last' ? '🦅 Son kalan belli oldu!' : '💥 Herkes elendi!';
  ctx.emit({ t: 'over', w, reason }, `${why} ${title}`, 'gold');
  ctx.sync();
  ctx.later(RESULT_MS, () => ctx.end({ title, ranking: idx.map(i => ({ pi: i, label: labelOf(st, i) })), note }));
}
function checkEnd(st, ctx, now) {
  const n = st.players.length, alive = st.p.filter(p => p.alive).length;
  if (now >= st.endsAt) { finish(st, ctx, 'time'); return; }
  let cond = false, reason = 'out';
  if (st.mode === 'yaris') cond = alive === 0;
  else if (st.mode === 'hayatta') { cond = n > 1 ? alive <= 1 : alive === 0; reason = n > 1 && alive === 1 ? 'last' : 'out'; }
  if (!cond) { st.endAt = 0; return; }
  if (!st.endAt) st.endAt = now + END_GRACE;
  else if (now >= st.endAt) finish(st, ctx, reason);
}

/* ---- ana döngü ---- */
function tick(st, ctx) {
  const now = Date.now();
  if (st.phase === 'count' && now >= st.t0) { startPlay(st, ctx); st.dirty = 2; }
  if (st.phase === 'play') {
    const C = courseOf(st), kf = kfOf(st);
    st.players.forEach((pl, i) => {
      const p = st.p[i];
      if (st.phase !== 'play') return;
      if (!p.alive) { if (st.mode === 'puan' && p.respawnAt && now >= p.respawnAt) respawn(st, i, now, ctx); return; }
      if (pl.isBot) {
        const d = botDecide(st, i, now);
        if (d) botHop(st, i, d, now, ctx);
        const c = deathAt(C, p.rec, now, st.t0, kf);
        if (c) kill(st, i, c, now, ctx);
      } else {
        const T = now - LAG;
        if (T - SPREAD >= p.rec.ts) {
          const c = deathAt(C, p.rec, T, st.t0, kf);
          if (c && deathAt(C, p.rec, T - SPREAD, st.t0, kf) && deathAt(C, p.rec, T + SPREAD, st.t0, kf)) kill(st, i, c, T, ctx);
        }
        if (p.alive && st.mode !== 'puan' && st.online[i] === false && st.offSince[i] && now - st.offSince[i] > OFF_OUT) kill(st, i, 'off', now, ctx);
      }
    });
    if (now - st.lastFlush >= BOT_FLUSH) { st.lastFlush = now; flushBots(st); }
    if (st.phase === 'play') checkEnd(st, ctx, now);
  }
  if (st.phase !== 'over' && (st.dirty === 2 || (st.dirty === 1 && now - st.lastSync > 300) || now - st.lastSync >= 1000)) { st.dirty = 0; st.lastSync = now; ctx.sync(); }
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
    const mode = MODES[opts.mod] ? opts.mod : 'yaris', diff = DIFFS[opts.zorluk] ? opts.zorluk : 'normal';
    const dur = optNum(opts.sure, [60, 90, 120, 180], 90), seed = (Math.random() * 4294967296) >>> 0;
    const now = Date.now(), t0 = now + COUNT_MS, offs = [0, -1, 1, -2, 2, -3, 3, -4];
    botQ = [];
    const st = {
      mode, diff, dur, seed, t0, endsAt: t0 + dur * 1000, phase: 'count',
      players: players.map((p, i) => ({ name: p.name, color: p.color, isBot: !!p.isBot, an: ANIMALS[i % ANIMALS.length] })),
      online: players.map(() => true), offSince: players.map(() => 0),
      p: players.map((_, i) => ({ rec: mkRec(0, 4 + offs[i % 8], t0 - 1000), n: 0, life: 0, alive: true, deadAt: 0, cause: null, dpos: null, best: 0, bestAt: 0, coins: 0, got: [], respawnAt: 0, deaths: 0 })),
      bot: {}, over: null, loopId: 0, lastSync: 0, lastFlush: 0, dirty: 0, endAt: 0
    };
    let k = 0;
    players.forEach((p, i) => {
      if (!p.isBot) return;
      const s = clamp(.38 + .57 * ((k++ * .618 + .35) % 1), .35, .95);
      st.bot[i] = { skill: +s.toFixed(2), think: Math.round(330 - 170 * s), pace: Math.round(330 - 200 * s), idle: +(.05 + .2 * (1 - s)).toFixed(3), win: +(.42 + .35 * (1 - s) * Math.random() + .08).toFixed(2), oops: +(.004 + .014 * (1 - s)).toFixed(4), next: t0 + 200 + Math.random() * 500, lastFwd: t0, maxR: 0 };
    });
    courseOf(st).lane(60);
    ctx.emit({ t: 'start' }, `${MODES[mode].icon} Geçit Koşusu · ${MODES[mode].name} · ${DIFF_NAMES[diff]} · ${dur} sn`, 'gold');
    runLoop(st, ctx);
    return st;
  },
  action(st, pi, a, ctx) {
    if (!a || typeof a.t !== 'string' || !st.p[pi] || st.players[pi].isBot) return;
    if (st.phase === 'count' && Date.now() >= st.t0 - 150) startPlay(st, ctx);
    if (st.phase !== 'play') return;
    if (a.t === 'hop') hostHumanHop(st, pi, a, ctx);
    else if (a.t === 'die') hostDie(st, pi, a, ctx);
    if (st.dirty === 2) { st.dirty = 0; st.lastSync = Date.now(); ctx.sync(); }
  },
  view(st, viewer) {
    const n = st.players.length, me = Number.isInteger(viewer) && viewer >= 0 && viewer < n ? viewer : -1;
    return {
      mode: st.mode, diff: st.diff, dur: st.dur, seed: st.seed, t0: st.t0, endsAt: st.endsAt, phase: st.phase, me,
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, an: p.an, online: st.online[i] !== false })),
      p: st.p.map(q => ({ rec: recArr(q.rec), n: q.n, life: q.life, alive: q.alive, deadAt: q.deadAt, cause: q.cause, dpos: q.dpos, best: q.best, coins: q.coins, respawnAt: q.respawnAt })),
      got: me >= 0 ? st.p[me].got.slice() : [], over: st.over
    };
  },
  turnOf() { return null; },
  skipTurn() { /* gerçek zamanlı: kopmalar onPresence ile işlenir */ },
  botAct() { /* botlar yöneten cihazdaki döngüde zıplar */ },
  botDelay: 900,
  onPresence(st, pi, online) { st.online[pi] = online; st.offSince[pi] = online ? 0 : Date.now(); },
  resume(st, ctx) { if (st.phase !== 'over') runLoop(st, ctx); }
};

/* ------------------------------------------------------------------ ARAYÜZ (her cihaz) */
let root = null, ui = null, V = null, C = null;
let cv = null, cg = null, stageEl = null, ro = null, hudT = null, raf = 0, lastT = 0;
let sw = 300, sh = 500, dpr = 1, cell = 40, rp = 32, ox = 0, anchorY = 300, camR = 0, camInit = false, camMax = -99;
let me = null, rem = [], parts = [], floats = [], dfx = [], seenKey = '', boardKey = '', sideKey = '', lastSec = -1, overShown = false;
let ptr = null, popT = null, warnBell = {}, hintHidden = false, layoutAt = 0;
const pnow = () => performance.now();
const hnow = () => (ui && ui.hostNow ? ui.hostNow() : Date.now());
const q = s => root && root.querySelector(s);
const isTouch = () => (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
const phoneW = () => innerWidth < 760;
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
const shade = (h, t) => (/^#[0-9a-f]{6}$/i.test(h) ? (t < 0 ? mix(h, '#10081c', -t) : mix(h, '#ffffff', t)) : h);
const hcell = (a, b) => hash2(a * 7 + 3, b) / 4294967296;
const snd = {
  ok() { return Sound.ctx && Sound.enabled && Sound.ctx.state === 'running'; },
  hop() { if (!this.ok()) return; Sound.tone(430 + Math.random() * 70, .07, { type: 'triangle', gain: .08, slide: 760 }); },
  coin(big) { if (!this.ok()) return; Sound.tone(1320, .08, { type: 'square', gain: .05 }); Sound.tone(1760, .16, { type: 'triangle', gain: .12, when: .06 }); if (big) Sound.tone(2640, .22, { type: 'triangle', gain: .1, when: .14 }); },
  splash() { if (!this.ok()) return; Sound.noise(.5, { filter: 'lowpass', freq: 900, gain: .55, decayPow: 2 }); Sound.tone(320, .22, { type: 'sine', gain: .08, slide: 110 }); },
  pof() { if (!this.ok()) return; Sound.noise(.2, { freq: 600, q: .8, gain: .6 }); Sound.tone(170, .25, { type: 'square', gain: .1, slide: 60 }); },
  horn() { if (!this.ok()) return; Sound.tone(370, .45, { type: 'sawtooth', gain: .05 }); Sound.tone(466, .45, { type: 'sawtooth', gain: .04 }); },
  bell() { if (!this.ok()) return; [0, .25].forEach(w => Sound.tone(1250, .16, { type: 'square', gain: .035, when: w })); },
  eagle() { if (!this.ok()) return; Sound.tone(1900, .55, { type: 'sawtooth', gain: .05, slide: 900 }); Sound.tone(2300, .3, { type: 'sine', gain: .05, when: .12, slide: 1300 }); },
  bump() { if (!this.ok()) return; Sound.tone(150, .07, { type: 'square', gain: .05 }); }
};

/* ---- yerleşim ---- */
function resize() {
  if (!stageEl || !cv) return;
  layout();
  const r = stageEl.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return;
  sw = r.width; sh = r.height; dpr = Math.min(2.5, window.devicePixelRatio || 1);
  cv.width = Math.round(sw * dpr); cv.height = Math.round(sh * dpr);
  cell = Math.max(24, Math.min(66, sw / (COLS + .7)));
  rp = cell * .8; ox = sw / 2 - (COLS - 1) / 2 * cell; anchorY = sh * .7;
}
function layout() {
  if (!stageEl) return;
  const top = stageEl.getBoundingClientRect().top + (window.scrollY || 0), ph = phoneW();
  const h = ph ? clamp(innerHeight - top - 8, 380, 1100) : clamp(innerHeight - top - 16, 480, 820);
  if (Math.abs(stageEl.offsetHeight - h) > 2) stageEl.style.height = Math.round(h) + 'px';
}
const X = x => ox + x * cell;
const Y = r => anchorY - (r - camR) * rp;
const liftOf = L => (L.k === 'grass' ? .17 : L.k === 'rail' ? .08 : L.k === 'river' ? -.1 : 0);

/* ---- uzaktaki oyuncular ---- */
function remOf(i) { if (!rem[i]) rem[i] = { rec: null, n: -1, life: -1 }; return rem[i]; }
function feed(i, rec, n, life) {
  if (!V || !V.players[i] || (V.me === i)) return;
  const R = remOf(i);
  if (life < R.life || (life === R.life && n <= R.n)) return;
  if (life > R.life) R.dead = null;
  R.rec = rec; R.n = n; R.life = life;
  if (rec.r > R.best || R.best == null) R.best = rec.r;
}
function uiFeed(i, rec, n, life) { if (root) feed(i, rec, n, life); }
function onFast(m) {
  if (!m || !V) return;
  if (m.t === 'h') {
    const rec = arrRec(m.rec); if (!rec || !Number.isInteger(m.seat)) return;
    feed(m.seat, rec, m.n | 0, m.life | 0);
  } else if (m.t === 'b' && Array.isArray(m.p)) {
    if (ui && ui.isHost) return;
    m.p.forEach(a => { if (Array.isArray(a) && V.players[a[0]] && V.players[a[0]].isBot) { const rec = arrRec(a[1]); if (rec) feed(a[0], rec, a[2] | 0, a[3] | 0); } });
  }
}

/* ---- yerel oyuncu ---- */
function mySum() {
  if (!me || !C) return 0;
  let s = 0; me.got.forEach(k => { const [r, c] = k.split(':').map(Number); const L = C.lane(r); s += (L.coins && L.coins[c]) || 0; });
  return s;
}
function input(d) {
  if (!V || V.me < 0 || !me || me.dead || !C) return;
  const now = hnow();
  if (now < V.t0 || V.phase === 'over') return;
  if (!hintHidden) { hintHidden = true; const h = q('.gk-hint'); if (h) h.hidden = true; }
  if (now < me.rec.ts + HOP) { me.queue = d; return; }
  doHop(d, now);
}
function doHop(d, now) {
  me.face = d; me.queue = null;
  const rec = tryHop(C, me.rec, d, now);
  if (!rec) { me.bump = pnow(); snd.bump(); return; }
  me.rec = rec; me.n++;
  if (rec.r > me.best) me.best = rec.r;
  ui.send({ t: 'hop', d, at: Math.round(now), n: me.n, life: me.life, r: rec.r, x: rec.x });
  if (ui.mode === 'online' && ui.fast) ui.fast({ t: 'h', rec: recArr(rec).map(v => +(+v).toFixed(4)), n: me.n, life: me.life });
  snd.hop();
  const p0 = posAt(rec, now);
  dust(p0.x, rec.fr, 5);
}
function stepMe(now) {
  if (!me || !V || V.me < 0 || !C || V.phase === 'over') return;
  if (me.dead) return;
  if (now < V.t0) return;
  if (me.queue && now >= me.rec.ts + HOP) doHop(me.queue, now);
  // altın (yerel tahmin; kurucu zıplamadan kendisi de sayar)
  if (V.mode === 'puan' && now >= me.rec.ts + HOP) {
    const L = C.lane(me.rec.r), c = Math.round(me.rec.x), key = `${me.rec.r}:${c}`;
    if (L.coins && L.coins[c] && Math.abs(me.rec.x - c) < .3 && !me.got.has(key)) {
      me.got.add(key); const v = L.coins[c];
      snd.coin(v > 1); sparkle(c, me.rec.r, v > 1 ? 18 : 10);
      floats.push({ x: c, r: me.rec.r, txt: `+${v}`, col: v > 1 ? '#ff9f1c' : '#ffe14a', t: pnow(), dur: 900 });
    }
  }
  const cause = deathAt(C, me.rec, now, V.t0, V.mode === 'hayatta' ? DIFFS[V.diff] || 1 : 0);
  if (cause) {
    const p = posAt(me.rec, now);
    me.dead = { cause, at: now, r: p.r, x: p.x, src: 'yerel' };
    ui.send({ t: 'die', cause, at: Math.round(now), life: me.life, r: p.r, x: +p.x.toFixed(3) });
    deathFx(V.me, cause, p.r, p.x, true);
  }
}

/* ---- efektler ---- */
function dust(x, r, n) { for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - .5) * .4, r: r - .25, z: .05, vx: (Math.random() - .5) * 1.2, vr: -Math.random() * .4, vz: .6 + Math.random() * .8, life: .45, max: .45, c: 'rgba(255,255,255,.75)', s: .09 + Math.random() * .06, g: 2.5 }); }
function sparkle(x, r, n) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = .8 + Math.random() * 1.8; parts.push({ x, r, z: .35, vx: Math.cos(a) * s, vr: Math.sin(a) * s * .6, vz: 1 + Math.random() * 1.5, life: .7, max: .7, c: Math.random() < .5 ? '#fff6a8' : '#ffd23a', s: .07 + Math.random() * .05, g: 3, star: true }); } }
function splash(x, r) { for (let i = 0; i < 22; i++) { const a = Math.random() * TAU, s = .4 + Math.random() * 1.6; parts.push({ x, r, z: .05, vx: Math.cos(a) * s, vr: Math.sin(a) * s * .5, vz: 2 + Math.random() * 2.4, life: .8, max: .8, c: Math.random() < .5 ? '#ffffff' : '#9fe3ff', s: .07 + Math.random() * .07, g: 6 }); } }
function stars(x, r, n, cols) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 1 + Math.random() * 2.4; parts.push({ x, r, z: .3, vx: Math.cos(a) * s, vr: Math.sin(a) * s * .5, vz: 1.5 + Math.random() * 2, life: .9, max: .9, c: cols[i % cols.length], s: .08 + Math.random() * .07, g: 4, star: true }); } }
function deathFx(pi, cause, r, x, mine) {
  const t = pnow();
  dfx = dfx.filter(d => d.pi !== pi);
  dfx.push({ pi, cause, r, x, t });
  if (cause === 'car' || cause === 'train') {
    stars(x, r, 16, ['#ffe14a', '#ffffff', '#ff8fa3']);
    floats.push({ x, r, txt: 'POF!', col: '#ffe14a', t, dur: 1100, big: true });
    if (mine) { snd.pof(); flash('bad'); if (cause === 'train') snd.horn(); }
  } else if (cause === 'water' || cause === 'edge') {
    splash(x, r);
    floats.push({ x, r, txt: 'ŞAPŞAL!', col: '#bff3ff', t, dur: 1000, big: true });
    if (mine) { snd.splash(); flash('bad'); }
  } else if (cause === 'eagle') {
    floats.push({ x, r, txt: 'KAPTI!', col: '#ffb4a2', t: t + 450, dur: 1000, big: true });
    if (mine) { snd.eagle(); flash('bad'); }
  }
  if (!mine && V && (cause === 'car' || cause === 'train')) Sound.tick(.4);
}
function pop(text, cls) {
  const el = q('.gk-pop'); if (!el) return;
  el.textContent = text; el.className = 'gk-pop ' + (cls || ''); void el.offsetWidth; el.classList.add('show');
  clearTimeout(popT); popT = setTimeout(() => { if (el) el.classList.remove('show'); }, 1200);
}

/* ---- kamera ---- */
function focusOf(now) {
  if (!V) return null;
  if (me && V.me >= 0 && (!me.dead || V.mode === 'puan')) { const p = posAt(me.rec, now); return me.dead ? me.dead.r : p.r === me.rec.r ? (me.rec.fr + (me.rec.r - me.rec.fr) * p.u) : (me.rec.fr + (me.rec.r - me.rec.fr) * p.u); }
  // izleyici: en öndeki canlı oyuncu
  let best = null;
  V.players.forEach((_, i) => {
    if (!V.p[i].alive) return;
    const R = rem[i]; const rec = R && R.rec ? R.rec : arrRec(V.p[i].rec); if (!rec) return;
    const p = posAt(rec, now - REMOTE_DELAY), rf = rec.fr + (rec.r - rec.fr) * p.u;
    if (best == null || rf > best) best = rf;
  });
  if (best == null && me && me.dead) return me.dead.r;
  return best;
}
function stepCam(dt, now) {
  const f = focusOf(now);
  let target = f == null ? camR : f + 1.2;
  if (V.mode === 'hayatta') { const K = killLine(DIFFS[V.diff] || 1, (now - V.t0) / 1000); target = Math.max(target, K - 1 + (sh - anchorY) / rp); }
  target = Math.max(target, MIN_ROW + (sh - anchorY) / rp - .6);
  if (!camInit) { camR = target; camInit = true; }
  camR += (target - camR) * (1 - Math.exp(-dt * 5));
}

/* ---- çizim yardımcıları ---- */
// footprint merkezi (cx, cy) zeminde; z kadar yukarıda; w genişlik, d derinlik, h yükseklik
function cbox(g, cx, cy, w, d, h, z, top, front) {
  const x = cx - w / 2, yf = cy + d / 2 - z;
  g.fillStyle = front; g.fillRect(x, yf - h, w, h);
  g.fillStyle = top; g.fillRect(x, yf - h - d, w, d);
  g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(x + w * .86, yf - h - d, w * .14, d + h);
  g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x, yf - h - 1, w, Math.max(1, h * .07));
}
function shadowAt(g, cx, cy, w, d, a = .2) { g.fillStyle = `rgba(16,20,40,${a})`; g.beginPath(); g.ellipse(cx + w * .08, cy + d * .12, w * .55, d * .42, 0, 0, TAU); g.fill(); }
function rr(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function text(g, s, x, y, size, fill, stroke) {
  g.font = `${size}px "Bungee","Arial Black","Segoe UI Black",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (stroke) { g.lineWidth = size * .24; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(s, x, y); }
  g.fillStyle = fill; g.fillText(s, x, y);
}

/* ---- zemin ---- */
function drawGround(g, r, tau, now) {
  const L = C.lane(r), lf = liftOf(L) * rp, yc = Y(r) - lf, top = yc - rp / 2;
  const x0 = X(-.5), x1 = X(COLS - .5);
  if (L.k === 'grass') {
    g.fillStyle = L.wall ? '#5aa83a' : (r & 1 ? '#86d957' : '#7ccf4e'); g.fillRect(0, top, sw, rp + 1);
    if (!L.wall) {
      const c0 = Math.floor((0 - ox) / cell) - 1, c1 = Math.ceil((sw - ox) / cell) + 1;
      for (let c = c0; c <= c1; c++) {
        const h = hcell(r, c);
        if (h < .22) { g.fillStyle = 'rgba(40,110,30,.35)'; const tx = X(c) + (h * 9 % 1 - .5) * cell * .6, ty = yc + (h * 17 % 1 - .5) * rp * .5; g.fillRect(tx, ty, cell * .07, rp * .14); g.fillRect(tx + cell * .09, ty + rp * .04, cell * .07, rp * .1); }
        else if (h > .93 && c >= 0 && c < COLS && !L.block[c]) { g.fillStyle = ['#ffffff', '#ffe14a', '#ff7eb6'][Math.floor(h * 300) % 3]; const fx = X(c) + (h * 13 % 1 - .5) * cell * .5, fy = yc + (h * 7 % 1 - .5) * rp * .4; g.fillRect(fx, fy, cell * .08, cell * .08); g.fillStyle = '#ffb627'; g.fillRect(fx + cell * .025, fy + cell * .025, cell * .03, cell * .03); }
      }
    }
    if (L.start && r === 0) { g.fillStyle = 'rgba(255,255,255,.28)'; for (let c = 0; c < COLS * 2; c++) if (c % 2 === 0) g.fillRect(x0 + c * cell / 2, top + rp * .78, cell / 2, rp * .12); }
  } else if (L.k === 'road') {
    g.fillStyle = '#4d5160'; g.fillRect(0, top, sw, rp + 1);
    g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(0, top, sw, rp * .5);
    const up = C.lane(r + 1);
    if (up.k === 'road') { g.fillStyle = 'rgba(255,255,255,.72)'; const off = 0; for (let x = x0 - cell * 8 + off; x < sw; x += cell) g.fillRect(x + cell * .2, top - 1, cell * .55, Math.max(2, rp * .06)); }
  } else if (L.k === 'rail') {
    const warn = trainWarn(L, tau), blink = warn && Math.floor(now / 260) % 2 === 0;
    g.fillStyle = '#8f7c6a'; g.fillRect(0, top, sw, rp + 1);
    g.fillStyle = 'rgba(0,0,0,.12)'; for (let x = (ox % (cell * .5)) - cell; x < sw; x += cell * .5) g.fillRect(x, top + rp * .12, cell * .2, rp * .76);
    g.fillStyle = '#6b4a2b'; for (let x = (ox % (cell * .5)) - cell; x < sw; x += cell * .5) g.fillRect(x + 1, top + rp * .1, cell * .17, rp * .74);
    g.fillStyle = '#c9ced8'; g.fillRect(0, top + rp * .24, sw, Math.max(2, rp * .08)); g.fillRect(0, top + rp * .66, sw, Math.max(2, rp * .08));
    g.fillStyle = '#7b8290'; g.fillRect(0, top + rp * .31, sw, Math.max(1, rp * .03)); g.fillRect(0, top + rp * .73, sw, Math.max(1, rp * .03));
    if (blink) { g.fillStyle = 'rgba(255,40,60,.16)'; g.fillRect(0, top, sw, rp); }
  } else {
    g.fillStyle = '#35a9e6'; g.fillRect(0, top, sw, rp + 1);
    g.fillStyle = 'rgba(10,60,140,.18)'; g.fillRect(0, top + rp * .62, sw, rp * .38);
    const sp = (L.s || .25) * (L.d || 1), off = mod(tau * sp * .6 + r * .37, 1);
    g.fillStyle = 'rgba(220,250,255,.45)';
    for (let c = Math.floor(-ox / cell) - 2; c < (sw - ox) / cell + 2; c++) { const h = hcell(r, c); g.fillRect(X(c + off) - cell * .2 + h * cell * .3, yc + (h - .5) * rp * .6, cell * .3, Math.max(1.5, rp * .05)); }
  }
  // ön yüz (alt şerit daha alçaksa)
  const Ln = C.lane(r - 1), lip = (liftOf(L) - liftOf(Ln)) * rp;
  if (lip > .5) {
    const by = top + rp;
    g.fillStyle = L.k === 'grass' ? '#7a5532' : L.k === 'rail' ? '#6d5b4a' : '#8e94a3'; g.fillRect(0, by, sw, lip);
    if (L.k === 'grass') { g.fillStyle = '#5ea83c'; g.fillRect(0, by, sw, Math.max(1.5, lip * .3)); }
  }
  void x1;
}

/* ---- nesneler ---- */
function drawTree(g, cx, cy, kind, s = 1) {
  if (kind === 3) { shadowAt(g, cx, cy, cell * .7, rp * .6); cbox(g, cx, cy, cell * .68 * s, rp * .62, cell * .3 * s, 0, '#b9bfcb', '#8a91a0'); cbox(g, cx - cell * .08, cy - rp * .05, cell * .34 * s, rp * .3, cell * .13 * s, cell * .3 * s, '#d8dde6', '#a5acb9'); return; }
  if (kind === 4) { shadowAt(g, cx, cy, cell * .5, rp * .45); cbox(g, cx, cy, cell * .44, rp * .42, cell * .2, 0, '#d39a5c', '#8d5a2b'); g.strokeStyle = 'rgba(110,60,20,.55)'; g.lineWidth = 1; g.beginPath(); g.ellipse(cx - cell * .03, cy - rp * .21 - cell * .2 + rp * .2, cell * .12, rp * .1, 0, 0, TAU); g.stroke(); return; }
  shadowAt(g, cx, cy, cell * .8, rp * .7, .22);
  cbox(g, cx, cy, cell * .22, rp * .2, cell * .3 * s, 0, '#a5713d', '#7a522c');
  if (kind === 2) {
    cbox(g, cx, cy, cell * .8 * s, rp * .7, cell * .28 * s, cell * .22 * s, '#3cae64', '#26854a');
    cbox(g, cx, cy, cell * .58 * s, rp * .5, cell * .26 * s, cell * .5 * s, '#47bd6f', '#2c9152');
    cbox(g, cx, cy, cell * .34 * s, rp * .3, cell * .26 * s, cell * .76 * s, '#5ad07f', '#349c5a');
  } else {
    cbox(g, cx, cy, cell * .76 * s, rp * .68, cell * .46 * s, cell * .26 * s, '#63c84a', '#43a032');
    cbox(g, cx, cy, cell * .5 * s, rp * .44, cell * .24 * s, cell * .72 * s, '#7ada5a', '#52b03c');
  }
}
function drawCoin(g, cx, cy, v, now, seed) {
  const z = cell * (.22 + Math.sin(now / 320 + seed) * .05), sp = Math.abs(Math.cos(now / 260 + seed)), big = v > 1, rad = cell * (big ? .24 : .17);
  g.fillStyle = 'rgba(16,20,40,.2)'; g.beginPath(); g.ellipse(cx, cy + rp * .08, rad * .9, rad * .35, 0, 0, TAU); g.fill();
  const y = cy - z;
  g.fillStyle = big ? '#d9480f' : '#c98a00'; g.beginPath(); g.ellipse(cx + 1.5, y, Math.max(1.5, rad * sp), rad, 0, 0, TAU); g.fill();
  g.fillStyle = big ? '#ff9f1c' : '#ffd23a'; g.beginPath(); g.ellipse(cx, y, Math.max(1.2, rad * sp), rad, 0, 0, TAU); g.fill();
  g.fillStyle = big ? '#ffe8a3' : '#fff3a8'; g.fillRect(cx - rad * sp * .45, y - rad * .55, Math.max(1, rad * sp * .3), rad * .7);
  if (big && sp > .45) text(g, '5', cx, y + 1, rad * 1.1, '#7a2a00');
}
function drawVehicle(g, it, a, d, cy, now) {
  const len = it.len, w = len * cell - cell * .14, cx = X(a + (len - 1) / 2);
  const front = d > 0 ? 1 : -1, k = it.kind;
  const H = cell * (k === 'otobus' ? .62 : k === 'kamyon' ? .58 : k === 'dolmus' ? .5 : k === 'simit' ? .42 : .34);
  shadowAt(g, cx, cy, w, rp * .7, .25);
  let body = it.col, top;
  if (k === 'taksi') body = '#ffcf1f';
  if (k === 'dolmus') body = '#2ec4b6';
  if (k === 'otobus') body = '#e8433b';
  if (k === 'simit') body = '#d62828';
  top = shade(body, .22);
  // tekerlekler
  g.fillStyle = '#1c1c28';
  const wy = cy + rp * .3;
  [-.32, .32].forEach(f => { g.fillRect(cx + f * w - cell * .09, wy - cell * .1, cell * .18, cell * .12); });
  if (k === 'kamyon') {
    const cabW = cell * .75, cabX = cx + front * (w / 2 - cabW / 2), boxW = w - cabW - cell * .06, boxX = cx - front * (w / 2 - boxW / 2);
    cbox(g, boxX, cy, boxW, rp * .66, H, cell * .06, '#f4f4f7', '#d9dbe4');
    g.fillStyle = '#ff8a00'; g.fillRect(boxX - boxW / 2, cy + rp * .33 - cell * .06 - H * .45, boxW, H * .12);
    cbox(g, cabX, cy, cabW, rp * .62, H * .78, cell * .06, top, body);
    g.fillStyle = '#9fdcff'; g.fillRect(cabX - cabW * .3, cy + rp * .31 - cell * .06 - H * .7, cabW * .6, H * .26);
  } else if (k === 'otobus') {
    cbox(g, cx, cy, w, rp * .66, H, cell * .06, top, body);
    g.fillStyle = '#ffffff'; g.fillRect(cx - w / 2 + 2, cy - rp * .33 - cell * .06 - H, w - 4, rp * .1);
    g.fillStyle = '#1f3b57'; const wy2 = cy + rp * .33 - cell * .06 - H * .82;
    for (let x = cx - w / 2 + cell * .16; x < cx + w / 2 - cell * .3; x += cell * .42) g.fillRect(x, wy2, cell * .32, H * .34);
    g.fillStyle = '#ffd23a'; g.fillRect(cx + front * (w / 2 - cell * .06) - cell * .04, cy + rp * .33 - cell * .06 - H * .3, cell * .08, cell * .08);
  } else if (k === 'simit') {
    cbox(g, cx, cy, w, rp * .62, H * .6, cell * .08, top, body);
    cbox(g, cx, cy, w * .86, rp * .5, H * .55, cell * .08 + H * .6, 'rgba(255,248,230,.95)', 'rgba(255,236,200,.85)');
    g.strokeStyle = '#b5651d'; g.lineWidth = Math.max(1.5, cell * .05);
    for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(cx + (i - 1) * w * .26, cy + rp * .25 - cell * .08 - H * .6 - H * .28, cell * .09, cell * .07, 0, 0, TAU); g.stroke(); }
    cbox(g, cx, cy, w * .96, rp * .58, H * .08, cell * .08 + H * 1.15, '#ffffff', '#e6e6ee');
  } else {
    cbox(g, cx, cy, w, rp * .64, H, cell * .07, top, body);
    const cabW = k === 'dolmus' ? w * .86 : w * .55, cabX = k === 'dolmus' ? cx + front * w * .04 : cx - front * w * .08;
    cbox(g, cabX, cy - rp * .02, cabW, rp * .5, H * .62, cell * .07 + H, shade(body, .3), shade(body, -.05));
    g.fillStyle = '#9fdcff';
    const wy3 = cy + rp * .23 - cell * .07 - H - H * .5;
    if (k === 'dolmus') { for (let x = cabX - cabW / 2 + cell * .08; x < cabX + cabW / 2 - cell * .2; x += cell * .3) g.fillRect(x, wy3, cell * .22, H * .34); }
    else { g.fillRect(cabX - cabW * .38, wy3, cabW * .32, H * .34); g.fillRect(cabX + cabW * .06, wy3, cabW * .32, H * .34); }
    if (k === 'taksi') { cbox(g, cabX, cy - rp * .02, cell * .3, rp * .18, cell * .1, cell * .07 + H * 1.62, '#ffffff', '#e9e9ee'); g.fillStyle = '#1c1c28'; for (let i = 0; i < 6; i++) if (i % 2 === 0) g.fillRect(cx - w / 2 + i * w / 6, cy + rp * .32 - cell * .07 - H * .5, w / 6, H * .16); }
    if (k === 'dolmus') { g.fillStyle = '#ffe14a'; g.fillRect(cx - w / 2, cy + rp * .32 - cell * .07 - H * .45, w, H * .14); }
    g.fillStyle = '#fff5b0'; g.fillRect(cx + front * (w / 2 - cell * .04) - cell * .04, cy + rp * .32 - cell * .07 - H * .62, cell * .08, cell * .08);
    g.fillStyle = '#ff3b30'; g.fillRect(cx - front * (w / 2 - cell * .04) - cell * .04, cy + rp * .32 - cell * .07 - H * .62, cell * .08, cell * .06);
  }
  void now;
}
function drawTrain(g, L, tau, cy) {
  const s = trainSpan(L, tau); if (!s) return;
  const H = cell * .7, carL = 3.4, n = Math.ceil(TRAIN_LEN / carL);
  for (let i = n - 1; i >= 0; i--) {
    const loco = i === 0;
    const a0 = L.d > 0 ? s[1] - (i + 1) * carL : s[0] + i * carL, a1 = a0 + carL - .12;
    if (X(a1) < -cell * 2 || X(a0) > sw + cell * 2) continue;
    const cx = (X(a0) + X(a1)) / 2 - cell * .5 + cell * .5, w = X(a1) - X(a0);
    shadowAt(g, cx, cy, w, rp * .75, .28);
    cbox(g, cx, cy, w, rp * .72, H, cell * .1, loco ? '#ff5d6c' : '#f4f5fa', loco ? '#d62839' : '#dfe2ec');
    const fy = cy + rp * .36 - cell * .1;
    if (!loco) {
      g.fillStyle = '#e63946'; g.fillRect(cx - w / 2, fy - H * .3, w, H * .1);
      g.fillStyle = '#26415f'; for (let x = cx - w / 2 + cell * .2; x < cx + w / 2 - cell * .3; x += cell * .55) g.fillRect(x, fy - H * .78, cell * .38, H * .3);
    } else {
      g.fillStyle = '#26415f'; const nose = L.d > 0 ? cx + w / 2 - cell * .7 : cx - w / 2 + cell * .2; g.fillRect(nose, fy - H * .8, cell * .5, H * .34);
      g.fillStyle = '#ffe14a'; g.fillRect(L.d > 0 ? cx + w / 2 - cell * .14 : cx - w / 2 + cell * .04, fy - H * .3, cell * .1, cell * .1);
      g.fillStyle = '#ffffff'; g.fillRect(cx - w / 2, fy - H * .25, w, H * .07);
    }
  }
}
function drawSignal(g, L, tau, cy, now) {
  const warn = trainWarn(L, tau), cx = X(-.95), H = cell * 1.05;
  shadowAt(g, cx, cy, cell * .3, rp * .3);
  cbox(g, cx, cy, cell * .1, rp * .1, H, 0, '#d0d4dc', '#9aa0ad');
  cbox(g, cx, cy, cell * .42, rp * .14, cell * .22, H * .8, '#2b2d42', '#1b1c2a');
  const on = Math.floor(now / 260) % 2, ly = cy + rp * .07 - H * .8 - cell * .11;
  [-1, 1].forEach((s, i) => {
    const lit = warn && (i === on);
    g.fillStyle = lit ? '#ff3b30' : '#5a1a1a'; g.beginPath(); g.arc(cx + s * cell * .1, ly, cell * .065, 0, TAU); g.fill();
    if (lit) { const gr = g.createRadialGradient(cx + s * cell * .1, ly, 0, cx + s * cell * .1, ly, cell * .4); gr.addColorStop(0, 'rgba(255,60,48,.55)'); gr.addColorStop(1, 'rgba(255,60,48,0)'); g.fillStyle = gr; g.fillRect(cx + s * cell * .1 - cell * .4, ly - cell * .4, cell * .8, cell * .8); }
  });
  // çapraz işaret
  g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(2, cell * .05);
  const sy = ly - cell * .26;
  g.beginPath(); g.moveTo(cx - cell * .16, sy - cell * .1); g.lineTo(cx + cell * .16, sy + cell * .1); g.moveTo(cx + cell * .16, sy - cell * .1); g.lineTo(cx - cell * .16, sy + cell * .1); g.stroke();
}
function drawRiverItem(g, L, it, a, cy, r) {
  if (L.sub === 'pad') {
    const cx = X(it.o);
    g.fillStyle = 'rgba(10,60,120,.25)'; g.beginPath(); g.ellipse(cx + 2, cy + 3, cell * .42, rp * .36, 0, 0, TAU); g.fill();
    g.fillStyle = '#3e9b3a'; g.beginPath(); g.ellipse(cx, cy + 1.5, cell * .42, rp * .36, 0, 0, TAU); g.fill();
    g.fillStyle = '#5cc24f'; g.beginPath(); g.moveTo(cx, cy); g.ellipse(cx, cy, cell * .42, rp * .36, 0, .35, TAU - .35); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(30,90,30,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - cell * .25, cy - rp * .1); g.moveTo(cx, cy); g.lineTo(cx - cell * .1, cy + rp * .25); g.stroke();
    if (it.fl) { g.fillStyle = '#ff9ad5'; g.beginPath(); g.arc(cx - cell * .14, cy - rp * .12, cell * .07, 0, TAU); g.fill(); g.fillStyle = '#fff3a8'; g.beginPath(); g.arc(cx - cell * .14, cy - rp * .12, cell * .03, 0, TAU); g.fill(); }
    return;
  }
  const w = it.len * cell - cell * .12, cx = X(a + (it.len - 1) / 2);
  if (L.sub === 'ferry') {
    g.fillStyle = 'rgba(10,60,120,.28)'; g.fillRect(cx - w / 2 + 3, cy + rp * .25, w, rp * .18);
    cbox(g, cx, cy, w, rp * .76, cell * .28, -cell * .06, '#f7f7fb', '#e2e4ec');
    g.fillStyle = '#2b2d42'; g.fillRect(cx - w / 2, cy + rp * .38 + cell * .06 - cell * .08, w, cell * .08);
    cbox(g, cx - L.d * w * .06, cy - rp * .04, w * .58, rp * .48, cell * .22, cell * .22, '#ffffff', '#d8dbe5');
    g.fillStyle = '#3a6ea5'; const wy = cy - rp * .04 + rp * .24 - cell * .22 - cell * .16; for (let x = cx - L.d * w * .06 - w * .26; x < cx - L.d * w * .06 + w * .26; x += cell * .3) g.fillRect(x, wy, cell * .16, cell * .1);
    const chx = cx + L.d * w * .1;
    cbox(g, chx, cy - rp * .06, cell * .2, rp * .16, cell * .3, cell * .44, '#2b2d42', '#1d1e2e');
    g.fillStyle = '#ffffff'; g.fillRect(chx - cell * .1, cy - rp * .06 + rp * .08 - cell * .44 - cell * .2, cell * .2, cell * .06);
    g.fillStyle = '#e63946'; g.fillRect(chx - cell * .1, cy - rp * .06 + rp * .08 - cell * .44 - cell * .3, cell * .2, cell * .04);
    return;
  }
  g.fillStyle = 'rgba(10,60,120,.25)'; g.fillRect(cx - w / 2 + 3, cy + rp * .2, w, rp * .16);
  cbox(g, cx, cy, w, rp * .62, cell * .16, -cell * .04, '#b5804a', '#8a5a2e');
  const ty = cy - rp * .31 + cell * .04 - cell * .16;
  g.fillStyle = 'rgba(90,50,20,.35)';
  for (let x = cx - w / 2 + cell * .3; x < cx + w / 2 - cell * .2; x += cell * .55) g.fillRect(x, ty + rp * .1 + (hcell(r, Math.round(x)) * rp * .3), cell * .25, Math.max(1, rp * .05));
  g.fillStyle = '#e0b07a'; g.beginPath(); g.ellipse(cx - w / 2 + cell * .06, ty + rp * .31, cell * .07, rp * .28, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(cx + w / 2 - cell * .06, ty + rp * .31, cell * .07, rp * .28, 0, 0, TAU); g.fill();
}
function drawRowObjects(g, r, tau, now) {
  const L = C.lane(r), lf = liftOf(L) * rp, cy = Y(r) - lf;
  const c0 = Math.floor((0 - ox) / cell) - 1, c1 = Math.ceil((sw - ox) / cell) + 1;
  if (L.k === 'grass') {
    for (let c = c0; c <= c1; c++) {
      if (c >= 0 && c < COLS && !L.wall) { if (L.block[c]) drawTree(g, X(c), cy, L.block[c]); continue; }
      const h = hcell(r + 50, c);
      if (L.wall || h < .78) drawTree(g, X(c), cy, h < .45 ? 1 : h < .7 ? 2 : 3, .9 + h * .2);
    }
  } else if (L.k === 'road') {
    for (const it of L.items) { const a = movX(L, it, tau); if (X(a + it.len) < -cell || X(a - 1) > sw + cell) continue; drawVehicle(g, it, a, L.d, cy, now); }
  } else if (L.k === 'rail') {
    drawSignal(g, L, tau, cy, now);
    drawTrain(g, L, tau, cy);
  } else {
    for (const it of L.items) { const a = L.sub === 'pad' ? it.o : movX(L, it, tau); if (L.sub !== 'pad' && (X(a + it.len) < -cell || X(a - 1) > sw + cell)) continue; drawRiverItem(g, L, it, a, cy, r); }
  }
  if (L.coins && me && V && V.mode === 'puan') {
    for (const c in L.coins) { if (me.got.has(`${r}:${c}`)) continue; drawCoin(g, X(+c), cy, L.coins[c], now, r * 3.1 + +c); }
  }
}

/* ---- hayvanlar ---- */
function drawAnimal(g, an, col, cx, cy, z, sx, sy, face, alpha, flat) {
  g.save(); g.globalAlpha = alpha;
  const w = cell * .66 * sx, d = rp * .56, h = cell * .5 * sy * (flat ? .18 : 1), zz = z;
  // gölge
  const sa = clamp(.28 - z / cell * .25, .06, .28);
  g.fillStyle = `rgba(16,20,40,${sa})`; g.beginPath(); g.ellipse(cx + 2, cy + d * .2, w * .6 * (1 - z / cell * .3), d * .45, 0, 0, TAU); g.fill();
  const light = shade(col, .3), dark = shade(col, -.18), white = '#fbfbff';
  let body = col, bodyTop = light;
  if (an === 'panda') { body = '#f4f4f8'; bodyTop = '#ffffff'; }
  if (an === 'penguen') { body = '#2b2d42'; bodyTop = '#3d4060'; }
  const yf = cy + d / 2 - zz, fx = face === 'l' ? -1 : face === 'r' ? 1 : 0;
  if (flat) {
    cbox(g, cx, cy, w * 1.25, d * 1.1, h, 0, bodyTop, body);
    g.fillStyle = '#1c1c28'; const ey = yf - h - d * .5;
    [[-.2, ey], [.2, ey]].forEach(([o, y]) => { g.fillRect(cx + o * w - 3, y - 1, 6, 2); g.fillRect(cx + o * w - 1, y - 3, 2, 6); });
    g.restore(); return;
  }
  // ayaklar
  g.fillStyle = an === 'kurbaga' ? dark : '#ff9f1c';
  if (zz < cell * .05) { g.fillRect(cx - w * .32, yf - 2, w * .2, 3); g.fillRect(cx + w * .12, yf - 2, w * .2, 3); }
  // kuyruk (arkada)
  if (an === 'tilki') cbox(g, cx - w * .1, cy - d * .55, w * .26, d * .35, h * .35, zz + h * .3, '#ffffff', shade(col, .1));
  if (an === 'tavuk') cbox(g, cx, cy - d * .5, w * .36, d * .2, h * .3, zz + h * .55, '#ffffff', '#e8e8f0');
  // kulaklar / tepe süsü (gövdenin arkasında üstte)
  const topY = yf - h - d;
  const earBox = (ox2, ew, eh, c1, c2) => cbox(g, cx + ox2 * w, cy - d * .1, w * ew, d * .3, h * eh, zz + h, c1, c2);
  if (an === 'kedi') { earBox(-.3, .22, .32, light, body); earBox(.3, .22, .32, light, body); }
  if (an === 'tilki') { earBox(-.3, .22, .42, light, body); earBox(.3, .22, .42, light, body); }
  if (an === 'tavsan') { earBox(-.2, .16, .9, light, body); earBox(.2, .16, .9, light, body); g.fillStyle = '#ffb3c7'; g.fillRect(cx - w * .2 - w * .04, yf - h - h * .8, w * .08, h * .5); g.fillRect(cx + w * .2 - w * .04, yf - h - h * .8, w * .08, h * .5); }
  if (an === 'panda') { earBox(-.32, .22, .26, '#2b2d42', '#1c1c28'); earBox(.32, .22, .26, '#2b2d42', '#1c1c28'); }
  if (an === 'tavuk') cbox(g, cx, cy - d * .05, w * .2, d * .4, h * .3, zz + h, '#ff3b30', '#d62828');
  if (an === 'kurbaga') { [-.24, .24].forEach(o => { cbox(g, cx + o * w, cy + d * .05, w * .26, d * .3, h * .3, zz + h, '#ffffff', '#e8e8f0'); g.fillStyle = '#1c1c28'; g.fillRect(cx + o * w - w * .05 + fx * w * .04, yf - h - h * .22, w * .1, h * .14); }); }
  // gövde
  cbox(g, cx, cy, w, d, h, zz, bodyTop, body);
  // renk vurgusu (oyuncu rengi)
  if (an === 'panda') { g.fillStyle = col; g.fillRect(cx - w / 2, yf - h * .32, w, h * .14); }
  if (an === 'penguen') { g.fillStyle = white; g.fillRect(cx - w * .3 + fx * w * .1, yf - h * .8, w * .6, h * .78); g.fillStyle = col; g.fillRect(cx - w / 2, yf - h * .98, w, h * .12); }
  if (an === 'tavuk' || an === 'ordek') { g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(cx - w / 2, yf - h - d, w, d * .35); }
  // yüz
  const ey = yf - h * .66, ex = w * .2, eo = fx * w * .16;
  if (an === 'panda') { g.fillStyle = '#1c1c28'; g.fillRect(cx - ex - w * .1 + eo, ey - h * .14, w * .2, h * .3); g.fillRect(cx + ex - w * .1 + eo, ey - h * .14, w * .2, h * .3); }
  if (an !== 'kurbaga') {
    g.fillStyle = an === 'panda' ? '#ffffff' : '#1c1c28';
    g.fillRect(cx - ex - w * .05 + eo, ey - h * .06, w * .1, h * .16); g.fillRect(cx + ex - w * .05 + eo, ey - h * .06, w * .1, h * .16);
    g.fillStyle = '#ffffff'; if (an !== 'panda') { g.fillRect(cx - ex - w * .03 + eo, ey - h * .04, w * .035, h * .05); g.fillRect(cx + ex - w * .03 + eo, ey - h * .04, w * .035, h * .05); }
  } else { g.fillStyle = '#1c1c28'; g.fillRect(cx - w * .22 + eo, yf - h * .36, w * .44, Math.max(1, h * .06)); }
  // gaga / burun
  const by = yf - h * .42;
  if (an === 'tavuk' || an === 'penguen') { g.fillStyle = '#ff9f1c'; g.fillRect(cx - w * .08 + eo * 1.6, by - h * .06, w * .16, h * .14); if (an === 'tavuk') { g.fillStyle = '#ff3b30'; g.fillRect(cx - w * .04 + eo * 1.6, by + h * .08, w * .08, h * .14); } }
  if (an === 'ordek') { g.fillStyle = '#ff9f1c'; g.fillRect(cx - w * .16 + eo * 1.6, by - h * .06, w * .32, h * .16); g.fillStyle = '#e07b00'; g.fillRect(cx - w * .16 + eo * 1.6, by + h * .06, w * .32, h * .04); }
  if (an === 'kedi' || an === 'tilki' || an === 'tavsan') { g.fillStyle = an === 'tilki' ? '#ffffff' : 'rgba(255,255,255,.75)'; g.fillRect(cx - w * .14 + eo, by - h * .08, w * .28, h * .22); g.fillStyle = an === 'kedi' ? '#ff7eb6' : '#1c1c28'; g.fillRect(cx - w * .04 + eo, by - h * .08, w * .08, h * .08); }
  if (an === 'kedi') { g.strokeStyle = 'rgba(28,28,40,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - w * .16 + eo, by); g.lineTo(cx - w * .42 + eo, by - h * .05); g.moveTo(cx + w * .16 + eo, by); g.lineTo(cx + w * .42 + eo, by - h * .05); g.stroke(); }
  if (an === 'panda') { g.fillStyle = '#1c1c28'; g.fillRect(cx - w * .05 + eo, by - h * .04, w * .1, h * .08); }
  void topY;
  g.restore();
}
function faceOf(rec) { if (!rec) return 'b'; if (rec.r > rec.fr) return 'f'; if (rec.r < rec.fr) return 'b'; if (rec.x < rec.fx - .3) return 'l'; if (rec.x > rec.fx + .3) return 'r'; return 'b'; }
function drawEagle(g, cx, cy, t, carry, col) {
  const flap = Math.sin(t * 22) * .5, s = cell;
  g.save();
  g.fillStyle = 'rgba(16,20,40,.25)'; g.beginPath(); g.ellipse(cx, cy + s * 1.6, s * .8, s * .2, 0, 0, TAU); g.fill();
  g.fillStyle = '#6b3f1d';
  g.beginPath(); g.moveTo(cx - s * .2, cy); g.lineTo(cx - s * 1.1, cy - s * (.25 + flap * .5)); g.lineTo(cx - s * .9, cy + s * .12); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(cx + s * .2, cy); g.lineTo(cx + s * 1.1, cy - s * (.25 + flap * .5)); g.lineTo(cx + s * .9, cy + s * .12); g.closePath(); g.fill();
  g.fillStyle = '#8b5a2b'; g.fillRect(cx - s * .22, cy - s * .2, s * .44, s * .5);
  g.fillStyle = '#ffffff'; g.fillRect(cx - s * .16, cy - s * .42, s * .32, s * .26);
  g.fillStyle = '#ffc300'; g.fillRect(cx - s * .05, cy - s * .2, s * .1, s * .1);
  g.fillStyle = '#1c1c28'; g.fillRect(cx - s * .1, cy - s * .34, s * .05, s * .05); g.fillRect(cx + s * .05, cy - s * .34, s * .05, s * .05);
  if (carry) { g.fillStyle = col; g.fillRect(cx - s * .2, cy + s * .3, s * .4, s * .3); g.fillStyle = shade(col, .3); g.fillRect(cx - s * .2, cy + s * .26, s * .4, s * .06); }
  g.restore();
}

/* ---- ana çizim ---- */
function playerDraws(now) {
  const out = [];
  if (!V) return out;
  V.players.forEach((pl, i) => {
    const mine = me && i === V.me;
    let rec, alive, life;
    if (mine) { rec = me.rec; alive = !me.dead; life = me.life; }
    else { const R = rem[i]; rec = R && R.rec ? R.rec : arrRec(V.p[i].rec); alive = V.p[i].alive && !(R && R.dead && R.dead.life === (R.life)); life = R ? R.life : V.p[i].life; }
    if (!rec || !alive) return;
    const t = mine ? now : now - REMOTE_DELAY, p = posAt(rec, t), rf = rec.fr + (rec.r - rec.fr) * p.u;
    const z = p.air ? Math.sin(Math.PI * p.u) * cell * .42 : 0;
    const since = t - rec.ts - HOP;
    let sx = 1, sy = 1;
    if (p.air) { if (p.u < .2) { sx = 1.14; sy = .8; } else { sx = .9; sy = 1.14; } }
    else if (since < 110) { const k = since / 110; sx = 1.18 - .18 * k; sy = .78 + .22 * k; }
    if (mine && me.bump && pnow() - me.bump < 160) { sx = 1.1; sy = .9; }
    out.push({ i, rec, x: p.x, rf, row: Math.round(rf), z, sx, sy, mine, life, face: mine ? me.face || faceOf(rec) : faceOf(rec) });
  });
  return out;
}
function draw(now, dt) {
  const g = cg; if (!g || !C) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const tau = (now - V.t0) / 1000;
  g.fillStyle = '#7ccf4e'; g.fillRect(0, 0, sw, sh);
  const rTop = Math.ceil(camR + anchorY / rp) + 2, rBot = Math.floor(camR - (sh - anchorY) / rp) - 1;
  for (let r = rTop; r >= rBot; r--) drawGround(g, r, tau, now);
  const pls = playerDraws(now), byRow = {};
  pls.forEach(p => { (byRow[p.row] = byRow[p.row] || []).push(p); });
  const flats = {};
  dfx.forEach(d => { if (d.cause === 'car' || d.cause === 'train') (flats[Math.round(d.r)] = flats[Math.round(d.r)] || []).push(d); });
  const tp = pnow();
  for (let r = rTop + 2; r >= rBot; r--) {
    if (flats[r]) flats[r].forEach(d => { const pl = V.players[d.pi]; if (!pl) return; const age = tp - d.t; if (V.mode === 'puan' && age > 1900) return; const L = C.lane(r); drawAnimal(g, pl.an, pl.color, X(d.x), Y(r) - liftOf(L) * rp, 0, 1, 1, 'b', d.pi === V.me ? 1 : .7, true); });
    drawRowObjects(g, r, tau, now);
    if (byRow[r]) byRow[r].sort((a, b) => (a.mine ? 1 : 0) - (b.mine ? 1 : 0)).forEach(p => drawPlayer(g, p, tau, now));
  }
  drawParts(g, dt);
  // sınır dışı karartma
  g.fillStyle = 'rgba(14,4,36,.34)'; g.fillRect(0, 0, Math.max(0, X(-.5)), sh); g.fillRect(X(COLS - .5), 0, sw - X(COLS - .5), sh);
  g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(X(-.5) - 1, 0, 2, sh); g.fillRect(X(COLS - .5) - 1, 0, 2, sh);
  // kartal çizgisi
  if (V.mode === 'hayatta') {
    const K = killLine(DIFFS[V.diff] || 1, tau), ky = Y(K) + rp * .5;
    if (ky < sh) {
      const gr = g.createLinearGradient(0, ky - rp * 1.5, 0, ky + rp);
      gr.addColorStop(0, 'rgba(160,0,30,0)'); gr.addColorStop(.6, 'rgba(160,0,30,.35)'); gr.addColorStop(1, 'rgba(90,0,20,.62)');
      g.fillStyle = gr; g.fillRect(0, ky - rp * 1.5, sw, sh - ky + rp * 1.5);
      g.fillStyle = 'rgba(255,80,90,.85)'; for (let x = (now / 20) % 24 - 24; x < sw; x += 24) g.fillRect(x, ky - 2, 14, 3);
      const ex = sw / 2 + Math.sin(now / 900) * sw * .3;
      drawEagle(g, ex, Math.min(sh - cell * 1.2, ky + rp * .4), now / 1000, false);
    }
  }
  drawDeaths(g, tau);
  drawFloats(g);
}
function drawPlayer(g, p, tau, now) {
  const pl = V.players[p.i], L = C.lane(p.row), lf = liftOf(L) * rp;
  const cx = X(p.x), cy = Y(p.rf) - lf;
  if (p.mine) { g.strokeStyle = shade(pl.color, .2); g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy + rp * .1, cell * .42, rp * .3, 0, 0, TAU); g.stroke(); }
  drawAnimal(g, pl.an, pl.color, cx, cy, p.z, p.sx, p.sy, p.face, p.mine ? 1 : .68, false);
  // isim etiketi
  if (!p.mine || now < V.t0 + 2500) {
    const label = p.mine ? 'SEN' : shortName(pl), fs = Math.max(10, Math.min(13, cell * .3));
    g.font = `900 ${fs}px Nunito, "Segoe UI", sans-serif`;
    const stag = (Math.round(p.x) & 1) ? fs * 1.45 : 0;
    const tw = Math.min(g.measureText(label).width, cell * 2.2) + 10, ty = cy - p.z - cell * .72 - rp * .3 - stag;
    g.globalAlpha = p.mine ? 1 : .85;
    g.fillStyle = 'rgba(18,5,46,.75)'; rr(g, cx - tw / 2, ty - fs * .7, tw, fs * 1.4, fs * .7); g.fill();
    g.fillStyle = pl.color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, cx, ty + 1, cell * 2.2);
    g.globalAlpha = 1;
  }
}
function drawParts(g, dt) {
  parts = parts.filter(p => (p.life -= dt) > 0);
  for (const p of parts) {
    p.x += p.vx * dt; p.r += p.vr * dt; p.z = Math.max(0, p.z + p.vz * dt); p.vz -= p.g * dt;
    const a = clamp(p.life / p.max, 0, 1), L = C.lane(Math.round(p.r)), sx = X(p.x), sy = Y(p.r) - liftOf(L) * rp - p.z * cell, s = p.s * cell;
    g.globalAlpha = a; g.fillStyle = p.c;
    if (p.star) { g.save(); g.translate(sx, sy); g.rotate(p.life * 6); g.fillRect(-s / 2, -s / 2, s, s); g.restore(); }
    else { g.beginPath(); g.arc(sx, sy, s, 0, TAU); g.fill(); }
  }
  g.globalAlpha = 1;
}
function drawDeaths(g) {
  const t = pnow();
  dfx = dfx.filter(d => t - d.t < (d.cause === 'eagle' ? 2200 : d.cause === 'water' || d.cause === 'edge' ? 1400 : 60000));
  for (const d of dfx) {
    const age = (t - d.t) / 1000, L = C.lane(Math.round(d.r)), cx = X(d.x), cy = Y(d.r) - liftOf(L) * rp;
    if (d.cause === 'water' || d.cause === 'edge') {
      for (let k = 0; k < 3; k++) { const a = age - k * .18; if (a < 0 || a > 1) continue; g.strokeStyle = `rgba(255,255,255,${(1 - a) * .8})`; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, cell * (.2 + a * .6), rp * (.12 + a * .35), 0, 0, TAU); g.stroke(); }
    } else if (d.cause === 'eagle') {
      const pl = V.players[d.pi]; if (!pl) continue;
      let ey, carry = age > .45;
      if (age < .45) ey = cy - (1 - age / .45) * (cy + cell);
      else ey = cy - (age - .45) * sh * .9;
      if (!carry) drawAnimal(g, pl.an, pl.color, cx, cy, 0, 1, 1, 'b', d.pi === V.me ? 1 : .68, false);
      drawEagle(g, cx, ey - cell * .4, age, carry, pl.color);
    }
  }
}
function drawFloats(g) {
  const t = pnow();
  floats = floats.filter(f => t - f.t < f.dur);
  for (const f of floats) {
    const a = (t - f.t) / f.dur; if (a < 0) continue;
    const L = C.lane(Math.round(f.r)), x = X(f.x), y = Y(f.r) - liftOf(L) * rp - cell * (.6 + a * .9);
    g.globalAlpha = clamp(1.4 - a * 1.4, 0, 1);
    text(g, f.txt, x, y, (f.big ? cell * .5 : cell * .36) * (a < .15 ? .7 + a * 2 : 1), f.col, '#2a0a3a');
  }
  g.globalAlpha = 1;
}

/* ---- HUD ---- */
function liveBest(i) {
  if (!V) return 0;
  let b = V.p[i].best;
  if (me && i === V.me) b = Math.max(b, me.best || 0);
  else if (rem[i] && rem[i].best != null) b = Math.max(b, rem[i].best);
  return b;
}
function coinsOf(i) { return me && i === V.me ? Math.max(V.p[i].coins, mySum()) : V.p[i].coins; }
function aliveOf(i) { if (me && i === V.me) return !me.dead; return V.p[i].alive; }
function shortName(p) { const m = /^Bilgisayar(?: (\d+))?$/.exec(p.name); return m && p.isBot ? `🤖 ${m[1] || ''}`.trim() : p.name; }
function renderBoard() {
  const v = V, board = q('.gk-board'); if (!board) return;
  const puan = v.mode === 'puan';
  const rows = v.players.map((p, i) => ({ p, i, val: puan ? coinsOf(i) : liveBest(i), alive: aliveOf(i) }));
  rows.sort((a, b) => (v.mode === 'hayatta' ? (+b.alive - +a.alive) : 0) || b.val - a.val || a.i - b.i);
  const key = JSON.stringify(rows.map(r => [r.i, r.val, r.alive, r.p.online])) + v.me;
  if (key === boardKey) return;
  boardKey = key;
  board.classList.toggle('many', rows.length > 5);
  board.innerHTML = rows.map((r, k) => `<li class="${r.i === v.me ? 'me' : ''} ${r.alive ? '' : 'out'} ${r.p.online ? '' : 'off'}" style="--pc:${r.p.color}"><span class="gk-bn">${k + 1}</span><span class="av" style="--pc:${r.p.color}">${initial(r.p.name)}</span><b>${esc(shortName(r.p))}</b><span class="gk-bv">${r.alive ? '' : (puan ? '⏳' : '✖')}${r.val}<small>${puan ? '🪙' : 'm'}</small></span></li>`).join('');
}
function renderSide() {
  const side = q('.gk-side'); if (!side || !V) return;
  const key = `${V.mode}:${V.diff}:${V.dur}`;
  if (key === sideKey) return;
  sideKey = key;
  const md = MODES[V.mode];
  const rules = {
    yaris: ['🏁 Herkes aynı parkurda aynı anda koşar; diğerlerini hayalet olarak görürsün.', '💥 Çarpan, suya düşen ya da trene yakalanan elenir ve izler.', '🏆 Herkes elenince ya da süre bitince en uzağa giden kazanır.'],
    hayatta: ['🦅 Kamera durmadan ilerler; geride kalanı kartal kapar.', '⚡ Kartal zamanla hızlanır — oyalanma!', '🏆 Son hayatta kalan kazanır.'],
    puan: ['🪙 Parkurdaki altınları topla (büyük altın 5 puan).', '🔁 Ölürsen 2 saniye sonra geride bir çimenlikte yeniden doğarsın.', '🏆 Süre bitince en çok altını olan kazanır.']
  }[V.mode];
  side.innerHTML = `<h3 class="gk-h">${md.icon} ${esc(md.name)}</h3><p class="gk-sub">${esc(DIFF_NAMES[V.diff])} · ${V.dur} sn · ortak tohumlu parkur</p>
    <ul class="gk-rules">${rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
    <div class="gk-legend"><span class="gk-lh">Parkur</span>
      <div><b>🚗 Yol</b><small>Araba, taksi, dolmuş, otobüs, kamyon ve simit arabası — boşluğu kolla.</small></div>
      <div><b>🚆 Hemzemin geçit</b><small>Kırmızı ışık yanıp sönüyorsa tren geliyor!</small></div>
      <div><b>🌊 Nehir</b><small>Kütüklere, nilüferlere ve vapura bas; suya düşme, akıntı seni kenara taşımasın.</small></div>
      <div><b>🌳 Çimen</b><small>Ağaç ve kayalar yolu keser; yandan dolaş.</small></div>
    </div>
    <p class="gk-keys">${isTouch() ? '👆 <b>Dokun</b>: ileri zıpla · <b>Kaydır</b>: sola, sağa ya da geri' : '⌨️ <b>Oklar / WASD</b> ile zıpla · <b>Boşluk</b>: ileri · telefonda dokun ve kaydır'}</p>`;
}
function statusText() {
  const v = V, now = hnow(), mi = v.me;
  if (v.phase === 'over') return ['🏆 Oyun bitti!', 'win'];
  if (now < v.t0) return [mi < 0 ? '👀 Yarış başlıyor…' : '⏳ Hazır ol…', ''];
  if (mi < 0) return ['👀 İzliyorsun', ''];
  if (me && me.dead) {
    if (v.mode === 'puan') return ['⏳ Birazdan geri dönüyorsun…', 'bad'];
    let lead = null, lb = -99; v.players.forEach((_, i) => { if (i !== mi && aliveOf(i) && liveBest(i) > lb) { lb = liveBest(i); lead = i; } });
    return [`${CAUSE_ICON[me.dead.cause]} Elendin — ${lead != null ? `izliyorsun: <b style="color:${v.players[lead].color}">${esc(v.players[lead].name)}</b>` : 'sonuç bekleniyor'}`, 'bad'];
  }
  if (v.mode === 'hayatta') {
    const K = killLine(DIFFS[v.diff] || 1, (now - v.t0) / 1000);
    if (me && me.rec.r - K < 2.2) return ['⚠️ KARTAL YAKLAŞIYOR — ileri!', 'mine hot'];
    return ['🦅 Durma, ilerle!', 'mine'];
  }
  if (v.mode === 'puan') return ['🪙 Altınları topla!', 'mine'];
  return ['🏁 İleri atla, en uzağa git!', 'mine'];
}
function hudTick() {
  if (!V || !root) return;
  const v = V, now = hnow();
  const left = Math.max(0, v.endsAt - now), secs = Math.ceil(left / 1000);
  const tm = q('.gk-timer b'); if (tm) tm.textContent = now < v.t0 ? mmss(v.dur) : mmss(secs);
  q('.gk-timer').classList.toggle('urgent', v.phase === 'play' && secs <= 10 && now >= v.t0);
  const mi = v.me, focus = mi >= 0 ? mi : null;
  const dist = focus != null ? liveBest(focus) : Math.max(0, ...v.players.map((_, i) => liveBest(i)));
  const db = q('.gk-dist b'); if (db && db.textContent !== String(Math.max(0, dist))) { db.textContent = Math.max(0, dist); db.parentNode.classList.remove('bump'); void db.offsetWidth; db.parentNode.classList.add('bump'); }
  const cn = q('.gk-coin'); if (cn) { cn.hidden = v.mode !== 'puan' || mi < 0; const b = cn.querySelector('b'); const s = String(mi >= 0 ? coinsOf(mi) : 0); if (b.textContent !== s) b.textContent = s; }
  const [st, cls] = statusText(), se = q('.gk-status');
  const html = `<span class="g-turn ${cls}">${st}</span>`; if (se.innerHTML !== html) se.innerHTML = html;
  // geri sayım
  const cnt = q('.gk-count');
  if (now < v.t0 && v.phase !== 'over') {
    const n = Math.max(1, Math.ceil((v.t0 - now) / 1000));
    if (cnt.hidden || cnt.dataset.n !== String(n)) {
      cnt.dataset.n = String(n); cnt.hidden = false;
      const md = MODES[v.mode], an = mi >= 0 ? v.players[mi].an : null;
      cnt.innerHTML = `<div class="gk-ccard"><small>${md.icon} ${esc(md.name).toLocaleUpperCase('tr-TR')} · ${esc(DIFF_NAMES[v.diff]).toLocaleUpperCase('tr-TR')}</small><b class="gk-cnum">${n}</b>${an ? `<p>Sen: <b style="color:${v.players[mi].color}">${ANIMAL_NAMES[an]}</b></p>` : '<p>İzliyorsun</p>'}<p class="gk-chint">${isTouch() ? 'Dokun: ileri · Kaydır: yön' : 'Oklar / WASD ile zıpla'}</p></div>`;
      if (n <= 3 && lastSec !== n) Sound.tick(.8);
      lastSec = n;
    }
  } else if (!cnt.hidden) { cnt.hidden = true; }
  renderBoard();
  if (pnow() - layoutAt > 1500) { layoutAt = pnow(); layout(); }
  // tren çanı (yakındaki geçitte)
  if (C && v.phase === 'play' && mi >= 0) {
    const tau = (now - v.t0) / 1000, base = me ? me.rec.r : Math.round(camR);
    for (let r = base - 1; r <= base + 4; r++) { const L = C.lane(r); if (L.k !== 'rail') continue; const w = trainWarn(L, tau), was = warnBell[r]; if (w && !was) snd.bell(); warnBell[r] = w; }
  }
}
function renderOver() {
  const el = q('.gk-over'); if (!el) return;
  if (V.phase !== 'over' || !V.over) { el.hidden = true; overShown = false; return; }
  if (overShown) return;
  overShown = true;
  const rows = V.over.rows, medals = ['🥇', '🥈', '🥉'];
  el.innerHTML = `<div class="gk-ocard"><small>${MODES[V.mode].icon} ${esc(MODES[V.mode].name).toLocaleUpperCase('tr-TR')}</small><h3>${V.over.reason === 'time' ? '⏱ Süre doldu!' : V.over.reason === 'last' ? '🦅 Son kalan belli!' : '💥 Herkes elendi!'}</h3>
    <ol class="gk-res">${rows.map((r, k) => { const p = V.players[r.pi]; return `<li class="${k === 0 ? 'win' : ''}" style="--pc:${p.color}"><span class="gk-md">${medals[k] || (k + 1) + '.'}</span><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><b>${esc(p.name)}${r.pi === V.me ? ' (sen)' : ''}</b><span class="gk-rv">${esc(r.label)}</span></li>`; }).join('')}</ol><p class="gk-onext">Sonuçlar geliyor…</p></div>`;
  el.hidden = false;
}

/* ---- görünüm ---- */
function syncFromView(v) {
  const mi = v.me;
  if (mi >= 0) {
    const pv = v.p[mi], rec = arrRec(pv.rec);
    if (!me || me.life !== pv.life || me.token !== v.seed || (v.phase === 'count' && hnow() < v.t0 - 200 && me.n === 0 && rec)) {
      me = { rec, n: pv.n, life: pv.life, dead: null, queue: null, got: new Set(me && me.token === v.seed ? me.got : []), best: pv.best, face: 'f', token: v.seed };
      if (!pv.alive) me.dead = { cause: pv.cause || 'car', at: pv.deadAt, r: pv.dpos ? pv.dpos[0] : rec.r, x: pv.dpos ? pv.dpos[1] : rec.x };
    } else {
      if (pv.n > me.n && rec) { me.rec = rec; me.n = pv.n; }
      if (!pv.alive && !me.dead) { me.dead = { cause: pv.cause || 'car', at: pv.deadAt, r: pv.dpos ? pv.dpos[0] : me.rec.r, x: pv.dpos ? pv.dpos[1] : me.rec.x }; deathFx(mi, me.dead.cause, me.dead.r, me.dead.x, true); }
      me.best = Math.max(me.best || 0, pv.best);
    }
    (v.got || []).forEach(k => me.got.add(k));
  } else me = null;
  v.players.forEach((_, i) => {
    if (i === mi) return;
    const pv = v.p[i], R = remOf(i), rec = arrRec(pv.rec);
    if (rec && (pv.life > R.life || (pv.life === R.life && pv.n > R.n))) { R.rec = rec; R.n = pv.n; R.life = pv.life; }
    R.best = Math.max(R.best == null ? -99 : R.best, pv.best);
  });
}
function render(v) {
  const first = !V || V.seed !== v.seed;
  V = v;
  if (!v || !root) return;
  if (first) { C = courseFor(v.seed, v.diff, v.mode === 'puan'); rem = []; parts = []; floats = []; dfx = []; camInit = false; boardKey = ''; overShown = false; warnBell = {}; me = null; }
  syncFromView(v);
  const key = `${v.seed}:${v.phase}`;
  if (key !== seenKey) { seenKey = key; if (v.phase === 'count') requestAnimationFrame(resize); }
  const w = q('.gk'); w.dataset.mode = v.mode; w.dataset.phase = v.phase;
  renderSide(); renderOver(); hudTick();
  if (!raf) raf = requestAnimationFrame(frame);
}
function frame(ts) {
  raf = 0;
  if (!root || !V || !C) return;
  const dt = lastT ? Math.min(.1, (ts - lastT) / 1000) : .016; lastT = ts;
  const now = hnow();
  try { stepMe(now); stepCam(dt, now); draw(now, dt); } catch (e) { console.error(e); }
  raf = requestAnimationFrame(frame);
}

/* ---- olaylar ---- */
function onEvent(e) {
  if (!root || !V) return;
  const mi = ui ? ui.me : -1;
  if (e.t === 'go') { pop('BAŞLA!', 'good'); Sound.whoosh(); }
  else if (e.t === 'die') {
    if (e.pi === mi && me && me.dead && me.life === e.life) { me.dead.r = e.r; me.dead.x = e.x; return; }
    if (e.pi === mi && me && me.life === e.life && !me.dead) { me.dead = { cause: e.cause, at: hnow(), r: e.r, x: e.x }; deathFx(mi, e.cause, e.r, e.x, true); return; }
    if (e.pi !== mi) { const R = remOf(e.pi); R.dead = { life: e.life }; deathFx(e.pi, e.cause, e.r, e.x, false); }
  } else if (e.t === 'snap') {
    if (e.pi === mi && me && me.life === e.life) { const rec = arrRec(e.rec); if (rec) { me.rec = rec; me.n = Math.max(me.n, e.n); me.queue = null; } }
  } else if (e.t === 'respawn') {
    const rec = arrRec(e.rec); if (!rec) return;
    if (e.pi === mi && me) { me.rec = rec; me.life = e.life; me.n = e.n; me.dead = null; me.queue = null; pop('GERİ DÖNDÜN!', 'good'); Sound.good(); dfx = dfx.filter(d => d.pi !== mi); }
    else { const R = remOf(e.pi); R.rec = rec; R.life = e.life; R.n = e.n; R.dead = null; dfx = dfx.filter(d => d.pi !== e.pi); }
    sparkle(rec.x, rec.r, 10);
  } else if (e.t === 'over') {
    Sound.solve();
    if (e.w === mi) { pop('KAZANDIN!', 'good'); FX.confetti(90); }
    else pop('BİTTİ!', 'pink');
  }
}

/* ---- giriş ---- */
function onDown(e) {
  if (e.target.closest && e.target.closest('button')) return;
  if (!V) return;
  e.preventDefault(); Sound.init();
  ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, t: pnow(), done: false };
  try { stageEl.setPointerCapture(e.pointerId); } catch { /* */ }
  stageEl.focus({ preventScroll: true });
}
function swipeDir(dx, dy) { return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'l' : 'r') : (dy < 0 ? 'f' : 'b'); }
function onMove(e) {
  if (!ptr || e.pointerId !== ptr.id || ptr.done) return;
  const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
  if (Math.hypot(dx, dy) > 34) { ptr.done = true; input(swipeDir(dx, dy)); }
}
function onUp(e) {
  if (!ptr || e.pointerId !== ptr.id) return;
  const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y, done = ptr.done; ptr = null;
  if (done) return;
  if (Math.hypot(dx, dy) < 22) input('f'); else input(swipeDir(dx, dy));
}
const KEYMAP = { ArrowUp: 'f', KeyW: 'f', Space: 'f', ArrowDown: 'b', KeyS: 'b', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
function onKey(e) {
  if (!V || !root || (e.target && e.target.closest && e.target.closest('input,textarea,select'))) return;
  const d = KEYMAP[e.code]; if (!d) return;
  if (V.me >= 0) e.preventDefault();
  if (e.repeat) return;
  Sound.init(); input(d);
}

function mount(r, api) {
  root = r; ui = api; uiRef = api; V = null; C = null; me = null; rem = []; parts = []; floats = []; dfx = [];
  seenKey = ''; boardKey = ''; sideKey = ''; lastSec = -1; overShown = false; camInit = false; lastT = 0; warnBell = {}; hintHidden = false; ptr = null;
  root.innerHTML = `<div class="g-wrap gk">
    <div class="gk-main">
      <div class="gk-stage" tabindex="0" aria-label="Geçit Koşusu parkuru — oklarla ya da dokunarak zıpla">
        <canvas class="gk-cv"></canvas>
        <div class="gk-tl">
          <div class="gk-dist"><b>0</b><small>m</small></div>
          <div class="gk-meta"><span class="gk-timer">⏱ <b>0:00</b></span><span class="gk-coin" hidden>🪙 <b>0</b></span></div>
        </div>
        <ol class="gk-board" aria-label="Canlı sıralama"></ol>
        <div class="gk-status" aria-live="polite"></div>
        <div class="gk-hint">${isTouch() ? '👆 Dokun: ileri · Kaydır: sola / sağa / geri' : '⌨️ Oklar / WASD: zıpla'}</div>
        <div class="gk-pop" aria-live="polite"></div>
        <div class="gk-count" hidden></div>
        <div class="gk-over" hidden></div>
      </div>
      <aside class="gk-side g-panel"></aside>
    </div>
  </div>`;
  cv = q('.gk-cv'); cg = cv.getContext('2d'); stageEl = q('.gk-stage');
  stageEl.addEventListener('pointerdown', onDown); stageEl.addEventListener('pointermove', onMove);
  stageEl.addEventListener('pointerup', onUp); stageEl.addEventListener('pointercancel', () => { ptr = null; });
  stageEl.addEventListener('contextmenu', e => e.preventDefault());
  if (window.ResizeObserver) { ro = new ResizeObserver(() => resize()); ro.observe(stageEl); }
  addEventListener('resize', resize);
  document.addEventListener('keydown', onKey);
  hudT = setInterval(hudTick, 120);
  requestAnimationFrame(resize);
}
function unmount() {
  removeEventListener('resize', resize); document.removeEventListener('keydown', onKey);
  if (ro) { ro.disconnect(); ro = null; }
  clearInterval(hudT); clearTimeout(popT); if (raf) cancelAnimationFrame(raf);
  raf = 0; root = null; ui = null; uiRef = null; V = null; C = null; cv = null; cg = null; stageEl = null; me = null; rem = [];
}

CFX.registerGame(Object.assign({
  id: 'gecit', name: 'Geçit Koşusu', icon: '🐔', color: '#7ccf4e', min: 1, max: 8, hotseat: false, bot: true, localMin: 1,
  tagline: 'Yolu, treni, nehri zıplayarak geç!',
  rules: 'Herkes aynı tohumlu parkurda aynı anda zıplar: yollardaki arabalardan, dolmuşlardan ve trenden kaç, nehirde kütüklere ve vapura bas. Yarış\'ta en uzağa giden, Hayatta Kal\'da kartala yakalanmayan son kişi, Puan Avı\'nda en çok altın toplayan kazanır. Telefonda dokun ve kaydır, bilgisayarda oklar.',
  options: [
    { key: 'mod', label: 'Mod', def: 'yaris', choices: [{ v: 'yaris', label: '🏁 Yarış' }, { v: 'hayatta', label: '🦅 Hayatta Kal' }, { v: 'puan', label: '🪙 Puan Avı' }] },
    { key: 'sure', label: 'Süre', def: '90', choices: [{ v: '60', label: '60 sn' }, { v: '90', label: '90 sn' }, { v: '120', label: '120 sn' }, { v: '180', label: '180 sn' }] },
    { key: 'zorluk', label: 'Zorluk', def: 'normal', choices: [{ v: 'kolay', label: 'Kolay' }, { v: 'normal', label: 'Normal' }, { v: 'zor', label: 'Zor' }] }
  ],
  mount, render, onEvent, onFast, unmount,
  // test ve geliştirme için dışa açık yardımcılar
  _gk: { COLS, HOP, MIN_ROW, SPAN, PAD, TRAIN_LEN, TRAIN_SPD, LAG, SPREAD, Course, courseFor, posAt, tryHop, deathAt, killLine, support, hitRoad, hitTrain, trainSpan, trainWarn, movX, mkRec, recArr, arrRec,
    botDecide, botHop, applyHop, hostHumanHop, kill, finish, rankOf, safeFor, planStep, cellOpen, deadEnd,
    me: () => me, rem: () => rem, input: d => input(d), cam: () => ({ camR, cell, rp, ox, anchorY, sw, sh }), X: x => X(x), Y: r => Y(r) }
}, RULES));
})();
