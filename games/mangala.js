/* =========================================================================
   OYUN SALONU — MANGALA
   Geleneksel Türk mangalası: iki sıra, altışar kuyu, her oyuncuya bir hazine.
   Kuyudaki taşları al, ilkini aynı kuyuya bırak, kalanını saat yönünün tersine
   birer birer dağıt (rakibin hazinesi atlanır). Son taş hazineye düşerse
   tekrar oyna; rakip kuyuyu çift yaparsa o kuyuyu al; kendi boş kuyuna
   düşerse karşıdaki taşlarla birlikte al. Tarafı ilk boşalan, rakip taraftaki
   taşları da hazinesine ekler. 2 kişi online, aynı cihazda ya da bilgisayara karşı.
   Tahta dizilimi (yöneten cihazdaki state.pits):
     0–5  : 1. oyuncunun kuyuları (soldan sağa, dağıtma yönünde)   6 : 1. oyuncunun hazinesi
     7–12 : 2. oyuncunun kuyuları                                  13 : 2. oyuncunun hazinesi
     i kuyusunun karşısı 12 − i.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial } = CFX;
const START = 4;
const STORE = [6, 13], BASE = [0, 7];
const owner = i => (i < 7 ? 0 : 1);
const isPit = i => i !== 6 && i !== 13;
const trUp = s => String(s).toLocaleUpperCase('tr-TR');
const sideSum = (b, pi) => { let s = 0; for (let k = 0; k < 6; k++) s += b[BASE[pi] + k]; return s; };
const legal = (b, pi) => { const out = []; for (let k = 0; k < 6; k++) if (b[BASE[pi] + k] > 0) out.push(BASE[pi] + k); return out; };
// Taş başına animasyon süresi (yöneten cihaz ve çizim aynı formülü kullanır)
let DEF = null;
const T = ms => Math.max(1, Math.round(ms * ((DEF && DEF.speed) || 1)));   // speed: testler için hızlandırma
const stepMs = len => T(Math.min(120, Math.round(2600 / Math.max(1, len))));
const sowTime = mv => T(240 + (mv.extra ? 250 : 0) + (mv.cap ? 750 : 0) + (mv.sweep ? 950 : 0) + 200) + mv.path.length * stepMs(mv.path.length);

/* ---------- kurallar (saf; hem oyun hem bilgisayar araması kullanır) ---------- */
// b dizisini yerinde değiştirir. rec=true ise taşların düştüğü kuyu sırası (path) kaydedilir.
function play(b, pi, pit, rec) {
  const hz = STORE[pi], skip = STORE[1 - pi];
  const nxt = i => { i = (i + 1) % 14; return i === skip ? (i + 1) % 14 : i; };
  let n = b[pit], i = pit;
  const path = rec ? [] : null;
  b[pit] = 0;
  if (n === 1) { i = nxt(i); b[i]++; if (path) path.push(i); }
  else {
    b[pit] = 1; if (path) path.push(pit); n--;
    while (n-- > 0) { i = nxt(i); b[i]++; if (path) path.push(i); }
  }
  const r = { path, last: i, extra: false, cap: null, sweep: null, over: false };
  if (i === hz) r.extra = true;
  else if (isPit(i) && owner(i) !== pi && b[i] % 2 === 0) {
    const c = b[i]; b[i] = 0; b[hz] += c; r.cap = { kind: 'even', idx: [i], n: c };
  } else if (isPit(i) && owner(i) === pi && b[i] === 1 && b[12 - i] > 0) {
    const o = 12 - i, c = 1 + b[o]; b[i] = 0; b[o] = 0; b[hz] += c; r.cap = { kind: 'empty', idx: [i, o], n: c };
  }
  // Bitiş: tarafı boşalan oyuncu (önce hamleyi yapan bakılır) rakip taraftaki taşları alır.
  for (const q of [pi, 1 - pi]) {
    if (sideSum(b, q) > 0) continue;
    const o = 1 - q, idx = []; let c = 0;
    for (let k = 0; k < 6; k++) { const j = BASE[o] + k; if (b[j]) { idx.push(j); c += b[j]; b[j] = 0; } }
    b[STORE[q]] += c; r.sweep = { to: q, idx, n: c }; r.over = true;
    break;
  }
  return r;
}

/* ---------- bilgisayar: alfa-beta arama (taş farkı, tekrar oynama dahil) ---------- */
// Bu kuyudan oynanırsa son taş kendi hazinesine mi düşer? (1/0)
const endsHome = (b, pi, p) => { const n = b[p], steps = n === 1 ? 1 : n - 1; return steps % 13 === STORE[pi] - p ? 1 : 0; };
function search(b, turn, depth, alpha, beta, me) {
  const moves = legal(b, turn);
  if (depth === 0 || !moves.length) return b[STORE[me]] - b[STORE[1 - me]];
  const maxi = turn === me;
  let best = maxi ? -Infinity : Infinity;
  // Hazineye biten hamleler önce (budamayı hızlandırır)
  moves.sort((x, y) => endsHome(b, turn, y) - endsHome(b, turn, x));
  for (const m of moves) {
    const c = b.slice(), r = play(c, turn, m, false);
    let v;
    if (r.over) { const d = c[STORE[me]] - c[STORE[1 - me]]; v = d + Math.sign(d) * 100; }
    else v = search(c, r.extra ? turn : 1 - turn, depth - 1, alpha, beta, me);
    if (maxi) { if (v > best) best = v; if (v > alpha) alpha = v; }
    else { if (v < best) best = v; if (v < beta) beta = v; }
    if (alpha >= beta) break;
  }
  return best;
}
function bestMove(b, pi, depth) {
  const moves = legal(b, pi); if (!moves.length) return -1;
  let best = -Infinity, pickM = moves[0];
  for (const m of moves) {
    const c = b.slice(), r = play(c, pi, m, false);
    let v;
    if (r.over) { const d = c[STORE[pi]] - c[STORE[1 - pi]]; v = d + Math.sign(d) * 100; }
    else v = search(c, r.extra ? pi : 1 - pi, depth - 1, -Infinity, Infinity, pi);
    v += Math.random() * 0.8;                       // eşit hamleler arasında biraz çeşitlilik
    if (v > best) { best = v; pickM = m; }
  }
  return pickM;
}

/* ---------- oyun akışı (yöneten cihaz) ---------- */
function newGame(st) {
  st.pits = Array(14).fill(START); st.pits[6] = 0; st.pits[13] = 0;
  st.cur = st.starter; st.phase = 'play'; st.mv = null; st.res = null; st.next = null;
}
function doMove(st, pi, pit, ctx) {
  const before = st.pits.slice(), n = before[pit];
  const r = play(st.pits, pi, pit, true);
  st.mv = { n: ++st.mvN, pi, from: pit, before, path: r.path, last: r.last, extra: r.extra, cap: r.cap, sweep: r.sweep, over: r.over };
  st.next = r.over ? null : r.extra ? pi : 1 - pi;
  st.phase = 'sow';
  const name = st.players[pi].name, k = pit - BASE[pi] + 1;
  ctx.emit({ t: 'move', pi, n: st.mv.n }, n === 1 ? `${name} ${k}. kuyudaki tek taşı ilerletti.` : `${name} ${k}. kuyudan ${n} taş dağıttı.`);
  ctx.sync();
  const s = ++st.seq;
  ctx.later(sowTime(st.mv), () => { if (st.seq === s) finishSow(st, ctx); });
}
function finishSow(st, ctx) {
  const mv = st.mv; if (!mv || st.phase !== 'sow') return;
  const P = st.players, name = P[mv.pi].name;
  if (mv.extra) ctx.emit({ t: 'extra', pi: mv.pi }, `Son taş hazineye düştü: ${name} tekrar oynuyor!`, 'good');
  if (mv.cap && mv.cap.kind === 'even') ctx.emit({ t: 'cap', pi: mv.pi }, `${name} rakip kuyuyu çift yaptı ve ${mv.cap.n} taş aldı!`, 'gold');
  if (mv.cap && mv.cap.kind === 'empty') ctx.emit({ t: 'cap', pi: mv.pi }, `${name} boş kuyusuna düştü; karşıdakilerle birlikte ${mv.cap.n} taş aldı!`, 'gold');
  if (mv.sweep) ctx.emit({ t: 'sweep', pi: mv.sweep.to }, `${P[mv.sweep.to].name} tarafını ilk bitirdi${mv.sweep.n ? `; rakip taraftaki ${mv.sweep.n} taşı hazinesine ekledi` : ''}.`, 'gold');
  if (mv.over) { endGame(st, ctx); return; }
  const changed = st.next !== st.cur;
  st.cur = st.next; st.phase = 'play';
  if (changed) ctx.emit({ t: 'turn', pi: st.cur });
  ctx.sync();
}
function endGame(st, ctx) {
  const a = st.pits[6], b = st.pits[13];
  const w = a === b ? null : a > b ? 0 : 1;
  st.totals[0] += a; st.totals[1] += b;
  if (w != null) st.wins[w]++;
  st.res = { winner: w, score: [a, b] };
  st.history.push({ winner: w, score: [a, b] });
  st.phase = 'roundOver';
  ctx.emit({ t: 'gameEnd', winner: w }, w == null ? `Oyun berabere bitti (${a} – ${b}).` : `${st.players[w].name} oyunu kazandı! (${a} – ${b})`, 'good');
  ctx.sync();
  const s = ++st.seq;
  ctx.later(T(3200), () => { if (st.seq === s) afterGame(st, ctx); });
}
function matchOver(st) { return st.games === 1 || st.wins.some(x => x >= 2) || st.game >= 3; }
function finalResult(st) {
  const P = st.players;
  if (st.games === 1) {
    const [a, b] = st.res ? st.res.score : [st.pits[6], st.pits[13]];
    const order = b > a ? [1, 0] : [0, 1];
    return { title: a === b ? 'Berabere!' : `${P[order[0]].name} kazandı!`, ranking: order.map(i => ({ pi: i, score: i ? b : a, label: `${i ? b : a} taş` })), note: `Hazineler: ${a} – ${b}` };
  }
  const order = [0, 1].sort((x, y) => (st.wins[y] - st.wins[x]) || (st.totals[y] - st.totals[x]));
  const tie = st.wins[0] === st.wins[1] && st.totals[0] === st.totals[1];
  return {
    title: tie ? 'Maç berabere!' : `${P[order[0]].name} maçı kazandı!`,
    ranking: order.map(i => ({ pi: i, score: st.wins[i], label: `${st.wins[i]} galibiyet · ${st.totals[i]} taş` })),
    note: st.history.map((h, k) => `${k + 1}. oyun ${h.score[0]}–${h.score[1]}`).join(' · ') + (st.wins[0] === st.wins[1] && !tie ? ' (eşitlikte toplam taş sayıldı)' : '')
  };
}
function afterGame(st, ctx) {
  if (matchOver(st)) { st.phase = 'done'; ctx.sync(); ctx.end(finalResult(st)); return; }
  st.game++; st.starter = 1 - st.starter; newGame(st);
  ctx.emit({ t: 'newGame', game: st.game }, `${st.game}. oyun başladı. İlk hamle: ${st.players[st.cur].name}.`);
  ctx.sync();
}

/* ---------- arayüz ---------- */
const PAL = 6;
function hash(n) { n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35); n ^= n >>> 16; return (n >>> 0) / 4294967296; }
let root = null, ui = null, V = null, E = {}, disp = null, lastMv, A = null, waitT = null, waiting = false, lay = '';
function stonesHTML(i, n, fresh) {
  const big = !isPit(i), K = big ? 24 : 12, R = big ? 38 : 30, m = Math.min(n, big ? 48 : 30);
  let h = '';
  for (let k = 0; k < m; k++) {
    const r1 = hash(i * 977 + k * 131 + 3), r2 = hash(i * 491 + k * 59 + 11), r3 = hash(i * 211 + k * 13 + 29);
    const layer = Math.floor(k / K), kk = k % K;
    const ang = kk * 2.39996 + r1 * 1.1 + layer * 1.7;
    const rad = R * Math.sqrt((kk + 0.6) / K) * (0.8 + 0.35 * r2);
    const x = 50 + Math.cos(ang) * rad, y = 50 + Math.sin(ang) * rad;
    h += `<i class="mg-st c${Math.floor(r3 * PAL)}${fresh && k === m - 1 ? ' new' : ''}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;--rot:${Math.floor(r1 * 360)}deg"></i>`;
  }
  return h;
}
function bottomSeat() { const me = ui ? ui.me : -1; return typeof me === 'number' && me >= 0 ? me : 0; }
function canAct() {
  const v = V; if (!v || v.phase !== 'play' || A || waiting) return false;
  return ui.mode === 'local' ? !v.players[v.cur].isBot : ui.me === v.cur;
}
function drawPit(i, fresh) {
  const el = E.cells[i]; if (!el) return;
  el.querySelector('.mg-stones').innerHTML = stonesHTML(i, disp[i], fresh);
  el.querySelector('.mg-cnt').textContent = disp[i];
  el.classList.toggle('empty', disp[i] === 0);
  if (fresh) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
}
function drawAll() { for (let i = 0; i < 14; i++) drawPit(i, false); drawChips(); }
function drawChips() {
  const v = V; if (!v || !E.chips) return;
  const me = ui.me, active = v.phase === 'play' || v.phase === 'sow';
  E.chips.innerHTML = v.players.map((p, i) => `<div class="g-chip ${active && i === v.cur ? 'active' : ''} ${p.online === false ? 'off' : ''}" style="--pc:${p.color}">
    <span class="av" style="--pc:${p.color}">${initial(p.name)}</span><b>${esc(p.name)}${me === i ? ' · sen' : ''}</b>
    ${v.games > 1 ? `<span class="mg-wins" aria-label="${v.wins[i]} galibiyet">${[0, 1].map(k => `<i class="${k < v.wins[i] ? 'on' : ''}"></i>`).join('')}</span>` : ''}
    <span class="g-num" title="Hazine">${disp ? disp[STORE[i]] : v.pits[STORE[i]]}</span></div>`).join('');
}
function layout(force) {
  if (!root || !V) return;
  const vert = innerWidth < 600 && innerHeight > innerWidth * 1.15;
  const bottom = bottomSeat(), key = (vert ? 'v' : 'h') + bottom;
  if (!force && key === lay) { sizeStones(); return; }
  lay = key;
  E.board.classList.toggle('v', vert); E.board.classList.toggle('h', !vert); E.frame.classList.toggle('v', vert);
  for (let i = 0; i < 14; i++) {
    const el = E.cells[i], mine = owner(i) === bottom;
    let row, col, rs = 1, cs = 1;
    if (!isPit(i)) { if (vert) { row = mine ? 8 : 1; col = 1; cs = 2; } else { row = 1; col = mine ? 8 : 1; rs = 2; } }
    else { const k = i - BASE[owner(i)]; if (mine) { row = vert ? 2 + k : 2; col = vert ? 1 : 2 + k; } else { row = vert ? 7 - k : 1; col = vert ? 2 : 7 - k; } }
    el.style.gridArea = `${row} / ${col} / span ${rs} / span ${cs}`;
    el.classList.toggle('mine', mine);
  }
  const top = 1 - bottom;
  E.tagTop.innerHTML = `<span style="--pc:${V.players[top].color}">${esc(V.players[top].name)}</span>`;
  E.tagBot.innerHTML = `<span style="--pc:${V.players[bottom].color}">${esc(V.players[bottom].name)}</span>`;
  sizeStones();
}
function sizeStones() {
  const pit = E.cells && E.cells[0]; if (!pit) return;
  const s = Math.min(pit.offsetWidth, pit.offsetHeight);
  if (s) E.board.style.setProperty('--sz', Math.max(8, Math.min(22, Math.round(s * (E.board.classList.contains('v') ? 0.29 : 0.22)))) + 'px');
}
function colorCells() {
  for (let i = 0; i < 14; i++) E.cells[i].style.setProperty('--pc', V.players[owner(i)].color);
  E.cells[6].querySelector('.mg-lbl').textContent = V.players[0].name;
  E.cells[13].querySelector('.mg-lbl').textContent = V.players[1].name;
}
function updateUI() {
  const v = V; if (!v) return;
  const P = v.players, ok = canAct();
  for (let i = 0; i < 14; i++) {
    const el = E.cells[i]; if (!isPit(i)) continue;
    const can = ok && owner(i) === v.cur && disp[i] > 0;
    el.classList.toggle('can', can); el.disabled = !can;
    el.setAttribute('aria-label', `${P[owner(i)].name}: ${i - BASE[owner(i)] + 1}. kuyu, ${disp[i]} taş`);
  }
  E.board.style.setProperty('--edge', v.phase === 'play' || v.phase === 'sow' ? P[v.cur].color : 'var(--gold)');
  const cp = P[v.cur], humans = P.filter(p => !p.isBot).length;
  let s;
  if (v.phase === 'play' || v.phase === 'sow') {
    if (ok) s = ui.mode === 'local' && humans > 1 ? `<span class="g-turn mine">⭐ Sıra: ${esc(cp.name)} · kuyu seç</span>` : '<span class="g-turn mine">⭐ Sıra sende · bir kuyu seç</span>';
    else if (v.phase === 'sow' || A) s = `<span class="g-turn"><b style="color:${P[v.mv ? v.mv.pi : v.cur].color}">${esc(P[v.mv ? v.mv.pi : v.cur].name)}</b> taşları dağıtıyor…</span>`;
    else s = `<span class="g-turn">Sıra: <b style="color:${cp.color}">${esc(cp.name)}</b>${cp.isBot ? ' düşünüyor…' : ''}</span>`;
  } else if (v.phase === 'roundOver' && v.res) {
    s = v.res.winner == null ? `<span class="g-turn win">Berabere! ${v.res.score[0]} – ${v.res.score[1]}</span>` : `<span class="g-turn win">${esc(P[v.res.winner].name)} kazandı! ${v.res.score[0]} – ${v.res.score[1]}</span>`;
  } else s = '<span class="g-turn">Maç bitti</span>';
  E.status.innerHTML = s;
  E.sub.textContent = v.games > 1 ? `${v.game}. oyun · 3 oyunluk maç · 2 galibiyet alan kazanır` : 'Tek oyun · hazinesinde en çok taş toplayan kazanır';
}
// Taşları elde taşıyan "avuç"
function handTo(i, n) {
  const el = E.cells[i], h = E.hand; if (!el) return;
  const x = el.offsetLeft + el.offsetWidth / 2, y = el.offsetTop + el.offsetHeight / 2;
  h.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  h.querySelector('b').textContent = n;
  h.classList.toggle('show', n > 0);
}
function stopAnim() { if (A) { A.timers.forEach(clearTimeout); A = null; } if (E.hand) E.hand.classList.remove('show'); if (E.board) E.board.querySelectorAll('.cap,.from,.last').forEach(x => x.classList.remove('cap', 'from', 'last')); }
function animate(mv) {
  stopAnim();
  const len = mv.path.length, step = stepMs(len), P = V.players, hz = STORE[mv.pi];
  disp = mv.before.slice();
  let hand = disp[mv.from]; disp[mv.from] = 0;
  drawAll();
  E.cells[mv.from].classList.add('from');
  E.hand.style.setProperty('--st', Math.max(60, step - 15) + 'ms');
  E.hand.style.setProperty('--pc', P[mv.pi].color);
  E.hand.classList.add('instant'); handTo(mv.from, hand); void E.hand.offsetWidth; E.hand.classList.remove('instant');
  A = { timers: [] };
  const at = (t, fn) => A.timers.push(setTimeout(() => { if (root && A) fn(); }, t));
  mv.path.forEach((i, j) => at(T(120) + j * step, () => { hand--; handTo(i, hand); disp[i]++; drawPit(i, true); if (!isPit(i)) drawChips(); Sound.tick(0.25 + 0.6 * j / Math.max(1, len - 1)); }));
  let t = T(120) + len * step + T(60);
  at(t, () => { E.hand.classList.remove('show'); E.cells[mv.last].classList.add('last'); });
  t += T(60);
  if (mv.extra) { at(t, () => { Sound.good(); banner('TEKRAR OYNA!', 'good'); burstAt(hz, false); }); t += T(250); }
  if (mv.cap) {
    const cap = mv.cap;
    at(t, () => cap.idx.forEach(i => E.cells[i].classList.add('cap')));
    at(t + T(450), () => {
      cap.idx.forEach(i => { disp[i] = 0; drawPit(i); E.cells[i].classList.remove('cap'); });
      disp[hz] += cap.n; drawPit(hz, true); drawChips();
      Sound.buy(); burstAt(hz, true);
      banner(cap.kind === 'even' ? `ÇİFT! +${cap.n}` : `BOŞ KUYU! +${cap.n}`, 'pink');
    });
    t += T(750);
  }
  if (mv.sweep) {
    const sw = mv.sweep;
    at(t, () => sw.idx.forEach(i => E.cells[i].classList.add('cap')));
    at(t + T(550), () => {
      sw.idx.forEach(i => { disp[i] = 0; drawPit(i); E.cells[i].classList.remove('cap'); });
      disp[STORE[sw.to]] += sw.n; drawPit(STORE[sw.to], true); drawChips();
      if (sw.n) { Sound.special(); burstAt(STORE[sw.to], true); }
    });
    t += T(950);
  }
  at(t, () => { A = null; E.board.querySelectorAll('.from').forEach(x => x.classList.remove('from')); disp = V.pits.slice(); drawAll(); updateUI(); });
}
function burstAt(i, gold) { const el = E.cells && E.cells[i]; if (!el) return; const r = el.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, 22, gold); }
function render(v) {
  V = v;
  if (!E.colored) { colorCells(); E.colored = true; }
  layout(false);
  const mvN = v.mv ? v.mv.n : 0;
  if (lastMv === undefined) { lastMv = mvN; disp = v.pits.slice(); }
  else if (mvN !== lastMv) {
    lastMv = mvN; waiting = false;
    if (v.mv && v.phase === 'sow') animate(v.mv);
    else { stopAnim(); disp = v.pits.slice(); }
  } else if (!A) disp = v.pits.slice();
  if (v.phase !== 'play') waiting = false;
  if (!A) { E.board.querySelectorAll('.from').forEach(x => x.classList.remove('from')); if (!v.mv) E.board.querySelectorAll('.last').forEach(x => x.classList.remove('last')); drawAll(); }
  else drawChips();
  updateUI();
}
function onResize() { if (root && V) layout(false); }
function mount(r, api) {
  root = r; ui = api; V = null; E = {}; disp = null; lastMv = undefined; A = null; waiting = false; lay = '';
  let cells = '';
  for (let i = 0; i < 14; i++) {
    cells += isPit(i)
      ? `<button type="button" class="mg-pit" data-i="${i}" disabled><span class="mg-stones"></span><span class="mg-cnt">${START}</span></button>`
      : `<div class="mg-pit mg-store" data-i="${i}"><span class="mg-lbl"></span><span class="mg-stones"></span><span class="mg-cnt">0</span></div>`;
  }
  root.innerHTML = `<div class="g-wrap mg">
    <div class="g-players mg-chips"></div>
    <div class="g-status mg-status"></div>
    <div class="mg-frame">
      <div class="mg-tag top"></div>
      <div class="mg-board h">${cells}<div class="mg-hand"><i class="mg-st c1"></i><b>0</b></div></div>
      <div class="mg-tag bot"></div>
    </div>
    <p class="g-sub mg-sub"></p>
  </div>`;
  E.chips = root.querySelector('.mg-chips'); E.status = root.querySelector('.mg-status'); E.board = root.querySelector('.mg-board');
  E.sub = root.querySelector('.mg-sub'); E.frame = root.querySelector('.mg-frame'); E.hand = root.querySelector('.mg-hand');
  E.tagTop = root.querySelector('.mg-tag.top'); E.tagBot = root.querySelector('.mg-tag.bot');
  E.cells = Array.from(E.board.querySelectorAll('.mg-pit')).sort((a, b) => a.dataset.i - b.dataset.i);
  E.board.addEventListener('click', e => {
    const b = e.target.closest('button.mg-pit'); if (!b || b.disabled || !canAct()) return;
    const i = +b.dataset.i; if (owner(i) !== V.cur || !(disp[i] > 0)) return;
    Sound.init(); waiting = true; clearTimeout(waitT); waitT = setTimeout(() => { waiting = false; if (root) updateUI(); }, 2000);
    updateUI();
    ui.send({ t: 'pit', i });
  });
  addEventListener('resize', onResize);
}

DEF = {
  id: 'mangala', name: 'Mangala', icon: '🪨', color: '#c8843a', min: 2, max: 2, hotseat: true, bot: true, localMin: 1,
  tagline: 'Taşları dağıt, hazineni doldur',
  rules: 'Kendi kuyularından birini seç: taşları al, ilkini aynı kuyuya bırak, kalanını saat yönünün tersine birer birer dağıt. Son taş hazinene düşerse tekrar oynarsın; rakip kuyuyu çift yaparsa o kuyunun, kendi boş kuyuna düşerse karşı kuyunun taşlarını alırsın. Tarafı ilk boşalan rakip taraftaki taşları da alır; hazinesinde en çok taş olan kazanır.',
  options: [{ key: 'tur', label: 'Tur sayısı', def: '1', choices: [{ v: '1', label: 'Tek oyun' }, { v: '3', label: '3 oyun' }] }],
  setup(players, opts) {
    const st = { players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })), games: opts && String(opts.tur) === '3' ? 3 : 1,
      game: 1, wins: [0, 0], totals: [0, 0], history: [], starter: 0, mvN: 0, seq: 0 };
    newGame(st);
    return st;
  },
  action(st, pi, a, ctx) {
    if (!a || a.t !== 'pit' || st.phase !== 'play' || pi !== st.cur) return;
    const i = a.i;
    if (!Number.isInteger(i) || i < 0 || i > 13 || !isPit(i) || owner(i) !== pi || st.pits[i] <= 0) return;
    doMove(st, pi, i, ctx);
  },
  view(st) {
    const live = CFX.Room.game && CFX.Room.game.players;
    return { pits: st.pits, cur: st.cur, phase: st.phase, mv: st.mv, res: st.res, wins: st.wins, totals: st.totals, game: st.game, games: st.games,
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, online: live && live[i] ? live[i].online !== false : true })) };
  },
  turnOf(st) { return st.phase === 'play' ? st.cur : null; },
  speed: 1,
  get botDelay() { return T(750); },
  botAct(st, pi, ctx) {
    if (st.phase !== 'play' || st.cur !== pi) return;
    const moves = legal(st.pits, pi); if (!moves.length) return;
    let m = -1;
    try { m = bestMove(st.pits, pi, 7); } catch (e) { console.error(e); }
    if (!moves.includes(m)) m = moves[Math.floor(Math.random() * moves.length)];
    doMove(st, pi, m, ctx);
  },
  skipTurn(st, pi, ctx) {
    if (st.phase !== 'play' || st.cur !== pi) return;
    const moves = legal(st.pits, pi); if (!moves.length) return;
    doMove(st, pi, moves[Math.floor(Math.random() * moves.length)], ctx);
  },
  resume(st, ctx) {
    const s = ++st.seq;
    if (st.phase === 'sow') ctx.later(400, () => { if (st.seq === s) finishSow(st, ctx); });
    else if (st.phase === 'roundOver') ctx.later(1500, () => { if (st.seq === s) afterGame(st, ctx); });
    else if (st.phase === 'done') ctx.end(finalResult(st));
  },
  mount, render,
  onEvent(e, api) {
    const nm = i => (V && V.players[i] ? trUp(V.players[i].name) : '');
    switch (e.t) {
      case 'gameEnd':
        if (e.winner == null) { Sound.bad(); banner('BERABERE', 'pink'); }
        else { Sound.solve(); FX.confetti(90); flash('good'); banner(`${nm(e.winner)} KAZANDI!`, 'good'); }
        break;
      case 'newGame': Sound.whoosh(); banner(`${e.game}. OYUN`); break;
      case 'turn': {
        const u = api || ui;
        if (u && u.mode === 'online' && e.pi === u.me) setTimeout(() => { if (root) Sound.good(); }, 50);
        break;
      }
      default: break;
    }
  },
  unmount() { stopAnim(); clearTimeout(waitT); removeEventListener('resize', onResize); root = null; V = null; E = {}; disp = null; }
};
CFX.registerGame(DEF);

// Test için kurallara dışarıdan erişim (Node birim testleri)
if (typeof module !== 'undefined' && module.exports) module.exports = { play, bestMove, legal, sideSum };
})();
