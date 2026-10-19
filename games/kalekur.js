/* =========================================================================
   OYUN SALONU — KALE KUR
   Altıgen bir adada kaynak topla, takas et, yol / köy / kale kur.
   19 araziyi (5–6 kişide 30) çevreleyen deniz ve limanlar; 2 zar; Haydut;
   gelişim kartları; En Uzun Yol ve En Büyük Ordu. 2–6 kişi: online, aynı
   cihazda sırayla ya da bilgisayara karşı. Eldeki kaynak ve gelişim
   kartlarını yalnızca sahibi görür; diğerleri yalnızca sayıyı görür.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial } = CFX;

/* ------------------------------------------------------------------ veri */
const RES = [
  { k: 'odun', n: 'Odun', ic: '🌲', t: 'Orman', c: '#2f9e4f' },
  { k: 'tugla', n: 'Tuğla', ic: '🧱', t: 'Tuğla Ocağı', c: '#d0613a' },
  { k: 'yun', n: 'Yün', ic: '🐑', t: 'Mera', c: '#8fd650' },
  { k: 'bugday', n: 'Buğday', ic: '🌾', t: 'Tarla', c: '#f2c230' },
  { k: 'tas', n: 'Taş', ic: '🪨', t: 'Maden', c: '#9aa1b5' }
];
const DESERT = { n: 'Çöl', ic: '🏜️', c: '#e3c48a' };
const COST = { road: [1, 1, 0, 0, 0], setl: [1, 1, 1, 1, 0], city: [0, 0, 0, 2, 3], dev: [0, 0, 1, 1, 1] };
const BNAME = { road: 'Yol', setl: 'Köy', city: 'Kale', dev: 'Gelişim kartı' };
const BICON = { road: '🛤️', setl: '🏠', city: '🏰', dev: '🃏' };
const PIPS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
const DEV = {
  sov: { n: 'Şövalye', ic: '⚔️', d: 'Haydudu istediğin araziye taşı ve oradaki bir rakipten rastgele kart çal. 3 ve üzeri şövalye En Büyük Ordu için sayılır.' },
  zp: { n: 'Zafer Puanı', ic: '🏆', d: 'Gizli 1 zafer puanı. Oynanmaz; kazanınca açılır.' },
  yol: { n: 'Yol Yapımı', ic: '🛤️', d: 'Hemen 2 yolu bedavaya kur.' },
  bol: { n: 'Bolluk', ic: '🎁', d: 'Bankadan istediğin 2 kaynağı al.' },
  tek: { n: 'Tekel', ic: '💰', d: 'Bir kaynak seç: rakiplerin elindeki o kaynağın tamamı senin olur.' }
};
const LIMITS = { road: 15, setl: 5, city: 4 };
const sum5 = a => a[0] + a[1] + a[2] + a[3] + a[4];
const has = (hand, c) => c.every((x, i) => hand[i] >= x);
const zero = () => [0, 0, 0, 0, 0];
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const resList = c => c.map((n, i) => (n ? `${n}${RES[i].ic}` : '')).filter(Boolean).join(' ');
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuf(arr, rng) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ------------------------------------------------------------------ geometri (sivri tepeli altıgenler) */
const S = 60, W3 = Math.sqrt(3) * S;
const GEO = {};
function geo(big) {
  const key = big ? 'b' : 's'; if (GEO[key]) return GEO[key];
  const rows = big ? [3, 4, 5, 6, 5, 4, 3] : [3, 4, 5, 4, 3];
  const cy = (rows.length - 1) * 1.5 * S / 2;
  const H = [];
  rows.forEach((len, r) => { for (let i = 0; i < len; i++) H.push({ x: (i - (len - 1) / 2) * W3, y: r * 1.5 * S - cy, r, i, v: [], e: [], adj: [] }); });
  const V = [], E = [], vmap = new Map(), emap = new Map();
  const vk = (x, y) => Math.round(x * 4) + ',' + Math.round(y * 4);
  H.forEach((h, hi) => {
    for (let k = 0; k < 6; k++) {
      const a = (60 * k - 90) * Math.PI / 180, x = h.x + S * Math.cos(a), y = h.y + S * Math.sin(a), kk = vk(x, y);
      let id = vmap.get(kk);
      if (id == null) { id = V.length; V.push({ x, y, h: [], adj: [], e: [] }); vmap.set(kk, id); }
      V[id].h.push(hi); h.v.push(id);
    }
    for (let k = 0; k < 6; k++) {
      const a = Math.min(h.v[k], h.v[(k + 1) % 6]), b = Math.max(h.v[k], h.v[(k + 1) % 6]), kk = a + '-' + b;
      let id = emap.get(kk);
      if (id == null) { id = E.length; E.push({ a, b, h: [] }); emap.set(kk, id); V[a].e.push(id); V[b].e.push(id); V[a].adj.push(b); V[b].adj.push(a); }
      E[id].h.push(hi); h.e.push(id);
    }
  });
  H.forEach((h, i) => H.forEach((g, j) => { if (i !== j && Math.hypot(h.x - g.x, h.y - g.y) < W3 * 1.1) h.adj.push(j); }));
  E.forEach(e => { e.x = (V[e.a].x + V[e.b].x) / 2; e.y = (V[e.a].y + V[e.b].y) / 2; });
  const coast = E.map((e, i) => (e.h.length === 1 ? i : -1)).filter(i => i >= 0).sort((p, q) => Math.atan2(E[p].y, E[p].x) - Math.atan2(E[q].y, E[q].x));
  // limanlar: kıyı boyunca eşit aralıkla, uçları birbirine değmeyecek şekilde
  const nH = big ? 11 : 9, ports = [], usedV = new Set();
  const step = coast.length / nH;
  for (let i = 0; i < nH; i++) {
    let k = Math.round(i * step + 1) % coast.length, guard = 0;
    while (guard++ < coast.length && (usedV.has(E[coast[k]].a) || usedV.has(E[coast[k]].b))) k = (k + 1) % coast.length;
    const e = coast[k]; ports.push(e); usedV.add(E[e].a); usedV.add(E[e].b);
    V[E[e].a].adj.forEach(u => usedV.add(u)); V[E[e].b].adj.forEach(u => usedV.add(u));
  }
  const portPos = ports.map(e => { const ed = E[e], h = H[ed.h[0]], dx = ed.x - h.x, dy = ed.y - h.y, d = Math.hypot(dx, dy); return { x: ed.x + dx / d * S * .62, y: ed.y + dy / d * S * .62 }; });
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  H.forEach(h => { minX = Math.min(minX, h.x - W3 / 2); maxX = Math.max(maxX, h.x + W3 / 2); minY = Math.min(minY, h.y - S); maxY = Math.max(maxY, h.y + S); });
  const M = S * 1.05;
  GEO[key] = { H, V, E, coast, ports, portPos, box: { x: minX - M, y: minY - M, w: maxX - minX + 2 * M, h: maxY - minY + 2 * M } };
  return GEO[key];
}
const gs = st => geo(st.big);

/* ------------------------------------------------------------------ harita üretimi */
const BEGIN_RES = [4, 2, 0, 3, 1, 2, 1, 3, 0, -1, 0, 4, 0, 4, 3, 2, 1, 3, 2];
const BEGIN_NUM = [10, 2, 9, 12, 6, 4, 10, 9, 11, 0, 3, 8, 8, 3, 4, 5, 5, 6, 11];
const BEGIN_PORT = [-1, 2, -1, 3, 4, -1, 1, 0, -1];
function redOk(G, hexes) { return hexes.every((t, i) => !(t.num === 6 || t.num === 8) || G.H[i].adj.every(j => !(hexes[j].num === 6 || hexes[j].num === 8))); }
function softOk(G, hexes) { return hexes.every((t, i) => !t.num || G.H[i].adj.every(j => hexes[j].num !== t.num && !((t.num === 2 || t.num === 12) && (hexes[j].num === 2 || hexes[j].num === 12)))); }
function genMap(big, begin) {
  const G = geo(big);
  if (begin && !big) return { hexes: BEGIN_RES.map((r, i) => ({ res: r, num: BEGIN_NUM[i] })), ports: G.ports.map((e, i) => ({ e, k: BEGIN_PORT[i] })) };
  const rng = begin ? mulberry(20241) : Math.random;
  const tiles = [];
  (big ? [6, 5, 6, 6, 5] : [4, 3, 4, 4, 3]).forEach((n, r) => { for (let k = 0; k < n; k++) tiles.push(r); });
  for (let k = 0; k < (big ? 2 : 1); k++) tiles.push(-1);
  const nums = big ? [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12] : [2, 3, 3, 4, 4, 5, 5, 9, 9, 10, 10, 11, 11, 12];
  const reds = big ? [6, 6, 6, 8, 8, 8] : [6, 6, 8, 8];
  let hexes = null;
  for (let tries = 0; tries < 400; tries++) {
    const lay = shuf(tiles, rng);
    const land = lay.map((r, i) => (r >= 0 ? i : -1)).filter(i => i >= 0);
    // önce kırmızı sayılar (6/8) birbirine değmeyecek yerlere
    const pick = [], cand = shuf(land, rng);
    for (const i of cand) { if (pick.length >= reds.length) break; if (pick.every(j => !G.H[i].adj.includes(j))) pick.push(i); }
    if (pick.length < reds.length) continue;
    const rest = shuf(nums, rng), hx = lay.map(r => ({ res: r, num: 0 }));
    pick.forEach((i, k) => { hx[i].num = reds[k]; });
    let n = 0; land.forEach(i => { if (!hx[i].num) hx[i].num = rest[n++]; });
    if (!redOk(G, hx)) continue;
    hexes = hx;
    if (softOk(G, hx) || tries > 250) break;
  }
  const kinds = big ? [-1, -1, -1, -1, -1, 0, 1, 2, 2, 3, 4] : [-1, -1, -1, -1, 0, 1, 2, 3, 4];
  const pk = shuf(kinds, rng);
  return { hexes, ports: G.ports.map((e, i) => ({ e, k: pk[i] })) };
}

/* ------------------------------------------------------------------ kurallar (durum ya da görünüm üzerinde çalışır) */
const distOk = (st, v) => st.vOwn[v] === -1 && gs(st).V[v].adj.every(u => st.vOwn[u] === -1);
function canRoad(st, pi, e, setupV) {
  if (st.eOwn[e] !== -1) return false;
  const G = gs(st), ed = G.E[e];
  if (setupV != null && setupV >= 0) return ed.a === setupV || ed.b === setupV;
  return [ed.a, ed.b].some(v => st.vOwn[v] === pi || (st.vOwn[v] === -1 && G.V[v].e.some(x => x !== e && st.eOwn[x] === pi)));
}
const canSetl = (st, pi, v, setup) => distOk(st, v) && (setup || gs(st).V[v].e.some(e => st.eOwn[e] === pi));
const canCity = (st, pi, v) => st.vOwn[v] === pi && st.vLvl[v] === 1;
const validRoads = (st, pi, setupV) => gs(st).E.map((_, e) => e).filter(e => canRoad(st, pi, e, setupV));
const validSetls = (st, pi, setup) => gs(st).V.map((_, v) => v).filter(v => canSetl(st, pi, v, setup));
const validCities = (st, pi) => gs(st).V.map((_, v) => v).filter(v => canCity(st, pi, v));
function ratesOf(st, pi) {
  const r = [4, 4, 4, 4, 4], G = gs(st);
  st.ports.forEach(pt => {
    const e = G.E[pt.e];
    if (st.vOwn[e.a] === pi || st.vOwn[e.b] === pi) { if (pt.k < 0) for (let i = 0; i < 5; i++) r[i] = Math.min(r[i], 3); else r[pt.k] = 2; }
  });
  return r;
}
function longestFor(st, pi) {
  const G = gs(st), mine = st.eOwn.map((o, e) => (o === pi ? e : -1)).filter(e => e >= 0);
  if (!mine.length) return 0;
  let best = 0;
  const used = new Set();
  const dfs = (v, len) => {
    if (len > best) best = len;
    const o = st.vOwn[v]; if (o >= 0 && o !== pi) return;   // rakip yerleşimi yolu böler
    for (const e of G.V[v].e) {
      if (st.eOwn[e] !== pi || used.has(e)) continue;
      used.add(e); const ed = G.E[e]; dfs(ed.a === v ? ed.b : ed.a, len + 1); used.delete(e);
    }
  };
  for (const e of mine) { const ed = G.E[e]; for (const s of [ed.a, ed.b]) { used.clear(); used.add(e); dfs(s === ed.a ? ed.b : ed.a, 1); } if (best >= mine.length) break; }
  return best;
}
const vpPublic = (st, pi) => {
  let n = 0; st.vOwn.forEach((o, v) => { if (o === pi) n += st.vLvl[v]; });
  if (st.longest.pi === pi) n += 2; if (st.army.pi === pi) n += 2; return n;
};
const vpCards = (st, pi) => st.players[pi].dev.filter(d => d.k === 'zp').length;
const vpTotal = (st, pi) => vpPublic(st, pi) + vpCards(st, pi);
function prodOf(st, pi) {   // oyuncunun kaynak başına toplam pip değeri
  const G = gs(st), p = zero();
  st.vOwn.forEach((o, v) => { if (o !== pi) return; G.V[v].h.forEach(h => { const t = st.hexes[h]; if (t.res >= 0) p[t.res] += (PIPS[t.num] || 0) * st.vLvl[v]; }); });
  return p;
}
const playableDev = (st, pi) => (st.devPlayed || !st.players[pi].dev ? [] : st.players[pi].dev.filter(d => d.k !== 'zp' && (d.t != null ? d.t < st.turnN : !d.nw)).map(d => d.k));

/* ------------------------------------------------------------------ yöneten cihaz: akış */
let DEF = null;
const T = ms => Math.max(5, Math.round(ms * ((DEF && DEF.speed) || 1)));
const now = () => (DEF && DEF.clock ? DEF.clock() : Date.now());
const DICE_MS = 1300, DISCARD_MS = 35000, TRADE_MS = 25000, PICK_MS = 15000;
function scheduleRaw(st, ctx, ms, fn) { const s = ++st.seq; ctx.later(Math.max(5, ms), () => { if (st.seq === s) fn(st, ctx); }); }
function schedule(st, ctx, ms, fn) { const s = ++st.seq; ctx.later(T(ms), () => { if (st.seq === s) fn(st, ctx); }); }
const pn = (st, i) => (st.players[i] ? st.players[i].name : '?');
const say = (st, t) => { st.msg = t; };
const isOn = i => { const g = CFX.Room && CFX.Room.game; return !g || !g.players[i] || g.players[i].online !== false; };
function pay(st, pi, c) { const p = st.players[pi]; for (let i = 0; i < 5; i++) { p.hand[i] -= c[i]; st.bank[i] += c[i]; } }
function take(st, pi, c) { const p = st.players[pi]; for (let i = 0; i < 5; i++) { p.hand[i] += c[i]; st.bank[i] -= c[i]; } }

function updateLongest(st, ctx) {
  const lens = st.players.map((_, i) => longestFor(st, i));
  st.players.forEach((p, i) => { p.roadLen = lens[i]; });
  const h = st.longest.pi, mx = Math.max(...lens);
  let nh = h;
  if (h >= 0 && lens[h] >= 5 && lens[h] >= mx) nh = h;
  else { const c = lens.map((l, i) => (l === mx && mx >= 5 ? i : -1)).filter(i => i >= 0); nh = c.length === 1 ? c[0] : -1; }
  st.longest = { pi: nh, len: nh >= 0 ? lens[nh] : 0 };
  if (nh !== h) {
    if (nh >= 0) ctx.emit({ t: 'longest', pi: nh }, `🛣️ ${pn(st, nh)} En Uzun Yol’u aldı (${lens[nh]} yol, +2 ZP).`, 'gold');
    else ctx.emit({ t: 'longest', pi: -1 }, `🛣️ En Uzun Yol artık kimsede değil.`, 'bad');
  }
}
function updateArmy(st, ctx, pi) {
  const k = st.players[pi].knights, h = st.army.pi;
  if (k >= 3 && h !== pi && (h < 0 || k > st.players[h].knights)) {
    st.army = { pi, size: k };
    ctx.emit({ t: 'army', pi }, `⚔️ ${pn(st, pi)} En Büyük Ordu’yu kurdu (${k} şövalye, +2 ZP).`, 'gold');
  } else if (h === pi) st.army.size = k;
}
function result(st) {
  const order = st.players.map((_, i) => i).sort((a, b) => vpTotal(st, b) - vpTotal(st, a) || (a === st.winner ? -1 : b === st.winner ? 1 : 0) || vpPublic(st, b) - vpPublic(st, a));
  const w = st.winner >= 0 ? st.winner : order[0];
  const hid = st.players.map((p, i) => (vpCards(st, i) ? `${p.name} ${vpCards(st, i)}` : '')).filter(Boolean);
  return { title: `${pn(st, w)} adanın hâkimi!`, ranking: order.map(i => ({ pi: i, score: vpTotal(st, i), label: `${vpTotal(st, i)} ZP` })),
    note: `Hedef ${st.target} zafer puanıydı. ${st.turnN} tur oynandı.${hid.length ? ` Gizli Zafer Puanı kartları: ${hid.join(', ')}.` : ''}` };
}
function checkWin(st, ctx) {
  if (st.phase === 'over' || st.phase === 'setup') return false;
  const pi = st.cur;
  if (vpTotal(st, pi) < st.target) return false;
  st.phase = 'over'; st.winner = pi; st.trade = null; st.seq++;
  say(st, `${pn(st, pi)} ${vpTotal(st, pi)} zafer puanıyla kazandı!`);
  ctx.emit({ t: 'win', pi }, `🏆 ${pn(st, pi)} ${vpTotal(st, pi)} zafer puanına ulaştı ve oyunu kazandı!`, 'gold');
  ctx.sync();
  ctx.end(result(st));
  return true;
}

/* ---------- başlangıç yerleşimi (yılan sırası) ---------- */
function setupSetl(st, ctx, pi, v) {
  const su = st.setup, p = st.players[pi], G = gs(st);
  st.vOwn[v] = pi; st.vLvl[v] = 1; p.left.setl--;
  su.step = 'e'; su.lastV = v;
  let txt = '';
  if (su.idx >= st.players.length) {
    const c = zero();
    G.V[v].h.forEach(h => { const r = st.hexes[h].res; if (r >= 0 && st.bank[r] > 0) c[r]++; });
    take(st, pi, c);
    txt = sum5(c) ? ` Başlangıç kaynakları: ${resList(c)}` : '';
    if (sum5(c)) ctx.emit({ t: 'prod', gl: G.V[v].h.filter(h => st.hexes[h].res >= 0).map(h => ({ pi, h, r: st.hexes[h].res, n: 1 })) });
  }
  ctx.emit({ t: 'build', k: 'setl', pi, id: v }, `${p.name} ilk ${su.idx >= st.players.length ? 'ikinci' : 'birinci'} köyünü kurdu.${txt}`);
  say(st, `${p.name} köyüne bağlı bir yol yerleştiriyor…`);
  ctx.sync();
}
function setupRoad(st, ctx, pi, e) {
  const su = st.setup, p = st.players[pi];
  st.eOwn[e] = pi; p.left.road--;
  ctx.emit({ t: 'build', k: 'road', pi, id: e });
  su.idx++; su.step = 'v'; su.lastV = -1;
  if (su.idx >= su.order.length) {
    st.phase = 'roll'; st.cur = 0; st.turnN = 1;
    updateLongest(st, ctx);
    say(st, `Yerleşim tamam! ${pn(st, 0)} ilk zarı atacak.`);
    ctx.emit({ t: 'turn', pi: 0 }, `Yerleşim bitti. Oyun başlıyor: sıra ${pn(st, 0)} oyuncusunda.`, 'gold');
  } else {
    st.cur = su.order[su.idx];
    say(st, `${pn(st, st.cur)} ${su.idx >= st.players.length ? 'ikinci' : 'ilk'} köyünü yerleştiriyor…`);
  }
  ctx.sync();
}

/* ---------- zar ve üretim ---------- */
function doRoll(st, ctx) {
  st.dice = [rint(1, 6), rint(1, 6)]; st.rollN++; st.phase = 'rolling';
  say(st, `${pn(st, st.cur)} zar atıyor…`);
  ctx.emit({ t: 'rolling', pi: st.cur, d: st.dice.slice() });
  ctx.sync();
  schedule(st, ctx, DICE_MS, afterRoll);
}
function afterRoll(st, ctx) {
  const [a, b] = st.dice, s = a + b, p = st.players[st.cur];
  ctx.emit({ t: 'dice', pi: st.cur, d: st.dice.slice(), s }, `🎲 ${p.name}: ${a} + ${b} = ${s}`);
  if (s === 7) return startSeven(st, ctx);
  produce(st, ctx, s);
  st.phase = 'main';
  say(st, `${p.name} takas ve inşaat yapıyor…`);
  ctx.sync();
}
function produce(st, ctx, s) {
  const G = gs(st), n = st.players.length, got = st.players.map(() => zero()), src = [];
  let blocked = -1;
  G.H.forEach((hx, h) => {
    const t = st.hexes[h]; if (t.num !== s || t.res < 0) return;
    if (st.robber === h) { if (hx.v.some(v => st.vOwn[v] >= 0)) blocked = h; return; }
    hx.v.forEach(v => { const o = st.vOwn[v]; if (o >= 0) { got[o][t.res] += st.vLvl[v]; src.push({ pi: o, h, r: t.res, n: st.vLvl[v] }); } });
  });
  const short = [];
  for (let r = 0; r < 5; r++) {
    const dem = got.reduce((x, g) => x + g[r], 0); if (dem <= st.bank[r]) continue;
    const who = got.map((g, i) => (g[r] ? i : -1)).filter(i => i >= 0);
    if (who.length > 1) { got.forEach(g => { g[r] = 0; }); short.push(RES[r].n); }
    else got[who[0]][r] = st.bank[r];
  }
  const parts = [];
  for (let i = 0; i < n; i++) { if (sum5(got[i])) { take(st, i, got[i]); parts.push(`${pn(st, i)} +${resList(got[i])}`); } }
  const g = src.filter(x => got[x.pi][x.r] > 0);
  ctx.emit({ t: 'prod', gl: g, s }, parts.length ? `Üretim: ${parts.join(' · ')}` : `${s}: kimse kaynak toplamadı.`, parts.length ? 'good' : '');
  if (blocked >= 0) ctx.emit({ t: 'blocked', h: blocked }, `🥷 Haydut ${RES[st.hexes[blocked].res].t} arazisinin üretimini engelledi.`, 'bad');
  if (short.length) ctx.emit({ t: 'short' }, `Bankada yeterli ${short.join(', ')} yok: kimse alamadı.`, 'bad');
}
function startSeven(st, ctx) {
  const need = {};
  st.players.forEach((p, i) => { const n = sum5(p.hand); if (n > 7) need[i] = Math.floor(n / 2); });
  ctx.emit({ t: 'seven', pi: st.cur }, `7! Haydut harekete geçiyor.${Object.keys(need).length ? ' 7’den fazla kartı olanlar yarısını atacak.' : ''}`, 'bad');
  if (Object.keys(need).length) {
    st.phase = 'discard';
    st.discard = { need, dl: now() + T(DISCARD_MS), dur: T(DISCARD_MS), n: ++st.discN };
    say(st, `Kart atma: ${Object.keys(need).map(i => `${pn(st, +i)} (${need[i]})`).join(', ')}`);
    ctx.sync();
    schedule(st, ctx, DISCARD_MS, discardTimeout);
    return;
  }
  startRobber(st, ctx, 'main');
}
function doDiscard(st, ctx, pi, c, auto) {
  pay(st, pi, c);
  delete st.discard.need[pi];
  ctx.emit({ t: 'discard', pi, n: sum5(c) }, `${pn(st, pi)} ${sum5(c)} kart attı${auto ? ' (otomatik)' : ''}.`);
  if (!Object.keys(st.discard.need).length) { st.discard = null; startRobber(st, ctx, 'main'); return; }
  say(st, `Kart atma bekleniyor: ${Object.keys(st.discard.need).map(i => pn(st, +i)).join(', ')}`);
  ctx.sync();
}
function discardTimeout(st, ctx) {
  if (st.phase !== 'discard' || !st.discard) return;
  Object.keys(st.discard.need).map(Number).forEach(pi => { if (st.discard) doDiscard(st, ctx, pi, botDiscard(st, pi, st.discard.need[pi]), true); });
}
function startRobber(st, ctx, after) {
  st.phase = 'robber'; st.after = after;
  say(st, `${pn(st, st.cur)} Haydudu taşıyor…`);
  ctx.sync();
}
function robberVictims(st, h) {
  const G = gs(st), out = [];
  G.H[h].v.forEach(v => { const o = st.vOwn[v]; if (o >= 0 && o !== st.cur && !out.includes(o) && sum5(st.players[o].hand) > 0) out.push(o); });
  return out;
}
function moveRobber(st, ctx, h) {
  st.robber = h;
  const t = st.hexes[h];
  ctx.emit({ t: 'robber', pi: st.cur, h }, `🥷 ${pn(st, st.cur)} Haydudu ${t.res >= 0 ? `${RES[t.res].t} (${t.num})` : 'Çöl'} arazisine taşıdı.`);
  const vs = robberVictims(st, h);
  if (!vs.length) return finishRobber(st, ctx);
  if (vs.length === 1) return doSteal(st, ctx, vs[0]);
  st.phase = 'steal'; st.victims = vs;
  say(st, `${pn(st, st.cur)} kimden kart çalacağını seçiyor…`);
  ctx.sync();
}
function doSteal(st, ctx, victim) {
  const h = st.players[victim].hand, pool = [];
  h.forEach((n, r) => { for (let k = 0; k < n; k++) pool.push(r); });
  const r = pool[rint(0, pool.length - 1)];
  h[r]--; st.players[st.cur].hand[r]++;
  st.reveal = { n: ++st.revealN, thief: st.cur, victim, r };
  ctx.emit({ t: 'steal', thief: st.cur, victim, n: st.reveal.n }, `${pn(st, st.cur)}, ${pn(st, victim)} oyuncusundan bir kart çaldı.`, 'bad');
  finishRobber(st, ctx);
}
function finishRobber(st, ctx) {
  st.phase = st.after || 'main'; st.victims = null;
  say(st, st.phase === 'roll' ? `${pn(st, st.cur)} zar atacak.` : `${pn(st, st.cur)} takas ve inşaat yapıyor…`);
  ctx.sync();
}

/* ---------- takas ---------- */
function cleanC(c) { if (!Array.isArray(c) || c.length !== 5) return null; const o = c.map(x => Math.max(0, Math.min(19, x | 0))); return o; }
function startTrade(st, ctx, pi, give, get) {
  st.tradeN++; st.tradesTurn++;
  st.trade = { n: st.tradeN, from: pi, give, get, resp: st.players.map(() => null), dl: now() + T(TRADE_MS), dur: T(TRADE_MS), picking: false };
  st.trade.resp[pi] = 'me';
  st.phase = 'trade';
  say(st, `${pn(st, pi)} takas teklif ediyor: ${resList(give)} ⇄ ${resList(get)}`);
  ctx.emit({ t: 'tradeOffer', pi }, `🤝 ${pn(st, pi)} teklif ediyor: verir ${resList(give)}, ister ${resList(get)}`);
  ctx.sync();
  schedule(st, ctx, TRADE_MS, tradeTimeout);
}
const tradePending = st => st.trade.resp.map((r, i) => (r == null ? i : -1)).filter(i => i >= 0);
const tradePositive = st => st.trade.resp.map((r, i) => (r && (r.r === 'acc' || r.r === 'ctr') ? i : -1)).filter(i => i >= 0);
function tradeCheck(st, ctx) {
  const t = st.trade; if (!t) return;
  if (tradePending(st).length) { ctx.sync(); return; }
  if (!tradePositive(st).length) { endTrade(st, ctx, false, 'kimse kabul etmedi'); return; }
  if (!t.picking) { t.picking = true; t.dl = now() + T(PICK_MS); t.dur = T(PICK_MS); schedule(st, ctx, PICK_MS, tradeTimeout); }
  ctx.sync();
}
function tradeTimeout(st, ctx) {
  const t = st.trade; if (st.phase !== 'trade' || !t) return;
  if (!t.picking) {
    t.resp = t.resp.map(r => (r == null ? { r: 'no', auto: true } : r));
    if (st.players[t.from].isBot && tradePositive(st).length) { const k = botPick(st); if (k >= 0) { execTrade(st, ctx, k); return; } }
    tradeCheck(st, ctx); return;
  }
  endTrade(st, ctx, false, 'süre doldu');
}
function tradeTerms(st, k) {   // teklif sahibinin verdiği / aldığı
  const t = st.trade, r = t.resp[k];
  return r.r === 'ctr' ? { give: r.get, get: r.give } : { give: t.give, get: t.get };
}
function execTrade(st, ctx, k) {
  const t = st.trade, a = t.from, { give, get } = tradeTerms(st, k);
  if (!has(st.players[a].hand, give) || !has(st.players[k].hand, get)) { t.resp[k] = { r: 'no' }; tradeCheck(st, ctx); return false; }
  for (let i = 0; i < 5; i++) { st.players[a].hand[i] += get[i] - give[i]; st.players[k].hand[i] += give[i] - get[i]; }
  st.trade = null; st.phase = 'main'; st.seq++;
  say(st, `${pn(st, a)} ile ${pn(st, k)} anlaştı.`);
  ctx.emit({ t: 'trade', a, b: k, give, get }, `🤝 Anlaşma: ${pn(st, a)} ${resList(give)} verdi, ${pn(st, k)} ${resList(get)} verdi.`, 'good');
  ctx.sync();
  return true;
}
function endTrade(st, ctx, ok, why) {
  const t = st.trade; st.trade = null; st.phase = 'main'; st.seq++;
  say(st, `${pn(st, st.cur)} takas ve inşaat yapıyor…`);
  if (t) ctx.emit({ t: 'tradeNo', pi: t.from }, `Takas teklifi kapandı${why ? ` (${why})` : ''}.`);
  ctx.sync();
}

function endTurn(st, ctx) {
  const n = st.players.length;
  st.cur = (st.cur + 1) % n; st.phase = 'roll'; st.devPlayed = false; st.tradesTurn = 0; st.turnN++; st.botN = 0; st.freeRoads = 0; st.trade = null; st.seq++;
  say(st, `Sıra ${pn(st, st.cur)} oyuncusunda: zar atacak.`);
  ctx.emit({ t: 'turn', pi: st.cur }, `— Sıra: ${pn(st, st.cur)} —`);
  if (checkWin(st, ctx)) return;
  ctx.sync();
}

/* ------------------------------------------------------------------ bilgisayar oyuncu */
function resWeights(st) {
  const tot = zero(); st.hexes.forEach(t => { if (t.res >= 0) tot[t.res] += PIPS[t.num] || 0; });
  const avg = sum5(tot) / 5; return tot.map(x => Math.max(.75, Math.min(1.5, avg / (x || 1))));
}
function vScore(st, pi, v, w, prod) {
  const G = gs(st); let s = 0; const got = new Set();
  prod = prod || prodOf(st, pi); w = w || resWeights(st);
  G.V[v].h.forEach(h => {
    const t = st.hexes[h]; if (t.res < 0) return;
    const p = (PIPS[t.num] || 0) * (st.robber === h ? .5 : 1);
    s += p * w[t.res];
    if (!got.has(t.res)) { got.add(t.res); if (prod[t.res] < 2) s += 2.2; }
  });
  if ((got.has(0) || prod[0] > 0) && (got.has(1) || prod[1] > 0)) s += .8;
  if ((got.has(3) || prod[3] > 0) && (got.has(4) || prod[4] > 0)) s += .8;
  st.ports.forEach(pt => { const e = G.E[pt.e]; if (e.a !== v && e.b !== v) return; s += pt.k < 0 ? 1.2 : .25 * (prod[pt.k] + (got.has(pt.k) ? 4 : 0)); });
  return s;
}
function bestOf(list, f) { let b = null, bs = -1e9; for (const x of list) { const s = f(x); if (s > bs) { bs = s; b = x; } } return b; }
function botSetupV(st, pi) {
  const w = resWeights(st), prod = prodOf(st, pi);
  return bestOf(validSetls(st, pi, true), v => vScore(st, pi, v, w, prod) + Math.random() * .6);
}
function botSetupE(st, pi) {
  const G = gs(st), lv = st.setup.lastV, w = resWeights(st), prod = prodOf(st, pi);
  return bestOf(validRoads(st, pi, lv), e => {
    const ed = G.E[e], u = ed.a === lv ? ed.b : ed.a;
    let b = 0; G.V[u].adj.forEach(x => { if (x !== lv && distOk(st, x)) b = Math.max(b, vScore(st, pi, x, w, prod)); });
    return b + Math.random() * .3;
  });
}
function missing(hand, c) { let m = 0; for (let i = 0; i < 5; i++) m += Math.max(0, c[i] - hand[i]); return m; }
function botTarget(st, pi) {
  const p = st.players[pi], cands = [];
  if (p.left.city && validCities(st, pi).length) cands.push('city');
  const spots = p.left.setl ? validSetls(st, pi).length : 0;
  if (spots) cands.push('setl');
  if (p.left.road && !spots && p.left.setl && validRoads(st, pi).length) cands.push('road');
  if (st.deck.length) cands.push('dev');
  let best = null, bm = 99;
  const pr = prodOf(st, pi), cityLean = (pr[3] + pr[4]) >= (pr[0] + pr[1]) ? -.4 : .1;
  cands.forEach(k => { const m = missing(p.hand, COST[k]) + (k === 'dev' ? .8 : k === 'road' ? .4 : k === 'setl' ? -.2 : k === 'city' ? cityLean : 0); if (m < bm) { bm = m; best = k; } });
  return best;
}
function botRoadScore(st, pi, e) {
  const G = gs(st), ed = G.E[e], w = resWeights(st), prod = prodOf(st, pi);
  let s = 0;
  [ed.a, ed.b].forEach(x => {
    if (st.vOwn[x] >= 0) return;
    if (distOk(st, x)) s = Math.max(s, vScore(st, pi, x, w, prod));
    G.V[x].adj.forEach(y => { if (distOk(st, y)) s = Math.max(s, vScore(st, pi, y, w, prod) * .6); });
  });
  return s;
}
function botRoad(st, pi) {
  const roads = validRoads(st, pi); if (!roads.length) return null;
  let best = null, bs = 0;
  roads.forEach(e => { const s = botRoadScore(st, pi, e) + Math.random() * .2; if (s > bs) { bs = s; best = e; } });
  if (best != null) return best;
  // yerleşim yeri kalmadıysa en uzun yolu uzat
  const cur = longestFor(st, pi);
  return bestOf(roads, e => { st.eOwn[e] = pi; const l = longestFor(st, pi); st.eOwn[e] = -1; return l - cur + Math.random() * .1; });
}
function botDiscard(st, pi, need) {
  const hand = st.players[pi].hand.slice(), k = botTarget(st, pi), keep = k ? COST[k] : zero(), c = zero();
  for (let n = 0; n < need; n++) {
    let r = -1, bs = -1e9;
    for (let i = 0; i < 5; i++) { if (hand[i] - c[i] <= 0) continue; const s = (hand[i] - c[i] - keep[i]) * 2 + (hand[i] - c[i]) * .1; if (s > bs) { bs = s; r = i; } }
    c[r]++;
  }
  return c;
}
function botRobberHex(st, pi) {
  const G = gs(st), vps = st.players.map((_, i) => vpPublic(st, i) + (i === pi ? -99 : 0)), lead = Math.max(...vps);
  let best = -1, bs = -1e9;
  G.H.forEach((hx, h) => {
    if (h === st.robber) return;
    const t = st.hexes[h], p = t.res >= 0 ? PIPS[t.num] || 0 : 0;
    let s = 0, mine = false, victim = false;
    hx.v.forEach(v => { const o = st.vOwn[v]; if (o < 0) return; if (o === pi) { mine = true; return; } s += p * st.vLvl[v] * (vps[o] === lead ? 1.6 : 1); if (sum5(st.players[o].hand)) victim = true; });
    s += (victim ? 3 : 0) - (mine ? 50 : 0) + Math.random() * .3;
    if (s > bs) { bs = s; best = h; }
  });
  return best;
}
function botVictim(st, list) { return bestOf(list, i => vpPublic(st, i) * 3 + sum5(st.players[i].hand) * .5 + Math.random() * .2); }
// takas değeri: pi'nin get'i alıp give'ı vermesi (pi açısından)
function botValue(st, pi, recv, pay2) {
  const hand = st.players[pi].hand; if (!has(hand, pay2)) return -99;
  const k = botTarget(st, pi), cost = k ? COST[k] : zero();
  let gain = 0, loss = 0;
  for (let r = 0; r < 5; r++) {
    for (let u = 0; u < recv[r]; u++) gain += hand[r] + u < cost[r] ? 2.2 : hand[r] + u >= 3 ? .45 : .9;
    for (let u = 0; u < pay2[r]; u++) loss += hand[r] - u - 1 < cost[r] ? 2.3 : hand[r] - u >= 4 ? .45 : .95;
  }
  return gain - loss;
}
function botRespond(st, pi) {
  const t = st.trade, lead = vpTotal(st, t.from) >= st.target - 2;
  const v = botValue(st, pi, t.give, t.get);
  if (v > (lead ? 1.6 : .15)) return { r: 'acc' };
  // karşı teklif: istenen kaynakta fazlam varsa ve ihtiyacım olan bir şey varsa
  if (!lead && has(st.players[pi].hand, t.get) && sum5(t.get) <= 2) {
    const k = botTarget(st, pi), cost = k ? COST[k] : zero(), hand = st.players[pi].hand;
    const want = [0, 1, 2, 3, 4].filter(r => hand[r] < cost[r] && !t.get[r]);
    if (want.length && sum5(t.give) && !t.give[want[0]]) {
      const get = zero(); get[want[0]] = 1;
      const give = t.get.slice();
      if (botValue(st, pi, get, give) > .3) return { r: 'ctr', give, get };
    }
  }
  return { r: 'no' };
}
function botPick(st) {
  const t = st.trade; let best = -1, bs = -1e9;
  tradePositive(st).forEach(k => {
    const { give, get } = tradeTerms(st, k);
    if (!has(st.players[t.from].hand, give) || !has(st.players[k].hand, get)) return;
    const s = botValue(st, t.from, get, give) - vpPublic(st, k) * .05;
    if (s > bs && (t.resp[k].r === 'acc' || s > .2)) { bs = s; best = k; }
  });
  return best;
}
function botMain(st, pi, ctx, act) {
  const p = st.players[pi];
  if (++st.botN > 45) { endTurn(st, ctx); return; }
  const tk = botTarget(st, pi);
  // gelişim kartları
  const pl = playableDev(st, pi);
  if (pl.length) {
    const G = gs(st), robbed = G.H[st.robber].v.some(v => st.vOwn[v] === pi);
    if (pl.includes('sov') && (robbed || (p.knights + 1 >= 3 && (st.army.pi < 0 || (st.army.pi !== pi && p.knights + 1 > st.players[st.army.pi].knights))))) { if (act({ t: 'play', k: 'sov' })) return; }
    if (pl.includes('yol') && p.left.road >= 1 && validRoads(st, pi).length && (!validSetls(st, pi).length || p.left.road >= 4)) { if (act({ t: 'play', k: 'yol' })) return; }
    if (pl.includes('bol') && tk) {
      const cost = COST[tk], need = [];
      for (let r = 0; r < 5; r++) for (let u = p.hand[r]; u < cost[r]; u++) need.push(r);
      if (need.length && need.length <= 2) { while (need.length < 2) need.push(tk === 'city' ? 4 : 3); if (need.every(r => st.bank[r] > 0) && act({ t: 'play', k: 'bol', res: need.slice(0, 2) })) return; }
    }
    if (pl.includes('tek')) {
      const others = st.players.reduce((a, q, i) => a + (i === pi ? 0 : sum5(q.hand)), 0);
      if (others >= 7 && tk) { const cost = COST[tk]; const r = bestOf([0, 1, 2, 3, 4], x => (cost[x] - p.hand[x]) * 2 + RES.length - x * .01); if (act({ t: 'play', k: 'tek', res: r })) return; }
    }
  }
  // inşaat
  if (p.left.city && has(p.hand, COST.city)) { const c = validCities(st, pi); if (c.length) { const w = resWeights(st); if (act({ t: 'city', v: bestOf(c, v => vScore(st, pi, v, w, zero())) })) return; } }
  if (p.left.setl && has(p.hand, COST.setl)) { const sp = validSetls(st, pi); if (sp.length) { const w = resWeights(st), prod = prodOf(st, pi); if (act({ t: 'setl', v: bestOf(sp, v => vScore(st, pi, v, w, prod)) })) return; } }
  if (p.left.road && has(p.hand, COST.road) && (tk === 'road' || (!validSetls(st, pi).length && p.left.setl) || (p.hand[0] >= 3 && p.hand[1] >= 3))) {
    const e = botRoad(st, pi); if (e != null && act({ t: 'road', e })) return;
  }
  if (st.deck.length && has(p.hand, COST.dev)) {
    const keep = tk && tk !== 'dev' ? COST[tk] : zero();
    const after = p.hand.map((x, i) => x - COST.dev[i]);
    if (tk === 'dev' || missing(after, keep) <= missing(p.hand, keep)) { if (act({ t: 'buyDev' })) return; }
  }
  // banka / liman takası
  if (tk) {
    const cost = COST[tk], rates = ratesOf(st, pi);
    const need = [0, 1, 2, 3, 4].filter(r => p.hand[r] < cost[r] && st.bank[r] > 0);
    if (need.length) {
      const g = bestOf([0, 1, 2, 3, 4].filter(r => !need.includes(r) && p.hand[r] - cost[r] >= rates[r]), r => p.hand[r] - cost[r] - rates[r] * .5);
      if (g != null && act({ t: 'bank', give: g, get: need[0] })) return;
    }
    // oyuncularla takas (turda bir kez)
    if (st.tradesTurn < 1 && need.length && (missing(p.hand, cost) === 1 || sum5(p.hand) > 7) && Math.random() < .6) {
      const sur = bestOf([0, 1, 2, 3, 4].filter(r => p.hand[r] - cost[r] >= 1 && !need.includes(r)), r => p.hand[r] - cost[r]);
      if (sur != null) {
        const give = zero(), get = zero(); give[sur] = sum5(p.hand) > 7 && p.hand[sur] - cost[sur] >= 2 ? 2 : 1; get[need[0]] = 1;
        if (act({ t: 'offer', give, get })) return;
      }
    }
  }
  act({ t: 'end' });
}

/* ------------------------------------------------------------------ oyun tanımı */
DEF = {
  id: 'kalekur', name: 'Kale Kur', icon: '🏰', color: '#ff9f43', min: 2, max: 6, hotseat: true, bot: true, localMin: 1,
  tagline: 'Altıgen ada: kaynak topla, takas et, kaleni kur',
  rules: 'Zar at; köy ve kalelerinin değdiği araziler kaynak üretir (Odun, Tuğla, Yün, Buğday, Taş). Kaynaklarla yol, köy, kale ve gelişim kartı al; bankayla, limanlarla ya da oyuncularla takas et. 7 gelince Haydut çıkar. En Uzun Yol ve En Büyük Ordu 2’şer puan; hedef zafer puanına ilk ulaşan kazanır.',
  options: [
    { key: 'map', label: 'Harita', def: 'rastgele', choices: [{ v: 'rastgele', label: 'Rastgele harita' }, { v: 'baslangic', label: 'Başlangıç haritası' }] },
    { key: 'size', label: 'Ada', def: 'oto', choices: [{ v: 'oto', label: 'Otomatik' }, { v: 'buyuk', label: 'Büyük ada (30)' }] },
    { key: 'target', label: 'Hedef', def: '10', choices: [{ v: '8', label: '8 ZP' }, { v: '10', label: '10 ZP' }, { v: '12', label: '12 ZP' }] }
  ],
  speed: 1,
  get botDelay() { return T(750); },
  setup(players, opts) {
    opts = opts || {};
    const n = players.length, big = n > 4 || opts.size === 'buyuk';
    const target = [8, 10, 12].includes(+opts.target) ? +opts.target : 10;
    const G = geo(big), m = genMap(big, opts.map === 'baslangic');
    const deck = [];
    Object.entries(big ? { sov: 20, zp: 5, yol: 3, bol: 3, tek: 3 } : { sov: 14, zp: 5, yol: 2, bol: 2, tek: 2 }).forEach(([k, c]) => { for (let i = 0; i < c; i++) deck.push(k); });
    const order = players.map((_, i) => i).concat(players.map((_, i) => n - 1 - i));
    const st = {
      v: 1, big, target, mapKind: opts.map === 'baslangic' ? 'baslangic' : 'rastgele',
      hexes: m.hexes, ports: m.ports, robber: m.hexes.findIndex(t => t.res < 0),
      vOwn: Array(G.V.length).fill(-1), vLvl: Array(G.V.length).fill(0), eOwn: Array(G.E.length).fill(-1),
      players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot, hand: zero(), dev: [], knights: 0, left: Object.assign({}, LIMITS), roadLen: 0 })),
      bank: Array(5).fill(big ? 24 : 19), deck: CFX.shuffle ? CFX.shuffle(deck) : shuf(deck, Math.random),
      phase: 'setup', cur: 0, setup: { order, idx: 0, step: 'v', lastV: -1 },
      dice: [3, 4], rollN: 0, turnN: 0, devPlayed: false, tradesTurn: 0, freeRoads: 0, after: 'main', victims: null,
      discard: null, discN: 0, trade: null, tradeN: 0, reveal: null, revealN: 0,
      longest: { pi: -1, len: 0 }, army: { pi: -1, size: 0 }, winner: -1, msg: '', seq: 0, botN: 0
    };
    if (st.robber < 0) st.robber = 0;
    say(st, `${pn(st, 0)} ilk köyünü yerleştiriyor. Yerleşim yılan sırasıyla: ikinci köy başlangıç kaynağı verir.`);
    return st;
  },
  action(st, pi, a, ctx) {
    if (!a || typeof a.t !== 'string' || st.phase === 'over') return false;
    const p = st.players[pi]; if (!p) return false;
    const G = gs(st);
    // herkesin yapabildikleri: kart atma ve takas yanıtı
    if (a.t === 'discard') {
      if (st.phase !== 'discard' || !st.discard || st.discard.need[pi] == null) return false;
      const c = cleanC(a.cards); if (!c || sum5(c) !== st.discard.need[pi] || !has(p.hand, c)) return false;
      doDiscard(st, ctx, pi, c, false); return true;
    }
    if (st.phase === 'trade' && st.trade) {
      const t = st.trade;
      if (a.t === 'respond' && pi !== t.from) {
        if (a.r === 'acc') { if (!has(p.hand, t.get)) return false; t.resp[pi] = { r: 'acc' }; ctx.emit({ t: 'tradeResp', pi, r: 'acc' }, `${p.name} teklifi kabul etti.`, 'good'); }
        else if (a.r === 'no') { t.resp[pi] = { r: 'no' }; ctx.emit({ t: 'tradeResp', pi, r: 'no' }); }
        else if (a.r === 'ctr') {
          const give = cleanC(a.give), get = cleanC(a.get);
          if (!give || !get || !sum5(give) || !sum5(get) || !has(p.hand, give) || give.some((x, i) => x && get[i])) return false;
          t.resp[pi] = { r: 'ctr', give, get };
          ctx.emit({ t: 'tradeResp', pi, r: 'ctr' }, `${p.name} karşı teklif verdi: verir ${resList(give)}, ister ${resList(get)}.`);
        } else return false;
        tradeCheck(st, ctx); return true;
      }
      if (pi !== t.from) return false;
      if (a.t === 'pick') { const k = a.pi | 0; const r = t.resp[k]; if (k === pi || !r || (r.r !== 'acc' && r.r !== 'ctr')) return false; return execTrade(st, ctx, k); }
      if (a.t === 'cancelTrade') { endTrade(st, ctx, false, 'geri çekildi'); return true; }
      return false;
    }
    // kurulum
    if (st.phase === 'setup') {
      const su = st.setup; if (su.order[su.idx] !== pi) return false;
      if (a.t === 'setl') { const v = a.v | 0; if (su.step !== 'v' || !G.V[v] || !canSetl(st, pi, v, true)) return false; setupSetl(st, ctx, pi, v); return true; }
      if (a.t === 'road') { const e = a.e | 0; if (su.step !== 'e' || !G.E[e] || !canRoad(st, pi, e, su.lastV)) return false; setupRoad(st, ctx, pi, e); return true; }
      return false;
    }
    if (pi !== st.cur) return false;
    switch (a.t) {
      case 'roll': if (st.phase !== 'roll') return false; doRoll(st, ctx); return true;
      case 'robber': {
        const h = a.h | 0; if (st.phase !== 'robber' || !G.H[h] || h === st.robber) return false;
        moveRobber(st, ctx, h); return true;
      }
      case 'steal': { if (st.phase !== 'steal' || !st.victims || !st.victims.includes(a.pi)) return false; doSteal(st, ctx, a.pi); return true; }
      case 'road': {
        const e = a.e | 0; if (!G.E[e] || !p.left.road || !canRoad(st, pi, e)) return false;
        if (st.phase === 'roadBuild') {
          st.eOwn[e] = pi; p.left.road--; st.freeRoads--;
          ctx.emit({ t: 'build', k: 'road', pi, id: e, free: true }, `${p.name} bedava yol kurdu.`);
          updateLongest(st, ctx);
          if (checkWin(st, ctx)) return true;
          if (st.freeRoads <= 0 || !p.left.road || !validRoads(st, pi).length) { st.phase = 'main'; st.freeRoads = 0; say(st, `${p.name} takas ve inşaat yapıyor…`); }
          ctx.sync(); return true;
        }
        if (st.phase !== 'main' || !has(p.hand, COST.road)) return false;
        pay(st, pi, COST.road); st.eOwn[e] = pi; p.left.road--;
        ctx.emit({ t: 'build', k: 'road', pi, id: e }, `${p.name} yol kurdu.`);
        updateLongest(st, ctx);
        if (checkWin(st, ctx)) return true;
        ctx.sync(); return true;
      }
      case 'setl': {
        const v = a.v | 0; if (st.phase !== 'main' || !G.V[v] || !p.left.setl || !has(p.hand, COST.setl) || !canSetl(st, pi, v)) return false;
        pay(st, pi, COST.setl); st.vOwn[v] = pi; st.vLvl[v] = 1; p.left.setl--;
        ctx.emit({ t: 'build', k: 'setl', pi, id: v }, `🏠 ${p.name} köy kurdu.`, 'good');
        updateLongest(st, ctx);
        if (checkWin(st, ctx)) return true;
        ctx.sync(); return true;
      }
      case 'city': {
        const v = a.v | 0; if (st.phase !== 'main' || !G.V[v] || !p.left.city || !has(p.hand, COST.city) || !canCity(st, pi, v)) return false;
        pay(st, pi, COST.city); st.vLvl[v] = 2; p.left.city--; p.left.setl++;
        ctx.emit({ t: 'build', k: 'city', pi, id: v }, `🏰 ${p.name} köyünü kaleye çevirdi!`, 'good');
        if (checkWin(st, ctx)) return true;
        ctx.sync(); return true;
      }
      case 'buyDev': {
        if (st.phase !== 'main' || !st.deck.length || !has(p.hand, COST.dev)) return false;
        pay(st, pi, COST.dev);
        const k = st.deck.pop(); p.dev.push({ k, t: st.turnN });
        ctx.emit({ t: 'buyDev', pi }, `🃏 ${p.name} bir gelişim kartı aldı.`);
        if (checkWin(st, ctx)) return true;
        ctx.sync(); return true;
      }
      case 'play': {
        if (st.phase !== 'main' && st.phase !== 'roll') return false;
        const k = a.k; if (!DEV[k] || k === 'zp' || !playableDev(st, pi).includes(k)) return false;
        if (k === 'yol' && (!p.left.road || !validRoads(st, pi).length)) return false;
        let r1 = null;
        if (k === 'bol') { if (!Array.isArray(a.res) || a.res.length !== 2) return false; r1 = a.res.map(x => x | 0); const need = zero(); r1.forEach(r => { if (r >= 0 && r < 5) need[r]++; }); if (sum5(need) !== 2 || need.some((x, i) => x > st.bank[i])) return false; r1 = need; }
        if (k === 'tek') { r1 = a.res | 0; if (r1 < 0 || r1 > 4) return false; }
        p.dev.splice(p.dev.findIndex(d => d.k === k && d.t < st.turnN), 1); st.devPlayed = true;
        if (k === 'sov') {
          p.knights++;
          ctx.emit({ t: 'play', pi, k }, `⚔️ ${p.name} Şövalye oynadı (${p.knights}. şövalye).`, 'gold');
          updateArmy(st, ctx, pi);
          if (checkWin(st, ctx)) return true;
          startRobber(st, ctx, st.phase === 'roll' ? 'roll' : 'main'); return true;
        }
        if (k === 'yol') {
          st.freeRoads = Math.min(2, p.left.road); st.phase = 'roadBuild';
          ctx.emit({ t: 'play', pi, k }, `🛤️ ${p.name} Yol Yapımı oynadı: ${st.freeRoads} bedava yol.`, 'gold');
          say(st, `${p.name} bedava yollarını kuruyor…`); ctx.sync(); return true;
        }
        if (k === 'bol') {
          take(st, pi, r1);
          ctx.emit({ t: 'play', pi, k }, `🎁 ${p.name} Bolluk oynadı: bankadan ${resList(r1)} aldı.`, 'gold');
          ctx.sync(); return true;
        }
        if (k === 'tek') {
          let tot = 0;
          st.players.forEach((q, i) => { if (i !== pi && q.hand[r1]) { tot += q.hand[r1]; p.hand[r1] += q.hand[r1]; q.hand[r1] = 0; } });
          ctx.emit({ t: 'play', pi, k, r: r1, n: tot }, `💰 ${p.name} Tekel oynadı: herkesten ${tot} ${RES[r1].n} topladı!`, 'gold');
          ctx.sync(); return true;
        }
        return false;
      }
      case 'bank': {
        const g = a.give | 0, r = a.get | 0; if (st.phase !== 'main' || g === r || g < 0 || g > 4 || r < 0 || r > 4) return false;
        const rate = ratesOf(st, pi)[g]; if (p.hand[g] < rate || st.bank[r] < 1) return false;
        const c = zero(); c[g] = rate; pay(st, pi, c); const d = zero(); d[r] = 1; take(st, pi, d);
        ctx.emit({ t: 'bank', pi, give: g, get: r, rate }, `${p.name} ${rate === 4 ? 'bankayla' : 'limanda'} takas yaptı: ${rate}${RES[g].ic} → 1${RES[r].ic}`);
        ctx.sync(); return true;
      }
      case 'offer': {
        if (st.phase !== 'main' || st.tradesTurn >= 6) return false;
        const give = cleanC(a.give), get = cleanC(a.get);
        if (!give || !get || !sum5(give) || !sum5(get) || !has(p.hand, give) || give.some((x, i) => x && get[i])) return false;
        startTrade(st, ctx, pi, give, get); return true;
      }
      case 'endRoads': if (st.phase !== 'roadBuild') return false; st.phase = 'main'; st.freeRoads = 0; say(st, `${p.name} takas ve inşaat yapıyor…`); ctx.sync(); return true;
      case 'end': if (st.phase !== 'main') return false; endTurn(st, ctx); return true;
      default: return false;
    }
  },
  view(st, viewer) {
    const G2 = CFX.Room && CFX.Room.game;
    const vis = i => viewer === 'all' || viewer === i || st.phase === 'over';
    const rv = st.reveal ? Object.assign({}, st.reveal, { r: (viewer === 'all' || viewer === st.reveal.thief || viewer === st.reveal.victim) ? st.reveal.r : null }) : null;
    return {
      big: st.big, target: st.target, mapKind: st.mapKind, hexes: st.hexes, ports: st.ports, robber: st.robber,
      vOwn: st.vOwn.slice(), vLvl: st.vLvl.slice(), eOwn: st.eOwn.slice(),
      players: st.players.map((p, i) => ({
        name: p.name, color: p.color, isBot: p.isBot, online: G2 && G2.players[i] ? G2.players[i].online !== false : true,
        n: sum5(p.hand), hand: vis(i) ? p.hand.slice() : null, devN: p.dev.length,
        dev: vis(i) ? p.dev.map(d => ({ k: d.k, nw: d.t >= st.turnN })) : null,
        knights: p.knights, vp: vpPublic(st, i), vpT: vis(i) ? vpTotal(st, i) : null, left: Object.assign({}, p.left), roadLen: p.roadLen
      })),
      bank: st.bank.slice(), deckN: st.deck.length, phase: st.phase, cur: st.cur, turn: DEF.turnOf(st), dice: st.dice.slice(), rollN: st.rollN, turnN: st.turnN,
      setup: st.phase === 'setup' ? Object.assign({}, st.setup, { order: st.setup.order.slice() }) : null,
      devPlayed: st.devPlayed, freeRoads: st.freeRoads, victims: st.victims, discard: st.discard, trade: st.trade, tradesTurn: st.tradesTurn,
      reveal: rv, longest: st.longest, army: st.army, winner: st.winner, msg: st.msg
    };
  },
  turnOf(st) {
    switch (st.phase) {
      case 'setup': return st.setup.order[st.setup.idx];
      case 'roll': case 'robber': case 'steal': case 'main': case 'roadBuild': return st.cur;
      case 'discard': {
        if (!st.discard) return null;
        const pend = Object.keys(st.discard.need).map(Number);
        return pend.find(i => st.players[i].isBot) ?? pend.find(i => !isOn(i)) ?? (pend.length ? pend[0] : null);
      }
      case 'trade': {
        if (!st.trade) return null;
        const pend = tradePending(st);
        return pend.find(i => st.players[i].isBot) ?? pend.find(i => !isOn(i)) ?? (pend.length ? pend[0] : st.trade.from);
      }
      default: return null;
    }
  },
  botAct(st, pi, ctx) {
    if (st.phase === 'over' || this.turnOf(st) !== pi) return;
    const act = a => this.action(st, pi, a, ctx);
    switch (st.phase) {
      case 'setup':
        if (st.setup.step === 'v') { const v = botSetupV(st, pi); if (v != null && act({ t: 'setl', v })) return; }
        else { const e = botSetupE(st, pi); if (e != null && act({ t: 'road', e })) return; }
        return;
      case 'roll': {
        const pl = playableDev(st, pi);
        if (pl.includes('sov') && gs(st).H[st.robber].v.some(v => st.vOwn[v] === pi) && act({ t: 'play', k: 'sov' })) return;
        act({ t: 'roll' }); return;
      }
      case 'discard': act({ t: 'discard', cards: botDiscard(st, pi, st.discard.need[pi]) }); return;
      case 'robber': if (act({ t: 'robber', h: botRobberHex(st, pi) })) return; act({ t: 'robber', h: (st.robber + 1) % st.hexes.length }); return;
      case 'steal': act({ t: 'steal', pi: botVictim(st, st.victims) }); return;
      case 'roadBuild': { const e = botRoad(st, pi); if (e != null && act({ t: 'road', e })) return; act({ t: 'endRoads' }); return; }
      case 'trade': {
        const t = st.trade;
        if (pi === t.from) { const k = botPick(st); if (k >= 0 && act({ t: 'pick', pi: k })) return; act({ t: 'cancelTrade' }); return; }
        const r = botRespond(st, pi);
        if (act(Object.assign({ t: 'respond' }, r))) return;
        act({ t: 'respond', r: 'no' }); return;
      }
      case 'main': botMain(st, pi, ctx, act); return;
      default: break;
    }
  },
  skipTurn(st, pi, ctx) {
    if (st.phase === 'over' || this.turnOf(st) !== pi) return;
    const act = a => this.action(st, pi, a, ctx);
    switch (st.phase) {
      case 'setup': case 'robber': case 'steal': case 'discard': this.botAct(st, pi, ctx); return;
      case 'roll': act({ t: 'roll' }); return;
      case 'roadBuild': act({ t: 'endRoads' }); return;
      case 'trade': if (pi === st.trade.from) act({ t: 'cancelTrade' }); else act({ t: 'respond', r: 'no' }); return;
      case 'main': endTurn(st, ctx); return;
      default: break;
    }
  },
  onPresence(st, pi, on, ctx) {
    // kart atmada/takasta bağlantısı kopan oyuncu turnOf ile sıraya girer ve otomatik çözülür
    if (!on) ctx.sync();
  },
  resume(st, ctx) {
    if (st.phase === 'rolling') schedule(st, ctx, 400, afterRoll);
    else if (st.phase === 'discard' && st.discard) { const d = st.discard; d.dl = Math.max(d.dl, now() + 10000); d.dur = Math.max(d.dur, d.dl - now()); scheduleRaw(st, ctx, d.dl - now(), discardTimeout); }
    else if (st.phase === 'trade' && st.trade) { const t = st.trade; t.dl = Math.max(t.dl, now() + 10000); t.dur = Math.max(t.dur, t.dl - now()); scheduleRaw(st, ctx, t.dl - now(), tradeTimeout); }
    else if (st.phase === 'over') ctx.end(result(st));
  },
  // test kancaları
  _t: { RES, COST, PIPS, DEV, LIMITS, geo, gs, genMap, redOk, softOk, distOk, canRoad, canSetl, canCity, validRoads, validSetls, validCities, ratesOf, longestFor, vpPublic, vpTotal, updateLongest, updateArmy,
    produce, startSeven, doSteal, botTarget, botValue, botRespond, botDiscard, botRobberHex, endTurn, checkWin, sum5, has, result, playableDev }
};

/* ------------------------------------------------------------------ arayüz */
const FACE_ROT = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };
const FACE_TF = { 1: '', 2: 'rotateX(90deg)', 3: 'rotateY(90deg)', 4: 'rotateY(-90deg)', 5: 'rotateX(-90deg)', 6: 'rotateY(180deg)' };
const DPIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const HOUSE = 'M-10,10 V-2 L0,-12 L10,-2 V10 Z';
const CASTLE = 'M-15,12 V-6 L-15,-10 H-12 V-7 H-8.5 V-10 H-5 V-2 H-1 V-18 H3 V-15 H5 V-18 H9 V-15 H11 V-18 H15 V12 Z';
const fine = () => { try { return matchMedia('(pointer: fine)').matches; } catch (e) { return false; } };
const isDesk = () => innerWidth >= 900;
const cardsHTML = (c, cls) => c.map((n, i) => (n ? `<span class="kl-rc r${i} ${cls || ''}"><i>${RES[i].ic}</i>${n > 1 ? `<b>×${n}</b>` : ''}</span>` : '')).join('') || '<span class="kl-rc none">—</span>';
const costHTML = c => c.map((n, i) => Array.from({ length: n }, () => `<i class="r${i}">${RES[i].ic}</i>`).join('')).join('');

let root = null, ui = null, V = null, E = {}, cam = null, drag = null, pointers = new Map(), moved = false, mapKey = '', firstRender = true,
  mode = null, sel = null, modal = null, draft = null, lastHuman = -1, diceN = -1, lastRob = -1, lastReveal = 0, rafT = 0, resizeT = 0, lastHand = null, lastTurnKey = '', lastPhase = '';

function actor(v) {
  const t = v.turn; if (t == null || !v.players[t]) return -1;
  if (ui.mode === 'local') return v.players[t].isBot ? -1 : t;
  return ui.me === t ? t : -1;
}
const humans = v => v.players.map((p, i) => (p.isBot ? -1 : i)).filter(i => i >= 0);
// bu cihazda kart atması gereken / takasa yanıt vermesi gereken oyuncu
function pendingLocal(v) {
  if (v.phase === 'discard' && v.discard) {
    const pend = Object.keys(v.discard.need).map(Number);
    if (ui.mode === 'local') return pend.find(i => !v.players[i].isBot) ?? -1;
    return pend.includes(ui.me) ? ui.me : -1;
  }
  if (v.phase === 'trade' && v.trade) {
    const pend = v.trade.resp.map((r, i) => (r == null ? i : -1)).filter(i => i >= 0);
    if (ui.mode === 'local') return pend.find(i => !v.players[i].isBot) ?? -1;
    return pend.includes(ui.me) ? ui.me : -1;
  }
  return -1;
}
function viewerPi(v) {
  if (ui.mode !== 'local') return ui.me;
  const pl = pendingLocal(v); if (pl >= 0) return pl;
  const a = actor(v); if (a >= 0) { lastHuman = a; return a; }
  if (v.phase === 'trade' && v.trade && !v.players[v.trade.from].isBot) return v.trade.from;
  if (lastHuman >= 0 && v.players[lastHuman] && !v.players[lastHuman].isBot) return lastHuman;
  const h = humans(v); return h.length ? h[0] : -1;
}
const myTurn = v => { const a = actor(v); return a >= 0 && a === v.cur && v.turn === v.cur; };
const send = (a, as) => { Sound.init(); if (ui.mode === 'local' && as != null && as >= 0) a.as = as; ui.send(a); };

/* ---------- SVG: statik ada ---------- */
function hexPts(x, y, k) { const p = []; for (let i = 0; i < 6; i++) { const a = (60 * i - 90) * Math.PI / 180; p.push(`${(x + S * k * Math.cos(a)).toFixed(1)},${(y + S * k * Math.sin(a)).toFixed(1)}`); } return p.join(' '); }
const DECO = {
  0: [['tree', -27, -22, 1.05], ['tree', 24, -27, .95], ['tree', -34, 12, .9], ['tree', 33, 9, 1], ['tree', -9, 36, .85], ['tree', 17, 34, .9], ['tree', 2, -42, .8]],
  1: [['brick', -26, -24, 1], ['brick', 27, -22, .9], ['brick', -31, 15, .95], ['kiln', 30, 14, 1], ['brick', 2, 37, .85]],
  2: [['sheep', -26, -24, 1], ['sheep', 26, -22, .9], ['grass', -36, 10, 1], ['sheep', 30, 14, 1], ['grass', 6, -40, 1], ['sheep', -6, 35, .9], ['grass', 24, 37, .9]],
  3: [['wheat', -26, -22, 1], ['wheat', 26, -24, 1], ['wheat', -32, 14, 1], ['wheat', 32, 12, 1], ['wheat', -8, 36, .95], ['wheat', 14, 36, .95], ['wheat', 2, -41, .85]],
  4: [['mount', -24, -22, 1.1], ['mount', 25, -20, 1], ['mount', -30, 16, .95], ['mount', 30, 15, 1.05], ['mount', 2, 36, .9]],
  '-1': [['dune', -24, -20, 1], ['cactus', 25, -20, 1], ['dune', 26, 18, 1], ['cactus', -28, 16, .85], ['dune', 0, 36, 1], ['skull', 2, -38, .8]]
};
const SYM = `
<symbol id="kl-tree" overflow="visible"><ellipse cx="0" cy="12" rx="9" ry="3" fill="rgba(0,0,0,.22)"/><rect x="-1.8" y="6" width="3.6" height="6" fill="#6b4423"/><path d="M0,-15 L10,1 H4.5 L12,10 H-12 L-4.5,1 H-10 Z" fill="#1d6a36"/><path d="M0,-15 L10,1 H4.5 L12,10 H0 Z" fill="#165a2c"/><path d="M0,-15 L-4,-8 L0,-9 Z" fill="#5fd17f" opacity=".6"/></symbol>
<symbol id="kl-brick" overflow="visible"><ellipse cx="0" cy="9" rx="13" ry="3" fill="rgba(0,0,0,.2)"/><g stroke="#f6d2b3" stroke-width=".9"><rect x="-12" y="1" width="11" height="6" rx="1" fill="#a6402a"/><rect x="0" y="1" width="11" height="6" rx="1" fill="#b84c31"/><rect x="-6" y="-5" width="11" height="6" rx="1" fill="#c25836"/><rect x="-1" y="-11" width="9" height="6" rx="1" fill="#a6402a"/></g></symbol>
<symbol id="kl-kiln" overflow="visible"><ellipse cx="0" cy="10" rx="12" ry="3" fill="rgba(0,0,0,.2)"/><path d="M-11,10 V-2 Q0,-14 11,-2 V10 Z" fill="#8f3a24" stroke="#5d2213" stroke-width="1.2"/><path d="M-4,10 V3 Q0,-2 4,3 V10 Z" fill="#ffb347"/><rect x="4" y="-16" width="4" height="9" fill="#5d2213"/><circle cx="7" cy="-19" r="3" fill="rgba(255,255,255,.55)"/></symbol>
<symbol id="kl-sheep" overflow="visible"><ellipse cx="0" cy="8" rx="10" ry="2.6" fill="rgba(0,0,0,.2)"/><g stroke="#3b3b3b" stroke-width="1.8" stroke-linecap="round"><path d="M-5,3 V8 M4,3 V8"/></g><ellipse cx="-1" cy="-1" rx="9.5" ry="6.5" fill="#fff" stroke="#d9d9d9"/><circle cx="-6" cy="-4" r="3" fill="#fff"/><circle cx="2" cy="-5" r="3.4" fill="#fff"/><ellipse cx="9" cy="-3" rx="3.6" ry="3" fill="#3b3b3b"/><circle cx="10" cy="-4" r=".8" fill="#fff"/></symbol>
<symbol id="kl-grass" overflow="visible"><path d="M-6,6 Q-5,-2 -8,-6 M-2,6 Q-1,-4 0,-9 M2,6 Q3,-2 7,-6" stroke="#4f9e2d" stroke-width="2" fill="none" stroke-linecap="round"/></symbol>
<symbol id="kl-wheat" overflow="visible"><path d="M-6,10 Q-5,0 -7,-10 M0,10 V-13 M6,10 Q5,0 7,-10" stroke="#a87b10" stroke-width="1.5" fill="none"/><g fill="#d49b12"><ellipse cx="-7" cy="-9" rx="2" ry="3.5"/><ellipse cx="-6" cy="-3" rx="2" ry="3"/><ellipse cx="0" cy="-12" rx="2" ry="3.5"/><ellipse cx="0" cy="-6" rx="2" ry="3"/><ellipse cx="7" cy="-9" rx="2" ry="3.5"/><ellipse cx="6" cy="-3" rx="2" ry="3"/></g><rect x="-8" y="4" width="16" height="2.4" rx="1" fill="#7c5a0c"/></symbol>
<symbol id="kl-mount" overflow="visible"><ellipse cx="1" cy="10" rx="15" ry="3" fill="rgba(0,0,0,.22)"/><path d="M-15,10 L-4,-12 L3,-1 L7,-7 L17,10 Z" fill="#5d6477"/><path d="M-4,-12 L3,-1 L1,10 L17,10 L7,-7 L3,-1 Z" fill="#4a5063"/><path d="M-4,-12 L-8,-4 L-4,-6 L-1,-3 L1,-6 Z" fill="#fff"/><path d="M7,-7 L5,-3 L8,-4 L10,-2 Z" fill="#fff"/></symbol>
<symbol id="kl-dune" overflow="visible"><path d="M-16,8 Q-6,-6 4,4 Q10,-2 16,8 Z" fill="#d7ad64"/><path d="M-16,8 Q-6,-6 4,4" stroke="#f3dca5" stroke-width="1.5" fill="none"/></symbol>
<symbol id="kl-cactus" overflow="visible"><ellipse cx="0" cy="11" rx="7" ry="2" fill="rgba(0,0,0,.2)"/><rect x="-3" y="-12" width="6" height="23" rx="3" fill="#3f9a4a"/><path d="M-3,0 H-7 V-6" stroke="#3f9a4a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M3,-3 H7 V-9" stroke="#3f9a4a" stroke-width="4" fill="none" stroke-linecap="round"/></symbol>
<symbol id="kl-skull" overflow="visible"><circle cx="0" cy="-1" r="5" fill="#f4ead2"/><rect x="-3" y="2" width="6" height="4" rx="1" fill="#f4ead2"/><circle cx="-2" cy="-1" r="1.3" fill="#7a6a4a"/><circle cx="2" cy="-1" r="1.3" fill="#7a6a4a"/></symbol>`;
const TERR_G = { 0: ['#3fae5c', '#23803f'], 1: ['#e2855a', '#b85433'], 2: ['#a6e06a', '#6fb93e'], 3: ['#f7d65a', '#e2aa22'], 4: ['#b3b9c8', '#7d849a'], '-1': ['#f1d9a2', '#d9b46e'] };
function staticSVG(v) {
  const G = gs(v), b = G.box;
  let defs = `<defs>${SYM}<radialGradient id="kl-seag" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#3aa7e8"/><stop offset=".65" stop-color="#1f74c2"/><stop offset="1" stop-color="#134a8a"/></radialGradient>
    <pattern id="kl-wave" width="46" height="26" patternUnits="userSpaceOnUse"><path d="M2,14 q6,-6 12,0 t12,0" stroke="rgba(255,255,255,.16)" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M25,4 q5,-4 10,0" stroke="rgba(255,255,255,.1)" stroke-width="1.6" fill="none" stroke-linecap="round"/></pattern>`;
  Object.entries(TERR_G).forEach(([k, [a, c]]) => { defs += `<linearGradient id="kl-g${k}" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${c}"/></linearGradient>`; });
  defs += '</defs>';
  let sea = `<rect x="${b.x - 2000}" y="${b.y - 2000}" width="${b.w + 4000}" height="${b.h + 4000}" fill="#134a8a"/><rect x="${b.x - 60}" y="${b.y - 60}" width="${b.w + 120}" height="${b.h + 120}" fill="url(#kl-seag)"/><rect x="${b.x - 2000}" y="${b.y - 2000}" width="${b.w + 4000}" height="${b.h + 4000}" fill="url(#kl-wave)"/>`;
  let foam = '', sand = '', tiles = '', toks = '', ports = '';
  G.H.forEach((h, i) => {
    foam += `<polygon points="${hexPts(h.x, h.y, 1.24)}" fill="rgba(255,255,255,.14)"/>`;
    sand += `<polygon points="${hexPts(h.x, h.y, 1.12)}" fill="#efd79c" stroke="#efd79c" stroke-width="6" stroke-linejoin="round"/>`;
  });
  v.hexes.forEach((t, i) => {
    const h = G.H[i], k = String(t.res);
    tiles += `<g class="kl-hex" data-h="${i}"><polygon points="${hexPts(h.x, h.y, .97)}" fill="url(#kl-g${k})" stroke="rgba(40,20,0,.35)" stroke-width="2.2" stroke-linejoin="round"/>`;
    tiles += `<polygon points="${hexPts(h.x, h.y, .86)}" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1.5"/>`;
    (DECO[k] || []).forEach(([s, dx, dy, sc]) => { tiles += `<use href="#kl-${s}" transform="translate(${(h.x + dx).toFixed(1)},${(h.y + dy).toFixed(1)}) scale(${sc})"/>`; });
    tiles += '</g>';
    if (t.num) {
      const red = t.num === 6 || t.num === 8, pp = PIPS[t.num];
      toks += `<g class="kl-tok${red ? ' red' : ''}" transform="translate(${h.x.toFixed(1)},${h.y.toFixed(1)})"><circle r="19.5" fill="#fbf1d6" stroke="#7a5a33" stroke-width="2.2"/><circle r="16" fill="none" stroke="rgba(122,90,51,.25)" stroke-width="1"/>
        <text y="${red ? 5.5 : 5}" text-anchor="middle" font-size="${red ? 19 : 17}" font-weight="900" fill="${red ? '#c8102e' : '#3a2410'}">${t.num}</text>
        ${Array.from({ length: pp }, (_, k2) => `<circle cx="${((k2 - (pp - 1) / 2) * 3.6).toFixed(1)}" cy="12.5" r="1.45" fill="${red ? '#c8102e' : '#3a2410'}"/>`).join('')}</g>`;
    }
  });
  v.ports.forEach((pt, i) => {
    const e = G.E[pt.e], pos = G.portPos[i], A = G.V[e.a], B = G.V[e.b];
    const lbl = pt.k < 0 ? '3:1' : '2:1', ic = pt.k < 0 ? '⚓' : RES[pt.k].ic;
    ports += `<g class="kl-port">${[A, B].map(q => `<line x1="${q.x.toFixed(1)}" y1="${q.y.toFixed(1)}" x2="${(pos.x * .55 + q.x * .45).toFixed(1)}" y2="${(pos.y * .55 + q.y * .45).toFixed(1)}" stroke="#7a4b22" stroke-width="5" stroke-linecap="round"/><line x1="${q.x.toFixed(1)}" y1="${q.y.toFixed(1)}" x2="${(pos.x * .55 + q.x * .45).toFixed(1)}" y2="${(pos.y * .55 + q.y * .45).toFixed(1)}" stroke="#c48a4f" stroke-width="2" stroke-dasharray="3 3"/>`).join('')}
      <circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="17" fill="${pt.k < 0 ? '#fff7e6' : RES[pt.k].c}" stroke="#6b3f18" stroke-width="2.5"/>
      <text x="${pos.x.toFixed(1)}" y="${(pos.y + 5).toFixed(1)}" text-anchor="middle" font-size="15">${ic}</text>
      <rect x="${(pos.x - 13).toFixed(1)}" y="${(pos.y + 13).toFixed(1)}" width="26" height="13" rx="6.5" fill="#2a1650" stroke="#fff" stroke-width="1"/><text x="${pos.x.toFixed(1)}" y="${(pos.y + 23).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="900" fill="#fff">${lbl}</text></g>`;
  });
  return `${defs}<g>${sea}</g><g>${foam}</g><g>${sand}</g><g>${ports}</g><g>${tiles}</g><g class="kl-hits"></g><g>${toks}</g>`;
}

/* ---------- SVG: hareketli katman ---------- */
function roadSVG(G, e, col, cls) {
  const ed = G.E[e], A = G.V[ed.a], B = G.V[ed.b], k = .17;
  const x1 = A.x + (B.x - A.x) * k, y1 = A.y + (B.y - A.y) * k, x2 = B.x - (B.x - A.x) * k, y2 = B.y - (B.y - A.y) * k;
  const c = `x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"`;
  return `<g class="kl-road ${cls || ''}" data-e="${e}"><line ${c} stroke="#1a0f2e" stroke-width="12" stroke-linecap="round"/><line ${c} stroke="${col}" stroke-width="7.5" stroke-linecap="round"/><line ${c} stroke="rgba(255,255,255,.45)" stroke-width="2" stroke-linecap="round" transform="translate(-1,-1.5)"/></g>`;
}
function bldSVG(G, v, lvl, col, cls) {
  const p = G.V[v];
  if (lvl === 2) return `<g class="kl-bld city ${cls || ''}" transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)})"><g class="kl-bi"><ellipse cx="0" cy="13" rx="16" ry="4" fill="rgba(0,0,0,.35)"/><path d="${CASTLE}" fill="${col}" stroke="#1a0f2e" stroke-width="2.6" stroke-linejoin="round"/><path d="M-1,-18 H15 V12 H5 Z" fill="rgba(0,0,0,.14)"/><path d="M3,12 V5 a4,4 0 0 1 8,0 V12 Z" fill="#1a0f2e"/><rect x="-12" y="-1" width="4" height="5" rx="1" fill="#1a0f2e"/><path d="M5,-18 V-26 L11,-23.5 L5,-21" fill="#fff" stroke="#1a0f2e" stroke-width="1.2"/></g></g>`;
  return `<g class="kl-bld ${cls || ''}" transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)})"><g class="kl-bi"><ellipse cx="0" cy="11" rx="11" ry="3.4" fill="rgba(0,0,0,.35)"/><path d="${HOUSE}" fill="${col}" stroke="#1a0f2e" stroke-width="2.4" stroke-linejoin="round"/><path d="M0,-12 L10,-2 V10 H0 Z" fill="rgba(0,0,0,.15)"/><rect x="-3" y="3" width="6" height="7" fill="#1a0f2e"/></g></g>`;
}
const ROBBER = '<g class="kl-robi"><ellipse cx="0" cy="13" rx="13" ry="4" fill="rgba(0,0,0,.4)"/><path d="M-11,13 C-11,-1 -8,-7 0,-7 C8,-7 11,-1 11,13 Z" fill="#2b2440" stroke="#0d0818" stroke-width="2"/><circle cy="-13" r="8.5" fill="#2b2440" stroke="#0d0818" stroke-width="2"/><rect x="-8" y="-16" width="16" height="4.5" rx="2" fill="#ff3b5c"/><circle cx="-3" cy="-13.8" r="1.4" fill="#fff"/><circle cx="3" cy="-13.8" r="1.4" fill="#fff"/><path d="M-6,4 Q0,8 6,4" stroke="#544a72" stroke-width="2" fill="none"/></g>';
function targets(v) {
  const a = actor(v); if (a < 0) return null;
  if (v.phase === 'setup') { const su = v.setup; if (!su || su.order[su.idx] !== a) return null; return su.step === 'v' ? { k: 'setl', ids: validSetls(v, a, true) } : { k: 'road', ids: validRoads(v, a, su.lastV) }; }
  if (a !== v.cur) return null;
  if (v.phase === 'robber') return { k: 'robber', ids: v.hexes.map((_, h) => h).filter(h => h !== v.robber) };
  if (v.phase === 'roadBuild') return { k: 'road', ids: validRoads(v, a) };
  if (v.phase === 'main' && mode) {
    const p = v.players[a];
    if (mode === 'road' && p.left.road && has(p.hand, COST.road)) return { k: 'road', ids: validRoads(v, a) };
    if (mode === 'setl' && p.left.setl && has(p.hand, COST.setl)) return { k: 'setl', ids: validSetls(v, a) };
    if (mode === 'city' && p.left.city && has(p.hand, COST.city)) return { k: 'city', ids: validCities(v, a) };
  }
  return null;
}
function renderDyn(v) {
  const G = gs(v), tg = targets(v);
  let roads = '', blds = '', spots = '', over = '';
  v.eOwn.forEach((o, e) => { if (o >= 0) roads += roadSVG(G, e, v.players[o].color, E.newE === e ? 'new' : ''); });
  v.vOwn.forEach((o, i) => { if (o >= 0) blds += bldSVG(G, i, v.vLvl[i], v.players[o].color, E.newV === i ? 'new' : ''); });
  const rh = G.H[v.robber];
  over = `<polygon points="${hexPts(rh.x, rh.y, .95)}" fill="rgba(18,6,40,.42)" class="kl-dark"/>`;
  if (tg) {
    const me = actor(v), col = v.players[me].color;
    if (tg.k === 'road') tg.ids.forEach(e => { const ed = G.E[e]; spots += `<line class="kl-espot" x1="${G.V[ed.a].x.toFixed(1)}" y1="${G.V[ed.a].y.toFixed(1)}" x2="${G.V[ed.b].x.toFixed(1)}" y2="${G.V[ed.b].y.toFixed(1)}"/>`; });
    else if (tg.k === 'setl' || tg.k === 'city') tg.ids.forEach(i => { const p = G.V[i]; spots += `<circle class="kl-vspot ${tg.k}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${tg.k === 'city' ? 19 : 11}"/>`; });
    else if (tg.k === 'robber') tg.ids.forEach(h => { const hx = G.H[h]; spots += `<polygon class="kl-hspot" points="${hexPts(hx.x, hx.y, .9)}"/>`; });
    if (sel && sel.k === tg.k && tg.ids.includes(sel.id)) {
      if (sel.k === 'road') spots += roadSVG(G, sel.id, col, 'ghost');
      else if (sel.k === 'setl') spots += bldSVG(G, sel.id, 1, col, 'ghost');
      else if (sel.k === 'city') spots += bldSVG(G, sel.id, 2, col, 'ghost');
      else if (sel.k === 'robber') { const hx = G.H[sel.id]; spots += `<polygon class="kl-hsel" points="${hexPts(hx.x, hx.y, .93)}"/><g transform="translate(${(hx.x - 30).toFixed(1)},${(hx.y + 2).toFixed(1)})" opacity=".55">${ROBBER}</g>`; }
    } else if (sel) sel = null;
  } else sel = null;
  const h = over + roads;
  if (E.gRoads.dataset.h !== h) { E.gRoads.innerHTML = h; E.gRoads.dataset.h = h; }
  if (E.gBld.dataset.h !== blds) { E.gBld.innerHTML = blds; E.gBld.dataset.h = blds; }
  if (E.gSpots.dataset.h !== spots) { E.gSpots.innerHTML = spots; E.gSpots.dataset.h = spots; }
  E.newE = -1; E.newV = -1;
  // haydut
  const tx = rh.x - 30, ty = rh.y + 2;
  if (lastRob !== v.robber) {
    const hop = lastRob >= 0 && !firstRender;
    lastRob = v.robber;
    E.rob.style.transition = hop ? 'transform .75s cubic-bezier(.4,.1,.3,1)' : 'none';
    E.rob.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`;
    const inner = E.rob.firstElementChild;
    if (hop && inner && inner.animate) inner.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-46px) scale(1.25)', offset: .45 }, { transform: 'translateY(2px) scale(1.15,.85)', offset: .85 }, { transform: 'translateY(0) scale(1)' }], { duration: 800, easing: 'ease-out' });
  }
  root.querySelector('.kl').classList.toggle('picking', !!tg);
}

/* ---------- kamera ---------- */
function vpSize() { const r = E.vp.getBoundingClientRect(); return [r.width || 1, r.height || 1]; }
const boxOf = () => (V ? gs(V).box : geo(false).box);
const fitScale = () => { const [w, h] = vpSize(), b = boxOf(); return Math.min(w / b.w, h / b.h); };
function clampCam() {
  const [w, h] = vpSize(), b = boxOf(), sw = b.w * cam.s, sh = b.h * cam.s, m = 30;
  cam.x = sw <= w ? (w - sw) / 2 : Math.min(m, Math.max(w - sw - m, cam.x));
  cam.y = sh <= h ? (h - sh) / 2 : Math.min(m, Math.max(h - sh - m, cam.y));
}
function applyCam(ms) {
  if (!E.board) return;
  clampCam();
  E.board.style.transition = ms ? `transform ${ms}ms cubic-bezier(.25,.8,.3,1)` : 'none';
  E.board.style.transform = `translate(${cam.x.toFixed(1)}px, ${cam.y.toFixed(1)}px) scale(${cam.s.toFixed(4)})`;
  root.querySelector('.kl').classList.toggle('zoomed', cam.s > fitScale() * 1.02);
}
function camFit(ms) { cam.s = fitScale(); cam.x = 0; cam.y = 0; applyCam(ms); }
function zoomAt(f, mx, my, ms) {
  const s = Math.max(fitScale(), Math.min(fitScale() * 3.2, cam.s * f));
  const bx = (mx - cam.x) / cam.s, by = (my - cam.y) / cam.s;
  cam.s = s; cam.x = mx - bx * s; cam.y = my - by * s; applyCam(ms);
}
function toBoard(cx, cy) { const r = E.vp.getBoundingClientRect(), b = boxOf(); return [(cx - r.left - cam.x) / cam.s + b.x, (cy - r.top - cam.y) / cam.s + b.y]; }
function toScreen(x, y) { const r = E.vp.getBoundingClientRect(), b = boxOf(); return [r.left + cam.x + (x - b.x) * cam.s, r.top + cam.y + (y - b.y) * cam.s]; }
function onResize() { clearTimeout(resizeT); resizeT = setTimeout(() => { if (!root || !cam) return; const was = cam.s <= fitScale() * 1.05; if (was) camFit(0); else applyCam(0); }, 80); }
function onPointerDown(e) {
  if (e.target.closest('.kl-vpctl, .kl-tray')) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) { drag = { sx: e.clientX, sy: e.clientY, x0: cam.x, y0: cam.y }; moved = false; }
  else if (pointers.size === 2) { const [a, b] = [...pointers.values()]; drag = { pinch: true, d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, x0: cam.x, y0: cam.y, s0: cam.s }; }
}
function onPointerMove(e) {
  if (!pointers.has(e.pointerId) || !drag) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const r = E.vp.getBoundingClientRect();
  if (drag.pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const s = Math.max(fitScale(), Math.min(fitScale() * 3.2, drag.s0 * d / drag.d0));
    const mx = drag.mx - r.left, my = drag.my - r.top, bx = (mx - drag.x0) / drag.s0, by = (my - drag.y0) / drag.s0;
    cam.s = s; cam.x = mx - bx * s; cam.y = my - by * s; moved = true; applyCam(0); return;
  }
  const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if (!moved && Math.hypot(dx, dy) < 8) return;
  if (cam.s <= fitScale() * 1.01) return;
  moved = true; cam.x = drag.x0 + dx; cam.y = drag.y0 + dy; applyCam(0);
}
function onPointerUp(e) {
  pointers.delete(e.pointerId);
  if (pointers.size === 0) drag = null;
  else if (pointers.size === 1) { const [p] = [...pointers.values()]; drag = { sx: p.x, sy: p.y, x0: cam.x, y0: cam.y }; }
}
function onWheel(e) { if (!cam) return; e.preventDefault(); const r = E.vp.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top, 0); }

/* ---------- 3B zarlar ---------- */
function cubeHTML() {
  return `<div class="kl-dw"><i class="kl-dsh"></i><div class="kl-tilt"><div class="kl-cube">${[1, 2, 3, 4, 5, 6].map(f => `<div class="kl-face" style="transform:${FACE_TF[f]} translateZ(var(--dh))"><span class="pips">${Array.from({ length: 9 }, (_, k) => `<i class="${DPIPS[f].includes(k) ? 'on' : ''}"></i>`).join('')}</span></div>`).join('')}</div></div></div>`;
}
function restDice(vals) { E.cubes.forEach((c, k) => { const [rx, ry] = FACE_ROT[vals[k] || 1]; c.getAnimations && c.getAnimations().forEach(a => a.cancel()); c.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; }); }
function clack(g) { try { if (Sound.ok && Sound.ok('klclack', 45)) { Sound.noise(.05, { freq: 2600, q: 1.2, gain: .55 * g }); Sound.tone(150 + Math.random() * 60, .07, { type: 'triangle', gain: .18 * g }); } } catch (e) { /* ses yok */ } }
let trayT = 0;
function rollDice(vals) {
  clearTimeout(trayT); E.tray.classList.add('big'); trayT = setTimeout(() => { if (E.tray) E.tray.classList.remove('big'); }, 1900);
  E.tray.classList.remove('seven', 'rest'); E.tray.classList.add('rolling');
  const D = 1150;
  E.cubes.forEach((c, k) => {
    const [fx, fy] = FACE_ROT[vals[k] || 1];
    const sx = (Math.random() < .5 ? -1 : 1) * (2 + rint(0, 1)) * 360, sy = (Math.random() < .5 ? -1 : 1) * (2 + rint(0, 1)) * 360;
    const kf = (p, o, ez) => ({ transform: `rotateX(${(fx - sx * (1 - p)).toFixed(1)}deg) rotateY(${(fy - sy * (1 - p)).toFixed(1)}deg)`, offset: o, easing: ez });
    c.style.transform = `rotateX(${fx}deg) rotateY(${fy}deg)`;
    if (c.animate) c.animate([kf(0, 0, 'linear'), kf(.62, .36, 'ease-out'), kf(.9, .64, 'ease-out'), kf(.985, .86, 'ease-out'), kf(1, 1)], { duration: D + k * 70, easing: 'linear' });
    const dir = k % 2 ? 1 : -1, ox = dir * (80 + rint(0, 40)), oy = -(60 + rint(0, 40));
    if (E.dws[k].animate) E.dws[k].animate([
      { transform: `translate(${ox}px, ${oy}px) scale(.55)`, easing: 'cubic-bezier(.5,0,.9,.6)' },
      { transform: `translate(${ox * .25}px, 0) scale(1)`, offset: .36, easing: 'cubic-bezier(.2,.6,.4,1)' },
      { transform: `translate(${ox * .1}px, -26px) scale(1.04)`, offset: .5, easing: 'cubic-bezier(.6,0,.9,.5)' },
      { transform: `translate(${ox * .04}px, 0) scale(1)`, offset: .64, easing: 'cubic-bezier(.2,.6,.4,1)' },
      { transform: 'translate(0, -8px) scale(1.01)', offset: .75, easing: 'cubic-bezier(.6,0,.9,.5)' },
      { transform: 'translate(0, 0) scale(1)', offset: .86 }, { transform: 'translate(0, 0) scale(1)' }], { duration: D + k * 70 });
    [.36, .64, .86].forEach((o, j) => setTimeout(() => clack(1 - j * .3), (D + k * 70) * o));
  });
  setTimeout(() => {
    if (!root) return;
    E.tray.classList.remove('rolling'); E.tray.classList.add('rest');
    E.tray.classList.toggle('seven', vals[0] + vals[1] === 7);
    E.dlab.textContent = diceLabel(vals);
  }, D + 160);
}
const diceLabel = d => `${d[0]} + ${d[1]} = ${d[0] + d[1]}${d[0] + d[1] === 7 ? ' · HAYDUT!' : ''}`;
function renderDice(v) {
  if (v.phase === 'rolling' && v.rollN !== diceN) { diceN = v.rollN; E.dlab.textContent = 'Zarlar yuvarlanıyor…'; rollDice(v.dice); return; }
  if (diceN !== v.rollN) {
    diceN = v.rollN; restDice(v.dice); E.tray.classList.add('rest');
    E.tray.classList.toggle('seven', v.rollN > 0 && v.dice[0] + v.dice[1] === 7);
    E.dlab.textContent = v.rollN > 0 ? diceLabel(v.dice) : 'Zar bekleniyor';
  }
  E.tray.classList.toggle('glow', myTurn(v) && v.phase === 'roll');
}

/* ---------- oyuncular ---------- */
function renderPlayers(v) {
  const me = viewerPi(v);
  const h = v.players.map((p, i) => {
    const act = (v.phase === 'setup' ? v.turn === i : i === v.cur) && v.phase !== 'over';
    const pend = (v.phase === 'discard' && v.discard && v.discard.need[i] != null) || (v.phase === 'trade' && v.trade && v.trade.resp[i] == null);
    const vp = p.vpT != null && i === me ? `${p.vp}${p.vpT > p.vp ? `<sup>+${p.vpT - p.vp}</sup>` : ''}` : p.vp;
    const badges = (v.longest.pi === i ? '<i class="kl-bdg road" title="En Uzun Yol">🛣️</i>' : '') + (v.army.pi === i ? '<i class="kl-bdg army" title="En Büyük Ordu">🛡️</i>' : '');
    return `<button type="button" class="kl-pl ${act ? 'active' : ''} ${pend ? 'pend' : ''} ${p.online === false && !p.isBot ? 'off' : ''} ${v.winner === i ? 'win' : ''}" style="--pc:${p.color}" data-a="pinfo" data-pi="${i}" aria-label="${esc(p.name)}">
      <span class="av" style="--pc:${p.color}">${p.isBot ? '🤖' : initial(p.name)}</span>
      <span class="kl-pt"><b>${esc(p.isBot ? p.name.replace(/^Bilgisayar/, "Bot") : p.name)}${ui.mode === 'online' && ui.me === i ? ' <em>sen</em>' : ''}</b>
      <small><span title="Kaynak kartı">🂠${p.n}</span><span title="Gelişim kartı">🃏${p.devN}</span>${p.knights ? `<span title="Şövalye">⚔️${p.knights}</span>` : ''}<span title="En uzun yolu" class="${p.roadLen >= 5 ? 'hi' : ''}">🛤️${p.roadLen}</span></small></span>
      <span class="kl-zp" title="Zafer puanı"><b>${vp}</b><small>ZP</small></span>${badges ? `<span class="kl-bdgs">${badges}</span>` : ''}${p.online === false && !p.isBot ? '<i class="kl-offl">📴</i>' : ''}</button>`;
  }).join('');
  E.pl.className = 'kl-players n' + v.players.length;
  if (E.pl.innerHTML !== h) E.pl.innerHTML = h;
}

/* ---------- el, gelişim kartları, inşaat menüsü ---------- */
function renderHand(v) {
  const me = viewerPi(v), p = me >= 0 ? v.players[me] : null;
  let h;
  if (!p || !p.hand) h = `<div class="kl-hhead"><b>İzleyici</b><small>Oyuncuların elleri gizli</small></div>`;
  else {
    const rates = ratesOf(v, me), dn = p.dev.length, play = playableDev(v, me).length && myTurn(v) && (v.phase === 'main' || v.phase === 'roll');
    h = `<div class="kl-hhead"><b>${ui.mode === 'local' && humans(v).length > 1 ? `${esc(p.name)} · elin` : 'Elin'}</b><small>${p.n} kart${p.n > 7 ? ' · <em>7’den fazla!</em>' : ''}</small></div>
      <div class="kl-cards">${RES.map((r, i) => `<div class="kl-card r${i} ${p.hand[i] ? '' : 'zero'}" data-r="${i}"><i>${r.ic}</i><b>${p.hand[i]}</b><small>${r.n}</small>${rates[i] < 4 ? `<em>${rates[i]}:1</em>` : ''}</div>`).join('')}
      <button type="button" class="kl-card dev ${dn ? '' : 'zero'} ${play ? 'can' : ''}" data-a="devs"><i>🃏</i><b>${dn}</b><small>Gelişim</small></button></div>`;
  }
  if (E.hand.innerHTML !== h) {
    E.hand.innerHTML = h;
    if (p && p.hand && lastHand && lastHand.pi === me) p.hand.forEach((n, i) => { if (n > lastHand.h[i]) { const c = E.hand.querySelector(`.kl-card[data-r="${i}"]`); if (c) { c.classList.add('bump'); } } });
  }
  lastHand = p && p.hand ? { pi: me, h: p.hand.slice() } : null;
}
function buildState(v, k) {
  const a = actor(v), p = v.players[a];
  if (!myTurn(v) || v.phase !== 'main') return { ok: false, why: '' };
  if (k === 'dev') return { ok: v.deckN > 0 && has(p.hand, COST.dev), why: v.deckN ? '' : 'Deste bitti' };
  const left = p.left[k]; if (!left) return { ok: false, why: 'Parça kalmadı' };
  if (!has(p.hand, COST[k])) return { ok: false, why: '' };
  const n = k === 'road' ? validRoads(v, a).length : k === 'setl' ? validSetls(v, a).length : validCities(v, a).length;
  return { ok: n > 0, why: n ? '' : 'Uygun yer yok' };
}
function renderBuild(v) {
  const a = actor(v), p = a >= 0 ? v.players[a] : (viewerPi(v) >= 0 ? v.players[viewerPi(v)] : null);
  const h = ['road', 'setl', 'city', 'dev'].map(k => {
    const s = buildState(v, k), left = p ? (k === 'dev' ? v.deckN : p.left[k]) : '';
    return `<button type="button" class="kl-bb ${mode === k ? 'on' : ''}" data-a="build" data-k="${k}" ${s.ok ? '' : 'disabled'}><span class="ic">${BICON[k]}</span><span class="tx"><b>${BNAME[k] === 'Gelişim kartı' ? 'Kart' : BNAME[k]}</b><span class="cost">${costHTML(COST[k])}</span></span><span class="left">${left}</span>${s.why ? `<small>${s.why}</small>` : ''}</button>`;
  }).join('');
  if (E.build.innerHTML !== h) E.build.innerHTML = h;
  E.build.classList.toggle('dim', !(myTurn(v) && v.phase === 'main'));
}

/* ---------- HUD ---------- */
function bar(key) { return `<div class="kl-bar"><i data-dl="${key}"></i><em data-sec="${key}"></em></div>`; }
function tradeLine(v, t, k) {
  const r = t.resp[k], q = v.players[k];
  let st = '<span class="wait">bekliyor…</span>', btn = '';
  if (r && r.r === 'acc') st = '<span class="okk">✅ kabul</span>';
  if (r && r.r === 'no') st = `<span class="nok">❌ ret${r.auto ? ' (süre)' : ''}</span>`;
  if (r && r.r === 'ctr') st = `<span class="ctr">🔁 karşı: verir ${cardsHTML(r.give)} ister ${cardsHTML(r.get)}</span>`;
  const mine = ui.mode === 'local' ? !v.players[t.from].isBot : ui.me === t.from;
  if (mine && r && (r.r === 'acc' || r.r === 'ctr')) {
    const terms = r.r === 'ctr' ? { give: r.get, get: r.give } : { give: t.give, get: t.get };
    btn = `<button type="button" class="btn btn-spin sm" data-a="pick" data-pi="${k}" ${has(v.players[t.from].hand || [9, 9, 9, 9, 9], terms.give) ? '' : 'disabled'}>Seç ✓</button>`;
  }
  return `<div class="kl-tl" style="--pc:${q.color}"><span class="av" style="--pc:${q.color}">${q.isBot ? '🤖' : initial(q.name)}</span><b>${esc(q.name)}</b>${st}${btn}</div>`;
}
function hudHTML(v) {
  const a = actor(v), cp = v.players[v.cur], tp = v.turn != null ? v.players[v.turn] : cp, pl = pendingLocal(v);
  const multi = ui.mode === 'local' && humans(v).length > 1;
  let turn, msg = `<p class="kl-msg">${esc(v.msg || '')}</p>`, acts = [];
  if (v.phase === 'over') turn = `<span class="kl-turn over">🏆 ${esc(v.players[v.winner].name)} kazandı!</span>`;
  else if (pl >= 0) turn = `<span class="kl-turn mine"><span class="av" style="--pc:${v.players[pl].color}">${initial(v.players[pl].name)}</span>${multi ? esc(v.players[pl].name) + ', ' : ''}${v.phase === 'discard' ? 'kart at!' : 'takas teklifi!'}</span>`;
  else if (v.phase === 'trade' && (ui.mode === 'local' ? !v.players[v.trade.from].isBot : ui.me === v.trade.from)) turn = `<span class="kl-turn mine"><span class="av" style="--pc:${v.players[v.trade.from].color}">${initial(v.players[v.trade.from].name)}</span>Teklifin: yanıt bekleniyor</span>`;
  else if (a >= 0 && (a === v.cur || v.phase === 'setup')) turn = `<span class="kl-turn mine"><span class="av" style="--pc:${v.players[a].color}">${initial(v.players[a].name)}</span>${multi ? `${esc(v.players[a].name)}, sıra sende` : 'Sıra sende'}</span>`;
  else if (v.turn == null) turn = `<span class="kl-turn"><span class="av" style="--pc:${cp.color}">${initial(cp.name)}</span>Sıra: <b style="color:${cp.color}">${esc(cp.name)}</b></span>`;
  else turn = `<span class="kl-turn"><span class="av" style="--pc:${tp.color}">${tp.isBot ? '🤖' : initial(tp.name)}</span>Sıra: <b style="color:${tp.color}">${esc(tp.name)}</b>${tp.isBot ? ' <i class="think">düşünüyor</i>' : ''}</span>`;
  const top = `${turn}<span class="kl-meta"><span title="Hedef">🏁${v.target}</span><span title="Deste">🃏${v.deckN}</span></span>`;
  const mine = a >= 0 && a === v.cur;
  const confirm = () => { if (sel && !fine()) acts.push(`<button type="button" class="btn btn-spin" data-a="confirm">✓ ${sel.k === 'robber' ? 'Haydudu buraya koy' : `${BNAME[sel.k]} kur`}</button>`, '<button type="button" class="btn btn-ghost" data-a="unsel">✕ Vazgeç</button>'); };
  switch (v.phase) {
    case 'setup':
      if (a >= 0) { const su = v.setup; msg = `<p class="kl-msg hint">${su.step === 'v' ? `🏠 ${su.idx >= v.players.length ? 'İkinci' : 'İlk'} köyünü yerleştir: parlayan noktalardan birine dokun.${su.idx >= v.players.length ? ' Değdiği araziler başlangıç kaynağı verir.' : ''}` : '🛤️ Köyüne bağlı bir yol yerleştir.'}</p>`; confirm(); }
      break;
    case 'roll':
      if (mine) {
        acts.push('<button type="button" class="btn btn-spin big" data-a="roll">🎲 ZAR AT</button>');
        if (playableDev(v, a).includes('sov')) acts.push('<button type="button" class="btn btn-vowel" data-a="play" data-k="sov">⚔️ Önce Şövalye</button>');
        msg = '<p class="kl-msg hint">Zar at: değen arazilerin üretimi herkese dağıtılır.</p>';
      }
      break;
    case 'rolling': msg = `<p class="kl-msg">${esc(cp.name)} zar atıyor…</p>`; break;
    case 'robber': if (mine) { msg = '<p class="kl-msg hint">🥷 Haydudu taşı: parlayan bir araziye dokun. O arazi üretim yapamaz ve oradaki bir rakipten kart çalarsın.</p>'; confirm(); } break;
    case 'steal':
      if (mine) { msg = '<p class="kl-msg hint">Kimden kart çalacaksın?</p>'; v.victims.forEach(i => acts.push(`<button type="button" class="btn btn-solve" data-a="steal" data-pi="${i}" style="--pc:${v.players[i].color}">🥷 ${esc(v.players[i].name)} <small>${v.players[i].n} kart</small></button>`)); }
      break;
    case 'discard': {
      const pend = Object.keys(v.discard.need).map(Number);
      msg = `<p class="kl-msg">🥷 7 geldi! Kart atanlar: ${pend.map(i => `<b style="color:${v.players[i].color}">${esc(v.players[i].name)}</b> (${v.discard.need[i]})`).join(', ')}</p>${bar('disc')}`;
      break;
    }
    case 'roadBuild': if (mine) { msg = `<p class="kl-msg hint">🛤️ Bedava yol: ${v.freeRoads} kaldı. Parlayan kenarlardan birine dokun.</p>`; confirm(); acts.push('<button type="button" class="btn btn-ghost" data-a="endRoads">Bitir</button>'); } break;
    case 'trade': {
      const t = v.trade, fp = v.players[t.from];
      msg = `<div class="kl-tsum"><div class="kl-thead"><span class="av" style="--pc:${fp.color}">${fp.isBot ? '🤖' : initial(fp.name)}</span><b>${esc(fp.name)} teklif ediyor</b></div>
        <div class="kl-tx"><span><small>verir</small>${cardsHTML(t.give)}</span><i>⇄</i><span><small>ister</small>${cardsHTML(t.get)}</span></div>
        <div class="kl-tls">${v.players.map((_, k) => (k === t.from ? '' : tradeLine(v, t, k))).join('')}</div>${bar('trade')}</div>`;
      const isMine = ui.mode === 'local' ? !fp.isBot && pl < 0 : ui.me === t.from;
      if (isMine) acts.push('<button type="button" class="btn btn-ghost" data-a="cancelTrade">↩️ Teklifi geri çek</button>');
      break;
    }
    case 'main':
      if (mine) {
        if (sel) confirm();
        else {
          msg = `<p class="kl-msg hint">${mode ? `${BICON[mode]} ${BNAME[mode]} için parlayan bir yere dokun.` : 'İnşa et, takas yap ya da gelişim kartı oyna. Bitince turu bitir.'}</p>`;
          acts.push(`<button type="button" class="btn btn-vowel" data-a="tradeOpen">🤝 Takas</button>`);
          acts.push('<button type="button" class="btn btn-spin" data-a="end">Turu bitir ➜</button>');
        }
      }
      break;
    default: break;
  }
  return { top, msg, acts: acts.length ? `<div class="kl-arow n${acts.length}">${acts.join('')}</div>` : '' };
}
function renderHud(v) {
  const { top, msg, acts } = hudHTML(v);
  if (E.hTop.innerHTML !== top) E.hTop.innerHTML = top;
  if (E.hMsg.innerHTML !== msg) E.hMsg.innerHTML = msg;
  if (E.hActs.innerHTML !== acts) E.hActs.innerHTML = acts;
  E.hActs.hidden = !acts;
}

/* ---------- modallar ---------- */
function stepRow(key, c, max, label) {
  return `<div class="kl-steps"><span class="lab">${label}</span>${RES.map((r, i) => `<div class="kl-st r${i}"><i>${r.ic}</i><b>${c[i]}</b>${key === 'disc' ? `<small>elde ${max[i]}</small>` : ''}<span><button type="button" data-a="st" data-s="${key}" data-r="${i}" data-d="-1" ${c[i] > 0 ? '' : 'disabled'} aria-label="${r.n} azalt">−</button><button type="button" data-a="st" data-s="${key}" data-r="${i}" data-d="1" ${c[i] < max[i] ? '' : 'disabled'} aria-label="${r.n} artır">+</button></span></div>`).join('')}</div>`;
}
function tradeEditorHTML(v) {
  const me = draft.counter ? draft.as : actor(v), p = v.players[me];
  const tabs = draft.counter ? '' : `<div class="kl-tabs"><button type="button" class="${draft.tab === 'bank' ? 'on' : ''}" data-a="tab" data-t="bank">🏦 Banka / Liman</button><button type="button" class="${draft.tab === 'pl' ? 'on' : ''}" data-a="tab" data-t="pl">🤝 Oyuncular</button></div>`;
  let body = '', foot = '';
  if (draft.tab === 'bank' && !draft.counter) {
    const rates = ratesOf(v, me);
    body = `<p class="kl-note">Vereceğin kaynağı seç (liman oranın), sonra alacağını seç.</p>
      <div class="kl-pick">${RES.map((r, i) => `<button type="button" class="kl-pk r${i} ${draft.bg === i ? 'on' : ''}" data-a="bg" data-r="${i}" ${p.hand[i] >= rates[i] ? '' : 'disabled'}><i>${r.ic}</i><b>${rates[i]}:1</b><small>${p.hand[i]} var</small></button>`).join('')}</div>
      <div class="kl-arr">⬇</div>
      <div class="kl-pick">${RES.map((r, i) => `<button type="button" class="kl-pk r${i} ${draft.bget === i ? 'on' : ''}" data-a="bget" data-r="${i}" ${i !== draft.bg && v.bank[i] > 0 ? '' : 'disabled'}><i>${r.ic}</i><b>+1</b><small>bankada ${v.bank[i]}</small></button>`).join('')}</div>`;
    const ok = draft.bg >= 0 && draft.bget >= 0 && draft.bg !== draft.bget && p.hand[draft.bg] >= rates[draft.bg] && v.bank[draft.bget] > 0;
    foot = `<button type="button" class="btn btn-spin" data-a="bankDo" ${ok ? '' : 'disabled'}>${ok ? `${rates[draft.bg]}${RES[draft.bg].ic} → 1${RES[draft.bget].ic} takas et` : 'Takas et'}</button><button type="button" class="btn btn-ghost" data-a="closeModal">Kapat</button>`;
  } else {
    const maxG = p.hand.slice(), maxW = [9, 9, 9, 9, 9];
    body = `${draft.counter ? `<p class="kl-note">Karşı teklifin: ne verip ne istediğini ayarla.</p>` : '<p class="kl-note">Teklif tüm oyunculara gider. Kabul edenlerden birini sen seçersin.</p>'}
      ${stepRow('give', draft.give, maxG, 'Veriyorum')}${stepRow('get', draft.get, maxW, 'İstiyorum')}`;
    const ok = sum5(draft.give) > 0 && sum5(draft.get) > 0 && has(p.hand, draft.give) && !draft.give.some((x, i) => x && draft.get[i]) && (draft.counter || v.tradesTurn < 6);
    foot = `<button type="button" class="btn btn-spin" data-a="offerDo" ${ok ? '' : 'disabled'}>📨 ${draft.counter ? 'Karşı teklifi gönder' : 'Teklifi gönder'}</button><button type="button" class="btn btn-ghost" data-a="closeModal">Vazgeç</button>`;
  }
  return `<div class="kl-mc kl-ted" role="dialog" aria-label="Takas"><button type="button" class="kl-x" data-a="closeModal" aria-label="Kapat">✕</button><div class="kl-mh"><span>🤝</span><b>${draft.counter ? 'Karşı teklif' : 'Takas'}</b></div>${tabs}<div class="kl-mb">${body}</div><div class="kl-mf">${foot}</div></div>`;
}
function devHTML(v) {
  const me = viewerPi(v), p = v.players[me], can = myTurn(v) && (v.phase === 'main' || v.phase === 'roll');
  const pl = playableDev(v, me);
  const cards = p.dev.length ? p.dev.map(d => {
    const D = DEV[d.k]; let st = '', btn = '';
    if (d.k === 'zp') st = 'Gizli puan: elinde kaldıkça sayılır';
    else if (d.nw) st = 'Yeni: bir sonraki turunda oynayabilirsin';
    else if (v.devPlayed) st = 'Bu tur zaten kart oynadın';
    else if (!can) st = 'Kendi turunda oynayabilirsin';
    if (d.k !== 'zp' && !d.nw && can && pl.includes(d.k) && !(v.phase === 'roll' && d.k !== 'sov')) btn = `<button type="button" class="btn btn-spin sm" data-a="play" data-k="${d.k}">Oyna</button>`;
    else if (d.k !== 'zp' && v.phase === 'roll' && can && !d.nw && !v.devPlayed) st = 'Zar attıktan sonra oynanır';
    return `<div class="kl-dc k-${d.k} ${d.nw ? 'nw' : ''}"><span class="ic">${D.ic}</span><span class="tx"><b>${D.n}</b><small>${D.d}</small>${st ? `<em>${st}</em>` : ''}</span>${btn}</div>`;
  }).join('') : '<p class="kl-note">Henüz gelişim kartın yok. 🐑🌾🪨 ile kart alabilirsin.</p>';
  return `<div class="kl-mc kl-devm" role="dialog" aria-label="Gelişim kartları"><button type="button" class="kl-x" data-a="closeModal" aria-label="Kapat">✕</button><div class="kl-mh"><span>🃏</span><b>Gelişim kartları</b></div><div class="kl-mb">${cards}
    <p class="kl-note">Turda en fazla 1 kart oynanır; aldığın turda oynanmaz. Destede ${v.deckN} kart kaldı.</p></div></div>`;
}
function pickerHTML(v) {
  const k = modal.k, sel2 = modal.sel || [];
  const n = k === 'bol' ? 2 : 1;
  const opts = RES.map((r, i) => `<button type="button" class="kl-pk r${i} ${sel2.filter(x => x === i).length ? 'on' : ''}" data-a="pk" data-r="${i}" ${k === 'bol' && v.bank[i] - sel2.filter(x => x === i).length <= 0 ? 'disabled' : ''}><i>${r.ic}</i><b>${r.n}</b>${sel2.filter(x => x === i).length > 1 ? '<small>×2</small>' : `<small>${k === 'bol' ? `bankada ${v.bank[i]}` : '&nbsp;'}</small>`}</button>`).join('');
  return `<div class="kl-mc" role="dialog"><button type="button" class="kl-x" data-a="closeModal" aria-label="Kapat">✕</button><div class="kl-mh"><span>${DEV[k].ic}</span><b>${DEV[k].n}</b></div><div class="kl-mb"><p class="kl-note">${k === 'bol' ? 'Bankadan alacağın 2 kaynağı seç (aynısından iki tane olabilir).' : 'Hangi kaynağın tamamını toplamak istiyorsun?'}</p><div class="kl-pick">${opts}</div>
    ${k === 'bol' ? `<p class="kl-note">Seçilen: ${sel2.map(i => RES[i].ic).join(' ') || '—'}</p>` : ''}</div>
    <div class="kl-mf"><button type="button" class="btn btn-spin" data-a="pkDo" ${sel2.length === n ? '' : 'disabled'}>${DEV[k].ic} Oyna</button><button type="button" class="btn btn-ghost" data-a="closeModal">Vazgeç</button></div></div>`;
}
function discardHTML(v, pi) {
  const p = v.players[pi], need = v.discard.need[pi];
  if (!E.disc || E.disc.pi !== pi || E.disc.n !== v.discard.n) E.disc = { pi, n: v.discard.n, c: zero() };
  const c = E.disc.c, got = sum5(c);
  return `<div class="kl-mc kl-disc" role="dialog" aria-label="Kart at"><div class="kl-mh bad"><span>🥷</span><b>Haydut geldi!</b></div><div class="kl-mb">
    ${ui.mode === 'local' && humans(v).length > 1 ? `<p class="kl-pass">Cihazı <b style="color:${p.color}">${esc(p.name)}</b> oyuncusuna ver.</p>` : ''}
    <p class="kl-note">Elinde ${p.n} kart var: <b>${need}</b> kart atmalısın.</p>
    ${stepRow('disc', c, p.hand, 'Atılacak')}
    <div class="kl-cnt ${got === need ? 'ok' : ''}">${got} / ${need}</div>${bar('disc')}</div>
    <div class="kl-mf"><button type="button" class="btn btn-solve" data-a="discDo" data-pi="${pi}" ${got === need ? '' : 'disabled'}>🗑️ ${need} kartı at</button><button type="button" class="btn btn-ghost" data-a="discAuto" data-pi="${pi}">Otomatik seç</button></div></div>`;
}
function incomingHTML(v, pi) {
  const t = v.trade, fp = v.players[t.from], p = v.players[pi];
  const can = p.hand ? has(p.hand, t.get) : false;
  return `<div class="kl-mc kl-tin" role="dialog" aria-label="Takas teklifi"><div class="kl-mh"><span>🤝</span><b>${esc(fp.name)} takas istiyor</b></div><div class="kl-mb">
    ${ui.mode === 'local' && humans(v).length > 1 ? `<p class="kl-pass">Cihazı <b style="color:${p.color}">${esc(p.name)}</b> oyuncusuna ver.</p>` : ''}
    <div class="kl-tx big"><span><small>sana verir</small>${cardsHTML(t.give)}</span><i>⇄</i><span><small>senden ister</small>${cardsHTML(t.get)}</span></div>
    <div class="kl-mine"><small>Elin:</small>${cardsHTML(p.hand || zero())}</div>${bar('trade')}</div>
    <div class="kl-mf"><button type="button" class="btn btn-spin" data-a="tAcc" data-pi="${pi}" ${can ? '' : 'disabled'}>✅ Kabul et</button><button type="button" class="btn btn-vowel" data-a="tCtr" data-pi="${pi}">🔁 Karşı teklif</button><button type="button" class="btn btn-ghost" data-a="tNo" data-pi="${pi}">❌ Reddet</button></div></div>`;
}
function infoHTML(v, pi) {
  const p = v.players[pi], me = viewerPi(v);
  const setl = v.vOwn.filter((o, i) => o === pi && v.vLvl[i] === 1).length, city = v.vOwn.filter((o, i) => o === pi && v.vLvl[i] === 2).length;
  const rates = ratesOf(v, pi), ports = rates.map((r, i) => (r < 4 ? `${RES[i].ic} ${r}:1` : '')).filter(Boolean);
  const rows = [['🏠 Köy', setl], ['🏰 Kale', city], ['🛤️ Yol', 15 - p.left.road], ['⚔️ Şövalye', p.knights], ['🂠 Kaynak kartı', p.n], ['🃏 Gelişim kartı', p.devN], ['🛣️ En uzun yolu', p.roadLen]];
  return `<div class="kl-mc" role="dialog"><button type="button" class="kl-x" data-a="closeModal" aria-label="Kapat">✕</button><div class="kl-mh" style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${p.isBot ? '🤖' : initial(p.name)}</span><b>${esc(p.name)}</b></div><div class="kl-mb">
    <div class="kl-vpbig"><b>${pi === me && p.vpT != null ? p.vpT : p.vp}</b><small>zafer puanı${pi === me && p.vpT > p.vp ? ` (${p.vpT - p.vp} gizli)` : ''} · hedef ${v.target}</small></div>
    <div class="kl-irows">${rows.map(([a, b]) => `<span><small>${a}</small><b>${b}</b></span>`).join('')}</div>
    ${v.longest.pi === pi ? '<p class="kl-note gold">🛣️ En Uzun Yol (+2 ZP)</p>' : ''}${v.army.pi === pi ? '<p class="kl-note gold">🛡️ En Büyük Ordu (+2 ZP)</p>' : ''}
    <p class="kl-note">${ports.length ? `Limanlar: ${ports.join(' · ')}` : 'Liman yok (banka 4:1)'}</p>
    <p class="kl-note small">Maliyetler: 🛤️ Yol ${costHTML(COST.road)} · 🏠 Köy ${costHTML(COST.setl)} · 🏰 Kale ${costHTML(COST.city)} · 🃏 Kart ${costHTML(COST.dev)}</p></div></div>`;
}
function setPop(host, html, fresh) {
  const sc = host.firstElementChild ? host.firstElementChild.scrollTop : 0;
  if (host.dataset.h !== html || fresh) { host.innerHTML = html; host.dataset.h = html; }
  const c = host.firstElementChild; if (!c) return;
  if (fresh) c.classList.add('pop'); else c.scrollTop = sc;
}
function renderModal(v) {
  // sistem: kart atma / gelen takas
  let sys = '', sk = '';
  const pl = pendingLocal(v);
  if (pl >= 0 && v.phase === 'discard') { sys = discardHTML(v, pl); sk = 'd' + v.discard.n + ':' + pl; }
  else if (pl >= 0 && v.phase === 'trade' && !(modal && modal.k === 'trade' && draft && draft.counter)) { sys = incomingHTML(v, pl); sk = 't' + v.trade.n + ':' + pl; }
  if (sys) { setPop(E.ov, sys, sk !== E.sysKey); E.ov.hidden = false; } else { E.ov.hidden = true; E.ov.innerHTML = ''; delete E.ov.dataset.h; }
  E.sysKey = sk;
  let h = '';
  if (modal && !sys) {
    if (modal.k === 'trade') { if (draft && (draft.counter ? (v.phase === 'trade' && v.trade && v.trade.n === draft.tn) : (myTurn(v) && v.phase === 'main'))) h = tradeEditorHTML(v); else { modal = null; draft = null; } }
    else if (modal.k === 'dev') { if (viewerPi(v) >= 0 && v.players[viewerPi(v)].dev) h = devHTML(v); else modal = null; }
    else if (modal.k === 'bol' || modal.k === 'tek') { if (myTurn(v) && playableDev(v, actor(v)).includes(modal.k)) h = pickerHTML(v); else modal = null; }
    else if (modal.k === 'info') h = infoHTML(v, modal.pi);
  }
  const mk2 = h && modal ? modal.k + (modal.pi != null ? modal.pi : '') : '';
  if (h) { setPop(E.modal, h, mk2 !== E.modKey); E.modal.hidden = false; } else { E.modal.hidden = true; E.modal.innerHTML = ''; delete E.modal.dataset.h; }
  E.modKey = mk2;
  tickBars();
}
function tickBars() {
  cancelAnimationFrame(rafT);
  if (!root || !V) return;
  if (!root.querySelector('[data-dl]')) return;
  const loop = () => {
    if (!root || !V) return;
    const nowH = ui.hostNow();
    root.querySelectorAll('[data-dl]').forEach(b => {
      const o = b.dataset.dl === 'disc' ? V.discard : V.trade; if (!o) return;
      const left = Math.max(0, o.dl - nowH), f = Math.max(0, Math.min(1, left / (o.dur || 1)));
      b.style.width = (f * 100).toFixed(1) + '%'; b.classList.toggle('low', left < 5000);
      const s = b.parentNode.querySelector('[data-sec]'); if (s) s.textContent = Math.ceil(left / 1000) + ' sn';
    });
    rafT = requestAnimationFrame(loop);
  };
  loop();
}

/* ---------- efektler ---------- */
function flyText(x0, y0, el, txt, delay, cls) {
  const d = document.createElement('div'); d.className = 'kl-fly ' + (cls || ''); d.textContent = txt;
  d.style.left = x0 + 'px'; d.style.top = y0 + 'px';
  document.body.appendChild(d);
  let tx = 0, ty = -60;
  if (el) { const r = el.getBoundingClientRect(); if (r.width) { tx = r.left + r.width / 2 - x0; ty = r.top + r.height / 2 - y0; } }
  const anim = d.animate ? d.animate([
    { transform: 'translate(-50%, -50%) scale(.4)', opacity: 0 },
    { transform: 'translate(-50%, -120%) scale(1.25)', opacity: 1, offset: .25 },
    { transform: 'translate(-50%, -120%) scale(1.1)', opacity: 1, offset: .45 },
    { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(.7)`, opacity: .2 }
  ], { duration: 1250, delay, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'both' }) : null;
  setTimeout(() => d.remove(), 1300 + delay);
  return anim;
}
function stamp(txt, cls) { if (!E.stamp) return; E.stamp.className = 'kl-stamp'; E.stamp.textContent = txt; void E.stamp.offsetWidth; E.stamp.className = 'kl-stamp show ' + (cls || ''); }
function hitHexes(s) {
  if (!V || !E.hits) return;
  const G = gs(V);
  E.hits.innerHTML = V.hexes.map((t, h) => (t.num === s ? `<polygon class="kl-hit ${h === V.robber ? 'blk' : ''}" points="${hexPts(G.H[h].x, G.H[h].y, .95)}"/>` : '')).join('');
  setTimeout(() => { if (E.hits) E.hits.innerHTML = ''; }, 1700);
}
function prodFx(g) {
  if (!V || !E.vp) return;
  const me = viewerPi(V), G = gs(V);
  g.forEach((x, k) => {
    const hx = G.H[x.h]; const [sx, sy] = toScreen(hx.x, hx.y);
    const target = x.pi === me ? E.hand.querySelector(`.kl-card[data-r="${x.r}"]`) : E.pl.querySelector(`.kl-pl[data-pi="${x.pi}"]`);
    flyText(sx + (k % 3 - 1) * 14, sy, target, `+${x.n}${RES[x.r].ic}`, k * 90, x.pi === me ? 'mine' : '');
  });
  if (g.some(x => x.pi === me)) setTimeout(() => Sound.good(), 300);
}

/* ---------- ana çizim ---------- */
function render(v) {
  const prev = V; V = v;
  const key = JSON.stringify([v.big, v.hexes, v.ports]);
  if (key !== mapKey) {
    mapKey = key; const b = gs(v).box;
    E.svg.setAttribute('viewBox', `${b.x.toFixed(1)} ${b.y.toFixed(1)} ${b.w.toFixed(1)} ${b.h.toFixed(1)}`);
    E.svg.setAttribute('width', b.w.toFixed(0)); E.svg.setAttribute('height', b.h.toFixed(0));
    E.board.style.width = b.w.toFixed(0) + 'px'; E.board.style.height = b.h.toFixed(0) + 'px';
    E.gStatic.innerHTML = staticSVG(v); E.hits = E.gStatic.querySelector('.kl-hits');
    if (!cam) cam = { s: 1, x: 0, y: 0 };
    camFit(0); lastRob = -1;
  }
  const tk = v.cur + ':' + v.turnN + ':' + v.phase;
  if (tk !== lastTurnKey) { lastTurnKey = tk; if (v.phase !== 'main') mode = null; if (sel && v.phase !== lastPhase) sel = null; }
  lastPhase = v.phase;
  if (mode && !(myTurn(v) && v.phase === 'main' && buildState(v, mode).ok)) { mode = null; }
  renderDyn(v);
  renderDice(v);
  renderPlayers(v);
  renderHud(v);
  renderHand(v);
  renderBuild(v);
  renderModal(v);
  const lg = `<b>Puanlar</b><span>🏠 Köy 1</span><span>🏰 Kale 2</span><span>🛣️ En Uzun Yol (5+) 2</span><span>🛡️ En Büyük Ordu (3+ ⚔️) 2</span><span>🏆 Zafer kartı 1</span><em>Hedef: ${v.target} ZP · Bankada ${RES.map((r, i) => `${r.ic}${v.bank[i]}`).join(' ')}</em>`;
  if (E.legend.dataset.h !== lg) { E.legend.innerHTML = lg; E.legend.dataset.h = lg; }
  // çalınan kart: yalnızca hırsız ve kurbana
  if (v.reveal && v.reveal.n !== lastReveal) {
    if (!firstRender && v.reveal.r != null) {
      const me = viewerPi(v), r = RES[v.reveal.r];
      if (me === v.reveal.thief) { stamp(`+1 ${r.ic} ${r.n}`, 'good'); }
      else if (me === v.reveal.victim) { stamp(`−1 ${r.ic} ${r.n}`, 'bad'); }
    }
    lastReveal = v.reveal.n;
  }
  firstRender = false;
}
function nearestTarget(tg, bx, by) {
  const G = V ? gs(V) : null; if (!G) return null;
  let best = null, bd = 1e9;
  const lim = Math.max(30, 26 / cam.s);
  tg.ids.forEach(id => {
    let x, y;
    if (tg.k === 'road') { x = G.E[id].x; y = G.E[id].y; }
    else if (tg.k === 'robber') { x = G.H[id].x; y = G.H[id].y; }
    else { x = G.V[id].x; y = G.V[id].y; }
    const d = Math.hypot(x - bx, y - by);
    if (d < bd) { bd = d; best = id; }
  });
  if (tg.k === 'robber') return bd < S * .95 ? best : null;
  return bd < lim ? best : null;
}
function doSel(v, s) {
  const a = actor(v);
  if (s.k === 'robber') send({ t: 'robber', h: s.id });
  else if (s.k === 'road') { send({ t: 'road', e: s.id }); }
  else if (s.k === 'setl') send({ t: 'setl', v: s.id });
  else if (s.k === 'city') send({ t: 'city', v: s.id });
  sel = null;
  if (v.phase === 'main' && s.k !== 'road') mode = null;
  return a;
}
function onClick(e) {
  if (moved) { moved = false; if (e.target.closest('.kl-vp')) { e.stopPropagation(); e.preventDefault(); return; } }
  const v = V; if (!v) return;
  const b = e.target.closest('[data-a]');
  if (b) {
    if (b.disabled) return;
    const a = b.dataset.a, pi = b.dataset.pi != null ? +b.dataset.pi : -1, r = b.dataset.r != null ? +b.dataset.r : -1;
    Sound.init();
    switch (a) {
      case 'roll': case 'end': case 'endRoads': send({ t: a }); break;
      case 'cancelTrade': send({ t: a }, v.trade && v.trade.from); break;
      case 'steal': send({ t: 'steal', pi }); break;
      case 'pick': send({ t: 'pick', pi }, v.trade && v.trade.from); break;
      case 'confirm': if (sel) doSel(v, sel); break;
      case 'unsel': sel = null; break;
      case 'build': {
        const k = b.dataset.k;
        if (k === 'dev') { send({ t: 'buyDev' }); mode = null; }
        else { mode = mode === k ? null : k; sel = null; if (mode && !isDesk() && cam.s > fitScale() * 1.02) camFit(300); }
        break;
      }
      case 'devs': modal = { k: 'dev' }; break;
      case 'play': {
        const k = b.dataset.k;
        if (k === 'bol' || k === 'tek') modal = { k, sel: [] };
        else { send({ t: 'play', k }); modal = null; }
        break;
      }
      case 'pk': if (modal) { const n = modal.k === 'bol' ? 2 : 1; const s2 = modal.sel || []; if (modal.k === 'tek') modal.sel = [r]; else if (s2.length >= n) modal.sel = [r]; else modal.sel = s2.concat([r]); } break;
      case 'pkDo': if (modal) { send({ t: 'play', k: modal.k, res: modal.k === 'bol' ? modal.sel : modal.sel[0] }); modal = null; } break;
      case 'tradeOpen': draft = { tab: 'bank', bg: -1, bget: -1, give: zero(), get: zero(), counter: false }; modal = { k: 'trade' }; break;
      case 'tab': if (draft) draft.tab = b.dataset.t; break;
      case 'bg': if (draft) { draft.bg = r; if (draft.bget === r) draft.bget = -1; } break;
      case 'bget': if (draft) draft.bget = r; break;
      case 'bankDo': if (draft) { send({ t: 'bank', give: draft.bg, get: draft.bget }); const keep = draft.bg; draft.bget = -1; draft.bg = keep; } break;
      case 'st': {
        const s = b.dataset.s, d = +b.dataset.d;
        if (s === 'disc' && E.disc) E.disc.c[r] = Math.max(0, E.disc.c[r] + d);
        else if (draft) { draft[s][r] = Math.max(0, draft[s][r] + d); const o = s === 'give' ? 'get' : 'give'; if (draft[s][r] > 0) draft[o][r] = 0; }
        break;
      }
      case 'offerDo': if (draft) {
        if (draft.counter) send({ t: 'respond', r: 'ctr', give: draft.give, get: draft.get }, draft.as);
        else send({ t: 'offer', give: draft.give, get: draft.get });
        modal = null; draft = null; } break;
      case 'tAcc': send({ t: 'respond', r: 'acc' }, pi); break;
      case 'tNo': send({ t: 'respond', r: 'no' }, pi); break;
      case 'tCtr': if (v.trade) { draft = { tab: 'pl', counter: true, as: pi, tn: v.trade.n, give: v.trade.get.slice(), get: v.trade.give.slice() }; const h = v.players[pi].hand || zero(); draft.give = draft.give.map((x, i) => Math.min(x, h[i])); modal = { k: 'trade' }; } break;
      case 'discDo': if (E.disc) send({ t: 'discard', cards: E.disc.c.slice() }, pi); break;
      case 'discAuto': if (E.disc && v.discard) {
        const p = v.players[pi], need = v.discard.need[pi], c = zero(), h = p.hand.slice();
        for (let k = 0; k < need; k++) { let best = 0; for (let i = 1; i < 5; i++) if (h[i] - c[i] > h[best] - c[best]) best = i; c[best]++; }
        E.disc.c = c; } break;
      case 'pinfo': modal = { k: 'info', pi }; break;
      case 'closeModal': modal = null; draft = null; break;
      case 'zin': { const [w, h] = vpSize(); zoomAt(1.35, w / 2, h / 2, 220); break; }
      case 'zout': { const [w, h] = vpSize(); zoomAt(1 / 1.35, w / 2, h / 2, 220); break; }
      case 'fit': camFit(300); break;
      default: break;
    }
    if (V) render(V);
    return;
  }
  // tahtaya dokunma: en yakın uygun hedef
  if (e.target.closest('.kl-vp')) {
    const tg = targets(v); if (!tg) return;
    const [bx, by] = toBoard(e.clientX, e.clientY);
    const id = nearestTarget(tg, bx, by);
    if (id == null) { if (sel) { sel = null; render(v); } return; }
    const s = { k: tg.k, id };
    if (fine() || (sel && sel.k === s.k && sel.id === s.id)) { doSel(v, s); }
    else { sel = s; Sound.tick && Sound.tick(.3); }
    render(v);
    return;
  }
  if (e.target === E.modal) { modal = null; draft = null; render(v); }
}
function onKey(e) { if (e.key === 'Escape') { if (modal || sel || mode) { modal = null; draft = null; sel = null; mode = null; if (V) render(V); } } }
function mount(r, api) {
  root = r; ui = api; V = null; cam = null; mapKey = ''; firstRender = true; mode = null; sel = null; modal = null; draft = null; lastHuman = -1; diceN = -1; lastRob = -1; lastReveal = 0; lastHand = null; lastTurnKey = ''; lastPhase = '';
  pointers = new Map(); drag = null; moved = false;
  root.innerHTML = `<div class="g-wrap kl">
    <div class="kl-players"></div>
    <div class="kl-stage"><div class="kl-vp">
      <div class="kl-board"><svg class="kl-svg" xmlns="http://www.w3.org/2000/svg" aria-label="Ada"><g class="kl-static"></g><g class="kl-roads"></g><g class="kl-blds"></g><g class="kl-rob">${ROBBER}</g><g class="kl-spots"></g></svg></div>
      <div class="kl-tray"><div class="kl-dice">${cubeHTML()}${cubeHTML()}</div><span class="kl-dlab">Zar bekleniyor</span></div>
      <div class="kl-vpctl"><button type="button" class="kl-ibtn" data-a="zin" aria-label="Yakınlaştır">＋</button><button type="button" class="kl-ibtn" data-a="zout" aria-label="Uzaklaştır">－</button><button type="button" class="kl-ibtn" data-a="fit" aria-label="Tüm ada">⤢</button></div>
      <div class="kl-stamp"></div>
    </div></div>
    <div class="kl-side">
      <div class="kl-hud"><div class="kl-htop"></div><div class="kl-hmsg"></div><div class="kl-hacts"></div></div>
      <div class="kl-hand"></div>
      <div class="kl-build"></div>
      <div class="kl-legend"></div>
    </div>
    <div class="kl-ov" hidden></div>
    <div class="kl-modal" hidden></div>
  </div>`;
  const q = s => root.querySelector(s);
  E = { vp: q('.kl-vp'), board: q('.kl-board'), svg: q('.kl-svg'), gStatic: q('.kl-static'), gRoads: q('.kl-roads'), gBld: q('.kl-blds'), rob: q('.kl-rob'), gSpots: q('.kl-spots'),
    tray: q('.kl-tray'), dlab: q('.kl-dlab'), stamp: q('.kl-stamp'), pl: q('.kl-players'), hTop: q('.kl-htop'), hMsg: q('.kl-hmsg'), hActs: q('.kl-hacts'), hand: q('.kl-hand'), build: q('.kl-build'), legend: q('.kl-legend'),
    ov: q('.kl-ov'), modal: q('.kl-modal'), newE: -1, newV: -1, disc: null };
  E.cubes = [...E.tray.querySelectorAll('.kl-cube')]; E.dws = [...E.tray.querySelectorAll('.kl-dw')];
  restDice([3, 4]);
  root.addEventListener('click', onClick, true);
  E.vp.addEventListener('pointerdown', onPointerDown);
  addEventListener('pointermove', onPointerMove); addEventListener('pointerup', onPointerUp); addEventListener('pointercancel', onPointerUp);
  E.vp.addEventListener('wheel', onWheel, { passive: false });
  addEventListener('resize', onResize); addEventListener('keydown', onKey);
}

DEF.mount = mount;
DEF.render = render;
DEF.onEvent = function (e) {
  if (!V) return;
  const me = viewerPi(V);
  switch (e.t) {
    case 'rolling': Sound.whoosh(); break;
    case 'dice': if (e.s === 7) { setTimeout(() => { Sound.bad(); flash('bad'); }, 80); } else hitHexes(e.s); break;
    case 'prod': setTimeout(() => prodFx(e.gl || []), 120); break;
    case 'blocked': break;
    case 'robber': Sound.whoosh(); setTimeout(() => Sound.bad(), 600); break;
    case 'steal': if (me === e.victim) { Sound.bad(); } else if (me === e.thief) Sound.good(); break;
    case 'build': E.newE = e.k === 'road' ? e.id : -1; E.newV = e.k !== 'road' ? e.id : -1; Sound.buy();
      if (e.k === 'city') { banner('KALE!', 'good'); } else if (e.k === 'setl' && V.phase !== 'setup') { const G = gs(V), p = G.V[e.id]; const [x, y] = toScreen(p.x, p.y); FX.burst(x, y, 26, true); }
      break;
    case 'buyDev': Sound.special(); break;
    case 'play': Sound.special(); banner(`${DEV[e.k].ic} ${DEV[e.k].n.toLocaleUpperCase('tr-TR')}`, 'pink'); break;
    case 'longest': if (e.pi >= 0) { Sound.solve(); banner('EN UZUN YOL!', 'good'); } break;
    case 'army': Sound.solve(); banner('EN BÜYÜK ORDU!', 'good'); break;
    case 'tradeOffer': Sound.special(); break;
    case 'trade': Sound.solve(); stamp('ANLAŞMA!', 'good'); break;
    case 'tradeNo': Sound.tick && Sound.tick(.3); break;
    case 'bank': Sound.buy(); break;
    case 'seven': break;
    case 'discard': Sound.tick && Sound.tick(.4); break;
    case 'turn':
      if (ui.mode === 'online' && e.pi === ui.me) { Sound.good(); banner('SIRA SENDE', 'good'); }
      else if (ui.mode === 'local' && humans(V).length > 1 && !V.players[e.pi].isBot) banner(V.players[e.pi].name.toLocaleUpperCase('tr-TR'));
      break;
    case 'win': Sound.fanfare(); FX.confetti(180); break;
    default: break;
  }
};
DEF.unmount = function () {
  cancelAnimationFrame(rafT); clearTimeout(trayT);
  if (root) root.removeEventListener('click', onClick, true);
  removeEventListener('pointermove', onPointerMove); removeEventListener('pointerup', onPointerUp); removeEventListener('pointercancel', onPointerUp);
  removeEventListener('resize', onResize); removeEventListener('keydown', onKey);
  document.querySelectorAll('.kl-fly').forEach(d => d.remove());
  root = null; V = null; E = {}; cam = null;
};
CFX.registerGame(DEF);
})();
