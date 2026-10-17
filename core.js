/* =========================================================================
   OYUN SALONU — çekirdek (Vanilla JS, dış kütüphane yok)
     1-5  Yardımcılar, ortak bulmaca havuzu, ses, efektler
     6    Ayarlar          7  Küçük MQTT istemcisi (WebSocket)
     8    Ağ katmanı       9  Oyun kaydı ve oyun sözleşmesi
     10   Oda (yerel / online kurucu / katılımcı)
     11   Salon arayüzü    12 Menü bağlantıları ve açılış
   Oyunlar games/*.js dosyalarında CFX.registerGame ile eklenir.
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


/* ------------------------------------------------------------------ 6
   Ayarlar, ortak sabitler                                                  */
const COLORS = ['#19e3d0', '#ff3fa4', '#ffe14a', '#ff8a00', '#5aa2ff', '#2bd96b'];
const ROOM_MAX = 6;
const defaultSettings = { volume: 70, sound: true, music: true, anim: 'normal', rounds: 0, clueMode: 'auto' };
const G = { settings: Object.assign({}, defaultSettings, store.get('cf.settings.v1', {})), spinning: false, final: false };
const sess = {
  get(k) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* yok say */ } },
  del(k) { try { sessionStorage.removeItem(k); } catch { /* yok say */ } }
};
const rid = n => { const a = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = ''; const r = new Uint8Array(n); crypto.getRandomValues(r); r.forEach(x => { s += a[x % a.length]; }); return s; };
const cleanName = s => String(s || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
const initial = name => esc((name || '?').trim().charAt(0).toLocaleUpperCase(TR) || '?');
function show(id) { const e = $(id); if (e) e.hidden = false; }
function hide(id) { const e = $(id); if (e) e.hidden = true; }
let confirmResolve = null;
function confirmBox(title, text, yes = 'Onayla') {
  $('confirmTitle').textContent = title; $('confirmText').textContent = text; $('confirmYes').textContent = yes; show('confirm'); $('confirmYes').focus();
  return new Promise(r => { confirmResolve = r; });
}
function closeConfirm(v) { hide('confirm'); if (confirmResolve) { const r = confirmResolve; confirmResolve = null; r(v); } }

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
  stats: { rx: 0, tx: 0 },
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
    this.sub(this.base + 'h'); this.sub(this.base + 'f');
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
    this.sub(this.base + 'c/' + this.myId); this.sub(this.base + 'f');
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
        Room.onReconnect();
        return;
      } catch { await sleep(Math.min(8000, 1200 + k * 1500)); }
    }
    this.reconnecting = false;
  },
  onMessage(topic, payload) {
    this.stats.rx++;
    if (topic === this.base + 'i') { if (this.role === 'client' && payload === '') Room.clientMsg({ t: 'closed' }); return; }
    let m; try { m = JSON.parse(payload); } catch { return; }
    if (topic === this.base + 'f') { Room.fastMsg(m); return; }
    if (topic === this.base + 'h' && this.role === 'host') Room.hostMsg(m);
    else if (topic === this.base + 'c/' + this.myId && this.role === 'client') Room.clientMsg(m);
  },
  sendTo(id, obj) { this.stats.tx++; if (this.mq) this.mq.publish(this.base + 'c/' + id, JSON.stringify(obj)); },
  sendToHost(obj) { this.stats.tx++; if (this.mq) this.mq.publish(this.base + 'h', JSON.stringify(obj)); },
  publishFast(obj) { if (this.mq) this.mq.publish(this.base + 'f', JSON.stringify(obj), { qos: 0 }); },
  publishInfo(obj) { if (this.mq) this.mq.publish(this.base + 'i', obj ? JSON.stringify(obj) : '', { qos: 1, retain: true }); },
  leave() {
    const mq = this.mq;
    if (mq) { try { if (this.role === 'host') { this.publishInfo(null); Room.broadcast({ t: 'closed' }); } else if (this.role === 'client') this.sendToHost({ t: 'bye', id: this.myId }); } catch { /* */ } setTimeout(() => mq.close(), 250); }
    this.mq = null; this.role = 'local'; this.code = null; this.topics = []; this.setStatus('off');
  },
  shareLink() {
    const base = location.href.split('#')[0].split('?')[0];
    let extra = ''; try { const b = new URLSearchParams(location.search).get('broker'); if (b) extra = '&broker=' + encodeURIComponent(b); } catch { /* */ }
    return `${base}?oda=${this.code}${this.idx ? '&s=' + this.idx : ''}${extra}`;
  }
};

/* ------------------------------------------------------------------ 9
   Oyun kaydı
   Her oyun CFX.registerGame(def) ile eklenir. Sözleşme:
     id, name, icon, color, tagline, rules (kısa kural metni), min, max
     hotseat: true  → tek cihazda herkes sırayla aynı ekrandan oynar (görüntü 'all')
     bot: true      → tek cihazda bilgisayar rakip eklenebilir (botAct gerekli)
     localMin       → tek cihaz için en az insan sayısı (varsayılan min)
     options: [{ key, label, choices: [{ v, label }], def }]
     screen: 'app'  → kendi tam ekranını (#app) kullanır; yoksa #gameRoot içine çizer
   Oyunu yöneten cihazda (yerel ya da oda kurucusu):
     setup(players, opts, ctx) → state      (state JSON'a çevrilebilir olmalı; değilse serialize/deserialize)
     action(state, pi, a, ctx)               hamleyi doğrula, uygula, ctx.emit / ctx.sync
     view(state, viewer)                     viewer: oyuncu sırası | 'all' | -1 (izleyici); gizli bilgi verme
     turnOf(state) → pi | null               sıradaki oyuncu (bot ve bağlantısı kopan oyuncu için)
     botAct(state, pi, ctx)                  bilgisayarın hamlesi
     skipTurn(state, pi, ctx)                bağlantısı kopan oyuncunun sırasını geç
     onPresence(state, pi, online, ctx), resume(state, ctx), serialize(state), deserialize(obj)
   Her cihazda (çizim):
     mount(root, ui), render(view, ui), onEvent(ev, ui), unmount(), log(text, cls)
   ctx: { players, mode, hostPi, emit(ev, log, cls), sync(), later(ms, fn), end(result), isOnline(pi) }
   result: { title?, ranking: [{ pi, score?, label? }] (sıralı), note? }                         */
const Games = { list: [], byId: {} };
function registerGame(def) {
  if (!def || !def.id || Games.byId[def.id]) return;
  def.localMin = def.localMin || def.min;
  Games.list.push(def); Games.byId[def.id] = def;
}

/* ------------------------------------------------------------------ 10
   Oda: yerel ya da online; oyunu yöneten taraf + katılımcı tarafı          */
const Room = {
  mode: 'none',            // none | local | host | client
  members: [],             // kurucu: [{ cid, name, seat, lastSeen, online }]
  gameId: store.get('cf.lastGame', 'carkifelek'), opts: {},
  game: null,              // kurucu: { def, players, state, token, evSeq, result, botPending }
  viewSeq: 0, timers: new Set(), tickT: null, hbT: null, syncQ: false,
  // katılımcı tarafı
  rm: null, g: null, lastSeq: 0, lastEv: 0, lastMsg: 0, pingT: null, dogT: null, name: '',

  isRunner() { return this.mode === 'local' || this.mode === 'host'; },
  def() { return this.game ? this.game.def : null; },
  hostSeat() { return this.mode === 'local' ? 0 : (this.game ? this.game.players.findIndex(p => p.cid === Net.myId) : -1); },
  localViewer() {
    const d = this.def(); if (!d) return -1;
    if (this.mode === 'local') return d.hotseat ? 'all' : this.game.players.findIndex(p => !p.isBot);
    return this.hostSeat();
  },
  ctx() {
    const R = this, g = this.game;
    return {
      players: g.players, mode: this.mode === 'local' ? 'local' : 'online', hostPi: this.hostSeat(),
      emit: (ev, log, cls) => R.emit(ev, log, cls),
      sync: () => R.sync(),
      later: (ms, fn) => R.later(ms, fn),
      end: result => R.end(result),
      isOnline: pi => !!(g.players[pi] && (g.players[pi].isBot || g.players[pi].online))
    };
  },
  later(ms, fn) {
    const tok = this.game && this.game.token;
    const id = setTimeout(() => { this.timers.delete(id); if (this.game && this.game.token === tok) { try { fn(); } catch (e) { console.error(e); } } }, ms);
    this.timers.add(id);
  },
  clearTimers() { this.timers.forEach(clearTimeout); this.timers.clear(); },

  /* ---------- oyunu başlatma ---------- */
  startLocal(gameId, humans, bots, opts) {
    this.leave(true);
    this.mode = 'local';
    const players = humans.map((n, i) => ({ name: cleanName(n) || `Oyuncu ${i + 1}`, isBot: false }))
      .concat(Array.from({ length: bots }, (_, k) => ({ name: bots > 1 ? `Bilgisayar ${k + 1}` : 'Bilgisayar', isBot: true })));
    this.launch(gameId, players, opts);
  },
  launch(gameId, players, opts) {
    const def = Games.byId[gameId]; if (!def) return;
    this.clearTimers();
    players.forEach((p, i) => { p.color = COLORS[i % COLORS.length]; p.online = true; p.lastSeen = Date.now(); p.offSince = 0; });
    this.gameId = gameId; this.opts = Object.assign({}, opts);
    store.set('cf.lastGame', gameId);
    this.game = { def, players, state: null, token: rid(8), evSeq: 0, result: null, botPending: false };
    this.viewSeq += 1;
    UI.enterGame(def, this.game.token);
    try { this.game.state = def.setup(players, this.opts, this.ctx()); } catch (e) { console.error(e); }
    this.broadcastRoom();
    this.sync();
  },
  again() { if (!this.isRunner() || !this.game) return; const players = this.game.players.map(p => ({ name: p.name, cid: p.cid, isBot: p.isBot })); this.launch(this.gameId, players, this.opts); },
  toLobby() {
    if (!this.isRunner()) return;
    this.clearTimers(); this.game = null;
    if (this.mode === 'local') { this.mode = 'none'; UI.exitGame(); UI.showMenu('local'); return; }
    UI.exitGame(); this.broadcastRoom(); this.persist();
  },

  /* ---------- oyun sırasında ---------- */
  act(pi, a) {
    const g = this.game; if (!g || !a || typeof a.t !== 'string') return;
    if (g.result) return;
    if (pi == null || pi < 0 || pi >= g.players.length) return;
    try { g.def.action(g.state, pi, a, this.ctx()); } catch (e) { console.error('Hamle hatası', e); }
  },
  emit(ev, log, cls) {
    const g = this.game; if (!g) return;
    if (log) ev.log = log; if (cls) ev.cls = cls;
    ev.n = ++g.evSeq; ev.g = g.token;
    UI.gameEvent(ev);
    if (this.mode === 'host') this.broadcast({ t: 'ev', e: ev });
  },
  sync() { if (this.syncQ) return; this.syncQ = true; queueMicrotask(() => { this.syncQ = false; this.doSync(); }); },
  viewFor(viewer) {
    const g = this.game;
    let v = null; try { v = g.def.view(g.state, viewer); } catch (e) { console.error('Görüntü hatası', e); }
    return { gid: g.def.id, g: g.token, seq: ++this.viewSeq, me: viewer, ht: Date.now(), v };
  },
  doSync() {
    const g = this.game; if (!g || !g.state) return;
    UI.gameView(this.viewFor(this.localViewer()));
    if (this.mode === 'host') {
      this.members.forEach((m, i) => {
        if (i === 0) return;
        const seat = g.players.findIndex(p => p.cid === m.cid);
        Net.sendTo(m.cid, { t: 'view', v: this.viewFor(seat) });
      });
      this.persist();
    }
    this.checkBot();
  },
  checkBot() {
    const g = this.game; if (!g || g.result || !g.def.turnOf || !g.def.botAct || g.botPending) return;
    const pi = g.def.turnOf(g.state);
    if (pi == null || !g.players[pi] || !g.players[pi].isBot) return;
    g.botPending = true;
    this.later(g.def.botDelay || 900, () => { g.botPending = false; try { g.def.botAct(g.state, pi, this.ctx()); } catch (e) { console.error('Bot hatası', e); } });
  },
  end(result) {
    const g = this.game; if (!g || g.result) return;
    const ranking = (result && result.ranking || []).map(r => ({ pi: r.pi, name: g.players[r.pi] ? g.players[r.pi].name : '?', color: g.players[r.pi] ? g.players[r.pi].color : '#fff', score: r.score, label: r.label }));
    g.result = { title: result && result.title || '', note: result && result.note || '', ranking };
    this.sync();
    this.broadcastRoom();
  },

  /* ---------- oda (online kurucu) ---------- */
  async host(name) {
    this.leave(true);
    await Net.host();
    this.mode = 'host';
    this.members = [{ cid: Net.myId, name, seat: true, lastSeen: Date.now(), online: true }];
    this.game = null;
    this.publishInfo();
    this.startTimers();
    this.broadcastRoom();
  },
  publishInfo() { Net.publishInfo({ host: Net.myId, code: Net.code, ts: Date.now() }); },
  startTimers() {
    clearInterval(this.tickT); clearInterval(this.hbT);
    this.tickT = setInterval(() => this.tick(), 2000);
    this.hbT = setInterval(() => this.broadcast({ t: 'hb' }), 5000);
  },
  broadcast(m) { this.members.forEach((x, i) => { if (i > 0) Net.sendTo(x.cid, m); }); },
  roomFor(i) {
    const g = this.game;
    return { t: 'room', code: Net.code, s: Net.idx, you: i, gameId: this.gameId, opts: this.opts,
      members: this.members.map(m => ({ name: m.name, online: m.online, seat: m.seat })),
      active: g ? { gameId: g.def.id, token: g.token, players: g.players.map(p => ({ name: p.name, color: p.color })) } : null,
      result: g ? g.result : null };
  },
  broadcastRoom() {
    if (this.mode === 'local') { UI.onRoom({ t: 'room', you: 0, local: true, gameId: this.gameId, opts: this.opts, members: [], active: this.game ? { gameId: this.game.def.id, token: this.game.token, players: this.game.players } : null, result: this.game ? this.game.result : null }); return; }
    if (this.mode !== 'host') return;
    UI.onRoom(this.roomFor(0));
    this.members.forEach((m, i) => { if (i > 0) Net.sendTo(m.cid, this.roomFor(i)); });
    this.persist();
  },
  setGame(id) { if (this.mode !== 'host' || this.game || !Games.byId[id]) return; this.gameId = id; this.opts = {}; store.set('cf.lastGame', id); this.broadcastRoom(); },
  setOpt(k, v) { if (this.mode !== 'host' || this.game) return; this.opts[k] = v; this.broadcastRoom(); },
  toggleSeat(i) { if (this.mode !== 'host' || this.game || !this.members[i]) return; this.members[i].seat = !this.members[i].seat; this.broadcastRoom(); },
  seated() { return this.members.filter(m => m.seat && m.online); },
  startOnline() {
    if (this.mode !== 'host' || this.game) return;
    const def = Games.byId[this.gameId]; if (!def) return;
    const seated = this.seated().slice(0, def.max);
    if (seated.length < def.min) return;
    this.launch(def.id, seated.map(m => ({ name: m.name, cid: m.cid, isBot: false })), this.opts);
  },
  hostMsg(m) {
    if (!m || typeof m.id !== 'string' || m.id === Net.myId) return;
    const now = Date.now();
    let k = this.members.findIndex(x => x.cid === m.id);
    if (m.t === 'hello') {
      const name = cleanName(m.name) || 'Misafir';
      if (k < 0) {
        if (this.members.length >= ROOM_MAX) { Net.sendTo(m.id, { t: 'full' }); return; }
        this.members.push({ cid: m.id, name, seat: true, lastSeen: now, online: true });
        k = this.members.length - 1;
        UI.toast(`${name} odaya katıldı`);
      } else { Object.assign(this.members[k], { name: this.game ? this.members[k].name : name, lastSeen: now }); }
      this.presence(k, true);
      Net.sendTo(m.id, this.roomFor(k));
      if (this.game) { const seat = this.game.players.findIndex(p => p.cid === m.id); Net.sendTo(m.id, { t: 'view', v: this.viewFor(seat) }); }
      this.broadcastRoom();
      return;
    }
    if (k < 0) return;
    if (m.t === 'bye') {
      if (!this.game) { this.members.splice(k, 1); this.broadcastRoom(); }
      else { this.members[k].lastSeen = 0; this.tick(); }
      return;
    }
    this.members[k].lastSeen = now;
    if (!this.members[k].online) this.presence(k, true);
    if (m.t === 'act' && m.a && this.game) {
      const seat = this.game.players.findIndex(p => p.cid === m.id);
      if (seat >= 0) this.act(seat, m.a);
    }
  },
  presence(k, on) {
    const mem = this.members[k]; if (!mem) return;
    const changed = mem.online !== on; mem.online = on;
    const g = this.game; if (!g) { if (changed) this.broadcastRoom(); return; }
    const seat = g.players.findIndex(p => p.cid === mem.cid);
    if (seat >= 0) {
      const p = g.players[seat];
      if (p.online !== on) {
        p.online = on; p.offSince = on ? 0 : Date.now();
        this.emit({ t: '__presence', pi: seat, on }, on ? `${p.name} yeniden bağlandı.` : `${p.name} bağlantısı koptu.`, on ? 'good' : 'bad');
        if (g.def.onPresence) { try { g.def.onPresence(g.state, seat, on, this.ctx()); } catch (e) { console.error(e); } }
        this.sync();
      }
    }
    if (changed) this.broadcastRoom();
  },
  tick() {
    if (this.mode !== 'host') return;
    const now = Date.now();
    this.members.forEach((m, i) => { if (i > 0) { const on = now - m.lastSeen < 12000; if (on !== m.online) this.presence(i, on); } });
    if (!this.game) {
      const before = this.members.length;
      this.members = this.members.filter((m, i) => i === 0 || now - m.lastSeen < 25000);
      if (before !== this.members.length) this.broadcastRoom();
      return;
    }
    const g = this.game;
    if (g.result || !g.def.turnOf || !g.def.skipTurn) return;
    const pi = g.def.turnOf(g.state), p = pi == null ? null : g.players[pi];
    if (p && !p.isBot && !p.online && now - p.offSince > 9000 && g.players.some(x => x.online && !x.isBot)) {
      this.emit({ t: '__skip', pi }, `${p.name} bağlı olmadığı için sıra geçti.`, 'bad');
      try { g.def.skipTurn(g.state, pi, this.ctx()); } catch (e) { console.error(e); }
      p.offSince = now;
      this.sync();
    }
  },
  onReconnect() {
    if (this.mode === 'host') { this.publishInfo(); this.broadcastRoom(); if (this.game) this.sync(); }
    else if (this.mode === 'client') this.hello();
  },
  persist() {
    if (this.mode !== 'host') return;
    try {
      const g = this.game;
      sess.set('cf.room', { code: Net.code, idx: Net.idx, ts: Date.now(), members: this.members, gameId: this.gameId, opts: this.opts, viewSeq: this.viewSeq,
        game: g ? { id: g.def.id, players: g.players, token: g.token, evSeq: g.evSeq, result: g.result, state: g.def.serialize ? g.def.serialize(g.state) : g.state } : null });
    } catch (e) { console.warn('Yedek yazılamadı', e); }
  },
  async restore(snap) {
    Net.idx = snap.idx || 0;
    await Net.host(snap.code);
    this.mode = 'host';
    this.members = snap.members; this.gameId = snap.gameId; this.opts = snap.opts || {}; this.viewSeq = (snap.viewSeq || 0) + 1000;
    const now = Date.now(); this.members.forEach((m, i) => { m.lastSeen = now; if (i === 0) m.online = true; });
    if (snap.game && Games.byId[snap.game.id]) {
      const def = Games.byId[snap.game.id], sg = snap.game;
      this.game = { def, players: sg.players, token: sg.token, evSeq: sg.evSeq, result: sg.result, botPending: false,
        state: def.deserialize ? def.deserialize(sg.state) : sg.state };
      this.game.players.forEach(p => { p.lastSeen = now; });
      UI.enterGame(def, this.game.token);
      if (def.resume) { try { def.resume(this.game.state, this.ctx()); } catch (e) { console.error(e); } }
    }
    this.publishInfo(); this.startTimers(); this.broadcastRoom();
    if (this.game) { this.emit({ t: '__presence' }, 'Oda kurucusu yeniden bağlandı.', 'gold'); this.sync(); }
  },

  /* ---------- hızlı kanal (gerçek zamanlı oyunlar: konum vb.) ---------- */
  fastMsg(m) {
    if (!m || m.id === Net.myId || !UI.def || !UI.def.onFast) return;
    if (this.game && m.g !== this.game.token && this.mode === 'host') return;
    if (this.mode === 'client' && m.g !== this.g) return;
    try { UI.def.onFast(m, UI.uiApi); } catch (e) { console.error(e); }
  },
  fast(obj) {
    if (this.mode !== 'host' && this.mode !== 'client') return;
    const g = this.mode === 'host' ? (this.game && this.game.token) : this.g;
    Net.publishFast(Object.assign({ id: Net.myId, g, seat: UI.me }, obj));
  },

  /* ---------- katılımcı ---------- */
  async join(code, name, hint) {
    this.leave(true);
    this.name = name; this.g = null; this.lastSeq = 0; this.lastEv = 0;
    await Net.join(code, hint || 0);
    this.mode = 'client';
    this.lastMsg = Date.now();
    this.hello();
    clearInterval(this.pingT); clearInterval(this.dogT);
    this.pingT = setInterval(() => Net.sendToHost({ t: 'ping', id: Net.myId }), 4000);
    this.dogT = setInterval(() => { if (this.mode === 'client' && Date.now() - this.lastMsg > 15000 && Net.status === 'ok') UI.netToast('Oda kurucusuna ulaşılamıyor. Bekleniyor…'); }, 3000);
    sess.set('cf.client', { code, name, s: Net.idx, ts: Date.now() });
  },
  hello() { Net.sendToHost({ t: 'hello', id: Net.myId, name: this.name }); },
  send(a) {
    Sound.init();
    if (this.mode === 'client') { Net.sendToHost({ t: 'act', id: Net.myId, a }); return; }
    if (!this.isRunner() || !this.game) return;
    let pi;
    if (this.mode === 'local') {
      const v = this.localViewer();
      pi = v === 'all' ? (a.as != null ? a.as : ((this.game.def.turnOf && this.game.def.turnOf(this.game.state)) ?? 0)) : v;
      if (this.game.players[pi] && this.game.players[pi].isBot) return;   // bilgisayarın sırasında insan oynayamaz
    } else pi = this.hostSeat();
    this.act(pi, a);
  },
  clientMsg(m) {
    this.lastMsg = Date.now(); UI.netToast(null);
    switch (m.t) {
      case 'room': this.rm = m; UI.onRoom(m); break;
      case 'view': {
        const v = m.v; if (!v) return;
        if (v.g !== this.g) { this.g = v.g; this.lastSeq = 0; this.lastEv = 0; }
        if (v.seq <= this.lastSeq) return;
        this.lastSeq = v.seq; UI.gameView(v); break;
      }
      case 'ev': {
        const e = m.e; if (!e) return;
        if (e.g !== this.g) { this.g = e.g; this.lastSeq = 0; this.lastEv = 0; }
        if (e.n <= this.lastEv) return;
        this.lastEv = e.n; UI.gameEvent(e); break;
      }
      case 'full': this.leave(); UI.netMsg('Oda dolu.', 'bad'); break;
      case 'closed': this.leave(); UI.netMsg('Oda kurucusu odayı kapattı.', 'bad'); break;
      default: break;
    }
  },

  /* ---------- çıkış ---------- */
  leave(silent) {
    this.clearTimers();
    clearInterval(this.tickT); clearInterval(this.hbT); clearInterval(this.pingT); clearInterval(this.dogT);
    if (this.mode === 'host' || this.mode === 'client') Net.leave();
    sess.del('cf.room'); sess.del('cf.client');
    this.mode = 'none'; this.members = []; this.game = null; this.rm = null; this.g = null;
    UI.exitGame();
    if (!silent) UI.showMenu();
  }
};

/* ------------------------------------------------------------------ 11
   Salon arayüzü: menü, lobi, oyun ekranı, sonuçlar                          */
const isPhone = () => innerWidth < 760;
const UI = {
  def: null, token: null, view: null, me: -1, rm: null, menuGame: null, mounted: false,
  api() {
    const self = this;
    return {
      send: a => Room.send(a),
      get me() { return self.me; },
      get mode() { return Room.mode === 'local' ? 'local' : 'online'; },
      get isHost() { return Room.mode === 'local' || Room.mode === 'host'; },
      get players() { return self.rm && self.rm.active ? self.rm.active.players : []; },
      log: (t, c) => self.log(t, c),
      fast: obj => Room.fast(obj),
      hostNow: () => Date.now() + (Room.isRunner() ? 0 : (self.clockOff || 0)),
      root: null
    };
  },
  enterGame(def, token) {
    if (this.def === def && this.token === token && this.mounted) return;
    this.exitGame();
    this.def = def; this.token = token; this.view = null;
    hide('menu'); hide('lobby'); hide('results');
    const ownScreen = def.screen === 'app';
    $('app').hidden = !ownScreen; $('gameScreen').hidden = ownScreen;
    if (!ownScreen) { $('gIcon').textContent = def.icon || '🎲'; $('gName').textContent = def.name; $('gameRoot').innerHTML = ''; $('gLog').innerHTML = ''; document.body.style.setProperty('--game-accent', def.color || '#19e3d0'); }
    this.uiApi = this.api(); this.uiApi.root = ownScreen ? $('app') : $('gameRoot');
    try { def.mount && def.mount(this.uiApi.root, this.uiApi); } catch (e) { console.error(e); }
    this.mounted = true;
    document.body.dataset.game = def.id;
  },
  exitGame() {
    if (this.def && this.mounted) { try { this.def.unmount && this.def.unmount(); } catch (e) { console.error(e); } }
    this.def = null; this.token = null; this.view = null; this.mounted = false; this.me = -1;
    G.final = false; G.spinning = false; Sound.updateMusic();
    document.body.classList.remove('final', 'spinning', 'pick'); delete document.body.dataset.game;
    $('app').hidden = true; $('gameScreen').hidden = true; hide('results');
  },
  gameView(pkt) {
    const def = Games.byId[pkt.gid]; if (!def) return;
    if (this.def !== def || this.token !== pkt.g) this.enterGame(def, pkt.g);
    this.me = pkt.me; this.view = pkt.v;
    if (pkt.ht) { const off = pkt.ht - Date.now(); this.clockOff = this.clockN ? (Math.abs(off - this.clockOff) > 2000 ? off : this.clockOff * .8 + off * .2) : off; this.clockN = (this.clockN || 0) + 1; }
    if (pkt.v) { try { def.render(pkt.v, this.uiApi); } catch (e) { console.error('Çizim hatası', e); } }
  },
  gameEvent(ev) {
    const def = this.def; if (!def) return;
    if (ev.log) this.log(ev.log, ev.cls);
    if (ev.t && ev.t.startsWith('__')) return;
    try { def.onEvent && def.onEvent(ev, this.uiApi); } catch (e) { console.error(e); }
  },
  log(text, cls = '') {
    if (this.def && this.def.log) { this.def.log(text, cls); return; }
    const t = new Date(), li = document.createElement('li'); if (cls) li.className = cls;
    li.innerHTML = `<time>${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}</time><span>${esc(text)}</span>`;
    const ol = $('gLog'); ol.prepend(li); while (ol.children.length > 60) ol.lastChild.remove();
  },
  toast(text) { this.log(text, 'gold'); const t = $('netToast'); if (!t.hidden) return; },
  onRoom(rm) {
    this.rm = rm;
    if (rm.active) {
      const def = Games.byId[rm.active.gameId];
      if (def && (this.def !== def || this.token !== rm.active.token)) this.enterGame(def, rm.active.token);
      hide('lobby'); hide('menu');
      if (rm.result) this.showResults(rm); else hide('results');
    } else {
      if (this.def) this.exitGame();
      if (!rm.local) this.showLobby(rm);
    }
  },
  showResults(rm) {
    const r = rm.result, def = this.def;
    const medals = ['🥇', '🥈', '🥉'];
    $('resIcon').textContent = def ? def.icon : '🏆';
    $('resTitle').textContent = r.title || (r.ranking[0] ? `${r.ranking[0].name} kazandı!` : 'Oyun bitti');
    const place = r.ranking.map((x, i) => x.score == null ? i : r.ranking.filter(y => y.score != null && y.score > x.score).length);
    $('resBody').innerHTML = `<ol class="rank">${r.ranking.map((x, i) => `<li style="--pc:${x.color}"><span class="medal">${medals[place[i]] || (place[i] + 1) + '.'}</span><span class="av" style="--pc:${x.color}">${initial(x.name)}</span><b>${esc(x.name)}${x.pi === this.me ? ' <small>(sen)</small>' : ''}</b><span class="rs">${x.label != null ? esc(x.label) : (x.score != null ? fmt(x.score) : '')}</span></li>`).join('')}</ol>${r.note ? `<p class="muted">${esc(r.note)}</p>` : ''}`;
    const runner = Room.isRunner();
    $('resAgain').hidden = !runner; $('resLobby').hidden = !runner;
    $('resLobby').textContent = Room.mode === 'local' ? 'Oyun seçimine dön' : 'Lobiye dön (oyun seç)';
    $('resWait').hidden = runner; $('resLeave').hidden = Room.mode !== 'client';
    if ($('results').hidden) { show('results'); FX.confetti(160); Sound.fanfare(); }
  },
  netStatus(s) {
    document.querySelectorAll('.room-chip').forEach(c => { c.hidden = s === 'off'; });
    document.querySelectorAll('.room-chip-code').forEach(c => { c.textContent = Net.code || '-----'; });
    document.querySelectorAll('.net-dot').forEach(d => { d.className = 'net-dot ' + (s === 'ok' ? 'ok' : s === 'wait' ? 'wait' : ''); });
    document.body.classList.toggle('online', s !== 'off');
    if (s === 'wait') this.netToast('Bağlantı koptu, yeniden bağlanılıyor…'); else if (s === 'ok') this.netToast(null);
  },
  netToast(text) { const t = $('netToast'); if (!text) { t.hidden = true; return; } t.textContent = text; t.hidden = false; },
  netMsg(text, cls) { const m = $('netMsg'); m.textContent = text || ''; m.className = 'net-msg ' + (cls || ''); if (text && cls === 'bad') this.showMenu('online'); },

  /* ---------- menü ---------- */
  showMenu(tab) {
    hide('lobby'); hide('results'); show('menu');
    const t = tab || store.get('cf.tab', 'online');
    store.set('cf.tab', t);
    $('tabOnline').hidden = t !== 'online'; $('tabLocal').hidden = t !== 'local';
    $('tabBtnOnline').classList.toggle('on', t === 'online'); $('tabBtnLocal').classList.toggle('on', t === 'local');
    if (t === 'local') this.renderLocal();
    $('poolInfo').textContent = `${Games.list.length} oyun · Çarkıfelek havuzunda ${fmt(Pool.list.length)} bulmaca`;
  },
  gameCards(sel, clickable, filter) {
    return Games.list.filter(filter || (() => true)).map(d => `<button type="button" class="gcard ${d.id === sel ? 'on' : ''}" style="--gc:${d.color}" data-gid="${d.id}" ${clickable ? '' : 'disabled'}>
      <span class="gc-icon">${d.icon}</span><span class="gc-txt"><b>${esc(d.name)}</b><small>${esc(d.tagline)}</small></span>
      <span class="gc-pl">${d.min === d.max ? d.min : `${d.min}–${d.max}`} kişi</span></button>`).join('');
  },
  optionRows(def, opts, editable, prefix) {
    return (def.options || []).map(o => {
      const cur = opts[o.key] != null ? opts[o.key] : o.def;
      if (o.choices.length > 5) return `<div class="opt-row"><span>${esc(o.label)}</span><select class="opt-select" data-${prefix}opt="${o.key}" ${editable ? '' : 'disabled'}>${o.choices.map(c => `<option value="${esc(String(c.v))}" ${String(c.v) === String(cur) ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select></div>`;
      return `<div class="opt-row"><span>${esc(o.label)}</span><div class="seg small">${o.choices.map(c => `<button type="button" class="${String(c.v) === String(cur) ? 'on' : ''}" data-${prefix}opt="${o.key}" data-v="${esc(String(c.v))}" ${editable ? '' : 'disabled'}>${esc(c.label)}</button>`).join('')}</div></div>`;
    }).join('');
  },
  localState: { gameId: store.get('cf.localGame', 'carkifelek'), humans: 2, bots: 0, opts: {} },
  renderLocal() {
    const L = this.localState; const def = Games.byId[L.gameId] || Games.list[0]; L.gameId = def.id;
    $('localGames').innerHTML = this.gameCards(L.gameId, true);
    const maxH = def.hotseat ? def.max : 1;
    L.humans = clamp(L.humans, def.localMin, maxH);
    const maxBots = def.bot ? Math.max(0, def.max - L.humans) : 0;
    L.bots = clamp(L.bots, (L.humans < def.min && def.bot) ? def.min - L.humans : 0, maxBots);
    const names = store.get('cf.localNames', ['Ayşe', 'Mehmet', 'Zeynep', 'Can']);
    let h = `<div class="ls-head"><span class="gc-icon">${def.icon}</span><div><b>${esc(def.name)}</b><p>${esc(def.rules || def.tagline)}</p></div></div>`;
    if (maxH > 1 || def.localMin < maxH) h += `<div class="opt-row"><span>Bu cihazda oynayan</span><div class="seg small">${Array.from({ length: maxH - def.localMin + 1 }, (_, k) => k + def.localMin).map(n => `<button type="button" data-hum="${n}" class="${n === L.humans ? 'on' : ''}">${n} kişi</button>`).join('')}</div></div>`;
    if (def.bot) h += `<div class="opt-row"><span>Bilgisayar rakip</span><div class="seg small">${Array.from({ length: maxBots + 1 }, (_, k) => k).filter(n => L.humans + n >= def.min).map(n => `<button type="button" data-bot="${n}" class="${n === L.bots ? 'on' : ''}">${n === 0 ? 'Yok' : n}</button>`).join('')}</div></div>`;
    h += this.optionRows(def, L.opts, true, 'l');
    h += `<div class="names">${Array.from({ length: L.humans }, (_, i) => `<label><span class="dot" style="background:${COLORS[i]}"></span><input id="lname${i}" maxlength="16" value="${esc(names[i] || '')}" aria-label="${i + 1}. oyuncunun adı"></label>`).join('')}</div>`;
    const ok = L.humans + L.bots >= def.min;
    h += `<button class="btn btn-spin ls-start" id="btnLocalStart" type="button" ${ok ? '' : 'disabled'}>▶ ${esc(def.name).toLocaleUpperCase(TR)} BAŞLAT</button>`;
    if (!ok) h += `<p class="muted">Bu oyun en az ${def.min} kişiyle oynanır.</p>`;
    $('localSetup').innerHTML = h;
  },
  startLocalFromMenu() {
    const L = this.localState, def = Games.byId[L.gameId];
    const names = store.get('cf.localNames', ['Ayşe', 'Mehmet', 'Zeynep', 'Can']);
    const hum = Array.from({ length: L.humans }, (_, i) => { const v = cleanName(($('lname' + i) || {}).value) || names[i] || `Oyuncu ${i + 1}`; names[i] = v; return v; });
    store.set('cf.localNames', names);
    Sound.init();
    Room.startLocal(def.id, hum, L.bots, L.opts);
  },

  /* ---------- lobi ---------- */
  showLobby(rm) {
    hide('menu'); hide('results'); show('lobby');
    const host = Room.mode === 'host';
    $('roomCode').textContent = rm.code;
    $('shareLink').value = Net.shareLink();
    $('lobbyCount').textContent = `${rm.members.length}/${ROOM_MAX}`;
    const def = Games.byId[rm.gameId] || Games.list[0];
    const seatedIdx = rm.members.map((m, i) => (m.seat && m.online) ? i : -1).filter(i => i >= 0);
    const playing = new Set(seatedIdx.slice(0, def.max));
    $('lobbyPlayers').innerHTML = rm.members.map((m, i) => {
      const role = !m.online ? 'bağlantı yok' : playing.has(i) ? 'oynuyor' : 'izliyor';
      return `<button type="button" class="lp ${playing.has(i) ? '' : 'spect'}" style="--pc:${COLORS[i % COLORS.length]}" data-seat="${i}" ${host ? '' : 'disabled'}><span class="av" style="--pc:${COLORS[i % COLORS.length]}">${initial(m.name)}</span><b>${esc(m.name)}</b>${i === 0 ? '<span class="tagx">kurucu</span>' : ''}${i === rm.you ? '<span class="tagx me">sen</span>' : ''}<span class="role">${role}</span></button>`;
    }).join('');
    $('lobbyGames').innerHTML = this.gameCards(def.id, host);
    $('lobbyOpts').innerHTML = `<p class="lg-rules"><b>${def.icon} ${esc(def.name)}:</b> ${esc(def.rules || def.tagline)}</p>` + this.optionRows(def, rm.opts || {}, host, 'r');
    const n = Math.min(seatedIdx.length, def.max);
    const btn = $('btnLobbyStart');
    btn.hidden = !host; $('lobbyWait').hidden = host;
    btn.disabled = n < def.min;
    btn.textContent = n < def.min ? `${def.name} için en az ${def.min} oyuncu gerekli` : `▶ ${def.name.toLocaleUpperCase(TR)} BAŞLAT (${n} kişi)`;
    $('lobbyHint').textContent = host ? (seatedIdx.length > def.max ? `Bu oyun en fazla ${def.max} kişilik; fazla olanlar izler. Oyuncuya dokunarak oynayacak/izleyecek seçebilirsin.` : 'Oyuncuya dokunarak izleyici yapabilirsin.') : '';
    if (!host) $('lobbyWait').textContent = `Kurucu ${def.name} oyununu seçti. Başlatması bekleniyor…`;
  }
};

/* ------------------------------------------------------------------ 12
   Menü bağlantıları ve açılış                                               */
function myName() {
  const n = cleanName($('onName').value);
  if (!n) { UI.netMsg('Önce adını yaz.', 'bad'); $('onName').focus(); return null; }
  store.set('cf.name', n); return n;
}
function setBusy(on, text) { ['btnHost', 'btnJoin'].forEach(id => { $(id).disabled = on; }); if (on) { $('netMsg').textContent = text; $('netMsg').className = 'net-msg busy'; } }
async function hostRoom() {
  const name = myName(); if (!name) return;
  Sound.init(); setBusy(true, 'Oda kuruluyor…');
  try { await Room.host(name); UI.netMsg(''); }
  catch (e) { Room.leave(true); UI.netMsg(e.message + ' (claude.ai önizlemesinde online oyun çalışmaz; GitHub linkini kullan.)', 'bad'); }
  finally { setBusy(false); }
}
async function joinRoom(codeIn, hint) {
  const name = myName(); if (!name) return;
  const code = Net.normCode(codeIn || $('joinCode').value);
  if (code.length !== 5) { UI.netMsg('Oda kodu 5 karakter olmalı.', 'bad'); $('joinCode').focus(); return; }
  Sound.init(); setBusy(true, `${code} odasına bağlanılıyor…`);
  try {
    await Room.join(code, name, hint); UI.netMsg('');
    hide('menu'); show('lobby'); $('roomCode').textContent = code; $('shareLink').value = Net.shareLink();
    $('lobbyPlayers').innerHTML = '<p class="muted">Oda bilgisi bekleniyor…</p>'; $('lobbyGames').innerHTML = ''; $('lobbyOpts').innerHTML = ''; $('btnLobbyStart').hidden = true; $('lobbyWait').hidden = false; $('lobbyWait').textContent = 'Kurucuya bağlanılıyor…';
  } catch (e) { Room.leave(true); UI.netMsg(e.message, 'bad'); }
  finally { setBusy(false); }
}
async function shareInvite() {
  const url = Net.shareLink(), text = `Oyun Salonu'nda benim odama gel! Oda kodu: ${Net.code}`;
  if (navigator.share) { try { await navigator.share({ title: 'Çarkıfelek Oyun Salonu', text, url }); return; } catch { /* iptal */ } }
  copyInvite();
}
async function copyInvite() {
  const url = Net.shareLink();
  try { await navigator.clipboard.writeText(url); $('btnCopy').textContent = 'Kopyalandı ✓'; setTimeout(() => { $('btnCopy').textContent = 'Kopyala'; }, 1600); }
  catch { const i = $('shareLink'); i.focus(); i.select(); }
}
function applySettings() {
  const s = G.settings;
  document.body.classList.toggle('anim-low', s.anim === 'low');
  Sound.setVolume(s.volume / 100); Sound.musicOn = s.music; Sound.setEnabled(s.sound);
  document.querySelectorAll('.btn-sound').forEach(b => { b.textContent = s.sound ? '🔊' : '🔇'; });
  store.set('cf.settings.v1', s);
}
function openSettings() {
  const s = G.settings;
  $('setVolume').value = s.volume; $('setSound').checked = s.sound; $('setMusic').checked = s.music; $('setAnim').value = s.anim;
  $('setRounds').value = String(s.rounds); $('setClueMode').value = s.clueMode;
  $('historyInfo').textContent = `${fmt(History.seen())} / ${fmt(Pool.list.length)} Çarkıfelek bulmacası bu cihazda daha önce görüldü.`;
  $('btnResetGame').hidden = !(Room.isRunner() && Room.game);
  show('settings');
}
async function askLeave() {
  if (!$('menu').hidden) return;
  if (Room.mode === 'none') { UI.showMenu(); return; }
  if (Room.mode === 'local') { if (await confirmBox('Ana menüye dön', 'Devam eden oyun kapanacak.')) Room.leave(); return; }
  if (Room.mode === 'host' && Room.game && !Room.game.result) {
    const back = await confirmBox('Oyunu bitir', 'Oyun bitirilip lobiye dönülecek; oda açık kalır. Odayı tamamen kapatmak için lobideki "Odadan çık" düğmesini kullan.', 'Lobiye dön');
    if (back) Room.toLobby(); return;
  }
  const msg = Room.mode === 'host' ? 'Oda kapanacak ve arkadaşlarının oyunu bitecek.' : 'Odadan ayrılacaksın. Aynı kodla yeniden katılabilirsin.';
  if (await confirmBox('Odadan çık', msg)) Room.leave();
}

function bindCore() {
  document.querySelectorAll('.btn-sound').forEach(b => b.addEventListener('click', () => { Sound.init(); G.settings.sound = !G.settings.sound; applySettings(); }));
  document.querySelectorAll('.btn-settings').forEach(b => b.addEventListener('click', openSettings));
  document.querySelectorAll('.btn-menu').forEach(b => b.addEventListener('click', askLeave));
  document.querySelectorAll('.room-chip').forEach(b => b.addEventListener('click', () => { if (Net.code) { copyInvite(); UI.log(`Davet linki kopyalandı · oda ${Net.code}`, 'gold'); } }));
  $('btnCloseSettings').addEventListener('click', () => hide('settings'));
  $('setVolume').addEventListener('input', e => { G.settings.volume = +e.target.value; applySettings(); });
  $('setSound').addEventListener('change', e => { Sound.init(); G.settings.sound = e.target.checked; applySettings(); });
  $('setMusic').addEventListener('change', e => { Sound.init(); G.settings.music = e.target.checked; applySettings(); });
  $('setAnim').addEventListener('change', e => { G.settings.anim = e.target.value; applySettings(); });
  $('setRounds').addEventListener('change', e => { G.settings.rounds = +e.target.value; applySettings(); });
  $('setClueMode').addEventListener('change', e => { G.settings.clueMode = e.target.value; applySettings(); });
  $('btnNewGame').addEventListener('click', async () => { hide('settings'); askLeave(); });
  $('btnResetGame').addEventListener('click', async () => { hide('settings'); if (Room.isRunner() && Room.game && await confirmBox('Oyunu yeniden başlat', 'Aynı oyuncularla, sıfır puanla yeniden başlanacak.')) Room.again(); });
  $('btnResetHistory').addEventListener('click', async () => { hide('settings'); if (await confirmBox('Geçmişi sıfırla', `Bu cihazda görülen ${fmt(History.seen())} bulmacanın kaydı silinecek. Bu işlem geri alınamaz.`)) { History.reset(); UI.log('Bulmaca geçmişi sıfırlandı.', 'gold'); } });
  $('confirmYes').addEventListener('click', () => closeConfirm(true));
  $('confirmNo').addEventListener('click', () => closeConfirm(false));
  document.addEventListener('keydown', e => { if (!$('confirm').hidden && e.key === 'Escape') closeConfirm(false); });
  // menü
  $('tabBtnOnline').addEventListener('click', () => UI.showMenu('online'));
  $('tabBtnLocal').addEventListener('click', () => UI.showMenu('local'));
  $('localGames').addEventListener('click', e => { const b = e.target.closest('[data-gid]'); if (!b) return; UI.localState.gameId = b.dataset.gid; UI.localState.opts = {}; store.set('cf.localGame', b.dataset.gid); UI.renderLocal(); if (isPhone()) $('localSetup').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  $('localSetup').addEventListener('click', e => {
    const L = UI.localState, b = e.target.closest('button'); if (!b) return;
    const keep = () => { document.querySelectorAll('#localSetup input[id^=lname]').forEach((inp, i) => { const n = store.get('cf.localNames', ['Ayşe', 'Mehmet', 'Zeynep', 'Can']); n[i] = inp.value; store.set('cf.localNames', n); }); };
    if (b.dataset.hum) { keep(); L.humans = +b.dataset.hum; UI.renderLocal(); }
    else if (b.dataset.bot != null && b.dataset.bot !== undefined && b.hasAttribute('data-bot')) { keep(); L.bots = +b.dataset.bot; UI.renderLocal(); }
    else if (b.dataset.lopt) { keep(); L.opts[b.dataset.lopt] = b.dataset.v; UI.renderLocal(); }
    else if (b.id === 'btnLocalStart') UI.startLocalFromMenu();
  });
  $('btnHost').addEventListener('click', hostRoom);
  $('btnJoin').addEventListener('click', () => joinRoom());
  $('joinCode').addEventListener('input', e => { const c = Net.normCode(e.target.value); if (e.target.value !== c) e.target.value = c; });
  $('joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(); });
  // lobi
  $('lobbyGames').addEventListener('click', e => { const b = e.target.closest('[data-gid]'); if (b && !b.disabled) Room.setGame(b.dataset.gid); });
  $('lobbyOpts').addEventListener('click', e => { const b = e.target.closest('button[data-ropt]'); if (b && !b.disabled) Room.setOpt(b.dataset.ropt, b.dataset.v); });
  $('lobbyOpts').addEventListener('change', e => { const s = e.target.closest('select[data-ropt]'); if (s) Room.setOpt(s.dataset.ropt, s.value); });
  $('localSetup').addEventListener('change', e => { const s = e.target.closest('select[data-lopt]'); if (s) { UI.localState.opts[s.dataset.lopt] = s.value; } });
  $('lobbyPlayers').addEventListener('click', e => { const b = e.target.closest('[data-seat]'); if (b && !b.disabled) Room.toggleSeat(+b.dataset.seat); });
  $('btnLobbyStart').addEventListener('click', () => { Sound.init(); Room.startOnline(); });
  $('btnLeave').addEventListener('click', async () => { if (Room.mode !== 'host' || Room.members.length < 2 || await confirmBox('Odayı kapat', 'Oda kapanacak ve arkadaşların çıkarılacak.')) Room.leave(); });
  $('btnShare').addEventListener('click', shareInvite);
  $('btnCopy').addEventListener('click', copyInvite);
  // sonuçlar
  $('resAgain').addEventListener('click', () => { hide('results'); Room.again(); });
  $('resLobby').addEventListener('click', () => { hide('results'); Room.toLobby(); });
  $('resLeave').addEventListener('click', () => Room.leave());
  // genel
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => FX.resize(), 120); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && (Room.mode === 'host' || Room.mode === 'client') && (!Net.mq || !Net.mq.connected)) Net.reconnect(); });
  addEventListener('pagehide', () => { if (Room.mode === 'client') Net.sendToHost({ t: 'bye', id: Net.myId }); });
  const unlock = () => { Sound.init(); };
  addEventListener('pointerdown', unlock, { once: true }); addEventListener('keydown', unlock, { once: true });
}

async function boot() {
  Pool.load(window.PUZZLE_DATA || []);
  History.load();
  FX.cv = $('fx'); FX.ctx = FX.cv.getContext('2d'); FX.resize();
  bindCore(); applySettings();
  Games.list.forEach(d => { try { d.init && d.init(); } catch (e) { console.error(e); } });
  $('onName').value = store.get('cf.name', '') || '';
  let q; try { q = new URLSearchParams(location.search); } catch { q = new URLSearchParams(); }
  const invite = Net.normCode(q.get('oda') || '');
  const hostSnap = sess.get('cf.room'), clientSnap = sess.get('cf.client');
  if (hostSnap && Date.now() - hostSnap.ts < 30 * 60000) {
    UI.showMenu('online'); setBusy(true, `${hostSnap.code} odası geri yükleniyor…`);
    try { await Room.restore(hostSnap); UI.netMsg(''); } catch (e) { sess.del('cf.room'); UI.netMsg('Oda geri yüklenemedi: ' + e.message, 'bad'); }
    finally { setBusy(false); }
    return;
  }
  if (clientSnap && Date.now() - clientSnap.ts < 30 * 60000 && (!invite || invite === clientSnap.code)) {
    $('onName').value = clientSnap.name; UI.showMenu('online');
    await joinRoom(clientSnap.code, clientSnap.s || 0); return;
  }
  if (invite.length === 5) {
    $('joinCode').value = invite; UI.showMenu('online');
    UI.netMsg(`Davet: ${invite} odası. Adını yazıp KATIL'a bas.`, 'invite');
    $($('onName').value ? 'btnJoin' : 'onName').focus();
  } else UI.showMenu();
}

window.CFX = {
  TR, up, ALPHABET, EXTRA_KEYS, VOWELS, THICK, ROUNDED, isLetter, lettersOnly, wordsOf, rand, randInt, pick, shuffle, clamp, fmt, $, esc, sleep, store, sess, rid, cleanName, initial,
  hintLeaks, Pool, History, Sound, FX, banner, flash, centerOf, show, hide, confirmBox, COLORS, G, Net, Room, UI, Games, registerGame, isPhone, MiniMQTT
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot)); else setTimeout(boot);

})();
