/* =========================================================================
   OYUN SALONU — AMİRAL BATTI
   10×10 denize filonu gizlice yerleştir, sonra sırayla rakibin denizine ateş
   et. İsabet ettiren yeniden atar (isteğe bağlı). Rakip filoyu ilk batıran
   kazanır. 2 kişi online ya da tek cihazda bilgisayara karşı.
   Gizlilik: view() rakibin batmamış gemilerinin yerini asla göndermez.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial } = CFX;
const N = 10, COLS = 'ABCDEFGHIJ';
const FLEET = [
  { id: 'ucak', name: 'Uçak Gemisi', len: 5 },
  { id: 'muhrip', name: 'Muhrip', len: 4 },
  { id: 'kruvazor', name: 'Kruvazör', len: 3 },
  { id: 'denizalti', name: 'Denizaltı', len: 3 },
  { id: 'hucumbot', name: 'Hücumbot', len: 2 }
];
const TOTAL = FLEET.reduce((s, f) => s + f.len, 0);   // 17
const FBY = Object.fromEntries(FLEET.map(f => [f.id, f]));
const coord = (x, y) => COLS[x] + (y + 1);
const trUp = s => String(s).toLocaleUpperCase('tr-TR');

/* ---------- ortak yardımcılar (kurallar + arayüz) ---------- */
function cellsOf(s) { const out = []; for (let k = 0; k < s.len; k++) out.push(s.dir === 'v' ? (s.y + k) * N + s.x : s.y * N + s.x + k); return out; }
function inGrid(s) { return s.x >= 0 && s.y >= 0 && (s.dir === 'v' ? s.y + s.len <= N && s.x < N : s.x + s.len <= N && s.y < N); }
function clampPos(x, y, len, dir) { return dir === 'v' ? { x: Math.min(Math.max(x, 0), N - 1), y: Math.min(Math.max(y, 0), N - len) } : { x: Math.min(Math.max(x, 0), N - len), y: Math.min(Math.max(y, 0), N - 1) }; }
// Rastgele, çakışmasız filo (gemiler yan yana gelebilir)
function randomLayout() {
  for (;;) {
    const occ = new Set(), out = []; let ok = true;
    for (const f of FLEET) {
      let placed = false;
      for (let t = 0; t < 200 && !placed; t++) {
        const dir = Math.random() < .5 ? 'h' : 'v';
        const s = { id: f.id, len: f.len, dir, x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) };
        if (!inGrid(s)) continue;
        const cs = cellsOf(s); if (cs.some(c => occ.has(c))) continue;
        cs.forEach(c => occ.add(c)); out.push(s); placed = true;
      }
      if (!placed) { ok = false; break; }
    }
    if (ok) return out;
  }
}

/* ---------- kurallar (yöneten cihaz) ---------- */
// Gelen yerleşimi doğrular; geçerliyse filoyu döndürür, değilse null.
function validFleet(ships) {
  if (!Array.isArray(ships) || ships.length !== FLEET.length) return null;
  const used = new Set(), occ = new Set(), out = [];
  for (const raw of ships) {
    if (!raw || typeof raw !== 'object') return null;
    const len = raw.len, x = raw.x, y = raw.y, dir = raw.dir === 'v' ? 'v' : raw.dir === 'h' ? 'h' : null;
    if (!dir || ![len, x, y].every(Number.isInteger)) return null;
    let f = FLEET.find(q => q.id === raw.id && q.len === len && !used.has(q.id));
    if (!f) f = FLEET.find(q => q.len === len && !used.has(q.id));
    if (!f) return null;
    const s = { id: f.id, name: f.name, len, x, y, dir, hits: 0, sunk: false };
    if (!inGrid(s)) return null;
    const cs = cellsOf(s); if (cs.some(c => occ.has(c))) return null;
    cs.forEach(c => occ.add(c)); used.add(f.id); out.push(s);
  }
  return FLEET.map(f => out.find(s => s.id === f.id));
}
function shipAt(board, i) { return board.ships.find(s => cellsOf(s).includes(i)) || null; }
function setReady(st, pi, fleet, ctx, how) {
  st.boards[pi].ships = fleet; st.ready[pi] = true;
  ctx.emit({ t: 'ready', pi }, how || `${st.players[pi].name} filosunu yerleştirdi.`);
  if (st.ready.every(Boolean)) {
    st.phase = 'battle'; st.cur = Math.random() < .5 ? 0 : 1;
    ctx.emit({ t: 'battle', cur: st.cur }, `Savaş başladı! İlk atış: ${st.players[st.cur].name}.`, 'gold');
  }
}
function fire(st, pi, x, y, ctx) {
  if (st.phase !== 'battle' || pi !== st.cur) return false;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= N || y >= N) return false;
  const tb = st.boards[1 - pi], i = y * N + x;
  if (tb.shots[i]) return false;
  const ship = shipAt(tb, i), hit = !!ship;
  tb.shots[i] = hit ? 2 : 1;
  st.stats[pi].shots++;
  let sunk = null;
  if (hit) {
    st.stats[pi].hits++; ship.hits++;
    if (ship.hits >= ship.len) { ship.sunk = true; sunk = ship.name; }
  }
  const won = tb.ships.every(s => s.sunk);
  const again = hit && st.again && !won;
  st.last = { by: pi, x, y, hit, sunk };
  const name = st.players[pi].name;
  ctx.emit({ t: 'shot', pi, x, y, hit, sunk, len: ship && sunk ? ship.len : 0, again },
    `${name} → ${coord(x, y)}: ${sunk ? `Vurdu! ${sunk} battı!` : hit ? 'Vurdu!' : 'Iska.'}${again ? ' Yeniden atıyor.' : ''}`, hit ? (sunk ? 'gold' : 'good') : '');
  if (won) {
    st.phase = 'over'; st.winner = pi;
    ctx.emit({ t: 'win', pi }, `${name} rakip filonun tamamını batırdı!`, 'gold');
    ctx.sync();
    ctx.later(1900, () => {
      const rank = [pi, 1 - pi].map(k => {
        const s = st.stats[k], rate = s.shots ? Math.round(100 * s.hits / s.shots) : 0;
        return { pi: k, score: s.hits, label: `${s.hits}/${TOTAL} isabet, %${rate} isabet oranı` };
      });
      ctx.end({ title: `${name} tüm filoyu batırdı!`, ranking: rank, note: `${st.stats[pi].shots} atışta kazandı.` });
    });
    return true;
  }
  if (!again) st.cur = 1 - pi;
  ctx.sync();
  return true;
}

/* ---------- bilgisayar: avla / hedefle (olasılık yoğunluğu + dama deseni) ---------- */
// Yalnızca atıcının bilebileceklerini kullanır: atış sonuçları, batan gemilerin yeri ve kalan boylar.
function aiShot(st, pi) {
  const tb = st.boards[1 - pi], shots = tb.shots;
  const sunkCells = new Set();
  tb.ships.filter(s => s.sunk).forEach(s => cellsOf(s).forEach(c => sunkCells.add(c)));
  const open = []; for (let i = 0; i < N * N; i++) if (shots[i] === 2 && !sunkCells.has(i)) open.push(i);
  const lens = tb.ships.filter(s => !s.sunk).map(s => s.len);
  const score = new Array(N * N).fill(0);
  for (const len of lens) for (const dir of ['h', 'v']) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const s = { x, y, len, dir }; if (!inGrid(s)) continue;
    const cs = cellsOf(s);
    if (cs.some(c => shots[c] === 1 || sunkCells.has(c))) continue;
    const covered = cs.filter(c => shots[c] === 2).length;
    if (open.length && !covered) continue;
    const w = open.length ? Math.pow(25, covered) : 1;
    for (const c of cs) if (!shots[c]) score[c] += w;
  }
  let cand = [];
  for (let i = 0; i < N * N; i++) if (!shots[i] && score[i] > 0) cand.push(i);
  if (!open.length) {                                         // av modu: dama deseni
    const minLen = Math.min(...lens);
    const par = cand.filter(i => ((i % N) + Math.floor(i / N)) % 2 === 0);
    if (par.length && minLen >= 2) cand = par;
  }
  if (!cand.length) { for (let i = 0; i < N * N; i++) if (!shots[i]) cand.push(i); }
  if (!cand.length) return null;
  const max = Math.max(...cand.map(i => score[i]));
  const top = cand.filter(i => score[i] >= max);
  const i = top[Math.floor(Math.random() * top.length)];
  return { x: i % N, y: Math.floor(i / N) };
}

/* ---------- arayüz (her cihaz) ---------- */
let root = null, ui = null, V = null, built = '', lastN = -1, pendingFire = false;
let draft = null;      // yerleşim taslağı: { layout:{id:{x,y,dir}}, sel, dir, hover, bad, loaded }
const newDraft = () => ({ layout: {}, sel: FLEET[0].id, dir: 'h', hover: null, bad: null, loaded: false, sent: false });
const q = s => root && root.querySelector(s);

function gridHTML(cls) {
  let h = `<div class="am-grid ${cls}"><span class="am-corner" style="grid-area:1/1"></span>`;
  for (let x = 0; x < N; x++) h += `<span class="am-lab" style="grid-area:1/${x + 2}">${COLS[x]}</span>`;
  for (let y = 0; y < N; y++) {
    h += `<span class="am-lab" style="grid-area:${y + 2}/1">${y + 1}</span>`;
    for (let x = 0; x < N; x++) h += `<button type="button" class="am-cell" style="grid-area:${y + 2}/${x + 2}" data-x="${x}" data-y="${y}" aria-label="${coord(x, y)}"></button>`;
  }
  return h + '<div class="am-radar" style="grid-area:2/2/12/12" aria-hidden="true"></div></div>';
}
function shipEl(s, cls) {
  const d = document.createElement('div');
  d.className = `am-ship ${s.dir} ${cls || ''}`;
  d.style.gridArea = s.dir === 'v' ? `${s.y + 2} / ${s.x + 2} / span ${s.len} / span 1` : `${s.y + 2} / ${s.x + 2} / span 1 / span ${s.len}`;
  return d;
}
function drawShips(grid, list) {
  grid.querySelectorAll('.am-ship').forEach(e => e.remove());
  const radar = grid.querySelector('.am-radar');
  list.forEach(([s, cls]) => grid.insertBefore(shipEl(s, cls), radar));
}
function pips(len, hits, sunk) { let h = ''; for (let k = 0; k < len; k++) h += `<b class="${sunk ? 'x' : k < hits ? 'h' : ''}"></b>`; return `<i class="am-pips">${h}</i>`; }

/* ---- yerleşim ekranı ---- */
function layoutList() { return FLEET.filter(f => draft.layout[f.id]).map(f => Object.assign({ id: f.id, len: f.len }, draft.layout[f.id])); }
function fits(s, ignoreId) {
  if (!inGrid(s)) return false;
  const occ = new Set(); layoutList().forEach(o => { if (o.id !== ignoreId) cellsOf(o).forEach(c => occ.add(c)); });
  return !cellsOf(s).some(c => occ.has(c));
}
function idAt(x, y) { const i = y * N + x; const s = layoutList().find(o => cellsOf(o).includes(i)); return s ? s.id : null; }
function msg(text, cls) { const m = q('.am-msg'); if (m) { m.textContent = text || ''; m.className = 'am-msg ' + (cls || ''); } }
function nextUnplaced() { const f = FLEET.find(z => !draft.layout[z.id]); return f ? f.id : null; }

function renderPlace(v) {
  const me = ui.me, mine = v.players[me], opp = v.players[1 - me];
  const ready = mine.ready;
  const serverShips = v.boards[me].ships;
  if (!ready && !draft.loaded && serverShips.length) { serverShips.forEach(s => { draft.layout[s.id] = { x: s.x, y: s.y, dir: s.dir }; }); draft.sel = nextUnplaced(); }
  draft.loaded = true;
  if (!ready) draft.sent = false;
  const grid = q('.am-place .am-grid');
  grid.classList.toggle('locked', ready);
  const list = ready ? serverShips.map(s => [s, 'own']) : layoutList().map(s => [s, 'own' + (s.id === draft.sel ? ' sel' : '')]);
  if (!ready && draft.sel && (draft.hover || draft.bad)) {
    const f = FBY[draft.sel], a = draft.bad || draft.hover;
    const p = clampPos(a.x, a.y, f.len, draft.dir), s = { id: f.id, len: f.len, x: p.x, y: p.y, dir: draft.dir };
    list.push([s, 'preview ' + (fits(s, f.id) && !draft.bad ? 'ok' : 'bad')]);
  }
  drawShips(grid, list);
  const placedIds = new Set(ready ? serverShips.map(s => s.id) : Object.keys(draft.layout));
  q('.am-shiplist').innerHTML = FLEET.map(f => `<button type="button" class="am-sitem ${placedIds.has(f.id) ? 'placed' : ''} ${!ready && draft.sel === f.id ? 'on' : ''}" data-ship="${f.id}" ${ready ? 'disabled' : ''}>
      <span class="am-sname">${esc(f.name)}</span>${pips(f.len, 0, false)}<span class="am-sok">${placedIds.has(f.id) ? '✓' : f.len}</span></button>`).join('');
  const all = placedIds.size === FLEET.length;
  const rot = q('[data-act="rot"]'); rot.textContent = draft.dir === 'h' ? '↔ Yatay' : '↕ Dikey'; rot.disabled = ready;
  q('[data-act="rand"]').disabled = ready; q('[data-act="clear"]').disabled = ready || !placedIds.size;
  const rb = q('[data-act="ready"]'); rb.hidden = ready; rb.disabled = !all || draft.sent;
  rb.textContent = all ? '✔ HAZIRIM' : `${FLEET.length - placedIds.size} gemi kaldı`;
  q('[data-act="edit"]').hidden = !ready;
  const hint = q('.am-phint');
  hint.textContent = ready ? (opp.ready ? 'Savaş başlıyor…' : `${opp.name} filosunu yerleştiriyor… İstersen düzenleyebilirsin.`)
    : (draft.sel ? `${FBY[draft.sel].name} (${FBY[draft.sel].len}) seçili — denizde bir kareye dokun.` : 'Tüm gemiler yerleşti. Taşımak için gemiye dokun.');
}
function placeTap(x, y) {
  if (!V || V.phase !== 'place' || ui.me < 0 || V.players[ui.me].ready) return;
  const occ = idAt(x, y);
  if (occ && occ !== draft.sel) {
    const s = draft.layout[occ]; delete draft.layout[occ];
    draft.sel = occ; draft.dir = s.dir; draft.hover = { x: s.x, y: s.y };
    Sound.tick(.3); msg(`${FBY[occ].name} kaldırıldı. Yeni yerine dokun.`);
  } else if (!draft.sel) { msg('Taşımak için yerleşmiş bir gemiye dokun.'); return; }
  else {
    const f = FBY[draft.sel], p = clampPos(x, y, f.len, draft.dir), s = { id: f.id, len: f.len, x: p.x, y: p.y, dir: draft.dir };
    if (fits(s, f.id)) {
      draft.layout[f.id] = { x: s.x, y: s.y, dir: s.dir };
      draft.sel = nextUnplaced(); draft.hover = null; Sound.good(); msg(`${f.name} yerleşti: ${coord(s.x, s.y)} ${s.dir === 'h' ? 'yatay' : 'dikey'}.`, 'ok');
    } else {
      draft.bad = { x, y }; Sound.bad(); msg('Buraya sığmıyor: gemiler üst üste gelemez.', 'bad');
      const g = q('.am-place .am-grid'); g.classList.remove('nope'); void g.offsetWidth; g.classList.add('nope');
      setTimeout(() => { if (draft) { draft.bad = null; if (V && V.phase === 'place') renderPlace(V); } }, 650);
    }
  }
  renderPlace(V);
}
function placeAct(act) {
  if (!V || V.phase !== 'place' || ui.me < 0) return;
  const ready = V.players[ui.me].ready;
  if (act === 'edit') { if (ready) { draft.loaded = false; draft.layout = {}; ui.send({ t: 'unready' }); } return; }
  if (ready) return;
  if (act === 'rot') { draft.dir = draft.dir === 'h' ? 'v' : 'h'; Sound.tick(.5); }
  else if (act === 'rand') { draft.layout = {}; randomLayout().forEach(s => { draft.layout[s.id] = { x: s.x, y: s.y, dir: s.dir }; }); draft.sel = null; draft.hover = null; Sound.whoosh(); msg('Filo rastgele yerleştirildi. Beğenmezsen tekrar bas ya da gemileri taşı.', 'ok'); }
  else if (act === 'clear') { draft.layout = {}; draft.sel = FLEET[0].id; msg(''); }
  else if (act === 'ready') {
    const list = layoutList(); if (list.length !== FLEET.length || draft.sent) return;
    draft.sent = true; Sound.init(); Sound.stop();
    ui.send({ t: 'ready', ships: list.map(s => ({ id: s.id, len: s.len, x: s.x, y: s.y, dir: s.dir })) });
  }
  renderPlace(V);
}

/* ---- savaş ekranı ---- */
function updateGrid(grid, board, o) {
  const sunk = new Set(); board.ships.filter(s => s.sunk).forEach(s => cellsOf(s).forEach(c => sunk.add(c)));
  grid.classList.toggle('can', !!o.can);
  grid.querySelectorAll('.am-cell').forEach(cell => {
    const x = +cell.dataset.x, y = +cell.dataset.y, i = y * N + x, sh = board.shots[i];
    let c = 'am-cell';
    if (sh === 1) c += ' miss'; else if (sh === 2) c += sunk.has(i) ? ' hit sunkc' : ' hit';
    if (o.last === i) c += ' last';
    if (o.can && !sh) c += ' open';
    if (cell.className !== c) cell.className = c;
    cell.setAttribute('aria-label', coord(x, y) + (sh === 1 ? ' ıska' : sh === 2 ? (sunk.has(i) ? ' battı' : ' isabet') : ''));
  });
  drawShips(grid, board.ships.map(s => [s, (o.own ? 'own' : 'foe') + (s.sunk ? ' sunk' : '')]));
}
function fleetHTML(title, board, own, cls) {
  const ships = board.fleet;
  const left = ships.filter(s => !s.sunk).length;
  return `<div class="am-fleet ${cls}"><h4>${esc(title)} <small>${left}/${ships.length}</small></h4><ul>${ships.map(s => `<li class="${s.sunk ? 'sunk' : ''}"><span>${esc(s.name)}</span>${pips(s.len, own ? s.hits : 0, s.sunk)}</li>`).join('')}</ul></div>`;
}
function renderBattle(v) {
  const me = ui.me, spect = me !== 0 && me !== 1;
  const e = spect ? 1 : 1 - me, o = spect ? 0 : me;
  const canAct = v.phase === 'battle' && !spect && v.cur === me && !v.players[me].isBot;
  if (lastN !== v.shotN) pendingFire = false;
  lastN = v.shotN;
  const lastOn = (b) => v.last && v.last.by === 1 - b ? v.last.y * N + v.last.x : -1;
  q('.am-cap-main').innerHTML = spect ? `<b>${esc(v.players[e].name)}</b> denizi` : `Rakip denizi · <b>${esc(v.players[e].name)}</b>`;
  q('.am-cap-mini').innerHTML = spect ? `<b>${esc(v.players[o].name)}</b> denizi` : 'Senin filon';
  updateGrid(q('.am-main .am-grid'), v.boards[e], { can: canAct && !pendingFire, last: lastOn(e), own: false });
  updateGrid(q('.am-mini .am-grid'), v.boards[o], { last: lastOn(o), own: !spect });
  q('.am-main .am-board').classList.toggle('aim', canAct);
  q('.am-mini .am-board').classList.toggle('under', v.phase === 'battle' && !spect && v.cur !== me);
  q('.am-fleets').innerHTML = fleetHTML(spect ? `${v.players[e].name} filosu` : 'Rakip filosu', v.boards[e], false, 'foe')
    + fleetHTML(spect ? `${v.players[o].name} filosu` : 'Senin filon', v.boards[o], !spect, 'mine');
  const L = v.last, ln = q('.am-lastshot');
  if (L) {
    const who = L.by === me ? 'Sen' : v.players[L.by].name;
    ln.innerHTML = `<span>Son atış:</span> <b>${esc(who)}</b> → <b class="am-co">${coord(L.x, L.y)}</b> <span class="am-res ${L.hit ? 'hit' : 'miss'}">${L.sunk ? esc(L.sunk) + ' battı!' : L.hit ? 'Vurdu!' : 'Iska'}</span>`;
  } else ln.innerHTML = v.phase === 'battle' ? '<span>Henüz atış yapılmadı.</span>' : '';
}

/* ---- ortak çizim ---- */
function renderPlayers(v) {
  const me = ui.me;
  q('.am-players').innerHTML = v.players.map((p, i) => {
    const active = v.phase === 'battle' && v.cur === i;
    const info = v.phase === 'place' ? `<span class="am-tag ${p.ready ? 'ok' : ''}">${p.ready ? 'Hazır ✓' : '⏳ Diziyor'}</span>`
      : `<span class="am-tag">🚢 ${v.boards[i].fleet.filter(s => !s.sunk).length}/5</span><span class="g-num" title="İsabet">${p.hits}</span>`;
    return `<div class="g-chip ${active ? 'active' : ''} ${p.online === false ? 'off' : ''}" style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><b>${esc(p.name)}${me === i ? '<small class="am-you"> · sen</small>' : ''}</b>${info}</div>`;
  }).join('');
  const st = q('.am-status'), spect = me !== 0 && me !== 1;
  if (v.phase === 'place') {
    if (spect) st.innerHTML = '<span class="g-turn">Amiraller filolarını yerleştiriyor…</span>';
    else if (v.players[me].ready) st.innerHTML = `<span class="g-turn">⏳ ${esc(v.players[1 - me].name)} filosunu yerleştiriyor…</span>`;
    else st.innerHTML = '<span class="g-turn mine">⚓ Filonu yerleştir</span>';
  } else if (v.phase === 'battle') {
    const c = v.players[v.cur];
    if (!spect && v.cur === me) st.innerHTML = `<span class="g-turn mine">🎯 Sıra sende — ateş et!</span>`;
    else if (!spect) st.innerHTML = `<span class="g-turn am-wait">📡 Rakip nişan alıyor… <b style="color:${c.color}">${esc(c.name)}</b></span>`;
    else st.innerHTML = `<span class="g-turn">Atış sırası: <b style="color:${c.color}">${esc(c.name)}</b></span>`;
  } else {
    const w = v.players[v.winner];
    st.innerHTML = `<span class="g-turn win">🏆 ${w ? esc(w.name) + ' kazandı!' : 'Oyun bitti'}</span>`;
  }
  q('.am-rule').textContent = v.again ? 'İsabet ettiren yeniden atar · rakip filoyu ilk batıran kazanır' : 'Her atıştan sonra sıra geçer · rakip filoyu ilk batıran kazanır';
}
function build(kind) {
  built = kind;
  const body = q('.am-body');
  if (kind === 'place') {
    body.innerHTML = `<div class="am-place">
      <div class="am-board own big">${gridHTML('')}</div>
      <div class="am-pside g-panel">
        <h3 class="am-h">Filon</h3>
        <p class="am-phint"></p>
        <div class="am-shiplist"></div>
        <div class="am-tools">
          <button type="button" class="btn btn-vowel" data-act="rot">↔ Yatay</button>
          <button type="button" class="btn btn-ghost" data-act="rand" aria-label="Rastgele yerleştir">🎲 Rastgele<span class="am-wide"> yerleştir</span></button>
          <button type="button" class="btn btn-ghost am-clear" data-act="clear">Temizle</button>
        </div>
        <p class="am-msg" aria-live="polite"></p>
        <button type="button" class="btn btn-spin am-ready" data-act="ready">✔ HAZIRIM</button>
        <button type="button" class="btn btn-ghost am-ready" data-act="edit" hidden>✎ Yerleşimi düzenle</button>
      </div></div>`;
  } else if (kind === 'wait') {
    body.innerHTML = '<div class="am-waitbox g-panel"><div class="am-board own big">' + gridHTML('locked') + '</div></div>';
  } else {
    body.innerHTML = `<div class="am-battle">
      <section class="am-main"><div class="am-cap am-cap-main"></div><div class="am-board enemy">${gridHTML('')}</div></section>
      <aside class="am-side">
        <div class="am-mini"><div class="am-cap am-cap-mini"></div><div class="am-board own">${gridHTML('small')}</div></div>
        <div class="am-fleets"></div>
      </aside></div>`;
  }
}
function render(v) {
  V = v;
  if (!draft) draft = newDraft();
  const spect = ui.me !== 0 && ui.me !== 1;
  const kind = v.phase === 'place' ? (spect ? 'wait' : 'place') : 'battle';
  if (built !== kind) build(kind);
  renderPlayers(v);
  q('.am-lastshot').hidden = kind !== 'battle';
  if (kind === 'place') renderPlace(v);
  else if (kind === 'battle') renderBattle(v);
}
function mount(r, api) {
  root = r; ui = api; V = null; built = ''; lastN = -1; pendingFire = false; draft = newDraft();
  root.innerHTML = `<div class="g-wrap am">
    <div class="g-players am-players"></div>
    <div class="g-status am-status"></div>
    <p class="am-lastshot" hidden></p>
    <div class="am-body"></div>
    <p class="g-sub am-rule"></p>
  </div>`;
  root.addEventListener('click', onClick);
  root.addEventListener('pointerover', onOver);
  root.addEventListener('pointerleave', onLeave, true);
  document.addEventListener('keydown', onKey);
}
function onClick(e) {
  if (!V) return;
  const a = e.target.closest('[data-act]');
  if (a && !a.disabled) { Sound.init(); placeAct(a.dataset.act); return; }
  const sb = e.target.closest('[data-ship]');
  if (sb && !sb.disabled) {
    const id = sb.dataset.ship;
    if (draft.layout[id]) { const s = draft.layout[id]; delete draft.layout[id]; draft.dir = s.dir; draft.hover = { x: s.x, y: s.y }; msg(`${FBY[id].name} kaldırıldı. Yeni yerine dokun.`); }
    draft.sel = id; Sound.tick(.4); renderPlace(V); return;
  }
  const cell = e.target.closest('.am-cell'); if (!cell) return;
  const x = +cell.dataset.x, y = +cell.dataset.y;
  if (built === 'place') { Sound.init(); placeTap(x, y); return; }
  if (built === 'battle' && cell.closest('.am-main') && cell.classList.contains('open') && !pendingFire) {
    Sound.init(); pendingFire = true;
    cell.classList.add('aimed');
    q('.am-main .am-grid').classList.remove('can');
    ui.send({ t: 'fire', x, y });
  }
}
function onOver(e) {
  if (built !== 'place' || !V || !draft || !draft.sel) return;
  const cell = e.target.closest && e.target.closest('.am-cell'); if (!cell) return;
  const x = +cell.dataset.x, y = +cell.dataset.y;
  if (draft.hover && draft.hover.x === x && draft.hover.y === y) return;
  draft.hover = { x, y }; renderPlace(V);
}
function onLeave(e) { if (built === 'place' && draft && e.target.classList && e.target.classList.contains('am-grid')) { draft.hover = null; if (V) renderPlace(V); } }
function onKey(e) { if (built === 'place' && (e.key === 'r' || e.key === 'R') && !e.target.closest('input,textarea')) placeAct('rot'); }

function onEvent(e) {
  const me = ui ? ui.me : -1, mine = e.pi === me, spect = me !== 0 && me !== 1;
  if (e.t === 'ready') { if (!mine) Sound.tick(.6); else Sound.special(); }
  else if (e.t === 'battle') { Sound.whoosh(); banner('SAVAŞ!', 'pink'); }
  else if (e.t === 'shot') {
    if (e.sunk) {
      banner(`${trUp(e.sunk)} BATTI!`, mine || spect ? 'good' : 'bad');
      if (mine || spect) { Sound.solve(); FX.confetti(60); flash('good'); } else { Sound.bankrupt(); flash('bad'); }
    } else if (e.hit) {
      banner(mine || spect ? 'VURDU!' : 'VURULDUN!', mine || spect ? 'good' : 'bad');
      if (mine || spect) Sound.good(); else { Sound.bad(); flash('bad'); }
    } else {
      Sound.whoosh();
      if (mine) banner('ISKA', 'pink');
    }
    if (!mine && !spect && e.hit && root) { const b = q('.am-mini .am-board'); if (b) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } }
    if (mine && root) { const b = q('.am-main .am-board'); if (b) { b.classList.remove('boom', 'splash'); void b.offsetWidth; b.classList.add(e.hit ? 'boom' : 'splash'); } }
  } else if (e.t === 'win') { banner(mine ? 'ZAFER!' : spect ? 'AMİRAL BATTI!' : 'FİLON BATTI!', mine || spect ? 'good' : 'bad'); if (!mine && !spect) Sound.bankrupt(); }
}

CFX.registerGame({
  id: 'amiral', name: 'Amiral Battı', icon: '⚓', color: '#2fb4ff', min: 2, max: 2, hotseat: false, bot: true, localMin: 1,
  tagline: 'Filonu gizle, rakibin gemilerini batır',
  rules: 'Beş gemini 10×10 denize gizlice yerleştir, sonra sırayla rakibin denizine ateş et. İsabet ettiren yeniden atar. Rakibin filosunu ilk batıran kazanır.',
  options: [{ key: 'again', label: 'İsabette tekrar atış', def: '1', choices: [{ v: '1', label: 'Açık' }, { v: '0', label: 'Kapalı' }] }],
  setup(players, opts, ctx) {
    const st = {
      players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })),
      again: String(opts && opts.again != null ? opts.again : '1') !== '0',
      phase: 'place', cur: 0, winner: null, last: null,
      ready: players.map(() => false), online: players.map(() => true),
      boards: players.map(() => ({ ships: [], shots: new Array(N * N).fill(0) })),
      stats: players.map(() => ({ shots: 0, hits: 0 }))
    };
    // Bilgisayar filosunu hemen (rastgele) yerleştirir
    players.forEach((p, i) => { if (p.isBot) { st.boards[i].ships = validFleet(randomLayout()); st.ready[i] = true; if (ctx) ctx.emit({ t: 'ready', pi: i }, `${p.name} filosunu yerleştirdi.`); } });
    return st;
  },
  action(st, pi, a, ctx) {
    if (a.t === 'ready') {
      if (st.phase !== 'place' || st.ready[pi]) return;
      const fleet = validFleet(a.ships);
      if (!fleet) { ctx.emit({ t: 'bad', pi }, 'Geçersiz yerleşim reddedildi.', 'bad'); ctx.sync(); return; }
      setReady(st, pi, fleet, ctx); ctx.sync();
    } else if (a.t === 'unready') {
      if (st.phase !== 'place' || !st.ready[pi]) return;
      st.ready[pi] = false; ctx.emit({ t: 'unready', pi }, `${st.players[pi].name} yerleşimi düzenliyor.`); ctx.sync();
    } else if (a.t === 'fire') fire(st, pi, a.x, a.y, ctx);
  },
  view(st, viewer) {
    const me = viewer === 0 || viewer === 1 ? viewer : -1;
    const reveal = st.phase === 'over';
    return {
      phase: st.phase, cur: st.cur, again: st.again, winner: st.winner, last: st.last,
      shotN: st.stats[0].shots + st.stats[1].shots,
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, ready: st.ready[i], online: st.online[i] !== false, shots: st.stats[i].shots, hits: st.stats[i].hits })),
      boards: st.boards.map((b, i) => ({
        shots: b.shots.slice(),
        // Kendi gemilerin tam; rakibinkilerden yalnızca batanlar (oyun bitince hepsi)
        ships: b.ships.filter(s => i === me || s.sunk || reveal).map(s => ({ id: s.id, name: s.name, len: s.len, x: s.x, y: s.y, dir: s.dir, sunk: s.sunk, hits: i === me ? s.hits : (s.sunk ? s.len : 0) })),
        // Filo durumu: herkese açık (yalnız ad, boy, battı mı)
        fleet: FLEET.map(f => { const s = b.ships.find(z => z.id === f.id); return { id: f.id, name: f.name, len: f.len, sunk: !!(s && s.sunk), hits: i === me && s ? s.hits : 0 }; })
      }))
    };
  },
  turnOf(st) {
    if (st.phase === 'place') {
      // Yerleşimde: bağlantısı kopan ya da bilgisayar olan hazır olmayan oyuncu (skipTurn/botAct için)
      const off = st.ready.findIndex((r, i) => !r && st.online[i] === false);
      if (off >= 0) return off;
      const bot = st.ready.findIndex((r, i) => !r && st.players[i].isBot);
      return bot >= 0 ? bot : null;
    }
    return st.phase === 'battle' ? st.cur : null;
  },
  onPresence(st, pi, online) { st.online[pi] = online; },
  botDelay: 800,
  botAct(st, pi, ctx) {
    if (st.phase === 'place') { if (!st.ready[pi]) { setReady(st, pi, validFleet(randomLayout()), ctx); ctx.sync(); } return; }
    if (st.phase !== 'battle' || st.cur !== pi) return;
    const s = aiShot(st, pi); if (s) fire(st, pi, s.x, s.y, ctx);
  },
  skipTurn(st, pi, ctx) {
    if (st.phase === 'place') {
      if (!st.ready[pi]) { setReady(st, pi, validFleet(randomLayout()), ctx, `${st.players[pi].name} için filo rastgele yerleştirildi.`); ctx.sync(); }
      return;
    }
    if (st.phase !== 'battle' || st.cur !== pi) return;
    // Rastgele geçerli bir atış: oyun takılmadan sürer
    const free = []; st.boards[1 - pi].shots.forEach((v, i) => { if (!v) free.push(i); });
    if (!free.length) { st.cur = 1 - pi; ctx.sync(); return; }
    const i = free[Math.floor(Math.random() * free.length)];
    fire(st, pi, i % N, Math.floor(i / N), ctx);
  },
  mount, render, onEvent,
  unmount() {
    if (root) { root.removeEventListener('click', onClick); root.removeEventListener('pointerover', onOver); root.removeEventListener('pointerleave', onLeave, true); }
    document.removeEventListener('keydown', onKey);
    root = null; ui = null; V = null; built = ''; draft = null;
  }
});
})();
