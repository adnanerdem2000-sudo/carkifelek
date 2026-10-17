/* =========================================================================
   OYUN SALONU — TÜRK DAMASI
   8×8 tahta, her oyuncunun 16 taşı. Taşlar ileri ve yana birer kare gider,
   dama (kral) her yöne istediği kadar. Taş almak zorunludur ve en çok taşı
   alan hamle seçilmelidir. Rakibin taşını ya da hamlesini bitiren kazanır.
   2 kişi online, aynı cihazda ya da bilgisayara karşı.
   Tahta: board[y * 8 + x], y = 0 birinci oyuncunun (beyaz) arka sırası.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial } = CFX;
const N = 8;
const KING = [2, 4];                // 1: 1. oyuncu taşı, 2: 1. oyuncu daması, 3/4: 2. oyuncu
const TAKEN = 9;                     // arama sırasında alınmış ama henüz kaldırılmamış taş
// Alınan taşlar hamle bitince kaldırılır (tekrar atlanamaz, yol kapatır).
// Resmî kuraldaki "anında kaldırma" için true yapmak yeterli (180° dönüş yasağı zaten uygulanıyor).
const IMMEDIATE_REMOVAL = false;
const QUIET_LIMIT = 100;             // taş alınmadan 50'şer hamle (100 yarım hamle) → berabere
const FILES = 'abcdefgh';
const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];   // ters yön = d ^ 1
const WIN = 100000;
const LEVELS = { kolay: { depth: 2, ms: 250, blunder: .3 }, orta: { depth: 4, ms: 600, blunder: 0 }, zor: { depth: 6, ms: 900, blunder: 0 } };

const sq = i => FILES[i & 7] + ((i >> 3) + 1);
const ownerOf = v => (v >= 1 && v <= 4) ? (v - 1) >> 1 : -1;
const isKing = v => v === 2 || v === 4;
const lastRow = side => side === 0 ? 7 : 0;

/* ---------- kurallar: hamle üretimi (ortak) ---------- */
// Sıradaki tarafın tüm geçerli hamleleri: { p: [kareler…], c: [alınan kareler…] }
// Taş alma varsa yalnızca en çok taş alan diziler döner.
function genMoves(b, side) {
  const fwd = side === 0 ? 0 : 1;
  let best = 0, caps = [];
  const path = [], taken = [];
  const rec = (i, king, lastD) => {
    const x = i & 7, y = i >> 3; let any = false;
    for (let d = 0; d < 4; d++) {
      if (king ? (lastD >= 0 && d === (lastD ^ 1)) : (d < 2 && d !== fwd)) continue;
      const dx = DIRS[d][0], dy = DIRS[d][1];
      let cx = x + dx, cy = y + dy;
      if (king) while (cx >= 0 && cx < N && cy >= 0 && cy < N && b[cy * N + cx] === 0) { cx += dx; cy += dy; }
      if (cx < 0 || cx >= N || cy < 0 || cy >= N) continue;
      const ei = cy * N + cx, ev = b[ei];
      if (ownerOf(ev) !== 1 - side) continue;
      b[ei] = IMMEDIATE_REMOVAL ? 0 : TAKEN; taken.push(ei);
      let lx = cx + dx, ly = cy + dy;
      while (lx >= 0 && lx < N && ly >= 0 && ly < N && b[ly * N + lx] === 0) {
        const li = ly * N + lx;
        any = true; path.push(li); rec(li, king, d); path.pop();
        if (!king) break;
        lx += dx; ly += dy;
      }
      taken.pop(); b[ei] = ev;
    }
    if (!any && taken.length) {
      if (taken.length > best) { best = taken.length; caps = []; }
      if (taken.length === best) caps.push({ p: path.slice(), c: taken.slice() });
    }
  };
  for (let i = 0; i < N * N; i++) {
    const v = b[i]; if (ownerOf(v) !== side) continue;
    b[i] = 0; path.length = 0; path.push(i); rec(i, isKing(v), -1); b[i] = v;
  }
  if (best > 0) return caps;
  const out = [];
  for (let i = 0; i < N * N; i++) {
    const v = b[i]; if (ownerOf(v) !== side) continue;
    const x = i & 7, y = i >> 3, king = isKing(v);
    for (let d = 0; d < 4; d++) {
      if (!king && d < 2 && d !== fwd) continue;
      const dx = DIRS[d][0], dy = DIRS[d][1];
      let cx = x + dx, cy = y + dy;
      while (cx >= 0 && cx < N && cy >= 0 && cy < N && b[cy * N + cx] === 0) {
        out.push({ p: [i, cy * N + cx], c: [] });
        if (!king) break;
        cx += dx; cy += dy;
      }
    }
  }
  return out;
}
function applyMove(b, m) {
  const from = m.p[0], to = m.p[m.p.length - 1], v = b[from];
  const capV = m.c.map(i => b[i]);
  b[from] = 0; for (const i of m.c) b[i] = 0;
  const nv = (!isKing(v) && (to >> 3) === lastRow(ownerOf(v))) ? v + 1 : v;   // terfi hamle sonunda
  b[to] = nv;
  return { v, capV, promoted: nv !== v };
}
function undoMove(b, m, u) {
  b[m.p[m.p.length - 1]] = 0; b[m.p[0]] = u.v;
  m.c.forEach((i, k) => { b[i] = u.capV[k]; });
}
function counts(b) {
  const c = [{ men: 0, kings: 0, total: 0 }, { men: 0, kings: 0, total: 0 }];
  for (const v of b) { const o = ownerOf(v); if (o < 0) continue; c[o].total++; if (isKing(v)) c[o].kings++; else c[o].men++; }
  return c;
}
function initialBoard() {
  const b = new Array(N * N).fill(0);
  for (let x = 0; x < N; x++) { b[1 * N + x] = 1; b[2 * N + x] = 1; b[5 * N + x] = 3; b[6 * N + x] = 3; }
  return b;
}
const notation = m => m.p.map(sq).join(m.c.length ? '×' : '–');

/* ---------- bilgisayar: alfa-beta arama ---------- */
function evaluate(b, side) {
  const mat = [0, 0], kings = [[], []], all = [[], []];
  for (let i = 0; i < N * N; i++) {
    const v = b[i]; const o = ownerOf(v); if (o < 0) continue;
    const x = i & 7, y = i >> 3;
    let val;
    if (isKing(v)) { val = 300; kings[o].push(i); }
    else { const adv = o === 0 ? y - 1 : 6 - y; val = 100 + adv * 6 + (adv >= 5 ? 14 : 0) + (x >= 2 && x <= 5 ? 2 : 0); }
    all[o].push(i); mat[o] += val;
  }
  let s = mat[side] - mat[1 - side];
  // Önde olan taraf damalarıyla rakibe yaklaşsın (oyun sonunu bitirmek için)
  const chase = (who, sign) => {
    for (const k of kings[who]) {
      let md = 99;
      for (const e of all[1 - who]) md = Math.min(md, Math.abs((k & 7) - (e & 7)) + Math.abs((k >> 3) - (e >> 3)));
      if (md < 99) s -= sign * md * 2;
    }
  };
  if (s > 150) chase(side, 1); else if (s < -150) chase(1 - side, -1);
  return s;
}
function search(b, side, depth, alpha, beta, ply, S) {
  if ((++S.nodes & 255) === 0 && Date.now() > S.deadline) S.abort = true;
  if (S.abort) return 0;
  const moves = genMoves(b, side);
  if (!moves.length) return -WIN + ply;
  if (depth <= 0 && (moves[0].c.length === 0 || ply >= S.maxPly)) return evaluate(b, side) + (S.noise ? (Math.random() - .5) * S.noise : 0);
  // terfi hamleleri önce
  if (moves[0].c.length === 0) moves.sort((a, c) => promoScore(b, c) - promoScore(b, a));
  let best = -Infinity;
  for (const m of moves) {
    const u = applyMove(b, m);
    const v = -search(b, 1 - side, depth - 1, -beta, -alpha, ply + 1, S);
    undoMove(b, m, u);
    if (S.abort) return 0;
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}
function promoScore(b, m) { const v = b[m.p[0]]; return !isKing(v) && (m.p[m.p.length - 1] >> 3) === lastRow(ownerOf(v)) ? 1 : 0; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const posKey = (b, side) => b.join('') + side;
// hist: taş alınmadan beri görülen konumlar (tekrara düşmemek için), quiet: taş alınmadan geçen yarım hamle
function bestMove(board, side, level, hist, quiet) {
  const b = board.slice();
  const seen = new Set(hist || []);
  const fwdDir = side === 0 ? 8 : -8;
  // Kök hamle ayarı: tekrar eden konumlardan kaçın, uzun sessiz dönemde ileri git
  const rootAdj = m => {
    let a = 0;
    if (seen.has(posKey(b, 1 - side))) a -= 30;
    const v = b[m.p[m.p.length - 1]];
    if (!m.c.length && !isKing(v) && m.p[1] - m.p[0] === fwdDir) a += Math.min(quiet || 0, 60) * .4 + 2;
    return a;
  };
  const moves = shuffle(genMoves(b, side));
  if (moves.length <= 1) return moves[0] || null;
  const cfg = LEVELS[level] || LEVELS.orta;
  if (cfg.blunder && Math.random() < cfg.blunder) return moves[0];
  const S = { nodes: 0, deadline: Date.now() + cfg.ms, abort: false, maxPly: 0, noise: level === 'kolay' ? 40 : 0 };
  let bestM = moves[0];
  for (let d = 1; d <= cfg.depth; d++) {
    S.maxPly = d + 8;
    let alpha = -Infinity, cur = null;
    for (const m of moves) {
      const u = applyMove(b, m);
      const adj = rootAdj(m);
      const v = -search(b, 1 - side, d - 1, -Infinity, -(alpha - adj), 1, S) + adj;
      undoMove(b, m, u);
      if (S.abort) break;
      m.s = v;
      if (v > alpha) { alpha = v; cur = m; }
    }
    if (S.abort) break;
    if (cur) bestM = cur;
    moves.sort((a, c) => (c === bestM) - (a === bestM) || c.s - a.s);
    if (alpha > WIN / 2 || alpha < -WIN / 2) break;
  }
  return bestM;
}

/* ---------- oyun akışı (yöneten cihaz) ---------- */
function finish(st, ctx, winner, reason) {
  st.phase = 'over'; st.winner = winner; st.reason = reason; st.moves = [];
  const c = counts(st.board);
  if (winner == null) {
    ctx.emit({ t: 'draw' }, `Berabere: ${reason}`, 'gold');
    ctx.sync();
    ctx.later(1800, () => ctx.end({ title: 'Berabere!', note: reason, ranking: [0, 1].map(i => ({ pi: i, score: 0, label: 'Berabere' })) }));
  } else {
    ctx.emit({ t: 'win', pi: winner }, `${st.players[winner].name} kazandı! ${reason}`, 'good');
    ctx.sync();
    ctx.later(1800, () => ctx.end({ title: `${st.players[winner].name} kazandı!`, note: reason,
      ranking: [winner, 1 - winner].map(i => ({ pi: i, score: c[i].total, label: `${i === winner ? 'Kazandı' : 'Kaybetti'} · ${c[i].total} taş` })) }));
  }
}
function doMove(st, pi, path, ctx) {
  if (st.phase !== 'play' || pi !== st.cur || !Array.isArray(path) || path.length < 2 || path.length > 20) return false;
  const idxs = path.map(p => (Array.isArray(p) && Number.isInteger(p[0]) && Number.isInteger(p[1]) && p[0] >= 0 && p[0] < N && p[1] >= 0 && p[1] < N) ? p[1] * N + p[0] : -1);
  if (idxs.some(i => i < 0)) return false;
  const m = st.moves.find(q => q.p.length === idxs.length && q.p.every((v, k) => v === idxs[k]));
  if (!m) return false;
  const u = applyMove(st.board, m);
  st.ply++; st.quiet = m.c.length ? 0 : st.quiet + 1;
  st.taken[pi] += m.c.length;
  if (m.c.length) st.hist = [];
  st.hist.push(posKey(st.board, 1 - pi)); if (st.hist.length > 100) st.hist.shift();
  st.last = { n: st.ply, pi, p: m.p.slice(), c: m.c.slice(), cv: u.capV, v: u.v, promoted: u.promoted };
  const name = st.players[pi].name;
  let log = `${name}: ${notation(m)}`;
  if (m.c.length) log += m.c.length > 1 ? ` (${m.c.length} taş aldı)` : ' (taş aldı)';
  if (u.promoted) log += ' · DAMA oldu!';
  ctx.emit({ t: 'move', pi, caps: m.c.length, promoted: u.promoted }, log, u.promoted || m.c.length > 1 ? 'gold' : '');
  st.cur = 1 - pi;
  st.moves = genMoves(st.board, st.cur);
  const c = counts(st.board);
  if (!st.moves.length) finish(st, ctx, pi, c[1 - pi].total === 0 ? 'Rakibin hiç taşı kalmadı.' : 'Rakibin oynayacak hamlesi kalmadı.');
  else if (c[0].total === 1 && c[1].total === 1 && c[0].kings === 1 && c[1].kings === 1) finish(st, ctx, null, 'İki tarafta da yalnızca birer dama kaldı.');
  else if (st.quiet >= QUIET_LIMIT) finish(st, ctx, null, '50 hamle boyunca taş alınmadı.');
  else ctx.sync();
  return true;
}

/* ---------- arayüz ---------- */
const CROWN = '<svg class="dm-crown" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18.5h18l-1.6-10-4.6 4.2L12 5l-2.8 7.7-4.6-4.2z"/><rect x="3" y="19.6" width="18" height="2.2" rx="1"/></svg>';
let root = null, ui = null, V = null, sel = null, selKey = '', shownN = null, flip = false, cellsFlip = null, moveSent = false;

const canAct = () => !!V && V.phase === 'play' && (ui.mode === 'local' ? !V.players[V.cur].isBot : ui.me === V.cur);
const disp = i => { const x = i & 7, y = i >> 3; return flip ? [7 - x, y] : [x, 7 - y]; };   // [sütun, satır (üstten)]
const fromDisp = (dc, dr) => flip ? dr * N + (7 - dc) : (7 - dr) * N + dc;
const prefixOf = (p, s) => s.every((v, k) => p[k] === v);

function buildCells() {
  const cells = root.querySelector('.dm-cells');
  let h = '';
  for (let dr = 0; dr < N; dr++) for (let dc = 0; dc < N; dc++) {
    const i = fromDisp(dc, dr), x = i & 7, y = i >> 3;
    h += `<div class="dm-cell ${(dc + dr) % 2 ? 'dm-wd' : 'dm-wl'}" data-i="${i}">${dc === 0 ? `<span class="dm-rk">${y + 1}</span>` : ''}${dr === 7 ? `<span class="dm-fl">${FILES[x]}</span>` : ''}</div>`;
  }
  cells.innerHTML = h;
  cellsFlip = flip;
}
function pieceHtml(i, v, cls, extra) {
  const [dc, dr] = disp(i), o = ownerOf(v);
  const col = V.players[o] ? V.players[o].color : '#fff';
  return `<div class="dm-pc dm-o${o}${isKing(v) ? ' dm-k' : ''}${cls ? ' ' + cls : ''}" data-i="${i}" style="--pc:${col};left:${dc * 12.5}%;top:${dr * 12.5}%"${extra || ''}><i></i>${isKing(v) ? CROWN : ''}</div>`;
}
function chipHtml(i) {
  const p = V.players[i], c = V.counts[i], me = ui.me === i;
  const active = V.phase === 'play' && V.cur === i;
  return `<div class="g-chip dm-chip ${active ? 'active' : ''} ${p.online === false ? 'off' : ''}" style="--pc:${p.color}">
    <span class="dm-mini" style="--pc:${p.color}"></span><span class="av" style="--pc:${p.color}">${initial(p.name)}</span>
    <b>${esc(p.name)}${me ? ' · sen' : ''}${p.isBot ? ' 🤖' : ''}</b>
    <span class="dm-cnt"><span class="g-num">${c.total}</span><small>taş</small>${c.kings ? `<span class="dm-kc">${CROWN}${c.kings}</span>` : ''}</span>
    ${active ? '<span class="dm-dot"></span>' : ''}</div>`;
}

function draw(animate) {
  if (!root || !V) return;
  if (cellsFlip !== flip) buildCells();
  const act = canAct();
  const moves = act ? V.moves : [];
  const selectable = new Set(moves.map(m => m.p[0]));
  const cands = sel ? moves.filter(m => prefixOf(m.p, sel)) : [];
  if (sel && !cands.length) sel = null;
  const k = sel ? sel.length : 0;
  const steps = new Set(), finals = new Set(), threats = new Set(), jumped = new Set();
  if (sel) cands.forEach(m => {
    if (m.p.length > k) { steps.add(m.p[k]); finals.add(m.p[m.p.length - 1]); }
    if (m.c[k - 1] != null) threats.add(m.c[k - 1]);
    m.c.slice(0, k - 1).forEach(c => jumped.add(c));
  });
  const L = V.last;
  const lastPath = new Set(L ? L.p : []), lastCaps = new Set(L ? L.c : []);
  root.querySelectorAll('.dm-cell').forEach(el => {
    const i = +el.dataset.i;
    el.classList.toggle('dm-lp', lastPath.has(i) && (!L || i !== L.p[L.p.length - 1]));
    el.classList.toggle('dm-lt', !!L && i === L.p[L.p.length - 1]);
    el.classList.toggle('dm-lc', lastCaps.has(i) && !jumped.has(i));
    el.classList.toggle('dm-st', steps.has(i));
    el.classList.toggle('dm-fn', finals.has(i) && !steps.has(i));
    el.classList.toggle('dm-so', !!sel && i === sel[0]);
    el.classList.toggle('dm-tap', act && (selectable.has(i) || steps.has(i) || finals.has(i)));
  });
  // taşlar
  const b = V.board.slice();
  let movingFrom = -1, movingTo = -1;
  if (sel && k > 1) { movingFrom = sel[0]; movingTo = sel[k - 1]; }
  let h = '';
  for (let i = 0; i < N * N; i++) {
    let v = b[i];
    if (i === movingFrom) continue;
    if (i === movingTo) v = b[movingFrom];
    if (!v) continue;
    let cls = '';
    if (act && selectable.has(i) && !sel) cls += ' dm-can';
    if (sel && (i === (k > 1 ? movingTo : sel[0]))) cls += ' dm-sel';
    if (threats.has(i)) cls += ' dm-thr';
    if (jumped.has(i)) cls += ' dm-gone';
    if (L && i === L.p[L.p.length - 1] && !sel) cls += ' dm-moved';
    h += pieceHtml(i, v, cls.trim());
  }
  const layer = root.querySelector('.dm-pieces');
  layer.innerHTML = h;
  if (animate && L) animateLast(layer, L);
  root.querySelector('.dm-board').classList.toggle('dm-act', act);
}
function animateLast(layer, L) {
  const to = L.p[L.p.length - 1];
  const el = layer.querySelector(`.dm-pc[data-i="${to}"]`);
  const STEP = L.c.length ? 260 : 200;
  if (el && el.animate) {
    const [fc, fr] = disp(to);
    const frames = L.p.map(i => { const [c, r] = disp(i); return { transform: `translate(${(c - fc) * 100}%, ${(r - fr) * 100}%)${L.c.length ? ' scale(1.12)' : ''}` }; });
    frames[frames.length - 1] = { transform: 'translate(0,0)' };
    el.style.zIndex = 5;
    try { el.animate(frames, { duration: STEP * (L.p.length - 1), easing: 'ease-in-out' }); } catch { /* */ }
    if (L.promoted) setTimeout(() => { if (el.isConnected) el.classList.add('dm-crowned'); }, STEP * (L.p.length - 1));
  }
  // alınan taşlar: atlandıkları anda sönerek kaybolur
  L.c.forEach((ci, k) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = pieceHtml(ci, L.cv[k], 'dm-ghost');
    const g = tmp.firstElementChild; layer.appendChild(g);
    const delay = STEP * (k + .6);
    if (g.animate) {
      const a = g.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(1.15)', offset: .3 }, { opacity: 0, transform: 'scale(.2) rotate(40deg)' }], { duration: 380, delay, easing: 'ease-in', fill: 'both' });
      a.onfinish = () => g.remove();
    } else setTimeout(() => g.remove(), delay + 380);
    setTimeout(() => {
      if (!g.isConnected) return;
      const r = g.getBoundingClientRect();
      FX.burst(r.left + r.width / 2, r.top + r.height / 2, 14, false);
    }, delay);
  });
}

function render(v) {
  V = v;
  flip = ui.me === 1;
  const key = `${v.ply}:${v.cur}:${v.phase}`;
  if (key !== selKey) { sel = null; selKey = key; moveSent = false; }
  const act = canAct();
  if (act && !sel) {
    const starts = [...new Set(v.moves.map(m => m.p[0]))];
    if (starts.length === 1) sel = [starts[0]];
  }
  const animate = !!(v.last && shownN != null && v.last.n > shownN);
  shownN = v.last ? v.last.n : 0;
  // oyuncular: üstte rakip, altta kendin
  const bottom = flip ? 1 : 0;
  root.querySelector('.dm-top').innerHTML = chipHtml(1 - bottom);
  root.querySelector('.dm-bot').innerHTML = chipHtml(bottom);
  updateStatus();
  const info = root.querySelector('.dm-info');
  const parts = [`Hamle ${v.ply}`];
  if (v.quiet >= 20 && v.phase === 'play') parts.push(`Taş alınmadan ${Math.floor(v.quiet / 2)}/50`);
  else parts.push('Taşlar ileri ve yana · dama her yöne');
  info.textContent = parts.join(' · ');
  draw(animate);
}
function updateStatus() {
  const v = V, st = root.querySelector('.dm-status'), p = v.players;
  if (v.phase === 'play') {
    if (canAct()) {
      const n = v.moves.length ? v.moves[0].c.length : 0;
      const who = ui.mode === 'local' && !p[1 - v.cur].isBot ? `${esc(p[v.cur].name)} · ` : '';
      let msg;
      if (sel && sel.length > 1) msg = 'Atlamaya devam et';
      else if (n) msg = n > 1 ? `${n} taş almak zorunlu` : 'Taş almak zorunlu';
      else msg = sel ? 'Gideceği kareye dokun' : 'Bir taşına dokun';
      st.innerHTML = `<span class="g-turn mine">⭐ ${who}Sıra sende · ${msg}</span>`;
    } else st.innerHTML = `<span class="g-turn">Sıra: <b style="color:${p[v.cur].color}">${esc(p[v.cur].name)}</b>${p[v.cur].isBot ? ' düşünüyor…' : ''}</span>`;
  } else if (v.winner != null) st.innerHTML = `<span class="g-turn win">🏆 ${esc(p[v.winner].name)} kazandı!</span>`;
  else st.innerHTML = '<span class="g-turn">🤝 Berabere</span>';
}
function sendSel() {
  if (moveSent) return;
  moveSent = true;
  ui.send({ t: 'move', path: sel.map(i => [i & 7, i >> 3]) });
}
function onTap(i) {
  if (!canAct() || moveSent) return;
  Sound.init();
  const moves = V.moves;
  if (sel) {
    const k = sel.length;
    const cands = moves.filter(m => prefixOf(m.p, sel));
    let next = null;
    if (cands.some(m => m.p[k] === i)) next = sel.concat([i]);
    else {
      // ileriki bir kareye dokunulduysa ve yol tekse oraya kadar ilerle
      const far = cands.filter(m => m.p.indexOf(i, k) >= 0);
      if (far.length) {
        const pos = far[0].p.indexOf(i, k), pre = far[0].p.slice(0, pos + 1);
        if (far.every(m => m.p.indexOf(i, k) === pos && prefixOf(m.p, pre))) next = pre;
      }
    }
    if (next) {
      sel = next;
      const left = moves.filter(m => prefixOf(m.p, sel));
      Sound.tick(.5);
      if (left.length === 1 && left[0].p.length === sel.length) { sendSel(); draw(false); updateStatus(); return; }
      draw(false); updateStatus(); return;
    }
  }
  const starts = new Set(moves.map(m => m.p[0]));
  if (starts.has(i) && !(sel && sel.length === 1 && sel[0] === i && starts.size > 1)) { sel = [i]; Sound.tick(.3); }
  else if (sel && sel.length > 1 && starts.size === 1) sel = [sel[0]];
  else sel = starts.size === 1 ? [...starts] : null;
  draw(false); updateStatus();
}
function onClick(e) {
  const c = e.target.closest('.dm-cell'); if (!c || !root.contains(c)) return;
  onTap(+c.dataset.i);
}
function mount(r, api) {
  root = r; ui = api; V = null; sel = null; selKey = ''; shownN = null; cellsFlip = null; moveSent = false;
  root.innerHTML = `<div class="g-wrap dm">
    <div class="g-status dm-status"></div>
    <div class="dm-side dm-top"></div>
    <div class="dm-frame"><div class="dm-board">
      <div class="dm-cells"></div>
      <div class="dm-pieces"></div>
    </div></div>
    <div class="dm-side dm-bot"></div>
    <p class="g-sub dm-info"></p>
  </div>`;
  root.querySelector('.dm-cells').addEventListener('click', onClick);
}
function onEvent(e) {
  if (e.t === 'move') {
    if (e.caps) { Sound.buy(); if (e.caps >= 3) banner(`${e.caps} TAŞ!`, 'pink'); }
    else Sound.tick(.6);
    if (e.promoted) { setTimeout(() => { Sound.special(); banner('DAMA!', 'good'); }, 350); }
  } else if (e.t === 'win') {
    const mine = typeof ui.me === 'number' ? ui.me === e.pi : !(V && V.players[e.pi] && V.players[e.pi].isBot);
    if (mine) { Sound.solve(); FX.confetti(90); flash('good'); } else { Sound.bad(); flash('bad'); }
    banner(V && V.players[e.pi] ? `${V.players[e.pi].name.toLocaleUpperCase('tr-TR')} KAZANDI!` : 'OYUN BİTTİ', mine ? 'good' : 'bad');
  } else if (e.t === 'draw') { Sound.stop(); banner('BERABERE', 'pink'); }
}

CFX.registerGame({
  id: 'dama', name: 'Türk Daması', icon: '👑', color: '#ff9a3c', min: 2, max: 2, hotseat: true, bot: true, localMin: 1,
  tagline: 'Taşları ileri ve yana sür, rakibin taşlarını topla',
  rules: 'Taşlar ileri ya da yana birer kare gider; bitişikteki rakip taşın üstünden atlayarak alınır. Taş almak zorunludur ve en çok taşı alan hamle oynanır. Son sıraya varan taş dama olur ve her yöne istediği kadar gider; rakibin taşını ya da hamlesini bitiren kazanır.',
  options: [{ key: 'level', label: 'Bilgisayar', def: 'orta', choices: [{ v: 'kolay', label: 'Kolay' }, { v: 'orta', label: 'Orta' }, { v: 'zor', label: 'Zor' }] }],
  setup(players, opts) {
    const st = {
      players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })),
      online: players.map(() => true),
      level: LEVELS[opts && opts.level] ? opts.level : 'orta',
      board: initialBoard(), cur: 0, phase: 'play', ply: 0, quiet: 0, taken: [0, 0],
      last: null, winner: null, reason: '', hist: []
    };
    st.moves = genMoves(st.board, st.cur);
    return st;
  },
  action(st, pi, a, ctx) {
    if (a && a.t === 'move') doMove(st, pi, a.path, ctx);
  },
  view(st) {
    return {
      board: st.board.slice(), cur: st.cur, phase: st.phase, ply: st.ply, quiet: st.quiet, taken: st.taken.slice(),
      last: st.last, winner: st.winner, reason: st.reason, counts: counts(st.board),
      moves: st.phase === 'play' ? st.moves.map(m => ({ p: m.p, c: m.c })) : [],
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, online: st.online[i] !== false }))
    };
  },
  turnOf(st) { return st.phase === 'play' ? st.cur : null; },
  onPresence(st, pi, online) { st.online[pi] = online; },
  botDelay: 700,
  botAct(st, pi, ctx) {
    if (st.phase !== 'play' || st.cur !== pi) return;
    let m = null;
    try { m = bestMove(st.board, pi, st.level, st.hist, st.quiet); } catch (e) { console.error(e); }
    if (!m || !doMove(st, pi, m.p.map(i => [i & 7, i >> 3]), ctx)) {
      const r = st.moves[Math.floor(Math.random() * st.moves.length)];
      if (r) doMove(st, pi, r.p.map(i => [i & 7, i >> 3]), ctx);
    }
  },
  skipTurn(st, pi, ctx) {
    if (st.phase !== 'play' || st.cur !== pi || !st.moves.length) return;
    const r = st.moves[Math.floor(Math.random() * st.moves.length)];
    doMove(st, pi, r.p.map(i => [i & 7, i >> 3]), ctx);
  },
  mount, render, onEvent,
  unmount() { root = null; ui = null; V = null; sel = null; }
});

// Birim testleri için kurallar
CFX.__dama = { genMoves, applyMove, undoMove, bestMove, counts, initialBoard, evaluate };
})();
