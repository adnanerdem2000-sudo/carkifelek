/* =========================================================================
   OYUN SALONU — BİLET YOLU
   Türkiye haritasında demiryolu hatları kur, bilet hedeflerini bağla.
   2–5 oyuncu: online, aynı cihazda sırayla ya da bilgisayara karşı.
   Eldeki vagon kartlarını ve biletleri yalnızca sahibi görür; diğerleri
   yalnızca sayıyı görür. Biletler oyun sonunda haritada tek tek açılır.
   Modern eklemeler: Feribot (lokomotif ister), Tünel (3 kart açılır, eşleşen
   kadar ek ödeme), isteğe bağlı İstasyon ve Gezgin bonusu.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial } = CFX;

/* ------------------------------------------------------------------ sabitler */
const CN = ['Kırmızı', 'Turuncu', 'Sarı', 'Yeşil', 'Mavi', 'Mor', 'Siyah', 'Beyaz', 'Lokomotif'];
const CC = ['#e8413c', '#ff8f1f', '#ffd43a', '#3fb24f', '#2f7fe0', '#9b4fd8', '#2b2f3a', '#f4f1ea', '#c9c9c9'];
const LOCO = 8, GREY = 8;
const PTS = [0, 1, 2, 4, 7, 10, 15];
const TRAINS = 45, STATIONS = 3, PER_COLOR = 12, N_LOCO = 14;
const LONG_BONUS = 10, GEZ_BONUS = 15, ST_BONUS = 4;

/* ------------------------------------------------------------------ harita: Türkiye */
const PX = lon => (lon - 25.3) * 70, PY = lat => (42.9 - lat) * 90;
// [anahtar, ad, enlem, boylam, etiket yönü, büyük şehir?]
const TR_CITIES = [
  ['ed', 'Edirne', 41.68, 26.56, 'n'], ['ist', 'İstanbul', 41.01, 28.98, 'n', 1], ['cnk', 'Çanakkale', 40.15, 26.41, 'w'], ['brs', 'Bursa', 40.19, 29.06, 'sw'],
  ['blk', 'Balıkesir', 39.65, 27.88, 'e'], ['izm', 'İzmir', 38.42, 27.14, 'w', 1], ['bod', 'Bodrum', 37.03, 27.43, 'sw'], ['mug', 'Muğla', 37.21, 28.36, 'n'],
  ['den', 'Denizli', 37.78, 29.09, 'n'], ['ant', 'Antalya', 36.89, 30.71, 's', 1], ['aln', 'Alanya', 36.54, 32.0, 's'], ['isp', 'Isparta', 37.76, 30.55, 'e'],
  ['afy', 'Afyon', 38.76, 30.54, 'e'], ['esk', 'Eskişehir', 39.78, 30.52, 'w'], ['zon', 'Zonguldak', 41.45, 31.79, 'n'], ['kas', 'Kastamonu', 41.38, 33.78, 'n'],
  ['sin', 'Sinop', 42.03, 35.15, 'n'], ['sam', 'Samsun', 41.29, 36.33, 'n'], ['trb', 'Trabzon', 41.0, 39.72, 'n', 1], ['riz', 'Rize', 41.02, 40.52, 'n'],
  ['ank', 'Ankara', 39.93, 32.86, 'nw', 1], ['cor', 'Çorum', 40.55, 34.95, 'w'], ['kon', 'Konya', 37.87, 32.48, 'w', 1], ['nev', 'Nevşehir', 38.62, 34.71, 'n'],
  ['kay', 'Kayseri', 38.73, 35.48, 'e'], ['siv', 'Sivas', 39.75, 37.02, 'n'], ['erc', 'Erzincan', 39.75, 39.49, 'w'], ['erz', 'Erzurum', 39.9, 41.27, 'n', 1],
  ['kar', 'Kars', 40.6, 43.1, 'n'], ['agr', 'Ağrı', 39.72, 43.05, 'e'], ['van', 'Van', 38.49, 43.38, 'e', 1], ['diy', 'Diyarbakır', 37.91, 40.23, 'n', 1],
  ['mal', 'Malatya', 38.35, 38.31, 'n'], ['kmr', 'K.Maraş', 37.58, 36.94, 'w'], ['gaz', 'Gaziantep', 37.07, 37.38, 's', 1], ['urf', 'Şanlıurfa', 37.16, 38.8, 's'],
  ['mar', 'Mardin', 37.31, 40.74, 's'], ['hat', 'Hatay', 36.2, 36.16, 's'], ['ada', 'Adana', 37.0, 35.32, 'n', 1], ['mer', 'Mersin', 36.8, 34.64, 'sw']
];
// renk: 0 kırmızı 1 turuncu 2 sarı 3 yeşil 4 mavi 5 mor 6 siyah 7 beyaz 8 gri. "a b uzunluk renk [ikiz renk] [f<n>|t] [b<eğim>]"
const TR_ROUTES = `ed ist 4 0 7|ed cnk 3 2|ist cnk 4 8 f1|ist brs 2 4 6|ist zon 5 6|ist esk 4 3 1|cnk blk 3 5|cnk izm 4 8|brs blk 2 1|brs esk 3 7
|blk izm 3 0 2|izm bod 3 3|izm den 4 4|izm afy 6 5|bod mug 2 8|mug den 2 2|mug ant 4 6|den isp 3 8|den afy 3 0|isp ant 2 7|isp afy 2 8|isp kon 3 1
|ant aln 2 4|ant kon 4 8 t|aln kon 3 3 t|aln mer 4 8 f1 b.06|bod ant 5 8 f2 b.17|afy esk 2 6|afy kon 4 2|esk ank 4 0 4|esk zon 4 1|zon kas 3 3|zon ank 4 7
|kas sin 3 0|kas ank 3 4|kas cor 3 8|sin sam 3 7|sam cor 3 1|sam trb 6 8 b-.04|ank cor 4 5 3|ank kon 5 7 1|ank nev 4 0|kon nev 4 4|kon mer 4 6 t
|nev kay 1 8 8|cor siv 4 2|sam siv 4 0|kay siv 3 5 1|kay mal 5 3|kay kmr 4 7|kay ada 4 8 t|mer ada 1 2 5|ada hat 2 3|ada kmr 3 4|hat gaz 3 0|kmr gaz 1 8
|mer hat 3 8 f1 b.08|kmr mal 3 6|gaz urf 2 1 7|mal diy 3 8 t|mal siv 4 4|mal erc 4 5|siv erc 4 6 3|erc trb 3 0 t|trb riz 1 4 2|trb erz 4 5 t|riz erz 3 8 t
|riz kar 5 7|erc erz 3 2|erz kar 4 3|erz agr 3 2|kar agr 2 8|agr van 3 5|erz diy 5 6|diy van 5 8 t b.08|diy mar 2 7|diy urf 3 2|urf mar 3 4|mar van 5 1`;
const TR_TICKETS = `ist ank|ist izm|ist ant|ist trb|izm ant|izm kon|ank sam|ank ada|ank erz|brs kon|esk kay|kon gaz|ada diy|kay van|sam mal|trb van|sin kay|zon siv
|ed ank|cnk esk|den nev|afy sam|aln kmr|mer siv|hat erc|gaz kar|urf erz|mar riz|kas ada|cor urf|isp cor|mug kon|bod ank|blk zon|agr diy|kmr trb|nev erz|riz sin
|mal van|izm ada|ed van|ist kar|izm trb|bod erz|cnk mar|ant riz`;
// süsleme: kıyı çizgileri (boylam, enlem)
const TR_ART = {
  thrace: [[26.07, 40.72], [26.2, 41.0], [26.32, 41.25], [26.36, 41.6], [26.33, 41.72], [26.6, 41.96], [27.05, 42.08], [27.55, 41.95], [28.03, 41.98], [28.1, 41.62], [28.6, 41.35], [29.05, 41.23], [29.06, 41.12], [28.98, 41.02], [28.6, 40.97], [28.0, 40.99], [27.5, 40.97], [27.2, 40.72], [26.95, 40.55], [26.64, 40.44], [26.33, 40.21], [26.17, 40.05], [26.25, 40.25], [26.5, 40.42], [26.72, 40.52], [26.85, 40.6], [26.6, 40.64], [26.3, 40.6]],
  anatolia: [[29.12, 41.22], [29.9, 41.15], [30.6, 41.12], [31.4, 41.3], [31.8, 41.46], [32.3, 41.73], [33.0, 41.95], [33.8, 41.98], [34.4, 41.97], [34.96, 42.1], [35.25, 42.0], [35.5, 41.73], [35.9, 41.72], [36.15, 41.45], [36.35, 41.3], [36.65, 41.38], [37.0, 41.15], [37.5, 41.08], [37.9, 41.0], [38.4, 40.95], [39.0, 41.05], [39.72, 41.0], [40.3, 40.95], [40.52, 41.04], [41.0, 41.2], [41.4, 41.38], [41.55, 41.52],
    [42.0, 41.5], [42.5, 41.45], [42.8, 41.58], [43.45, 41.15], [43.6, 40.9], [43.75, 40.6], [43.6, 40.4], [43.9, 40.1], [44.4, 40.0], [44.77, 39.7], [44.4, 39.4], [44.05, 39.0], [44.3, 38.4], [44.4, 38.1], [44.25, 37.9], [44.6, 37.75], [44.8, 37.3], [44.2, 37.25], [43.4, 37.3], [42.8, 37.35], [42.35, 37.1], [41.5, 37.08], [41.2, 37.07], [40.5, 36.95], [40.0, 36.85], [39.0, 36.7], [38.0, 36.83], [37.1, 36.72], [36.7, 36.8], [36.55, 36.25], [36.4, 36.0], [36.15, 35.85], [35.93, 35.95], [35.85, 36.2], [36.15, 36.55], [35.95, 36.85], [35.6, 36.6], [35.3, 36.6], [34.9, 36.75], [34.6, 36.78], [34.2, 36.5], [33.9, 36.3], [33.6, 36.15], [33.0, 36.08], [32.8, 36.02], [32.4, 36.2], [32.0, 36.55], [31.4, 36.78], [30.85, 36.88], [30.55, 36.6], [30.5, 36.3], [30.2, 36.25], [29.6, 36.18], [29.3, 36.3], [29.1, 36.6], [28.6, 36.75], [28.2, 36.72], [27.8, 36.65], [27.4, 36.68], [28.0, 36.85], [28.3, 37.02], [27.6, 37.0], [27.25, 37.0], [27.4, 37.25], [27.25, 37.5], [27.25, 37.86], [26.8, 38.15], [26.3, 38.3], [26.6, 38.45], [26.95, 38.38], [27.1, 38.45], [26.8, 38.65], [26.85, 39.0], [26.68, 39.32], [27.0, 39.55], [26.4, 39.5], [26.08, 39.48], [26.15, 39.9], [26.22, 40.03], [26.42, 40.14], [26.7, 40.35], [27.0, 40.4], [27.3, 40.38], [27.6, 40.33], [27.85, 40.45], [28.2, 40.4], [28.9, 40.38], [29.15, 40.42], [29.0, 40.5], [29.1, 40.62], [29.4, 40.7], [29.9, 40.72], [29.4, 40.8], [29.05, 40.95]],
  islandsTR: [[[25.67, 40.2], [25.85, 40.25], [26.0, 40.17], [25.85, 40.1], [25.68, 40.13]], [[26.0, 39.85], [26.1, 39.85], [26.08, 39.8], [25.98, 39.8]]],
  foreign: [
    [[18, 46], [29.5, 46], [28.6, 43.4], [27.95, 42.75], [27.75, 42.4], [28.03, 41.98], [27.55, 41.95], [27.05, 42.08], [26.6, 41.96], [26.33, 41.72], [26.36, 41.6], [26.32, 41.25], [26.2, 41.0], [26.07, 40.72], [25.6, 40.86], [25.0, 40.95], [24.0, 40.9], [23.0, 40.4], [18, 40]],
    [[41.55, 41.52], [41.65, 41.9], [41.6, 42.3], [41.45, 42.7], [40.5, 43.3], [39.5, 44.5], [52, 44.5], [52, 30], [35.6, 30], [35.9, 35.3], [35.93, 35.95], [36.15, 35.85], [37, 36.5], [40, 36.85], [44.8, 37.3], [43.45, 41.15]],
    [[25.85, 39.25], [26.1, 39.38], [26.4, 39.35], [26.6, 39.05], [26.3, 38.97], [26.0, 39.05]], [[25.85, 38.55], [26.15, 38.55], [26.15, 38.3], [25.95, 38.2], [25.85, 38.35]],
    [[26.55, 37.8], [27.05, 37.75], [26.95, 37.65], [26.6, 37.68]], [[26.95, 36.9], [27.35, 36.9], [27.3, 36.75], [26.95, 36.8]], [[27.7, 36.42], [28.25, 36.45], [28.2, 36.1], [27.75, 35.9], [27.7, 36.15]],
    [[32.3, 35.1], [32.9, 35.4], [33.6, 35.36], [34.6, 35.7], [34.0, 35.25], [34.0, 34.6], [32.3, 34.6]]
  ],
  lakes: [[[42.3, 38.62], [42.75, 38.95], [43.2, 38.98], [43.5, 38.82], [43.3, 38.55], [43.05, 38.4], [42.8, 38.5], [42.5, 38.45]], [[33.2, 39.05], [33.5, 39.1], [33.6, 38.8], [33.55, 38.5], [33.35, 38.6], [33.25, 38.85]],
    [[31.4, 37.85], [31.6, 37.85], [31.65, 37.65], [31.45, 37.6]], [[30.8, 38.15], [30.9, 38.1], [30.9, 37.85], [30.82, 37.85]], [[38.3, 37.75], [38.65, 37.6], [38.75, 37.45], [38.5, 37.5]]],
  rivers: [[[38.0, 39.9], [37.2, 39.6], [36.4, 39.2], [35.6, 38.85], [34.9, 38.9], [34.0, 39.3], [33.6, 39.9], [33.9, 40.6], [34.6, 41.0], [35.3, 41.3], [35.95, 41.7]],
    [[31.5, 39.3], [30.8, 39.6], [30.2, 40.0], [30.4, 40.5], [30.6, 41.1]], [[41.0, 39.8], [39.6, 39.4], [38.6, 38.9], [38.3, 38.4], [38.4, 37.6], [38.0, 37.0], [38.05, 36.83]],
    [[39.7, 38.4], [40.2, 37.9], [41.0, 37.6], [41.8, 37.5], [42.2, 37.3]], [[38.5, 40.2], [37.2, 40.3], [36.6, 40.8], [36.65, 41.38]], [[29.9, 38.3], [29.0, 38.0], [28.2, 37.9], [27.3, 37.55]]],
  mounts: [[30.3, 36.65, 1], [29.9, 36.95, .9], [31.3, 37.25, .8], [32.6, 36.95, 1], [33.3, 36.85, 1.1], [33.9, 37.1, 1], [34.5, 37.3, 1.1], [35.1, 37.45, 1], [36.3, 37.95, .9], [37.3, 38.2, 1], [38.05, 38.75, .9],
    [39.4, 38.45, 1], [40.6, 38.55, 1.1], [41.5, 38.15, 1], [42.3, 37.85, 1.1], [43.6, 37.6, 1], [31.2, 40.85, .8], [32.9, 41.4, .85], [34.3, 41.55, .9], [36.9, 40.65, .9], [38.2, 40.55, 1], [39.1, 40.55, 1.1],
    [40.1, 40.6, 1.1], [41.0, 40.8, 1.2], [42.2, 40.3, 1], [41.8, 39.35, 1], [40.4, 39.95, .9], [42.6, 39.2, .9], [29.25, 40.0, .9], [28.5, 39.3, .8], [29.6, 37.4, .8], [36.2, 39.2, .8], [37.9, 39.3, .8]],
  peaks: [[44.3, 39.72, 1.6], [35.45, 38.53, 1.25], [34.17, 38.13, .95]],
  trees: [[30.9, 40.75], [31.6, 41.05], [32.6, 41.5], [33.4, 41.6], [35.7, 41.2], [37.4, 40.85], [38.7, 40.8], [39.4, 40.75], [40.6, 40.85], [27.4, 41.6], [27.9, 41.75], [29.6, 40.1], [30.1, 37.3], [31.9, 37.4]],
  seas: [['KARADENİZ', 37.8, 42.35, 0, 26], ['AKDENİZ', 31.4, 35.95, 0, 24], ['EGE', 25.78, 38.15, -90, 18], ['MARMARA', 28.05, 40.72, 0, 11]],
  lands: [['BULGARİSTAN', 27.0, 42.45], ['GÜRCİSTAN', 43.1, 41.95], ['SURİYE', 38.6, 36.25], ['IRAK', 43.6, 36.95], ['İRAN', 44.85, 38.9], ['KIBRIS', 33.5, 35.5]]
};

function buildMap(id) {
  const cities = TR_CITIES.map(([k, n, lat, lon, lab, big], i) => ({ i, k, n, x: Math.round(PX(lon)), y: Math.round(PY(lat)), lab: lab || 's', big: !!big }));
  const ix = {}; cities.forEach(c => { ix[c.k] = c.i; });
  const routes = [];
  TR_ROUTES.split('|').map(s => s.trim()).filter(Boolean).forEach(s => {
    const parts = s.split(/\s+/), a = ix[parts[0]], b = ix[parts[1]], len = +parts[2];
    const cols = [+parts[3]]; let f = 0, t = false, bend = 0;
    parts.slice(4).forEach(p => { if (/^\d$/.test(p)) cols.push(+p); else if (p[0] === 'f') f = +p.slice(1); else if (p === 't') t = true; else if (p[0] === 'b') bend = +p.slice(1); });
    if (a == null || b == null) throw new Error('harita: ' + s);
    const ids = cols.map((c, k) => { const r = { id: routes.length, a, b, len, c, f, t, bend, tw: -1, lane: 0 }; routes.push(r); return r.id; });
    if (ids.length === 2) { routes[ids[0]].tw = ids[1]; routes[ids[1]].tw = ids[0]; routes[ids[0]].lane = -1; routes[ids[1]].lane = 1; }
  });
  const adj = cities.map(() => []);
  routes.forEach(r => { adj[r.a].push(r.id); adj[r.b].push(r.id); });
  const M = { id, name: 'Türkiye', cities, routes, adj, box: { x: -6, y: 18, w: 1366, h: 646 }, art: TR_ART };
  M.tickets = TR_TICKETS.split('|').map(s => s.trim()).filter(Boolean).map((s, i) => {
    const [a, b] = s.split(/\s+/).map(k => ix[k]);
    const d = dijkstra(M, a, r => r.len).dist[b];
    return { id: i, a, b, p: d, long: d >= 17 };
  });
  return M;
}
// en kısa yol: cost(r) → maliyet (Infinity = kapalı)
function dijkstra(M, src, cost) {
  const n = M.cities.length, dist = Array(n).fill(Infinity), via = Array(n).fill(-1), done = Array(n).fill(false);
  dist[src] = 0;
  for (;;) {
    let u = -1, best = Infinity;
    for (let i = 0; i < n; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
    if (u < 0) break;
    done[u] = true;
    for (const rid of M.adj[u]) {
      const r = M.routes[rid], c = cost(r); if (!(c < Infinity)) continue;
      const w = r.a === u ? r.b : r.a, nd = dist[u] + c;
      if (nd < dist[w] - 1e-9) { dist[w] = nd; via[w] = rid; }
    }
  }
  return { dist, via };
}
function pathRoutes(M, via, src, dst) {
  const out = []; let c = dst, g = 0;
  while (c !== src && via[c] >= 0 && g++ < 100) { const r = M.routes[via[c]]; out.push(r.id); c = r.a === c ? r.b : r.a; }
  return c === src ? out : null;
}
const MAPS = {};
function gm(st) { const id = (st && st.map) || 'tr'; return MAPS[id] || (MAPS[id] = buildMap(id)); }

/* ------------------------------------------------------------------ yardımcılar */
let DEF = null;
const T = ms => Math.max(5, Math.round(ms * (DEF ? DEF.speed : 1)));
const zero = () => Array(9).fill(0);
const sum = a => a.reduce((x, y) => x + y, 0);
const pn = (st, i) => st.players[i].name;
function shuf(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const isOn = i => { const g = CFX.Room && CFX.Room.game; return !(g && g.players[i] && !g.players[i].isBot && g.players[i].online === false); };
function cityName(M, i) { return M.cities[i].n; }
function routeName(M, r) { return `${M.cities[r.a].n}–${M.cities[r.b].n}`; }

/* ---------- kart destesi ---------- */
function drawCard(st) {
  if (!st.deck.length && st.disc.length) { st.deck = shuf(st.disc); st.disc = []; st.reshufN = (st.reshufN || 0) + 1; }
  return st.deck.length ? st.deck.pop() : -1;
}
function refillFace(st, ctx) {
  for (let i = 0; i < 5; i++) if (st.face[i] < 0) st.face[i] = drawCard(st);
  for (let k = 0; k < 4; k++) {
    if (st.face.filter(c => c === LOCO).length < 3) break;
    const avail = st.deck.concat(st.disc).filter(c => c !== LOCO).length;
    if (avail < 3) break;
    st.face.forEach(c => { if (c >= 0) st.disc.push(c); });
    st.face = st.face.map(() => drawCard(st));
    st.faceN++;
    if (ctx) ctx.emit({ t: 'reface' }, '🔄 Açıkta 3 lokomotif vardı: açık kartlar yenilendi.');
  }
}
function canDrawAny(st, second) {
  if (st.deck.length || st.disc.length) return true;
  return st.face.some(c => c >= 0 && !(second && c === LOCO));
}

/* ---------- hat alma kuralları ---------- */
// null → alınabilir, yoksa nedeni
function claimBlock(st, pi, r) {
  const M = gm(st), R = M.routes[r]; if (!R) return 'Hat yok';
  if (st.own[r] >= 0) return st.own[r] === pi ? 'Bu hat zaten senin' : `Bu hat ${pn(st, st.own[r])} oyuncusunun`;
  if (R.tw >= 0 && st.own[R.tw] >= 0) {
    if (st.own[R.tw] === pi) return 'Çift hattın ikisini birden alamazsın';
    if (st.players.length < 4) return '2–3 oyuncuda çift hattın yalnız biri kullanılır';
  }
  if (st.players[pi].trains < R.len) return 'Yeterli vagonun yok';
  return null;
}
// ödeme geçerli mi? → kullanılan renk (-1: yalnızca lokomotif) ya da null
function payColor(R, pay, hand, len, minLoco) {
  if (!Array.isArray(pay) || pay.length !== 9) return null;
  for (let i = 0; i < 9; i++) { if (!Number.isInteger(pay[i]) || pay[i] < 0 || pay[i] > hand[i]) return null; }
  if (sum(pay) !== len || pay[LOCO] < (minLoco || 0)) return null;
  const used = []; for (let i = 0; i < 8; i++) if (pay[i]) used.push(i);
  if (used.length > 1) return null;
  if (used.length === 1 && R && R.c !== GREY && used[0] !== R.c) return null;
  return used.length ? used[0] : -1;
}
// eldeki kartlarla olası ödemeler (en az lokomotif önce)
function payOptions(hand, R, len, minLoco) {
  len = len || R.len; minLoco = minLoco || 0;
  const out = [], cols = R && R.c !== GREY ? [R.c] : [0, 1, 2, 3, 4, 5, 6, 7];
  cols.forEach(c => {
    const use = Math.min(hand[c], len - minLoco), L = len - use;
    if (use > 0 && L <= hand[LOCO]) { const p = zero(); p[c] = use; p[LOCO] = L; out.push({ c, pay: p, L }); }
  });
  if (hand[LOCO] >= len && len >= minLoco) { const p = zero(); p[LOCO] = len; out.push({ c: -1, pay: p, L: len }); }
  out.sort((a, b) => a.L - b.L || (a.c >= 0 && b.c >= 0 ? (hand[a.c] - a.pay[a.c]) - (hand[b.c] - b.pay[b.c]) : 0));
  return out;
}
function stationCost(p) { return STATIONS - p.st + 1; }

/* ---------- bilet ve hat hesapları ---------- */
function uf(n) { const p = Array.from({ length: n }, (_, i) => i); const f = x => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; }; return { f, u: (a, b) => { p[f(a)] = f(b); } }; }
function connected(st, pi, extra) {
  const M = gm(st), U = uf(M.cities.length);
  st.own.forEach((o, r) => { if (o === pi) U.u(M.routes[r].a, M.routes[r].b); });
  (extra || []).forEach(r => U.u(M.routes[r].a, M.routes[r].b));
  return U;
}
function ticketDone(st, pi, tid, U) { const M = gm(st), t = M.tickets[tid]; U = U || connected(st, pi); return U.f(t.a) === U.f(t.b); }
// en uzun kesintisiz hat (her hat bir kez)
function longestPath(st, pi) {
  const M = gm(st), mine = []; st.own.forEach((o, r) => { if (o === pi) mine.push(r); });
  if (!mine.length) return { len: 0, path: [] };
  const adj = {}; mine.forEach(r => { const R = M.routes[r]; (adj[R.a] = adj[R.a] || []).push(r); (adj[R.b] = adj[R.b] || []).push(r); });
  let best = 0, bestPath = [], steps = 0;
  const used = new Set(), cur = [];
  const dfs = (u, len) => {
    if (len > best) { best = len; bestPath = cur.slice(); }
    if (++steps > 200000) return;
    for (const r of adj[u] || []) {
      if (used.has(r)) continue;
      const R = M.routes[r]; used.add(r); cur.push(r);
      dfs(R.a === u ? R.b : R.a, len + R.len);
      used.delete(r); cur.pop();
    }
  };
  Object.keys(adj).forEach(u => dfs(+u, 0));
  return { len: best, path: bestPath };
}
// istasyonların en iyi kullanımı: her istasyon şehrine bağlı bir rakip hattı ödünç alır
function bestStations(st, pi) {
  const M = gm(st), p = st.players[pi];
  const cities = []; (st.stations || []).forEach((o, c) => { if (o === pi) cities.push(c); });
  const tix = p.tickets;
  const score = extra => { const U = connected(st, pi, extra); let s = 0, d = 0; tix.forEach(t => { if (ticketDone(st, pi, t, U)) { s += M.tickets[t].p; d++; } else s -= M.tickets[t].p; }); return { s, d }; };
  let best = { extra: [], ...score([]) };
  if (!cities.length) return best;
  const opts = cities.map(c => [-1].concat(M.adj[c].filter(r => st.own[r] >= 0 && st.own[r] !== pi)));
  const rec = (k, acc) => {
    if (k === opts.length) { const ex = acc.filter(r => r >= 0); const s = score(ex); if (s.s > best.s) best = { extra: ex, ...s }; return; }
    opts[k].forEach(r => rec(k + 1, acc.concat([r])));
  };
  rec(0, []);
  return best;
}
// oyuncu için kalan en kısa yol (kendi hatları 0, boş hatlar uzunluk, rakipler kapalı)
function costFn(st, pi, planned) {
  const n = st.players.length;
  return R => {
    const o = st.own[R.id];
    if (o === pi) return 0;
    if (o >= 0) return Infinity;
    if (R.tw >= 0 && st.own[R.tw] >= 0 && (st.own[R.tw] === pi || n < 4)) return Infinity;
    if (planned && planned.has(R.id)) return 0.01;
    return R.len + (R.t ? .6 : 0) + (R.f ? .4 * R.f : 0);
  };
}
function ticketStatus(st, pi, tid) {
  const M = gm(st), t = M.tickets[tid];
  if (ticketDone(st, pi, tid)) {
    // tamamlanmış yolu bul (yalnız kendi hatları)
    const d = dijkstra(M, t.a, R => (st.own[R.id] === pi ? R.len : Infinity));
    return { done: true, left: 0, path: pathRoutes(M, d.via, t.a, t.b) || [] };
  }
  const d = dijkstra(M, t.a, costFn(st, pi));
  if (!(d.dist[t.b] < Infinity)) return { done: false, left: -1, path: [] };
  const path = pathRoutes(M, d.via, t.a, t.b) || [];
  return { done: false, left: path.reduce((s, r) => s + (st.own[r] === pi ? 0 : M.routes[r].len), 0), path };
}

/* ---------- oyun akışı ---------- */
function sched(st, ctx, ms, fn) { const s = ++st.seq; ctx.later(T(ms), () => { if (st.seq === s) fn(st, ctx); }); }
function startPlay(st, ctx) {
  st.phase = 'play'; st.cur = 0; st.drew = 0; st.sub = null; st.turnN = 1;
  ctx.emit({ t: 'start' }, `🚂 Biletler seçildi. İlk sıra ${pn(st, 0)} oyuncusunda!`, 'gold');
  ctx.emit({ t: 'turn', pi: 0 });
  ctx.sync();
}
function endTurn(st, ctx) {
  const p = st.players[st.cur];
  st.drew = 0; st.sub = null; st.tunnel = null;
  if (st.left > 0) {
    st.left--;
    if (st.left === 0) { finish(st, ctx); return; }
  } else if (st.final < 0 && p.trains <= 2) {
    st.final = st.cur; st.left = st.players.length;
    ctx.emit({ t: 'final', pi: st.cur }, `🏁 ${p.name} vagonlarını bitirmek üzere (${p.trains})! Herkesin bir son turu kaldı.`, 'gold');
  }
  st.cur = (st.cur + 1) % st.players.length; st.turnN++;
  ctx.emit({ t: 'turn', pi: st.cur });
  ctx.sync();
}
function completeClaim(st, ctx, pi, r, pay) {
  const M = gm(st), R = M.routes[r], p = st.players[pi];
  for (let i = 0; i < 9; i++) { p.hand[i] -= pay[i]; for (let k = 0; k < pay[i]; k++) st.disc.push(i); }
  st.own[r] = pi; p.trains -= R.len; p.score += PTS[R.len]; p.nRoutes++;
  st.claimN++;
  const kind = R.f ? ' (feribot)' : R.t ? ' (tünel)' : '';
  ctx.emit({ t: 'claim', pi, r, len: R.len, pts: PTS[R.len], pay: pay.slice(), k: st.claimN }, `🚆 ${p.name} ${routeName(M, R)} hattını aldı${kind}: ${R.len} vagon, +${PTS[R.len]} puan.`, R.len >= 5 ? 'gold' : 'good');
  st.passes = 0;
  endTurn(st, ctx);
}
function finish(st, ctx) {
  const M = gm(st), n = st.players.length;
  const rows = st.players.map((p, pi) => {
    const bs = st.opt.ist ? bestStations(st, pi) : { extra: [] };
    const U = connected(st, pi, bs.extra);
    const tix = p.tickets.map(id => { const t = M.tickets[id]; const done = U.f(t.a) === U.f(t.b); return { id, a: t.a, b: t.b, p: t.p, done }; });
    const lp = longestPath(st, pi);
    return { pi, route: p.score, tix, tixPts: tix.reduce((s, t) => s + (t.done ? t.p : -t.p), 0), done: tix.filter(t => t.done).length, long: lp.len, longPath: lp.path,
      borrowed: bs.extra, stLeft: st.opt.ist ? p.st : 0, stPts: st.opt.ist ? p.st * ST_BONUS : 0, longBonus: 0, gez: 0 };
  });
  const maxL = Math.max(...rows.map(r => r.long));
  if (maxL > 0) rows.forEach(r => { if (r.long === maxL) r.longBonus = LONG_BONUS; });
  const maxD = Math.max(...rows.map(r => r.done));
  if (st.opt.gez && maxD > 0) rows.forEach(r => { if (r.done === maxD) r.gez = GEZ_BONUS; });
  rows.forEach(r => { r.total = r.route + r.tixPts + r.longBonus + r.gez + r.stPts; });
  const order = rows.slice().sort((a, b) => b.total - a.total || b.done - a.done || b.longBonus - a.longBonus || b.long - a.long).map(r => r.pi);
  st.res = { rows, order, maxL, maxD };
  st.phase = 'over'; st.sub = null; st.tunnel = null; st.endN = Date.now();
  const w = st.players[order[0]];
  ctx.emit({ t: 'end' }, `🏆 Oyun bitti! Biletler açılıyor… Kazanan: ${w.name} (${rows[order[0]].total} puan).`, 'gold');
  ctx.sync();
  sched(st, ctx, scoreDur(st.res), (s, c) => c.end(result(s)));
}
function scoreDur(res) { const nt = res.rows.reduce((s, r) => s + r.tix.length, 0); return Math.min(26000, 1600 + nt * 650 + res.rows.length * 500 + 2600); }
function result(st) {
  const r = st.res, M = gm(st);
  const lw = r.rows.filter(x => x.longBonus).map(x => pn(st, x.pi));
  const gw = r.rows.filter(x => x.gez).map(x => pn(st, x.pi));
  const note = [`🛤️ En Uzun Hat: ${lw.length ? `${lw.join(', ')} (${r.maxL} vagon, +${LONG_BONUS})` : '—'}`];
  if (st.opt.gez) note.push(`🧭 Gezgin: ${gw.length ? `${gw.join(', ')} (${r.maxD} bilet, +${GEZ_BONUS})` : '—'}`);
  note.push('Puan = hatlar + tamamlanan biletler − kalan biletler' + (st.opt.ist ? ' + kullanılmayan istasyonlar' : '') + ' + bonuslar.');
  void M;
  return {
    title: `${pn(st, r.order[0])} kazandı!`,
    ranking: r.order.map(pi => { const x = r.rows[pi]; return { pi, score: x.total, label: `${x.total} puan · ${x.done}/${x.tix.length} bilet` }; }),
    note: note.join(' · ')
  };
}

function hasMove(st, pi) {
  const M = gm(st), p = st.players[pi];
  if (canDrawAny(st, false) || st.tdeck.length) return true;
  if (M.routes.some(R => !claimBlock(st, pi, R.id) && payOptions(p.hand, R, R.len, R.f).length)) return true;
  if (st.opt.ist && p.st > 0 && st.stations.some(o => o < 0) && payOptions(p.hand, null, stationCost(p), 0).length) return true;
  return false;
}

/* ------------------------------------------------------------------ bilgisayar */
// biletler için ortak plan: hatlar paylaşılır, vagon bütçesini aşan biletler bırakılır
function planTickets(st, pi, tids, budget) {
  const M = gm(st), planned = new Set(), U = connected(st, pi);
  const need = new Map(), res = [];
  let cost = 0;
  tids.slice().sort((a, b) => M.tickets[b].p - M.tickets[a].p).forEach(tid => {
    const t = M.tickets[tid];
    if (U.f(t.a) === U.f(t.b)) { res.push({ tid, ok: true, done: true, cost: 0 }); return; }
    const d = dijkstra(M, t.a, costFn(st, pi, planned));
    if (!(d.dist[t.b] < Infinity)) { res.push({ tid, ok: false }); return; }
    const path = pathRoutes(M, d.via, t.a, t.b) || [];
    const fresh = path.filter(r => st.own[r] !== pi && !planned.has(r));
    const c = fresh.reduce((s, r) => s + M.routes[r].len, 0);
    if (cost + c > budget) { res.push({ tid, ok: false, cost: c }); return; }
    cost += c;
    path.forEach(r => { if (st.own[r] !== pi) { planned.add(r); need.set(r, (need.get(r) || 0) + t.p); } });
    res.push({ tid, ok: true, cost: c, path });
  });
  return { need, cost, res };
}
function botKeep(st, pi, ids, min) {
  const M = gm(st), p = st.players[pi];
  const budget = st.phase === 'pick0' ? 36 : Math.max(0, p.trains - 2);
  let best = null;
  for (let mask = 1; mask < (1 << ids.length); mask++) {
    const sub = ids.filter((_, k) => mask & (1 << k)); if (sub.length < min) continue;
    const pl = planTickets(st, pi, p.tickets.concat(sub), budget);
    let v = 0;
    pl.res.forEach(x => { const t = M.tickets[x.tid]; if (!sub.includes(x.tid)) return; v += x.ok ? t.p : -t.p * 1.1; });
    v -= pl.cost * .12;
    if (!best || v > best.v + 1e-9) best = { v, sub };
  }
  return best ? best.sub : ids.slice(0, min);
}
function demandOf(st, pi, need) {
  const M = gm(st), dem = zero(); let grey = 0;
  need.forEach((w, r) => { const R = M.routes[r]; if (R.c === GREY) grey += R.len - R.f; else dem[R.c] += R.len - R.f; dem[LOCO] += R.f; });
  return { dem, grey };
}
function botPay(st, pi, R, opts, dem, len) {
  const p = st.players[pi]; len = len || R.len;
  let best = null, bs = 1e9;
  opts.forEach(o => {
    let s = o.L * 3;
    if (o.c >= 0) { const left = p.hand[o.c] - o.pay[o.c]; const other = Math.max(0, dem[o.c] - (R.c === o.c ? len : 0)); s += Math.max(0, other - left) * .8 - Math.min(left, 3) * .05; }
    if (s < bs) { bs = s; best = o; }
  });
  return best;
}
const spareFor = (p, o) => (o.c >= 0 ? p.hand[o.c] - o.pay[o.c] : 0) + p.hand[LOCO] - o.pay[LOCO];
function botMove(st, pi) {
  const M = gm(st), p = st.players[pi], n = st.players.length;
  const late = st.final >= 0 || st.players.some(q => q.trains <= 6) || p.trains <= 8;
  const plan = planTickets(st, pi, p.tickets, p.trains);
  const { dem, grey } = demandOf(st, pi, plan.need);
  const second = st.drew > 0;
  const drawPick = () => {
    // açık kartlardan ihtiyaç duyulanı seç
    let bi = -1, bs = 0;
    st.face.forEach((c, i) => {
      if (c < 0) return;
      if (c === LOCO) return;
      let s = Math.max(0, dem[c] - p.hand[c]) * 2;
      if (!s && grey > 0) s = .5 + p.hand[c] * .3;
      if (s > bs) { bs = s; bi = i; }
    });
    if (bi >= 0) return { t: 'draw', i: bi };
    if (!second) {
      const li = st.face.indexOf(LOCO);
      const deficit = [0, 1, 2, 3, 4, 5, 6, 7].reduce((s, c) => s + Math.max(0, dem[c] - p.hand[c]), 0) + Math.max(0, dem[LOCO] - p.hand[LOCO]);
      if (li >= 0 && (deficit >= 4 || dem[LOCO] > p.hand[LOCO]) && Math.random() < .7) return { t: 'draw', i: li };
    }
    if (st.deck.length || st.disc.length) return { t: 'draw', i: -1 };
    const any = st.face.findIndex(c => c >= 0 && !(second && c === LOCO));
    return any >= 0 ? { t: 'draw', i: any } : null;
  };
  if (second) return drawPick();
  // 1) planlanan hatlardan alınabilecek olanı al
  const cands = [];
  plan.need.forEach((w, r) => {
    if (claimBlock(st, pi, r)) return;
    const R = M.routes[r], opts = payOptions(p.hand, R, R.len, R.f); if (!opts.length) return;
    const o = botPay(st, pi, R, opts, dem);
    if (R.t && spareFor(p, o) < 1 && !late) return;
    cands.push({ r, pay: o.pay, s: w * .6 + R.len * 3 - o.L * 1.5 + (R.t ? -1 : 0) });
  });
  if (cands.length) {
    // tehlike: rakipler aynı bölgedeyse kritik hattı önce al
    cands.forEach(c => {
      const R = M.routes[c.r];
      const blockedCost = R2 => (R2.id === c.r ? Infinity : costFn(st, pi)(R2));
      const t = plan.res.find(x => x.path && x.path.includes(c.r));
      if (t) {
        const tk = M.tickets[t.tid], d = dijkstra(M, tk.a, blockedCost);
        const alt = d.dist[tk.b], base = dijkstra(M, tk.a, costFn(st, pi)).dist[tk.b];
        c.s += alt < Infinity ? Math.min(12, (alt - base) * 1.5) : 16;
      }
      const near = st.own.some((o, r2) => o >= 0 && o !== pi && (M.routes[r2].a === R.a || M.routes[r2].b === R.a || M.routes[r2].a === R.b || M.routes[r2].b === R.b));
      if (near) c.s += 3;
    });
    cands.sort((a, b) => b.s - a.s);
    return { t: 'claim', r: cands[0].r, pay: cands[0].pay };
  }
  // 2) oyun sonu: elde kalan kartlarla puan topla
  const anyClaim = (minLen, avoidDem) => {
    let best = null, bs = -1;
    M.routes.forEach(R => {
      if (R.len < minLen || claimBlock(st, pi, R.id)) return;
      const opts = payOptions(p.hand, R, R.len, R.f); if (!opts.length) return;
      const o = botPay(st, pi, R, opts, avoidDem ? dem : zero());
      if (R.t && spareFor(p, o) < 1 && !late) return;
      if (avoidDem && o.c >= 0 && dem[o.c] > p.hand[o.c] - o.pay[o.c]) return;
      const s = PTS[R.len] * 2 - o.L * 2 + (R.t ? -2 : 0);
      if (s > bs) { bs = s; best = { t: 'claim', r: R.id, pay: o.pay }; }
    });
    return best;
  };
  if (late) { const c = anyClaim(1, false); if (c) return c; }
  const openOk = plan.res.filter(x => x.ok && !x.done).length;
  if (!openOk) {
    if (p.trains >= 12 && st.tdeck.length && st.final < 0 && !st.players.some(q => q.trains <= 10)) return { t: 'tickets' };
    const c = anyClaim(p.trains > 20 ? 3 : 1, false); if (c) return c;
  } else if (sum(p.hand) >= 16) { const c = anyClaim(3, true); if (c) return c; }
  const d = drawPick(); if (d) return d;
  if (st.tdeck.length && st.final < 0) return { t: 'tickets' };
  return anyClaim(1, false);
}
function tunnelPay(st, pi) {
  const tn = st.tunnel, p = st.players[pi]; if (!tn) return null;
  const rest = p.hand.map((x, i) => x - tn.pay[i]), pay = zero();
  let need = tn.extra;
  if (tn.col >= 0) { const u = Math.min(rest[tn.col], need); pay[tn.col] = u; need -= u; }
  const l = Math.min(rest[LOCO], need); pay[LOCO] = l; need -= l;
  return need > 0 ? null : pay;
}

/* ------------------------------------------------------------------ oyun tanımı */
DEF = {
  id: 'biletyolu', name: 'Bilet Yolu', icon: '🚂', color: '#ff6b3d', min: 2, max: 5, hotseat: true, bot: true, localMin: 1,
  tagline: 'Türkiye’yi raylarla bağla, biletlerini tamamla',
  rules: 'Sıranda ya 2 vagon kartı çek (açık lokomotif tek başına sayılır), ya aynı renkte kartlar ödeyip iki şehir arasındaki hattı al, ya da yeni bilet çek. Feribot hatları lokomotif ister, tünelde açılan 3 karttan eşleşen kadar ek ödeme yaparsın. Hatlar uzunluğuna göre puan getirir; oyun sonunda tamamlanan biletler eklenir, tamamlanamayanlar düşülür, en uzun kesintisiz hat +10 alır.',
  options: [
    { key: 'gezgin', label: 'Gezgin bonusu', def: 'acik', choices: [{ v: 'acik', label: 'Açık (+15)' }, { v: 'kapali', label: 'Kapalı' }] },
    { key: 'istasyon', label: 'İstasyonlar', def: 'kapali', choices: [{ v: 'kapali', label: 'Kapalı' }, { v: 'acik', label: 'Açık (3 adet)' }] }
  ],
  speed: 1,
  get botDelay() { return T(850); },
  setup(players, opts) {
    opts = opts || {};
    const st = {
      v: 1, map: 'tr', opt: { gez: opts.gezgin !== 'kapali', ist: opts.istasyon === 'acik' },
      deck: [], disc: [], face: [-1, -1, -1, -1, -1], tdeck: [], own: [], stations: [],
      players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot, hand: zero(), tickets: [], pick: null, trains: TRAINS, st: STATIONS, score: 0, nRoutes: 0 })),
      phase: 'pick0', cur: 0, drew: 0, sub: null, tunnel: null, final: -1, left: 0, turnN: 0, seq: 0,
      claimN: 0, drawN: 0, tunnelN: 0, faceN: 0, reshufN: 0, passes: 0, res: null
    };
    const M = gm(st);
    for (let c = 0; c < 8; c++) for (let k = 0; k < PER_COLOR; k++) st.deck.push(c);
    for (let k = 0; k < N_LOCO; k++) st.deck.push(LOCO);
    st.deck = shuf(st.deck);
    st.own = Array(M.routes.length).fill(-1);
    st.stations = Array(M.cities.length).fill(-1);
    st.tdeck = shuf(M.tickets.map(t => t.id));
    st.players.forEach(p => { for (let k = 0; k < 4; k++) p.hand[drawCard(st)]++; });
    refillFace(st, null);
    st.players.forEach(p => { p.pick = { ids: st.tdeck.splice(0, 3), min: 2 }; });
    return st;
  },
  action(st, pi, a, ctx) {
    if (!a || typeof a.t !== 'string' || st.phase === 'over') return false;
    const p = st.players[pi]; if (!p) return false;
    const M = gm(st);
    if (a.t === 'keep') {
      if (!p.pick) return false;
      if (st.phase === 'play' && (pi !== st.cur || st.sub !== 'pick')) return false;
      if (!Array.isArray(a.ids)) return false;
      const ids = [...new Set(a.ids.map(x => x | 0))];
      if (ids.length < p.pick.min || ids.some(id => !p.pick.ids.includes(id))) return false;
      const back = p.pick.ids.filter(id => !ids.includes(id));
      p.tickets.push(...ids); st.tdeck.push(...back); p.pick = null;
      ctx.emit({ t: 'keep', pi, n: ids.length, back: back.length }, `🎫 ${p.name} ${ids.length} bilet tuttu${back.length ? `, ${back.length} bileti geri verdi` : ''}.`);
      if (st.phase === 'pick0') { if (st.players.every(q => !q.pick)) startPlay(st, ctx); else ctx.sync(); return true; }
      st.passes = 0; endTurn(st, ctx); return true;
    }
    if (st.phase !== 'play' || pi !== st.cur) return false;
    if (st.sub === 'tunnel') {
      const tn = st.tunnel;
      if (a.t === 'tno') {
        tn.drawn.forEach(c => st.disc.push(c));
        ctx.emit({ t: 'tno', pi, r: tn.r }, `⛰️ ${p.name} tünelin ek bedelini ödemedi; hat boş kaldı.`, 'bad');
        endTurn(st, ctx); return true;
      }
      if (a.t === 'tpay') {
        const rest = p.hand.map((x, i) => x - tn.pay[i]);
        const col = payColor(null, a.pay, rest, tn.extra, 0);
        if (col === null || (tn.col === -1 ? col !== -1 : (col !== -1 && col !== tn.col))) return false;
        tn.drawn.forEach(c => st.disc.push(c));
        completeClaim(st, ctx, pi, tn.r, tn.pay.map((x, i) => x + a.pay[i])); return true;
      }
      return false;
    }
    if (st.sub === 'pick') return false;
    switch (a.t) {
      case 'draw': {
        const i = a.i == null ? -1 : a.i | 0;
        let c;
        if (i === -1) { c = drawCard(st); if (c < 0) return false; }
        else { if (i < 0 || i > 4) return false; c = st.face[i]; if (c < 0 || (c === LOCO && st.drew > 0)) return false; st.face[i] = -1; }
        p.hand[c]++; st.drew += (i >= 0 && c === LOCO) ? 2 : 1; st.drawN++;
        ctx.emit({ t: 'draw', pi, i, c: i >= 0 ? c : -1, k: st.drawN }, i >= 0 ? `${p.name} açıktan ${CN[c]} aldı${c === LOCO ? ' (tüm sıra)' : ''}.` : `${p.name} desteden kart çekti.`);
        if (i >= 0) refillFace(st, ctx);
        st.passes = 0;
        if (st.drew >= 2 || !canDrawAny(st, true)) { endTurn(st, ctx); return true; }
        ctx.sync(); return true;
      }
      case 'claim': {
        if (st.drew) return false;
        const r = a.r | 0, R = M.routes[r]; if (!R || claimBlock(st, pi, r)) return false;
        const col = payColor(R, a.pay, p.hand, R.len, R.f); if (col === null) return false;
        if (R.t) {
          const drawn = []; for (let k = 0; k < 3; k++) { const c = drawCard(st); if (c >= 0) drawn.push(c); }
          const extra = drawn.filter(c => c === LOCO || (col >= 0 && c === col)).length;
          st.tunnelN++;
          ctx.emit({ t: 'tunnel', pi, r, drawn, extra, k: st.tunnelN }, `⛰️ ${p.name} ${routeName(M, R)} tünelini deniyor: ${drawn.length ? drawn.map(c => CN[c]).join(', ') : 'kart yok'} → ${extra ? `${extra} ek kart` : 'ek bedel yok'}.`, extra ? '' : 'good');
          if (!extra) { drawn.forEach(c => st.disc.push(c)); completeClaim(st, ctx, pi, r, a.pay); return true; }
          st.sub = 'tunnel'; st.tunnel = { r, pay: a.pay.slice(), col, drawn, extra };
          ctx.sync(); return true;
        }
        completeClaim(st, ctx, pi, r, a.pay); return true;
      }
      case 'tickets': {
        if (st.drew || !st.tdeck.length) return false;
        const ids = st.tdeck.splice(0, 3);
        p.pick = { ids, min: 1 }; st.sub = 'pick';
        ctx.emit({ t: 'tdraw', pi, n: ids.length }, `🎫 ${p.name} ${ids.length} yeni bilet çekti.`);
        ctx.sync(); return true;
      }
      case 'station': {
        if (!st.opt.ist || st.drew || p.st <= 0) return false;
        const c = a.c | 0; if (!M.cities[c] || st.stations[c] >= 0) return false;
        const col = payColor(null, a.pay, p.hand, stationCost(p), 0); if (col === null) return false;
        for (let i = 0; i < 9; i++) { p.hand[i] -= a.pay[i]; for (let k = 0; k < a.pay[i]; k++) st.disc.push(i); }
        st.stations[c] = pi; p.st--;
        ctx.emit({ t: 'station', pi, c }, `🚉 ${p.name} ${M.cities[c].n} şehrine istasyon kurdu.`, 'good');
        st.passes = 0; endTurn(st, ctx); return true;
      }
      case 'pass': {
        if (st.drew ? canDrawAny(st, true) : hasMove(st, pi)) return false;
        st.passes++;
        ctx.emit({ t: 'pass', pi }, `${p.name} pas geçti (yapacak hamle yok).`);
        if (st.passes >= st.players.length * 2) { finish(st, ctx); return true; }
        endTurn(st, ctx); return true;
      }
      default: return false;
    }
  },
  view(st, viewer) {
    const over = st.phase === 'over', RG = CFX.Room && CFX.Room.game;
    const vis = i => viewer === 'all' || viewer === i || over;
    return {
      map: st.map, opt: st.opt, own: st.own.slice(), stations: st.stations.slice(),
      face: st.face.slice(), deckN: st.deck.length, discN: st.disc.length, tdeckN: st.tdeck.length,
      players: st.players.map((p, i) => ({
        name: p.name, color: p.color, isBot: p.isBot, online: RG && RG.players[i] ? RG.players[i].online !== false : true,
        trains: p.trains, st: p.st, score: p.score, nRoutes: p.nRoutes, handN: sum(p.hand), tixN: p.tickets.length, picking: !!p.pick, pickN: p.pick ? p.pick.ids.length : 0,
        hand: vis(i) ? p.hand.slice() : null, tickets: vis(i) ? p.tickets.slice() : null, pick: vis(i) && p.pick ? { ids: p.pick.ids.slice(), min: p.pick.min } : null
      })),
      phase: st.phase, cur: st.cur, drew: st.drew, sub: st.sub, turn: DEF.turnOf(st),
      tunnel: st.tunnel ? { r: st.tunnel.r, col: st.tunnel.col, drawn: st.tunnel.drawn.slice(), extra: st.tunnel.extra, pay: st.tunnel.pay.slice() } : null,
      final: st.final, left: st.left, turnN: st.turnN, res: over ? st.res : null, claimN: st.claimN, drawN: st.drawN, endDur: over && st.res ? T(scoreDur(st.res)) : 0
    };
  },
  turnOf(st) {
    if (st.phase === 'pick0') {
      const pend = st.players.map((p, i) => (p.pick ? i : -1)).filter(i => i >= 0);
      if (!pend.length) return null;
      return pend.find(i => st.players[i].isBot) ?? pend.find(i => !isOn(i)) ?? pend[0];
    }
    return st.phase === 'play' ? st.cur : null;
  },
  botAct(st, pi, ctx) {
    if (st.phase === 'over' || DEF.turnOf(st) !== pi) return;
    const act = a => DEF.action(st, pi, a, ctx);
    const p = st.players[pi];
    if (p.pick) {
      if (act({ t: 'keep', ids: botKeep(st, pi, p.pick.ids, p.pick.min) })) return;
      act({ t: 'keep', ids: p.pick.ids.slice() }); return;
    }
    if (st.sub === 'tunnel') { const pay = tunnelPay(st, pi); if (pay && act({ t: 'tpay', pay })) return; act({ t: 'tno' }); return; }
    let mv = null; try { mv = botMove(st, pi); } catch (e) { console.error(e); }
    if (mv && act(mv)) return;
    if (act({ t: 'draw', i: -1 })) return;
    for (let i = 0; i < 5; i++) if (act({ t: 'draw', i })) return;
    if (!st.drew && act({ t: 'tickets' })) return;
    const M = gm(st);
    for (const R of M.routes) { if (claimBlock(st, pi, R.id)) continue; const o = payOptions(p.hand, R, R.len, R.f)[0]; if (o && act({ t: 'claim', r: R.id, pay: o.pay })) return; }
    if (act({ t: 'pass' })) return;
    endTurn(st, ctx);
  },
  skipTurn(st, pi, ctx) {
    if (st.phase === 'over' || DEF.turnOf(st) !== pi) return;
    const p = st.players[pi];
    if (p.pick) { DEF.botAct(st, pi, ctx); return; }
    if (st.sub === 'tunnel') { DEF.action(st, pi, { t: 'tno' }, ctx); return; }
    for (let k = 0; k < 2; k++) {
      if (st.phase !== 'play' || st.cur !== pi) return;
      if (!DEF.action(st, pi, { t: 'draw', i: -1 }, ctx)) { DEF.botAct(st, pi, ctx); return; }
    }
  },
  onPresence(st, pi, on, ctx) { ctx.sync(); },
  resume(st, ctx) {
    if (st.phase === 'over' && st.res) sched(st, ctx, 1500, (s, c) => c.end(result(s)));
  },
  _t: { gm, buildMap, dijkstra, pathRoutes, claimBlock, payColor, payOptions, connected, ticketDone, longestPath, bestStations, ticketStatus, planTickets, botKeep, botMove, tunnelPay,
    endTurn, finish, result, refillFace, drawCard, hasMove, PTS, LOCO, CN }
};

/* ------------------------------------------------------------------ arayüz */
const fine = () => { try { return matchMedia('(pointer: fine)').matches; } catch (e) { return false; } };
const isDesk = () => innerWidth >= 900;
const f1 = x => (Math.round(x * 10) / 10).toString();
let root = null, ui = null, V = null, E = {}, cam = null, drag = null, pointers = new Map(), moved = false, mapKey = '', firstRender = true;
let sel = null, draft = null, tixHi = -1, hlColor = -1, lastHuman = -1, curtainOK = -1, tixOpen = false, labelK = -1, scoreRun = null, newRoutes = new Map(), pickSel = null, pickKey = '', tunSel = null, resizeT = 0, lastHand = null, timers = [];
const GEO = {};
const later = (ms, fn) => { const id = setTimeout(() => { timers = timers.filter(x => x !== id); if (root) fn(); }, ms); timers.push(id); };

/* ---------- görüş: kimin gözünden ---------- */
const humans = v => v.players.map((p, i) => (p.isBot ? -1 : i)).filter(i => i >= 0);
const multiHot = v => ui.mode === 'local' && humans(v).length > 1;
function actor(v) {
  const t = v.turn; if (t == null || !v.players[t]) return -1;
  if (ui.mode === 'local') return v.players[t].isBot ? -1 : t;
  return ui.me === t ? t : -1;
}
function pendingPick(v) {
  if (v.phase === 'pick0') {
    if (ui.mode === 'local') { const t = v.turn; return t != null && !v.players[t].isBot ? t : -1; }
    return v.players[ui.me] && v.players[ui.me].picking ? ui.me : -1;
  }
  if (v.phase === 'play' && v.sub === 'pick') { const a = actor(v); return a === v.cur ? a : -1; }
  return -1;
}
function viewerPi(v) {
  if (ui.mode !== 'local') return ui.me;
  const pp = pendingPick(v); if (pp >= 0) { lastHuman = pp; return pp; }
  const a = actor(v); if (a >= 0) { lastHuman = a; return a; }
  if (lastHuman >= 0 && v.players[lastHuman] && !v.players[lastHuman].isBot) return lastHuman;
  const h = humans(v); return h.length ? h[0] : -1;
}
const myTurn = v => { const a = actor(v); return v.phase === 'play' && a >= 0 && a === v.cur; };
const veiled = v => multiHot(v) && v.phase !== 'over' && viewerPi(v) !== curtainOK;
const send = (a, as) => { Sound.init(); if (ui.mode === 'local' && as != null && as >= 0) a.as = as; ui.send(a); };
const shortName = p => (p.isBot ? p.name.replace(/^Bilgisayar/, 'Bot') : p.name);

/* ---------- ses ---------- */
function whistle() {
  try {
    if (!Sound.ok || !Sound.ok('btwhistle', 700)) return;
    [523, 659, 784].forEach(fq => { Sound.tone(fq * .93, .5, { type: 'triangle', gain: .075, slide: fq, attack: .06 }); Sound.tone(fq, .5, { type: 'triangle', gain: .065, when: .56, attack: .04 }); });
    Sound.noise(.45, { freq: 2400, q: 1.4, gain: .1, decayPow: 1 }); Sound.noise(.45, { freq: 2400, q: 1.4, gain: .09, when: .56, decayPow: 1 });
  } catch (e) { /* ses yok */ }
}
function chuff(k) { try { if (Sound.ok && Sound.ok('btchuff' + (k % 2), 60)) Sound.noise(.1, { filter: 'lowpass', freq: 700 + (k % 3) * 120, q: .7, gain: .38 }); } catch (e) { /* */ } }
function cardSnd() { try { if (Sound.ok && Sound.ok('btcard', 50)) { Sound.noise(.06, { freq: 3200, q: 1, gain: .3 }); Sound.tone(420, .06, { type: 'triangle', gain: .08 }); } } catch (e) { /* */ } }

/* ---------- geometri ---------- */
function routeGeom(M, R) {
  const A = M.cities[R.a], B = M.cities[R.b];
  const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), nx = -dy / d, ny = dx / d, off = R.lane * 7;
  const ax = A.x + nx * off, ay = A.y + ny * off, bx = B.x + nx * off, by = B.y + ny * off;
  const cx = (ax + bx) / 2 + nx * R.bend * d * 2, cy = (ay + by) / 2 + ny * R.bend * d * 2;
  const q = t => [(1 - t) * (1 - t) * ax + 2 * (1 - t) * t * cx + t * t * bx, (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * cy + t * t * by];
  const S = 48, pts = [q(0)], acc = [0];
  for (let i = 1; i <= S; i++) { const p = q(i / S); acc.push(acc[i - 1] + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1])); pts.push(p); }
  const L = acc[S];
  const at = s => {
    let k = 0; while (k < S - 1 && acc[k + 1] < s) k++;
    const t = (s - acc[k]) / ((acc[k + 1] - acc[k]) || 1), p0 = pts[k], p1 = pts[k + 1];
    return [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * 180 / Math.PI];
  };
  const r0 = A.big ? 15 : 12.5, r1 = B.big ? 15 : 12.5, seg = (L - r0 - r1) / R.len, car = Math.max(9, seg - 3.4);
  const cars = []; for (let k = 0; k < R.len; k++) cars.push(at(r0 + seg * (k + .5)));
  return { cars, car, d: `M${f1(ax)},${f1(ay)} Q${f1(cx)},${f1(cy)} ${f1(bx)},${f1(by)}`, poly: pts.filter((_, i) => i % 4 === 0 || i === S), mid: at(L / 2), at, L, r0, r1 };
}
function geo(M) { return GEO[M.id] || (GEO[M.id] = { routes: M.routes.map(R => routeGeom(M, R)) }); }

/* ---------- statik harita sanatı ---------- */
function sPath(pts, closed) {
  const P = pts.map(([lo, la]) => [PX(lo), PY(la)]), n = P.length;
  let d = `M${f1(P[0][0])},${f1(P[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = closed ? P[(i - 1 + n) % n] : P[Math.max(0, i - 1)], p1 = P[i], p2 = P[(i + 1) % n], p3 = closed ? P[(i + 2) % n] : P[Math.min(n - 1, i + 2)];
    d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])},${f1(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}
const SYM = `
<symbol id="bt-mt" overflow="visible"><path d="M-15,7 L-4,-10 L0,-4 L5,-9 L15,7 Z" fill="#cfae74"/><path d="M-4,-10 L0,-4 L-2,7 L-15,7 Z" fill="#b38e55"/><path d="M5,-9 L15,7 L8,7 L3,-5 Z" fill="#bf9b62"/><path d="M-4,-10 L-7,-5 L-4,-6 L-2,-4 L0,-4 Z" fill="#f6ecd6"/><path d="M-15,7 H15" stroke="#9c7a44" stroke-width="1" opacity=".5"/></symbol>
<symbol id="bt-pk" overflow="visible"><ellipse cx="0" cy="8" rx="20" ry="3" fill="rgba(80,55,20,.18)"/><path d="M-20,8 L0,-20 L20,8 Z" fill="#b9935a"/><path d="M0,-20 L20,8 L4,8 Z" fill="#a07c46"/><path d="M0,-20 L-8,-8.6 L-4,-10 L-1,-7 L2,-10.5 L6,-8 Z" fill="#fffaf0"/></symbol>
<symbol id="bt-tr" overflow="visible"><rect x="-1" y="2" width="2" height="5" fill="#7a5a32"/><circle cx="0" cy="0" r="4.6" fill="#7aa652"/><circle cx="-1.4" cy="-1.4" r="2" fill="#94bf68"/><circle cx="6" cy="3" r="3.6" fill="#6b9748"/><rect x="5.3" y="5" width="1.5" height="3.5" fill="#7a5a32"/></symbol>`;
function staticSVG(M) {
  const A = M.art, b = M.box, X = 2600;
  const tr = sPath(A.thrace, true) + ' ' + sPath(A.anatolia, true) + ' ' + A.islandsTR.map(p => sPath(p, true)).join(' ');
  let h = `<defs>${SYM}
    <radialGradient id="bt-seag" cx="50%" cy="46%" r="72%"><stop offset="0" stop-color="#7cc5e3"/><stop offset=".6" stop-color="#4f9fcb"/><stop offset="1" stop-color="#2f78a8"/></radialGradient>
    <linearGradient id="bt-landg" x1="0" y1="0" x2=".25" y2="1"><stop offset="0" stop-color="#f6e8bf"/><stop offset="1" stop-color="#ecd598"/></linearGradient>
    <pattern id="bt-wave" width="54" height="30" patternUnits="userSpaceOnUse"><path d="M3,16 q6,-6 12,0 t12,0" stroke="rgba(255,255,255,.2)" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M31,5 q4,-3.5 8,0" stroke="rgba(255,255,255,.14)" stroke-width="1.3" fill="none" stroke-linecap="round"/></pattern>
    <pattern id="bt-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="7" stroke="rgba(110,90,55,.13)" stroke-width="2.4"/></pattern>
    <clipPath id="bt-clip"><path d="${tr}"/></clipPath>
    <radialGradient id="bt-gr1"><stop offset="0" stop-color="#9cc56f" stop-opacity=".75"/><stop offset="1" stop-color="#9cc56f" stop-opacity="0"/></radialGradient>
    <radialGradient id="bt-gr2"><stop offset="0" stop-color="#e0b56c" stop-opacity=".55"/><stop offset="1" stop-color="#e0b56c" stop-opacity="0"/></radialGradient>
    <radialGradient id="bt-gr3"><stop offset="0" stop-color="#c79a6a" stop-opacity=".45"/><stop offset="1" stop-color="#c79a6a" stop-opacity="0"/></radialGradient>
    <radialGradient id="bt-vig" cx="50%" cy="50%" r="75%"><stop offset=".62" stop-color="#0b2540" stop-opacity="0"/><stop offset="1" stop-color="#0b2540" stop-opacity=".45"/></radialGradient>
  </defs>`;
  h += `<rect x="${b.x - X}" y="${b.y - X}" width="${b.w + 2 * X}" height="${b.h + 2 * X}" fill="#2f78a8"/><rect x="${b.x - 80}" y="${b.y - 80}" width="${b.w + 160}" height="${b.h + 160}" fill="url(#bt-seag)"/><rect x="${b.x - X}" y="${b.y - X}" width="${b.w + 2 * X}" height="${b.h + 2 * X}" fill="url(#bt-wave)"/>`;
  // kıyı köpüğü
  h += `<path d="${tr}" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="22" stroke-linejoin="round"/><path d="${tr}" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="9" stroke-linejoin="round"/>`;
  A.foreign.forEach(p => { const d = sPath(p, true); h += `<path d="${d}" fill="#ddd2b4" stroke="#b5a47c" stroke-width="1.6"/><path d="${d}" fill="url(#bt-hatch)"/>`; });
  h += `<path d="${tr}" fill="url(#bt-landg)" stroke="#8d6b39" stroke-width="2.4" stroke-linejoin="round"/>`;
  // bölge renkleri
  const blob = (lon, lat, rx, ry, g) => `<ellipse cx="${f1(PX(lon))}" cy="${f1(PY(lat))}" rx="${rx}" ry="${ry}" fill="url(#${g})"/>`;
  h += `<g clip-path="url(#bt-clip)">${blob(33.5, 41.4, 330, 70, 'bt-gr1')}${blob(39.6, 40.9, 260, 60, 'bt-gr1')}${blob(27.6, 41.3, 120, 70, 'bt-gr1')}${blob(28.0, 38.6, 120, 140, 'bt-gr1')}${blob(31.5, 36.6, 170, 40, 'bt-gr1')}
    ${blob(33.4, 38.8, 230, 120, 'bt-gr2')}${blob(39.8, 37.2, 260, 70, 'bt-gr2')}${blob(42.5, 39.3, 190, 120, 'bt-gr3')}${blob(36.6, 39.6, 150, 90, 'bt-gr3')}</g>`;
  h += `<path d="${tr}" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1" transform="translate(1.2,1.6)" clip-path="url(#bt-clip)"/>`;
  A.rivers.forEach(p => { h += `<path d="${sPath(p, false)}" fill="none" stroke="#6fb3d8" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>`; });
  A.lakes.forEach(p => { h += `<path d="${sPath(p, true)}" fill="#6db5dc" stroke="#3f8dba" stroke-width="1.4"/>`; });
  const farCity = (x, y, m) => M.cities.every(c => Math.hypot(c.x - x, c.y - y) > m);
  A.trees.forEach(([lo, la]) => { const x = PX(lo), y = PY(la); if (farCity(x, y, 22)) h += `<use href="#bt-tr" transform="translate(${f1(x)},${f1(y)})"/>`; });
  A.mounts.forEach(([lo, la, s]) => { const x = PX(lo), y = PY(la); if (farCity(x, y, 24)) h += `<use href="#bt-mt" transform="translate(${f1(x)},${f1(y)}) scale(${s})"/>`; });
  A.peaks.forEach(([lo, la, s]) => { const x = PX(lo), y = PY(la); h += `<use href="#bt-pk" transform="translate(${f1(x)},${f1(y)}) scale(${s})"/>`; });
  A.seas.forEach(([t, lo, la, rot, fs]) => { h += `<text class="bt-sea" x="${f1(PX(lo))}" y="${f1(PY(la))}" font-size="${fs}" text-anchor="middle" transform="rotate(${rot} ${f1(PX(lo))} ${f1(PY(la))})" letter-spacing="${fs * .35}">${t}</text>`; });
  A.lands.forEach(([t, lo, la]) => { h += `<text class="bt-land" x="${f1(PX(lo))}" y="${f1(PY(la))}" text-anchor="middle">${t}</text>`; });
  // pusula
  const cx0 = 82, cy0 = 596;
  h += `<g class="bt-compass" transform="translate(${cx0},${cy0})"><circle r="30" fill="rgba(255,250,235,.18)" stroke="rgba(255,250,235,.7)" stroke-width="1.5"/><circle r="23" fill="none" stroke="rgba(255,250,235,.45)" stroke-width="1" stroke-dasharray="2 3"/>
    <path d="M0,-27 L5,0 L0,27 L-5,0 Z" fill="#fff6dd"/><path d="M0,-27 L5,0 L-5,0 Z" fill="#e8413c"/><path d="M-27,0 L0,4 L27,0 L0,-4 Z" fill="rgba(255,246,221,.75)"/><text y="-34" text-anchor="middle" font-size="12" font-weight="900" fill="#fff6dd">K</text></g>`;
  // kartuş
  h += `<g class="bt-cart" transform="translate(1196,622)"><rect x="-128" y="-30" width="256" height="58" rx="10" fill="#f6e8bf" stroke="#7a5a2a" stroke-width="2.5"/><rect x="-122" y="-24" width="244" height="46" rx="7" fill="none" stroke="#b08a4a" stroke-width="1.2"/>
    <text y="-1" text-anchor="middle" class="bt-cart-t">BİLET YOLU</text><text y="16" text-anchor="middle" class="bt-cart-s">TÜRKİYE HAT HARİTASI · 1 vagon ≈ 1 gün</text></g>`;
  h += `<rect x="${b.x - X}" y="${b.y - X}" width="${b.w + 2 * X}" height="${b.h + 2 * X}" fill="url(#bt-vig)" pointer-events="none"/>`;
  return h;
}

/* ---------- dinamik katmanlar ---------- */
const WAG_SH = 'rgba(30,18,6,.42)';
function slotSVG(R, g, newK) {
  let h = '';
  const fill = R.c === GREY ? '#b9b2a2' : CC[R.c], stroke = R.c === 6 ? '#0d0f14' : '#3b2a1a';
  g.cars.forEach(([x, y, a], k) => {
    const tf = `transform="translate(${f1(x)},${f1(y)}) rotate(${f1(a)})"`;
    h += `<g ${tf}><rect x="${f1(-g.car / 2 + .8)}" y="-4" width="${f1(g.car)}" height="11" rx="2.6" fill="${WAG_SH}"/><rect class="bt-slot${R.t ? ' tun' : ''}" x="${f1(-g.car / 2)}" y="-5.5" width="${f1(g.car)}" height="11" rx="2.6" fill="${fill}" stroke="${R.t ? '#1a1208' : stroke}" stroke-width="${R.t ? 1.7 : 1.1}" ${R.t ? 'stroke-dasharray="3.2 2.2"' : ''}/>`;
    if (R.f && k < R.f) h += `<circle r="4.1" fill="#fffaf0" stroke="#3b2a1a" stroke-width=".9"/><path d="M-2.6,1.6 V-1 H-.6 V-2.4 H1 V-1 H2.6 V1.6 Z" fill="#3b2a1a"/>`;
    h += '</g>';
  });
  void newK;
  return h;
}
function wagonSVG(R, g, col, isNew) {
  let h = '';
  g.cars.forEach(([x, y, a], k) => {
    const L = g.car, w = L / 2;
    h += `<g transform="translate(${f1(x)},${f1(y)}) rotate(${f1(a)})"><g class="bt-wag${isNew ? ' new' : ''}" ${isNew ? `style="animation-delay:${120 + k * 150}ms"` : ''}>
      <rect x="${f1(-w + 1)}" y="-4" width="${f1(L)}" height="11.5" rx="2.4" fill="${WAG_SH}"/>
      <rect x="${f1(-w)}" y="-6" width="${f1(L)}" height="12" rx="2.6" fill="${col}" stroke="#160c02" stroke-width="1.5"/>
      <rect x="${f1(-w + 2)}" y="-4.2" width="${f1(L - 4)}" height="2.4" rx="1.2" fill="rgba(255,255,255,.45)"/>
      ${L > 16 ? `<rect x="${f1(-w + 3.5)}" y="-.6" width="4" height="3.4" rx=".8" fill="rgba(20,10,0,.55)"/><rect x="${f1(w - 7.5)}" y="-.6" width="4" height="3.4" rx=".8" fill="rgba(20,10,0,.55)"/>` : ''}
    </g></g>`;
  });
  return h;
}
function renderRoutes(v) {
  const M = gm(v), G = geo(M);
  let slots = '', wags = '';
  M.routes.forEach(R => {
    const o = v.own[R.id], g = G.routes[R.id];
    if (o >= 0) wags += `<g class="bt-r own" data-r="${R.id}"><path class="bt-band${newRoutes.has(R.id) ? ' new' : ''}" d="${g.d}" stroke="${v.players[o].color}"/>${wagonSVG(R, g, v.players[o].color, newRoutes.has(R.id))}</g>`;
    else {
      const dead = R.tw >= 0 && v.own[R.tw] >= 0 && v.players.length < 4;
      slots += `<g class="bt-r${dead ? ' dead' : ''}" data-r="${R.id}">${slotSVG(R, g)}</g>`;
    }
  });
  const h = slots + wags;
  if (E.gRoutes.dataset.h !== h) { E.gRoutes.innerHTML = h; E.gRoutes.dataset.h = h; }
}
function renderCities(v) {
  const M = gm(v), k = labelK, showMinor = cam && cam.s >= .48;
  let h = '';
  const hiC = new Set();
  if (tixHi >= 0 && M.tickets[tixHi]) { hiC.add(M.tickets[tixHi].a); hiC.add(M.tickets[tixHi].b); }
  if (pickSel && E.pickHover >= 0 && M.tickets[E.pickHover]) { hiC.add(M.tickets[E.pickHover].a); hiC.add(M.tickets[E.pickHover].b); }
  M.cities.forEach(c => {
    const r = c.big ? 9.5 : 7.5, st = v.stations ? v.stations[c.i] : -1;
    h += `<g class="bt-city${c.big ? ' big' : ''}${hiC.has(c.i) ? ' hi' : ''}" transform="translate(${c.x},${c.y})">`;
    if (hiC.has(c.i)) h += `<circle class="bt-cring" r="${r + 7}"/>`;
    h += `<circle r="${r + 2.5}" fill="rgba(40,22,4,.35)" transform="translate(1,1.6)"/><circle r="${r}" fill="#fff8e7" stroke="#3b2a1a" stroke-width="2.6"/>${c.big ? `<circle r="${r - 3.6}" fill="#e8413c"/>` : `<circle r="2.4" fill="#3b2a1a"/>`}`;
    if (st >= 0) h += `<g transform="translate(${c.big ? 11 : 9},${c.big ? -12 : -10})"><path d="M-6,4 V-2 L0,-7 L6,-2 V4 Z" fill="${v.players[st].color}" stroke="#160c02" stroke-width="1.4"/><rect x="-1.6" y="0" width="3.2" height="4" fill="#160c02"/></g>`;
    h += '</g>';
  });
  let l = '';
  M.cities.forEach(c => {
    if (!c.big && !showMinor && !hiC.has(c.i)) return;
    const fs = (c.big ? 15 : 12.5) * k, gap = (c.big ? 13 : 11) + 1.5 * k, dir = c.lab;
    let x = 0, y = 0, anc = 'middle';
    if (dir.includes('n')) y = -gap; if (dir.includes('s')) y = gap + fs * .72;
    if (dir.includes('e')) { x = gap; anc = 'start'; } if (dir.includes('w')) { x = -gap; anc = 'end'; }
    if (dir === 'e' || dir === 'w') y = fs * .36;
    if (dir.length === 2) { x *= .75; y = dir[0] === 'n' ? -gap * .7 : gap * .7 + fs * .6; }
    l += `<text class="bt-lab${c.big ? ' big' : ''}${hiC.has(c.i) ? ' hi' : ''}" x="${f1(c.x + x)}" y="${f1(c.y + y)}" font-size="${f1(fs)}" text-anchor="${anc}">${esc(c.n)}</text>`;
  });
  if (E.gCities.dataset.h !== h) { E.gCities.innerHTML = h; E.gCities.dataset.h = h; }
  if (E.gLabels.dataset.h !== l) { E.gLabels.innerHTML = l; E.gLabels.dataset.h = l; }
}
function canAfford(v, me, R) { const p = v.players[me]; return p && p.hand ? payOptions(p.hand, R, R.len, R.f).length > 0 : false; }
function renderHi(v) {
  const M = gm(v), G = geo(M), me = viewerPi(v);
  let under = '', over = '';
  // seçili renkte alınabilir hatlar
  if (hlColor >= 0 && myTurn(v) && !v.drew && !veiled(v)) {
    M.routes.forEach(R => {
      if (R.c !== hlColor && R.c !== GREY && hlColor !== LOCO) return;
      if (claimBlock(v, me, R.id) || !canAfford(v, me, R)) return;
      under += `<path class="bt-hlc" d="${G.routes[R.id].d}"/>`;
    });
  }
  // bilet yolu
  if (tixHi >= 0 && me >= 0 && v.players[me].tickets && !veiled(v)) {
    const ts = ticketStatus(v, me, tixHi);
    ts.path.forEach(r => { under += `<path class="bt-hlt ${ts.done ? 'done' : ''}" d="${G.routes[r].d}" style="--pc:${v.players[me].color}"/>`; });
    if (!ts.path.length) { const t = M.tickets[tixHi], a = M.cities[t.a], b = M.cities[t.b]; over += `<line class="bt-hlx" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`; }
  }
  if (sel && sel.k === 'r') { const g = G.routes[sel.id]; under += `<path class="bt-selg" d="${g.d}"/>`; over += `<path class="bt-sel" d="${g.d}"/>`; }
  if (sel && sel.k === 'c') { const c = M.cities[sel.id]; over += `<circle class="bt-sel" cx="${c.x}" cy="${c.y}" r="${c.big ? 19 : 16}"/>`; }
  if (scoreRun && scoreRun.hi) { under += scoreRun.hi.under || ''; over += scoreRun.hi.over || ''; }
  if (E.gUnder.dataset.h !== under) { E.gUnder.innerHTML = under; E.gUnder.dataset.h = under; }
  if (E.gOver.dataset.h !== over) { E.gOver.innerHTML = over; E.gOver.dataset.h = over; }
}

/* ---------- kamera ---------- */
function vpSize() { const r = E.vp.getBoundingClientRect(); return [r.width || 1, r.height || 1]; }
const boxOf = () => gm(V || {}).box;
const fitScale = () => { const [w, h] = vpSize(), b = boxOf(); return Math.min(w / b.w, h / b.h); };
const maxScale = () => Math.max(fitScale() * 3.4, 1.15);
function clampCam() {
  const [w, h] = vpSize(), b = boxOf(), sw = b.w * cam.s, sh = b.h * cam.s, m = 24;
  cam.x = sw <= w ? (w - sw) / 2 : Math.min(m, Math.max(w - sw - m, cam.x));
  cam.y = sh <= h ? (h - sh) / 2 : Math.min(m, Math.max(h - sh - m, cam.y));
}
function applyCam(ms) {
  if (!E.board) return;
  clampCam();
  E.board.style.transition = ms ? `transform ${ms}ms cubic-bezier(.25,.8,.3,1)` : 'none';
  E.board.style.transform = `translate(${cam.x.toFixed(1)}px, ${cam.y.toFixed(1)}px) scale(${cam.s.toFixed(4)})`;
  root.querySelector('.bt').classList.toggle('zoomed', cam.s > fitScale() * 1.03);
  const k = Math.round(Math.min(2.5, Math.max(1, .7 / cam.s)) * 10) / 10;
  if ((k !== labelK || (cam.s >= .48) !== E.minorOn) && V) { labelK = k; E.minorOn = cam.s >= .48; renderCities(V); }
}
function camFit(ms) { cam.s = fitScale(); cam.x = 0; cam.y = 0; applyCam(ms); }
function zoomAt(f, mx, my, ms) {
  const s = Math.max(fitScale(), Math.min(maxScale(), cam.s * f));
  const bx = (mx - cam.x) / cam.s, by = (my - cam.y) / cam.s;
  cam.s = s; cam.x = mx - bx * s; cam.y = my - by * s; applyCam(ms);
}
function frame(xs, ys, ms) {
  const [w, h] = vpSize(), b = boxOf();
  const x0 = Math.min(...xs) - 70, x1 = Math.max(...xs) + 70, y0 = Math.min(...ys) - 60, y1 = Math.max(...ys) + 60;
  const s = Math.max(fitScale(), Math.min(maxScale() * .8, Math.min(w / (x1 - x0), h / (y1 - y0))));
  cam.s = s; cam.x = w / 2 - ((x0 + x1) / 2 - b.x) * s; cam.y = h / 2 - ((y0 + y1) / 2 - b.y) * s; applyCam(ms);
}
// gerçek ekrandaki dönüşüm (geçiş animasyonu sürerken de doğru)
function liveCam() { const r = E.board.getBoundingClientRect(), b = boxOf(); return r.width ? { s: r.width / b.w, x: r.left, y: r.top } : null; }
function toBoard(cx, cy) { const L = liveCam(), b = boxOf(); if (!L) return [0, 0]; return [(cx - L.x) / L.s + b.x, (cy - L.y) / L.s + b.y]; }
function toScreen(x, y) { const L = liveCam(), b = boxOf(); if (!L) return [0, 0]; return [L.x + (x - b.x) * L.s, L.y + (y - b.y) * L.s]; }
function onResize() { clearTimeout(resizeT); resizeT = setTimeout(() => { if (!root || !cam) return; if (cam.s <= fitScale() * 1.05 || cam.s < fitScale()) camFit(0); else applyCam(0); }, 80); }
function onPointerDown(e) {
  if (e.target.closest('.bt-vpctl, .bt-scp')) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) { drag = { sx: e.clientX, sy: e.clientY, x0: cam.x, y0: cam.y }; moved = false; }
  else if (pointers.size === 2) { const [a, b] = [...pointers.values()]; drag = { pinch: true, d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, x0: cam.x, y0: cam.y, s0: cam.s }; }
}
function onPointerMove(e) {
  if (!pointers.has(e.pointerId) || !drag) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const r = E.vp.getBoundingClientRect();
  if (drag.pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const s = Math.max(fitScale(), Math.min(maxScale(), drag.s0 * d / drag.d0));
    const mx = drag.mx - r.left, my = drag.my - r.top, bx = (mx - drag.x0) / drag.s0, by = (my - drag.y0) / drag.s0;
    cam.s = s; cam.x = mx - bx * s; cam.y = my - by * s; moved = true; applyCam(0); return;
  }
  const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if (!moved && Math.hypot(dx, dy) < 8) return;
  if (cam.s <= fitScale() * 1.01) return;
  moved = true; cam.x = drag.x0 + dx; cam.y = drag.y0 + dy; applyCam(0);
}
function onPointerUp(e) {
  pointers.delete(e.pointerId);
  if (pointers.size === 0) drag = null;
  else if (pointers.size === 1) { const [p] = [...pointers.values()]; drag = { sx: p.x, sy: p.y, x0: cam.x, y0: cam.y }; }
}
function onWheel(e) { if (!cam) return; e.preventDefault(); const r = E.vp.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX - r.left, e.clientY - r.top, 0); }

/* ---------- kart görünümleri ---------- */
const WAGON = '<svg viewBox="0 0 44 26" aria-hidden="true"><rect x="3" y="4" width="38" height="14" rx="3" fill="currentColor"/><rect x="7" y="7" width="7" height="5" rx="1" fill="rgba(255,255,255,.55)"/><rect x="18.5" y="7" width="7" height="5" rx="1" fill="rgba(255,255,255,.55)"/><rect x="30" y="7" width="7" height="5" rx="1" fill="rgba(255,255,255,.55)"/><rect x="1" y="17" width="42" height="2.4" rx="1.2" fill="currentColor"/><circle cx="11" cy="21.5" r="3.2" fill="currentColor"/><circle cx="33" cy="21.5" r="3.2" fill="currentColor"/></svg>';
const cardFace = (c, mini, short) => (c < 0 ? `<span class="bt-cb">🎟️</span>` : c === LOCO ? `<span class="bt-ci loco">🚂</span>${mini ? '' : `<small>${short ? 'Loko' : 'Lokomotif'}</small>`}` : `<span class="bt-ci">${WAGON}</span>${mini ? '' : `<small>${CN[c]}</small>`}`);
const chip = (c, n) => `<span class="bt-mc c${c}">${c === LOCO ? '🚂' : ''}${n > 1 || c !== LOCO ? `<b>${n}</b>` : ''}</span>`;
const payHTML = pay => pay.map((n, c) => (n ? chip(c, n) : '')).join('');
const colDot = c => (c === GREY ? '<i class="bt-dot grey"></i>' : `<i class="bt-dot c${c}"></i>`);

/* ---------- oyuncular ve skor çizelgesi ---------- */
function renderPlayers(v) {
  const n = v.players.length;
  const h = v.players.map((p, i) => {
    const act = v.phase === 'play' ? i === v.cur : v.phase === 'pick0' ? p.picking : false;
    const res = v.res ? v.res.rows[i] : null;
    return `<button type="button" class="bt-pl ${act ? 'active' : ''} ${p.online === false && !p.isBot ? 'off' : ''} ${v.final === i ? 'fin' : ''}" style="--pc:${p.color}" data-a="pinfo" data-pi="${i}">
      <span class="av" style="--pc:${p.color}">${p.isBot ? '🤖' : initial(p.name)}</span>
      <span class="bt-pt"><b>${esc(shortName(p))}${ui.mode === 'online' && ui.me === i ? ' <em>sen</em>' : ''}</b>
      <small><span title="Kalan vagon" class="${p.trains <= 6 ? 'lo' : ''}">🚃${p.trains}</span><span title="Kart">🂠${p.handN}</span><span title="Bilet">🎫${p.tixN}</span>${v.opt.ist ? `<span title="İstasyon">🚉${p.st}</span>` : ''}</small></span>
      <span class="bt-sc"><b>${res && scoreRun && scoreRun.done ? res.total : (scoreRun && scoreRun.tot ? scoreRun.tot[i] : p.score)}</b><small>puan</small></span>${p.picking && v.phase === 'pick0' ? '<i class="bt-think">🎫…</i>' : ''}</button>`;
  }).join('');
  E.pl.className = 'bt-players n' + n;
  if (E.pl.dataset.h !== h) { E.pl.innerHTML = h; E.pl.dataset.h = h; }
  // skor çizelgesi
  const sc = v.players.map((p, i) => (scoreRun && scoreRun.tot ? scoreRun.tot[i] : p.score));
  const mx = Math.max(60, ...sc.map(x => x + 10));
  const t = `<div class="bt-trk">${[0, .25, .5, .75].map(q => `<i style="left:${q * 100}%"><em>${Math.round(mx * q)}</em></i>`).join('')}${v.players.map((p, i) => `<span class="bt-tk" style="--pc:${p.color};left:${Math.max(0, Math.min(100, sc[i] / mx * 100)).toFixed(1)}%;--k:${i}" title="${esc(p.name)}: ${sc[i]}">${p.isBot ? '' : initial(p.name)}</span>`).join('')}</div>`;
  if (E.track.dataset.h !== t) { E.track.innerHTML = t; E.track.dataset.h = t; }
}

/* ---------- durum ---------- */
function renderHud(v) {
  const a = actor(v), me = viewerPi(v), cp = v.players[v.cur], multi = multiHot(v);
  let turn, msg = '';
  if (v.phase === 'over') {
    const w = v.res ? v.players[v.res.order[0]] : null;
    turn = `<span class="bt-turn over">🏆 ${w ? `${esc(w.name)} kazandı!` : 'Oyun bitti'}</span>`;
    msg = scoreRun && !scoreRun.done ? 'Biletler açılıyor, puanlar sayılıyor…' : 'Final puanları haritada. Biletlerin tek tek açıldı.';
  } else if (v.phase === 'pick0') {
    const pp = pendingPick(v);
    if (pp >= 0) turn = `<span class="bt-turn mine"><span class="av" style="--pc:${v.players[pp].color}">${initial(v.players[pp].name)}</span>${multi ? `${esc(v.players[pp].name)}, biletlerini seç` : 'Biletlerini seç'}</span>`;
    else turn = `<span class="bt-turn">🎫 Oyuncular biletlerini seçiyor…</span>`;
    msg = pp >= 0 ? 'En az 2 bilet tut. Tamamlanan bilet puan getirir, tamamlanamayan düşer.' : `Bekleniyor: ${v.players.filter(p => p.picking).map(p => esc(shortName(p))).join(', ')}`;
  } else if (myTurn(v)) {
    turn = `<span class="bt-turn mine"><span class="av" style="--pc:${v.players[a].color}">${initial(v.players[a].name)}</span>${multi ? `${esc(v.players[a].name)}, sıra sende` : 'Sıra sende'}</span>`;
    if (v.sub === 'tunnel') msg = '⛰️ Tünel: ek bedeli öde ya da vazgeç.';
    else if (v.sub === 'pick') msg = '🎫 Yeni biletlerden en az birini tut.';
    else if (v.drew) msg = '🃏 Bir kart daha çek. (Açık lokomotif ikinci kart olarak alınamaz.)';
    else msg = isDesk() ? 'İki kart çek, haritadan bir hatta tıklayıp al ya da bilet çek.' : 'İki kart çek, haritadan bir hatta dokunup al ya da bilet çek.';
  } else {
    turn = `<span class="bt-turn"><span class="av" style="--pc:${cp.color}">${cp.isBot ? '🤖' : initial(cp.name)}</span>Sıra: <b style="color:${cp.color}">${esc(cp.name)}</b>${cp.isBot ? ' <i class="think">düşünüyor</i>' : ''}</span>`;
    msg = v.sub === 'tunnel' ? `⛰️ ${esc(cp.name)} tünel bedelini düşünüyor…` : v.sub === 'pick' ? `🎫 ${esc(cp.name)} bilet seçiyor…` : v.drew ? `${esc(cp.name)} ikinci kartını çekiyor…` : '';
  }
  const fin = v.final >= 0 && v.phase === 'play' ? `<span class="bt-fin">🏁 SON TUR · ${v.left} sıra</span>` : '';
  const top = `${turn}${fin}`;
  if (E.hTop.dataset.h !== top) { E.hTop.innerHTML = top; E.hTop.dataset.h = top; }
  const m2 = msg ? `<p class="bt-msg">${msg}</p>` : '';
  if (E.hMsg.dataset.h !== m2) { E.hMsg.innerHTML = m2; E.hMsg.dataset.h = m2; }
  void me;
}

/* ---------- pazar ---------- */
function renderMarket(v) {
  const can = myTurn(v) && !v.sub && !veiled(v), second = v.drew > 0;
  const fc = v.face.map((c, i) => {
    const ok = can && c >= 0 && !(second && c === LOCO);
    return `<button type="button" class="bt-card bt-fc ${c >= 0 ? 'c' + c : 'empty'} ${ok ? 'can' : ''}" data-a="draw" data-i="${i}" ${ok ? '' : 'disabled'} aria-label="${c >= 0 ? CN[c] : 'Boş'} kartını al">${c >= 0 ? cardFace(c, false, true) : '<small>—</small>'}${c === LOCO && second ? '<em class="bt-no">✕</em>' : ''}</button>`;
  }).join('');
  const dk = `<button type="button" class="bt-card bt-deck ${can && (v.deckN || v.discN) ? 'can' : ''}" data-a="draw" data-i="-1" ${can && (v.deckN || v.discN) ? '' : 'disabled'} aria-label="Desteden çek"><span class="bt-cb">🚃</span><small>Deste</small><b class="bt-n">${v.deckN}</b></button>`;
  const tk = `<button type="button" class="bt-card bt-tdeck ${can && !second && v.tdeckN ? 'can' : ''}" data-a="tickets" ${can && !second && v.tdeckN ? '' : 'disabled'} aria-label="Bilet çek"><span class="bt-cb">🎫</span><small>Bilet</small><b class="bt-n">${v.tdeckN}</b></button>`;
  const h = `<div class="bt-mhead"><b>Açık kartlar</b><small>${second ? 'Bir kart daha' : 'Lokomotif = joker'}</small></div><div class="bt-mrow">${fc}${dk}${tk}</div>`;
  if (E.mkt.dataset.h !== h) { E.mkt.innerHTML = h; E.mkt.dataset.h = h; }
  E.mkt.classList.toggle('live', can);
}

/* ---------- el ---------- */
function renderHand(v) {
  const me = viewerPi(v), p = me >= 0 ? v.players[me] : null;
  let h;
  if (!p || !p.hand) h = `<div class="bt-hhead"><b>İzleyici</b><small>Kartlar ve biletler gizli</small></div>`;
  else if (veiled(v)) h = `<div class="bt-hhead"><b>Kartlar gizli</b><small>Sıradaki oyuncu görecek</small></div><div class="bt-fan veil"><span class="bt-card back"></span><span class="bt-card back"></span><span class="bt-card back"></span></div>`;
  else {
    const groups = p.hand.map((n, c) => ({ n, c })).filter(x => x.n > 0);
    const N = groups.length, mid = (N - 1) / 2;
    const fan = groups.map((g, k) => `<button type="button" class="bt-card bt-hc c${g.c} ${hlColor === g.c ? 'on' : ''}" data-a="hl" data-c="${g.c}" style="--r:${((k - mid) * Math.min(6, 26 / Math.max(1, N))).toFixed(1)}deg;--y:${(Math.abs(k - mid) * Math.abs(k - mid) * 1.1).toFixed(1)}px;--k:${k}" aria-label="${CN[g.c]} ${g.n} kart">${cardFace(g.c, false, !isDesk())}<b class="bt-n">${g.n}</b></button>`).join('');
    const cw = isDesk() ? 66 : (N >= 7 ? 46 : 50), avail = Math.max(120, (E.hand.clientWidth || 300) - 34);
    const ov = N > 1 ? Math.max(isDesk() ? 8 : 10, Math.ceil((N * cw - avail) / (N - 1))) : 0;
    h = `<div class="bt-hhead"><b>${multiHot(v) ? `${esc(p.name)} · elin` : 'Elin'}</b><small>${p.handN} kart · 🚃 ${p.trains} vagon${hlColor >= 0 ? ' · <em>alınabilir hatlar parlıyor</em>' : ''}</small></div><div class="bt-fan n${Math.min(N, 9)}" style="--ov:${ov}px;--cw:${cw}px">${fan || '<span class="bt-empty">Elinde kart yok</span>'}</div>`;
  }
  if (E.hand.dataset.h !== h) {
    E.hand.innerHTML = h; E.hand.dataset.h = h;
    if (p && p.hand && lastHand && lastHand.pi === me && !veiled(v)) p.hand.forEach((n, c) => { if (n > lastHand.h[c]) { const el = E.hand.querySelector(`.bt-hc.c${c}`); if (el) el.classList.add('bump'); } });
  }
  lastHand = p && p.hand ? { pi: me, h: p.hand.slice() } : null;
}

/* ---------- biletler ---------- */
function ticketRow(v, me, id, opts) {
  const M = gm(v), t = M.tickets[id], ts = ticketStatus(v, me, id);
  const stx = ts.done ? '<span class="bt-ts ok">✓ Tamam</span>' : ts.left < 0 ? '<span class="bt-ts no">✗ Kapandı</span>' : `<span class="bt-ts go">${ts.left} vagon kaldı</span>`;
  return `<button type="button" class="bt-tix ${t.long ? 'long' : ''} ${ts.done ? 'done' : ts.left < 0 ? 'dead' : ''} ${tixHi === id ? 'on' : ''}" data-a="${opts && opts.pick ? 'pk' : 'tix'}" data-id="${id}">
    <span class="bt-tt"><b>${esc(M.cities[t.a].n)}</b><i>→</i><b>${esc(M.cities[t.b].n)}</b></span><span class="bt-tp">${t.p}</span>${opts && opts.pick ? `<span class="bt-ts ${pickSel && pickSel.has(id) ? 'ok' : ''}">${pickSel && pickSel.has(id) ? '✓ Tut' : 'Bırak'}</span><small class="bt-tl">en kısa: ${t.p} vagon${ts.left >= 0 && ts.left < t.p ? ` · sana ${ts.left}` : ''}</small>` : stx}</button>`;
}
function renderTix(v) {
  const me = viewerPi(v), p = me >= 0 ? v.players[me] : null;
  let h;
  if (!p || !p.tickets) h = `<div class="bt-thead"><b>🎫 Biletler</b><small>Gizli</small></div>`;
  else if (veiled(v)) h = `<div class="bt-thead"><b>🎫 Biletler</b><small>Gizli</small></div>`;
  else {
    const M = gm(v), list = p.tickets.slice().sort((x, y) => M.tickets[y].p - M.tickets[x].p);
    const done = list.filter(id => ticketDone(v, me, id)).length;
    const open = isDesk() || tixOpen;
    h = `<button type="button" class="bt-thead btn-ghost" data-a="tixToggle" aria-expanded="${open}"><b>🎫 Biletlerim (${list.length})</b><small>${done} tamam · ${list.length - done} devam</small><i class="bt-chev">${open ? '▴' : '▾'}</i></button>
      ${open ? `<div class="bt-tlist">${list.map(id => ticketRow(v, me, id)).join('') || '<p class="bt-note">Bilet yok.</p>'}<p class="bt-note">Bir bilede dokun: yolu haritada parlar.</p></div>` : ''}`;
  }
  if (E.tix.dataset.h !== h) { E.tix.innerHTML = h; E.tix.dataset.h = h; }
}

/* ---------- hat / şehir sayfası ---------- */
function draftFor(v, me, R, len, minLoco) {
  const p = v.players[me]; if (!p || !p.hand) return null;
  const opts = payOptions(p.hand, R, len, minLoco);
  if (!opts.length) return null;
  return { c: opts[0].c, L: opts[0].L };
}
function draftPay(len, d) { const pay = zero(); if (d.c < 0) pay[LOCO] = len; else { pay[d.c] = len - d.L; pay[LOCO] = d.L; } return pay; }
function payEditor(v, me, R, len, minLoco) {
  const p = v.players[me], hand = p.hand;
  const cols = R && R.c !== GREY ? [R.c] : [0, 1, 2, 3, 4, 5, 6, 7];
  const ok = cols.filter(c => hand[c] > 0 && Math.max(minLoco, len - hand[c]) <= Math.min(hand[LOCO], len - 1));
  const allLoco = hand[LOCO] >= len;
  if (!draft || (draft.c >= 0 && !ok.includes(draft.c)) || (draft.c < 0 && !allLoco)) draft = draftFor(v, me, R, len, minLoco);
  if (!draft) return { html: '', pay: null };
  let lo = 0, hi = 0;
  if (draft.c >= 0) { lo = Math.max(minLoco, len - hand[draft.c]); hi = Math.min(hand[LOCO], len - 1); draft.L = Math.max(lo, Math.min(hi, draft.L)); }
  const pay = draftPay(len, draft);
  const choices = ok.map(c => `<button type="button" class="bt-cpick c${c} ${draft.c === c ? 'on' : ''}" data-a="pc" data-c="${c}" aria-label="${CN[c]}">${colDot(c)}<b>${hand[c]}</b></button>`).join('') + (allLoco ? `<button type="button" class="bt-cpick c8 ${draft.c < 0 ? 'on' : ''}" data-a="pc" data-c="-1" aria-label="Yalnız lokomotif">🚂<b>${hand[LOCO]}</b></button>` : '');
  const step = draft.c >= 0 && hi > lo ? `<div class="bt-lstep"><span>🚂 Lokomotif</span><button type="button" data-a="pl" data-d="-1" ${draft.L > lo ? '' : 'disabled'} aria-label="Lokomotif azalt">−</button><b>${draft.L}</b><button type="button" data-a="pl" data-d="1" ${draft.L < hi ? '' : 'disabled'} aria-label="Lokomotif artır">+</button></div>` : '';
  return { html: `<div class="bt-pay"><div class="bt-plab">Ödeme ${cols.length > 1 ? '(rengi seç)' : ''}</div><div class="bt-cps">${choices}</div>${step}<div class="bt-pcards">${pay.map((n, c) => Array.from({ length: n }, (_, k) => `<span class="bt-card mini c${c}" style="--k:${k}">${cardFace(c, true)}</span>`).join('')).join('')}</div></div>`, pay };
}
function sheetHTML(v) {
  const M = gm(v), me = viewerPi(v), mine = myTurn(v) && !v.drew && !v.sub && !veiled(v);
  const p = me >= 0 ? v.players[me] : null;
  if (sel.k === 'r') {
    const R = M.routes[sel.id], o = v.own[R.id];
    const tags = [`<span class="bt-tag">${colDot(R.c)} ${R.c === GREY ? 'Gri (her renk)' : CN[R.c]}</span>`, `<span class="bt-tag">🚃 ${R.len} vagon</span>`, `<span class="bt-tag gold">+${PTS[R.len]} puan</span>`];
    if (R.f) tags.push(`<span class="bt-tag ferry">⛴️ Feribot: ${R.f} lokomotif şart</span>`);
    if (R.t) tags.push('<span class="bt-tag tun">⛰️ Tünel: 3 kart açılır</span>');
    if (R.tw >= 0) tags.push(`<span class="bt-tag">⇉ Çift hat${v.players.length < 4 ? ' (2–3 kişide tek)' : ''}</span>`);
    let body = '', foot = '';
    if (o >= 0) body = `<p class="bt-note"><b style="color:${v.players[o].color}">${esc(v.players[o].name)}</b> bu hattı aldı.</p>`;
    else if (!p || !p.hand) body = '<p class="bt-note">İzliyorsun.</p>';
    else {
      const why = claimBlock(v, me, R.id);
      if (why) body = `<p class="bt-note bad">${esc(why)}.</p>`;
      else if (!canAfford(v, me, R)) body = `<p class="bt-note bad">Kartların yetmiyor: ${R.len} ${R.c === GREY ? 'aynı renk' : CN[R.c]} kart${R.f ? `, en az ${R.f} lokomotif` : ''} gerekli (lokomotif joker).</p>`;
      else if (!mine) body = `<p class="bt-note">${myTurn(v) ? 'Bu tur kart çekmeye başladın; hattı sonraki turda alabilirsin.' : 'Kendi sıranda alabilirsin.'}</p>`;
      else {
        const pe = payEditor(v, me, R, R.len, R.f);
        body = pe.html + (R.t ? '<p class="bt-note">Tünel: desteden 3 kart açılır; ödediğin renkle (ya da lokomotifle) eşleşen her kart için 1 kart daha ödersin.</p>' : '');
        foot = `<button type="button" class="btn btn-spin" data-a="claim" ${pe.pay ? '' : 'disabled'}>🚆 Hattı al · +${PTS[R.len]}</button>`;
      }
    }
    return `<div class="bt-sh" role="dialog" aria-label="Hat"><button type="button" class="bt-x" data-a="unsel" aria-label="Kapat">✕</button>
      <div class="bt-shh"><b>${esc(M.cities[R.a].n)} <i>—</i> ${esc(M.cities[R.b].n)}</b></div><div class="bt-tags">${tags.join('')}</div>${body}<div class="bt-shf">${foot}<button type="button" class="btn btn-ghost" data-a="unsel">Kapat</button></div></div>`;
  }
  // şehir
  const c = M.cities[sel.id], stn = v.stations[c.i];
  const rs = M.adj[c.i].map(r => M.routes[r]);
  let body = `<p class="bt-note">${rs.length} hat bağlanıyor: ${rs.map(R => esc(M.cities[R.a === c.i ? R.b : R.a].n)).filter((x, i, a) => a.indexOf(x) === i).join(', ')}.</p>`, foot = '';
  if (v.opt.ist) {
    if (stn >= 0) body += `<p class="bt-note">🚉 <b style="color:${v.players[stn].color}">${esc(v.players[stn].name)}</b> burada istasyon kurdu.</p>`;
    else if (p && p.hand && mine && p.st > 0) {
      const cost = STATIONS - p.st + 1;
      if (payOptions(p.hand, null, cost, 0).length) {
        const pe = payEditor(v, me, null, cost, 0);
        body += `<p class="bt-note">İstasyon: oyun sonunda bu şehre bağlı bir rakip hattını biletlerin için kullanırsın. ${cost}. istasyon ${cost} kart (aynı renk). Kullanılmayan her istasyon +${ST_BONUS}.</p>` + pe.html;
        foot = `<button type="button" class="btn btn-vowel" data-a="station" ${pe.pay ? '' : 'disabled'}>🚉 İstasyon kur</button>`;
      } else body += `<p class="bt-note">İstasyon için ${cost} aynı renk kart gerekiyor.</p>`;
    } else if (p && p.st <= 0) body += '<p class="bt-note">İstasyonun kalmadı.</p>';
  }
  return `<div class="bt-sh" role="dialog" aria-label="Şehir"><button type="button" class="bt-x" data-a="unsel" aria-label="Kapat">✕</button><div class="bt-shh"><b>📍 ${esc(c.n)}</b></div>${body}<div class="bt-shf">${foot}<button type="button" class="btn btn-ghost" data-a="unsel">Kapat</button></div></div>`;
}

/* ---------- pencereler ---------- */
function pickHTML(v, pi) {
  const p = v.players[pi], pk = p.pick, M = gm(v);
  const key = pi + ':' + pk.ids.join(',');
  if (pickKey !== key) { pickKey = key; pickSel = new Set(pk.ids); E.pickHover = -1; }
  const n = pickSel.size;
  return `<div class="bt-dlg bt-pick" role="dialog" aria-label="Bilet seç"><div class="bt-mh"><span>🎫</span><b>${v.phase === 'pick0' ? 'Başlangıç biletleri' : 'Yeni biletler'}</b></div>
    <div class="bt-mb"><p class="bt-note">${multiHot(v) ? `<b style="color:${p.color}">${esc(p.name)}</b>: ` : ''}En az <b>${pk.min}</b> bilet tut. İki şehri kendi hatlarınla bağlarsan puanı kazanırsın, bağlayamazsan kaybedersin.</p>
    <div class="bt-plist">${pk.ids.map(id => ticketRow(v, pi, id, { pick: true })).join('')}</div>${p.tickets.length ? `<p class="bt-note small">Elindeki biletler: ${p.tickets.map(id => `${esc(M.cities[M.tickets[id].a].n)}→${esc(M.cities[M.tickets[id].b].n)}`).join(' · ')}</p>` : ''}</div>
    <div class="bt-mf"><button type="button" class="btn btn-spin" data-a="keep" data-pi="${pi}" ${n >= pk.min ? '' : 'disabled'}>✓ ${n} bileti tut</button></div></div>`;
}
function tunnelHTML(v, pi) {
  const tn = v.tunnel, M = gm(v), R = M.routes[tn.r], p = v.players[pi];
  const rest = p.hand.map((x, i) => x - tn.pay[i]);
  const col = tn.col;
  let lo = 0, hi = 0, can = false;
  if (col >= 0) { lo = Math.max(0, tn.extra - rest[col]); hi = Math.min(rest[LOCO], tn.extra); can = lo <= hi; }
  else { can = rest[LOCO] >= tn.extra; lo = hi = tn.extra; }
  if (!tunSel || tunSel.k !== tn.r + ':' + tn.extra) tunSel = { k: tn.r + ':' + tn.extra, L: lo };
  tunSel.L = Math.max(lo, Math.min(hi, tunSel.L));
  const pay = zero(); if (col >= 0) { pay[col] = tn.extra - tunSel.L; pay[LOCO] = tunSel.L; } else pay[LOCO] = tn.extra;
  E.tunPay = can ? pay : null;
  return `<div class="bt-dlg bt-tun" role="dialog" aria-label="Tünel"><div class="bt-mh"><span>⛰️</span><b>Tünel: ${esc(routeName(M, R))}</b></div><div class="bt-mb">
    <div class="bt-tdraw">${tn.drawn.map((c, k) => `<span class="bt-card c${c} flip ${c === LOCO || c === col ? 'match' : ''}" style="--k:${k}">${cardFace(c)}</span>`).join('') || '<p class="bt-note">Deste boş.</p>'}</div>
    <p class="bt-note"><b>${tn.extra}</b> eşleşme: ${col >= 0 ? `${CN[col]} ya da lokomotif` : 'lokomotif'} ile <b>${tn.extra} kart daha</b> ödemelisin.</p>
    <div class="bt-pay"><div class="bt-plab">Ödediğin: ${payHTML(tn.pay)} · Ek: ${can ? payHTML(pay) : '<em>kartın yetmiyor</em>'}</div>
    ${can && hi > lo ? `<div class="bt-lstep"><span>🚂 Lokomotif</span><button type="button" data-a="tl" data-d="-1" ${tunSel.L > lo ? '' : 'disabled'} aria-label="azalt">−</button><b>${tunSel.L}</b><button type="button" data-a="tl" data-d="1" ${tunSel.L < hi ? '' : 'disabled'} aria-label="artır">+</button></div>` : ''}</div></div>
    <div class="bt-mf"><button type="button" class="btn btn-spin" data-a="tpay" ${can ? '' : 'disabled'}>⛰️ Öde ve hattı al</button><button type="button" class="btn btn-ghost" data-a="tno">Vazgeç (kartlar elde kalır)</button></div></div>`;
}
function curtainHTML(v, pi) {
  const p = v.players[pi];
  return `<div class="bt-dlg bt-cur" role="dialog" aria-label="Sıra değişti"><div class="bt-curav av" style="--pc:${p.color}">${initial(p.name)}</div><b>Sıra ${esc(p.name)} oyuncusunda</b><p class="bt-note">Cihazı <b style="color:${p.color}">${esc(p.name)}</b> oyuncusuna ver. Kartlar ve biletler gizli.</p><button type="button" class="btn btn-spin big" data-a="reveal" data-pi="${pi}">👀 Hazırım, göster</button></div>`;
}
function infoHTML(v, pi) {
  const p = v.players[pi], M = gm(v);
  const routes = v.own.map((o, r) => (o === pi ? M.routes[r] : null)).filter(Boolean);
  const lp = longestPath(v, pi);
  return `<div class="bt-dlg" role="dialog"><button type="button" class="bt-x" data-a="closeModal" aria-label="Kapat">✕</button><div class="bt-mh" style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${p.isBot ? '🤖' : initial(p.name)}</span><b>${esc(p.name)}</b></div><div class="bt-mb">
    <div class="bt-irows"><span><small>Puan (hatlar)</small><b>${p.score}</b></span><span><small>Vagon</small><b>${p.trains}</b></span><span><small>Kart</small><b>${p.handN}</b></span><span><small>Bilet</small><b>${p.tixN}</b></span><span><small>Hat</small><b>${routes.length}</b></span><span><small>En uzun hat</small><b>${lp.len}</b></span></div>
    <p class="bt-note small">${routes.length ? routes.map(R => `${esc(routeName(M, R))} (${R.len})`).join(' · ') : 'Henüz hat yok.'}</p>
    <p class="bt-note small">Puan tablosu: ${[1, 2, 3, 4, 5, 6].map(l => `${l}→${PTS[l]}`).join(' · ')} · En Uzun Hat +${LONG_BONUS}${v.opt.gez ? ` · Gezgin +${GEZ_BONUS}` : ''}</p></div></div>`;
}
function renderModal(v) {
  let h = '', k = '';
  const pp = pendingPick(v), a = actor(v);
  if (veiled(v) && v.phase !== 'over') {
    const who = pp >= 0 ? pp : a >= 0 ? a : viewerPi(v);
    if (who >= 0 && (pp >= 0 || a >= 0)) { h = curtainHTML(v, who); k = 'cur' + who; }
  }
  if (!h && pp >= 0 && v.players[pp].pick) { h = pickHTML(v, pp); k = 'pick' + pickKey; }
  else if (!h && myTurn(v) && v.sub === 'tunnel' && v.tunnel) { h = tunnelHTML(v, a); k = 'tun' + v.tunnel.r; }
  else if (!h && E.info >= 0 && v.players[E.info]) { h = infoHTML(v, E.info); k = 'info' + E.info; }
  if (h) { if (E.modal.dataset.h !== h) { E.modal.innerHTML = h; E.modal.dataset.h = h; } if (E.modKey !== k) { const c = E.modal.firstElementChild; if (c) c.classList.add('pop'); } E.modal.hidden = false; }
  else { E.modal.hidden = true; E.modal.innerHTML = ''; delete E.modal.dataset.h; }
  E.modal.classList.toggle('low', k.startsWith('pick'));
  E.modKey = k;
  // hat sayfası
  let s = '';
  if (sel && !h && v.phase !== 'over') s = sheetHTML(v);
  if (s) { if (E.sheet.dataset.h !== s) { E.sheet.innerHTML = s; E.sheet.dataset.h = s; } E.sheet.hidden = false; }
  else { E.sheet.hidden = true; E.sheet.innerHTML = ''; delete E.sheet.dataset.h; }
}

/* ---------- efektler ---------- */
function flyEl(cls, html, from, to, delay, dur) {
  if (!from || !to) return;
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  if (!a.width || !b.width) return;
  const d = document.createElement('div'); d.className = 'bt-fly ' + cls; d.innerHTML = html;
  const w = Math.min(a.width, 64), hgt = w * 1.36;
  d.style.cssText = `left:${a.left + a.width / 2 - w / 2}px;top:${a.top + a.height / 2 - hgt / 2}px;width:${w}px;height:${hgt}px`;
  document.body.appendChild(d);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  if (d.animate) d.animate([{ transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 }, { transform: `translate(${dx * .5}px, ${dy * .5 - 40}px) scale(1.12) rotate(-8deg)`, opacity: 1, offset: .45 }, { transform: `translate(${dx}px, ${dy}px) scale(.5) rotate(4deg)`, opacity: .3 }], { duration: dur || 620, delay: delay || 0, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'both' });
  setTimeout(() => d.remove(), (dur || 620) + (delay || 0) + 40);
}
function floatTxt(x, y, txt, cls, delay) {
  const d = document.createElement('div'); d.className = 'bt-float ' + (cls || ''); d.textContent = txt;
  d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d);
  if (d.animate) d.animate([{ transform: 'translate(-50%,-30%) scale(.5)', opacity: 0 }, { transform: 'translate(-50%,-110%) scale(1.15)', opacity: 1, offset: .25 }, { transform: 'translate(-50%,-160%) scale(1)', opacity: 1, offset: .75 }, { transform: 'translate(-50%,-200%) scale(.9)', opacity: 0 }], { duration: 1500, delay: delay || 0, fill: 'both', easing: 'ease-out' });
  setTimeout(() => d.remove(), 1560 + (delay || 0));
}
function runTrain(r, pi) {
  if (!V || !E.gFx) return;
  const M = gm(V), g = geo(M).routes[r], col = V.players[pi] ? V.players[pi].color : '#fff';
  const NS = 'http://www.w3.org/2000/svg', el = document.createElementNS(NS, 'g');
  el.setAttribute('class', 'bt-loco');
  el.innerHTML = `<g transform="translate(-16,-9)"><rect x="0" y="3" width="25" height="13" rx="3" fill="${col}" stroke="#160c02" stroke-width="1.6"/><rect x="18" y="0" width="10" height="16" rx="2" fill="#2b2f3a" stroke="#160c02" stroke-width="1.4"/><rect x="20" y="3" width="6" height="5" rx="1" fill="#ffe9a8"/><rect x="3" y="-3" width="5" height="7" rx="1.5" fill="#2b2f3a"/><path d="M25,16 L33,16 L29,10 Z" fill="#e8413c" stroke="#160c02" stroke-width="1"/><circle cx="6" cy="17" r="3" fill="#160c02"/><circle cx="15" cy="17" r="3" fill="#160c02"/><circle cx="23" cy="17" r="3" fill="#160c02"/></g>`;
  E.gFx.appendChild(el);
  const dur = 260 + g.cars.length * 150, s0 = Math.max(0, g.r0 - 10), s1 = g.L - g.r1 + 6, t0 = performance.now();
  let lastPuff = 0, ck = 0;
  const step = now => {
    if (!root || !el.isConnected) return;
    const t = Math.min(1, (now - t0) / dur), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const [x, y, a] = g.at(s0 + (s1 - s0) * e);
    el.setAttribute('transform', `translate(${f1(x)},${f1(y)}) rotate(${f1(a)})`);
    if (now - lastPuff > 110) {
      lastPuff = now;
      const pf = document.createElementNS(NS, 'circle'); pf.setAttribute('class', 'bt-puff'); pf.setAttribute('cx', f1(x - Math.cos(a * Math.PI / 180) * 10)); pf.setAttribute('cy', f1(y - 12)); pf.setAttribute('r', '4');
      E.gFx.appendChild(pf); setTimeout(() => pf.remove(), 900);
      if (ck++ % 2 === 0) chuff(ck);
    }
    if (t < 1) requestAnimationFrame(step); else setTimeout(() => el.remove(), 250);
  };
  requestAnimationFrame(step);
}
function stamp(txt, cls) { if (!E.stamp) return; E.stamp.className = 'bt-stamp'; E.stamp.innerHTML = txt; void E.stamp.offsetWidth; E.stamp.className = 'bt-stamp show ' + (cls || ''); }

/* ---------- final puan sayımı ---------- */
function pathOwned(v, pi, a, b, extra) {
  const M = gm(v), ex = new Set(extra || []);
  const d = dijkstra(M, a, R => (v.own[R.id] === pi || ex.has(R.id) ? R.len : Infinity));
  return pathRoutes(M, d.via, a, b) || [];
}
function scorePanel(v) {
  const r = scoreRun; if (!r) return '';
  const rows = v.res.rows;
  return `<div class="bt-scp"><div class="bt-scph"><b>🏁 Puan sayımı</b>${r.done ? '<small>tamamlandı</small>' : '<small>biletler açılıyor…</small>'}</div>
    ${v.players.map((p, i) => { const x = rows[i], sh = r.shown[i]; return `<div class="bt-scr ${r.cur === i ? 'on' : ''}" style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${p.isBot ? '🤖' : initial(p.name)}</span><b class="nm">${esc(shortName(p))}</b>
      <span class="it" title="Hatlar">🚆${x.route}</span><span class="it ${sh.tix > 0 ? 'ok' : sh.tix < 0 ? 'no' : ''}" title="Biletler">🎫${sh.tix >= 0 ? '+' : ''}${sh.tix}</span>${sh.long ? `<span class="it gold" title="En Uzun Hat">🛤️+${sh.long}</span>` : ''}${sh.gez ? `<span class="it gold" title="Gezgin">🧭+${sh.gez}</span>` : ''}${sh.st ? `<span class="it" title="İstasyon">🚉+${sh.st}</span>` : ''}<b class="tot">${r.tot[i]}</b></div>`; }).join('')}</div>`;
}
function renderScore(v) {
  const h = scoreRun ? scorePanel(v) : '';
  if (E.scp.dataset.h !== h) { E.scp.innerHTML = h; E.scp.dataset.h = h; }
  E.scp.hidden = !h;
}
function startScoring(v, instant) {
  const res = v.res, M = gm(v), G = geo(M);
  const f = v.endDur ? Math.max(.05, v.endDur / scoreDur(res)) : 1;
  const steps = [];
  res.rows.forEach(row => { steps.push({ k: 'pl', pi: row.pi, d: 500 }); row.tix.forEach(t => steps.push({ k: 'tix', pi: row.pi, t, d: 650 })); });
  steps.push({ k: 'long', d: 1300 });
  if (v.opt.gez) steps.push({ k: 'gez', d: 900 });
  if (v.opt.ist) steps.push({ k: 'st', d: 700 });
  scoreRun = { steps, i: -1, cur: -1, done: false, tot: res.rows.map(x => x.route), shown: res.rows.map(() => ({ tix: 0, long: 0, gez: 0, st: 0 })), hi: null };
  sel = null; tixHi = -1; hlColor = -1;
  if (cam) camFit(instant ? 0 : 450);
  const finishAll = () => {
    res.rows.forEach((x, i) => { scoreRun.shown[i] = { tix: x.tixPts, long: x.longBonus, gez: x.gez, st: x.stPts }; scoreRun.tot[i] = x.total; });
    scoreRun.done = true; scoreRun.cur = -1;
    const w = res.order[0], lp = res.rows[w].longPath || [];
    scoreRun.hi = { under: lp.map(rid => `<path class="bt-hlt done" d="${G.routes[rid].d}" style="--pc:${v.players[w].color}"/>`).join('') };
    if (V) render(V);
  };
  if (instant) { finishAll(); return; }
  const next = () => {
    if (!scoreRun || !V) return;
    const sr = scoreRun; sr.i++;
    if (sr.i >= sr.steps.length) { finishAll(); return; }
    const s = sr.steps[sr.i];
    if (s.k === 'pl') { sr.cur = s.pi; sr.hi = null; }
    else if (s.k === 'tix') {
      const t = s.t, row = res.rows[s.pi], col = v.players[s.pi].color, a = M.cities[t.a], b = M.cities[t.b];
      sr.shown[s.pi].tix += t.done ? t.p : -t.p; sr.tot[s.pi] += t.done ? t.p : -t.p;
      if (t.done) {
        const path = pathOwned(v, s.pi, t.a, t.b, row.borrowed);
        sr.hi = { under: path.map(rid => `<path class="bt-hlt done" d="${G.routes[rid].d}" style="--pc:${col}"/>`).join(''), over: `<circle class="bt-cring ok" cx="${a.x}" cy="${a.y}" r="17"/><circle class="bt-cring ok" cx="${b.x}" cy="${b.y}" r="17"/>` };
        Sound.good();
      } else {
        sr.hi = { over: `<line class="bt-hlx" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/><circle class="bt-cring no" cx="${a.x}" cy="${a.y}" r="17"/><circle class="bt-cring no" cx="${b.x}" cy="${b.y}" r="17"/>` };
        Sound.bad();
      }
      const [sx, sy] = toScreen((a.x + b.x) / 2, (a.y + b.y) / 2);
      floatTxt(sx, sy, `${t.done ? '✓ +' : '✗ −'}${t.p}`, t.done ? 'ok' : 'no');
    } else if (s.k === 'long') {
      sr.cur = -1;
      const win = res.rows.filter(x => x.longBonus);
      sr.hi = { under: win.map(x => (x.longPath || []).map(rid => `<path class="bt-hlt done" d="${G.routes[rid].d}" style="--pc:${v.players[x.pi].color}"/>`).join('')).join('') };
      win.forEach(x => { sr.shown[x.pi].long = x.longBonus; sr.tot[x.pi] += x.longBonus; });
      if (win.length) { banner(`EN UZUN HAT +${LONG_BONUS}`, 'good'); Sound.solve(); }
    } else if (s.k === 'gez') {
      const win = res.rows.filter(x => x.gez);
      win.forEach(x => { sr.shown[x.pi].gez = x.gez; sr.tot[x.pi] += x.gez; });
      if (win.length) { banner(`GEZGİN +${GEZ_BONUS}`, 'pink'); Sound.special(); }
    } else if (s.k === 'st') {
      res.rows.forEach(x => { if (x.stPts) { sr.shown[x.pi].st = x.stPts; sr.tot[x.pi] += x.stPts; } });
    }
    if (V) render(V);
    later(s.d * f, next);
  };
  later(600 * f, next);
}

/* ---------- ana çizim ---------- */
function render(v) {
  const prev = V; V = v;
  const M = gm(v);
  if (mapKey !== M.id) {
    mapKey = M.id; const b = M.box;
    E.svg.setAttribute('viewBox', `${b.x} ${b.y} ${b.w} ${b.h}`); E.svg.setAttribute('width', b.w); E.svg.setAttribute('height', b.h);
    E.board.style.width = b.w + 'px'; E.board.style.height = b.h + 'px';
    E.gStatic.innerHTML = staticSVG(M);
    if (!cam) cam = { s: 1, x: 0, y: 0 };
    camFit(0);
  }
  // yeni alınan hatlar → animasyon
  if (prev && !firstRender) {
    v.own.forEach((o, r) => { if (o >= 0 && prev.own[r] < 0) { newRoutes.set(r, Date.now()); runTrain(r, o); whistle(); const g = geo(M).routes[r]; const [sx, sy] = toScreen(g.mid[0], g.mid[1]); later(300, () => floatTxt(sx, sy, `+${PTS[M.routes[r].len]}`, 'gold')); } });
  }
  newRoutes.forEach((t, r) => { if (Date.now() - t > 2500) newRoutes.delete(r); });
  if (sel && sel.k === 'r' && v.own[sel.id] >= 0 && prev && prev.own[sel.id] < 0) { sel = null; draft = null; }
  if (v.phase === 'over' && v.res && !scoreRun) startScoring(v, firstRender);
  if (v.phase !== 'over' && scoreRun) scoreRun = null;
  if (hlColor >= 0 && (!myTurn(v) || v.drew)) hlColor = -1;
  if (!veiled(v) && (pendingPick(v) >= 0 || myTurn(v))) curtainOK = viewerPi(v);
  renderRoutes(v);
  renderCities(v);
  renderHi(v);
  renderPlayers(v);
  renderHud(v);
  renderMarket(v);
  renderHand(v);
  renderTix(v);
  renderModal(v);
  renderScore(v);
  root.querySelector('.bt').classList.toggle('picking', myTurn(v) && !v.drew && !v.sub);
  root.querySelector('.bt').classList.toggle('over', v.phase === 'over');
  firstRender = false;
}
function nearest(v, bx, by) {
  const M = gm(v), G = geo(M);
  let best = null, bd = 1e9;
  M.routes.forEach(R => {
    const pts = G.routes[R.id].poly;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((bx - x1) * dx + (by - y1) * dy) / L2)), d = Math.hypot(bx - (x1 + dx * t), by - (y1 + dy * t));
      if (d < bd) { bd = d; best = { k: 'r', id: R.id }; }
    }
  });
  let cb = null, cd = 1e9;
  M.cities.forEach(c => { const d = Math.hypot(c.x - bx, c.y - by); if (d < cd) { cd = d; cb = { k: 'c', id: c.i }; } });
  const lim = Math.max(14, 16 / cam.s);
  if (cd <= (M.cities[cb.id].big ? 12.5 : 10.5) && cd < bd) return cb;
  return bd < lim ? best : (cd < lim * 1.4 ? cb : null);
}
function onClick(e) {
  if (moved) { moved = false; if (e.target.closest('.bt-vp')) { e.stopPropagation(); e.preventDefault(); return; } }
  const v = V; if (!v) return;
  const b = e.target.closest('[data-a]');
  if (b) {
    if (b.disabled) return;
    const a = b.dataset.a, pi = b.dataset.pi != null ? +b.dataset.pi : -1;
    Sound.init();
    switch (a) {
      case 'draw': send({ t: 'draw', i: +b.dataset.i }); sel = null; break;
      case 'tickets': send({ t: 'tickets' }); sel = null; break;
      case 'hl': { const c = +b.dataset.c; hlColor = hlColor === c ? -1 : c; if (hlColor >= 0 && !isDesk() && cam.s > fitScale() * 1.05) camFit(260); break; }
      case 'tix': { const id = +b.dataset.id; tixHi = tixHi === id ? -1 : id; if (tixHi >= 0) { const M = gm(v), t = M.tickets[id], A = M.cities[t.a], B = M.cities[t.b]; frame([A.x, B.x], [A.y, B.y], 420); } break; }
      case 'tixToggle': tixOpen = !tixOpen; break;
      case 'pk': { const id = +b.dataset.id; if (pickSel) { if (pickSel.has(id)) pickSel.delete(id); else pickSel.add(id); E.pickHover = id; } break; }
      case 'keep': if (pickSel) { send({ t: 'keep', ids: [...pickSel] }, pi); pickKey = ''; } break;
      case 'tl': if (tunSel) tunSel.L += +b.dataset.d; break;
      case 'tpay': if (E.tunPay) send({ t: 'tpay', pay: E.tunPay }); break;
      case 'tno': send({ t: 'tno' }); break;
      case 'pc': if (draft) { draft.c = +b.dataset.c; draft.L = 0; } break;
      case 'pl': if (draft) draft.L += +b.dataset.d; break;
      case 'claim': if (sel && sel.k === 'r' && draft) { const R = gm(v).routes[sel.id]; send({ t: 'claim', r: R.id, pay: draftPay(R.len, draft) }); sel = null; draft = null; hlColor = -1; } break;
      case 'station': if (sel && sel.k === 'c' && draft) { const p = v.players[viewerPi(v)], cost = STATIONS - p.st + 1; send({ t: 'station', c: sel.id, pay: draftPay(cost, draft) }); sel = null; draft = null; } break;
      case 'unsel': sel = null; draft = null; break;
      case 'reveal': curtainOK = pi; break;
      case 'pinfo': E.info = pi; break;
      case 'closeModal': E.info = -1; break;
      case 'zin': { const [w, h] = vpSize(); zoomAt(1.4, w / 2, h / 2, 220); break; }
      case 'zout': { const [w, h] = vpSize(); zoomAt(1 / 1.4, w / 2, h / 2, 220); break; }
      case 'fit': camFit(300); break;
      default: break;
    }
    if (V) render(V);
    return;
  }
  if (e.target.closest('.bt-vp')) {
    if (scoreRun && !scoreRun.done) return;
    const [bx, by] = toBoard(e.clientX, e.clientY);
    const L = liveCam();
    if (!fine() && (L ? L.s : cam.s) < .5) { const r = E.vp.getBoundingClientRect(); zoomAt(Math.min(2.6, .82 / cam.s), e.clientX - r.left, e.clientY - r.top, 280); return; }
    const hit = nearest(v, bx, by);
    if (!hit) { if (sel) { sel = null; draft = null; render(v); } return; }
    if (!sel || sel.k !== hit.k || sel.id !== hit.id) draft = null;
    sel = hit; Sound.tick && Sound.tick(.3);
    render(v);
    return;
  }
  if (e.target === E.modal && E.info >= 0) { E.info = -1; render(v); }
}
function onKey(e) { if (e.key === 'Escape' && (sel || E.info >= 0 || hlColor >= 0 || tixHi >= 0)) { sel = null; draft = null; E.info = -1; hlColor = -1; tixHi = -1; if (V) render(V); } }
function mount(r, api) {
  root = r; ui = api; V = null; cam = null; mapKey = ''; firstRender = true; sel = null; draft = null; tixHi = -1; hlColor = -1; lastHuman = -1; curtainOK = -1; tixOpen = false; labelK = -1;
  scoreRun = null; newRoutes = new Map(); pickSel = null; pickKey = ''; tunSel = null; lastHand = null; pointers = new Map(); drag = null; moved = false; timers = [];
  root.innerHTML = `<div class="g-wrap bt">
    <div class="bt-top"><div class="bt-players"></div><div class="bt-track"></div></div>
    <div class="bt-stage"><div class="bt-vp">
      <div class="bt-board"><svg class="bt-svg" xmlns="http://www.w3.org/2000/svg" aria-label="Türkiye hat haritası"><g class="bt-static"></g><g class="bt-under"></g><g class="bt-routes"></g><g class="bt-over"></g><g class="bt-cities"></g><g class="bt-labels"></g><g class="bt-fx"></g></svg></div>
      <div class="bt-vpctl"><button type="button" class="bt-ibtn" data-a="zin" aria-label="Yakınlaştır">＋</button><button type="button" class="bt-ibtn" data-a="zout" aria-label="Uzaklaştır">－</button><button type="button" class="bt-ibtn" data-a="fit" aria-label="Tüm harita">⤢</button></div>
      <div class="bt-hint">🔍 Yakınlaştırmak için dokun · iki parmakla büyüt</div>
      <div class="bt-stamp"></div>
    </div><div class="bt-scp" hidden></div></div>
    <div class="bt-hud"><div class="bt-htop"></div><div class="bt-hmsg"></div></div>
    <div class="bt-mkt"></div>
    <div class="bt-hand"></div>
    <div class="bt-tixp"></div>
    <div class="bt-sheet" hidden></div>
    <div class="bt-modal" hidden></div>
  </div>`;
  const q = s => root.querySelector(s);
  E = { vp: q('.bt-vp'), board: q('.bt-board'), svg: q('.bt-svg'), gStatic: q('.bt-static'), gUnder: q('.bt-under'), gRoutes: q('.bt-routes'), gOver: q('.bt-over'), gCities: q('.bt-cities'), gLabels: q('.bt-labels'), gFx: q('.bt-fx'),
    pl: q('.bt-players'), track: q('.bt-track'), hTop: q('.bt-htop'), hMsg: q('.bt-hmsg'), mkt: q('.bt-mkt'), hand: q('.bt-hand'), tix: q('.bt-tixp'), sheet: q('.bt-sheet'), modal: q('.bt-modal'), scp: q('.bt-scp'), stamp: q('.bt-stamp'),
    info: -1, pickHover: -1, minorOn: null, tunPay: null };
  root.addEventListener('click', onClick, true);
  E.vp.addEventListener('pointerdown', onPointerDown);
  addEventListener('pointermove', onPointerMove); addEventListener('pointerup', onPointerUp); addEventListener('pointercancel', onPointerUp);
  E.vp.addEventListener('wheel', onWheel, { passive: false });
  addEventListener('resize', onResize); addEventListener('keydown', onKey);
}

DEF.mount = mount;
DEF.render = render;
DEF.onEvent = function (e) {
  if (!V || !root) return;
  const me = viewerPi(V);
  switch (e.t) {
    case 'draw': {
      cardSnd();
      const from = e.i >= 0 ? E.mkt.querySelectorAll('.bt-fc')[e.i] : E.mkt.querySelector('.bt-deck');
      const to = e.pi === me && !veiled(V) ? E.hand : E.pl.querySelector(`.bt-pl[data-pi="${e.pi}"]`);
      flyEl(e.c >= 0 ? 'bt-card c' + e.c : 'bt-card back', e.c >= 0 ? cardFace(e.c, true) : '', from, to, 0, 620);
      break;
    }
    case 'tdraw': case 'keep': if (e.t === 'tdraw') { Sound.whoosh(); flyEl('bt-card bt-tdeck', '<span class="bt-cb">🎫</span>', E.mkt.querySelector('.bt-tdeck'), E.pl.querySelector(`.bt-pl[data-pi="${e.pi}"]`), 0, 650); } else cardSnd(); break;
    case 'reface': Sound.whoosh(); stamp('🔄 3 lokomotif: kartlar yenilendi'); break;
    case 'tunnel': {
      Sound.whoosh();
      if (e.pi !== actor(V)) stamp(`⛰️ ${e.drawn.map(c => `<span class="bt-mc c${c}">${c === LOCO ? '🚂' : ''}</span>`).join('')} ${e.extra ? `+${e.extra}` : '✓'}`, e.extra ? 'bad' : 'good');
      if (!e.extra) setTimeout(() => Sound.good(), 300);
      break;
    }
    case 'tno': Sound.bad(); break;
    case 'station': Sound.buy(); break;
    case 'final': Sound.special(); banner('SON TUR!', 'pink'); break;
    case 'start': Sound.special(); break;
    case 'turn':
      if (ui.mode === 'online' && e.pi === ui.me) { Sound.good(); banner('SIRA SENDE', 'good'); }
      else if (ui.mode === 'local' && multiHot(V) && V.players[e.pi] && !V.players[e.pi].isBot) banner(V.players[e.pi].name.toLocaleUpperCase('tr-TR'));
      break;
    case 'end': Sound.fanfare(); break;
    default: break;
  }
};
DEF.unmount = function () {
  timers.forEach(clearTimeout); timers = [];
  if (root) root.removeEventListener('click', onClick, true);
  removeEventListener('pointermove', onPointerMove); removeEventListener('pointerup', onPointerUp); removeEventListener('pointercancel', onPointerUp);
  removeEventListener('resize', onResize); removeEventListener('keydown', onKey);
  document.querySelectorAll('.bt-fly, .bt-float').forEach(d => d.remove());
  root = null; V = null; E = {}; cam = null; scoreRun = null;
};
CFX.registerGame(DEF);
})();
