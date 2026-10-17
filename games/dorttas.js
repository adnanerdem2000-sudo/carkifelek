/* =========================================================================
   OYUN SALONU — DÖRT TAŞ
   7×6 dikey tahtaya sırayla taş bırak; yatay, dikey ya da çapraz dört taşı
   ilk dizen eli kazanır. 2 kişi online, aynı cihazda ya da bilgisayara karşı.
   ========================================================================= */
(() => {
'use strict';
const { $, esc, fmt, Sound, FX, banner, flash, initial, sleep } = CFX;
const COLS = 7, ROWS = 6;

/* ---------- kurallar (yöneten cihaz) ---------- */
const idx = (c, r) => r * COLS + c;            // r = 0 en alt satır
function dropRow(board, c) { for (let r = 0; r < ROWS; r++) if (board[idx(c, r)] == null) return r; return -1; }
function lineAt(board, c, r) {
  const who = board[idx(c, r)]; if (who == null) return null;
  for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    const cells = [[c, r]];
    for (const s of [1, -1]) {
      let x = c + dc * s, y = r + dr * s;
      while (x >= 0 && x < COLS && y >= 0 && y < ROWS && board[idx(x, y)] === who) { cells.push([x, y]); x += dc * s; y += dr * s; }
    }
    if (cells.length >= 4) return cells.map(([x, y]) => idx(x, y));
  }
  return null;
}
function newRound(st) {
  st.board = Array(COLS * ROWS).fill(null);
  st.cur = st.starter; st.phase = 'play'; st.last = null; st.win = null; st.moves = 0;
}

/* ---------- bilgisayar: alfa-beta arama ---------- */
function score(board, me) {
  let s = 0; const op = 1 - me;
  for (let r = 0; r < ROWS; r++) if (board[idx(3, r)] === me) s += 3;
  const win4 = (a, b, c, d) => { const w = [a, b, c, d].map(i => board[i]); const m = w.filter(x => x === me).length, o = w.filter(x => x === op).length, e = w.filter(x => x == null).length;
    if (m === 4) return 1000; if (m === 3 && e === 1) return 5; if (m === 2 && e === 2) return 2; if (o === 3 && e === 1) return -4; return 0; };
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (c + 3 < COLS) s += win4(idx(c, r), idx(c + 1, r), idx(c + 2, r), idx(c + 3, r));
    if (r + 3 < ROWS) s += win4(idx(c, r), idx(c, r + 1), idx(c, r + 2), idx(c, r + 3));
    if (c + 3 < COLS && r + 3 < ROWS) s += win4(idx(c, r), idx(c + 1, r + 1), idx(c + 2, r + 2), idx(c + 3, r + 3));
    if (c + 3 < COLS && r - 3 >= 0) s += win4(idx(c, r), idx(c + 1, r - 1), idx(c + 2, r - 2), idx(c + 3, r - 3));
  }
  return s;
}
function search(board, depth, alpha, beta, turn, me) {
  const order = [3, 2, 4, 1, 5, 0, 6].filter(c => dropRow(board, c) >= 0);
  if (!order.length) return [0, -1];
  if (depth === 0) return [score(board, me), -1];
  let best = turn === me ? -Infinity : Infinity, bestC = order[0];
  for (const c of order) {
    const r = dropRow(board, c); board[idx(c, r)] = turn;
    let v;
    if (lineAt(board, c, r)) v = (turn === me ? 100000 : -100000) * (depth + 1);
    else v = search(board, depth - 1, alpha, beta, 1 - turn, me)[0];
    board[idx(c, r)] = null;
    if (turn === me ? v > best : v < best) { best = v; bestC = c; }
    if (turn === me) alpha = Math.max(alpha, v); else beta = Math.min(beta, v);
    if (alpha >= beta) break;
  }
  return [best, bestC];
}

/* ---------- arayüz ---------- */
let root = null, ui = null, V = null, lastBoard = [];
function render(v) {
  const prevBoard = lastBoard; V = v; lastBoard = v.board.slice();
  const me = ui.me, canAct = v.phase === 'play' && (ui.mode === 'local' ? !v.players[v.cur].isBot : me === v.cur);
  const p = v.players;
  root.querySelector('.dt-score').innerHTML = p.map((x, i) => `<div class="g-chip ${i === v.cur && v.phase === 'play' ? 'active' : ''} ${x.online === false ? 'off' : ''}" style="--pc:${x.color}">
      <span class="dt-disc mini c${i}"></span><span class="av" style="--pc:${x.color}">${initial(x.name)}</span><b>${esc(x.name)}${me === i ? ' · sen' : ''}</b><span class="g-num">${v.wins[i]}</span></div>`).join('');
  const st = root.querySelector('.dt-status');
  if (v.phase === 'play') st.innerHTML = canAct ? `<span class="g-turn mine">⭐ Sıra sende · bir sütuna dokun</span>` : `<span class="g-turn">Sıra: <b style="color:${p[v.cur].color}">${esc(p[v.cur].name)}</b>${p[v.cur].isBot ? ' düşünüyor…' : ''}</span>`;
  else if (v.phase === 'roundOver') st.innerHTML = v.win ? `<span class="g-turn win">${esc(p[v.winner].name)} eli kazandı!</span>` : '<span class="g-turn">Berabere! Tahta doldu.</span>';
  else st.innerHTML = '<span class="g-turn">Maç bitti</span>';
  root.querySelector('.dt-round').textContent = `${v.round}. el · ${v.target} galibiyet alan kazanır`;
  const grid = root.querySelector('.dt-grid');
  grid.classList.toggle('can', canAct);
  grid.style.setProperty('--turn', p[v.cur].color);
  const win = new Set(v.win || []);
  grid.querySelectorAll('.dt-cell').forEach(cell => {
    const i = +cell.dataset.i, who = v.board[i];
    const d = cell.firstElementChild;
    d.className = 'dt-disc' + (who == null ? ' empty' : ' c' + who) + (win.has(i) ? ' win' : '');
    if (who != null && prevBoard[i] == null && v.last === i) { const r = Math.floor(i / COLS); d.style.setProperty('--fall', (ROWS - r) * 100 + '%'); d.classList.add('drop'); }
  });
  grid.querySelectorAll('.dt-col').forEach(b => { b.disabled = !canAct || v.full[+b.dataset.c]; });
}
function mount(r, api) {
  root = r; ui = api; lastBoard = [];
  let cells = '';
  for (let rr = ROWS - 1; rr >= 0; rr--) for (let c = 0; c < COLS; c++) cells += `<div class="dt-cell" data-i="${idx(c, rr)}"><span class="dt-disc empty"></span></div>`;
  root.innerHTML = `<div class="g-wrap dt">
    <div class="g-players dt-score"></div>
    <div class="g-status dt-status"></div>
    <div class="dt-frame"><div class="dt-grid">${cells}<div class="dt-cols">${Array.from({ length: COLS }, (_, c) => `<button type="button" class="dt-col" data-c="${c}" aria-label="${c + 1}. sütun"></button>`).join('')}</div></div></div>
    <p class="g-sub dt-round"></p>
  </div>`;
  root.querySelector('.dt-cols').addEventListener('click', e => { const b = e.target.closest('.dt-col'); if (b && !b.disabled) { Sound.init(); ui.send({ t: 'drop', c: +b.dataset.c }); } });
}

CFX.registerGame({
  id: 'dorttas', name: 'Dört Taş', icon: '🔴', color: '#ff3fa4', min: 2, max: 2, hotseat: true, bot: true, localMin: 1,
  tagline: 'Dört taşı yan yana ilk dizen kazanır',
  rules: 'Sırayla bir sütuna taş bırakın. Yatay, dikey ya da çapraz dört taşı ilk dizen eli alır. Belirlenen sayıda el kazanan maçı kazanır.',
  options: [{ key: 'target', label: 'Maç', def: '2', choices: [{ v: '1', label: 'Tek el' }, { v: '2', label: '2 el alan' }, { v: '3', label: '3 el alan' }] }],
  setup(players, opts) {
    const st = { players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })), wins: [0, 0], round: 1, target: +opts.target || 2, starter: 0 };
    newRound(st);
    return st;
  },
  action(st, pi, a, ctx) {
    if (a.t !== 'drop' || st.phase !== 'play' || pi !== st.cur) return;
    const c = a.c | 0; if (c < 0 || c >= COLS) return;
    const r = dropRow(st.board, c); if (r < 0) return;
    st.board[idx(c, r)] = pi; st.last = idx(c, r); st.moves++;
    const line = lineAt(st.board, c, r);
    const name = st.players[pi].name;
    if (line) {
      st.win = line; st.winner = pi; st.wins[pi]++; st.phase = 'roundOver';
      ctx.emit({ t: 'win', pi }, `${name} dört taşı dizdi! (${st.wins.join(' – ')})`, 'good');
    } else if (st.moves === COLS * ROWS) {
      st.phase = 'roundOver'; st.winner = null;
      ctx.emit({ t: 'draw' }, 'Tahta doldu, el berabere.');
    } else { st.cur = 1 - pi; ctx.emit({ t: 'drop', pi }); }
    ctx.sync();
    if (st.phase === 'roundOver') ctx.later(2600, () => {
      const champ = st.wins.findIndex(w => w >= st.target);
      if (champ >= 0) {
        st.phase = 'done'; ctx.sync();
        ctx.end({ title: `${st.players[champ].name} maçı kazandı!`, ranking: [champ, 1 - champ].map(i => ({ pi: i, score: st.wins[i], label: `${st.wins[i]} el` })) });
      } else { st.round++; st.starter = 1 - st.starter; newRound(st); ctx.emit({ t: 'round' }, `${st.round}. el başladı.`); ctx.sync(); }
    });
  },
  view(st, viewer) {
    return { board: st.board, cur: st.cur, phase: st.phase, last: st.last, win: st.win, winner: st.winner, wins: st.wins, round: st.round, target: st.target,
      full: Array.from({ length: COLS }, (_, c) => dropRow(st.board, c) < 0), players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, online: CFX.Room.game ? CFX.Room.game.players[i].online : true })) };
  },
  turnOf(st) { return st.phase === 'play' ? st.cur : null; },
  botDelay: 700,
  botAct(st, pi, ctx) {
    const b = st.board.slice();
    let [, c] = search(b, 6, -Infinity, Infinity, pi, pi);
    if (c < 0 || Math.random() < .08) { const ok = [0, 1, 2, 3, 4, 5, 6].filter(x => dropRow(st.board, x) >= 0); c = ok[Math.floor(Math.random() * ok.length)]; }
    this.action(st, pi, { t: 'drop', c }, ctx);
  },
  skipTurn(st, pi, ctx) { if (st.phase === 'play' && st.cur === pi) { st.cur = 1 - pi; ctx.sync(); } },
  mount, render,
  onEvent(e) {
    if (e.t === 'drop') Sound.tick(.4);
    else if (e.t === 'win') { Sound.solve(); FX.confetti(90); flash('good'); banner(V && V.players[e.pi] ? `${V.players[e.pi].name.toLocaleUpperCase('tr-TR')} KAZANDI!` : 'DÖRT!', 'good'); }
    else if (e.t === 'draw') { Sound.bad(); banner('BERABERE', 'pink'); }
    else if (e.t === 'round') banner('YENİ EL');
  },
  unmount() { root = null; V = null; }
});
})();
