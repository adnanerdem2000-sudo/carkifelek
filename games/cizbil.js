/* =========================================================================
   OYUN SALONU — ÇİZ BİL
   Sırası gelen oyuncu üç kelimeden birini gizlice seçip çizer; diğerleri
   sohbet kutusuna tahmin yazar. Erken bilen çok puan alır, çizen her bilen
   için puan kazanır. 2–6 kişi online ya da tek telefonda "elden ele".
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial, shuffle, clamp, centerOf } = CFX;

/* ---------- kelime havuzu (k: kolay, o: orta, z: zor) ---------- */
const RAW = {
  k: `ELMA,ARMUT,MUZ,ÇİLEK,KARPUZ,KİRAZ,ÜZÜM,LİMON,PORTAKAL,HAVUÇ,DOMATES,MISIR,MANTAR,EKMEK,PEYNİR,YUMURTA,PASTA,DONDURMA,PİZZA,HAMBURGER,PATATES,SOĞAN,BİBER,SİMİT,SÜT,BAL,KURABİYE,ŞEKER,
KEDİ,KÖPEK,BALIK,KUŞ,TAVŞAN,FİL,ZÜRAFA,ASLAN,MAYMUN,AYI,YILAN,ÖRÜMCEK,KELEBEK,ARI,İNEK,AT,KOYUN,TAVUK,ÖRDEK,FARE,BALİNA,AHTAPOT,PENGUEN,BAYKUŞ,KURBAĞA,KARINCA,SALYANGOZ,
GÜNEŞ,AY,YILDIZ,BULUT,YAĞMUR,KAR,ŞİMŞEK,GÖKKUŞAĞI,AĞAÇ,ÇİÇEK,YAPRAK,DAĞ,DENİZ,ADA,
EV,KAPI,PENCERE,MERDİVEN,MASA,SANDALYE,YATAK,LAMBA,SAAT,TELEFON,TELEVİZYON,BİLGİSAYAR,KİTAP,KALEM,MAKAS,ANAHTAR,ŞEMSİYE,GÖZLÜK,ŞAPKA,AYAKKABI,ÇORAP,ELDİVEN,TİŞÖRT,PANTOLON,ÇANTA,TOP,BALON,UÇURTMA,
ARABA,OTOBÜS,BİSİKLET,UÇAK,GEMİ,TREN,KAYIK,ROKET,KALP,GÖZ,KULAK,BURUN,AĞIZ,EL,AYAK,DİŞ,
BARDAK,ÇATAL,KAŞIK,BIÇAK,TABAK,TENCERE,ŞİŞE,MUM,ZİL,DAVUL,GİTAR,TAÇ,KILIÇ,BAYRAK,ÇADIR,SABUN,HAVLU,TARAK,AYNA,YASTIK,KUTU,HEDİYE,ZARF,KUPA,SİLGİ,CETVEL,YÜZÜK,KRAVAT,DÜĞME,ÇEKİÇ,ÇİVİ,KOVA,FIRÇA,
SALINCAK,KALE,BEBEK,KAR TANESİ,ŞEMSİYE,ÇİT,BACA,HALKA`,
  o: `LAHMACUN,DÖNER,BAKLAVA,MANTI,KÖFTE,SUCUK,ZEYTİN,KUMPİR,PİDE,BÖREK,LOKUM,MAKARNA,ÇİKOLATA,SANDVİÇ,ANANAS,NAR,İNCİR,KAVUN,ŞEFTALİ,PATLICAN,SALATALIK,KARNABAHAR,KEK,ÇORBA,KAHVE,ÇAY,
KANGURU,DEVE,ZEBRA,GERGEDAN,PAPAĞAN,FLAMİNGO,YARASA,KİRPİ,SİNCAP,TİLKİ,KURT,GEYİK,YENGEÇ,ISTAKOZ,DENİZANASI,KARTAL,KUĞU,HOROZ,KEÇİ,KOALA,PANDA,TİMSAH,KÖPEKBALIĞI,YUNUS,DİNOZOR,EJDERHA,SOLUCAN,KAPLUMBAĞA,MARTI,ÇEKİRGE,KAZ,HİNDİ,KARGA,LEYLEK,DENİZATI,
ROBOT,HAYALET,UZAYLI,KARDAN ADAM,KORSAN,ŞATO,PİRAMİT,DÖNME DOLAP,KAYDIRAK,HASTANE,OKUL,STADYUM,PLAJ,ÇÖL,ORMAN,VOLKAN,ŞELALE,MAĞARA,GÖL,KUYU,ÇEŞME,KÖPRÜ,NEHİR,
PUSULA,HARİTA,DÜRBÜN,KAMERA,RADYO,KULAKLIK,MİKROFON,KLAVYE,PİL,AMPUL,PRİZ,MIKNATIS,TESTERE,TORNAVİDA,KÜREK,BUZDOLABI,FIRIN,ÜTÜ,SÜPÜRGE,VANTİLATÖR,ŞÖMİNE,KOLTUK,HALI,PERDE,DOLAP,VAZO,SAKSI,TAKVİM,ZAR,SATRANÇ,
BUMERANG,PARAŞÜT,HELİKOPTER,DENİZALTI,TRAKTÖR,KAMYON,AMBULANS,MOTOSİKLET,KAYKAY,PATEN,KIZAK,YELKENLİ,ÇAPA,DÜMEN,KEMAN,PİYANO,TROMPET,KUM SAATİ,DİŞ FIRÇASI,EL FENERİ,
KOŞMAK,YÜZMEK,UYUMAK,ZIPLAMAK,AĞLAMAK,GÜLMEK,UÇMAK,OKUMAK,YAZMAK,ESNEMEK,ALKIŞLAMAK,DÜŞMEK,TIRMANMAK,DANS ETMEK,
KASK,MASKE,PELERİN,KEMER,BİLEZİK,CÜZDAN,BAVUL,SEPET,ÇEKİRDEK,MEŞALE,KÜRDAN,TERMOMETRE`,
  z: `DENİZ FENERİ,DENİZ YILDIZI,DENİZKIZI,KUTUP AYISI,SU AYGIRI,TAVUS KUŞU,DEVE KUŞU,UĞUR BÖCEĞİ,BUKALEMUN,PAMUK ŞEKER,PATLAMIŞ MISIR,HİNDİSTAN CEVİZİ,MİDYE DOLMA,KÜNEFE,KOKOREÇ,MENEMEN,TÜRK KAHVESİ,
ÇAMAŞIR MAKİNESİ,TRAFİK LAMBASI,YAYA GEÇİDİ,ASANSÖR,YÜRÜYEN MERDİVEN,SAAT KULESİ,AKVARYUM,HAMAK,TERAZİ,AKORDEON,BAĞLAMA,ARP,KUKLA,SİRK,PALYAÇO,SİHİRBAZ,ASTRONOT,DALGIÇ,İTFAİYECİ,AŞÇI,
KAMP ATEŞİ,KORKULUK,ÇİFTLİK,DEĞİRMEN,RÜZGAR GÜLÜ,UYDU,GEZEGEN,KUYRUKLU YILDIZ,ÖRÜMCEK AĞI,ARI KOVANI,KUŞ YUVASI,BUZDAĞI,GÖKDELEN,BENZİN İSTASYONU,MİKROSKOP,TELESKOP,FOTOĞRAF MAKİNESİ,SICAK HAVA BALONU,
TELEFERİK,İTFAİYE ARABASI,CANKURTARAN SİMİDİ,HAVALİMANI,KÜTÜPHANE,LUNAPARK,AY TUTULMASI,TAHTEREVALLİ,SABUN KÖPÜĞÜ,KUM KALESİ,PİKNİK,DOĞUM GÜNÜ,HAYVANAT BAHÇESİ,MAĞARA ADAMI,KORSAN GEMİSİ,HAZİNE SANDIĞI,SİHİRLİ DEĞNEK,UÇAN HALI,
BALIK TUTMAK,ŞARKI SÖYLEMEK,KAYAK YAPMAK,HAPŞIRMAK,SÖRF YAPMAK,YEMEK PİŞİRMEK,ÇAMAŞIR ASMAK,DİŞ FIRÇALAMAK,FOTOĞRAF ÇEKMEK,BULAŞIK YIKAMAK,ÇİÇEK SULAMAK,İP ATLAMAK,
SU BARDAĞI,KAR TOPU,YAĞMURLUK,PARK YERİ,OYUN HAMURU,BİLARDO,ŞAMDAN,ÇARK,PERİSKOP,ROBOT SÜPÜRGE`
};
const DIFF = { k: { label: 'Kolay', mult: 1 }, o: { label: 'Orta', mult: 1.25 }, z: { label: 'Zor', mult: 1.5 } };
const WORDS = [];
(() => { const seen = new Set(); for (const d of ['k', 'o', 'z']) for (const raw of RAW[d].split(',')) { const w = raw.trim().replace(/\s+/g, ' '); if (w && !seen.has(w)) { seen.add(w); WORDS.push({ w, d }); } } })();

/* ---------- sabitler ---------- */
const PALETTE = ['#1b1530', '#ff2e63', '#ff8a00', '#ffd60a', '#22c55e', '#2f7bff', '#8b3dff', '#8b5a2b'];
const PAPER = '#fbf8ff';
const COLOR_NAMES = ['Siyah', 'Kırmızı', 'Turuncu', 'Sarı', 'Yeşil', 'Mavi', 'Mor', 'Kahverengi'];
const SIZES = [6, 14, 30];                // tuval genişliğinin binde biri
const ERASER = 8;                          // renk sırası 8 = silgi (kâğıt rengi)
const MAX_PTS = 5000, MAX_STROKES = 700, STROKE_PTS = 900, MSG_NUMS = 240;
const CHOOSE_MS = 20000, REVEAL_MS = 3600, GUESS_GAP = 500;
const ORDER_BONUS = [20, 10, 5];
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64I = {}; [...B64].forEach((c, i) => { B64I[c] = i; });

/* ---------- yardımcılar ---------- */
const TRMAP = { 'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'I': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U', 'Â': 'A', 'Î': 'I', 'Û': 'U' };
const norm = s => [...String(s || '').toLocaleUpperCase('tr-TR')].map(c => TRMAP[c] || c).join('').replace(/[^A-Z0-9]/g, '');
const tokens = s => String(s || '').toLocaleUpperCase('tr-TR').split(/[^A-ZÇĞIİÖŞÜÂÎÛ0-9]+/u).map(norm).filter(Boolean);
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
// Tahmini sınıflandır: ok | near | part | wrong  (yakın tahminler herkese gösterilmez → kelime sızmaz)
function judge(guess, answer) {
  const A = norm(answer), G = norm(guess);
  if (!G) return 'empty';
  if (G === A) return 'ok';
  const T = tokens(guess), aw = tokens(answer);
  for (let i = 0; i < T.length; i++) for (let j = i + 1; j <= T.length; j++) if (T.slice(i, j).join('') === A) return 'ok';
  if (A.length >= 3 && G.length >= 3 && lev(G, A) === 1) return 'near';
  if (A.length >= 3 && G.includes(A)) return 'near';
  if (aw.length > 1 && T.some(t => t.length >= 2 && aw.includes(t))) return 'part';
  if (A.length >= 4 && T.some(t => t.length >= 4 && lev(t, A) <= 1)) return 'near';
  return 'wrong';
}
const enc = p => { let s = ''; for (const n of p) s += B64[n >> 6] + B64[n & 63]; return s; };
const dec = s => { const o = []; for (let i = 0; i + 1 < s.length; i += 2) o.push((B64I[s[i]] << 6) | B64I[s[i + 1]]); return o; };
// Ramer–Douglas–Peucker: düz [x,y,...] dizisini sadeleştirir
function rdp(p, eps) {
  const n = p.length / 2; if (n <= 2) return p.slice();
  const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let md = 0, mi = -1;
    const ax = p[a * 2], ay = p[a * 2 + 1], bx = p[b * 2], by = p[b * 2 + 1], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * p[i * 2] - dx * p[i * 2 + 1] + bx * ay - by * ax) / L; if (d > md) { md = d; mi = i; } }
    if (md > eps && mi > 0) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  const o = []; for (let i = 0; i < n; i++) if (keep[i]) o.push(p[i * 2], p[i * 2 + 1]); return o;
}
const isLetterCh = c => /[A-ZÇĞIİÖŞÜ]/u.test(c);

/* ---------- kurallar (yöneten cihaz) ---------- */
const nOf = st => st.pl.length;
function chat(st, m) { m.id = ++st.chatSeq; st.chat.push(m); if (st.chat.length > 50) st.chat.splice(0, st.chat.length - 50); return m; }
function sysChat(st, ctx, tx, cls) { const m = chat(st, { k: 'sys', tx, cls }); ctx.emit({ t: 'chat', m, tn: st.turn }); }
function pickChoices(st) {
  const used = new Set(st.used);
  return ['k', 'o', 'z'].map(d => {
    let pool = WORDS.map((x, i) => i).filter(i => WORDS[i].d === d && !used.has(i));
    if (!pool.length) pool = WORDS.map((x, i) => i).filter(i => WORDS[i].d === d);
    return pool[Math.floor(Math.random() * pool.length)];
  });
}
function nextTurn(st, ctx) {
  const n = nOf(st);
  for (let guard = 0; guard <= n * st.rounds; guard++) {
    st.turn++;
    if (st.turn >= st.total) { finish(st, ctx); return; }
    const d = st.turn % n;
    const others = st.on.some((o, i) => o && i !== d);
    if (st.on[d] || !others) break;
    sysChat(st, ctx, `${st.pl[d].name} bağlı değil, çizim sırası geçti.`, 'bad');
  }
  st.drawer = st.turn % n;
  st.phase = 'choose'; st.choices = pickChoices(st); st.word = ''; st.diff = 'k';
  st.got = st.pl.map(() => null); st.gain = st.pl.map(() => 0); st.hints = [];
  st.strokes = []; st.nid = 0; st.npts = 0; st.reason = '';
  st.chooseEnd = st.local ? 0 : Date.now() + CHOOSE_MS;
  st.tk++;
  ctx.emit({ t: 'turn', drawer: st.drawer, tn: st.turn });
  ctx.sync();
  arm(st, ctx);
}
function startDraw(st, ctx, k) {
  const wi = st.choices[k]; if (wi == null) return;
  st.used.push(wi);
  st.word = WORDS[wi].w; st.diff = WORDS[wi].d; st.choices = [];
  st.phase = 'draw'; st.startAt = Date.now(); st.endAt = st.startAt + st.drawSec * 1000;
  st.tk++;
  const lens = st.word.split(' ').map(w => [...w].length);
  sysChat(st, ctx, `✏️ ${st.pl[st.drawer].name} çiziyor · ${lens.join(' + ')} harf`, 'gold');
  ctx.emit({ t: 'start', drawer: st.drawer, tn: st.turn });
  if (!guessers(st).length) { endTurn(st, ctx, 'empty'); return; }
  ctx.sync();
  arm(st, ctx);
}
const guessers = st => st.pl.map((_, i) => i).filter(i => i !== st.drawer && st.on[i]);
function maxHints(st) { const L = [...st.word].filter(isLetterCh).length; return Math.max(0, Math.min(2, L - 2)); }
function revealHint(st, ctx, want) {
  if (st.phase !== 'draw' || st.hints.length >= Math.min(want, maxHints(st))) return;
  const chars = [...st.word];
  const free = chars.map((c, i) => i).filter(i => isLetterCh(chars[i]) && !st.hints.includes(i));
  if (!free.length) return;
  st.hints.push(free[Math.floor(Math.random() * free.length)]);
  sysChat(st, ctx, '💡 İpucu: bir harf açıldı.', '');
  ctx.emit({ t: 'hint', tn: st.turn });
  ctx.sync();
}
function arm(st, ctx) {
  const tk = st.tk, now = Date.now();
  const at = (t, fn) => ctx.later(Math.max(0, t - now), () => { if (st.tk === tk) fn(); });
  if (st.phase === 'choose' && st.chooseEnd) {
    at(st.chooseEnd, () => {
      if (st.on[st.drawer]) { sysChat(st, ctx, `${st.pl[st.drawer].name} için kelime otomatik seçildi.`, ''); startDraw(st, ctx, Math.floor(Math.random() * 3)); }
      else { sysChat(st, ctx, `${st.pl[st.drawer].name} bağlı değil, çizim sırası geçti.`, 'bad'); nextTurn(st, ctx); }
    });
  } else if (st.phase === 'draw') {
    const dur = st.endAt - st.startAt, mh = maxHints(st);
    if (mh >= 1) at(st.startAt + dur * 0.5, () => revealHint(st, ctx, 1));
    if (mh >= 2) at(st.startAt + dur * 0.75, () => revealHint(st, ctx, 2));
    at(st.endAt, () => endTurn(st, ctx, 'time'));
  } else if (st.phase === 'reveal') {
    at(st.revealEnd, () => nextTurn(st, ctx));
  }
}
function endTurn(st, ctx, reason) {
  if (st.phase !== 'draw') return;
  st.phase = 'reveal'; st.reason = reason; st.revealEnd = Date.now() + REVEAL_MS; st.tk++;
  const ok = st.got.filter(x => x != null).length;
  const why = reason === 'all' ? 'Herkes bildi!' : reason === 'left' ? `${st.pl[st.drawer].name} ayrıldı.` : reason === 'time' ? 'Süre doldu.' : reason === 'empty' ? 'Tahmin edecek kimse kalmadı.' : 'Tur bitti.';
  sysChat(st, ctx, `${why} Kelime: ${st.word}`, ok ? 'good' : 'bad');
  ctx.emit({ t: 'reveal', word: st.word, ok, reason, tn: st.turn });
  ctx.sync();
  arm(st, ctx);
}
function finish(st, ctx) {
  st.phase = 'end'; st.tk++; st.turn = st.total - 1;
  ctx.sync();
  const order = st.pl.map((_, i) => i).sort((a, b) => st.score[b] - st.score[a] || a - b);
  const top = st.score[order[0]], tie = order.filter(i => st.score[i] === top).length > 1;
  ctx.end({
    title: tie ? 'Berabere bitti!' : `${st.pl[order[0]].name} kazandı!`,
    ranking: order.map(i => ({ pi: i, score: st.score[i], label: `${st.score[i]} puan` })),
    note: `${st.total} çizim yapıldı · ${st.correct} doğru tahmin`
  });
}
function correct(st, pi, ctx) {
  const order = st.got.filter(x => x != null).length;
  const dur = st.endAt - st.startAt, frac = clamp((st.endAt - Date.now()) / dur, 0, 1);
  const mult = DIFF[st.diff].mult;
  const pts = Math.round((30 + 70 * frac + (ORDER_BONUS[order] || 0)) * mult);
  const dp = Math.round(25 * mult);
  st.got[pi] = pts; st.score[pi] += pts; st.gain[pi] += pts; st.correct++;
  st.score[st.drawer] += dp; st.gain[st.drawer] += dp;
  const m = chat(st, { k: 'ok', pi });
  chat(st, { k: 'me', to: pi, tx: st.word, pts });
  ctx.emit({ t: 'chat', m, tn: st.turn, pts });
  const g = guessers(st);
  if (g.length && g.every(i => st.got[i] != null)) endTurn(st, ctx, 'all');
  else ctx.sync();
}
function addPts(st, pi, a, ctx) {
  if (st.phase !== 'draw' || pi !== st.drawer) return;
  if (!Number.isInteger(a.s) || a.s < 0 || a.s > 1e6 || !Array.isArray(a.p)) return;
  const raw = a.p; if (raw.length < 2 || raw.length > MSG_NUMS || raw.length % 2) return;
  const p = []; for (const v of raw) { if (typeof v !== 'number' || !isFinite(v)) return; p.push(clamp(Math.round(v), 0, 1000)); }
  let last = st.strokes[st.strokes.length - 1];
  if (!last || last.i !== a.s) {
    if (a.s < st.nid || st.strokes.length >= MAX_STROKES) return;
    last = { i: a.s, c: clamp(a.c | 0, 0, 8), w: clamp(a.w | 0, 0, 2), p: [] };
    st.strokes.push(last); st.nid = a.s + 1;
  }
  if (last.p.length + p.length > STROKE_PTS * 2) return;
  const o = last.p.length;
  for (const v of p) last.p.push(v);
  st.npts += p.length / 2;
  if (st.npts > MAX_PTS) compact(st);
  ctx.emit({ t: 'pts', s: last.i, c: last.c, w: last.w, p, o, tn: st.turn });
}
// Toplam nokta sınırı aşılınca eski çizgileri sadeleştir (son çizgiye dokunma: canlı ekleniyor olabilir)
function compact(st) {
  for (let eps = 2; st.npts > MAX_PTS * 0.8 && eps <= 64; eps *= 2) {
    for (let k = 0; k < st.strokes.length - 1; k++) st.strokes[k].p = rdp(st.strokes[k].p, eps);
    st.npts = st.strokes.reduce((s, x) => s + x.p.length / 2, 0);
  }
}

/* ---------- arayüz durumu ---------- */
let root = null, ui = null, V = null;
const M = { turn: -1, strokes: [], nid: 0, myNext: 0, gone: new Set(), floor: 0 };      // çizim modeli (görünüm + canlı olaylar)
let chatList = [], extras = [], lastChatId = 0;
let deadline = 0, dur = 1, timerT = null, lastTickSec = -1;
let tool = { c: 0, w: 1 }, cur = null, queue = [], flushT = null;
let peekShow = false, peekT = null, localReveal = false, lastKey = '';
let cv = null, cx = null, ro = null, cssW = 0, cssH = 0;
const q = s => root && root.querySelector(s);

const isLocal = () => ui && ui.mode === 'local';
const amDrawer = () => !!V && (isLocal() || ui.me === V.drawer);
const canDraw = () => !!V && V.phase === 'draw' && amDrawer();

/* ---------- tuval ---------- */
function fitCanvas() {
  if (!cv) return;
  const r = cv.parentElement.getBoundingClientRect();
  if (!r.width) return;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  cssW = r.width; cssH = r.height;
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  redraw();
}
const px = (x, y) => [x / 1000 * cv.width, y / 1000 * cv.height];
function strokeStyle(s) { cx.strokeStyle = cx.fillStyle = s.c === ERASER ? PAPER : PALETTE[s.c] || PALETTE[0]; cx.lineWidth = Math.max(1.5, SIZES[s.w] * (s.c === ERASER ? 1.6 : 1) / 1000 * cv.width); cx.lineCap = 'round'; cx.lineJoin = 'round'; }
function drawSeg(s, from) {           // s.p içinde "from" (sayı sırası) noktasından sonrasını yumuşak (karesel) eğrilerle çiz
  if (!cx || !s.p.length) return;
  strokeStyle(s);
  const p = s.p, n = p.length >> 1;
  const P = k => px(p[2 * k], p[2 * k + 1]);
  if (n === 1) { const [x, y] = P(0); cx.beginPath(); cx.arc(x, y, cx.lineWidth / 2, 0, Math.PI * 2); cx.fill(); return; }
  // Yol: p0 → (her k için) kontrol P(k), bitiş orta(P(k), P(k+1)) → son noktaya düz çizgi.
  // Yeni noktalar gelince yalnızca değişen son parçalar yeniden çizilir.
  const k0 = Math.max(1, (from >> 1) - 1);
  cx.beginPath();
  if (k0 === 1) { const [x, y] = P(0); cx.moveTo(x, y); }
  else { const [ax, ay] = P(k0 - 1), [bx, by] = P(k0); cx.moveTo((ax + bx) / 2, (ay + by) / 2); }
  for (let k = k0; k < n - 1; k++) { const [ax, ay] = P(k), [bx, by] = P(k + 1); cx.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2); }
  const [lx, ly] = P(n - 1); cx.lineTo(lx, ly);
  cx.stroke();
}
function redraw() {
  if (!cx) return;
  cx.fillStyle = PAPER; cx.fillRect(0, 0, cv.width, cv.height);
  for (const s of M.strokes) drawSeg(s, 0);
}
function mergeStrokes(v) {
  let vs = (v.strokes || []).map(s => ({ i: s.i, c: s.c, w: s.w, p: dec(s.p) }));
  if (v.turn !== M.turn) { M.turn = v.turn; M.strokes = vs; M.nid = v.nid; M.myNext = v.nid; M.gone = new Set(); M.floor = 0; cur = null; queue = []; return; }
  // çizen: henüz yöneten cihaza ulaşmamış geri alma / temizleme işlemlerini görünüm geri getirmesin
  if (amDrawer()) vs = vs.filter(s => s.i >= M.floor && !M.gone.has(s.i));
  const local = new Map(M.strokes.map(s => [s.i, s]));
  const out = vs.map(s => { const l = local.get(s.i); return l && l.p.length >= s.p.length ? l : s; });
  const inView = new Set(vs.map(s => s.i));
  for (const s of M.strokes) if (!inView.has(s.i) && s.i >= v.nid) out.push(s);
  out.sort((a, b) => a.i - b.i);
  M.strokes = out; M.nid = v.nid; M.myNext = Math.max(M.myNext, v.nid);
}

/* ---------- çizen: girdi ---------- */
function toUnit(e) {
  const r = cv.getBoundingClientRect();
  return [clamp(Math.round((e.clientX - r.left) / r.width * 1000), 0, 1000), clamp(Math.round((e.clientY - r.top) / r.height * 1000), 0, 1000)];
}
function newStroke(x, y) {
  cur = { i: M.myNext++, c: tool.c, w: tool.w, p: [x, y], sent: 0 };
  M.strokes.push(cur); drawSeg(cur, 0);
}
function addPoint(x, y) {
  const p = cur.p, lx = p[p.length - 2], ly = p[p.length - 1];
  if (Math.hypot((x - lx) * cssW / 1000, (y - ly) * cssH / 1000) < 2.2) return;
  if (p.length >= 600) {                    // uzun çizgiyi böl: mesajlar ve sadeleştirme küçük kalsın
    flush(); const c = cur; newStroke(lx, ly); cur.c = c.c; cur.w = c.w; cur.pid = c.pid; cur.grp = c.grp;
  }
  cur.p.push(x, y); drawSeg(cur, cur.p.length - 2);
}
function onDown(e) {
  if (!canDraw() || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault(); Sound.init();
  try { cv.setPointerCapture(e.pointerId); } catch { /* */ }
  const [x, y] = toUnit(e); newStroke(x, y); cur.pid = e.pointerId; cur.grp = cur.i;
  startFlush();
}
function onMove(e) {
  if (!cur || cur.pid !== e.pointerId) return;
  e.preventDefault();
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of (evs.length ? evs : [e])) { const [x, y] = toUnit(ev); addPoint(x, y); }
}
function onUp(e) { if (!cur || (e && cur.pid !== e.pointerId)) return; flush(); cur = null; }
function startFlush() { if (!flushT) flushT = setInterval(() => { flush(); if (!cur) { clearInterval(flushT); flushT = null; } }, 100); }
function flush() {
  // Henüz gönderilmemiş noktaları çizgi başına bir mesajla gönder (≈ en fazla 10 mesaj/sn)
  for (const s of M.strokes.slice(-3)) {
    if (s.sent == null || s.sent >= s.p.length) continue;
    while (s.sent < s.p.length) {
      const part = s.p.slice(s.sent, s.sent + MSG_NUMS);
      send({ t: 'pts', s: s.i, c: s.c, w: s.w, p: part });
      s.sent += part.length;
    }
  }
}
function send(a) { if (isLocal() && V) a.as = V.drawer; ui.send(a); }
async function toolClick(b) {
  if (!canDraw()) return;
  Sound.init();
  if (b.dataset.c != null) { tool.c = +b.dataset.c; Sound.tick(.5); }
  else if (b.dataset.w != null) { tool.w = +b.dataset.w; Sound.tick(.5); }
  else if (b.dataset.tool === 'undo') {
    flush(); cur = null;
    if (!M.strokes.length) return;
    const last = M.strokes[M.strokes.length - 1], grp = last.grp;
    do { const s = M.strokes.pop(); M.gone.add(s.i); send({ t: 'undo', s: s.i }); }
    while (grp != null && M.strokes.length && M.strokes[M.strokes.length - 1].grp === grp);
    redraw(); Sound.whoosh();
  } else if (b.dataset.tool === 'clear') {
    if (!M.strokes.length) return;
    if (!await CFX.confirmBox('Tuvali temizle', 'Tüm çizim silinecek.', 'Temizle')) return;
    if (!canDraw()) return;
    flush(); cur = null; M.strokes = []; M.floor = M.myNext; redraw(); send({ t: 'clear' }); Sound.whoosh();
  }
  renderTools();
}

/* ---------- çizim (render) ---------- */
function timeLabel(ms) { return String(Math.max(0, Math.ceil(ms / 1000))); }
function renderPlayers(v) {
  const box = q('.cb-players');
  box.innerHTML = v.players.map((p, i) => {
    const st = v.phase === 'end' ? '' : i === v.drawer ? '<span class="cb-st draw"><em>çiziyor </em>✏️</span>' : p.got ? '<span class="cb-st ok"><em>bildi </em>✓</span>' : '';
    const gain = (v.phase === 'reveal' || v.phase === 'end') && p.gain ? `<span class="cb-gain">+${p.gain}</span>` : '';
    return `<div class="cb-pl ${i === v.drawer && v.phase !== 'end' ? 'drawer' : ''} ${p.got ? 'got' : ''} ${p.on ? '' : 'off'} ${ui.me === i ? 'me' : ''}" style="--pc:${p.color}" data-pi="${i}">
      <span class="av" style="--pc:${p.color}">${initial(p.name)}</span>
      <span class="cb-pn"><b>${esc(p.name)}${ui.me === i ? ' <small>(sen)</small>' : ''}</b>${st}</span>
      <span class="cb-sc">${p.score}${gain}</span></div>`;
  }).join('');
}
function maskHTML(v) {
  const knows = !!v.word;
  if (knows && !(isLocal() && v.phase === 'draw' && !peekShow)) {
    return `<span class="cb-reveal">${esc(v.word)}</span>`;
  }
  const words = v.mask || [];
  const total = words.reduce((s, w) => s + w.length, 0);
  return `<span class="cb-mask">${words.map(w => `<span class="cb-mw">${w.map(c => `<i class="${c ? 'hint' : ''}">${c ? esc(c) : ''}</i>`).join('')}</span>`).join('')}</span><small class="cb-cnt">${total}</small>`;
}
function renderHead(v) {
  const head = q('.cb-word');
  let inner = '';
  if (v.phase === 'draw' || v.phase === 'reveal' || v.phase === 'end') inner = maskHTML(v);
  else inner = `<span class="cb-wait">${v.phase === 'choose' ? 'Kelime seçiliyor…' : ''}</span>`;
  if (isLocal() && v.phase === 'draw') inner += `<button type="button" class="cb-peek" data-act="peek" aria-label="Kelimeyi göster">${peekShow ? '🙈' : '👁'}</button>`;
  head.innerHTML = inner;
  const L = v.word ? [...v.word].length : (v.mask || []).reduce((s, w) => s + w.length + 1, -1);
  head.style.setProperty('--n', Math.max(7, L || 0));
  q('.cb-round').textContent = v.phase === 'end' ? 'Oyun bitti' : `Tur ${v.round}/${v.rounds} · Çizim ${Math.min(v.turn + 1, v.total)}/${v.total}`;
  const diff = q('.cb-diff');
  if ((v.phase === 'draw' || v.phase === 'reveal') && v.diff) { diff.hidden = false; diff.className = 'cb-diff d-' + v.diff; diff.textContent = DIFF[v.diff].label; } else diff.hidden = true;
}
function renderStatus(v) {
  const st = q('.cb-status'), p = v.players, dn = p[v.drawer] ? `<b style="color:${p[v.drawer].color}">${esc(p[v.drawer].name)}</b>` : '';
  let h;
  const meGot = typeof ui.me === 'number' && ui.me >= 0 && p[ui.me] && p[ui.me].got;
  if (v.phase === 'end') h = '<span class="g-turn win">Oyun bitti!</span>';
  else if (v.phase === 'reveal') h = `<span class="g-turn">${v.okCount ? `${v.okCount} kişi bildi` : 'Kimse bilemedi'}</span>`;
  else if (isLocal()) h = v.phase === 'choose' ? `<span class="g-turn mine">⭐ Sıra: ${esc(p[v.drawer].name)} · kelime seç</span>` : `<span class="g-turn mine">✏️ ${esc(p[v.drawer].name)} çiziyor · bilen olunca dokun</span>`;
  else if (amDrawer()) h = v.phase === 'choose' ? '<span class="g-turn mine">⭐ Sıra sende · kelime seç</span>' : '<span class="g-turn mine">⭐ Sıra sende · çiz!</span>';
  else if (ui.me < 0) h = `<span class="g-turn">👀 İzliyorsun · Sıra: ${dn}</span>`;
  else if (v.phase === 'choose') h = `<span class="g-turn">Sıra: ${dn} · kelime seçiyor</span>`;
  else if (meGot) h = '<span class="g-turn win">Bildin! ✓ Diğerleri bekleniyor</span>';
  else h = `<span class="g-turn">Çizen: ${dn} · tahmin et!</span>`;
  st.innerHTML = h;
}
function renderOverlay(v) {
  const ov = q('.cb-over'), p = v.players;
  let h = '';
  if (v.phase === 'choose') {
    const name = esc(p[v.drawer].name);
    if (v.choices && (!isLocal() || localReveal)) {
      h = `<div class="cb-card"><p class="cb-ot">${isLocal() ? `${name}, bir kelime seç` : 'Çizeceğin kelimeyi seç'}</p><div class="cb-choices">${v.choices.map((c, k) => `<button type="button" class="cb-choice d-${c.d}" data-pick="${k}"><b>${esc(c.w)}</b><small>${DIFF[c.d].label}${DIFF[c.d].mult > 1 ? ` · +%${Math.round((DIFF[c.d].mult - 1) * 100)} puan` : ''}</small></button>`).join('')}</div>${v.left != null ? '<p class="cb-os">Süre bitince rastgele seçilir</p>' : ''}</div>`;
    } else if (v.choices && isLocal()) {
      h = `<div class="cb-card"><div class="cb-big">📱</div><p class="cb-ot">Telefonu <b style="color:${p[v.drawer].color}">${name}</b> alsın</p><p class="cb-os">Kelimeleri yalnızca çizen görsün.</p><button type="button" class="btn btn-spin" data-act="showChoices">Kelimeleri göster</button></div>`;
    } else {
      h = `<div class="cb-card"><div class="cb-big cb-pulse">✏️</div><p class="cb-ot"><b style="color:${p[v.drawer].color}">${name}</b> kelime seçiyor…</p></div>`;
    }
  } else if (v.phase === 'reveal' || v.phase === 'end') {
    const who = p.map((x, i) => ({ x, i })).filter(o => o.x.gain);
    h = `<div class="cb-card cb-rev"><p class="cb-os">${v.phase === 'end' ? 'Son kelime' : 'Kelime'}</p><div class="cb-revw">${[...(v.word || '')].map((c, k) => c === ' ' ? '<i class="sp"> </i>' : `<i style="--k:${k}">${esc(c)}</i>`).join('')}</div>
      <p class="cb-os">${v.okCount ? `${v.okCount} kişi bildi` : 'Kimse bilemedi 😅'}</p>
      ${who.length ? `<div class="cb-gains">${who.map(o => `<span style="--pc:${o.x.color}">${esc(o.x.name)} <b>+${o.x.gain}</b></span>`).join('')}</div>` : ''}</div>`;
  }
  if (ov.dataset.h !== h) { ov.innerHTML = h; ov.dataset.h = h; }   // aynı içerikte animasyonlar yeniden başlamasın
  ov.hidden = !h;
  ov.classList.toggle('rev', v.phase === 'reveal' || v.phase === 'end');
}
function renderTools() {
  const t = q('.cb-tools'); if (!t || !V) return;
  const show = amDrawer() && V.phase === 'draw';
  t.hidden = !show;
  const dis = !canDraw();
  t.querySelectorAll('button').forEach(b => {
    b.disabled = dis;
    if (b.dataset.c != null) b.classList.toggle('on', +b.dataset.c === tool.c);
    if (b.dataset.w != null) { b.classList.toggle('on', +b.dataset.w === tool.w); b.style.setProperty('--dot', tool.c === ERASER ? '#ddd' : PALETTE[tool.c]); }
  });
  q('.cb-board').classList.toggle('can', canDraw());
  q('.cb-board').classList.toggle('erase', canDraw() && tool.c === ERASER);
}
function renderAward(v) {
  const box = q('.cb-award');
  if (!isLocal() || v.phase !== 'draw') { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  box.innerHTML = `<span class="cb-al">Kim bildi?</span>` + v.players.map((p, i) => i === v.drawer ? '' :
    `<button type="button" class="cb-aw ${p.got ? 'done' : ''}" style="--pc:${p.color}" data-award="${i}" ${p.got ? 'disabled' : ''}>${p.got ? '✓ ' : 'Bildi: '}${esc(p.name)}</button>`).join('') +
    `<button type="button" class="cb-aw end" data-act="endTurn">⏭ Turu bitir</button>`;
}
function chatLine(m) {
  const p = V && V.players[m.pi];
  const nm = p ? `<b style="color:${p.color}">${esc(p.name)}</b>` : '';
  if (m.k === 'g') return `<li class="g">${nm}<span>${esc(m.tx)}</span></li>`;
  if (m.k === 'ok') return `<li class="ok">${nm}<span>bildi! ✓</span></li>`;
  if (m.k === 'me') return `<li class="me">🎉 <span>Bildin! <b>${esc(m.tx)}</b> · +${m.pts}</span></li>`;
  if (m.k === 'near') return `<li class="near">🔥 <span>“${esc(m.tx)}” — çok yakın!</span></li>`;
  if (m.k === 'part') return `<li class="near">🧩 <span>“${esc(m.tx)}” — kelimelerden biri doğru!</span></li>`;
  return `<li class="sys ${m.cls || ''}"><span>${esc(m.tx)}</span></li>`;
}
function renderChat() {
  const ol = q('.cb-msgs'); if (!ol) return;
  const nearBottom = ol.scrollHeight - ol.scrollTop - ol.clientHeight < 60;
  const items = [];
  let ei = 0;
  const ex = extras.slice().sort((a, b) => a.after - b.after);
  for (const m of chatList) { while (ei < ex.length && ex[ei].after < m.id) items.push(ex[ei++]); items.push(m); }
  while (ei < ex.length) items.push(ex[ei++]);
  ol.innerHTML = items.slice(-70).map(m => m.k ? chatLine(m) : `<li class="sys ${m.cls || ''}"><span>${esc(m.tx)}</span></li>`).join('') || '<li class="sys"><span>Tahminler burada görünür.</span></li>';
  if (nearBottom || ol.dataset.init !== '1') { ol.scrollTop = ol.scrollHeight; ol.dataset.init = '1'; }
}
function renderForm(v) {
  const inp = q('.cb-in'), btn = q('.cb-send'), form = q('.cb-form');
  form.hidden = isLocal();
  if (isLocal()) return;
  const me = ui.me, spect = typeof me !== 'number' || me < 0;
  let ph = 'Tahminini yaz…', dis = false;
  if (spect) { ph = 'İzleyiciler yazamaz'; dis = true; }
  else if (v.phase === 'draw' && me === v.drawer) { ph = 'Çizerken yazamazsın ✏️'; dis = true; }
  else if (v.phase === 'draw' && v.players[me].got) { ph = 'Bildin! ✓ Bekle…'; dis = true; }
  else if (v.phase === 'end') { ph = 'Oyun bitti'; dis = true; }
  else if (v.phase !== 'draw') ph = 'Sohbet et…';
  inp.placeholder = ph;
  if (inp.disabled !== dis) { inp.disabled = dis; if (dis) inp.blur(); }
  btn.disabled = dis;
}
function render(v) {
  const prev = V; V = v;
  if (!root) return;
  const key = v.turn + ':' + v.phase;
  if (key !== lastKey) {
    if (!prev || prev.turn !== v.turn) { localReveal = false; tool.w = 1; if (tool.c === ERASER) tool.c = 0; }
    peekShow = false; lastKey = key;
  }
  mergeStrokes(v); redraw();
  // zaman
  dur = v.dur || 1; deadline = v.left != null ? performance.now() + v.left : 0;
  chatList = v.chat || []; lastChatId = chatList.length ? chatList[chatList.length - 1].id : lastChatId;
  renderPlayers(v); renderHead(v); renderStatus(v); renderOverlay(v); renderTools(); renderAward(v); renderForm(v); renderChat();
  root.querySelector('.cb').dataset.phase = v.phase;
  root.querySelector('.cb').classList.toggle('is-drawer', amDrawer() && !isLocal());
  root.querySelector('.cb').classList.toggle('is-local', isLocal());
  tickTimer();
}
function tickTimer() {
  const bar = q('.cb-timer i'), num = q('.cb-time'); if (!bar || !V) return;
  if (!deadline) { bar.style.transform = 'scaleX(0)'; num.textContent = V.phase === 'choose' ? '…' : '–'; num.classList.remove('low'); bar.parentElement.classList.remove('low'); return; }
  const left = Math.max(0, deadline - performance.now()), f = clamp(left / dur, 0, 1);
  bar.style.transform = `scaleX(${f})`;
  const s = Math.ceil(left / 1000);
  num.textContent = timeLabel(left);
  const low = V.phase === 'draw' && s <= 10;
  num.classList.toggle('low', low); bar.parentElement.classList.toggle('low', low);
  if (V.phase === 'draw' && s <= 5 && s > 0 && s !== lastTickSec) { lastTickSec = s; Sound.tick(.8); }
}

/* ---------- olaylar ---------- */
function onEvent(e, api) {
  if (!root || !V) return;
  if (e.tn != null && e.tn !== V.turn && e.t !== 'turn') return;
  if (e.t === 'pts') {
    if (amDrawer()) return;                     // çizen kendi çizgisini zaten çizdi
    let s = M.strokes.find(x => x.i === e.s);
    if (!s) { s = { i: e.s, c: e.c, w: e.w, p: [] }; M.strokes.push(s); M.nid = Math.max(M.nid, e.s + 1); }
    const have = s.p.length;
    if (e.o + e.p.length <= have) return;
    const add = e.p.slice(Math.max(0, have - e.o));
    for (const n of add) s.p.push(n);
    drawSeg(s, have);
  } else if (e.t === 'undo') {
    if (amDrawer()) return;
    const k = M.strokes.findIndex(x => x.i === e.s); if (k >= 0) { M.strokes.splice(k, 1); redraw(); }
  } else if (e.t === 'clear') {
    if (amDrawer()) return;
    M.strokes = []; redraw();
  } else if (e.t === 'chat') {
    const m = e.m; if (!m || m.id <= lastChatId) return;
    chatList.push(m); lastChatId = m.id; renderChat();
    if (m.k === 'ok') {
      const mine = m.pi === ui.me;
      Sound.good();
      if (mine) { flash('good'); banner('BİLDİN! ✓', 'good'); }
      const chip = q(`.cb-pl[data-pi="${m.pi}"]`); if (chip) { const [x, y] = centerOf(chip); FX.burst(x, y, 26); }
    } else if (m.k === 'g') Sound.tick(.3);
  } else if (e.t === 'turn') { Sound.whoosh(); }
  else if (e.t === 'start') { Sound.stop(); if (e.drawer === ui.me && !isLocal()) banner('ÇİZ!', 'pink'); }
  else if (e.t === 'hint') Sound.special();
  else if (e.t === 'reveal') {
    if (e.ok) { Sound.solve(); FX.confetti(50); } else Sound.bad();
    banner(e.word, e.ok ? 'good' : 'bad');
  }
}
function addLog(tx, cls) { extras.push({ after: lastChatId, tx, cls }); if (extras.length > 20) extras.shift(); renderChat(); }

/* ---------- kurulum ---------- */
function onClick(e) {
  const b = e.target.closest('button'); if (!b || b.disabled || !V) return;
  if (b.closest('.cb-tools')) { toolClick(b); return; }
  if (b.dataset.pick != null) { Sound.init(); send({ t: 'pick', k: +b.dataset.pick }); b.closest('.cb-choices').querySelectorAll('button').forEach(x => { x.disabled = true; }); return; }
  if (b.dataset.award != null) { Sound.init(); send({ t: 'award', who: +b.dataset.award }); return; }
  const act = b.dataset.act;
  if (act === 'showChoices') { localReveal = true; Sound.tick(.5); renderOverlay(V); }
  else if (act === 'peek') { peekShow = !peekShow; clearTimeout(peekT); if (peekShow) peekT = setTimeout(() => { peekShow = false; if (V) renderHead(V); }, 2500); renderHead(V); }
  else if (act === 'endTurn') { send({ t: 'endTurn' }); }
}
function onSubmit(e) {
  e.preventDefault();
  const inp = q('.cb-in'); const tx = inp.value.replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!tx || inp.disabled) return;
  Sound.init(); ui.send({ t: 'guess', tx }); inp.value = ''; inp.focus();
}
function mount(r, api) {
  root = r; ui = api; V = null;
  M.turn = -1; M.strokes = []; M.nid = 0; M.myNext = 0; M.gone = new Set(); M.floor = 0; cur = null; queue = [];
  chatList = []; extras = []; lastChatId = 0; lastKey = ''; tool = { c: 0, w: 1 };
  const colors = PALETTE.map((c, i) => `<button type="button" class="cb-col" data-c="${i}" style="--sw:${c}" aria-label="${COLOR_NAMES[i]}"></button>`).join('');
  root.innerHTML = `<div class="g-wrap cb">
    <div class="cb-players"></div>
    <section class="cb-stage">
      <div class="g-status cb-status"></div>
      <div class="cb-head">
        <span class="cb-time">–</span>
        <div class="cb-word"></div>
      </div>
      <div class="cb-timer"><i></i></div>
      <div class="cb-meta"><span class="cb-round"></span><span class="cb-diff" hidden></span></div>
      <div class="cb-board"><canvas aria-label="Çizim tuvali"></canvas><div class="cb-over" hidden></div></div>
      <div class="cb-tools" hidden>
        <div class="cb-cols">${colors}</div>
        <div class="cb-acts">
          ${SIZES.map((_, i) => `<button type="button" class="cb-size s${i}" data-w="${i}" aria-label="${['İnce', 'Orta', 'Kalın'][i]} fırça"><i></i></button>`).join('')}
          <button type="button" class="cb-tb" data-c="${ERASER}" aria-label="Silgi">🧽</button>
          <button type="button" class="cb-tb" data-tool="undo" aria-label="Geri al">↶</button>
          <button type="button" class="cb-tb" data-tool="clear" aria-label="Temizle">🗑️</button>
        </div>
      </div>
      <div class="cb-award" hidden></div>
    </section>
    <section class="cb-chat">
      <ol class="cb-msgs" aria-live="polite"></ol>
      <form class="cb-form" autocomplete="off">
        <input class="cb-in" maxlength="40" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="send" aria-label="Tahmin">
        <button type="submit" class="btn btn-vowel cb-send">Gönder</button>
      </form>
    </section>
  </div>`;
  cv = q('canvas'); cx = cv.getContext('2d');
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp);
  cv.addEventListener('pointercancel', onUp);
  cv.addEventListener('lostpointercapture', onUp);
  root.addEventListener('click', onClick);
  q('.cb-form').addEventListener('submit', onSubmit);
  if (window.ResizeObserver) { ro = new ResizeObserver(() => fitCanvas()); ro.observe(q('.cb-board')); }
  addEventListener('resize', fitCanvas);
  fitCanvas();
  timerT = setInterval(tickTimer, 200);
}
function unmount() {
  clearInterval(timerT); timerT = null; clearInterval(flushT); flushT = null; clearTimeout(peekT);
  if (ro) { ro.disconnect(); ro = null; }
  removeEventListener('resize', fitCanvas);
  if (root) root.removeEventListener('click', onClick);
  root = null; ui = null; V = null; cv = null; cx = null; cur = null;
}

CFX.registerGame({
  id: 'cizbil', name: 'Çiz Bil', icon: '🎨', color: '#ff3fa4', min: 2, max: 6, hotseat: true, bot: false, localMin: 2,
  tagline: 'Çiz, tahmin et, en hızlı bilen kazansın',
  rules: 'Sırası gelen üç kelimeden birini seçip çizer, diğerleri tahminini yazar. Ne kadar erken bilirsen o kadar çok puan; çizen de her bilen için puan alır. Tek telefonda oynarken herkes sesli tahmin eder, çizen bileni seçer.',
  options: [
    { key: 'rounds', label: 'Herkes kaç kez çizsin', def: '2', choices: [{ v: '1', label: '1' }, { v: '2', label: '2' }, { v: '3', label: '3' }] },
    { key: 'time', label: 'Çizim süresi', def: '80', choices: [{ v: '60', label: '60 sn' }, { v: '80', label: '80 sn' }, { v: '100', label: '100 sn' }] }
  ],
  setup(players, opts, ctx) {
    const rounds = clamp(+opts.rounds || 2, 1, 3), sec = [60, 80, 100].includes(+opts.time) ? +opts.time : 80;
    const st = {
      pl: players.map(p => ({ name: p.name, color: p.color })), score: players.map(() => 0), on: players.map(() => true),
      local: ctx.mode === 'local', rounds, drawSec: sec, total: players.length * rounds, turn: -1, drawer: 0,
      phase: 'choose', choices: [], word: '', diff: 'k', got: [], gain: [], hints: [], used: [],
      strokes: [], nid: 0, npts: 0, chat: [], chatSeq: 0, tk: 0, startAt: 0, endAt: 0, chooseEnd: 0, revealEnd: 0,
      reason: '', correct: 0, lastGuess: players.map(() => 0)
    };
    chat(st, { k: 'sys', tx: `🎨 Çiz Bil başladı! Herkes ${rounds} kez çizecek, süre ${sec} sn.`, cls: 'gold' });
    nextTurn(st, ctx);                       // ilk turu hemen hazırla (ilk görünüm boş kalmasın)
    return st;
  },
  action(st, pi, a, ctx) {
    if (st.phase === 'end') return;
    switch (a.t) {
      case 'pick': {
        if (st.phase !== 'choose' || pi !== st.drawer) return;
        const k = a.k | 0; if (k < 0 || k > 2) return;
        startDraw(st, ctx, k); return;
      }
      case 'pts': addPts(st, pi, a, ctx); return;
      case 'undo': {
        if (st.phase !== 'draw' || pi !== st.drawer) return;
        const k = st.strokes.findIndex(x => x.i === a.s); if (k < 0) return;
        const s = st.strokes.splice(k, 1)[0]; st.npts -= s.p.length / 2;
        ctx.emit({ t: 'undo', s: s.i, tn: st.turn }); return;
      }
      case 'clear': {
        if (st.phase !== 'draw' || pi !== st.drawer) return;
        st.strokes = []; st.npts = 0;
        ctx.emit({ t: 'clear', tn: st.turn }); return;
      }
      case 'award': {
        if (!st.local || st.phase !== 'draw' || pi !== st.drawer) return;
        const w = a.who | 0; if (w === st.drawer || w < 0 || w >= nOf(st) || st.got[w] != null) return;
        correct(st, w, ctx); return;
      }
      case 'endTurn': {
        if (!st.local || st.phase !== 'draw' || pi !== st.drawer) return;
        endTurn(st, ctx, 'manual'); return;
      }
      case 'guess': {
        if (st.local || typeof a.tx !== 'string') return;
        const tx = a.tx.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
        if (!tx) return;
        const now = Date.now(); if (now - st.lastGuess[pi] < GUESS_GAP) return; st.lastGuess[pi] = now;
        if (st.phase === 'draw') {
          if (pi === st.drawer || st.got[pi] != null) return;     // çizen ve bilen yazamaz (kelime sızmasın)
          const j = judge(tx, st.word);
          if (j === 'ok') { correct(st, pi, ctx); return; }
          if (j === 'near' || j === 'part') { chat(st, { k: j, to: pi, tx }); ctx.sync(); return; }
        }
        const m = chat(st, { k: 'g', pi, tx });
        ctx.emit({ t: 'chat', m, tn: st.turn });          // yanlış tahmin: herkes görür (senkron yok, çizim büyük olabilir)
        return;
      }
      default:
    }
  },
  view(st, viewer) {
    const all = viewer === 'all';
    const isDrawer = all || viewer === st.drawer;
    const ended = st.phase === 'reveal' || st.phase === 'end';
    const knows = st.phase !== 'choose' && (isDrawer || ended || (typeof viewer === 'number' && viewer >= 0 && st.got[viewer] != null));
    const now = Date.now();
    let left = null, d = 1;
    if (st.phase === 'draw') { left = Math.max(0, st.endAt - now); d = st.endAt - st.startAt; }
    else if (st.phase === 'choose' && st.chooseEnd) { left = Math.max(0, st.chooseEnd - now); d = CHOOSE_MS; }
    else if (st.phase === 'reveal') { left = Math.max(0, st.revealEnd - now); d = REVEAL_MS; }
    // Bilmeyen için yalnızca harf sayısı + açılan ipuçları. "all" (tek cihaz) da maskeyi alır: telefonu herkes görür.
    let mask = null;
    if (st.word && (!knows || all)) {
      let k = 0;
      mask = st.word.split(' ').map(w => { const r = [...w].map(c => { const i = k++; return st.hints.includes(i) ? c : ''; }); k++; return r; });
    }
    return {
      phase: st.phase, turn: st.turn, total: st.total, rounds: st.rounds, round: Math.min(st.rounds, Math.floor(Math.max(0, st.turn) / nOf(st)) + 1),
      drawer: st.drawer, left, dur: d, diff: st.phase === 'choose' ? null : st.diff,
      word: knows ? st.word : null, mask,
      choices: st.phase === 'choose' && isDrawer ? st.choices.map(i => ({ w: WORDS[i].w, d: WORDS[i].d })) : null,
      okCount: st.got.filter(x => x != null).length,
      players: st.pl.map((p, i) => ({ name: p.name, color: p.color, score: st.score[i], on: st.on[i], got: st.got[i] != null, gain: ended ? st.gain[i] : 0 })),
      strokes: st.strokes.map(s => ({ i: s.i, c: s.c, w: s.w, p: enc(s.p) })), nid: st.nid,
      chat: st.chat.filter(m => m.to == null || m.to === viewer).slice(-40)
    };
  },
  turnOf(st) { return st.phase === 'choose' ? st.drawer : null; },
  skipTurn(st, pi, ctx) {
    // Kelime seçimi bekleniyor: çizen bağlıysa kelime otomatik seçilir; bağlı değilse
    // (çizen yokken tur oynanamaz) çizim sırası geçer.
    if (st.phase !== 'choose' || st.drawer !== pi) return;
    if (st.on[pi]) { sysChat(st, ctx, `${st.pl[pi].name} için kelime otomatik seçildi.`, ''); startDraw(st, ctx, Math.floor(Math.random() * 3)); return; }
    sysChat(st, ctx, `${st.pl[pi].name} bağlı değil, çizim sırası geçti.`, 'bad');
    nextTurn(st, ctx);
  },
  onPresence(st, pi, online, ctx) {
    st.on[pi] = online;
    if (online || st.phase !== 'draw') return;
    if (pi === st.drawer) { endTurn(st, ctx, 'left'); return; }
    const g = guessers(st);
    if (!g.length) endTurn(st, ctx, 'empty');
    else if (g.every(i => st.got[i] != null)) endTurn(st, ctx, 'all');
  },
  resume(st, ctx) { st.tk++; if (st.phase === 'end') return; arm(st, ctx); },
  mount, render, onEvent, unmount,
  log(text, cls) { addLog(text, cls); },
  _test: { judge, norm, enc, dec, rdp, WORDS }
});
})();
