/* =========================================================================
   OYUN SALONU — TANK SAVAŞI
   Yandan görünüşlü, sıra tabanlı topçu savaşı. Parçalanabilir bit haritası
   arazi (mağaralar dâhil, kurucunun tohumundan üretilir), rüzgâr, 11 silah,
   paraşütle düşen kasalar, takım ve ani ölüm (yükselen su) seçenekleri.
   Kurucu atışı benzetir; sonuç (uçuş izleri, krater/toprak işlem günlüğü,
   hasarlar) herkese gönderilir. İstemciler araziyi aynı işlem günlüğüyle
   günceller ve sağlama toplamıyla doğrular.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial } = CFX;

/* ---------- sabitler ---------- */
const W = 2000, H = 1000, WATER0 = H - 62, FUEL = 110, HPMAX = 100, CLIMB = 2, OFF = 1500, STEP = 1.5;
const WINDK = .0016, SHD = 60, REP = 35, CRATE_HP = 30, MAXF = 60 * 22;
const D2R = Math.PI / 180;
const THEMES = {
  col: { name: 'Çöl', icon: '🏜️', g: .12, vmax: 14, caves: 2, liquid: 'su',
    sky: ['#ff8a5b', '#ffc27a', '#ffe8b5'], far: '#e3a06e', near: '#c9784f',
    top: [255, 224, 150], dirt: [226, 164, 92], deep: [160, 98, 50], edge: [104, 58, 26], water: ['#36c2c9', '#1d8f9e'] },
  dag: { name: 'Karlı Dağ', icon: '🏔️', g: .12, vmax: 14, caves: 3, liquid: 'su',
    sky: ['#3654a8', '#7fa6e6', '#d6e8ff'], far: '#9bb2e0', near: '#7088c4',
    top: [248, 251, 255], dirt: [132, 136, 156], deep: [80, 82, 104], edge: [48, 50, 70], water: ['#3f8ee0', '#1f5fae'] },
  ada: { name: 'Ada', icon: '🏝️', g: .12, vmax: 14, caves: 2, liquid: 'su',
    sky: ['#2aa8f5', '#8ad8ff', '#e8faff'], far: '#86cbe6', near: '#6cb894',
    top: [96, 214, 98], dirt: [180, 120, 68], deep: [118, 74, 42], edge: [64, 40, 22], water: ['#1fb0e6', '#0e6fae'] },
  ay: { name: 'Ay Yüzeyi', icon: '🌕', g: .05, vmax: 9, caves: 1, liquid: 'boşluk',
    sky: ['#04020c', '#120a30', '#2a1a58'], far: '#3c3666', near: '#2d2950',
    top: [218, 218, 230], dirt: [152, 152, 170], deep: [94, 94, 114], edge: [52, 52, 70], water: ['#7a4dff', '#3a1a9e'] }
};
const WEAPONS = [
  { k: 'std', name: 'Standart Mermi', short: 'Standart', icon: '🔴', ammo: -1, r: 26, d: 34, kb: 3, desc: 'Sınırsız, güvenilir' },
  { k: 'tri', name: 'Üçlü Atış', short: 'Üçlü', icon: '🔱', ammo: 3, r: 18, d: 18, kb: 2, desc: 'Yelpaze gibi üç mermi' },
  { k: 'big', name: 'Büyük Bomba', short: 'Büyük', icon: '💣', ammo: 1, r: 54, d: 58, kb: 6, desc: 'Dev krater, yüksek hasar' },
  { k: 'bnc', name: 'Zıplayan Bomba', short: 'Zıplayan', icon: '🏀', ammo: 2, r: 30, d: 38, kb: 3.5, desc: 'Sekip tanka değince patlar' },
  { k: 'air', name: 'Hava Saldırısı', short: 'Hava', icon: '✈️', ammo: 1, r: 22, d: 20, kb: 2.5, target: true, desc: 'Hedefe yukarıdan 5 bomba' },
  { k: 'dig', name: 'Kazıcı', short: 'Kazıcı', icon: '⛏️', ammo: 2, r: 18, d: 22, kb: 2, desc: 'Toprağı delip tünel açar' },
  { k: 'dirt', name: 'Toprak Bombası', short: 'Toprak', icon: '🟤', ammo: 2, r: 42, d: 0, kb: 0, desc: 'Toprak yığar, gömer' },
  { k: 'nap', name: 'Napalm', short: 'Napalm', icon: '🔥', ammo: 1, r: 14, d: 10, kb: 1, desc: 'Yanan alevler yayılır' },
  { k: 'tel', name: 'Işınlanma', short: 'Işınlan', icon: '🌀', ammo: 1, target: true, util: true, desc: 'Seçtiğin yere geç' },
  { k: 'shd', name: 'Kalkan', short: 'Kalkan', icon: '🛡️', ammo: 1, util: true, desc: `${SHD} hasarı emer` },
  { k: 'rep', name: 'Tamir Kiti', short: 'Tamir', icon: '🔧', ammo: 1, util: true, desc: `+${REP} can` }
];
const WMAP = Object.fromEntries(WEAPONS.map(w => [w.k, w]));
const DEATHW = { k: 'death', r: 28, d: 20, kb: 3.5 };
const CRATE_W = ['tri', 'big', 'bnc', 'air', 'dig', 'dirt', 'nap', 'tel', 'shd', 'big', 'air', 'nap'];
const SAY_FIRE = ['Al bakalım!', 'Bu da benden!', 'Hediyem olsun!', 'Kaç kaç!', 'Ateş serbest!', 'Tam isabet geliyor!', 'Selam söyle!', 'Bunu da dene!', 'Paketini yolladım!', 'Hop, geliyor!'];
const SAY_HIT = ['Ayy!', 'Bu acıttı!', 'Kaportam!', 'Öcümü alacağım!', 'Tamirciye gidiyorum…', 'Hey, boyam yeniydi!', 'Ah paletlerim!', 'Bunu ödeyeceksin!'];
const SAY_MISS = ['Rüzgâr yüzünden!', 'Isınma atışıydı.', 'Kuşa attım kuşa!', 'Az kalsın!', 'Bilerek ıskaladım.', 'Gözüme güneş geldi!'];
const SAY_KILL = ['Hoşça kal!', 'Sıradaki gelsin!', 'Paketlendi!', 'Hurdacıya selam!'];
const SAY_DIE = ['Annemi arayın…', 'Bunu unutmayacağım!', 'Yandım ben!', 'Hurdaya mı?!'];
const SAY_SELF = ['Ups…', 'Kendi kendime…', 'Bunu kimse görmedi, değil mi?'];

/* ---------- yardımcılar ---------- */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function mulberry(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const pickR = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];
const teamName = k => k === 0 ? 'A Takımı' : 'B Takımı';

/* ---------- arazi: bit haritası (0 hava, 1 toprak) ---------- */
function vnoise(r, step) {
  const n = Math.ceil(W / step) + 2, pts = [];
  for (let i = 0; i < n; i++) pts.push(r());
  const out = new Float64Array(W);
  for (let x = 0; x < W; x++) { const u = x / step, i = Math.floor(u), f = u - i, s = f * f * (3 - 2 * f); out[x] = pts[i] + (pts[i + 1] - pts[i]) * s; }
  return out;
}
function solid(T, x, y) {
  x = Math.floor(x); y = Math.floor(y);
  return x >= 0 && x < W && y >= 0 && y < H && T.a[y * W + x] === 1;
}
function carveC(T, cx, cy, r, v) {
  const a = T.a, rr = r * r;
  for (let y = Math.max(0, cy - r), y1 = Math.min(H - 1, cy + r); y <= y1; y++) {
    const q = rr - (y - cy) * (y - cy);
    let dx = Math.floor(Math.sqrt(q)); while (dx * dx > q) dx--; while ((dx + 1) * (dx + 1) <= q) dx++;
    const x0 = Math.max(0, cx - dx), x1 = Math.min(W - 1, cx + dx);
    if (x0 <= x1) a.fill(v, y * W + x0, y * W + x1 + 1);
  }
}
function tunnel(T, x1, y1, x2, y2, r) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 3));
  for (let i = 0; i <= n; i++) carveC(T, Math.round(x1 + (x2 - x1) * i / n), Math.round(y1 + (y2 - y1) * i / n), r, 0);
}
function newTerrain(seed, theme) {
  const r = mulberry(seed >>> 0), a = new Uint8Array(W * H), T = { a, seed, theme, len: 0 };
  const n1 = vnoise(r, 460), n2 = vnoise(r, 170), n3 = vnoise(r, 55);
  const surf = new Int32Array(W);
  for (let x = 0; x < W; x++) {
    const e1 = n1[x] - .5, e2 = n2[x] - .5, e3 = n3[x] - .5;
    let y;
    if (theme === 'dag') { const ridge = .5 - Math.abs(e2); y = 700 - e1 * 440 - ridge * 330 - e3 * 40; }
    else if (theme === 'ada') { const u = (x - W / 2) / (W * .5); y = 1000 - (1 - u * u * 1.5) * 470 - e1 * 170 - e2 * 90 - e3 * 22; }
    else if (theme === 'ay') y = 690 - e1 * 230 - e2 * 70 - e3 * 14;
    else y = 650 - e1 * 290 - e2 * 120 - e3 * 22;
    surf[x] = Math.round(clamp(y, 250, H - 4));
  }
  for (let x = 0; x < W; x++) for (let y = surf[x]; y < H; y++) a[y * W + x] = 1;
  T.surf = surf;
  const caves = (THEMES[theme] || THEMES.col).caves;
  for (let c = 0; c < caves; c++) {
    let x = 260 + r() * (W - 520), dx = r() < .5 ? -1 : 1, dy = .1;
    let y = surf[Math.round(x)] + 70 + r() * 90;
    const steps = 16 + Math.floor(r() * 14);
    for (let s = 0; s < steps; s++) {
      const xi = clamp(Math.round(x), 0, W - 1);
      y = clamp(y, surf[xi] + 30, WATER0 - 40);
      carveC(T, xi, Math.round(y), 13 + Math.floor(r() * 9), 0);
      dx = clamp(dx + (r() - .5) * .5, -1, 1); dy = clamp(dy + (r() - .5) * .5, -.6, .6);
      if (Math.abs(dx) < .35) dx = dx < 0 ? -.35 : .35;
      x = clamp(x + dx * 15, 40, W - 40); y += dy * 10;
    }
  }
  if (theme === 'ay') for (let k = 0; k < 9; k++) { const x = Math.round(80 + r() * (W - 160)), rad = Math.round(30 + r() * 58); carveC(T, x, Math.round(surf[x] + rad * .35), rad, 0); }
  return T;
}
/* işlem günlüğü: c=krater, f=toprak, t=tünel; sabit uzunluklu taban-36 parçalar */
const enc = (v, n) => clamp(Math.round(v), 0, 36 ** n - 1).toString(36).padStart(n, '0');
const OPL = { c: 9, f: 9, t: 15 };
function opStr(k, x, y, r, x2, y2) {
  if (k === 't') return 't' + enc(x + OFF, 3) + enc(y + OFF, 3) + enc(x2 + OFF, 3) + enc(y2 + OFF, 3) + enc(r, 2);
  return k + enc(x + OFF, 3) + enc(y + OFF, 3) + enc(r, 2);
}
function opParse(s, i) {
  const k = s[i], n = (o, l) => parseInt(s.substr(i + o, l), 36);
  if (k === 't') return { k, x: n(1, 3) - OFF, y: n(4, 3) - OFF, x2: n(7, 3) - OFF, y2: n(10, 3) - OFF, r: n(13, 2) };
  return { k, x: n(1, 3) - OFF, y: n(4, 3) - OFF, r: n(7, 2) };
}
function applyOp(T, s, i) {
  const o = opParse(s, i);
  if (o.k === 't') tunnel(T, o.x, o.y, o.x2, o.y2, o.r); else carveC(T, o.x, o.y, o.r, o.k === 'f' ? 1 : 0);
  return i + OPL[o.k];
}
function applyOps(T, s, upto) { let i = T.len; while (i < upto && OPL[s[i]]) i = applyOp(T, s, i); T.len = i; }
function checksum(T) { const a = T.a; let h = 0x811c9dc5 | 0; for (let i = 0; i < a.length; i++) h = Math.imul(h ^ a[i], 16777619); return (h >>> 0).toString(36); }

/* zemin ve yürüme */
function supported(T, x, y) { x = Math.round(x); y = Math.round(y); for (let k = -4; k <= 4; k++) if (solid(T, x + k, y + 1)) return true; return false; }
function canStand(T, x, y) { return !solid(T, x, y) && !solid(T, x, y - 7) && !solid(T, x, y - 13) && supported(T, x, y); }
function walkStep(T, x, y, d) {
  const nx = x + d;
  if (nx < 3 || nx > W - 4) return null;
  for (let ny = y - CLIMB; ny <= y + 4; ny++) if (canStand(T, nx, ny)) return { x: nx, y: ny };
  if (!solid(T, nx, y) && !solid(T, nx, y - 7) && !solid(T, nx, y - 13)) return { x: nx, y, fall: true };
  return null;
}
function dropY(T, x, y, water) { while (y < water && !supported(T, x, y)) y++; return y; }
function dropFromTop(T, x, water) {
  for (let y = 0; y < water; y++) if (canStand(T, x, y)) return y;
  return -1;
}
function teleLand(T, x, y, water) {
  x = Math.round(x); y = Math.max(0, Math.round(y));
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 12 || x > W - 12 || y >= water) return null;
  if (solid(T, x, y)) return null;
  const y2 = dropY(T, x, y, water);
  if (y2 >= water - 2 || !canStand(T, x, y2)) return null;
  return y2;
}
const fallDmg = v => v > 5.6 ? Math.round((v - 5.6) * 9) : 0;
const tipOf = (t, a) => ({ x: t.x + Math.cos(a * D2R) * 17, y: t.y - 11 - Math.sin(a * D2R) * 17 });

/* ---------- uçuş (kurucu benzetimi ve bot araması ortak) ---------- */
function hitTank(E, x, y, skip) {
  const ts = E.tanks;
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i]; if (i === skip || !t.alive || t.sunk) continue;
    const dx = x - t.x, dy = y - (t.y - 8); if (dx * dx + dy * dy < 144) return i;
  }
  return -1;
}
function ballistic(E, o) {
  o.vy += E.g * (o.gm == null ? 1 : o.gm); o.vx += E.ax * (o.wm == null ? 1 : o.wm);
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(o.vx), Math.abs(o.vy)) / STEP));
  for (let s = 0; s < n; s++) {
    const px = o.x, py = o.y;
    o.x += o.vx / n; o.y += o.vy / n;
    const ht = hitTank(E, o.x, o.y, o.safe > 0 ? o.own : -1);
    if (ht >= 0) return { x: o.x, y: o.y, px, py, tank: ht };
    if (solid(E.T, o.x, o.y)) return { x: o.x, y: o.y, px, py, tank: -1 };
    if (o.y >= E.water) { o.gone = 'water'; return null; }
    if (o.x < -300 || o.x > W + 300) { o.gone = 'out'; return null; }
  }
  if (o.safe > 0) o.safe--;
  return null;
}
function fly(T, tanks, water, g, ax, x, y, vx, vy, own, maxF) {
  // ballistic() ile aynı aritmetik, yerel değişkenlerle hızlı döngü (bot araması binlerce kez çağırır)
  const a = T.a, ts = [];
  let b0 = 1e9, b1 = -1e9, b2 = 1e9, b3 = -1e9;
  for (let i = 0; i < tanks.length; i++) { const t = tanks[i]; if (!t.alive || t.sunk) continue; ts.push(i, t.x, t.y - 8); b0 = Math.min(b0, t.x - 13); b1 = Math.max(b1, t.x + 13); b2 = Math.min(b2, t.y - 21); b3 = Math.max(b3, t.y + 5); }
  let safe = own >= 0 ? 8 : 0;
  for (let f = 0; f < maxF; f++) {
    vy += g; vx += ax;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(vx), Math.abs(vy)) / STEP));
    for (let s = 0; s < n; s++) {
      const px = x, py = y;
      x += vx / n; y += vy / n;
      if (x >= b0 && x <= b1 && y >= b2 && y <= b3) {
        for (let k = 0; k < ts.length; k += 3) { if (safe > 0 && ts[k] === own) continue; const dx = x - ts[k + 1], dy = y - ts[k + 2]; if (dx * dx + dy * dy < 144) return { x, y, px, py, tank: ts[k], f }; }
      }
      const xi = Math.floor(x), yi = Math.floor(y);
      if (xi >= 0 && xi < W && yi >= 0 && yi < H && a[yi * W + xi] === 1) return { x, y, px, py, tank: -1, f };
      if (y >= water) return { x, y, tank: -1, water: true, f };
      if (x < -300 || x > W + 300) return { x, y, tank: -1, out: true, f };
    }
    if (safe > 0) safe--;
  }
  return null;
}

/* ---------- atış benzetimi (yalnız kurucu) ---------- */
function makeSim(T, st, rnd) {
  const th = THEMES[st.theme];
  return { T, st, tanks: st.tanks, g: th.g, ax: st.wind * WINDK, water: st.water, f: 0, objs: [], pend: [], ops: '', opT: [], fx: [], tr: [], segs: {}, burn: {}, say: [],
    rnd, shooter: st.cur, idle: 0, hits: {}, kills: [], picks: [], dur: 0 };
}
function fxPush(S, o) { o.t = S.f; S.fx.push(o); return o; }
function sayAt(S, pi, list, dt = 0) { S.say.push({ t: S.f + dt, pi, s: pickR(list, S.rnd) }); }
function addOp(S, s) { applyOp(S.T, s, 0); S.ops += s; S.opT.push(S.f); }
function newObj(S, o) { o.tr = { k: o.k, w: o.w, t0: S.f, p: [Math.round(o.x), Math.round(o.y)] }; S.objs.push(o); S.tr.push(o.tr); return o; }
function endObj(S, o) { if (o.dead) return; o.dead = true; o.tr.p.push(Math.round(o.x), Math.round(o.y)); o.tr.t1 = S.f; }
function startSeg(S, i) {
  if (S.segs[i]) return;
  const t = S.tanks[i], seg = { k: 'tank', pi: i, t0: S.f, p: [Math.round(t.x), Math.round(t.y)] };
  S.segs[i] = seg; S.tr.push(seg);
}
function endSeg(S, i) { const seg = S.segs[i]; if (!seg) return; const t = S.tanks[i]; seg.p.push(Math.round(t.x), Math.round(t.y)); seg.t1 = S.f; delete S.segs[i]; }
function isEnemy(S, a, b) { return a !== b && S.tanks[a].team !== S.tanks[b].team; }
function dealDmg(S, i, amt) {
  const t = S.tanks[i]; if (!t.alive || amt <= 0) return;
  let a = amt, ab = 0;
  if (t.sh > 0) { ab = Math.min(t.sh, a); t.sh -= ab; a -= ab; }
  t.hp = Math.max(0, t.hp - a);
  fxPush(S, { k: 'dmg', pi: i, v: a, ab });
  if (!(i in S.hits)) { S.hits[i] = 0; if (a > 0 && t.hp > 0 && i !== S.shooter) sayAt(S, i, SAY_HIT, 14); }
  S.hits[i] += a;
  const sh = S.tanks[S.shooter];
  if (sh && isEnemy(S, S.shooter, i)) sh.dmg += a;
  if (t.hp <= 0) kill(S, i);
}
function kill(S, i, noBoom) {
  const t = S.tanks[i]; if (!t.alive) return;
  t.alive = false; t.hp = 0; t.dOrd = ++S.st.deathN; t.sh = 0;
  fxPush(S, { k: 'die', pi: i });
  S.kills.push(i);
  if (!noBoom) sayAt(S, i, SAY_DIE, 2);
  const sh = S.tanks[S.shooter];
  if (sh && isEnemy(S, S.shooter, i)) { sh.kills++; if (sh.alive) sayAt(S, S.shooter, SAY_KILL, 30); }
  if (!noBoom) S.pend.push({ t: S.f + 34, fn: () => { if (!t.sunk) boom(S, t.x, t.y - 6, DEATHW); } });
}
function push(S, i, vx, vy) {
  const t = S.tanks[i];
  if (t.sunk || solid(S.T, t.x, t.y)) return;
  if (!t.dyn) { t.dyn = true; t.vx = 0; t.vy = 0; startSeg(S, i); }
  t.vx += vx; t.vy += vy;
}
function settleCheck(S) {
  S.tanks.forEach((t, i) => {
    if (t.dyn || t.sunk) return;
    if (!solid(S.T, t.x, t.y) && !supported(S.T, t.x, t.y)) { t.dyn = true; t.vx = 0; t.vy = 0; startSeg(S, i); }
  });
}
function boom(S, x, y, w) {
  const xi = Math.round(x), yi = Math.round(y);
  if (w.k === 'dirt') {
    addOp(S, opStr('f', xi, yi, w.r));
    fxPush(S, { k: 'boom', x: xi, y: yi, r: w.r, s: 'dirt' });
    S.tanks.forEach((t, i) => { if (t.alive && !t.sunk && solid(S.T, t.x, t.y - 4)) fxPush(S, { k: 'bury', pi: i }); });
    settleCheck(S);
    return;
  }
  addOp(S, opStr('c', xi, yi, w.r));
  fxPush(S, { k: 'boom', x: xi, y: yi, r: w.r, s: w.k });
  S.tanks.forEach((t, i) => {
    if (t.sunk) return;
    const dx = t.x - x, dy = t.y - 8 - y, d = Math.sqrt(dx * dx + dy * dy), reach = w.r + 10;
    if (d >= reach) return;
    const f = clamp(1 - Math.max(0, d - 8) / reach, 0, 1);
    if (t.alive && w.d) dealDmg(S, i, Math.round(w.d * f));
    if (w.kb && f > 0) { const kb = w.kb * f, inv = 1 / (d || 1); push(S, i, dx * inv * kb, dy * inv * kb - kb * .55); }
  });
  S.st.crates = S.st.crates.filter(c => {
    const dx = c.x - x, dy = c.y - 8 - y;
    if (dx * dx + dy * dy < (w.r + 12) * (w.r + 12)) { fxPush(S, { k: 'cpop', id: c.id, x: c.x, y: c.y }); return false; }
    return true;
  });
  settleCheck(S);
}
function splash(S, x) { fxPush(S, { k: 'splash', x: Math.round(x) }); }
function normalAt(T, x, y) {
  let nx = 0, ny = 0; const xi = Math.round(x), yi = Math.round(y);
  for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) if (solid(T, xi + dx, yi + dy)) { nx -= dx; ny -= dy; }
  const l = Math.sqrt(nx * nx + ny * ny);
  return l < 1e-6 ? { x: 0, y: -1 } : { x: nx / l, y: ny / l };
}
function stepObj(S, o) {
  if (o.k === 'fire') return stepFire(S, o);
  if (o.k === 'dig' && o.mode === 'dig') return stepDig(S, o);
  if (o.k === 'bnc' && --o.life <= 0) { boom(S, o.x, o.y, WMAP.bnc); endObj(S, o); return; }
  const h = ballistic(S, o);
  if (o.gone) { if (o.gone === 'water') splash(S, o.x); endObj(S, o); return; }
  if (!h) return;
  const w = WMAP[o.w];
  if (o.k === 'bnc' && h.tank < 0) {
    const n = normalAt(S.T, h.x, h.y); o.x = h.px; o.y = h.py;
    const dot = o.vx * n.x + o.vy * n.y;
    if (dot < 0) { o.vx -= 2 * dot * n.x; o.vy -= 2 * dot * n.y; }
    o.vx *= .62; o.vy *= .62; o.b++;
    fxPush(S, { k: 'bnc', x: Math.round(o.x), y: Math.round(o.y) });
    if (o.b > 3 || Math.abs(o.vx) + Math.abs(o.vy) < 1.3) { boom(S, o.x, o.y, w); endObj(S, o); }
    return;
  }
  if (o.k === 'dig' && h.tank < 0) {
    const sp = Math.sqrt(o.vx * o.vx + o.vy * o.vy) || 1;
    o.mode = 'dig'; o.dx = o.vx / sp; o.dy = o.vy / sp; o.dist = 0; o.lx = h.px; o.ly = h.py; o.x = h.px; o.y = h.py;
    fxPush(S, { k: 'drill', x: Math.round(o.x), y: Math.round(o.y) });
    return;
  }
  if (o.w === 'nap') {
    boom(S, h.x, h.y, w);
    for (let k = 0; k < 11; k++) newObj(S, { k: 'fire', w: 'nap', x: h.px, y: h.py - 3, vx: (S.rnd() - .5) * 4.6 + o.vx * .15, vy: -1 - S.rnd() * 3.2, life: 150 + Math.floor(S.rnd() * 70), sd: S.rnd() < .5 ? -1 : 1 });
    endObj(S, o); return;
  }
  boom(S, h.x, h.y, w); endObj(S, o);
}
function stepDig(S, o) {
  for (let s = 0; s < 3; s++) {
    o.x += o.dx; o.y += o.dy; o.dist++;
    const ht = hitTank(S, o.x, o.y, o.dist < 20 ? o.own : -1);
    const out = o.y >= S.water || o.x < 0 || o.x >= W || o.y < -50;
    if (ht >= 0 || out || o.dist >= 170) {
      addOp(S, opStr('t', Math.round(o.lx), Math.round(o.ly), 10, Math.round(o.x), Math.round(o.y)));
      if (o.y >= S.water) splash(S, o.x); else boom(S, o.x, o.y, WMAP.dig);
      endObj(S, o); return;
    }
    if (o.dist % 16 === 0) { addOp(S, opStr('t', Math.round(o.lx), Math.round(o.ly), 10, Math.round(o.x), Math.round(o.y))); o.lx = o.x; o.ly = o.y; settleCheck(S); }
  }
}
function stepFire(S, o) {
  o.life--;
  const T = S.T;
  if (!o.stuck) {
    o.vy += S.g; o.vx += S.ax * .4;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(o.vx), Math.abs(o.vy))));
    for (let s = 0; s < n; s++) {
      const px = o.x, py = o.y; o.x += o.vx / n; o.y += o.vy / n;
      if (solid(T, o.x, o.y)) { o.x = px; o.y = py; o.stuck = true; o.vx = 0; o.vy = 0; break; }
    }
  } else if (!solid(T, o.x, o.y + 1.5)) { o.stuck = false; o.vx = 0; o.vy = 0; }
  else if (S.f % 3 === 0) {
    const d = o.sd;
    if (!solid(T, o.x + d, o.y + 1) && !solid(T, o.x + d, o.y)) o.x += d;
    else if (!solid(T, o.x - d, o.y + 1) && !solid(T, o.x - d, o.y)) { o.x -= d; o.sd = -d; }
  }
  if (o.y >= S.water || o.x < -50 || o.x > W + 50) { fxPush(S, { k: 'hiss', x: Math.round(o.x) }); endObj(S, o); return; }
  S.tanks.forEach((t, i) => { if (!t.alive || t.sunk) return; const dx = t.x - o.x, dy = t.y - 8 - o.y; if (dx * dx + dy * dy < 225) S.burn[i] = (S.burn[i] || 0) + .1; });
  if (o.life <= 0) { if (o.stuck) addOp(S, opStr('c', Math.round(o.x), Math.round(o.y + 2), 5)); endObj(S, o); settleCheck(S); }
}
function stepTank(S, t, i) {
  t.vy += S.g; t.vx *= .995;
  const T = S.T, n = Math.max(1, Math.ceil(Math.max(Math.abs(t.vx), Math.abs(t.vy))));
  for (let s = 0; s < n; s++) {
    let nx = t.x + t.vx / n, ny = t.y + t.vy / n;
    if (t.vx !== 0 && solid(T, nx, ny - 8)) { t.vx *= -.3; nx = t.x; }
    if (t.vy < 0 && solid(T, nx, ny - 14)) { t.vy = 0; ny = t.y; }
    if (t.vy >= 0 && (solid(T, nx, ny) || supported(T, nx, ny))) {
      const xx = Math.round(nx); let yy = Math.round(ny), k = 0;
      while (solid(T, xx, yy) && k++ < 12) yy--;
      t.x = xx; t.y = yy;
      const v = t.vy; t.dyn = false; t.vx = 0; t.vy = 0; endSeg(S, i);
      if (t.alive) { const dm = fallDmg(v * Math.sqrt(.12 / S.g)); if (dm > 0) { fxPush(S, { k: 'thud', pi: i }); dealDmg(S, i, dm); } }
      return;
    }
    t.x = nx; t.y = ny;
    if (t.y >= S.water) {
      t.dyn = false; t.sunk = true; t.y = S.water + 6; endSeg(S, i); splash(S, t.x);
      if (t.alive) { fxPush(S, { k: 'drown', pi: i }); kill(S, i, true); }
      return;
    }
  }
}
function runSim(S) {
  for (; S.f < MAXF; S.f++) {
    for (let i = 0; i < S.pend.length; i++) { const p = S.pend[i]; if (p.t <= S.f) { S.pend.splice(i--, 1); p.fn(); } }
    const n = S.objs.length;
    for (let i = 0; i < n; i++) { const o = S.objs[i]; if (!o.dead) stepObj(S, o); }
    S.tanks.forEach((t, i) => { if (t.dyn) stepTank(S, t, i); });
    if (S.f % 12 === 11) for (const k in S.burn) { const a = Math.floor(S.burn[k]); if (a >= 1) { S.burn[k] -= a; dealDmg(S, +k, a); } }
    for (const o of S.objs) if (!o.dead && (S.f + 1 - o.tr.t0) % 2 === 0) o.tr.p.push(Math.round(o.x), Math.round(o.y));
    for (const k in S.segs) { const seg = S.segs[k], t = S.tanks[k]; if ((S.f + 1 - seg.t0) % 2 === 0) seg.p.push(Math.round(t.x), Math.round(t.y)); }
    S.objs = S.objs.filter(o => !o.dead);
    const busy = S.objs.length || S.pend.length || S.tanks.some(t => t.dyn) || Object.keys(S.segs).length;
    if (!busy) { if (++S.idle > 8) break; } else S.idle = 0;
  }
  S.objs.forEach(o => endObj(S, o)); S.objs = [];
  S.tanks.forEach((t, i) => {
    if (t.dyn) { t.dyn = false; t.y = dropY(S.T, Math.round(t.x), Math.round(t.y), S.water); if (t.y >= S.water) { t.sunk = true; if (t.alive) kill(S, i, true); } }
    endSeg(S, i);
    t.x = Math.round(t.x); t.y = Math.round(t.y); delete t.dyn; delete t.vx; delete t.vy;
  });
  S.dur = S.f + 12;
}
function encPts(p) { let s = ''; for (let i = 0; i < p.length; i++) s += enc(p[i] + OFF, 3); return s; }
function decPts(s) { const out = new Array(s.length / 3); for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 3, 3), 36) - OFF; return out; }

/* ---------- kurucu tarafı: durum ---------- */
let HT = null;   // kurucunun arazi önbelleği (tohum + işlem günlüğü)
function terr(st) {
  if (!HT || HT.seed !== st.seed || HT.theme !== st.theme || HT.len > st.ops.length) HT = newTerrain(st.seed, st.theme);
  if (HT.len < st.ops.length) applyOps(HT, st.ops, st.ops.length);
  return HT;
}
const aliveTeams = st => [...new Set(st.tanks.filter(t => t.alive).map(t => t.team))];
function nextAlive(st, from) {
  const n = st.tanks.length;
  for (let k = 1; k <= n; k++) { const j = (from + k) % n; if (st.tanks[j].alive) return j; }
  return -1;
}
function pickupAt(st, pi) {
  const t = st.tanks[pi], out = [];
  if (!t.alive) return out;
  st.crates = st.crates.filter(c => {
    if (Math.abs(c.x - t.x) < 20 && Math.abs(c.y - t.y) < 26) {
      let txt;
      if (c.k === 'hp') { const v = Math.min(CRATE_HP, HPMAX - t.hp); t.hp += v; txt = `+${v} can`; }
      else { const n = c.w === 'tri' ? 2 : 1; t.ammo[c.w] = (t.ammo[c.w] || 0) + n; txt = `+${n} ${WMAP[c.w].short}`; }
      out.push({ id: c.id, txt, k: c.k, w: c.w });
      return false;
    }
    return true;
  });
  return out;
}
function sinkTank(st, i) { const t = st.tanks[i]; if (!t.alive) return; t.alive = false; t.hp = 0; t.sunk = true; t.sh = 0; t.dOrd = ++st.deathN; }
function armTimer(st, ctx) {
  const tid = st.turnId, ms = Math.max(400, st.turnEnd - Date.now());
  ctx.later(ms + 60, () => { if (st.turnId === tid && st.phase === 'aim') passTurn(st, ctx, 'time'); });
}
function newWind(st) { const r = Math.random(); st.wind = r < .12 ? 0 : Math.round((Math.random() * 2 - 1) * (st.round > 4 ? 10 : 8)); }
function nextTurn(st, ctx) {
  if (checkWin(st, ctx)) return;
  const n = nextAlive(st, st.cur);
  if (n < 0) return;
  if (n <= st.cur) st.round++;
  st.cur = n; st.turnId++; st.phase = 'aim'; st.bp = null; st.shot = null;
  newWind(st);
  const t = st.tanks[n]; t.fuel = FUEL;
  if (!(t.w in WMAP) || (WMAP[t.w].ammo >= 0 && !(t.ammo[t.w] > 0))) t.w = 'std';
  st.turnEnd = Date.now() + st.timer * 1000;
  ctx.emit({ t: 'turn', pi: n });
  ctx.sync();
  armTimer(st, ctx);
}
function betweenTurns(st, ctx) {
  st.phase = 'between'; st.shot = null;
  let wait = 420;
  if (st.sd && st.round >= st.sd) {
    st.water = Math.max(330, st.water - 14); st.rising = true;
    ctx.emit({ t: 'rise', y: st.water });
    st.tanks.forEach((t, i) => { if (t.alive && t.y >= st.water - 3) { sinkTank(st, i); ctx.emit({ t: 'drown', pi: i }, `🌊 ${st.players[i].name} sulara gömüldü!`, 'bad'); } else if (!t.alive && t.y >= st.water) t.sunk = true; });
    st.crates = st.crates.filter(c => c.y < st.water - 4);
    wait = 900;
  }
  if (checkWin(st, ctx)) return;
  if (st.crOn && st.crates.length < 3 && Math.random() < .42) {
    const T = terr(st);
    for (let k = 0; k < 30; k++) {
      const x = Math.round(80 + Math.random() * (W - 160));
      if (st.tanks.some(t => t.alive && Math.abs(t.x - x) < 70)) continue;
      const y = dropFromTop(T, x, st.water);
      if (y < 0 || y > st.water - 14) continue;
      const k2 = Math.random() < .3 ? 'hp' : 'ammo';
      const c = { id: ++st.crateId, x, y, k: k2, w: k2 === 'ammo' ? CRATE_W[Math.floor(Math.random() * CRATE_W.length)] : null, ts: Date.now() };
      st.crates.push(c);
      ctx.emit({ t: 'crate', id: c.id }, '📦 Gökten bir kasa süzülüyor!', 'gold');
      wait = 1700; break;
    }
  }
  ctx.sync();
  const tid = st.turnId;
  ctx.later(wait, () => { if (st.turnId === tid && st.phase === 'between') nextTurn(st, ctx); });
}
function passTurn(st, ctx, why) {
  if (st.phase !== 'aim') return;
  const nm = st.players[st.cur].name;
  if (why === 'time') ctx.emit({ t: 'pass', pi: st.cur, why }, `⏱ ${nm} için süre doldu, sıra geçti.`, 'bad');
  else if (why === 'off') ctx.emit({ t: 'pass', pi: st.cur, why });
  else ctx.emit({ t: 'pass', pi: st.cur, why }, `${nm} pas geçti.`);
  betweenTurns(st, ctx);
}
function checkWin(st, ctx) {
  if (st.phase === 'over') return true;
  const teams = aliveTeams(st);
  if (teams.length > 1) return false;
  st.phase = 'over'; st.shot = null;
  const P = st.players, T = st.tanks;
  let title;
  if (!teams.length) title = 'Berabere! Ayakta kalan olmadı.';
  else if (st.teams) title = `${teamName(teams[0])} kazandı!`;
  else { const w = T.findIndex(t => t.alive); title = `${P[w].name} savaşı kazandı!`; }
  st.win = { team: teams.length ? teams[0] : null };
  ctx.emit({ t: 'win', team: st.win.team }, '🏆 ' + title, 'good');
  ctx.sync();
  const order = T.map((t, i) => i).sort((a, b) => {
    const wa = teams.includes(T[a].team) ? 1 : 0, wb = teams.includes(T[b].team) ? 1 : 0;
    if (wa !== wb) return wb - wa;
    if (T[a].alive !== T[b].alive) return T[a].alive ? -1 : 1;
    if (!T[a].alive && T[a].dOrd !== T[b].dOrd) return T[b].dOrd - T[a].dOrd;
    return T[b].dmg - T[a].dmg;
  });
  ctx.later(2000, () => ctx.end({
    title,
    ranking: order.map(i => ({ pi: i, label: `${T[i].alive ? '🏆 ' : ''}${T[i].dmg} hasar${T[i].kills ? ` · ${T[i].kills} 💥` : ''}` })),
    note: `${THEMES[st.theme].icon} ${THEMES[st.theme].name} · ${st.round}. tur${st.teams ? ' · takım savaşı' : ''}`
  }));
  return true;
}
function doMove(st, pi, a, ctx, isBot) {
  if (st.phase !== 'aim' || st.cur !== pi) return false;
  const t = st.tanks[pi]; if (!t.alive) return false;
  const d = a.d > 0 ? 1 : -1;
  let n = Math.min(a.n | 0, isBot ? FUEL : 30, t.fuel);
  if (Number.isFinite(+a.s)) t.ms = +a.s;
  if (n <= 0) { ctx.sync(); return false; }
  const T = terr(st), g = THEMES[st.theme].g;
  let fell = false, picks = [];
  for (let k = 0; k < n; k++) {
    const s = walkStep(T, t.x, t.y, d); if (!s) break;
    t.x = s.x; t.y = s.y; t.fuel--;
    picks = picks.concat(pickupAt(st, pi));
    if (s.fall) { fell = true; break; }
  }
  t.face = d;
  if (fell) {
    const y0 = t.y; t.y = dropY(T, t.x, t.y, st.water);
    if (t.y >= st.water) {
      t.y = st.water + 6; sinkTank(st, pi);
      ctx.emit({ t: 'drown', pi }, `🌊 ${st.players[pi].name} kendini ${THEMES[st.theme].liquid === 'su' ? 'suya' : 'boşluğa'} attı!`, 'bad');
      ctx.sync(); ctx.later(900, () => { if (st.phase === 'aim') betweenTurns(st, ctx); });
      return true;
    }
    const dm = fallDmg(Math.sqrt(2 * g * (t.y - y0)) * Math.sqrt(.12 / g));
    if (dm > 0) {
      t.hp = Math.max(0, t.hp - dm);
      ctx.emit({ t: 'ouch', pi, v: dm }, `${st.players[pi].name} uçurumdan düştü: −${dm}`, 'bad');
      if (t.hp <= 0) { t.alive = false; t.dOrd = ++st.deathN; ctx.sync(); ctx.later(900, () => { if (st.phase === 'aim') betweenTurns(st, ctx); }); return true; }
    }
    picks = picks.concat(pickupAt(st, pi));
  }
  picks.forEach(p => ctx.emit({ t: 'pick', pi, txt: p.txt }, `📦 ${st.players[pi].name} kasa aldı: ${p.txt}`, 'good'));
  ctx.sync();
  return true;
}
function doFire(st, pi, a, ctx) {
  if (st.phase !== 'aim' || st.cur !== pi) return false;
  const t = st.tanks[pi]; if (!t.alive) return false;
  const w = WMAP[a.w]; if (!w) return false;
  if (w.ammo >= 0 && !(t.ammo[w.k] > 0)) return false;
  const ang = clamp(Math.round(+a.a || 0), 0, 180), pow = clamp(Math.round(+a.p || 0), 5, 100);
  const T = terr(st), th = THEMES[st.theme];
  let tx = null, ty = null;
  if (w.k === 'air') { if (!Number.isFinite(+a.tx)) return false; tx = clamp(Math.round(+a.tx), 0, W); }
  if (w.k === 'tel') { tx = Math.round(+a.tx); ty = teleLand(T, tx, +a.ty, st.water); if (ty == null) return false; }
  const seed = (Math.random() * 2 ** 31) >>> 0;
  const S = makeSim(T, st, mulberry(seed));
  const before = st.tanks.map(q => ({ x: q.x, y: q.y, hp: q.hp, sh: q.sh, alive: q.alive, sunk: !!q.sunk }));
  const crBefore = st.crates.map(c => Object.assign({}, c));
  const opsFrom = st.ops.length;
  t.ang = ang; t.pow = pow; t.w = w.k;
  if (w.ammo >= 0) t.ammo[w.k]--;
  const tip = tipOf(t, ang), vm = th.vmax * pow / 100;
  const mk = (k, aa, extra) => newObj(S, Object.assign({ k, w: w.k, x: tip.x, y: tip.y, vx: Math.cos(aa * D2R) * vm, vy: -Math.sin(aa * D2R) * vm, own: pi, safe: 8 }, extra || {}));
  if (!w.util && w.k !== 'air') { fxPush(S, { k: 'fire', pi, x: Math.round(tip.x), y: Math.round(tip.y), w: w.k }); sayAt(S, pi, SAY_FIRE); }
  switch (w.k) {
    case 'tri': [-4, 0, 4].forEach(dd => mk('shell', ang + dd)); break;
    case 'bnc': mk('bnc', ang, { b: 0, life: 260 }); break;
    case 'dig': mk('dig', ang); break;
    case 'air': {
      fxPush(S, { k: 'plane', x: tx, pi }); sayAt(S, pi, ['Uçaklar yolda!', 'Gökten yağmur geliyor!', 'Telsiz: hedef işaretlendi!']);
      for (let k = 0; k < 5; k++) S.pend.push({ t: 26 + k * 7, fn: () => newObj(S, { k: 'shell', w: 'air', x: tx + (k - 2) * 30 - st.wind * 3, y: -90, vx: 0, vy: 2.2, own: -1, safe: 0 }) });
      break;
    }
    case 'tel': {
      startSeg(S, pi); fxPush(S, { k: 'tele', pi, x: t.x, y: t.y, x2: tx, y2: ty });
      S.pend.push({ t: 16, fn: () => { t.x = tx; t.y = ty; endSeg(S, pi); fxPush(S, { k: 'tele2', pi, x: tx, y: ty }); } });
      sayAt(S, pi, ['Vınnn!', 'Buradayım!', 'Sürpriz!']);
      break;
    }
    case 'shd': t.sh = SHD; fxPush(S, { k: 'shd', pi }); sayAt(S, pi, ['Kalkan aktif!', 'Gel bakalım şimdi!']); break;
    case 'rep': { const v = Math.min(REP, HPMAX - t.hp); t.hp += v; fxPush(S, { k: 'heal', pi, v }); sayAt(S, pi, ['Tıkır tıkır!', 'Yenisi gibi!']); break; }
    default: mk('shell', ang);
  }
  runSim(S);
  // kasalar yeniden yere otursun; tanklar kasaya değdiyse alsın
  st.crates = st.crates.filter(c => { const y2 = dropY(T, c.x, c.y, st.water); c.y = y2; return y2 < st.water - 4; });
  S.f = S.dur - 10;
  st.tanks.forEach((q, i) => pickupAt(st, i).forEach(p => { fxPush(S, { k: 'pick', pi: i, id: p.id, txt: p.txt }); S.picks.push({ pi: i, txt: p.txt }); }));
  const hitList = Object.keys(S.hits).map(Number).filter(i => S.hits[i] > 0 || S.kills.includes(i));
  if (!w.util && w.k !== 'dirt' && !hitList.some(i => isEnemy(S, pi, i))) {
    if (hitList.includes(pi) && t.alive) S.say.push({ t: S.dur - 8, pi, s: pickR(SAY_SELF, S.rnd) });
    else if (t.alive) S.say.push({ t: S.dur - 8, pi, s: pickR(SAY_MISS, S.rnd) });
  }
  st.ops += S.ops; T.len = st.ops.length;
  st.sum = checksum(T); st.sumLen = st.ops.length;
  S.say.sort((x, y) => x.t - y.t);
  st.shot = {
    id: ++st.shotId, pi, w: w.k, a: ang, p: pow, tx, ty, opsFrom, opT: S.opT, fx: S.fx, say: S.say.slice(0, 8), before, crBefore, dur: S.dur,
    tr: S.tr.map(q => ({ k: q.k, w: q.w, pi: q.pi, t0: q.t0, t1: q.t1 == null ? S.f : q.t1, p: encPts(q.p) }))
  };
  // günlük özeti (animasyon bitince yazılır)
  const P = st.players, nm = P[pi].name;
  let text, cls = '';
  if (w.k === 'shd') text = `🛡️ ${nm} kalkan taktı.`;
  else if (w.k === 'rep') text = `🔧 ${nm} tamir kiti kullandı.`;
  else if (w.k === 'tel') text = `🌀 ${nm} ışınlandı.`;
  else {
    const parts = hitList.filter(i => S.hits[i] > 0).map(i => `${i === pi ? 'kendine' : P[i].name} −${S.hits[i]}`);
    text = `${w.icon} ${nm} · ${w.name}: ${parts.length ? parts.join(', ') : (w.k === 'dirt' ? 'toprak yığdı' : 'ıska')}`;
    if (parts.length) cls = hitList.some(i => isEnemy(S, pi, i)) ? 'good' : 'bad';
  }
  S.kills.forEach(i => { text += ` · 💥 ${P[i].name} ${st.tanks[i].sunk ? 'battı' : 'yok oldu'}!`; cls = 'gold'; });
  S.picks.forEach(p => { text += ` · 📦 ${P[p.pi].name} ${p.txt}`; });
  st.pendLog = { text, cls };
  st.phase = 'anim';
  const durMs = Math.round(S.dur * 1000 / 60);
  st.animEnd = Date.now() + durMs;
  ctx.emit({ t: 'fire', pi, w: w.k });
  ctx.sync();
  const tid = st.turnId;
  ctx.later(durMs + 650, () => { if (st.turnId === tid && st.phase === 'anim') afterShot(st, ctx); });
  return true;
}
function afterShot(st, ctx) {
  if (st.pendLog) { ctx.emit({ t: 'sum' }, st.pendLog.text, st.pendLog.cls); st.pendLog = null; }
  st.shot = null;
  if (checkWin(st, ctx)) return;
  betweenTurns(st, ctx);
}

/* ---------- bilgisayar ---------- */
function evalImpact(st, tanks, pi, x, y, r, d) {
  let v = 0; const my = st.tanks[pi].team;
  tanks.forEach((t, j) => {
    if (!t.alive || t.sunk) return;
    const dx = t.x - x, dy = t.y - 8 - y, dist = Math.sqrt(dx * dx + dy * dy), reach = r + 10;
    if (dist >= reach) return;
    const dm = Math.min(t.hp + (t.sh || 0), d * (1 - Math.max(0, dist - 8) / reach));
    if (j === pi || t.team === my) v -= dm * 1.7 + (j === pi ? 6 : 2);
    else v += dm + (dm >= t.hp + (t.sh || 0) ? 25 : 0);
  });
  return v;
}
function searchShot(st, pi, x, y, coarse) {
  const T = terr(st), th = THEMES[st.theme], ax = st.wind * WINDK;
  const tanks = st.tanks.map((t, j) => j === pi ? Object.assign({}, t, { x, y }) : t);
  const foes = tanks.filter((t, j) => t.alive && t.team !== st.tanks[pi].team);
  let best = { s: -1e9, v: -1e9, a: x < W / 2 ? 55 : 125, p: 60, dn: 1e9 };
  const tryShot = (a, p) => {
    const tip = tipOf({ x, y }, a), vm = th.vmax * p / 100;
    const h = fly(T, tanks, st.water, th.g, ax, tip.x, tip.y, Math.cos(a * D2R) * vm, -Math.sin(a * D2R) * vm, pi, 900);
    if (!h || h.out) return;
    let dn = 1e9; for (const f of foes) { const dx = f.x - h.x, dy = f.y - 8 - h.y; dn = Math.min(dn, Math.sqrt(dx * dx + dy * dy)); }
    const v = h.water ? -1 : evalImpact(st, tanks, pi, h.x, h.y, 26, 34);
    const s = v > 0 ? v - dn * .01 : (v < 0 ? v - 50 : -dn / 40);
    if (s > best.s) best = { s, v, a, p, dn, x: h.x, y: h.y };
  };
  const da = coarse ? 9 : 5, dp = coarse ? 10 : 6;
  for (let a = 4; a <= 176; a += da) for (let p = 26; p <= 100; p += dp) tryShot(a, p);
  const a0 = best.a, p0 = best.p, ra = coarse ? 4 : 3, rp = coarse ? 5 : 4;
  for (let a = a0 - ra; a <= a0 + ra; a++) for (let p = p0 - rp; p <= p0 + rp; p += (coarse ? 2 : 1)) if (a >= 0 && a <= 180 && p >= 5 && p <= 100) tryShot(a, p);
  return best;
}
function isBuried(T, t) {
  let n = 0;
  for (let k = 0; k <= 8; k++) { const a = k * 22.5 * D2R; if (solid(T, t.x + Math.cos(a) * 20, t.y - 11 - Math.sin(a) * 20)) n++; }
  return n >= 7 || solid(T, t.x, t.y - 4);
}
function walkSim(T, t, d, n) {
  let x = t.x, y = t.y, k = 0;
  for (; k < n; k++) { const s = walkStep(T, x, y, d); if (!s || s.fall) break; x = s.x; y = s.y; }
  return { x, y, n: k };
}
function botMovePlan(st, pi) {
  const t = st.tanks[pi], T = terr(st);
  if (t.fuel < 15 || isBuried(T, t)) return null;
  const here = searchShot(st, pi, t.x, t.y, false);
  st.bp.here = { x: t.x, y: t.y, r: here };
  if (here.v >= 14 && Math.random() < .85) return null;
  let best = { s: here.s + 4, mv: null };
  for (const d of [-1, 1]) for (const n of [45, Math.min(FUEL, t.fuel)]) {
    const w = walkSim(T, t, d, Math.min(n, t.fuel)); if (w.n < 10) continue;
    if (w.y > st.water - 40) continue;
    const r = searchShot(st, pi, w.x, w.y, true);
    if (r.s > best.s) best = { s: r.s, mv: { d, n: w.n } };
  }
  if (!best.mv && here.v < 2 && Math.random() < .5) { const d = Math.random() < .5 ? -1 : 1, w = walkSim(T, t, d, 40); if (w.n > 10 && w.y < st.water - 40) return { d, n: w.n }; }
  return best.mv;
}
function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / .5; }
function airAim(st, ex) {
  const T = terr(st), th = THEMES[st.theme], ax = st.wind * WINDK;
  let best = ex, bd = 1e9;
  for (let off = -320; off <= 320; off += 10) {
    const h = fly(T, st.tanks, st.water, th.g, ax, ex + off - st.wind * 3, -90, 0, 2.2, -1, 900);
    if (!h) continue; const d = Math.abs(h.x - ex); if (d < bd) { bd = d; best = ex + off; }
  }
  return clamp(Math.round(best), 0, W);
}
function botChoose(st, pi) {
  const t = st.tanks[pi], T = terr(st), am = t.ammo, has = k => am[k] > 0, rnd = Math.random;
  const err = { kolay: [5, 7], orta: [2, 3], zor: [.6, .9] }[st.diff] || [2, 3];
  const foes = st.tanks.map((q, j) => j).filter(j => st.tanks[j].alive && st.tanks[j].team !== t.team);
  const fz = (c) => { c.a = clamp(Math.round(c.a + gauss() * err[0]), 0, 180); c.p = clamp(Math.round(c.p + gauss() * err[1]), 8, 100); return c; };
  if (t.hp <= 40 && has('rep')) return { w: 'rep', a: t.ang, p: t.pow };
  if (isBuried(T, t)) {
    const e = st.tanks[foes[0]] || t;
    if (has('dig')) return { w: 'dig', a: e.x >= t.x ? 62 : 118, p: 55 };
    if (has('tel')) { for (let k = 0; k < 40; k++) { const x = Math.round(100 + rnd() * (W - 200)), y = teleLand(T, x, 0, st.water); if (y != null && !foes.some(j => Math.abs(st.tanks[j].x - x) < 120)) return { w: 'tel', a: t.ang, p: t.pow, tx: x, ty: y - 30 }; } }
    return { w: 'std', a: 90, p: 18 };
  }
  const hc = st.bp && st.bp.here;
  const best = hc && hc.x === t.x && hc.y === t.y ? hc.r : searchShot(st, pi, t.x, t.y, false);
  if (t.hp < 65 && has('shd') && !(t.sh > 0) && rnd() < .2) return { w: 'shd', a: t.ang, p: t.pow };
  if (best.v >= 10) {
    let near = -1, nd = 1e9;
    foes.forEach(j => { const q = st.tanks[j], d = Math.hypot(q.x - best.x, q.y - 8 - best.y); if (d < nd) { nd = d; near = j; } });
    const selfD = Math.hypot(best.x - t.x, best.y - t.y + 8), e = st.tanks[near];
    let w = 'std';
    if (has('big') && selfD > 100 && e && e.hp > 34 && rnd() < .7) w = 'big';
    else if (has('nap') && selfD > 80 && rnd() < .35) w = 'nap';
    else if (has('tri') && rnd() < .5) w = 'tri';
    else if (has('dirt') && e && e.hp > 30 && rnd() < .08) w = 'dirt';
    else if (has('bnc') && rnd() < .12 && nd < 14) w = 'bnc';
    return fz({ w, a: best.a, p: best.p });
  }
  if (has('air') && foes.length) {
    const j = foes.slice().sort((a, b) => st.tanks[a].hp - st.tanks[b].hp)[0];
    return { w: 'air', a: t.ang, p: t.pow, tx: airAim(st, st.tanks[j].x), ty: 0 };
  }
  if (has('dig') && best.dn < 160) return fz({ w: 'dig', a: best.a, p: best.p });
  if (has('tel') && rnd() < .25) {
    const e = st.tanks[foes[Math.floor(rnd() * foes.length)]];
    if (e) for (let k = 0; k < 20; k++) { const x = Math.round(clamp(e.x + (rnd() < .5 ? -1 : 1) * (220 + rnd() * 200), 60, W - 60)), y = teleLand(T, x, 0, st.water); if (y != null) return { w: 'tel', a: t.ang, p: t.pow, tx: x, ty: y - 30 }; }
  }
  return fz({ w: 'std', a: best.a, p: best.p });
}
function botStep(st, pi, ctx) {
  const t = st.tanks[pi];
  if (!st.bp || st.bp.tid !== st.turnId) st.bp = { tid: st.turnId, step: 0 };
  const bp = st.bp;
  if (bp.step === 0) {
    bp.step = 1;
    const mv = botMovePlan(st, pi);
    if (mv) { doMove(st, pi, { t: 'move', d: mv.d, n: mv.n }, ctx, true); ctx.sync(); return; }
    ctx.sync(); return;   // seçim bir sonraki adımda: ana iş parçacığı uzun süre bloklanmasın
  }
  if (bp.step === 1) {
    bp.step = 2;
    const c = botChoose(st, pi); bp.c = c;
    t.ang = c.a; t.pow = c.p; t.w = c.w;
    ctx.sync(); return;
  }
  bp.step = 3;
  const c = bp.c || { w: 'std', a: 60, p: 60 };
  if (!doFire(st, pi, { t: 'fire', w: c.w, a: c.a, p: c.p, tx: c.tx, ty: c.ty }, ctx)) {
    if (!doFire(st, pi, { t: 'fire', w: 'std', a: c.a, p: c.p }, ctx)) passTurn(st, ctx, 'bot');
  }
}

/* =========================================================================
   ARAYÜZ (her cihazda)
   ========================================================================= */
let root = null, ui = null, V = null, cv = null, cg = null, stageEl = null, ro = null, raf = 0, hudT = 0;
let RT = null, tcv = null, tctx = null, img = null, u32 = null, pal = null, colOff = null, dirty = null;
let cam = { x: W / 2, y: 620, z: .6, free: 0, ov: false, init: false }, vw = 300, vh = 300, dpr = 1;
let anim = null, seenShot = 0, sumOk = null, sumChecked = -1, desyncs = 0;
let parts = [], floats = [], bubbles = [], shake = 0, lastT = 0, waterY = WATER0, bgKey = '', bg = null, planes = [];
let lastFocus = null, disp = [], aim = { a: 45, p: 60, w: 'std', tx: null, ty: null }, live = {}, pred = null;
let mvBtn = 0, mvAcc = 0, mvSent = 0, mvSeq = 0, mvLast = 0, adjHold = null;
let keys = new Set(), pointers = new Map(), gesture = null, sheetOpen = false, lastTurnId = -1, fastT = 0, fastDirty = false;
let toastT = 0, chipKey = '', ctrlKey = '', sideKey = '', hintShown = false, lastSec = -1, lastPhase = '';
const q = s => root && root.querySelector(s);
const isTouch = () => matchMedia('(pointer: coarse)').matches;

/* ---------- arazi çizimi ---------- */
function makePal(theme) {
  const th = THEMES[theme], pk = c => ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
  const mix = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
  const shade = (c, k) => c.map(v => clamp(Math.round(v * k), 0, 255));
  const top = [], body = [];
  for (let d = 0; d < 16; d++) for (let j = 0; j < 4; j++) {
    const base = d < 3 ? shade(th.top, 1.07) : d < 8 ? th.top : mix(th.top, th.dirt, (d - 7) / 8);
    top.push(pk(shade(base, 1 - j * .028)));
  }
  for (let b = 0; b < 32; b++) for (let s = 0; s < 4; s++) for (let j = 0; j < 4; j++) {
    const c = mix(th.dirt, th.deep, b / 31);
    body.push(pk(shade(c, (s === 1 ? .92 : s === 3 ? 1.06 : 1) - j * .035)));
  }
  const bw = mix(th.deep, [26, 14, 48], .45), back = [];
  for (let k = 0; k <= 16; k++) back.push((((Math.round(255 * k / 16)) << 24) | (bw[2] << 16) | (bw[1] << 8) | bw[0]) >>> 0);
  return { top, body, back, edge: pk(th.edge), rim: pk(shade(th.edge, 1.3)) };
}
function paint(x0, x1) {
  if (!RT) return;
  x0 = clamp(x0, 0, W - 1); x1 = clamp(x1, 0, W - 1);
  const a = RT.a, P = pal, sf = RT.surf;
  for (let x = x0; x <= x1; x++) {
    let d = 0; const off = colOff[x], s0 = sf[x] + 6;
    for (let y = 0, i = x; y < H; y++, i += W) {
      if (!a[i]) { u32[i] = y <= s0 ? 0 : P.back[Math.min(16, (y - s0) >> 1)]; d = 0; continue; }
      d++;
      let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) & 3;
      if (d === 1) u32[i] = P.rim;
      else if (y + 1 < H && !a[i + W] && d > 2) u32[i] = P.edge;
      else if (d < 16) u32[i] = P.top[d * 4 + h];
      else { const b = Math.min(31, Math.max(0, y - s0 - 10) >> 3), s = ((y + off) / 15 | 0) & 3; u32[i] = P.body[(b * 4 + s) * 4 + h]; }
    }
  }
  tctx.putImageData(img, 0, 0, x0, 0, x1 - x0 + 1, H);
}
function buildRender(seed, theme) {
  RT = newTerrain(seed, theme);
  if (!tcv) { tcv = document.createElement('canvas'); tcv.width = W; tcv.height = H; tctx = tcv.getContext('2d'); img = tctx.createImageData(W, H); u32 = new Uint32Array(img.data.buffer); }
  pal = makePal(theme);
  const r = mulberry(seed ^ 0x5bd1e995), n = vnoise(r, 90); colOff = new Int16Array(W); for (let x = 0; x < W; x++) colOff[x] = Math.round(n[x] * 26);
  paint(0, W - 1);
  anim = null; sumChecked = -1; sumOk = null; bgKey = '';
}
function markDirty(o) {
  const x0 = Math.min(o.x, o.k === 't' ? o.x2 : o.x) - o.r - 1, x1 = Math.max(o.x, o.k === 't' ? o.x2 : o.x) + o.r + 1;
  if (!dirty) dirty = { x0, x1 }; else { dirty.x0 = Math.min(dirty.x0, x0); dirty.x1 = Math.max(dirty.x1, x1); }
}
function applyRenderOne(s, i) { const o = opParse(s, i); markDirty(o); const n = applyOp(RT, s, i); RT.len = n; return n; }
function applyRender(s, upto) { while (RT.len < upto && OPL[s[RT.len]]) applyRenderOne(s, RT.len); }
function syncTerrain() {
  if (!V || !RT || anim) return;
  if (RT.len > V.ops.length) { buildRender(V.seed, V.theme); }
  applyRender(V.ops, V.ops.length);
  if (RT.len === V.sumLen && sumChecked !== V.sumLen) {
    sumChecked = V.sumLen;
    sumOk = checksum(RT) === V.sum;
    if (!sumOk) {   // arazi farklılaştı: tohum + günlükten baştan kur
      desyncs++; buildRender(V.seed, V.theme); applyRender(V.ops, V.ops.length);
      sumChecked = V.sumLen; sumOk = checksum(RT) === V.sum;
      if (!sumOk) console.warn('Tank Savaşı: arazi sağlama toplamı tutmuyor');
    }
  }
}

/* ---------- arka plan (paralaks) ---------- */
function buildBg(v) {
  const r = mulberry(v.seed ^ 0x2545f491), th = THEMES[v.theme];
  const layer = (base, amp, step, f) => { const pts = []; let y = base; for (let x = -W; x <= W * 2; x += step) { y = clamp(y + (r() - .5) * amp, base - amp * 2.2, base + amp * 1.2); pts.push(x, y); } return { pts, f }; };
  bg = { th, layers: [layer(v.theme === 'dag' ? 470 : 560, v.theme === 'dag' ? 70 : 34, 60, .25), layer(v.theme === 'dag' ? 590 : 640, v.theme === 'dag' ? 50 : 26, 44, .5)],
    clouds: Array.from({ length: 9 }, () => ({ x: -W + r() * W * 3, y: 120 + r() * 280, s: .6 + r() * .9 })),
    stars: Array.from({ length: 90 }, () => ({ x: r(), y: r() * .8, s: r() < .15 ? 2 : 1, tw: r() * 6 })) };
  bgKey = v.seed + v.theme;
}
function drawBg(g, ts) {
  const th = bg.th;
  const gr = g.createLinearGradient(0, 0, 0, vh);
  gr.addColorStop(0, th.sky[0]); gr.addColorStop(.6, th.sky[1]); gr.addColorStop(1, th.sky[2]);
  g.fillStyle = gr; g.fillRect(0, 0, vw, vh);
  const z = cam.z;
  if (V.theme === 'ay') {
    for (const s of bg.stars) { const a = .5 + .5 * Math.sin(ts / 600 + s.tw); g.fillStyle = `rgba(255,255,255,${.35 + a * .55})`; const x = ((s.x * vw * 1.3 - cam.x * z * .05) % (vw * 1.3) + vw * 1.3) % (vw * 1.3) - vw * .15; g.fillRect(x, s.y * vh, s.s, s.s); }
    const ex = vw * .8 - cam.x * z * .03, ey = vh * .18, er = Math.max(22, vh * .07);
    const eg = g.createRadialGradient(ex - er * .3, ey - er * .3, er * .2, ex, ey, er); eg.addColorStop(0, '#8fd3ff'); eg.addColorStop(.6, '#2f7bff'); eg.addColorStop(1, '#173c96');
    g.fillStyle = eg; g.beginPath(); g.arc(ex, ey, er, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(80,220,120,.75)'; g.beginPath(); g.ellipse(ex - er * .2, ey + er * .1, er * .35, er * .22, .6, 0, Math.PI * 2); g.fill();
  } else {
    const sx = vw * .18 - cam.x * z * .03, sy = vh * .16, sr = Math.max(20, vh * .06);
    const sg = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 2.4); sg.addColorStop(0, 'rgba(255,250,210,.95)'); sg.addColorStop(.35, 'rgba(255,236,150,.7)'); sg.addColorStop(1, 'rgba(255,236,150,0)');
    g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, sr * 2.4, 0, Math.PI * 2); g.fill();
  }
  bg.layers.forEach((L, k) => {
    const cx = W / 2 + (cam.x - W / 2) * L.f, cy = H / 2 + (cam.y - H / 2) * L.f * .7;
    g.fillStyle = k === 0 ? th.far : th.near;
    g.beginPath(); g.moveTo(-10, vh + 10);
    const p = L.pts;
    for (let i = 0; i < p.length; i += 2) { const x = (p[i] - cx) * z + vw / 2, y = (p[i + 1] - cy) * z + vh / 2; if (x < -80 || x > vw + 80) continue; g.lineTo(x, y); }
    g.lineTo(vw + 10, vh + 10); g.closePath(); g.fill();
    if (V.theme === 'dag' && k === 0) { g.save(); g.clip(); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, 0, vw, ((380 - cy) * z + vh / 2)); g.restore(); }
  });
  if (V.theme !== 'ay') {
    const wind = V.wind || 0, t = ts / 1000;
    g.fillStyle = 'rgba(255,255,255,.82)';
    for (const c of bg.clouds) {
      const span = W * 3, wx = ((c.x + wind * 9 * t) % span + span) % span - W;
      const cx = W / 2 + (cam.x - W / 2) * .35, cy = H / 2 + (cam.y - H / 2) * .25;
      const x = (wx - cx) * z + vw / 2, y = (c.y - cy) * z + vh / 2, s = c.s * z * 46;
      if (x < -s * 3 || x > vw + s * 3) continue;
      g.beginPath(); g.ellipse(x, y, s * 1.6, s * .55, 0, 0, Math.PI * 2); g.ellipse(x - s * .6, y - s * .25, s * .7, s * .55, 0, 0, Math.PI * 2); g.ellipse(x + s * .5, y - s * .35, s * .8, s * .65, 0, 0, Math.PI * 2); g.fill();
    }
  }
}

/* ---------- görünüm durumu ---------- */
const meIsCur = () => V && (ui.me === 'all' ? !V.players[V.cur].isBot : ui.me === V.cur);
function canAct() { return !!(V && V.phase === 'aim' && !anim && V.tanks[V.cur] && V.tanks[V.cur].alive && meIsCur()); }
function decodeTrack(tr) { return { k: tr.k, w: tr.w, pi: tr.pi, t0: tr.t0, t1: tr.t1, p: decPts(tr.p) }; }
function trackAt(tr, f) {
  const p = tr.p, n = p.length / 2;
  if (f >= tr.t1 || n === 1) return { x: p[(n - 1) * 2], y: p[(n - 1) * 2 + 1] };
  const u = Math.max(0, (f - tr.t0) / 2), i = Math.floor(u), fr = u - i;
  if (i >= n - 1) return { x: p[(n - 1) * 2], y: p[(n - 1) * 2 + 1] };
  return { x: p[i * 2] + (p[i * 2 + 2] - p[i * 2]) * fr, y: p[i * 2 + 1] + (p[i * 2 + 3] - p[i * 2 + 1]) * fr };
}
function targetPos(i) {
  if (anim) {
    let p = null;
    for (const tr of anim.tr) if (tr.k === 'tank' && tr.pi === i && tr.t0 <= anim.f) p = trackAt(tr, anim.f);
    if (p) return p;
    const b = anim.rec.before[i]; return { x: b.x, y: b.y };
  }
  if (pred && i === V.cur) return pred;
  return { x: V.tanks[i].x, y: V.tanks[i].y };
}
function tankInfo(i) {
  const t = V.tanks[i];
  if (anim) return { hp: anim.hp[i], sh: anim.sh[i], alive: anim.alive[i], sunk: anim.rec.before[i].sunk || anim.sunk[i] };
  return { hp: t.hp, sh: t.sh, alive: t.alive, sunk: t.sunk };
}
function turretAngle(i) {
  if (i === V.cur && V.phase === 'aim') {
    if (canAct()) return aim.a;
    const L = live[i]; if (L && L.tid === V.turnId && performance.now() - L.at < 4000) return L.a;
  }
  if (anim && anim.rec.pi === i) return anim.rec.a;
  return V.tanks[i].ang;
}
function curWeapon() {
  if (canAct()) return aim.w;
  const L = live[V.cur]; if (L && L.tid === V.turnId) return L.w;
  return V.tanks[V.cur].w;
}

/* ---------- animasyon oynatma ---------- */
function startAnim(rec, skipMs) {
  if (RT.len < rec.opsFrom) applyRender(V.ops, rec.opsFrom);
  if (RT.len !== rec.opsFrom) { buildRender(V.seed, V.theme); applyRender(V.ops, rec.opsFrom); }
  anim = { rec, ops: V.ops, t0: performance.now() - Math.max(0, skipMs || 0), f: 0, opi: 0, fxi: 0, sayi: 0, tr: rec.tr.map(decodeTrack),
    hp: rec.before.map(b => b.hp), sh: rec.before.map(b => b.sh), alive: rec.before.map(b => b.alive), sunk: rec.before.map(() => false), gone: new Set(), lastBoom: null, trail: 0 };
  seenShot = rec.id;
  cam.free = 0;
}
function stepAnim(dt) {
  if (!anim) return;
  const A = anim, rec = A.rec;
  A.f = (performance.now() - A.t0) / 1000 * 60;
  while (A.opi < rec.opT.length && rec.opT[A.opi] <= A.f) { applyRenderOne(A.ops, RT.len); A.opi++; }
  while (A.fxi < rec.fx.length && rec.fx[A.fxi].t <= A.f) playFx(rec.fx[A.fxi++]);
  while (A.sayi < rec.say.length && rec.say[A.sayi].t <= A.f) { const s = rec.say[A.sayi++]; addBubble(s.pi, s.s); }
  A.trail += dt;
  if (A.trail > .03) {
    A.trail = 0;
    for (const tr of A.tr) if (tr.k !== 'tank' && tr.t0 <= A.f && A.f < tr.t1) {
      const p = trackAt(tr, A.f);
      if (tr.k === 'fire') { if (Math.random() < .5) parts.push({ k: 'ember', x: p.x + (Math.random() - .5) * 6, y: p.y - 2, vx: (Math.random() - .5) * 20, vy: -30 - Math.random() * 40, life: .5, max: .5, r: 2 + Math.random() * 2 }); }
      else parts.push({ k: 'smoke', x: p.x, y: p.y, vx: 0, vy: -6, life: .7, max: .7, r: tr.w === 'big' ? 6 : 3.5, c: tr.w === 'nap' ? '255,170,80' : tr.w === 'dig' ? '170,120,70' : '235,235,245' });
    }
  }
  if (A.f > rec.dur) {
    while (A.opi < rec.opT.length) { applyRenderOne(A.ops, RT.len); A.opi++; }
    while (A.fxi < rec.fx.length) playFx(rec.fx[A.fxi++]);
    lastFocus = A.lastBoom || null; anim = null; syncTerrain(); updHud(true);
  }
}
function tankScreenish(i) { const d = disp[i]; return d ? { x: d.x, y: d.y } : targetPos(i); }
function playFx(e) {
  const A = anim;
  switch (e.k) {
    case 'fire': {
      for (let k = 0; k < 10; k++) parts.push({ k: 'fireball', x: e.x, y: e.y, vx: (Math.random() - .5) * 60, vy: (Math.random() - .5) * 60, life: .25, max: .25, r: 4 + Math.random() * 4 });
      shake = Math.max(shake, e.w === 'big' ? 5 : 2.5); snd.fire(e.w === 'big'); break;
    }
    case 'boom': {
      const r = e.r, dirt = e.s === 'dirt', th = THEMES[V.theme];
      A.lastBoom = { x: e.x, y: e.y };
      if (dirt) {
        for (let k = 0; k < 26; k++) { const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 120; parts.push({ k: 'debris', x: e.x + Math.cos(a) * r * .5, y: e.y + Math.sin(a) * r * .5, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: .9, max: .9, r: 2 + Math.random() * 3, c: `rgb(${th.dirt.join(',')})` }); }
        shake = Math.max(shake, 3); snd.thud(); break;
      }
      parts.push({ k: 'flash', x: e.x, y: e.y, life: .18, max: .18, r: r * 1.6 });
      parts.push({ k: 'ring', x: e.x, y: e.y, life: .45, max: .45, r });
      const nb = Math.min(26, 8 + r / 2);
      for (let k = 0; k < nb; k++) { const a = Math.random() * Math.PI * 2, s = Math.random() * r * 2.2; parts.push({ k: 'fireball', x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: .45 + Math.random() * .3, max: .7, r: r * (.2 + Math.random() * .25) }); }
      const nd = Math.min(40, 10 + r * .7);
      for (let k = 0; k < nd; k++) { const a = -Math.random() * Math.PI, s = 80 + Math.random() * 220; parts.push({ k: 'debris', x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1 + Math.random() * .6, max: 1.6, r: 1.5 + Math.random() * 2.5, c: Math.random() < .5 ? `rgb(${th.top.join(',')})` : `rgb(${th.dirt.join(',')})` }); }
      for (let k = 0; k < 7; k++) parts.push({ k: 'puff', x: e.x + (Math.random() - .5) * r, y: e.y + (Math.random() - .5) * r * .6, vx: (Math.random() - .5) * 20, vy: -20 - Math.random() * 25, life: 1.4 + Math.random() * .6, max: 2, r: r * (.35 + Math.random() * .3) });
      shake = Math.max(shake, Math.min(14, r / 3.5)); snd.boom(r);
      break;
    }
    case 'dmg': {
      A.hp[e.pi] = Math.max(0, A.hp[e.pi] - e.v); A.sh[e.pi] = Math.max(0, A.sh[e.pi] - (e.ab || 0));
      const p = tankScreenish(e.pi);
      if (e.v > 0) addFloat(p.x, p.y - 30, `−${e.v}`, '#ff4d6d', e.v >= 30 ? 26 : 19);
      if (e.ab > 0) addFloat(p.x + 14, p.y - 46, `🛡️ −${e.ab}`, '#7fd6ff', 15);
      break;
    }
    case 'die': { A.alive[e.pi] = false; const p = tankScreenish(e.pi); addFloat(p.x, p.y - 52, '💀', '#fff', 30); snd.die(); break; }
    case 'drown': { A.sunk[e.pi] = true; A.alive[e.pi] = false; const p = tankScreenish(e.pi); addFloat(p.x, waterY - 30, 'Glu glu!', '#bff3ff', 20); break; }
    case 'splash': {
      for (let k = 0; k < 22; k++) parts.push({ k: 'drop', x: e.x + (Math.random() - .5) * 16, y: waterY, vx: (Math.random() - .5) * 140, vy: -120 - Math.random() * 200, life: 1, max: 1, r: 2 + Math.random() * 2.5 });
      snd.splash(); break;
    }
    case 'hiss': parts.push({ k: 'puff', x: e.x, y: waterY - 4, vx: 0, vy: -30, life: 1, max: 1, r: 8 }); break;
    case 'tele': case 'tele2': {
      const x = e.x, y = e.y - 8;
      for (let k = 0; k < 26; k++) { const a = Math.random() * Math.PI * 2; parts.push({ k: 'spark', x: x + Math.cos(a) * 18, y: y + Math.sin(a) * 18, vx: -Math.cos(a) * 60, vy: -Math.sin(a) * 60, life: .6, max: .6, r: 2.5, c: '#c38bff' }); }
      if (e.k === 'tele') snd.tele(); break;
    }
    case 'heal': { A.hp[e.pi] = Math.min(HPMAX, A.hp[e.pi] + e.v); const p = tankScreenish(e.pi); addFloat(p.x, p.y - 34, `+${e.v}`, '#2bff88', 22); Sound.good(); break; }
    case 'shd': { A.sh[e.pi] = SHD; const p = tankScreenish(e.pi); addFloat(p.x, p.y - 40, '🛡️ KALKAN', '#7fd6ff', 18); snd.tele(); break; }
    case 'cpop': { A.gone.add(e.id); for (let k = 0; k < 14; k++) parts.push({ k: 'debris', x: e.x, y: e.y - 8, vx: (Math.random() - .5) * 200, vy: -80 - Math.random() * 160, life: 1, max: 1, r: 2.5, c: '#c98a3a' }); break; }
    case 'pick': { A.gone.add(e.id); const p = tankScreenish(e.pi); addFloat(p.x, p.y - 44, '📦 ' + e.txt, '#ffe14a', 17); Sound.buy(); break; }
    case 'bnc': { snd.bounce(); for (let k = 0; k < 5; k++) parts.push({ k: 'debris', x: e.x, y: e.y, vx: (Math.random() - .5) * 90, vy: -40 - Math.random() * 60, life: .5, max: .5, r: 1.8, c: '#e9d7b0' }); break; }
    case 'drill': snd.drill(); break;
    case 'thud': { const p = tankScreenish(e.pi); for (let k = 0; k < 10; k++) parts.push({ k: 'puff', x: p.x + (Math.random() - .5) * 26, y: p.y, vx: (Math.random() - .5) * 40, vy: -10, life: .7, max: .7, r: 5 }); shake = Math.max(shake, 3); break; }
    case 'bury': { const p = tankScreenish(e.pi); addFloat(p.x, p.y - 48, 'Gömüldü!', '#e9c08a', 17); break; }
    case 'plane': planes.push({ x: e.x, t: 0 }); snd.plane(); break;
    default: break;
  }
}
function addFloat(x, y, text, color, size) { floats.push({ x, y, text, color, size, life: 1.5, max: 1.5 }); if (floats.length > 24) floats.shift(); }
function addBubble(pi, text) { bubbles = bubbles.filter(b => b.pi !== pi); bubbles.push({ pi, text, life: 2.4, max: 2.4 }); }

/* ---------- sesler ---------- */
const snd = {
  fire(big) { if (!Sound.ok('tksFire', 60)) return; Sound.noise(.35, { filter: 'lowpass', freq: big ? 520 : 900, gain: .5, decayPow: 2 }); Sound.tone(big ? 120 : 190, .22, { type: 'square', gain: .07, slide: 60 }); },
  boom(r) { if (!Sound.ok('tksBoom', 70)) return; const big = r > 40; Sound.noise(big ? 1.1 : .7, { filter: 'lowpass', freq: big ? 380 : 640, gain: big ? .9 : .65, decayPow: 1.8 }); Sound.tone(big ? 60 : 88, big ? .7 : .45, { type: 'sine', gain: .4, slide: 30 }); },
  thud() { if (!Sound.ok('tksThud', 90)) return; Sound.noise(.4, { filter: 'lowpass', freq: 260, gain: .7, decayPow: 2.2 }); },
  splash() { if (!Sound.ok('tksSplash', 120)) return; Sound.noise(.7, { filter: 'highpass', freq: 1400, gain: .3, decayPow: 1.4 }); Sound.noise(.4, { filter: 'lowpass', freq: 400, gain: .3, decayPow: 2 }); },
  bounce() { if (!Sound.ok('tksBnc', 60)) return; Sound.tone(520, .1, { type: 'triangle', gain: .16, slide: 300 }); },
  drill() { if (!Sound.ok('tksDrill', 200)) return; Sound.tone(110, .6, { type: 'sawtooth', gain: .06, slide: 150 }); Sound.noise(.6, { filter: 'bandpass', freq: 1800, q: 3, gain: .2, decayPow: .8 }); },
  plane() { if (!Sound.ok('tksPlane', 500)) return; Sound.noise(1.6, { filter: 'bandpass', freq: 520, q: .6, gain: .28, decayPow: .5 }); Sound.tone(180, 1.4, { type: 'sawtooth', gain: .03, slide: 140 }); },
  tele() { Sound.special(); },
  die() { Sound.bankrupt(); },
  move() { if (!Sound.ok('tksMove', 140)) return; Sound.tone(70 + Math.random() * 20, .12, { type: 'square', gain: .03 }); }
};

/* ---------- kamera ---------- */
function zFit() { return Math.min(vw / (W + 120), vh / 700); }
function zDefault() { return vw < 560 ? clamp(vw / 560, .5, .8) : Math.max(zFit(), Math.min(.9, vw / 1300)); }
function clampCam() {
  cam.z = clamp(cam.z, zFit() * .95, 1.8);
  const hw = vw / (2 * cam.z), hh = vh / (2 * cam.z);
  cam.x = hw * 2 >= W + 240 ? W / 2 : clamp(cam.x, hw - 120, W + 120 - hw);
  const top = -560, bot = H + 30;
  cam.y = hh * 2 >= bot - top ? bot - hh : clamp(cam.y, top + hh, bot - hh);
}
function surfY(x) { x = clamp(Math.round(x), 0, W - 1); for (let y = 0; y < H; y += 2) if (RT.a[y * W + x]) return y; return V ? V.water : H; }
function flightGoal(p) {
  const hh = vh / (2 * cam.z), ref = Math.min(surfY(p.x), V.water);
  return { x: p.x, y: Math.max(p.y, ref - hh * .5), fly: true };
}
function camGoal() {
  if (anim) {
    const f = anim.f;
    for (const tr of anim.tr) if (tr.k !== 'tank' && tr.k !== 'fire' && tr.t0 <= f && f < tr.t1) return flightGoal(trackAt(tr, f));
    for (const tr of anim.tr) if (tr.k === 'tank' && tr.t0 <= f && f < tr.t1) return trackAt(tr, f);
    for (const tr of anim.tr) if (tr.k === 'fire' && tr.t0 <= f && f < tr.t1) return trackAt(tr, f);
    if (anim.lastBoom) return anim.lastBoom;
    return targetPos(anim.rec.pi);
  }
  if (V.phase === 'between') { const c = V.crates.find(c => ui.hostNow() - c.ts < 1800); if (c) return { x: c.x, y: c.y - 100 }; }
  if ((V.phase === 'between' || V.phase === 'anim') && lastFocus) return lastFocus;
  if (V.phase === 'over') { const w = V.tanks.findIndex(t => t.alive); if (w >= 0) return disp[w] || V.tanks[w]; }
  const d = disp[V.cur] || V.tanks[V.cur];
  if (aim.tx != null && canAct()) return { x: (d.x + aim.tx) / 2, y: Math.min(d.y, aim.ty == null ? d.y : aim.ty) - 60 };
  return { x: d.x, y: d.y - 90 };
}
function stepCam(dt) {
  if (performance.now() > cam.free) {
    const g = camGoal();
    if (g) {
      const k = Math.min(1, dt * (anim ? 4.5 : 2.6)); cam.x += (g.x - cam.x) * k; cam.y += (g.y - cam.y) * k;
      if (!cam.ov && cam.zt) { const zt = g.fly ? cam.zt * .82 : cam.zt; cam.z += (zt - cam.z) * Math.min(1, dt * 1.6); }
    }
  }
  clampCam();
}
const toScreen = (x, y) => ({ x: (x - cam.x) * cam.z + vw / 2, y: (y - cam.y) * cam.z + vh / 2 });
const toWorld = (sx, sy) => ({ x: (sx - vw / 2) / cam.z + cam.x, y: (sy - vh / 2) / cam.z + cam.y });

/* ---------- çizim ---------- */
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function groundSlope(x, y) {
  const gy = cx => { for (let yy = Math.round(y) - 8; yy <= Math.round(y) + 10; yy++) if (solid(RT, cx, yy + 1)) return yy; return y + 10; };
  const a = gy(Math.round(x) - 7), b = gy(Math.round(x) + 7);
  return clamp(Math.atan2(b - a, 14), -.55, .55);
}
function drawTank(g, i, ts) {
  const d = disp[i], P = V.players[i], inf = tankInfo(i);
  if (!d || inf.sunk) return;
  const x = d.x, y = d.y, col = P.color;
  g.save(); g.translate(x, y); g.rotate(d.sl || 0);
  if (!inf.alive) {
    g.fillStyle = '#3a3346'; rr(g, -13, -7, 26, 7, 3.5); g.fill();
    g.fillStyle = '#4d4459'; g.beginPath(); g.moveTo(-11, -7); g.lineTo(10, -7); g.lineTo(7, -12); g.lineTo(-9, -11); g.closePath(); g.fill();
    g.strokeStyle = '#2a2433'; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -11); g.lineTo(10, -6); g.stroke();
    g.fillStyle = col; g.globalAlpha = .5; g.fillRect(-6, -10, 9, 2); g.globalAlpha = 1;
    g.restore();
    if (Math.random() < .12) parts.push({ k: 'puff', x: x + (Math.random() - .5) * 8, y: y - 12, vx: 4, vy: -18, life: 1.6, max: 1.6, r: 4, dark: true });
    return;
  }
  const ang = d.a, face = Math.cos(ang * D2R) >= 0 ? 1 : -1;
  g.save(); g.translate(0, -11); g.rotate(-ang * D2R - (d.sl || 0));
  g.fillStyle = '#2b2440'; rr(g, 0, -2.4, 18, 4.8, 2.2); g.fill();
  g.fillStyle = '#1b1530'; rr(g, 14, -3.2, 5, 6.4, 1.6); g.fill();
  g.restore();
  g.fillStyle = '#2b2440'; rr(g, -14, -7.5, 28, 7.5, 3.75); g.fill();
  g.fillStyle = '#6f6896';
  const roll = (x * .9) % 6;
  for (let k = -2; k <= 2; k++) { g.beginPath(); g.arc(k * 5.6 + (roll > 3 ? .3 : 0), -3.7, 2.1, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = col; g.beginPath(); g.moveTo(-12.5, -7); g.lineTo(12.5, -7); g.lineTo(10, -13.5); g.lineTo(-10, -13.5); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-9, -13, 18, 2);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-12, -8.5, 24, 1.5);
  const dg = g.createRadialGradient(-2, -16, 1, 0, -12, 8); dg.addColorStop(0, '#ffffff'); dg.addColorStop(.25, col); dg.addColorStop(1, col);
  g.fillStyle = dg; g.beginPath(); g.arc(0, -12, 7.2, Math.PI, 0); g.closePath(); g.fill();
  const blink = ((ts / 1000 + i * 1.7) % 4) < .12;
  const ex = face * 1.2, lx = Math.cos(ang * D2R) * 1, ly = -Math.sin(ang * D2R) * 1;
  for (const s of [-1, 1]) {
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex + s * 2.8, -14.2, 2.1, blink ? .4 : 2.5, 0, 0, Math.PI * 2); g.fill();
    if (!blink) { g.fillStyle = '#1b1036'; g.beginPath(); g.arc(ex + s * 2.8 + lx, -14.2 + ly, 1.15, 0, Math.PI * 2); g.fill(); }
  }
  if (inf.hp < 35) { g.fillStyle = '#1b1036'; g.fillRect(ex - 4.8, -17.6, 3.6, .9); g.fillRect(ex + 1.2, -17.6, 3.6, .9); }
  g.restore();
  if (inf.sh > 0) {
    g.strokeStyle = 'rgba(127,214,255,.85)'; g.lineWidth = 2; g.fillStyle = 'rgba(127,214,255,.14)';
    g.beginPath(); g.arc(x, y - 9, 21 + Math.sin(ts / 200) * .8, 0, Math.PI * 2); g.fill(); g.stroke();
  }
}
function drawCrate(g, c, ts) {
  let y = c.y, chute = false;
  const age = ui.hostNow() - (c.ts || 0);
  if (age < 1500) { const k = age / 1500; y = c.y - (1 - k) * 420; chute = true; }
  const sway = chute ? Math.sin(ts / 260) * 6 : 0, x = c.x + sway;
  if (chute) {
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x - 7, y - 14); g.lineTo(x - 15, y - 34); g.moveTo(x + 7, y - 14); g.lineTo(x + 15, y - 34); g.stroke();
    g.fillStyle = '#ff3fa4'; g.beginPath(); g.arc(x, y - 34, 17, Math.PI, 0); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y - 34, 17, Math.PI * 1.33, Math.PI * 1.66); g.lineTo(x, y - 34); g.fill();
  }
  g.fillStyle = c.k === 'hp' ? '#f4f4f8' : '#c98a3a'; rr(g, x - 9, y - 16, 18, 16, 3); g.fill();
  g.strokeStyle = c.k === 'hp' ? '#d0d0dc' : '#8a5a1e'; g.lineWidth = 1.5; g.stroke();
  if (c.k === 'hp') { g.fillStyle = '#ff3b5c'; g.fillRect(x - 2, y - 13, 4, 10); g.fillRect(x - 5, y - 10, 10, 4); }
  else { g.strokeStyle = '#8a5a1e'; g.beginPath(); g.moveTo(x - 8, y - 15); g.lineTo(x + 8, y - 1); g.moveTo(x + 8, y - 15); g.lineTo(x - 8, y - 1); g.stroke(); g.font = 'bold 9px sans-serif'; g.fillStyle = '#ffe14a'; g.textAlign = 'center'; g.fillText('?', x, y - 5); }
}
function drawProj(g, tr, f, ts) {
  const p = trackAt(tr, f);
  if (tr.k === 'fire') {
    const fl = 1 + Math.sin(ts / 60 + tr.t0) * .25;
    g.fillStyle = 'rgba(255,90,20,.55)'; g.beginPath(); g.arc(p.x, p.y - 3, 7 * fl, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffb627'; g.beginPath(); g.arc(p.x, p.y - 3, 4 * fl, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(p.x, p.y - 2, 1.8, 0, Math.PI * 2); g.fill();
    return;
  }
  const w = tr.w, r = w === 'big' ? 6.5 : w === 'tri' || w === 'air' ? 3.6 : 4.6;
  const col = { std: '#2b2440', tri: '#3b3060', big: '#1b1530', bnc: '#2bd96b', air: '#40465a', dig: '#a8743a', dirt: '#8a5a2e', nap: '#ff6a1a' }[w] || '#2b2440';
  g.fillStyle = col; g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(p.x - r * .35, p.y - r * .35, r * .35, 0, Math.PI * 2); g.fill();
  if (w === 'big') { g.strokeStyle = '#ffb627'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(p.x, p.y - r); g.lineTo(p.x + 3, p.y - r - 4); g.stroke(); g.fillStyle = '#ffe14a'; g.beginPath(); g.arc(p.x + 3, p.y - r - 4, 1.6 + Math.random(), 0, Math.PI * 2); g.fill(); }
  if (w === 'dig') { g.fillStyle = '#d9d9e6'; g.beginPath(); g.moveTo(p.x + 5, p.y); g.lineTo(p.x - 2, p.y - 3); g.lineTo(p.x - 2, p.y + 3); g.fill(); }
}
function drawParts(g) {
  for (const p of parts) {
    const k = p.life / p.max;
    if (p.k === 'smoke' || p.k === 'puff') { g.fillStyle = p.dark ? `rgba(60,55,70,${k * .45})` : `rgba(${p.c || '230,226,240'},${k * (p.k === 'puff' ? .55 : .5)})`; g.beginPath(); g.arc(p.x, p.y, p.r * (p.k === 'puff' ? 1.6 - k * .6 : 1 + (1 - k) * 1.4), 0, Math.PI * 2); g.fill(); }
    else if (p.k === 'fireball') { g.fillStyle = k > .6 ? `rgba(255,236,150,${k})` : `rgba(255,${Math.round(90 + 120 * k)},40,${k})`; g.beginPath(); g.arc(p.x, p.y, p.r * (1.2 - k * .4), 0, Math.PI * 2); g.fill(); }
    else if (p.k === 'flash') { g.fillStyle = `rgba(255,250,220,${k * .85})`; g.beginPath(); g.arc(p.x, p.y, p.r * (1.1 - k * .3), 0, Math.PI * 2); g.fill(); }
    else if (p.k === 'ring') { g.strokeStyle = `rgba(255,255,255,${k * .8})`; g.lineWidth = 3 * k + .5; g.beginPath(); g.arc(p.x, p.y, p.r * (1.9 - k), 0, Math.PI * 2); g.stroke(); }
    else if (p.k === 'debris') { g.fillStyle = p.c; g.globalAlpha = Math.min(1, k * 2); g.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r); g.globalAlpha = 1; }
    else if (p.k === 'drop') { g.fillStyle = `rgba(200,240,255,${k})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill(); }
    else if (p.k === 'ember') { g.fillStyle = `rgba(255,${Math.round(120 + 100 * k)},40,${k})`; g.beginPath(); g.arc(p.x, p.y, p.r * k + .5, 0, Math.PI * 2); g.fill(); }
    else if (p.k === 'spark') { g.fillStyle = p.c; g.globalAlpha = k; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
  }
}
function stepParts(dt) {
  for (const p of parts) {
    p.life -= dt; p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt;
    if (p.k === 'debris' || p.k === 'drop') p.vy += 420 * dt;
    else if (p.k === 'fireball') { p.vx *= .9; p.vy *= .9; }
    else if (p.k === 'puff' || p.k === 'smoke') { p.vx += (V ? V.wind : 0) * 1.2 * dt; }
  }
  parts = parts.filter(p => p.life > 0);
  if (parts.length > 700) parts.splice(0, parts.length - 700);
  floats.forEach(f => { f.life -= dt; f.y -= 26 * dt; }); floats = floats.filter(f => f.life > 0);
  bubbles.forEach(b => { b.life -= dt; }); bubbles = bubbles.filter(b => b.life > 0);
  planes.forEach(p => { p.t += dt; }); planes = planes.filter(p => p.t < 3);
  shake = Math.max(0, shake - dt * 22);
}
function drawWater(g, ts) {
  const th = THEMES[V.theme], hw = vw / (2 * cam.z) + 60, x0 = cam.x - hw, x1 = cam.x + hw;
  const yb = cam.y + vh / (2 * cam.z) + 40;
  const wg = g.createLinearGradient(0, waterY, 0, waterY + 120);
  wg.addColorStop(0, th.water[0]); wg.addColorStop(1, th.water[1]);
  g.globalAlpha = .9; g.fillStyle = wg;
  g.beginPath(); g.moveTo(x0, yb);
  for (let x = x0; x <= x1 + 20; x += 20) g.lineTo(x, waterY + Math.sin(x / 38 + ts / 520) * 3 + Math.sin(x / 13 + ts / 300) * 1.2);
  g.lineTo(x1 + 20, yb); g.closePath(); g.fill(); g.globalAlpha = 1;
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.beginPath();
  for (let x = x0; x <= x1 + 20; x += 20) { const y = waterY + Math.sin(x / 38 + ts / 520) * 3 + Math.sin(x / 13 + ts / 300) * 1.2; if (x === x0) g.moveTo(x, y); else g.lineTo(x, y); }
  g.stroke();
}
function previewPts() {
  const i = V.cur, d = disp[i]; if (!d) return [];
  const th = THEMES[V.theme], w = WMAP[aim.w]; if (w.util || w.k === 'air') return [];
  const tip = tipOf(d, aim.a), vm = th.vmax * aim.p / 100;
  let x = tip.x, y = tip.y, vx = Math.cos(aim.a * D2R) * vm, vy = -Math.sin(aim.a * D2R) * vm;
  const out = [];
  for (let f = 1; f <= 44; f++) { vy += th.g; x += vx; y += vy; if (solid(RT, x, y)) break; if (f % 4 === 0) out.push(x, y); }
  return out;
}
function draw(ts) {
  const g = cg; if (!g || !bg) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBg(g, ts);
  const z = cam.z, sx = shake > .2 ? (Math.random() - .5) * shake * 2 : 0, sy = shake > .2 ? (Math.random() - .5) * shake * 2 : 0;
  g.setTransform(dpr * z, 0, 0, dpr * z, dpr * (vw / 2 - cam.x * z + sx), dpr * (vh / 2 - cam.y * z + sy));
  g.imageSmoothingEnabled = z < 1;
  g.drawImage(tcv, 0, 0);
  const crates = anim ? anim.rec.crBefore.filter(c => !anim.gone.has(c.id)) : V.crates;
  crates.forEach(c => drawCrate(g, c, ts));
  // nişan önizlemesi ve hedef
  if (canAct()) {
    const pts = previewPts();
    for (let k = 0; k < pts.length; k += 2) { const a = 1 - k / (pts.length + 2); g.fillStyle = `rgba(255,255,255,${.9 * a})`; g.beginPath(); g.arc(pts[k], pts[k + 1], 3.2 / Math.max(.6, z), 0, Math.PI * 2); g.fill(); }
    if (WMAP[aim.w].target && aim.tx != null) {
      const ok = aim.w === 'air' || aim.ty != null && teleLand(RT, aim.tx, aim.ty, V.water) != null;
      const ty = aim.w === 'air' ? (dropFromTop(RT, Math.round(aim.tx), V.water) || V.water - 10) : aim.ty;
      g.strokeStyle = ok ? '#ffe14a' : '#ff3b5c'; g.lineWidth = 3 / z;
      const r = 16 + Math.sin(ts / 150) * 2;
      g.beginPath(); g.arc(aim.tx, ty - 8, r, 0, Math.PI * 2); g.moveTo(aim.tx - r - 8, ty - 8); g.lineTo(aim.tx - r + 6, ty - 8); g.moveTo(aim.tx + r - 6, ty - 8); g.lineTo(aim.tx + r + 8, ty - 8);
      g.moveTo(aim.tx, ty - 8 - r - 8); g.lineTo(aim.tx, ty - 8 - r + 6); g.moveTo(aim.tx, ty - 8 + r - 6); g.lineTo(aim.tx, ty - 8 + r + 8); g.stroke();
      if (aim.w === 'air') { g.setLineDash([8 / z, 8 / z]); g.beginPath(); g.moveTo(aim.tx, -200); g.lineTo(aim.tx, ty - 30); g.stroke(); g.setLineDash([]); }
    }
  }
  V.tanks.forEach((t, i) => drawTank(g, i, ts));
  if (anim) for (const tr of anim.tr) if (tr.k !== 'tank' && tr.t0 <= anim.f && anim.f < tr.t1) drawProj(g, tr, anim.f, ts);
  const above = [];
  if (anim) for (const tr of anim.tr) if (tr.k !== 'tank' && tr.k !== 'fire' && tr.t0 <= anim.f && anim.f < tr.t1) { const p = trackAt(tr, anim.f), s = toScreen(p.x, p.y); if (s.y < 4 && s.x > 0 && s.x < vw) above.push({ x: s.x, h: Math.round(-p.y + surfY(p.x)) }); }
  drawParts(g);
  drawWater(g, ts);
  // uçak
  for (const p of planes) {
    const k = p.t / 3, px = p.x - 900 + k * 1800, py = -60 + Math.sin(k * 6) * 6;
    g.save(); g.translate(px, py); g.fillStyle = '#e9ecf5';
    rr(g, -34, -7, 68, 14, 7); g.fill(); g.fillStyle = '#ff3fa4'; g.beginPath(); g.moveTo(-6, 0); g.lineTo(-20, 22); g.lineTo(-10, 22); g.lineTo(8, 0); g.fill();
    g.beginPath(); g.moveTo(-30, -4); g.lineTo(-40, -18); g.lineTo(-32, -18); g.lineTo(-22, -4); g.fill();
    g.fillStyle = '#2f7bff'; g.fillRect(16, -4, 10, 5); g.restore();
  }
  // ekran uzayı: isimler, can çubukları, sayılar, balonlar
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const small = vw < 560;
  V.tanks.forEach((t, i) => {
    const d = disp[i], inf = tankInfo(i); if (!d || inf.sunk) return;
    const s = toScreen(d.x, d.y - 26);
    if (s.x < -60 || s.x > vw + 60 || s.y < -40 || s.y > vh + 60) return;
    const P = V.players[i], cur = i === V.cur && V.phase !== 'over';
    g.font = `800 ${small ? 11 : 12}px Nunito, system-ui, sans-serif`; g.textAlign = 'center';
    const nm = P.name.length > 12 ? P.name.slice(0, 11) + '…' : P.name;
    const by = s.y - 20 * Math.min(1, cam.z / .6);
    g.lineWidth = 3; g.strokeStyle = 'rgba(15,6,40,.85)'; g.strokeText(nm, s.x, by - 6); g.fillStyle = inf.alive ? '#fff' : '#b9a8e6'; g.fillText(nm, s.x, by - 6);
    if (inf.alive) {
      const bw = 34, k = inf.hp / HPMAX;
      g.fillStyle = 'rgba(15,6,40,.85)'; rr(g, s.x - bw / 2 - 1.5, by - 2.5, bw + 3, 7, 3.5); g.fill();
      g.fillStyle = k > .5 ? '#2bff88' : k > .25 ? '#ffe14a' : '#ff3b5c'; rr(g, s.x - bw / 2, by - 1, Math.max(2, bw * k), 4, 2); g.fill();
      g.fillStyle = P.color; g.beginPath(); g.arc(s.x - bw / 2 - 6, by + 1, 3, 0, Math.PI * 2); g.fill();
    }
    if (cur && inf.alive) {
      const bob = Math.sin(ts / 180) * 3, ay = by - 22 + bob;
      g.fillStyle = P.color; g.strokeStyle = '#fff'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(s.x - 7, ay - 6); g.lineTo(s.x + 7, ay - 6); g.lineTo(s.x, ay + 3); g.closePath(); g.fill(); g.stroke();
    }
  });
  for (const f of floats) {
    const s = toScreen(f.x, f.y), k = f.life / f.max;
    g.globalAlpha = Math.min(1, k * 2); g.font = `900 ${f.size}px "Bungee", "Arial Black", sans-serif`; g.textAlign = 'center';
    g.lineWidth = 4; g.strokeStyle = 'rgba(15,6,40,.9)'; g.strokeText(f.text, s.x, s.y); g.fillStyle = f.color; g.fillText(f.text, s.x, s.y);
  }
  g.globalAlpha = 1;
  for (const b of bubbles) {
    const d = disp[b.pi]; if (!d) continue;
    const s = toScreen(d.x, d.y - 30), k = b.life / b.max;
    g.font = `800 ${small ? 12 : 13}px Nunito, system-ui, sans-serif`;
    const tw = g.measureText(b.text).width + 16, bx = clamp(s.x - tw / 2, 4, vw - tw - 4), byy = s.y - 66;
    g.globalAlpha = Math.min(1, k * 3);
    g.fillStyle = '#fff'; rr(g, bx, byy, tw, 24, 11); g.fill();
    g.beginPath(); g.moveTo(clamp(s.x - 6, bx + 8, bx + tw - 14), byy + 23); g.lineTo(clamp(s.x, bx + 10, bx + tw - 8), byy + 32); g.lineTo(clamp(s.x + 6, bx + 16, bx + tw - 4), byy + 23); g.fill();
    g.fillStyle = '#1b1036'; g.textAlign = 'left'; g.fillText(b.text, bx + 8, byy + 16.5);
    g.globalAlpha = 1;
  }
  for (const a of above) {   // ekranın üstüne çıkan mermi için işaret
    g.fillStyle = '#ffe14a'; g.strokeStyle = 'rgba(15,6,40,.9)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(a.x, 6); g.lineTo(a.x - 8, 20); g.lineTo(a.x + 8, 20); g.closePath(); g.fill(); g.stroke();
  }
  // nişan sürükleme rehberi
  if (gesture && gesture.mode === 'aim' && canAct()) {
    const d = disp[V.cur], s = toScreen(d.x, d.y - 11);
    g.strokeStyle = 'rgba(255,225,74,.85)'; g.lineWidth = 2; g.setLineDash([6, 6]);
    g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(gesture.x, gesture.y); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.arc(s.x, s.y, aimRadius(), 0, Math.PI * 2); g.strokeStyle = 'rgba(255,255,255,.25)'; g.stroke();
  }
}
function aimRadius() { return clamp(Math.min(vw, vh) * .34, 110, 190); }

/* ---------- döngü ---------- */
function frame(ts) {
  raf = requestAnimationFrame(frame);
  if (!V || !cg || !RT) return;
  const dt = Math.min(.05, (ts - (lastT || ts)) / 1000); lastT = ts;
  stepAnim(dt);
  stepInput(dt);
  // görüntülenen tank konumları
  V.tanks.forEach((t, i) => {
    const tp = targetPos(i); let d = disp[i];
    if (!d) d = disp[i] = { x: tp.x, y: tp.y, a: turretAngle(i), sl: 0 };
    const dx = tp.x - d.x, dy = tp.y - d.y, dist = Math.hypot(dx, dy);
    if (anim || dist > 260 || (pred && i === V.cur)) { d.x = tp.x; d.y = tp.y; }
    else if (dist > .3) { const sp = Math.min(dist, 70 * dt + dist * dt * 2.5); d.x += dx / dist * sp; d.y += dy / dist * sp; if (i === V.cur && Math.random() < .3) snd.move(); }
    let ta = turretAngle(i), da = ta - d.a; d.a += Math.abs(da) < .5 ? da : da * Math.min(1, dt * 10);
    d.sl += (groundSlope(d.x, d.y) - d.sl) * Math.min(1, dt * 8);
  });
  waterY += (V.water - waterY) * Math.min(1, dt * 1.5);
  stepCam(dt);
  stepParts(dt);
  if (dirty) { paint(dirty.x0, dirty.x1); dirty = null; }
  if (fastDirty && performance.now() - fastT > 120 && ui.mode === 'online' && canAct()) {
    fastT = performance.now(); fastDirty = false;
    ui.fast({ k: 'aim', a: Math.round(aim.a), p: Math.round(aim.p), w: aim.w, tid: V.turnId });
  }
  draw(ts);
}
function resize() {
  if (!stageEl || !cv) return;
  const r = stageEl.getBoundingClientRect();
  vw = Math.max(200, r.width); vh = Math.max(200, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
  if (!cam.init) { cam.z = zDefault(); cam.init = true; }
  cam.zt = zDefault();
  clampCam();
}

/* ---------- giriş ---------- */
function sendMoveChunk() {
  if (mvSent > 0 && V) { ui.send({ t: 'move', d: pred ? pred.d : 1, n: Math.abs(mvSent), s: ++mvSeq }); mvSent = 0; mvLast = performance.now(); }
}
function stepInput(dt) {
  const act = canAct();
  // açı/güç tuşları
  let da = 0, dp = 0;
  if (act) {
    if (keys.has('ArrowUp')) da += 1; if (keys.has('ArrowDown')) da -= 1;
    if (keys.has('KeyW') || keys.has('PageUp')) dp += 1; if (keys.has('KeyS') || keys.has('PageDown')) dp -= 1;
    if (adjHold && performance.now() > adjHold.next) { adjHold.next = performance.now() + 55; adjust(adjHold.k, adjHold.d); }
    if (da || dp) {
      keys.holdT = (keys.holdT || 0) + dt; const sp = 24 + Math.min(70, keys.holdT * 50);
      if (da) { aim.a = clamp(aim.a + da * sp * dt, 0, 180); }
      if (dp) { aim.p = clamp(aim.p + dp * sp * .8 * dt, 5, 100); }
      fastDirty = true; updCtrl();
    } else keys.holdT = 0;
  }
  // hareket
  let mv = mvBtn;
  if (act && !mv) { if (keys.has('ArrowLeft') || keys.has('KeyA')) mv = -1; else if (keys.has('ArrowRight') || keys.has('KeyD')) mv = 1; }
  const t = V.tanks[V.cur];
  if (act && mv) {
    if (!pred || pred.d !== mv) { if (pred && mvSent) sendMoveChunk(); pred = { x: (pred || t).x, y: (pred || t).y, fuel: pred ? pred.fuel : t.fuel, d: mv }; }
    if (!pred.stop) {
      mvAcc += 55 * dt;
      while (mvAcc >= 1 && pred.fuel > 0) {
        mvAcc--;
        const s = walkStep(RT, pred.x, pred.y, mv);
        if (!s) { mvAcc = 0; break; }
        pred.x = s.x; pred.y = s.y; pred.fuel--; mvSent++;
        if (s.fall) { pred.stop = true; break; }
      }
      if (pred.fuel <= 0) mvAcc = 0;
    }
    if (mvSent >= 12 || (mvSent && performance.now() - mvLast > 200)) sendMoveChunk();
    updCtrl();
  } else {
    mvAcc = 0;
    if (mvSent) sendMoveChunk();
    if (pred && (!act || (t.ms >= mvSeq && performance.now() - mvLast > 250))) pred = null;
  }
}
function adjust(k, d) {
  if (!canAct()) return;
  if (k === 'a') aim.a = clamp(Math.round(aim.a) + d, 0, 180); else aim.p = clamp(Math.round(aim.p) + d, 5, 100);
  fastDirty = true; updCtrl();
}
function setWeapon(k) {
  if (!canAct() || !WMAP[k]) return;
  const t = V.tanks[V.cur], w = WMAP[k];
  if (w.ammo >= 0 && !(t.ammo[k] > 0)) return;
  aim.w = k; if (!w.target) { aim.tx = null; aim.ty = null; }
  fastDirty = true; closeSheet(); updCtrl(); renderWeapons(); Sound.tick(.4);
  if (w.target) toast(k === 'air' ? '✈️ Haritaya dokunup hedefi seç' : '🌀 Işınlanacağın yere dokun');
}
function fire() {
  if (!canAct()) return;
  const t = V.tanks[V.cur], w = WMAP[aim.w];
  if (w.ammo >= 0 && !(t.ammo[w.k] > 0)) { setWeapon('std'); return; }
  if (w.target && aim.tx == null) { toast(w.k === 'air' ? 'Önce haritada hedef seç' : 'Önce ışınlanacağın yere dokun'); return; }
  if (w.k === 'tel' && teleLand(RT, aim.tx, aim.ty, V.water) == null) { toast('Oraya ışınlanamazsın'); return; }
  Sound.init();
  if (mvSent) sendMoveChunk();
  ui.send({ t: 'fire', w: w.k, a: Math.round(aim.a), p: Math.round(aim.p), tx: aim.tx, ty: aim.ty });
}
function toast(text) {
  const el = q('.tks-toast'); if (!el) return;
  el.textContent = text; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el && el.classList.remove('show'), 1900);
}
function openSheet() { if (!canAct()) return; sheetOpen = true; q('.tks-sheet').hidden = false; renderWeapons(); }
function closeSheet() { sheetOpen = false; const s = q('.tks-sheet'); if (s) s.hidden = true; }
function localXY(e) { const r = stageEl.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function onDown(e) {
  if (e.button === 2) return;
  Sound.init();
  const p = localXY(e); pointers.set(e.pointerId, p);
  try { stageEl.setPointerCapture(e.pointerId); } catch { /* */ }
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    gesture = { mode: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: cam.z, mid: toWorld((a.x + b.x) / 2, (a.y + b.y) / 2) };
    return;
  }
  const act = canAct();
  const d = act ? disp[V.cur] : null;
  let mode = 'pan';
  if (act && d) {
    const s = toScreen(d.x, d.y - 11), dist = Math.hypot(p.x - s.x, p.y - s.y);
    if (WMAP[aim.w].target) mode = 'tap';
    else if (dist < (e.pointerType === 'mouse' ? 56 : 72)) mode = 'aim';
  }
  gesture = { mode, x0: p.x, y0: p.y, x: p.x, y: p.y, cx: cam.x, cy: cam.y, moved: 0 };
  if (mode === 'aim') aimFrom(p);
}
function aimFrom(p) {
  const d = disp[V.cur], s = toScreen(d.x, d.y - 11), dx = p.x - s.x, dy = s.y - p.y, dist = Math.hypot(dx, dy);
  if (dist < 14) return;
  let a = Math.atan2(dy, dx) / D2R; if (a < 0) a = dx >= 0 ? 0 : 180;
  aim.a = clamp(Math.round(a), 0, 180); aim.p = clamp(Math.round(dist / aimRadius() * 100), 5, 100);
  fastDirty = true; updCtrl();
}
function onMove(e) {
  if (!pointers.has(e.pointerId)) return;
  const p = localXY(e); pointers.set(e.pointerId, p);
  if (!gesture) return;
  if (gesture.mode === 'pinch' && pointers.size >= 2) {
    const [a, b] = [...pointers.values()], dd = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    cam.z = clamp(gesture.z0 * dd / gesture.d0, zFit() * .95, 1.8); cam.zt = cam.z;
    cam.x = gesture.mid.x - (mx - vw / 2) / cam.z; cam.y = gesture.mid.y - (my - vh / 2) / cam.z;
    cam.free = performance.now() + 6000; cam.ov = false; clampCam(); return;
  }
  gesture.moved = Math.max(gesture.moved, Math.hypot(p.x - gesture.x0, p.y - gesture.y0));
  gesture.x = p.x; gesture.y = p.y;
  if (gesture.mode === 'aim') { aimFrom(p); return; }
  if (gesture.mode === 'pan' || (gesture.mode === 'tap' && gesture.moved > 12)) {
    cam.x = gesture.cx - (p.x - gesture.x0) / cam.z; cam.y = gesture.cy - (p.y - gesture.y0) / cam.z;
    cam.free = performance.now() + 5000; clampCam();
  }
}
function onUp(e) {
  if (!pointers.has(e.pointerId)) return;
  const p = localXY(e); pointers.delete(e.pointerId);
  if (gesture && gesture.mode === 'tap' && gesture.moved <= 12 && canAct()) {
    const w = toWorld(p.x, p.y);
    aim.tx = Math.round(clamp(w.x, 0, W)); aim.ty = Math.round(w.y);
    if (aim.w === 'tel' && teleLand(RT, aim.tx, aim.ty, V.water) == null) toast('Oraya ışınlanamazsın: başka yer seç');
    fastDirty = true; updCtrl(); Sound.tick(.6);
  }
  if (pointers.size === 0) gesture = null;
  else if (gesture && gesture.mode === 'pinch') gesture = null;
}
function onWheel(e) {
  e.preventDefault();
  const p = localXY(e), w = toWorld(p.x, p.y);
  cam.z = clamp(cam.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12), zFit() * .95, 1.8); cam.zt = cam.z;
  cam.x = w.x - (p.x - vw / 2) / cam.z; cam.y = w.y - (p.y - vh / 2) / cam.z;
  cam.free = performance.now() + 5000; cam.ov = false; clampCam();
}
const WKEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus'];
function onKey(e) {
  if (!root) return;
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (!document.getElementById('menu').hidden || !document.getElementById('results').hidden) return;
  const k = e.code;
  const game = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'PageUp', 'PageDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyQ', 'KeyE', 'Enter'].includes(k) || WKEYS.includes(k);
  if (!game) return;
  if (e.type === 'keydown') {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'PageUp', 'PageDown'].includes(k)) e.preventDefault();
    if (e.repeat) return;
    keys.add(k);
    if (!canAct()) return;
    if (k === 'Space' || k === 'Enter') fire();
    else if (k === 'KeyQ' || k === 'KeyE') {
      const t = V.tanks[V.cur], list = WEAPONS.filter(w => w.ammo < 0 || t.ammo[w.k] > 0), i = list.findIndex(w => w.k === aim.w);
      setWeapon(list[(i + (k === 'KeyQ' ? -1 : 1) + list.length) % list.length].k);
    } else if (WKEYS.includes(k)) setWeapon(WEAPONS[WKEYS.indexOf(k)].k);
  } else keys.delete(k);
}
function onBlur() { keys.clear(); mvBtn = 0; adjHold = null; }
function holdBtn(el, down, up) {
  el.addEventListener('pointerdown', e => { e.preventDefault(); Sound.init(); try { el.setPointerCapture(e.pointerId); } catch { /* */ } down(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, () => up()));
  el.addEventListener('contextmenu', e => e.preventDefault());
}

/* ---------- HUD ve kontroller ---------- */
function weaponLabel(k, t) { const w = WMAP[k]; return w.ammo < 0 ? '∞' : `×${t ? (t.ammo[k] || 0) : 0}`; }
function renderWeapons() {
  if (!V || !root) return;
  const t = V.tanks[V.cur], act = canAct();
  const html = WEAPONS.map((w, i) => {
    const n = w.ammo < 0 ? Infinity : (t.ammo[w.k] || 0);
    return `<button type="button" class="tks-w ${aim.w === w.k && act ? 'on' : ''}" data-w="${w.k}" ${act && n > 0 ? '' : 'disabled'} title="${esc(w.name)} (${i < 9 ? i + 1 : i === 9 ? 0 : '-'})">
      <span class="tks-wi">${w.icon}</span><span class="tks-wn"><b>${esc(w.short)}</b><small>${esc(w.desc)}</small></span><span class="tks-wa">${weaponLabel(w.k, t)}</span></button>`;
  }).join('');
  root.querySelectorAll('.tks-wgrid').forEach(el => { el.innerHTML = html; });
}
function updCtrl() {
  if (!V || !root) return;
  const act = canAct(), t = V.tanks[V.cur], w = WMAP[aim.w] || WMAP.std;
  const fuel = pred ? pred.fuel : t.fuel;
  const elev = Math.round(aim.a <= 90 ? aim.a : 180 - aim.a), dir = aim.a < 89.5 ? '▶' : aim.a > 90.5 ? '◀' : '▲';
  const shownA = act ? `${dir} ${elev}°` : (() => { const a = turretAngle(V.cur); return `${a < 89.5 ? '▶' : a > 90.5 ? '◀' : '▲'} ${Math.round(a <= 90 ? a : 180 - a)}°`; })();
  const L = live[V.cur], shownP = act ? Math.round(aim.p) : (L && L.tid === V.turnId ? L.p : t.pow);
  const fireTxt = !act ? 'ATEŞ!' : w.util && !w.target ? 'KULLAN' : w.target && aim.tx == null ? 'HEDEF SEÇ' : w.k === 'tel' ? 'IŞINLAN' : 'ATEŞ!';
  const key = [act, fuel, shownA, shownP, aim.w, fireTxt, V.turnId, t.ammo[aim.w], aim.tx].join('|');
  if (key === ctrlKey) return; ctrlKey = key;
  const cw = act ? w : WMAP[curWeapon()] || WMAP.std;
  q('.tks-av').textContent = shownA; q('.tks-pv').textContent = shownP;
  q('.tks-fuel i').style.width = (fuel / FUEL * 100).toFixed(1) + '%';
  q('.tks-fuel span').textContent = `⛽ ${Math.max(0, Math.round(fuel))}`;
  q('.tks-wbtn').innerHTML = `<span class="tks-wi">${cw.icon}</span><b>${esc(cw.short)}</b><small>${weaponLabel(cw.k, t)}</small><i>▾</i>`;
  const fb = q('.tks-fire'); fb.textContent = fireTxt; fb.disabled = !act; fb.classList.toggle('util', act && !!w.util);
  q('.tks-pass').disabled = !act;
  q('.tks-wbtn').disabled = !act;
  root.querySelectorAll('.tks-mv').forEach(b => { b.disabled = !act || fuel <= 0; });
  root.querySelectorAll('[data-adj]').forEach(b => { b.disabled = !act; });
  q('.tks-ctrl').classList.toggle('off', !act);
}
function updChips() {
  if (!V || !root) return;
  const key = V.tanks.map((t, i) => { const inf = tankInfo(i); return [inf.hp, inf.alive, inf.sh, V.players[i].online].join(','); }).join(';') + V.cur + V.phase;
  if (key === chipKey) return; chipKey = key;
  q('.tks-players').innerHTML = V.players.map((p, i) => {
    const inf = tankInfo(i), cur = i === V.cur && V.phase !== 'over', me = ui.me === i;
    return `<div class="g-chip tks-chip ${cur ? 'active' : ''} ${!inf.alive ? 'dead' : ''} ${p.online === false ? 'off' : ''}" style="--pc:${p.color}">
      <span class="av" style="--pc:${p.color}">${inf.alive ? initial(p.name) : '💀'}</span>
      <span class="tks-cn"><b>${esc(p.name)}${me ? ' <small>(sen)</small>' : ''}${p.isBot ? ' <small>🤖</small>' : ''}</b>
      <span class="tks-hp"><i style="width:${inf.hp}%;--hc:${inf.hp > 50 ? 'var(--good)' : inf.hp > 25 ? 'var(--yellow)' : 'var(--bad)'}"></i></span></span>
      ${V.teams ? `<span class="tks-team t${V.tanks[i].team}">${V.tanks[i].team ? 'B' : 'A'}</span>` : ''}
      <span class="tks-hpn">${inf.alive ? inf.hp : '—'}${inf.sh > 0 ? '<small>🛡️</small>' : ''}</span></div>`;
  }).join('');
}
function updStatus() {
  if (!V || !root) return;
  const P = V.players, c = P[V.cur], el = q('.tks-status');
  let html;
  if (V.phase === 'over') {
    html = V.win && V.win.team != null ? `<span class="g-turn win">🏆 ${V.teams ? teamName(V.win.team) : esc(P[V.tanks.findIndex(t => t.alive)].name)} kazandı!</span>` : '<span class="g-turn">Berabere!</span>';
  } else if (anim || V.phase === 'anim') {
    const s = anim ? anim.rec : V.shot, w = s ? WMAP[s.w] : null;
    html = `<span class="g-turn">${w ? w.icon : '💥'} <b style="color:${P[s ? s.pi : V.cur].color}">${esc(P[s ? s.pi : V.cur].name)}</b>&nbsp;· ${w ? esc(w.name) : 'ateş'}</span>`;
  } else if (V.phase === 'between') html = `<span class="g-turn">${V.crates.some(cc => ui.hostNow() - cc.ts < 1800) ? '📦 Kasa düşüyor…' : V.rising ? '🌊 Su yükseliyor…' : 'Sıradaki hazırlanıyor…'}</span>`;
  else if (canAct()) {
    const multi = ui.me === 'all' && P.filter(p => !p.isBot).length > 1;
    html = `<span class="g-turn mine">⭐ ${multi ? esc(c.name.toLocaleUpperCase('tr-TR')) + ', SIRA SENDE' : 'SIRA SENDE'}</span>`;
  } else html = `<span class="g-turn">Sıra: <b style="color:${c.color}">${esc(c.name)}</b>&nbsp;${c.isBot ? 'düşünüyor…' : 'nişan alıyor…'}</span>`;
  if (el.innerHTML !== html) el.innerHTML = html;
}
function updWind() {
  const w = V.wind || 0, el = q('.tks-warr');
  const n = Math.abs(w), arrows = n === 0 ? '' : (w < 0 ? '◀'.repeat(Math.ceil(n / 3.4)) : '▶'.repeat(Math.ceil(n / 3.4)));
  el.innerHTML = n === 0 ? '<em>Sakin</em>' : (w < 0 ? `<i>${arrows}</i> ${n}` : `${n} <i>${arrows}</i>`);
  q('.tks-wind').style.setProperty('--wk', (n / 10).toFixed(2));
  const th = THEMES[V.theme];
  q('.tks-map').textContent = `${th.icon} ${th.name} · ${V.round}. tur${V.sd ? (V.round >= V.sd ? ' · 🌊 Ani ölüm!' : ` · 🌊 ${V.sd}. turda`) : ''}`;
}
function updSide() {
  const th = THEMES[V.theme];
  const key = V.theme + V.teams + V.sd + V.timer;
  if (key === sideKey) return; sideKey = key;
  q('.tks-sinfo').innerHTML = `<b>${th.icon} ${th.name}</b> · yerçekimi ${th.g < .1 ? 'düşük' : 'normal'} · ${V.timer} sn${V.teams ? ' · 2 takım' : ''}${V.sd ? ` · ${V.sd}. turdan sonra su yükselir` : ''}`;
}
function hudTick() {
  if (!V || !root) return;
  updChips(); updCtrl();
  const tEl = q('.tks-timer');
  if (V.phase === 'aim') {
    const rem = Math.max(0, Math.ceil((V.turnEnd - ui.hostNow()) / 1000));
    tEl.querySelector('b').textContent = rem; tEl.classList.toggle('urgent', rem <= 5); tEl.hidden = false;
    if (canAct() && rem <= 5 && rem !== lastSec && rem > 0) Sound.tick(.8);
    lastSec = rem;
  } else tEl.hidden = true;
  if (V.phase !== lastPhase || V.phase === 'between') { updStatus(); lastPhase = V.phase; }
}
function updHud(full) { if (!V) return; updChips(); updStatus(); updWind(); updCtrl(); updSide(); if (full) renderWeapons(); }

/* ---------- render / mount ---------- */
function render(v) {
  const first = !V;
  V = v;
  if (!RT || RT.seed !== v.seed || RT.theme !== v.theme) { buildRender(v.seed, v.theme); disp = []; seenShot = 0; parts = []; floats = []; bubbles = []; cam.init = false; resize(); waterY = v.water; lastTurnId = -1; }
  if (bgKey !== v.seed + v.theme) buildBg(v);
  if (v.shot && v.shot.id !== seenShot && v.phase === 'anim') {
    const durMs = v.shot.dur * 1000 / 60, el = ui.hostNow() - (v.animEnd - durMs);
    if (el < durMs - 200) startAnim(v.shot, Math.max(0, el - 120)); else seenShot = v.shot.id;
  }
  syncTerrain();
  if (v.turnId !== lastTurnId) {
    lastTurnId = v.turnId;
    const t = v.tanks[v.cur];
    aim = { a: t.ang, p: t.pow, w: t.w in WMAP && (WMAP[t.w].ammo < 0 || t.ammo[t.w] > 0) ? t.w : 'std', tx: null, ty: null };
    pred = null; lastFocus = null; mvSent = 0; mvSeq = t.ms || 0; mvBtn = 0; closeSheet(); cam.free = 0; live = {};
    if (v.phase === 'aim' && !first) {
      if (canAct()) {
        const multi = ui.me === 'all' && v.players.filter(p => !p.isBot).length > 1;
        banner(multi ? `SIRA: ${v.players[v.cur].name.toLocaleUpperCase('tr-TR')}` : 'SIRA SENDE!', 'good'); Sound.stop();
        if (isTouch() && !hintShown) { hintShown = true; const h = q('.tks-hint'); h.hidden = false; setTimeout(() => { if (h) h.hidden = true; }, 4200); }
      }
    }
  }
  if (!canAct()) { pred = null; if (sheetOpen) closeSheet(); }
  updHud(true);
}
function mount(r, api) {
  root = r; ui = api; V = null; RT = null; anim = null; seenShot = 0; parts = []; floats = []; bubbles = []; planes = []; disp = []; live = {}; pred = null;
  keys = new Set(); pointers = new Map(); gesture = null; lastTurnId = -1; chipKey = ''; ctrlKey = ''; sideKey = ''; lastT = 0; cam = { x: W / 2, y: 620, z: .6, free: 0, ov: false, init: false }; bgKey = '';
  root.innerHTML = `<div class="g-wrap tks">
    <div class="tks-hud"><div class="tks-players"></div><div class="g-status tks-status"></div></div>
    <div class="tks-main">
      <div class="tks-col">
        <div class="tks-stage">
          <canvas class="tks-cv" aria-label="Savaş alanı"></canvas>
          <div class="tks-tl"><span class="tks-timer">⏱ <b>--</b></span></div>
          <div class="tks-wind" title="Rüzgâr"><small>RÜZGÂR</small><b class="tks-warr"></b></div>
          <div class="tks-tr"><span class="tks-map"></span></div>
          <div class="tks-tools"><button type="button" class="tks-tool" data-tool="center" aria-label="Kamerayı ortala">🎯</button><button type="button" class="tks-tool" data-tool="ov" aria-label="Genel görünüm">🗺️</button></div>
          <div class="tks-toast" aria-live="polite"></div>
          <div class="tks-hint" hidden><i></i><span>Tankından sürükle: yön ve güç</span></div>
          <div class="tks-sheet" hidden><div class="tks-sheet-in"><div class="tks-sheet-h"><b>Silah seç</b><button type="button" class="tks-x" aria-label="Kapat">✕</button></div><div class="tks-wgrid"></div></div></div>
        </div>
        <div class="tks-ctrl off">
          <div class="tks-r1">
            <button type="button" class="tks-btn tks-mv" data-mv="-1" aria-label="Sola sür">◀</button>
            <button type="button" class="tks-btn tks-mv" data-mv="1" aria-label="Sağa sür">▶</button>
            <div class="tks-fuel"><i></i><span>⛽</span></div>
            <button type="button" class="tks-btn tks-wbtn" aria-label="Silah seç"></button>
          </div>
          <div class="tks-r2">
            <div class="tks-adj"><button type="button" class="tks-btn" data-adj="a" data-d="1" aria-label="Namluyu sola çevir">↺</button><span class="tks-val"><small>AÇI</small><b class="tks-av">45°</b></span><button type="button" class="tks-btn" data-adj="a" data-d="-1" aria-label="Namluyu sağa çevir">↻</button></div>
            <div class="tks-adj"><button type="button" class="tks-btn" data-adj="p" data-d="-1" aria-label="Gücü azalt">−</button><span class="tks-val"><small>GÜÇ</small><b class="tks-pv">60</b></span><button type="button" class="tks-btn" data-adj="p" data-d="1" aria-label="Gücü artır">+</button></div>
          </div>
          <div class="tks-r3"><button type="button" class="tks-btn tks-pass">⏭ Pas</button><button type="button" class="tks-btn tks-fire">ATEŞ!</button></div>
        </div>
      </div>
      <aside class="tks-side g-panel">
        <h3 class="tks-h">Cephanelik</h3>
        <div class="tks-wgrid tks-side-w"></div>
        <p class="tks-sinfo"></p>
        <p class="tks-keys">⌨️ <b>←/→</b> sür · <b>↑/↓</b> açı · <b>W/S</b> güç · <b>Boşluk</b> ateş · <b>Q/E</b> ya da <b>1–0</b> silah · tankından fareyle sürükleyerek nişan al · tekerlekle yakınlaş</p>
      </aside>
    </div>
  </div>`;
  cv = q('.tks-cv'); cg = cv.getContext('2d'); stageEl = q('.tks-stage');
  stageEl.addEventListener('pointerdown', onDown); stageEl.addEventListener('pointermove', onMove);
  stageEl.addEventListener('pointerup', onUp); stageEl.addEventListener('pointercancel', onUp);
  stageEl.addEventListener('wheel', onWheel, { passive: false });
  stageEl.addEventListener('contextmenu', e => e.preventDefault());
  root.querySelectorAll('.tks-tools, .tks-sheet, .tks-toast').forEach(el => el.addEventListener('pointerdown', e => e.stopPropagation()));
  root.querySelector('.tks-tools').addEventListener('click', e => {
    const b = e.target.closest('[data-tool]'); if (!b) return;
    if (b.dataset.tool === 'center') { cam.free = 0; cam.ov = false; cam.z = cam.zt = zDefault(); }
    else { cam.ov = !cam.ov; cam.z = cam.ov ? zFit() : zDefault(); if (cam.ov) { cam.x = W / 2; cam.y = 560; cam.free = performance.now() + 1e9; } else cam.free = 0; clampCam(); }
  });
  root.querySelectorAll('.tks-mv').forEach(b => holdBtn(b, () => { if (!b.disabled) mvBtn = +b.dataset.mv; }, () => { mvBtn = 0; }));
  root.querySelectorAll('[data-adj]').forEach(b => holdBtn(b, () => { if (b.disabled) return; adjust(b.dataset.adj, +b.dataset.d); adjHold = { k: b.dataset.adj, d: +b.dataset.d, next: performance.now() + 320 }; }, () => { adjHold = null; }));
  q('.tks-fire').addEventListener('click', fire);
  q('.tks-pass').addEventListener('click', () => { if (canAct()) { if (mvSent) sendMoveChunk(); ui.send({ t: 'pass' }); } });
  q('.tks-wbtn').addEventListener('click', () => { if (sheetOpen) closeSheet(); else openSheet(); });
  q('.tks-x').addEventListener('click', closeSheet);
  q('.tks-sheet').addEventListener('click', e => { if (e.target.classList.contains('tks-sheet')) closeSheet(); });
  root.addEventListener('click', e => { const b = e.target.closest('.tks-w'); if (b && !b.disabled) setWeapon(b.dataset.w); });
  if (window.ResizeObserver) { ro = new ResizeObserver(() => resize()); ro.observe(stageEl); }
  addEventListener('resize', resize);
  document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKey); addEventListener('blur', onBlur);
  hudT = setInterval(hudTick, 200);
  resize();
  raf = requestAnimationFrame(frame);
}
function unmount() {
  removeEventListener('resize', resize); removeEventListener('blur', onBlur);
  document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKey);
  if (ro) { ro.disconnect(); ro = null; }
  clearInterval(hudT); clearTimeout(toastT); if (raf) cancelAnimationFrame(raf);
  raf = 0; root = null; ui = null; V = null; cv = null; cg = null; stageEl = null; anim = null; RT = null; parts = []; floats = []; bubbles = [];
}
function onEvent(e) {
  if (!V) return;
  switch (e.t) {
    case 'pick': { const d = disp[e.pi]; if (d) addFloat(d.x, d.y - 44, '📦 ' + e.txt, '#ffe14a', 17); Sound.buy(); break; }
    case 'ouch': { const d = disp[e.pi]; if (d) addFloat(d.x, d.y - 30, `−${e.v}`, '#ff4d6d', 20); Sound.bad(); shake = 4; break; }
    case 'drown': { const d = disp[e.pi]; if (d) { addFloat(d.x, d.y - 30, 'Glu glu!', '#bff3ff', 20); for (let k = 0; k < 18; k++) parts.push({ k: 'drop', x: d.x + (Math.random() - .5) * 16, y: waterY, vx: (Math.random() - .5) * 140, vy: -120 - Math.random() * 180, life: 1, max: 1, r: 2.5 }); } snd.splash(); break; }
    case 'crate': Sound.whoosh(); break;
    case 'rise': banner('SU YÜKSELİYOR!', 'bad'); Sound.bad(); break;
    case 'pass': if (e.why === 'time') { Sound.bad(); if (V.players[e.pi] && (ui.me === e.pi || (ui.me === 'all' && !V.players[e.pi].isBot))) banner('SÜRE DOLDU', 'bad'); } break;
    case 'win': flash('good'); FX.confetti(80); break;
    default: break;
  }
}
function onFast(m) {
  if (!m || m.k !== 'aim' || typeof m.seat !== 'number') return;
  live[m.seat] = { a: clamp(+m.a || 0, 0, 180), p: clamp(+m.p || 0, 0, 100), w: WMAP[m.w] ? m.w : 'std', tid: m.tid, at: performance.now() };
}

/* ---------- kayıt ---------- */
CFX.registerGame({
  id: 'tanksavasi', name: 'Tank Savaşı', icon: '💥', color: '#ff7a2f', min: 2, max: 8, hotseat: true, bot: true, localMin: 1,
  tagline: 'Rüzgârı oku, açını ayarla, araziyi uçur!',
  rules: 'Sırası gelen tank biraz yakıtla ilerler, açı ve gücü ayarlayıp 11 silahtan birini ateşler; rüzgâr mermiyi savurur, patlamalar araziyi oyar. Suya düşen ya da canı biten tank savaştan çıkar; kasalardan cephane ve can kapılır. Ayakta kalan son tank (ya da takım) kazanır.',
  options: [
    { key: 'tema', label: 'Harita', def: 'rastgele', choices: [{ v: 'rastgele', label: '🎲 Rastgele' }, { v: 'col', label: '🏜️ Çöl' }, { v: 'dag', label: '🏔️ Karlı Dağ' }, { v: 'ada', label: '🏝️ Ada' }, { v: 'ay', label: '🌕 Ay Yüzeyi' }] },
    { key: 'sure', label: 'Tur süresi', def: '45', choices: [{ v: '30', label: '30 sn' }, { v: '45', label: '45 sn' }, { v: '60', label: '60 sn' }] },
    { key: 'takim', label: 'Takımlar', def: '0', choices: [{ v: '0', label: 'Herkes tek' }, { v: '2', label: '2 takım' }] },
    { key: 'ani', label: 'Ani ölüm (su yükselir)', def: '8', choices: [{ v: '0', label: 'Kapalı' }, { v: '5', label: '5. tur' }, { v: '8', label: '8. tur' }, { v: '12', label: '12. tur' }] },
    { key: 'kasa', label: 'Kasalar', def: '1', choices: [{ v: '1', label: 'Açık' }, { v: '0', label: 'Kapalı' }] },
    { key: 'zorluk', label: 'Bilgisayar', def: 'orta', choices: [{ v: 'kolay', label: 'Kolay' }, { v: 'orta', label: 'Orta' }, { v: 'zor', label: 'Zor' }] }
  ],
  setup(players, opts, ctx) {
    const keysT = Object.keys(THEMES);
    const theme = THEMES[opts.tema] ? opts.tema : keysT[Math.floor(Math.random() * keysT.length)];
    const seed = ((Math.random() * 2147483646) >>> 0) + 1;
    const n = players.length, teams = opts.takim === '2' && n >= 2;
    const st = {
      theme, seed, ops: '', sum: '', sumLen: 0, water: WATER0, wind: 0, round: 1, cur: 0, turnId: 1, phase: 'aim', turnEnd: 0, animEnd: 0,
      timer: [30, 45, 60].includes(+opts.sure) ? +opts.sure : 45, teams, sd: +opts.ani || 0, crOn: opts.kasa !== '0', diff: ['kolay', 'orta', 'zor'].includes(opts.zorluk) ? opts.zorluk : 'orta',
      players: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })), tanks: [], crates: [], crateId: 0, shot: null, shotId: 0, deathN: 0, bp: null, pendLog: null, win: null, rising: false
    };
    HT = null;
    const T = terr(st);
    // başlangıç yerleri: dilimlere böl, rastgele sırayla dağıt
    const xs = [], slot = (W - 240) / n;
    for (let k = 0; k < n; k++) {
      let x = -1;
      for (let tries = 0; tries < 60; tries++) {
        const cx = Math.round(120 + slot * k + slot * (.2 + Math.random() * .6));
        const y = dropFromTop(T, cx, st.water); if (y > 0 && y < st.water - 30) { x = cx; break; }
      }
      if (x < 0) for (let tries = 0; tries < 400 && x < 0; tries++) { const cx = Math.round(100 + Math.random() * (W - 200)), y = dropFromTop(T, cx, st.water); if (y > 0 && y < st.water - 30 && !xs.some(o => Math.abs(o - cx) < 60)) x = cx; }
      if (x < 0) x = Math.round(W / 2 + (k - n / 2) * 40);
      xs.push(x);
    }
    const order = xs.map((x, i) => i); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    st.tanks = players.map((p, i) => {
      const x = xs[order[i]]; let y = dropFromTop(T, x, st.water); if (y < 0) y = dropY(T, x, 0, st.water);
      const ammo = {}; WEAPONS.forEach(w => { if (w.ammo >= 0) ammo[w.k] = w.ammo; });
      return { x, y, hp: HPMAX, sh: 0, alive: true, sunk: false, ang: x < W / 2 ? 55 : 125, pow: 62, w: 'std', fuel: FUEL, team: teams ? i % 2 : i, ammo, dmg: 0, kills: 0, dOrd: 0, ms: 0 };
    });
    st.cur = Math.floor(Math.random() * n);
    newWind(st);
    st.turnEnd = Date.now() + st.timer * 1000;
    st.sum = checksum(T); st.sumLen = 0;
    ctx.emit({ t: 'start' }, `${THEMES[theme].icon} ${THEMES[theme].name} haritası! İlk atış: ${players[st.cur].name}.`, 'gold');
    armTimer(st, ctx);
    return st;
  },
  action(st, pi, a, ctx) {
    if (!a || st.phase !== 'aim' || pi !== st.cur) return;
    if (a.t === 'move') doMove(st, pi, a, ctx, false);
    else if (a.t === 'fire') doFire(st, pi, a, ctx);
    else if (a.t === 'pass') passTurn(st, ctx, 'pass');
  },
  view(st) {
    const RG = CFX.Room && CFX.Room.game;
    return {
      theme: st.theme, seed: st.seed, ops: st.ops, sum: st.sum, sumLen: st.sumLen, water: st.water, wind: st.wind, round: st.round, cur: st.cur, turnId: st.turnId,
      phase: st.phase, turnEnd: st.turnEnd, animEnd: st.animEnd, timer: st.timer, teams: st.teams, sd: st.sd, rising: st.rising, win: st.win,
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, online: RG && RG.players[i] ? RG.players[i].online !== false : true })),
      tanks: st.tanks.map(t => ({ x: t.x, y: t.y, hp: t.hp, sh: t.sh, alive: t.alive, sunk: !!t.sunk, ang: t.ang, pow: t.pow, w: t.w, fuel: t.fuel, team: t.team, ammo: t.ammo, dmg: t.dmg, kills: t.kills, ms: t.ms })),
      crates: st.crates, shot: st.phase === 'anim' ? st.shot : null
    };
  },
  turnOf(st) { return st.phase === 'aim' ? st.cur : null; },
  botDelay: 800,
  botAct(st, pi, ctx) {
    if (st.phase !== 'aim' || st.cur !== pi) return;
    try { botStep(st, pi, ctx); } catch (e) { console.error('Tank botu', e); if (st.phase === 'aim' && st.cur === pi) passTurn(st, ctx, 'bot'); }
  },
  skipTurn(st, pi, ctx) { if (st.phase === 'aim' && st.cur === pi) passTurn(st, ctx, 'off'); },
  resume(st, ctx) {
    if (st.phase === 'aim') { st.turnEnd = Math.max(st.turnEnd, Date.now() + 8000); armTimer(st, ctx); }
    else if (st.phase === 'anim') ctx.later(800, () => { if (st.phase === 'anim') afterShot(st, ctx); });
    else if (st.phase === 'between') ctx.later(800, () => { if (st.phase === 'between') nextTurn(st, ctx); });
    else if (st.phase === 'over') { /* sonuç zaten kayıtlı */ }
  },
  mount, render, onEvent, onFast, unmount,
  // testler için dışa açık yardımcılar
  _tks: { W, H, THEMES, WEAPONS, WMAP, newTerrain, carveC, tunnel, applyOps, opStr, checksum, solid, supported, canStand, walkStep, dropY, dropFromTop, teleLand, fly, makeSim, runSim, boom, dealDmg, terr, searchShot, botChoose, isBuried, fallDmg, tipOf, doFire, doMove, nextTurn, checkWin, pickupAt, decPts,
    client: () => ({ len: RT ? RT.len : -1, ok: sumOk, checked: sumChecked, desyncs, anim: !!anim, f: anim ? anim.f : -1, sum: RT ? checksum(RT) : null }),
    tcanvas: () => tcv, live: () => live, cam: () => cam, disp: () => disp, aim: () => aim, toScreen: (x, y) => toScreen(x, y), stageRect: () => stageEl && stageEl.getBoundingClientRect(), canAct: () => canAct() }
});
})();
