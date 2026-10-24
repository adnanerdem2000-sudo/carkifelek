/* =========================================================================
   OYUN SALONU — TAVLA
   Türk tavlası: Klasik (erkek tavlası), Gülbara ve Tapa. 2 kişi online,
   aynı cihazda ya da bilgisayara karşı; fazla oda üyeleri izler.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial } = CFX;
const rnd6 = () => 1 + Math.floor(Math.random() * 6);

/* ------------------------------------------------------------------
   KURALLAR (saf fonksiyonlar)
   Her oyuncu için "göreli" hane numarası r: 24 = en uzak, 1..6 = ev,
   25 = kırık (bar), 0 = toplandı. Tahta mutlak 1..24 haneyle tutulur.   */
const VARS = { klasik: 'Klasik Tavla', gulbara: 'Gülbara', tapa: 'Tapa' };
const ABS = {}, REL = {};
for (const v of Object.keys(VARS)) {
  ABS[v] = [[0], [0]]; REL[v] = [[0], [0]];
  for (let pi = 0; pi < 2; pi++) for (let r = 1; r <= 24; r++) {
    const a = pi === 0 ? r : v === 'gulbara' ? ((r + 11) % 24) + 1 : 25 - r;
    ABS[v][pi][r] = a; REL[v][pi][a] = r;
  }
}
function emptyBoard() { return { n: [Array(25).fill(0), Array(25).fill(0)], pin: Array(25).fill(-1), bar: [0, 0], off: [0, 0] }; }
function initBoard(v) {
  const b = emptyBoard();
  const lay = v === 'klasik' ? { 24: 2, 13: 5, 8: 3, 6: 5 } : { 24: 15 };
  for (let pi = 0; pi < 2; pi++) for (const r in lay) b.n[pi][ABS[v][pi][+r]] = lay[r];
  return b;
}
function cloneB(b) { return { n: [b.n[0].slice(), b.n[1].slice()], pin: b.pin.slice(), bar: b.bar.slice(), off: b.off.slice() }; }
function keyB(b) { return b.n[0].join('') + '|' + b.n[1].join('') + '|' + (b.pin.indexOf(0) >= 0 || b.pin.indexOf(1) >= 0 ? b.pin.join('') : '') + b.bar[0] + b.bar[1] + '.' + b.off[0] + '.' + b.off[1]; }
const movableAt = (b, pi, a) => b.n[pi][a] - (b.pin[a] === pi ? 1 : 0);
function canLand(b, v, pi, a) {
  const on = b.n[1 - pi][a];
  if (v === 'klasik') return on <= 1;                 // tek taş kırılır
  if (v === 'gulbara') return on === 0;               // tek taş bile haneyi kapatır
  return on === 0 || (on === 1 && b.pin[a] !== pi);   // tapa: tek taş tapalanır
}
function allHome(b, v, pi) {
  if (b.bar[pi]) return false;
  const A = ABS[v][pi];
  for (let r = 7; r <= 24; r++) if (b.n[pi][A[r]]) return false;
  return true;
}
// Gülbara: ilk pul rakibin başlangıç bölgesine (7–12) varmadan başlangıçtan ikinci pul çıkamaz
function headOk(b, v, pi) {
  const A = ABS[v][pi];
  if (b.n[pi][A[24]] >= 15 || b.off[pi]) return true;
  for (let r = 1; r <= 12; r++) if (b.n[pi][A[r]]) return true;
  return false;
}
function genMoves(b, v, pi, d) {
  const A = ABS[v][pi], out = [];
  if (b.bar[pi]) { const t = 25 - d; if (canLand(b, v, pi, A[t])) out.push({ f: 25, t, d }); return out; }
  let home = null;
  for (let r = 24; r >= 1; r--) {
    const a = A[r]; if (movableAt(b, pi, a) <= 0) continue;
    if (v === 'gulbara' && r === 24 && !headOk(b, v, pi)) continue;
    const t = r - d;
    if (t >= 1) { if (canLand(b, v, pi, A[t])) out.push({ f: r, t, d }); continue; }
    if (home === null) home = allHome(b, v, pi);
    if (!home) continue;
    if (t === 0) { out.push({ f: r, t: 0, d }); continue; }
    let higher = false;
    for (let q = r + 1; q <= 6; q++) if (b.n[pi][A[q]]) { higher = true; break; }
    if (!higher) out.push({ f: r, t: 0, d });
  }
  return out;
}
function applyMove(b, v, pi, m) {
  const nb = cloneB(b), A = ABS[v][pi], op = 1 - pi; let hit = false, pin = false;
  if (m.f === 25) nb.bar[pi]--;
  else { const a = A[m.f]; nb.n[pi][a]--; if (nb.n[pi][a] === 0 && nb.pin[a] === op) nb.pin[a] = -1; }
  if (m.t <= 0) nb.off[pi]++;
  else {
    const a = A[m.t];
    if (v === 'klasik' && nb.n[op][a] === 1) { nb.n[op][a] = 0; nb.bar[op]++; hit = true; }
    else if (v === 'tapa' && nb.n[op][a] === 1 && nb.pin[a] === -1) { nb.pin[a] = op; pin = true; }
    nb.n[pi][a]++;
  }
  return { b: nb, hit, pin };
}
const removeDie = (dice, d) => { const i = dice.indexOf(d), r = dice.slice(); if (i >= 0) r.splice(i, 1); return r; };
function maxUse(b, v, pi, dice, memo) {
  if (!dice.length || b.off[pi] >= 15) return 0;
  const k = keyB(b) + '#' + dice.join('');
  const c = memo.get(k); if (c !== undefined) return c;
  let best = 0; const tried = [];
  for (let i = 0; i < dice.length && best < dice.length; i++) {
    const d = dice[i]; if (tried.includes(d)) continue; tried.push(d);
    const rest = removeDie(dice, d);
    for (const m of genMoves(b, v, pi, d)) {
      const u = 1 + maxUse(applyMove(b, v, pi, m).b, v, pi, rest, memo);
      if (u > best) { best = u; if (best === dice.length) break; }
    }
  }
  memo.set(k, best); return best;
}
// Oynanabilecek ilk adımlar: en çok zarı kullanan dizilerin başı; tek zar oynanabiliyorsa büyük zar zorunlu
function legalSteps(b, v, pi, dice, memo) {
  memo = memo || new Map();
  const max = maxUse(b, v, pi, dice, memo); if (!max) return [];
  let out = []; const tried = [];
  for (const d of dice) {
    if (tried.includes(d)) continue; tried.push(d);
    const rest = removeDie(dice, d);
    for (const m of genMoves(b, v, pi, d)) if (1 + maxUse(applyMove(b, v, pi, m).b, v, pi, rest, memo) === max) out.push(m);
  }
  if (max === 1 && dice.length === 2 && dice[0] !== dice[1]) { const hi = Math.max(dice[0], dice[1]), h = out.filter(m => m.d === hi); if (h.length) out = h; }
  return out;
}
// Bütün tam hamle dizileri (sonuç tahtası tekilleştirilmiş)
function allSeqs(b, v, pi, dice) {
  const memo = new Map(), seen = new Set(), visited = new Set(), out = [];
  (function rec(b, dice, path) {
    const vk = keyB(b) + '#' + dice.slice().sort().join('');
    if (visited.has(vk)) return; visited.add(vk);
    const st = b.off[pi] >= 15 ? [] : legalSteps(b, v, pi, dice, memo);
    if (!st.length) { const k = keyB(b); if (!seen.has(k)) { seen.add(k); out.push({ b, path }); } return; }
    for (const m of st) { const r = applyMove(b, v, pi, m); rec(r.b, removeDie(dice, m.d), path.concat([{ f: m.f, t: m.t, d: m.d }])); }
  })(b, dice, []);
  return out;
}
function pipOf(b, v, pi) { const A = ABS[v][pi]; let s = b.bar[pi] * 25; for (let r = 1; r <= 24; r++) s += r * b.n[pi][A[r]]; return s; }
function motherPinned(b, v, pi) { const a = ABS[v][pi][24]; return v === 'tapa' && b.pin[a] === pi && b.n[pi][a] === 1; }

/* ---------- değerlendirme (bilgisayar) ---------- */
const PV = [0, 1.0, 1.5, 2.2, 2.9, 3.3, 3.1, 2.8, 1.6, 1.0, .8, .6, .5, .4, .35, .3, .3, .3, .5, .9, 1.1, 1.2, 1.2, 1.0, .6];
function hasContact(b, v, me) {
  const op = 1 - me; let mm = b.bar[me] ? 25 : 0, mo = b.bar[op] ? 25 : 0;
  for (let r = 24; r >= 1 && !mm; r--) if (b.n[me][ABS[v][me][r]]) mm = r;
  for (let r = 24; r >= 1 && !mo; r--) if (b.n[op][ABS[v][op][r]]) mo = r;
  return mm + mo > 25;
}
// Rakibin bir sonraki zarında açık taşlarıma vurma (ya da tapalama) riski: beklenen kayıp
function shotRisk(b, v, me, lvl) {
  const op = 1 - me, Ao = ABS[v][op], Ro = REL[v][op], Am = ABS[v][me];
  const blots = [];
  for (let r = 1; r <= 24; r++) {
    const a = Am[r];
    if (b.n[me][a] === 1 && b.pin[a] === -1) {
      let loss;
      if (v === 'tapa') loss = r === 24 ? 160 : 10 + (25 - r) * .25;
      else loss = (25 - r) * .8 + 4;
      blots.push({ ro: Ro[a], loss });
    }
  }
  if (!blots.length) return 0;
  const att = [];
  if (b.bar[op]) att.push(25);
  if (b.bar[op] < 2) for (let r = 1; r <= 24; r++) if (movableAt(b, op, Ao[r]) > 0) att.push(r);
  const open = x => x >= 1 && canLand(b, v, op, Ao[x]);
  const strict = lvl === 'zor';
  let total = 0;
  for (let d1 = 1; d1 <= 6; d1++) for (let d2 = d1; d2 <= 6; d2++) {
    let worst = 0;
    for (const bl of blots) {
      if (bl.loss <= worst) continue;
      let hit = false;
      for (const s of att) {
        const dist = s - bl.ro; if (dist <= 0 || dist > 24) continue;
        if (dist === d1 || dist === d2) { hit = true; break; }
        if (lvl === 'kolay') continue;
        if (d1 === d2) {
          for (let k = 2; k <= 4 && !hit; k++) if (dist === d1 * k) {
            let ok = true; if (strict) for (let j = 1; j < k; j++) if (!open(s - d1 * j)) { ok = false; break; }
            if (ok) hit = true;
          }
          if (hit) break;
        } else if (dist === d1 + d2 && (!strict || open(s - d1) || open(s - d2))) { hit = true; break; }
      }
      if (hit) worst = bl.loss;
    }
    total += (d1 === d2 ? 1 : 2) * worst;
  }
  return total / 36;
}
function evaluate(b, v, me, lvl) {
  const op = 1 - me;
  if (b.off[me] >= 15) return 100000 + (b.off[op] === 0 ? 5000 : 0);
  if (motherPinned(b, v, op)) return 90000;
  const myP = pipOf(b, v, me), opP = pipOf(b, v, op);
  let s = opP - myP + b.off[me] * 1.2;
  const A = ABS[v][me], Ao = ABS[v][op];
  if (v === 'gulbara') {
    const Ro = REL[v][op], Rm = REL[v][me];
    // rakibin önünü kesen haneler ve benim tıkanmışlığım
    const blockOf = (who, other) => {
      const Aw = ABS[v][who], Rother = REL[v][other], Aother = ABS[v][other]; let sc = 0, run = 0, best = 0;
      for (let ro = 24; ro >= 1; ro--) {
        const a = Aother[ro], mine = b.n[who][a] > 0;
        if (mine) { run++; best = Math.max(best, run); let threat = false; for (let k = 1; k <= 6; k++) { const q = ro + k; if (q <= 24 && b.n[other][Aother[q]]) { threat = true; break; } } if (threat) sc += 1; }
        else run = 0;
      }
      void Aw; void Rother;
      return sc + (best >= 3 ? (best - 2) * (best - 2) * .9 : 0);
    };
    s += blockOf(me, op) * 1.3 - blockOf(op, me) * 1.0;
    let pts = 0, stack = 0; for (let r = 1; r <= 24; r++) { const c = b.n[me][A[r]]; if (c) pts++; if (c > 4 && r !== 24) stack += c - 4; }
    s += pts * .35 - stack * .25;
    void Ro; void Rm;
    return s;
  }
  if (!hasContact(b, v, me)) {
    let gaps = 0; for (let r = 1; r <= 6; r++) { const c = b.n[me][A[r]]; if (c > 3) gaps += (c - 3) * .15; }
    return s * 1.25 + b.off[me] * 2.5 - gaps;
  }
  let homeMade = 0, oppHome = 0, run = 0, bestRun = 0;
  for (let r = 1; r <= 24; r++) {
    const a = A[r], c = b.n[me][a] - (b.pin[a] === me ? 1 : 0);
    if (c >= 2 || (v === 'tapa' && c >= 1 && b.pin[a] === op)) { s += PV[r] * 1.6; if (r <= 6) homeMade++; run++; bestRun = Math.max(bestRun, run); }
    else run = 0;
    if (c > 4) s -= (c - 4) * .45;
    const ao = Ao[r]; if (b.n[op][ao] - (b.pin[ao] === op ? 1 : 0) >= 2 && r <= 6) oppHome++;
  }
  if (bestRun >= 3) s += (bestRun - 2) * (bestRun - 2) * 1.6;
  if (v === 'klasik') {
    s += b.bar[op] * (3 + homeMade * 1.6) + (b.bar[op] && homeMade === 6 ? 14 : 0);
    s -= b.bar[me] * (3 + oppHome * 1.6) + (b.bar[me] && oppHome === 6 ? 14 : 0);
  } else {
    for (let a = 1; a <= 24; a++) {
      if (b.pin[a] === op) s += 11 + (REL[v][op][a] === 24 ? 30 : 0) + (REL[v][op][a] >= 13 ? 3 : 0);
      else if (b.pin[a] === me) s -= 11 + (REL[v][me][a] >= 13 ? 3 : 0);
    }
    if (motherPinned(b, v, me)) s -= 3000;
  }
  const risk = shotRisk(b, v, me, lvl);
  s -= risk * (lvl === 'kolay' ? .4 : 1) * (1 + oppHome * .12);
  return s;
}
function botPlanFor(b, v, pi, dice, lvl) {
  const seqs = allSeqs(b, v, pi, dice);
  if (!seqs.length) return [];
  if (seqs.length === 1) return seqs[0].path;
  if (lvl === 'kolay' && Math.random() < .3) return seqs[Math.floor(Math.random() * seqs.length)].path;
  const noise = lvl === 'kolay' ? 6 : lvl === 'orta' ? 1.4 : 0;
  let best = seqs[0], bs = -Infinity;
  for (const s of seqs) { const e = evaluate(s.b, v, pi, lvl) + (noise ? (Math.random() - .5) * 2 * noise : 0); if (e > bs) { bs = e; best = s; } }
  return best.path;
}
function winProb(b, v, me) {
  const e = evaluate(b, v, me, 'orta') + 6;
  return 1 / (1 + Math.exp(-e / 13));
}

/* ------------------------------------------------------------------
   OYUN AKIŞI (yöneten cihaz)                                          */
const DIE_NAME = { 1: 'yek', 2: 'dü', 3: 'se', 4: 'cihar', 5: 'beş', 6: 'şeş' };
const DBL_NAME = { 1: 'hep yek', 2: 'dubara', 3: 'dü se', 4: 'dü cihar', 5: 'dü beş', 6: 'düşeş' };
function diceName(a, b) { return a === b ? DBL_NAME[a] : `${DIE_NAME[Math.max(a, b)]} ${DIE_NAME[Math.min(a, b)]}`; }
const fmtMove = m => `${m.f === 25 ? 'bar' : m.f}/${m.t <= 0 ? 'çık' : m.t}${m.hit || m.pin ? '*' : ''}`;

function newGame(st) {
  st.b = initBoard(st.v);
  Object.assign(st, { dice: [0, 0], rem: [], chain: [], hist: [], moves: [], legal: [], reach: {}, tc: [0, 0], cubeV: 1, cubeOwner: -1, offer: -1,
    win: null, plan: null, noMove: false, passes: 0, last: null, sd: [0, 0], pend: null });
}
function schedule(st, ctx, k, ms) { st.pend = { k, at: Date.now() + ms }; ctx.later(ms, () => runPend(st, ctx, k)); }
function runPend(st, ctx, k) {
  if (!st.pend || st.pend.k !== k) return;
  st.pend = null;
  if (k === 'tie') { st.sd = [0, 0]; st.phase = 'start'; ctx.emit({ t: 'retie' }); ctx.sync(); }
  else if (k === 'begin') { st.cur = st.sd[0] > st.sd[1] ? 0 : 1; st.phase = 'roll'; ctx.emit({ t: 'begin', pi: st.cur }); ctx.sync(); }
  else if (k === 'pass') { if (st.phase === 'move' && st.noMove) endTurn(st, ctx); }
  else if (k === 'next') nextGame(st, ctx);
}
function refresh(st) {
  const memo = new Map();
  let legal = legalSteps(st.b, st.v, st.cur, st.rem, memo);
  while (!legal.length && !st.rem.length && st.chain.length && st.b.off[st.cur] < 15) {
    const d = st.chain.shift(); st.rem = [d, d, d, d]; legal = legalSteps(st.b, st.v, st.cur, st.rem, memo);
  }
  st.legal = legal.map(m => ({ f: m.f, t: m.t, d: m.d }));
  // aynı taşla birden çok zar: varılabilecek haneler
  const reach = {};
  const add = (f, t, ds) => {
    const L = reach[f] || (reach[f] = []), e = L.find(x => x.t === t), sum = a => a.reduce((x, y) => x + y, 0);
    if (!e) L.push({ t, ds }); else if (ds.length < e.ds.length || (ds.length === e.ds.length && sum(ds) < sum(e.ds))) e.ds = ds;
  };
  const rec = (b, dice, f0, ms, ds) => {
    for (const m of ms) {
      const nds = ds.concat(m.d); add(f0, m.t, nds);
      if (m.t <= 0) continue;
      const rest = removeDie(dice, m.d); if (!rest.length) continue;
      const nb = applyMove(b, st.v, st.cur, m).b;
      rec(nb, rest, f0, legalSteps(nb, st.v, st.cur, rest, memo).filter(x => x.f === m.t), nds);
    }
  };
  for (const f of [...new Set(legal.map(m => m.f))]) rec(st.b, st.rem, f, legal.filter(m => m.f === f), []);
  st.reach = reach;
}
function doRoll(st, ctx) {
  const a = rnd6(), b = rnd6(), pi = st.cur;
  st.dice = [a, b]; st.rollN = (st.rollN || 0) + 1; st.rollT = Date.now();
  st.rem = a === b ? [a, a, a, a] : [a, b];
  st.chain = [];
  if (st.v === 'gulbara' && a === b && st.tc[pi] >= 3) for (let d = a + 1; d <= 6; d++) st.chain.push(d);
  st.tc[pi]++;
  st.hist = []; st.moves = []; st.plan = null; st.phase = 'move'; st.noMove = false;
  refresh(st);
  const name = st.players[pi].name;
  ctx.emit({ t: 'roll', pi, d: [a, b] }, `${name}: ${a}-${b} (${diceName(a, b)})${st.chain.length ? ` · Gülbara zinciri: ${[a].concat(st.chain).map(x => x + '-' + x).join(', ')}` : ''}`, a === b ? 'gold' : '');
  if (!st.legal.length) {
    st.noMove = true; st.passes++;
    ctx.emit({ t: 'nomove', pi }, `${name} oynayacak hamle bulamadı, sıra geçiyor.`, 'bad');
    schedule(st, ctx, 'pass', 2300);
  } else st.passes = 0;
  ctx.sync();
}
function applyStep(st, ctx, m) {
  const pi = st.cur;
  st.hist.push({ b: cloneB(st.b), rem: st.rem.slice(), chain: st.chain.slice() });
  const r = applyMove(st.b, st.v, pi, m);
  st.b = r.b; st.rem = removeDie(st.rem, m.d);
  st.stepN = (st.stepN || 0) + 1;
  const rec = { k: st.stepN, pi, f: m.f, t: m.t, d: m.d, hit: r.hit, pin: r.pin };
  st.moves.push(rec);
  st.steps = (st.steps || []).concat([rec]).slice(-12);
  ctx.emit({ t: 'mv', pi, f: m.f, to: m.t, hit: r.hit, pin: r.pin, off: m.t <= 0 });
  if (st.b.off[pi] >= 15) { finishTurnLog(st, ctx); finishGame(st, ctx, pi, 'normal'); return; }
  refresh(st);
}
function finishTurnLog(st, ctx) {
  if (st.moves.length) ctx.emit({ t: 'played', pi: st.cur }, `${st.players[st.cur].name} oynadı: ${st.moves.map(fmtMove).join(' ')}`);
}
function endTurn(st, ctx) {
  const pi = st.cur, op = 1 - pi;
  finishTurnLog(st, ctx);
  st.last = { pi, moves: st.moves.map(m => ({ f: m.f, t: m.t, hit: m.hit, pin: m.pin })) };
  if (st.v === 'tapa' && motherPinned(st.b, st.v, op)) {
    ctx.emit({ t: 'mother', pi }, `${st.players[pi].name} ana taşı tapaladı!`, 'gold');
    finishGame(st, ctx, pi, 'mother'); return;
  }
  Object.assign(st, { cur: op, phase: 'roll', rem: [], chain: [], legal: [], reach: {}, hist: [], moves: [], plan: null, noMove: false });
  if (st.passes >= 40) {   // karşılıklı kilitlenme güvencesi
    const w = pipOf(st.b, st.v, 0) <= pipOf(st.b, st.v, 1) ? 0 : 1;
    ctx.emit({ t: 'stuck' }, 'Tahta kilitlendi; pip sayısı az olan oyunu alıyor.', 'gold');
    finishGame(st, ctx, w, 'stuck'); return;
  }
  ctx.sync();
}
function finishGame(st, ctx, w, kind) {
  const l = 1 - w;
  const mars = kind === 'mother' || ((kind === 'normal') && st.b.off[l] === 0);
  const pts = (mars ? 2 : 1) * st.cubeV;
  st.score[w] += pts;
  Object.assign(st, { phase: 'over', legal: [], reach: {}, noMove: false, plan: null, win: { pi: w, pts, mars, kind } });
  const nm = st.players[w].name;
  const why = kind === 'drop' ? ' (rakip katlamayı kabul etmedi)' : kind === 'mother' ? ' (ana taş tapası)' : '';
  ctx.emit({ t: 'win', pi: w, pts, mars, kind }, `${nm} oyunu aldı${mars ? ' — MARS!' : ''} +${pts} puan${why}. Skor ${st.score[0]} – ${st.score[1]}`, 'good');
  ctx.sync();
  schedule(st, ctx, 'next', mars ? 4600 : 3800);
}
function nextGame(st, ctx) {
  const champ = st.score.findIndex(s => s >= st.target);
  if (champ >= 0) {
    st.phase = 'done'; ctx.sync();
    const other = 1 - champ;
    ctx.end({ title: `${st.players[champ].name} ${st.target > 1 ? 'maçı' : 'oyunu'} kazandı!`,
      ranking: [champ, other].map(i => ({ pi: i, score: st.score[i], label: `${st.score[i]} puan` })),
      note: `${VARS[st.v]} · ${st.target > 1 ? st.target + ' puanlık maç' : 'tek oyun'} · ${st.game} oyun oynandı` });
    return;
  }
  const w = st.win ? st.win.pi : 0;
  st.game++; newGame(st); st.cur = w; st.phase = 'roll';
  ctx.emit({ t: 'game', pi: w }, `${st.game}. oyun başladı. ${st.players[w].name} önceki oyunu kazandığı için başlıyor.`, 'gold');
  ctx.sync();
}
function canDouble(st, pi) { return st.cube && st.phase === 'roll' && st.cur === pi && (st.cubeOwner === -1 || st.cubeOwner === pi) && st.cubeV < 64 && st.score[pi] + st.cubeV < st.target; }
function startThrow(st, pi, ctx) {
  if (st.phase !== 'start' || st.sd[pi]) return;
  st.sd[pi] = rnd6(); st.rollN = (st.rollN || 0) + 1;
  ctx.emit({ t: 'sroll', pi, d: st.sd[pi] }, `${st.players[pi].name} başlangıç zarı: ${st.sd[pi]}`);
  if (st.sd[0] && st.sd[1]) {
    st.phase = 'startDone';
    if (st.sd[0] === st.sd[1]) { ctx.emit({ t: 'tie' }, 'Zarlar eşit! Yeniden atılıyor.'); schedule(st, ctx, 'tie', 1900); }
    else { const s = st.sd[0] > st.sd[1] ? 0 : 1; ctx.emit({ t: 'starter', pi: s }, `${st.players[s].name} büyük attı ve oyuna başlıyor.`, 'gold'); schedule(st, ctx, 'begin', 2000); }
  }
  ctx.sync();
}
// Bağlantısı kopan oyuncu ya da yardım: kalan hamleleri en iyi şekilde oyna ve onayla
function autoFinish(st, ctx, lvl) {
  if (st.phase !== 'move') return;
  if (st.hist.length) { const h = st.hist[0]; st.b = h.b; st.rem = h.rem; st.chain = h.chain; st.hist = []; st.moves = []; refresh(st); }
  let guard = 0;
  while (st.phase === 'move' && st.legal.length && guard++ < 40) {
    const plan = botPlanFor(st.b, st.v, st.cur, st.rem, lvl);
    if (!plan.length) break;
    for (const p of plan) {
      if (st.phase !== 'move') break;
      const m = st.legal.find(x => x.f === p.f && x.d === p.d) || st.legal[0];
      if (!m) break;
      applyStep(st, ctx, m);
    }
  }
  if (st.phase === 'move') { if (st.noMove) st.pend = null; endTurn(st, ctx); }
}

const DEF = {
  id: 'tavla', name: 'Tavla', icon: '🟤', color: '#c98a3c', min: 2, max: 2, hotseat: true, bot: true, localMin: 1,
  tagline: 'Klasik, Gülbara ve Tapa — ahşap tahtada Türk tavlası',
  rules: 'Zarları at, taşlarını karşı yönden kendi evine getir ve topla. Klasikte tek taş kırılır, Tapada kırmak yerine tapalanır, Gülbarada tek taş bile haneyi kapatır. Rakip hiç taş toplamadan bitirirsen MARS: 2 puan.',
  options: [
    { key: 'tur', label: 'Oyun türü', def: 'klasik', choices: [{ v: 'klasik', label: 'Klasik (Erkek)' }, { v: 'gulbara', label: 'Gülbara' }, { v: 'tapa', label: 'Tapa' }] },
    { key: 'mac', label: 'Maç', def: '3', choices: [{ v: '1', label: 'Tek oyun' }, { v: '3', label: '3 puan' }, { v: '5', label: '5 puan' }, { v: '7', label: '7 puan' }] },
    { key: 'kup', label: 'Katlama küpü', def: '0', choices: [{ v: '0', label: 'Kapalı' }, { v: '1', label: 'Açık' }] },
    { key: 'zorluk', label: 'Bilgisayar', def: 'orta', choices: [{ v: 'kolay', label: 'Kolay' }, { v: 'orta', label: 'Orta' }, { v: 'zor', label: 'Zor' }] }
  ],
  setup(players, opts) {
    const v = VARS[opts.tur] ? opts.tur : 'klasik';
    const st = { players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })), v, target: [1, 3, 5, 7].includes(+opts.mac) ? +opts.mac : 3,
      cube: opts.kup === '1', lvl: ['kolay', 'orta', 'zor'].includes(opts.zorluk) ? opts.zorluk : 'orta', score: [0, 0], game: 1, cur: 0, phase: 'start', rollN: 0, stepN: 0, undoN: 0, steps: [] };
    newGame(st);
    return st;
  },
  action(st, pi, a, ctx) {
    if (!a || typeof a.t !== 'string') return;
    if (a.t === 'roll') {
      if (st.phase === 'start') { startThrow(st, pi, ctx); return; }
      if (st.phase !== 'roll' || pi !== st.cur) return;
      doRoll(st, ctx); return;
    }
    if (a.t === 'dbl') {
      if (!canDouble(st, pi)) return;
      st.phase = 'dbl'; st.offer = pi;
      ctx.emit({ t: 'dbl', pi, v: st.cubeV * 2 }, `${st.players[pi].name} katlamayı teklif etti: ×${st.cubeV * 2}`, 'gold');
      ctx.sync(); return;
    }
    if (a.t === 'take' || a.t === 'drop') {
      if (st.phase !== 'dbl' || pi !== 1 - st.offer) return;
      if (a.t === 'take') {
        st.cubeV *= 2; st.cubeOwner = pi; st.phase = 'roll';
        ctx.emit({ t: 'take', pi, v: st.cubeV }, `${st.players[pi].name} kabul etti. Küp ×${st.cubeV}.`);
        ctx.sync();
      } else {
        ctx.emit({ t: 'drop', pi }, `${st.players[pi].name} katlamayı kabul etmedi.`, 'bad');
        finishGame(st, ctx, st.offer, 'drop');
      }
      return;
    }
    if (st.phase !== 'move' || pi !== st.cur || st.noMove) return;
    if (a.t === 'mv') {
      const m = st.legal.find(x => x.f === (a.f | 0) && x.d === (a.d | 0)); if (!m) return;
      applyStep(st, ctx, m); ctx.sync(); return;
    }
    if (a.t === 'path') {
      if (!Array.isArray(a.ds) || !a.ds.length || a.ds.length > 4) return;
      // önce kopyada doğrula, sonra uygula
      let b = st.b, rem = st.rem.slice(), f = a.f | 0;
      for (const dRaw of a.ds) {
        const d = dRaw | 0;
        if (!rem.includes(d)) return;
        const L = legalSteps(b, st.v, pi, rem);
        const m = L.find(x => x.f === f && x.d === d); if (!m) return;
        b = applyMove(b, st.v, pi, m).b; rem = removeDie(rem, d); f = m.t;
        if (f <= 0) break;
      }
      let f2 = a.f | 0;
      for (const dRaw of a.ds) {
        if (st.phase !== 'move') break;
        const m = st.legal.find(x => x.f === f2 && x.d === (dRaw | 0)); if (!m) break;
        applyStep(st, ctx, m); f2 = m.t; if (f2 <= 0) break;
      }
      ctx.sync(); return;
    }
    if (a.t === 'undo') {
      const h = st.hist.pop(); if (!h) return;
      st.b = h.b; st.rem = h.rem; st.chain = h.chain; st.moves.pop(); st.undoN = (st.undoN || 0) + 1; st.plan = null;
      refresh(st); ctx.emit({ t: 'undo', pi }); ctx.sync(); return;
    }
    if (a.t === 'ok') {
      if (st.legal.length) return;
      endTurn(st, ctx); return;
    }
  },
  view(st) {
    const R = CFX.Room && CFX.Room.game;
    return {
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, online: R && R.players[i] ? R.players[i].online !== false : true })),
      v: st.v, target: st.target, game: st.game, score: st.score, phase: st.phase, cur: st.cur, turn: DEF.turnOf(st),
      b: st.b, dice: st.dice, rem: st.rem, chain: st.chain, rollN: st.rollN, sd: st.sd, legal: st.legal, reach: st.reach,
      moves: st.moves.length, canUndo: st.hist.length > 0, noMove: st.noMove, stepN: st.stepN, undoN: st.undoN, steps: st.steps, last: st.last,
      cube: st.cube, cubeV: st.cubeV, cubeOwner: st.cubeOwner, offer: st.offer, canDbl: [canDouble(st, 0), canDouble(st, 1)],
      win: st.win, pips: [pipOf(st.b, st.v, 0), pipOf(st.b, st.v, 1)], lvl: st.lvl
    };
  },
  turnOf(st) {
    switch (st.phase) {
      case 'start': return !st.sd[0] ? 0 : !st.sd[1] ? 1 : null;
      case 'roll': return st.cur;
      case 'dbl': return 1 - st.offer;
      case 'move': return st.noMove ? null : st.cur;
      default: return null;
    }
  },
  botDelay: 720,
  botAct(st, pi, ctx) {
    if (DEF.turnOf(st) !== pi) return;
    const lvl = st.lvl;
    if (st.phase === 'start') { startThrow(st, pi, ctx); return; }
    if (st.phase === 'dbl') { DEF.action(st, pi, { t: winProb(st.b, st.v, pi) - 6 / 100 >= .22 ? 'take' : 'drop' }, ctx); return; }
    if (st.phase === 'roll') {
      if (canDouble(st, pi) && lvl !== 'kolay' && st.lastDblTry !== st.rollN && winProb(st.b, st.v, pi) > .74) { st.lastDblTry = st.rollN; DEF.action(st, pi, { t: 'dbl' }, ctx); return; }
      doRoll(st, ctx); return;
    }
    if (st.phase !== 'move') return;
    const wait = 1350 - (Date.now() - (st.rollT || 0));
    if (wait > 60 && st.moves.length === 0) { ctx.later(wait, () => ctx.sync()); return; }
    if (!st.legal.length) { endTurn(st, ctx); return; }
    let next = st.plan && st.plan[0];
    let m = next && st.legal.find(x => x.f === next.f && x.d === next.d);
    if (!m) {
      st.plan = botPlanFor(st.b, st.v, pi, st.rem, lvl);
      next = st.plan[0]; m = next && st.legal.find(x => x.f === next.f && x.d === next.d);
      if (!m) { st.plan = null; m = st.legal[0]; }
    }
    if (st.plan) st.plan.shift();
    applyStep(st, ctx, m);
    ctx.sync();
  },
  skipTurn(st, pi, ctx) {
    if (DEF.turnOf(st) !== pi) return;
    if (st.phase === 'start') startThrow(st, pi, ctx);
    else if (st.phase === 'roll') doRoll(st, ctx);
    else if (st.phase === 'dbl') DEF.action(st, pi, { t: 'take' }, ctx);
    else if (st.phase === 'move') { autoFinish(st, ctx, 'orta'); ctx.sync(); }
  },
  resume(st, ctx) {
    if (st.pend) { const k = st.pend.k; ctx.later(Math.max(300, st.pend.at - Date.now()), () => runPend(st, ctx, k)); st.pend.at = Date.now() + Math.max(300, st.pend.at - Date.now()); }
  }
};

/* ------------------------------------------------------------------
   ARAYÜZ                                                              */
let root = null, ui = null, V = null, E = {}, G = null;
let persp = 0, sel = null, drag = null, ro = null, resizeT = 0;
let shownRoll = -1, shownStep = -1, shownUndo = -1, shownSd = [0, 0], diceBusy = false, lastKey = '', fxShown = '';
let hintsOn = true;
try { hintsOn = localStorage.getItem('tv.hints') !== '0'; } catch { /* yok */ }
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const FACE_ROT = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };
const FACE_TF = { 1: '', 2: 'rotateX(90deg)', 3: 'rotateY(90deg)', 4: 'rotateY(-90deg)', 5: 'rotateX(-90deg)', 6: 'rotateY(180deg)' };

function actor(v) {
  const t = v.turn; if (t == null) return -1;
  if (ui.mode === 'local') return v.players[t].isBot ? -1 : t;
  return ui.me === t ? t : -1;
}
function perspOf(v) {
  if (ui.mode !== 'local') return ui.me >= 0 ? ui.me : 0;
  const hum = v.players.map((p, i) => p.isBot ? -1 : i).filter(i => i >= 0);
  if (hum.length === 1) return hum[0];
  if (v.phase === 'start' || v.phase === 'startDone') return 0;
  if (v.turn != null) return v.turn;
  return persp;
}
const myMoveTurn = v => v.phase === 'move' && actor(v) >= 0 && !diceBusy;

/* ---------- geometri ---------- */
function computeGeom() {
  const stage = E.stage; if (!stage) return null;
  const cw = Math.floor(stage.clientWidth); if (cw < 50) return null;
  const vert = cw < 640;
  const top = stage.getBoundingClientRect().top + window.scrollY;
  const dockH = E.dock.offsetHeight || 56;
  const avail = innerHeight - top - dockH - (vert ? 10 : 34);
  let W, H;
  if (vert) { W = Math.min(cw, 480); H = Math.round(Math.max(W * 1.25, Math.min(W * 1.9, avail))); }
  else { H = Math.max(360, Math.min(Math.min(cw, 1000) * .66, avail)); W = Math.round(Math.min(cw, H / .66)); H = Math.round(W * .66); }
  const g = { W, H, vert };
  if (!vert) {
    const fw = Math.round(W * .03), tw = Math.round(W * .068), gapT = Math.round(fw * .55), bw = Math.round(W * .056);
    const fx = fw, fieldW = W - fw * 2 - tw - gapT, pw = (fieldW - bw) / 12, fy = fw, fh = H - fw * 2;
    const cd = Math.floor(Math.min(pw * .92, (fh / 2 - 6) / 5.1));
    Object.assign(g, { fw, tw, gapT, bw, fx, fieldW, pw, fy, fh, cd, tx: W - fw - tw, barX: fx + 6 * pw, ph: fh * .41 });
  } else {
    const fw = Math.max(6, Math.round(W * .022)), thO = 20, thM = 30, bh = Math.max(36, Math.round(H * .058)), gap = Math.round(W * .028);
    const colW = (W - fw * 2 - gap) / 2, rh = (H - fw * 2 - thO - thM - bh) / 12;
    const cd = Math.floor(Math.min(rh * .92, colW / 5.25));
    Object.assign(g, { fw, thO, thM, bh, gap, colW, rh, cd, rowY0: fw + thO, barY: fw + thO + 6 * rh });
  }
  return g;
}
// görünen hane (bakış açısına göre göreli r) → hücre dikdörtgeni
function cellOf(r) {
  const g = G;
  if (!g.vert) {
    const col = r <= 12 ? 12 - r : r - 13, top = r >= 13;
    const x = g.fx + col * g.pw + (col >= 6 ? g.bw : 0);
    return { x, y: top ? g.fy : g.fy + g.fh / 2, w: g.pw, h: g.fh / 2, top, col };
  }
  const right = r <= 12, row = right ? (r <= 6 ? 12 - r : 12 - r) : (r - 13);
  const y = g.rowY0 + row * g.rh + (row >= 6 ? g.bh : 0);
  return { x: right ? g.fw + g.colW + g.gap : g.fw, y, w: g.colW, h: g.rh, right, row };
}
function slotXY(r, k) {
  const g = G, c = cellOf(r), cd = g.cd;
  if (!g.vert) return { x: c.x + c.w / 2, y: c.top ? g.fy + cd / 2 + 2 + k * cd : g.fy + g.fh - cd / 2 - 2 - k * cd };
  return { x: c.right ? g.W - g.fw - cd / 2 - 2 - k * cd : g.fw + cd / 2 + 2 + k * cd, y: c.y + c.h / 2 };
}
function barXY(mine, k) {
  const g = G, cd = g.cd;
  if (!g.vert) return { x: g.barX + g.bw / 2, y: mine ? g.H / 2 - cd * .62 - k * cd * .92 : g.H / 2 + cd * .62 + k * cd * .92 };
  return { x: mine ? g.fw + cd * .6 + k * cd * .92 : g.W - g.fw - cd * .6 - k * cd * .92, y: g.barY + g.bh / 2 };
}
function offRect(mine, k) {
  const g = G;
  if (!g.vert) {
    const sh = Math.min(g.cd * .3, (g.fh / 2 - 12) / 15), w = g.tw * .78, x = g.tx + (g.tw - w) / 2;
    return mine ? { x, y: g.fy + g.fh - 5 - (k + 1) * sh, w, h: sh - 1 } : { x, y: g.fy + 5 + k * sh, w, h: sh - 1 };
  }
  const sw = Math.min(g.cd * .3, (g.W / 2 - g.fw - 8) / 15), h = (mine ? g.thM : g.thO) * .72;
  const x = g.W - g.fw - 6 - (k + 1) * sw;
  return mine ? { x, y: g.H - g.fw - g.thM + (g.thM - h) / 2, w: sw - 1, h } : { x, y: g.fw + (g.thO - h) / 2, w: sw - 1, h };
}
function trayZone(mine) {
  const g = G;
  if (!g.vert) return { x: g.tx, y: mine ? g.H / 2 : g.fy, w: g.tw, h: g.fh / 2 };
  return mine ? { x: g.fw, y: g.H - g.fw - g.thM, w: g.W - 2 * g.fw, h: g.thM + g.fw } : { x: g.fw, y: 0, w: g.W - 2 * g.fw, h: g.thO + g.fw };
}
function barZone() {
  const g = G;
  if (!g.vert) return { x: g.barX, y: g.fy, w: g.bw, h: g.fh };
  return { x: g.fw, y: g.barY, w: g.W * .34, h: g.bh };
}
function diceCenter(mine) {
  const g = G;
  if (!g.vert) { const half = mine ? g.barX + g.bw + 3 * g.pw : g.fx + 3 * g.pw; return { x: half, y: g.H / 2 }; }
  return { x: g.W / 2, y: g.barY + g.bh / 2 };
}

/* ---------- sabit tahta (SVG) ---------- */
function buildBg(v) {
  const g = G, { W, H } = g; const P = [];
  const grain = g.vert ? '0.22 0.011' : '0.011 0.22';
  P.push(`<svg class="tv-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs>
    <linearGradient id="tvWood" x1="0" y1="0" x2="${g.vert ? 1 : 0}" y2="${g.vert ? 0 : 1}"><stop offset="0" stop-color="#7a4321"/><stop offset=".45" stop-color="#5c3017"/><stop offset="1" stop-color="#3f1f0d"/></linearGradient>
    <radialGradient id="tvFelt" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#245c43"/><stop offset=".7" stop-color="#18412f"/><stop offset="1" stop-color="#0f2b1f"/></radialGradient>
    <linearGradient id="tvLt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1dcae"/><stop offset=".55" stop-color="#d9b77c"/><stop offset="1" stop-color="#b98d50"/></linearGradient>
    <linearGradient id="tvDk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8e3424"/><stop offset=".55" stop-color="#6a2016"/><stop offset="1" stop-color="#46130c"/></linearGradient>
    <linearGradient id="tvPearl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffdf6"/><stop offset=".4" stop-color="#f3dff0"/><stop offset=".7" stop-color="#d5ecf5"/><stop offset="1" stop-color="#efe6c8"/></linearGradient>
    <filter id="tvGrain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${grain}" numOctaves="3" seed="11"/><feColorMatrix values="0 0 0 0 .16  0 0 0 0 .07  0 0 0 0 .02  0 0 0 .9 -.18"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <filter id="tvNoise" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .22 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  </defs>`);
  const R = Math.round(Math.min(W, H) * .035);
  P.push(`<rect x="0" y="0" width="${W}" height="${H}" rx="${R}" fill="url(#tvWood)"/><rect x="0" y="0" width="${W}" height="${H}" rx="${R}" fill="#000" filter="url(#tvGrain)"/>`);
  const felt = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="url(#tvFelt)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#000" filter="url(#tvNoise)"/><rect x="${x + .5}" y="${y + .5}" width="${w - 1}" height="${h - 1}" rx="4" fill="none" stroke="#e2bf6e" stroke-opacity=".75" stroke-width="1.2"/>`;
  const tri = (pts, dark, inset) => `<polygon points="${pts}" fill="url(#${dark ? 'tvDk' : 'tvLt'})" stroke="#e7c370" stroke-width="1" stroke-opacity=".9"/>${inset ? `<polygon points="${inset}" fill="none" stroke="${dark ? '#f0c98a' : '#7a4a1d'}" stroke-opacity=".38" stroke-width="1"/>` : ''}`;
  const f2 = n => n.toFixed(1);
  if (!g.vert) {
    const halfW = 6 * g.pw;
    P.push(felt(g.fx, g.fy, halfW, g.fh), felt(g.barX + g.bw, g.fy, halfW, g.fh));
    for (let r = 1; r <= 24; r++) {
      const c = cellOf(r), x0 = c.x + 1, x1 = c.x + c.w - 1, xm = c.x + c.w / 2, by = c.top ? g.fy : g.fy + g.fh, ty = c.top ? g.fy + g.ph : g.fy + g.fh - g.ph;
      const dark = (c.col + (c.top ? 1 : 0)) % 2 === 1;
      const ix0 = x0 + c.w * .2, ix1 = x1 - c.w * .2, iby = by + (c.top ? 4 : -4), ity = by + (ty - by) * .72;
      P.push(tri(`${f2(x0)},${f2(by)} ${f2(x1)},${f2(by)} ${f2(xm)},${f2(ty)}`, dark, `${f2(ix0)},${f2(iby)} ${f2(ix1)},${f2(iby)} ${f2(xm)},${f2(ity)}`));
      // hane numarası (bakan oyuncuya göre)
      P.push(`<text x="${f2(xm)}" y="${f2(c.top ? g.fw * .68 : H - g.fw * .3)}" text-anchor="middle" class="tv-num">${r}</text>`);
    }
    // bar
    P.push(`<rect x="${g.barX}" y="0" width="${g.bw}" height="${H}" fill="#000" opacity=".22"/><rect x="${g.barX + g.bw * .14}" y="${g.fy}" width="${g.bw * .72}" height="${g.fh}" rx="${g.bw * .2}" fill="#2b1409" opacity=".55" stroke="#d9b264" stroke-opacity=".5"/>`);
    for (const yy of [g.fy + g.fh * .2, H / 2, g.fy + g.fh * .8]) { const s = g.bw * .2, cx = g.barX + g.bw / 2; P.push(`<polygon points="${f2(cx)},${f2(yy - s)} ${f2(cx + s * .7)},${f2(yy)} ${f2(cx)},${f2(yy + s)} ${f2(cx - s * .7)},${f2(yy)}" fill="url(#tvPearl)" opacity=".85" stroke="#b9934a" stroke-width=".8"/>`); }
    // toplama tepsisi
    P.push(`<rect x="${g.tx}" y="${g.fy}" width="${g.tw}" height="${g.fh}" rx="6" fill="#1d0e06" stroke="#d9b264" stroke-opacity=".55"/><line x1="${g.tx + 6}" y1="${H / 2}" x2="${g.tx + g.tw - 6}" y2="${H / 2}" stroke="#d9b264" stroke-opacity=".45"/>`);
  } else {
    const fx = g.fw, fy = g.rowY0, h6 = 6 * g.rh, cw = g.W - 2 * g.fw;
    P.push(felt(fx, fy, cw, h6), felt(fx, g.barY + g.bh, cw, h6));
    P.push(`<line x1="${W / 2}" y1="${fy + 3}" x2="${W / 2}" y2="${fy + h6 - 3}" stroke="#e2bf6e" stroke-opacity=".35"/><line x1="${W / 2}" y1="${g.barY + g.bh + 3}" x2="${W / 2}" y2="${g.barY + g.bh + h6 - 3}" stroke="#e2bf6e" stroke-opacity=".35"/>`);
    for (let r = 1; r <= 24; r++) {
      const c = cellOf(r), y0 = c.y + 1, y1 = c.y + c.h - 1, ym = c.y + c.h / 2, bx = c.right ? W - g.fw : g.fw, tx = c.right ? bx - g.colW * .86 : bx + g.colW * .86;
      const dark = (c.row + (c.right ? 1 : 0)) % 2 === 1;
      const ibx = bx + (c.right ? -4 : 4), itx = bx + (tx - bx) * .72;
      P.push(tri(`${f2(bx)},${f2(y0)} ${f2(bx)},${f2(y1)} ${f2(tx)},${f2(ym)}`, dark, `${f2(ibx)},${f2(y0 + c.h * .2)} ${f2(ibx)},${f2(y1 - c.h * .2)} ${f2(itx)},${f2(ym)}`));
      const nx = c.right ? tx - 3 : tx + 3;
      P.push(`<text x="${f2(nx)}" y="${f2(ym + 3.5)}" text-anchor="${c.right ? 'end' : 'start'}" class="tv-num in">${r}</text>`);
    }
    P.push(`<rect x="0" y="${g.barY}" width="${W}" height="${g.bh}" fill="#000" opacity=".25"/><rect x="${g.fw}" y="${g.barY + g.bh * .14}" width="${W - 2 * g.fw}" height="${g.bh * .72}" rx="${g.bh * .2}" fill="#2b1409" opacity=".5" stroke="#d9b264" stroke-opacity=".45"/>`);
    for (const xx of [W * .36, W * .64]) { const s = g.bh * .18, cy = g.barY + g.bh / 2; P.push(`<polygon points="${f2(xx - s)},${f2(cy)} ${f2(xx)},${f2(cy - s * .7)} ${f2(xx + s)},${f2(cy)} ${f2(xx)},${f2(cy + s * .7)}" fill="url(#tvPearl)" opacity=".8" stroke="#b9934a" stroke-width=".8"/>`); }
    P.push(`<rect x="${g.fw}" y="${g.fw * .5}" width="${W - 2 * g.fw}" height="${g.thO}" rx="5" fill="#1d0e06" stroke="#d9b264" stroke-opacity=".45"/><rect x="${g.fw}" y="${H - g.fw * .5 - g.thM}" width="${W - 2 * g.fw}" height="${g.thM}" rx="6" fill="#1d0e06" stroke="#d9b264" stroke-opacity=".55"/>`);
  }
  P.push('</svg>');
  void v;
  return P.join('');
}
function buildZones() {
  let h = '';
  const z = (r, rc, lab) => `<button type="button" class="tv-z${r === 25 ? ' bar' : r === 0 ? ' tray' : ''}" data-r="${r}" aria-label="${lab}" style="left:${rc.x.toFixed(1)}px;top:${rc.y.toFixed(1)}px;width:${rc.w.toFixed(1)}px;height:${rc.h.toFixed(1)}px"></button>`;
  for (let r = 1; r <= 24; r++) h += z(r, cellOf(r), `${r}. hane`);
  h += z(25, barZone(), 'Kırık taşlar (bar)');
  h += z(0, trayZone(true), 'Taş topla');
  return h;
}
function layout(force) {
  const g = computeGeom(); if (!g) return;
  const key = JSON.stringify([g.W, g.H, g.vert, persp, V && V.v]);
  if (!force && key === lastKey) return;
  lastKey = key; G = g;
  E.board.style.width = g.W + 'px'; E.board.style.height = g.H + 'px';
  E.board.style.setProperty('--cd', g.cd + 'px');
  E.board.style.setProperty('--ds', Math.round(g.vert ? Math.min(g.bh * .86, 40) : Math.min(g.pw * .95, 54)) + 'px');
  E.board.classList.toggle('vert', g.vert);
  E.bg.innerHTML = buildBg(V ? V.v : 'klasik');
  E.zn.innerHTML = buildZones();
  if (V) { drawCheckers(V, false); drawHL(V); placeDice(V); drawCube(V); }
}

/* ---------- taşlar ---------- */
function ckHTML(o, x, y, cls, badge, attrs) {
  return `<i class="tv-c o${o}${cls ? ' ' + cls : ''}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px" ${attrs || ''}>${badge ? `<b>${badge}</b>` : ''}</i>`;
}
function stackInfo(v, a) {
  const b = v.b, p = b.pin[a];
  if (p >= 0) return { owner: 1 - p, cnt: b.n[1 - p][a], pinned: p };
  const owner = b.n[0][a] ? 0 : b.n[1][a] ? 1 : -1;
  return { owner, cnt: owner >= 0 ? b.n[owner][a] : 0, pinned: -1 };
}
function slotK(info, i) { return (info.pinned >= 0 ? .62 : 0) + i; }
function drawCheckers(v, animate) {
  const A = ABS[v.v][persp], b = v.b; let h = '';
  const lastDest = new Set();
  if (v.last && v.last.pi !== v.cur && (v.phase === 'roll' || v.phase === 'move' || v.phase === 'dbl')) v.last.moves.forEach(m => { if (m.t > 0) lastDest.add(ABS[v.v][v.last.pi][m.t]); });
  for (let r = 1; r <= 24; r++) {
    const a = A[r], info = stackInfo(v, a);
    if (info.pinned >= 0) { const p = slotXY(r, 0); h += ckHTML(info.pinned, p.x, p.y, 'pinned', '', `data-a="${a}" data-o="${info.pinned}" data-pin="1"`); }
    if (info.owner < 0) continue;
    const vis = Math.min(info.cnt, 5);
    for (let i = 0; i < vis; i++) {
      const p = slotXY(r, slotK(info, i)), top = i === vis - 1;
      h += ckHTML(info.owner, p.x, p.y, (top ? 'top' : '') + (top && lastDest.has(a) && info.owner === v.last.pi ? ' lastmv' : ''), top && info.cnt > 5 ? info.cnt : '', `data-a="${a}" data-o="${info.owner}"`);
    }
  }
  for (const o of [0, 1]) {
    const mine = o === persp;
    for (let i = 0; i < b.bar[o]; i++) { const p = barXY(mine, Math.min(i, 3)); h += ckHTML(o, p.x, p.y, 'bar' + (i === b.bar[o] - 1 ? ' top' : ''), i === b.bar[o] - 1 && b.bar[o] > 1 ? b.bar[o] : '', `data-a="bar" data-o="${o}"`); }
    for (let i = 0; i < b.off[o]; i++) { const rc = offRect(mine, i); h += `<i class="tv-off o${o}${i === b.off[o] - 1 ? ' top' : ''}" data-o="${o}" style="left:${rc.x.toFixed(1)}px;top:${rc.y.toFixed(1)}px;width:${rc.w.toFixed(1)}px;height:${rc.h.toFixed(1)}px"></i>`; }
  }
  E.ck.innerHTML = h;
  if (animate) animateSteps(v);
}
function posOfRel(pi, r, v, kOverride) {
  if (r === 25) return barXY(pi === persp, Math.max(0, v.b.bar[pi]));
  if (r <= 0) { const rc = offRect(pi === persp, Math.max(0, v.b.off[pi] - 1)); return { x: rc.x + rc.w / 2, y: rc.y + rc.h / 2 }; }
  const a = ABS[v.v][pi][r], pr = REL[v.v][persp][a], info = stackInfo(v, a);
  const k = kOverride != null ? kOverride : slotK(info, Math.min(info.owner === pi ? info.cnt : 0, 4));
  return slotXY(pr, k);
}
function animateSteps(v) {
  const steps = (v.steps || []).filter(s => s.k > shownStep);
  if (!steps.length) return;
  // aynı taşın ardışık adımlarını tek yol olarak birleştir
  const groups = [];
  for (const s of steps) { const g = groups[groups.length - 1]; if (g && g.pi === s.pi && g.list[g.list.length - 1].t === s.f && s.f > 0) g.list.push(s); else groups.push({ pi: s.pi, list: [s] }); }
  let delay = 0;
  for (const gr of groups) {
    const first = gr.list[0], last = gr.list[gr.list.length - 1], pi = gr.pi;
    let el;
    if (last.t <= 0) el = E.ck.querySelector(`.tv-off.top[data-o="${pi}"]`);
    else { const a = ABS[v.v][pi][last.t]; el = E.ck.querySelector(`.tv-c.top[data-a="${a}"][data-o="${pi}"]`); }
    if (!el) continue;
    const end = { x: parseFloat(el.style.left) + (last.t <= 0 ? parseFloat(el.style.width) / 2 : 0), y: parseFloat(el.style.top) + (last.t <= 0 ? parseFloat(el.style.height) / 2 : 0) };
    const pts = [posOfRel(pi, first.f, v)].concat(gr.list.slice(0, -1).map(s => posOfRel(pi, s.t, v, 0)));
    const kf = pts.map((p, i) => ({ transform: `translate(${(p.x - end.x).toFixed(1)}px, ${(p.y - end.y).toFixed(1)}px) scale(${i === 0 ? 1.12 : 1.08})`, offset: i / pts.length }));
    kf.push({ transform: 'translate(0,0) scale(1)', offset: 1 });
    const dur = 300 + 170 * (pts.length - 1);
    el.classList.add('moving');
    const an = el.animate(kf, { duration: dur, delay, easing: 'cubic-bezier(.35,.1,.25,1)', fill: 'backwards' });
    an.onfinish = () => { el.classList.remove('moving'); };
    setTimeout(() => tok(last.t <= 0 ? .6 : 1), delay + dur - 20);
    // kırılan taş bara uçar
    for (const s of gr.list) if (s.hit) {
      const op = 1 - pi, be = E.ck.querySelector(`.tv-c.bar.top[data-o="${op}"]`);
      if (be) {
        const from = posOfRel(pi, s.t, v, 0), bx = parseFloat(be.style.left), by = parseFloat(be.style.top);
        be.animate([{ transform: `translate(${(from.x - bx).toFixed(1)}px, ${(from.y - by).toFixed(1)}px)` }, { transform: `translate(${((from.x - bx) * .5).toFixed(1)}px, ${((from.y - by) * .5 - 30).toFixed(1)}px) scale(1.25)`, offset: .45 }, { transform: 'none' }], { duration: 520, delay: delay + dur * .8, easing: 'ease-in-out', fill: 'backwards' });
      }
    }
    delay += dur + 60;
  }
}
function tok(g) {
  try { if (Sound.ok && Sound.ok('tvtok', 35)) { Sound.tone(260 + Math.random() * 40, .06, { type: 'triangle', gain: .22 * g }); Sound.noise(.04, { freq: 1400, q: 1.5, gain: .3 * g }); } } catch { /* ses yok */ }
}
function clack(g) {
  try { if (Sound.ok && Sound.ok('tvclack', 45)) { Sound.noise(.05, { freq: 2600, q: 1.2, gain: .55 * g }); Sound.tone(150 + Math.random() * 60, .07, { type: 'triangle', gain: .18 * g }); } } catch { /* ses yok */ }
}

/* ---------- vurgular ---------- */
function drawHL(v) {
  const can = myMoveTurn(v);
  E.zn.querySelectorAll('.tv-z').forEach(z => { z.classList.remove('src', 'sel', 'tgt', 'hit'); z.disabled = !can; });
  let h = '';
  if (can) {
    const srcs = new Set(v.legal.map(m => m.f));
    if (sel != null && !srcs.has(sel)) sel = null;
    const zr = r => E.zn.querySelector(`.tv-z[data-r="${r === 25 ? 25 : r <= 0 ? 0 : REL[v.v][persp][ABS[v.v][v.cur][r]]}"]`);
    if (hintsOn || sel == null) srcs.forEach(f => { const z = zr(f); if (z && hintsOn) z.classList.add('src'); });
    srcs.forEach(f => { if (sel === f) { const z = zr(f); if (z) z.classList.add('sel'); } });
    if (sel != null) {
      for (const e of (v.reach[sel] || [])) {
        const z = zr(e.t); if (z) z.classList.add('tgt');
        if (e.t > 0) {
          const a = ABS[v.v][v.cur][e.t], info = stackInfo(v, a), p = REL[v.v][persp][a];
          const opp = info.owner === 1 - v.cur && info.cnt === 1 && info.pinned < 0;
          const k = opp ? 0 : info.owner === v.cur ? slotK(info, Math.min(info.cnt, 4.6)) : 0;
          const xy = slotXY(p, k);
          h += `<i class="tv-ghost${opp ? ' hit' : ''}" style="left:${xy.x.toFixed(1)}px;top:${xy.y.toFixed(1)}px">${e.ds.length > 1 ? `<b>${e.ds.join('+')}</b>` : ''}</i>`;
        }
      }
      // seçili taşı parlat
      const fromEl = sel === 25 ? E.ck.querySelector(`.tv-c.bar.top[data-o="${v.cur}"]`) : E.ck.querySelector(`.tv-c.top[data-a="${ABS[v.v][v.cur][sel]}"][data-o="${v.cur}"]`);
      if (fromEl) fromEl.classList.add('picked');
    } else if (hintsOn) {
      srcs.forEach(f => { const el = f === 25 ? E.ck.querySelector(`.tv-c.bar.top[data-o="${v.cur}"]`) : E.ck.querySelector(`.tv-c.top[data-a="${ABS[v.v][v.cur][f]}"][data-o="${v.cur}"]`); if (el) el.classList.add('can'); });
    }
  }
  E.hl.innerHTML = h;
}

/* ---------- zarlar ---------- */
function faceHTML(f) { return `<span class="tv-pips">${Array.from({ length: 9 }, (_, k) => `<i class="${PIPS[f].includes(k) ? 'on' : ''}"></i>`).join('')}</span>`; }
function cubeHTML() { return `<div class="tv-dw"><i class="tv-dsh"></i><div class="tv-tilt"><div class="tv-cube3">${[1, 2, 3, 4, 5, 6].map(f => `<div class="tv-face" style="transform:${FACE_TF[f]} translateZ(calc(var(--ds) / 2))">${faceHTML(f)}</div>`).join('')}</div></div></div>`; }
function restCube(c, f) { const [rx, ry] = FACE_ROT[f || 1]; c.getAnimations && c.getAnimations().forEach(a => a.cancel()); c.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; }
function rollCube(dw, c, f, k) {
  const D = 1050 + k * 80, [fx, fy] = FACE_ROT[f || 1];
  const sx = (Math.random() < .5 ? -1 : 1) * (2 + (Math.random() * 2 | 0)) * 360, sy = (Math.random() < .5 ? -1 : 1) * (2 + (Math.random() * 2 | 0)) * 360;
  const kf = (p, o, e) => ({ transform: `rotateX(${(fx - sx * (1 - p)).toFixed(1)}deg) rotateY(${(fy - sy * (1 - p)).toFixed(1)}deg)`, offset: o, easing: e });
  c.style.transform = `rotateX(${fx}deg) rotateY(${fy}deg)`;
  c.animate([kf(0, 0, 'linear'), kf(.62, .36, 'ease-out'), kf(.9, .64, 'ease-out'), kf(.985, .86, 'ease-out'), kf(1, 1)], { duration: D, easing: 'linear' });
  const dir = k % 2 ? 1 : -1, ox = dir * (60 + Math.random() * 40), oy = -(50 + Math.random() * 30);
  dw.animate([
    { transform: `translate(${ox}px, ${oy}px) scale(.6)`, easing: 'cubic-bezier(.5,0,.9,.6)' },
    { transform: `translate(${ox * .25}px, 0) scale(1)`, offset: .36, easing: 'cubic-bezier(.2,.6,.4,1)' },
    { transform: `translate(${ox * .1}px, -22px) scale(1.04)`, offset: .5, easing: 'cubic-bezier(.6,0,.9,.5)' },
    { transform: `translate(${ox * .04}px, 0) scale(1)`, offset: .64, easing: 'cubic-bezier(.2,.6,.4,1)' },
    { transform: 'translate(0, -7px)', offset: .75, easing: 'cubic-bezier(.6,0,.9,.5)' },
    { transform: 'translate(0, 0)', offset: .86 }, { transform: 'translate(0, 0)' }
  ], { duration: D });
  [.36, .64, .86].forEach((o, j) => setTimeout(() => clack(1 - j * .3), D * o));
  return D;
}
function ensureDice() {
  if (E.dice.children.length) return;
  E.dice.innerHTML = `<div class="tv-dset">${cubeHTML()}${cubeHTML()}</div><div class="tv-dinfo"></div>`;
  E.cubes = [...E.dice.querySelectorAll('.tv-cube3')]; E.dws = [...E.dice.querySelectorAll('.tv-dw')];
}
function placeDice(v) {
  ensureDice();
  const start = v.phase === 'start' || v.phase === 'startDone';
  let c;
  if (start) c = { x: G.W / 2 + (G.vert ? 0 : (G.bw ? 0 : 0)), y: G.vert ? G.barY + G.bh / 2 : G.H / 2 };
  else c = diceCenter(v.cur === persp);
  if (start && !G.vert) c.x = G.barX + G.bw / 2;
  E.dice.style.left = c.x + 'px'; E.dice.style.top = c.y + 'px';
  E.dice.classList.toggle('start', start);
}
function renderDice(v) {
  ensureDice(); placeDice(v);
  const start = v.phase === 'start' || v.phase === 'startDone';
  const info = E.dice.querySelector('.tv-dinfo');
  E.dice.classList.remove('dbl');
  if (start) {
    // her oyuncu bir zar: soldaki rakip, sağdaki ben
    const order = [1 - persp, persp];
    E.dice.hidden = false;
    order.forEach((pi, k) => {
      const val = v.sd[pi], dw = E.dws[k], cb = E.cubes[k];
      dw.classList.toggle('wait', !val); dw.style.setProperty('--pc', v.players[pi].color);
      if (val && shownSd[pi] !== val && shownRoll !== -1) { rollCube(dw, cb, val, k); }
      else if (val) restCube(cb, val); else restCube(cb, 1);
      dw.classList.remove('used');
    });
    shownSd = v.sd.slice();
    info.innerHTML = order.map(pi => `<span style="--pc:${v.players[pi].color}">${esc(v.players[pi].name)}${v.sd[pi] ? ': ' + v.sd[pi] : ''}</span>`).join('<em>vs</em>');
    shownRoll = v.rollN;
    return;
  }
  shownSd = [0, 0];
  const hasDice = v.dice[0] > 0;
  E.dice.hidden = !hasDice && v.phase !== 'roll';
  if (!hasDice) { E.dws.forEach(d => d.classList.add('wait')); info.textContent = ''; shownRoll = v.rollN; return; }
  E.dws.forEach(d => { d.classList.remove('wait'); d.style.setProperty('--pc', 'transparent'); });
  const fresh = v.phase === 'move' && v.rollN !== shownRoll && shownRoll !== -1 && !v.moves;
  if (fresh) {
    diceBusy = true; E.dice.classList.add('rolling');
    let D = 0; E.cubes.forEach((c, k) => { D = Math.max(D, rollCube(E.dws[k], c, v.dice[k], k)); E.dws[k].classList.remove('used'); });
    info.textContent = 'Zarlar yuvarlanıyor…';
    clearTimeout(E.rollT);
    E.rollT = setTimeout(() => { diceBusy = false; if (!root || !V) return; E.dice.classList.remove('rolling'); diceState(V); drawHL(V); renderDock(V); renderStatus(V); }, D + 120);
  } else if (v.rollN !== shownRoll) { E.cubes.forEach((c, k) => restCube(c, v.dice[k])); }
  shownRoll = v.rollN;
  if (!diceBusy) diceState(v);
}
function diceState(v) {
  const info = E.dice.querySelector('.tv-dinfo'), [a, b] = v.dice;
  const dbl = a === b;
  E.dice.classList.toggle('dbl', dbl && v.phase === 'move');
  E.dice.classList.toggle('old', v.phase !== 'move');
  if (v.phase === 'move') {
    if (dbl) {
      E.dws.forEach(d => d.classList.toggle('used', v.rem.length === 0));
      const seg = v.rem.length ? v.rem[0] : a;
      info.innerHTML = `<span class="tv-left">${'●'.repeat(v.rem.length)}${'○'.repeat(Math.max(0, 4 - v.rem.length))}</span>${seg !== a ? ` <b>${seg}-${seg}</b>` : ''}${v.chain.length ? ` <small>sonra ${v.chain.map(x => x + '-' + x).join(', ')}</small>` : ''}`;
    } else {
      const remain = v.rem.slice();
      E.dws.forEach((d, k) => { const i = remain.indexOf(v.dice[k]); if (i >= 0) { remain.splice(i, 1); d.classList.remove('used'); } else d.classList.add('used'); });
      info.textContent = diceName(a, b);
    }
  } else { E.dws.forEach(d => d.classList.remove('used')); info.textContent = v.phase === 'roll' && actor(v) >= 0 ? '🎲 Dokun, zar at' : ''; }
}
function drawCube(v) {
  if (!v.cube) { E.cubeEl.hidden = true; return; }
  E.cubeEl.hidden = false;
  E.cubeEl.textContent = v.cubeV === 1 ? '64' : v.cubeV;
  let x, y;
  const mine = v.cubeOwner === persp, cent = v.cubeOwner < 0;
  if (!G.vert) { x = G.barX + G.bw / 2; y = cent ? G.H / 2 : mine ? G.fy + G.fh - G.cd * .7 : G.fy + G.cd * .7; }
  else { y = G.barY + G.bh / 2; x = cent ? G.W * .5 + G.cd * 2.4 : mine ? G.W * .5 - G.cd * 2.4 : G.W * .5 + G.cd * 2.4; }
  E.cubeEl.style.left = x + 'px'; E.cubeEl.style.top = y + 'px';
  E.cubeEl.classList.toggle('own', !cent); E.cubeEl.style.setProperty('--pc', cent ? '#e7c370' : v.players[v.cubeOwner].color);
  E.cubeEl.classList.toggle('offer', v.phase === 'dbl');
}

/* ---------- oyuncular, durum, düğmeler ---------- */
function renderPlayers(v) {
  const order = [1 - persp, persp];
  E.pl.innerHTML = order.map(i => {
    const p = v.players[i], act = v.turn === i || (v.turn == null && v.cur === i && (v.phase === 'move' || v.phase === 'roll'));
    const me = ui.mode === 'online' ? ui.me === i : (!p.isBot && v.players.filter(x => !x.isBot).length === 1);
    return `<div class="g-chip tv-chip ${act ? 'active' : ''} ${p.online === false ? 'off' : ''}" style="--pc:${p.color}">
      <i class="tv-stone o${i}"></i><span class="tv-cn"><b>${esc(p.name)}${me ? ' · sen' : ''}</b><small>pip ${v.pips[i]} · ${v.b.off[i]}/15</small></span><span class="g-num">${v.score[i]}</span></div>`;
  }).join('');
}
function nameOf(v, i) { return `<b style="color:${v.players[i].color}">${esc(v.players[i].name)}</b>`; }
function renderStatus(v) {
  const me = actor(v), t = v.turn; let h;
  const think = t != null && v.players[t].isBot ? ' düşünüyor…' : '';
  switch (v.phase) {
    case 'start': h = me >= 0 ? `<span class="g-turn mine">🎲 ${v.players.filter(p => !p.isBot).length > 1 && ui.mode === 'local' ? esc(v.players[me].name) + ' · ' : 'Sıra sende · '}başlangıç zarını at</span>` : `<span class="g-turn">Başlangıç zarı: ${nameOf(v, t)}${think || ' atıyor…'}</span>`; break;
    case 'startDone': h = v.sd[0] === v.sd[1] ? '<span class="g-turn">Zarlar eşit! Yeniden atılacak…</span>' : `<span class="g-turn win">${nameOf(v, v.sd[0] > v.sd[1] ? 0 : 1)} büyük attı, başlıyor!</span>`; break;
    case 'roll': h = me >= 0 ? `<span class="g-turn mine">⭐ ${hot(v) ? esc(v.players[me].name) + ' · ' : 'Sıra sende · '}zar at</span>` : `<span class="g-turn">Sıra: ${nameOf(v, t)}${think}</span>`; break;
    case 'dbl': h = me >= 0 ? `<span class="g-turn mine">${esc(v.players[v.offer].name)} ×${v.cubeV * 2} teklif ediyor!</span>` : `<span class="g-turn">${nameOf(v, t)} katlama teklifini düşünüyor…</span>`; break;
    case 'move':
      if (v.noMove) h = `<span class="g-turn">${nameOf(v, v.cur)} için oynanacak hamle yok — sıra geçiyor</span>`;
      else if (diceBusy) h = '<span class="g-turn">Zarlar yuvarlanıyor…</span>';
      else if (me >= 0) h = v.legal.length ? `<span class="g-turn mine">⭐ ${hot(v) ? esc(v.players[me].name) + ' · ' : 'Sıra sende · '}taşını oyna</span>` : '<span class="g-turn mine">✓ Hamlen tamam · Onayla</span>';
      else h = `<span class="g-turn">Sıra: ${nameOf(v, v.cur)}${v.players[v.cur].isBot ? ' oynuyor…' : ''}</span>`;
      break;
    case 'over': h = `<span class="g-turn win">${nameOf(v, v.win.pi)} oyunu aldı${v.win.mars ? ' · MARS!' : ''} +${v.win.pts}</span>`; break;
    default: h = '<span class="g-turn">Maç bitti</span>';
  }
  E.st.innerHTML = h;
}
const hot = v => ui.mode === 'local' && v.players.filter(p => !p.isBot).length > 1;
function renderDock(v) {
  const me = actor(v); let h = '';
  if (ui.mode === 'online' && ui.me < 0) { E.dock.innerHTML = `<span class="tv-wait">👀 İzleyicisin · ${v.phase === 'done' ? 'maç bitti' : 'oyunu canlı izliyorsun'}</span>`; return; }
  const hint = `<button type="button" class="btn btn-ghost tv-hint ${hintsOn ? 'on' : ''}" data-a="hint" aria-pressed="${hintsOn}" title="Hamle ipuçları">💡<span class="tv-lab"> İpucu</span></button>`;
  if (v.phase === 'start') h = `<button type="button" class="btn btn-spin tv-main" data-a="roll" ${me >= 0 ? '' : 'disabled'}>🎲 Zar at</button>`;
  else if (v.phase === 'roll') {
    h = hint;
    if (v.cube) h += `<button type="button" class="btn btn-solve" data-a="dbl" ${me >= 0 && v.canDbl[me] ? '' : 'disabled'}>Katla ×${v.cubeV * 2}</button>`;
    h += `<button type="button" class="btn btn-spin tv-main" data-a="roll" ${me >= 0 ? '' : 'disabled'}>🎲 Zar at</button>`;
  } else if (v.phase === 'dbl') {
    h = me >= 0 ? `<button type="button" class="btn btn-vowel" data-a="take">✓ Kabul (×${v.cubeV * 2})</button><button type="button" class="btn btn-danger" data-a="drop">✗ Çekil (−${v.cubeV})</button>` : `<span class="tv-wait">Katlama teklifi: ×${v.cubeV * 2}</span>`;
  } else if (v.phase === 'move') {
    const can = me >= 0 && !v.noMove && !diceBusy;
    h = hint + `<button type="button" class="btn btn-ghost" data-a="undo" ${can && v.canUndo ? '' : 'disabled'}>↶ <span class="tv-lab">Hamleyi </span>geri al</button>`
      + `<button type="button" class="btn ${can && !v.legal.length ? 'btn-spin tv-pulse' : 'btn-vowel'} tv-main" data-a="ok" ${can && !v.legal.length ? '' : 'disabled'}>✓ Onayla</button>`;
  } else h = `<span class="tv-wait">${v.phase === 'over' ? (v.win.mars ? '🔥 Mars!' : 'Oyun bitti') + ' · sıradaki oyun hazırlanıyor…' : v.phase === 'done' ? 'Maç bitti' : '…'}</span>`;
  E.dock.innerHTML = h;
}
function renderSub(v) {
  const cube = v.cube ? ` · Küp ×${v.cubeV}${v.cubeOwner >= 0 ? ' (' + esc(v.players[v.cubeOwner].name) + ')' : ''}` : '';
  E.sub.innerHTML = `${VARS[v.v]} · ${v.target > 1 ? v.target + ' puanlık maç' : 'Tek oyun'} · ${v.game}. oyun${cube}`;
}
function renderFx(v) {
  const key = v.phase === 'over' && v.win ? `${v.game}:${v.win.pi}` : '';
  if (key === fxShown) return;
  fxShown = key;
  if (!key) { E.fx.innerHTML = ''; E.fx.className = 'tv-fx'; return; }
  const w = v.win;
  E.fx.className = 'tv-fx show' + (w.mars ? ' mars' : '');
  E.fx.innerHTML = w.mars ? `<div class="tv-mars"><b>MARS!</b><span>${esc(v.players[w.pi].name)} +${w.pts}</span></div>` : `<div class="tv-wn"><b>${w.kind === 'drop' ? 'ÇEKİLDİ' : 'OYUN!'}</b><span>${esc(v.players[w.pi].name)} +${w.pts}</span></div>`;
}

function render(v) {
  const prev = V; V = v;
  const np = perspOf(v);
  const flip = prev && np !== persp;
  persp = np;
  if (prev && prev.game !== v.game) { shownStep = v.stepN; sel = null; }
  layout(flip);
  if (flip) { E.board.classList.remove('flipping'); void E.board.offsetWidth; E.board.classList.add('flipping'); }
  const undo = v.undoN !== shownUndo;
  const anim = !!prev && !undo && !flip && v.stepN > shownStep;
  if (undo || v.phase !== 'move' || actor(v) < 0) sel = sel != null && v.phase === 'move' && actor(v) >= 0 ? sel : null;
  drawCheckers(v, anim);
  shownStep = v.stepN; shownUndo = v.undoN;
  renderDice(v); drawCube(v);
  drawHL(v); renderPlayers(v); renderStatus(v); renderDock(v); renderSub(v); renderFx(v);
  E.board.classList.toggle('myturn', actor(v) >= 0);
  E.dice.classList.toggle('tap', v.phase === 'roll' && actor(v) >= 0);
}

/* ---------- etkileşim ---------- */
function relOfZone(z) { return z ? +z.dataset.r : null; }
// ekrandaki hane → oynayan oyuncunun göreli hanesi
function toCurRel(v, zr) { if (zr === 25 || zr === 0) return zr; return REL[v.v][v.cur][ABS[v.v][persp][zr]]; }
function trySend(v, f, t) {
  const e = (v.reach[f] || []).find(x => x.t === t); if (!e) return false;
  sel = null;
  if (e.ds.length === 1) ui.send({ t: 'mv', f, d: e.ds[0] }); else ui.send({ t: 'path', f, ds: e.ds });
  return true;
}
function onTap(zr) {
  const v = V; if (!v || !myMoveTurn(v)) return;
  const r = toCurRel(v, zr);
  const isSrc = v.legal.some(m => m.f === r);
  if (sel != null && r !== sel && trySend(v, sel, r)) return;
  if (isSrc) sel = sel === r ? null : r;
  else if (r === 0 && sel == null) {
    // tepsiye dokunuldu: tek bir taş toplanabiliyorsa onu topla
    const fs = Object.keys(v.reach).filter(f => v.reach[f].some(e => e.t === 0));
    if (fs.length === 1) { trySend(v, +fs[0], 0); return; }
    sel = null;
  } else sel = null;
  drawHL(v);
}
function zoneAt(x, y) { const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('.tv-z') : null; }
function onDown(e) {
  const z = e.target.closest('.tv-z'); if (!z || !V || !myMoveTurn(V)) return;
  const r = toCurRel(V, relOfZone(z));
  if (!V.legal.some(m => m.f === r)) return;
  drag = { r, x0: e.clientX, y0: e.clientY, id: e.pointerId, on: false, ghost: null };
}
function onMove(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
  if (!drag.on && Math.hypot(dx, dy) > 9) {
    drag.on = true; sel = drag.r; drawHL(V);
    const el = drag.r === 25 ? E.ck.querySelector(`.tv-c.bar.top[data-o="${V.cur}"]`) : E.ck.querySelector(`.tv-c.top[data-a="${ABS[V.v][V.cur][drag.r]}"][data-o="${V.cur}"]`);
    if (el) el.classList.add('lifted');
    drag.src = el;
    drag.ghost = document.createElement('i'); drag.ghost.className = `tv-c o${V.cur} tv-drag`; E.board.appendChild(drag.ghost);
  }
  if (drag.on) {
    e.preventDefault();
    const rc = E.board.getBoundingClientRect();
    drag.ghost.style.left = (e.clientX - rc.left) + 'px'; drag.ghost.style.top = (e.clientY - rc.top) + 'px';
    E.zn.querySelectorAll('.tv-z.over').forEach(x => x.classList.remove('over'));
    const z = zoneAt(e.clientX, e.clientY); if (z && z.classList.contains('tgt')) z.classList.add('over');
  }
}
function onUp(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null;
  if (d.ghost) d.ghost.remove();
  if (d.src) d.src.classList.remove('lifted');
  E.zn.querySelectorAll('.tv-z.over').forEach(x => x.classList.remove('over'));
  if (d.on) {
    const z = zoneAt(e.clientX, e.clientY);
    const t = z ? toCurRel(V, relOfZone(z)) : null;
    if (t != null && t !== d.r && trySend(V, d.r, t)) return;
    sel = null; drawHL(V);
    E.suppress = Date.now();
  }
}
function onClickBoard(e) {
  if (E.suppress && Date.now() - E.suppress < 350) return;
  const z = e.target.closest('.tv-z');
  if (z) { onTap(relOfZone(z)); return; }
  if (e.target.closest('.tv-dice') && V && V.phase === 'roll' && actor(V) >= 0) { ui.send({ t: 'roll' }); return; }
}
function onDock(e) {
  const b = e.target.closest('button[data-a]'); if (!b || b.disabled) return;
  Sound.init();
  const a = b.dataset.a;
  if (a === 'hint') { hintsOn = !hintsOn; try { localStorage.setItem('tv.hints', hintsOn ? '1' : '0'); } catch { /* yok */ } if (V) { renderDock(V); drawHL(V); } return; }
  sel = null;
  ui.send({ t: a });
}
function onKey(e) {
  if (!V || e.target.closest && e.target.closest('input,textarea,select')) return;
  const me = actor(V); if (me < 0) return;
  if ((e.key === ' ' || e.key === 'Enter') && (V.phase === 'roll' || V.phase === 'start')) { e.preventDefault(); ui.send({ t: 'roll' }); }
  else if (e.key === 'Enter' && V.phase === 'move' && !V.legal.length && !diceBusy) { e.preventDefault(); ui.send({ t: 'ok' }); }
  else if ((e.key === 'Backspace' || e.key.toLowerCase() === 'z') && V.phase === 'move' && V.canUndo) { e.preventDefault(); ui.send({ t: 'undo' }); }
}
function onResize() { clearTimeout(resizeT); resizeT = setTimeout(() => { if (root) layout(); }, 90); }

function mount(r, api) {
  root = r; ui = api; V = null; G = null; sel = null; drag = null; lastKey = ''; fxShown = '';
  shownRoll = -1; shownStep = -1; shownUndo = -1; shownSd = [0, 0]; diceBusy = false; persp = 0;
  root.innerHTML = `<div class="g-wrap tv">
    <div class="g-players tv-pl"></div>
    <div class="g-status tv-st"></div>
    <div class="tv-stage"><div class="tv-board">
      <div class="tv-bg"></div><div class="tv-hl"></div><div class="tv-ck"></div><div class="tv-zn"></div>
      <div class="tv-dice" hidden></div><div class="tv-cubeel" hidden></div><div class="tv-fx"></div>
    </div></div>
    <div class="tv-dock"></div>
    <p class="g-sub tv-sub"></p>
  </div>`;
  const q = s => root.querySelector(s);
  E = { stage: q('.tv-stage'), board: q('.tv-board'), bg: q('.tv-bg'), hl: q('.tv-hl'), ck: q('.tv-ck'), zn: q('.tv-zn'), dice: q('.tv-dice'), cubeEl: q('.tv-cubeel'), fx: q('.tv-fx'),
    pl: q('.tv-pl'), st: q('.tv-st'), dock: q('.tv-dock'), sub: q('.tv-sub') };
  E.board.addEventListener('pointerdown', onDown);
  addEventListener('pointermove', onMove, { passive: false });
  addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
  E.board.addEventListener('click', onClickBoard);
  E.dock.addEventListener('click', onDock);
  addEventListener('keydown', onKey);
  addEventListener('resize', onResize);
  if (window.ResizeObserver) { ro = new ResizeObserver(onResize); ro.observe(E.stage); }
}
function unmount() {
  removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp);
  removeEventListener('keydown', onKey); removeEventListener('resize', onResize);
  if (ro) { ro.disconnect(); ro = null; }
  clearTimeout(E.rollT); clearTimeout(resizeT);
  root = null; V = null; E = {}; G = null; drag = null;
}
function onEvent(e) {
  const nm = V && V.players[e.pi] ? V.players[e.pi].name.toLocaleUpperCase('tr-TR') : '';
  switch (e.t) {
    case 'roll': if (e.d && e.d[0] === e.d[1]) setTimeout(() => { if (root) { Sound.special(); banner(DBL_NAME[e.d[0]].toLocaleUpperCase('tr-TR') + '!', 'pink'); } }, 1150); break;
    case 'mv': if (e.hit || e.pin) setTimeout(() => { if (!root) return; Sound.bad(); if (G) { const rc = E.board.getBoundingClientRect(); FX.burst(rc.left + rc.width / 2, rc.top + rc.height / 2, 18, false); } }, 280); else if (e.off) setTimeout(() => Sound.good(), 250); break;
    case 'nomove': Sound.bad(); break;
    case 'tie': banner('EŞİT ZAR!', 'pink'); break;
    case 'starter': Sound.good(); banner(`${nm} BAŞLIYOR`, 'good'); break;
    case 'dbl': Sound.special(); banner(`KATLAMA ×${e.v}`, 'pink'); break;
    case 'take': Sound.buy(); break;
    case 'drop': Sound.bad(); break;
    case 'mother': Sound.special(); break;
    case 'win':
      if (e.mars) { Sound.fanfare(); FX.confetti(170); flash('good'); }
      else { Sound.solve(); FX.confetti(70); banner(`${nm} +${e.pts}`, 'good'); }
      break;
    case 'game': Sound.whoosh(); banner('YENİ OYUN'); break;
    default: break;
  }
}

Object.assign(DEF, { mount, render, onEvent, unmount });
CFX.registerGame(DEF);
CFX.__tavla = { ABS, REL, initBoard, emptyBoard, genMoves, applyMove, legalSteps, maxUse, allSeqs, pipOf, evaluate, botPlanFor, motherPinned, refresh, DEF };
})();
