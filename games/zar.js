/* =========================================================================
   OYUN SALONU — ZAR TURNUVASI
   Beş zarla kategori oyunu. Her turda en fazla 3 kez zar at, istediğin zarları
   tut, sonra puan kartında boş bir kategori seç. 13 tur sonunda en yüksek
   toplam kazanır. 1–4 kişi: online, aynı cihazda sırayla ya da bilgisayara karşı.
   Tüm bilgi açıktır.
   ========================================================================= */
(() => {
'use strict';
const { esc, fmt, Sound, FX, banner, flash, initial, randInt, centerOf, store } = CFX;

/* ---------- kategoriler ---------- */
const CATS = [
  { n: 'Birler', s: 'Birler', h: 'Sadece 1’lerin toplamı', f: 1 },
  { n: 'İkiler', s: 'İkiler', h: 'Sadece 2’lerin toplamı', f: 2 },
  { n: 'Üçler', s: 'Üçler', h: 'Sadece 3’lerin toplamı', f: 3 },
  { n: 'Dörtler', s: 'Dörtler', h: 'Sadece 4’lerin toplamı', f: 4 },
  { n: 'Beşler', s: 'Beşler', h: 'Sadece 5’lerin toplamı', f: 5 },
  { n: 'Altılar', s: 'Altılar', h: 'Sadece 6’ların toplamı', f: 6 },
  { n: 'Üçlü', s: 'Üçlü', h: 'En az 3 aynı · tüm zarlar', ic: '3×' },
  { n: 'Dörtlü', s: 'Dörtlü', h: 'En az 4 aynı · tüm zarlar', ic: '4×' },
  { n: 'Full', s: 'Full', h: '3 aynı + 2 aynı · 25', ic: '🏠' },
  { n: 'Küçük Kent', s: 'K. Kent', h: '4 ardışık · 30', ic: '↗' },
  { n: 'Büyük Kent', s: 'B. Kent', h: '5 ardışık · 40', ic: '⇗' },
  { n: 'Zar Kralı', s: 'Zar Kralı', h: '5 aynı · 50', ic: '👑' },
  { n: 'Şans', s: 'Şans', h: 'Tüm zarların toplamı', ic: '🍀' }
];
const NC = 13, ZK = 11, CH = 12, ROUNDS = 13, UP_NEED = 63, UP_BONUS = 35, ZK_BONUS = 100;

/* ---------- puanlama (ortak) ---------- */
function counts(d) { const c = [0, 0, 0, 0, 0, 0, 0]; d.forEach(x => { c[x]++; }); return c; }
const sumOf = d => d.reduce((a, b) => a + b, 0);
function hasRun(c, len) {
  let run = 0;
  for (let f = 1; f <= 6; f++) { run = c[f] ? run + 1 : 0; if (run >= len) return true; }
  return false;
}
const isZK = d => d.length === 5 && d.every(x => x === d[0]);
// joker: Zar Kralı kutusu dolu iken beşli gelince alt bölümde tam puan sayılır
function scoreCat(d, cat, joker) {
  const c = counts(d), s = sumOf(d);
  if (cat < 6) return c[cat + 1] * (cat + 1);
  switch (cat) {
    case 6: return c.some(x => x >= 3) ? s : 0;
    case 7: return c.some(x => x >= 4) ? s : 0;
    case 8: return joker || (c.includes(3) && c.includes(2)) ? 25 : 0;
    case 9: return joker || hasRun(c, 4) ? 30 : 0;
    case 10: return joker || hasRun(c, 5) ? 40 : 0;
    case 11: return isZK(d) ? 50 : 0;
    default: return s;
  }
}
// hangi boş kategoriler seçilebilir ve kaç puan getirir: [{ ok, v }] (v ZK bonusu hariç)
function options(card, d, jokerRule) {
  const res = card.map(x => ({ ok: x == null, v: 0 }));
  const five = isZK(d);
  let jok = false;
  if (five && jokerRule && card[ZK] != null) {
    const up = d[0] - 1;
    if (card[up] == null) res.forEach((r, k) => { r.ok = k === up; });
    else if (card.some((x, k) => k >= 6 && x == null)) { res.forEach((r, k) => { r.ok = r.ok && k >= 6; }); jok = true; }
    else res.forEach((r, k) => { r.ok = r.ok && k < 6; });
  }
  res.forEach((r, k) => { if (r.ok) r.v = scoreCat(d, k, jok && k >= 6); });
  return res;
}
const zkBonusFor = (card, d) => (isZK(d) && card[ZK] === 50 ? ZK_BONUS : 0);
function totals(card, zkb) {
  const upper = card.slice(0, 6).reduce((a, x) => a + (x || 0), 0);
  const lower = card.slice(6).reduce((a, x) => a + (x || 0), 0);
  const bonus = upper >= UP_NEED ? UP_BONUS : 0;
  return { upper, lower, bonus, zkb: zkb * ZK_BONUS, total: upper + bonus + lower + zkb * ZK_BONUS };
}
// üst bölüm bonusu hâlâ alınabilir mi (ve henüz alınmadı mı)
function bonusAlive(card) {
  let have = 0, max = 0;
  for (let k = 0; k < 6; k++) { if (card[k] != null) have += card[k]; else max += 5 * (k + 1); }
  return have < UP_NEED && have + max >= UP_NEED;
}

/* ---------- bilgisayar: beklenen değerle zar tutma ---------- */
// 252 farklı (sıralı) beş zar durumu
const STATES = [], SIDX = new Map();
(function gen(pre, min) {
  if (pre.length === 5) { SIDX.set(pre.join(''), STATES.length); STATES.push(pre.slice()); return; }
  for (let f = min; f <= 6; f++) { pre.push(f); gen(pre, f); pre.pop(); }
})([], 1);
// k zar atıldığında çıkabilecek sıralı sonuçlar ve olasılıkları
const OUT = [[{ d: [], p: 1 }]];
for (let k = 1; k <= 5; k++) {
  const m = new Map(), tot = Math.pow(6, k);
  for (let n = 0; n < tot; n++) {
    const d = []; let x = n; for (let j = 0; j < k; j++) { d.push(x % 6 + 1); x = Math.floor(x / 6); }
    d.sort((a, b) => a - b); const key = d.join('');
    const e = m.get(key); if (e) e.p += 1 / tot; else m.set(key, { d, p: 1 / tot });
  }
  OUT.push([...m.values()]);
}
const TRANS = new Map();      // tutulan sıralı zarlar → [[durum, olasılık]]
function trans(keep) {
  const key = keep.join('');
  let t = TRANS.get(key); if (t) return t;
  t = OUT[5 - keep.length].map(o => [SIDX.get(keep.concat(o.d).sort((a, b) => a - b).join('')), o.p]);
  TRANS.set(key, t); return t;
}
function keepsOf(d) {          // bir durumdan tutulabilecek farklı alt çoklu kümeler
  const s = d.slice().sort((a, b) => a - b), seen = new Map();
  for (let m = 0; m < 32; m++) { const k = s.filter((_, i) => m & (1 << i)); const key = k.join(''); if (!seen.has(key)) seen.set(key, k); }
  return [...seen.values()];
}
// kategoriyi boş bırakmanın yaklaşık değeri (ileride beklenen puan)
function baseline(cat, left) {
  if (cat < 6) return (cat + 1) * 2.4;
  return [15, 7, 15, 18, 13 + Math.min(4, left * 0.3), Math.min(16, 2 + left * 1.2), 21][cat - 6];
}
// kategori seçiminin değeri: puan + bonus hedefi − kategoriyi harcamanın bedeli
function catValue(card, cat, v, left, alive, upHave) {
  let val = v - baseline(cat, left);
  if (cat < 6 && alive) {
    val += (v - 3 * (cat + 1)) * 0.9;
    if (upHave + v >= UP_NEED) val += 12;
  }
  return val;
}
function bestCat(card, d, jokerRule) {
  const ops = options(card, d, jokerRule), left = card.filter(x => x == null).length - 1;
  const alive = bonusAlive(card), upHave = card.slice(0, 6).reduce((a, x) => a + (x || 0), 0);
  let best = -1, bv = -Infinity;
  ops.forEach((o, k) => { if (!o.ok) return; const val = catValue(card, k, o.v, left, alive, upHave); if (val > bv) { bv = val; best = k; } });
  return { cat: best, val: bv + zkBonusFor(card, d) };
}
const ev = (keep, V) => trans(keep).reduce((a, [i, p]) => a + p * V[i], 0);
let vCache = { key: '', V: null };
function stateValues(card, rollsLeft, jokerRule) {   // aynı tur içinde tekrar hesaplama
  const key = JSON.stringify(card) + '|' + Math.min(rollsLeft, 2) + '|' + (jokerRule ? 1 : 0);
  if (vCache.key === key) return vCache.V;
  const V0 = STATES.map(s => bestCat(card, s, jokerRule).val);
  const V = rollsLeft >= 2 ? STATES.map(s => Math.max(...keepsOf(s).map(k => ev(k, V0)))) : V0;
  vCache = { key, V }; return V;
}
function planKeep(card, dice, rollsLeft, jokerRule) {
  const V = stateValues(card, rollsLeft, jokerRule);
  let best = null, bv = -Infinity;
  keepsOf(dice).forEach(k => { const e = ev(k, V) + (k.length === 5 ? 1e-6 : 0); if (e > bv) { bv = e; best = k; } });
  return best;
}
// tutulacak zar çoklu kümesini somut zar konumlarına çevir (mevcut tutulanları koru)
function keepToHeld(dice, held, keep) {
  const want = keep.slice(), out = [false, false, false, false, false];
  [true, false].forEach(pass => dice.forEach((v, i) => {
    if (out[i] || held[i] !== pass) return;
    const j = want.indexOf(v); if (j >= 0) { want.splice(j, 1); out[i] = true; }
  }));
  return out;
}

/* ---------- kurallar (yöneten cihaz) ---------- */
const T = ms => Math.max(5, Math.round(ms * ((DEF && DEF.speed) || 1)));
let DEF = null, nextBot = 900;
const pname = (st, i) => st.players[i].name;
function doRoll(st, pi, ctx) {
  const mask = st.held.map(h => !h);
  st.dice = st.dice.map((v, i) => (mask[i] ? randInt(1, 6) : v));
  st.rollN++; st.rollId++; st.mask = mask;
  nextBot = 1300;
  const five = isZK(st.dice);
  ctx.emit({ t: 'roll', pi, n: st.rollN, zk: five }, five ? `${pname(st, pi)} beş aynı zar attı: ZAR KRALI!` : '', five ? 'gold' : '');
  ctx.sync();
}
function nextTurn(st, ctx) {
  st.held = [false, false, false, false, false]; st.rollN = 0; st.mask = [false, false, false, false, false];
  st.cur = (st.cur + 1) % st.players.length;
  if (st.cur === 0) st.round++;
  if (st.round > ROUNDS) { st.phase = 'over'; ctx.sync(); ctx.later(T(1500), () => ctx.end(result(st))); return; }
  ctx.emit({ t: 'turn', pi: st.cur });
  ctx.sync();
}
function result(st) {
  const rows = st.players.map((p, i) => ({ i, t: totals(st.cards[i], st.zkb[i]).total, zk: st.zkN[i] }));
  rows.sort((a, b) => b.t - a.t || b.zk - a.zk || a.i - b.i);
  const top = rows[0], tie = rows.length > 1 && rows[1].t === top.t && rows[1].zk === top.zk;
  const bon = st.players.filter((_, i) => totals(st.cards[i], 0).bonus).map(p => p.name);
  let note = bon.length ? `Üst bölüm bonusu (+${UP_BONUS}): ${bon.join(', ')}.` : 'Kimse üst bölüm bonusunu alamadı.';
  if (st.players.length === 1 || st.players.filter(p => !p.isBot).length === 1) {
    const hi = st.players.findIndex(p => !p.isBot);
    if (hi >= 0) {
      const mine = totals(st.cards[hi], st.zkb[hi]).total, rec = store.get('zar.best', 0);
      if (mine > rec) { store.set('zar.best', mine); note += ` Yeni cihaz rekoru: ${mine} puan!`; } else note += ` Bu cihazdaki rekor: ${rec} puan.`;
    }
  }
  const title = st.players.length === 1 ? `${top.t} puan!` : tie ? 'Berabere!' : `${pname(st, top.i)} kazandı!`;
  return { title, note, ranking: rows.map(r => ({ pi: r.i, score: r.t, label: `${r.t} puan · ${r.zk} Zar Kralı` })) };
}
function writeCat(st, pi, cat, ctx) {
  const card = st.cards[pi], ops = options(card, st.dice, st.joker);
  if (!ops[cat] || !ops[cat].ok) return false;
  const before = totals(card, st.zkb[pi]);
  const v = ops[cat].v, zb = zkBonusFor(card, st.dice);
  card[cat] = v;
  if (zb) st.zkb[pi]++;
  if (isZK(st.dice)) st.zkN[pi]++;
  st.last = { pi, cat, v, id: ++st.lastId };
  nextBot = 1000;
  const nm = pname(st, pi);
  ctx.emit({ t: 'score', pi, cat, v, zb }, `${nm} ${CATS[cat].n} kutusuna ${v} yazdı${zb ? ` ve +${ZK_BONUS} Zar Kralı bonusu aldı` : ''}.`, v === 0 ? 'bad' : (v >= 25 || zb ? 'good' : ''));
  const after = totals(card, st.zkb[pi]);
  if (!before.bonus && after.bonus) ctx.emit({ t: 'bonus', pi }, `${nm} üst bölüm bonusunu kaptı: +${UP_BONUS}!`, 'gold');
  nextTurn(st, ctx);
  return true;
}
function botStep(st, pi, ctx) {
  if (st.rollN === 0) { DEF.action(st, pi, { t: 'roll' }, ctx); return; }
  if (st.rollN < 3) {
    const keep = planKeep(st.cards[pi], st.dice, 3 - st.rollN, st.joker);
    if (keep && keep.length < 5) {
      const want = keepToHeld(st.dice, st.held, keep);
      const i = want.findIndex((w, k) => w !== st.held[k]);
      if (i >= 0) { DEF.action(st, pi, { t: 'hold', i }, ctx); return; }
      DEF.action(st, pi, { t: 'roll' }, ctx); return;
    }
  }
  const b = bestCat(st.cards[pi], st.dice, st.joker);
  let cat = b.cat;
  if (cat < 0) cat = st.cards[pi].findIndex(x => x == null);
  if (!writeCat(st, pi, cat, ctx)) {        // her ihtimale karşı: ilk geçerli kutu
    const ops = options(st.cards[pi], st.dice, st.joker);
    writeCat(st, pi, ops.findIndex(o => o.ok), ctx);
  }
}

DEF = {
  id: 'zar', name: 'Zar Turnuvası', icon: '🎲', color: '#2bff88', min: 1, max: 4, hotseat: true, bot: true, localMin: 1,
  tagline: 'Beş zar, üç atış, on üç kategori',
  rules: 'Her turda beş zarı en fazla üç kez at; atışlar arasında istediğin zarlara dokunup tut. Sonra puan kartında boş bir kategori seç (uymuyorsa 0 yazılır). Üst bölümde 63’e ulaşana +35 bonus; beş aynı zar ZAR KRALI 50 puan. 13 tur sonunda en yüksek toplam kazanır.',
  options: [{ key: 'joker', label: 'Joker kuralı', def: '1', choices: [{ v: '1', label: 'Açık' }, { v: '0', label: 'Kapalı' }] }],
  speed: 1,
  get botDelay() { return T(nextBot); },
  setup(players, opts) {
    nextBot = 900;
    return {
      players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })),
      cards: players.map(() => Array(NC).fill(null)), zkb: players.map(() => 0), zkN: players.map(() => 0),
      dice: [1, 2, 3, 4, 5], held: [false, false, false, false, false], mask: [false, false, false, false, false],
      rollN: 0, rollId: 0, cur: 0, round: 1, phase: 'play', joker: String(opts && opts.joker != null ? opts.joker : '1') !== '0',
      last: null, lastId: 0
    };
  },
  action(st, pi, a, ctx) {
    if (!a || st.phase !== 'play' || pi !== st.cur) return false;
    switch (a.t) {
      case 'roll': if (st.rollN >= 3) return false; doRoll(st, pi, ctx); return true;
      case 'hold': {
        const i = a.i | 0; if (st.rollN < 1 || st.rollN >= 3 || i < 0 || i > 4) return false;
        st.held[i] = !st.held[i]; nextBot = 520;
        ctx.emit({ t: 'hold', pi, i, on: st.held[i] }); ctx.sync(); return true;
      }
      case 'score': {
        const c = a.c | 0; if (st.rollN < 1 || c < 0 || c >= NC) return false;
        return writeCat(st, pi, c, ctx);
      }
      default: return false;
    }
  },
  view(st) {
    const g = CFX.Room && CFX.Room.game;
    const opts = st.phase === 'play' && st.rollN > 0 ? options(st.cards[st.cur], st.dice, st.joker).map(o => (o.ok ? o.v : null)) : null;
    return {
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, online: g && g.players[i] ? g.players[i].online : true,
        card: st.cards[i].slice(), zkN: st.zkN[i], t: totals(st.cards[i], st.zkb[i]), alive: bonusAlive(st.cards[i]) })),
      dice: st.dice.slice(), held: st.held.slice(), mask: st.mask.slice(), rollN: st.rollN, rollId: st.rollId, cur: st.cur, round: st.round, phase: st.phase,
      joker: st.joker, opts, zkb: opts ? zkBonusFor(st.cards[st.cur], st.dice) : 0, last: st.last
    };
  },
  turnOf(st) { return st.phase === 'play' ? st.cur : null; },
  botAct(st, pi, ctx) { if (st.phase === 'play' && st.cur === pi) botStep(st, pi, ctx); },
  skipTurn(st, pi, ctx) {
    if (st.phase !== 'play' || st.cur !== pi) return;
    let guard = 0;
    while (st.phase === 'play' && st.cur === pi && guard++ < 20) botStep(st, pi, ctx);
  },
  resume(st, ctx) { if (st.phase === 'over') ctx.end(result(st)); },
  mount, render, onEvent, unmount
};

/* ---------- arayüz ---------- */
let root = null, ui = null, V = null, E = {}, sel = -1, selKey = '', lastRoll = -1, lastScore = 0, animUntil = 0, animT = null, lastTurnKey = '', justUntil = 0;
const spin = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
const ROT = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, -180] };
const PIPS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const faceHTML = f => `<span class="zr-face zr-f${f}">${PIPS[f].map(p => `<i class="zr-pip p${p}"></i>`).join('')}</span>`;
const miniDie = f => `<span class="zr-mini">${PIPS[f].map(p => `<i class="zr-pip p${p}"></i>`).join('')}</span>`;
const lowMotion = () => document.body.classList.contains('anim-low') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const speedUI = () => (DEF.speed || 1);

function canActNow(v) {
  v = v || V; if (!v || v.phase !== 'play') return false;
  const p = v.players[v.cur];
  return ui.mode === 'local' ? !p.isBot : ui.me === v.cur;
}
function setDie(i, val, animate) {
  const el = E.dice[i]; if (!el) return;
  const cube = el.firstElementChild;
  const [rx, ry] = ROT[val];
  if (animate) { spin[i][0] += 360 * randInt(1, 2); spin[i][1] += 360 * randInt(1, 2); }
  const z = animate ? randInt(-9, 9) : (+el.dataset.z || 0);
  el.dataset.z = z; el.dataset.v = val;
  cube.style.transitionDuration = animate && !lowMotion() ? Math.round(820 * speedUI()) + 'ms' : '0ms';
  cube.style.transform = `rotateZ(${z}deg) rotateX(${rx + spin[i][0]}deg) rotateY(${ry + spin[i][1]}deg)`;
  el.setAttribute('aria-label', `${i + 1}. zar: ${val}`);
  if (animate) { el.classList.remove('tumble'); void el.offsetWidth; el.classList.add('tumble'); }
}
function cellHTML(v, p, pi, cat, canAct, animating) {
  const val = p.card[cat];
  if (val != null) {
    const just = v.last && v.last.pi === pi && v.last.cat === cat && v.last.id === lastScore && Date.now() < justUntil ? ' just' : '';
    return `<td class="zr-v${val === 0 ? ' zero' : ''}${just}">${val}</td>`;
  }
  if (pi === v.cur && v.opts && !animating) {
    const o = v.opts[cat];
    if (o == null) return '<td class="zr-v zr-no">–</td>';
    const cls = `zr-pot${o === 0 ? ' z' : ''}${sel === cat ? ' sel' : ''}`;
    return canAct ? `<td class="zr-v"><button type="button" class="${cls}" data-c="${cat}" aria-label="${esc(CATS[cat].n)}: ${o} puan">${o}</button></td>` : `<td class="zr-v"><span class="${cls}">${o}</span></td>`;
  }
  return '<td class="zr-v zr-e"></td>';
}
function renderCard(v, canAct, animating) {
  const P = v.players, me = ui.me;
  const colCls = i => `zr-pc${i === v.cur && v.phase === 'play' ? ' cur' : ''}${P[i].online === false ? ' off' : ''}`;
  let h = '<thead><tr><th class="zr-cat zr-hcat" scope="col"><span>Kategori</span></th>';
  h += P.map((p, i) => `<th scope="col" class="${colCls(i)}" style="--pc:${p.color}"><span class="zr-ph"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><span class="zr-pn">${esc(p.name)}${me === i ? ' <small>sen</small>' : ''}${p.isBot ? ' <small>🤖</small>' : ''}</span><b class="zr-tot">${p.t.total}</b></span></th>`).join('');
  h += '</tr></thead><tbody>';
  const row = (cat) => {
    const c = CATS[cat], icon = cat < 6 ? miniDie(c.f) : `<span class="zr-ic">${c.ic}</span>`;
    const selRow = sel === cat && canAct ? ' selrow' : '';
    return `<tr class="zr-row${selRow}${cat === 5 || cat === CH ? ' endsec' : ''}" data-row="${cat}"><th scope="row" class="zr-cat">${icon}<span class="zr-cn"><b><span class="lg">${esc(c.n)}</span><span class="sm">${esc(c.s)}</span></b><small>${esc(c.h)}</small></span></th>${P.map((p, i) => cellHTML(v, p, i, cat, canAct, animating).replace('<td class="', `<td class="${i === v.cur && v.phase === 'play' ? 'cur ' : ''}`)).join('')}</tr>`;
  };
  for (let k = 0; k < 6; k++) h += row(k);
  h += `<tr class="zr-sum"><th scope="row" class="zr-cat"><span class="zr-cn"><b>Üst toplam</b><small>63 ve üstü: +35</small></span></th>${P.map((p, i) => `<td class="${i === v.cur && v.phase === 'play' ? 'cur ' : ''}zr-v"><span class="zr-up${p.t.upper >= UP_NEED ? ' ok' : ''}">${p.t.upper}<small>/63</small></span></td>`).join('')}</tr>`;
  h += `<tr class="zr-sum bonus"><th scope="row" class="zr-cat"><span class="zr-cn"><b>Bonus</b></span></th>${P.map((p, i) => `<td class="${i === v.cur && v.phase === 'play' ? 'cur ' : ''}zr-v">${p.t.bonus ? `<b class="zr-bon">+${UP_BONUS}</b>` : (p.alive ? '<span class="zr-dim">·</span>' : '<span class="zr-dim">✗</span>')}</td>`).join('')}</tr>`;
  for (let k = 6; k < NC; k++) h += row(k);
  h += `<tr class="zr-sum"><th scope="row" class="zr-cat"><span class="zr-cn"><b>Zar Kralı bonusu</b><small>Her ek beşli +100</small></span></th>${P.map((p, i) => `<td class="${i === v.cur && v.phase === 'play' ? 'cur ' : ''}zr-v">${p.t.zkb ? `<b class="zr-bon">+${p.t.zkb}</b>` : '<span class="zr-dim">·</span>'}</td>`).join('')}</tr>`;
  h += `<tr class="zr-total"><th scope="row" class="zr-cat"><span class="zr-cn"><b>TOPLAM</b></span></th>${P.map((p, i) => `<td class="${i === v.cur && v.phase === 'play' ? 'cur ' : ''}zr-v" style="--pc:${p.color}">${p.t.total}</td>`).join('')}</tr>`;
  h += '</tbody>';
  E.table.innerHTML = h;
  E.table.dataset.n = P.length;
}
function render(v) {
  const prev = V; V = v;
  const canAct = canActNow(v), P = v.players, cp = P[v.cur];
  // yeni atış: zarları yuvarla
  const rolled = v.rollId !== lastRoll;
  if (rolled) {
    const first = lastRoll === -1 || !prev;
    lastRoll = v.rollId;
    v.dice.forEach((d, i) => setDie(i, d, !first && v.rollN > 0 && v.mask[i]));
    if (!first && v.rollN > 0) {
      animUntil = Date.now() + Math.round(880 * speedUI());
      clearTimeout(animT); animT = setTimeout(() => { animT = null; if (V && root) render(V); }, Math.round(900 * speedUI()));
    }
  } else v.dice.forEach((d, i) => { if (+E.dice[i].dataset.v !== d) setDie(i, d, false); });
  const animating = Date.now() < animUntil;
  // seçim anahtarı değişince seçimi sıfırla
  const key = `${v.cur}:${v.rollId}:${v.round}`;
  if (key !== selKey) { sel = -1; selKey = key; }
  if (sel >= 0 && (!v.opts || v.opts[sel] == null || !canAct)) sel = -1;
  if (v.last && v.last.id !== lastScore) { const firstView = lastScore === 0 && !prev; lastScore = v.last.id; justUntil = firstView ? 0 : Date.now() + 900; }
  // zarlar
  E.dice.forEach((el, i) => {
    el.classList.toggle('held', !!v.held[i] && v.rollN > 0);
    el.disabled = !(canAct && v.rollN >= 1 && v.rollN < 3 && !animating);
    el.classList.toggle('blank', v.rollN === 0);
  });
  E.tray.classList.toggle('can', canAct && v.rollN >= 1 && v.rollN < 3);
  E.tray.style.setProperty('--pc', cp.color);
  // atış sayacı
  E.pips.innerHTML = [1, 2, 3].map(n => `<i class="${n <= v.rollN ? 'used' : ''}"></i>`).join('');
  // durum
  let st;
  if (v.phase === 'over') st = '<span class="g-turn win">Turnuva bitti!</span>';
  else if (canAct) st = `<span class="g-turn mine">⭐ Sıra sende${ui.mode === 'local' && P.filter(p => !p.isBot).length > 1 ? ` · ${esc(cp.name)}` : ''}</span>`;
  else st = `<span class="g-turn">Sıra: <b style="color:${cp.color}">${esc(cp.name)}</b>${cp.isBot ? ' oynuyor…' : ''}</span>`;
  if (E.status.innerHTML !== st) E.status.innerHTML = st;
  E.round.textContent = `Tur ${Math.min(v.round, ROUNDS)} / ${ROUNDS}`;
  // ipucu
  let hint = '';
  if (v.phase === 'play') {
    if (v.rollN === 0) hint = canAct ? 'Zarları at!' : `${esc(cp.name)} zar atacak…`;
    else if (animating) hint = 'Zarlar yuvarlanıyor…';
    else if (canAct && sel >= 0) hint = `<b>${esc(CATS[sel].n)}</b> seçildi · onayla ya da başka kutu seç`;
    else if (canAct && v.rollN < 3) hint = 'Tutmak istediğin zarlara dokun · ya da karttan kutu seç';
    else if (canAct) hint = 'Atış hakkın bitti · karttan bir kutu seç';
    else hint = v.rollN < 3 ? `${esc(cp.name)} ${v.rollN}. atışı yaptı` : `${esc(cp.name)} kutu seçiyor…`;
    if (v.zkb && !animating) hint = `👑 Ek Zar Kralı! Hangi kutuya yazarsan yaz +${ZK_BONUS}` + (canAct ? '' : '');
  }
  if (E.hint.innerHTML !== hint) E.hint.innerHTML = hint;
  // düğmeler
  const rb = E.roll;
  if (v.phase !== 'play') { rb.disabled = true; rb.innerHTML = '🏁 Oyun bitti'; }
  else if (!canAct) { rb.disabled = true; rb.innerHTML = cp.isBot ? '🤖 Bilgisayar oynuyor' : `⏳ ${esc(cp.name)} oynuyor`; }
  else if (v.rollN >= 3) { rb.disabled = true; rb.innerHTML = 'Kutu seç ↓'; }
  else { rb.disabled = animating; rb.innerHTML = `🎲 ZAR AT <small>${v.rollN + 1}/3</small>`; }
  const ok = canAct && sel >= 0 && !animating && v.opts && v.opts[sel] != null;
  E.ok.hidden = !ok;
  if (ok) E.ok.innerHTML = `✔ ${esc(CATS[sel].s)} <small>${v.opts[sel] + (v.zkb || 0)}</small>`;
  E.btns.classList.toggle('two', ok);
  renderCard(v, canAct, animating);
  // sıra değişince (aynı cihazda birden çok insan) ilgili sütunu görünür kıl
  const tk = `${v.cur}:${v.round}`;
  if (tk !== lastTurnKey) {
    lastTurnKey = tk;
    const th = E.table.querySelector('th.cur');
    if (th && E.cardWrap.scrollWidth > E.cardWrap.clientWidth) E.cardWrap.scrollLeft = Math.max(0, th.offsetLeft - 120);
  }
}
function onClick(e) {
  if (!V) return;
  const die = e.target.closest('.zr-die');
  if (die) { if (!die.disabled) { Sound.init(); ui.send({ t: 'hold', i: +die.dataset.i }); } return; }
  const b = e.target.closest('[data-a]');
  if (b) {
    if (b.disabled) return; Sound.init();
    if (b.dataset.a === 'roll') { sel = -1; ui.send({ t: 'roll' }); }
    else if (b.dataset.a === 'ok' && sel >= 0) { const c = sel; sel = -1; ui.send({ t: 'score', c }); }
    return;
  }
  const pot = e.target.closest('button.zr-pot');
  const rowEl = pot || (canActNow() && V.opts ? e.target.closest('tr.zr-row') : null);
  if (rowEl && canActNow() && V.opts && Date.now() >= animUntil) {
    const c = +(pot ? pot.dataset.c : rowEl.dataset.row);
    if (V.opts[c] == null) return;
    Sound.init();
    if (sel === c) { sel = -1; ui.send({ t: 'score', c }); return; }
    sel = c; Sound.tick(.6); render(V);
  }
}
function mount(r, api) {
  root = r; ui = api; V = null; sel = -1; selKey = ''; lastRoll = -1; lastScore = 0; animUntil = 0; lastTurnKey = ''; justUntil = 0;
  root.innerHTML = `<div class="g-wrap zr">
    <div class="zr-layout">
      <section class="zr-dock" aria-label="Zarlar">
        <div class="zr-top"><div class="g-status zr-status"></div><span class="zr-round g-sub"></span></div>
        <div class="zr-tray">
          ${[0, 1, 2, 3, 4].map(i => `<button type="button" class="zr-die" data-i="${i}" aria-label="${i + 1}. zar"><span class="zr-cube">${[1, 2, 3, 4, 5, 6].map(faceHTML).join('')}</span><span class="zr-tag">TUT</span></button>`).join('')}
        </div>
        <p class="zr-hint"></p>
        <div class="zr-btns">
          <button type="button" class="btn btn-spin zr-roll" data-a="roll"></button>
          <button type="button" class="btn btn-solve zr-ok" data-a="ok" hidden></button>
        </div>
        <div class="zr-pips" aria-hidden="true"></div>
      </section>
      <section class="zr-cardwrap" aria-label="Puan kartı"><table class="zr-card"></table></section>
    </div>
  </div>`;
  E = { dice: [...root.querySelectorAll('.zr-die')], tray: root.querySelector('.zr-tray'), status: root.querySelector('.zr-status'), round: root.querySelector('.zr-round'),
    hint: root.querySelector('.zr-hint'), roll: root.querySelector('.zr-roll'), ok: root.querySelector('.zr-ok'), btns: root.querySelector('.zr-btns'),
    pips: root.querySelector('.zr-pips'), table: root.querySelector('.zr-card'), cardWrap: root.querySelector('.zr-cardwrap') };
  for (let i = 0; i < 5; i++) { spin[i][0] = 0; spin[i][1] = 0; setDie(i, i + 1, false); }
  root.addEventListener('click', onClick);
}
function rattle(n) {
  if (!Sound.ok || !Sound.ok('zarRattle', 60)) return;
  for (let k = 0; k < n; k++) Sound.noise(.05, { freq: 1400 + Math.random() * 1600, q: 3, gain: .35, when: k * .07 + Math.random() * .03 });
}
function onEvent(e) {
  const nm = i => (V && V.players[i] ? V.players[i].name.toLocaleUpperCase('tr-TR') : '');
  switch (e.t) {
    case 'roll': {
      rattle(6);
      const d = Math.round(860 * speedUI());
      setTimeout(() => { if (!root) return; Sound.tick(.2); if (e.zk) { Sound.solve(); banner('👑 ZAR KRALI!', 'good'); FX.confetti(90); flash('good'); } }, d);
      break;
    }
    case 'hold': Sound.tick(e.on ? .8 : .3); break;
    case 'score': {
      if (e.zb) { Sound.special(); banner(`+${ZK_BONUS} BONUS!`, 'pink'); }
      else if (e.v === 0) Sound.bad();
      else if (e.cat === ZK) { Sound.solve(); FX.confetti(120); }
      else if (e.v >= 25) Sound.buy(); else Sound.good();
      setTimeout(() => { if (!root) return; const td = root.querySelector('td.just'); if (td && e.v > 0) { const [x, y] = centerOf(td); FX.burst(x, y, e.v >= 25 ? 30 : 14, true); } }, 30);
      break;
    }
    case 'bonus': Sound.solve(); banner(`ÜST BONUS +${UP_BONUS}`, 'good'); break;
    case 'turn':
      if (ui && ui.mode === 'online' && e.pi === ui.me) { Sound.good(); banner('SIRA SENDE', 'good'); }
      else if (ui && ui.mode === 'local' && V && V.players[e.pi] && !V.players[e.pi].isBot) {
        const humans = V.players.filter(p => !p.isBot).length;
        if (humans > 1) banner(nm(e.pi)); else if (V.players.length > 1) banner('SIRA SENDE', 'good');
      }
      break;
    default: break;
  }
}
function unmount() { clearTimeout(animT); animT = null; if (root) root.removeEventListener('click', onClick); root = null; V = null; E = {}; }

CFX.registerGame(DEF);
// testler için kurallar
DEF._rules = { scoreCat, options, totals, bonusAlive, planKeep, bestCat, keepToHeld, STATES };
})();
