/* =========================================================================
   ÇARKIFELEK STÜDYO — oyun motoru (Vanilla JS, dış kütüphane yok)
   Bölümler:
     1-5  Yardımcılar, bulmaca havuzu, ses, çark, efektler
     ipucu üretimi ve ürün görselleri
     6    Sabitler ve ayarlar
     7    Küçük MQTT istemcisi (WebSocket)
     8    Ağ katmanı: oda kur / katıl / yeniden bağlan
     9    Oyun motoru (tek doğru durum, yalnızca yöneten cihazda)
     10   Kurucu (host)   11 Katılımcı (client)
     12   Arayüz          13 Menü, lobi, ayarlar
   ========================================================================= */
(() => {
'use strict';

/* ------------------------------------------------------------------ 1 */
const TR = 'tr-TR';
const up = s => String(s).toLocaleUpperCase(TR);
const ALPHABET = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('');
const EXTRA_KEYS = ['Q', 'W', 'X'];
const VOWELS = new Set(['A', 'E', 'I', 'İ', 'O', 'Ö', 'U', 'Ü']);
const THICK = new Set(['A', 'I', 'O', 'U']);
const ROUNDED = new Set(['O', 'Ö', 'U', 'Ü']);
const isLetter = c => ALPHABET.includes(c) || EXTRA_KEYS.includes(c);
const lettersOnly = s => [...up(s)].filter(isLetter).join('');
const wordsOf = s => up(s).split(/[^A-ZÇĞIİÖŞÜ]+/u).filter(Boolean);
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = n => Number(n).toLocaleString(TR);
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* depolama kapalı olabilir */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* yok say */ } }
};

/* ------------------------------------------------------------------ 2 */
// İpucu metninin cevabı (veya kökünü) içerip içermediğini denetler. data/validate.js ile aynı kurallar.
const STOP = new Set(['BİR', 'İLE', 'GİBİ', 'DAHA', 'ÇOK', 'VAR', 'YOK', 'OLUR', 'OLMAZ', 'KADAR', 'İÇİN', 'HER', 'DEĞİL', 'AMA', 'SONRA', 'ÖNCE', 'KENDİ']);
function hintLeaks(answer, hint) {
  const Hw = wordsOf(hint), Hflat = lettersOnly(hint), A = lettersOnly(answer);
  if (A.length >= 3 && Hflat.includes(A)) return true;
  for (const w of wordsOf(answer)) {
    if (STOP.has(w)) continue;
    if (w.length >= 6 && Hflat.includes(w.slice(0, 6))) return true;
    if (w.length >= 4) { const stem = w.length >= 6 ? w.slice(0, Math.max(4, w.length - 3)) : w; if (Hw.some(h => h.includes(stem))) return true; }
    else if (w.length === 3 && Hw.includes(w)) return true;
  }
  return false;
}

const Pool = {
  list: [], byKey: new Map(), stats: { raw: 0, unique: 0, rejectedHints: 0, cats: 0 },
  load(raw) {
    this.stats.raw += raw.length;
    for (const r of raw) {
      if (!r || typeof r.a !== 'string' || !r.cat) continue;
      const a = up(r.a.trim()).replace(/\s+/g, ' ');
      const key = lettersOnly(a);
      if (key.length < 3 || this.byKey.has(key)) continue;          // tekilleştirme (Türkçe büyük harf + yalnızca harfler)
      if (![...a].every(c => isLetter(c) || " ,.'-!?".includes(c))) continue;
      const hints = {};
      for (const k of ['sub', 'mean', 'theme']) {
        const h = (r[k] || '').trim();
        if (h && !hintLeaks(a, h)) hints[k] = h; else if (h) this.stats.rejectedHints++;
      }
      const p = { id: r.id || 'x' + this.list.length, key, a, cat: r.cat, d: clamp(r.d | 0 || 2, 1, 4), hints,
        len: key.length, multi: wordsOf(a).length > 1, pattern: a.split(' ').map(w => lettersOnly(w).length).join('-') };
      this.list.push(p); this.byKey.set(key, p);
    }
    this.stats.unique = this.list.length;
    this.stats.cats = new Set(this.list.map(p => p.cat)).size;
  },
  async loadExtra() {
    // İsteğe bağlı genişletme: oyun bir sunucudan açılırsa yanındaki puzzles-extra.json okunur.
    if (location.protocol === 'file:') return 0;
    try { const r = await fetch('puzzles-extra.json', { cache: 'no-store' }); if (!r.ok) return 0; const j = await r.json(); const n = this.list.length; this.load(Array.isArray(j) ? j : []); return this.list.length - n; }
    catch { return 0; }
  }
};

const History = {
  K: 'cf.history.v1',
  data: {},
  load() { this.data = store.get(this.K, {}) || {}; },
  save() { store.set(this.K, this.data); },
  mark(p) { const e = this.data[p.key] || [0, 0]; this.data[p.key] = [Date.now(), e[1] + 1]; this.save(); },
  last(p) { return (this.data[p.key] || [0])[0]; },
  count(p) { return (this.data[p.key] || [0, 0])[1]; },
  seen() { return Object.keys(this.data).filter(k => Pool.byKey.has(k)).length; },
  reset() { this.data = {}; store.del(this.K); }
};

// Tekrarsız, kategori ve zorluk dengeli seçim
function choosePuzzle(roundNo, totalRounds) {
  const prog = totalRounds > 1 ? (roundNo - 1) / (totalRounds - 1) : 0;
  const target = clamp(Math.round(1 + prog * 2.6 + G.adapt), 1, 4);
  let cands = Pool.list.filter(p => !G.sessionUsed.has(p.key));
  if (!cands.length) { G.sessionUsed.clear(); cands = Pool.list.slice(); }
  const noRepeatCat = cands.filter(p => p.cat !== G.lastCat && !G.recentCats.includes(p.cat));
  if (noRepeatCat.length) cands = noRepeatCat;
  else { const c2 = cands.filter(p => p.cat !== G.lastCat); if (c2.length) cands = c2; }
  // Önce hiç görülmemişler; hepsi görülmüşse en uzun süredir görülmeyenler (LRU)
  const fresh = cands.filter(p => !History.last(p));
  if (fresh.length) cands = fresh;
  else { cands = cands.slice().sort((x, y) => History.last(x) - History.last(y)); cands = cands.slice(0, Math.max(10, Math.ceil(cands.length * .15))); }
  const tiers = [p => p.d === target, p => Math.abs(p.d - target) === 1, () => true];
  for (const t of tiers) {
    const c = cands.filter(t);
    if (c.length) {
      // seans içinde az kullanılan kategorilere hafif öncelik
      const minUse = Math.min(...c.map(p => G.catUse[p.cat] || 0));
      const best = c.filter(p => (G.catUse[p.cat] || 0) === minUse);
      return pick(best.length ? best : c);
    }
  }
  return pick(Pool.list);
}

/* ------------------------------------------------------------------ 3 */
const Sound = {
  ctx: null, master: null, sfx: null, musicBus: null, enabled: true, musicOn: true, volume: .7,
  last: {}, active: 0, musicTimer: null, nextNote: 0, step: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 6;
      this.master = this.ctx.createGain(); this.master.gain.value = this.volume;
      this.sfx = this.ctx.createGain(); this.sfx.gain.value = this.enabled ? 1 : 0;
      this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 0;
      this.sfx.connect(this.master); this.musicBus.connect(this.master); this.master.connect(comp); comp.connect(this.ctx.destination);
      this.updateMusic();
    } catch { this.ctx = null; }
  },
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, .05); },
  setEnabled(on) { this.enabled = on; if (this.sfx) this.sfx.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, .03); this.updateMusic(); },
  ok(name, gap = 40) {
    if (!this.ctx || !this.enabled || this.ctx.state !== 'running') return false;
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < gap) return false;   // üst üste binmeyi önle
    if (this.active > 28) return false;
    this.last[name] = now; return true;
  },
  tone(freq, dur, o = {}) {
    const c = this.ctx, t = c.currentTime + (o.when || 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    const peak = o.gain ?? .25;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + (o.attack || .008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(o.bus || this.sfx);
    this.active++; osc.onended = () => { this.active--; };
    osc.start(t); osc.stop(t + dur + .05);
  },
  noise(dur, o = {}) {
    const c = this.ctx, t = c.currentTime + (o.when || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, o.decayPow || 3);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = o.filter || 'bandpass'; f.frequency.value = o.freq || 2400; f.Q.value = o.q || 2;
    const g = c.createGain(); g.gain.value = o.gain ?? .4;
    src.connect(f); f.connect(g); g.connect(o.bus || this.sfx);
    this.active++; src.onended = () => { this.active--; };
    src.start(t);
  },
  // Çark tıkırtısı: hız arttıkça hafif tiz, yavaşladıkça daha tok ve belirgin
  tick(speed) {
    if (!this.ok('tick', 16)) return;
    const s = clamp(speed, 0, 1);
    this.noise(.03, { freq: 1800 + s * 1800, q: 4, gain: .55 - s * .2 });
    this.tone(900 + s * 500, .025, { type: 'square', gain: .05 });
  },
  stop() { if (!this.ok('stop', 200)) return; this.tone(660, .12, { type: 'triangle', gain: .3 }); this.tone(990, .25, { type: 'triangle', gain: .25, when: .09 }); },
  good() { if (!this.ok('good', 70)) return; this.tone(880, .12, { type: 'triangle', gain: .28 }); this.tone(1320, .18, { type: 'sine', gain: .2, when: .05 }); },
  bad() { if (!this.ok('bad', 300)) return; this.tone(220, .35, { type: 'sawtooth', gain: .12, slide: 140 }); this.tone(165, .4, { type: 'square', gain: .06, when: .05, slide: 110 }); },
  solve() { if (!this.ok('solve', 800)) return; [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, .22, { type: 'triangle', gain: .22, when: i * .1 })); },
  bankrupt() { if (!this.ok('bankrupt', 800)) return; this.tone(392, .5, { type: 'sawtooth', gain: .1, slide: 98 }); this.tone(311, .7, { type: 'triangle', gain: .14, when: .18, slide: 73 }); this.noise(.6, { filter: 'lowpass', freq: 300, gain: .25, when: .1, decayPow: 1.5 }); },
  buy() { if (!this.ok('buy', 250)) return; this.tone(1568, .08, { type: 'square', gain: .08 }); this.tone(2093, .2, { type: 'triangle', gain: .2, when: .07 }); this.noise(.12, { freq: 6000, q: .8, gain: .15, when: .05 }); },
  fanfare() { if (!this.ok('fanfare', 1500)) return; [[392, 0], [523, .14], [659, .28], [784, .42], [659, .62], [784, .76], [1047, .95]].forEach(([f, w]) => { this.tone(f, .3, { type: 'sawtooth', gain: .07, when: w }); this.tone(f * 2, .3, { type: 'triangle', gain: .1, when: w }); }); },
  whoosh() { if (!this.ok('whoosh', 300)) return; this.noise(.5, { filter: 'bandpass', freq: 900, q: .6, gain: .3, decayPow: 1 }); },
  special() { if (!this.ok('special', 300)) return; [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, .16, { type: 'square', gain: .07, when: i * .06 })); },
  // Hafif stüdyo müziği: lookahead zamanlayıcıyla basit bas + arpej; final turunda hızlanır
  updateMusic() {
    if (!this.ctx) return;
    const want = this.enabled && this.musicOn;
    this.musicBus.gain.setTargetAtTime(want ? (G.spinning ? .05 : .14) : 0, this.ctx.currentTime, .3);
    if (want && !this.musicTimer) { this.nextNote = this.ctx.currentTime + .1; this.musicTimer = setInterval(() => this.schedule(), 40); }
    if (!want && this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  },
  schedule() {
    const c = this.ctx; if (!c || c.state !== 'running') return;
    const bpm = G.final ? 138 : 108, sp = 60 / bpm / 2;
    const prog = [[48, 55, 60, 64], [45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59]];
    while (this.nextNote < c.currentTime + .2) {
      const bar = Math.floor(this.step / 8) % 4, chord = prog[bar], s = this.step % 8;
      const hz = m => 440 * Math.pow(2, (m - 69) / 12);
      const when = this.nextNote - c.currentTime;
      if (s % 4 === 0) this.tone(hz(chord[0] - 12), sp * 1.8, { type: 'triangle', gain: .35, when, bus: this.musicBus });
      const arp = [1, 2, 3, 2, 1, 3, 2, 3][s];
      this.tone(hz(chord[arp] + 12), sp * .9, { type: G.final ? 'square' : 'sine', gain: G.final ? .06 : .12, when, bus: this.musicBus });
      if (G.final && s % 2 === 1) this.noise(.04, { freq: 7000, q: 1, gain: .1, when, bus: this.musicBus });
      this.nextNote += sp; this.step++;
    }
  }
};

/* ------------------------------------------------------------------ 4 */
const SLICES = [
  { kind: 'val', v: 500, c: '#ff3fa4' }, { kind: 'val', v: 300, c: '#2f7bff' }, { kind: 'val', v: 600, c: '#2bd96b' },
  { kind: 'val', v: 200, c: '#19e3d0' }, { kind: 'val', v: 750, c: '#8b3dff' }, { kind: 'val', v: 400, c: '#ffb627' },
  { kind: 'bankrupt', label: 'İFLAS', icon: '💀', c: '#111111' }, { kind: 'val', v: 1000, c: '#ffe14a' }, { kind: 'val', v: 300, c: '#ff5a36' },
  { kind: 'pass', label: 'PAS', icon: '✋', c: '#e9e4ff' }, { kind: 'val', v: 100, c: '#2f7bff' }, { kind: 'val', v: 500, c: '#19e3d0' },
  { kind: 'val', v: 200, c: '#8b3dff' }, { kind: 'val', v: 600, c: '#ffb627' }
];
const SLICE_DEG = 360 / SLICES.length;
// Yan yana iki dilim (ilk ile son dahil) asla aynı değeri veya rengi taşımasın
const sliceKey = sl => sl.kind === 'val' ? sl.v : sl.kind;
SLICES.forEach((sl, i) => { const nx = SLICES[(i + 1) % SLICES.length]; if (sliceKey(sl) === sliceKey(nx) || sl.c === nx.c) console.error('Komşu dilimler aynı:', i, sl, nx); });

const Wheel = {
  rot: 0, spinning: false, canvas: null,
  // Görsel açıdan, işaretçinin (tepe) altındaki dilim: yerel açı = (-rot) mod 360
  indexAt(rot) { const local = (((-rot) % 360) + 360) % 360; return Math.floor(local / SLICE_DEG) % SLICES.length; },
  // Hedef dilim için son açıyı hesapla: en az `turns` tam tur + dilim içinde rastgele konum
  targetRotation(from, index, turns, jitter) {
    const local = index * SLICE_DEG + SLICE_DEG / 2 + jitter * SLICE_DEG * .38;
    const delta = ((((-local) - from) % 360) + 360) % 360;
    return from + turns * 360 + delta;
  },
  // Konum eğrisi: kısa hızlanma (doğrusal artan hız), ardından karesel azalan hız
  ease(t, a = .09) {
    const total = a / 2 + (1 - a) / 3;
    if (t < a) return (t * t / (2 * a)) / total;
    const u = (1 - t) / (1 - a);
    return (a / 2 + (1 - a) / 3 * (1 - u * u * u)) / total;
  },
  speedAt(t, a = .09) { return t < a ? t / a : Math.pow((1 - t) / (1 - a), 2); },
  draw() {
    const cv = this.canvas, ctx = cv.getContext('2d'), S = cv.width, c = S / 2, R = c - 4;
    ctx.clearRect(0, 0, S, S);
    SLICES.forEach((sl, i) => {
      const a0 = (-90 + i * SLICE_DEG) * Math.PI / 180, a1 = a0 + SLICE_DEG * Math.PI / 180, mid = (a0 + a1) / 2;
      const g = ctx.createRadialGradient(c, c, R * .15, c, c, R);
      g.addColorStop(0, shade(sl.c, .35)); g.addColorStop(.7, sl.c); g.addColorStop(1, shade(sl.c, -.25));
      ctx.beginPath(); ctx.moveTo(c, c); ctx.arc(c, c, R, a0, a1); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); ctx.translate(c, c); ctx.rotate(mid);
      const dark = ['#e9e4ff', '#ffe14a', '#19e3d0', '#ffb627', '#ff8fd0', '#2bd96b'].includes(sl.c);
      ctx.fillStyle = sl.kind === 'bankrupt' ? '#ff3b5c' : dark ? '#24104f' : '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 4;
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      if (sl.kind === 'val') {
        ctx.font = `900 ${sl.v >= 1000 ? 40 : 44}px Bungee, "Arial Black", sans-serif`;
        ctx.fillText(String(sl.v), R - 20, 2);
      } else {
        ctx.font = `900 ${sl.label.length > 4 ? 28 : 32}px Bungee, "Arial Black", sans-serif`;
        ctx.fillText(sl.label, R - 20, 2);
        ctx.font = '26px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; ctx.shadowBlur = 0;
        ctx.fillText(sl.icon, R * .42, 2);
      }
      ctx.restore();
      // çivi
      const px = c + Math.cos(a0) * (R - 8), py = c + Math.sin(a0) * (R - 8);
      ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fillStyle = '#fff3b0'; ctx.fill(); ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = 2; ctx.stroke();
    });
    // 3B parlama ve iç gölge
    const hl = ctx.createRadialGradient(c * .7, c * .55, R * .05, c, c, R);
    hl.addColorStop(0, 'rgba(255,255,255,.35)'); hl.addColorStop(.45, 'rgba(255,255,255,.05)'); hl.addColorStop(.9, 'rgba(0,0,0,.05)'); hl.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.fillStyle = hl; ctx.fill();
  },
  apply() { this.canvas.style.transform = `rotate(${this.rot}deg)`; },
  // Kurucunun hesapladığı açıdan açıya, herkes aynı süre ve eğriyle çevirir (rAF arka planda durursa setTimeout güvencesi var)
  animate(from, to, dur) {
    this.animToken = (this.animToken || 0) + 1;
    const tok = this.animToken;
    return new Promise(resolve => {
      const t0 = performance.now();
      let lastPeg = Math.floor(from / SLICE_DEG), done = false;
      this.spinning = true;
      const finish = () => { if (done || tok !== this.animToken) return; done = true; this.rot = to; this.apply(); this.spinning = false; resolve(this.indexAt(to)); };
      const frame = now => {
        if (done || tok !== this.animToken) return;
        const t = clamp((now - t0) / Math.max(1, dur), 0, 1);
        this.rot = from + (to - from) * this.ease(t);
        this.apply();
        const peg = Math.floor(this.rot / SLICE_DEG);
        if (peg !== lastPeg) {
          lastPeg = peg;
          Sound.tick(this.speedAt(t));
          const p = $('pointer'); p.classList.remove('flick'); void p.offsetWidth; p.classList.add('flick');
        }
        if (t < 1) requestAnimationFrame(frame); else finish();
      };
      requestAnimationFrame(frame);
      setTimeout(finish, dur + 400);
    });
  },
  stop() { this.animToken = (this.animToken || 0) + 1; this.spinning = false; }
};
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => clamp(Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)), 0, 255);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

/* ------------------------------------------------------------------ 5 */
const FX = {
  cv: null, ctx: null, parts: [], running: false,
  scale() { return { low: .3, normal: 1, high: 1.8 }[G.settings.anim] * (matchMedia('(prefers-reduced-motion: reduce)').matches ? .35 : 1); },
  resize() { if (!this.cv) return; const dpr = Math.min(2, window.devicePixelRatio || 1); this.cv.width = innerWidth * dpr; this.cv.height = innerHeight * dpr; this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); },
  confetti(n = 140) {
    const cols = ['#ff3fa4', '#ffe14a', '#19e3d0', '#2f7bff', '#8b3dff', '#ffb627', '#2bff88'];
    n = Math.round(n * this.scale());
    for (let i = 0; i < n; i++) this.parts.push({ x: innerWidth * rand(.1, .9), y: rand(-80, -10), vx: rand(-2.5, 2.5), vy: rand(2, 6), w: rand(6, 11), h: rand(10, 18), r: rand(0, 6), vr: rand(-.2, .2), c: pick(cols), life: rand(160, 260), type: 'c' });
    this.go();
  },
  burst(x, y, n = 40, gold = true) {
    n = Math.round(n * this.scale());
    for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2), s = rand(2, 8); this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, r: rand(2, 4.5), c: gold ? pick(['#ffe14a', '#ffb627', '#fff3b0']) : pick(['#19e3d0', '#ff3fa4']), life: rand(40, 80), type: 'g' }); }
    this.go();
  },
  go() { if (!this.running) { this.running = true; requestAnimationFrame(() => this.loop()); } },
  loop() {
    const ctx = this.ctx; ctx.clearRect(0, 0, innerWidth, innerHeight);
    this.parts = this.parts.filter(p => p.life-- > 0 && p.y < innerHeight + 40);
    for (const p of this.parts) {
      p.x += p.vx; p.y += p.vy;
      if (p.type === 'c') { p.vy = Math.min(p.vy + .05, 5); p.vx *= .99; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2 * Math.abs(Math.cos(p.r * 2)), p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 1); ctx.restore(); }
      else { p.vy += .18; p.vx *= .97; ctx.globalAlpha = clamp(p.life / 50, 0, 1); ctx.shadowColor = p.c; ctx.shadowBlur = 10; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1; }
    }
    if (this.parts.length) requestAnimationFrame(() => this.loop()); else { this.running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }
};
let bannerTimer = null;
function banner(text, cls = '') {
  const b = $('banner'); b.className = 'banner'; b.textContent = text; void b.offsetWidth;
  b.className = 'banner show ' + cls;
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { b.className = 'banner'; }, 1800);
}
function flash(kind) { document.body.classList.remove('flash-good', 'flash-bad'); void document.body.offsetWidth; document.body.classList.add('flash-' + kind); setTimeout(() => document.body.classList.remove('flash-' + kind), 950); }
function centerOf(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }


// Yapısal ipuçları: cevabın harflerinden hesaplanır ve doğruluğu fonksiyonla kanıtlanır.
const halfRepeat = s => { const seen = new Set(); for (const c of s) { if (seen.has(c)) return true; seen.add(c); } return false; };
function structuralFacts(p) {
  const L = p.key, n = L.length, h = Math.ceil(n / 2), A = L.slice(0, h), B = L.slice(h);
  const freq = {}; for (const c of L) freq[c] = (freq[c] || 0) + 1;
  const maxF = Math.max(...Object.values(freq)), distinct = Object.keys(freq).length;
  const vow = [...L].filter(c => VOWELS.has(c)), thick = vow.filter(c => THICK.has(c)).length, rounded = vow.some(c => ROUNDED.has(c));
  const facts = { zone: [], freq: [], elim: [] };
  // Harf Bölgesi
  facts.zone.push(halfRepeat(A)
    ? { text: 'Cevabın ilk yarısında aynı harf en az iki kez geçiyor.', test: q => halfRepeat(q.slice(0, Math.ceil(q.length / 2))) }
    : { text: 'Cevabın ilk yarısındaki harflerin hepsi birbirinden farklı.', test: q => !halfRepeat(q.slice(0, Math.ceil(q.length / 2))) });
  if (B.length >= 3) facts.zone.push(halfRepeat(B)
    ? { text: 'Cevabın ikinci yarısında aynı harf en az iki kez geçiyor.', test: q => halfRepeat(q.slice(Math.ceil(q.length / 2))) }
    : { text: 'Cevabın ikinci yarısındaki harflerin hepsi birbirinden farklı.', test: q => !halfRepeat(q.slice(Math.ceil(q.length / 2))) });
  const lastV = VOWELS.has(L[n - 1]);
  facts.zone.push({ text: `Cevabın son harfi bir ${lastV ? 'ünlü' : 'ünsüz'}.`, test: q => VOWELS.has(q[q.length - 1]) === lastV });
  // Harf Frekansı
  if (maxF >= 3) facts.freq.push({ text: `Cevapta en az bir harf ${maxF >= 4 ? 'dört ya da daha fazla' : 'üç ya da daha fazla'} kez geçiyor.`, test: q => { const f = {}; for (const c of q) f[c] = (f[c] || 0) + 1; return Math.max(...Object.values(f)) >= Math.min(maxF, 4); } });
  else if (maxF === 2) facts.freq.push({ text: 'Cevapta en az bir harf birden fazla kez kullanılmış, ama hiçbir harf üç kez geçmiyor.', test: q => { const f = {}; for (const c of q) f[c] = (f[c] || 0) + 1; return Math.max(...Object.values(f)) === 2; } });
  else facts.freq.push({ text: 'Cevaptaki bütün harfler birbirinden farklı; hiçbir harf tekrar etmiyor.', test: q => !halfRepeat(q) });
  if (n >= 7) facts.freq.push({ text: `Cevapta toplam ${distinct} farklı harf kullanılıyor.`, test: q => new Set(q).size === distinct });
  // Eleme Yardımı (kesin harf söylemez, yalnızca harf türü önerir)
  const ratio = vow.length / n;
  facts.elim.push(ratio >= .45
    ? { text: 'Ünlü harfler bu cevapta oldukça bol; bir ünlü almak mantıklı olabilir.', test: q => [...q].filter(c => VOWELS.has(c)).length / q.length >= .45 }
    : { text: 'Bu cevapta ünsüzler ağır basıyor; çarkı çevirip ünsüz denemek daha verimli olabilir.', test: q => [...q].filter(c => VOWELS.has(c)).length / q.length < .45 });
  if (vow.length >= 2) {
    const thickMost = thick > vow.length / 2, thinMost = thick < vow.length / 2;
    if (thickMost) facts.elim.push({ text: 'Cevaptaki ünlülerin çoğu kalın ünlü (A, I, O, U grubundan).', test: q => { const v = [...q].filter(c => VOWELS.has(c)); return v.filter(c => THICK.has(c)).length > v.length / 2; } });
    if (thinMost) facts.elim.push({ text: 'Cevaptaki ünlülerin çoğu ince ünlü (E, İ, Ö, Ü grubundan).', test: q => { const v = [...q].filter(c => VOWELS.has(c)); return v.filter(c => THICK.has(c)).length < v.length / 2; } });
  }
  facts.elim.push({ text: rounded ? 'Cevapta en az bir yuvarlak ünlü (O, Ö, U, Ü grubundan) var.' : 'Cevapta yuvarlak ünlü (O, Ö, U, Ü) yok; düz ünlüler denenebilir.', test: q => [...q].some(c => ROUNDED.has(c)) === rounded });
  // Her gerçek, cevabın kendisi üzerinde programatik olarak doğrulanır
  for (const k in facts) facts[k] = facts[k].filter(f => f.test(L) && !hintLeaks(p.a, f.text));   // şablon metin bile cevabın bir kelimesini içermesin
  return facts;
}

const PRODUCTS = [
  { type: 'sub', name: 'Kategori Derinleştirme', level: 'HAFİF', lc: 'var(--teal)', base: 100, desc: 'Kategoriyi biraz daha ayrıntılı hale getirir.' },
  { type: 'zone', name: 'Harf Bölgesi', level: 'ORTA', lc: 'var(--electric)', base: 150, desc: 'Cevabın bir bölümündeki harf düzeni hakkında doğrulanmış bilgi.' },
  { type: 'mean', name: 'Anlam İpucu', level: 'ORTA', lc: 'var(--violet)', base: 200, desc: 'Cevabın anlamı veya kullanım amacı hakkında dolaylı bilgi.' },
  { type: 'freq', name: 'Harf Frekansı', level: 'ZORLAYICI', lc: 'var(--pink)', base: 250, desc: 'Harflerin tekrar edip etmediğini bildirir, harf söylemez.' },
  { type: 'elim', name: 'Eleme Yardımı', level: 'ZORLAYICI', lc: 'var(--pink)', base: 300, desc: 'Hangi harf türünü denemenin mantıklı olduğunu önerir.' },
  { type: 'theme', name: 'Tema Bilgisi', level: 'ORTA', lc: 'var(--gold)', base: 350, desc: 'Bulmacanın bağlamına dair ilginç bir bilgi.' },
  { type: 'coupon', name: 'Ünlü Kuponu', level: 'JETON', lc: 'var(--yellow)', base: 160, desc: 'Bir sonraki ünlü alımın ücretsiz olur. Kullanana kadar saklanır.' }
];

// Bulmaca için güvenli ipucu teklifleri üretir; kontrolden geçemeyen ürün yerine başka ürün seçilir
function buildOffers(p, prevPrices = {}) {
  const facts = structuralFacts(p);
  const short = p.len <= 4;
  const content = {};
  for (const k of ['sub', 'mean', 'theme']) if (p.hints[k] && !hintLeaks(p.a, p.hints[k])) content[k] = { text: p.hints[k] };
  if (!short) {
    for (const k of ['zone', 'freq']) if (facts[k].length) content[k] = pick(facts[k]);
  }
  if (facts.elim.length) content.elim = pick(facts.elim);
  // Birleşik sızıntı kontrolü: yapısal ipuçları + kelime düzeni havuzda tek adayı bırakıyorsa en belirleyici olanı çıkar
  const structKeys = ['freq', 'zone', 'elim'].filter(k => content[k]);
  const samePattern = Pool.list.filter(q => q.pattern === p.pattern);
  const survivors = () => samePattern.filter(q => structKeys.every(k => content[k].test(q.key))).length;
  while (structKeys.length && samePattern.length > 1 && survivors() <= 1) { const k = structKeys.shift(); delete content[k]; }
  // Kısa cevaplarda anlam + tema + kategori birlikte satılmaz
  if (short && content.sub && content.mean && content.theme) delete content.theme;
  let types = shuffle(Object.keys(content));
  const semantic = types.filter(t => ['sub', 'mean', 'theme'].includes(t));
  const n = randInt(3, 5);
  let chosen = [];
  if (semantic.length) chosen.push(semantic[0]);
  for (const t of types) if (chosen.length < n - 1 && !chosen.includes(t)) chosen.push(t);
  if (chosen.length < n) chosen.push('coupon');
  chosen = chosen.slice(0, 5);
  const order = PRODUCTS.map(x => x.type);
  chosen.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return chosen.map((t, i) => {
    const prod = PRODUCTS.find(x => x.type === t);
    let price;
    for (let k = 0; k < 4; k++) { price = Math.round(prod.base * rand(.8, 1.3) / 10) * 10; if (price !== prevPrices[t]) break; }
    const sale = price < prod.base;
    return { oid: `${p.key.slice(0, 4)}-${t}-${i}-${Date.now() % 100000}`, ...prod, price, sale, text: t === 'coupon' ? null : content[t].text };
  });
}


// Ürün görselleri (özgün, satır içi SVG)
const COIN = '<svg class="coin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#c77700"/><circle cx="12" cy="11.2" r="10" fill="#ffb627"/><circle cx="12" cy="11.2" r="7" fill="#ffe14a"/><path d="M9 7.5h4.2a2.6 2.6 0 0 1 0 5.2H10.6V15" stroke="#a35b00" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ART = {
  sub: `<svg viewBox="0 0 120 96" aria-hidden="true"><path d="M14 26h30l8 8h52v46a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="#c77700"/><path d="M20 36h80v10H20z" fill="#fff8e1"/><path d="M24 30h80v8H24z" fill="#ffffff" opacity=".85"/><path d="M14 44h90v36a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="#ffb627"/><path d="M14 44h90v6H14z" fill="#ffd34a"/><circle cx="76" cy="56" r="17" fill="#c8fbf5" stroke="#1b1036" stroke-width="6"/><path d="M68 50a9 9 0 0 1 9-4" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M88 68l14 14" stroke="#1b1036" stroke-width="9" stroke-linecap="round"/><path d="M88 68l14 14" stroke="#ff3fa4" stroke-width="4" stroke-linecap="round"/></svg>`,
  zone: `<svg viewBox="0 0 120 96" aria-hidden="true"><rect x="2" y="26" width="50" height="38" rx="8" fill="#ffe14a" opacity=".35"/><g font-family="Bungee, Arial Black, sans-serif" font-size="16" text-anchor="middle"><rect x="6" y="30" width="19" height="28" rx="4" fill="#fffaf0"/><text x="15.5" y="50" fill="#1b1036">?</text><rect x="29" y="30" width="19" height="28" rx="4" fill="#fffaf0"/><text x="38.5" y="50" fill="#1b1036">?</text></g><rect x="52" y="30" width="19" height="28" rx="4" fill="#19c9b9"/><rect x="75" y="30" width="19" height="28" rx="4" fill="#19c9b9"/><rect x="98" y="30" width="19" height="28" rx="4" fill="#19c9b9"/><path d="M5 68v9h45v-9" stroke="#ffe14a" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M27.5 77v8" stroke="#ffe14a" stroke-width="4" stroke-linecap="round"/><path d="M60 14l4 6 4-6M84 10l4 8 4-8" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/></svg>`,
  mean: `<svg viewBox="0 0 120 96" aria-hidden="true"><circle cx="60" cy="38" r="32" fill="#ffe14a" opacity=".22"/><g stroke="#ffe14a" stroke-width="4" stroke-linecap="round"><path d="M20 38h-9M109 38h-9M31 12l-6-6M89 12l6-6M31 64l-6 6M89 64l6 6"/></g><path d="M60 12a25 25 0 0 0-15 45V66h30v-9a25 25 0 0 0-15-45z" fill="#ffe14a"/><path d="M50 22a16 16 0 0 1 9-4" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M52 52l8-12 8 12" stroke="#ff8a00" stroke-width="3.5" fill="none" stroke-linejoin="round"/><rect x="45" y="67" width="30" height="7" rx="3.5" fill="#d9ccff"/><rect x="47" y="76" width="26" height="7" rx="3.5" fill="#a395db"/><rect x="53" y="85" width="14" height="5" rx="2.5" fill="#7a6cb8"/></svg>`,
  freq: `<svg viewBox="0 0 120 96" aria-hidden="true"><path d="M10 84h100" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".8"/><rect x="14" y="58" width="18" height="26" rx="4" fill="#ff3fa4"/><rect x="38" y="32" width="18" height="52" rx="4" fill="#ff8fd0"/><rect x="62" y="46" width="18" height="38" rx="4" fill="#ff3fa4"/><rect x="86" y="20" width="18" height="64" rx="4" fill="#ffe14a"/><rect x="86" y="20" width="18" height="8" rx="4" fill="#fff3a0"/><circle cx="95" cy="10" r="9" fill="#19e3d0"/><text x="95" y="14.5" text-anchor="middle" font-family="Bungee, Arial Black, sans-serif" font-size="11" fill="#12052e">×2</text><path d="M23 52l24-24 24 14 24-28" stroke="#ffffff" stroke-width="3" fill="none" stroke-dasharray="4 5" stroke-linecap="round"/></svg>`,
  elim: `<svg viewBox="0 0 120 96" aria-hidden="true"><circle cx="54" cy="52" r="36" fill="#ff3b5c"/><circle cx="54" cy="52" r="27" fill="#fffaf0"/><circle cx="54" cy="52" r="18" fill="#ff3b5c"/><circle cx="54" cy="52" r="9" fill="#fffaf0"/><circle cx="54" cy="52" r="3.5" fill="#ff3b5c"/><path d="M56 50L100 14" stroke="#1b1036" stroke-width="5" stroke-linecap="round"/><path d="M98 6l10 2-4 6zM104 18l6-8 4 10z" fill="#19e3d0"/><path d="M96 10l14 8" stroke="#19e3d0" stroke-width="4" stroke-linecap="round"/></svg>`,
  theme: `<svg viewBox="0 0 120 96" aria-hidden="true"><path d="M60 34C47 26 28 26 12 30v54c16-4 35-4 48 4z" fill="#fffaf0"/><path d="M60 34c13-8 32-8 48-4v54c-16-4-35-4-48 4z" fill="#eadfc4"/><path d="M60 34v54" stroke="#b9a8e6" stroke-width="3"/><g stroke="#a395db" stroke-width="3" stroke-linecap="round"><path d="M22 44h28M22 54h28M22 64h20M70 44h28M70 54h28M70 64h20"/></g><path d="M12 84c16-4 35-4 48 4 13-8 32-8 48-4v4c-16-4-35-4-48 4-13-8-32-8-48-4z" fill="#8b3dff"/><path d="M60 3l5 10.2 11.2 1.6-8.1 7.9 1.9 11.2L60 28.6l-10 5.3 1.9-11.2-8.1-7.9L55 13.2z" fill="#ffe14a" stroke="#ff8a00" stroke-width="2" stroke-linejoin="round"/></svg>`,
  coupon: `<svg viewBox="0 0 120 96" aria-hidden="true"><g transform="rotate(-9 60 48)"><path d="M12 26h96v16a7 7 0 0 0 0 14v16H12V56a7 7 0 0 0 0-14z" fill="#ffe14a"/><path d="M12 26h96v6H12z" fill="#fff3a0"/><path d="M80 30v40" stroke="#ff8a00" stroke-width="3" stroke-dasharray="5 4"/><text x="46" y="55" text-anchor="middle" font-family="Bungee, Arial Black, sans-serif" font-size="17" fill="#3a1500">ÜNLÜ</text><circle cx="95" cy="49" r="9" fill="#ff3fa4"/><path d="M91 49l3 3 5-6" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g><path d="M20 82l3-7 3 7-7-3 8 0z" fill="#ffffff" opacity=".7"/></svg>`
};
const initial = name => esc((name || '?').trim().charAt(0).toLocaleUpperCase(TR) || '?');


/* ------------------------------------------------------------------ 6
   Sabitler, ayarlar ve kurucu tarafı seçim hafızası                        */
const COLORS = ['#19e3d0', '#ff3fa4', '#ffe14a', '#ff8a00'];
const MODES = { quick: { rounds: 3, vowelCost: 100, label: 'Hızlı oyun' }, std: { rounds: 5, vowelCost: 200, label: 'Standart' }, long: { rounds: 8, vowelCost: 250, label: 'Uzun yarışma' } };
const SOLO_LIVES = 5, REVEAL_MS = 320, MAX_PLAYERS = 4;
const defaultSettings = { volume: 70, sound: true, music: true, anim: 'normal', rounds: 0, clueMode: 'auto' };
// G: ayarlar + bulmaca seçim hafızası (yalnızca oyunu yöneten cihazda) + arayüz bayrakları
const G = {
  settings: Object.assign({}, defaultSettings, store.get('cf.settings.v1', {})),
  setup: { count: 2, length: 'std', names: ['Ayşe', 'Mehmet', 'Zeynep', 'Can'] },
  sessionUsed: new Set(), lastCat: null, recentCats: [], catUse: {}, adapt: 0,
  spinning: false, final: false
};
const sess = {
  get(k) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* yok say */ } },
  del(k) { try { sessionStorage.removeItem(k); } catch { /* yok say */ } }
};
const rid = n => { const a = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = ''; const r = new Uint8Array(n); (crypto.getRandomValues ? crypto.getRandomValues(r) : r.forEach((_, i) => { r[i] = Math.random() * 256; })); r.forEach(x => { s += a[x % a.length]; }); return s; };
const cleanName = s => String(s || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);

/* ------------------------------------------------------------------ 7
   Küçük MQTT 3.1.1 istemcisi (WebSocket üzerinden, dış kütüphane yok)      */
const te = new TextEncoder(), td = new TextDecoder();
const cat8 = arr => { let n = 0; arr.forEach(a => { n += a.length; }); const o = new Uint8Array(n); let k = 0; arr.forEach(a => { o.set(a, k); k += a.length; }); return o; };
const mqStr = s => { const b = te.encode(s); const o = new Uint8Array(2 + b.length); o[0] = b.length >> 8; o[1] = b.length & 255; o.set(b, 2); return o; };
const u16 = n => Uint8Array.from([n >> 8, n & 255]);
const mqLen = n => { const out = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; out.push(d); } while (n > 0); return Uint8Array.from(out); };
const mqPacket = (h, parts) => { const body = cat8(parts); return cat8([Uint8Array.from([h]), mqLen(body.length), body]); };

class MiniMQTT {
  constructor(url) { this.url = url; this.ws = null; this.buf = new Uint8Array(0); this.pid = 0; this.h = {}; this.connected = false; this.userClosed = false; this.cid = 'cf' + rid(14); this.pingT = null; this._connack = null; }
  on(ev, fn) { this.h[ev] = fn; }
  fire(ev, ...a) { const f = this.h[ev]; if (f) { try { f(...a); } catch (e) { console.error(e); } } }
  connect(timeout = 7000) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const done = (err) => { if (settled) return; settled = true; clearTimeout(timer); if (err) { try { this.ws && this.ws.close(); } catch { /* */ } reject(err); } else { this.connected = true; this.startPing(); resolve(this); } };
      const timer = setTimeout(() => done(new Error('zaman aşımı')), timeout);
      let ws;
      try { ws = new WebSocket(this.url, ['mqtt']); } catch (e) { done(e); return; }
      ws.binaryType = 'arraybuffer';
      this.ws = ws; this.buf = new Uint8Array(0);
      this._connack = ok => done(ok ? null : new Error('sunucu reddetti'));
      ws.onopen = () => { try { ws.send(mqPacket(0x10, [mqStr('MQTT'), Uint8Array.from([4, 0x02, 0, 60]), mqStr(this.cid)])); } catch (e) { done(e); } };
      ws.onmessage = e => { if (e.data instanceof ArrayBuffer) this.onData(new Uint8Array(e.data)); };
      ws.onerror = () => done(new Error('bağlantı hatası'));
      ws.onclose = () => { const was = this.connected; this.connected = false; this.stopPing(); if (!settled) done(new Error('bağlantı kapandı')); else if (was && !this.userClosed) this.fire('lost'); };
    });
  }
  raw(bytes) { if (this.ws && this.ws.readyState === 1) { this.ws.send(bytes); return true; } return false; }
  nextId() { this.pid = this.pid % 65535 + 1; return this.pid; }
  subscribe(topic, qos = 1) { return this.raw(mqPacket(0x82, [u16(this.nextId()), mqStr(topic), Uint8Array.from([qos])])); }
  publish(topic, text, { qos = 1, retain = false } = {}) {
    const parts = [mqStr(topic)]; if (qos > 0) parts.push(u16(this.nextId())); parts.push(te.encode(text));
    return this.raw(mqPacket(0x30 | (qos << 1) | (retain ? 1 : 0), parts));
  }
  startPing() { this.stopPing(); this.pingT = setInterval(() => this.raw(Uint8Array.from([0xC0, 0])), 25000); }
  stopPing() { if (this.pingT) clearInterval(this.pingT); this.pingT = null; }
  close() { this.userClosed = true; this.stopPing(); try { this.raw(Uint8Array.from([0xE0, 0])); this.ws && this.ws.close(); } catch { /* */ } this.connected = false; }
  onData(chunk) {
    this.buf = this.buf.length ? cat8([this.buf, chunk]) : chunk;
    for (;;) {
      const b = this.buf; if (b.length < 2) return;
      let mult = 1, len = 0, i = 1, byte;
      do { if (i >= b.length) return; byte = b[i++]; len += (byte & 127) * mult; mult *= 128; if (i > 5) { this.buf = new Uint8Array(0); return; } } while (byte & 128);
      if (b.length < i + len) return;
      const head = b[0], body = b.subarray(i, i + len);
      this.buf = b.slice(i + len);
      this.handle(head >> 4, head & 15, body);
    }
  }
  handle(type, flags, body) {
    if (type === 2) { if (this._connack) this._connack(body[1] === 0); return; }
    if (type === 3) {
      const qos = (flags >> 1) & 3, tl = (body[0] << 8) | body[1];
      const topic = td.decode(body.subarray(2, 2 + tl));
      let p = 2 + tl, id = 0;
      if (qos > 0) { id = (body[p] << 8) | body[p + 1]; p += 2; }
      if (qos === 1) this.raw(cat8([Uint8Array.from([0x40, 2]), u16(id)]));
      if (qos === 2) this.raw(cat8([Uint8Array.from([0x50, 2]), u16(id)]));
      this.fire('message', topic, td.decode(body.subarray(p)));
      return;
    }
    if (type === 6) { const id = (body[0] << 8) | body[1]; this.raw(cat8([Uint8Array.from([0x70, 2]), u16(id)])); }
    // PUBACK(4), PUBREC(5), SUBACK(9), UNSUBACK(11), PINGRESP(13): işlem gerekmez
  }
}

/* ------------------------------------------------------------------ 8
   Ağ katmanı: oda kur, katıl, mesaj yönlendirme, yeniden bağlanma          */
const DEFAULT_BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
const NS = 'carkifelek-studyo/v1/';
const CODE_ABC = 'ABCDEFGHJKLMNPRSTUVYZ23456789';
const Net = {
  role: 'local', mq: null, code: null, idx: 0, base: '', hostId: null, status: 'off', topics: [], infoWait: null, reconnecting: false,
  myId: (() => { let id = sess.get('cf.cid'); if (!id) { id = rid(10); sess.set('cf.cid', id); } return id; })(),
  brokers() { let q = null; try { q = new URLSearchParams(location.search).get('broker'); } catch { /* */ } return q ? [q] : DEFAULT_BROKERS; },
  genCode() { let s = ''; const r = new Uint8Array(5); crypto.getRandomValues(r); r.forEach(x => { s += CODE_ABC[x % CODE_ABC.length]; }); return s; },
  normCode(s) { return String(s || '').toLocaleUpperCase('en-US').replace(/[^A-Z0-9]/g, '').slice(0, 5); },
  setStatus(s) { this.status = s; UI.netStatus(s); },
  async connectAny(order, probe) {
    const list = this.brokers();
    for (const i of order.filter(i => i < list.length)) {
      let mq;
      try { mq = new MiniMQTT(list[i]); await mq.connect(7000); }
      catch (e) { console.warn('Aracı başarısız', list[i], e.message); continue; }
      if (!probe || await probe(mq, i)) return { mq, i };
      mq.close();
    }
    return null;
  },
  wire(mq) {
    this.mq = mq;
    mq.on('message', (t, p) => this.onMessage(t, p));
    mq.on('lost', () => this.reconnect());
  },
  sub(topic) { if (!this.topics.includes(topic)) this.topics.push(topic); this.mq && this.mq.subscribe(topic, 1); },
  async host(code) {
    this.code = code || this.genCode(); this.base = NS + this.code + '/';
    const order = [0, 1, 2].map((_, k) => (k + (this.idx || 0)) % 3);
    const r = await this.connectAny(order);
    if (!r) throw new Error('Oyun sunucusuna bağlanılamadı. İnternet bağlantını kontrol et.');
    this.idx = r.i; this.role = 'host'; this.topics = []; this.wire(r.mq);
    this.sub(this.base + 'h');
    this.setStatus('ok');
  },
  async join(code, hint = 0) {
    this.code = code; this.base = NS + code + '/';
    const n = this.brokers().length, order = Array.from({ length: n }, (_, k) => (k + hint) % n);
    const r = await this.connectAny(order, (mq, i) => new Promise(res => {
      const t = setTimeout(() => res(false), 4000);
      mq.on('message', (topic, payload) => {
        if (topic !== this.base + 'i' || !payload) return;
        try { const info = JSON.parse(payload); if (info && info.host) { clearTimeout(t); this.hostId = info.host; res(true); } } catch { /* */ }
      });
      mq.subscribe(this.base + 'i', 1);
    }));
    if (!r) throw new Error(`"${code}" kodlu oda bulunamadı. Kodu kontrol et ya da kurucudan yeni link iste.`);
    this.idx = r.i; this.role = 'client'; this.topics = [this.base + 'i']; this.wire(r.mq);
    this.sub(this.base + 'c/' + this.myId);
    this.setStatus('ok');
  },
  async reconnect() {
    if (this.reconnecting || this.role === 'local') return;
    this.reconnecting = true; this.setStatus('wait');
    for (let k = 0; this.role !== 'local'; k++) {
      try {
        const mq = new MiniMQTT(this.brokers()[this.idx]); await mq.connect(7000);
        if (this.role === 'local') { mq.close(); break; }
        this.wire(mq); this.topics.forEach(t => mq.subscribe(t, 1));
        this.setStatus('ok'); this.reconnecting = false;
        if (this.role === 'host') Host.onReconnect(); else Client.onReconnect();
        return;
      } catch { await sleep(Math.min(8000, 1200 + k * 1500)); }
    }
    this.reconnecting = false;
  },
  stats: { rx: 0, tx: 0, acts: 0 },
  onMessage(topic, payload) {
    this.stats.rx++;
    if (topic === this.base + 'i') { if (this.role === 'client' && payload === '') Client.onMessage({ t: 'closed' }); return; }
    let m; try { m = JSON.parse(payload); } catch { return; }
    if (topic === this.base + 'h' && this.role === 'host') Host.onMessage(m);
    else if (topic === this.base + 'c/' + this.myId && this.role === 'client') Client.onMessage(m);
  },
  sendTo(id, obj) { this.stats.tx++; if (this.mq) this.mq.publish(this.base + 'c/' + id, JSON.stringify(obj)); },
  sendToHost(obj) { this.stats.tx++; if (this.mq) this.mq.publish(this.base + 'h', JSON.stringify(obj)); },
  publishInfo(obj) { if (this.mq) this.mq.publish(this.base + 'i', obj ? JSON.stringify(obj) : '', { qos: 1, retain: true }); },
  leave() {
    const mq = this.mq;
    if (mq) { try { if (this.role === 'host') { this.publishInfo(null); Host.broadcast({ t: 'closed' }); } else if (this.role === 'client') this.sendToHost({ t: 'bye', id: this.myId }); } catch { /* */ } setTimeout(() => mq.close(), 250); }
    this.mq = null; this.role = 'local'; this.code = null; this.topics = []; this.setStatus('off');
  },
  shareLink() {
    const base = location.href.split('#')[0].split('?')[0];
    let extra = ''; try { const b = new URLSearchParams(location.search).get('broker'); if (b) extra = '&broker=' + encodeURIComponent(b); } catch { /* */ }
    return `${base}?oda=${this.code}${this.idx ? '&s=' + this.idx : ''}${extra}`;
  }
};

/* ------------------------------------------------------------------ 9
   Oyun motoru — tek doğru durum (S) yalnızca oyunu yöneten cihazda tutulur.
   Yerel oyunda bu cihaz, online oyunda oda kurucusu. Diğer cihazlar yalnızca
   kendilerine özel hazırlanmış görüntüyü (viewFor) alır; gizli cevap gönderilmez. */
let S = null;
let viewSeq = 0;
const Timers = {
  ids: new Set(),
  later(ms, fn) { const tok = S && S.token; const id = setTimeout(() => { this.ids.delete(id); if (S && S.token === tok) fn(); }, ms); this.ids.add(id); },
  clear() { this.ids.forEach(clearTimeout); this.ids.clear(); }
};
function mkPlayer(i, name, clientId) {
  return { name: cleanName(name) || `Yarışmacı ${i + 1}`, color: COLORS[i % COLORS.length], total: 0, hand: 0, coupons: 0, bought: [], solved: 0, wrong: 0,
    clientId: clientId || null, online: true, lastSeen: Date.now(), offSince: 0 };
}
function newState(mode, players, lengthKey) {
  const m = MODES[lengthKey] || MODES.std;
  return { mode, token: rid(8), phase: 'idle', players, cur: 0, round: 0, rounds: +G.settings.rounds || m.rounds, vowelCost: m.vowelCost, lengthKey,
    puzzle: null, revealed: new Set(), guessed: new Set(), wheelValue: 0, lives: SOLO_LIVES, misses: 0, roundDone: false,
    rot: Wheel.rot || 0, spin: null, market: null, nextPuzzle: null, lastOffers: [], clues: [], history: [], summary: null, final: null, lastRound: false, evSeq: 0 };
}
const curP = () => S.players[S.cur];
const hiddenSet = () => { const s = new Set(); [...S.puzzle.a].forEach((ch, i) => { if (!S.revealed.has(i)) s.add(ch); }); return s; };
const consonantsLeft = () => { const h = hiddenSet(); return ALPHABET.concat(EXTRA_KEYS).some(l => !VOWELS.has(l) && !S.guessed.has(l) && h.has(l)); };
const vowelsLeft = () => [...VOWELS].some(v => !S.guessed.has(v));
const allRevealed = () => [...S.puzzle.a].every((ch, i) => S.revealed.has(i));

function emit(ev, log, cls) { if (log) ev.log = log; if (cls) ev.cls = cls; ev.n = ++S.evSeq; ev.g = S.token; Out.event(ev); }
let syncQueued = false;
function sync() { if (syncQueued) return; syncQueued = true; queueMicrotask(() => { syncQueued = false; Out.sync(); }); }

const Out = {
  event(ev) {
    UI.onEvent(ev);
    if (Net.role === 'host') Host.broadcast({ t: 'ev', e: ev });
  },
  sync() {
    if (!S) return;
    UI.onView(viewFor(Net.role === 'host' ? 0 : 'all'));
    if (Net.role === 'host') {
      S.players.forEach((p, i) => { if (i > 0 && p.clientId) Net.sendTo(p.clientId, { t: 'view', v: viewFor(i) }); });
      Host.spectators.forEach(id => Net.sendTo(id, { t: 'view', v: viewFor(-1) }));
      Host.persist();
    }
  }
};

// Bir izleyiciye özel görüntü. viewer: 'all' (yerel), oyuncu sırası ya da -1 (izleyici)
function viewFor(viewer) {
  const P = S.puzzle, all = viewer === 'all';
  const board = P ? [...P.a].map((ch, i) => !isLetter(ch) ? ch : (S.revealed.has(i) ? ch : '_')).join('') : '';
  const clues = P ? S.clues.map((c, i) => ({ i, c })).filter(x => x.c.puzzleKey === P.key).map(({ i, c }) => {
    const mine = all || viewer === c.owner;
    return { i, owner: c.owner, title: c.title, opened: c.opened, mine, text: mine && c.opened ? c.text : null };
  }) : [];
  const M = S.market;
  return {
    g: S.token, seq: ++viewSeq, mode: S.mode, phase: S.phase, me: viewer, cur: S.cur, round: S.round, rounds: S.rounds, vowelCost: S.vowelCost, lastRound: S.lastRound,
    players: S.players.map(p => ({ name: p.name, color: p.color, total: p.total, hand: p.hand, coupons: p.coupons, solved: p.solved, online: p.online, bought: p.bought.slice() })),
    cat: P ? P.cat : '', d: P ? P.d : 1, board, consLeft: P ? consonantsLeft() : true, guessed: [...S.guessed], wheelValue: S.wheelValue, lives: S.lives, rot: S.rot,
    spinning: S.phase === 'spinning' && S.spin ? { to: S.spin.to, left: Math.max(0, S.spin.end - Date.now()) } : null,
    clues,
    market: S.phase === 'market' && M ? { id: M.id, nextCat: M.nextCat, ready: M.ready.slice(), owned: M.owned.map(s => [...s]),
      offers: M.offers.map(o => ({ oid: o.oid, type: o.type, name: o.name, level: o.level, lc: o.lc, base: o.base, price: o.price, sale: o.sale, desc: o.desc, hasText: !!o.text })) } : null,
    summary: ['roundOver', 'market', 'over'].includes(S.phase) ? S.summary : null,
    final: S.phase === 'over' ? S.final : null,
    clueMode: G.settings.clueMode, code: Net.code
  };
}

function startGame(mode, players, lengthKey) {
  Timers.clear();
  G.sessionUsed = new Set(); G.adapt = 0; G.catUse = {}; G.recentCats = []; G.lastCat = null;
  S = newState(mode, players, lengthKey);
  emit({ t: 'start' }, `Yarışma başladı: ${S.players.map(p => p.name).join(', ')} · ${S.rounds} tur · ${(MODES[lengthKey] || MODES.std).label}`, 'gold');
  startRound(choosePuzzle(1, S.rounds));
}

function startRound(puzzle) {
  S.round++;
  S.puzzle = puzzle;
  G.sessionUsed.add(puzzle.key); History.mark(puzzle);
  G.lastCat = puzzle.cat; G.recentCats = [puzzle.cat, ...G.recentCats].slice(0, 3); G.catUse[puzzle.cat] = (G.catUse[puzzle.cat] || 0) + 1;
  S.revealed = new Set(); S.guessed = new Set(); S.wheelValue = 0; S.roundDone = false; S.misses = 0; S.lives = SOLO_LIVES;
  S.market = null; S.nextPuzzle = null; S.summary = null; S.spin = null;
  S.players.forEach(p => { p.hand = 0; });
  let c = (S.round - 1) % S.players.length;
  for (let k = 0; k < S.players.length && !S.players[c].online; k++) c = (c + 1) % S.players.length;
  S.cur = c;
  [...puzzle.a].forEach((ch, i) => { if (!isLetter(ch)) S.revealed.add(i); });
  S.clues = S.clues.filter(cl => cl.puzzleKey === puzzle.key);
  if (G.settings.clueMode === 'auto') S.clues.forEach(cl => { cl.opened = true; });
  S.lastRound = S.round === S.rounds && S.rounds > 1;
  S.phase = 'idle';
  emit({ t: 'round', round: S.round, lastRound: S.lastRound }, `${S.round}. tur · Kategori: ${puzzle.cat} · ${curP().name} başlıyor`, 'gold');
  sync();
}

// Bir oyuncudan gelen hamle. pi: hamleyi yapan oyuncunun sırası (yerelde sıradaki oyuncu)
function act(pi, a) {
  if (!S || !a || typeof a.t !== 'string') return;
  const hostLike = S.mode === 'local' || pi === 0;
  switch (a.t) {
    case 'spin': return doSpin(pi);
    case 'vowel': return doVowel(pi);
    case 'letter': return doLetter(pi, String(a.L || '').slice(0, 1));
    case 'solve': return doSolve(pi, String(a.text || '').slice(0, 80));
    case 'clue': return doClue(pi, a.i | 0);
    case 'buy': return doBuy(S.mode === 'local' ? clamp(a.as | 0, 0, S.players.length - 1) : pi, String(a.oid || ''));
    case 'ready': return doReady(pi);
    case 'marketDone': if (hostLike) closeMarket(); return;
    case 'next': if (hostLike) afterRoundEnd(); return;
    case 'restart': if (hostLike && S.phase === 'over') restartGame(); return;
    default: return;
  }
}

function doSpin(pi) {
  if (S.phase !== 'idle' || pi !== S.cur || S.roundDone) return;
  if (!consonantsLeft()) { emit({ t: 'info', to: pi, text: 'Panoda ünsüz kalmadı: ünlü al ya da cevabı tahmin et.' }); return; }
  const idx = randInt(0, SLICES.length - 1);
  const from = S.rot, to = Wheel.targetRotation(from, idx, randInt(4, 6), rand(-1, 1));
  const dur = Math.round(rand(4300, 6300));
  S.rot = to; S.phase = 'spinning'; S.spin = { from, to, dur, end: Date.now() + dur };
  emit({ t: 'spin', from, to, dur, by: pi });
  sync();
  Timers.later(dur + 250, () => landSpin(idx));
}

function landSpin(idx) {
  if (S.phase !== 'spinning') return;
  S.spin = null;
  const landed = Wheel.indexAt(S.rot);
  if (landed !== idx) console.error('Çark uyuşmazlığı', landed, idx);
  const sl = SLICES[landed], p = curP();
  if (sl.kind === 'val') {
    S.wheelValue = sl.v; S.phase = 'pickConsonant';
    emit({ t: 'landed', kind: 'val', v: sl.v, by: S.cur }, `${p.name} çarkı çevirdi: ${fmt(sl.v)} puan.`);
  } else if (sl.kind === 'pass') {
    emit({ t: 'landed', kind: 'pass', by: S.cur }, `${p.name}: PAS geldi.`, 'bad');
    nextPlayer();
  } else {
    const lost = p.hand; p.hand = 0;
    emit({ t: 'landed', kind: 'bankrupt', lost, by: S.cur }, `${p.name} İFLAS etti${lost ? `, ${fmt(lost)} el puanı kayboldu` : ''}.`, 'bad');
    nextPlayer();
  }
  sync();
}

function doVowel(pi) {
  if (pi !== S.cur || S.roundDone) return;
  if (S.phase === 'pickVowel') { S.phase = 'idle'; sync(); return; }
  if (S.phase !== 'idle' || !vowelsLeft()) return;
  const p = curP();
  if (!p.coupons && p.hand < S.vowelCost) { emit({ t: 'info', to: pi, text: `Ünlü almak için el puanın en az ${fmt(S.vowelCost)} olmalı.` }); return; }
  S.phase = 'pickVowel'; sync();
}

function doLetter(pi, L) {
  if (pi !== S.cur || S.roundDone || !isLetter(L) || S.guessed.has(L)) return;
  const vowel = VOWELS.has(L);
  if (!((S.phase === 'pickConsonant' && !vowel) || (S.phase === 'pickVowel' && vowel))) return;
  const p = curP();
  S.guessed.add(L);
  const positions = [...S.puzzle.a].map((ch, i) => (ch === L && !S.revealed.has(i)) ? i : -1).filter(i => i >= 0);
  const count = positions.length;
  let note = '';
  if (vowel) {
    if (p.coupons > 0) { p.coupons--; note = ' (kupon)'; } else p.hand -= S.vowelCost;
  }
  if (count) {
    const gain = vowel ? 0 : S.wheelValue * count;
    p.hand += gain;
    positions.forEach(i => S.revealed.add(i));
    S.phase = 'revealing';
    emit({ t: 'reveal', positions, letter: L, count, gain, by: pi }, `${p.name}: "${L}" ${count} kez var${gain ? ` → +${fmt(gain)}` : ''}${note}.`, 'good');
    sync();
    Timers.later(count * REVEAL_MS + 450, () => {
      S.wheelValue = 0;
      if (allRevealed()) finishRound(pi, 'Bütün harfler açıldı');
      else { S.phase = 'idle'; sync(); }
    });
  } else {
    p.wrong++;
    emit({ t: 'miss', letter: L, by: pi }, `${p.name}: "${L}" bulmacada yok${note}.`, 'bad');
    nextPlayer();
    sync();
  }
}

function doSolve(pi, text) {
  if (pi !== S.cur || S.roundDone || !['idle', 'pickConsonant'].includes(S.phase)) return;
  const guess = lettersOnly(text);
  if (!guess) return;
  const p = curP();
  // Türkçe klavyesi olmayanlar için Ç/C, Ğ/G, I/İ, Ö/O, Ş/S, Ü/U farkı tahmini bozmasın
  const fold = s => s.replace(/[ÇĞIİÖŞÜ]/g, c => ({ Ç: 'C', Ğ: 'G', I: 'I', İ: 'I', Ö: 'O', Ş: 'S', Ü: 'U' }[c]));
  if (guess === S.puzzle.key || fold(guess) === fold(S.puzzle.key)) {
    finishRound(pi, 'Doğru tahmin');
  } else {
    p.wrong++;
    emit({ t: 'wrongSolve', by: pi }, `${p.name} yanlış tahmin etti: "${up(text.trim()).slice(0, 40)}".`, 'bad');
    nextPlayer();
    sync();
  }
}

function doClue(pi, i) {
  const c = S.clues[i];
  if (!c || c.opened || c.owner !== pi || pi !== S.cur || S.phase !== 'idle') return;
  c.opened = true;
  emit({ t: 'clue', by: pi }, `${S.players[pi].name} "${c.title}" ipucunu açtı.`, 'gold');
  sync();
}

function nextPlayer() {
  S.wheelValue = 0;
  if (S.players.length === 1) {
    S.lives--;
    if (S.lives <= 0) { finishRound(null, 'Hata hakkın bitti'); return; }
    emit({ t: 'lives', lives: S.lives }, `Kalan hata hakkı: ${S.lives}`);
  } else {
    S.misses++;
    if (S.misses >= S.players.length * 6) { finishRound(null, 'Kimse çözemedi'); return; }
    let n = S.cur;
    for (let k = 0; k < S.players.length; k++) { n = (n + 1) % S.players.length; if (S.players[n].online) break; }
    S.cur = n;
    emit({ t: 'turn', cur: n }, `Sıra ${S.players[n].name} adlı yarışmacıda.`);
  }
  S.phase = 'idle';
}

// Turu kapatır; puan yalnızca bir kez ve yalnızca kazanana kesinleşir
function finishRound(winner, why) {
  if (S.roundDone) return;
  S.roundDone = true; S.phase = 'roundOver'; S.spin = null;
  [...S.puzzle.a].forEach((ch, i) => S.revealed.add(i));
  const reward = S.puzzle.d * 250;
  let summary;
  if (winner != null) {
    const w = S.players[winner], hand = w.hand, banked = hand + reward;
    w.total += banked; w.solved++;
    summary = { winner, banked, hand, reward };
    emit({ t: 'roundEnd', winner }, `${w.name} bulmacayı çözdü! ${fmt(hand)} el puanı + ${fmt(reward)} çözüm ödülü = ${fmt(banked)} kesinleşti.`, 'good');
    G.adapt = clamp(G.adapt + (S.misses <= S.players.length ? .35 : S.misses > S.players.length * 3 ? -.3 : .05), -.8, .8);
  } else {
    summary = { winner: null };
    emit({ t: 'roundEnd', winner: null }, `Tur çözülemeden bitti (${why}). El puanları kesinleşmedi.`, 'bad');
    G.adapt = clamp(G.adapt - .4, -.8, .8);
  }
  Object.assign(summary, { why, round: S.round, answer: S.puzzle.a, cat: S.puzzle.cat, last: S.round >= S.rounds });
  S.summary = summary;
  S.history.push({ round: S.round, cat: S.puzzle.cat, answer: S.puzzle.a, winner: winner != null ? S.players[winner].name : null });
  S.players.forEach(p => { p.hand = 0; });
  S.wheelValue = 0;
  sync();
  if (S.mode === 'online') Timers.later(12000, () => { if (S.phase === 'roundOver') afterRoundEnd(); });
}

function afterRoundEnd() {
  if (S.phase !== 'roundOver') return;
  if (S.round >= S.rounds) endGame(); else openMarket();
}

function openMarket() {
  const next = choosePuzzle(S.round + 1, S.rounds);
  const prev = {}; S.lastOffers.forEach(o => { prev[o.type] = o.price; });
  const offers = buildOffers(next, prev);
  S.lastOffers = offers;
  S.nextPuzzle = next;
  S.market = { id: Date.now(), offers, owned: S.players.map(() => new Set()), ready: S.players.map(p => !p.online), puzzleKey: next.key, nextCat: next.cat };
  S.phase = 'market';
  emit({ t: 'market' }, `İpucu Marketi açıldı (${offers.length} ürün). Sıradaki kategori: ${next.cat}.`, 'gold');
  sync();
  if (S.mode === 'online') { const id = S.market.id; Timers.later(150000, () => { if (S.phase === 'market' && S.market && S.market.id === id) closeMarket(); }); }
}

function doBuy(who, oid) {
  const M = S.market; if (S.phase !== 'market' || !M) return;
  const p = S.players[who], o = M.offers.find(x => x.oid === oid);
  if (!p || !o || M.owned[who].has(oid) || p.total < o.price) return;
  p.total -= o.price;
  M.owned[who].add(oid);
  p.bought.push(o.name);
  if (o.type === 'coupon') p.coupons++;
  else S.clues.push({ owner: who, puzzleKey: M.puzzleKey, title: o.name, text: o.text, opened: false });
  emit({ t: 'buy', by: who }, `${p.name} "${o.name}" aldı (−${fmt(o.price)}).`, 'gold');
  sync();
}

function doReady(pi) {
  const M = S.market; if (S.phase !== 'market' || !M || S.mode !== 'online') return;
  M.ready[pi] = !M.ready[pi];
  if (!checkReady()) sync();
}
function checkReady() {
  const M = S.market; if (!M) return false;
  if (S.players.every((p, i) => M.ready[i] || !p.online)) { closeMarket(); return true; }
  return false;
}
function closeMarket() {
  if (S.phase !== 'market' || !S.market) return;
  const next = S.nextPuzzle;
  S.market = null;
  startRound(next);
}

function endGame() {
  const max = Math.max(...S.players.map(p => p.total));
  S.final = {
    max, winners: S.players.map((p, i) => p.total === max ? i : -1).filter(i => i >= 0),
    rows: S.players.map((p, i) => ({ i, name: p.name, color: p.color, total: p.total, solved: p.solved, bought: p.bought.slice() })).sort((a, b) => b.total - a.total)
  };
  S.phase = 'over';
  emit({ t: 'over' }, `Yarışma bitti. Kazanan: ${S.final.winners.map(i => S.players[i].name).join(' & ')} (${fmt(max)} puan).`, 'gold');
  sync();
}

function restartGame() {
  const players = S.players.map((p, i) => Object.assign(mkPlayer(i, p.name, p.clientId), { online: p.online, lastSeen: p.lastSeen }));
  startGame(S.mode, players, S.lengthKey);
}

/* ------------------------------------------------------------------ 10
   Kurucu (host) — lobi, oyuncu eşleme, varlık takibi, durum yedeği         */
const Host = {
  L: null, spectators: new Set(), tickT: null, hbT: null,
  async create(name, lengthKey) {
    await Net.host();
    this.L = { players: [{ name, clientId: Net.myId, lastSeen: Date.now() }], lengthKey };
    this.spectators = new Set();
    this.publishInfo();
    this.startTimers();
    this.broadcastLobby();
    this.persist();
  },
  publishInfo() { Net.publishInfo({ host: Net.myId, code: Net.code, playing: !!S, ts: Date.now() }); },
  startTimers() {
    clearInterval(this.tickT); clearInterval(this.hbT);
    this.tickT = setInterval(() => this.tick(), 2000);
    this.hbT = setInterval(() => this.broadcast({ t: 'hb' }), 5000);
  },
  stop() { clearInterval(this.tickT); clearInterval(this.hbT); this.L = null; this.spectators.clear(); sess.del('cf.host'); },
  clients() {
    if (S) return S.players.filter((p, i) => i > 0 && p.clientId).map(p => p.clientId).concat([...this.spectators]);
    return this.L ? this.L.players.slice(1).map(p => p.clientId) : [];
  },
  broadcast(m) { this.clients().forEach(id => Net.sendTo(id, m)); },
  lobbyMsg() { return { t: 'lobby', code: Net.code, s: Net.idx, lengthKey: this.L.lengthKey, players: this.L.players.map((p, i) => ({ name: p.name, color: COLORS[i] })) }; },
  broadcastLobby() { if (!this.L) return; const m = this.lobbyMsg(); UI.showLobby(m, true, 0); this.L.players.forEach((p, i) => { if (i > 0) Net.sendTo(p.clientId, Object.assign({ you: i }, m)); }); this.persist(); },
  onMessage(m) {
    if (!m || typeof m.id !== 'string' || m.id === Net.myId) return;
    const now = Date.now();
    if (m.t === 'hello') { this.onHello(m.id, cleanName(m.name)); return; }
    if (S) {
      const i = S.players.findIndex(p => p.clientId === m.id);
      if (i > 0) {
        const p = S.players[i];
        if (m.t === 'bye') { p.lastSeen = 0; this.tick(); return; }
        p.lastSeen = now;
        if (!p.online) this.tick();
        if (m.t === 'act' && m.a) { Net.stats.acts++; act(i, m.a); }
      }
    } else if (this.L) {
      const k = this.L.players.findIndex(p => p.clientId === m.id);
      if (k > 0) {
        if (m.t === 'bye') { this.L.players.splice(k, 1); this.broadcastLobby(); return; }
        this.L.players[k].lastSeen = now;
      }
    }
  },
  onHello(id, name) {
    const now = Date.now();
    if (!S) {
      if (!this.L) return;
      let p = this.L.players.find(x => x.clientId === id);
      if (!p) {
        if (this.L.players.length >= MAX_PLAYERS) { Net.sendTo(id, { t: 'full' }); return; }
        p = { name: name || `Yarışmacı ${this.L.players.length + 1}`, clientId: id, lastSeen: now };
        this.L.players.push(p);
        UI.toast(`${p.name} odaya katıldı`, 'good');
      } else { p.name = name || p.name; p.lastSeen = now; }
      this.broadcastLobby();
      return;
    }
    const i = S.players.findIndex(x => x.clientId === id);
    if (i > 0) {
      const p = S.players[i]; p.lastSeen = now;
      if (!p.online) { p.online = true; p.offSince = 0; emit({ t: 'presence' }, `${p.name} yeniden bağlandı.`, 'good'); }
      sync();
      Net.sendTo(id, { t: 'view', v: viewFor(i) });
    } else {
      this.spectators.add(id);
      Net.sendTo(id, { t: 'view', v: viewFor(-1) });
    }
  },
  start() {
    if (!this.L || S || this.L.players.length < 2) return;
    const players = this.L.players.map((p, i) => mkPlayer(i, p.name, p.clientId));
    const lengthKey = this.L.lengthKey;
    startGame('online', players, lengthKey);
    this.publishInfo();
  },
  tick() {
    const now = Date.now();
    if (!S) {
      if (!this.L) return;
      const before = this.L.players.length;
      this.L.players = this.L.players.filter((p, i) => i === 0 || now - p.lastSeen < 15000);
      if (this.L.players.length !== before) this.broadcastLobby();
      return;
    }
    let changed = false;
    S.players.forEach((p, i) => {
      if (i === 0) return;
      const on = now - p.lastSeen < 12000;
      if (on !== p.online) {
        p.online = on; p.offSince = on ? 0 : now; changed = true;
        emit({ t: 'presence' }, on ? `${p.name} yeniden bağlandı.` : `${p.name} bağlantısı koptu.`, on ? 'good' : 'bad');
      }
    });
    const c = S.players[S.cur];
    if (['idle', 'pickConsonant', 'pickVowel'].includes(S.phase) && !c.online && now - c.offSince > 8000 && S.players.some(p => p.online)) {
      emit({ t: 'skip' }, `${c.name} bağlı olmadığı için sıra geçti.`, 'bad');
      nextPlayer(); changed = true;
    }
    if (S.phase === 'market' && S.market) { S.players.forEach((p, i) => { if (!p.online) S.market.ready[i] = true; }); if (checkReady()) return; }
    if (changed) sync();
  },
  onReconnect() { this.publishInfo(); if (S) sync(); else this.broadcastLobby(); },
  // Telefon sekmeyi kapatıp açarsa oyun kaybolmasın: durum oturum belleğine yazılır
  persist() {
    if (Net.role !== 'host') return;
    try {
      const snap = { code: Net.code, idx: Net.idx, ts: Date.now(), L: this.L, spectators: [...this.spectators],
        G: { sessionUsed: [...G.sessionUsed], lastCat: G.lastCat, recentCats: G.recentCats, catUse: G.catUse, adapt: G.adapt }, viewSeq };
      if (S) snap.S = Object.assign({}, S, { puzzle: S.puzzle && S.puzzle.key, nextPuzzle: S.nextPuzzle && S.nextPuzzle.key, revealed: [...S.revealed], guessed: [...S.guessed],
        market: S.market ? Object.assign({}, S.market, { owned: S.market.owned.map(s => [...s]) }) : null });
      sess.set('cf.host', snap);
    } catch (e) { console.warn('Yedek yazılamadı', e); }
  },
  async restore(snap) {
    Net.idx = snap.idx || 0;
    await Net.host(snap.code);
    this.L = snap.L; this.spectators = new Set(snap.spectators || []);
    Object.assign(G, { sessionUsed: new Set(snap.G.sessionUsed), lastCat: snap.G.lastCat, recentCats: snap.G.recentCats, catUse: snap.G.catUse, adapt: snap.G.adapt });
    viewSeq = (snap.viewSeq || 0) + 1000;
    if (snap.S) {
      const s = snap.S;
      S = Object.assign({}, s, { puzzle: Pool.byKey.get(s.puzzle) || null, nextPuzzle: s.nextPuzzle ? Pool.byKey.get(s.nextPuzzle) : null,
        revealed: new Set(s.revealed), guessed: new Set(s.guessed), market: s.market ? Object.assign({}, s.market, { owned: s.market.owned.map(a => new Set(a)) }) : null });
      const now = Date.now();
      S.players.forEach((p, i) => { if (i > 0) p.lastSeen = now; });
      Wheel.rot = S.rot; Wheel.apply();
      if (S.phase === 'spinning') { S.spin = null; S.phase = 'spinning'; landSpin(Wheel.indexAt(S.rot)); }
      else if (S.phase === 'revealing') { if (allRevealed()) { S.roundDone = false; finishRound(S.cur, 'Bütün harfler açıldı'); } else S.phase = 'idle'; }
      else if (S.phase === 'roundOver') Timers.later(4000, () => { if (S.phase === 'roundOver') afterRoundEnd(); });
    }
    this.publishInfo();
    this.startTimers();
    if (S) { emit({ t: 'presence' }, 'Oda kurucusu yeniden bağlandı.', 'gold'); sync(); } else this.broadcastLobby();
  }
};

/* ------------------------------------------------------------------ 11
   Katılımcı (client)                                                         */
const Client = {
  lastSeq: 0, lastEv: 0, g: null, lastMsg: 0, pingT: null, dogT: null, name: '', you: null,
  async join(code, name, hint) {
    this.name = name; this.lastSeq = 0; this.lastEv = 0; this.g = null;
    await Net.join(code, hint || 0);
    this.lastMsg = Date.now();
    this.hello();
    clearInterval(this.pingT); clearInterval(this.dogT);
    this.pingT = setInterval(() => Net.sendToHost({ t: 'ping', id: Net.myId }), 4000);
    this.dogT = setInterval(() => {
      if (Net.role !== 'client') return;
      if (Date.now() - this.lastMsg > 15000 && Net.status === 'ok') UI.netToast('Oda kurucusuna ulaşılamıyor. Bekleniyor…');
    }, 3000);
    sess.set('cf.client', { code, name, s: Net.idx, ts: Date.now() });
  },
  hello() { Net.sendToHost({ t: 'hello', id: Net.myId, name: this.name }); },
  stop() { clearInterval(this.pingT); clearInterval(this.dogT); sess.del('cf.client'); },
  onReconnect() { this.hello(); },
  onMessage(m) {
    this.lastMsg = Date.now(); UI.netToast(null);
    switch (m.t) {
      case 'lobby': this.you = m.you; UI.showLobby(m, false, m.you); break;
      case 'view': {
        const v = m.v; if (!v) return;
        if (v.g !== this.g) { this.g = v.g; this.lastSeq = 0; this.lastEv = 0; }
        if (v.seq <= this.lastSeq) return;
        this.lastSeq = v.seq; UI.onView(v); break;
      }
      case 'ev': {
        const e = m.e; if (!e) return;
        if (e.g !== this.g) { this.g = e.g; this.lastSeq = 0; this.lastEv = 0; }
        if (e.n <= this.lastEv) return;
        this.lastEv = e.n; UI.onEvent(e); break;
      }
      case 'full': leaveRoom(false); UI.netMsg('Oda dolu (en fazla 4 yarışmacı).', 'bad'); break;
      case 'closed': leaveRoom(false); UI.netMsg('Oda kurucusu odayı kapattı.', 'bad'); break;
      default: break;
    }
  }
};

// Arayüzden gelen hamleyi doğru yere iletir
function send(a) {
  Sound.init();
  if (Net.role === 'client') Net.sendToHost({ t: 'act', id: Net.myId, a });
  else if (S) act(Net.role === 'host' ? 0 : (a.t === 'buy' ? a.as : S.cur), a);
}

/* ------------------------------------------------------------------ 12
   Arayüz — yalnızca gelen görüntüye (V) ve olaylara göre çizer              */
const isPhone = () => innerWidth < 760;
const UI = {
  V: null, animating: new Set(), lastBoard: '', lastBoardKey: '', marketTab: 0, lastMarketId: null, reTimer: null, shownRe: null, hintUntil: 0, prevMyTurn: false, prevPhase: null,
  canAct() { const V = this.V; return !!V && (V.mode === 'local' || V.me === V.cur); },
  meIdx() { const V = this.V; return V && typeof V.me === 'number' ? V.me : -1; },
  onView(V) {
    const prev = this.V;
    this.V = V;
    hide('menu'); hide('lobby');
    // Çark: dönmüyorsa kurucunun açısına hizala; kaçırılmış bir dönüş varsa kalanını oynat
    if (!Wheel.spinning) {
      if (V.spinning && V.spinning.left > 300) this.playSpin(Wheel.rot, V.spinning.to, V.spinning.left);
      else if (Math.abs(Wheel.rot - V.rot) > .01) { Wheel.rot = V.rot; Wheel.apply(); }
    }
    G.final = V.lastRound && !['over'].includes(V.phase);
    document.body.classList.toggle('final', G.final);
    Sound.updateMusic();
    // Sıra sende bildirimi (online)
    const myTurn = V.mode === 'online' && V.me === V.cur && ['idle', 'pickConsonant', 'pickVowel'].includes(V.phase);
    if (myTurn && !this.prevMyTurn && V.phase === 'idle') { setTimeout(() => banner('SIRA SENDE!', 'pink'), 500); try { navigator.vibrate && navigator.vibrate([90, 60, 90]); } catch { /* */ } Sound.special(); }
    this.prevMyTurn = myTurn;
    // Harf seçme anında telefonda panoyu göster
    const picking = this.canAct() && ['pickConsonant', 'pickVowel'].includes(V.phase);
    document.body.classList.toggle('pick', picking);
    if (picking && this.prevPhase !== V.phase && isPhone()) setTimeout(() => { const z = document.querySelector('.board-zone'); if (z) z.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
    if (!['idle', 'pickConsonant'].includes(V.phase) || !this.canAct()) closeSolve(true);
    this.prevPhase = V.phase;
    this.overlays(prev);
    renderAll();
  },
  overlays(prev) {
    const V = this.V;
    // Tur sonu
    if (V.phase === 'roundOver' && V.summary) {
      const key = V.g + ':' + V.summary.round;
      if (this.shownRe !== key) { this.shownRe = key; clearTimeout(this.reTimer); this.reTimer = setTimeout(() => { if (this.V && this.V.phase === 'roundOver') { showRoundEnd(); show('roundEnd'); } }, 1300); }
      else if (!$('roundEnd').hidden) showRoundEnd();
    } else { clearTimeout(this.reTimer); hide('roundEnd'); }
    // Market
    if (V.phase === 'market' && V.market) {
      if (this.lastMarketId !== V.market.id) {
        this.lastMarketId = V.market.id;
        this.marketTab = V.mode === 'local' ? V.players.reduce((bi, p, i, a) => p.total > a[bi].total ? i : bi, 0) : this.meIdx();
        const m = document.querySelector('.market-modal'); m.classList.remove('enter'); void m.offsetWidth; m.classList.add('enter');
      }
      renderMarket(); show('market');
    } else hide('market');
    // Final
    if (V.phase === 'over' && V.final) { renderGameOver(); show('gameOver'); } else hide('gameOver');
  },
  playSpin(from, to, dur) {
    G.spinning = true; document.body.classList.add('spinning'); Sound.updateMusic();
    $('wheelResult').textContent = 'Çark dönüyor…';
    Wheel.animate(from, to, dur).then(() => { G.spinning = false; document.body.classList.remove('spinning'); Sound.updateMusic(); if (UI.V && !Wheel.spinning) { if (Math.abs(Wheel.rot - UI.V.rot) > .01 && !UI.V.spinning) { Wheel.rot = UI.V.rot; Wheel.apply(); } renderAll(); } });
  },
  onEvent(e) {
    if (e.log) addLog(e.log, e.cls);
    const V = this.V, mine = !V || V.mode === 'local' || e.by === V.me;
    switch (e.t) {
      case 'spin': this.playSpin(e.from, e.to, e.dur); break;
      case 'landed': {
        const ww = $('wheelWrap'); ww.classList.remove('flash'); void ww.offsetWidth; ww.classList.add('flash');
        Sound.stop();
        if (e.kind === 'val') { $('wheelResult').textContent = `${fmt(e.v)} PUAN`; banner(`${fmt(e.v)} PUAN`); }
        else if (e.kind === 'pass') { $('wheelResult').textContent = 'PAS ✋'; banner('PAS!', 'pink'); Sound.bad(); }
        else { $('wheelResult').textContent = 'İFLAS 💀'; banner('İFLAS!', 'bad'); flash('bad'); Sound.bankrupt(); }
        break;
      }
      case 'reveal': this.playReveal(e); break;
      case 'miss': Sound.bad(); flash('bad'); pulse('board', 'bad'); banner(`"${e.letter}" YOK`, 'bad'); break;
      case 'wrongSolve': Sound.bad(); flash('bad'); banner('YANLIŞ CEVAP', 'bad'); break;
      case 'roundEnd': {
        if (e.winner != null) {
          const n = V && V.players[e.winner] ? V.players[e.winner].name : '';
          Sound.solve(); setTimeout(() => Sound.fanfare(), 700); FX.confetti(180); flash('good');
          banner(V && V.me === e.winner ? 'BİLDİN!' : `${n.toLocaleUpperCase(TR)} ÇÖZDÜ!`, 'good');
        } else { Sound.bankrupt(); banner('TUR BİTTİ', 'bad'); }
        break;
      }
      case 'round': banner(e.lastRound ? 'SON TUR!' : `${e.round}. TUR`, e.lastRound ? 'pink' : ''); if (e.lastRound) FX.confetti(60); $('wheelResult').textContent = 'Çarkı çevir!'; break;
      case 'market': Sound.whoosh(); setTimeout(() => Sound.buy(), 250); FX.burst(innerWidth / 2, innerHeight * .25, 50, false); break;
      case 'buy': if (mine) { Sound.buy(); FX.burst(innerWidth / 2, innerHeight / 2, 30); } break;
      case 'clue': Sound.special(); break;
      case 'over': FX.confetti(260); Sound.fanfare(); break;
      case 'info': if (mine || e.to === (V && V.me)) { setHint(e.text, 3500); Sound.bad(); } break;
      default: break;
    }
  },
  async playReveal(e) {
    const g = this.V ? this.V.g : null;
    e.positions.forEach(i => this.animating.add(i));
    renderBoard();
    showBoard();
    for (const i of e.positions) {
      const t = document.querySelector(`.tile[data-i="${i}"]`);
      if (t) { t.classList.add('pending'); await sleep(REVEAL_MS * .5); }
      this.animating.delete(i);
      const t2 = document.querySelector(`.tile[data-i="${i}"]`);
      if (t2) { t2.classList.remove('pending'); t2.classList.add('open', 'light'); t2.textContent = e.letter; }
      Sound.good();
      await sleep(REVEAL_MS * .5);
      if (!this.V || this.V.g !== g) { this.animating.clear(); return; }
    }
    this.lastBoard = this.V ? this.V.board : this.lastBoard;
    if (e.gain) {
      banner(`+${fmt(e.gain)} PUAN!`, 'good');
      FX.burst(...centerOf($('board')), e.gain >= 1000 ? 70 : 35);
      if (e.gain >= 1000) FX.confetti(70);
    }
    flash('good'); pulse('board', 'good');
  },
  netStatus(s) {
    const chip = $('roomChip'), dot = $('netDot');
    chip.hidden = s === 'off';
    document.body.classList.toggle('online', s !== 'off');
    $('roomChipCode').textContent = Net.code || '-----';
    dot.className = 'net-dot ' + (s === 'ok' ? 'ok' : s === 'wait' ? 'wait' : '');
    if (s === 'wait') this.netToast('Bağlantı koptu, yeniden bağlanılıyor…'); else if (s === 'ok') this.netToast(null);
  },
  netToast(text) { const t = $('netToast'); if (!text) { t.hidden = true; return; } t.textContent = text; t.hidden = false; },
  toast(text, cls) { addLog(text, cls); },
  netMsg(text, cls) { const m = $('netMsg'); m.textContent = text || ''; m.className = 'net-msg ' + (cls || ''); if (text) { showMenu('online'); } },
  showLobby(m, isHost, you) {
    hide('menu'); show('lobby');
    $('roomCode').textContent = m.code;
    $('shareLink').value = Net.shareLink();
    $('lobbyCount').textContent = `${m.players.length}/${MAX_PLAYERS}`;
    $('lobbyPlayers').innerHTML = m.players.map((p, i) => `<div class="lp" style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><b>${esc(p.name)}</b>${i === 0 ? '<span class="tagx">kurucu</span>' : ''}${i === you ? '<span class="tagx me">sen</span>' : ''}</div>`).join('')
      + Array.from({ length: MAX_PLAYERS - m.players.length }, () => '<div class="lp empty"><span class="av">?</span><span>Boş koltuk</span></div>').join('');
    $('lobbyHost').hidden = !isHost; $('lobbyWait').hidden = isHost;
    $('segLobbyLength').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === m.lengthKey));
    $('btnLobbyStart').disabled = m.players.length < 2;
    $('btnLobbyStart').textContent = m.players.length < 2 ? 'Arkadaşlarının katılmasını bekle…' : `▶ YARIŞMAYI BAŞLAT (${m.players.length} kişi)`;
    if (!isHost) $('lobbyWait').textContent = `${m.players[0] ? m.players[0].name : 'Kurucu'} yarışmayı başlatınca oyun açılacak · ${(MODES[m.lengthKey] || MODES.std).label}`;
  }
};

/* ---------- çizim ---------- */
function boardCols() { const w = $('board').clientWidth || 600; return w < 360 ? 10 : w < 470 ? 12 : 14; }
function layoutRows(answer, maxCols) {
  const words = answer.split(' ');
  const cols = Math.max(maxCols, ...words.map(w => w.length));
  const rows = []; let row = [], len = 0, idx = 0;
  for (const w of words) {
    const need = (row.length ? 1 : 0) + w.length;
    if (row.length && len + need > cols) { rows.push(row); row = []; len = 0; }
    row.push({ w, start: idx }); len += (row.length > 1 ? 1 : 0) + w.length;
    idx += w.length + 1;
  }
  if (row.length) rows.push(row);
  return { rows, cols };
}
function sizeTiles() {
  const board = $('board'), n = +board.dataset.cols || 12, w = board.clientWidth || 600;
  board.style.setProperty('--tile', Math.max(18, Math.min(46, Math.floor((w - (n - 1) * 5) / n))) + 'px');
}
function renderBoard(force) {
  const V = UI.V, board = $('board');
  if (!V || !V.board) { board.innerHTML = ''; return; }
  const maxCols = boardCols(), key = V.g + ':' + V.round + ':' + maxCols;
  const B = V.board;
  if (force || key !== UI.lastBoardKey) {
    UI.lastBoardKey = key;
    const { rows, cols } = layoutRows(B, maxCols);
    const widest = Math.max(...rows.map(r => r.reduce((s, x, i) => s + x.w.length + (i ? 1 : 0), 0)));
    board.dataset.cols = Math.max(widest, Math.min(cols, 10));
    board.innerHTML = rows.map(r => `<div class="board-row">${r.map((x, wi) => (wi ? '<div class="tile blank"></div>' : '') +
      [...x.w].map((ch, k) => { const i = x.start + k; const hidden = ch === '_'; const letter = hidden || isLetter(ch); const open = letter && !hidden && !UI.animating.has(i);
        return `<div class="tile ${letter ? 'letter' : 'punct'} ${open ? 'open' : ''}" data-i="${i}">${open || !letter ? esc(ch) : ''}</div>`; }).join('')).join('')}</div>`).join('');
    sizeTiles();
    UI.lastBoard = B;
    return;
  }
  board.querySelectorAll('.tile[data-i]').forEach(t => {
    const i = +t.dataset.i, ch = B[i];
    if (!t.classList.contains('letter')) return;
    const shouldOpen = ch && ch !== '_' && !UI.animating.has(i);
    if (shouldOpen && !t.classList.contains('open')) { t.classList.add('open'); if (UI.lastBoard[i] === '_') t.classList.add('light'); t.textContent = ch; }
  });
  UI.lastBoard = B;
}
function renderKeyboard() {
  const kb = $('keyboard'), V = UI.V;
  if (!kb.childElementCount) kb.innerHTML = ALPHABET.concat(EXTRA_KEYS).map(l => `<button type="button" class="key ${VOWELS.has(l) ? 'vowel' : ''}" data-l="${l}" aria-label="${l} harfi">${l}</button>`).join('');
  const armed = !!V && UI.canAct() && (V.phase === 'pickConsonant' || V.phase === 'pickVowel');
  kb.classList.toggle('armed', armed);
  const guessed = new Set(V ? V.guessed : []), shown = new Set(V ? [...V.board] : []);
  kb.querySelectorAll('.key').forEach(k => {
    const l = k.dataset.l, used = guessed.has(l), v = VOWELS.has(l);
    k.classList.toggle('hit', used && shown.has(l));
    k.classList.toggle('miss', used && !shown.has(l));
    k.disabled = used || !armed || (V.phase === 'pickConsonant' && v) || (V.phase === 'pickVowel' && !v);
  });
}
function playerBadges(p, i, V) {
  return `${V.me === i ? '<span class="badge me">SEN</span>' : ''}${p.online ? '' : '<span class="badge off">bağlantı yok</span>'}${p.coupons ? `<span class="badge">🎟 ${p.coupons}</span>` : ''}`;
}
function renderPlayers() {
  const V = UI.V;
  if (!V) { $('players').innerHTML = ''; $('pstrip').innerHTML = ''; return; }
  $('players').innerHTML = V.players.map((p, i) => `<div class="player ${i === V.cur && V.phase !== 'over' ? 'active' : ''} ${p.online ? '' : 'offline'}" style="--pc:${p.color}">
    <span class="dot"></span><span class="pname">${esc(p.name)}</span><span class="ptotal">${fmt(p.total)}</span>
    <span class="phand"><span>El: <b>${fmt(p.hand)}</b></span><span>${playerBadges(p, i, V)}<span class="badge">✓ ${p.solved}</span></span></span></div>`).join('');
  $('pstrip').innerHTML = V.players.map((p, i) => `<div class="pchip ${i === V.cur && V.phase !== 'over' ? 'active' : ''} ${p.online ? '' : 'offline'} ${V.me === i ? 'me' : ''}" style="--pc:${p.color}">
    <span class="av" style="--pc:${p.color}">${initial(p.name)}</span><span class="pc-txt"><b>${esc(p.name)}${V.me === i ? ' · sen' : ''}</b><small>${fmt(p.total)}${p.hand ? ` <em>+${fmt(p.hand)}</em>` : ''}</small></span></div>`).join('');
}
function renderClues() {
  const V = UI.V, box = $('clues');
  const list = V ? V.clues : [];
  if (!list.length) { box.innerHTML = '<p class="muted">Marketten alınan ipuçları burada görünür. Market her el bittiğinde açılır.</p>'; return; }
  box.innerHTML = list.map(c => {
    const p = V.players[c.owner];
    if (!c.mine) return `<div class="clue" style="--pc:${p.color}"><h4>${esc(p.name)} · ${esc(c.title)}</h4><p class="muted">🔒 Bu ipucu yalnızca ${esc(p.name)} tarafından görülebilir.</p></div>`;
    const canOpen = !c.opened && c.owner === V.cur && V.phase === 'idle' && UI.canAct();
    return `<div class="clue" style="--pc:${p.color}"><h4>${esc(p.name)} · ${esc(c.title)}</h4>${c.opened ? `<p>${esc(c.text)}</p>`
      : `<p class="muted">Kilitli ipucu. Sıran gelince açabilirsin.</p><button class="btn btn-vowel" type="button" data-clue="${c.i}" ${canOpen ? '' : 'disabled'}>İPUCUNU AÇ</button>`}</div>`;
  }).join('');
}
function hintFor(V) {
  const cp = V.players[V.cur], name = cp ? cp.name : '', can = UI.canAct();
  if (V.phase === 'spinning') return can ? 'Çark dönüyor…' : `${name} çarkı çeviriyor…`;
  if (V.phase === 'revealing') return 'Harfler açılıyor…';
  if (!can) {
    if (V.me === -1) return `İzleyicisin · sıra ${name} adlı yarışmacıda`;
    if (V.phase === 'pickConsonant') return `${name} ${fmt(V.wheelValue)} puan için ünsüz seçiyor…`;
    if (V.phase === 'pickVowel') return `${name} ünlü seçiyor…`;
    return `Sıra ${name} adlı yarışmacıda. Sıran gelince butonlar açılır.`;
  }
  const pre = V.mode === 'local' && V.players.length > 1 ? `${name}: ` : '';
  const say = t => pre ? pre + t : t.charAt(0).toLocaleUpperCase(TR) + t.slice(1);
  if (V.phase === 'pickConsonant') return say(`bir ünsüz seç. Her geçiş ${fmt(V.wheelValue)} puan.`);
  if (V.phase === 'pickVowel') return say(`bir ünlü seç (iptal için ÜNLÜ AL'a tekrar bas).`);
  if (V.consLeft === false) return say('panoda ünsüz kalmadı: ünlü al ya da cevabı tahmin et.');
  return say('çarkı çevir, ünlü al ya da cevabı tahmin et.');
}
function renderAll() {
  const V = UI.V; if (!V) return;
  const p = V.players[V.cur], me = V.players[UI.meIdx()];
  $('roundLabel').textContent = `${V.round} / ${V.rounds}`;
  $('activeLabel').textContent = p ? p.name : '–';
  $('activeLabel').style.color = p ? p.color : '';
  const scoreOf = V.mode === 'online' && me ? me : p;
  $('activeTotalK').textContent = V.mode === 'online' && me ? 'PUANIN' : 'TOPLAM';
  $('activeTotal').textContent = scoreOf ? fmt(scoreOf.total) : '0';
  $('catLabel').textContent = V.cat ? up(V.cat) : 'KATEGORİ';
  $('diffLabel').textContent = ['', 'KOLAY', 'ORTA', 'ZOR', 'UZMAN'][V.d] + ` · ÖDÜL ${fmt(V.d * 250)}`;
  $('handInfo').textContent = p ? `${p.name} · El puanı: ${fmt(p.hand)}` : '';
  const li = $('livesInfo'); li.hidden = V.players.length !== 1; li.textContent = '❤'.repeat(Math.max(0, V.lives)) + '♡'.repeat(Math.max(0, SOLO_LIVES - V.lives)) + ' hata hakkı';
  const can = UI.canAct(), idle = V.phase === 'idle';
  $('vowelCost').textContent = p && p.coupons ? 'KUPON' : fmt(V.vowelCost);
  $('btnSpin').disabled = !(can && idle) || Wheel.spinning || V.consLeft === false;
  $('btnVowel').disabled = !can || !(idle || V.phase === 'pickVowel') || (p && !p.coupons && p.hand < V.vowelCost && V.phase !== 'pickVowel') || !ALPHABET.some(l => VOWELS.has(l) && !V.guessed.includes(l));
  $('btnVowel').classList.toggle('on', V.phase === 'pickVowel');
  $('btnSolve').disabled = !can || !['idle', 'pickConsonant'].includes(V.phase);
  // Online sıra şeridi
  const tb = $('turnBanner');
  if (V.mode === 'online' && ['idle', 'spinning', 'pickConsonant', 'pickVowel', 'revealing'].includes(V.phase)) {
    tb.hidden = false;
    tb.className = 'turn-banner ' + (can ? 'mine' : '');
    tb.style.setProperty('--pc', p ? p.color : '#fff');
    tb.innerHTML = can ? '⭐ SIRA SENDE' : `<span class="av" style="--pc:${p.color}">${initial(p.name)}</span> Sıra: <b>${esc(p.name)}</b>`;
  } else tb.hidden = true;
  if (Date.now() > UI.hintUntil) $('hintLine').textContent = hintFor(V);
  renderBoard(); renderKeyboard(); renderPlayers(); renderClues();
}
function setHint(t, ms = 0) { $('hintLine').textContent = t; UI.hintUntil = ms ? Date.now() + ms : 0; if (ms) setTimeout(() => { if (Date.now() >= UI.hintUntil && UI.V) $('hintLine').textContent = hintFor(UI.V); }, ms + 50); }
function showBoard() {
  const f = document.querySelector('.board-frame'), r = f.getBoundingClientRect();
  if (r.top < 0 || r.bottom > innerHeight) f.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: isPhone() ? 'start' : 'center' });
}
function pulse(id, cls) { const el = $(id); el.classList.remove('good', 'bad'); void el.offsetWidth; el.classList.add(cls); }
function addLog(text, cls = '') {
  const t = new Date();
  const li = document.createElement('li'); if (cls) li.className = cls;
  li.innerHTML = `<time>${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}</time><span>${esc(text)}</span>`;
  const ol = $('log'); ol.prepend(li); while (ol.children.length > 60) ol.lastChild.remove();
}
function show(id) { $(id).hidden = false; }
function hide(id) { $(id).hidden = true; }
let confirmResolve = null;
function confirmBox(title, text) {
  $('confirmTitle').textContent = title; $('confirmText').textContent = text; show('confirm'); $('confirmYes').focus();
  return new Promise(r => { confirmResolve = r; });
}
function closeConfirm(v) { hide('confirm'); if (confirmResolve) { const r = confirmResolve; confirmResolve = null; r(v); } }

/* ---------- tahmin kutusu ---------- */
function openSolve() {
  const V = UI.V; if (!V || !UI.canAct() || !['idle', 'pickConsonant'].includes(V.phase)) return;
  $('solveForm').hidden = false; $('solveInput').value = ''; $('solveInput').focus();
  setHint('Cevabı yaz ve gönder. Yanlış tahminde sıra geçer.', 60000);
}
function closeSolve(silent) { if ($('solveForm').hidden) return; $('solveForm').hidden = true; if (!silent) { UI.hintUntil = 0; renderAll(); } else UI.hintUntil = 0; }

/* ---------- tur sonu / final ---------- */
function showRoundEnd() {
  const V = UI.V, s = V.summary; if (!s) return;
  const w = s.winner != null ? V.players[s.winner] : null;
  $('reTitle').textContent = w ? (V.me === s.winner ? 'Tebrikler, bildin!' : `${w.name} kazandı!`) : 'Bulmaca çözülemedi';
  $('reAnswer').innerHTML = s.answer.split('').map(ch => ch === ' ' ? '<span class="gap"></span>' : `<span>${esc(ch)}</span>`).join('');
  const rows = V.players.map((p, i) => `<tr><td><span style="color:${p.color}">●</span> ${esc(p.name)}${V.me === i ? ' <small>(sen)</small>' : ''}</td><td class="num">${fmt(p.total)}</td></tr>`).join('');
  $('reBody').innerHTML = (w ? `<p style="text-align:center">El puanı <b>${fmt(s.hand)}</b> + çözüm ödülü <b>${fmt(s.reward)}</b> = <b style="color:var(--yellow)">${fmt(s.banked)}</b> puan kesinleşti.</p>`
    : `<p style="text-align:center">${esc(s.why)}. Bu turda kimse puan kesinleştiremedi.</p>`) +
    `<table class="score-table"><thead><tr><th>Yarışmacı</th><th class="num">Toplam puan</th></tr></thead><tbody>${rows}</tbody></table>` +
    `<p class="muted" style="text-align:center">${s.last ? 'Bu son turdu. Büyük finale geçiliyor.' : 'Sıradaki adım: İpucu Marketi. Toplam puanınla bir sonraki bulmaca için ipucu alabilirsin.'}</p>`;
  const btn = $('reNext');
  const canGo = V.mode === 'local' || V.me === 0;
  btn.disabled = !canGo;
  btn.textContent = canGo ? (s.last ? 'BÜYÜK FİNAL 🏆' : 'MARKETE GİT 🛒') : 'Kurucu devam ettirecek…';
}
function renderGameOver() {
  const V = UI.V, F = V.final;
  const names = F.winners.map(i => esc(V.players[i].name)).join(' & ');
  const rows = F.rows.map(r => `<tr><td><span style="color:${r.color}">●</span> ${esc(r.name)}${V.me === r.i ? ' <small>(sen)</small>' : ''}<div class="bought">${r.bought.length ? 'İpuçları: ' + r.bought.map(b => esc(b)).join(', ') : 'İpucu satın almadı'}</div></td><td class="num">${r.solved}</td><td class="num">${fmt(r.total)}</td></tr>`).join('');
  $('goBody').innerHTML = `<div class="winner"><div class="crown">🏆</div><div class="wname">${names}</div><div>${V.players.length === 1 ? 'Toplam puanın' : F.winners.length > 1 ? 'Berabere! Toplam puan' : 'Şampiyon · toplam puan'}: <b style="color:var(--yellow)">${fmt(F.max)}</b></div></div>
    <table class="score-table"><thead><tr><th>Yarışmacı</th><th class="num">Çözülen</th><th class="num">Toplam</th></tr></thead><tbody>${rows}</tbody></table>`;
  const host = V.mode === 'local' || V.me === 0;
  $('goAgain').hidden = !host;
  $('goAgain').textContent = V.mode === 'online' ? 'Aynı odada yeniden oyna' : 'Aynı ekiple yeniden oyna';
  $('goMenu').textContent = V.mode === 'online' ? 'Odadan çık' : 'Ana menü';
  $('goWait').hidden = host;
}

/* ---------- market ---------- */
function renderMarket() {
  const V = UI.V, M = V.market; if (!M) return;
  const local = V.mode === 'local';
  const viewer = local ? clamp(UI.marketTab, 0, V.players.length - 1) : UI.meIdx();
  const v = V.players[viewer];
  $('marketTabs').innerHTML = local && V.players.length > 1 ? V.players.map((p, i) =>
    `<button type="button" role="tab" aria-selected="${i === viewer}" class="${i === viewer ? 'on' : ''}" style="--pc:${p.color}" data-i="${i}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span>${esc(p.name)}</button>`).join('') : '';
  if (!v) { // izleyici
    $('marketOwner').innerHTML = '<span class="who">İzleyicisin<small>yarışmacılar alışveriş yapıyor</small></span>';
    $('marketGrid').innerHTML = ''; $('marketNote').textContent = '';
    $('btnMarketDone').hidden = true; $('btnMarketForce').hidden = true; $('readyInfo').textContent = '';
    return;
  }
  $('marketOwner').innerHTML = `<span class="av" style="--pc:${v.color}">${initial(v.name)}</span>
    <span class="who">${esc(v.name)}<small>${local ? 'alışveriş yapıyor' : 'senin bakiyen'}</small></span>
    <span class="bal">${COIN}${fmt(v.total)}</span>${v.coupons ? `<span class="chip">🎟 ${v.coupons} ünlü kuponu</span>` : ''}`;
  $('marketNote').textContent = `İpuçları sıradaki bulmaca (${M.nextCat}) için geçerli ve yalnızca satın alana görünür. ${V.clueMode === 'auto' ? 'Tur başında otomatik açılır.' : 'Sıran geldiğinde istediğin an açarsın.'} Ürünler her el yenilenir.`;
  const owned = new Set(M.owned[viewer] || []);
  $('marketGrid').style.setProperty('--n', M.offers.length);
  $('marketGrid').innerHTML = M.offers.map(o => {
    const has = owned.has(o.oid), afford = v.total >= o.price;
    const label = has ? 'SATIN ALINDI ✓' : afford ? 'SATIN AL' : 'PUAN YETERSİZ';
    return `<article class="card ${has ? 'owned' : ''} ${!has && !afford ? 'poor' : ''}" style="--lc:${o.lc}">
      <div class="tag-wrap"><span class="tag">${COIN}${o.sale ? `<s>${fmt(o.base)}</s>` : ''}${fmt(o.price)}</span></div>
      <div class="art">${ART[o.type] || ''}${o.sale && !has ? '<span class="sale">İNDİRİM</span>' : ''}</div>
      ${has ? '<span class="stamp">ALINDI ✓</span>' : ''}
      <div class="body">
        <span class="lvl">${o.level}</span><h3>${esc(o.name)}</h3>
        <p>${has && o.hasText ? (V.clueMode === 'auto' ? 'Sıradaki turun başında açılacak.' : 'Sıran gelince ipuçları panelinden açabilirsin.') : esc(o.desc)}</p>
        <button class="btn ${has ? 'btn-ghost' : 'btn-spin'}" type="button" data-oid="${o.oid}" ${has || !afford ? 'disabled' : ''}>${label}</button>
      </div>
    </article>`;
  }).join('');
  const done = $('btnMarketDone'), force = $('btnMarketForce'), info = $('readyInfo');
  done.hidden = false;
  if (local) { done.textContent = 'SONRAKİ TURA GEÇ ▶'; force.hidden = true; info.textContent = ''; done.classList.remove('btn-ghost'); }
  else {
    const rdy = M.ready[viewer];
    const n = M.ready.filter((r, i) => r && V.players[i].online).length, tot = V.players.filter(p => p.online).length;
    done.textContent = rdy ? 'HAZIRSIN ✓ (geri al)' : 'HAZIRIM ▶';
    done.classList.toggle('btn-ghost', rdy);
    info.textContent = `${n}/${tot} hazır`;
    force.hidden = V.me !== 0;
  }
}

/* ------------------------------------------------------------------ 13
   Menü, lobi, ayarlar                                                       */
function showMenu(tab) {
  hide('lobby'); show('menu');
  const t = tab || store.get('cf.tab', 'online');
  $('tabOnline').hidden = t !== 'online'; $('tabLocal').hidden = t !== 'local';
  $('tabBtnOnline').classList.toggle('on', t === 'online'); $('tabBtnLocal').classList.toggle('on', t === 'local');
  $('tabBtnOnline').setAttribute('aria-selected', t === 'online'); $('tabBtnLocal').setAttribute('aria-selected', t === 'local');
  updatePoolInfo();
}
function renderNames() {
  $('names').innerHTML = Array.from({ length: G.setup.count }, (_, i) => `<label><span class="dot" style="background:${COLORS[i]}"></span><input id="name${i}" maxlength="16" value="${esc(G.setup.names[i] || '')}" aria-label="${i + 1}. yarışmacının adı"></label>`).join('');
  $('names').querySelectorAll('input').forEach((inp, i) => inp.addEventListener('input', () => { G.setup.names[i] = inp.value; store.set('cf.setup.v1', G.setup); }));
}
function seg(id, onPick) {
  $(id).addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $(id).querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    onPick(b.dataset.v);
  });
}
function syncSetupButtons() {
  $('segPlayers').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === G.setup.count));
  $('segLength').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === G.setup.length));
}
function applySettings() {
  const s = G.settings;
  document.body.classList.toggle('anim-low', s.anim === 'low');
  Sound.setVolume(s.volume / 100);
  Sound.musicOn = s.music;
  Sound.setEnabled(s.sound);
  $('btnSound').textContent = s.sound ? '🔊' : '🔇';
  store.set('cf.settings.v1', s);
}
function openSettings() {
  const s = G.settings;
  $('setVolume').value = s.volume; $('setSound').checked = s.sound; $('setMusic').checked = s.music; $('setAnim').value = s.anim;
  $('setRounds').value = String(s.rounds); $('setClueMode').value = s.clueMode;
  $('historyInfo').textContent = `${fmt(History.seen())} / ${fmt(Pool.list.length)} bulmaca bu cihazda daha önce görüldü. Yeni oyun bu geçmişi korur.`;
  const client = Net.role === 'client';
  $('setRounds').disabled = client; $('setClueMode').disabled = client;
  $('btnResetGame').hidden = client || !S;
  show('settings');
}
function updatePoolInfo() {
  $('poolInfo').textContent = `Havuzda ${fmt(Pool.list.length)} benzersiz bulmaca, ${Pool.stats.cats} kategori · ${fmt(History.seen())} tanesi bu cihazda daha önce görüldü.`;
}
function resetUI() {
  UI.V = null; UI.animating.clear(); UI.lastBoardKey = ''; UI.lastMarketId = null; UI.shownRe = null; UI.prevMyTurn = false; UI.prevPhase = null;
  Wheel.stop(); G.spinning = false; G.final = false;
  ['market', 'roundEnd', 'gameOver', 'settings', 'lobby'].forEach(hide);
  $('solveForm').hidden = true; $('turnBanner').hidden = true;
  document.body.classList.remove('final', 'spinning', 'pick');
  $('board').innerHTML = ''; $('players').innerHTML = ''; $('pstrip').innerHTML = ''; $('log').innerHTML = '';
  $('catLabel').textContent = 'KATEGORİ'; $('diffLabel').textContent = ''; $('handInfo').textContent = '';
  $('roundLabel').textContent = '–'; $('activeLabel').textContent = '–'; $('activeTotal').textContent = '0';
  $('wheelResult').textContent = 'Çarkı çevirerek başla';
  renderKeyboard();
  Sound.updateMusic();
}
function leaveRoom(toMenu = true) {
  Timers.clear();
  if (Net.role === 'host') Host.stop();
  if (Net.role === 'client') Client.stop();
  Net.leave();
  S = null; resetUI();
  try { history.replaceState(null, '', location.pathname + (new URLSearchParams(location.search).get('broker') ? '?broker=' + encodeURIComponent(new URLSearchParams(location.search).get('broker')) : '')); } catch { /* */ }
  if (toMenu) showMenu();
  else showMenu('online');
}
function startLocal(count, length) {
  if (Net.role !== 'local') leaveRoom(false);
  Sound.init();
  G.setup.count = count; G.setup.length = length; store.set('cf.setup.v1', G.setup);
  resetUI();
  const players = Array.from({ length: count }, (_, i) => mkPlayer(i, G.setup.names[i]));
  startGame('local', players, length);
}
function myName() {
  const n = cleanName($('onName').value);
  if (!n) { UI.netMsg('Önce adını yaz.', 'bad'); $('onName').focus(); return null; }
  store.set('cf.name', n); return n;
}
async function hostRoom() {
  const name = myName(); if (!name) return;
  Sound.init();
  setBusy(true, 'Oda kuruluyor…');
  try { resetUI(); await Host.create(name, store.get('cf.lobbyLen', 'std')); UI.netMsg(''); }
  catch (e) { UI.netMsg(e.message + ' (claude.ai önizlemesinde online oyun çalışmaz; GitHub linkini kullan.)', 'bad'); Net.leave(); }
  finally { setBusy(false); }
}
async function joinRoom(codeIn, hint) {
  const name = myName(); if (!name) return;
  const code = Net.normCode(codeIn || $('joinCode').value);
  if (code.length !== 5) { UI.netMsg('Oda kodu 5 karakter olmalı.', 'bad'); $('joinCode').focus(); return; }
  Sound.init();
  setBusy(true, `${code} odasına bağlanılıyor…`);
  try { resetUI(); await Client.join(code, name, hint); UI.netMsg(''); show('lobby'); hide('menu'); $('roomCode').textContent = code; $('lobbyPlayers').innerHTML = '<p class="muted">Oda bilgisi bekleniyor…</p>'; $('lobbyHost').hidden = true; $('lobbyWait').hidden = false; $('lobbyWait').textContent = 'Kurucuya bağlanılıyor…'; $('shareLink').value = Net.shareLink(); }
  catch (e) { UI.netMsg(e.message, 'bad'); Net.leave(); }
  finally { setBusy(false); }
}
function setBusy(on, text) {
  ['btnHost', 'btnJoin'].forEach(id => { $(id).disabled = on; });
  if (on) { $('netMsg').textContent = text; $('netMsg').className = 'net-msg busy'; }
}
async function shareInvite() {
  const url = Net.shareLink(), text = `Çarkıfelek'te benim odama gel! Oda kodu: ${Net.code}`;
  if (navigator.share) { try { await navigator.share({ title: 'Çarkıfelek Stüdyo', text, url }); return; } catch { /* iptal */ } }
  copyInvite();
}
async function copyInvite() {
  const url = Net.shareLink();
  try { await navigator.clipboard.writeText(url); $('btnCopy').textContent = 'Kopyalandı ✓'; setTimeout(() => { $('btnCopy').textContent = 'Kopyala'; }, 1600); }
  catch { const i = $('shareLink'); i.focus(); i.select(); }
}

function bindEvents() {
  $('btnSpin').addEventListener('click', () => send({ t: 'spin' }));
  $('wheel').addEventListener('click', () => { if (UI.V && UI.canAct() && UI.V.phase === 'idle') send({ t: 'spin' }); });
  $('btnVowel').addEventListener('click', () => send({ t: 'vowel' }));
  $('btnSolve').addEventListener('click', openSolve);
  $('solveCancel').addEventListener('click', () => closeSolve());
  $('solveForm').addEventListener('submit', e => { e.preventDefault(); const t = $('solveInput').value; if (!lettersOnly(t)) { setHint('Önce bir tahmin yaz.', 2500); return; } closeSolve(); send({ t: 'solve', text: t }); });
  $('keyboard').addEventListener('click', e => { const k = e.target.closest('.key'); if (k && !k.disabled) { send({ t: 'letter', L: k.dataset.l }); k.disabled = true; } });
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!$('confirm').hidden) { if (e.key === 'Escape') closeConfirm(false); return; }
    const V = UI.V; if (!V || !UI.canAct()) return;
    if (V.phase === 'pickConsonant' || V.phase === 'pickVowel') {
      const L = e.key.length === 1 ? up(e.key) : '';
      if (isLetter(L)) { const btn = document.querySelector(`.key[data-l="${L}"]`); if (btn && !btn.disabled) send({ t: 'letter', L }); }
    } else if (V.phase === 'idle' && e.code === 'Space' && document.activeElement === document.body) { e.preventDefault(); send({ t: 'spin' }); }
  });
  $('clues').addEventListener('click', e => { const b = e.target.closest('[data-clue]'); if (b && !b.disabled) send({ t: 'clue', i: +b.dataset.clue }); });
  $('btnSound').addEventListener('click', () => { Sound.init(); G.settings.sound = !G.settings.sound; applySettings(); });
  $('btnSettings').addEventListener('click', openSettings);
  $('btnCloseSettings').addEventListener('click', () => hide('settings'));
  $('roomChip').addEventListener('click', () => { if (Net.code) { copyInvite(); setHint(`Davet linki kopyalandı · oda ${Net.code}`, 2500); } });
  $('btnMenu').addEventListener('click', async () => {
    if (!$('menu').hidden) return;
    const online = Net.role !== 'local';
    if (!S && !UI.V && !online) { showMenu(); return; }
    if (await confirmBox(online ? 'Odadan çık' : 'Ana menüye dön', online ? (Net.role === 'host' ? 'Oda kapanacak ve arkadaşlarının oyunu bitecek.' : 'Odadan ayrılacaksın. Aynı kodla yeniden katılabilirsin.') : 'Devam eden yarışma kapanacak. Bulmaca geçmişi korunur.')) leaveRoom(true);
  });
  $('setVolume').addEventListener('input', e => { G.settings.volume = +e.target.value; applySettings(); });
  $('setSound').addEventListener('change', e => { Sound.init(); G.settings.sound = e.target.checked; applySettings(); });
  $('setMusic').addEventListener('change', e => { Sound.init(); G.settings.music = e.target.checked; applySettings(); });
  $('setAnim').addEventListener('change', e => { G.settings.anim = e.target.value; applySettings(); });
  $('setRounds').addEventListener('change', e => { G.settings.rounds = +e.target.value; applySettings(); });
  $('setClueMode').addEventListener('change', e => { G.settings.clueMode = e.target.value; applySettings(); });
  $('btnNewGame').addEventListener('click', async () => { hide('settings'); if (!UI.V && Net.role === 'local') { showMenu(); return; } if (await confirmBox('Yeni oyun', 'Mevcut yarışma kapanıp ana menü açılacak. Bulmaca geçmişi korunur.')) leaveRoom(true); });
  $('btnResetGame').addEventListener('click', async () => {
    hide('settings'); if (!S) return;
    if (await confirmBox('Oyunu sıfırla', 'Aynı yarışmacılarla 1. turdan, sıfır puanla yeniden başlanacak.')) { S.phase = 'over'; restartGame(); }
  });
  $('btnResetHistory').addEventListener('click', async () => {
    hide('settings');
    if (await confirmBox('Geçmişi sıfırla', `Bu cihazda görülen ${fmt(History.seen())} bulmacanın kaydı silinecek ve hepsi yeniden çıkabilecek. Bu işlem geri alınamaz.`)) { History.reset(); addLog('Bulmaca geçmişi sıfırlandı.', 'gold'); updatePoolInfo(); }
  });
  $('confirmYes').addEventListener('click', () => closeConfirm(true));
  $('confirmNo').addEventListener('click', () => closeConfirm(false));
  $('reNext').addEventListener('click', () => send({ t: 'next' }));
  $('btnMarketDone').addEventListener('click', () => send({ t: UI.V && UI.V.mode === 'online' ? 'ready' : 'marketDone' }));
  $('btnMarketForce').addEventListener('click', () => send({ t: 'marketDone' }));
  $('marketTabs').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) { UI.marketTab = +b.dataset.i; renderMarket(); } });
  $('marketGrid').addEventListener('click', async e => {
    const b = e.target.closest('button[data-oid]'); if (!b || b.disabled) return;
    const V = UI.V, M = V && V.market; if (!M) return;
    const as = V.mode === 'local' ? UI.marketTab : UI.meIdx(), p = V.players[as], o = M.offers.find(x => x.oid === b.dataset.oid);
    if (!p || !o) return;
    const mid = M.id;
    const ok = await confirmBox('Satın alma onayı', `${p.name}, "${o.name}" ürününü ${fmt(o.price)} puana alıyor. Kalan bakiye: ${fmt(p.total - o.price)} puan.`);
    if (ok && UI.V && UI.V.market && UI.V.market.id === mid) send({ t: 'buy', oid: o.oid, as });
  });
  $('goMenu').addEventListener('click', () => leaveRoom(true));
  $('goAgain').addEventListener('click', () => send({ t: 'restart' }));
  // Menü
  $('tabBtnOnline').addEventListener('click', () => { store.set('cf.tab', 'online'); showMenu('online'); });
  $('tabBtnLocal').addEventListener('click', () => { store.set('cf.tab', 'local'); showMenu('local'); });
  $('btnStart').addEventListener('click', () => startLocal(G.setup.count, G.setup.length));
  $('btnQuick').addEventListener('click', () => { G.setup.count = 1; G.setup.length = 'quick'; syncSetupButtons(); renderNames(); startLocal(1, 'quick'); });
  seg('segPlayers', v => { G.setup.count = +v; store.set('cf.setup.v1', G.setup); renderNames(); });
  seg('segLength', v => { G.setup.length = v; store.set('cf.setup.v1', G.setup); });
  seg('segLobbyLength', v => { store.set('cf.lobbyLen', v); if (Host.L && !S) { Host.L.lengthKey = v; Host.broadcastLobby(); } });
  $('btnHost').addEventListener('click', hostRoom);
  $('btnJoin').addEventListener('click', () => joinRoom());
  $('joinCode').addEventListener('input', e => { const c = Net.normCode(e.target.value); if (e.target.value !== c) e.target.value = c; });
  $('joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(); });
  $('onName').addEventListener('keydown', e => { if (e.key === 'Enter') { if (Net.normCode($('joinCode').value).length === 5) joinRoom(); } });
  $('btnLobbyStart').addEventListener('click', () => Host.start());
  $('btnLeave').addEventListener('click', () => leaveRoom(true));
  $('btnShare').addEventListener('click', shareInvite);
  $('btnCopy').addEventListener('click', copyInvite);
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { FX.resize(); renderBoard(); sizeTiles(); }, 120); });
  // Telefon kilitlenip açılınca bağlantıyı hemen tazele
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Net.role !== 'local' && (!Net.mq || !Net.mq.connected)) Net.reconnect(); });
  addEventListener('pagehide', () => { if (Net.role === 'client') Net.sendToHost({ t: 'bye', id: Net.myId }); });
  const unlock = () => { Sound.init(); };
  addEventListener('pointerdown', unlock, { once: true }); addEventListener('keydown', unlock, { once: true });
}

function buildBulbs() {
  const box = $('wheelBulbs'), n = 24;
  box.innerHTML = Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return `<i style="left:${50 + 50 * Math.cos(a)}%;top:${50 + 50 * Math.sin(a)}%"></i>`; }).join('');
}

async function init() {
  Pool.load(window.PUZZLE_DATA || []);
  History.load();
  Object.assign(G.setup, store.get('cf.setup.v1', {}));
  if (!Array.isArray(G.setup.names) || G.setup.names.length < 4) G.setup.names = (G.setup.names || []).concat(['Ayşe', 'Mehmet', 'Zeynep', 'Can']).slice(0, 4);
  G.setup.count = clamp(G.setup.count | 0 || 2, 1, 4);
  Wheel.canvas = $('wheel'); FX.cv = $('fx'); FX.ctx = FX.cv.getContext('2d'); FX.resize();
  Wheel.draw(); Wheel.apply(); buildBulbs();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => Wheel.draw());
  bindEvents(); applySettings(); syncSetupButtons(); renderNames(); renderKeyboard();
  $('onName').value = store.get('cf.name', '') || '';
  $('segLobbyLength').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === store.get('cf.lobbyLen', 'std')));
  let q; try { q = new URLSearchParams(location.search); } catch { q = new URLSearchParams(); }
  const inviteCode = Net.normCode(q.get('oda') || (location.hash.length === 6 ? location.hash.slice(1) : ''));
  // Yeniden yükleme sonrası odaya dönüş (telefon sekmeyi tazelediğinde)
  const hostSnap = sess.get('cf.host'), clientSnap = sess.get('cf.client');
  if (hostSnap && Date.now() - hostSnap.ts < 30 * 60000) {
    showMenu('online'); setBusy(true, `${hostSnap.code} odası geri yükleniyor…`);
    try { await Host.restore(hostSnap); UI.netMsg(''); } catch (e) { sess.del('cf.host'); UI.netMsg('Oda geri yüklenemedi: ' + e.message, 'bad'); }
    finally { setBusy(false); }
    return;
  }
  if (clientSnap && Date.now() - clientSnap.ts < 30 * 60000 && (!inviteCode || inviteCode === clientSnap.code)) {
    $('onName').value = clientSnap.name; showMenu('online');
    await joinRoom(clientSnap.code, clientSnap.s || 0);
    return;
  }
  if (inviteCode.length === 5) {
    $('joinCode').value = inviteCode;
    showMenu('online');
    UI.netMsg(`Davet: ${inviteCode} odası. Adını yazıp KATIL'a bas.`, 'invite');
    $(($('onName').value ? 'btnJoin' : 'onName')).focus();
  } else showMenu();
}

// Test ve hata ayıklama için dışa açılan arayüz
window.CF = { get S() { return S; }, get V() { return UI.V; }, G, Pool, History, Wheel, SLICES, SLICE_DEG, Net, Host, Client, UI, structuralFacts, buildOffers, hintLeaks, lettersOnly, choosePuzzle, layoutRows, send, act, viewFor, MiniMQTT };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
