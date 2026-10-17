/* =========================================================================
   OYUN SALONU — TERS YÜZ
   Klasik "disk çevirme" oyunu (Reversi kuralları). 8×8 (Hızlı modda 6×6)
   tahtada sırayla disk koy; rakip disklerini iki diskin arasına sıkıştırdığın
   her düz çizgide (8 yön) onlar senin rengine döner. Hamlesi olmayan oyuncu
   pas geçer; kimse oynayamayınca en çok diski olan kazanır.
   2 kişi online, aynı cihazda ya da bilgisayara karşı.
   Tahta: board[y * n + x], -1 boş, 0/1 oyuncunun diski. 0. oyuncu başlar.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial } = CFX;
const EMPTY = -1;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
const FILES = 'abcdefgh';
const WIN = 1e6;
const LEVELS = {
  kolay: { depth: 1, ms: 120, solve: 0, random: .35 },
  orta: { depth: 3, ms: 400, solve: 8, random: .03 },
  zor: { depth: 6, ms: 800, solve: 14, random: 0 }
};

/* ---------- kurallar (ortak) ---------- */
const RAYS = {};
// Her kare için 8 yöndeki ışınlar (en az 2 kare uzunluğunda olanlar)
function rays(n) {
  if (RAYS[n]) return RAYS[n];
  const R = [];
  for (let i = 0; i < n * n; i++) {
    const x = i % n, y = (i / n) | 0, list = [];
    for (const [dx, dy] of DIRS) {
      const r = []; let cx = x + dx, cy = y + dy;
      while (cx >= 0 && cx < n && cy >= 0 && cy < n) { r.push(cy * n + cx); cx += dx; cy += dy; }
      if (r.length >= 2) list.push(r);
    }
    R.push(list);
  }
  return (RAYS[n] = R);
}
// i karesine p oynarsa dönecek diskler: [[kare, uzaklık], …]
function flipsFor(b, n, i, p) {
  if (b[i] !== EMPTY) return [];
  const out = [], o = 1 - p;
  for (const r of rays(n)[i]) {
    let k = 0; while (k < r.length && b[r[k]] === o) k++;
    if (k > 0 && k < r.length && b[r[k]] === p) for (let j = 0; j < k; j++) out.push([r[j], j + 1]);
  }
  return out;
}
function canPlay(b, n, i, p) {
  if (b[i] !== EMPTY) return false;
  const o = 1 - p;
  for (const r of rays(n)[i]) {
    if (b[r[0]] !== o) continue;
    let k = 1; while (k < r.length && b[r[k]] === o) k++;
    if (k < r.length && b[r[k]] === p) return true;
  }
  return false;
}
function legalMoves(b, n, p) { const m = []; for (let i = 0; i < n * n; i++) if (b[i] === EMPTY && canPlay(b, n, i, p)) m.push(i); return m; }
function countMoves(b, n, p) { let c = 0; for (let i = 0; i < n * n; i++) if (b[i] === EMPTY && canPlay(b, n, i, p)) c++; return c; }
function counts(b) { const c = [0, 0]; for (const v of b) if (v >= 0) c[v]++; return c; }
function initialBoard(n) {
  const b = new Array(n * n).fill(EMPTY), a = n / 2 - 1, z = n / 2;
  b[a * n + a] = 1; b[z * n + z] = 1; b[a * n + z] = 0; b[z * n + a] = 0;
  return b;
}
const LVL_NAME = { kolay: 'Kolay seviye', orta: 'Orta seviye', zor: 'Zor seviye' };
const coord = (i, n) => FILES[i % n] + (((i / n) | 0) + 1);

/* ---------- bilgisayar: konum ağırlıkları + hareket serbestliği, alfa-beta ---------- */
const W8 = [
  100, -20, 10, 5, 5, 10, -20, 100,
  -20, -50, -2, -2, -2, -2, -50, -20,
  10, -2, 1, -1, -1, 1, -2, 10,
  5, -2, -1, -1, -1, -1, -2, 5,
  5, -2, -1, -1, -1, -1, -2, 5,
  10, -2, 1, -1, -1, 1, -2, 10,
  -20, -50, -2, -2, -2, -2, -50, -20,
  100, -20, 10, 5, 5, 10, -20, 100];
const W6 = [
  100, -25, 10, 10, -25, 100,
  -25, -50, -3, -3, -50, -25,
  10, -3, 2, 2, -3, 10,
  10, -3, 2, 2, -3, 10,
  -25, -50, -3, -3, -50, -25,
  100, -25, 10, 10, -25, 100];
const WEIGHTS = { 8: W8, 6: W6 };
const CORNERS = {};
function corners(n) {
  if (CORNERS[n]) return CORNERS[n];
  const at = (x, y) => y * n + x, e = n - 1;
  return (CORNERS[n] = [[0, 0, 1, 1], [e, 0, -1, 1], [0, e, 1, -1], [e, e, -1, -1]].map(([x, y, dx, dy]) => ({ c: at(x, y), adj: [at(x + dx, y), at(x, y + dy), at(x + dx, y + dy)] })));
}
const isCorner = (i, n) => corners(n).some(k => k.c === i);

function finalScore(b, p) {
  const c = counts(b), d = c[p] - c[1 - p];
  return d > 0 ? WIN + d : d < 0 ? -WIN + d : 0;
}
function evaluate(b, n, p) {
  const W = WEIGHTS[n];
  let my = 0, op = 0, pos = 0, empt = 0;
  for (let i = 0; i < n * n; i++) {
    const v = b[i];
    if (v === EMPTY) empt++;
    else if (v === p) { my++; pos += W[i]; } else { op++; pos -= W[i]; }
  }
  // köşe dolduysa yanındaki "tehlikeli" kareler artık tehlikeli değil
  for (const k of corners(n)) {
    if (b[k.c] === EMPTY) continue;
    for (const a of k.adj) { const v = b[a]; if (v === EMPTY) continue; const s = v === p ? 1 : -1; pos += s * (6 - W[a]); }
  }
  const mm = countMoves(b, n, p), om = countMoves(b, n, 1 - p);
  if (!mm && !om) return finalScore(b, p);
  let s = pos + 90 * (mm - om) / (mm + om + 2);
  if (!om) s += 25; else if (!mm) s -= 25;
  if (empt <= 16) s += (my - op) * (17 - empt) * .9;
  return s;
}

const ABORT = { abort: true };
function makeSearch(n, deadline) {
  const W = WEIGHTS[n], R = rays(n), stk = [];
  let nodes = 0;
  const make = (b, i, p) => {
    const o = 1 - p; let cnt = 0;
    for (const r of R[i]) {
      let k = 0; while (k < r.length && b[r[k]] === o) k++;
      if (k > 0 && k < r.length && b[r[k]] === p) { for (let j = 0; j < k; j++) { b[r[j]] = p; stk.push(r[j]); } cnt += k; }
    }
    b[i] = p; return cnt;
  };
  const undo = (b, i, p, cnt) => { b[i] = EMPTY; for (let j = 0; j < cnt; j++) b[stk.pop()] = 1 - p; };
  const order = ms => ms.sort((a, c) => W[c] - W[a]);
  function negamax(b, p, depth, alpha, beta, passed) {
    if ((++nodes & 1023) === 0 && Date.now() > deadline) throw ABORT;
    if (depth <= 0) return evaluate(b, n, p);
    const ms = legalMoves(b, n, p);
    if (!ms.length) {
      if (passed) return finalScore(b, p);
      return -negamax(b, 1 - p, depth - 1, -beta, -alpha, true);
    }
    order(ms);
    let best = -Infinity;
    for (const m of ms) {
      const cnt = make(b, m, p);
      const v = -negamax(b, 1 - p, depth - 1, -beta, -alpha, false);
      undo(b, m, p, cnt);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }
  return { make, undo, negamax, order };
}
function bestMove(board, n, p, level) {
  const L = LEVELS[level] || LEVELS.orta;
  const b = Int8Array.from(board);
  let ms = legalMoves(b, n, p);
  if (ms.length <= 1) return ms.length ? ms[0] : -1;
  if (Math.random() < L.random) return ms[Math.floor(Math.random() * ms.length)];
  const S = makeSearch(n, Date.now() + L.ms);
  // eşit değerli hamlelerde çeşitlilik için karıştır, sonra ağırlığa göre sırala
  for (let k = ms.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [ms[k], ms[j]] = [ms[j], ms[k]]; }
  ms = S.order(ms);
  let best = ms[0];
  const empt = b.reduce((s, v) => s + (v === EMPTY ? 1 : 0), 0);
  const maxD = empt <= L.solve ? empt : L.depth;
  for (let d = 1; d <= maxD; d++) {
    try {
      let alpha = -Infinity, here = ms[0];
      for (const m of ms) {
        const cnt = S.make(b, m, p);
        const v = -S.negamax(b, 1 - p, d - 1, -Infinity, -alpha, false);
        S.undo(b, m, p, cnt);
        if (v > alpha) { alpha = v; here = m; }
      }
      best = here; ms = [best].concat(ms.filter(x => x !== best));
      if (alpha >= WIN) break;          // kesin kazanç bulundu
    } catch (e) { if (e !== ABORT) throw e; break; }
  }
  return best;
}

/* ---------- oyun akışı (yöneten cihaz) ---------- */
function place(st, pi, i, ctx) {
  if (st.phase !== 'play' || pi !== st.cur) return false;
  i = Number(i);
  if (!Number.isInteger(i) || i < 0 || i >= st.n * st.n) return false;
  const f = flipsFor(st.board, st.n, i, pi);
  if (!f.length) return false;
  st.board[i] = pi; f.forEach(([j]) => { st.board[j] = pi; });
  st.ply++;
  st.last = { i, pi, f, n: st.ply };
  st.pass = null;
  const P = st.players, corner = isCorner(i, st.n);
  ctx.emit({ t: 'move', pi, i, k: f.length, corner, d: Math.max(...f.map(x => x[1])) },
    `${P[pi].name} ${coord(i, st.n)} karesine oynadı, ${f.length} disk çevirdi.${corner ? ' Köşe!' : ''}`, corner ? 'gold' : '');
  const o = 1 - pi;
  if (countMoves(st.board, st.n, o)) st.cur = o;
  else if (countMoves(st.board, st.n, pi)) {
    st.cur = pi; st.pass = { pi: o, n: st.ply };
    ctx.emit({ t: 'pass', pi: o }, `${P[o].name}: Hamle yok, pas!`, 'bad');
  } else finish(st, ctx);
  st.moves = st.phase === 'play' ? legalMoves(st.board, st.n, st.cur) : [];
  ctx.sync();
  return true;
}
function finish(st, ctx) {
  st.phase = 'done'; st.moves = [];
  const c = counts(st.board);
  st.winner = c[0] > c[1] ? 0 : c[1] > c[0] ? 1 : null;
  if (st.winner != null) ctx.emit({ t: 'win', pi: st.winner }, `Oyun bitti: ${st.players[st.winner].name} ${c[st.winner]} – ${c[1 - st.winner]} kazandı!`, 'good');
  else ctx.emit({ t: 'draw' }, `Oyun bitti: ${c[0]} – ${c[1]} berabere.`, 'gold');
  ctx.later(1900, () => endGame(st, ctx));
}
function endGame(st, ctx) {
  const c = counts(st.board), w = st.winner;
  const order = w === 1 ? [1, 0] : [0, 1];
  ctx.end({
    title: w == null ? 'Berabere!' : `${st.players[w].name} kazandı!`,
    ranking: order.map(i => ({ pi: i, score: c[i], label: `${c[i]} disk` })),
    note: `Son durum ${c[0]} – ${c[1]} · ${st.n}×${st.n} tahta · ${st.ply} hamle`
  });
}

/* ---------- arayüz ---------- */
let root = null, ui = null, V = null, builtN = 0, shownN = null, lastBoard = null, sentKey = '', shown = [0, 0], tween = null;

const canAct = () => !!V && V.phase === 'play' && (ui.mode === 'local' ? !V.players[V.cur].isBot : ui.me === V.cur);

function build(n) {
  builtN = n;
  let h = '';
  for (let i = 0; i < n * n; i++) h += `<div class="ty-cell" data-i="${i}" role="gridcell" aria-label="${coord(i, n)}"><span class="ty-coin empty"><span class="ty-spin"><i class="ty-face ty-fa"></i><i class="ty-face ty-fb"></i></span></span></div>`;
  const stars = n === 8 ? [[2, 2], [6, 2], [2, 6], [6, 6]] : [[2, 2], [4, 2], [2, 4], [4, 4]];
  h += stars.map(([x, y]) => `<b class="ty-star" style="left:calc(1px + (100% - 2px) * ${x / n});top:calc(1px + (100% - 2px) * ${y / n})"></b>`).join('');
  const bd = root.querySelector('.ty-board');
  bd.style.setProperty('--n', n);
  bd.innerHTML = h;
  lastBoard = null;
}
function chipHtml(i) {
  const p = V.players[i], me = ui.mode !== 'local' && ui.me === i;
  const act = V.phase === 'play' && V.cur === i;
  return `<div class="g-chip ty-chip ty-c${i} ${act ? 'active' : ''} ${p.online === false ? 'off' : ''}" style="--pc:${p.color}">
    <span class="av" style="--pc:${p.color}">${esc(initial(p.name))}</span>
    <span class="ty-who"><b>${esc(p.name)}</b><small>${me ? 'sen' : p.isBot ? LVL_NAME[V.level] || 'bilgisayar' : i === 0 ? 'ilk oynar' : 'ikinci oynar'}</small></span>
    <span class="ty-cnt" data-c="${i}">${shown[i]}</span>
  </div>`;
}
function setCounts(c, animMs) {
  const from = shown.slice();
  if (tween) cancelAnimationFrame(tween);
  const els = [0, 1].map(i => root.querySelector(`.ty-cnt[data-c="${i}"]`));
  if (!animMs || (from[0] === c[0] && from[1] === c[1])) { shown = c.slice(); els.forEach((e, i) => { if (e) e.textContent = c[i]; }); return; }
  const t0 = performance.now();
  const step = t => {
    if (!root) return;
    const k = Math.min(1, (t - t0) / animMs);
    shown = [0, 1].map(i => Math.round(from[i] + (c[i] - from[i]) * k));
    els.forEach((e, i) => { if (e && e.isConnected) e.textContent = shown[i]; });
    tween = k < 1 ? requestAnimationFrame(step) : null;
  };
  tween = requestAnimationFrame(step);
  els.forEach((e, i) => { if (e && from[i] !== c[i]) { e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); } });
}
function statusHtml() {
  const v = V, p = v.players;
  if (v.phase === 'play') {
    if (canAct()) {
      const who = ui.mode === 'local' && !p[1 - v.cur].isBot ? `${esc(p[v.cur].name)} · ` : '';
      return `<span class="g-turn mine">⭐ ${who}Sıra sende · ${v.hints ? 'bir noktaya dokun' : 'bir kareye dokun'}</span>`;
    }
    return `<span class="g-turn">Sıra: <b style="color:${p[v.cur].color}">${esc(p[v.cur].name)}</b>${p[v.cur].isBot ? ' düşünüyor…' : ''}</span>`;
  }
  if (v.winner != null) return `<span class="g-turn win">🏆 ${esc(p[v.winner].name)} kazandı!</span>`;
  return '<span class="g-turn">🤝 Berabere</span>';
}
function render(v) {
  V = v;
  if (builtN !== v.n) build(v.n);
  const n = v.n, anim = !!(v.last && shownN != null && v.last.n > shownN);
  shownN = v.last ? v.last.n : 0;
  const key = `${v.ply}:${v.cur}:${v.phase}`;
  if (key !== sentKey) sentKey = '';
  const act = canAct();
  const c = v.counts, tot = Math.max(1, c[0] + c[1]);
  const maxD = anim ? Math.max(...v.last.f.map(x => x[1])) : 0;
  // skor ve halat
  const sc = root.querySelector('.ty-score');
  sc.style.setProperty('--c0', v.players[0].color); sc.style.setProperty('--c1', v.players[1].color);
  root.querySelector('.ty-s0').innerHTML = chipHtml(0);
  root.querySelector('.ty-s1').innerHTML = chipHtml(1);
  sc.style.setProperty('--p', (c[0] / tot * 100).toFixed(2) + '%');
  sc.querySelector('.ty-tug').setAttribute('aria-label', `${v.players[0].name} ${c[0]}, ${v.players[1].name} ${c[1]}`);
  setCounts(c, anim ? 260 + maxD * 90 : 0);
  root.querySelector('.ty-status').innerHTML = statusHtml();
  // bilgi satırı
  const empt = v.board.filter(x => x === EMPTY).length;
  let info;
  if (v.phase === 'play') {
    info = `Hamle ${v.ply} · ${empt} boş kare`;
    if (v.pass) info = `<span class="ty-pass">${esc(v.players[v.pass.pi].name)}: hamle yok, pas!</span> · ` + info;
  } else info = `Son durum ${c[0]} – ${c[1]} · ${v.ply} hamle`;
  root.querySelector('.ty-info').innerHTML = info;
  // tahta
  const bd = root.querySelector('.ty-board');
  bd.style.setProperty('--c0', v.players[0].color); bd.style.setProperty('--c1', v.players[1].color);
  const fr = root.querySelector('.ty-frame');
  fr.style.setProperty('--turn', v.phase === 'play' ? v.players[v.cur].color : (v.winner != null ? v.players[v.winner].color : '#ffe14a'));
  bd.classList.toggle('ty-act', act);
  const moves = new Set(act ? v.moves : []);
  const flipD = new Map(anim ? v.last.f.map(([j, d]) => [j, d]) : []);
  const cells = bd.querySelectorAll('.ty-cell');
  const restart = [];
  cells.forEach(cell => {
    const i = +cell.dataset.i, who = v.board[i], coin = cell.firstElementChild;
    cell.classList.toggle('mv', moves.has(i) && v.hints);
    cell.classList.toggle('tap', moves.has(i));
    cell.classList.toggle('last', !!v.last && v.last.i === i);
    cell.classList.toggle('won', v.phase === 'done' && v.winner != null && who === v.winner);
    if (who === EMPTY) { coin.className = 'ty-coin empty'; return; }
    if (anim && (i === v.last.i || flipD.has(i))) {
      coin.className = 'ty-coin p' + who;
      if (flipD.has(i)) coin.style.setProperty('--d', flipD.get(i)); else coin.style.removeProperty('--d');
      restart.push([coin, i === v.last.i ? 'drop' : 'flip']);
    } else if (!coin.classList.contains('p' + who)) coin.className = 'ty-coin p' + who;
  });
  if (restart.length) { void bd.offsetWidth; restart.forEach(([coin, cls]) => coin.classList.add(cls)); }
  lastBoard = v.board.slice();
  if (anim) {
    // çevrilen her halka için ışık patlaması (hafif)
    const placed = cells[v.last.i];
    setTimeout(() => {
      if (!placed || !placed.isConnected) return;
      const r = placed.getBoundingClientRect();
      FX.burst(r.left + r.width / 2, r.top + r.height / 2, Math.min(12, 4 + v.last.f.length), false);
    }, 60);
  }
}
function shake(cell) { cell.classList.remove('no'); void cell.offsetWidth; cell.classList.add('no'); setTimeout(() => cell.classList.remove('no'), 420); }
function onClick(e) {
  const cell = e.target.closest('.ty-cell'); if (!cell || !root || !root.contains(cell)) return;
  if (!canAct() || sentKey) return;
  Sound.init();
  const i = +cell.dataset.i;
  if (!V.moves.includes(i)) { if (V.board[i] === EMPTY) { shake(cell); Sound.tick(.1); } return; }
  sentKey = `${V.ply}:${V.cur}:${V.phase}`;
  ui.send({ t: 'place', i });
}
function mount(r, api) {
  root = r; ui = api; V = null; builtN = 0; shownN = null; lastBoard = null; sentKey = ''; shown = [0, 0];
  root.innerHTML = `<div class="g-wrap ty">
    <div class="ty-score">
      <div class="ty-side ty-s0"></div><div class="ty-side ty-s1"></div>
      <div class="ty-tug" role="img"><i class="ty-tug-a"></i><i class="ty-mid"></i><i class="ty-knot"></i></div>
    </div>
    <div class="g-status ty-status"></div>
    <div class="ty-frame"><div class="ty-board" role="grid" aria-label="Oyun tahtası"></div></div>
    <p class="g-sub ty-info"></p>
  </div>`;
  root.querySelector('.ty-frame').addEventListener('click', onClick);
}
function onEvent(e) {
  if (e.t === 'move') {
    Sound.tick(.7);
    const d = Math.min(e.d || 1, 7);
    for (let k = 1; k <= d; k++) setTimeout(() => Sound.tick(.2 + k * .1), 80 + k * 90);
    if (e.corner) setTimeout(() => { Sound.special(); banner('KÖŞE!', 'good'); }, 200);
    else if (e.k >= 6) setTimeout(() => { Sound.buy(); banner(`${e.k} DİSK DÖNDÜ!`, 'pink'); }, 200);
  } else if (e.t === 'pass') {
    setTimeout(() => { Sound.bad(); banner('HAMLE YOK, PAS!', 'pink'); }, 450);
  } else if (e.t === 'win') {
    const mine = typeof ui.me === 'number' ? ui.me === e.pi : !(V && V.players[e.pi] && V.players[e.pi].isBot);
    setTimeout(() => {
      if (mine) { Sound.solve(); FX.confetti(90); flash('good'); } else { Sound.bad(); flash('bad'); }
      banner(V && V.players[e.pi] ? `${V.players[e.pi].name.toLocaleUpperCase('tr-TR')} KAZANDI!` : 'OYUN BİTTİ', mine ? 'good' : 'bad');
    }, 700);
  } else if (e.t === 'draw') setTimeout(() => { Sound.stop(); banner('BERABERE', 'pink'); }, 700);
}

CFX.registerGame({
  id: 'tersyuz', name: 'Ters Yüz', icon: '🌗', color: '#19e3d0', min: 2, max: 2, hotseat: true, bot: true, localMin: 1,
  tagline: 'Rakibin disklerini sıkıştır, kendi rengine çevir',
  rules: 'Diskini, rakibin disklerini düz bir çizgide (yatay, dikey ya da çapraz) kendi iki diskinin arasına alacak bir kareye koy; arada kalanlar senin rengine döner. Hamlesi olmayan pas geçer. Kimse oynayamayınca en çok diski olan kazanır.',
  options: [
    { key: 'level', label: 'Bilgisayar zorluğu', def: 'orta', choices: [{ v: 'kolay', label: 'Kolay' }, { v: 'orta', label: 'Orta' }, { v: 'zor', label: 'Zor' }] },
    { key: 'hints', label: 'Hamle ipuçları', def: '1', choices: [{ v: '1', label: 'Açık' }, { v: '0', label: 'Kapalı' }] },
    { key: 'board', label: 'Tahta', def: '8', choices: [{ v: '8', label: '8×8' }, { v: '6', label: '6×6 (hızlı)' }] }
  ],
  setup(players, opts) {
    opts = opts || {};
    const n = String(opts.board) === '6' || String(opts.fast) === '1' ? 6 : 8;
    const st = {
      players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })),
      online: players.map(() => true),
      level: LEVELS[opts.level] ? opts.level : 'orta',
      hints: String(opts.hints == null ? '1' : opts.hints) !== '0',
      n, board: initialBoard(n), cur: 0, phase: 'play', ply: 0, last: null, pass: null, winner: null
    };
    st.moves = legalMoves(st.board, n, 0);
    return st;
  },
  action(st, pi, a, ctx) {
    if (a && a.t === 'place') place(st, pi, a.i, ctx);
  },
  view(st) {
    return {
      n: st.n, board: st.board.slice(), cur: st.cur, phase: st.phase, ply: st.ply, last: st.last, pass: st.pass,
      winner: st.winner, hints: st.hints, level: st.level, counts: counts(st.board),
      moves: st.phase === 'play' ? st.moves.slice() : [],
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, online: st.online[i] !== false }))
    };
  },
  turnOf(st) { return st.phase === 'play' ? st.cur : null; },
  onPresence(st, pi, online) { st.online[pi] = online; },
  resume(st, ctx) { if (st.phase === 'done') ctx.later(500, () => endGame(st, ctx)); },
  botDelay: 750,
  botAct(st, pi, ctx) {
    if (st.phase !== 'play' || st.cur !== pi) return;
    let m = -1;
    try { m = bestMove(st.board, st.n, pi, st.level); } catch (e) { console.error(e); }
    if (!place(st, pi, m, ctx)) {
      const ms = legalMoves(st.board, st.n, pi);
      if (ms.length) place(st, pi, ms[Math.floor(Math.random() * ms.length)], ctx);
    }
  },
  skipTurn(st, pi, ctx) {
    if (st.phase !== 'play' || st.cur !== pi) return;
    const ms = legalMoves(st.board, st.n, pi);
    if (ms.length) place(st, pi, ms[Math.floor(Math.random() * ms.length)], ctx);
  },
  mount, render, onEvent,
  unmount() { if (tween) cancelAnimationFrame(tween); tween = null; root = null; ui = null; V = null; builtN = 0; }
});

// Birim testleri için kurallar
CFX.__tersyuz = { flipsFor, legalMoves, countMoves, counts, initialBoard, bestMove, evaluate, LEVELS };
})();
