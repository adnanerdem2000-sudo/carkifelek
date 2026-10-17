/* =========================================================================
   OYUN SALONU — KIZMA BİRADER
   Haç biçimli tahtada 40 karelik yol, 4 bahçe, 4 renkli ev yolu. Zar at,
   6 ile taş çıkar, rakibin taşının üstüne gel ve onu bahçesine yolla.
   Dört taşını da evine ilk toplayan kazanır. 2–4 kişi: online, aynı cihazda
   sırayla ya da bilgisayara karşı. Tüm bilgi açıktır.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial, randInt } = CFX;

/* ---------- tahta geometrisi (11×11) ---------- */
const N = 40, LANE0 = 40, LAST = 43, G = 11;
// 0. kenarın (sol kol) koordinatları; diğer kenarlar 90° döndürülerek bulunur
const TRACK = [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0], [5, 0],
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [10, 5],
  [10, 6], [9, 6], [8, 6], [7, 6], [6, 6], [6, 7], [6, 8], [6, 9], [6, 10], [5, 10],
  [4, 10], [4, 9], [4, 8], [4, 7], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 5]];
const LANE = [[1, 5], [2, 5], [3, 5], [4, 5]];
const BASE = [[1, 1], [2, 1], [1, 2], [2, 2]];
const rot = ([x, y], s) => { for (let i = 0; i < s; i++) [x, y] = [10 - y, x]; return [x, y]; };
const SIDES = n => (n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3]);
const absOf = (side, p) => (side * 10 + p) % N;
function cellOf(side, p, k) {
  if (p < 0) return rot(BASE[k], side);
  if (p < LANE0) return TRACK[absOf(side, p)];
  return rot(LANE[p - LANE0], side);
}

/* ---------- kurallar (durum ya da görünüm üzerinde çalışır) ---------- */
function moveFor(S, pi, k, d) {
  const mine = S.pawns[pi], from = mine[k];
  let to;
  if (from < 0) { if (d !== 6) return null; to = 0; }
  else { to = from + d; if (to > LAST) return null; }
  if (mine.some((q, j) => j !== k && q === to)) return null;               // kendi taşının üstüne gelinmez
  let cap = null;
  if (to < LANE0) {
    const a = absOf(S.side[pi], to);
    for (let o = 0; o < S.pawns.length; o++) {
      if (o === pi) continue;
      for (let j = 0; j < 4; j++) {
        const q = S.pawns[o][j];
        if (q >= 0 && q < LANE0 && absOf(S.side[o], q) === a) {
          if (S.protect && q === 0) return null;                             // kendi başlangıç karesindeki taş korunur
          cap = { pi: o, k: j };
        }
      }
    }
  }
  return { k, from, to, cap };
}
const legalMoves = (S, pi, d) => [0, 1, 2, 3].map(k => moveFor(S, pi, k, d)).filter(Boolean);
const needsSix = (S, pi) => [1, 2, 3, 4, 5].every(d => legalMoves(S, pi, d).length === 0);
const isDone = (S, pi) => S.pawns[pi].every(q => q >= LANE0);
const progress = (S, pi) => S.pawns[pi].reduce((a, q) => a + q + 1, 0);   // 0 … 176
const inHome = (S, pi) => S.pawns[pi].filter(q => q >= LANE0).length;
// a mutlak karesindeki taşı bir rakip sonraki atışta yiyebilir mi?
function threatened(S, pi, a) {
  for (let o = 0; o < S.pawns.length; o++) {
    if (o === pi || isDone(S, o)) continue;
    const st = absOf(S.side[o], 0);
    for (const q of S.pawns[o]) {
      if (q < 0) { if (a === st) return true; continue; }
      if (q >= LANE0) continue;
      const dist = (a - absOf(S.side[o], q) + N) % N;
      if (dist >= 1 && dist <= 6 && q + dist < LANE0) return true;
    }
  }
  return false;
}

/* ---------- yöneten cihaz: akış ---------- */
let DEF = null;
const T = ms => Math.max(5, Math.round(ms * ((DEF && DEF.speed) || 1)));
function schedule(st, ctx, ms, fn) { const s = ++st.seq; ctx.later(T(ms), () => { if (st.seq === s) fn(st, ctx); }); }
const pname = (st, i) => st.players[i].name;
const say = (st, t) => { st.msg = t; };

function doRoll(st, ctx) {
  st.die = randInt(1, 6); st.rollN++; st.phase = 'rolling'; st.moves = []; st.autoMove = false;
  say(st, `${pname(st, st.cur)} zar atıyor…`);
  ctx.emit({ t: 'rolling', pi: st.cur });
  ctx.sync();
  schedule(st, ctx, 750, afterRoll);
}
function afterRoll(st, ctx) {
  const pi = st.cur, d = st.die, name = pname(st, pi);
  const wait6 = needsSix(st, pi);
  if (d === 6) st.sixes++;
  ctx.emit({ t: 'die', pi, d }, `${name}: 🎲 ${d}`);
  if (d === 6 && st.sixes >= 3) {
    say(st, `Üst üste üçüncü 6! ${name} bu atışı oynayamaz, sıra geçiyor.`);
    ctx.emit({ t: 'six3', pi }, `${name} üst üste üç kez 6 attı, sırası yandı.`, 'bad');
    return passTurn(st, ctx);
  }
  const moves = legalMoves(st, pi, d);
  if (!moves.length) {
    if (wait6 && d !== 6) {
      st.tries++;
      if (st.tries < 3) { say(st, `${name} ${d} attı. Taş çıkarmak için 6 gerek: ${st.tries + 1}. deneme.`); return toRoll(st, ctx); }
      say(st, `${name} üç denemede 6 atamadı.`); return passTurn(st, ctx);
    }
    if (d === 6) { say(st, `${name} 6 attı ama oynayacak taş yok. Bir daha at!`); return toRoll(st, ctx); }
    say(st, `${name} ${d} attı, oynanabilecek taş yok.`); return passTurn(st, ctx);
  }
  st.moves = moves.map(m => ({ k: m.k, to: m.to, cap: !!m.cap }));
  st.phase = 'move';
  say(st, `${name} ${d} attı. ${moves.length === 1 ? 'Tek hamle var.' : 'Oynatacağı taşı seçiyor.'}`);
  if (st.skip === pi) { st.autoMove = true; ctx.sync(); schedule(st, ctx, 500, s => DEF.botAct(s, pi, ctx, true)); return; }
  if (moves.length === 1 && st.auto) {
    st.autoMove = true; ctx.sync();
    const k = moves[0].k;
    schedule(st, ctx, 650, s => { if (s.phase === 'move' && s.cur === pi) startMove(s, ctx, k); });
    return;
  }
  ctx.sync();
}
function toRoll(st, ctx) {
  st.phase = 'roll'; st.moves = []; st.autoMove = false;
  ctx.sync();
  if (st.skip === st.cur) schedule(st, ctx, 500, s => { if (s.phase === 'roll') doRoll(s, ctx); });
}
function passTurn(st, ctx) {
  st.phase = 'pass'; st.moves = []; st.autoMove = false;
  ctx.sync();
  schedule(st, ctx, 1100, nextTurn);
}
function startMove(st, ctx, k) {
  const pi = st.cur, m = moveFor(st, pi, k, st.die); if (!m) return false;
  const path = m.from < 0 ? [0] : Array.from({ length: m.to - m.from }, (_, i) => m.from + i + 1);
  st.mv = { id: ++st.mvN, pi, k, from: m.from, path, cap: m.cap };
  st.pawns[pi][k] = m.to;
  st.phase = 'moving'; st.moves = []; st.autoMove = false;
  ctx.emit({ t: 'move', pi, k, n: path.length });
  ctx.sync();
  schedule(st, ctx, 150 * path.length + 300, land);
  return true;
}
function land(st, ctx) {
  const mv = st.mv, pi = mv.pi, name = pname(st, pi);
  const to = st.pawns[pi][mv.k];
  st.lastCap = null;
  if (mv.cap) {
    const c = mv.cap;
    if (st.pawns[c.pi][c.k] >= 0 && st.pawns[c.pi][c.k] < LANE0 && absOf(st.side[c.pi], st.pawns[c.pi][c.k]) === absOf(st.side[pi], to)) {
      st.pawns[c.pi][c.k] = -1; st.caps[pi]++; st.lost[c.pi]++;
      st.lastCap = { pi: c.pi, k: c.k, by: pi, n: ++st.capN };
      say(st, `Kızma birader! ${name}, ${pname(st, c.pi)} oyuncusunun ${c.k + 1} numaralı taşını bahçesine yolladı.`);
      ctx.emit({ t: 'cap', pi, vi: c.pi, vk: c.k, cell: cellOf(st.side[pi], to, mv.k) }, `${name}, ${pname(st, c.pi)} oyuncusunun taşını yedi! Kızma birader!`, 'bad');
    }
  } else if (mv.from < 0) {
    say(st, `${name} yeni bir taş çıkardı.`);
    ctx.emit({ t: 'out', pi }, `${name} yeni bir taş çıkardı.`);
  } else if (to >= LANE0 && mv.from < LANE0) {
    say(st, `${name} bir taşını eve soktu! (${inHome(st, pi)}/4)`);
    ctx.emit({ t: 'home', pi, cell: cellOf(st.side[pi], to, mv.k) }, `${name} bir taşını eve soktu (${inHome(st, pi)}/4).`, 'good');
  } else say(st, `${name} ${mv.k + 1} numaralı taşını ${mv.path.length} kare ilerletti.`);
  st.mv = null;
  if (isDone(st, pi) && !st.done.includes(pi)) {
    st.done.push(pi);
    say(st, `${name} dört taşını da eve topladı!`);
    ctx.emit({ t: 'finish', pi, place: st.done.length }, `${name} dört taşını da eve topladı! (${st.done.length}. sıra)`, 'gold');
    const n = st.players.length;
    if (!st.rankAll || st.done.length >= n - 1) return finishGame(st, ctx);
    return passTurn(st, ctx);
  }
  if (st.die === 6) { st.msg += ' 6 attı, bir daha atacak!'; return toRoll(st, ctx); }
  passTurn(st, ctx);
}
function nextTurn(st, ctx) {
  if (st.phase === 'over') return;
  const n = st.players.length; let j = st.cur;
  for (let k = 0; k < n; k++) { j = (j + 1) % n; if (!st.done.includes(j)) break; }
  st.cur = j; st.sixes = 0; st.tries = 0; st.skip = -1; st.turnN++;
  const w6 = needsSix(st, j);
  say(st, w6 ? `Sıra ${pname(st, j)} oyuncusunda. Taş çıkarmak için 6 gerek (3 hak).` : `Sıra ${pname(st, j)} oyuncusunda.`);
  ctx.emit({ t: 'turn', pi: j });
  toRoll(st, ctx);
}
function ranking(st) {
  const rest = st.players.map((_, i) => i).filter(i => !st.done.includes(i)).sort((a, b) => progress(st, b) - progress(st, a) || inHome(st, b) - inHome(st, a));
  return st.done.map((i, r) => ({ pi: i, score: 176, label: `🏁 ${r + 1}. bitirdi` }))
    .concat(rest.map(i => ({ pi: i, score: progress(st, i), label: `${inHome(st, i)}/4 evde · %${Math.round(progress(st, i) / 1.76)}` })));
}
function finishGame(st, ctx) {
  if (st.phase === 'over') return;
  st.phase = 'over'; st.moves = []; st.mv = null;
  const w = st.done[0];
  ctx.emit({ t: 'over', pi: w }, `${pname(st, w)} oyunu kazandı!`, 'gold');
  ctx.sync();
  schedule(st, ctx, 1800, () => ctx.end(result(st)));
}
function result(st) {
  const w = st.done[0];
  return { title: `${pname(st, w)} kazandı!`, ranking: ranking(st),
    note: st.rankAll && st.players.length > 2 ? 'Sıralama, taşlarını eve toplama sırasına göre.' : 'Bitiremeyenler ilerlemelerine göre sıralandı.' };
}

/* ---------- bilgisayar ---------- */
function botScore(S, pi, m) {
  const side = S.side[pi];
  let s = Math.random() * 4;
  if (m.cap) s += 1000 + S.pawns[m.cap.pi][m.cap.k] * 6;           // ilerlemiş taşı yemek daha değerli
  if (m.from < LANE0 && m.to >= LANE0) s += 700;
  if (m.from < 0) s += 550;
  const safeFrom = m.from < 0 || m.from >= LANE0 || (S.protect && m.from === 0);
  const safeTo = m.to >= LANE0 || (S.protect && m.to === 0);
  const dFrom = !safeFrom && threatened(S, pi, absOf(side, m.from));
  // hamleden sonraki durumda hedef tehlikede mi?
  let dTo = false;
  if (!safeTo) { const keep = S.pawns[pi][m.k]; S.pawns[pi][m.k] = m.to; dTo = threatened(S, pi, absOf(side, m.to)); S.pawns[pi][m.k] = keep; }
  if (dFrom && !dTo) s += 300 + m.from * 2;
  if (dTo) s -= 220;
  if (m.from === 0 && S.pawns[pi].some(q => q < 0)) s += 60;              // başlangıç karesini boşalt
  if (m.from >= LANE0) s -= 40;                                            // ev içinde kaydırmak son çare
  s += Math.max(0, m.from) * 1.5;                                          // en ilerideki taşı sür
  return s;
}

/* ---------- arayüz ---------- */
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
let root = null, ui = null, V = null, E = {}, pawnEls = [], cellEls = {}, animT = null, anim = null, lastMv = 0, rollT = null, rollAnimN = -1, lastCapN = 0, hoverK = -1;
const key = ([x, y]) => x + ',' + y;
const dieHTML = f => Array.from({ length: 9 }, (_, k) => `<i class="${PIPS[f].includes(k) ? 'on' : ''}"></i>`).join('');
function setDie(f) { if (E.die.dataset.f !== String(f)) { E.die.dataset.f = f; E.die.innerHTML = dieHTML(f); } }
function stopRoll() { if (rollT) { clearInterval(rollT); rollT = null; } if (E.die) E.die.classList.remove('roll'); }
function startRoll() {
  stopRoll(); E.die.classList.add('roll');
  rollT = setInterval(() => { if (!root) return stopRoll(); setDie(randInt(1, 6)); Sound.tick(.7); }, T(85));
}
function canActNow(v) {
  if (!v || (v.phase !== 'roll' && v.phase !== 'move')) return false;
  const cp = v.players[v.cur];
  return ui.mode === 'local' ? !cp.isBot : ui.me === v.cur;
}
function place(el, [x, y]) { el.style.setProperty('--x', x); el.style.setProperty('--y', y); }
function stopAnim() { if (animT) { clearTimeout(animT); animT = null; } anim = null; }
function animateMove(v, mv) {
  stopAnim();
  const side = v.side[mv.pi], el = pawnEls[mv.pi] && pawnEls[mv.pi][mv.k]; if (!el) return;
  anim = { pi: mv.pi, k: mv.k };
  place(el, cellOf(side, mv.from, mv.k)); el.classList.add('hop');
  let i = 0;
  const step = () => {
    if (!root) return;
    place(el, cellOf(side, mv.path[i], mv.k)); Sound.tick(.45); i++;
    if (i < mv.path.length) animT = setTimeout(step, T(150));
    else { animT = setTimeout(() => { animT = null; anim = null; el.classList.remove('hop'); if (V) renderPawns(V); }, T(140)); }
  };
  animT = setTimeout(step, T(40));
}
function renderPawns(v) {
  const can = canActNow(v) && v.phase === 'move';
  const movable = new Map(can ? v.moves.map(m => [m.k, m]) : []);
  v.players.forEach((p, pi) => {
    for (let k = 0; k < 4; k++) {
      const el = pawnEls[pi][k], q = v.pawns[pi][k];
      if (!(anim && anim.pi === pi && anim.k === k)) {
        // taş yenirken: hareket eden taş hedefe ulaşana dek kurban yerinde kalır (durum zaten öyle)
        place(el, cellOf(v.side[pi], q, k));
      }
      el.classList.toggle('home', q >= LANE0);
      el.classList.toggle('yard', q < 0);
      const mv = pi === v.cur ? movable.get(k) : null;
      el.classList.toggle('can', !!mv);
      el.disabled = !mv;
      el.classList.toggle('cur', pi === v.cur && v.phase !== 'over');
    }
  });
  // hedef kareleri
  Object.values(cellEls).forEach(c => c.classList.remove('tgt', 'tgt-hi', 'tgt-cap'));
  if (can) {
    const side = v.side[v.cur];
    v.moves.forEach(m => { const c = cellEls[key(cellOf(side, m.to, m.k))]; if (c) { c.classList.add('tgt'); if (m.cap) c.classList.add('tgt-cap'); if (m.k === hoverK) c.classList.add('tgt-hi'); } });
    E.board.style.setProperty('--tc', v.players[v.cur].color);
  }
}
function renderPlayers(v) {
  const me = ui.me;
  const h = v.players.map((p, i) => {
    const place = v.done.indexOf(i);
    return `<div class="g-chip kz-chip ${i === v.cur && v.phase !== 'over' ? 'active' : ''} ${p.online === false ? 'off' : ''}" style="--pc:${p.color}">
      <span class="av" style="--pc:${p.color}">${initial(p.name)}</span><b>${esc(p.name)}${me === i ? ' · sen' : ''}${p.isBot ? ' 🤖' : ''}</b>
      <span class="kz-home-n" title="Evdeki taşlar">${place >= 0 ? ['🥇', '🥈', '🥉', '🏅'][place] : `🏠${inHome(v, i)}/4`}</span></div>`;
  }).join('');
  if (E.pl.innerHTML !== h) E.pl.innerHTML = h;
}
function renderPanel(v) {
  const cp = v.players[v.cur], can = canActNow(v);
  let turn;
  if (v.phase === 'over') turn = `<span class="g-turn win">🏆 ${esc(v.players[v.done[0]].name)} kazandı!</span>`;
  else if (can) turn = `<span class="g-turn mine">⭐ ${ui.mode === 'local' && v.players.filter(p => !p.isBot).length > 1 ? esc(cp.name) + ', sıra sende' : 'Sıra sende'}</span>`;
  else turn = `<span class="g-turn">Sıra: <b style="color:${cp.color}">${esc(cp.name)}</b>${cp.isBot && (v.phase === 'roll' || v.phase === 'move') ? ' düşünüyor…' : ''}</span>`;
  if (E.turn.innerHTML !== turn) E.turn.innerHTML = turn;
  // zar
  E.dieBox.style.setProperty('--pc', cp.color);
  if (v.phase === 'rolling') { if (rollAnimN !== v.rollN) { rollAnimN = v.rollN; startRoll(); } }
  else { if (rollT) { stopRoll(); E.die.classList.remove('land'); void E.die.offsetWidth; E.die.classList.add('land'); } rollAnimN = v.rollN; setDie(v.die); }
  E.die.classList.toggle('six', v.phase !== 'rolling' && v.die === 6 && v.rollN > 0);
  const pips = [];
  if (v.need6 && (v.phase === 'roll' || v.phase === 'rolling')) pips.push(`<span class="kz-tries">${[0, 1, 2].map(i => `<i class="${i < v.tries ? 'used' : ''}"></i>`).join('')}</span>`);
  if (v.sixes > 0 && v.die === 6 && v.phase !== 'rolling' && v.phase !== 'over') pips.push(`<span class="kz-sixes">${v.sixes}. altı</span>`);
  const meta = pips.join('');
  if (E.meta.innerHTML !== meta) E.meta.innerHTML = meta;
  // eylemler
  let acts = '';
  if (can && v.phase === 'roll') acts = `<button type="button" class="btn btn-spin kz-roll" data-a="roll">🎲 ${v.sixes > 0 || v.tries > 0 ? 'Tekrar At' : 'Zar At'}</button>`;
  else if (can && v.phase === 'move') {
    acts = `<div class="kz-pick" style="--pc:${cp.color}">${[0, 1, 2, 3].map(k => {
      const m = v.moves.find(x => x.k === k);
      const lab = !m ? '' : v.pawns[v.cur][k] < 0 ? 'çıkar' : m.cap ? 'yer!' : m.to >= LANE0 ? 'eve' : `+${v.die}`;
      return `<button type="button" class="kz-pb ${m && m.cap ? 'cap' : ''}" data-k="${k}" ${m ? '' : 'disabled'} aria-label="${k + 1}. taş"><span class="kz-mini">${k + 1}</span><small>${lab}</small></button>`;
    }).join('')}</div>`;
  }
  let msg = v.msg || '';
  if (can && v.phase === 'move') msg = v.autoMove ? 'Tek hamle var, taş kendiliğinden oynuyor…' : 'Oynatmak istediğin taşa dokun.';
  if (!acts) { acts = `<p class="kz-wait">${esc(msg)}</p>`; msg = ''; }
  if (E.acts.innerHTML !== acts) E.acts.innerHTML = acts;
  if (E.msg.textContent !== msg) E.msg.textContent = msg;
  E.msg.hidden = !msg;
  const rules = `${v.protect ? '🛡️ Başlangıç karesi korunur' : '⚔️ Başlangıç karesi korunmaz'} · ${v.auto ? 'tek hamle otomatik' : 'her hamle elle'}${v.rankAll ? ' · sıralama tamamlanır' : ''}`;
  if (E.rules.textContent !== rules) E.rules.textContent = rules;
  // bahçeler
  E.yards.forEach((y, s) => {
    const pi = v.side.indexOf(s);
    y.classList.toggle('active', pi >= 0 && pi === v.cur && v.phase !== 'over');
  });
}
function render(v) {
  V = v;
  if (!pawnEls.length) buildPieces(v);
  if (v.mv && v.mv.id !== lastMv) { lastMv = v.mv.id; animateMove(v, v.mv); }
  if (v.lastCap && v.lastCap.n !== lastCapN) {
    lastCapN = v.lastCap.n;
    const el = pawnEls[v.lastCap.pi] && pawnEls[v.lastCap.pi][v.lastCap.k];
    if (el) { el.classList.remove('sent'); void el.offsetWidth; el.classList.add('sent'); setTimeout(() => el.classList.remove('sent'), 900); }
  }
  renderPlayers(v);
  renderPanel(v);
  renderPawns(v);
}
function buildPieces(v) {
  // bahçe ve renkler oyunculara göre
  const used = {}; v.side.forEach((s, pi) => { used[s] = pi; });
  for (let s = 0; s < 4; s++) {
    const pi = used[s], col = pi != null ? v.players[pi].color : '#5c4f86';
    E.board.style.setProperty('--c' + s, col);
    const y = E.yards[s]; y.classList.toggle('empty', pi == null);
    y.querySelector('.kz-yname').textContent = pi != null ? v.players[pi].name : '';
  }
  pawnEls = v.players.map((p, pi) => [0, 1, 2, 3].map(k => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'kz-pawn'; b.dataset.pi = pi; b.dataset.k = k;
    b.style.setProperty('--pc', p.color); b.setAttribute('aria-label', `${p.name}: ${k + 1}. taş`);
    b.innerHTML = `<span>${k + 1}</span>`;
    place(b, cellOf(v.side[pi], v.pawns[pi][k], k));
    E.pawns.appendChild(b); return b;
  }));
}
function boardHTML() {
  let h = '';
  // bahçeler (4×4 köşe alanları)
  for (let s = 0; s < 4; s++) {
    const [x, y] = rot([0, 0], s), [x2, y2] = rot([3, 3], s);
    h += `<div class="kz-yard s${s} ${s >= 2 ? 'bot' : ''}" style="--x:${Math.min(x, x2)};--y:${Math.min(y, y2)};--cc:var(--c${s})"><span class="kz-yname"></span></div>`;
  }
  for (let i = 0; i < N; i++) {
    const s = i % 10 === 0 ? i / 10 : -1;
    h += `<div class="kz-cell trk ${s >= 0 ? 'start' : ''}" data-c="${key(TRACK[i])}" style="--x:${TRACK[i][0]};--y:${TRACK[i][1]}${s >= 0 ? `;--cc:var(--c${s})` : ''}">${s >= 0 ? `<b class="kz-arrow s${s}">➜</b>` : ''}</div>`;
  }
  for (let s = 0; s < 4; s++) {
    LANE.forEach((c, j) => { const [x, y] = rot(c, s); h += `<div class="kz-cell lane" data-c="${key([x, y])}" style="--x:${x};--y:${y};--cc:var(--c${s})"><i>${j + 1}</i></div>`; });
    BASE.forEach(c => { const [x, y] = rot(c, s); h += `<div class="kz-cell base" data-c="${key([x, y])}" style="--x:${x};--y:${y};--cc:var(--c${s})"></div>`; });
  }
  h += '<div class="kz-center" style="--x:5;--y:5"><span>★</span></div>';
  const pts = TRACK.concat([TRACK[0]]).map(([x, y]) => `${x + .5},${y + .5}`).join(' ');
  h = `<svg class="kz-lines" viewBox="0 0 11 11" aria-hidden="true"><polyline points="${pts}"/></svg>` + h;
  return h;
}
function onClick(e) {
  const pb = e.target.closest('.kz-pawn, .kz-pb');
  if (pb) {
    if (pb.disabled || !V || !canActNow(V) || V.phase !== 'move') return;
    if (pb.classList.contains('kz-pawn') && +pb.dataset.pi !== V.cur) return;
    Sound.init(); ui.send({ t: 'move', k: +pb.dataset.k, as: V.cur }); return;
  }
  const b = e.target.closest('[data-a="roll"]');
  if (b && !b.disabled && V && canActNow(V) && V.phase === 'roll') { Sound.init(); ui.send({ t: 'roll', as: V.cur }); }
}
function onHover(e) {
  const pb = e.target.closest('.kz-pawn.can, .kz-pb:not([disabled])');
  const k = pb ? +pb.dataset.k : -1;
  if (k !== hoverK) { hoverK = k; if (V) renderPawns(V); }
}
function mount(r, api) {
  root = r; ui = api; V = null; pawnEls = []; cellEls = {}; lastMv = 0; rollAnimN = -1; lastCapN = 0; hoverK = -1; anim = null;
  root.innerHTML = `<div class="g-wrap kz">
    <div class="g-players kz-players"></div>
    <div class="kz-layout">
      <div class="kz-boardwrap"><div class="kz-board">${boardHTML()}<div class="kz-pawns"></div></div></div>
      <aside class="kz-side g-panel">
        <div class="g-status kz-turn"></div>
        <div class="kz-ctrl">
          <div class="kz-diebox"><div class="kz-die"></div><div class="kz-meta"></div></div>
          <div class="kz-acts"></div>
        </div>
        <p class="kz-msg"></p>
        <p class="kz-rules"></p>
      </aside>
    </div>
  </div>`;
  E = { board: root.querySelector('.kz-board'), pawns: root.querySelector('.kz-pawns'), yards: [...root.querySelectorAll('.kz-yard')], pl: root.querySelector('.kz-players'),
    turn: root.querySelector('.kz-turn'), die: root.querySelector('.kz-die'), dieBox: root.querySelector('.kz-diebox'), meta: root.querySelector('.kz-meta'),
    acts: root.querySelector('.kz-acts'), msg: root.querySelector('.kz-msg'), rules: root.querySelector('.kz-rules') };
  root.querySelectorAll('.kz-cell').forEach(c => { cellEls[c.dataset.c] = c; });
  setDie(6);
  root.addEventListener('click', onClick);
  root.addEventListener('pointerover', onHover);
  root.addEventListener('focusin', onHover);
}
function fxAt(cell, gold) {
  if (!E.board || !cell) return;
  const r = E.board.getBoundingClientRect(), c = r.width / G;
  FX.burst(r.left + (cell[0] + .5) * c, r.top + (cell[1] + .5) * c, 34, gold);
}

DEF = {
  id: 'kizma', name: 'Kızma Birader', icon: '🎲', color: '#2bd96b', min: 2, max: 4, hotseat: true, bot: true, localMin: 1,
  tagline: 'Zar at, taşlarını eve topla, rakibini bahçesine yolla',
  rules: 'Zar at; taş çıkarmak için 6 gerekir ve 6 atan bir daha atar. Rakibin taşının üstüne gelirsen onu bahçesine yollarsın, kendi taşının üstüne gelemezsin. Dört taşını da tam sayıyla evine ilk sokan kazanır.',
  options: [
    { key: 'protect', label: 'Başlangıç karesi korunur', def: '1', choices: [{ v: '1', label: 'Açık' }, { v: '0', label: 'Kapalı' }] },
    { key: 'rank', label: 'Sıralama tamamlansın', def: '0', choices: [{ v: '1', label: 'Açık' }, { v: '0', label: 'Kapalı' }] },
    { key: 'auto', label: 'Tek hamle otomatik oynansın', def: '1', choices: [{ v: '1', label: 'Açık' }, { v: '0', label: 'Kapalı' }] }
  ],
  speed: 1,
  get botDelay() { return T(800); },
  setup(players, opts) {
    const o = opts || {}, n = players.length, side = SIDES(n);
    return {
      players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })),
      side, pawns: players.map(() => [-1, -1, -1, -1]), caps: players.map(() => 0), lost: players.map(() => 0),
      protect: o.protect !== '0', rankAll: o.rank === '1', auto: o.auto !== '0',
      cur: 0, phase: 'roll', die: 6, rollN: 0, sixes: 0, tries: 0, moves: [], autoMove: false, skip: -1,
      mv: null, mvN: 0, lastCap: null, capN: 0, done: [], seq: 0, turnN: 0,
      msg: `${players[0].name} başlıyor. Taş çıkarmak için 6 gerek (3 hak).`
    };
  },
  action(st, pi, a, ctx) {
    if (!a || st.phase === 'over' || pi !== st.cur) return false;
    if (a.t === 'roll') { if (st.phase !== 'roll') return false; doRoll(st, ctx); return true; }
    if (a.t === 'move') {
      if (st.phase !== 'move') return false;
      const k = a.k | 0; if (k < 0 || k > 3) return false;
      return startMove(st, ctx, k);
    }
    return false;
  },
  view(st) {
    return {
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, online: CFX.Room.game && CFX.Room.game.players[i] ? CFX.Room.game.players[i].online : true })),
      side: st.side, pawns: st.pawns.map(a => a.slice()), caps: st.caps, cur: st.cur, phase: st.phase, die: st.die, rollN: st.rollN, sixes: st.sixes, tries: st.tries,
      need6: st.phase === 'roll' || st.phase === 'rolling' ? needsSix(st, st.cur) : false,
      moves: st.phase === 'move' ? st.moves : [], autoMove: st.autoMove, mv: st.mv, lastCap: st.lastCap, done: st.done.slice(), protect: st.protect, auto: st.auto, rankAll: st.rankAll, msg: st.msg
    };
  },
  turnOf(st) { return st.phase === 'roll' || (st.phase === 'move' && !st.autoMove) ? st.cur : null; },
  botAct(st, pi, ctx, forced) {
    if (st.cur !== pi || st.phase === 'over') return;
    if (st.phase === 'roll') { doRoll(st, ctx); return; }
    if (st.phase !== 'move' || (st.autoMove && !forced)) return;
    const ms = legalMoves(st, pi, st.die);
    if (!ms.length) { passTurn(st, ctx); return; }
    let best = ms[0], bs = -Infinity;
    for (const m of ms) { const s = botScore(st, pi, m); if (s > bs) { bs = s; best = m; } }
    startMove(st, ctx, best.k);
  },
  skipTurn(st, pi, ctx) {
    if (st.cur !== pi || st.phase === 'over') return;
    st.skip = pi;                                    // bu turun geri kalanı kendiliğinden oynanır
    if (st.phase === 'roll') doRoll(st, ctx);
    else if (st.phase === 'move') this.botAct(st, pi, ctx, true);
  },
  resume(st, ctx) {
    if (st.phase === 'rolling') schedule(st, ctx, 300, afterRoll);
    else if (st.phase === 'moving' && st.mv) schedule(st, ctx, 300, land);
    else if (st.phase === 'pass') schedule(st, ctx, 400, nextTurn);
    else if (st.phase === 'move' && st.autoMove) { st.autoMove = false; ctx.sync(); }
    else if (st.phase === 'over') ctx.end(result(st));
  },
  mount, render,
  onEvent(e) {
    const nm = i => (V && V.players[i] ? V.players[i].name.toLocaleUpperCase('tr-TR') : '');
    switch (e.t) {
      case 'rolling': Sound.whoosh(); break;
      case 'die': if (e.d === 6) { Sound.special(); } else Sound.stop(); break;
      case 'six3': Sound.bad(); banner('ÜÇ KEZ 6!', 'bad'); break;
      case 'out': Sound.good(); break;
      case 'cap': Sound.bankrupt(); flash('bad'); banner('KIZMA BİRADER!', 'bad'); setTimeout(() => fxAt(e.cell, false), 30); break;
      case 'home': Sound.buy(); fxAt(e.cell, true); break;
      case 'finish': Sound.solve(); FX.confetti(80); banner(`${nm(e.pi)} BİTİRDİ!`, 'good'); break;
      case 'over': Sound.fanfare(); FX.confetti(130); break;
      case 'turn':
        if (ui && ui.mode === 'online' && e.pi === ui.me) { Sound.good(); banner('SIRA SENDE', 'good'); }
        else if (ui && ui.mode === 'local' && V && V.players.filter(p => !p.isBot).length > 1 && !V.players[e.pi].isBot) banner(nm(e.pi), 'pink');
        break;
      default: break;
    }
  },
  unmount() { stopAnim(); stopRoll(); if (root) { root.removeEventListener('click', onClick); root.removeEventListener('pointerover', onHover); root.removeEventListener('focusin', onHover); } root = null; V = null; E = {}; pawnEls = []; cellEls = {}; }
};
CFX.registerGame(DEF);
})();
