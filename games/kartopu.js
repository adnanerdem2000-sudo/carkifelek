/* =========================================================================
   KAR TOPU SAVAŞI — gerçek zamanlı, üstten görünümlü takım kar topu oyunu
     · Modlar: Takım Maçı · Bayrak Kapmaca · Herkes Tek
     · Yöneten cihaz (yerel ya da oda kurucusu): atışlar, kar topu uçuşu,
       isabetler (gecikme toleransıyla), duvarlar, bayraklar, puanlar, botlar
     · Her cihaz kendi karakterini yerelde yürütür ve konumunu hızlı kanaldan
       (ui.fast, ~10/sn) yayar. Atış bir hamledir; yöneten cihaz topun tüm
       uçuşunu (başlangıç, yön, hız, bitiş) belirler ve olayla yayar, böylece
       her cihaz aynı topu aynı yolda kendi saatinde çizer.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, flash, initial } = window.CFX;

/* ------------------------------------------------------------------ sabitler */
const W = 1600, H = 1000, B = 36;                 // dünya ve kenar kar seddi
const R = 20;                                     // karakter yarıçapı
const SPD = 215, CHARGE_SLOW = .62, FLAG_SLOW = .86, SLED_K = 1.6, MAXV = SPD * SLED_K;
const BR = 7, BIG_R = 13;                         // kar topu yarıçapı
const CHARGE_MS = 900, THROW_CD = 260, SCOOP_MS = 550, AMMO_MAX = 5, AMMO_START = 3;
const FREEZE_MS = 2500, FREEZE_SMALL = 2000, FREEZE_KAKAO = 1100, INV_MS = 1600;
const WALL_STOCK = 3, WALL_REGEN = 10000, WALL_LIFE = 22000, WALL_HP = 3, WALL_MAX = 2, WALL_CR = 14, WALL_GAP = 20, WALL_D = 46;
const FLAG_R = 36, CAP_R = 66, FLAG_RET_MS = 15000, CAPS_WIN = 3;
const PICK_R = R + 16, ITEM_MAX = 2, KAKAO_MS = 25000, KIZAK_MS = 4500;
const TICK = 50, COUNT_MS = 3500, OVER_MS = 4300;
const HIT_TOL = 5, REWIND_MS = 140;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pickR = arr => arr[Math.floor(Math.random() * arr.length)];
const shuf = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const lerpAng = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a + d * k; };
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return Math.abs(d); };
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
const shade = (h, t) => /^#[0-9a-f]{6}$/i.test(h) ? (t < 0 ? mix(h, '#10162a', -t) : mix(h, '#ffffff', t)) : h;

// Kar topu uçuşu: şarj (0–1) hızı ve menzili artırır
const ballSp = (c, big) => (560 + 380 * c) * (big ? .88 : 1);
const ballRng = c => 230 + 330 * c;
const ballHmax = c => 26 + 36 * c;

const MODES = {
  takim: { name: 'Takım Maçı', icon: '⚔️' },
  bayrak: { name: 'Bayrak Kapmaca', icon: '🚩' },
  tek: { name: 'Herkes Tek', icon: '🎯' }
};
const TEAMS = [
  { name: 'Mavi Penguenler', short: 'Mavi', col: '#3d8bff', dk: '#1a4fae', lt: '#a9cdff', an: 'penguen', icon: '🐧' },
  { name: 'Kırmızı Tilkiler', short: 'Kırmızı', col: '#ff5a4f', dk: '#a8261e', lt: '#ffb3ab', an: 'tilki', icon: '🦊' }
];
const ITEMS = {
  dev: { name: 'Dev Kar Topu', short: 'Dev', col: '#bfe8ff', desc: 'Sıradaki atışın kocaman olur, duvarı tek atışta yıkar' },
  uclu: { name: 'Üçlü Atış', short: 'Üçlü', col: '#ffe14a', desc: 'Sonraki 2 atışın üç top birden fırlatır' },
  kakao: { name: 'Sıcak Kakao', short: 'Kakao', col: '#c98a5a', desc: '25 sn boyunca kardan çok daha çabuk silkelenirsin' },
  kizak: { name: 'Kızak', short: 'Kızak', col: '#ff6a3d', desc: '4,5 sn boyunca kızakla çok hızlı kayarsın' }
};
const ITEM_IDS = Object.keys(ITEMS);
const ANIMALS = ['penguen', 'tilki', 'ayi', 'tavsan', 'penguen', 'tilki', 'ayi', 'tavsan'];

/* ------------------------------------------------------------------ çizim yardımcıları */
function rrPath(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const D = {
  circle(g, x, y, r, fill, stroke, lw) { g.beginPath(); g.arc(x, y, Math.max(.1, r), 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } },
  ell(g, x, y, rx, ry, fill, rot = 0, stroke, lw) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } },
  rr(g, x, y, w, h, r, fill, stroke, lw) { rrPath(g, x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } },
  shadow(g, x, y, rx, ry, a = .2) { g.fillStyle = `rgba(40,60,110,${a})`; g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, TAU); g.fill(); },
  text(g, s, x, y, size, fill, stroke, font) { g.font = `${size}px ${font || '"Bungee","Arial Black","Segoe UI Black",sans-serif'}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if (stroke) { g.lineWidth = size * .22; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(s, x, y); } g.fillStyle = fill; g.fillText(s, x, y); },
  glow(g, x, y, r, col) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); },
  snowBall(g, x, y, r) { const gr = g.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.75, '#eef6ff'); gr.addColorStop(1, '#b9d2ee'); D.circle(g, x, y, r, gr, 'rgba(110,140,190,.55)', Math.max(1, r * .12)); }
};
function blob(g, x, y, rx, ry, seed, fill, stroke, lw) {   // yumuşak kar yığını
  const r = mulberry(seed), n = 11, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, k = .86 + r() * .22; pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]); }
  g.beginPath();
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; i ? g.quadraticCurveTo(p[0], p[1], mx, my) : g.moveTo(mx, my); }
  const p = pts[0], q = pts[1]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); }
}
function snowGround(g, seed, base, dots) {
  const r = mulberry(seed);
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 240; i++) D.ell(g, r() * W, r() * H, 30 + r() * 70, 10 + r() * 24, r() < .55 ? 'rgba(255,255,255,.7)' : 'rgba(190,212,240,.35)', r() * .6 - .3);
  for (let i = 0; i < 900; i++) D.circle(g, r() * W, r() * H, r() * 1.6 + .4, dots ? pickRnd(r, dots) : 'rgba(255,255,255,.9)');
  g.strokeStyle = 'rgba(160,190,230,.35)'; g.lineWidth = 1.5;
  for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * H, rr = 30 + r() * 90, a = r() * TAU; g.beginPath(); g.arc(x, y, rr, a, a + .5 + r() * .7); g.stroke(); }
}
function borderBank(g) {   // kenarda kar seddi
  g.fillStyle = '#dce9f8'; g.fillRect(0, 0, W, B); g.fillRect(0, H - B, W, B); g.fillRect(0, 0, B, H); g.fillRect(W - B, 0, B, H);
  for (let x = 0; x < W; x += 36) { D.circle(g, x + 18, 18, 24, '#ffffff', '#b8cde8', 1.5); D.circle(g, x + 18, H - 18, 24, '#ffffff', '#b8cde8', 1.5); }
  for (let y = 36; y < H - 36; y += 36) { D.circle(g, 18, y + 18, 24, '#ffffff', '#b8cde8', 1.5); D.circle(g, W - 18, y + 18, 24, '#ffffff', '#b8cde8', 1.5); }
}
function pickRnd(r, arr) { return arr[Math.floor(r() * arr.length)]; }
// kar bloklarından kale duvarı (zemin katmanında, üst yüzü belirgin)
function fortWall(g, o, tint) {
  D.rr(g, o.x + 5, o.y + 9, o.w, o.h, 8, 'rgba(60,90,140,.22)');
  D.rr(g, o.x, o.y + 6, o.w, o.h, 8, '#b4c9e6');
  D.rr(g, o.x, o.y, o.w, o.h, 8, '#f4f9ff', '#9fb8da', 2);
  g.save(); rrPath(g, o.x, o.y, o.w, o.h, 8); g.clip();
  g.strokeStyle = 'rgba(150,175,215,.55)'; g.lineWidth = 1.5;
  const horiz = o.w >= o.h, len = horiz ? o.w : o.h, th = horiz ? o.h : o.w, bw = 26;
  for (let row = 0; row * 15 < th; row++) {
    const off = row % 2 ? bw / 2 : 0;
    g.beginPath();
    if (horiz) { g.moveTo(o.x, o.y + row * 15); g.lineTo(o.x + o.w, o.y + row * 15); for (let k = off; k < len; k += bw) { g.moveTo(o.x + k, o.y + row * 15); g.lineTo(o.x + k, o.y + row * 15 + 15); } }
    else { g.moveTo(o.x + row * 15, o.y); g.lineTo(o.x + row * 15, o.y + o.h); for (let k = off; k < len; k += bw) { g.moveTo(o.x + row * 15, o.y + k); g.lineTo(o.x + row * 15 + 15, o.y + k); } }
    g.stroke();
  }
  if (tint) { g.fillStyle = tint; g.fillRect(o.x, o.y, o.w, o.h); }
  g.restore();
  D.rr(g, o.x + 3, o.y + 2, o.w - 6, Math.min(6, o.h * .3), 3, 'rgba(255,255,255,.9)');
}
function drawPine(g, x, y, s, fade, t, seed) {
  D.shadow(g, x + 10 * s, y + 6, 40 * s, 13 * s, .22);
  D.rr(g, x - 6 * s, y - 20 * s, 12 * s, 26 * s, 4, '#7a4a2a', '#4a2a14', 1.5);
  g.save(); g.globalAlpha *= fade;
  const sway = Math.sin(t / 1100 + seed) * 1.2;
  [[0, -16, 42, 34], [0, -46, 34, 30], [0, -74, 24, 26]].forEach(([dx, dy, w, h]) => {
    const tx = x + sway * (-dy / 40);
    g.fillStyle = '#2c7a55'; g.beginPath(); g.moveTo(x - w * s, y + dy * s); g.lineTo(tx, y + (dy - h - 10) * s); g.lineTo(x + w * s, y + dy * s); g.closePath(); g.fill();
    g.strokeStyle = '#1b5539'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x - w * .6 * s, y + (dy - h * .5) * s); g.lineTo(tx, y + (dy - h - 10) * s); g.lineTo(x + w * .6 * s, y + (dy - h * .5) * s);
    g.quadraticCurveTo(x + w * .2 * s, y + (dy - h * .3) * s, x, y + (dy - h * .45) * s); g.quadraticCurveTo(x - w * .2 * s, y + (dy - h * .3) * s, x - w * .6 * s, y + (dy - h * .5) * s); g.fill();
    D.ell(g, x - w * .55 * s, y + dy * s - 2, 9 * s, 4 * s, '#ffffff'); D.ell(g, x + w * .5 * s, y + dy * s - 2, 8 * s, 3.5 * s, '#ffffff');
  });
  g.restore();
}
function drawSnowman(g, x, y, t, fade, scarf) {
  D.shadow(g, x + 8, y + 8, 40, 13, .2);
  g.save(); g.globalAlpha *= fade;
  D.snowBall(g, x, y - 4, 32); D.snowBall(g, x, y - 42, 23); D.snowBall(g, x, y - 72, 17);
  D.rr(g, x - 19, y - 60, 38, 8, 4, scarf || '#ff4f6d', 'rgba(0,0,0,.3)', 1.2); D.rr(g, x + 6, y - 56, 9, 20, 3, scarf || '#ff4f6d', 'rgba(0,0,0,.3)', 1.2);
  [-48, -38, -28].forEach(dy => D.circle(g, x, y + dy + 6, 2.6, '#2d2340'));
  D.circle(g, x - 6, y - 76, 2.4, '#2d2340'); D.circle(g, x + 6, y - 76, 2.4, '#2d2340');
  g.fillStyle = '#ff8a00'; g.beginPath(); g.moveTo(x - 2, y - 72); g.lineTo(x + 14, y - 69); g.lineTo(x - 2, y - 66); g.fill();
  g.strokeStyle = '#2d2340'; g.lineWidth = 1.8; g.beginPath(); g.arc(x, y - 69, 6, .3, Math.PI - .3); g.stroke();
  D.ell(g, x, y - 87, 17, 4.5, '#2d2340'); D.rr(g, x - 11, y - 106, 22, 19, 4, '#2d2340'); D.rr(g, x - 11, y - 93, 22, 4, 2, scarf || '#ff4f6d');
  g.strokeStyle = '#7a4a2a'; g.lineWidth = 3; g.lineCap = 'round';
  const w = Math.sin(t / 520) * 3;
  g.beginPath(); g.moveTo(x - 21, y - 44); g.lineTo(x - 42, y - 60 + w); g.moveTo(x - 35, y - 55 + w); g.lineTo(x - 40, y - 67 + w); g.stroke();
  g.beginPath(); g.moveTo(x + 21, y - 44); g.lineTo(x + 42, y - 56 - w); g.moveTo(x + 36, y - 53 - w); g.lineTo(x + 44, y - 63 - w); g.stroke();
  g.lineCap = 'butt';
  g.restore();
}
function drawHouse(g, o, fade, roof, wall) {
  const { x, y, w, h } = o;
  D.shadow(g, x + w / 2 + 8, y + h + 4, w / 2 + 10, 12, .22);
  D.rr(g, x, y + h * .32, w, h * .68, 6, wall || '#e9c49a', '#8a5a34', 2.5);
  g.save(); g.globalAlpha *= fade;
  // pencere ve kapı
  D.rr(g, x + w * .14, y + h * .52, w * .22, h * .22, 4, '#ffe9a0', '#8a5a34', 2); D.rr(g, x + w * .64, y + h * .52, w * .22, h * .22, 4, '#ffe9a0', '#8a5a34', 2);
  g.strokeStyle = '#8a5a34'; g.lineWidth = 1.5; [[.25, .63], [.75, .63]].forEach(([u, v]) => { g.beginPath(); g.moveTo(x + w * u, y + h * .52); g.lineTo(x + w * u, y + h * .74); g.moveTo(x + w * (u - .11), y + h * v); g.lineTo(x + w * (u + .11), y + h * v); g.stroke(); });
  D.rr(g, x + w * .42, y + h * .6, w * .16, h * .4, 4, '#9b5a33', '#5e3418', 2);
  // çatı + kar
  g.fillStyle = roof || '#c0453a'; g.beginPath(); g.moveTo(x - 10, y + h * .36); g.lineTo(x + w / 2, y - h * .2); g.lineTo(x + w + 10, y + h * .36); g.closePath(); g.fill(); g.strokeStyle = shade(roof || '#c0453a', -.35); g.lineWidth = 2.5; g.stroke();
  g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x - 12, y + h * .36); g.lineTo(x + w / 2, y - h * .24); g.lineTo(x + w + 12, y + h * .36);
  for (let k = 0; k <= 6; k++) { const u = 1 - k / 6; g.quadraticCurveTo(x - 12 + (w + 24) * (u + 1 / 12), y + h * .36 - 4 - (k % 2) * 6, x - 12 + (w + 24) * u, y + h * .3); }
  g.closePath(); g.fill();
  D.rr(g, x + w * .7, y - h * .14, 16, 26, 2, '#8a5a52', '#4e2e2a', 1.5); D.rr(g, x + w * .7 - 2, y - h * .16, 20, 6, 3, '#ffffff');
  g.restore();
}
function drawLamp(g, x, y, t, fade) {
  D.shadow(g, x + 4, y + 3, 12, 5, .2);
  g.save(); g.globalAlpha *= fade;
  D.rr(g, x - 3, y - 64, 6, 66, 3, '#3a3f5a');
  D.rr(g, x - 9, y - 80, 18, 18, 5, '#ffe9a0', '#3a3f5a', 2.5);
  D.glow(g, x, y - 71, 34 + Math.sin(t / 400) * 2, 'rgba(255,230,140,.35)');
  D.ell(g, x, y - 82, 12, 4, '#ffffff');
  g.restore();
}
function drawRock(g, o) {
  D.shadow(g, o.x + 6, o.y + 8, o.r + 4, o.r * .45, .22);
  blob(g, o.x, o.y, o.r, o.r * .85, Math.round(o.x * 7 + o.y), '#8d9bb3', '#5b6680', 2);
  blob(g, o.x - o.r * .1, o.y - o.r * .32, o.r * .78, o.r * .45, Math.round(o.x + o.y * 3), '#ffffff');
}
function drawLog(g, o) {
  D.rr(g, o.x + 4, o.y + 8, o.w, o.h, o.h / 2, 'rgba(60,90,140,.2)');
  D.rr(g, o.x, o.y, o.w, o.h, o.h / 2, '#9a6237', '#5e3a1e', 2.5);
  g.strokeStyle = 'rgba(70,40,15,.45)'; g.lineWidth = 1.5;
  if (o.w >= o.h) { for (let k = 14; k < o.w - 10; k += 22) { g.beginPath(); g.moveTo(o.x + k, o.y + 6); g.lineTo(o.x + k + 10, o.y + 8); g.stroke(); } D.ell(g, o.x + o.w - o.h / 2, o.y + o.h / 2, o.h / 2 - 3, o.h / 2 - 3, '#d9a56b', 0, '#7a4a22', 1.5); }
  else { for (let k = 14; k < o.h - 10; k += 22) { g.beginPath(); g.moveTo(o.x + 6, o.y + k); g.lineTo(o.x + 8, o.y + k + 10); g.stroke(); } D.ell(g, o.x + o.w / 2, o.y + o.h - o.w / 2, o.w / 2 - 3, o.w / 2 - 3, '#d9a56b', 0, '#7a4a22', 1.5); }
  D.rr(g, o.x + 4, o.y - 2, o.w - 8, Math.min(8, o.h * .4), 4, '#ffffff');
}
function drawStall(g, o, col) {   // pazar tezgâhı / saman balyası
  D.rr(g, o.x + 4, o.y + 8, o.w, o.h, 6, 'rgba(60,90,140,.2)');
  D.rr(g, o.x, o.y, o.w, o.h, 6, '#d9b26a', '#8a6a2a', 2);
  g.strokeStyle = 'rgba(140,100,40,.55)'; g.lineWidth = 1.5;
  for (let k = 8; k < o.w; k += 12) { g.beginPath(); g.moveTo(o.x + k, o.y + 3); g.lineTo(o.x + k - 3, o.y + o.h - 3); g.stroke(); }
  for (let k = 0; k < o.w; k += 18) D.rr(g, o.x + k, o.y - 8, 18, 9, 3, (k / 18) % 2 ? '#ffffff' : (col || '#ff5a4f'));
  D.rr(g, o.x + 3, o.y - 10, o.w - 6, 5, 3, '#ffffff');
}
function drawFountain(g, x, y, r) {
  D.shadow(g, x + 6, y + 10, r + 8, r * .45, .22);
  D.circle(g, x, y, r, '#c8d3e2', '#7f8ea6', 3);
  const gr = g.createRadialGradient(x - r * .3, y - r * .3, 4, x, y, r * .85); gr.addColorStop(0, '#e9fbff'); gr.addColorStop(1, '#8fd0f4');
  D.circle(g, x, y, r * .82, gr);
  g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x, y, r * (.3 + i * .14), i, i + 1.2); g.stroke(); }
  D.circle(g, x, y, r * .24, '#e4eaf2', '#7f8ea6', 2);
  blob(g, x - r * .5, y - r * .7, r * .5, r * .22, 5, '#ffffff'); blob(g, x + r * .45, y + r * .62, r * .45, r * .2, 9, '#ffffff');
}
function drawHut(g, o) {   // buz balıkçısı kulübesi
  D.rr(g, o.x + 5, o.y + 9, o.w, o.h, 6, 'rgba(60,90,140,.22)');
  D.rr(g, o.x, o.y, o.w, o.h, 6, '#c07a4a', '#6e3f1a', 2.5);
  for (let k = 10; k < o.h; k += 12) { g.strokeStyle = 'rgba(80,40,10,.4)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(o.x + 3, o.y + k); g.lineTo(o.x + o.w - 3, o.y + k); g.stroke(); }
  D.rr(g, o.x - 4, o.y - 6, o.w + 8, 16, 6, '#ffffff', '#b9cde6', 1.5);
  D.rr(g, o.x + o.w * .35, o.y + o.h * .45, o.w * .3, o.h * .55, 3, '#6e3f1a');
}

/* ------------------------------------------------------------------ HARİTALAR */
const mirrorObs = o => (o.k === 'c' ? Object.assign({}, o, { x: W - o.x }) : Object.assign({}, o, { x: W - o.x - o.w }));
const mirrorPt = p => [W - p[0], p[1]];
const both = list => list.concat(list.map(mirrorObs));
const MAPS = {};

/* ===================== KÖY MEYDANI ===================== */
MAPS.koy = (() => {
  const forts = both([{ k: 'r', x: 290, y: 345, w: 34, h: 115, fort: 1 }, { k: 'r', x: 290, y: 540, w: 34, h: 115, fort: 1 }, { k: 'r', x: 190, y: 300, w: 120, h: 30, fort: 1 }, { k: 'r', x: 190, y: 670, w: 120, h: 30, fort: 1 }]);
  const houses = both([{ k: 'r', x: 560, y: 70, w: 150, h: 104, house: 1 }, { k: 'r', x: 560, y: 826, w: 150, h: 104, house: 1 }]);
  const stalls = both([{ k: 'r', x: 470, y: 455, w: 34, h: 90, stall: 1 }]);
  const bales = both([{ k: 'r', x: 600, y: 300, w: 92, h: 34, stall: 1 }, { k: 'r', x: 600, y: 666, w: 92, h: 34, stall: 1 }]);
  const lamps = both([{ k: 'c', x: 420, y: 230, r: 10, lamp: 1 }, { k: 'c', x: 420, y: 770, r: 10, lamp: 1 }]);
  const pines = both([{ k: 'c', x: 95, y: 110, r: 24, pine: 1 }, { k: 'c', x: 95, y: 890, r: 24, pine: 1 }, { k: 'c', x: 330, y: 120, r: 22, pine: 1 }, { k: 'c', x: 330, y: 880, r: 22, pine: 1 }]);
  const snowmen = [{ k: 'c', x: 800, y: 250, r: 28, snowman: 1 }, { k: 'c', x: 800, y: 750, r: 28, snowman: 1 }];
  const fountain = { k: 'c', x: 800, y: 500, r: 64 };
  const obs = forts.concat(houses, stalls, bales, lamps, pines, snowmen, [fountain]);
  return {
    id: 'koy', name: 'Köy Meydanı', icon: '🏘️', zones: [], obs,
    bases: [{ flag: [150, 500], spawns: [[120, 400], [120, 600], [235, 440], [235, 560]] }, { flag: mirrorPt([150, 500]), spawns: [[120, 400], [120, 600], [235, 440], [235, 560]].map(mirrorPt) }],
    ffa: [[150, 420], [1450, 580], [800, 130], [800, 870], [470, 620], [1130, 380], [520, 180], [1080, 820]],
    props: pines.map((o, i) => ({ x: o.x, y: o.y, fade: [52, 110], draw: (g, t, f) => drawPine(g, o.x, o.y, 1, f, t, i) }))
      .concat(snowmen.map(o => ({ x: o.x, y: o.y, fade: [40, 110], draw: (g, t, f) => drawSnowman(g, o.x, o.y, t, f) })))
      .concat(houses.map((o, i) => ({ x: o.x + o.w / 2, y: o.y + o.h, fade: [o.w / 2 + 6, o.h + 30], draw: (g, t, f) => drawHouse(g, o, f, ['#c0453a', '#3d6fc4', '#2f8a5a', '#a0522d'][i % 4]) })))
      .concat(lamps.map(o => ({ x: o.x, y: o.y, fade: [16, 80], draw: (g, t, f) => drawLamp(g, o.x, o.y, t, f) }))),
    paint(g) {
      snowGround(g, 11, '#eaf2fc');
      const r = mulberry(5);
      // arnavut kaldırımlı meydan
      g.save(); g.beginPath(); g.ellipse(800, 500, 330, 250, 0, 0, TAU); g.clip();
      g.fillStyle = '#c9cfd9'; g.fillRect(450, 240, 700, 520);
      for (let y = 250; y < 760; y += 16) for (let x = 460 + ((y / 16) % 2) * 9; x < 1150; x += 18) D.rr(g, x, y, 15, 12, 4, pickRnd(r, ['#b4bccb', '#aab3c4', '#bfc6d3']));
      for (let i = 0; i < 160; i++) blob(g, 460 + r() * 680, 250 + r() * 500, 20 + r() * 40, 8 + r() * 14, i + 3, 'rgba(255,255,255,.88)');
      g.restore();
      g.strokeStyle = 'rgba(150,170,200,.6)'; g.lineWidth = 3; g.beginPath(); g.ellipse(800, 500, 330, 250, 0, 0, TAU); g.stroke();
      // yollar
      g.strokeStyle = 'rgba(190,200,215,.55)'; g.lineWidth = 46; g.lineCap = 'round';
      [[[470, 500], [150, 500]], [[1130, 500], [1450, 500]], [[800, 250], [800, 60]], [[800, 750], [800, 940]]].forEach(p => { g.beginPath(); g.moveTo(p[0][0], p[0][1]); g.lineTo(p[1][0], p[1][1]); g.stroke(); });
      g.lineCap = 'butt';
      for (let i = 0; i < 60; i++) blob(g, r() * W, r() * H, 14 + r() * 26, 6 + r() * 10, 400 + i, 'rgba(255,255,255,.75)');
      // takım üsleri
      [[150, 500, TEAMS[0].col], [1450, 500, TEAMS[1].col]].forEach(([x, y, c]) => { g.save(); g.globalAlpha = .16; D.circle(g, x, y, 120, c); g.restore(); g.save(); g.setLineDash([10, 8]); g.strokeStyle = c; g.globalAlpha = .55; g.lineWidth = 3; g.beginPath(); g.arc(x, y, CAP_R + 6, 0, TAU); g.stroke(); g.restore(); });
      drawFountain(g, 800, 500, 64);
      stalls.forEach((o, i) => drawStall(g, o, i ? TEAMS[1].col : TEAMS[0].col));
      bales.forEach(o => drawStall(g, o, '#ffb627'));
      forts.forEach((o, i) => fortWall(g, o, i < forts.length / 2 ? 'rgba(61,139,255,.07)' : 'rgba(255,90,79,.07)'));
      borderBank(g);
    }
  };
})();

/* ===================== DONMUŞ GÖL ===================== */
MAPS.gol = (() => {
  const lake = { k: 'rr', x: 430, y: 170, w: 740, h: 660, r: 200, ice: true };
  const forts = both([{ k: 'r', x: 300, y: 370, w: 36, h: 100, fort: 1 }, { k: 'r', x: 300, y: 530, w: 36, h: 100, fort: 1 }, { k: 'r', x: 205, y: 250, w: 110, h: 30, fort: 1 }, { k: 'r', x: 205, y: 720, w: 110, h: 30, fort: 1 }]);
  const rocks = both([{ k: 'c', x: 610, y: 330, r: 30, rock: 1 }, { k: 'c', x: 610, y: 670, r: 30, rock: 1 }]);
  const hut = { k: 'r', x: 765, y: 465, w: 70, h: 70, hut: 1 };
  const banks = both([{ k: 'c', x: 410, y: 110, r: 34, bank: 1 }, { k: 'c', x: 410, y: 890, r: 34, bank: 1 }]);
  const pines = both([{ k: 'c', x: 90, y: 100, r: 24, pine: 1 }, { k: 'c', x: 90, y: 900, r: 24, pine: 1 }, { k: 'c', x: 240, y: 110, r: 22, pine: 1 }, { k: 'c', x: 240, y: 890, r: 22, pine: 1 }, { k: 'c', x: 640, y: 92, r: 22, pine: 1 }, { k: 'c', x: 640, y: 908, r: 22, pine: 1 }]);
  const snowmen = [{ k: 'c', x: 800, y: 110, r: 28, snowman: 1 }, { k: 'c', x: 800, y: 890, r: 28, snowman: 1 }];
  const obs = forts.concat(rocks, [hut], banks, pines, snowmen);
  return {
    id: 'gol', name: 'Donmuş Göl', icon: '🧊', zones: [lake], obs,
    bases: [{ flag: [140, 500], spawns: [[110, 400], [110, 600], [230, 440], [230, 560]] }, { flag: mirrorPt([140, 500]), spawns: [[110, 400], [110, 600], [230, 440], [230, 560]].map(mirrorPt) }],
    ffa: [[140, 380], [1460, 620], [520, 140], [1080, 860], [800, 340], [800, 660], [360, 860], [1240, 140]],
    props: pines.map((o, i) => ({ x: o.x, y: o.y, fade: [52, 110], draw: (g, t, f) => drawPine(g, o.x, o.y, o.r / 24, f, t, i) }))
      .concat(snowmen.map((o, i) => ({ x: o.x, y: o.y, fade: [40, 110], draw: (g, t, f) => drawSnowman(g, o.x, o.y, t, f, i ? '#3d8bff' : '#ff5a4f') }))),
    paint(g) {
      snowGround(g, 23, '#edf4fd');
      const r = mulberry(29);
      // göl
      D.rr(g, lake.x - 14, lake.y - 14, lake.w + 28, lake.h + 28, lake.r + 14, '#ffffff', '#a9c6e6', 3);
      const gr = g.createLinearGradient(lake.x, lake.y, lake.x + lake.w, lake.y + lake.h); gr.addColorStop(0, '#9fd6fb'); gr.addColorStop(.5, '#cdeeff'); gr.addColorStop(1, '#94cdf6');
      D.rr(g, lake.x, lake.y, lake.w, lake.h, lake.r, gr);
      g.save(); rrPath(g, lake.x, lake.y, lake.w, lake.h, lake.r); g.clip();
      g.globalAlpha = .35; g.fillStyle = '#ffffff';
      for (let x = -700; x < W; x += 200) { g.beginPath(); g.moveTo(x, lake.y); g.lineTo(x + 60, lake.y); g.lineTo(x + 720, lake.y + lake.h); g.lineTo(x + 660, lake.y + lake.h); g.fill(); }
      g.globalAlpha = 1;
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.5;
      for (let i = 0; i < 60; i++) { const x = lake.x + r() * lake.w, y = lake.y + r() * lake.h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 3; k++) g.lineTo(x + (r() - .5) * 90, y + (r() - .5) * 60); g.stroke(); }
      g.strokeStyle = 'rgba(70,140,200,.25)'; g.lineWidth = 2;
      for (let i = 0; i < 26; i++) { const x = lake.x + 60 + r() * (lake.w - 120), y = lake.y + 60 + r() * (lake.h - 120), a = r() * TAU; g.beginPath(); g.arc(x, y, 40 + r() * 120, a, a + .6); g.stroke(); }
      // buz delikleri
      [[700, 260], [900, 740], [560, 520], [1040, 480]].forEach(([x, y]) => { D.ell(g, x, y, 15, 9, '#2f6fa8', 0, '#ffffff', 3); D.ell(g, x - 3, y - 2, 6, 3, 'rgba(255,255,255,.4)'); });
      g.restore();
      // sazlar
      for (let i = 0; i < 46; i++) { const a = r() * TAU, x = 800 + Math.cos(a) * 395, y = 500 + Math.sin(a) * 345; g.strokeStyle = '#8a7a4a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 8, y - 16 - r() * 10); g.stroke(); D.ell(g, x + (r() - .5) * 4, y - 18 - r() * 8, 2.5, 5, '#7a5a30'); }
      [[140, 500, TEAMS[0].col], [1460, 500, TEAMS[1].col]].forEach(([x, y, c]) => { g.save(); g.globalAlpha = .16; D.circle(g, x, y, 120, c); g.restore(); g.save(); g.setLineDash([10, 8]); g.strokeStyle = c; g.globalAlpha = .55; g.lineWidth = 3; g.beginPath(); g.arc(x, y, CAP_R + 6, 0, TAU); g.stroke(); g.restore(); });
      rocks.forEach(o => drawRock(g, o));
      drawHut(g, hut);
      banks.forEach(o => { D.shadow(g, o.x + 6, o.y + 10, o.r + 6, o.r * .45, .18); blob(g, o.x, o.y, o.r + 4, o.r, o.x + o.y, '#ffffff', '#b2c8e4', 2); });
      forts.forEach((o, i) => fortWall(g, o, i < forts.length / 2 ? 'rgba(61,139,255,.07)' : 'rgba(255,90,79,.07)'));
      borderBank(g);
    },
    dyn(g, t) {   // buz parıltıları
      for (let i = 0; i < 12; i++) {
        const k = (t / 1800 + i * .41) % 1, x = 500 + ((i * 397) % 600), y = 230 + ((i * 263) % 540), a = Math.sin(k * Math.PI);
        g.globalAlpha = a * .9; g.strokeStyle = '#ffffff'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x - 6 * a, y); g.lineTo(x + 6 * a, y); g.moveTo(x, y - 6 * a); g.lineTo(x, y + 6 * a); g.stroke();
      }
      g.globalAlpha = 1;
    }
  };
})();

/* ===================== ÇAM ORMANI ===================== */
MAPS.orman = (() => {
  const forts = both([{ k: 'r', x: 285, y: 414, w: 34, h: 172, fort: 1 }, { k: 'r', x: 195, y: 330, w: 110, h: 30, fort: 1 }, { k: 'r', x: 195, y: 640, w: 110, h: 30, fort: 1 }]);
  const pinePts = [[100, 110, 24], [100, 890, 24], [250, 190, 22], [250, 810, 22], [420, 120, 24], [420, 880, 24], [440, 330, 22], [440, 670, 22], [560, 230, 24], [560, 770, 24],
    [600, 440, 22], [620, 600, 20], [700, 140, 22], [700, 860, 22], [390, 500, 20], [690, 330, 20]];
  const pines = both(pinePts.map(([x, y, r]) => ({ k: 'c', x, y, r, pine: 1 })));
  const logs = both([{ k: 'r', x: 500, y: 520, w: 30, h: 110, log: 1 }, { k: 'r', x: 330, y: 220, w: 100, h: 28, log: 1 }, { k: 'r', x: 330, y: 752, w: 100, h: 28, log: 1 }]);
  const stumps = both([{ k: 'c', x: 740, y: 420, r: 16, stump: 1 }]);
  const snowmen = [{ k: 'c', x: 800, y: 520, r: 30, snowman: 1 }];
  const obs = forts.concat(pines, logs, stumps, snowmen);
  return {
    id: 'orman', name: 'Çam Ormanı', icon: '🌲', zones: [], obs,
    bases: [{ flag: [140, 500], spawns: [[110, 400], [110, 600], [225, 440], [225, 560]] }, { flag: mirrorPt([140, 500]), spawns: [[110, 400], [110, 600], [225, 440], [225, 560]].map(mirrorPt) }],
    ffa: [[140, 420], [1460, 580], [800, 120], [800, 880], [520, 300], [1110, 700], [330, 900], [1270, 100]],
    props: pines.map((o, i) => ({ x: o.x, y: o.y, fade: [52, 110], draw: (g, t, f) => drawPine(g, o.x, o.y, o.r / 23, f, t, i) }))
      .concat(snowmen.map(o => ({ x: o.x, y: o.y, fade: [40, 110], draw: (g, t, f) => drawSnowman(g, o.x, o.y, t, f, '#2f8a5a') }))),
    paint(g) {
      snowGround(g, 37, '#e8f1f8', ['rgba(255,255,255,.9)', 'rgba(170,200,180,.5)']);
      const r = mulberry(41);
      // orman zemini: iğne yaprak ve dal izleri
      for (let i = 0; i < 260; i++) { const x = r() * W, y = r() * H; g.strokeStyle = r() < .5 ? 'rgba(60,110,80,.35)' : 'rgba(120,90,60,.3)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 14, y + (r() - .5) * 10); g.stroke(); }
      // açıklık
      g.save(); g.globalAlpha = .55; blob(g, 800, 500, 210, 170, 77, '#ffffff'); g.restore();
      // ayak izleri
      for (let k = 0; k < 4; k++) { const y0 = 200 + k * 200; for (let i = 0; i < 14; i++) { const x = 460 + i * 50, y = y0 + Math.sin(i * .7 + k) * 30 + (i % 2) * 10; D.ell(g, x, y, 5, 3, 'rgba(150,175,210,.45)', .3); } }
      [[140, 500, TEAMS[0].col], [1460, 500, TEAMS[1].col]].forEach(([x, y, c]) => { g.save(); g.globalAlpha = .16; D.circle(g, x, y, 120, c); g.restore(); g.save(); g.setLineDash([10, 8]); g.strokeStyle = c; g.globalAlpha = .55; g.lineWidth = 3; g.beginPath(); g.arc(x, y, CAP_R + 6, 0, TAU); g.stroke(); g.restore(); });
      pines.forEach(o => D.circle(g, o.x, o.y + 2, o.r + 8, 'rgba(90,130,110,.18)'));
      logs.forEach(o => drawLog(g, o));
      stumps.forEach(o => { D.shadow(g, o.x + 4, o.y + 6, o.r + 3, o.r * .45); D.circle(g, o.x, o.y, o.r, '#9a6237', '#5e3a1e', 2); D.circle(g, o.x, o.y - 2, o.r - 4, '#d9a56b'); D.circle(g, o.x, o.y - 2, o.r - 9, null, '#a87a48', 1.5); D.ell(g, o.x - 3, o.y - 6, o.r * .6, 4, '#ffffff'); });
      forts.forEach((o, i) => fortWall(g, o, i < forts.length / 2 ? 'rgba(61,139,255,.07)' : 'rgba(255,90,79,.07)'));
      borderBank(g);
    }
  };
})();
const MAP_IDS = Object.keys(MAPS);

/* ------------------------------------------------------------------ fizik: çarpışma, bölgeler, hareket */
function obsPush(o, x, y, r) {
  if (o.k === 'c') { const dx = x - o.x, dy = y - o.y, d = Math.hypot(dx, dy), m = r + o.r; if (d >= m) return null; if (d < 1e-6) return [1, 0, m]; return [dx / d, dy / d, m - d]; }
  const cx = clamp(x, o.x, o.x + o.w), cy = clamp(y, o.y, o.y + o.h), dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 > 1e-9) { const d = Math.sqrt(d2); return [dx / d, dy / d, r - d]; }
  const l = x - o.x, rt = o.x + o.w - x, t = y - o.y, bt = o.y + o.h - y, m = Math.min(l, rt, t, bt);
  if (m === l) return [-1, 0, l + r]; if (m === rt) return [1, 0, rt + r]; if (m === t) return [0, -1, t + r]; return [0, 1, bt + r];
}
function obsHit(o, x, y, r) {
  if (o.k === 'c') return (x - o.x) * (x - o.x) + (y - o.y) * (y - o.y) < (r + o.r) * (r + o.r);
  const cx = clamp(x, o.x, o.x + o.w), cy = clamp(y, o.y, o.y + o.h);
  return (x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r;
}
// Kar duvarı: bakış yönüne dik üç yuvarlak kar bloğu
function wallCircles(x, y, a) { const px = -Math.sin(a), py = Math.cos(a); return [-1, 0, 1].map(k => [Math.round(x + px * k * WALL_GAP), Math.round(y + py * k * WALL_GAP)]); }
function wallHit(w, x, y, r) { for (const c of w.cs) if ((x - c[0]) * (x - c[0]) + (y - c[1]) * (y - c[1]) < (r + WALL_CR) * (r + WALL_CR)) return true; return false; }
const wallObs = walls => { const out = []; for (const w of walls) for (const c of w.cs) out.push({ k: 'c', x: c[0], y: c[1], r: WALL_CR, wall: w.id }); return out; };
function circleFree(obs, x, y, r) {
  if (x < B + r || x > W - B - r || y < B + r || y > H - B - r) return false;
  for (const o of obs) if (obsPush(o, x, y, r)) return false;
  return true;
}
function inZone(z, x, y) {
  if (x < z.x || x > z.x + z.w || y < z.y || y > z.y + z.h) return false;
  const cx = clamp(x, z.x + z.r, z.x + z.w - z.r), cy = clamp(y, z.y + z.r, z.y + z.h - z.r);
  return Math.hypot(x - cx, y - cy) <= z.r;
}
const onIce = (map, x, y) => map.zones.some(z => z.ice && inZone(z, x, y));
function collide(obs, b, bounce) {
  for (let it = 0; it < 3; it++) {
    let hit = false;
    for (const o of obs) {
      const p = obsPush(o, b.x, b.y, R); if (!p) continue;
      hit = true; b.x += p[0] * p[2]; b.y += p[1] * p[2];
      const vn = b.vx * p[0] + b.vy * p[1];
      if (vn < 0) { b.vx -= (1 + bounce) * vn * p[0]; b.vy -= (1 + bounce) * vn * p[1]; }
    }
    if (b.x < B + R) { b.x = B + R; if (b.vx < 0) b.vx = -b.vx * bounce; hit = true; }
    if (b.x > W - B - R) { b.x = W - B - R; if (b.vx > 0) b.vx = -b.vx * bounce; hit = true; }
    if (b.y < B + R) { b.y = B + R; if (b.vy < 0) b.vy = -b.vy * bounce; hit = true; }
    if (b.y > H - B - R) { b.y = H - B - R; if (b.vy > 0) b.vy = -b.vy * bounce; hit = true; }
    if (!hit) break;
  }
}
// Ortak hareket adımı (yerel oyuncu ve botlar): buzda düşük tutunma, kayma
function moveBody(map, obs, b, ix, iy, spd, dt) {
  const ice = onIce(map, b.x, b.y);
  const tr = ice ? 2.1 : 14, k = 1 - Math.exp(-tr * dt);
  b.vx += (ix * spd - b.vx) * k; b.vy += (iy * spd - b.vy) * k;
  const sp = Math.hypot(b.vx, b.vy), n = Math.max(1, Math.ceil(sp * dt / 9));
  for (let i = 0; i < n; i++) { b.x += b.vx * dt / n; b.y += b.vy * dt / n; collide(obs, b, ice ? .5 : 0); }
}

/* ------------------------------------------------------------------ kar topu uçuşu (belirlenimci) */
// Top, atış anındaki engellere ve duvarlara göre nerede duracağını hesaplar.
function traceBall(map, walls, b) {
  const step = 5, n = Math.ceil(b.rng / step), rr = b.r * .6;
  for (let i = 0; i <= n; i++) {
    const d = Math.min(b.rng, i * step), x = b.x + b.dx * d, y = b.y + b.dy * d;
    if (x < B - 4 || x > W - B + 4 || y < B - 4 || y > H - B + 4) return { d, kind: 'edge', wid: 0 };
    for (const o of map.obs) if (obsHit(o, x, y, rr)) return { d, kind: 'obs', wid: 0 };
    for (const w of walls) if (wallHit(w, x, y, rr)) return { d, kind: 'wall', wid: w.id };
  }
  return { d: b.rng, kind: 'ground', wid: 0 };
}
function makeBall(map, walls, o) {
  const c = clamp(+o.c || 0, 0, 1), big = !!o.big, sp = ballSp(c, big), rng = ballRng(c);
  const b = { id: o.id, pi: o.pi, tm: o.tm, k: o.k == null ? null : o.k, c: +c.toFixed(3), big: big ? 1 : 0, r: big ? BIG_R : BR,
    x: Math.round(o.x), y: Math.round(o.y), dx: +Math.cos(o.a).toFixed(5), dy: +Math.sin(o.a).toFixed(5), sp: Math.round(sp), rng: Math.round(rng), t0: Math.round(o.t0) };
  const tr = traceBall(map, walls, b);
  b.d = Math.round(tr.d); b.kind = tr.kind; b.wid = tr.wid;
  b.endT = b.t0 + Math.round(b.d / b.sp * 1000);
  b.ex = Math.round(b.x + b.dx * b.d); b.ey = Math.round(b.y + b.dy * b.d);
  return b;
}
function ballPos(b, t) {
  const u = clamp((t - b.t0) / 1000 * b.sp, 0, b.d), s = u / b.rng;
  return [b.x + b.dx * u, b.y + b.dy * u, ballHmax(b.c) * 4 * s * (1 - s) + 14 * (1 - s), u];
}

/* ------------------------------------------------------------------ yol bulma (botlar) */
const NC = 25, NX = Math.ceil(W / NC), NY = Math.ceil(H / NC), NN = NX * NY;
const navCache = {};
function navOf(id) {
  if (navCache[id]) return navCache[id];
  const map = MAPS[id], walk = new Uint8Array(NN), ice = new Uint8Array(NN), shot = new Uint8Array(NN);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const x = (i + .5) * NC, y = (j + .5) * NC, c = j * NX + i;
    walk[c] = circleFree(map.obs, x, y, R + 3) ? 1 : 0;
    ice[c] = onIce(map, x, y) ? 1 : 0;
    shot[c] = (x > B && x < W - B && y > B && y < H - B && !map.obs.some(o => obsHit(o, x, y, 3))) ? 1 : 0;   // top geçer mi
  }
  return (navCache[id] = { walk, ice, shot });
}
function cellOf(nav, x, y) {
  const i0 = clamp(Math.floor(x / NC), 0, NX - 1), j0 = clamp(Math.floor(y / NC), 0, NY - 1), c0 = j0 * NX + i0;
  if (nav.walk[c0]) return c0;
  let best = -1, bd = 1e9;
  for (let rad = 1; rad <= 4 && best < 0; rad++) for (let b = -rad; b <= rad; b++) for (let a = -rad; a <= rad; a++) {
    if (Math.max(Math.abs(a), Math.abs(b)) !== rad) continue;
    const i = i0 + a, j = j0 + b; if (i < 0 || j < 0 || i >= NX || j >= NY || !nav.walk[j * NX + i]) continue;
    const d = dist(x, y, (i + .5) * NC, (j + .5) * NC); if (d < bd) { bd = d; best = j * NX + i; }
  }
  return best;
}
const cx_ = c => (c % NX + .5) * NC, cy_ = c => (Math.floor(c / NX) + .5) * NC;
const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function bfs(nav, srcs) {
  const d = new Int16Array(NN).fill(-1), par = new Int32Array(NN).fill(-1), qu = new Int32Array(NN);
  let h = 0, t = 0;
  for (const s of srcs) if (s >= 0 && d[s] < 0) { d[s] = 0; qu[t++] = s; }
  while (h < t) {
    const c = qu[h++], i = c % NX, j = (c - i) / NX;
    for (const [a, b] of N8) {
      const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= NX || y >= NY) continue;
      const n = y * NX + x; if (!nav.walk[n] || d[n] >= 0) continue;
      if (a && b && (!nav.walk[j * NX + x] || !nav.walk[y * NX + i])) continue;
      d[n] = d[c] + 1; par[n] = c; qu[t++] = n;
    }
  }
  return { d, par };
}
function pathTo(f, tc) { const out = []; let c = tc, k = 0; while (c >= 0 && k++ < NN) { out.push([cx_(c), cy_(c)]); if (f.d[c] === 0) break; c = f.par[c]; } out.reverse(); return out.slice(1, 70); }
function losWalk(nav, x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1), n = Math.ceil(d / (NC * .5));
  for (let k = 1; k <= n; k++) {
    const u = k / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
    if (u * d < 16) continue;
    const i = Math.floor(x / NC), j = Math.floor(y / NC);
    if (i < 0 || j < 0 || i >= NX || j >= NY || !nav.walk[j * NX + i]) return false;
  }
  return true;
}
// Izgara üstünden hızlı görüş (siper ararken; duvarlar hariç)
function losShot(nav, x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1), n = Math.ceil(d / (NC * .5));
  for (let k = 1; k < n; k++) {
    const u = k / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
    if (u * d < R || (1 - u) * d < R) continue;
    const i = Math.floor(x / NC), j = Math.floor(y / NC);
    if (i < 0 || j < 0 || i >= NX || j >= NY || !nav.shot[j * NX + i]) return false;
  }
  return true;
}
// Kar topu bu çizgiden geçer mi (statik engeller + duvarlar)
function clearShot(map, walls, x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1), n = Math.ceil(d / 8);
  for (let k = 1; k < n; k++) {
    const u = k / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
    if (u * d < R + 4 || (1 - u) * d < R) continue;
    for (const o of map.obs) if (obsHit(o, x, y, 4)) return false;
    for (const w of walls) if (wallHit(w, x, y, 4)) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ KURALLAR (yöneten cihaz) */
let uiRef = null;
function fastOut(o) { if (uiRef && uiRef.fast && uiRef.mode === 'online') { try { uiRef.fast(o); } catch { /* */ } } }
const pname = (st, i) => (st.players[i] ? st.players[i].name : '?');
const isEnemy = (st, a, b) => a !== b && (st.mode === 'tek' || st.team[a] !== st.team[b]);
const teamName = t => TEAMS[t] ? TEAMS[t].name : '';
function setPhase(st, ph, ms) { st.phase = ph; st.endsAt = Date.now() + ms; st.phaseDur = Math.max(1, ms); }
function newBot(pi) { return { vx: 0, vy: 0, wp: null, re: 0, goal: null, gk: '', tgt: -1, nextThrow: 0, scoop: 0, jit: null, jitUntil: 0, sx: 0, sy: 0, sAt: 0, role: pi % 2 ? 'atk' : 'def', strafe: Math.random() < .5 ? 1 : -1, strafeAt: 0, wallAt: 0, hold: 0, zz: 1, zzAt: 0 }; }
function targetScore(n) { return n <= 2 ? 7 : n <= 4 ? 10 : n <= 6 ? 13 : 15; }

function assignTeams(players, how) {
  const n = players.length, team = Array(n).fill(0);
  const hum = players.map((p, i) => i).filter(i => !players[i].isBot), bots = players.map((p, i) => i).filter(i => players[i].isBot);
  if (how === 'sira') { for (let i = 0; i < n; i++) team[i] = i % 2; return team; }
  if (how === 'insan' && hum.length < n) {
    // insanlar bir arada, botlar karşı takımda; sayılar mümkün olduğunca dengeli
    hum.forEach(i => { team[i] = 0; });
    const need = Math.max(0, Math.floor(n / 2) - hum.length);
    bots.forEach((i, k) => { team[i] = k < need ? 0 : 1; });
    if (!team.includes(1)) team[n - 1] = 1;
    return team;
  }
  // otomatik denge: insanlar ve botlar iki takıma eşit dağıtılır
  const order = shuf(hum).concat(shuf(bots)); let c = [0, 0];
  order.forEach((i, k) => { const t = c[0] === c[1] ? (k % 2 === 0 ? (Math.random() < .5 ? 0 : 1) : (c[0] < c[1] ? 0 : 1)) : (c[0] < c[1] ? 0 : 1); team[i] = t; c[t]++; });
  return team;
}
function spawnPoint(st, pi, now) {
  const map = MAPS[st.mapId];
  if (st.mode === 'tek') {
    let best = null, bs = -1;
    map.ffa.forEach(p => {
      let md = 1e9; st.pos.forEach((q, j) => { if (j !== pi && q) md = Math.min(md, dist(p[0], p[1], q.x, q.y)); });
      const s = md + Math.random() * 60; if (s > bs) { bs = s; best = p; }
    });
    return best || map.ffa[pi % map.ffa.length];
  }
  const base = map.bases[st.team[pi]], mates = st.players.map((_, j) => j).filter(j => st.team[j] === st.team[pi]);
  const k = Math.max(0, mates.indexOf(pi));
  const sp = base.spawns[k % base.spawns.length];
  // başkası tam üstündeyse bir sonrakini dene
  for (let t = 0; t < base.spawns.length; t++) {
    const p = base.spawns[(k + t) % base.spawns.length];
    if (!st.pos.some((q, j) => j !== pi && q && dist(p[0], p[1], q.x, q.y) < 2 * R + 4)) return p;
  }
  void now; return sp;
}
function startMatch(st, ctx) {
  const n = st.players.length, now = Date.now();
  st.pos = Array(n).fill(null);
  for (let i = 0; i < n; i++) { const p = spawnPoint(st, i, now); st.pos[i] = { x: p[0], y: p[1], h: st.mode === 'tek' ? Math.atan2(500 - p[1], 800 - p[0]) : (st.team[i] ? Math.PI : 0), m: 0, t: now, c: 0 }; }
  st.hist = st.pos.map(p => [[now, p.x, p.y]]);
  st.still = st.pos.map(() => now - 1000); st.anchor = st.pos.map(p => [p.x, p.y]);
  st.spawnN = Array(n).fill(0);
  setPhase(st, 'count', COUNT_MS);
  const mp = MAPS[st.mapId], md = MODES[st.mode];
  ctx.emit({ t: 'start' }, `${md.icon} ${md.name} · ${mp.icon} ${mp.name} · ${st.mode === 'bayrak' ? `${CAPS_WIN} bayrak` : `${st.target} isabet`} kazandırır`, 'gold');
  ctx.sync();
}
function startPlay(st, ctx) {
  const now = Date.now();
  setPhase(st, 'play', st.dur * 1000); st.playAt = now;
  st.nextItemAt = now + rnd(5000, 8000);
  st.pos.forEach(p => { p.t = now; });
  st.lastThrow = st.players.map(() => now - 1000); st.lastScoop = st.players.map(() => now - 1000);
  ctx.emit({ t: 'go' }, 'Kar topu savaşı başladı! ❄️');
}
// Konum geçmişi (gecikme toleranslı isabet için)
function pushHist(st, pi, now) { const h = st.hist[pi], p = st.pos[pi]; h.push([now, p.x, p.y]); while (h.length > 10 || (h.length > 2 && now - h[0][0] > 600)) h.shift(); }
function posAt(st, pi, t) {
  const h = st.hist[pi]; if (!h || !h.length) return [st.pos[pi].x, st.pos[pi].y];
  if (t <= h[0][0]) return [h[0][1], h[0][2]];
  for (let k = h.length - 1; k > 0; k--) { const a = h[k - 1], b = h[k]; if (t >= a[0]) { if (t >= b[0]) return [b[1], b[2]]; const u = (t - a[0]) / Math.max(1, b[0] - a[0]); return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; } }
  return [h[h.length - 1][1], h[h.length - 1][2]];
}
// Hızlı kanaldan gelen konum: hız sınırıyla kaydedilir
function applyPos(st, pi, x, y, h, m, c) {
  if (st.phase !== 'play' || !st.players[pi] || st.players[pi].isBot || st.frz[pi]) return false;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const p = st.pos[pi], now = Date.now(), maxd = MAXV * clamp((now - p.t) / 1000, 0, 1.5) * 1.35 + 50, d = dist(x, y, p.x, p.y);
  if (d > maxd) { const k = maxd / d; x = p.x + (x - p.x) * k; y = p.y + (y - p.y) * k; }
  st.pos[pi] = { x: Math.round(clamp(x, B + R, W - B - R)), y: Math.round(clamp(y, B + R, H - B - R)), h: Number.isFinite(h) ? +h.toFixed(2) : p.h, m: m ? 1 : 0, t: now, c: c ? 1 : 0 };
  const an = st.anchor[pi]; if (dist(an[0], an[1], st.pos[pi].x, st.pos[pi].y) > 8) { st.anchor[pi] = [st.pos[pi].x, st.pos[pi].y]; st.still[pi] = now; }
  pushHist(st, pi, now);
  return true;
}
function hostPosIn(seat, x, y, h, m, c, cid) {
  const R0 = window.CFX && window.CFX.Room, g = R0 && R0.game;
  if (!g || !g.state || g.def.id !== 'kartopu' || !R0.isRunner() || g.result) return;
  if (cid !== undefined && (!g.players[seat] || g.players[seat].cid !== cid)) return;
  applyPos(g.state, seat, x, y, h, m, c);
}
function freezeMs(st, pi, now) {
  if (st.pw[pi].kakao > now) return FREEZE_KAKAO;
  if (st.mode !== 'tek') { const c = [0, 0]; st.team.forEach(t => c[t]++); if (c[st.team[pi]] < c[1 - st.team[pi]]) return FREEZE_SMALL; }
  return FREEZE_MS;
}
function canBeHit(st, a, b, now) { return isEnemy(st, a, b) && !st.frz[b] && !(st.inv[b] > now) && st.online[b] !== false; }

/* ---- atış ---- */
function doThrow(st, pi, x, y, ang, c, t0, k, ctx) {
  const now = Date.now(), map = MAPS[st.mapId];
  st.ammo[pi]--; st.lastThrow[pi] = now; st.stats[pi].th++;
  const pw = st.pw[pi], big = pw.dev > 0, tri = pw.uclu > 0;
  if (big) pw.dev = 0;
  if (tri) pw.uclu--;
  const angs = tri ? [ang - .2, ang, ang + .2] : [ang];
  const balls = angs.map((a, n) => {
    const sx = x + Math.cos(a) * (R + 4), sy = y + Math.sin(a) * (R + 4);
    const b = makeBall(map, st.walls, { id: ++st.bid, pi, tm: st.mode === 'tek' ? -1 : st.team[pi], k: n === 1 || angs.length === 1 ? k : null, a, c, big, x: sx, y: sy, t0 });
    b.done = 0; b.lt = t0;
    return b;
  });
  balls.forEach(b => st.balls.push(b));
  st.pos[pi].h = +ang.toFixed(2);
  ctx.emit({ t: 'th', pi, k, b: balls.map(pubBall) });
  st.dirty = true;
  return balls;
}
const pubBall = b => ({ id: b.id, pi: b.pi, tm: b.tm, k: b.k, c: b.c, big: b.big, r: b.r, x: b.x, y: b.y, dx: b.dx, dy: b.dy, sp: b.sp, rng: b.rng, t0: b.t0, d: b.d, kind: b.kind, wid: b.wid, endT: b.endT, ex: b.ex, ey: b.ey });
function throwAct(st, pi, a, ctx) {
  const now = Date.now();
  const rej = () => { ctx.emit({ t: 'nothrow', pi, k: a.k }); return false; };
  if (st.phase !== 'play' || st.frz[pi] || st.ammo[pi] <= 0 || now - st.lastThrow[pi] < THROW_CD) return rej();
  const ang = +a.a; if (!Number.isFinite(ang)) return rej();
  const p = st.pos[pi];
  let x = +a.x, y = +a.y;
  // istemcinin bildirdiği atış noktası son bilinen konuma yakın olmalı
  if (!Number.isFinite(x) || !Number.isFinite(y) || dist(x, y, p.x, p.y) > MAXV * clamp((now - p.t) / 1000, 0, 1) * 1.3 + 45 || !circleFree(MAPS[st.mapId].obs, x, y, R - 6)) { x = p.x; y = p.y; }
  else { st.pos[pi] = Object.assign({}, p, { x: Math.round(x), y: Math.round(y), t: now }); pushHist(st, pi, now); }
  const maxC = clamp((now - st.lastThrow[pi]) / CHARGE_MS + .2, 0, 1);
  const c = clamp(Number.isFinite(+a.c) ? +a.c : 0, 0, maxC);
  let t0 = Number.isFinite(+a.ts) ? +a.ts : now; t0 = clamp(t0, now - 200, now);
  const k = typeof a.k === 'number' && Number.isFinite(a.k) ? Math.round(a.k) : null;
  doThrow(st, pi, x, y, ang, c, t0, k, ctx);
  return true;
}
/* ---- kar toplama ---- */
function scoopAct(st, pi, ctx, force) {
  const now = Date.now(), p = st.pos[pi];
  if (st.phase !== 'play' || st.frz[pi] || st.ammo[pi] >= AMMO_MAX) return false;
  if (now - st.lastScoop[pi] < SCOOP_MS * .8) return false;
  if (onIce(MAPS[st.mapId], p.x, p.y)) { if (!force) ctx.emit({ t: 'noscoop', pi }); return false; }
  if (!force && now - st.still[pi] < 280) return false;
  st.ammo[pi]++; st.lastScoop[pi] = now; st.dirty = true;
  return true;
}
/* ---- duvar ---- */
function wallAct(st, pi, a, ctx) {
  const now = Date.now(), map = MAPS[st.mapId], p = st.pos[pi];
  const no = why => { ctx.emit({ t: 'nowall', pi, why }); return false; };
  if (st.phase !== 'play' || st.frz[pi]) return no('');
  if (st.wstock[pi] <= 0) return no('stok');
  const mine = st.walls.filter(w => w.by === pi);
  const ang = Number.isFinite(+a.a) ? +a.a : p.h;
  const others = st.pos.map((q, j) => ({ k: 'c', x: q.x, y: q.y, r: R })).filter((_, j) => j !== pi);
  const flagsObs = st.flags.map(f => ({ k: 'c', x: f.x, y: f.y, r: 26 }));
  const cands = [];
  for (const da of [0, .3, -.3, .6, -.6]) for (const d of [WALL_D, WALL_D + 12, WALL_D + 26]) cands.push([ang + da, d]);
  for (const [aa, d] of cands) {
    const wx = p.x + Math.cos(aa) * d, wy = p.y + Math.sin(aa) * d, cs = wallCircles(wx, wy, aa);
    const blk = map.obs.concat(wallObs(st.walls), others, flagsObs);
    if (!cs.every(c => circleFree(blk, c[0], c[1], WALL_CR - 3))) continue;
    if (cs.some(c => dist(c[0], c[1], p.x, p.y) < R + WALL_CR - 2)) continue;
    if (mine.length >= WALL_MAX) { const old = mine[0]; st.walls = st.walls.filter(w => w !== old); }
    const w = { id: ++st.wid, by: pi, tm: st.mode === 'tek' ? -1 : st.team[pi], x: Math.round(wx), y: Math.round(wy), a: +aa.toFixed(2), cs, hp: WALL_HP, t0: now, until: now + WALL_LIFE };
    st.walls.push(w); st.wstock[pi]--; if (!st.wregen[pi]) st.wregen[pi] = now + WALL_REGEN; st.stats[pi].wl++;
    ctx.emit({ t: 'wall', w: Object.assign({}, w) }, null);
    st.dirty = true;
    Object.values(st.bot).forEach(b => { b.re = 0; });
    return true;
  }
  return no('yer');
}
function damageWall(st, w, dmg, ctx, x, y) {
  w.hp -= dmg;
  if (w.hp <= 0) st.walls = st.walls.filter(q => q !== w);
  ctx.emit({ t: 'wh', wid: w.id, hp: Math.max(0, w.hp), x: Math.round(x), y: Math.round(y) });
  st.dirty = true;
}
/* ---- isabet ---- */
function hitPlayer(st, b, vi, x, y, ctx) {
  const now = Date.now(), a = b.pi;
  st.frz[vi] = now + freezeMs(st, vi, now);
  st.stats[a].hit++; st.stats[vi].gotHit++;
  if (st.mode === 'tek') st.ts[a] = (st.ts[a] || 0) + 1;
  else if (st.mode === 'takim') st.ts[st.team[a]]++;
  let fl = -1;
  for (const f of st.flags) if (f.state === 'carried' && f.by === vi) { f.state = 'dropped'; f.by = -1; f.x = Math.round(st.pos[vi].x); f.y = Math.round(st.pos[vi].y); f.retAt = now + FLAG_RET_MS; fl = f.team; }
  st.pos[vi] = Object.assign({}, st.pos[vi], { m: 0, c: 0, t: now });
  if (st.bot[vi]) { st.bot[vi].vx = st.bot[vi].vy = 0; st.bot[vi].scoop = 0; }
  const msg = st.mode === 'tek' ? `❄️ ${pname(st, a)} → ${pname(st, vi)} karlandı!` : `❄️ ${pname(st, vi)} karlandı! (${pname(st, a)})`;
  ctx.emit({ t: 'hit', id: b.id, a, b: vi, x: Math.round(x), y: Math.round(y), big: b.big, fl }, fl >= 0 ? `${msg} 🚩 Bayrak düştü!` : msg, '');
  st.dirty = true;
  Object.values(st.bot).forEach(bb => { bb.re = 0; });
  checkWin(st, ctx);
}
// Topu son tikten bu yana adım adım ilerletir: duvar ve oyuncu denetimi
function stepBalls(st, now, ctx) {
  const map = MAPS[st.mapId];
  for (const b of st.balls) {
    if (b.done) continue;
    const tA = b.lt, tB = Math.min(now, b.endT); b.lt = now;
    if (tB >= tA) {
      const steps = Math.max(1, Math.ceil((tB - tA) / 1000 * b.sp / 6));
      for (let s = 1; s <= steps && !b.done; s++) {
        const t = tA + (tB - tA) * s / steps, [x, y, z] = ballPos(b, t);
        // atıştan sonra kurulan duvarlar
        for (const w of st.walls) { if (w.id === b.wid) continue; if (wallHit(w, x, y, b.r * .6)) { b.done = 1; damageWall(st, w, b.big ? 3 : 1, ctx, x, y); break; } }
        if (b.done) break;
        if (z > 70) continue;
        for (let j = 0; j < st.players.length; j++) {
          if (!canBeHit(st, b.pi, j, now)) continue;
          const rad = R + b.r * .8, q = st.pos[j];
          let hit = dist(x, y, q.x, q.y) < rad + HIT_TOL;
          if (!hit && !st.players[j].isBot) { const o = posAt(st, j, t - REWIND_MS); hit = dist(x, y, o[0], o[1]) < rad; }
          if (hit) { b.done = 1; hitPlayer(st, b, j, x, y, ctx); break; }
        }
      }
    }
    if (!b.done && now >= b.endT) {
      b.done = 1;
      if (b.kind === 'wall') { const w = st.walls.find(q => q.id === b.wid); if (w) damageWall(st, w, b.big ? 3 : 1, ctx, b.ex, b.ey); }
    }
    if (st.phase !== 'play') return;
  }
  const before = st.balls.length;
  st.balls = st.balls.filter(b => !b.done);
  if (st.balls.length !== before) st.dirty = true;
}
/* ---- bayraklar ---- */
function flagTick(st, now, ctx) {
  if (st.mode !== 'bayrak') return;
  const map = MAPS[st.mapId];
  for (const f of st.flags) {
    if (f.state === 'carried') {
      const p = st.pos[f.by]; if (!p || st.frz[f.by] || st.online[f.by] === false) { f.state = 'dropped'; f.retAt = now + FLAG_RET_MS; if (p) { f.x = Math.round(p.x); f.y = Math.round(p.y); } f.by = -1; st.dirty = true; continue; }
      f.x = Math.round(p.x); f.y = Math.round(p.y);
      // eve getirdi mi? (kendi bayrağı yerindeyse)
      const ht = st.team[f.by], home = map.bases[ht].flag, own = st.flags[ht];
      if (own.state === 'home' && dist(p.x, p.y, home[0], home[1]) < CAP_R) {
        st.ts[ht]++; st.stats[f.by].cap++;
        const by = f.by; f.state = 'home'; f.by = -1; f.x = map.bases[f.team].flag[0]; f.y = map.bases[f.team].flag[1];
        ctx.emit({ t: 'flag', k: 'cap', team: ht, pi: by }, `🚩 ${pname(st, by)} bayrağı kaptı ve eve getirdi! ${teamName(ht)} +1`, 'gold');
        st.dirty = true; Object.values(st.bot).forEach(b => { b.re = 0; });
        checkWin(st, ctx); if (st.phase !== 'play') return;
      }
      continue;
    }
    if (f.state === 'dropped' && now >= f.retAt) {
      f.state = 'home'; f.x = map.bases[f.team].flag[0]; f.y = map.bases[f.team].flag[1];
      ctx.emit({ t: 'flag', k: 'auto', team: f.team }, `🚩 ${teamName(f.team)} bayrağı yerine döndü.`); st.dirty = true; continue;
    }
    for (let i = 0; i < st.players.length; i++) {
      if (st.frz[i] || st.online[i] === false) continue;
      const p = st.pos[i]; if (dist(p.x, p.y, f.x, f.y) > FLAG_R) continue;
      if (st.team[i] !== f.team) {
        if (st.flags.some(o => o.by === i)) continue;
        f.state = 'carried'; f.by = i;
        ctx.emit({ t: 'flag', k: 'take', team: f.team, pi: i }, `🏃 ${pname(st, i)} ${teamName(f.team)} bayrağını kaptı!`, 'gold');
        st.dirty = true; Object.values(st.bot).forEach(b => { b.re = 0; }); break;
      } else if (f.state === 'dropped') {
        f.state = 'home'; f.x = map.bases[f.team].flag[0]; f.y = map.bases[f.team].flag[1]; st.stats[i].ret++;
        ctx.emit({ t: 'flag', k: 'ret', team: f.team, pi: i }, `🛡️ ${pname(st, i)} bayrağını kurtarıp yerine koydu!`, 'good');
        st.dirty = true; break;
      }
    }
  }
}
/* ---- güçlendirmeler ---- */
function spawnItems(st, now) {
  if (!st.pu || now < st.nextItemAt) return false;
  st.nextItemAt = now + rnd(8000, 12000);
  if (st.items.length >= ITEM_MAX) return false;
  const map = MAPS[st.mapId], nav = navOf(st.mapId);
  for (let t = 0; t < 80; t++) {
    const x = Math.round(rnd(380, W - 380)), y = Math.round(rnd(90, H - 90));
    const c = cellOf(nav, x, y); if (c < 0 || dist(cx_(c), cy_(c), x, y) > 4 || !circleFree(map.obs, x, y, R + 6)) continue;
    if (st.pos.some(p => dist(p.x, p.y, x, y) < 140) || st.items.some(o => dist(o.x, o.y, x, y) < 260)) continue;
    // simetrik adalet: ortadan çok uzağa koyma
    const k = pickR(ITEM_IDS);
    st.items.push({ id: ++st.iid, k, x, y });
    return true;
  }
  return false;
}
function pickups(st, now, ctx) {
  let any = false;
  for (let k = st.items.length - 1; k >= 0; k--) {
    const it = st.items[k];
    for (let i = 0; i < st.players.length; i++) {
      if (st.frz[i] || st.online[i] === false) continue;
      const p = st.pos[i]; if (dist(p.x, p.y, it.x, it.y) > PICK_R) continue;
      const pw = st.pw[i];
      if (it.k === 'dev') pw.dev = 1; else if (it.k === 'uclu') pw.uclu = 2; else if (it.k === 'kakao') pw.kakao = now + KAKAO_MS; else pw.kizak = now + KIZAK_MS;
      if (it.k === 'dev' || it.k === 'uclu') st.ammo[i] = Math.max(st.ammo[i], 2);
      st.items.splice(k, 1); any = true; st.stats[i].pk++;
      ctx.emit({ t: 'pick', pi: i, k: it.k, x: it.x, y: it.y }, `🎁 ${pname(st, i)}: ${ITEMS[it.k].name}!`);
      if (st.bot[i]) st.bot[i].re = 0;
      break;
    }
  }
  return any;
}
/* ---- donma bitişi, duvar erimesi, duvar stoğu ---- */
function timers(st, now, ctx) {
  for (let i = 0; i < st.players.length; i++) {
    if (st.frz[i] && now >= st.frz[i]) {
      st.frz[i] = 0; st.inv[i] = now + INV_MS;
      const from = st.pos[i], sp = spawnPoint(st, i, now);
      st.pos[i] = { x: sp[0], y: sp[1], h: from.h, m: 0, t: now, c: 0 }; st.spawnN[i]++;
      st.hist[i] = [[now, sp[0], sp[1]]]; st.anchor[i] = [sp[0], sp[1]]; st.still[i] = now;
      if (st.bot[i]) { st.bot[i].vx = st.bot[i].vy = 0; st.bot[i].re = 0; st.bot[i].wp = null; }
      ctx.emit({ t: 'shake', pi: i, x: Math.round(from.x), y: Math.round(from.y), nx: sp[0], ny: sp[1] });
      st.dirty = true;
    }
    if (st.wstock[i] < WALL_STOCK && st.wregen[i] && now >= st.wregen[i]) { st.wstock[i]++; st.wregen[i] = st.wstock[i] < WALL_STOCK ? now + WALL_REGEN : 0; st.dirty = true; }
    else if (st.wstock[i] >= WALL_STOCK) st.wregen[i] = 0;
  }
  const n0 = st.walls.length; st.walls = st.walls.filter(w => w.until > now); if (st.walls.length !== n0) st.dirty = true;
}
/* ---- bitiş ---- */
function leaders(st) {
  if (st.mode === 'tek') { const mx = Math.max(...st.players.map((_, i) => st.ts[i] || 0)); return st.players.map((_, i) => i).filter(i => (st.ts[i] || 0) === mx); }
  return st.ts[0] === st.ts[1] ? [0, 1] : [st.ts[0] > st.ts[1] ? 0 : 1];
}
function checkWin(st, ctx) {
  if (st.phase !== 'play') return;
  const goal = st.mode === 'bayrak' ? CAPS_WIN : st.target;
  if (st.mode === 'tek') { const w = st.players.map((_, i) => i).find(i => (st.ts[i] || 0) >= goal); if (w != null) finish(st, ctx, 'score'); return; }
  if (st.ts[0] >= goal || st.ts[1] >= goal) finish(st, ctx, 'score');
}
function personal(st, i) { const s = st.stats[i]; return s.hit + s.cap * 3 + s.ret; }
function finish(st, ctx, reason) {
  if (st.phase !== 'play') return;
  const n = st.players.length;
  const lead = leaders(st), draw = lead.length > 1;
  let winTeam = -1;
  if (st.mode !== 'tek' && !draw) winTeam = lead[0];
  // MVP: kişisel puan (isabet + 3×bayrak + kurtarma), eşitlikte daha az karlanan
  const order = st.players.map((_, i) => i).sort((a, b) => personal(st, b) - personal(st, a) || st.stats[a].gotHit - st.stats[b].gotHit || st.stats[b].hit - st.stats[a].hit);
  const mvp = order[0];
  st.result = { reason, draw, winTeam, winners: st.mode === 'tek' ? lead : [], mvp, ts: st.ts.slice() };
  st.balls = [];
  setPhase(st, 'over', OVER_MS);
  let title;
  if (st.mode === 'tek') title = draw ? `Berabere! ${lead.map(i => pname(st, i)).join(' & ')}` : `${pname(st, lead[0])} kar topu şampiyonu!`;
  else title = draw ? 'Berabere! Kar herkese yetti ❄️' : `${teamName(winTeam)} kazandı! ${TEAMS[winTeam].icon}`;
  ctx.emit({ t: 'over', reason, winTeam, draw, mvp, winners: st.result.winners }, `🏁 ${reason === 'time' ? 'Süre doldu! ' : ''}${title} · MVP: ${pname(st, mvp)}`, 'gold');
  ctx.sync();
  const lab = i => {
    const s = st.stats[i], parts = [`${s.hit} isabet`];
    if (s.cap) parts.push(`${s.cap} bayrak`); if (s.ret) parts.push(`${s.ret} kurtarma`);
    return (st.mode === 'tek' ? '' : TEAMS[st.team[i]].short + ' · ') + parts.join(' · ') + (i === mvp ? ' · ⭐ MVP' : '');
  };
  const ranking = st.players.map((_, i) => i).sort((a, b) => {
    if (st.mode === 'tek') return (st.ts[b] || 0) - (st.ts[a] || 0) || personal(st, b) - personal(st, a);
    const wa = st.team[a] === winTeam ? 1 : 0, wb = st.team[b] === winTeam ? 1 : 0;
    return wb - wa || personal(st, b) - personal(st, a);
  }).map(i => (st.mode === 'tek' ? { pi: i, score: st.ts[i] || 0, label: lab(i) } : { pi: i, label: lab(i) }));
  const scoreTxt = st.mode === 'tek' ? '' : ` Skor: ${TEAMS[0].short} ${st.ts[0]} – ${st.ts[1]} ${TEAMS[1].short}.`;
  const note = (st.mode === 'bayrak' ? 'Puan: isabet 1, bayrak getirmek 3, bayrak kurtarmak 1.' : st.mode === 'takim' ? 'Puan: her isabet 1 (bayrak modunda bayrak 3).' : 'Her isabet 1 puan.') + scoreTxt + ` MVP: ${pname(st, mvp)}.`;
  void n;
  st.endRes = { title, ranking, note };
  ctx.later(OVER_MS, () => ctx.end(st.endRes));
}

/* ---- botlar ---- */
function nearestEnemy(st, pi, now, maxD, needShot) {
  const p = st.pos[pi], map = MAPS[st.mapId]; let best = null;
  for (let j = 0; j < st.players.length; j++) {
    if (!canBeHit(st, pi, j, now)) continue;
    const q = st.pos[j], d = dist(p.x, p.y, q.x, q.y); if (d > maxD) continue;
    const sc = d - (st.flags.some(f => f.by === j) ? 400 : 0);
    if (needShot && !clearShot(map, st.walls, p.x, p.y, q.x, q.y)) continue;
    if (!best || sc < best.sc) best = { j, d, sc, x: q.x, y: q.y };
  }
  return best;
}
function velOf(st, j) { const h = st.hist[j]; if (!h || h.length < 2) return [0, 0]; const a = h[Math.max(0, h.length - 4)], b = h[h.length - 1], dt = (b[0] - a[0]) / 1000; if (dt < .03) return [0, 0]; return [(b[1] - a[1]) / dt, (b[2] - a[2]) / dt]; }
// Önden nişan: hedefin hızına göre topla buluşacağı nokta
function leadAim(st, pi, j, err) {
  const p = st.pos[pi], q = st.pos[j], [vx, vy] = velOf(st, j);
  let tx = q.x, ty = q.y, c = 0;
  for (let it = 0; it < 3; it++) {
    const d = dist(p.x, p.y, tx, ty); c = clamp((d + 18 - 230) / 330, 0, 1);
    const tt = Math.max(0, d - R - 4) / ballSp(c, st.pw[pi].dev > 0);
    tx = q.x + vx * tt * .85; ty = q.y + vy * tt * .85;
  }
  const d = dist(p.x, p.y, tx, ty);
  return { a: Math.atan2(ty - p.y, tx - p.x) + rnd(-err, err), c: clamp((d + 18 - 230) / 330 + rnd(-.04, .06), 0, 1), d, tx, ty };
}
function coverCell(st, pi, ex, ey, nav, fM, maxD) {
  let best = -1, bs = -1e9; const map = MAPS[st.mapId], me = st.pos[pi];
  for (let c = 0; c < NN; c++) {
    const dm = fM.d[c]; if (dm < 0 || dm > maxD) continue;
    const x = cx_(c), y = cy_(c);
    const hidden = !losShot(nav, ex, ey, x, y);
    const de = dist(x, y, ex, ey);
    let s = (hidden ? 30 : 0) - dm * .9 + (nav.ice[c] ? -25 : 0) + clamp(de, 0, 420) / 40 + Math.random();
    if (st.mode !== 'tek') { const base = map.bases[st.team[pi]].flag; s -= dist(x, y, base[0], base[1]) / 260; }
    if (dist(x, y, me.x, me.y) < 12) s += 2;
    if (s > bs) { bs = s; best = c; }
  }
  return best;
}
function botPlan(st, pi, b, now, nav) {
  const me = st.pos[pi], map = MAPS[st.mapId], mc = cellOf(nav, me.x, me.y);
  if (mc < 0) { b.wp = null; return; }
  const fM = bfs(nav, [mc]);
  const go = (x, y, kind) => { const c = cellOf(nav, x, y); b.gk = kind; b.goal = [x, y]; b.wp = c >= 0 && fM.d[c] >= 0 ? pathTo(fM, c) : null; if (b.wp) b.wp.push([x, y]); };
  const ammo = st.ammo[pi], en = nearestEnemy(st, pi, now, 2000, false), vis = nearestEnemy(st, pi, now, 560, true);
  b.tgt = vis ? vis.j : (en ? en.j : -1);
  if (st.mode !== 'tek') { const mates = st.players.map((_, j) => j).filter(j => st.team[j] === st.team[pi]); const bots = mates.filter(j => st.players[j].isBot); b.role = mates.length >= 3 && bots[0] === pi ? 'def' : 'atk'; }
  // bayrak modu hedefleri
  if (st.mode === 'bayrak') {
    const myT = st.team[pi], own = st.flags[myT], foe = st.flags[1 - myT], home = map.bases[myT].flag;
    if (foe.by === pi) { go(home[0], home[1], 'home'); b.scoop = 0; return; }
    if (own.state === 'carried') { const q = st.pos[own.by]; go(q.x, q.y, 'chase'); b.tgt = own.by; return; }
    if (own.state === 'dropped') { go(own.x, own.y, 'ret'); return; }
    if (b.role === 'atk' && foe.state !== 'carried') {
      if (ammo === 0 && dist(me.x, me.y, foe.x, foe.y) > 380 && !nav.ice[mc] && !nearestEnemy(st, pi, now, 260, true)) { b.gk = 'scoop'; b.wp = null; b.goal = null; return; }
      go(foe.x, foe.y, 'flag'); return;
    }
    if (foe.state === 'carried' && foe.by !== pi && b.role === 'atk') { const q = st.pos[foe.by]; go(q.x + rnd(-60, 60), q.y + rnd(-60, 60), 'escort'); return; }
  }
  // cephane yoksa siper al ve topla
  if (ammo === 0 || (ammo <= 1 && (!en || en.d > 360))) {
    const ex = en ? en.x : W / 2, ey = en ? en.y : H / 2, c = coverCell(st, pi, ex, ey, nav, fM, 14);
    if (c >= 0) { go(cx_(c), cy_(c), 'cover'); return; }
  }
  if (vis) {
    // dövüş: menzilde kal, yana kay
    if (now > b.strafeAt) { b.strafe = -b.strafe; b.strafeAt = now + rnd(900, 1900); }
    const dx = me.x - vis.x, dy = me.y - vis.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const want = d > 430 ? -1 : d < 230 ? 1 : 0;
    let tx = me.x + (-uy * b.strafe) * 90 + ux * want * 90, ty = me.y + (ux * b.strafe) * 90 + uy * want * 90;
    if (!circleFree(map.obs, tx, ty, R + 2)) { b.strafe = -b.strafe; tx = me.x + (-uy * b.strafe) * 90 + ux * want * 90; ty = me.y + (ux * b.strafe) * 90 + uy * want * 90; }
    go(clamp(tx, B + R, W - B - R), clamp(ty, B + R, H - B - R), 'fight'); return;
  }
  if (en) {
    if (st.mode === 'bayrak' && b.role === 'def') { const fl = map.bases[st.team[pi]].flag, c = coverCell(st, pi, en.x, en.y, nav, bfs(nav, [cellOf(nav, fl[0] + (st.team[pi] ? -170 : 170), fl[1])]), 6); if (c >= 0) { go(cx_(c), cy_(c), 'guard'); return; } }
    go(en.x, en.y, 'hunt'); return;
  }
  const c = cellOf(nav, W / 2 + rnd(-200, 200), H / 2 + rnd(-200, 200)); if (c >= 0) go(cx_(c), cy_(c), 'wander');
}
function botSteer(st, pi, b, p, nav, now) {
  if (b.jit != null && now < b.jitUntil) return [Math.cos(b.jit), Math.sin(b.jit)];
  if (!b.wp || !b.wp.length) return [0, 0];
  while (b.wp.length > 1 && dist(p.x, p.y, b.wp[0][0], b.wp[0][1]) < 18) b.wp.shift();
  for (let i = Math.min(b.wp.length - 1, 8); i > 0; i--) if (losWalk(nav, p.x, p.y, b.wp[i][0], b.wp[i][1])) { b.wp.splice(0, i); break; }
  const t = b.wp[0], dx = t[0] - p.x, dy = t[1] - p.y, d = Math.hypot(dx, dy);
  if (d < 8) { if (b.wp.length === 1) { b.wp = null; b.re = Math.min(b.re, now + 150); } return [0, 0]; }
  return [dx / d, dy / d];
}
function stepBots(st, dt, now, ctx) {
  const map = MAPS[st.mapId], nav = navOf(st.mapId), obs = map.obs.concat(wallObs(st.walls));
  for (const k of Object.keys(st.bot)) {
    if (st.phase !== 'play') return;
    const pi = +k, b = st.bot[k], p = st.pos[pi];
    if (st.frz[pi]) { b.vx = b.vy = 0; p.m = 0; continue; }
    if (now >= b.re) { botPlan(st, pi, b, now, nav); b.re = now + rnd(320, 560); }
    let [ix, iy] = botSteer(st, pi, b, p, nav, now);
    // zikzak: görünür bir rakip varken yürürken yana kay (önden nişanı boşa çıkar)
    if ((ix || iy) && b.tgt >= 0 && b.gk !== 'fight' && now >= (b.jit != null && now < b.jitUntil ? 1e15 : 0)) {
      if (!(now <= b.zzAt)) { b.zz = -(b.zz || 1); b.zzAt = now + rnd(450, 1000); }
      const q = st.pos[b.tgt]; if (q && dist(p.x, p.y, q.x, q.y) < 480) { const zz = b.zz || 1, zx = ix - iy * .7 * zz, zy = iy + ix * .7 * zz, l = Math.hypot(zx, zy) || 1; ix = zx / l; iy = zy / l; }
    }
    // kar toplama: dur ve topla (buzda olmaz)
    const iceHere = onIce(map, p.x, p.y);
    const threat = nearestEnemy(st, pi, now, 300, true);
    if (b.gk === 'scoop' && (st.ammo[pi] >= 3 || iceHere || threat)) b.re = 0;
    const wantScoop = !iceHere && st.ammo[pi] < AMMO_MAX && b.gk !== 'home' && b.gk !== 'chase' && b.gk !== 'flag' && (b.gk === 'scoop' ||
      (st.ammo[pi] === 0 ? (b.gk === 'cover' ? !b.wp || b.wp.length <= 1 || !threat : !threat) : (!threat && st.ammo[pi] < 4 && (b.gk === 'cover' || b.gk === 'wander' || b.gk === 'guard' || (b.gk === 'hunt' && st.ammo[pi] < 2)))));
    if (wantScoop) {
      ix = iy = 0;
      if (Math.hypot(b.vx, b.vy) < 25) { b.scoop += dt * 1000; if (b.scoop >= SCOOP_MS) { b.scoop = 0; if (scoopAct(st, pi, ctx, true)) st.dirty = true; } }
    } else b.scoop = 0;
    // atış
    if (st.ammo[pi] > 0 && now >= b.nextThrow && b.tgt >= 0 && canBeHit(st, pi, b.tgt, now) && now - st.lastThrow[pi] >= THROW_CD) {
      const q = st.pos[b.tgt], d = dist(p.x, p.y, q.x, q.y);
      const carrier = st.flags.some(f => f.by === b.tgt);
      if (d < (st.mode === 'bayrak' && b.gk === 'flag' && !carrier ? 400 : 575)) {
        const L = leadAim(st, pi, b.tgt, .11 + d / 560 * .15);
        if (L.d < 560 && clearShot(map, st.walls, p.x, p.y, L.tx, L.ty)) {
          doThrow(st, pi, p.x, p.y, L.a, L.c, now, null, ctx);
          b.nextThrow = now + rnd(650, 1350) + (st.ammo[pi] <= 1 ? 400 : 0);
        } else b.nextThrow = now + 200;
      }
    }
    // duvar: üstüne top gelirse ya da açıkta dövüşürken
    if (st.wstock[pi] > 0 && now > b.wallAt) {
      b.wallAt = now + 600;
      const inc = st.balls.find(o => !o.done && isEnemy(st, o.pi, pi) && (() => { const [x, y] = ballPos(o, now), d = dist(x, y, p.x, p.y); if (d > 230 || d < 70) return false; return angDiff(Math.atan2(p.y - y, p.x - x), Math.atan2(o.dy, o.dx)) < .25; })());
      if (inc && Math.random() < .5) { wallAct(st, pi, { a: Math.atan2(inc.y - p.y, inc.x - p.x) }, ctx); b.wallAt = now + 4000; }
      else if (b.gk === 'fight' && b.tgt >= 0 && Math.random() < .06) { const q = st.pos[b.tgt]; wallAct(st, pi, { a: Math.atan2(q.y - p.y, q.x - p.x) }, ctx); b.wallAt = now + 5000; }
    }
    const carrying = st.flags.some(f => f.by === pi), pw = st.pw[pi];
    const spd = SPD * .93 * (carrying ? FLAG_SLOW : 1) * (pw.kizak > now ? SLED_K : 1);
    const body = { x: p.x, y: p.y, vx: b.vx, vy: b.vy };
    moveBody(map, obs, body, ix, iy, spd, dt);
    b.vx = body.vx; b.vy = body.vy;
    const sp = Math.hypot(b.vx, b.vy);
    let h = p.h; if (b.tgt >= 0 && st.pos[b.tgt]) h = Math.atan2(st.pos[b.tgt].y - body.y, st.pos[b.tgt].x - body.x); else if (sp > 15) h = Math.atan2(b.vy, b.vx);
    st.pos[pi] = { x: Math.round(body.x * 10) / 10, y: Math.round(body.y * 10) / 10, h: +h.toFixed(2), m: sp > 25 ? 1 : 0, t: now, c: 0 };
    pushHist(st, pi, now);
    if (ix || iy) {
      if (now - b.sAt > 700) { if (dist(body.x, body.y, b.sx, b.sy) < 10) { b.re = 0; b.jit = rnd(0, TAU); b.jitUntil = now + 380; } b.sx = body.x; b.sy = body.y; b.sAt = now; }
    } else { b.sx = body.x; b.sy = body.y; b.sAt = now; }
  }
}
function broadcastBots(st) {
  const arr = [];
  for (const k of Object.keys(st.bot)) { const p = st.pos[k]; arr.push([+k, Math.round(p.x), Math.round(p.y), +(+p.h).toFixed(2), p.m ? 1 : 0]); }
  if (!arr.length) return;
  arr.forEach(a => uiFeed(a[0], a[1], a[2], a[3], a[4], 0));
  fastOut({ t: 'b', p: arr });
}

/* ---- ana döngü (yöneten cihazda, 20/sn) ---- */
function tick(st, ctx) {
  const now = Date.now(), dt = clamp((now - st.lastTick) / 1000, 0, .25); st.lastTick = now;
  if (st.phase === 'count') { if (now >= st.endsAt) { startPlay(st, ctx); st.dirty = true; } }
  else if (st.phase === 'play') {
    stepBots(st, dt, now, ctx);
    if (st.phase === 'play') stepBalls(st, now, ctx);
    if (st.phase === 'play') timers(st, now, ctx);
    if (st.phase === 'play') flagTick(st, now, ctx);
    if (st.phase === 'play') { if (spawnItems(st, now)) st.dirty = true; if (pickups(st, now, ctx)) st.dirty = true; }
    if (st.phase === 'play' && now >= st.endsAt) finish(st, ctx, 'time');
    if (st.phase === 'play' && (++st.tickN % 2 === 0)) broadcastBots(st);
  }
  if ((st.dirty && now - st.lastSync >= 140) || now - st.lastSync >= 1000) { st.dirty = false; st.lastSync = now; ctx.sync(); }
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

const RULES = {
  setup(players, opts, ctx) {
    opts = opts || {};
    const n = players.length, now = Date.now();
    const mode = MODES[opts.mod] ? opts.mod : 'takim';
    let mapId = MAPS[opts.harita] ? opts.harita : (opts.harita === 'rastgele' ? pickR(MAP_IDS) : 'koy');
    const dur = [120, 180, 300].includes(+opts.sure) ? +opts.sure : 180;
    const team = mode === 'tek' ? Array(n).fill(-1) : assignTeams(players, opts.takim === 'sira' || opts.takim === 'insan' ? opts.takim : 'oto');
    const st = {
      mode, mapId, dur, pu: opts.guc !== '0', target: mode === 'tek' ? (n <= 3 ? 6 : 8) : targetScore(n), hostSeat: ctx.hostPi,
      players: players.map((p, i) => ({ name: p.name, color: p.color, isBot: !!p.isBot, an: mode === 'tek' ? ANIMALS[i % ANIMALS.length] : TEAMS[team[i]].an })),
      team, online: players.map(() => true), ts: mode === 'tek' ? Array(n).fill(0) : [0, 0],
      ammo: Array(n).fill(AMMO_START), frz: Array(n).fill(0), inv: Array(n).fill(0), wstock: Array(n).fill(WALL_STOCK), wregen: Array(n).fill(0),
      pw: players.map(() => ({ dev: 0, uclu: 0, kakao: 0, kizak: 0 })),
      stats: players.map(() => ({ hit: 0, gotHit: 0, th: 0, cap: 0, ret: 0, wl: 0, pk: 0 })),
      lastThrow: Array(n).fill(now), lastScoop: Array(n).fill(now),
      phase: 'count', endsAt: 0, phaseDur: 1, playAt: 0, pos: [], hist: [], still: [], anchor: [], spawnN: [],
      balls: [], bid: 0, walls: [], wid: 0, items: [], iid: 0, nextItemAt: 0,
      flags: mode === 'bayrak' ? [0, 1].map(t => ({ team: t, state: 'home', by: -1, x: MAPS[mapId].bases[t].flag[0], y: MAPS[mapId].bases[t].flag[1], retAt: 0 })) : [],
      bot: {}, result: null, lastTick: now, lastSync: 0, loopId: 0, tickN: 0, dirty: false
    };
    players.forEach((p, i) => { if (p.isBot) st.bot[i] = newBot(i); });
    startMatch(st, ctx);
    runLoop(st, ctx);
    return st;
  },
  action(st, pi, a, ctx) {
    if (!a || typeof a.t !== 'string' || !st.players[pi]) return;
    if (a.t === 'throw') throwAct(st, pi, a, ctx);
    else if (a.t === 'scoop') scoopAct(st, pi, ctx, false);
    else if (a.t === 'wall') wallAct(st, pi, a, ctx);
  },
  view(st, viewer) {
    const n = st.players.length, me = Number.isInteger(viewer) && viewer >= 0 && viewer < n ? viewer : -1, now = Date.now();
    return {
      mode: st.mode, mapId: st.mapId, phase: st.phase, endsAt: st.endsAt, phaseDur: st.phaseDur, dur: st.dur, pu: st.pu, target: st.target, me, now,
      team: st.team.slice(), ts: st.ts.slice(),
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, an: p.an, online: st.online[i] !== false })),
      pos: st.pos.map(p => [Math.round(p.x), Math.round(p.y), +(+p.h).toFixed(2)]),
      spawnN: st.spawnN.slice(), ammo: st.ammo.slice(), frz: st.frz.slice(), inv: st.inv.map(t => (t > now ? t : 0)),
      wstock: st.wstock.slice(), wregen: st.wregen.slice(),
      pw: st.pw.map(p => ({ dev: p.dev, uclu: p.uclu, kakao: p.kakao > now ? p.kakao : 0, kizak: p.kizak > now ? p.kizak : 0 })),
      stats: st.stats.map(s => ({ hit: s.hit, gotHit: s.gotHit, cap: s.cap, ret: s.ret })),
      balls: st.balls.filter(b => !b.done).map(pubBall),
      walls: st.walls.map(w => ({ id: w.id, by: w.by, tm: w.tm, x: w.x, y: w.y, a: w.a, cs: w.cs, hp: w.hp, t0: w.t0, until: w.until })),
      items: st.items.map(o => ({ id: o.id, k: o.k, x: o.x, y: o.y })),
      flags: st.flags.map(f => ({ team: f.team, state: f.state, by: f.by, x: f.x, y: f.y, retAt: f.retAt })),
      result: st.phase === 'over' ? st.result : null
    };
  },
  turnOf() { return null; },
  skipTurn() { /* gerçek zamanlı: kopmalar onPresence ile işlenir */ },
  botAct() { /* botlar yöneten cihazdaki döngüde hareket eder */ },
  botDelay: 900,
  onPresence(st, pi, online, ctx) {
    st.online[pi] = online;
    if (!online) {
      const now = Date.now();
      for (const f of st.flags) if (f.by === pi) { f.state = 'dropped'; f.by = -1; f.retAt = now + FLAG_RET_MS; const p = st.pos[pi]; if (p) { f.x = Math.round(p.x); f.y = Math.round(p.y); } ctx.emit({ t: 'flag', k: 'drop', team: f.team, pi }, `🚩 ${pname(st, pi)} bağlantısı koptu; bayrak yere düştü.`, 'bad'); }
      st.walls = st.walls.filter(w => w.by !== pi);
    } else if (st.pos[pi]) { st.pos[pi].t = Date.now(); }
    st.dirty = true;
    ctx.sync();
  },
  resume(st, ctx) {
    if (st.phase === 'over') { if (st.endRes) ctx.later(400, () => ctx.end(st.endRes)); return; }
    const now = Date.now(); st.lastTick = now; st.pos.forEach(p => { p.t = now; }); st.balls = [];
    Object.keys(st.bot).forEach(k => { st.bot[k] = Object.assign(newBot(+k), { re: 0 }); });
    runLoop(st, ctx);
  }
};

/* ------------------------------------------------------------------ ARAYÜZ (her cihaz) */
let root = null, ui = null, V = null;
let cv = null, cg = null, stageEl = null, miniCv = null, joyEl = null, aimEl = null, wallBtn = null;
let scene = null, cam = { x: 0, y: 0, s: .8 }, sw = 300, sh = 300, dpr = 1, snapCam = true;
let av = null, rp = [], keys = new Set(), joy = { on: false, id: null, bx: 0, by: 0, dx: 0, dy: 0 };
let aim = { on: false, id: null, bx: 0, by: 0, dx: 0, dy: 0, moved: false, t0: 0, kind: '' };
let mouse = { x: 0, y: 0, in: false }, charge = { on: false, t0: 0, src: '' };
let raf = 0, lastT = 0, hudT = null, ro = null, popT = null, toastT = null, frameN = 0;
let parts = [], decals = [], flakes = [], anims = [], balls = [], lastSend = 0, lastSent = null;
let seenSpawn = [], seenKey = '', lastSec = -1, chipKey = '', sideKey = '', boardKey = '', overKey = '', layoutAt = 0;
let walls = [], wallKey = '', obsCache = null, kSeq = 0, pendThrow = 0, confThrow = 0, scoopT = 0, scoopPend = 0, lastAmmo = -1, wasFrz = false, lastWallReq = 0, lastThrowT = 0;
const INTERP = 110, JR = 46, AR = 48;
const pnow = () => performance.now();
const hostClock = () => (ui && ui.hostNow ? ui.hostNow() : Date.now());
const q = s => root && root.querySelector(s);
const isTouch = () => (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
const phoneW = () => innerWidth < 760;
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const vEnemy = (v, a, b) => a !== b && (v.mode === 'tek' || v.team[a] !== v.team[b]);
const tcol = (v, i) => (v.mode === 'tek' ? v.players[i].color : TEAMS[v.team[i]].col);
const snd = {
  ok() { return Sound.ctx && Sound.enabled && Sound.ctx.state === 'running'; },
  throw(c) { if (!this.ok()) return; Sound.noise(.18 + c * .12, { filter: 'bandpass', freq: 1400 + c * 900, q: .9, gain: .22, decayPow: 1.4 }); },
  splat() { if (!this.ok()) return; Sound.noise(.22, { filter: 'lowpass', freq: 900, gain: .35, decayPow: 2.5 }); },
  freeze() { if (!this.ok()) return; [1568, 2093, 2637].forEach((f, i) => Sound.tone(f, .28, { type: 'sine', gain: .08, when: i * .05 })); Sound.noise(.3, { freq: 6500, q: 1, gain: .12 }); },
  shake() { if (!this.ok()) return; Sound.noise(.25, { freq: 3000, q: .8, gain: .18, decayPow: 1.5 }); Sound.tone(660, .1, { type: 'triangle', gain: .12, when: .05 }); Sound.tone(990, .14, { type: 'triangle', gain: .1, when: .12 }); },
  scoop() { if (!this.ok()) return; Sound.noise(.09, { filter: 'bandpass', freq: 2600, q: 1.5, gain: .14, decayPow: 2 }); },
  wall() { if (!this.ok()) return; Sound.noise(.3, { filter: 'lowpass', freq: 500, gain: .45, decayPow: 2 }); Sound.tone(140, .2, { type: 'sine', gain: .15, slide: 90 }); },
  crumble() { if (!this.ok()) return; Sound.noise(.45, { filter: 'lowpass', freq: 700, gain: .4, decayPow: 1.4 }); },
  empty() { if (!this.ok()) return; Sound.tone(300, .08, { type: 'square', gain: .05 }); }
};

/* ---- sahne ---- */
function ensureScene(id) {
  if (!MAPS[id] || (scene && scene.id === id)) return;
  const map = MAPS[id], k = clamp((window.devicePixelRatio || 1) * .8, 1, 1.6);
  const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
  const g = c.getContext('2d'); g.scale(k, k); map.paint(g);
  const th = document.createElement('canvas'); th.width = 240; th.height = 150; th.getContext('2d').drawImage(c, 0, 0, 240, 150);
  scene = { id, map, ground: c, thumb: th };
  obsCache = null;
}
function camScale() { return phoneW() ? clamp(Math.min(sw / 520, sh / 720), .5, 1) : clamp(Math.max(sh / (H + 40), Math.min(sw / W, sh / H) * 1.04, .7), .5, 1); }
function clampCam() {
  const vw = sw / cam.s, vh = sh / cam.s, m = 30;
  cam.x = vw >= W + 2 * m ? (W - vw) / 2 : clamp(cam.x, -m, W - vw + m);
  cam.y = vh >= H + 2 * m ? (H - vh) / 2 : clamp(cam.y, -m, H - vh + m);
}
function focus() {
  if (av && V && V.me >= 0) return av;
  if (V) { const i = V.flags && V.flags.find(f => f.state === 'carried'); if (i && rp[i.by]) return rp[i.by]; if (rp[0]) return rp[0]; }
  return { x: W / 2, y: H / 2, vx: 0, vy: 0 };
}
function camFollow(dt) {
  cam.s = camScale();
  const f = focus();
  let lx = 0, ly = 0;
  if (f === av) {
    lx = (av.vx || 0) * .2; ly = (av.vy || 0) * .2;
    if (aim.on && aim.moved) { const a = aimAngle(), L = 60 + 80 * clamp((pnow() - aim.t0) / CHARGE_MS, 0, 1); lx += Math.cos(a) * L; ly += Math.sin(a) * L; }
  }
  const tx = f.x + lx - sw / 2 / cam.s, ty = f.y + ly - sh / 2 / cam.s, k = snapCam ? 1 : 1 - Math.exp(-dt * 6);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; clampCam(); snapCam = false;
}
const toScreen = (x, y) => [(x - cam.x) * cam.s, (y - cam.y) * cam.s];
function toClient(x, y) { const r = cv.getBoundingClientRect(), s = toScreen(x, y); return [r.left + s[0], r.top + s[1]]; }
function resize() {
  if (!stageEl || !cv) return;
  layout();
  const r = stageEl.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return;
  sw = r.width; sh = r.height; dpr = Math.min(2.5, window.devicePixelRatio || 1);
  cv.width = Math.round(sw * dpr); cv.height = Math.round(sh * dpr);
  if (miniCv) { const w = miniCv.clientWidth, h = miniCv.clientHeight; miniCv.width = Math.round(w * dpr); miniCv.height = Math.round(h * dpr); }
  initFlakes();
  snapCam = true;
}
function layout() {
  if (!stageEl) return;
  const top = stageEl.getBoundingClientRect().top + (window.scrollY || 0), ph = phoneW();
  const h = ph ? clamp(innerHeight - top - 8, 320, 1000) : clamp(innerHeight - top - 16, 460, 760);
  if (Math.abs(stageEl.offsetHeight - h) > 2) stageEl.style.height = Math.round(h) + 'px';
}
function obstacles() {
  const key = scene.id + '|' + walls.map(w => w.id).join(',');
  if (!obsCache || obsCache.key !== key) obsCache = { key, list: scene.map.obs.concat(wallObs(walls)) };
  return obsCache.list;
}

/* ---- uzaktaki oyuncular: ara değerleme ---- */
function mkRemote(p) { return { buf: [], x: p[0], y: p[1], h: p[2] || 0, walk: 0, ph: 0, at: 0, p0: null, vx: 0, vy: 0, c: 0 }; }
function feed(pi, x, y, h, mv, c) {
  if (!V || !root || !V.players[pi] || (pi === V.me && av)) return;
  if (V.phase !== 'play' || V.frz[pi]) return;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const t = pnow();
  let r = rp[pi]; if (!r) r = rp[pi] = mkRemote([x, y, h]);
  const last = r.buf[r.buf.length - 1];
  if (last) { const d = dist(last.x, last.y, x, y), lim = MAXV * Math.max(.1, (t - last.t) / 1000) * 1.3 + 90; if (d > lim) { r.buf = []; r.p0 = null; r.x = x; r.y = y; } }
  r.buf.push({ t, x, y, h: Number.isFinite(h) ? h : r.h, m: mv });
  if (r.buf.length > 14) r.buf.shift();
  r.at = t; r.c = c ? 1 : 0;
}
function uiFeed(pi, x, y, h, m, c) { if (root) feed(pi, x, y, h, m, c); }
function onFast(m) {
  if (!m || !V) return;
  if (m.t === 'p') {
    if (ui && ui.isHost) hostPosIn(m.seat, +m.x, +m.y, +m.h, m.m, m.c, m.id);
    feed(m.seat, +m.x, +m.y, +m.h, m.m, m.c);
  } else if (m.t === 'b' && Array.isArray(m.p)) {
    if (ui && ui.isHost) return;
    m.p.forEach(a => { if (Array.isArray(a) && V.players[a[0]] && V.players[a[0]].isBot) feed(a[0], +a[1], +a[2], +a[3], a[4], 0); });
  }
}
function stepRemotes(dt, t) {
  const rt = t - INTERP;
  V.players.forEach((_, i) => {
    if (i === V.me && av) return;
    let r = rp[i]; if (!r) r = rp[i] = mkRemote(V.pos[i]);
    const ox = r.x, oy = r.y, b = r.buf;
    let tx = r.x, ty = r.y, th = r.h;
    if (V.phase !== 'play' || V.frz[i] || !b.length || t - r.at > 1500) { tx = V.pos[i][0]; ty = V.pos[i][1]; th = V.pos[i][2]; if (V.phase !== 'play' || V.frz[i] || dist(tx, ty, r.x, r.y) > 200) { r.x = tx; r.y = ty; } }
    else {
      while (b.length >= 2 && b[1].t <= rt) r.p0 = b.shift();
      const a = b[0];
      if (b.length >= 2 && rt > a.t) { const c = b[1], u = (rt - a.t) / Math.max(1, c.t - a.t); tx = a.x + (c.x - a.x) * u; ty = a.y + (c.y - a.y) * u; th = lerpAng(a.h, c.h, u); }
      else if (rt > a.t && r.p0 && a.m) { const p0 = r.p0, dtt = Math.max(1, a.t - p0.t), ext = Math.min(rt - a.t, 110); tx = a.x + (a.x - p0.x) / dtt * ext; ty = a.y + (a.y - p0.y) / dtt * ext; th = a.h; }
      else { tx = a.x; ty = a.y; th = a.h; }
    }
    const k = 1 - Math.exp(-dt * 22);
    r.x += (tx - r.x) * k; r.y += (ty - r.y) * k; r.h = lerpAng(r.h, th, Math.min(1, dt * 12));
    const sp = Math.hypot(r.x - ox, r.y - oy) / Math.max(dt, 1e-3);
    r.vx = (r.x - ox) / Math.max(dt, 1e-3); r.vy = (r.y - oy) / Math.max(dt, 1e-3);
    r.walk = V.frz[i] ? 0 : clamp(sp / 150, 0, 1); r.ph += sp * dt / 13;
    if (sp > 90 && V.phase === 'play' && frameN % 4 === 0) puff(r.x, r.y + 14, 1, 40, 4);
  });
}
const posOf = i => (V && i === V.me && av ? av : rp[i]) || (V && V.pos[i] ? { x: V.pos[i][0], y: V.pos[i][1] } : { x: W / 2, y: H / 2 });

/* ---- yerel oyuncu ---- */
const canAct = () => V && V.me >= 0 && av && V.phase === 'play' && !V.frz[V.me];
const myAmmo = () => (V && V.me >= 0 ? Math.max(0, V.ammo[V.me] - pendThrow) : 0);
const aiming = () => (charge.on || (aim.on && aim.moved));
function curCharge() { return charge.on ? clamp((pnow() - charge.t0) / CHARGE_MS, 0, 1) : 0; }
function aimAngle() {
  if (aim.on && aim.moved) return Math.atan2(aim.dy, aim.dx);
  if (mouse.in && !isTouchAim() && av) { const wx = cam.x + mouse.x / cam.s, wy = cam.y + mouse.y / cam.s; return Math.atan2(wy - av.y, wx - av.x); }
  return av ? av.h : 0;
}
let lastPtr = 'mouse';
const isTouchAim = () => lastPtr !== 'mouse';
function stepMe(dt, t) {
  if (!av || !V || V.me < 0) return;
  const me = V.me, map = MAPS[V.mapId], now = hostClock();
  if (!canAct()) { av.vx = 0; av.vy = 0; av.walk = Math.max(0, av.walk - dt * 6); scoopT = 0; return; }
  let ix = 0, iy = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) ix -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) ix += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) iy -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) iy += 1;
  if (joy.on) { ix = joy.dx; iy = joy.dy; }
  const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
  const pw = V.pw[me] || {}, carrying = V.flags.some(f => f.by === me && f.state === 'carried');
  const spd = SPD * (aiming() ? CHARGE_SLOW : 1) * (carrying ? FLAG_SLOW : 1) * (pw.kizak > now ? SLED_K : 1);
  const obs = obstacles(), n = Math.max(1, Math.ceil(dt / .034));
  for (let k = 0; k < n; k++) moveBody(map, obs, av, ix, iy, spd, dt / n);
  const sp = Math.hypot(av.vx, av.vy);
  if (aiming() || (mouse.in && !isTouchAim())) av.h = lerpAng(av.h, aimAngle(), Math.min(1, dt * 18));
  else if (sp > 20) av.h = lerpAng(av.h, Math.atan2(av.vy, av.vx), Math.min(1, dt * 14));
  av.walk = clamp(sp / 150, 0, 1); av.ph += sp * dt / 13;
  if (sp > 90 && frameN % 3 === 0) puff(av.x, av.y + 14, 1, 40, 4);
  // kar toplama: dur, eğil, topla
  const still = m < .05 && sp < 22 && !aiming();
  const ice = onIce(map, av.x, av.y);
  if (still && !ice && myAmmo() < AMMO_MAX) {
    if (!scoopPend || t - scoopPend > 800) {
      scoopT += dt * 1000;
      if (scoopT >= SCOOP_MS) { scoopT = 0; scoopPend = t; sendPos(t, true); ui.send({ t: 'scoop' }); snd.scoop(); puff(av.x + Math.cos(av.h) * 12, av.y + 12, 4, 60, 3); }
    }
  } else scoopT = 0;
  if (t - lastSend > 100 && (!lastSent || dist(lastSent[0], lastSent[1], av.x, av.y) > 1 || Math.abs(lastSent[2] - av.h) > .08 || lastSent[3] !== (aiming() ? 1 : 0) || t - lastSend > 450)) sendPos(t);
}
function sendPos(t, force) {
  if (!av || !ui || !V || V.me < 0) return;
  if (!force && V.phase !== 'play') return;
  lastSend = t || pnow(); const c = aiming() ? 1 : 0; lastSent = [av.x, av.y, av.h, c];
  const x = Math.round(av.x), y = Math.round(av.y), h = +av.h.toFixed(2), m = Math.hypot(av.vx, av.vy) > 25 ? 1 : 0;
  if (ui.isHost) hostPosIn(V.me, x, y, h, m, c);
  if (ui.mode === 'online' && ui.fast) ui.fast({ t: 'p', x, y, h, m, c });
}
// atış: yerelde hemen çizilir (tahmin), yöneten cihazın olayıyla kesinleşir
function throwNow(ang, c) {
  if (!canAct()) return;
  const t = pnow();
  if (myAmmo() <= 0) { toast('❄️ Kar topun yok! Dur ve topla', 'bad'); snd.empty(); return; }
  if (t - lastThrowT < THROW_CD + 20) return;
  lastThrowT = t; Sound.init();
  const k = ++kSeq, ts = Math.round(hostClock()), me = V.me, pw = V.pw[me] || {};
  sendPos(t, true);
  ui.send({ t: 'throw', a: +ang.toFixed(4), c: +c.toFixed(3), x: Math.round(av.x), y: Math.round(av.y), ts, k });
  if (!V) return;
  pendThrow++;
  const big = pw.dev > 0, tri = pw.uclu > 0;
  // yerelde zaten olay geldiyse (yerel oyun) tahmini çizme
  if (!balls.some(b => b.pi === me && b.k === k)) {
    const angs = tri ? [ang - .2, ang, ang + .2] : [ang];
    angs.forEach((a, n) => {
      const b = makeBall(scene.map, walls, { id: 'L' + k + '_' + n, pi: me, tm: V.mode === 'tek' ? -1 : V.team[me], k: n === 1 || angs.length === 1 ? k : null, a, c, big, x: av.x + Math.cos(a) * (R + 4), y: av.y + Math.sin(a) * (R + 4), t0: ts });
      b.pred = t; b.pk = k; balls.push(b);
    });
  }
  av.h = ang; av.throwAt = t;
  snd.throw(c);
}
function autoAimThrow() {
  if (!canAct()) return;
  const me = V.me, now = hostClock(); let best = null;
  V.players.forEach((p, j) => {
    if (!vEnemy(V, me, j) || V.frz[j] || V.inv[j] > now || !p.online) return;
    const r = posOf(j), d = dist(av.x, av.y, r.x, r.y); if (d > 580) return;
    if (!clearShot(scene.map, walls, av.x, av.y, r.x, r.y)) return;
    if (!best || d < best.d) best = { j, d, r };
  });
  if (!best) { throwNow(av.h, .35); return; }
  const r = best.r, vx = r.vx || 0, vy = r.vy || 0; let tx = r.x, ty = r.y, c = 0;
  for (let it = 0; it < 3; it++) { const d = dist(av.x, av.y, tx, ty); c = clamp((d + 18 - 230) / 330, 0, 1); const tt = Math.max(0, d - R) / ballSp(c, false); tx = r.x + vx * tt * .8; ty = r.y + vy * tt * .8; }
  const d = dist(av.x, av.y, tx, ty); c = clamp((d + 18 - 230) / 330, 0, 1);
  throwNow(Math.atan2(ty - av.y, tx - av.x), c);
}
function buildWall() {
  if (!canAct()) return;
  const t = pnow(); if (t - lastWallReq < 400) return; lastWallReq = t;
  if ((V.wstock[V.me] || 0) <= 0) { toast('🧱 Duvar hakkın doldu, birazdan yenilenir', 'bad'); snd.empty(); return; }
  Sound.init(); sendPos(t, true);
  ui.send({ t: 'wall', a: +aimAngle().toFixed(3) });
}

/* ---- toplar (her cihazda aynı yoldan) ---- */
function addBalls(list) {
  for (const b of list) {
    if (balls.some(o => o.id === b.id)) continue;
    // kendi tahmini topumuzu kesin olanla değiştir
    const pi = balls.findIndex(o => o.pred && o.pi === b.pi && b.k != null && o.pk === b.k && o.k === b.k);
    if (pi >= 0) { balls[pi] = Object.assign({}, b); continue; }
    if (b.pi === (V && V.me) && b.k == null && balls.some(o => o.pred && o.pk != null && o.k == null)) {
      const j = balls.findIndex(o => o.pred && o.k == null); balls[j] = Object.assign({}, b); continue;
    }
    balls.push(Object.assign({}, b));
  }
}
function stepBalls_(t) {
  const now = hostClock();
  for (const b of balls) {
    if (b.gone) continue;
    if (b.pred && t - b.pred > 1500) { b.gone = 1; continue; }
    if (now >= b.endT) {
      b.gone = 1;
      splatAt(b.ex, b.ey, b.big ? 1.7 : 1, b.kind !== 'ground');
      if (b.kind === 'ground' || b.kind === 'edge') decal(b.ex, b.ey, b.big ? 22 : 13);
    } else if (frameN % 3 === 0) { const [x, y, z] = ballPos(b, now); if (z > 8) parts.push({ x, y: y - z, vx: rnd(-8, 8), vy: rnd(-8, 4), life: .35, max: .35, r: b.big ? 4 : 2.4, c: '#ffffff', k: 'trail' }); }
  }
  balls = balls.filter(b => !b.gone);
}

/* ---- parçacıklar ---- */
function puff(x, y, n, sp, r) { if (parts.length > 260) return; for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(sp * .3, sp); parts.push({ x: x + rnd(-4, 4), y: y + rnd(-3, 3), vx: Math.cos(a) * s, vy: Math.sin(a) * s * .6 - 10, life: rnd(.35, .6), max: .6, r: rnd(r * .7, r * 1.3), c: '#ffffff', k: 'puff' }); } }
function splatAt(x, y, s, onObj) {
  for (let i = 0; i < Math.round(10 * s); i++) { const a = rnd(0, TAU), v = rnd(40, 170) * s; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .7 - 40, life: rnd(.4, .75), max: .75, r: rnd(2, 4.5) * s, c: i % 3 ? '#ffffff' : '#d9ecff', k: 'chunk', g: 260 }); }
  anims.push({ k: 'ring', x, y, col: 'rgba(255,255,255,.9)', start: pnow(), dur: 320, r: 26 * s });
  if (onObj) puff(x, y, 5, 50, 6);
  if (dist(x, y, cam.x + sw / 2 / cam.s, cam.y + sh / 2 / cam.s) < 700) snd.splat();
}
function decal(x, y, r) { decals.push({ x, y, r, seed: Math.floor(Math.random() * 1e6), born: pnow() }); if (decals.length > 60) decals.shift(); }
function stepParts(dt) {
  for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .9; p.vy = p.vy * .9 + (p.g || 0) * dt; }
  parts = parts.filter(p => p.life > 0);
}
function initFlakes() {
  const n = phoneW() ? 60 : 110; flakes = [];
  for (let i = 0; i < n; i++) flakes.push({ x: Math.random() * sw, y: Math.random() * sh, r: rnd(1, 3.2), s: rnd(16, 46), ph: rnd(0, TAU), d: rnd(.3, 1) });
}
let lastCam = null;
function stepFlakes(dt, t) {
  const dcx = lastCam ? (cam.x - lastCam[0]) * cam.s : 0, dcy = lastCam ? (cam.y - lastCam[1]) * cam.s : 0; lastCam = [cam.x, cam.y];
  for (const f of flakes) {
    f.y += f.s * dt * (.6 + f.d) - dcy * f.d; f.x += Math.sin(t / 1300 + f.ph) * 10 * dt - dcx * f.d;
    if (f.y > sh + 5) { f.y = -5; f.x = Math.random() * sw; } if (f.y < -6) f.y = sh + 4;
    if (f.x < -6) f.x = sw + 5; if (f.x > sw + 6) f.x = -5;
  }
}
function pop(text, cls) {
  const p = q('.kt-pop'); if (!p) return;
  p.textContent = text; p.className = 'kt-pop'; void p.offsetWidth; p.className = 'kt-pop show ' + (cls || '');
  clearTimeout(popT); popT = setTimeout(() => { if (p) p.className = 'kt-pop'; }, 1200);
}
function toast(text, cls) {
  const t = q('.kt-toast'); if (!t) return;
  t.textContent = text; t.className = 'kt-toast show ' + (cls || ''); clearTimeout(toastT);
  toastT = setTimeout(() => { if (t) t.className = 'kt-toast'; }, 1700);
}
function screenSplat(big) {
  const el = q('.kt-splat'); if (!el) return;
  const n = big ? 6 : 4; let h = '';
  for (let i = 0; i < n; i++) { const s = rnd(90, 170) * (big ? 1.25 : 1), x = rnd(5, 80), y = rnd(5, 70); h += `<i style="left:${x}%;top:${y}%;width:${s}px;height:${s * rnd(.75, 1)}px;--r:${Math.round(rnd(0, 360))}deg;--d:${(rnd(0, .25)).toFixed(2)}s"></i>`; }
  el.innerHTML = h; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}

/* ---- çizim: karakterler ---- */
const ANIM_COL = { penguen: '#2d3a5c', tilki: '#ff8a3d', ayi: '#a8703f', tavsan: '#ece8f4' };
function drawEars(g, an, c, dk) {
  if (an === 'tilki') { [-1, 1].forEach(s => { g.beginPath(); g.moveTo(s * 5, -17); g.lineTo(s * 16, -30); g.lineTo(s * 19, -9); g.closePath(); g.fillStyle = c; g.fill(); g.strokeStyle = dk; g.lineWidth = 2.2; g.stroke(); g.beginPath(); g.moveTo(s * 12, -24); g.lineTo(s * 16, -30); g.lineTo(s * 17, -21); g.closePath(); g.fillStyle = '#2d2340'; g.fill(); }); }
  else if (an === 'ayi') { [-14, 14].forEach(x => { D.circle(g, x, -15, 7.5, c, dk, 2.2); D.circle(g, x, -15, 3.6, '#e7b98a'); }); }
  else if (an === 'tavsan') { [-7, 7].forEach((x, i) => { D.ell(g, x, -27, 5, 13, c, i ? .18 : -.18, dk, 2.2); D.ell(g, x, -26, 2.4, 8, '#ffb3cf', i ? .18 : -.18); }); }
}
function drawCritter(g, o) {
  const t = o.t, walk = o.walk || 0, bob = o.frz ? 0 : Math.abs(Math.sin(o.ph || 0)) * 3 * walk;
  const fx = Math.cos(o.h || 0), fy = Math.sin(o.h || 0), an = o.an, c = ANIM_COL[an] || '#888', dk = shade(c, -.4), lt = shade(c, .35);
  g.save(); g.translate(o.x, o.y); g.globalAlpha = o.alpha == null ? 1 : o.alpha;
  if (o.ring) { const a = .55 + .35 * Math.sin(t / 220); g.strokeStyle = o.ring; g.globalAlpha *= a; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 15, 29, 11, 0, 0, TAU); g.stroke(); g.globalAlpha = o.alpha == null ? 1 : o.alpha; }
  D.shadow(g, 0, 16, 19 - bob * .4, 6.5, .26);
  if (o.sled) { D.rr(g, -22, 6, 44, 14, 6, '#ff6a3d', '#9a2e10', 2); g.strokeStyle = '#7d8794'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-24, 20); g.lineTo(22, 20); g.quadraticCurveTo(28, 20, 28, 14); g.stroke(); }
  const s1 = Math.sin(o.ph || 0) * 5 * walk;
  D.ell(g, -8 + fx * s1, 15 + fy * s1 * .5, 6, 4, an === 'penguen' ? '#ff9a1f' : dk); D.ell(g, 8 - fx * s1, 15 - fy * s1 * .5, 6, 4, an === 'penguen' ? '#ff9a1f' : dk);
  g.translate(0, -bob);
  if (o.shiver) g.translate(Math.sin(t / 30) * 1.5, 0);
  // atış kolu: şarj ederken top geride, atınca önde
  const armA = (o.h || 0) + (o.charging ? Math.PI * .75 : o.throwK > 0 ? -.2 : Math.PI * .45);
  const ax = Math.cos(armA) * (R + 2), ay = Math.sin(armA) * (R + 2) * .8 - 2;
  drawEars(g, an, c, dk);
  const gr = g.createRadialGradient(-6, -8, 3, 0, 0, R + 2); gr.addColorStop(0, lt); gr.addColorStop(.65, c); gr.addColorStop(1, shade(c, -.15));
  D.circle(g, 0, 0, R, gr, dk, 2.4);
  // yüz
  const ex = fx * 4, ey = fy * 2.5 - 1;
  if (an === 'penguen') D.ell(g, ex * .6, 3 + ey * .5, 14, 13, '#fff8f0');
  if (an === 'tilki') { g.fillStyle = '#fff6ee'; g.beginPath(); g.moveTo(-13 + ex * .5, 2 + ey); g.quadraticCurveTo(0, 21 + ey, 13 + ex * .5, 2 + ey); g.quadraticCurveTo(0, 8 + ey, -13 + ex * .5, 2 + ey); g.fill(); }
  if (an === 'ayi') D.ell(g, ex * .9, 6 + ey, 8, 6, 'rgba(255,236,210,.9)');
  if (an === 'tavsan') D.ell(g, ex * .9, 6 + ey, 7, 5, '#ffffff');
  const blink = Math.sin(t / 900 + o.seed) > .985;
  [-1, 1].forEach(s => { const x = s * 6.5 + ex, y = -3 + ey; if (blink) { g.strokeStyle = '#2d2340'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + 3, y); g.stroke(); } else { D.ell(g, x, y, 3, 3.8, '#2d2340'); D.circle(g, x - 1, y - 1.5, 1.1, '#ffffff'); } });
  if (an !== 'penguen') { D.ell(g, -11 + ex, 5 + ey, 3.6, 2.2, 'rgba(255,120,160,.55)'); D.ell(g, 11 + ex, 5 + ey, 3.6, 2.2, 'rgba(255,120,160,.55)'); }
  const my = 5 + ey;
  if (an === 'penguen') { g.fillStyle = '#ff9a1f'; g.beginPath(); g.moveTo(ex - 4.5, my - 1); g.lineTo(ex + 4.5, my - 1); g.lineTo(ex + fx * 3, my + 5); g.closePath(); g.fill(); }
  else { D.ell(g, ex, my - 1, 2.4, 1.8, an === 'tavsan' ? '#ff7aa8' : '#2d2340'); g.strokeStyle = '#2d2340'; g.lineWidth = 1.5; g.beginPath(); g.arc(ex - 2.3, my + .6, 2.3, 0, Math.PI); g.arc(ex + 2.3, my + .6, 2.3, 0, Math.PI); g.stroke(); }
  // atkı (oyuncu rengi) ve bere (takım rengi)
  const sc = o.col;
  g.save(); g.beginPath(); g.ellipse(0, 12, 16, 5.5, 0, 0, TAU); g.fillStyle = sc; g.fill(); g.strokeStyle = shade(sc, -.35); g.lineWidth = 1.5; g.stroke();
  const tail = Math.sin(t / 160 + o.seed) * 3 * (walk + .3);
  D.rr(g, -14 - fx * 4, 12, 7, 14 + tail, 3, sc, shade(sc, -.35), 1.4); g.restore();
  const hc = o.tc;
  g.beginPath(); g.ellipse(0, -14, 15, 9, 0, Math.PI, TAU); g.lineTo(15, -12); g.lineTo(-15, -12); g.closePath(); g.fillStyle = hc; g.fill(); g.strokeStyle = shade(hc, -.4); g.lineWidth = 2; g.stroke();
  D.rr(g, -16, -15, 32, 6, 3, '#ffffff', shade(hc, -.35), 1.4);
  D.circle(g, 0, -25, 5, '#ffffff', shade(hc, -.3), 1.4);
  // eldiven + kar topu
  D.circle(g, -ax * .15 - 15, 6, 5, sc, shade(sc, -.4), 1.4);
  D.circle(g, ax, ay, 5.5, sc, shade(sc, -.4), 1.4);
  if (o.hasBall) D.snowBall(g, ax + Math.cos(armA) * 4, ay + Math.sin(armA) * 3 - 3, o.big ? 8 : 5);
  if (o.charging) { const k = o.charge || 0; g.strokeStyle = k >= 1 ? '#ffe14a' : 'rgba(255,255,255,.9)'; g.lineWidth = 3.5; g.beginPath(); g.arc(0, 0, R + 7, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(.05, k)); g.stroke(); }
  if (o.scoop > 0) { g.strokeStyle = 'rgba(120,200,255,.95)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, R + 6, -Math.PI / 2, -Math.PI / 2 + TAU * o.scoop); g.stroke(); }
  g.restore();
}
function drawFrozen(g, o) {   // "karlandı": kar yığınının içinden gözler bakar
  const t = o.t, left = o.left, tot = o.tot || FREEZE_MS;
  g.save(); g.translate(o.x, o.y); g.globalAlpha = o.alpha == null ? 1 : o.alpha;
  const sh = left < 700 ? Math.sin(t / 25) * 2.2 : 0; g.translate(sh, 0);
  D.shadow(g, 0, 16, 26, 8, .26);
  blob(g, 0, -2, R + 10, R + 6, o.seed, '#ffffff', '#a9c3e6', 2.4);
  blob(g, -9, -10, 10, 7, o.seed + 3, '#eef6ff');
  blob(g, 10, 6, 9, 6, o.seed + 7, '#e6f0fc');
  D.circle(g, 2, -27, 5.5, '#ffffff', shade(o.tc, -.3), 1.4); D.rr(g, -6, -24, 16, 6, 3, o.tc, shade(o.tc, -.4), 1.2);
  const look = Math.sin(t / 380) * 2;
  [-6, 6].forEach(x => { D.ell(g, x + look, -4, 3.4, 4, '#2d2340'); D.circle(g, x + look - 1, -5.5, 1.1, '#ffffff'); });
  D.ell(g, look, 5, 3, 2, '#7aa0d0');
  // kalan süre halkası
  const k = clamp(left / tot, 0, 1);
  g.strokeStyle = 'rgba(80,160,255,.9)'; g.lineWidth = 3.5; g.beginPath(); g.arc(0, -2, R + 14, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.stroke();
  g.restore();
}
function pill(g, x, y, text, bg, fg) {
  const s = 1 / cam.s;
  g.save(); g.translate(x, y); g.scale(s, s);
  g.font = '900 11px "Nunito","Segoe UI",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = Math.min(120, g.measureText(text).width + 12);
  D.rr(g, -w / 2, -8, w, 16, 8, bg, 'rgba(0,0,0,.35)', 1);
  g.fillStyle = fg; g.fillText(text, 0, .5, 110);
  g.restore();
}
function drawPlayer(g, i, pos, t, now) {
  const p = V.players[i], me = i === V.me, tc = tcol(V, i);
  const inv = V.inv[i] > now, frz = V.frz[i] > now;
  let alpha = 1; if (inv && Math.sin(t / 70) > 0) alpha = .5; if (!p.online) alpha *= .45;
  const seed = i * 13 + 5;
  if (frz) drawFrozen(g, { x: pos.x, y: pos.y, t, left: V.frz[i] - now, tot: FREEZE_MS, tc, seed, alpha });
  else {
    const charging = me ? aiming() : !!(pos.c);
    const ammo = V.ammo[i] - (me ? pendThrow : 0);
    drawCritter(g, { x: pos.x, y: pos.y, an: p.an, col: p.color, tc, h: pos.h, walk: pos.walk, ph: pos.ph, t, alpha, seed,
      ring: me ? '#ffffff' : null, charging, charge: me ? curCharge() : .6, hasBall: ammo > 0, big: (V.pw[i] || {}).dev > 0,
      throwK: pos.throwAt && t - pos.throwAt < 250 ? 1 : 0, scoop: me ? scoopT / SCOOP_MS : 0, sled: (V.pw[i] || {}).kizak > now });
  }
  const carry = V.flags.find(f => f.state === 'carried' && f.by === i);
  if (carry) drawFlag(g, pos.x + 14, pos.y - 6, carry.team, t, .8);
  pill(g, pos.x, pos.y - R - (frz ? 34 : 26), me ? 'SEN' : p.name, me ? '#ffffff' : tc, me ? '#1a0b3d' : '#ffffff');
  if (!p.online) D.text(g, 'z z', pos.x + 22, pos.y - 26, 12, '#ffffff', '#1a0b3d', '"Nunito",sans-serif');
}
function drawFlag(g, x, y, team, t, s) {
  s = s || 1; const col = TEAMS[team].col, dk = TEAMS[team].dk;
  g.save(); g.translate(x, y); g.scale(s, s);
  D.shadow(g, 3, 4, 14, 5, .25);
  D.rr(g, -2.5, -58, 5, 60, 2, '#e8edf5', '#7d8794', 1.5);
  D.circle(g, 0, -60, 4.5, '#ffe14a', '#a07a00', 1.5);
  const w = Math.sin(t / 180 + team) * 4;
  g.beginPath(); g.moveTo(2, -56); g.quadraticCurveTo(18, -60 + w, 34, -52 + w * .6); g.quadraticCurveTo(20, -44 - w * .4, 34, -34 + w * .4); g.quadraticCurveTo(18, -38 + w, 2, -32); g.closePath();
  g.fillStyle = col; g.fill(); g.strokeStyle = dk; g.lineWidth = 2; g.stroke();
  D.circle(g, 16, -45 + w * .4, 5, '#ffffff');
  if (team === 0) { D.ell(g, 16, -44 + w * .4, 3, 3.6, '#2d3a5c'); } else { g.fillStyle = '#ff8a3d'; g.beginPath(); g.moveTo(12, -47 + w * .4); g.lineTo(20, -47 + w * .4); g.lineTo(16, -41 + w * .4); g.fill(); }
  g.restore();
}
function drawWall(g, w, t, now) {
  const left = w.until - now, fade = clamp(left / 3000, 0, 1), k = .7 + .3 * fade;
  const tc = w.tm >= 0 ? TEAMS[w.tm].col : (V.players[w.by] ? V.players[w.by].color : '#8fb6e8');
  g.save(); g.globalAlpha = .55 + .45 * fade;
  w.cs.forEach(c => D.shadow(g, c[0] + 4, c[1] + 9, WALL_CR + 2, 6, .2));
  w.cs.forEach((c, n) => { blob(g, c[0], c[1] + 3, WALL_CR * k + 1, WALL_CR * k * .8, w.id * 7 + n, '#c7d8ee'); });
  w.cs.forEach((c, n) => { blob(g, c[0], c[1] - 2, WALL_CR * k + 1, WALL_CR * k * .85, w.id * 11 + n, '#ffffff', '#9fb8da', 1.6); });
  if (w.hp < WALL_HP) { g.strokeStyle = 'rgba(110,140,190,.85)'; g.lineWidth = 2; w.cs.forEach((c, n) => { if (n > w.hp - 1 || w.hp === 1) { g.beginPath(); g.moveTo(c[0] - 6, c[1] - 6); g.lineTo(c[0] + 1, c[1]); g.lineTo(c[0] - 2, c[1] + 6); g.moveTo(c[0] + 1, c[1]); g.lineTo(c[0] + 7, c[1] - 3); g.stroke(); } }); }
  const m = w.cs[1]; D.rr(g, m[0] - 8, m[1] - 3, 16, 5, 2.5, tc);
  g.restore();
}
function drawItem(g, it, t) {
  const b = Math.sin(t / 300 + it.id) * 3, y = it.y - 16 + b;
  D.shadow(g, it.x, it.y + 6, 14, 5, .22);
  D.glow(g, it.x, y, 30, 'rgba(255,240,160,.55)');
  g.save(); g.translate(it.x, y); drawItemIcon(g, it.k, 1); g.restore();
}
function drawItemIcon(g, k, s) {
  g.save(); g.scale(s, s);
  D.circle(g, 0, 0, 17, 'rgba(26,11,61,.55)', '#ffe9a0', 2);
  if (k === 'dev') { D.snowBall(g, -1, 1, 11); D.text(g, '+', 9, -9, 12, '#ffe14a', '#5a2a00'); }
  else if (k === 'uclu') { D.snowBall(g, -7, 4, 5.5); D.snowBall(g, 7, 4, 5.5); D.snowBall(g, 0, -6, 5.5); }
  else if (k === 'kakao') {
    D.rr(g, -9, -5, 15, 15, 3, '#ff5a4f', '#8a1a12', 1.6); g.strokeStyle = '#ff5a4f'; g.lineWidth = 2.5; g.beginPath(); g.arc(7, 2, 4.5, -1.2, 1.2); g.stroke();
    D.ell(g, -1.5, -5, 7, 2.4, '#7a4a2a'); D.circle(g, -4, -6, 1.8, '#ffffff'); D.circle(g, 1, -6.5, 1.6, '#ffffff');
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.6; [-4, 1].forEach(x => { g.beginPath(); g.moveTo(x, -9); g.quadraticCurveTo(x + 3, -12, x, -15); g.stroke(); });
  } else {
    D.rr(g, -12, -4, 24, 8, 3, '#ff6a3d', '#9a2e10', 1.6); g.strokeStyle = '#d6dce6'; g.lineWidth = 2; g.beginPath(); g.moveTo(-13, 7); g.lineTo(11, 7); g.quadraticCurveTo(15, 7, 15, 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.6; [-3, 0, 3].forEach(y => { g.beginPath(); g.moveTo(-16, y - 6); g.lineTo(-11, y - 6); g.stroke(); });
  }
  g.restore();
}
function drawBall(g, b, now) {
  const [x, y, z] = ballPos(b, now), r = b.r;
  D.shadow(g, x, y + 2, r * (1 - Math.min(.5, z / 140)) + 1, r * .45 * (1 - Math.min(.5, z / 140)) + .5, .28);
  D.snowBall(g, x, y - z, r);
}
function drawAimPreview(g, t) {
  if (!aiming() || !canAct() || myAmmo() <= 0) return;
  const a = aimAngle(), c = charge.on ? curCharge() : (aim.on ? clamp((pnow() - aim.t0) / CHARGE_MS, 0, 1) : 0);
  const big = (V.pw[V.me] || {}).dev > 0;
  const b = makeBall(scene.map, walls, { id: 'pv', pi: V.me, tm: 0, a, c, big, x: av.x + Math.cos(a) * (R + 4), y: av.y + Math.sin(a) * (R + 4), t0: 0 });
  g.save();
  for (let d = 10; d < b.d; d += 16) { const s = d / b.rng, z = ballHmax(c) * 4 * s * (1 - s) * .5; D.circle(g, b.x + b.dx * d, b.y + b.dy * d - z, 2.6, `rgba(255,255,255,${.85 - d / b.rng * .4})`); }
  if (b.kind === 'ground' || b.kind === 'edge') { g.strokeStyle = c >= 1 ? '#ffe14a' : 'rgba(255,255,255,.9)'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(b.ex, b.ey, 14, 7, 0, 0, TAU); g.stroke(); }
  else { g.strokeStyle = '#ff8fa3'; g.lineWidth = 3; g.beginPath(); g.moveTo(b.ex - 7, b.ey - 7); g.lineTo(b.ex + 7, b.ey + 7); g.moveTo(b.ex + 7, b.ey - 7); g.lineTo(b.ex - 7, b.ey + 7); g.stroke(); }
  g.restore();
  void t;
}
function drawDecals(g, t) {
  decals = decals.filter(d => t - d.born < 6000);
  for (const d of decals) { const a = clamp(1 - (t - d.born - 3500) / 2500, 0, 1); g.save(); g.globalAlpha = .85 * a; blob(g, d.x, d.y, d.r, d.r * .6, d.seed, '#ffffff', 'rgba(150,180,220,.6)', 1.2); D.circle(g, d.x + d.r * .7, d.y - d.r * .3, d.r * .18, '#ffffff'); D.circle(g, d.x - d.r * .8, d.y + d.r * .2, d.r * .14, '#ffffff'); g.restore(); }
}
function drawParts(g) {
  for (const p of parts) { const a = clamp(p.life / p.max, 0, 1); g.globalAlpha = a * (p.k === 'trail' ? .6 : .9); D.circle(g, p.x, p.y, p.r * (p.k === 'puff' ? (1.6 - a * .6) : 1), p.c); }
  g.globalAlpha = 1;
}
function drawAnims(g, t) {
  anims = anims.filter(a => t - a.start < a.dur);
  for (const a of anims) {
    const k = (t - a.start) / a.dur;
    if (a.k === 'ring') { g.strokeStyle = a.col; g.globalAlpha = 1 - k; g.lineWidth = 3; g.beginPath(); g.arc(a.x, a.y, a.r * (.3 + k), 0, TAU); g.stroke(); g.globalAlpha = 1; }
    else if (a.k === 'text') { g.save(); g.globalAlpha = k < .8 ? 1 : (1 - k) * 5; const s = (a.size || 26) / cam.s * .8; D.text(g, a.txt, a.x, a.y - 30 - k * 40, s, a.col, a.stroke || '#1a2a5a'); g.restore(); }
  }
}
function drawProp(g, pr, t, list) {
  const [rx, ry] = pr.fade; let f = 1;
  for (const it of list) if (it.pos && it.pos.y < pr.y - 4 && it.pos.y > pr.y - ry && Math.abs(it.pos.x - pr.x) < rx) { f = .42; break; }
  pr.draw(g, t, f);
}
function draw(t) {
  const g = cg, now = hostClock();
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#0f1a3a'; g.fillRect(0, 0, sw, sh);
  g.save(); g.scale(cam.s, cam.s); g.translate(-cam.x, -cam.y);
  { const k = scene.ground.width / W, x0 = clamp(cam.x, 0, W), y0 = clamp(cam.y, 0, H), x1 = clamp(cam.x + sw / cam.s, 0, W), y1 = clamp(cam.y + sh / cam.s, 0, H);
    if (x1 > x0 && y1 > y0) g.drawImage(scene.ground, x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k, x0, y0, x1 - x0, y1 - y0); }
  if (scene.map.dyn) scene.map.dyn(g, t);
  drawDecals(g, t);
  V.items.forEach(it => drawItem(g, it, t));
  drawAimPreview(g, t);
  const list = [];
  V.players.forEach((_, i) => { const pos = posOf(i); if (pos) list.push({ y: pos.y, i, pos }); });
  walls.forEach(w => list.push({ y: w.y, w }));
  V.flags.forEach(f => { if (f.state !== 'carried') list.push({ y: f.y, f }); });
  (scene.map.props || []).forEach(pr => list.push({ y: pr.y, pr }));
  list.sort((a, b) => a.y - b.y);
  for (const it of list) {
    if (it.pr) drawProp(g, it.pr, t, list);
    else if (it.w) drawWall(g, it.w, t, now);
    else if (it.f) { drawFlag(g, it.f.x, it.f.y, it.f.team, t, 1); if (it.f.state === 'dropped') { const left = Math.max(0, Math.ceil((it.f.retAt - now) / 1000)); pill(g, it.f.x, it.f.y + 14, `${left} sn`, '#1a0b3d', '#ffe14a'); } }
    else drawPlayer(g, it.i, it.pos, t, now);
  }
  balls.forEach(b => drawBall(g, b, now));
  drawParts(g);
  drawAnims(g, t);
  g.restore();
  // yağan kar
  g.fillStyle = 'rgba(255,255,255,.85)';
  for (const f of flakes) { g.globalAlpha = .35 + f.d * .5; g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
}
function drawMini() {
  if (!miniCv || !V || !scene) return;
  const g = miniCv.getContext('2d'), w = miniCv.width, h = miniCv.height, sx = w / W, sy = h / H, now = hostClock();
  if (!w || !h) return;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
  g.drawImage(scene.thumb, 0, 0, w, h);
  g.strokeStyle = 'rgba(26,11,61,.85)'; g.lineWidth = Math.max(1, dpr); g.strokeRect(cam.x * sx, cam.y * sy, sw / cam.s * sx, sh / cam.s * sy);
  V.items.forEach(it => D.circle(g, it.x * sx, it.y * sy, 2.2 * dpr, '#ffb627'));
  V.flags.forEach(f => { const p = f.state === 'carried' ? posOf(f.by) : f; D.rr(g, p.x * sx - 3 * dpr, p.y * sy - 4 * dpr, 6 * dpr, 6 * dpr, 1, TEAMS[f.team].col, '#ffffff', dpr); });
  V.players.forEach((p, i) => {
    const me = i === V.me, pos = posOf(i), r = (me ? 4 : 3.2) * dpr;
    D.circle(g, pos.x * sx, pos.y * sy, r, V.frz[i] > now ? '#ffffff' : tcol(V, i), me ? '#ffffff' : '#1a0b3d', (me ? 2 : 1.1) * dpr);
  });
}
function frame() {
  raf = 0; if (!root || !cv) return;
  raf = requestAnimationFrame(frame);
  if (!V || !scene) return;
  const t = pnow(), dt = clamp((t - (lastT || t)) / 1000, 0, .25); lastT = t; frameN++;
  stepMe(dt, t); stepRemotes(dt, t); stepBalls_(t); stepParts(dt); camFollow(dt); stepFlakes(dt, t);
  draw(t);
  if (frameN % 3 === 0) drawMini();
  if (frameN % 6 === 0) ammoHud();
}

/* ---- HUD ---- */
function ammoHud() {
  const el = q('.kt-ammo'); if (!el || !V) return;
  const me = V.me; if (me < 0) { el.hidden = true; return; }
  const a = myAmmo(), ice = av && onIce(MAPS[V.mapId], av.x, av.y), pw = V.pw[me] || {};
  const s = `${Array.from({ length: AMMO_MAX }, (_, i) => `<i class="${i < a ? 'on' : ''}${i === a && scoopT > 0 ? ' fill' : ''}" style="${i === a && scoopT > 0 ? `--k:${(scoopT / SCOOP_MS).toFixed(2)}` : ''}"></i>`).join('')}${pw.dev > 0 ? '<b class="kt-am-pw">DEV</b>' : ''}${pw.uclu > 0 ? `<b class="kt-am-pw">×3 (${pw.uclu})</b>` : ''}`;
  if (el.innerHTML !== s) el.innerHTML = s;
  el.hidden = false;
  el.classList.toggle('empty', a === 0 && V.phase === 'play');
  const hint = q('.kt-hint');
  let h = '';
  if (V.phase === 'play' && !V.frz[me]) { if (a === 0) h = ice ? '🧊 Buzda kar yok! Kıyıya git ve dur' : '❄️ Kar topun bitti — dur ve topla!'; else if (V.flags.some(f => f.by === me)) h = '🚩 Bayrak sende! Kendi üssüne koş!'; }
  if (hint.textContent !== h) { hint.textContent = h; hint.hidden = !h; }
}
function renderHud() {
  const v = V, me = v.me, now = hostClock();
  // skor şeridi
  const sb = q('.kt-score');
  const goal = v.mode === 'bayrak' ? CAPS_WIN : v.target;
  let sk;
  if (v.mode === 'tek') {
    const lead = v.players.map((p, i) => ({ i, s: v.ts[i] || 0 })).sort((a, b) => b.s - a.s).slice(0, 3);
    sk = `<div class="kt-ffa">${lead.map((o, n) => `<span class="kt-lead" style="--pc:${v.players[o.i].color}"><em>${n + 1}.</em><b>${esc(v.players[o.i].name)}</b><strong>${o.s}</strong></span>`).join('')}</div><div class="kt-mid"><span class="kt-timer">⏱ <b>0:00</b></span><small>${goal} isabet kazanır</small></div>`;
  } else {
    sk = [0, 1].map(t => `<div class="kt-team t${t} ${me >= 0 && v.team[me] === t ? 'mine' : ''}"><span class="kt-ti">${TEAMS[t].icon}</span><span class="kt-tn"><span class="lg">${esc(TEAMS[t].name)}</span><span class="sm">${esc(TEAMS[t].short)}</span></span><strong>${v.ts[t]}</strong></div>`).join(`<div class="kt-mid"><span class="kt-timer">⏱ <b>0:00</b></span><small>${v.mode === 'bayrak' ? `${goal} bayrak` : `${goal} isabet`} kazanır</small></div>`);
  }
  const key = sk + v.mode;
  if (sb.dataset.k !== key) { sb.dataset.k = key; sb.innerHTML = sk; sb.className = 'kt-score ' + (v.mode === 'tek' ? 'ffa' : 'teams'); lastSec = -1; }
  // oyuncu çipleri
  const ck = JSON.stringify([v.players.map(p => [p.name, p.online]), v.team, v.stats.map(s => s.hit + s.cap * 3 + s.ret), v.frz.map(f => f > now ? 1 : 0), me, v.flags.map(f => f.by)]);
  if (ck !== chipKey) {
    chipKey = ck;
    const pl = q('.kt-players'); pl.classList.toggle('compact', v.players.length > 4);
    pl.innerHTML = v.players.map((p, i) => {
      const s = v.stats[i], pts = v.mode === 'tek' ? (v.ts[i] || 0) : s.hit + s.cap * 3 + s.ret, carry = v.flags.some(f => f.by === i);
      return `<div class="g-chip kt-chip ${i === me ? 'me' : ''} ${!p.online ? 'off' : ''} ${v.frz[i] > now ? 'frz' : ''}" style="--pc:${tcol(v, i)}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><b>${esc(p.name)}${i === me ? '<small> · sen</small>' : ''}</b>${carry ? '<span class="kt-tag">🚩</span>' : ''}${v.frz[i] > now ? '<span class="kt-tag">❄️</span>' : ''}<span class="g-num">${pts}</span></div>`;
    }).join('');
  }
  // durum
  let st = '', cls = '';
  if (v.phase === 'count') st = me < 0 ? '👀 Maç başlıyor…' : '⏳ Hazırlan! Kar topları hazır…';
  else if (v.phase === 'play') {
    if (me < 0) st = '👀 İzliyorsun';
    else if (v.frz[me] > now) { st = '❄️ Karlandın! Silkelenip üssünde doğacaksın'; cls = 'ice'; }
    else if (v.flags.some(f => f.by === me)) { st = '🚩 Bayrak sende! Üssüne götür!'; cls = 'mine'; }
    else st = v.mode === 'tek' ? '🎯 Herkese at, karlanma!' : v.mode === 'bayrak' ? '🚩 Rakip bayrağını kap, üssüne getir!' : `⚔️ ${TEAMS[v.team[me]].name} için at!`;
  } else { st = '🏁 Maç bitti!'; cls = 'win'; }
  const se = q('.kt-status'); const sh_ = `<span class="g-turn ${cls}">${st}</span>`; if (se.innerHTML !== sh_) se.innerHTML = sh_;
}
function renderSide() {
  const v = V, side = q('.kt-side'); if (!side) return;
  const key = `${v.mode}:${v.pu}:${v.mapId}:${v.me >= 0 ? v.team[v.me] : -2}`;
  if (key !== sideKey) {
    sideKey = key;
    const md = MODES[v.mode], map = MAPS[v.mapId];
    const rules = {
      takim: [`❄️ İsabet alan rakip "karlanır": ${FREEZE_MS / 1000} sn donar, sonra üssünde doğar.`, `🏆 ${v.target} isabete ilk ulaşan takım ya da süre bitince önde olan kazanır.`, '🧱 Duvarlar topları durdurur; 3 isabette yıkılır, zamanla erir.'],
      bayrak: ['🚩 Rakip bayrağına dokunup kap, kendi bayrağının yanına getir.', '❄️ Bayrağı taşıyan karlanırsa bayrak yere düşer; sahibi dokununca yerine döner.', `🏆 ${CAPS_WIN} bayrak getiren takım kazanır. Kendi bayrağın yerindeyken sayılır.`],
      tek: ['🎯 Herkes herkese karşı! Her isabet 1 puan.', `🏆 ${v.target} isabete ilk ulaşan ya da süre bitince önde olan kazanır.`, '❄️ Karlanınca bir süre donarsın, sonra boş bir yerde doğarsın.']
    }[v.mode];
    const mapNote = { koy: 'Meydandaki çeşme ve evler iyi siper olur.', gol: 'Buz kaygandır ve buzda kar toplanmaz!', orman: 'Ağaçların arkasına saklan, kütükleri kullan.' }[v.mapId];
    side.innerHTML = `<h3 class="kt-h">${md.icon} ${esc(md.name)}</h3><p class="kt-map">${map.icon} ${esc(map.name)} · ${esc(mapNote)}</p>
      ${v.me >= 0 && v.mode !== 'tek' ? `<p class="kt-myteam t${v.team[v.me]}">${TEAMS[v.team[v.me]].icon} Takımın: <b>${esc(TEAMS[v.team[v.me]].name)}</b></p>` : ''}
      <ul class="kt-rules">${rules.map(r => `<li>${esc(r)}</li>`).join('')}<li>⛄ Dur ve kar topla (en fazla ${AMMO_MAX}). Basılı tut = daha uzağa, daha hızlı.</li></ul>
      ${v.pu ? `<div class="kt-legend"><span class="kt-lh">Güçlendirmeler</span>${ITEM_IDS.map(k => `<div class="kt-li"><canvas data-ic="${k}" width="64" height="64"></canvas><span><b>${esc(ITEMS[k].name)}</b><small>${esc(ITEMS[k].desc)}</small></span></div>`).join('')}</div>` : '<p class="kt-sub">Güçlendirmeler kapalı.</p>'}
      <p class="kt-keys">${isTouch() ? '👆 Sol tarafta sürükle: yürü · Sağdaki <b>AT</b> topunu sürükle: nişan al, bırak: at (uzun tut = güçlü) · Dokun: en yakına otomatik atış · <b>Duvar</b> düğmesi: kar duvarı' : '⌨️ <b>WASD</b>: yürü · <b>Fare</b>: nişan · <b>Sol tık basılı tut</b>: şarj et, bırak: at · <b>Sağ tık / E</b>: kar duvarı · durunca kar toplarsın'}</p>
      <div class="kt-board"></div>`;
    side.querySelectorAll('canvas[data-ic]').forEach(c => { const g = c.getContext('2d'); g.clearRect(0, 0, 64, 64); g.translate(32, 32); drawItemIcon(g, c.dataset.ic, 1.6); });
  }
  const bk = JSON.stringify([v.stats, v.ts, v.players.map(p => p.online)]);
  if (bk !== boardKey) {
    boardKey = bk;
    const rows = v.players.map((p, i) => ({ p, i, s: v.stats[i], pts: v.mode === 'tek' ? (v.ts[i] || 0) : v.stats[i].hit + v.stats[i].cap * 3 + v.stats[i].ret })).sort((a, b) => b.pts - a.pts);
    q('.kt-board').innerHTML = `<span class="kt-lh">Skor tablosu</span><ol class="kt-res">${rows.map(({ p, i, s, pts }) => `<li style="--pc:${tcol(v, i)}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><span class="kt-rn"><b>${esc(p.name)}${i === v.me ? ' (sen)' : ''}</b><small>${v.mode === 'tek' ? '' : esc(TEAMS[v.team[i]].short) + ' · '}${s.hit} isabet${v.mode === 'bayrak' ? ` · ${s.cap} bayrak` : ''} · ${s.gotHit} karlandı${p.isBot ? ' · bilgisayar' : ''}</small></span><span class="kt-pts">${pts}</span></li>`).join('')}</ol>`;
  }
}
function renderOverlays() {
  const v = V, me = v.me;
  const cnt = q('.kt-count');
  if (v.phase === 'count') {
    const md = MODES[v.mode], map = MAPS[v.mapId];
    const role = me < 0 ? 'İzle ve eğlen!' : v.mode === 'tek' ? '🎯 Herkes tek başına!' : `${TEAMS[v.team[me]].icon} Takımın: <b style="color:${TEAMS[v.team[me]].lt}">${esc(TEAMS[v.team[me]].name)}</b>`;
    const goal = v.mode === 'bayrak' ? `${CAPS_WIN} bayrak getiren kazanır` : `${v.target} isabete ulaşan kazanır`;
    const ck = `${v.mode}${v.mapId}${me}`;
    if (cnt.dataset.k !== ck) {
      cnt.dataset.k = ck;
      cnt.innerHTML = `<div class="kt-ccard"><small>${map.icon} ${esc(map.name).toLocaleUpperCase('tr-TR')} · ${mmss(v.dur)}</small><h3>${md.icon} ${esc(md.name)}</h3><p class="kt-crole">${role}</p><p class="kt-cwho">${goal}</p><b class="kt-cnum">3</b><p class="kt-chint">${isTouch() ? 'Solda sürükle: yürü · Sağda AT: nişan al ve bırak' : 'WASD: yürü · Sol tık basılı tut ve bırak: at · E: duvar'}</p></div>`;
    }
    cnt.hidden = false;
  } else cnt.hidden = true;
  const ov = q('.kt-over');
  if (v.phase === 'over' && v.result) {
    const r = v.result, ok = JSON.stringify(r) + me;
    if (ok !== overKey) {
      overKey = ok;
      const mvp = r.mvp, p = v.players[mvp], s = v.stats[mvp];
      const head = v.mode === 'tek' ? (r.draw ? 'Berabere!' : `🏆 ${esc(v.players[r.winners[0]].name)} kazandı!`) : (r.draw ? 'Berabere!' : `${TEAMS[r.winTeam].icon} ${esc(TEAMS[r.winTeam].name)} kazandı!`);
      const sc = v.mode === 'tek' ? '' : `<p class="kt-osc"><span class="t0">${TEAMS[0].icon} ${r.ts[0]}</span> – <span class="t1">${r.ts[1]} ${TEAMS[1].icon}</span></p>`;
      ov.innerHTML = `<div class="kt-ocard"><small>${r.reason === 'time' ? 'SÜRE DOLDU' : 'MAÇ BİTTİ'}</small><h3>${head}</h3>${sc}<div class="kt-mvp"><canvas width="160" height="160"></canvas><div><span class="kt-mvpt">⭐ MVP ⭐</span><b>${esc(p.name)}${mvp === me ? ' (sen)' : ''}</b><small>${s.hit} isabet${s.cap ? ` · ${s.cap} bayrak` : ''}${s.ret ? ` · ${s.ret} kurtarma` : ''} · ${s.gotHit} kez karlandı</small></div></div><p class="kt-onext">Sonuçlar geliyor…</p></div>`;
      const c = ov.querySelector('canvas'), g = c.getContext('2d'); g.scale(2, 2); g.translate(40, 48);
      drawCritter(g, { x: 0, y: 0, an: p.an, col: p.color, tc: tcol(v, mvp), h: Math.PI / 2, walk: 0, ph: 0, t: 0, seed: 1, hasBall: true });
    }
    ov.hidden = false;
  } else ov.hidden = true;
  // duvar düğmesi
  if (wallBtn) {
    const ws = me >= 0 ? v.wstock[me] : 0;
    wallBtn.hidden = me < 0;
    wallBtn.querySelector('b').textContent = ws;
    wallBtn.disabled = me < 0 || v.phase !== 'play' || v.frz[me] > 0 || ws <= 0;
  }
  if (aimEl) aimEl.hidden = me < 0 || !isTouch();
}
function hudTick() {
  if (!V || !root) return;
  const v = V, now = hostClock(), left = Math.max(0, v.endsAt - now), secs = Math.ceil(left / 1000);
  const tm = q('.kt-timer'); if (tm) { const tb = tm.querySelector('b'); const s = v.phase === 'play' ? mmss(secs) : v.phase === 'count' ? mmss(v.dur) : '0:00'; if (tb.textContent !== s) tb.textContent = s; tm.classList.toggle('urgent', v.phase === 'play' && secs <= 15); }
  const cn = q('.kt-cnum'); if (cn && v.phase === 'count') cn.textContent = Math.max(1, secs);
  if (secs !== lastSec) {
    if (v.phase === 'count' && secs > 0 && secs <= 3) Sound.tick(.8);
    else if (v.phase === 'play' && secs <= 5 && secs > 0) Sound.tick(.6);
    lastSec = secs;
  }
  const me = v.me, fxEl = q('.kt-fx');
  if (fxEl) {
    const chips = [];
    if (me >= 0 && v.phase === 'play') {
      const pw = v.pw[me] || {};
      if (v.frz[me] > now) chips.push(`<span class="kt-fxc frz">❄️ ${((v.frz[me] - now) / 1000).toFixed(1)}</span>`);
      if (pw.kakao > now) chips.push(`<span class="kt-fxc kak">☕ ${Math.ceil((pw.kakao - now) / 1000)}</span>`);
      if (pw.kizak > now) chips.push(`<span class="kt-fxc kiz">🛷 ${Math.ceil((pw.kizak - now) / 1000)}</span>`);
      if (v.inv[me] > now) chips.push('<span class="kt-fxc inv">✨ Korumada</span>');
    }
    const s = chips.join(''); if (fxEl.innerHTML !== s) fxEl.innerHTML = s;
  }
  if (pnow() - layoutAt > 1500) { layoutAt = pnow(); layout(); }
}
function render(v) {
  V = v;
  if (!v || !v.mapId || !root) return;
  ensureScene(v.mapId);
  const me = v.me;
  // doğma/yeniden doğma: konumu sunucudan al
  v.players.forEach((_, i) => {
    if (seenSpawn[i] === v.spawnN[i]) return;
    seenSpawn[i] = v.spawnN[i];
    if (i === me) { av = { x: v.pos[me][0], y: v.pos[me][1], vx: 0, vy: 0, h: v.pos[me][2], walk: 0, ph: 0 }; snapCam = true; }
    else rp[i] = mkRemote(v.pos[i]);
  });
  if (me >= 0 && !av) av = { x: v.pos[me][0], y: v.pos[me][1], vx: 0, vy: 0, h: v.pos[me][2], walk: 0, ph: 0 };
  const fr = me >= 0 && v.frz[me] > 0;
  if (fr && !wasFrz && av) { av.x = v.pos[me][0]; av.y = v.pos[me][1]; av.vx = av.vy = 0; charge.on = false; aim.on = false; if (aimEl) aimEl.classList.remove('on'); }
  wasFrz = fr;
  // kesinleşen atışlar
  if (confThrow) { pendThrow = Math.max(0, pendThrow - confThrow); confThrow = 0; }
  if (me >= 0) { if (v.ammo[me] > lastAmmo && lastAmmo >= 0) scoopPend = 0; lastAmmo = v.ammo[me]; }
  // duvarlar ve toplar
  walls = v.walls.map(w => Object.assign({}, w));
  const hn = v.now || hostClock();
  addBalls(v.balls);
  const ids = new Set(v.balls.map(b => b.id));
  balls = balls.filter(b => b.pred || ids.has(b.id) || b.endT <= hn + 300);
  const key = v.phase;
  if (key !== seenKey) { seenKey = key; lastSec = -1; if (v.phase === 'count') { requestAnimationFrame(resize); balls = []; decals = []; } }
  root.querySelector('.kt').dataset.phase = v.phase;
  root.querySelector('.kt').dataset.mode = v.mode;
  renderHud(); renderSide(); renderOverlays(); hudTick();
  if (!raf) raf = requestAnimationFrame(frame);
}

/* ---- olaylar ---- */
function onEvent(e) {
  if (!root || !V) return;
  const me = ui ? ui.me : -1, t = pnow();
  const at = (x, y) => (cv ? toClient(x, y) : null);
  if (e.t === 'start') Sound.special();
  else if (e.t === 'go') { pop('AT!', 'good'); Sound.stop(); Sound.whoosh(); }
  else if (e.t === 'th') {
    addBalls(e.b || []);
    if (e.pi === me) confThrow++;
    else { const r = rp[e.pi]; if (r) r.throwAt = t; const b = (e.b || [])[0]; if (b && dist(b.x, b.y, cam.x + sw / 2 / cam.s, cam.y + sh / 2 / cam.s) < 600) snd.throw(b.c); }
  } else if (e.t === 'nothrow') { if (e.pi === me) { confThrow++; balls = balls.filter(b => !(b.pred && b.pk === e.k)); } }
  else if (e.t === 'hit') {
    balls = balls.filter(b => b.id !== e.id);
    splatAt(e.x, e.y, e.big ? 1.8 : 1.3, true);
    puff(e.x, e.y, 14, 120, 7);
    anims.push({ k: 'text', x: e.x, y: e.y, txt: e.b === me ? 'KARLANDIN!' : 'PAF!', col: '#ffffff', stroke: '#2a5aa8', start: t, dur: 900, size: 24 });
    snd.freeze();
    if (e.b === me) { screenSplat(e.big); flash('bad'); pop('KARLANDIN!', 'ice'); if (av) { av.vx = av.vy = 0; } charge.on = false; aim.on = false; if (aimEl) aimEl.classList.remove('on'); }
    else if (e.a === me) { pop('İSABET!', 'good'); Sound.good(); const c = at(e.x, e.y); if (c) FX.burst(c[0], c[1], 18, true); }
    if (e.fl >= 0) { Sound.bad(); if (V.me >= 0 && V.team[V.me] === e.fl) toast('🚩 Bayrağımız düştü! Dokunup geri koy!', 'ok'); }
  } else if (e.t === 'wh') {
    const w = walls.find(o => o.id === e.wid);
    if (w) { w.hp = e.hp; if (e.hp <= 0) { walls = walls.filter(o => o !== w); w.cs.forEach(c => puff(c[0], c[1], 6, 80, 7)); snd.crumble(); } }
    splatAt(e.x, e.y, 1, true);
    balls = balls.filter(b => !(b.kind !== 'wall' && dist(ballPos(b, hostClock())[0], ballPos(b, hostClock())[1], e.x, e.y) < 30));
  } else if (e.t === 'wall') {
    if (!walls.some(w => w.id === e.w.id)) walls.push(Object.assign({}, e.w));
    e.w.cs.forEach(c => puff(c[0], c[1], 4, 60, 6)); snd.wall();
    if (e.w.by === me) toast('🧱 Kar duvarı kuruldu!', 'ok');
  } else if (e.t === 'nowall') { if (e.pi === me) toast(e.why === 'stok' ? '🧱 Duvar hakkın doldu' : '🧱 Buraya duvar kurulamaz', 'bad'); }
  else if (e.t === 'noscoop') { if (e.pi === me) toast('🧊 Buzda kar yok! Kıyıya git', 'bad'); }
  else if (e.t === 'shake') {
    puff(e.x, e.y, 16, 140, 8); anims.push({ k: 'ring', x: e.x, y: e.y, col: 'rgba(255,255,255,.9)', start: t, dur: 450, r: 50 });
    if (e.pi === me) { snd.shake(); pop('SİLKELENDİN!', 'good'); }
  } else if (e.t === 'pick') {
    puff(e.x, e.y - 10, 10, 100, 5); anims.push({ k: 'ring', x: e.x, y: e.y - 10, col: '#ffe9a0', start: t, dur: 450, r: 40 });
    if (e.pi === me) { Sound.buy(); toast(`🎁 ${ITEMS[e.k].name}! ${ITEMS[e.k].desc}`, 'ok'); } else Sound.tick(.3);
  } else if (e.t === 'flag') {
    if (e.k === 'cap') { Sound.solve(); const mine = V.me >= 0 && V.team[V.me] === e.team; pop(mine ? 'BAYRAK BİZİM! +1' : 'RAKİP BAYRAK GETİRDİ!', mine ? 'good' : 'bad'); if (mine) FX.confetti(60); }
    else if (e.k === 'take') { Sound.special(); if (e.pi === me) pop('BAYRAĞI KAPTIN!', 'good'); else if (V.me >= 0 && V.team[V.me] === e.team) toast('🚨 Bayrağımız kaçırılıyor! Taşıyanı karla!', 'bad'); }
    else if (e.k === 'ret') { Sound.good(); if (e.pi === me) pop('BAYRAK KURTARILDI!', 'good'); }
  } else if (e.t === 'over') {
    Sound.fanfare();
    const won = V.me >= 0 && (V.mode === 'tek' ? (e.winners || []).includes(V.me) : (!e.draw && V.team[V.me] === e.winTeam));
    pop(won ? 'KAZANDINIZ!' : e.draw ? 'BERABERE!' : 'MAÇ BİTTİ', won ? 'good' : 'pink');
    if (won) FX.confetti(90);
    charge.on = false; aim.on = false;
  }
}

/* ---- giriş ---- */
function localXY(e) { const r = stageEl.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function onDown(e) {
  if (e.target.closest && e.target.closest('button')) return;
  if (!V || V.me < 0) return;
  e.preventDefault(); Sound.init();
  lastPtr = e.pointerType || 'mouse';
  const [x, y] = localXY(e);
  if (e.pointerType === 'mouse') {
    mouse.x = x; mouse.y = y; mouse.in = true;
    if (e.button === 2) { buildWall(); return; }
    if (e.button !== 0) return;
    if (!canAct()) return;
    if (myAmmo() <= 0) { toast('❄️ Kar topun yok! Dur ve topla', 'bad'); snd.empty(); return; }
    charge.on = true; charge.t0 = pnow(); charge.src = 'mouse';
    try { stageEl.setPointerCapture(e.pointerId); } catch { /* */ }
    return;
  }
  // dokunmatik: sağ taraf nişan çubuğu, sol taraf yürüme
  if (x > sw * .52 && y > sh * .22 && !aim.on) {
    aim.on = true; aim.id = e.pointerId; aim.bx = x; aim.by = y; aim.dx = aim.dy = 0; aim.moved = false; aim.t0 = pnow();
    if (aimEl) { aimEl.classList.add('on'); aimEl.style.left = x + 'px'; aimEl.style.top = y + 'px'; aimEl.style.right = 'auto'; aimEl.style.bottom = 'auto'; aimEl.querySelector('i').style.transform = ''; }
  } else if (!joy.on) {
    joy.on = true; joy.id = e.pointerId; joy.bx = x; joy.by = y; joy.dx = joy.dy = 0;
    if (joyEl) { joyEl.hidden = false; joyEl.style.left = x + 'px'; joyEl.style.top = y + 'px'; joyEl.querySelector('i').style.transform = ''; }
    const hint = q('.kt-joyhint'); if (hint) hint.hidden = true;
  }
  try { stageEl.setPointerCapture(e.pointerId); } catch { /* */ }
}
function onMove(e) {
  if (e.pointerType === 'mouse') { const [x, y] = localXY(e); mouse.x = x; mouse.y = y; mouse.in = true; lastPtr = 'mouse'; return; }
  const [x, y] = localXY(e);
  if (joy.on && e.pointerId === joy.id) {
    let dx = (x - joy.bx) / JR, dy = (y - joy.by) / JR; const l = Math.hypot(dx, dy);
    if (l > 1.25) { joy.bx = x - dx / l * JR * 1.25; joy.by = y - dy / l * JR * 1.25; if (joyEl) { joyEl.style.left = joy.bx + 'px'; joyEl.style.top = joy.by + 'px'; } }
    if (l > 1) { dx /= l; dy /= l; }
    const dead = Math.hypot(dx, dy) < .14;
    joy.dx = dead ? 0 : dx; joy.dy = dead ? 0 : dy;
    if (joyEl) joyEl.querySelector('i').style.transform = `translate(${dx * JR * .7}px, ${dy * JR * .7}px)`;
  } else if (aim.on && e.pointerId === aim.id) {
    let dx = (x - aim.bx) / AR, dy = (y - aim.by) / AR; const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    if (l > .3) { aim.moved = true; aim.dx = dx; aim.dy = dy; }
    if (aimEl) aimEl.querySelector('i').style.transform = `translate(${dx * AR * .75}px, ${dy * AR * .75}px)`;
  }
}
function onUp(e) {
  if (e.pointerType === 'mouse') {
    if (e.button === 0 && charge.on) { const c = curCharge(), a = aimAngle(); charge.on = false; throwNow(a, c); }
    return;
  }
  if (joy.on && e.pointerId === joy.id) { joy.on = false; joy.id = null; joy.dx = joy.dy = 0; if (joyEl) joyEl.hidden = true; }
  if (aim.on && e.pointerId === aim.id) {
    const moved = aim.moved, a = Math.atan2(aim.dy, aim.dx), c = clamp((pnow() - aim.t0) / CHARGE_MS, 0, 1);
    aim.on = false; aim.id = null; aim.moved = false;
    if (aimEl) { aimEl.classList.remove('on'); aimEl.style.left = ''; aimEl.style.top = ''; aimEl.style.right = ''; aimEl.style.bottom = ''; aimEl.querySelector('i').style.transform = ''; }
    if (e.type === 'pointercancel') return;
    if (moved) throwNow(a, c); else autoAimThrow();
  }
}
function onKey(e) {
  if (!V || !root || (e.target && e.target.closest && e.target.closest('input,textarea,select'))) return;
  const codes = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'];
  if (e.type === 'keydown') {
    if (codes.includes(e.code)) { keys.add(e.code); if (V.me >= 0) e.preventDefault(); }
    else if ((e.code === 'KeyE' || e.code === 'KeyQ') && V.me >= 0) { e.preventDefault(); if (!e.repeat) buildWall(); }
    else if (e.code === 'Space' && V.me >= 0) {
      e.preventDefault();
      if (!e.repeat && canAct()) { if (myAmmo() <= 0) { toast('❄️ Kar topun yok! Dur ve topla', 'bad'); snd.empty(); } else { charge.on = true; charge.t0 = pnow(); charge.src = 'key'; } }
    }
  } else {
    keys.delete(e.code);
    if (e.code === 'Space' && charge.on && charge.src === 'key') { const c = curCharge(); charge.on = false; if (mouse.in) throwNow(aimAngle(), c); else autoAimThrow(); }
  }
}
function onBlur() { keys.clear(); joy.on = false; joy.dx = joy.dy = 0; aim.on = false; charge.on = false; if (joyEl) joyEl.hidden = true; if (aimEl) aimEl.classList.remove('on'); }

function mount(r, api) {
  root = r; ui = api; uiRef = api; V = null; scene = null; av = null; rp = []; keys = new Set(); parts = []; anims = []; balls = []; decals = []; walls = [];
  seenSpawn = []; seenKey = ''; chipKey = ''; sideKey = ''; boardKey = ''; overKey = ''; lastT = 0; wasFrz = false; snapCam = true; pendThrow = 0; confThrow = 0; scoopT = 0; scoopPend = 0; lastAmmo = -1; kSeq = 0;
  charge = { on: false, t0: 0, src: '' }; aim = { on: false, id: null, bx: 0, by: 0, dx: 0, dy: 0, moved: false, t0: 0 }; joy = { on: false, id: null, bx: 0, by: 0, dx: 0, dy: 0 }; mouse = { x: 0, y: 0, in: false }; lastCam = null;
  root.innerHTML = `<div class="g-wrap kt">
    <div class="kt-hud"><div class="kt-score"></div><div class="kt-players"></div></div>
    <div class="kt-main">
      <div class="kt-stage">
        <canvas class="kt-cv" aria-label="Kar topu savaş alanı"></canvas>
        <div class="kt-status"></div>
        <div class="kt-fx"></div>
        <canvas class="kt-mini" aria-label="Mini harita"></canvas>
        <div class="kt-ammo" hidden aria-label="Kar topların"></div>
        <div class="kt-hint" hidden></div>
        <div class="kt-joy" hidden><i></i></div>
        <div class="kt-joyhint" hidden><i></i><span>Sürükle: yürü</span></div>
        <div class="kt-aim" hidden><i></i><span>AT</span></div>
        <button type="button" class="kt-wallbtn" disabled aria-label="Kar duvarı kur"><span>🧱 Duvar</span><b>3</b></button>
        <div class="kt-splat" aria-hidden="true"></div>
        <div class="kt-pop" aria-live="polite"></div>
        <div class="kt-toast" aria-live="polite"></div>
        <div class="kt-count" hidden></div>
        <div class="kt-over" hidden></div>
      </div>
      <aside class="kt-side g-panel"></aside>
    </div>
  </div>`;
  cv = q('.kt-cv'); cg = cv.getContext('2d'); stageEl = q('.kt-stage'); miniCv = q('.kt-mini'); joyEl = q('.kt-joy'); aimEl = q('.kt-aim'); wallBtn = q('.kt-wallbtn');
  if (isTouch()) { q('.kt-joyhint').hidden = false; lastPtr = 'touch'; }
  stageEl.addEventListener('pointerdown', onDown); stageEl.addEventListener('pointermove', onMove);
  stageEl.addEventListener('pointerup', onUp); stageEl.addEventListener('pointercancel', onUp);
  stageEl.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') mouse.in = !!charge.on || mouse.in; });
  stageEl.addEventListener('contextmenu', e => e.preventDefault());
  wallBtn.addEventListener('pointerdown', e => e.stopPropagation());
  wallBtn.addEventListener('click', e => { e.preventDefault(); buildWall(); });
  if (window.ResizeObserver) { ro = new ResizeObserver(() => resize()); ro.observe(stageEl); }
  addEventListener('resize', resize);
  document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKey); addEventListener('blur', onBlur);
  hudT = setInterval(hudTick, 150);
  requestAnimationFrame(resize);
}
function unmount() {
  removeEventListener('resize', resize); removeEventListener('blur', onBlur);
  document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKey);
  if (ro) { ro.disconnect(); ro = null; }
  clearInterval(hudT); clearTimeout(popT); clearTimeout(toastT); if (raf) cancelAnimationFrame(raf);
  raf = 0; root = null; ui = null; uiRef = null; V = null; cv = null; cg = null; stageEl = null; miniCv = null; joyEl = null; aimEl = null; wallBtn = null; scene = null; av = null; rp = []; balls = [];
}

CFX.registerGame(Object.assign({
  id: 'kartopu', name: 'Kar Topu Savaşı', icon: '☃️', color: '#7cc8ff', min: 2, max: 8, hotseat: false, bot: true, localMin: 1,
  tagline: 'Topla, şarj et, at: takımca kar topu savaşı!',
  rules: 'Gerçek zamanlı kar topu savaşı: durup kar topla (en fazla 5), basılı tutup şarj et ve nişan alıp at. İsabet alan "karlanır", kısa süre donup üssünde yeniden doğar. Takım Maçı\'nda hedef isabet sayısına ilk ulaşan, Bayrak Kapmaca\'da rakip bayrağını üssüne getiren, Herkes Tek\'te en çok isabet yapan kazanır; kar duvarı kurup siper alabilirsin.',
  options: [
    { key: 'mod', label: 'Mod', def: 'takim', choices: [{ v: 'takim', label: '⚔️ Takım Maçı' }, { v: 'bayrak', label: '🚩 Bayrak Kapmaca' }, { v: 'tek', label: '🎯 Herkes Tek' }] },
    { key: 'harita', label: 'Harita', def: 'koy', choices: [{ v: 'koy', label: '🏘️ Köy Meydanı' }, { v: 'gol', label: '🧊 Donmuş Göl' }, { v: 'orman', label: '🌲 Çam Ormanı' }, { v: 'rastgele', label: '🎲 Rastgele' }] },
    { key: 'sure', label: 'Süre', def: '180', choices: [{ v: '120', label: '2 dk' }, { v: '180', label: '3 dk' }, { v: '300', label: '5 dk' }] },
    { key: 'takim', label: 'Takımlar', def: 'oto', choices: [{ v: 'oto', label: 'Otomatik denge' }, { v: 'sira', label: 'Sırayla' }, { v: 'insan', label: 'İnsanlar birlikte' }] },
    { key: 'guc', label: 'Güçlendirmeler', def: '1', choices: [{ v: '1', label: 'Açık' }, { v: '0', label: 'Kapalı' }] }
  ],
  mount, render, onEvent, onFast, unmount,
  // test ve geliştirme için dışa açık yardımcılar
  _kt: { MAPS, ITEMS, TEAMS, W, H, R, BR, BIG_R, AMMO_MAX, SCOOP_MS, FREEZE_MS, CAPS_WIN, FLAG_RET_MS, WALL_HP, WALL_STOCK, THROW_CD, CHARGE_MS, HIT_TOL, REWIND_MS,
    circleFree, moveBody, onIce, navOf, bfs, cellOf, NX, NY, NC, traceBall, makeBall, ballPos, ballSp, ballRng, wallCircles, wallObs, wallHit, clearShot, assignTeams,
    throwAct, scoopAct, wallAct, stepBalls, flagTick, hitPlayer, applyPos, timers, finish, checkWin, posAt, pushHist, spawnPoint, doThrow,
    cam: () => cam, av: () => av, rp: () => rp, balls: () => balls, walls: () => walls, toClient: (x, y) => (cv ? toClient(x, y) : null), keys: () => keys, scene: () => scene }
}, RULES));
})();
