/* =========================================================================
   OYUN SALONU — EMLAK KRALI
   24 karelik halka tahtada zar at, şehirleri satın al, renk grubunu
   tamamlayıp ev ve otel kur, kira topla. 2–4 kişi: online, aynı cihazda
   sırayla ya da bilgisayara karşı. Tüm bilgi açıktır (yalnızca Şans destesinin
   sırası gizli kalır).
   ========================================================================= */
(() => {
'use strict';
const { esc, fmt, Sound, FX, banner, flash, initial, randInt, shuffle, centerOf } = CFX;

/* ---------- tahta verisi ---------- */
const N = 24, START = 1500, GO_BONUS = 200, JAIL = 6, JAIL_FEE = 50, HARD_CAP = 150, UTIL_X = 5;
const GROUPS = [
  { n: 'Kahverengi', c: '#b5743f', hc: 50 },
  { n: 'Buz mavisi', c: '#5fd0ff', hc: 50 },
  { n: 'Pembe', c: '#ff5cc8', hc: 100 },
  { n: 'Turuncu', c: '#ff9a1f', hc: 100 },
  { n: 'Kırmızı', c: '#ff3b4e', hc: 150 },
  { n: 'Sarı', c: '#ffe14a', hc: 150 },
  { n: 'Yeşil', c: '#2bd96b', hc: 200 }
];
const P = (n, g, p, r) => ({ k: 'prop', n, g, p, r });
const SQ = [
  { k: 'go', n: 'Başlangıç', s: 'Başla', ic: '🏁' },
  P('Ağrı', 0, 60, [4, 20, 60, 180, 320, 450]),
  { k: 'chance', n: 'Şans', ic: '❓' },
  P('Kars', 0, 80, [6, 30, 90, 270, 400, 550]),
  { k: 'tax', n: 'Gelir Vergisi', s: 'Vergi', ic: '💸', amt: 100 },
  { k: 'port', n: 'Liman', ic: '⚓', p: 200 },
  { k: 'jail', n: 'Nezarethane', s: 'Nezaret', ic: '🚔' },
  P('Sivas', 1, 100, [8, 40, 100, 300, 450, 600]),
  P('Erzurum', 1, 120, [10, 50, 150, 450, 625, 750]),
  { k: 'util', n: 'Elektrik İdaresi', s: 'Elektrik', ic: '💡', p: 150 },
  P('Konya', 2, 140, [12, 60, 180, 500, 700, 900]),
  P('Kayseri', 2, 160, [14, 70, 200, 550, 750, 950]),
  { k: 'park', n: 'Ücretsiz Otopark', s: 'Otopark', ic: '🅿️' },
  P('Trabzon', 3, 180, [16, 80, 220, 600, 800, 1000]),
  { k: 'chance', n: 'Şans', ic: '❓' },
  P('Samsun', 3, 200, [18, 90, 250, 700, 875, 1050]),
  P('Edirne', 4, 220, [20, 100, 300, 750, 925, 1100]),
  P('Bursa', 4, 240, [22, 110, 330, 800, 975, 1150]),
  { k: 'gojail', n: 'Nezarete Git', s: 'Nezarete Git', ic: '👮' },
  P('Antalya', 5, 260, [24, 120, 360, 850, 1025, 1200]),
  P('İzmir', 5, 280, [26, 130, 390, 900, 1100, 1275]),
  { k: 'port', n: 'Tren Garı', s: 'Gar', ic: '🚆', p: 200 },
  P('Ankara', 6, 320, [30, 150, 450, 1000, 1200, 1400]),
  P('İstanbul', 6, 360, [40, 180, 500, 1100, 1300, 1500])
];
const PORT_RENT = [0, 50, 100];
const GM = GROUPS.map((_, g) => SQ.map((s, i) => (s.k === 'prop' && s.g === g ? i : -1)).filter(i => i >= 0));
const BUYABLE = s => s.k === 'prop' || s.k === 'port' || s.k === 'util';
const FREE_ID = 12;
const CARDS = [
  { t: 'Banka hatası lehine! ₺200 al.', k: 'money', v: 200 },
  { t: 'Piyango ikramiyesi: ₺100 kazandın.', k: 'money', v: 100 },
  { t: 'Vergi iadesi: ₺50 al.', k: 'money', v: 50 },
  { t: 'Hız cezası: ₺30 öde.', k: 'money', v: -30 },
  { t: 'Okul harcı: ₺100 öde.', k: 'money', v: -100 },
  { t: 'Diş hekimi faturası: ₺60 öde.', k: 'money', v: -60 },
  { t: 'Başlangıç’a ilerle ve ₺200 al.', k: 'goto', v: 0 },
  { t: 'İstanbul’a ilerle. Başlangıç’tan geçersen ₺200 al.', k: 'goto', v: 23 },
  { t: 'Tren Garı’na ilerle.', k: 'goto', v: 21 },
  { t: 'Konya’ya ilerle. Başlangıç’tan geçersen ₺200 al.', k: 'goto', v: 10 },
  { t: '3 kare geri git.', k: 'back', v: 3 },
  { t: 'Doğruca Nezarethane’ye git! Başlangıç’tan geçme, para alma.', k: 'jail' },
  { t: 'Nezaretten ücretsiz çıkış kartı. Gerektiğinde kullanmak için sakla.', k: 'free' },
  { t: 'Seçim kampanyası: her oyuncuya ₺50 öde.', k: 'payEach', v: 50 },
  { t: 'Doğum günün kutlu olsun! Her oyuncu sana ₺25 verir.', k: 'getEach', v: 25 },
  { t: 'Bina bakımı: her ev için ₺25, her otel için ₺100 öde.', k: 'repair', v: [25, 100] }
];
const TL = n => `₺${fmt(n)}`;
const hcOf = sq => GROUPS[SQ[sq].g].hc;
// 7×7 ızgarada karenin yeri: 0 sağ alt köşe, saat yönünde
function rc(i) { if (i <= 6) return [7, 7 - i]; if (i <= 12) return [7 - (i - 6), 1]; if (i <= 18) return [1, 1 + (i - 12)]; return [1 + (i - 18), 7]; }

/* ---------- ortak kurallar (durum ya da görünüm üzerinde çalışır) ---------- */
const ownsGroup = (S, pi, g) => GM[g].every(i => S.own[i] === pi);
function buildable(S, pi, sq) {
  const s = SQ[sq]; if (!s || s.k !== 'prop' || S.own[sq] !== pi || !ownsGroup(S, pi, s.g) || S.lvl[sq] >= 5) return false;
  return S.lvl[sq] <= Math.min(...GM[s.g].map(i => S.lvl[i]));          // eşit kurma kuralı
}
const canBuild = (S, pi, sq) => buildable(S, pi, sq) && S.players[pi].cash >= hcOf(sq);
const anyBuildable = (S, pi) => SQ.some((_, i) => buildable(S, pi, i));
// Önalım hakkı: rakibin şehrine gelen oyuncu, grubun geri kalanına sahipse (ve grupta bina yoksa) şehri 2 katına satın alabilir
function preemptable(S, pi, sq) {
  const s = SQ[sq], o = S.own[sq]; if (!s || s.k !== 'prop' || o < 0 || o === pi) return false;
  return GM[s.g].every(i => i === sq || S.own[i] === pi) && GM[s.g].every(i => S.lvl[i] === 0);
}
function rentOf(S, sq, diceSum) {
  const s = SQ[sq], o = S.own[sq]; if (o < 0) return 0;
  if (s.k === 'prop') { const l = S.lvl[sq]; return s.r[l] * (l === 0 && ownsGroup(S, o, s.g) ? 2 : 1); }
  if (s.k === 'port') return PORT_RENT[SQ.filter((x, i) => x.k === 'port' && S.own[i] === o).length];
  if (s.k === 'util') return diceSum * UTIL_X;
  return 0;
}
function worth(S, pi) {
  let w = S.players[pi].cash;
  for (let i = 0; i < N; i++) if (S.own[i] === pi) { w += SQ[i].p; if (SQ[i].k === 'prop') w += S.lvl[i] * hcOf(i); }
  return w;
}
const alive = S => S.players.map((p, i) => (p.out ? -1 : i)).filter(i => i >= 0);

/* ---------- yöneten cihaz: akış ---------- */
let DEF = null;
const T = ms => Math.max(5, Math.round(ms * ((DEF && DEF.speed) || 1)));
function schedule(st, ctx, ms, fn) { const s = ++st.seq; ctx.later(T(ms), () => { if (st.seq === s) fn(st, ctx); }); }
const say = (st, t) => { st.msg = t; };
const pname = (st, i) => st.players[i].name;

function doRoll(st, ctx) {
  st.dice = [randInt(1, 6), randInt(1, 6)]; st.rollN++; st.phase = 'rolling';
  say(st, `${pname(st, st.cur)} zar atıyor…`);
  ctx.emit({ t: 'rolling', pi: st.cur });
  ctx.sync();
  schedule(st, ctx, 900, afterRoll);
}
const pathForward = (from, n) => Array.from({ length: n }, (_, k) => (from + k + 1) % N);
function afterRoll(st, ctx) {
  const pi = st.cur, p = st.players[pi], [a, b] = st.dice, sum = a + b, dbl = a === b;
  ctx.emit({ t: 'dice', pi, d: st.dice.slice(), dbl }, `${p.name}: ${a} + ${b} = ${sum}${dbl ? ' · çift!' : ''}`);
  if (p.jail) {
    st.again = false;
    if (dbl) {
      p.jail = false; p.tries = 0;
      ctx.emit({ t: 'jailOut', pi }, `${p.name} çift atarak nezaretten çıktı.`, 'good');
      return startMove(st, ctx, pathForward(p.pos, sum), false);
    }
    p.tries++;
    if (p.tries >= 3) {
      if (!pay(st, ctx, pi, -1, JAIL_FEE)) return finishLanding(st, ctx);
      p.jail = false; p.tries = 0;
      ctx.emit({ t: 'jailOut', pi }, `${p.name} 3 denemede çift atamadı, ${JAIL_FEE} ₺ ödeyip çıktı.`, 'gold');
      return startMove(st, ctx, pathForward(p.pos, sum), false);
    }
    say(st, `${p.name} çift atamadı (${p.tries}/3). Nezarette kalıyor.`);
    st.phase = 'end'; ctx.sync(); return;
  }
  if (dbl) {
    st.dbl++;
    if (st.dbl >= 3) { toJail(st, ctx, pi); say(st, `Üst üste 3. çift! ${p.name} doğruca nezarete.`); st.phase = 'end'; ctx.sync(); return; }
    st.again = true;
  } else st.again = false;
  startMove(st, ctx, pathForward(p.pos, sum), false);
}
function startMove(st, ctx, path, back) {
  const pi = st.cur, p = st.players[pi];
  st.mv = { pi, from: p.pos, path, id: ++st.mvN, go: !back && path.includes(0) };
  p.pos = path[path.length - 1];
  st.phase = 'moving';
  ctx.sync();
  schedule(st, ctx, 175 * path.length + 280, land);
}
function land(st, ctx) {
  const mv = st.mv, pi = st.cur, p = st.players[pi]; st.mv = null;
  if (mv && mv.go) { p.cash += GO_BONUS; st.bank += GO_BONUS; ctx.emit({ t: 'go', pi }, `${p.name} Başlangıç’tan geçti: +${TL(GO_BONUS)}`, 'gold'); }
  resolveSquare(st, ctx);
}
function resolveSquare(st, ctx) {
  const pi = st.cur, p = st.players[pi], sq = p.pos, s = SQ[sq];
  switch (s.k) {
    case 'go': say(st, `${p.name} Başlangıç’ta. +${TL(GO_BONUS)}`); break;
    case 'jail': say(st, `${p.name} nezarethaneyi ziyaret ediyor.`); break;
    case 'park': say(st, `${p.name} otoparkta soluklanıyor.`); break;
    case 'gojail': toJail(st, ctx, pi); say(st, `${p.name} nezarete gönderildi!`); break;
    case 'tax':
      say(st, `${p.name} ${TL(s.amt)} gelir vergisi ödedi.`);
      ctx.emit({ t: 'tax', pi, amt: s.amt }, `${p.name} ${TL(s.amt)} vergi ödedi.`, 'bad');
      pay(st, ctx, pi, -1, s.amt); break;
    case 'chance': return drawCard(st, ctx);
    default: {
      const o = st.own[sq];
      if (o < 0) {
        if (p.cash >= s.p) { st.offer = sq; st.offerFrom = -1; st.price = s.p; st.phase = 'buy'; say(st, `${s.n} satılık: ${TL(s.p)}`); ctx.sync(); return; }
        say(st, `${p.name}, ${s.n} için yeterli paraya sahip değil.`); break;
      }
      if (o === pi) { say(st, `${p.name} kendi mülkünde: ${s.n}.`); break; }
      const rent = rentOf(st, sq, st.dice[0] + st.dice[1]);
      say(st, `${p.name}, ${s.n} için ${pname(st, o)} oyuncusuna ${TL(rent)} kira ödedi.`);
      ctx.emit({ t: 'rent', from: pi, to: o, amt: rent, sq }, `${p.name} → ${pname(st, o)}: ${s.n} kirası ${TL(rent)}`, 'bad');
      if (pay(st, ctx, pi, o, rent) && preemptable(st, pi, sq) && p.cash >= s.p * 2) {
        // Önalım hakkı: grubun diğer şehri sendeyse bu şehri sahibinden 2 katına alabilirsin
        st.offer = sq; st.offerFrom = o; st.price = s.p * 2; st.phase = 'buy';
        st.msg += ` Önalım hakkın var: ${s.n} şehrini ${pname(st, o)} oyuncusundan ${TL(st.price)} karşılığında alabilirsin.`;
        ctx.sync(); return;
      }
    }
  }
  finishLanding(st, ctx);
}
function finishLanding(st, ctx) {
  if (st.phase === 'over') return;
  const p = st.players[st.cur];
  if (p.out) { st.again = false; endTurn(st, ctx); return; }
  if (st.again && !p.jail) { st.phase = 'roll'; st.msg += ' Çift attın, tekrar zar at!'; }
  else { st.phase = 'end'; st.again = false; }
  st.offer = -1; st.offerFrom = -1;
  ctx.sync();
}
function endTurn(st, ctx) {
  if (st.phase === 'over') return;
  const n = st.players.length; let j = st.cur;
  do { j = (j + 1) % n; } while (st.players[j].out && j !== st.cur);
  if (j <= st.cur) st.round++;
  st.turns++;
  if ((st.limit && st.round > st.limit) || st.round > HARD_CAP) { finishGame(st, ctx, 'limit'); return; }
  st.cur = j; st.phase = 'roll'; st.dbl = 0; st.again = false; st.offer = -1;
  const p = st.players[j];
  say(st, p.jail ? `${p.name} nezarette: ${JAIL_FEE} ₺ öde${p.cards ? ', kartını kullan' : ''} ya da çift dene.` : `Sıra ${p.name} oyuncusunda.`);
  ctx.emit({ t: 'turn', pi: j });
  ctx.sync();
}
function toJail(st, ctx, pi) {
  const p = st.players[pi]; p.pos = JAIL; p.jail = true; p.tries = 0; st.again = false; st.dbl = 0;
  ctx.emit({ t: 'jail', pi }, `${p.name} nezarete gönderildi!`, 'bad');
}
function drawCard(st, ctx) {
  const pi = st.cur, id = st.deck.shift();
  if (id !== FREE_ID) st.deck.push(id);
  st.card = { id, pi, n: ++st.cardN }; st.phase = 'card';
  say(st, `${pname(st, pi)} bir Şans kartı çekti.`);
  ctx.emit({ t: 'card', pi, id }, `${pname(st, pi)} Şans kartı çekti: “${CARDS[id].t}”`, 'gold');
  ctx.sync();
  schedule(st, ctx, 2000, applyCard);
}
function applyCard(st, ctx) {
  const c = CARDS[st.card.id], pi = st.cur, p = st.players[pi];
  say(st, `Şans: ${c.t}`);
  switch (c.k) {
    case 'money': if (c.v > 0) { p.cash += c.v; st.bank += c.v; } else pay(st, ctx, pi, -1, -c.v); break;
    case 'goto': return startMove(st, ctx, pathForward(p.pos, (c.v - p.pos + N) % N || N), false);
    case 'back': return startMove(st, ctx, Array.from({ length: c.v }, (_, k) => (p.pos - k - 1 + N) % N), true);
    case 'jail': toJail(st, ctx, pi); break;
    case 'free': p.cards++; break;
    case 'payEach': for (const o of alive(st)) { if (o !== pi && !pay(st, ctx, pi, o, c.v)) break; } break;
    case 'getEach': for (const o of alive(st)) { if (o !== pi) pay(st, ctx, o, pi, c.v); if (st.phase === 'over') break; } break;
    case 'repair': {
      let amt = 0; for (let i = 0; i < N; i++) if (st.own[i] === pi) amt += st.lvl[i] === 5 ? c.v[1] : st.lvl[i] * c.v[0];
      if (amt > 0) { st.msg += ` Toplam ${TL(amt)}.`; pay(st, ctx, pi, -1, amt); } else st.msg += ' Binan yok, ödeme yok!';
      break;
    }
    default: break;
  }
  finishLanding(st, ctx);
}
// Ödeme: yetmezse evler yarı fiyatına satılır, yine yetmezse iflas. to = -1 banka.
function pay(st, ctx, from, to, amt) {
  const p = st.players[from];
  if (p.cash < amt) raise(st, ctx, from, amt);
  if (p.cash >= amt) { p.cash -= amt; if (to >= 0) st.players[to].cash += amt; else st.bank -= amt; return true; }
  bankrupt(st, ctx, from, to); return false;
}
function raise(st, ctx, pi, amt) {
  const p = st.players[pi];
  while (p.cash < amt) {
    let best = -1;
    for (let i = 0; i < N; i++) if (st.own[i] === pi && st.lvl[i] > 0 && (best < 0 || st.lvl[i] > st.lvl[best] || (st.lvl[i] === st.lvl[best] && hcOf(i) > hcOf(best)))) best = i;
    if (best < 0) break;
    const back = hcOf(best) / 2; st.lvl[best]--; p.cash += back; st.bank += back;
    ctx.emit({ t: 'sell', pi, sq: best }, `${p.name} borcu için ${SQ[best].n} üzerindeki bir binayı sattı (+${TL(back)}).`, 'bad');
  }
}
function bankrupt(st, ctx, pi, to) {
  const p = st.players[pi], left = p.cash; p.cash = 0;
  if (to >= 0) st.players[to].cash += left; else st.bank -= left;
  for (let i = 0; i < N; i++) if (st.own[i] === pi) { st.own[i] = -1; st.lvl[i] = 0; }
  for (; p.cards > 0; p.cards--) st.deck.push(FREE_ID);
  p.out = true; p.jail = false; p.outN = ++st.outN;
  say(st, `${p.name} iflas etti!`);
  ctx.emit({ t: 'bankrupt', pi }, `${p.name} İFLAS ETTİ! ${to >= 0 && left > 0 ? `Kalan ${TL(left)} ${pname(st, to)} oyuncusuna geçti; ` : ''}mülkleri bankaya döndü.`, 'bad');
  if (alive(st).length <= 1) finishGame(st, ctx, 'bankrupt');
}
function ranking(st) {
  const live = alive(st).sort((a, b) => worth(st, b) - worth(st, a));
  const outs = st.players.map((p, i) => i).filter(i => st.players[i].out).sort((a, b) => st.players[b].outN - st.players[a].outN);
  return live.map(i => ({ pi: i, score: worth(st, i), label: TL(worth(st, i)) })).concat(outs.map(i => ({ pi: i, score: 0, label: 'İflas' })));
}
function result(st) {
  const rk = ranking(st), w = st.players[rk[0].pi].name;
  const played = st.why === 'limit' ? `${st.round - 1} tur tamamlandı.` : `Oyun ${st.round}. turda bitti.`;
  return { title: st.why === 'bankrupt' ? `${w} emlak kralı oldu!` : `${w} en zengin oyuncu!`, ranking: rk,
    note: `${played} Net değer = nakit + mülk fiyatları + bina maliyetleri.` };
}
function finishGame(st, ctx, why) {
  if (st.phase === 'over') return;
  st.phase = 'over'; st.why = why; st.mv = null; st.offer = -1;
  const top = ranking(st)[0];
  say(st, why === 'bankrupt' ? `${pname(st, top.pi)} rakiplerini iflas ettirdi!` : `Süre doldu! En zengin: ${pname(st, top.pi)} (${TL(top.score)})`);
  ctx.emit({ t: 'over', pi: top.pi }, st.msg, 'gold');
  ctx.sync();
  schedule(st, ctx, 1600, () => ctx.end(result(st)));
}

/* ---------- arayüz ---------- */
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
let root = null, ui = null, V = null, E = {}, sqCache = [], toks = [], animT = null, animPi = -1, lastMv = 0,
  rollT = null, rollAnimN = -1, buildMode = false, popSq = -1, lastCash = [], lastKey = '';

const dieHTML = f => Array.from({ length: 9 }, (_, k) => `<i class="${PIPS[f].includes(k) ? 'on' : ''}"></i>`).join('');
function setDice(d) { E.dice.forEach((el, k) => { const f = d[k]; if (el.dataset.f !== String(f)) { el.dataset.f = f; el.innerHTML = dieHTML(f); } }); }
function stopRoll() { if (rollT) { clearInterval(rollT); rollT = null; } E.dice && E.dice.forEach(el => el.classList.remove('roll')); }
function startRoll() {
  stopRoll(); E.dice.forEach(el => el.classList.add('roll'));
  rollT = setInterval(() => { if (!root) return stopRoll(); setDice([randInt(1, 6), randInt(1, 6)]); Sound.tick(.8); }, T(80));
}
function sqName(s) { return esc(s.s || s.n); }
function sqInner(v, i) {
  const s = SQ[i], o = v.own[i], l = v.lvl[i];
  if (s.k === 'prop') {
    const houses = l === 5 ? '<i class="ht"></i>' : '<i class="h"></i>'.repeat(l);
    const pr = o >= 0 ? `<i class="od" style="--oc:${v.players[o].color}"></i>${TL(rentOf(v, i, 7))}` : TL(s.p);
    return `<span class="band" style="--gc:${GROUPS[s.g].c}">${houses}</span><span class="nm">${sqName(s)}</span><span class="pr">${pr}</span>`;
  }
  let pr = '';
  if (s.k === 'port' || s.k === 'util') pr = o >= 0 ? `<i class="od" style="--oc:${v.players[o].color}"></i>${s.k === 'util' ? '×' + UTIL_X : TL(rentOf(v, i, 7))}` : TL(s.p);
  else if (s.k === 'tax') pr = TL(s.amt);
  else if (s.k === 'go') pr = '+' + TL(GO_BONUS);
  return `<span class="ic">${s.ic}</span><span class="nm">${sqName(s)}</span>${pr ? `<span class="pr">${pr}</span>` : ''}`;
}
function renderSquares(v, canAct) {
  const offer = v.phase === 'buy' ? v.offer : -1;
  E.sqs.forEach((el, i) => {
    const h = sqInner(v, i); if (sqCache[i] !== h) { sqCache[i] = h; el.innerHTML = h; }
    const o = v.own[i];
    el.classList.toggle('own', o >= 0);
    if (o >= 0) el.style.setProperty('--oc', v.players[o].color); else el.style.removeProperty('--oc');
    el.classList.toggle('can-build', buildMode && canAct && canBuild(v, v.cur, i));
    el.classList.toggle('offer', i === offer);
    el.classList.toggle('sel', i === popSq);
  });
}
function actionsHTML(v, canAct) {
  if (!canAct) return '';
  const p = v.players[v.cur], b = [];
  const buildBtn = () => {
    if (!anyBuildable(v, v.cur)) return;
    const can = SQ.some((_, i) => canBuild(v, v.cur, i));
    b.push(buildMode ? '<button type="button" class="btn btn-ghost" data-a="buildMode">✓ Bitti</button>'
      : `<button type="button" class="btn btn-solve" data-a="buildMode" ${can ? '' : 'disabled'}>🏠 Ev Kur</button>`);
  };
  if (v.phase === 'roll') {
    if (p.jail) {
      b.push('<button type="button" class="btn btn-spin" data-a="roll">🎲 Çift Dene</button>');
      b.push(`<button type="button" class="btn btn-vowel" data-a="jailPay" ${p.cash >= JAIL_FEE ? '' : 'disabled'}>${JAIL_FEE} ₺ öde ve çık</button>`);
      if (p.cards > 0) b.push('<button type="button" class="btn btn-vowel" data-a="jailCard">🎫 Kartı Kullan</button>');
    } else b.push(`<button type="button" class="btn btn-spin" data-a="roll">🎲 ${v.dbl > 0 ? 'Tekrar Zar At' : 'Zar At'}</button>`);
    buildBtn();
  } else if (v.phase === 'buy') {
    b.push(`<button type="button" class="btn btn-spin" data-a="buy" ${p.cash >= v.price ? '' : 'disabled'}>Satın Al ${TL(v.price)}</button>`);
    b.push('<button type="button" class="btn btn-ghost" data-a="pass">Pas Geç</button>');
  } else if (v.phase === 'end') {
    b.push('<button type="button" class="btn btn-spin" data-a="end">Turu Bitir ➜</button>');
    buildBtn();
  }
  if (b.length % 2 === 1) b[0] = b[0].replace('class="btn ', 'class="btn wide ');
  return b.join('');
}
function infoHTML(v, canAct) {
  if (v.phase === 'card' && v.card) {
    return `<div class="ek-card"><b>❓ ŞANS</b><span>${esc(CARDS[v.card.id].t)}</span></div>`;
  }
  if (v.phase === 'buy' && v.offer >= 0) {
    const s = SQ[v.offer], band = s.k === 'prop' ? GROUPS[s.g].c : '#9aa3c7';
    const sub = v.offerFrom >= 0 ? `Önalım: ${esc(v.players[v.offerFrom].name)} oyuncusundan 2 katına` : s.k === 'prop' ? `Kira ${TL(s.r[0])} · grup tamamsa ${TL(s.r[0] * 2)}` : s.k === 'port' ? `Kira ${TL(PORT_RENT[1])} · ikisi birden ${TL(PORT_RENT[2])}` : `Kira: zar toplamı × ${UTIL_X}`;
    return `<div class="ek-offer" style="--gc:${band}"><span class="ob">${s.k === 'prop' ? '' : s.ic}</span><span class="ot"><b>${esc(s.n)}</b><small>${sub}</small></span><span class="op">${TL(v.price)}</span></div>`;
  }
  if (buildMode && canAct) return '<p class="ek-msg hint">Ev kurmak için parlayan bir mülke dokun.</p>';
  return `<p class="ek-msg">${esc(v.msg || '')}</p>`;
}
function renderCenter(v, canAct) {
  const P2 = v.players, cp = P2[v.cur];
  let turn;
  if (v.phase === 'over') turn = '<span class="ek-turn over">🏆 Oyun bitti</span>';
  else if (canAct) turn = `<span class="ek-turn mine"><span class="av" style="--pc:${cp.color}">${initial(cp.name)}</span>${ui.mode === 'local' ? `${esc(cp.name)}, sıra sende` : 'Sıra sende'}</span>`;
  else turn = `<span class="ek-turn"><span class="av" style="--pc:${cp.color}">${initial(cp.name)}</span>Sıra: <b style="color:${cp.color}">${esc(cp.name)}</b>${cp.isBot && ['roll', 'buy', 'end'].includes(v.phase) ? ' düşünüyor…' : ''}</span>`;
  if (E.turn.innerHTML !== turn) E.turn.innerHTML = turn;
  if (v.phase === 'rolling') { if (rollAnimN !== v.rollN) { rollAnimN = v.rollN; startRoll(); } }
  else { stopRoll(); rollAnimN = v.rollN; setDice(v.dice); }
  E.dice.forEach(el => el.classList.toggle('dbl', v.phase !== 'rolling' && v.dice[0] === v.dice[1] && v.rollN > 0));
  const info = infoHTML(v, canAct); if (E.info.innerHTML !== info) E.info.innerHTML = info;
  const acts = actionsHTML(v, canAct); if (E.acts.innerHTML !== acts) E.acts.innerHTML = acts;
  E.acts.hidden = !acts;
}
function placeTok(i, sq) { const el = toks[i]; if (!el) return; const [r, c] = rc(sq); el.style.setProperty('--x', c - 1); el.style.setProperty('--y', r - 1); }
function stopAnim() { if (animT) { clearTimeout(animT); animT = null; } animPi = -1; }
function animateMove(mv) {
  stopAnim(); animPi = mv.pi; placeTok(mv.pi, mv.from);
  let k = 0;
  const step = () => {
    if (!root) return;
    placeTok(mv.pi, mv.path[k]); Sound.tick(.5); k++;
    if (k < mv.path.length) animT = setTimeout(step, T(170));
    else { animT = null; animPi = -1; if (V) renderTokens(V); }
  };
  animT = setTimeout(step, T(60));
}
function renderTokens(v) {
  v.players.forEach((p, i) => {
    if (!toks[i]) {
      const t = document.createElement('span'); t.className = 'ek-tok';
      t.style.setProperty('--pc', p.color); t.style.setProperty('--ox', (0.03 + i * 0.21).toFixed(2));
      const ini = q => (q.name.trim().charAt(0) || '?').toLocaleUpperCase('tr-TR');
      t.textContent = v.players.filter(q => ini(q) === ini(p)).length > 1 ? String(i + 1) : ini(p);
      E.toks.appendChild(t); toks[i] = t; placeTok(i, p.pos);
    }
    const t = toks[i];
    t.hidden = p.out;
    t.classList.toggle('cur', i === v.cur && v.phase !== 'over');
    t.classList.toggle('jailed', p.jail);
    if (i !== animPi) placeTok(i, p.pos);
  });
  if (v.mv && v.mv.id !== lastMv) { lastMv = v.mv.id; animateMove(v.mv); }
}
function renderPlayers(v) {
  const me = ui.me;
  E.pl.innerHTML = v.players.map((p, i) => {
    const n = v.own.filter(o => o === i).length;
    const d = lastCash[i] == null ? 0 : p.cash - lastCash[i];
    const tags = [p.out ? 'İFLAS' : `${n} mülk`]; if (p.jail) tags.push('🚔'); if (p.cards) tags.push('🎫');
    return `<div class="ek-pl ${i === v.cur && v.phase !== 'over' ? 'active' : ''} ${p.out ? 'out' : ''} ${p.online === false ? 'off' : ''}" style="--pc:${p.color}">
      <span class="av" style="--pc:${p.color}">${initial(p.name)}</span>
      <span class="ek-pt"><b>${esc(p.name)}${me === i ? ' · sen' : ''}${p.isBot ? ' 🤖' : ''}</b>
        <span class="ek-meta"><span class="ek-cash ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${TL(p.cash)}${d ? `<em>${d > 0 ? '+' : '−'}${fmt(Math.abs(d))}</em>` : ''}</span><small>${tags.join(' ')}</small></span></span></div>`;
  }).join('');
  lastCash = v.players.map(p => p.cash);
  E.round.textContent = v.limit ? `Tur ${Math.min(v.round, v.limit)} / ${v.limit}` : `Tur ${v.round} · iflasa kadar`;
}
function popHTML(v, canAct) {
  const i = popSq, s = SQ[i], o = v.own[i], l = v.lvl[i];
  const band = s.k === 'prop' ? GROUPS[s.g].c : '#9aa3c7';
  let body = '';
  if (s.k === 'prop') {
    const lab = ['Arsa', '1 ev', '2 ev', '3 ev', '4 ev', 'Otel'];
    body += `<p class="pp">Fiyat <b>${TL(s.p)}</b> · Ev/otel <b>${TL(GROUPS[s.g].hc)}</b></p>`;
    body += `<div class="rt">${s.r.map((r, k) => `<span class="${o >= 0 && k === l ? 'on' : ''}">${lab[k]}<b>${TL(r)}</b></span>`).join('')}</div>`;
    body += `<p class="pp small">Grup: ${GM[s.g].map(k => esc(SQ[k].n)).join(' + ')}. İkisi de sendeyse boş arsada kira 2 kat; biri sendeyse diğerini önalımla 2 katına alabilirsin.</p>`;
  } else if (s.k === 'port') body = `<p class="pp">Fiyat <b>${TL(s.p)}</b></p><div class="rt"><span>1 ulaşım<b>${TL(PORT_RENT[1])}</b></span><span>2 ulaşım<b>${TL(PORT_RENT[2])}</b></span></div><p class="pp small">Liman ve Tren Garı aynı kişideyse kira artar.</p>`;
  else if (s.k === 'util') body = `<p class="pp">Fiyat <b>${TL(s.p)}</b></p><p class="pp">Kira: atılan zar toplamı × ${UTIL_X}</p>`;
  else body = `<p class="pp">${{ go: `Üstünden geçince ya da üstüne gelince ${TL(GO_BONUS)} al.`, jail: `Sadece ziyaret. Nezarettekiler ${JAIL_FEE} ₺ öder, kart kullanır ya da çift atmayı dener (en fazla 3 deneme).`,
    park: 'Dinlenme alanı: hiçbir şey olmaz.', gojail: 'Doğruca Nezarethane’ye git! Başlangıç’tan geçme, para alma.', tax: `Bankaya ${TL(s.amt || 0)} öde.`, chance: 'Bir Şans kartı çek: para, ceza, ışınlanma ya da nezaret…' }[s.k]}</p>`;
  if (BUYABLE(s)) body += `<p class="pp">Sahibi: ${o >= 0 ? `<b style="color:${v.players[o].color}">${esc(v.players[o].name)}</b>${s.k === 'prop' ? ` · ${l === 5 ? 'otel' : l + ' ev'}` : ''} · kira ${s.k === 'util' ? `zar × ${UTIL_X}` : TL(rentOf(v, i, 7))}` : 'banka (satılık)'}</p>`;
  let foot = '';
  if (canAct && (v.phase === 'roll' || v.phase === 'end') && buildable(v, v.cur, i)) {
    foot = `<div class="pf"><button type="button" class="btn btn-solve" data-a="build" data-sq="${i}" ${canBuild(v, v.cur, i) ? '' : 'disabled'}>${l === 4 ? '🏨 Otel Kur' : '🏠 Ev Kur'} ${TL(hcOf(i))}</button></div>`;
  }
  return `<div class="ph" style="--gc:${band}"><span>${s.k === 'prop' ? '' : s.ic} ${esc(s.n)}</span><button type="button" class="px" data-a="close" aria-label="Kapat">✕</button></div><div class="pb">${body}</div>${foot}`;
}
function renderPop(v, canAct) {
  if (popSq < 0) { E.pop.hidden = true; return; }
  const h = popHTML(v, canAct); if (E.pop.innerHTML !== h) E.pop.innerHTML = h;
  E.pop.hidden = false;
}
function render(v) {
  const prev = V; V = v;
  const cp = v.players[v.cur];
  const canAct = ['roll', 'buy', 'end'].includes(v.phase) && !cp.out && (ui.mode === 'local' ? !cp.isBot : ui.me === v.cur);
  if (!canAct || v.phase === 'buy' || !anyBuildable(v, v.cur)) buildMode = false;
  const key = v.phase + ':' + v.cur;
  if (prev && key !== lastKey && canAct && (v.phase === 'buy' || prev.cur !== v.cur)) popSq = -1;
  lastKey = key;
  root.querySelector('.ek').classList.toggle('build', buildMode);
  renderSquares(v, canAct);
  renderCenter(v, canAct);
  renderTokens(v);
  renderPlayers(v);
  renderPop(v, canAct);
}
function canActNow() {
  const v = V; if (!v) return false; const cp = v.players[v.cur];
  return ['roll', 'buy', 'end'].includes(v.phase) && !cp.out && (ui.mode === 'local' ? !cp.isBot : ui.me === v.cur);
}
function onClick(e) {
  const b = e.target.closest('[data-a]');
  if (b) {
    if (b.disabled) return;
    const a = b.dataset.a; Sound.init();
    if (a === 'close') { popSq = -1; }
    else if (a === 'buildMode') { buildMode = !buildMode; if (buildMode) popSq = -1; }
    else if (a === 'build') ui.send({ t: 'build', sq: +b.dataset.sq });
    else ui.send({ t: a });
    if (V) render(V);
    return;
  }
  const sq = e.target.closest('.ek-sq');
  if (sq) {
    const i = +sq.dataset.sq;
    if (buildMode && V && canActNow() && canBuild(V, V.cur, i)) { ui.send({ t: 'build', sq: i }); return; }
    popSq = popSq === i ? -1 : i;
    if (V) render(V);
  }
}
function mount(r, api) {
  root = r; ui = api; V = null; sqCache = []; toks = []; lastMv = 0; rollAnimN = -1; buildMode = false; popSq = -1; lastCash = []; lastKey = '';
  const sqs = SQ.map((s, i) => { const [row, col] = rc(i); return `<button type="button" class="ek-sq k-${s.k} ${i % 6 === 0 ? 'corner' : ''}" data-sq="${i}" style="grid-row:${row};grid-column:${col}" aria-label="${esc(s.n)}"></button>`; }).join('');
  root.innerHTML = `<div class="g-wrap ek">
    <div class="ek-layout">
      <aside class="ek-side">
        <div class="ek-players"></div>
        <p class="g-sub ek-round"></p>
      </aside>
      <div class="ek-boardwrap"><div class="ek-board">${sqs}
        <div class="ek-center">
          <div class="ek-top"></div>
          <div class="ek-dice"><div class="ek-die"></div><div class="ek-die"></div></div>
          <div class="ek-info"></div>
          <div class="ek-actions"></div>
          <div class="ek-pop" hidden></div>
        </div>
        <div class="ek-toks"></div>
      </div></div>
    </div>
  </div>`;
  E = { sqs: [...root.querySelectorAll('.ek-sq')], turn: root.querySelector('.ek-top'), dice: [...root.querySelectorAll('.ek-die')], info: root.querySelector('.ek-info'),
    acts: root.querySelector('.ek-actions'), pop: root.querySelector('.ek-pop'), toks: root.querySelector('.ek-toks'), pl: root.querySelector('.ek-players'), round: root.querySelector('.ek-round') };
  setDice([3, 4]);
  root.addEventListener('click', onClick);
}
function burstAt(sq, gold = true) { const el = E.sqs && E.sqs[sq]; if (!el) return; const [x, y] = centerOf(el); FX.burst(x, y, 26, gold); }

DEF = {
  id: 'emlak', name: 'Emlak Kralı', icon: '🏙️', color: '#ffb627', min: 2, max: 4, hotseat: true, bot: true, localMin: 1,
  tagline: 'Şehirleri satın al, otel dik, rakiplerini iflas ettir',
  rules: 'Zar at, tahtada ilerle. Boş şehirleri satın al; aynı renkteki iki şehre sahip olunca ev ve otel kurabilirsin. Rakibinin mülküne gelen kira öder; grubun diğer şehri sendeyse önalım hakkıyla o şehri 2 katına alabilirsin. Parası biten iflas eder. Süre dolunca en yüksek net değere sahip oyuncu kazanır.',
  options: [{ key: 'limit', label: 'Süre', def: '25', choices: [{ v: '15', label: '15 tur' }, { v: '25', label: '25 tur' }, { v: '40', label: '40 tur' }, { v: '0', label: 'İflasa kadar' }] }],
  speed: 1,
  get botDelay() { return T(850); },
  setup(players, opts) {
    const lim = opts && opts.limit != null && opts.limit !== '' ? +opts.limit : 25;
    return {
      players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot, cash: START, pos: 0, jail: false, tries: 0, cards: 0, out: false, outN: 0 })),
      own: Array(N).fill(-1), lvl: Array(N).fill(0),
      cur: 0, phase: 'roll', dice: [3, 4], rollN: 0, dbl: 0, again: false, offer: -1, offerFrom: -1, price: 0, mv: null, mvN: 0, card: null, cardN: 0,
      round: 1, limit: Number.isFinite(lim) ? lim : 25, deck: shuffle(CARDS.map((_, i) => i)), msg: `Herkese ${TL(START)}! ${players[0].name} başlıyor.`,
      bank: 0, outN: 0, seq: 0, turns: 0, why: ''
    };
  },
  action(st, pi, a, ctx) {
    if (!a || st.phase === 'over' || pi !== st.cur) return false;
    const p = st.players[pi]; if (!p || p.out) return false;
    switch (a.t) {
      case 'roll': if (st.phase !== 'roll') return false; doRoll(st, ctx); return true;
      case 'jailPay':
        if (st.phase !== 'roll' || !p.jail || p.cash < JAIL_FEE) return false;
        p.cash -= JAIL_FEE; st.bank -= JAIL_FEE; p.jail = false; p.tries = 0;
        say(st, `${p.name} ${JAIL_FEE} ₺ ödeyip nezaretten çıktı. Şimdi zar at!`);
        ctx.emit({ t: 'jailOut', pi }, `${p.name} ${JAIL_FEE} ₺ ödeyerek nezaretten çıktı.`, 'gold'); ctx.sync(); return true;
      case 'jailCard':
        if (st.phase !== 'roll' || !p.jail || p.cards < 1) return false;
        p.cards--; st.deck.push(FREE_ID); p.jail = false; p.tries = 0;
        say(st, `${p.name} ücretsiz çıkış kartını kullandı. Şimdi zar at!`);
        ctx.emit({ t: 'jailOut', pi }, `${p.name} ücretsiz çıkış kartıyla nezaretten çıktı.`, 'good'); ctx.sync(); return true;
      case 'buy': {
        if (st.phase !== 'buy') return false;
        const sq = st.offer, s = SQ[sq], from = st.offerFrom, price = st.price;
        if (!s || !BUYABLE(s) || p.cash < price) return false;
        if (from >= 0) {
          if (st.own[sq] !== from || !preemptable(st, pi, sq) || price !== s.p * 2) return false;
          p.cash -= price; st.players[from].cash += price; st.own[sq] = pi;
          say(st, `${p.name} önalım hakkını kullandı: ${s.n} artık onun (${pname(st, from)} oyuncusuna ${TL(price)}).`);
          ctx.emit({ t: 'buy', pi, sq, from }, `${p.name}, ${s.n} şehrini ${pname(st, from)} oyuncusundan ${TL(price)} karşılığında aldı (önalım).`, 'gold');
        } else {
          if (st.own[sq] !== -1 || price !== s.p) return false;
          p.cash -= price; st.bank -= price; st.own[sq] = pi;
          say(st, `${p.name}, ${s.n} mülkünü ${TL(price)} karşılığında satın aldı.`);
          ctx.emit({ t: 'buy', pi, sq }, `${p.name} ${s.n} aldı (${TL(price)}).`, 'good');
        }
        if (s.k === 'prop' && ownsGroup(st, pi, s.g)) { st.msg += ` ${GROUPS[s.g].n} grubu tamam: artık ev kurabilir!`; ctx.emit({ t: 'group', pi, g: s.g }, `${p.name} ${GROUPS[s.g].n} grubunu tamamladı!`, 'gold'); }
        finishLanding(st, ctx); return true;
      }
      case 'pass': {
        if (st.phase !== 'buy') return false;
        const s = SQ[st.offer];
        say(st, `${p.name}, ${s.n} için pas geçti.`);
        ctx.emit({ t: 'pass', pi }, `${p.name} ${s.n} almadı.`);
        finishLanding(st, ctx); return true;
      }
      case 'build': {
        if (st.phase !== 'roll' && st.phase !== 'end') return false;
        const sq = a.sq | 0; if (sq < 0 || sq >= N || !canBuild(st, pi, sq)) return false;
        const hc = hcOf(sq); p.cash -= hc; st.bank -= hc; st.lvl[sq]++;
        const l = st.lvl[sq];
        say(st, `${p.name}, ${SQ[sq].n} üzerine ${l === 5 ? 'OTEL' : l + '. evi'} kurdu. Kira artık ${TL(rentOf(st, sq, 7))}.`);
        ctx.emit({ t: 'build', pi, sq, lvl: l }, `${p.name} ${SQ[sq].n} üzerine ${l === 5 ? 'otel' : l + '. evi'} kurdu (${TL(hc)}).`, 'good');
        ctx.sync(); return true;
      }
      case 'end': if (st.phase !== 'end') return false; endTurn(st, ctx); return true;
      default: return false;
    }
  },
  view(st) {
    return { players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, cash: p.cash, pos: p.pos, jail: p.jail, tries: p.tries, cards: p.cards, out: p.out,
      online: CFX.Room.game && CFX.Room.game.players[i] ? CFX.Room.game.players[i].online : true })),
      own: st.own.slice(), lvl: st.lvl.slice(), cur: st.cur, phase: st.phase, dice: st.dice.slice(), rollN: st.rollN, dbl: st.dbl, again: st.again, offer: st.offer, offerFrom: st.offerFrom, price: st.price,
      mv: st.mv, card: st.phase === 'card' ? st.card : null, msg: st.msg, round: st.round, limit: st.limit };
  },
  turnOf(st) { return ['roll', 'buy', 'end'].includes(st.phase) ? st.cur : null; },
  botAct(st, pi, ctx) {
    const p = st.players[pi], act = a => this.action(st, pi, a, ctx);
    if (st.cur !== pi || p.out) return;
    if (st.phase === 'buy') {
      const sq = st.offer, s = SQ[sq], price = st.price;
      let reserve = 150;
      if (s.k === 'prop') {
        const mates = GM[s.g].filter(i => i !== sq);
        if (mates.every(i => st.own[i] === pi)) reserve = 30;                 // grubu tamamlar
        else if (mates.some(i => st.own[i] >= 0)) reserve = 120;              // rakibin grubunu bozar
        else reserve = 100;
      }
      if (st.round > 12 && st.offerFrom < 0) reserve += 60;
      if (p.cash - price >= reserve && act({ t: 'buy' })) return;
      act({ t: 'pass' }); return;
    }
    if (st.phase === 'roll' || st.phase === 'end') {
      const opts = SQ.map((_, i) => i).filter(i => canBuild(st, pi, i)).sort((a, b) => st.lvl[a] - st.lvl[b] || SQ[b].p - SQ[a].p);
      const reserve = 140 + 40 * (alive(st).length - 1);
      if (opts.length && p.cash - hcOf(opts[0]) >= reserve && act({ t: 'build', sq: opts[0] })) return;
      if (st.phase === 'roll') {
        if (p.jail) {
          if (p.cards > 0 && act({ t: 'jailCard' })) return;
          const free = SQ.filter((s, i) => BUYABLE(s) && st.own[i] < 0).length;
          if (p.cash >= 300 && (free >= 4 || Math.random() < .35) && act({ t: 'jailPay' })) return;
        }
        if (!act({ t: 'roll' })) endTurn(st, ctx);
        return;
      }
      if (!act({ t: 'end' })) endTurn(st, ctx);
    }
  },
  skipTurn(st, pi, ctx) {
    if (st.cur !== pi || st.phase === 'over') return;
    if (st.phase === 'buy') this.action(st, pi, { t: 'pass' }, ctx);
    if (st.cur === pi && (st.phase === 'roll' || st.phase === 'end')) { st.again = false; endTurn(st, ctx); }
  },
  resume(st, ctx) {
    if (st.phase === 'rolling') schedule(st, ctx, 300, afterRoll);
    else if (st.phase === 'moving') schedule(st, ctx, 300, land);
    else if (st.phase === 'card') schedule(st, ctx, 600, applyCard);
    else if (st.phase === 'over') ctx.end(result(st));
  },
  mount, render,
  onEvent(e) {
    const nm = i => (V && V.players[i] ? V.players[i].name.toLocaleUpperCase('tr-TR') : '');
    switch (e.t) {
      case 'rolling': Sound.whoosh(); break;
      case 'dice': if (e.dbl) { Sound.special(); banner('ÇİFT!', 'pink'); } else Sound.stop(); break;
      case 'go': Sound.good(); burstAt(0); break;
      case 'buy': Sound.buy(); burstAt(e.sq); break;
      case 'group': Sound.solve(); banner('GRUP TAMAM!', 'good'); break;
      case 'rent': Sound.bad(); if (e.amt >= 300) { flash('bad'); banner(`KİRA ${TL(e.amt)}`, 'bad'); } break;
      case 'tax': case 'sell': Sound.bad(); break;
      case 'card': Sound.special(); break;
      case 'jail': Sound.bad(); banner('NEZARETE!', 'bad'); break;
      case 'jailOut': Sound.good(); break;
      case 'build': Sound.buy(); burstAt(e.sq); if (e.lvl === 5) { banner('OTEL!', 'good'); FX.confetti(60); } break;
      case 'bankrupt': Sound.bankrupt(); flash('bad'); banner(`${nm(e.pi)} İFLAS!`, 'bad'); break;
      case 'turn':
        if (ui && ui.mode === 'online' && e.pi === ui.me) { Sound.good(); banner('SIRA SENDE', 'good'); }
        else if (ui && ui.mode === 'local' && V && V.players.filter(p => !p.isBot).length > 1 && !V.players[e.pi].isBot) banner(nm(e.pi));
        break;
      case 'over': Sound.solve(); FX.confetti(120); break;
      default: break;
    }
  },
  unmount() { stopAnim(); stopRoll(); if (root) root.removeEventListener('click', onClick); root = null; V = null; E = {}; toks = []; }
};
CFX.registerGame(DEF);
})();
