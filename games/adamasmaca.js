/* =========================================================================
   OYUN SALONU — ADAM ASMACA YARIŞI
   Ortak bulmaca havuzundan gizli bir cevap: sırayla harf tahmin et, doğru
   harf puan getirir ve sıra sende kalır; yanlış harf darağacına bir çizgi
   ekler. Cevabı bilen tahmin eder. 1–4 kişi: online ya da aynı cihazda.
   Cevap tur bitene kadar yalnızca yöneten cihazda durur; görüntüde
   sadece açılmış harfler bulunur.
   ========================================================================= */
(() => {
'use strict';
const { ALPHABET, isLetter, lettersOnly, clamp, pick, fmt, esc, initial, Pool, History, Sound, FX, banner, flash } = CFX;

const STEPS = 8, LETTER_PTS = 10, SOLVE_BASE = 50, SOLVE_PER = 5, WRONG_SOLVE = -20, HINT_COST = 15, MAX_LEN = 22, MIN_LEN = 4, ROUND_END_MS = 3400;
const AL = new Set(ALPHABET);
// Türkçe karakter hoşgörülü karşılaştırma: Ç/C, Ğ/G, I/İ, Ö/O, Ş/S, Ü/U aynı sayılır
const FOLD = { 'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U' };
const fold = s => [...lettersOnly(s)].map(c => FOLD[c] || c).join('');
const trUp = s => String(s).toLocaleUpperCase('tr-TR');
const M = { used: new Set() };                 // seans boyunca kullanılan bulmacalar (yöneten cihaz)

/* ---------- bulmaca seçimi (yöneten cihaz) ---------- */
function eligible(p) { return p.len >= MIN_LEN && p.len <= MAX_LEN && [...p.key].every(c => AL.has(c)); }
function choosePuzzle(st) {
  const all = Pool.list.filter(eligible);
  if (!all.length) return null;
  let c = all.filter(p => !st.used.includes(p.key) && !M.used.has(p.key));
  if (!c.length) c = all.filter(p => !st.used.includes(p.key));
  if (!c.length) c = all.slice();
  const narrow = f => { const x = c.filter(f); if (x.length) c = x; };
  narrow(p => !!p.hints.sub);
  narrow(p => p.cat !== st.lastCat);
  // Önce hiç görülmemişler; hepsi görülmüşse en uzun süredir görülmeyenler
  const fresh = c.filter(p => !History.last(p));
  if (fresh.length) c = fresh;
  else { c = c.slice().sort((x, y) => History.last(x) - History.last(y)); c = c.slice(0, Math.max(10, Math.ceil(c.length * .15))); }
  const prog = st.rounds > 1 ? (st.round - 1) / (st.rounds - 1) : 0;
  const target = clamp(Math.round(1 + prog * 2.4), 1, 4);
  for (const t of [p => p.d === target, p => Math.abs(p.d - target) === 1, () => true]) { const x = c.filter(t); if (x.length) return pick(x); }
  return pick(c);
}

/* ---------- kurallar (yöneten cihaz) ---------- */
const hiddenCount = st => [...st.puzzle.key].filter(c => !st.hits.includes(c)).length;
const allOpen = st => hiddenCount(st) === 0;
const nameOf = (st, pi) => st.players[pi] ? st.players[pi].name : '?';

function startRound(st, ctx) {
  const p = choosePuzzle(st);
  if (!p) { st.phase = 'done'; return; }
  st.used.push(p.key); M.used.add(p.key); st.lastCat = p.cat;
  try { History.mark(p); } catch { /* depolama kapalı olabilir */ }
  st.puzzle = { key: p.key, a: p.a, cat: p.cat, d: p.d, sub: p.hints.sub || '' };
  st.hits = []; st.misses = []; st.steps = 0; st.hint = null; st.res = null; st.last = null;
  st.gains = st.players.map(() => 0); st.earned = st.players.map(() => 0);
  st.starter = (st.round - 1) % st.players.length;
  st.cur = st.starter; st.phase = 'play';
  if (ctx) ctx.emit({ t: 'round', round: st.round, last: st.round === st.rounds }, `${st.round}. tur · Kategori: ${p.cat} · ${p.len} harf. İlk tahmin ${nameOf(st, st.cur)}.`, 'gold');
}
function passTurn(st) { if (st.players.length > 1) st.cur = (st.cur + 1) % st.players.length; }
// gains: turdaki net değişim; earned: yalnızca kazanılan puanlar (adam asılınca bunlar silinir, cezalar kalır)
function addScore(st, pi, n) { st.scores[pi] += n; st.gains[pi] += n; if (n > 0) st.earned[pi] += n; }

function endRound(st, ctx, winner, how) {
  st.phase = 'roundEnd';
  st.res = { winner, how, answer: st.puzzle.a, cat: st.puzzle.cat, gains: st.gains.slice() };
  if (winner != null) st.solves[winner]++;
  ctx.sync();
  ctx.later(ROUND_END_MS, () => advance(st, ctx));
}
function advance(st, ctx) {
  if (st.phase !== 'roundEnd') return;
  if (st.round >= st.rounds) { finish(st, ctx); return; }
  st.round++;
  startRound(st, ctx);
  ctx.sync();
}
function finish(st, ctx) {
  st.phase = 'done'; ctx.sync();
  const order = st.players.map((_, i) => i).sort((a, b) => st.scores[b] - st.scores[a] || st.solves[b] - st.solves[a] || a - b);
  const solved = st.solves.reduce((s, x) => s + x, 0);
  const solo = st.players.length === 1;
  const top = order[0];
  const tie = !solo && order.length > 1 && st.scores[order[1]] === st.scores[top] && st.solves[order[1]] === st.solves[top];
  ctx.end({
    title: solo ? `${fmt(st.scores[top])} puan topladın!` : tie ? 'Berabere bitti!' : `${st.players[top].name} kazandı!`,
    ranking: order.map(i => ({ pi: i, score: st.scores[i], label: `${fmt(st.scores[i])} puan` })),
    note: `${st.rounds} turda ${solved} bulmaca çözüldü, ${st.rounds - solved} kez adam asıldı.`
  });
}

function guessLetter(st, pi, l, ctx) {
  l = trUp(String(l || '')).trim();
  if (l.length !== 1 || !AL.has(l) || st.hits.includes(l) || st.misses.includes(l)) return;
  const n = [...st.puzzle.key].filter(c => c === l).length;
  const name = nameOf(st, pi);
  if (n > 0) {
    st.hits.push(l);
    addScore(st, pi, n * LETTER_PTS);
    st.last = { k: 'hit', pi, l, n, gain: n * LETTER_PTS };
    if (allOpen(st)) {
      addScore(st, pi, SOLVE_BASE);
      st.last.gain += SOLVE_BASE;
      ctx.emit({ t: 'solve', pi, gain: n * LETTER_PTS + SOLVE_BASE, byLetter: true }, `${name} son harfi (${l}) açtı ve bulmacayı tamamladı! +${n * LETTER_PTS + SOLVE_BASE} puan`, 'good');
      endRound(st, ctx, pi, 'letter');
      return;
    }
    ctx.emit({ t: 'hit', pi, l, n }, `${name}: ${l} harfi ${n} kez var. +${n * LETTER_PTS} puan`, 'good');
  } else {
    st.misses.push(l);
    st.steps = Math.min(STEPS, st.steps + 1);
    st.last = { k: 'miss', pi, l };
    ctx.emit({ t: 'miss', pi, l, steps: st.steps }, `${name}: ${l} harfi yok. Darağacına bir çizgi eklendi (${st.steps}/${STEPS}).`, 'bad');
    if (st.steps >= STEPS) { hanged(st, ctx); return; }
    passTurn(st);
  }
  ctx.sync();
}
function hanged(st, ctx) {
  st.last = Object.assign({}, st.last, { hanged: true });
  ctx.emit({ t: 'hanged' }, `Adam asıldı! Bu turda kimse puan alamadı. Cevap: ${st.puzzle.a}`, 'bad');
  // Asılan turda kimse puan almaz: o turda harflerle kazanılan puanlar silinir (cezalar ve ipucu bedeli kalır)
  st.earned.forEach((g, i) => { st.scores[i] -= g; st.gains[i] -= g; });
  st.earned = st.players.map(() => 0);
  endRound(st, ctx, null, 'hanged');
}
function guessAnswer(st, pi, text, ctx) {
  text = String(text || '').slice(0, 80);
  const g = fold(text);
  if (!g) return;
  const name = nameOf(st, pi);
  if (g === fold(st.puzzle.key)) {
    const left = hiddenCount(st);
    const gain = SOLVE_BASE + SOLVE_PER * left;
    addScore(st, pi, gain);
    st.hits = [...new Set(st.puzzle.key)];
    st.last = { k: 'solve', pi, gain, left };
    ctx.emit({ t: 'solve', pi, gain, left }, `${name} cevabı bildi: ${st.puzzle.a}! +${gain} puan${left ? ` (${left} kapalı harf)` : ''}`, 'good');
    endRound(st, ctx, pi, 'solve');
    return;
  }
  addScore(st, pi, WRONG_SOLVE);
  st.steps = Math.min(STEPS, st.steps + 2);
  const shown = trUp(text.replace(/\s+/g, ' ').trim()).slice(0, 40);
  st.last = { k: 'wrong', pi, text: shown };
  ctx.emit({ t: 'wrongSolve', pi, steps: st.steps }, `${name} "${shown}" dedi, yanlış! ${WRONG_SOLVE} puan ve iki çizgi (${st.steps}/${STEPS}).`, 'bad');
  if (st.steps >= STEPS) { hanged(st, ctx); return; }
  passTurn(st);
  ctx.sync();
}
function buyHint(st, pi, ctx) {
  if (st.hint || !st.puzzle.sub || st.scores[pi] < HINT_COST) return;
  addScore(st, pi, -HINT_COST);
  st.hint = { pi, text: st.puzzle.sub };
  st.last = { k: 'hint', pi };
  ctx.emit({ t: 'hint', pi }, `${nameOf(st, pi)} ${HINT_COST} puan verip ipucu aldı: "${st.puzzle.sub}"`, 'gold');
  ctx.sync();
}

/* ---------- arayüz (her cihaz) ---------- */
const KB_ORDER = ALPHABET;
let root = null, ui = null, V = null, prevBoard = '', boardKey = '', solveOpen = false, pending = null, ro = null, lastW = 0;
const q = s => root && root.querySelector(s);

function canAct(v) {
  if (!v || v.phase !== 'play' || !ui) return false;
  return ui.mode === 'local' ? true : ui.me === v.cur;
}
function actorPi(v) { return ui.mode === 'local' ? v.cur : ui.me; }

const GALLOWS_SVG = `<svg class="aa-svg" viewBox="0 0 200 220" aria-hidden="true">
  <defs><filter id="aaGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="aaChalk" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <g class="aa-chalk" filter="url(#aaChalk)">
    <path class="aa-part" data-s="1" pathLength="1" d="M18 206 H132"/>
    <path class="aa-part" data-s="2" pathLength="1" d="M48 206 V20"/>
    <path class="aa-part" data-s="3" pathLength="1" d="M42 20 H146 M48 58 L86 20"/>
    <path class="aa-part" data-s="4" pathLength="1" d="M140 20 V46"/>
  </g>
  <g class="aa-man" filter="url(#aaGlow)">
    <path class="aa-part" data-s="5" pathLength="1" d="M140 46 a18 18 0 1 1 -0.01 0"/>
    <path class="aa-part" data-s="6" pathLength="1" d="M140 82 V140"/>
    <path class="aa-part" data-s="7" pathLength="1" d="M140 96 L114 124 M140 96 L166 124"/>
    <path class="aa-part" data-s="8" pathLength="1" d="M140 140 L118 182 M140 140 L162 182"/>
    <g class="aa-face">
      <g class="aa-eyes"><circle cx="133" cy="61" r="2.4"/><circle cx="147" cy="61" r="2.4"/></g>
      <g class="aa-xeyes"><path d="M129 57 l7 7 M136 57 l-7 7 M144 57 l7 7 M151 57 l-7 7"/></g>
      <path class="aa-mouth" d="M133 71 Q140 76 147 71"/>
    </g>
  </g>
</svg>`;

function mount(r, api) {
  root = r; ui = api; V = null; prevBoard = ''; boardKey = ''; solveOpen = false; pending = null; lastW = 0;
  root.innerHTML = `<div class="g-wrap aa">
    <div class="aa-players"></div>
    <div class="g-status aa-status"></div>
    <section class="aa-stage">
      <div class="aa-gallows"><div class="aa-chalkboard">${GALLOWS_SVG}</div><div class="aa-lives" aria-label="Kalan hak"></div></div>
      <div class="aa-info">
        <div class="aa-cat"><small>Kategori</small><b class="aa-catname"></b></div>
        <div class="aa-meta"><span class="aa-round"></span><span class="aa-len"></span></div>
      </div>
      <div class="aa-board" aria-live="polite"></div>
      <p class="aa-hint" hidden></p>
      <p class="aa-last" aria-live="polite"></p>
    </section>
    <div class="aa-controls">
      <div class="aa-kb">${KB_ORDER.map(l => `<button type="button" class="aa-key" data-l="${l}" aria-label="${l} harfi">${l}</button>`).join('')}
        <button type="button" class="btn btn-solve aa-act aa-solvebtn" data-act="solve">🎯 Cevabı tahmin et</button>
        <button type="button" class="btn btn-vowel aa-act aa-hintbtn" data-act="hint">💡 İpucu al <small>15 puan</small></button>
      </div>
      <form class="aa-solve" hidden autocomplete="off">
        <label class="aa-solve-l" for="aaSolveIn">Cevabın tamamını yaz</label>
        <input id="aaSolveIn" class="aa-solve-in" lang="tr" maxlength="60" autocapitalize="characters" autocomplete="off" spellcheck="false" enterkeyhint="send" placeholder="CEVAP">
        <p class="aa-solve-warn">Doğruysa +50 ve kapalı harf başına +5 · yanlışsa −20 puan ve iki çizgi</p>
        <div class="aa-solve-btns">
          <button type="button" class="btn btn-ghost" data-act="cancel">Vazgeç</button>
          <button type="submit" class="btn btn-solve">✔ Tahmin et</button>
        </div>
      </form>
      <div class="aa-end" hidden></div>
    </div>
    <p class="g-sub aa-rule">Doğru harf: harf başına 10 puan, sıra sende kalır · Yanlış harf: bir çizgi, sıra geçer · 8 çizgide adam asılır</p>
  </div>`;
  root.addEventListener('click', onClick);
  q('.aa-solve').addEventListener('submit', onSubmit);
  document.addEventListener('keydown', onKey);
  if (window.ResizeObserver) { ro = new ResizeObserver(() => { const w = q('.aa-board') ? q('.aa-board').clientWidth : 0; if (V && w && Math.abs(w - lastW) > 2) renderBoard(V, true); }); ro.observe(q('.aa-board')); }
}

function send(a) { Sound.init(); ui.send(a); }
function onClick(e) {
  if (!V) return;
  const k = e.target.closest('.aa-key');
  if (k) { if (!k.disabled) tryLetter(k.dataset.l); return; }
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const act = b.dataset.act;
  if (act === 'solve') { if (canAct(V)) openSolve(); }
  else if (act === 'cancel') closeSolve();
  else if (act === 'hint') { if (canAct(V)) { b.disabled = true; send({ t: 'hint', as: V.cur }); } }
}
function tryLetter(l) {
  if (!canAct(V) || solveOpen || pending === l) return;
  if (V.hits.includes(l) || V.misses.includes(l)) return;
  pending = l;
  const k = q(`.aa-key[data-l="${l}"]`); if (k) { k.disabled = true; k.classList.add('wait'); }
  send({ t: 'letter', l, as: V.cur });
}
function openSolve() {
  solveOpen = true;
  q('.aa-kb').hidden = true; q('.aa-solve').hidden = false;
  const inp = q('.aa-solve-in'); inp.value = ''; setTimeout(() => { try { inp.focus(); } catch { /* */ } }, 30);
}
function closeSolve() {
  solveOpen = false;
  if (!root) return;
  q('.aa-kb').hidden = !q('.aa-end').hidden; q('.aa-solve').hidden = true;
  const inp = q('.aa-solve-in'); if (document.activeElement === inp) inp.blur();
}
function onSubmit(e) {
  e.preventDefault();
  const t = q('.aa-solve-in').value;
  if (!lettersOnly(t)) { q('.aa-solve-in').focus(); return; }
  if (!canAct(V)) { closeSolve(); return; }
  const as = V.cur;
  closeSolve();
  send({ t: 'solve', text: t, as });
}
function onKey(e) {
  if (!root || !V || e.ctrlKey || e.metaKey || e.altKey) return;
  const gs = document.getElementById('gameScreen');
  if (gs && gs.hidden) return;
  if (['results', 'settings', 'confirm', 'menu'].some(id => { const el = document.getElementById(id); return el && !el.hidden; })) return;
  if (solveOpen) { if (e.key === 'Escape') { e.preventDefault(); closeSolve(); } return; }
  if (e.target && e.target.closest && e.target.closest('input,textarea,select')) return;
  if (e.key === 'Enter' && canAct(V)) { e.preventDefault(); openSolve(); return; }
  if (e.key && e.key.length === 1) {
    const l = trUp(e.key);
    if (AL.has(l)) { e.preventDefault(); tryLetter(l); }
  }
}

/* --- pano yerleşimi: kelimeler bölünmeden satırlara, karo boyu genişliğe göre --- */
function wordsOfBoard(b) {
  const out = []; let start = 0;
  b.split(' ').forEach(w => { if (w.length) out.push({ w, start }); start += w.length + 1; });
  return out;
}
function pack(words, cols) {
  const rows = []; let row = [], len = 0;
  for (const x of words) {
    const need = (row.length ? 1 : 0) + x.w.length;
    if (row.length && len + need > cols) { rows.push(row); row = []; len = 0; }
    len += (row.length ? 1 : 0) + x.w.length; row.push(x);
  }
  if (row.length) rows.push(row);
  return rows;
}
function layout(b, W) {
  const words = wordsOfBoard(b), longest = Math.max(...words.map(x => x.w.length));
  const gapOf = s => (s >= 34 ? 6 : s >= 26 ? 5 : 4);
  if (W >= 500) {
    // geniş ekran: pano yüksekliğine sığan en büyük karo
    for (let s = 62; s >= 30; s -= 2) {
      const gap = gapOf(s), cols = Math.floor((W + gap) / (s + gap));
      if (longest > cols) continue;
      const rows = pack(words, cols);
      if (rows.length * s * 1.22 + (rows.length - 1) * gap <= 236) return { s, gap, rows };
    }
  }
  for (const maxRows of [1, 2, 3, 4]) {
    for (let s = W < 500 ? 48 : 60; s >= (maxRows === 1 ? 34 : maxRows === 2 ? 28 : 22); s -= 2) {
      const gap = gapOf(s), cols = Math.floor((W + gap) / (s + gap));
      if (longest > cols) continue;
      const rows = pack(words, cols);
      if (rows.length <= maxRows) return { s, gap, rows };
    }
  }
  for (let s = 22; s >= 14; s--) { const gap = 3, cols = Math.floor((W + gap) / (s + gap)); if (longest <= cols) return { s, gap, rows: pack(words, cols) }; }
  return { s: 14, gap: 3, rows: pack(words, longest) };
}
function renderBoard(v, force) {
  const el = q('.aa-board'); if (!el) return;
  const b = v.board, W = el.clientWidth - 4;
  lastW = el.clientWidth;
  const key = `${v.round}|${b.length}|${Math.round(W)}`;
  const reveal = v.phase !== 'play';
  const hits = new Set(v.hits);
  if (force || key !== boardKey) {
    boardKey = key;
    const L = layout(b, Math.max(120, W));
    el.style.setProperty('--t', L.s + 'px'); el.style.setProperty('--tg', L.gap + 'px');
    el.innerHTML = L.rows.map(r => `<div class="aa-row">${r.map((x, wi) => (wi ? '<span class="aa-tile sp"></span>' : '') +
      [...x.w].map((ch, k) => `<span class="aa-tile ${isLetter(ch) || ch === '_' ? 'let' : 'pun'}" data-i="${x.start + k}">${ch !== '_' && !isLetter(ch) ? esc(ch) : ''}</span>`).join('')).join('')}</div>`).join('');
    prevBoard = '';
  }
  let delay = 0;
  el.querySelectorAll('.aa-tile[data-i]').forEach(t => {
    const i = +t.dataset.i, ch = b[i];
    if (!t.classList.contains('let')) return;
    const open = ch && ch !== '_';
    const was = prevBoard && prevBoard[i] && prevBoard[i] !== '_';
    t.classList.toggle('open', !!open);
    t.classList.toggle('late', !!open && reveal && !hits.has(ch));
    if (open && t.textContent !== ch) t.textContent = ch;
    if (!open && t.textContent) t.textContent = '';
    if (open && prevBoard && !was) { t.style.animationDelay = `${delay}ms`; delay += 70; t.classList.remove('flip'); void t.offsetWidth; t.classList.add('flip'); }
  });
  prevBoard = b;
}
function renderGallows(v) {
  const steps = v.steps, g = q('.aa-gallows');
  g.querySelectorAll('.aa-part').forEach(p => p.classList.toggle('on', +p.dataset.s <= steps));
  g.classList.toggle('face', steps >= 5);
  g.classList.toggle('dead', !!(v.res && v.res.how === 'hanged'));
  g.classList.toggle('saved', !!(v.res && v.res.how !== 'hanged' && v.phase !== 'play'));
  g.classList.toggle('danger', v.phase === 'play' && steps >= STEPS - 2);
  q('.aa-lives').innerHTML = Array.from({ length: STEPS }, (_, i) => `<i class="${i < steps ? 'x' : ''}"></i>`).join('') + `<span>${STEPS - steps > 0 ? `${STEPS - steps} hak` : 'Hak kalmadı'}</span>`;
}
function renderPlayers(v) {
  const me = ui.me, n = v.players.length;
  const el = q('.aa-players');
  el.style.setProperty('--n', n); el.className = `aa-players n${n}`;
  el.innerHTML = v.players.map((p, i) => {
    const active = v.phase === 'play' && i === v.cur && n > 1;
    const g = v.res && v.phase !== 'play' ? v.res.gains[i] : 0;
    return `<div class="aa-chip ${active ? 'active' : ''} ${p.online === false ? 'off' : ''}" style="--pc:${p.color}">
      <span class="av" style="--pc:${p.color}">${initial(p.name)}</span>
      <span class="aa-chip-t"><b>${esc(p.name)}</b><span class="aa-score">${fmt(v.scores[i])}${g ? `<em class="${g > 0 ? 'up' : 'dn'}">${g > 0 ? '+' : ''}${g}</em>` : ''}${me === i && ui.mode === 'online' ? '<small class="aa-me">sen</small>' : ''}</span></span>
    </div>`;
  }).join('');
}
function statusHTML(v) {
  const p = v.players, cur = p[v.cur];
  if (v.phase === 'play') {
    if (p.length === 1) return '<span class="g-turn mine">⭐ Harf seç ya da cevabı tahmin et</span>';
    if (ui.mode === 'local') return `<span class="g-turn mine">⭐ ${esc(cur.name)}, sıra sende</span>`;
    if (ui.me === v.cur) return '<span class="g-turn mine">⭐ Sıra sende · harf seç</span>';
    return `<span class="g-turn">Sıra: <b style="color:${cur.color}">${esc(cur.name)}</b>${cur.online === false ? ' (bağlantı yok)' : ''}</span>`;
  }
  if (v.phase === 'roundEnd' && v.res) {
    if (v.res.how === 'hanged') return '<span class="g-turn aa-lose">💀 Adam asıldı!</span>';
    return `<span class="g-turn win">🎉 ${esc(p[v.res.winner].name)} bildi!</span>`;
  }
  return '<span class="g-turn">Oyun bitti</span>';
}
function lastHTML(v) {
  const l = v.last; if (!l || v.phase !== 'play') return '';
  const n = l.pi != null && v.players[l.pi] ? `<b style="color:${v.players[l.pi].color}">${esc(v.players[l.pi].name)}</b>` : '';
  if (l.k === 'hit') return `${n}: <span class="aa-lt ok">${esc(l.l)}</span> ${l.n} kez var · <span class="aa-plus">+${l.gain}</span>`;
  if (l.k === 'miss') return `${n}: <span class="aa-lt no">${esc(l.l)}</span> yok · bir çizgi`;
  if (l.k === 'wrong') return `${n}: "${esc(l.text)}" yanlış · <span class="aa-minus">${WRONG_SOLVE}</span> ve iki çizgi`;
  if (l.k === 'hint') return `${n} ipucu aldı · <span class="aa-minus">−${HINT_COST}</span>`;
  return '';
}
function renderEnd(v) {
  const el = q('.aa-end');
  const show = v.phase !== 'play' && v.res;
  if (!show) { el.hidden = true; el.dataset.k = ''; q('.aa-kb').hidden = solveOpen; return; }
  solveOpen = false; q('.aa-kb').hidden = true; q('.aa-solve').hidden = true;
  const k = `${v.round}:${v.phase}`;
  if (el.dataset.k === k) return;
  el.dataset.k = k;
  const r = v.res, p = v.players, hangedR = r.how === 'hanged';
  const gains = p.map((x, i) => ({ x, i, g: r.gains[i] })).filter(o => o.g);
  el.className = 'aa-end ' + (hangedR ? 'bad' : 'good');
  el.innerHTML = `<div class="aa-end-card">
    <div class="aa-end-t">${hangedR ? '💀 ASILDI!' : r.how === 'letter' ? '🧩 TAMAMLANDI!' : '🎯 BİLDİ!'}</div>
    <div class="aa-end-cat">${esc(r.cat)}</div>
    <div class="aa-end-a">${esc(r.answer)}</div>
    <div class="aa-end-who">${hangedR ? 'Bu turda kimse puan alamadı.' : `<b style="color:${p[r.winner].color}">${esc(p[r.winner].name)}</b> ${r.how === 'letter' ? 'son harfi açtı' : 'cevabı bildi'}`}</div>
    ${gains.length ? `<div class="aa-end-gains">${gains.map(o => `<span style="--pc:${o.x.color}"><i class="av" style="--pc:${o.x.color}">${initial(o.x.name)}</i>${o.g > 0 ? '+' : ''}${o.g}</span>`).join('')}</div>` : ''}
    <div class="aa-end-next">${v.phase === 'done' || v.round >= v.rounds ? 'Sonuçlar geliyor…' : `${v.round + 1}. tur başlıyor…`}</div>
    <div class="aa-end-bar"><i style="animation-duration:${ROUND_END_MS}ms"></i></div>
  </div>`;
  el.hidden = false;
}
function renderControls(v) {
  const can = canAct(v);
  const hits = new Set(v.hits), misses = new Set(v.misses);
  if (pending && (hits.has(pending) || misses.has(pending) || !can)) pending = null;
  q('.aa-kb').classList.toggle('armed', can);
  root.querySelectorAll('.aa-key').forEach(k => {
    const l = k.dataset.l, h = hits.has(l), m = misses.has(l);
    k.classList.toggle('hit', h); k.classList.toggle('miss', m);
    k.classList.toggle('wait', pending === l);
    k.disabled = !can || h || m || pending === l;
  });
  const hb = q('.aa-hintbtn'), me = can ? actorPi(v) : -1;
  hb.disabled = !can || !!v.hint || !v.hasHint || (me >= 0 && v.scores[me] < HINT_COST);
  hb.innerHTML = v.hint ? '💡 İpucu açıldı' : !v.hasHint ? '💡 İpucu yok' : `💡 İpucu al <small>${HINT_COST} puan</small>`;
  hb.title = !v.hint && v.hasHint && me >= 0 && v.scores[me] < HINT_COST ? `İpucu için en az ${HINT_COST} puan gerekir` : '';
  q('.aa-solvebtn').disabled = !can;
  if (!can && solveOpen) closeSolve();
}
function render(v) {
  if (!root) return;
  V = v;
  renderPlayers(v);
  q('.aa-status').innerHTML = statusHTML(v);
  q('.aa-catname').textContent = v.cat || '';
  q('.aa-round').textContent = `Tur ${v.round}/${v.rounds}`;
  q('.aa-len').textContent = `${v.len} harf`;
  const h = q('.aa-hint');
  if (v.hint) { h.hidden = false; h.innerHTML = `💡 <b>İpucu:</b> ${esc(v.hint.text)} <small>(${esc(v.players[v.hint.pi].name)} aldı)</small>`; } else h.hidden = true;
  q('.aa-last').innerHTML = lastHTML(v) || '&nbsp;';
  renderGallows(v);
  renderBoard(v);
  renderEnd(v);
  renderControls(v);
}

function shake(sel) { const el = q(sel); if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
function onEvent(e) {
  if (!root) return;
  const mine = ui.mode === 'online' && e.pi === ui.me;
  const nm = V && V.players[e.pi] ? trUp(V.players[e.pi].name) : '';
  switch (e.t) {
    case 'round': Sound.whoosh(); banner(e.last ? 'SON TUR!' : `${e.round}. TUR`, e.last ? 'pink' : ''); closeSolve(); break;
    case 'hit': Sound.good(); if (e.n >= 3) Sound.special(); break;
    case 'miss': Sound.bad(); shake('.aa-chalkboard'); if (e.steps >= STEPS - 2 && e.steps < STEPS) banner('DİKKAT! SON HAKLAR', 'pink'); break;
    case 'wrongSolve': Sound.bad(); flash('bad'); shake('.aa-chalkboard'); banner('YANLIŞ TAHMİN', 'bad'); break;
    case 'hint': Sound.buy(); break;
    case 'solve': {
      Sound.solve(); setTimeout(() => Sound.fanfare(), 600); FX.confetti(mine || ui.mode === 'local' ? 160 : 90); flash('good');
      banner(nm ? `${nm} BİLDİ!` : 'BİLDİ!', 'good');
      const b = q('.aa-board'); if (b) { const r = b.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, 50); }
      break;
    }
    case 'hanged': Sound.bankrupt(); flash('bad'); banner('ADAM ASILDI!', 'bad'); break;
    default: break;
  }
}

CFX.registerGame({
  id: 'adamasmaca', name: 'Adam Asmaca Yarışı', icon: '🪢', color: '#2bd96b', min: 1, max: 4, hotseat: true, bot: false, localMin: 1,
  tagline: 'Harfleri bul, adam asılmadan cevabı çöz',
  rules: 'Sıranda harf seç: doğru harf her geçişi için 10 puan getirir ve sıra sende kalır, yanlış harf darağacına çizgi ekler ve sıra geçer. Cevabı bilen tahmin eder: doğruysa 50 + kapalı harf başına 5 puan, yanlışsa −20 puan ve iki çizgi. Adam 8 çizgide asılır ve o turda kimse puan alamaz.',
  options: [{ key: 'rounds', label: 'Tur sayısı', def: '5', choices: [{ v: '3', label: '3 tur' }, { v: '5', label: '5 tur' }, { v: '7', label: '7 tur' }] }],
  setup(players, opts, ctx) {
    const n = players.length;
    const rounds = [3, 5, 7].includes(+(opts && opts.rounds)) ? +opts.rounds : 5;
    const st = {
      players: players.map(p => ({ name: p.name, color: p.color })),
      online: players.map(() => true),
      scores: Array(n).fill(0), solves: Array(n).fill(0), gains: Array(n).fill(0), earned: Array(n).fill(0),
      rounds, round: 1, starter: 0, cur: 0, phase: 'play', used: [], lastCat: null,
      puzzle: null, hits: [], misses: [], steps: 0, hint: null, res: null, last: null
    };
    startRound(st, ctx);
    return st;
  },
  action(st, pi, a, ctx) {
    if (!a || st.phase !== 'play' || pi !== st.cur || !st.puzzle) return;
    if (a.t === 'letter') guessLetter(st, pi, a.l, ctx);
    else if (a.t === 'solve') guessAnswer(st, pi, a.text, ctx);
    else if (a.t === 'hint') buyHint(st, pi, ctx);
  },
  view(st) {
    // Cevap yalnızca tur bitince görünür; oyun sırasında açılmış harfler dışında bilgi yok
    const reveal = st.phase !== 'play';
    const P = st.puzzle || { a: '', key: '', cat: '' };
    const hits = new Set(st.hits);
    const board = [...P.a].map(ch => (!isLetter(ch) ? ch : (reveal || hits.has(ch)) ? ch : '_')).join('');
    return {
      phase: st.phase, round: st.round, rounds: st.rounds, cur: st.cur,
      cat: P.cat, len: P.key.length, board, hits: st.hits.slice(), misses: st.misses.slice(), steps: st.steps,
      hasHint: !!P.sub, hint: st.hint ? { pi: st.hint.pi, text: st.hint.text } : null,
      scores: st.scores.slice(), last: st.last,
      res: reveal && st.res ? st.res : null,
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, online: st.online[i] !== false }))
    };
  },
  turnOf(st) { return st.phase === 'play' ? st.cur : null; },
  skipTurn(st, pi, ctx) {
    if (st.phase !== 'play' || st.cur !== pi || st.players.length < 2) return;
    passTurn(st);
    ctx.emit({ t: 'skip', pi }, `Sıra ${nameOf(st, st.cur)} oyuncusuna geçti.`);
    ctx.sync();
  },
  onPresence(st, pi, online) { st.online[pi] = online; },
  resume(st, ctx) { if (st.phase === 'roundEnd') ctx.later(1500, () => advance(st, ctx)); },
  mount, render, onEvent,
  unmount() {
    if (root) { root.removeEventListener('click', onClick); const f = root.querySelector('.aa-solve'); if (f) f.removeEventListener('submit', onSubmit); }
    document.removeEventListener('keydown', onKey);
    if (ro) { ro.disconnect(); ro = null; }
    root = null; ui = null; V = null; solveOpen = false; pending = null;
  }
});
})();
