/* =========================================================================
   MUTFAK KAOSU — gerçek zamanlı, birlikte oynanan çılgın mutfak
     · Siparişler gelir; malzemeyi kasadan al, tahtada doğra, tava / tencere /
       fırında pişir, temiz tabağa koy, servis penceresine yetiştir.
     · Yöneten cihaz (yerel ya da oda kurucusu) mutfağın tamamına sahiptir:
       tezgâhtaki eşyalar, eldeki eşyalar, istasyon ilerlemeleri (mutlak zaman
       damgalarıyla), siparişler, yangınlar. Her hamle ona eylem olarak gider.
     · Her cihaz yalnızca kendi aşçısının hareketini tahmin eder ve konumunu
       hızlı kanaldan (ui.fast) yayar; diğerleri ara değerlemeyle çizilir.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, flash, initial } = window.CFX;

/* ------------------------------------------------------------------ sabitler */
const TAU = Math.PI * 2;
const RAD = 0.31;                       // aşçı yarıçapı (karo biriminde)
const SPEED = 3.9, BOT_SPEED = 3.45, DASH_V = 9.6, DASH_MS = 230, DASH_CD = 900;
const CHOP_MS = 2100, WASH_MS = 1900, COUNT_MS = 3600, END_MS = 5600, RETURN_MS = 6500;
const REACH = 1.62, CAP = 3, TICK = 100, SPRAY_MS = 900, FIRE_HP_MS = 1100;
const COOK = {
  pot: { n: 'Tencere', ms: 10500, burn: 9500 },
  pan: { n: 'Tava', ms: 6500, burn: 7000 },
  tray: { n: 'Fırın', ms: 8500, burn: 8500 }
};
const DIFF = {
  kolay: { n: 'Kolay', ord: 1.35, gap: 1.3, burn: 1.5, pen: 5, star: .8, spread: 13000 },
  normal: { n: 'Normal', ord: 1, gap: 1, burn: 1, pen: 10, star: 1, spread: 9000 },
  zor: { n: 'Zor', ord: .8, gap: .82, burn: .75, pen: 15, star: 1.2, spread: 6500 }
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pickR = arr => arr[Math.floor(Math.random() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const r2 = v => Math.round(v * 100) / 100;

/* ------------------------------------------------------------------ malzemeler ve tarifler
   Bileşen gösterimi: "domates" çiğ, "domates*" doğranmış, "domates*@pan" doğranıp tavada pişmiş. */
const ING = {
  domates: { n: 'Domates', chop: true },
  marul: { n: 'Marul', chop: true },
  biber: { n: 'Biber', chop: true },
  sogan: { n: 'Soğan', chop: true },
  kasar: { n: 'Kaşar', chop: true },
  et: { n: 'Döner eti' },
  kiyma: { n: 'Kıyma' },
  kofte: { n: 'Köfte' },
  yumurta: { n: 'Yumurta' },
  mercimek: { n: 'Mercimek' },
  hamur: { n: 'Hamur' },
  lavas: { n: 'Lavaş' },
  ekmek: { n: 'Ekmek' }
};
const DISHES = {
  salata: { n: 'Salata', c: ['domates*', 'marul*'], pts: 20, t: 62 },
  durum: { n: 'Döner Dürüm', c: ['et@pan', 'domates*', 'lavas'], pts: 36, t: 80 },
  menemen: { n: 'Menemen', c: ['yumurta@pan', 'domates*@pan', 'biber*@pan'], pts: 38, t: 88 },
  corba: { n: 'Mercimek Çorbası', c: ['mercimek@pot', 'mercimek@pot', 'sogan*@pot'], pts: 34, t: 90 },
  pide: { n: 'Kaşarlı Pide', c: ['hamur@tray', 'kasar*@tray'], pts: 30, t: 80 },
  lahmacun: { n: 'Lahmacun', c: ['hamur@tray', 'kiyma@tray', 'biber*@tray'], pts: 38, t: 88 },
  kofte: { n: 'Köfte Ekmek', c: ['kofte@pan', 'ekmek', 'sogan*'], pts: 34, t: 80 }
};
const parseComp = s => { const at = s.indexOf('@'), ck = at >= 0 ? s.slice(at + 1) : '', base = at >= 0 ? s.slice(0, at) : s; return { ing: base.replace('*', ''), ch: base.endsWith('*'), ck, pre: base }; };
const ingKey = it => it.i + (it.ch ? '*' : '');                       // pişmemiş hâli
// a, b'nin alt çoklu kümesi mi?
function subMulti(a, b) {
  const m = new Map(); b.forEach(x => m.set(x, (m.get(x) || 0) + 1));
  for (const x of a) { const k = m.get(x) || 0; if (!k) return false; m.set(x, k - 1); }
  return true;
}
const sameMulti = (a, b) => a.length === b.length && subMulti(a, b);
const minus = (b, a) => { const out = b.slice(); a.forEach(x => { const k = out.indexOf(x); if (k >= 0) out.splice(k, 1); }); return out; };

/* ------------------------------------------------------------------ MUTFAKLAR
   Harita karakterleri:
   _ duvar  . zemin  i buzlu zemin  r halı  L kayan ada şeridi (zemin)
   # tezgâh  C doğrama tahtası  S ocak  O fırın  W evye  P temiz tabak rafı  R kirli tabak dönüşü
   X servis penceresi  T çöp  E yangın tüplü tezgâh  > < ^ v yürüyen bant  M pazar tezgâhı (bant başı)  Z bant sonu
   küçük harfler: malzeme kasaları (mutfağa göre)                                                        */
const KITCHENS = {
  mahalle: {
    n: 'Mahalle Lokantası', icon: '🏠', theme: 'mahalle', twist: 'Klasik mahalle mutfağı: önce ısın, sonra hızlan!',
    dishes: ['salata', 'durum', 'corba'], crates: { d: 'domates', m: 'marul', e: 'et', l: 'lavas', k: 'mercimek', s: 'sogan' }, stoves: ['pot', 'pan', 'pan'],
    grid: [
      '#dmel#SSS#XX#',
      '#...........R',
      's...........#',
      'k...#CC##...W',
      '#...........P',
      '#...........#',
      'T...##..#C..#',
      '#...........#',
      '########E####'
    ],
    spawns: [[2, 2], [9, 2], [2, 5], [9, 5], [6, 5], [6, 1]], star: [32, 62, 92]
  },
  bolunmus: {
    n: 'İkiye Bölünmüş Mutfak', icon: '🧱', theme: 'bolunmus', twist: 'Ortadaki tezgâh mutfağı ikiye bölüyor: eşyaları tezgâhın üstünden karşıya uzat! Alttaki kapı uzun yol.',
    dishes: ['menemen', 'kofte', 'salata'], crates: { y: 'yumurta', d: 'domates', b: 'biber', k: 'kofte', s: 'sogan', m: 'marul', x: 'ekmek' }, stoves: ['pan', 'pan', 'pan'],
    grid: [
      '#ydbks#SSS#X#',
      'm.....#.....R',
      'x.....#.....#',
      '#.....#.....W',
      'C.....#.....P',
      'C.....#.....#',
      'T.....#.....T',
      '#...........E',
      '#############'
    ],
    door: [[6, 7]], split: 6.5, solo: .55,
    spawns: [[3, 3], [9, 3], [3, 5], [9, 5], [2, 1], [8, 1]], star: [26, 52, 80]
  },
  vapur: {
    n: 'Vapur Mutfağı', icon: '⛴️', theme: 'vapur', twist: 'Vapur sallanıyor! Ortadaki kayan tezgâh geçidi bir üstten bir alttan kapatır.',
    dishes: ['corba', 'kofte', 'salata'], crates: { k: 'mercimek', x: 'ekmek', s: 'sogan', d: 'domates', m: 'marul', f: 'kofte' }, stoves: ['pot', 'pan', 'pot'],
    grid: [
      '#kxsdm#SSS#X#',
      '#.....#.....R',
      'f.....L.....#',
      'C.....L.....W',
      'C.....L.....P',
      '#.....L.....#',
      'T.....L.....#',
      '#.....#.....T',
      '##E#######E##'
    ],
    mover: { c: 6, rA: 2, rB: 4, cells: ['counter', 'board', 'counter'], dwell: 8000, slide: 1400 },
    sway: { amp: .8, period: 8000 }, solo: .85,
    spawns: [[3, 3], [9, 3], [3, 5], [9, 5], [2, 1], [9, 1]], star: [24, 48, 74]
  },
  kar: {
    n: 'Kar Fırtınası Kulübesi', icon: '❄️', theme: 'kar', twist: 'Kulübenin zemini buz tuttu: kayarsın! Erken fren yap, halılarda tutunursun.',
    dishes: ['corba', 'pide', 'lahmacun'], crates: { h: 'hamur', a: 'kasar', q: 'kiyma', b: 'biber', k: 'mercimek', s: 'sogan' }, stoves: ['pot', 'pot'],
    grid: [
      '#haqb#OO##XX#',
      '#rrrr.iii.rrR',
      'k..iiiiiiii.#',
      's.iii#CC#ii.W',
      '#.iiiiiiiii.P',
      'S.ii##..##i.#',
      'S.iiiiiiiii.T',
      '#rrr.iiii.rr#',
      '#####E#######'
    ],
    spawns: [[1, 1], [11, 1], [1, 4], [11, 4], [6, 7], [4, 1]], star: [26, 52, 80]
  },
  pazar: {
    n: 'Gece Pazarı', icon: '🏮', theme: 'pazar', twist: 'Malzeme kasası yok: her şey yürüyen banttan gelir. Kaçırırsan bant sonunda kaybolur!',
    dishes: ['durum', 'lahmacun', 'kofte'], crates: {}, stoves: ['pan', 'pan'],
    grid: [
      '#SSOO#CC#XX##',
      '#...........R',
      '#...........#',
      'T...........#',
      'M>>>>>>Z....#',
      '#...........W',
      'C...........P',
      '#...........E',
      '##C##########'
    ],
    beltMs: 1050, supplyMs: 1500,
    spawns: [[3, 2], [8, 2], [3, 6], [8, 6], [11, 3], [6, 1]], star: [24, 48, 74]
  }
};
const KIT_IDS = Object.keys(KITCHENS);

/* ---- harita çözümleme (statik; her cihazda aynı) ---- */
const kcache = {};
function kitchen(id) {
  if (kcache[id]) return kcache[id];
  const def = KITCHENS[id], grid = def.grid, H = grid.length, W = grid[0].length;
  const solid = [], ice = [], rug = [], lane = [], sat = [];
  const st = [];
  const add = (k, c, r, extra) => { const s = Object.assign({ i: st.length, k, c, r }, extra || {}); st.push(s); return s; };
  let stoveN = 0;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const ch = grid[r][c], idx = r * W + c;
    solid[idx] = !'.irL'.includes(ch); ice[idx] = ch === 'i'; rug[idx] = ch === 'r'; lane[idx] = ch === 'L'; sat[idx] = -1;
    let s = null;
    if (ch === '#') s = add('counter', c, r);
    else if (ch === 'E') s = add('counter', c, r, { ext: 1 });
    else if (ch === 'C') s = add('board', c, r);
    else if (ch === 'S') s = add('stove', c, r, { cont: def.stoves[stoveN++ % def.stoves.length] });
    else if (ch === 'O') s = add('oven', c, r);
    else if (ch === 'W') s = add('sink', c, r);
    else if (ch === 'P') s = add('rack', c, r);
    else if (ch === 'R') s = add('ret', c, r);
    else if (ch === 'X') s = add('window', c, r);
    else if (ch === 'T') s = add('trash', c, r);
    else if ('><^v'.includes(ch)) s = add('belt', c, r, { dir: ch });
    else if (ch === 'M' || ch === 'Z' || ch === '_') s = null;
    else if (def.crates[ch]) s = add('crate', c, r, { ing: def.crates[ch] });
    if (s) sat[idx] = s.i;
  }
  let mover = null;
  if (def.mover) {
    const m = def.mover;
    mover = Object.assign({}, m, { ids: m.cells.map((k, dr) => add(k, m.c, m.rA + dr, { mv: 1, dr }).i) });
  }
  // bant sırası: M'nin yanındaki banttan başlayıp okları izle
  const belt = [], isB = (c, r) => c >= 0 && r >= 0 && c < W && r < H && '><^v'.includes(grid[r][c]);
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (grid[r][c] === 'M') {
    let cur = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [c + dx, r + dy]).find(([a, b]) => isB(a, b));
    const seen = new Set();
    while (cur && isB(cur[0], cur[1]) && !seen.has(cur[1] * W + cur[0])) {
      seen.add(cur[1] * W + cur[0]); const s = st[sat[cur[1] * W + cur[0]]]; belt.push(s.i);
      const d = { '>': [1, 0], '<': [-1, 0], '^': [0, -1], 'v': [0, 1] }[s.dir]; cur = [cur[0] + d[0], cur[1] + d[1]];
    }
  }
  const dishes = def.dishes.map(d => DISHES[d]);
  // pişirici grupları: her tarifin aynı pişiriciye giden bileşenleri (pişmemiş hâlleriyle)
  const groups = { pot: [], pan: [], tray: [] };
  def.dishes.forEach(d => {
    const by = {};
    DISHES[d].c.forEach(s => { const p = parseComp(s); if (p.ck) (by[p.ck] = by[p.ck] || []).push(p.pre); });
    Object.keys(by).forEach(k => groups[k].push(by[k]));
  });
  const ings = [...new Set(def.dishes.flatMap(d => DISHES[d].c.map(s => parseComp(s).ing)))];
  const K = { id, def, W, H, solid, ice, rug, lane, sat, st, mover, belt, dishes, groups, ings, hasOven: grid.some(r => r.includes('O')) };
  return (kcache[id] = K);
}

/* ---- kayan ada: zamana bağlı konum (tüm cihazlarda aynı) ---- */
function moverRow(K, t0, now) {
  const m = K.mover; if (!m) return null;
  if (!t0 || now < t0) return m.rA;
  const cyc = 2 * (m.dwell + m.slide), u = (now - t0) % cyc;
  const ease = x => x * x * (3 - 2 * x);
  if (u < m.dwell) return m.rA;
  if (u < m.dwell + m.slide) return m.rA + (m.rB - m.rA) * ease((u - m.dwell) / m.slide);
  if (u < 2 * m.dwell + m.slide) return m.rB;
  return m.rB + (m.rA - m.rB) * ease((u - 2 * m.dwell - m.slide) / m.slide);
}
function moverSliding(K, t0, now) {
  const m = K.mover; if (!m || !t0 || now < t0) return false;
  const u = (now - t0) % (2 * (m.dwell + m.slide));
  return (u >= m.dwell && u < m.dwell + m.slide) || u >= 2 * m.dwell + m.slide;
}
function moverNext(K, t0, now) {   // bir sonraki hareketin başlamasına kalan ms
  const m = K.mover; if (!m || !t0) return 0;
  const cyc = 2 * (m.dwell + m.slide), u = (now - t0) % cyc;
  if (u < m.dwell) return m.dwell - u;
  if (u < m.dwell + m.slide) return 0;
  if (u < 2 * m.dwell + m.slide) return 2 * m.dwell + m.slide - u;
  return 0;
}
// İstasyonun anlık karo konumu (kayan adadakiler için yuvarlanmış satır)
function stCell(K, s, mrow) { if (!s.mv) return [s.c, s.r]; return [s.c, Math.round(mrow) + s.dr]; }
function stPos(K, s, mrow) { if (!s.mv) return [s.c + .5, s.r + .5]; return [s.c + .5, mrow + s.dr + .5]; }
// Sallanma (vapur): yatay sürüklenme hızı
function swayAt(K, t0, now) { const sw = K.def.sway; if (!sw || !t0 || now < t0) return 0; return Math.sin((now - t0) / sw.period * TAU) * sw.amp; }

/* ------------------------------------------------------------------ fizik */
function solidAt(K, c, r) { if (c < 0 || r < 0 || c >= K.W || r >= K.H) return true; return K.solid[r * K.W + c]; }
function moverRect(K, mrow) { const m = K.mover; return m ? { x: m.c, y: mrow, w: 1, h: m.cells.length } : null; }
function walkable(K, c, r, mrow) {
  if (solidAt(K, c, r)) return false;
  if (K.mover && mrow !== null) { const m = K.mover; if (c === m.c && r + 1 > mrow + 1e-3 && r < mrow + m.cells.length - 1e-3) return false; }
  return true;
}
function pushRect(b, x, y, w, h, perp) {
  const cx = clamp(b.x, x, x + w), cy = clamp(b.y, y, y + h), dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
  if (d2 >= RAD * RAD) return false;
  if (perp) {   // kayan ada: şeridin yanına it (ezilme olmasın)
    const left = b.x < x + w / 2; b.x = left ? x - RAD - .001 : x + w + RAD + .001;
    if (left ? b.vx > 0 : b.vx < 0) b.vx = 0;
    return true;
  }
  if (d2 > 1e-9) { const d = Math.sqrt(d2), k = (RAD - d) / d; b.x += dx * k; b.y += dy * k; const vn = (b.vx * dx + b.vy * dy) / d; if (vn < 0) { b.vx -= vn * dx / d; b.vy -= vn * dy / d; } }
  else { const l = b.x - x, rt = x + w - b.x, t = b.y - y, bt = y + h - b.y, m = Math.min(l, rt, t, bt); if (m === l) b.x = x - RAD; else if (m === rt) b.x = x + w + RAD; else if (m === t) b.y = y - RAD; else b.y = y + h + RAD; }
  return true;
}
function collide(K, b, mrow) {
  for (let it = 0; it < 2; it++) {
    const c0 = Math.floor(b.x), r0 = Math.floor(b.y);
    for (let r = r0 - 1; r <= r0 + 1; r++) for (let c = c0 - 1; c <= c0 + 1; c++) if (solidAt(K, c, r)) pushRect(b, c, r, 1, 1, false);
    const mr = moverRect(K, mrow); if (mr) pushRect(b, mr.x, mr.y, mr.w, mr.h, true);
  }
  b.x = clamp(b.x, RAD, K.W - RAD); b.y = clamp(b.y, RAD, K.H - RAD);
}
// Ortak hareket adımı (yerel aşçı ve botlar)
function moveBody(K, b, ix, iy, spd, dt, env) {
  const c = Math.floor(b.x), r = Math.floor(b.y), onIce = c >= 0 && r >= 0 && c < K.W && r < K.H && K.ice[r * K.W + c];
  const tr = onIce ? 2.1 : 15, k = 1 - Math.exp(-tr * dt);
  const sx = env && env.sway ? env.sway : 0;
  b.vx += (ix * spd + sx - b.vx) * k; b.vy += (iy * spd - b.vy) * k;
  const sp = Math.hypot(b.vx, b.vy), n = Math.max(1, Math.ceil(sp * dt / .12));
  for (let i = 0; i < n; i++) { b.x += b.vx * dt / n; b.y += b.vy * dt / n; collide(K, b, env ? env.mrow : null); }
}
function freeSpot(K, x, y, mrow) { const b = { x, y, vx: 0, vy: 0 }; collide(K, b, mrow); return b; }

/* ------------------------------------------------------------------ eşyalar */
const isCont = it => it && (it.k === 'pot' || it.k === 'pan' || it.k === 'tray');
const cookOf = it => (it.k === 'tray' ? 'tray' : it.k);
function contProg(it, now) { if (!isCont(it) || !it.c.length) return 0; return it.p0 + (it.t ? (now - it.t) / COOK[cookOf(it)].ms : 0); }
const contDone = (it, now) => isCont(it) && it.c.length > 0 && !it.burnt && contProg(it, now) >= 1;
// tabak içeriği ve pişmiş kap içeriği, mutfaktaki bir tarifin parçası olabilir mi?
const plateFits = (K, list) => K.dishes.some(d => subMulti(list, d.c));
const contFits = (K, ck, list) => K.groups[ck].some(g => subMulti(list, g));
const contComplete = (K, it) => isCont(it) && it.c.length > 0 && K.groups[cookOf(it)].some(g => sameMulti(it.c, g));
const cookedOut = it => it.c.map(x => x + '@' + cookOf(it));
const dishOf = (K, list) => { if (!list || !list.length) return null; const k = K.def.dishes.find(d => sameMulti(list, DISHES[d].c)); return k || null; };

/* ------------------------------------------------------------------ KURALLAR (yöneten cihaz) */
let uiRef = null;
function fastOut(o) { if (uiRef && uiRef.fast && uiRef.mode === 'online') { try { uiRef.fast(o); } catch { /* */ } } }
const pname = (st, i) => (st.players[i] ? st.players[i].name : '?');
const KS = st => kitchen(st.kid);
const mrowOf = (st, now) => moverRow(KS(st), st.t0, now);
const TEAM_MUL = [1, 1, 1.45, 1.8, 2.1, 2.35, 2.55];
const PTS = { serve: 12, plate: 2, chop: 4, wash: 4, fire: 8, cook: 2, fetch: 1 };

function mkIng(st, ing) { return { id: ++st.idc, k: 'ing', i: ing, ch: 0, b: 0, cp: 0 }; }
function mkPlate(st, c) { return { id: ++st.idc, k: 'plate', c: c ? c.slice() : [] }; }
function mkCont(st, k) { return { id: ++st.idc, k, c: [], p0: 0, t: 0, burnt: 0, dn: 0, wr: 0 }; }
// Isınma: kap ocağa / fırına konunca tarif tamamsa döngü pişirmeyi başlatır (stepCook)
function heatSet(it, on, now) {
  if (!isCont(it)) return;
  if (!on && it.t) { it.p0 = contProg(it, now); it.t = 0; }
}
function contEmpty(it) { it.c = []; it.p0 = 0; it.t = 0; it.burnt = 0; it.dn = 0; it.wr = 0; }
function contAdd(it, key, now, heated) {
  it.c.push(key); it.p0 = 0; it.t = 0; it.dn = 0; it.wr = 0;   // tarif tamamlanınca pişmeye başlar
  void now; void heated;
}
const stationHeats = s => s.k === 'stove' || s.k === 'oven';
// Neden eklenemez? (null = eklenebilir)
function plateWhyNot(K, list, key) {
  if (plateFits(K, list.concat(key))) return null;
  const p = parseComp(key);
  if (!p.ch && !p.ck && ING[p.ing] && ING[p.ing].chop && (plateFits(K, list.concat(key + '*')) || K.dishes.some(d => d.c.some(c => c.startsWith(key + '*'))))) return 'Önce doğra! 🔪';
  if (!p.ck && K.dishes.some(d => d.c.some(c => c.startsWith(key + '@')))) return 'Önce pişir! 🔥';
  return 'Bu tabağa uymaz';
}
function contWhyNot(K, cont, ing, now) {
  if (cont.burnt) return 'Kap yanmış — önce çöpe boşalt';
  if (ing.b) return 'Yanmış malzeme — çöpe at';
  if (cont.c.length >= CAP) return 'Kap dolu';
  const ck = cookOf(cont), key = ingKey(ing);
  if (contFits(K, ck, cont.c.concat(key))) return null;
  if (!ing.ch && ING[ing.i].chop && contFits(K, ck, cont.c.concat(key + '*'))) return 'Önce doğra! 🔪';
  return `${COOK[ck].n} için uygun değil`;
}

/* ---- kurulum ---- */
function freshStations(st) {
  const K = KS(st), plates = st.players.length <= 2 ? 4 : 5;
  let rackSeen = false;
  st.S = K.st.map(s => {
    const d = { item: null, n: 0, d: 0, w: null, f: null, wp: 0 };
    if (s.k === 'stove') d.item = mkCont(st, s.cont);
    if (s.k === 'oven') d.item = mkCont(st, 'tray');
    if (s.k === 'counter' && s.ext) d.item = { id: ++st.idc, k: 'ext' };
    if (s.k === 'rack' && !rackSeen) { d.n = plates; rackSeen = true; }
    return d;
  });
}
function placeChefs(st) {
  const K = KS(st), sp = K.def.spawns, now = Date.now();
  st.pos = st.players.map((_, i) => { const s = sp[i % sp.length]; return { x: s[0] + .5, y: s[1] + .5, fx: 0, fy: 1, t: now, m: 0 }; });
  st.spawnVer++;
}

/* ---- konum ve menzil ---- */
function applyPos(st, pi, x, y, fx, fy) {
  if (!st.players[pi] || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  const K = KS(st), p = st.pos[pi], now = Date.now();
  const maxd = 10.5 * clamp((now - p.t) / 1000, 0, 1.2) + 1.2, d = dist(x, y, p.x, p.y);
  if (d > maxd) { const k = maxd / d; x = p.x + (x - p.x) * k; y = p.y + (y - p.y) * k; }
  const nx = clamp(x, RAD, K.W - RAD), ny = clamp(y, RAD, K.H - RAD);
  const ok = !solidAt(K, Math.floor(nx), Math.floor(ny));
  const f = Number.isFinite(fx) && Number.isFinite(fy) && Math.hypot(fx, fy) > .1 ? [fx / Math.hypot(fx, fy), fy / Math.hypot(fx, fy)] : [p.fx, p.fy];
  st.pos[pi] = { x: ok ? r2(nx) : p.x, y: ok ? r2(ny) : p.y, fx: r2(f[0]), fy: r2(f[1]), t: now, m: d > .02 ? 1 : 0 };
  return true;
}
function hostPosIn(seat, x, y, fx, fy, cid) {
  const R0 = window.CFX && window.CFX.Room, g = R0 && R0.game;
  if (!g || !g.state || g.def.id !== 'mutfak' || !R0.isRunner() || g.result) return;
  if (cid !== undefined && (!g.players[seat] || g.players[seat].cid !== cid)) return;
  if (g.players[seat] && g.players[seat].isBot) return;
  applyPos(g.state, seat, x, y, fx, fy);
}
function inReach(st, pi, s, now) {
  const K = KS(st), mrow = mrowOf(st, now);
  if (s.mv && moverSliding(K, st.t0, now)) return false;
  const p = st.pos[pi], [c, r] = stCell(K, s, mrow), [sx, sy] = [c + .5, r + .5];
  if (Math.max(Math.abs(Math.floor(p.x) - c), Math.abs(Math.floor(p.y) - r)) > 1) return false;
  return dist(p.x, p.y, sx, sy) <= REACH;
}

/* ---- Al / Bırak ---- */
function doAl(st, pi, s, now, ctx) {
  const K = KS(st), D = st.S[s.i], held = st.held[pi], it = D.item;
  if (D.f && !(it && it.k === 'ext' && !held)) return 'Önce yangını söndür! 🧯';
  // botların sıradan al/bırak olayları yayınlanmaz (ağ trafiği); yalnızca kendi sesin için gerekir
  const ok = (ev) => { if (ev && !(st.players[pi].isBot && (ev.t === 'pick' || ev.t === 'drop' || ev.t === 'plate'))) ctx.emit(Object.assign({ pi, s: s.i }, ev)); return null; };
  switch (s.k) {
    case 'crate': {
      if (!held) { st.held[pi] = mkIng(st, s.ing); st.stats[pi].pts += PTS.fetch; return ok({ t: 'pick', what: s.ing }); }
      if (held.k === 'plate') { const w = plateWhyNot(K, held.c, s.ing); if (w) return w; held.c.push(s.ing); st.stats[pi].pts += PTS.plate; return ok({ t: 'plate' }); }
      if (isCont(held)) { const w = contWhyNot(K, held, { i: s.ing, ch: 0, b: 0 }, now); if (w) return w; contAdd(held, s.ing, now, false); return ok({ t: 'drop' }); }
      return 'Elin dolu';
    }
    case 'rack': {
      if (!held) { if (D.n <= 0) return 'Temiz tabak kalmadı — kirlileri yıka! 🧽'; D.n--; st.held[pi] = mkPlate(st); return ok({ t: 'pick', what: 'plate' }); }
      if (held.k === 'plate' && !held.c.length) { D.n++; st.held[pi] = null; return ok({ t: 'drop' }); }
      if (held.k === 'ing' && D.n > 0) { const w = held.b ? 'Yanmış malzeme — çöpe at' : plateWhyNot(K, [], ingKey(held)); if (w) return w; D.n--; st.held[pi] = mkPlate(st, [ingKey(held)]); st.stats[pi].pts += PTS.plate; return ok({ t: 'plate' }); }
      return 'Rafa yalnızca boş tabak konur';
    }
    case 'ret': {
      if (!held) { if (D.n <= 0) return 'Kirli tabak yok'; st.held[pi] = { id: ++st.idc, k: 'dirty', n: D.n }; D.n = 0; return ok({ t: 'pick', what: 'dirty' }); }
      if (held.k === 'dirty') { D.n += held.n; st.held[pi] = null; return ok({ t: 'drop' }); }
      return 'Buraya yalnızca kirli tabak konur';
    }
    case 'sink': {
      if (held && held.k === 'dirty') { D.d += held.n; st.held[pi] = null; return ok({ t: 'splash' }); }
      if (!held) return D.d > 0 ? 'Yıkamak için KULLAN 🧽' : 'Yıkanacak tabak yok';
      return 'Evyeye yalnızca kirli tabak konur';
    }
    case 'window': {
      if (!held) return 'Hazır tabağı buraya getir';
      if (held.k !== 'plate') return isCont(held) || held.k === 'ing' ? 'Önce tabağa koy! 🍽️' : 'Bu servis edilmez';
      const d = dishOf(K, held.c);
      if (!d) return held.c.length ? 'Tabak eksik ya da yanlış' : 'Tabak boş';
      const cand = st.orders.filter(o => o.d === d).sort((a, b) => (a.t0 + a.dur) - (b.t0 + b.dur));
      if (!cand.length) return 'Bu yemeği isteyen yok!';
      serve(st, pi, cand[0], now, ctx);
      return null;
    }
    case 'trash': {
      if (!held) return 'Çöpe atmak için bir şey tut';
      if (held.k === 'ing') { st.held[pi] = null; return ok({ t: 'trash' }); }
      if (held.k === 'plate') { if (!held.c.length) return 'Tabak zaten boş'; held.c = []; return ok({ t: 'trash' }); }
      if (isCont(held)) { if (!held.c.length) return 'Kap zaten boş'; contEmpty(held); return ok({ t: 'trash' }); }
      return 'Bunu atamazsın!';
    }
    default: break;
  }
  // yüzeyler: tezgâh, tahta, ocak, fırın, bant
  if (!held) {
    if (!it) return 'Burası boş';
    if (s.k === 'oven') {
      if (it.burnt && it.c.length) { contEmpty(it); return ok({ t: 'trash' }); }
      return it.c.length ? (contDone(it, now) ? 'Fırından tabakla al 🍽️' : contComplete(K, it) ? 'Pişiyor…' : 'Tarif eksik: öteki malzemeleri de koy') : 'Fırına malzeme koy';
    }
    D.item = null; D.w = null;
    if (stationHeats(s)) heatSet(it, false, now);
    st.held[pi] = it;
    return ok({ t: 'pick', what: it.k === 'ing' ? it.i : it.k });
  }
  if (!it) {
    if (s.k === 'board' && held.k !== 'ing') return 'Tahtaya yalnızca malzeme konur';
    if (s.k === 'stove' && !(held.k === 'pot' || held.k === 'pan')) return 'Ocağa tencere ya da tava koy';
    if (s.k === 'belt' && held.k !== 'ing') return 'Banda yalnızca malzeme konur';
    D.item = held; st.held[pi] = null;
    if (held.k === 'ing') held.mv = 0;
    if (stationHeats(s)) heatSet(held, true, now);
    return ok({ t: 'drop' });
  }
  return combine(st, pi, s, D, held, it, now, ctx);
}
function combine(st, pi, s, D, held, it, now, ctx) {
  const K = KS(st), heated = stationHeats(s);
  const ok = ev => { if (!(st.players[pi].isBot && (ev.t === 'pick' || (ev.t === 'drop' && !ev.cook) || ev.t === 'plate'))) ctx.emit(Object.assign({ pi, s: s.i }, ev)); return null; };
  if (held.k === 'plate') {
    if (isCont(it)) {
      if (it.burnt) return s.k === 'oven' ? 'Yanmış! Elin boşken fırını temizle' : 'Yanmış! Önce çöpe boşalt';
      if (!it.c.length) return 'Kap boş';
      if (!contDone(it, now)) return 'Henüz pişmedi ⏳';
      if (!contComplete(K, it)) return 'Tarif eksik: kaba öteki malzemeleri de koy';
      const out = cookedOut(it);
      if (!plateFits(K, held.c.concat(out))) return 'Bu tabağa uymaz';
      held.c.push(...out); contEmpty(it); if (heated) it.t = 0;
      st.stats[pi].pts += PTS.plate; return ok({ t: 'plate' });
    }
    if (it.k === 'ing') {
      if (it.b) return 'Yanmış malzeme — çöpe at';
      const w = plateWhyNot(K, held.c, ingKey(it)); if (w) return w;
      held.c.push(ingKey(it)); D.item = null; D.w = null;
      st.stats[pi].pts += PTS.plate; return ok({ t: 'plate' });
    }
    if (it.k === 'plate' && it.c.length && (!held.c.length || plateFits(K, held.c.concat(it.c)))) {
      if (!plateFits(K, held.c.concat(it.c))) return 'Bu tabağa uymaz';
      held.c.push(...it.c); it.c = []; return ok({ t: 'plate' });
    }
    return 'Burada yer yok';
  }
  if (isCont(held)) {
    if (it.k === 'plate') {
      if (held.burnt) return 'Yanmış! Önce çöpe boşalt';
      if (!held.c.length) return 'Kap boş';
      if (!contDone(held, now)) return 'Henüz pişmedi ⏳';
      if (!contComplete(K, held)) return 'Tarif eksik: kaba öteki malzemeleri de koy';
      const out = cookedOut(held);
      if (!plateFits(K, it.c.concat(out))) return 'Bu tabağa uymaz';
      it.c.push(...out); contEmpty(held);
      st.stats[pi].pts += PTS.plate; return ok({ t: 'plate' });
    }
    if (it.k === 'ing') {
      const w = contWhyNot(K, held, it, now); if (w) return w;
      contAdd(held, ingKey(it), now, false); D.item = null; D.w = null;
      st.stats[pi].pts += PTS.cook; return ok({ t: 'drop' });
    }
    return 'Burada yer yok';
  }
  if (held.k === 'ing') {
    if (it.k === 'plate') {
      if (held.b) return 'Yanmış malzeme — çöpe at';
      const w = plateWhyNot(K, it.c, ingKey(held)); if (w) return w;
      it.c.push(ingKey(held)); st.held[pi] = null;
      st.stats[pi].pts += PTS.plate; return ok({ t: 'plate' });
    }
    if (isCont(it)) {
      const w = contWhyNot(K, it, held, now); if (w) return w;
      contAdd(it, ingKey(held), now, heated); st.held[pi] = null;
      st.stats[pi].pts += PTS.cook; return ok({ t: 'drop', cook: 1 });
    }
  }
  return 'Burada yer yok';
}
function serve(st, pi, o, now, ctx) {
  const K = KS(st), dd = DISHES[o.d];
  st.orders.splice(st.orders.indexOf(o), 1);
  const remain = clamp((o.t0 + o.dur - now) / o.dur, 0, 1), tip = Math.round(dd.pts * .5 * remain), tot = dd.pts + tip;
  st.score += tot; st.served++; st.tips += tip;
  st.stats[pi].sv++; st.stats[pi].pts += PTS.serve;
  st.held[pi] = null;
  st.returns.push(now + RETURN_MS);
  if (!st.orders.length) st.nextOrderAt = Math.min(st.nextOrderAt, now + 1800);
  void K;
  ctx.emit({ t: 'serve', pi, oid: o.id, d: o.d, pts: dd.pts, tip }, `🍽️ ${pname(st, pi)} servis etti: ${dd.n} (+${dd.pts}${tip ? ` · +${tip} bahşiş` : ''})`, 'good');
}

/* ---- Kullan: doğra / yıka / söndür ---- */
function doUse(st, pi, s, now, ctx) {
  const held = st.held[pi];
  if (held && held.k === 'ext') { const was = st.spray[pi] > now; st.spray[pi] = now + SPRAY_MS; if (!was) ctx.emit({ t: 'spray', pi }); return null; }
  if (!s) return 'Önünde kullanılacak bir şey yok';
  const D = st.S[s.i];
  if (D.f) return 'Önce yangını söndür! 🧯';
  if (held) return 'Elin dolu — önce bırak';
  if (s.k === 'board') {
    const it = D.item;
    if (!it) return 'Tahta boş';
    if (it.k !== 'ing' || !ING[it.i].chop) return 'Bu doğranmaz';
    if (it.ch) return 'Zaten doğrandı';
    if (it.b) return 'Yanmış malzeme';
    if (D.w && D.w.pi !== pi) return 'Başkası doğruyor';
    if (!D.w) { D.w = { pi, t: now, p0: it.cp || 0 }; ctx.emit({ t: 'chopStart', pi, s: s.i }); }
    return null;
  }
  if (s.k === 'sink') {
    if (D.d <= 0) return 'Yıkanacak tabak yok';
    if (D.w && D.w.pi !== pi) return 'Başkası yıkıyor';
    if (!D.w) { D.w = { pi, t: now, p0: D.wp || 0 }; ctx.emit({ t: 'washStart', pi, s: s.i }); }
    return null;
  }
  return 'Burada kullanılacak bir şey yok';
}
function workValid(st, s, D, now) {
  const w = D.w; if (!w) return false;
  if (st.held[w.pi] || !inReach(st, w.pi, s, now) || st.online[w.pi] === false) return false;
  if (st.phase !== 'play') return false;
  return true;
}
function stepWork(st, now, ctx) {
  const K = KS(st); let dirty = false;
  K.st.forEach(s => {
    const D = st.S[s.i]; if (!D.w) return;
    const w = D.w, ms = s.k === 'board' ? CHOP_MS : WASH_MS, p = w.p0 + (now - w.t) / ms;
    if (!workValid(st, s, D, now) || (s.k === 'board' && (!D.item || D.item.k !== 'ing' || D.item.ch)) || (s.k === 'sink' && D.d <= 0)) {
      if (s.k === 'board' && D.item && D.item.k === 'ing') D.item.cp = clamp(p, 0, .99);
      if (s.k === 'sink') D.wp = clamp(p, 0, .99);
      D.w = null; dirty = true; return;
    }
    if (p < 1) return;
    if (s.k === 'board') {
      D.item.ch = 1; D.item.cp = 0; D.w = null;
      st.stats[w.pi].ch++; st.stats[w.pi].pts += PTS.chop;
      ctx.emit({ t: 'chopped', pi: w.pi, s: s.i, what: D.item.i });
    } else {
      D.d--; D.wp = 0;
      const rack = K.st.find(x => x.k === 'rack'); if (rack) st.S[rack.i].n++;
      st.stats[w.pi].wa++; st.stats[w.pi].pts += PTS.wash;
      ctx.emit({ t: 'washed', pi: w.pi, s: s.i });
      if (D.d > 0) D.w = { pi: w.pi, t: now, p0: 0 }; else D.w = null;
    }
    dirty = true;
  });
  return dirty;
}

/* ---- pişirme ve yangın ---- */
function burnMs(st, ck) { return COOK[ck].burn * DIFF[st.diff].burn; }
function ignite(st, si, now, ctx, why) {
  const D = st.S[si]; if (D.f) return false;
  D.f = { hp: 1, sp: now + DIFF[st.diff].spread * rnd(.85, 1.15), at: now };
  D.w = null;
  const it = D.item;
  if (it) {
    if (it.k === 'ing') it.b = 1;
    else if (it.k === 'plate' && it.c.length) it.c = ['komur'];
    else if (isCont(it) && it.c.length && !it.burnt) { it.p0 = contProg(it, now); it.t = 0; it.burnt = 1; }
  }
  ctx.emit({ t: 'fire', s: si, why }, why === 'burn' ? '🔥 Yemek yandı, ocak alev aldı! Yangın tüpünü kap!' : '🔥 Yangın yayılıyor!', 'bad');
  return true;
}
function stepCook(st, now, ctx) {
  const K = KS(st); let dirty = false;
  K.st.forEach(s => {
    if (!stationHeats(s)) return;
    const D = st.S[s.i], it = D.item; if (!isCont(it) || it.burnt || !it.c.length || D.f) return;
    if (!contComplete(K, it)) { if (it.t) { it.p0 = contProg(it, now); it.t = 0; dirty = true; } return; }
    if (!it.t) { it.t = now; dirty = true; }
    const ck = cookOf(it), p = contProg(it, now), bf = burnMs(st, ck) / COOK[ck].ms;
    if (p >= 1 && !it.dn) { it.dn = 1; dirty = true; ctx.emit({ t: 'cooked', s: s.i, ck }); }
    if (p >= 1 + bf * .55 && !it.wr) { it.wr = 1; dirty = true; ctx.emit({ t: 'warn', s: s.i }); }
    if (p >= 1 + bf) { it.burnt = 1; it.p0 = p; it.t = 0; ignite(st, s.i, now, ctx, 'burn'); dirty = true; }
  });
  return dirty;
}
const SPREADABLE = new Set(['counter', 'board', 'stove', 'oven', 'belt']);
function stepFire(st, now, dt, ctx) {
  const K = KS(st), mrow = mrowOf(st, now); let dirty = false;
  // söndürme
  st.players.forEach((_, pi) => {
    if (!(st.spray[pi] > now) || !st.held[pi] || st.held[pi].k !== 'ext') return;
    const p = st.pos[pi];
    K.st.forEach(s => {
      const D = st.S[s.i]; if (!D.f) return;
      const [sx, sy] = stPos(K, s, mrow), dx = sx - p.x, dy = sy - p.y, d = Math.hypot(dx, dy) || 1e-3;
      const cos = (dx * p.fx + dy * p.fy) / d;
      if (!((d <= 2.5 && cos >= .62) || (d <= 1.25 && cos >= .1))) return;
      D.f.hp -= dt * 1000 / FIRE_HP_MS * (st.players[pi].isBot ? .9 : 1);
      if (D.f.hp <= 0) {
        D.f = null; dirty = true; st.stats[pi].fi++; st.stats[pi].pts += PTS.fire;
        ctx.emit({ t: 'out', pi, s: s.i }, `🧯 ${pname(st, pi)} yangını söndürdü!`, 'good');
      }
    });
  });
  // yayılma
  const burning = K.st.filter(s => st.S[s.i].f);
  burning.forEach(s => {
    const D = st.S[s.i]; if (!D.f || now < D.f.sp) return;
    D.f.sp = now + DIFF[st.diff].spread * rnd(.85, 1.15);
    if (K.st.filter(x => st.S[x.i].f).length >= 7) return;
    const [c, r] = stCell(K, s, mrow);
    const cand = K.st.filter(x => { if (x === s || !SPREADABLE.has(x.k) || st.S[x.i].f) return false; const [xc, xr] = stCell(K, x, mrow); return Math.max(Math.abs(xc - c), Math.abs(xr - r)) === 1; });
    if (cand.length) { ignite(st, pickR(cand).i, now, ctx, 'spread'); dirty = true; }
  });
  return dirty;
}

/* ---- siparişler ---- */
function maxOrders(st) { return st.players.length <= 2 ? 4 : 5; }
function orderGap(st) { return 20000 / (1 + .3 * (Math.min(st.players.length, 6) - 1)) * DIFF[st.diff].gap; }
function spawnOrder(st, now, ctx) {
  const K = KS(st), ds = K.def.dishes;
  const recent = st.orders.map(o => o.d).concat(st.lastDish || []);
  let pool = ds.filter(d => recent.filter(x => x === d).length < 2); if (!pool.length) pool = ds;
  // ilk siparişler kolaydan başlasın
  if (st.oid < 1) pool = ds.slice().sort((a, b) => DISHES[a].c.length - DISHES[b].c.length).slice(0, 1);
  const d = pickR(pool);
  const o = { id: ++st.oid, d, t0: now, dur: Math.round(DISHES[d].t * 1000 * DIFF[st.diff].ord) };
  st.orders.push(o); st.lastDish = [d].concat(st.lastDish || []).slice(0, 2);
  ctx.emit({ t: 'order', oid: o.id, d }, `🧾 Yeni sipariş: ${DISHES[d].n}`);
}
function stepOrders(st, now, ctx) {
  let dirty = false;
  for (let k = st.orders.length - 1; k >= 0; k--) {
    const o = st.orders[k];
    if (now >= o.t0 + o.dur) {
      st.orders.splice(k, 1); st.missed++;
      const pen = DIFF[st.diff].pen; st.score = Math.max(0, st.score - pen);
      ctx.emit({ t: 'miss', oid: o.id, d: o.d, pen }, `⌛ ${DISHES[o.d].n} siparişi kaçtı! (−${pen})`, 'bad');
      dirty = true;
    }
  }
  if (st.orders.length < maxOrders(st) && (now >= st.nextOrderAt || !st.orders.length && now >= st.nextOrderAt - orderGap(st) + 2500)) {
    spawnOrder(st, now, ctx); st.nextOrderAt = now + orderGap(st) * rnd(.85, 1.15); dirty = true;
  }
  for (let k = st.returns.length - 1; k >= 0; k--) {
    if (now >= st.returns[k]) {
      st.returns.splice(k, 1);
      const K = KS(st), ret = K.st.find(x => x.k === 'ret'); if (ret) st.S[ret.i].n++;
      dirty = true; ctx.emit({ t: 'return' });
    }
  }
  return dirty;
}

/* ---- yürüyen bant (Gece Pazarı) ---- */
function stepBelt(st, now, ctx) {
  const K = KS(st); if (!K.belt.length) return false;
  const ms = K.def.beltMs || 1000; let dirty = false;
  if (now - st.beltAt >= ms) {
    st.beltAt = now; const B = K.belt;
    for (let j = B.length - 1; j >= 0; j--) {
      const D = st.S[B[j]], it = D.item; if (!it || D.f) continue;
      if (j === B.length - 1) { if (it.k === 'ing') { D.item = null; D.w = null; dirty = true; } continue; }
      const N = st.S[B[j + 1]]; if (N.item || N.f) continue;
      N.item = it; D.item = null; D.w = null; it.mv = now; it.fr = j; dirty = true;
    }
  }
  if (now - st.supplyAt >= (K.def.supplyMs || 1500)) {
    const F = st.S[K.belt[0]];
    if (!F.item && !F.f) {
      st.supplyAt = now;
      const onBelt = K.belt.map(i => st.S[i].item).filter(x => x && x.k === 'ing').map(x => x.i);
      const need = needs(st, now).fetch.map(n => n.ing);
      let want = null;
      for (const g of need) { const k = onBelt.indexOf(g); if (k >= 0) onBelt.splice(k, 1); else { want = g; break; } }
      if (!want) want = Math.random() < .55 && need.length ? pickR(need) : pickR(K.ings);
      const it = mkIng(st, want); it.mv = now; it.fr = -1; F.item = it; dirty = true;
    }
  }
  return dirty;
}

/* ---- ihtiyaç analizi (botlar ve pazar bandı için) ----
   Siparişlerin bileşenlerini dünyadaki eşyalarla eşleştirir: tabaklar, kaplar, gevşek malzemeler. */
function canBecome(it, comp) {   // gevşek malzeme bu bileşene dönüşebilir mi?
  const p = parseComp(comp);
  if (it.k !== 'ing' || it.b || it.i !== p.ing) return false;
  if (it.ch && !p.ch) return false;
  return true;
}
function worldItems(st) {
  const K = KS(st), out = [];
  K.st.forEach(s => { const it = st.S[s.i].item; if (it) out.push({ it, s: s.i, held: -1 }); });
  st.held.forEach((it, pi) => { if (it) out.push({ it, s: -1, held: pi }); });
  return out;
}
function needs(st, now) {
  const K = KS(st), items = worldItems(st);
  const orders = st.orders.slice().sort((a, b) => (a.t0 + a.dur) - (b.t0 + b.dur)).slice(0, Math.max(2, st.players.length + 1));
  const usedPlate = new Set(), usedCont = new Set(), usedIng = new Set();
  const plan = [], fetch = [];
  const claims = st.bot ? Object.values(st.bot).map(b => b.fetchFor).filter(Boolean) : [];
  orders.forEach(o => {
    const dish = DISHES[o.d]; let rest = dish.c.slice();
    const entry = { o, plate: null, conts: [], ings: [], missing: [] };
    // tabak: içeriği bu tarifin alt kümesi olan, en dolu
    let best = null;
    items.forEach(w => { if (w.it.k !== 'plate' || usedPlate.has(w.it.id) || !w.it.c.length || !subMulti(w.it.c, dish.c)) return; if (!best || w.it.c.length > best.it.c.length) best = w; });
    if (best) { usedPlate.add(best.it.id); entry.plate = best; rest = minus(rest, best.it.c); }
    // kaplar
    items.forEach(w => {
      if (!isCont(w.it) || usedCont.has(w.it.id) || !w.it.c.length || w.it.burnt) return;
      const out = cookedOut(w.it); if (!subMulti(out, rest)) return;
      usedCont.add(w.it.id); entry.conts.push(w); rest = minus(rest, out);
    });
    // gevşek malzemeler
    rest.slice().forEach(comp => {
      const w = items.find(x => !usedIng.has(x.it.id) && canBecome(x.it, comp));
      if (w) { usedIng.add(w.it.id); entry.ings.push({ w, comp }); rest = minus(rest, [comp]); }
    });
    // botların yoldaki getirmeleri
    rest.slice().forEach(comp => {
      const k = claims.findIndex(c => c.oid === o.id && c.comp === comp);
      if (k >= 0) { claims.splice(k, 1); rest = minus(rest, [comp]); }
    });
    entry.missing = rest;
    rest.forEach(comp => fetch.push({ oid: o.id, comp, ing: parseComp(comp).ing }));
    plan.push(entry);
  });
  return { plan, fetch, usedIng };
}

/* ---- kopma: eldeki eşyayı en yakın boş tezgâha bırak ---- */
function dropHeld(st, pi, now, ctx) {
  const it = st.held[pi]; if (!it) return;
  const K = KS(st), p = st.pos[pi], mrow = mrowOf(st, now), sliding = moverSliding(K, st.t0, now);
  let best = null, bd = 1e9;
  K.st.forEach(s => {
    const D = st.S[s.i];
    if (D.item || D.f || (s.mv && sliding)) return;
    if (!(s.k === 'counter' || (s.k === 'board' && it.k === 'ing') || (s.k === 'stove' && (it.k === 'pot' || it.k === 'pan')))) return;
    const [x, y] = stPos(K, s, mrow), d = dist(x, y, p.x, p.y) + (s.k === 'counter' ? 0 : .5);
    if (d < bd) { bd = d; best = s; }
  });
  st.held[pi] = null;
  if (best) { st.S[best.i].item = it; if (stationHeats(best)) heatSet(it, true, now); ctx.emit({ t: 'drop', pi, s: best.i }, `${pname(st, pi)} elindekini tezgâha bıraktı.`); return; }
  if (it.k === 'plate') st.returns.push(now + 2000);
  else if (it.k === 'dirty') { const ret = K.st.find(x => x.k === 'ret'); if (ret) st.S[ret.i].n += it.n; }
  else if (it.k !== 'ing') st.held[pi] = it;   // kap/tüp kaybolmasın
}

/* ---- oyun akışı ---- */
function starsOf(st) { return st.score >= st.thr[2] ? 3 : st.score >= st.thr[1] ? 2 : st.score >= st.thr[0] ? 1 : 0; }
function startPlay(st, now, ctx) {
  st.phase = 'play'; st.t0 = now; st.endsAt = now + st.durMs; st.beltAt = now; st.supplyAt = now - 99999;
  st.nextOrderAt = now + 7000;
  spawnOrder(st, now, ctx);
  st.pos.forEach(p => { p.t = now; });
  ctx.emit({ t: 'go' }, '🔔 Servis başladı! Siparişler geliyor.', 'gold');
}
function endGame(st, now, ctx) {
  st.phase = 'end'; st.endsAt = now + END_MS;
  st.S.forEach(D => { D.w = null; });
  st.spray = st.spray.map(() => 0);
  const stars = starsOf(st);
  st.last = { stars, score: st.score, served: st.served, missed: st.missed, tips: st.tips, thr: st.thr.slice() };
  ctx.emit({ t: 'end', stars }, `🏁 Servis bitti! Takım puanı ${st.score} · ${'★'.repeat(stars) || 'yıldız yok'}`, 'gold');
}
function finish(st, ctx) {
  st.phase = 'over';
  const stars = st.last ? st.last.stars : starsOf(st);
  const lab = s => `${s.pts} katkı · ${s.sv} servis`;   // ayrıntılı döküm oyun içi sonuç kartında
  const ranking = st.players.map((p, i) => ({ pi: i, score: st.stats[i].pts, label: lab(st.stats[i]) })).sort((a, b) => b.score - a.score);
  const title = stars === 3 ? 'Ekip 3 yıldız aldı! ★★★' : stars === 2 ? 'Ekip 2 yıldız aldı! ★★☆' : stars === 1 ? 'Ekip 1 yıldız aldı! ★☆☆' : 'Ekip yıldız alamadı… Bir tur daha!';
  const note = `${KITCHENS[st.kid].n} · Takım puanı ${st.score} (${st.served} servis, ${st.tips} bahşiş, ${st.missed} kaçan sipariş). Yıldız eşikleri: ${st.thr.join(' / ')}. Sıralama katkı puanına göre.`;
  ctx.sync();
  ctx.later(300, () => ctx.end({ title, ranking, note }));
}

/* ------------------------------------------------------------------ BOTLAR (yardımcı aşçılar) */
function newBot() { return { goal: null, path: null, pathAt: 0, pathGoal: '', vx: 0, vy: 0, actAt: 0, sx: 0, sy: 0, sAt: 0, stuck: 0, jit: null, jitUntil: 0, fetchFor: null, ban: {}, park: null, parkAt: 0, thinkAt: 0 }; }
const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function botBlocked(st, pi, K) {
  // Bölünmüş mutfak: karşı tarafta aşçı varsa botlar alttaki kapıdan geçmez, tezgâhtan uzatır
  const door = K.def.door; if (!door) return null;
  const me = st.pos[pi], mySide = me.x < K.def.split;
  const other = st.players.some((p, j) => j !== pi && st.online[j] !== false && (st.pos[j].x < K.def.split) !== mySide);
  return other ? new Set(door.map(([c, r]) => r * K.W + c)) : null;
}
function bfsField(st, pi, now) {
  const K = KS(st), mrow = mrowOf(st, now), W = K.W, H = K.H, N = W * H;
  const d = new Int16Array(N).fill(-1), par = new Int32Array(N).fill(-1), q = new Int32Array(N);
  const blocked = botBlocked(st, pi, K);
  const ok = (c, r) => walkable(K, c, r, mrow) && !(blocked && blocked.has(r * W + c));
  const p = st.pos[pi]; let c0 = Math.floor(p.x), r0 = Math.floor(p.y);
  if (!ok(c0, r0)) { const f = N8.map(([a, b]) => [c0 + a, r0 + b]).find(([a, b]) => ok(a, b)); if (f) [c0, r0] = f; }
  let h = 0, t = 0; const s0 = r0 * W + c0; d[s0] = 0; q[t++] = s0;
  while (h < t) {
    const cur = q[h++], c = cur % W, r = (cur - c) / W;
    for (const [a, b] of N8) {
      const x = c + a, y = r + b; if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const n = y * W + x; if (d[n] >= 0 || !ok(x, y)) continue;
      if (a && b && (!ok(c + a, r) || !ok(c, r + b))) continue;
      d[n] = d[cur] + 1; par[n] = cur; q[t++] = n;
    }
  }
  return { d, par, W, ok };
}
function standCells(st, s, F, now) {
  const K = KS(st), [c, r] = stCell(K, s, mrowOf(st, now)), out = [];
  for (const [a, b] of N4) { const x = c + a, y = r + b; if (x >= 0 && y >= 0 && x < K.W && y < K.H && F.d[y * K.W + x] >= 0) out.push(y * K.W + x); }
  return out;
}
function costTo(st, s, F, now) {
  if (s.mv && moverSliding(KS(st), st.t0, now)) return -1;
  const cs = standCells(st, s, F, now); if (!cs.length) return -1;
  return Math.min(...cs.map(c => F.d[c]));
}
function claimedBy(st, pi, key) { return Object.keys(st.bot).some(k => +k !== pi && st.bot[k].goal && st.bot[k].goal.key === key); }
function surfaces(st) { return KS(st).st.filter(s => s.k === 'counter' || s.k === 'board' || s.k === 'stove' || s.k === 'oven' || s.k === 'belt'); }
function nearestBy(list, f) { let best = null, bv = 1e9; for (const x of list) { const v = f(x); if (v >= 0 && v < bv) { bv = v; best = x; } } return best; }
function freeCounter(st, pi, F, now, near) {
  const K = KS(st), mrow = mrowOf(st, now);
  const nx = near ? near[0] : null;
  return nearestBy(K.st.filter(s => s.k === 'counter' && !st.S[s.i].item && !st.S[s.i].f && !claimedBy(st, pi, 'put:' + s.i)), s => {
    const c = costTo(st, s, F, now); if (c < 0) return -1;
    if (!near) return c;
    const [x, y] = stPos(K, s, mrow); return c * .6 + dist(x, y, nx, near[1]);
  });
}
// Ulaşılamayan hedef için: iki tarafa da bakan boş tezgâh (karşıya uzatma)
function passCounter(st, pi, F, now) {
  const K = KS(st), mrow = mrowOf(st, now);
  return nearestBy(K.st.filter(s => s.k === 'counter' && !st.S[s.i].item && !st.S[s.i].f), s => {
    const [c, r] = stCell(K, s, mrow); let mine = false, other = false;
    for (const [a, b] of N4) { const x = c + a, y = r + b; if (!walkable(K, x, y, mrow)) continue; if (F.d[y * K.W + x] >= 0) mine = true; else other = true; }
    return mine && other ? costTo(st, s, F, now) : -1;
  });
}
const G = (s, act, key, extra) => Object.assign({ s: s.i, act, key }, extra || {});

function routeHeld(st, pi, b, held, now, N, F) {
  const K = KS(st), mrow = mrowOf(st, now), win = K.st.find(s => s.k === 'window');
  const reach = s => costTo(st, s, F, now) >= 0;
  const viaPass = (s, key) => { if (s && reach(s)) return G(s, 'al', key); const p = passCounter(st, pi, F, now); return p ? G(p, 'al', 'put:' + p.i, { pass: 1 }) : null; };
  const counterNear = s => { const near = s ? stPos(K, s, mrow) : null; const c = freeCounter(st, pi, F, now, near); return c ? G(c, 'al', 'put:' + c.i) : null; };
  const trash = () => viaPass(nearestBy(K.st.filter(s => s.k === 'trash'), s => costTo(st, s, F, now)) || K.st.find(s => s.k === 'trash'), 'trash');
  const fires = K.st.filter(s => st.S[s.i].f);
  if (held.k === 'ext') {
    if (fires.length) {
      const f = nearestBy(fires, s => costTo(st, s, F, now));
      if (f) return G(f, 'use', 'fire', { spray: 1 });
    }
    const home = K.st.find(s => s.ext && !st.S[s.i].item && !st.S[s.i].f && reach(s));
    return home ? G(home, 'al', 'put:' + home.i) : counterNear(null);
  }
  if (held.k === 'dirty') return viaPass(K.st.find(s => s.k === 'sink'), 'wash');
  let myEntry = N.plan.find(e => e.plate && e.plate.it.id === held.id);
  if (!myEntry && held.k === 'plate' && !held.c.length) myEntry = N.plan.find(e => e.o.id === b.plateFor && !(e.plate && e.plate.s >= 0)) || N.plan.find(e => !e.plate && (e.conts.some(w => contDone(w.it, now)) || e.ings.some(x => x.w.s >= 0 && x.w.it.k === 'ing' && ingKey(x.w.it) === x.comp)));
  if (held.k === 'plate') {
    const d = dishOf(K, held.c);
    if (d && st.orders.some(o => o.d === d)) return viaPass(win, 'serve');
    if (myEntry) {
      const missing = minus(DISHES[myEntry.o.d].c, held.c);
      const cont = nearestBy(myEntry.conts.filter(w => w.s >= 0 && contComplete(K, w.it) && (contDone(w.it, now) || (stationHeats(K.st[w.s]) && contProg(w.it, now) > .72)) && subMulti(cookedOut(w.it), missing)), w => costTo(st, K.st[w.s], F, now));
      if (cont) return G(K.st[cont.s], 'al', 'item:' + cont.it.id, { wait: !contDone(cont.it, now) });
      const ing = nearestBy(myEntry.ings.filter(x => x.w.s >= 0 && x.w.it.k === 'ing' && ingKey(x.w.it) === x.comp && missing.includes(x.comp) && !st.S[x.w.s].w), x => costTo(st, K.st[x.w.s], F, now));
      if (ing) return G(K.st[ing.w.s], 'al', 'item:' + ing.w.it.id);
      if (held.c.length) return counterNear(win);
    }
    if (held.c.length) return d || !myEntry ? trash() : counterNear(win);
    const rack = K.st.find(s => s.k === 'rack');
    return rack && reach(rack) ? G(rack, 'al', 'rack') : counterNear(null);
  }
  if (isCont(held)) {
    if (held.burnt || (held.c.length && !contFits(K, cookOf(held), held.c))) return trash();
    if (contDone(held, now) && !contComplete(K, held)) return counterNear(K.st.find(s => s.k === 'stove'));
    if (contDone(held, now) && !st.S.some(D => D.item && D.item.k === 'plate')) { const rk = K.st.find(s => s.k === 'rack'); if (!rk || !st.S[rk.i].n) return counterNear(K.st.find(s => s.k === 'stove')); }
    if (contDone(held, now)) {
      const out = cookedOut(held);
      const pl = nearestBy(K.st.filter(s => { const it = st.S[s.i].item; return it && it.k === 'plate' && plateFits(K, it.c.concat(out)); }), s => costTo(st, s, F, now));
      if (pl) return G(pl, 'al', 'item:' + st.S[pl.i].item.id);
    }
    const stove = nearestBy(K.st.filter(s => s.k === 'stove' && !st.S[s.i].item && !st.S[s.i].f), s => costTo(st, s, F, now));
    return stove ? G(stove, 'al', 'put:' + stove.i) : counterNear(null);
  }
  if (held.k === 'ing') {
    if (held.b) return trash();
    let comp = null, entry = null;
    for (const e of N.plan) { const x = e.ings.find(y => y.w.it.id === held.id); if (x) { comp = x.comp; entry = e; break; } }
    if (!comp) return trash();
    const p = parseComp(comp);
    if (ING[p.ing].chop && p.ch && !held.ch) {
      const bd = nearestBy(K.st.filter(s => s.k === 'board' && !st.S[s.i].item && !st.S[s.i].f && !claimedBy(st, pi, 'put:' + s.i)), s => costTo(st, s, F, now));
      if (bd) return G(bd, 'al', 'put:' + bd.i);
      const any = K.st.find(s => s.k === 'board' && !st.S[s.i].item && !st.S[s.i].f);
      if (any) return viaPass(any, 'put:' + any.i);
      return counterNear(K.st.find(s => s.k === 'board'));
    }
    if (p.ck) {
      const ok = s => { const it = st.S[s.i].item; return (stationHeats(s) || s.k === 'counter') && isCont(it) && cookOf(it) === p.ck && !st.S[s.i].f && !contWhyNot(K, it, held, now); };
      const cands = K.st.filter(ok).sort((a, b) => (stationHeats(b) ? 1 : 0) - (stationHeats(a) ? 1 : 0));
      // aynı siparişe ayrılmış kabı tercih et
      const mine = entry && entry.conts.map(w => w.s);
      const pref = cands.filter(s => mine && mine.includes(s.i));
      const heatC = cands.filter(s => stationHeats(s));
      const tgt = nearestBy(pref.length ? pref : heatC.length ? heatC : cands, s => costTo(st, s, F, now)) || (cands[0] || null);
      if (tgt) return viaPass(tgt, 'cook:' + tgt.i);
      return counterNear(K.st.find(s => stationHeats(s)));
    }
    if (entry && entry.plate && entry.plate.s >= 0) { const s = K.st[entry.plate.s]; if (reach(s)) return G(s, 'al', 'item:' + entry.plate.it.id); }
    const pl = nearestBy(K.st.filter(s => { const it = st.S[s.i].item; return it && it.k === 'plate' && plateFits(K, it.c.concat(ingKey(held))); }), s => costTo(st, s, F, now));
    if (pl) return G(pl, 'al', 'item:' + st.S[pl.i].item.id);
    if (win && !reach(win)) { const pc = passCounter(st, pi, F, now); if (pc) return G(pc, 'al', 'put:' + pc.i, { pass: 1 }); }
    return counterNear(win);
  }
  return counterNear(null);
}
function decide(st, pi, b, now, N, F) {
  const K = KS(st), held = st.held[pi];
  b.fetchFor = null;
  const okKey = k => !(b.ban[k] > now) && !claimedBy(st, pi, k);
  if (held) return routeHeld(st, pi, b, held, now, N, F);
  const reachS = s => costTo(st, s, F, now) >= 0;
  // 1) yangın
  const fires = K.st.filter(s => st.S[s.i].f);
  if (fires.length && okKey('fire') && !st.held.some(h => h && h.k === 'ext')) {
    const ext = nearestBy(K.st.filter(s => { const it = st.S[s.i].item; return it && it.k === 'ext'; }), s => costTo(st, s, F, now));
    if (ext) return G(ext, 'al', 'fire');
  }
  // 2) hazır tabağı servis et
  for (const s of surfaces(st)) {
    const it = st.S[s.i].item; if (!it || it.k !== 'plate') continue;
    const d = dishOf(K, it.c); if (d && st.orders.some(o => o.d === d) && okKey('item:' + it.id) && reachS(s)) return G(s, 'al', 'item:' + it.id);
  }
  // 3) tabaklama: pişmiş kap ya da hazır malzeme varsa tabak getir
  const rack = K.st.find(s => s.k === 'rack');
  for (const e of N.plan) {
    const key = 'plate:' + e.o.id; if (!okKey(key)) continue;
    const contReady = e.conts.some(w => w.s >= 0 && contComplete(K, w.it) && (contDone(w.it, now) || (stationHeats(K.st[w.s]) && contProg(w.it, now) > .8)) && reachS(K.st[w.s]));
    const ingReady = e.ings.filter(x => x.w.s >= 0 && x.w.it.k === 'ing' && ingKey(x.w.it) === x.comp).length;
    const urgentBurn = e.conts.some(w => w.s >= 0 && contDone(w.it, now));
    if (!contReady && !(ingReady && (e.plate || ingReady + e.conts.length >= DISHES[e.o.d].c.length - 1 || ingReady >= 2))) continue;
    b.plateFor = e.o.id;
    if (e.plate && e.plate.s >= 0 && reachS(K.st[e.plate.s])) return G(K.st[e.plate.s], 'al', key);
    if (e.plate) continue;
    const loose = nearestBy(surfaces(st).filter(s => { const it = st.S[s.i].item; return it && it.k === 'plate' && !it.c.length; }), s => costTo(st, s, F, now));
    if (loose) return G(loose, 'al', key);
    if (rack && st.S[rack.i].n > 0 && reachS(rack)) return G(rack, 'al', key);
    void urgentBurn;
  }
  // 3b) eksik tarifli kap yanmak üzere: ocaktan al
  for (const s of K.st) {
    if (s.k !== 'stove') continue;
    const it = st.S[s.i].item; if (!isCont(it) || it.burnt || !contDone(it, now) || st.S[s.i].f) continue;
    const bf = burnMs(st, cookOf(it)) / COOK[cookOf(it)].ms;
    if (contProg(it, now) > 1 + bf * (contComplete(K, it) ? .55 : .4) && okKey('item:' + it.id) && reachS(s)) return G(s, 'al', 'item:' + it.id);
  }
  // 4) tahtadaki malzemeyi doğra
  for (const s of K.st) {
    if (s.k !== 'board') continue;
    const D = st.S[s.i], it = D.item;
    if (!it || it.k !== 'ing' || it.ch || it.b || !ING[it.i].chop || D.f || (D.w && D.w.pi !== pi)) continue;
    if (okKey('st:' + s.i) && reachS(s)) return G(s, 'use', 'st:' + s.i, { hold: 1 });
  }
  // 5) gevşek malzemeyi bir sonraki aşamaya taşı
  const freeBoard = K.st.some(s => s.k === 'board' && !st.S[s.i].item && !st.S[s.i].f && reachS(s));
  const splitK = !!botBlocked(st, pi, K), win = K.st.find(s => s.k === 'window');
  const isPass = s => { const mrow = mrowOf(st, now), [c, r] = stCell(K, s, mrow); let mine = false, other = false; for (const [a, bb] of N4) { const x = c + a, y = r + bb; if (!walkable(K, x, y, mrow)) continue; if (F.d[y * K.W + x] >= 0) mine = true; else other = true; } return mine && other; };
  for (const e of N.plan) for (const x of e.ings) {
    const w = x.w; if (w.s < 0 || w.it.k !== 'ing') continue;
    const s = K.st[w.s]; if (st.S[s.i].w || !okKey('item:' + w.it.id) || !reachS(s)) continue;
    const p = parseComp(x.comp);
    const needChop = ING[p.ing].chop && p.ch && !w.it.ch;
    if (needChop) { if (s.k !== 'board' && freeBoard) return G(s, 'al', 'item:' + w.it.id); continue; }
    if (p.ck) {
      const accs = K.st.filter(t => { const it = st.S[t.i].item; return (stationHeats(t) || t.k === 'counter') && isCont(it) && cookOf(it) === p.ck && !st.S[t.i].f && !contWhyNot(K, it, w.it, now); });
      if (accs.some(reachS) || (s.k === 'belt' && !w.it.ch)) return G(s, 'al', 'item:' + w.it.id);
      if (accs.length && splitK && !isPass(s)) return G(s, 'al', 'item:' + w.it.id);
      continue;
    }
    const plateOk = e.plate && e.plate.s >= 0 && reachS(K.st[e.plate.s]);
    if (s.k === 'board' || s.k === 'belt' || plateOk) return G(s, 'al', 'item:' + w.it.id);
    if (splitK && win && !reachS(win) && !isPass(s)) return G(s, 'al', 'item:' + w.it.id);
  }
  // 6) bulaşık
  const sink = K.st.find(s => s.k === 'sink'), ret = K.st.find(s => s.k === 'ret');
  const rackN = rack ? st.S[rack.i].n : 0, plateNeed = Math.min(2, st.orders.length);
  if (sink && rackN < plateNeed + 1) {
    const D = st.S[sink.i];
    if (D.d > 0 && !(D.w && D.w.pi !== pi) && okKey('st:' + sink.i) && reachS(sink)) return G(sink, 'use', 'st:' + sink.i, { hold: 1 });
    if (ret && st.S[ret.i].n > 0 && okKey('ret') && reachS(ret)) return G(ret, 'al', 'ret');
  }
  // 7) eksik malzemeyi kasadan / banttan getir
  for (const f of N.fetch) {
    const key = 'fetch:' + f.oid + ':' + f.comp; if (!okKey(key)) continue;
    if (K.belt.length) {
      const bs = nearestBy(K.belt.map(i => K.st[i]).filter(s => { const it = st.S[s.i].item; return it && it.k === 'ing' && it.i === f.ing && !it.b && okKey('item:' + it.id); }), s => costTo(st, s, F, now));
      if (bs) { b.fetchFor = { oid: f.oid, comp: f.comp }; return G(bs, 'al', key, { track: st.S[bs.i].item.id }); }
      continue;
    }
    const cr = nearestBy(K.st.filter(s => s.k === 'crate' && s.ing === f.ing), s => costTo(st, s, F, now));
    if (cr) { b.fetchFor = { oid: f.oid, comp: f.comp }; return G(cr, 'al', key); }
  }
  // 8) toparla: kirli tabakları yıka, yanmışları çöpe at
  if (sink) {
    const D = st.S[sink.i];
    if (D.d > 0 && !(D.w && D.w.pi !== pi) && okKey('st:' + sink.i) && reachS(sink)) return G(sink, 'use', 'st:' + sink.i, { hold: 1 });
    if (ret && st.S[ret.i].n > 0 && okKey('ret') && reachS(ret)) return G(ret, 'al', 'ret');
  }
  for (const s of surfaces(st)) {
    const it = st.S[s.i].item; if (!it || st.S[s.i].f) continue;
    const junk = (it.k === 'ing' && it.b) || (isCont(it) && it.burnt && s.k !== 'oven') || (it.k === 'plate' && it.c.includes('komur'));
    if (junk && okKey('item:' + it.id) && reachS(s)) return G(s, 'al', 'item:' + it.id);
    // ocaktan alınmış kap ocağa dönsün
    if ((it.k === 'pot' || it.k === 'pan') && s.k !== 'stove' && !contDone(it, now) && !it.burnt && okKey('item:' + it.id) && reachS(s) && K.st.some(t => t.k === 'stove' && !st.S[t.i].item && reachS(t))) return G(s, 'al', 'item:' + it.id);
  }
  return null;
}
function goalValid(st, pi, b, g, now) {
  const K = KS(st), s = K.st[g.s], D = st.S[g.s], held = st.held[pi];
  if (!s) return false;
  if (g.track) { const k = K.belt.find(i => st.S[i].item && st.S[i].item.id === g.track); if (k === undefined) return false; g.s = k; }
  if (g.act === 'use' && g.spray) return !!D.f && held && held.k === 'ext';
  if (g.act === 'use') {
    if (held) return false;
    if (s.k === 'board') return !!(D.item && D.item.k === 'ing' && !D.item.ch && !D.f);
    if (s.k === 'sink') return D.d > 0 && !D.f;
    return false;
  }
  if (g.key.startsWith('item:')) { const id = +g.key.slice(5); if (!(D.item && D.item.id === id)) return false; }
  if (g.key.startsWith('put:') && D.item) return false;
  return true;
}
function botSteer(st, pi, b, F, goalCell, now) {
  const K = KS(st), p = st.pos[pi], W = K.W;
  if (b.jit != null && now < b.jitUntil) return [Math.cos(b.jit), Math.sin(b.jit)];
  if (goalCell < 0) return [0, 0];
  // yol: hedef hücreden geriye
  const key = goalCell + ':' + Math.floor(p.x) + ',' + Math.floor(p.y);
  if (!b.path || b.pathGoal !== key || now - b.pathAt > 600) {
    const out = []; let c = goalCell, k = 0;
    while (c >= 0 && k++ < 200) { out.push(c); if (F.d[c] === 0) break; c = F.par[c]; }
    out.reverse(); b.path = out.slice(1); b.pathGoal = key; b.pathAt = now;
  }
  while (b.path.length > 1) { const c = b.path[0], cx = c % W + .5, cy = Math.floor(c / W) + .5; if (dist(p.x, p.y, cx, cy) < .35) b.path.shift(); else break; }
  const tgt = b.path.length ? b.path[0] : goalCell, tx = tgt % W + .5, ty = Math.floor(tgt / W) + .5;
  let dx = tx - p.x, dy = ty - p.y; const d = Math.hypot(dx, dy);
  if (d < .07) return [0, 0];
  dx /= d; dy /= d;
  const sc = d < .4 && tgt === goalCell ? clamp(d / .4, .25, 1) : 1;
  // diğer aşçılardan hafifçe kaç
  st.players.forEach((_, j) => { if (j === pi) return; const q = st.pos[j], e = dist(p.x, p.y, q.x, q.y); if (e < .8 && e > 1e-3) { dx += (p.x - q.x) / e * (.8 - e) * 1.2; dy += (p.y - q.y) / e * (.8 - e) * 1.2; } });
  const m = Math.hypot(dx, dy) || 1;
  return [dx / m * sc, dy / m * sc];
}
function parkCell(st, pi, b, F, now) {
  const K = KS(st), W = K.W;
  if (b.park != null && now < b.parkAt && F.d[b.park] >= 0) return b.park;
  let best = -1, bs = -1e9;
  for (let c = 0; c < W * K.H; c++) {
    const dd = F.d[c]; if (dd < 0 || dd > 7) continue;
    const x = c % W, y = Math.floor(c / W);
    let open = 0; for (const [a, bb] of N8) if (F.ok(x + a, y + bb)) open++;
    if (open < 6) continue;
    let near = 9; st.players.forEach((_, j) => { if (j !== pi) near = Math.min(near, dist(st.pos[j].x, st.pos[j].y, x + .5, y + .5)); });
    const sc = Math.min(near, 3.5) * 2 - dd * .25 + Math.random() * .3;
    if (sc > bs) { bs = sc; best = c; }
  }
  b.park = best; b.parkAt = now + rnd(2500, 4000);
  return best;
}
function stepBots(st, dt, now, ctx) {
  const K = KS(st), ids = Object.keys(st.bot); if (!ids.length) return;
  const N = needs(st, now), mrow = mrowOf(st, now), sway = swayAt(K, st.t0, now);
  for (const k of ids) {
    const pi = +k, b = st.bot[k], p = st.pos[pi];
    const F = bfsField(st, pi, now);
    if (b.goal && !goalValid(st, pi, b, b.goal, now)) b.goal = null;
    if (!b.goal || now >= b.thinkAt) {
      const g = decide(st, pi, b, now, N, F);
      if (g && b.goal && g.key === b.goal.key && g.s === b.goal.s) { /* aynı iş */ } else { b.goal = g; b.path = null; b.stuck = 0; }
      b.thinkAt = now + rnd(450, 650);
    }
    let goalCell = -1, faceTo = null;
    const g = b.goal;
    if (g) {
      const s = K.st[g.s], cs = standCells(st, s, F, now);
      if (cs.length) { goalCell = cs.reduce((a, c) => (F.d[c] < F.d[a] ? c : a), cs[0]); faceTo = stPos(K, s, mrow); }
      else if (!(s.mv && moverSliding(K, st.t0, now))) { b.ban[g.key] = now + 2500; b.goal = null; }
    } else goalCell = parkCell(st, pi, b, F, now);
    let [ix, iy] = botSteer(st, pi, b, F, goalCell, now);
    const body = { x: p.x, y: p.y, vx: b.vx, vy: b.vy };
    moveBody(K, body, ix, iy, BOT_SPEED, dt, { mrow, sway });
    b.vx = body.vx; b.vy = body.vy;
    let fx = p.fx, fy = p.fy;
    const sp = Math.hypot(b.vx, b.vy);
    const at = goalCell >= 0 && dist(body.x, body.y, goalCell % K.W + .5, Math.floor(goalCell / K.W) + .5) < .3;
    if (g && faceTo && (at || dist(body.x, body.y, faceTo[0], faceTo[1]) < 1.15)) { const dx = faceTo[0] - body.x, dy = faceTo[1] - body.y, m = Math.hypot(dx, dy) || 1; fx = dx / m; fy = dy / m; }
    else if (sp > .4) { fx = b.vx / sp; fy = b.vy / sp; }
    st.pos[pi] = { x: r2(body.x), y: r2(body.y), fx: r2(fx), fy: r2(fy), t: now, m: sp > .5 ? 1 : 0 };
    // takılma
    if ((ix || iy) && !at) {
      if (now - b.sAt > 900) {
        if (dist(body.x, body.y, b.sx, b.sy) < .15) { b.stuck++; b.jit = rnd(0, TAU); b.jitUntil = now + 320; b.path = null; if (b.stuck >= 4 && g) { b.ban[g.key] = now + 3500; b.goal = null; b.stuck = 0; } }
        else b.stuck = 0;
        b.sx = body.x; b.sy = body.y; b.sAt = now;
      }
    } else { b.sx = body.x; b.sy = body.y; b.sAt = now; }
    // eylem
    if (g && b.goal === g && (at || inReach(st, pi, K.st[g.s], now)) && now >= b.actAt && (at || sp < 1.2)) {
      if (g.wait && !contDone(st.S[g.s].item || {}, now)) continue;
      if (g.hold && st.S[g.s].w && st.S[g.s].w.pi === pi) continue;   // doğruyor / yıkıyor
      b.actAt = now + (g.spray ? 280 : rnd(170, 260));
      const r = act(st, pi, { t: g.act, s: g.s }, now, ctx);
      if (g.spray || g.hold) { if (r) { b.ban[g.key] = now + 1500; b.goal = null; } }
      else { if (r) b.ban[g.key] = now + 2200; b.goal = null; b.thinkAt = 0; }
    }
  }
}
function broadcastBots(st) {
  const arr = [];
  for (const k of Object.keys(st.bot)) { const p = st.pos[k]; arr.push([+k, p.x, p.y, p.fx, p.fy, p.m ? 1 : 0]); }
  if (!arr.length) return;
  arr.forEach(a => uiFeed(a[0], a[1], a[2], a[3], a[4], a[5]));
  fastOut({ t: 'b', p: arr });
}

// Test yardımcısı: bir insan koltuğu için bot beyninin önerisi (UI testleri insanı bununla yönetir)
const humanBrains = {};
function planFor(pi) {
  const R0 = window.CFX && window.CFX.Room, gm = R0 && R0.game; if (!gm || !gm.state) return null;
  const st = gm.state, now = Date.now(); if (st.phase !== 'play') return null;
  const b = humanBrains[pi] || (humanBrains[pi] = newBot());
  const F = bfsField(st, pi, now), K = KS(st);
  if (b.goal && !goalValid(st, pi, b, b.goal, now)) b.goal = null;
  if (!b.goal || now >= b.thinkAt) { b.goal = decide(st, pi, b, now, needs(st, now), F); b.thinkAt = now + 900; }
  const g = b.goal; if (!g) return { idle: true };
  const s = K.st[g.s], cs = standCells(st, s, F, now); if (!cs.length) return { idle: true, key: g.key };
  const goal = cs.reduce((a, c) => (F.d[c] < F.d[a] ? c : a), cs[0]);
  let c = goal, nxt = goal, k = 0; while (c >= 0 && F.d[c] > 0 && k++ < 200) { nxt = c; c = F.par[c]; }
  const W = K.W, fp = stPos(K, s, mrowOf(st, now));
  return { act: g.act, s: g.s, key: g.key, hold: !!g.hold, spray: !!g.spray, wait: !!g.wait, goal: [goal % W + .5, Math.floor(goal / W) + .5], next: [nxt % W + .5, Math.floor(nxt / W) + .5], face: fp, steps: F.d[goal], kind: s.k };
}
function routeTo(pi, si) {   // test yardımcısı: koltuğu istasyona götüren sıradaki karo
  const R0 = window.CFX && window.CFX.Room, gm = R0 && R0.game; if (!gm || !gm.state) return null;
  const st = gm.state, now = Date.now(), K = KS(st), F = bfsField(st, pi, now), s = K.st[si], cs = standCells(st, s, F, now);
  if (!cs.length) return null;
  const goal = cs.reduce((a, c) => (F.d[c] < F.d[a] ? c : a), cs[0]);
  let c = goal, nxt = goal, k = 0; while (c >= 0 && F.d[c] > 0 && k++ < 200) { nxt = c; c = F.par[c]; }
  const W = K.W;
  return { goal: [goal % W + .5, Math.floor(goal / W) + .5], next: [nxt % W + .5, Math.floor(nxt / W) + .5], face: stPos(K, s, mrowOf(st, now)), steps: F.d[goal] };
}
function planBan(pi, ms) { const b = humanBrains[pi]; if (b && b.goal) { b.ban[b.goal.key] = Date.now() + (ms || 2500); b.goal = null; } }

/* ------------------------------------------------------------------ eylem ve ana döngü */
function act(st, pi, a, now, ctx) {
  if (st.phase !== 'play') return 'Henüz değil';
  const K = KS(st);
  const s = Number.isInteger(a.s) && a.s >= 0 && a.s < K.st.length ? K.st[a.s] : null;
  if (a.t === 'use' && st.held[pi] && st.held[pi].k === 'ext') return doUse(st, pi, s && inReach(st, pi, s, now) ? s : null, now, ctx);
  if (!s) return 'Önünde bir şey yok';
  if (!inReach(st, pi, s, now)) return s.mv && moverSliding(K, st.t0, now) ? 'Tezgâh kayıyor!' : 'Çok uzak';
  const r = a.t === 'al' ? doAl(st, pi, s, now, ctx) : doUse(st, pi, s, now, ctx);
  st.dirty = true;
  return r;
}
function tick(st, ctx) {
  const now = Date.now(), dt = clamp((now - st.lastTick) / 1000, 0, .25); st.lastTick = now;
  let dirty = !!st.dirty; st.dirty = false;
  if (st.phase === 'count') { if (now >= st.countEnd) { startPlay(st, now, ctx); dirty = true; } }
  else if (st.phase === 'play') {
    stepBots(st, dt, now, ctx);
    if (stepWork(st, now, ctx)) dirty = true;
    if (stepCook(st, now, ctx)) dirty = true;
    if (stepFire(st, now, dt, ctx)) dirty = true;
    if (stepOrders(st, now, ctx)) dirty = true;
    if (stepBelt(st, now, ctx)) dirty = true;
    if (st.dirty) { dirty = true; st.dirty = false; }
    if (now >= st.endsAt) { endGame(st, now, ctx); dirty = true; }
    broadcastBots(st);
  } else if (st.phase === 'end') { if (now >= st.endsAt) { finish(st, ctx); return; } }
  if ((dirty && now - st.lastSync >= 140) || now - st.lastSync >= 1000) { st.lastSync = now; ctx.sync(); }
  else if (dirty) st.dirty = true;
}
function runLoop(st, ctx) {
  const id = ++st.loopId;
  const step = () => {
    if (st.loopId !== id || st.phase === 'over') return;
    try { tick(st, ctx); } catch (e) { console.error(e); }
    if (st.phase !== 'over') ctx.later(TICK, step);
  };
  ctx.later(TICK, step);
}
const cloneIt = it => (it ? JSON.parse(JSON.stringify(it)) : null);

const RULES = {
  setup(players, opts, ctx) {
    opts = opts || {};
    let kid = KITCHENS[opts.mutfak] ? opts.mutfak : (opts.mutfak === 'rastgele' ? pickR(KIT_IDS) : 'mahalle');
    const mins = clamp(parseFloat(opts.sure) || 3, .25, 5), diff = DIFF[opts.zorluk] ? opts.zorluk : 'normal';
    const n = players.length;
    const mul = TEAM_MUL[Math.min(n, 6)] * DIFF[diff].star * mins * (n === 1 ? (KITCHENS[kid].solo || 1) : 1);
    const st = {
      kid, diff, mins, durMs: Math.round(mins * 60000), phase: 'count', countEnd: Date.now() + COUNT_MS, t0: 0, endsAt: 0,
      players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })),
      online: players.map(() => true), held: players.map(() => null), spray: players.map(() => 0),
      stats: players.map(() => ({ sv: 0, ch: 0, wa: 0, fi: 0, pts: 0 })),
      pos: [], S: [], orders: [], oid: 0, idc: 0, nextOrderAt: 0, lastDish: [], returns: [],
      score: 0, served: 0, missed: 0, tips: 0, thr: KITCHENS[kid].star.map(v => Math.max(10, Math.round(v * mul / 5) * 5)),
      beltAt: 0, supplyAt: 0, spawnVer: 0, bot: {}, last: null, lastTick: Date.now(), lastSync: 0, loopId: 0, dirty: false
    };
    freshStations(st); placeChefs(st);
    st.players.forEach((p, i) => { if (p.isBot) st.bot[i] = newBot(); });
    ctx.emit({ t: 'start' }, `${KITCHENS[kid].icon} ${KITCHENS[kid].n} · ${mins} dk · ${DIFF[diff].n}`, 'gold');
    runLoop(st, ctx);
    return st;
  },
  action(st, pi, a, ctx) {
    if (!a || typeof a.t !== 'string') return;
    const now = Date.now();
    if (a.t === 'al' || a.t === 'use') {
      if (st.players[pi] && !st.players[pi].isBot) applyPos(st, pi, +a.x, +a.y, +a.fx, +a.fy);
      const r = act(st, pi, { t: a.t, s: Number.isInteger(a.s) ? a.s : -1 }, now, ctx);
      if (r) ctx.emit({ t: 'no', pi, m: r });
      ctx.sync(); st.lastSync = now;
    }
  },
  view(st, viewer) {
    const n = st.players.length, me = Number.isInteger(viewer) && viewer >= 0 && viewer < n ? viewer : -1;
    const S = [];
    st.S.forEach((D, i) => { if (D.item || D.n || D.d || D.w || D.f || D.wp) S.push({ i, it: cloneIt(D.item), n: D.n, d: D.d, w: D.w, f: D.f ? { hp: r2(D.f.hp) } : null, wp: r2(D.wp || 0) }); });
    return {
      kid: st.kid, diff: st.diff, mins: st.mins, phase: st.phase, countEnd: st.countEnd, t0: st.t0, endsAt: st.endsAt, durMs: st.durMs, me,
      thr: st.thr, score: st.score, served: st.served, missed: st.missed, tips: st.tips, spawnVer: st.spawnVer,
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, online: st.online[i] !== false })),
      stats: st.stats.map(s => Object.assign({}, s)),
      pos: st.pos.map(p => [p.x, p.y, p.fx, p.fy]),
      held: st.held.map(cloneIt), spray: st.spray.slice(), S,
      orders: st.orders.map(o => ({ id: o.id, d: o.d, t0: o.t0, dur: o.dur })), beltAt: st.beltAt,
      last: st.phase === 'end' || st.phase === 'over' ? st.last : null
    };
  },
  turnOf() { return null; },
  skipTurn() { /* gerçek zamanlı: kopmalar onPresence ile işlenir */ },
  botAct() { /* botlar yöneten cihazdaki döngüde hareket eder */ },
  botDelay: 900,
  onPresence(st, pi, online, ctx) {
    st.online[pi] = online;
    if (online) return;
    const now = Date.now();
    st.S.forEach(D => { if (D.w && D.w.pi === pi) D.w = null; });
    st.spray[pi] = 0;
    if (st.held[pi]) dropHeld(st, pi, now, ctx);
    ctx.sync();
  },
  resume(st, ctx) {
    if (st.phase === 'over') return;
    const now = Date.now(); st.lastTick = now; st.pos.forEach(p => { p.t = now; });
    runLoop(st, ctx);
  }
};

/* ------------------------------------------------------------------ ÇİZİM: yardımcılar
   Tüm çizimler karo biriminde (1 = bir karo), nesnenin merkezinde dik (upright) çerçevede. */
function rrPath(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const D = {
  circle(g, x, y, r, fill, stroke, lw) { g.beginPath(); g.arc(x, y, Math.max(.001, r), 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || .03; g.stroke(); } },
  ell(g, x, y, rx, ry, fill, rot = 0, stroke, lw) { g.beginPath(); g.ellipse(x, y, Math.max(.001, rx), Math.max(.001, ry), rot, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || .03; g.stroke(); } },
  rr(g, x, y, w, h, r, fill, stroke, lw) { rrPath(g, x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || .03; g.stroke(); } },
  poly(g, pts, fill, stroke, lw) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || .03; g.stroke(); } },
  line(g, x0, y0, x1, y1, col, lw) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokeStyle = col; g.lineWidth = lw || .03; g.stroke(); }
};
const OUT = 'rgba(40,20,20,.55)';
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---- malzemeler ---- */
function drawIng(g, ing, ch, ck, burnt, s = 1) {
  g.save(); g.scale(s, s); g.lineJoin = 'round'; g.lineCap = 'round';
  if (burnt || ing === 'komur') {
    D.ell(g, 0, .03, .25, .18, '#2b2326', 0, '#111', .03); D.circle(g, -.08, -.02, .06, '#4a3d40'); D.circle(g, .09, .04, .05, '#3a2f32');
    g.restore(); return;
  }
  const cooked = !!ck;
  switch (ing) {
    case 'domates':
      if (cooked) { D.ell(g, 0, .02, .24, .17, '#c9301f', 0, '#7a160c', .03); D.circle(g, -.07, -.02, .05, '#ff6b4a'); D.circle(g, .08, .05, .04, '#ff6b4a'); }
      else if (ch) { [[-.11, .06], [.11, .06], [0, -.08]].forEach(([x, y]) => { D.circle(g, x, y, .12, '#e8402f', '#8d1d12', .025); D.circle(g, x, y, .085, '#ff8a6a'); for (let k = 0; k < 4; k++) D.circle(g, x + Math.cos(k * 1.6) * .045, y + Math.sin(k * 1.6) * .045, .015, '#fff3b0'); }); }
      else { D.circle(g, 0, .03, .25, '#e8402f', '#8d1d12', .03); D.ell(g, -.09, -.05, .07, .04, 'rgba(255,255,255,.55)', -.6); D.poly(g, [[0, -.24], [.07, -.16], [.15, -.2], [.07, -.12], [0, -.14], [-.07, -.12], [-.15, -.2], [-.07, -.16]], '#3fa34d', '#1f6a2a', .02); }
      break;
    case 'marul':
      if (ch) { for (let k = 0; k < 7; k++) { const a = k * .9; g.strokeStyle = k % 2 ? '#7ad04a' : '#4fae36'; g.lineWidth = .07; g.beginPath(); g.arc(Math.cos(a) * .1, Math.sin(a) * .08, .09, a, a + 2.2); g.stroke(); } }
      else { for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; D.circle(g, Math.cos(a) * .13, Math.sin(a) * .11, .12, '#4fae36', '#2d7a22', .02); } D.circle(g, 0, 0, .15, '#8ee05a'); D.circle(g, 0, 0, .07, '#c3f590'); }
      break;
    case 'biber':
      if (cooked) { [[-.1, .02], [.06, -.06], [.08, .08]].forEach(([x, y]) => D.ell(g, x, y, .09, .05, '#3e8a2a', .5, '#22561a', .02)); }
      else if (ch) { [[-.11, .05], [.1, .07], [0, -.08]].forEach(([x, y]) => { D.circle(g, x, y, .1, null, '#2f8a2a', .055); D.circle(g, x, y, .1, null, '#7ad04a', .02); }); }
      else { g.save(); g.rotate(-.5); D.ell(g, 0, .03, .1, .25, '#3faa36', 0, '#1f6a1a', .03); D.ell(g, -.03, -.02, .025, .14, 'rgba(255,255,255,.45)'); D.rr(g, -.025, -.3, .05, .1, .02, '#6b8f2a'); g.restore(); }
      break;
    case 'sogan':
      if (cooked) { [[-.09, .04], [.08, .05], [0, -.07]].forEach(([x, y]) => D.circle(g, x, y, .09, null, '#c79a5a', .05)); }
      else if (ch) { [[-.1, .05], [.1, .06], [0, -.08]].forEach(([x, y]) => { D.circle(g, x, y, .11, null, '#a86ab8', .04); D.circle(g, x, y, .06, null, '#f0dcf5', .03); }); }
      else { D.ell(g, 0, .05, .22, .2, '#b07ac0', 0, '#6a3a7a', .03); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = .02; [-.1, 0, .1].forEach(x => { g.beginPath(); g.moveTo(x * .6, -.12); g.quadraticCurveTo(x * 1.6, .05, x * .6, .23); g.stroke(); }); D.poly(g, [[-.04, -.12], [0, -.28], [.04, -.12]], '#d9c08a', '#8a6a3a', .02); }
      break;
    case 'kasar':
      if (cooked) { D.ell(g, 0, 0, .22, .16, '#ffd23f', 0, '#c79a00', .025); D.circle(g, -.06, -.03, .03, '#ffe98a'); }
      else if (ch) { [[-.1, .06], [.06, .08], [-.02, -.07], [.12, -.05]].forEach(([x, y]) => D.rr(g, x - .06, y - .06, .12, .12, .02, '#ffd23f', '#b58900', .02)); }
      else { D.poly(g, [[-.25, .16], [.25, .16], [.16, -.18]], '#ffd23f', '#b58900', .03); D.circle(g, 0, .07, .04, '#e6b400'); D.circle(g, .12, -.04, .03, '#e6b400'); D.circle(g, -.1, .11, .025, '#e6b400'); }
      break;
    case 'et':
      if (cooked) { for (let k = 0; k < 3; k++) { D.rr(g, -.2 + k * .04, -.16 + k * .1, .36, .1, .04, k % 2 ? '#a0562a' : '#8a4520', '#5a2a10', .02); } D.line(g, -.12, -.1, .08, -.1, 'rgba(255,200,120,.5)', .02); }
      else { D.ell(g, 0, .02, .26, .17, '#e05a5a', -.2, '#8d2626', .03); D.ell(g, .06, -.02, .14, .07, '#f2a0a0', -.2); D.ell(g, -.12, .07, .06, .03, '#fff0f0', -.2); }
      break;
    case 'kiyma':
      if (cooked) { for (let k = 0; k < 9; k++) D.circle(g, Math.cos(k * 2.3) * .14 * (k % 3) / 2, Math.sin(k * 2.3) * .1 * (k % 3) / 2, .06, '#8a4a2a', '#5a2a10', .015); }
      else { D.ell(g, 0, .04, .24, .16, '#e86a7a', 0, '#9a2a3a', .03); for (let k = 0; k < 10; k++) D.circle(g, Math.cos(k * 2.1) * .15 * ((k % 4) / 4), .02 + Math.sin(k * 2.1) * .1 * ((k % 4) / 4), .03, '#f7a3ae'); }
      break;
    case 'kofte':
      [[-.12, .05], [.12, .05], [0, -.08]].forEach(([x, y]) => D.ell(g, x, y, .12, .09, cooked ? '#8a4520' : '#e07a7a', 0, cooked ? '#4a2210' : '#9a3a3a', .025));
      if (cooked) [[-.12, .03], [.12, .03], [0, -.1]].forEach(([x, y]) => D.line(g, x - .05, y, x + .05, y, 'rgba(255,190,120,.6)', .02));
      break;
    case 'yumurta':
      if (cooked) { D.poly(g, [[-.24, 0], [-.16, -.15], [0, -.2], [.18, -.14], [.25, .02], [.14, .17], [-.06, .18], [-.2, .12]], '#ffffff', '#d9d0c0', .025); D.circle(g, .02, 0, .09, '#ffb627', '#d9840a', .02); D.circle(g, -.01, -.03, .03, '#fff1b0'); }
      else { D.ell(g, 0, .02, .17, .23, '#fff6e6', 0, '#c9b28a', .03); D.ell(g, -.05, -.06, .04, .07, 'rgba(255,255,255,.9)', -.3); }
      break;
    case 'mercimek': {
      const r = seeded(7);
      if (cooked) { D.ell(g, 0, .02, .24, .16, '#e8892a', 0, '#9a5010', .025); for (let k = 0; k < 8; k++) D.circle(g, (r() - .5) * .3, (r() - .5) * .2, .025, '#ffb35a'); }
      else { D.ell(g, 0, .1, .26, .1, '#c96a1a'); for (let k = 0; k < 26; k++) { const a = r() * TAU, d = Math.sqrt(r()); D.ell(g, Math.cos(a) * d * .22, .02 + Math.sin(a) * d * .14 - (1 - d) * .06, .04, .028, k % 3 ? '#f08a2a' : '#ffaa4a', a, '#9a4a10', .012); } }
      break;
    }
    case 'hamur':
      if (cooked) { D.ell(g, 0, 0, .25, .17, '#e0a050', 0, '#9a6020', .03); D.circle(g, -.08, -.03, .03, '#c07a30'); D.circle(g, .1, .04, .025, '#c07a30'); }
      else { D.ell(g, 0, .04, .23, .19, '#f6e2b8', 0, '#b8975a', .03); D.ell(g, -.07, -.03, .07, .04, 'rgba(255,255,255,.7)', -.4); [[.08, .06], [-.02, .1], [.12, -.04]].forEach(([x, y]) => D.circle(g, x, y, .012, '#ffffff')); }
      break;
    case 'lavas':
      D.ell(g, 0, .02, .27, .2, '#f3dca8', 0, '#b8975a', .03); D.ell(g, .03, .05, .2, .13, '#ead09a');
      [[-.1, -.04], [.08, .08], [.14, -.06], [-.04, .1]].forEach(([x, y]) => D.circle(g, x, y, .022, '#c99a5a'));
      break;
    case 'ekmek':
      g.save(); g.rotate(-.35); D.rr(g, -.27, -.12, .54, .24, .12, '#e3a24a', '#8a5a1a', .03); [-.12, 0, .12].forEach(x => D.line(g, x - .04, -.06, x + .04, .06, '#f7d08a', .03)); g.restore();
      break;
    default: D.circle(g, 0, 0, .2, '#ccc');
  }
  g.restore();
}

/* ---- yemekler (tamamlanmış tabak) ---- */
function drawDish(g, d, s = 1) {
  g.save(); g.scale(s, s); g.lineJoin = 'round'; g.lineCap = 'round';
  switch (d) {
    case 'salata':
      D.circle(g, 0, 0, .27, '#e9f7ff', '#7aa0b8', .025);
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; D.circle(g, Math.cos(a) * .12, Math.sin(a) * .1, .09, k % 2 ? '#5cbf3a' : '#8ee05a'); }
      [[-.07, -.04], [.08, .02], [-.01, .1], [.1, -.09]].forEach(([x, y]) => D.circle(g, x, y, .05, '#e8402f', '#8d1d12', .015));
      break;
    case 'durum':
      g.save(); g.rotate(-.55);
      D.rr(g, -.3, -.12, .6, .24, .12, '#f0d29a', '#a8803a', .03);
      g.strokeStyle = 'rgba(160,110,50,.6)'; g.lineWidth = .02; [-.15, 0, .15].forEach(x => { g.beginPath(); g.moveTo(x, -.12); g.lineTo(x + .04, .12); g.stroke(); });
      D.ell(g, .28, 0, .07, .12, '#a0562a'); D.circle(g, .28, -.04, .03, '#e8402f'); D.circle(g, .29, .05, .025, '#5cbf3a');
      g.restore(); break;
    case 'menemen':
      D.circle(g, 0, 0, .28, '#b8663a', '#6a3418', .035); D.circle(g, 0, 0, .23, '#d84a2a');
      [[-.08, -.05], [.09, .04]].forEach(([x, y]) => { D.ell(g, x, y, .09, .07, '#fff3d6'); D.circle(g, x, y, .045, '#ffb627'); });
      [[.07, -.11], [-.1, .1], [.13, .12]].forEach(([x, y]) => D.ell(g, x, y, .035, .02, '#3faa36', .6));
      D.rr(g, .24, -.04, .16, .08, .03, '#6a3418');
      break;
    case 'corba':
      D.circle(g, 0, 0, .29, '#ffffff', '#b9a99a', .03); D.circle(g, 0, 0, .22, '#e8892a'); D.ell(g, -.06, -.06, .1, .05, 'rgba(255,220,150,.5)', -.5);
      D.poly(g, [[.04, .02], [.2, -.06], [.17, .1]], '#fff36a', '#c9b000', .02);
      for (let k = 0; k < 6; k++) D.circle(g, -.12 + k * .04, .1 - (k % 2) * .05, .012, '#b0201a');
      break;
    case 'pide':
      g.save(); g.rotate(-.4);
      g.beginPath(); g.moveTo(-.34, 0); g.quadraticCurveTo(0, -.24, .34, 0); g.quadraticCurveTo(0, .24, -.34, 0); g.closePath(); g.fillStyle = '#e0a050'; g.fill(); g.strokeStyle = '#8a5a1a'; g.lineWidth = .03; g.stroke();
      D.ell(g, 0, 0, .2, .08, '#ffd23f'); D.circle(g, -.06, -.01, .025, '#ffea8a'); D.circle(g, .08, .02, .02, '#f0b800');
      g.restore(); break;
    case 'lahmacun':
      D.circle(g, 0, 0, .29, '#f0cf90', '#a8803a', .03); D.circle(g, 0, 0, .24, '#c2452a');
      for (let k = 0; k < 9; k++) { const a = k * 2.4, d = (k % 3 + 1) * .06; D.circle(g, Math.cos(a) * d, Math.sin(a) * d, .022, '#7a2a14'); }
      [[.08, -.1], [-.1, .06], [.05, .12]].forEach(([x, y]) => D.circle(g, x, y, .03, '#3faa36'));
      D.poly(g, [[.12, .02], [.27, -.04], [.25, .1]], '#fff36a', '#c9b000', .015);
      break;
    case 'kofte':
      g.save(); g.rotate(-.3);
      D.rr(g, -.3, -.15, .6, .3, .13, '#e3a24a', '#8a5a1a', .03); D.rr(g, -.26, -.08, .52, .16, .07, '#f7e0b0');
      [-.16, 0, .16].forEach(x => D.ell(g, x, 0, .08, .06, '#8a4520', 0, '#4a2210', .02));
      [-.08, .08].forEach(x => D.circle(g, x, -.06, .04, null, '#c9a0d5', .02));
      g.restore(); break;
    default: D.circle(g, 0, 0, .2, '#ccc');
  }
  g.restore();
}
function drawPlate(g, K, c, s = 1, dirty) {
  g.save(); g.scale(s, s);
  D.ell(g, .02, .05, .36, .3, 'rgba(0,0,0,.18)');
  D.circle(g, 0, 0, .36, dirty ? '#d9d2bf' : '#ffffff', '#a8a2b8', .03); D.circle(g, 0, 0, .27, null, dirty ? '#bfb59a' : '#e3e0ee', .025);
  if (dirty) { D.circle(g, -.1, -.05, .06, 'rgba(140,110,60,.45)'); D.circle(g, .08, .09, .05, 'rgba(140,110,60,.4)'); }
  const d = K && c && c.length ? dishOf(K, c) : null;
  if (d) drawDish(g, d, .95);
  else if (c && c.length) {
    const n = c.length, pos = n === 1 ? [[0, 0]] : n === 2 ? [[-.13, 0], [.13, 0]] : [[-.13, .08], [.13, .08], [0, -.12]];
    c.forEach((x, i) => { const p = parseComp(x), q = pos[i] || [0, 0]; g.save(); g.translate(q[0], q[1]); drawIng(g, p.ing, p.ch, p.ck, x === 'komur', n === 1 ? .9 : .55); g.restore(); });
  }
  g.restore();
}
/* ---- kaplar ---- */
function drawCont(g, it, now, s = 1, inOven) {
  g.save(); g.scale(s, s);
  const k = it.k, n = it.c.length, done = contDone(it, now), p = contProg(it, now);
  const contentCol = () => {
    if (it.burnt) return '#2b2326';
    if (k === 'pot') return done ? '#e8892a' : '#d9a24a';
    return done ? '#b85a2a' : '#c98a5a';
  };
  if (k === 'pot') {
    D.rr(g, -.42, -.07, .12, .1, .04, '#7d8794', '#3d4450', .02); D.rr(g, .3, -.07, .12, .1, .04, '#7d8794', '#3d4450', .02);
    D.circle(g, 0, 0, .33, '#aeb6c2', '#4d5562', .035); D.circle(g, 0, 0, .27, '#5d6672');
    if (n) { D.circle(g, 0, 0, .25, contentCol()); if (!it.burnt) for (let i = 0; i < n; i++) { const a = i / n * TAU + .5; g.save(); g.translate(Math.cos(a) * .11, Math.sin(a) * .1); drawIng(g, parseComp(it.c[i]).ing, parseComp(it.c[i]).ch, done ? 'pot' : '', 0, .42); g.restore(); } }
  } else if (k === 'pan') {
    g.save(); g.rotate(.5); D.rr(g, .26, -.05, .3, .1, .05, '#3d2a1a', '#1a0f08', .02); g.restore();
    D.circle(g, 0, 0, .32, '#3a3a44', '#16161c', .035); D.circle(g, 0, 0, .26, '#24242c');
    if (n) { if (it.burnt) D.circle(g, 0, 0, .2, '#2b2326'); for (let i = 0; i < n && !it.burnt; i++) { const a = i / n * TAU + .3, r = n === 1 ? 0 : .1; g.save(); g.translate(Math.cos(a) * r, Math.sin(a) * r); drawIng(g, parseComp(it.c[i]).ing, parseComp(it.c[i]).ch, done ? 'pan' : '', 0, n === 1 ? .7 : .48); g.restore(); } }
  } else if (k === 'tray') {
    if (n) { for (let i = 0; i < n; i++) { const a = i / n * TAU, r = n === 1 ? 0 : .1; g.save(); g.translate(Math.cos(a) * r, Math.sin(a) * r * .7); drawIng(g, parseComp(it.c[i]).ing, parseComp(it.c[i]).ch, done ? 'tray' : '', it.burnt, n === 1 ? .55 : .4); g.restore(); } }
  }
  void p; void inOven;
  g.restore();
}
function drawExt(g, s = 1) {
  g.save(); g.scale(s, s);
  D.rr(g, -.11, -.22, .22, .44, .1, '#e8322a', '#7a1010', .03); D.rr(g, -.07, -.12, .14, .14, .03, '#ffffff'); D.line(g, -.04, -.05, .04, -.05, '#e8322a', .03);
  D.rr(g, -.05, -.32, .1, .1, .02, '#3a3a44'); D.line(g, .03, -.3, .2, -.34, '#3a3a44', .05); D.line(g, .2, -.34, .26, -.24, '#3a3a44', .05);
  g.restore();
}
function drawDirty(g, n, s = 1) {
  g.save(); g.scale(s, s);
  for (let k = Math.min(n, 4) - 1; k >= 0; k--) { g.save(); g.translate(0, -k * .05); drawPlate(g, null, null, .82, true); g.restore(); }
  g.restore();
}
function drawItem(g, K, it, now, s = 1) {
  if (!it) return;
  if (it.k === 'ing') drawIng(g, it.i, it.ch, '', it.b, s);
  else if (it.k === 'plate') drawPlate(g, K, it.c, s * .9);
  else if (isCont(it)) drawCont(g, it, now, s);
  else if (it.k === 'ext') drawExt(g, s);
  else if (it.k === 'dirty') drawDirty(g, it.n, s);
}

/* ---- mutfak temaları ---- */
const THEMES = {
  mahalle: { fa: '#f4e4c6', fb: '#ead3aa', wall: '#6d3328', top: '#d39357', lip: '#8f5a2c', edge: '#5e3518', bg: '#3a1a14', acc: '#e8573a' },
  bolunmus: { fa: '#e4edf6', fb: '#c9d9ec', wall: '#2c3a58', top: '#b9c4d2', lip: '#6f7d92', edge: '#3c475a', bg: '#141c2e', acc: '#2f7bff' },
  vapur: { fa: '#cfa26e', fb: '#c0915e', wall: '#1c3660', top: '#efe7d4', lip: '#2c4f84', edge: '#14284a', bg: '#0b2142', acc: '#ff5d4a', plank: 1, bolt: 1 },
  kar: { fa: '#b58a5e', fb: '#a77c52', wall: '#4e301c', top: '#dcb68a', lip: '#7a5233', edge: '#3c2414', bg: '#1d2a3a', acc: '#5ad1ff', plank: 1, snow: 1 },
  pazar: { fa: '#3f3858', fb: '#4a4266', wall: '#1a1430', top: '#e66a54', lip: '#8a3040', edge: '#4a1a28', bg: '#0d0a1c', acc: '#ffcf4a' }
};
function drawFloor(g, T, c, r, ice, rug, lane) {
  g.fillStyle = (c + r) % 2 ? T.fa : T.fb; g.fillRect(-.5, -.5, 1.02, 1.02);
  if (T.plank) { g.strokeStyle = 'rgba(80,40,10,.22)'; g.lineWidth = .025; [-.25, .25].forEach(y => { g.beginPath(); g.moveTo(-.5, y); g.lineTo(.5, y); g.stroke(); }); g.beginPath(); g.moveTo(((c * 7 + r * 3) % 5) / 5 - .5, -.25); g.lineTo(((c * 7 + r * 3) % 5) / 5 - .5, .25); g.stroke(); }
  if (ice) {
    g.fillStyle = 'rgba(200,238,255,.88)'; g.fillRect(-.5, -.5, 1.02, 1.02);
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = .03; g.beginPath(); g.moveTo(-.3 + ((c * 3) % 4) * .1, -.2); g.lineTo(.1, .1); g.lineTo(.3, .05); g.stroke();
    D.circle(g, .22 - ((r * 5) % 3) * .15, -.25, .03, '#ffffff');
  }
  if (rug) { D.rr(g, -.46, -.46, .92, .92, .12, '#b8323a'); D.rr(g, -.38, -.38, .76, .76, .08, null, '#ffd36a', .04); D.circle(g, 0, 0, .1, '#ffd36a'); }
  if (lane) { g.fillStyle = 'rgba(20,40,80,.25)'; g.fillRect(-.5, -.5, 1.02, 1.02); g.strokeStyle = 'rgba(255,220,120,.55)'; g.lineWidth = .04; g.setLineDash([.1, .1]); [-.42, .42].forEach(x => { g.beginPath(); g.moveTo(x, -.5); g.lineTo(x, .5); g.stroke(); }); g.setLineDash([]); }
}
function drawWall(g, T, c, r) {
  g.fillStyle = T.wall; g.fillRect(-.5, -.5, 1.02, 1.02);
  g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(-.5, -.5, 1.02, .2);
}
function drawCounterBase(g, T, kind, seed) {
  D.rr(g, -.5, -.5, 1, 1, .08, T.lip);
  D.rr(g, -.48, -.5, .96, .86, .08, kind === 'stove' || kind === 'oven' ? '#5a5f6b' : T.top);
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-.44, -.46, .88, .05);
  if (T.snow && kind !== 'stove' && kind !== 'oven') {   // tezgâh kenarında kar
    const r = seeded(seed || 1);
    for (let k = 0; k < 4; k++) D.ell(g, -.36 + k * .24 + r() * .06, -.47, .11 + r() * .05, .055, 'rgba(255,255,255,.92)');
  }
  if (T.bolt) { [[-.4, -.42], [.4, -.42], [-.4, .28], [.4, .28]].forEach(([x, y]) => D.circle(g, x, y, .025, 'rgba(255,255,255,.45)')); }
}
function drawStationStatic(g, K, s, T) {
  const k = s.k;
  if (k === 'belt') {
    D.rr(g, -.5, -.42, 1, .84, .04, '#2b2b36'); D.rr(g, -.5, -.36, 1, .72, .02, '#3d3d4c');
    return;
  }
  drawCounterBase(g, T, k, s.c * 31 + s.r * 7 + 3);
  switch (k) {
    case 'board':
      D.rr(g, -.36, -.34, .72, .56, .08, '#e7c48c', '#9a6a32', .03); D.circle(g, .26, -.24, .04, '#9a6a32');
      g.save(); g.translate(.28, .18); g.rotate(-.7); D.rr(g, -.03, -.2, .06, .18, .02, '#c9ced8', '#6c7280', .015); D.rr(g, -.035, -.02, .07, .12, .02, '#4a3020'); g.restore();
      break;
    case 'stove':
      D.rr(g, -.44, -.44, .88, .76, .06, '#2d3038'); D.circle(g, 0, -.06, .3, '#1c1e24', '#4a4f5a', .03); D.circle(g, 0, -.06, .2, null, '#5a2a1a', .03);
      D.circle(g, -.34, .25, .04, '#c9ced8'); D.circle(g, .34, .25, .04, '#c9ced8');
      break;
    case 'oven':
      D.rr(g, -.46, -.46, .92, .8, .08, '#c45a32', '#6a2a14', .03);
      for (let y = -.4; y < .3; y += .14) for (let x = -.42 + ((y * 10) % 2 ? .1 : 0); x < .4; x += .2) D.rr(g, x, y, .18, .11, .02, 'rgba(255,190,140,.18)');
      D.rr(g, -.32, -.28, .64, .46, .2, '#1c1010', '#3a1a10', .04);
      break;
    case 'sink':
      D.rr(g, -.42, -.4, .84, .68, .12, '#9fb3c8', '#4d6278', .03); D.rr(g, -.34, -.32, .68, .52, .1, '#5f87b0');
      D.rr(g, -.05, -.48, .1, .16, .03, '#c9ced8', '#6c7280', .02);
      break;
    case 'rack':
      D.rr(g, -.4, -.38, .8, .64, .08, '#c9ced8', '#6c7280', .03);
      for (let x = -.3; x <= .3; x += .15) D.line(g, x, -.34, x, .22, '#8a93a3', .025);
      break;
    case 'ret':
      D.rr(g, -.4, -.38, .8, .64, .08, '#7a6a5a', '#3a2a1a', .03); D.rr(g, -.32, -.3, .64, .48, .06, '#a8957e');
      break;
    case 'window':
      D.rr(g, -.48, -.48, .96, .82, .06, '#ffe8a8', '#c98a00', .03);
      g.fillStyle = T.acc; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-.48 + i * .24, -.5); g.lineTo(-.36 + i * .24, -.5); g.lineTo(-.36 + i * .24, -.3); g.arc(-.42 + i * .24, -.3, .06, 0, Math.PI); g.closePath(); g.fill(); }
      D.circle(g, .26, .12, .09, '#ffd23f', '#a07800', .025); D.rr(g, .2, .18, .12, .04, .02, '#a07800'); D.circle(g, .26, .02, .025, '#a07800');
      break;
    case 'trash':
      D.rr(g, -.3, -.34, .6, .62, .1, '#5d6672', '#2d3038', .03); D.rr(g, -.34, -.4, .68, .12, .05, '#7d8794', '#2d3038', .025);
      [-.12, 0, .12].forEach(x => D.line(g, x, -.18, x, .18, 'rgba(255,255,255,.25)', .03));
      break;
    case 'crate':
      D.rr(g, -.44, -.42, .88, .76, .06, '#b8834a', '#6a4220', .03); D.rr(g, -.36, -.34, .72, .6, .04, '#8a5a2c');
      D.line(g, -.36, -.34, .36, .26, 'rgba(60,30,10,.4)', .03);
      g.save(); g.translate(0, -.04); drawIng(g, s.ing, 0, '', 0, 1.15); g.restore();
      break;
    default: break;
  }
}
function drawBeltDecor(g, kind) {
  if (kind === 'M') {
    D.rr(g, -.5, -.5, 1, 1, .06, '#6a2a5a');
    g.fillStyle = '#ffcf4a'; for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#ff5d8a' : '#ffcf4a'; g.fillRect(-.5 + i * .25, -.5, .25, .3); }
    D.circle(g, 0, .15, .18, '#ffcf4a', '#a07800', .03);
  } else {
    D.rr(g, -.45, -.4, .9, .8, .14, '#3a3a44', '#16161c', .03); D.rr(g, -.35, -.3, .7, .2, .05, '#16161c');
  }
}

/* ---- aşçı ---- */
function drawChef(g, col, fx, fy, walk, t, isMe, name, blink, bot) {
  const bob = Math.sin(walk * 2) * .025;
  D.ell(g, 0, .3, .3, .11, 'rgba(0,0,0,.25)');
  if (isMe) { g.save(); g.globalAlpha = .55 + .25 * Math.sin(t / 250); D.ell(g, 0, .3, .38, .15, null, col, .05); g.restore(); }
  // ayaklar
  const st = Math.sin(walk) * .07;
  D.ell(g, -.1, .26 + st, .07, .05, '#3a2a2a'); D.ell(g, .1, .26 - st, .07, .05, '#3a2a2a');
  // gövde (aşçı ceketi) + önlük
  D.ell(g, 0, .1 + bob, .25, .22, '#ffffff', 0, '#9a93b0', .03);
  D.rr(g, -.15, .04 + bob, .3, .22, .08, col);
  D.circle(g, -.05, .0 + bob, .02, '#9a93b0'); D.circle(g, .05, .0 + bob, .02, '#9a93b0');
  // kafa
  const hx = fx * .03, hy = -.18 + bob;
  D.circle(g, hx, hy, .19, '#ffd9b8', '#b07a5a', .025);
  // yüz: bakış yönü
  if (fy < .6) {
    const ex = fx * .07, ey = Math.max(-.02, fy * .05);
    if (blink) { D.line(g, hx - .065 + ex, hy + ey, hx - .025 + ex, hy + ey, '#2d2340', .025); D.line(g, hx + .025 + ex, hy + ey, hx + .065 + ex, hy + ey, '#2d2340', .025); }
    else { D.circle(g, hx - .045 + ex, hy + ey, .028, '#2d2340'); D.circle(g, hx + .045 + ex, hy + ey, .028, '#2d2340'); }
    D.circle(g, hx - .09 + ex, hy + .05 + ey, .025, 'rgba(255,120,120,.5)'); D.circle(g, hx + .09 + ex, hy + .05 + ey, .025, 'rgba(255,120,120,.5)');
    if (fy > -.6) { g.strokeStyle = '#7a3a3a'; g.lineWidth = .02; g.beginPath(); g.arc(hx + ex, hy + .045 + ey, .03, .2, Math.PI - .2); g.stroke(); }
    // bıyık!
    if (bot) { D.ell(g, hx + ex - .03, hy + .035 + ey, .03, .012, '#5a3a2a'); D.ell(g, hx + ex + .03, hy + .035 + ey, .03, .012, '#5a3a2a'); }
  }
  // aşçı şapkası
  D.rr(g, hx - .15, hy - .17, .3, .09, .03, '#f4f0ff', '#9a93b0', .02);
  D.rr(g, hx - .15, hy - .12, .3, .04, .01, col);
  [[-.1, -.24], [0, -.29], [.1, -.24]].forEach(([x, y]) => D.circle(g, hx + x, hy + y, .1, '#ffffff', '#9a93b0', .02));
  D.circle(g, hx, hy - .26, .09, '#ffffff');
  void name;
}
function drawFire(g, t, hp, seed) {
  const k = .6 + .55 * clamp(hp, 0, 1);
  const gr = g.createRadialGradient(0, 0, .05, 0, 0, .75); gr.addColorStop(0, `rgba(255,140,40,${.45 + .1 * Math.sin(t / 90 + seed)})`); gr.addColorStop(1, 'rgba(255,80,0,0)');
  g.fillStyle = gr; g.fillRect(-.75, -.75, 1.5, 1.5);
  g.save(); g.scale(k, k);
  for (let i = 0; i < 3; i++) {
    const ph = t / (140 + i * 40) + seed + i * 2, w = .22 - i * .05, h = .55 - i * .13 + Math.sin(ph) * .06, x = Math.sin(ph * .7) * .05 + (i - 1) * .04;
    g.fillStyle = ['#ff5a1f', '#ffb627', '#fff3a8'][i];
    g.beginPath(); g.moveTo(x - w, .15); g.quadraticCurveTo(x - w * 1.1, -h * .3, x, -h); g.quadraticCurveTo(x + w * 1.1, -h * .3, x + w, .15); g.quadraticCurveTo(x, .28, x - w, .15); g.fill();
  }
  g.restore();
}

/* ------------------------------------------------------------------ ARAYÜZ (her cihaz) */
let root = null, ui = null, V = null, KV = null;
let cv = null, cg = null, stageEl = null, padEl = null, joyEl = null, alBtn = null, useBtn = null, dashBtn = null;
let bg = null, bgKey = '', ts = 40, TR = false, dpr = 1, cw = 0, ch = 0;
let av = null, rp = [], keys = new Set(), joy = { on: false, id: null, bx: 0, by: 0, dx: 0, dy: 0 };
let raf = 0, lastT = 0, hudT = null, ro = null, popT = null, toastT = null;
let parts = [], floats = [], lastSend = 0, lastSent = null, seenSpawn = -1, seenPhase = '', ordKey = '', sideKey = '', chefKey = '';
let target = -1, useHeld = false, useRepeatAt = 0, dashAt = -9999, sfxAt = {}, lastSec = -1, layoutAt = 0, blinkAt = 0, endShown = false;
const INTERP = 110;
const pnow = () => performance.now();
const hostClock = () => (ui && ui.hostNow ? ui.hostNow() : Date.now());
const q = s => root && root.querySelector(s);
const isTouch = () => (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
const phoneW = () => innerWidth < 760;
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const Sd = [];   // istasyon dinamik verisi (görüntüden)
const snd = {
  ok() { return Sound.ctx && Sound.enabled && Sound.ctx.state === 'running'; },
  gap(n, ms) { const t = pnow(); if (sfxAt[n] && t - sfxAt[n] < ms) return false; sfxAt[n] = t; return this.ok(); },
  chop() { if (!this.gap('chop', 240)) return; Sound.noise(.06, { freq: 1500, q: 1.2, gain: .45, decayPow: 4 }); Sound.tone(180, .07, { type: 'triangle', gain: .12, slide: 90 }); },
  sizzle() { if (!this.gap('sz', 330)) return; Sound.noise(.32, { freq: 5200, q: .7, gain: .06, decayPow: 1.2 }); },
  blub() { if (!this.gap('bl', 520)) return; Sound.tone(rnd(160, 230), .12, { type: 'sine', gain: .07, slide: rnd(260, 340) }); },
  splash() { if (!this.gap('sp', 380)) return; Sound.noise(.22, { freq: 900, q: .6, gain: .18, decayPow: 2 }); },
  pop() { if (!this.gap('pop', 60)) return; Sound.tone(520, .06, { type: 'square', gain: .05, slide: 820 }); },
  drop() { if (!this.gap('drop', 60)) return; Sound.tone(300, .07, { type: 'triangle', gain: .12, slide: 200 }); },
  ding() { if (!this.gap('ding', 250)) return; Sound.tone(1568, .25, { type: 'sine', gain: .14 }); Sound.tone(2093, .35, { type: 'sine', gain: .1, when: .09 }); },
  beep() { if (!this.gap('beep', 520)) return; Sound.tone(1250, .09, { type: 'square', gain: .07 }); Sound.tone(1250, .09, { type: 'square', gain: .07, when: .14 }); },
  fire() { if (!this.gap('fire', 420)) return; Sound.noise(.4, { filter: 'lowpass', freq: 700, gain: .14, decayPow: 1 }); Sound.noise(.05, { freq: 3000, q: 2, gain: .1, when: rnd(0, .2) }); },
  spray() { if (!this.gap('spr', 200)) return; Sound.noise(.24, { freq: 3800, q: .5, gain: .16, decayPow: .6 }); },
  dash() { if (!this.gap('dash', 200)) return; Sound.noise(.18, { freq: 1300, q: .8, gain: .16, decayPow: 1.5 }); },
  clink() { if (!this.gap('clink', 200)) return; Sound.tone(2600, .08, { type: 'triangle', gain: .08 }); Sound.tone(3100, .1, { type: 'triangle', gain: .06, when: .05 }); },
  trash() { if (!this.gap('trash', 150)) return; Sound.tone(200, .12, { type: 'triangle', gain: .1, slide: 120 }); Sound.noise(.12, { freq: 600, q: .8, gain: .12 }); },
  no() { if (!this.gap('no', 250)) return; Sound.tone(220, .1, { type: 'square', gain: .05, slide: 170 }); }
};

/* ---- yerleşim ve ölçek ---- */
function layout() {
  if (!stageEl || !KV) return;
  const ph = phoneW(), touch = isTouch() || ph;
  padEl.hidden = !touch || !V || V.me < 0;
  const wrapW = stageEl.parentElement.getBoundingClientRect().width;
  const top = stageEl.getBoundingClientRect().top + (window.scrollY || 0);
  const padH = padEl.hidden ? 0 : (ph ? 128 : 140);
  const aw = Math.max(200, wrapW), ah = Math.max(220, innerHeight - top - padH - (ph ? 12 : 22));
  const tN = Math.min(aw / KV.W, ah / KV.H), tT = Math.min(aw / KV.H, ah / KV.W);
  TR = ph && tT > tN * 1.06;
  ts = Math.floor(Math.max(18, Math.min(TR ? tT : tN, ph ? 60 : 78)));
  const cols = TR ? KV.H : KV.W, rows = TR ? KV.W : KV.H;
  const w = cols * ts, h = rows * ts;
  dpr = Math.min(2.5, window.devicePixelRatio || 1);
  if (cw !== w || ch !== h || cv.width !== Math.round(w * dpr)) {
    cw = w; ch = h; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px'; cv.style.height = h + 'px'; stageEl.style.height = h + 'px'; stageEl.style.width = w + 'px';
    const hud = q('.mk-hud'); if (hud) hud.style.width = w + 'px';
    bgKey = '';
  }
}
// dünya (karo) → ekran (css px)
const scr = (x, y) => (TR ? [y * ts, x * ts] : [x * ts, y * ts]);
const scrDir = (fx, fy) => (TR ? [fy, fx] : [fx, fy]);
function atW(g, x, y, s = 1) { const [sx, sy] = scr(x, y); g.setTransform(dpr * ts * s, 0, 0, dpr * ts * s, dpr * sx, dpr * sy); }
function buildBg() {
  const key = `${KV.id}:${ts}:${TR}:${dpr}`; if (bgKey === key && bg) return;
  bgKey = key; bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height;
  const g = bg.getContext('2d'), T = THEMES[KV.def.theme];
  g.fillStyle = T.bg; g.fillRect(0, 0, bg.width, bg.height);
  for (let r = 0; r < KV.H; r++) for (let c = 0; c < KV.W; c++) {
    const idx = r * KV.W + c, chr = KV.def.grid[r][c];
    atW(g, c + .5, r + .5);
    if (!KV.solid[idx]) drawFloor(g, T, c, r, KV.ice[idx], KV.rug[idx], KV.lane[idx]);
    else if (chr === '_') drawWall(g, T, c, r);
    else if (chr === 'M' || chr === 'Z') { drawWall(g, T, c, r); drawBeltDecor(g, chr); }
    else { const si = KV.sat[idx]; if (si >= 0) drawStationStatic(g, KV, KV.st[si], T); else drawWall(g, T, c, r); }
  }
  // mutfak kenarında yumuşak gölge
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3 * dpr; g.strokeRect(0, 0, bg.width, bg.height);
}

/* ---- uzaktaki aşçılar ---- */
function mkRemote(p) { return { buf: [], x: p[0], y: p[1], fx: p[2] || 0, fy: p[3] || 1, walk: 0, at: 0 }; }
function feed(pi, x, y, fx, fy, m) {
  if (!V || !root || !V.players[pi] || (pi === V.me && av)) return;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const t = pnow(); let r = rp[pi]; if (!r) r = rp[pi] = mkRemote([x, y, fx, fy]);
  const last = r.buf[r.buf.length - 1];
  if (last && dist(last.x, last.y, x, y) > 4) { r.buf = []; r.x = x; r.y = y; }
  r.buf.push({ t, x, y, fx: Number.isFinite(fx) ? fx : r.fx, fy: Number.isFinite(fy) ? fy : r.fy, m });
  if (r.buf.length > 14) r.buf.shift();
  r.at = t;
}
function uiFeed(pi, x, y, fx, fy, m) { if (root) feed(pi, x, y, fx, fy, m); }
function onFast(m) {
  if (!m || !V) return;
  if (m.t === 'p') { if (ui && ui.isHost) hostPosIn(m.seat, +m.x, +m.y, +m.fx, +m.fy, m.id); feed(m.seat, +m.x, +m.y, +m.fx, +m.fy, m.m); }
  else if (m.t === 'b' && Array.isArray(m.p)) { if (ui && ui.isHost) return; m.p.forEach(a => { if (Array.isArray(a) && V.players[a[0]] && V.players[a[0]].isBot) feed(a[0], +a[1], +a[2], +a[3], +a[4], a[5]); }); }
}
function stepRemotes(dt, t) {
  const rt = t - INTERP;
  V.players.forEach((_, i) => {
    if (i === V.me && av) return;
    let r = rp[i]; if (!r) r = rp[i] = mkRemote(V.pos[i]);
    const ox = r.x, oy = r.y, b = r.buf;
    let tx = r.x, ty = r.y;
    if (!b.length || t - r.at > 1500) { tx = V.pos[i][0]; ty = V.pos[i][1]; r.fx = V.pos[i][2]; r.fy = V.pos[i][3]; if (dist(tx, ty, r.x, r.y) > 3) { r.x = tx; r.y = ty; } }
    else {
      while (b.length >= 2 && b[1].t <= rt) b.shift();
      const a = b[0];
      if (b.length >= 2 && rt > a.t) { const c = b[1], u = (rt - a.t) / Math.max(1, c.t - a.t); tx = a.x + (c.x - a.x) * u; ty = a.y + (c.y - a.y) * u; r.fx = c.fx; r.fy = c.fy; }
      else { tx = a.x; ty = a.y; r.fx = a.fx; r.fy = a.fy; }
    }
    const k = 1 - Math.exp(-dt * 20);
    r.x += (tx - r.x) * k; r.y += (ty - r.y) * k;
    const sp = Math.hypot(r.x - ox, r.y - oy) / Math.max(dt, 1e-3);
    r.walk += sp * dt * 5;
    r.mv = sp > .4;
  });
}

/* ---- yerel aşçı ---- */
function inputVec() {
  let ix = 0, iy = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) ix -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) ix += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) iy -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) iy += 1;
  if (joy.on) { ix = joy.dx; iy = joy.dy; }
  if (TR) [ix, iy] = [iy, ix];   // ekran yönü → dünya yönü (döndürülmüş telefon görünümü)
  const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
  return [ix, iy];
}
function stepMe(dt, t) {
  if (!av || !V || V.me < 0) return;
  const now = hostClock(), K = KV;
  if (V.phase !== 'play') { av.vx = av.vy = 0; return; }
  const [ix, iy] = inputVec();
  const mrow = moverRow(K, V.t0, now), sway = swayAt(K, V.t0, now);
  const n = Math.max(1, Math.ceil(dt / .03));
  for (let k = 0; k < n; k++) {
    moveBody(K, av, ix, iy, SPEED, dt / n, { mrow, sway });
    // diğer aşçılarla yumuşak itişme
    V.players.forEach((_, j) => { if (j === V.me) return; const r = rp[j]; if (!r) return; const d = dist(av.x, av.y, r.x, r.y); if (d < RAD * 2 && d > 1e-3) { const push = (RAD * 2 - d) * .5; av.x += (av.x - r.x) / d * push; av.y += (av.y - r.y) / d * push; } });
    collide(K, av, mrow);
  }
  if (Math.hypot(ix, iy) > .2) { const m = Math.hypot(ix, iy); av.fx += (ix / m - av.fx) * Math.min(1, dt * 18); av.fy += (iy / m - av.fy) * Math.min(1, dt * 18); const l = Math.hypot(av.fx, av.fy) || 1; av.fx /= l; av.fy /= l; }
  const sp = Math.hypot(av.vx, av.vy); av.walk += sp * dt * 5;
  if (t - lastSend > 100 && (!lastSent || dist(lastSent[0], lastSent[1], av.x, av.y) > .02 || Math.abs(lastSent[2] - av.fx) + Math.abs(lastSent[3] - av.fy) > .15 || t - lastSend > 500)) sendPos(t);
}
function sendPos(t) {
  if (!av || !ui || !V || V.me < 0) return;
  lastSend = t || pnow(); lastSent = [av.x, av.y, av.fx, av.fy];
  const x = r2(av.x), y = r2(av.y), fx = r2(av.fx), fy = r2(av.fy), m = Math.hypot(av.vx, av.vy) > .4 ? 1 : 0;
  if (ui.isHost) hostPosIn(V.me, x, y, fx, fy);
  if (ui.mode === 'online' && ui.fast) ui.fast({ t: 'p', x, y, fx, fy, m });
}
function dash() {
  if (!av || !V || V.phase !== 'play' || V.me < 0) return;
  const t = pnow(); if (t - dashAt < DASH_CD) return; dashAt = t;
  av.vx = av.fx * DASH_V; av.vy = av.fy * DASH_V; snd.dash();
  for (let k = 0; k < 6; k++) parts.push({ k: 'puff', x: av.x - av.fx * .2 + rnd(-.1, .1), y: av.y + .25 + rnd(-.05, .05), vx: -av.fx * rnd(.3, .8), vy: -av.fy * rnd(.3, .8) - .1, life: .5, max: .5, r: rnd(.08, .14) });
}
// Önümdeki istasyon
function findTarget() {
  if (!av || !V || V.me < 0) return -1;
  const K = KV, now = hostClock(), mrow = moverRow(K, V.t0, now), sliding = moverSliding(K, V.t0, now);
  const px = av.x + av.fx * .62, py = av.y + av.fy * .62, c0 = Math.floor(av.x), r0 = Math.floor(av.y);
  let best = -1, bs = 1e9;
  K.st.forEach(s => {
    if (s.mv && sliding) return;
    const [c, r] = stCell(K, s, mrow);
    if (Math.max(Math.abs(c - c0), Math.abs(r - r0)) > 1) return;
    const cx = c + .5, cy = r + .5, d = dist(av.x, av.y, cx, cy); if (d > REACH - .05) return;
    const dot = ((cx - av.x) * av.fx + (cy - av.y) * av.fy) / (d || 1);
    if (dot < .25) return;
    const sc = dist(px, py, cx, cy) - dot * .2 - (s.i === target ? .22 : 0);   // önceki hedefe hafif tutunma (titreme olmasın)
    if (sc < bs) { bs = sc; best = s.i; }
  });
  return best;
}
function sendAct(t) {
  if (!V || V.phase !== 'play' || V.me < 0 || !av) return;
  Sound.init(); sendPos();
  ui.send({ t, s: target, x: r2(av.x), y: r2(av.y), fx: r2(av.fx), fy: r2(av.fy) });
}
function useDown() { useHeld = true; useRepeatAt = pnow() + 260; sendAct('use'); }
function useUp() { useHeld = false; }

/* ---- etiketler (düğmeler ve ipucu) ---- */
const myHeld = () => (V && V.me >= 0 ? V.held[V.me] : null);
function labels() {
  const held = myHeld(), s = target >= 0 ? KV.st[target] : null, d = s ? (Sd[s.i] || {}) : {}, it = d.it;
  let al = held ? 'Bırak' : 'Al', alOn = !!s, use = 'Kullan', useOn = false, useIc = '🔪';
  if (held && held.k === 'ext') { use = 'Söndür'; useOn = true; useIc = '🧯'; }
  if (s) {
    switch (s.k) {
      case 'crate': al = held ? (held.k === 'plate' || isCont(held) ? 'Ekle' : 'Elin dolu') : ING[s.ing].n; alOn = !held || held.k === 'plate' || isCont(held); break;
      case 'rack': al = held ? 'Bırak' : `Tabak (${d.n || 0})`; alOn = held ? held.k === 'plate' || held.k === 'ing' : (d.n || 0) > 0; break;
      case 'ret': al = held ? 'Bırak' : `Kirliler (${d.n || 0})`; alOn = held ? held.k === 'dirty' : (d.n || 0) > 0; break;
      case 'sink': al = held && held.k === 'dirty' ? 'Evyeye' : 'Evye'; alOn = !!(held && held.k === 'dirty'); if (!held && (d.d || 0) > 0) { use = `Yıka (${d.d})`; useOn = true; useIc = '🧽'; } break;
      case 'window': al = 'Servis!'; alOn = !!(held && held.k === 'plate' && dishOf(KV, held.c)); break;
      case 'trash': al = 'Çöpe at'; alOn = !!held && held.k !== 'ext' && held.k !== 'dirty'; break;
      default:
        if (!held) { const burntOven = s.k === 'oven' && it && it.burnt && it.c.length; al = it ? (s.k === 'oven' ? (burntOven ? 'Temizle' : 'Fırın') : 'Al') : 'Al'; alOn = !!it && (s.k !== 'oven' || !!burntOven); }
        else if (!it) { al = 'Bırak'; alOn = !(s.k === 'board' && held.k !== 'ing') && !(s.k === 'stove' && held.k !== 'pot' && held.k !== 'pan') && !(s.k === 'belt' && held.k !== 'ing') && s.k !== 'oven'; }
        else { al = held.k === 'plate' ? 'Tabağa al' : it.k === 'plate' ? 'Tabağa koy' : isCont(it) ? 'İçine koy' : 'Birleştir'; alOn = true; }
        if (s.k === 'board' && !held && it && it.k === 'ing' && ING[it.i].chop && !it.ch) { use = 'Doğra'; useOn = true; useIc = '🔪'; }
    }
    if (d.f && !(held && held.k === 'ext')) { al = '🔥 Yanıyor'; alOn = false; }
  }
  return { al, alOn, use, useOn, useIc };
}

/* ---- parçacıklar ---- */
function stepParts(dt) {
  parts = parts.filter(p => (p.life -= dt) > 0);
  parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'bit') p.vy += 3 * dt; if (p.k === 'steam' || p.k === 'smoke') { p.vx *= .98; p.r += dt * .15; } });
  floats = floats.filter(f => pnow() - f.t0 < f.dur);
}
function emitAt(k, x, y, n, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), s = rnd(.4, 1.2) * (o.sp || 1);
    if (k === 'bit') parts.push({ k, x, y, vx: Math.cos(a) * s, vy: -rnd(.8, 1.6), life: .55, max: .55, r: rnd(.04, .07), col: pickR(o.cols || ['#e8402f', '#5cbf3a']) });
    else if (k === 'steam') parts.push({ k, x: x + rnd(-.15, .15), y, vx: rnd(-.08, .08), vy: -rnd(.35, .6), life: 1.1, max: 1.1, r: rnd(.07, .12) });
    else if (k === 'smoke') parts.push({ k, x: x + rnd(-.15, .15), y, vx: rnd(-.1, .1), vy: -rnd(.4, .7), life: 1.5, max: 1.5, r: rnd(.1, .16) });
    else if (k === 'foam') parts.push({ k, x, y, vx: o.vx * rnd(2, 3.4) + rnd(-.5, .5), vy: o.vy * rnd(2, 3.4) + rnd(-.5, .5), life: .5, max: .5, r: rnd(.07, .13) });
    else if (k === 'spark') parts.push({ k, x, y, vx: Math.cos(a) * s * 1.6, vy: Math.sin(a) * s * 1.6, life: .6, max: .6, r: rnd(.03, .06), col: pickR(o.cols || ['#ffe14a', '#ffffff', '#2bff88']) });
    else if (k === 'bubble') parts.push({ k, x: x + rnd(-.25, .25), y: y + rnd(-.15, .1), vx: rnd(-.1, .1), vy: -rnd(.1, .3), life: .8, max: .8, r: rnd(.04, .08) });
  }
}
function floatText(x, y, txt, col, dur = 1300, size = .34) { floats.push({ x, y, txt, col, t0: pnow(), dur, size }); }

/* ---- çizim ---- */
const posOf = i => (V && i === V.me && av ? av : rp[i]) || (V && V.pos[i] ? { x: V.pos[i][0], y: V.pos[i][1], fx: 0, fy: 1 } : { x: 1, y: 1, fx: 0, fy: 1 });
function bar(g, p, col, back) {
  D.rr(g, -.4, -.62, .8, .13, .06, back || 'rgba(20,10,30,.8)'); D.rr(g, -.37, -.595, .74 * clamp(p, 0, 1), .08, .04, col);
}
function drawStationDyn(g, s, now, t, mrow) {
  const K = KV, T = THEMES[K.def.theme], d = Sd[s.i] || {}, [x, y] = stPos(K, s, mrow);
  atW(g, x, y);
  if (s.mv) drawStationStatic(g, K, s, T);
  if (s.k === 'belt') {
    const dir = { '>': [1, 0], '<': [-1, 0], '^': [0, -1], 'v': [0, 1] }[s.dir], sd = scrDir(dir[0], dir[1]);
    const off = ((now % 1000) / 1000) * .25;
    g.save(); rrPath(g, -.5, -.36, 1, .72, .02); g.clip();
    g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = .06;
    for (let k = -3; k <= 3; k++) { const o = k * .25 + off; g.beginPath(); if (sd[0]) { g.moveTo(o * sd[0], -.36); g.lineTo(o * sd[0], .36); } else { g.moveTo(-.5, o * sd[1]); g.lineTo(.5, o * sd[1]); } g.stroke(); }
    g.restore();
    g.fillStyle = 'rgba(255,207,74,.55)'; g.save(); g.rotate(Math.atan2(sd[1], sd[0])); g.beginPath(); g.moveTo(.3, 0); g.lineTo(.18, -.08); g.lineTo(.18, .08); g.fill(); g.restore();
  }
  if (s.k === 'stove') {
    const it = d.it, heat = it && isCont(it) && it.c.length && !it.burnt;
    if (heat) { g.save(); g.globalAlpha = .6 + .3 * Math.sin(t / 90 + s.i); D.circle(g, 0, -.06, .3, null, '#ff7a1a', .06); g.restore(); }
  }
  if (s.k === 'oven') {
    const it = d.it, heat = it && it.c && it.c.length && !it.burnt;
    g.save(); g.globalAlpha = heat ? .75 + .2 * Math.sin(t / 120) : .25; D.rr(g, -.3, -.26, .6, .42, .18, heat ? '#ff8a2a' : '#5a2a1a'); g.restore();
    if (it && it.c && it.c.length) { g.save(); g.translate(0, -.05); drawCont(g, it, now, .85, true); g.restore(); }
  }
  if (s.k === 'sink') {
    const n = d.d || 0;
    for (let k = 0; k < Math.min(n, 4); k++) { g.save(); g.translate(-.04 + k * .04, -.02 - k * .03); drawPlate(g, null, null, .55, true); g.restore(); }
    if (d.w) { D.rr(g, -.34, -.32, .68, .52, .1, 'rgba(160,220,255,.35)'); }
    if (n > 1) badge(g, String(n), .3, .22, '#5f87b0');
  }
  if (s.k === 'rack') {
    const n = d.n || 0;
    for (let k = 0; k < Math.min(n, 5); k++) { g.save(); g.translate(0, .06 - k * .05); drawPlate(g, null, null, .7); g.restore(); }
    badge(g, String(n), .3, .24, n ? '#2bbf6a' : '#e8322a');
  }
  if (s.k === 'ret') {
    const n = d.n || 0;
    if (n) { g.save(); g.translate(0, .02); drawDirty(g, n, .8); g.restore(); badge(g, String(n), .3, .24, '#8a6a4a'); }
    else { g.save(); g.globalAlpha = .35; g.setLineDash([.06, .05]); D.circle(g, 0, -.02, .24, null, '#3a2a1a', .03); g.setLineDash([]); g.restore(); }
  }
  // tezgâhtaki eşya
  const it = d.it;
  if (it && s.k !== 'oven') {
    let ox = 0, oy = 0;
    if (s.k === 'belt' && it.mv && it.fr != null) {
      const u = clamp((now - it.mv) / ((K.def.beltMs || 1000) * .8), 0, 1);
      if (u < 1) {
        const prev = it.fr >= 0 ? K.st[K.belt[it.fr]] : null, [pc, pr] = prev ? [prev.c, prev.r] : [s.c - 1, s.r];
        const [ax, ay] = scr(pc - s.c, pr - s.r); ox = ax / ts * (1 - u); oy = ay / ts * (1 - u);
      }
    }
    g.save(); g.translate(ox, oy - .04);
    if (s.k === 'stove' && isCont(it)) drawCont(g, it, now, .92); else drawItem(g, K, it, now, .92);
    g.restore();
  }
}
function badge(g, txt, x, y, col) {
  D.circle(g, x, y, .14, col, '#ffffff', .03);
  g.fillStyle = '#ffffff'; g.font = 'bold 0.19px Nunito, "Segoe UI", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, y + .01);
}
function drawProgress(g, s, now, t, mrow) {
  const K = KV, d = Sd[s.i] || {}, [x, y] = stPos(K, s, mrow);
  atW(g, x, y);
  if (d.w) {
    const ms = s.k === 'board' ? CHOP_MS : WASH_MS, p = d.w.p0 + (now - d.w.t) / ms;
    bar(g, p, s.k === 'board' ? '#2bff88' : '#5ad1ff');
  } else if (s.k === 'board' && d.it && d.it.cp > 0 && !d.it.ch) bar(g, d.it.cp, '#2bff88');
  else if (s.k === 'sink' && d.wp > 0 && (d.d || 0) > 0) bar(g, d.wp, '#5ad1ff');
  const it = d.it;
  if (isCont(it) && it.c.length && !it.burnt && stationHeats(s)) {
    const p = contProg(it, now), ck = cookOf(it), bf = COOK[ck].burn * DIFF[V.diff].burn / COOK[ck].ms;
    if (p < 1) bar(g, p, '#ffcf4a');
    else if (p < 1 + bf * .55) { D.circle(g, .3, -.32, .13, '#2bbf6a', '#ffffff', .03); g.strokeStyle = '#fff'; g.lineWidth = .045; g.beginPath(); g.moveTo(.24, -.32); g.lineTo(.29, -.27); g.lineTo(.37, -.37); g.stroke(); }
    else {
      const on = Math.floor(t / 180) % 2 === 0;
      bar(g, (p - 1 - bf * .55) / (bf * .45), on ? '#ff3b5c' : '#ff9a3c');
      if (on) { D.circle(g, 0, -.85, .16, '#ff3b5c', '#ffffff', .03); g.fillStyle = '#fff'; g.font = 'bold 0.26px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 0, -.84); }
    }
  }
  if (d.f) { g.save(); g.translate(0, -.08); drawFire(g, t, d.f.hp, s.i); g.restore(); if (d.f.hp < 1) bar(g, d.f.hp, '#ff5a1f'); }
}
function draw(t) {
  const g = cg, now = hostClock(), K = KV, mrow = moverRow(K, V.t0, now);
  buildBg();
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(bg, 0, 0);
  // hedef vurgusu
  if (target >= 0) {
    const s = K.st[target], [x, y] = stPos(K, s, mrow); atW(g, x, y);
    g.save(); g.globalAlpha = .55 + .3 * Math.sin(t / 160); D.rr(g, -.48, -.48, .96, .96, .1, null, '#ffffff', .07); g.restore();
  }
  K.st.forEach(s => { if (s.mv || s.k === 'belt' || Sd[s.i] || s.k === 'rack' || s.k === 'stove' || s.k === 'oven' || s.k === 'ret') drawStationDyn(g, s, now, t, mrow); });
  // aşçılar (ekranda yukarıdan aşağı)
  const list = V.players.map((p, i) => ({ i, pos: posOf(i) })).sort((a, b) => scr(a.pos.x, a.pos.y)[1] - scr(b.pos.x, b.pos.y)[1]);
  const blink = (t % 3200) < 140;
  for (const { i, pos } of list) {
    const p = V.players[i], [fx, fy] = scrDir(pos.fx || 0, pos.fy || 1), held = V.held[i];
    const walk = i === V.me && av ? av.walk : (rp[i] ? rp[i].walk : 0);
    const holdBack = fy < -.5;
    atW(g, pos.x, pos.y);
    if (!p.online && !p.isBot) g.globalAlpha = .45;
    const hx = fx * .3, hy = fy * .2 + .02;
    if (held && holdBack) { g.save(); g.translate(hx, hy - .1); drawItem(g, K, held, now, .62); g.restore(); }
    drawChef(g, p.color, fx, fy, walk, t, i === V.me, p.name, blink, p.isBot);
    if (held && !holdBack) { g.save(); g.translate(hx, hy + .06); drawItem(g, K, held, now, .62); g.restore(); }
    // isim etiketi
    if (i !== V.me) {
      g.font = 'bold 0.2px Nunito, "Segoe UI", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const nm0 = p.isBot ? p.name.replace('Bilgisayar', 'Yamak') : p.name, nm = nm0.length > 9 ? nm0.slice(0, 8) + '…' : nm0;
      const w = Math.min(1.4, g.measureText(nm).width + .14);
      D.rr(g, -w / 2, -.78, w, .24, .1, 'rgba(18,8,40,.72)'); g.fillStyle = p.color; g.fillText(nm, 0, -.66);
    }
    g.globalAlpha = 1;
    // söndürme köpüğü
    if (V.spray[i] > now && held && held.k === 'ext' && Math.random() < .8) emitAt('foam', pos.x + (pos.fx || 0) * .4, pos.y + (pos.fy || 0) * .4, 2, { vx: pos.fx || 0, vy: pos.fy || 0 });
  }
  K.st.forEach(s => { const d = Sd[s.i]; if (d && (d.w || d.f || (d.it && (isCont(d.it) || d.it.cp > 0)) || d.wp)) drawProgress(g, s, now, t, mrow); });
  // parçacıklar
  for (const p of parts) {
    atW(g, p.x, p.y); const a = clamp(p.life / p.max, 0, 1);
    if (p.k === 'steam') D.circle(g, 0, 0, p.r, `rgba(255,255,255,${.45 * a})`);
    else if (p.k === 'smoke') D.circle(g, 0, 0, p.r, `rgba(60,50,60,${.55 * a})`);
    else if (p.k === 'foam') D.circle(g, 0, 0, p.r, `rgba(240,250,255,${.9 * a})`, `rgba(150,200,230,${.6 * a})`, .02);
    else if (p.k === 'puff') D.circle(g, 0, 0, p.r, `rgba(255,255,255,${.5 * a})`);
    else if (p.k === 'bubble') D.circle(g, 0, 0, p.r, `rgba(220,245,255,${.5 * a})`, `rgba(255,255,255,${.8 * a})`, .015);
    else { g.globalAlpha = a; D.circle(g, 0, 0, p.r, p.col); g.globalAlpha = 1; }
  }
  // tema süsleri: kar yağışı / pazar ışıkları
  if (K.def.theme === 'kar') {
    g.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 28; i++) {
      const sp = .45 + (i % 4) * .12, x = ((i * 1.37 + t / 1000 * .35 * (1 + (i % 3) * .3)) % (K.W + 1)) - .5 + Math.sin(t / 900 + i) * .2, y = ((i * .83 + t / 1000 * sp) % (K.H + 1)) - .5;
      atW(g, x, y); D.circle(g, 0, 0, .035 + (i % 3) * .015, 'rgba(255,255,255,.8)');
    }
  }
  for (const f of floats) {
    const u = (pnow() - f.t0) / f.dur; atW(g, f.x, f.y - u * .8);
    g.globalAlpha = clamp(1.6 - u * 1.6, 0, 1);
    g.font = `${f.size}px Bungee, "Arial Black", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = f.size * .2; g.strokeStyle = 'rgba(30,10,40,.85)'; g.lineJoin = 'round'; g.strokeText(f.txt, 0, 0); g.fillStyle = f.col; g.fillText(f.txt, 0, 0);
    g.globalAlpha = 1;
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (K.def.theme === 'pazar') {   // ekranın üstünde ampul dizisi
    const n = Math.max(6, Math.round(cw / 34)), cols = ['#ffcf4a', '#ff5d8a', '#5ad1ff', '#2bff88'];
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.strokeStyle = 'rgba(30,20,10,.7)'; g.lineWidth = 1.2; g.beginPath();
    for (let i = 0; i <= n; i++) { const x = i / n * cw, y = 4 + Math.sin(i * 1.3) * 1.5 + ((i % 2) ? 3 : 0); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    for (let i = 0; i < n; i++) { const x = (i + .5) / n * cw, y = 7 + ((i % 2) ? 2 : 0), on = Math.floor(t / 400 + i) % 3 !== 0; g.fillStyle = cols[i % 4]; g.globalAlpha = on ? 1 : .35; g.beginPath(); g.arc(x, y, 3.2, 0, TAU); g.fill(); }
    g.globalAlpha = 1; g.setTransform(1, 0, 0, 1, 0, 0);
  }
}
// Ortam sesleri ve parçacık kaynakları
function ambient(t, dt) {
  const now = hostClock(), K = KV, mrow = moverRow(K, V.t0, now);
  let fires = 0;
  K.st.forEach(s => {
    const d = Sd[s.i]; if (!d) return;
    const [x, y] = stPos(K, s, mrow);
    if (d.w && s.k === 'board') { snd.chop(); if (Math.random() < dt * 6) emitAt('bit', x, y - .1, 2, { cols: [ingCol(d.it && d.it.i), '#ffffff'] }); }
    if (d.w && s.k === 'sink') { snd.splash(); if (Math.random() < dt * 8) emitAt('bubble', x, y - .05, 1); }
    if (d.f) { fires++; if (Math.random() < dt * 5) emitAt('smoke', x, y - .5, 1); }
    const it = d.it;
    if (isCont(it) && it.c.length && stationHeats(s)) {
      if (it.burnt) { if (Math.random() < dt * 3) emitAt('smoke', x, y - .2, 1); return; }
      const p = contProg(it, now);
      if (Math.random() < dt * (p >= 1 ? 4 : 1.5)) emitAt('steam', x, y - .2, 1);
      if (it.k === 'pan') snd.sizzle(); else if (it.k === 'pot') snd.blub();
      const ck = cookOf(it), bf = COOK[ck].burn * DIFF[V.diff].burn / COOK[ck].ms;
      if (p >= 1 + bf * .55) snd.beep();
    }
  });
  if (fires) snd.fire();
  if (V.me >= 0 && V.spray[V.me] > now) snd.spray();
}
const ingCol = i => ({ domates: '#e8402f', marul: '#5cbf3a', biber: '#3faa36', sogan: '#b07ac0', kasar: '#ffd23f' }[i] || '#ffffff');
function frame() {
  raf = 0; if (!root || !cv) return;
  raf = requestAnimationFrame(frame);
  if (!V || !KV) return;
  const t = pnow(), dt = clamp((t - (lastT || t)) / 1000, 0, .25); lastT = t;
  stepMe(dt, t); stepRemotes(dt, t); stepParts(dt);
  target = V.phase === 'play' ? findTarget() : -1;
  if (useHeld && t >= useRepeatAt) { const h = myHeld(); if (h && h.k === 'ext') { useRepeatAt = t + 250; sendAct('use'); } else useHeld = false; }
  if (V.phase === 'play') ambient(t, dt);
  // vapur: sahne sallanıyor
  if (KV.def.sway && stageEl) { const a = V.phase === 'play' ? swayAt(KV, V.t0, hostClock()) / KV.def.sway.amp * .9 : 0; stageEl.style.transform = Math.abs(a) > .01 ? `rotate(${a.toFixed(2)}deg)` : ''; }
  draw(t);
}

/* ---- HUD: siparişler, düğmeler, sayaç ---- */
function compIcon(c, comp, px) {
  const g = c.getContext('2d'), k = c.width; g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, 1, 1);
  const p = parseComp(comp);
  g.translate(.5, .46); drawIng(g, p.ing, p.ch, '', 0, 1.25);
  if (p.ck) {
    g.setTransform(k, 0, 0, k, 0, 0); g.translate(.76, .76);
    D.circle(g, 0, 0, .23, p.ck === 'pan' ? '#24242c' : p.ck === 'pot' ? '#7d8794' : '#c45a32', '#ffffff', .05);
    if (p.ck === 'tray') { g.fillStyle = '#ff9a3c'; g.beginPath(); g.moveTo(-.08, .08); g.quadraticCurveTo(-.1, -.06, 0, -.14); g.quadraticCurveTo(.1, -.06, .08, .08); g.fill(); }
    else if (p.ck === 'pan') D.circle(g, 0, 0, .1, '#ffcf4a');
    else D.rr(g, -.1, -.06, .2, .12, .04, '#e8892a');
  }
  void px;
}
function dishIcon(c, d) { const g = c.getContext('2d'), k = c.width; g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, 1, 1); g.translate(.5, .5); drawPlate(g, null, null, 1.15); drawDish(g, d, 1.1); }
function renderOrders() {
  const box = q('.mk-orders'); if (!box) return;
  const key = V.orders.map(o => o.id).join(',') + ':' + V.phase;
  if (key === ordKey) return; ordKey = key;
  const have = new Set(V.orders.map(o => o.id));
  box.querySelectorAll('.mk-tk').forEach(el => { if (!have.has(+el.dataset.oid) && !el.classList.contains('leave')) el.remove(); });
  const dprI = Math.min(2, window.devicePixelRatio || 1);
  V.orders.forEach((o, idx) => {
    let el = box.querySelector(`.mk-tk[data-oid="${o.id}"]`);
    if (!el) {
      const dd = DISHES[o.d];
      el = document.createElement('div'); el.className = 'mk-tk new'; el.dataset.oid = o.id; el.title = `${dd.n}: ${dd.c.map(compName).join(' + ')}`;
      el.innerHTML = `<b class="mk-tkn">${esc(dd.n)}</b><canvas class="mk-tkd"></canvas><div class="mk-tkc">${dd.c.map(() => '<canvas></canvas>').join('')}</div><i class="mk-tkb"><i></i></i>`;
      const dc = el.querySelector('.mk-tkd'); dc.width = dc.height = Math.round(46 * dprI); dishIcon(dc, o.d);
      el.querySelectorAll('.mk-tkc canvas').forEach((c, k) => { c.width = c.height = Math.round(24 * dprI); compIcon(c, dd.c[k]); });
      box.appendChild(el);
      setTimeout(() => el.classList.remove('new'), 450);
    }
    el.style.order = idx;
  });
  const no = q('.mk-noord'); no.hidden = V.orders.length > 0 || (V.phase !== 'play' && V.phase !== 'count'); no.textContent = V.phase === 'count' ? '🧾 Siparişler birazdan gelecek…' : 'Sipariş bekleniyor…';
}
function compName(c) { const p = parseComp(c); return `${ING[p.ing].n}${p.ch ? ' (doğranmış)' : ''}${p.ck ? ` → ${COOK[p.ck].n.toLocaleLowerCase('tr-TR')}` : ''}`; }
function hudTick() {
  if (!V || !root || !KV) return;
  const now = hostClock();
  // sayaç
  const left = V.phase === 'play' ? Math.max(0, V.endsAt - now) : V.phase === 'count' ? V.durMs : 0, secs = Math.ceil(left / 1000);
  const tm = q('.mk-timer'); tm.querySelector('b').textContent = mmss(secs); tm.classList.toggle('urgent', V.phase === 'play' && secs <= 20);
  if (secs !== lastSec) { if (V.phase === 'play' && secs <= 10 && secs > 0) Sound.tick(.6); if (V.phase === 'count') { const c = Math.ceil((V.countEnd - now) / 1000); if (c > 0 && c <= 3) Sound.tick(.8); } lastSec = secs; }
  const cn = q('.mk-cnum'); if (cn && V.phase === 'count') cn.textContent = Math.max(1, Math.ceil((V.countEnd - now) / 1000));
  // sipariş süreleri
  V.orders.forEach(o => {
    const el = root.querySelector(`.mk-tk[data-oid="${o.id}"]`); if (!el) return;
    const u = clamp((o.t0 + o.dur - now) / o.dur, 0, 1), b = el.querySelector('.mk-tkb i');
    b.style.width = (u * 100).toFixed(1) + '%'; el.dataset.u = u > .5 ? 'ok' : u > .22 ? 'mid' : 'low';
  });
  // puan ve yıldızlar
  const sc = q('.mk-score'); sc.querySelector('b').textContent = V.score;
  const stars = V.score >= V.thr[2] ? 3 : V.score >= V.thr[1] ? 2 : V.score >= V.thr[0] ? 1 : 0;
  sc.querySelector('.mk-st').innerHTML = [0, 1, 2].map(k => `<i class="${k < stars ? 'on' : ''}">★</i>`).join('');
  const nxt = V.thr.find(x => x > V.score);
  sc.querySelector('.mk-sbar i').style.width = (clamp(V.score / V.thr[2], 0, 1) * 100).toFixed(1) + '%';
  sc.title = nxt ? `Sonraki yıldız: ${nxt} puan` : 'Üç yıldız!';
  // düğmeler ve ipucu
  if (V.me >= 0 && V.phase === 'play') {
    const L = labels();
    alBtn.querySelector('span').textContent = L.al; alBtn.classList.toggle('dim', !L.alOn);
    useBtn.querySelector('span').textContent = L.use; useBtn.querySelector('em').textContent = L.useIc; useBtn.classList.toggle('dim', !L.useOn);
    dashBtn.classList.toggle('dim', pnow() - dashAt < DASH_CD);
    const h = q('.mk-hint');
    if (!isTouch()) { h.innerHTML = `<kbd>Boşluk</kbd> ${esc(L.al)}${L.useOn ? ` · <kbd>E</kbd> ${esc(L.use)}` : ''}`; h.classList.toggle('dim', !L.alOn && !L.useOn); h.hidden = false; }
    else h.hidden = true;
  } else { const h = q('.mk-hint'); if (h) h.hidden = true; }
  if (pnow() - layoutAt > 1500) { layoutAt = pnow(); layout(); }
  renderChefs();
}
function renderSide() {
  const side = q('.mk-side'); if (!side) return;
  const key = V.kid + ':' + (isTouch() ? 't' : 'k');
  if (key === sideKey) return; sideKey = key;
  const K = KITCHENS[V.kid];
  const kn = q('.mk-kname'); if (kn) kn.textContent = `${K.icon} ${K.n} · ${DIFF[V.diff].n}`;
  side.innerHTML = `<h3 class="mk-h">${K.icon} ${esc(K.n)}</h3><p class="mk-twist">${esc(K.twist)}</p>
    <div class="mk-lh">Tarifler</div>
    <ul class="mk-recipes">${K.dishes.map(d => `<li><canvas data-dish="${d}"></canvas><span><b>${esc(DISHES[d].n)}</b><span class="mk-rc">${DISHES[d].c.map(c => `<canvas data-comp="${c}" title="${esc(compName(c))}"></canvas>`).join('<i>+</i>')}</span></span><em>${DISHES[d].pts}</em></li>`).join('')}</ul>
    <p class="mk-legend">🔪 doğra · <span class="mk-pan">●</span> tava · <span class="mk-pot">●</span> tencere · <span class="mk-ovn">●</span> fırın</p>
    <div class="mk-lh">Aşçılar</div><div class="mk-chefs"></div>
    <p class="mk-keys">${isTouch() ? '🕹️ Sol altta joystick · <b>Al/Bırak</b> eşya alır ve koyar · <b>Doğra/Kullan</b> doğrar, yıkar, söndürür · 💨 atılma' : '⌨️ <b>WASD / oklar</b> yürü · <b>Boşluk</b> al / bırak · <b>E</b> ya da <b>Ctrl</b> doğra / yıka / söndür · <b>Shift</b> atıl'}</p>
    <p class="mk-keys">🍽️ Temiz tabağa koy, servis penceresine götür. Hızlı servis = bahşiş! Kirli tabaklar geri gelir: evyede yıka. Ocakta unutulan yemek yanar ve yangın çıkar: 🧯 tüple söndür.</p>`;
  const k = Math.min(2, window.devicePixelRatio || 1);
  side.querySelectorAll('canvas[data-dish]').forEach(c => { c.width = c.height = Math.round(40 * k); dishIcon(c, c.dataset.dish); });
  side.querySelectorAll('canvas[data-comp]').forEach(c => { c.width = c.height = Math.round(26 * k); compIcon(c, c.dataset.comp); });
  chefKey = '';
}
function renderChefs() {
  const box = q('.mk-chefs'); if (!box) return;
  const key = JSON.stringify([V.stats, V.players.map(p => p.online), V.me]);
  if (key === chefKey) return; chefKey = key;
  box.innerHTML = V.players.map((p, i) => { const s = V.stats[i]; return `<div class="mk-chef ${p.online ? '' : 'off'}" style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><b>${esc(p.name)}${i === V.me ? ' <small>(sen)</small>' : p.isBot ? ' <small>🤖</small>' : ''}</b><span class="mk-cs">🍽️${s.sv} 🔪${s.ch} 🧽${s.wa}${s.fi ? ` 🧯${s.fi}` : ''}</span></div>`; }).join('');
}
function renderOverlays() {
  const cnt = q('.mk-count'), K = KITCHENS[V.kid];
  if (V.phase === 'count') {
    if (cnt.hidden || cnt.dataset.k !== V.kid) {
      cnt.dataset.k = V.kid;
      cnt.innerHTML = `<div class="mk-card"><small>${esc(DIFF[V.diff].n.toLocaleUpperCase('tr-TR'))} · ${V.mins} DK</small><h3>${K.icon} ${esc(K.n)}</h3><p class="mk-ctw">${esc(K.twist)}</p>
        <div class="mk-cdish">${K.dishes.map(d => `<span><canvas data-dish="${d}"></canvas><b>${esc(DISHES[d].n)}</b></span>`).join('')}</div>
        <b class="mk-cnum">3</b><p class="mk-chint">${isTouch() ? 'Joystick ile yürü · Al/Bırak · Doğra/Kullan' : 'WASD yürü · Boşluk al/bırak · E doğra/kullan · Shift atıl'}</p>
        <p class="mk-cstar">★ ${V.thr[0]} · ★★ ${V.thr[1]} · ★★★ ${V.thr[2]} puan</p></div>`;
      const k = Math.min(2, window.devicePixelRatio || 1);
      cnt.querySelectorAll('canvas[data-dish]').forEach(c => { c.width = c.height = Math.round(44 * k); dishIcon(c, c.dataset.dish); });
    }
    cnt.hidden = false;
  } else cnt.hidden = true;
  const en = q('.mk-end');
  if ((V.phase === 'end' || V.phase === 'over') && V.last) {
    if (!endShown) {
      endShown = true;
      const L = V.last, rows = V.players.map((p, i) => ({ p, i, s: V.stats[i] })).sort((a, b) => b.s.pts - a.s.pts);
      en.innerHTML = `<div class="mk-card mk-ecard"><small>SERVİS BİTTİ</small>
        <div class="mk-bigst">${[0, 1, 2].map(k => `<i class="${k < L.stars ? 'on' : ''}" style="animation-delay:${.25 + k * .35}s">★</i>`).join('')}</div>
        <h3>${L.stars ? `Ekip ${L.stars} yıldız aldı!` : 'Yıldız yok… bir dahakine!'}</h3>
        <p class="mk-esum"><b>${L.score}</b> puan · ${L.served} servis · ${L.tips} bahşiş · ${L.missed} kaçan</p>
        <table class="mk-tbl"><tr><th></th><th>🍽️</th><th>🔪</th><th>🧽</th><th>🧯</th><th>Katkı</th></tr>${rows.map(r => `<tr style="--pc:${r.p.color}"><td><span class="av" style="--pc:${r.p.color}">${initial(r.p.name)}</span>${esc(r.p.name)}${r.i === V.me ? ' <small>(sen)</small>' : ''}</td><td>${r.s.sv}</td><td>${r.s.ch}</td><td>${r.s.wa}</td><td>${r.s.fi}</td><td><b>${r.s.pts}</b></td></tr>`).join('')}</table>
        <p class="mk-enext">Eşikler: ${L.thr.join(' / ')} · sonuçlar geliyor…</p></div>`;
    }
    en.hidden = false;
  } else { en.hidden = true; endShown = false; }
}
function render(v) {
  V = v;
  if (!v || !root) return;
  if (!KV || KV.id !== v.kid) { KV = kitchen(v.kid); bgKey = ''; requestAnimationFrame(layout); }
  Sd.length = 0; v.S.forEach(d => { Sd[d.i] = d; });
  if (v.spawnVer !== seenSpawn) {
    seenSpawn = v.spawnVer; rp = [];
    v.pos.forEach((p, i) => { rp[i] = mkRemote(p); });
    av = v.me >= 0 ? { x: v.pos[v.me][0], y: v.pos[v.me][1], vx: 0, vy: 0, fx: v.pos[v.me][2], fy: v.pos[v.me][3], walk: 0 } : null;
    parts = []; floats = [];
  }
  if (v.me >= 0 && !av) av = { x: v.pos[v.me][0], y: v.pos[v.me][1], vx: 0, vy: 0, fx: 0, fy: 1, walk: 0 };
  if (v.phase !== seenPhase) { seenPhase = v.phase; lastSec = -1; requestAnimationFrame(layout); }
  root.querySelector('.mk').dataset.phase = v.phase;
  renderOrders(); renderSide(); renderOverlays(); hudTick();
  if (!raf) raf = requestAnimationFrame(frame);
}

/* ---- olaylar ---- */
function pop(text, cls) { const p = q('.mk-pop'); if (!p) return; p.className = 'mk-pop'; p.textContent = text; void p.offsetWidth; p.className = 'mk-pop show ' + (cls || ''); clearTimeout(popT); popT = setTimeout(() => { if (p) p.className = 'mk-pop'; }, 1300); }
function toast(text, cls) { const p = q('.mk-toast'); if (!p) return; p.textContent = text; p.className = 'mk-toast show ' + (cls || ''); clearTimeout(toastT); toastT = setTimeout(() => { if (p) p.className = 'mk-toast'; }, 1500); }
function stXY(si) { const K = KV, s = K.st[si]; if (!s) return [K.W / 2, K.H / 2]; return stPos(K, s, moverRow(K, V.t0, hostClock())); }
function toClient(x, y) { const r = cv.getBoundingClientRect(), [sx, sy] = scr(x, y); return [r.left + sx, r.top + sy]; }
function onEvent(e) {
  if (!root || !V || !KV) return;
  const me = ui ? ui.me : -1;
  switch (e.t) {
    case 'go': pop('SERVİS BAŞLADI!', 'good'); Sound.stop(); Sound.whoosh(); break;
    case 'order': { snd.clink(); Sound.tick(.4); break; }
    case 'pick': if (e.pi === me) snd.pop(); break;
    case 'drop': if (e.pi === me) snd.drop(); if (e.cook) { const [x, y] = stXY(e.s); emitAt('steam', x, y - .2, 3); } break;
    case 'plate': if (e.pi === me) snd.clink(); break;
    case 'splash': snd.splash(); break;
    case 'trash': if (e.pi === me) snd.trash(); break;
    case 'chopped': { const [x, y] = stXY(e.s); emitAt('spark', x, y - .2, 8, { cols: [ingCol(e.what), '#ffffff'] }); if (e.pi === me) snd.ding(); break; }
    case 'washed': { const [x, y] = stXY(e.s); emitAt('bubble', x, y - .1, 6); if (e.pi === me) snd.clink(); break; }
    case 'cooked': { const [x, y] = stXY(e.s); emitAt('steam', x, y - .3, 6); snd.ding(); floatText(x, y - .5, 'PİŞTİ!', '#2bff88', 1000, .26); break; }
    case 'warn': { const [x, y] = stXY(e.s); floatText(x, y - .6, 'YANIYOR!', '#ff9a3c', 1100, .26); break; }
    case 'fire': { const [x, y] = stXY(e.s); emitAt('smoke', x, y - .3, 8); Sound.whoosh(); if (e.why === 'burn') { pop('YANGIN! 🧯', 'bad'); flash('bad'); } break; }
    case 'out': { const [x, y] = stXY(e.s); emitAt('steam', x, y - .2, 10); Sound.good(); if (e.pi === me) floatText(x, y - .5, '+8', '#5ad1ff'); break; }
    case 'spray': break;
    case 'return': snd.clink(); break;
    case 'serve': {
      const win = KV.st.find(s => s.k === 'window'), [x, y] = win ? stXY(win.i) : [KV.W / 2, 1];
      floatText(x, y + .2, `+${e.pts}`, '#ffe14a', 1500, .42);
      if (e.tip) setTimeout(() => floatText(x, y + .5, `+${e.tip} bahşiş`, '#2bff88', 1500, .3), 250);
      Sound.buy(); setTimeout(() => Sound.good(), 120);
      emitAt('spark', x, y + .3, 14);
      const el = root.querySelector(`.mk-tk[data-oid="${e.oid}"]`); if (el) { el.classList.add('leave', 'done'); setTimeout(() => el.remove(), 650); }
      if (e.pi === me) { const c = toClient(x, y + .3); FX.burst(c[0], c[1], 26, true); }
      break;
    }
    case 'miss': {
      Sound.bad(); toast(`⌛ ${DISHES[e.d].n} kaçtı! −${e.pen}`, 'bad');
      const el = root.querySelector(`.mk-tk[data-oid="${e.oid}"]`); if (el) { el.classList.add('leave', 'fail'); setTimeout(() => el.remove(), 700); }
      break;
    }
    case 'no': if (e.pi === me) { toast(e.m, 'bad'); snd.no(); } break;
    case 'end': Sound.solve(); if (e.stars >= 2) FX.confetti(90); break;
    default: break;
  }
}

/* ---- giriş ---- */
function joyStart(e) {
  if (!V || V.me < 0 || joy.on) return;
  e.preventDefault(); Sound.init();
  const r = padEl.getBoundingClientRect();
  joy.on = true; joy.id = e.pointerId; joy.bx = e.clientX - r.left; joy.by = e.clientY - r.top; joy.dx = joy.dy = 0;
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* */ }
  joyEl.classList.add('on'); joyEl.style.left = joy.bx + 'px'; joyEl.style.top = joy.by + 'px'; joyEl.querySelector('i').style.transform = '';
}
function joyMove(e) {
  if (!joy.on || e.pointerId !== joy.id) return;
  const r = padEl.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, JR = 40;
  let dx = (x - joy.bx) / JR, dy = (y - joy.by) / JR; const l = Math.hypot(dx, dy);
  if (l > 1.3) { joy.bx = x - dx / l * JR * 1.3; joy.by = y - dy / l * JR * 1.3; joyEl.style.left = joy.bx + 'px'; joyEl.style.top = joy.by + 'px'; }
  if (l > 1) { dx /= l; dy /= l; }
  const dead = Math.hypot(dx, dy) < .16;
  joy.dx = dead ? 0 : dx; joy.dy = dead ? 0 : dy;
  joyEl.querySelector('i').style.transform = `translate(${dx * JR * .7}px, ${dy * JR * .7}px)`;
}
function joyEnd(e) { if (e.pointerId !== joy.id) return; joy.on = false; joy.id = null; joy.dx = joy.dy = 0; joyEl.classList.remove('on'); joyEl.querySelector('i').style.transform = ''; }
function onKey(e) {
  if (!V || !root || (e.target && e.target.closest && e.target.closest('input,textarea,select'))) return;
  if (!document.getElementById('confirm') || !document.getElementById('confirm').hidden) return;
  const move = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'];
  if (e.type === 'keydown') {
    if (move.includes(e.code)) { keys.add(e.code); if (V.me >= 0) e.preventDefault(); }
    else if (V.me >= 0 && V.phase === 'play') {
      if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) sendAct('al'); }
      else if (e.code === 'KeyE' || e.code === 'ControlLeft' || e.code === 'ControlRight') { e.preventDefault(); if (!e.repeat) useDown(); }
      else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { e.preventDefault(); if (!e.repeat) dash(); }
    }
  } else {
    keys.delete(e.code);
    if (e.code === 'KeyE' || e.code === 'ControlLeft' || e.code === 'ControlRight') useUp();
  }
}
function onBlur() { keys.clear(); joy.on = false; joy.dx = joy.dy = 0; useHeld = false; if (joyEl) joyEl.classList.remove('on'); }

function mount(r, api) {
  root = r; ui = api; uiRef = api; V = null; KV = null; av = null; rp = []; keys = new Set(); parts = []; floats = [];
  seenSpawn = -1; seenPhase = ''; ordKey = ''; sideKey = ''; chefKey = ''; lastT = 0; target = -1; endShown = false; bgKey = ''; cw = ch = 0; dashAt = -9999;
  root.innerHTML = `<div class="g-wrap mk">
    <div class="mk-orders" aria-label="Siparişler"><p class="mk-noord" hidden>Sipariş bekleniyor…</p></div>
    <div class="mk-main">
      <div class="mk-col">
        <div class="mk-hud"><span class="mk-timer">⏱ <b>3:00</b></span><span class="mk-kname"></span><span class="mk-score" title="">💰 <b>0</b><span class="mk-st"></span><span class="mk-sbar"><i></i></span></span></div>
        <div class="mk-stage">
          <canvas class="mk-cv" aria-label="Mutfak"></canvas>
          <div class="mk-hint" hidden></div>
          <div class="mk-pop" aria-live="polite"></div>
          <div class="mk-toast" aria-live="polite"></div>
          <div class="mk-count" hidden></div>
          <div class="mk-end" hidden></div>
        </div>
        <div class="mk-pad" hidden>
          <div class="mk-joyzone"><div class="mk-joy"><i></i></div><span class="mk-joyhint">Sürükle ve yürü</span></div>
          <div class="mk-btns">
            <button type="button" class="mk-b mk-dash" aria-label="Atıl"><em>💨</em><span>Atıl</span></button>
            <button type="button" class="mk-b mk-use" aria-label="Doğra / Kullan"><em>🔪</em><span>Doğra</span></button>
            <button type="button" class="mk-b mk-al" aria-label="Al / Bırak"><em>✋</em><span>Al</span></button>
          </div>
        </div>
      </div>
      <aside class="mk-side g-panel"></aside>
    </div>
  </div>`;
  cv = q('.mk-cv'); cg = cv.getContext('2d'); stageEl = q('.mk-stage'); padEl = q('.mk-pad'); joyEl = q('.mk-joy');
  alBtn = q('.mk-al'); useBtn = q('.mk-use'); dashBtn = q('.mk-dash');
  const zone = q('.mk-joyzone');
  zone.addEventListener('pointerdown', joyStart); zone.addEventListener('pointermove', joyMove);
  zone.addEventListener('pointerup', joyEnd); zone.addEventListener('pointercancel', joyEnd);
  const btn = (el, down, up) => {
    el.addEventListener('pointerdown', e => { e.preventDefault(); Sound.init(); el.classList.add('press'); down(); });
    const end = () => { el.classList.remove('press'); if (up) up(); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('pointerleave', end);
    el.addEventListener('click', e => e.preventDefault());
  };
  btn(alBtn, () => sendAct('al')); btn(useBtn, useDown, useUp); btn(dashBtn, dash);
  padEl.addEventListener('contextmenu', e => e.preventDefault());
  if (window.ResizeObserver) { ro = new ResizeObserver(() => layout()); ro.observe(root); }
  addEventListener('resize', layout);
  document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKey); addEventListener('blur', onBlur);
  hudT = setInterval(hudTick, 125);
}
function unmount() {
  removeEventListener('resize', layout); removeEventListener('blur', onBlur);
  document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKey);
  if (ro) { ro.disconnect(); ro = null; }
  clearInterval(hudT); clearTimeout(popT); clearTimeout(toastT); if (raf) cancelAnimationFrame(raf);
  raf = 0; root = null; ui = null; uiRef = null; V = null; KV = null; cv = null; cg = null; stageEl = null; padEl = null; joyEl = null; alBtn = useBtn = dashBtn = null; bg = null; av = null; rp = [];
}

CFX.registerGame(Object.assign({
  id: 'mutfak', name: 'Mutfak Kaosu', icon: '👩‍🍳', color: '#ff8a3d', min: 1, max: 6, hotseat: false, bot: true, localMin: 1,
  tagline: 'Doğra, pişir, yetiştir: birlikte çılgın mutfak!',
  rules: 'Birlikte oynanan gerçek zamanlı mutfak: siparişleri malzemeleri kasadan alıp doğrayarak, tava, tencere ya da fırında pişirip temiz tabakla servis penceresine yetiştirin. Hızlı servis bahşiş getirir, kaçan sipariş puan götürür; kirli tabakları yıkayın, yanan ocağı tüple söndürün. Sonunda ekip puanına göre 1–3 yıldız!',
  options: [
    { key: 'mutfak', label: 'Mutfak', def: 'mahalle', choices: KIT_IDS.map(k => ({ v: k, label: `${KITCHENS[k].icon} ${KITCHENS[k].n}` })).concat([{ v: 'rastgele', label: '🎲 Rastgele' }]) },
    { key: 'sure', label: 'Süre', def: '3', choices: [{ v: '3', label: '3 dk' }, { v: '4', label: '4 dk' }, { v: '5', label: '5 dk' }] },
    { key: 'zorluk', label: 'Zorluk', def: 'normal', choices: [{ v: 'kolay', label: 'Kolay' }, { v: 'normal', label: 'Normal' }, { v: 'zor', label: 'Zor' }] }
  ],
  mount, render, onEvent, onFast, unmount,
  // test ve geliştirme için dışa açık yardımcılar
  _mk: { planFor, planBan, routeTo, KITCHENS, DISHES, ING, COOK, DIFF, kitchen, subMulti, sameMulti, plateFits, contFits, dishOf, contProg, contDone, doAl, doUse, act, serve, needs, stepWork, stepCook, stepFire, stepOrders, stepBelt, stepBots, moveBody, collide, walkable, moverRow, moverSliding, applyPos, dropHeld, ignite, starsOf, mkIng, mkPlate, inReach,
    av: () => av, rp: () => rp, target: () => target, scr: (x, y) => scr(x, y), toClient: (x, y) => (cv ? toClient(x, y) : null), keys: () => keys, ts: () => ts, tr: () => TR, labels: () => (V ? labels() : null) }
}, RULES));
})();
