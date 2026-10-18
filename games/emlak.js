/* =========================================================================
   OYUN SALONU — EMLAK KRALI 2
   40 karelik klasik halka tahta (Türkiye / İstanbul Semtleri / Dünya
   Şehirleri). Zar at, mülk al, açık artırmaya çıkar, takas yap, ipotek et,
   eşit inşaat kuralıyla ev-otel (Mega'da gökdelen) dik, rakiplerini iflas
   ettir. Modlar: Klasik, Hızlı, Mega (hız zarı), Kaos (şehir olayları).
   2–6 kişi: online, aynı cihazda sırayla ya da bilgisayara karşı.
   Tüm bilgi açıktır; yalnızca kart destelerinin sırası gizli kalır.
   ========================================================================= */
(() => {
'use strict';
const { esc, fmt, Sound, FX, banner, flash, initial, randInt, shuffle, centerOf } = CFX;

/* ------------------------------------------------------------------ veri */
const N = 40, GO_BONUS = 200, JAIL = 10, PARK = 20, GOJAIL = 30, JAIL_FEE = 50, HARD_CAP = 150;
const GROUPS = [
  { n: 'Kahverengi', c: '#b8743f', hc: 50 },
  { n: 'Buz Mavisi', c: '#62d6ff', hc: 50 },
  { n: 'Pembe', c: '#ff4fc3', hc: 100 },
  { n: 'Turuncu', c: '#ff9a1f', hc: 100 },
  { n: 'Kırmızı', c: '#ff3b4e', hc: 150 },
  { n: 'Sarı', c: '#ffe14a', hc: 150 },
  { n: 'Yeşil', c: '#2bd96b', hc: 200 },
  { n: 'Lacivert', c: '#5b7cff', hc: 200 }
];
const RENT = [
  [2, 10, 30, 90, 160, 250], [4, 20, 60, 180, 320, 450],
  [6, 30, 90, 270, 400, 550], [6, 30, 90, 270, 400, 550], [8, 40, 100, 300, 450, 600],
  [10, 50, 150, 450, 625, 750], [10, 50, 150, 450, 625, 750], [12, 60, 180, 500, 700, 900],
  [14, 70, 200, 550, 750, 950], [14, 70, 200, 550, 750, 950], [16, 80, 220, 600, 800, 1000],
  [18, 90, 250, 700, 875, 1050], [18, 90, 250, 700, 875, 1050], [20, 100, 300, 750, 925, 1100],
  [22, 110, 330, 800, 975, 1150], [22, 110, 330, 800, 975, 1150], [24, 120, 360, 850, 1025, 1200],
  [26, 130, 390, 900, 1100, 1275], [26, 130, 390, 900, 1100, 1275], [28, 150, 450, 1000, 1200, 1400],
  [35, 175, 500, 1100, 1300, 1500], [50, 200, 600, 1400, 1700, 2000]
];
const PRICE = [60, 60, 100, 100, 120, 140, 140, 160, 180, 180, 200, 220, 220, 240, 260, 260, 280, 300, 300, 320, 350, 400];
const LAYOUT = ['go', 'p0', 'k', 'p0', 'tax', 't', 'p1', 's', 'p1', 'p1', 'jail', 'p2', 'u', 'p2', 'p2', 't', 'p3', 'k', 'p3', 'p3',
  'park', 'p4', 's', 'p4', 'p4', 't', 'p5', 'p5', 'u', 'p5', 'gojail', 'p6', 'p6', 'k', 'p6', 't', 's', 'p7', 'tax', 'p7'];
const BOARDS = {
  tr: { n: 'Türkiye', ic: '🇹🇷', props: ['Ağrı', 'Kars', 'Van', 'Erzurum', 'Sivas', 'Malatya', 'Diyarbakır', 'Kayseri', 'Samsun', 'Trabzon', 'Gaziantep',
    'Adana', 'Mersin', 'Konya', 'Eskişehir', 'Bursa', 'Kocaeli', 'Antalya', 'Bodrum', 'İzmir', 'Ankara', 'İstanbul'],
    trans: [['Havalimanı', '✈️'], ['Liman', '⚓'], ['Tren Garı', '🚆'], ['Otogar', '🚌']], util: [['Elektrik', '💡'], ['Su İdaresi', '🚰']] },
  ist: { n: 'İstanbul Semtleri', ic: '🌉', props: ['Esenyurt', 'Sultangazi', 'Bağcılar', 'Zeytinburnu', 'Eyüpsultan', 'Fatih', 'Kartal', 'Maltepe', 'Üsküdar', 'Ataşehir', 'Bakırköy',
    'Şişli', 'Beyoğlu', 'Kadıköy', 'Moda', 'Cihangir', 'Nişantaşı', 'Levent', 'Etiler', 'Yeniköy', 'Arnavutköy', 'Bebek'],
    trans: [['Havalimanı', '✈️'], ['Vapur İskelesi', '⛴️'], ['Marmaray', '🚇'], ['Metrobüs', '🚌']], util: [['Elektrik', '💡'], ['Su İdaresi', '🚰']] },
  dunya: { n: 'Dünya Şehirleri', ic: '🌍', props: ['Kahire', 'Delhi', 'Bangkok', 'Rio', 'Meksiko', 'Atina', 'Lizbon', 'Prag', 'Berlin', 'Madrid', 'Roma',
    'Barselona', 'Amsterdam', 'Viyana', 'Seul', 'Sidney', 'Dubai', 'Paris', 'Singapur', 'Tokyo', 'Londra', 'New York'],
    trans: [['Havalimanı', '✈️'], ['Liman', '🚢'], ['Hızlı Tren', '🚄'], ['Uzay Üssü', '🚀']], util: [['Güneş Enerjisi', '☀️'], ['Su İdaresi', '💧']] }
};
// yapısal kare listesi (tüm tahtalarda aynı; yalnızca adlar değişir)
const SQ = []; (() => { let pi = 0, ti = 0, ui2 = 0, xi = 0;
  LAYOUT.forEach((k, i) => {
    if (/^p\d$/.test(k)) { SQ.push({ k: 'prop', g: +k[1], p: PRICE[pi], r: RENT[pi], pi: pi++ }); return; }
    if (k === 't') { SQ.push({ k: 'tr', p: 200, ti: ti++ }); return; }
    if (k === 'u') { SQ.push({ k: 'ut', p: 150, ui: ui2++ }); return; }
    if (k === 'tax') { SQ.push({ k: 'tax', amt: xi++ === 0 ? 200 : 100 }); return; }
    SQ.push({ k });
  }); })();
const GM = GROUPS.map((_, g) => SQ.map((s, i) => (s.k === 'prop' && s.g === g ? i : -1)).filter(i => i >= 0));
const TRANS = SQ.map((s, i) => (s.k === 'tr' ? i : -1)).filter(i => i >= 0);
const UTILS = SQ.map((s, i) => (s.k === 'ut' ? i : -1)).filter(i => i >= 0);
const BUYABLE = i => { const k = SQ[i] && SQ[i].k; return k === 'prop' || k === 'tr' || k === 'ut'; };
const ALLBUY = SQ.map((_, i) => i).filter(BUYABLE);
const SKY = r => Math.round(r[5] * 1.5 / 50) * 50;           // Mega: gökdelen kirası
const rentTable = (s, mega) => mega ? s.r.concat([SKY(s.r)]) : s.r;
const LVL_NAME = ['Arsa', '1 ev', '2 ev', '3 ev', '4 ev', 'Otel', 'Gökdelen'];
function sqName(board, i) {
  const s = SQ[i], B = BOARDS[board] || BOARDS.tr;
  switch (s.k) {
    case 'prop': return B.props[s.pi];
    case 'tr': return B.trans[s.ti][0];
    case 'ut': return B.util[s.ui][0];
    case 'tax': return s.amt === 200 ? 'Gelir Vergisi' : 'Lüks Vergisi';
    case 'go': return 'Başlangıç';
    case 'jail': return 'Hapis';
    case 'park': return 'Ücretsiz Otopark';
    case 'gojail': return 'Hapse Git';
    case 's': return 'Şans';
    case 'k': return 'Kader';
    default: return '?';
  }
}
function sqIcon(board, i) {
  const s = SQ[i], B = BOARDS[board] || BOARDS.tr;
  return { tr: () => B.trans[s.ti][1], ut: () => B.util[s.ui][1], tax: () => (s.amt === 200 ? '💸' : '💎'), go: () => '🏁', jail: () => '🔒', park: () => '🅿️', gojail: () => '👮', s: () => '❓', k: () => '🎁' }[s.k]?.() || '';
}

/* ---------- kartlar ({sayı} → o karenin adı) ---------- */
const DECKS = {
  s: [
    { k: 'goto', v: 0, t: 'Yol açık, kasa dolu! Başlangıç’a ilerle ve 200 ₺ al.' },
    { k: 'goto', v: 39, t: 'Lüks hayat çağırıyor! Hedef: {39}. Başlangıç’tan geçersen 200 ₺ al.' },
    { k: 'goto', v: 24, t: 'Hafta sonu kaçamağı! Hedef: {24}. Başlangıç’tan geçersen 200 ₺ al.' },
    { k: 'goto', v: 11, t: 'Eski bir dost seni bekliyor. Hedef: {11}. Başlangıç’tan geçersen 200 ₺ al.' },
    { k: 'nearT', t: 'Bavulunu kap! En yakın ulaşım noktasına git. Sahibi varsa kiranın 2 katını öde, yoksa satın alabilirsin.' },
    { k: 'nearT', t: 'Son çağrı anonsu! En yakın ulaşım noktasına koş. Sahibi varsa 2 kat kira öde.' },
    { k: 'nearU', t: 'Faturalar kapıda! En yakın tesise git. Sahibi varsa attığın zarın 10 katını öde.' },
    { k: 'money', v: 50, t: 'Kumbaran meyvesini verdi: bankadan 50 ₺ temettü al.' },
    { k: 'free', t: 'Avukatın çok iyi! Hapisten Ücretsiz Çıkış kartı. Sakla, kullan ya da takasta sat.' },
    { k: 'back', v: 3, t: 'Anahtarı evde unuttun! 3 kare geri dön.' },
    { k: 'jail', t: 'Kırmızı ışıkta geçtin! Doğruca hapse git. Başlangıç’tan geçme, 200 ₺ alma.' },
    { k: 'repair', v: [25, 100], t: 'Genel tadilat zamanı: her ev için 25 ₺, her otel için 100 ₺ öde.' },
    { k: 'money', v: -15, t: 'Yanlış yere park ettin, çekici geldi: 15 ₺ ceza.' },
    { k: 'goto', v: 5, t: 'Uçuşun kalkıyor! Hedef: {5}. Başlangıç’tan geçersen 200 ₺ al.' },
    { k: 'payEach', v: 50, t: 'Mahalle muhtarı seçildin! Kutlama çayı için her oyuncuya 50 ₺ öde.' },
    { k: 'shield', t: 'Kira Kalkanı! 🛡️ Ödemen gereken bir sonraki kira silinir.' }
  ],
  k: [
    { k: 'goto', v: 0, t: 'Yepyeni bir başlangıç! Başlangıç’a ilerle ve 200 ₺ al.' },
    { k: 'money', v: 200, t: 'Banka hesabına yanlışlıkla fazla para yatırdı: 200 ₺ senin!' },
    { k: 'money', v: -50, t: 'Diş hekimi randevusu: 50 ₺ öde. Gülüşün buna değer.' },
    { k: 'money', v: 50, t: 'Eski telefonunu ikinci elde sattın: 50 ₺ al.' },
    { k: 'free', t: 'Hapisten Ücretsiz Çıkış kartı. Saklayabilir ya da takasta kullanabilirsin.' },
    { k: 'jail', t: 'Vergi müfettişi kapıda! Doğruca hapse git, Başlangıç’tan geçme.' },
    { k: 'money', v: 100, t: 'Tatil fonun olgunlaştı: 100 ₺ al.' },
    { k: 'money', v: 20, t: 'Vergi iaden geldi: 20 ₺ al.' },
    { k: 'getEach', v: 10, t: 'Doğum günün kutlu olsun! Her oyuncu sana 10 ₺ hediye eder.' },
    { k: 'money', v: 100, t: 'Uzak bir akrabandan miras kaldı: 100 ₺ al.' },
    { k: 'money', v: -100, t: 'Komşunun düğününde altın taktın: 100 ₺ öde.' },
    { k: 'money', v: -50, t: 'Okul aile birliğine bağış: 50 ₺ öde.' },
    { k: 'money', v: 25, t: 'Mahallede çay ocağı açtın, ilk günden kâr: 25 ₺ al.' },
    { k: 'repair', v: [40, 115], t: 'Belediye kaldırım çalışması: her ev için 40 ₺, her otel için 115 ₺ öde.' },
    { k: 'money', v: 10, t: 'Mahalle güzellik yarışmasında ikinci oldun: 10 ₺ al.' },
    { k: 'perProp', v: 10, t: 'Ev Sahibi Bonusu: sahip olduğun her mülk için 10 ₺ al.' }
  ]
};
const DECK_NAME = { s: 'ŞANS', k: 'KADER' };
const cardText = (board, d, id) => DECKS[d][id].t.replace(/\{(\d+)\}/g, (_, n) => sqName(board, +n));

/* ---------- Kaos: şehir olayları (bir tur sürer) ---------- */
const EVENTS = {
  deprem: { ic: '🌋', n: 'Deprem', d: 'Binalı bir renk grubunda her mülk 1 bina kaybetti.' },
  turizm: { ic: '🏖️', n: 'Turizm Patlaması', d: 'Bu tur bir bölgede kiralar 2 katı!' },
  kriz: { ic: '📉', n: 'Ekonomik Kriz', d: 'Herkes nakdinin %10’unu vergi olarak öder.' },
  festival: { ic: '🎉', n: 'Şehir Festivali', d: 'Herkese 100 ₺ festival ikramiyesi!' },
  fuar: { ic: '🏷️', n: 'Emlak Fuarı', d: 'Bu tur bankadaki mülkler %30 indirimli.' },
  grev: { ic: '🚧', n: 'Ulaşım Grevi', d: 'Bu tur ulaşım kiraları sıfır.' },
  dondurma: { ic: '🧊', n: 'Kira Dondurma', d: 'Bu tur tüm kiralar yarıya iner.' },
  bayram: { ic: '🍬', n: 'Bayram Harçlığı', d: 'En az nakdi olan oyuncu bankadan 200 ₺ alır.' },
  imar: { ic: '🏗️', n: 'İmar Affı', d: 'Bu tur ev ve otel maliyetleri yarı fiyatına.' },
  bonus: { ic: '💰', n: 'Altın Saat', d: 'Bu tur Başlangıç’tan geçen 400 ₺ alır.' }
};
const REGION = ['Güney', 'Batı', 'Kuzey', 'Doğu'];

/* ------------------------------------------------------------------ kurallar (durum ya da görünüm üzerinde çalışır) */
const TL = n => `${fmt(Math.round(n))} ₺`;
const hcOf = (S, sq) => { const h = GROUPS[SQ[sq].g].hc; return S && S.event && S.event.id === 'imar' ? h / 2 : h; };
const maxLvl = S => (S.mode === 'mega' ? 6 : 5);
const ownsGroup = (S, pi, g) => GM[g].every(i => S.own[i] === pi);
const groupClean = (S, g) => GM[g].every(i => S.lvl[i] === 0);
const tradable = (S, sq) => BUYABLE(sq) && (SQ[sq].k !== 'prop' || groupClean(S, SQ[sq].g));
function buildable(S, pi, sq) {
  const s = SQ[sq]; if (!s || s.k !== 'prop' || S.own[sq] !== pi || !ownsGroup(S, pi, s.g) || S.lvl[sq] >= maxLvl(S)) return false;
  if (GM[s.g].some(i => S.mort[i])) return false;
  return S.lvl[sq] <= Math.min(...GM[s.g].map(i => S.lvl[i]));          // eşit inşaat kuralı
}
const canBuild = (S, pi, sq) => buildable(S, pi, sq) && S.players[pi].cash >= hcOf(S, sq);
const sellable = (S, pi, sq) => { const s = SQ[sq]; return s && s.k === 'prop' && S.own[sq] === pi && S.lvl[sq] > 0 && S.lvl[sq] >= Math.max(...GM[s.g].map(i => S.lvl[i])); };
const mortgageable = (S, pi, sq) => BUYABLE(sq) && S.own[sq] === pi && !S.mort[sq] && (SQ[sq].k !== 'prop' || groupClean(S, SQ[sq].g));
const unmortCost = sq => Math.ceil(SQ[sq].p * 11 / 100) * 5;
const canUnmort = (S, pi, sq) => BUYABLE(sq) && S.own[sq] === pi && S.mort[sq] && S.players[pi].cash >= unmortCost(sq);
const priceOf = (S, sq) => (S.event && S.event.id === 'fuar' ? Math.round(SQ[sq].p * 0.7 / 5) * 5 : SQ[sq].p);
const forcePrice = sq => Math.round(SQ[sq].p * 1.5 / 5) * 5;
function forceable(S, pi, sq) {
  const s = SQ[sq], o = S.own[sq];
  if (!S.cfg.force || !BUYABLE(sq) || o < 0 || o === pi || S.mort[sq]) return false;
  return s.k !== 'prop' || groupClean(S, s.g);
}
function rentOf(S, sq, diceSum, mul) {
  const s = SQ[sq], o = S.own[sq]; if (o < 0 || S.mort[sq]) return 0;
  let r = 0;
  if (s.k === 'prop') { const l = S.lvl[sq]; r = l === 0 ? s.r[0] * (ownsGroup(S, o, s.g) ? 2 : 1) : rentTable(s, true)[l]; }
  else if (s.k === 'tr') { const n = TRANS.filter(i => S.own[i] === o).length; r = 25 * 2 ** (n - 1); if (S.event && S.event.id === 'grev') r = 0; }
  else if (s.k === 'ut') { const n = UTILS.filter(i => S.own[i] === o).length; r = diceSum * (mul === 10 ? 10 : n === 2 ? 10 : 4); }
  if (mul === 2 && s.k === 'tr') r *= 2;
  if (S.event) {
    if (S.event.id === 'turizm' && Math.floor(sq / 10) === S.event.reg) r *= 2;
    if (S.event.id === 'dondurma') r = Math.round(r / 2);
  }
  return r;
}
function worth(S, pi) {
  let w = S.players[pi].cash;
  for (let i = 0; i < N; i++) if (S.own[i] === pi) { w += S.mort[i] ? SQ[i].p / 2 : SQ[i].p; if (SQ[i].k === 'prop') w += S.lvl[i] * GROUPS[SQ[i].g].hc; }
  return Math.round(w);
}
// borç için en çok toplanabilecek para (evler yarı fiyat + ipotekler)
function liquid(S, pi) {
  let w = S.players[pi].cash;
  for (let i = 0; i < N; i++) if (S.own[i] === pi) { if (SQ[i].k === 'prop') w += S.lvl[i] * GROUPS[SQ[i].g].hc / 2; if (!S.mort[i]) w += SQ[i].p / 2; }
  return w;
}
const alive = S => S.players.map((p, i) => (p.out ? -1 : i)).filter(i => i >= 0);
const owned = (S, pi) => ALLBUY.filter(i => S.own[i] === pi);
const isMono = (S, g) => { const o = S.own[GM[g][0]]; return o >= 0 && ownsGroup(S, o, g); };

/* ------------------------------------------------------------------ yöneten cihaz: akış */
let DEF = null;
const T = ms => Math.max(5, Math.round(ms * ((DEF && DEF.speed) || 1)));
const now = () => (DEF && DEF.clock ? DEF.clock() : Date.now());
const DICE_MS = 1350, CARD_MS = 2300;
function schedule(st, ctx, ms, fn) { const s = ++st.seq; ctx.later(T(ms), () => { if (st.seq === s) fn(st, ctx); }); }
const say = (st, t) => { st.msg = t; };
const pn = (st, i) => (st.players[i] ? st.players[i].name : '?');
const nm = (st, i) => sqName(st.board, i);
const pathForward = (from, n) => Array.from({ length: n }, (_, k) => (from + k + 1) % N);
const pathTo = (from, to) => pathForward(from, (to - from + N) % N || N);

function give(st, pi, amt) { st.players[pi].cash += amt; st.minted += amt; }
// bankaya ödeme (nakit yeterli olmalı); pot: Otopark kumbarasına gidebilir mi
function toBank(st, pi, amt, pot) {
  st.players[pi].cash -= amt;
  if (pot && st.cfg.jackpot) st.pot += amt; else st.minted -= amt;
}
function transfer(st, from, to, amt) { st.players[from].cash -= amt; st.players[to].cash += amt; }

// Borç: to = [{pi, amt}] (pi -1 = banka, -2 = banka/otopark kumbarası)
function charge(st, ctx, pi, amt, toPi, next, why) {
  const tos = Array.isArray(toPi) ? toPi : [{ pi: toPi, amt }];
  const total = tos.reduce((a, x) => a + x.amt, 0);
  if (total <= 0) return true;
  const p = st.players[pi];
  if (p.cash >= total) { settle(st, pi, tos); return true; }
  if (pi === st.cur && liquid(st, pi) >= total) {
    st.debt = { pi, amt: total, to: tos, next: next || 'finish', why: why || 'Borç' };
    st.phase = 'debt';
    say(st, `${p.name} ${TL(total)} borçlu (${why || 'ödeme'}). Ev sat, ipotek et ya da iflas et.`);
    ctx.emit({ t: 'debt', pi, amt: total }, `${p.name} borcunu ödeyemiyor: ${TL(total)}. Para toplaması gerekiyor.`, 'bad');
    ctx.sync();
    return 'wait';
  }
  autoRaise(st, ctx, pi, total);
  if (p.cash >= total) { settle(st, pi, tos); return true; }
  const cred = tos.length === 1 && tos[0].pi >= 0 ? tos[0].pi : -1;
  bankrupt(st, ctx, pi, cred);
  return false;
}
function settle(st, pi, tos) {
  for (const x of tos) {
    if (x.pi >= 0) { if (st.players[x.pi].out) toBank(st, pi, x.amt, false); else transfer(st, pi, x.pi, x.amt); }
    else toBank(st, pi, x.amt, x.pi === -2);
  }
}
// para topla: önce evleri (eşit kurala uyarak) sat, sonra ipotek et (en az değerliden)
function autoRaise(st, ctx, pi, amt) {
  const p = st.players[pi];
  let guard = 200;
  while (p.cash < amt && guard-- > 0) {
    const sells = owned(st, pi).filter(i => sellable(st, pi, i));
    if (sells.length) { sells.sort((a, b) => st.lvl[b] - st.lvl[a] || GROUPS[SQ[a].g].hc - GROUPS[SQ[b].g].hc); doSell(st, ctx, pi, sells[0], true); continue; }
    const morts = owned(st, pi).filter(i => mortgageable(st, pi, i));
    if (morts.length) { morts.sort((a, b) => botKeep(st, pi, a) - botKeep(st, pi, b)); doMortgage(st, ctx, pi, morts[0], true); continue; }
    break;
  }
}
function doSell(st, ctx, pi, sq, auto) {
  const back = GROUPS[SQ[sq].g].hc / 2; st.lvl[sq]--; give(st, pi, back);
  ctx.emit({ t: 'sell', pi, sq, lvl: st.lvl[sq] }, `${pn(st, pi)} ${nm(st, sq)} üzerindeki bir binayı ${auto ? 'borç için ' : ''}sattı (+${TL(back)}).`, auto ? 'bad' : '');
}
function doMortgage(st, ctx, pi, sq, auto) {
  st.mort[sq] = true; give(st, pi, SQ[sq].p / 2);
  ctx.emit({ t: 'mort', pi, sq }, `${pn(st, pi)} ${nm(st, sq)} mülkünü ${auto ? 'borç için ' : ''}ipotek etti (+${TL(SQ[sq].p / 2)}).`, auto ? 'bad' : '');
}

function doRoll(st, ctx) {
  const p = st.players[st.cur];
  st.dice = [randInt(1, 6), randInt(1, 6)];
  st.sd = st.mode === 'mega' && !p.jail ? randInt(1, 6) : 0;
  st.rollN++; st.phase = 'rolling';
  say(st, `${p.name} zar atıyor…`);
  ctx.emit({ t: 'rolling', pi: st.cur, d: st.dice.slice(), sd: st.sd });
  ctx.sync();
  schedule(st, ctx, DICE_MS, afterRoll);
}
const sdLabel = f => (f >= 1 && f <= 3 ? String(f) : f === 6 ? 'Bay Para' : 'Otobüs');
function afterRoll(st, ctx) {
  const pi = st.cur, p = st.players[pi], [a, b] = st.dice, sum = a + b, dbl = a === b, sd = st.sd;
  ctx.emit({ t: 'dice', pi, d: st.dice.slice(), sd, dbl }, `${p.name}: ${a} + ${b}${sd ? ` · hız zarı ${sdLabel(sd)}` : ''}${dbl ? ' · ÇİFT!' : ''}`);
  if (p.jail) {
    st.again = false;
    if (dbl) {
      p.jail = false; p.tries = 0;
      ctx.emit({ t: 'jailOut', pi }, `${p.name} çift atarak hapisten çıktı!`, 'good');
      return startMove(st, ctx, pathForward(p.pos, sum));
    }
    p.tries++;
    if (p.tries >= 3) {
      say(st, `${p.name} 3. denemede de çift atamadı: ${TL(JAIL_FEE)} ödeyip çıkıyor.`);
      const r = charge(st, ctx, pi, JAIL_FEE, -2, 'jailMove', 'hapis cezası');
      if (r === 'wait') return;
      if (r === false) return finishLanding(st, ctx);
      return jailMove(st, ctx);
    }
    say(st, `${p.name} çift atamadı (${p.tries}/3). Hapiste kalıyor.`);
    st.phase = 'end'; ctx.sync(); return;
  }
  if (dbl) {
    st.dbl++;
    if (st.dbl >= 3) { toJail(st, ctx, pi, 'Üst üste 3 çift! Hız sınırı aşıldı.'); return finishLanding(st, ctx); }
    st.again = true;
  } else st.again = false;
  if (sd >= 1 && sd <= 3) {
    if (a === b && b === sd) {
      st.again = false; st.phase = 'pick';
      say(st, `ÜÇLÜ ${a}! ${p.name} tahtada istediği kareye ışınlanabilir.`);
      ctx.emit({ t: 'triple', pi }, `${p.name} üçlü attı: istediği kareye gidecek!`, 'gold');
      ctx.sync(); return;
    }
    return startMove(st, ctx, pathForward(p.pos, sum + sd));
  }
  if (sd === 4 || sd === 5) {
    st.phase = 'bus';
    say(st, `Otobüs bileti! ${p.name}: ${a}, ${b} ya da ${sum} kare ilerlemeyi seç.`);
    ctx.sync(); return;
  }
  if (sd === 6) st.mr = true;
  startMove(st, ctx, pathForward(p.pos, sum));
}
function jailMove(st, ctx) {
  const p = st.players[st.cur]; p.jail = false; p.tries = 0;
  ctx.emit({ t: 'jailOut', pi: st.cur }, `${p.name} ${TL(JAIL_FEE)} ödeyip hapisten çıktı.`, 'gold');
  startMove(st, ctx, pathForward(p.pos, st.dice[0] + st.dice[1]));
}
function startMove(st, ctx, path, back, jump) {
  const pi = st.cur, p = st.players[pi];
  const step = jump ? 0 : Math.max(90, Math.min(240, Math.round(3200 / path.length)));
  st.mv = { pi, from: p.pos, path, id: ++st.mvN, go: !back && !jump && path.includes(0), step, jump: !!jump };
  p.pos = path[path.length - 1];
  st.phase = 'moving';
  ctx.sync();
  schedule(st, ctx, jump ? 900 : step * path.length + 350, land);
}
function land(st, ctx) {
  const mv = st.mv, pi = st.cur, p = st.players[pi]; st.mv = null;
  if (mv && mv.go) {
    const bonus = st.event && st.event.id === 'bonus' ? GO_BONUS * 2 : GO_BONUS;
    give(st, pi, bonus);
    ctx.emit({ t: 'go', pi, amt: bonus }, `${p.name} Başlangıç’tan geçti: +${TL(bonus)}`, 'gold');
  }
  resolveSquare(st, ctx);
}
function resolveSquare(st, ctx) {
  const pi = st.cur, p = st.players[pi], sq = p.pos, s = SQ[sq];
  const mul = st.mul; st.mul = 0;
  switch (s.k) {
    case 'go': say(st, `${p.name} tam Başlangıç’ta!`); break;
    case 'jail': say(st, `${p.name} hapishaneyi ziyaret ediyor.`); break;
    case 'park':
      if (st.cfg.jackpot && st.pot > 0) {
        const amt = st.pot; st.pot = 0; p.cash += amt;
        say(st, `JACKPOT! ${p.name} otopark kumbarasını patlattı: +${TL(amt)}`);
        ctx.emit({ t: 'jackpot', pi, amt }, `${p.name} Otopark Jackpot’unu kazandı: +${TL(amt)}`, 'gold');
      } else say(st, `${p.name} otoparkta soluklanıyor.`);
      break;
    case 'gojail': toJail(st, ctx, pi, `${p.name} hapse gönderildi!`); break;
    case 'tax': {
      say(st, `${p.name}: ${nm(st, sq)} ${TL(s.amt)}.`);
      ctx.emit({ t: 'tax', pi, amt: s.amt }, `${p.name} ${nm(st, sq)} ödedi: ${TL(s.amt)}`, 'bad');
      if (charge(st, ctx, pi, s.amt, -2, 'finish', nm(st, sq)) === 'wait') return;
      break;
    }
    case 's': case 'k': return drawCard(st, ctx, s.k);
    default: {
      const o = st.own[sq];
      if (o < 0) {
        const price = priceOf(st, sq);
        if (p.cash >= price || st.cfg.auction) {
          st.offer = { sq, price, force: false, from: -1 }; st.phase = 'buy';
          say(st, `${nm(st, sq)} satılık: ${TL(price)}${p.cash < price ? ' (paran yetmiyor, açık artırmaya çıkabilir)' : ''}`);
          ctx.sync(); return;
        }
        say(st, `${p.name}, ${nm(st, sq)} için yeterli paraya sahip değil.`); break;
      }
      if (o === pi) { say(st, `${p.name} kendi mülkünde: ${nm(st, sq)}.`); break; }
      if (st.mort[sq]) { say(st, `${nm(st, sq)} ipotekli: kira yok!`); break; }
      const rent = rentOf(st, sq, st.dice[0] + st.dice[1], mul);
      if (rent > 0 && p.shield > 0) {
        p.shield--;
        say(st, `🛡️ Kira Kalkanı! ${p.name} ${nm(st, sq)} kirasını (${TL(rent)}) ödemedi.`);
        ctx.emit({ t: 'shield', pi, sq }, `${p.name} Kira Kalkanı kullandı (${TL(rent)} kurtardı).`, 'good');
      } else if (rent > 0) {
        say(st, `${p.name} → ${pn(st, o)}: ${nm(st, sq)} kirası ${TL(rent)}.`);
        ctx.emit({ t: 'rent', from: pi, to: o, amt: rent, sq }, `${p.name} → ${pn(st, o)}: ${nm(st, sq)} kirası ${TL(rent)}`, 'bad');
        const r = charge(st, ctx, pi, rent, o, 'force', 'kira');
        if (r === 'wait') return;
        if (r === false) break;
      } else say(st, `${nm(st, sq)}: bu tur kira yok.`);
      if (offerForce(st, ctx)) return;
    }
  }
  finishLanding(st, ctx);
}
// Her Şeyi Al: kirayı ödedikten sonra mülkü 1,5 katına zorla satın alma teklifi
function offerForce(st, ctx) {
  const pi = st.cur, p = st.players[pi], sq = p.pos;
  if (p.out || !forceable(st, pi, sq)) return false;
  const price = forcePrice(sq); if (p.cash < price) return false;
  st.offer = { sq, price, force: true, from: st.own[sq] }; st.phase = 'buy';
  st.msg += ` Her Şeyi Al: ${nm(st, sq)} mülkünü ${pn(st, st.own[sq])} oyuncusundan ${TL(price)} karşılığında alabilirsin.`;
  ctx.sync(); return true;
}
function finishLanding(st, ctx) {
  if (st.phase === 'over') return;
  const p = st.players[st.cur];
  st.offer = null; st.debt = null; st.mul = 0;
  if (p.out) { st.again = false; st.mr = false; endTurn(st, ctx); return; }
  if (st.mr && !p.jail) {                                // Mega: Bay Para hamlesi
    st.mr = false;
    let target = -1;
    for (let k = 1; k < N && target < 0; k++) { const i = (p.pos + k) % N; if (BUYABLE(i) && st.own[i] < 0) target = i; }
    for (let k = 1; k < N && target < 0; k++) { const i = (p.pos + k) % N; if (BUYABLE(i) && st.own[i] >= 0 && st.own[i] !== st.cur && !st.mort[i]) target = i; }
    if (target >= 0) {
      say(st, `💰 Bay Para: ${p.name} sıradaki fırsata koşuyor: ${nm(st, target)}!`);
      ctx.emit({ t: 'mr', pi: st.cur, sq: target }, `Bay Para ${p.name} oyuncusunu ${nm(st, target)} karesine taşıyor.`, 'gold');
      return startMove(st, ctx, pathTo(p.pos, target));
    }
  }
  st.mr = false;
  if (st.again && !p.jail) { st.phase = 'roll'; st.msg = (st.msg ? st.msg + ' ' : '') + 'Çift attın, tekrar zar at!'; }
  else { st.phase = 'end'; st.again = false; }
  ctx.sync();
}
function endTurn(st, ctx) {
  if (st.phase === 'over') return;
  const n = st.players.length; let j = st.cur;
  do { j = (j + 1) % n; } while (st.players[j].out && j !== st.cur);
  const wrapped = j <= st.cur;
  st.turns++;
  st.cur = j; st.phase = 'roll'; st.dbl = 0; st.again = false; st.offer = null; st.mr = false; st.trade = null; st.debt = null; st.mul = 0;
  if (wrapped) {
    st.round++;
    if ((st.limit && st.round > st.limit) || st.round > HARD_CAP) { st.round = Math.min(st.round, (st.limit || HARD_CAP) + 1); finishGame(st, ctx, 'limit'); return; }
    st.event = null;
    if (st.mode === 'kaos') { chaosEvent(st, ctx); if (st.phase === 'over') return; }
  }
  const p = st.players[j];
  if (p.out) { finishGame(st, ctx, 'bankrupt'); return; }
  say(st, p.jail ? `${p.name} hapiste: ${TL(JAIL_FEE)} öde${p.jc.length ? ', kartını kullan' : ''} ya da çift dene (${p.tries}/3).` : `Sıra ${p.name} oyuncusunda.`);
  ctx.emit({ t: 'turn', pi: j });
  ctx.sync();
}
function toJail(st, ctx, pi, msg) {
  const p = st.players[pi];
  st.mv = { pi, from: p.pos, path: [JAIL], id: ++st.mvN, go: false, step: 0, jump: true };
  p.pos = JAIL; p.jail = true; p.tries = 0; st.again = false; st.dbl = 0; st.mr = false;
  say(st, msg || `${p.name} hapse girdi!`);
  ctx.emit({ t: 'jail', pi }, `${p.name} hapse girdi!`, 'bad');
}
function drawCard(st, ctx, d) {
  const pi = st.cur, id = st.decks[d].shift();
  if (DECKS[d][id].k !== 'free') st.decks[d].push(id);
  st.card = { d, id, pi, n: ++st.cardN }; st.phase = 'card';
  say(st, `${pn(st, pi)} bir ${d === 's' ? 'Şans' : 'Kader'} kartı çekti.`);
  ctx.emit({ t: 'card', pi, d, id }, `${pn(st, pi)} ${d === 's' ? 'Şans' : 'Kader'}: “${cardText(st.board, d, id)}”`, 'gold');
  ctx.sync();
  schedule(st, ctx, CARD_MS, applyCard);
}
function nearest(pos, list) { for (let k = 1; k <= N; k++) { const i = (pos + k) % N; if (list.includes(i)) return i; } return list[0]; }
function applyCard(st, ctx) {
  const { d, id } = st.card, c = DECKS[d][id], pi = st.cur, p = st.players[pi];
  st.mv = null;
  say(st, `${DECK_NAME[d]}: ${cardText(st.board, d, id)}`);
  let r = true;
  switch (c.k) {
    case 'money':
      if (c.v > 0) give(st, pi, c.v);
      else r = charge(st, ctx, pi, -c.v, -2, 'finish', 'kart');
      break;
    case 'goto': return startMove(st, ctx, pathTo(p.pos, c.v));
    case 'nearT': st.mul = 2; return startMove(st, ctx, pathTo(p.pos, nearest(p.pos, TRANS)));
    case 'nearU': st.mul = 10; return startMove(st, ctx, pathTo(p.pos, nearest(p.pos, UTILS)));
    case 'back': return startMove(st, ctx, Array.from({ length: c.v }, (_, k) => (p.pos - k - 1 + N) % N), true);
    case 'jail': toJail(st, ctx, pi); break;
    case 'free': p.jc.push(d); break;
    case 'shield': p.shield++; break;
    case 'payEach': {
      const tos = alive(st).filter(o => o !== pi).map(o => ({ pi: o, amt: c.v }));
      r = charge(st, ctx, pi, 0, tos, 'finish', 'kart'); break;
    }
    case 'getEach':
      for (const o of alive(st)) { if (o !== pi && !st.players[o].out) charge(st, ctx, o, c.v, pi, null, 'hediye'); if (st.phase === 'over') return; }
      break;
    case 'perProp': { const n = owned(st, pi).length; if (n) { give(st, pi, n * c.v); st.msg += ` (+${TL(n * c.v)})`; } else st.msg += ' Mülkün yok, bonus da yok!'; break; }
    case 'repair': {
      let amt = 0; for (let i = 0; i < N; i++) if (st.own[i] === pi && st.lvl[i] > 0) amt += st.lvl[i] >= 5 ? c.v[1] * (st.lvl[i] - 4) : st.lvl[i] * c.v[0];
      if (amt > 0) { st.msg += ` Toplam ${TL(amt)}.`; r = charge(st, ctx, pi, amt, -2, 'finish', 'tadilat'); } else st.msg += ' Binan yok, ödeme yok!';
      break;
    }
    default: break;
  }
  if (r === 'wait' || st.phase === 'over') return;
  finishLanding(st, ctx);
}
function bankrupt(st, ctx, pi, cred) {
  const p = st.players[pi];
  if (p.out) return;
  // binalar bankaya yarı fiyatına
  for (let i = 0; i < N; i++) if (st.own[i] === pi && st.lvl[i] > 0) { give(st, pi, st.lvl[i] * GROUPS[SQ[i].g].hc / 2); st.lvl[i] = 0; }
  const left = p.cash; const props = owned(st, pi);
  if (cred >= 0 && !st.players[cred].out) {
    transfer(st, pi, cred, left);
    props.forEach(i => { st.own[i] = cred; });
    st.players[cred].jc.push(...p.jc); p.jc = [];
  } else {
    st.minted -= left; p.cash = 0;
    props.forEach(i => { st.own[i] = -1; st.mort[i] = false; });
    p.jc.forEach(d => st.decks[d].push(DECKS[d].findIndex(c => c.k === 'free'))); p.jc = [];
    cred = -1;
  }
  p.cash = 0; p.out = true; p.jail = false; p.shield = 0; p.outN = ++st.outN;
  if (st.trade && (st.trade.from === pi || st.trade.to === pi)) st.trade = null;
  say(st, `${p.name} iflas etti!`);
  ctx.emit({ t: 'bankrupt', pi, cred }, `${p.name} İFLAS ETTİ! ${cred >= 0 ? `${props.length} mülkü ve ${TL(left)} nakdi ${pn(st, cred)} oyuncusuna geçti.` : 'Mülkleri bankaya döndü.'}`, 'bad');
  if (alive(st).length <= 1) finishGame(st, ctx, 'bankrupt');
}
function ranking(st) {
  const live = alive(st).sort((a, b) => worth(st, b) - worth(st, a));
  const outs = st.players.map((_, i) => i).filter(i => st.players[i].out).sort((a, b) => st.players[b].outN - st.players[a].outN);
  return live.map(i => ({ pi: i, score: worth(st, i), label: TL(worth(st, i)) })).concat(outs.map(i => ({ pi: i, score: 0, label: 'İflas' })));
}
function result(st) {
  const rk = ranking(st), w = pn(st, rk[0].pi);
  const played = st.why === 'limit' ? `${Math.max(1, st.round - 1)} tur tamamlandı.` : `Oyun ${st.round}. turda bitti.`;
  return { title: st.why === 'bankrupt' ? `${w} emlak kralı oldu!` : `${w} en zengin oyuncu!`, ranking: rk,
    note: `${MODE_NAME[st.mode]} · ${BOARDS[st.board].n}. ${played} Net değer = nakit + mülkler (ipotekli yarı) + binalar.` };
}
function finishGame(st, ctx, why) {
  if (st.phase === 'over') return;
  st.phase = 'over'; st.why = why; st.mv = null; st.offer = null; st.auc = null; st.trade = null; st.debt = null;
  const top = ranking(st)[0];
  say(st, why === 'bankrupt' ? `${pn(st, top.pi)} rakiplerini iflas ettirdi!` : `Süre doldu! En zengin: ${pn(st, top.pi)} (${TL(top.score)})`);
  ctx.emit({ t: 'over', pi: top.pi }, st.msg, 'gold');
  ctx.sync();
  schedule(st, ctx, 1800, () => ctx.end(result(st)));
}

/* ---------- Kaos ---------- */
function chaosEvent(st, ctx) {
  const ids = Object.keys(EVENTS).filter(k => k !== (st.lastEv || ''));
  const id = ids[randInt(0, ids.length - 1)]; st.lastEv = id;
  const ev = { id, round: st.round }, E2 = EVENTS[id];
  let extra = '';
  if (id === 'deprem') {
    const gs = GROUPS.map((_, g) => g).filter(g => GM[g].some(i => st.lvl[i] > 0));
    if (gs.length) {
      const g = gs[randInt(0, gs.length - 1)]; ev.g = g;
      GM[g].forEach(i => { if (st.lvl[i] > 0) st.lvl[i]--; });
      extra = `${GROUPS[g].n} grubunda her mülk 1 bina kaybetti!`;
    } else extra = 'Neyse ki henüz bina yoktu: hasar yok.';
  } else if (id === 'turizm') { ev.reg = randInt(0, 3); extra = `${REGION[ev.reg]} kenarında kiralar bu tur 2 katı!`; }
  else if (id === 'kriz') {
    alive(st).forEach(i => { const a = Math.floor(st.players[i].cash * 0.1 / 10) * 10; if (a > 0) toBank(st, i, a, true); });
    extra = 'Herkes nakdinin %10’unu ödedi.';
  } else if (id === 'festival') { alive(st).forEach(i => give(st, i, 100)); extra = 'Herkese 100 ₺!'; }
  else if (id === 'bayram') {
    const poor = alive(st).sort((a, b) => st.players[a].cash - st.players[b].cash)[0];
    give(st, poor, 200); ev.pi = poor; extra = `${pn(st, poor)} 200 ₺ bayram harçlığı aldı.`;
  } else extra = E2.d;
  ev.txt = extra; st.event = ev;
  ctx.emit({ t: 'event', id, ev }, `${E2.ic} Şehir olayı: ${E2.n}! ${extra}`, 'gold');
}

/* ------------------------------------------------------------------ açık artırma */
const AUC_MS = 9000, AUC_BUMP = 5000;
function startAuction(st, ctx, sq) {
  const fast = st.mode === 'hizli';
  st.auc = { sq, high: 0, by: -1, out: st.players.map((p, i) => p.out || (!p.isBot && !ctx.isOnline(i))), n: ++st.aucN, dl: now() + T(fast ? 7000 : AUC_MS), dur: T(fast ? 7000 : AUC_MS), bids: 0 };
  st.phase = 'auction'; st.offer = null;
  say(st, `${nm(st, sq)} açık artırmada! Herkes teklif verebilir.`);
  ctx.emit({ t: 'auction', sq }, `${nm(st, sq)} açık artırmaya çıktı.`, 'gold');
  aucCheckOut(st);
  ctx.sync();
  armAuction(st, ctx);
}
function armAuction(st, ctx) {
  const a = st.auc; if (!a) return;
  const n = a.n, v = a.bids;
  const left = Math.max(0, a.dl - now());
  ctx.later(left + 30, () => { if (st.auc && st.auc.n === n && st.auc.bids === v) { if (now() >= st.auc.dl) closeAuction(st, ctx); else armAuction(st, ctx); } });
  ctx.later(T(randInt(650, 1300)), () => { if (st.auc && st.auc.n === n) botBids(st, ctx); });
}
const aucMin = a => (a.high > 0 ? a.high + 10 : 10);
function aucCheckOut(st) {
  const a = st.auc; if (!a) return;
  st.players.forEach((p, i) => { if (!a.out[i] && i !== a.by && p.cash < aucMin(a)) a.out[i] = true; });
}
function aucDone(st) { const a = st.auc; return st.players.every((p, i) => a.out[i] || i === a.by); }
function placeBid(st, ctx, pi, amt) {
  const a = st.auc; if (!a) return false;
  amt = Math.floor(+amt || 0);
  if (a.out[pi] || st.players[pi].out || pi === a.by || amt < aucMin(a) || amt > st.players[pi].cash) return false;
  a.high = amt; a.by = pi; a.bids++;
  a.dl = Math.max(a.dl, now() + T(AUC_BUMP)); a.dur = Math.max(a.dur, a.dl - now());
  say(st, `${pn(st, pi)}: ${TL(amt)}! (${nm(st, a.sq)})`);
  ctx.emit({ t: 'bid', pi, amt }, `${pn(st, pi)} açık artırmada ${TL(amt)} verdi.`);
  aucCheckOut(st);
  if (aucDone(st)) { closeAuction(st, ctx); return true; }
  ctx.sync(); armAuction(st, ctx);
  return true;
}
function aucWithdraw(st, ctx, pi) {
  const a = st.auc; if (!a || a.out[pi] || pi === a.by) return false;
  a.out[pi] = true; a.bids++;
  ctx.emit({ t: 'aucOut', pi }, `${pn(st, pi)} açık artırmadan çekildi.`);
  if (aucDone(st)) { closeAuction(st, ctx); return true; }
  ctx.sync(); armAuction(st, ctx); return true;
}
function closeAuction(st, ctx) {
  const a = st.auc; if (!a) return;
  st.auc = null;
  if (a.by >= 0 && !st.players[a.by].out && st.players[a.by].cash >= a.high && st.own[a.sq] < 0) {
    toBank(st, a.by, a.high, false); st.own[a.sq] = a.by;
    say(st, `SATILDI! ${nm(st, a.sq)} → ${pn(st, a.by)} (${TL(a.high)})`);
    ctx.emit({ t: 'sold', pi: a.by, sq: a.sq, amt: a.high }, `Açık artırma bitti: ${nm(st, a.sq)} ${TL(a.high)} karşılığında ${pn(st, a.by)} oyuncusunun.`, 'good');
    checkGroup(st, ctx, a.by, a.sq);
  } else {
    say(st, `${nm(st, a.sq)} için teklif çıkmadı; bankada kaldı.`);
    ctx.emit({ t: 'unsold', sq: a.sq }, `${nm(st, a.sq)} satılmadı.`);
  }
  finishLanding(st, ctx);
}
function checkGroup(st, ctx, pi, sq) {
  const s = SQ[sq];
  if (s.k === 'prop' && ownsGroup(st, pi, s.g)) ctx.emit({ t: 'group', pi, g: s.g }, `${pn(st, pi)} ${GROUPS[s.g].n} grubunu tamamladı: TEKEL!`, 'gold');
}

/* ------------------------------------------------------------------ takas */
const TRADE_MS = 35000;
const emptySide = () => ({ sqs: [], cash: 0, jc: 0 });
function cleanSide(x) {
  x = x || {};
  const sqs = Array.isArray(x.sqs) ? [...new Set(x.sqs.map(v => v | 0))].filter(i => i >= 0 && i < N) : [];
  return { sqs, cash: Math.max(0, Math.floor(+x.cash || 0)), jc: Math.max(0, Math.min(2, (x.jc | 0))) };
}
function sideOk(st, pi, side) {
  const p = st.players[pi];
  return side.sqs.every(i => st.own[i] === pi && tradable(st, i)) && side.cash <= p.cash && side.jc <= p.jc.length;
}
const sideEmpty = s => !s.sqs.length && !s.cash && !s.jc;
function validTrade(st, from, to, a, b) {
  if (from === to || !st.players[to] || st.players[to].out || st.players[from].out) return false;
  if (sideEmpty(a) && sideEmpty(b)) return false;
  return sideOk(st, from, a) && sideOk(st, to, b);
}
function proposeTrade(st, ctx, from, to, a, b, chain) {
  const back = st.trade ? st.trade.back : st.phase;
  st.trade = { n: ++st.tradeN, from, to, a, b, dl: now() + T(TRADE_MS), dur: T(TRADE_MS), chain: chain || 0, back };
  st.phase = 'trade';
  say(st, `${pn(st, from)} → ${pn(st, to)}: takas teklifi${chain ? ' (karşı teklif)' : ''}.`);
  ctx.emit({ t: 'tradeOffer', from, to, n: st.tradeN }, `${pn(st, from)}, ${pn(st, to)} oyuncusuna ${chain ? 'karşı ' : ''}takas teklif etti: ${tradeText(st, st.trade)}`, 'gold');
  ctx.sync();
  const n = st.tradeN;
  ctx.later(T(TRADE_MS) + 50, () => { if (st.trade && st.trade.n === n && st.phase === 'trade') endTrade(st, ctx, false, 'süre doldu'); });
}
function sideText(st, side) {
  const parts = side.sqs.map(i => nm(st, i));
  if (side.cash) parts.push(TL(side.cash)); if (side.jc) parts.push(`${side.jc} hapis kartı`);
  return parts.length ? parts.join(', ') : 'hiçbir şey';
}
const tradeText = (st, t) => `${sideText(st, t.a)} ⇄ ${sideText(st, t.b)}`;
function endTrade(st, ctx, ok, why) {
  const t = st.trade; if (!t) return;
  st.trade = null; st.phase = t.back === 'end' ? 'end' : 'roll';
  if (ok) {
    const { from, to, a, b } = t, P1 = st.players[from], P2 = st.players[to];
    a.sqs.forEach(i => { st.own[i] = to; }); b.sqs.forEach(i => { st.own[i] = from; });
    transfer(st, from, to, a.cash); transfer(st, to, from, b.cash);
    for (let k = 0; k < a.jc; k++) P2.jc.push(P1.jc.pop());
    for (let k = 0; k < b.jc; k++) P1.jc.push(P2.jc.pop());
    say(st, `Anlaşma tamam! ${pn(st, from)} ⇄ ${pn(st, to)}`);
    ctx.emit({ t: 'trade', from, to }, `TAKAS TAMAM: ${pn(st, from)} ⇄ ${pn(st, to)} · ${tradeText(st, t)}`, 'good');
    const gs = new Set(); a.sqs.forEach(i => SQ[i].k === 'prop' && gs.add(SQ[i].g + ':' + to)); b.sqs.forEach(i => SQ[i].k === 'prop' && gs.add(SQ[i].g + ':' + from));
    gs.forEach(k => { const [g, pi] = k.split(':').map(Number); if (ownsGroup(st, pi, g)) ctx.emit({ t: 'group', pi, g }, `${pn(st, pi)} ${GROUPS[g].n} grubunu tamamladı: TEKEL!`, 'gold'); });
  } else {
    say(st, `Takas reddedildi${why ? ` (${why})` : ''}.`);
    ctx.emit({ t: 'tradeNo', from: t.from, to: t.to }, `${pn(st, t.to)} takası reddetti${why ? ` (${why})` : ''}.`);
    st.memo[`${t.from}>${t.to}:${t.b.sqs.join(',')}`] = st.round;
  }
  ctx.sync();
}

/* ------------------------------------------------------------------ bilgisayar oyuncu */
const groupTotal = g => GM[g].reduce((a, i) => a + SQ[i].p, 0);
function botKeep(st, pi, sq) {
  const s = SQ[sq]; let v = s.p;
  if (s.k === 'prop') { const n = GM[s.g].filter(i => st.own[i] === pi).length; v *= n === GM[s.g].length ? 4 : n > 1 ? 1.5 : 1; }
  else if (s.k === 'tr') v *= 1 + 0.3 * TRANS.filter(i => st.own[i] === pi).length;
  return v;
}
function reserve(st, pi) {
  let maxR = 0;
  for (let i = 0; i < N; i++) { const o = st.own[i]; if (o >= 0 && o !== pi && !st.mort[i]) maxR = Math.max(maxR, rentOf(st, i, 7)); }
  return st.mode === 'hizli' ? Math.min(400, 40 + maxR * 0.4) : Math.min(650, 90 + maxR * 0.6);
}
// tekel sayılarına dayalı stratejik değer
function stratScore(st, own, pi) {
  let s = 0;
  for (const i of ALLBUY) if (own[i] === pi) s += SQ[i].p * (st.mort[i] ? 0.6 : 1);
  GROUPS.forEach((_, g) => {
    const cnt = GM[g].filter(i => own[i] === pi).length, len = GM[g].length;
    if (cnt === len) s += groupTotal(g) * 1.4;
    else if (cnt === len - 1 && GM[g].every(i => own[i] === pi || own[i] < 0)) s += groupTotal(g) * 0.2;
  });
  const t = TRANS.filter(i => own[i] === pi).length; s += [0, 0, 40, 120, 260][t];
  if (UTILS.every(i => own[i] === pi)) s += 60;
  return s;
}
function threat(st, own, pi) {
  let s = 0;
  GROUPS.forEach((_, g) => { const o = own[GM[g][0]]; if (o >= 0 && o !== pi && !st.players[o].out && GM[g].every(i => own[i] === o)) s += groupTotal(g) * 1.1; });
  return s;
}
// x oyuncusu için takasın değeri: x verir 'give', alır 'get', karşı taraf y
function tradeDelta(st, x, y, give2, get) {
  const own2 = st.own.slice();
  give2.sqs.forEach(i => { own2[i] = y; }); get.sqs.forEach(i => { own2[i] = x; });
  const d = (stratScore(st, own2, x) - stratScore(st, st.own, x)) - (threat(st, own2, x) - threat(st, st.own, x));
  return d + (get.cash - give2.cash) + 50 * (get.jc - give2.jc);
}
function botWantsTrade(st, t) {          // yanıtlayan (t.to) açısından
  const x = t.to, d = tradeDelta(st, x, t.from, t.b, t.a);
  const cashAfter = st.players[x].cash - t.b.cash + t.a.cash;
  return { ok: d > 15 && cashAfter >= 40, d };
}
function auctionMax(st, pi, sq) {
  const s = SQ[sq], p = st.players[pi]; let v = s.p;
  if (s.k === 'prop') {
    const mine = GM[s.g].filter(i => i !== sq && st.own[i] === pi).length, len = GM[s.g].length;
    if (mine === len - 1) v *= 1.9; else if (mine > 0) v *= 1.3;
    const others = GM[s.g].filter(i => i !== sq && st.own[i] >= 0 && st.own[i] !== pi);
    if (others.length === len - 1 && others.every(i => st.own[i] === st.own[others[0]])) v *= 1.4;
  } else if (s.k === 'tr') v *= 1 + 0.25 * TRANS.filter(i => st.own[i] === pi).length;
  if (st.round < 8) v *= 1.1;
  return Math.floor(Math.min(v, p.cash - reserve(st, pi) * 0.6));
}
function botBids(st, ctx) {
  const a = st.auc; if (!a) return;
  const want = st.players.map((p, i) => i).filter(i => st.players[i].isBot && !a.out[i] && i !== a.by && !st.players[i].out);
  const min = aucMin(a);
  const keen = [];
  for (const i of want) { const m = auctionMax(st, i, a.sq); if (m >= min) keen.push([i, m]); else { a.out[i] = true; a.bids++; } }
  if (!keen.length) {
    if (aucDone(st)) { closeAuction(st, ctx); return; }
    ctx.sync(); armAuction(st, ctx); return;
  }
  const [i, m] = keen[randInt(0, keen.length - 1)];
  const step = m - min > 150 ? (Math.random() < .5 ? 50 : 25) : 10;
  placeBid(st, ctx, i, Math.min(m, Math.max(min, a.high + step)));
}
function landingScore(st, pi, sq, sum) {
  const s = SQ[sq], p = st.players[pi];
  if (BUYABLE(sq)) {
    const o = st.own[sq];
    if (o < 0) return p.cash >= priceOf(st, sq) ? 100 + auctionMax(st, pi, sq) / 10 : 30;
    if (o === pi || st.mort[sq]) return 30;
    return -rentOf(st, sq, sum);
  }
  return { tax: -s.amt, gojail: -120, park: 20 + (st.cfg.jackpot ? st.pot / 4 : 0), s: 15, k: 15 }[s.k] ?? 20;
}
function botTradeIdea(st, pi) {
  const me = st.players[pi]; if (me.cash < 100) return null;
  const ideas = [];
  GROUPS.forEach((_, g) => {
    if (!groupClean(st, g)) return;
    const mine = GM[g].filter(i => st.own[i] === pi), miss = GM[g].filter(i => st.own[i] !== pi);
    if (!mine.length || !miss.length) return;
    const j = st.own[miss[0]]; if (j < 0 || st.players[j].out || !miss.every(i => st.own[i] === j && tradable(st, i))) return;
    if (miss.length > 1 && mine.length < 2) return;
    const key = `${pi}>${j}:${miss.join(',')}`; if (st.memo[key] != null && st.round - st.memo[key] < 4) return;
    ideas.push({ g, j, miss, key });
  });
  for (const id of ideas) {
    const get = { sqs: id.miss, cash: 0, jc: 0 };
    // önce: rakibin grubunu tamamlayan bir mülkle değiş tokuş
    const swap = owned(st, pi).find(i => SQ[i].k === 'prop' && SQ[i].g !== id.g && tradable(st, i) && !st.mort[i] && GM[SQ[i].g].every(k => k === i || st.own[k] === id.j));
    const base = swap != null ? [swap] : [];
    for (let cash = 0; cash <= me.cash - 120; cash += 25) {
      const give2 = { sqs: base, cash, jc: 0 };
      const t = { from: pi, to: id.j, a: give2, b: get };
      const mine = tradeDelta(st, pi, id.j, give2, get);
      if (mine <= 20) break;
      if (botWantsTrade(st, t).ok) return t;
      if (cash > groupTotal(id.g) * 2.5) break;
    }
    st.memo[id.key] = st.round;
  }
  return null;
}
function botManage(st, pi, ctx, act) {
  const p = st.players[pi], res = reserve(st, pi);
  // inşaat (eşit kural, en ucuz seviyeden)
  const builds = owned(st, pi).filter(i => canBuild(st, pi, i)).sort((a, b) => st.lvl[a] - st.lvl[b] || hcOf(st, a) - hcOf(st, b) || SQ[b].p - SQ[a].p);
  if (builds.length && p.cash - hcOf(st, builds[0]) >= res && act({ t: 'build', sq: builds[0] })) return true;
  // ipotek kaldır
  const um = owned(st, pi).filter(i => canUnmort(st, pi, i)).sort((a, b) => botKeep(st, pi, b) - botKeep(st, pi, a));
  if (um.length && p.cash - unmortCost(um[0]) >= res + 150 && act({ t: 'unmort', sq: um[0] })) return true;
  // takas teklifi (tur başına bir kez)
  if (st.botTrade !== st.turns) {
    st.botTrade = st.turns;
    const t = botTradeIdea(st, pi);
    if (t && act({ t: 'trade', to: t.to, a: t.a, b: t.b })) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ oyun tanımı */
const MODE_NAME = { klasik: 'Klasik', hizli: 'Hızlı', mega: 'Mega', kaos: 'Kaos' };
const LIMIT_AUTO = { klasik: 0, hizli: 12, mega: 0, kaos: 30 };
function dealDeeds(st) {
  const per = st.players.length <= 3 ? 3 : 2;
  const pool = shuffle(SQ.map((s, i) => (s.k === 'prop' ? i : -1)).filter(i => i >= 0));
  st.players.forEach((p, pi) => {
    let got = 0;
    for (let k = 0; k < pool.length && got < per; k++) {
      const sq = pool[k]; if (sq < 0) continue;
      st.own[sq] = pi;
      if (ownsGroup(st, pi, SQ[sq].g)) { st.own[sq] = -1; continue; }   // başlangıçta hazır tekel olmasın
      pool[k] = -1; got++;
    }
  });
}

DEF = {
  id: 'emlak', name: 'Emlak Kralı', icon: '🏙️', color: '#ffb627', min: 2, max: 6, hotseat: true, bot: true, localMin: 1,
  tagline: '40 karelik dev tahta, açık artırma, takas, 4 mod',
  rules: 'Zar at, 40 karelik tahtada ilerle; boş mülkü satın al ya da açık artırmaya çıkar. Bir renk grubunun tamamı sende olunca eşit kuralla ev, otel kur; takas yap, ipotek et. Parası biten iflas eder; son kalan ya da süre sonunda en zengin olan kazanır. Modlar: Klasik, Hızlı (başlangıçta tapu, kısa oyun), Mega (hız zarı, gökdelen), Kaos (her tur şehir olayı).',
  options: [
    { key: 'mode', label: 'Mod', def: 'klasik', choices: [{ v: 'klasik', label: 'Klasik' }, { v: 'hizli', label: 'Hızlı' }, { v: 'mega', label: 'Mega' }, { v: 'kaos', label: 'Kaos' }] },
    { key: 'board', label: 'Tahta', def: 'tr', choices: [{ v: 'tr', label: 'Türkiye' }, { v: 'ist', label: 'İstanbul' }, { v: 'dunya', label: 'Dünya' }] },
    { key: 'limit', label: 'Süre', def: 'auto', choices: [{ v: 'auto', label: 'Moda göre' }, { v: '10', label: '10 tur' }, { v: '20', label: '20 tur' }, { v: '35', label: '35 tur' }, { v: '0', label: 'İflasa kadar' }] },
    { key: 'start', label: 'Başlangıç parası', def: '1500', choices: [{ v: '1000', label: '1.000 ₺' }, { v: '1500', label: '1.500 ₺' }, { v: '2000', label: '2.000 ₺' }, { v: '2500', label: '2.500 ₺' }] },
    { key: 'auction', label: 'Açık artırma', def: 'on', choices: [{ v: 'on', label: 'Açık' }, { v: 'off', label: 'Kapalı' }] },
    { key: 'jackpot', label: 'Otopark Jackpot', def: 'on', choices: [{ v: 'on', label: 'Açık' }, { v: 'off', label: 'Kapalı' }] },
    { key: 'force', label: 'Her Şeyi Al (1,5×)', def: 'off', choices: [{ v: 'on', label: 'Açık' }, { v: 'off', label: 'Kapalı' }] }
  ],
  speed: 1,
  get botDelay() { return T(800); },
  setup(players, opts) {
    opts = opts || {};
    const mode = MODE_NAME[opts.mode] ? opts.mode : 'klasik';
    const board = BOARDS[opts.board] ? opts.board : 'tr';
    const start = [1000, 1500, 2000, 2500].includes(+opts.start) ? +opts.start : 1500;
    const lim = opts.limit == null || opts.limit === '' || opts.limit === 'auto' ? LIMIT_AUTO[mode] : Math.max(0, +opts.limit || 0);
    const st = {
      v: 2, mode, board, start,
      cfg: { auction: opts.auction !== 'off', jackpot: opts.jackpot !== 'off', force: opts.force === 'on' },
      players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot, cash: start, pos: 0, jail: false, tries: 0, jc: [], shield: 0, out: false, outN: 0 })),
      own: Array(N).fill(-1), lvl: Array(N).fill(0), mort: Array(N).fill(false),
      cur: 0, phase: 'roll', dice: [3, 4], sd: 0, rollN: 0, dbl: 0, again: false, mr: false, mul: 0,
      offer: null, mv: null, mvN: 0, card: null, cardN: 0, auc: null, aucN: 0, trade: null, tradeN: 0, debt: null,
      decks: { s: shuffle(DECKS.s.map((_, i) => i)), k: shuffle(DECKS.k.map((_, i) => i)) },
      pot: 0, round: 1, limit: lim, event: null, lastEv: '', msg: '', minted: 0, outN: 0, seq: 0, turns: 0, why: '', memo: {}, botTrade: -1, tradesTurn: 0
    };
    if (mode === 'hizli') dealDeeds(st);
    st.msg = `Herkese ${TL(start)}! ${MODE_NAME[mode]} mod, ${BOARDS[board].n} tahtası. ${players[0].name} başlıyor.`;
    if (mode === 'kaos') st.msg += ' Her tur başında bir şehir olayı yaşanacak!';
    return st;
  },
  action(st, pi, a, ctx) {
    if (!a || typeof a.t !== 'string' || st.phase === 'over') return false;
    const p = st.players[pi]; if (!p || p.out) return false;
    // herkesin yapabildikleri
    if (a.t === 'bid') return st.phase === 'auction' && placeBid(st, ctx, pi, a.amt);
    if (a.t === 'aucOut') return st.phase === 'auction' && aucWithdraw(st, ctx, pi);
    if (st.phase === 'trade' && st.trade) {
      const t = st.trade;
      if (a.t === 'tradeCancel' && pi === t.from) { endTrade(st, ctx, false, 'geri çekildi'); return true; }
      if (pi !== t.to) return false;
      if (a.t === 'tradeAccept') {
        if (!validTrade(st, t.from, t.to, t.a, t.b)) { endTrade(st, ctx, false, 'geçersiz'); return true; }
        endTrade(st, ctx, true); return true;
      }
      if (a.t === 'tradeDecline') { endTrade(st, ctx, false); return true; }
      if (a.t === 'tradeCounter') {
        if (t.chain >= 3) return false;
        const ga = cleanSide(a.a), gb = cleanSide(a.b);
        if (!validTrade(st, t.to, t.from, ga, gb)) return false;
        proposeTrade(st, ctx, t.to, t.from, ga, gb, t.chain + 1); return true;
      }
      return false;
    }
    if (pi !== st.cur) return false;
    const manage = st.phase === 'roll' || st.phase === 'end';
    switch (a.t) {
      case 'roll':
        if (st.phase !== 'roll') return false;
        doRoll(st, ctx); return true;
      case 'jailPay':
        if (st.phase !== 'roll' || !p.jail || p.cash < JAIL_FEE) return false;
        toBank(st, pi, JAIL_FEE, true); p.jail = false; p.tries = 0;
        say(st, `${p.name} ${TL(JAIL_FEE)} ödeyip hapisten çıktı. Şimdi zar at!`);
        ctx.emit({ t: 'jailOut', pi }, `${p.name} ${TL(JAIL_FEE)} ödeyerek hapisten çıktı.`, 'gold'); ctx.sync(); return true;
      case 'jailCard': {
        if (st.phase !== 'roll' || !p.jail || !p.jc.length) return false;
        const d = p.jc.pop(); st.decks[d].push(DECKS[d].findIndex(c => c.k === 'free')); p.jail = false; p.tries = 0;
        say(st, `${p.name} Hapisten Ücretsiz Çıkış kartını kullandı. Şimdi zar at!`);
        ctx.emit({ t: 'jailOut', pi }, `${p.name} çıkış kartıyla hapisten çıktı.`, 'good'); ctx.sync(); return true;
      }
      case 'buy': {
        if (st.phase !== 'buy' || !st.offer) return false;
        const { sq, price, force, from } = st.offer;
        if (p.cash < price) return false;
        if (force) {
          if (st.own[sq] !== from || !forceable(st, pi, sq)) return false;
          transfer(st, pi, from, price); st.own[sq] = pi;
          if (st.mort[sq]) st.mort[sq] = false;
          say(st, `HER ŞEYİ AL! ${p.name}, ${nm(st, sq)} mülkünü ${pn(st, from)} oyuncusundan ${TL(price)} karşılığında aldı.`);
          ctx.emit({ t: 'buy', pi, sq, from, amt: price }, `${p.name} Her Şeyi Al ile ${nm(st, sq)} mülkünü ${pn(st, from)} oyuncusundan aldı (${TL(price)}).`, 'gold');
        } else {
          if (st.own[sq] !== -1) return false;
          toBank(st, pi, price, false); st.own[sq] = pi;
          say(st, `${p.name}, ${nm(st, sq)} mülkünü ${TL(price)} karşılığında satın aldı.`);
          ctx.emit({ t: 'buy', pi, sq, amt: price }, `${p.name} ${nm(st, sq)} aldı (${TL(price)}).`, 'good');
        }
        checkGroup(st, ctx, pi, sq);
        finishLanding(st, ctx); return true;
      }
      case 'pass': {
        if (st.phase !== 'buy' || !st.offer) return false;
        const { sq, force } = st.offer;
        if (!force && st.cfg.auction) { startAuction(st, ctx, sq); return true; }
        say(st, `${p.name}, ${nm(st, sq)} için pas geçti.`);
        ctx.emit({ t: 'pass', pi }, `${p.name} ${nm(st, sq)} almadı.`);
        finishLanding(st, ctx); return true;
      }
      case 'build': {
        const sq = a.sq | 0; if (!manage || !canBuild(st, pi, sq)) return false;
        const hc = hcOf(st, sq); toBank(st, pi, hc, false); st.lvl[sq]++;
        const l = st.lvl[sq];
        say(st, `${p.name}, ${nm(st, sq)} üzerine ${l >= 5 ? LVL_NAME[l].toLocaleUpperCase('tr-TR') : l + '. evi'} kurdu. Kira artık ${TL(rentOf(st, sq, 7))}.`);
        ctx.emit({ t: 'build', pi, sq, lvl: l }, `${p.name} ${nm(st, sq)} üzerine ${l >= 5 ? LVL_NAME[l].toLocaleLowerCase('tr-TR') : l + '. evi'} kurdu (${TL(hc)}).`, 'good');
        ctx.sync(); return true;
      }
      case 'sell': {
        const sq = a.sq | 0; if (!(manage || st.phase === 'debt') || !sellable(st, pi, sq)) return false;
        doSell(st, ctx, pi, sq, false); say(st, `${p.name}, ${nm(st, sq)} üzerindeki bir binayı sattı.`); ctx.sync(); return true;
      }
      case 'mort': {
        const sq = a.sq | 0; if (!(manage || st.phase === 'debt') || !mortgageable(st, pi, sq)) return false;
        doMortgage(st, ctx, pi, sq, false); say(st, `${p.name}, ${nm(st, sq)} mülkünü ipotek etti.`); ctx.sync(); return true;
      }
      case 'unmort': {
        const sq = a.sq | 0; if (!manage || !canUnmort(st, pi, sq)) return false;
        const c = unmortCost(sq); toBank(st, pi, c, false); st.mort[sq] = false;
        say(st, `${p.name}, ${nm(st, sq)} ipoteğini kaldırdı (${TL(c)}).`);
        ctx.emit({ t: 'unmort', pi, sq }, `${p.name} ${nm(st, sq)} ipoteğini kaldırdı (${TL(c)}).`); ctx.sync(); return true;
      }
      case 'payDebt': {
        const d = st.debt; if (st.phase !== 'debt' || !d || d.pi !== pi || p.cash < d.amt) return false;
        settle(st, pi, d.to); st.debt = null;
        ctx.emit({ t: 'paid', pi, amt: d.amt }, `${p.name} borcunu ödedi (${TL(d.amt)}).`);
        if (d.next === 'jailMove') jailMove(st, ctx);
        else if (d.next === 'force') { if (!offerForce(st, ctx)) finishLanding(st, ctx); }
        else finishLanding(st, ctx);
        return true;
      }
      case 'bankrupt': {
        const d = st.debt; if (st.phase !== 'debt' || !d || d.pi !== pi) return false;
        const cred = d.to.length === 1 && d.to[0].pi >= 0 ? d.to[0].pi : -1;
        st.debt = null;
        bankrupt(st, ctx, pi, cred);
        if (st.phase !== 'over') finishLanding(st, ctx);
        return true;
      }
      case 'bus': {
        if (st.phase !== 'bus') return false;
        const k = a.k | 0, n = [st.dice[0], st.dice[1], st.dice[0] + st.dice[1]][k]; if (!n) return false;
        ctx.emit({ t: 'busPick', pi, n }, `${p.name} otobüsle ${n} kare gidiyor.`);
        startMove(st, ctx, pathForward(p.pos, n)); return true;
      }
      case 'pick': {
        const sq = a.sq | 0; if (st.phase !== 'pick' || sq < 0 || sq >= N || sq === GOJAIL) return false;
        ctx.emit({ t: 'teleport', pi, sq }, `${p.name} ışınlandı: ${nm(st, sq)}!`, 'gold');
        startMove(st, ctx, [sq], false, true); return true;
      }
      case 'trade': {
        if (st.lastTradeTurn !== st.turns) { st.lastTradeTurn = st.turns; st.tradesTurn = 0; }
        if (!manage || st.tradesTurn >= 6) return false;
        const to = a.to | 0, ga = cleanSide(a.a), gb = cleanSide(a.b);
        if (!validTrade(st, pi, to, ga, gb)) return false;
        st.tradesTurn++;
        proposeTrade(st, ctx, pi, to, ga, gb, 0); return true;
      }
      case 'end':
        if (st.phase !== 'end') return false;
        endTurn(st, ctx); return true;
      default: return false;
    }
  },
  view(st) {
    const G2 = CFX.Room && CFX.Room.game;
    return {
      mode: st.mode, board: st.board, cfg: st.cfg, start: st.start,
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, cash: p.cash, pos: p.pos, jail: p.jail, tries: p.tries, jc: p.jc.slice(), shield: p.shield, out: p.out,
        online: G2 && G2.players[i] ? G2.players[i].online !== false : true })),
      own: st.own.slice(), lvl: st.lvl.slice(), mort: st.mort.slice(),
      cur: st.cur, phase: st.phase, turn: DEF.turnOf(st), dice: st.dice.slice(), sd: st.sd, rollN: st.rollN, dbl: st.dbl, again: st.again,
      offer: st.offer, mv: st.mv, card: st.phase === 'card' && st.card ? Object.assign({ txt: cardText(st.board, st.card.d, st.card.id) }, st.card) : null,
      auc: st.auc, trade: st.trade, debt: st.debt, pot: st.pot, round: st.round, limit: st.limit, event: st.event, msg: st.msg, turns: st.turns
    };
  },
  turnOf(st) {
    switch (st.phase) {
      case 'roll': case 'buy': case 'end': case 'bus': case 'pick': return st.cur;
      case 'debt': return st.debt ? st.debt.pi : st.cur;
      case 'trade': return st.trade ? st.trade.to : null;
      default: return null;
    }
  },
  botAct(st, pi, ctx) {
    const p = st.players[pi], act = a => this.action(st, pi, a, ctx);
    if (p.out || this.turnOf(st) !== pi) return;
    switch (st.phase) {
      case 'trade': {
        const t = st.trade, w = botWantsTrade(st, t);
        if (w.ok && act({ t: 'tradeAccept' })) return;
        if (t.chain < 2 && w.d > -350 && w.d <= 15) {
          const ask = Math.ceil((40 - w.d) / 10) * 10;
          const c = { a: Object.assign({}, t.b), b: Object.assign({}, t.a, { cash: t.a.cash + ask }) };
          if (c.b.cash <= st.players[t.from].cash && act({ t: 'tradeCounter', a: c.a, b: c.b })) return;
        }
        act({ t: 'tradeDecline' }); return;
      }
      case 'debt': {
        const d = st.debt; autoRaise(st, ctx, pi, d.amt);
        if (p.cash >= d.amt && act({ t: 'payDebt' })) return;
        act({ t: 'bankrupt' }); return;
      }
      case 'buy': {
        const { sq, price, force } = st.offer, s = SQ[sq];
        const res = reserve(st, pi);
        let need = res;
        if (s.k === 'prop') {
          const mates = GM[s.g].filter(i => i !== sq);
          if (mates.every(i => st.own[i] === pi)) need = 0;
          else if (mates.some(i => st.own[i] >= 0 && st.own[i] !== pi)) need = res * 0.6;
        }
        if (force) need = s.k === 'prop' && GM[s.g].every(i => i === sq || st.own[i] === pi) ? 0 : res + 250;
        if (p.cash - price >= need && act({ t: 'buy' })) return;
        act({ t: 'pass' }); return;
      }
      case 'bus': {
        const opts = [st.dice[0], st.dice[1], st.dice[0] + st.dice[1]].map((n, k) => [k, landingScore(st, pi, (p.pos + n) % N, st.dice[0] + st.dice[1])]);
        opts.sort((a, b) => b[1] - a[1]); act({ t: 'bus', k: opts[0][0] }); return;
      }
      case 'pick': {
        let best = PARK, bs = -1e9;
        for (let i = 0; i < N; i++) { if (i === GOJAIL) continue; const sc = landingScore(st, pi, i, 7); if (sc > bs) { bs = sc; best = i; } }
        act({ t: 'pick', sq: best }); return;
      }
      case 'roll': case 'end': {
        if (botManage(st, pi, ctx, act)) return;
        if (st.phase === 'roll') {
          if (p.jail) {
            const free = ALLBUY.filter(i => st.own[i] < 0).length, danger = reserve(st, pi) > 300;
            if (!danger && free >= 5) { if (p.jc.length && act({ t: 'jailCard' })) return; if (p.cash >= 250 && act({ t: 'jailPay' })) return; }
          }
          if (!act({ t: 'roll' })) endTurn(st, ctx);
          return;
        }
        if (!act({ t: 'end' })) endTurn(st, ctx);
        return;
      }
      default: break;
    }
  },
  skipTurn(st, pi, ctx) {
    if (st.phase === 'over' || this.turnOf(st) !== pi) return;
    const act = a => this.action(st, pi, a, ctx), p = st.players[pi];
    switch (st.phase) {
      case 'trade': act({ t: 'tradeDecline' }); return;
      case 'debt': autoRaise(st, ctx, pi, st.debt.amt); if (!(p.cash >= st.debt.amt && act({ t: 'payDebt' }))) act({ t: 'bankrupt' }); return;
      case 'buy': act({ t: 'pass' }); return;
      case 'bus': act({ t: 'bus', k: 2 }); return;
      case 'pick': act({ t: 'pick', sq: p.pos === GOJAIL ? PARK : p.pos }); return;
      case 'roll': case 'end': st.again = false; endTurn(st, ctx); return;
      default: break;
    }
  },
  onPresence(st, pi, on, ctx) {
    if (!on && st.phase === 'auction' && st.auc && !st.auc.out[pi] && st.auc.by !== pi) aucWithdraw(st, ctx, pi);
  },
  resume(st, ctx) {
    if (st.phase === 'rolling') schedule(st, ctx, 400, afterRoll);
    else if (st.phase === 'moving') schedule(st, ctx, 400, land);
    else if (st.phase === 'card') schedule(st, ctx, 800, applyCard);
    else if (st.phase === 'auction' && st.auc) { st.auc.dl = Math.max(st.auc.dl, now() + 5000); st.auc.bids++; armAuction(st, ctx); }
    else if (st.phase === 'trade' && st.trade) {
      const t = st.trade; t.dl = Math.max(t.dl, now() + 12000); t.dur = Math.max(t.dur, t.dl - now());
      ctx.later(t.dl - now() + 50, () => { if (st.trade && st.trade.n === t.n && st.phase === 'trade') endTrade(st, ctx, false, 'süre doldu'); });
    } else if (st.phase === 'over') ctx.end(result(st));
  },
  // test kancaları
  _t: { SQ, GM, TRANS, UTILS, GROUPS, BOARDS, DECKS, EVENTS, rentOf, worth, buildable, canBuild, sellable, mortgageable, forceable, tradeDelta, botWantsTrade, liquid, charge, chaosEvent, startAuction, closeAuction, placeBid, endTurn, bankrupt, applyCard, drawCard, resolveSquare, finishLanding, unmortCost, forcePrice, priceOf, sqName, cardText, ranking, alive, owned, auctionMax }
};

/* ------------------------------------------------------------------ arayüz */
const U = 64, BW = 13 * U;
// 13×13 birimlik ızgarada karenin yeri: 0 sağ alt köşe, saat yönünde
function rect(i) {
  if (i === 0) return { x: 11, y: 11, w: 2, h: 2, s: 'c' };
  if (i < 10) return { x: 11 - i, y: 11, w: 1, h: 2, s: 'b' };
  if (i === 10) return { x: 0, y: 11, w: 2, h: 2, s: 'c' };
  if (i < 20) return { x: 0, y: 11 - (i - 10), w: 2, h: 1, s: 'l' };
  if (i === 20) return { x: 0, y: 0, w: 2, h: 2, s: 'c' };
  if (i < 30) return { x: 2 + (i - 21), y: 0, w: 1, h: 2, s: 't' };
  if (i === 30) return { x: 11, y: 0, w: 2, h: 2, s: 'c' };
  return { x: 11, y: 2 + (i - 31), w: 2, h: 1, s: 'r' };
}
const sqCenter = i => { const r = rect(i); return [(r.x + r.w / 2) * U, (r.y + r.h / 2) * U]; };
const SLOTS = [[0, 0], [-.3, -.22], [.3, .22], [.3, -.22], [-.3, .22], [0, .3], [0, -.3]];
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const FACE_ROT = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };
const FACE_TF = { 1: '', 2: 'rotateX(90deg)', 3: 'rotateY(90deg)', 4: 'rotateY(-90deg)', 5: 'rotateX(-90deg)', 6: 'rotateY(180deg)' };
const ini = n => (String(n || '?').trim().charAt(0) || '?').toLocaleUpperCase('tr-TR');

let root = null, ui = null, V = null, E = {}, sqCache = [], toks = [], lastMv = 0, mvTimers = [], animPos = null,
  diceN = -1, diceBusy = false, cam = null, drag = null, pointers = new Map(), moved = false, lastCash = [], sheetPi = -1, sheetOpen = false,
  modal = null, draft = null, rafT = 0, lastCardN = 0, centerHTML = '', resizeT = 0, lastTurnKey = '', firstRender = true;

const isDesk = () => innerWidth >= 900;
function actor(v) {
  const t = v.turn; if (t == null || !v.players[t] || v.players[t].out) return -1;
  if (ui.mode === 'local') return v.players[t].isBot ? -1 : t;
  return ui.me === t ? t : -1;
}
const viewerPi = v => (ui.mode === 'local' ? (actor(v) >= 0 ? actor(v) : (v.players[v.cur].isBot ? v.players.findIndex(p => !p.isBot) : v.cur)) : ui.me);
const canManage = v => { const a = actor(v); return a >= 0 && a === v.cur && (v.phase === 'roll' || v.phase === 'end'); };
const send = (a, as) => { Sound.init(); if (ui.mode === 'local' && as != null && as >= 0) a.as = as; ui.send(a); };
const nmV = i => sqName(V ? V.board : 'tr', i);
const colorOf = i => (SQ[i].k === 'prop' ? GROUPS[SQ[i].g].c : SQ[i].k === 'tr' ? '#c9d2ff' : SQ[i].k === 'ut' ? '#9ff7e8' : '#8d86b8');

/* ---------- kareler ---------- */
function housesHTML(l) {
  if (l <= 0) return '';
  if (l === 6) return '<i class="sk"></i>';
  if (l === 5) return '<i class="ht"></i>';
  return '<i class="h"></i>'.repeat(l);
}
function sqHTML(v, i) {
  const s = SQ[i], o = v.own[i], nmRaw = sqName(v.board, i), name = esc(nmRaw);
  const lc = Math.max(...nmRaw.split(' ').map(w => w.length)), cls = lc > 10 ? ' xl' : lc > 8 ? ' l' : '';
  const ob = o >= 0 ? `<i class="ob" style="--oc:${v.players[o].color}">${ini(v.players[o].name)}</i>` : '';
  const mort = v.mort[i] ? '<i class="mt">İPOTEK</i>' : '';
  if (s.k === 'prop' || s.k === 'tr' || s.k === 'ut') {
    let pr;
    if (o < 0) pr = TL(priceOf(v, i));
    else if (v.mort[i]) pr = '—';
    else if (s.k === 'ut') pr = `zar×${UTILS.every(k => v.own[k] === o) ? 10 : 4}`;
    else pr = TL(rentOf(v, i, 7));
    const head = s.k === 'prop' ? `<i class="bd" style="--gc:${GROUPS[s.g].c}">${housesHTML(v.lvl[i])}</i>` : `<i class="bd ic">${sqIcon(v.board, i)}</i>`;
    return `${head}<span class="tx"><b class="nm${cls}">${name}</b><span class="pr">${o >= 0 && !v.mort[i] ? '<i class="rk">kira</i>' : ''}${pr}</span></span>${ob}${mort}`;
  }
  let sub = '';
  if (s.k === 'tax') sub = TL(s.amt);
  else if (s.k === 'go') sub = `+${TL(GO_BONUS)}`;
  else if (s.k === 'park' && v.cfg.jackpot) sub = `💰 ${TL(v.pot)}`;
  else if (s.k === 'jail') sub = 'ziyaret';
  return `<i class="ic">${sqIcon(v.board, i)}</i><span class="tx"><b class="nm${cls}">${name}</b>${sub ? `<span class="pr">${sub}</span>` : ''}</span>`;
}
function renderSquares(v) {
  const act = actor(v), pick = v.phase === 'pick' && act >= 0, offer = v.offer ? v.offer.sq : v.auc ? v.auc.sq : -1;
  E.sqs.forEach((el, i) => {
    const h = sqHTML(v, i); if (sqCache[i] !== h) { sqCache[i] = h; el.innerHTML = h; fitName(el); }
    const o = v.own[i];
    el.classList.toggle('own', o >= 0);
    if (o >= 0) el.style.setProperty('--oc', v.players[o].color); else el.style.removeProperty('--oc');
    el.classList.toggle('mort', !!v.mort[i]);
    el.classList.toggle('offer', i === offer);
    el.classList.toggle('pick', pick && i !== GOJAIL);
    el.classList.toggle('mono', SQ[i].k === 'prop' && isMono(v, SQ[i].g));
    el.classList.toggle('hot', !!(v.event && v.event.id === 'turizm' && Math.floor(i / 10) === v.event.reg && BUYABLE(i)));
  });
}
function renderCenter(v) {
  const B = BOARDS[v.board], ev = v.event ? EVENTS[v.event.id] : null;
  const chips = [`<span class="ek-chip">${MODE_NAME[v.mode]}</span>`, `<span class="ek-chip">${v.limit ? `Tur ${Math.min(v.round, v.limit)}/${v.limit}` : `Tur ${v.round}`}</span>`];
  if (v.cfg.jackpot) chips.push(`<span class="ek-chip gold">💰 Jackpot ${TL(v.pot)}</span>`);
  const h = `<div class="ek-logo"><b>EMLAK</b><b>KRALI</b><small>${B.ic} ${esc(B.n)}</small></div><div class="ek-cchips">${chips.join('')}</div>
    ${ev ? `<div class="ek-evc"><span>${ev.ic}</span><b>${esc(ev.n)}</b><small>${esc(v.event.txt || ev.d)}</small></div>` : ''}`;
  if (h !== centerHTML) { centerHTML = h; E.center.innerHTML = h; }
}

// uzun tek kelimeli adları kareye sığana kadar küçült
function fitName(el) {
  const n = el.querySelector('.nm'); if (!n) return;
  let fs = parseFloat(getComputedStyle(n).fontSize) || 12, k = 0;
  while (n.scrollWidth > n.clientWidth + 1 && fs > 7.5 && k++ < 12) { fs -= .5; n.style.fontSize = fs + 'px'; }
}
function tokVisible(i) {
  const el = toks[i]; if (!el || !cam) return true;
  const [w, h] = vpSize(), x = (+el.dataset.x || 0) * cam.s + cam.x, y = (+el.dataset.y || 0) * cam.s + cam.y;
  return x > 30 && x < w - 30 && y > 30 && y < h - 30;
}
/* ---------- piyonlar ---------- */
function tokXY(v, i, sq) {
  const here = v.players.map((p, k) => (!p.out && posOf(v, k) === sq ? k : -1)).filter(k => k >= 0);
  const slot = here.length > 1 ? here.indexOf(i) + 1 : 0;
  const [cx, cy] = sqCenter(sq), [dx, dy] = SLOTS[slot % SLOTS.length], side = rect(sq).s;
  let ox = dx * U * .85, oy = dy * U * .85;
  // isim okunsun diye piyonlar karenin dış kenarına yakın durur
  if (side === 'b') oy += U * .5; else if (side === 't') oy -= U * .5; else if (side === 'l') ox -= U * .55; else if (side === 'r') ox += U * .55;
  if (sq === JAIL && v.players[i].jail) { ox = ox * .7 + U * .35; oy = oy * .7 - U * .35; }
  return [cx + ox, cy + oy];
}
const posOf = (v, k) => (animPos && animPos.pi === k ? animPos.sq : v.players[k].pos);
function placeTok(i, x, y) { const el = toks[i]; if (!el) return; el.style.transform = `translate(${x}px, ${y}px)`; el.dataset.x = x; el.dataset.y = y; }
function renderTokens(v) {
  v.players.forEach((p, i) => {
    if (!toks[i]) {
      const t = document.createElement('div'); t.className = 'ek-tok';
      t.style.setProperty('--pc', p.color);
      const same = v.players.filter(q => ini(q.name) === ini(p.name)).length > 1;
      t.innerHTML = `<i class="tb">${same ? i + 1 : ini(p.name)}</i>`;
      E.toks.appendChild(t); toks[i] = t;
    }
    const t = toks[i];
    t.classList.toggle('cur', i === v.cur && v.phase !== 'over');
    t.classList.toggle('out', p.out);
    t.classList.toggle('jailed', p.jail);
  });
  if (v.mv && v.mv.id !== lastMv) { lastMv = v.mv.id; if (!firstRender) { animateMove(v, v.mv); return; } }
  if (!animPos) v.players.forEach((p, i) => { const [x, y] = tokXY(v, i, p.pos); placeTok(i, x, y); });
}
function stopMove() { mvTimers.forEach(clearTimeout); mvTimers = []; animPos = null; }
function animateMove(v, mv) {
  stopMove();
  const el = toks[mv.pi]; if (!el) return;
  const steps = mv.jump ? [mv.path[mv.path.length - 1]] : mv.path, dur = mv.jump ? 700 : mv.step;
  animPos = { pi: mv.pi, sq: mv.from };
  v.players.forEach((p, i) => { if (i !== mv.pi) { const [x, y] = tokXY(v, i, p.pos); placeTok(i, x, y); } });
  { const [x, y] = tokXY(v, mv.pi, mv.from); placeTok(mv.pi, x, y); }
  if (cam && cam.mode !== 'fit' && !isDesk()) cam.mode = 'follow';
  el.classList.add('moving');
  steps.forEach((sq, k) => {
    mvTimers.push(setTimeout(() => {
      if (!root || !V) return;
      animPos = { pi: mv.pi, sq };
      const [x, y] = tokXY(V, mv.pi, sq);
      el.style.transition = `transform ${Math.round(dur * .92)}ms ${mv.jump ? 'cubic-bezier(.5,-0.3,.4,1.3)' : 'linear'}`;
      placeTok(mv.pi, x, y);
      const tb = el.firstChild;
      if (tb && tb.animate) tb.animate(mv.jump
        ? [{ transform: 'scale(1)' }, { transform: 'translateY(-60px) scale(1.6)', offset: .45 }, { transform: 'scale(1)' }]
        : [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-16px) scale(1.12,.95)', offset: .45 }, { transform: 'translateY(0) scale(1.12,.86)', offset: .9 }, { transform: 'translateY(0) scale(1)' }],
      { duration: dur, easing: 'ease-out' });
      if (!mv.jump) Sound.tick(.35 + (k % 2) * .2); else Sound.whoosh();
      if (cam && cam.mode === 'follow') camTo(x, y, dur);
      if (sq === 0 && mv.go && k < steps.length) floatAt(0, `+${TL(GO_BONUS)}`, 'up');
    }, Math.round(k * dur + 30)));
  });
  mvTimers.push(setTimeout(() => {
    el.classList.remove('moving'); el.style.transition = '';
    animPos = null; if (V && root) renderTokens(V);
  }, Math.round(steps.length * dur + 80)));
}

/* ---------- kamera: takip / tüm tahta / serbest (sürükle, kıstır, tekerlek) ---------- */
function vpSize() { const r = E.vp.getBoundingClientRect(); return [r.width || 1, r.height || 1]; }
const fitScale = () => { const [w, h] = vpSize(); return Math.min(w, h) / BW; };
const followScale = () => { const [w] = vpSize(); return Math.max(fitScale(), Math.min(1.15, w / (6.3 * U))); };
function clampCam() {
  const [w, h] = vpSize(), sw = BW * cam.s, m = 24;
  cam.x = sw <= w ? (w - sw) / 2 : Math.min(m, Math.max(w - sw - m, cam.x));
  cam.y = sw <= h ? (h - sw) / 2 : Math.min(m, Math.max(h - sw - m, cam.y));
}
function applyCam(ms) {
  if (!E.board) return;
  clampCam();
  E.board.style.transition = ms ? `transform ${ms}ms cubic-bezier(.25,.8,.3,1)` : 'none';
  E.board.style.transform = `translate(${cam.x.toFixed(1)}px, ${cam.y.toFixed(1)}px) scale(${cam.s.toFixed(4)})`;
  root.querySelector('.ek').classList.toggle('zoomed', cam.mode !== 'fit');
  E.mini.hidden = cam.mode === 'fit';
  E.camBtn.textContent = cam.mode === 'fit' ? '🎯' : '🗺️';
  E.camBtn.setAttribute('aria-label', cam.mode === 'fit' ? 'Piyonu takip et' : 'Tüm tahtayı göster');
}
function camTo(x, y, ms) {
  const [w, h] = vpSize();
  if (cam.mode === 'follow') cam.s = cam.fs || followScale();
  cam.x = w / 2 - x * cam.s; cam.y = h / 2 - y * cam.s; applyCam(ms == null ? 350 : Math.max(120, ms));
}
function camFit(ms) { cam.mode = 'fit'; cam.s = fitScale(); cam.x = 0; cam.y = 0; applyCam(ms); }
function camFollow(ms) {
  cam.mode = 'follow'; cam.fs = cam.fs || followScale();
  if (!V) return;
  const k = animPos ? animPos.pi : V.cur, el = toks[k];
  const x = el ? +el.dataset.x || 0 : BW / 2, y = el ? +el.dataset.y || 0 : BW / 2;
  camTo(x, y, ms);
}
function setupCam() {
  cam = { mode: isDesk() ? 'fit' : 'follow', s: 1, x: 0, y: 0, fs: 0 };
  if (cam.mode === 'fit') camFit(0); else { cam.fs = followScale(); camFollow(0); }
}
function onResize() {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    if (!root || !cam) return;
    setVpVars();
    cam.fs = followScale();
    if (cam.mode === 'fit') camFit(0); else if (cam.mode === 'follow') camFollow(0); else applyCam(0);
  }, 80);
}
function onPointerDown(e) {
  if (e.target.closest('.ek-vpctl, .ek-tray, .ek-mini')) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) { drag = { sx: e.clientX, sy: e.clientY, x0: cam.x, y0: cam.y, s0: cam.s }; moved = false; }
  else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    drag = { pinch: true, d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, x0: cam.x, y0: cam.y, s0: cam.s };
  }
}
function onPointerMove(e) {
  if (!pointers.has(e.pointerId) || !drag) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const r = E.vp.getBoundingClientRect();
  if (drag.pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const s = Math.max(fitScale() * .95, Math.min(1.8, drag.s0 * d / drag.d0));
    const mx = drag.mx - r.left, my = drag.my - r.top, bx = (mx - drag.x0) / drag.s0, by = (my - drag.y0) / drag.s0;
    cam.mode = 'free'; cam.s = s; cam.x = mx - bx * s; cam.y = my - by * s; moved = true; applyCam(0); return;
  }
  const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if (!moved && Math.hypot(dx, dy) < 7) return;
  if (cam.mode === 'fit' && cam.s <= fitScale() + 1e-3) return;
  moved = true; cam.mode = 'free'; cam.x = drag.x0 + dx; cam.y = drag.y0 + dy; applyCam(0);
}
function onPointerUp(e) {
  pointers.delete(e.pointerId);
  if (pointers.size === 0) drag = null;
  else if (pointers.size === 1) { const [p] = [...pointers.values()]; drag = { sx: p.x, sy: p.y, x0: cam.x, y0: cam.y, s0: cam.s }; }
}
function onWheel(e) {
  if (!cam) return;
  e.preventDefault();
  const r = E.vp.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
  const s = Math.max(fitScale(), Math.min(1.8, cam.s * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
  const bx = (mx - cam.x) / cam.s, by = (my - cam.y) / cam.s;
  cam.mode = s <= fitScale() + 1e-3 ? 'fit' : 'free'; cam.s = s; cam.x = mx - bx * s; cam.y = my - by * s; applyCam(0);
}
function zoom(f) {
  const [w, h] = vpSize(), s = Math.max(fitScale(), Math.min(1.8, cam.s * f));
  const bx = (w / 2 - cam.x) / cam.s, by = (h / 2 - cam.y) / cam.s;
  cam.mode = s <= fitScale() + 1e-3 ? 'fit' : (cam.mode === 'follow' ? 'follow' : 'free'); cam.s = s; if (cam.mode === 'follow') cam.fs = s;
  cam.x = w / 2 - bx * s; cam.y = h / 2 - by * s; applyCam(220);
}
function renderMini(v) {
  const k = 70 / 13, dots = v.players.map((p, i) => {
    if (p.out) return '';
    const el = toks[i], x = el ? (+el.dataset.x || 0) / U * k : 0, y = el ? (+el.dataset.y || 0) / U * k : 0;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i === v.cur ? 3.6 : 2.6}" fill="${p.color}" stroke="#fff" stroke-width="${i === v.cur ? 1.2 : .6}"/>`;
  }).join('');
  let view = '';
  if (cam && cam.mode !== 'fit') { const [w, h] = vpSize(); const s = cam.s * U / k; view = `<rect x="${(-cam.x / s).toFixed(1)}" y="${(-cam.y / s).toFixed(1)}" width="${(w / s).toFixed(1)}" height="${(h / s).toFixed(1)}" fill="none" stroke="#fff" stroke-width="1" rx="2" opacity=".8"/>`; }
  if (!E.miniBase) {
    E.miniBase = SQ.map((s, i) => { const r = rect(i); return `<rect x="${(r.x * k + .3).toFixed(1)}" y="${(r.y * k + .3).toFixed(1)}" width="${(r.w * k - .6).toFixed(1)}" height="${(r.h * k - .6).toFixed(1)}" rx=".8" fill="${colorOf(i)}" opacity="${s.k === 'prop' ? .9 : .35}"/>`; }).join('');
  }
  E.mini.innerHTML = `<svg viewBox="0 0 70 70" width="70" height="70" aria-hidden="true"><rect width="70" height="70" rx="8" fill="#0d0626" opacity=".85"/>${E.miniBase}${view}${dots}</svg>`;
}

/* ---------- 3B zarlar ---------- */
function faceHTML(f, speed) {
  if (speed) {
    if (f === 4 || f === 5) return '<span class="sym">🚌</span>';
    if (f === 6) return '<span class="sym">💰</span>';
  }
  return `<span class="pips">${Array.from({ length: 9 }, (_, k) => `<i class="${PIPS[f].includes(k) ? 'on' : ''}"></i>`).join('')}</span>`;
}
function cubeHTML(speed) {
  return `<div class="ek-dw${speed ? ' sp' : ''}"><i class="ek-dsh"></i><div class="ek-tilt"><div class="ek-cube">${[1, 2, 3, 4, 5, 6].map(f => `<div class="ek-face" style="transform:${FACE_TF[f]} translateZ(var(--dh))">${faceHTML(f, speed)}</div>`).join('')}</div></div></div>`;
}
function setupDice(n) {
  if (E.diceN === n) return;
  E.diceN = n;
  E.tray.querySelector('.ek-dice').innerHTML = cubeHTML(false) + cubeHTML(false) + (n === 3 ? cubeHTML(true) : '');
  E.cubes = [...E.tray.querySelectorAll('.ek-cube')]; E.dws = [...E.tray.querySelectorAll('.ek-dw')];
}
function restDice(vals) { E.cubes.forEach((c, k) => { const f = vals[k] || 1, [rx, ry] = FACE_ROT[f]; c.getAnimations && c.getAnimations().forEach(a => a.cancel()); c.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; }); }
function clack(g) { try { if (Sound.ok && Sound.ok('ekclack', 45)) { Sound.noise(.05, { freq: 2600, q: 1.2, gain: .55 * g }); Sound.tone(150 + Math.random() * 60, .07, { type: 'triangle', gain: .18 * g }); } } catch (e) { /* ses yok */ } }
let trayT = 0;
// telefonda büyük zar tepsisini piyonun olmadığı yarıya koy
function trayPlace() {
  if (!V || !E.vp) return;
  const el = toks[V.cur]; let top = false;
  if (el && cam) { const y = (+el.dataset.y || 0) * cam.s + cam.y, [, h] = vpSize(); top = y > h * .55; }
  E.tray.classList.toggle('top', top);
}
function trayBig(ms) { clearTimeout(trayT); E.tray.classList.add('big'); trayT = setTimeout(() => { if (E.tray) E.tray.classList.remove('big'); }, ms); }
function rollDice(vals) {
  diceBusy = true; trayBig(1800); trayPlace();
  E.tray.classList.remove('dbl', 'rest'); E.tray.classList.add('rolling');
  const D = 1150;
  E.cubes.forEach((c, k) => {
    const f = vals[k] || 1, [rx, ry] = FACE_ROT[f];
    const sx = (Math.random() < .5 ? -1 : 1) * (2 + randInt(0, 1)) * 360, sy = (Math.random() < .5 ? -1 : 1) * (2 + randInt(0, 1)) * 360;
    const fx = rx, fy = ry;
    const kf = (p, o, e) => ({ transform: `rotateX(${(fx - sx * (1 - p)).toFixed(1)}deg) rotateY(${(fy - sy * (1 - p)).toFixed(1)}deg)`, offset: o, easing: e });
    c.style.transform = `rotateX(${fx}deg) rotateY(${fy}deg)`;
    c.animate([kf(0, 0, 'linear'), kf(.62, .36, 'ease-out'), kf(.9, .64, 'ease-out'), kf(.985, .86, 'ease-out'), kf(1, 1)], { duration: D + k * 70, easing: 'linear' });
    const dir = k % 2 ? 1 : -1, ox = dir * (90 + randInt(0, 50)), oy = -(70 + randInt(0, 40));
    E.dws[k].animate([
      { transform: `translate(${ox}px, ${oy}px) scale(.55)`, easing: 'cubic-bezier(.5,0,.9,.6)' },
      { transform: `translate(${ox * .25}px, 0) scale(1)`, offset: .36, easing: 'cubic-bezier(.2,.6,.4,1)' },
      { transform: `translate(${ox * .1}px, -30px) scale(1.04)`, offset: .5, easing: 'cubic-bezier(.6,0,.9,.5)' },
      { transform: `translate(${ox * .04}px, 0) scale(1)`, offset: .64, easing: 'cubic-bezier(.2,.6,.4,1)' },
      { transform: 'translate(0, -10px) scale(1.01)', offset: .75, easing: 'cubic-bezier(.6,0,.9,.5)' },
      { transform: 'translate(0, 0) scale(1)', offset: .86 },
      { transform: 'translate(0, 0) scale(1)' }
    ], { duration: D + k * 70 });
    [.36, .64, .86].forEach((o, j) => setTimeout(() => clack(1 - j * .3), (D + k * 70) * o));
  });
  setTimeout(() => {
    diceBusy = false; if (!root) return;
    E.tray.classList.remove('rolling'); E.tray.classList.add('rest');
    const dbl = vals[0] === vals[1];
    E.tray.classList.toggle('dbl', dbl);
    E.dlab.textContent = diceLabel(vals);
  }, D + 160);
}
function diceLabel(vals) {
  const [a, b, c] = vals; let t = `${a} + ${b}`;
  if (c) t += c <= 3 ? ` + ${c} = ${a + b + c}` : c === 6 ? ' · 💰 Bay Para' : ' · 🚌 Otobüs';
  else t += ` = ${a + b}`;
  return (a === b ? 'ÇİFT! ' : '') + t;
}
function renderDice(v) {
  setupDice(v.mode === 'mega' ? 3 : 2);
  const vals = [v.dice[0], v.dice[1]].concat(v.mode === 'mega' ? [v.sd || 1] : []);
  if (v.phase === 'rolling' && v.rollN !== diceN) { diceN = v.rollN; E.dlab.textContent = 'Zarlar yuvarlanıyor…'; rollDice(vals); return; }
  if (diceN !== v.rollN) {
    diceN = v.rollN; restDice(vals);
    E.tray.classList.toggle('dbl', v.rollN > 0 && v.dice[0] === v.dice[1]); E.tray.classList.add('rest');
    E.dlab.textContent = v.rollN > 0 ? diceLabel(vals) : 'Zar atmaya hazır';
  }
  E.tray.classList.toggle('glow', actor(v) >= 0 && v.phase === 'roll');
}

/* ---------- oyuncular ---------- */
function renderPlayers(v) {
  const h = v.players.map((p, i) => {
    const n = owned(v, i).length, tags = [];
    if (p.jail) tags.push('🔒'); if (p.jc.length) tags.push('🎫' + (p.jc.length > 1 ? p.jc.length : '')); if (p.shield) tags.push('🛡️');
    if (!p.online && !p.isBot) tags.push('📴');
    return `<button type="button" class="ek-pl ${i === v.cur && v.phase !== 'over' ? 'active' : ''} ${i === sheetPi ? 'sel' : ''} ${p.out ? 'out' : ''} ${p.online === false && !p.isBot ? 'off' : ''}" style="--pc:${p.color}" data-a="port" data-pi="${i}" aria-label="${esc(p.name)} portföyü">
      <span class="av" style="--pc:${p.color}">${p.isBot ? '🤖' : initial(p.name)}</span>
      <span class="ek-pt"><b>${esc(p.name)}${(ui.mode === 'online' && ui.me === i) ? ' <em>sen</em>' : ''}</b>
      <span class="ek-cash">${p.out ? 'İFLAS' : TL(p.cash)}</span><small>${p.out ? '' : `${n} mülk<i class="nw"> · net ${TL(worth(v, i))}</i>`} ${tags.join(' ')}</small></span>
      <span class="ek-fl" data-fl="${i}"></span></button>`;
  }).join('');
  E.pl.className = 'ek-players n' + v.players.length;
  if (E.pl.innerHTML !== h) E.pl.innerHTML = h;
  // para uçuşları
  v.players.forEach((p, i) => {
    const d = lastCash[i] == null ? 0 : p.cash - lastCash[i];
    if (d && !firstRender) { floatChip(i, d); floatTok(i, d); }
  });
  lastCash = v.players.map(p => p.cash);
}
function floatChip(i, d) {
  const host = E.pl.querySelector(`[data-fl="${i}"]`); if (!host) return;
  const s = document.createElement('i'); s.className = 'ek-float ' + (d > 0 ? 'up' : 'down'); s.textContent = `${d > 0 ? '+' : '−'}${TL(Math.abs(d))}`;
  host.appendChild(s); setTimeout(() => s.remove(), 1700);
}
function floatTok(i, d) {
  const el = toks[i]; if (!el || V.players[i].out) return;
  const s = document.createElement('div'); s.className = 'ek-bfloat ' + (d > 0 ? 'up' : 'down'); s.textContent = `${d > 0 ? '+' : '−'}${TL(Math.abs(d))}`;
  s.style.left = (+el.dataset.x || 0) + 'px'; s.style.top = (+el.dataset.y || 0) + 'px';
  E.toks.appendChild(s); setTimeout(() => s.remove(), 1800);
}
function floatAt(sq, txt, cls) {
  const [x, y] = sqCenter(sq), s = document.createElement('div'); s.className = 'ek-bfloat ' + cls; s.textContent = txt;
  s.style.left = x + 'px'; s.style.top = y + 'px'; E.toks.appendChild(s); setTimeout(() => s.remove(), 1800);
}
function stamp(txt, cls) {
  if (!E.stamp) return;
  E.stamp.className = 'ek-stamp'; E.stamp.textContent = txt; void E.stamp.offsetWidth; E.stamp.className = 'ek-stamp show ' + (cls || '');
}

/* ---------- HUD: sıra, mesaj, düğmeler ---------- */
function offerHTML(v) {
  const o = v.offer, s = SQ[o.sq];
  const sub = o.force ? `Her Şeyi Al: ${esc(v.players[o.from].name)} oyuncusundan 1,5 katına` : s.k === 'prop' ? `${GROUPS[s.g].n} · kira ${TL(s.r[0])}, tekelde ${TL(s.r[0] * 2)}` : s.k === 'tr' ? 'Ulaşım · kira 25 / 50 / 100 / 200 ₺' : 'Tesis · kira zar × 4 (ikisi birden × 10)';
  return `<button type="button" class="ek-offer" data-a="deed" data-sq="${o.sq}" style="--gc:${colorOf(o.sq)}"><i class="ob2">${s.k === 'prop' ? '🏠' : sqIcon(v.board, o.sq)}</i><span><b>${esc(nmV(o.sq))}</b><small>${sub}</small></span><em>${TL(o.price)}</em></button>`;
}
function tradeMini(v, t) {
  const side = (x, pi) => `<div class="ek-tside"><small style="color:${v.players[pi].color}">${esc(v.players[pi].name)} verir</small>${x.sqs.map(i => `<span class="ek-tag" style="--gc:${colorOf(i)}">${esc(nmV(i))}</span>`).join('')}${x.cash ? `<span class="ek-tag cash">${TL(x.cash)}</span>` : ''}${x.jc ? `<span class="ek-tag">🎫 ×${x.jc}</span>` : ''}${sideEmpty(x) ? '<span class="ek-tag none">—</span>' : ''}</div>`;
  return `<div class="ek-tmini">${side(t.a, t.from)}<span class="ek-tsw">⇄</span>${side(t.b, t.to)}</div>`;
}
function hudActs(v, act) {
  const b = [], p = v.players[act];
  const sec = [];
  if (canManage(v)) {
    if (owned(v, act).length) sec.push(`<button type="button" class="btn btn-ghost sm" data-a="port" data-pi="${act}">🏗️ Mülklerim</button>`);
    if (alive(v).length > 1) sec.push('<button type="button" class="btn btn-ghost sm" data-a="tradeOpen">🤝 Takas</button>');
  }
  switch (v.phase) {
    case 'roll':
      if (p.jail) {
        b.push(`<button type="button" class="btn btn-spin" data-a="roll">🎲 Çift Dene (${p.tries}/3)</button>`);
        b.push(`<button type="button" class="btn btn-vowel" data-a="jailPay" ${p.cash >= JAIL_FEE ? '' : 'disabled'}>🔓 ${TL(JAIL_FEE)} Öde</button>`);
        if (p.jc.length) b.push('<button type="button" class="btn btn-vowel" data-a="jailCard">🎫 Kartı Kullan</button>');
      } else b.push(`<button type="button" class="btn btn-spin big" data-a="roll">🎲 ${v.dbl > 0 ? 'TEKRAR ZAR AT' : 'ZAR AT'}</button>`);
      break;
    case 'end': b.push('<button type="button" class="btn btn-spin big" data-a="end">Turu Bitir ➜</button>'); break;
    case 'buy': {
      const o = v.offer;
      b.push(`<button type="button" class="btn btn-spin" data-a="buy" ${p.cash >= o.price ? '' : 'disabled'}>${o.force ? '⚡ Zorla Al' : '🏠 Satın Al'} ${TL(o.price)}</button>`);
      b.push(`<button type="button" class="btn ${!o.force && v.cfg.auction ? 'btn-solve' : 'btn-ghost'}" data-a="pass">${!o.force && v.cfg.auction ? '🔨 Açık Artırma' : o.force ? 'Hayır, kalsın' : 'Pas Geç'}</button>`);
      break;
    }
    case 'debt': {
      const d = v.debt;
      b.push(`<button type="button" class="btn btn-spin" data-a="payDebt" ${p.cash >= d.amt ? '' : 'disabled'}>💳 ${TL(d.amt)} Öde</button>`);
      b.push(`<button type="button" class="btn btn-vowel" data-a="port" data-pi="${act}">💼 Para Topla</button>`);
      b.push('<button type="button" class="btn btn-danger" data-a="bankrupt">☠️ İflas Et</button>');
      break;
    }
    case 'bus': {
      const [x, y] = v.dice;
      [[0, x], [1, y], [2, x + y]].forEach(([k, n]) => b.push(`<button type="button" class="btn ${k === 2 ? 'btn-spin' : 'btn-vowel'}" data-a="bus" data-k="${k}">🚌 ${n} kare <small>${esc(nmV((p.pos + n) % N))}</small></button>`));
      break;
    }
    case 'pick': b.push(`<button type="button" class="btn btn-vowel" data-a="pickSq" data-sq="${PARK}">🅿️ Otoparka git</button>`); break;
    default: break;
  }
  return { b, sec };
}
function renderHud(v) {
  const act = actor(v), cp = v.players[v.cur], tp = v.turn != null ? v.players[v.turn] : cp;
  let turn;
  if (v.phase === 'over') turn = '<span class="ek-turn over">🏆 Oyun bitti</span>';
  else if (act >= 0) turn = `<span class="ek-turn mine"><span class="av" style="--pc:${v.players[act].color}">${initial(v.players[act].name)}</span>${ui.mode === 'local' && v.players.filter(q => !q.isBot).length > 1 ? `${esc(v.players[act].name)}, sıra sende` : 'Sıra sende'}${v.phase === 'trade' ? ' · takas' : v.phase === 'debt' ? ' · borç' : ''}</span>`;
  else if (v.phase === 'auction') turn = '<span class="ek-turn auc">🔨 Açık artırma sürüyor</span>';
  else if (v.turn == null) turn = `<span class="ek-turn"><span class="av" style="--pc:${cp.color}">${initial(cp.name)}</span><b style="color:${cp.color}">${esc(cp.name)}</b>&nbsp;oynuyor…</span>`;
  else turn = `<span class="ek-turn"><span class="av" style="--pc:${tp.color}">${initial(tp.name)}</span>Sıra: <b style="color:${tp.color}">${esc(tp.name)}</b>${tp.isBot ? ' <i class="think">düşünüyor</i>' : ''}</span>`;
  const ev = v.event ? EVENTS[v.event.id] : null;
  const top = `${turn}<button type="button" class="ek-ibtn" data-a="port" data-pi="${viewerPi(v)}" aria-label="Portföy">💼</button>`;
  if (E.hTop.innerHTML !== top) E.hTop.innerHTML = top;
  let msg = '';
  if (v.phase === 'buy' && v.offer) msg = offerHTML(v);
  else if (v.phase === 'debt' && v.debt) msg = `<div class="ek-debt">⚠️ <b>${esc(v.players[v.debt.pi].name)}</b> borçlu: <b>${TL(v.debt.amt)}</b> <small>(nakit ${TL(v.players[v.debt.pi].cash)}, toplanabilir ${TL(liquid(v, v.debt.pi))})</small></div>`;
  else if (v.phase === 'trade' && v.trade) msg = `<div class="ek-tstat"><b>🤝 ${esc(v.players[v.trade.from].name)} → ${esc(v.players[v.trade.to].name)}</b>${tradeMini(v, v.trade)}<div class="ek-bar"><i data-dl="trade"></i></div></div>`;
  else if (v.phase === 'pick' && act >= 0) msg = '<p class="ek-msg hint">✨ Tahtada gitmek istediğin kareye dokun!</p>';
  else msg = `<p class="ek-msg">${esc(v.msg || '')}</p>`;
  if (ev && v.phase !== 'buy' && v.phase !== 'trade') msg += `<p class="ek-evline">${ev.ic} <b>${esc(ev.n)}</b> · ${esc(v.event.txt || ev.d)}</p>`;
  if (E.hMsg.innerHTML !== msg) E.hMsg.innerHTML = msg;
  let acts = '';
  if (act >= 0 && v.phase !== 'trade') {
    const { b, sec } = hudActs(v, act);
    if (b.length) acts += `<div class="ek-arow n${b.length}">${b.join('')}</div>`;
    if (sec.length) acts += `<div class="ek-arow sec">${sec.join('')}</div>`;
  } else if (v.phase === 'trade' && v.trade) {
    const from = v.trade.from, me = ui.mode === 'local' ? -2 : ui.me;
    if (me === from || (ui.mode === 'local' && !v.players[from].isBot && v.players[v.trade.to].isBot)) acts = `<div class="ek-arow n1"><button type="button" class="btn btn-ghost" data-a="tCancel">↩️ Teklifi geri çek</button></div>`;
  }
  if (E.hActs.innerHTML !== acts) E.hActs.innerHTML = acts;
  E.hActs.hidden = !acts;
}

/* ---------- portföy ---------- */
function deedMini(v, i) {
  const s = SQ[i], l = v.lvl[i], o = v.own[i];
  const rent = v.mort[i] ? 'İpotekli' : s.k === 'ut' ? `zar × ${UTILS.every(k => v.own[k] === o) ? 10 : 4}` : `Kira ${TL(rentOf(v, i, 7))}`;
  return `<button type="button" class="ek-dm ${v.mort[i] ? 'mort' : ''}" data-a="deed" data-sq="${i}" style="--gc:${colorOf(i)}">
    <i class="dmb">${s.k === 'prop' ? housesHTML(l) : sqIcon(v.board, i)}</i><b>${esc(nmV(i))}</b><small>${rent}</small>${s.k === 'prop' && l ? `<em>${LVL_NAME[l]}</em>` : ''}</button>`;
}
function portHTML(v, pi) {
  const p = v.players[pi], tabs = v.players.map((q, i) => `<button type="button" class="ek-ptab ${i === pi ? 'on' : ''} ${q.out ? 'out' : ''}" data-a="port" data-pi="${i}" style="--pc:${q.color}"><span class="av" style="--pc:${q.color}">${q.isBot ? '🤖' : initial(q.name)}</span><b>${esc(q.name)}</b><small>${q.out ? 'İflas' : TL(worth(v, i))}</small></button>`).join('');
  const mine = owned(v, pi);
  let body = `<div class="ek-psum"><span><small>Nakit</small><b>${TL(p.cash)}</b></span><span><small>Net değer</small><b>${TL(worth(v, pi))}</b></span><span><small>Mülk</small><b>${mine.length}</b></span>${p.jc.length ? `<span><small>Kart</small><b>🎫 ${p.jc.length}</b></span>` : ''}${p.shield ? '<span><small>Kalkan</small><b>🛡️</b></span>' : ''}</div>`;
  if (p.out) body += '<p class="ek-empty">Bu oyuncu iflas etti.</p>';
  else if (!mine.length) body += '<p class="ek-empty">Henüz mülk yok. Boş bir mülke gelince satın alabilir ya da açık artırmada kapabilirsin.</p>';
  const canAct = canManage(v) && actor(v) === pi;
  GROUPS.forEach((G, g) => {
    const sq = GM[g].filter(i => v.own[i] === pi); if (!sq.length) return;
    const mono = ownsGroup(v, pi, g);
    body += `<div class="ek-grp" style="--gc:${G.c}"><div class="ek-gh"><i></i><b>${G.n}</b><small>${sq.length}/${GM[g].length}</small>${mono ? '<span class="mono">👑 TEKEL</span>' : ''}${canAct && GM[g].some(i => canBuild(v, pi, i)) ? '<span class="can">inşaata hazır</span>' : ''}</div><div class="ek-dms">${sq.map(i => deedMini(v, i)).join('')}</div></div>`;
  });
  const tr = TRANS.filter(i => v.own[i] === pi), ut = UTILS.filter(i => v.own[i] === pi);
  if (tr.length) body += `<div class="ek-grp" style="--gc:#c9d2ff"><div class="ek-gh"><i></i><b>Ulaşım</b><small>${tr.length}/4</small></div><div class="ek-dms">${tr.map(i => deedMini(v, i)).join('')}</div></div>`;
  if (ut.length) body += `<div class="ek-grp" style="--gc:#9ff7e8"><div class="ek-gh"><i></i><b>Tesisler</b><small>${ut.length}/2</small></div><div class="ek-dms">${ut.map(i => deedMini(v, i)).join('')}</div></div>`;
  const free = ALLBUY.filter(i => v.own[i] < 0).length;
  body += `<p class="ek-pfoot">Bankada satılık: <b>${free}</b> mülk · ${esc(MODE_NAME[v.mode])} mod${v.cfg.auction ? ' · açık artırma' : ''}${v.cfg.jackpot ? ' · otopark jackpot' : ''}${v.cfg.force ? ' · her şeyi al' : ''}</p>`;
  return `<div class="ek-phead"><b>💼 Portföy <span style="color:${p.color}">· ${esc(p.name)}</span></b><button type="button" class="ek-x" data-a="closeSheet" aria-label="Kapat">✕</button></div><div class="ek-ptabs">${tabs}</div><div class="ek-pbody">${body}</div>`;
}
function renderPort(v) {
  if (!isDesk() && !sheetOpen) { E.side.classList.remove('open'); return; }
  if (sheetPi < 0 || !v.players[sheetPi]) sheetPi = Math.max(0, viewerPi(v));
  const h = portHTML(v, sheetPi);
  if (E.port.innerHTML !== h) { const sc = E.port.querySelector('.ek-pbody'), top = sc ? sc.scrollTop : 0; E.port.innerHTML = h; const sc2 = E.port.querySelector('.ek-pbody'); if (sc2) sc2.scrollTop = top; }
  E.side.classList.toggle('open', sheetOpen);
}

/* ---------- modallar: tapu kartı, takas editörü, gelen takas, açık artırma ---------- */
function deedHTML(v, i) {
  const s = SQ[i], o = v.own[i], l = v.lvl[i], act = actor(v);
  const name = esc(nmV(i));
  let body = '', foot = [];
  if (s.k === 'prop') {
    const tb = rentTable(s, v.mode === 'mega');
    body += `<div class="ek-rt">${tb.map((r, k) => `<span class="${o >= 0 && !v.mort[i] && k === l ? 'on' : ''}"><i>${k === 0 ? 'Arsa' : k === 0 ? '' : LVL_NAME[k]}${k === 0 ? ' <small>(tekelde ×2)</small>' : ''}</i><b>${TL(r)}</b></span>`).join('')}</div>`;
    body += `<p class="ek-dl">Fiyat <b>${TL(s.p)}</b> · Bina <b>${TL(GROUPS[s.g].hc)}</b>${v.event && v.event.id === 'imar' ? ' <small>(bu tur yarı fiyat)</small>' : ''} · İpotek <b>${TL(s.p / 2)}</b></p>`;
    body += `<p class="ek-dl small">${GROUPS[s.g].n} grubu: ${GM[s.g].map(k => `<span style="color:${v.own[k] >= 0 ? v.players[v.own[k]].color : 'inherit'}">${esc(nmV(k))}</span>`).join(' · ')}</p>`;
  } else if (s.k === 'tr') {
    body += `<div class="ek-rt">${[1, 2, 3, 4].map(n => `<span class="${o >= 0 && !v.mort[i] && TRANS.filter(k => v.own[k] === o).length === n ? 'on' : ''}"><i>${n} ulaşım</i><b>${TL(25 * 2 ** (n - 1))}</b></span>`).join('')}</div><p class="ek-dl">Fiyat <b>${TL(s.p)}</b> · İpotek <b>${TL(s.p / 2)}</b></p>`;
  } else if (s.k === 'ut') {
    body += `<div class="ek-rt"><span class="${o >= 0 && UTILS.filter(k => v.own[k] === o).length === 1 ? 'on' : ''}"><i>1 tesis</i><b>zar × 4</b></span><span class="${o >= 0 && UTILS.every(k => v.own[k] === o) ? 'on' : ''}"><i>2 tesis</i><b>zar × 10</b></span></div><p class="ek-dl">Fiyat <b>${TL(s.p)}</b> · İpotek <b>${TL(s.p / 2)}</b></p>`;
  } else {
    const info = { go: `Üstünden geçince ya da üstüne gelince ${TL(GO_BONUS)} al.`, jail: `Yalnızca ziyaret. Hapistekiler ${TL(JAIL_FEE)} öder, kart kullanır ya da 3 kez çift dener; 3. denemede ödeyip çıkar.`,
      park: v.cfg.jackpot ? `Otopark Jackpot açık: vergiler, cezalar ve kart ödemeleri burada birikir. Buraya gelen hepsini alır! Şu an: ${TL(v.pot)}` : 'Dinlenme alanı: hiçbir şey olmaz.',
      gojail: 'Doğruca hapse git! Başlangıç’tan geçme, para alma.', tax: `Bankaya ${TL(s.amt || 0)} öde${v.cfg.jackpot ? ' (otopark kumbarasına gider)' : ''}.`, s: 'Şans kartı çek: ışınlanma, para, kalkan, hapis…', k: 'Kader kartı çek: miras, fatura, doğum günü…' }[s.k];
    body = `<p class="ek-dl">${esc(info)}</p>`;
  }
  if (BUYABLE(i)) {
    body += `<p class="ek-down">${o >= 0 ? `Sahibi <b style="color:${v.players[o].color}">${esc(v.players[o].name)}</b>${s.k === 'prop' && l ? ` · ${LVL_NAME[l]}` : ''}${v.mort[i] ? ' · <b class="bad">İPOTEKLİ</b>' : ` · şu anki kira <b>${s.k === 'ut' ? `zar × ${UTILS.every(k => v.own[k] === o) ? 10 : 4}` : TL(rentOf(v, i, 7))}</b>`}` : `Bankada satılık · ${TL(priceOf(v, i))}`}</p>`;
    const mgr = o >= 0 && o === act && act === v.cur;
    if (mgr && (v.phase === 'roll' || v.phase === 'end')) {
      if (buildable(v, act, i)) foot.push(`<button type="button" class="btn btn-solve" data-a="build" data-sq="${i}" ${canBuild(v, act, i) ? '' : 'disabled'}>${l === 4 ? '🏨 Otel' : l === 5 ? '🏙️ Gökdelen' : '🏠 Ev'} kur ${TL(hcOf(v, i))}</button>`);
      if (canUnmort(v, act, i) || v.mort[i]) foot.push(`<button type="button" class="btn btn-vowel" data-a="unmort" data-sq="${i}" ${canUnmort(v, act, i) ? '' : 'disabled'}>İpoteği kaldır ${TL(unmortCost(i))}</button>`);
    }
    if (mgr && (v.phase === 'roll' || v.phase === 'end' || v.phase === 'debt')) {
      if (sellable(v, act, i)) foot.push(`<button type="button" class="btn btn-ghost" data-a="sell" data-sq="${i}">Bina sat +${TL(GROUPS[s.g].hc / 2)}</button>`);
      if (mortgageable(v, act, i)) foot.push(`<button type="button" class="btn btn-ghost" data-a="mort" data-sq="${i}">İpotek et +${TL(s.p / 2)}</button>`);
      if (s.k === 'prop' && !v.mort[i] && !mortgageable(v, act, i) && !sellable(v, act, i) && v.lvl[i] === 0 && !groupClean(v, s.g)) foot.push('<p class="ek-note">İpotek için önce gruptaki binaları sat (eşit kural).</p>');
      if (s.k === 'prop' && ownsGroup(v, act, s.g) && !buildable(v, act, i) && v.lvl[i] < maxLvl(v) && !GM[s.g].some(k => v.mort[k])) foot.push('<p class="ek-note">Eşit inşaat kuralı: önce gruptaki diğer mülklere bina kur.</p>');
      if (s.k === 'prop' && ownsGroup(v, act, s.g) && GM[s.g].some(k => v.mort[k])) foot.push('<p class="ek-note">Grupta ipotekli mülk varken inşaat yapılamaz.</p>');
    }
    if (o >= 0 && o !== act && canManage(v) && tradable(v, i) && !v.players[o].out) foot.push(`<button type="button" class="btn btn-ghost" data-a="tradeOpen" data-sq="${i}" data-pi="${o}">🤝 Takas teklif et</button>`);
  }
  const head = s.k === 'prop' ? `<div class="ek-dh" style="--gc:${GROUPS[s.g].c}"><small>TAPU SENEDİ</small><b>${name}</b></div>` : `<div class="ek-dh alt" style="--gc:${colorOf(i)}"><span class="big">${sqIcon(v.board, i)}</span><b>${name}</b></div>`;
  return `<div class="ek-card ek-deed ${v.mort[i] ? 'mort' : ''}" role="dialog" aria-label="${name}"><button type="button" class="ek-x" data-a="closeModal" aria-label="Kapat">✕</button>${head}<div class="ek-db">${body}</div>${foot.length ? `<div class="ek-df">${foot.join('')}</div>` : ''}</div>`;
}
function newDraft(v, to, sq) {
  return { to, a: emptySide(), b: { sqs: sq != null ? [sq] : [], cash: 0, jc: 0 }, counter: false };
}
function draftSide(v, pi, side, key, label) {
  const p = v.players[pi], props = owned(v, pi);
  const chips = props.map(i => { const ok = tradable(v, i), on = side.sqs.includes(i); return `<button type="button" class="ek-tc ${on ? 'on' : ''} ${v.mort[i] ? 'mort' : ''}" data-a="tSq" data-side="${key}" data-sq="${i}" style="--gc:${colorOf(i)}" ${ok ? '' : 'disabled'} title="${ok ? '' : 'Grupta bina var'}">${esc(nmV(i))}${v.mort[i] ? ' <small>ipotekli</small>' : ''}</button>`; }).join('') || '<p class="ek-empty sm">Mülk yok</p>';
  return `<div class="ek-tcol"><h4 style="color:${p.color}">${label} <small>(${esc(p.name)} · ${TL(p.cash)})</small></h4><div class="ek-tchips">${chips}</div>
    <div class="ek-tcash"><span>Nakit</span><button type="button" class="ek-sb" data-a="tCash" data-side="${key}" data-d="-50">−50</button><button type="button" class="ek-sb" data-a="tCash" data-side="${key}" data-d="-10">−10</button><b>${TL(side.cash)}</b><button type="button" class="ek-sb" data-a="tCash" data-side="${key}" data-d="10">+10</button><button type="button" class="ek-sb" data-a="tCash" data-side="${key}" data-d="50">+50</button></div>
    ${p.jc.length ? `<button type="button" class="ek-tc ${side.jc ? 'on' : ''}" data-a="tJc" data-side="${key}">🎫 Hapis kartı ${side.jc ? '×' + side.jc : ''}</button>` : ''}</div>`;
}
function editorHTML(v) {
  const me = draft.counter ? v.trade.to : v.cur;
  const others = alive(v).filter(i => i !== me);
  if (!others.includes(draft.to)) draft.to = others[0];
  const to = draft.to;
  const tsel = draft.counter ? `<p class="ek-dl">Karşı teklif: <b style="color:${v.players[to].color}">${esc(v.players[to].name)}</b></p>` : `<div class="ek-tto">${others.map(i => `<button type="button" class="ek-ptab ${i === to ? 'on' : ''}" data-a="tTo" data-pi="${i}" style="--pc:${v.players[i].color}"><span class="av" style="--pc:${v.players[i].color}">${v.players[i].isBot ? '🤖' : initial(v.players[i].name)}</span><b>${esc(v.players[i].name)}</b></button>`).join('')}</div>`;
  const ok = validTrade(v, me, to, draft.a, draft.b);
  let hint = '';
  if (ok && v.players[to].isBot) { const w = botWantsTrade(v, { from: me, to, a: draft.a, b: draft.b }); hint = w.ok ? '🤖 Bilgisayar bu teklife sıcak bakıyor.' : w.d > -350 ? '🤖 Bilgisayar biraz daha fazlasını isteyebilir.' : '🤖 Bilgisayar bu teklifi büyük ihtimalle reddeder.'; }
  return `<div class="ek-card ek-ted" role="dialog" aria-label="Takas"><button type="button" class="ek-x" data-a="closeModal" aria-label="Kapat">✕</button>
    <div class="ek-dh alt" style="--gc:var(--teal)"><span class="big">🤝</span><b>${draft.counter ? 'Karşı Teklif' : 'Takas Teklifi'}</b></div>
    <div class="ek-db">${tsel}<div class="ek-tgrid">${draftSide(v, me, draft.a, 'a', 'Sen verirsin')}${draftSide(v, to, draft.b, 'b', 'Sen alırsın')}</div>
    <p class="ek-note">Binası olan gruptaki mülkler takas edilemez. İpotekli mülk ipotekli olarak el değiştirir.</p>${hint ? `<p class="ek-hint">${hint}</p>` : ''}</div>
    <div class="ek-df"><button type="button" class="btn btn-spin" data-a="tSend" ${ok ? '' : 'disabled'}>📨 Teklifi gönder</button><button type="button" class="btn btn-ghost" data-a="closeModal">Vazgeç</button></div></div>`;
}
function incomingHTML(v, as) {
  const t = v.trade;
  return `<div class="ek-card ek-tin" role="dialog" aria-label="Gelen takas teklifi"><div class="ek-dh alt" style="--gc:${v.players[t.from].color}"><span class="big">🤝</span><b>${esc(v.players[t.from].name)} teklif ediyor</b></div>
    <div class="ek-db">${ui.mode === 'local' ? `<p class="ek-dl">Cihazı <b style="color:${v.players[as].color}">${esc(v.players[as].name)}</b> oyuncusuna ver.</p>` : ''}${tradeMini(v, t)}<div class="ek-bar"><i data-dl="trade"></i></div></div>
    <div class="ek-df"><button type="button" class="btn btn-spin" data-a="tAccept">✅ Kabul et</button>${t.chain < 3 ? '<button type="button" class="btn btn-vowel" data-a="tCounter">🔁 Karşı teklif</button>' : ''}<button type="button" class="btn btn-ghost" data-a="tDecline">❌ Reddet</button></div></div>`;
}
function auctionHTML(v) {
  const a = v.auc, s = SQ[a.sq];
  const hi = a.by >= 0 ? v.players[a.by] : null;
  const bidders = ui.mode === 'local' ? v.players.map((p, i) => i).filter(i => !v.players[i].isBot) : (ui.me >= 0 ? [ui.me] : []);
  const rows = bidders.map(i => {
    const p = v.players[i]; if (!p || p.out) return '';
    if (a.out[i]) return `<div class="ek-brow done"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><b>${esc(p.name)}</b><small>çekildi</small></div>`;
    if (i === a.by) return `<div class="ek-brow lead"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><b>${esc(p.name)}</b><small>en yüksek teklif sende</small></div>`;
    const btn = d => { const amt = (a.high || 0) + d; return `<button type="button" class="btn ${d === 10 ? 'btn-spin' : 'btn-vowel'} sm" data-a="bid" data-amt="${amt}" data-as="${i}" ${p.cash >= amt ? '' : 'disabled'}>+${d}</button>`; };
    return `<div class="ek-brow"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><b>${esc(p.name)} <small>${TL(p.cash)}</small></b><span class="bb">${btn(10)}${btn(50)}${btn(100)}<button type="button" class="btn btn-ghost sm" data-a="aucOut" data-as="${i}">Çekil</button></span></div>`;
  }).join('');
  const chips = v.players.map((p, i) => p.out ? '' : `<span class="ek-bc ${a.out[i] ? 'out' : ''} ${i === a.by ? 'lead' : ''}" style="--pc:${p.color}">${p.isBot ? '🤖' : initial(p.name)}</span>`).join('');
  return `<div class="ek-card ek-auc" role="dialog" aria-label="Açık artırma"><div class="ek-dh" style="--gc:${colorOf(a.sq)}"><small>🔨 AÇIK ARTIRMA</small><b>${esc(nmV(a.sq))}</b></div>
    <div class="ek-db"><div class="ek-ahi"><small>Liste fiyatı ${TL(s.p)}</small><b>${a.high ? TL(a.high) : 'Teklif yok'}</b>${hi ? `<span style="color:${hi.color}">${esc(hi.name)}</span>` : '<span>İlk teklif en az 10 ₺</span>'}</div>
    <div class="ek-bar big"><i data-dl="auc"></i><em data-sec="auc"></em></div><div class="ek-bcs">${chips}</div>${rows}</div>
    <div class="ek-df"><button type="button" class="btn btn-ghost sm" data-a="deed" data-sq="${a.sq}">Tapuyu gör</button></div></div>`;
}
function renderModal(v) {
  let sys = '';
  if (v.phase === 'auction' && v.auc) sys = auctionHTML(v);
  else if (v.phase === 'trade' && v.trade && actor(v) === v.trade.to && !(modal && modal.k === 'editor' && draft && draft.counter)) sys = incomingHTML(v, v.trade.to);
  const showSys = sys && !(modal && modal.k === 'deed' && v.phase === 'auction' && modal.fromAuc);
  const sk = showSys ? (v.phase === 'auction' ? 'a' + v.auc.n : 't' + v.trade.n) : '';
  if (showSys) { setPop(E.ov, sys, sk !== E.sysKey); E.ov.hidden = false; }
  else { E.ov.hidden = true; E.ov.innerHTML = ''; delete E.ov.dataset.h; }
  E.sysKey = sk;
  let h = '';
  if (modal && !showSys) {
    if (modal.k === 'deed') h = deedHTML(v, modal.sq);
    else if (modal.k === 'editor') {
      const ok = draft && (draft.counter ? (v.phase === 'trade' && v.trade && actor(v) === v.trade.to) : canManage(v));
      if (ok) h = editorHTML(v); else { modal = null; draft = null; }
    }
  }
  const mk2 = h && modal ? modal.k + ':' + (modal.sq != null ? modal.sq : '') : '';
  if (h) { setPop(E.modal, h, mk2 !== E.modKey); E.modal.hidden = false; }
  else { E.modal.hidden = true; E.modal.innerHTML = ''; delete E.modal.dataset.h; }
  E.modKey = mk2;
  tickBars();
}
function setPop(host, html, fresh) {
  const sc = host.firstElementChild ? host.firstElementChild.scrollTop : 0;
  if (host.dataset.h !== html || fresh) { host.innerHTML = html; host.dataset.h = html; }
  const c = host.firstElementChild; if (!c) return;
  if (fresh) c.classList.add('pop'); else { c.scrollTop = sc; }
}
function tickBars() {
  cancelAnimationFrame(rafT);
  const v = V; if (!v || !root) return;
  const bars = root.querySelectorAll('[data-dl]'); if (!bars.length) return;
  const loop = () => {
    if (!root || !V) return;
    const nowH = ui.hostNow();
    root.querySelectorAll('[data-dl]').forEach(b => {
      const o = b.dataset.dl === 'auc' ? V.auc : V.trade; if (!o) return;
      const left = Math.max(0, o.dl - nowH), f = Math.max(0, Math.min(1, left / (o.dur || 1)));
      b.style.width = (f * 100).toFixed(1) + '%'; b.classList.toggle('low', left < 3000);
      const sec = b.parentNode.querySelector('[data-sec]'); if (sec) sec.textContent = Math.ceil(left / 1000) + ' sn';
    });
    rafT = requestAnimationFrame(loop);
  };
  loop();
}
function renderCard(v) {
  const c = v.card;
  if (!c) { E.cardv.hidden = true; return; }
  if (c.n !== lastCardN) {
    lastCardN = c.n;
    E.cardv.innerHTML = `<div class="ek-cpop"><div class="ek-cflip ${c.d}"><div class="f back"><b>${DECK_NAME[c.d]}</b><span>${c.d === 's' ? '❓' : '🎁'}</span></div><div class="f front"><small>${DECK_NAME[c.d]}</small><p>${esc(c.txt)}</p><i>${esc(v.players[c.pi].name)}</i></div></div></div>`;
    E.cardv.hidden = false;
  }
}

/* ---------- ana çizim ---------- */
function render(v) {
  const prev = V; V = v;
  if (!cam) setupCam();
  if (prev && prev.phase !== v.phase && modal && modal.k === 'editor' && !draft) modal = null;
  if (prev && v.phase === 'trade' && prev.phase !== 'trade' && modal && modal.k === 'editor' && !(draft && draft.counter)) { modal = null; draft = null; }
  if (prev && prev.phase === 'trade' && v.phase !== 'trade' && modal && modal.k === 'editor' && draft && draft.counter) { modal = null; draft = null; }
  const tk = v.cur + ':' + v.turns;
  if (tk !== lastTurnKey) { if (lastTurnKey && modal && modal.k === 'deed' && !isDesk()) modal = null; lastTurnKey = tk; }
  renderSquares(v);
  renderCenter(v);
  renderTokens(v);
  renderDice(v);
  renderPlayers(v);
  renderHud(v);
  renderPort(v);
  renderModal(v);
  renderCard(v);
  renderMini(v);
  root.querySelector('.ek').classList.toggle('picking', v.phase === 'pick' && actor(v) >= 0);
  if (firstRender) { firstRender = false; if (cam.mode === 'follow') setTimeout(() => camFollow(0), 30); }
  else if (cam.mode === 'follow' && !animPos && prev && (prev.cur !== v.cur || !tokVisible(v.cur))) camFollow(500);
}
function openDeed(sq, fromAuc) { modal = { k: 'deed', sq, fromAuc: !!fromAuc }; if (V) render(V); }
function onClick(e) {
  if (moved) { moved = false; if (e.target.closest('.ek-vp')) { e.stopPropagation(); e.preventDefault(); return; } }
  const b = e.target.closest('[data-a]');
  const v = V; if (!v) return;
  if (b) {
    if (b.disabled) return;
    const a = b.dataset.a, sq = b.dataset.sq != null ? +b.dataset.sq : -1, pi = b.dataset.pi != null ? +b.dataset.pi : -1;
    Sound.init();
    switch (a) {
      case 'roll': case 'end': case 'jailPay': case 'jailCard': case 'buy': case 'pass': case 'payDebt': send({ t: a }); break;
      case 'bankrupt': CFX.confirmBox('İflas et', 'Emin misin? Tüm varlıkların alacaklıya (ya da bankaya) geçer ve oyundan çıkarsın.', 'İflas et').then(ok => { if (ok) send({ t: 'bankrupt' }); }); break;
      case 'bus': send({ t: 'bus', k: +b.dataset.k }); break;
      case 'pickSq': send({ t: 'pick', sq }); break;
      case 'build': case 'sell': case 'mort': case 'unmort': send({ t: a, sq }); break;
      case 'deed': openDeed(sq, v.phase === 'auction'); return;
      case 'port':
        if (isDesk()) { sheetPi = pi; if (actor(v) === pi && pi === v.cur) { /* kendi portföyü */ } }
        else { if (sheetOpen && sheetPi === pi && !b.closest('.ek-ptabs')) sheetOpen = false; else { sheetOpen = true; sheetPi = pi; } }
        break;
      case 'closeSheet': sheetOpen = false; break;
      case 'closeModal': modal = null; draft = null; break;
      case 'tradeOpen': {
        const others = alive(v).filter(i => i !== v.cur);
        draft = newDraft(v, pi >= 0 ? pi : others[0], sq >= 0 ? sq : null); modal = { k: 'editor' }; sheetOpen = false; break;
      }
      case 'tTo': if (draft && !draft.counter) { draft.to = pi; draft.b = emptySide(); } break;
      case 'tSq': if (draft) { const side = draft[b.dataset.side]; side.sqs = side.sqs.includes(sq) ? side.sqs.filter(x => x !== sq) : side.sqs.concat([sq]); } break;
      case 'tCash': if (draft) {
        const k = b.dataset.side, side = draft[k], me = draft.counter ? v.trade.to : v.cur, owner = k === 'a' ? me : draft.to;
        side.cash = Math.max(0, Math.min(v.players[owner].cash, side.cash + +b.dataset.d)); } break;
      case 'tJc': if (draft) { const k = b.dataset.side, side = draft[k], me = draft.counter ? v.trade.to : v.cur, owner = k === 'a' ? me : draft.to; side.jc = (side.jc + 1) % (v.players[owner].jc.length + 1); } break;
      case 'tSend': if (draft) {
        if (draft.counter) send({ t: 'tradeCounter', a: draft.a, b: draft.b }, v.trade.to);
        else send({ t: 'trade', to: draft.to, a: draft.a, b: draft.b });
        modal = null; draft = null; } break;
      case 'tAccept': send({ t: 'tradeAccept' }, v.trade && v.trade.to); break;
      case 'tDecline': send({ t: 'tradeDecline' }, v.trade && v.trade.to); break;
      case 'tCounter': if (v.trade) { draft = { to: v.trade.from, a: Object.assign({}, v.trade.b, { sqs: v.trade.b.sqs.slice() }), b: Object.assign({}, v.trade.a, { sqs: v.trade.a.sqs.slice() }), counter: true }; modal = { k: 'editor' }; } break;
      case 'tCancel': send({ t: 'tradeCancel' }, v.trade && v.trade.from); break;
      case 'bid': send({ t: 'bid', amt: +b.dataset.amt }, +b.dataset.as); break;
      case 'aucOut': send({ t: 'aucOut' }, +b.dataset.as); break;
      case 'cam': if (cam.mode === 'fit') { cam.fs = cam.fs || followScale(); camFollow(400); } else camFit(400); break;
      case 'zin': zoom(1.25); break;
      case 'zout': zoom(1 / 1.25); break;
      default: break;
    }
    if (V) render(V);
    return;
  }
  const sqEl = e.target.closest('.ek-sq');
  if (sqEl) {
    const i = +sqEl.dataset.sq;
    if (v.phase === 'pick' && actor(v) >= 0 && i !== GOJAIL) { send({ t: 'pick', sq: i }); return; }
    openDeed(i);
    return;
  }
  if (e.target.classList && (e.target.classList.contains('ek-ov') || e.target.classList.contains('ek-modal'))) { if (e.target === E.modal) { modal = null; draft = null; render(v); } }
}
function onKey(e) {
  if (e.key === 'Escape' && (modal || sheetOpen)) { modal = null; draft = null; sheetOpen = false; if (V) render(V); }
}
function mount(r, api) {
  root = r; ui = api; V = null; sqCache = []; toks = []; lastMv = 0; stopMove(); diceN = -1; diceBusy = false; cam = null; lastCash = []; sheetPi = -1; sheetOpen = false;
  modal = null; draft = null; lastCardN = 0; centerHTML = ''; lastTurnKey = ''; firstRender = true; pointers = new Map(); moved = false; drag = null;
  const sqs = SQ.map((s, i) => { const q = rect(i); return `<button type="button" class="ek-sq k-${s.k} s-${q.s}" data-sq="${i}" style="left:${q.x * U}px;top:${q.y * U}px;width:${q.w * U}px;height:${q.h * U}px" aria-label="${esc(sqName('tr', i))}"></button>`; }).join('');
  root.innerHTML = `<div class="g-wrap ek">
    <div class="ek-players"></div>
    <div class="ek-stage">
      <div class="ek-vp">
        <div class="ek-board" style="width:${BW}px;height:${BW}px">
          <div class="ek-center"></div>${sqs}<div class="ek-toks"></div>
        </div>
        <div class="ek-tray"><div class="ek-dice"></div><span class="ek-dlab">Zar atmaya hazır</span></div>
        <div class="ek-vpctl"><button type="button" class="ek-ibtn" data-a="cam" aria-label="Kamera">🗺️</button><button type="button" class="ek-ibtn" data-a="zin" aria-label="Yakınlaştır">＋</button><button type="button" class="ek-ibtn" data-a="zout" aria-label="Uzaklaştır">－</button></div>
        <button type="button" class="ek-mini" data-a="cam" aria-label="Tüm tahta"></button>
        <div class="ek-cardv" hidden></div>
        <div class="ek-stamp"></div>
      </div>
      <div class="ek-hud"><div class="ek-htop"></div><div class="ek-hmsg"></div><div class="ek-hacts"></div></div>
    </div>
    <aside class="ek-side"><div class="ek-port"></div></aside>
    <div class="ek-ov" hidden></div>
    <div class="ek-modal" hidden></div>
  </div>`;
  const q = s => root.querySelector(s);
  E = { vp: q('.ek-vp'), board: q('.ek-board'), sqs: [...root.querySelectorAll('.ek-sq')], toks: q('.ek-toks'), center: q('.ek-center'), tray: q('.ek-tray'), dlab: q('.ek-dlab'),
    camBtn: q('.ek-vpctl [data-a="cam"]'), mini: q('.ek-mini'), cardv: q('.ek-cardv'), stamp: q('.ek-stamp'), hTop: q('.ek-htop'), hMsg: q('.ek-hmsg'), hActs: q('.ek-hacts'),
    pl: q('.ek-players'), side: q('.ek-side'), port: q('.ek-port'), ov: q('.ek-ov'), modal: q('.ek-modal'), diceN: 0 };
  setupDice(2); restDice([3, 4]);
  root.addEventListener('click', onClick, true);
  E.vp.addEventListener('pointerdown', onPointerDown);
  addEventListener('pointermove', onPointerMove); addEventListener('pointerup', onPointerUp); addEventListener('pointercancel', onPointerUp);
  E.vp.addEventListener('wheel', onWheel, { passive: false });
  addEventListener('resize', onResize); addEventListener('keydown', onKey);
  setVpVars();
}
function setVpVars() { const [w, h] = vpSize(), el = root.querySelector('.ek'); el.style.setProperty('--vps', Math.min(w, h) + 'px'); el.style.setProperty('--vph', h + 'px'); }
function burstAt(sq, gold = true) { const el = E.sqs && E.sqs[sq]; if (!el) return; const [x, y] = centerOf(el); FX.burst(x, y, 28, gold); }
function shake() { if (E.vp) { E.vp.classList.remove('shake'); void E.vp.offsetWidth; E.vp.classList.add('shake'); } }

DEF.mount = mount;
DEF.render = render;
DEF.onEvent = function (e) {
  const nmP = i => (V && V.players[i] ? V.players[i].name.toLocaleUpperCase('tr-TR') : '');
  switch (e.t) {
    case 'rolling': Sound.whoosh(); break;
    case 'dice': if (e.dbl) { setTimeout(() => { Sound.special(); banner('ÇİFT!', 'pink'); }, 60); } break;
    case 'go': Sound.good(); break;
    case 'buy': Sound.buy(); burstAt(e.sq); if (e.from != null) banner('HER ŞEYİ AL!', 'pink'); break;
    case 'sold': Sound.buy(); burstAt(e.sq); stamp('SATILDI!', 'good'); break;
    case 'unsold': Sound.tick(.2); break;
    case 'group': setTimeout(() => { Sound.solve(); banner('TEKEL!', 'good'); FX.confetti(90); }, 250); break;
    case 'rent': Sound.bad(); stamp(`KİRA! −${TL(e.amt)}`, 'bad'); if (e.amt >= 400) flash('bad'); break;
    case 'tax': Sound.bad(); stamp(`VERGİ −${TL(e.amt)}`, 'bad'); break;
    case 'card': Sound.special(); break;
    case 'jail': Sound.bad(); banner('HAPSE!', 'bad'); break;
    case 'jailOut': Sound.good(); break;
    case 'build': Sound.buy(); burstAt(e.sq); if (e.lvl === 5) { banner('OTEL!', 'good'); FX.confetti(70); } else if (e.lvl === 6) { banner('GÖKDELEN!', 'good'); FX.confetti(110); } break;
    case 'sell': case 'mort': case 'unmort': Sound.tick(.3); break;
    case 'auction': Sound.special(); break;
    case 'bid': clack(.8); break;
    case 'tradeOffer': Sound.special(); break;
    case 'trade': Sound.solve(); banner('ANLAŞMA!', 'good'); break;
    case 'tradeNo': Sound.bad(); break;
    case 'debt': Sound.bad(); flash('bad'); break;
    case 'bankrupt': Sound.bankrupt(); flash('bad'); shake(); banner(`${nmP(e.pi)} İFLAS!`, 'bad'); setTimeout(() => { const c = E.pl && E.pl.children[e.pi]; if (c) { c.classList.add('crash'); } }, 50); break;
    case 'jackpot': Sound.fanfare(); banner('JACKPOT!', 'good'); FX.confetti(120); break;
    case 'shield': Sound.good(); banner('KALKAN!', 'good'); break;
    case 'triple': Sound.special(); banner('ÜÇLÜ!', 'pink'); break;
    case 'mr': Sound.special(); stamp('💰 BAY PARA!', 'good'); break;
    case 'teleport': Sound.whoosh(); break;
    case 'event': { const ev = EVENTS[e.id]; Sound.special(); banner(`${ev.ic} ${ev.n.toLocaleUpperCase('tr-TR')}`, 'pink'); if (e.id === 'deprem') { flash('bad'); shake(); } break; }
    case 'turn':
      if (ui && ui.mode === 'online' && e.pi === ui.me) { Sound.good(); banner('SIRA SENDE', 'good'); }
      else if (ui && ui.mode === 'local' && V && V.players.filter(p => !p.isBot).length > 1 && !V.players[e.pi].isBot) banner(nmP(e.pi));
      break;
    case 'over': Sound.solve(); FX.confetti(120); break;
    default: break;
  }
};
DEF.unmount = function () {
  stopMove(); cancelAnimationFrame(rafT);
  if (root) root.removeEventListener('click', onClick, true);
  removeEventListener('pointermove', onPointerMove); removeEventListener('pointerup', onPointerUp); removeEventListener('pointercancel', onPointerUp);
  removeEventListener('resize', onResize); removeEventListener('keydown', onKey);
  root = null; V = null; E = {}; toks = []; cam = null;
};
CFX.registerGame(DEF);
})();
