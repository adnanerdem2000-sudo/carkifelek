/* =========================================================================
   OYUN SALONU — KUTU KAPMACA
   Noktaların arasına sırayla çizgi çek; bir kutunun dördüncü kenarını
   çizen kutuyu kapar ve yeniden oynar. Tüm çizgiler bitince en çok puanı
   toplayan kazanır. ⭐ bonus kutular 2 puan. 2–4 kişi: online, aynı cihazda
   sırayla ya da bilgisayara karşı (Kolay / Orta / Zor). Tüm bilgi açıktır.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial, shuffle, centerOf } = CFX;

/* ---------- geometri: n×n kutu, (n+1)×(n+1) nokta ----------
   yatay çizgi  h(r,c) = r*n + c                 r: 0..n,   c: 0..n-1
   dikey çizgi  v(r,c) = H + r*(n+1) + c         r: 0..n-1, c: 0..n     (H = (n+1)*n)
   kutu         b(r,c) = r*n + c                                          */
const GEO = {};
function geo(n) {
  if (GEO[n]) return GEO[n];
  const H = (n + 1) * n, L = 2 * H, B = n * n;
  const sides = [], lb = [];
  for (let b = 0; b < B; b++) { const r = Math.floor(b / n), c = b % n; sides.push([r * n + c, (r + 1) * n + c, H + r * (n + 1) + c, H + r * (n + 1) + c + 1]); }
  for (let l = 0; l < L; l++) {
    const a = [];
    if (l < H) { const r = Math.floor(l / n), c = l % n; if (r > 0) a.push((r - 1) * n + c); if (r < n) a.push(r * n + c); }
    else { const k = l - H, r = Math.floor(k / (n + 1)), c = k % (n + 1); if (c > 0) a.push(r * n + c - 1); if (c < n) a.push(r * n + c); }
    lb.push(a);
  }
  return (GEO[n] = { n, H, L, B, sides, lb });
}
const sideCount = (st, g, b) => g.sides[b].reduce((s, l) => s + (st.lines[l] >= 0 ? 1 : 0), 0);
const missing = (lines, g, b) => g.sides[b].filter(l => lines[l] < 0);
const boxVal = (st, b) => (st.bonus.includes(b) ? 2 : 1);
const freeLines = (lines) => lines.reduce((a, o, l) => { if (o < 0) a.push(l); return a; }, []);

/* ---------- bilgisayar ---------- */
function sidesArr(lines, g) { return g.sides.map(s => s.reduce((k, l) => k + (lines[l] >= 0 ? 1 : 0), 0)); }
function capLines(st, g) {          // bir kutuyu tamamlayan çizgiler (iki kutu tamamlayan önce)
  const sc = sidesArr(st.lines, g), out = [];
  for (const l of freeLines(st.lines)) { const k = g.lb[l].filter(b => st.boxes[b] < 0 && sc[b] === 3).length; if (k) out.push({ l, k }); }
  return out.sort((a, b) => b.k - a.k);
}
function safeLines(st, g) {         // üçüncü kenarı vermeyen çizgiler
  const sc = sidesArr(st.lines, g);
  return freeLines(st.lines).filter(l => g.lb[l].every(b => sc[b] <= 1));
}
// Çizgi çekildikten sonra rakibin açgözlü biçimde toplayabileceği puan
function greedyLoss(st, g, l0) {
  const lines = st.lines.slice(), taken = new Set(); lines[l0] = 9;
  let pts = 0, go = true;
  while (go) {
    go = false;
    for (let b = 0; b < g.B; b++) {
      if (st.boxes[b] >= 0 || taken.has(b)) continue;
      const m = missing(lines, g, b);
      if (m.length === 0) { taken.add(b); pts += boxVal(st, b); go = true; }
      else if (m.length === 1) { lines[m[0]] = 9; go = true; }
    }
  }
  return pts;
}
// Kapılabilir kutudan başlayan zinciri izle
function chainFrom(st, g, b0) {
  const L = [b0], seen = new Set([b0]);
  let cur = b0, came = -1, end = 'ground';
  for (;;) {
    const m = missing(st.lines, g, cur).filter(l => l !== came);
    if (!m.length) { end = 'cap'; break; }
    const line = m[0], nb = g.lb[line].find(b => b !== cur);
    if (nb == null || st.boxes[nb] >= 0) { end = 'ground'; break; }
    if (seen.has(nb)) { end = 'cap'; break; }
    const mm = missing(st.lines, g, nb).length;
    if (mm === 1) { L.push(nb); end = 'cap'; break; }
    if (mm === 2) { L.push(nb); seen.add(nb); cur = nb; came = line; continue; }
    end = 'ground'; break;          // kavşak kutusu: zincir burada biter
  }
  return { L, end };
}
// Kalan kutuları zincir / halka bileşenlerine ayır
function components(st, g, exclude) {
  const ex = new Set(exclude || []), seen = new Set(), comps = [];
  for (let b = 0; b < g.B; b++) {
    if (st.boxes[b] >= 0 || ex.has(b) || seen.has(b)) continue;
    const stack = [b], list = []; seen.add(b);
    let loop = true;
    while (stack.length) {
      const x = stack.pop(); list.push(x);
      const m = missing(st.lines, g, x);
      if (m.length !== 2) loop = false;
      for (const l of m) {
        const nb = g.lb[l].find(y => y !== x);
        if (nb == null || st.boxes[nb] >= 0 || ex.has(nb)) { loop = false; continue; }
        if (!seen.has(nb)) { seen.add(nb); stack.push(nb); }
      }
    }
    const v = list.reduce((s, x) => s + boxVal(st, x), 0);
    comps.push({ t: loop && list.length >= 4 ? 'o' : 'c', k: list.length, v, boxes: list });
  }
  return comps;
}
// f(S): açmak zorunda olan oyuncunun kalan oyundaki net puanı (kendi − rakip)
function makeF() {
  const memo = new Map(); let budget = 30000;
  const rnet = (c, fr) => {
    let best = c.v + fr;
    if (c.t === 'c' && c.k >= 3) { const s = 2 * c.v / c.k; best = Math.max(best, c.v - 2 * s - fr); }
    if (c.t === 'o') { const s = 4 * c.v / c.k; best = Math.max(best, c.v - 2 * s - fr); }
    return best;
  };
  const f = (comps) => {
    if (!comps.length) return 0;
    const key = comps.map(c => c.t + c.k + ':' + c.v).sort().join('|');
    if (memo.has(key)) return memo.get(key);
    if (--budget < 0) { const c = comps.slice().sort((a, b) => a.v - b.v)[0]; return -c.v; }
    let best = -Infinity; const done = new Set();
    comps.forEach((c, i) => {
      const id = c.t + c.k + ':' + c.v; if (done.has(id)) return; done.add(id);
      const rest = comps.slice(0, i).concat(comps.slice(i + 1));
      best = Math.max(best, -rnet(c, f(rest)));
    });
    memo.set(key, best);
    return best;
  };
  return { f, rnet };
}
function botLine(st, pi) {
  const g = geo(st.n), lvl = st.level;
  const free = freeLines(st.lines);
  const caps = capLines(st, g), safe = safeLines(st, g);
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  if (lvl === 'easy') {
    if (caps.length && Math.random() < 0.75) return { l: caps[0].l };
    if (safe.length && Math.random() < 0.65) return { l: rnd(safe) };
    return { l: rnd(free) };
  }
  if (caps.length) {
    if (lvl === 'mid' || safe.length) return { l: caps[0].l };
    // Zor, oyun sonu: önce karar gerektirmeyen kutuları al, en sonda çifte hamleyi değerlendir
    const sc = sidesArr(st.lines, g);
    const capBoxes = []; for (let b = 0; b < g.B; b++) if (st.boxes[b] < 0 && sc[b] === 3) capBoxes.push(b);
    const chains = capBoxes.map(b => ({ b, ...chainFrom(st, g, b) }));
    const isDecision = ch => (ch.end === 'ground' && ch.L.length === 2) || (ch.end === 'cap' && ch.L.length === 4);
    const plain = chains.find(ch => !isDecision(ch));
    if (plain) { const m = missing(st.lines, g, plain.b); return { l: caps.find(c => c.l === m[0]) ? m[0] : caps[0].l }; }
    const ch = chains[0];
    const give = ch.L.reduce((s, b) => s + boxVal(st, b), 0);
    const rest = components(st, g, ch.L);
    const { f } = makeF();
    const fr = f(rest);
    if (rest.length && -give - fr > give + fr) {
      if (ch.end === 'ground') {
        const [x, y] = ch.L; const shared = g.sides[x].find(l => g.sides[y].includes(l));
        const far = missing(st.lines, g, y).find(l => l !== shared);
        if (far != null) return { l: far, dd: 2 };
      } else {
        const [, y, z] = ch.L; const mid = g.sides[y].find(l => g.sides[z].includes(l) && st.lines[l] < 0);
        if (mid != null) return { l: mid, dd: 4 };
      }
    }
    return { l: missing(st.lines, g, ch.b)[0] };
  }
  if (safe.length) return { l: rnd(safe) };
  // Güvenli çizgi kalmadı: rakibe en az kutuyu bırak
  const scored = free.map(l => ({ l, loss: greedyLoss(st, g, l) }));
  if (lvl === 'mid') { const min = Math.min(...scored.map(s => s.loss)); return { l: rnd(scored.filter(s => s.loss === min)).l }; }
  const comps = components(st, g);
  const { f, rnet } = makeF();
  let bestC = null, bestV = -Infinity;
  comps.forEach((c, i) => { const rest = comps.slice(0, i).concat(comps.slice(i + 1)); const v = -rnet(c, f(rest)); if (v > bestV) { bestV = v; bestC = c; } });
  let cand = scored;
  if (bestC) {
    const set = new Set(bestC.boxes);
    const touch = scored.filter(s => g.lb[s.l].some(b => set.has(b)));
    if (touch.length) cand = touch;
  }
  cand.forEach(s => {
    const inner = g.lb[s.l].filter(b => st.boxes[b] < 0).length === 2;
    s.score = s.loss * 10 + (bestC && bestC.t === 'c' && bestC.k === 2 && inner ? -5 : 0) + (inner ? 1 : 0) + Math.random() * 0.5;
  });
  cand.sort((a, b) => a.score - b.score);
  return { l: cand[0].l };
}

/* ---------- arayüz ---------- */
const S = 100, M = 34;
let root = null, ui = null, V = null, built = 0, prevLines = null, prevBoxes = null;
function tag(v, i) {                // kutuya yazılan kısa ad: aynı baş harf varsa numara ekle
  const ini = s => (s || '?').trim().charAt(0).toLocaleUpperCase('tr-TR') || '?';
  const p = v.players, me = ini(p[i].name);
  if (p.filter(x => ini(x.name) === me).length < 2) return me;
  const m = p[i].name.match(/\d+$/); return me + (m ? m[0] : i + 1);
}
const canActOf = v => v.phase === 'play' && (ui.mode === 'local' ? !v.players[v.cur].isBot : ui.me === v.cur);
function build(v) {
  const n = v.n, g = geo(n), W = 2 * M + n * S;
  const P = (r, c) => [M + c * S, M + r * S];
  let boxes = '', segs = '', dots = '';
  for (let b = 0; b < g.B; b++) {
    const r = Math.floor(b / n), c = b % n, [x, y] = P(r, c);
    boxes += `<g class="kk-box" data-b="${b}"><rect class="kk-fill" x="${x + 7}" y="${y + 7}" width="${S - 14}" height="${S - 14}" rx="14"/>
      <text class="kk-star" x="${x + S / 2}" y="${y + S / 2}">⭐</text><text class="kk-ini" x="${x + S / 2}" y="${y + S / 2 + 2}"></text></g>`;
  }
  for (let l = 0; l < g.L; l++) {
    let a, b, cx, cy, horiz = l < g.H;
    if (horiz) { const r = Math.floor(l / n), c = l % n; a = P(r, c); b = P(r, c + 1); }
    else { const k = l - g.H, r = Math.floor(k / (n + 1)), c = k % (n + 1); a = P(r, c); b = P(r + 1, c); }
    cx = (a[0] + b[0]) / 2; cy = (a[1] + b[1]) / 2;
    const h = S / 2;
    const poly = horiz ? `${a[0]},${cy} ${cx},${cy - h} ${b[0]},${cy} ${cx},${cy + h}` : `${cx},${a[1]} ${cx + h},${cy} ${cx},${b[1]} ${cx - h},${cy}`;
    segs += `<g class="kk-seg" data-l="${l}"><polygon class="kk-hit" points="${poly}"/><line class="kk-ln" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" pathLength="1"/></g>`;
  }
  for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) { const [x, y] = P(r, c); dots += `<circle cx="${x}" cy="${y}" r="${n >= 8 ? 7 : 8}"/>`; }
  root.querySelector('.kk-board').innerHTML = `<svg class="kk-svg n${n}" viewBox="0 0 ${W} ${W}" role="img" aria-label="${n}×${n} kutu tahtası">
    <defs><filter id="kkGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <g class="kk-boxes">${boxes}</g><g class="kk-segs" filter="url(#kkGlow)">${segs}</g><g class="kk-dots" filter="url(#kkGlow)">${dots}</g></svg>`;
  built = n; prevLines = null; prevBoxes = null;
}
function render(v) {
  V = v;
  if (built !== v.n || !root.querySelector('.kk-svg')) build(v);
  const g = geo(v.n), p = v.players, canAct = canActOf(v);
  root.querySelector('.kk-score').innerHTML = p.map((x, i) => `<div class="g-chip kk-chip ${i === v.cur && v.phase === 'play' ? 'active' : ''} ${x.online === false ? 'off' : ''}" style="--pc:${x.color}">
      <span class="av" style="--pc:${x.color}">${initial(x.name)}</span><span class="kk-nm"><b>${esc(x.name)}</b><small>${v.counts[i]} kutu${ui.me === i ? ' · <em class="kk-you">sen</em>' : ''}</small></span><span class="g-num">${v.scores[i]}</span></div>`).join('');
  const st = root.querySelector('.kk-status'), cp = p[v.cur];
  if (v.phase === 'play') {
    const again = v.again && v.lastBy === v.cur;
    st.innerHTML = canAct ? `<span class="g-turn mine">${again ? '🔁 Tekrar senin! · bir çizgi daha' : '⭐ Sıra sende · bir çizgiye dokun'}</span>`
      : `<span class="g-turn">${again ? '🔁 ' : ''}Sıra: <b style="color:${cp.color}">${esc(cp.name)}</b>${cp.isBot ? ' düşünüyor…' : ''}</span>`;
  } else {
    const best = Math.max(...v.scores), w = v.scores.map((s, i) => s === best ? i : -1).filter(i => i >= 0);
    st.innerHTML = w.length > 1 ? '<span class="g-turn">Berabere! Tüm çizgiler çizildi.</span>' : `<span class="g-turn win">${esc(p[w[0]].name)} kazandı!</span>`;
  }
  const left = v.lines.filter(o => o < 0).length;
  root.querySelector('.kk-sub').textContent = `${v.n}×${v.n} · ${left} çizgi kaldı${v.bonus.length ? ' · ⭐ kutu 2 puan' : ''}`;
  const svg = root.querySelector('.kk-svg');
  svg.classList.toggle('can', canAct);
  svg.style.setProperty('--turn', cp ? cp.color : '#fff');
  const sc = sidesArr(v.lines, g);
  svg.querySelectorAll('.kk-seg').forEach(el => {
    const l = +el.dataset.l, o = v.lines[l];
    const isNew = o >= 0 && prevLines && prevLines[l] < 0;
    el.classList.toggle('on', o >= 0);
    el.classList.toggle('last', o >= 0 && v.last === l);
    if (o >= 0) el.style.setProperty('--lc', p[o].color); else el.style.removeProperty('--lc');
    if (isNew) { el.classList.remove('new'); void el.getBoundingClientRect(); el.classList.add('new'); }
    else el.classList.remove('new');
  });
  svg.querySelectorAll('.kk-box').forEach(el => {
    const b = +el.dataset.b, o = v.boxes[b];
    el.classList.toggle('bonus', v.bonus.includes(b));
    el.classList.toggle('own', o >= 0);
    el.classList.toggle('hot', canAct && o < 0 && sc[b] === 3);
    if (o >= 0) { el.style.setProperty('--pc', p[o].color); const t = tag(v, o), ie = el.querySelector('.kk-ini'); ie.textContent = t; ie.classList.toggle('two', t.length > 1); }
    else { el.style.removeProperty('--pc'); el.querySelector('.kk-ini').textContent = ''; }
    if (o >= 0 && prevBoxes && prevBoxes[b] < 0) { el.classList.remove('pop'); void el.getBoundingClientRect(); el.classList.add('pop'); }
  });
  prevLines = v.lines.slice(); prevBoxes = v.boxes.slice();
}
function mount(r, api) {
  root = r; ui = api; built = 0; prevLines = null; prevBoxes = null;
  root.innerHTML = `<div class="g-wrap kk">
    <div class="g-players kk-score"></div>
    <div class="g-status kk-status"></div>
    <div class="kk-board"></div>
    <p class="g-sub kk-sub"></p>
  </div>`;
  root.querySelector('.kk-board').addEventListener('click', e => {
    const s = e.target.closest('.kk-seg'); if (!s || !V || !canActOf(V)) return;
    const l = +s.dataset.l; if (V.lines[l] >= 0) return;
    Sound.init(); ui.send({ t: 'line', l });
  });
}

/* ---------- kayıt ---------- */
const DEF = {
  id: 'kutu', name: 'Kutu Kapmaca', icon: '🔲', color: '#19e3d0', min: 2, max: 4, hotseat: true, bot: true, localMin: 1,
  tagline: 'Dördüncü kenarı çiz, kutuyu kap',
  rules: 'Sırayla iki komşu nokta arasına bir çizgi çekin. Bir kutunun dördüncü kenarını çizen kutuyu kapar ve bir çizgi daha çeker. Tüm çizgiler bitince en çok puanı olan kazanır; ⭐ kutular 2 puan.',
  options: [
    { key: 'size', label: 'Tahta', def: '6', choices: [{ v: '4', label: 'Küçük 4×4' }, { v: '6', label: 'Orta 6×6' }, { v: '8', label: 'Büyük 8×8' }] },
    { key: 'bonus', label: 'Bonus kutular', def: '1', choices: [{ v: '1', label: 'Açık' }, { v: '0', label: 'Kapalı' }] },
    { key: 'level', label: 'Bilgisayar', def: 'mid', choices: [{ v: 'easy', label: 'Kolay' }, { v: 'mid', label: 'Orta' }, { v: 'hard', label: 'Zor' }] }
  ],
  setup(players, opts) {
    const n = [4, 6, 8].includes(+opts.size) ? +opts.size : 6, g = geo(n);
    const bonusOn = String(opts.bonus == null ? '1' : opts.bonus) !== '0';
    const nb = bonusOn ? { 4: 2, 6: 4, 8: 6 }[n] : 0;
    return {
      n, level: ['easy', 'mid', 'hard'].includes(opts.level) ? opts.level : 'mid',
      players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })),
      lines: Array(g.L).fill(-1), boxes: Array(g.B).fill(-1),
      bonus: shuffle(Array.from({ length: g.B }, (_, i) => i)).slice(0, nb).sort((a, b) => a - b),
      scores: players.map(() => 0), counts: players.map(() => 0),
      cur: 0, phase: 'play', last: null, lastBy: null, again: false, moves: 0
    };
  },
  action(st, pi, a, ctx) {
    if (!a || a.t !== 'line' || st.phase !== 'play' || pi !== st.cur) return;
    const g = geo(st.n), l = a.l;
    if (!Number.isInteger(l) || l < 0 || l >= g.L || st.lines[l] >= 0) return;
    st.lines[l] = pi; st.last = l; st.lastBy = pi; st.moves++;
    const got = g.lb[l].filter(b => st.boxes[b] < 0 && sideCount(st, g, b) === 4);
    const name = st.players[pi].name;
    if (a.dd) ctx.emit({ t: 'dd', pi }, `🧠 ${name} son ${a.dd} kutuyu bilerek bıraktı!`, 'gold');
    if (got.length) {
      let pts = 0; got.forEach(b => { st.boxes[b] = pi; pts += boxVal(st, b); });
      st.scores[pi] += pts; st.counts[pi] += got.length; st.again = true;
      const star = got.some(b => st.bonus.includes(b));
      ctx.emit({ t: 'cap', pi, boxes: got, pts, star }, `${name} ${got.length > 1 ? got.length + ' kutu' : 'bir kutu'} kaptı${star ? ' ⭐' : ''} (+${pts}).`, 'good');
    } else {
      st.again = false; st.cur = (pi + 1) % st.players.length;
      ctx.emit({ t: 'line', pi, l, next: st.cur });
    }
    if (st.moves >= g.L) {
      st.phase = 'done'; st.again = false;
      ctx.emit({ t: 'end' }, 'Tüm çizgiler çizildi!', 'gold');
      ctx.sync();
      ctx.later(1500, () => {
        const order = st.players.map((_, i) => i).sort((x, y) => st.scores[y] - st.scores[x] || st.counts[y] - st.counts[x] || x - y);
        const top = order.filter(i => st.scores[i] === st.scores[order[0]]);
        const bonus = st.bonus.length > 0;
        ctx.end({
          title: top.length > 1 ? 'Berabere!' : `${st.players[order[0]].name} kazandı!`,
          ranking: order.map(i => ({ pi: i, score: st.scores[i], label: bonus ? `${st.scores[i]} puan · ${st.counts[i]} kutu` : `${st.counts[i]} kutu` })),
          note: top.length > 1 ? `${top.map(i => st.players[i].name).join(' ve ')} eşit puanla bitirdi.` : `${st.n}×${st.n} tahta${bonus ? ' · ⭐ kutular 2 puan' : ''}`
        });
      });
      return;
    }
    ctx.sync();
  },
  view(st) {
    return { n: st.n, lines: st.lines, boxes: st.boxes, bonus: st.bonus, scores: st.scores, counts: st.counts, cur: st.cur, phase: st.phase,
      last: st.last, lastBy: st.lastBy, again: st.again,
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, online: CFX.Room.game && CFX.Room.game.players[i] ? CFX.Room.game.players[i].online : true })) };
  },
  turnOf(st) { return st.phase === 'play' ? st.cur : null; },
  get botDelay() { const g = CFX.Room.game, st = g && g.state; return st && st.again ? 520 : 850; },
  botAct(st, pi, ctx) {
    if (st.phase !== 'play' || st.cur !== pi) return;
    let mv = null;
    try { mv = botLine(st, pi); } catch (e) { console.error(e); }
    if (!mv || st.lines[mv.l] == null || st.lines[mv.l] >= 0) { const free = freeLines(st.lines); mv = { l: free[Math.floor(Math.random() * free.length)] }; }
    this.action(st, pi, { t: 'line', l: mv.l, dd: mv.dd }, ctx);
  },
  skipTurn(st, pi, ctx) {
    if (st.phase !== 'play' || st.cur !== pi) return;
    const g = geo(st.n), safe = safeLines(st, g), free = freeLines(st.lines);
    const pool = safe.length ? safe : free; if (!pool.length) return;
    this.action(st, pi, { t: 'line', l: pool[Math.floor(Math.random() * pool.length)] }, ctx);
  },
  mount, render,
  onEvent(e) {
    if (e.t === 'line') {
      Sound.tick(.5);
      if (ui && ui.mode === 'online' && e.next === ui.me && e.pi !== ui.me) banner('SIRA SENDE', 'good');
    } else if (e.t === 'cap') {
      if (e.star) Sound.buy(); else Sound.good();
      requestAnimationFrame(() => {
        if (!root) return;
        e.boxes.forEach(b => { const el = root.querySelector(`.kk-box[data-b="${b}"] .kk-fill`); if (el) { const [x, y] = centerOf(el); FX.burst(x, y, e.star ? 34 : 18, !!e.star); } });
      });
      const mine = ui && (ui.mode === 'local' ? V && V.players[e.pi] && !V.players[e.pi].isBot : e.pi === ui.me);
      const left = V ? V.lines.filter(o => o < 0).length : 1;
      const streak = V && V.again && V.lastBy === e.pi;          // aynı serinin devamıysa afişi tekrarlama
      if (left > 1 && mine && (!streak || e.star)) banner(e.star ? '⭐ TEKRAR SENİN! ⭐' : 'TEKRAR SENİN!', 'good');
    } else if (e.t === 'dd') Sound.special();
    else if (e.t === 'end') { Sound.solve(); flash('good'); banner('OYUN BİTTİ', 'good'); }
  },
  unmount() { root = null; V = null; built = 0; }
};
DEF._test = { geo, botLine, greedyLoss, chainFrom, components, makeF, safeLines, capLines };
CFX.registerGame(DEF);
})();
