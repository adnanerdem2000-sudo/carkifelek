/* =========================================================================
   PARTİ TAHTASI — mini oyunlar ve ortak çizim yardımcıları
   Her mini oyun iki parçadan oluşur:
     · yöneten cihaz (host): init / start / tick / act / bot / done / score / snap
     · her cihaz (çizim):    draw / move (kendi karakteri) / press / tap / key
   kind: 'own'  → oyuncu kendi konumunu yerelde hesaplar, host hız sınırıyla kabul eder
         'phys' → host fizik simülasyonu yapar, cihazlar yalnızca girdi yollar
         'ui'   → dokunma/düğme tabanlı; zamanlar host saatine göre
   Dünya boyutu 600×600. Durum JSON'a çevrilebilir tutulur.
   ========================================================================= */
(() => {
'use strict';
const TAU = Math.PI * 2, WW = 600, WH = 600;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pickR = arr => arr[Math.floor(Math.random() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const lerpAng = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a + d * k; };
const wrapA = a => { while (a > Math.PI) a -= TAU; while (a <= -Math.PI) a += TAU; return a; };
const r1 = v => Math.round(v);
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return '#' + [0, 1, 2].map(i => clamp(Math.round(x[i] + (y[i] - x[i]) * t), 0, 255).toString(16).padStart(2, '0')).join(''); };
const shade = (h, t) => /^#[0-9a-f]{6}$/i.test(h) ? (t < 0 ? mix(h, '#140a1e', -t) : mix(h, '#ffffff', t)) : h;

/* ------------------------------------------------------------------ çizim yardımcıları */
function rrPath(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const FONT_D = '"Bungee","Arial Black","Segoe UI Black",sans-serif', FONT_B = '"Nunito","Segoe UI",system-ui,sans-serif';
const D = {
  circle(g, x, y, r, fill, stroke, lw) { g.beginPath(); g.arc(x, y, Math.max(.1, r), 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } },
  ell(g, x, y, rx, ry, fill, rot = 0, stroke, lw) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } },
  rr(g, x, y, w, h, r, fill, stroke, lw) { rrPath(g, x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } },
  shadow(g, x, y, rx, ry, a = .25) { g.fillStyle = `rgba(20,8,40,${a})`; g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, TAU); g.fill(); },
  text(g, s, x, y, size, fill, stroke, font, align) { const m = /^(\d{3}) (.*)$/.exec(font || ''); g.font = m ? `${m[1]} ${size}px ${m[2]}` : `${size}px ${font || FONT_D}`; g.textAlign = align || 'center'; g.textBaseline = 'middle'; if (stroke) { g.lineWidth = Math.max(2, size * .2); g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(s, x, y); } g.fillStyle = fill; g.fillText(s, x, y); },
  glow(g, x, y, r, col) { const gr = g.createRadialGradient(x, y, 0, x, y, Math.max(1, r)); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); },
  star(g, x, y, r, fill, stroke, rot = 0) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); } }
};
// emoji önbelleği: her karede fillText yerine hazır küçük tuval
const emoCache = new Map();
function emoji(g, ch, x, y, size) {
  const px = Math.max(8, Math.round(size * 1.5)), key = ch + '|' + px;
  let c = emoCache.get(key);
  if (!c) {
    if (emoCache.size > 300) emoCache.clear();
    c = document.createElement('canvas'); c.width = c.height = Math.ceil(px * 1.3);
    const cg = c.getContext('2d'); cg.font = `${px}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`; cg.textAlign = 'center'; cg.textBaseline = 'middle';
    cg.fillText(ch, c.width / 2, c.height / 2 + px * .06); emoCache.set(key, c);
  }
  const s = size * 1.3; g.drawImage(c, x - s / 2, y - s / 2, s, s);
}

/* ---- hayvan piyonlar ---- */
const ANIMALS = ['kedi', 'ayi', 'tavsan', 'kurbaga', 'tilki', 'panda', 'penguen', 'civciv'];
const ANIMAL_EMOJI = { kedi: '🐱', ayi: '🐻', tavsan: '🐰', kurbaga: '🐸', tilki: '🦊', panda: '🐼', penguen: '🐧', civciv: '🐤' };
const ANIMAL_NAME = { kedi: 'Kedi', ayi: 'Ayı', tavsan: 'Tavşan', kurbaga: 'Kurbağa', tilki: 'Tilki', panda: 'Panda', penguen: 'Penguen', civciv: 'Civciv' };
function ears(g, an, c, dk) {
  const pink = '#ffb3cf';
  if (an === 'kedi' || an === 'tilki') [-1, 1].forEach(s => { g.beginPath(); g.moveTo(s * 5, -17); g.lineTo(s * 17, an === 'tilki' ? -31 : -27); g.lineTo(s * 19, -7); g.closePath(); g.fillStyle = c; g.fill(); g.strokeStyle = dk; g.lineWidth = 2.5; g.stroke(); g.beginPath(); g.moveTo(s * 9, -16); g.lineTo(s * 16, an === 'tilki' ? -26 : -22); g.lineTo(s * 16, -11); g.closePath(); g.fillStyle = an === 'tilki' ? '#2d2340' : pink; g.fill(); });
  else if (an === 'ayi') [-14, 14].forEach(x => { D.circle(g, x, -15, 7.5, c, dk, 2.5); D.circle(g, x, -15, 3.6, shade(c, .4)); });
  else if (an === 'tavsan') [-7, 7].forEach((x, i) => { D.ell(g, x, -27, 5.5, 14, c, i ? .18 : -.18, dk, 2.5); D.ell(g, x, -26, 2.6, 9, pink, i ? .18 : -.18); });
  else if (an === 'kurbaga') [-9, 9].forEach(x => D.circle(g, x, -16, 8, c, dk, 2.5));
  else if (an === 'panda') [-14, 14].forEach(x => D.circle(g, x, -15, 7, '#2d2340', '#120a1e', 2));
  else if (an === 'civciv') { g.strokeStyle = dk; g.lineWidth = 2.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -19); g.quadraticCurveTo(-4, -28, -1, -31); g.moveTo(0, -19); g.quadraticCurveTo(5, -27, 7, -28); g.stroke(); g.lineCap = 'butt'; }
  else if (an === 'penguen') { g.strokeStyle = dk; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-2, -19); g.quadraticCurveTo(2, -27, 6, -25); g.stroke(); }
}
function face(g, an, fx, fy, blink, mood) {
  const ex = fx * 4, ey = fy * 2.2 - 1;
  if (an === 'tilki') { g.fillStyle = '#fff6ee'; g.beginPath(); g.moveTo(-13 + ex * .5, 2 + ey); g.quadraticCurveTo(0, 20 + ey, 13 + ex * .5, 2 + ey); g.quadraticCurveTo(0, 8 + ey, -13 + ex * .5, 2 + ey); g.fill(); }
  if (an === 'penguen') D.ell(g, ex * .6, 2 + ey * .6, 14, 13, '#fff6ee');
  if (an === 'panda') { D.ell(g, -7 + ex, -2 + ey, 5.5, 7, '#2d2340', -.5); D.ell(g, 7 + ex, -2 + ey, 5.5, 7, '#2d2340', .5); }
  const eyeY = an === 'kurbaga' ? -15 : -3 + ey, eyeX = an === 'kurbaga' ? 9 : 6.5;
  [-1, 1].forEach(s => {
    const x = s * eyeX + (an === 'kurbaga' ? ex * .4 : ex);
    if (an === 'kurbaga') D.circle(g, x, eyeY, 5, '#ffffff');
    if (mood === 'dizzy') { g.strokeStyle = '#2d2340'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 3, eyeY - 3); g.lineTo(x + 3, eyeY + 3); g.moveTo(x + 3, eyeY - 3); g.lineTo(x - 3, eyeY + 3); g.stroke(); }
    else if (blink || mood === 'happy') { g.strokeStyle = '#2d2340'; g.lineWidth = 2.2; g.beginPath(); if (mood === 'happy') g.arc(x, eyeY + 1.5, 3.2, Math.PI * 1.1, Math.PI * 1.9); else { g.moveTo(x - 3, eyeY); g.lineTo(x + 3, eyeY); } g.stroke(); }
    else { D.ell(g, x, eyeY, 3, 3.8, an === 'panda' ? '#ffffff' : '#2d2340'); if (an === 'panda') D.circle(g, x, eyeY, 1.9, '#2d2340'); D.circle(g, x - 1, eyeY - 1.5, 1.1, '#ffffff'); }
  });
  if (an !== 'penguen' && an !== 'civciv' && an !== 'kurbaga') { D.ell(g, -11 + ex, 5 + ey, 3.6, 2.2, 'rgba(255,110,160,.6)'); D.ell(g, 11 + ex, 5 + ey, 3.6, 2.2, 'rgba(255,110,160,.6)'); }
  const my = 5 + ey;
  if (an === 'penguen' || an === 'civciv') { g.fillStyle = '#ff9a1f'; g.beginPath(); g.moveTo(ex - 4, my - 1); g.lineTo(ex + 4, my - 1); g.lineTo(ex + fx * 3, my + 5); g.closePath(); g.fill(); }
  else if (mood === 'dizzy') { g.strokeStyle = '#2d2340'; g.lineWidth = 1.8; g.beginPath(); g.arc(ex, my + 4, 3, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  else if (an === 'kurbaga' || mood === 'happy') { g.strokeStyle = '#2d2340'; g.lineWidth = 2; g.beginPath(); g.arc(ex, my - 2, an === 'kurbaga' ? 8 : 4.5, .25, Math.PI - .25); g.stroke(); }
  else { D.ell(g, ex, my - 1, 2.2, 1.7, an === 'tavsan' || an === 'kedi' ? '#ff7aa8' : '#2d2340'); g.strokeStyle = '#2d2340'; g.lineWidth = 1.5; g.beginPath(); g.arc(ex - 2.2, my + .6, 2.2, 0, Math.PI); g.arc(ex + 2.2, my + .6, 2.2, 0, Math.PI); g.stroke(); }
}
/* o: { x, y, col, an, s, t, z, bob, h (bakış yönü), alpha, ring, mood, rot, label } */
function drawPawn(g, o) {
  const s = o.s || 1, t = o.t || 0, c = o.col || '#19e3d0', dk = shade(c, -.42), lt = shade(c, .45), z = o.z || 0;
  g.save(); g.translate(o.x, o.y); g.scale(s, s);
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  if (o.ring) { g.save(); g.globalAlpha *= .6 + .35 * Math.sin(t / 180); g.strokeStyle = o.ring; g.lineWidth = 3.5; g.beginPath(); g.ellipse(0, 15, 28, 10, 0, 0, TAU); g.stroke(); g.restore(); }
  D.shadow(g, 0, 16, Math.max(6, 17 - z * .12), Math.max(2, 6 - z * .04), .3);
  const bob = (o.bob || 0);
  g.translate(0, -z - bob);
  if (o.rot) g.rotate(o.rot);
  const fx = Math.cos(o.h == null ? Math.PI / 2 : o.h), fy = Math.sin(o.h == null ? Math.PI / 2 : o.h);
  D.ell(g, -8, 15, 6, 4, dk); D.ell(g, 8, 15, 6, 4, dk);
  ears(g, o.an, c, dk);
  const gr = g.createRadialGradient(-6, -8, 2, 0, 0, 21); gr.addColorStop(0, lt); gr.addColorStop(.62, c); gr.addColorStop(1, shade(c, -.14));
  g.beginPath(); g.ellipse(0, 0, 20, 19, 0, 0, TAU); g.fillStyle = gr; g.fill(); g.lineWidth = 2.5; g.strokeStyle = dk; g.stroke();
  if (o.an !== 'penguen' && o.an !== 'tilki') D.ell(g, fx * 2, 9 + fy, 10, 6, 'rgba(255,255,255,.28)');
  face(g, o.an, fx, fy, Math.sin(t / 830 + c.charCodeAt(2)) > .985, o.mood);
  if (o.hat === 'crown') { g.save(); g.translate(0, -27); g.beginPath(); g.moveTo(-11, 5); g.lineTo(-13, -7); g.lineTo(-6, -1); g.lineTo(0, -10); g.lineTo(6, -1); g.lineTo(13, -7); g.lineTo(11, 5); g.closePath(); g.fillStyle = '#ffd34a'; g.fill(); g.strokeStyle = '#9a5a00'; g.lineWidth = 2; g.stroke(); g.restore(); }
  g.restore();
  if (o.label) {
    g.save(); g.font = `900 ${12 * (o.ls || 1)}px ${FONT_B}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = Math.min(110, g.measureText(o.label).width + 12) , y = o.y - (36 + z) * s - 6;
    D.rr(g, o.x - w / 2, y - 8 * (o.ls || 1), w, 16 * (o.ls || 1), 8, 'rgba(10,4,26,.72)', c, 1.5);
    g.fillStyle = '#fff'; g.fillText(o.label, o.x, y + .5, 104); g.restore();
  }
}

/* ------------------------------------------------------------------ ortak mini oyun yardımcıları */
// 'own' oyunlar: istemciden gelen konumu hız sınırıyla kabul et
function ownPos(d, pi, x, y, H, spd, lo, hi) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !d.p[pi]) return;
  const q = d.p[pi], last = d.pt[pi] || H.now, maxd = spd * clamp((H.now - last) / 1000, 0, 1.2) * 1.45 + 40, dd = dist(x, y, q[0], q[1]);
  if (dd > maxd) { const k = maxd / dd; x = q[0] + (x - q[0]) * k; y = q[1] + (y - q[1]) * k; }
  q[0] = clamp(x, lo, hi); q[1] = clamp(y, lo, hi); d.pt[pi] = H.now;
}
const startRing = (n, r, cx = 300, cy = 300) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU - Math.PI / 2; return [r1(cx + Math.cos(a) * r), r1(cy + Math.sin(a) * r)]; });
function steer(o, ix, iy, spd, dt, lo, hi) {
  const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
  o.x = clamp(o.x + ix * spd * dt, lo, hi); o.y = clamp(o.y + iy * spd * dt, lo, hi);
  if (m > .1) o.h = Math.atan2(iy, ix);
  o.mv = m > .1 ? 1 : 0;
}
const norm = (x, y) => { const m = Math.hypot(x, y) || 1; return [x / m, y / m]; };
function wallsAway(x, y, lo, hi, k = 90) { let ax = 0, ay = 0; if (x < lo + k) ax += (lo + k - x) / k; if (x > hi - k) ax -= (x - (hi - k)) / k; if (y < lo + k) ay += (lo + k - y) / k; if (y > hi - k) ay -= (y - (hi - k)) / k; return [ax, ay]; }
function rankLabel(i) { return `${i + 1}.`; }
function floorTiles(g, c1, c2, sz = 60) { for (let y = 0; y < WH; y += sz) for (let x = 0; x < WW; x += sz) { g.fillStyle = ((x + y) / sz) % 2 ? c1 : c2; g.fillRect(x, y, sz, sz); } }
function pawnOf(R, i, x, y, extra) { const p = R.pl[i] || {}, o = Object.assign({ x, y, col: p.color, an: p.an, t: R.t, label: i === R.me ? 'SEN' : null }, extra || {}); if (!o.col) o.col = p.color; return o; }

/* ================================================================== 1. BUZ SUMO */
const SUMO_C = 300, SUMO_R0 = 250, SUMO_R1 = 140, PR = 20;
const buzsumo = {
  id: 'buzsumo', name: 'Buz Sumo', icon: '🧊', color: '#7fd6ff', kind: 'phys', dur: 35, joy: true, btn: 'İT!', angIdx: -1,
  desc: 'Dönen buz pistinde rakiplerini dışarı it! Pist yavaş yavaş küçülür. Son kalan kazanır.',
  ctl: { touch: 'Sürükle: kay · İT!: hamle', key: 'WASD/oklar: kay · Boşluk: hamle' },
  init(H) { return { p: startRing(H.n, 150).map(([x, y]) => [x, y, 0, 0, 1, 0]), R: SUMO_R0, rot: 0, out: [] }; },
  tick(d, H, dt) {
    d.R = SUMO_R0 - (SUMO_R0 - SUMO_R1) * H.el; d.rot = (d.rot + dt * .7) % TAU;
    const al = d.p.map((q, i) => i).filter(i => d.p[i][4]);
    al.forEach(i => {
      const q = d.p[i], inp = H.inp(i); let ax = inp.x || 0, ay = inp.y || 0; const m = Math.hypot(ax, ay); if (m > 1) { ax /= m; ay /= m; }
      q[2] += ax * 600 * dt; q[3] += ay * 600 * dt;
      if (H.press(i) && H.now >= q[5]) {
        let [dx, dy] = m > .2 ? [ax / Math.max(m, .01), ay / Math.max(m, .01)] : norm(q[2] || (SUMO_C - q[0]), q[3] || (SUMO_C - q[1]));
        q[2] += dx * 430; q[3] += dy * 430; q[5] = H.now + 1600;
      }
    });
    const steps = Math.max(1, Math.ceil(dt / .016)), h = dt / steps, om = .38;
    for (let s = 0; s < steps; s++) {
      al.forEach(i => {
        const q = d.p[i], f = Math.exp(-.75 * h); q[2] *= f; q[3] *= f;
        const sp = Math.hypot(q[2], q[3]); if (sp > 560) { q[2] *= 560 / sp; q[3] *= 560 / sp; }
        q[0] += (q[2] - (q[1] - SUMO_C) * om) * h; q[1] += (q[3] + (q[0] - SUMO_C) * om) * h;
      });
      for (let a = 0; a < al.length; a++) for (let b = a + 1; b < al.length; b++) {
        const p = d.p[al[a]], q = d.p[al[b]], dx = q[0] - p[0], dy = q[1] - p[1], dd = Math.hypot(dx, dy) || .01;
        if (dd >= 2 * PR) continue;
        const nx = dx / dd, ny = dy / dd, ov = (2 * PR - dd) / 2;
        p[0] -= nx * ov; p[1] -= ny * ov; q[0] += nx * ov; q[1] += ny * ov;
        const rv = (p[2] - q[2]) * nx + (p[3] - q[3]) * ny;
        if (rv > 0) { const imp = rv * 1.05 + 45; p[2] -= nx * imp; p[3] -= ny * imp; q[2] += nx * imp; q[3] += ny * imp; if (rv > 140) H.fx({ e: 'bonk', x: r1((p[0] + q[0]) / 2), y: r1((p[1] + q[1]) / 2) }); }
      }
    }
    al.forEach(i => { const q = d.p[i]; if (dist(q[0], q[1], SUMO_C, SUMO_C) > d.R + 6) { q[4] = 0; d.out.push(i); H.emit({ t: 'mg', e: 'fall', pi: i, x: r1(q[0]), y: r1(q[1]) }, `🧊 ${H.name(i)} buzdan kaydı, düştü!`); } });
  },
  bot(d, pi, H) {
    const me = d.p[pi]; if (!me[4]) return null;
    const ctrl = (tx, ty, sp) => { const [dx, dy] = norm(tx, ty); let ix = (dx * sp - me[2]) / 170, iy = (dy * sp - me[3]) / 170; const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; } return { x: ix, y: iy }; };
    const rm = dist(me[0], me[1], SUMO_C, SUMO_C);
    if (rm > d.R * .6) return ctrl(SUMO_C - me[0] + rnd(-30, 30), SUMO_C - me[1] + rnd(-30, 30), 170);
    let best = -1, bd = 1e9; d.p.forEach((q, j) => { if (j !== pi && q[4]) { const dd = dist(q[0], q[1], me[0], me[1]); if (dd < bd) { bd = dd; best = j; } } });
    if (best < 0) return ctrl(SUMO_C - me[0], SUMO_C - me[1], 60);
    const q = d.p[best], [ox, oy] = norm(q[0] - SUMO_C, q[1] - SUMO_C);
    const o = ctrl(q[0] - me[0] + ox * 26, q[1] - me[1] + oy * 26, 240);
    o.press = bd < 80 && dist(q[0], q[1], SUMO_C, SUMO_C) > rm - 10 && Math.random() < .04;
    return o;
  },
  done(d, H) { return d.p.filter(q => q[4]).length <= (H.n > 1 ? 1 : 0); },
  score(d) { const n = d.p.length; return { pts: d.p.map((q, i) => q[4] ? 100 : d.out.indexOf(i)), lab: d.p.map((q, i) => q[4] ? 'Ayakta kaldı' : `${n - d.out.indexOf(i)}. sırada düştü`) }; },
  snap(d, H) { return { R: r1(d.R), rot: +d.rot.toFixed(2), p: d.p.map(q => [r1(q[0]), r1(q[1]), q[4], Math.max(0, r1(q[5] - H.now))]) }; },
  btnReady(R) { const q = R.d.p[R.me]; return q && q[2] && !q[3]; },
  draw(g, R) {
    const d = R.d, t = R.t;
    const sea = g.createLinearGradient(0, 0, 0, WH); sea.addColorStop(0, '#0b3a6e'); sea.addColorStop(1, '#06204a'); g.fillStyle = sea; g.fillRect(0, 0, WW, WH);
    g.strokeStyle = 'rgba(160,220,255,.12)'; g.lineWidth = 3; for (let y = 20; y < WH; y += 46) { g.beginPath(); for (let x = 0; x <= WW; x += 20) g.lineTo(x, y + Math.sin(x / 40 + t / 700 + y) * 5); g.stroke(); }
    D.glow(g, SUMO_C, SUMO_C, d.R + 60, 'rgba(140,220,255,.35)');
    const ice = g.createRadialGradient(SUMO_C - 60, SUMO_C - 80, 20, SUMO_C, SUMO_C, d.R); ice.addColorStop(0, '#ffffff'); ice.addColorStop(.6, '#cfefff'); ice.addColorStop(1, '#8fd0f5');
    D.circle(g, SUMO_C, SUMO_C, d.R, ice, '#e9fbff', 5);
    g.save(); g.translate(SUMO_C, SUMO_C); g.rotate(d.rot);
    g.strokeStyle = 'rgba(80,160,220,.35)'; g.lineWidth = 3; for (let k = 0; k < 6; k++) { g.rotate(TAU / 6); g.beginPath(); g.moveTo(20, 0); g.lineTo(d.R - 14, 0); g.stroke(); }
    D.circle(g, 0, 0, d.R * .45, null, 'rgba(80,160,220,.3)', 3); D.circle(g, 0, 0, 16, 'rgba(255,63,164,.45)');
    g.restore();
    // kenar uyarısı
    g.save(); g.setLineDash([14, 10]); g.lineDashOffset = -t / 30; D.circle(g, SUMO_C, SUMO_C, d.R - 4, null, 'rgba(255,90,120,.7)', 3); g.restore();
    d.p.forEach((q, i) => { if (q[2]) drawPawn(g, pawnOf(R, i, q[0], q[1], { h: Math.atan2(SUMO_C - q[1], SUMO_C - q[0]), ring: i === R.me ? '#fff' : null })); });
  }
};

/* ================================================================== 2. HAZİNE KAZISI */
const HZ_N = 8, HZ_O = 40, HZ_C = 65, HZ_LO = HZ_O + 12, HZ_HI = HZ_O + HZ_N * HZ_C - 12, HZ_SPD = 225;
const cellAt = (x, y) => { const cx = Math.floor((x - HZ_O) / HZ_C), cy = Math.floor((y - HZ_O) / HZ_C); return cx < 0 || cy < 0 || cx >= HZ_N || cy >= HZ_N ? -1 : cy * HZ_N + cx; };
const cheb = (a, b) => Math.max(Math.abs(a % HZ_N - b % HZ_N), Math.abs(Math.floor(a / HZ_N) - Math.floor(b / HZ_N)));
const cellC = c => [HZ_O + (c % HZ_N + .5) * HZ_C, HZ_O + (Math.floor(c / HZ_N) + .5) * HZ_C];
const HZ_COL = ['#ffffff', '#ff3b3b', '#ff8a1f', '#ffd23a', '#5aa2ff', '#5aa2ff', '#5aa2ff', '#5aa2ff', '#5aa2ff'];
function hzRefresh(d) {
  d.dug.forEach((v, c) => { if (v >= 0 && v < 100) d.dug[c] = d.tr.length ? Math.max(1, Math.min(...d.tr.map(tc => cheb(c, tc)))) : 9; });
}
function hzBury(d) {
  const cand = []; for (let c = 0; c < HZ_N * HZ_N; c++) if (d.dug[c] === -1 && !d.tr.includes(c) && d.tr.every(o => cheb(o, c) >= 3)) cand.push(c);
  if (cand.length) d.tr.push(pickR(cand));
}
function hzDig(d, pi, c, H) {
  if (c < 0 || c >= HZ_N * HZ_N || d.dug[c] !== -1 || H.now < (d.cd[pi] || 0)) return false;
  d.cd[pi] = H.now + (H.ai(pi) ? 1300 : 550); d.dt[c] = H.now;
  const k = d.tr.indexOf(c);
  if (k >= 0) {
    d.dug[c] = 100 + pi; d.pts[pi]++; d.found++; d.tr.splice(k, 1); hzBury(d); hzRefresh(d);
    const [x, y] = cellC(c); H.emit({ t: 'mg', e: 'gem', pi, x: r1(x), y: r1(y) }, `💎 ${H.name(pi)} bir hazine buldu!`, 'gold');
  } else { d.dug[c] = 0; hzRefresh(d); H.fx({ e: 'dig', pi, c }); }
  return true;
}
const hazine = {
  id: 'hazine', name: 'Hazine Kazısı', icon: '⛏️', color: '#ffc46b', kind: 'own', dur: 35, joy: true, btn: 'KAZ!',
  desc: 'Kumda hazineler gizli! Kazdığın çukur ne kadar kırmızıysa hazineye o kadar yakınsın (🔥 = hemen yanında). Bulunanın yerine yenisi gömülür. En çok hazine bulan kazanır.',
  ctl: { touch: 'Sürükle: yürü · KAZ!: bulunduğun kareyi kaz', key: 'WASD/oklar: yürü · Boşluk: kaz' },
  init(H) {
    const d = { p: startRing(H.n, 200).map(([x, y]) => [x, y, 0]), pt: [], tr: [], dug: Array(HZ_N * HZ_N).fill(-1), dt: Array(HZ_N * HZ_N).fill(0), pts: Array(H.n).fill(0), cd: Array(H.n).fill(0), bt: {}, found: 0 };
    const k = H.n >= 5 ? 3 : 2; while (d.tr.length < k) hzBury(d);
    return d;
  },
  tick(d, H) {
    let ch = false;
    d.dug.forEach((v, c) => { if (v !== -1 && H.now - d.dt[c] > (v >= 100 ? 5000 : 11000)) { d.dug[c] = -1; ch = true; } });
    if (ch) hzRefresh(d);
  },
  pos(d, pi, a, H) { ownPos(d, pi, +a.x, +a.y, H, HZ_SPD, HZ_LO, HZ_HI); },
  move(o, inp, dt) { steer(o, inp.x, inp.y, HZ_SPD, dt, HZ_LO, HZ_HI); },
  act(d, pi, a, H) { if (a.k === 'dig') { const q = d.p[pi]; if (Number.isFinite(+a.x)) ownPos(d, pi, +a.x, +a.y, H, HZ_SPD, HZ_LO, HZ_HI); hzDig(d, pi, cellAt(q[0], q[1]), H); } },
  bot(d, pi, H) {
    const q = d.p[pi], b = d.bt[pi] || (d.bt[pi] = { c: -1, re: 0 });
    if (b.c < 0 || d.dug[b.c] !== -1 || H.now > b.re) {
      const hints = []; d.dug.forEach((v, c) => { if (v > 0 && v < 9) hints.push([c, v]); });
      let best = -1, bs = -1e9;
      for (let c = 0; c < HZ_N * HZ_N; c++) {
        if (d.dug[c] !== -1) continue;
        let s = 0, bad = false;
        for (const [k, h] of hints) { const dd = cheb(c, k); if (dd < h) { bad = true; break; } s -= (dd - h) * (h <= 2 ? 4 : h === 3 ? 1.5 : .3); }
        if (bad) s -= 50;
        const [x, y] = cellC(c); s -= dist(x, y, q[0], q[1]) / 140 + Math.random() * 4.5;
        if (s > bs) { bs = s; best = c; }
      }
      if (Math.random() < .3) { const und = []; for (let c = 0; c < HZ_N * HZ_N; c++) if (d.dug[c] === -1) und.push(c); if (und.length) best = pickR(und); }
      b.c = best; b.re = H.now + 3500;
    }
    if (b.c < 0) return { x: 0, y: 0 };
    const [tx, ty] = cellC(b.c), dd = dist(tx, ty, q[0], q[1]);
    if (dd < 14) { hzDig(d, pi, cellAt(q[0], q[1]), H); return { x: 0, y: 0 }; }
    return { x: (tx - q[0]) / dd * .72, y: (ty - q[1]) / dd * .72 };
  },
  score(d) { return { pts: d.pts.slice(), lab: d.pts.map(v => `${v} hazine`) }; },
  snap(d) { return { p: d.p.map(q => [r1(q[0]), r1(q[1])]), g: d.dug.map(v => v < 0 ? '.' : v >= 100 ? String.fromCharCode(97 + v - 100) : String(Math.min(8, v))).join(''), pts: d.pts.slice(), found: d.found }; },
  press(R) { const o = R.own; if (!o) return; const c = cellAt(o.x, o.y); if (c < 0 || R.d.g[c] !== '.') { R.toast('Burası zaten kazıldı'); return; } R.send({ k: 'dig', x: r1(o.x), y: r1(o.y) }); R.sfx('dig'); },
  draw(g, R) {
    const d = R.d, t = R.t;
    g.fillStyle = '#e9b86a'; g.fillRect(0, 0, WW, WH);
    g.fillStyle = '#2bb6c9'; g.fillRect(0, 0, WW, 26); g.fillRect(0, WH - 26, WW, 26);
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; [12, WH - 14].forEach(y => { g.beginPath(); for (let x = 0; x <= WW; x += 15) g.lineTo(x, y + Math.sin(x / 30 + t / 500) * 3); g.stroke(); });
    const myC = R.own ? cellAt(R.own.x, R.own.y) : -1;
    for (let c = 0; c < HZ_N * HZ_N; c++) {
      const x = HZ_O + (c % HZ_N) * HZ_C, y = HZ_O + Math.floor(c / HZ_N) * HZ_C, ch = d.g ? d.g[c] : '.';
      D.rr(g, x + 3, y + 3, HZ_C - 6, HZ_C - 6, 10, (c + Math.floor(c / HZ_N)) % 2 ? '#f5cf86' : '#efc274', 'rgba(150,100,40,.35)', 1.5);
      if (ch === '.') { if ((c * 7) % 5 === 0) { D.circle(g, x + 20, y + 22, 3, 'rgba(160,110,50,.35)'); D.circle(g, x + 42, y + 40, 2, 'rgba(160,110,50,.35)'); } }
      else if (ch >= 'a') { const pi = ch.charCodeAt(0) - 97, col = (R.pl[pi] || {}).color || '#fff'; D.ell(g, x + HZ_C / 2, y + HZ_C / 2 + 4, 24, 18, '#7a4f22'); D.glow(g, x + HZ_C / 2, y + HZ_C / 2, 40, 'rgba(255,240,140,.7)'); emoji(g, '💎', x + HZ_C / 2, y + HZ_C / 2, 30); D.circle(g, x + HZ_C - 12, y + 12, 7, col, '#fff', 2); }
      else { const v = +ch; D.ell(g, x + HZ_C / 2, y + HZ_C / 2 + 3, 23, 17, '#8a5a2b'); D.glow(g, x + HZ_C / 2, y + HZ_C / 2, 34, HZ_COL[v] + '99'); D.text(g, v <= 1 ? '🔥' : String(v), x + HZ_C / 2, y + HZ_C / 2 + 2, v <= 1 ? 22 : 22, HZ_COL[v], '#3a2208'); }
      if (c === myC && R.phase === 'play') D.rr(g, x + 2, y + 2, HZ_C - 4, HZ_C - 4, 11, null, '#ffffff', 3.5);
    }
    if (myC >= 0 && R.phase === 'play' && R.own) { const [x, y] = cellC(myC); g.save(); g.globalAlpha = .7 + .3 * Math.sin(t / 150); D.rr(g, x - HZ_C / 2 + 2, y - HZ_C / 2 + 2, HZ_C - 4, HZ_C - 4, 11, null, (R.pl[R.me] || {}).color, 3); g.restore(); }
    const P = R.pos;
    P.map((q, i) => [q, i]).sort((a, b) => a[0][1] - b[0][1]).forEach(([q, i]) => drawPawn(g, pawnOf(R, i, q[0], q[1], { h: q[2], s: .95, bob: q[3] ? Math.abs(Math.sin(t / 90 + i)) * 3 : 0 })));
    D.rr(g, WW - 170, 30, 160, 30, 15, 'rgba(10,4,26,.6)'); D.text(g, `💎 Bulunan: ${d.found || 0}`, WW - 90, 46, 15, '#fff6b0');
  }
};

/* ================================================================== 3. LAZER ATLAMA */
const LZ_AIR = 580, LZ_CD = 120, LZ_RING = 185, LZ_ARM2 = 16000, LZ_LAG = 220;
function lzAngle(d, t) {
  let a = d.a0; if (!d.t0 || t <= d.t0) return a;
  const rel = t - d.t0;
  for (let i = 0; i < d.seg.length; i++) {
    const s = d.seg[i], e = i + 1 < d.seg.length ? d.seg[i + 1][0] : 1e9;
    if (rel <= s[0]) break;
    a += s[1] * (Math.min(rel, e) - s[0]) / 1000;
  }
  return a;
}
const lzArms = (d, t) => (d.t0 && t - d.t0 >= LZ_ARM2 ? 2 : 1);
const lzTheta = (n, i) => i / n * TAU - Math.PI / 2;
const lzAir = (ja, t) => ja > 0 && t >= ja && t <= ja + LZ_AIR;
function lzJump(d, pi, at, H) {
  if (!d.al[pi]) return;
  at = clamp(Number.isFinite(at) ? at : H.now, H.now - 350, H.now);
  if (d.ja[pi] && at < d.ja[pi] + LZ_AIR + LZ_CD) return;
  d.ja[pi] = at;
}
const lazer = {
  id: 'lazer', name: 'Lazer Atlama', icon: '⚡', color: '#ff4f6d', kind: 'ui', dur: 40, joy: false, btn: 'ATLA!',
  desc: 'Dönen lazer sana ulaşmadan zıpla! Lazer hızlanır, yön değiştirir, sonra ikiye çıkar. Son kalan kazanır.',
  ctl: { touch: 'ATLA! düğmesi ya da ekrana dokun', key: 'Boşluk / ↑: zıpla' },
  init(H) {
    const seg = [[0, 1.25]]; let t = 2500, sg = 1;
    while (t < 46000) { const k = t / 40000; if (Math.random() < .38) sg = -sg; seg.push([t, +(sg * Math.min(3.25, 1.35 + 2.1 * k) * rnd(.9, 1.06)).toFixed(2)]); t += rndi(2600, 4600); }
    return { t0: 0, a0: lzTheta(H.n, 0) + Math.PI / H.n + .35, seg, al: Array(H.n).fill(1), ja: Array(H.n).fill(0), out: [], chk: 0, bt: {} };
  },
  start(d, H) { d.t0 = H.now; d.chk = H.now; },
  act(d, pi, a, H) { if (a.k === 'jump') lzJump(d, pi, +a.at, H); },
  tick(d, H) {
    const until = H.now - LZ_LAG, n = d.al.length;
    if (until <= d.chk) return;
    for (let t = d.chk + 10; t <= until; t += 10) {
      const arms = lzArms(d, t), A0 = lzAngle(d, t - 10), A1 = lzAngle(d, t);
      for (let i = 0; i < n; i++) {
        if (!d.al[i]) continue;
        const th = lzTheta(n, i);
        for (let k = 0; k < arms; k++) {
          const a = wrapA(A0 + k * Math.PI - th), b = wrapA(A1 + k * Math.PI - th);
          if (Math.sign(a) !== Math.sign(b) && Math.abs(a) < 1 && Math.abs(b) < 1 && !lzAir(d.ja[i], t)) {
            d.al[i] = 0; d.out.push(i);
            H.emit({ t: 'mg', e: 'zap', pi: i }, `⚡ ${H.name(i)} lazere yakalandı!`);
            break;
          }
        }
      }
    }
    d.chk = until;
  },
  bot(d, pi, H) {
    if (!d.al[pi] || !d.t0) return null;
    const b = d.bt[pi] || (d.bt[pi] = { lead: rnd(130, 330), skip: 0 });
    if (lzAir(d.ja[pi], H.now) || (d.ja[pi] && H.now < d.ja[pi] + LZ_AIR + LZ_CD) || H.now < b.skip) return null;
    const n = d.al.length, th = lzTheta(n, pi);
    let ttc = -1;
    for (let dt = 0; dt <= 700; dt += 15) {
      const t = H.now + dt, arms = lzArms(d, t), A0 = lzAngle(d, t), A1 = lzAngle(d, t + 15);
      for (let k = 0; k < arms; k++) { const a = wrapA(A0 + k * Math.PI - th), c = wrapA(A1 + k * Math.PI - th); if (Math.sign(a) !== Math.sign(c) && Math.abs(a) < 1) { ttc = dt; break; } }
      if (ttc >= 0) break;
    }
    if (ttc >= 0 && ttc <= b.lead) {
      const sp = Math.abs(lzAngle(d, H.now + 100) - lzAngle(d, H.now)) * 10;
      if (Math.random() < .035 + .05 * sp / 3) { b.skip = H.now + ttc + 120; return null; }
      lzJump(d, pi, H.now, H); b.lead = rnd(120, 340);
    }
    return null;
  },
  done(d, H) { return d.al.filter(Boolean).length <= (H.n > 1 ? 1 : 0); },
  score(d) { const n = d.al.length; return { pts: d.al.map((a, i) => a ? 100 : d.out.indexOf(i)), lab: d.al.map((a, i) => a ? 'Hiç çarpılmadı' : `${n - d.out.indexOf(i)}. sırada yandı`) }; },
  snap(d) { return { t0: d.t0, a0: +d.a0.toFixed(3), seg: d.seg, al: d.al.slice(), ja: d.ja.slice() }; },
  press(R) {
    const d = R.d; if (!d.al || !d.al[R.me] || R.phase !== 'play') return;
    const L = R.local; if (L.ja && R.now < L.ja + LZ_AIR + LZ_CD) return;
    L.ja = R.now; R.send({ k: 'jump', at: Math.round(R.now) }); R.sfx('jump');
  },
  tap(R) { lazer.press(R); },
  draw(g, R) {
    const d = R.d, t = R.t, now = R.now, n = (d.al || []).length;
    const bg = g.createRadialGradient(300, 300, 40, 300, 300, 430); bg.addColorStop(0, '#2a0f55'); bg.addColorStop(1, '#0a0420'); g.fillStyle = bg; g.fillRect(0, 0, WW, WH);
    g.strokeStyle = 'rgba(139,61,255,.25)'; g.lineWidth = 1.5; for (let x = 0; x <= WW; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, WH); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(WW, x); g.stroke(); }
    const pl = g.createRadialGradient(300, 280, 30, 300, 300, 260); pl.addColorStop(0, '#5a4a8a'); pl.addColorStop(1, '#2d2350');
    D.circle(g, 300, 300, 255, pl, '#19e3d0', 4); D.circle(g, 300, 300, LZ_RING, null, 'rgba(25,227,208,.35)', 2);
    if (!d.seg) return;
    const A = lzAngle(d, now), arms = lzArms(d, now);
    for (let k = 0; k < arms; k++) {
      const a = A + k * Math.PI, ex = 300 + Math.cos(a) * 258, ey = 300 + Math.sin(a) * 258;
      g.save(); g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,40,80,.35)'; g.lineWidth = 22; g.beginPath(); g.moveTo(300, 300); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = '#ff2d55'; g.lineWidth = 9; g.stroke(); g.strokeStyle = '#ffe0e8'; g.lineWidth = 3; g.stroke();
      g.restore(); D.glow(g, ex, ey, 30, 'rgba(255,60,90,.8)');
    }
    if (d.t0 && now < d.t0 + LZ_ARM2 && now > d.t0 + LZ_ARM2 - 3000) D.text(g, 'İKİNCİ LAZER GELİYOR!', 300, 40, 20, '#ffe14a', '#5a0018');
    D.circle(g, 300, 300, 34, '#1b1036', '#ff2d55', 5); D.glow(g, 300, 300, 44, 'rgba(255,60,90,.5)'); emoji(g, '⚡', 300, 300, 30);
    for (let i = 0; i < n; i++) {
      const th = lzTheta(n, i), x = 300 + Math.cos(th) * LZ_RING, y = 300 + Math.sin(th) * LZ_RING;
      const ja = i === R.me && R.local.ja && R.local.ja > (d.ja[i] || 0) ? R.local.ja : d.ja[i];
      const z = lzAir(ja, now) ? Math.sin(Math.PI * (now - ja) / LZ_AIR) * 46 : 0;
      drawPawn(g, pawnOf(R, i, x, y, { z, h: th + Math.PI, alpha: d.al[i] ? 1 : .35, mood: d.al[i] ? (z > 0 ? 'happy' : null) : 'dizzy', ring: i === R.me ? '#fff' : null }));
    }
  }
};

/* ================================================================== 4. BOMBA PAS */
const BP_PIL = [[175, 175, 36], [425, 175, 36], [175, 425, 36], [425, 425, 36]], BP_LO = 34, BP_HI = 566, BP_SPD = 232, BP_HSPD = 258, BP_STUN = 1600;
function bpMove(o, inp, dt, hold) {
  const n = Math.max(1, Math.ceil(dt / .02));
  for (let k = 0; k < n; k++) {
    steer(o, inp.x, inp.y, hold ? BP_HSPD : BP_SPD, dt / n, BP_LO, BP_HI);
    for (const [px, py, pr] of BP_PIL) { const dd = dist(o.x, o.y, px, py), m = pr + PR; if (dd < m) { const k2 = m / (dd || .01); o.x = px + (o.x - px) * k2; o.y = py + (o.y - py) * k2; } }
  }
}
function bpGive(d, H, except) {
  const cand = d.p.map((q, i) => i).filter(i => !d.hold.includes(i) && i !== except && H.now >= d.st[i]);
  const pool = cand.length ? cand : d.p.map((q, i) => i).filter(i => !d.hold.includes(i));
  if (!pool.length) return;
  const j = pickR(pool); d.hold.push(j); d.fuse.push(H.now + rnd(6000, 10000));
  H.emit({ t: 'mg', e: 'bomb', pi: j }, `💣 Bomba ${H.name(j)} oyuncusunda!`);
}
const bomba = {
  id: 'bomba', name: 'Bomba Pas', icon: '💣', color: '#ff9a3c', kind: 'own', dur: 40, joy: true, btn: null,
  desc: 'Bomba sendeyse bir rakibe dokunarak geçir! Fitil gizli; elinde patlarsa kararır, sersemlersin ve ceza yersin. En az patlayan kazanır.',
  ctl: { touch: 'Sürükle: koş · bombayı dokunarak geçir', key: 'WASD/oklar: koş' },
  init(H) { return { p: startRing(H.n, 235).map(([x, y]) => [x, y, 0]), pt: [], hold: [], fuse: [], boom: Array(H.n).fill(0), st: Array(H.n).fill(0), held: Array(H.n).fill(0), nb: [], bt: {}, give: 0 }; },
  start(d, H) { const k = H.n >= 5 ? 2 : 1; for (let i = 0; i < k; i++) bpGive(d, H, -1); },
  pos(d, pi, a, H) { if (H.now >= d.st[pi]) ownPos(d, pi, +a.x, +a.y, H, BP_HSPD, BP_LO, BP_HI); },
  move(o, inp, dt, R) { const d = R && R.d; if (d && d.st && d.st[R.me] > 0) { o.mv = 0; return; } bpMove(o, inp, dt, d && d.hold && d.hold.includes(R.me)); },
  tick(d, H, dt) {
    d.hold.forEach(h => { d.held[h] += dt * 1000; });
    d.nb = d.nb.filter(x => x[2] > H.now);
    for (let k = 0; k < d.hold.length; k++) {
      const h = d.hold[k], ph = d.p[h];
      for (let j = 0; j < d.p.length; j++) {
        if (j === h || d.hold.includes(j) || H.now < d.st[j]) continue;
        if (d.nb.some(x => x[0] === h && x[1] === j)) continue;
        const q = d.p[j]; if (dist(ph[0], ph[1], q[0], q[1]) > 2 * PR + 10) continue;
        d.hold[k] = j; d.nb.push([j, h, H.now + 1000]);
        H.emit({ t: 'mg', e: 'pass', a: h, b: j, x: r1((ph[0] + q[0]) / 2), y: r1((ph[1] + q[1]) / 2) });
        break;
      }
    }
    for (let k = d.hold.length - 1; k >= 0; k--) {
      if (H.now < d.fuse[k]) continue;
      const h = d.hold[k]; d.hold.splice(k, 1); d.fuse.splice(k, 1); d.boom[h]++; d.st[h] = H.now + BP_STUN;
      H.emit({ t: 'mg', e: 'boom', pi: h, x: r1(d.p[h][0]), y: r1(d.p[h][1]) }, `💥 Bomba ${H.name(h)} oyuncusunun elinde patladı!`, 'bad');
      d.give = Math.max(d.give, H.now + 900); d.giveEx = h;
    }
    const want = H.n >= 5 ? 2 : 1;
    if (d.hold.length < want && d.give && H.now >= d.give && H.left > 3500) { bpGive(d, H, d.giveEx); if (d.hold.length >= want) d.give = 0; }
  },
  bot(d, pi, H) {
    if (H.now < d.st[pi]) return { x: 0, y: 0 };
    const me = d.p[pi], b = d.bt[pi] || (d.bt[pi] = { jit: rnd(0, TAU), at: 0 });
    if (H.now > b.at) { b.jit = rnd(-1, 1); b.at = H.now + rnd(500, 1100); }
    let vx = 0, vy = 0;
    if (d.hold.includes(pi)) {
      let best = -1, bd = 1e9; d.p.forEach((q, j) => { if (j !== pi && !d.hold.includes(j) && H.now >= d.st[j] && !d.nb.some(x => x[0] === pi && x[1] === j)) { const dd = dist(q[0], q[1], me[0], me[1]); if (dd < bd) { bd = dd; best = j; } } });
      if (best >= 0) { [vx, vy] = norm(d.p[best][0] - me[0], d.p[best][1] - me[1]); }
    } else {
      d.hold.forEach(h => { const q = d.p[h], dd = Math.max(30, dist(q[0], q[1], me[0], me[1])); if (dd < 320) { vx += (me[0] - q[0]) / dd * (320 / dd); vy += (me[1] - q[1]) / dd * (320 / dd); } });
      const [wx, wy] = wallsAway(me[0], me[1], BP_LO, BP_HI, 110); vx += wx * 2.2; vy += wy * 2.2;
      vx += -vy * .35 * b.jit; vy += vx * .35 * b.jit;
    }
    for (const [px, py, pr] of BP_PIL) { const dd = dist(me[0], me[1], px, py); if (dd < pr + 50) { vx += (me[0] - px) / dd * 1.2; vy += (me[1] - py) / dd * 1.2; } }
    const m = Math.hypot(vx, vy); if (m < .05) return { x: 0, y: 0 };
    const k = d.hold.includes(pi) ? .9 : .86;
    return { x: vx / m * k, y: vy / m * k };
  },
  score(d) { return { pts: d.boom.map((b, i) => -b * 1000 - d.held[i] / 1000), lab: d.boom.map((b, i) => `${b ? `${b} kez patladı · ` : 'Hiç patlamadı · '}${(d.held[i] / 1000).toFixed(1)} sn tuttu`) }; },
  snap(d, H) { return { p: d.p.map(q => [r1(q[0]), r1(q[1])]), hold: d.hold.slice(), boom: d.boom.slice(), st: d.st.map(v => Math.max(0, r1(v - H.now))) }; },
  draw(g, R) {
    const d = R.d, t = R.t;
    floorTiles(g, '#3b2a6a', '#33245e', 50);
    D.rr(g, 16, 16, WW - 32, WH - 32, 22, null, '#ff9a3c', 6); D.rr(g, 24, 24, WW - 48, WH - 48, 18, null, 'rgba(255,154,60,.35)', 2);
    BP_PIL.forEach(([x, y, r]) => { D.shadow(g, x + 6, y + 10, r, r * .5); D.circle(g, x, y, r, '#ff3fa4', '#8a0f55', 4); D.circle(g, x - 8, y - 10, r * .35, 'rgba(255,255,255,.35)'); });
    const P = R.pos, hold = d.hold || [];
    P.map((q, i) => [q, i]).sort((a, b) => a[0][1] - b[0][1]).forEach(([q, i]) => {
      const stun = d.st && d.st[i] > 0, hb = hold.includes(i);
      if (stun) D.ell(g, q[0], q[1] + 10, 26, 10, 'rgba(20,10,20,.55)');
      drawPawn(g, pawnOf(R, i, q[0], q[1], { h: q[2], col: stun ? '#4a4458' : undefined, ring: hb ? '#ff5a3c' : (i === R.me ? '#fff' : null), bob: q[3] ? Math.abs(Math.sin(t / 85 + i)) * 3 : 0, mood: stun ? 'dizzy' : hb ? null : 'happy' }));
      if (stun) for (let k = 0; k < 3; k++) { const a = t / 300 + k * 2; D.circle(g, q[0] + Math.sin(a) * 9, q[1] - 34 - ((t / 9 + k * 20) % 30), 6, 'rgba(120,110,130,.6)'); }
      if (hb) { const y = q[1] - 40 + Math.sin(t / 120) * 2; D.glow(g, q[0], y, 26, 'rgba(255,90,40,.5)'); emoji(g, '💣', q[0], y, 26); D.circle(g, q[0] + 10, y - 13, 3 + Math.random() * 2, '#ffe14a'); }
      if (d.boom && d.boom[i]) D.text(g, '💥'.repeat(Math.min(3, d.boom[i])), q[0], q[1] + 30, 11, '#fff');
    });
  }
};

/* ================================================================== 5. MEYVE YAĞMURU */
const MY_FALL = 1500, MY_LO = 30, MY_HI = 570, MY_SPD = 255;
const MY_K = [{ e: '🍎', v: 1 }, { e: '🍌', v: 1 }, { e: '🍓', v: 1 }, { e: '🍇', v: 1 }, { e: '⭐', v: 3 }, { e: '💣', v: -2 }];
const meyve = {
  id: 'meyve', name: 'Meyve Yağmuru', icon: '🍎', color: '#2bd96b', kind: 'own', dur: 30, joy: true, btn: null,
  desc: 'Gökten meyve yağıyor! Gölgelerin altında bekle, meyveyi kap. ⭐ 3 puan. Bombalardan kaç: sersemletir ve 2 puan götürür.',
  ctl: { touch: 'Sürükle: koş', key: 'WASD/oklar: koş' },
  init(H) { return { p: startRing(H.n, 170).map(([x, y]) => [x, y, 0]), pt: [], it: [], idn: 0, next: 0, pts: Array(H.n).fill(0), st: Array(H.n).fill(0), bt: {} }; },
  start(d, H) { d.next = H.now + 300; },
  pos(d, pi, a, H) { if (H.now >= d.st[pi]) ownPos(d, pi, +a.x, +a.y, H, MY_SPD, MY_LO, MY_HI); },
  move(o, inp, dt, R) { if (R && R.d.st && R.d.st[R.me] > 0) { o.mv = 0; return; } steer(o, inp.x, inp.y, MY_SPD, dt, MY_LO, MY_HI); },
  tick(d, H) {
    if (H.now >= d.next && H.left > MY_FALL) {
      const r = Math.random(), k = r < .17 + .1 * H.el ? 5 : r < .26 + .1 * H.el ? 4 : rndi(0, 3);
      d.it.push([++d.idn, rndi(55, 545), rndi(70, 545), k, Math.round(H.now + MY_FALL)]);
      d.next = H.now + (500 - 270 * H.el) / Math.max(1, Math.sqrt(H.n / 3));
    }
    for (let i = d.it.length - 1; i >= 0; i--) {
      const it = d.it[i]; if (it[4] > H.now) continue;
      d.it.splice(i, 1);
      if (it[3] === 5) {
        const hit = []; d.p.forEach((q, j) => { if (dist(q[0], q[1], it[1], it[2]) < 64) { hit.push(j); d.pts[j] = Math.max(0, d.pts[j] - 2); d.st[j] = H.now + 1300; } });
        H.emit({ t: 'mg', e: 'mbomb', x: it[1], y: it[2], hit }, hit.length ? `💣 ${hit.map(j => H.name(j)).join(', ')} bombaya yakalandı!` : '');
      } else {
        let best = -1, bd = 42; d.p.forEach((q, j) => { if (H.now < d.st[j]) return; const dd = dist(q[0], q[1], it[1], it[2]); if (dd < bd) { bd = dd; best = j; } });
        if (best >= 0) { d.pts[best] += MY_K[it[3]].v; H.fx({ e: 'catch', pi: best, k: it[3], x: it[1], y: it[2] }); }
        else H.fx({ e: 'splat', k: it[3], x: it[1], y: it[2] });
      }
    }
  },
  bot(d, pi, H) {
    const me = d.p[pi]; if (H.now < d.st[pi]) return { x: 0, y: 0 };
    let vx = 0, vy = 0, danger = false;
    d.it.forEach(it => { if (it[3] === 5 && it[4] - H.now < 800) { const dd = dist(it[1], it[2], me[0], me[1]); if (dd < 85) { danger = true; vx += (me[0] - it[1]) / (dd || 1); vy += (me[1] - it[2]) / (dd || 1); } } });
    if (danger) { const [x, y] = norm(vx, vy); return { x, y }; }
    let best = null, bs = 0;
    d.it.forEach(it => { if (it[3] === 5) return; const dd = dist(it[1], it[2], me[0], me[1]), reach = dd / (MY_SPD * .82) * 1000, slack = it[4] - H.now - reach; if (slack < -60) return; const s = MY_K[it[3]].v / (1 + dd / 160) * (1 + Math.random() * .4); if (s > bs) { bs = s; best = it; } });
    if (!best) { const [x, y] = norm(300 - me[0], 300 - me[1]); return dist(300, 300, me[0], me[1]) > 80 ? { x: x * .5, y: y * .5 } : { x: 0, y: 0 }; }
    const dd = dist(best[1], best[2], me[0], me[1]); if (dd < 8) return { x: 0, y: 0 };
    return { x: (best[1] - me[0]) / dd * .82, y: (best[2] - me[1]) / dd * .82 };
  },
  score(d) { return { pts: d.pts.slice(), lab: d.pts.map(v => `${v} puan`) }; },
  snap(d, H) { return { p: d.p.map(q => [r1(q[0]), r1(q[1])]), it: d.it.map(a => a.slice()), pts: d.pts.slice(), st: d.st.map(v => Math.max(0, r1(v - H.now))) }; },
  draw(g, R) {
    const d = R.d, t = R.t, now = R.now;
    g.fillStyle = '#5ccf62'; g.fillRect(0, 0, WW, WH);
    for (let y = 0; y < WH; y += 40) { g.fillStyle = (y / 40) % 2 ? 'rgba(255,255,255,.06)' : 'rgba(0,60,0,.06)'; g.fillRect(0, y, WW, 40); }
    for (let i = 0; i < 26; i++) { const x = (i * 137) % WW, y = (i * 251) % WH; D.circle(g, x, y, 4, i % 3 ? '#fff' : '#ffe14a'); D.circle(g, x, y, 1.6, '#ff8a00'); }
    D.rr(g, 8, 8, WW - 16, WH - 16, 20, null, '#2e8b3a', 6);
    (d.it || []).forEach(it => {
      const left = clamp((it[4] - now) / MY_FALL, 0, 1), k = MY_K[it[3]];
      D.ell(g, it[1], it[2] + 6, 10 + 20 * (1 - left), 5 + 8 * (1 - left), it[3] === 5 ? 'rgba(160,0,30,.45)' : 'rgba(0,40,0,.32)');
      if (it[3] === 5 && left < .5) { g.save(); g.globalAlpha = .6; D.circle(g, it[1], it[2] + 6, 64, null, '#ff2d55', 2.5); g.restore(); }
    });
    const P = R.pos;
    P.map((q, i) => [q, i]).sort((a, b) => a[0][1] - b[0][1]).forEach(([q, i]) => {
      const stun = d.st && d.st[i] > 0;
      drawPawn(g, pawnOf(R, i, q[0], q[1], { h: q[2], mood: stun ? 'dizzy' : null, bob: q[3] ? Math.abs(Math.sin(t / 85 + i)) * 3 : 0, ring: i === R.me ? '#fff' : null }));
      if (stun) for (let k = 0; k < 3; k++) { const a = t / 200 + k * TAU / 3; emoji(g, '⭐', q[0] + Math.cos(a) * 18, q[1] - 34 + Math.sin(a) * 5, 11); }
    });
    (d.it || []).forEach(it => { const left = clamp((it[4] - now) / MY_FALL, 0, 1), k = MY_K[it[3]]; emoji(g, k.e, it[1], it[2] - left * left * 460 - 4, it[3] === 4 ? 30 : 28); });
  }
};

/* ================================================================== 6. HAFIZA MENÜSÜ */
const HF_FOOD = ['🍕', '🍔', '🍩', '🍉', '🍓', '🧁'], HF_SHOW = 850, HF_LEN = [5, 7];
const hfBtn = i => [40 + (i % 3) * 180, 400 + Math.floor(i / 3) * 100, 160, 86];
function hfRound(d, H) {
  d.r++; const L = HF_LEN[d.r - 1] || 7; d.seq = [];
  while (d.seq.length < L) { const f = rndi(0, HF_FOOD.length - 1); if (f !== d.seq[d.seq.length - 1]) d.seq.push(f); }
  d.ph = 'show'; d.ps = H.now; d.se = H.now + 900 + L * HF_SHOW; d.ie = 0;
  d.prog = Array(H.n).fill(0); d.fin = Array(H.n).fill(0); d.fail = Array(H.n).fill(0); d.bt = {};
  H.dirty();
}
function hfTap(d, pi, f, at, H) {
  if (d.ph !== 'input' || d.fin[pi] || d.fail[pi] || !Number.isInteger(f) || f < 0 || f >= HF_FOOD.length) return;
  at = clamp(Number.isFinite(at) ? at : H.now, d.ps, H.now);
  if (f === d.seq[d.prog[pi]]) {
    d.prog[pi]++;
    if (d.prog[pi] === d.seq.length) { const secs = (at - d.ps) / 1000; d.fin[pi] = Math.max(1, Math.round(at - d.ps)); const pts = d.seq.length + Math.max(0, 8 - secs); d.pts[pi] = Math.round((d.pts[pi] + pts) * 10) / 10; H.fx({ e: 'hfok', pi }); }
  } else { d.fail[pi] = 1; d.pts[pi] = Math.round((d.pts[pi] + d.prog[pi]) * 10) / 10; H.fx({ e: 'hfbad', pi }); }
}
const hafiza = {
  id: 'hafiza', name: 'Hafıza Menüsü', icon: '🍕', color: '#ffb627', kind: 'ui', dur: 50, joy: false, btn: null,
  desc: 'Garson siparişleri sırayla gösterecek. Aklında tut, sonra aynı sırayla dokun! Doğru ve hızlı olan kazanır.',
  ctl: { touch: 'Yiyeceklere sırayla dokun', key: '1–6 tuşları ya da tıklama' },
  init(H) { return { r: 0, seq: [], ph: 'wait', ps: 0, se: 0, ie: 0, prog: Array(H.n).fill(0), fin: Array(H.n).fill(0), fail: Array(H.n).fill(0), pts: Array(H.n).fill(0), bt: {}, over: 0 }; },
  start(d, H) { hfRound(d, H); },
  act(d, pi, a, H) { if (a.k === 'tap') hfTap(d, pi, +a.f, +a.at, H); },
  tick(d, H) {
    if (d.ph === 'show' && H.now >= d.se) { d.ph = 'input'; d.ps = H.now; d.ie = H.now + 3500 + d.seq.length * 1100; H.dirty(); }
    else if (d.ph === 'input') {
      const all = d.prog.every((_, i) => d.fin[i] || d.fail[i]);
      if (all || H.now >= d.ie) {
        d.prog.forEach((p, i) => { if (!d.fin[i] && !d.fail[i]) d.pts[i] = Math.round((d.pts[i] + p) * 10) / 10; });
        d.ph = 'gap'; d.ps = H.now; d.ie = H.now + 1900; H.dirty();
      }
    } else if (d.ph === 'gap' && H.now >= d.ie) { if (d.r < HF_LEN.length) hfRound(d, H); else { d.over = 1; } }
  },
  bot(d, pi, H) {
    if (d.ph !== 'input' || d.fin[pi] || d.fail[pi]) return null;
    const b = d.bt[pi] || (d.bt[pi] = { next: H.now + rnd(650, 1150) });
    if (H.now < b.next) return null;
    const ok = Math.random() < (d.r === 1 ? .96 : .9), want = d.seq[d.prog[pi]];
    let f = want; if (!ok) { do { f = rndi(0, HF_FOOD.length - 1); } while (f === want); }
    hfTap(d, pi, f, H.now, H); b.next = H.now + rnd(380, 820);
    return null;
  },
  done(d) { return !!d.over; },
  score(d) { return { pts: d.pts.slice(), lab: d.pts.map(v => `${v} puan`) }; },
  snap(d) { return { r: d.r, seq: d.seq.slice(), ph: d.ph, ps: d.ps, se: d.se, ie: d.ie, prog: d.prog.slice(), fin: d.fin.slice(), fail: d.fail.slice(), pts: d.pts.slice() }; },
  tapAt(R, f) {
    const d = R.d, me = R.me; if (d.ph !== 'input' || me < 0) return;
    const L = R.local; if (L.r !== d.r) { L.r = d.r; L.taps = []; L.bad = 0; }
    if (L.bad || L.taps.length >= d.seq.length) return;
    L.taps.push(f); if (d.seq[L.taps.length - 1] !== f) { L.bad = 1; R.sfx('bad'); } else R.sfx(L.taps.length === d.seq.length ? 'good' : 'tick');
    L.flash = { f, t: R.t };
    R.send({ k: 'tap', f, at: Math.round(R.now) });
  },
  tap(R, x, y) { for (let i = 0; i < HF_FOOD.length; i++) { const [bx, by, bw, bh] = hfBtn(i); if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) { hafiza.tapAt(R, i); return; } } },
  key(R, code) { const m = /^(?:Digit|Numpad)([1-6])$/.exec(code); if (m) hafiza.tapAt(R, +m[1] - 1); },
  draw(g, R) {
    const d = R.d, t = R.t, now = R.now, me = R.me, L = R.local;
    if (L.r !== d.r) { L.r = d.r; L.taps = []; L.bad = 0; }
    const bg = g.createLinearGradient(0, 0, 0, WH); bg.addColorStop(0, '#ffefd6'); bg.addColorStop(1, '#ffd2a1'); g.fillStyle = bg; g.fillRect(0, 0, WW, WH);
    for (let x = 0; x < WW; x += 40) { g.fillStyle = (x / 40) % 2 ? '#ff6b6b' : '#fff'; g.fillRect(x, 0, 40, 16); }
    D.text(g, `SİPARİŞ ${Math.max(1, d.r)}/${HF_LEN.length}`, 300, 42, 22, '#7a2a00', '#fff');
    D.ell(g, 300, 160, 150, 95, '#ffffff', 0, '#e8c9a0', 4); D.ell(g, 300, 160, 118, 72, null, 0, '#f0dcc0', 3);
    if (d.ph === 'show') {
      const k = Math.floor((now - d.ps - 450) / HF_SHOW), local = (now - d.ps - 450) - k * HF_SHOW;
      if (k >= 0 && k < d.seq.length && local < HF_SHOW - 120) { const sc = Math.min(1, local / 140); emoji(g, HF_FOOD[d.seq[k]], 300, 155, 80 * (.6 + .4 * sc)); }
      D.text(g, 'AKLINDA TUT!', 300, 282, 22, '#ff3fa4', '#fff');
      for (let i = 0; i < d.seq.length; i++) D.circle(g, 300 + (i - (d.seq.length - 1) / 2) * 26, 316, 8, i <= k ? '#ff3fa4' : 'rgba(0,0,0,.15)');
    } else if (d.ph === 'input' || d.ph === 'gap') {
      const mine = me >= 0 ? L.taps : [];
      if (d.ph === 'input') {
        const sec = Math.max(0, Math.ceil((d.ie - now) / 1000));
        D.text(g, me < 0 ? 'Oyuncular sırayı giriyor…' : (L.bad || (me >= 0 && d.fail[me])) ? '❌ YANLIŞ!' : mine.length >= d.seq.length || (me >= 0 && d.fin[me]) ? '✅ TAMAM!' : 'SIRAYLA DOKUN!', 300, 132, 24, L.bad ? '#d1123a' : '#7a2a00', '#fff');
        D.text(g, `⏱ ${sec}`, 300, 178, 20, '#7a2a00');
      } else {
        D.text(g, 'DOĞRU SIRA', 300, 112, 18, '#7a2a00');
        d.seq.forEach((f, i) => emoji(g, HF_FOOD[f], 300 + (i - (d.seq.length - 1) / 2) * 38, 160, 30));
      }
      const n = d.seq.length, w = Math.min(38, 300 / n);
      for (let i = 0; i < n; i++) { const x = 300 + (i - (n - 1) / 2) * w, f = mine[i]; D.rr(g, x - w / 2 + 2, 290, w - 4, w - 4, 8, f == null ? 'rgba(0,0,0,.08)' : (d.seq[i] === f ? '#c8f7d0' : '#ffc4cf')); if (f != null) emoji(g, HF_FOOD[f], x, 290 + (w - 4) / 2, w * .62); }
    }
    // oyuncu ilerlemesi
    const n = R.pl.length, cw = Math.min(70, 560 / n);
    for (let i = 0; i < n; i++) {
      const x = 300 + (i - (n - 1) / 2) * cw, y = 360, p = R.pl[i] || {}, len = d.seq.length || 1;
      D.rr(g, x - cw / 2 + 4, y - 9, cw - 8, 18, 9, 'rgba(0,0,0,.12)');
      D.rr(g, x - cw / 2 + 4, y - 9, (cw - 8) * clamp((d.prog[i] || 0) / len, 0, 1), 18, 9, p.color || '#888');
      D.text(g, d.fail[i] ? '✗' : d.fin[i] ? '✓' : ANIMAL_EMOJI[p.an] ? '' : '', x, y, 13, '#fff', '#000');
      if (!d.fail[i] && !d.fin[i]) emoji(g, ANIMAL_EMOJI[p.an] || '🙂', x, y - 1, 14);
    }
    for (let i = 0; i < HF_FOOD.length; i++) {
      const [bx, by, bw, bh] = hfBtn(i), on = d.ph === 'input' && me >= 0 && !L.bad && !d.fail[me] && !d.fin[me];
      const fl = L.flash && L.flash.f === i && t - L.flash.t < 180;
      D.rr(g, bx, by + 5, bw, bh, 18, 'rgba(120,50,0,.35)');
      D.rr(g, bx, by + (fl ? 4 : 0), bw, bh, 18, on ? '#ffffff' : '#f3e2cc', on ? '#ff8a00' : '#d9bf9c', 4);
      emoji(g, HF_FOOD[i], bx + bw / 2, by + bh / 2 + (fl ? 4 : 0), 44);
      D.text(g, String(i + 1), bx + 16, by + 16, 13, '#b07a40');
    }
  }
};

/* ================================================================== 7. REFLEKS DÜELLOSU */
const RF_ROUNDS = 4, RF_LATE = 1200, RF_FAULT = 1000;
function rfRound(d, H) {
  d.r++; d.rs = H.now; d.g = Math.round(H.now + rnd(1900, 4300));
  d.fk = Math.random() < .45 ? Math.round(H.now + rnd(800, Math.max(900, d.g - H.now - 600))) : 0;
  d.ph = 'wait'; d.cur = Array(d.tot.length).fill(null); d.bt = {}; H.dirty();
}
function rfTap(d, pi, at, H) {
  if (d.ph !== 'wait' || d.cur[pi] != null) return;
  at = clamp(Number.isFinite(at) ? at : H.now, d.rs, H.now);
  const rt = at - d.g;
  d.cur[pi] = rt < 0 ? -1 : Math.max(90, Math.round(rt));
  H.fx({ e: rt < 0 ? 'rfbad' : 'rfok', pi });
}
const refleks = {
  id: 'refleks', name: 'Refleks Düellosu', icon: '🚦', color: '#19e3d0', kind: 'ui', dur: 40, joy: false, btn: 'BAS!',
  desc: 'Işık YEŞİL olunca hemen bas! Kırmızıda ya da sarı tuzakta basarsan ceza yersin. 4 tur; toplam süresi en kısa olan kazanır.',
  ctl: { touch: 'Ekrana ya da BAS! düğmesine dokun', key: 'Boşluk / Enter' },
  init(H) { return { r: 0, rs: 0, g: 0, fk: 0, ph: 'wait', cur: Array(H.n).fill(null), tot: Array(H.n).fill(0), hist: Array.from({ length: H.n }, () => []), bt: {}, over: 0, re: 0 }; },
  start(d, H) { rfRound(d, H); },
  act(d, pi, a, H) { if (a.k === 'tap') rfTap(d, pi, +a.at, H); },
  tick(d, H) {
    if (d.ph === 'wait' && H.now >= d.g && (d.cur.every(v => v != null) || H.now >= d.g + 1700)) {
      d.cur.forEach((v, i) => { const x = v == null ? RF_LATE : v < 0 ? RF_FAULT : v; d.tot[i] += x; d.hist[i].push(v == null ? 'geç' : v < 0 ? 'erken' : v); });
      d.ph = 'gap'; d.re = H.now + 1800; H.dirty();
    } else if (d.ph === 'gap' && H.now >= d.re) { if (d.r < RF_ROUNDS) rfRound(d, H); else d.over = 1; }
  },
  bot(d, pi, H) {
    if (d.ph !== 'wait' || d.cur[pi] != null) return null;
    const b = d.bt[pi] || (d.bt[pi] = { at: Math.random() < .07 ? (d.fk ? d.fk + rnd(120, 260) : d.g - rnd(80, 300)) : d.g + rnd(235, 440) });
    if (H.now >= b.at) rfTap(d, pi, b.at, H);
    return null;
  },
  done(d) { return !!d.over; },
  score(d) { return { pts: d.tot.map(v => -v), lab: d.tot.map((v, i) => { const er = d.hist[i].filter(x => x === 'erken').length; return `${Math.round(v / Math.max(1, d.hist[i].length))} ms ort.${er ? ` · ${er} erken` : ''}`; }) }; },
  snap(d) { return { r: d.r, rs: d.rs, g: d.g, fk: d.fk, ph: d.ph, cur: d.cur.slice(), tot: d.tot.slice() }; },
  press(R) {
    const d = R.d; if (d.ph !== 'wait' || R.me < 0 || R.phase !== 'play') return;
    const L = R.local; if (L.r === d.r) return;
    L.r = d.r; const rt = R.now - d.g; L.rt = rt < 0 ? -1 : Math.max(90, Math.round(rt));
    R.sfx(rt < 0 ? 'bad' : 'good'); R.send({ k: 'tap', at: Math.round(R.now) });
  },
  tap(R) { refleks.press(R); },
  draw(g, R) {
    const d = R.d, now = R.now, t = R.t, me = R.me, L = R.local;
    const green = d.ph === 'wait' && now >= d.g, fake = d.ph === 'wait' && d.fk && now >= d.fk && now < d.fk + 420 && !green;
    const col = green ? '#2bff88' : fake ? '#ffe14a' : '#ff3b5c';
    g.fillStyle = '#120a26'; g.fillRect(0, 0, WW, WH);
    D.glow(g, 300, 230, 330, green ? 'rgba(43,255,136,.4)' : fake ? 'rgba(255,225,74,.35)' : 'rgba(255,59,92,.28)');
    D.text(g, `TUR ${Math.max(1, d.r)}/${RF_ROUNDS}`, 300, 34, 20, '#b9a8e6');
    D.rr(g, 210, 70, 180, 300, 40, '#2a2340', '#4a3f6a', 5);
    [['#ff3b5c', 130, !green && !fake], ['#ffe14a', 220, fake], ['#2bff88', 310, green]].forEach(([c, y, on]) => { D.circle(g, 300, y, 38, on ? c : shade(c, -.75)); if (on) D.glow(g, 300, y, 90, c + 'aa'); D.circle(g, 288, y - 12, 9, on ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.08)'); });
    const mine = me >= 0 ? (L.r === d.r ? L.rt : d.cur[me]) : null;
    let msg = d.ph === 'gap' ? 'Tur bitti' : green ? 'BAS!' : fake ? 'BEKLE!' : 'BEKLE…';
    if (mine != null && d.ph === 'wait') msg = mine < 0 ? 'ERKEN! +1000' : `${mine} ms`;
    D.text(g, msg, 300, 418, green && mine == null ? 46 : 34, mine != null && mine < 0 ? '#ff6b7d' : col, '#000');
    const n = R.pl.length, cw = Math.min(140, 580 / Math.min(n, 4)), rows = Math.ceil(n / 4);
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 4), inRow = Math.min(4, n - row * 4), x = 300 + ((i % 4) - (inRow - 1) / 2) * cw, y = 480 + row * 52 - (rows - 1) * 10, p = R.pl[i] || {};
      const v = d.cur[i];
      D.rr(g, x - cw / 2 + 4, y - 20, cw - 8, 42, 12, 'rgba(255,255,255,.07)', p.color, 2);
      emoji(g, ANIMAL_EMOJI[p.an] || '🙂', x - cw / 2 + 22, y, 18);
      D.text(g, v == null ? (d.ph === 'gap' ? 'geç' : '…') : v < 0 ? 'erken' : `${v}`, x + 12, y - 4, 16, v != null && v < 0 ? '#ff6b7d' : '#fff', null, `900 ${FONT_B}`);
      D.text(g, `Σ ${Math.round(d.tot[i] || 0)}`, x + 12, y + 12, 11, '#b9a8e6', null, `800 ${FONT_B}`);
    }
    void t;
  }
};

/* ================================================================== 8. KULE YARIŞI */
const KL_BW = 200, KL_BH = 24, KL_CX = 210, KL_BASE = 560, KL_AMP = 175;
function klX(spawn, h, now) { const per = Math.max(950, 2000 - h * 55), ph = ((now - spawn) / per) % 1; const tri = ph < .5 ? ph * 4 - 1 : 3 - ph * 4; return KL_CX + tri * KL_AMP; }
const kule = {
  id: 'kule', name: 'Kule Yarışı', icon: '🏗️', color: '#b98bff', kind: 'ui', dur: 30, joy: false, btn: 'BIRAK!',
  desc: 'Kayan bloğu tam üstüne bırak! Taşan kısım kesilir, bloğu kaçırırsan kulen biter. En yüksek kule kazanır.',
  ctl: { touch: 'BIRAK! düğmesi ya da ekrana dokun', key: 'Boşluk / Enter' },
  init(H) { return { h: Array(H.n).fill(0), w: Array(H.n).fill(KL_BW), ov: Array(H.n).fill(0), lt: Array(H.n).fill(0), bt: {} }; },
  act(d, pi, a, H) {
    if (a.k !== 'drop' || d.ov[pi]) return;
    if (a.miss) { d.ov[pi] = 1; H.fx({ e: 'klmiss', pi }); return; }
    const h = +a.h, w = +a.w;
    if (h !== d.h[pi] + 1 || !(w > 0 && w <= KL_BW) || H.now - d.lt[pi] < 180) return;
    d.h[pi] = h; d.w[pi] = Math.round(w); d.lt[pi] = H.now;
  },
  bot(d, pi, H) {
    if (d.ov[pi]) return null;
    const b = d.bt[pi] || (d.bt[pi] = { next: H.now + rnd(800, 1200) });
    if (H.now < b.next) return null;
    const loss = Math.random() < .28 ? 0 : rnd(2, 15 + d.h[pi] * .6);
    const w = d.w[pi] - loss;
    if (w < 6) { d.ov[pi] = 1; H.fx({ e: 'klmiss', pi }); return null; }
    d.h[pi]++; d.w[pi] = Math.round(w); b.next = H.now + rnd(700, 1150) + d.h[pi] * 12;
    return null;
  },
  done(d) { return d.ov.every(Boolean); },
  score(d) { return { pts: d.h.slice(), lab: d.h.map(v => `${v} kat`) }; },
  snap(d) { return { h: d.h.slice(), w: d.w.slice(), ov: d.ov.slice() }; },
  kst(R) { const L = R.local; if (!L.k) L.k = { blocks: [{ x: KL_CX, w: KL_BW }], spawn: R.playAt || R.now, over: 0, cam: 0, chips: [] }; return L.k; },
  press(R) {
    if (R.phase !== 'play' || R.me < 0) return;
    const K = kule.kst(R); if (K.over || R.now < (R.playAt || 0)) return;
    const top = K.blocks[K.blocks.length - 1], h = K.blocks.length - 1, x = klX(K.spawn, h, R.now), off = x - top.x, ov = top.w - Math.abs(off);
    if (ov <= 0) { K.over = 1; K.fall = { x, w: top.w, t: R.t }; R.sfx('bad'); R.send({ k: 'drop', miss: 1 }); return; }
    let nb;
    if (Math.abs(off) < 5) { nb = { x: top.x, w: top.w }; R.sfx('good'); K.perfect = R.t; }
    else { nb = { x: top.x + off / 2, w: ov }; K.chips.push({ x: off > 0 ? top.x + top.w / 2 + off / 2 : top.x - top.w / 2 + off / 2, w: Math.abs(off), y: h + 1, t: R.t }); R.sfx('tick'); }
    K.blocks.push(nb); K.spawn = R.now;
    R.send({ k: 'drop', h: K.blocks.length - 1, w: Math.round(nb.w * 100) / 100 });
  },
  tap(R) { kule.press(R); },
  draw(g, R) {
    const d = R.d, t = R.t, now = R.now, me = R.me;
    const bg = g.createLinearGradient(0, 0, 0, WH); bg.addColorStop(0, '#3a1f7a'); bg.addColorStop(1, '#ff8fb8'); g.fillStyle = bg; g.fillRect(0, 0, WW, WH);
    for (let i = 0; i < 18; i++) D.circle(g, (i * 97) % 420, (i * 53) % 260, 1.6, 'rgba(255,255,255,.7)');
    // sağda tüm oyuncuların kuleleri
    const n = R.pl.length, colW = Math.min(36, 170 / n), maxH = Math.max(8, ...(d.h || [0]));
    D.rr(g, 420, 20, 168, 560, 16, 'rgba(10,4,26,.45)');
    for (let i = 0; i < n; i++) {
      const x = 430 + i * (148 / n) + (148 / n - colW) / 2, hh = (d.h[i] || 0) / maxH * 470, p = R.pl[i] || {};
      D.rr(g, x, 540 - hh, colW, Math.max(4, hh), 6, d.ov[i] ? shade(p.color || '#888', -.45) : p.color);
      D.text(g, String(d.h[i] || 0), x + colW / 2, 530 - hh - 12, 13, '#fff', '#000');
      emoji(g, ANIMAL_EMOJI[p.an] || '🙂', x + colW / 2, 560, Math.min(18, colW * .7));
    }
    if (me < 0) { D.text(g, 'Kuleler yükseliyor!', 210, 300, 20, '#fff', '#000'); return; }
    const K = kule.kst(R), h = K.blocks.length - 1;
    const want = Math.max(0, h * KL_BH - 330); K.cam += (want - K.cam) * .12;
    g.save(); g.beginPath(); g.rect(0, 0, 418, WH); g.clip(); g.translate(0, K.cam);
    D.rr(g, KL_CX - 130, KL_BASE, 260, 60, 10, '#5a3a8a');
    const col = (R.pl[me] || {}).color || '#19e3d0';
    K.blocks.forEach((b, i) => { const y = KL_BASE - (i + 1) * KL_BH + KL_BH; const c = i === 0 ? '#7a5aa8' : (i % 2 ? col : shade(col, .3)); D.rr(g, b.x - b.w / 2, y - KL_BH, b.w, KL_BH - 2, 5, c, shade(col, -.4), 2); });
    K.chips = K.chips.filter(c => t - c.t < 900);
    K.chips.forEach(c => { const k = (t - c.t) / 900, y = KL_BASE - c.y * KL_BH + k * k * 500; g.globalAlpha = 1 - k; D.rr(g, c.x - c.w / 2, y - KL_BH, c.w, KL_BH - 2, 5, shade(col, .2)); g.globalAlpha = 1; });
    if (!K.over && R.phase === 'play') { const x = klX(K.spawn, h, now), top = K.blocks[h], y = KL_BASE - (h + 1) * KL_BH; D.rr(g, x - top.w / 2, y - KL_BH, top.w, KL_BH - 2, 5, '#fff6b0', '#ff8a00', 2.5); }
    if (K.fall) { const k = (t - K.fall.t) / 1000; if (k < 1.2) { const y = KL_BASE - (h + 1) * KL_BH + k * k * 600; D.rr(g, K.fall.x - K.fall.w / 2, y - KL_BH, K.fall.w, KL_BH - 2, 5, '#fff6b0'); } }
    g.restore();
    D.text(g, `${h} KAT`, 210, 40, 28, '#fff', '#3a1f7a');
    if (K.perfect && t - K.perfect < 600) D.text(g, 'MÜKEMMEL!', 210, 82, 24, '#ffe14a', '#7a2a00');
    if (K.over) D.text(g, 'KULEN TAMAM!', 210, 300, 26, '#ffe14a', '#3a1f7a');
  }
};

/* ================================================================== 9. ÇARPIŞAN ARABALAR */
const AR_LO = 40, AR_HI = 560, AR_R = 22;
function arStar(d, H, x, y, delay) {
  if (x == null) { let tries = 0; do { x = rndi(70, 530); y = rndi(70, 530); tries++; } while (tries < 20 && d.p.some(q => dist(q[0], q[1], x, y) < 90)); }
  d.st.push([++d.idn, r1(clamp(x, 60, 540)), r1(clamp(y, 60, 540)), Math.round(H.now + (delay || 0))]);
}
const araba = {
  id: 'araba', name: 'Çarpışan Arabalar', icon: '🚗', color: '#5aa2ff', kind: 'phys', dur: 35, joy: true, btn: 'TURBO', angIdx: 2,
  desc: 'Yıldızları topla! Rakibe hızla çarparsan elinden bir yıldız düşer. TURBO ile ani hızlan. En çok yıldızı olan kazanır.',
  ctl: { touch: 'Sürükle: sür · TURBO: hızlan', key: 'WASD/oklar: sür · Boşluk: turbo' },
  init(H) { const d = { p: startRing(H.n, 190).map(([x, y]) => [x, y, Math.atan2(300 - y, 300 - x), 0, 0, 0, 0]), pts: Array(H.n).fill(0), st: [], idn: 0 }; for (let i = 0; i < 4; i++) arStar(d, H); return d; },
  tick(d, H, dt) {
    d.p.forEach((q, i) => {
      const inp = H.inp(i); let ix = inp.x || 0, iy = inp.y || 0; const m = Math.min(1, Math.hypot(ix, iy));
      if (H.now >= q[5] && m > .15) {
        const want = Math.atan2(iy, ix); let df = wrapA(want - q[2]); const turn = 5.5 * dt; q[2] = wrapA(q[2] + clamp(df, -turn, turn));
        const th = 520 * m * (Math.abs(df) > 1.9 ? .25 : 1);
        q[3] += Math.cos(q[2]) * th * dt; q[4] += Math.sin(q[2]) * th * dt;
      }
      if (H.press(i) && H.now >= q[6] && H.now >= q[5]) { q[3] += Math.cos(q[2]) * 380; q[4] += Math.sin(q[2]) * 380; q[6] = H.now + 2200; }
      if (H.now < q[5]) q[2] += dt * 9;
    });
    const steps = Math.max(1, Math.ceil(dt / .016)), h = dt / steps;
    for (let s = 0; s < steps; s++) {
      d.p.forEach(q => {
        const f = Math.exp(-1.5 * h); q[3] *= f; q[4] *= f;
        const sp = Math.hypot(q[3], q[4]); if (sp > 620) { q[3] *= 620 / sp; q[4] *= 620 / sp; }
        q[0] += q[3] * h; q[1] += q[4] * h;
        if (q[0] < AR_LO) { q[0] = AR_LO; q[3] = Math.abs(q[3]) * .7; } if (q[0] > AR_HI) { q[0] = AR_HI; q[3] = -Math.abs(q[3]) * .7; }
        if (q[1] < AR_LO) { q[1] = AR_LO; q[4] = Math.abs(q[4]) * .7; } if (q[1] > AR_HI) { q[1] = AR_HI; q[4] = -Math.abs(q[4]) * .7; }
      });
      for (let a = 0; a < d.p.length; a++) for (let b = a + 1; b < d.p.length; b++) {
        const p = d.p[a], q = d.p[b], dx = q[0] - p[0], dy = q[1] - p[1], dd = Math.hypot(dx, dy) || .01;
        if (dd >= 2 * AR_R) continue;
        const nx = dx / dd, ny = dy / dd, ov = (2 * AR_R - dd) / 2;
        p[0] -= nx * ov; p[1] -= ny * ov; q[0] += nx * ov; q[1] += ny * ov;
        const va = p[3] * nx + p[4] * ny, vb = -(q[3] * nx + q[4] * ny), rv = va + vb;
        if (rv <= 0) continue;
        const imp = rv * .95 + 30; p[3] -= nx * imp; p[4] -= ny * imp; q[3] += nx * imp; q[4] += ny * imp;
        if (rv > 210) {
          const att = va >= vb ? a : b, vic = att === a ? b : a, V = d.p[vic];
          if (H.now >= V[5]) {
            V[5] = H.now + 650;
            if (d.pts[vic] > 0) { d.pts[vic]--; const an = rnd(0, TAU); arStar(d, H, V[0] + Math.cos(an) * 55, V[1] + Math.sin(an) * 55, 450); }
            H.emit({ t: 'mg', e: 'bump', a: att, b: vic, x: r1((p[0] + q[0]) / 2), y: r1((p[1] + q[1]) / 2) });
          }
        }
      }
    }
    for (let k = d.st.length - 1; k >= 0; k--) {
      const s = d.st[k]; if (H.now < s[3]) continue;
      const j = d.p.findIndex((q, i) => H.now >= q[5] && dist(q[0], q[1], s[1], s[2]) < 32 && i >= 0);
      if (j >= 0) { d.st.splice(k, 1); d.pts[j]++; H.fx({ e: 'star', pi: j, x: s[1], y: s[2] }); }
    }
    while (d.st.length < 4 && H.left > 2000) arStar(d, H);
  },
  bot(d, pi, H) {
    const me = d.p[pi]; let tx = 300, ty = 300, ram = false;
    let rich = -1, rs = 0; d.p.forEach((q, j) => { if (j !== pi && d.pts[j] >= 2) { const dd = dist(q[0], q[1], me[0], me[1]); const s = d.pts[j] / (1 + dd / 120); if (dd < 230 && s > rs) { rs = s; rich = j; } } });
    let best = null, bd = 1e9; d.st.forEach(s => { const dd = dist(s[1], s[2], me[0], me[1]); if (dd < bd) { bd = dd; best = s; } });
    if (rich >= 0 && (rs > 1.2 || !best || Math.random() < .002)) { tx = d.p[rich][0]; ty = d.p[rich][1]; ram = true; }
    else if (best) { tx = best[1]; ty = best[2]; }
    const [x, y] = norm(tx - me[0], ty - me[1]);
    const aim = Math.abs(wrapA(Math.atan2(y, x) - me[2])) < .3;
    return { x: x * .92, y: y * .92, press: aim && dist(tx, ty, me[0], me[1]) < (ram ? 200 : 150) && Math.random() < .05 };
  },
  score(d) { return { pts: d.pts.slice(), lab: d.pts.map(v => `${v} yıldız`) }; },
  snap(d, H) { return { p: d.p.map(q => [r1(q[0]), r1(q[1]), +q[2].toFixed(2), H.now < q[5] ? 1 : 0, Math.max(0, r1(q[6] - H.now))]), st: d.st.map(s => [s[0], s[1], s[2], H.now < s[3] ? 1 : 0]), pts: d.pts.slice() }; },
  btnReady(R) { const q = R.d.p[R.me]; return q && !q[4]; },
  draw(g, R) {
    const d = R.d, t = R.t;
    g.fillStyle = '#16123a'; g.fillRect(0, 0, WW, WH);
    g.strokeStyle = 'rgba(90,162,255,.18)'; g.lineWidth = 2; for (let x = 20; x < WW; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, WH); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(WW, x); g.stroke(); }
    D.rr(g, AR_LO - AR_R - 4, AR_LO - AR_R - 4, AR_HI - AR_LO + 2 * AR_R + 8, AR_HI - AR_LO + 2 * AR_R + 8, 26, null, '#5aa2ff', 7);
    g.save(); g.setLineDash([24, 18]); g.lineDashOffset = -t / 25; D.rr(g, AR_LO - AR_R - 4, AR_LO - AR_R - 4, AR_HI - AR_LO + 2 * AR_R + 8, AR_HI - AR_LO + 2 * AR_R + 8, 26, null, '#ffe14a', 3); g.restore();
    D.circle(g, 300, 300, 70, null, 'rgba(255,63,164,.35)', 4);
    (d.st || []).forEach(s => { g.save(); g.globalAlpha = s[3] ? .5 : 1; D.glow(g, s[1], s[2], 30, 'rgba(255,225,74,.6)'); D.star(g, s[1], s[2], 15, '#ffe14a', '#a86a00', t / 500); g.restore(); });
    (d.p || []).forEach((q, i) => {
      const p = R.pl[i] || {}, c = p.color || '#5aa2ff';
      g.save(); g.translate(q[0], q[1]);
      D.shadow(g, 3, 8, 30, 14, .35);
      g.save(); g.rotate(q[2]);
      D.rr(g, -27, -21, 54, 42, 16, '#1b1036'); D.rr(g, -24, -18, 48, 36, 13, c, shade(c, -.45), 2.5);
      D.rr(g, 12, -14, 9, 28, 4, shade(c, .5)); D.circle(g, 22, -12, 3.5, '#fff6b0'); D.circle(g, 22, 12, 3.5, '#fff6b0');
      if (q[4] > 1800) { D.glow(g, -34, 0, 22, 'rgba(255,140,40,.8)'); }
      g.restore();
      g.restore();
      drawPawn(g, pawnOf(R, i, q[0], q[1] - 6, { s: .62, h: q[2], mood: q[3] ? 'dizzy' : null, ls: 1 }));
      if (q[3]) for (let k = 0; k < 3; k++) { const a = t / 150 + k * TAU / 3; emoji(g, '⭐', q[0] + Math.cos(a) * 20, q[1] - 30 + Math.sin(a) * 5, 10); }
    });
  }
};

const GAMES = { buzsumo, hazine, lazer, bomba, meyve, hafiza, refleks, kule, araba };
window.__PTMINI = { GAMES, ORDER: Object.keys(GAMES), D, shade, mix, drawPawn, emoji, ANIMALS, ANIMAL_EMOJI, ANIMAL_NAME, W: WW, H: WH, FONT_B, FONT_D, rrPath,
  _t: { lzAngle, lzArms, lzTheta, cellAt, cheb, klX, LZ_AIR, LZ_LAG } };
})();
