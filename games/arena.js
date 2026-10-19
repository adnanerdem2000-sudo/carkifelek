/* =========================================================================
   OYUN SALONU — ARENA USTASI
   Yandan görünüşlü, sıra tabanlı gladyatör düelloları. Nefes ekonomisi,
   kalabalık Coşku göstergesi, zamanlama ile "Kusursuz" vuruş, arenaya özgü
   tehlikeler ve ezilip kırılan zırhlar.
   Modlar: Kariyer (kalıcı kayıt, 5 arena), Düello (3'te 2), Turnuva (eleme + bahis).
   ========================================================================= */
(() => {
'use strict';
const CF = window.CFX;
const { esc, fmt, Sound, FX, banner, flash, initial, store } = CF;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* ------------------------------------------------------------------ veri */
const STATS = [
  { k: 'guc', n: 'Güç', i: '💪', d: 'Hasar; ağır silah ve zırh şartı' },
  { k: 'cev', n: 'Çeviklik', i: '🦶', d: 'Adım sayısı, kaçınma' },
  { k: 'sal', n: 'Saldırı', i: '🎯', d: 'İsabet; geniş Kusursuz bölgesi' },
  { k: 'sav', n: 'Savunma', i: '🛡️', d: 'Gelen hasarı azaltır' },
  { k: 'day', n: 'Dayanıklılık', i: '❤️', d: 'Can puanı' },
  { k: 'kar', n: 'Karizma', i: '✨', d: 'Coşku kazancı, indirim, bahşiş' },
  { k: 'nef', n: 'Nefes', i: '💨', d: 'Nefes havuzu ve toparlanma' }
];
const SK = STATS.map(s => s.k);
const SLOTS = ['w', 's', 'h', 'a', 'b'];
const SLOT_N = { w: 'Silah', s: 'Kalkan', h: 'Miğfer', a: 'Zırh', b: 'Çizme' };
const KIND_N = { sopa: 'Sopa', kilic: 'Kılıç', balta: 'Balta', mizrak: 'Mızrak', gurz: 'Gürz', hancer: 'Çift hançer' };
const SPECIAL_N = { sopa: 'Köy Kasırgası', kilic: 'Kartal Darbesi', balta: 'Yıldırım Yarığı', mizrak: 'Akrep Dürtüşü', gurz: 'Deprem Çekici', hancer: 'Rüzgâr Dansı' };

const GEAR = {};
const W = (id, name, kind, tier, price, dmg, acc, req, x = {}) => { GEAR[id] = Object.assign({ id, slot: 'w', name, kind, tier, price, dmg, acc, req, reach: kind === 'mizrak' ? 2 : 1, two: kind === 'mizrak' || kind === 'hancer' }, x); };
const A = (slot, id, name, tier, price, def, dur, req, x = {}) => { GEAR[id] = Object.assign({ id, slot, name, tier, price, def, dur, req }, x); };
W('sopa', 'Meşe Sopa', 'sopa', 0, 0, [3, 6], 0, {});
W('kisa', 'Kısa Kılıç', 'kilic', 1, 60, [5, 8], .04, { guc: 3 });
W('topuz', 'Tahta Topuz', 'gurz', 1, 70, [5, 9], -.02, { guc: 4 });
W('elbalta', 'El Baltası', 'balta', 1, 80, [6, 10], -.04, { guc: 5 });
W('hancer1', 'Çift Hançer', 'hancer', 1, 90, [3, 5], .06, { cev: 6 });
W('kargi', 'Kargı', 'mizrak', 1, 90, [4, 8], 0, { cev: 4 });
W('pala', 'Pala', 'kilic', 2, 260, [8, 12], .05, { guc: 8 });
W('gurz', 'Demir Gürz', 'gurz', 2, 300, [9, 14], -.02, { guc: 10 });
W('savasb', 'Savaş Baltası', 'balta', 2, 320, [10, 16], -.05, { guc: 11 }, { two: true });
W('hancer2', 'Akrep Hançerleri', 'hancer', 2, 330, [6, 9], .06, { cev: 12 });
W('mizrak', 'Mızrak', 'mizrak', 2, 340, [8, 13], 0, { cev: 9, guc: 6 });
W('simsek', 'Şimşek Kılıcı', 'kilic', 3, 900, [13, 19], .06, { guc: 15, sal: 10 });
W('yildiz', 'Yıldız Gürzü', 'gurz', 3, 950, [14, 21], -.02, { guc: 17 });
W('golge', 'Gölge Hançerleri', 'hancer', 3, 950, [10, 14], .07, { cev: 18 });
W('ejder', 'Ejder Baltası', 'balta', 3, 1000, [16, 25], -.05, { guc: 19 }, { two: true });
W('altinm', 'Altın Mızrak', 'mizrak', 3, 1000, [13, 20], .02, { cev: 14, guc: 12 });
W('sultan', 'Hükümdar Kılıcı', 'kilic', 4, 2400, [18, 26], .08, { guc: 22, sal: 16 });
W('devkiran', 'Dev Kıran', 'balta', 4, 2600, [22, 32], -.04, { guc: 26 }, { two: true });
A('s', 'tahtak', 'Tahta Kalkan', 1, 40, 1, 6, {}, { blk: .06 });
A('s', 'tunck', 'Tunç Kalkan', 1, 180, 2, 10, { guc: 6 }, { blk: .1 });
A('s', 'kartalk', 'Kartal Kalkanı', 2, 520, 3, 14, { guc: 10 }, { blk: .14 });
A('s', 'kulek', 'Kule Kalkanı', 3, 1100, 4, 18, { guc: 15 }, { blk: .18, bonus: { cev: -2 } });
A('s', 'altink', 'Altın Kalkan', 4, 2200, 5, 22, { guc: 18, kar: 10 }, { blk: .2, bonus: { kar: 2 } });
A('h', 'derib', 'Deri Başlık', 1, 30, 1, 4, {});
A('h', 'tuncm', 'Tunç Miğfer', 1, 150, 2, 8, { guc: 5 });
A('h', 'sorguc', 'Sorguçlu Miğfer', 2, 420, 3, 12, { guc: 8 }, { bonus: { kar: 2 } });
A('h', 'tolga', 'Demir Tolga', 3, 900, 4, 16, { guc: 12 });
A('h', 'altinmg', 'Altın Miğfer', 4, 2000, 6, 20, { guc: 16 }, { bonus: { kar: 3 } });
A('a', 'deriy', 'Deri Yelek', 1, 50, 2, 6, {});
A('a', 'zincir', 'Zincir Zırh', 1, 240, 3, 10, { guc: 7 });
A('a', 'pullu', 'Pullu Zırh', 2, 600, 5, 14, { guc: 11 }, { bonus: { cev: -1 } });
A('a', 'lamel', 'Lamel Zırh', 3, 1300, 7, 18, { guc: 15 }, { bonus: { cev: -1 } });
A('a', 'altinz', 'Altın Göğüslük', 4, 2800, 9, 24, { guc: 19, kar: 8 }, { bonus: { kar: 2 } });
A('b', 'carik', 'Çarık', 1, 20, 0, 3, {}, { bonus: { cev: 1 } });
A('b', 'cizme', 'Deri Çizme', 1, 70, 1, 6, {}, { bonus: { cev: 1 } });
A('b', 'tuncd', 'Tunç Dizlik', 2, 260, 2, 10, { guc: 6 });
A('b', 'celikd', 'Çelik Dizlik', 3, 700, 3, 14, { guc: 12 });
const GEAR_LIST = Object.values(GEAR);
const ITEMS = {
  ates: { n: 'Ateş Şişesi', i: '🔥', price: 45, d: 'Fırlat: 9–14 hasar + 2 tur yanma (menzil 6)' },
  sifa: { n: 'Şifa İksiri', i: '🧪', price: 40, d: 'Canının %30\'unu geri verir' },
  sis: { n: 'Sis Bombası', i: '🌫️', price: 35, d: 'Rakibin 2 saldırısında isabeti düşer' }
};
const ITEM_KEYS = Object.keys(ITEMS);
const ITEM_MAX = 3;

const ARENAS = [
  { id: 'koy', n: 'Köy Meydanı', i: '🌾', hz: 'Domates yağmuru: kalabalığı sıkan (Coşkusu düşük) dövüşçü domatesle vurulur, Nefes kaybeder.' },
  { id: 'carsi', n: 'Çarşı Arenası', i: '🏺', hz: 'Baharat bulutu: bulutun içinden saldıranın isabeti düşer.' },
  { id: 'liman', n: 'Liman İskelesi', i: '⚓', hz: 'Kaygan iskele: ıslak tahtaya basan kayıp dengesini kaybedebilir.' },
  { id: 'kale', n: 'Kale Avlusu', i: '🏰', hz: 'Düşen taşlar: gölgesi düşen kareden bir tur içinde uzaklaş!' },
  { id: 'imp', n: 'İmparatorluk Arenası', i: '🦁', hz: 'Kenar mangalları yakar; nadiren aslan kafesi açılır ve sevilmeyen dövüşçüye saldırır!' }
];
const ARENA_IX = Object.fromEntries(ARENAS.map((a, i) => [a.id, i]));

const PERS = {
  dengeli: { n: 'Dengeli', w: { guc: 3, cev: 2, sal: 3, sav: 2, day: 3, kar: 1, nef: 2 }, kinds: ['kilic'], shield: true },
  saldirgan: { n: 'Saldırgan', w: { guc: 5, cev: 1, sal: 3, sav: 1, day: 3, kar: 1, nef: 2 }, kinds: ['balta', 'gurz'], shield: false },
  temkinli: { n: 'Temkinli', w: { guc: 3, cev: 1, sal: 2, sav: 4, day: 4, kar: 1, nef: 2 }, kinds: ['gurz', 'kilic'], shield: true },
  gosterici: { n: 'Şovmen', w: { guc: 2, cev: 3, sal: 3, sav: 1, day: 2, kar: 5, nef: 2 }, kinds: ['kilic'], shield: true },
  uzak: { n: 'Mesafeci', w: { guc: 2, cev: 4, sal: 3, sav: 1, day: 3, kar: 1, nef: 3 }, kinds: ['mizrak'], shield: false },
  kurnaz: { n: 'Kurnaz', w: { guc: 1, cev: 5, sal: 4, sav: 1, day: 2, kar: 2, nef: 3 }, kinds: ['hancer'], shield: false, items: true }
};
// Kariyer rakipleri: [ad, kişilik, söz]
const OPP = [
  [['Sırık Hasan', 'uzak', 'Kargım uzun, sabrım kısa!'], ['Tavukçu Rıza', 'gosterici', 'Kümeste de arenada da horoz benim!'], ['Çömlekçi Nuri', 'temkinli', 'Kırılmadan pişmek gerek.'],
    ['Değirmenci Gülsüm', 'saldirgan', 'Seni un ufak edeceğim!'], ['Deli Dursun', 'saldirgan', 'Hiç düşünmem, hep vururum!'], ['Demir Yumruk Kasım', 'dengeli', 'Yumruğum demirden, sabrım yok!']],
  [['Baharatçı Selim', 'kurnaz', 'Biraz acı, biraz yakıcı…'], ['Halıcı Zehra', 'kurnaz', 'İlmek ilmek dokurum seni.'], ['Kasap Bekir', 'saldirgan', 'Bugün tezgâhta sen varsın.'],
    ['Bakırcı Ömer', 'temkinli', 'Kalkanım dövme bakır!'], ['Kuyumcu Nazlı', 'gosterici', 'Işıltım gözünü alacak.'], ['Kum Fırtınası Leyla', 'kurnaz', 'Beni göremezsin bile.']],
  [['Gemici Yusuf', 'dengeli', 'Fırtınada bile dimdik dururum.'], ['Ağcı Fadime', 'uzak', 'Ağıma düşen balık kurtulmaz.'], ['Tek Göz Celal', 'saldirgan', 'Bir gözüm yeter sana!'],
    ['Halatçı Murat', 'temkinli', 'Düğümü çözemezsin.'], ['Martı Elif', 'gosterici', 'Kanatlarımı görüyor musun?'], ['Dalgakıran Rüstem', 'temkinli', 'Dalgalar bana çarpar, ben kımıldamam.']],
  [['Nöbetçi Kadir', 'temkinli', 'Bu kapıdan geçilmez!'], ['Mancınıkçı Sevim', 'saldirgan', 'Taş yağdırırım!'], ['Muhafız Tolga', 'dengeli', 'Kalenin kalkanı benim.'],
    ['Taşkafa Cemil', 'saldirgan', 'Kafam taştan sert!'], ['Kalkan Ayşe', 'temkinli', 'Önce kalkanımı geç.'], ['Kara Kartal Doğan', 'dengeli', 'Gökten iner, avımı alırım.']],
  [['Altın Pençe Kerem', 'gosterici', 'İmparator beni izliyor!'], ['Gölge Defne', 'kurnaz', 'Gölgen bile benden korkar.'], ['Dev Kıran Oğuz', 'saldirgan', 'Devleri devirdim, sen kim?'],
    ['Aslan Terbiyecisi Mira', 'uzak', 'Aslanlar bile sözümü dinler.'], ['Yıldırım Selin', 'kurnaz', 'Göz açıp kapayıncaya kadar…'], ['Kızıl Sultan Arslan', 'dengeli', 'Bu arenanın tek hükümdarı benim.']]
];
const BOT_NAMES = ['Kartal Emre', 'Bozkurt Ali', 'Çelik Zeynep', 'Fırtına Can', 'Kurt Selma', 'Şahin Baran', 'Yaman Defne', 'Kaya Murat', 'Tunç Elif', 'Ateş Kerem', 'Rüzgâr Nehir', 'Kılıç Arda'];
const PRESETS = [
  { id: 'denge', n: 'Gladyatör', i: '⚔️', S: { guc: 6, cev: 5, sal: 6, sav: 6, day: 6, kar: 5, nef: 5 }, gear: { w: 'kisa', s: 'tunck', h: 'derib', a: 'deriy', b: 'carik' }, items: { sifa: 1 } },
  { id: 'ruzgar', n: 'Rüzgâr', i: '🌪️', S: { guc: 3, cev: 10, sal: 7, sav: 3, day: 5, kar: 5, nef: 6 }, gear: { w: 'hancer1', s: null, h: 'derib', a: 'deriy', b: 'cizme' }, items: { sis: 1, ates: 1, sifa: 1 } },
  { id: 'mizrak', n: 'Mızrakçı', i: '🔱', S: { guc: 6, cev: 8, sal: 6, sav: 4, day: 6, kar: 4, nef: 5 }, gear: { w: 'kargi', s: null, h: 'tuncm', a: 'deriy', b: 'carik' }, items: { ates: 1 } },
  { id: 'ayi', n: 'Ayı', i: '🐻', S: { guc: 10, cev: 3, sal: 5, sav: 5, day: 8, kar: 3, nef: 5 }, gear: { w: 'elbalta', s: null, h: 'derib', a: 'zincir', b: 'carik' }, items: {} },
  { id: 'sovmen', n: 'Şovmen', i: '🎭', S: { guc: 5, cev: 6, sal: 6, sav: 3, day: 5, kar: 9, nef: 5 }, gear: { w: 'kisa', s: 'tahtak', h: 'tuncm', a: 'deriy', b: 'carik' }, items: { sifa: 1 } }
];
const DRAFT = { pts: 18, base: 3, max: 12, gold: 400, tier: 2 };
const CREATE = { pts: 10, base: 3, max: 8 };
const STAT_CAP = 40;
const LOOK = {
  skin: ['#f7d6b8', '#ecbb92', '#d49b6b', '#b37548', '#8a5631', '#5f3b22'],
  hairC: ['#1e1612', '#4b2d18', '#8a5a2b', '#c98b3c', '#e9d27c', '#a63c22', '#d8d3ca'],
  cols: ['#c8372d', '#2f6fd6', '#2a9d5c', '#8e44ad', '#e67e22', '#15a3a3', '#d9b018', '#34343f', '#e84393', '#eee8da'],
  hair: ['Kel', 'Kısa', 'Topuz', 'At kuyruğu', 'İbik', 'Kıvırcık', 'Uzun'],
  beard: ['Yok', 'Kirli sakal', 'Keçi sakalı', 'Gür sakal', 'Pala bıyık', 'Örgülü sakal']
};
const LOOK_KEYS = { skin: LOOK.skin.length, hair: LOOK.hair.length, hc: LOOK.hairC.length, beard: LOOK.beard.length, c1: LOOK.cols.length, c2: LOOK.cols.length };

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rint = (rnd, a, b) => a + Math.floor(rnd() * (b - a + 1));
const rpick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
function randomLook(rnd) { const o = {}; for (const k in LOOK_KEYS) o[k] = Math.floor(rnd() * LOOK_KEYS[k]); if (o.c1 === o.c2) o.c2 = (o.c2 + 3) % LOOK_KEYS.c2; return o; }
function cleanLook(l) { const o = {}; l = l || {}; for (const k in LOOK_KEYS) { const v = l[k] | 0; o[k] = v >= 0 && v < LOOK_KEYS[k] ? v : 0; } return o; }

/* ------------------------------------------------------------------ türetilmiş değerler */
function effStats(S, gear) {
  const s = {}; SK.forEach(k => { s[k] = S[k] | 0; });
  for (const sl of SLOTS) { const g = gear && GEAR[gear[sl]]; if (g && g.bonus) for (const k in g.bonus) s[k] += g.bonus[k]; }
  SK.forEach(k => { s[k] = Math.max(1, s[k]); });
  return s;
}
const hpMaxOf = S => 22 + S.day * 6;
const staMaxOf = S => 30 + S.nef * 4;
const meetsReq = (S, g) => !g || Object.entries(g.req || {}).every(([k, v]) => (S[k] | 0) >= v);
const weaponOf = F => GEAR[F.gear.w] || GEAR.sopa;
const eff = F => effStats(F.S, F.gear);
function sumStats(S) { return SK.reduce((a, k) => a + (S[k] | 0), 0); }

/* ------------------------------------------------------------------ dövüşçü ve dövüş */
const LANE = 10;                        // 0..9 kareli şerit
function makeFighter(b, side, ctl) {
  const gear = { w: null, s: null, h: null, a: null, b: null };
  for (const sl of SLOTS) { const id = b.gear && b.gear[sl]; if (id && GEAR[id] && GEAR[id].slot === sl) gear[sl] = id; }
  if (!gear.w) gear.w = 'sopa';
  if (GEAR[gear.w].two) gear.s = null;
  const S = {}; SK.forEach(k => { S[k] = clamp(b.S && b.S[k] | 0, 1, STAT_CAP); });
  const E = effStats(S, gear), dur = {};
  for (const sl of ['s', 'h', 'a', 'b']) dur[sl] = gear[sl] ? clamp(b.dur && b.dur[sl] != null ? b.dur[sl] : GEAR[gear[sl]].dur, 0, GEAR[gear[sl]].dur) : 0;
  const items = {}; ITEM_KEYS.forEach(k => { items[k] = clamp((b.items && b.items[k]) | 0, 0, ITEM_MAX); });
  const hpMax = hpMaxOf(E), staMax = staMaxOf(E);
  return { name: b.name || 'Gladyatör', look: cleanLook(b.look), S, gear, dur, items, hp: hpMax, hpMax, sta: staMax, staMax, cos: 0, pos: side ? 7 : 2, side,
    guard: false, rest: false, fx: { blind: 0, burn: 0, slip: 0, shaken: 0 }, hist: [], ko: false, lvl: b.lvl || 0, color: b.color || null,
    ctl: Object.assign({ pi: -1, bot: true, diff: 'orta', pers: 'dengeli' }, ctl || {}), tot: { hit: 0, crit: 0, dmg: 0, taunt: 0, cosMax: 0 } };
}
function newFight(arena, bA, bB, ctlA, ctlB, rnd, first) {
  const ar = ARENA_IX[arena] != null ? arena : 'koy';
  const f = [makeFighter(bA, 0, ctlA), makeFighter(bB, 1, ctlB)];
  const hz = { spice: null, stone: null, lion: false, wet: [] };
  if (ar === 'liman') { const pool = [0, 1, 3, 4, 5, 6, 8, 9]; for (let k = 0; k < 3; k++) { const i = Math.floor(rnd() * pool.length); hz.wet.push(pool.splice(i, 1)[0]); } hz.wet.sort((a, b) => a - b); }
  return { id: Math.floor(rnd() * 1e9).toString(36), arena: ar, f, turn: first != null ? first : (rnd() < .5 ? 0 : 1), tn: 0, maxT: 70, busy: false, over: null, seq: 0, anim: null, hz };
}
const distOf = fi => fi.f[1].pos - fi.f[0].pos;
const COST = { ilerle: 3, geri: 3, hizli: 6, normal: 10, guclu: 18, savun: 0, goster: 4, dinlen: 0, ozel: 0, esya: 4 };
const ACTS = ['ilerle', 'geri', 'savun', 'hizli', 'normal', 'guclu', 'goster', 'dinlen', 'ozel'];
const ACT_N = { ilerle: 'İlerle', geri: 'Geri Çekil', hizli: 'Hızlı Saldırı', normal: 'Normal Saldırı', guclu: 'Güçlü Saldırı', savun: 'Savunma', goster: 'Gösteri', dinlen: 'Dinlen', ozel: 'Özel Hamle', esya: 'Eşya' };
const ATTACKS = new Set(['hizli', 'normal', 'guclu', 'ozel']);
function costOf(F, k) {
  let c = COST[k] || 0;
  if (k === 'hizli' || k === 'normal' || k === 'guclu') { const w = weaponOf(F); c = Math.round(c * (w.kind === 'balta' || w.kind === 'gurz' ? 1.2 : w.kind === 'hancer' ? .8 : 1)); }
  return c;
}
function stepsOf(F, k) { const c = eff(F).cev; return k === 'ilerle' ? (c >= 7 ? 2 : 1) : (c >= 12 ? 2 : 1); }
function legal(fi, s, k, it) {
  const F = fi.f[s], d = distOf(fi), w = weaponOf(F);
  switch (k) {
    case 'ilerle': return d > 1 && F.sta >= costOf(F, k);
    case 'geri': return (s === 0 ? F.pos > 0 : F.pos < LANE - 1) && F.sta >= costOf(F, k);
    case 'hizli': case 'normal': case 'guclu': return d <= w.reach && F.sta >= costOf(F, k);
    case 'ozel': return F.cos >= 100 && d <= w.reach + 1;
    case 'savun': case 'dinlen': return true;
    case 'goster': return F.sta >= COST.goster;
    case 'esya': return !!ITEMS[it] && F.items[it] > 0 && F.sta >= COST.esya && (it !== 'ates' || d <= 6);
    default: return false;
  }
}
function legalMap(fi, s) { const o = {}; ACTS.forEach(k => { o[k] = legal(fi, s, k); }); ITEM_KEYS.forEach(it => { o['esya:' + it] = legal(fi, s, 'esya', it); }); return o; }
const inSpice = (fi, pos) => !!(fi.hz.spice && fi.hz.spice.tiles.includes(pos));
function critFloor(F) { return 1 - .08 / (1 - Math.min(.35, eff(F).sal * .012)); }   // Kusursuz için gereken ham zamanlama
function effAcc(F, raw) { const f = Math.min(.35, eff(F).sal * .012); return 1 - (1 - clamp(raw, 0, 1)) * (1 - f); }
const BASE = { hizli: .86, normal: .74, guclu: .58 };
function hitChance(fi, a, kind, acc) {
  if (kind === 'ozel') return 1;
  const A0 = fi.f[a], D = fi.f[1 - a], EA = eff(A0), ED = eff(D), w = weaponOf(A0);
  let c = BASE[kind] + w.acc + (EA.sal - ED.cev) * .012 + (effAcc(A0, acc) - .5) * .3;
  if (D.guard && D.gear.s && D.dur.s > 0) c -= GEAR[D.gear.s].blk;
  if (A0.fx.blind) c -= .35;
  if (A0.fx.shaken) c -= .1;
  if (inSpice(fi, A0.pos)) c -= .2;
  if (D.fx.slip) c += .15;
  if (D.rest) c += .15;
  return clamp(c, .08, .97);
}
const KM = { hizli: .6, normal: 1, guclu: 1.55, ozel: 2.2 }, GM = { hizli: .25, normal: .45, guclu: .7, ozel: .9 };
const BLOCK = { hizli: .2, normal: .45, guclu: .75, ozel: .8 };
function avgDamage(fi, a, kind) {
  const A0 = fi.f[a], w = weaponOf(A0), EA = eff(A0);
  return ((w.dmg[0] + w.dmg[1]) / 2) * KM[kind] + EA.guc * GM[kind];
}
function strike(fi, a, kind, crit, rnd) {
  const A0 = fi.f[a], D = fi.f[1 - a], w = weaponOf(A0), EA = eff(A0), ED = eff(D);
  let raw = (w.dmg[0] + rnd() * (w.dmg[1] - w.dmg[0])) * KM[kind] + EA.guc * GM[kind];
  if (crit) raw *= 1.5;
  const r = rnd(), loc = r < .22 ? 'h' : r < .8 ? 'a' : 'b';
  const piece = D.gear[loc] ? GEAR[D.gear[loc]] : null;
  let pdef = piece && D.dur[loc] > 0 ? piece.def : 0;
  if (w.kind === 'gurz') pdef *= .5;
  let blocked = false, sbroke = false;
  if (D.guard) {
    blocked = true;
    const sh = D.gear.s && D.dur.s > 0 ? GEAR[D.gear.s] : null;
    raw *= Math.min(1, BLOCK[kind] * (sh ? 1 - sh.def * .08 : 1.15));
    if (sh) { D.dur.s -= kind === 'guclu' || kind === 'ozel' || w.kind === 'gurz' ? 2 : 1; if (D.dur.s <= 0) { D.dur.s = 0; sbroke = true; } }
    if (kind === 'guclu' || kind === 'ozel') D.guard = false;      // güçlü vuruş savunmayı dağıtır
  }
  const dmg = Math.max(1, Math.round(raw - pdef - ED.sav * .25));
  let broke = null;
  if (piece && D.dur[loc] > 0) { D.dur[loc] -= kind === 'guclu' || kind === 'ozel' || w.kind === 'gurz' ? 2 : 1; if (D.dur[loc] <= 0) { D.dur[loc] = 0; broke = loc; } }
  if (sbroke) broke = broke || 's';
  D.hp = Math.max(0, D.hp - dmg);
  A0.tot.dmg += dmg;
  return { res: blocked ? 'block' : 'hit', dmg, crit: !!crit, loc, broke, sbroke };
}
function addCos(F, v) { if (v > 0) v *= 1 + eff(F).kar * .02; F.cos = clamp(Math.round(F.cos + v), 0, 100); F.tot.cosMax = Math.max(F.tot.cosMax, F.cos); }
const snapOf = fi => ({ hp: fi.f.map(F => F.hp), sta: fi.f.map(F => F.sta), cos: fi.f.map(F => F.cos), pos: fi.f.map(F => F.pos), dur: fi.f.map(F => Object.assign({}, F.dur)) });

function moveFighter(fi, s, dir, n, rnd, steps) {
  const F = fi.f[s], O = fi.f[1 - s], from = F.pos; let to = from, slip = false;
  for (let k = 0; k < n; k++) {
    const nx = to + dir;
    if (nx < 0 || nx > LANE - 1) break;
    if ((s === 0 && nx >= O.pos) || (s === 1 && nx <= O.pos)) break;
    to = nx;
    if (fi.hz.wet.includes(nx) && rnd() < Math.max(.12, .38 - eff(F).cev * .012)) { slip = true; break; }
  }
  F.pos = to;
  if (slip) { F.fx.slip = 1; F.sta = Math.max(0, F.sta - 4); }
  steps.push({ k: 'move', s, from, to, slip });
  return slip;
}
function doAttack(fi, s, kind, acc, rnd, steps) {
  const A0 = fi.f[s], D = fi.f[1 - s], w = weaponOf(A0);
  let lunge = null;
  if (kind === 'ozel' && distOf(fi) > w.reach) { const from = A0.pos; A0.pos += s === 0 ? 1 : -1; lunge = { from, to: A0.pos }; }
  const hits = [];
  const ea = kind === 'ozel' ? 1 : effAcc(A0, acc);
  const crit = kind !== 'ozel' && ea >= .92;
  const n = w.kind === 'hancer' && kind === 'hizli' ? 2 : 1;
  for (let k = 0; k < n && D.hp > 0; k++) {
    const ch = hitChance(fi, s, kind, acc) - (n > 1 ? .05 : 0);
    if (crit || rnd() < ch) {
      const h = strike(fi, s, kind, crit, rnd); hits.push(h); A0.tot.hit++; if (crit) A0.tot.crit++;
      if (h.res === 'block') addCos(D, 4);
      addCos(A0, (kind === 'hizli' ? 3 : kind === 'guclu' ? 8 : kind === 'ozel' ? 0 : 5) + (crit ? 10 : 0) + (A0.hp < A0.hpMax * .25 ? 8 : 0));
    } else { hits.push({ res: 'miss' }); addCos(D, 4); addCos(A0, -2); }
  }
  if (kind === 'ozel') A0.cos = 0;
  A0.sta = Math.max(0, A0.sta - costOf(A0, kind));
  steps.push({ k: 'atk', s, kind, wk: w.kind, hits, lunge, crit, acc: Math.round(ea * 100) / 100 });
}
// Bir hamleyi uygular; adımları (animasyon) döndürür. Geçersizse null.
function perform(fi, s, a, rnd) {
  if (fi.over || fi.turn !== s) return null;
  const k = a.k, it = a.it;
  if (!legal(fi, s, k, it)) return null;
  const A0 = fi.f[s], D = fi.f[1 - s], steps = [];
  const prev = A0.hist.slice(-2);
  A0.guard = false; A0.rest = false; A0.fx.slip = 0;
  const E = eff(A0), dirTo = s === 0 ? 1 : -1;
  let gain = 0, varietyOk = true;
  switch (k) {
    case 'ilerle': A0.sta -= costOf(A0, k); moveFighter(fi, s, dirTo, Math.min(stepsOf(A0, k), distOf(fi) - 1), rnd, steps); break;
    case 'geri': A0.sta -= costOf(A0, k); moveFighter(fi, s, -dirTo, stepsOf(A0, k), rnd, steps); break;
    case 'hizli': case 'normal': case 'guclu': case 'ozel': {
      const acc = a.acc == null || !isFinite(+a.acc) ? .5 : clamp(+a.acc, 0, 1);
      doAttack(fi, s, k, acc, rnd, steps); break;
    }
    case 'savun': A0.guard = true; A0.sta = Math.min(A0.staMax, A0.sta + Math.round(4 + E.nef * .3)); steps.push({ k: 'guard', s }); break;
    case 'dinlen': { A0.rest = true; const g = Math.round(12 + E.nef * 1.2); A0.sta = Math.min(A0.staMax, A0.sta + g); steps.push({ k: 'rest', s, gain: g }); varietyOk = false; break; }
    case 'goster': {
      A0.sta -= COST.goster; A0.tot.taunt++;
      const rep = prev[prev.length - 1] === 'goster';
      gain += (12 + E.kar * .8) * (rep ? .45 : 1);
      const shake = rnd() < clamp(.35 + (E.kar - eff(D).kar) * .02, .1, .8);
      if (shake) D.fx.shaken = 1;
      steps.push({ k: 'taunt', s, shake }); break;
    }
    case 'esya': {
      A0.sta -= COST.esya; A0.items[it]--;
      if (it === 'sifa') { const h = Math.round(A0.hpMax * .3); const real = Math.min(h, A0.hpMax - A0.hp); A0.hp += real; steps.push({ k: 'item', s, it, heal: real }); }
      else if (it === 'ates') { const dmg = rint(rnd, 9, 14); D.hp = Math.max(0, D.hp - dmg); D.fx.burn = 2; A0.tot.dmg += dmg; addCos(A0, 6); steps.push({ k: 'item', s, it, dmg }); }
      else { D.fx.blind = 2; addCos(A0, 4); steps.push({ k: 'item', s, it }); }
      break;
    }
    default: return null;
  }
  // Coşku: çeşitlilik ödüllenir, tekrar sıkar
  if (k !== 'ozel' && varietyOk) {
    if (prev.length === 2 && prev.every(h => h === k)) { gain -= 6; steps.push({ k: 'bored', s }); }
    else if (!prev.includes(k)) gain += 3;
  }
  if (gain) addCos(A0, gain);
  A0.hist.push(k); if (A0.hist.length > 6) A0.hist.shift();
  if (A0.fx.blind && ATTACKS.has(k)) A0.fx.blind--;
  if (A0.fx.shaken && ATTACKS.has(k)) A0.fx.shaken = 0;
  checkKo(fi, steps);
  if (!fi.over) endTurn(fi, s, rnd, steps);
  fi.seq++;
  for (const st of steps) st.after = snapOf(fi);
  return steps;
}
function checkKo(fi, steps) {
  if (fi.over) return true;
  for (const F of fi.f) if (F.hp <= 0 && !F.ko) { F.ko = true; F.hp = 0; steps.push({ k: 'ko', s: F.side }); fi.over = { win: 1 - F.side, how: 'ko' }; return true; }
  return false;
}
function hazardDamage(F, base, slot) {
  const g = F.gear[slot] ? GEAR[F.gear[slot]] : null;
  const def = g && F.dur[slot] > 0 ? g.def : 0;
  if (g && F.dur[slot] > 0) F.dur[slot] = Math.max(0, F.dur[slot] - 2);
  const dmg = Math.max(1, Math.round(base - def));
  F.hp = Math.max(0, F.hp - dmg);
  return dmg;
}
function endTurn(fi, s, rnd, steps) {
  const A0 = fi.f[s], hz = fi.hz;
  fi.tn++;
  // kenar mangalları (imparatorluk)
  if (fi.arena === 'imp' && (A0.pos === 0 || A0.pos === LANE - 1)) { const d = hazardDamage(A0, 5, 'b'); steps.push({ k: 'hz', h: 'fire', s, dmg: d }); if (checkKo(fi, steps)) return; }
  if (fi.arena === 'koy' && fi.tn >= 8) {
    for (const F of fi.f) if (F.cos < 20 && rnd() < .12) { F.sta = Math.max(0, F.sta - 5); steps.push({ k: 'hz', h: 'tomato', s: F.side }); }
  }
  if (fi.arena === 'carsi') {
    if (hz.spice) { hz.spice.left--; if (hz.spice.left <= 0) { hz.spice = null; steps.push({ k: 'hz', h: 'spiceEnd' }); } }
    else if (fi.tn % 8 === 0) {
      const c = clamp(Math.round((fi.f[0].pos + fi.f[1].pos) / 2) + rint(rnd, -2, 2), 1, LANE - 2);
      hz.spice = { tiles: [c - 1, c, c + 1], left: 5 }; steps.push({ k: 'hz', h: 'spice', tiles: hz.spice.tiles });
    }
  }
  if (fi.arena === 'kale') {
    if (hz.stone && fi.tn >= hz.stone.at) {
      const tile = hz.stone.tile, F = fi.f.find(x => x.pos === tile);
      let dmg = 0; if (F) dmg = hazardDamage(F, rint(rnd, 11, 17), 'h');
      steps.push({ k: 'hz', h: 'stone', tile, s: F ? F.side : -1, dmg }); hz.stone = null;
      if (checkKo(fi, steps)) return;
    } else if (!hz.stone && fi.tn % 6 === 0) {
      const tile = rnd() < .75 ? fi.f[rnd() < .5 ? 0 : 1].pos : rint(rnd, 0, LANE - 1);
      hz.stone = { tile, at: fi.tn + 2 }; steps.push({ k: 'hz', h: 'stoneWarn', tile });
    }
  }
  if (fi.arena === 'imp' && !hz.lion && fi.tn >= 12 && rnd() < .07) {
    hz.lion = true;
    const t = fi.f[0].cos === fi.f[1].cos ? fi.f[rnd() < .5 ? 0 : 1] : (fi.f[0].cos < fi.f[1].cos ? fi.f[0] : fi.f[1]);
    const d = hazardDamage(t, rint(rnd, 12, 18), 'a');
    steps.push({ k: 'hz', h: 'lion', s: t.side, dmg: d });
    if (checkKo(fi, steps)) return;
  }
  if (fi.tn >= fi.maxT) {      // hakem kararı: süre doldu
    const sc = fi.f.map(F => F.hp / F.hpMax + F.cos / 400);
    const win = sc[0] === sc[1] ? (fi.f[0].tot.dmg >= fi.f[1].tot.dmg ? 0 : 1) : (sc[0] > sc[1] ? 0 : 1);
    fi.over = { win, how: 'karar' }; steps.push({ k: 'decision', s: win }); return;
  }
  fi.turn = 1 - s;
  const N = fi.f[fi.turn];
  if (N.fx.burn > 0) { N.fx.burn--; N.hp = Math.max(0, N.hp - 3); steps.push({ k: 'hz', h: 'burn', s: N.side, dmg: 3 }); checkKo(fi, steps); }
}
const STEP_MS = { move: 520, atk: 820, guard: 480, rest: 620, taunt: 950, item: 1050, hz: 950, ko: 1300, bored: 380, decision: 1200 };
function stepDur(st) {
  let d = STEP_MS[st.k] || 600;
  if (st.k === 'move') d = 300 + Math.abs(st.to - st.from) * 260 + (st.slip ? 450 : 0);
  if (st.k === 'atk') d = st.kind === 'ozel' ? 1900 : (st.hits.length > 1 ? 1050 : 820) + (st.lunge ? 200 : 0);
  if (st.k === 'hz' && st.h === 'lion') d = 2100;
  if (st.k === 'hz' && (st.h === 'spiceEnd' || st.h === 'burn')) d = 500;
  return d;
}

/* ------------------------------------------------------------------ bilgisayar */
function aiAcc(diff, rnd) { const m = { kolay: .5, orta: .68, zor: .82 }[diff] || .68, sp = { kolay: .32, orta: .26, zor: .17 }[diff] || .26; return clamp(m + (rnd() * 2 - 1) * sp, 0, 1); }
function aiPick(fi, s, diff, pers, rnd) {
  const A0 = fi.f[s], D = fi.f[1 - s], d = distOf(fi), w = weaponOf(A0), dw = weaponOf(D), L = legalMap(fi, s);
  const sk = { kolay: 0, orta: 1, zor: 2 }[diff] ?? 1, P = PERS[pers] || PERS.dengeli;
  const hpF = A0.hp / A0.hpMax, dangerNext = d <= dw.reach + (stepsOf(D, 'ilerle')) && D.sta >= 6;
  const sc = {}, add = (k, v) => { if (L[k]) sc[k] = (sc[k] || 0) + v; };
  if (L.ozel) add('ozel', 90 + sk * 10);
  for (const kind of ['hizli', 'normal', 'guclu']) {
    if (!L[kind]) continue;
    let e = hitChance(fi, s, kind, sk === 0 ? .5 : .65) * avgDamage(fi, s, kind) * (D.guard ? BLOCK[kind] : 1) * (w.kind === 'hancer' && kind === 'hizli' ? 1.8 : 1);
    let v = 20 + e * 3;
    const left = A0.sta - costOf(A0, kind);
    if (sk >= 1 && left < 6 && D.hp > e * 1.5) v -= 14;
    if (D.hp <= e * 1.2) v += 25;                        // bitirici
    if (D.guard && kind === 'guclu') v += 10 * sk;
    if (D.rest || D.fx.slip) v += 8;
    if (P === PERS.saldirgan && kind === 'guclu') v += 8;
    add(kind, v);
  }
  if (A0.items.sifa > 0 && hpF < .38) add('esya:sifa', 70);
  if (A0.items.ates > 0 && d >= 2) add('esya:ates', 26 + (P.items ? 10 : 0) + (D.hp < 14 ? 30 : 0));
  if (A0.items.sis > 0 && (D.cos >= 80 || hpF < .5) && !D.fx.blind) add('esya:sis', 22 + (P.items ? 10 : 0) + sk * 4);
  const staF = A0.sta / A0.staMax;
  if (d > w.reach) add('ilerle', 34 + (d - w.reach) * 4 - (staF < .2 ? 25 : 0) + (P === PERS.saldirgan ? 8 : 0));
  if (w.reach === 2 && d === 1) add('geri', 30 + sk * 6);
  if (fi.hz.stone && fi.hz.stone.tile === A0.pos && sk >= 1) { add('geri', 60); add('ilerle', 55); }
  if (fi.arena === 'imp' && (A0.pos === 0 || A0.pos === LANE - 1)) add('ilerle', 30);
  if (inSpice(fi, A0.pos) && sk >= 2) { add('geri', 14); add('ilerle', 12); }
  if (dangerNext) {
    add('savun', 12 + (D.cos >= 100 ? 40 * sk : 0) + (staF < .3 ? 18 : 0) + (P === PERS.temkinli ? 12 : 0) + (D.fx.blind ? -10 : 0));
    add('dinlen', staF < .25 ? 22 : 2);
  } else {
    add('dinlen', staF < .55 ? 30 + (1 - staF) * 30 : 4);
    add('savun', 4);
  }
  if (A0.cos < 85) add('goster', (d >= 3 ? 16 : dangerNext ? 2 : 10) + (P === PERS.gosterici ? 18 : 0) - (A0.hist[A0.hist.length - 1] === 'goster' ? 14 : 0));
  // tekrar cezası (kalabalık sıkılmasın)
  const last2 = A0.hist.slice(-2);
  for (const k in sc) if (last2.length === 2 && last2.every(h => h === k) && sk >= 1) sc[k] -= 12;
  const noise = [30, 14, 6][sk];
  let best = 'savun', bv = -Infinity;
  for (const k in sc) { const v = sc[k] + rnd() * noise; if (v > bv) { bv = v; best = k; } }
  if (best.startsWith('esya:')) return { k: 'esya', it: best.slice(5) };
  const a = { k: best };
  if (ATTACKS.has(best)) a.acc = aiAcc(diff, rnd);
  return a;
}

/* ------------------------------------------------------------------ kariyer */
const CAR_KEY = 'arena.kariyer.v1';
const xpNeed = l => 50 + l * 40;
function careerNew(name, look, S) {
  return { v: 1, name, look: cleanLook(look), S: Object.assign({}, S), gear: { w: 'sopa', s: null, h: null, a: null, b: null }, own: ['sopa'], dur: {},
    items: { ates: 0, sifa: 1, sis: 0 }, gold: 100, xp: 0, lvl: 1, pts: 0, arena: 0, prog: [0, 0, 0, 0, 0], wins: 0, losses: 0, champs: 0, crits: 0, legend: false, lwins: 0, best: 0, created: Date.now() };
}
function validCareer(c) {
  if (!c || c.v !== 1 || typeof c.name !== 'string' || !c.S || !c.gear || !Array.isArray(c.own) || !Array.isArray(c.prog)) return null;
  const o = careerNew(String(c.name).slice(0, 16) || 'Kahraman', c.look, {});
  SK.forEach(k => { o.S[k] = clamp(c.S[k] | 0, 1, STAT_CAP); });
  o.own = c.own.filter(id => GEAR[id]); if (!o.own.includes('sopa')) o.own.unshift('sopa');
  SLOTS.forEach(sl => { const id = c.gear[sl]; o.gear[sl] = id && GEAR[id] && GEAR[id].slot === sl && o.own.includes(id) ? id : null; });
  if (!o.gear.w) o.gear.w = 'sopa';
  if (GEAR[o.gear.w].two) o.gear.s = null;
  ['s', 'h', 'a', 'b'].forEach(sl => { if (c.dur && c.dur[sl] != null && o.gear[sl]) o.dur[sl] = clamp(c.dur[sl] | 0, 0, GEAR[o.gear[sl]].dur); });
  if (c.durs && typeof c.durs === 'object') { o.durs = {}; for (const id in c.durs) if (GEAR[id] && GEAR[id].dur && o.own.includes(id)) o.durs[id] = clamp(c.durs[id] | 0, 0, GEAR[id].dur); }
  ITEM_KEYS.forEach(k => { o.items[k] = clamp((c.items && c.items[k]) | 0, 0, ITEM_MAX); });
  for (const k of ['gold', 'xp', 'lvl', 'pts', 'wins', 'losses', 'champs', 'crits', 'lwins', 'best']) o[k] = Math.max(0, c[k] | 0);
  o.lvl = clamp(o.lvl, 1, 60); o.arena = clamp(c.arena | 0, 0, 4); o.legend = !!c.legend; o.created = c.created || Date.now();
  o.prog = [0, 1, 2, 3, 4].map(i => clamp(c.prog[i] | 0, 0, 6));
  return o;
}
function loadCareer() { try { const raw = localStorage.getItem(CAR_KEY); if (!raw) return null; return validCareer(JSON.parse(raw)); } catch { return null; } }
function saveCareer(c) { try { if (c) localStorage.setItem(CAR_KEY, JSON.stringify(c)); else localStorage.removeItem(CAR_KEY); return true; } catch { return false; } }
function heroEff(c) { return effStats(c.S, c.gear); }
function priceFor(c, base) { return Math.round(base * (1 - Math.min(.2, heroEff(c).kar * .006))); }
function itemCount(items) { return ITEM_KEYS.reduce((a, k) => a + (items[k] | 0), 0); }
function careerPoints(c) { return c.wins * 10 + c.champs * 100 + c.lvl * 5 + c.crits * 2 + (c.legend ? 500 : 0) + c.lwins * 25; }
function addXp(c, x) { c.xp += x; let up = 0; while (c.xp >= xpNeed(c.lvl) && c.lvl < 60) { c.xp -= xpNeed(c.lvl); c.lvl++; c.pts += 4; up++; } return up; }
function repairCost(c) { let t = 0; ['s', 'h', 'a', 'b'].forEach(sl => { const id = c.gear[sl]; if (!id) return; const g = GEAR[id], cur = c.dur[sl] != null ? c.dur[sl] : g.dur; t += (g.dur - cur) * (g.tier * 4 + 2); }); return t; }
function equip(c, id) {
  const g = GEAR[id]; if (!g || !c.own.includes(id) || !meetsReq(c.S, g)) return false;
  c.gear[g.slot] = id; c.dur[g.slot] = c.durs && c.durs[id] != null ? c.durs[id] : g.dur;
  if (g.slot === 'w' && g.two) c.gear.s = null;
  if (g.slot === 's' && GEAR[c.gear.w].two) c.gear.w = 'sopa';
  return true;
}
function oppDef(a, i) {
  const r = mulberry32(1000 + a * 17 + i * 131);
  const champ = i === 5, row = OPP[a][i], pers = row[1], P = PERS[pers];
  const lvl = Math.round(1 + a * 4 + i * .7 + (champ ? 1.2 : 0));
  const pts = Math.round(4 + (lvl - 1) * 3.6 + (champ ? 1 : 0) - (a === 0 && i < 2 ? 3 : 0));
  const S = {}; SK.forEach(k => { S[k] = 3; });
  const tw = SK.reduce((t, k) => t + P.w[k], 0);
  for (let n = 0; n < pts; n++) { let x = r() * tw; for (const k of SK) { x -= P.w[k]; if (x <= 0) { if (S[k] < STAT_CAP) S[k]++; break; } } }
  const tmax = clamp(1 + Math.floor((a * 5 + i + (champ ? 1 : 0)) / 9), 1, 4);
  const fav = GEAR_LIST.filter(g => g.slot === 'w' && g.tier >= 1 && g.tier <= tmax && P.kinds.includes(g.kind)).sort((x, y) => x.price - y.price)[0];
  if (fav) for (const k in fav.req) S[k] = Math.max(S[k], fav.req[k]);      // kişiliğine uygun silahı taşıyabilsin
  const gear = { w: 'sopa', s: null, h: null, a: null, b: null };
  const bestFor = (slot, filt) => { const c = GEAR_LIST.filter(g => g.slot === slot && g.tier >= 1 && g.tier <= tmax && meetsReq(S, g) && (!filt || filt(g))).sort((x, y) => y.tier - x.tier || y.price - x.price); if (!c.length) return null; return r() < .3 && c.length > 1 ? c[1].id : c[0].id; };
  gear.w = bestFor('w', g => P.kinds.includes(g.kind)) || bestFor('w', g => !g.two) || 'sopa';
  if (!GEAR[gear.w].two && P.shield) gear.s = bestFor('s');
  for (const sl of ['h', 'a', 'b']) if (a > 0 || i >= 2 || r() < .5) gear[sl] = bestFor(sl);
  const items = { ates: 0, sifa: 0, sis: 0 };
  if (a >= 1 || champ) items.sifa = 1;
  if (P.items) { items.sis = 1; items.ates = a >= 1 ? 1 : 0; }
  if (a >= 3 && r() < .5) items.ates++;
  const diff = a === 0 ? (champ ? 'orta' : 'kolay') : a <= 2 ? 'orta' : (a === 3 && !champ ? 'orta' : 'zor');
  return { name: row[0], pers, quote: row[2], lvl, S, gear, items, look: randomLook(r), diff, champ, a, i };
}
function legendOpp(c, n) {
  const r = mulberry32(777 + n * 53 + c.lvl);
  const pers = rpick(r, Object.keys(PERS)), P = PERS[pers];
  const name = rpick(r, ['Efsane ', 'Ölümsüz ', 'Altın ', 'Kara ', 'Gümüş ']) + rpick(r, BOT_NAMES).split(' ')[1];
  const lvl = c.lvl + 1 + Math.floor(n / 3);
  const S = {}; SK.forEach(k => { S[k] = 3; });
  const pts = 12 + (lvl - 1) * 4, tw = SK.reduce((t, k) => t + P.w[k], 0);
  for (let q = 0; q < pts; q++) { let x = r() * tw; for (const k of SK) { x -= P.w[k]; if (x <= 0) { if (S[k] < STAT_CAP) S[k]++; break; } } }
  const gear = { w: 'sopa', s: null, h: null, a: null, b: null };
  const bestFor = (slot, f) => { const cc = GEAR_LIST.filter(g => g.slot === slot && g.tier >= 1 && meetsReq(S, g) && (!f || f(g))).sort((x, y) => y.tier - x.tier); return cc.length ? cc[0].id : null; };
  gear.w = bestFor('w', g => P.kinds.includes(g.kind)) || bestFor('w', g => !g.two) || 'sopa';
  if (!GEAR[gear.w].two && P.shield) gear.s = bestFor('s');
  ['h', 'a', 'b'].forEach(sl => { gear[sl] = bestFor(sl); });
  return { name, pers, quote: 'Efsaneler de kanar mı, görelim.', lvl, S, gear, items: { sifa: 1, ates: 1, sis: P.items ? 1 : 0 }, look: randomLook(r), diff: 'zor', champ: false, a: 4, i: 6, legend: true };
}
function rewardFor(a, i, won, cos, kar, rematch) {
  const champ = i === 5;
  let gold = (30 + a * 55 + Math.min(i, 5) * 10) * (champ ? 2.5 : 1), xp = (25 + a * 30 + Math.min(i, 5) * 6) * (champ ? 2 : 1);
  if (rematch) { gold *= .5; xp *= .5; }
  if (!won) { gold *= .25; xp *= .3; }
  const tip = won ? Math.round(cos * (.4 + kar * .03)) : 0;
  return { gold: Math.round(gold), xp: Math.round(xp), tip };
}
function heroBuild(c) { return { name: c.name, look: c.look, S: c.S, gear: c.gear, dur: c.dur, items: c.items, lvl: c.lvl }; }

/* ------------------------------------------------------------------ taslak (eşit kurulum) */
function draftCost(b) {
  let g = 0; for (const sl of SLOTS) { const id = b.gear && b.gear[sl]; if (id && GEAR[id]) g += GEAR[id].price; }
  ITEM_KEYS.forEach(k => { g += ((b.items && b.items[k]) | 0) * ITEMS[k].price; });
  return g;
}
function validDraft(b) {
  if (!b || !b.S || !b.gear) return false;
  let spent = 0;
  for (const k of SK) { const v = b.S[k]; if (!Number.isInteger(v) || v < DRAFT.base || v > DRAFT.max) return false; spent += v - DRAFT.base; }
  if (spent !== DRAFT.pts) return false;
  for (const sl of SLOTS) { const id = b.gear[sl]; if (id == null) continue; const g = GEAR[id]; if (!g || g.slot !== sl || g.tier > DRAFT.tier || !meetsReq(b.S, g)) return false; }
  if (b.gear.w && GEAR[b.gear.w].two && b.gear.s) return false;
  const items = b.items || {}; for (const k in items) if (!ITEMS[k] || !Number.isInteger(items[k]) || items[k] < 0) return false;
  if (itemCount(items) > ITEM_MAX) return false;
  return draftCost(b) <= DRAFT.gold;
}
function validCareerBuild(b) {     // Düello'da "kariyer kahramanım" seçeneği: makul sınırlar
  if (!b || !b.S || !b.gear) return false;
  for (const k of SK) { const v = b.S[k]; if (!Number.isInteger(v) || v < 1 || v > STAT_CAP) return false; }
  if (sumStats(b.S) > 21 + CREATE.pts + 4 * 59) return false;
  for (const sl of SLOTS) { const id = b.gear[sl]; if (id == null) continue; const g = GEAR[id]; if (!g || g.slot !== sl || !meetsReq(b.S, g)) return false; }
  return itemCount(b.items || {}) <= ITEM_MAX;
}
function presetBuild(p, name, look) { return { name, look, S: Object.assign({}, p.S), gear: Object.assign({}, p.gear), items: Object.assign({ ates: 0, sifa: 0, sis: 0 }, p.items) }; }

/* ------------------------------------------------------------------ turnuva ağacı */
function bracketNew(n) {
  const rounds = []; let m = n / 2, r = 0;
  while (m >= 1) { rounds.push(Array.from({ length: m }, (_, k) => r === 0 ? { a: k * 2, b: k * 2 + 1, w: null } : { a: null, b: null, w: null })); m /= 2; r++; }
  return rounds;
}
function bracketNext(br) {
  for (let r = 0; r < br.length; r++) for (let m = 0; m < br[r].length; m++) { const x = br[r][m]; if (x.w == null && x.a != null && x.b != null) return { r, m }; }
  return null;
}
function bracketSet(br, r, m, w) {
  const x = br[r][m]; if (!x || x.w != null || (w !== x.a && w !== x.b)) return false;
  x.w = w;
  if (r + 1 < br.length) { const nx = br[r + 1][m >> 1]; if (m % 2 === 0) nx.a = w; else nx.b = w; }
  return true;
}
function bracketChampion(br) { const f = br[br.length - 1][0]; return f.w; }
function roundName(br, r) { const left = br.length - r; return left === 1 ? 'Final' : left === 2 ? 'Yarı final' : left === 3 ? 'Çeyrek final' : `${r + 1}. tur`; }
function placeOf(br, e) {   // 0 = şampiyon, 1 = finalist, 2 = yarı final, 3 = çeyrek
  if (bracketChampion(br) === e) return 0;
  for (let r = br.length - 1; r >= 0; r--) for (const x of br[r]) if ((x.a === e || x.b === e) && x.w != null && x.w !== e) return br.length - r;
  return br.length;
}

/* ------------------------------------------------------------------ oyun durumu (yöneten cihaz) */
const TUNE = { speed: 1 };              // testlerde animasyon/tempo ölçeği
const R = () => Math.random();
const cleanName = s => (CF.cleanName ? CF.cleanName(s) : String(s || '').trim().slice(0, 16));
function arenaFor(st) { return ARENA_IX[st.arenaOpt] != null ? st.arenaOpt : ARENAS[Math.floor(R() * ARENAS.length)].id; }
function setWait(st, ctx, what, ms) { ms = Math.round(ms * Math.max(.15, TUNE.speed)); st.wait = { what, at: Date.now() + ms }; ctx.later(ms, () => runWait(st, ctx, what)); }
function runWait(st, ctx, what) {
  if (!st.wait || st.wait.what !== what) return;
  st.wait = null;
  if (what === 'boutEnd') boutEnd(st, ctx);
  else if (what === 'nextBout') startBout(st, ctx);
  else if (what === 'nextMatch') nextMatch(st, ctx);
  else if (what === 'matchIntro') openBets(st, ctx);
  else if (what === 'betClose') closeBets(st, ctx);
  else if (what === 'draftDone') afterDraft(st, ctx);
}
function botBuild(e) { const p = PRESETS[Math.floor(R() * PRESETS.length)]; const b = presetBuild(p, e.name, randomLook(R)); b.pers = { denge: 'dengeli', ruzgar: 'kurnaz', mizrak: 'uzak', ayi: 'saldirgan', sovmen: 'gosterici' }[p.id]; return b; }

function setup(players, opts) {
  const mode = ['kariyer', 'duello', 'turnuva'].includes(opts.mod) ? opts.mod : 'kariyer';
  const st = { mode, phase: '', players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })),
    diff: ['kolay', 'orta', 'zor'].includes(opts.zorluk) ? opts.zorluk : 'orta', arenaOpt: opts.arena || 'rastgele', bo: opts.mac === '1' ? 1 : 3,
    hero: opts.kahraman === 'kariyer' ? 'kariyer' : 'esit', fight: null, match: null, ents: [], br: null, bet: null, wait: null, kick: null,
    coins: players.map(() => 100), car: null, post: null, cf: null };
  if (mode === 'kariyer') { st.car = loadCareer(); st.phase = st.car ? 'town' : 'create'; return st; }
  const idx = players.map((_, i) => i);
  const fighters = mode === 'duello' ? idx.slice(0, 2) : idx.slice(0, 8);
  st.ents = fighters.map(i => ({ name: players[i].name, pi: i, bot: !!players[i].isBot, color: players[i].color, build: null, locked: false, diff: st.diff }));
  const size = mode === 'duello' ? 2 : (opts.boyut === '8' || st.ents.length > 4 ? 8 : 4);
  const used = new Set(players.map(p => p.name));
  const pool = BOT_NAMES.filter(n => !used.has(n)).sort(() => R() - .5);
  const botCols = ['#c9a27a', '#9fb4c9', '#c98fb0', '#a7c98f', '#d6c27a', '#8fc9c4', '#c9a08f'];
  while (st.ents.length < size) st.ents.push({ name: pool.pop() || 'Gladyatör', pi: -1, bot: true, color: botCols[st.ents.length % botCols.length], build: null, locked: false, diff: st.diff });
  if (mode === 'turnuva') st.ents = st.ents.sort(() => R() - .5);
  st.ents.forEach(e => { if (e.bot) { e.build = botBuild(e); e.locked = true; } });
  st.phase = 'draft';
  return st;
}
function resume(st, ctx) {
  st.kick = null;
  const fi = st.fight;
  if (fi && fi.busy) { ctx.later(300, () => { fi.busy = false; if (fi.over) fightOver(st, ctx); else { ctx.sync(); kick(st, ctx); } }); }
  if (st.wait) { const w = st.wait.what; ctx.later(Math.max(200, st.wait.at - Date.now()), () => runWait(st, ctx, w)); }
  kick(st, ctx);
}
function allLocked(st) { return st.ents.length && st.ents.every(e => e.locked); }
function afterDraft(st, ctx) {
  if (st.phase !== 'draft') return;
  if (st.hero === 'kariyer') {     // kariyer kahramanları varsa bilgisayarlar o seviyeye çıkar
    const lv = Math.max(0, ...st.ents.filter(e => e.build && e.build.lvl).map(e => e.build.lvl));
    if (lv > 1) st.ents.forEach(e => { if (e.pi < 0 || e.bot) { const o = legendOpp({ lvl: lv - 1 }, Math.floor(R() * 9)); e.build = { name: e.name, look: o.look, S: o.S, gear: o.gear, items: o.items, lvl: o.lvl, pers: o.pers }; } });
  }
  ctx.emit({ t: 'draft' }, 'Herkes hazır! Kahramanlar arenaya çıkıyor.', 'gold');
  if (st.mode === 'duello') { st.match = { a: 0, b: 1, wins: [0, 0], target: st.bo === 3 ? 2 : 1, bout: 0, arena: arenaFor(st), r: 0, m: 0 }; st.phase = 'intro'; ctx.sync(); setWait(st, ctx, 'matchIntro', 2200); }
  else { st.br = bracketNew(st.ents.length); st.phase = 'bracket'; ctx.sync(); setWait(st, ctx, 'nextMatch', 2600); }
}
function nextMatch(st, ctx) {
  const nx = bracketNext(st.br);
  if (!nx) { finishTournament(st, ctx); return; }
  const x = st.br[nx.r][nx.m], A0 = st.ents[x.a], B = st.ents[x.b];
  const botsOnly = A0.pi < 0 && B.pi < 0;
  st.match = { a: x.a, b: x.b, wins: [0, 0], target: botsOnly || st.bo === 1 ? 1 : 2, bout: 0, arena: arenaFor(st), r: nx.r, m: nx.m, fast: botsOnly };
  st.phase = 'intro'; st.fight = null;
  ctx.emit({ t: 'match' }, `${roundName(st.br, nx.r)}: ${A0.name} – ${B.name}`, 'gold');
  ctx.sync(); setWait(st, ctx, 'matchIntro', 2400);
}
function bettors(st) {
  const m = st.match; if (!m) return [];
  const busy = new Set([st.ents[m.a].pi, st.ents[m.b].pi]);
  return st.players.map((p, i) => i).filter(i => !busy.has(i) && st.coins[i] > 0);
}
function openBets(st, ctx) {
  const el = bettors(st);
  if (!el.length) { startBout(st, ctx); return; }
  st.bet = { picks: {}, open: true, eligible: el };
  el.filter(i => st.players[i].isBot).forEach(i => { st.bet.picks[i] = { side: R() < .5 ? 0 : 1, amt: Math.min(st.coins[i], [10, 25][Math.floor(R() * 2)]) }; });
  if (el.every(i => st.bet.picks[i])) { closeBets(st, ctx); return; }
  st.phase = 'bet'; ctx.sync(); setWait(st, ctx, 'betClose', 13000);
}
function closeBets(st, ctx) {
  if (st.phase !== 'bet' && st.phase !== 'intro') return;
  if (st.bet) { st.bet.open = false; const n = Object.values(st.bet.picks).filter(p => p.side >= 0).length; if (n) ctx.emit({ t: 'betclose' }, `Bahisler kapandı (${n} bahis).`); }
  st.wait = null; startBout(st, ctx);
}
function fighterCtl(st, e) { return { pi: e.pi, bot: e.bot, diff: e.diff || st.diff, pers: (e.build && e.build.pers) || 'dengeli', color: e.color }; }
function startBout(st, ctx) {
  const m = st.match; m.bout++;
  const A0 = st.ents[m.a], B = st.ents[m.b];
  const first = m.bout === 1 ? (R() < .5 ? 0 : 1) : (m.first + m.bout - 1) % 2;
  if (m.bout === 1) m.first = first;
  st.fight = newFight(m.arena, Object.assign({}, A0.build, { name: A0.name, color: A0.color }), Object.assign({}, B.build, { name: B.name, color: B.color }), fighterCtl(st, A0), fighterCtl(st, B), R, first);
  if (m.fast) st.fight.maxT = 50;
  st.phase = 'fight'; st.kick = null;
  ctx.emit({ t: 'bout', b: m.bout }, `${m.bout}. raunt · ${ARENAS[ARENA_IX[m.arena]].n} — ${st.fight.f[first].name} başlıyor.`, 'gold');
  ctx.sync(); kick(st, ctx);
}
function kick(st, ctx) {
  const fi = st.fight;
  if (st.phase !== 'fight' || !fi || fi.busy || fi.over) return;
  const F = fi.f[fi.turn]; if (F.ctl.pi >= 0) return;          // salon oyuncusu (insan / salon botu) kendi oynar
  const key = fi.seq + ':' + fi.turn; if (st.kick === key) return; st.kick = key;
  const fast = st.match && st.match.fast;
  ctx.later(Math.round((fast ? 260 : 520 + R() * 420) * Math.max(.2, TUNE.speed)), () => {
    if (st.fight !== fi || st.kick !== key || fi.busy || fi.over) return;
    doAct(st, ctx, fi.turn, aiPick(fi, fi.turn, F.ctl.diff, F.ctl.pers, R));
  });
}
const ACT_LOG = { ilerle: 'ilerledi', geri: 'geri çekildi', savun: 'savunmaya geçti', dinlen: 'soluklandı', goster: 'kalabalığı coşturdu 🎭' };
function describe(fi, s, a, steps) {
  const F = fi.f[s], O = fi.f[1 - s], out = [];
  let cls = '';
  for (const x of steps) {
    if (x.k === 'move') out.push(`${F.name} ${x.to === x.from ? 'yerinde saydı' : (x.s === 0) === (x.to > x.from) ? 'ilerledi' : 'geri çekildi'}${x.slip ? ' ve kaydı! 💧' : ''}`);
    else if (x.k === 'atk') {
      const nm = x.kind === 'ozel' ? `🦅 ${SPECIAL_N[x.wk]}` : ACT_N[x.kind];
      const parts = x.hits.map(h => h.res === 'miss' ? 'ıska' : `${h.dmg} hasar${h.res === 'block' ? ' (savuşturuldu)' : ''}`);
      out.push(`${F.name} · ${nm}: ${parts.join(', ')}${x.crit ? ' — KUSURSUZ!' : ''}`);
      x.hits.forEach(h => { if (h.broke) out.push(`${O.name}: ${SLOT_N[h.broke].toLocaleLowerCase('tr-TR')} kırıldı!`); });
      if (x.crit || x.kind === 'ozel') cls = 'gold';
    } else if (x.k === 'taunt') out.push(`${F.name} ${ACT_LOG.goster}${x.shake ? `, ${O.name} sarsıldı` : ''}`);
    else if (x.k === 'guard' || x.k === 'rest') out.push(`${F.name} ${ACT_LOG[x.k === 'guard' ? 'savun' : 'dinlen']}`);
    else if (x.k === 'item') out.push(x.it === 'sifa' ? `${F.name} Şifa İksiri içti (+${x.heal})` : x.it === 'ates' ? `${F.name} Ateş Şişesi fırlattı: ${x.dmg} hasar 🔥` : `${F.name} Sis Bombası attı 🌫️`);
    else if (x.k === 'bored') out.push('Kalabalık esniyor… (aynı hamle)');
    else if (x.k === 'hz') {
      const T = x.s >= 0 ? fi.f[x.s] : null;
      if (x.h === 'tomato') out.push(`🍅 ${T.name} domatesle vuruldu!`);
      else if (x.h === 'spice') out.push('🌶️ Baharat bulutu arenaya yayıldı!');
      else if (x.h === 'stoneWarn') out.push('⚠️ Surlardan taş düşüyor — gölgeden kaç!');
      else if (x.h === 'stone') out.push(T ? `🪨 Taş ${T.name} üstüne düştü: ${x.dmg} hasar!` : '🪨 Taş boş kareye düştü.');
      else if (x.h === 'lion') out.push(`🦁 Aslan kafesi açıldı! ${T.name} pençe yedi: ${x.dmg} hasar!`);
      else if (x.h === 'fire') out.push(`🔥 ${T.name} mangala fazla yaklaştı: ${x.dmg} hasar`);
      else if (x.h === 'burn') out.push(`🔥 ${T.name} yanıyor: ${x.dmg} hasar`);
    } else if (x.k === 'ko') { out.push(`💥 NAKAVT! ${fi.f[x.s].name} kumlara serildi.`); cls = 'bad'; }
    else if (x.k === 'decision') { out.push(`⏱ Süre doldu — hakem kararı: ${fi.f[x.s].name}!`); cls = 'gold'; }
  }
  return [out.join(' · '), cls];
}
function doAct(st, ctx, side, a) {
  const fi = st.fight; if (!fi) return false;
  const steps = perform(fi, side, a, R);
  if (!steps) return false;
  fi.anim = { k: fi.seq, steps, s: side };
  const dur = steps.reduce((t, x) => t + stepDur(x), 0) * TUNE.speed + 120;
  fi.busy = true; st.kick = null;
  const [line, cls] = describe(fi, side, a, steps);
  ctx.emit({ t: 'act', s: side }, line, cls);
  ctx.sync();
  ctx.later(Math.round(dur), () => {
    if (st.fight !== fi) return;
    fi.busy = false;
    if (fi.over) fightOver(st, ctx); else { ctx.sync(); kick(st, ctx); }
  });
  return true;
}
function fightOver(st, ctx) {
  const fi = st.fight; if (!fi || !fi.over || fi.done) return;
  fi.done = true; st.phase = 'boutover';
  ctx.emit({ t: 'boutover', win: fi.over.win }, `${fi.f[fi.over.win].name} rauntu kazandı${fi.over.how === 'karar' ? ' (hakem kararı)' : ''}!`, 'good');
  ctx.sync();
  setWait(st, ctx, 'boutEnd', 1800);
}
function boutEnd(st, ctx) {
  const fi = st.fight;
  if (st.mode === 'kariyer') { careerAfterFight(st, ctx); return; }
  const m = st.match, w = fi.over.win;
  m.wins[w]++;
  if (m.wins[w] < m.target) { st.phase = 'inter'; ctx.sync(); setWait(st, ctx, 'nextBout', 2600); return; }
  const we = w === 0 ? m.a : m.b, le = w === 0 ? m.b : m.a;
  m.winner = we;
  if (st.bet) {
    for (const [pi, p] of Object.entries(st.bet.picks)) {
      if (p.side < 0) continue;
      const ok = p.side === w; st.coins[pi] = Math.max(0, st.coins[pi] + (ok ? p.amt : -p.amt));
      ctx.emit({ t: 'payout', pi: +pi, ok }, `${st.players[pi].name} bahsi ${ok ? 'kazandı' : 'kaybetti'}: ${ok ? '+' : '−'}${p.amt} 🪙`, ok ? 'good' : 'bad');
    }
    st.bet = null;
  }
  ctx.emit({ t: 'matchwin', e: we }, `🏆 ${st.ents[we].name} maçı ${m.wins[w]}–${m.wins[1 - w]} kazandı!`, 'gold');
  if (st.mode === 'duello') {
    st.phase = 'done'; ctx.sync();
    const fighters = [we, le].map(e => st.ents[e]).filter(e => e.pi >= 0);
    const others = st.players.map((_, i) => i).filter(i => !fighters.some(e => e.pi === i));
    const ranking = fighters.map(e => ({ pi: e.pi, score: (e === st.ents[we] ? 1000 : 0) + st.coins[e.pi], label: e === st.ents[we] ? `Kazandı ${m.wins[w]}–${m.wins[1 - w]}` : `Kaybetti ${m.wins[1 - w]}–${m.wins[w]}` }))
      .concat(others.map(i => ({ pi: i, score: st.coins[i], label: `🪙 ${st.coins[i]} (seyirci)` }))).sort((x, y) => y.score - x.score);
    ctx.end({ title: `${st.ents[we].name} düelloyu kazandı!`, ranking, note: 'Arena Ustası · Düello' });
    return;
  }
  bracketSet(st.br, m.r, m.m, we);
  st.phase = 'bracket'; ctx.sync();
  setWait(st, ctx, 'nextMatch', 3000);
}
const PLACE_N = ['🏆 Şampiyon', '🥈 Finalist', 'Yarı finalist', 'Çeyrek finalist'];
const PLACE_P = [300, 200, 120, 60];
function finishTournament(st, ctx) {
  st.phase = 'done'; st.fight = null; ctx.sync();
  const champ = bracketChampion(st.br);
  const ranking = st.players.map((p, i) => {
    const e = st.ents.findIndex(x => x.pi === i);
    const pl = e >= 0 ? placeOf(st.br, e) : 9;
    return { pi: i, score: (PLACE_P[pl] || 0) + st.coins[i], label: `${PLACE_N[pl] || 'Seyirci'} · 🪙 ${st.coins[i]}` };
  }).sort((a, b) => b.score - a.score);
  ctx.end({ title: `${st.ents[champ].name} turnuva şampiyonu!`, ranking, note: 'Puan = sıralama puanı + bahis sikkeleri.' });
}

/* ---------- kariyer akışı ---------- */
function startCareerFight(st, ctx, a, i, legend) {
  const c = st.car;
  const o = legend ? legendOpp(c, c.lwins) : oppDef(a, i);
  const rematch = !legend && i < c.prog[a];
  st.cf = { a, i, rematch, legend: !!legend, name: o.name, quote: o.quote, lvl: o.lvl, pers: o.pers, champ: o.champ };
  st.fight = newFight(ARENAS[a].id, heroBuild(c), o, { pi: 0, bot: false }, { pi: -1, bot: true, diff: o.diff, pers: o.pers }, R, R() < .55 ? 0 : 1);
  st.fight.f[1].lvl = o.lvl; st.fight.f[0].lvl = c.lvl;
  st.phase = 'fight'; st.post = null; st.kick = null;
  ctx.emit({ t: 'bout', b: 1 }, `${ARENAS[a].n}: ${c.name} – ${o.name}${legend ? ' (efsane maçı)' : o.champ ? ' (ŞAMPİYON)' : ''}`, 'gold');
  ctx.sync(); kick(st, ctx);
}
function careerAfterFight(st, ctx) {
  const c = st.car, fi = st.fight, F = fi.f[0], cf = st.cf;
  const won = fi.over.win === 0;
  c.dur = Object.assign({}, F.dur); c.items = Object.assign({}, F.items); c.crits += F.tot.crit;
  const rw = rewardFor(cf.a, Math.min(cf.i, 5), won, F.cos, heroEff(c).kar, cf.rematch);
  if (cf.legend) { rw.gold = Math.round(rw.gold * 1.3); rw.xp = Math.round(rw.xp * 1.2); }
  c.gold += rw.gold + rw.tip;
  const lvlUp = addXp(c, rw.xp);
  const post = { won, how: fi.over.how, gold: rw.gold, tip: rw.tip, xp: rw.xp, lvlUp, opp: cf.name, champ: null, legend: false, rematch: cf.rematch, a: cf.a };
  if (won) {
    c.wins++;
    if (cf.legend) c.lwins++;
    else if (!cf.rematch) {
      c.prog[cf.a] = Math.max(c.prog[cf.a], cf.i + 1);
      if (cf.i === 5) {
        c.champs++; post.champ = ARENAS[cf.a].n;
        if (cf.a === 4) { if (!c.legend) post.legend = true; c.legend = true; }
        else if (c.arena === cf.a) c.arena = cf.a + 1;
      }
    }
  } else c.losses++;
  c.best = Math.max(c.best, careerPoints(c));
  saveCareer(c);
  st.post = post; st.phase = 'post';
  if (won) ctx.emit({ t: 'cwin', champ: !!post.champ, legend: post.legend }, `Zafer! +${rw.gold + rw.tip} 🪙, +${rw.xp} TP${lvlUp ? ` · Seviye ${c.lvl}!` : ''}`, 'good');
  else ctx.emit({ t: 'closs' }, `Yenilgi… Teselli: +${rw.gold} 🪙, +${rw.xp} TP. Hekim seni toparladı.`, 'bad');
  if (lvlUp) ctx.emit({ t: 'lvl', l: c.lvl }, `⭐ Seviye atladın: ${c.lvl}! +${lvlUp * 4} stat puanı`, 'gold');
  if (post.champ) ctx.emit({ t: 'champ' }, `👑 ${post.champ} şampiyonu oldun!`, 'gold');
  ctx.sync();
}
function careerEnd(st, ctx) {
  const c = st.car; st.phase = 'done'; ctx.sync();
  const pts = careerPoints(c);
  ctx.end({ title: c.legend ? `Efsane ${c.name}!` : `${c.name} — kariyer kaydedildi`, ranking: [{ pi: 0, score: pts, label: `${fmt(pts)} puan · Sv ${c.lvl}` }],
    note: `${c.wins} galibiyet, ${c.losses} yenilgi, ${c.champs} arena şampiyonluğu. "Tekrar oyna" ile kariyerine kaldığın yerden devam edersin.` });
}
function careerAction(st, pi, a, ctx) {
  if (pi !== 0) return;
  const c = st.car;
  const save = () => { saveCareer(c); ctx.sync(); };
  if (a.t === 'create') {
    if (st.phase !== 'create') return;
    const name = cleanName(a.name) || st.players[0].name || 'Kahraman';
    const S = {}; let spent = 0;
    for (const k of SK) { const v = a.S && a.S[k]; if (!Number.isInteger(v) || v < CREATE.base || v > CREATE.max) return; S[k] = v; spent += v - CREATE.base; }
    if (spent !== CREATE.pts) return;
    st.car = careerNew(name, a.look, S); saveCareer(st.car); st.phase = 'town';
    ctx.emit({ t: 'created' }, `${name} kariyerine başladı! İlk durak: Köy Meydanı.`, 'gold'); ctx.sync(); return;
  }
  if (!c) return;
  if (a.t === 'next') { if (st.phase !== 'post') return; st.phase = 'town'; st.fight = null; st.post = null; st.cf = null; ctx.sync(); return; }
  if (a.t === 'leave') { if (st.phase === 'fight' || st.phase === 'boutover') return; careerEnd(st, ctx); return; }
  if (st.phase !== 'town') return;
  switch (a.t) {
    case 'alloc': { if (!SK.includes(a.k) || c.pts <= 0 || c.S[a.k] >= STAT_CAP) return; c.S[a.k]++; c.pts--; save(); return; }
    case 'buy': {
      if (ITEMS[a.id]) { const p = priceFor(c, ITEMS[a.id].price); if (c.gold < p || itemCount(c.items) >= ITEM_MAX) return; c.gold -= p; c.items[a.id]++; ctx.emit({ t: 'buy' }, `${ITEMS[a.id].n} alındı (−${p} 🪙)`); save(); return; }
      const g = GEAR[a.id]; if (!g || g.tier < 1 || c.own.includes(a.id) || !meetsReq(c.S, g)) return;
      const p = priceFor(c, g.price); if (c.gold < p) return;
      c.gold -= p; c.own.push(a.id); const old = c.gear[g.slot];
      if (old && g.slot !== 'w') { c.durs = c.durs || {}; c.durs[old] = c.dur[g.slot]; }
      equip(c, a.id);
      ctx.emit({ t: 'buy' }, `${g.name} alındı ve kuşanıldı (−${p} 🪙)`); save(); return;
    }
    case 'sell': {
      const g = GEAR[a.id]; if (!g || a.id === 'sopa' || !c.own.includes(a.id)) return;
      if (c.gear[g.slot] === a.id) c.gear[g.slot] = g.slot === 'w' ? 'sopa' : null;
      c.own = c.own.filter(x => x !== a.id); if (c.durs) delete c.durs[a.id];
      const p = Math.round(g.price * .5); c.gold += p; ctx.emit({ t: 'sell' }, `${g.name} satıldı (+${p} 🪙)`); save(); return;
    }
    case 'equip': {
      const g = GEAR[a.id]; if (!g || !c.own.includes(a.id) || c.gear[g.slot] === a.id || !meetsReq(c.S, g)) return;
      const old = c.gear[g.slot]; if (old && g.slot !== 'w') { c.durs = c.durs || {}; c.durs[old] = c.dur[g.slot]; }
      if (g.slot === 's' && c.gear.w && GEAR[c.gear.w].two) { /* iki elli silah bırakılır */ }
      if (g.slot === 'w' && g.two && c.gear.s) { c.durs = c.durs || {}; c.durs[c.gear.s] = c.dur.s; }
      equip(c, a.id); save(); return;
    }
    case 'unequip': { if (!['s', 'h', 'a', 'b'].includes(a.slot) || !c.gear[a.slot]) return; c.durs = c.durs || {}; c.durs[c.gear[a.slot]] = c.dur[a.slot]; c.gear[a.slot] = null; save(); return; }
    case 'repair': { const cost = repairCost(c); if (!cost || c.gold < cost) return; c.gold -= cost; ['s', 'h', 'a', 'b'].forEach(sl => { if (c.gear[sl]) c.dur[sl] = GEAR[c.gear[sl]].dur; }); ctx.emit({ t: 'buy' }, `Demirci zırhları onardı (−${cost} 🪙)`); save(); return; }
    case 'look': { c.look = cleanLook(a.look); const nm = cleanName(a.name); if (nm) c.name = nm; save(); return; }
    case 'retire': { saveCareer(null); st.car = null; st.phase = 'create'; ctx.emit({ t: 'retire' }, `${c.name} emekliye ayrıldı. Yeni bir efsane doğsun!`, 'gold'); ctx.sync(); return; }
    case 'fight': {
      if (a.legend) { if (!c.legend) return; startCareerFight(st, ctx, 4, 6, true); return; }
      const ar = a.a | 0, i = a.i | 0;
      if (ar < 0 || ar > c.arena || i < 0 || i > 5 || i > c.prog[ar]) return;
      startCareerFight(st, ctx, ar, i, false); return;
    }
    default:
  }
}
function lockAction(st, pi, a, ctx) {
  if (st.phase !== 'draft') return;
  const e = st.ents.find(x => x.pi === pi && !x.locked); if (!e) return;
  const b0 = a.build || {};
  const b = { name: e.name, look: cleanLook(b0.look), S: {}, gear: {}, items: {} };
  SK.forEach(k => { b.S[k] = b0.S ? b0.S[k] : null; });
  SLOTS.forEach(sl => { const id = b0.gear && b0.gear[sl]; b.gear[sl] = id && GEAR[id] ? id : null; });
  ITEM_KEYS.forEach(k => { const v = b0.items && b0.items[k]; b.items[k] = Number.isInteger(v) ? v : 0; });
  if (a.car && st.hero === 'kariyer') { if (!validCareerBuild(b)) return; b.lvl = clamp(b0.lvl | 0, 1, 60); b.pers = 'dengeli'; }
  else { if (!b.gear.w) b.gear.w = 'sopa'; if (!validDraft(b)) return; }
  e.build = b; e.locked = true;
  ctx.emit({ t: 'lock', pi }, `${e.name} kahramanını hazırladı ✔`);
  ctx.sync();
  if (allLocked(st)) setWait(st, ctx, 'draftDone', 900);
}
function betAction(st, pi, a, ctx) {
  if (st.phase !== 'bet' || !st.bet || !st.bet.open || !st.bet.eligible.includes(pi) || st.bet.picks[pi]) return;
  const side = a.side === 0 || a.side === 1 ? a.side : -1;
  const amt = side < 0 ? 0 : clamp(a.amt === 'all' ? st.coins[pi] : (a.amt | 0), 1, st.coins[pi]);
  if (side >= 0 && ![10, 25, 50].includes(a.amt) && a.amt !== 'all') return;
  st.bet.picks[pi] = { side, amt };
  const m = st.match, nm = side < 0 ? null : st.ents[side === 0 ? m.a : m.b].name;
  ctx.emit({ t: 'bet', pi }, side < 0 ? `${st.players[pi].name} bahse girmedi.` : `${st.players[pi].name}: ${amt} 🪙 → ${nm}`);
  if (st.bet.eligible.every(i => st.bet.picks[i])) { st.wait = null; closeBets(st, ctx); return; }
  ctx.sync();
}
function fightAction(st, pi, a, ctx) {
  const fi = st.fight;
  if (st.phase !== 'fight' || !fi || fi.busy || fi.over) return;
  const F = fi.f[fi.turn]; if (F.ctl.pi !== pi || (st.players[pi] && st.players[pi].isBot)) return;
  const act = { k: String(a.k || '') };
  if (act.k === 'esya') act.it = String(a.it || '');
  if (ATTACKS.has(act.k)) act.acc = typeof a.acc === 'number' && isFinite(a.acc) ? clamp(a.acc, 0, 1) : .3;   // zamanlama değeri kurucuda kırpılır
  doAct(st, ctx, fi.turn, act);
}
const RULES = {
  setup, resume,
  action(st, pi, a, ctx) {
    if (a.t === 'act') { fightAction(st, pi, a, ctx); return; }
    if (st.mode === 'kariyer') { careerAction(st, pi, a, ctx); return; }
    if (a.t === 'lock') lockAction(st, pi, a, ctx);
    else if (a.t === 'bet') betAction(st, pi, a, ctx);
  },
  view(st, viewer) {
    const live = CF.Room && CF.Room.game ? CF.Room.game.players : null;
    const v = { mode: st.mode, phase: st.phase, diff: st.diff, bo: st.bo, hero: st.hero, arenaOpt: st.arenaOpt, wait: st.wait,
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, online: live && live[i] ? live[i].online !== false : true, coins: st.coins[i] })),
      fight: st.fight };
    if (st.mode === 'kariyer') { v.car = st.car; v.post = st.post; v.cf = st.cf; }
    else {
      const all = allLocked(st);
      v.ents = st.ents.map(e => ({ name: e.name, pi: e.pi, bot: e.bot, color: e.color, locked: e.locked, build: all || viewer === 'all' || viewer === e.pi ? e.build : null }));
      v.match = st.match; v.br = st.br; v.bet = st.bet;
    }
    return v;
  },
  turnOf(st) {
    if (st.phase === 'draft') { const e = st.ents.find(x => !x.locked && x.pi >= 0); return e ? e.pi : null; }
    if (st.phase === 'fight' && st.fight && !st.fight.busy && !st.fight.over) { const F = st.fight.f[st.fight.turn]; return F.ctl.pi >= 0 ? F.ctl.pi : null; }
    return null;
  },
  botDelay: 750,
  botAct(st, pi, ctx) {
    if (st.phase === 'draft') { const e = st.ents.find(x => x.pi === pi && !x.locked); if (e) { e.build = botBuild(e); e.locked = true; ctx.sync(); if (allLocked(st)) setWait(st, ctx, 'draftDone', 900); } return; }
    const fi = st.fight; if (st.phase !== 'fight' || !fi || fi.busy || fi.over) return;
    const F = fi.f[fi.turn]; if (F.ctl.pi !== pi) return;
    doAct(st, ctx, fi.turn, aiPick(fi, fi.turn, F.ctl.diff || st.diff, F.ctl.pers, R));
  },
  skipTurn(st, pi, ctx) {
    if (st.phase === 'draft') { const e = st.ents.find(x => x.pi === pi && !x.locked); if (e) { e.build = presetBuild(PRESETS[0], e.name, randomLook(R)); e.locked = true; ctx.emit({ t: 'lock', pi }, `${e.name} için hazır kahraman seçildi.`); ctx.sync(); if (allLocked(st)) setWait(st, ctx, 'draftDone', 900); } return; }
    const fi = st.fight; if (st.phase !== 'fight' || !fi || fi.busy || fi.over || fi.f[fi.turn].ctl.pi !== pi) return;
    doAct(st, ctx, fi.turn, aiPick(fi, fi.turn, 'kolay', 'temkinli', R));
  }
};

/* ------------------------------------------------------------------ çizim: karakterler */
const OUT = '#22130c';
const POSE0 = { lean: .06, head: 0, fu: .5, fl: 1.45, wa: .9, bu: .35, bl: 1.25, ft: .3, fs: .06, bt: -.24, bs: -.14, y: 0, x: 0, rot: 0, mouth: 0, brow: 0 };
const POSES = {
  idle: POSE0,
  guard: { lean: -.02, head: .05, fu: .55, fl: 1.9, wa: .75, bu: 1.25, bl: 2.05, ft: .5, fs: -.1, bt: -.35, bs: -.35, brow: 1 },
  windHigh: { lean: -.18, head: -.05, fu: 3.35, fl: 3.95, wa: .25, bu: .9, bl: 1.6, ft: .42, fs: .08, bt: -.3, bs: -.25, brow: 1, mouth: 1 },
  strikeHigh: { lean: .32, head: .1, fu: 1.55, fl: 1.25, wa: .15, bu: -.35, bl: .1, ft: .75, fs: .05, bt: -.42, bs: -.5, brow: 1, mouth: 2 },
  windLow: { lean: -.06, head: 0, fu: .1, fl: .9, wa: .65, bu: .6, bl: 1.3, ft: .35, fs: .05, bt: -.3, bs: -.2, brow: 1 },
  thrust: { lean: .3, head: .05, fu: 1.48, fl: 1.58, wa: 0, bu: -.3, bl: .3, ft: .82, fs: .1, bt: -.5, bs: -.48, brow: 1, mouth: 2 },
  hit: { lean: -.42, head: -.45, fu: -.2, fl: .55, wa: 1.1, bu: -.65, bl: -.05, ft: .55, fs: .3, bt: -.12, bs: -.05, brow: -1, mouth: 3 },
  dodge: { lean: -.38, head: -.2, fu: .3, fl: 1.2, wa: .9, bu: .2, bl: 1.0, ft: .55, fs: .0, bt: -.45, bs: -.55, brow: -1, mouth: 1 },
  taunt: { lean: -.12, head: -.35, fu: 2.95, fl: 3.05, wa: .05, bu: 2.85, bl: 3.1, ft: .25, fs: .02, bt: -.2, bs: -.08, mouth: 2 },
  rest: { lean: .62, head: .2, fu: .55, fl: .45, wa: 1.6, bu: .45, bl: .35, ft: .62, fs: -.35, bt: -.05, bs: -.55, mouth: 1, brow: -1 },
  win: { lean: -.06, head: -.25, fu: 2.9, fl: 3.05, wa: .1, bu: 1.15, bl: 2.6, ft: .3, fs: .04, bt: -.22, bs: -.1, mouth: 2 },
  windThrow: { lean: -.15, head: -.05, fu: 3.4, fl: 3.9, wa: .9, bu: 1.1, bl: 1.4, ft: .45, fs: .05, bt: -.3, bs: -.2, brow: 1 },
  release: { lean: .25, head: .1, fu: 1.9, fl: 1.8, wa: .9, bu: -.2, bl: .2, ft: .65, fs: .05, bt: -.4, bs: -.4, mouth: 2 },
  drink: { lean: -.1, head: -.35, fu: .55, fl: 1.4, wa: .9, bu: 1.2, bl: 3.6, ft: .3, fs: .05, bt: -.24, bs: -.14 },
  slip: { lean: -.55, head: -.3, fu: 1.9, fl: 2.4, wa: 1, bu: 2.2, bl: 2.9, ft: 1.05, fs: .9, bt: .3, bs: .4, brow: -1, mouth: 3 },
  fall: { lean: .1, head: -.3, fu: 2.3, fl: 2.6, wa: 1.3, bu: 2.5, bl: 2.9, ft: .35, fs: .2, bt: .15, bs: .1, mouth: 3, brow: -1 }
};
function blend(a, b, t) { const o = {}; for (const k in POSE0) o[k] = lerp(a[k] != null ? a[k] : POSE0[k], b[k] != null ? b[k] : POSE0[k], t); return o; }
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
const pt = (x, y, a, L) => [x + Math.sin(a) * L, y + Math.cos(a) * L];
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function limb(g, pts, w, col) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.strokeStyle = OUT; g.lineWidth = w + 3.4; g.stroke();
  g.strokeStyle = col; g.lineWidth = w; g.stroke();
}
function dot(g, x, y, r, col, out = true) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = col; g.fill(); if (out) { g.lineWidth = 1.8; g.strokeStyle = OUT; g.stroke(); } }
const METAL = { 0: '#8a6a45', 1: '#a9aeb5', 2: '#cfd6de', 3: '#e6eef6', 4: '#ffd75e' };
function weaponMetal(w) { return w.tier >= 4 ? '#ffd65a' : w.tier === 3 ? '#e9f4ff' : w.tier === 2 ? '#d5dbe2' : '#b7bcc2'; }
function drawWeapon(g, w, x, y, ang, glow) {
  g.save(); g.translate(x, y); g.rotate(-ang);
  const m = weaponMetal(w), wood = '#7a4a24';
  g.lineCap = 'round'; g.lineJoin = 'round';
  const stroke = (pts, wd, col) => limb(g, pts, wd, col);
  if (glow) { g.shadowColor = glow; g.shadowBlur = 16; }
  if (w.kind === 'sopa') {
    g.beginPath(); g.moveTo(-3, -6); g.lineTo(3, -6); g.lineTo(7, 44); g.quadraticCurveTo(0, 52, -7, 44); g.closePath();
    g.fillStyle = '#8b5a2b'; g.fill(); g.lineWidth = 2.2; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = '#6b411d'; [[2, 18], [-3, 30], [3, 38]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, 1.8, 0, 7); g.fill(); });
  } else if (w.kind === 'kilic') {
    const L = w.id === 'kisa' ? 36 : w.id === 'pala' ? 46 : w.id === 'simsek' ? 52 : 56;
    stroke([[0, -9], [0, 3]], 4.5, w.tier >= 4 ? '#b8860b' : '#4a2b18');
    g.beginPath();
    if (w.id === 'pala') { g.moveTo(-3, 4); g.quadraticCurveTo(-7, L * .6, 4, L); g.quadraticCurveTo(5, L * .55, 3.5, 4); }
    else { g.moveTo(-3.2, 4); g.lineTo(-3.2, L - 7); g.lineTo(0, L); g.lineTo(3.2, L - 7); g.lineTo(3.2, 4); }
    g.closePath(); g.fillStyle = m; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-1, 7); g.lineTo(-1, L - 9); g.stroke();
    if (w.id === 'simsek') { g.strokeStyle = '#6fd3ff'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(1.5, 8); g.lineTo(-.5, 18); g.lineTo(1.5, 26); g.lineTo(-.5, 36); g.stroke(); }
    stroke([[-8, 3.5], [8, 3.5]], 3.4, w.tier >= 3 ? '#e2b33c' : '#8c7a5a');
    dot(g, 0, -10.5, 2.8, w.tier >= 3 ? '#e2b33c' : '#8c7a5a');
  } else if (w.kind === 'balta') {
    const L = w.two ? 50 : 38;
    stroke([[0, -10], [0, L]], 4.5, wood);
    const big = w.two ? 1.35 : 1;
    g.beginPath(); g.moveTo(1, L - 15 * big); g.quadraticCurveTo(15 * big, L - 20 * big, 19 * big, L - 8 * big); g.quadraticCurveTo(20 * big, L + 2, 15 * big, L + 8 * big); g.quadraticCurveTo(10 * big, L - 1, 1, L - 2);
    g.closePath(); g.fillStyle = m; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(16 * big, L - 7 * big); g.quadraticCurveTo(17.5 * big, L, 14 * big, L + 5 * big); g.stroke();
    if (w.two) { g.beginPath(); g.moveTo(-1, L - 12); g.quadraticCurveTo(-11, L - 12, -13, L - 5); g.quadraticCurveTo(-9, L - 3, -1, L - 3); g.closePath(); g.fillStyle = m; g.fill(); g.stroke(); }
    if (w.id === 'ejder') { g.fillStyle = '#c0392b'; g.beginPath(); g.arc(6, L - 7, 2.2, 0, 7); g.fill(); }
  } else if (w.kind === 'mizrak') {
    const L = w.tier >= 2 ? 78 : 66;
    stroke([[0, -26], [0, L]], 3.6, w.tier >= 3 ? '#a0522d' : wood);
    g.beginPath(); g.moveTo(0, L - 2); g.quadraticCurveTo(-6.5, L + 7, 0, L + 19); g.quadraticCurveTo(6.5, L + 7, 0, L - 2); g.closePath();
    g.fillStyle = m; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = w.tier >= 3 ? '#ffd65a' : '#c0392b'; g.beginPath(); g.moveTo(-2.5, L - 3); g.lineTo(2.5, L - 3); g.lineTo(0, L - 12); g.closePath(); g.fill();
  } else if (w.kind === 'gurz') {
    const L = w.tier >= 2 ? 38 : 34;
    stroke([[0, -9], [0, L]], 4.4, w.tier >= 2 ? '#5b5f66' : wood);
    if (w.id === 'topuz') { dot(g, 0, L + 5, 8.5, '#9b6a3a'); g.fillStyle = '#6b411d'; g.beginPath(); g.arc(-2, L + 3, 1.6, 0, 7); g.fill(); }
    else {
      const r = w.tier >= 3 ? 9.5 : 8.5;
      g.fillStyle = m; g.strokeStyle = OUT; g.lineWidth = 1.8;
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.beginPath(); g.moveTo(Math.cos(a) * r * .6, L + 6 + Math.sin(a) * r * .6); g.lineTo(Math.cos(a) * (r + 5), L + 6 + Math.sin(a) * (r + 5)); g.lineTo(Math.cos(a + .35) * r * .7, L + 6 + Math.sin(a + .35) * r * .7); g.fill(); g.stroke(); }
      dot(g, 0, L + 6, r, m);
    }
  } else if (w.kind === 'hancer') {
    const L = w.tier >= 3 ? 26 : w.tier >= 2 ? 23 : 20;
    stroke([[0, -6], [0, 2]], 4, '#3b2414');
    g.beginPath(); g.moveTo(-2.6, 3); g.quadraticCurveTo(-3.4, L * .6, 1, L); g.quadraticCurveTo(3.4, L * .5, 2.6, 3); g.closePath();
    g.fillStyle = w.tier >= 3 ? '#9aa4c4' : m; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OUT; g.stroke();
    stroke([[-5, 2.5], [5, 2.5]], 2.6, w.tier >= 2 ? '#d9a93a' : '#8c7a5a');
  }
  g.restore();
}
function drawShield(g, id, x, y, dur, c1, c2, flat) {
  const s = GEAR[id]; if (!s) return;
  const broken = dur <= 0;
  g.save(); g.translate(x + 4, y);
  if (broken) g.rotate(.3);
  const tall = id === 'kulek', rad = id === 'tahtak' ? 21 : id === 'tunck' ? 22 : 24;
  const rx = flat ? rad * .42 : rad * .55, ry = tall ? 34 : rad;
  g.beginPath();
  if (tall) { g.roundRect ? g.roundRect(-rx, -ry, rx * 2, ry * 2, 6) : g.rect(-rx, -ry, rx * 2, ry * 2); }
  else if (id === 'kartalk') { g.moveTo(0, -ry); g.quadraticCurveTo(rx * 1.3, -ry, rx, 0); g.quadraticCurveTo(rx * .6, ry * .9, 0, ry * 1.1); g.quadraticCurveTo(-rx * .6, ry * .9, -rx, 0); g.quadraticCurveTo(-rx * 1.3, -ry, 0, -ry); }
  else g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  const base = id === 'tahtak' ? '#a8733d' : id === 'tunck' ? '#c9893a' : id === 'altink' ? '#f2c94c' : c1;
  const gr = g.createLinearGradient(-rx, -ry, rx, ry); gr.addColorStop(0, shade(base, .25)); gr.addColorStop(1, shade(base, -.25));
  g.fillStyle = gr; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke();
  g.save(); g.clip();
  if (id === 'tahtak') { g.strokeStyle = 'rgba(60,30,10,.55)'; g.lineWidth = 1.4; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(-rx, k * 8); g.lineTo(rx, k * 8); g.stroke(); } }
  if (id === 'tunck' || id === 'altink') { g.strokeStyle = 'rgba(80,40,0,.5)'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, rx * .72, ry * .72, 0, 0, 7); g.stroke(); }
  if (id === 'kartalk' || id === 'kulek') {
    g.fillStyle = id === 'kulek' ? '#e2b33c' : '#f4e7c5';
    g.beginPath(); g.moveTo(0, -8); g.lineTo(rx * .8, -2); g.lineTo(rx * .3, 0); g.lineTo(0, 10); g.lineTo(-rx * .3, 0); g.lineTo(-rx * .8, -2); g.closePath(); g.fill();
    if (id === 'kulek') { g.strokeStyle = '#e2b33c'; g.lineWidth = 3; g.strokeRect(-rx + 3, -ry + 3, rx * 2 - 6, ry * 2 - 6); }
  }
  if (id === 'altink') { g.fillStyle = '#fff2b0'; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - .12) * rx * .6, Math.sin(a - .12) * ry * .6); g.lineTo(Math.cos(a + .12) * rx * .6, Math.sin(a + .12) * ry * .6); g.fill(); } }
  const mx = GEAR[id].dur;
  if (dur < mx * .6) { g.strokeStyle = 'rgba(30,15,5,.75)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-rx * .2, -ry * .8); g.lineTo(rx * .1, -ry * .3); g.lineTo(-rx * .25, ry * .1); g.lineTo(rx * .2, ry * .5); g.stroke(); }
  if (broken) { g.strokeStyle = OUT; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-rx, -ry * .1); g.lineTo(-rx * .2, ry * .05); g.lineTo(rx * .1, -ry * .3); g.lineTo(rx, -ry * .05); g.stroke(); }
  g.restore();
  dot(g, flat ? 2 : 0, 0, 4.2, id === 'tahtak' ? '#777' : '#ffe08a');
  g.restore();
}
function drawHair(g, look, back) {
  const hc = LOOK.hairC[look.hc], st = look.hair;
  g.fillStyle = hc; g.strokeStyle = OUT; g.lineWidth = 1.8;
  if (back) {
    if (st === 3) { g.beginPath(); g.moveTo(-12, -6); g.quadraticCurveTo(-26, 4, -22, 20); g.quadraticCurveTo(-16, 12, -9, 2); g.closePath(); g.fill(); g.stroke(); }
    if (st === 6) { g.beginPath(); g.moveTo(-14, -8); g.quadraticCurveTo(-20, 10, -14, 24); g.lineTo(-2, 18); g.lineTo(-4, 0); g.closePath(); g.fill(); g.stroke(); }
    if (st === 2) { dot(g, -10, -17, 6.5, hc); }
    return;
  }
  if (st === 0) return;
  g.beginPath();
  if (st === 4) { g.moveTo(-6, -14); g.quadraticCurveTo(-2, -30, 6, -15); g.lineTo(2, -12); g.closePath(); }
  else if (st === 5) { for (let k = 0; k < 6; k++) { const a = Math.PI + .25 + k * .5; g.moveTo(Math.cos(a) * 15 + 4, Math.sin(a) * 15); g.arc(Math.cos(a) * 15, Math.sin(a) * 15 - 1, 5.5, 0, 7); } }
  else { g.moveTo(-15.5, 2); g.quadraticCurveTo(-18, -18, 0, -17.5); g.quadraticCurveTo(13, -17, 16, -6); g.quadraticCurveTo(8, -11, -2, -9); g.quadraticCurveTo(-7, -6, -9, 3); g.closePath(); }
  g.fill(); g.stroke();
}
function drawBeard(g, look) {
  const b = look.beard, hc = LOOK.hairC[look.hc];
  if (!b) return;
  g.fillStyle = hc; g.strokeStyle = OUT; g.lineWidth = 1.6;
  if (b === 1) { g.globalAlpha = .45; g.beginPath(); g.moveTo(-2, 6); g.quadraticCurveTo(6, 17, 15, 8); g.quadraticCurveTo(14, 4, 12, 5); g.quadraticCurveTo(6, 10, -2, 3); g.closePath(); g.fill(); g.globalAlpha = 1; return; }
  g.beginPath();
  if (b === 2) { g.moveTo(8, 9); g.quadraticCurveTo(10, 20, 13, 21); g.quadraticCurveTo(15, 14, 14, 9); g.closePath(); }
  else if (b === 3) { g.moveTo(-6, 2); g.quadraticCurveTo(-4, 20, 8, 22); g.quadraticCurveTo(17, 18, 16, 7); g.quadraticCurveTo(11, 11, 7, 10); g.quadraticCurveTo(0, 10, -3, 1); g.closePath(); }
  else if (b === 4) { g.moveTo(7, 7); g.quadraticCurveTo(4, 12, -2, 13); g.quadraticCurveTo(5, 9, 10, 7.5); g.moveTo(13, 6.5); g.quadraticCurveTo(20, 9, 22, 14); g.quadraticCurveTo(17, 10, 12, 8); }
  else { g.moveTo(-4, 3); g.quadraticCurveTo(-2, 18, 6, 20); g.lineTo(8, 33); g.lineTo(11, 20); g.quadraticCurveTo(17, 15, 15, 7); g.quadraticCurveTo(6, 11, -1, 2); g.closePath(); }
  g.fill(); g.stroke();
}
function drawHelmet(g, id, dur, c2) {
  const h = GEAR[id]; if (!h) return;
  const broken = dur <= 0, mx = h.dur;
  const col = id === 'derib' ? '#8b5a2b' : id === 'tuncm' || id === 'sorguc' ? '#c98a3a' : id === 'tolga' ? '#aab3bd' : '#f0c43f';
  g.save();
  if (broken) { g.translate(-2, -3); g.rotate(-.35); }
  if (id === 'sorguc' && !broken) {
    g.beginPath(); g.moveTo(-14, -14); g.quadraticCurveTo(-4, -36, 14, -22); g.quadraticCurveTo(4, -26, -6, -16); g.closePath();
    g.fillStyle = LOOK.cols[c2] || '#c0392b'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OUT; g.stroke();
  }
  if (id === 'altinmg' && !broken) { g.fillStyle = '#fff6d0'; g.strokeStyle = OUT; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-14, -10); g.quadraticCurveTo(-30, -24, -24, -30); g.quadraticCurveTo(-18, -20, -10, -15); g.closePath(); g.fill(); g.stroke(); }
  g.beginPath();
  if (id === 'tolga') { g.moveTo(-17, 0); g.quadraticCurveTo(-17, -16, -2, -26); g.quadraticCurveTo(4, -22, 17, -6); g.lineTo(17, -1); g.closePath(); }
  else { g.moveTo(-17, 1); g.quadraticCurveTo(-18, -19, 0, -19); g.quadraticCurveTo(17, -19, 17.5, -3); g.lineTo(17.5, -1); g.closePath(); }
  const gr = g.createLinearGradient(0, -24, 0, 2); gr.addColorStop(0, shade(col, .35)); gr.addColorStop(1, shade(col, -.2));
  g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
  if (id === 'derib') { g.strokeStyle = 'rgba(40,20,5,.6)'; g.setLineDash([2, 2]); g.beginPath(); g.moveTo(-15, -3); g.quadraticCurveTo(0, -6, 16, -4); g.stroke(); g.setLineDash([]); }
  if (id !== 'derib' && !broken) {
    g.fillStyle = shade(col, -.1); g.beginPath(); g.moveTo(-17, -1); g.lineTo(-17, 10); g.lineTo(-9, 12); g.lineTo(-8, -1); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(11, -2); g.lineTo(13, 9); g.lineTo(15.5, 9); g.lineTo(16, -2); g.closePath(); g.fill(); g.stroke();
  }
  if (id === 'tolga') { g.fillStyle = '#8a929b'; g.beginPath(); g.moveTo(-2, -26); g.lineTo(0, -33); g.lineTo(1.5, -25); g.fill(); }
  if (dur < mx * .6 || broken) { g.strokeStyle = OUT; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-4, -18); g.lineTo(-1, -12); g.lineTo(-5, -7); g.lineTo(-2, -2); g.stroke(); }
  g.restore();
}
function drawHead(g, F, pose) {
  const look = F.look, skin = LOOK.skin[look.skin];
  const helm = F.gear.h && !(F.dur.h <= 0 && false) ? F.gear.h : null;
  if (!helm || F.dur.h <= 0) drawHair(g, look, true);
  // kulak + kafa
  dot(g, 0, 0, 16.5, skin);
  dot(g, -3, 1, 3.6, shade(skin, -.08));
  // göz
  const br = pose.brow || 0, m = Math.round(pose.mouth || 0);
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(8, -2, 3.4, m === 3 ? 2 : 4, 0, 0, 7); g.fill(); g.lineWidth = 1.2; g.strokeStyle = OUT; g.stroke();
  g.fillStyle = '#1b1210'; g.beginPath(); g.arc(9.2, -1.6, m === 3 ? 1.2 : 1.8, 0, 7); g.fill();
  g.strokeStyle = LOOK.hairC[look.hc] === '#d8d3ca' ? '#9a958c' : LOOK.hairC[look.hc]; g.lineWidth = 2.4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(4.5, -7 + (br > 0 ? -1 : br < 0 ? 1 : 0)); g.lineTo(12, -7 + (br > 0 ? 2 : br < 0 ? -2.5 : 0)); g.stroke();
  // burun ve ağız
  g.fillStyle = shade(skin, -.06); g.beginPath(); g.moveTo(14, -3); g.quadraticCurveTo(20, 3, 14.5, 4.5); g.closePath(); g.fill(); g.lineWidth = 1.4; g.strokeStyle = OUT; g.stroke();
  g.strokeStyle = '#5a2a1a'; g.lineWidth = 1.8;
  if (m === 0) { g.beginPath(); g.moveTo(8.5, 9); g.quadraticCurveTo(11, 10, 13.5, 8.5); g.stroke(); }
  else if (m === 1) { g.beginPath(); g.moveTo(8.5, 9.5); g.lineTo(13.5, 9); g.stroke(); }
  else { g.fillStyle = '#5a1f16'; g.beginPath(); g.ellipse(11.5, 9.5, m === 2 ? 3.2 : 2.4, m === 2 ? 3.4 : 2.6, 0, 0, 7); g.fill(); }
  drawBeard(g, look);
  if (!helm || F.dur.h <= 0) drawHair(g, look, false);
  if (helm) drawHelmet(g, helm, F.dur.h, look.c2);
}
function drawTorso(g, F, hip, neck, lean) {
  const c1 = LOOK.cols[F.look.c1], c2 = LOOK.cols[F.look.c2];
  const nx = Math.cos(lean), ny = Math.sin(lean);
  const P = [[hip[0] - nx * 11.5, hip[1] - ny * 11.5], [neck[0] - nx * 13.5, neck[1] - ny * 13.5 + 2], [neck[0] + nx * 12.5, neck[1] + ny * 12.5 + 2], [hip[0] + nx * 12.5, hip[1] + ny * 12.5]];
  const path = () => { g.beginPath(); g.moveTo(P[0][0], P[0][1]); g.quadraticCurveTo(P[1][0] - nx * 3, P[1][1] - 6, P[1][0] + nx * 4, P[1][1] - 3); g.lineTo(P[2][0] - nx * 4, P[2][1] - 3); g.quadraticCurveTo(P[2][0] + nx * 3, P[2][1] - 6, P[3][0], P[3][1]); g.closePath(); };
  path(); g.fillStyle = c1; g.fill(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke();
  const a = F.gear.a, dur = F.dur.a;
  g.save(); path(); g.clip();
  // gömlek kıvrımı
  g.strokeStyle = shade(c1, -.25); g.lineWidth = 1.5; g.beginPath(); g.moveTo(neck[0] - nx * 4, neck[1] + 4); g.lineTo(hip[0] + nx * 2, hip[1] - 10); g.stroke();
  if (a) {
    const broken = dur <= 0, mx = GEAR[a].dur;
    const top = [lerp(hip[0], neck[0], .95), lerp(hip[1], neck[1], .95)];
    const cov = a === 'deriy' ? .82 : .95;
    const col = a === 'deriy' ? '#8b5a2b' : a === 'zincir' ? '#9aa1a9' : a === 'pullu' ? '#7f8a6a' : a === 'lamel' ? '#7d858f' : '#f0c43f';
    g.globalAlpha = broken ? .55 : 1;
    g.beginPath(); g.moveTo(hip[0] - nx * 14, hip[1] - ny * 14 + 2);
    g.lineTo(lerp(hip[0], neck[0], cov) - nx * 16, lerp(hip[1], neck[1], cov) - ny * 16); g.lineTo(lerp(hip[0], neck[0], cov) + nx * 16, lerp(hip[1], neck[1], cov) + ny * 16);
    g.lineTo(hip[0] + nx * 14, hip[1] + ny * 14 + 2); g.closePath();
    const gr = g.createLinearGradient(hip[0] - 14, 0, hip[0] + 14, 0); gr.addColorStop(0, shade(col, -.2)); gr.addColorStop(.6, shade(col, .2)); gr.addColorStop(1, shade(col, -.1));
    g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(30,15,5,.45)'; g.lineWidth = 1.1;
    const span = (f) => [lerp(hip[0], top[0], f), lerp(hip[1], top[1], f)];
    if (a === 'deriy') { g.setLineDash([2.5, 2]); for (const f of [.25, .6]) { const p = span(f); g.beginPath(); g.moveTo(p[0] - nx * 14, p[1] - ny * 14); g.lineTo(p[0] + nx * 14, p[1] + ny * 14); g.stroke(); } g.setLineDash([]); }
    else if (a === 'zincir') { g.fillStyle = 'rgba(40,45,50,.45)'; for (let f = .05; f < .95; f += .1) for (let q = -12; q <= 12; q += 4) { const p = span(f); g.beginPath(); g.arc(p[0] + nx * q, p[1] + ny * q, 1.1, 0, 7); g.fill(); } }
    else if (a === 'pullu' || a === 'altinz') { for (let f = .08; f < .95; f += .14) for (let q = -12; q <= 12; q += 6) { const p = span(f); g.beginPath(); g.arc(p[0] + nx * (q + (Math.round(f * 7) % 2) * 3), p[1] + ny * q, 3.2, 0, Math.PI); g.stroke(); } }
    else if (a === 'lamel') { for (let f = .05; f < .95; f += .15) { const p = span(f); g.beginPath(); g.moveTo(p[0] - nx * 15, p[1] - ny * 15); g.lineTo(p[0] + nx * 15, p[1] + ny * 15); g.stroke(); for (let q = -10; q <= 10; q += 5) { g.beginPath(); g.moveTo(p[0] + nx * q, p[1] + ny * q); g.lineTo(p[0] + nx * q + Math.sin(lean) * 6, p[1] + ny * q - Math.cos(lean) * 6); g.stroke(); } } }
    if (a === 'altinz') { g.strokeStyle = 'rgba(120,70,0,.5)'; g.lineWidth = 1.6; const p = span(.55); g.beginPath(); g.arc(p[0] - nx * 4, p[1], 5, .2, 2.9); g.stroke(); g.beginPath(); g.arc(p[0] + nx * 6, p[1], 5, .2, 2.9); g.stroke(); }
    if (dur < mx * .6) { g.fillStyle = 'rgba(20,10,0,.35)'; const p = span(.45); g.beginPath(); g.arc(p[0] + nx * 5, p[1], 2.6, 0, 7); g.fill(); g.beginPath(); g.arc(p[0] - nx * 6, p[1] - 8, 2, 0, 7); g.fill(); }
    if (broken) { g.globalAlpha = 1; g.strokeStyle = OUT; g.lineWidth = 2; const p = span(.3), q = span(.8); g.beginPath(); g.moveTo(p[0] - nx * 12, p[1]); g.lineTo(p[0], p[1] - 6); g.lineTo(q[0] - nx * 3, q[1]); g.lineTo(q[0] + nx * 10, q[1] - 4); g.stroke(); }
    g.globalAlpha = 1;
  }
  g.restore();
  // kemer
  const bx = lerp(hip[0], neck[0], .12), by = lerp(hip[1], neck[1], .12);
  limb(g, [[bx - nx * 12.5, by - ny * 12.5], [bx + nx * 12.5, by + ny * 12.5]], 4.2, shade(c2, -.15));
  dot(g, bx + nx * 3, by + ny * 3, 2.6, '#e8c45a');
}
function drawSkirt(g, F, hip, lean) {
  const c2 = LOOK.cols[F.look.c2];
  const nx = Math.cos(lean), ny = Math.sin(lean);
  g.save(); g.translate(hip[0], hip[1]); g.rotate(lean * .4);
  for (let k = -2; k <= 2; k++) {
    const x = k * 5.2;
    g.beginPath(); g.moveTo(x - 2.8, -2); g.lineTo(x + 2.8, -2); g.lineTo(x + 3.2 + k * .6, 17); g.lineTo(x - 3.2 + k * .6, 17); g.closePath();
    g.fillStyle = k % 2 ? shade(c2, -.12) : c2; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke();
  }
  g.restore();
  void nx; void ny;
}
function drawBoot(g, F, knee, foot, ang, near) {
  const skin = LOOK.skin[F.look.skin], b = F.gear.b;
  const fx = foot[0], fy = foot[1];
  if (b === 'tuncd' || b === 'celikd') {
    const col = b === 'tuncd' ? '#c98a3a' : '#b4bcc6';
    limb(g, [[lerp(knee[0], fx, .1), lerp(knee[1], fy, .1)], [lerp(knee[0], fx, .78), lerp(knee[1], fy, .78)]], 9.5, F.dur.b > 0 ? col : shade(col, -.35));
  }
  const col = !b ? skin : b === 'carik' ? '#a8733d' : b === 'cizme' ? '#5b3a1e' : '#3e2a1a';
  g.save(); g.translate(fx, fy); g.rotate(-ang * .3);
  g.beginPath(); g.moveTo(-5, -6); g.quadraticCurveTo(-6, 2, -3, 3); g.lineTo(12, 3); g.quadraticCurveTo(13, -2, 6, -3); g.lineTo(4, -8); g.closePath();
  g.fillStyle = col; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
  if (b === 'carik' || !b) { g.strokeStyle = b ? '#5b3a1e' : shade(skin, -.2); g.lineWidth = 1.3; g.beginPath(); g.moveTo(-3, -4); g.lineTo(5, -1); g.moveTo(0, -7); g.lineTo(7, -3); g.stroke(); }
  g.restore();
  void near;
}
// Bir dövüşçüyü (F: look, gear, dur) poz ile çizer. (x, y) = ayakların ortası, k = ölçek, dir = bakış (+1 sağ)
function drawFighter(g, F, x, y, k, dir, pose, opt = {}) {
  pose = Object.assign({}, POSE0, pose);
  const skin = LOOK.skin[F.look.skin], c1 = LOOK.cols[F.look.c1];
  const w = GEAR[F.gear.w] || GEAR.sopa;
  g.save(); g.translate(x, y); g.scale(k * dir, k);
  // gölge
  g.save(); g.scale(1, .25); g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, 0, 30 + Math.abs(pose.rot) * 30, 18, 0, 0, 7); g.fill(); g.restore();
  if (pose.rot) { g.translate(-14, -2); g.rotate(pose.rot); g.translate(14, 2); }
  const TH = 30, SH = 30, TO = 44, UA = 24, FA = 22;
  const hipH = Math.max(Math.cos(pose.ft) * TH + Math.cos(pose.fs) * SH, Math.cos(pose.bt) * TH + Math.cos(pose.bs) * SH);
  const hip = [pose.x, -hipH + pose.y];
  const neck = [hip[0] + Math.sin(pose.lean) * TO, hip[1] - Math.cos(pose.lean) * TO];
  const headC = [neck[0] + Math.sin(pose.lean + pose.head) * 14, neck[1] - Math.cos(pose.lean + pose.head) * 14];
  const shF = [neck[0] + 2, neck[1] + 5], shB = [neck[0] - 3, neck[1] + 4];
  const kneeB = pt(hip[0] - 3, hip[1], pose.bt, TH), footB = pt(kneeB[0], kneeB[1], pose.bs, SH);
  const kneeF = pt(hip[0] + 3, hip[1], pose.ft, TH), footF = pt(kneeF[0], kneeF[1], pose.fs, SH);
  const elB = pt(shB[0], shB[1], pose.bu, UA), haB = pt(elB[0], elB[1], pose.bl, FA);
  const elF = pt(shF[0], shF[1], pose.fu, UA), haF = pt(elF[0], elF[1], pose.fl, FA);
  const legCol = shade(skin, -.12), armB = shade(skin, -.14);
  // arka bacak + arka kol
  limb(g, [[hip[0] - 3, hip[1]], kneeB, footB], 10, legCol); drawBoot(g, F, kneeB, footB, pose.bs, false);
  const offhand = w.kind === 'hancer';
  limb(g, [shB, elB, haB], 8.5, armB);
  if (F.gear.s && !w.two) { /* kalkan kolun önünde çizilecek */ } else dot(g, haB[0], haB[1], 4.8, armB);
  if (offhand) drawWeapon(g, w, haB[0], haB[1], pose.bl + .5, opt.glow);
  // ön bacak
  limb(g, [[hip[0] + 3, hip[1]], kneeF, footF], 10.5, skin); drawBoot(g, F, kneeF, footF, pose.fs, true);
  drawTorso(g, F, hip, neck, pose.lean);
  drawSkirt(g, F, hip, pose.lean);
  // kafa
  g.save(); g.translate(headC[0], headC[1]); g.rotate(pose.lean * .5 + pose.head * .6); drawHead(g, F, pose); g.restore();
  // kalkan
  if (F.gear.s && !w.two) drawShield(g, F.gear.s, haB[0], haB[1], F.dur.s, c1, F.look.c2, pose.bu < 1);
  // ön kol + silah
  const sleeve = shade(c1, -.05);
  limb(g, [shF, elF], 9.5, skin); limb(g, [elF, haF], 8.5, skin);
  g.beginPath(); g.arc(shF[0], shF[1], 6.5, 0, 7); g.fillStyle = sleeve; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
  if (F.gear.a === 'lamel' || F.gear.a === 'altinz' || F.gear.a === 'pullu') { g.beginPath(); g.ellipse(shF[0] - 1, shF[1] - 1, 9, 6, -.4, 0, 7); g.fillStyle = F.gear.a === 'altinz' ? '#f0c43f' : '#8f99a3'; g.fill(); g.stroke(); }
  if (opt.trail) {
    g.save(); g.globalAlpha = .45 * opt.trail.a; g.strokeStyle = opt.trail.col || '#fff'; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); g.arc(shF[0], shF[1], 50, Math.PI / 2 - opt.trail.from, Math.PI / 2 - opt.trail.to, opt.trail.from < opt.trail.to); g.stroke(); g.restore();
  }
  if (!opt.noWeapon) drawWeapon(g, w, haF[0], haF[1], pose.fl + pose.wa, opt.glow);
  dot(g, haF[0], haF[1], 5, skin);
  if (opt.fx) {
    if (opt.fx.burn) { for (let q = 0; q < 3; q++) { const t = (opt.time / 160 + q * 2.1); g.fillStyle = `rgba(255,${120 + q * 40},0,.7)`; g.beginPath(); g.ellipse(-8 + q * 8, hip[1] - 20 - (t % 1) * 30, 5, 9, 0, 0, 7); g.fill(); } }
    if (opt.fx.blind) { g.fillStyle = 'rgba(200,200,210,.55)'; for (let q = 0; q < 4; q++) { g.beginPath(); g.arc(headC[0] - 12 + q * 8 + Math.sin(opt.time / 300 + q) * 3, headC[1] - 4 + Math.cos(opt.time / 260 + q) * 4, 9, 0, 7); g.fill(); } }
    if (opt.fx.shaken) { g.font = '700 14px sans-serif'; g.textAlign = 'center'; g.fillText('💫', headC[0], headC[1] - 26 + Math.sin(opt.time / 200) * 2); }
  }
  g.restore();
  return { head: [x + headC[0] * k * dir, y + headC[1] * k], hand: [x + haF[0] * k * dir, y + haF[1] * k], chest: [x + lerp(hip[0], neck[0], .5) * k * dir, y + lerp(hip[1], neck[1], .5) * k] };
}

/* ------------------------------------------------------------------ çizim: arenalar */
const SCENE = {
  koy: { sky: ['#7ec8f2', '#cfeefc'], floor: ['#c99a5d', '#a97b45'], stand: '#8b5a2b', standD: '#5e3b1a', flag: ['#c8372d', '#f2e6c9'] },
  carsi: { sky: ['#f29a4a', '#ffd9a0'], floor: ['#e6c07a', '#c99a55'], stand: '#c9a27a', standD: '#8a6a4a', flag: ['#15a3a3', '#f2c94c'] },
  liman: { sky: ['#8fd3f4', '#e2f6ff'], floor: ['#9a6a3e', '#7a4f2a'], stand: '#6e4a2c', standD: '#4a311b', flag: ['#2f6fd6', '#ffffff'] },
  kale: { sky: ['#7d8fa8', '#c9d3df'], floor: ['#a39a8a', '#857c6c'], stand: '#8d8a84', standD: '#5d5a55', flag: ['#7a1f2b', '#e2b33c'] },
  imp: { sky: ['#3a1d5c', '#e9935b'], floor: ['#e8c88a', '#c7a160'], stand: '#efe6d6', standD: '#b9ab94', flag: ['#8e1f2b', '#f2c94c'] }
};
function drawBackdrop(g, W, H, arena, gy) {
  const S = SCENE[arena] || SCENE.koy, r = mulberry32(arena.length * 99 + 7);
  let gr = g.createLinearGradient(0, 0, 0, gy); gr.addColorStop(0, S.sky[0]); gr.addColorStop(1, S.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, W, gy + 2);
  const hz = gy - H * .44;           // tribün üst çizgisi
  // uzak manzara
  if (arena === 'koy') {
    g.fillStyle = '#fff8'; for (let i = 0; i < 4; i++) { const x = r() * W, y = H * .08 + r() * H * .1; g.beginPath(); g.ellipse(x, y, 40, 12, 0, 0, 7); g.ellipse(x + 25, y - 6, 26, 12, 0, 0, 7); g.fill(); }
    g.fillStyle = '#7fbf5f'; g.beginPath(); g.moveTo(0, hz + 20); for (let x = 0; x <= W; x += 40) g.lineTo(x, hz - 10 - Math.sin(x / 90) * 18 - r() * 6); g.lineTo(W, hz + 30); g.lineTo(0, hz + 30); g.fill();
    for (let i = 0; i < 5; i++) { const x = W * (.08 + i * .21) + r() * 20, y = hz - 4; g.fillStyle = '#f2e6c9'; g.fillRect(x, y - 18, 26, 18); g.fillStyle = '#c0473a'; g.beginPath(); g.moveTo(x - 4, y - 18); g.lineTo(x + 13, y - 31); g.lineTo(x + 30, y - 18); g.fill(); g.fillStyle = '#6b4a2b'; g.fillRect(x + 10, y - 9, 6, 9); }
    for (let i = 0; i < 6; i++) { const x = r() * W, y = hz - 8; g.fillStyle = '#6b4a2b'; g.fillRect(x - 2, y - 14, 4, 14); g.fillStyle = '#3f8f3a'; g.beginPath(); g.arc(x, y - 22, 12, 0, 7); g.fill(); }
  } else if (arena === 'carsi') {
    g.fillStyle = '#fff3'; g.beginPath(); g.arc(W * .8, H * .14, H * .07, 0, 7); g.fill();
    g.fillStyle = '#b8743f';
    for (let i = 0; i < 7; i++) { const x = W * (i / 6), w = 40 + r() * 40, h = 30 + r() * 40; g.fillRect(x - w / 2, hz - h, w, h + 10); if (r() < .6) { g.beginPath(); g.arc(x, hz - h, w * .35, Math.PI, 0); g.fill(); } }
    g.fillStyle = '#a5643a'; g.fillRect(W * .62, hz - 95, 9, 95); g.beginPath(); g.moveTo(W * .62 - 3, hz - 95); g.lineTo(W * .62 + 4.5, hz - 112); g.lineTo(W * .62 + 12, hz - 95); g.fill();
    for (let i = 0; i < 6; i++) { const x = W * (i / 5) - 30, y = hz - 6; const cols = ['#c8372d', '#15a3a3', '#e67e22', '#8e44ad']; for (let s = 0; s < 6; s++) { g.fillStyle = s % 2 ? '#f6ecd8' : cols[i % 4]; g.beginPath(); g.moveTo(x + s * 10, y - 16); g.lineTo(x + s * 10 + 10, y - 16); g.lineTo(x + s * 11 + 11, y); g.lineTo(x + s * 11, y); g.fill(); } }
  } else if (arena === 'liman') {
    g.fillStyle = '#3d8fc4'; g.fillRect(0, hz - 30, W, 40);
    g.strokeStyle = '#ffffff66'; g.lineWidth = 1.5; for (let i = 0; i < 18; i++) { const x = r() * W, y = hz - 25 + r() * 30; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y - 3, x + 12, y); g.stroke(); }
    for (let i = 0; i < 3; i++) { const x = W * (.15 + i * .33) + r() * 30, y = hz - 26; g.fillStyle = '#6b4226'; g.beginPath(); g.moveTo(x - 34, y); g.lineTo(x + 34, y); g.lineTo(x + 26, y + 12); g.lineTo(x - 26, y + 12); g.fill(); g.fillRect(x - 1.5, y - 70, 3, 70); g.fillStyle = '#f6f0e0'; g.beginPath(); g.moveTo(x + 2, y - 66); g.quadraticCurveTo(x + 30, y - 40, x + 2, y - 10); g.fill(); g.beginPath(); g.moveTo(x - 2, y - 60); g.quadraticCurveTo(x - 22, y - 38, x - 2, y - 16); g.fill(); }
    g.strokeStyle = '#333a'; g.lineWidth = 1.6; for (let i = 0; i < 4; i++) { const x = r() * W, y = H * .1 + r() * H * .15; g.beginPath(); g.moveTo(x - 7, y); g.quadraticCurveTo(x - 3, y - 4, x, y); g.quadraticCurveTo(x + 3, y - 4, x + 7, y); g.stroke(); }
  } else if (arena === 'kale') {
    g.fillStyle = '#ffffff55'; for (let i = 0; i < 5; i++) { const x = r() * W, y = H * .06 + r() * H * .12; g.beginPath(); g.ellipse(x, y, 50, 14, 0, 0, 7); g.fill(); }
    g.fillStyle = '#7b7770'; g.fillRect(0, hz - 50, W, 60);
    for (let x = 0; x < W; x += 22) g.fillRect(x, hz - 62, 13, 14);
    for (const tx of [W * .12, W * .88]) { g.fillStyle = '#6f6b64'; g.fillRect(tx - 22, hz - 105, 44, 110); for (let q = -22; q < 22; q += 12) g.fillRect(tx + q, hz - 117, 8, 13); g.fillStyle = '#2b2622'; g.beginPath(); g.arc(tx, hz - 70, 6, Math.PI, 0); g.fillRect(tx - 6, hz - 70, 12, 14); g.fill(); g.fillStyle = '#5a5650'; g.fillRect(tx - 1, hz - 140, 2, 24); g.fillStyle = S.flag[0]; g.beginPath(); g.moveTo(tx + 1, hz - 140); g.lineTo(tx + 22, hz - 133); g.lineTo(tx + 1, hz - 126); g.fill(); }
    g.strokeStyle = 'rgba(40,36,32,.35)'; g.lineWidth = 1; for (let y = hz - 44; y < hz + 8; y += 10) for (let x = (y / 10 % 2) * 12; x < W; x += 24) g.strokeRect(x, y, 24, 10);
  } else if (arena === 'imp') {
    g.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) { g.globalAlpha = r() * .7; g.fillRect(r() * W, r() * H * .25, 1.6, 1.6); } g.globalAlpha = 1;
    g.fillStyle = '#ffe2a0'; g.beginPath(); g.arc(W * .18, H * .13, H * .05, 0, 7); g.fill();
    g.fillStyle = '#d9cdb8'; g.fillRect(0, hz - 72, W, 82);
    g.fillStyle = '#7d5f4a';
    for (let row = 0; row < 2; row++) for (let x = 14; x < W; x += 38) { const y = hz - 66 + row * 36; g.beginPath(); g.moveTo(x, y + 30); g.lineTo(x, y + 12); g.arc(x + 10, y + 12, 10, Math.PI, 0); g.lineTo(x + 20, y + 30); g.fill(); }
    g.fillStyle = '#c9b89b'; g.fillRect(0, hz - 74, W, 5); g.fillRect(0, hz - 38, W, 4);
  }
  // tribün (oturma sıraları)
  const top = hz + 2;
  g.fillStyle = S.standD; g.fillRect(0, top, W, gy - top);
  const rows = 4, rh = (gy - top - H * .05) / rows;
  for (let i = 0; i < rows; i++) { g.fillStyle = i % 2 ? S.stand : shade(S.stand, -.08); g.fillRect(0, top + i * rh + rh * .62, W, rh * .38); }
  // arena duvarı
  const wallH = H * .07;
  gr = g.createLinearGradient(0, gy - wallH, 0, gy); gr.addColorStop(0, shade(S.standD, .15)); gr.addColorStop(1, shade(S.standD, -.25));
  g.fillStyle = gr; g.fillRect(0, gy - wallH, W, wallH);
  g.fillStyle = shade(S.stand, .2); g.fillRect(0, gy - wallH - 3, W, 4);
  // flamalar
  for (let i = 0; i < 7; i++) { const x = W * (i + .5) / 7; g.fillStyle = S.flag[i % 2]; g.beginPath(); g.moveTo(x - 10, gy - wallH); g.lineTo(x + 10, gy - wallH); g.lineTo(x + 10, gy - wallH * .2); g.lineTo(x, gy - wallH * .45); g.lineTo(x - 10, gy - wallH * .2); g.fill(); g.strokeStyle = '#0004'; g.lineWidth = 1; g.stroke(); }
  // zemin
  gr = g.createLinearGradient(0, gy, 0, H); gr.addColorStop(0, S.floor[0]); gr.addColorStop(1, S.floor[1]); g.fillStyle = gr; g.fillRect(0, gy, W, H - gy);
  if (arena === 'liman') { g.strokeStyle = 'rgba(40,20,5,.45)'; g.lineWidth = 1.5; for (let y = gy + 6; y < H; y += 9) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } }
  else if (arena === 'kale') { g.strokeStyle = 'rgba(50,45,40,.3)'; g.lineWidth = 1; for (let y = gy + 4; y < H; y += 10) for (let x = ((y / 10) % 2) * 15; x < W; x += 30) g.strokeRect(x, y, 30, 10); }
  else { g.fillStyle = 'rgba(80,50,20,.18)'; for (let i = 0; i < 160; i++) g.fillRect(r() * W, gy + r() * (H - gy), 2, 1.4); }
  return { top, rows, rh };
}
function makeCrowd(W, H, arena, top, rows, rh) {
  const r = mulberry32(arena.length * 13 + Math.round(W));
  const out = [];
  const shirts = ['#c8372d', '#2f6fd6', '#2a9d5c', '#8e44ad', '#e67e22', '#15a3a3', '#d9b018', '#e84393', '#eee8da', '#6b4a2b'];
  for (let i = 0; i < rows; i++) {
    const y = top + i * rh + rh * .62, step = Math.max(11, rh * .75);
    for (let x = r() * step; x < W; x += step * (.8 + r() * .5)) {
      if (r() < .1) continue;
      out.push({ x, y, s: rh * .32, sh: shirts[Math.floor(r() * shirts.length)], sk: LOOK.skin[Math.floor(r() * 6)], hc: LOOK.hairC[Math.floor(r() * 6)], ph: r() * 6.28, sp: 4 + r() * 4, hat: r() < .15 });
    }
  }
  return out;
}
function drawCrowd(g, crowd, t, ex) {
  for (const c of crowd) {
    const jump = Math.max(0, Math.sin(t / 1000 * c.sp + c.ph)) * c.s * (.15 + ex * 1.1);
    const y = c.y - jump, s = c.s;
    g.fillStyle = c.sh; g.beginPath(); g.ellipse(c.x, y - s * .2, s * .75, s * .9, 0, Math.PI, 0); g.fill();
    if (ex > .45) { g.strokeStyle = c.sk; g.lineWidth = Math.max(1.5, s * .28); g.lineCap = 'round'; const wv = Math.sin(t / 150 + c.ph) * s * .3; g.beginPath(); g.moveTo(c.x - s * .55, y - s * .6); g.lineTo(c.x - s * .8 + wv, y - s * 1.7); g.moveTo(c.x + s * .55, y - s * .6); g.lineTo(c.x + s * .8 - wv, y - s * 1.7); g.stroke(); }
    g.fillStyle = c.sk; g.beginPath(); g.arc(c.x, y - s * 1.25, s * .5, 0, 7); g.fill();
    g.fillStyle = c.hat ? '#c8372d' : c.hc; g.beginPath(); g.arc(c.x, y - s * 1.35, s * .5, Math.PI * 1.05, Math.PI * 1.95); g.fill();
  }
}
function drawLion(g, x, y, k, dir, t) {
  g.save(); g.translate(x, y); g.scale(k * dir, k);
  const run = Math.sin(t / 60);
  g.fillStyle = '#d9a441'; g.strokeStyle = OUT; g.lineWidth = 2;
  [[-24, 1], [-14, -1], [14, 1], [24, -1]].forEach(([lx, ph]) => { g.beginPath(); g.moveTo(lx, -22); g.lineTo(lx + run * 8 * ph, -2); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 4.5; g.strokeStyle = '#d9a441'; g.stroke(); });
  g.lineWidth = 2; g.strokeStyle = OUT;
  g.beginPath(); g.ellipse(0, -30, 32, 15, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-30, -32); g.quadraticCurveTo(-48, -42 + run * 5, -44, -52); g.stroke(); dot(g, -44, -53, 4, '#8a4f1d');
  g.fillStyle = '#9a5a1f'; g.beginPath(); for (let a = 0; a < 7; a += .5) g.lineTo(30 + Math.cos(a) * 19, -40 + Math.sin(a) * 19); g.closePath(); g.fill(); g.stroke();
  dot(g, 34, -40, 11, '#e2b25a');
  g.fillStyle = '#1b1210'; g.beginPath(); g.arc(39, -43, 2, 0, 7); g.fill();
  g.fillStyle = '#5a1f16'; g.beginPath(); g.moveTo(38, -34); g.lineTo(46, -36); g.lineTo(44, -31); g.fill();
  g.restore();
}
function drawBrazier(g, x, y, k, t) {
  g.save(); g.translate(x, y); g.scale(k, k);
  g.fillStyle = '#5b4636'; g.fillRect(-3, -26, 6, 26); g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(-3, -26, 6, 26);
  g.beginPath(); g.moveTo(-14, -34); g.lineTo(14, -34); g.lineTo(9, -24); g.lineTo(-9, -24); g.closePath(); g.fillStyle = '#7a5a40'; g.fill(); g.stroke();
  for (let i = 0; i < 4; i++) { const f = (t / 140 + i * .6) % 1; g.fillStyle = `rgba(255,${150 + i * 25},40,${.85 - f * .6})`; g.beginPath(); g.ellipse(-6 + i * 4, -38 - f * 18, 5 - f * 3, 9 - f * 4, 0, 0, 7); g.fill(); }
  g.restore();
}

/* ------------------------------------------------------------------ arayüz durumu */
let root = null, ui = null, V = null, cv = null, cg = null, stageEl = null, raf = 0, ro = null, hudEl = null, panelEl = null;
let SW = 0, SH = 0, DPR = 1, bg = null, bgKey = '', crowd = [], lastFrame = 0;
const cam = { c: 5, span: 8, init: false };
const AP = { q: [], cur: null, t0: 0, lastK: -1, fid: null, ev: [] };
let actors = [mkActor(0), mkActor(1)], parts = [], floats = [], shakeMag = 0, flashA = 0, flashCol = '#fff', crowdBoost = 0, slowA = 0;
let hud = null, coinsDone = '', timing = null, aimMark = null, calloutT = 0;
const L = { create: null, draft: {}, tab: 'arena', shop: 'w', selArena: null, selOpp: null, tryOn: null, curtain: -1, betAmt: 25, key: '', hudKey: '' };
function mkActor(i) { return { i, wx: i ? 7 : 2, guard: false, rest: false, ko: false }; }
const q = s => root && root.querySelector(s);
const SFX_ON = () => Sound && Sound.ctx && Sound.ok;
function sfx(name) {
  try {
    if (!SFX_ON() || !Sound.ok('ar_' + name, 45)) return;
    const N = (d, o) => Sound.noise(d, o), T = (f, d, o) => Sound.tone(f, d, o);
    switch (name) {
      case 'swing': N(.2, { filter: 'bandpass', freq: 1300, q: .7, gain: .22, decayPow: 1.4 }); break;
      case 'hit': N(.16, { filter: 'lowpass', freq: 520, gain: .65, decayPow: 2 }); T(120, .14, { type: 'square', gain: .1, slide: 60 }); break;
      case 'heavy': N(.4, { filter: 'lowpass', freq: 320, gain: .85, decayPow: 1.5 }); T(85, .32, { type: 'sawtooth', gain: .14, slide: 40 }); break;
      case 'clang': T(1240, .22, { type: 'square', gain: .05 }); T(1860, .32, { type: 'triangle', gain: .08, when: .01 }); N(.1, { freq: 5200, q: 3, gain: .22 }); break;
      case 'crowd': N(1.1, { filter: 'bandpass', freq: 750, q: .5, gain: .2, decayPow: .8 }); N(.9, { filter: 'bandpass', freq: 1600, q: .7, gain: .08, decayPow: .9, when: .05 }); break;
      case 'roar': N(1.8, { filter: 'bandpass', freq: 650, q: .4, gain: .32, decayPow: .7 }); N(1.5, { filter: 'bandpass', freq: 1400, q: .6, gain: .14, decayPow: .8, when: .08 }); break;
      case 'step': N(.05, { filter: 'lowpass', freq: 900, gain: .16 }); break;
      case 'boom': N(.55, { filter: 'lowpass', freq: 420, gain: .75, decayPow: 1.2 }); break;
      case 'splat': N(.14, { filter: 'bandpass', freq: 650, q: 2, gain: .45 }); break;
      case 'lion': T(150, .8, { type: 'sawtooth', gain: .14, slide: 70 }); N(.8, { filter: 'lowpass', freq: 520, gain: .4, decayPow: 1 }); break;
      case 'drink': [0, .09, .18].forEach(w => T(420 + w * 900, .07, { type: 'sine', gain: .12, when: w })); break;
      case 'boo': T(180, .6, { type: 'sawtooth', gain: .06, slide: 140 }); N(.6, { filter: 'lowpass', freq: 400, gain: .15, decayPow: .8 }); break;
      default:
    }
  } catch { /* ses yok */ }
}

/* ------------------------------------------------------------------ sahne boyutu */
function resize() {
  if (!stageEl || !cv) return;
  const r = stageEl.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return;
  SW = r.width; SH = r.height; DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(SW * DPR); cv.height = Math.round(SH * DPR);
  bgKey = '';
}
const GY = () => SH * .87;
function ensureBg(arena) {
  const key = `${arena}|${Math.round(SW)}|${Math.round(SH)}|${DPR}`;
  if (key === bgKey && bg) return;
  bgKey = key; bg = document.createElement('canvas'); bg.width = Math.round(SW * DPR); bg.height = Math.round(SH * DPR);
  const g = bg.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0);
  const info = drawBackdrop(g, SW, SH, arena, GY() - SH * .075);
  crowd = makeCrowd(SW, SH, arena, info.top, info.rows, info.rh);
}

/* ------------------------------------------------------------------ sahne içeriği */
function fakeF(b, side) { return makeFighter(b, side, {}); }
function draftOf(pi) { return L.draft[pi]; }
function sceneSpec() {
  const v = V; if (!v) return null;
  if (v.fight && ['fight', 'boutover', 'inter', 'post', 'done'].includes(v.phase) && !(v.phase === 'done' && v.mode === 'kariyer' && !v.post)) return { arena: v.fight.arena, live: true };
  if (v.mode === 'kariyer') {
    if (v.phase === 'create' && L.create) return { arena: 'koy', solo: fakeF({ name: L.create.name, look: L.create.look, S: L.create.S, gear: { w: 'sopa' } }, 0) };
    const c = v.car; if (!c) return { arena: 'koy' };
    const ar = L.selArena != null ? Math.min(L.selArena, c.arena) : c.arena;
    const gear = Object.assign({}, c.gear);
    if (L.tryOn && GEAR[L.tryOn]) { const g = GEAR[L.tryOn]; gear[g.slot] = L.tryOn; if (g.slot === 'w' && g.two) gear.s = null; if (g.slot === 's' && GEAR[gear.w].two) gear.w = 'sopa'; }
    const hero = fakeF({ name: c.name, look: c.look, S: c.S, gear, dur: L.tryOn ? {} : c.dur }, 0);
    if (L.tab === 'shop' || L.tab === 'hero') return { arena: ARENAS[ar].id, solo: hero };
    const oi = L.selOpp != null ? L.selOpp : Math.min(5, c.prog[ar]);
    const o = c.legend && L.selOpp === 6 ? legendOpp(c, c.lwins) : oppDef(ar, Math.min(oi, 5));
    return { arena: ARENAS[ar].id, pair: [hero, fakeF(o, 1)] };
  }
  if (v.phase === 'draft') {
    const me = draftPi(); const d = me != null ? draftOf(me) : null;
    if (d && (v.me !== 'all' || L.curtain === me)) return { arena: ARENA_IX[v.arenaOpt] != null ? v.arenaOpt : 'koy', solo: fakeF(Object.assign({ name: '' }, d), 0) };
    return { arena: ARENA_IX[v.arenaOpt] != null ? v.arenaOpt : 'koy' };
  }
  if (v.match && v.ents) {
    const A0 = v.ents[v.match.a], B = v.ents[v.match.b];
    if (A0.build && B.build) return { arena: v.match.arena, pair: [fakeF(A0.build, 0), fakeF(B.build, 1)] };
    return { arena: v.match.arena };
  }
  return { arena: 'koy' };
}

/* ------------------------------------------------------------------ animasyon oynatıcı */
function syncFight(v) {
  const fi = v.fight;
  if (!fi) { AP.fid = null; AP.q = []; AP.cur = null; return; }
  const fid = fi.id;
  if (AP.fid !== fid) {
    AP.fid = fid; AP.q = []; AP.cur = null; AP.lastK = fi.anim ? fi.anim.k : 0;
    fi.f.forEach((F, i) => { Object.assign(actors[i], { wx: F.pos, guard: F.guard, rest: F.rest, ko: F.ko }); });
    hud = snapOf(fi); cam.init = false; coinsDone = '';
    return;
  }
  if (fi.anim && fi.anim.k > AP.lastK) {
    if (fi.anim.k === AP.lastK + 1 && AP.q.length < 4) AP.q.push(fi.anim.steps.map(s => Object.assign({}, s)));
    else { AP.q = []; AP.cur = null; fi.f.forEach((F, i) => Object.assign(actors[i], { wx: F.pos, guard: F.guard, rest: F.rest, ko: F.ko })); hud = snapOf(fi); }
    AP.lastK = fi.anim.k;
  }
}
function apIdle() { return !AP.cur && !AP.q.length; }
function apNext(now) {
  while (!AP.cur && AP.q.length) {
    const grp = AP.q[0];
    if (!grp.length) { AP.q.shift(); continue; }
    AP.cur = grp.shift(); AP.t0 = now; AP.dur = stepDur(AP.cur) * TUNE.speed; AP.ev = buildEvents(AP.cur);
    if (!grp.length) AP.q.shift();
  }
}
function apFinish() {
  const st = AP.cur; if (!st) return;
  AP.ev.forEach(e => { if (!e.done) { e.done = true; try { e.fn(); } catch (err) { console.error(err); } } });
  if (st.after) { hud = st.after; actors.forEach((a, i) => { a.wx = st.after.pos[i]; }); }
  if (st.k === 'guard') actors[st.s].guard = true;
  if (st.k === 'rest') actors[st.s].rest = true;
  if (['move', 'atk', 'taunt', 'item'].includes(st.k) && st.s != null) { actors[st.s].guard = false; actors[st.s].rest = false; }
  if (st.k === 'atk' && st.kind !== 'hizli' && st.kind !== 'normal') { if (st.hits.some(h => h.res === 'block')) actors[1 - st.s].guard = false; }
  if (st.k === 'ko') actors[st.s].ko = true;
  AP.cur = null;
  if (apIdle() && V && V.fight) V.fight.f.forEach((F, i) => { Object.assign(actors[i], { wx: F.pos, guard: F.guard, rest: F.rest, ko: F.ko }); hud = snapOf(V.fight); });
}
const sx = wx => SW / 2 + (wx + .5 - cam.c) * (SW / cam.span);
function charK() { const ts = SW / cam.span; return Math.min(SH * .58, ts * 2.15) / 150; }
const awx = i => actors[i].wx + (i ? .14 : -.14);
function actorScreen(i) { return [sx(awx(i)), GY()]; }
function chestOf(i) { const k = charK(); return [sx(awx(i)), GY() - 95 * k]; }
function headOf(i) { const k = charK(); return [sx(awx(i)), GY() - 140 * k]; }
function addFloat(x, y, text, col, size = 1) { floats.push({ x, y, text, col, size, life: 1, max: 1 }); }
function burst(x, y, n, cols, sp = 4, g = .25, sz = 3, type = 'spark') {
  for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, s = sp * (.4 + Math.random()); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - sp * .4, g, life: 1, dec: .02 + Math.random() * .025, size: sz * (.6 + Math.random() * .8), col: cols[k % cols.length], type }); }
}
function dust(x, y, n = 8) { for (let k = 0; k < n; k++) parts.push({ x: x + (Math.random() - .5) * 30, y, vx: (Math.random() - .5) * 2.4, vy: -Math.random() * 1.6, g: -.01, life: 1, dec: .02, size: 6 + Math.random() * 8, col: 'rgba(210,180,130,.6)', type: 'dust' }); }
function coinRain(n) { for (let k = 0; k < n; k++) parts.push({ x: Math.random() * SW, y: -20 - Math.random() * SH * .6, vx: (Math.random() - .5) * 1.2, vy: 2 + Math.random() * 2, g: .08, life: 1, dec: .004, size: 5 + Math.random() * 3, col: '#ffd34a', type: 'coin', rot: Math.random() * 6, floor: GY() + 8 + Math.random() * (SH - GY() - 10) }); }
function callout(text, cls = '') {
  const el = q('.ar-callout'); if (!el) return;
  el.textContent = text; el.className = 'ar-callout'; void el.offsetWidth; el.className = 'ar-callout show ' + cls;
  clearTimeout(calloutT); calloutT = setTimeout(() => { if (el) el.className = 'ar-callout'; }, 1300 * Math.max(.4, TUNE.speed));
}
function shake(m) { shakeMag = Math.max(shakeMag, m); }
function setHudNow(snap) { if (snap) hud = snap; }
function buildEvents(st) {
  const E = [], at = (p, fn) => E.push({ p, fn, done: false });
  const fiV = V && V.fight; if (!fiV) return E;
  const nm = i => fiV.f[i] ? fiV.f[i].name : '';
  if (st.k === 'move') {
    const n = Math.abs(st.to - st.from);
    for (let k = 0; k < n; k++) at((k + .5) / Math.max(1, n) * (st.slip ? .6 : 1), () => { sfx('step'); dust(actorScreen(st.s)[0], GY(), 4); });
    if (st.slip) at(.62, () => { const [x, y] = actorScreen(st.s); burst(x, y - 6, 14, ['#bfe6ff', '#7cc4ef', '#ffffff'], 3.5, .18, 3); addFloat(x, y - 150 * charK(), 'Kaydı! 💧', '#9fe0ff'); sfx('splat'); });
  } else if (st.k === 'atk') {
    const special = st.kind === 'ozel', D = 1 - st.s;
    if (special) at(0, () => { callout('🦅 ' + SPECIAL_N[st.wk].toLocaleUpperCase('tr-TR'), 'gold'); flashA = .5; flashCol = '#ffe9a8'; slowA = 1; Sound.special && SFX_ON() && Sound.special(); sfx('crowd'); });
    at(special ? .45 : .36, () => sfx('swing'));
    const times = st.hits.length > 1 ? [.46, .7] : [special ? .56 : .5];
    st.hits.forEach((h, j) => at(times[j] || .5, () => {
      const [cx, cy] = chestOf(D), k = charK();
      if (h.res === 'miss') { addFloat(cx, cy - 40 * k, 'ISKA', '#d9d2ff', .9); sfx('swing'); return; }
      if (h.res === 'block') { burst(cx - (D ? 1 : -1) * 18 * k, cy, 16, ['#fff7c2', '#ffd34a', '#ffffff'], 5, .2, 2.4); sfx('clang'); addFloat(cx, cy - 46 * k, `🛡 ${h.dmg}`, '#ffe9a8', .95); }
      else {
        burst(cx, cy, h.crit || special ? 30 : 18, ['#ffffff', '#ffd34a', '#ff8a3d'], h.crit || special ? 7 : 5, .22, 3);
        dust(sx(actors[D].wx), GY(), 6);
        addFloat(cx, cy - 46 * k, `-${h.dmg}`, h.crit ? '#ffd34a' : '#ffffff', h.crit || special ? 1.6 : 1.15);
        sfx(st.kind === 'guclu' || special || h.crit ? 'heavy' : 'hit');
        shake(special ? 16 : st.kind === 'guclu' || h.crit ? 10 : 4);
        if (h.crit) { callout('KUSURSUZ!', 'gold'); flashA = Math.max(flashA, .35); flashCol = '#fff6c0'; sfx('crowd'); crowdBoost = 1; }
        else crowdBoost = Math.max(crowdBoost, st.kind === 'guclu' ? .8 : .4);
      }
      if (h.broke) { addFloat(cx, cy - 80 * k, `${SLOT_N[h.broke]} kırıldı!`, '#ff9a7a', .95); burst(cx, cy - 30 * k, 12, ['#c9c9c9', '#8a8a8a', '#e2b33c'], 4, .3, 2.6, 'bit'); sfx('clang'); }
      if (st.after && j === st.hits.length - 1) setHudNow(st.after);
    }));
  } else if (st.k === 'guard') at(.25, () => { sfx('clang'); const [x, y] = headOf(st.s); addFloat(x, y - 10, '🛡 Savunma', '#bfe0ff', .8); });
  else if (st.k === 'rest') at(.4, () => { const [x, y] = headOf(st.s); addFloat(x, y - 10, `+${st.gain} 💨`, '#8fd0ff', .9); });
  else if (st.k === 'taunt') {
    at(.15, () => { sfx('crowd'); crowdBoost = 1.2; const [x, y] = headOf(st.s); addFloat(x, y - 14, 'Coşku! 🎉', '#ffd34a', 1); burst(x, y - 20, 14, ['#ff3fa4', '#ffe14a', '#19e3d0', '#2f7bff'], 4, .12, 3, 'conf'); });
    if (st.shake) at(.55, () => { const [x, y] = headOf(1 - st.s); addFloat(x, y - 14, '💫 Sarsıldı', '#e7c6ff', .9); });
  } else if (st.k === 'item') {
    const T = st.it === 'sifa' ? st.s : 1 - st.s;
    if (st.it === 'sifa') at(.45, () => { sfx('drink'); const [x, y] = chestOf(T); for (let k = 0; k < 18; k++) parts.push({ x: x + (Math.random() - .5) * 40, y: y + 30, vx: 0, vy: -1 - Math.random() * 1.5, g: -.01, life: 1, dec: .018, size: 3 + Math.random() * 3, col: '#5dff9e', type: 'spark' }); addFloat(x, y - 60 * charK(), `+${st.heal}`, '#5dff9e', 1.2); setHudNow(st.after); });
    else at(.7, () => {
      const [x, y] = chestOf(T);
      if (st.it === 'ates') { burst(x, y, 30, ['#ffdf6b', '#ff8a00', '#ff3b1f'], 6, .05, 5, 'fire'); sfx('boom'); shake(9); addFloat(x, y - 60 * charK(), `-${st.dmg} 🔥`, '#ffb36b', 1.25); }
      else { for (let k = 0; k < 22; k++) parts.push({ x: x + (Math.random() - .5) * 50, y: y + (Math.random() - .5) * 60, vx: (Math.random() - .5) * 1.4, vy: -Math.random() * .6, g: 0, life: 1, dec: .008, size: 14 + Math.random() * 14, col: 'rgba(205,205,215,.55)', type: 'dust' }); sfx('boom'); addFloat(x, y - 60 * charK(), 'Sis! 🌫️', '#e6e6ee', 1); }
      setHudNow(st.after);
    });
  } else if (st.k === 'hz') {
    const T = st.s;
    if (st.h === 'tomato') at(.6, () => { const [x, y] = headOf(T); burst(x, y + 10, 18, ['#e0312b', '#ff6b4a', '#7a1a10'], 4, .25, 3.5); sfx('splat'); addFloat(x, y - 16, '🍅 −5 💨', '#ff8a7a', .95); setHudNow(st.after); sfx('boo'); });
    if (st.h === 'spice') at(.1, () => { sfx('whoosh'); addFloat(SW / 2, SH * .3, '🌶️ Baharat bulutu!', '#ffc36b', 1); });
    if (st.h === 'stoneWarn') at(.1, () => { addFloat(sx(st.tile), GY() - 40, '⚠️', '#ffd34a', 1.4); sfx('clang'); });
    if (st.h === 'stone') at(.55, () => { const x = sx(st.tile); dust(x, GY(), 18); burst(x, GY() - 10, 14, ['#8d8a84', '#5d5a55', '#c9c4bb'], 5, .3, 3.5, 'bit'); shake(12); sfx('heavy'); if (T >= 0) { const [hx, hy] = headOf(T); addFloat(hx, hy - 10, `-${st.dmg}`, '#ffffff', 1.3); } setHudNow(st.after); });
    if (st.h === 'lion') { at(.05, () => { callout('🦁 ASLAN!', 'bad'); sfx('lion'); sfx('roar'); crowdBoost = 1.4; }); at(.5, () => { const [x, y] = chestOf(T); burst(x, y, 24, ['#ffffff', '#ffd34a', '#d9a441'], 6, .2, 3); shake(14); sfx('heavy'); addFloat(x, y - 50 * charK(), `-${st.dmg}`, '#ffd34a', 1.5); setHudNow(st.after); }); }
    if (st.h === 'fire' || st.h === 'burn') at(.4, () => { const [x, y] = chestOf(T); burst(x, y + 20, 16, ['#ffdf6b', '#ff8a00', '#ff3b1f'], 3, -.05, 4, 'fire'); addFloat(x, y - 50 * charK(), `-${st.dmg} 🔥`, '#ffb36b', 1); sfx('hit'); setHudNow(st.after); });
  } else if (st.k === 'ko') {
    at(.05, () => { slowA = 1; flashA = .55; flashCol = '#ffffff'; callout('NAKAVT!', 'bad'); sfx('roar'); crowdBoost = 1.6; });
    at(.48, () => { dust(sx(actors[st.s].wx) - (st.s ? -1 : 1) * 40 * charK(), GY(), 22); shake(14); sfx('heavy'); });
  } else if (st.k === 'decision') at(.1, () => { callout('HAKEM KARARI', 'gold'); sfx('crowd'); });
  else if (st.k === 'bored') at(.1, () => { sfx('boo'); for (let k = 0; k < 5; k++) addFloat(SW * (.15 + k * .17), SH * .32, 'Zzz', '#d9d2ff', .8); });
  return E;
}
function walkPose(ph, back) {
  const s = Math.sin(ph), c = Math.cos(ph), d = back ? -1 : 1;
  return Object.assign({}, POSE0, { ft: .1 + s * .55 * d, fs: .1 + s * .55 * d - Math.max(0, -c) * .6, bt: -.1 - s * .55 * d, bs: -.1 - s * .55 * d - Math.max(0, c) * .6, y: -Math.abs(c) * 3, lean: .1 * d + .04, bu: .3 - s * .3, fu: .5 + s * .2 });
}
function basePose(i, now) {
  const a = actors[i], fiV = V && V.fight;
  const br = Math.sin(now / 520 + i * 1.7);
  if (a.ko) return { pose: Object.assign({}, POSES.fall, { rot: -1.48 }), y: 0 };
  if (fiV && fiV.over && apIdle() && fiV.over.win === i && ['boutover', 'inter', 'post', 'done'].includes(V.phase)) { const b = Math.abs(Math.sin(now / 260)); return { pose: blend(POSES.win, Object.assign({}, POSES.win, { fu: 2.5, fl: 2.4 }), b), y: -b * 6 }; }
  if (fiV && fiV.over && apIdle() && fiV.over.win !== i) return { pose: POSES.rest, y: 0 };
  let p = a.guard ? POSES.guard : a.rest ? POSES.rest : POSE0;
  p = Object.assign({}, p, { lean: p.lean + br * .02, fu: p.fu + br * .04, bu: p.bu - br * .03 });
  return { pose: p, y: 0 };
}
// Aktif adımın i. dövüşçü üzerindeki etkisi
function stepPose(st, i, p, base) {
  const me = st.s === i, dirv = i === 0 ? 1 : -1;
  if (st.k === 'move' && me) {
    const n = Math.abs(st.to - st.from), qq = ease(seg(p, 0, st.slip ? .6 : 1));
    const back = (i === 0) !== (st.to > st.from);
    let pose = n ? walkPose(qq * n * Math.PI * 1.6, back) : base.pose;
    if (st.slip && p > .6) { const t = seg(p, .6, .78); pose = blend(pose, POSES.slip, t < 1 ? t : 1 - seg(p, .85, 1)); }
    return { pose, wx: lerp(st.from, st.to, qq) };
  }
  if (st.k === 'atk') {
    const special = st.kind === 'ozel', thrust = !special && (st.kind === 'hizli' || st.wk === 'mizrak' || st.wk === 'hancer');
    if (me) {
      const W1 = thrust ? POSES.windLow : POSES.windHigh, S1 = thrust ? POSES.thrust : POSES.strikeHigh;
      const t1 = special ? .45 : .36, t2 = special ? .56 : .5;
      let pose, dx = 0, dy = 0, trail = null, wx = null;
      if (p < t1) pose = blend(base.pose, W1, ease(seg(p, 0, t1)));
      else if (p < t2) { const t = ease(seg(p, t1, t2)); pose = blend(W1, S1, t); if (!thrust) trail = { from: W1.fu + W1.fl * .2, to: S1.fu + S1.fl * .2, a: t }; }
      else if (st.hits.length > 1 && p < .78) { const t = seg(p, .56, .76); pose = blend(S1, W1, Math.sin(t * Math.PI) * .9); }
      else pose = blend(S1, POSE0, ease(seg(p, .72, 1)));
      dx = (thrust ? .38 : .28) * Math.sin(seg(p, .05, .9) * Math.PI);
      if (special) {
        if (st.lunge) wx = lerp(st.lunge.from, st.lunge.to, ease(seg(p, .05, .5)));
        dy = -Math.sin(seg(p, .08, .56) * Math.PI) * 70 * charK();
        pose = Object.assign({}, pose, { rot: p > .1 && p < .5 ? (seg(p, .1, .5)) * Math.PI * 2 * -1 * 0 : 0 });
      }
      return { pose, dx: dx * dirv, dy, trail, wx, glow: special ? '#ffd34a' : (st.crit && p > .3 && p < .7 ? '#fff3a0' : null) };
    }
    const h = st.hits[0] || { res: 'miss' }, ti = special ? .56 : .5;
    if (h.res === 'hit') { if (p >= ti && p < ti + .4) { const t = seg(p, ti, ti + .06), o = seg(p, ti + .2, ti + .4); return { pose: blend(base.pose, POSES.hit, t * (1 - o)), dx: -.22 * dirv * t * (1 - o) }; } return null; }
    if (h.res === 'block') { const t = seg(p, .22, .38) * (1 - seg(p, .7, .9)); return { pose: blend(base.pose, POSES.guard, t), dx: -.08 * dirv * seg(p, ti, ti + .08) * (1 - seg(p, .7, .9)) }; }
    const t = seg(p, .3, .45) * (1 - seg(p, .65, .85)); return { pose: blend(base.pose, POSES.dodge, t), dx: -.2 * dirv * t };
  }
  if (st.k === 'guard' && me) return { pose: blend(base.pose, POSES.guard, ease(seg(p, 0, .5))) };
  if (st.k === 'rest' && me) return { pose: blend(base.pose, POSES.rest, ease(seg(p, 0, .4))) };
  if (st.k === 'taunt') {
    if (me) { const t = seg(p, 0, .2) * (1 - seg(p, .85, 1)); return { pose: blend(base.pose, POSES.taunt, t), dy: -Math.abs(Math.sin(p * Math.PI * 3)) * 12 * charK() * t }; }
    if (st.shake && p > .5) return { pose: Object.assign({}, base.pose, { head: Math.sin(p * 40) * .3, lean: base.pose.lean - .1 }) };
    return null;
  }
  if (st.k === 'item') {
    if (me) {
      if (st.it === 'sifa') { const t = seg(p, .05, .3) * (1 - seg(p, .75, .95)); return { pose: blend(base.pose, POSES.drink, t), noWeapon: false }; }
      let pose; if (p < .3) pose = blend(base.pose, POSES.windThrow, ease(seg(p, 0, .3))); else if (p < .45) pose = blend(POSES.windThrow, POSES.release, ease(seg(p, .3, .45))); else pose = blend(POSES.release, POSE0, ease(seg(p, .5, 1)));
      return { pose };
    }
    if (st.it === 'ates' && p > .7 && p < .95) return { pose: blend(base.pose, POSES.hit, 1 - seg(p, .8, .95)) };
    return null;
  }
  if (st.k === 'hz' && st.s === i) {
    const ti = st.h === 'tomato' ? .6 : st.h === 'stone' ? .55 : st.h === 'lion' ? .5 : .4;
    if (p >= ti && p < ti + .35) { const t = seg(p, ti, ti + .05) * (1 - seg(p, ti + .2, ti + .35)); return { pose: blend(base.pose, POSES.hit, t), dx: -.2 * dirv * t }; }
    return null;
  }
  if (st.k === 'ko' && st.s === i) { const t = seg(p, 0, .5), bounce = t < 1 ? easeOut(t) : 1; return { pose: Object.assign(blend(POSES.hit, POSES.fall, t), { rot: -1.48 * bounce + (t >= 1 ? Math.sin(seg(p, .5, .7) * Math.PI) * .06 : 0) }) }; }
  return null;
}

/* ------------------------------------------------------------------ çizim döngüsü */
function frame(now) {
  raf = requestAnimationFrame(frame);
  if (!cv || !V || SW < 20) return;
  const dt = Math.min(50, now - (lastFrame || now)); lastFrame = now;
  const spec = sceneSpec(); if (!spec) return;
  ensureBg(spec.arena);
  const g = cg; g.setTransform(DPR, 0, 0, DPR, 0, 0);
  // oynatıcı
  if (spec.live) {
    apNext(now);
    if (AP.cur) {
      const p = clamp((now - AP.t0) / Math.max(1, AP.dur), 0, 1);
      AP.ev.forEach(e => { if (!e.done && p >= e.p) { e.done = true; try { e.fn(); } catch (err) { console.error(err); } } });
      if (p >= 1) { apFinish(); apNext(now); }
    }
  }
  // bileşenler
  const figs = [];
  if (spec.live) {
    const fiV = V.fight;
    const p = AP.cur ? clamp((now - AP.t0) / Math.max(1, AP.dur), 0, 1) : 0;
    for (let i = 0; i < 2; i++) {
      const base = basePose(i, now);
      const o = AP.cur ? stepPose(AP.cur, i, p, base) : null;
      const wx = o && o.wx != null ? o.wx : actors[i].wx;
      figs.push({ F: Object.assign({}, fiV.f[i], { dur: hud && hud.dur ? hud.dur[i] : fiV.f[i].dur }), wx: wx + (o && o.dx || 0) + (i ? .14 : -.14), pose: o ? o.pose : base.pose, dy: (o && o.dy || 0) + base.y, dir: i === 0 ? 1 : -1, trail: o && o.trail, glow: o && o.glow,
        fx: { burn: fiV.f[i].fx.burn > 0 && apIdle(), blind: fiV.f[i].fx.blind > 0, shaken: fiV.f[i].fx.shaken > 0 && apIdle() } });
    }
  } else if (spec.pair) {
    spec.pair.forEach((F, i) => { const b = Math.sin(now / 520 + i * 2); figs.push({ F, wx: i ? 5.6 : 3.4, pose: Object.assign({}, POSE0, { lean: POSE0.lean + b * .02, fu: POSE0.fu + b * .05 }), dy: 0, dir: i ? -1 : 1 }); });
  } else if (spec.solo) { const b = Math.sin(now / 520); figs.push({ F: spec.solo, wx: 4.5, pose: Object.assign({}, POSE0, { lean: POSE0.lean + b * .02, fu: POSE0.fu + b * .05 }), dy: 0, dir: 1 }); }
  // kamera
  let tc = 5, ts = 10.6;
  if (figs.length === 2) { const lo = figs[0].wx - (spec.live && actors[0].ko ? 1.7 : 0), hi = figs[1].wx + (spec.live && actors[1].ko ? 1.7 : 0); tc = (lo + hi) / 2 + .5; ts = clamp(hi - lo + 3.6, 4.8, 10.6); }
  else if (figs.length === 1) { tc = figs[0].wx + .5; ts = 4.4; }
  if (SW < 520) ts = Math.max(ts, figs.length === 1 ? 4 : 5.4);
  tc = ts >= 10 ? 5 : clamp(tc, ts / 2 - .4, 10.4 - ts / 2);
  if (!cam.init) { cam.c = tc; cam.span = ts; cam.init = true; } else { const kk = 1 - Math.exp(-dt / 260); cam.c += (tc - cam.c) * kk; cam.span += (ts - cam.span) * kk; }
  // sarsıntı
  shakeMag *= Math.pow(.86, dt / 16); const shx = (Math.random() - .5) * shakeMag, shy = (Math.random() - .5) * shakeMag;
  g.save(); g.translate(shx, shy);
  g.drawImage(bg, -8, -8, SW + 16, SH + 16);
  const fiV = V.fight;
  const ex = clamp(.15 + (fiV && spec.live ? Math.max(hud ? hud.cos[0] : 0, hud ? hud.cos[1] : 0) / 140 : 0) + crowdBoost, 0, 1.4);
  crowdBoost *= Math.pow(.985, dt / 16);
  drawCrowd(g, crowd, now, ex);
  // zemin işaretleri ve tehlikeler
  const gy = GY(), k = charK(), tsz = SW / cam.span;
  for (let t = 0; t <= LANE; t++) { const x = SW / 2 + (t - cam.c) * tsz; g.fillStyle = 'rgba(60,35,15,.18)'; g.fillRect(x - 1, gy + 2, 2, 10); }
  if (fiV && spec.live) {
    const hz = fiV.hz;
    hz.wet.forEach(t => { const x = sx(t); g.fillStyle = 'rgba(40,90,140,.45)'; g.beginPath(); g.ellipse(x, gy + 10, tsz * .46, 8, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x - tsz * .2 + Math.sin(now / 400 + t) * 4, gy + 7, 6, 2); });
    if (hz.stone) { const x = sx(hz.stone.tile), pul = .6 + Math.sin(now / 120) * .25; g.fillStyle = `rgba(0,0,0,${.25 + pul * .2})`; g.beginPath(); g.ellipse(x, gy + 6, tsz * .4 * pul + 8, 9, 0, 0, 7); g.fill(); g.font = `900 ${Math.round(18 + 10 * k)}px sans-serif`; g.textAlign = 'center'; g.fillStyle = '#ffd34a'; g.fillText('⚠', x, gy - 4); }
    if (fiV.arena === 'imp') { drawBrazier(g, sx(-.42), gy + 4, k * 1.1, now); drawBrazier(g, sx(9.42), gy + 4, k * 1.1, now); }
  }
  // dövüşçüler (önce arkadaki)
  figs.forEach((f, i) => {
    const x = sx(f.wx), y = gy + f.dy;
    if (aimMark && aimMark.side === i && now < aimMark.until) { g.font = `${Math.round(22 * Math.max(.7, k))}px sans-serif`; g.textAlign = 'center'; g.fillText('🎯', x, y - 168 * k); }
    drawFighter(g, f.F, x, y, k, f.dir, f.pose, { trail: f.trail, glow: f.glow, fx: f.fx, time: now });
    if (spec.live && fiV && !fiV.over && fiV.turn === i && apIdle() && !fiV.busy) { const yy = y - 172 * k + Math.sin(now / 200) * 3; g.fillStyle = f.F.color || (i ? '#ff3fa4' : '#19e3d0'); g.beginPath(); g.moveTo(x - 8, yy - 10); g.lineTo(x + 8, yy - 10); g.lineTo(x, yy); g.closePath(); g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(); }
  });
  // baharat bulutu (dövüşçülerin üstünde)
  if (fiV && spec.live && fiV.hz.spice) fiV.hz.spice.tiles.forEach((t, j) => { const x = sx(t); for (let c = 0; c < 3; c++) { g.fillStyle = `rgba(230,${140 + c * 20},60,.22)`; g.beginPath(); g.arc(x + Math.sin(now / 700 + j + c) * 12, gy - 60 * k - c * 30 * k + Math.cos(now / 900 + c) * 6, 28 * k + 14, 0, 7); g.fill(); } });
  // mermiler / aslan
  if (AP.cur && spec.live) drawProjectiles(g, AP.cur, clamp((now - AP.t0) / Math.max(1, AP.dur), 0, 1), now);
  // parçacıklar
  parts = parts.filter(pp => pp.life > 0);
  for (const pp of parts) {
    pp.x += pp.vx * dt / 16; pp.y += pp.vy * dt / 16; pp.vy += pp.g * dt / 16; pp.life -= pp.dec * dt / 16;
    if (pp.type === 'coin') { if (pp.y > pp.floor) { pp.y = pp.floor; pp.vy *= -.35; pp.vx *= .7; } pp.rot += .2; g.save(); g.translate(pp.x, pp.y); g.scale(Math.abs(Math.cos(pp.rot)) + .15, 1); dot(g, 0, 0, pp.size, '#ffd34a', false); g.fillStyle = '#e8a817'; g.beginPath(); g.arc(0, 0, pp.size * .55, 0, 7); g.fill(); g.restore(); continue; }
    g.globalAlpha = clamp(pp.life, 0, 1);
    if (pp.type === 'dust') { g.fillStyle = pp.col; g.beginPath(); g.arc(pp.x, pp.y, pp.size * (1.6 - pp.life * .6), 0, 7); g.fill(); }
    else if (pp.type === 'conf' || pp.type === 'bit') { g.fillStyle = pp.col; g.fillRect(pp.x, pp.y, pp.size * 1.4, pp.size); }
    else { g.fillStyle = pp.col; g.beginPath(); g.arc(pp.x, pp.y, Math.max(.1, pp.size * (pp.type === 'fire' ? pp.life : 1)), 0, 7); g.fill(); }
    g.globalAlpha = 1;
  }
  // uçan yazılar
  floats = floats.filter(f => f.life > 0);
  for (const f of floats) {
    f.life -= dt / 1100; f.y -= dt * .04;
    g.globalAlpha = clamp(f.life * 2, 0, 1);
    const fs = Math.round((15 + 8 * Math.min(1.4, k * 1.3)) * f.size);
    g.font = `400 ${fs}px Bungee, "Arial Black", sans-serif`; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(20,8,30,.85)'; g.strokeText(f.text, f.x, f.y); g.fillStyle = f.col; g.fillText(f.text, f.x, f.y);
    g.globalAlpha = 1;
  }
  g.restore();
  // yavaş çekim kenarlığı ve parlama
  if (slowA > 0) { slowA -= dt / 1400; const gr = g.createRadialGradient(SW / 2, SH / 2, SH * .3, SW / 2, SH / 2, SW * .7); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(20,0,30,${.45 * clamp(slowA, 0, 1)})`); g.fillStyle = gr; g.fillRect(0, 0, SW, SH); }
  if (flashA > 0) { g.globalAlpha = clamp(flashA, 0, 1); g.fillStyle = flashCol; g.fillRect(0, 0, SW, SH); g.globalAlpha = 1; flashA -= dt / 400; }
  if (timing) tickTiming(now);
  // zafer yağmuru
  if (fiV && fiV.over && apIdle() && spec.live) {
    const key = fiV.id + ':' + fiV.over.win;
    if (coinsDone !== key) { coinsDone = key; const mine = V.mode === 'kariyer' ? fiV.over.win === 0 : true; if (mine) { coinRain(V.mode === 'kariyer' ? 60 : 40); sfx('crowd'); } }
  }
}
function drawProjectiles(g, st, p, now) {
  const k = charK();
  if (st.k === 'item' && st.it !== 'sifa' && p > .3 && p < .7) {
    const t = seg(p, .3, .7), [x0, y0] = headOf(st.s), [x1, y1] = chestOf(1 - st.s);
    const x = lerp(x0, x1, t), y = lerp(y0, y1, t) - Math.sin(t * Math.PI) * 80 * k;
    g.save(); g.translate(x, y); g.rotate(t * 12);
    if (st.it === 'ates') { dot(g, 0, 0, 7 * Math.max(.7, k), '#c0392b'); g.fillStyle = '#ffd34a'; g.fillRect(-2, -12 * Math.max(.7, k), 4, 6); }
    else dot(g, 0, 0, 7 * Math.max(.7, k), '#9aa1a9');
    g.restore();
  }
  if (st.k === 'hz' && st.h === 'tomato' && p < .6) {
    const t = seg(p, .05, .6), [x1, y1] = headOf(st.s), x0 = st.s ? SW * .95 : SW * .05, y0 = SH * .3;
    dot(g, lerp(x0, x1, t), lerp(y0, y1, t) - Math.sin(t * Math.PI) * 60, 6 * Math.max(.7, k), '#e0312b');
  }
  if (st.k === 'hz' && st.h === 'stone' && p < .56) {
    const t = seg(p, 0, .55), x = sx(st.tile), y = lerp(-30, GY() - 18 * k, t * t);
    g.save(); g.translate(x, y); g.rotate(t * 5); g.beginPath(); for (let a = 0; a < 7; a++) g.lineTo(Math.cos(a) * (18 + (a % 2) * 5) * Math.max(.6, k), Math.sin(a) * (16 + (a % 3) * 4) * Math.max(.6, k)); g.closePath(); g.fillStyle = '#8d8a84'; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(); g.restore();
  }
  if (st.k === 'hz' && st.h === 'lion') {
    const T = st.s, side = sx(actors[T].wx) < SW / 2 ? -1 : 1, x0 = side < 0 ? -80 : SW + 80, x1 = sx(actors[T].wx) + side * 50 * k;
    let x, y = GY();
    if (p < .5) x = lerp(x0, x1, ease(seg(p, 0, .5)));
    else if (p < .7) { x = x1 - side * 20 * k * Math.sin(seg(p, .5, .7) * Math.PI); y -= Math.sin(seg(p, .5, .7) * Math.PI) * 40 * k; }
    else x = lerp(x1, x0, ease(seg(p, .7, 1)));
    drawLion(g, x, y, k * 1.1, p < .7 ? -side : side, now);
  }
}

/* ------------------------------------------------------------------ zamanlama mini oyunu */
const PERIOD = { hizli: 900, normal: 760, guclu: 600 };
function myFighter() { const fi = V && V.fight; return fi ? fi.f[fi.turn] : null; }
function startTiming(kind) {
  const F = myFighter(); if (!F) return;
  const rc = critFloor(F), half = (1 - rc) / 2;
  timing = { kind, t0: performance.now(), period: PERIOD[kind] * (eff(F).cev >= 12 ? 1.08 : 1), done: false };
  const el = q('.ar-timing'); el.hidden = false; el.className = 'ar-timing';
  el.querySelector('.ar-tperf').style.cssText = `left:${(.5 - half) * 100}%;width:${half * 200}%`;
  el.querySelector('.ar-tgood').style.cssText = 'left:30%;width:40%';
  el.querySelector('.ar-tres').textContent = '';
  el.querySelector('.ar-tname').textContent = ACT_N[kind];
  try { ui.fast({ aim: kind }); } catch { /* yerel */ }
  renderPanel(true);
}
function timingPos(now) { const u = ((now - timing.t0) / timing.period) % 2; return u < 1 ? u : 2 - u; }
function tickTiming(now) {
  if (!timing || timing.done) return;
  const el = q('.ar-timing'); if (!el) return;
  const pos = timingPos(now);
  el.querySelector('.ar-tmark').style.left = (pos * 100) + '%';
  if (now - timing.t0 > timing.period * 4) hitTiming(true);
}
function hitTiming(timeout) {
  if (!timing || timing.done) return;
  const now = performance.now();
  const raw = timeout ? .15 : 1 - Math.abs(timingPos(now) - .5) * 2;
  timing.done = true;
  const F = myFighter(), ea = F ? effAcc(F, raw) : raw;
  const el = q('.ar-timing'), res = el.querySelector('.ar-tres');
  res.textContent = timeout ? 'Geç kaldın!' : ea >= .92 ? 'KUSURSUZ!' : raw >= .6 ? 'İyi!' : 'Zayıf…';
  el.classList.add(ea >= .92 && !timeout ? 'perf' : raw >= .6 && !timeout ? 'good' : 'weak');
  if (ea >= .92 && !timeout) sfx('clang');
  const kind = timing.kind;
  setTimeout(() => { timing = null; if (el) el.hidden = true; ui && ui.send(Object.assign({ t: 'act', k: kind, acc: Math.round(raw * 1000) / 1000 }, asField())); renderPanel(true); }, 380 * Math.max(.3, TUNE.speed));
}
function asField() { const fi = V && V.fight; return ui && ui.mode === 'local' && fi ? { as: fi.f[fi.turn].ctl.pi } : {}; }

/* ------------------------------------------------------------------ ÜST BİLGİ (HUD) */
function bar(cls, v, max, label) { const p = max ? clamp(v / max, 0, 1) * 100 : 0; return `<div class="ar-bar ${cls}"><i style="width:${p}%"></i><span>${label}</span></div>`; }
function renderHud() {
  if (!hudEl || !V) return;
  const fi = V.fight, show = fi && ['fight', 'boutover', 'inter', 'post'].includes(V.phase);
  let html = '';
  if (show) {
    const h = hud || snapOf(fi);
    html = fi.f.map((F, i) => {
      const pips = V.match ? Array.from({ length: V.match.target }, (_, k) => `<b class="${k < V.match.wins[i] ? 'on' : ''}"></b>`).join('') : '';
      const st = [F.guard && apIdle() ? '🛡️' : '', F.fx.burn ? '🔥' : '', F.fx.blind ? '🌫️' : '', F.fx.shaken ? '💫' : '', F.fx.slip ? '💧' : ''].join('');
      const col = F.color || (V.mode === 'kariyer' ? (i ? '#ff6b6b' : '#19e3d0') : '#19e3d0');
      const ready = h.cos[i] >= 100;
      return `<div class="ar-fc ${i ? 'r' : 'l'} ${fi.turn === i && !fi.over ? 'turn' : ''}" style="--pc:${col}">
        <div class="ar-fn"><span class="av" style="--pc:${col}">${initial(F.name)}</span><b>${esc(F.name)}</b>${F.lvl ? `<small>Sv ${F.lvl}</small>` : ''}<span class="ar-pips">${pips}</span><span class="ar-st">${st}</span></div>
        ${bar('hp', h.hp[i], F.hpMax, `❤️ ${h.hp[i]}/${F.hpMax}`)}
        <div class="ar-bars2">${bar('sta', h.sta[i], F.staMax, `💨 ${h.sta[i]}`)}${bar('cos' + (ready ? ' full' : ''), h.cos[i], 100, ready ? '🦅 HAZIR' : `🎉 ${h.cos[i]}`)}</div>
      </div>`;
    }).join('');
  }
  if (html !== L.hudKey) { hudEl.innerHTML = html; L.hudKey = html; }
  hudEl.hidden = !show;
}

/* ------------------------------------------------------------------ yardımcılar */
function canActFight() {
  const fi = V && V.fight; if (!fi || V.phase !== 'fight' || fi.over) return false;
  const F = fi.f[fi.turn]; if (F.ctl.pi < 0) return false;
  const p = V.players[F.ctl.pi]; if (!p || p.isBot) return false;
  return ui.mode === 'local' ? true : F.ctl.pi === ui.me;
}
function myPis() { if (!V) return []; if (ui.mode === 'local') return V.players.map((p, i) => i).filter(i => !V.players[i].isBot); return ui.me >= 0 ? [ui.me] : []; }
function draftPi() {
  if (!V || V.phase !== 'draft') return null;
  const mine = myPis().filter(pi => V.ents.some(e => e.pi === pi && !e.locked));
  return mine.length ? mine[0] : null;
}
function secsLeft() { if (!V || !V.wait) return 0; return Math.max(0, Math.ceil((V.wait.at - ui.hostNow()) / 1000)); }
function nameOfEnt(e) { return V.ents && V.ents[e] ? V.ents[e].name : '?'; }
const stars = t => '★'.repeat(t) + '☆'.repeat(Math.max(0, 4 - t));
function gearLine(g) {
  if (!g) return '';
  if (g.slot === 'w') return `🗡️ ${g.dmg[0]}–${g.dmg[1]} hasar${g.acc ? ` · isabet ${g.acc > 0 ? '+' : ''}${Math.round(g.acc * 100)}%` : ''}${g.reach > 1 ? ' · menzil 2' : ''}${g.two ? ' · iki el' : ''}${g.kind === 'gurz' ? ' · zırh deler' : ''}${g.kind === 'hancer' ? ' · hızlıda çift vuruş' : ''}`;
  const b = g.bonus ? ' · ' + Object.entries(g.bonus).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${STATS.find(s => s.k === k).n}`).join(', ') : '';
  return `🛡️ zırh ${g.def} · dayanım ${g.dur}${g.blk ? ` · blok ${Math.round(g.blk * 100)}%` : ''}${b}`;
}
function reqLine(g, S) { const r = Object.entries(g.req || {}); if (!r.length) return ''; return r.map(([k, v]) => `<span class="${(S[k] | 0) >= v ? 'ok' : 'no'}">${STATS.find(s => s.k === k).n} ${v}</span>`).join(' '); }
function lookRows(look, attr) {
  const sw = (key, cols) => `<div class="ar-row"><span>${{ skin: 'Ten', hc: 'Saç rengi', c1: 'Tunik', c2: 'Kuşak' }[key]}</span><div class="ar-sw">${cols.map((c, i) => `<button type="button" class="${look[key] === i ? 'on' : ''}" style="--c:${c}" data-${attr}="${key}" data-v="${i}" aria-label="${key} ${i + 1}"></button>`).join('')}</div></div>`;
  const chips = (key, names, label) => `<div class="ar-row"><span>${label}</span><div class="ar-chipsel">${names.map((n, i) => `<button type="button" class="${look[key] === i ? 'on' : ''}" data-${attr}="${key}" data-v="${i}">${n}</button>`).join('')}</div></div>`;
  return sw('skin', LOOK.skin) + chips('hair', LOOK.hair, 'Saç') + sw('hc', LOOK.hairC) + chips('beard', LOOK.beard, 'Sakal') + sw('c1', LOOK.cols) + sw('c2', LOOK.cols);
}
function statRows(S, base, max, left, attr, canMinus) {
  return `<div class="ar-stats">${STATS.map(s => `<div class="ar-srow"><span class="ar-si">${s.i}</span><span class="ar-sn"><b>${s.n}</b><small>${s.d}</small></span>
    ${canMinus ? `<button type="button" class="ar-pm" data-${attr}="${s.k}" data-d="-1" ${S[s.k] <= base ? 'disabled' : ''} aria-label="${s.n} azalt">−</button>` : ''}
    <b class="ar-sv">${S[s.k]}</b><button type="button" class="ar-pm" data-${attr}="${s.k}" data-d="1" ${left <= 0 || S[s.k] >= max ? 'disabled' : ''} aria-label="${s.n} artır">+</button></div>`).join('')}</div>`;
}
function derivedLine(S, gear) { const E = effStats(S, gear || {}); const w = GEAR[(gear && gear.w) || 'sopa']; return `❤️ Can ${hpMaxOf(E)} · 💨 Nefes ${staMaxOf(E)} · 🗡️ ${Math.round(w.dmg[0] + E.guc * .45)}–${Math.round(w.dmg[1] + E.guc * .45)}`; }

/* ------------------------------------------------------------------ paneller */
function renderPanel(force) {
  if (!panelEl || !V) return;
  const v = V;
  const key = JSON.stringify([v.phase, v.mode, force ? Math.random() : 0, v.fight && [v.fight.seq, v.fight.busy, v.fight.turn, !!v.fight.over], v.car && [v.car.gold, v.car.pts, v.car.lvl, v.car.gear, v.car.items, v.car.own.length, v.car.dur, v.car.S, v.car.look, v.car.name],
    v.post, v.ents && v.ents.map(e => e.locked), v.bet && v.bet.picks, v.match && [v.match.wins, v.match.bout, v.match.a, v.match.b], v.br && v.br.map(r => r.map(x => x.w)), v.players.map(p => [p.coins, p.online]), L.tab, L.shop, L.selArena, L.selOpp, L.curtain, !!timing, ui.me]);
  if (key === L.key && !force) return;
  L.key = key;
  const sc = panelEl.scrollTop;
  let h = '';
  try {
    if (v.mode === 'kariyer') h = v.phase === 'create' ? pCreate() : v.phase === 'town' ? pTown() : v.phase === 'post' ? pPost() : ['fight', 'boutover'].includes(v.phase) ? pFight() : pDone();
    else h = v.phase === 'draft' ? pDraft() : v.phase === 'bet' ? pBet() : v.phase === 'intro' ? pIntro() : v.phase === 'bracket' ? pBracket() : ['fight', 'boutover', 'inter'].includes(v.phase) ? pFight() : pDone();
  } catch (e) { console.error(e); h = '<p class="g-sub">…</p>'; }
  panelEl.innerHTML = h;
  panelEl.scrollTop = sc;
  renderStatus();
}
function renderStatus() {
  const el = q('.ar-status'); if (!el || !V) return;
  const v = V; let s = '';
  if (v.phase === 'fight' && v.fight) {
    const fi = v.fight, F = fi.f[fi.turn];
    if (canActFight()) s = fi.busy || !apIdle() ? `<span class="g-turn">Hazırlan… sıra ${ui.mode === 'local' && myPis().length > 1 ? esc(F.name) + "'da" : 'sende'}</span>` : `<span class="g-turn mine">⭐ Sıra ${ui.mode === 'local' && myPis().length > 1 ? esc(F.name) + "'da" : 'sende'} · hamleni seç</span>`;
    else s = `<span class="g-turn">Sıra: <b style="color:${F.color || '#ff6b6b'}">${esc(F.name)}</b>${F.ctl.bot ? ' düşünüyor…' : ''}</span>`;
  } else if (v.phase === 'draft') { const n = v.ents.filter(e => e.locked).length; s = draftPi() != null ? '<span class="g-turn mine">⭐ Kahramanını kur ve kilitle</span>' : `<span class="g-turn">Rakipler hazırlanıyor… (${n}/${v.ents.length})</span>`; }
  else if (v.phase === 'bet') s = `<span class="g-turn">🪙 Bahis zamanı · <b class="ar-cd">${secsLeft()}</b> sn</span>`;
  else if (v.phase === 'intro' && v.match) s = `<span class="g-turn">⚔️ ${esc(nameOfEnt(v.match.a))} – ${esc(nameOfEnt(v.match.b))}</span>`;
  else if (v.phase === 'bracket') s = '<span class="g-turn">🏟️ Turnuva ağacı</span>';
  else if (v.phase === 'inter' || v.phase === 'boutover') s = v.fight && v.fight.over ? `<span class="g-turn win">${esc(v.fight.f[v.fight.over.win].name)} rauntu aldı!</span>` : '';
  else if (v.mode === 'kariyer' && v.car) s = `<span class="g-turn">🏘️ ${esc(v.car.name)} · Sv ${v.car.lvl} · 🪙 ${fmt(v.car.gold)}</span>`;
  else if (v.phase === 'create') s = '<span class="g-turn mine">⭐ Kahramanını yarat</span>';
  if (el.innerHTML !== s) el.innerHTML = s;
  const chips = q('.ar-chips');
  if (chips) {
    const show = v.mode !== 'kariyer';
    chips.hidden = !show;
    if (show) {
      const fi = v.fight, act = fi && !fi.over && v.phase === 'fight' ? fi.f[fi.turn].ctl.pi : -2;
      const html = v.players.map((p, i) => `<div class="g-chip ${act === i ? 'active' : ''} ${p.online === false ? 'off' : ''}" style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><b>${esc(p.name)}${ui.me === i ? ' · sen' : ''}</b><span class="g-num">🪙${p.coins}</span></div>`).join('');
      if (chips.innerHTML !== html) chips.innerHTML = html;
    }
  }
}
function pCreate() {
  if (!V.car && !L.create) L.create = { name: V.players[0] ? V.players[0].name : 'Kahraman', look: randomLook(Math.random), S: Object.fromEntries(SK.map(k => [k, CREATE.base])) };
  const mine = myPis().includes(0);
  if (!mine) return '<div class="ar-card"><p class="g-sub">Kurucu kahramanını yaratıyor…</p></div>';
  const c = L.create, left = CREATE.pts - SK.reduce((t, k) => t + c.S[k] - CREATE.base, 0);
  return `<div class="ar-card ar-create">
    <h3 class="ar-h">🛡️ Kahramanını yarat</h3>
    <label class="ar-row"><span>Ad</span><input class="ar-in" data-f="cname" maxlength="16" value="${esc(c.name)}" aria-label="Kahraman adı"></label>
    <div class="ar-cols"><div>${lookRows(c.look, 'clook')}<button type="button" class="btn btn-ghost ar-sm" data-a="crand">🎲 Rastgele görünüm</button></div>
    <div><p class="ar-pts">Dağıtılacak puan: <b>${left}</b></p>${statRows(c.S, CREATE.base, CREATE.max, left, 'cst', true)}<p class="g-sub">${derivedLine(c.S, { w: 'sopa' })}</p></div></div>
    <button type="button" class="btn btn-spin ar-big" data-a="create" ${left ? 'disabled' : ''}>⚔️ KARİYERE BAŞLA</button>
    <p class="g-sub">5 arena, her birinde 5 rakip ve bir şampiyon. Kazandıkça altın ve tecrübe topla, çarşıda donan.</p></div>`;
}
function townHead(c) {
  const need = xpNeed(c.lvl);
  return `<div class="ar-hero"><div><b class="ar-hn">${esc(c.name)}</b><span class="ar-tag">Sv ${c.lvl}</span>${c.legend ? '<span class="ar-tag gold">🌟 Efsane</span>' : ''}</div>
    <div class="ar-xp" title="Tecrübe"><i style="width:${clamp(c.xp / need, 0, 1) * 100}%"></i><span>TP ${c.xp}/${need}</span></div>
    <div class="ar-money">🪙 <b>${fmt(c.gold)}</b>${c.pts ? `<button type="button" class="ar-tag hot" data-tab="hero">+${c.pts} puan</button>` : ''}</div></div>
    <div class="ar-tabs" role="tablist">${[['arena', '⚔️ Arena'], ['shop', '🛒 Çarşı'], ['hero', '🧍 Kahraman'], ['rec', '📜 Kayıt']].map(([k, n]) => `<button type="button" role="tab" class="${L.tab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>`;
}
function pTown() {
  const c = V.car; if (!c) return '';
  const mine = myPis().includes(0);
  let body = '';
  if (L.tab === 'arena') {
    const ar = L.selArena != null ? Math.min(L.selArena, c.arena) : c.arena;
    body += `<div class="ar-arenas">${ARENAS.map((a, i) => `<button type="button" class="${i === ar ? 'on' : ''}" data-arena="${i}" ${i > c.arena ? 'disabled' : ''}><span>${i > c.arena ? '🔒' : a.i}</span><b>${a.n}</b><small>${c.prog[i] >= 6 ? '👑' : `${c.prog[i]}/6`}</small></button>`).join('')}</div>`;
    body += `<p class="ar-hz">⚠️ ${ARENAS[ar].hz}</p><div class="ar-ladder">`;
    for (let i = 0; i < 6; i++) {
      const o = oppDef(ar, i), done = i < c.prog[ar], next = i === c.prog[ar], sel = (L.selOpp != null ? L.selOpp : Math.min(5, c.prog[ar])) === i;
      body += `<div class="ar-opp ${done ? 'done' : ''} ${next ? 'next' : ''} ${sel ? 'sel' : ''} ${o.champ ? 'champ' : ''}" data-opp="${i}">
        <span class="ar-oi">${done ? '✔' : o.champ ? '👑' : next ? '▶' : '🔒'}</span><span class="ar-on"><b>${esc(o.name)}</b><small>Sv ${o.lvl} · ${PERS[o.pers].n} · ${KIND_N[GEAR[o.gear.w].kind]}${sel ? ` — “${esc(o.quote)}”` : ''}</small></span>
        ${mine && (done || next) ? `<button type="button" class="btn ${next ? 'btn-spin' : 'btn-ghost'} ar-fight" data-fight="${ar}:${i}">${next ? '⚔️ Dövüş' : 'Rövanş'}</button>` : ''}</div>`;
    }
    body += '</div>';
    if (c.legend) body += `<div class="ar-opp next ${L.selOpp === 6 ? 'sel' : ''}" data-opp="6"><span class="ar-oi">🌟</span><span class="ar-on"><b>Efsane maçı #${c.lwins + 1}</b><small>Seviyene göre güçlenen efsanevi rakipler</small></span>${mine ? '<button type="button" class="btn btn-spin ar-fight" data-fight="legend">⚔️ Dövüş</button>' : ''}</div>`;
  } else if (L.tab === 'shop') {
    const cats = [['w', '⚔️ Silah'], ['s', '🛡️ Kalkan'], ['h', '⛑️ Miğfer'], ['a', '🦺 Zırh'], ['b', '🥾 Çizme'], ['i', '🧪 İksir'], ['r', '🔨 Demirci']];
    body += `<div class="ar-cats">${cats.map(([k, n]) => `<button type="button" class="${L.shop === k ? 'on' : ''}" data-shop="${k}">${n}</button>`).join('')}</div><div class="ar-shop">`;
    if (L.shop === 'i') {
      body += `<p class="g-sub">Çanta: ${itemCount(c.items)}/${ITEM_MAX}</p>` + ITEM_KEYS.map(k => { const it = ITEMS[k], p = priceFor(c, it.price); return `<div class="ar-item"><span class="ar-ii">${it.i}</span><span class="ar-in2"><b>${it.n} <small>×${c.items[k]}</small></b><small>${it.d}</small></span><button type="button" class="btn btn-vowel ar-sm" data-buy="${k}" ${!mine || c.gold < p || itemCount(c.items) >= ITEM_MAX ? 'disabled' : ''}>🪙 ${p}</button></div>`; }).join('');
    } else if (L.shop === 'r') {
      const cost = repairCost(c);
      body += ['s', 'h', 'a', 'b'].filter(sl => c.gear[sl]).map(sl => { const g = GEAR[c.gear[sl]], d = c.dur[sl] != null ? c.dur[sl] : g.dur; return `<div class="ar-item"><span class="ar-ii">${{ s: '🛡️', h: '⛑️', a: '🦺', b: '🥾' }[sl]}</span><span class="ar-in2"><b>${g.name}${d <= 0 ? ' <small class="no">KIRIK</small>' : ''}</b><div class="ar-dur"><i style="width:${d / g.dur * 100}%"></i></div></span><small>${d}/${g.dur}</small></div>`; }).join('') || '<p class="g-sub">Kuşanılmış zırh yok.</p>';
      body += `<button type="button" class="btn btn-spin ar-big" data-a="repair" ${!mine || !cost || c.gold < cost ? 'disabled' : ''}>🔨 Hepsini onar · 🪙 ${cost}</button><p class="g-sub">Zırhlar her darbede ezilir; dayanımı biten parça hiç korumaz. Kırık zırhla arenaya çıkma!</p>`;
    } else {
      const list = GEAR_LIST.filter(g => g.slot === L.shop && g.tier >= 1).sort((a, b) => a.tier - b.tier || a.price - b.price);
      const cur = c.gear[L.shop];
      if (L.shop !== 'w' && cur) body += `<button type="button" class="btn btn-ghost ar-sm" data-unequip="${L.shop}" ${mine ? '' : 'disabled'}>Çıkar: ${GEAR[cur].name}</button>`;
      body += list.map(g => {
        const own = c.own.includes(g.id), on = cur === g.id, ok = meetsReq(c.S, g), p = priceFor(c, g.price);
        let btn;
        if (on) btn = '<span class="ar-tag ok">Kuşanıldı ✓</span>';
        else if (own) btn = `<button type="button" class="btn btn-vowel ar-sm" data-equip="${g.id}" ${!mine || !ok ? 'disabled' : ''}>Kuşan</button>`;
        else btn = `<button type="button" class="btn btn-spin ar-sm" data-buy="${g.id}" ${!mine || !ok || c.gold < p ? 'disabled' : ''}>🪙 ${fmt(p)}</button>`;
        return `<div class="ar-item ${L.tryOn === g.id ? 'try' : ''} ${on ? 'on' : ''}" data-try="${g.id}"><span class="ar-tier t${g.tier}">${stars(g.tier)}</span><span class="ar-in2"><b>${g.name}</b><small>${gearLine(g)}</small>${g.req && Object.keys(g.req).length ? `<small class="ar-req">Gerekli: ${reqLine(g, c.S)}</small>` : ''}</span>
          <span class="ar-ib">${btn}${own && !on && g.id !== 'sopa' ? `<button type="button" class="ar-link" data-sell="${g.id}" ${mine ? '' : 'disabled'}>Sat +${Math.round(g.price * .5)}</button>` : ''}</span></div>`;
      }).join('');
      body += '<p class="g-sub">Bir ürüne dokun: kahramanın üzerinde dene.</p>';
    }
    body += '</div>';
  } else if (L.tab === 'hero') {
    const E = heroEff(c), w = GEAR[c.gear.w];
    body += `<p class="ar-pts">${c.pts ? `Dağıtılacak puan: <b>${c.pts}</b>` : 'Seviye atladıkça 4 puan kazanırsın.'}</p>${statRows(c.S, 1, STAT_CAP, mine ? c.pts : 0, 'alloc', false)}
      <p class="g-sub">${derivedLine(c.S, c.gear)} · 🎯 Kusursuz bölgesi %${Math.round((1 - critFloor({ S: c.S, gear: c.gear })) * 100)} · ✨ indirim %${Math.round(Math.min(.2, E.kar * .006) * 100)}</p>
      <p class="g-sub">Silah: <b>${w.name}</b> · Özel hamle: <b>${SPECIAL_N[w.kind]}</b></p>
      <details class="ar-det"><summary>💈 Berber ve terzi (görünüm)</summary><label class="ar-row"><span>Ad</span><input class="ar-in" data-f="hname" maxlength="16" value="${esc(c.name)}"></label>${lookRows(c.look, 'hlook')}</details>`;
  } else {
    body += `<div class="ar-rec"><div><b>${c.wins}</b><small>Galibiyet</small></div><div><b>${c.losses}</b><small>Yenilgi</small></div><div><b>${c.champs}</b><small>Şampiyonluk</small></div><div><b>${c.crits}</b><small>Kusursuz</small></div><div><b>${fmt(careerPoints(c))}</b><small>Kariyer puanı</small></div></div>
      <p class="g-sub">Kariyerin bu cihazda otomatik kaydedilir. Oyunu kapatsan da kaldığın yerden devam edersin.</p>
      <div class="ar-btnrow"><button type="button" class="btn btn-vowel" data-a="leave" ${mine ? '' : 'disabled'}>💾 Kaydet ve çık</button><button type="button" class="btn btn-danger" data-a="retire" ${mine ? '' : 'disabled'}>🏳️ Emekli ol</button></div>`;
  }
  return `<div class="ar-card ar-town">${townHead(c)}${body}</div>`;
}
function pPost() {
  const p = V.post, c = V.car; if (!p || !c) return '';
  const mine = myPis().includes(0);
  return `<div class="ar-card ar-post ${p.won ? 'won' : 'lost'}">
    <h3 class="ar-h">${p.won ? (p.legend ? '🌟 EFSANE OLDUN!' : p.champ ? `👑 ${esc(p.champ)} ŞAMPİYONU!` : '🏆 ZAFER!') : '🤕 YENİLGİ'}</h3>
    <p class="g-sub">${p.won ? `${esc(p.opp)} kumlara serildi${p.how === 'karar' ? ' (hakem kararı)' : ''}.` : `${esc(p.opp)} bu sefer üstün geldi. Hekim yaralarını sardı.`}</p>
    <div class="ar-rec"><div><b>+${p.gold}</b><small>🪙 Ödül</small></div>${p.tip ? `<div><b>+${p.tip}</b><small>🎉 Kalabalık bahşişi</small></div>` : ''}<div><b>+${p.xp}</b><small>TP</small></div>${p.lvlUp ? `<div class="hot"><b>Sv ${c.lvl}</b><small>+${p.lvlUp * 4} puan</small></div>` : ''}</div>
    ${p.champ && !p.legend && c.arena > p.a ? `<p class="g-sub">Yeni arena açıldı: <b>${ARENAS[c.arena].i} ${ARENAS[c.arena].n}</b></p>` : ''}
    <div class="ar-btnrow">${mine ? `<button type="button" class="btn btn-spin" data-a="next">▶ Devam</button>${p.champ ? '<button type="button" class="btn btn-ghost" data-a="leave">🏁 Turnuvayı kapat (sonuçlar)</button>' : ''}` : '<p class="g-sub">Kurucu devam edecek…</p>'}</div></div>`;
}
function draftInit(pi) {
  if (L.draft[pi]) return L.draft[pi];
  const p = PRESETS[0];
  L.draft[pi] = { preset: p.id, look: randomLook(Math.random), S: Object.assign({}, p.S), gear: Object.assign({}, p.gear), items: Object.assign({ ates: 0, sifa: 0, sis: 0 }, p.items), car: false };
  return L.draft[pi];
}
function pDraft() {
  const v = V, pi = draftPi();
  const status = `<div class="ar-ready">${v.ents.map(e => `<span class="ar-tag ${e.locked ? 'ok' : ''}" style="--pc:${e.color}">${e.locked ? '✔' : '…'} ${esc(e.name)}</span>`).join('')}</div>`;
  if (pi == null) return `<div class="ar-card"><h3 class="ar-h">⚔️ Kahramanlar hazırlanıyor</h3>${status}<p class="g-sub">Seçimler, herkes kilitleyince açıklanır.</p></div>`;
  const nm = v.players[pi].name;
  if (ui.mode === 'local' && myPis().length > 1 && L.curtain !== pi) return `<div class="ar-card ar-curtain"><h3 class="ar-h">📱 Cihazı ${esc(nm)} alsın</h3><p class="g-sub">Diğerleri bakmasın! Seçimler kilitlenene kadar gizli.</p><button type="button" class="btn btn-spin ar-big" data-curtain="${pi}">Ben ${esc(nm)}, göster</button>${status}</div>`;
  const d = draftInit(pi);
  if (d.car && d.carBuild) {
    const b = d.carBuild;
    return `<div class="ar-card ar-draft"><h3 class="ar-h">🏅 Kariyer kahramanın: ${esc(b.name)} (Sv ${b.lvl})</h3><p class="g-sub">${derivedLine(b.S, b.gear)}</p><div class="ar-btnrow"><button type="button" class="btn btn-ghost" data-a="dcar0">Eşit kuruluma dön</button><button type="button" class="btn btn-spin" data-a="lock">🔒 Hazırım</button></div>${status}</div>`;
  }
  const left = DRAFT.pts - SK.reduce((t, k) => t + d.S[k] - DRAFT.base, 0), gold = DRAFT.gold - draftCost(d), okB = left === 0 && gold >= 0 && validDraft(d);
  const sel = sl => {
    const opts = (sl === 'w' ? [] : [null]).concat(GEAR_LIST.filter(g => g.slot === sl && g.tier <= DRAFT.tier && (g.tier >= 1 || sl === 'w')).map(g => g.id));
    return `<label class="ar-row"><span>${SLOT_N[sl]}</span><select class="ar-sel" data-dgear="${sl}" ${sl === 's' && GEAR[d.gear.w || 'sopa'].two ? 'disabled' : ''}>${opts.map(id => { const g = id && GEAR[id]; const bad = g && !meetsReq(d.S, g); return `<option value="${id || ''}" ${(d.gear[sl] || null) === id ? 'selected' : ''}>${g ? `${g.name} · ${g.price}🪙${bad ? ' (şart!)' : ''}` : '— yok —'}</option>`; }).join('')}</select></label>`;
  };
  const car = v.hero === 'kariyer' ? loadCareer() : null;
  return `<div class="ar-card ar-draft">
    <div class="ar-dh"><h3 class="ar-h">⚔️ ${esc(nm)}: kahramanını kur</h3><span class="ar-tag ${left ? 'hot' : 'ok'}">Puan ${left}</span><span class="ar-tag ${gold < 0 ? 'no' : 'ok'}">🪙 ${gold}</span></div>
    <div class="ar-presets">${PRESETS.map(p => `<button type="button" class="${d.preset === p.id ? 'on' : ''}" data-preset="${p.id}">${p.i} ${p.n}</button>`).join('')}<button type="button" data-a="drand">🎲 Görünüm</button></div>
    ${car ? `<button type="button" class="btn btn-vowel ar-sm" data-a="dcar">🏅 Kariyer kahramanımı getir (${esc(car.name)}, Sv ${car.lvl})</button>` : ''}
    <div class="ar-cols"><div>${statRows(d.S, DRAFT.base, DRAFT.max, left, 'dst', true)}<p class="g-sub">${derivedLine(d.S, d.gear)}</p></div>
    <div>${SLOTS.map(sel).join('')}<div class="ar-row"><span>Eşyalar</span><div class="ar-itemsel">${ITEM_KEYS.map(k => `<button type="button" data-ditem="${k}" title="${ITEMS[k].d}">${ITEMS[k].i}<b>${d.items[k]}</b><small>${ITEMS[k].price}</small></button>`).join('')}<button type="button" data-a="dclear" title="Eşyaları boşalt">✖</button></div></div></div></div>
    ${!okB ? `<p class="g-sub no">${left ? `${left} puan daha dağıt.` : gold < 0 ? 'Bütçe aşıldı!' : 'Bazı teçhizatların stat şartı karşılanmıyor.'}</p>` : ''}
    <button type="button" class="btn btn-spin ar-big" data-a="lock" ${okB ? '' : 'disabled'}>🔒 Hazırım</button>${status}</div>`;
}
function matchCard() {
  const v = V, m = v.match; if (!m) return '';
  const A0 = v.ents[m.a], B = v.ents[m.b];
  const desc = e => { const b = e.build; if (!b) return ''; const w = GEAR[b.gear.w || 'sopa']; return `<small>${w.name} · ❤️ ${hpMaxOf(effStats(b.S, b.gear))}${b.lvl ? ` · Sv ${b.lvl}` : ''}</small>`; };
  return `<div class="ar-vs"><div style="--pc:${A0.color}"><b>${esc(A0.name)}</b>${desc(A0)}</div><span>VS</span><div style="--pc:${B.color}"><b>${esc(B.name)}</b>${desc(B)}</div></div>
    <p class="g-sub">${ARENAS[ARENA_IX[m.arena]].i} ${ARENAS[ARENA_IX[m.arena]].n} · ${m.target === 1 ? 'tek raunt' : '3 rauntta 2'}${v.br ? ` · ${roundName(v.br, m.r)}` : ''}</p>`;
}
function pIntro() { return `<div class="ar-card">${matchCard()}<p class="g-sub">⚠️ ${ARENAS[ARENA_IX[V.match.arena]].hz}</p>${V.br ? bracketHtml() : ''}</div>`; }
function pBet() {
  const v = V, m = v.match, b = v.bet;
  const mine = myPis().filter(pi => b && b.eligible.includes(pi) && !b.picks[pi]);
  const rows = mine.map(pi => `<div class="ar-betrow"><b>${esc(v.players[pi].name)}</b> <small>🪙 ${v.players[pi].coins}</small>
      <div class="ar-btnrow"><button type="button" class="btn btn-vowel ar-sm" data-bet="${pi}:0">${esc(nameOfEnt(m.a))}</button><button type="button" class="btn btn-solve ar-sm" data-bet="${pi}:1">${esc(nameOfEnt(m.b))}</button><button type="button" class="btn btn-ghost ar-sm" data-bet="${pi}:-1">Pas</button></div></div>`).join('');
  const picks = Object.entries(b ? b.picks : {}).map(([pi, p]) => `<span class="ar-tag">${esc(v.players[pi].name)}: ${p.side < 0 ? 'pas' : `${p.amt}🪙 → ${esc(nameOfEnt(p.side ? m.b : m.a))}`}</span>`).join('');
  return `<div class="ar-card">${matchCard()}${rows ? `<div class="ar-stake"><span>Miktar:</span>${[10, 25, 50, 'all'].map(a => `<button type="button" class="${L.betAmt === a ? 'on' : ''}" data-amt="${a}">${a === 'all' ? 'Hepsi' : a}</button>`).join('')}</div>${rows}` : '<p class="g-sub">Seyirciler bahislerini yapıyor…</p>'}
    <div class="ar-ready">${picks}</div><p class="g-sub">Doğru tahmin bahsi ikiye katlar. Sikkeler sonuçta puana eklenir.</p></div>`;
}
function bracketHtml() {
  const v = V, br = v.br; if (!br) return '';
  const cur = v.match && !v.match.winner && ['intro', 'bet', 'fight', 'boutover', 'inter'].includes(v.phase) ? [v.match.r, v.match.m] : null;
  return `<div class="ar-br">${br.map((rd, r) => `<div class="ar-brc"><h4>${roundName(br, r)}</h4>${rd.map((x, m) => `<div class="ar-bm ${cur && cur[0] === r && cur[1] === m ? 'on' : ''}">${[x.a, x.b].map(e => `<span class="${x.w != null ? (x.w === e ? 'w' : 'l') : ''}" style="--pc:${e != null ? v.ents[e].color : '#555'}">${e != null ? esc(v.ents[e].name) : '—'}</span>`).join('')}</div>`).join('')}</div>`).join('')}</div>`;
}
function pBracket() { return `<div class="ar-card"><h3 class="ar-h">🏟️ Turnuva</h3>${bracketHtml()}<p class="g-sub">Sıradaki maç birazdan…</p></div>`; }
function pFight() {
  const v = V, fi = v.fight; if (!fi) return '';
  const can = canActFight() && !fi.busy && !timing && apIdle() && v.phase === 'fight';
  L.lastCan = can;
  const side = fi.turn, F = fi.f[side];
  if (v.phase !== 'fight') {
    const w = fi.over ? fi.f[fi.over.win] : null, m = v.match;
    return `<div class="ar-card"><h3 class="ar-h">${w ? `🏆 ${esc(w.name)} rauntu aldı${fi.over.how === 'karar' ? ' (hakem kararı)' : ''}!` : '⏳'}</h3>${m && v.phase === 'inter' ? `<p class="g-sub">Skor: ${esc(fi.f[0].name)} ${m.wins[0]} – ${m.wins[1]} ${esc(fi.f[1].name)}${v.phase === 'inter' ? ' · sıradaki raunt birazdan' : ''}</p>` : `<p class="g-sub">${v.mode === 'kariyer' ? 'Ödüller hesaplanıyor…' : 'Kalabalık ayakta!'}</p>`}</div>`;
  }
  const showActs = canActFight() || (myPis().some(pi => fi.f.some(x => x.ctl.pi === pi)) && v.phase === 'fight');
  if (!showActs) {
    const b = v.bet, mineBet = b && myPis().map(pi => b.picks[pi]).find(Boolean);
    return `<div class="ar-card"><p class="g-sub">👀 İzliyorsun${mineBet && mineBet.side >= 0 ? ` · bahsin: ${mineBet.amt}🪙 → ${esc(fi.f[mineBet.side].name)}` : ''}</p>${v.br ? bracketHtml() : ''}${helpHtml()}</div>`;
  }
  const S0 = fi.f.find(x => myPis().includes(x.ctl.pi)) || F;
  const me = canActFight() ? F : S0, si = me.side;
  const Lg = legalMap(fi, si), d = distOf(fi), w = weaponOf(me);
  const dirIcon = si === 0 ? '➡️' : '⬅️', backIcon = si === 0 ? '⬅️' : '➡️';
  const pct = kind => Math.round(hitChance(fi, si, kind, .6) * 100);
  const B = (k, ic, nm, sub, extra = '') => `<button type="button" class="ar-act ${extra}" data-k="${k}" ${can && Lg[k] && fi.turn === si ? '' : 'disabled'}><i>${ic}</i><b>${nm}</b><small>${sub}</small></button>`;
  const ready = me.cos >= 100;
  let h = `<div class="ar-acts">
    ${B('ilerle', dirIcon, 'İlerle', `💨${costOf(me, 'ilerle')} · ${Math.min(stepsOf(me, 'ilerle'), Math.max(1, d - 1))} adım`)}
    ${B('geri', backIcon, 'Geri Çekil', `💨${costOf(me, 'geri')}`)}
    ${B('savun', '🛡️', 'Savunma', '+💨 · blok')}
    ${B('hizli', '🗡️', 'Hızlı', d <= w.reach ? `%${pct('hizli')} · 💨${costOf(me, 'hizli')}` : `menzil ${w.reach}`)}
    ${B('normal', '⚔️', 'Normal', d <= w.reach ? `%${pct('normal')} · 💨${costOf(me, 'normal')}` : `menzil ${w.reach}`)}
    ${B('guclu', '💥', 'Güçlü', d <= w.reach ? `%${pct('guclu')} · 💨${costOf(me, 'guclu')}` : `menzil ${w.reach}`)}
    ${B('goster', '🎭', 'Gösteri', '🎉↑ · 💨4')}
    ${B('dinlen', '😮‍💨', 'Dinlen', `+💨${Math.round(12 + eff(me).nef * 1.2)}`)}
    ${B('ozel', '🦅', SPECIAL_N[w.kind], ready ? (Lg.ozel ? 'HAZIR!' : 'yaklaş') : `🎉 ${me.cos}/100`, ready ? 'gold' : '')}
  </div>`;
  const its = ITEM_KEYS.filter(k => me.items[k] > 0);
  if (its.length) h += `<div class="ar-acts items">${its.map(k => `<button type="button" class="ar-act" data-k="esya" data-it="${k}" ${can && Lg['esya:' + k] ? '' : 'disabled'}><i>${ITEMS[k].i}</i><b>${ITEMS[k].n} ×${me.items[k]}</b><small>💨4</small></button>`).join('')}</div>`;
  return `<div class="ar-card ar-fightp">${h}${helpHtml()}</div>`;
}
function helpHtml() {
  return `<details class="ar-det"><summary>❓ Nasıl oynanır?</summary><ul class="ar-help">
    <li><b>Nefes</b> 💨 her hamlenin yakıtıdır; biterse Dinlen ya da Savunma ile topla. Dinlenirken savunmasızsın.</li>
    <li><b>Saldırıda</b> kayan işareti altın bölgede durdur: <b>KUSURSUZ</b> = kesin isabet, 1,5× hasar.</li>
    <li><b>Savunma</b> hızlı vuruşları neredeyse tamamen keser; güçlü vuruş savunmayı dağıtır.</li>
    <li><b>Coşku</b> 🎉 çeşitli hamleler, gösteri ve geri dönüşlerle dolar; dolunca özel hamle açılır. Aynı hamleyi üst üste yapma, kalabalık sıkılır!</li>
    <li>Zırh her darbede ezilir, kırılan parça korumaz. Mızrak 2 kare uzaktan vurur.</li></ul></details>`;
}
function pDone() {
  const v = V;
  if (v.mode === 'kariyer') return '<div class="ar-card"><p class="g-sub">Kariyer kaydedildi. "Tekrar oyna" ile kaldığın yerden devam edersin.</p></div>';
  return `<div class="ar-card"><h3 class="ar-h">🏁 Bitti</h3>${v.br ? bracketHtml() : matchCard()}</div>`;
}

/* ------------------------------------------------------------------ etkileşim */
function onPanelClick(e) {
  const b = e.target.closest('button, [data-opp], [data-try]'); if (!b || b.disabled || !V) return;
  Sound.init && Sound.init();
  const d = b.dataset, v = V;
  if (d.k) { const k = d.k; if (k === 'hizli' || k === 'normal' || k === 'guclu') { startTiming(k); return; } ui.send(Object.assign({ t: 'act', k, it: d.it, acc: k === 'ozel' ? 1 : undefined }, asField())); renderPanel(true); return; }
  if (d.tab) { L.tab = d.tab; L.tryOn = null; L.selOpp = null; renderPanel(true); return; }
  if (d.shop) { L.shop = d.shop; L.tryOn = null; renderPanel(true); return; }
  if (d.arena != null) { L.selArena = +d.arena; L.selOpp = null; renderPanel(true); return; }
  if (d.fight) { if (d.fight === 'legend') ui.send({ t: 'fight', legend: true }); else { const [a, i] = d.fight.split(':').map(Number); ui.send({ t: 'fight', a, i }); } L.selOpp = null; return; }
  if (d.opp != null && !e.target.closest('button')) { L.selOpp = +d.opp; renderPanel(true); return; }
  if (d.buy) { ui.send({ t: 'buy', id: d.buy }); L.tryOn = null; return; }
  if (d.sell) { CF.confirmBox ? CF.confirmBox('Sat', `${GEAR[d.sell].name} yarı fiyatına satılsın mı?`, 'Sat').then(ok => { if (ok) ui.send({ t: 'sell', id: d.sell }); }) : ui.send({ t: 'sell', id: d.sell }); return; }
  if (d.equip) { ui.send({ t: 'equip', id: d.equip }); L.tryOn = null; return; }
  if (d.unequip) { ui.send({ t: 'unequip', slot: d.unequip }); return; }
  if (d.try && !e.target.closest('button')) { L.tryOn = L.tryOn === d.try ? null : d.try; renderPanel(true); return; }
  if (d.alloc) { ui.send({ t: 'alloc', k: d.alloc }); return; }
  if (d.hlook) { const look = Object.assign({}, v.car.look, { [d.hlook]: +d.v }); ui.send({ t: 'look', look }); return; }
  if (d.clook) { L.create.look[d.clook] = +d.v; renderPanel(true); return; }
  if (d.cst) { const c = L.create, left = CREATE.pts - SK.reduce((t, k) => t + c.S[k] - CREATE.base, 0), dd = +d.d; if (dd > 0 && left > 0 && c.S[d.cst] < CREATE.max) c.S[d.cst]++; if (dd < 0 && c.S[d.cst] > CREATE.base) c.S[d.cst]--; renderPanel(true); return; }
  if (d.curtain != null) { L.curtain = +d.curtain; renderPanel(true); return; }
  if (d.amt) { L.betAmt = d.amt === 'all' ? 'all' : +d.amt; renderPanel(true); return; }
  if (d.bet) { const [pi, side] = d.bet.split(':').map(Number); ui.send({ t: 'bet', side, amt: L.betAmt, as: pi }); return; }
  const pi = draftPi(), dr = pi != null ? L.draft[pi] : null;
  if (d.preset && dr) { const p = PRESETS.find(x => x.id === d.preset); Object.assign(dr, { preset: p.id, S: Object.assign({}, p.S), gear: Object.assign({}, p.gear), items: Object.assign({ ates: 0, sifa: 0, sis: 0 }, p.items) }); renderPanel(true); return; }
  if (d.dst && dr) { const left = DRAFT.pts - SK.reduce((t, k) => t + dr.S[k] - DRAFT.base, 0), dd = +d.d; if (dd > 0 && left > 0 && dr.S[d.dst] < DRAFT.max) dr.S[d.dst]++; if (dd < 0 && dr.S[d.dst] > DRAFT.base) dr.S[d.dst]--; dr.preset = null; renderPanel(true); return; }
  if (d.ditem && dr) { if (itemCount(dr.items) < ITEM_MAX && DRAFT.gold - draftCost(dr) >= ITEMS[d.ditem].price) dr.items[d.ditem]++; renderPanel(true); return; }
  switch (d.a) {
    case 'crand': L.create.look = randomLook(Math.random); renderPanel(true); return;
    case 'create': { const c = L.create; const inp = q('[data-f="cname"]'); ui.send({ t: 'create', name: inp ? inp.value : c.name, look: c.look, S: c.S }); return; }
    case 'next': ui.send({ t: 'next' }); return;
    case 'leave': ui.send({ t: 'leave' }); return;
    case 'retire': (CF.confirmBox ? CF.confirmBox('Emekli ol', 'Kahramanın emekliye ayrılacak ve kayıt silinecek. Yeni bir kahramanla baştan başlarsın.', 'Emekli ol') : Promise.resolve(true)).then(ok => { if (ok) ui.send({ t: 'retire' }); }); return;
    case 'repair': ui.send({ t: 'repair' }); return;
    case 'drand': if (dr) { dr.look = randomLook(Math.random); renderPanel(true); } return;
    case 'dclear': if (dr) { dr.items = { ates: 0, sifa: 0, sis: 0 }; renderPanel(true); } return;
    case 'dcar': if (dr) { const c = loadCareer(); if (c) { dr.car = true; dr.carBuild = Object.assign(heroBuild(c), { lvl: c.lvl }); } renderPanel(true); } return;
    case 'dcar0': if (dr) { dr.car = false; renderPanel(true); } return;
    case 'lock': if (dr) { const b = dr.car && dr.carBuild ? dr.carBuild : { look: dr.look, S: dr.S, gear: dr.gear, items: dr.items }; ui.send({ t: 'lock', build: b, car: !!(dr.car && dr.carBuild), as: pi }); L.curtain = -1; } return;
    default:
  }
}
function onPanelChange(e) {
  const s = e.target;
  if (s.matches('[data-dgear]')) { const pi = draftPi(), dr = pi != null ? L.draft[pi] : null; if (!dr) return; const sl = s.dataset.dgear; dr.gear[sl] = s.value || (sl === 'w' ? 'sopa' : null); if (sl === 'w' && GEAR[dr.gear.w].two) dr.gear.s = null; dr.preset = null; renderPanel(true); }
  if (s.matches('[data-f="hname"]') && V && V.car) ui.send({ t: 'look', look: V.car.look, name: s.value });
}
function onPanelInput(e) { const s = e.target; if (s.matches('[data-f="cname"]') && L.create) L.create.name = s.value; }
function onKey(e) {
  if (!root || !V) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  if (timing && (e.code === 'Space' || e.code === 'Enter')) { e.preventDefault(); hitTiming(false); return; }
  if (V.phase === 'fight' && /^Digit[1-9]$/.test(e.code)) {
    const btns = [...panelEl.querySelectorAll('.ar-act')]; const b = btns[+e.code.slice(5) - 1];
    if (b && !b.disabled) { e.preventDefault(); b.click(); }
  }
}
function onStageDown(e) { if (timing && !timing.done) { e.preventDefault(); hitTiming(false); } }

/* ------------------------------------------------------------------ yaşam döngüsü */
function mount(r, api) {
  root = r; ui = api; V = null; AP.q = []; AP.cur = null; AP.fid = null; parts = []; floats = []; hud = null; timing = null; bgKey = ''; cam.init = false;
  L.create = null; L.draft = {}; L.tab = 'arena'; L.shop = 'w'; L.selArena = null; L.selOpp = null; L.tryOn = null; L.curtain = -1; L.key = ''; L.hudKey = '';
  actors = [mkActor(0), mkActor(1)];
  root.innerHTML = `<div class="g-wrap ar">
    <div class="g-players ar-chips" hidden></div>
    <div class="g-status ar-status"></div>
    <div class="ar-hud" hidden></div>
    <div class="ar-stage"><canvas class="ar-cv" aria-label="Arena"></canvas>
      <div class="ar-callout"></div>
      <div class="ar-timing" hidden><div class="ar-tlabel">🎯 <b class="ar-tname"></b> · işareti altında durdur!</div><div class="ar-tbar"><i class="ar-tgood"></i><i class="ar-tperf"></i><b class="ar-tmark"></b></div><div class="ar-tres"></div><button type="button" class="btn btn-spin ar-tbtn">VUR!</button></div>
    </div>
    <div class="ar-panel"></div>
  </div>`;
  cv = q('.ar-cv'); cg = cv.getContext('2d'); stageEl = q('.ar-stage'); hudEl = q('.ar-hud'); panelEl = q('.ar-panel');
  panelEl.addEventListener('click', onPanelClick); panelEl.addEventListener('change', onPanelChange); panelEl.addEventListener('input', onPanelInput);
  stageEl.addEventListener('pointerdown', onStageDown);
  q('.ar-tbtn').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); hitTiming(false); });
  document.addEventListener('keydown', onKey);
  if (window.ResizeObserver) { ro = new ResizeObserver(() => resize()); ro.observe(stageEl); }
  addEventListener('resize', resize);
  requestAnimationFrame(resize);
  raf = requestAnimationFrame(frame);
}
let statusT = 0;
function render(v) {
  const prev = V; V = v;
  if (!SW) resize();
  if (v.fight) syncFight(v); else { AP.fid = null; AP.q = []; AP.cur = null; }
  if (v.phase !== 'draft') L.curtain = -1;
  if (prev && prev.phase !== v.phase) { if (v.phase === 'town') { L.selOpp = null; L.tryOn = null; } if (v.phase === 'create') L.create = null; }
  renderHud(); renderPanel();
  clearInterval(statusT);
  if (v.phase === 'bet' || v.phase === 'fight') statusT = setInterval(() => { if (!V) return; renderStatus(); renderHud(); if (V.phase === 'fight' && !L.lastCan && apIdle() && canActFight() && !V.fight.busy && !timing) renderPanel(true); }, 400);
}
function onEvent(e) {
  if (!V) return;
  if (e.t === 'bout') { setTimeout(() => callout(V && V.mode === 'kariyer' ? 'DÖVÜŞ!' : `${e.b}. RAUNT`, 'gold'), 150); sfx('crowd'); }
  else if (e.t === 'matchwin') { Sound.fanfare && SFX_ON() && Sound.fanfare(); FX.confetti && FX.confetti(80); if (V.ents && V.ents[e.e]) banner(`${V.ents[e.e].name.toLocaleUpperCase('tr-TR')} KAZANDI!`, 'good'); }
  else if (e.t === 'cwin') { Sound.solve && SFX_ON() && Sound.solve(); if (e.champ) { FX.confetti && FX.confetti(140); banner(e.legend ? 'EFSANE!' : 'ŞAMPİYON!', 'good'); } else banner('ZAFER!', 'good'); }
  else if (e.t === 'closs') { Sound.bad && SFX_ON() && Sound.bad(); banner('YENİLGİ', 'bad'); }
  else if (e.t === 'lvl') { Sound.special && SFX_ON() && Sound.special(); setTimeout(() => banner(`SEVİYE ${e.l}!`, 'pink'), 1900); }
  else if (e.t === 'buy' || e.t === 'sell') { Sound.buy && SFX_ON() && Sound.buy(); }
  else if (e.t === 'payout') { if (myPis().includes(e.pi)) { if (e.ok) { Sound.good && SFX_ON() && Sound.good(); } else if (Sound.bad && SFX_ON()) Sound.bad(); } }
  else if (e.t === 'lock' || e.t === 'bet') { Sound.tick && SFX_ON() && Sound.tick(.4); }
  else if (e.t === 'draft' || e.t === 'match') { sfx('crowd'); }
}
function onFast(m) {
  if (!V || !V.fight || m.aim == null) return;
  const fi = V.fight, side = fi.f.findIndex(F => F.ctl.pi === m.seat);
  if (side >= 0) aimMark = { side, until: performance.now() + 2200 };
}
function unmount() {
  removeEventListener('resize', resize); document.removeEventListener('keydown', onKey);
  if (ro) { ro.disconnect(); ro = null; }
  if (raf) cancelAnimationFrame(raf); raf = 0; clearInterval(statusT); clearTimeout(calloutT);
  root = null; ui = null; V = null; cv = null; cg = null; stageEl = null; hudEl = null; panelEl = null; bg = null; timing = null;
}

CF.registerGame(Object.assign({
  id: 'arena', name: 'Arena Ustası', icon: '⚔️', color: '#e8a33d', min: 1, max: 8, hotseat: true, bot: true, localMin: 1,
  tagline: 'Gladyatör ol: kum, kalkan ve kalabalığın coşkusu',
  rules: 'Sıra tabanlı gladyatör düellosu: ilerle, geri çekil, üç tür saldırı, savunma, gösteri ve dinlenme arasında seç; her hamle Nefes harcar. Saldırıda kayan işareti tam zamanında durdurursan KUSURSUZ vurursun; kalabalığın Coşkusu dolunca özel hamlen açılır. Kariyer\'de kahramanını yetiştirip 5 arenayı fethet, Düello ve Turnuva\'da eşit kurulumla dövüş, seyirciler bahse girsin.',
  options: [
    { key: 'mod', label: 'Mod', def: 'kariyer', choices: [{ v: 'kariyer', label: '🏛️ Kariyer' }, { v: 'duello', label: '⚔️ Düello' }, { v: 'turnuva', label: '🏆 Turnuva' }] },
    { key: 'zorluk', label: 'Bot zorluğu', def: 'orta', choices: [{ v: 'kolay', label: 'Kolay' }, { v: 'orta', label: 'Orta' }, { v: 'zor', label: 'Zor' }] },
    { key: 'mac', label: 'Maç', def: '3', choices: [{ v: '3', label: '3 rauntta 2' }, { v: '1', label: 'Tek raunt' }] },
    { key: 'arena', label: 'Arena (Düello/Turnuva)', def: 'rastgele', choices: [{ v: 'rastgele', label: '🎲 Rastgele' }].concat(ARENAS.map(a => ({ v: a.id, label: `${a.i} ${a.n}` }))) },
    { key: 'boyut', label: 'Turnuva boyutu', def: 'oto', choices: [{ v: 'oto', label: 'Otomatik (4/8)' }, { v: '8', label: '8 kişilik' }] },
    { key: 'kahraman', label: 'Kahraman (Düello/Turnuva)', def: 'esit', choices: [{ v: 'esit', label: 'Eşit kurulum' }, { v: 'kariyer', label: 'Kariyer kahramanımla' }] }
  ],
  mount, render, onEvent, onFast, unmount,
  _ar: { TUNE, GEAR, GEAR_LIST, ITEMS, ARENAS, OPP, PRESETS, DRAFT, CREATE, STATS, SK, makeFighter, newFight, perform, legal, legalMap, hitChance, effAcc, critFloor, strike, aiPick, aiAcc, costOf, distOf,
    careerNew, validCareer, loadCareer, saveCareer, oppDef, legendOpp, rewardFor, addXp, xpNeed, equip, repairCost, careerPoints, priceFor, meetsReq, effStats, hpMaxOf, staMaxOf,
    validDraft, draftCost, presetBuild, bracketNew, bracketNext, bracketSet, bracketChampion, placeOf, stepDur, mulberry32, cam: () => cam, actors: () => actors, AP: () => AP }
}, RULES));
})();
