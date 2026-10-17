/* =========================================================================
   OYUN SALONU — KELİME KODU
   İki takım (Mavi / Kırmızı), her takımda bir Kaptan. 5×5 kelime tahtasında
   hangi kartın hangi takımın ajanı olduğunu yalnızca kaptanlar bilir.
   Kaptan tek kelimelik bir ipucu ve bir sayı verir; takım arkadaşları kartlara
   dokunarak önerir, biri onaylayınca kart açılır. Kendi ajanlarını önce bulan
   takım turu kazanır; Bomba'yı açan takım anında kaybeder.
   4–8 kişi online ya da tek cihazda (kaptan anahtarı gizlenebilir perdeyle).
   Gizlilik: view() açılmamış kartların rengini yalnızca o turun kaptanlarına
   (ve tek cihaz görüntüsüne 'all') gönderir.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial, shuffle, centerOf } = CFX;

/* ---------- sabitler ---------- */
const TEAMS = [
  { n: 'Mavi', up: 'MAVİ', c: '#3d8bff' },
  { n: 'Kırmızı', up: 'KIRMIZI', c: '#ff4d5e' }
];
const NEU = 2, BOMB = 3, SIZE = 25;
const KIND = ['Mavi ajan', 'Kırmızı ajan', 'Sivil', 'Bomba'];
const NEXT_MS = 9000, FINAL_MS = 4200;
const trUp = s => String(s).toLocaleUpperCase('tr-TR');
const FOLD = { 'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U', 'Â': 'A', 'Î': 'I', 'Û': 'U' };
const fold = s => [...trUp(s)].map(c => FOLD[c] || c).join('');

/* ---------- kelime listesi: somut, tahmin edilebilir adlar (özel ad yok) ---------- */
const WORDS = [...new Set([
  'ASLAN KAPLAN KEDİ KÖPEK EŞEK KATIR İNEK BOĞA KOYUN KEÇİ TAVUK HOROZ ÖRDEK KAZ HİNDİ KARTAL ŞAHİN BAYKUŞ KARGA SERÇE GÜVERCİN PAPAĞAN PENGUEN YUNUS BALİNA AHTAPOT YENGEÇ ISTAKOZ KARİDES MİDYE KURBAĞA YILAN TİMSAH FİL ZÜRAFA ZEBRA GERGEDAN MAYMUN GORİL AYI KURT TİLKİ TAVŞAN SİNCAP FARE KİRPİ GEYİK CEYLAN DEVE KANGURU KOALA PANDA ARI KARINCA SİNEK KELEBEK ÖRÜMCEK AKREP SOLUCAN ÇEKİRGE LEYLEK FLAMİNGO TAVUS KUĞU MARTI BÜLBÜL DENİZATI MEDUZA SOMON HAMSİ ALABALIK',
  'EKMEK PEYNİR ZEYTİN BAL REÇEL YUMURTA SÜT YOĞURT AYRAN ÇAY KAHVE ŞEKER TUZ BİBER SOĞAN SARIMSAK DOMATES PATATES HAVUÇ KABAK PATLICAN ISPANAK MARUL LAHANA TURP MISIR PİRİNÇ MAKARNA ÇORBA PİLAV KÖFTE KEBAP DÖNER PİDE LAHMACUN MANTI BÖREK SİMİT POĞAÇA BAKLAVA LOKUM HELVA DONDURMA ÇİKOLATA PASTA KURABİYE KEK GOFRET ELMA ARMUT AYVA ERİK KİRAZ VİŞNE ÇİLEK MUZ PORTAKAL LİMON KARPUZ KAVUN ÜZÜM İNCİR NAR ŞEFTALİ KAYISI ANANAS CEVİZ FINDIK FISTIK BADEM KESTANE MANTAR SALATA TURŞU SUCUK PASTIRMA SALAM SOSİS PİZZA TOST SANDVİÇ KRAKER CİPS SİRKE',
  'MASA SANDALYE KOLTUK YATAK YASTIK YORGAN HALI PERDE LAMBA AYNA DOLAP ÇEKMECE KAPI PENCERE MERDİVEN BACA ÇATI DUVAR TAVAN BALKON MUTFAK BANYO OCAK FIRIN TENCERE TAVA DEMLİK BARDAK FİNCAN TABAK KAŞIK ÇATAL BIÇAK KEPÇE SÜRAHİ ŞİŞE KAVANOZ KUTU SEPET KOVA SÜPÜRGE PASPAS SABUN ŞAMPUAN HAVLU TARAK FIRÇA MAKAS İĞNE İPLİK DÜĞME FERMUAR ANAHTAR KİLİT ZİL SAAT TAKVİM VAZO ÇİÇEK MUM KİBRİT ÇAKMAK SOBA KLİMA RADYO TELEFON KAMERA PİL AMPUL PRİZ KABLO ÜTÜ MANDAL ASKI BAVUL ÇANTA CÜZDAN ŞEMSİYE GÖZLÜK YÜZÜK KOLYE KÜPE BİLEZİK TAÇ ŞAPKA KASKET BERE ATKI ELDİVEN ÇORAP TERLİK ÇİZME SANDALET KEMER KRAVAT GÖMLEK CEKET PALTO MONT KAZAK ETEK ELBİSE PANTOLON ŞORT PİJAMA MAYO ÖNLÜK',
  'KALEM SİLGİ DEFTER KİTAP CETVEL PERGEL TEBEŞİR TAHTA HARİTA KÜRE ZARF MEKTUP PUL MÜHÜR GAZETE DERGİ SÖZLÜK ATLAS KLASÖR ZIMBA RAPTİYE ATAŞ BANT BOYA PALET TUVAL HEYKEL TABLO ÇERÇEVE',
  'ARABA OTOBÜS KAMYON TAKSİ TREN METRO TRAMVAY VAPUR GEMİ KAYIK SANDAL YAT UÇAK ROKET BALON PARAŞÜT BİSİKLET MOTOR KIZAK PATEN KAYKAY TEKERLEK DÜMEN ÇAPA YELKEN KÜREK PUSULA DÜRBÜN ROBOT KLAVYE EKRAN YAZICI KULAKLIK MİKROFON ANTEN UYDU MIKNATIS VİDA ÇİVİ ÇEKİÇ PENSE TESTERE BALTA TIRPAN ORAK KAZMA TIRMIK HALAT ZİNCİR KANCA VİNÇ TRAKTÖR KILIÇ KALKAN YAY MIZRAK TOP TOPUZ',
  'GÜNEŞ YILDIZ BULUT YAĞMUR KAR DOLU ŞİMŞEK YILDIRIM RÜZGAR FIRTINA SİS BUZ DAĞ TEPE VADİ ORMAN AĞAÇ YAPRAK DAL KÖK GÜL LALE PAPATYA MENEKŞE KAKTÜS ÇAM MEŞE SÖĞÜT PALMİYE ÇİMEN YOSUN NEHİR IRMAK GÖL DENİZ OKYANUS ADA KUM PLAJ DALGA ŞELALE MAĞARA KAYA TAŞ ÇAKIL VOLKAN ÇÖL VAHA BUZUL KUTUP KRATER YANARDAĞ KÖPRÜ KUYU ÇEŞME TOPRAK ÇAMUR KÖMÜR ALTIN GÜMÜŞ BAKIR DEMİR ELMAS İNCİ YAKUT ZÜMRÜT KRİSTAL',
  'OKUL HASTANE ECZANE BANKA MÜZE SİNEMA TİYATRO CAMİ KİLİSE KALE SARAY KULE ÇADIR KULÜBE AHIR ÇİFTLİK BAHÇE PARK PAZAR MARKET KASAP BERBER OTEL LOKANTA LİMAN İSKELE FENER DURAK TÜNEL YOL SOKAK MEYDAN STADYUM HAVUZ HAMAM KAPLICA ÇARŞI DÜKKAN ATÖLYE FABRİKA DEĞİRMEN BARAJ PİRAMİT LABİRENT ZINDAN ANIT',
  'KOL BACAK AYAK DİZ PARMAK TIRNAK KULAK BURUN AĞIZ DİŞ DİL DUDAK GÖZ KAŞ SAÇ SAKAL BIYIK KALP BEYİN KEMİK OMUZ BOYUN KAFA KANAT KUYRUK BOYNUZ PENÇE GAGA TÜY',
  'DOKTOR HEMŞİRE ÖĞRETMEN ASKER POLİS PİLOT AŞÇI GARSON ÇİFTÇİ BALIKÇI MADENCİ TERZİ RESSAM KRAL KRALİÇE PRENS PRENSES ŞÖVALYE KORSAN NİNJA CASUS DEDEKTİF BÜYÜCÜ CADI PERİ DEV CÜCE HAYALET VAMPİR ZOMBİ EJDERHA KUKLA PALYAÇO SİHİRBAZ ASTRONOT DALGIÇ AVCI ÇOBAN BEKÇİ HAKEM',
  'ZAR PARA KUMBARA HEDİYE KURDELE BAYRAK DAVUL ZURNA GİTAR KEMAN PİYANO FLÜT BAĞLAMA TROMPET ÇAN DÜDÜK ARP NOTA MASKE PELERİN ASA TAHT KUPA MADALYA ROZET IZGARA MANGAL MEŞALE KANDİL HAZİNE SANDIK KASA VARİL FIÇI ÇUVAL TORBA POŞET UÇURTMA TOPAÇ BİLYE SALINCAK KAYDIRAK OYUNCAK BEBEK SATRANÇ TAVLA DOMİNO HALTER RAKET FİLE FORMA ZIRH MİĞFER KASK HEDEF OLTA YEM KAFES YUVA KOVAN TUZAK HÖRGÜÇ MERCEK PRİZMA TERAZİ ŞIRINGA İLAÇ HAP MERHEM SARGI ALÇI BASTON KOLONYA PARFÜM RUJ OJE TOKA JİLET ÇAKI PİPO NARGİLE TESBİH HALKA DÜĞÜM URGAN SEHPA RAF BEŞİK HAMAK ÇİT KAPAK MUSLUK LAVABO DUŞ KÜVET BORU HORTUM POMPA KAZAN TÜP ODUN KİREMİT TUĞLA ÇİMENTO BETON CAM MERMER SERAMİK PORSELEN KAĞIT KARTON KUMAŞ İPEK YÜN PAMUK DERİ KÜRK LASTİK KÖPÜK TEL ÇUBUK SOPA DEĞNEK ATEŞ DUMAN LAV BİLET PASAPORT FATURA MAKBUZ KUPON ETİKET AFİŞ TABELA LEVHA IŞIK GÖLGE MOZAİK KİLİM DANTEL YELPAZE ÇARK DİŞLİ PERVANE YUMAK ŞİŞ SAZ NEY KAVAL DARBUKA TEF FİŞEK GEZEGEN METEOR'
].join(' ').split(/\s+/).filter(Boolean))];

/* ---------- tahta ve anahtar ---------- */
// 25 kelime; birbirinin içinde geçen kelimeler (KALE/KALEM gibi) aynı tahtaya gelmez.
function pickWords(n = SIZE) {
  const out = [], f = [];
  for (const w of shuffle(WORDS)) {
    const fw = fold(w);
    if (f.some(x => x.includes(fw) || fw.includes(x))) continue;
    out.push(w); f.push(fw);
    if (out.length === n) break;
  }
  return out;
}
// Başlayan takıma 9, diğerine 8 ajan; 7 sivil, 1 bomba.
function makeKey(start) {
  const k = [];
  for (let i = 0; i < 9; i++) k.push(start);
  for (let i = 0; i < 8; i++) k.push(1 - start);
  for (let i = 0; i < 7; i++) k.push(NEU);
  k.push(BOMB);
  return shuffle(k);
}
// İpucu denetimi: tek kelime, yalnızca harf; tahtadaki bir kelime, onun parçası ya da onu içeren bir kelime olamaz.
function validateClue(words, raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return { ok: false, err: 'Bir ipucu kelimesi yaz.' };
  if (/\s/.test(s)) return { ok: false, err: 'İpucu tek kelime olmalı.' };
  const W = trUp(s.normalize('NFC')).replace(/\u0307/g, '');
  if (!/^[A-ZÇĞIİÖŞÜÂÎÛ]+$/.test(W)) return { ok: false, err: 'Yalnızca harf kullan (rakam, boşluk, işaret yok).' };
  if (W.length < 2) return { ok: false, err: 'İpucu en az 2 harf olmalı.' };
  if (W.length > 20) return { ok: false, err: 'İpucu en fazla 20 harf olabilir.' };
  const fw = fold(W);
  for (const b of words || []) {
    const fb = fold(b);
    if (fb === fw) return { ok: false, err: 'Tahtadaki bir kelimeyi ipucu olarak veremezsin.' };
    if (fw.includes(fb) || fb.includes(fw)) return { ok: false, err: `İpucu tahtadaki “${b}” kelimesinin parçası ya da onu içeriyor.` };
  }
  return { ok: true, w: W };
}

/* ---------- kurallar (yöneten cihaz) ---------- */
const membersOf = (st, t) => st.team.map((x, i) => (x === t ? i : -1)).filter(i => i >= 0);
const leftOf = (st, t) => st.key ? st.key.filter((k, i) => k === t && !st.rev[i]).length : 0;
const totalOf = (st, t) => st.key ? st.key.filter(k => k === t).length : 0;
const isGuesser = (st, pi) => st.phase === 'guess' && st.team[pi] === st.cur && st.caps[st.cur] !== pi;
const emptyProps = () => Array.from({ length: SIZE }, () => []);
const pname = (st, pi) => (st.players[pi] ? st.players[pi].name : '?');

function fixCaps(st) {
  for (const t of [0, 1]) {
    const m = membersOf(st, t);
    if (st.capPick[t] == null || st.team[st.capPick[t]] !== t) st.capPick[t] = m.length ? m[0] : null;
  }
}
function autoTeams(st, order) {
  order.forEach((pi, k) => { st.team[pi] = k % 2; });
  st.capPick = [null, null]; fixCaps(st);
}
function setupProblem(st) {
  const a = membersOf(st, 0).length, b = membersOf(st, 1).length;
  if (a < 2 || b < 2) return 'Her takımda en az 2 oyuncu olmalı.';
  if (st.capPick[0] == null || st.capPick[1] == null) return 'Her takımın bir kaptanı olmalı.';
  return '';
}

function arm(st, ctx) {
  const tk = st.tk, now = Date.now();
  if ((st.phase === 'clue' || st.phase === 'guess') && st.deadline) {
    ctx.later(Math.max(0, st.deadline - now), () => { if (st.tk === tk) timeUp(st, ctx); });
  } else if (st.phase === 'roundEnd' && st.nextAt) {
    ctx.later(Math.max(0, st.nextAt - now), () => { if (st.tk === tk) advance(st, ctx); });
  }
}
function phaseTimer(st, ctx) {
  st.tk++;
  st.deadline = st.timer ? Date.now() + st.timer * 1000 : 0;
  arm(st, ctx);
}
function startRound(st, ctx) {
  st.round++;
  const r = st.round - 1;
  st.caps = [0, 1].map(t => { const m = membersOf(st, t); const b = Math.max(0, m.indexOf(st.capPick[t])); return m[(b + r) % m.length]; });
  st.start = r === 0 ? (Math.random() < .5 ? 0 : 1) : 1 - st.start;
  st.words = pickWords(); st.key = makeKey(st.start);
  st.rev = new Array(SIZE).fill(false); st.revBy = new Array(SIZE).fill(null);
  st.cur = st.start; st.phase = 'clue'; st.clue = null; st.guesses = 0; st.props = emptyProps();
  st.clues = []; st.last = null; st.roundWinner = null; st.why = ''; st.nextAt = 0;
  phaseTimer(st, ctx);
  ctx.emit({ t: 'round', round: st.round, start: st.start },
    `${st.round}. tur başladı. Kaptanlar: ${pname(st, st.caps[0])} (Mavi), ${pname(st, st.caps[1])} (Kırmızı). ${TEAMS[st.start].n} takım başlıyor (9 ajan).`, 'gold');
  ctx.sync();
}
function endTurn(st, ctx, why) {
  if (st.phase !== 'clue' && st.phase !== 'guess') return;
  const prev = st.cur;
  st.cur = 1 - st.cur; st.phase = 'clue'; st.clue = null; st.guesses = 0; st.props = emptyProps();
  phaseTimer(st, ctx);
  const pre = why === 'pass' ? `${TEAMS[prev].n} takım pas dedi. ` : why === 'limit' ? `${TEAMS[prev].n} takım tahmin hakkını doldurdu. ` : '';
  ctx.emit({ t: 'turn', t2: st.cur, why }, `${pre}Sıra ${TEAMS[st.cur].n} takımda.`);
  ctx.sync();
}
function timeUp(st, ctx) {
  if (st.phase !== 'clue' && st.phase !== 'guess') return;
  ctx.emit({ t: 'timeup', ph: st.phase }, `⏱ Süre doldu! ${TEAMS[st.cur].n} takımın sırası bitti.`, 'bad');
  endTurn(st, ctx, 'time');
}
function endRound(st, ctx, winner, why) {
  st.phase = 'roundEnd'; st.roundWinner = winner; st.why = why; st.clue = null; st.props = emptyProps();
  st.wins[winner]++;
  for (const t of [0, 1]) st.pts[t] += totalOf(st, t) - leftOf(st, t);
  st.pts[winner] += 10;
  st.capBonus[st.caps[winner]] += 3;
  st.hist.push({ round: st.round, winner, why, caps: st.caps.slice() });
  const need = Math.floor(st.rounds / 2) + 1;
  st.final = st.wins[winner] >= need || st.round >= st.rounds;
  st.tk++; st.deadline = 0;
  st.nextAt = Date.now() + (st.final ? FINAL_MS : NEXT_MS);
  const txt = why === 'bomb' ? `💣 ${TEAMS[1 - winner].n} takım bombayı açtı! ${TEAMS[winner].n} takım turu kazandı.` : `${TEAMS[winner].n} takım tüm ajanlarını buldu ve turu kazandı!`;
  ctx.emit({ t: 'roundEnd', winner, why, final: st.final }, txt, 'gold');
  arm(st, ctx);
  ctx.sync();
}
function advance(st, ctx) {
  if (st.phase !== 'roundEnd') return;
  if (st.final) finish(st, ctx); else startRound(st, ctx);
}
function finish(st, ctx) {
  st.phase = 'over'; st.tk++;
  const W = st.wins[0] === st.wins[1] ? (st.pts[0] >= st.pts[1] ? 0 : 1) : (st.wins[0] > st.wins[1] ? 0 : 1);
  st.winner = W;
  const teamScore = t => st.pts[t] + (t === W ? 25 : 0);
  const rank = st.players.map((p, pi) => {
    const t = st.team[pi], cb = st.capBonus[pi], score = teamScore(t) + cb;
    return { pi, score, t, label: `${score} puan · ${TEAMS[t].n}${cb ? ` · kaptan +${cb}` : ''}` };
  }).sort((a, b) => (b.t === W) - (a.t === W) || b.score - a.score);
  ctx.emit({ t: 'over', winner: W }, `🏆 ${TEAMS[W].n} takım oyunu kazandı! (${st.wins[0]}–${st.wins[1]})`, 'gold');
  ctx.sync();
  ctx.end({
    title: `${TEAMS[W].n} takım kazandı!`,
    ranking: rank.map(r => ({ pi: r.pi, score: r.score, label: r.label })),
    note: `${st.rounds > 1 ? `Tur skoru ${st.wins[0]}–${st.wins[1]}. ` : ''}Takım puanı: açılan her ajan 1, kazanılan tur 10, oyunu kazanan takıma 25; turu kazanan kaptana +3.`
  });
}
function reveal(st, ctx, i, pi) {
  const k = st.key[i], t = st.cur, entry = st.clues[st.clues.length - 1];
  st.rev[i] = true; st.revBy[i] = t; st.props = emptyProps(); st.guesses++;
  if (entry) entry.res.push(k);
  st.last = { i, k, pi, t };
  const own = k === t;
  const msg = k === BOMB ? 'BOMBA! 💣' : own ? 'doğru, kendi ajanları ✓' : k === NEU ? 'sivil, sıra geçiyor' : `${TEAMS[k].n} ajanı! Sıra geçiyor`;
  ctx.emit({ t: 'reveal', i, k, t2: t, pi, w: st.words[i] }, `${pname(st, pi)} “${st.words[i]}” kartını açtı: ${msg}`, k === BOMB ? 'bad' : own ? 'good' : (k === NEU ? '' : 'bad'));
  if (k === BOMB) { endRound(st, ctx, 1 - t, 'bomb'); return; }
  if (!leftOf(st, t)) { endRound(st, ctx, t, 'cards'); return; }
  if (!leftOf(st, 1 - t)) { endRound(st, ctx, 1 - t, 'cards'); return; }
  if (own) {
    if (st.guesses >= st.clue.n + 1) endTurn(st, ctx, 'limit'); else ctx.sync();
  } else endTurn(st, ctx, 'miss');
}

/* ---------- arayüz (her cihaz) ---------- */
let root = null, ui = null, V = null, built = '', peek = false, peekAsk = false, phaseKey = '', lastRound = -1;
let prevRev = null, timerT = null, lastSec = -1, clueN = 1, clueErr = '', setupErr = '', sending = false;
const q = s => root && root.querySelector(s);
const isLocal = () => !!ui && ui.me === 'all';
const myTeam = v => (typeof ui.me === 'number' && ui.me >= 0 && v.team ? v.team[ui.me] : null);
const keyOpen = v => v.phase === 'roundEnd' || v.phase === 'over' || (isLocal() ? peek : (v.key || []).some((k, i) => k != null && !v.rev[i]));
const canClue = v => v.phase === 'clue' && (isLocal() ? peek : ui.me === v.caps[v.cur]);
const canGuess = v => v.phase === 'guess' && (isLocal() || (typeof ui.me === 'number' && v.team[ui.me] === v.cur && v.caps[v.cur] !== ui.me));
// Tek cihazda hamleyi kimin adına yaptığımız (core: a.as)
const asGuesser = v => { const m = v.team.map((t, i) => (t === v.cur && i !== v.caps[v.cur] ? i : -1)).filter(i => i >= 0); return m[0]; };
function send(a, as) { if (isLocal() && as != null) a.as = as; ui.send(a); }

const STAMP = {
  agent: '<svg class="kod-stamp" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="50" cy="50" r="37" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="3 3"/><path d="M36 45 Q37 25 50 28 Q63 25 64 45Z M25 46 Q50 37 75 46 L70 50 Q50 44 30 50Z" fill="currentColor"/><circle cx="50" cy="57" r="9.5" fill="currentColor"/><rect class="kod-gl" x="41" y="54" width="18" height="4.5" rx="2"/><path d="M28 82 Q30 67 50 67 Q70 67 72 82Z" fill="currentColor"/></svg>',
  neutral: '<svg class="kod-stamp" viewBox="0 0 100 100" aria-hidden="true"><rect x="8" y="8" width="84" height="84" rx="10" fill="none" stroke="currentColor" stroke-width="5"/><path d="M20 50 Q50 14 80 50 Q72 44 65 50 Q57 44 50 50 Q43 44 35 50 Q28 44 20 50Z" fill="currentColor"/><path d="M50 49 V74 Q50 82 42 80" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>',
  bomb: '<svg class="kod-stamp" viewBox="0 0 100 100" aria-hidden="true"><circle cx="44" cy="60" r="25" fill="currentColor"/><rect x="50" y="29" width="15" height="13" rx="2" transform="rotate(38 57 35)" fill="currentColor"/><path d="M63 29 Q70 16 81 20" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path class="kod-spark" d="M85 9 l3 7 7-2-5 6 5 6-7-2-3 7-2-7-7 2 5-6-5-6 7 2z"/><circle cx="35" cy="51" r="6" fill="#fff" opacity=".35"/></svg>'
};
const stampFor = k => (k === BOMB ? STAMP.bomb : k === NEU ? STAMP.neutral : STAMP.agent);
const LABEL = ['MAVİ AJAN', 'KIRMIZI AJAN', 'SİVİL', 'BOMBA'];

function avatar(p, i, extra = '') {
  return `<span class="av kod-av ${extra}" style="--pc:${p.color}" title="${esc(p.name)}">${initial(p.name)}</span>`;
}

/* ---- kurulum ekranı ---- */
function renderSetup(v) {
  const me = ui.me, local = isLocal(), host = ui.isHost;
  const prob = (() => {
    const a = v.team.filter(t => t === 0).length, b = v.team.filter(t => t === 1).length;
    if (a < 2 || b < 2) return 'Her takımda en az 2 oyuncu olmalı.';
    if (v.capPick[0] == null || v.capPick[1] == null) return 'Her takımın bir kaptanı olmalı.';
    return '';
  })();
  const col = t => {
    const m = v.players.map((p, i) => [p, i]).filter(([, i]) => v.team[i] === t);
    const rows = m.map(([p, i]) => {
      const cap = v.capPick[t] === i, mine = me === i;
      const ctrl = (local || host)
        ? `<button type="button" class="kod-mini" data-move="${i}" aria-label="${esc(p.name)} diğer takıma geçsin" title="Diğer takıma geçir">⇄</button>${cap ? '' : `<button type="button" class="kod-mini" data-capfor="${i}" aria-label="${esc(p.name)} kaptan olsun" title="Kaptan yap">🎖️</button>`}`
        : '';
      return `<li class="${cap ? 'cap' : ''} ${mine ? 'me' : ''} ${p.on === false ? 'off' : ''}">${avatar(p, i)}<b>${esc(p.name)}${mine ? ' <small>(sen)</small>' : ''}</b>${cap ? '<span class="kod-captag">🎖️ KAPTAN</span>' : ''}<span class="kod-rowctl">${ctrl}</span></li>`;
    }).join('') || '<li class="kod-empty">Henüz kimse yok</li>';
    let btns = '';
    if (!local && typeof me === 'number' && me >= 0) {
      if (v.team[me] !== t) btns = `<button type="button" class="btn btn-ghost kod-join" data-join="${t}">${TEAMS[t].n} takıma geç</button>`;
      else if (v.capPick[t] !== me) btns = `<button type="button" class="btn btn-ghost kod-join" data-cap="1">🎖️ Kaptan ben olayım</button>`;
    }
    return `<section class="kod-scol t${t}" style="--tc:${TEAMS[t].c}"><h3><span class="kod-dot"></span>${TEAMS[t].up} TAKIM <small>${m.length} kişi</small></h3><ul class="kod-slist">${rows}</ul>${btns}</section>`;
  };
  const foot = (local || host)
    ? `<div class="kod-sfoot"><p class="kod-smsg ${prob || setupErr ? 'bad' : ''}">${esc(prob || setupErr || (local ? 'Takımlar hazır. Kaptanlar ipucu verir, diğerleri tahmin eder.' : 'Takımlar hazır. Herkes kendi takımına dokunarak geçebilir.'))}</p>
       <div class="kod-sbtns"><button type="button" class="btn btn-vowel" data-shuffle="1">🔀 Karıştır</button><button type="button" class="btn btn-spin" data-start="1" ${prob ? 'disabled' : ''}>▶ GÖREVE BAŞLA</button></div></div>`
    : `<div class="kod-sfoot"><p class="kod-smsg">Takımını seç; kurucu hazır olunca görevi başlatacak.${prob ? ' ' + esc(prob) : ''}</p></div>`;
  q('.kod-body').innerHTML = `<div class="kod-setup">
    <div class="kod-shead g-panel"><span class="kod-folder">📁</span><div><b>GÖREV DOSYASI</b><p>İki takım, her takımda bir <b>Kaptan</b>. Kaptanlar kartların kime ait olduğunu bilir; tek kelimelik ipucu ve bir sayı verir. ${v.rounds > 1 ? 'Üç tur oynanır (iki turu alan kazanır), kaptanlar her tur değişir.' : ''}</p></div></div>
    <div class="kod-scols">${col(0)}${col(1)}</div>${foot}</div>`;
}

/* ---- oyun ekranı ---- */
function buildGame() {
  let cards = '';
  for (let i = 0; i < SIZE; i++) {
    cards += `<div class="kod-card" data-i="${i}" role="button" tabindex="0"><div class="kod-inner">
      <div class="kod-face kod-front"><i class="kod-tab"></i><i class="kod-clip"></i><span class="kod-word"></span><span class="kod-keylab"></span><span class="kod-props"></span></div>
      <div class="kod-face kod-back"><span class="kod-bst"></span><span class="kod-bword"></span></div>
    </div><button type="button" class="kod-go" data-go="${i}" hidden>AÇ ✓</button></div>`;
  }
  q('.kod-body').innerHTML = `<div class="kod-game">
    <aside class="kod-side kod-s0"></aside>
    <section class="kod-center">
      <div class="kod-cluebar"></div>
      <div class="kod-keybar" hidden></div>
      <div class="kod-boardwrap"><div class="kod-board noanim">${cards}</div><div class="kod-roundov" hidden></div></div>
      <div class="kod-ctrl"></div>
    </section>
    <aside class="kod-side kod-s1"></aside>
    <section class="kod-log g-panel"><h4>🗂️ İPUCU KAYDI</h4><ol class="kod-loglist"></ol></section>
  </div>`;
  prevRev = null; lastRound = -1;
}
function clueRes(res, n) {
  return res.map(k => `<i class="kod-rc k${k}" title="${KIND[k]}"></i>`).join('');
}
function teamPanel(v, t) {
  const active = (v.phase === 'clue' || v.phase === 'guess') && v.cur === t;
  const left = v.left[t], tot = v.total[t];
  const members = v.players.map((p, i) => [p, i]).filter(([, i]) => v.team[i] === t);
  const wins = v.rounds > 1 ? `<span class="kod-wins" aria-label="${v.wins[t]} tur">${[0, 1].map(k => `<i class="${k < v.wins[t] ? 'on' : ''}">★</i>`).join('')}</span>` : '';
  const hist = v.clues.filter(c => c.t === t).map(c => `<li><b>${esc(c.w)}</b><span class="kod-n">${c.n}</span><span class="kod-res">${clueRes(c.res)}</span></li>`).join('');
  return `<div class="kod-team t${t} ${active ? 'active' : ''}" style="--tc:${TEAMS[t].c}">
    <div class="kod-thead"><span class="kod-tname">${TEAMS[t].up}</span>${wins}<span class="kod-left" title="Kalan ajan"><b>${left}</b><small>/${tot}</small></span></div>
    <div class="kod-bar"><i style="width:${tot ? Math.round(100 * (tot - left) / tot) : 0}%"></i></div>
    <ul class="kod-mem">${members.map(([p, i]) => `<li class="${v.caps[t] === i ? 'cap' : ''} ${p.on === false ? 'off' : ''} ${ui.me === i ? 'me' : ''}">${avatar(p, i)}<span class="kod-mn">${esc(p.name)}</span>${v.caps[t] === i ? '<span class="kod-capb" title="Kaptan">🎖️</span>' : ''}</li>`).join('')}</ul>
    <ol class="kod-hist">${hist || '<li class="kod-empty">Henüz ipucu yok</li>'}</ol>
  </div>`;
}
function renderStatus(v) {
  const st = q('.kod-status'); if (!st) return;
  const local = isLocal(), me = ui.me;
  const cn = v.caps && v.caps[v.cur] != null ? v.players[v.caps[v.cur]].name : '';
  const T = TEAMS[v.cur] || TEAMS[0];
  const tag = `<b style="color:${T.c}">${T.n}</b>`;
  let h;
  if (v.phase === 'setup') h = '<span class="g-turn">📁 Takımlar kuruluyor…</span>';
  else if (v.phase === 'clue') {
    if (local) h = `<span class="g-turn mine">🎖️ ${esc(T.n)} kaptan ${esc(cn)} ipucu veriyor</span>`;
    else if (me === v.caps[v.cur]) h = '<span class="g-turn mine">🎖️ Sıra sende — ipucu ver!</span>';
    else h = `<span class="g-turn">Sıra: ${tag} · kaptan <b>${esc(cn)}</b> düşünüyor…</span>`;
  } else if (v.phase === 'guess') {
    if (local) h = `<span class="g-turn mine">🔎 ${esc(T.n)} takım tahmin ediyor</span>`;
    else if (canGuess(v)) h = '<span class="g-turn mine">🔎 Sıra sende — tahmin et!</span>';
    else if (me === v.caps[v.cur]) h = '<span class="g-turn">🤐 Takımın tahmin ediyor — ipucu dışında konuşma!</span>';
    else h = `<span class="g-turn">Sıra: ${tag} takım tahmin ediyor…</span>`;
  } else if (v.phase === 'roundEnd') h = `<span class="g-turn win">🏁 ${TEAMS[v.roundWinner].n} takım turu kazandı!</span>`;
  else h = `<span class="g-turn win">🏆 ${v.winner != null ? TEAMS[v.winner].n + ' takım kazandı!' : 'Oyun bitti'}</span>`;
  st.innerHTML = h;
}
function renderClueBar(v) {
  const el = q('.kod-cluebar'); if (!el) return;
  const T = TEAMS[v.cur];
  const timer = v.deadline ? '<span class="kod-timer" aria-live="off">--</span>' : '';
  el.style.setProperty('--tc', T.c);
  el.className = `kod-cluebar t${v.cur} ${v.clue ? 'has' : ''}`;
  if (v.phase === 'guess' && v.clue) {
    const max = v.clue.n + 1, used = v.guesses;
    el.innerHTML = `<span class="kod-cl">İPUCU</span><span class="kod-cw">${esc(v.clue.w)}</span><span class="kod-cn">${v.clue.n}</span>
      <span class="kod-dots" title="Tahmin hakkı">${Array.from({ length: max }, (_, k) => `<i class="${k < used ? 'used' : ''}"></i>`).join('')}</span>${timer}`;
  } else if (v.phase === 'clue') {
    el.innerHTML = `<span class="kod-cl">İPUCU</span><span class="kod-cwait">${esc(T.n)} kaptan kodluyor<span class="kod-ell">…</span></span>${timer}`;
  } else if (v.phase === 'roundEnd' || v.phase === 'over') {
    el.className = 'kod-cluebar end';
    el.innerHTML = `<span class="kod-cl">TUR ${v.round}</span><span class="kod-cwait">${v.roundWinner != null ? esc(TEAMS[v.roundWinner].n) + ' takım kazandı' : ''}</span>`;
  }
  tickTimer();
}
function renderBoard(v) {
  const board = q('.kod-board'); if (!board) return;
  if (lastRound !== v.round) { board.classList.add('noanim'); prevRev = null; lastRound = v.round; }
  const open = keyOpen(v), guess = canGuess(v), me = ui.me;
  board.classList.toggle('keyon', open && v.phase !== 'roundEnd' && v.phase !== 'over');
  board.classList.toggle('can', guess);
  board.querySelectorAll('.kod-card').forEach(card => {
    const i = +card.dataset.i, w = v.words[i], rev = v.rev[i], k = v.key ? v.key[i] : null;
    const props = (v.props && v.props[i]) || [];
    let c = 'kod-card';
    if (w.length >= 8) c += ' xl'; else if (w.length >= 7) c += ' l';
    if (rev) c += ` rev k${k}`;
    else if (open && k != null) c += ` kc${k}`;
    if (!rev && guess) c += ' pick';
    if (props.length) c += ' prop';
    if (typeof me === 'number' && props.includes(me)) c += ' mine';
    if (v.last && v.last.i === i && v.phase !== 'setup') c += ' last';
    if (card.className !== c) card.className = c;
    const word = card.querySelector('.kod-word'); if (word.textContent !== w) { word.textContent = w; card.querySelector('.kod-bword').textContent = w; }
    card.querySelector('.kod-keylab').textContent = !rev && open && k != null ? LABEL[k] : '';
    const bst = card.querySelector('.kod-bst'), sk = rev ? String(k) : '';
    if (bst.dataset.k !== sk) { bst.dataset.k = sk; bst.innerHTML = rev ? stampFor(k) + `<b class="kod-blab">${LABEL[k]}</b>` : ''; }
    card.querySelector('.kod-props').innerHTML = props.map(pi => avatar(v.players[pi], pi, 'kod-pav')).join('');
    const go = card.querySelector('.kod-go');
    go.hidden = !(guess && !rev && props.length);
    card.setAttribute('aria-label', `${w}${rev ? ' — ' + KIND[k] : (open && k != null ? ' (' + KIND[k] + ')' : '')}${props.length ? ', ' + props.length + ' öneri' : ''}`);
  });
  if (board.classList.contains('noanim')) requestAnimationFrame(() => requestAnimationFrame(() => board.classList.remove('noanim')));
  prevRev = v.rev.slice();
}
function renderKeyBar(v) {
  const kb = q('.kod-keybar'); if (!kb) return;
  const show = isLocal() && peek && (v.phase === 'clue' || v.phase === 'guess');
  kb.hidden = !show;
  if (show) kb.innerHTML = '<span>🔑 <b>Kaptan bakıyor</b>, diğerleri baksın mı?</span><button type="button" class="btn btn-solve kod-hide" data-peek="0">🙈 Gizle</button>';
}
function renderCtrl(v) {
  const el = q('.kod-ctrl'); if (!el) return;
  const local = isLocal(), T = TEAMS[v.cur];
  const capName = v.caps && v.caps[v.cur] != null ? v.players[v.caps[v.cur]].name : '';
  let kind = '', h = '';
  if (v.phase === 'clue' && canClue(v)) {
    kind = 'clueform:' + v.round + ':' + v.cur + ':' + v.clues.length;
    if (el.dataset.kind === kind) { const er = el.querySelector('.kod-err'); if (er) er.textContent = clueErr; el.querySelector('.kod-nval').textContent = clueN; return; }
    h = `<form class="kod-form g-panel" style="--tc:${T.c}" autocomplete="off">
      <label class="kod-flab" for="kodClue">🎖️ ${local ? esc(capName) + ', ' : ''}tek kelimelik ipucun ve kaç kart?</label>
      <div class="kod-frow">
        <input id="kodClue" class="kod-input" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="İPUCU" enterkeyhint="send" aria-label="İpucu kelimesi">
        <div class="kod-step" role="group" aria-label="Kart sayısı"><button type="button" data-n="-1" aria-label="Azalt">−</button><b class="kod-nval">${clueN}</b><button type="button" data-n="1" aria-label="Arttır">+</button></div>
        <button type="submit" class="btn btn-spin kod-send" data-clue="1">GÖNDER</button>
      </div>
      <p class="kod-err" aria-live="polite">${esc(clueErr)}</p>
    </form>`;
  } else if (v.phase === 'clue' && local) {
    kind = 'curtain:' + v.round + ':' + v.cur + ':' + (peekAsk ? 1 : 0);
    if (el.dataset.kind === kind) return;
    h = peekAsk
      ? `<div class="kod-curtain g-panel ask" style="--tc:${T.c}"><p class="kod-cbig">🔑 Kaptan bakıyor, diğerleri baksın mı?</p><p>Anahtar yalnızca <b>${esc(capName)}</b> için. Diğer ${esc(T.n)} oyuncuları ekrandan uzaklaşsın!</p><div class="kod-cbtns"><button type="button" class="btn btn-ghost" data-peek="0">🙈 Gizle</button><button type="button" class="btn btn-solve" data-peek="1">👁 Ben kaptanım, göster</button></div></div>`
      : `<div class="kod-curtain g-panel" style="--tc:${T.c}"><p class="kod-cbig">🔐 Cihazı ${esc(T.n)} kaptana ver: <b>${esc(capName)}</b></p><p>Gizli anahtar kartların renklerini gösterir. Takım arkadaşları bakmamalı.</p><div class="kod-cbtns"><button type="button" class="btn btn-solve" data-peek="ask">🔑 Gizli anahtarı aç</button></div></div>`;
  } else if (v.phase === 'clue') {
    kind = 'wait:clue:' + v.cur + ':' + (ui.me === v.caps[1 - v.cur] ? 1 : 0);
    if (el.dataset.kind === kind) return;
    const oppCap = typeof ui.me === 'number' && v.caps[1 - v.cur] === ui.me;
    h = `<p class="kod-wait">${oppCap ? '🎖️ Rakip kaptan düşünüyor. Sen de bir sonraki ipucunu planla.' : `⏳ ${esc(T.n)} kaptan <b>${esc(capName)}</b> ipucunu hazırlıyor…`}</p>`;
  } else if (v.phase === 'guess' && canGuess(v)) {
    const left = v.clue.n + 1 - v.guesses;
    const pr = v.props.map((l, i) => [i, l.length]).filter(([i, n]) => n && !v.rev[i]).sort((x, y) => y[1] - x[1]);
    kind = 'guess:' + v.round + ':' + v.cur + ':' + left + ':' + (local ? 1 : 0) + ':' + pr.map(x => x.join('.')).join(',');
    if (el.dataset.kind === kind) return;
    h = `<div class="kod-gctl g-panel" style="--tc:${T.c}"><p>👆 Karta dokun → öner · önerilen kartta <b>AÇ ✓</b> ile onayla. <span class="kod-gl2">Kalan hak: <b>${left}</b></span></p>
      ${pr.length ? `<div class="kod-confirms">${pr.map(([i, n]) => `<button type="button" class="btn" data-go="${i}">AÇ: <b>${esc(v.words[i])}</b> ✓${n > 1 ? ` <small>${n} öneri</small>` : ''}</button>`).join('')}</div>` : ''}
      <div class="kod-gbtns">${local ? '<button type="button" class="btn btn-ghost kod-peekbtn" data-peek="ask">🔑 Anahtar</button>' : ''}<button type="button" class="btn btn-vowel kod-pass" data-pass="1">✋ PAS</button></div></div>`;
  } else if (v.phase === 'guess') {
    kind = 'wait:guess:' + v.cur + ':' + (ui.me === v.caps[v.cur] ? 1 : 0);
    if (el.dataset.kind === kind) return;
    h = `<p class="kod-wait">${ui.me === v.caps[v.cur] ? '🤐 Takımın senin ipucunla tahmin ediyor. Yüz ifadene dikkat!' : `🔎 ${esc(T.n)} takım ipucunu çözmeye çalışıyor…`}</p>`;
  } else {
    kind = 'none'; if (el.dataset.kind === kind) return;
  }
  el.dataset.kind = kind; el.innerHTML = h;
  // tek cihazda tahmin aşamasında anahtar sorusu
  if (v.phase === 'guess' && local && peekAsk) {
    el.dataset.kind = 'gask';
    el.innerHTML = `<div class="kod-curtain g-panel ask" style="--tc:${T.c}"><p class="kod-cbig">🔑 Kaptan bakıyor, diğerleri baksın mı?</p><div class="kod-cbtns"><button type="button" class="btn btn-ghost" data-peek="0">🙈 Gizle</button><button type="button" class="btn btn-solve" data-peek="1">👁 Ben kaptanım, göster</button></div></div>`;
  }
  const inp = el.querySelector('#kodClue');
  if (inp && !matchMedia('(pointer: coarse)').matches) setTimeout(() => { try { inp.focus(); } catch { /* */ } }, 30);
}
function renderRoundOv(v) {
  const ov = q('.kod-roundov'); if (!ov) return;
  const show = v.phase === 'roundEnd';
  ov.hidden = !show;
  if (!show) return;
  const w = v.roundWinner, T = TEAMS[w];
  const why = v.why === 'bomb' ? `💣 ${TEAMS[1 - w].n} takım bombaya bastı!` : 'Tüm ajanlar bulundu!';
  const runner = ui.isHost && !v.final;
  ov.style.setProperty('--tc', T.c);
  ov.innerHTML = `<div class="kod-ribbon"><span class="kod-rt">${T.up} TAKIM</span><span class="kod-rs">TURU KAZANDI</span><span class="kod-rw">${why}</span>
    ${v.rounds > 1 ? `<span class="kod-rscore"><b style="color:${TEAMS[0].c}">${v.wins[0]}</b> – <b style="color:${TEAMS[1].c}">${v.wins[1]}</b></span>` : ''}
    <span class="kod-rnext">${v.final ? 'Sonuçlar geliyor…' : 'Sonraki tur <b class="kod-cd">…</b>'}</span>
    ${runner ? '<button type="button" class="btn btn-spin" data-next="1">▶ Sonraki tur</button>' : ''}</div>`;
  tickTimer();
}
function renderLog(v) {
  const ol = q('.kod-loglist'); if (!ol) return;
  ol.innerHTML = v.clues.length ? v.clues.slice().reverse().map(c => `<li class="t${c.t}" style="--tc:${TEAMS[c.t].c}"><span class="kod-lt">${TEAMS[c.t].up}</span><b>${esc(c.w)}</b><span class="kod-n">${c.n}</span><span class="kod-res">${clueRes(c.res)}</span></li>`).join('') : '<li class="kod-empty">Bu turda henüz ipucu verilmedi.</li>';
}
function render(v) {
  V = v;
  const kind = v.phase === 'setup' ? 'setup' : 'game';
  const pk = `${v.round}:${v.cur}:${v.phase}`;
  if (pk !== phaseKey) { peek = false; peekAsk = false; phaseKey = pk; clueErr = ''; sending = false; if (v.phase === 'clue') clueN = 1; }
  if (built !== kind) { built = kind; if (kind === 'game') buildGame(); }
  renderStatus(v);
  if (kind === 'setup') { renderSetup(v); return; }
  q('.kod-s0').innerHTML = teamPanel(v, 0);
  q('.kod-s1').innerHTML = teamPanel(v, 1);
  renderClueBar(v); renderKeyBar(v); renderBoard(v); renderCtrl(v); renderRoundOv(v); renderLog(v);
}
function tickTimer() {
  if (!V || !ui) return;
  const now = ui.hostNow();
  const t = q('.kod-timer');
  if (t && V.deadline) {
    const s = Math.max(0, Math.ceil((V.deadline - now) / 1000));
    const txt = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    if (t.textContent !== txt) t.textContent = txt;
    t.classList.toggle('low', s <= 10);
    if (s <= 5 && s > 0 && s !== lastSec) { lastSec = s; Sound.tick(.8); }
  }
  const cd = q('.kod-cd');
  if (cd && V.nextAt) { const s = Math.max(0, Math.ceil((V.nextAt - now) / 1000)); cd.textContent = s + ' sn'; }
}

/* ---- girdi ---- */
function submitClue() {
  if (!V || !canClue(V) || sending) return;
  const inp = q('#kodClue'); if (!inp) return;
  const r = validateClue(V.words, inp.value);
  if (!r.ok) { clueErr = r.err; const er = q('.kod-err'); if (er) er.textContent = r.err; Sound.bad(); const f = q('.kod-form'); if (f) { f.classList.remove('nope'); void f.offsetWidth; f.classList.add('nope'); } return; }
  clueErr = ''; sending = true; Sound.init();
  send({ t: 'clue', w: r.w, n: clueN }, V.caps[V.cur]);
  if (isLocal()) peek = false;
}
function onClick(e) {
  if (!V) return;
  const b = e.target.closest('button, .kod-card');
  if (!b || b.disabled) return;
  Sound.init();
  const d = b.dataset;
  if (V.phase === 'setup') {
    setupErr = '';
    if (d.join != null) send({ t: 'team', side: +d.join });
    else if (d.cap) send({ t: 'cap' });
    else if (d.move != null) { const who = +d.move; send({ t: 'team', side: 1 - V.team[who], who }, who); }
    else if (d.capfor != null) { const who = +d.capfor; send({ t: 'cap', who }, who); }
    else if (d.shuffle) { send({ t: 'shuffle' }); Sound.whoosh(); }
    else if (d.start) send({ t: 'start' });
    return;
  }
  if (d.go != null) { e.stopPropagation(); if (canGuess(V)) { b.hidden = true; send({ t: 'guess', i: +d.go }, asGuesser(V)); } return; }
  if (b.classList.contains('kod-card')) {
    const i = +d.i;
    if (!canGuess(V) || V.rev[i]) return;
    Sound.tick(.4);
    send({ t: 'prop', i }, asGuesser(V));
    return;
  }
  if (d.n) { clueN = Math.max(1, Math.min(9, clueN + +d.n)); const nv = q('.kod-nval'); if (nv) nv.textContent = clueN; Sound.tick(.5); return; }
  if (d.clue) { submitClue(); return; }
  if (d.pass) { if (canGuess(V)) send({ t: 'pass' }, asGuesser(V)); return; }
  if (d.next) { send({ t: 'next' }); return; }
  if (d.peek != null) {
    if (d.peek === 'ask') { peekAsk = true; Sound.tick(.6); }
    else if (d.peek === '1') { peek = true; peekAsk = false; Sound.special(); }
    else { peek = false; peekAsk = false; Sound.whoosh(); }
    const c = q('.kod-ctrl'); if (c) c.dataset.kind = '';
    render(V);
  }
}
function onSubmit(e) { e.preventDefault(); }
function onKey(e) {
  if (!V || !root) return;
  if (e.target && e.target.id === 'kodClue') {
    if (e.key === 'Enter') { e.preventDefault(); submitClue(); }
    else if (clueErr) { clueErr = ''; const er = q('.kod-err'); if (er) er.textContent = ''; }
    return;
  }
  const card = e.target.closest && e.target.closest('.kod-card');
  if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); card.click(); }
}
function onEvent(e) {
  const me = ui ? ui.me : -1, local = isLocal();
  const mine = t => local || (V && typeof me === 'number' && V.team && V.team[me] === t);
  if (e.t === 'round') { Sound.whoosh(); banner(`${e.round}. TUR`, 'pink'); peek = false; peekAsk = false; }
  else if (e.t === 'clue') { Sound.stop(); banner(`${e.w} · ${e.n}`, 'pink'); }
  else if (e.t === 'reveal') {
    const card = q(`.kod-card[data-i="${e.i}"]`);
    if (e.k === BOMB) { Sound.bankrupt(); flash('bad'); banner('💣 BOMBA!', 'bad'); if (card) { card.classList.remove('boom'); void card.offsetWidth; card.classList.add('boom'); } }
    else if (e.k === e.t2) { Sound.good(); if (card) { const [x, y] = centerOf(card); FX.burst(x, y, 26, true); } }
    else if (e.k === NEU) { Sound.bad(); banner('SİVİL', 'pink'); }
    else { Sound.bad(); if (mine(e.t2) && !local) flash('bad'); banner(`${TEAMS[e.k].up} AJAN!`, 'bad'); }
  } else if (e.t === 'turn') { Sound.special(); if (!local && V && typeof me === 'number' && V.caps && V.caps[e.t2] === me) banner('SIRA SENDE!', 'good'); }
  else if (e.t === 'timeup') { Sound.bad(); banner('SÜRE DOLDU', 'bad'); }
  else if (e.t === 'roundEnd') {
    const good = local || mine(e.winner) || typeof me !== 'number' || me < 0;
    if (good) { Sound.solve(); FX.confetti(e.final ? 40 : 90); } else Sound.bankrupt();
    banner(`${TEAMS[e.winner].up} TURU ALDI`, good ? 'good' : 'bad');
  } else if (e.t === 'clueBad') { if (local || e.pi === me) { clueErr = e.msg || 'Geçersiz ipucu.'; sending = false; const er = q('.kod-err'); if (er) er.textContent = clueErr; Sound.bad(); } }
  else if (e.t === 'setupErr') { setupErr = e.msg || ''; if (V) render(V); Sound.bad(); }
}

function mount(r, api) {
  root = r; ui = api; V = null; built = ''; peek = false; peekAsk = false; phaseKey = ''; lastRound = -1; prevRev = null; clueN = 1; clueErr = ''; setupErr = ''; sending = false;
  root.innerHTML = `<div class="g-wrap kod"><div class="g-status kod-status"></div><div class="kod-body"></div></div>`;
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKey);
  root.addEventListener('submit', onSubmit);
  timerT = setInterval(tickTimer, 250);
}

CFX.registerGame({
  id: 'kelimekodu', name: 'Kelime Kodu', icon: '🗝️', color: '#3d8bff', min: 4, max: 8, hotseat: true, bot: false, localMin: 4,
  tagline: 'Kaptanın ipucuyla ajanlarını bul, bombadan kaç',
  rules: 'İki takım, her takımda bir Kaptan. Kaptan tek kelimelik ipucu ve bir sayı verir; takımı kartlara dokunarak önerir ve onaylar. Kendi ajanlarını ilk bulan takım kazanır, Bomba kartını açan anında kaybeder.',
  options: [
    { key: 'rounds', label: 'Tur sayısı', def: '1', choices: [{ v: '1', label: '1 tur' }, { v: '3', label: '3 tur' }] },
    { key: 'timer', label: 'Süre (her aşama)', def: '0', choices: [{ v: '0', label: 'Yok' }, { v: '90', label: '90 sn' }, { v: '120', label: '120 sn' }] }
  ],
  setup(players, opts, ctx) {
    const o = opts || {};
    const st = {
      players: players.map(p => ({ name: p.name, color: p.color })),
      on: players.map(() => true), local: !!ctx && ctx.mode === 'local',
      rounds: String(o.rounds) === '3' ? 3 : 1,
      timer: [90, 120].includes(+o.timer) ? +o.timer : 0,
      phase: 'setup', team: players.map(() => 0), capPick: [null, null],
      round: 0, caps: [null, null], start: 0, cur: 0, words: null, key: null, rev: null, revBy: null,
      clue: null, guesses: 0, props: emptyProps(), clues: [], last: null,
      wins: [0, 0], pts: [0, 0], capBonus: players.map(() => 0), hist: [],
      roundWinner: null, why: '', final: false, winner: null, deadline: 0, nextAt: 0, tk: 0
    };
    autoTeams(st, players.map((_, i) => i));
    return st;
  },
  action(st, pi, a, ctx) {
    const host = ctx.mode === 'local' || pi === ctx.hostPi;
    switch (a.t) {
      case 'team': {
        if (st.phase !== 'setup' || (a.side !== 0 && a.side !== 1)) return;
        const who = a.who == null ? pi : a.who;
        if (!Number.isInteger(who) || (who !== pi && !host)) return;
        if (!st.players[who] || st.team[who] === a.side) return;
        st.team[who] = a.side; fixCaps(st);
        ctx.emit({ t: 'team' }, `${pname(st, who)} ${TEAMS[a.side].n} takıma geçti.`);
        ctx.sync(); return;
      }
      case 'cap': {
        if (st.phase !== 'setup') return;
        const who = a.who == null ? pi : a.who;
        if (!Number.isInteger(who) || (who !== pi && !host)) return;
        if (!st.players[who]) return;
        const t = st.team[who]; if (st.capPick[t] === who) return;
        st.capPick[t] = who;
        ctx.emit({ t: 'cap' }, `${pname(st, who)} ${TEAMS[t].n} takımın kaptanı oldu.`);
        ctx.sync(); return;
      }
      case 'shuffle': {
        if (st.phase !== 'setup' || !host) return;
        autoTeams(st, shuffle(st.players.map((_, i) => i)));
        st.capPick = [0, 1].map(t => { const m = membersOf(st, t); return m[Math.floor(Math.random() * m.length)]; });
        ctx.emit({ t: 'shuffle' }, 'Takımlar karıştırıldı.');
        ctx.sync(); return;
      }
      case 'start': {
        if (st.phase !== 'setup' || !host) return;
        fixCaps(st);
        const prob = setupProblem(st);
        if (prob) { ctx.emit({ t: 'setupErr', msg: prob }); ctx.sync(); return; }
        startRound(st, ctx); return;
      }
      case 'clue': {
        if (st.phase !== 'clue' || pi !== st.caps[st.cur]) return;
        const n = Number(a.n);
        const r = validateClue(st.words, a.w);
        if (!r.ok || !Number.isInteger(n) || n < 1 || n > 9) { ctx.emit({ t: 'clueBad', pi, msg: r.ok ? 'Sayı 1 ile 9 arasında olmalı.' : r.err }); return; }
        st.clue = { w: r.w, n, t: st.cur, by: pi }; st.guesses = 0; st.phase = 'guess'; st.props = emptyProps();
        st.clues.push({ t: st.cur, w: r.w, n, by: pi, res: [] });
        phaseTimer(st, ctx);
        ctx.emit({ t: 'clue', w: r.w, n, t2: st.cur }, `🎖️ ${TEAMS[st.cur].n} kaptan ${pname(st, pi)}: “${r.w}” · ${n}`, 'gold');
        ctx.sync(); return;
      }
      case 'prop': {
        const i = a.i;
        if (!isGuesser(st, pi) || !Number.isInteger(i) || i < 0 || i >= SIZE || st.rev[i]) return;
        const had = st.props[i].includes(pi);
        st.props.forEach(l => { const k = l.indexOf(pi); if (k >= 0) l.splice(k, 1); });
        if (!had) st.props[i].push(pi);
        ctx.sync(); return;
      }
      case 'guess': {
        const i = a.i;
        if (!isGuesser(st, pi) || !Number.isInteger(i) || i < 0 || i >= SIZE || st.rev[i] || !st.props[i].length) return;
        reveal(st, ctx, i, pi); return;
      }
      case 'pass': {
        if (!isGuesser(st, pi)) return;
        endTurn(st, ctx, 'pass'); return;
      }
      case 'next': {
        if (st.phase !== 'roundEnd' || st.final || !host) return;
        advance(st, ctx); return;
      }
      default:
    }
  },
  view(st, viewer) {
    const all = viewer === 'all';
    const cap = all || (typeof viewer === 'number' && viewer >= 0 && st.phase !== 'setup' && st.caps.includes(viewer));
    const open = st.phase === 'roundEnd' || st.phase === 'over';
    return {
      phase: st.phase, round: st.round, rounds: st.rounds, timer: st.timer, deadline: st.deadline, nextAt: st.nextAt,
      cur: st.cur, start: st.start, caps: st.caps.slice(), capPick: st.capPick.slice(), team: st.team.slice(),
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, on: st.on[i] })),
      words: st.words ? st.words.slice() : null, rev: st.rev ? st.rev.slice() : null,
      // Gizli anahtar: açılmamış kartların rengi yalnızca kaptanlara
      key: st.key ? st.key.map((k, i) => (st.rev[i] || cap || open ? k : null)) : null,
      clue: st.clue ? { w: st.clue.w, n: st.clue.n, t: st.clue.t } : null, guesses: st.guesses,
      props: st.props.map(l => l.slice()),
      left: [leftOf(st, 0), leftOf(st, 1)], total: [totalOf(st, 0), totalOf(st, 1)],
      clues: st.clues.map(c => ({ t: c.t, w: c.w, n: c.n, res: c.res.slice() })),
      last: st.last, wins: st.wins.slice(), pts: st.pts.slice(), roundWinner: st.roundWinner, why: st.why, final: st.final, winner: st.winner
    };
  },
  turnOf(st) { return st.phase === 'clue' ? st.caps[st.cur] : null; },
  skipTurn(st, pi, ctx) {
    if (st.phase !== 'clue' || st.caps[st.cur] !== pi) return;
    ctx.emit({ t: 'skip' }, `${pname(st, pi)} bağlı değil; ${TEAMS[st.cur].n} takım pas geçti.`, 'bad');
    endTurn(st, ctx, 'skip');
  },
  onPresence(st, pi, online, ctx) {
    st.on[pi] = online;
    if (online || st.phase !== 'guess') return;
    const any = membersOf(st, st.cur).some(i => i !== st.caps[st.cur] && st.on[i]);
    if (!any) { ctx.emit({ t: 'skip' }, `${TEAMS[st.cur].n} takımda tahmin edecek bağlı oyuncu kalmadı; sıra geçti.`, 'bad'); endTurn(st, ctx, 'skip'); }
  },
  resume(st, ctx) { arm(st, ctx); },
  mount, render, onEvent,
  unmount() {
    if (root) { root.removeEventListener('click', onClick); root.removeEventListener('keydown', onKey); root.removeEventListener('submit', onSubmit); }
    clearInterval(timerT); timerT = null;
    root = null; ui = null; V = null; built = '';
  },
  _test: { WORDS, pickWords, makeKey, validateClue, fold }
});
})();
