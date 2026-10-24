/* =========================================================================
   KAFA TOPU — üstten görünümlü fizik futbolu (1v1 … 4v4)
     · Oyuncular ve top birer disk; esnek çarpışma, sürtünme, direkler, file,
       saha kenarı duvarları, başlama vuruşu kuralı, basılı tutunca güçlenen şut
     · Modlar: Klasik · Kafa Kafaya (küçük kale, ceza sahası yok) · Çılgın Top
       (güçlendirmeler: büyük top, hızlı ayak, mıknatıs, buz zemin)
     · Ağ: yöneten cihaz fiziği 60 Hz sabit adımla çalıştırır, 20 Hz anlık
       görüntüyü (sıra numaralı, sıkıştırılmış tamsayı dizisi) ui.fast ile yayar.
       Katılımcılar girişlerini (yön + vuruş) sıra numarasıyla gönderir; kendi
       diskini anında tahmin eder, anlık görüntü gelince onaylanmamış girişleri
       yeniden oynatarak uzlaştırır, top ve diğer oyuncuları son bilinen
       girişleriyle aynı zaman çizgisine taşır; hatalar yumuşakça eritilir.
       Gol, skor, süre ve olaylar güvenilir kanaldan (view/emit) gelir.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, flash, initial } = window.CFX;

/* ------------------------------------------------------------------ sabitler */
const TICK = 1000 / 60, SUB = 2, SNAP_EVERY = 3;
const PR = 15, BR = 10, BR_BIG = 17, POST_R = 8, NET_D = 42, MARGIN = 38, CC_R = 82;
const ACC = 0.12, ACC_KICK = 0.084, P_DAMP = 0.96, B_DAMP = 0.99;
const ICE_P_DAMP = 0.985, ICE_ACC = 0.5, ICE_B_DAMP = 0.994;
const P_IM = 0.5, B_IM = 1, E_PP = 0.5, E_PB = 0.5, E_BW = 0.85, E_NET = 0.18, E_PW = 0.15, E_POST = 0.55;
const KICK = 5.0, KICK_MAX = 1.7, CHARGE_MS = 600, REACH = 4, REACH_LAG = 5, KICK_TTL = 9, B_VMAX = 13;
const SPD_K = 1.3, MAG_R = 64, MAG_F = 0.11, ITEM_R = 14;
const READY_MS = 2600, READY2_MS = 1600, GOAL_MS = 3400, SLOWMO_MS = 1700, KO_MAX_MS = 9000, OT_MAX = 120000, END_DELAY = 2600;
const TAU = Math.PI * 2;
const TEAM = [{ name: 'Kırmızı', col: '#ff3b5c', lt: '#ff8fa3', dk: '#a3122e' }, { name: 'Mavi', col: '#2f7bff', lt: '#8fbaff', dk: '#123c9c' }];
const SIZES = { kucuk: { w: 700, h: 320, g: 64, name: 'Küçük' }, orta: { w: 900, h: 420, g: 72, name: 'Orta' }, buyuk: { w: 1160, h: 540, g: 82, name: 'Büyük' } };
const MODES = { klasik: 'Klasik', kafa: 'Kafa Kafaya', cilgin: 'Çılgın Top' };
const ITEMS = {
  buyuk: { name: 'Büyük Top', icon: '🎈', dur: 9000, glob: true, col: '#ff9de2' },
  hiz: { name: 'Hızlı Ayak', icon: '⚡', dur: 8000, glob: false, col: '#ffe14a' },
  miknatis: { name: 'Mıknatıs', icon: '🧲', dur: 7000, glob: false, col: '#ff6b6b' },
  buz: { name: 'Buz Zemin', icon: '❄️', dur: 7000, glob: true, col: '#9be8ff' }
};
const ITEM_IDS = Object.keys(ITEMS);
const BOT_NAMES = ['Kaan', 'Ece', 'Arda', 'Defne', 'Emir', 'Nil', 'Mert', 'Ada'];
const PH = { teams: 0, ready: 1, kickoff: 2, play: 3, goal: 4, over: 5 };
const PH_N = ['teams', 'ready', 'kickoff', 'play', 'goal', 'over'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hyp = Math.hypot;
const shuf = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ------------------------------------------------------------------ giriş nicemleme (ağ ve tahmin aynı sayıları kullansın) */
const QA = 64, QCOS = [], QSIN = [];
for (let a = 0; a < QA; a++) { QCOS.push(Math.cos(a / QA * TAU)); QSIN.push(Math.sin(a / QA * TAU)); }
function qIn(ax, ay) {
  const l = hyp(ax, ay), m = Math.min(4, Math.round(Math.min(1, l) * 4));
  if (!m || !Number.isFinite(l)) return 0;
  let a = Math.round(Math.atan2(ay, ax) / TAU * QA); a = ((a % QA) + QA) % QA;
  return 1 + a * 4 + (m - 1);
}
function dqIn(c) {
  c = c | 0; if (c <= 0 || c > QA * 4) return [0, 0];
  c -= 1; const a = Math.floor(c / 4), m = (c % 4 + 1) / 4;
  return [QCOS[a] * m, QSIN[a] * m];
}
const kickPow = ms => 1 + (KICK_MAX - 1) * clamp((+ms || 0) / CHARGE_MS, 0, 1);

/* ------------------------------------------------------------------ saha geometrisi */
function geoOf(size, mode) {
  const S = SIZES[size] || SIZES.orta, hw = S.w / 2, hh = S.h / 2, gh = Math.round(S.g * (mode === 'kafa' ? 0.78 : 1));
  const net = [[-hw, -gh, -hw - NET_D, -gh], [-hw - NET_D, -gh, -hw - NET_D, gh], [-hw - NET_D, gh, -hw, gh],
    [hw, -gh, hw + NET_D, -gh], [hw + NET_D, -gh, hw + NET_D, gh], [hw + NET_D, gh, hw, gh]];
  const segB = [[-hw, -hh, hw, -hh], [-hw, hh, hw, hh], [-hw, -hh, -hw, -gh], [-hw, gh, -hw, hh], [hw, -hh, hw, -gh], [hw, gh, hw, hh]].concat(net);
  const segP = net.concat([[-hw, -gh, -hw, gh], [hw, -gh, hw, gh]]);
  const posts = [[-hw, -gh], [-hw, gh], [hw, -gh], [hw, gh]];
  return { size, mode, hw, hh, gh, segB, segP, posts, ox: hw + MARGIN, oy: hh + MARGIN, box: mode !== 'kafa' };
}
const autoSize = n => (n <= 2 ? 'kucuk' : n <= 5 ? 'orta' : 'buyuk');

/* ------------------------------------------------------------------ fizik (yöneten, katılımcı tahmini ve testler aynı kodu kullanır) */
function mkWorld(n) {
  return { b: { x: 0, y: 0, vx: 0, vy: 0 }, p: Array.from({ length: n }, () => ({ x: 0, y: 0, vx: 0, vy: 0 })), ph: 2, ko: 0, tm: Array(n).fill(0),
    fx: { big: 0, ice: 0, spd: Array(n).fill(0), mag: Array(n).fill(0) }, kq: Array(n).fill(null), kh: Array(n).fill(0), ic: Array(n).fill(0) };
}
function cloneW(W) {
  return { b: Object.assign({}, W.b), p: W.p.map(q => Object.assign({}, q)), ph: W.ph, ko: W.ko, tm: W.tm.slice(),
    fx: { big: W.fx.big, ice: W.fx.ice, spd: W.fx.spd.slice(), mag: W.fx.mag.slice() }, kq: W.kq.map(k => (k ? Object.assign({}, k) : null)), kh: W.kh.slice(), ic: W.ic.slice() };
}
function collide(a, b, ra, rb, ima, imb, e) {
  let dx = b.x - a.x, dy = b.y - a.y; const R = ra + rb; let d2 = dx * dx + dy * dy;
  if (d2 >= R * R) return false;
  if (d2 < 1e-6) { dx = 0.01; dy = 0; d2 = 1e-4; }
  const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = R - d, tot = ima + imb;
  a.x -= nx * ov * ima / tot; a.y -= ny * ov * ima / tot; b.x += nx * ov * imb / tot; b.y += ny * ov * imb / tot;
  const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rv < 0) { const j = -(1 + e) * rv / tot; a.vx -= nx * j * ima; a.vy -= ny * j * ima; b.vx += nx * j * imb; b.vy += ny * j * imb; }
  return true;
}
function segHit(o, r, s, e) {
  const sx = s[2] - s[0], sy = s[3] - s[1], l2 = sx * sx + sy * sy;
  const t = l2 ? clamp(((o.x - s[0]) * sx + (o.y - s[1]) * sy) / l2, 0, 1) : 0;
  const cx = s[0] + sx * t, cy = s[1] + sy * t; let dx = o.x - cx, dy = o.y - cy; const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return false;
  let d = Math.sqrt(d2);
  if (d < 1e-6) { const l = Math.sqrt(l2) || 1; dx = -sy / l; dy = sx / l; d = 1; } else { dx /= d; dy /= d; }
  const pen = r - (d < 1e-6 ? 0 : d); o.x += dx * pen; o.y += dy * pen;
  const vn = o.vx * dx + o.vy * dy; if (vn < 0) { o.vx -= (1 + e) * vn * dx; o.vy -= (1 + e) * vn * dy; }
  return true;
}
function postHit(o, r, px, py, e) {
  let dx = o.x - px, dy = o.y - py; const R = r + POST_R, d2 = dx * dx + dy * dy;
  if (d2 >= R * R) return false;
  const d = Math.sqrt(d2) || 0.01; dx /= d; dy /= d;
  o.x = px + dx * R; o.y = py + dy * R;
  const vn = o.vx * dx + o.vy * dy; if (vn < 0) { o.vx -= (1 + e) * vn * dx; o.vy -= (1 + e) * vn * dy; }
  return true;
}
const ballR = W => (W.fx.big ? BR_BIG : BR);
/* inp[i] = [ax, ay]; W.kh[i] = vuruş basılı; W.kq[i] = { pw, ttl, lag } bekleyen vuruş.  ev: { touch:[], kick:[], ko:false, post:false } */
function stepWorld(W, G, inp, ev) {
  const n = W.p.length, b = W.b, br = ballR(W), ice = !!W.fx.ice;
  for (let i = 0; i < n; i++) {
    const q = W.p[i], a = inp[i] || [0, 0];
    const acc = (W.kh[i] ? ACC_KICK : ACC) * (W.fx.spd[i] ? SPD_K : 1) * (ice ? ICE_ACC : 1);
    q.vx += a[0] * acc; q.vy += a[1] * acc;
  }
  const touched = new Set();
  for (let s = 0; s < SUB; s++) {
    for (let i = 0; i < n; i++) { const q = W.p[i]; q.x += q.vx / SUB; q.y += q.vy / SUB; }
    b.x += b.vx / SUB; b.y += b.vy / SUB;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) collide(W.p[i], W.p[j], PR, PR, P_IM, P_IM, E_PP);
    for (let i = 0; i < n; i++) if (collide(W.p[i], b, PR, br, P_IM, B_IM, E_PB)) touched.add(i);
    for (let k = 0; k < G.segB.length; k++) segHit(b, br, G.segB[k], k < 6 ? E_BW : E_NET);
    for (const p of G.posts) if (postHit(b, br, p[0], p[1], E_POST) && ev) ev.post = true;
    for (let i = 0; i < n; i++) {
      const q = W.p[i];
      for (const sg of G.segP) segHit(q, PR, sg, E_PW);
      for (const p of G.posts) postHit(q, PR, p[0], p[1], E_PW);
      if (q.x < -G.ox + PR) { q.x = -G.ox + PR; if (q.vx < 0) q.vx *= -E_PW; }
      if (q.x > G.ox - PR) { q.x = G.ox - PR; if (q.vx > 0) q.vx *= -E_PW; }
      if (q.y < -G.oy + PR) { q.y = -G.oy + PR; if (q.vy < 0) q.vy *= -E_PW; }
      if (q.y > G.oy - PR) { q.y = G.oy - PR; if (q.vy > 0) q.vy *= -E_PW; }
      if (W.ph === 2) {                                    // başlama vuruşu: herkes kendi yarısında, rakip takım daire dışında
        if (W.tm[i] === 0 && q.x > -0.5) { q.x = -0.5; if (q.vx > 0) q.vx = 0; }
        if (W.tm[i] === 1 && q.x < 0.5) { q.x = 0.5; if (q.vx < 0) q.vx = 0; }
        if (W.tm[i] !== W.ko) {
          const d = hyp(q.x, q.y);
          if (d < CC_R) { const ux = d > 0.01 ? q.x / d : (W.tm[i] === 0 ? -1 : 1), uy = d > 0.01 ? q.y / d : 0; q.x = ux * CC_R; q.y = uy * CC_R; const vn = q.vx * ux + q.vy * uy; if (vn < 0) { q.vx -= vn * ux; q.vy -= vn * uy; } }
        }
      }
    }
    if (W.ph === 2) { if (touched.size) { W.ph = 3; if (ev) ev.ko = true; } else { b.x = 0; b.y = 0; b.vx = 0; b.vy = 0; } }
  }
  const pd = ice ? ICE_P_DAMP : P_DAMP, bd = ice ? ICE_B_DAMP : B_DAMP;
  for (let i = 0; i < n; i++) { const q = W.p[i]; q.vx *= pd; q.vy *= pd; }
  b.vx *= bd; b.vy *= bd;
  if (Math.abs(b.x) > G.hw + 2 && Math.abs(b.y) < G.gh) { b.vx *= 0.92; b.vy *= 0.92; }   // file topu yutar
  for (let i = 0; i < n; i++) {                            // mıknatıs
    if (!W.fx.mag[i]) continue;
    const q = W.p[i], dx = q.x - b.x, dy = q.y - b.y, d = hyp(dx, dy), gap = d - PR - br;
    if (gap > 0.5 && gap < MAG_R && hyp(b.vx, b.vy) < 6) { b.vx += dx / d * MAG_F; b.vy += dy / d * MAG_F; }
  }
  for (let i = 0; i < n; i++) {                            // bekleyen vuruşlar
    const k = W.kq[i]; if (!k) continue;
    const q = W.p[i], dx = b.x - q.x, dy = b.y - q.y, d = hyp(dx, dy) || 0.01;
    if (d - PR - br <= REACH + (k.lag || 0)) {
      if (W.ph === 2 && W.tm[i] !== W.ko) { W.kq[i] = null; continue; }
      b.vx += dx / d * KICK * k.pw; b.vy += dy / d * KICK * k.pw;
      W.kq[i] = null; touched.add(i); if (ev) ev.kick.push(i);
      if (W.ph === 2) { W.ph = 3; if (ev) ev.ko = true; }
    } else if (--k.ttl <= 0) W.kq[i] = null;
  }
  const bs = hyp(b.vx, b.vy); if (bs > B_VMAX) { b.vx *= B_VMAX / bs; b.vy *= B_VMAX / bs; }
  if (ev) touched.forEach(i => ev.touch.push(i));
}

/* ------------------------------------------------------------------ anlık görüntü kodlama (20 Hz, tamsayı dizisi) */
const HDR = 8, PER = 8;
function encodeSnap(st) {
  const W = st.W, d = [st.tk, PH[st.phase], W.ko, (W.fx.big ? 1 : 0) | (W.fx.ice ? 2 : 0), Math.round(W.b.x * 10), Math.round(W.b.y * 10), Math.round(W.b.vx * 100), Math.round(W.b.vy * 100)];
  for (let i = 0; i < W.p.length; i++) {
    const q = W.p[i];
    d.push(Math.round(q.x * 10), Math.round(q.y * 10), Math.round(q.vx * 100), Math.round(q.vy * 100), W.ic[i] | 0,
      (W.kh[i] ? 1 : 0) | (W.fx.spd[i] ? 2 : 0) | (W.fx.mag[i] ? 4 : 0) | (W.ph === 2 ? 0 : 0), st.ackS[i] | 0, Math.min(255, st.ackT[i] | 0));
  }
  return d;
}
function decodeSnap(d) {
  if (!Array.isArray(d) || d.length < HDR || (d.length - HDR) % PER) return null;
  if (!d.every(Number.isFinite)) return null;
  const n = (d.length - HDR) / PER, s = { tk: d[0], pc: d[1], ko: d[2], big: !!(d[3] & 1), ice: !!(d[3] & 2), b: { x: d[4] / 10, y: d[5] / 10, vx: d[6] / 100, vy: d[7] / 100 }, p: [] };
  for (let i = 0; i < n; i++) {
    const o = HDR + i * PER;
    s.p.push({ x: d[o] / 10, y: d[o + 1] / 10, vx: d[o + 2] / 100, vy: d[o + 3] / 100, ic: d[o + 4], kh: !!(d[o + 5] & 1), spd: !!(d[o + 5] & 2), mag: !!(d[o + 5] & 4), as: d[o + 6], at: d[o + 7] });
  }
  return s;
}
function worldFromSnap(s, tm) {
  const n = s.p.length, W = mkWorld(n);
  W.b = Object.assign({}, s.b); W.ph = s.pc === 2 ? 2 : 3; W.ko = s.ko; W.tm = tm.slice(0, n); while (W.tm.length < n) W.tm.push(0);
  W.fx.big = s.big ? 1 : 0; W.fx.ice = s.ice ? 1 : 0;
  s.p.forEach((q, i) => { W.p[i] = { x: q.x, y: q.y, vx: q.vx, vy: q.vy }; W.ic[i] = q.ic; W.kh[i] = q.kh ? 1 : 0; W.fx.spd[i] = q.spd ? 1 : 0; W.fx.mag[i] = q.mag ? 1 : 0; });
  return W;
}

/* ------------------------------------------------------------------ yöneten taraf: kurallar */
let hostSt = null, hostCtx = null, loopSeq = 0, hostStepAt = 0, hostPrev = null, uiRef = null;
let uiLocal = () => null;                        // arayüz: yerel kontrol yuvası → { code, kh, kc, kp }

const pname = (st, i) => (st.bodies[i] ? st.bodies[i].name : '?');
const isOnline = () => !!(uiRef && uiRef.mode === 'online');
function teamOf(st, t) { return st.bodies.map((b, i) => (b.team === t ? i : -1)).filter(i => i >= 0); }
function bodyOfPi(st, pi) { return st.bodies.findIndex(b => b.pi === pi); }
function localSlots(st) {
  if (st.local) return st.bodies.map((b, i) => (b.pi >= 0 && b.pi < 2 && !b.bot && !b.auto ? i : -1)).filter(i => i >= 0).sort((a, b) => st.bodies[a].pi - st.bodies[b].pi);
  const i = bodyOfPi(st, st.hostPi); return i >= 0 ? [i] : [];
}
function curGeo(st) { if (!st._g || st._g.k !== st.size + st.mode) { st._g = geoOf(st.size, st.mode); st._g.k = st.size + st.mode; } return st._g; }
function sizeFor(st) { return st.sizeOpt === 'oto' ? autoSize(st.bodies.length) : st.sizeOpt; }
function renumber(st) { [0, 1].forEach(t => { let k = 1; st.bodies.forEach(b => { if (b.team === t) b.num = k++; }); }); }
function balanceTeams(st, order) {
  const c = [0, 0];
  order.forEach(i => { const t = c[0] <= c[1] ? 0 : 1; st.bodies[i].team = t; c[t]++; });
  renumber(st);
}
function formation(n) {
  const F = { 1: [[0.45, 0]], 2: [[0.3, 0], [0.72, 0]], 3: [[0.3, -0.42], [0.3, 0.42], [0.75, 0]], 4: [[0.28, 0], [0.52, -0.5], [0.52, 0.5], [0.8, 0]],
    5: [[0.27, -0.3], [0.27, 0.3], [0.55, -0.55], [0.55, 0.55], [0.82, 0]], 6: [[0.27, -0.3], [0.27, 0.3], [0.52, -0.6], [0.52, 0], [0.52, 0.6], [0.82, 0]],
    7: [[0.27, -0.3], [0.27, 0.3], [0.5, -0.65], [0.5, -0.22], [0.5, 0.22], [0.5, 0.65], [0.82, 0]] };
  return F[clamp(n, 1, 7)];
}
function placeKickoff(st) {
  const G = curGeo(st), W = st.W;
  W.b = { x: 0, y: 0, vx: 0, vy: 0 }; W.ph = 2; W.ko = st.ko;
  [0, 1].forEach(t => {
    const mem = teamOf(st, t), f = formation(mem.length), sgn = t === 0 ? -1 : 1;
    mem.forEach((bi, k) => {
      let fx = f[k][0], fy = f[k][1];
      let x = sgn * G.hw * fx, y = G.hh * fy;
      if (t !== st.ko) { const d = hyp(x, y); if (d < CC_R + PR + 4) { x = sgn * (CC_R + PR + 4); } }
      else if (k === 0) { x = sgn * (PR + BR + 22); y = 0; }
      W.p[bi] = { x, y, vx: 0, vy: 0 };
      W.kq[bi] = null; W.kh[bi] = 0;
    });
  });
  W.tm = st.bodies.map(b => b.team);
}
function emptyStats() { return { g: 0, a: 0, t: 0, og: 0, sh: 0 }; }

function buildBodies(players, local) {
  const bodies = players.map((p, i) => ({ pi: i, name: p.name, col: p.color, team: 0, bot: !!p.isBot, xb: false, auto: !!(local && !p.isBot && i >= 2), num: 0 }));
  return bodies;
}
function setup(players, opts, ctx) {
  opts = opts || {};
  const local = ctx.mode === 'local';
  const st = {
    v: 1, local, hostPi: ctx.hostPi < 0 ? 0 : ctx.hostPi,
    dur: [3, 5, 10].includes(+opts.sure) ? +opts.sure : 3,
    lim: opts.gol === 'yok' ? 0 : ([3, 5, 7].includes(+opts.gol) ? +opts.gol : 5),
    sizeOpt: SIZES[opts.saha] ? opts.saha : 'oto',
    mode: MODES[opts.mod] ? opts.mod : 'klasik',
    players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot, cid: p.cid || null })),
    bodies: buildBodies(players, local), phase: 'teams', size: 'orta',
    W: null, tk: 0, ms: 0, until: 0, phaseAt: 0, ko: 0, koAt: 0, goalAt: 0, score: [0, 0], clock: 0, ot: false, otMs: 0, endAfter: false,
    stats: [], goals: [], touches: [], items: [], idc: 0, nextItem: 0, fxT: { big: 0, ice: 0, spd: [], mag: [] },
    inp: [], ackS: [], ackT: [], kc: [], kreq: [], nonce: [], lkc: [], off: players.map(() => false),
    ai: { role: [], att: [-1, -1], br: [], sIdx: [] }, lastTouchMs: 0, lastSyncMs: -1e9, result: null, xbN: 0, started: false
  };
  // takımlar: yerelde 1. oyuncu Kırmızı, 2. oyuncu Mavi; geri kalan dengeli
  const order = local ? [0].concat(players.length > 1 ? [1] : [], players.map((_, i) => i).slice(2)) : players.map((_, i) => i);
  if (local && players.length > 1 && !players[1].isBot) { st.bodies[0].team = 0; st.bodies[1].team = 1; const c = [1, 1]; for (let i = 2; i < players.length; i++) { const t = c[0] <= c[1] ? 0 : 1; st.bodies[i].team = t; c[t]++; } renumber(st); }
  else balanceTeams(st, order);
  resetArrays(st);
  st.size = sizeFor(st);
  st.W = mkWorld(st.bodies.length); st.W.tm = st.bodies.map(b => b.team);
  placeKickoff(st);
  st.W.ph = 0;
  hostSt = st; hostCtx = ctx;
  runLoop(st, ctx);
  return st;
}
function resetArrays(st) {
  const n = st.bodies.length;
  const fit = (a, f) => { while (a.length < n) a.push(f()); a.length = n; };
  fit(st.stats, emptyStats); fit(st.inp, () => ({ c: 0, kh: 0 })); fit(st.ackS, () => 0); fit(st.ackT, () => 0); fit(st.kc, () => 0); fit(st.kreq, () => -1);
  fit(st.nonce, () => ''); fit(st.lkc, () => 0); fit(st.fxT.spd, () => 0); fit(st.fxT.mag, () => 0); fit(st.ai.br, () => null);
}

function startMatch(st, ctx) {
  if (teamOf(st, 0).length < 1 || teamOf(st, 1).length < 1) return false;
  renumber(st);
  st.size = sizeFor(st); st._g = null;
  st.W = mkWorld(st.bodies.length);
  resetArrays(st);
  st.score = [0, 0]; st.clock = st.dur * 60000; st.ot = false; st.otMs = 0; st.goals = []; st.touches = []; st.items = []; st.endAfter = false;
  st.stats = st.bodies.map(emptyStats);
  st.ko = Math.random() < 0.5 ? 0 : 1; st.started = true;
  st.nextItem = st.ms + 6000;
  placeKickoff(st);
  setPhase(st, 'ready', READY_MS);
  const G = curGeo(st);
  ctx.emit({ t: 'start' }, `Maç başladı! ${teamOf(st, 0).length}v${teamOf(st, 1).length} · ${SIZES[st.size].name} saha · ${MODES[st.mode]} · başlama vuruşu ${TEAM[st.ko].name}.`, 'gold');
  void G;
  ctx.sync();
  return true;
}
function setPhase(st, ph, ms) { st.phase = ph; st.phaseAt = st.ms; st.until = st.ms + (ms || 0); if (st.W) st.W.ph = ph === 'kickoff' ? 2 : 3; }

function teamAction(st, pi, a, ctx) {
  if (st.phase !== 'teams' || pi !== st.hostPi) return;
  if (a.t === 'team') {
    const i = a.b | 0; if (!st.bodies[i]) return;
    st.bodies[i].team = 1 - st.bodies[i].team;
  } else if (a.t === 'shuffle') {
    balanceTeams(st, shuf(st.bodies.map((_, i) => i)));
    ctx.emit({ t: 'shuffle' }, 'Takımlar karıştırıldı.', '');
  } else if (a.t === 'bot') {
    const t = a.team === 1 ? 1 : 0;
    if (a.add) {
      if (st.bodies.length >= 8) return;
      const nm = BOT_NAMES[st.xbN++ % BOT_NAMES.length];
      st.bodies.push({ pi: -1, name: `${nm} (bot)`, col: '#c8c2e0', team: t, bot: true, xb: true, auto: false, num: 0 });
    } else {
      let k = -1; st.bodies.forEach((b, i) => { if (b.xb && b.team === t) k = i; });
      if (k < 0) return;
      st.bodies.splice(k, 1);
    }
    resetArrays(st);
  } else if (a.t === 'start') {
    if (!startMatch(st, ctx)) return;
    return;
  } else return;
  renumber(st);
  st.size = sizeFor(st); st._g = null;
  st.W = mkWorld(st.bodies.length); placeKickoff(st); st.W.ph = 0;
  ctx.sync();
}

function action(st, pi, a, ctx) {
  if (!a || typeof a.t !== 'string') return;
  if (['team', 'shuffle', 'bot', 'start'].includes(a.t)) teamAction(st, pi, a, ctx);
}

/* ---- dokunuş kaydı ve gol ---- */
function noteTouch(st, i) {
  const last = st.touches[st.touches.length - 1];
  if (!last || last.b !== i || st.ms - last.ms > 600) { st.touches.push({ b: i, team: st.bodies[i].team, ms: st.ms }); if (st.touches.length > 8) st.touches.shift(); st.stats[i].t++; }
  else last.ms = st.ms;
  st.lastTouchMs = st.ms;
}
function scoreGoal(st, side, ctx) {
  const tl = st.touches.slice().reverse();
  const sc = tl[0] ? tl[0].b : -1, og = sc >= 0 && st.bodies[sc].team !== side;
  let as = -1;
  if (sc >= 0 && !og) { const prev = tl.find(x => x.b !== sc); if (prev && prev.team === side && st.ms - prev.ms < 10000) as = prev.b; }
  st.score[side]++;
  if (sc >= 0) { if (og) st.stats[sc].og++; else st.stats[sc].g++; }
  if (as >= 0) st.stats[as].a++;
  const min = Math.max(0, Math.floor((st.dur * 60000 - st.clock + st.otMs) / 60000)) + 1;
  st.goals.push({ side, sc, as, og, min, ot: st.ot });
  st.ko = 1 - side; st.goalAt = st.ms;
  if ((st.lim && st.score[side] >= st.lim) || st.ot) st.endAfter = true;
  setPhase(st, 'goal', GOAL_MS);
  st.W.ph = 3;
  const who = sc >= 0 ? pname(st, sc) : TEAM[side].name;
  const line = og ? `⚽ Kendi kalesine! ${who} — gol ${TEAM[side].name} takımına yazıldı. (${st.score[0]}–${st.score[1]})`
    : `⚽ GOOOL! ${who} (${TEAM[side].name})${as >= 0 ? ` · asist: ${pname(st, as)}` : ''} — ${st.score[0]}–${st.score[1]}`;
  ctx.emit({ t: 'goal', side, sc, as, og, score: st.score.slice(), ot: st.ot }, line, 'gold');
}
function timeUp(st, ctx) {
  if (st.score[0] !== st.score[1]) { finish(st, ctx, 'time'); return; }
  st.ot = true; st.clock = 0; st.otMs = 0;
  ctx.emit({ t: 'ot' }, 'Süre doldu, skor eşit: ALTIN GOL uzatması! İlk golü atan kazanır.', 'gold');
}
function finish(st, ctx, why) {
  if (st.phase === 'over') return;
  setPhase(st, 'over', 0);
  st.W.ph = 3;
  const win = st.score[0] > st.score[1] ? 0 : st.score[1] > st.score[0] ? 1 : -1;
  const val = i => { const s = st.stats[i], b = st.bodies[i]; return s.g * 3 + s.a * 2 + Math.min(3, s.t * 0.04) + (b.team === win ? 1.5 : 0) - s.og * 2; };
  let mvp = 0; st.bodies.forEach((_, i) => { if (val(i) > val(mvp)) mvp = i; });
  st.result = { win, mvp, why };
  const title = win < 0 ? `Berabere! ${st.score[0]}–${st.score[1]}` : `${TEAM[win].name} kazandı! ${st.score[0]}–${st.score[1]}`;
  ctx.emit({ t: 'end', win, mvp, score: st.score.slice() }, `🏁 Maç bitti: ${title} · MVP: ${pname(st, mvp)}`, 'gold');
  ctx.sync();
  const resOf = b => (win < 0 ? 1 : b.team === win ? 2 : 0);
  const ranking = st.bodies.map((b, i) => ({ b, i })).filter(x => x.b.pi >= 0)
    .sort((x, y) => resOf(y.b) - resOf(x.b) || st.stats[y.i].g - st.stats[x.i].g || st.stats[y.i].a - st.stats[x.i].a || st.stats[y.i].t - st.stats[x.i].t)
    .map(({ b, i }) => { const s = st.stats[i]; return { pi: b.pi, score: resOf(b) * 1000 + s.g * 20 + s.a * 10, label: `${i === mvp ? '🏆 ' : ''}${['Mağlup', 'Berabere', 'Galip'][resOf(b)]} · ${s.g}⚽ ${s.a}🅰️` }; });
  const ms = st.stats[mvp];
  ctx.later(END_DELAY, () => ctx.end({ title, ranking, note: `MVP: ${pname(st, mvp)} (${TEAM[st.bodies[mvp].team].name}) — ${ms.g} gol, ${ms.a} asist, ${ms.t} topla buluşma.${why === 'ot' ? ' Uzatmada gol çıkmadı.' : ''}` }));
}
function afterGoal(st, ctx) {
  if (st.endAfter) { finish(st, ctx, st.ot ? 'golden' : 'limit'); return; }
  st.items = []; st.fxT.big = 0; st.fxT.ice = 0; st.fxT.spd.fill(0); st.fxT.mag.fill(0);
  placeKickoff(st);
  setPhase(st, 'ready', READY2_MS);
  ctx.sync();
}

/* ---- Çılgın Top güçlendirmeleri ---- */
function itemsTick(st, ctx) {
  if (st.mode !== 'cilgin') return false;
  const G = curGeo(st), W = st.W; let dirty = false;
  if (st.phase === 'play' && st.items.length < 2 && st.ms >= st.nextItem) {
    st.nextItem = st.ms + 6500 + Math.random() * 5000;
    for (let k = 0; k < 12; k++) {
      const x = (Math.random() * 2 - 1) * G.hw * 0.78, y = (Math.random() * 2 - 1) * G.hh * 0.72;
      if (hyp(x - W.b.x, y - W.b.y) < 70 || W.p.some(q => hyp(q.x - x, q.y - y) < 50) || st.items.some(o => hyp(o.x - x, o.y - y) < 120)) continue;
      st.items.push({ id: ++st.idc, k: ITEM_IDS[Math.floor(Math.random() * ITEM_IDS.length)], x: Math.round(x), y: Math.round(y) });
      dirty = true; break;
    }
  }
  for (let j = st.items.length - 1; j >= 0; j--) {
    const o = st.items[j], i = W.p.findIndex(q => hyp(q.x - o.x, q.y - o.y) < PR + ITEM_R);
    if (i < 0) continue;
    st.items.splice(j, 1); dirty = true;
    const it = ITEMS[o.k];
    if (o.k === 'buyuk') st.fxT.big = st.ms + it.dur;
    else if (o.k === 'buz') st.fxT.ice = st.ms + it.dur;
    else if (o.k === 'hiz') st.fxT.spd[i] = st.ms + it.dur;
    else st.fxT.mag[i] = st.ms + it.dur;
    ctx.emit({ t: 'pu', k: o.k, b: i, x: o.x, y: o.y }, `${it.icon} ${pname(st, i)}: ${it.name}!`, 'good');
  }
  return dirty;
}
function applyFx(st) {
  const W = st.W, m = st.ms;
  const nb = st.fxT.big > m ? 1 : 0, ni = st.fxT.ice > m ? 1 : 0;
  let ch = nb !== W.fx.big || ni !== W.fx.ice;
  W.fx.big = nb; W.fx.ice = ni;
  for (let i = 0; i < W.p.length; i++) {
    const s = st.fxT.spd[i] > m ? 1 : 0, g = st.fxT.mag[i] > m ? 1 : 0;
    if (s !== W.fx.spd[i] || g !== W.fx.mag[i]) ch = true;
    W.fx.spd[i] = s; W.fx.mag[i] = g;
  }
  return ch;
}

/* ---- bilgisayar oyuncular ---- */
function seek(q, tx, ty, arrive) {
  const dx = tx - (q.x + q.vx * 7), dy = ty - (q.y + q.vy * 7), l = hyp(dx, dy);
  if (l < 2) return [0, 0];
  const m = arrive ? Math.min(1, l / 28) : 1;
  return [dx / l * m, dy / l * m];
}
function segDist(px, py, ax, ay, bx, by) {
  const sx = bx - ax, sy = by - ay, l2 = sx * sx + sy * sy, t = l2 ? clamp(((px - ax) * sx + (py - ay) * sy) / l2, 0, 1) : 0;
  return hyp(px - ax - sx * t, py - ay - sy * t);
}
function aiRoles(st) {
  const W = st.W, b = W.b;
  [0, 1].forEach(t => {
    const mem = teamOf(st, t), dir = t === 0 ? 1 : -1;
    if (!mem.length) return;
    const cost = i => { const q = W.p[i]; let c = hyp(q.x - b.x, q.y - b.y) + ((q.x - b.x) * dir > 0 ? 45 : 0); if (!isAi(st, i)) c += 70; if (i === st.ai.att[t]) c -= 35; return c; };
    let att = mem[0]; mem.forEach(i => { if (cost(i) < cost(att)) att = i; });
    st.ai.att[t] = att; st.ai.role[att] = 'A';
    const rest = mem.filter(i => i !== att).sort((x, y) => W.p[x].x * dir - W.p[y].x * dir);
    rest.forEach((i, k) => { st.ai.role[i] = k === 0 ? 'D' : 'S'; st.ai.sIdx[i] = k; });
  });
}
function isAi(st, i) { const b = st.bodies[i]; return b.bot || b.auto || (b.pi >= 0 && st.off[b.pi]); }
function aiInput(st, i) {
  const G = curGeo(st), W = st.W, me = W.p[i], b = W.b, t = st.bodies[i].team, dir = t === 0 ? 1 : -1, br = ballR(W), reach = PR + br;
  let B = st.ai.br[i]; if (!B) B = st.ai.br[i] = { aimY: 0, aimAt: 0, pass: -1, cd: 0, jit: 0, jx: 0, jy: 0, sx: me.x, sy: me.y, sAt: st.tk, err: (Math.random() - 0.5) * 0.5 };
  let role = st.ai.role[i] || 'A';
  if (st.ms - st.lastTouchMs > 4000 && W.ph === 3) role = 'A';
  if (W.ph === 2 && t !== W.ko && role === 'A') role = 'D';
  const own = { x: -dir * G.hw, y: 0 }, opp = st.bodies.map((x, k) => (x.team !== t ? k : -1)).filter(k => k >= 0);
  const lead = Math.min(14, hyp(me.x - b.x, me.y - b.y) / 8);
  const bx = clamp(b.x + b.vx * lead, -G.hw, G.hw), by = clamp(b.y + b.vy * lead, -G.hh, G.hh);
  let mv = [0, 0], kick = 0;
  const attack = (tx, ty, mode) => {
    const ax0 = tx - bx, ay0 = ty - by, al = hyp(ax0, ay0) || 1, ax = ax0 / al, ay = ay0 / al;
    const rx = me.x - bx, ry = me.y - by, along = rx * ax + ry * ay, px = -ay, py = ax, side = rx * px + ry * py;
    if (along > -reach * 0.55) {
      let s = side >= 0 ? 1 : -1;
      let wx = bx - ax * (reach + 16) + px * s * (reach + 22), wy = by - ay * (reach + 16) + py * s * (reach + 22);
      if (Math.abs(wy) > G.oy - PR || Math.abs(wx) > G.ox - PR) { s = -s; wx = bx - ax * (reach + 16) + px * s * (reach + 22); wy = by - ay * (reach + 16) + py * s * (reach + 22); }
      mv = seek(me, wx, wy, false);
    } else {
      const dx = b.x - me.x, dy = b.y - me.y, dl = hyp(dx, dy) || 1, q = (dx * ax + dy * ay) / dl;
      mv = q > 0.93 ? seek(me, b.x + ax * 30, b.y + ay * 30, false) : seek(me, bx - ax * (reach + 4), by - ay * (reach + 4), false);
    }
    const dx = b.x - me.x, dy = b.y - me.y, dl = hyp(dx, dy) || 1, gap = dl - reach;
    if (gap < REACH + 1.5 && st.tk >= B.cd) {
      const kx = dx / dl, ky = dy / dl, q = kx * ax + ky * ay;
      const ogx = own.x - b.x, ogy = own.y - b.y, ogl = hyp(ogx, ogy) || 1;
      const danger = ogl < G.hw * 1.0 && (kx * ogx + ky * ogy) / ogl > 0.35;
      const dg = hyp(tx - b.x, ty - b.y);
      if (!danger) {
        if (mode === 'pass' && q > 0.88) kick = clamp(0.85 + dg / 520, 1, 1.45);
        else if (mode === 'clear' && q > 0.6) kick = 1.6;
        else if (mode === 'ko' && q > 0.8) kick = 1.05;
        else if (q > 0.9 && dg < G.hw * 1.3) kick = dg < 170 ? 1.25 : 1.6 + B.err * 0.1;
        else if (q > 0.55 && kx * dir > 0.25 && opp.some(k => hyp(W.p[k].x - b.x, W.p[k].y - b.y) < reach + 40)) kick = 1.35;
        else if (q > 0.5 && st.ms - st.lastTouchMs < 50 && B.stuck > 40) kick = 1.3;
      }
      if (kick) B.cd = st.tk + 18;
    }
  };
  if (st.tk >= B.aimAt) {
    B.aimAt = st.tk + 40 + Math.floor(Math.random() * 20);
    const keeper = opp.slice().sort((x, y) => hyp(W.p[x].x - dir * G.hw, W.p[x].y) - hyp(W.p[y].x - dir * G.hw, W.p[y].y))[0];
    const ky = keeper != null ? W.p[keeper].y : 0;
    const sgn = Math.random() < 0.75 ? (ky > 0 ? -1 : 1) : (ky > 0 ? 1 : -1);
    B.aimY = sgn * G.gh * (0.3 + Math.random() * 0.4);
    B.pass = -1;
    const tgX = dir * G.hw, blocked = opp.some(k => { const q = W.p[k]; return (q.x - b.x) * dir > 0 && segDist(q.x, q.y, b.x, b.y, tgX, B.aimY) < PR + br + 6; });
    if (blocked || Math.random() < 0.12) {
      const mates = teamOf(st, t).filter(k => k !== i && (W.p[k].x - b.x) * dir > 40 && hyp(W.p[k].x - b.x, W.p[k].y - b.y) > 90);
      const open = mates.filter(k => !opp.some(o => segDist(W.p[o].x, W.p[o].y, b.x, b.y, W.p[k].x, W.p[k].y) < PR * 2 + 4));
      if (open.length) B.pass = open[Math.floor(Math.random() * open.length)];
    }
  }
  if (role === 'A') {
    if (W.ph === 2) attack(dir * G.hw, (B.aimY > 0 ? 1 : -1) * G.hh * 0.7, 'ko');
    else if (B.pass >= 0 && st.bodies[B.pass] && st.bodies[B.pass].team === t) { const m = W.p[B.pass]; attack(m.x + m.vx * 12, m.y + m.vy * 12, 'pass'); }
    else attack(dir * G.hw, B.aimY, 'shot');
  } else if (role === 'D') {
    const vx = bx - own.x, vy = by - own.y, d = hyp(vx, vy) || 1;
    const mates = teamOf(st, t), closest = mates.every(k => k === i || hyp(W.p[k].x - b.x, W.p[k].y - b.y) >= hyp(me.x - b.x, me.y - b.y));
    const oppNear = Math.min(...opp.map(k => hyp(W.p[k].x - b.x, W.p[k].y - b.y)), 1e9);
    if (W.ph === 3 && d < G.hw * 0.8 && (closest || hyp(me.x - b.x, me.y - b.y) < 110) && hyp(me.x - b.x, me.y - b.y) < oppNear + 60) attack(dir * G.hw, clamp(b.y * 1.6, -G.hh, G.hh), 'clear');
    else { const r = clamp(d * 0.42, 40, G.hw * 0.6); mv = seek(me, own.x + vx / d * r, own.y + vy / d * r, true); }
  } else {
    const k = st.ai.sIdx[i] || 1, tx = clamp(bx + dir * G.hw * (0.3 + 0.08 * (k - 1)), -G.hw * 0.82, G.hw * 0.82), ty = (by > 0 ? -1 : 1) * G.hh * (0.42 - 0.12 * ((k - 1) % 2)) * (k > 2 ? -1 : 1);
    if (hyp(me.x - b.x, me.y - b.y) < reach + 40 && W.ph === 3) attack(dir * G.hw, B.aimY, 'shot');
    else mv = seek(me, tx, ty, true);
  }
  // takılma tespiti
  if (st.tk - B.sAt > 45) {
    const moved = hyp(me.x - B.sx, me.y - B.sy);
    B.stuck = (hyp(mv[0], mv[1]) > 0.5 && moved < 6) ? (B.stuck || 0) + 45 : 0;
    if (B.stuck >= 90) { const a = Math.random() * TAU; B.jx = Math.cos(a); B.jy = Math.sin(a); B.jit = st.tk + 16; }
    B.sx = me.x; B.sy = me.y; B.sAt = st.tk;
  }
  if (st.tk < B.jit) mv = [B.jx, B.jy];
  return { mv, kick };
}

/* ---- ana adım ---- */
const ZERO = [0, 0];
function simTick(st, ctx) {
  const W = st.W, G = curGeo(st), n = st.bodies.length, inp = new Array(n);
  let dirty = applyFx(st);
  if (st.tk % 12 === 0) aiRoles(st);
  const slots = localSlots(st);
  for (let i = 0; i < n; i++) {
    const bd = st.bodies[i];
    if (isAi(st, i)) {
      const r = aiInput(st, i); const c = qIn(r.mv[0], r.mv[1]); W.ic[i] = c; inp[i] = dqIn(c);
      W.kh[i] = 0;
      if (r.kick) { W.kq[i] = { pw: r.kick, ttl: 4, lag: 0 }; W.kh[i] = 1; }
      continue;
    }
    const slot = slots.indexOf(i);
    if (slot >= 0) {
      const u = uiLocal(slot) || { code: 0, kh: false, kc: 0, kp: 0 };
      W.ic[i] = u.code | 0; W.kh[i] = u.kh ? 1 : 0; inp[i] = dqIn(W.ic[i]);
      if (u.kc > st.lkc[i]) { st.lkc[i] = u.kc; W.kq[i] = { pw: kickPow(u.kp), ttl: KICK_TTL, lag: 0 }; st.stats[i].sh++; }
    } else {
      const u = st.inp[i] || { c: 0, kh: 0 };
      W.ic[i] = u.c | 0; W.kh[i] = u.kh ? 1 : 0; inp[i] = dqIn(W.ic[i]);
      if (st.kreq[i] >= 0) { W.kq[i] = { pw: kickPow(st.kreq[i]), ttl: KICK_TTL + 3, lag: REACH_LAG }; st.kreq[i] = -1; st.stats[i].sh++; }
      st.ackT[i]++;
    }
    void bd;
  }
  const ev = { touch: [], kick: [], ko: false, post: false };
  stepWorld(W, G, inp, ev);
  ev.touch.forEach(i => noteTouch(st, i));
  if (ev.ko && st.phase === 'kickoff') { st.phase = 'play'; st.phaseAt = st.ms; dirty = true; }
  if (st.phase === 'kickoff' && st.ms - st.koAt > KO_MAX_MS) { st.phase = 'play'; W.ph = 3; ctx.emit({ t: 'kto' }, 'Başlama vuruşu süresi doldu, top serbest!', ''); dirty = true; }
  if (ev.post) st.postN = (st.postN || 0) + 1;
  if (itemsTick(st, ctx)) dirty = true;
  // gol
  const br = ballR(W);
  if (Math.abs(W.b.y) < G.gh && Math.abs(W.b.x) > G.hw + br) { scoreGoal(st, W.b.x < 0 ? 1 : 0, ctx); return true; }
  // süre
  if (st.ot) { st.otMs += TICK; if (st.otMs >= OT_MAX) { finish(st, ctx, 'ot'); return true; } }
  else { st.clock -= TICK; if (st.clock <= 0) { st.clock = 0; timeUp(st, ctx); dirty = true; } }
  return dirty;
}
function tickOnce(st, ctx) {
  st.tk++; st.ms += TICK;
  let dirty = false;
  if (st.phase === 'ready') {
    if (st.ms >= st.until) { setPhase(st, 'kickoff', 0); st.koAt = st.ms; ctx.emit({ t: 'ko', ko: st.ko }, '', ''); dirty = true; }
  } else if (st.phase === 'kickoff' || st.phase === 'play') dirty = simTick(st, ctx) || dirty;
  else if (st.phase === 'goal') {
    if (st.ms - st.goalAt < SLOWMO_MS && st.tk % 3 === 0) stepWorld(st.W, curGeo(st), [], null);
    if (st.ms >= st.until) { afterGoal(st, ctx); dirty = true; }
  }
  if (st.phase !== 'teams' && st.phase !== 'over' && st.tk % SNAP_EVERY === 0 && isOnline() && uiRef && uiRef.fast) {
    try { uiRef.fast({ t: 's', d: encodeSnap(st) }); } catch { /* */ }
  }
  if (dirty || st.ms - st.lastSyncMs >= 1000) { st.lastSyncMs = st.ms; ctx.sync(); }
}
function runLoop(st, ctx) {
  const id = ++loopSeq; let last = performance.now(), acc = 0;
  hostSt = st; hostCtx = ctx;
  const step = () => {
    if (id !== loopSeq || hostSt !== st) return;
    const now = performance.now(); acc = Math.min(acc + now - last, 250); last = now;
    try {
      while (acc >= TICK) {
        acc -= TICK;
        if (st.phase !== 'teams' && st.phase !== 'over') hostPrev = { b: { x: st.W.b.x, y: st.W.b.y }, p: st.W.p.map(q => ({ x: q.x, y: q.y })), tk: st.tk };
        tickOnce(st, ctx);
      }
    } catch (e) { console.error(e); }
    hostStepAt = now - acc;
    if (st.phase !== 'over') ctx.later(TICK - 1, step);
  };
  ctx.later(TICK, step);
}

/* ---- ağdan gelen girişler (yöneten) ---- */
function hostInput(m) {
  const st = hostSt; if (!st || !m) return;
  const pi = m.seat; if (!Number.isInteger(pi) || !st.players[pi]) return;
  if (st.players[pi].cid && m.id && st.players[pi].cid !== m.id) return;
  const i = bodyOfPi(st, pi); if (i < 0) return;
  const r = String(m.r || '').slice(0, 12);
  if (r !== st.nonce[i]) { st.nonce[i] = r; st.ackS[i] = 0; st.kc[i] = 0; }
  const s = +m.s; if (!(s > st.ackS[i])) return;
  st.ackS[i] = s; st.ackT[i] = 0;
  const c = m.c | 0; st.inp[i] = { c: c >= 0 && c <= QA * 4 ? c : 0, kh: m.k ? 1 : 0 };
  const kc = m.kc | 0; if (kc > st.kc[i]) { st.kc[i] = kc; if (st.phase === 'play' || st.phase === 'kickoff') st.kreq[i] = clamp(+m.w || 0, 0, CHARGE_MS); }
}

function view(st, viewer) {
  const me = Number.isInteger(viewer) && viewer >= 0 && viewer < st.players.length ? viewer : (viewer === 'all' ? st.hostPi : -1);
  const mb = me >= 0 ? bodyOfPi(st, me) : -1;
  const ctl = viewer === 'all' ? localSlots(st) : (mb >= 0 ? [mb] : []);
  const W = st.W, m = st.ms;
  return {
    ph: st.phase, me, mb, ctl, local: viewer === 'all', host: st.hostPi, isHost: me === st.hostPi,
    dur: st.dur, lim: st.lim, size: st.size, sizeOpt: st.sizeOpt, mode: st.mode,
    bodies: st.bodies.map(b => ({ pi: b.pi, name: b.name, team: b.team, bot: b.bot, xb: b.xb, auto: b.auto, num: b.num, col: b.col, off: b.pi >= 0 && !!st.off[b.pi] })),
    score: st.score.slice(), clock: Math.max(0, Math.round(st.clock)), ot: st.ot, otMs: Math.round(st.otMs), run: st.phase === 'kickoff' || st.phase === 'play', at: Date.now(),
    rem: Math.max(0, Math.round(st.until - m)), ko: st.ko, tk: st.tk,
    items: st.items.map(o => ({ id: o.id, k: o.k, x: o.x, y: o.y })),
    fx: { big: Math.max(0, st.fxT.big - m), ice: Math.max(0, st.fxT.ice - m), spd: st.bodies.map((_, i) => Math.max(0, (st.fxT.spd[i] || 0) - m)), mag: st.bodies.map((_, i) => Math.max(0, (st.fxT.mag[i] || 0) - m)) },
    stats: st.stats.map(s => ({ g: s.g, a: s.a, t: s.t, og: s.og })),
    goals: st.goals.slice(-12), result: st.result,
    pos: W ? [Math.round(W.b.x), Math.round(W.b.y)].concat(...W.p.map(q => [Math.round(q.x), Math.round(q.y)])) : []
  };
}
function onPresence(st, pi, online, ctx) {
  st.off[pi] = !online;
  const i = bodyOfPi(st, pi);
  if (i >= 0 && !online) { st.inp[i] = { c: 0, kh: 0 }; if (st.phase !== 'teams' && st.phase !== 'over') ctx.emit({ t: 'auto', b: i }, `${pname(st, i)} için bilgisayar devreye girdi.`, ''); }
  ctx.sync();
}
function resume(st, ctx) {
  hostSt = st; hostCtx = ctx; st._g = null;
  if (st.phase !== 'over') runLoop(st, ctx);
}

/* ------------------------------------------------------------------ ARAYÜZ (her cihaz) */
let root = null, ui = null, V = null, G = null;
let cv = null, cg = null, stageEl = null, padEl = null, joyEl = null, kickBtn = null, popEl = null, cntEl = null, teamsEl = null, mvpEl = null, sideEl = null, scoreEl = null, statusEl = null, toastEl = null;
let sw = 300, sh = 300, dpr = 1, raf = 0, ro = null, hudT = null, popT = null, toastT = null, layoutAt = 0;
let T = { s: 1, rot: 0, cx: 0, cy: 0, camX: 0, camY: 0 }, camInit = false;
let keys = new Set(), joy = { on: false, id: null, bx: 0, by: 0, dx: 0, dy: 0 };
let ctlS = [mkCtl(), mkCtl()];
let parts = [], anims = [], lastBallV = 0, lastKickSnd = 0, teamsKey = '', sideKey = '', scoreKey = '', seenGoals = -1, lastSec = -1, lastPh = '';
const NC = { q: -1, W: null, prev: null, off: null, hist: [], seq: 0, nonce: '', sent: null, sentAt: 0, acc: 0, lastT: 0, buf: [], mode: 'none', snapAt: 0, tm: [], lastSnap: null, stepAt: 0 };
const INTERP_MS = 110;
const pnow = () => performance.now();
const q$ = s => root && root.querySelector(s);
const isTouch = () => (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
const phoneW = () => innerWidth < 760 || innerHeight < 500;
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const hostClock = () => (ui && ui.hostNow ? ui.hostNow() : Date.now());
function mkCtl() { return { code: 0, kh: false, kc: 0, kp: 0, pressAt: 0 }; }
const snd = {
  ok() { return Sound.ctx && Sound.enabled && Sound.ctx.state === 'running'; },
  kick(p) { if (!this.ok()) return; Sound.noise(.07, { filter: 'lowpass', freq: 600 + p * 500, gain: .35 + p * .25, decayPow: 2 }); Sound.tone(150 + p * 40, .08, { type: 'sine', gain: .25, slide: 70 }); },
  post() { if (!this.ok()) return; Sound.tone(1250, .35, { type: 'triangle', gain: .14 }); Sound.tone(1870, .25, { type: 'sine', gain: .08, when: .01 }); },
  whistle(n = 1) { if (!this.ok()) return; for (let i = 0; i < n; i++) { Sound.tone(2350, .22, { type: 'sine', gain: .12, when: i * .3 }); Sound.tone(2480, .22, { type: 'square', gain: .025, when: i * .3 }); } },
  crowd() { if (!this.ok()) return; Sound.noise(1.6, { filter: 'bandpass', freq: 800, q: .4, gain: .5, decayPow: 1.2 }); Sound.noise(1.2, { filter: 'bandpass', freq: 1900, q: .5, gain: .2, when: .1, decayPow: 1.5 }); },
  pick() { if (!this.ok()) return; Sound.tone(660, .1, { type: 'square', gain: .08, slide: 1320 }); Sound.tone(1320, .16, { type: 'triangle', gain: .14, when: .08 }); }
};

/* ---- yerleşim ve kamera ---- */
function layout() {
  if (!stageEl) return;
  const rect = stageEl.getBoundingClientRect(), top = rect.top + (window.scrollY || 0), ph = phoneW();
  const land = ph && innerWidth > innerHeight;
  const padH = (!land && (ph || isTouch()) && padEl && !padEl.hidden) ? padEl.offsetHeight + 8 : 0;
  let avail = ph ? innerHeight - top - padH - 8 : innerHeight - top - 16;
  avail = clamp(avail, land ? 200 : 300, 1100);
  const g = G || geoOf('orta', 'klasik'), ex = g.hw + NET_D + 14, ey = g.oy + 8, w = rect.width || 300;
  const rot = !land && avail > w * 1.15;
  let h = rot ? Math.min(avail, w * ex / ey) : Math.min(avail, Math.max(w * ey / ex, ph ? 240 : 420));
  if (!ph) h = Math.min(avail, Math.max(w * ey / ex + 8, 420));
  h = Math.round(Math.max(land ? 200 : 260, h));
  if (Math.abs(stageEl.offsetHeight - h) > 2) stageEl.style.height = h + 'px';
}
function resize() {
  if (!stageEl || !cv) return;
  layout();
  const r = stageEl.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return;
  sw = r.width; sh = r.height; dpr = Math.min(2.5, window.devicePixelRatio || 1);
  cv.width = Math.round(sw * dpr); cv.height = Math.round(sh * dpr);
  camInit = false;
}
function myBody() { return V && V.ctl && V.ctl.length ? V.ctl[0] : -1; }
function camUpdate(pos, dt) {
  const g = G; if (!g) return;
  const ex = g.hw + NET_D + 14, ey = g.oy + 8;
  const portrait = sh > sw * 1.15;
  const mb = myBody(), myTeam = mb >= 0 && V.bodies[mb] ? V.bodies[mb].team : 0;
  T.rot = portrait ? (myTeam === 1 ? -1 : 1) : 0;
  const vw = T.rot ? sh : sw, vh = T.rot ? sw : sh;     // dünya x ekseninin ekrandaki uzunluğu
  const fit = Math.min(vw / (2 * ex), vh / (2 * ey));
  const minS = phoneW() ? 0.6 : 0.5;
  T.s = Math.max(fit, Math.min(minS, fit * 1.7));
  T.cx = sw / 2; T.cy = sh / 2;
  let tx = 0, ty = 0;
  if (pos) { tx = pos.b.x; ty = pos.b.y; if (mb >= 0 && pos.p[mb]) { tx = tx * 0.72 + pos.p[mb].x * 0.28; ty = ty * 0.72 + pos.p[mb].y * 0.28; } }
  const hx = vw / 2 / T.s, hy = vh / 2 / T.s;
  tx = hx >= ex ? 0 : clamp(tx, -ex + hx, ex - hx); ty = hy >= ey ? 0 : clamp(ty, -ey + hy, ey - hy);
  const k = camInit ? 1 - Math.exp(-dt * 6) : 1; camInit = true;
  T.camX += (tx - T.camX) * k; T.camY += (ty - T.camY) * k;
}
function toS(x, y) {
  const dx = x - T.camX, dy = y - T.camY;
  if (T.rot === 1) return [T.cx + dy * T.s, T.cy - dx * T.s];
  if (T.rot === -1) return [T.cx - dy * T.s, T.cy + dx * T.s];
  return [T.cx + dx * T.s, T.cy + dy * T.s];
}
function worldXf(g) {
  const s = T.s * dpr;
  if (T.rot === 1) g.setTransform(0, -s, s, 0, (T.cx - T.s * T.camY) * dpr, (T.cy + T.s * T.camX) * dpr);
  else if (T.rot === -1) g.setTransform(0, s, -s, 0, (T.cx + T.s * T.camY) * dpr, (T.cy - T.s * T.camX) * dpr);
  else g.setTransform(s, 0, 0, s, (T.cx - T.s * T.camX) * dpr, (T.cy - T.s * T.camY) * dpr);
}
function scrToWorldDir(jx, jy) { if (T.rot === 1) return [-jy, jx]; if (T.rot === -1) return [jy, -jx]; return [jx, jy]; }

/* ---- girişler ---- */
const KEYS_P1 = { KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] }, KEYS_P2 = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
const KICK_P1 = ['Space', 'KeyX'], KICK_P2 = ['Enter', 'NumpadEnter', 'Numpad0', 'ShiftRight', 'KeyL'];
function slotKeys(slot) {
  const two = V && V.ctl && V.ctl.length > 1;
  if (!two) return { mv: Object.assign({}, KEYS_P1, KEYS_P2), kk: KICK_P1.concat(KICK_P2) };
  return slot === 0 ? { mv: KEYS_P1, kk: KICK_P1 } : { mv: KEYS_P2, kk: KICK_P2 };
}
function readSlot(slot) {
  const c = ctlS[slot], m = slotKeys(slot);
  let x = 0, y = 0;
  for (const k in m.mv) if (keys.has(k)) { x += m.mv[k][0]; y += m.mv[k][1]; }
  if (slot === 0 && joy.on && (joy.dx || joy.dy)) { x = joy.dx; y = joy.dy; }
  if (x || y) { const l = hyp(x, y); if (l > 1) { x /= l; y /= l; } }
  const w = scrToWorldDir(x, y);
  c.code = qIn(w[0], w[1]);
  return c;
}
/* vuruş kenarları olaylardan gelir: çok kısa dokunuşlar da kaybolmasın */
function kickHeld(slot) { const m = slotKeys(slot); return m.kk.some(k => keys.has(k)) || (slot === 0 && kickTouch); }
function kickEdge(slot) {
  const c = ctlS[slot], h = kickHeld(slot), t = pnow();
  if (h && !c.kh) { c.kh = true; c.pressAt = t; }
  else if (!h && c.kh) { c.kh = false; c.kc++; c.kp = Math.min(CHARGE_MS, t - c.pressAt); }
}
let kickTouch = false;
uiLocal = slot => (root && V && V.ctl && V.ctl[slot] != null ? readSlot(slot) : null);

/* ---- katılımcı: tahmin + uzlaştırma ---- */
function ncReset() { NC.q = -1; NC.W = null; NC.prev = null; NC.off = null; NC.hist = []; NC.buf = []; NC.mode = 'none'; NC.acc = 0; NC.lastT = 0; NC.lastSnap = null; }
function sendInput(force) {
  if (!ui || ui.isHost || ui.mode !== 'online' || !ui.fast) return;
  const c = ctlS[0], t = pnow(), s = NC.sent;
  const big = !s || s.k !== (c.kh ? 1 : 0) || s.kc !== c.kc || (s.c === 0) !== (c.code === 0) || (!isTouch() && s.c !== c.code);
  const changed = !s || s.c !== c.code || big;
  const gap = t - NC.sentAt;
  if (force || big || (changed && gap >= 50) || gap >= (c.code || c.kh ? 70 : 220)) {
    NC.seq++;
    const m = { t: 'i', s: NC.seq, r: NC.nonce, c: c.code, k: c.kh ? 1 : 0, kc: c.kc, w: Math.round(c.kp) };
    NC.sent = { c: c.code, k: m.k, kc: c.kc }; NC.sentAt = t;
    try { ui.fast(m); } catch { /* */ }
  }
}
function remoteInputs(W, mb) { const out = []; for (let i = 0; i < W.p.length; i++) out.push(i === mb ? ZERO : dqIn(W.ic[i])); return out; }
function ncStep(mbI, rec) {          // tek sabit adım (60 Hz)
  const W = NC.W; if (!W || !G) return;
  NC.prev = { b: { x: W.b.x, y: W.b.y }, p: W.p.map(q => ({ x: q.x, y: q.y })) };
  const inp = remoteInputs(W, mbI);
  if (mbI >= 0 && rec) {
    const c = readSlot(0); sendInput(false);
    const h = { s: NC.seq, c: c.code, kh: c.kh ? 1 : 0, kick: 0 };
    if (c.kc > (NC.lkc || 0)) { NC.lkc = c.kc; h.kick = kickPow(c.kp); }
    NC.hist.push(h); if (NC.hist.length > 240) NC.hist.shift();
    applyHist(W, mbI, h, inp);
  }
  stepWorld(W, G, inp, null);
}
function applyHist(W, mbI, h, inp) {
  W.ic[mbI] = h.c; W.kh[mbI] = h.kh; inp[mbI] = dqIn(h.c);
  if (h.kick) W.kq[mbI] = { pw: h.kick, ttl: KICK_TTL, lag: 0 };
}
function dispPos() {           // ekranda görünen konumlar (dünya + yumuşatma ofsetleri)
  const W = NC.W; if (!W) return null;
  const a = clamp(NC.acc / TICK, 0, 1), P = NC.prev, O = NC.off;
  const lerp = (cur, pr, o) => ({ x: (pr ? pr.x + (cur.x - pr.x) * a : cur.x) + (o ? o.x : 0), y: (pr ? pr.y + (cur.y - pr.y) * a : cur.y) + (o ? o.y : 0) });
  return { b: lerp(W.b, P && P.b, O && O.b), p: W.p.map((q, i) => lerp(q, P && P.p[i], O && O.p[i])) };
}
function applySnap(s) {
  if (!V || !G || !s) return;
  if (s.p.length !== V.bodies.length) return;
  const t = pnow(); NC.snapAt = t; NC.lastSnap = s;
  const mb = myBody(), tm = V.bodies.map(b => b.team);
  const predict = mb >= 0 && (s.pc === 2 || s.pc === 3) && (V.ph === 'kickoff' || V.ph === 'play');
  NC.buf.push({ t, s }); while (NC.buf.length > 12) NC.buf.shift();
  if (!predict) { NC.mode = 'interp'; NC.W = null; NC.off = null; return; }
  const old = NC.mode === 'pred' ? dispPos() : (NC.mode === 'interp' ? interpPos() : null);
  const W = worldFromSnap(s, tm);
  // onaylanmış girişleri at, kalanları yeniden oynat
  const me = s.p[mb], A = me.as, At = me.at;
  let skip = At;
  NC.hist = NC.hist.filter(h => h.s >= A);
  const replay = [];
  for (const h of NC.hist) { if (h.s === A && skip > 0) { skip--; continue; } replay.push(h); }
  for (const h of replay) { const inp = remoteInputs(W, mb); applyHist(W, mb, h, inp); stepWorld(W, G, inp, null); }
  NC.W = W; NC.prev = null; NC.stepAt = t;
  NC.mode = 'pred'; NC.replayN = replay.length;
  // yumuşatma: görünen konum sabit kalsın, hata zamanla erisin
  const nw = { b: { x: W.b.x, y: W.b.y }, p: W.p.map(q => ({ x: q.x, y: q.y })) };
  const mk = (o, n) => { if (!o) return { x: 0, y: 0 }; const x = o.x - n.x, y = o.y - n.y; return hyp(x, y) > 160 ? { x: 0, y: 0 } : { x, y }; };
  NC.off = old ? { b: mk(old.b, nw.b), p: nw.p.map((q, i) => mk(old.p[i], q)) } : null;
}
function interpPos() {
  const B = NC.buf; if (!B.length) return null;
  const rt = pnow() - INTERP_MS;
  let a = B[0], b = B[B.length - 1];
  if (rt <= a.t) b = a;
  else for (let i = 0; i < B.length - 1; i++) if (B[i].t <= rt && B[i + 1].t >= rt) { a = B[i]; b = B[i + 1]; break; }
  if (rt >= B[B.length - 1].t) { a = b = B[B.length - 1]; }
  const k = b.t > a.t ? clamp((rt - a.t) / (b.t - a.t), 0, 1) : 1;
  const L = (p, q) => ({ x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k });
  return { b: L(a.s.b, b.s.b), p: a.s.p.map((q, i) => L(q, b.s.p[i] || q)) };
}
function ncFrame(dt) {
  if (NC.mode !== 'pred' || !NC.W) return;
  const mb = myBody();
  NC.acc = Math.min(NC.acc + dt * 1000, 200);
  while (NC.acc >= TICK) { NC.acc -= TICK; ncStep(mb, true); NC.stepAt = pnow(); }
  if (NC.off) {
    const k = Math.exp(-dt / 0.1), ko = Math.exp(-dt / 0.08);
    NC.off.b.x *= k; NC.off.b.y *= k;
    NC.off.p.forEach((o, i) => { const kk = i === mb ? ko : k; o.x *= kk; o.y *= kk; });
  }
  if (pnow() - NC.snapAt > 1500) { NC.mode = 'interp'; }
}
function viewPos() {
  if (!V || !V.pos || V.pos.length < 2) return null;
  const p = []; for (let i = 2; i + 1 < V.pos.length; i += 2) p.push({ x: V.pos[i], y: V.pos[i + 1] });
  return { b: { x: V.pos[0], y: V.pos[1] }, p };
}
function hostPos() {
  const st = hostSt; if (!st || !st.W) return null;
  const W = st.W, P = hostPrev && hostPrev.p.length === W.p.length ? hostPrev : null;
  const a = clamp((pnow() - hostStepAt) / TICK, 0, 1);
  const L = (c, pr) => (pr ? { x: pr.x + (c.x - pr.x) * a, y: pr.y + (c.y - pr.y) * a } : { x: c.x, y: c.y });
  return { b: L(W.b, P && P.b), p: W.p.map((q, i) => L(q, P && P.p[i])), kh: W.kh, big: W.fx.big, spd: W.fx.spd, mag: W.fx.mag, bv: hyp(W.b.vx, W.b.vy) };
}
function curPos() {
  if (!V) return null;
  if (ui && ui.isHost) { const h = hostPos(); if (h && h.p.length === V.bodies.length) return h; return viewPos(); }
  if (V.ph === 'teams' || V.ph === 'over' && !NC.buf.length) return viewPos();
  let p = null, s = NC.lastSnap;
  if (NC.mode === 'pred' && NC.W) { p = dispPos(); const W = NC.W; p.kh = W.kh; p.big = W.fx.big; p.spd = W.fx.spd; p.mag = W.fx.mag; p.bv = hyp(W.b.vx, W.b.vy); }
  else if (NC.buf.length) { p = interpPos(); if (s) { p.kh = s.p.map(q => (q.kh ? 1 : 0)); p.big = s.big; p.spd = s.p.map(q => q.spd); p.mag = s.p.map(q => q.mag); p.bv = hyp(s.b.vx, s.b.vy); } }
  if (!p || p.p.length !== V.bodies.length) return viewPos();
  return p;
}

/* ---- çizim ---- */
function drawPitch(g, t) {
  const gg = G, hw = gg.hw, hh = gg.hh, gh = gg.gh;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bg = g.createLinearGradient(0, 0, 0, sh); bg.addColorStop(0, '#0f3b25'); bg.addColorStop(1, '#0a2a1b');
  g.fillStyle = bg; g.fillRect(0, 0, sw, sh);
  worldXf(g);
  // dış bant (oyuncuların çıkabildiği alan) ve reklam panoları
  g.fillStyle = '#1d6b3c'; g.fillRect(-gg.ox - 14, -gg.oy - 14, (gg.ox + 14) * 2, (gg.oy + 14) * 2);
  g.strokeStyle = 'rgba(25,227,208,.55)'; g.lineWidth = 4; g.strokeRect(-gg.ox - 12, -gg.oy - 12, (gg.ox + 12) * 2, (gg.oy + 12) * 2);
  // çim şeritleri
  const n = 12, w = hw * 2 / n;
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#2f9a4f' : '#36a957'; g.fillRect(-hw + i * w, -hh, w + 0.5, hh * 2); }
  if (V && V.fx && V.fx.ice > 0) { g.fillStyle = 'rgba(190,240,255,.38)'; g.fillRect(-hw, -hh, hw * 2, hh * 2); }
  // çizgiler
  g.strokeStyle = 'rgba(255,255,255,.88)'; g.lineWidth = 3; g.lineJoin = 'round';
  g.strokeRect(-hw, -hh, hw * 2, hh * 2);
  g.beginPath(); g.moveTo(0, -hh); g.lineTo(0, hh); g.stroke();
  g.beginPath(); g.arc(0, 0, CC_R, 0, TAU); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill();
  if (gg.box) {
    const bw = Math.round(hw * 0.2), bh = Math.min(hh - 10, gh * 2.1);
    [-1, 1].forEach(sgn => {
      g.strokeRect(sgn < 0 ? -hw : hw - bw, -bh, bw, bh * 2);
      g.beginPath(); g.arc(sgn * (hw - bw), 0, bh * 0.38, sgn < 0 ? -Math.PI / 2 : Math.PI / 2, sgn < 0 ? Math.PI / 2 : Math.PI * 1.5); g.stroke();
      g.beginPath(); g.arc(sgn * (hw - bw * 0.72), 0, 3, 0, TAU); g.fill();
    });
  }
  [[-hw, -hh, 0], [hw, -hh, 1], [-hw, hh, 3], [hw, hh, 2]].forEach(([x, y, k]) => { g.beginPath(); g.arc(x, y, 14, k * Math.PI / 2, k * Math.PI / 2 + Math.PI / 2); g.stroke(); });
  // kaleler (file)
  [-1, 1].forEach((sgn, ti) => {
    const x0 = sgn * hw, x1 = sgn * (hw + NET_D), team = TEAM[ti];
    g.fillStyle = 'rgba(10,20,30,.55)'; g.fillRect(Math.min(x0, x1), -gh, NET_D, gh * 2);
    g.save(); g.beginPath(); g.rect(Math.min(x0, x1), -gh, NET_D, gh * 2); g.clip();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.2;
    for (let k = -gh - NET_D; k < gh + NET_D; k += 9) { g.beginPath(); g.moveTo(Math.min(x0, x1), k); g.lineTo(Math.max(x0, x1), k + NET_D); g.stroke(); g.beginPath(); g.moveTo(Math.min(x0, x1), k + NET_D); g.lineTo(Math.max(x0, x1), k); g.stroke(); }
    g.restore();
    g.strokeStyle = team.col; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x0, -gh); g.lineTo(x1, -gh); g.lineTo(x1, gh); g.lineTo(x0, gh); g.stroke();
    g.strokeStyle = team.lt; g.lineWidth = 3; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(x0, -gh); g.lineTo(x0, gh); g.stroke(); g.setLineDash([]);
  });
  gg.posts.forEach(([x, y]) => { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, POST_R, 0, TAU); g.fill(); g.strokeStyle = '#1a0b2e'; g.lineWidth = 2.5; g.stroke(); });
  void t;
}
function txt(g, s, x, y, size, fill, stroke, font) {
  g.font = `${size}px ${font || '"Bungee","Arial Black","Segoe UI Black",sans-serif'}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (stroke) { g.lineWidth = Math.max(2, size * 0.2); g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(s, x, y); }
  g.fillStyle = fill; g.fillText(s, x, y);
}
let ballRoll = 0, lastBallPos = null;
function drawScene(g, pos, t) {
  drawPitch(g, t);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const s = T.s;
  // güçlendirmeler
  if (V.items) V.items.forEach(o => {
    const [x, y] = toS(o.x, o.y), r = ITEM_R * s * 1.15, it = ITEMS[o.k], bob = Math.sin(t / 260 + o.id) * 2;
    const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.2); gr.addColorStop(0, it.col); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalAlpha = 0.55; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 2.2, 0, TAU); g.fill(); g.globalAlpha = 1;
    g.fillStyle = 'rgba(20,8,46,.82)'; g.beginPath(); g.arc(x, y + bob, r, 0, TAU); g.fill(); g.strokeStyle = it.col; g.lineWidth = 2; g.stroke();
    g.font = `${Math.round(r * 1.25)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(it.icon, x, y + bob + 1);
  });
  if (!pos) return;
  const mb = myBody(), br = (pos.big ? BR_BIG : BR) * s, pr = PR * s;
  // gölgeler
  g.fillStyle = 'rgba(0,20,10,.28)';
  pos.p.forEach(q => { const [x, y] = toS(q.x, q.y); g.beginPath(); g.ellipse(x + pr * 0.18, y + pr * 0.28, pr, pr * 0.9, 0, 0, TAU); g.fill(); });
  { const [x, y] = toS(pos.b.x, pos.b.y); g.beginPath(); g.ellipse(x + br * 0.25, y + br * 0.35, br, br * 0.85, 0, 0, TAU); g.fill(); }
  // oyuncular
  const names = s > 0.62 || !phoneW();
  pos.p.forEach((q, i) => {
    const bd = V.bodies[i]; if (!bd) return;
    const [x, y] = toS(q.x, q.y), tm = TEAM[bd.team], kh = pos.kh && pos.kh[i];
    if (pos.spd && pos.spd[i]) { g.strokeStyle = 'rgba(255,225,74,.7)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, pr + 6 + Math.sin(t / 90) * 1.5, 0, TAU); g.stroke(); }
    if (pos.mag && pos.mag[i]) { g.strokeStyle = 'rgba(255,107,107,.65)'; g.setLineDash([4, 4]); g.lineWidth = 2; g.beginPath(); g.arc(x, y, (PR + MAG_R * 0.5) * s, t / 300, t / 300 + TAU); g.stroke(); g.setLineDash([]); }
    if (i === mb || (V.ctl && V.ctl.includes(i))) {
      g.strokeStyle = V.ctl.length > 1 && V.ctl.indexOf(i) === 1 ? '#19e3d0' : '#ffe14a'; g.lineWidth = 3; g.globalAlpha = 0.9;
      g.beginPath(); g.arc(x, y, pr + 5, 0, TAU); g.stroke(); g.globalAlpha = 1;
    }
    const gr = g.createRadialGradient(x - pr * 0.35, y - pr * 0.4, pr * 0.1, x, y, pr);
    gr.addColorStop(0, tm.lt); gr.addColorStop(0.55, tm.col); gr.addColorStop(1, tm.dk);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, pr, 0, TAU); g.fill();
    g.lineWidth = kh ? Math.max(2.5, pr * 0.2) : 2; g.strokeStyle = kh ? '#ffffff' : '#140a24'; g.stroke();
    if (i === mb && ctlS[0].kh) {
      const ch = clamp((pnow() - ctlS[0].pressAt) / CHARGE_MS, 0, 1);
      g.strokeStyle = ch >= 1 ? '#ffe14a' : 'rgba(255,255,255,.9)'; g.lineWidth = 3;
      g.beginPath(); g.arc(x, y, pr + 9, -Math.PI / 2, -Math.PI / 2 + TAU * ch); g.stroke();
    }
    const lab = bd.bot || bd.auto || bd.off ? String(bd.num) : initial(bd.name);
    txt(g, lab, x, y + 1, Math.max(9, Math.round(pr * 1.05)), '#fff', 'rgba(20,6,40,.6)');
    if (names) txt(g, (bd.off ? '📵 ' : '') + bd.name.slice(0, 12), x, y + pr + 10, Math.max(9, Math.round(10 * Math.min(1.2, s + 0.25))), 'rgba(255,255,255,.92)', 'rgba(0,0,0,.55)', '800 Nunito, "Segoe UI", sans-serif');
  });
  // top
  const [bx, by] = toS(pos.b.x, pos.b.y);
  if (lastBallPos) ballRoll += hyp(pos.b.x - lastBallPos.x, pos.b.y - lastBallPos.y) / ((pos.big ? BR_BIG : BR));
  lastBallPos = { x: pos.b.x, y: pos.b.y };
  if ((pos.bv || 0) > 6) { g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = br * 1.4; g.lineCap = 'round'; const tr = anims.trail || []; void tr; g.lineCap = 'butt'; }
  const bgr = g.createRadialGradient(bx - br * 0.35, by - br * 0.4, br * 0.1, bx, by, br);
  bgr.addColorStop(0, '#ffffff'); bgr.addColorStop(1, '#cfd6e6');
  g.fillStyle = bgr; g.beginPath(); g.arc(bx, by, br, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(bx, by, br, 0, TAU); g.clip();
  g.fillStyle = '#231a3a';
  for (let k = 0; k < 3; k++) { const a = ballRoll + k * TAU / 3; g.beginPath(); g.arc(bx + Math.cos(a) * br * 0.55, by + Math.sin(a) * br * 0.55 * 0.8, br * 0.28, 0, TAU); g.fill(); }
  g.beginPath(); g.arc(bx, by, br * 0.22, 0, TAU); g.fill();
  g.restore();
  g.strokeStyle = '#140a24'; g.lineWidth = 2; g.beginPath(); g.arc(bx, by, br, 0, TAU); g.stroke();
}
function drawAnims(g, t) {
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  anims = anims.filter(a => t - a.start < a.dur);
  anims.forEach(a => {
    const k = (t - a.start) / a.dur, [x, y] = toS(a.x, a.y);
    if (a.k === 'ring') { g.strokeStyle = a.col; g.globalAlpha = 1 - k; g.lineWidth = 3; g.beginPath(); g.arc(x, y, (a.r0 + a.r * k) * T.s, 0, TAU); g.stroke(); g.globalAlpha = 1; }
    else if (a.k === 'text') { g.globalAlpha = 1 - k * k; txt(g, a.txt, x, y - 30 * k - 18, a.size || 18, a.col, 'rgba(20,6,40,.85)'); g.globalAlpha = 1; }
  });
  parts = parts.filter(p => (p.life -= 1 / 60) > 0);
  parts.forEach(p => {
    p.x += p.vx / 60; p.y += p.vy / 60; p.vx *= 0.97; p.vy *= 0.97;
    const [x, y] = toS(p.x, p.y); g.globalAlpha = clamp(p.life / p.max, 0, 1); g.fillStyle = p.c;
    g.save(); g.translate(x, y); g.rotate(p.rot += p.vr); g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
  });
  g.globalAlpha = 1;
}
function burst(x, y, n, cols, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (0.3 + Math.random() * 0.7) * sp; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7 + Math.random() * 0.7, max: 1.2, c: cols[i % cols.length], w: 4 + Math.random() * 4, h: 6 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3 }); } }

function frame() {
  raf = requestAnimationFrame(frame);
  if (!root || !cv || !V || !G) return;
  const t = pnow(), dt = Math.min(0.1, NC.lastT ? (t - NC.lastT) / 1000 : 1 / 60); NC.lastT = t;
  if (ui && !ui.isHost) {
    if (NC.mode === 'pred') ncFrame(dt);
    else { readSlot(0); if (V.ctl && V.ctl.length && (V.ph === 'kickoff' || V.ph === 'play' || V.ph === 'ready')) sendInput(false); }
  }
  const pos = curPos();
  camUpdate(pos, dt);
  drawScene(cg, pos, t);
  drawAnims(cg, t);
  // vuruş sesi: topun hızında ani artış
  if (pos && pos.bv != null) {
    if (pos.bv - lastBallV > 2.4 && t - lastKickSnd > 120 && (V.ph === 'play' || V.ph === 'kickoff')) { lastKickSnd = t; snd.kick(clamp((pos.bv - 3) / 6, 0, 1)); anims.push({ k: 'ring', x: pos.b.x, y: pos.b.y, col: 'rgba(255,255,255,.8)', start: t, dur: 260, r0: BR, r: 26 }); }
    lastBallV = pos.bv;
  }
  if (kickBtn) { const c = ctlS[0], ch = c.kh ? clamp((t - c.pressAt) / CHARGE_MS, 0, 1) : 0; kickBtn.style.setProperty('--ch', ch.toFixed(3)); }
}

/* ---- HUD ---- */
function clockText(v) {
  if (v.ph === 'teams') return `${v.dur}:00`;
  if (v.ot) { const ms = v.otMs + (v.run ? Math.max(0, hostClock() - v.at) : 0); return '+' + mmss(ms).replace(/^0:/, '0:'); }
  const ms = v.clock - (v.run ? Math.max(0, hostClock() - v.at) : 0);
  return mmss(ms);
}
function statusText(v) {
  const mb = myBody(), my = mb >= 0 ? v.bodies[mb] : null;
  const you = my ? `Sen: <b style="color:${TEAM[my.team].lt}">${TEAM[my.team].name} ${my.num}</b> · ` : (v.me < 0 ? 'İzleyicisin · ' : '');
  const two = v.ctl && v.ctl.length > 1 ? `<b style="color:${TEAM[v.bodies[v.ctl[0]].team].lt}">1. oyuncu WASD+Boşluk</b> · <b style="color:${TEAM[v.bodies[v.ctl[1]].team].lt}">2. oyuncu Oklar+Enter</b>` : '';
  switch (v.ph) {
    case 'teams': return v.isHost ? 'Takımları ayarla ve maçı başlat' : 'Kurucu takımları ayarlıyor…';
    case 'ready': return two || `${you}Hazır ol!`;
    case 'kickoff': return `${you}Başlama vuruşu: <b style="color:${TEAM[v.ko].lt}">${TEAM[v.ko].name}</b>${my && my.team !== v.ko ? ' · daire dışında bekle' : ''}`;
    case 'play': return v.ot ? `${you}<b>ALTIN GOL</b> uzatması: ilk gol kazandırır!` : (two || `${you}${v.lim ? `${v.lim} gole ulaşan kazanır` : 'Süre sonunda çok gol atan kazanır'}`);
    case 'goal': return 'GOL!';
    case 'over': return 'Maç bitti';
    default: return '';
  }
}
function renderScore(v) {
  const key = [v.score.join('-'), v.ph, v.ot, v.ko].join('|');
  if (key !== scoreKey) {
    scoreKey = key;
    scoreEl.querySelector('.ft-s0 b').textContent = v.score[0];
    scoreEl.querySelector('.ft-s1 b').textContent = v.score[1];
    scoreEl.classList.toggle('ot', !!v.ot);
  }
  const ct = scoreEl.querySelector('.ft-clock b'), txv = clockText(v); if (ct.textContent !== txv) ct.textContent = txv;
  const urgent = !v.ot && v.run && v.clock - (hostClock() - v.at) < 30000;
  scoreEl.querySelector('.ft-clock').classList.toggle('urgent', urgent);
  const sub = scoreEl.querySelector('.ft-clock small'), st = v.ot ? 'UZATMA' : v.lim ? `${v.lim} GOL` : 'SÜRE';
  if (sub.textContent !== st) sub.textContent = st;
  const s = statusText(v); if (statusEl.innerHTML !== s) statusEl.innerHTML = s;
}
function renderSide(v) {
  const key = JSON.stringify([v.bodies, v.stats, v.ph, v.mb, v.fx && v.fx.spd.map(Boolean), v.fx && v.fx.mag.map(Boolean), v.fx && !!v.fx.big, v.fx && !!v.fx.ice]);
  if (key === sideKey) return; sideKey = key;
  const row = (b, i) => { const s = v.stats[i] || { g: 0, a: 0 }; const fx = (v.fx.spd[i] ? '⚡' : '') + (v.fx.mag[i] ? '🧲' : '');
    return `<li class="${i === v.mb ? 'me' : ''} ${b.off ? 'off' : ''}"><span class="ft-dot" style="--tc:${TEAM[b.team].col}">${b.bot || b.auto ? b.num : esc(initial(b.name))}</span><b>${esc(b.name)}${i === v.mb ? ' <small>(sen)</small>' : ''}${b.off ? ' <small>📵 bilgisayar</small>' : ''}</b><span class="ft-fxs">${fx}</span><span class="ft-st">⚽${s.g} <small>🅰️${s.a}</small></span></li>`; };
  const col = t => `<div class="ft-roster t${t}"><h4><i style="background:${TEAM[t].col}"></i>${TEAM[t].name}<span>${v.score[t]}</span></h4><ul>${v.bodies.map((b, i) => (b.team === t ? row(b, i) : '')).join('')}</ul></div>`;
  const glob = (v.fx.big ? '<span class="ft-chip">🎈 Büyük top</span>' : '') + (v.fx.ice ? '<span class="ft-chip">❄️ Buz zemin</span>' : '');
  const help = isTouch() ? 'Sol: joystick ile koş · Sağ: <b>VUR</b> — basılı tutup bırakınca daha sert şut.' : (v.ctl && v.ctl.length > 1 ? '1. oyuncu: WASD + Boşluk · 2. oyuncu: Oklar + Enter. Basılı tutup bırak: sert şut.' : 'Hareket: WASD / Oklar · Vuruş: Boşluk / X — basılı tutup bırakınca daha sert.');
  const gl = (v.goals || []).slice(-6).reverse().map(gq => `<li><i style="background:${TEAM[gq.side].col}"></i>${gq.min}' ${gq.sc >= 0 && v.bodies[gq.sc] ? esc(v.bodies[gq.sc].name) : TEAM[gq.side].name}${gq.og ? ' (k.k.)' : ''}${gq.as >= 0 && v.bodies[gq.as] ? ` <small>· ${esc(v.bodies[gq.as].name)}</small>` : ''}</li>`).join('');
  sideEl.innerHTML = `<div class="ft-rosters">${col(0)}${col(1)}</div>${glob ? `<div class="ft-glob">${glob}</div>` : ''}${gl ? `<ol class="ft-goals">${gl}</ol>` : ''}<p class="ft-help">${help}</p><p class="ft-meta">${MODES[v.mode]} · ${SIZES[v.size] ? SIZES[v.size].name : ''} saha · ${v.dur} dk · ${v.lim ? `${v.lim} gol` : 'gol limiti yok'}</p>`;
}
function renderTeams(v) {
  const show = v.ph === 'teams';
  teamsEl.hidden = !show; if (!show) { teamsKey = ''; return; }
  const key = JSON.stringify([v.bodies, v.isHost, v.mb, v.sizeOpt, v.size]); if (key === teamsKey) return; teamsKey = key;
  const H = v.isHost, n = v.bodies.length, cnt = t => v.bodies.filter(b => b.team === t).length;
  const row = (b, i) => `<button type="button" class="ft-trow" data-tb="${i}" ${H ? '' : 'disabled'} aria-label="${esc(b.name)} takımını değiştir"><span class="ft-dot" style="--tc:${TEAM[b.team].col}">${b.bot ? '🤖' : esc(initial(b.name))}</span><b>${esc(b.name)}${i === v.mb ? ' <small>(sen)</small>' : ''}</b>${H ? `<span class="ft-sw">${b.team === 0 ? '→' : '←'}</span>` : ''}</button>`;
  const col = t => `<div class="ft-tcol t${t}"><h4><i style="background:${TEAM[t].col}"></i>${TEAM[t].name} <span>${cnt(t)}</span></h4><div class="ft-tlist">${v.bodies.map((b, i) => (b.team === t ? row(b, i) : '')).join('') || '<p class="ft-empty">Boş</p>'}</div>${H ? `<div class="ft-botbtns"><button type="button" class="ft-mini" data-bot="${t}" data-add="1" ${n >= 8 ? 'disabled' : ''}>+ Bot</button><button type="button" class="ft-mini" data-bot="${t}" data-add="0" ${v.bodies.some(b => b.xb && b.team === t) ? '' : 'disabled'}>− Bot</button></div>` : ''}</div>`;
  const ok = cnt(0) > 0 && cnt(1) > 0;
  teamsEl.innerHTML = `<div class="ft-tcard"><h3>⚽ Takımlar</h3><p class="ft-tsub">${MODES[v.mode]} · ${SIZES[v.size].name} saha${v.sizeOpt === 'oto' ? ' (otomatik)' : ''} · ${v.dur} dk · ${v.lim ? `${v.lim} gol` : 'limitsiz'}</p>
    <div class="ft-tcols">${col(0)}${col(1)}</div>
    ${H ? `<div class="ft-tbtns"><button type="button" class="btn btn-ghost ft-shuffle">🔀 Karıştır</button><button type="button" class="btn btn-spin ft-start" ${ok ? '' : 'disabled'}>▶ MAÇI BAŞLAT</button></div><p class="ft-tsub">${ok ? 'Oyuncuya dokunarak takımını değiştir.' : 'Her takımda en az bir oyuncu olmalı.'}</p>` : '<p class="ft-wait">Kurucu takımları ayarlıyor, birazdan başlıyoruz…</p>'}</div>`;
}
function renderOverlays(v) {
  // geri sayım
  if (v.ph === 'ready') {
    const rem = v.rem - Math.max(0, hostClock() - v.at), sec = Math.max(1, Math.ceil(rem / 800));
    cntEl.hidden = false;
    const s = rem > 2400 ? 'HAZIR' : String(Math.min(3, sec));
    if (cntEl.dataset.s !== s) { cntEl.dataset.s = s; cntEl.innerHTML = `<b>${s}</b><small>Başlama vuruşu: ${TEAM[v.ko].name}</small>`; cntEl.classList.remove('pop'); void cntEl.offsetWidth; cntEl.classList.add('pop'); if (s !== 'HAZIR') Sound.tick(.4); }
  } else { cntEl.hidden = true; cntEl.dataset.s = ''; }
  // MVP kartı
  if (v.ph === 'over' && v.result) {
    const r = v.result, mvp = v.bodies[r.mvp], s = v.stats[r.mvp] || { g: 0, a: 0, t: 0 };
    const key = 'mvp' + r.mvp + v.score.join('-');
    if (mvpEl.dataset.k !== key) {
      mvpEl.dataset.k = key;
      mvpEl.innerHTML = `<div class="ft-mvpcard" style="--tc:${TEAM[mvp.team].col}"><small>${r.win < 0 ? 'BERABERE' : `${TEAM[r.win].name.toLocaleUpperCase('tr-TR')} KAZANDI`}</small><div class="ft-fs"><span class="t0">${v.score[0]}</span>–<span class="t1">${v.score[1]}</span></div><div class="ft-mvpbadge">🏆 MVP</div><div class="ft-mvpdisc">${mvp.bot ? mvp.num : esc(initial(mvp.name))}</div><b>${esc(mvp.name)}</b><p>⚽ ${s.g} gol · 🅰️ ${s.a} asist · 👟 ${s.t} dokunuş</p></div>`;
    }
    mvpEl.hidden = false;
  } else { mvpEl.hidden = true; mvpEl.dataset.k = ''; }
}
function hudTick() {
  if (!V || !root) return;
  renderScore(V); renderOverlays(V);
  if (pnow() - layoutAt > 1500) { layoutAt = pnow(); layout(); }
}
function render(v) {
  const prevPh = V ? V.ph : null, prevN = V ? V.bodies.length : -1, prevG = G ? G.size + G.mode : '';
  V = v;
  if (!v || !root) return;
  G = geoOf(v.size, v.mode);
  if (prevG !== G.size + G.mode) requestAnimationFrame(resize);
  if (prevN !== v.bodies.length || (prevPh !== v.ph && (v.ph === 'ready' || v.ph === 'teams'))) { ncReset(); }
  if (prevPh !== v.ph && v.ph === 'ready') { NC.buf = []; }
  root.querySelector('.ft').dataset.ph = v.ph;
  padEl.hidden = !(isTouch() && v.ctl && v.ctl.length > 0);
  kickBtn.disabled = !(v.ph === 'kickoff' || v.ph === 'play' || v.ph === 'ready');
  renderScore(v); renderSide(v); renderTeams(v); renderOverlays(v);
  if (prevPh !== v.ph) requestAnimationFrame(layout);
  if (!raf) raf = requestAnimationFrame(frame);
}

/* ---- olaylar ---- */
function pop(html, cls, ms = 1600) {
  if (!popEl) return;
  popEl.className = 'ft-pop'; void popEl.offsetWidth; popEl.innerHTML = html; popEl.className = 'ft-pop show ' + (cls || '');
  clearTimeout(popT); popT = setTimeout(() => { if (popEl) popEl.className = 'ft-pop'; }, ms);
}
function toast(text) { if (!toastEl) return; toastEl.textContent = text; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl && toastEl.classList.remove('show'), 2000); }
function onEvent(e) {
  if (!root || !V) return;
  const t = pnow(), mb = myBody(), my = mb >= 0 && V.bodies[mb] ? V.bodies[mb].team : -1;
  const nm = i => (V.bodies[i] ? esc(V.bodies[i].name) : '');
  if (e.t === 'start') { snd.whistle(1); Sound.special(); }
  else if (e.t === 'ko') { snd.whistle(1); }
  else if (e.t === 'goal') {
    const tm = TEAM[e.side], mine = my === e.side;
    pop(`<b>${e.og ? 'KENDİ KALESİNE!' : 'GOOOL!'}</b><small>${e.sc >= 0 ? nm(e.sc) : tm.name}${e.as >= 0 ? ` · asist ${nm(e.as)}` : ''}</small><em>${e.score[0]} – ${e.score[1]}</em>`, 'goal t' + e.side, 3000);
    snd.crowd(); Sound.fanfare();
    if (my < 0 || mine) FX.confetti(110); else flash('bad');
    if (mine) flash('good');
    const gx = (e.side === 0 ? 1 : -1) * (G ? G.hw + 20 : 400);
    burst(gx, 0, 60, [tm.col, tm.lt, '#ffffff', '#ffe14a'], 420);
    anims.push({ k: 'ring', x: gx, y: 0, col: tm.lt, start: t, dur: 900, r0: 10, r: 160 });
    stageEl.classList.remove('goalflash', 't0', 't1'); void stageEl.offsetWidth; stageEl.classList.add('goalflash', 't' + e.side);
  } else if (e.t === 'ot') { pop('<b>ALTIN GOL!</b><small>İlk gol maçı bitirir</small>', 'ot', 2400); snd.whistle(2); }
  else if (e.t === 'end') { snd.whistle(3); pop(`<b>MAÇ BİTTİ</b><em>${e.score[0]} – ${e.score[1]}</em>`, 'end', 2200); }
  else if (e.t === 'pu') {
    const it = ITEMS[e.k]; snd.pick();
    burst(e.x, e.y, 18, [it.col, '#ffffff'], 200);
    anims.push({ k: 'text', x: e.x, y: e.y, txt: it.name.toLocaleUpperCase('tr-TR'), col: it.col, start: t, dur: 1100, size: 15 });
    if (e.b === mb) toast(`${it.icon} ${it.name}!`);
  } else if (e.t === 'kto') toast('Başlama vuruşu süresi doldu — top serbest!');
  else if (e.t === 'auto' && e.b === mb) toast('Bağlantın koptu; bilgisayar senin yerine oynadı.');
}

/* ---- dokunmatik ve klavye ---- */
const JR = 46;
function joyDown(e) {
  if (!V || !V.ctl || !V.ctl.length || joy.on) return;
  e.preventDefault(); Sound.init();
  const zone = e.currentTarget, r = zone.getBoundingClientRect();
  joy.on = true; joy.id = e.pointerId; joy.zone = zone; joy.bx = e.clientX - r.left; joy.by = e.clientY - r.top; joy.dx = joy.dy = 0;
  try { zone.setPointerCapture(e.pointerId); } catch { /* */ }
  joyEl.hidden = false; joyEl.style.left = joy.bx + 'px'; joyEl.style.top = joy.by + 'px'; joyEl.querySelector('i').style.transform = '';
  const h = q$('.ft-joyhint'); if (h) h.hidden = true;
}
function joyMove(e) {
  if (!joy.on || e.pointerId !== joy.id) return;
  const r = joy.zone.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  let dx = (x - joy.bx) / JR, dy = (y - joy.by) / JR; const l = hyp(dx, dy);
  if (l > 1.3) { joy.bx = x - dx / l * JR * 1.3; joy.by = y - dy / l * JR * 1.3; joyEl.style.left = joy.bx + 'px'; joyEl.style.top = joy.by + 'px'; }
  if (l > 1) { dx /= l; dy /= l; }
  const dead = hyp(dx, dy) < 0.18; joy.dx = dead ? 0 : dx; joy.dy = dead ? 0 : dy;
  joyEl.querySelector('i').style.transform = `translate(${dx * JR * 0.7}px, ${dy * JR * 0.7}px)`;
}
function joyUp(e) { if (e.pointerId !== joy.id) return; joy.on = false; joy.id = null; joy.dx = joy.dy = 0; joyEl.hidden = true; }
function kickDown(e) { e.preventDefault(); Sound.init(); if (kickBtn.disabled) return; kickTouch = true; kickEdge(0); try { kickBtn.setPointerCapture(e.pointerId); } catch { /* */ } kickBtn.classList.add('on'); }
function kickUp() { if (!kickTouch) return; kickTouch = false; kickEdge(0); if (kickBtn) kickBtn.classList.remove('on'); }
const GAME_KEYS = new Set(Object.keys(KEYS_P1).concat(Object.keys(KEYS_P2), KICK_P1, KICK_P2));
function onKey(e) {
  if (!V || !root || (e.target && e.target.closest && e.target.closest('input,textarea,select'))) return;
  if (!GAME_KEYS.has(e.code)) return;
  const active = V.ctl && V.ctl.length && V.ph !== 'teams' && V.ph !== 'over';
  if (e.type === 'keydown') { if (active) { e.preventDefault(); if (e.repeat && keys.has(e.code)) return; keys.add(e.code); Sound.init(); } else return; }
  else keys.delete(e.code);
  kickEdge(0); if (V.ctl.length > 1) kickEdge(1);
}
function onBlur() { keys.clear(); joy.on = false; joy.dx = joy.dy = 0; kickTouch = false; ctlS.forEach(c => { c.kh = false; }); if (joyEl) joyEl.hidden = true; }
function onTeamsClick(e) {
  const b = e.target.closest('button'); if (!b || b.disabled || !ui) return;
  if (b.dataset.tb != null) ui.send({ t: 'team', b: +b.dataset.tb });
  else if (b.dataset.bot != null) ui.send({ t: 'bot', team: +b.dataset.bot, add: b.dataset.add === '1' ? 1 : 0 });
  else if (b.classList.contains('ft-shuffle')) ui.send({ t: 'shuffle' });
  else if (b.classList.contains('ft-start')) { Sound.init(); ui.send({ t: 'start' }); }
}
function onFast(m, api) {
  if (!m) return;
  if (m.t === 'i') { if (api && api.isHost) hostInput(m); return; }
  if (m.t === 's') { if (api && api.isHost) return; const s = decodeSnap(m.d); if (s && (s.tk > NC.q || s.tk < NC.q - 100000)) { NC.q = s.tk; applySnap(s); } }
}

function mount(r, api) {
  root = r; ui = api; uiRef = api; V = null; G = null; keys = new Set(); parts = []; anims = []; ctlS = [mkCtl(), mkCtl()]; kickTouch = false;
  teamsKey = ''; sideKey = ''; scoreKey = ''; camInit = false; lastBallPos = null; NC.seq = 0; NC.sent = null; NC.lkc = 0; NC.nonce = Math.random().toString(36).slice(2, 10); ncReset();
  root.innerHTML = `<div class="g-wrap ft">
    <div class="ft-score">
      <div class="ft-team ft-s0"><span>KIRMIZI</span><b>0</b></div>
      <div class="ft-clock"><b>0:00</b><small>SÜRE</small></div>
      <div class="ft-team ft-s1"><b>0</b><span>MAVİ</span></div>
    </div>
    <div class="ft-status" aria-live="polite"></div>
    <div class="ft-main">
      <div class="ft-play">
        <div class="ft-stage">
          <canvas class="ft-cv" aria-label="Kafa Topu sahası"></canvas>
          <div class="ft-count" hidden></div>
          <div class="ft-pop" aria-live="polite"></div>
          <div class="ft-toast" aria-live="polite"></div>
          <div class="ft-mvp" hidden></div>
          <div class="ft-teams" hidden></div>
        </div>
        <div class="ft-pad" hidden>
          <div class="ft-jz" aria-label="Joystick alanı"><div class="ft-joy" hidden><i></i></div><div class="ft-joyhint"><i></i><span>Sürükle, koş</span></div></div>
          <button type="button" class="ft-kick" aria-label="Vur (basılı tut: sert şut)"><span>⚽</span><b>VUR</b></button>
        </div>
      </div>
      <aside class="ft-side g-panel"></aside>
    </div>
  </div>`;
  cv = q$('.ft-cv'); cg = cv.getContext('2d'); stageEl = q$('.ft-stage'); padEl = q$('.ft-pad'); joyEl = q$('.ft-joy'); kickBtn = q$('.ft-kick');
  popEl = q$('.ft-pop'); cntEl = q$('.ft-count'); teamsEl = q$('.ft-teams'); mvpEl = q$('.ft-mvp'); sideEl = q$('.ft-side'); scoreEl = q$('.ft-score'); statusEl = q$('.ft-status'); toastEl = q$('.ft-toast');
  const jz = q$('.ft-jz');
  jz.addEventListener('pointerdown', joyDown); jz.addEventListener('pointermove', joyMove); jz.addEventListener('pointerup', joyUp); jz.addEventListener('pointercancel', joyUp);
  kickBtn.addEventListener('pointerdown', kickDown); kickBtn.addEventListener('pointerup', kickUp); kickBtn.addEventListener('pointercancel', kickUp); kickBtn.addEventListener('lostpointercapture', kickUp);
  kickBtn.addEventListener('contextmenu', e => e.preventDefault()); padEl.addEventListener('contextmenu', e => e.preventDefault());
  teamsEl.addEventListener('click', onTeamsClick);
  if (window.ResizeObserver) { ro = new ResizeObserver(() => resize()); ro.observe(stageEl); }
  addEventListener('resize', resize);
  document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKey); addEventListener('blur', onBlur);
  hudT = setInterval(hudTick, 200);
  requestAnimationFrame(resize);
}
function unmount() {
  removeEventListener('resize', resize); removeEventListener('blur', onBlur);
  document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKey);
  if (ro) { ro.disconnect(); ro = null; }
  clearInterval(hudT); clearTimeout(popT); clearTimeout(toastT); if (raf) cancelAnimationFrame(raf);
  raf = 0; root = null; ui = null; uiRef = null; V = null; G = null; cv = null; cg = null; stageEl = null; padEl = null; joyEl = null; kickBtn = null; popEl = null; cntEl = null; teamsEl = null; mvpEl = null; sideEl = null; scoreEl = null; statusEl = null; toastEl = null;
  ncReset();
}

CFX.registerGame({
  id: 'kafatopu', name: 'Kafa Topu', icon: '⚽', color: '#2bd96b', min: 2, max: 8, hotseat: true, bot: true, localMin: 1, botDelay: 900,
  tagline: 'Disk futbolu: pas ver, şut çek, GOOOL!',
  rules: 'Üstten görünümlü fizik futbolu: diskini yönlendir, topa yaklaşıp VUR (basılı tutup bırakınca daha sert). Başlama vuruşunda rakip takım orta dairenin dışında bekler. Süre bittiğinde çok gol atan kazanır; eşitlikte altın gol. Tek cihazda iki kişi: WASD+Boşluk ve Oklar+Enter.',
  options: [
    { key: 'sure', label: 'Süre', def: '3', choices: [{ v: '3', label: '3 dk' }, { v: '5', label: '5 dk' }, { v: '10', label: '10 dk' }] },
    { key: 'gol', label: 'Gol limiti', def: '5', choices: [{ v: '3', label: '3' }, { v: '5', label: '5' }, { v: '7', label: '7' }, { v: 'yok', label: 'Yok' }] },
    { key: 'saha', label: 'Saha', def: 'oto', choices: [{ v: 'oto', label: 'Otomatik' }, { v: 'kucuk', label: 'Küçük' }, { v: 'orta', label: 'Orta' }, { v: 'buyuk', label: 'Büyük' }] },
    { key: 'mod', label: 'Mod', def: 'klasik', choices: [{ v: 'klasik', label: '⚽ Klasik' }, { v: 'kafa', label: '🥅 Kafa Kafaya' }, { v: 'cilgin', label: '🎈 Çılgın Top' }] }
  ],
  setup, action, view, onPresence, resume,
  turnOf() { return null; },
  skipTurn() { /* gerçek zamanlı: kopan oyuncuyu bilgisayar oynatır */ },
  botAct() { /* botlar yöneten cihazdaki fizik döngüsünde oynar */ },
  mount, render, onEvent, onFast, unmount,
  _ft: { TICK, PR, BR, BR_BIG, KICK, REACH, CC_R, NET_D, SIZES, TEAM, geoOf, mkWorld, cloneW, stepWorld, encodeSnap, decodeSnap, worldFromSnap, qIn, dqIn, kickPow,
    tickOnce, simTick, aiInput, aiRoles, scoreGoal, placeKickoff, startMatch, hostInput, localSlots, curGeo,
    NC: () => NC, T: () => T, pos: () => curPos(), V: () => V, toS: (x, y) => toS(x, y), hostSt: () => hostSt, setHost: (st, ctx) => { hostSt = st; hostCtx = ctx; }, stopLoop: () => { loopSeq++; } }
});
})();
