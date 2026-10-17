/* =========================================================================
   OYUN SALONU — KELİME AVI
   Herkes aynı anda, aynı gizli 5 harfli kelimeyi 6 denemede bulmaya çalışır.
   Yeşil: harf doğru yerde · Sarı: kelimede var, başka yerde · Gri: yok.
   1–4 kişi online (herkes kendi telefonundan) ya da tek cihazda tek kişilik
   alıştırma. Gizlilik: gizli kelime tur bitene kadar hiçbir görüntüde yok;
   başkalarının harfleri hiç gönderilmez, yalnızca renkleri gösterilir.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial, up } = CFX;
const LEN = 5, TRIES = 6, REVEAL_MS = 4200;
const LETTERS = new Set('ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split(''));
const KB = [['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'], ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'], ['ENTER', 'Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç', 'SİL']];

/* ---------- sözlük ---------- */
let DICT = null, ANSWERS = null;
function dict() {
  if (!DICT) {
    const W = window.WORDS5 || { answers: '', extra: '' };
    ANSWERS = String(W.answers).split(/\s+/).filter(w => [...w].length === LEN);
    DICT = new Set(ANSWERS.concat(String(W.extra).split(/\s+/).filter(w => [...w].length === LEN)));
  }
  return DICT;
}
const clean = s => [...up(String(s || ''))].filter(c => LETTERS.has(c)).join('');

/* ---------- kurallar (yöneten cihaz) ---------- */
// 2 = doğru yer, 1 = başka yerde var, 0 = yok. Tekrarlı harf kuralı: önce yeşiller,
// sonra kalan harf sayısı kadar sarı.
function scoreGuess(guess, secret) {
  const g = [...guess], s = [...secret], r = Array(LEN).fill(0), left = {};
  for (let i = 0; i < LEN; i++) { if (g[i] === s[i]) r[i] = 2; else left[s[i]] = (left[s[i]] || 0) + 1; }
  for (let i = 0; i < LEN; i++) if (r[i] !== 2 && left[g[i]] > 0) { r[i] = 1; left[g[i]]--; }
  return r;
}
const finished = b => b.solved || b.guesses.length >= TRIES;
function pickWord(st) {
  dict();
  const used = new Set(st.used);
  const pool = ANSWERS.filter(w => !used.has(w));
  const list = pool.length ? pool : ANSWERS;
  return list[Math.floor(Math.random() * list.length)];
}
function startRound(st, ctx) {
  st.word = pickWord(st); st.used.push(st.word);
  st.phase = 'play'; st.solvers = 0; st.roundId++;
  st.boards = st.players.map(() => ({ guesses: [], solved: false, pts: 0, place: 0 }));
  st.deadline = st.limit ? Date.now() + st.limit : 0;
  st.revealUntil = 0;
  ctx.emit({ t: 'round', round: st.round }, `${st.round}. tur başladı. Yeni kelime gizlendi!`, 'gold');
  armTimers(st, ctx);
  ctx.sync();
}
function armTimers(st, ctx) {
  const rid = st.roundId;
  if (st.phase === 'play' && st.deadline) {
    ctx.later(Math.max(0, st.deadline - Date.now()) + 60, () => { if (st.phase === 'play' && st.roundId === rid) endRound(st, ctx, 'time'); });
  } else if (st.phase === 'reveal') {
    ctx.later(Math.max(300, st.revealUntil - Date.now()), () => { if (st.phase === 'reveal' && st.roundId === rid) afterReveal(st, ctx); });
  }
}
// Herkes bitirdiyse (ya da kalanların bağlantısı koptuysa) tur biter. Son tahminin
// döndürme animasyonu görünsün diye kısa bir bekleme var; sonra koşul yeniden denetlenir.
function allDone(st, ctx) {
  const fin = st.boards.map(finished);
  const done = st.players.every((p, i) => fin[i] || !ctx.isOnline(i));
  const anyone = st.players.some((p, i) => fin[i] || ctx.isOnline(i));
  return done && anyone ? (fin.every(Boolean) ? 'all' : 'offline') : null;
}
function checkEnd(st, ctx) {
  if (st.phase !== 'play' || !allDone(st, ctx)) return;
  const rid = st.roundId;
  ctx.later(1700, () => { if (st.phase !== 'play' || st.roundId !== rid) return; const why = allDone(st, ctx); if (why) endRound(st, ctx, why); });
}
function endRound(st, ctx, why) {
  if (st.phase !== 'play') return;
  st.phase = 'reveal'; st.why = why;
  st.revealUntil = Date.now() + REVEAL_MS;
  st.history.push({ word: st.word, res: st.boards.map(b => ({ solved: b.solved, n: b.guesses.length, pts: b.pts })) });
  const solved = st.boards.filter(b => b.solved).length;
  const pre = why === 'time' ? 'Süre doldu! ' : '';
  ctx.emit({ t: 'reveal', why, word: st.word, solved }, `${pre}Kelime: ${st.word}${solved ? '' : ' — kimse bulamadı.'}`, solved ? 'good' : 'bad');
  armTimers(st, ctx);
  ctx.sync();
}
function afterReveal(st, ctx) {
  if (st.round >= st.rounds) {
    st.phase = 'over'; ctx.sync();
    const stats = st.players.map((p, i) => {
      const h = st.history.map(x => x.res[i]);
      return { pi: i, score: st.scores[i], solved: h.filter(r => r.solved).length, tries: h.reduce((s, r) => s + (r.solved ? r.n : TRIES + 1), 0) };
    }).sort((a, b) => b.score - a.score || b.solved - a.solved || a.tries - b.tries);
    const top = stats[0], solo = st.players.length === 1;
    const tie = !solo && stats[1] && stats[1].score === top.score && stats[1].solved === top.solved && stats[1].tries === top.tries;
    ctx.end({
      title: solo ? `${top.score} puan topladın!` : tie ? 'Berabere!' : `${st.players[top.pi].name} kazandı!`,
      ranking: stats.map(s => ({ pi: s.pi, score: s.score, label: `${s.score} puan · ${s.solved}/${st.rounds} kelime` })),
      note: 'Kelimeler: ' + st.history.map(h => h.word).join(', ')
    });
    return;
  }
  st.round++;
  startRound(st, ctx);
}
function guess(st, pi, raw, ctx) {
  if (st.phase !== 'play' || !st.boards[pi]) return;
  const b = st.boards[pi];
  if (finished(b)) return;
  const w = clean(raw);
  const reject = why => { ctx.emit({ t: 'reject', pi, why }); ctx.sync(); };
  if ([...w].length !== LEN) return reject('5 harf olmalı');
  if (!dict().has(w)) return reject('Sözlükte yok');
  if (b.guesses.some(x => x.w === w)) return reject('Bunu zaten denedin');
  const r = scoreGuess(w, st.word);
  b.guesses.push({ w, r });
  const name = st.players[pi].name, n = b.guesses.length;
  if (r.every(x => x === 2)) {
    b.solved = true; b.place = ++st.solvers;
    const bonus = b.place === 1 ? 10 : b.place === 2 ? 5 : 0;
    b.pts = 10 + (7 - n) * 5 + bonus;
    st.scores[pi] += b.pts;
    ctx.emit({ t: 'guess', pi, n, solved: true, place: b.place, pts: b.pts },
      `${name} kelimeyi ${n}. denemede buldu! +${b.pts}${bonus ? ` (${b.place === 1 ? 'ilk bulan' : 'ikinci'} +${bonus})` : ''}`, 'good');
  } else if (n >= TRIES) {
    ctx.emit({ t: 'guess', pi, n, solved: false, out: true }, `${name} 6 denemede bulamadı.`, 'bad');
  } else ctx.emit({ t: 'guess', pi, n, solved: false });
  ctx.sync();
  checkEnd(st, ctx);
}

/* ---------- arayüz (her cihaz) ---------- */
let root = null, ui = null, V = null, input = '', pending = false, pendT = null, roundSeen = -1, rowsSeen = 0, kbRows = 0, kbT = null;
let tickT = null, localDeadline = 0, localReveal = 0, lastSec = -1, msgT = null, builtFor = null, prevMini = {};
const q = s => root && root.querySelector(s);
const canType = () => !!(V && V.phase === 'play' && V.mine && !V.mine.done);
const CLS = ['x', 'y', 'g'];

function tileRow(cls, n = LEN) { let h = ''; for (let i = 0; i < n; i++) h += `<span class="ka-t" style="--d:${i}"><b></b></span>`; return `<div class="ka-row ${cls || ''}">${h}</div>`; }
function build() {
  let rows = ''; for (let r = 0; r < TRIES; r++) rows += tileRow();
  const kb = KB.map(row => `<div class="ka-krow">${row.map(k => k === 'ENTER' ? '<button type="button" class="ka-k wide ka-enter" data-k="ENTER" aria-label="Gönder">GİR</button>'
    : k === 'SİL' ? '<button type="button" class="ka-k wide ka-del" data-k="SİL" aria-label="Sil">⌫</button>'
    : `<button type="button" class="ka-k" data-k="${k}">${k}</button>`).join('')}</div>`).join('');
  root.innerHTML = `<div class="g-wrap ka">
    <div class="ka-players"></div>
    <div class="ka-main">
      <div class="ka-hud"><span class="ka-round"></span><div class="ka-timer"><i></i></div><span class="ka-clock"></span></div>
      <div class="g-status ka-status"></div>
      <div class="ka-stage">
        <div class="ka-board">${rows}</div>
        <div class="ka-msg" aria-live="polite"></div>
        <div class="ka-reveal" hidden></div>
        <div class="ka-spect" hidden></div>
      </div>
      <div class="ka-kb">${kb}</div>
      <p class="g-sub ka-rule"></p>
    </div>
  </div>`;
  builtFor = true;
}

function say(text, cls) {
  const m = q('.ka-msg'); if (!m) return;
  m.textContent = text; m.className = 'ka-msg show ' + (cls || '');
  clearTimeout(msgT); msgT = setTimeout(() => { if (m) m.className = 'ka-msg'; }, 1500);
}
function shakeRow() {
  const rows = root && root.querySelectorAll('.ka-board .ka-row'); if (!rows || !V || !V.mine) return;
  const row = rows[Math.min(V.mine.guesses.length, TRIES - 1)];
  row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake');
}

function renderPlayers(v) {
  const box = q('.ka-players');
  box.dataset.n = v.players.length;
  box.hidden = false;
  box.innerHTML = v.players.map((p, i) => {
    const b = v.boards[i], me = i === ui.me;
    let sq = '';
    for (let r = 0; r < TRIES; r++) for (let c = 0; c < LEN; c++) { const row = b.rows[r]; sq += `<i class="${row ? 's' + row[c] : ''}"></i>`; }
    const st = b.solved ? `<span class="ka-tag ok">✓ +${b.pts}</span>` : b.done ? '<span class="ka-tag no">✗</span>' : `<span class="ka-tag">${b.rows.length}/${TRIES}</span>`;
    const changed = prevMini[i] != null && prevMini[i] !== b.rows.length && v.roundId === prevMini.rid;
    return `<div class="ka-pc ${me ? 'me' : ''} ${p.online === false ? 'off' : ''} ${b.solved ? 'won' : b.done ? 'lost' : ''} ${changed ? 'bump' : ''}" style="--pc:${p.color}">
      <div class="ka-pc-h"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><b>${esc(p.name)}${me ? '<small> · sen</small>' : ''}</b></div>
      <div class="ka-pc-b"><div class="ka-mini">${sq}</div><div class="ka-pc-s"><span class="g-num">${p.score}</span>${st}</div></div>
    </div>`;
  }).join('');
  v.boards.forEach((b, i) => { prevMini[i] = b.rows.length; });
  prevMini.rid = v.roundId;
}

function renderBoard(v) {
  const rows = root.querySelectorAll('.ka-board .ka-row');
  const mine = v.mine, g = mine ? mine.guesses : [];
  rows.forEach((row, r) => {
    const tiles = row.children;
    const cur = mine && r === g.length && v.phase === 'play' && !mine.done;
    row.classList.toggle('cur', !!cur);
    row.classList.toggle('pend', !!(cur && pending));
    for (let c = 0; c < LEN; c++) {
      const t = tiles[c], b = t.firstElementChild;
      let L = '', cls = 'ka-t';
      if (r < g.length) { L = [...g[r].w][c]; cls += ' rev flip ' + CLS[g[r].r[c]]; }
      else if (cur) { L = [...input][c] || ''; if (L) cls += ' typed'; }
      if (b.textContent !== L) b.textContent = L;
      if (t.className !== cls) t.className = cls;
    }
  });
  const won = mine && mine.solved ? g.length - 1 : -1;
  rows.forEach((row, r) => row.classList.toggle('win', r === won));
}

function kbStatus(v) {
  const s = {}; if (!v.mine) return s;
  v.mine.guesses.slice(0, kbRows).forEach(gg => [...gg.w].forEach((L, i) => { s[L] = Math.max(s[L] == null ? -1 : s[L], gg.r[i]); }));
  return s;
}
function renderKb(v) {
  const s = kbStatus(v), on = canType() && !pending;
  root.querySelectorAll('.ka-k').forEach(k => {
    const L = k.dataset.k, st = s[L];
    const cls = 'ka-k' + (k.classList.contains('wide') ? ' wide' : '') + (L === 'ENTER' ? ' ka-enter' : L === 'SİL' ? ' ka-del' : '') + (st != null ? ' ' + CLS[st] : '') + (L === 'ENTER' && [...input].length === LEN && on ? ' ready' : '');
    if (k.className !== cls) k.className = cls;
    k.disabled = !canType();
  });
  q('.ka-kb').classList.toggle('off', !canType());
}

function fmtClock(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function tick() {
  if (!V || !root) return;
  const now = performance.now(), bar = q('.ka-timer i'), clock = q('.ka-clock'), hud = q('.ka-hud');
  if (V.phase === 'play' && V.limit) {
    const left = Math.max(0, localDeadline - now);
    bar.style.width = (100 * left / V.limit).toFixed(2) + '%';
    clock.textContent = '⏱ ' + fmtClock(left);
    const urgent = left < 10500;
    hud.classList.toggle('urgent', urgent);
    const sec = Math.ceil(left / 1000);
    if (urgent && sec !== lastSec && sec > 0 && canType()) Sound.tick(.25);
    lastSec = sec;
  } else if (V.phase === 'reveal') {
    const left = Math.max(0, localReveal - now);
    bar.style.width = (100 * left / REVEAL_MS).toFixed(2) + '%';
    clock.textContent = V.last ? 'Son tur' : 'Sıradaki tur';
    hud.classList.remove('urgent');
  } else {
    bar.style.width = V.phase === 'play' ? '100%' : '0%';
    clock.textContent = V.phase === 'play' ? '∞ süresiz' : '';
    hud.classList.remove('urgent');
  }
}

function renderReveal(v) {
  const box = q('.ka-reveal');
  if (v.phase !== 'reveal' && v.phase !== 'over') { box.hidden = true; box.dataset.w = ''; return; }
  if (box.dataset.w === v.word + v.roundId && !box.hidden) return;
  box.dataset.w = v.word + v.roundId; box.hidden = false;
  const tiles = [...v.word].map((L, i) => `<span class="ka-t rev flip g" style="--d:${i}"><b>${L}</b></span>`).join('');
  const res = v.players.map((p, i) => ({ p, i, b: v.boards[i] })).sort((a, b) => b.b.pts - a.b.pts);
  box.innerHTML = `<div class="ka-rv-card">
    <p class="ka-rv-cap">${v.why === 'time' ? '⏰ Süre doldu! ' : ''}Gizli kelime</p>
    <div class="ka-row ka-rv-word">${tiles}</div>
    <ul class="ka-rv-list">${res.map(x => `<li style="--pc:${x.p.color}"><span class="av" style="--pc:${x.p.color}">${initial(x.p.name)}</span><b>${esc(x.p.name)}${x.i === ui.me ? ' <small>(sen)</small>' : ''}</b><span>${x.b.solved ? `${x.b.rows.length}. denemede` : 'bulamadı'}</span><em>${x.b.pts ? '+' + x.b.pts : '0'}</em></li>`).join('')}</ul>
    <p class="ka-rv-next">${v.last ? 'Oyun bitiyor…' : 'Sıradaki tur birazdan…'}</p></div>`;
}

function renderStatus(v) {
  const st = q('.ka-status'), m = v.mine;
  if (v.phase === 'play') {
    if (!m) st.innerHTML = '<span class="g-turn">👀 İzliyorsun · oyuncular kelimeyi arıyor</span>';
    else if (m.solved) st.innerHTML = `<span class="g-turn win">✓ Buldun! +${m.pts}${v.players.length > 1 ? ' · diğerleri bekleniyor' : ''}</span>`;
    else if (m.done) st.innerHTML = `<span class="g-turn">Hakların bitti${v.players.length > 1 ? ' · diğerleri bekleniyor' : ''}</span>`;
    else st.innerHTML = `<span class="g-turn mine">⭐ Sıra sende · kelimeyi bul (${m.guesses.length + 1}/${TRIES})</span>`;
  } else if (v.phase === 'reveal') st.innerHTML = `<span class="g-turn">Kelime: <b class="ka-word">${esc(v.word)}</b></span>`;
  else st.innerHTML = '<span class="g-turn win">🏁 Oyun bitti</span>';
}

function render(v) {
  if (!builtFor) build();
  V = v;
  // yeni tur: yerel yazım sıfırlanır
  if (v.roundId !== roundSeen) { roundSeen = v.roundId; input = ''; pending = false; rowsSeen = v.mine ? v.mine.guesses.length : 0; kbRows = rowsSeen; clearTimeout(kbT); }
  const n = v.mine ? v.mine.guesses.length : 0;
  if (n > rowsSeen) {
    // tahminim kabul edildi
    input = ''; pending = false; clearTimeout(pendT);
    const last = v.mine.guesses[n - 1], solved = last.r.every(x => x === 2);
    [0, 1, 2, 3, 4].forEach(i => setTimeout(() => Sound.tick(.5 + i * .1), 120 + i * 230));
    clearTimeout(kbT);
    kbT = setTimeout(() => {
      kbRows = V && V.mine ? V.mine.guesses.length : 0; if (root && V) renderKb(V);
      if (!root || !V || V.roundId !== v.roundId) return;
      if (solved) {
        Sound.solve(); FX.confetti(110); flash('good');
        banner(['MÜTHİŞ!', 'HARİKA!', 'SÜPER!', 'GÜZEL!', 'İYİ!', 'SON ANDA!'][Math.min(n - 1, 5)], 'good');
      } else if (n >= TRIES) { Sound.bad(); flash('bad'); banner('HAKLARIN BİTTİ', 'bad'); }
    }, 1450);
    rowsSeen = n;
  }
  if (v.limit && v.phase === 'play') localDeadline = performance.now() + v.left;
  if (v.phase === 'reveal') localReveal = performance.now() + v.next;
  q('.ka').classList.toggle('spect', !v.mine);
  q('.ka-round').textContent = `Tur ${v.round}/${v.rounds}`;
  renderPlayers(v);
  renderStatus(v);
  renderBoard(v);
  renderKb(v);
  renderReveal(v);
  const sp = q('.ka-spect');
  sp.hidden = !!v.mine || v.phase !== 'play';
  if (!sp.hidden) sp.innerHTML = '<div class="ka-rv-card"><p class="ka-rv-cap">👀 İzleyici</p><p>Oyuncuların harflerini kimse göremez. Yukarıda yalnızca renkler görünür.</p></div>';
  q('.ka-rule').textContent = `🟩 doğru yer · 🟨 başka yerde · ⬛ yok · ${v.limit ? Math.round(v.limit / 1000) + ' sn' : 'süresiz'} · ilk bulan +10, ikinci +5`;
  tick();
}

function press(k) {
  if (!canType()) return;
  if (k === 'ENTER') return submit();
  if (pending) return;
  if (k === 'SİL' || k === 'BACKSPACE') { input = [...input].slice(0, -1).join(''); Sound.tick(.2); }
  else if (LETTERS.has(k)) { if ([...input].length < LEN) { input += k; Sound.tick(.35); } else return; }
  else return;
  renderBoard(V); renderKb(V);
  if (LETTERS.has(k)) { const row = root.querySelectorAll('.ka-board .ka-row')[V.mine.guesses.length]; const t = row && row.children[[...input].length - 1]; if (t) { t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop'); } }
}
function submit() {
  if (!canType() || pending) return;
  const w = input, n = [...w].length;
  if (n < LEN) { say('5 harf olmalı', 'bad'); shakeRow(); Sound.bad(); return; }
  if (!dict().has(w)) { say('Sözlükte yok', 'bad'); shakeRow(); Sound.bad(); return; }
  if (V.mine.guesses.some(g => g.w === w)) { say('Bunu zaten denedin', 'bad'); shakeRow(); Sound.bad(); return; }
  pending = true; Sound.init();
  clearTimeout(pendT); pendT = setTimeout(() => { if (pending) { pending = false; if (V) { renderBoard(V); renderKb(V); } say('Bağlantı yavaş, yeniden dene', 'bad'); } }, 6000);
  renderBoard(V); renderKb(V);
  ui.send({ t: 'guess', w });
}

function onClick(e) {
  const k = e.target.closest('.ka-k'); if (!k || k.disabled) return;
  Sound.init(); press(k.dataset.k);
}
function onKey(e) {
  if (document.body.dataset.game !== 'kelimeavi' || !root) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target && e.target.closest && e.target.closest('input,textarea,select')) return;
  const cf = document.getElementById('confirm'), set = document.getElementById('settings'), res = document.getElementById('results');
  if ((cf && !cf.hidden) || (set && !set.hidden) || (res && !res.hidden)) return;
  if (e.key === 'Enter') { if (e.repeat) return; e.preventDefault(); press('ENTER'); return; }
  if (e.key === 'Backspace') { e.preventDefault(); press('SİL'); return; }
  if (e.key && [...e.key].length === 1) { const L = up(e.key); if (LETTERS.has(L)) { e.preventDefault(); press(L); } }
}

function mount(r, api) {
  root = r; ui = api; V = null; input = ''; pending = false; roundSeen = -1; rowsSeen = 0; kbRows = 0; builtFor = null; prevMini = {};
  build();
  root.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  clearInterval(tickT); tickT = setInterval(tick, 200);
}
function onEvent(e) {
  if (!ui) return;
  const mine = e.pi === ui.me;
  if (e.t === 'reject') { if (mine) { pending = false; clearTimeout(pendT); say(e.why || 'Geçersiz', 'bad'); if (V) { renderBoard(V); renderKb(V); } shakeRow(); Sound.bad(); } }
  else if (e.t === 'guess') {
    if (!mine) {
      if (e.solved) { Sound.special(); const nm = V && V.players[e.pi] ? V.players[e.pi].name : ''; banner(`${up(nm)} BULDU!`, 'pink'); }
      else Sound.tick(.3);
    }
  } else if (e.t === 'round') { Sound.whoosh(); banner(`${e.round}. TUR`, 'pink'); }
  else if (e.t === 'reveal') {
    if (e.why === 'time') { Sound.stop(); }
    if (!(V && V.mine && V.mine.solved)) { if (!e.solved) Sound.bankrupt(); }
  }
}

CFX.registerGame({
  id: 'kelimeavi', name: 'Kelime Avı', icon: '🔤', color: '#2bd96b', min: 1, max: 4, hotseat: false, bot: false, localMin: 1,
  tagline: 'Gizli kelimeyi herkesten önce bul',
  rules: 'Herkes aynı anda aynı gizli 5 harfli kelimeyi 6 denemede bulmaya çalışır. Yeşil harf doğru yerde, sarı harf kelimede ama başka yerde, gri harf kelimede yok. Az denemede ve ilk bulan daha çok puan alır; rakiplerin yalnızca renklerini görürsün.',
  options: [
    { key: 'rounds', label: 'Tur', def: '5', choices: [{ v: '3', label: '3 tur' }, { v: '5', label: '5 tur' }, { v: '7', label: '7 tur' }] },
    { key: 'time', label: 'Süre (tur başına)', def: '150', choices: [{ v: '90', label: '90 sn' }, { v: '150', label: '150 sn' }, { v: '0', label: 'Süresiz' }] }
  ],
  setup(players, opts, ctx) {
    const rounds = [3, 5, 7].includes(+opts.rounds) ? +opts.rounds : 5;
    const t = opts.time != null ? +opts.time : 150;
    const st = {
      players: players.map(p => ({ name: p.name, color: p.color })),
      online: players.map(() => true),
      rounds, round: 1, limit: [90, 150].includes(t) ? t * 1000 : (t === 0 ? 0 : 150000),
      used: [], history: [], scores: players.map(() => 0),
      word: '', phase: 'play', why: null, solvers: 0, roundId: 0, boards: [], deadline: 0, revealUntil: 0
    };
    startRound(st, ctx);
    return st;
  },
  action(st, pi, a, ctx) {
    if (a.t === 'guess') guess(st, pi, a.w, ctx);
  },
  view(st, viewer) {
    const me = typeof viewer === 'number' && viewer >= 0 && viewer < st.players.length ? viewer : -1;
    const open = st.phase !== 'play';
    const now = Date.now();
    return {
      phase: st.phase, round: st.round, rounds: st.rounds, roundId: st.roundId, limit: st.limit,
      left: st.phase === 'play' && st.limit ? Math.max(0, st.deadline - now) : 0,
      next: st.phase === 'reveal' ? Math.max(0, st.revealUntil - now) : 0,
      last: st.round >= st.rounds,
      why: open ? st.why || null : null,
      word: open ? st.word : null,
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, score: st.scores[i], online: st.online[i] !== false })),
      // Herkese açık: yalnızca renkler, bulup bulmadığı, tur puanı. Harfler yok.
      boards: st.boards.map(b => ({ rows: b.guesses.map(g => g.r.slice()), solved: b.solved, done: finished(b), pts: b.pts })),
      // Kendi tahminlerin harfleriyle
      mine: me >= 0 ? (b => ({ guesses: b.guesses.map(g => ({ w: g.w, r: g.r.slice() })), solved: b.solved, done: finished(b), pts: b.pts }))(st.boards[me]) : null
    };
  },
  turnOf() { return null; },
  onPresence(st, pi, online, ctx) { st.online[pi] = online; if (!online) checkEnd(st, ctx); },
  resume(st, ctx) { armTimers(st, ctx); checkEnd(st, ctx); },
  mount, render, onEvent,
  unmount() {
    if (root) root.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
    clearInterval(tickT); clearTimeout(kbT); clearTimeout(pendT); clearTimeout(msgT);
    root = null; ui = null; V = null; builtFor = null;
  },
  _test: { scoreGuess, clean }
});
})();
