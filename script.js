/* =========================================================================
   ÇARKIFELEK STÜDYO — oyun motoru (Vanilla JS)
   Bölümler:
     1. Yardımcılar ve Türkçe harf işlemleri
     2. Bulmaca havuzu, sızıntı denetimi, geçmiş (localStorage) ve seçim
     3. Ses motoru (Web Audio API)
     4. Çark (çizim, dönüş, açı → dilim eşlemesi)
     5. Efektler (parçacık, konfeti, bildirim)
     6. Merkezi oyun durumu ve akış
     7. Market ve ipucu üretimi
     8. Arayüz çizimi
     9. Menü / ayarlar bağlantıları
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
  spin() {
    return new Promise(resolve => {
      const target = randInt(0, SLICES.length - 1);
      const from = this.rot;
      const to = this.targetRotation(from, target, randInt(4, 6), rand(-1, 1));
      const dur = rand(4300, 6600) * (G.settings.anim === 'low' ? .75 : 1);
      const t0 = performance.now();
      let lastPeg = Math.floor(from / SLICE_DEG);
      this.spinning = true;
      const frame = now => {
        const t = clamp((now - t0) / dur, 0, 1);
        this.rot = from + (to - from) * this.ease(t);
        this.apply();
        const peg = Math.floor(this.rot / SLICE_DEG);
        if (peg !== lastPeg) {
          lastPeg = peg;
          Sound.tick(this.speedAt(t));
          const p = $('pointer'); p.classList.remove('flick'); void p.offsetWidth; p.classList.add('flick');
        }
        if (t < 1) requestAnimationFrame(frame);
        else {
          this.rot = to; this.apply(); this.spinning = false;
          const landed = this.indexAt(this.rot);
          if (landed !== target) console.error('Çark uyuşmazlığı', landed, target); // tasarım gereği olmamalı
          resolve(landed);                                                          // gerçek açıdan okunan dilim esas alınır
        }
      };
      requestAnimationFrame(frame);
    });
  }
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

/* ------------------------------------------------------------------ 6 */
const COLORS = ['#19e3d0', '#ff3fa4', '#ffe14a'];
const MODES = { quick: { rounds: 3, vowelCost: 100, label: 'Hızlı oyun' }, std: { rounds: 5, vowelCost: 200, label: 'Standart' }, long: { rounds: 8, vowelCost: 250, label: 'Uzun yarışma' } };
const SOLO_LIVES = 5;

const defaultSettings = { volume: 70, sound: true, music: true, anim: 'normal', rounds: 0, clueMode: 'auto' };
// Merkezi oyun durumu: tüm puanlar ve tur bilgisi yalnızca burada tutulur
const G = {
  settings: Object.assign({}, defaultSettings, store.get('cf.settings.v1', {})),
  setup: { count: 2, length: 'std', names: ['Ayşe', 'Mehmet', 'Zeynep'] },
  phase: 'menu',          // menu | idle | spinning | pickConsonant | pickVowel | solving | revealing | roundOver | market | over
  players: [], cur: 0, round: 0, rounds: 5, vowelCost: 200,
  puzzle: null, revealed: new Set(), guessed: new Set(), wheelValue: 0,
  roundDone: false, misses: 0, lives: SOLO_LIVES, roundToken: 0,
  sessionUsed: new Set(), lastCat: null, recentCats: [], catUse: {}, adapt: 0,
  nextPuzzle: null, market: null, clues: [], log: [], final: false, spinning: false, history: []
};

function newPlayers() {
  return G.setup.names.slice(0, G.setup.count).map((n, i) => ({
    id: i, name: (n || '').trim().slice(0, 16) || `Yarışmacı ${i + 1}`, color: COLORS[i],
    total: 0, hand: 0, coupons: 0, bought: [], solved: 0, correctLetters: 0, wrong: 0
  }));
}

function startGame() {
  Sound.init();
  const mode = MODES[G.setup.length];
  G.players = newPlayers();
  G.rounds = +G.settings.rounds || mode.rounds;
  G.vowelCost = mode.vowelCost;
  G.round = 0; G.cur = 0; G.clues = []; G.log = []; G.adapt = 0; G.catUse = {}; G.recentCats = []; G.lastCat = null; G.history = [];
  G.sessionUsed = new Set(); G.nextPuzzle = null; G.market = null;
  hide('menu'); hide('gameOver'); hide('roundEnd'); hide('market');
  $('log').innerHTML = '';
  addLog(`Yarışma başladı: ${G.players.map(p => p.name).join(', ')} · ${G.rounds} tur · ${mode.label}`, 'gold');
  startRound(choosePuzzle(1, G.rounds));
}

function startRound(puzzle) {
  G.round++;
  G.roundToken++;
  G.puzzle = puzzle;
  G.sessionUsed.add(puzzle.key); History.mark(puzzle);
  G.lastCat = puzzle.cat; G.recentCats = [puzzle.cat, ...G.recentCats].slice(0, 3); G.catUse[puzzle.cat] = (G.catUse[puzzle.cat] || 0) + 1;
  G.revealed = new Set(); G.guessed = new Set(); G.wheelValue = 0;
  G.roundDone = false; G.misses = 0; G.lives = SOLO_LIVES; G.market = null; G.nextPuzzle = null;
  G.players.forEach(p => { p.hand = 0; });
  G.cur = (G.round - 1) % G.players.length;               // her turu farklı yarışmacı açar
  [...puzzle.a].forEach((ch, i) => { if (!isLetter(ch)) G.revealed.add(i); });
  // Satın alınmış ipuçları yalnızca bu bulmacaya bağlıdır; eski bulmacaya ait olanlar düşer
  G.clues = G.clues.filter(c => c.puzzleKey === puzzle.key);
  if (G.settings.clueMode === 'auto') G.clues.forEach(c => { c.opened = true; });
  G.final = G.round === G.rounds && G.rounds > 1;
  document.body.classList.toggle('final', G.final);
  Sound.updateMusic();
  G.phase = 'idle';
  addLog(`${G.round}. tur · Kategori: ${puzzle.cat}`, 'gold');
  if (G.clues.length) addLog(`${G.clues.length} satın alınmış ipucu bu bulmacada geçerli.`);
  renderAll(true);
  setHint(`${curP().name} başlıyor: çarkı çevir, ünlü al ya da cevabı tahmin et.`);
  $('wheelResult').textContent = 'Çarkı çevir!';
  banner(G.final ? 'SON TUR!' : `${G.round}. TUR`, G.final ? 'pink' : '');
  if (G.final) FX.confetti(60);
}

const curP = () => G.players[G.cur];
const hiddenLetters = () => { const s = new Set(); [...G.puzzle.a].forEach((ch, i) => { if (!G.revealed.has(i)) s.add(ch); }); return s; };
const consonantsLeft = () => ALPHABET.concat(EXTRA_KEYS).some(l => !VOWELS.has(l) && !G.guessed.has(l) && hiddenLetters().has(l));
const unguessedConsonantKeys = () => ALPHABET.concat(EXTRA_KEYS).some(l => !VOWELS.has(l) && !G.guessed.has(l));
const vowelsLeft = () => [...VOWELS].some(v => !G.guessed.has(v));

function nextPlayer(reason) {
  G.wheelValue = 0;
  if (G.players.length === 1) {
    G.lives--;
    if (reason) addLog(`${reason} · kalan hak: ${G.lives}`, 'bad');
    if (G.lives <= 0) { finishRound(null, 'Hata hakkın bitti'); return; }
  } else {
    G.misses++;
    if (G.misses >= G.players.length * 6) { finishRound(null, 'Kimse çözemedi'); return; }
    G.cur = (G.cur + 1) % G.players.length;
    addLog(`Sıra ${curP().name} adlı yarışmacıda.`);
  }
  G.phase = 'idle';
  setHint(`Sıra ${curP().name}: çarkı çevir, ünlü al ya da cevabı tahmin et.`);
  renderAll();
}

async function doSpin() {
  if (G.phase !== 'idle' || Wheel.spinning || G.roundDone) return;
  Sound.init();
  if (!consonantsLeft()) {
    banner('ÜNSÜZ KALMADI', 'pink');
    setHint('Panoda yalnızca ünlü harfler kaldı: ünlü al ya da cevabı tahmin et.');
    return;
  }
  const token = G.roundToken, who = G.cur;
  G.phase = 'spinning'; G.spinning = true; document.body.classList.add('spinning'); Sound.updateMusic();
  $('wheelResult').textContent = 'Çark dönüyor…';
  renderAll();
  const idx = await Wheel.spin();
  G.spinning = false; document.body.classList.remove('spinning'); Sound.updateMusic();
  if (token !== G.roundToken || who !== G.cur || G.phase !== 'spinning') return; // tur sıfırlandıysa sonucu yok say
  const sl = SLICES[idx], p = G.players[who];
  const ww = $('wheelWrap'); ww.classList.remove('flash'); void ww.offsetWidth; ww.classList.add('flash');
  Sound.stop();
  G.lastSlice = sl;
  if (sl.kind === 'val') {
    G.wheelValue = sl.v; G.phase = 'pickConsonant';
    $('wheelResult').textContent = `${fmt(sl.v)} PUAN`;
    banner(`${fmt(sl.v)} PUAN`);
    addLog(`${p.name} çarkı çevirdi: ${fmt(sl.v)} puan.`);
    setHint('Bir ünsüz seç. Her geçiş bu puanı kazandırır.');
  } else if (sl.kind === 'pass') {
    $('wheelResult').textContent = 'PAS ✋';
    banner('PAS!', 'pink'); Sound.bad();
    addLog(`${p.name}: PAS geldi.`, 'bad');
    nextPlayer('PAS');
    return;
  } else if (sl.kind === 'bankrupt') {
    const lost = p.hand;
    p.hand = 0;
    $('wheelResult').textContent = 'İFLAS 💀';
    banner('İFLAS!', 'bad'); flash('bad'); Sound.bankrupt();
    addLog(`${p.name} İFLAS etti${lost ? `, ${fmt(lost)} el puanı kayboldu` : ''}.`, 'bad');
    nextPlayer('İFLAS');
    return;
  }
  renderAll();
}

function startVowel() {
  if (G.roundDone) return;
  if (G.phase === 'pickVowel') { G.phase = 'idle'; renderAll(); setHint('Ünlü alımı iptal edildi.'); return; }
  if (G.phase !== 'idle') return;
  const p = curP();
  if (!vowelsLeft()) { setHint('Denenecek ünlü kalmadı.'); return; }
  if (!p.coupons && p.hand < G.vowelCost) { setHint(`Ünlü almak için el puanın en az ${G.vowelCost} olmalı.`); Sound.bad(); return; }
  G.phase = 'pickVowel';
  setHint(p.coupons ? 'Ünlü kuponun kullanılacak: bir ünlü seç (iptal için butona tekrar bas).' : `Bir ünlü seç: ${G.vowelCost} puan düşülecek (iptal için butona tekrar bas).`);
  renderAll();
}

async function chooseLetter(L) {
  if (G.roundDone || G.guessed.has(L)) return;
  const vowel = VOWELS.has(L);
  const p = curP(), who = G.cur, token = G.roundToken;
  if (G.phase === 'pickConsonant') { if (vowel) { setHint('Çark puanıyla yalnızca ünsüz seçilebilir. Ünlüler satın alınır.'); return; } }
  else if (G.phase === 'pickVowel') { if (!vowel) { setHint('Şu an bir ünlü seçmelisin.'); return; } }
  else return;
  Sound.init();
  G.guessed.add(L);
  const positions = [...G.puzzle.a].map((ch, i) => ch === L ? i : -1).filter(i => i >= 0 && !G.revealed.has(i));
  const count = positions.length;
  let gain = 0;
  if (vowel) {
    if (p.coupons > 0) { p.coupons--; addLog(`${p.name} ünlü kuponu kullandı (${L}).`); }
    else p.hand -= G.vowelCost;
  } else if (count) {
    gain = G.wheelValue * count;
  }
  G.phase = 'revealing';
  renderAll();
  showBoard();
  if (count) {
    p.correctLetters++;
    await revealPositions(positions, token);
    if (token !== G.roundToken || who !== G.cur) return;
    if (gain) {
      p.hand += gain;
      banner(`+${fmt(gain)} PUAN!`, 'good');
      FX.burst(...centerOf($('board')), gain >= 1000 ? 70 : 35);
      if (gain >= 1000) FX.confetti(70);
    }
    flash('good'); pulse('board', 'good');
    addLog(`${p.name}: "${L}" ${count} kez var${gain ? ` → +${fmt(gain)}` : ''}.`, 'good');
    G.wheelValue = 0;
    if (allRevealed()) { finishRound(who, 'Bütün harfler açıldı'); return; }
    G.phase = 'idle';
    setHint(consonantsLeft() ? 'Tekrar çevir, ünlü al ya da cevabı tahmin et.' : 'Ünsüz kalmadı: ünlü al ya da tahmin et.');
    renderAll();
  } else {
    p.wrong++;
    Sound.bad(); flash('bad'); pulse('board', 'bad');
    banner(`"${L}" YOK`, 'bad');
    addLog(`${p.name}: "${L}" bulmacada yok.`, 'bad');
    nextPlayer(`"${L}" yok`);
  }
}

async function revealPositions(positions, token) {
  const delay = G.settings.anim === 'low' ? 120 : 330;
  for (const i of positions) {
    if (token !== G.roundToken) return;
    const t = document.querySelector(`.tile[data-i="${i}"]`);
    if (t) { t.classList.add('pending'); await sleep(delay * .5); }
    G.revealed.add(i);
    if (t) { t.classList.remove('pending'); t.classList.add('open', 'light'); t.textContent = G.puzzle.a[i]; }
    Sound.good();
    await sleep(delay * .5);
  }
}
const allRevealed = () => [...G.puzzle.a].every((ch, i) => G.revealed.has(i));

function openSolve() {
  if (G.roundDone || !['idle', 'pickConsonant'].includes(G.phase)) return;
  G.prevPhase = G.phase; G.phase = 'solving';
  $('solveForm').hidden = false; $('solveInput').value = ''; $('solveInput').focus();
  setHint('Cevabı yaz ve gönder. Yanlış tahminde sıra geçer.');
  renderAll();
}
function cancelSolve() { if (G.phase !== 'solving') return; G.phase = G.prevPhase === 'pickConsonant' ? 'pickConsonant' : 'idle'; $('solveForm').hidden = true; setHint(G.phase === 'pickConsonant' ? 'Bir ünsüz seç.' : 'Çarkı çevir, ünlü al ya da cevabı tahmin et.'); renderAll(); }
async function submitSolve(text) {
  if (G.phase !== 'solving' || G.roundDone) return;
  const guess = lettersOnly(text);
  if (!guess) { setHint('Önce bir tahmin yaz.'); return; }
  $('solveForm').hidden = true;
  const p = curP(), who = G.cur;
  if (guess === G.puzzle.key) {
    const rest = [...G.puzzle.a].map((ch, i) => i).filter(i => !G.revealed.has(i));
    G.phase = 'revealing'; renderAll();
    const token = G.roundToken;
    for (const i of rest) { G.revealed.add(i); const t = document.querySelector(`.tile[data-i="${i}"]`); if (t) { t.classList.add('open', 'light'); t.textContent = G.puzzle.a[i]; } }
    if (token === G.roundToken) finishRound(who, 'Doğru tahmin');
  } else {
    p.wrong++;
    Sound.bad(); flash('bad'); banner('YANLIŞ CEVAP', 'bad');
    addLog(`${p.name} yanlış tahmin etti: "${up(text.trim()).slice(0, 40)}".`, 'bad');
    G.phase = 'idle';
    nextPlayer('Yanlış tahmin');
  }
}

// Turu kapatır; puanlar bir defa ve yalnızca kazanana kesinleşir
function finishRound(winnerIdx, why) {
  if (G.roundDone) return;
  G.roundDone = true; G.phase = 'roundOver';
  G.puzzle.a.split('').forEach((ch, i) => G.revealed.add(i));
  const reward = G.puzzle.d * 250;
  let summary;
  if (winnerIdx != null) {
    const w = G.players[winnerIdx];
    const banked = w.hand + reward;
    w.total += banked; w.solved++;
    summary = { winner: w, banked, hand: w.hand, reward };
    addLog(`${w.name} bulmacayı çözdü! ${fmt(w.hand)} el puanı + ${fmt(reward)} çözüm ödülü = ${fmt(banked)} kesinleşti.`, 'good');
    Sound.solve(); setTimeout(() => Sound.fanfare(), 700);
    FX.confetti(180); flash('good');
    banner(`${w.name.toLocaleUpperCase(TR)} ÇÖZDÜ!`, 'good');
    // performansa göre zorluk ayarı: hızlı çözüm zorluğu artırır, zorlanma azaltır
    G.adapt = clamp(G.adapt + (G.misses <= G.players.length ? .35 : G.misses > G.players.length * 3 ? -.3 : .05), -.8, .8);
  } else {
    summary = { winner: null };
    addLog(`Tur çözülemeden bitti (${why}). El puanları kesinleşmedi.`, 'bad');
    Sound.bankrupt(); banner('TUR BİTTİ', 'bad');
    G.adapt = clamp(G.adapt - .4, -.8, .8);
  }
  G.history.push({ round: G.round, cat: G.puzzle.cat, answer: G.puzzle.a, winner: summary.winner ? summary.winner.name : null });
  G.players.forEach(p => { p.hand = 0; });
  G.wheelValue = 0;
  renderAll();
  setTimeout(() => showRoundEnd(summary, why), 1200);
}

function showRoundEnd(s, why) {
  $('reTitle').textContent = s.winner ? `${s.winner.name} kazandı!` : 'Bulmaca çözülemedi';
  $('reAnswer').innerHTML = G.puzzle.a.split('').map(ch => ch === ' ' ? '<span class="gap"></span>' : `<span>${esc(ch)}</span>`).join('');
  const rows = G.players.map(p => `<tr><td><span style="color:${p.color}">●</span> ${esc(p.name)}</td><td class="num">${fmt(p.total)}</td></tr>`).join('');
  $('reBody').innerHTML = (s.winner ? `<p style="text-align:center">El puanı <b>${fmt(s.hand)}</b> + çözüm ödülü <b>${fmt(s.reward)}</b> = <b style="color:var(--yellow)">${fmt(s.banked)}</b> puan kesinleşti.</p>`
    : `<p style="text-align:center">${esc(why)}. Bu turda kimse puan kesinleştiremedi.</p>`) +
    `<table class="score-table"><thead><tr><th>Yarışmacı</th><th class="num">Toplam puan</th></tr></thead><tbody>${rows}</tbody></table>` +
    (G.round < G.rounds ? '<p class="muted" style="text-align:center">Sıradaki adım: İpucu Marketi. Toplam puanınla bir sonraki bulmaca için ipucu alabilirsin.</p>' : '<p class="muted" style="text-align:center">Bu son turdu. Büyük finale geçiliyor.</p>');
  $('reNext').textContent = G.round < G.rounds ? 'MARKETE GİT 🛒' : 'BÜYÜK FİNAL 🏆';
  show('roundEnd');
}

function afterRoundEnd() {
  hide('roundEnd');
  if (G.phase !== 'roundOver') return;
  if (G.round >= G.rounds) endGame(); else openMarket();
}

function endGame() {
  G.phase = 'over';
  const max = Math.max(...G.players.map(p => p.total));
  const winners = G.players.filter(p => p.total === max);
  const rows = G.players.slice().sort((a, b) => b.total - a.total).map(p =>
    `<tr><td><span style="color:${p.color}">●</span> ${esc(p.name)}<div class="bought">${p.bought.length ? 'İpuçları: ' + p.bought.map(b => esc(b)).join(', ') : 'İpucu satın almadı'}</div></td><td class="num">${p.solved}</td><td class="num">${fmt(p.total)}</td></tr>`).join('');
  $('goBody').innerHTML = `<div class="winner"><div class="crown">🏆</div><div class="wname">${winners.map(w => esc(w.name)).join(' & ')}</div><div>${G.players.length === 1 ? 'Toplam puanın' : winners.length > 1 ? 'Berabere! Toplam puan' : 'Şampiyon · toplam puan'}: <b style="color:var(--yellow)">${fmt(max)}</b></div></div>
    <table class="score-table"><thead><tr><th>Yarışmacı</th><th class="num">Çözülen</th><th class="num">Toplam</th></tr></thead><tbody>${rows}</tbody></table>`;
  show('gameOver');
  FX.confetti(260); Sound.fanfare();
  document.body.classList.remove('final'); G.final = false; Sound.updateMusic();
  addLog(`Yarışma bitti. Kazanan: ${winners.map(w => w.name).join(' & ')} (${fmt(max)} puan).`, 'gold');
  renderAll();
}

/* ------------------------------------------------------------------ 7 */
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

function openMarket() {
  const next = choosePuzzle(G.round + 1, G.rounds);
  G.nextPuzzle = next;
  const prev = {}; (G.lastOffers || []).forEach(o => { prev[o.type] = o.price; });
  const offers = buildOffers(next, prev);
  G.lastOffers = offers;
  // Yeni market nesnesi: önceki elin teklifleri tamamen geçersiz olur
  G.market = { id: Date.now(), offers, viewer: 0, owned: G.players.map(() => new Set()), puzzleKey: next.key, nextCat: next.cat };
  G.phase = 'market';
  // En çok puanı olan oyuncudan başla
  G.market.viewer = G.players.reduce((bi, p, i, a) => p.total > a[bi].total ? i : bi, 0);
  renderMarket();
  const m = document.querySelector('.market-modal'); m.classList.remove('enter'); void m.offsetWidth; m.classList.add('enter');
  show('market');
  Sound.whoosh(); setTimeout(() => Sound.buy(), 250);
  FX.burst(innerWidth / 2, innerHeight * .25, 50, false);
  addLog(`İpucu Marketi açıldı (${offers.length} ürün). Sıradaki kategori: ${next.cat}.`, 'gold');
  renderAll();
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

function renderMarket() {
  const M = G.market; if (!M) return;
  const v = G.players[M.viewer];
  $('marketTabs').innerHTML = G.players.length > 1 ? G.players.map((p, i) =>
    `<button type="button" role="tab" aria-selected="${i === M.viewer}" class="${i === M.viewer ? 'on' : ''}" style="--pc:${p.color}" data-i="${i}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span>${esc(p.name)}</button>`).join('') : '';
  $('marketOwner').innerHTML = `<span class="av" style="--pc:${v.color}">${initial(v.name)}</span>
    <span class="who">${esc(v.name)}<small>alışveriş yapıyor</small></span>
    <span class="bal">${COIN}${fmt(v.total)}</span>${v.coupons ? `<span class="chip">🎟 ${v.coupons} ünlü kuponu</span>` : ''}`;
  $('marketNote').textContent = `İpuçları sıradaki bulmaca (${M.nextCat}) için geçerli ve yalnızca satın alana ait. ${G.settings.clueMode === 'auto' ? 'Tur başında otomatik açılır.' : 'Sıran geldiğinde istediğin an açarsın.'} Ürünler her el yenilenir.`;
  $('marketGrid').style.setProperty('--n', M.offers.length);
  $('marketGrid').innerHTML = M.offers.map(o => {
    const owned = M.owned[M.viewer].has(o.oid);
    const afford = v.total >= o.price;
    const label = owned ? 'SATIN ALINDI ✓' : afford ? 'SATIN AL' : 'PUAN YETERSİZ';
    return `<article class="card ${owned ? 'owned' : ''} ${!owned && !afford ? 'poor' : ''}" style="--lc:${o.lc}">
      <div class="tag-wrap"><span class="tag">${COIN}${o.sale ? `<s>${fmt(o.base)}</s>` : ''}${fmt(o.price)}</span></div>
      <div class="art">${ART[o.type] || ''}${o.sale && !owned ? '<span class="sale">İNDİRİM</span>' : ''}</div>
      ${owned ? '<span class="stamp">ALINDI ✓</span>' : ''}
      <div class="body">
        <span class="lvl">${o.level}</span><h3>${esc(o.name)}</h3>
        <p>${owned && o.text ? (G.settings.clueMode === 'auto' ? 'Sıradaki turun başında açılacak.' : 'Sıran gelince ipuçları panelinden açabilirsin.') : esc(o.desc)}</p>
        <button class="btn ${owned ? 'btn-ghost' : 'btn-spin'}" type="button" data-oid="${o.oid}" ${owned || !afford ? 'disabled' : ''}>${label}</button>
      </div>
    </article>`;
  }).join('');
}

async function buyOffer(oid) {
  const M = G.market; if (!M || G.phase !== 'market') return;
  const mid = M.id, viewer = M.viewer, p = G.players[viewer];
  const o = M.offers.find(x => x.oid === oid);
  if (!o) return;                                         // eski marketten kalan teklif geçersiz
  if (M.owned[viewer].has(oid)) return;              // aynı ürün iki kez alınamaz
  if (p.total < o.price) { Sound.bad(); return; }
  const ok = await confirmBox('Satın alma onayı', `${p.name}, "${o.name}" ürününü ${fmt(o.price)} puana alıyor. Kalan bakiye: ${fmt(p.total - o.price)} puan.`);
  if (!ok || !G.market || G.market.id !== mid || G.market.viewer !== viewer) return;
  if (p.total < o.price || M.owned[viewer].has(oid)) return;   // onay sırasında değişmiş olabilir
  p.total -= o.price;
  M.owned[viewer].add(oid);
  p.bought.push(o.name);
  if (o.type === 'coupon') { p.coupons++; addLog(`${p.name} Ünlü Kuponu aldı (−${fmt(o.price)}).`, 'gold'); }
  else {
    G.clues.push({ owner: viewer, puzzleKey: M.puzzleKey, title: o.name, text: o.text, opened: false });
    addLog(`${p.name} "${o.name}" ipucunu aldı (−${fmt(o.price)}).`, 'gold');
  }
  Sound.buy(); FX.burst(innerWidth / 2, innerHeight / 2, 30);
  renderMarket(); renderAll();
}

function closeMarket() {
  if (G.phase !== 'market' || !G.market) return;
  hide('market');
  const next = G.nextPuzzle;
  G.market = null;                                        // satılmayan teklifler geçersiz
  startRound(next);
}

/* ------------------------------------------------------------------ 8 */
let lastBoardKey = null;
function boardCols() { const w = $('board').clientWidth || 600; return w < 360 ? 10 : w < 470 ? 12 : 14; }
function layoutRows(answer, maxCols) {
  const words = answer.split(' ');
  const longest = Math.max(...words.map(w => w.length));
  const cols = Math.max(maxCols, longest);
  const rows = []; let row = [];
  let len = 0, idx = 0;
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
  const P = G.puzzle, board = $('board');
  if (!P) { board.innerHTML = ''; return; }
  const maxCols = boardCols();
  const key = P.key + ':' + maxCols;
  if (force || key !== lastBoardKey) {
    lastBoardKey = key;
    const { rows, cols } = layoutRows(P.a, maxCols);
    const widest = Math.max(...rows.map(r => r.reduce((s, x, i) => s + x.w.length + (i ? 1 : 0), 0)));
    const nCols = Math.max(widest, Math.min(cols, 10));
    board.dataset.cols = nCols;
    // Gizli harfler DOM'a hiç yazılmaz; yalnızca açılan karolar metin alır
    board.innerHTML = rows.map(r => `<div class="board-row">${r.map((x, wi) => (wi ? '<div class="tile blank"></div>' : '') +
      [...x.w].map((ch, k) => { const i = x.start + k; const letter = isLetter(ch); const open = G.revealed.has(i);
        return `<div class="tile ${letter ? 'letter' : 'punct'} ${open && letter ? 'open' : ''}" data-i="${i}">${open ? esc(ch) : ''}</div>`; }).join('')).join('')}</div>`).join('');
    sizeTiles();
  } else {
    board.querySelectorAll('.tile[data-i]').forEach(t => { const i = +t.dataset.i; if (G.revealed.has(i) && !t.textContent) { t.classList.add('open'); t.textContent = P.a[i]; } });
  }
}
function renderKeyboard() {
  const kb = $('keyboard');
  if (!kb.childElementCount) {
    kb.innerHTML = ALPHABET.concat(EXTRA_KEYS).map(l => `<button type="button" class="key ${VOWELS.has(l) ? 'vowel' : ''}" data-l="${l}" aria-label="${l} harfi">${l}</button>`).join('');
  }
  const armed = G.phase === 'pickConsonant' || G.phase === 'pickVowel';
  kb.classList.toggle('armed', armed);
  const present = G.puzzle ? new Set([...G.puzzle.a]) : new Set();
  kb.querySelectorAll('.key').forEach(k => {
    const l = k.dataset.l, used = G.guessed.has(l), v = VOWELS.has(l);
    k.classList.toggle('hit', used && present.has(l));
    k.classList.toggle('miss', used && !present.has(l));
    k.disabled = used || !armed || (G.phase === 'pickConsonant' && v) || (G.phase === 'pickVowel' && !v);
  });
}
function renderPlayers() {
  $('players').innerHTML = G.players.map((p, i) => `<div class="player ${i === G.cur && G.phase !== 'over' ? 'active' : ''}" style="--pc:${p.color}">
    <span class="dot"></span><span class="pname">${esc(p.name)}</span><span class="ptotal">${fmt(p.total)}</span>
    <span class="phand"><span>El: <b>${fmt(p.hand)}</b></span><span>${p.coupons ? `<span class="badge">🎟 ${p.coupons} kupon</span> ` : ''}<span class="badge">✓ ${p.solved}</span></span></span></div>`).join('')
    || '<p class="muted">Ana menüden yarışmacıları seç.</p>';
}
function renderClues() {
  const box = $('clues');
  const mine = G.puzzle ? G.clues.filter(c => c.puzzleKey === G.puzzle.key) : [];
  if (!mine.length) { box.innerHTML = '<p class="muted">Marketten alınan ipuçları burada görünür. Market her el bittiğinde açılır.</p>'; return; }
  box.innerHTML = mine.map((c, i) => {
    const p = G.players[c.owner];
    const canOpen = !c.opened && c.owner === G.cur && G.phase === 'idle';
    return `<div class="clue" style="--pc:${p.color}"><h4>${esc(p.name)} · ${esc(c.title)}</h4>${c.opened ? `<p>${esc(c.text)}</p>`
      : `<p class="muted">Kilitli ipucu. Sahibi sırası gelince açabilir.</p><button class="btn btn-vowel" type="button" data-clue="${G.clues.indexOf(c)}" ${canOpen ? '' : 'disabled'}>İPUCUNU AÇ</button>`}</div>`;
  }).join('');
}
function renderAll(forceBoard) {
  const P = G.puzzle, p = G.players[G.cur];
  $('roundLabel').textContent = G.rounds && G.round ? `${G.round} / ${G.rounds}` : '–';
  $('activeLabel').textContent = p ? p.name : '–';
  $('activeLabel').style.color = p ? p.color : '';
  $('activeTotal').textContent = p ? fmt(p.total) : '0';
  $('catLabel').textContent = P ? up(P.cat) : 'KATEGORİ';
  $('diffLabel').textContent = P ? ['', 'KOLAY', 'ORTA', 'ZOR', 'UZMAN'][P.d] + ` · ÖDÜL ${fmt(P.d * 250)}` : '';
  $('handInfo').textContent = p ? `${p.name} · El puanı: ${fmt(p.hand)}` : 'El puanı: 0';
  const li = $('livesInfo'); li.hidden = G.players.length !== 1 || !P; li.textContent = '❤'.repeat(Math.max(0, G.lives)) + '♡'.repeat(Math.max(0, SOLO_LIVES - G.lives)) + ' hata hakkı';
  $('vowelCost').textContent = p && p.coupons ? 'KUPON' : fmt(G.vowelCost);
  const idle = G.phase === 'idle' && !G.roundDone;
  $('btnSpin').disabled = !idle || Wheel.spinning;
  $('btnVowel').disabled = !(idle || G.phase === 'pickVowel') || !vowelsLeft() || (p && !p.coupons && p.hand < G.vowelCost && G.phase !== 'pickVowel');
  $('btnVowel').classList.toggle('on', G.phase === 'pickVowel');
  $('btnSolve').disabled = !['idle', 'pickConsonant'].includes(G.phase) || G.roundDone;
  renderBoard(forceBoard); renderKeyboard(); renderPlayers(); renderClues();
}
function showBoard() {
  const f = document.querySelector('.board-frame'), r = f.getBoundingClientRect();
  if (r.top < 0 || r.bottom > innerHeight) f.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
}
function setHint(t) { $('hintLine').textContent = t; }
function pulse(id, cls) { const el = $(id); el.classList.remove('good', 'bad'); void el.offsetWidth; el.classList.add(cls); }
function addLog(text, cls = '') {
  const t = new Date();
  G.log.unshift({ text, cls, t });
  G.log = G.log.slice(0, 60);
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

/* ------------------------------------------------------------------ 9 */
function renderNames() {
  $('names').innerHTML = Array.from({ length: G.setup.count }, (_, i) => `<label><span class="dot" style="background:${COLORS[i]}"></span><input id="name${i}" maxlength="16" value="${esc(G.setup.names[i] || '')}" aria-label="${i + 1}. yarışmacının adı"></label>`).join('');
  $('names').querySelectorAll('input').forEach((inp, i) => inp.addEventListener('input', () => { G.setup.names[i] = inp.value; store.set('cf.setup.v1', G.setup); }));
}
function seg(id, key) {
  $(id).addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $(id).querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    G.setup[key] = key === 'count' ? +b.dataset.v : b.dataset.v;
    store.set('cf.setup.v1', G.setup);
    if (key === 'count') renderNames();
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
  $('historyInfo').textContent = `${fmt(History.seen())} / ${fmt(Pool.list.length)} bulmaca daha önce görüldü. Yeni oyun bu geçmişi korur.`;
  show('settings');
}
function backToMenu() {
  G.roundToken++; G.phase = 'menu'; G.market = null;
  ['market', 'roundEnd', 'gameOver', 'settings'].forEach(hide);
  $('solveForm').hidden = true;
  document.body.classList.remove('final', 'spinning'); G.final = false; Sound.updateMusic();
  updatePoolInfo(); syncSetupButtons(); renderNames(); show('menu');
}
function updatePoolInfo() {
  $('poolInfo').textContent = `Havuzda ${fmt(Pool.list.length)} benzersiz bulmaca, ${Pool.stats.cats} kategori · ${fmt(History.seen())} tanesi bu cihazda daha önce görüldü.`;
}

function bindEvents() {
  $('btnSpin').addEventListener('click', doSpin);
  $('wheel').addEventListener('click', doSpin);
  $('btnVowel').addEventListener('click', startVowel);
  $('btnSolve').addEventListener('click', openSolve);
  $('solveCancel').addEventListener('click', cancelSolve);
  $('solveForm').addEventListener('submit', e => { e.preventDefault(); submitSolve($('solveInput').value); });
  $('keyboard').addEventListener('click', e => { const k = e.target.closest('.key'); if (k && !k.disabled) chooseLetter(k.dataset.l); });
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!$('confirm').hidden) { if (e.key === 'Escape') closeConfirm(false); return; }
    if (G.phase === 'pickConsonant' || G.phase === 'pickVowel') {
      const L = e.key.length === 1 ? up(e.key) : '';
      if (isLetter(L)) { const btn = document.querySelector(`.key[data-l="${L}"]`); if (btn && !btn.disabled) chooseLetter(L); }
    } else if (G.phase === 'idle' && e.code === 'Space' && document.activeElement === document.body) { e.preventDefault(); doSpin(); }
  });
  $('clues').addEventListener('click', e => {
    const b = e.target.closest('[data-clue]'); if (!b) return;
    const c = G.clues[+b.dataset.clue];
    if (c && !c.opened && c.owner === G.cur && G.phase === 'idle') { c.opened = true; Sound.special(); addLog(`${G.players[c.owner].name} "${c.title}" ipucunu açtı.`, 'gold'); renderClues(); }
  });
  $('btnSound').addEventListener('click', () => { Sound.init(); G.settings.sound = !G.settings.sound; applySettings(); });
  $('btnSettings').addEventListener('click', openSettings);
  $('btnCloseSettings').addEventListener('click', () => hide('settings'));
  $('btnMenu').addEventListener('click', async () => { if (G.phase === 'menu') return; if (await confirmBox('Ana menüye dön', 'Devam eden yarışma kapanacak. Puanlar kaydedilmez; bulmaca geçmişi korunur.')) backToMenu(); });
  $('setVolume').addEventListener('input', e => { G.settings.volume = +e.target.value; applySettings(); });
  $('setSound').addEventListener('change', e => { Sound.init(); G.settings.sound = e.target.checked; applySettings(); });
  $('setMusic').addEventListener('change', e => { Sound.init(); G.settings.music = e.target.checked; applySettings(); });
  $('setAnim').addEventListener('change', e => { G.settings.anim = e.target.value; applySettings(); });
  $('setRounds').addEventListener('change', e => { G.settings.rounds = +e.target.value; applySettings(); });
  $('setClueMode').addEventListener('change', e => { G.settings.clueMode = e.target.value; applySettings(); });
  $('btnNewGame').addEventListener('click', async () => { hide('settings'); if (G.phase === 'menu' || await confirmBox('Yeni oyun', 'Mevcut yarışma kapanıp ana menü açılacak. Bulmaca geçmişi korunur.')) backToMenu(); });
  $('btnResetGame').addEventListener('click', async () => { hide('settings'); if (G.phase === 'menu') return; if (await confirmBox('Oyunu sıfırla', 'Aynı yarışmacılarla 1. turdan, sıfır puanla yeniden başlanacak.')) { G.roundToken++; startGame(); } });
  $('btnResetHistory').addEventListener('click', async () => {
    hide('settings');
    if (await confirmBox('Geçmişi sıfırla', `Bu cihazda görülen ${fmt(History.seen())} bulmacanın kaydı silinecek ve hepsi yeniden çıkabilecek. Bu işlem geri alınamaz.`)) { History.reset(); addLog('Bulmaca geçmişi sıfırlandı.', 'gold'); updatePoolInfo(); }
  });
  $('confirmYes').addEventListener('click', () => closeConfirm(true));
  $('confirmNo').addEventListener('click', () => closeConfirm(false));
  $('reNext').addEventListener('click', afterRoundEnd);
  $('btnMarketDone').addEventListener('click', closeMarket);
  $('marketTabs').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b && G.market) { G.market.viewer = +b.dataset.i; renderMarket(); } });
  $('marketGrid').addEventListener('click', e => { const b = e.target.closest('button[data-oid]'); if (b && !b.disabled) buyOffer(b.dataset.oid); });
  $('goMenu').addEventListener('click', backToMenu);
  $('goAgain').addEventListener('click', () => { hide('gameOver'); startGame(); });
  $('btnStart').addEventListener('click', () => { Sound.init(); startGame(); });
  $('btnQuick').addEventListener('click', () => { Sound.init(); G.setup.count = 1; G.setup.length = 'quick'; syncSetupButtons(); renderNames(); startGame(); });
  seg('segPlayers', 'count'); seg('segLength', 'length');
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { FX.resize(); renderBoard(); sizeTiles(); }, 120); });
  // tarayıcı ses kısıtlaması: ilk etkileşimde ses bağlamını başlat
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
  if (!Array.isArray(G.setup.names) || G.setup.names.length < 3) G.setup.names = ['Ayşe', 'Mehmet', 'Zeynep'];
  Wheel.canvas = $('wheel'); FX.cv = $('fx'); FX.ctx = FX.cv.getContext('2d'); FX.resize();
  Wheel.draw(); Wheel.apply(); buildBulbs();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => Wheel.draw());
  bindEvents(); applySettings(); syncSetupButtons(); renderNames(); updatePoolInfo();
  // Açılışta boş olmasın: menünün arkasında örnek bir pano göster (cevap gizli)
  G.puzzle = null; renderAll();
  const extra = await Pool.loadExtra(); if (extra) updatePoolInfo();
}

// Test ve hata ayıklama için dışa açılan arayüz
window.CF = { G, Pool, History, Wheel, SLICES, SLICE_DEG, structuralFacts, buildOffers, hintLeaks, lettersOnly, choosePuzzle, layoutRows,
  _start: startGame, _spinTo: null, Sound };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
