/* =========================================================================
   OYUN SALONU — ÇARKIFELEK
   Çark, bulmaca panosu, ipucu marketi. Kendi tam ekranını (#app) kullanır.
   Oyun durumu yalnızca yöneten cihazda tutulur; diğer cihazlara gizli
   cevap içermeyen görüntü gider.
   ========================================================================= */
(() => {
'use strict';
const { TR, up, ALPHABET, EXTRA_KEYS, VOWELS, THICK, ROUNDED, isLetter, lettersOnly, wordsOf, rand, randInt, pick, shuffle, clamp, fmt, $, esc, sleep, store,
  hintLeaks, Pool, History, Sound, FX, banner, flash, centerOf, show, hide, confirmBox, COLORS, G, rid, cleanName, initial, isPhone } = CFX;

const MODES = { quick: { rounds: 3, vowelCost: 100, label: 'Hızlı oyun' }, std: { rounds: 5, vowelCost: 200, label: 'Standart' }, long: { rounds: 8, vowelCost: 250, label: 'Uzun yarışma' } };
const SOLO_LIVES = 5, REVEAL_MS = 320;
// Bulmaca seçim hafızası (yöneten cihazda): tekrar ve art arda kategori engeli
const M = { sessionUsed: new Set(), lastCat: null, recentCats: [], catUse: {}, adapt: 0 };
const send = a => CFX.Room.send(a);

function choosePuzzle(roundNo, totalRounds) {
  const prog = totalRounds > 1 ? (roundNo - 1) / (totalRounds - 1) : 0;
  const target = clamp(Math.round(1 + prog * 2.6 + M.adapt), 1, 4);
  let cands = Pool.list.filter(p => !M.sessionUsed.has(p.key));
  if (!cands.length) { M.sessionUsed.clear(); cands = Pool.list.slice(); }
  const noRepeatCat = cands.filter(p => p.cat !== M.lastCat && !M.recentCats.includes(p.cat));
  if (noRepeatCat.length) cands = noRepeatCat;
  else { const c2 = cands.filter(p => p.cat !== M.lastCat); if (c2.length) cands = c2; }
  // Önce hiç görülmemişler; hepsi görülmüşse en uzun süredir görülmeyenler (LRU)
  const fresh = cands.filter(p => !History.last(p));
  if (fresh.length) cands = fresh;
  else { cands = cands.slice().sort((x, y) => History.last(x) - History.last(y)); cands = cands.slice(0, Math.max(10, Math.ceil(cands.length * .15))); }
  const tiers = [p => p.d === target, p => Math.abs(p.d - target) === 1, () => true];
  for (const t of tiers) {
    const c = cands.filter(t);
    if (c.length) {
      // seans içinde az kullanılan kategorilere hafif öncelik
      const minUse = Math.min(...c.map(p => M.catUse[p.cat] || 0));
      const best = c.filter(p => (M.catUse[p.cat] || 0) === minUse);
      return pick(best.length ? best : c);
    }
  }
  return pick(Pool.list);
}


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


/* ------------------------------------------------------------------ 9
   Oyun motoru — tek doğru durum (S) yalnızca oyunu yöneten cihazda tutulur.
   Yerel oyunda bu cihaz, online oyunda oda kurucusu. Diğer cihazlar yalnızca
   kendilerine özel hazırlanmış görüntüyü (viewFor) alır; gizli cevap gönderilmez. */
let S = null;        // Çarkıfelek oyun durumu (yalnızca yöneten cihazda)
let ctx = null;      // çekirdeğin verdiği bağlam (emit, sync, later, end…)
const later = (ms, fn) => ctx.later(ms, fn);
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

function emit(ev, log, cls) { ctx.emit(ev, log, cls); }
function sync() { ctx.sync(); }

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
    g: S.token, mode: S.mode, phase: S.phase, me: viewer, host: ctx ? ctx.hostPi : 0, cur: S.cur, round: S.round, rounds: S.rounds, vowelCost: S.vowelCost, lastRound: S.lastRound,
    players: S.players.map(p => ({ name: p.name, color: p.color, total: p.total, hand: p.hand, coupons: p.coupons, solved: p.solved, online: p.online, bought: p.bought.slice() })),
    cat: P ? P.cat : '', d: P ? P.d : 1, board, guessed: [...S.guessed], wheelValue: S.wheelValue, lives: S.lives, rot: S.rot,
    spinning: S.phase === 'spinning' && S.spin ? { to: S.spin.to, left: Math.max(0, S.spin.end - Date.now()) } : null,
    clues,
    market: S.phase === 'market' && M ? { id: M.id, nextCat: M.nextCat, ready: M.ready.slice(), owned: M.owned.map(s => [...s]),
      offers: M.offers.map(o => ({ oid: o.oid, type: o.type, name: o.name, level: o.level, lc: o.lc, base: o.base, price: o.price, sale: o.sale, desc: o.desc, hasText: !!o.text })) } : null,
    summary: ['roundOver', 'market', 'over'].includes(S.phase) ? S.summary : null,
    final: S.phase === 'over' ? S.final : null,
    clueMode: G.settings.clueMode, code: CFX.Net.code
  };
}

function startGame(mode, players, lengthKey) {
  M.sessionUsed = new Set(); M.adapt = 0; M.catUse = {}; M.recentCats = []; M.lastCat = null;
  S = newState(mode, players, lengthKey);
  emit({ t: 'start' }, `Yarışma başladı: ${S.players.map(p => p.name).join(', ')} · ${S.rounds} tur · ${(MODES[lengthKey] || MODES.std).label}`, 'gold');
  startRound(choosePuzzle(1, S.rounds));
}

function startRound(puzzle) {
  S.round++;
  S.puzzle = puzzle;
  M.sessionUsed.add(puzzle.key); History.mark(puzzle);
  M.lastCat = puzzle.cat; M.recentCats = [puzzle.cat, ...M.recentCats].slice(0, 3); M.catUse[puzzle.cat] = (M.catUse[puzzle.cat] || 0) + 1;
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
  const hostLike = S.mode === 'local' || pi === ctx.hostPi;
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
  later(dur + 250, () => landSpin(idx));
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
    later(count * REVEAL_MS + 450, () => {
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
  if (guess === S.puzzle.key) {
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
    M.adapt = clamp(M.adapt + (S.misses <= S.players.length ? .35 : S.misses > S.players.length * 3 ? -.3 : .05), -.8, .8);
  } else {
    summary = { winner: null };
    emit({ t: 'roundEnd', winner: null }, `Tur çözülemeden bitti (${why}). El puanları kesinleşmedi.`, 'bad');
    M.adapt = clamp(M.adapt - .4, -.8, .8);
  }
  Object.assign(summary, { why, round: S.round, answer: S.puzzle.a, cat: S.puzzle.cat, last: S.round >= S.rounds });
  S.summary = summary;
  S.history.push({ round: S.round, cat: S.puzzle.cat, answer: S.puzzle.a, winner: winner != null ? S.players[winner].name : null });
  S.players.forEach(p => { p.hand = 0; });
  S.wheelValue = 0;
  sync();
  if (S.mode === 'online') later(12000, () => { if (S.phase === 'roundOver') afterRoundEnd(); });
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
  if (S.mode === 'online') { const id = S.market.id; later(150000, () => { if (S.phase === 'market' && S.market && S.market.id === id) closeMarket(); }); }
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
  const one = S.players.length === 1;
  ctx.end({
    title: one ? `Toplam puanın: ${fmt(max)}` : S.final.winners.length > 1 ? 'Berabere!' : `${S.players[S.final.winners[0]].name} şampiyon!`,
    ranking: S.final.rows.map(r => ({ pi: r.i, score: r.total, label: `${fmt(r.total)} puan · ${r.solved} çözüm` })),
    note: S.history.map(h => `${h.round}. ${h.answer}`).join(' · ')
  });
}


const CUI = {
  V: null, animating: new Set(), lastBoard: '', lastBoardKey: '', marketTab: 0, lastMarketId: null, reTimer: null, shownRe: null, hintUntil: 0, prevMyTurn: false, prevPhase: null,
  canAct() { const V = this.V; return !!V && (V.mode === 'local' || V.me === V.cur); },
  meIdx() { const V = this.V; return V && typeof V.me === 'number' ? V.me : -1; },
  onView(V) {
    const prev = this.V;
    this.V = V;
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
  },
  playSpin(from, to, dur) {
    G.spinning = true; document.body.classList.add('spinning'); Sound.updateMusic();
    $('wheelResult').textContent = 'Çark dönüyor…';
    Wheel.animate(from, to, dur).then(() => { G.spinning = false; document.body.classList.remove('spinning'); Sound.updateMusic(); });
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
};

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
  const V = CUI.V, board = $('board');
  if (!V || !V.board) { board.innerHTML = ''; return; }
  const maxCols = boardCols(), key = V.g + ':' + V.round + ':' + maxCols;
  const B = V.board;
  if (force || key !== CUI.lastBoardKey) {
    CUI.lastBoardKey = key;
    const { rows, cols } = layoutRows(B, maxCols);
    const widest = Math.max(...rows.map(r => r.reduce((s, x, i) => s + x.w.length + (i ? 1 : 0), 0)));
    board.dataset.cols = Math.max(widest, Math.min(cols, 10));
    board.innerHTML = rows.map(r => `<div class="board-row">${r.map((x, wi) => (wi ? '<div class="tile blank"></div>' : '') +
      [...x.w].map((ch, k) => { const i = x.start + k; const hidden = ch === '_'; const letter = hidden || isLetter(ch); const open = letter && !hidden && !CUI.animating.has(i);
        return `<div class="tile ${letter ? 'letter' : 'punct'} ${open ? 'open' : ''}" data-i="${i}">${open || !letter ? esc(ch) : ''}</div>`; }).join('')).join('')}</div>`).join('');
    sizeTiles();
    CUI.lastBoard = B;
    return;
  }
  board.querySelectorAll('.tile[data-i]').forEach(t => {
    const i = +t.dataset.i, ch = B[i];
    if (!t.classList.contains('letter')) return;
    const shouldOpen = ch && ch !== '_' && !CUI.animating.has(i);
    if (shouldOpen && !t.classList.contains('open')) { t.classList.add('open'); if (CUI.lastBoard[i] === '_') t.classList.add('light'); t.textContent = ch; }
  });
  CUI.lastBoard = B;
}
function renderKeyboard() {
  const kb = $('keyboard'), V = CUI.V;
  if (!kb.childElementCount) kb.innerHTML = ALPHABET.concat(EXTRA_KEYS).map(l => `<button type="button" class="key ${VOWELS.has(l) ? 'vowel' : ''}" data-l="${l}" aria-label="${l} harfi">${l}</button>`).join('');
  const armed = !!V && CUI.canAct() && (V.phase === 'pickConsonant' || V.phase === 'pickVowel');
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
  const V = CUI.V;
  if (!V) { $('players').innerHTML = ''; $('pstrip').innerHTML = ''; return; }
  $('players').innerHTML = V.players.map((p, i) => `<div class="player ${i === V.cur && V.phase !== 'over' ? 'active' : ''} ${p.online ? '' : 'offline'}" style="--pc:${p.color}">
    <span class="dot"></span><span class="pname">${esc(p.name)}</span><span class="ptotal">${fmt(p.total)}</span>
    <span class="phand"><span>El: <b>${fmt(p.hand)}</b></span><span>${playerBadges(p, i, V)}<span class="badge">✓ ${p.solved}</span></span></span></div>`).join('');
  $('pstrip').innerHTML = V.players.map((p, i) => `<div class="pchip ${i === V.cur && V.phase !== 'over' ? 'active' : ''} ${p.online ? '' : 'offline'} ${V.me === i ? 'me' : ''}" style="--pc:${p.color}">
    <span class="av" style="--pc:${p.color}">${initial(p.name)}</span><span class="pc-txt"><b>${esc(p.name)}${V.me === i ? ' · sen' : ''}</b><small>${fmt(p.total)}${p.hand ? ` <em>+${fmt(p.hand)}</em>` : ''}</small></span></div>`).join('');
}
function renderClues() {
  const V = CUI.V, box = $('clues');
  const list = V ? V.clues : [];
  if (!list.length) { box.innerHTML = '<p class="muted">Marketten alınan ipuçları burada görünür. Market her el bittiğinde açılır.</p>'; return; }
  box.innerHTML = list.map(c => {
    const p = V.players[c.owner];
    if (!c.mine) return `<div class="clue" style="--pc:${p.color}"><h4>${esc(p.name)} · ${esc(c.title)}</h4><p class="muted">🔒 Bu ipucu yalnızca ${esc(p.name)} tarafından görülebilir.</p></div>`;
    const canOpen = !c.opened && c.owner === V.cur && V.phase === 'idle' && CUI.canAct();
    return `<div class="clue" style="--pc:${p.color}"><h4>${esc(p.name)} · ${esc(c.title)}</h4>${c.opened ? `<p>${esc(c.text)}</p>`
      : `<p class="muted">Kilitli ipucu. Sıran gelince açabilirsin.</p><button class="btn btn-vowel" type="button" data-clue="${c.i}" ${canOpen ? '' : 'disabled'}>İPUCUNU AÇ</button>`}</div>`;
  }).join('');
}
function hintFor(V) {
  const cp = V.players[V.cur], name = cp ? cp.name : '', can = CUI.canAct();
  if (V.phase === 'spinning') return can ? 'Çark dönüyor…' : `${name} çarkı çeviriyor…`;
  if (V.phase === 'revealing') return 'Harfler açılıyor…';
  if (!can) {
    if (V.me === -1) return `İzleyicisin · sıra ${name} adlı yarışmacıda`;
    if (V.phase === 'pickConsonant') return `${name} ${fmt(V.wheelValue)} puan için ünsüz seçiyor…`;
    if (V.phase === 'pickVowel') return `${name} ünlü seçiyor…`;
    return `Sıra ${name} adlı yarışmacıda. Sıran gelince butonlar açılır.`;
  }
  const pre = V.mode === 'local' && V.players.length > 1 ? `${name}: ` : '';
  if (V.phase === 'pickConsonant') return `${pre}bir ünsüz seç. Her geçiş ${fmt(V.wheelValue)} puan.`;
  if (V.phase === 'pickVowel') return `${pre}bir ünlü seç (iptal için ÜNLÜ AL'a tekrar bas).`;
  return `${pre}çarkı çevir, ünlü al ya da cevabı tahmin et.`;
}
function renderAll() {
  const V = CUI.V; if (!V) return;
  const p = V.players[V.cur], me = V.players[CUI.meIdx()];
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
  const can = CUI.canAct(), idle = V.phase === 'idle';
  $('vowelCost').textContent = p && p.coupons ? 'KUPON' : fmt(V.vowelCost);
  $('btnSpin').disabled = !(can && idle) || Wheel.spinning;
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
  if (Date.now() > CUI.hintUntil) $('hintLine').textContent = hintFor(V);
  renderBoard(); renderKeyboard(); renderPlayers(); renderClues();
}
function setHint(t, ms = 0) { $('hintLine').textContent = t; CUI.hintUntil = ms ? Date.now() + ms : 0; if (ms) setTimeout(() => { if (Date.now() >= CUI.hintUntil && CUI.V) $('hintLine').textContent = hintFor(CUI.V); }, ms + 50); }
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
function openSolve() {
  const V = CUI.V; if (!V || !CUI.canAct() || !['idle', 'pickConsonant'].includes(V.phase)) return;
  $('solveForm').hidden = false; $('solveInput').value = ''; $('solveInput').focus();
  setHint('Cevabı yaz ve gönder. Yanlış tahminde sıra geçer.', 60000);
}
function closeSolve(silent) { if ($('solveForm').hidden) return; $('solveForm').hidden = true; if (!silent) { CUI.hintUntil = 0; renderAll(); } else CUI.hintUntil = 0; }

function showRoundEnd() {
  const V = CUI.V, s = V.summary; if (!s) return;
  const w = s.winner != null ? V.players[s.winner] : null;
  $('reTitle').textContent = w ? (V.me === s.winner ? 'Tebrikler, bildin!' : `${w.name} kazandı!`) : 'Bulmaca çözülemedi';
  $('reAnswer').innerHTML = s.answer.split('').map(ch => ch === ' ' ? '<span class="gap"></span>' : `<span>${esc(ch)}</span>`).join('');
  const rows = V.players.map((p, i) => `<tr><td><span style="color:${p.color}">●</span> ${esc(p.name)}${V.me === i ? ' <small>(sen)</small>' : ''}</td><td class="num">${fmt(p.total)}</td></tr>`).join('');
  $('reBody').innerHTML = (w ? `<p style="text-align:center">El puanı <b>${fmt(s.hand)}</b> + çözüm ödülü <b>${fmt(s.reward)}</b> = <b style="color:var(--yellow)">${fmt(s.banked)}</b> puan kesinleşti.</p>`
    : `<p style="text-align:center">${esc(s.why)}. Bu turda kimse puan kesinleştiremedi.</p>`) +
    `<table class="score-table"><thead><tr><th>Yarışmacı</th><th class="num">Toplam puan</th></tr></thead><tbody>${rows}</tbody></table>` +
    `<p class="muted" style="text-align:center">${s.last ? 'Bu son turdu. Büyük finale geçiliyor.' : 'Sıradaki adım: İpucu Marketi. Toplam puanınla bir sonraki bulmaca için ipucu alabilirsin.'}</p>`;
  const btn = $('reNext');
  const canGo = V.mode === 'local' || V.me === V.host;
  btn.disabled = !canGo;
  btn.textContent = canGo ? (s.last ? 'BÜYÜK FİNAL 🏆' : 'MARKETE GİT 🛒') : 'Kurucu devam ettirecek…';
}
function renderMarket() {
  const V = CUI.V, M = V.market; if (!M) return;
  const local = V.mode === 'local';
  const viewer = local ? clamp(CUI.marketTab, 0, V.players.length - 1) : CUI.meIdx();
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
    force.hidden = V.me !== V.host;
  }
}

function buildBulbs() {
  const box = $('wheelBulbs'), n = 24;
  box.innerHTML = Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return `<i style="left:${50 + 50 * Math.cos(a)}%;top:${50 + 50 * Math.sin(a)}%"></i>`; }).join('');
}

/* ---------- arayüz durumu ve düğmeler ---------- */
let bound = false;
function resetUI() {
  CUI.V = null; CUI.animating.clear(); CUI.lastBoardKey = ''; CUI.lastMarketId = null; CUI.shownRe = null; CUI.prevMyTurn = false; CUI.prevPhase = null;
  Wheel.stop(); G.spinning = false; G.final = false;
  ['market', 'roundEnd'].forEach(hide);
  $('solveForm').hidden = true; $('turnBanner').hidden = true;
  document.body.classList.remove('final', 'spinning', 'pick');
  $('board').innerHTML = ''; $('players').innerHTML = ''; $('pstrip').innerHTML = ''; $('log').innerHTML = '';
  $('catLabel').textContent = 'KATEGORİ'; $('diffLabel').textContent = ''; $('handInfo').textContent = '';
  $('roundLabel').textContent = '–'; $('activeLabel').textContent = '–'; $('activeTotal').textContent = '0';
  $('wheelResult').textContent = 'Çarkı çevirerek başla';
  renderKeyboard();
}
function bindGame() {
  if (bound) return; bound = true;
  $('btnSpin').addEventListener('click', () => send({ t: 'spin' }));
  $('wheel').addEventListener('click', () => { if (CUI.V && CUI.canAct() && CUI.V.phase === 'idle' && CUI.V.consLeft !== false) send({ t: 'spin' }); });
  $('btnVowel').addEventListener('click', () => send({ t: 'vowel' }));
  $('btnSolve').addEventListener('click', openSolve);
  $('solveCancel').addEventListener('click', () => closeSolve());
  $('solveForm').addEventListener('submit', e => { e.preventDefault(); const t = $('solveInput').value; if (!lettersOnly(t)) { setHint('Önce bir tahmin yaz.', 2500); return; } closeSolve(); send({ t: 'solve', text: t }); });
  $('keyboard').addEventListener('click', e => { const k = e.target.closest('.key'); if (k && !k.disabled) { send({ t: 'letter', L: k.dataset.l }); k.disabled = true; } });
  document.addEventListener('keydown', e => {
    if (document.body.dataset.game !== 'carkifelek') return;
    if (e.target.tagName === 'INPUT' || e.ctrlKey || e.metaKey || e.altKey || !$('confirm').hidden) return;
    const V = CUI.V; if (!V || !CUI.canAct()) return;
    if (V.phase === 'pickConsonant' || V.phase === 'pickVowel') {
      const L = e.key.length === 1 ? up(e.key) : '';
      if (isLetter(L)) { const btn = document.querySelector(`.key[data-l="${L}"]`); if (btn && !btn.disabled) send({ t: 'letter', L }); }
    } else if (V.phase === 'idle' && e.code === 'Space' && document.activeElement === document.body) { e.preventDefault(); send({ t: 'spin' }); }
  });
  $('clues').addEventListener('click', e => { const b = e.target.closest('[data-clue]'); if (b && !b.disabled) send({ t: 'clue', i: +b.dataset.clue }); });
  $('reNext').addEventListener('click', () => send({ t: 'next' }));
  $('btnMarketDone').addEventListener('click', () => send({ t: CUI.V && CUI.V.mode === 'online' ? 'ready' : 'marketDone' }));
  $('btnMarketForce').addEventListener('click', () => send({ t: 'marketDone' }));
  $('marketTabs').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) { CUI.marketTab = +b.dataset.i; renderMarket(); } });
  $('marketGrid').addEventListener('click', async e => {
    const b = e.target.closest('button[data-oid]'); if (!b || b.disabled) return;
    const V = CUI.V, Mk = V && V.market; if (!Mk) return;
    const as = V.mode === 'local' ? CUI.marketTab : CUI.meIdx(), p = V.players[as], o = Mk.offers.find(x => x.oid === b.dataset.oid);
    if (!p || !o) return;
    const mid = Mk.id;
    const ok = await confirmBox('Satın alma onayı', `${p.name}, "${o.name}" ürününü ${fmt(o.price)} puana alıyor. Kalan bakiye: ${fmt(p.total - o.price)} puan.`);
    if (ok && CUI.V && CUI.V.market && CUI.V.market.id === mid) send({ t: 'buy', oid: o.oid, as });
  });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (CUI.V) { renderBoard(); sizeTiles(); } }, 120); });
}

/* ---------- salona kayıt ---------- */
CFX.registerGame({
  id: 'carkifelek', name: 'Çarkıfelek', icon: '🎡', color: '#ffb627', min: 1, max: 4, hotseat: true, screen: 'app',
  tagline: 'Çarkı çevir, harfleri aç, bulmacayı çöz',
  rules: 'Çarkı çevir, ünsüz seç; harf kaç kez geçiyorsa o kadar puan. Ünlüler satın alınır. PAS ve İFLAS sırayı kaptırır. Her turdan sonra ipucu marketi açılır.',
  options: [{ key: 'length', label: 'Süre', def: 'std', choices: [{ v: 'quick', label: 'Hızlı · 3 tur' }, { v: 'std', label: 'Standart · 5 tur' }, { v: 'long', label: 'Uzun · 8 tur' }] }],
  init() {
    Wheel.canvas = $('wheel'); Wheel.draw(); Wheel.apply(); buildBulbs();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => Wheel.draw());
  },
  setup(players, opts, c) {
    ctx = c;
    const ps = players.map((p, i) => Object.assign(mkPlayer(i, p.name, p.cid), { color: p.color }));
    startGame(c.mode, ps, opts.length || 'std');
    return S;
  },
  action(state, pi, a, c) { S = state; ctx = c; act(pi, a); },
  view(state, viewer) { S = state; return viewFor(viewer); },
  turnOf(state) { return ['idle', 'pickConsonant', 'pickVowel'].includes(state.phase) ? state.cur : null; },
  skipTurn(state, pi, c) { S = state; ctx = c; if (state.cur === pi && ['idle', 'pickConsonant', 'pickVowel'].includes(state.phase)) { nextPlayer(); sync(); } },
  onPresence(state, pi, on, c) {
    S = state; ctx = c;
    const p = S.players[pi]; if (!p) return;
    p.online = on;
    if (S.phase === 'market' && S.market) { if (!on) S.market.ready[pi] = true; checkReady(); }
  },
  serialize(state) {
    return Object.assign({}, state, { puzzle: state.puzzle && state.puzzle.key, nextPuzzle: state.nextPuzzle && state.nextPuzzle.key,
      revealed: [...state.revealed], guessed: [...state.guessed], spin: null,
      market: state.market ? Object.assign({}, state.market, { owned: state.market.owned.map(s => [...s]) }) : null,
      _mem: { sessionUsed: [...M.sessionUsed], lastCat: M.lastCat, recentCats: M.recentCats, catUse: M.catUse, adapt: M.adapt } });
  },
  deserialize(o) {
    if (o._mem) Object.assign(M, { sessionUsed: new Set(o._mem.sessionUsed), lastCat: o._mem.lastCat, recentCats: o._mem.recentCats, catUse: o._mem.catUse, adapt: o._mem.adapt });
    const st = Object.assign({}, o, { puzzle: Pool.byKey.get(o.puzzle) || null, nextPuzzle: o.nextPuzzle ? Pool.byKey.get(o.nextPuzzle) : null,
      revealed: new Set(o.revealed), guessed: new Set(o.guessed), market: o.market ? Object.assign({}, o.market, { owned: o.market.owned.map(a => new Set(a)) }) : null });
    delete st._mem;
    return st;
  },
  resume(state, c) {
    S = state; ctx = c;
    Wheel.rot = S.rot; Wheel.apply();
    if (S.phase === 'spinning') landSpin(Wheel.indexAt(S.rot));
    else if (S.phase === 'revealing') { if (allRevealed()) finishRound(S.cur, 'Bütün harfler açıldı'); else { S.phase = 'idle'; } }
    else if (S.phase === 'roundOver' && S.mode === 'online') later(4000, () => { if (S.phase === 'roundOver') afterRoundEnd(); });
  },
  mount() { bindGame(); resetUI(); },
  render(v) { CUI.onView(v); },
  onEvent(e) { CUI.onEvent(e); },
  log(text, cls) { addLog(text, cls); },
  unmount() { resetUI(); S = null; }
});

// Test için
window.CFK = { get S() { return S; }, get V() { return CUI.V; }, Wheel, SLICES, structuralFacts, buildOffers, choosePuzzle, layoutRows };
})();
