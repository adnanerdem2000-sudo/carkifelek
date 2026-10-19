/* =========================================================================
   OYUN SALONU — KARO DİYARI
   Karo döşeme oyunu: torbadan karo çek, döndür, kenarları uyacak biçimde
   haritaya ekle; istersen Kahya'nı yola, şehre, kervansaraya ya da tarlaya
   koy. Tamamlanan yerler hemen puan verir. 72 karo (ya da kısa 40), nehirli
   başlangıç seçeneği, çiftçiler. 2–6 kişi: online, aynı cihaz ya da bilgisayar.
   Tüm bilgi açıktır; yalnızca torbadaki karoların sırası gizlidir.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, initial, shuffle } = CFX;

/* ------------------------------------------------------------------ karolar
   Kapılar (port): her kenar 3 dilim, saat yönünde: K 0,1,2 · D 3,4,5 · G 6,7,8 · B 9,10,11
   (orta dilim 1,4,7,10 yol/nehir yeridir). Özellik türleri: c şehir, r yol,
   f tarla, k kervansaray, w nehir. a = Kahya noktası, e = tek uçlu yolun bittiği yer. */
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const ALL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const KR = { c: 'C', r: 'R', f: 'F', w: 'W' };
const RAW = {
  A: { n: 2, s: 1, f: [{ t: 'k', a: [50, 44] }, { t: 'r', p: [7], a: [50, 86], e: [50, 63] }, { t: 'f', p: [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11], a: [16, 16] }] },
  B: { n: 4, s: 2, f: [{ t: 'k', a: [50, 50] }, { t: 'f', p: ALL, a: [16, 16] }] },
  C: { n: 1, s: 1, f: [{ t: 'c', p: ALL, sh: 1, a: [50, 52] }] },
  D: { n: 4, s: 2, f: [{ t: 'c', p: [0, 1, 2], a: [50, 11] }, { t: 'r', p: [4, 10], a: [30, 50] }, { t: 'f', p: [3, 11], adj: [0], a: [80, 34] }, { t: 'f', p: [5, 6, 7, 8, 9], a: [50, 78] }] },
  E: { n: 5, s: 3, f: [{ t: 'c', p: [0, 1, 2], a: [50, 11] }, { t: 'f', p: [3, 4, 5, 6, 7, 8, 9, 10, 11], adj: [0], a: [50, 64] }] },
  F: { n: 2, s: 1, f: [{ t: 'c', p: [3, 4, 5, 9, 10, 11], sh: 1, a: [44, 50] }, { t: 'f', p: [0, 1, 2], adj: [0], a: [50, 8] }, { t: 'f', p: [6, 7, 8], adj: [0], a: [50, 92] }] },
  G: { n: 1, s: 0, f: [{ t: 'c', p: [3, 4, 5, 9, 10, 11], a: [50, 50] }, { t: 'f', p: [0, 1, 2], adj: [0], a: [50, 8] }, { t: 'f', p: [6, 7, 8], adj: [0], a: [50, 92] }] },
  H: { n: 3, s: 2, f: [{ t: 'c', p: [3, 4, 5], a: [89, 50] }, { t: 'c', p: [9, 10, 11], a: [11, 50] }, { t: 'f', p: [0, 1, 2, 6, 7, 8], adj: [0, 1], a: [50, 50] }] },
  I: { n: 2, s: 1, f: [{ t: 'c', p: [0, 1, 2], a: [56, 11] }, { t: 'c', p: [9, 10, 11], a: [11, 56] }, { t: 'f', p: [3, 4, 5, 6, 7, 8], adj: [0, 1], a: [64, 64] }] },
  J: { n: 3, s: 2, f: [{ t: 'c', p: [0, 1, 2], a: [50, 11] }, { t: 'r', p: [4, 7], a: [63, 63] }, { t: 'f', p: [5, 6], a: [87, 87] }, { t: 'f', p: [3, 8, 9, 10, 11], adj: [0], a: [28, 52] }] },
  K: { n: 3, s: 2, f: [{ t: 'c', p: [0, 1, 2], a: [50, 11] }, { t: 'r', p: [7, 10], a: [37, 63] }, { t: 'f', p: [8, 9], a: [13, 87] }, { t: 'f', p: [3, 4, 5, 6, 11], adj: [0], a: [72, 52] }] },
  L: { n: 3, s: 2, f: [{ t: 'c', p: [0, 1, 2], a: [50, 11] }, { t: 'r', p: [4], a: [84, 50], e: [50, 50] }, { t: 'r', p: [7], a: [50, 84], e: [50, 50] }, { t: 'r', p: [10], a: [16, 50], e: [50, 50] },
    { t: 'f', p: [3, 11], adj: [0], a: [80, 33] }, { t: 'f', p: [5, 6], a: [82, 82] }, { t: 'f', p: [8, 9], a: [18, 82] }] },
  M: { n: 2, s: 1, f: [{ t: 'c', p: [0, 1, 2, 9, 10, 11], sh: 1, a: [24, 24] }, { t: 'f', p: [3, 4, 5, 6, 7, 8], adj: [0], a: [72, 72] }] },
  N: { n: 3, s: 2, f: [{ t: 'c', p: [0, 1, 2, 9, 10, 11], a: [26, 26] }, { t: 'f', p: [3, 4, 5, 6, 7, 8], adj: [0], a: [72, 72] }] },
  O: { n: 2, s: 1, f: [{ t: 'c', p: [0, 1, 2, 9, 10, 11], sh: 1, a: [22, 22] }, { t: 'r', p: [4, 7], a: [64, 64] }, { t: 'f', p: [5, 6], a: [88, 88] }, { t: 'f', p: [3, 8], adj: [0], a: [80, 26] }] },
  P: { n: 3, s: 2, f: [{ t: 'c', p: [0, 1, 2, 9, 10, 11], a: [24, 24] }, { t: 'r', p: [4, 7], a: [64, 64] }, { t: 'f', p: [5, 6], a: [88, 88] }, { t: 'f', p: [3, 8], adj: [0], a: [80, 26] }] },
  Q: { n: 1, s: 1, f: [{ t: 'c', p: [0, 1, 2, 3, 4, 5, 9, 10, 11], sh: 1, a: [50, 34] }, { t: 'f', p: [6, 7, 8], adj: [0], a: [50, 90] }] },
  R: { n: 3, s: 1, f: [{ t: 'c', p: [0, 1, 2, 3, 4, 5, 9, 10, 11], a: [50, 36] }, { t: 'f', p: [6, 7, 8], adj: [0], a: [50, 90] }] },
  S: { n: 2, s: 1, f: [{ t: 'c', p: [0, 1, 2, 3, 4, 5, 9, 10, 11], sh: 1, a: [50, 32] }, { t: 'r', p: [7], a: [50, 89], e: [50, 72] }, { t: 'f', p: [6], adj: [0], a: [82, 92] }, { t: 'f', p: [8], adj: [0], a: [18, 92] }] },
  T: { n: 1, s: 0, f: [{ t: 'c', p: [0, 1, 2, 3, 4, 5, 9, 10, 11], a: [50, 34] }, { t: 'r', p: [7], a: [50, 89], e: [50, 72] }, { t: 'f', p: [6], adj: [0], a: [82, 92] }, { t: 'f', p: [8], adj: [0], a: [18, 92] }] },
  U: { n: 8, s: 4, f: [{ t: 'r', p: [1, 7], a: [50, 50] }, { t: 'f', p: [2, 3, 4, 5, 6], a: [78, 50] }, { t: 'f', p: [8, 9, 10, 11, 0], a: [22, 50] }] },
  V: { n: 9, s: 5, f: [{ t: 'r', p: [7, 10], a: [37, 63] }, { t: 'f', p: [8, 9], a: [13, 87] }, { t: 'f', p: [0, 1, 2, 3, 4, 5, 6, 11], a: [68, 34] }] },
  W: { n: 4, s: 2, f: [{ t: 'r', p: [4], a: [84, 50], e: [50, 50] }, { t: 'r', p: [7], a: [50, 84], e: [50, 50] }, { t: 'r', p: [10], a: [16, 50], e: [50, 50] },
    { t: 'f', p: [11, 0, 1, 2, 3], a: [50, 20] }, { t: 'f', p: [5, 6], a: [82, 82] }, { t: 'f', p: [8, 9], a: [18, 82] }] },
  X: { n: 1, s: 1, f: [{ t: 'r', p: [1], a: [50, 16], e: [50, 50] }, { t: 'r', p: [4], a: [84, 50], e: [50, 50] }, { t: 'r', p: [7], a: [50, 84], e: [50, 50] }, { t: 'r', p: [10], a: [16, 50], e: [50, 50] },
    { t: 'f', p: [2, 3], a: [82, 18] }, { t: 'f', p: [5, 6], a: [82, 82] }, { t: 'f', p: [8, 9], a: [18, 82] }, { t: 'f', p: [11, 0], a: [18, 18] }] },
  // nehir karoları (Nehir başlangıcı)
  ka: { n: 1, river: 1, f: [{ t: 'w', p: [7], e: [50, 50] }, { t: 'f', p: [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11], a: [22, 22] }] },
  go: { n: 1, river: 1, f: [{ t: 'w', p: [1], e: [50, 54] }, { t: 'f', p: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], a: [20, 84] }] },
  rd: { n: 3, river: 1, f: [{ t: 'w', p: [1, 7] }, { t: 'f', p: [2, 3, 4, 5, 6], a: [80, 50] }, { t: 'f', p: [8, 9, 10, 11, 0], a: [20, 50] }] },
  rk: { n: 2, river: 1, f: [{ t: 'w', p: [7, 10] }, { t: 'f', p: [8, 9], a: [13, 87] }, { t: 'f', p: [0, 1, 2, 3, 4, 5, 6, 11], a: [68, 34] }] },
  rb: { n: 1, river: 1, f: [{ t: 'w', p: [1, 7] }, { t: 'r', p: [4, 10], a: [80, 50] }, { t: 'f', p: [2, 3], a: [80, 20] }, { t: 'f', p: [5, 6], a: [80, 80] }, { t: 'f', p: [8, 9], a: [20, 80] }, { t: 'f', p: [11, 0], a: [20, 20] }] },
  ry: { n: 1, river: 1, f: [{ t: 'w', p: [7, 10] }, { t: 'r', p: [1, 4], a: [63, 37] }, { t: 'f', p: [2, 3], a: [87, 13] }, { t: 'f', p: [8, 9], a: [13, 87] }, { t: 'f', p: [0, 5, 6, 11], a: [50, 50] }] },
  rs: { n: 1, river: 1, f: [{ t: 'w', p: [1, 7] }, { t: 'c', p: [3, 4, 5], a: [89, 50] }, { t: 'c', p: [9, 10, 11], a: [11, 50] }, { t: 'f', p: [2, 6], adj: [1], a: [70, 82] }, { t: 'f', p: [8, 0], adj: [2], a: [30, 18] }] },
  rc: { n: 1, river: 1, f: [{ t: 'w', p: [7, 10] }, { t: 'c', p: [0, 1, 2, 3, 4, 5], a: [74, 26] }, { t: 'f', p: [8, 9], a: [13, 87] }, { t: 'f', p: [6, 11], adj: [1], a: [40, 40] }] },
  rm: { n: 1, river: 1, f: [{ t: 'w', p: [7, 10] }, { t: 'k', a: [64, 34], z: 0.8 }, { t: 'r', p: [4], a: [90, 50], e: [82, 44] }, { t: 'f', p: [8, 9], a: [13, 87] }, { t: 'f', p: [0, 1, 2, 3, 5, 6, 11], a: [24, 22] }] }
};
const TD = {};
Object.keys(RAW).forEach(key => {
  const R0 = RAW[key];
  const f = R0.f.map(x => {
    const p = x.p ? x.p.slice() : [];
    const sides = [...new Set(p.map(q => Math.floor(q / 3)))].sort((a, b) => a - b);
    return { t: x.t, p, sh: x.sh ? 1 : 0, adj: x.adj || [], a: x.a || [50, 50], e: x.e || null, z: x.z || 1, sides };
  });
  const port = Array(12).fill(-1);
  f.forEach((x, fi) => x.p.forEach(q => { port[q] = fi; }));
  const edges = [0, 1, 2, 3].map(s => KR[f[port[s * 3 + 1]].t]);
  // döndürülmüş tablolar: PF[r][yerleşik kapı] = fi, FS[r][fi] = yerleşik kenarlar
  const PF = [0, 1, 2, 3].map(r => { const a = Array(12).fill(-1); port.forEach((fi, q) => { a[(q + 3 * r) % 12] = fi; }); return a; });
  const FS = [0, 1, 2, 3].map(r => f.map(x => x.sides.map(s => (s + r) % 4)));
  TD[key] = { key, n: R0.n, short: R0.s != null ? R0.s : 0, river: !!R0.river, f, port, edges, PF, FS, kerv: f.findIndex(x => x.t === 'k') };
});
const BASE_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWX'.split('');
const RIVER_KEYS = ['ka', 'go', 'rd', 'rk', 'rb', 'ry', 'rs', 'rc', 'rm'];
const TYPE_NAME = { c: 'Şehir', r: 'Yol', f: 'Tarla', k: 'Kervansaray', w: 'Nehir' };
const TYPE_ACC = { c: 'şehri', r: 'yolu', f: 'tarlayı', k: 'kervansarayı' };
const TYPE_IC = { c: '🏰', r: '🚶', f: '🌾', k: '🐪' };
const MEEPLES = 7;

const keyOf = (x, y) => x + ',' + y;
const edgeAt = (k, r, s) => TD[k].edges[(s - r + 4) % 4];
function rotPt(pt, r) { let [x, y] = pt; for (let i = 0; i < r; i++) [x, y] = [100 - y, x]; return [x, y]; }
const anchorOf = (t, fi) => { const [x, y] = rotPt(TD[t.k].f[fi].a, t.r); return [t.x * 100 + x, t.y * 100 + y]; };
function gridOf(tiles) { const g = {}; tiles.forEach((t, i) => { g[keyOf(t.x, t.y)] = i; }); return g; }

/* ------------------------------------------------------------------ kurallar */
function fits(tiles, grid, k, x, y, r) {
  if (grid[keyOf(x, y)] != null) return false;
  let any = false;
  for (let s = 0; s < 4; s++) {
    const nb = grid[keyOf(x + DX[s], y + DY[s])]; if (nb == null) continue;
    any = true;
    const u = tiles[nb];
    if (edgeAt(k, r, s) !== edgeAt(u.k, u.r, (s + 2) % 4)) return false;
  }
  return any;
}
// nehir: açık ucun tam karşısına, akış yönünde; aynı yöne art arda dönülmez, çıkış hücresi boş olmalı
function riverInfo(k, r, rv) {
  const e = (rv.d + 2) % 4;
  if (edgeAt(k, r, e) !== 'W') return null;
  const ex = [0, 1, 2, 3].filter(s => s !== e && edgeAt(k, r, s) === 'W');
  if (!ex.length) return { exit: -1, turn: 0 };
  const turn = (ex[0] - rv.d + 4) % 4;
  return { exit: ex[0], turn };
}
function riverOk(tiles, grid, rv, k, x, y, r) {
  if (!rv || x !== rv.x + DX[rv.d] || y !== rv.y + DY[rv.d]) return false;
  const inf = riverInfo(k, r, rv); if (!inf) return false;
  if (inf.exit >= 0) {
    if (inf.turn === 2) return false;
    if (inf.turn !== 0 && inf.turn === rv.t) return false;
    if (grid[keyOf(x + DX[inf.exit], y + DY[inf.exit])] != null) return false;
  }
  return true;
}
function canPlace(tiles, grid, rv, k, x, y, r) {
  if (!TD[k] || !fits(tiles, grid, k, x, y, r)) return false;
  if (TD[k].river) return riverOk(tiles, grid, rv, k, x, y, r);
  return true;
}
function frontier(tiles, grid) {
  const out = [], seen = new Set();
  tiles.forEach(t => { for (let s = 0; s < 4; s++) { const x = t.x + DX[s], y = t.y + DY[s], kk = keyOf(x, y); if (grid[kk] == null && !seen.has(kk)) { seen.add(kk); out.push([x, y]); } } });
  return out;
}
function spotsFor(tiles, grid, rv, k) {
  if (!TD[k]) return [];
  const cells = TD[k].river ? (rv ? [[rv.x + DX[rv.d], rv.y + DY[rv.d]]] : []) : frontier(tiles, grid);
  const out = [];
  cells.forEach(([x, y]) => { const rs = [0, 1, 2, 3].filter(r => canPlace(tiles, grid, rv, k, x, y, r)); if (rs.length) out.push({ x, y, rs }); });
  return out;
}

// bağlı özellikler: birleşim-bul (düğüm = karoSırası*8 + özellikSırası)
function analyze(tiles, grid, meeples) {
  const N = tiles.length * 8, par = new Int32Array(N);
  for (let i = 0; i < N; i++) par[i] = i;
  const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) par[b] = a; };
  tiles.forEach((t, ti) => {
    for (const s of [1, 2]) {
      const nb = grid[keyOf(t.x + DX[s], t.y + DY[s])]; if (nb == null) continue;
      const u = tiles[nb], pa = TD[t.k].PF[t.r], pb = TD[u.k].PF[u.r], o = (s + 2) % 4;
      for (let q = 0; q < 3; q++) uni(ti * 8 + pa[s * 3 + q], nb * 8 + pb[o * 3 + (2 - q)]);
    }
  });
  const comps = new Map();
  tiles.forEach((t, ti) => {
    const d = TD[t.k];
    d.f.forEach((f, fi) => {
      const id = ti * 8 + fi, root = find(id);
      let c = comps.get(root);
      if (!c) { c = { t: f.t, root, tiles: new Set(), sh: 0, open: 0, nodes: [], mee: [], cities: null, nb: 0 }; comps.set(root, c); }
      c.tiles.add(ti); c.nodes.push(id); c.sh += f.sh;
      d.FS[t.r][fi].forEach(s => { if (grid[keyOf(t.x + DX[s], t.y + DY[s])] == null) c.open++; });
      if (f.t === 'k') { let n = 0; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && grid[keyOf(t.x + dx, t.y + dy)] != null) n++; c.nb = n; c.open = 8 - n; }
    });
  });
  tiles.forEach((t, ti) => TD[t.k].f.forEach((f, fi) => {
    if (f.t !== 'f') return;
    const c = comps.get(find(ti * 8 + fi)); if (!c.cities) c.cities = new Set();
    f.adj.forEach(a => c.cities.add(find(ti * 8 + a)));
  }));
  (meeples || []).forEach(m => { const c = comps.get(find(m.ti * 8 + m.fi)); if (c) c.mee.push(m.pi); });
  return { find, comps, root: (ti, fi) => find(ti * 8 + fi) };
}
function winners(mee) {
  if (!mee.length) return [];
  const cnt = {}; mee.forEach(p => { cnt[p] = (cnt[p] || 0) + 1; });
  const mx = Math.max(...Object.values(cnt));
  return Object.keys(cnt).filter(p => cnt[p] === mx).map(Number).sort((a, b) => a - b);
}
function compPts(c, done) {
  if (c.t === 'r') return c.tiles.size;
  if (c.t === 'c') return done ? 2 * (c.tiles.size + c.sh) : c.tiles.size + c.sh;
  if (c.t === 'k') return done ? 9 : 1 + c.nb;
  return 0;
}
function claimable(st, A, ti) {
  const t = st.tiles[ti], out = [];
  TD[t.k].f.forEach((f, fi) => {
    if (f.t === 'w' || (f.t === 'f' && !st.opts.farm)) return;
    const c = A.comps.get(A.root(ti, fi));
    if (c && !c.mee.length && !out.some(o => A.root(ti, o) === c.root)) out.push(fi);
  });
  return out;
}
const nodesOut = (st, nodes) => nodes.map(id => { const t = st.tiles[id >> 3]; return [t.x, t.y, t.k, t.r, id & 7]; });
const pn = (st, i) => st.players[i] ? st.players[i].name : '?';
const joinNames = (st, w) => w.map(i => pn(st, i)).join(' ve ');

function award(st, w, pts, type) {
  w.forEach(pi => { const p = st.players[pi]; p.score += pts; p.bd[type] = (p.bd[type] || 0) + pts; });
}
function returnMeeples(st, A, root) {
  st.meeples = st.meeples.filter(m => {
    if (A.find(m.ti * 8 + m.fi) !== root) return true;
    st.players[m.pi].mp++; return false;
  });
}
// hamle sonrası: tamamlanan yol / şehir / kervansaray hemen puanlanır
function resolvePlaced(st, ctx) {
  const ti = st.pend, t = st.tiles[ti];
  const A = analyze(st.tiles, st.grid, st.meeples);
  const items = [], seen = new Set();
  TD[t.k].f.forEach((f, fi) => {
    if (f.t !== 'r' && f.t !== 'c') return;
    const root = A.root(ti, fi); if (seen.has(root)) return; seen.add(root);
    const c = A.comps.get(root); if (c.open) return;
    const pts = compPts(c, true), w = winners(c.mee);
    items.push({ type: f.t, pts, win: w, nodes: nodesOut(st, c.nodes), at: anchorOf(t, fi), size: c.tiles.size, sh: c.sh });
    if (w.length) { award(st, w, pts, f.t); returnMeeples(st, A, root); }
  });
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const kti = st.grid[keyOf(t.x + dx, t.y + dy)]; if (kti == null) continue;
    const kt = st.tiles[kti], kf = TD[kt.k].kerv; if (kf < 0) continue;
    const root = A.root(kti, kf), c = A.comps.get(root);
    if (c.nb !== 8) continue;
    const w = winners(c.mee);
    items.push({ type: 'k', pts: 9, win: w, nodes: nodesOut(st, c.nodes), at: anchorOf(kt, kf), size: 9, sh: 0 });
    if (!w.length) continue;
    award(st, w, 9, 'k'); returnMeeples(st, A, root);
  }
  if (items.length) {
    items.forEach(it => {
      if (!it.win.length) return;
      const what = it.type === 'c' ? `${it.size} karoluk şehri${it.sh ? ` (${it.sh} sancak)` : ''}` : it.type === 'r' ? `${it.size} karoluk yolu` : 'kervansarayı';
      ctx.emit({ t: 'log' }, it.win.length > 1 ? `${joinNames(st, it.win)} ${what} paylaştı: +${it.pts}’er puan.` : `${pn(st, it.win[0])} ${what} tamamladı: +${it.pts} puan!`, it.pts >= 10 ? 'gold' : 'good');
    });
    ctx.emit({ t: 'score', items });
  }
}

function drawTile(st, ctx) {
  while (st.pile.length) {
    const k = st.pile.pop();
    if (spotsFor(st.tiles, st.grid, st.rv, k).length) { st.tile = k; st.phase = 'place'; st.mopts = []; st.pend = -1; return true; }
    st.disc.push(k);
    ctx.emit({ t: 'discard', k, pi: st.cur }, `Çekilen karo hiçbir yere uymadı; kenara kondu, yenisi çekiliyor.`, 'bad');
  }
  return false;
}
function nextTurn(st, ctx) {
  st.cur = (st.cur + 1) % st.players.length; st.turn++;
  st.bp = null;
  if (!drawTile(st, ctx)) { finalScore(st, ctx); return; }
  ctx.emit({ t: 'turn', pi: st.cur, k: st.tile });
  ctx.sync();
}
function finishTurn(st, ctx) {
  resolvePlaced(st, ctx);
  st.last = st.pend; st.pend = -1; st.mopts = [];
  nextTurn(st, ctx);
}
function finalScore(st, ctx) {
  st.phase = 'over'; st.tile = null; st.pend = -1; st.mopts = [];
  const A = analyze(st.tiles, st.grid, st.meeples), items = [];
  A.comps.forEach(c => {
    if (!c.mee.length || c.t === 'f' || c.t === 'w') return;
    const pts = compPts(c, false), w = winners(c.mee);
    const n0 = c.nodes[0], t0 = st.tiles[n0 >> 3];
    items.push({ type: c.t, pts, win: w, nodes: nodesOut(st, c.nodes), at: anchorOf(t0, n0 & 7), size: c.tiles.size, sh: c.sh, end: 1 });
    award(st, w, pts, c.t);
  });
  if (st.opts.farm) {
    A.comps.forEach(c => {
      if (c.t !== 'f' || !c.mee.length) return;
      let n = 0; (c.cities || new Set()).forEach(r => { const cc = A.comps.get(r); if (cc && cc.t === 'c' && !cc.open) n++; });
      const pts = 3 * n, w = winners(c.mee);
      const mm = st.meeples.find(m => A.find(m.ti * 8 + m.fi) === c.root);
      items.push({ type: 'f', pts, win: w, nodes: [], at: anchorOf(st.tiles[mm.ti], mm.fi), cities: n, end: 1 });
      if (pts) award(st, w, pts, 'f');
    });
  }
  st.final = items;
  items.forEach(it => {
    if (!it.pts) return;
    const what = it.type === 'f' ? `tarlası (${it.cities} tamamlanmış şehir)` : `yarım kalan ${TYPE_NAME[it.type].toLocaleLowerCase('tr-TR')}`;
    ctx.emit({ t: 'log' }, `Oyun sonu: ${joinNames(st, it.win)} ${what} için +${it.pts}.`, 'gold');
  });
  ctx.emit({ t: 'final', items }, 'Torba boşaldı! Yarım kalanlar ve tarlalar sayılıyor…', 'gold');
  ctx.sync();
  ctx.later(Math.round(Math.min(2600, 900 + items.length * 260) * (DEF.speed || 1)), () => ctx.end(result(st)));
}
function result(st) {
  const order = st.players.map((p, i) => i).sort((a, b) => st.players[b].score - st.players[a].score || a - b);
  const top = st.players[order[0]].score, tie = order.filter(i => st.players[i].score === top);
  const bd = i => { const b = st.players[i].bd; return `Yol ${b.r || 0} · Şehir ${b.c || 0} · Kervansaray ${b.k || 0}${st.opts.farm ? ` · Tarla ${b.f || 0}` : ''}`; };
  return {
    title: tie.length > 1 ? `Berabere: ${joinNames(st, tie)}!` : `Diyarın hâkimi: ${pn(st, order[0])}!`,
    ranking: order.map(i => ({ pi: i, score: st.players[i].score, label: `${st.players[i].score} puan` })),
    note: order.map(i => `${pn(st, i)}: ${bd(i)}`).join('\n')
  };
}

/* ---------- bilgisayar: tüm yer/yön/Kahya seçeneklerini tartar ---------- */
function pDone(c, left) {
  if (!c.open) return 1;
  if (left <= 0) return 0;
  const o = c.open;
  const p = (0.95 - 0.2 * (o - 1) - (c.t === 'c' ? 0.08 : 0)) * Math.min(1, left / (4 * o));
  return Math.max(0.03, Math.min(0.93, p));
}
function evComp(c, A, left) {
  const g = Math.min(1, left / 25);
  if (c.t === 'r') return c.tiles.size + (c.open ? c.open * 1.1 * g : 0);
  if (c.t === 'c') {
    const p = pDone(c, left), base = c.tiles.size + c.sh + (c.open ? c.open * 0.8 * g : 0);
    return p * 2 * base + (1 - p) * (c.tiles.size + c.sh + c.open * 0.3 * g);
  }
  if (c.t === 'k') { if (c.nb === 8) return 9; const f = Math.min(0.9, left / (8 + 5 * (8 - c.nb))); return 1 + c.nb + (8 - c.nb) * f; }
  if (c.t === 'f') { let v = 0; (c.cities || new Set()).forEach(r => { const cc = A.comps.get(r); if (cc && cc.t === 'c') v += 3 * pDone(cc, left) * (cc.open ? 0.8 : 1); }); return v; }
  return 0;
}
function stake(c, me, A, left, n, farmEnd) {
  if (!c.mee.length) return 0;
  if (c.t === 'f' && !farmEnd) return 0;
  const w = winners(c.mee), ev = c.t === 'f' ? evComp(c, A, left) : (c.open || (c.t === 'k' && c.nb < 8) ? evComp(c, A, left) : compPts(c, true));
  const opp = n === 2 ? 0.95 : 0.65;
  let v = 0;
  if (w.includes(me)) v += ev;
  if (w.some(x => x !== me)) v -= opp * ev;
  if (!c.open && c.t !== 'f') v += 0.9 * c.mee.filter(x => x === me).length;   // Kahya geri döner
  return v;
}
function posValue(st, A, me, left) {
  let v = 0; const n = st.players.length;
  A.comps.forEach(c => { v += stake(c, me, A, left, n, st.opts.farm); });
  return v;
}
function mCost(type, left, mp, done) {
  if (done) return 0.15;
  const late = left / (left + 12), scarce = 1 + (MEEPLES - mp) * 0.2;
  const base = { r: 1.6, c: 2.1, k: 1.6, f: 6 }[type] || 2;
  return base * late * scarce + (mp <= 1 ? 1.5 * late : 0);
}
function botPlan(st, pi, withMeeple, noise) {
  const k = st.tile, left = st.pile.length, spots = spotsFor(st.tiles, st.grid, st.rv, k);
  const A0 = analyze(st.tiles, st.grid, st.meeples), V0 = posValue(st, A0, pi, left);
  const me = st.players[pi], n = st.players.length;
  let best = null;
  spots.forEach(sp => sp.rs.forEach(r => {
    const ti = st.tiles.length, kk = keyOf(sp.x, sp.y);
    st.tiles.push({ k, x: sp.x, y: sp.y, r, pi }); st.grid[kk] = ti;
    const A = analyze(st.tiles, st.grid, st.meeples);
    const val = posValue(st, A, pi, left) - V0;
    let bf = -1, bv = 0;
    if (withMeeple && me.mp > 0) {
      claimable(st, A, ti).forEach(fi => {
        const c = A.comps.get(A.root(ti, fi));
        if (c.t === 'f' && !st.opts.farm) return;
        const before = stake(c, pi, A, left, n, true);
        c.mee.push(pi);
        const after = stake(c, pi, A, left, n, true);
        c.mee.pop();
        const done = c.t === 'k' ? c.nb === 8 : (c.t !== 'f' && !c.open);
        const d = after - before - mCost(c.t, left, me.mp, done);
        if (d > bv) { bv = d; bf = fi; }
      });
    }
    const total = val + bv + (noise ? Math.random() * noise : 0);
    if (!best || total > best.v) best = { x: sp.x, y: sp.y, r, fi: bf, v: total };
    st.tiles.pop(); delete st.grid[kk];
  }));
  return best;
}

/* ------------------------------------------------------------------ sözleşme */
function placeTile(st, ctx, pi, x, y, r) {
  const k = st.tile, ti = st.tiles.length;
  const d = TD[k];
  let rvNext = st.rv;
  if (d.river) {
    const inf = riverInfo(k, r, st.rv);
    rvNext = inf.exit >= 0 ? { x, y, d: inf.exit, t: inf.turn !== 0 ? inf.turn : st.rv.t } : null;
  }
  st.tiles.push({ k, x, y, r, pi }); st.grid[keyOf(x, y)] = ti; st.rv = rvNext;
  st.pend = ti; st.tile = null; st.last = ti;
  ctx.emit({ t: 'place', pi, x, y, k, r, ti }, null);
  const A = analyze(st.tiles, st.grid, st.meeples);
  st.mopts = st.players[pi].mp > 0 ? claimable(st, A, ti) : [];
  if (!st.mopts.length) { finishTurn(st, ctx); return; }
  st.phase = 'meeple';
  ctx.sync();
}

let DEF = null;
DEF = {
  id: 'karodiyari', name: 'Karo Diyarı', icon: '🗺️', color: '#7cc35a', min: 2, max: 6, hotseat: true, bot: true, localMin: 1,
  tagline: 'Karo döşe, şehir kur, Kahya’larınla puan topla',
  rules: 'Sırayla torbadan karo çek, döndür ve tüm kenarları uyacak biçimde haritaya ekle; sonra istersen 7 Kahya’ndan birini o karodaki kimsenin tutmadığı bir yola, şehre, kervansaraya ya da tarlaya koy. Tamamlanan yol (karo başına 1), şehir (karo ve sancak başına 2) ve etrafı tamamen çevrili kervansaray (9) hemen puan verir ve Kahya geri döner; en çok Kahya’sı olan alır, eşitlikte herkes tam puan alır. Torba bitince yarım kalanlar yarım sayılır; Çiftçiler açıksa tarlada yatan Kahya’lar o tarlanın değdiği her tamamlanmış şehir için 3 puan alır.',
  options: [
    { key: 'farm', label: 'Çiftçiler', def: 'on', choices: [{ v: 'on', label: 'Açık' }, { v: 'off', label: 'Kapalı' }] },
    { key: 'size', label: 'Karo seti', def: '72', choices: [{ v: '72', label: 'Tam 72' }, { v: '40', label: 'Kısa 40' }] },
    { key: 'river', label: 'Nehir başlangıcı', def: 'off', choices: [{ v: 'off', label: 'Kapalı' }, { v: 'on', label: 'Açık' }] }
  ],
  speed: 1,
  get botDelay() { return Math.max(10, Math.round(850 * (DEF.speed || 1))); },
  setup(players, opts) {
    opts = opts || {};
    const o = { farm: opts.farm !== 'off', size: opts.size === '40' ? 40 : 72, river: opts.river === 'on' };
    const bag = [];
    BASE_KEYS.forEach(k => { const n = o.size === 40 ? TD[k].short : TD[k].n; for (let i = 0; i < n; i++) bag.push(k); });
    let start = 'D', pile;
    if (o.river) {
      start = 'ka';
      const mid = []; RIVER_KEYS.forEach(k => { if (k === 'ka' || k === 'go') return; for (let i = 0; i < TD[k].n; i++) mid.push(k); });
      pile = shuffle(bag).concat(['go'], shuffle(mid));          // sondan çekilir: önce nehir, en son göl
    } else {
      bag.splice(bag.indexOf('D'), 1);
      pile = shuffle(bag);
    }
    const st = {
      v: 1, opts: o,
      players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot, score: 0, mp: MEEPLES, bd: { r: 0, c: 0, k: 0, f: 0 } })),
      tiles: [{ k: start, x: 0, y: 0, r: 0, pi: -1 }], grid: { '0,0': 0 }, meeples: [], pile, disc: [],
      rv: o.river ? { x: 0, y: 0, d: 2, t: 0 } : null,
      cur: 0, phase: 'place', tile: null, pend: -1, last: 0, mopts: [], turn: 1, final: null, bp: null, total: pile.length + 1
    };
    if (!drawTile(st, { emit() {} })) finalScore(st, { emit() {}, sync() {}, later() {}, end() {} });
    return st;
  },
  action(st, pi, a, ctx) {
    if (!a || typeof a.t !== 'string' || st.phase === 'over' || pi !== st.cur) return false;
    const p = st.players[pi];
    if (a.t === 'place') {
      if (st.phase !== 'place') return false;
      const x = a.x, y = a.y, r = a.r;
      if (![x, y, r].every(Number.isInteger) || r < 0 || r > 3 || Math.abs(x) > 200 || Math.abs(y) > 200) return false;
      if (!canPlace(st.tiles, st.grid, st.rv, st.tile, x, y, r)) return false;
      placeTile(st, ctx, pi, x, y, r); return true;
    }
    if (a.t === 'meeple') {
      if (st.phase !== 'meeple' || p.mp <= 0) return false;
      const fi = a.f;
      if (!Number.isInteger(fi) || !st.mopts.includes(fi)) return false;
      const A = analyze(st.tiles, st.grid, st.meeples);
      if (!claimable(st, A, st.pend).includes(fi)) return false;
      st.meeples.push({ pi, ti: st.pend, fi }); p.mp--;
      const ft = TD[st.tiles[st.pend].k].f[fi].t;
      ctx.emit({ t: 'meeple', pi, ti: st.pend, fi, ft }, `${p.name} ${TYPE_ACC[ft]} tuttu ${ft === 'f' ? '(çiftçi)' : ''}`.trim() + '.');
      finishTurn(st, ctx); return true;
    }
    if (a.t === 'skip') {
      if (st.phase !== 'meeple') return false;
      finishTurn(st, ctx); return true;
    }
    return false;
  },
  view(st) {
    const G2 = CFX.Room && CFX.Room.game;
    return {
      opts: st.opts,
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, score: p.score, mp: p.mp, bd: Object.assign({}, p.bd),
        online: G2 && G2.players[i] ? G2.players[i].online !== false : true })),
      tiles: st.tiles.map(t => ({ k: t.k, x: t.x, y: t.y, r: t.r, pi: t.pi })), meeples: st.meeples.map(m => ({ pi: m.pi, ti: m.ti, fi: m.fi })), rv: st.rv ? Object.assign({}, st.rv) : null,
      cur: st.cur, phase: st.phase, tile: st.tile, pend: st.pend, last: st.last, mopts: st.mopts.slice(), turn: st.turn,
      left: st.pile.length, disc: st.disc.length, total: st.total, final: st.final
    };
  },
  turnOf(st) { return st.phase === 'place' || st.phase === 'meeple' ? st.cur : null; },
  botAct(st, pi, ctx) {
    if (this.turnOf(st) !== pi) return;
    if (st.phase === 'place') {
      const b = botPlan(st, pi, true, 0.35);
      if (!b) { if (!drawTile(st, ctx)) finalScore(st, ctx); else ctx.sync(); return; }
      st.bp = { fi: b.fi, ti: st.tiles.length };
      if (!this.action(st, pi, { t: 'place', x: b.x, y: b.y, r: b.r }, ctx)) { st.bp = null; nextTurn(st, ctx); }
      return;
    }
    if (st.phase === 'meeple') {
      const fi = st.bp && st.bp.ti === st.pend ? st.bp.fi : -1;
      if (fi >= 0 && this.action(st, pi, { t: 'meeple', f: fi }, ctx)) return;
      this.action(st, pi, { t: 'skip' }, ctx);
    }
  },
  skipTurn(st, pi, ctx) {
    if (this.turnOf(st) !== pi) return;
    if (st.phase === 'place') {
      const b = botPlan(st, pi, false, 0);
      st.bp = null;
      if (!b || !this.action(st, pi, { t: 'place', x: b.x, y: b.y, r: b.r }, ctx)) { nextTurn(st, ctx); return; }
    }
    if (st.phase === 'meeple' && st.cur === pi) this.action(st, pi, { t: 'skip' }, ctx);
  },
  resume(st, ctx) { if (st.phase === 'over') ctx.end(result(st)); },
  _t: { TD, RAW, BASE_KEYS, RIVER_KEYS, edgeAt, fits, canPlace, spotsFor, analyze, winners, compPts, claimable, resolvePlaced, finalScore, drawTile, botPlan, gridOf, rotPt, riverOk, result }
};

/* ------------------------------------------------------------------ çizim: karo sanatı */
const MID = [[50, 0], [100, 50], [50, 100], [0, 50]];
const CITY_PAT = [
  { s: [0], fill: 'M0 0H100Q50 46 0 0Z', walls: ['M100 0Q50 46 0 0'] },
  { s: [0, 3], fill: 'M0 0H100Q34 34 0 100Z', walls: ['M100 0Q34 34 0 100'] },
  { s: [1, 3], fill: 'M0 0Q50 40 100 0V100Q50 60 0 100Z', walls: ['M0 0Q50 40 100 0', 'M100 100Q50 60 0 100'] },
  { s: [0, 1, 3], fill: 'M0 0H100V100Q50 42 0 100Z', walls: ['M100 100Q50 42 0 100'] },
  { s: [0, 1, 2, 3], fill: 'M0 0H100V100H0Z', walls: [] }
];
function cityShape(sides) {
  const want = sides.slice().sort().join();
  for (const pat of CITY_PAT) for (let k = 0; k < 4; k++) if (pat.s.map(s => (s + k) % 4).sort().join() === want) return { pat, k };
  return { pat: CITY_PAT[4], k: 0 };
}
function linePath(f, river) {
  const s = f.sides;
  if (s.length === 2) {
    const [a, b] = s, A = MID[a], B = MID[b];
    if ((a + 2) % 4 === b) {
      if (!river) return `M${A[0]} ${A[1]}L${B[0]} ${B[1]}`;
      const vert = a % 2 === 0;
      return vert ? `M50 0C36 30 64 70 50 100` : `M0 50C30 36 70 64 100 50`;
    }
    return `M${A[0]} ${A[1]}Q50 50 ${B[0]} ${B[1]}`;
  }
  const A = MID[s[0]], e = f.e || [50, 50];
  return `M${A[0]} ${A[1]}L${e[0]} ${e[1]}`;
}
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const rot = k => (k ? ` transform="rotate(${90 * k} 50 50)"` : '');
function kervSVG(cx, cy, z) {
  return `<g transform="translate(${cx} ${cy}) scale(${z})">
    <rect x="-23" y="-19" width="46" height="40" rx="4" fill="rgba(0,0,0,.22)" transform="translate(2 3)"/>
    <rect x="-23" y="-19" width="46" height="40" rx="3" fill="#dcb47a" stroke="#6b4824" stroke-width="2"/>
    <rect x="-15" y="-11" width="30" height="22" rx="2" fill="#c49a5f" stroke="#8a6334" stroke-width="1"/>
    <path d="M-15 -11h30M-15 11h30" stroke="#a87c45" stroke-width="2" stroke-dasharray="3 3"/>
    <circle r="4.5" fill="#4fb6e6" stroke="#2c6f98" stroke-width="1"/>
    ${[[-23, -19], [23, -19], [-23, 21], [23, 21]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#e8c48a" stroke="#6b4824" stroke-width="1.6"/>`).join('')}
    <path d="M-7 -19a7 7 0 0 1 14 0Z" fill="#3fb3b0" stroke="#22625f" stroke-width="1.4"/>
    <path d="M-5.5 21V15a5.5 5.5 0 0 1 11 0v6Z" fill="#4a2e14"/>
    <path d="M-12 -24l2 -3l2 3M8 -24l2 -3l2 3" stroke="#6b4824" stroke-width="1" fill="none"/>
  </g>`;
}
function houseSVG(x, y, s, r) {
  const roof = ['#c8553d', '#b8462f', '#d16a3a', '#a94a3a'][Math.floor(r * 4)];
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(2)})"><rect x="-6" y="-3" width="12" height="8" fill="#f8f0e0" stroke="#7a5a3a" stroke-width=".8"/><path d="M-7.5 -3L0 -8.5L7.5 -3Z" fill="${roof}" stroke="#6e3524" stroke-width=".8"/><rect x="-1.4" y="1" width="2.8" height="4" fill="#6a4a2a"/></g>`;
}
function flagSVG(x, y) {
  return `<g transform="translate(${x} ${y})"><path d="M0 9V-11" stroke="#3b2a1a" stroke-width="1.8"/><path d="M0 -11L15 -7L0 -2Z" fill="#2457d6" stroke="#ffd34a" stroke-width="1.2" stroke-linejoin="round"/><circle cx="5.5" cy="-6.6" r="1.6" fill="#ffd34a"/><ellipse cx="0" cy="9" rx="3" ry="1.2" fill="rgba(0,0,0,.3)"/></g>`;
}
const ART = {};
function tileArt(key) {
  if (ART[key]) return ART[key];
  const d = TD[key], R = rng(hashStr(key)), parts = [];
  let cvs = null, cx2 = null;
  try { cvs = document.createElement('canvas'); cvs.width = cvs.height = 4; cx2 = cvs.getContext('2d'); } catch { cx2 = null; }
  const P = (path, k) => { if (!cx2 || typeof Path2D === 'undefined') return null; const p = new Path2D(); const m = new DOMMatrix().translate(50, 50).rotate(90 * (k || 0)).translate(-50, -50); p.addPath(new Path2D(path), m); return p; };
  const inFill = [], strokes = [], blocks = [];
  parts.push(`<rect width="100" height="100" fill="url(#kd-grass)"/>`);
  // nehir
  d.f.forEach(f => {
    if (f.t !== 'w') return;
    const lp = linePath(f, true);
    parts.push(`<path d="${lp}" stroke="#c9b27a" stroke-width="23" fill="none"/><path d="${lp}" stroke="#2f8fd6" stroke-width="17" fill="none"/><path d="${lp}" stroke="#7fd0ff" stroke-width="5" stroke-dasharray="7 9" fill="none" opacity=".75"/>`);
    strokes.push([P(lp), 30]);
    if (f.sides.length === 1) {
      const [ex, ey] = f.e || [50, 50];
      if (key === 'go') { parts.push(`<ellipse cx="${ex}" cy="${ey}" rx="30" ry="22" fill="#c9b27a"/><ellipse cx="${ex}" cy="${ey}" rx="26" ry="18" fill="#2f8fd6"/><ellipse cx="${ex - 6}" cy="${ey - 4}" rx="12" ry="5" fill="#7fd0ff" opacity=".6"/><path d="M${ex + 22} ${ey + 14}v-9M${ex + 25} ${ey + 13}v-7M${ex - 24} ${ey + 12}v-8" stroke="#3d7a2a" stroke-width="1.6"/>`); blocks.push([ex, ey, 34]); }
      else { parts.push(`<circle cx="${ex}" cy="${ey}" r="13" fill="#c9b27a"/><circle cx="${ex}" cy="${ey}" r="10" fill="#2f8fd6"/><circle cx="${ex - 3}" cy="${ey - 3}" r="3.5" fill="#bfe9ff"/>${[[-12, -8], [11, -9], [-13, 7], [12, 8]].map(([a, b]) => `<ellipse cx="${ex + a}" cy="${ey + b}" rx="4" ry="3" fill="#9a958c" stroke="#5f5a52" stroke-width=".8"/>`).join('')}`); blocks.push([ex, ey, 20]); }
    }
  });
  // şehirler (zemin)
  const walls = [];
  d.f.forEach(f => {
    if (f.t !== 'c') return;
    const { pat, k } = cityShape(f.sides);
    parts.push(`<path d="${pat.fill}"${rot(k)} fill="#e9c38c"/>`);
    parts.push(`<path d="${pat.fill}"${rot(k)} fill="url(#kd-cobble)" opacity=".55"/>`);
    inFill.push(P(pat.fill, k));
    pat.walls.forEach(w => { walls.push([w, k]); strokes.push([P(w, k), 16]); });
  });
  // yollar
  const roads = d.f.filter(f => f.t === 'r');
  roads.forEach(f => {
    const lp = linePath(f, false);
    parts.push(`<path d="${lp}" stroke="rgba(80,55,20,.45)" stroke-width="13.5" fill="none"/><path d="${lp}" stroke="#efdcab" stroke-width="10" fill="none"/><path d="${lp}" stroke="#cdb27a" stroke-width="1.6" stroke-dasharray="4 6" fill="none"/>`);
    strokes.push([P(lp), 22]);
    if (d.river && f.sides.length === 2 && (f.sides[0] + 2) % 4 === f.sides[1]) parts.push(`<path d="M38 40Q50 33 62 40V60Q50 53 38 60Z" fill="#b9ab96" stroke="#5f5446" stroke-width="1.4"/><path d="M38 40Q50 33 62 40M38 60Q50 53 62 60" stroke="#e8decc" stroke-width="1" fill="none"/>`);
  });
  const singles = roads.filter(f => f.sides.length === 1 && (!f.e || (f.e[0] === 50 && f.e[1] === 50)));
  if (singles.length >= 3) { parts.push(`<circle cx="50" cy="50" r="9" fill="#9d8f7a" stroke="#4e4336" stroke-width="1.6"/><circle cx="50" cy="50" r="5.5" fill="#3d9ad8"/><circle cx="48" cy="48" r="1.8" fill="#bfe9ff"/>`); blocks.push([50, 50, 14]); }
  // surlar
  walls.forEach(([w, k]) => {
    parts.push(`<path d="${w}"${rot(k)} stroke="rgba(0,0,0,.22)" stroke-width="12" fill="none" transform-origin="50 50"/>`);
    parts.push(`<path d="${w}"${rot(k)} stroke="#5d4c3b" stroke-width="8.5" fill="none" stroke-linecap="round"/><path d="${w}"${rot(k)} stroke="#b7a68e" stroke-width="6" fill="none" stroke-linecap="round"/><path d="${w}"${rot(k)} stroke="#e3d6bf" stroke-width="2.6" stroke-dasharray="3.2 3.4" fill="none"/>`);
  });
  // şehir kapısı (yol surda biterse)
  roads.forEach(f => { if (f.sides.length === 1 && f.e && !(f.e[0] === 50 && f.e[1] === 50) && d.f.some(x => x.t === 'c')) parts.push(`<path d="M${f.e[0] - 6} ${f.e[1] + 3}V${f.e[1] - 1}a6 6 0 0 1 12 0V${f.e[1] + 3}Z" fill="#3c2412" stroke="#5d4c3b" stroke-width="1.4"/>`); });
  // kervansaray
  d.f.forEach(f => { if (f.t === 'k') { parts.push(kervSVG(f.a[0], f.a[1] + 2, f.z)); blocks.push([f.a[0], f.a[1], 30 * f.z]); } });
  // evler + kubbe + sancak
  const flagPos = [];
  d.f.forEach(f => { if (f.t === 'c' && f.sh) { const fx = Math.min(84, Math.max(14, f.a[0] + 15)), fy = Math.min(86, Math.max(16, f.a[1] - 2)); flagPos.push([fx, fy]); } });
  const houses = [];
  if (cx2) {
    const fillHit = (x, y) => inFill.some(p => p && cx2.isPointInPath(p, x, y));
    const nearStroke = (x, y) => strokes.some(([p, w]) => { if (!p) return false; cx2.lineWidth = w; return cx2.isPointInStroke(p, x, y); });
    for (let gy = 6; gy < 100; gy += 12) for (let gx = 6; gx < 100; gx += 13) {
      const x = gx + (R() - .5) * 7, y = gy + (R() - .5) * 6;
      if (x < 5 || x > 95 || y < 6 || y > 96) continue;
      if (!fillHit(x, y)) continue;
      cx2.lineWidth = 14;
      if (walls.some(([w, k]) => { const p = P(w, k); return p && cx2.isPointInStroke(p, x, y); })) continue;
      if (strokes.some(([p, w]) => p && w === 22 && (cx2.lineWidth = 18, cx2.isPointInStroke(p, x, y)))) continue;
      if (flagPos.some(([a, b]) => Math.hypot(a - x, b - y) < 11)) continue;
      if (R() < 0.18) continue;
      houses.push([x, y, 0.82 + R() * 0.35, R()]);
    }
    houses.sort((a, b) => a[1] - b[1]);
    // kır süsleri
    const deco = [];
    for (let i = 0; i < 26; i++) {
      const x = 6 + R() * 88, y = 6 + R() * 88;
      if (fillHit(x, y) || nearStroke(x, y)) continue;
      if (blocks.some(([a, b, r]) => Math.hypot(a - x, b - y) < r)) continue;
      if (deco.some(([a, b]) => Math.hypot(a - x, b - y) < 9)) continue;
      deco.push([x, y, R()]);
    }
    deco.forEach(([x, y, r]) => {
      if (r < 0.16) parts.push(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><ellipse cx="1" cy="5" rx="6" ry="2" fill="rgba(0,0,0,.18)"/><rect x="-1" y="1" width="2" height="4" fill="#6b4a2a"/><circle r="5.5" fill="#3f8f3a"/><circle cx="-1.8" cy="-1.8" r="2.4" fill="#5fb04f"/></g>`);
      else if (r < 0.3) parts.push(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="1.5" fill="#fff6c9"/><circle cx="3" cy="1.6" r="1.3" fill="#ffd34a"/><circle cx="-2.6" cy="1.8" r="1.2" fill="#ff8fb4"/></g>`);
      else if (r < 0.36) parts.push(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><ellipse rx="4.2" ry="3.2" fill="#f7f4ec" stroke="#8d8578" stroke-width=".7"/><circle cx="3.6" cy="-1" r="1.7" fill="#3a3530"/></g>`);
      else parts.push(`<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" d="M-2.5 1.5l1-3.5M0 1.5v-4.5M2.5 1.5l-1-3.5" stroke="#4f9a3f" stroke-width="1.1" stroke-linecap="round" fill="none"/>`);
    });
  }
  const bigCity = d.f.some(f => f.t === 'c' && f.sides.length >= 2);
  if (bigCity) {
    const cf = d.f.find(f => f.t === 'c' && f.sides.length >= 2);
    const [dx, dy] = [cf.a[0] - 13, cf.a[1] + 9];
    const hx = Math.min(86, Math.max(14, dx)), hy = Math.min(86, Math.max(14, dy));
    for (let i = houses.length - 1; i >= 0; i--) if (Math.hypot(houses[i][0] - hx, houses[i][1] - hy) < 12) houses.splice(i, 1);
    houses.push([hx, hy, -1, 0]); houses.sort((a, b) => a[1] - b[1]);
  }
  houses.forEach(([x, y, s, r]) => {
    if (s < 0) parts.push(`<g transform="translate(${x} ${y})"><rect x="-8" y="-3" width="16" height="9" fill="#f8f0e0" stroke="#7a5a3a" stroke-width=".9"/><path d="M-7 -3a7 7 0 0 1 14 0Z" fill="#3fb3b0" stroke="#22625f" stroke-width="1"/><rect x="9" y="-12" width="3" height="18" fill="#f8f0e0" stroke="#7a5a3a" stroke-width=".8"/><path d="M8.5 -12l2 -4l2 4Z" fill="#3fb3b0"/></g>`);
    else parts.push(houseSVG(x, y, s, r));
  });
  flagPos.forEach(([x, y]) => parts.push(flagSVG(x, y)));
  parts.push(`<rect x=".5" y=".5" width="99" height="99" fill="none" stroke="rgba(30,20,10,.28)" stroke-width="1"/>`);
  ART[key] = parts.join('');
  return ART[key];
}
// tek bir özelliğin vurgu şekli (karonun kendi koordinatlarında)
function featShape(k, fi, cls) {
  const f = TD[k].f[fi];
  if (f.t === 'c') { const { pat, k: kk } = cityShape(f.sides); return `<path class="${cls}" d="${pat.fill}"${rot(kk)}/>`; }
  if (f.t === 'r' || f.t === 'w') return `<path class="${cls} ln" d="${linePath(f, f.t === 'w')}"/>`;
  if (f.t === 'k') return `<rect class="${cls}" x="${f.a[0] - 26 * f.z}" y="${f.a[1] - 22 * f.z}" width="${52 * f.z}" height="${48 * f.z}" rx="6"/>`;
  return `<circle class="${cls}" cx="${f.a[0]}" cy="${f.a[1]}" r="16"/>`;
}
const MEEPLE_PATH = 'M0 -15.5a5.3 5.3 0 1 1 0 10.6a5.3 5.3 0 1 1 0 -10.6ZM-3.6 -5.2h7.2l6.4 4.6l-1.8 2.8l-4-2.2l3.6 12.2h-15.6l3.6 -12.2l-4 2.2l-1.8 -2.8Z';
function meepleSVG(x, y, color, farmer, cls) {
  // çiftçi: hasır şapkalı ve başak tutan Kahya
  return `<g class="kd-mpl ${cls || ''}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" style="color:${color}"><g class="kd-mi">
    <ellipse cx="0" cy="12.6" rx="9" ry="2.6" fill="rgba(0,0,0,.35)"/>
    ${farmer ? '<path d="M9.5 12V-9" stroke="#7a5326" stroke-width="1.8"/><path d="M9.5 -9c-3 -2 -3 -6 0 -8c3 2 3 6 0 8Z" fill="#f2c94c" stroke="#8a6a1c" stroke-width=".9"/>' : ''}
    <path d="${MEEPLE_PATH}" fill="currentColor" stroke="#1a1030" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M-2.2 -13a2.4 2.4 0 0 1 3 -1" stroke="rgba(255,255,255,.75)" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    ${farmer ? '<ellipse cx="0" cy="-13.2" rx="9.5" ry="2.6" fill="#f2c94c" stroke="#1a1030" stroke-width="1.3"/><path d="M-4.6 -13.6Q0 -21 4.6 -13.6Z" fill="#f2c94c" stroke="#1a1030" stroke-width="1.3"/>' : ''}
  </g></g>`;
}
const miniMeeple = color => `<svg class="kd-mini" viewBox="-12 -17 24 31" aria-hidden="true"><path d="${MEEPLE_PATH}" fill="${color}" stroke="#1a1030" stroke-width="2"/></svg>`;

/* ------------------------------------------------------------------ arayüz */
let root = null, ui = null, V = null, E = {}, cam = null, ghost = null, prevR = 0, rotAcc = 0, selF = -1, busy = false;
let tilesSig = '', turnKey = '', lastN = 0, pointers = new Map(), drag = null, moved = false, spotsCache = { sig: '', list: [] }, resizeT = 0, hlT = [];
const isDesk = () => innerWidth >= 900;

function actor(v) {
  if (!v || (v.phase !== 'place' && v.phase !== 'meeple')) return -1;
  const me = ui ? ui.me : -1;
  if (me === 'all') return v.players[v.cur] && !v.players[v.cur].isBot ? v.cur : -1;
  return me === v.cur ? v.cur : -1;
}
function send(a) { if (busy) return; busy = true; ui.send(a); setTimeout(() => { busy = false; }, 600); }
function clientGrid(v) { return gridOf(v.tiles); }
function curSpots(v) {
  const sig = v.tiles.length + '|' + v.tile + '|' + v.turn;
  if (spotsCache.sig !== sig) spotsCache = { sig, list: v.tile ? spotsFor(v.tiles, clientGrid(v), v.rv, v.tile) : [] };
  return spotsCache.list;
}

/* ---------- kamera ---------- */
function vpSize() { const r = E.vp.getBoundingClientRect(); return [r.width || 1, r.height || 1]; }
function bounds(v) {
  let x0 = 0, y0 = 0, x1 = 0, y1 = 0;
  (v ? v.tiles : [{ x: 0, y: 0 }]).forEach(t => { x0 = Math.min(x0, t.x); y0 = Math.min(y0, t.y); x1 = Math.max(x1, t.x); y1 = Math.max(y1, t.y); });
  return [x0 - 1, y0 - 1, x1 + 2, y1 + 2];
}
const maxS = () => (isDesk() ? 1.25 : 1.0);
function camFit(ms) {
  if (!cam) return;
  const [w, h] = vpSize(), [x0, y0, x1, y1] = bounds(V), bw = (x1 - x0) * 100, bh = (y1 - y0) * 100, pad = 10;
  const s = Math.max(0.12, Math.min(maxS(), Math.min((w - pad * 2) / bw, (h - pad * 2) / bh)));
  cam.s = s; cam.x = w / 2 - (x0 * 100 + bw / 2) * s; cam.y = h / 2 - (y0 * 100 + bh / 2) * s; cam.mode = 'auto';
  applyCam(ms);
}
function applyCam(ms) {
  if (!E.cam) return;
  E.cam.style.transition = ms ? `transform ${ms}ms cubic-bezier(.25,.8,.3,1)` : 'none';
  E.cam.style.transform = `translate(${cam.x.toFixed(1)}px, ${cam.y.toFixed(1)}px) scale(${cam.s.toFixed(4)})`;
  E.fitBtn.classList.toggle('on', cam.mode !== 'auto');
}
function zoomAt(f, mx, my, ms) {
  const s = Math.max(0.12, Math.min(2.2, cam.s * f));
  const bx = (mx - cam.x) / cam.s, by = (my - cam.y) / cam.s;
  cam.s = s; cam.x = mx - bx * s; cam.y = my - by * s; cam.mode = 'free'; applyCam(ms || 0);
}
function centerOn(bx, by, ms) { const [w, h] = vpSize(); cam.x = w / 2 - bx * cam.s; cam.y = h / 2 - by * cam.s; cam.mode = 'free'; applyCam(ms); }
function toBoard(cx, cy) { const r = E.vp.getBoundingClientRect(); return [(cx - r.left - cam.x) / cam.s, (cy - r.top - cam.y) / cam.s]; }
function toScreen(bx, by) { return [cam.x + bx * cam.s, cam.y + by * cam.s]; }
function ensureVisible(bx, by) {
  const [w, h] = vpSize(), [sx, sy] = toScreen(bx, by), m = 50 * cam.s + 10;
  if (sx < m || sy < m || sx > w - m || sy > h - m) centerOn(bx, by, 380);
}

function onPointerDown(e) {
  if (e.target.closest('.kd-ctl, .kd-floats')) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { E.vp.setPointerCapture(e.pointerId); } catch { /* */ }
  if (pointers.size === 1) { drag = { sx: e.clientX, sy: e.clientY, x0: cam.x, y0: cam.y }; moved = false; }
  else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    drag = { pinch: true, d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, x0: cam.x, y0: cam.y, s0: cam.s };
    moved = true;
  }
}
function onPointerMove(e) {
  if (!pointers.has(e.pointerId) || !drag) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const r = E.vp.getBoundingClientRect();
  if (drag.pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y) || 1, s = Math.max(0.12, Math.min(2.2, drag.s0 * d / drag.d0));
    const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
    const bx = (drag.mx - r.left - drag.x0) / drag.s0, by = (drag.my - r.top - drag.y0) / drag.s0;
    cam.s = s; cam.x = mx - bx * s; cam.y = my - by * s; cam.mode = 'free'; applyCam(0); return;
  }
  const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if (!moved && Math.hypot(dx, dy) < 8) return;
  moved = true; cam.mode = 'free'; cam.x = drag.x0 + dx; cam.y = drag.y0 + dy; applyCam(0);
}
function onPointerUp(e) {
  if (!pointers.has(e.pointerId)) return;
  const was = pointers.size;
  pointers.delete(e.pointerId);
  if (was === 1 && !moved && e.type === 'pointerup') tap(e.clientX, e.clientY);
  if (pointers.size === 0) drag = null;
  else if (pointers.size === 1) { const [p] = [...pointers.values()]; drag = { sx: p.x, sy: p.y, x0: cam.x, y0: cam.y }; moved = true; }
}
function onWheel(e) {
  e.preventDefault();
  const r = E.vp.getBoundingClientRect();
  zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top, 0);
}
function tap(cx, cy) {
  const v = V; if (!v) return;
  const me = actor(v); if (me < 0) return;
  const [bx, by] = toBoard(cx, cy);
  if (v.phase === 'place') {
    const gx = Math.floor(bx / 100), gy = Math.floor(by / 100), sp = curSpots(v);
    if (ghost && ghost.x === gx && ghost.y === gy) { rotateGhost(1); return; }
    let hit = sp.find(s => s.x === gx && s.y === gy);
    if (!hit) {   // uzaktan dokunuş: en yakın uygun yer (küçük ölçekte kolaylık)
      let bd = 1e9; sp.forEach(s => { const d = Math.hypot((s.x * 100 + 50 - bx) * cam.s, (s.y * 100 + 50 - by) * cam.s); if (d < bd) { bd = d; hit = s; } });
      if (bd > Math.max(30, 60 * cam.s)) hit = null;
    }
    if (!hit) return;
    const r = hit.rs.includes(prevR) ? prevR : hit.rs[0];
    ghost = { x: hit.x, y: hit.y, r };
    setPrevRot(r);
    Sound.tick(.3);
    render(V); return;
  }
  if (v.phase === 'meeple') {
    const t = v.tiles[v.pend]; if (!t) return;
    let best = -1, bd = 1e9;
    v.mopts.forEach(fi => { const [ax, ay] = anchorOf(t, fi); const d = Math.hypot(ax - bx, ay - by) * cam.s; if (d < bd) { bd = d; best = fi; } });
    if (best >= 0 && bd < Math.max(26, 30 * cam.s)) {
      if (selF === best) { send({ t: 'meeple', f: best }); return; }
      selF = best; Sound.tick(.3); render(V);
    }
  }
}
function setPrevRot(r) {
  let d = (r - prevR + 4) % 4; if (d === 3) d = -1;
  rotAcc += d * 90; prevR = r;
}
function rotateGhost(dir) {
  const v = V; if (!v) return;
  if (ghost) {
    const sp = curSpots(v).find(s => s.x === ghost.x && s.y === ghost.y); if (!sp) return;
    let r = ghost.r;
    for (let i = 0; i < 4; i++) { r = (r + dir + 4) % 4; if (sp.rs.includes(r)) break; }
    const steps = ((r - prevR) * dir + 8) % 4;
    ghost.r = r; rotAcc += dir * 90 * steps; prevR = r;
  } else { prevR = (prevR + dir + 4) % 4; rotAcc += dir * 90; }
  Sound.tick(.5);
  render(V);
}

/* ---------- çizim katmanları ---------- */
function tileUse(t, extra) { return `<g class="kd-tile ${extra || ''}" transform="translate(${t.x * 100} ${t.y * 100})"><g${rot(t.r)}><g class="kd-in"><use href="#kd-tk-${t.k}" width="100" height="100"/></g></g></g>`; }
function renderTiles(v) {
  const sig = v.tiles.length + ':' + (v.tiles.length ? v.tiles[v.tiles.length - 1].k : '');
  if (sig === tilesSig) return;
  tilesSig = sig;
  E.tl.innerHTML = v.tiles.map((t, i) => tileUse(t, i === v.tiles.length - 1 && i > 0 ? 'drop' : '')).join('');
}
function renderLast(v) {
  const t = v.tiles[v.phase === 'meeple' ? v.pend : v.last];
  if (!t || (v.tiles.length === 1 && v.phase !== 'meeple')) { E.last.innerHTML = ''; return; }
  const c = t.pi >= 0 && v.players[t.pi] ? v.players[t.pi].color : '#fff';
  E.last.innerHTML = `<rect class="kd-lastr" x="${t.x * 100 + 1.5}" y="${t.y * 100 + 1.5}" width="97" height="97" rx="4" style="stroke:${c}"/>`;
}
function renderSpots(v) {
  const me = actor(v);
  if (me < 0 || v.phase !== 'place') { E.spots.innerHTML = ''; E.ghost.innerHTML = ''; return; }
  const sp = curSpots(v);
  E.spots.innerHTML = sp.map(s => {
    const good = s.rs.includes(prevR) ? ' now' : '';
    return `<g class="kd-spot${good}"><rect x="${s.x * 100 + 5}" y="${s.y * 100 + 5}" width="90" height="90" rx="10"/><path d="M${s.x * 100 + 42} ${s.y * 100 + 50}h16M${s.x * 100 + 50} ${s.y * 100 + 42}v16"/></g>`;
  }).join('');
  if (ghost) {
    const col = v.players[v.cur].color;
    E.ghost.innerHTML = `${tileUse({ x: ghost.x, y: ghost.y, r: ghost.r, k: v.tile }, 'ghost')}<rect class="kd-ghostr" x="${ghost.x * 100 + 1}" y="${ghost.y * 100 + 1}" width="98" height="98" rx="3" style="stroke:${col}"/>`;
  } else E.ghost.innerHTML = '';
}
function renderMeeples(v) {
  E.mee.innerHTML = v.meeples.map(m => {
    const t = v.tiles[m.ti]; if (!t) return '';
    const [x, y] = anchorOf(t, m.fi), f = TD[t.k].f[m.fi];
    return meepleSVG(x, y, v.players[m.pi].color, f.t === 'f', m.ti === v.pend ? 'pop' : '');
  }).join('');
}
function renderHot(v) {
  const me = actor(v);
  if (me < 0 || v.phase !== 'meeple') { E.hot.innerHTML = ''; selF = -1; return; }
  const t = v.tiles[v.pend]; if (!t) { E.hot.innerHTML = ''; return; }
  if (!v.mopts.includes(selF)) selF = -1;
  const col = v.players[me].color;
  let out = '';
  if (selF >= 0) {
    // seçilen özelliğin bağlı olduğu tüm parçaları göster
    const A = analyze(v.tiles, clientGrid(v), v.meeples), root = A.root(v.pend, selF), c = A.comps.get(root);
    out += c.nodes.map(id => { const u = v.tiles[id >> 3]; return `<g transform="translate(${u.x * 100} ${u.y * 100})"><g${rot(u.r)}>${featShape(u.k, id & 7, 'kd-selshape')}</g></g>`; }).join('');
  }
  out += v.mopts.map(fi => {
    const [x, y] = anchorOf(t, fi), f = TD[t.k].f[fi], on = fi === selF;
    return `<g class="kd-hs${on ? ' on' : ''}" transform="translate(${x} ${y})"><circle r="15" style="stroke:${col}"/>${on ? meepleSVG(0, 0, col, f.t === 'f', 'ghostm') : `<text y="5.5" text-anchor="middle">${TYPE_IC[f.t]}</text>`}</g>`;
  }).join('');
  E.hot.innerHTML = out;
}
function renderPlayers(v) {
  const top = Math.max(1, ...v.players.map(p => p.score));
  E.pl.innerHTML = v.players.map((p, i) => {
    const act = (v.phase === 'place' || v.phase === 'meeple') && v.cur === i;
    const figs = Array.from({ length: MEEPLES }, (_, k) => `<i class="${k < p.mp ? '' : 'used'}"></i>`).join('');
    return `<div class="kd-pl g-chip${act ? ' active' : ''}${p.online ? '' : ' off'}" style="--pc:${p.color}">
      <span class="av" style="background:${p.color}">${initial(p.name)}${p.isBot ? '<i class="kd-bot" aria-label="bilgisayar">🤖</i>' : ''}</span>
      <span class="kd-pn"><b>${esc(p.name)}</b><span class="kd-figs" style="--pc:${p.color}" aria-label="${p.mp} figür">${figs}</span><span class="kd-mpn">${miniMeeple(p.color)}×${p.mp}</span></span>
      <span class="kd-sc">${p.score}</span>
      <span class="kd-bar"><u style="width:${(100 * p.score / top).toFixed(1)}%;background:${p.color}"></u></span>
    </div>`;
  }).join('');
}
function renderHud(v) {
  const me = actor(v), cp = v.players[v.cur];
  let st;
  if (v.phase === 'over') st = `<span class="g-turn win">🏁 Oyun bitti! Son puanlar eklendi.</span>`;
  else if (me >= 0 && v.phase === 'place') st = `<span class="g-turn mine">${ui.me === 'all' && v.players.filter(p => !p.isBot).length > 1 ? esc(cp.name) + ': ' : ''}SIRA SENDE</span><span class="kd-hint">${ghost ? 'Karoya dokunarak döndür, sonra <b>Yerleştir</b>.' : 'Döndür ve parlayan bir yere dokun.'}</span>`;
  else if (me >= 0) st = `<span class="g-turn mine">KAHYA?</span><span class="kd-hint">${selF >= 0 ? 'Onayla ya da başka nokta seç.' : 'Bir noktaya dokun ya da geç.'}</span>`;
  else st = `<span class="g-turn"><span class="av" style="background:${cp.color}">${initial(cp.name)}</span>Sıra: ${esc(cp.name)}</span><span class="kd-hint">${cp.isBot ? 'düşünüyor…' : !cp.online ? 'bağlantı bekleniyor…' : v.phase === 'meeple' ? 'Kahya koyuyor…' : 'karo yerleştiriyor…'}</span>`;
  E.status.innerHTML = st;
  // karo önizleme
  const k = v.phase === 'place' ? v.tile : null;
  const showR = ghost ? ghost.r : prevR;
  if (k) {
    const own = me >= 0;
    E.prev.innerHTML = `<svg viewBox="-4 -4 108 108" class="kd-psvg"><g class="kd-prot" style="transform:rotate(${own ? rotAcc : 0}deg)"><use href="#kd-tk-${k}" width="100" height="100"/></g></svg>`;
    void showR;
  } else if (v.phase === 'meeple' && v.tiles[v.pend]) {
    const t = v.tiles[v.pend];
    E.prev.innerHTML = `<svg viewBox="-4 -4 108 108" class="kd-psvg done"><g class="kd-prot" style="transform:rotate(${t.r * 90}deg)"><use href="#kd-tk-${t.k}" width="100" height="100"/></g></svg>`;
  } else E.prev.innerHTML = `<div class="kd-bag">🎒</div>`;
  E.left.textContent = v.left;
  const canRot = me >= 0 && v.phase === 'place';
  E.rotL.disabled = !canRot; E.rotR.disabled = !canRot;
  let acts = '';
  if (me >= 0 && v.phase === 'place') acts = `<button type="button" class="btn btn-solve kd-go" data-a="place"${ghost ? '' : ' disabled'}>✓ Yerleştir</button>${ghost ? '' : `<button type="button" class="btn btn-ghost kd-sm" data-a="spots">🔍 Yerleri göster</button>`}`;
  else if (me >= 0 && v.phase === 'meeple') {
    const f = selF >= 0 ? TD[v.tiles[v.pend].k].f[selF] : null;
    acts = `<button type="button" class="btn btn-solve kd-go" data-a="meeple"${f ? '' : ' disabled'}>${f ? `${TYPE_IC[f.t]} ${f.t === 'f' ? 'Çiftçi koy' : 'Kahya koy'}` : '🧍 Nokta seç'}</button><button type="button" class="btn btn-ghost kd-sm" data-a="skip">Figür koyma</button>`;
  } else if (v.phase !== 'over') {
    const w = v.tiles.length - 1;
    acts = `<div class="kd-info"><span>🧩 <b>${w}</b> karo döşendi</span>${v.disc ? `<span>🗑️ ${v.disc} atıldı</span>` : ''}<span>${v.opts.farm ? '🌾 Çiftçiler açık' : '🌾 Çiftçiler kapalı'}</span></div>`;
  } else acts = `<div class="kd-info"><span>Torba boşaldı.</span></div>`;
  if (E.acts.dataset.h !== acts) { E.acts.innerHTML = acts; E.acts.dataset.h = acts; }
  E.hud.classList.toggle('mine', me >= 0);
}
// tahta yüksekliği: ekranda kalan yere göre (alt panel her zaman görünsün)
let vpH = 0;
function fitHeight() {
  if (!E.vp || !root) return false;
  const top = E.vp.getBoundingClientRect().top + scrollY;
  const desk = isDesk();
  const want = desk ? Math.max(480, Math.min(900, innerHeight - top - 18)) : Math.max(280, Math.min(760, innerHeight - top - E.hud.offsetHeight - 22));
  if (Math.abs(want - vpH) < 3) return false;
  vpH = want; E.vp.style.height = want + 'px'; return true;
}
function render(v) {
  const prev = V; V = v;
  const tk = v.cur + ':' + v.turn + ':' + v.phase;
  let refocus = false;
  if (tk !== turnKey) { turnKey = tk; ghost = null; selF = -1; busy = false; if (cam && cam.mode === 'focus') refocus = true; }
  if (!cam) { cam = { s: 1, x: 0, y: 0, mode: 'auto' }; }
  const grew = !prev || lastN !== v.tiles.length; lastN = v.tiles.length;
  renderTiles(v); renderLast(v); renderSpots(v); renderMeeples(v); renderHot(v); renderPlayers(v); renderHud(v);
  if (fitHeight() && prev && cam.mode === 'auto') camFit(0);
  const me = actor(v);
  if (!prev) camFit(0);
  else if (me >= 0 && v.phase === 'meeple' && cam.s < (isDesk() ? 0.8 : 1.2) && v.tiles[v.pend]) {
    // küçük ölçekte Kahya noktaları rahat seçilsin diye yerleştirilen karoya yaklaş
    const t = v.tiles[v.pend], [w, h] = vpSize(); cam.s = isDesk() ? 1.2 : 1.35; cam.x = w / 2 - (t.x * 100 + 50) * cam.s; cam.y = h / 2 - (t.y * 100 + 50) * cam.s; cam.mode = 'focus'; applyCam(380);
  } else if (refocus || (grew && cam.mode === 'focus')) camFit(380);
  else if (grew) {
    if (cam.mode === 'auto') camFit(350);
    else { const t = v.tiles[v.tiles.length - 1]; ensureVisible(t.x * 100 + 50, t.y * 100 + 50); }
  }
}

/* ---------- vurgular ve uçan puanlar ---------- */
function floatAt(bx, by, text, color, delay) {
  if (!E.floats) return;
  setTimeout(() => {
    if (!E.floats || !cam) return;
    const [x, y] = toScreen(bx, by), el = document.createElement('div');
    el.className = 'kd-float'; el.textContent = text; el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.setProperty('--fc', color || '#ffe14a');
    E.floats.appendChild(el);
    const r = E.vp.getBoundingClientRect();
    try { FX.burst(r.left + x, r.top + y, 18, true); } catch { /* */ }
    setTimeout(() => el.remove(), 1900);
  }, delay || 0);
}
function highlight(nodes, delay, dur) {
  if (!E.hl) return;
  const id = setTimeout(() => {
    if (!E.hl) return;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'kd-hlg');
    g.innerHTML = nodes.map(([x, y, k, r, fi]) => `<g transform="translate(${x * 100} ${y * 100})"><g${rot(r)}>${featShape(k, fi, 'kd-hlshape')}</g></g>`).join('');
    E.hl.appendChild(g);
    hlT.push(setTimeout(() => g.remove(), dur || 2400));
  }, delay || 0);
  hlT.push(id);
}
function scoreFx(items, final) {
  items.forEach((it, i) => {
    const delay = final ? i * 260 : i * 180;
    if (it.nodes && it.nodes.length) highlight(it.nodes, delay, final ? 2200 : 2600);
    if (it.win.length && it.pts) {
      const col = it.win.length === 1 && V && V.players[it.win[0]] ? V.players[it.win[0]].color : '#ffe14a';
      floatAt(it.at[0], it.at[1], `+${it.pts}`, col, delay + 120);
    }
  });
}

function onClick(e) {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled || !V) return;
  Sound.init && Sound.init();
  const a = b.dataset.a;
  switch (a) {
    case 'rotL': rotateGhost(-1); break;
    case 'rotR': rotateGhost(1); break;
    case 'place': if (ghost) send({ t: 'place', x: ghost.x, y: ghost.y, r: ghost.r }); break;
    case 'meeple': if (selF >= 0) send({ t: 'meeple', f: selF }); break;
    case 'skip': send({ t: 'skip' }); break;
    case 'zin': { const [w, h] = vpSize(); zoomAt(1.25, w / 2, h / 2, 200); break; }
    case 'zout': { const [w, h] = vpSize(); zoomAt(1 / 1.25, w / 2, h / 2, 200); break; }
    case 'fit': camFit(350); break;
    case 'spots': camFit(350); E.spots.classList.remove('flash'); void E.spots.getBBox; setTimeout(() => E.spots && E.spots.classList.add('flash'), 20); break;
    default: break;
  }
}
function onKey(e) {
  if (!V || actor(V) < 0 || e.target.closest && e.target.closest('input,textarea,select')) return;
  if (V.phase === 'place' && (e.key === 'r' || e.key === 'R')) { rotateGhost(e.shiftKey ? -1 : 1); e.preventDefault(); }
  else if (e.key === 'Enter') {
    if (V.phase === 'place' && ghost) send({ t: 'place', x: ghost.x, y: ghost.y, r: ghost.r });
    else if (V.phase === 'meeple') send(selF >= 0 ? { t: 'meeple', f: selF } : { t: 'skip' });
  }
}
function onResize() {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => { if (!root || !cam) return; fitHeight(); if (cam.mode === 'auto') camFit(0); }, 90);
}
function defsSVG() {
  const keys = Object.keys(TD);
  return `<svg class="kd-defs" width="0" height="0" aria-hidden="true"><defs>
    <linearGradient id="kd-grass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#93cf6a"/><stop offset=".55" stop-color="#7cbf58"/><stop offset="1" stop-color="#6aae4b"/></linearGradient>
    <pattern id="kd-cobble" width="9" height="7" patternUnits="userSpaceOnUse"><path d="M0 3.5h9M4.5 0v3.5M0 7V3.5M9 3.5V7" stroke="#c99a5c" stroke-width=".6" fill="none"/></pattern>
    ${keys.map(k => `<symbol id="kd-tk-${k}" viewBox="0 0 100 100">${tileArt(k)}</symbol>`).join('')}
  </defs></svg>`;
}
function mount(r, api) {
  root = r; ui = api; V = null; cam = null; ghost = null; prevR = 0; rotAcc = 0; selF = -1; busy = false; tilesSig = ''; turnKey = ''; lastN = 0; vpH = 0; pointers = new Map(); drag = null; moved = false; spotsCache = { sig: '', list: [] };
  root.innerHTML = `<div class="g-wrap kd">
    ${defsSVG()}
    <div class="kd-players"></div>
    <div class="kd-stage">
      <div class="kd-vp">
        <svg class="kd-svg" xmlns="http://www.w3.org/2000/svg"><g class="kd-cam"><g class="kd-tl"></g><g class="kd-last"></g><g class="kd-spots"></g><g class="kd-ghost"></g><g class="kd-hl"></g><g class="kd-mee"></g><g class="kd-hot"></g></g></svg>
        <div class="kd-ctl">
          <button type="button" class="kd-ib" data-a="zin" aria-label="Yakınlaştır">＋</button>
          <button type="button" class="kd-ib" data-a="zout" aria-label="Uzaklaştır">－</button>
          <button type="button" class="kd-ib kd-fit" data-a="fit" aria-label="Tüm haritayı göster">⛶</button>
        </div>
        <div class="kd-floats"></div>
      </div>
    </div>
    <div class="kd-hud">
      <div class="kd-status g-status"></div>
      <div class="kd-row">
        <div class="kd-tilebox">
          <button type="button" class="kd-rot" data-a="rotL" aria-label="Sola döndür">⟲</button>
          <div class="kd-prev"></div>
          <button type="button" class="kd-rot" data-a="rotR" aria-label="Sağa döndür">⟳</button>
          <span class="kd-leftw" title="Torbada kalan karo">🎒 <b class="kd-left">0</b></span>
        </div>
        <div class="kd-acts"></div>
      </div>
    </div>
  </div>`;
  const q = s => root.querySelector(s);
  E = { vp: q('.kd-vp'), svg: q('.kd-svg'), cam: q('.kd-cam'), tl: q('.kd-tl'), last: q('.kd-last'), spots: q('.kd-spots'), ghost: q('.kd-ghost'), hl: q('.kd-hl'), mee: q('.kd-mee'), hot: q('.kd-hot'),
    floats: q('.kd-floats'), pl: q('.kd-players'), hud: q('.kd-hud'), status: q('.kd-status'), prev: q('.kd-prev'), left: q('.kd-left'), acts: q('.kd-acts'), rotL: q('[data-a="rotL"]'), rotR: q('[data-a="rotR"]'), fitBtn: q('.kd-fit') };
  root.addEventListener('click', onClick);
  E.vp.addEventListener('pointerdown', onPointerDown);
  E.vp.addEventListener('pointermove', onPointerMove);
  E.vp.addEventListener('pointerup', onPointerUp); E.vp.addEventListener('pointercancel', onPointerUp);
  E.vp.addEventListener('wheel', onWheel, { passive: false });
  addEventListener('resize', onResize); addEventListener('keydown', onKey);
}

DEF.mount = mount;
DEF.render = render;
DEF.onEvent = function (e) {
  switch (e.t) {
    case 'turn': {
      if (!ui) break;
      if (ui.mode === 'online' && e.pi === ui.me) { Sound.good(); banner('SIRA SENDE', 'good'); }
      else if (ui.me === 'all' && V && V.players.filter(p => !p.isBot).length > 1 && V.players[e.pi] && !V.players[e.pi].isBot) banner(V.players[e.pi].name.toLocaleUpperCase('tr-TR'));
      else Sound.tick(.4);
      break;
    }
    case 'place': Sound.tick(.3); break;
    case 'meeple': Sound.good(); break;
    case 'discard': Sound.bad(); banner('KARO UYMADI!', 'bad'); break;
    case 'score': {
      const items = e.items || [];
      scoreFx(items, false);
      const best = Math.max(0, ...items.filter(it => it.win.length).map(it => it.pts));
      if (best >= 12) { Sound.solve(); banner(items.some(it => it.type === 'c' && it.pts === best) ? 'MUHTEŞEM ŞEHİR!' : 'BÜYÜK PUAN!', 'good'); FX.confetti(60); }
      else if (best > 0) Sound.good();
      else Sound.tick(.6);
      break;
    }
    case 'final': Sound.fanfare(); scoreFx(e.items || [], true); setTimeout(() => FX.confetti(110), 400); break;
    default: break;
  }
};
DEF.unmount = function () {
  if (root) root.removeEventListener('click', onClick);
  removeEventListener('resize', onResize); removeEventListener('keydown', onKey);
  hlT.forEach(clearTimeout); hlT = [];
  root = null; V = null; E = {}; cam = null; ghost = null;
};
CFX.registerGame(DEF);
})();
