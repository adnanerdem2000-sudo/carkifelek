/* =========================================================================
   OYUN SALONU — PATİLİ YARIŞ 🐾
   Sevimli hayvanların engelli parkurlarda yarıştığı, güçlerle dolu çok
   oyunculu koşu oyunu. Parkur, durumdaki tohumdan her cihazda AYNI üretilir;
   her cihaz yalnız kendi koşucusunu (ve yerel modda bilgisayarları) sabit
   adımlı fizikle simüle eder, konumunu hızlı kanaldan (~10 Hz) yayınlar.
   Varışlar, güç kutuları ve güçlerin hedefleri yöneten cihazda (host)
   doğrulanır. Kozmetiklerin yarışa hiçbir etkisi yoktur.
   Dosyalar: kosu_art.js (çizim) → kosu_shop.js (mağaza/ilerleme) → kosu.js
   ========================================================================= */
(function (GL) {
'use strict';
const NS = GL.PatiliYaris = GL.PatiliYaris || {};
const SHOP = NS.shop;

/* =================================================================== MOTOR */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const TAU = Math.PI * 2;
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const DT = 1 / 120;
const PH = {
  V: 340, ACC: 1150, ACC_AIR: 700, ACC_ICE: 240, G: 2300, VJ: 800, VJ2: 700, CUT: -330,
  COY: .1, BUF: .13, HW: 15, HS: 56, HL: 28, STEP: 14, SNAP: 22, VFALL: 1500, SPRING: 1320, FASTFALL: 950
};
const START_X = 120;
const BK = 256;                                  // uzamsal kova genişliği

const WORLD_IDS = ['seker', 'buzul', 'volkan', 'uzay', 'cayir', 'gece'];
const WORLD_INFO = {
  cayir: { n: 'Çiçekli Çayır', i: '🌼', len: 23800 },
  seker: { n: 'Şeker Ormanı', i: '🍭', len: 23800 },
  buzul: { n: 'Buzul Vadisi', i: '❄️', len: 24000 },
  volkan: { n: 'Volkan Adası', i: '🌋', len: 23200 },
  uzay: { n: 'Uzay Limanı', i: '🚀', len: 23600 },
  gece: { n: 'Gece Şehri', i: '🌃', len: 23800 }
};
// parkur uzunluğu: Kısa ~45 sn · Orta ~70 sn · Uzun ~100 sn
const LEN_INFO = { kisa: { n: 'Kısa', f: .62 }, orta: { n: 'Orta', f: 1 }, uzun: { n: 'Uzun', f: 1.42 } };
// parça ağırlıkları dünyaya göre
const CHUNK_W = {
  cayir: { gap: 3, dgap: 1, hill: 2, stepup: 2, crates: 3, spikes: 2, bar: 2, springwall: 1, plathop: 2, hammer: 2, log: 2, mud: 2, pad: 1, mover: 1, bridge: 1, lanes: 2 },
  seker: { gap: 2, dgap: 1, hill: 2, stepup: 1, crates: 2, spikes: 2, bar: 2, springwall: 2, plathop: 3, conv: 2, mud: 1, log: 2, pad: 2, mover: 2, bridge: 2, lanes: 2, hammer: 1 },
  buzul: { gap: 2, dgap: 1, hill: 3, iceslope: 3, stepup: 1, crates: 2, spikes: 2, bar: 2, log: 2, plathop: 2, springwall: 1, hammer: 1, mud: 1, bridge: 2, lanes: 1 },
  volkan: { gap: 3, dgap: 2, geyser: 2, rocks: 3, hill: 2, stepup: 2, crates: 1, spikes: 2, log: 1, plathop: 2, hammer: 1, bar: 1, springwall: 1, mover: 2, bridge: 2, lanes: 1 },
  uzay: { gap: 2, dgap: 1, lowg: 4, mover: 3, plathop: 2, conv: 2, bar: 2, crates: 2, spikes: 1, hammer: 1, pad: 2, springwall: 1, bridge: 1, lanes: 2, stepup: 1 },
  gece: { gap: 3, dgap: 2, conv: 3, bar: 3, crates: 2, plathop: 2, hammer: 2, springwall: 2, pad: 2, spikes: 1, stepup: 2, mover: 2, lanes: 1 }
};

/* ------------------------------------------------------------------ parkur üretimi */
function genTrack(seed, world, len) {
  if (!WORLD_INFO[world]) world = 'cayir';
  if (!LEN_INFO[len]) len = 'orta';
  const rng = mulberry((seed >>> 0) ^ hashStr(len === 'orta' ? world : world + ':' + len));
  const R = (a, b) => a + rng() * (b - a), RI = (a, b) => Math.floor(R(a, b + 1)), CH = arr => arr[Math.floor(rng() * arr.length)];
  const T = { seed, world, lenKey: len, segs: [], blocks: [], plats: [], haz: [], boxes: [], coins: [], cps: [], deco: [], pits: [], len: 0, parExtra: 0 };
  let x = 0, gy = 400, nid = 1, lastCp = 0, lastBox = 0, d = 0;
  const L = Math.round(WORLD_INFO[world].len * LEN_INFO[len].f);
  const ice = world === 'buzul';
  const id = () => nid++;
  const seg = (x0, x1, y0, y1, o) => { if (x1 - x0 < 1) return; T.segs.push({ x0: Math.round(x0), x1: Math.round(x1), y0: Math.round(y0), y1: Math.round(y1), ice: !!(o && o.ice) }); };
  const iceFlag = () => (ice && rng() < .55 ? { ice: true } : null);
  const flat = len => { seg(x, x + len, gy, gy, iceFlag()); x += len; };
  const coinLine = (x0, n, y, sp = 38) => { for (let i = 0; i < n; i++) T.coins.push({ id: id(), x: Math.round(x0 + i * sp), y: Math.round(y) }); };
  const coinArc = (x0, x1, y0, h) => { const n = Math.max(3, Math.round((x1 - x0) / 46)); for (let i = 0; i <= n; i++) { const u = i / n; T.coins.push({ id: id(), x: Math.round(x0 + (x1 - x0) * u), y: Math.round(y0 - h * 4 * u * (1 - u)) }); } };
  const pit = (x0, x1) => T.pits.push({ x0: Math.round(x0), x1: Math.round(x1) });
  const bound = dy => { if (gy + dy < 250 || gy + dy > 560) return -dy; return dy; };
  // yükselmeden önce yer aç (zemin y 250..560 aralığında kalsın)
  const roomUp = h => { if (gy - h >= 250) return; const dn = Math.min(560, 250 + h + R(20, 80)) - gy; if (dn > 0) { const l = Math.max(160, dn / .4); seg(x, x + l, gy, gy + dn, iceFlag()); x += l; gy += dn; flat(80); } };
  const roomDown = h => { if (gy + h <= 560) return; const up = gy - Math.max(250, 560 - h - R(20, 60)); if (up > 0) { const l = Math.max(180, up / .38); seg(x, x + l, gy, gy - up, iceFlag()); x += l; gy -= up; flat(80); } };
  const breather = (a, b) => {
    const len = Math.round(R(a, b));
    const x0 = x;
    if (x0 - lastCp > 1100 && len >= 120) { T.cps.push({ x: Math.round(x0 + 40), y: gy }); lastCp = x0; }
    if (x0 - lastBox > R(1700, 2200) && len >= 110) { T.boxes.push({ id: id(), x: Math.round(x0 + len * .55), y: gy - 58 }); lastBox = x0; }
    else if (len > 200 && rng() < .55) coinLine(x0 + 50, Math.min(6, Math.floor((len - 80) / 38)), gy - 40);
    flat(len);
  };
  const C = {
    gap() {
      const w = R(110, 140 + 55 * d), dy = bound(CH([0, 0, -30, 30, -50, 40]));
      flat(60); const x0 = x; x += w; pit(x0, x); coinArc(x0 - 20, x + 20, gy - 40, 90); gy += dy; flat(R(160, 220));
    },
    dgap() {
      const w = R(250, 295), x0 = x0f();
      if (rng() < .5) { T.plats.push({ id: id(), x: Math.round(x0 + w / 2 - 40), y: gy - 50, w: 80, mv: null }); coinLine(x0 + w / 2 - 30, 2, gy - 90); }
      else coinArc(x0, x0 + w, gy - 60, 160);
      x = x0 + w; pit(x0, x); flat(R(200, 260));
    },
    hill() {
      const up = R(70, 120), lu = R(220, 300), top = R(100, 220);
      roomUp(up);
      seg(x, x + lu, gy, gy - up, iceFlag()); x += lu; gy -= up;
      coinLine(x + 20, Math.floor(top / 40), gy - 40);
      flat(top);
      const ld = R(220, 320); seg(x, x + ld, gy, gy + up, iceFlag()); x += ld; gy += up;
      T.parExtra += .12;
    },
    iceslope() {
      // uzun buzlu iniş: hız kazanır, sonda küçük bir çukur
      if (gy > 420) { const up = 140; seg(x, x + 360, gy, gy - up, { ice: true }); x += 360; gy -= up; }
      flat(80);
      const dn = R(140, 190), len = R(420, 520);
      roomDown(dn); seg(x, x + len, gy, gy + dn, { ice: true }); x += len; gy += dn;
      coinLine(x - len + 60, 6, gy - dn * .5 - 50, 60);
      flat(120); const x0 = x, w = R(120, 170); x += w; pit(x0, x); coinArc(x0, x, gy - 40, 100); flat(220);
    },
    stepup() {
      const h = R(60, 100);
      roomUp(h);
      flat(40); gy -= h; flat(R(220, 400));
      if (rng() < .5) { const h2 = R(50, 90); gy += h2; flat(R(160, 240)); }
      T.parExtra += .1;
    },
    crates() {
      flat(60);
      const pat = CH(['one', 'two', 'stair', 'pair']);
      const S = 54;
      const box = (bx, n) => { for (let k = 0; k < n; k++) T.blocks.push({ id: id(), x: Math.round(bx), y: gy - S * (k + 1), w: S, h: S, k: 'crate' }); };
      if (pat === 'one') { box(x + 40, 1); coinLine(x + 40, 2, gy - S - 40, 30); flat(240); }
      else if (pat === 'two') { box(x + 40, 2); coinLine(x + 46, 2, gy - 2 * S - 40, 30); flat(280); }
      else if (pat === 'stair') { box(x + 40, 1); box(x + 40 + S, 2); coinLine(x + 60, 3, gy - 3 * S, 40); flat(320); }
      else { box(x + 40, 1); box(x + 300, 1); flat(480); }
      T.parExtra += .08;
    },
    spikes() {
      flat(R(80, 140));
      const w = Math.round(R(60, 100 + 40 * d));
      T.haz.push({ id: id(), k: 'spike', x: Math.round(x + 10), y: gy, w });
      coinArc(x - 30, x + w + 50, gy - 40, 100);
      flat(w + R(160, 220));
    },
    bar() {
      flat(R(80, 140));
      const w = Math.round(R(90, 200 + 60 * d));
      T.blocks.push({ id: id(), x: Math.round(x + 20), y: gy - 360, w, h: 360 - 38, k: 'bar' });
      coinLine(x + 30, Math.max(2, Math.floor(w / 40)), gy - 16, 38);
      flat(w + R(160, 240));
      if (rng() < .35 * (0.5 + d)) { const S = 54; T.blocks.push({ id: id(), x: Math.round(x - 60), y: gy - S, w: S, h: S, k: 'crate' }); flat(200); }
    },
    springwall() {
      flat(100);
      T.haz.push({ id: id(), k: 'spring', x: Math.round(x + 30), y: gy, w: 46 });
      flat(130);
      const h = R(190, 250);
      if (gy - h < 250) { T.haz.pop(); T.segs.pop(); T.segs.pop(); x -= 230; roomUp(h); flat(100); T.haz.push({ id: id(), k: 'spring', x: Math.round(x + 30), y: gy, w: 46 }); flat(130); }
      gy -= h; flat(R(260, 420));
      coinArc(x - 380, x - 120, gy + h - 60, 260);
      // aşağı iniş: yokuş ya da düşüş
      if (rng() < .5) { const ld = R(260, 360); seg(x, x + ld, gy, gy + h * .8, iceFlag()); x += ld; gy += h * .8; }
      else { gy += h * .7; flat(40); }
      gy = Math.round(gy);
    },
    plathop() {
      const n = RI(2, 3), moving = rng() < (world === 'seker' || world === 'gece' || world === 'volkan' ? .7 : .35);
      flat(60); const x0 = x; let px = x0, py = gy;
      for (let i = 0; i < n; i++) {
        px += R(110, 150); py = clamp(py + CH([-60, -40, 0, 30]), gy - 120, gy + 20);
        const w = Math.round(R(120, 170));
        const p = { id: id(), x: Math.round(px), y: Math.round(py), w, mv: null };
        if (moving) p.mv = { dx: 0, dy: Math.round(R(22, 36)), p: R(2.2, 3.2), ph: R(0, TAU) };
        T.plats.push(p); coinLine(px + 20, Math.floor(w / 42), py - 40);
        px += w;
      }
      px += R(110, 140);
      x = px; pit(x0, x); gy = clamp(Math.round(py + CH([0, 20, 40])), 250, 560); flat(R(200, 260));
    },
    mover() {
      // yatay salınan tek platform: zamanlama
      flat(60); const x0 = x, w = Math.round(R(150, 180)), gapw = R(330, 380);
      const p = { id: id(), x: Math.round(x0 + gapw / 2 - w / 2), y: gy - 10, w, mv: { dx: Math.round(R(35, 55)), dy: 0, p: R(2.4, 3.2), ph: R(0, TAU) } };
      T.plats.push(p); coinLine(p.x + 30, 3, p.y - 40);
      x = x0 + gapw; pit(x0, x); flat(R(200, 260));
    },
    hammer() {
      flat(R(100, 160));
      const L2 = 238, px = x + 120;
      T.haz.push({ id: id(), k: 'hammer', x: Math.round(px), y: gy - 300, len: L2, a: 1.05, p: R(2.1, 2.7), ph: R(0, TAU), gy });
      flat(R(380, 460));
    },
    log() {
      const len = Math.round(R(560, 760)), x0 = x;
      flat(len);
      const n = rng() < .4 + d * .4 ? 2 : 1, v = R(120, 170);
      for (let k = 0; k < n; k++) T.haz.push({ id: id(), k: 'log', xa: x0 + 20, xb: x0 + len - 20, y: gy, r: 24, v, ph: (len - 40) * (k / n) + R(0, 80) });
      T.parExtra += .05;
    },
    mud() {
      flat(80);
      const w = Math.round(R(260, 420)), x0 = x;
      T.haz.push({ id: id(), k: 'mud', x: x0, y: gy, w });
      // kısayol: çamurun üstünde atlanarak geçilen platformlar
      const n = Math.max(2, Math.round(w / 170));
      for (let i = 0; i < n; i++) {
        const pw = 110, px = x0 - 30 + i * (w / n) + 10;
        T.plats.push({ id: id(), x: Math.round(px), y: gy - 105, w: pw, mv: null });
        coinLine(px + 20, 2, gy - 145, 40);
      }
      flat(w + 160);
      T.parExtra += (w / PH.V) * .45;
    },
    pad() {
      flat(60);
      T.haz.push({ id: id(), k: 'pad', x: Math.round(x), y: gy, w: 120 });
      coinLine(x + 140, 6, gy - 40, 44);
      flat(R(380, 520));
      T.parExtra -= .25;
    },
    conv() {
      flat(60);
      const w = Math.round(R(300, 480)), back = rng() < .5;
      T.haz.push({ id: id(), k: 'conv', x: Math.round(x), y: gy, w, v: back ? -150 : 170 });
      if (back) { // geri bant: üstünden platform kısayolu
        T.plats.push({ id: id(), x: Math.round(x + 40), y: gy - 110, w: Math.round(w - 80), mv: null });
        coinLine(x + 60, Math.floor((w - 100) / 40), gy - 150);
        T.parExtra += (w / PH.V) * .3;
      } else { coinLine(x + 20, Math.floor(w / 44), gy - 40, 44); T.parExtra -= .15; }
      flat(w + 160);
    },
    bridge() {
      // çöken köprü: üstünden geçen koşucunun altında tahtalar düşer, durursan sen de düşersin
      flat(80); const x0 = x, n = RI(7, 10), pw = 46;
      for (let i = 0; i < n; i++) T.plats.push({ id: id(), x: x0 + i * pw, y: gy, w: pw - 2, mv: null, br: 1 });
      coinLine(x0 + 20, Math.floor(n * pw / 46), gy - 40, 46);
      x = x0 + n * pw; pit(x0, x); flat(R(200, 260));
    },
    lanes() {
      // iki katlı rota: altta engeller, üstte altınlı ve kutulu platformlar
      flat(80); const x0 = x, len = Math.round(R(900, 1250)), py = gy - 118;
      let px = x0 + 110;
      while (px < x0 + len - 220) { const w = Math.round(R(170, 240)); T.plats.push({ id: id(), x: Math.round(px), y: py, w, mv: null }); coinLine(px + 22, Math.floor((w - 20) / 42), py - 40); px += w + R(70, 110); }
      T.boxes.push({ id: id(), x: Math.round(x0 + len * .45), y: py - 58 }); lastBox = x0;
      let ox = x0 + 200;
      while (ox < x0 + len - 260) {
        if (rng() < .45) T.haz.push({ id: id(), k: 'spike', x: Math.round(ox), y: gy, w: Math.round(R(56, 84)) });
        else if (rng() < .5) T.blocks.push({ id: id(), x: Math.round(ox), y: gy - 54, w: 54, h: 54, k: 'crate' });
        else T.haz.push({ id: id(), k: 'mud', x: Math.round(ox - 20), y: gy, w: Math.round(R(140, 200)) });
        ox += R(280, 360);
      }
      flat(len + 140);
      T.parExtra += .1;
    },
    lowg() {
      // düşük yerçekimi bölgesi: süzülerek uzun bir boşluğu aş
      flat(120); const x0 = x - 60, w = Math.round(R(380, 470)), zw = Math.round(w + 360);
      T.haz.push({ id: id(), k: 'lowg', x: x0, y: gy, w: zw });
      flat(60); const g0 = x; x += w; pit(g0, x);
      coinArc(g0 - 20, x + 20, gy - 60, 260);
      gy = clamp(gy + CH([0, -40, 30]), 250, 560); flat(R(240, 300));
    },
    rocks() {
      // volkandan düşen kayalar: gölgeyi izle, zamanla
      flat(100); const n = RI(2, 3), x0 = x;
      for (let i = 0; i < n; i++) T.haz.push({ id: id(), k: 'rock', x: Math.round(x0 + 80 + i * R(170, 220)), y: gy, w: 40, p: R(2.2, 2.9), ph: R(0, 3), h: 520 });
      coinLine(x0 + 60, 6, gy - 40, 60);
      flat(120 + n * 220 + 100);
    },
    geyser() {
      flat(100);
      const n = RI(1, 3), x0 = x;
      for (let i = 0; i < n; i++) T.haz.push({ id: id(), k: 'geyser', x: Math.round(x0 + 60 + i * 260), y: gy, w: 44, h: 175, p: R(2.4, 3), on: .7, ph: R(0, 3) });
      flat(80 + n * 260 + 120);
    }
  };
  const x0f = () => { flat(60); return x; };
  // başlangıç
  flat(700);
  T.cps.push({ x: START_X, y: gy }); lastCp = 0;
  const weights = CHUNK_W[world];
  const kinds = Object.keys(weights);
  const tot = kinds.reduce((a, k) => a + weights[k], 0);
  let prev = '';
  while (x < L - 900) {
    d = clamp(x / L, 0, 1);
    let k;
    for (let tries = 0; tries < 6; tries++) {
      let r = rng() * tot; k = kinds[0];
      for (const kk of kinds) { r -= weights[kk]; if (r <= 0) { k = kk; break; } }
      if (k !== prev) break;
    }
    prev = k;
    C[k]();
    breather(140 - 40 * d, 300 - 120 * d);
  }
  // bitiş
  breather(300, 320);
  flat(260);
  T.len = Math.round(x + 120);
  flat(1300);
  T.endX = x;
  // dekor (çarpışmasız süsler) düz zeminlerde
  let dx = 200;
  while (dx < x) {
    const s = segAtX(T.segs, dx);
    if (s && s.y0 === s.y1) T.deco.push({ x: Math.round(dx), y: s.y0, k: RI(0, 5), s: R(.8, 1.25), f: rng() < .5 ? 1 : 0 });
    dx += R(110, 300);
  }
  T.deathY = Math.max(...T.segs.map(s => Math.max(s.y0, s.y1))) + 340;
  T.minMs = Math.round((T.len - START_X) / 760 * 1000);
  T.par = Math.round((((T.len - START_X) / PH.V) + T.parExtra) * 1000 + 1500);
  buildIndex(T);
  return T;
}
function segAtX(segs, x) { for (const s of segs) if (x >= s.x0 && x < s.x1) return s; return null; }
const segTop = (s, x) => s.y0 === s.y1 ? s.y0 : s.y0 + (s.y1 - s.y0) * clamp((x - s.x0) / (s.x1 - s.x0), 0, 1);
function platPos(p, t) {
  if (!p.mv) return [p.x, p.y];
  const s = Math.sin(TAU * t / p.mv.p + p.mv.ph);
  return [p.x + p.mv.dx * s, p.y + p.mv.dy * s];
}
function hammerHead(h, t) { const a = h.a * Math.sin(TAU * t / h.p + h.ph); return [h.x + h.len * Math.sin(a), h.y + h.len * Math.cos(a), a]; }
function logPos(h, t) { const span = h.xb - h.xa; const u = ((t * h.v + h.ph) % span + span) % span; return h.xb - u; }
function geyserOn(h, t) { const u = ((t + h.ph) % h.p + h.p) % h.p; return u < h.on ? u / h.on : 0; }   // 0 = kapalı, 0..1 fışkırma evresi
function buildIndex(T) {
  const n = Math.ceil((T.endX + 400) / BK) + 1;
  const B = Array.from({ length: n }, () => ({ segs: [], blocks: [], plats: [], haz: [], coins: [], boxes: [] }));
  const put = (arr, o, x0, x1) => { const a = clamp(Math.floor(x0 / BK), 0, n - 1), b = clamp(Math.floor(x1 / BK), 0, n - 1); for (let k = a; k <= b; k++) B[k][arr].push(o); };
  T.segs.forEach(s => put('segs', s, s.x0 - 40, s.x1 + 40));
  T.blocks.forEach(b => put('blocks', b, b.x - 40, b.x + b.w + 40));
  T.plats.forEach(p => { const dx = p.mv ? Math.abs(p.mv.dx) : 0; put('plats', p, p.x - dx - 40, p.x + p.w + dx + 40); });
  T.haz.forEach(h => {
    if (h.k === 'hammer') put('haz', h, h.x - h.len - 60, h.x + h.len + 60);
    else if (h.k === 'log') put('haz', h, h.xa - 60, h.xb + 60);
    else if (h.k === 'lowg') put('haz', h, h.x - 20, h.x + h.w + 20);
    else put('haz', h, h.x - 60, h.x + (h.w || 40) + 60);
  });
  T.coins.forEach(c => put('coins', c, c.x - 30, c.x + 30));
  T.boxes.forEach(b => put('boxes', b, b.x - 40, b.x + 40));
  T.B = B;
}
const bucket = (T, x) => T.B[clamp(Math.floor(x / BK), 0, T.B.length - 1)];
// çöken köprü: her koşucunun kendi tahta durumu (r.br: tahta id → ilk basış anı)
const BR_FALL = .5, BR_BACK = 4.5;
const plankGone = (r, p, t) => { if (!r.br) return false; const t0 = r.br.get(p.id); return t0 != null && t - t0 > BR_FALL && t - t0 < BR_BACK; };
function rockY(h, t) { const u = ((t + h.ph) % h.p + h.p) % h.p, fd = Math.sqrt(2 * h.h / 1500); return u < fd ? { y: h.y - h.h + 750 * u * u, u, fd, falling: true } : { y: h.y, u, fd, falling: false }; }

/* ------------------------------------------------------------------ koşucu */
function newRunner(T) {
  return {
    x: START_X, y: T.cps[0].y, vx: 0, vy: 0, gnd: true, gref: null, jl: 1, coy: 0, buf: 0, jh: false, slh: false, sl: false, jmp: false,
    h: PH.HS, stun: 0, slow: 0, stuck: 0, turbo: 0, spring: 0, pad: 0, pull: 0, slip: 0, inv: 0, shield: false,
    cpx: START_X, cpy: T.cps[0].y, cpi: 0, fin: false, finT: 0, ice: false, mud: false, conv: 0, blocked: false,
    hits: 0, falls: 0, jumps: 0, land: 0, air: 0, slope: 0, dj: 0, launch: 0, chick: 0, mag: 0, lowg: false, br: new Map()
  };
}
// koşucunun gövde kutusu üst sınırı
function canStand(r, T, t) {
  const top = r.y - PH.HS, x0 = r.x - PH.HW, x1 = r.x + PH.HW;
  for (const b of bucket(T, r.x).blocks) if (x1 > b.x && x0 < b.x + b.w && top < b.y + b.h && r.y - 1 > b.y) return false;
  return true;
}
// ayakların altındaki en yüksek yüzey (y aralığı [ya, yb]); { y, ref, ice }
function support(r, T, t, ya, yb, prevY, airborne) {
  const fx0 = r.x - PH.HW * .7, fx1 = r.x + PH.HW * .7;
  let best = null;
  const B = bucket(T, r.x);
  for (let k = 0; k < B.segs.length; k++) {
    const s = B.segs[k];
    if (fx1 < s.x0 || fx0 > s.x1) continue;
    const top = segTop(s, clamp(r.x, s.x0, s.x1));
    if (top >= ya && top <= yb && (!best || top < best.y)) best = { y: top, ref: s, ice: !!s.ice, slope: (s.y1 - s.y0) / (s.x1 - s.x0) };
  }
  for (let k = 0; k < B.blocks.length; k++) {
    const b = B.blocks[k];
    if (fx1 < b.x || fx0 > b.x + b.w) continue;
    if (b.y >= ya && b.y <= yb && (!best || b.y < best.y)) best = { y: b.y, ref: b, ice: false, slope: 0 };
  }
  for (let k = 0; k < B.plats.length; k++) {
    const p = B.plats[k];
    let px = p.x, py = p.y, qy = p.y;
    if (p.mv) { const a = TAU / p.mv.p, sn = Math.sin(a * t + p.mv.ph); px += p.mv.dx * sn; py += p.mv.dy * sn; if (airborne && p.mv.dy) qy += p.mv.dy * Math.sin(a * (t - DT) + p.mv.ph); }
    if (fx1 < px || fx0 > px + p.w) continue;
    if (p.br && plankGone(r, p, t)) continue;
    if (airborne && prevY > qy + 3) continue;       // tek yönlü: yalnız yukarıdan
    if (py >= ya && py <= yb && (!best || py < best.y)) best = { y: py, ref: p, ice: false, slope: 0 };
  }
  return best;
}
function hurt(r, kind, out) {
  r.hits++; r.inv = 1.4; r.sl = false;
  if (kind === 'spike') { respawn(r, out, 'spike'); return; }
  if (kind === 'hammer') { r.vx = -220; r.vy = -460; r.gnd = false; r.gref = null; r.stun = .9; }
  else if (kind === 'log') { r.vx = -120; r.vy = -320; r.gnd = false; r.gref = null; r.stun = .75; }
  else if (kind === 'geyser') { r.vx = 0; r.vy = -640; r.gnd = false; r.gref = null; r.stun = .8; }
  else if (kind === 'rock') { r.vx = -140; r.vy = -360; r.gnd = false; r.gref = null; r.stun = .85; }
  out && out.push({ k: 'hurt', why: kind });
}
function respawn(r, out, why) {
  r.x = r.cpx; r.y = r.cpy; r.vx = 0; r.vy = 0; r.gnd = true; r.gref = null; r.jmp = false; r.sl = false;
  r.stun = .9; r.inv = 1.8; r.slip = 0; r.pull = 0; r.stuck = 0; r.launch = 0; r.falls++;
  if (r.br) r.br.clear();               // köprü tahtaları bu koşucu için yeniden kurulur
  out && out.push({ k: 'respawn', why });
}
// Etki uygula (güçler); kalkan kararı yönetende verilir
function applyFx(r, kind) {
  if (r.fin) return;
  if (kind === 'turbo') r.turbo = 2.4;
  else if (kind === 'slow') r.slow = 3;
  else if (kind === 'stuck') { r.stuck = 1.2; r.sl = false; }
  else if (kind === 'stun') { r.stun = Math.max(r.stun, 1.1); r.inv = Math.max(r.inv, 1.3); r.sl = false; }
  else if (kind === 'pull') { r.pull = .55; }
  else if (kind === 'spring') r.spring = 5;
  else if (kind === 'slip') { r.slip = .9; r.inv = Math.max(r.inv, 1.2); r.sl = false; }
  else if (kind === 'launch') { r.launch = 1; r.vy = -1050; r.vx = Math.min(r.vx, 80); r.gnd = false; r.gref = null; r.sl = false; r.inv = Math.max(r.inv, 1.4); }
  else if (kind === 'chick') { r.chick = 3; r.sl = false; }
  else if (kind === 'mag') r.mag = 6;
}
// Işınlan: ~650 birim ileride güvenli bir zemine taşı (çukur ya da kutu içine değil)
function teleport(r, T, t, dist) {
  if (r.fin) return false;
  let x = Math.min(r.x + (dist || 650), T.len - 60);
  for (let k = 0; k < 80; k++, x += 20) {
    const s = support({ x }, T, t, -1e4, 1e4, 0, false);
    if (!s || !s.ref || s.ref.x0 == null) continue;              // yalnız gerçek zemin
    if (bucket(T, x).blocks.some(b => x + PH.HW > b.x && x - PH.HW < b.x + b.w && s.y > b.y && s.y - PH.HS < b.y + b.h)) continue;
    if (bucket(T, x).haz.some(h => h.k === 'spike' && x + PH.HW + 30 > h.x && x - PH.HW - 30 < h.x + h.w)) continue;
    r.x = x; r.y = s.y; r.vy = 0; r.gnd = true; r.gref = s.ref; r.sl = false; r.inv = Math.max(r.inv, .8); r.stun = 0; r.slip = 0;
    return true;
  }
  return false;
}

/* Tek fizik adımı. inp: { j: zıpla basılı, s: kay basılı }. t: yarış saati (sn).
   dyn: { traps, coins:Set, boxes:Set, slipped:Set, me, plan } · out: olay listesi */
function step(r, inp, T, t, dyn, out, dtA) {
  const dt = dtA || DT;               // deneme simülasyonları (bot planları) 60 Hz kullanır; gerçek fizik hep 120 Hz
  if (r.fin) {
    r.vx = Math.max(0, r.vx - 500 * dt); r.x += r.vx * dt;
    const s = support(r, T, t, r.y - 40, r.y + 60, r.y, false);
    if (s) { r.y = s.y; r.gnd = true; r.vy = 0; } else { r.vy = Math.min(PH.VFALL, r.vy + PH.G * dt); r.y += r.vy * dt; if (r.y > T.deathY) r.y = T.deathY; }
    r.sl = false; r.h = PH.HS; return;
  }
  r.stun = Math.max(0, r.stun - dt); r.slow = Math.max(0, r.slow - dt); r.stuck = Math.max(0, r.stuck - dt);
  r.turbo = Math.max(0, r.turbo - dt); r.spring = Math.max(0, r.spring - dt); r.pad = Math.max(0, r.pad - dt);
  r.pull = Math.max(0, r.pull - dt); r.slip = Math.max(0, r.slip - dt); r.inv = Math.max(0, r.inv - dt);
  r.land = Math.max(0, r.land - dt);
  r.launch = Math.max(0, r.launch - dt); r.chick = Math.max(0, r.chick - dt); r.mag = Math.max(0, r.mag - dt);
  const ctrl = r.stun <= 0 && r.stuck <= 0 && r.slip <= 0 && r.pull <= 0 && r.launch <= 0;
  const jp = !!inp.j && !r.jh; r.jh = !!inp.j;
  const sp = !!inp.s && !r.slh; r.slh = !!inp.s;
  if (jp && ctrl) r.buf = PH.BUF; else r.buf = Math.max(0, r.buf - dt);
  if (r.gnd) { r.coy = PH.COY; r.jl = 1; r.air = 0; } else { r.coy = Math.max(0, r.coy - dt); r.air += dt; }
  const jv = (r.spring > 0 ? 1.3 : 1) * (r.chick > 0 ? .85 : 1);
  const grav = r.lowg ? .42 : 1, vfall = r.lowg ? 620 : PH.VFALL;
  if (ctrl && r.buf > 0 && (r.gnd || r.coy > 0)) {
    if (canStand(r, T, t) || !r.sl) {
      r.vy = -PH.VJ * jv; r.gnd = false; r.gref = null; r.coy = 0; r.buf = 0; r.sl = false; r.jmp = true; r.jumps++;
      out && out.push({ k: 'jump' });
    }
  } else if (ctrl && jp && !r.gnd && r.jl > 0) {
    r.vy = -PH.VJ2 * jv; r.jl--; r.buf = 0; r.jmp = true; r.jumps++; r.dj = .35;
    out && out.push({ k: 'jump2' });
  }
  r.dj = Math.max(0, r.dj - dt);
  if (r.jmp && !inp.j && r.vy < PH.CUT) r.vy = PH.CUT;
  if (r.vy >= 0) r.jmp = false;
  // kayma / hızlı iniş
  if (ctrl && inp.s && r.gnd) { if (!r.sl) out && out.push({ k: 'slide' }); r.sl = true; }
  else if (r.sl && (!inp.s || !r.gnd || !ctrl)) { if (canStand(r, T, t)) r.sl = false; }
  if (ctrl && sp && !r.gnd && r.vy > -250) { r.vy = Math.max(r.vy, PH.FASTFALL); out && out.push({ k: 'ff' }); }
  r.h = r.sl ? PH.HL : PH.HS;
  // yatay hedef hız
  let tv = PH.V;
  if (r.turbo > 0) tv *= 1.55;
  if (r.pad > 0) tv *= 1.4;
  if (r.slow > 0) tv *= .6;
  if (r.chick > 0) tv *= .68;
  if (r.gnd && r.mud) tv *= .55;
  if (r.gnd) tv *= r.slope < 0 ? 1 + r.slope * .7 : 1 + r.slope * .45;
  if (r.sl && r.gnd) tv *= r.ice ? 1.1 : .98;
  if (r.stun > 0 || r.stuck > 0) tv = 0;
  if (r.slip > 0) tv = 150;
  if (r.pull > 0) tv = -300;
  if (r.launch > 0) tv = 60;
  const acc = (r.pull > 0 || r.stun > 0 || r.stuck > 0) ? 2600 : r.gnd ? (r.ice ? PH.ACC_ICE : PH.ACC) : PH.ACC_AIR;
  const dv = tv - r.vx; r.vx += dv > acc * dt ? acc * dt : dv < -acc * dt ? -acc * dt : dv;
  if (!r.gnd) r.vy = Math.min(vfall, r.vy + PH.G * grav * dt);
  // taşıyıcılar
  let cx = 0, cy = 0;
  if (r.gnd && r.gref && r.gref.mv) { const a = platPos(r.gref, t), b = platPos(r.gref, t - dt); cx = a[0] - b[0]; cy = a[1] - b[1]; }
  if (r.gnd && r.conv) cx += r.conv * dt;
  // X hareketi
  const ox = r.x; let nx = r.x + r.vx * dt + cx;
  r.blocked = false;
  const B = bucket(T, nx);
  const top = r.y - r.h + 2, bot = r.y - 2;
  if (nx > ox) {
    for (const b of B.blocks) {
      if (bot <= b.y || top >= b.y + b.h) continue;
      if (ox + PH.HW <= b.x + .01 && nx + PH.HW > b.x) {
        if (b.y >= r.y - PH.STEP && b.y <= r.y) continue;
        nx = b.x - PH.HW; r.blocked = true;
      }
    }
    for (const s of B.segs) {
      if (ox + PH.HW <= s.x0 + .01 && nx + PH.HW > s.x0 && r.y > s.y0 + PH.STEP) { nx = Math.min(nx, s.x0 - PH.HW); r.blocked = true; }
    }
  } else if (nx < ox) {
    for (const b of B.blocks) {
      if (bot <= b.y || top >= b.y + b.h) continue;
      if (ox - PH.HW >= b.x + b.w - .01 && nx - PH.HW < b.x + b.w) { if (b.y >= r.y - PH.STEP && b.y <= r.y) continue; nx = b.x + b.w + PH.HW; r.blocked = true; }
    }
    for (const s of B.segs) {
      if (ox - PH.HW >= s.x1 - .01 && nx - PH.HW < s.x1 && r.y > s.y1 + PH.STEP) { nx = Math.max(nx, s.x1 + PH.HW); r.blocked = true; }
    }
  }
  if (r.blocked && r.vx > 0 && nx <= ox + .001) r.vx = 0;
  if (r.blocked && r.vx < 0 && nx >= ox - .001) r.vx = 0;
  r.x = nx;
  // Y hareketi
  const oy = r.y;
  if (r.gnd) {
    r.y += cy;
    const s = support(r, T, t, r.y - PH.STEP, r.y + PH.SNAP, oy, false);
    if (s) { r.y = s.y; r.gref = s.ref; r.ice = s.ice; r.slope = s.slope; }
    else { r.gnd = false; r.gref = null; r.vy = Math.max(0, r.vy); r.slope = 0; out && out.push({ k: 'off' }); }
    if (r.gnd && r.gref && r.gref.br && dyn && !dyn.plan) {      // çöken köprü tahtasına bastı
      const t0 = r.br.get(r.gref.id);
      if (t0 == null || t - t0 >= BR_BACK) { r.br.set(r.gref.id, t); out && out.push({ k: 'plank', id: r.gref.id }); }
    }
  } else {
    const ny = r.y + r.vy * dt;
    if (r.vy >= 0) {
      const s = support(r, T, t, oy - 1, ny + .01, oy, true);
      if (s) {
        if (r.vy > 500) r.land = .16;
        out && out.push({ k: 'land', v: r.vy });
        r.y = s.y; r.vy = 0; r.gnd = true; r.gref = s.ref; r.ice = s.ice; r.slope = s.slope; r.jmp = false;
      } else r.y = ny;
    } else {
      let ceil = null;
      const x0 = r.x - PH.HW, x1 = r.x + PH.HW;
      for (const b of bucket(T, r.x).blocks) {
        if (x1 <= b.x || x0 >= b.x + b.w) continue;
        const bb = b.y + b.h;
        if (oy - r.h >= bb - .5 && ny - r.h < bb && (ceil == null || bb > ceil)) ceil = bb;
      }
      if (ceil != null) { r.y = ceil + r.h; r.vy = 0; r.jmp = false; out && out.push({ k: 'bonk' }); }
      else r.y = ny;
    }
  }
  if (r.y > T.deathY) { respawn(r, out, 'pit'); r.hits++; return; }
  // tetikleyiciler
  r.mud = false; r.conv = 0; r.lowg = false;
  const bx0 = r.x - PH.HW + 3, bx1 = r.x + PH.HW - 3, by0 = r.y - r.h + 3, by1 = r.y;
  const B2 = bucket(T, r.x);
  for (const h of B2.haz) {
    switch (h.k) {
      case 'spike':
        if (r.inv <= 0 && bx1 > h.x + 4 && bx0 < h.x + h.w - 4 && by1 > h.y - 18) { hurt(r, 'spike', out); return; }
        break;
      case 'hammer': {
        if (r.inv > 0) break;
        const [hx, hy] = hammerHead(h, t);
        const qx = clamp(hx, bx0, bx1), qy = clamp(hy, by0, by1);
        if ((qx - hx) ** 2 + (qy - hy) ** 2 < 28 * 28) hurt(r, 'hammer', out);
        break;
      }
      case 'log': {
        if (r.inv > 0) break;
        const lx = logPos(h, t), ly = h.y - h.r;
        const qx = clamp(lx, bx0, bx1), qy = clamp(ly, by0, by1);
        if ((qx - lx) ** 2 + (qy - ly) ** 2 < (h.r - 3) * (h.r - 3)) hurt(r, 'log', out);
        break;
      }
      case 'geyser': {
        if (r.inv > 0) break;
        const on = geyserOn(h, t);
        if (on > 0 && bx1 > h.x - h.w / 2 + 6 && bx0 < h.x + h.w / 2 - 6 && by0 < h.y && by1 > h.y - h.h * Math.min(1, on * 4)) hurt(r, 'geyser', out);
        break;
      }
      case 'rock': {
        if (r.inv > 0) break;
        const q = rockY(h, t); if (!q.falling) break;
        const qx = clamp(h.x, bx0, bx1), qy = clamp(q.y - 20, by0, by1);
        if ((qx - h.x) ** 2 + (qy - q.y + 20) ** 2 < 22 * 22) hurt(r, 'rock', out);
        break;
      }
      case 'lowg': if (r.x > h.x && r.x < h.x + h.w) r.lowg = true; break;
      case 'mud': if (r.gnd && r.x > h.x && r.x < h.x + h.w && Math.abs(r.y - h.y) < 3) r.mud = true; break;
      case 'pad': if (r.gnd && r.x > h.x && r.x < h.x + h.w && Math.abs(r.y - h.y) < 3) { if (r.pad <= 0) out && out.push({ k: 'pad' }); r.pad = 1.1; } break;
      case 'conv': if (r.gnd && r.x > h.x && r.x < h.x + h.w && Math.abs(r.y - h.y) < 3) r.conv = h.v; break;
      case 'spring':
        if (r.vy >= 0 && r.x + PH.HW * .6 > h.x && r.x - PH.HW * .6 < h.x + h.w && r.y >= h.y - 22 && r.y <= h.y + 2) {
          r.vy = -PH.SPRING; r.gnd = false; r.gref = null; r.sl = false; r.jmp = false; r.jl = 1;
          out && out.push({ k: 'spring', id: h.id });
        }
        break;
      default: break;
    }
  }
  if (dyn) {
    if (dyn.traps && r.inv <= 0 && r.slip <= 0) {
      for (const tr of dyn.traps) {
        if (tr.by === dyn.me || (dyn.slipped && dyn.slipped.has(tr.id))) continue;
        if (bx1 > tr.x - 16 && bx0 < tr.x + 16 && by1 > tr.y - 14 && by0 < tr.y) {
          if (dyn.slipped) dyn.slipped.add(tr.id);
          if (!r.shield) applyFx(r, 'slip');
          out && out.push({ k: 'trap', id: tr.id });
          break;
        }
      }
    }
    if (!dyn.plan) {
      if (dyn.coins) {
        const mg = r.mag > 0, B3 = mg ? [B2, bucket(T, r.x + BK * .6), bucket(T, r.x - BK * .6)] : [B2];
        for (const BB of B3) for (const c of BB.coins) {
          if (dyn.coins.has(c.id)) continue;
          const hit = mg ? (c.x - r.x) ** 2 + (c.y - r.y + 30) ** 2 < 200 * 200 : Math.abs(c.x - r.x) < 24 && c.y > r.y - r.h - 16 && c.y < r.y + 12;
          if (hit) { dyn.coins.add(c.id); out && out.push({ k: 'coin', id: c.id, x: c.x, y: c.y, mag: mg }); }
        }
      }
      if (dyn.boxes && !dyn.noBox) for (const b of B2.boxes) { if (!dyn.boxes.has(b.id) && Math.abs(b.x - r.x) < 34 && b.y > r.y - r.h - 22 && b.y < r.y + 22) { dyn.boxes.add(b.id); out && out.push({ k: 'box', id: b.id }); } }
    }
  }
  while (r.cpi + 1 < T.cps.length && r.x >= T.cps[r.cpi + 1].x) { r.cpi++; r.cpx = T.cps[r.cpi].x; r.cpy = T.cps[r.cpi].y; out && out.push({ k: 'cp' }); }
  if (r.x >= T.len) { r.fin = true; r.finT = t; out && out.push({ k: 'fin', t }); }
}

/* ------------------------------------------------------------------ yapay zekâ (bilgisayar ve test otopilotu)
   Her karar anında birkaç girdi planını ileri simüle eder, engele çarpmadan
   en uzağa gideni seçer. Beceri düşükse ara sıra ikinci en iyi planı ya da
   geç tepkiyi seçer.                                                          */
const PLANS_G = [
  ['run', () => 0],
  ['jf0', i => (i < 40 ? 1 : 0)],
  ['jf8', i => (i >= 8 && i < 48 ? 1 : 0)],
  ['jf16', i => (i >= 16 && i < 56 ? 1 : 0)],
  ['jm0', i => (i < 18 ? 1 : 0)],
  ['js0', i => (i < 6 ? 1 : 0)],
  ['js10', i => (i >= 10 && i < 16 ? 1 : 0)],
  ['jd0', i => ((i < 34) || (i >= 40 && i < 76) ? 1 : 0)],
  ['jd12', i => ((i >= 12 && i < 46) || (i >= 52 && i < 88) ? 1 : 0)],
  ['jdq', i => ((i < 20) || (i >= 26 && i < 62) ? 1 : 0)],
  ['sl0', i => (i < 90 ? 2 : 0)],
  ['sl12', i => (i >= 12 && i < 100 ? 2 : 0)]
];
const PLANS_A = [
  ['keep', (i, r0) => (r0.jh && i < 34 ? 1 : 0)],
  ['rel', () => 0],
  ['dj', i => (i >= 1 && i < 36 ? 1 : 0)],
  ['dj10', i => (i >= 10 && i < 46 ? 1 : 0)],
  ['dj20', i => (i >= 20 && i < 56 ? 1 : 0)],
  ['ff', i => (i === 2 ? 2 : 0)]
];
const HORIZON = 132;
function busyAhead(T, r, t, dyn) {
  if (!r.gnd) return true;
  const x0 = r.x - 10, x1 = r.x + 560;
  for (let k = Math.floor(x0 / BK); k <= Math.floor(x1 / BK) && k < T.B.length; k++) {
    const B = T.B[k];
    if (B.blocks.some(b => b.x + b.w > x0 && b.x < x1)) return true;
    if (B.plats.some(p => p.x + p.w + 60 > x0 && p.x - 60 < x1)) return true;
    if (B.haz.some(h => (h.k === 'log' ? h.xb > x0 && h.xa < x1 : h.k === 'hammer' ? h.x + h.len > x0 && h.x - h.len < x1 : h.k !== 'pad' && h.x + (h.w || 40) > x0 && h.x < x1))) return true;
    if (B.segs.some(s => (s.x0 > x0 && s.x0 < x1) || (s.x1 > x0 && s.x1 < x1 && s.x1 > r.x) || (s.y0 !== s.y1 && s.x1 > x0 && s.x0 < x1))) return true;
  }
  if (dyn && dyn.traps && dyn.traps.some(tr => tr.x > x0 - 20 && tr.x < x1)) return true;
  return false;
}
function simPlan(r0, fn, T, t0, dyn) {
  const r = Object.assign({}, r0), out = [];
  if (r0.br && r0.br.size) r.br = new Map(r0.br);    // deneme simülasyonu gerçek köprü durumunu bozmasın
  const d2 = { traps: dyn && dyn.traps, me: dyn && dyn.me, slipped: null, plan: true };
  let lastAct = -1;
  for (let i = 0; i < HORIZON; i++) if (fn(i, r0)) lastAct = i;
  const free = lastAct + 22;             // bu adımdan sonraki sorunlar sonraki kararla çözülebilir
  const opt = i => r.x + (HORIZON - i) * PH.V * DT * .92;
  let pen = 0, could = false;
  const inp = { j: false, s: false };
  for (let i = 0; i < HORIZON; i += 2) {
    const v = fn(i, r0);
    out.length = 0;
    const px = r.x;
    inp.j = v === 1; inp.s = v === 2;
    step(r, inp, T, t0 + i * DT, d2, out, DT * 2);
    if (i > lastAct && (r.gnd || r.jl > 0)) could = true;      // son girdiden sonra yeniden karar verebilir mi?
    for (const e of out) {
      if (e.k === 'hurt' || e.k === 'respawn' || e.k === 'trap') {
        if (i > free && could) return { score: px + (HORIZON - i) * PH.V * DT * .9 - 40, r };
        pen += e.k === 'respawn' ? 2600 : e.k === 'hurt' ? 900 : 500;
        if (e.k === 'respawn') return { score: px - pen, r };
      } else if (e.k === 'off' && i > free && could) {
        if (!support(r, T, t0 + i * DT, r.y, r.y + 420, r.y, false)) return { score: opt(i), r };
      }
    }
    if (r.fin) return { score: 1e6 - i, r };
  }
  let score = r.x - pen;
  if (!r.gnd) {        // havada bitiyorsa altında zemin var mı?
    const s = support(r, T, t0 + HORIZON * DT, r.y - 2, r.y + 900, r.y, false);
    if (!s) score -= 2600;
  }
  if (r.stun > 0) score -= r.stun * 300;
  return { score, r };
}
function makeBot(skill, seed) {
  return { skill, rng: mulberry(seed >>> 0), plan: null, pi: 0, nextAt: 0, cand: 'run' };
}
// Botun bu adımdaki girdisi
function botInput(bot, r, T, t, dyn) {
  if (r.fin) return { j: false, s: false };
  if (t >= bot.nextAt || !bot.plan) {
    bot.nextAt = t + (r.gnd ? .1 : .11) + (1 - bot.skill) * .06 * bot.rng();
    if (!busyAhead(T, r, t, dyn) && r.gnd) { bot.plan = PLANS_G[0][1]; bot.pi = 0; bot.cand = 'run'; }
    else {
      const list = r.gnd ? PLANS_G : PLANS_A;
      // önce "hiçbir şey yapma / devam et": temizse diğer planları hiç deneme (işlemci tasarrufu)
      const first = simPlan(r, list[0][1], T, t, dyn).score;
      const need = r.x + HORIZON * DT * Math.max(150, Math.min(r.vx, PH.V * 1.6)) * .9;
      if (first >= need) { bot.plan = list[0][1]; bot.pi = 0; bot.cand = list[0][0]; bot.r0 = Object.assign({}, r); const v0 = bot.plan(bot.pi++, bot.r0); return { j: v0 === 1, s: v0 === 2 }; }
      // planları sırayla dene; "yeterince iyi" bulununca dur (işlemci tasarrufu), yoksa en iyisini seç
      const res = [{ n: list[0][0], fn: list[0][1], s: first + 3 }];
      for (let k = 1; k < list.length; k++) {
        const s = simPlan(r, list[k][1], T, t, dyn).score;
        res.push({ n: list[k][0], fn: list[k][1], s });
        if (s >= need && bot.skill > .97) break;
        if (s >= need && res.filter(c => c.s >= need).length >= 2) break;
      }
      res.sort((a, b) => b.s - a.s);
      let ch = res[0];
      const sloppy = 1 - bot.skill;
      if (res[1] && bot.rng() < sloppy * .6 && res[1].s > ch.s - 160) ch = res[1];
      if (bot.rng() < sloppy * .16) ch = res[res.length - 1 - Math.floor(bot.rng() * 3)] || ch;
      bot.plan = ch.fn; bot.pi = 0; bot.cand = ch.n; bot.r0 = Object.assign({}, r);
    }
  }
  const v = bot.plan(bot.pi++, bot.r0 || r);
  return { j: v === 1, s: v === 2 };
}

const ENGINE = { DT, PH, START_X, BK, WORLD_IDS, WORLD_INFO, LEN_INFO, teleport, rockY, plankGone, BR_FALL, BR_BACK, genTrack, segTop, platPos, hammerHead, logPos, geyserOn, newRunner, step, applyFx, respawn, makeBot, botInput, simPlan, mulberry, hashStr, bucket, support, canStand };
NS.engine = ENGINE;

/* =================================================================== OYUN (host + arayüz) */
const CFX = GL.CFX;
if (!CFX || !CFX.registerGame) return;
const A = NS.art;
const { esc, Sound, FX, banner, flash } = CFX;
const POWERS = A.POWERS;
const PW_IDS = Object.keys(POWERS);
const FX_OF = { turbo: 'turbo', yay: 'launch', bulut: 'slow', miknatis: 'mag', sakiz: 'stuck', simsek: 'stun', muz: 'slip', kukreme: 'stun', tavuk: 'chick', isinlan: 'tele' };
const PTS = [10, 8, 6, 5, 4, 3];
const COMIC = { slow: 'ŞIP ŞIP!', pull: 'VIIIN!', stuck: 'YAPIŞ!', stun: 'ÇAT!', slip: 'KAYDI!', turbo: 'ZIIIP!', spring: 'BOİNG!', launch: 'BOİNG!', chick: 'GIDAK!', mag: 'VIIIN!', tele: 'VUŞŞ!' };
const trackCache = new Map();
function trackOf(seed, world, len) {
  const k = seed + ':' + world + ':' + (len || 'orta'); let T = trackCache.get(k);
  if (!T) { T = genTrack(seed, world, len); if (trackCache.size > 6) trackCache.clear(); trackCache.set(k, T); }
  return T;
}
// konum defteri: yöneten cihaz güç hedeflerini buradan seçer (hızlı kanal + yerel simülasyon besler)
const book = {};
const SKILL = { kolay: .3, orta: .62, zor: .93 };
const rnd = (a, b) => a + Math.random() * (b - a);

/* =================================================================== YÖNETEN CİHAZ (kurallar) */
function setup(players, opts, ctx) {
  const n = players.length;
  const rng = mulberry((Math.random() * 2 ** 31) >>> 0);
  const st = {
    players: players.map(p => ({ name: p.name, color: p.color, bot: !!p.isBot })),
    look: players.map(p => (p.isBot ? SHOP.botLook(rng) : Object.assign({}, SHOP.DEFAULT_LOOK, { char: SHOP.CHARS[Math.floor(rng() * 4)] }))),
    skill: players.map(() => +clamp(SKILL[opts.zorluk] ? SKILL[opts.zorluk] + rnd(-.08, .08) : rnd(.45, .75), .1, 1).toFixed(2)),
    online: players.map(() => true),
    races: [1, 3, 5].includes(+opts.yaris) ? +opts.yaris : 3,
    worldOpt: WORLD_INFO[opts.parkur] ? opts.parkur : 'rastgele',
    len: LEN_INFO[opts.uzunluk] ? opts.uzunluk : 'orta',
    garage: [20, 30, 45].includes(+opts.garaj) ? +opts.garaj : 30,
    powers: opts.guc !== 'kapali',
    race: 0, phase: 'lobby', world: 'cayir', seed: 1, usedWorlds: [],
    ready: players.map(p => !!p.isBot), lobbyEnd: null,
    startAt: 0, endAt: 0, capAt: 0, firstFin: 0, fin: players.map(() => null),
    pw: players.map(() => null), picked: players.map(() => []), sh: players.map(() => 0),
    traps: [], trapN: 0, pts: players.map(() => 0), tot: players.map(() => 0), wins: players.map(() => 0),
    results: null, resultEnd: 0, nextOk: players.map(() => false), pid: 0, local: ctx.mode === 'local'
  };
  Object.keys(book).forEach(k => delete book[k]);
  startLobby(st, ctx);
  return st;
}
function pname(st, pi) { return st.players[pi] ? st.players[pi].name : '?'; }
function humanIds(st, ctx) { return st.players.map((p, i) => i).filter(i => !st.players[i].bot && (ctx ? ctx.isOnline(i) : st.online[i])); }
function arm(st, ctx) {
  const pid = ++st.pid, now = Date.now();
  let at = 0;
  if (st.phase === 'lobby' && st.lobbyEnd) at = st.lobbyEnd;
  else if (st.phase === 'race') at = Math.min(st.capAt, st.firstFin ? st.endAt : Infinity);
  else if (st.phase === 'result') at = st.resultEnd;
  if (!at || !isFinite(at)) return;
  ctx.later(Math.max(0, at - now) + 30, () => {
    if (st.pid !== pid) return;
    if (Date.now() < at - 20) { arm(st, ctx); return; }
    if (st.phase === 'lobby') startRace(st, ctx);
    else if (st.phase === 'race') endRace(st, ctx);
    else if (st.phase === 'result') advance(st, ctx);
  });
}
function startLobby(st, ctx) {
  st.race++;
  let w = st.worldOpt;
  if (!WORLD_INFO[w]) {
    const pool = WORLD_IDS.filter(x => !st.usedWorlds.includes(x));
    w = (pool.length ? pool : WORLD_IDS.filter(x => x !== st.world))[Math.floor(Math.random() * (pool.length ? pool.length : WORLD_IDS.length - 1))];
  }
  st.usedWorlds.push(w); if (st.usedWorlds.length >= WORLD_IDS.length) st.usedWorlds = [w];
  st.world = w; st.seed = 1 + Math.floor(Math.random() * 2e9);
  st.phase = 'lobby'; st.results = null;
  st.ready = st.players.map(p => p.bot);
  st.lobbyEnd = ctx.mode === 'online' ? Date.now() + (st.garage + (st.race === 1 ? 10 : 0)) * 1000 : null;
  st.traps = []; st.fin = st.players.map(() => null); st.pw = st.players.map(() => null);
  ctx.emit({ t: 'lobby', race: st.race, world: w }, `Yarış ${st.race}/${st.races}: ${WORLD_INFO[w].i} ${WORLD_INFO[w].n} (${LEN_INFO[st.len].n}). Garajda hazırlan!`, 'gold');
  arm(st, ctx); ctx.sync();
}
function checkReady(st, ctx) {
  if (st.phase !== 'lobby') return;
  const hs = humanIds(st, ctx);
  if (hs.length && hs.every(i => st.ready[i])) startRace(st, ctx);
}
function startRace(st, ctx) {
  if (st.phase !== 'lobby') return;
  const T = trackOf(st.seed, st.world, st.len);
  const now = Date.now();
  st.phase = 'race'; st.startAt = now + 3800; st.firstFin = 0; st.endAt = 0;
  st.capAt = st.startAt + Math.max(T.par * 1.9, T.par + 45000);
  st.fin = st.players.map(() => null); st.pw = st.players.map(() => null); st.picked = st.players.map(() => []);
  st.sh = st.players.map(() => 0); st.traps = []; st.nextOk = st.players.map(() => false);
  st.players.forEach((p, i) => { book[i] = { x: START_X, fin: null }; });
  ctx.emit({ t: 'race', race: st.race, world: st.world }, `${WORLD_INFO[st.world].n} yarışı başlıyor: 3… 2… 1…`, 'gold');
  arm(st, ctx); ctx.sync();
}
function progressOf(st, i) { return st.fin[i] != null ? 1e9 - st.fin[i] : (book[i] ? book[i].x : START_X); }
function placeOf(st, pi) {
  const me = progressOf(st, pi);
  return 1 + st.players.filter((p, i) => i !== pi && progressOf(st, i) > me).length;
}
// Güç ağırlıkları: öndekiler savunma, arkadakiler hız ve saldırı güçleri alır (lastik bant)
function powerWeights(place, n) {
  const r = (place - 1) / Math.max(1, n - 1);
  return {
    turbo: 14 + 22 * r, kalkan: 18 - 8 * r, muz: 20 - 10 * r, bulut: place > 1 ? 7 + 10 * r : 0,
    miknatis: 12 - 4 * r, yay: place > 1 ? 7 + 6 * r : 4, kukreme: 11 - 5 * r, isinlan: r >= .5 ? 3 + 13 * r : 0,
    tavuk: place > 1 ? 5 + 10 * r : 2, sakiz: 6, simsek: place > 1 ? 9 * r * r : 0
  };
}
function choosePower(st, pi) {
  const n = st.players.length;
  if (n === 1) return ['turbo', 'miknatis', 'kalkan', 'isinlan', 'turbo'][Math.floor(Math.random() * 5)];
  const w = powerWeights(placeOf(st, pi), n);
  const tot = Object.values(w).reduce((a, b) => a + b, 0);
  let x = Math.random() * tot;
  for (const k of PW_IDS) { x -= w[k] || 0; if (x <= 0) return k; }
  return 'turbo';
}
// hedef: öndeki en yakın rakip; yoksa arkadaki en yakın
function targetAhead(st, pi) {
  const me = progressOf(st, pi);
  const live = st.players.map((p, i) => i).filter(i => i !== pi && st.fin[i] == null);
  const ahead = live.filter(i => progressOf(st, i) > me).sort((a, b) => progressOf(st, a) - progressOf(st, b));
  if (ahead.length) return ahead[0];
  const behind = live.sort((a, b) => progressOf(st, b) - progressOf(st, a));
  return behind.length ? behind[0] : null;
}
function hostUse(st, pi, a, ctx) {
  const pw = st.pw[pi]; if (!pw || st.phase !== 'race' || st.fin[pi] != null) return;
  const now = Date.now(); if (now < st.startAt) return;
  st.pw[pi] = null;
  const to = [], blk = [];
  const hit = i => { if (i == null) return; if (st.sh[i] > now) { blk.push(i); st.sh[i] = 0; } else to.push(i); };
  const me = progressOf(st, pi);
  let log = '';
  switch (pw) {
    case 'turbo': to.push(pi); log = `${pname(st, pi)} roket ayakkabılarını ateşledi! 🚀`; break;
    case 'miknatis': to.push(pi); log = `${pname(st, pi)} mıknatısıyla altınları topluyor! 🧲`; break;
    case 'isinlan': to.push(pi); log = `${pname(st, pi)} ışınlandı! ✨`; break;
    case 'kalkan': st.sh[pi] = now + 12000; log = `${pname(st, pi)} kalkan balonunu şişirdi. 🫧`; break;
    case 'yay': {        // Yay Bombası: en yakın rakibi havaya fırlatır
      const live = st.players.map((p, i) => i).filter(i => i !== pi && st.fin[i] == null);
      live.sort((x, y) => Math.abs(progressOf(st, x) - me) - Math.abs(progressOf(st, y) - me));
      hit(live[0]); log = live[0] == null ? `${pname(st, pi)} yay bombasını boşa patlattı.` : `${pname(st, pi)} → ${pname(st, live[0])}: yay bombası! BOİNG! 💥`; break;
    }
    case 'kukreme': {    // Boğa Kükremesi: hemen arkadakileri kısa süre sersemletir
      const tg = st.players.map((p, i) => i).filter(i => i !== pi && st.fin[i] == null && progressOf(st, i) <= me + 60 && progressOf(st, i) >= me - 560);
      tg.forEach(hit); log = tg.length ? `${pname(st, pi)} kükredi! 🐂 Arkasındakiler sersemledi.` : `${pname(st, pi)} kükredi ama arkasında kimse yoktu. 🐂`; break;
    }
    case 'tavuk': {      // Tavuk Büyüsü: öndeki rakip 3 sn tavuğa döner
      const tg = targetAhead(st, pi); hit(tg); log = tg == null ? `${pname(st, pi)} tavuk büyüsü yaptı ama tuttu mu? 🐔` : `${pname(st, pi)} → ${pname(st, tg)}: tavuk büyüsü! GIDAK! 🐔`; break;
    }
    case 'muz': {
      const T = trackOf(st.seed, st.world, st.len);
      let x = Number.isFinite(+a.x) ? +a.x : (book[pi] ? book[pi].x : START_X);
      if (book[pi] && Math.abs(book[pi].x - x) > 600) x = book[pi].x;
      let spot = null;
      for (let dx = 45; dx < 260 && !spot; dx += 15) {
        const s = support({ x: x - dx }, T, (now - st.startAt) / 1000, -1e4, 1e4, 0, false);
        if (s && s.ref && s.ref.x0 != null) spot = { x: Math.round(x - dx), y: Math.round(s.y) };
      }
      if (spot) { st.traps.push({ id: ++st.trapN, x: spot.x, y: spot.y, by: pi }); if (st.traps.length > 24) st.traps.shift(); }
      log = `${pname(st, pi)} arkasına muz kabuğu bıraktı! 🍌`;
      ctx.emit({ t: 'fx', pw, by: pi, to: [], blk: [], trap: spot }, log); ctx.sync(); return;
    }
    case 'bulut': {      // Bulut Fırtınası: liderin (lider sensen ikincinin) tepesine yağmur
      const live = st.players.map((p, i) => i).filter(i => i !== pi && st.fin[i] == null).sort((x, y) => progressOf(st, y) - progressOf(st, x));
      const tg = live.length ? live[0] : null; hit(tg);
      log = tg == null ? `${pname(st, pi)} bulutu boşa yağdırdı.` : `${pname(st, pi)} → ${pname(st, tg)}: bulut fırtınası! ⛈️`; break;
    }
    case 'sakiz': {
      const live = st.players.map((p, i) => i).filter(i => i !== pi && st.fin[i] == null);
      live.sort((x, y) => Math.abs(progressOf(st, x) - me) - Math.abs(progressOf(st, y) - me));
      hit(live[0]); log = live[0] == null ? `${pname(st, pi)} sakızı yere tükürdü.` : `${pname(st, pi)} → ${pname(st, live[0])}: yapışkan sakız! 🍬`; break;
    }
    case 'simsek': {
      let tg = st.players.map((p, i) => i).filter(i => i !== pi && st.fin[i] == null && progressOf(st, i) > me);
      if (!tg.length) tg = st.players.map((p, i) => i).filter(i => i !== pi && st.fin[i] == null);
      tg.forEach(hit); log = `${pname(st, pi)} şimşek çaktırdı! ⚡`; break;
    }
    default: break;
  }
  ctx.emit({ t: 'fx', pw, by: pi, to, blk }, log + (blk.length ? ` ${blk.map(i => pname(st, i)).join(', ')} kalkanla engelledi!` : ''), blk.length ? 'good' : '');
  ctx.sync();
}
// Bilgisayarın güç kullanımı: kükreme ve muz için arkada yakın bir rakip bekler, diğerlerini kısa bir düşünmeden sonra kullanır
function schedBotPower(st, pi, ctx, tries) {
  const race = st.race, pw = st.pw[pi]; tries = tries || 0;
  const waitBehind = pw === 'kukreme' || pw === 'muz';
  ctx.later(pw === 'kalkan' || pw === 'isinlan' ? rnd(300, 900) : waitBehind ? rnd(400, 700) : rnd(700, 2800), () => {
    if (st.race !== race || st.phase !== 'race' || st.pw[pi] !== pw) return;
    if (waitBehind && tries < 14) {
      const me = progressOf(st, pi), lim = pw === 'kukreme' ? 520 : 650;
      const near = st.players.some((p, i) => i !== pi && st.fin[i] == null && progressOf(st, i) < me && progressOf(st, i) > me - lim);
      if (!near) { schedBotPower(st, pi, ctx, tries + 1); return; }
    }
    hostUse(st, pi, { x: book[pi] ? book[pi].x : START_X }, ctx);
  });
}
function hostAct(st, pi, a, ctx) {
  const now = Date.now();
  switch (a.t) {
    case 'look': st.look[pi] = SHOP.sanitizeLook(a.look); ctx.sync(); return;
    case 'ready':
      if (st.phase !== 'lobby') return;
      st.ready[pi] = a.on !== false;
      ctx.emit({ t: 'ready', pi, on: st.ready[pi] }, st.ready[pi] ? `${pname(st, pi)} hazır! ✅` : `${pname(st, pi)} hazır değil.`);
      ctx.sync(); checkReady(st, ctx); return;
    case 'start': if (st.phase === 'lobby' && pi === ctx.hostPi) startRace(st, ctx); return;
    case 'pick': {
      if (st.phase !== 'race' || !st.powers || st.fin[pi] != null || now < st.startAt - 200) return;
      const box = a.box | 0, T = trackOf(st.seed, st.world, st.len);
      if (!T.boxes.some(b => b.id === box) || st.picked[pi].includes(box) || st.pw[pi]) return;
      st.picked[pi].push(box); st.pw[pi] = choosePower(st, pi);
      if (st.players[pi].bot) schedBotPower(st, pi, ctx);
      ctx.emit({ t: 'got', pi }); ctx.sync(); return;
    }
    case 'use': hostUse(st, pi, a, ctx); return;
    case 'trap': {
      if (st.phase !== 'race') return;
      const k = st.traps.findIndex(tr => tr.id === (a.id | 0)); if (k < 0) return;
      const tr = st.traps[k]; if (tr.by === pi) return;
      st.traps.splice(k, 1);
      const blocked = st.sh[pi] > now; if (blocked) st.sh[pi] = 0;
      ctx.emit({ t: 'fx', pw: 'muz', by: tr.by, to: blocked ? [] : [pi], blk: blocked ? [pi] : [], trapId: tr.id }, blocked ? `${pname(st, pi)} muzu kalkanla savuşturdu!` : `${pname(st, pi)} ${pname(st, tr.by)} adlı oyuncunun muzuna bastı! 🍌`, blocked ? 'good' : '');
      ctx.sync(); return;
    }
    case 'finish': {
      if (st.phase !== 'race' || st.fin[pi] != null) return;
      const T = trackOf(st.seed, st.world, st.len), el = now - st.startAt;
      let ms = Math.round(+a.ms);
      if (!Number.isFinite(ms) || ms < T.minMs || el < T.minMs - 500) return;     // akla yatkın değil
      if (ms > el + 1500) ms = el;
      st.fin[pi] = ms; book[pi] = { x: T.len, fin: ms };
      const place = 1 + st.fin.filter((f, i) => i !== pi && f != null && f < ms).length;
      if (!st.firstFin) { st.firstFin = now; st.endAt = Math.min(st.capAt, now + 25000); arm(st, ctx); }
      ctx.emit({ t: 'fin', pi, ms, place }, `${pname(st, pi)} bitirdi: ${place}. · ${SHOP.fmtMs(ms)}`, place === 1 ? 'gold' : 'good');
      ctx.sync();
      const all = st.players.every((p, i) => st.fin[i] != null || !(p.bot || ctx.isOnline(i)));
      if (all) { const race = st.race; ctx.later(1500, () => { if (st.race === race && st.phase === 'race') endRace(st, ctx); }); }
      return;
    }
    case 'next':
      if (st.phase !== 'result') return;
      st.nextOk[pi] = true; ctx.sync();
      if (humanIds(st, ctx).every(i => st.nextOk[i])) advance(st, ctx);
      return;
    default: return;
  }
}
function endRace(st, ctx) {
  if (st.phase !== 'race') return;
  const order = st.players.map((p, i) => i).sort((a, b) => {
    const fa = st.fin[a], fb = st.fin[b];
    if (fa != null && fb != null) return fa - fb;
    if (fa != null) return -1; if (fb != null) return 1;
    return progressOf(st, b) - progressOf(st, a);
  });
  const T = trackOf(st.seed, st.world, st.len);
  st.results = order.map((pi, k) => {
    const done = st.fin[pi] != null, pts = done ? (PTS[k] || 2) : 1;
    st.pts[pi] += pts; st.tot[pi] += done ? st.fin[pi] : Math.round(st.capAt - st.startAt);
    if (k === 0 && done) st.wins[pi]++;
    return { pi, place: k + 1, ms: st.fin[pi], pts, prog: Math.round(Math.min(1, (book[pi] ? book[pi].x : 0) / T.len) * 100) };
  });
  st.phase = 'result'; st.resultEnd = Date.now() + (st.race >= st.races ? 16000 : 14000); st.nextOk = st.players.map(() => false);
  const w = st.results[0];
  ctx.emit({ t: 'results', race: st.race }, w && w.ms != null ? `🏁 Yarış ${st.race} bitti! Kazanan: ${pname(st, w.pi)} (${SHOP.fmtMs(w.ms)})` : `🏁 Yarış ${st.race} bitti.`, 'gold');
  arm(st, ctx); ctx.sync();
}
function advance(st, ctx) {
  if (st.phase !== 'result') return;
  if (st.race < st.races) { startLobby(st, ctx); return; }
  st.phase = 'over'; st.pid++;
  const order = st.players.map((p, i) => i).sort((a, b) => st.pts[b] - st.pts[a] || st.tot[a] - st.tot[b]);
  const best = order[0];
  ctx.sync();
  ctx.end({
    title: `${pname(st, best)} Patili Yarış şampiyonu! 🏆`,
    ranking: order.map(pi => ({ pi, score: st.pts[pi], label: `${st.pts[pi]} puan · ${st.wins[pi]} galibiyet` })),
    note: `${st.races} yarış oynandı (${LEN_INFO[st.len].n} parkur). Puanlar: 1. 10 · 2. 8 · 3. 6 · 4. 5 · 5. 4 · 6. 3 · bitiremeyen 1.`
  });
}
const RULES = {
  setup,
  action(st, pi, a, ctx) {
    if (!a || typeof a.t !== 'string') return;
    if (a.t === 'bot') {
      if (ctx.mode !== 'local') return;
      const bp = a.pi | 0; if (!st.players[bp] || !st.players[bp].bot || !a.a || !['pick', 'trap', 'finish'].includes(a.a.t)) return;
      hostAct(st, bp, a.a, ctx); return;
    }
    hostAct(st, pi, a, ctx);
  },
  view(st, viewer) {
    const now = Date.now();
    const T = trackOf(st.seed, st.world, st.len);
    return {
      phase: st.phase, race: st.race, races: st.races, world: st.world, seed: st.seed, powers: st.powers, len: st.len,
      startAt: st.startAt, lobbyEnd: st.lobbyEnd, resultEnd: st.resultEnd, endAt: st.firstFin ? st.endAt : 0, capAt: st.capAt, par: T.par,
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, bot: p.bot, look: st.look[i], ready: st.ready[i], online: st.online[i], fin: st.fin[i], pts: st.pts[i], wins: st.wins[i], sh: st.sh[i] > now, next: st.nextOk[i], skill: p.bot ? st.skill[i] : undefined })),
      traps: st.traps.map(t => ({ id: t.id, x: t.x, y: t.y, by: t.by })),
      results: st.results, myPw: viewer >= 0 ? st.pw[viewer] : null, picked: viewer >= 0 ? st.picked[viewer] : []
    };
  },
  turnOf() { return null; },
  botAct() { /* bilgisayarlar yarış sırasında cihazda simüle edilir */ },
  skipTurn() { /* gerçek zamanlı: kopmalar onPresence ile işlenir */ },
  botDelay: 900,
  onPresence(st, pi, online, ctx) {
    st.online[pi] = online;
    if (online) return;
    if (st.phase === 'lobby') checkReady(st, ctx);
    else if (st.phase === 'race') {
      const all = st.players.every((p, i) => st.fin[i] != null || !(p.bot || ctx.isOnline(i)));
      if (all && st.players.some((p, i) => st.fin[i] != null || ctx.isOnline(i))) endRace(st, ctx);
    } else if (st.phase === 'result') { const hs = humanIds(st, ctx); if (hs.length && hs.every(i => st.nextOk[i])) advance(st, ctx); }
  },
  resume(st, ctx) { if (st.phase !== 'over') arm(st, ctx); }
};

/* =================================================================== ARAYÜZ (her cihaz) */
const VIEW_H = 430;
const DBG = { sky: 1, ground: 1, objs: 1, chars: 1, hud: 1, parts: 1, deco: 1 };
let root = null, ui = null, V = null, prevV = null, built = '', tab = 'gardirop', wslot = 'char', sslot = 'all';
let cv = null, g = null, stageEl = null, dpr = 1, sw = 0, sh = 0, ro = null, raf = 0, lastFrame = 0, hudT = null;
let T = null, trackKey = '', P = null, me = -1;
let L = null;                // yerel koşucu durumu
let bots = new Map();        // yerel modda bilgisayar koşucuları
let remotes = new Map();     // diğer cihazların koşucuları
let parts = [], texts = [], clouds = new Map(), gums = new Map(), bolts = [], beams = [];
let cam = { x: 0, y: 0, s: 1, init: false };
let keys = { j: false, s: false }, touch = { j: false, s: false }, auto = false, autoSkill = 1, autoPw = true;
let lastSend = 0, pickPend = 0, usedPend = null, lookT = null, buyArm = null, rewardShown = '', countLast = 99, msgs = [];
let profile = null, lastViewAt = 0, traceI = -1, trace = [];
const nowMs = () => performance.now();
const q = s => root && root.querySelector(s);
const hostNow = () => (ui ? ui.hostNow() : Date.now());
function loadProfile() { profile = SHOP.load(); SHOP.ensureDaily(profile); return profile; }
function saveProfile() { SHOP.save(profile); }
const fmtG = SHOP.fmtG, fmtMs = SHOP.fmtMs;
const isTouch = () => { try { return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window; } catch { return false; } };

/* ---------- ses: küçük sentez blipleri ---------- */
const SFX = {
  jump(h) { if (!Sound.ok('kjump', 60)) return; Sound.tone(h ? 640 : 480, .12, { type: 'square', gain: .05, slide: h ? 1200 : 900 }); },
  coin() { if (!Sound.ok('kcoin', 45)) return; Sound.tone(1318, .06, { type: 'square', gain: .045 }); Sound.tone(1760, .12, { type: 'triangle', gain: .09, when: .05 }); },
  hit() { if (!Sound.ok('khit', 200)) return; Sound.noise(.18, { filter: 'lowpass', freq: 700, gain: .35 }); Sound.tone(200, .22, { type: 'sawtooth', gain: .08, slide: 90 }); },
  boing() { if (!Sound.ok('kboing', 120)) return; Sound.tone(220, .3, { type: 'sine', gain: .2, slide: 880 }); },
  land() { if (!Sound.ok('kland', 120)) return; Sound.noise(.06, { filter: 'lowpass', freq: 500, gain: .12 }); },
  power() { if (!Sound.ok('kpow', 150)) return; [523, 784, 1046].forEach((f, i) => Sound.tone(f, .1, { type: 'triangle', gain: .12, when: i * .05 })); },
  zap() { if (!Sound.ok('kzap', 200)) return; Sound.noise(.35, { filter: 'highpass', freq: 2500, gain: .3 }); Sound.tone(1600, .2, { type: 'sawtooth', gain: .05, slide: 200 }); },
  slip() { if (!Sound.ok('kslip', 200)) return; Sound.tone(900, .35, { type: 'triangle', gain: .12, slide: 220 }); },
  count(go) { if (!Sound.ok('kcount', 300)) return; Sound.tone(go ? 1046 : 660, go ? .4 : .16, { type: 'square', gain: .09 }); if (go) Sound.tone(1568, .4, { type: 'triangle', gain: .12, when: .05 }); }
};

/* ---------- koşucu görsel durumu (kulak/kuyruk yayları, ezilme) ---------- */
function newVis() { return { ear: 0, earV: 0, tail: 0, tailV: 0, sq: 0, ph: Math.random(), blinkAt: nowMs() + 2000, trail: 0, lastY: 0, lastVy: 0, dust: 0 }; }
function stepVis(vs, vx, vy, gnd, dt, land) {
  const targetE = clamp(-vy * .0007, -.6, .9);
  vs.earV += ((targetE - vs.ear) * 90 - vs.earV * 9) * dt; vs.ear += vs.earV * dt;
  const targetT = clamp(vy * .0005, -.6, .6) + (gnd ? 0 : -.2);
  vs.tailV += ((targetT - vs.tail) * 60 - vs.tailV * 7) * dt; vs.tail += vs.tailV * dt;
  if (land) vs.sq = Math.min(.28, land);
  vs.sq += (0 - vs.sq) * Math.min(1, dt * 12);
  vs.ph = (vs.ph + dt * Math.max(.6, Math.abs(vx) / 105)) % 1;
}
function animOf(r) {
  if (r.fin) return 7;
  if (r.slip > 0 || r.launch > 0) return 6;
  if (r.stun > 0) return 4;
  if (r.stuck > 0) return 5;
  if (r.sl) return 3;
  if (!r.gnd) return r.vy < 0 ? 1 : 2;
  return 0;
}
const ANIM_K = ['run', 'jump', 'fall', 'slide', 'stun', 'stuck', 'spin', 'win', 'idle'];
function flagsOf(r) { return (r.turbo > 0 ? 1 : 0) | (r.slow > 0 ? 2 : 0) | (r.spring > 0 ? 4 : 0) | (r.pad > 0 ? 8 : 0) | (r.inv > 0 ? 16 : 0) | (r.pull > 0 ? 32 : 0) | (r.chick > 0 ? 64 : 0) | (r.fin ? 128 : 0) | (r.mag > 0 ? 256 : 0) | (r.lowg ? 512 : 0); }
const danceOf = look => { const it = look && look.dance && SHOP.BYID[look.dance]; return it ? it.st : null; };

/* ---------- yarış kurulumu ---------- */
function ensureTrack() {
  if (!V) return;
  const k = V.seed + ':' + V.world + ':' + V.len;
  if (k === trackKey && T) return;
  trackKey = k; T = trackOf(V.seed, V.world, V.len);
  resetRace();
}
function resetRace() {
  if (!T) return;
  const r = newRunner(T);
  L = { r, dyn: { traps: [], coins: new Set(), boxes: new Set(), slipped: new Set(), me }, simT: -1, vis: newVis(), sent: false, finSent: false, bot: makeBot(autoSkill, (V.seed ^ 777) >>> 0), stats: { pw: {}, hitGiven: 0, bananaHits: 0, zapHits: 0, roarHits: 0, blocks: 0, boxes: 0 }, out: [], ownPicked: new Set() };
  bots = new Map(); remotes = new Map(); parts = []; texts = []; clouds = new Map(); gums = new Map(); bolts = []; beams = []; msgs = [];
  if (V && ui && ui.isHost && ui.mode === 'local') {
    V.players.forEach((p, i) => { if (p.bot) bots.set(i, { r: newRunner(T), bot: makeBot(p.skill || .75, (V.seed + i * 7919) >>> 0), dyn: { traps: [], coins: null, boxes: new Set(), slipped: new Set(), me: i }, vis: newVis(), simT: -1, finSent: false, out: [], delay: .06 + Math.random() * .4 }); });
  }
  cam.init = false; countLast = 99; pickPend = 0; usedPend = null;
  // sayfa yenilenince yarışa kaldığı yerden (son kontrol noktası) dön
  if (V && V.phase === 'race' && me >= 0 && V.players[me]) {
    let saved = null; try { saved = JSON.parse(sessionStorage.getItem('ky.pos') || 'null'); } catch { saved = null; }
    if (V.players[me].fin != null) { r.fin = true; r.finT = V.players[me].fin / 1000; r.x = T.len + 40; const sg = segAtX(T.segs, r.x); if (sg) r.y = sg.y0; L.finSent = true; }
    else if (saved && saved.k === V.seed + ':' + V.race && saved.x > START_X + 200) {
      let ci = 0; T.cps.forEach((c, i) => { if (c.x <= saved.x) ci = i; });
      const c = T.cps[ci]; r.x = r.cpx = c.x; r.y = r.cpy = c.y; r.cpi = ci;
      if (saved.coins) saved.coins.forEach(id => L.dyn.coins.add(id));
    }
  }
}
let posSaveAt = 0;
function savePos() {
  const t = nowMs(); if (t - posSaveAt < 1000 || !L || !V || V.phase !== 'race' || me < 0) return; posSaveAt = t;
  try { sessionStorage.setItem('ky.pos', JSON.stringify({ k: V.seed + ':' + V.race, x: Math.round(L.r.x), coins: [...L.dyn.coins] })); } catch { /* */ }
}
function raceTime() { return V && V.phase === 'race' ? (hostNow() - V.startAt) / 1000 : -99; }

/* ---------- simülasyon ---------- */
function simulate() {
  const _s0 = performance.now();
  simulate2();
  DBG.sim = (DBG.sim || 0) * .95 + (performance.now() - _s0) * .05;
}
function simulate2() {
  if (!V || V.phase !== 'race' || !T || !L) return;
  const rt = raceTime();
  if (rt < 0) return;
  const shieldOf = i => !!(V.players[i] && V.players[i].sh);
  const traps = (V.traps || []).filter(t => !L.dyn.slipped.has(t.id));
  // yerel oyuncu
  if (me >= 0 && V.players[me]) {
    const r = L.r; r.shield = shieldOf(me);
    if (L.simT < 0) L.simT = 0;
    if (rt - L.simT > .35) L.simT = rt - .35;
    L.dyn.traps = traps;
    L.dyn.noBox = !V.powers || !!V.myPw || !!pickPend;
    let n = 0;
    while (L.simT + DT <= rt && n < 50) {
      if (auto === 'keys') {      // test: otopilot gerçek klavye olaylarıyla oynar
        const want = botInput(L.bot, r, T, L.simT, L.dyn);
        if (want.j !== keys.j) dispatchEvent(new KeyboardEvent(want.j ? 'keydown' : 'keyup', { code: 'Space', key: ' ', bubbles: true }));
        if (want.s !== keys.s) dispatchEvent(new KeyboardEvent(want.s ? 'keydown' : 'keyup', { code: 'ArrowDown', key: 'ArrowDown', bubbles: true }));
      }
      const inp = auto && auto !== 'keys' ? botInput(L.bot, r, T, L.simT, L.dyn) : { j: keys.j || touch.j, s: keys.s || touch.s };
      L.out.length = 0;
      step(r, inp, T, L.simT, L.dyn, L.out);
      L.simT += DT; n++;
      for (const e of L.out) onLocalEv(e, r, L.vis, me, L.simT);
    }
    book[me] = { x: r.x, fin: r.fin ? Math.round(r.finT * 1000) : null };
    if (auto && autoPw && V.myPw && !usedPend && rt > 1 && Math.random() < .02) { if (auto === 'keys') { dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true })); dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e', bubbles: true })); } else usePower(); }
  }
  // yerel bilgisayarlar
  bots.forEach((b, i) => {
    b.r.shield = shieldOf(i); b.dyn.traps = traps;
    if (b.simT < 0) b.simT = 0;
    if (rt - b.simT > .35) b.simT = rt - .35;
    let n = 0;
    while (b.simT + DT <= rt && n < 50) {
      if (b.simT < b.delay) { b.simT += DT; n++; continue; }      // tepki gecikmesi
      const inp = botInput(b.bot, b.r, T, b.simT, b.dyn);
      b.out.length = 0; step(b.r, inp, T, b.simT, b.dyn, b.out); b.simT += DT; n++;
      for (const e of b.out) onBotEv(e, b, i);
    }
    book[i] = { x: b.r.x, fin: b.r.fin ? Math.round(b.r.finT * 1000) : null };
  });
}
function onLocalEv(e, r, vis, seat, t) {
  switch (e.k) {
    case 'jump': SFX.jump(false); puff(r.x, r.y, 3); vis.sq = -.18; break;
    case 'jump2': SFX.jump(true); puff(r.x, r.y - 10, 4, '#ffffff'); ring(r.x, r.y - 20); break;
    case 'land': if (e.v > 500) { puff(r.x, r.y, 5); vis.sq = Math.min(.26, e.v / 4000); SFX.land(); } break;
    case 'hurt': SFX.hit(); comic(r.x, r.y - 70, e.why === 'geyser' ? 'CIZZ!' : 'PAT!'); starsBurst(r.x, r.y - 50); if (seat === me) flashStage(); break;
    case 'respawn': SFX.hit(); comic(r.x, r.y - 70, e.why === 'pit' ? 'HOP!' : 'AY!'); puff(r.x, r.y - 20, 10, '#ffffff'); if (seat === me) flashStage(); break;
    case 'coin': SFX.coin(); if (e.mag) { parts.push({ k: 'fly', x: e.x, y: e.y, tx: r, life: 0, max: .35, c: '#ffe14a', r: 6 }); } else sparkle(r.x, r.y - 40); break;
    case 'plank': if (Sound.ok('kplank', 160)) Sound.tone(180 + Math.random() * 60, .09, { type: 'square', gain: .035, slide: 120 }); break;
    case 'box':
      if (V.powers && !V.myPw && !pickPend) { pickPend = nowMs(); ui.send({ t: 'pick', box: e.id }); SFX.power(); sparkle(r.x, r.y - 40, '#ffffff', 10); L.stats.boxes++; }
      break;
    case 'trap': SFX.slip(); comic(r.x, r.y - 60, r.shield ? 'ENGEL!' : 'KAYDI!'); ui.send({ t: 'trap', id: e.id }); break;
    case 'spring': SFX.boing(); if (T) { T._spr = T._spr || {}; T._spr[e.id] = t; } puff(r.x, r.y, 4); break;
    case 'pad': Sound.ok('kpad', 300) && Sound.whoosh(); break;
    case 'slide': puff(r.x + 10, r.y, 3); break;
    case 'fin': {
      if (!L.finSent) { L.finSent = true; ui.send({ t: 'finish', ms: Math.round(e.t * 1000) }); }
      FX.confetti(90); Sound.solve(); comic(r.x, r.y - 80, 'BİTTİ!');
      break;
    }
    default: break;
  }
}
function onBotEv(e, b, i) {
  const r = b.r;
  switch (e.k) {
    case 'jump2': puff(r.x, r.y - 10, 3, '#ffffff'); break;
    case 'land': if (e.v > 700) puff(r.x, r.y, 3); break;
    case 'hurt': comic(r.x, r.y - 70, 'PAT!'); starsBurst(r.x, r.y - 50); break;
    case 'respawn': puff(r.x, r.y - 20, 8, '#ffffff'); break;
    case 'box': if (V.powers) ui.send({ t: 'bot', pi: i, a: { t: 'pick', box: e.id } }); break;
    case 'trap': comic(r.x, r.y - 60, r.shield ? 'ENGEL!' : 'KAYDI!'); ui.send({ t: 'bot', pi: i, a: { t: 'trap', id: e.id } }); break;
    case 'spring': if (T) { T._spr = T._spr || {}; T._spr[e.id] = b.simT; } break;
    case 'fin': if (!b.finSent) { b.finSent = true; ui.send({ t: 'bot', pi: i, a: { t: 'finish', ms: Math.round(e.t * 1000) } }); } break;
    default: break;
  }
}
function usePower() {
  if (!V || V.phase !== 'race' || !V.myPw || usedPend || !L || L.r.fin) return;
  if (raceTime() < 0) return;
  const pw = V.myPw;
  usedPend = pw;
  L.stats.pw[pw] = (L.stats.pw[pw] || 0) + 1;
  ui.send({ t: 'use', x: Math.round(L.r.x), y: Math.round(L.r.y) });
  SFX.power();
  updatePad();
}
function sendFast() {
  if (!ui || ui.mode !== 'online' || !V || V.phase !== 'race' || me < 0 || !L) return;
  const t = nowMs();
  const rt = raceTime();
  if (rt < -1.5) return;
  if (L.r.fin && rt - L.r.finT > 4) return;
  if (t - lastSend < 100) return;
  lastSend = t;
  const r = L.r;
  ui.fast({ k: 'p', t: Math.round(Math.max(0, L.simT) * 1000), x: Math.round(r.x), y: Math.round(r.y), vx: Math.round(r.vx), vy: Math.round(r.vy), a: animOf(r), f: flagsOf(r) });
}
function onFast(m, api) {
  if (!m || m.k !== 'p' || typeof m.seat !== 'number' || m.seat < 0 || m.seat === me) return;
  if (!V || V.phase !== 'race') return;
  let R = remotes.get(m.seat);
  if (!R) { R = { buf: [], vis: newVis(), x: m.x, y: m.y, a: 0, f: 0, vy: 0, vx: 0 }; remotes.set(m.seat, R); }
  const s = { t: +m.t || 0, x: +m.x || 0, y: +m.y || 0, vx: +m.vx || 0, vy: +m.vy || 0, a: m.a | 0, f: m.f | 0 };
  if (R.buf.length && s.t <= R.buf[R.buf.length - 1].t) return;
  R.buf.push(s); if (R.buf.length > 24) R.buf.shift();
  // gönderenin saati bizimkinden geride kalabilir (yavaş cihaz, gecikmeli paketler): gecikmeyi izle ve tampona ekle
  const lagNow = raceTime() * 1000 - s.t;
  R.lag = R.lag == null ? lagNow : R.lag + (lagNow - R.lag) * (lagNow > R.lag ? .25 : .05);
  book[m.seat] = { x: s.x, fin: (s.f & 128) ? s.t : null };
}
// diğer koşucuların ~120 ms geriden ara değerli konumu
function sampleRemote(R, rtMs) { return sampleRemoteAt(R, rtMs - clamp((R.lag || 0) + 110, 120, 1500)); }
// oynatma saati tekdüze ilerler: gecikme tahmini değişince geri sıçramaz, 0.5×–1.5× hızla hedefe yaklaşır
function remotePlayT(R, rtMs, dtMs) {
  const want = rtMs - clamp((R.lag || 0) + 110, 120, 1500);
  if (R.pt == null || Math.abs(want - R.pt) > 1200) R.pt = want;
  else { const err = want - (R.pt + dtMs); R.pt += dtMs + clamp(err * .12, -dtMs * .5, dtMs * .5); }
  return R.pt;
}
function sampleRemoteAt(R, tt) {
  const b = R.buf; if (!b.length) return null;
  if (tt <= b[0].t) return b[0];
  for (let i = b.length - 1; i > 0; i--) {
    if (b[i - 1].t <= tt && tt <= b[i].t) {
      const p = b[i - 1], n = b[i], u = (tt - p.t) / Math.max(1, n.t - p.t);
      return { x: p.x + (n.x - p.x) * u, y: p.y + (n.y - p.y) * u, vx: n.vx, vy: p.vy + (n.vy - p.vy) * u, a: u < .5 ? p.a : n.a, f: n.f };
    }
  }
  const l = b[b.length - 1], dt = Math.min(.25, (tt - l.t) / 1000);
  if (l.f & 128) return l;
  return { x: l.x + l.vx * dt, y: l.y + (l.a === 3 || l.a === 0 ? 0 : l.vy * dt), vx: l.vx, vy: l.vy, a: l.a, f: l.f };
}

/* ---------- efekt parçacıkları ---------- */
function puff(x, y, n, col) { for (let i = 0; i < n; i++) parts.push({ k: 'puff', x: x + rnd(-10, 10), y: y - rnd(0, 8), vx: rnd(-60, 30), vy: rnd(-60, -10), r: rnd(4, 9), life: 0, max: rnd(.35, .6), c: col || '#f4ecdf' }); }
function sparkle(x, y, col, n = 6) { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(60, 160); parts.push({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rnd(2, 4), life: 0, max: rnd(.3, .55), c: col || '#ffe14a' }); } }
function starsBurst(x, y) { for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + rnd(-1.4, 1.4), s = rnd(120, 240); parts.push({ k: 'star', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rnd(4, 7), life: 0, max: .7, c: '#ffe14a', rot: rnd(0, 6) }); } }
function ring(x, y) { parts.push({ k: 'ring', x, y, r: 6, life: 0, max: .35, c: '#ffffff' }); }
function comic(x, y, txt, col) { texts.push({ x, y, txt, life: 0, max: 1.1, c: col || '#ffe14a', rot: rnd(-.2, .2) }); }
function trailFor(look, x, y, t, vis) {
  const it = look.trail && SHOP.BYID[look.trail]; if (!it) return;
  vis.trail += 1; if (vis.trail % 3) return;
  const k = it.st, c = it.c;
  const p = { k: 'tr', st: k, x: x - 14 + rnd(-4, 4), y: y - rnd(8, 40), vx: rnd(-40, -10), vy: rnd(-30, 10), r: rnd(3, 6), life: 0, max: rnd(.5, .9), c: c[Math.floor(Math.random() * c.length)] || '#fff', rot: rnd(0, 6) };
  if (k === 'rainbow') { p.c = A.RAINBOW[(vis.trail / 3 | 0) % 6]; p.y = y - 30 + ((vis.trail / 3 | 0) % 6) * 3; p.vx = -10; p.vy = 0; p.max = .45; }
  if (k === 'fire') { p.vy = rnd(-80, -40); p.y = y - rnd(4, 20); }
  parts.push(p);
}
function stepParts(dt) {
  for (const p of parts) {
    p.life += dt;
    if (p.k === 'ring') { p.r += dt * 90; continue; }
    if (p.k === 'fly') { const u = Math.min(1, p.life / p.max); p.x += (p.tx.x - p.x) * u * .5; p.y += (p.tx.y - 40 - p.y) * u * .5; continue; }
    p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt;
    if (p.k === 'star' || p.k === 'spark') p.vy += 500 * dt;
    if (p.k === 'heart') p.vy += 40 * dt;
    if (p.k === 'puff') { p.vx *= .92; p.vy *= .92; p.r += dt * 14; }
  }
  parts = parts.filter(p => p.life < p.max);
  if (parts.length > 400) parts.splice(0, parts.length - 400);
  for (const t of texts) { t.life += dt; t.y -= dt * 30; }
  texts = texts.filter(t => t.life < t.max);
  bolts = bolts.filter(b => (b.life += dt) < .5);
  beams = beams.filter(b => (b.life += dt) < .7);
  msgs = msgs.filter(m => (m.life += dt) < m.max);
}
function drawParts(g2) {
  for (const p of parts) {
    const a = 1 - p.life / p.max;
    g2.globalAlpha = Math.max(0, a);
    if (p.k === 'puff') { g2.fillStyle = p.c; g2.beginPath(); g2.arc(p.x, p.y, p.r, 0, TAU); g2.fill(); }
    else if (p.k === 'fly') { g2.globalAlpha = 1; A.drawCoin ? A.drawCoin(g2, p.x, p.y, p.life * 10, 0) : null; }
    else if (p.k === 'heart') { g2.fillStyle = p.c; A.heart(g2, p.x, p.y, p.r); g2.fill(); }
    else if (p.k === 'spark') { g2.fillStyle = p.c; A.star(g2, p.x, p.y, p.r * 1.6, 4, .35); g2.fill(); }
    else if (p.k === 'star') { g2.fillStyle = p.c; A.star(g2, p.x, p.y, p.r, 5, .45, p.rot + p.life * 8); g2.fill(); g2.strokeStyle = '#b88a00'; g2.lineWidth = 1; g2.stroke(); }
    else if (p.k === 'ring') { g2.strokeStyle = p.c; g2.lineWidth = 3 * a; g2.beginPath(); g2.ellipse(p.x, p.y, p.r * 1.4, p.r * .5, 0, 0, TAU); g2.stroke(); }
    else if (p.k === 'tr') {
      g2.fillStyle = p.c;
      switch (p.st) {
        case 'hearts': A.heart(g2, p.x, p.y, p.r); g2.fill(); break;
        case 'stars': case 'sparks': A.star(g2, p.x, p.y, p.r * 1.3, p.st === 'sparks' ? 4 : 5, .4, p.rot); g2.fill(); break;
        case 'snow': g2.strokeStyle = p.c; g2.lineWidth = 1.4; for (let k = 0; k < 3; k++) { const an = p.rot + k * Math.PI / 3; g2.beginPath(); g2.moveTo(p.x - Math.cos(an) * p.r, p.y - Math.sin(an) * p.r); g2.lineTo(p.x + Math.cos(an) * p.r, p.y + Math.sin(an) * p.r); g2.stroke(); } break;
        case 'bubbles': g2.strokeStyle = p.c; g2.lineWidth = 1.2; g2.beginPath(); g2.arc(p.x, p.y, p.r, 0, TAU); g2.stroke(); g2.fillStyle = 'rgba(255,255,255,.6)'; g2.beginPath(); g2.arc(p.x - p.r * .3, p.y - p.r * .3, p.r * .25, 0, TAU); g2.fill(); break;
        case 'notes': g2.font = `${Math.round(p.r * 3)}px sans-serif`; g2.fillText('♪', p.x, p.y); break;
        case 'rainbow': g2.fillRect(p.x - 6, p.y, 14, 3.4); break;
        case 'fire': { const gr = g2.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 1.4); gr.addColorStop(0, '#fff6b0'); gr.addColorStop(.5, p.c); gr.addColorStop(1, 'rgba(255,80,0,0)'); g2.fillStyle = gr; g2.beginPath(); g2.arc(p.x, p.y, p.r * 1.4, 0, TAU); g2.fill(); break; }
        default: g2.beginPath(); g2.ellipse(p.x, p.y, p.r, p.r * .6, p.rot, 0, TAU); g2.fill(); break;
      }
    }
  }
  g2.globalAlpha = 1;
  for (const t of texts) {
    const a = t.life < .12 ? t.life / .12 : 1 - Math.max(0, t.life - .7) / .4, s = t.life < .15 ? .6 + t.life / .15 * .55 : 1.15 - Math.min(.15, (t.life - .15));
    g2.save(); g2.globalAlpha = clamp(a, 0, 1); g2.translate(t.x, t.y); g2.rotate(t.rot); g2.scale(s, s);
    g2.fillStyle = '#fff'; A.star(g2, 0, 0, 30, 10, .72); g2.fill(); g2.strokeStyle = '#ff3b5c'; g2.lineWidth = 3; g2.stroke();
    g2.font = `900 15px ${A.FONT}`; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.lineWidth = 4; g2.strokeStyle = '#2b1030'; g2.strokeText(t.txt, 0, 1); g2.fillStyle = t.c; g2.fillText(t.txt, 0, 1);
    g2.restore();
  }
}
function flashStage() { if (stageEl) { stageEl.classList.remove('ky-hurt'); void stageEl.offsetWidth; stageEl.classList.add('ky-hurt'); } }

/* ---------- çizim ---------- */
function resize() {
  if (!root || !stageEl || !cv) return;
  const wrap = q('.ky');
  const w = Math.max(200, wrap.clientWidth);
  const r = stageEl.getBoundingClientRect();
  const touchUi = isTouch();
  const land = innerWidth > innerHeight;
  const padH = touchUi && !(land && innerHeight < 560) ? (q('.ky-pad') ? q('.ky-pad').offsetHeight + 10 : 96) : 6;
  const availH = Math.max(160, innerHeight - Math.max(0, r.top + (window.scrollY || 0) - (window.scrollY || 0)) - padH - 8);
  let h;
  if (land && innerHeight < 560) h = Math.min(availH, w / 1.4);
  else if (innerWidth < 760) h = Math.min(innerWidth < innerHeight ? w * 1.18 : w / 1.5, availH);
  else h = Math.min(w * 9 / 16, Math.max(320, innerHeight - 150));
  h = Math.max(150, Math.round(h));
  stageEl.style.height = h + 'px';
  q('.ky-race').style.setProperty('--sh', h + 'px');
  sw = w; sh = h;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (sw * sh * dpr * dpr > 2.4e6) dpr = Math.sqrt(2.4e6 / (sw * sh));
  cv.width = Math.round(sw * dpr); cv.height = Math.round(sh * dpr);
  cv.style.width = sw + 'px'; cv.style.height = sh + 'px';
}
// dikey telefonda görüş genişliği ~600 birimde sabit (ileriyi görebilmek için); kalan yükseklik gökyüzü/zıplama payı
function viewScale() { return Math.min(sh / (sw / sh < 1.75 ? 400 : VIEW_H), sw / 600); }
function focusRunner() {
  if (me >= 0 && L && V.players[me]) return { x: L.r.x, y: L.r.y };
  let best = null, bx = -1;
  remotes.forEach(R => { const s = sampleRemote(R, raceTime() * 1000); if (s && s.x > bx) { bx = s.x; best = s; } });
  bots.forEach(b => { if (b.r.x > bx) { bx = b.r.x; best = b.r; } });
  return best || { x: START_X, y: T ? T.cps[0].y : 400 };
}
function updateCam(dt) {
  const s = viewScale(); cam.s = s;
  const vw = sw / s, vh = sh / s;
  const f = focusRunner();
  // dikeyde koşucunun altındaki zemini izle (zıplarken kamera sarsılmasın)
  let gy = f.y;
  if (T) { const s = support({ x: f.x }, T, Math.max(0, raceTime()), f.y - 4, f.y + 260, f.y, false); if (s) gy = s.y; }
  cam.gy = cam.gy == null || !cam.init ? gy : cam.gy + (gy - cam.gy) * Math.min(1, dt * 3);
  const overlayPad = isTouch() && innerWidth > innerHeight && innerHeight < 560;
  const tx = f.x - vw * .3, ty = cam.gy - vh * (overlayPad ? .6 : .74);
  if (!cam.init) { cam.x = tx; cam.y = ty; cam.init = true; }
  cam.x += (tx - cam.x) * Math.min(1, dt * 9);
  cam.y += (ty - cam.y) * Math.min(1, dt * 5);
  cam.y = clamp(cam.y, f.y - vh * .86, f.y - 100);
}
function frame(ts) {
  raf = 0; if (!root) return;
  const dt = Math.min(.1, Math.max(0, (ts - (lastFrame || ts)) / 1000)); lastFrame = ts;
  const _t0 = performance.now();
  if (V && V.phase === 'race' && T) {
    simulate(); sendFast(); savePos();
    updateCam(dt);
    stepParts(dt);
    draw(dt);
    hudTick();
  } else if (V && V.phase === 'lobby') { drawPreview(); }
  else if (V && (V.phase === 'result' || V.phase === 'over') && T) { updateCam(dt); stepParts(dt); draw(dt); drawPodium(); }
  DBG.ms = (DBG.ms || 0) * .95 + (performance.now() - _t0) * .05;
  raf = requestAnimationFrame(frame);
}
function visibleRange() { const vw = sw / cam.s; return [cam.x - 120, cam.x + vw + 120]; }
function draw(dt) {
  if (!g || !T) return;
  const t = Math.max(0, raceTime());
  const tt = nowMs() / 1000;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (DBG.sky) A.drawSky(g, T.world, sw, sh, cam.x, cam.y, cam.s, tt, dpr); else { g.fillStyle = '#88c'; g.fillRect(0, 0, sw, sh); }
  const k = dpr * cam.s;
  g.setTransform(k, 0, 0, k, -cam.x * k, -cam.y * k);
  const [x0, x1] = visibleRange();
  const bottom = cam.y + sh / cam.s + 40;
  const k0 = Math.max(0, Math.floor(x0 / BK)), k1 = Math.min(T.B.length - 1, Math.floor(x1 / BK));
  const each = (arr, fn) => { const seen = new Set(); for (let kk = k0; kk <= k1; kk++) for (const o of T.B[kk][arr]) { if (seen.has(o)) continue; seen.add(o); fn(o); } };
  // lav/çukur
  for (const p of T.pits) if (p.x1 > x0 && p.x0 < x1) A.drawPit(g, T.world, p, bottom, tt);
  // dekor (arka)
  let di = lowerBound(T.deco, x0 - 60);
  if (DBG.deco) for (; di < T.deco.length && T.deco[di].x < x1 + 60; di++) A.drawDeco(g, T.world, T.deco[di], tt);
  // düşük yerçekimi sütunları (zeminin arkasında)
  each('haz', h => { if (h.k === 'lowg') A.drawHaz(g, T.world, h, t, T, ENGINE); });
  // zemin
  let prev = null;
  const segs = [];
  each('segs', s => { if (s.x1 > x0 && s.x0 < x1) segs.push(s); });
  segs.sort((a, b) => a.x0 - b.x0);
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i], pj = i > 0 && segs[i - 1].x1 === s.x0 && segs[i - 1].y1 === s.y0, nj = i < segs.length - 1 && segs[i + 1].x0 === s.x1 && segs[i + 1].y0 === s.y1;
    const pIdx = T.segs.indexOf(s);
    const pj2 = pj || (pIdx > 0 && T.segs[pIdx - 1].x1 === s.x0 && T.segs[pIdx - 1].y1 === s.y0);
    const nj2 = nj || (pIdx >= 0 && pIdx < T.segs.length - 1 && T.segs[pIdx + 1].x0 === s.x1 && T.segs[pIdx + 1].y0 === s.y1);
    if (DBG.ground) A.drawSeg(g, T.world, s, bottom, pj2, nj2);
  }
  prev = null;
  // başlangıç, kontrol noktaları, bitiş
  if (START_X + 80 > x0 && START_X - 80 < x1) A.drawGate(g, START_X + 30, T.cps[0].y, tt, false);
  T.cps.forEach((c, i) => { if (i > 0 && c.x > x0 && c.x < x1) A.drawFlag(g, c.x, c.y, tt, L && L.r.cpi >= i, me >= 0 && V.players[me] ? V.players[me].color : null); });
  if (T.len > x0 - 100 && T.len < x1 + 100) { const s = segAtX(T.segs, T.len); A.drawGate(g, T.len, s ? s.y0 : 400, tt, true); }
  // engeller (zemin seviyesindekiler)
  each('haz', h => { if (h.k === 'mud' || h.k === 'pad' || h.k === 'conv' || h.k === 'spike' || h.k === 'spring') A.drawHaz(g, T.world, h, t, T, ENGINE); });
  each('plats', p => {
    if (p.br) {        // çöken köprü: tahta durumu bu cihazdaki koşucuya göre
      const t0 = L && L.r.br ? L.r.br.get(p.id) : null, dtp = t0 == null ? -1 : t - t0;
      const stt = dtp < 0 || dtp >= BR_BACK ? 0 : dtp < BR_FALL ? Math.max(.01, dtp / BR_FALL * .99) : 1 + (dtp - BR_FALL);
      if (p.x + p.w > x0 && p.x < x1) A.drawPlank(g, T.world, p, t, stt);
      return;
    }
    const [px, py] = platPos(p, t); if (px + p.w > x0 && px < x1) A.drawPlat(g, T.world, px, py, p.w, !!p.mv);
  });
  each('blocks', b => { if (b.x + b.w > x0 && b.x < x1) A.drawBlock(g, T.world, b, t); });
  // altınlar ve kutular
  each('coins', c => { if (!L || !L.dyn.coins.has(c.id)) A.drawCoin(g, c.x, c.y, tt, c.id); });
  each('boxes', b => { if (V.powers) A.drawBox(g, b.x, b.y, tt, L && L.dyn.boxes.has(b.id)); });
  (V.traps || []).forEach(tr => { if (tr.x > x0 && tr.x < x1 && !(L && L.dyn.slipped.has(tr.id))) A.drawBanana(g, tr.x, tr.y); });
  // koşucular
  const rtMs = raceTime() * 1000;
  const list = [];
  remotes.forEach((R, i) => {
    const s = sampleRemoteAt(R, remotePlayT(R, rtMs, dt * 1000)); if (!s || !V.players[i]) return;
    // görüntü konumu hedefe yumuşakça yaklaşır; ışınlanma/yeniden doğma gibi büyük sıçramalarda doğrudan geçer
    if (R.dx == null || Math.abs(s.x - R.dx) > 420 || Math.abs(s.y - R.dy) > 300) { R.dx = s.x; R.dy = s.y; }
    else {      // yumuşak takip; düzeltme hızı sınırlı (ani hızlanma görünmesin)
      const k2 = 1 - Math.exp(-dt * 16), cx = 900 * dt, cy = 1700 * dt;
      R.dx += clamp((s.x - R.dx) * k2, -cx, cx); R.dy += clamp((s.y - R.dy) * k2, -cy, cy);
    }
    list.push({ i, x: R.dx, y: R.dy, vx: s.vx, vy: s.vy, a: s.a, f: s.f, vis: R.vis, gnd: s.a === 0 || s.a === 3 || s.a === 7 });
    if (traceI === i && trace.length < 400) trace.push([lastFrame, R.dx, R.dy]);
  });
  bots.forEach((b, i) => list.push({ i, x: b.r.x, y: b.r.y, vx: b.r.vx, vy: b.r.vy, a: animOf(b.r), f: flagsOf(b.r), vis: b.vis, gnd: b.r.gnd, land: b.r.land }));
  if (me >= 0 && L && V.players[me]) list.push({ i: me, x: L.r.x, y: L.r.y, vx: L.r.vx, vy: L.r.vy, a: animOf(L.r), f: flagsOf(L.r), vis: L.vis, gnd: L.r.gnd, me: true, land: L.r.land });
  // hareketli engeller (koşucuların arkasında)
  each('haz', h => { if (h.k === 'hammer' || h.k === 'log' || h.k === 'geyser' || h.k === 'rock') A.drawHaz(g, T.world, h, t, T, ENGINE); });
  // isim etiketleri üst üste binmesin: yakın koşuculara farklı satır
  list.sort((a, b) => (a.me ? 1 : 0) - (b.me ? 1 : 0) || a.x - b.x);
  const rows = [];
  for (const o of list) { if (o.me) { o.row = 0; continue; } let row = 0; while (rows.some(q => q.row === row && Math.abs(q.x - o.x) < 86 && Math.abs(q.y - o.y) < 60)) row++; o.row = row; rows.push(o); }
  if (DBG.chars) for (const o of list) drawRunner(o, dt, tt);
  if (DBG.parts) drawParts(g);
  // efekt bulutları vb.
  drawStatusFx(list, tt);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (DBG.hud) drawHud(list, tt);
}
function lowerBound(arr, x) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m].x < x) lo = m + 1; else hi = m; } return lo; }
function drawRunner(o, dt, tt) {
  const p = V.players[o.i]; if (!p) return;
  const vis = o.vis;
  stepVis(vis, o.vx, o.vy, o.gnd, dt, 0);
  if (o.land && o.land > .12 && vis.lastLand !== Math.round(o.land * 100)) { vis.sq = .22; }
  vis.lastLand = o.land ? Math.round(o.land * 100) : 0;
  const blink = ((tt * 1000 + o.i * 900) % 3600) < 120;
  const k = ANIM_K[o.a] || 'run';
  // gölge
  let gy = o.y;
  if (T) { const s = support({ x: o.x }, T, Math.max(0, raceTime()), o.y - 2, o.y + 500, o.y, false); if (s) gy = s.y; }
  const hgt = Math.max(0, gy - o.y);
  g.fillStyle = `rgba(20,10,30,${.28 * Math.max(.25, 1 - hgt / 260)})`;
  g.beginPath(); g.ellipse(o.x, gy, 20 * Math.max(.4, 1 - hgt / 300), 5, 0, 0, TAU); g.fill();
  // turbo hız çizgileri
  if (o.f & 1) { g.strokeStyle = 'rgba(255,170,40,.75)'; g.lineWidth = 3; g.lineCap = 'round'; for (let n = 0; n < 4; n++) { const yy = o.y - 12 - n * 13, len = 26 + ((tt * 60 + n * 17) % 22); g.beginPath(); g.moveTo(o.x - 24 - len, yy); g.lineTo(o.x - 22, yy); g.stroke(); } }
  if (o.a === 0 || o.a === 1 || o.a === 2) trailFor(p.look, o.x, o.y, tt, vis);
  if (o.a === 0 && o.gnd && Math.random() < dt * 6) puff(o.x - 10, o.y, 1);
  if ((o.f & 16) && Math.floor(tt * 14) % 2) g.globalAlpha = .45;
  if (!o.me && p.online === false && !p.bot) g.globalAlpha = .3;
  // mıknatıs: dönen çekim halkaları
  if (o.f & 256) { g.save(); g.strokeStyle = 'rgba(255,80,110,.55)'; g.lineWidth = 2; g.setLineDash([6, 8]); g.lineDashOffset = tt * 40; for (const rr of [60, 95]) { g.beginPath(); g.arc(o.x, o.y - 30, rr - ((tt * 50) % 30), 0, TAU); g.stroke(); } g.restore(); }
  g.save(); g.translate(o.x, o.y);
  const scl = 1.05;
  g.scale(scl, scl);
  if (o.f & 64) A.drawChicken(g, p.look, { k, ph: vis.ph, t: tt + o.i });
  else A.drawChar(g, p.look, { k, ph: vis.ph, t: tt + o.i, vy: o.vy, sq: vis.sq, ear: vis.ear, tail: vis.tail, blink, dance: k === 'win' ? danceOf(p.look) : null });
  g.restore();
  g.globalAlpha = 1;
  if (k === 'win' && danceOf(p.look) === 'hearts' && Math.random() < dt * 8) parts.push({ k: 'heart', x: o.x + rnd(-20, 20), y: o.y - 60, vx: rnd(-30, 30), vy: rnd(-90, -40), r: rnd(4, 7), life: 0, max: 1, c: ['#ff3fa4', '#ff8fc8', '#ff4f6d'][Math.floor(Math.random() * 3)] });
  if (k === 'win' && danceOf(p.look) === 'disco' && Math.random() < dt * 10) sparkle(o.x + rnd(-30, 30), o.y - rnd(30, 80), `hsl(${Math.floor(Math.random() * 360)},90%,65%)`, 2);
  // yaylı ayakkabı
  if (o.f & 4) { g.strokeStyle = '#2bff88'; g.lineWidth = 2; g.beginPath(); for (let n = 0; n <= 6; n++) g.lineTo(o.x - 4 + (n % 2 ? 8 : 0), o.y - n * 2); g.stroke(); }
  // isim etiketi
  if (!o.me) {
    g.font = `800 12px ${A.FONT}`; g.textAlign = 'center'; g.textBaseline = 'bottom';
    const nm = p.name.length > 13 ? p.name.slice(0, 12) + '…' : p.name, w = g.measureText(nm).width + 12, ry = (o.row || 0) * 19;
    g.fillStyle = 'rgba(20,10,40,.6)'; A.rrect(g, o.x - w / 2, o.y - 102 - ry, w, 17, 8); g.fill();
    g.fillStyle = p.color; g.fillText(nm, o.x, o.y - 87 - ry);
  } else {
    g.fillStyle = p.color; g.beginPath(); g.moveTo(o.x - 7, o.y - 98); g.lineTo(o.x + 7, o.y - 98); g.lineTo(o.x, o.y - 89); g.closePath(); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
  }
  o.sx = o.x; o.sy = o.y;
}
function drawStatusFx(list, tt) {
  const byI = new Map(list.map(o => [o.i, o]));
  // kalkan
  list.forEach(o => {
    const p = V.players[o.i];
    if (p && p.sh) {
      const r = 46 + Math.sin(tt * 5) * 2;
      const gr = g.createRadialGradient(o.x - 12, o.y - 52, 4, o.x, o.y - 38, r);
      gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(.7, 'rgba(25,227,208,.12)'); gr.addColorStop(1, 'rgba(25,227,208,.55)');
      g.fillStyle = gr; g.beginPath(); g.arc(o.x, o.y - 38, r, 0, TAU); g.fill();
      g.strokeStyle = `hsla(${(tt * 120) % 360},90%,70%,.8)`; g.lineWidth = 2; g.stroke();
    }
    if (o.f & 2) clouds.set(o.i, Math.max(clouds.get(o.i) || 0, tt + .1));
  });
  clouds.forEach((until, i) => {
    const o = byI.get(i); if (!o || tt > until) { if (tt > until) clouds.delete(i); return; }
    const cx = o.x, cy = o.y - 118;
    g.fillStyle = '#6f7a99'; [[0, 0, 18], [-18, 4, 13], [18, 5, 14], [8, -9, 13]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(cx + dx, cy + dy, r, 0, TAU); g.fill(); });
    g.strokeStyle = 'rgba(140,190,255,.85)'; g.lineWidth = 2;
    for (let n = 0; n < 7; n++) { const xx = cx - 22 + n * 7, yy = cy + 14 + ((tt * 260 + n * 23) % 70); g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx - 2, yy + 8); g.stroke(); }
  });
  gums.forEach((until, i) => {
    const o = byI.get(i); if (!o || tt > until) { if (tt > until) gums.delete(i); return; }
    g.fillStyle = 'rgba(255,143,200,.9)'; g.beginPath(); g.ellipse(o.x, o.y - 2, 26, 8, 0, 0, TAU); g.fill();
    g.strokeStyle = '#e0569e'; g.lineWidth = 1.5; g.stroke(); g.beginPath(); g.ellipse(o.x - 6, o.y - 4, 5, 2, 0, 0, TAU); g.fillStyle = 'rgba(255,255,255,.6)'; g.fill();
  });
  bolts.forEach(b => {
    const o = byI.get(b.i); if (!o) return;
    g.strokeStyle = `rgba(255,240,120,${1 - b.life * 2})`; g.lineWidth = 5; g.shadowColor = '#ffe14a'; g.shadowBlur = 14;
    g.beginPath(); let x = o.x + 10, y = o.y - 420; g.moveTo(x, y);
    const rr = mulberry(b.seed); while (y < o.y - 40) { x += (rr() - .5) * 40; y += 30 + rr() * 30; g.lineTo(x, y); }
    g.stroke(); g.shadowBlur = 0;
  });
  beams.forEach(b => {
    const f = byI.get(b.from), o = byI.get(b.to); if (!f || !o) return;
    g.strokeStyle = `rgba(255,59,92,${.8 - b.life})`; g.lineWidth = 3; g.setLineDash([10, 8]); g.lineDashOffset = -b.life * 120;
    g.beginPath(); g.moveTo(f.x, f.y - 40); g.lineTo(o.x, o.y - 40); g.stroke(); g.setLineDash([]);
  });
}
function drawHud(list, tt) {
  const rt = raceTime();
  const n = V.players.length;
  // ilerleme çubuğu
  const bx = Math.max(56, sw * .14), bw = sw - bx - Math.max(80, sw * .14), by = 16;
  g.fillStyle = 'rgba(20,10,40,.55)'; A.rrect(g, bx - 6, by - 6, bw + 12, 12, 6); g.fill();
  g.fillStyle = 'rgba(255,255,255,.25)'; A.rrect(g, bx, by - 2, bw, 4, 2); g.fill();
  g.font = '15px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🏁', bx + bw + 12, by);
  const prog = i => { const p = V.players[i]; if (p.fin != null) return 1; const b = book[i]; return clamp(((b ? b.x : START_X) - START_X) / (T.len - START_X), 0, 1); };
  const order = V.players.map((p, i) => i).sort((a, b) => (a === me) - (b === me));
  const hs = sw < 500 ? 22 : 26;
  order.forEach(i => {
    const p = V.players[i]; const x = bx + bw * prog(i);
    const ic = A.headIcon(p.look, hs * 2, p.color);
    const s = i === me ? hs * 1.15 : hs * .9;
    g.drawImage(ic, x - s / 2, by + 6, s, s);
  });
  // sıra
  if (me >= 0 && V.players[me]) {
    const place = myPlace();
    const col = place === 1 ? '#ffe14a' : place === 2 ? '#dfe6f2' : place === 3 ? '#ffb27a' : '#ffffff';
    g.textAlign = 'left'; g.textBaseline = 'top';
    g.font = `900 ${sw < 500 ? 30 : 40}px ${A.FONT}`;
    g.lineWidth = 6; g.strokeStyle = 'rgba(30,10,50,.85)'; g.strokeText(place + '.', 12, 34); g.fillStyle = col; g.fillText(place + '.', 12, 34);
    const pw = g.measureText(place + '.').width;
    g.font = `800 ${sw < 500 ? 13 : 16}px ${A.FONT}`; g.strokeText('/' + n, 16 + pw, sw < 500 ? 48 : 56); g.fillStyle = '#fff'; g.fillText('/' + n, 16 + pw, sw < 500 ? 48 : 56);
    g.font = `800 ${sw < 500 ? 12 : 14}px ${A.FONT}`; const cs = '🪙 ' + (L ? L.dyn.coins.size : 0);
    g.strokeText(cs, 13, sw < 500 ? 70 : 84); g.fillStyle = '#ffe14a'; g.fillText(cs, 13, sw < 500 ? 70 : 84);
  }
  // süre
  g.textAlign = 'right'; g.textBaseline = 'top'; g.font = `800 ${sw < 500 ? 14 : 18}px ${A.FONT}`;
  const myFin = me >= 0 && L && L.r.fin;
  const tStr = fmtMs(Math.max(0, (myFin ? L.r.finT : rt) * 1000));
  g.lineWidth = 5; g.strokeStyle = 'rgba(30,10,50,.85)'; g.strokeText(tStr, sw - 12, 36); g.fillStyle = '#fff'; g.fillText(tStr, sw - 12, 36);
  // masaüstü güç yuvası
  if (!isTouch() && me >= 0 && V.powers) {
    const pw = V.myPw && !usedPend ? V.myPw : null, spin = pickPend && !V.myPw;
    const x = sw - 46, y = sh - 50;
    g.fillStyle = 'rgba(20,10,40,.6)'; A.rrect(g, x - 34, y - 34, 68, 68, 16); g.fill(); g.strokeStyle = pw ? POWERS[pw].c : 'rgba(255,255,255,.3)'; g.lineWidth = 3; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '34px sans-serif';
    if (pw) g.fillText(POWERS[pw].i, x, y - 2); else if (spin) g.fillText(POWERS[PW_IDS[Math.floor(tt * 14) % PW_IDS.length]].i, x, y - 2);
    else { g.fillStyle = 'rgba(255,255,255,.35)'; g.font = `900 26px ${A.FONT}`; g.fillText('?', x, y); }
    g.font = `800 11px ${A.FONT}`; g.fillStyle = '#fff'; g.fillText(pw ? 'E: ' + POWERS[pw].n : 'GÜÇ', x, y + 44);
  }
  // geri sayım
  if (rt < .9 && rt > -3.6) {
    const c = Math.ceil(-rt), txt = rt < 0 ? String(c) : 'KOŞ!';
    const fr = rt < 0 ? 1 - ((-rt) % 1) : rt / .9;
    if (c !== countLast) { countLast = c; if (rt < 0 && c <= 3) SFX.count(false); }
    if (rt >= 0 && countLast !== -1) { countLast = -1; SFX.count(true); }
    const s = rt < 0 ? 1.4 - fr * .5 : 1 + fr * .6;
    g.save(); g.translate(sw / 2, sh * .42); g.scale(s, s); g.globalAlpha = rt < 0 ? 1 : 1 - fr;
    g.font = `900 ${Math.round(Math.min(sw, sh * 1.6) * .16)}px ${A.FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = '#2b1030'; g.strokeText(txt, 0, 0);
    const gr = g.createLinearGradient(0, -60, 0, 60); gr.addColorStop(0, '#fff6b0'); gr.addColorStop(.55, '#ffb627'); gr.addColorStop(1, '#ff6a1a'); g.fillStyle = gr; g.fillText(txt, 0, 0);
    g.restore();
  }
  // bitirince
  if (myFin) {
    const fin = V.players[me].fin, place = myPlace();
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${Math.round(Math.min(40, sw * .07))}px ${A.FONT}`; g.lineWidth = 8; g.strokeStyle = '#2b1030';
    const txt = place === 1 ? '🏆 BİRİNCİ!' : `${place}. OLDUN!`;
    g.strokeText(txt, sw / 2, sh * .3); g.fillStyle = place === 1 ? '#ffe14a' : '#fff'; g.fillText(txt, sw / 2, sh * .3);
    const left = V.endAt ? Math.max(0, Math.ceil((V.endAt - hostNow()) / 1000)) : 0;
    const waiting = V.players.some((p, i) => p.fin == null && (p.bot || p.online));
    if (waiting) { g.font = `800 ${sw < 500 ? 12 : 15}px ${A.FONT}`; g.lineWidth = 5; const s2 = `Diğerleri bekleniyor${left ? ` · ${left} sn` : '…'}`; g.strokeText(s2, sw / 2, sh * .3 + 34); g.fillStyle = '#fff'; g.fillText(s2, sw / 2, sh * .3 + 34); }
    g.restore();
    void fin;
  }
  // mesajlar
  msgs.forEach((m, k) => {
    const a = Math.min(1, m.life / .15, (m.max - m.life) / .3);
    g.save(); g.globalAlpha = clamp(a, 0, 1); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 ${sw < 500 ? 13 : 16}px ${A.FONT}`;
    const y = (sw < 500 ? 58 : 66) + k * 26, w = g.measureText(m.txt).width + 24;
    g.fillStyle = 'rgba(20,10,40,.72)'; A.rrect(g, sw / 2 - w / 2, y - 12, w, 24, 12); g.fill();
    g.fillStyle = m.c || '#fff'; g.fillText(m.txt, sw / 2, y + 1); g.restore();
  });
}
function myPlace() {
  if (me < 0 || !V.players[me]) return 0;
  const prog = i => { const p = V.players[i]; if (p.fin != null) return 1e9 - p.fin; const b = book[i]; return b ? (b.fin != null ? 1e9 - b.fin : b.x) : START_X; };
  const m = prog(me);
  return 1 + V.players.filter((p, i) => i !== me && prog(i) > m).length;
}
function note(txt, c) { msgs.unshift({ txt, c, life: 0, max: 2.6 }); if (msgs.length > 3) msgs.length = 3; }

/* ---------- güç/olay tepkileri ---------- */
function onEvent(e, api) {
  if (!root) return;
  switch (e.t) {
    case 'race': banner(`${WORLD_INFO[e.world].i} ${WORLD_INFO[e.world].n}`.toLocaleUpperCase('tr-TR'), 'good'); Sound.special(); break;
    case 'lobby': break;
    case 'ready': if (e.pi !== me && e.on) Sound.tick(.4); break;
    case 'got': if (e.pi === me) { pickPend = 0; } break;
    case 'fin': {
      const p = V && V.players[e.pi];
      if (p && e.pi !== me) note(`${p.name} bitirdi: ${e.place}.`, p.color);
      if (e.place === 1 && e.pi !== me) Sound.good();
      break;
    }
    case 'results': Sound.fanfare(); break;
    case 'fx': applyEventFx(e); break;
    default: break;
  }
}
function runnerPos(i) {
  if (i === me && L) return L.r;
  const b = bots.get(i); if (b) return b.r;
  const R = remotes.get(i); if (R) return sampleRemote(R, raceTime() * 1000);
  return null;
}
function applyEventFx(e) {
  const tt = nowMs() / 1000;
  const kind = FX_OF[e.pw];
  if (e.by === me && e.pw) usedPend = null;
  // hedeflere etki
  const selfPw = e.pw === 'turbo' || e.pw === 'miknatis' || e.pw === 'isinlan';
  (e.to || []).forEach(i => {
    if (e.pw === 'muz' && i === me && L && e.trapId && L.dyn.slipped.has(e.trapId)) return;     // zaten kaydı
    const pos0 = runnerPos(i), ox = pos0 ? pos0.x : 0, oy = pos0 ? pos0.y : 0;
    const fxOn = r => { if (kind === 'tele') { if (T) teleport(r, T, Math.max(0, raceTime())); } else applyFx(r, kind); };
    if (i === me && L) fxOn(L.r);
    const b = bots.get(i); if (b) { if (!(e.pw === 'muz' && e.trapId && b.dyn.slipped.has(e.trapId))) fxOn(b.r); }
    const pos = runnerPos(i);
    if (pos && !selfPw) { comic(pos.x, pos.y - 70, COMIC[kind] || 'PAT!'); starsBurst(pos.x, pos.y - 50); }
    if (e.pw === 'isinlan' && pos0) { sparkle(ox, oy - 30, '#b48cff', 14); if (pos) { sparkle(pos.x, pos.y - 30, '#ffffff', 14); ring(pos.x, pos.y - 10); } SFX.zap(); }
    if (e.pw === 'yay' && pos) { puff(pos.x, pos.y, 8, '#ffffff'); SFX.boing(); }
    if (e.pw === 'kukreme' && pos) ring(pos.x, pos.y - 30);
    if (e.pw === 'tavuk' && pos) { puff(pos.x, pos.y - 30, 12, '#ffffff'); if (Sound.ok('kcluck', 300)) { Sound.tone(700, .08, { type: 'square', gain: .06, slide: 500 }); Sound.tone(900, .1, { type: 'square', gain: .06, slide: 600, when: .1 }); } }
    if (e.pw === 'bulut') clouds.set(i, tt + 3);
    if (e.pw === 'sakiz') gums.set(i, tt + 1.2);
    if (e.pw === 'simsek') bolts.push({ i, life: 0, seed: (Math.random() * 1e9) | 0 });
    if (e.pw === 'kukreme' && i !== e.by) beams.push({ from: e.by, to: i, life: 0 });
    if (i === me && e.by !== me) { flashStage(); }
    if (e.by === me && i !== me && L) { L.stats.hitGiven++; if (e.pw === 'muz') L.stats.bananaHits++; if (e.pw === 'simsek') L.stats.zapHits++; if (e.pw === 'kukreme') L.stats.roarHits++; }
  });
  (e.blk || []).forEach(i => { const pos = runnerPos(i); if (pos) comic(pos.x, pos.y - 70, 'ENGEL!', '#19e3d0'); if (i === me && L) L.stats.blocks++; });
  if (e.pw === 'simsek') { SFX.zap(); if (stageEl) { stageEl.classList.remove('ky-zap'); void stageEl.offsetWidth; stageEl.classList.add('ky-zap'); } }
  else if (e.pw === 'kukreme') { if (Sound.ok('kroar', 400)) { Sound.noise(.5, { filter: 'lowpass', freq: 380, gain: .5, decayPow: 1.4 }); Sound.tone(110, .45, { type: 'sawtooth', gain: .1, slide: 70 }); } if (stageEl && (e.to || []).includes(me)) flashStage(); }
  else if (e.pw === 'turbo' && e.by === me) Sound.whoosh();
  else if ((e.to || []).includes(me) && e.by !== me) SFX.hit();
  const byName = V && V.players[e.by] ? V.players[e.by].name : '';
  if ((e.to || []).includes(me) && e.by !== me && POWERS[e.pw]) note(`${POWERS[e.pw].i} ${byName}: ${POWERS[e.pw].n}!`, '#ff8fa3');
  else if ((e.blk || []).includes(me)) note('🛡️ Kalkan saldırıyı engelledi!', '#19e3d0');
  else if (e.by === me && e.pw && POWERS[e.pw] && e.pw !== 'muz') note(`${POWERS[e.pw].i} ${POWERS[e.pw].n}${(e.to || []).filter(i => i !== me).length ? ' isabet!' : ''}`, POWERS[e.pw].c);
  else if (e.by === me && e.pw === 'muz' && !e.trapId) note('🍌 Muz kabuğu bırakıldı!', '#ffe14a');
  else if (e.trapId && e.by === me && (e.to || []).length) note(`🍌 ${V.players[e.to[0]] ? V.players[e.to[0]].name : ''} muzuna bastı!`, '#ffe14a');
}

/* ---------- DOM ---------- */
function mountDom() {
  root.innerHTML = `<div class="ky" data-phase="">
    <div class="ky-lobby" hidden></div>
    <div class="ky-race" hidden>
      <div class="ky-stage"><canvas class="ky-cv" aria-label="Yarış pisti"></canvas></div>
      <div class="ky-pad" hidden>
        <button type="button" class="ky-btn ky-b-slide" data-ctl="s" aria-label="Kay"><b>⬇</b><span>KAY</span></button>
        <button type="button" class="ky-btn ky-b-pow" data-ctl="p" aria-label="Güç kullan"><b class="ky-powi">?</b><span class="ky-pown">GÜÇ</span></button>
        <button type="button" class="ky-btn ky-b-jump" data-ctl="j" aria-label="Zıpla"><b>⬆</b><span>ZIPLA</span></button>
      </div>
      <div class="ky-live"></div>
      <p class="ky-keys">⌨️ <b>Boşluk / ↑</b> zıpla (basılı tut: yüksek, havada: çift zıplama) · <b>↓</b> kay / hızlı in · <b>E</b> güç kullan</p>
      <div class="ky-ovl" hidden></div>
    </div>
  </div>`;
  cv = q('.ky-cv'); g = cv.getContext('2d'); stageEl = q('.ky-stage');
  const pad = q('.ky-pad');
  const setCtl = (k, on) => { if (k === 'j') touch.j = on; else if (k === 's') touch.s = on; };
  pad.addEventListener('pointerdown', e => { const b = e.target.closest('[data-ctl]'); if (!b) return; e.preventDefault(); Sound.init(); try { b.setPointerCapture(e.pointerId); } catch { /* */ } b.classList.add('on'); if (b.dataset.ctl === 'p') usePower(); else setCtl(b.dataset.ctl, true); });
  const up = e => { const b = e.target.closest('[data-ctl]'); if (!b) return; b.classList.remove('on'); setCtl(b.dataset.ctl, false); };
  pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up); pad.addEventListener('lostpointercapture', up);
  pad.addEventListener('contextmenu', e => e.preventDefault());
  // tuvale dokunma: zıpla; aşağı kaydırma: kay
  let cp = null;
  cv.addEventListener('pointerdown', e => { if (!V || V.phase !== 'race') return; e.preventDefault(); Sound.init(); cp = { id: e.pointerId, y: e.clientY }; touch.j = true; try { cv.setPointerCapture(e.pointerId); } catch { /* */ } });
  cv.addEventListener('pointermove', e => { if (!cp || e.pointerId !== cp.id) return; if (e.clientY - cp.y > 28) { touch.j = false; touch.s = true; } });
  const cup = e => { if (!cp || e.pointerId !== cp.id) return; cp = null; touch.j = false; touch.s = false; };
  cv.addEventListener('pointerup', cup); cv.addEventListener('pointercancel', cup);
  root.addEventListener('click', onClick);
  addEventListener('keydown', onKey); addEventListener('keyup', onKey); addEventListener('blur', onBlur);
  ro = new ResizeObserver(() => resize()); ro.observe(root);
  addEventListener('resize', resize);
}
function onBlur() { keys.j = keys.s = false; touch.j = touch.s = false; }
function onKey(e) {
  if (!root || !V || V.phase !== 'race') return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const down = e.type === 'keydown';
  const c = e.code;
  if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW') { keys.j = down; e.preventDefault(); }
  else if (c === 'ArrowDown' || c === 'KeyS') { keys.s = down; e.preventDefault(); }
  else if ((c === 'KeyE' || c === 'KeyQ' || c === 'Enter' || c === 'ShiftRight') && down && !e.repeat) { usePower(); e.preventDefault(); }
}
function updatePad() {
  const b = q('.ky-b-pow'); if (!b || !V) return;
  const pw = V.myPw && !usedPend ? V.myPw : null;
  b.classList.toggle('has', !!pw); b.disabled = !V.powers;
  q('.ky-powi').textContent = pw ? POWERS[pw].i : (pickPend && !V.myPw ? '🎰' : '?');
  q('.ky-pown').textContent = pw ? POWERS[pw].s : (V.powers ? 'GÜÇ' : 'KAPALI');
  if (pw) b.style.setProperty('--pc', POWERS[pw].c); else b.style.removeProperty('--pc');
}
let liveAt = 0;
function hudTick() {
  if (pickPend && nowMs() - pickPend > 2500) pickPend = 0;
  updatePad();
  const t = nowMs(); if (t - liveAt < 400) return; liveAt = t;
  const el = q('.ky-live'); if (!el || !V || !T || el.offsetParent === null) return;
  const prog = i => { const p = V.players[i]; if (p.fin != null) return 1e9 - p.fin; const b = book[i]; return b ? (b.fin != null ? 1e9 - b.fin : b.x) : START_X; };
  const order = V.players.map((p, i) => i).sort((a, b) => prog(b) - prog(a));
  const sig = order.join(',') + '|' + order.map(i => V.players[i].fin != null ? 'f' : Math.round(clamp((prog(i) - START_X) / (T.len - START_X), 0, 1) * 20)).join(',');
  if (el.dataset.sig === sig) return; el.dataset.sig = sig;
  el.innerHTML = order.map((i, k) => { const p = V.players[i], pr = p.fin != null ? 100 : Math.round(clamp((prog(i) - START_X) / (T.len - START_X), 0, 1) * 100);
    return `<div class="${i === me ? 'me' : ''}" style="--pc:${p.color}"><span>${k + 1}.</span><b>${esc(p.name)}</b><i><em style="width:${pr}%"></em></i><small>${p.fin != null ? fmtMs(p.fin) : pr + '%'}</small></div>`; }).join('');
}

/* ---------- lobi / mağaza / gardırop ---------- */
function charCanvas(look, size, pose) {
  const c = document.createElement('canvas'), d = Math.min(2, window.devicePixelRatio || 1);
  c.width = c.height = Math.round(size * d); c.style.width = c.style.height = size + 'px';
  const x = c.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0);
  const s = size / 92;
  x.translate(size / 2 - 2 * s, size * .86); x.scale(s, s);
  x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.ellipse(0, 0, 22, 5, 0, 0, TAU); x.fill();
  A.drawChar(x, look, Object.assign({ k: 'idle', t: 1.3 }, pose || {}));
  return c;
}
function myLook() { return profile.look; }
// satın alma onayı bekleyen eşyayı büyük önizlemede dene
function previewLookOf() {
  const it = buyArm && SHOP.BYID[buyArm]; if (!it) return profile.look;
  const lk = Object.assign({}, profile.look); if (it.s === 'char') lk.char = it.id; else lk[it.s] = it.id;
  if (it.s === 'costume') { lk.shirt = null; lk.pants = null; }
  return lk;
}
function buildLobby() {
  const el = q('.ky-lobby');
  el.innerHTML = `<div class="ky-lhead">
      <span class="ky-garage">🏠 GARAJ</span><span class="ky-chip ky-racechip"></span><span class="ky-world"></span><span class="ky-ltimer"></span>
    </div>
    <div class="ky-roster"></div>
    <div class="ky-lmain">
      <nav class="ky-tabs" role="tablist">
        <button type="button" data-tab="gardirop">👗 Gardırop</button><button type="button" data-tab="magaza">🛍️ Mağaza</button>
        <button type="button" data-tab="gorev">🎯 Görevler</button><button type="button" data-tab="lider">🏆 Liderlik</button>
      </nav>
      <div class="ky-tabbody"></div>
    </div>
    <div class="ky-readybar">
      <span class="ky-gold" title="Altının">🪙 <b></b></span><span class="ky-lvl" title="Seviye"></span>
      <button type="button" class="ky-force btn btn-ghost" hidden>Beklemeden başlat</button>
      <button type="button" class="ky-ready">HAZIRIM ✓</button>
    </div>`;
  renderTab();
}
let previewCv = null, previewLook = '', spinAt = 0;
function drawPreview() {
  if (!previewCv || !root || tab !== 'gardirop') return;
  const x = previewCv.getContext('2d'), d = previewCv._d || 1, w = previewCv.width / d, h = previewCv.height / d;
  x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, w, h);
  const tt = nowMs() / 1000;
  const gr = x.createRadialGradient(w / 2, h * .8, 10, w / 2, h * .7, w * .6); gr.addColorStop(0, 'rgba(255,255,255,.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, w, h);
  const s = Math.min(w, h) / 92;
  x.save(); x.translate(w / 2, h * .88);
  x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(0, 0, 26 * s, 6 * s, 0, 0, TAU); x.fill();
  x.scale(s, s);
  const sp = (tt - spinAt);
  if (sp < .7) x.scale(Math.cos(sp / .7 * TAU), 1);
  const vis = previewCv._vis || (previewCv._vis = newVis());
  stepVis(vis, 0, Math.sin(tt * 2) * 60, true, 1 / 60, 0);
  const dancing = wslot === 'dance' || (tt % 9) > 7.2, plk = previewLookOf();
  A.drawChar(x, plk, { k: dancing ? 'win' : 'idle', t: tt, wave: true, ear: vis.ear, tail: Math.sin(tt * 2.2) * .25, blink: (tt * 1000 % 3400) < 120, dance: danceOf(plk) });
  // seçili iz efektini önizlemede göster
  const tr = plk.trail && SHOP.BYID[plk.trail];
  if (tr) { x.globalAlpha = .9; for (let k = 0; k < 7; k++) { const u = ((tt * .8 + k / 7) % 1); x.fillStyle = (tr.c && tr.c[k % Math.max(1, tr.c.length)]) || A.RAINBOW[k % 6]; const px = -18 - u * 40, py = -20 - Math.sin(u * 6 + k) * 10 - k * 3; if (tr.st === 'hearts') { A.heart(x, px, py, 3.4); x.fill(); } else { A.star(x, px, py, 3.2, 5, .45); x.fill(); } } x.globalAlpha = 1; }
  x.restore();
}
function itemCard(it, mode) {
  const owned = profile.owned.includes(it.id), eq = profile.look[it.s] === it.id;
  const price = SHOP.priceOf(it.id), rot = SHOP.dailyShop(SHOP.today()).includes(it.id);
  const rar = SHOP.RARITY[it.r];
  let act;
  if (owned) act = eq ? (it.s === 'char' ? '<span class="ky-st on">Seçili</span>' : '<span class="ky-st on">Giyili ✓</span>') : '<span class="ky-st">Giy</span>';
  else if (it.ach) { const a = SHOP.ACH.find(x => x.id === it.ach); act = `<span class="ky-st lock">🏅 ${esc(a ? a.n : 'Başarım')}</span>`; }
  else if (it.rot && !rot) act = '<span class="ky-st lock">⏳ Vitrinde</span>';
  else act = `<span class="ky-st buy ${profile.gold >= price ? '' : 'poor'}">🪙 ${fmtG(price)}${rot && price < it.p ? ` <s>${fmtG(it.p)}</s>` : ''}</span>`;
  return `<button type="button" class="ky-item ${eq ? 'eq' : ''} ${owned ? 'own' : ''}" data-item="${it.id}" style="--rc:${rar.c}">
    <span class="ky-ipv" data-pv="${it.id}"></span><b>${esc(it.n)}</b><small>${rar.n}${it.rot ? ' · nadir vitrin' : ''}</small>${act}</button>`;
}
function fillPreviews(scope) {
  (scope || q('.ky-tabbody')).querySelectorAll('[data-pv]').forEach(sp => {
    const it = SHOP.BYID[sp.dataset.pv]; if (!it) return;
    const look = Object.assign({}, profile.look);
    if (it.s === 'char') { look.char = it.id; } else look[it.s] = it.id;
    if (it.s === 'costume') { look.shirt = null; look.pants = null; }
    sp.innerHTML = '';
    sp.appendChild(charCanvas(look, 76, it.s === 'dance' ? { k: 'win', t: it.st === 'flip' ? 1.5 : .45, dance: it.st } : { k: 'idle', t: 1.1 }));
    if (it.s === 'trail' || it.s === 'dance') { const b = document.createElement('i'); b.className = 'ky-ibadge'; b.textContent = it.s === 'trail' ? '✨' : '💃'; sp.appendChild(b); }
  });
}
function renderTab() {
  const body = q('.ky-tabbody'); if (!body) return;
  root.querySelectorAll('.ky-tabs [data-tab]').forEach(b => { b.classList.toggle('on', b.dataset.tab === tab); b.setAttribute('aria-selected', b.dataset.tab === tab); });
  previewCv = null;
  if (tab === 'gardirop') {
    const items = SHOP.CATALOG.filter(it => it.s === wslot);
    const ownedFirst = items.slice().sort((a, b) => (profile.owned.includes(b.id) - profile.owned.includes(a.id)) || a.r - b.r || a.p - b.p);
    body.innerHTML = `<div class="ky-ward">
      <div class="ky-pvbox"><canvas class="ky-pv"></canvas><p class="ky-note">Kozmetikler sadece görünüştür; hıza ve güçlere etkisi yoktur.</p></div>
      <div class="ky-wright">
        <div class="ky-slots">${SHOP.SLOTS.map(s => `<button type="button" data-wslot="${s.k}" class="${s.k === wslot ? 'on' : ''}"><i>${s.i}</i>${s.n}${profile.look[s.k] && s.k !== 'char' ? '<em></em>' : ''}</button>`).join('')}</div>
        ${wslot !== 'char' && profile.look[wslot] ? `<button type="button" class="ky-unequip" data-unequip="${wslot}">✕ ${esc(SHOP.SLOTS.find(s => s.k === wslot).n)} çıkar</button>` : ''}
        <div class="ky-grid">${ownedFirst.map(it => itemCard(it)).join('')}</div>
      </div></div>`;
    previewCv = q('.ky-pv');
    const d = Math.min(2, window.devicePixelRatio || 1), sz = innerWidth < 760 ? 150 : 220;
    previewCv.width = previewCv.height = Math.round(sz * d); previewCv.style.width = previewCv.style.height = sz + 'px'; previewCv._d = d;
    fillPreviews(body);
  } else if (tab === 'magaza') {
    const day = SHOP.dailyShop(SHOP.today());
    const all = SHOP.CATALOG.filter(it => !it.free && (sslot === 'all' || it.s === sslot)).sort((a, b) => a.r - b.r || a.p - b.p);
    body.innerHTML = `<div class="ky-shop">
      <div class="ky-egg"><span class="ky-eggi" aria-hidden="true">🥚</span><div><b>Sürpriz Yumurta</b><small>Rastgele bir kozmetik! Nadirlik şansı: Sıradan %${SHOP.EGG_W[0]} · Nadir %${SHOP.EGG_W[1]} · Epik %${SHOP.EGG_W[2]} · Efsanevi %${SHOP.EGG_W[3]}. Sende olan çıkarsa fiyatının %40'ı altın geri gelir.</small></div>
        <button type="button" class="ky-eggbtn ${profile.gold >= SHOP.EGG_PRICE ? '' : 'poor'}" data-egg="1">Aç · 🪙 ${fmtG(SHOP.EGG_PRICE)}</button></div>
      <div class="ky-daily"><h3>⭐ Haftanın Vitrini <small>%25 indirim · yenilenmesine <span class="ky-reset" data-week="1"></span></small></h3>
        <div class="ky-grid ky-row">${day.map(id => itemCard(SHOP.BYID[id])).join('')}</div></div>
      <div class="ky-filter">${[{ k: 'all', n: 'Tümü', i: '🛍️' }].concat(SHOP.SLOTS).map(s => `<button type="button" data-sslot="${s.k}" class="${s.k === sslot ? 'on' : ''}">${s.i} ${s.n}</button>`).join('')}</div>
      <div class="ky-grid">${all.map(it => itemCard(it)).join('')}</div>
      <p class="ky-note">Altın; yarış sırası, süre (par altı bonus), kusursuz koşu, kullanılan güçler ve parkurda toplanan altınlardan kazanılır. ${SHOP.CATALOG.length} eşya · ${SHOP.CATALOG.filter(i => i.ach).length} tanesi başarımla açılır.</p>
    </div>`;
    fillPreviews(body);
  } else if (tab === 'gorev') {
    const daily = SHOP.ensureDaily(profile), lv = SHOP.levelOf(profile.xp);
    body.innerHTML = `<div class="ky-quests">
      <div class="ky-level"><span class="ky-lvbadge">${lv.lvl}</span><div><b>Seviye ${lv.lvl}</b><div class="ky-bar"><i style="width:${Math.round(lv.cur / lv.need * 100)}%"></i></div><small>${lv.cur}/${lv.need} deneyim · seviye atlayınca altın ödülü · giriş serisi: ${(profile.login && profile.login.streak) || 0} gün 🔥</small></div></div>
      <h3>🎯 Günlük Görevler <small>yenilenmesine <span class="ky-reset"></span></small></h3>
      ${daily.q.map(qq => { const i = SHOP.questInfo(qq); return `<div class="ky-quest ${i.done ? 'done' : ''}"><div><b>${esc(i.text)}</b><div class="ky-bar"><i style="width:${Math.round(i.n / i.goal * 100)}%"></i></div></div><span>${i.done ? '✅' : `${i.n}/${i.goal}`}<small>🪙 ${i.g}</small></span></div>`; }).join('')}
      <h3>🏅 Başarımlar <small>${Object.keys(profile.ach).length}/${SHOP.ACH.length}</small></h3>
      <div class="ky-achs">${SHOP.ACH.map(a => `<div class="ky-ach ${profile.ach[a.id] ? 'on' : ''}"><b>${profile.ach[a.id] ? '🏅' : '🔒'} ${esc(a.n)}</b><small>${esc(a.d)}</small><em>🪙 ${a.g}${a.item ? ` + ${esc(SHOP.BYID[a.item].n)}` : ''}</em></div>`).join('')}</div>
    </div>`;
  } else {
    const w = body.dataset.lw && WORLD_INFO[body.dataset.lw] ? body.dataset.lw : (V && V.world) || 'seker';
    const ln = body.dataset.ll && LEN_INFO[body.dataset.ll] ? body.dataset.ll : (V && V.len) || 'orta';
    const bkey = SHOP.boardKey(w, ln);
    const list = profile.board[bkey] || [];
    const s = profile.stats;
    body.dataset.lw = w; body.dataset.ll = ln;
    const pts = V ? V.players.map((p, i) => i).sort((a, b) => V.players[b].pts - V.players[a].pts) : [];
    body.innerHTML = `<div class="ky-board">
      ${V && V.race > 1 ? `<div class="ky-stand"><h3>🏟️ ODA SIRALAMASI</h3>${pts.map((i, k) => `<span style="--pc:${V.players[i].color}">${k + 1}. ${esc(V.players[i].name)} <b>${V.players[i].pts}</b></span>`).join('')}</div>` : ''}
      <div class="ky-filter">${WORLD_IDS.map(k => `<button type="button" data-lw="${k}" class="${k === w ? 'on' : ''}">${WORLD_INFO[k].i} ${WORLD_INFO[k].n}</button>`).join('')}</div>
      <div class="ky-filter">${Object.keys(LEN_INFO).map(k => `<button type="button" data-ll="${k}" class="${k === ln ? 'on' : ''}">📏 ${LEN_INFO[k].n}</button>`).join('')}</div>
      ${list.length ? `<ol class="ky-lb">${list.slice(0, 10).map((x, k) => `<li class="${x.me ? 'me' : ''}"><span>${['🥇', '🥈', '🥉'][k] || (k + 1) + '.'}</span><b>${esc(x.name)}</b><em>${fmtMs(x.ms)}</em><small>${esc(x.date.slice(5).split('-').reverse().join('.'))}</small></li>`).join('')}</ol>` : '<p class="ky-note">Bu parkurda henüz kayıtlı süre yok. İlk rekoru sen kır!</p>'}
      <div class="ky-stats"><span>🏁 <b>${s.races}</b> yarış</span><span>🏆 <b>${s.wins}</b> galibiyet</span><span>🥉 <b>${s.podiums}</b> podyum</span><span>🪙 <b>${fmtG(s.goldEarned)}</b> kazanılan</span><span>⚡ <b>${Object.values(s.pw).reduce((a, b) => a + b, 0)}</b> güç</span><span>⏱️ Rekor: <b>${fmtMs(profile.best[bkey])}</b></span><span>⭐ Seviye <b>${SHOP.levelOf(profile.xp).lvl}</b></span></div>
      <p class="ky-note">Liderlik bu cihazdaki oyuncuyu ve yarıştığın arkadaşlarının en iyi sürelerini gösterir.</p>
    </div>`;
  }
  updateLobbyBar();
  resetTimers();
}
function resetTimers() {
  const el = root && root.querySelectorAll('.ky-reset'); if (!el || !el.length) return;
  const d = new Date(), m = new Date(d); m.setHours(24, 0, 0, 0);
  const s = Math.max(0, Math.floor((m - d) / 1000));
  const txt = `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const wd = (8 - (d.getDay() || 7)) % 7;           // pazartesiye kalan gün
  el.forEach(x => { x.textContent = x.dataset.week ? (wd ? `${wd} gün ` : '') + txt : txt; });
}
function updateLobbyBar() {
  const gb = q('.ky-gold b'); if (gb) gb.textContent = fmtG(profile.gold);
  const lvEl = q('.ky-lvl'); if (lvEl) { const lv = SHOP.levelOf(profile.xp); lvEl.innerHTML = `⭐ ${lv.lvl}<i style="--w:${Math.round(lv.cur / lv.need * 100)}%"></i>`; }
  if (!V || V.phase !== 'lobby') return;
  const rb = q('.ky-ready'); if (!rb) return;
  const mine = me >= 0 && V.players[me] ? V.players[me].ready : false;
  rb.classList.toggle('on', !!mine); rb.textContent = me < 0 ? 'İZLİYORSUN' : mine ? 'HAZIRSIN ✓ (iptal)' : 'HAZIRIM ✓'; rb.disabled = me < 0;
  const f = q('.ky-force'); if (f) f.hidden = !(ui.isHost && ui.mode === 'online');
}
function renderLobby() {
  if (built !== 'lobby') { buildLobby(); built = 'lobby'; }
  q('.ky-racechip').textContent = `YARIŞ ${V.race}/${V.races}`;
  q('.ky-world').textContent = `${WORLD_INFO[V.world].i} ${WORLD_INFO[V.world].n} · ${LEN_INFO[V.len] ? LEN_INFO[V.len].n : 'Orta'}`;
  q('.ky-world').dataset.w = V.world;
  const roster = q('.ky-roster');
  const sig = JSON.stringify(V.players.map(p => [p.name, p.look, p.ready, p.online, p.pts]));
  if (roster.dataset.sig !== sig) {
    roster.dataset.sig = sig;
    roster.innerHTML = V.players.map((p, i) => `<div class="ky-pl ${p.ready ? 'rdy' : ''} ${p.online ? '' : 'off'} ${i === me ? 'me' : ''}" style="--pc:${p.color}"><span class="ky-plc" data-pl="${i}"></span><b>${esc(p.name)}${i === me ? ' <small>(sen)</small>' : ''}</b><em>${p.bot ? '🤖 hazır' : !p.online ? 'bağlantı yok' : p.ready ? '✅ hazır' : '⏳ seçiyor'}</em>${V.race > 1 ? `<i>${p.pts} puan</i>` : ''}</div>`).join('');
    roster.querySelectorAll('[data-pl]').forEach(sp => { const p = V.players[+sp.dataset.pl]; sp.appendChild(charCanvas(p.look, 64, { k: 'idle', t: +sp.dataset.pl })); });
  }
  updateLobbyBar(); lobbyTick();
}
function lobbyTick() {
  if (!V || V.phase !== 'lobby') return;
  const el = q('.ky-ltimer'); if (!el) return;
  if (V.lobbyEnd) { const s = Math.max(0, Math.ceil((V.lobbyEnd - hostNow()) / 1000)); el.textContent = `⏱️ ${s} sn içinde başlıyor`; el.classList.toggle('urgent', s <= 5); }
  else el.textContent = 'Hazır olunca başlar';
  resetTimers();
}
function sendLook(now) {
  clearTimeout(lookT);
  const f = () => { if (ui && me >= 0) ui.send({ t: 'look', look: profile.look }); };
  if (now) f(); else lookT = setTimeout(f, 250);
}
function onClick(e) {
  if (!V) return;
  const tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; Sound.tick(.3); renderTab(); return; }
  const ws = e.target.closest('[data-wslot]'); if (ws) { wslot = ws.dataset.wslot; Sound.tick(.3); renderTab(); return; }
  const ss = e.target.closest('[data-sslot]'); if (ss) { sslot = ss.dataset.sslot; Sound.tick(.3); renderTab(); return; }
  const lw = e.target.closest('[data-lw]'); if (lw) { q('.ky-tabbody').dataset.lw = lw.dataset.lw; renderTab(); return; }
  const ll = e.target.closest('[data-ll]'); if (ll) { q('.ky-tabbody').dataset.ll = ll.dataset.ll; renderTab(); return; }
  const egg = e.target.closest('[data-egg]'); if (egg) { openEggUi(); return; }
  if (e.target.closest('.ky-reveal')) { const rv = q('.ky-reveal'); if (rv) rv.remove(); return; }
  const un = e.target.closest('[data-unequip]'); if (un) { SHOP.unequip(profile, un.dataset.unequip); saveProfile(); sendLook(); spinAt = nowMs() / 1000; renderTab(); return; }
  const itb = e.target.closest('[data-item]');
  if (itb) {
    const id = itb.dataset.item, it = SHOP.BYID[id];
    if (profile.owned.includes(id)) {
      if (profile.look[it.s] === id && it.s !== 'char') SHOP.unequip(profile, it.s); else SHOP.equip(profile, id);
      saveProfile(); sendLook(); Sound.tick(.5); spinAt = nowMs() / 1000;
      if (tab === 'magaza') { tab = 'gardirop'; wslot = it.s; }
      renderTab(); return;
    }
    const c = SHOP.canBuy(profile, id);
    if (!c.ok) { toast(c.err, 'bad'); Sound.bad(); return; }
    if (buyArm !== id) { buyArm = id; root.querySelectorAll('.ky-item.arm').forEach(x => x.classList.remove('arm')); itb.classList.add('arm'); const st = itb.querySelector('.ky-st'); if (st) st.textContent = `Satın al? 🪙 ${fmtG(c.price)}`; setTimeout(() => { if (buyArm === id) { buyArm = null; if (tab === 'gardirop' || tab === 'magaza') renderTab(); } }, 3500); return; }
    buyArm = null;
    const r = SHOP.buy(profile, id);
    if (r.ok) {
      SHOP.equip(profile, id); saveProfile(); sendLook();
      Sound.buy(); spinAt = nowMs() / 1000;
      toast(`${it.n} senin! 🪙 −${fmtG(r.price)}`, 'good');
      (r.unlocked || []).forEach(a => toast(`🏅 Başarım: ${a.n} (+${a.g} altın)`, 'good'));
      tab = 'gardirop'; wslot = it.s; renderTab();
      const [x, y] = CFX.centerOf(q('.ky-gold')); FX.burst(x, y, 30);
    } else toast(r.err, 'bad');
    return;
  }
  const b = e.target.closest('button'); if (!b) return;
  if (b.classList.contains('ky-ready') && V.phase === 'lobby' && me >= 0) { Sound.init(); sendLook(true); ui.send({ t: 'ready', on: !V.players[me].ready }); Sound.special(); return; }
  if (b.classList.contains('ky-force') && V.phase === 'lobby') { ui.send({ t: 'start' }); return; }
  if (b.classList.contains('ky-next') && V.phase === 'result') { ui.send({ t: 'next' }); b.disabled = true; b.textContent = 'Diğerleri bekleniyor…'; return; }
}
function openEggUi() {
  const r = SHOP.openEgg(profile);
  if (!r.ok) { toast(r.err, 'bad'); Sound.bad(); return; }
  saveProfile(); Sound.special();
  const rar = SHOP.RARITY[r.it.r];
  const look = Object.assign({}, profile.look); look[r.it.s] = r.it.id; if (r.it.s === 'costume') { look.shirt = null; look.pants = null; }
  const el = document.createElement('div'); el.className = 'ky-reveal'; el.style.setProperty('--rc', rar.c);
  el.innerHTML = `<div class="ky-rvbox"><div class="ky-rvegg">🥚</div><div class="ky-rvin"><span class="ky-rvpv"></span><small>${rar.n}</small><b>${esc(r.it.n)}</b>
    <p>${r.dup ? `Bu eşya zaten sendeydi: <b>🪙 +${fmtG(r.refund)}</b> iade!` : 'Yeni eşya koleksiyonunda! Gardıroptan giyebilirsin.'}</p><span class="ky-rvok">Süper! ✓</span></div></div>`;
  el.querySelector('.ky-rvpv').appendChild(charCanvas(look, 120, r.it.s === 'dance' ? { k: 'win', t: r.it.st === 'flip' ? 1.5 : .45, dance: r.it.st } : { k: 'idle', t: 1.1 }));
  q('.ky').appendChild(el);
  setTimeout(() => { if (el.isConnected) { el.classList.add('open'); if (r.it.r >= 2) { FX.confetti(r.it.r === 3 ? 160 : 80); Sound.fanfare(); } else Sound.buy(); } }, 650);
  (r.unlocked || []).forEach(a => toast(`🏅 Başarım: ${a.n} (+${a.g} altın)`, 'good'));
  renderTab();
}
let toastT = null;
function toast(text, cls) {
  let el = q('.ky-toast'); if (!el) { el = document.createElement('div'); el.className = 'ky-toast'; q('.ky').appendChild(el); }
  el.textContent = text; el.className = 'ky-toast show ' + (cls || '');
  clearTimeout(toastT); toastT = setTimeout(() => { el.className = 'ky-toast'; }, 2400);
}

/* ---------- sonuç ve ödül ekranı ---------- */
function renderResult() {
  const ovl = q('.ky-ovl'); if (!ovl) return;
  const key = `${V.seed}:${V.race}`;
  const res = V.results || [];
  const mine = res.find(r => r.pi === me);
  let reward = null;
  if (mine && me >= 0 && T) {
    const seenKey = 'r' + key;
    if (!profile.seen[seenKey]) {
      const names = res.filter(r => r.ms != null && V.players[r.pi] && !V.players[r.pi].bot).map(r => ({ name: V.players[r.pi].name, ms: r.ms, me: r.pi === me }));
      const data = {
        world: V.world, len: V.len, place: mine.place, n: V.players.length, ms: mine.ms, finished: mine.ms != null, par: T.par, roarHits: L ? L.stats.roarHits : 0, boxes: L ? L.stats.boxes : 0,
        coins: L ? L.dyn.coins.size : 0, hits: L ? L.r.hits : 0, jumps: L ? L.r.jumps : 0, pw: L ? L.stats.pw : {},
        hitGiven: L ? L.stats.hitGiven : 0, bananaHits: L ? L.stats.bananaHits : 0, zapHits: L ? L.stats.zapHits : 0, blocks: L ? L.stats.blocks : 0, names
      };
      const before = profile.gold;
      const out = SHOP.applyRace(profile, data);
      profile.seen[seenKey] = { before, out };
      const ks = Object.keys(profile.seen); if (ks.length > 40) delete profile.seen[ks[0]];
      saveProfile();
    }
    reward = profile.seen[seenKey];
  }
  if (rewardShown === key && !ovl.hidden) { updateResultWait(); return; }
  rewardShown = key;
  const medals = ['🥇', '🥈', '🥉'];
  const last = V.race >= V.races;
  const stand = V.players.map((p, i) => i).sort((a, b) => V.players[b].pts - V.players[a].pts);
  ovl.innerHTML = `<div class="ky-res">
    <h2>🏁 YARIŞ ${V.race}/${V.races} · ${esc(WORLD_INFO[V.world].n.toLocaleUpperCase('tr-TR'))}</h2>
    <canvas class="ky-podcv" aria-label="Podyum"></canvas>
    <ol class="ky-podium">${res.map(r => { const p = V.players[r.pi]; return `<li class="${r.pi === me ? 'me' : ''}" style="--pc:${p.color}"><span class="ky-md">${r.ms != null ? (medals[r.place - 1] || r.place + '.') : '—'}</span><span class="ky-hd" data-hd="${r.pi}"></span><b>${esc(p.name)}</b><em>${r.ms != null ? fmtMs(r.ms) : `bitiremedi · %${r.prog}`}</em><i>+${r.pts}</i></li>`; }).join('')}</ol>
    ${reward ? `<div class="ky-reward"><div class="ky-rtop"><span>KAZANDIĞIN ALTIN</span><b class="ky-count">🪙 0</b></div>
      <ul class="ky-rlines">${reward.out.reward.lines.map(l => `<li><span>${esc(l.label)}</span><b>+${l.g}</b></li>`).join('')}
      ${reward.out.quests.map(qq => `<li class="q"><span>🎯 Görev: ${esc(qq.text)}</span><b>+${qq.g}</b></li>`).join('')}
      ${reward.out.ach.map(a => `<li class="a"><span>🏅 Başarım: ${esc(a.n)}${a.item ? ` · 🎁 ${esc(a.item)}` : ''}</span><b>+${a.g}</b></li>`).join('')}</ul>
      ${reward.out.xp ? `<div class="ky-xp"><span>⭐ +${reward.out.xp} deneyim</span><b>Seviye ${reward.out.level.lvl}</b><div class="ky-bar"><i style="width:${Math.round(reward.out.level.cur / reward.out.level.need * 100)}%"></i></div></div>` : ''}
      ${(reward.out.lvlUps || []).map(l => `<p class="ky-pb">🎉 SEVİYE ${l.lvl}! +${l.g} altın</p>`).join('')}
      ${reward.out.pb ? '<p class="ky-pb">⏱️ YENİ KİŞİSEL REKOR!</p>' : ''}
      <p class="ky-total">Toplam altının: <b>🪙 ${fmtG(profile.gold)}</b></p></div>` : ''}
    ${V.races > 1 ? `<div class="ky-stand"><h3>${last ? 'GENEL SIRALAMA' : 'PUAN DURUMU'}</h3>${stand.map((i, k) => `<span style="--pc:${V.players[i].color}">${k + 1}. ${esc(V.players[i].name)} <b>${V.players[i].pts}</b></span>`).join('')}</div>` : ''}
    <button type="button" class="ky-next">${last ? 'FİNAL SONUÇLARI ▶' : 'SONRAKİ YARIŞ ▶'} <span class="ky-nt"></span></button>
  </div>`;
  ovl.hidden = false;
  ovl.querySelectorAll('[data-hd]').forEach(sp => { const p = V.players[+sp.dataset.hd]; const c = A.headIcon(p.look, 64, p.color); const im = document.createElement('canvas'); im.width = im.height = 64; im.getContext('2d').drawImage(c, 0, 0); sp.appendChild(im); });
  if (reward) countUp(ovl.querySelector('.ky-count'), profile.gold - reward.before);
  podCv = ovl.querySelector('.ky-podcv'); podT0 = nowMs();
  if (podCv) { const d = Math.min(2, window.devicePixelRatio || 1), w = Math.min(560, Math.max(260, ovl.clientWidth - 40)), h = Math.round(Math.min(230, w * .5)); podCv.width = Math.round(w * d); podCv.height = Math.round(h * d); podCv.style.width = w + 'px'; podCv.style.height = h + 'px'; podCv._d = d; }
  ovl.scrollTop = 0; if (innerWidth < 760) { try { scrollTo({ top: 0 }); } catch { /* */ } }
  updateResultWait();
}
// animasyonlu podyum: ilk üç koşucu basamaklarda zafer danslarını yapar
let podCv = null, podT0 = 0;
function drawPodium() {
  if (!podCv || !podCv.isConnected || !V || !V.results) return;
  const x = podCv.getContext('2d'), d = podCv._d || 1, w = podCv.width / d, h = podCv.height / d, tt = nowMs() / 1000, age = (nowMs() - podT0) / 1000;
  x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, w, h);
  const bg = x.createRadialGradient(w / 2, h, 10, w / 2, h * .6, w * .7); bg.addColorStop(0, 'rgba(255,214,120,.35)'); bg.addColorStop(1, 'rgba(255,214,120,0)'); x.fillStyle = bg; x.fillRect(0, 0, w, h);
  // ışık hüzmeleri
  x.save(); x.globalAlpha = .12; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + Math.sin(tt * .7 + k * 1.3) * .6; x.fillStyle = A.RAINBOW[k]; x.beginPath(); x.moveTo(w / 2, h * 1.05); x.lineTo(w / 2 + Math.cos(a - .08) * w, h * 1.05 + Math.sin(a - .08) * w); x.lineTo(w / 2 + Math.cos(a + .08) * w, h * 1.05 + Math.sin(a + .08) * w); x.fill(); } x.restore();
  const top = V.results.filter(r => r.ms != null).slice(0, 3);
  const slots = [{ k: 1, dx: 0, hh: .34 }, { k: 2, dx: -1, hh: .25 }, { k: 3, dx: 1, hh: .18 }];
  const bw = Math.min(120, w / 3.3), s = h / 165;
  slots.forEach(sl => {
    const r = top[sl.k - 1]; const cx = w / 2 + sl.dx * bw * 1.04, bh = h * sl.hh * Math.min(1, age * 2.5), by = h - bh;
    const col = ['#ffd84a', '#dfe6f2', '#ffb27a'][sl.k - 1];
    const gr = x.createLinearGradient(0, by, 0, h); gr.addColorStop(0, A.shade(col, .2)); gr.addColorStop(1, A.shade(col, -.35)); x.fillStyle = gr; A.rrect(x, cx - bw / 2, by, bw, bh + 8, 8); x.fill();
    x.strokeStyle = A.shade(col, -.5); x.lineWidth = 2; x.stroke();
    const p = r && V.players[r.pi];
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (p && bh > 24) {        // ad basamağın üstünde
      x.font = `800 ${Math.round(11.5 * Math.max(.9, s))}px ${A.FONT}`;
      let nm = p.name; while (nm.length > 3 && x.measureText(nm).width > bw - 10) nm = nm.slice(0, -2) + '…';
      x.fillStyle = 'rgba(20,8,40,.75)'; A.rrect(x, cx - bw / 2 + 4, by + 5, bw - 8, 17, 8); x.fill(); x.fillStyle = p.color; x.fillText(nm, cx, by + 14);
    }
    x.fillStyle = A.shade(col, -.55); x.font = `900 ${Math.round(18 * Math.max(.8, s))}px ${A.FONT}`; if (bh > 44) x.fillText(String(sl.k), cx, by + Math.min(bh / 2 + 10, 40));
    if (!r || age < .35 + sl.k * .15) return;
    if (!p) return;
    x.save(); x.translate(cx, by - 2); const sc = s * 1.1; x.scale(sc, sc);
    x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(0, 0, 20, 4, 0, 0, TAU); x.fill();
    A.drawChar(x, p.look, sl.k === 1 ? { k: 'win', t: tt + r.pi, dance: danceOf(p.look) } : { k: (tt + r.pi) % 4 < 2.2 ? 'win' : 'idle', t: tt + r.pi, wave: true, dance: danceOf(p.look) });
    x.restore();
    if (sl.k === 1 && by - 84 * sc > 10) { x.font = `${Math.round(18 * s)}px sans-serif`; x.fillText('👑', cx + 18 * sc + Math.sin(tt * 3) * 2, by - 76 * sc); }
  });
  if (!top.length) { x.fillStyle = '#fff'; x.font = `800 14px ${A.FONT}`; x.textAlign = 'center'; x.fillText('Kimse bitiremedi!', w / 2, h / 2); }
}
function countUp(el, total) {
  if (!el) return;
  const t0 = nowMs(), dur = 1400;
  const tick = () => {
    if (!root || !el.isConnected) return;
    const u = Math.min(1, (nowMs() - t0) / dur), v = Math.round(total * (1 - Math.pow(1 - u, 3)));
    el.textContent = '🪙 ' + fmtG(v);
    if (u < 1) { if (Math.random() < .5) SFX.coin(); requestAnimationFrame(tick); }
    else { Sound.buy(); el.classList.add('pop'); const [x, y] = CFX.centerOf(el); FX.burst(x, y, 40); }
  };
  requestAnimationFrame(tick);
}
function updateResultWait() {
  const b = q('.ky-next'); if (!b || !V) return;
  const s = Math.max(0, Math.ceil((V.resultEnd - hostNow()) / 1000));
  const nt = q('.ky-nt'); if (nt) nt.textContent = `(${s})`;
  if (me >= 0 && V.players[me] && V.players[me].next) { b.disabled = true; b.firstChild.textContent = 'Diğerleri bekleniyor… '; }
  if (me < 0) b.disabled = true;
}

/* ---------- görüntü ---------- */
function render(v, api) {
  ui = api; prevV = V; V = v; me = api.me; lastViewAt = nowMs();
  if (!profile) loadProfile();
  const wrap = q('.ky'); if (!wrap) return;
  wrap.dataset.phase = v.phase;
  if (!prevV && me >= 0) sendLook(true);
  if (prevV && prevV.myPw !== v.myPw) { if (v.myPw) { pickPend = 0; SFX.power(); } usedPend = null; }
  if (v.phase === 'lobby') {
    q('.ky-lobby').hidden = false; q('.ky-race').hidden = true;
    renderLobby();
    ensureTrack();
    if (prevV && prevV.phase !== 'lobby') { rewardShown = ''; q('.ky-ovl').hidden = true; }
  } else {
    if (built === 'lobby') { built = ''; previewCv = null; }
    q('.ky-lobby').hidden = true; q('.ky-race').hidden = false;
    q('.ky-pad').hidden = !isTouch();
    q('.ky-keys').hidden = isTouch();
    ensureTrack();
    if (!prevV || prevV.phase !== 'race' && v.phase === 'race') { resize(); if (prevV && prevV.phase === 'lobby') { trackKey = ''; ensureTrack(); } scrollStage(); }
    if (v.phase === 'race') q('.ky-ovl').hidden = true;
    if (v.phase === 'result' || v.phase === 'over') renderResult();
    updatePad();
  }
  if (!raf) raf = requestAnimationFrame(frame);
}
function scrollStage() {
  requestAnimationFrame(() => { if (!stageEl) return; const r = stageEl.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) { try { q('.ky-race').scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch { /* */ } } resize(); });
}
function mount(r, api) {
  root = r; ui = api; V = null; prevV = null; built = ''; T = null; trackKey = ''; L = null; bots = new Map(); remotes = new Map();
  parts = []; texts = []; msgs = []; keys = { j: false, s: false }; touch = { j: false, s: false }; rewardShown = ''; cam.init = false;
  loadProfile();
  const lb = SHOP.claimLogin(profile);
  if (lb) { saveProfile(); setTimeout(() => { if (root) toast(`🎁 Günlük giriş ödülü: +${lb.bonus} altın · ${lb.streak}. gün serisi 🔥`, 'good'); }, 900); }
  mountDom(); resize();
  hudT = setInterval(() => { if (!V) return; if (V.phase === 'lobby') lobbyTick(); else if (V.phase === 'result') updateResultWait(); }, 250);
}
function unmount() {
  if (root) root.removeEventListener('click', onClick);
  removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); removeEventListener('blur', onBlur); removeEventListener('resize', resize);
  if (ro) { ro.disconnect(); ro = null; }
  clearInterval(hudT); clearTimeout(lookT); clearTimeout(toastT); if (raf) cancelAnimationFrame(raf);
  raf = 0; root = null; ui = null; V = null; cv = null; g = null; stageEl = null; previewCv = null; L = null; T = null; trackKey = '';
}

CFX.registerGame(Object.assign({
  id: 'kosu', name: 'Patili Yarış', icon: '🐾', color: '#ffb347', min: 1, max: 6, hotseat: false, bot: true, localMin: 1,
  tagline: 'Sevimli hayvanlarla güçlü, engelli koşu yarışı!',
  rules: 'Karakterin kendiliğinden koşar: zıpla (basılı tut, havada bir daha bas), kay ve tuzaklardan kaç. Soru kutularından roket ayakkabı, kalkan balonu, muz kabuğu, bulut fırtınası, tavuk büyüsü gibi güçler çıkar. Bitiş çizgisine ilk varan kazanır; kazandığın altınla garajdaki mağazadan kostüm al (kozmetiklerin yarışa etkisi yoktur).',
  options: [
    { key: 'parkur', label: 'Dünya', def: 'rastgele', choices: [{ v: 'rastgele', label: '🎲 Rastgele' }, { v: 'seker', label: '🍭 Şeker Ormanı' }, { v: 'buzul', label: '❄️ Buzul Vadisi' }, { v: 'volkan', label: '🌋 Volkan Adası' }, { v: 'uzay', label: '🚀 Uzay Limanı' }, { v: 'cayir', label: '🌼 Çiçekli Çayır' }, { v: 'gece', label: '🌃 Gece Şehri' }] },
    { key: 'uzunluk', label: 'Parkur', def: 'orta', choices: [{ v: 'kisa', label: 'Kısa' }, { v: 'orta', label: 'Orta' }, { v: 'uzun', label: 'Uzun' }] },
    { key: 'yaris', label: 'Yarış sayısı', def: '3', choices: [{ v: '1', label: '1' }, { v: '3', label: '3' }, { v: '5', label: '5' }] },
    { key: 'garaj', label: 'Garaj süresi', def: '30', choices: [{ v: '20', label: '20 sn' }, { v: '30', label: '30 sn' }, { v: '45', label: '45 sn' }] },
    { key: 'zorluk', label: 'Bilgisayar', def: 'orta', choices: [{ v: 'kolay', label: 'Kolay' }, { v: 'orta', label: 'Orta' }, { v: 'zor', label: 'Zor' }] },
    { key: 'guc', label: 'Güçler', def: 'acik', choices: [{ v: 'acik', label: 'Açık' }, { v: 'kapali', label: 'Kapalı' }] }
  ],
  mount, render, onEvent, onFast, unmount,
  // test ve geliştirme için
  _k: {
    E: ENGINE, SHOP, A, book, trackOf, DBG,
    ui: () => ({ L, bots, remotes, T, V, me, cam, auto }),
    autopilot(on, skill, mode) { auto = on ? (mode === 'keys' ? 'keys' : true) : false; autoSkill = skill || 1; if (L) L.bot = makeBot(autoSkill, 4242); if (!on) { keys.j = keys.s = false; } },
    give(pi, pw) { const st = CFX.Room.game && CFX.Room.game.state; if (st && POWERS[pw]) { st.pw[pi] = pw; CFX.Room.sync(); } },
    use: () => usePower(),
    rpos: i => { const R2 = remotes.get(i); return R2 && R2.dx != null ? { x: R2.dx, y: R2.dy } : null; },
    autoPw(on) { autoPw = !!on; },
    trace(i) { traceI = i; trace = []; }, traceGet() { const t2 = trace; traceI = -1; trace = []; return t2; },
    profile: () => profile, reloadProfile: () => loadProfile()
  }
}, RULES));

})(typeof window !== 'undefined' ? window : globalThis);
