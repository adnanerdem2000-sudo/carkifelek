/* =========================================================================
   PARTİ TAHTASI — çevrimiçi parti tahta oyunu
     · Tahta: dallanan döngü, zar, anahtar/tuzak/eşya/şans/can/mağaza/ışınlanma
       kareleri, yer değiştiren Kupa sandığı, can (HP) ve mezarlık.
     · Eşyalar (yalnızca sahibine görünür): Yumruk Eldiveni, Ayı Kapanı,
       Çift Zar, Mıknatıs, Kalkan, Işınlanma Kartı, Roket.
     · Her tur sonunda herkes aynı anda bir mini oyun oynar (partitahtasi_mini.js).
       Mini oyunlar yöneten cihazdaki zamanlayıcıyla çalışır; konum/girdi hızlı
       kanaldan (ui.fast) akar, puanlamayı yalnızca yöneten cihaz yapar.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, flash, banner } = window.CFX;
const MINI = window.__PTMINI;
const { GAMES, ORDER, D, drawPawn, emoji, shade, ANIMALS, ANIMAL_EMOJI, ANIMAL_NAME } = MINI;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pickR = arr => arr[Math.floor(Math.random() * arr.length)];
const shuf = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ------------------------------------------------------------------ kurallar: sabitler */
const HP_MAX = 30, KUPA_PRICE = 20, START_KEYS = 10, MAX_ITEMS = 3;
const STEP_MS = 340, ROLL_MS = 1350, LAND_MS = 1100, INTRO_MS = 5200, RES_MS = 6000, MG_TICK = 50, SNAP_MS = 100;
const BW = 1600, BH = 1100;

const SPACES = {
  k: { name: 'Anahtar', icon: '🔑', col: '#2f7bff', desc: '+3 anahtar' },
  t: { name: 'Tuzak', icon: '⚠️', col: '#ff3b5c', desc: '4 anahtar ya da 7 can kaybı' },
  i: { name: 'Eşya kutusu', icon: '🎁', col: '#b14dff', desc: 'Rastgele bir eşya' },
  l: { name: 'Şans', icon: '🍀', col: '#ffc21a', desc: 'Sürpriz olay' },
  h: { name: 'Can', icon: '❤️', col: '#2bd96b', desc: '+8 can, +1 anahtar' },
  s: { name: 'Mağaza', icon: '🛒', col: '#ff8a00', desc: 'Geçerken ya da dururken eşya al' },
  p: { name: 'Işınlanma', icon: '🌀', col: '#7b2fff', desc: 'Diğer ışınlanma karesine geç' },
  g: { name: 'Mezarlık', icon: '🪦', col: '#7a7f95', desc: 'Canı biten burada doğar' },
  S: { name: 'Başlangıç', icon: '🏁', col: '#ffffff', desc: '+3 anahtar' }
};
const ITEMS = {
  eldiven: { name: 'Yumruk Eldiveni', icon: '🥊', price: 6, w: 3, desc: '3 kare yakınındaki bir rakibe vur: 8 can ve 5 anahtar çal.' },
  kapan: { name: 'Ayı Kapanı', icon: '🪤', price: 5, w: 2, desc: 'Durduğun kareye kapan kur. Basan ya da geçen rakip durur, 8 can kaybeder, sana 5 anahtar öder.' },
  ciftzar: { name: 'Çift Zar', icon: '🎲', price: 5, w: 3, desc: 'Bu tur iki zar atarsın.' },
  miknatis: { name: 'Mıknatıs', icon: '🧲', price: 8, w: 1.5, desc: 'Lideri 6 kare geri çeker.' },
  kalkan: { name: 'Kalkan', icon: '🛡️', price: 4, w: 2, passive: true, desc: 'Elindeyken sıradaki saldırıyı ya da tuzağı kendiliğinden engeller.' },
  isinlanma: { name: 'Işınlanma Kartı', icon: '🌀', price: 10, w: 1, desc: 'Kupa sandığının 2 kare gerisine ışınlanırsın.' },
  roket: { name: 'Roket', icon: '🚀', price: 7, w: 2, desc: 'Bu tur zarına +8 eklenir.' }
};
const ITEM_IDS = Object.keys(ITEMS);
const optNum = (v, allowed, def) => { const n = parseInt(v, 10); return allowed.includes(n) ? n : def; };

/* ------------------------------------------------------------------ tahtalar */
const BOARDS = {
  seker: {
    name: 'Şeker Adası', icon: '🍭',
    loop: { pts: [[260, 250], [620, 165], [1000, 180], [1340, 250], [1440, 540], [1350, 850], [1000, 940], [600, 930], [250, 860], [150, 550]], types: 'SkiktklkskitkhkpkiktklkgkikthK' },
    branches: [
      { from: [150, 550], to: [1440, 540], pts: [[430, 570], [800, 545], [1170, 565]], types: 'tktptlt' },
      { from: [1000, 940], to: [600, 930], pts: [[800, 1045]], types: 'ili' }
    ]
  },
  uzay: {
    name: 'Uzay Kalesi', icon: '🚀',
    loop: { pts: [[230, 205], [800, 135], [1370, 205], [1460, 560], [1370, 915], [800, 985], [230, 915], [140, 560]], types: 'SkiktkslkitkhkpktikltkgkiktkhK' },
    branches: [
      { from: [800, 135], to: [800, 985], pts: [[800, 335], [800, 560], [800, 780]], types: 'tlhtpt' },
      { from: [1460, 560], to: [800, 560], pts: [[1180, 600]], types: 'kik', joinBranch: true }
    ]
  }
};
const boardCache = {};
function sampleLine(pts, closed, count, skipEnds) {
  const P = closed ? pts.concat([pts[0]]) : pts, L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + dist(P[i][0], P[i][1], P[i - 1][0], P[i - 1][1]));
  const tot = L[L.length - 1], out = [];
  for (let k = 0; k < count; k++) {
    const s = closed ? tot * k / count : tot * (k + 1) / (count + 1);
    let i = 1; while (i < L.length - 1 && L[i] < s) i++;
    const u = (s - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
    out.push([Math.round(P[i - 1][0] + (P[i][0] - P[i - 1][0]) * u), Math.round(P[i - 1][1] + (P[i][1] - P[i - 1][1]) * u)]);
  }
  void skipEnds;
  return out;
}
function buildBoard(id) {
  if (boardCache[id]) return boardCache[id];
  const def = BOARDS[id] || BOARDS.seker, nodes = [];
  const add = (x, y, t) => { const n = { id: nodes.length, x, y, t: SPACES[t] ? t : 'k', next: [], prev: [] }; nodes.push(n); return n; };
  const ty = def.loop.types.replace(/K/g, 'k');
  const lp = sampleLine(def.loop.pts, true, ty.length);
  lp.forEach(([x, y], i) => add(x, y, ty[i]));
  const N = lp.length;
  for (let i = 0; i < N; i++) nodes[i].next.push((i + 1) % N);
  const nearest = (x, y, upto) => { let b = 0, bd = 1e9; for (let i = 0; i < upto; i++) { const d = dist(nodes[i].x, nodes[i].y, x, y); if (d < bd) { bd = d; b = i; } } return b; };
  def.branches.forEach(br => {
    const f = nodes[nearest(br.from[0], br.from[1], N)], tId = nearest(br.to[0], br.to[1], br.joinBranch ? nodes.length : N), to = nodes[tId];
    const pts = sampleLine([[f.x, f.y]].concat(br.pts, [[to.x, to.y]]), false, br.types.length);
    let prev = f;
    pts.forEach(([x, y], k) => { const n = add(x, y, br.types[k]); prev.next.push(n.id); prev = n; });
    prev.next.push(to.id);
  });
  nodes.forEach(n => n.next.forEach(m => nodes[m].prev.push(n.id)));
  const M = nodes.length;
  const bfs = (src, und) => { const d = Array(M).fill(99); d[src] = 0; const q = [src]; while (q.length) { const a = q.shift(); const nb = und ? nodes[a].next.concat(nodes[a].prev) : nodes[a].next; nb.forEach(b => { if (d[b] > d[a] + 1) { d[b] = d[a] + 1; q.push(b); } }); } return d; };
  const B = { id, def, name: def.name, nodes, start: nodes.findIndex(n => n.t === 'S'), grave: nodes.findIndex(n => n.t === 'g'), portals: nodes.filter(n => n.t === 'p').map(n => n.id),
    fd: nodes.map(n => bfs(n.id, false)), ud: nodes.map(n => bfs(n.id, true)) };
  boardCache[id] = B;
  return B;
}

/* ------------------------------------------------------------------ kurallar: yardımcılar */
const pname = (st, i) => (st.players[i] ? st.players[i].name : '?');
const BRD = st => buildBoard(st.board);
let HOST = { inp: [], bn: [], lb: [], bp: [], fxq: [], last: 0, lastSnap: 0, lastSync: 0, dirty: false, loop: 0 };
let uiRef = null;
function isAI(st, ctx, pi) { return !!(st.players[pi].isBot || st.P[pi].auto || (ctx && !ctx.isOnline(pi))); }
function leaderOf(st, except) {
  let best = -1; st.P.forEach((p, i) => { if (i === except) return; if (best < 0 || p.kupa > st.P[best].kupa || (p.kupa === st.P[best].kupa && p.keys > st.P[best].keys)) best = i; });
  return best;
}
function standings(st) { return st.P.map((p, i) => i).sort((a, b) => st.P[b].kupa - st.P[a].kupa || st.P[b].keys - st.P[a].keys || a - b); }
function addKeys(st, pi, n) { const p = st.P[pi], before = p.keys; p.keys = Math.max(0, p.keys + n); p.stat.keys += Math.max(0, p.keys - before); return p.keys - before; }
function useShield(st, pi) { const p = st.P[pi], k = p.items.indexOf('kalkan'); if (k < 0) return false; p.items.splice(k, 1); return true; }
function giveItem(st, pi) {
  const p = st.P[pi]; if (p.items.length >= MAX_ITEMS) return null;
  let tot = 0; ITEM_IDS.forEach(k => { tot += ITEMS[k].w; });
  let r = Math.random() * tot, pick = ITEM_IDS[0];
  for (const k of ITEM_IDS) { r -= ITEMS[k].w; if (r <= 0) { pick = k; break; } }
  p.items.push(pick); return pick;
}
function walkBack(B, from, k) { let n = from; for (let i = 0; i < k; i++) { const pv = B.nodes[n].prev; if (!pv.length) break; n = pickR(pv); } return n; }
function moveChest(st, first) {
  const B = BRD(st), occ = new Set(st.P.map(p => p.node));
  const ref = first ? B.start : st.chest;
  let cand = B.nodes.filter(n => n.t === 'k' && !occ.has(n.id) && n.id !== st.chest && B.fd[ref][n.id] >= (first ? 6 : 8) && B.fd[ref][n.id] < 99);
  if (!cand.length) cand = B.nodes.filter(n => n.t === 'k' && n.id !== st.chest);
  st.chest = pickR(cand).id;
}
// sonraki adımlarda "pend" ile zamanlanmış işler — kurucu yeniden yüklenince resume bunları yeniden kurar
const PEND = {};
function schedule(st, ctx, ms, fn) {
  const id = ++st.pendId; st.pend = { fn, at: Date.now() + ms, id };
  ctx.later(ms, () => { if (st.pendId !== id || !st.pend || st.pend.id !== id) return; st.pend = null; PEND[fn](st, ctx); });
}
function damage(st, ctx, pi, hp, why) {
  const p = st.P[pi]; p.hp = Math.max(0, p.hp - hp);
  if (p.hp <= 0) faint(st, ctx, pi, why);
}
function faint(st, ctx, pi, why) {
  const p = st.P[pi], B = BRD(st), lost = Math.floor(p.keys / 3);
  p.keys -= lost; p.hp = HP_MAX; p.node = B.grave; p.stat.faint++;
  ctx.emit({ t: 'faint', pi, lost, n: p.node }, `💀 ${pname(st, pi)} bayıldı${why ? ` (${why})` : ''}! Mezarlıkta uyandı, ${lost} anahtar kaybetti.`, 'bad');
}
function sync(st, ctx) { ctx.sync(); autoCheck(st, ctx); }
function autoCheck(st, ctx) {
  const pi = RULES.turnOf(st);
  if (pi == null || !st.P[pi] || st.players[pi].isBot) return;
  if (!st.P[pi].auto || st.autoPend) return;
  st.autoPend = true;
  ctx.later(750, () => { st.autoPend = false; if (RULES.turnOf(st) === pi && st.P[pi].auto) { RULES.botAct(st, pi, ctx); } });
}

/* ------------------------------------------------------------------ kurallar: tur akışı */
function startTurn(st, ctx) {
  st.phase = 'pre'; st.used = false; st.dbl = false; st.rocket = 0; st.dice = null; st.mv = null; st.branch = null; st.turnN++;
  ctx.emit({ t: 'turn', pi: st.cur }, `🎲 Sıra ${pname(st, st.cur)} oyuncusunda.`);
  sync(st, ctx);
}
function doRoll(st, ctx) {
  const v = st.dbl ? [rndi(1, 10), rndi(1, 10)] : [rndi(1, 10)];
  const total = v.reduce((a, b) => a + b, 0) + st.rocket;
  st.dice = { v, b: st.rocket, tot: total, at: Date.now() };
  st.phase = 'rolling';
  ctx.emit({ t: 'roll', pi: st.cur, v, b: st.rocket, tot: total }, `🎲 ${pname(st, st.cur)} ${v.join(' + ')}${st.rocket ? ' + 🚀8' : ''} = ${total} attı.`);
  schedule(st, ctx, ROLL_MS, 'beginMove');
  sync(st, ctx);
}
PEND.beginMove = (st, ctx) => { st.phase = 'move'; st.mv = { left: st.dice ? st.dice.tot : 1, choice: null }; schedule(st, ctx, 250, 'step'); sync(st, ctx); };
PEND.step = (st, ctx) => {
  if (st.phase !== 'move' || !st.mv) return;
  const B = BRD(st), p = st.P[st.cur], node = B.nodes[p.node];
  let to = node.next[0];
  if (node.next.length > 1) to = node.next.includes(st.mv.choice) ? st.mv.choice : node.next[0];
  st.mv.choice = null;
  p.node = to; st.mv.left--;
  ctx.emit({ t: 'step', pi: st.cur, n: to, left: st.mv.left });
  arrive(st, ctx);
};
function arrive(st, ctx) {
  const B = BRD(st), pi = st.cur, p = st.P[pi], n = p.node;
  const ti = st.traps.findIndex(tr => tr.n === n && tr.o !== pi);
  if (ti >= 0) {
    const tr = st.traps[ti]; st.traps.splice(ti, 1); st.mv.left = 0;
    if (useShield(st, pi)) ctx.emit({ t: 'block', pi, n, k: 'kapan' }, `🛡️ ${pname(st, pi)} kalkanıyla ayı kapanından kurtuldu!`, 'good');
    else {
      const stolen = Math.min(5, p.keys); p.keys -= stolen; st.P[tr.o].keys += stolen; st.P[tr.o].stat.keys += stolen;
      ctx.emit({ t: 'trap', pi, o: tr.o, n, stolen }, `🪤 ${pname(st, pi)} ${pname(st, tr.o)} oyuncusunun ayı kapanına yakalandı: −8 can, ${stolen} anahtar kaptırdı.`, 'bad');
      damage(st, ctx, pi, 8, 'ayı kapanı');
    }
    st.phase = 'land'; schedule(st, ctx, LAND_MS, 'endTurn'); sync(st, ctx); return;
  }
  if (n === st.chest && p.keys >= KUPA_PRICE) { st.phase = 'kupa'; sync(st, ctx); return; }
  if (B.nodes[n].t === 's' && p.items.length < MAX_ITEMS && p.keys >= 4) { st.phase = 'shop'; sync(st, ctx); return; }
  if (n === st.chest && st.mv.left <= 0) ctx.emit({ t: 'nochest', pi }, `🏆 ${pname(st, pi)} Kupa sandığına ulaştı ama ${KUPA_PRICE} anahtarı yok.`);
  continueMove(st, ctx);
}
function continueMove(st, ctx) {
  const B = BRD(st), p = st.P[st.cur], node = B.nodes[p.node];
  if (!st.mv || st.mv.left <= 0) { land(st, ctx); return; }
  if (node.next.length > 1) {
    st.phase = 'branch';
    st.branch = node.next.map(to => ({ to, d: 1 + B.fd[to][st.chest] }));
    sync(st, ctx); return;
  }
  st.phase = 'move'; schedule(st, ctx, STEP_MS, 'step'); sync(st, ctx);
}
function land(st, ctx) {
  const B = BRD(st), pi = st.cur, p = st.P[pi], node = B.nodes[p.node], nm = pname(st, pi);
  st.phase = 'land'; st.mv = null;
  const ev = { t: 'land', pi, n: node.id, s: node.t };
  switch (node.t) {
    case 'k': case 'S': { const d = addKeys(st, pi, 3); ev.keys = d; ctx.emit(ev, `🔑 ${nm} +3 anahtar topladı.`, 'good'); break; }
    case 'g': { addKeys(st, pi, 1); ev.keys = 1; ctx.emit(ev, `🪦 ${nm} mezarlıkta ürperdi ama 1 anahtar buldu.`); break; }
    case 't': {
      if (useShield(st, pi)) { ev.block = 1; ctx.emit(ev, `🛡️ ${nm} kalkanıyla tuzaktan korundu!`, 'good'); break; }
      if (Math.random() < .5 && p.keys > 0) { const d = addKeys(st, pi, -4); ev.keys = d; ctx.emit(ev, `⚠️ ${nm} tuzağa bastı: ${-d} anahtar düşürdü.`, 'bad'); }
      else { ev.hp = -7; ctx.emit(ev, `⚠️ ${nm} dikenli tuzağa bastı: −7 can.`, 'bad'); damage(st, ctx, pi, 7, 'tuzak'); }
      break;
    }
    case 'i': {
      const it = giveItem(st, pi);
      if (it) { ev.item = 1; ctx.emit(ev, `🎁 ${nm} eşya kutusundan bir eşya çıkardı.`, 'good'); ctx.emit({ t: 'gotitem', pi }); }
      else { addKeys(st, pi, 3); ev.keys = 3; ctx.emit(ev, `🎁 ${nm} çantası dolu; kutudan 3 anahtar çıktı.`, 'good'); }
      break;
    }
    case 'h': { const before = p.hp; p.hp = Math.min(HP_MAX, p.hp + 8); addKeys(st, pi, 1); ev.hp = p.hp - before; ev.keys = 1; ctx.emit(ev, `❤️ ${nm} +${p.hp - before} can ve 1 anahtar aldı.`, 'good'); break; }
    case 'p': {
      const other = B.portals.find(x => x !== node.id);
      if (other != null) { p.node = other; ev.to = other; ctx.emit(ev, `🌀 ${nm} ışınlandı!`); } else ctx.emit(ev);
      break;
    }
    case 'l': luck(st, ctx, pi, ev); break;
    case 's': { addKeys(st, pi, 1); ev.keys = 1; ctx.emit(ev, `🛒 ${nm} mağazanın önünde 1 anahtar buldu.`); break; }
    default: ctx.emit(ev);
  }
  schedule(st, ctx, LAND_MS, 'endTurn');
  sync(st, ctx);
}
function luck(st, ctx, pi, ev) {
  const nm = pname(st, pi), r = rndi(0, 5), p = st.P[pi];
  ev.luck = r;
  if (r === 0) { addKeys(st, pi, 6); ev.keys = 6; ctx.emit(ev, `🍀 Şans: Şeker yağmuru! ${nm} +6 anahtar.`, 'good'); }
  else if (r === 1) { const d = addKeys(st, pi, -4); ev.keys = d; ctx.emit(ev, `🍀 Şans: Cebin delindi! ${nm} ${-d} anahtar kaybetti.`, 'bad'); }
  else if (r === 2 && st.players.length > 1) {
    const j = pickR(st.P.map((_, k) => k).filter(k => k !== pi)); const a = p.node; p.node = st.P[j].node; st.P[j].node = a; ev.swap = j;
    ctx.emit(ev, `🍀 Şans: ${nm} ile ${pname(st, j)} yer değiştirdi!`, 'gold');
  } else if (r === 3) {
    const it = giveItem(st, pi);
    if (it) { ev.item = 1; ctx.emit(ev, `🍀 Şans: ${nm} bedava eşya kazandı!`, 'good'); ctx.emit({ t: 'gotitem', pi }); }
    else { addKeys(st, pi, 4); ev.keys = 4; ctx.emit(ev, `🍀 Şans: ${nm} +4 anahtar.`, 'good'); }
  } else if (r === 4) {
    ev.zap = 1; ctx.emit(ev, `🍀 Şans: Şimşek çaktı! ${nm} dışındaki herkes 3 can kaybetti.`, 'gold');
    st.P.forEach((q, j) => { if (j !== pi) damage(st, ctx, j, 3, 'şimşek'); });
  } else { const before = p.hp; p.hp = HP_MAX; addKeys(st, pi, 2); ev.hp = HP_MAX - before; ev.keys = 2; ctx.emit(ev, `🍀 Şans: Şifalı şeker! ${nm} canı doldu, +2 anahtar.`, 'good'); }
}
PEND.endTurn = (st, ctx) => {
  st.dice = null; st.mv = null; st.branch = null;
  st.cur++;
  if (st.cur >= st.players.length) { st.cur = 0; mgBegin(st, ctx); return; }
  startTurn(st, ctx);
};
function finishGame(st, ctx) {
  st.phase = 'over'; st.pend = null; st.mg = null;
  const order = standings(st);
  sync(st, ctx);
  ctx.end({
    title: `${pname(st, order[0])} Parti Tahtası şampiyonu!`,
    ranking: order.map(i => ({ pi: i, score: st.P[i].kupa * 1000 + st.P[i].keys, label: `🏆 ${st.P[i].kupa} · 🔑 ${st.P[i].keys}` })),
    note: st.mode === 'mini' ? `${st.rounds} mini oyunluk maraton bitti. Her mini oyun birincisi bir Kupa aldı; eşitlikte anahtar sayısı belirler.` : `${st.rounds} tur bitti. En çok Kupa toplayan kazanır; eşitlikte anahtar sayısı belirler.`
  });
}

/* ------------------------------------------------------------------ eylemler */
function useItem(st, ctx, pi, a) {
  if (st.phase !== 'pre' || st.used) return false;
  const p = st.P[pi], k = p.items.indexOf(a.k); if (k < 0) return false;
  const B = BRD(st), it = a.k, nm = pname(st, pi);
  if (it === 'kalkan') return false;
  if (it === 'eldiven') {
    const tg = +a.target;
    if (!Number.isInteger(tg) || tg === pi || !st.P[tg] || B.ud[p.node][st.P[tg].node] > 3) return false;
    p.items.splice(k, 1); st.used = true;
    if (useShield(st, tg)) { ctx.emit({ t: 'block', pi: tg, by: pi, k: 'eldiven' }, `🛡️ ${pname(st, tg)} kalkanıyla ${nm} oyuncusunun yumruğunu savuşturdu!`, 'gold'); }
    else {
      const stolen = Math.min(5, st.P[tg].keys); st.P[tg].keys -= stolen; p.keys += stolen; p.stat.keys += stolen; p.stat.hits++;
      ctx.emit({ t: 'punch', pi, tg, stolen }, `🥊 ${nm}, ${pname(st, tg)} oyuncusuna yumruk attı: −8 can, ${stolen} anahtar çaldı!`, 'bad');
      damage(st, ctx, tg, 8, 'yumruk');
    }
  } else if (it === 'kapan') {
    const node = B.nodes[p.node];
    if (node.t === 'S' || st.traps.some(tr => tr.n === p.node)) return false;
    p.items.splice(k, 1); st.used = true; st.traps.push({ n: p.node, o: pi });
    ctx.emit({ t: 'settrap', pi, n: p.node }, `🪤 ${nm} bir ayı kapanı kurdu.`);
  } else if (it === 'ciftzar') { p.items.splice(k, 1); st.used = true; st.dbl = true; ctx.emit({ t: 'useitem', pi, k: it }, `🎲 ${nm} Çift Zar kullandı!`); }
  else if (it === 'roket') { p.items.splice(k, 1); st.used = true; st.rocket = 8; ctx.emit({ t: 'useitem', pi, k: it }, `🚀 ${nm} Roket yaktı: zarına +8!`); }
  else if (it === 'isinlanma') {
    p.items.splice(k, 1); st.used = true; const from = p.node; p.node = walkBack(B, st.chest, 2);
    ctx.emit({ t: 'tp', pi, from, n: p.node }, `🌀 ${nm} Işınlanma Kartıyla Kupa sandığının yakınına ışınlandı!`);
  } else if (it === 'miknatis') {
    const tg = leaderOf(st, pi); if (tg < 0) return false;
    p.items.splice(k, 1); st.used = true;
    if (useShield(st, tg)) ctx.emit({ t: 'block', pi: tg, by: pi, k: 'miknatis' }, `🛡️ ${pname(st, tg)} kalkanı mıknatısı etkisiz bıraktı!`, 'gold');
    else { const from = st.P[tg].node; st.P[tg].node = walkBack(B, from, 6); ctx.emit({ t: 'magnet', pi, tg, from, n: st.P[tg].node }, `🧲 ${nm} mıknatısla lider ${pname(st, tg)} oyuncusunu 6 kare geri çekti!`, 'gold'); }
  } else return false;
  sync(st, ctx);
  return true;
}
function buyKupa(st, ctx, pi, yes) {
  if (st.phase !== 'kupa') return;
  const p = st.P[pi];
  if (yes && p.keys >= KUPA_PRICE) {
    p.keys -= KUPA_PRICE; p.kupa++; const old = st.chest; moveChest(st, false);
    ctx.emit({ t: 'kupa', pi, from: old, to: st.chest }, `🏆 ${pname(st, pi)} ${KUPA_PRICE} anahtara bir KUPA aldı! Sandık yer değiştirdi.`, 'gold');
  } else ctx.emit({ t: 'skipkupa', pi }, `${pname(st, pi)} Kupa almadı.`);
  continueMove(st, ctx);
}
function shopBuy(st, ctx, pi, k) {
  if (st.phase !== 'shop') return;
  const p = st.P[pi];
  if (k && ITEMS[k] && p.keys >= ITEMS[k].price && p.items.length < MAX_ITEMS) {
    p.keys -= ITEMS[k].price; p.items.push(k);
    ctx.emit({ t: 'buy', pi }, `🛒 ${pname(st, pi)} mağazadan bir eşya aldı.`);
    if (p.items.length < MAX_ITEMS && p.keys >= 4) { sync(st, ctx); return; }
  }
  continueMove(st, ctx);
}

/* ------------------------------------------------------------------ bot */
function botPre(st, ctx, pi) {
  const p = st.P[pi], B = BRD(st), dC = B.fd[p.node][st.chest];
  if (!st.used && p.items.length) {
    const has = k => p.items.includes(k);
    if (has('isinlanma') && dC > 9 && p.keys >= KUPA_PRICE - 6 && useItem(st, ctx, pi, { k: 'isinlanma' })) return;
    if (has('eldiven')) {
      const tg = st.P.map((q, j) => j).filter(j => j !== pi && B.ud[p.node][st.P[j].node] <= 3).sort((a, b) => st.P[b].keys - st.P[a].keys)[0];
      if (tg != null && (st.P[tg].keys >= 3 || st.P[tg].hp <= 8) && useItem(st, ctx, pi, { k: 'eldiven', target: tg })) return;
    }
    if (has('miknatis')) { const L = leaderOf(st, pi); if (L >= 0 && (st.P[L].kupa > p.kupa || st.P[L].keys > p.keys + 12) && useItem(st, ctx, pi, { k: 'miknatis' })) return; }
    if (has('roket') && dC >= 9 && dC <= 18 && p.keys >= KUPA_PRICE - 3 && useItem(st, ctx, pi, { k: 'roket' })) return;
    if (has('ciftzar') && dC > 7 && useItem(st, ctx, pi, { k: 'ciftzar' })) return;
    if (has('kapan') && (B.fd[p.node][st.chest] <= 7 || Math.random() < .3) && useItem(st, ctx, pi, { k: 'kapan' })) return;
  }
  doRoll(st, ctx);
}
function botAct(st, pi, ctx) {
  if (RULES.turnOf(st) !== pi) return;
  if (st.phase === 'pre') botPre(st, ctx, pi);
  else if (st.phase === 'branch') {
    const opts = st.branch.slice().sort((a, b) => a.d - b.d);
    const ch = Math.random() < .15 ? pickR(opts) : opts[0];
    RULES.action(st, pi, { t: 'branch', to: ch.to }, ctx);
  } else if (st.phase === 'kupa') buyKupa(st, ctx, pi, true);
  else if (st.phase === 'shop') {
    const p = st.P[pi], reserve = BRD(st).fd[p.node][st.chest] <= 12 ? KUPA_PRICE : 6;
    const can = ITEM_IDS.filter(k => ITEMS[k].price <= p.keys - reserve && !(k === 'kalkan' && p.items.includes('kalkan')));
    shopBuy(st, ctx, pi, can.length && Math.random() < .75 ? pickR(can) : null);
  }
}

/* ------------------------------------------------------------------ mini oyun çalıştırıcısı (yöneten cihaz) */
function makeH(st, ctx) {
  const mg = st.mg, now = Date.now(), M = GAMES[mg.id], dur = M.dur * 1000;
  return {
    n: st.players.length, now,
    el: mg.ph === 'play' ? clamp((now - mg.playAt) / dur, 0, 1) : 0,
    left: mg.ph === 'play' ? Math.max(0, mg.endAt - now) : dur,
    inp: pi => HOST.inp[pi] || { x: 0, y: 0 },
    press: pi => {
      if (isAI(st, ctx, pi)) { const v = HOST.bp[pi]; HOST.bp[pi] = false; return !!v; }
      const b = HOST.bn[pi] || 0; if (b > (HOST.lb[pi] || 0)) { HOST.lb[pi] = b; return true; } return false;
    },
    ai: pi => isAI(st, ctx, pi),
    name: pi => pname(st, pi),
    emit: (ev, log, cls) => ctx.emit(Object.assign(ev, { q: mg.seq }), log || '', cls),
    fx: ev => { HOST.fxq.push(ev); },
    dirty: () => { HOST.dirty = true; }
  };
}
function resetHost() { HOST.inp = []; HOST.bn = []; HOST.lb = []; HOST.bp = []; HOST.fxq = []; HOST.dirty = false; HOST.last = Date.now(); }
function mgBegin(st, ctx) {
  if (!st.bag.length) { let b = shuf(st.pool); if (b[0] === st.lastMg && b.length > 1) b.push(b.shift()); st.bag = b; }
  const id = st.bag.shift(); st.lastMg = id;
  const M = GAMES[id], now = Date.now();
  st.phase = 'mini'; st.pend = null;
  st.mg = { id, seq: ++st.mgSeq, ph: 'intro', introEnd: now + INTRO_MS, playAt: 0, endAt: 0, resEnd: 0, d: null, res: null };
  resetHost();
  st.mg.d = M.init(makeH(st, ctx));
  ctx.emit({ t: 'mgintro', id, q: st.mg.seq }, `🎮 Mini oyun: ${M.icon} ${M.name}!`, 'gold');
  sync(st, ctx);
  runMg(st, ctx);
}
function runMg(st, ctx) {
  const id = ++HOST.loop; HOST.last = Date.now();
  const step = () => {
    if (HOST.loop !== id || st.phase !== 'mini' || !st.mg) return;
    try { mgTick(st, ctx); } catch (e) { console.error(e); }
    if (HOST.loop === id && st.phase === 'mini') ctx.later(MG_TICK, step);
  };
  ctx.later(MG_TICK, step);
}
function mgTick(st, ctx) {
  const mg = st.mg, M = GAMES[mg.id], now = Date.now(), dt = clamp((now - HOST.last) / 1000, 0, .12);
  HOST.last = now;
  let dirty = false;
  if (mg.ph === 'intro' && now >= mg.introEnd) {
    mg.ph = 'play'; mg.playAt = now; mg.endAt = now + M.dur * 1000;
    const H = makeH(st, ctx); if (M.start) M.start(mg.d, H);
    ctx.emit({ t: 'mggo', q: mg.seq }); dirty = true;
  }
  if (mg.ph === 'play') {
    const H = makeH(st, ctx);
    for (let pi = 0; pi < H.n; pi++) {
      if (!H.ai(pi) || !M.bot) continue;
      const o = M.bot(mg.d, pi, H, dt);
      if (!o) continue;
      if (M.kind === 'own') hostMove(M, mg.d, pi, o, dt, H);
      else { HOST.inp[pi] = { x: o.x || 0, y: o.y || 0 }; if (o.press) HOST.bp[pi] = true; }
    }
    if (M.tick) M.tick(mg.d, H, dt);
    if ((M.done && M.done(mg.d, H)) || now >= mg.endAt) { mgFinish(st, ctx); dirty = true; }
  } else if (mg.ph === 'result' && now >= mg.resEnd) { mgClose(st, ctx); return; }
  if (st.phase !== 'mini' || !st.mg) return;
  if (now - HOST.lastSnap >= SNAP_MS || dirty) { HOST.lastSnap = now; mgBroadcast(st, ctx); }
  if (dirty || HOST.dirty || now - HOST.lastSync >= 1000) { HOST.dirty = false; HOST.lastSync = now; ctx.sync(); }
}
function hostMove(M, d, pi, inp, dt, H) {
  const q = d.p[pi]; if (!q) return;
  if ((M.id === 'bomba' || M.id === 'meyve') && H.now < d.st[pi]) return;
  const o = { x: q[0], y: q[1], h: q[2] || 0 };
  if (M.id === 'bomba') M.move(o, inp, dt, { d: { hold: d.hold }, me: pi }); else M.move(o, inp, dt, { d: { st: [] }, me: pi });
  q[0] = Math.round(o.x * 10) / 10; q[1] = Math.round(o.y * 10) / 10; d.pt[pi] = H.now;
}
function mgBroadcast(st, ctx) {
  const mg = st.mg, M = GAMES[mg.id], H = makeH(st, ctx);
  const pkt = { t: 's', q: mg.seq, ht: H.now, d: M.snap(mg.d, H), fx: HOST.fxq.splice(0) };
  if (uiRef) { clientSnap(pkt); if (uiRef.mode === 'online' && uiRef.fast) { try { uiRef.fast(pkt); } catch { /* */ } } }
}
function rewardFor(rank, n) { return rank === 0 ? 10 : Math.max(1, Math.round(7 * (n - 1 - rank) / Math.max(1, n - 1))); }
function mgFinish(st, ctx) {
  const mg = st.mg, M = GAMES[mg.id], H = makeH(st, ctx), n = st.players.length;
  const sc = M.score(mg.d, H), pts = sc.pts.map(v => Math.round(v * 100) / 100);
  const rank = pts.map(v => pts.filter(w => w > v).length);
  const rew = rank.map(r => rewardFor(r, n)), kupa = rank.map(r => (st.mode === 'mini' && r === 0 ? 1 : 0));
  rew.forEach((k, i) => { addKeys(st, i, k); st.P[i].kupa += kupa[i]; if (rank[i] === 0) st.P[i].stat.mgw++; });
  mg.res = { rank, rew, kupa, lab: sc.lab };
  mg.ph = 'result'; mg.resEnd = Date.now() + RES_MS;
  const win = rank.map((r, i) => r === 0 ? i : -1).filter(i => i >= 0);
  ctx.emit({ t: 'mgend', q: mg.seq, win }, `🏁 ${M.name}: ${win.map(i => pname(st, i)).join(', ')} birinci oldu! (+${rew[win[0]]} 🔑${st.mode === 'mini' ? ' +1 🏆' : ''})`, 'gold');
}
function mgClose(st, ctx) {
  st.mg = null; st.round++;
  if (st.round > st.rounds) { finishGame(st, ctx); return; }
  if (st.mode === 'mini') { ctx.emit({ t: 'round', r: st.round }, `Tur ${st.round}/${st.rounds}`); mgBegin(st, ctx); return; }
  st.cur = 0;
  ctx.emit({ t: 'round', r: st.round }, `— Tur ${st.round}/${st.rounds} başlıyor —`, 'gold');
  startTurn(st, ctx);
}
// Hızlı kanaldan (ya da yerelde doğrudan) gelen girdi
function hostInput(seat, m, cid) {
  const R0 = window.CFX && window.CFX.Room, g = R0 && R0.game;
  if (!g || !g.state || g.def.id !== 'partitahtasi' || !R0.isRunner() || g.result) return;
  if (cid !== undefined && (!g.players[seat] || g.players[seat].cid !== cid)) return;
  const st = g.state; if (st.phase !== 'mini' || !st.mg || st.mg.ph !== 'play' || m.q !== st.mg.seq) return;
  const M = GAMES[st.mg.id];
  HOST.inp[seat] = { x: clamp(+m.jx || 0, -1, 1), y: clamp(+m.jy || 0, -1, 1) };
  if (Number.isFinite(+m.bn)) HOST.bn[seat] = Math.max(HOST.bn[seat] || 0, +m.bn);
  if (M.kind === 'own' && M.pos && Number.isFinite(+m.x)) M.pos(st.mg.d, seat, m, makeH(st, R0.ctx()));
}

/* ------------------------------------------------------------------ kurallar nesnesi */
const RULES = {
  setup(players, opts, ctx) {
    opts = opts || {};
    const n = players.length, mode = opts.mod === 'mini' ? 'mini' : 'board';
    const st = {
      v: 1, mode, board: BOARDS[opts.tahta] ? opts.tahta : 'seker', rounds: optNum(opts.tur, [5, 10, 15, 20], 10), round: 1,
      players: players.map((p, i) => ({ name: p.name, color: p.color, isBot: !!p.isBot, an: ANIMALS[i % ANIMALS.length] })),
      P: [], cur: 0, phase: 'pre', chest: 0, traps: [], dice: null, mv: null, branch: null, used: false, dbl: false, rocket: 0,
      mg: null, mgSeq: 0, bag: [], pool: ORDER.slice(), lastMg: null, pend: null, pendId: 0, autoPend: false, turnN: 0
    };
    if (opts.mini && GAMES[opts.mini]) st.pool = [opts.mini];
    const B = BRD(st);
    st.P = players.map(() => ({ node: B.start, keys: START_KEYS, kupa: 0, hp: HP_MAX, items: [], auto: false, stat: { keys: 0, faint: 0, hits: 0, mgw: 0 } }));
    moveChest(st, true);
    void n;
    if (mode === 'mini') mgBegin(st, ctx); else startTurn(st, ctx);
    return st;
  },
  action(st, pi, a, ctx) {
    if (!a || typeof a.t !== 'string' || st.phase === 'over') return;
    if (a.t === 'mg') {
      if (st.phase !== 'mini' || !st.mg || st.mg.ph !== 'play' || a.q !== st.mg.seq) return;
      const M = GAMES[st.mg.id]; if (M.act) M.act(st.mg.d, pi, a, makeH(st, ctx));
      return;
    }
    if (RULES.turnOf(st) !== pi) return;
    if (a.t === 'roll' && st.phase === 'pre') doRoll(st, ctx);
    else if (a.t === 'use') useItem(st, ctx, pi, a);
    else if (a.t === 'branch' && st.phase === 'branch') {
      const to = +a.to; if (!st.branch || !st.branch.some(o => o.to === to)) return;
      st.mv.choice = to; st.branch = null; st.phase = 'move';
      schedule(st, ctx, 200, 'step'); sync(st, ctx);
    } else if (a.t === 'kupa') buyKupa(st, ctx, pi, !!a.yes);
    else if (a.t === 'buy') shopBuy(st, ctx, pi, a.k || null);
  },
  view(st, viewer) {
    const n = st.players.length, me = Number.isInteger(viewer) && viewer >= 0 && viewer < n ? viewer : -1;
    let mg = null;
    if (st.mg) { const M = GAMES[st.mg.id], m = st.mg; mg = { id: m.id, seq: m.seq, ph: m.ph, introEnd: m.introEnd, playAt: m.playAt, endAt: m.endAt, resEnd: m.resEnd, snap: m.d ? M.snap(m.d, { now: Date.now(), n }) : null, res: m.res }; }
    return {
      me, mode: st.mode, board: st.board, rounds: st.rounds, round: st.round, phase: st.phase, cur: st.cur, chest: st.chest, turnN: st.turnN,
      traps: st.traps.map(t => ({ n: t.n, o: t.o })), dice: st.dice, left: st.mv ? st.mv.left : 0, branch: st.phase === 'branch' ? st.branch : null,
      used: st.used, dbl: st.dbl, rocket: st.rocket,
      players: st.players.map((p, i) => { const q = st.P[i]; return { name: p.name, color: p.color, isBot: p.isBot, an: p.an, node: q.node, keys: q.keys, kupa: q.kupa, hp: q.hp, ni: q.items.length, items: i === me ? q.items.slice() : null, auto: q.auto }; }),
      mg
    };
  },
  turnOf(st) { return ['pre', 'branch', 'kupa', 'shop'].includes(st.phase) ? st.cur : null; },
  botAct,
  botDelay: 850,
  skipTurn(st, pi, ctx) { st.P[pi].auto = true; botAct(st, pi, ctx); },
  onPresence(st, pi, online, ctx) { if (online && st.P[pi]) { st.P[pi].auto = false; } else if (!online) autoCheck(st, ctx); },
  resume(st, ctx) {
    st.autoPend = false;
    if (st.phase === 'mini' && st.mg) { resetHost(); runMg(st, ctx); return; }
    if (st.pend && PEND[st.pend.fn]) { const p = st.pend; schedule(st, ctx, clamp(p.at - Date.now(), 50, 3000), p.fn); }
    autoCheck(st, ctx);
  }
};

/* ================================================================== ARAYÜZ (her cihaz) */
let root = null, ui = null, V = null;
let stageEl = null, cv = null, cg = null, sw = 300, sh = 300, dpr = 1, raf = 0, ro = null, hudT = null;
let cam = { x: 0, y: 0, s: .6 }, overview = false, snapCam = true, boardImg = null, boardImgId = '';
let disp = [], anims = [], lastT = 0, lastTurnKey = '', sheetKey = '', panelKey = '', chipsKey = '', lastSec = -1, targetMode = false;
let keys = new Set(), joy = { on: false, id: null, bx: 0, by: 0, dx: 0, dy: 0 }, joyEl = null, mbtn = null;
const CL = { seq: -1, snaps: [], local: {}, own: null, bn: 0, lastSend: 0, sent: null, prev: [], lastMode: '' };
const pnow = () => performance.now();
const hostNow = () => (ui && ui.hostNow ? ui.hostNow() : Date.now());
const q = s => root && root.querySelector(s);
const isTouch = () => (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
const phoneW = () => innerWidth < 760;
const myTurn = () => V && V.me >= 0 && V.cur === V.me && ['pre', 'branch', 'kupa', 'shop'].includes(V.phase);
const snd = {
  ok() { return Sound.ctx && Sound.enabled && Sound.ctx.state === 'running'; },
  hop() { if (!this.ok()) return; Sound.tone(440 + Math.random() * 120, .07, { type: 'triangle', gain: .12, slide: 760 }); },
  coin() { if (!this.ok()) return; Sound.tone(1320, .06, { type: 'square', gain: .07 }); Sound.tone(1760, .16, { type: 'triangle', gain: .14, when: .06 }); },
  dice() { if (!this.ok()) return; for (let i = 0; i < 6; i++) Sound.noise(.04, { freq: 2600 + i * 200, q: 3, gain: .25, when: i * .07 }); },
  jump() { if (!this.ok()) return; Sound.tone(360, .16, { type: 'square', gain: .07, slide: 900 }); },
  dig() { if (!this.ok()) return; Sound.noise(.18, { filter: 'lowpass', freq: 900, gain: .4 }); },
  zap() { if (!this.ok()) return; Sound.tone(1400, .35, { type: 'sawtooth', gain: .08, slide: 120 }); Sound.noise(.25, { freq: 5000, q: 1, gain: .2 }); },
  boom() { if (!this.ok()) return; Sound.noise(.8, { filter: 'lowpass', freq: 420, gain: .7, decayPow: 2 }); Sound.tone(120, .5, { type: 'sawtooth', gain: .12, slide: 40 }); },
  splash() { if (!this.ok()) return; Sound.noise(.6, { filter: 'bandpass', freq: 700, q: .8, gain: .45, decayPow: 1.6 }); },
  punch() { if (!this.ok()) return; Sound.noise(.15, { filter: 'lowpass', freq: 600, gain: .7 }); Sound.tone(160, .2, { type: 'square', gain: .1, slide: 60 }); },
  pop() { if (!this.ok()) return; Sound.tone(520, .09, { type: 'square', gain: .1, slide: 980 }); },
  tp() { if (!this.ok()) return; Sound.tone(300, .3, { type: 'sine', gain: .12, slide: 1600 }); Sound.tone(900, .2, { type: 'triangle', gain: .08, when: .12, slide: 2400 }); }
};
function sfx(name) { if (snd[name]) snd[name](); else if (name === 'tick') Sound.tick(.5); else if (Sound[name]) Sound[name](); }

/* ---- tahta çizimi: arka plan önbelleği ---- */
function farFromPath(B, x, y, m) {
  for (const n of B.nodes) { if (dist(n.x, n.y, x, y) < m) return false; for (const t of n.next) { const o = B.nodes[t], vx = o.x - n.x, vy = o.y - n.y, L = vx * vx + vy * vy, u = clamp(((x - n.x) * vx + (y - n.y) * vy) / (L || 1), 0, 1); if (dist(n.x + vx * u, n.y + vy * u, x, y) < m * .75) return false; } }
  return true;
}
function decoSpots(B, seed, count, m) { const r = mulberry(seed), out = []; let k = 0; while (out.length < count && k++ < count * 40) { const x = 40 + r() * (BW - 80), y = 40 + r() * (BH - 80); if (farFromPath(B, x, y, m) && out.every(o => dist(o[0], o[1], x, y) > m * 1.1)) out.push([x, y, r()]); } return out; }
function drawLollipop(g, x, y, s, c1, c2) { g.strokeStyle = '#fff'; g.lineWidth = 7 * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 70 * s); g.stroke(); D.circle(g, x, y, 30 * s, c1, '#fff', 4 * s); g.strokeStyle = c2; g.lineWidth = 7 * s; g.beginPath(); for (let a = 0; a < 12; a += .2) { const r = a * 2.4 * s; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.stroke(); }
function drawDonut(g, x, y, s) { D.shadow(g, x + 4, y + 10, 40 * s, 14 * s); D.circle(g, x, y, 36 * s, '#e3a25a'); D.circle(g, x, y - 3 * s, 32 * s, '#ff7ab8'); D.circle(g, x, y - 3 * s, 12 * s, '#e3a25a'); D.circle(g, x, y - 3 * s, 9 * s, '#2fd6e8'); const cols = ['#fff', '#ffe14a', '#19e3d0', '#8b3dff']; for (let i = 0; i < 14; i++) { const a = i * 2.3, r = 20 * s + (i % 3) * 3 * s; g.save(); g.translate(x + Math.cos(a) * r, y - 3 * s + Math.sin(a) * r); g.rotate(a); D.rr(g, -4 * s, -1.5 * s, 8 * s, 3 * s, 1.5, cols[i % 4]); g.restore(); } }
function drawCupcake(g, x, y, s) { D.shadow(g, x, y + 30 * s, 34 * s, 10 * s); g.fillStyle = '#ff9ec7'; g.beginPath(); g.moveTo(x - 28 * s, y); g.lineTo(x + 28 * s, y); g.lineTo(x + 20 * s, y + 32 * s); g.lineTo(x - 20 * s, y + 32 * s); g.closePath(); g.fill(); g.strokeStyle = '#d0558f'; g.lineWidth = 2; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x + i * 10 * s, y); g.lineTo(x + i * 7 * s, y + 32 * s); g.stroke(); } D.circle(g, x - 14 * s, y - 6 * s, 16 * s, '#fff6fb'); D.circle(g, x + 14 * s, y - 6 * s, 16 * s, '#fff6fb'); D.circle(g, x, y - 18 * s, 18 * s, '#fff6fb'); D.circle(g, x, y - 38 * s, 7 * s, '#ff2d55'); }
function drawCane(g, x, y, s) { g.lineCap = 'round'; g.strokeStyle = '#fff'; g.lineWidth = 12 * s; g.beginPath(); g.moveTo(x, y + 60 * s); g.lineTo(x, y); g.arc(x + 14 * s, y, 14 * s, Math.PI, 0); g.stroke(); g.strokeStyle = '#ff2d55'; g.lineWidth = 12 * s; g.setLineDash([8 * s, 10 * s]); g.stroke(); g.setLineDash([]); g.lineCap = 'butt'; }
function drawPlanet(g, x, y, r, c, ring) { D.glow(g, x, y, r * 1.8, c + '55'); const gr = g.createRadialGradient(x - r * .4, y - r * .4, r * .1, x, y, r); gr.addColorStop(0, shade(c, .5)); gr.addColorStop(1, shade(c, -.4)); D.circle(g, x, y, r, gr); if (ring) { g.save(); g.translate(x, y); g.rotate(-.35); g.strokeStyle = 'rgba(255,230,170,.8)'; g.lineWidth = r * .14; g.beginPath(); g.ellipse(0, 0, r * 1.7, r * .45, 0, 0, TAU); g.stroke(); g.restore(); } }
function drawCastle(g, x, y) {
  D.glow(g, x, y, 330, 'rgba(139,61,255,.35)');
  const wall = '#2a1d5e', edge = '#19e3d0';
  D.rr(g, x - 230, y - 110, 460, 230, 30, wall, edge, 4);
  [[-230, -180, 70, 300], [160, -180, 70, 300], [-60, -250, 120, 140]].forEach(([dx, dy, w, h]) => { D.rr(g, x + dx, y + dy, w, h, 16, '#352672', edge, 3); g.fillStyle = '#ff3fa4'; g.beginPath(); g.moveTo(x + dx - 10, y + dy + 4); g.lineTo(x + dx + w / 2, y + dy - 60); g.lineTo(x + dx + w + 10, y + dy + 4); g.closePath(); g.fill(); g.strokeStyle = '#ffd1ea'; g.lineWidth = 2; g.stroke(); });
  for (let i = 0; i < 9; i++) { const wx = x - 200 + i * 50; D.rr(g, wx, y - 60, 22, 30, 10, i % 3 ? '#ffe14a' : '#19e3d0'); }
}
function prerenderBoard(B) {
  const k = clamp((window.devicePixelRatio || 1), 1, 1.5);
  const c = document.createElement('canvas'); c.width = Math.round(BW * k); c.height = Math.round(BH * k);
  const g = c.getContext('2d'); g.scale(k, k);
  const loopPts = B.nodes.filter((n, i) => i < B.def.loop.types.length).map(n => [n.x, n.y]);
  if (B.id === 'seker') {
    const sea = g.createLinearGradient(0, 0, 0, BH); sea.addColorStop(0, '#36d8ec'); sea.addColorStop(1, '#1688c4'); g.fillStyle = sea; g.fillRect(0, 0, BW, BH);
    const r = mulberry(7); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; for (let i = 0; i < 60; i++) { const x = r() * BW, y = r() * BH; g.beginPath(); g.arc(x, y, 14, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    // ada
    g.save(); g.lineJoin = 'round';
    g.beginPath(); loopPts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.strokeStyle = '#fff3c4'; g.lineWidth = 300; g.stroke(); g.fillStyle = '#fff3c4'; g.fill();
    g.strokeStyle = '#ffd6ea'; g.lineWidth = 250; g.stroke(); g.fillStyle = '#ffd6ea'; g.fill();
    g.strokeStyle = '#ffc2df'; g.lineWidth = 200; g.stroke();
    g.restore();
    D.ell(g, 800, 1045, 140, 70, '#ffd6ea');
    for (let i = 0; i < 40; i++) D.circle(g, 300 + r() * 1000, 330 + r() * 440, 6 + r() * 10, ['#ffe9f4', '#fff6b0', '#d9f7ff'][i % 3]);
    decoSpots(B, 11, 22, 95).forEach(([x, y, v], i) => { const s = .8 + v * .5; [() => drawLollipop(g, x, y - 30, s, '#ff5fa2', '#fff'), () => drawDonut(g, x, y, s), () => drawCupcake(g, x, y, s), () => drawCane(g, x, y - 30, s), () => drawLollipop(g, x, y - 30, s, '#19e3d0', '#ffe14a')][i % 5](); });
  } else {
    const bg = g.createLinearGradient(0, 0, BW, BH); bg.addColorStop(0, '#120840'); bg.addColorStop(1, '#05021a'); g.fillStyle = bg; g.fillRect(0, 0, BW, BH);
    const r = mulberry(5);
    D.glow(g, 300, 700, 420, 'rgba(255,63,164,.22)'); D.glow(g, 1300, 300, 460, 'rgba(25,227,208,.18)'); D.glow(g, 900, 900, 380, 'rgba(139,61,255,.25)');
    for (let i = 0; i < 260; i++) D.circle(g, r() * BW, r() * BH, r() * 1.8 + .4, `rgba(255,255,255,${.4 + r() * .6})`);
    drawPlanet(g, 1500, 90, 70, '#ff8a00', true); drawPlanet(g, 90, 1030, 55, '#5aa2ff', false); drawPlanet(g, 1530, 1040, 34, '#2bd96b', false);
    drawCastle(g, 800, 560);
    decoSpots(B, 3, 14, 90).forEach(([x, y, v]) => { const s = 12 + v * 22; D.circle(g, x, y, s, '#4b3f6e', '#2a2245', 3); D.circle(g, x - s * .3, y - s * .2, s * .25, '#3a3058'); D.circle(g, x + s * .35, y + s * .3, s * .18, '#3a3058'); });
  }
  // yollar
  const edges = []; B.nodes.forEach(n => n.next.forEach(m => edges.push([n, B.nodes[m]])));
  const seg = (w, col, dash) => { g.lineCap = 'round'; g.strokeStyle = col; g.lineWidth = w; if (dash) g.setLineDash(dash); edges.forEach(([a, b]) => { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }); g.setLineDash([]); };
  if (B.id === 'seker') { seg(40, '#b5487a'); seg(30, '#ffffff'); seg(30, '#ff8fc0', [16, 16]); }
  else { seg(44, 'rgba(25,227,208,.18)'); seg(26, '#1b1036'); seg(26, 'rgba(25,227,208,.55)', [4, 18]); seg(4, '#19e3d0'); }
  // yön okları
  edges.forEach(([a, b]) => { const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, an = Math.atan2(b.y - a.y, b.x - a.x); g.save(); g.translate(mx, my); g.rotate(an); g.fillStyle = B.id === 'seker' ? '#b5487a' : '#ffe14a'; g.beginPath(); g.moveTo(8, 0); g.lineTo(-5, -7); g.lineTo(-5, 7); g.closePath(); g.fill(); g.restore(); });
  // kareler
  B.nodes.forEach(n => {
    const S = SPACES[n.t], big = n.t === 's' || n.t === 'S', rr = big ? 36 : 29;
    D.shadow(g, n.x + 3, n.y + 9, rr + 2, rr * .45, .35);
    if (B.id === 'seker') { const gr = g.createRadialGradient(n.x - 8, n.y - 10, 4, n.x, n.y, rr); gr.addColorStop(0, shade(S.col, .55)); gr.addColorStop(1, S.col); D.circle(g, n.x, n.y, rr, gr, '#ffffff', 5); }
    else { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; g.lineTo(n.x + Math.cos(a) * rr, n.y + Math.sin(a) * rr); } g.closePath(); const gr = g.createRadialGradient(n.x, n.y - 8, 4, n.x, n.y, rr); gr.addColorStop(0, shade(S.col, .4)); gr.addColorStop(1, shade(S.col, -.25)); g.fillStyle = gr; g.fill(); g.strokeStyle = shade(S.col, .6); g.lineWidth = 4; g.stroke(); }
    emoji(g, S.icon, n.x, n.y + 1, big ? 30 : 24);
    if (n.t === 's' || n.t === 'S' || n.t === 'g') { g.font = `900 13px ${MINI.FONT_B}`; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(20,8,40,.85)'; const lab = n.t === 's' ? 'MAĞAZA' : n.t === 'S' ? 'BAŞLA' : 'MEZARLIK'; g.strokeText(lab, n.x, n.y + rr + 14); g.fillStyle = '#fff'; g.fillText(lab, n.x, n.y + rr + 14); }
  });
  return c;
}
function ensureBoard() { if (!V) return; if (boardImgId !== V.board) { boardImgId = V.board; boardImg = prerenderBoard(buildBoard(V.board)); } }

/* ---- piyon konumları ve animasyon ---- */
function stackOff(i, nodeId) {
  const same = V.players.map((p, j) => j).filter(j => V.players[j].node === nodeId);
  if (same.length <= 1) return [0, 0];
  const k = same.indexOf(i), a = k / same.length * TAU + (same.length === 2 ? Math.PI : -Math.PI / 2), r = same.length > 4 ? 32 : same.length > 2 ? 27 : 23;
  return [Math.cos(a) * r, Math.sin(a) * r * .7];
}
function syncDisp() {
  const B = buildBoard(V.board), t = pnow();
  V.players.forEach((p, i) => {
    const n = B.nodes[p.node]; if (!n) return;
    const [ox, oy] = stackOff(i, p.node), tx = n.x + ox, ty = n.y + oy;
    let d = disp[i];
    if (!d) { disp[i] = { x: tx, y: ty, fx: tx, fy: ty, tx, ty, t0: 0, dur: 1, node: p.node, hop: 0 }; return; }
    if (d.node === p.node && Math.abs(d.tx - tx) < .5 && Math.abs(d.ty - ty) < .5) return;
    const adj = d.node === p.node || (B.nodes[d.node] && B.nodes[d.node].next.includes(p.node));
    if (!adj && d.node !== p.node) { anims.push({ k: 'poof', x: d.x, y: d.y, t0: t, dur: 600, col: p.color }, { k: 'poof', x: tx, y: ty, t0: t, dur: 600, col: p.color }); d.x = d.fx = tx; d.y = d.fy = ty; d.tx = tx; d.ty = ty; d.t0 = 0; d.node = p.node; return; }
    d.fx = d.x; d.fy = d.y; d.tx = tx; d.ty = ty; d.t0 = t; d.dur = d.node === p.node ? 250 : 290; d.hop = d.node === p.node ? 0 : 1; d.node = p.node;
  });
}
function stepDisp(t) {
  disp.forEach(d => { if (!d || !d.t0) return; const u = clamp((t - d.t0) / d.dur, 0, 1), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; d.x = d.fx + (d.tx - d.fx) * e; d.y = d.fy + (d.ty - d.fy) * e; d.z = d.hop ? Math.sin(u * Math.PI) * 26 : 0; if (u >= 1) { d.t0 = 0; d.z = 0; } });
}

/* ---- kamera ---- */
function camScaleBoard() { if (overview) return Math.min(sw / BW, sh / BH) * 1.02; return phoneW() ? clamp(sw / 640, .42, 1) : clamp(Math.max(sw / 1150, Math.min(sw / BW, sh / BH) * 1.25), .45, 1); }
function camFocus() {
  if (!V) return [BW / 2, BH / 2];
  if (overview) return [BW / 2, BH / 2];
  const i = V.cur, d = disp[i], sh2 = q('.pt-sheet');
  const off = sh2 && !sh2.hidden ? Math.min(sh * .5, sh2.offsetHeight) / 2 / Math.max(.2, cam.s) : 0;
  if (d) return [d.x, d.y - 20 + off];
  return [BW / 2, BH / 2];
}
function camStep(dt) {
  const s = camScaleBoard(); cam.s = snapCam ? s : cam.s + (s - cam.s) * (1 - Math.exp(-dt * 5));
  const [fx, fy] = camFocus(), vw = sw / cam.s, vh = sh / cam.s;
  let tx = fx - vw / 2, ty = fy - vh / 2;
  const m = 40;
  tx = vw >= BW + 2 * m ? (BW - vw) / 2 : clamp(tx, -m, BW - vw + m);
  ty = vh >= BH + 2 * m ? (BH - vh) / 2 : clamp(ty, -m, BH - vh + m);
  const k = snapCam ? 1 : 1 - Math.exp(-dt * 6);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; snapCam = false;
}

/* ---- tahta karesi ---- */
function drawChest(g, x, y, t) {
  const bob = Math.sin(t / 380) * 4;
  D.glow(g, x, y - 30, 90, 'rgba(255,214,80,.55)');
  g.save(); g.globalAlpha = .35 + .15 * Math.sin(t / 300); g.fillStyle = 'rgba(255,230,140,.7)'; g.beginPath(); g.moveTo(x - 22, y); g.lineTo(x - 8, y - 160); g.lineTo(x + 8, y - 160); g.lineTo(x + 22, y); g.closePath(); g.fill(); g.restore();
  D.shadow(g, x, y + 12, 30, 10, .4);
  D.rr(g, x - 26, y - 22 + bob * .2, 52, 34, 8, '#b5651d', '#5a2e0a', 3); D.rr(g, x - 28, y - 34 + bob * .2, 56, 16, 8, '#d9822b', '#5a2e0a', 3); D.rr(g, x - 6, y - 26 + bob * .2, 12, 14, 3, '#ffd34a', '#8a5a00', 2);
  emoji(g, '🏆', x, y - 62 + bob, 40);
  for (let i = 0; i < 4; i++) { const a = t / 600 + i * TAU / 4; D.star(g, x + Math.cos(a) * 34, y - 62 + bob + Math.sin(a) * 14, 5, '#fff6b0', null, t / 300); }
}
function drawBoard(g, t, dt) {
  const B = buildBoard(V.board);
  stepDisp(t); camStep(dt);
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, sw, sh);
  g.fillStyle = V.board === 'seker' ? '#1688c4' : '#05021a'; g.fillRect(0, 0, sw, sh);
  g.save(); g.scale(cam.s, cam.s); g.translate(-cam.x, -cam.y);
  if (boardImg) g.drawImage(boardImg, 0, 0, BW, BH);
  // dal seçenekleri
  if (V.phase === 'branch' && V.branch) V.branch.forEach((o, k) => { const n = B.nodes[o.to], a = .55 + .45 * Math.sin(t / 160); g.save(); g.globalAlpha = a; D.circle(g, n.x, n.y, 42, null, '#ffe14a', 6); g.restore(); D.rr(g, n.x - 18, n.y - 70, 36, 30, 10, '#ffe14a', '#7a4a00', 3); D.text(g, 'AB'[k] || '?', n.x, n.y - 55, 18, '#3a1500'); });
  // kapanlar
  V.traps.forEach(tr => { const n = B.nodes[tr.n], p = V.players[tr.o]; if (!n) return; D.circle(g, n.x + 22, n.y - 22, 17, 'rgba(20,8,40,.85)', p ? p.color : '#fff', 3); emoji(g, '🪤', n.x + 22, n.y - 22, 20); });
  // sandık
  const cn = B.nodes[V.chest]; if (cn) drawChest(g, cn.x, cn.y - 6, t);
  // piyonlar (y sırasına göre)
  const order = V.players.map((p, i) => i).sort((a, b) => (disp[a] ? disp[a].y : 0) - (disp[b] ? disp[b].y : 0));
  const leader = V.players.reduce((b, p, i) => (b < 0 || p.kupa > V.players[b].kupa || (p.kupa === V.players[b].kupa && p.keys > V.players[b].keys) ? i : b), -1);
  order.forEach(i => {
    const d = disp[i], p = V.players[i]; if (!d) return;
    const active = i === V.cur && V.phase !== 'mini';
    const tgt = targetMode && V.me >= 0 && i !== V.me && inGloveRange(i);
    drawPawn(g, { x: d.x, y: d.y - 8, z: d.z || 0, col: p.color, an: p.an, t, s: active ? 1.25 : 1.05, ring: tgt ? '#ff3b5c' : active ? '#ffe14a' : null, h: Math.PI / 2, bob: active && !d.t0 ? Math.abs(Math.sin(t / 260)) * 3 : 0, hat: p.kupa > 0 && i === leader ? 'crown' : null, mood: p.hp <= 8 ? 'dizzy' : null, label: i === V.me ? 'SEN' : (active ? p.name : null) });
    if (tgt) { D.text(g, '🥊', d.x, d.y - 66, 22, '#fff'); }
  });
  // kalan adım balonu
  if ((V.phase === 'move' || V.phase === 'branch') && V.left > 0 && disp[V.cur]) { const d = disp[V.cur]; D.circle(g, d.x + 30, d.y - 48, 17, '#ffe14a', '#7a4a00', 3); D.text(g, String(V.left), d.x + 30, d.y - 47, 16, '#3a1500'); }
  drawAnims(g, t);
  g.restore();
}
function inGloveRange(i) { if (!V || V.me < 0) return false; const B = buildBoard(V.board); return B.ud[V.players[V.me].node][V.players[i].node] <= 3; }
function drawAnims(g, t) {
  anims = anims.filter(a => t - a.t0 < a.dur);
  anims.forEach(a => {
    const u = (t - a.t0) / a.dur;
    if (a.k === 'text') { g.save(); g.globalAlpha = 1 - Math.max(0, u - .6) / .4; D.text(g, a.txt, a.x, a.y - 30 - u * 50, a.size || 24, a.col || '#fff', a.stroke || '#1b1036'); g.restore(); }
    else if (a.k === 'poof') { g.save(); g.globalAlpha = 1 - u; for (let i = 0; i < 8; i++) { const an = i * TAU / 8; D.circle(g, a.x + Math.cos(an) * u * 40, a.y - 10 + Math.sin(an) * u * 30, 10 * (1 - u) + 3, a.col || '#c77dff'); } g.restore(); }
    else if (a.k === 'ring') { g.save(); g.globalAlpha = 1 - u; D.circle(g, a.x, a.y, 10 + u * (a.r || 60), null, a.col || '#fff', 5); g.restore(); }
    else if (a.k === 'boom') { g.save(); g.globalAlpha = 1 - u; D.circle(g, a.x, a.y, 20 + u * 70, 'rgba(255,170,40,.6)'); D.circle(g, a.x, a.y, 10 + u * 40, 'rgba(255,240,180,.8)'); g.restore(); }
  });
}
function floatText(x, y, txt, col, size) { anims.push({ k: 'text', x, y, txt, col, size, t0: pnow(), dur: 1400 }); }
function pawnXY(i) { const d = disp[i]; return d ? [d.x, d.y] : [BW / 2, BH / 2]; }

/* ---- mini oyun çizimi ---- */
function mgWorld() {
  const top = 46, s = Math.min(sw / MINI.W, (sh - top - 4) / MINI.H), free = sh - top - MINI.H * s;
  return { s, ox: (sw - MINI.W * s) / 2, oy: top + (phoneW() ? Math.max(0, Math.min(free / 2, free - 170)) : free / 2) };
}
function clientSnap(pkt) {
  if (!pkt || pkt.t !== 's') return;
  if (pkt.q !== CL.seq) resetCL(pkt.q);
  CL.snaps.push({ t: pkt.ht, d: pkt.d }); if (CL.snaps.length > 8) CL.snaps.shift();
  (pkt.fx || []).forEach(fxEvent);
}
function resetCL(seq) { CL.seq = seq; CL.snaps = []; CL.local = {}; CL.own = null; CL.bn = 0; CL.lastSend = 0; CL.sent = null; CL.prev = []; joy.dx = joy.dy = 0; }
function interpSnap(M, now) {
  const S = CL.snaps;
  if (!S.length) return V.mg && V.mg.snap;
  if (M.kind === 'ui') return S[S.length - 1].d;
  const delay = ui && ui.mode === 'online' ? 110 : 55, rt = now - delay;
  let a = S[0], b = S[S.length - 1];
  for (let i = 0; i < S.length - 1; i++) if (S[i].t <= rt && S[i + 1].t >= rt) { a = S[i]; b = S[i + 1]; break; }
  if (rt >= b.t || a === b) return b.d;
  if (rt <= a.t) return a.d;
  const u = (rt - a.t) / Math.max(1, b.t - a.t), out = Object.assign({}, b.d);
  if (Array.isArray(a.d.p) && Array.isArray(b.d.p)) out.p = b.d.p.map((qb, i) => { const qa = a.d.p[i]; if (!qa) return qb; const r = qb.slice(); r[0] = qa[0] + (qb[0] - qa[0]) * u; r[1] = qa[1] + (qb[1] - qa[1]) * u; if (M.angIdx > 0) { let d2 = qb[M.angIdx] - qa[M.angIdx]; while (d2 > Math.PI) d2 -= TAU; while (d2 < -Math.PI) d2 += TAU; r[M.angIdx] = qa[M.angIdx] + d2 * u; } return r; });
  return out;
}
function mgR() {
  const mg = V.mg, M = GAMES[mg.id], now = hostNow();
  const d = interpSnap(M, now) || {};
  const R = { d, me: V.me, now, t: pnow(), own: CL.own, pl: V.players, phase: mg.ph, playAt: mg.playAt, endAt: mg.endAt, local: CL.local, pos: [],
    send: a => { if (ui) ui.send(Object.assign({ t: 'mg', q: mg.seq }, a)); }, toast: txt => toast(txt), sfx };
  if (Array.isArray(d.p)) {
    R.pos = d.p.map((qq, i) => {
      if (i === V.me && CL.own && M.kind === 'own') return [CL.own.x, CL.own.y, CL.own.h, CL.own.mv];
      const pv = CL.prev[i] || (CL.prev[i] = { x: qq[0], y: qq[1], h: Math.PI / 2, mv: 0 });
      const dx = qq[0] - pv.x, dy = qq[1] - pv.y, m = Math.hypot(dx, dy);
      if (m > .6) { pv.h = Math.atan2(dy, dx); pv.mv = 1; pv.at = R.t; } else if (R.t - (pv.at || 0) > 150) pv.mv = 0;
      pv.x = qq[0]; pv.y = qq[1];
      return [qq[0], qq[1], pv.h, pv.mv];
    });
  }
  return R;
}
function stepOwn(M, R, dt) {
  if (M.kind !== 'own' || V.me < 0 || !Array.isArray(R.d.p) || !R.d.p[V.me]) return;
  if (!CL.own) { const qq = R.d.p[V.me]; CL.own = { x: qq[0], y: qq[1], h: Math.PI / 2, mv: 0 }; R.own = CL.own; }
  if (R.phase !== 'play') return;
  const inp = readInput(), n = Math.max(1, Math.ceil(dt / .02));
  for (let k = 0; k < n; k++) M.move(CL.own, inp, dt / n, R);
}
function readInput() {
  let ix = 0, iy = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) ix -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) ix += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) iy -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) iy += 1;
  if (joy.on) { ix = joy.dx; iy = joy.dy; }
  const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
  return { x: ix, y: iy };
}
function sendInput(M, R, t) {
  if (!ui || V.me < 0 || R.phase !== 'play' || M.kind === 'ui') return;
  const inp = readInput(), o = CL.own;
  const msg = { t: 'u', q: V.mg.seq, jx: +inp.x.toFixed(2), jy: +inp.y.toFixed(2), bn: CL.bn };
  if (M.kind === 'own' && o) { msg.x = Math.round(o.x); msg.y = Math.round(o.y); }
  const key = JSON.stringify([msg.jx, msg.jy, msg.bn, msg.x, msg.y]);
  if (t - CL.lastSend < 95 || (key === CL.sent && t - CL.lastSend < 450)) return;
  CL.lastSend = t; CL.sent = key;
  if (ui.isHost) hostInput(V.me, msg);
  if (ui.mode === 'online' && ui.fast && !ui.isHost) ui.fast(msg);
}
function drawMini(g, t, dt) {
  const mg = V.mg, M = GAMES[mg.id];
  const R = mgR();
  stepOwn(M, R, dt);
  if (CL.own && M.kind === 'own' && R.pos[V.me]) R.pos[V.me] = [CL.own.x, CL.own.y, CL.own.h, CL.own.mv];
  sendInput(M, R, t);
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, sw, sh);
  g.fillStyle = '#0b0420'; g.fillRect(0, 0, sw, sh);
  const w = mgWorld();
  g.save(); g.translate(w.ox, w.oy); g.scale(w.s, w.s);
  g.save(); MINI.rrPath(g, 0, 0, MINI.W, MINI.H, 22); g.clip();
  try { M.draw(g, R); } catch (e) { console.error(e); }
  drawAnims(g, t);
  g.restore();
  g.restore();
  // düğme hazır mı
  if (mbtn) { const ready = M.btnReady ? M.btnReady(R) : true; mbtn.classList.toggle('cd', !ready); }
}

/* ---- ana çizim döngüsü ---- */
function frame(t) {
  raf = 0; if (!root || !cv || !V) return;
  const dt = clamp((t - (lastT || t)) / 1000, 0, .1); lastT = t;
  try { if (V.phase === 'mini' && V.mg) drawMini(cg, t, dt); else drawBoard(cg, t, dt); } catch (e) { console.error(e); }
  raf = requestAnimationFrame(frame);
}
function resize() {
  if (!stageEl || !cv) return;
  layout();
  const r = stageEl.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return;
  sw = r.width; sh = r.height; dpr = Math.min(2.5, window.devicePixelRatio || 1);
  cv.width = Math.round(sw * dpr); cv.height = Math.round(sh * dpr); snapCam = true;
}
function layout() {
  if (!stageEl || !V) return;
  const mini = V.phase === 'mini', ph = phoneW();
  const top = stageEl.getBoundingClientRect().top + (window.scrollY || 0);
  let h;
  if (ph) { const side = mini ? 0 : Math.min(230, (q('.pt-side') || { offsetHeight: 150 }).offsetHeight || 150); h = mini ? clamp(innerHeight - top - 10, 380, 900) : clamp(innerHeight - top - side - 22, 300, 620); }
  else h = clamp(innerHeight - top - 20, 470, 760);
  if (Math.abs(stageEl.offsetHeight - h) > 2) { stageEl.style.height = Math.round(h) + 'px'; }
}

/* ---- DOM: oyuncu çipleri, durum, paneller ---- */
function hpCol(hp) { return hp > 20 ? '#2bff88' : hp > 10 ? '#ffe14a' : '#ff3b5c'; }
function renderChips() {
  const el = q('.pt-chips'); if (!el) return;
  const key = JSON.stringify([V.players.map(p => [p.keys, p.kupa, p.hp, p.ni, p.auto, p.node]), V.cur, V.phase === 'mini', V.me]);
  if (key === chipsKey) return; chipsKey = key;
  el.classList.toggle('many', V.players.length >= 7);
  const order = V.players.map((p, i) => i).sort((a, b) => V.players[b].kupa - V.players[a].kupa || V.players[b].keys - V.players[a].keys);
  const rankOf = i => order.findIndex(j => V.players[j].kupa === V.players[i].kupa && V.players[j].keys === V.players[i].keys);
  el.innerHTML = V.players.map((p, i) => `<div class="pt-chip ${i === V.cur && V.phase !== 'mini' && V.phase !== 'over' ? 'active' : ''} ${i === V.me ? 'me' : ''}" style="--pc:${p.color}">
    <span class="pt-av" style="--pc:${p.color}">${ANIMAL_EMOJI[p.an]}<i>${rankOf(i) + 1}</i></span>
    <span class="pt-cb"><b>${esc(p.name)}${i === V.me ? ' <small>(sen)</small>' : ''}${p.auto ? ' <small>📴</small>' : ''}</b>
    <span class="pt-cs"><span title="Kupa">🏆${p.kupa}</span><span title="Anahtar">🔑${p.keys}</span>${V.mode === 'board' ? `<span title="Eşya">🎒${p.ni}</span>` : ''}</span>
    ${V.mode === 'board' ? `<span class="pt-hp" title="Can ${p.hp}/${HP_MAX}"><i style="width:${p.hp / HP_MAX * 100}%;background:${hpCol(p.hp)}"></i><em>${p.hp}</em></span>` : ''}</span></div>`).join('');
}
function phaseText() {
  const p = V.players[V.cur], nm = p ? esc(p.name) : '';
  switch (V.phase) {
    case 'pre': return myTurn() ? 'Eşya kullanabilir ya da zar atabilirsin.' : `${nm} hazırlanıyor…`;
    case 'rolling': return `${nm} zar atıyor…`;
    case 'move': return `${nm} ilerliyor · ${V.left} adım kaldı`;
    case 'branch': return myTurn() ? 'Yol ayrımı! Bir yol seç.' : `${nm} yol seçiyor…`;
    case 'kupa': return myTurn() ? 'Kupa sandığındasın!' : `${nm} Kupa sandığında…`;
    case 'shop': return myTurn() ? 'Mağazaya hoş geldin!' : `${nm} mağazada alışverişte…`;
    case 'land': return `${nm} kareye kondu.`;
    case 'mini': return V.mg ? `${GAMES[V.mg.id].icon} ${esc(GAMES[V.mg.id].name)}` : 'Mini oyun';
    case 'over': return 'Oyun bitti!';
    default: return '';
  }
}
function renderStatus() {
  const el = q('.pt-status'); if (!el) return;
  const mine = myTurn(), p = V.players[V.cur];
  let turn;
  if (V.phase === 'mini') turn = `<span class="g-turn mine">🎮 MİNİ OYUN!</span>`;
  else if (V.phase === 'over') turn = `<span class="g-turn win">🏁 Oyun bitti</span>`;
  else if (mine) turn = `<span class="g-turn mine">SIRA SENDE!</span>`;
  else turn = `<span class="g-turn"><span class="av" style="--pc:${p.color}">${ANIMAL_EMOJI[p.an]}</span>Sıra: ${esc(p.name)}</span>`;
  el.innerHTML = `<span class="pt-round">${V.mode === 'mini' ? 'MİNİ' : 'TUR'} ${Math.min(V.round, V.rounds)}/${V.rounds}</span>${turn}<span class="pt-ptxt">${phaseText()}</span>`;
}
function itemCard(k, idx, can, why) {
  const it = ITEMS[k];
  return `<button type="button" class="pt-item" data-use="${k}" ${can ? '' : 'disabled'} title="${esc(it.desc)}"><span class="pt-ii">${it.icon}</span><b>${esc(it.name)}</b><small>${esc(why || it.desc)}</small></button>`;
}
function itemUsable(k) {
  const me = V.players[V.me], B = buildBoard(V.board);
  if (k === 'kalkan') return [false, 'Pasif: kendiliğinden korur'];
  if (!myTurn() || V.phase !== 'pre' || V.used) return [false, V.used ? 'Bu tur eşya kullandın' : null];
  if (k === 'eldiven') { const any = V.players.some((p, i) => i !== V.me && B.ud[me.node][p.node] <= 3); return [any, any ? 'Dokun, hedef seç' : '3 kare içinde rakip yok']; }
  if (k === 'kapan') { const ok = B.nodes[me.node].t !== 'S' && !V.traps.some(tr => tr.n === me.node); return [ok, ok ? 'Bu kareye kur' : 'Bu kareye kurulamaz']; }
  if (k === 'miknatis') { if (V.players.length < 2) return [false, null]; return [true, null]; }
  return [true, null];
}
function renderPanel() {
  const el = q('.pt-act'); if (!el) return;
  const me = V.me >= 0 ? V.players[V.me] : null;
  const key = JSON.stringify([V.phase, V.cur, V.me, me && me.items, V.used, V.dbl, V.rocket, me && me.node, V.traps.length, targetMode, V.players.map(p => p.node)]);
  if (key === panelKey) return; panelKey = key;
  if (V.phase === 'mini' || V.phase === 'over') { el.innerHTML = renderMiniSide(); return; }
  let h = '';
  const mine = myTurn();
  if (mine && V.phase === 'pre' && !targetMode) {
    h += `<button type="button" class="btn btn-spin pt-roll" data-a="roll">🎲 ZAR AT${V.dbl ? ' ×2' : ''}${V.rocket ? ' +8🚀' : ''}</button>`;
  } else if (V.phase === 'pre' || V.phase === 'rolling' || V.phase === 'move' || V.phase === 'land' || V.phase === 'branch' || V.phase === 'kupa' || V.phase === 'shop') {
    const p = V.players[V.cur];
    h += `<div class="pt-wait"><span class="pt-av" style="--pc:${p.color}">${ANIMAL_EMOJI[p.an]}</span><span>${mine ? 'Seçimini yap!' : `${esc(p.name)} oynuyor…`}</span></div>`;
  }
  if (me) {
    h += `<div class="pt-hand"><div class="pt-hh">🎒 Eşyaların <small>${me.items.length}/${MAX_ITEMS} · yalnızca sen görürsün</small></div>`;
    if (targetMode) {
      const B = buildBoard(V.board), tg = V.players.map((p, i) => i).filter(i => i !== V.me && B.ud[me.node][V.players[i].node] <= 3);
      h += `<div class="pt-targets"><p>🥊 Kime vuracaksın?</p>${tg.map(i => `<button type="button" class="pt-tgt" data-tgt="${i}" style="--pc:${V.players[i].color}"><span class="pt-av" style="--pc:${V.players[i].color}">${ANIMAL_EMOJI[V.players[i].an]}</span>${esc(V.players[i].name)} <small>🔑${V.players[i].keys} ❤️${V.players[i].hp}</small></button>`).join('')}<button type="button" class="btn btn-ghost pt-cancel" data-a="cancel">Vazgeç</button></div>`;
    } else if (!me.items.length) h += '<p class="pt-empty">Çantan boş. 🎁 kutularından ya da 🛒 mağazadan eşya edinebilirsin.</p>';
    else h += `<div class="pt-items">${me.items.map((k, i) => { const [can, why] = itemUsable(k); return itemCard(k, i, can, why); }).join('')}</div>`;
    h += '</div>';
  }
  el.innerHTML = h;
}
function renderMiniSide() {
  if (V.phase === 'over') return '<p class="pt-empty">Oyun bitti! Sonuçlara bak.</p>';
  const mg = V.mg; if (!mg) return '';
  const M = GAMES[mg.id];
  return `<div class="pt-mside"><div class="pt-mh"><span>${M.icon}</span><b>${esc(M.name)}</b></div><p>${esc(M.desc)}</p><p class="pt-ctl">${isTouch() ? '👆 ' + esc(M.ctl.touch) : '⌨️ ' + esc(M.ctl.key)}</p><div class="pt-rew">Ödül: 🥇 +10 🔑 · sonra sıraya göre${V.mode === 'mini' ? ' · birinciye +1 🏆' : ''}</div></div>`;
}
function renderSheet() {
  const el = q('.pt-sheet'); if (!el) return;
  const mine = myTurn(), me = V.me >= 0 ? V.players[V.me] : null;
  const key = JSON.stringify([V.phase, V.cur, mine, me && me.keys, me && me.items, V.branch]);
  if (key === sheetKey) return; sheetKey = key;
  let h = '';
  if (mine && V.phase === 'branch' && V.branch) {
    const B = buildBoard(V.board), from = B.nodes[me.node];
    const arrow = n => { const a = Math.atan2(n.y - from.y, n.x - from.x), k = Math.round((a + Math.PI) / (Math.PI / 4)) % 8; return ['⬅️', '↖️', '⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️'][k]; };
    h = `<div class="pt-sh"><h3>🔀 Yol ayrımı</h3><p>Kalan adım: <b>${V.left}</b>. Kupa sandığına uzaklığa göre seç!</p><div class="pt-opts">${V.branch.map((o, k) => { const n = B.nodes[o.to]; return `<button type="button" class="btn ${k ? 'btn-solve' : 'btn-vowel'} pt-opt" data-br="${o.to}"><b>${'AB'[k]}</b> ${arrow(n)} ${SPACES[n.t].icon} <small>Kupaya ${o.d} adım</small></button>`; }).join('')}</div></div>`;
  } else if (mine && V.phase === 'kupa') {
    h = `<div class="pt-sh gold"><h3>🏆 Kupa sandığı!</h3><p><b>${KUPA_PRICE} 🔑</b> karşılığında bir Kupa alabilirsin. Sende ${me.keys} 🔑 var.</p><div class="pt-opts"><button type="button" class="btn btn-spin" data-kupa="1">🏆 KUPA AL</button><button type="button" class="btn btn-ghost" data-kupa="0">Geç</button></div></div>`;
  } else if (mine && V.phase === 'shop') {
    h = `<div class="pt-sh"><h3>🛒 Mağaza <small>🔑 ${me.keys} · 🎒 ${me.items.length}/${MAX_ITEMS}</small></h3><div class="pt-shop">${ITEM_IDS.map(k => { const it = ITEMS[k], can = me.keys >= it.price && me.items.length < MAX_ITEMS; return `<button type="button" class="pt-sitem" data-buy="${k}" ${can ? '' : 'disabled'}><span class="pt-ii">${it.icon}</span><b>${esc(it.name)}</b><small>${esc(it.desc)}</small><em>${it.price} 🔑</em></button>`; }).join('')}</div><button type="button" class="btn btn-ghost pt-close" data-buy="">Mağazadan çık</button></div>`;
  }
  el.innerHTML = h; el.hidden = !h;
}
function renderLegend() {
  const el = q('.pt-legend'); if (!el || el.dataset.done) return; el.dataset.done = '1';
  el.innerHTML = `<summary>📖 Kareler ve eşyalar</summary><div class="pt-lg">${Object.keys(SPACES).map(k => `<span><i style="--sc:${SPACES[k].col}">${SPACES[k].icon}</i><b>${esc(SPACES[k].name)}</b><small>${esc(SPACES[k].desc)}</small></span>`).join('')}
    <span><i style="--sc:#ffb627">🏆</i><b>Kupa sandığı</b><small>Geçerken ya da dururken ${KUPA_PRICE} 🔑 ile Kupa al; sandık sonra yer değiştirir.</small></span></div>
    <div class="pt-lg">${ITEM_IDS.map(k => `<span><i style="--sc:#3b2a6a">${ITEMS[k].icon}</i><b>${esc(ITEMS[k].name)} · ${ITEMS[k].price}🔑</b><small>${esc(ITEMS[k].desc)}</small></span>`).join('')}</div>
    <p class="pt-note">❤️ Can ${HP_MAX}. Canı biten mezarlıkta doğar ve anahtarlarının üçte birini kaybeder. Her tur sonunda mini oyun: 🥇 10 🔑, sonrakiler sırayla daha az.</p>`;
}

/* ---- zar ---- */
let diceShown = '';
function renderDice() {
  const el = q('.pt-dice'); if (!el) return;
  const d = V.dice, show = d && (V.phase === 'rolling' || V.phase === 'move' || V.phase === 'branch' || V.phase === 'kupa' || V.phase === 'shop');
  if (!show) { el.hidden = true; diceShown = ''; return; }
  el.hidden = false;
  const key = `${d.at}`;
  if (diceShown !== key) {
    diceShown = key;
    el.innerHTML = `${d.v.map(() => '<span class="pt-die rolling"><b>?</b></span>').join('')}${d.b ? '<span class="pt-dplus">+🚀8</span>' : ''}<span class="pt-dtot" hidden></span>`;
  }
}
function diceTick() {
  const el = q('.pt-dice'); if (!el || el.hidden || !V || !V.dice) return;
  const d = V.dice, el2 = el.querySelectorAll('.pt-die'), done = hostNow() - d.at > 850;
  el2.forEach((s, k) => { if (done) { if (s.classList.contains('rolling')) { s.classList.remove('rolling'); s.classList.add('land'); s.querySelector('b').textContent = d.v[k]; } } else s.querySelector('b').textContent = rndi(1, 10); });
  const tot = el.querySelector('.pt-dtot'); if (done && tot && tot.hidden && (d.v.length > 1 || d.b)) { tot.hidden = false; tot.textContent = `= ${d.tot}`; }
  if (!done && Math.random() < .5) Sound.tick(.5);
}

/* ---- mini oyun katmanları ---- */
let introKey = '', resKey = '';
function hudVals(id, d, i) {
  if (!d) return '';
  switch (id) {
    case 'buzsumo': return d.p && d.p[i] ? (d.p[i][2] ? '✓' : '✗') : '';
    case 'lazer': return d.al ? (d.al[i] ? '✓' : '✗') : '';
    case 'bomba': return d.hold ? (d.hold.includes(i) ? '💣' : '💥' + (d.boom ? d.boom[i] : 0)) : '';
    case 'kule': return d.h ? String(d.h[i]) : '';
    case 'refleks': return d.tot ? String(d.tot[i]) : '';
    default: return d.pts ? String(d.pts[i]) : '';
  }
}
function renderMini() {
  const mg = V.mg, intro = q('.pt-intro'), res = q('.pt-mres'), hud = q('.pt-mhud');
  const on = V.phase === 'mini' && mg;
  stageEl.classList.toggle('mini', !!on);
  root.querySelector('.pt').classList.toggle('mini', !!on);
  if (!on) { intro.hidden = true; res.hidden = true; hud.hidden = true; joyEl.hidden = true; mbtn.hidden = true; return; }
  const M = GAMES[mg.id];
  if (CL.seq !== mg.seq) resetCL(mg.seq);
  // giriş kartı
  if (mg.ph === 'intro') {
    if (introKey !== mg.seq + ':i') {
      introKey = mg.seq + ':i';
      intro.innerHTML = `<div class="pt-icard" style="--mc:${M.color}"><small>${V.mode === 'mini' ? `MİNİ OYUN ${V.round}/${V.rounds}` : `TUR ${V.round} · MİNİ OYUN`}</small><span class="pt-iicon">${M.icon}</span><h3>${esc(M.name)}</h3><p>${esc(M.desc)}</p><p class="pt-ctl">${isTouch() ? '👆 ' + esc(M.ctl.touch) : '⌨️ ' + esc(M.ctl.key)}</p><b class="pt-cnt">3</b><span class="pt-rew">🥇 +10 🔑${V.mode === 'mini' ? ' +1 🏆' : ''} · ⏱ ${M.dur} sn</span></div>`;
    }
    intro.hidden = false;
  } else intro.hidden = true;
  // sonuç kartı
  if (mg.ph === 'result' && mg.res) {
    if (resKey !== mg.seq + ':r') {
      resKey = mg.seq + ':r';
      const r = mg.res, order = V.players.map((p, i) => i).sort((a, b) => r.rank[a] - r.rank[b]);
      const medal = ['🥇', '🥈', '🥉'];
      intro.hidden = true;
      res.innerHTML = `<div class="pt-rcard"><small>${M.icon} ${esc(M.name)}</small><h3>${r.rank[V.me] === 0 ? 'KAZANDIN! 🎉' : 'Sonuçlar'}</h3><ol>${order.map(i => { const p = V.players[i]; return `<li class="${i === V.me ? 'me' : ''}" style="--pc:${p.color}"><span class="pt-md">${medal[r.rank[i]] || (r.rank[i] + 1) + '.'}</span><span class="pt-av" style="--pc:${p.color}">${ANIMAL_EMOJI[p.an]}</span><span class="pt-rn"><b>${esc(p.name)}</b><small>${esc(r.lab[i] || '')}</small></span><em>+${r.rew[i]} 🔑${r.kupa[i] ? ' +1 🏆' : ''}</em></li>`; }).join('')}</ol><p class="pt-next">${V.round >= V.rounds ? 'Final sonuçları geliyor…' : V.mode === 'mini' ? 'Sıradaki mini oyun geliyor…' : 'Tahtaya dönülüyor…'}</p></div>`;
    }
    res.hidden = false;
  } else res.hidden = true;
  hud.hidden = false;
  const playing = mg.ph === 'play' && V.me >= 0;
  joyEl.hidden = joyEl.hidden || !playing || !M.joy;
  mbtn.hidden = !playing || !M.btn;
  if (M.btn) mbtn.querySelector('span').textContent = M.btn;
  const hint = q('.pt-jhint'); if (hint) hint.hidden = !(playing && M.joy && isTouch() && !joy.on && hostNow() - mg.playAt < 4000);
}
function hudTick() {
  if (!V || !root) return;
  diceTick();
  if (V.phase === 'mini' && V.mg) {
    const mg = V.mg, M = GAMES[mg.id], now = hostNow(), hud = q('.pt-mhud');
    const left = mg.ph === 'play' ? Math.max(0, mg.endAt - now) : mg.ph === 'intro' ? M.dur * 1000 : 0, secs = Math.ceil(left / 1000);
    const d = CL.snaps.length ? CL.snaps[CL.snaps.length - 1].d : mg.snap;
    hud.innerHTML = `<span class="pt-mt">${M.icon} <b>${esc(M.name)}</b></span><span class="pt-mtime ${mg.ph === 'play' && secs <= 5 ? 'urgent' : ''}">⏱ ${secs}</span><span class="pt-mscores">${V.players.map((p, i) => `<span class="${i === V.me ? 'me' : ''}" style="--pc:${p.color}">${ANIMAL_EMOJI[p.an]}<b>${hudVals(mg.id, d, i)}</b></span>`).join('')}</span>`;
    const cnt = q('.pt-cnt'); if (cnt && mg.ph === 'intro') { const s = Math.ceil((mg.introEnd - now) / 1000); cnt.textContent = s <= 3 ? Math.max(1, s) : '🎮'; if (s !== lastSec && s <= 3 && s > 0) Sound.tick(.8); lastSec = s; }
    else if (mg.ph === 'play' && secs <= 5 && secs > 0 && secs !== lastSec) { Sound.tick(.6); lastSec = secs; }
    renderMini();
  }
}

/* ---- render ---- */
function render(v) {
  V = v;
  if (!v || !root) return;
  ensureBoard();
  syncDisp();
  if (targetMode && !(myTurn() && v.phase === 'pre' && !v.used)) targetMode = false;
  const mode = v.phase === 'mini' ? 'mini' : 'board';
  if (mode !== CL.lastMode) { CL.lastMode = mode; snapCam = true; requestAnimationFrame(resize); if (mode === 'board') { joy.on = false; joyEl.hidden = true; } }
  if (v.mg && CL.seq !== v.mg.seq) resetCL(v.mg.seq);
  const tk = `${v.turnN}:${v.cur}:${v.round}`;
  if (tk !== lastTurnKey) { lastTurnKey = tk; if (!overview) snapCam = false; }
  root.querySelector('.pt').dataset.phase = v.phase;
  renderChips(); renderStatus(); renderPanel(); renderSheet(); renderDice(); renderLegend(); renderMini();
  if (!raf) raf = requestAnimationFrame(frame);
}

/* ---- olaylar ---- */
let toastT = null;
function toast(text, cls) { const el = q('.pt-toast'); if (!el) return; el.textContent = text; el.className = 'pt-toast show ' + (cls || ''); clearTimeout(toastT); toastT = setTimeout(() => { if (el) el.className = 'pt-toast'; }, 1700); }
function nodeXY(n) { const B = V && buildBoard(V.board); const nd = B && B.nodes[n]; return nd ? [nd.x, nd.y] : [BW / 2, BH / 2]; }
function onEvent(e) {
  if (!root || !V) return;
  const me = ui ? ui.me : -1;
  switch (e.t) {
    case 'turn': if (e.pi === me) { banner('SIRA SENDE!', 'good'); Sound.special(); } break;
    case 'roll': snd.dice(); setTimeout(() => Sound.stop(), 850); break;
    case 'step': snd.hop(); break;
    case 'land': {
      const [x, y] = pawnXY(e.pi);
      if (e.keys) floatText(x, y - 30, `${e.keys > 0 ? '+' : ''}${e.keys} 🔑`, e.keys > 0 ? '#ffe14a' : '#ff6b7d');
      if (e.hp) setTimeout(() => floatText(x, y - 10, `${e.hp > 0 ? '+' : ''}${e.hp} ❤️`, e.hp > 0 ? '#2bff88' : '#ff6b7d'), 250);
      if (e.item) floatText(x, y - 30, '🎁 Eşya!', '#d9a6ff');
      if (e.block) floatText(x, y - 30, '🛡️ Korundu!', '#bfe0ff');
      if (e.s === 'p') snd.tp();
      if (e.keys > 0 || e.hp > 0 || e.item) { snd.coin(); if (e.pi === me) Sound.good(); }
      else if (e.keys < 0 || e.hp < 0) { Sound.bad(); if (e.pi === me) flash('bad'); }
      if (e.zap) { Sound.bad(); flash('bad'); }
      if (e.swap != null) snd.tp();
      break;
    }
    case 'kupa': {
      const [x, y] = nodeXY(e.from); floatText(x, y - 60, '+1 🏆', '#ffe14a', 34); anims.push({ k: 'ring', x, y, t0: pnow(), dur: 700, col: '#ffe14a', r: 120 });
      Sound.solve(); FX.confetti(e.pi === me ? 140 : 60); banner(e.pi === me ? 'KUPA SENİN!' : `${V.players[e.pi].name} KUPA ALDI!`, 'pink');
      break;
    }
    case 'trap': { const [x, y] = pawnXY(e.pi); floatText(x, y - 30, `🪤 −8 ❤️ −${e.stolen} 🔑`, '#ff6b7d'); snd.punch(); if (e.pi === me) flash('bad'); break; }
    case 'punch': { const [x, y] = pawnXY(e.tg); floatText(x, y - 30, `🥊 −8 ❤️ −${e.stolen} 🔑`, '#ff6b7d'); anims.push({ k: 'boom', x, y: y - 20, t0: pnow(), dur: 500 }); snd.punch(); if (e.tg === me) { flash('bad'); banner('YUMRUK YEDİN!', 'bad'); } break; }
    case 'block': { const [x, y] = pawnXY(e.pi); floatText(x, y - 30, '🛡️ ENGELLEDİ!', '#bfe0ff'); Sound.special(); break; }
    case 'magnet': { const [x, y] = nodeXY(e.n); floatText(x, y - 40, '🧲 6 geri!', '#ff9ad5'); snd.tp(); if (e.tg === me) flash('bad'); break; }
    case 'tp': snd.tp(); break;
    case 'settrap': { const [x, y] = nodeXY(e.n); floatText(x, y - 40, '🪤 Kapan kuruldu', '#ffe14a', 18); snd.pop(); break; }
    case 'useitem': { const [x, y] = pawnXY(e.pi); floatText(x, y - 40, `${ITEMS[e.k].icon} ${ITEMS[e.k].name}`, '#fff6b0', 20); Sound.special(); break; }
    case 'gotitem': if (e.pi === me && V.players[me]) { toast(`🎁 Yeni eşya!`, 'ok'); } break;
    case 'buy': if (e.pi === me) Sound.buy(); else Sound.tick(.4); break;
    case 'faint': { setTimeout(() => { const [x, y] = pawnXY(e.pi); floatText(x, y - 30, `💀 −${e.lost} 🔑`, '#ff6b7d', 26); }, 400); Sound.bankrupt(); if (e.pi === me) { flash('bad'); banner('BAYILDIN!', 'bad'); } break; }
    case 'nochest': break;
    case 'mgintro': Sound.fanfare(); banner('MİNİ OYUN!', 'pink'); break;
    case 'mggo': Sound.stop(); Sound.whoosh(); toast('BAŞLA!', 'ok'); break;
    case 'mgend': { Sound.solve(); if (Array.isArray(e.win) && e.win.includes(me)) { FX.confetti(120); banner('BİRİNCİ!', 'good'); } break; }
    case 'round': break;
    case 'mg': mgEvent(e, me); break;
    default: break;
  }
}
function mgEvent(e, me) {
  const t = pnow();
  if (e.e === 'fall') { anims.push({ k: 'ring', x: e.x, y: e.y, t0: t, dur: 700, col: '#bff3ff', r: 60 }); snd.splash(); if (e.pi === me) { flash('bad'); toast('Düştün! 💦', 'bad'); } }
  else if (e.e === 'zap') { snd.zap(); if (e.pi === me) { flash('bad'); toast('Lazere yakalandın! ⚡', 'bad'); } }
  else if (e.e === 'boom') { anims.push({ k: 'boom', x: e.x, y: e.y, t0: t, dur: 900 }); snd.boom(); if (e.pi === me) { flash('bad'); toast('PATLADIN! 💥', 'bad'); } }
  else if (e.e === 'bomb') { if (e.pi === me) { toast('💣 BOMBA SENDE! Birine dokun!', 'bad'); Sound.special(); } }
  else if (e.e === 'pass') { anims.push({ k: 'text', x: e.x, y: e.y, txt: 'PAS!', col: '#ffb86b', t0: t, dur: 800, size: 22 }); snd.pop(); if (e.b === me) toast('💣 BOMBA SENDE!', 'bad'); else if (e.a === me) toast('Kurtuldun!', 'ok'); }
  else if (e.e === 'gem') { anims.push({ k: 'ring', x: e.x, y: e.y, t0: t, dur: 800, col: '#ffe14a', r: 80 }, { k: 'text', x: e.x, y: e.y, txt: '💎 +1', col: '#ffe14a', t0: t, dur: 1200 }); Sound.solve(); if (e.pi === me) FX.confetti(50); }
  else if (e.e === 'mbomb') { anims.push({ k: 'boom', x: e.x, y: e.y, t0: t, dur: 800 }); snd.boom(); if (Array.isArray(e.hit) && e.hit.includes(me)) { flash('bad'); toast('Bomba! −2 💫', 'bad'); } }
  else if (e.e === 'bump') { anims.push({ k: 'text', x: e.x, y: e.y, txt: 'ÇARP!', col: '#ffe14a', t0: t, dur: 800, size: 24 }, { k: 'ring', x: e.x, y: e.y, t0: t, dur: 400, col: '#fff', r: 50 }); snd.punch(); if (e.b === me) flash('bad'); }
}
function fxEvent(f) {
  if (!f || !root || !V) return;
  const me = V.me, t = pnow();
  if (f.e === 'catch') { anims.push({ k: 'text', x: f.x, y: f.y, txt: f.k === 4 ? '+3 ⭐' : '+1', col: f.pi === me ? '#ffe14a' : '#fff', t0: t, dur: 900, size: f.pi === me ? 26 : 18 }); if (f.pi === me) snd.coin(); }
  else if (f.e === 'splat') { anims.push({ k: 'ring', x: f.x, y: f.y, t0: t, dur: 400, col: 'rgba(255,255,255,.7)', r: 30 }); }
  else if (f.e === 'star') { anims.push({ k: 'text', x: f.x, y: f.y, txt: '+1 ⭐', col: '#ffe14a', t0: t, dur: 900, size: f.pi === me ? 26 : 18 }); if (f.pi === me) snd.coin(); }
  else if (f.e === 'bonk') { anims.push({ k: 'ring', x: f.x, y: f.y, t0: t, dur: 350, col: '#fff', r: 40 }); snd.pop(); }
  else if (f.e === 'dig') { if (f.pi !== me) snd.dig(); }
  else if (f.e === 'klmiss') { if (f.pi !== me) Sound.tick(.3); }
}

/* ---- giriş: tahta, mini oyun ---- */
function toWorldBoard(cx, cy) { const r = cv.getBoundingClientRect(); return [(cx - r.left) / cam.s + cam.x, (cy - r.top) / cam.s + cam.y]; }
function toWorldMini(cx, cy) { const r = cv.getBoundingClientRect(), w = mgWorld(); return [(cx - r.left - w.ox) / w.s, (cy - r.top - w.oy) / w.s]; }
function onDown(e) {
  if (e.target.closest && e.target.closest('button, .pt-sheet, .pt-intro, .pt-mres')) return;
  if (!V) return;
  Sound.init();
  if (V.phase === 'mini' && V.mg) {
    const M = GAMES[V.mg.id];
    if (V.me < 0 || V.mg.ph !== 'play') return;
    e.preventDefault();
    if (M.joy) {
      if (joy.on) return;
      const r = stageEl.getBoundingClientRect();
      joy.on = true; joy.id = e.pointerId; joy.bx = e.clientX - r.left; joy.by = e.clientY - r.top; joy.dx = joy.dy = 0;
      try { stageEl.setPointerCapture(e.pointerId); } catch { /* */ }
      joyEl.hidden = false; joyEl.style.left = joy.bx + 'px'; joyEl.style.top = joy.by + 'px'; joyEl.querySelector('i').style.transform = '';
    } else {
      const [x, y] = toWorldMini(e.clientX, e.clientY), R = mgR();
      if (M.tap) M.tap(R, x, y); else if (M.press) M.press(R);
    }
    return;
  }
  // tahta: dal seçimi dokunuşu
  if (myTurn() && V.phase === 'branch' && V.branch) {
    const [x, y] = toWorldBoard(e.clientX, e.clientY), B = buildBoard(V.board);
    const o = V.branch.find(o2 => dist(B.nodes[o2.to].x, B.nodes[o2.to].y, x, y) < 50);
    if (o) { ui.send({ t: 'branch', to: o.to }); return; }
  }
  if (targetMode) {
    const [x, y] = toWorldBoard(e.clientX, e.clientY);
    const i = V.players.findIndex((p, j) => j !== V.me && disp[j] && dist(disp[j].x, disp[j].y - 10, x, y) < 40 && inGloveRange(j));
    if (i >= 0) { targetMode = false; ui.send({ t: 'use', k: 'eldiven', target: i }); panelKey = ''; }
  }
}
function onMove(e) {
  if (!joy.on || e.pointerId !== joy.id) return;
  const JR = 46, r = stageEl.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  let dx = (x - joy.bx) / JR, dy = (y - joy.by) / JR; const l = Math.hypot(dx, dy);
  if (l > 1.25) { joy.bx = x - dx / l * JR * 1.25; joy.by = y - dy / l * JR * 1.25; joyEl.style.left = joy.bx + 'px'; joyEl.style.top = joy.by + 'px'; }
  if (l > 1) { dx /= l; dy /= l; }
  const dead = Math.hypot(dx, dy) < .14;
  joy.dx = dead ? 0 : dx; joy.dy = dead ? 0 : dy;
  joyEl.querySelector('i').style.transform = `translate(${dx * JR * .7}px, ${dy * JR * .7}px)`;
}
function onUp(e) { if (e.pointerId !== joy.id) return; joy.on = false; joy.id = null; joy.dx = joy.dy = 0; if (joyEl) joyEl.hidden = true; }
function pressBtn() {
  if (!V || V.phase !== 'mini' || !V.mg || V.mg.ph !== 'play' || V.me < 0) return;
  const M = GAMES[V.mg.id]; Sound.init();
  if (M.kind === 'phys') { CL.bn++; CL.lastSend = 0; }
  if (M.press) M.press(mgR());
}
function onKey(e) {
  if (!V || !root || (e.target && e.target.closest && e.target.closest('input,textarea,select'))) return;
  const codes = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'];
  const mini = V.phase === 'mini' && V.mg && V.mg.ph === 'play' && V.me >= 0;
  if (e.type === 'keydown') {
    if (mini) {
      const M = GAMES[V.mg.id];
      if (codes.includes(e.code) && M.joy) { keys.add(e.code); e.preventDefault(); }
      else if ((e.code === 'Space' || e.code === 'Enter' || (e.code === 'ArrowUp' && M.id === 'lazer')) && !e.repeat) { e.preventDefault(); pressBtn(); }
      else if (M.key) { M.key(mgR(), e.code); }
    } else if (myTurn() && V.phase === 'pre' && (e.code === 'Space' || e.code === 'Enter') && !e.repeat && !e.target.closest('button')) { e.preventDefault(); ui.send({ t: 'roll' }); }
  } else keys.delete(e.code);
}
function onBlur() { keys.clear(); joy.on = false; joy.dx = joy.dy = 0; if (joyEl) joyEl.hidden = true; }
function onClick(e) {
  const b = e.target.closest('button'); if (!b || !root.contains(b) || b.disabled || !ui) return;
  Sound.init();
  if (b.dataset.a === 'roll') { ui.send({ t: 'roll' }); }
  else if (b.dataset.a === 'cancel') { targetMode = false; panelKey = ''; renderPanel(); }
  else if (b.dataset.use) {
    const k = b.dataset.use;
    if (k === 'eldiven') { targetMode = true; panelKey = ''; renderPanel(); toast('🥊 Hedefini seç', 'ok'); }
    else ui.send({ t: 'use', k });
  }
  else if (b.dataset.tgt != null) { targetMode = false; panelKey = ''; ui.send({ t: 'use', k: 'eldiven', target: +b.dataset.tgt }); }
  else if (b.dataset.br != null) ui.send({ t: 'branch', to: +b.dataset.br });
  else if (b.dataset.kupa != null) ui.send({ t: 'kupa', yes: b.dataset.kupa === '1' });
  else if (b.dataset.buy != null) ui.send({ t: 'buy', k: b.dataset.buy || null });
  else if (b.classList.contains('pt-zoom')) { overview = !overview; b.classList.toggle('on', overview); b.textContent = overview ? '🎯' : '🗺️'; }
}

function mount(r, api) {
  root = r; ui = api; uiRef = api; V = null; disp = []; anims = []; keys = new Set(); overview = false; snapCam = true; boardImg = null; boardImgId = '';
  lastTurnKey = ''; sheetKey = ''; panelKey = ''; chipsKey = ''; introKey = ''; resKey = ''; diceShown = ''; targetMode = false; lastT = 0;
  CL.lastMode = ''; resetCL(-1);
  root.innerHTML = `<div class="g-wrap pt">
    <div class="pt-top"><div class="pt-chips"></div><div class="pt-status g-status"></div></div>
    <div class="pt-main">
      <div class="pt-stage">
        <canvas class="pt-cv" aria-label="Parti Tahtası"></canvas>
        <button type="button" class="pt-zoom" aria-label="Tüm tahtayı göster">🗺️</button>
        <div class="pt-dice" hidden></div>
        <div class="pt-mhud" hidden></div>
        <div class="pt-joy" hidden><i></i></div>
        <div class="pt-jhint" hidden><i></i><span>Sürükle ve hareket et</span></div>
        <button type="button" class="pt-mbtn" hidden aria-label="Eylem"><span>İT!</span></button>
        <div class="pt-toast" aria-live="polite"></div>
        <div class="pt-sheet" hidden></div>
        <div class="pt-intro" hidden></div>
        <div class="pt-mres" hidden></div>
      </div>
      <aside class="pt-side g-panel"><div class="pt-act"></div><details class="pt-legend"></details></aside>
    </div>
  </div>`;
  stageEl = q('.pt-stage'); cv = q('.pt-cv'); cg = cv.getContext('2d'); joyEl = q('.pt-joy'); mbtn = q('.pt-mbtn');
  stageEl.addEventListener('pointerdown', onDown); stageEl.addEventListener('pointermove', onMove);
  stageEl.addEventListener('pointerup', onUp); stageEl.addEventListener('pointercancel', onUp);
  stageEl.addEventListener('contextmenu', e => e.preventDefault());
  mbtn.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); pressBtn(); });
  root.addEventListener('click', onClick);
  if (window.ResizeObserver) { ro = new ResizeObserver(() => resize()); ro.observe(stageEl); }
  addEventListener('resize', resize);
  document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKey); addEventListener('blur', onBlur);
  hudT = setInterval(hudTick, 120);
  if (!phoneW()) q('.pt-legend').open = true;
  requestAnimationFrame(resize);
}
function unmount() {
  removeEventListener('resize', resize); removeEventListener('blur', onBlur);
  document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKey);
  if (ro) { ro.disconnect(); ro = null; }
  clearInterval(hudT); clearTimeout(toastT); if (raf) cancelAnimationFrame(raf);
  raf = 0; root = null; ui = null; uiRef = null; V = null; cv = null; cg = null; stageEl = null; joyEl = null; mbtn = null; boardImg = null; boardImgId = '';
}
function onFast(m, api) {
  if (!m) return;
  if (m.t === 'u') { if (api && api.isHost) hostInput(m.seat, m, m.id); }
  else if (m.t === 's') { if (!(api && api.isHost)) clientSnap(m); }
}

CFX.registerGame(Object.assign({
  id: 'partitahtasi', name: 'Parti Tahtası', icon: '🎉', color: '#ff5fa2', min: 2, max: 8, hotseat: false, bot: true, localMin: 1,
  tagline: 'Zar at, Kupa topla, mini oyunlarda kapış!',
  rules: 'Sırayla zar atıp dallanan tahtada ilerle; anahtar topla, eşya kullan ve yer değiştiren sandıktan 20 anahtara Kupa al. Her turun sonunda herkes aynı anda bir mini oyun oynar, sıralamaya göre anahtar kazanır. Tur bitince en çok Kupası olan (eşitlikte anahtarı fazla olan) kazanır.',
  options: [
    { key: 'mod', label: 'Mod', def: 'board', choices: [{ v: 'board', label: '🎲 Tahta' }, { v: 'mini', label: '🎮 Sadece Mini Oyunlar' }] },
    { key: 'tur', label: 'Tur sayısı', def: '10', choices: [{ v: '5', label: '5' }, { v: '10', label: '10' }, { v: '15', label: '15' }, { v: '20', label: '20' }] },
    { key: 'tahta', label: 'Tahta', def: 'seker', choices: [{ v: 'seker', label: '🍭 Şeker Adası' }, { v: 'uzay', label: '🚀 Uzay Kalesi' }] }
  ],
  mount, render, onEvent, onFast, unmount,
  _pt: { PEND, BOARDS, buildBoard, ITEMS, SPACES, GAMES, KUPA_PRICE, HP_MAX, HOST: () => HOST, makeH, mgFinish, mgBegin, useItem, land, arrive, rewardFor, standings, leaderOf,
    cam: () => cam, disp: () => disp, CL, toWorldMini: (x, y) => toWorldMini(x, y), mgWorld: () => mgWorld(), stage: () => stageEl }
}, RULES));
})();
