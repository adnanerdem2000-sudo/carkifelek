/* =========================================================================
   OYUN SALONU — CASUS KİM?
   Kelime modu (varsayılan): herkes aynı gizli kelimeyi görür, sahtekâr
   yalnızca bir ipucu alır. Söz turu → tartışma → oylama → son şans.
   Mekân modu (klasik): gizli konum + roller, casus konumu tahmin eder.
   3–8 kişi: online, tek telefonda "elden ele" ya da bilgisayara karşı.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial, shuffle, clamp, centerOf } = CFX;

/* =========================================================================
   MEKÂN (klasik) modu — konum tabanlı casus oyunu (önceki sürüm, aynen korunur)
   ========================================================================= */
const MEK = (() => {
/* ---------- konumlar (n: ad, i: simge, r: roller) ---------- */
const LOCS = [
  { n: 'Hastane', i: '🏥', r: ['Doktor', 'Hemşire', 'Hasta', 'Ziyaretçi', 'Güvenlik Görevlisi', 'Kantinci', 'Cerrah', 'Temizlik Görevlisi'] },
  { n: 'Uzay İstasyonu', i: '🛰️', r: ['Komutan', 'Mühendis', 'Bilim İnsanı', 'Uzay Turisti', 'Pilot', 'Uzay Doktoru', 'Robot Teknisyeni'] },
  { n: 'Düğün Salonu', i: '💒', r: ['Gelin', 'Damat', 'Nikâh Memuru', 'Kayınvalide', 'Garson', 'Orkestra Şefi', 'Fotoğrafçı', 'Davetli'] },
  { n: 'Kapalıçarşı', i: '🏺', r: ['Kuyumcu', 'Halıcı', 'Turist', 'Hamal', 'Çaycı', 'Antikacı', 'Rehber'] },
  { n: 'Vapur', i: '🚢', r: ['Kaptan', 'Simitçi', 'Yolcu', 'Çaycı', 'Tayfa', 'Turist', 'Gazete Okuyan Emekli'] },
  { n: 'Futbol Stadı', i: '🏟️', r: ['Futbolcu', 'Hakem', 'Teknik Direktör', 'Taraftar', 'Spiker', 'Çekirdekçi', 'Kaleci', 'Güvenlik Görevlisi'] },
  { n: 'Okul', i: '🏫', r: ['Öğretmen', 'Öğrenci', 'Müdür', 'Hademe', 'Kantinci', 'Veli', 'Rehber Öğretmen'] },
  { n: 'Kuaför', i: '💇', r: ['Kuaför', 'Çırak', 'Müşteri', 'Manikürcü', 'Gelin Adayı', 'Çaycı', 'Renk Uzmanı'] },
  { n: 'Film Seti', i: '🎬', r: ['Yönetmen', 'Başrol Oyuncusu', 'Dublör', 'Kameraman', 'Makyöz', 'Figüran', 'Senarist'] },
  { n: 'Çay Bahçesi', i: '🫖', r: ['Çaycı', 'Garson', 'Emekli', 'Tavla Oyuncusu', 'Gezgin', 'Simitçi', 'Sevgili'] },
  { n: 'Havalimanı', i: '✈️', r: ['Pilot', 'Kabin Memuru', 'Yolcu', 'Gümrük Memuru', 'Bagaj Görevlisi', 'Güvenlik Görevlisi', 'Mağaza Satıcısı'] },
  { n: 'Restoran', i: '🍽️', r: ['Şef', 'Garson', 'Müşteri', 'Bulaşıkçı', 'Yemek Eleştirmeni', 'Kasiyer', 'Komi'] },
  { n: 'Hamam', i: '🧖', r: ['Tellak', 'Natır', 'Müşteri', 'Turist', 'Kasiyer', 'Çaycı', 'Masör'] },
  { n: 'Sirk', i: '🎪', r: ['Palyaço', 'Akrobat', 'Sihirbaz', 'Hayvan Terbiyecisi', 'Seyirci', 'Jonglör', 'Sirk Müdürü'] },
  { n: 'Kütüphane', i: '📚', r: ['Kütüphaneci', 'Öğrenci', 'Yazar', 'Araştırmacı', 'Güvenlik Görevlisi', 'Emekli Okur', 'Stajyer'] },
  { n: 'Polis Karakolu', i: '🚓', r: ['Komiser', 'Polis Memuru', 'Şüpheli', 'Avukat', 'Muhabir', 'Tanık', 'Dedektif'] },
  { n: 'Banka', i: '🏦', r: ['Veznedar', 'Şube Müdürü', 'Müşteri', 'Güvenlik Görevlisi', 'Soyguncu', 'Kredi Uzmanı', 'Temizlikçi'] },
  { n: 'Sinema', i: '🍿', r: ['Seyirci', 'Gişe Görevlisi', 'Mısırcı', 'Makinist', 'Sevgili', 'Film Eleştirmeni', 'Yer Gösterici'] },
  { n: 'Plaj', i: '🏖️', r: ['Cankurtaran', 'Turist', 'Dondurmacı', 'Sörfçü', 'Fotoğrafçı', 'Çocuk', 'Şezlongcu'] },
  { n: 'Tren', i: '🚆', r: ['Makinist', 'Kondüktör', 'Yolcu', 'Vagon Garsonu', 'Turist', 'Öğrenci', 'Kaçak Yolcu'] },
  { n: 'Korsan Gemisi', i: '🏴‍☠️', r: ['Kaptan', 'Tayfa', 'Esir', 'Topçu', 'Gözcü', 'Aşçı', 'Papağanlı Korsan'] },
  { n: 'Denizaltı', i: '⚓', r: ['Kaptan', 'Sonar Uzmanı', 'Torpidocu', 'Aşçı', 'Mühendis', 'Telsizci', 'Er'] },
  { n: 'Askeri Üs', i: '🪖', r: ['Komutan', 'Er', 'Çavuş', 'Pilot', 'Doktor', 'Aşçı', 'Nöbetçi'] },
  { n: 'Otel', i: '🏨', r: ['Resepsiyonist', 'Kat Görevlisi', 'Müşteri', 'Komi', 'Otel Müdürü', 'Barmen', 'Güvenlik Görevlisi'] },
  { n: 'Süpermarket', i: '🛒', r: ['Kasiyer', 'Reyon Görevlisi', 'Müşteri', 'Kasap', 'Güvenlik Görevlisi', 'Mağaza Müdürü', 'Şarküteri Görevlisi'] },
  { n: 'Lunapark', i: '🎡', r: ['Bilet Satıcısı', 'Çocuk', 'Ebeveyn', 'Pamuk Şekerci', 'Operatör', 'Sevgili', 'Palyaço'] },
  { n: 'Hayvanat Bahçesi', i: '🦁', r: ['Bakıcı', 'Veteriner', 'Ziyaretçi', 'Rehber', 'Fotoğrafçı', 'Çocuk', 'Dondurmacı'] },
  { n: 'Müze', i: '🏛️', r: ['Rehber', 'Turist', 'Güvenlik Görevlisi', 'Küratör', 'Restoratör', 'Öğrenci', 'Sanat Eleştirmeni'] },
  { n: 'Pazar Yeri', i: '🥬', r: ['Manav', 'Balıkçı', 'Müşteri', 'Zabıta', 'Hamal', 'Peynirci', 'Pazarcı Teyze'] },
  { n: 'İtfaiye', i: '🚒', r: ['İtfaiyeci', 'Ekip Şefi', 'Telsizci', 'Şoför', 'Stajyer', 'Muhabir', 'Kurtarılan Vatandaş'] },
  { n: 'Kayak Merkezi', i: '⛷️', r: ['Kayakçı', 'Eğitmen', 'Teleferik Görevlisi', 'Turist', 'Snowboardcu', 'Ekipman Kiralayan', 'Doktor'] },
  { n: 'Kamp Alanı', i: '🏕️', r: ['İzci', 'İzci Lideri', 'Kampçı', 'Orman Bekçisi', 'Gitarist', 'Aşçı', 'Fotoğrafçı'] },
  { n: 'Spor Salonu', i: '🏋️', r: ['Antrenör', 'Vücut Geliştirici', 'Yeni Üye', 'Resepsiyonist', 'Diyetisyen', 'Yoga Eğitmeni', 'Temizlikçi'] },
  { n: 'Plaza Ofisi', i: '🏢', r: ['Patron', 'Sekreter', 'Stajyer', 'Muhasebeci', 'Bilgi İşlemci', 'Çaycı', 'Satış Müdürü'] },
  { n: 'Televizyon Stüdyosu', i: '📺', r: ['Sunucu', 'Yönetmen', 'Kameraman', 'Konuk', 'Seyirci', 'Makyöz', 'Yapımcı'] },
  { n: 'Konser', i: '🎸', r: ['Şarkıcı', 'Davulcu', 'Hayran', 'Ses Teknisyeni', 'Güvenlik Görevlisi', 'Menajer', 'Fotoğrafçı'] },
  { n: 'Kafe', i: '☕', r: ['Barista', 'Garson', 'Müşteri', 'Yazar', 'Öğrenci', 'Kafe Sahibi', 'Pastacı'] },
  { n: 'Fırın', i: '🥖', r: ['Fırıncı', 'Çırak', 'Müşteri', 'Kasiyer', 'Pastacı', 'Dağıtımcı', 'Simitçi'] },
  { n: 'Çiftlik', i: '🐄', r: ['Çiftçi', 'Çoban', 'Veteriner', 'Traktör Sürücüsü', 'Sütçü', 'Torun', 'Muhtar'] },
  { n: 'Hapishane', i: '⛓️', r: ['Gardiyan', 'Mahkûm', 'Cezaevi Müdürü', 'Avukat', 'Ziyaretçi', 'Aşçı', 'Revir Doktoru'] },
  { n: 'Gece Kulübü', i: '🪩', r: ['DJ', 'Barmen', 'Güvenlik Görevlisi', 'Dansçı', 'Garson', 'Ünlü', 'Müşteri'] },
  { n: 'Kutup Üssü', i: '🐧', r: ['Bilim İnsanı', 'Buzul Uzmanı', 'Doktor', 'Aşçı', 'Telsizci', 'Pilot', 'Belgeselci'] },
  { n: 'Üniversite', i: '🎓', r: ['Profesör', 'Öğrenci', 'Asistan', 'Dekan', 'Kantinci', 'Kulüp Başkanı', 'Güvenlik Görevlisi'] },
  { n: 'Benzin İstasyonu', i: '⛽', r: ['Pompacı', 'Kasiyer', 'Şoför', 'Tamirci', 'Kamyoncu', 'Motorcu', 'Market Görevlisi'] },
  { n: 'Otobüs Terminali', i: '🚌', r: ['Muavin', 'Şoför', 'Yolcu', 'Bilet Satıcısı', 'Simitçi', 'Hamal', 'Kaybolan Turist'] },
  { n: 'Diş Kliniği', i: '🦷', r: ['Diş Hekimi', 'Asistan', 'Hasta', 'Sekreter', 'Ortodontist', 'Çocuk Hasta', 'Teknisyen'] },
  { n: 'Balıkçı Teknesi', i: '🎣', r: ['Reis', 'Tayfa', 'Aşçı', 'Turist', 'Ağ Ören', 'Makinist', 'Çaycı'] },
  { n: 'Bowling Salonu', i: '🎳', r: ['Oyuncu', 'Takım Kaptanı', 'Ayakkabı Görevlisi', 'Barmen', 'Doğum Günü Çocuğu', 'Tamirci', 'Seyirci'] }
];

const VOTE_MS = 45000, REVEAL_MS = 16000, LAST_REVEAL_MS = 12000, CHAT_GAP = 400, MAX_TX = 120;
const MARKS = ['', '🤔', '🚨', '✅'];
const MARK_LABEL = ['İşaretsiz', 'Şüpheli', 'Çok şüpheli', 'Temiz'];

/* ---------- Türkçe ek yardımcıları ---------- */
const VOW = 'aeıioöuü';
const DIGIT = { 0: ['ı', 0], 1: ['i', 0], 2: ['i', 1], 3: ['ü', 0], 4: ['ö', 0], 5: ['e', 0], 6: ['ı', 1], 7: ['i', 1], 8: ['i', 0], 9: ['u', 0] };
function sound(name) {               // [son ünlü, ünlüyle mi bitiyor]
  const l = String(name || '').trim().toLocaleLowerCase('tr-TR');
  const last = l[l.length - 1];
  if (last != null && DIGIT[last]) return DIGIT[last];
  let v = 'e';
  for (let k = l.length - 1; k >= 0; k--) if (VOW.includes(l[k])) { v = l[k]; break; }
  return [v, last != null && VOW.includes(last) ? 1 : 0];
}
const dat = n => { const [v, e] = sound(n); return `${n}'${e ? 'y' : ''}${'aıou'.includes(v) ? 'a' : 'e'}`; };
const acc = n => { const [v, e] = sound(n); return `${n}'${e ? 'y' : ''}${{ a: 'ı', ı: 'ı', o: 'u', u: 'u', e: 'i', i: 'i', ö: 'ü', ü: 'ü' }[v]}`; };
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const cleanTx = s => String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_TX);
const locLabel = k => LOCS[k] ? `${LOCS[k].n} ${LOCS[k].i}` : '?';

/* ---------- kurallar (yöneten cihaz) ---------- */
const nOf = st => st.pl.length;
const isOn = (st, i) => st.local || !!st.on[i];
function nextOnline(st, from) {
  const n = nOf(st);
  for (let k = 1; k <= n; k++) { const i = (from + k) % n; if (isOn(st, i)) return i; }
  return from;
}
function chat(st, m) { m.id = ++st.chatSeq; st.chat.push(m); if (st.chat.length > 60) st.chat.splice(0, st.chat.length - 60); return m; }
function sys(st, ctx, tx, cls) { const m = chat(st, { k: 'sys', tx, cls }); ctx.emit({ t: 'chat', m, rd: st.round }); return m; }
function cardOf(st, i) { return st.spies.includes(i) ? { spy: true } : { spy: false, loc: st.loc, role: st.roles[i] }; }

function startRound(st, ctx) {
  const n = nOf(st);
  st.round++;
  let free = st.pool.filter(k => !st.used.includes(k));
  if (!free.length) { st.used = []; free = st.pool.slice(); }
  st.loc = free[Math.floor(Math.random() * free.length)];
  st.used.push(st.loc);
  const cnt = st.spyOpt === 2 && n >= 6 ? 2 : 1;
  st.spies = shuffle(st.pl.map((_, i) => i)).slice(0, cnt).sort((a, b) => a - b);
  const roles = shuffle(LOCS[st.loc].r);
  let k = 0;
  st.roles = st.pl.map((_, i) => (st.spies.includes(i) ? null : roles[k++ % roles.length]));
  const start = (st.first + st.round - 1) % n;
  st.asker = isOn(st, start) ? start : nextOnline(st, start);
  st.target = null; st.lastAsker = null; st.qn = 0;
  st.accUsed = st.pl.map(() => false); st.vote = null; st.res = null; st.revealUntil = 0;
  st.lastMsg = st.pl.map(() => 0);
  if (st.local) { st.phase = 'deal'; st.dealIdx = 0; st.endAt = 0; st.paused = st.timeMs; }
  else { st.phase = 'play'; st.endAt = Date.now() + st.timeMs; st.paused = null; }
  st.tk++;
  sys(st, ctx, `🕵️ ${st.round}. tur başladı! ${cnt === 2 ? 'Bu turda 2 casus var.' : 'Aranızda bir casus var.'}${st.local ? ' Kartlara sırayla bakın.' : ` İlk soran: ${st.pl[st.asker].name}.`}`, 'gold');
  ctx.emit({ t: 'round', rd: st.round });
  ctx.sync();
  arm(st, ctx);
}

function arm(st, ctx) {
  const tk = st.tk, now = Date.now();
  const at = (t, fn) => ctx.later(Math.max(0, t - now), () => { if (st.tk === tk) fn(); });
  if (st.phase === 'play' && st.endAt) at(st.endAt, () => { if (st.phase === 'play') endRound(st, ctx, 'time', {}); });
  else if (st.phase === 'vote' && st.vote && st.vote.until) at(st.vote.until, () => { if (st.phase === 'vote') resolveVote(st, ctx, false, 'time'); });
  else if (st.phase === 'reveal' && st.revealUntil) at(st.revealUntil, () => { if (st.phase === 'reveal') nextRound(st, ctx); });
}

function pauseClock(st) { if (st.endAt) { st.paused = Math.max(1000, st.endAt - Date.now()); st.endAt = 0; } }
function resumeClock(st) { if (st.paused != null) { st.endAt = Date.now() + st.paused; st.paused = null; } }

function startVote(st, ctx, by, target) {
  st.accUsed[by] = true;
  pauseClock(st);
  st.vote = { by, acc: target, votes: { [by]: true }, until: st.local ? 0 : Date.now() + VOTE_MS };
  st.phase = 'vote';                              // soru-cevap sırası oylamadan sonra kaldığı yerden sürer
  st.tk++;
  ctx.emit({ t: 'accuse', by, acc: target, rd: st.round }, `🚨 ${st.pl[by].name}, ${acc(st.pl[target].name)} casuslukla suçladı! Oylama başladı.`, 'bad');
  if (!st.local && checkVote(st, ctx)) return;
  ctx.sync();
  arm(st, ctx);
}
// Oybirliği: suçlanan hariç (bağlı) herkes evet demeli. Hayır gelirse hemen biter.
function voters(st) { return st.pl.map((_, i) => i).filter(i => i !== st.vote.acc && isOn(st, i)); }
function checkVote(st, ctx) {
  const v = st.vote; if (!v) return false;
  if (Object.values(v.votes).some(x => x === false)) { resolveVote(st, ctx, false, 'no'); return true; }
  const need = voters(st);
  if (need.length && need.every(i => v.votes[i] === true)) { resolveVote(st, ctx, true); return true; }
  return false;
}
function resolveVote(st, ctx, ok, why) {
  const v = st.vote; if (!v || st.phase !== 'vote') return;
  if (ok) {
    if (st.spies.includes(v.acc)) endRound(st, ctx, 'caught', { accuser: v.by, accused: v.acc });
    else endRound(st, ctx, 'innocent', { accuser: v.by, accused: v.acc });
    return;
  }
  const nos = Object.keys(v.votes).filter(i => v.votes[i] === false).map(i => st.pl[i].name);
  st.vote = null; st.phase = 'play'; resumeClock(st); st.tk++;
  const tx = why === 'time' ? 'Oylama süresi doldu, oybirliği sağlanamadı.' : why === 'local' ? 'Oybirliği sağlanamadı.' : `${nos.join(', ')} hayır dedi.`;
  ctx.emit({ t: 'votefail', rd: st.round }, `🗳️ Oylama başarısız: ${tx} Oyun sürüyor.`, '');
  ctx.sync();
  arm(st, ctx);
}

function endRound(st, ctx, reason, x) {
  if (st.phase !== 'play' && st.phase !== 'vote') return;
  const n = nOf(st), gains = st.pl.map(() => 0);
  const spies = st.spies, nonSpy = i => !spies.includes(i);
  if (reason === 'caught') { for (let i = 0; i < n; i++) if (nonSpy(i)) gains[i] = i === x.accuser ? 2 : 1; }
  else if (reason === 'wrong') { for (let i = 0; i < n; i++) if (nonSpy(i)) gains[i] = 1; }
  else if (reason === 'innocent' || reason === 'time') { spies.forEach(i => { gains[i] = 2; }); }
  else if (reason === 'guess') { spies.forEach(i => { gains[i] = i === x.guesser ? x.bonus : 2; }); }
  gains.forEach((g, i) => { st.score[i] += g; });
  st.res = Object.assign({ reason, spies: spies.slice(), loc: st.loc, roles: st.roles.slice(), gains }, x);
  st.hist.push({ round: st.round, loc: st.loc, spies: spies.slice(), reason });
  if (reason === 'caught' || reason === 'wrong') st.caught++;
  st.phase = 'reveal'; st.vote = null; st.endAt = 0; st.paused = null; st.target = null;
  st.revealUntil = st.local ? 0 : Date.now() + (st.round >= st.rounds ? LAST_REVEAL_MS : REVEAL_MS);
  st.tk++;
  const who = spies.map(i => st.pl[i].name).join(' & ');
  ctx.emit({ t: 'reveal', rd: st.round, reason, spies: spies.slice(), gains }, `${spies.length > 1 ? 'Casuslar' : 'Casus'}: ${who}! Konum: ${locLabel(st.loc)}`, reason === 'left' ? '' : 'gold');
  ctx.sync();
  arm(st, ctx);
}
function nextRound(st, ctx) { if (st.round >= st.rounds) finish(st, ctx); else startRound(st, ctx); }
function finish(st, ctx) {
  st.phase = 'end'; st.tk++;
  ctx.sync();
  const order = st.pl.map((_, i) => i).sort((a, b) => st.score[b] - st.score[a] || a - b);
  const top = st.score[order[0]], tie = order.filter(i => st.score[i] === top).length > 1;
  ctx.end({
    title: tie ? 'Berabere bitti!' : `${st.pl[order[0]].name} kazandı!`,
    ranking: order.map(i => ({ pi: i, score: st.score[i], label: `${st.score[i]} puan` })),
    note: `${st.rounds} tur oynandı · casus ${st.caught} kez yakalandı`
  });
}

/* ---------- arayüz durumu ---------- */
let root = null, ui = null, V = null;
let chatList = [], extras = [], lastChatId = 0;
let timerT = null, lastTickSec = -1;
let cardOpen = false, roundKey = '', askTo = null;
let notes = { crossed: new Set(), marks: {} }, notesTab = 'loc';
let ov = null;                 // { k: 'accuse'|'guess'|'peek', ... } yerel arayüz katmanı
let dealOpen = false, lvotes = {};
const q = s => root && root.querySelector(s);
const isLocal = () => ui && ui.mode === 'local';
const meSeat = () => (typeof ui.me === 'number' && ui.me >= 0 ? ui.me : -1);
const P = i => (V && V.players[i]) || { name: '?', color: '#fff' };
const nameB = i => `<b class="cs-nm" style="color:${P(i).color}">${esc(P(i).name)}</b>`;

function send(a) { Sound.init(); ui.send(a); }

/* ---------- çizim ---------- */
function timeLeft() {
  if (!V) return 0;
  if (V.paused != null) return V.paused;
  if (!V.endAt) return 0;
  return Math.max(0, V.endAt - ui.hostNow());
}
function tickTimer() {
  if (!V || !root) return;
  const num = q('.cs-tnum'), bar = q('.cs-tbar b'), box = q('.cs-timer');
  const playing = V.phase === 'play' || V.phase === 'vote' || V.phase === 'deal';
  const left = playing ? timeLeft() : 0;
  num.textContent = playing ? mmss(left) : '–:––';
  bar.style.transform = `scaleX(${playing ? clamp(left / V.timeMs, 0, 1) : 0})`;
  const low = V.phase === 'play' && left <= 60000;
  box.classList.toggle('low', low); box.classList.toggle('paused', V.phase === 'vote' || V.phase === 'deal');
  const s = Math.ceil(left / 1000);
  if (V.phase === 'play' && s <= 10 && s > 0 && s !== lastTickSec) { lastTickSec = s; Sound.tick(.8); }
  const vt = q('.cs-vtime');
  if (vt && V.vote && V.vote.until) vt.textContent = Math.max(0, Math.ceil((V.vote.until - ui.hostNow()) / 1000)) + ' sn';
  const rt = q('.cs-rtime');
  if (rt && V.revealUntil) rt.textContent = Math.max(0, Math.ceil((V.revealUntil - ui.hostNow()) / 1000));
}

function renderPlayers(v) {
  const me = meSeat(), open = v.res && (v.phase === 'reveal' || v.phase === 'end');
  q('.cs-players').innerHTML = v.players.map((p, i) => {
    const tags = [];
    if (v.phase === 'play' || v.phase === 'vote') {
      if (i === v.asker && v.target == null) tags.push('<span class="cs-tag ask">🎤 soruyor</span>');
      if (i === v.target) tags.push('<span class="cs-tag ans">💬 cevaplıyor</span>');
      if (v.vote && i === v.vote.acc) tags.push('<span class="cs-tag sus">🚨 suçlanan</span>');
    }
    if (open && v.res.spies.includes(i)) tags.push('<span class="cs-tag spy">🕵️ casus</span>');
    const gain = open && v.res.gains[i] ? `<span class="cs-gain">+${v.res.gains[i]}</span>` : '';
    const active = (v.phase === 'play' && (v.target != null ? i === v.target : i === v.asker)) || (v.phase === 'deal' && i === v.dealIdx);
    return `<div class="cs-pl ${active ? 'active' : ''} ${p.on ? '' : 'off'} ${i === me ? 'me' : ''} ${open && v.res.spies.includes(i) ? 'spy' : ''}" style="--pc:${p.color}" data-pi="${i}">
      <span class="av" style="--pc:${p.color}">${initial(p.name)}</span>
      <span class="cs-pn"><b>${esc(p.name)}${i === me ? ' <small>(sen)</small>' : ''}</b>${tags.join('') || (p.acc ? '<span class="cs-tag used">suçladı</span>' : '')}</span>
      <span class="cs-sc">${p.score}${gain}</span></div>`;
  }).join('');
}

function renderHud(v) {
  q('.cs-round').innerHTML = v.phase === 'end' ? 'Oyun bitti' : `<b>Tur ${v.round}</b>/${v.rounds}${v.spyCount > 1 ? ' · <span class="cs-two">2 casus</span>' : ''}`;
}

function renderStatus(v) {
  const me = meSeat(); let h;
  if (v.phase === 'end') h = '<span class="g-turn win">Oyun bitti!</span>';
  else if (v.phase === 'reveal') h = '<span class="g-turn">🔦 Tur bitti · kimlikler açıklandı</span>';
  else if (v.phase === 'deal') h = `<span class="g-turn mine">📱 Kart sırası: ${esc(P(v.dealIdx).name)}</span>`;
  else if (v.phase === 'vote') h = `<span class="g-turn cs-alarm">🚨 Oylama: ${esc(P(v.vote.acc).name)} casus mu?</span>`;
  else if (isLocal()) h = `<span class="g-turn mine">🎤 Sıra: ${esc(P(v.asker).name)} · kime soracak?</span>`;
  else if (me < 0) h = `<span class="g-turn">👀 İzliyorsun · Sıra: ${nameB(v.target != null ? v.target : v.asker)}</span>`;
  else if (v.target === me) h = '<span class="g-turn mine">⭐ Sıra sende · soruyu cevapla</span>';
  else if (v.target == null && v.asker === me) h = '<span class="g-turn mine">⭐ Sıra sende · birini seç ve sor</span>';
  else if (v.target != null) h = `<span class="g-turn">Sıra: ${nameB(v.target)} · cevaplıyor</span>`;
  else h = `<span class="g-turn">Sıra: ${nameB(v.asker)} · soru soracak</span>`;
  q('.cs-status').innerHTML = h.replace(/^(<span class="g-turn[^"]*">)([\s\S]*)(<\/span>)$/, '$1<span>$2</span>$3');
}

function cardInner(c, opts = {}) {
  if (!c) return '<div class="cs-face watch"><div class="cs-emo">👀</div><p class="cs-cap">İzleyici</p><b class="cs-loc">Kartlar gizli</b></div>';
  if (c.spy) {
    return `<div class="cs-face spy"><span class="cs-stamp">GİZLİ</span><div class="cs-emo">🕵️</div><p class="cs-cap">Kimliğin</p><b class="cs-loc">Sen CASUSSUN</b>
      <p class="cs-role">Konumu bilmiyorsun. Dinle, uydur, yakalanmadan konumu tahmin et!</p>${opts.two ? '<p class="cs-role"><b>Bu turda 2 casus var</b> (birbirinizi bilmiyorsunuz).</p>' : ''}</div>`;
  }
  const L = LOCS[c.loc] || { n: '?', i: '❔' };
  return `<div class="cs-face"><span class="cs-stamp">GİZLİ</span><div class="cs-emo">${L.i}</div><p class="cs-cap">Konum</p><b class="cs-loc">${esc(L.n)}</b>
    <p class="cs-cap">Rolün</p><b class="cs-rl">${esc(c.role || '')}</b></div>`;
}

function renderCard(v) {
  const box = q('.cs-card');
  if (isLocal()) {
    box.innerHTML = `<div class="cs-face local"><div class="cs-emo">🗂️</div><p class="cs-cap">Tek telefon</p><b class="cs-loc">Kartlar gizli</b>
      <p class="cs-role">Herkes kartına kendi baktı. Unutursan “Kartıma bak” ile tekrar bakabilirsin.</p></div>`;
    box.classList.remove('open');
    return;
  }
  const c = v.me;
  const inner = cardInner(meSeat() < 0 ? null : c, { two: v.spyCount > 1 });
  const showing = cardOpen || meSeat() < 0 || v.phase === 'reveal' || v.phase === 'end';
  box.innerHTML = `<button type="button" class="cs-flip ${showing ? 'open' : ''} ${c && c.spy ? 'is-spy' : ''}" data-act="card" aria-label="Kartı göster/gizle">
    <span class="cs-back"><span class="cs-seal">🔒</span><b>Kartını görmek için dokun</b><small>Ekranını kimse görmesin</small></span>
    <span class="cs-front">${inner}<small class="cs-hide">Gizlemek için dokun</small></span></button>`;
}

function renderAsk(v) {
  const box = q('.cs-ask'), me = meSeat();
  let h = '';
  if (v.phase === 'play') {
    const others = v.players.map((p, i) => i).filter(i => i !== v.asker);
    const banned = i => v.players.length >= 4 && i === v.lastAsker;
    if (isLocal()) {
      h = `<p class="cs-ah">🎤 ${nameB(v.asker)} kime soruyor? <small>Soruyu sesli sorun; cevaplayan sıradaki soran olur.</small></p>
        <div class="cs-targets">${others.map(i => `<button type="button" class="cs-tg" style="--pc:${P(i).color}" data-ask="${i}" ${banned(i) ? 'disabled title="Sana soranı hemen geri soramazsın"' : ''}><span class="av" style="--pc:${P(i).color}">${initial(P(i).name)}</span>${esc(dat(P(i).name))} sor</button>`).join('')}</div>`;
    } else if (me >= 0 && v.asker === me && v.target == null) {
      if (askTo != null && (askTo === me || banned(askTo) || !v.players[askTo] || !v.players[askTo].on)) askTo = null;
      h = `<p class="cs-ah">🎤 Kime soracaksın? <small>Seç, sonra sorunu yaz.</small></p>
        <div class="cs-targets">${others.map(i => `<button type="button" class="cs-tg ${askTo === i ? 'on' : ''}" style="--pc:${P(i).color}" data-ask="${i}" ${banned(i) || !v.players[i].on ? 'disabled' : ''} ${banned(i) ? 'title="Sana soranı hemen geri soramazsın"' : ''}><span class="av" style="--pc:${P(i).color}">${initial(P(i).name)}</span>${esc(dat(P(i).name))} sor</button>`).join('')}</div>`;
    } else if (v.target != null) {
      const qm = [...v.chat].reverse().find(m => m.k === 'q');
      h = `<p class="cs-ah ${v.target === me ? 'mine' : ''}">❓ ${nameB(v.asker)} → ${nameB(v.target)}${qm ? `<span class="cs-qt">“${esc(qm.tx)}”</span>` : ''}${v.target === me ? '<small>Cevabını aşağıya yaz.</small>' : ''}</p>`;
    } else {
      h = `<p class="cs-ah">🎤 ${nameB(v.asker)} birine soru soracak…</p>`;
    }
  }
  box.innerHTML = h; box.hidden = !h;
}

function renderActs(v) {
  const box = q('.cs-acts'), me = meSeat();
  const live = v.phase === 'play', canGuessPhase = v.phase === 'play' || v.phase === 'vote';
  let h = '';
  if (isLocal()) {
    if (live || v.phase === 'vote') {
      const anyAcc = v.players.some(p => !p.acc);
      h += `<button type="button" class="btn btn-solve cs-ab" data-act="accuse" ${live && anyAcc ? '' : 'disabled'}>🚨 Suçla</button>`;
      h += `<button type="button" class="btn btn-spin cs-ab" data-act="guess" ${canGuessPhase ? '' : 'disabled'}>🕵️ Casus tahmini</button>`;
      h += `<button type="button" class="btn btn-ghost cs-ab" data-act="peek" ${live ? '' : 'disabled'}>👁 Kartıma bak</button>`;
    }
  } else if (me >= 0 && (live || v.phase === 'vote')) {
    const used = v.players[me].acc;
    h += `<button type="button" class="btn btn-solve cs-ab" data-act="accuse" ${live && !used ? '' : 'disabled'}>🚨 ${used ? 'Suçlama hakkın bitti' : 'Suçla'}</button>`;
    if (v.me && v.me.spy) h += `<button type="button" class="btn btn-spin cs-ab" data-act="guess" ${canGuessPhase ? '' : 'disabled'}>🎯 Konum tahmini</button>`;
  }
  box.innerHTML = h; box.hidden = !h;
}

function renderNotes(v) {
  const box = q('.cs-notes');
  const me = meSeat();
  const tabs = `<div class="cs-ntabs" role="tablist"><button type="button" class="${notesTab === 'loc' ? 'on' : ''}" data-tab="loc">🗺️ Konumlar <small>${v.pool.length}</small></button><button type="button" class="${notesTab === 'sus' ? 'on' : ''}" data-tab="sus">🔎 Şüpheliler</button></div>`;
  let body;
  if (notesTab === 'loc') {
    const showReveal = v.res && (v.phase === 'reveal' || v.phase === 'end') ? v.res.loc : null;
    body = `<p class="cs-nh">${v.me && v.me.spy ? 'Olası konumlar · elediklerinin üstünü çiz' : 'Olası konumlar · dokunarak üstünü çiz'} <small>(yalnızca bu cihazda)</small></p>
      <div class="cs-locs">${v.pool.map(k => `<button type="button" class="cs-lc ${notes.crossed.has(k) ? 'x' : ''} ${k === showReveal ? 'rev' : ''}" data-cross="${k}"><span>${LOCS[k].i}</span>${esc(LOCS[k].n)}</button>`).join('')}</div>`;
  } else {
    const list = v.players.map((p, i) => i).filter(i => i !== me);
    body = `<p class="cs-nh">Kimden şüpheleniyorsun? Dokunarak işaretle <small>(yalnızca bu cihazda)</small></p>
      <div class="cs-sus">${list.map(i => { const m = notes.marks[i] || 0; return `<button type="button" class="cs-sb m${m}" style="--pc:${P(i).color}" data-mark="${i}"><span class="av" style="--pc:${P(i).color}">${initial(P(i).name)}</span><b>${esc(P(i).name)}</b><em>${MARKS[m] || '·'} ${MARK_LABEL[m]}</em></button>`; }).join('')}</div>`;
  }
  box.innerHTML = `<h3 class="cs-nt">📝 Notlarım</h3>${tabs}${body}`;
}

function bubble(m) {
  const me = meSeat();
  if (m.k === 'sys') return `<li class="cs-sys ${m.cls || ''}"><span>${esc(m.tx)}</span></li>`;
  const p = P(m.pi);
  const head = m.k === 'q' ? `${esc(p.name)} <i>❓ → ${esc(P(m.to).name)}</i>` : m.k === 'a' ? `${esc(p.name)} <i>💬 cevap</i>` : esc(p.name);
  return `<li class="cs-m ${m.k} ${m.pi === me ? 'mine' : ''} ${m.k === 'q' && m.to === me ? 'tome' : ''}" style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><div class="cs-b"><b>${head}</b><p>${esc(m.tx)}</p></div></li>`;
}
function renderChat() {
  const ol = q('.cs-msgs'); if (!ol) return;
  const nearBottom = ol.scrollHeight - ol.scrollTop - ol.clientHeight < 80;
  const items = []; let ei = 0;
  const ex = extras.slice().sort((a, b) => a.after - b.after);
  for (const m of chatList) { while (ei < ex.length && ex[ei].after < m.id) items.push(ex[ei++]); items.push(m); }
  while (ei < ex.length) items.push(ex[ei++]);
  ol.innerHTML = items.slice(-70).map(m => (m.k ? bubble(m) : `<li class="cs-sys ${m.cls || ''}"><span>${esc(m.tx)}</span></li>`)).join('') || '<li class="cs-sys"><span>Mesajlar burada görünür.</span></li>';
  if (nearBottom || ol.dataset.init !== '1') { ol.scrollTop = ol.scrollHeight; ol.dataset.init = '1'; }
}
function renderForm(v) {
  const form = q('.cs-form'), inp = q('.cs-in'), btn = q('.cs-send');
  form.hidden = isLocal();
  q('.cs-chat').classList.toggle('local', isLocal());
  if (isLocal()) return;
  const me = meSeat();
  let ph = 'Sohbet et…', dis = false, mode = 'chat', label = 'Gönder';
  if (me < 0) { ph = 'İzleyiciler yazamaz'; dis = true; }
  else if (v.phase === 'end') { ph = 'Oyun bitti'; dis = true; }
  else if (v.phase === 'play' && v.target === me) { ph = 'Cevabını yaz…'; mode = 'answer'; label = 'Cevapla'; }
  else if (v.phase === 'play' && v.asker === me && v.target == null) {
    if (askTo != null) { ph = `${dat(P(askTo).name)} sorunu yaz…`; mode = 'ask'; label = 'Sor'; }
    else { ph = 'Önce kime soracağını seç ↑'; mode = 'need'; }
  }
  inp.placeholder = ph; form.dataset.mode = mode;
  if (inp.disabled !== dis) { inp.disabled = dis; if (dis) inp.blur(); }
  btn.disabled = dis || mode === 'need'; btn.textContent = label;
  btn.className = 'btn cs-send ' + (mode === 'ask' ? 'btn-spin' : mode === 'answer' ? 'btn-solve' : 'btn-vowel');
}

/* ---------- katmanlar (dağıtım, oylama, tahmin, açıklama) ---------- */
function setOverlay(h, cls) {
  const box = q('.cs-over');
  if (box.dataset.h !== h) {
    const cur = box.firstElementChild;
    // aynı tür katmanda yalnızca içerik değişsin: açılış animasyonu yeniden oynamasın
    if (h && cur && box.dataset.c === (cls || '')) cur.innerHTML = h;
    else box.innerHTML = h ? `<div class="cs-modal ${cls || ''}">${h}</div>` : '';
    box.dataset.h = h; box.dataset.c = cls || '';
  }
  box.hidden = !h; box.className = 'cs-over ' + (cls || '');
}
function dealHTML(v, who, open, doneAct) {
  const p = P(who);
  if (!open) {
    return `<div class="cs-pass"><div class="cs-phone">📱</div><p class="cs-ot">Telefonu <b style="color:${p.color}">${esc(dat(p.name))}</b> ver</p>
      <p class="cs-os">Başkaları ekrana bakmasın.</p>
      <button type="button" class="cs-tap" data-act="dealOpen"><span class="cs-seal">🔒</span><b>Kartını görmek için dokun</b><small>${esc(p.name)}</small></button>
      ${doneAct === 'peekClose' ? '<button type="button" class="btn btn-ghost" data-act="ovClose">Vazgeç</button>' : ''}</div>`;
  }
  return `<div class="cs-pass"><p class="cs-os"><b style="color:${p.color}">${esc(p.name)}</b>, kartın:</p>
    <div class="cs-flip open static ${v.cards[who].spy ? 'is-spy' : ''}"><span class="cs-front">${cardInner(v.cards[who], { two: v.spyCount > 1 })}</span></div>
    <button type="button" class="btn btn-spin cs-wide" data-act="${doneAct}">Gördüm, gizle ✓</button></div>`;
}
function renderOverlay(v) {
  const me = meSeat();
  // 1) yerel kart dağıtımı
  if (isLocal() && v.phase === 'deal') { setOverlay(dealHTML(v, v.dealIdx, dealOpen, 'seen'), 'deal'); return; }
  // 2) tur sonu açıklaması
  if ((v.phase === 'reveal' || v.phase === 'end') && v.res) { setOverlay(revealHTML(v), 'reveal'); return; }
  // 3) yerel katmanlar
  if (ov && ov.k === 'peek' && isLocal() && v.phase === 'play') {
    if (ov.who == null) setOverlay(`<p class="cs-ot">👁 Kim kartına bakacak?</p><div class="cs-pick">${v.players.map((p, i) => `<button type="button" class="cs-tg" style="--pc:${p.color}" data-peek="${i}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span>${esc(p.name)}</button>`).join('')}</div><button type="button" class="btn btn-ghost" data-act="ovClose">Vazgeç</button>`, 'pick');
    else setOverlay(dealHTML(v, ov.who, ov.open, 'peekClose'), 'deal');
    return;
  }
  if (ov && ov.k === 'accuse' && v.phase === 'play') {
    const by = isLocal() ? ov.by : me;
    if (by == null) {
      setOverlay(`<p class="cs-ot">🚨 Kim suçluyor?</p><p class="cs-os">Her oyuncu turda bir kez suçlayabilir.</p><div class="cs-pick">${v.players.map((p, i) => `<button type="button" class="cs-tg" style="--pc:${p.color}" data-by="${i}" ${p.acc ? 'disabled' : ''}><span class="av" style="--pc:${p.color}">${initial(p.name)}</span>${esc(p.name)}${p.acc ? ' · hakkı bitti' : ''}</button>`).join('')}</div><button type="button" class="btn btn-ghost" data-act="ovClose">Vazgeç</button>`, 'pick');
    } else {
      setOverlay(`<p class="cs-ot">🚨 ${isLocal() ? `${esc(P(by).name)} kimi suçluyor?` : 'Kimi suçluyorsun?'}</p><p class="cs-os">Suçlanan hariç herkes “evet” derse tur biter. Turda yalnızca bir suçlama hakkın var.</p>
        <div class="cs-pick">${v.players.map((p, i) => i === by ? '' : `<button type="button" class="cs-tg sus" style="--pc:${p.color}" data-accuse="${i}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span>${esc(acc(p.name))} suçla</button>`).join('')}</div><button type="button" class="btn btn-ghost" data-act="ovClose">Vazgeç</button>`, 'pick');
    }
    return;
  }
  if (ov && ov.k === 'guess' && (v.phase === 'play' || v.phase === 'vote')) {
    if (isLocal() && ov.who == null) {
      setOverlay(`<p class="cs-ot">🕵️ Casus kendini açığa çıkarıyor</p><p class="cs-os">Casus kimse adına dokunsun ve konumu tahmin etsin.</p><div class="cs-pick">${v.players.map((p, i) => `<button type="button" class="cs-tg" style="--pc:${p.color}" data-who="${i}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span>${esc(p.name)}</button>`).join('')}</div><button type="button" class="btn btn-ghost" data-act="ovClose">Vazgeç</button>`, 'pick');
    } else {
      const sel = ov.sel;
      setOverlay(`<p class="cs-ot">🎯 Konum neresi?</p><p class="cs-os">Yanlış tahmin edersen yakalanırsın! ${v.phase === 'vote' && v.vote.acc === (isLocal() ? ov.who : me) ? 'Suçlanırken bilirsen +2.' : 'Suçlanmadan bilirsen +4.'}</p>
        <div class="cs-locs big">${v.pool.map(k => `<button type="button" class="cs-lc ${notes.crossed.has(k) ? 'x' : ''} ${sel === k ? 'sel' : ''}" data-gsel="${k}"><span>${LOCS[k].i}</span>${esc(LOCS[k].n)}</button>`).join('')}</div>
        <div class="cs-row"><button type="button" class="btn btn-ghost" data-act="ovClose">Vazgeç</button><button type="button" class="btn btn-spin" data-act="guessGo" ${sel == null ? 'disabled' : ''}>${sel == null ? 'Bir konum seç' : `Tahmin: ${esc(LOCS[sel].n)} ${LOCS[sel].i}`}</button></div>`, 'guess');
    }
    return;
  }
  // 4) oylama
  if (v.phase === 'vote' && v.vote) { setOverlay(voteHTML(v), 'vote'); return; }
  setOverlay('', '');
}
function voteHTML(v) {
  const me = meSeat(), V2 = v.vote, accd = P(V2.acc);
  const chips = v.players.map((p, i) => {
    if (i === V2.acc) return '';
    const x = V2.votes[i];
    return `<span class="cs-vc ${x === true ? 'y' : x === false ? 'n' : ''} ${p.on ? '' : 'off'}" style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span>${esc(p.name)} <em>${x === true ? '✓' : x === false ? '✗' : (p.on ? '…' : 'bağlı değil')}</em></span>`;
  }).join('');
  let ctrl = '';
  if (isLocal()) {
    const vs = v.players.map((p, i) => i).filter(i => i !== V2.acc);
    const all = vs.every(i => i === V2.by || lvotes[i] != null);
    ctrl = `<p class="cs-os">Herkes elini kaldırsın: kim “evet, casus” diyor?</p><div class="cs-lv">${vs.map(i => {
      const x = i === V2.by ? true : lvotes[i];
      return `<div class="cs-lvr" style="--pc:${P(i).color}"><span class="av" style="--pc:${P(i).color}">${initial(P(i).name)}</span><b>${esc(P(i).name)}</b>${i === V2.by ? '<em>suçlayan · evet</em>' : `<button type="button" class="cs-yn y ${x === true ? 'on' : ''}" data-lv="${i}" data-y="1">Evet</button><button type="button" class="cs-yn n ${x === false ? 'on' : ''}" data-lv="${i}" data-y="0">Hayır</button>`}</div>`;
    }).join('')}</div>
      <div class="cs-row"><button type="button" class="btn btn-ghost" data-act="guess">🕵️ Casus tahmini</button><button type="button" class="btn btn-solve" data-act="lvoteGo" ${all ? '' : 'disabled'}>🗳️ Oyları say</button></div>`;
  } else if (me < 0) ctrl = '<p class="cs-os">İzleyiciler oy veremez.</p>';
  else if (me === V2.acc) {
    ctrl = `<p class="cs-os cs-warn">Seni suçluyorlar! Oy veremezsin, kendini savun.</p>${v.me && v.me.spy ? '<button type="button" class="btn btn-spin cs-wide" data-act="guess">🎯 Kaçmadan konumu tahmin et (+2)</button>' : ''}`;
  } else if (V2.votes[me] != null) {
    ctrl = `<p class="cs-os">Oyun: <b>${V2.votes[me] ? 'Evet ✓' : 'Hayır ✗'}</b> · diğerleri bekleniyor</p>${v.me && v.me.spy ? '<button type="button" class="btn btn-ghost cs-wide" data-act="guess">🎯 Konumu tahmin et</button>' : ''}`;
  } else {
    ctrl = `<div class="cs-row"><button type="button" class="btn btn-solve cs-big" data-vote="1">👍 Evet, casus!</button><button type="button" class="btn btn-vowel cs-big" data-vote="0">👎 Hayır</button></div>${v.me && v.me.spy ? '<button type="button" class="btn btn-ghost cs-wide" data-act="guess">🎯 Konumu tahmin et</button>' : ''}`;
  }
  return `<div class="cs-siren"></div><p class="cs-kick">🚨 SUÇLAMA ${V2.until ? '· <span class="cs-vtime"></span>' : ''}</p>
    <div class="cs-accd" style="--pc:${accd.color}"><span class="av" style="--pc:${accd.color}">${initial(accd.name)}</span><b>${esc(accd.name)}</b><small>casus mu?</small></div>
    <p class="cs-os">Suçlayan: ${nameB(V2.by)} · oybirliği gerekli</p>
    <div class="cs-vchips">${chips}</div>${ctrl}`;
}
const REASON = {
  caught: r => `🎯 Casus yakalandı! Suçlayan: ${esc(P(r.accuser).name)} (+2), diğerleri +1.`,
  wrong: r => `❌ Casus yanlış tahmin etti: “${esc(LOCS[r.guess].n)}”. Casus olmayanlara +1.`,
  innocent: r => `😱 Masum suçlandı! ${esc(P(r.accused).name)} casus değildi. Casusa +2.`,
  time: () => '⏰ Süre doldu, casus yakalanmadı! Casusa +2.',
  guess: r => `🕵️ Casus konumu bildi! ${esc(P(r.guesser).name)} +${r.bonus}.`,
  left: () => '🔌 Casusun bağlantısı koptu, tur puansız bitti.'
};
function revealHTML(v) {
  const r = v.res, L = LOCS[r.loc];
  const who = r.spies.map(i => `<b style="color:${P(i).color}">${esc(P(i).name)}</b>`).join(' & ');
  const gains = v.players.map((p, i) => ({ p, i, g: r.gains[i] })).filter(o => o.g);
  const me = meSeat();
  const won = me >= 0 && r.gains[me] > 0;
  const roles = v.players.map((p, i) => `<li style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${initial(p.name)}</span><b>${esc(p.name)}</b><em>${r.spies.includes(i) ? '🕵️ Casus' : esc(r.roles[i] || '')}</em></li>`).join('');
  const last = v.round >= v.rounds;
  const foot = v.phase === 'end' ? '' : (isLocal() || ui.isHost)
    ? `<button type="button" class="btn btn-spin cs-wide" data-act="next">${last ? '🏆 Sonuçları gör' : '▶ Sonraki tur'}${v.revealUntil ? ' <small class="cs-rtime"></small>' : ''}</button>`
    : `<p class="cs-os">${last ? 'Sonuçlar' : 'Sonraki tur'} <b class="cs-rtime"></b> sn içinde…</p>`;
  return `<p class="cs-kick">DOSYA AÇILDI · TUR ${v.round}</p>
    <div class="cs-rv1">${r.spies.length > 1 ? 'Casuslar' : 'Casus'}: ${who}!</div>
    <div class="cs-rv2"><span class="cs-rvemo">${L.i}</span>Konum: <b>${esc(L.n)}</b></div>
    <p class="cs-rv3 ${r.reason}">${REASON[r.reason](r)}</p>
    ${gains.length ? `<div class="cs-gains">${gains.map(o => `<span style="--pc:${o.p.color}">${esc(o.p.name)} <b>+${o.g}</b></span>`).join('')}</div>` : ''}
    ${me >= 0 && !isLocal() ? `<p class="cs-you ${won ? 'w' : 'l'}">${won ? 'Bu turu kazandın! 🎉' : 'Bu tur sana puan yok.'}</p>` : ''}
    <details class="cs-roles"><summary>Kim neydi?</summary><ul>${roles}</ul></details>${foot}`;
}

function render(v) {
  const prev = V; V = v;
  if (!root) return;
  const key = ui.mode + ':' + v.round;
  if (key !== roundKey) {
    roundKey = key; cardOpen = false; askTo = null; ov = null; dealOpen = false; lvotes = {};
    notes = { crossed: new Set(), marks: {} };
  }
  if (prev && prev.phase === 'deal' && v.phase === 'deal' && prev.dealIdx !== v.dealIdx) dealOpen = false;
  if (v.phase !== 'vote') lvotes = {};
  if (ov && ov.k !== 'guess' && v.phase !== 'play') ov = null;
  if (ov && ov.k === 'guess' && v.phase !== 'play' && v.phase !== 'vote') ov = null;
  if (v.target != null || v.asker !== meSeat()) askTo = null;
  chatList = v.chat || [];
  lastChatId = chatList.length ? chatList[chatList.length - 1].id : lastChatId;
  const cs = q('.cs');
  cs.dataset.phase = v.phase;
  cs.classList.toggle('is-local', isLocal());
  cs.classList.toggle('is-spy', !!(v.me && v.me.spy));
  renderHud(v); renderPlayers(v); renderStatus(v); renderCard(v); renderAsk(v); renderActs(v); renderNotes(v); renderForm(v); renderChat(); renderOverlay(v);
  tickTimer();
}
const rerender = () => { if (V) render(V); };

/* ---------- olaylar ---------- */
function onEvent(e) {
  if (!root || !V) return;
  const me = meSeat();
  if (e.t === 'chat') {
    const m = e.m; if (!m || m.id <= lastChatId) return;
    chatList.push(m); lastChatId = m.id; renderChat();
    if (m.k === 'q' && m.to === me && !isLocal()) { Sound.special(); banner('SANA SORU!', 'pink'); }
    else if (m.k !== 'sys') Sound.tick(.3);
  } else if (e.t === 'round') { Sound.whoosh(); banner(`${e.rd}. TUR`, 'pink'); }
  else if (e.t === 'go') { Sound.stop(); banner('SORGU BAŞLASIN!', 'good'); }
  else if (e.t === 'accuse') { Sound.bad(); flash('bad'); banner(e.acc === me && !isLocal() ? 'SENİ SUÇLUYORLAR!' : 'SUÇLAMA!', 'bad'); }
  else if (e.t === 'vote') Sound.tick(.6);
  else if (e.t === 'votefail') { Sound.whoosh(); banner('OYBİRLİĞİ YOK', 'pink'); }
  else if (e.t === 'notspy') { Sound.bad(); banner('O CASUS DEĞİL!', 'bad'); }
  else if (e.t === 'reveal') {
    Sound.whoosh();
    const won = me >= 0 && e.gains && e.gains[me] > 0;
    setTimeout(() => {
      if (!root) return;
      if (e.reason === 'left') { Sound.bad(); return; }
      if (isLocal() || won) { Sound.solve(); FX.confetti(70); if (!isLocal()) flash('good'); }
      else { Sound.bankrupt(); flash('bad'); }
      (e.spies || []).forEach(i => { const chip = q(`.cs-pl[data-pi="${i}"]`); if (chip) { const [x, y] = centerOf(chip); FX.burst(x, y, 30, false); } });
    }, 1300);
  }
}
function addLog(tx, cls) { extras.push({ after: lastChatId, tx, cls }); if (extras.length > 20) extras.shift(); renderChat(); }

/* ---------- girdi ---------- */
function onClick(e) {
  const b = e.target.closest('button'); if (!b || b.disabled || !V || !root.contains(b)) return;
  const v = V, d = b.dataset, me = meSeat();
  if (d.tab) { notesTab = d.tab; Sound.tick(.4); renderNotes(v); return; }
  if (d.cross != null) { const k = +d.cross; if (notes.crossed.has(k)) notes.crossed.delete(k); else notes.crossed.add(k); Sound.tick(.4); renderNotes(v); return; }
  if (d.mark != null) { const i = +d.mark; notes.marks[i] = ((notes.marks[i] || 0) + 1) % MARKS.length; Sound.tick(.4); renderNotes(v); return; }
  if (d.ask != null) {
    const to = +d.ask;
    if (isLocal()) { send({ t: 'ask', to, as: v.asker }); return; }
    askTo = askTo === to ? null : to; Sound.tick(.5); renderAsk(v); renderForm(v);
    if (askTo != null) q('.cs-in').focus();
    return;
  }
  if (d.vote != null) { send({ t: 'vote', yes: d.vote === '1' }); return; }
  if (d.lv != null) { lvotes[+d.lv] = d.y === '1'; Sound.tick(.5); renderOverlay(v); return; }
  if (d.peek != null) { ov = { k: 'peek', who: +d.peek, open: false }; renderOverlay(v); return; }
  if (d.by != null) { ov = { k: 'accuse', by: +d.by }; renderOverlay(v); return; }
  if (d.accuse != null) {
    const target = +d.accuse;
    if (isLocal()) send({ t: 'accuse', by: ov.by, target, as: ov.by }); else send({ t: 'accuse', target });
    ov = null; renderOverlay(v); return;
  }
  if (d.who != null) { ov = { k: 'guess', who: +d.who, sel: null }; renderOverlay(v); return; }
  if (d.gsel != null) {
    ov.sel = +d.gsel; Sound.tick(.5);
    // seçim: listeyi yeniden çizmeden işaretle (kaydırma konumu korunur)
    root.querySelectorAll('.cs-over [data-gsel]').forEach(x => x.classList.toggle('sel', +x.dataset.gsel === ov.sel));
    const go = q('.cs-over [data-act="guessGo"]');
    if (go) { go.disabled = false; go.textContent = `Tahmin: ${LOCS[ov.sel].n} ${LOCS[ov.sel].i}`; }
    q('.cs-over').dataset.h = ''; return;
  }
  switch (d.act) {
    case 'card': cardOpen = !cardOpen; Sound.tick(.5); renderCard(v); break;
    case 'dealOpen':
      Sound.special();
      if (ov && ov.k === 'peek') ov.open = true; else dealOpen = true;
      renderOverlay(v); break;
    case 'seen': dealOpen = false; send({ t: 'seen', as: v.dealIdx }); break;
    case 'peekClose': case 'ovClose': ov = null; renderOverlay(v); break;
    case 'accuse': ov = { k: 'accuse', by: isLocal() ? null : me }; renderOverlay(v); break;
    case 'guess': ov = { k: 'guess', who: isLocal() ? null : me, sel: null }; renderOverlay(v); break;
    case 'peek': ov = { k: 'peek', who: null }; renderOverlay(v); break;
    case 'guessGo': {
      if (!ov || ov.sel == null) return;
      const a = { t: 'guess', loc: ov.sel }; if (isLocal()) a.as = ov.who;
      ov = null; send(a); renderOverlay(v); break;
    }
    case 'lvoteGo': {
      const yes = v.players.map((p, i) => i).filter(i => i !== v.vote.acc && (i === v.vote.by || lvotes[i] === true));
      send({ t: 'lvotes', yes }); break;
    }
    case 'next': send({ t: 'next' }); break;
    default:
  }
}
function onSubmit(e) {
  e.preventDefault();
  const inp = q('.cs-in'), form = q('.cs-form');
  const tx = cleanTx(inp.value);
  if (!tx || inp.disabled || !V) return;
  const mode = form.dataset.mode;
  if (mode === 'need') { banner('Önce kişiyi seç', 'pink'); return; }
  if (mode === 'ask') { send({ t: 'ask', to: askTo, tx }); askTo = null; }
  else if (mode === 'answer') send({ t: 'answer', tx });
  else send({ t: 'chat', tx });
  inp.value = ''; inp.focus();
}

function mount(r, api) {
  root = r; ui = api; V = null;
  chatList = []; extras = []; lastChatId = 0; roundKey = ''; cardOpen = false; askTo = null; ov = null; dealOpen = false; lvotes = {};
  notes = { crossed: new Set(), marks: {} }; notesTab = 'loc'; lastTickSec = -1;
  root.innerHTML = `<div class="g-wrap cs">
    <div class="cs-hud"><span class="cs-round"></span><div class="cs-timer"><span class="cs-tico">⏱</span><span class="cs-tnum">–:––</span><i class="cs-tbar"><b></b></i></div></div>
    <div class="cs-players"></div>
    <div class="g-status cs-status"></div>
    <div class="cs-grid">
      <section class="cs-left">
        <div class="cs-card"></div>
        <div class="cs-ask" hidden></div>
        <div class="cs-acts" hidden></div>
      </section>
      <section class="cs-chat">
        <h3 class="cs-ch">📡 Sorgu Odası</h3>
        <ol class="cs-msgs" aria-live="polite"></ol>
        <form class="cs-form" autocomplete="off">
          <input class="cs-in" maxlength="${MAX_TX}" autocomplete="off" spellcheck="false" enterkeyhint="send" aria-label="Mesaj">
          <button type="submit" class="btn btn-vowel cs-send">Gönder</button>
        </form>
      </section>
      <section class="cs-notes"></section>
    </div>
    <div class="cs-over" hidden></div>
  </div>`;
  root.addEventListener('click', onClick);
  q('.cs-form').addEventListener('submit', onSubmit);
  timerT = setInterval(tickTimer, 250);
}
function unmount() {
  clearInterval(timerT); timerT = null;
  if (root) root.removeEventListener('click', onClick);
  root = null; ui = null; V = null;
}
const M = {
  setup(players, opts, ctx) {
    const timeMin = [5, 8, 10].includes(+opts.time) ? +opts.time : 8;
    const rounds = [3, 5, 7].includes(+opts.rounds) ? +opts.rounds : 3;
    const pn = opts.pool === 'all' ? LOCS.length : [20, 30].includes(+opts.pool) ? +opts.pool : 30;
    const pool = shuffle(LOCS.map((_, k) => k)).slice(0, pn).sort((a, b) => LOCS[a].n.localeCompare(LOCS[b].n, 'tr'));
    const st = {
      pl: players.map(p => ({ name: p.name, color: p.color })), score: players.map(() => 0), on: players.map(() => true),
      local: ctx.mode === 'local', rounds, round: 0, timeMs: timeMin * 60000, spyOpt: +opts.spies === 2 ? 2 : 1,
      pool, used: [], first: Math.floor(Math.random() * players.length),
      phase: 'deal', loc: 0, spies: [], roles: [], asker: 0, target: null, lastAsker: null, qn: 0, dealIdx: 0,
      accUsed: [], vote: null, res: null, hist: [], caught: 0, endAt: 0, paused: null, revealUntil: 0,
      chat: [], chatSeq: 0, lastMsg: [], tk: 0
    };
    startRound(st, ctx);
    return st;
  },
  action(st, pi, a, ctx) {
    if (st.phase === 'end') return;
    const n = nOf(st), validP = i => Number.isInteger(i) && i >= 0 && i < n;
    switch (a.t) {
      case 'seen': {
        if (!st.local || st.phase !== 'deal' || pi !== st.dealIdx) return;
        st.dealIdx++;
        if (st.dealIdx >= n) {
          st.phase = 'play'; resumeClock(st); st.tk++;
          ctx.emit({ t: 'go', rd: st.round }, `Herkes kartını gördü. İlk soran: ${st.pl[st.asker].name}.`, 'good');
          arm(st, ctx);
        }
        ctx.sync(); return;
      }
      case 'ask': {
        if (st.phase !== 'play' || pi !== st.asker || st.target != null) return;
        const to = a.to;
        if (!validP(to) || to === pi || !isOn(st, to)) return;
        if (n >= 4 && to === st.lastAsker) return;               // sana soranı hemen geri soramazsın
        if (st.local) {
          st.lastAsker = pi; st.asker = to; st.qn++;
          sys(st, ctx, `🎤 ${st.pl[pi].name} → ${dat(st.pl[to].name)} soruyor`, '');
          ctx.sync(); return;
        }
        const tx = cleanTx(a.tx); if (!tx) return;
        st.target = to; st.lastMsg[pi] = Date.now();
        const m = chat(st, { k: 'q', pi, to, tx });
        ctx.emit({ t: 'chat', m, rd: st.round });
        ctx.sync(); return;
      }
      case 'answer': {
        if (st.local || st.phase !== 'play' || st.target !== pi) return;
        const tx = cleanTx(a.tx); if (!tx) return;
        const m = chat(st, { k: 'a', pi, to: st.asker, tx });
        st.lastAsker = st.asker; st.asker = pi; st.target = null; st.qn++; st.lastMsg[pi] = Date.now();
        ctx.emit({ t: 'chat', m, rd: st.round });
        ctx.sync(); return;
      }
      case 'chat': {
        if (st.local) return;
        const tx = cleanTx(a.tx); if (!tx) return;
        const now = Date.now(); if (now - (st.lastMsg[pi] || 0) < CHAT_GAP) return; st.lastMsg[pi] = now;
        const m = chat(st, { k: 'c', pi, tx });
        ctx.emit({ t: 'chat', m, rd: st.round });
        return;
      }
      case 'accuse': {
        if (st.phase !== 'play') return;
        const by = st.local ? a.by : pi;
        if (!validP(by) || st.accUsed[by]) return;
        const t = a.target;
        if (!validP(t) || t === by) return;
        startVote(st, ctx, by, t); return;
      }
      case 'vote': {
        if (st.local || st.phase !== 'vote' || !st.vote) return;
        if (pi === st.vote.acc || st.vote.votes[pi] != null || typeof a.yes !== 'boolean') return;
        st.vote.votes[pi] = a.yes;
        ctx.emit({ t: 'vote', pi, yes: a.yes, rd: st.round });
        if (!checkVote(st, ctx)) ctx.sync();
        return;
      }
      case 'lvotes': {
        if (!st.local || st.phase !== 'vote' || !st.vote || !Array.isArray(a.yes)) return;
        const yes = new Set(a.yes.filter(validP)); yes.add(st.vote.by);
        st.pl.forEach((_, i) => { if (i !== st.vote.acc) st.vote.votes[i] = yes.has(i); });
        resolveVote(st, ctx, voters(st).every(i => yes.has(i)), 'local'); return;
      }
      case 'guess': {
        if (st.phase !== 'play' && st.phase !== 'vote') return;
        const k = a.loc;
        if (!Number.isInteger(k) || !st.pool.includes(k)) return;
        if (!st.spies.includes(pi)) { if (st.local) ctx.emit({ t: 'notspy', pi }, `${st.pl[pi].name} casus değil, tahmin edemez.`, 'bad'); return; }
        const underFire = st.phase === 'vote' && st.vote && st.vote.acc === pi;
        if (k === st.loc) endRound(st, ctx, 'guess', { guesser: pi, guess: k, bonus: underFire ? 2 : 4 });
        else endRound(st, ctx, 'wrong', { guesser: pi, guess: k });
        return;
      }
      case 'next': {
        if (st.phase !== 'reveal') return;
        if (!st.local && pi !== ctx.hostPi) return;
        nextRound(st, ctx); return;
      }
      default:
    }
  },
  view(st, viewer) {
    const all = viewer === 'all', seat = typeof viewer === 'number' && viewer >= 0 && viewer < nOf(st) ? viewer : -1;
    const open = st.phase === 'reveal' || st.phase === 'end';
    return {
      phase: st.phase, round: st.round, rounds: st.rounds, spyCount: st.spies.length, pool: st.pool.slice(),
      players: st.pl.map((p, i) => ({ name: p.name, color: p.color, score: st.score[i], on: isOn(st, i), acc: !!st.accUsed[i] })),
      asker: st.asker, target: st.target, lastAsker: st.lastAsker, qn: st.qn, dealIdx: st.dealIdx,
      endAt: st.endAt, paused: st.paused, timeMs: st.timeMs, revealUntil: st.revealUntil,
      vote: st.vote ? { by: st.vote.by, acc: st.vote.acc, votes: Object.assign({}, st.vote.votes), until: st.vote.until } : null,
      chat: st.chat.slice(-50),
      res: open && st.res ? JSON.parse(JSON.stringify(st.res)) : null,
      me: seat >= 0 ? cardOf(st, seat) : null,
      cards: all ? st.pl.map((_, i) => cardOf(st, i)) : null
    };
  },
  turnOf(st) {
    if (st.phase === 'play') return st.target != null ? st.target : st.asker;
    if (st.phase === 'deal') return st.dealIdx;
    return null;
  },
  skipTurn(st, pi, ctx) {
    if (st.phase !== 'play') return;
    if (st.target === pi) {
      st.target = null;
      sys(st, ctx, `${st.pl[pi].name} cevap veremedi; ${st.pl[st.asker].name} başka birine sorsun.`, 'bad');
    } else if (st.target == null && st.asker === pi) {
      st.asker = nextOnline(st, pi); st.lastAsker = null;
      sys(st, ctx, `${st.pl[pi].name} bağlı değil, soru sırası ${dat(st.pl[st.asker].name)} geçti.`, 'bad');
    }
    ctx.sync();
  },
  onPresence(st, pi, online, ctx) {
    st.on[pi] = online;
    if (online) return;
    if ((st.phase === 'play' || st.phase === 'vote') && st.spies.includes(pi)) { endRound(st, ctx, 'left', { who: pi }); return; }
    if (st.phase === 'vote') checkVote(st, ctx);
  },
  resume(st, ctx) { st.tk++; if (st.phase !== 'end') arm(st, ctx); },
};
return Object.assign(M, { mount, render, onEvent, unmount, log: addLog, h: { LOCS, dat, acc, cleanTx, mmss } });
})();

/* ---------- Kelime bankası: Kelime|ipucu1,ipucu2,ipucu3|ilgili1,...  ---------- */
const CATS = [
['yiyecek', 'Yiyecek & İçecek', '🍔', '#ff8a00', '#ff3fa4', `
Pizza|Fırın,Dilim,Hamur|peynir,sucuk,mantar,kutu,salam
Hamburger|Köfte,Ekmek arası,Fast food|patates,ketçap,turşu,marul,kola
Döner|Şiş,Dürüm,Usta bıçağı|lavaş,ayran,et,tavuk,soğan
Lahmacun|İnce hamur,Kıyma,Limon|maydanoz,dürüm,ayran,fırın,acı
Mantı|Yoğurt,Hamur,Kayseri|sarımsak,kıyma,sos,pul biber,haşlama
Simit|Susam,Çay,Halka|fırın,kahvaltı,vapur,peynir,martı
Börek|Yufka,Fırın,Tepsi|peynir,ıspanak,kıyma,çay,kahvaltı
Baklava|Şerbet,Fıstık,Bayram|tatlı,yufka,tepsi,Gaziantep,şeker
Künefe|Sıcak tatlı,Peynir,Hatay|peynir,şerbet,fıstık,dondurma,tava
Lokum|Gül,Pudra şekeri,Kahve yanı|bayram,ikram,fıstık,kutu,yumuşak
Dondurma|Külah,Yaz,Soğuk|çikolata,vanilya,kaşık,çubuk,Maraş
Çikolata|Kakao,Tatlı,Paket|fındık,süt,bitter,şeker,gofret
Kek|Fırın,Yumurta,Un|çay,dilim,kakao,vanilya,kalıp
Pasta|Doğum günü,Mum,Krema|dilim,çilek,kutlama,tabak,fırın
Çorba|Kaşık,Kase,Sıcak|mercimek,ekmek,limon,tuz,kepçe
Pilav|Tereyağı,Tencere,Beyaz|tavuk,nohut,kuru fasulye,tabak,şehriye
Makarna|Çatal,Sos,Haşlama|peynir,domates,spagetti,tencere,süzgeç
Kebap|Mangal,Şiş,Kömür|et,lavaş,közlenmiş biber,ayran,Adana
Köfte|Kıyma,Izgara,Ekmek arası|piyaz,soğan,maydanoz,mangal,sucuk
Omlet|Tava,Kahvaltı,Sarı|yumurta,peynir,tereyağı,çatal,sabah
Menemen|Tava,Kahvaltı,Biber|yumurta,domates,ekmek,soğan,sıcak
Sucuk|Kayseri,Baharat,Tava|yumurta,kahvaltı,et,mangal,pastırma
Peynir|Kahvaltı,Beyaz,Süt ürünü|zeytin,tost,ekmek,kaşar,domates
Zeytin|Kahvaltı,Siyah,Çekirdek|yağ,peynir,ağaç,Ege,salamura
Bal|Arı,Petek,Tatlı|kahvaltı,kaymak,çiçek,kavanoz,ekmek
Reçel|Kavanoz,Kahvaltı,Meyve|çilek,vişne,ekmek,şeker,tereyağı
Tost|Kaşar,Makine,Ekmek|sucuk,ayran,çay,karışık,kantin
Ayran|Köpük,Tuzlu,Bardak|yoğurt,kebap,döner,serin,yayık
Çay|Bardak,Demlik,Sıcak|şeker,simit,kahvaltı,Rize,tavşan kanı
Kahve|Fincan,Telve,Kafein|köpük,fal,lokum,sabah,cezve
Limonata|Ekşi,Yaz,Sürahi|şeker,buz,nane,serin,bardak
Su|Şişe,Bardak,Musluk|içmek,serin,damacana,buz,pet
Kola|Gazlı,Kutu,Buz|şişe,pipet,hamburger,şeker,köpük
Gözleme|Sac,Yufka,Köy kahvaltısı|ıspanak,patates,ayran,peynir,tereyağı
`],
['meyve', 'Meyve & Sebze', '🍎', '#2bd96b', '#ffe14a', `
Elma|Kırmızı,Ağaç,Isırık|yeşil,armut,meyve,turta,Amasya
Armut|Ağaç,Sulu,Sarı|elma,ayva,meyve,çekirdek,sap
Muz|Sarı,Kabuk,Maymun|tropik,meyve,süt,koli,Anamur
Portakal|Turuncu,Vitamin,Sıkmak|mandalina,kış,meyve suyu,kabuk,narenciye
Mandalina|Kabuk,Kış,Dilim|portakal,turuncu,soba,narenciye,çekirdek
Limon|Ekşi,Sarı,Sıkmak|çay,salata,balık,kolonya,vitamin
Çilek|Kırmızı,Reçel,Krema|tarla,pasta,dondurma,yaprak,yaz
Karpuz|Yaz,Çekirdek,Diyarbakır|kavun,peynir,yeşil,kırmızı,soğuk
Kavun|Yaz,Sarı,Dilim|karpuz,peynir,tatlı,bostan,soğuk
Üzüm|Salkım,Bağ,Pekmez|asma,yaprak,sarma,kuru,çekirdek
Kiraz|Sap,Çift,Kırmızı|vişne,çekirdek,küpe,yaz,ağaç
Vişne|Ekşi,Reçel,Şerbet|kiraz,çekirdek,koyu kırmızı,ağaç,turta
Şeftali|Tüylü,Sulu,Yaz|kayısı,nektarin,çekirdek,Bursa,ağaç
Kayısı|Kuru,Turuncu,Çekirdek|şeftali,çekirdek,ağaç,yaz,reçel
İncir|Ege,Kuru,Tatlı|ağaç,yaprak,Aydın,süt,mor
Nar|Kırmızı,Taneler,Ekşi|pekmez,kabuk,kış,Hatay,şerbet
Ananas|Tropik,Dikenli kabuk,Sarı|hindistan cevizi,meyve,konserve,yaprak,tatlı
Kivi|Tüylü,Yeşil,Kahverengi|vitamin,ekşi,dilim,çekirdek,meyve
Domates|Kırmızı,Salata,Salça|biber,salatalık,çoban salatası,menemen,bahçe
Salatalık|Yeşil,Çıtır,Turşu|domates,cacık,yaz,serin,yoğurt
Biber|Acı,Yeşil,Dolma|domates,pul,sivri,közleme,salata
Patlıcan|Mor,Közleme,Kızartma|kebap,imam bayıldı,yağ,biber,yaz
Patates|Kızartma,Toprak altı,Fırın|ketçap,haşlama,cips,püre,soğan
Soğan|Gözyaşı,Kabuk,Halka|sarımsak,kuru,yeşil,doğramak,salata
Sarımsak|Koku,Diş,Cacık|soğan,yoğurt,mantı,beyaz,vampir
Havuç|Turuncu,Tavşan,Göz sağlığı|sebze,salata,kök,rende,şalgam
Ispanak|Yeşil,Yaprak,Demir|yoğurt,börek,sebze,yumurta,güç
Mısır|Patlamış,Sarı,Tarla|haşlama,tane,tarla,sinema,yağ
Kabak|Tatlı,Yeşil,Çekirdek|çiçek,dolma,sebze,turuncu,çekirdek
Lahana|Sarma,Turşu,Kış|yaprak,kırmızı,sebze,salata,Karadeniz
Marul|Yeşil,Salata,Yaprak|hamburger,limon,tavşan,bahçe,çıtır
Fasulye|Kuru,Pilav yanı,Taze|nohut,tencere,zeytinyağı,sebze,piyaz
`],
['hayvan', 'Hayvanlar', '🐾', '#ffb627', '#2bd96b', `
Kedi|Evcil,Bıyık,Pati|kum kabı,yumak,fare,süt,tüy
Köpek|Sadık,Kulübe,Tasma|kemik,havlamak,kuyruk,yürüyüş,mama
Kuş|Kanat,Kafes,Yuva|tüy,uçmak,ötmek,yem,ağaç
Balık|Akvaryum,Su,Pul|deniz,olta,yüzgeç,solungaç,göl
At|Nal,Yele,Yarış|eyer,binici,çiftlik,koşmak,ahır
İnek|Süt,Çiftlik,Ahır|buzağı,ot,boynuz,çayır,peynir
Koyun|Yün,Sürü,Çoban|kuzu,çayır,meleme,kırpmak,çit
Keçi|Dağ,Sakal,Boynuz|süt,peynir,çoban,kaya,ot
Tavuk|Yumurta,Kümes,Gıdaklamak|horoz,civciv,çiftlik,yem,kanat
Horoz|Sabah,Kümes,Şafak|tavuk,ötmek,civciv,çiftlik,şafak
Ördek|Göl,Vak vak,Gaga|yüzmek,tüy,kanat,yavru,park
Aslan|Yele,Kral,Kükreme|orman,savana,Afrika,kaplan,pençe
Kaplan|Çizgili,Pençe,Asya|kedi,orman,turuncu,avcı,aslan
Fil|Kocaman,Afrika,Gri|kulak,gri,hafıza,sirk,savana
Zürafa|Benekli,Ağaç tepesi,Afrika|Afrika,savana,sarı,yaprak,uzun
Maymun|Muz,Ağaç,Taklit|orman,kuyruk,şempanze,dal,hayvanat bahçesi
Ayı|Bal,Kış uykusu,Pençe|orman,kahverengi,kutup,yavru,mağara
Kurt|Uluma,Sürü,Dolunay|orman,diş,gece,masal,köpek
Tilki|Kurnaz,Kızıl,Kuyruk|orman,masal,kümes,tavuk,in
Tavşan|Havuç,Uzun kulak,Zıplama|kafes,beyaz,hızlı,yavru,tüy
Kaplumbağa|Kabuk,Sürüngen,Uzun ömür|deniz,yumurta,sürüngen,kum,yeşil
Yılan|Sürünmek,Zehir,Tıslama|deri,dil,çöl,orman,kobra
Timsah|Nehir,Diş,Gözyaşı|sürüngen,ağız,bataklık,deri,yeşil
Penguen|Buz,Paytak,Siyah beyaz|kutup,balık,kar,soğuk,kuş
Yunus|Zeki,Deniz,Gösteri|balina,yüzgeç,su,sıçramak,mavi
Köpekbalığı|Yüzgeç,Diş,Okyanus|deniz,korku,gri,film,av
Balina|Okyanus,Dev,Fıskiye|deniz,yunus,mavi,su,büyük
Arı|Bal,Çiçek,Sarı siyah|çiçek,iğne,kraliçe,petek,sarı
Kelebek|Kanat,Renkli,Bahar|çiçek,bahar,uçmak,koza,bahçe
Karınca|Çalışkan,Yuva,Minik|şeker,sıra,kraliçe,toprak,taşımak
Baykuş|Gece,Bilge,Büyük göz|ağaç,dal,kuş,orman,uğultu
Papağan|Renkli,Kafes,Tropik|kuş,taklit,tüy,korsan,gaga
Deve|Çöl,Kervan,Su deposu|kum,kervan,sarı,sıcak,yük
`],
['meslek', 'Meslekler', '👩‍⚕️', '#5aa2ff', '#19e3d0', `
Doktor|Beyaz önlük,Reçete,Muayene|hastane,stetoskop,hasta,ilaç,hemşire
Öğretmen|Tahta,Sınıf,Not|okul,müdür,ders,tebeşir,karne
Polis|Üniforma,Düdük,Karakol|kelepçe,suç,devriye,siren,hırsız
İtfaiyeci|Hortum,Merdiven,Kırmızı araç|yangın,su,kask,kurtarma,alarm
Aşçı|Mutfak,Bıçak,Önlük|yemek,tencere,lokanta,tarif,şef
Pilot|Kokpit,Uçuş,Kaptan|uçak,havalimanı,gökyüzü,üniforma,kanat
Berber|Makas,Tıraş,Ayna|saç,sakal,koltuk,ustura,fön
Terzi|İğne,Makas,Ölçü|kumaş,dikiş,iplik,elbise,makine
Fırıncı|Sabah erken,Un,Ekmek|simit,hamur,somun,sıcak,önlük
Kasap|Bıçak,Et,Önlük|kıyma,pirzola,dükkan,tezgah,kemik
Çiftçi|Tarla,Traktör,Hasat|buğday,toprak,köy,inek,tohum
Balıkçı|Tekne,Ağ,Sabah erken|olta,deniz,liman,martı,yem
Diş hekimi|Koltuk,Matkap,Ağız|dolgu,fırça,çürük,ağrı,beyaz
Hemşire|İğne,Hastane,Nöbet|serum,doktor,hasta,beyaz,ateş
Avukat|Mahkeme,Dava,Cübbe|hakim,savunma,kanun,müvekkil,adalet
Hakim|Tokmak,Karar,Mahkeme|cübbe,dava,kanun,ceza,adalet
Mühendis|Proje,Hesap,Baret|inşaat,plan,makine,köprü,bilgisayar
Mimar|Çizim,Bina,Maket|proje,plan,ev,cetvel,tasarım
Garson|Tepsi,Sipariş,Bahşiş|restoran,masa,menü,hesap,servis
Kuaför|Fön,Boya,Makas|saç,ayna,koltuk,şampuan,gelin
Postacı|Mektup,Çanta,Kapı|kargo,zarf,pul,adres,bisiklet
Şoför|Direksiyon,Yol,Ehliyet|otobüs,taksi,araba,trafik,korna
Ressam|Fırça,Tuval,Boya|tablo,palet,sergi,resim,atölye
Şarkıcı|Mikrofon,Sahne,Albüm|konser,ses,nota,hayran,müzik
Futbolcu|Forma,Krampon,Gol|top,saha,takım,maç,antrenör
Astronot|Roket,Kask,Yerçekimi|ay,yerçekimi,istasyon,yıldız,gezegen
Veteriner|Hayvan,Klinik,Aşı|kedi,köpek,hasta,çiftlik,iğne
Kasiyer|Market,Para üstü,Barkod|fiş,kasa,poşet,sıra,indirim
Gazeteci|Haber,Röportaj,Mikrofon|manşet,muhabir,kamera,yazı,gündem
`],
['ev', 'Ev Eşyaları', '🛋️', '#b98bff', '#ff3fa4', `
Koltuk|Oturmak,Salon,Yastık|kanepe,televizyon,minder,sehpa,rahat
Yatak|Uyku,Yorgan,Çarşaf|yastık,gece,oda,şilte,rüya
Yastık|Baş,Kılıf,Yumuşak|yatak,uyku,tüy,yorgan,gece
Yorgan|Kış,Sıcak,Nevresim|yatak,yastık,uyku,battaniye,pamuk
Halı|Desen,Zemin,Süpürge|kilim,salon,yün,toz,yumuşak
Perde|Pencere,Kumaş,Güneş|tül,korniş,oda,açmak,salon
Ayna|Yansıma,Duvar,Cam|banyo,makyaj,saç,gülümseme,kırık
Saat|Duvar,Akrep,Zaman|yelkovan,dakika,alarm,pil,tik tak
Lamba|Işık,Ampul,Düğme|abajur,gece,elektrik,oda,priz
Dolap|Kapak,Raf,Elbise|askı,çekmece,yatak odası,ahşap,ayna
Masa|Sandalye,Dört ayak,Yemek|tabak,örtü,ahşap,ders,oturmak
Sandalye|Oturmak,Arkalık,Masa|ayak,ahşap,minder,mutfak,sınıf
Buzdolabı|Soğuk,Mutfak,Kapak|süt,dondurucu,meyve,buz,magnet
Çamaşır makinesi|Deterjan,Banyo,Dönmek|kirli,sıkma,yıkamak,kıyafet,su
Bulaşık makinesi|Tabak,Mutfak,Deterjan|bardak,temiz,su,tuz,çatal
Süpürge|Toz,Halı,Gürültü|elektrik,temizlik,hortum,fırça,kablo
Ütü|Buhar,Kırışık,Gömlek|masa,sıcak,çamaşır,priz,düz
Televizyon|Kumanda,Kanal,Ekran|dizi,haber,koltuk,film,anten
Kumanda|Pil,Düğme,Koltuk|televizyon,kanal,ses,uzaktan,kayıp
Vazo|Çiçek,Cam,Sehpa|su,süs,porselen,kırılmak,masa
Kilit|Anahtar,Kapı,Güvenlik|şifre,açmak,demir,çilingir,kapamak
Anahtar|Kapı,Kilit,Cep|ev,araba,kayıp,açmak,halka
Kapı|Zil,Kol,Giriş|anahtar,kilit,eşik,menteşe,açmak
Pencere|Cam,Manzara,Perde|açmak,hava,balkon,pervaz,güneş
Merdiven|Basamak,Kat,Tırmanmak|asansör,yukarı,trabzan,apartman,inmek
Battaniye|Pike,Kış,Koltuk|yorgan,sıcak,örtü,yün,uyku
Sehpa|Salon,Koltuk önü,Çay bardağı|masa,dergi,vazo,fincan,ahşap
Klima|Serin,Uzaktan kumanda,Yaz|sıcak,soğuk,üfleme,duvar,filtre
Kalorifer|Petek,Kış,Sıcak|kombi,ısınmak,oda,radyatör,soba
`],
['mutfak', 'Mutfak', '🍳', '#ff6b6b', '#ffb627', `
Tencere|Kapak,Ocak,Yemek|tava,kepçe,çorba,düdüklü,pişirmek
Tava|Sap,Yağ,Ocak|yumurta,omlet,kızartma,teflon,tencere
Çaydanlık|Ocak,Buhar,Kahvaltı|çay,su,kaynamak,bardak,kahvaltı
Kepçe|Çorba,Tencere,Uzun sap|kaşık,servis,kase,yemek,çukur
Bıçak|Kesmek,Keskin,Sap|çatal,doğramak,tahta,ekmek,bileme
Çatal|Dişler,Masa,Kaşık yanı|bıçak,kaşık,makarna,tabak,yemek
Kaşık|Çorba,Tatlı,Yemek|çatal,bıçak,çay,şeker,kase
Tabak|Porselen,Servis,Yemek|çatal,masa,bulaşık,kırılmak,yuvarlak
Bardak|Cam,Su,İçmek|çay,kupa,tepsi,kırılmak,şeffaf
Fincan|Kahve,Tabak,Kulp|çay,porselen,fal,telve,ikram
Tepsi|Taşımak,Servis,Börek|çay,bardak,garson,metal,kenar
Fırın|Sıcak,Tepsi,Kek|pişirmek,ekmek,ızgara,kapak,derece
Ocak|Ateş,Tencere,Düğme|gaz,mutfak,çaydanlık,yemek,alev
Mikrodalga|Isıtmak,Hızlı,Dönen tabla|mutfak,fırın,düğme,patlamış mısır,elektrik
Tuzluk|Delikler,Masa,Biberlik|yemek,beyaz,cam,serpmek,sofra
Rende|Havuç,Peynir,Delikli|mutfak,salata,ince,kabak,keskin
Oklava|Yufka,Hamur,Uzun|börek,un,tahta,mantı,açmak
Cezve|Köpük,Ocak,Bakır|fincan,telve,bakır,kaynamak,şeker
Termos|Sıcak tutmak,Piknik,Çay|kahve,çorba,kapak,yolculuk,soğuk
Süzgeç|Makarna,Delikli,Su|lavabo,sebze,haşlama,çay,metal
Önlük|Mutfak,Leke,Bağcık|aşçı,yemek,cep,kumaş,temizlik
Mikser|Çırpmak,Kek,Elektrik|hamur,yumurta,krema,mutfak,dönmek
Blender|Smoothie,Bıçaklar,Elektrik|meyve,çorba,karıştırmak,süt,buz
Kesme tahtası|Bıçak,Doğramak,Ahşap|sebze,soğan,mutfak,et,tezgah
Sürahi|Su,Cam,Masa|bardak,limonata,doldurmak,soğuk,kulp
Kavanoz|Kapak,Reçel,Cam|turşu,bal,saklamak,kiler,raf
Kibrit|Çöp,Kutu,Ateş|ocak,mum,yakmak,kükürt,alev
Peçete|Kağıt,Ağız,Masa|silmek,yemek,beyaz,restoran,kutu
`],
['mekan', 'Mekânlar', '🏙️', '#19e3d0', '#5aa2ff', `
Hastane|Ambulans,Nöbet,Ameliyat|doktor,hemşire,yatak,acil,ilaç
Okul|Zil,Teneffüs,Sınıf|öğretmen,öğrenci,ders,kantin,bahçe
Market|Kasa,Reyon,Sepet|alışveriş,poşet,raf,indirim,kasiyer
Kütüphane|Sessizlik,Raf,Ödünç|kitap,okumak,masa,öğrenci,kart
Sinema|Patlamış mısır,Perde,Bilet|film,koltuk,karanlık,salon,fragman
Müze|Sergi,Tarih,Bilet|tablo,heykel,rehber,eski,cam vitrin
Park|Salıncak,Bank,Ağaç|kaydırak,çocuk,yürüyüş,çimen,güvercin
Restoran|Menü,Garson,Rezervasyon|masa,yemek,hesap,şef,tabak
Kafe|Kahve,Masa,Sohbet|tatlı,barista,çay,wifi,kurabiye
Banka|Para,Kasa,Sıra numarası|kredi,kart,hesap,veznedar,faiz
Eczane|İlaç,Reçete,Nöbetçi|vitamin,ağrı kesici,kasa,şurup,sağlık
Postane|Mektup,Kargo,Pul|zarf,paket,gişe,adres,sıra
Havalimanı|Uçak,Bagaj,Pasaport|uçuş,bilet,pist,kontrol,bekleme salonu
Otogar|Otobüs,Bilet,Peron|bavul,yolcu,muavin,şehirlerarası,bekleme
Stadyum|Tribün,Maç,Taraftar|futbol,gol,saha,bilet,skor
Hamam|Kese,Buhar,Köpük|köpük,sıcak,peştamal,buhar,tellak
Cami|Kubbe,Halı,Cuma|namaz,halı,şadırvan,cemaat,cuma
Otel|Resepsiyon,Oda anahtarı,Tatil|havuz,kahvaltı,yatak,bavul,rezervasyon
Pazar|Tezgah,File,Sebze|meyve,satıcı,kalabalık,ucuz,poşet
Lunapark|Eğlence,Bilet,Işıklar|eğlence,pamuk şeker,çocuk,ışık,kuyruk
Hayvanat bahçesi|Kafes,Ziyaretçi,Bakıcı|aslan,maymun,fil,zürafa,yem
Karakol|Polis,İfade,Şikayet|komiser,nezarethane,tutanak,suç,kelepçe
Spor salonu|Ağırlık,Koşu bandı,Antrenör|ter,kas,dambıl,soyunma odası,üyelik
Kuyumcu|Altın,Vitrin,Yüzük|bilezik,gümüş,pırlanta,kolye,takı
Benzinlik|Pompa,Depo,Akaryakıt|mazot,araç,kasa,yol,market
Tiyatro|Sahne,Perde,Alkış|oyuncu,kostüm,bilet,dram,salon
Çay bahçesi|Semaver,Tavla,Gölge|simit,sohbet,emekli,bardak,ağaç
Fabrika|Makine,İşçi,Vardiya|üretim,baca,bant,mesai,depo
Hapishane|Parmaklık,Gardiyan,Mahkum|hücre,ceza,koğuş,firar,duvar
`],
['ulasim', 'Ulaşım', '🚗', '#ff3b5c', '#ff8a00', `
Araba|Direksiyon,Benzin,Ehliyet|tekerlek,yol,trafik,park,korna
Otobüs|Durak,Şoför,Bilet|yolcu,koltuk,hat,muavin,sefer
Tren|Ray,İstasyon,Vagon|makinist,bilet,lokomotif,düdük,yolcu
Uçak|Kanat,Pilot,Bulut|havalimanı,bilet,kemer,yolculuk,pist
Gemi|Kaptan,Liman,Dalga|deniz,çapa,güverte,yolcu,kamara
Vapur|Martı,Simit,İskele|Boğaz,çay,deniz,yolcu,İstanbul
Bisiklet|Pedal,Zil,Kask|tekerlek,zincir,sele,park,yokuş
Motosiklet|Kask,Hız,İki teker|kurye,egzoz,gidon,benzin,deri ceket
Taksi|Sarı,Ücret,El kaldırmak|şoför,durak,gece,korna,adres
Metro|Yeraltı,Kart,Peron|istasyon,tünel,ray,kalabalık,turnike
Tramvay|Ray,Şehir içi,Zil|durak,kablo,yolcu,cadde,elektrik
Kamyon|Yük,Dorse,Uzun yol|şoför,tır,kasa,lastik,nakliyat
Ambulans|Siren,Acil,Sedye|hastane,doktor,kaza,hız,beyaz
Helikopter|Pervane,Gürültü,Havada asılı|pilot,kurtarma,havalanmak,çatı,gökyüzü
Roket|Uzay,Fırlatma,Yakıt|astronot,ay,geri sayım,ateş,hız
Kayık|Kürek,Göl,Ahşap|balıkçı,deniz,iskele,sandal,su
Yelkenli|Rüzgar,Direk,Deniz|tekne,halat,dalga,yarış,mavi
Paten|Tekerlek,Denge,Kaymak|buz,dizlik,kask,park,hız
Kaykay|Tahta,Tekerlek,Rampa|paten,park,genç,atlamak,denge
Teleferik|Kablo,Dağ,Kabin|kayak,manzara,yüksek,Uludağ,yolcu
Dolmuş|İnecek var,Hat,Şoför|minibüs,durak,para üstü,kalabalık,yolcu
Traktör|Tarla,Çiftçi,Römork|köy,tekerlek,toprak,saman,hasat
Denizaltı|Periskop,Derin,Sonar|torpido,kaptan,su altı,gizli,okyanus
Köprü|Boğaz,Geçiş,Halat|nehir,araba,ayak,trafik,İstanbul
Trafik ışığı|Kırmızı,Yeşil,Kavşak|sarı,yaya,dur,araba,polis
Karavan|Kamp,Ev gibi,Römork|tatil,yol,doğa,mutfak,yatak
Asansör|Düğme,Kat,Kabin|merdiven,bina,yukarı,aşağı,kapı
Feribot|Araba taşır,İskele,Deniz|gemi,yolcu,bilet,ada,liman
`],
['spor', 'Spor', '⚽', '#2bd96b', '#19e3d0', `
Futbol|Gol,Kaleci,Penaltı|top,saha,hakem,forma,derbi
Basketbol|Smaç,Üçlük,Uzun boy|top,parke,ribaund,turnike,uzun boy
Voleybol|File,Smaç,Pasör|top,sahil,blok,servis,manşet
Tenis|Raket,Kort,Servis|top,file,set,maç,sarı top
Masa tenisi|Raket,Küçük top,File|servis,smaç,turuncu top,hızlı,ping
Yüzme|Havuz,Kulaç,Bone|gözlük,deniz,dalış,mayo,serbest stil
Koşu|Ter,Bitiş çizgisi,Parkur|ayakkabı,hız,nefes,madalya,maraton
Boks|Eldiven,Ring,Nakavt|yumruk,hakem,raunt,kask,köşe
Güreş|Minder,Yağlı,Tuş|pehlivan,kispet,tuş,yaz,er
Kayak|Kar,Pist,Baton|dağ,teleferik,kış,eldiven,gözlük
Satranç|Tahta,Hamle,Strateji|piyon,at,kale,mat,hamle
Golf|Sopa,Delik,Çim|top,bayrak,saha,vuruş,sessizlik
Okçuluk|Yay,Hedef,Nişan|nişancı,on puan,olimpiyat,sadak,kiriş
Halter|Ağırlık,Kaldırmak,Kas|olimpiyat,bar,güç,disk,ter
Jimnastik|Esneklik,Takla,Denge aleti|minder,olimpiyat,kurdele,paralel,hareket
Karate|Kuşak,Tekme,Dojo|dövüş,beyaz,Japon,hamle,selam
Dalış|Tüp,Derinlik,Palet|mercan,deniz,maske,balık,oksijen
Sörf|Dalga,Tahta,Okyanus|plaj,rüzgar,denge,kumsal,yaz
Buz pateni|Kış,Pist,Piruet|dans,soğuk,bıçak,kostüm,zarif
Bowling|Ayakkabı,Pist,Devirmek|top,salon,pist,devirmek,skor
Bilardo|Yeşil masa,Delik,Tebeşir|top,tebeşir,salon,vuruş,çubuk
Hentbol|Kale,El,Atış|top,saha,kaleci,pas,takım
Dart|Hedef tahtası,Ok,İsabet|oyun,duvar,puan,bar,atmak
Paraşüt|Uçak,Atlama,Rüzgar|gökyüzü,iniş,kask,serbest düşüş,ip
Eskrim|Kılıç,Maske,Beyaz kıyafet|düello,hamle,olimpiyat,teke tek,metal
Binicilik|At,Engel,Eyer|nal,yarış,çizme,ahır,atlama
Dağcılık|Zirve,Halat,Kamp|tırmanış,kar,çadır,oksijen,Everest
Kano|Kürek,Nehir,Dar tekne|su,yarış,denge,akıntı,can yeleği
`],
['doga', 'Doğa & Hava', '🌦️', '#5aa2ff', '#2bd96b', `
Güneş|Sıcak,Sabah,Sarı|ışık,yaz,gökyüzü,doğmak,gözlük
Ay|Gece,Evre,Gökyüzü|kurt,dolunay,uzay,ışık,yıldız
Yıldız|Gece,Parıltı,Gökyüzü|ay,dilek,kayan,uzay,ışık
Bulut|Gri,Yağmur öncesi,Pamuk gibi|gökyüzü,gölge,beyaz,rüzgar,şimşek
Yağmur|Şemsiye,Islak,Damla|bulut,çizme,su birikintisi,gök gürültüsü,sonbahar
Kar|Kış,Beyaz,Soğuk|kızak,eldiven,buz,tipi,ayaz
Rüzgar|Esinti,Uçurtma,Yel değirmeni|fırtına,hava,yaprak,serin,saç
Gökkuşağı|Renkler,Yağmur sonrası,Yay|yedi renk,güneş,gökyüzü,masal,ışık
Şimşek|Fırtına,Işık,Gök gürültüsü|yıldırım,bulut,yağmur,elektrik,gece
Deniz|Dalga,Tuzlu,Mavi|kumsal,gemi,balık,yüzmek,ufuk
Göl|Durgun,Ördek,Kıyı|su,sazlık,kayık,balık,sakin
Nehir|Akıntı,Köprü,Kıyı|su,balık,kayık,dere,şelale
Dağ|Zirve,Kar,Tırmanış|tepe,kaya,yüksek,orman,vadi
Orman|Ağaçlar,Yeşil,Kamp|kuş,yaprak,mantar,patika,ayı
Ağaç|Yaprak,Gövde,Kök|dal,orman,gölge,meyve,oduncu
Çiçek|Bahçe,Koku,Arı|gül,papatya,vazo,bahar,yaprak
Gül|Diken,Kırmızı,Sevgililer|çiçek,koku,bahçe,yaprak,buket
Papatya|Beyaz,Seviyor sevmiyor,Çayır|çiçek,sarı,bahar,yaprak,çay
Volkan|Lav,Patlama,Kül|dağ,ateş,krater,duman,sıcak
Deprem|Sarsıntı,Fay,Çanta|bina,korku,şiddet,ölçek,artçı
Çöl|Kum,Kaktüs,Sıcak|deve,vaha,serap,susuzluk,güneş
Ada|Deniz,Etrafı su,Vapur|plaj,tekne,iskele,yaz,palmiye
Şelale|Yükseklik,Su sesi,Kaya|nehir,orman,akıntı,doğa,serin
Mağara|Karanlık,Yarasa,Sarkıt|kaya,dağ,yankı,taş,keşif
Kum|Plaj,Sıcak,Kale|deniz,çöl,tane,saat,kova
Toprak|Kahverengi,Bahçe,Solucan|tohum,çiçek,çamur,tarla,saksı
Sis|Görüş,Sabah,Gri|bulut,nem,far,deniz,puslu
Fırtına|Rüzgar,Dalga,Gök gürültüsü|yağmur,şimşek,deniz,kasırga,karanlık
Yaprak|Sonbahar,Yeşil,Ağaç|dal,rüzgar,sarı,kuru,hışırtı
`],
['giyim', 'Giyim & Aksesuar', '👕', '#ff3fa4', '#b98bff', `
Tişört|Kısa kollu,Yaz,Pamuk|baskı,beden,kot,dolap,renk
Gömlek|Düğme,Yaka,Ütü|kravat,ofis,kol,takım elbise,beyaz
Pantolon|Kemer,Paça,Cep|kot,bacak,ütü,beden,fermuar
Kot|Mavi,Kumaş,Yırtık moda|pantolon,ceket,cep,denim,dikiş
Etek|Pileli,Kısa,Uzun|elbise,bluz,mini,beden,bel
Elbise|Düğün,Uzun,Askı|abiye,etek,kumaş,davet,şık
Mont|Kış,Fermuar,Kapüşon|ceket,sıcak,kaban,yağmur,kaz tüyü
Kazak|Yün,Örgü,Kış|hırka,boğazlı,sıcak,şiş,kaşıntı
Ayakkabı|Bağcık,Numara,Topuk|çorap,terlik,çizme,yürümek,boya
Terlik|Ev,Banyo,Parmak arası|ayak,yaz,plaj,rahat,kapı önü
Çorap|Ayak,Çift,Delik|ayakkabı,yün,kışlık,renkli,çamaşır
Şapka|Güneş,Kafa,Siperlik|kep,yaz,hasır,bere,plaj
Bere|Kış,Yün,Kulak|atkı,eldiven,kafa,ponpon,soğuk
Atkı|Boyun,Kış,Örgü|bere,eldiven,yün,takım renkleri,rüzgar
Eldiven|Parmak,Kış,El|bere,atkı,yün,deri,kar
Kemer|Toka,Pantolon,Deri|delik,bel,kot,siyah,emniyet
Kravat|Düğüm,Gömlek,Takım|boyun,ofis,çizgili,düğün,yaka
Gözlük|Cam,Çerçeve,Görmek|lens,miyop,güneş,burun,okumak
Çanta|Sırt,Fermuar,Askı|cüzdan,okul,omuz,deri,el
Cüzdan|Para,Kart,Cep|kimlik,deri,çanta,fiş,bozuk para
Yüzük|Parmak,Nişan,Altın|alyans,taş,evlilik,kuyumcu,gümüş
Kolye|Boyun,Zincir,Takı|altın,inci,madalyon,gümüş,hediye
Küpe|Kulak,Delik,Takı|altın,halka,gümüş,çift,inci
Pijama|Gece,Uyku,Rahat|yatak,takım,pazar,ev,yumuşak
Mayo|Plaj,Havuz,Islak|bikini,deniz,yüzme,güneş,yaz
Şort|Yaz,Kısa,Bacak|yazlık,plaj,spor,sıcak,terlik
Yelek|Kolsuz,Düğme,Takım|ceket,gömlek,kazak,şık,örgü
Ceket|Yaka,Düğme,İş|takım,gömlek,omuz,cep,blazer
Çizme|Yağmur,Diz boyu,Kış|ayakkabı,çamur,deri,kar,bot
`],
['okul', 'Okul & Ofis', '✏️', '#ffe14a', '#ff8a00', `
Kalem|Yazmak,Uç,Kağıt|silgi,defter,kurşun,mürekkep,tükenmez
Silgi|Hata,Pembe,Kırıntı|defter,kurşun,yanlış,temizlemek,okul
Defter|Sayfa,Çizgili,Not|kalem,ders,ödev,kapak,okul
Kitap|Sayfa,Kapak,Yazar|okumak,kütüphane,roman,hikaye,raf
Cetvel|Ölçmek,Düz çizgi,Santim|kalem,geometri,plastik,uzunluk,çizim
Makas|Kesmek,Kağıt,Sivri|iki ağız,kuaför,kumaş,el işi,terzi
Yapıştırıcı|El işi,Kuruma,Tüp|kağıt,kolaj,etiket,sıvı,stick
Tahta|Tebeşir,Sınıf,Silmek|öğretmen,yazı,kalem,yeşil,ders
Tebeşir|Tahta,Beyaz,Toz|öğretmen,yazı,silgi,sınıf,kırılmak
Kalemtıraş|Uç,Talaş,Açmak|kurşun,çöp,metal,keskin,küçük
Sıra|Oturmak,Sınıf,Arkadaş|okul,masa,tahta,öğrenci,ders
Karne|Not,Yaz tatili,Takdir|okul,dönem,teşekkür,veli,öğretmen
Sınav|Soru,Kopya,Puan|test,ders çalışmak,heyecan,öğretmen,sonuç
Ödev|Ev,Teslim,Öğretmen|defter,ders,proje,akşam,kitap
Teneffüs|Zil,Bahçe,Kısa ara|okul,oyun,kantin,öğrenci,eğlence
Kantin|Tost,Teneffüs,Kuyruk|okul,ayran,simit,öğrenci,para
Harita|Ülke,Yön,Atlas|dünya,kıta,ölçek,pusula,coğrafya
Küre|Dünya,Dönmek,Sınıf|harita,kıta,okyanus,coğrafya,yuvarlak
Hesap makinesi|Sayılar,Tuşlar,Matematik|toplama,çarpma,pil,ekran,öğrenci
Zımba|Kağıt,Tel,Ofis|delgeç,dosya,bastırmak,metal,masa
Dosya|Klasör,Evrak,Ofis|kağıt,belge,raf,arşiv,bilgisayar
Toplantı|Masa,Patron,Sunum|ofis,saat,konuşma,proje,kahve
Yazıcı|Kağıt,Mürekkep,Ofis|kartuş,çıktı,bilgisayar,fotokopi,tarayıcı
Mezuniyet|Kep,Diploma,Tören|okul,üniversite,cübbe,fotoğraf,sevinç
Ajanda|Takvim,Not,Randevu|tarih,kalem,toplantı,plan,gün
Mikroskop|Laboratuvar,Hücre,Büyütmek|bilim,cam,mercek,deney,biyoloji
Pergel|Daire,Sivri uç,Geometri|cetvel,ölçü,kalem,çizim,matematik
Boya kalemi|Renkler,Resim dersi,Kutu|resim,çizim,çocuk,kağıt,renkli
`],
['teknoloji', 'Teknoloji', '💻', '#19e3d0', '#b98bff', `
Telefon|Arama,Şarj,Ekran|mesaj,uygulama,kulaklık,kamera,numara
Bilgisayar|Klavye,Fare,Ekran|internet,oyun,kasa,program,masaüstü
Tablet|Dokunmatik,Ekran,Büyük|uygulama,şarj,oyun,kalem,çizim
Kulaklık|Müzik,Kablo,Ses|telefon,şarkı,bluetooth,mikrofon,gürültü
Şarj aleti|Kablo,Priz,Batarya|telefon,pil,adaptör,elektrik,yüzde
Klavye|Tuşlar,Yazmak,Harfler|bilgisayar,fare,ekran,mesaj,tıkırtı
Fare|Tıklamak,İmleç,Tekerlek|bilgisayar,klavye,kablosuz,ekran,altlık
İnternet|Wifi,Modem,Bağlantı|site,arama,hız,kablo,çevrimiçi
Kamera|Fotoğraf,Lens,Kayıt|video,çekim,tripod,flaş,anı
Drone|Pervane,Havadan çekim,Kumanda|kamera,uçmak,pil,gökyüzü,video
Robot|Metal,Yapay zeka,Makine|bilim kurgu,kol,programlamak,film,pil
Oyun konsolu|Joystick,Televizyon,Disk|kumanda,ekran,eğlence,yarış,arkadaş
Akıllı saat|Bilek,Adım,Bildirim|nabız,şarj,telefon,spor,ekran
E-posta|Adres,Ek dosya,Konu|mesaj,konu,spam,gönder,şifre
Mesaj|Telefon,Yazmak,Bildirim|emoji,sohbet,cevap,grup,okundu
Uygulama|Telefon,İndirmek,Simge|mağaza,güncelleme,oyun,ekran,bildirim
Sosyal medya|Beğeni,Takipçi,Paylaşım|fotoğraf,yorum,hikaye,profil,video
Şifre|Gizli,Hesap,Giriş|kullanıcı adı,güvenlik,karakter,unutmak,kilit
Uydu|Uzay,Yörünge,Çanak|anten,televizyon,sinyal,dünya,konum
Hoparlör|Ses,Bas,Müzik|kablo,parti,bluetooth,yüksek,amfi
Mikrofon|Ses,Sahne,Konuşmak|şarkıcı,kayıt,kablo,karaoke,sunucu
Ampul|Işık,Fikir,Tavan|lamba,elektrik,duy,yanmak,tavan
Pil|Enerji,Kumanda,Şarj|artı eksi,oyuncak,saat,elektrik,değiştirmek
USB bellek|Takmak,Dosya,Küçük|bilgisayar,veri,yedek,kapasite,flash
Navigasyon|Harita,Yol tarifi,Uydu|araba,sesli,yön,trafik,adres
Emoji|Gülen yüz,Mesaj,Kalp|telefon,ifade,sarı,çıkartma,mutlu
Kod|Yazılım,Bilgisayar,Hata|programcı,satır,algoritma,ekran,uygulama
Video|Kamera,İzlemek,Kayıt|film,süre,izlenme,çekim,montaj
`],
['muzik', 'Müzik & Aletler', '🎸', '#ff3fa4', '#ffe14a', `
Gitar|Tel,Akor,Kamp ateşi|şarkı,akustik,elektro,kamp ateşi,sap
Piyano|Tuşlar,Siyah beyaz,Pedal|nota,konser,klasik,org,kuyruklu
Davul|Baget,Ritim,Gürültü|zurna,ramazan,bateri,tokmak,düğün
Bağlama|Türkü,Tel,Halk müziği|mızrap,tezene,perde,Anadolu,ozan
Keman|Yay,Çene,Tel|orkestra,klasik,nota,senfoni,ince ses
Flüt|Nefes,Delikler,İnce ses|nota,okul,üflemek,orkestra,metal
Ney|Nefes,Kamış,Hüzün|tasavvuf,üflemek,hüzün,sema,ince
Zurna|Davul,Düğün,Tiz ses|halay,üflemek,köy,şenlik,horon
Darbuka|Ritim,Göbek,Elle çalmak|def,oryantal,deri,düğün,davul
Ud|Armut gövde,Mızrap,Tel|klasik,fasıl,Ortadoğu,akor,şarkı
Akordeon|Tuşlar,Sokak müzisyeni,Omuz|melodi,omuz,polka,çekmek,ses
Trompet|Pirinç,Üflemek,Caz|orkestra,bando,nota,parlak,boru
Saksafon|Caz,Üflemek,Kıvrık|nota,bar,gece,sarı,romantik
Bateri|Baget,Zil,Rock|davul,ritim,pedal,gürültü,grup
Arp|Teller,Melek,Büyük çerçeve|klasik,çalmak,parmak,orkestra,altın
Tef|Zilli,Elle vurmak,Halka|ritim,şarkı,dans,düğün,sallamak
Konser|Sahne,Bilet,Kalabalık|şarkıcı,ışık,alkış,müzik,hayran
Nota|Müzik,Kağıt,Okumak|müzik,şarkı,piyano,okumak,melodi
Karaoke|Mikrofon,Şarkı sözü,Ekran|eğlence,sahne,parti,bar,ses
Orkestra|Şef,Senfoni,Keman|konser,nota,salon,müzisyen,alkış
Plak|Siyah,Eski,Dönmek|müzik,iğne,albüm,dönmek,koleksiyon
Radyo|Frekans,Spiker,Anten|şarkı,haber,araba,kanal,dinlemek
Şarkı|Söz,Melodi,Nakarat|müzik,ses,albüm,radyo,dinlemek
Dans|Ritim,Adım,Pist|müzik,salsa,tango,parti,halay
Halay|Mendil,Düğün,El ele|davul,zurna,dans,halka,omuz
Klip|Video,Şarkı,Çekim|müzik,şarkıcı,dans,televizyon,izlenme
Kemençe|Yay,Yayla,Çalgı|tulum,yayla,çalgı,ince ses,Trabzon
Sahne|Perde,Işıklar,Alkış|konser,tiyatro,oyuncu,mikrofon,seyirci
`],
['vucut', 'Vücut', '💪', '#ff8a00', '#ff6b6b', `
Göz|Kirpik,Bakmak,Kaş|ağlamak,bakış,lens,renk,uyku
Kulak|Duymak,Küpe,Ses|işitmek,müzik,fısıltı,iki tane,kepçe
Burun|Koku,Hapşırmak,Nefes|mendil,yüz,gözlük,soğuk algınlığı,delik
Ağız|Dudak,Dil,Konuşmak|diş,yemek,gülümseme,öpücük,yüz
Diş|Fırça,Beyaz,Çiğnemek|macun,çürük,gülümseme,ağız,süt
Dil|Tat,Ağız,Konuşmak|lezzet,acı,uzatmak,pembe,tükürük
Saç|Tarak,Kuaför,Uzun|şampuan,örgü,fön,kel,kepek
Sakal|Tıraş,Yüz,Berber|bıyık,jilet,kıl,erkek,uzatmak
El|Parmak,Avuç,Tutmak|tırnak,sağ,sol,alkış,tokalaşma
Ayak|Topuk,Parmak,Yürümek|çorap,koşmak,terlik,bilek,taban
Kalp|Atış,Sevgi,Nabız|aşk,kırmızı,göğüs,kan,doktor
Beyin|Düşünmek,Kafatası,Zeka|akıl,hafıza,sinir,fikir,kafa
Mide|Açlık,Yemek,Gurultu|karın,sindirim,ağrı,doymak,yemek borusu
Diz|Bacak,Bükmek,Kapak|ağrı,çökmek,yara,koşu,eklem
Omuz|Kol,Çanta,Silkmek|boyun,sırt,ağrı,masaj,taşımak
Parmak|El,Tırnak,Yüzük|beş,işaret,baş,ayak,saymak
Tırnak|Makas,Oje,Uzamak|parmak,el,manikür,kesmek,yemek
Yanak|Allık,Gamze,Yüz|öpücük,pembe,kızarmak,gülümseme,makyaj
Bıyık|Dudak üstü,Kıl,Berber|sakal,erkek,tıraş,burma,yüz
Kemik|İskelet,Kalsiyum,Kırık|köpek,röntgen,süt,kol,sert
Kan|Kırmızı,Damar,Bağış|yara,kalp,hastane,hücre,doktor
Kas|Güç,Spor salonu,Pazı|kol,ağırlık,protein,kramp,antrenman
Boyun|Baş,Atkı,Kolye|omuz,kravat,ağrı,zürafa,dönmek
Göbek|Karın,Bebek,Dans|delik,kemer,orta,oryantal,yağ
Sırt|Çanta,Omurga,Masaj|bel,omuz,ağrı,arka,kambur
Yüz|Göz,Burun,Ayna|makyaj,gülümseme,yanak,ifade,tıraş
Dudak|Ruj,Öpücük,Ağız|gülümseme,yanak,dil,kırmızı,konuşmak
Bilek|Saat,El,Burkulmak|kol,nabız,ağrı,eklem,ince
`],
['bayram', 'Bayram & Gelenek', '🎉', '#ffe14a', '#ff3fa4', `
Şeker Bayramı|El öpmek,Harçlık,Akraba ziyareti|lokum,ramazan,çikolata,üç gün,yeni kıyafet
Kurban Bayramı|Koç,Et paylaşmak,Dört gün|hayvan,kasap,mangal,dua,akraba
Düğün|Gelin,Damat,Halay|nikah,takı,salon,davetli,pasta
Nişan|Yüzük,Kurdele,Söz|kız isteme,aile,tepsi,kahve,çift
Kına gecesi|Türkü,Gelin,Hüzün|hüzün,tepsi,mum,eğlence,el
Sünnet|Davul,Çocuk,Hediye|çocuk,mevlit,düğün,şölen,hediye
Doğum günü|Pasta,Mum,Hediye|parti,balon,şarkı,yaş,sürpriz
Yılbaşı|Çam ağacı,Geri sayım,Hediye|kutlama,Noel Baba,havai fişek,piyango,aralık
Kız isteme|Çiçek,Çikolata,Aile|aile,damat adayı,söz,tepsi,heyecan
Nazar boncuğu|Mavi,Göz,Kötülük|uğur,kapı,muska,cam,şans
Hıdırellez|Dilek,Gül ağacı,Bahar|mayıs,ateş,atlamak,kağıt,şenlik
Nevruz|Bahar,Ateş,Atlamak|mart,yeşil,yumurta,şenlik,yeni gün
İftar|Ramazan,Akşam,Top atışı|oruç,hurma,pide,sofra,ezan
Sahur|Gece,Davulcu,Oruç|ramazan,yemek,uyanmak,imsak,su
Bayramlık|Yeni kıyafet,Yastık başı,Ayakkabı|elbise,çocuk,mağaza,sevinç,şeker
Asker uğurlama|Davul,Bayrak,Konvoy|veda,korna,aile,dua,mendil
Mangal|Kömür,Piknik,Pazar|et,köfte,ateş,yelpaze,bahçe
Piknik|Örtü,Sepet,Çimen|mangal,park,orman,termos,hafta sonu
Kahve falı|Fincan,Telve,Gelecek|falcı,şekil,yol,kısmet,tabak
Ramazan|Oruç,İftar,Pide|sahur,davulcu,on bir ay,hurma,teravih
Bayrak|Ay yıldız,Kırmızı,Direk|rüzgar,gönder,millî,stadyum,tören
Cumhuriyet Bayramı|Fener alayı,Tören,Marş|Atatürk,okul,marş,kutlama,gurur
23 Nisan|Çocuklar,Tören,Gösteri|bayram,okul,şiir,bayrak,egemenlik
Anneler Günü|Çiçek,Hediye,Mayıs|kart,kahvaltı,sevgi,sarılmak,teşekkür
Sevgililer Günü|Kalp,Gül,Akşam yemeği|aşk,çikolata,hediye,kırmızı,akşam yemeği
Hediye|Paket,Kurdele,Sürpriz|doğum günü,kutu,kart,teşekkür,mutluluk
Havai fişek|Gökyüzü,Patlama,Renkler|yılbaşı,gece,kutlama,ışık,gürültü
Balon|Şişirmek,Parti,Patlamak|doğum günü,renkli,ip,hava,uçmak
`],
['unlu', 'Ünlü Yerler', '🗺️', '#5aa2ff', '#ff3fa4', `
Galata Kulesi|İstanbul,Martı,Seyir terası|Beyoğlu,taş,manzara,Karaköy,Hezarfen
Kız Kulesi|Boğaz,Üsküdar,Efsane|deniz,kayık,ışık,İstanbul,yılan
Ayasofya|Kubbe,Sultanahmet,Bizans|müze,cami,mozaik,minare,tarih
Kapadokya|Balon,Mağara,Kaya|mağara,Ürgüp,at,kaya,gün doğumu
Pamukkale|Beyaz,Termal,Antik|termal,havuz,kireç,antik,turist
Efes|Antik kent,Kütüphane,İzmir|tiyatro,sütun,tarih,Selçuk,turist
Anıtkabir|Ankara,Tören,Saygı|Atatürk,saygı,mozole,ziyaret,asker
Truva|Antik,Destan,Savaş|antik,savaş,Homeros,film,kent
Nemrut Dağı|Dev heykeller,Gün doğumu,Zirve|baş,zirve,kral,taş,tarih
Sümela Manastırı|Trabzon,Kayalık,Orman|Maçka,dağ,tarih,sis,fresk
Eyfel Kulesi|Demir,Işıklar,Avrupa|Fransa,turist,yüksek,romantik,fotoğraf
Piramitler|Çöl,Taş,Antik|mumya,taş,sfenks,üçgen,deve
Çin Seddi|Uzun duvar,Asya,Taş|Pekin,tarih,gözetleme,dağ,turist
Özgürlük Heykeli|Meşale,Yeşil,Liman|Amerika,ada,taç,turist,liman
Pisa Kulesi|İtalya,Fotoğraf pozu,Beyaz|turist,beyaz,yamuk,çan,itmek
Kolezyum|Antik,Arena,Aslan|İtalya,antik,aslan,taş,turist
Big Ben|Saat,Çan,Avrupa|İngiltere,kule,parlamento,turist,zaman
Tac Mahal|Hindistan,Beyaz mermer,Aşk|kubbe,saray,türbe,turist,havuz
Venedik|Gondol,Kanallar,İtalya|köprü,karnaval,maske,tekne,su
İstanbul|Boğaz,Vapur,Martı|köprü,simit,Galata,kalabalık,trafik
Ankara|Başkent,Anıtkabir,Kızılay|meclis,devlet,memur,Kocatepe,üniversite
İzmir|Kordon,Saat Kulesi,Ege|boyoz,gevrek,deniz,körfez,Konak
Trabzon|Karadeniz,Yayla,Çay|yayla,kemençe,çay,yağmur,horon
Antalya|Tatil,Plaj,Turizm|otel,güneş,deniz,Kaleiçi,yaz
Kapalıçarşı|İstanbul,Dükkanlar,Kuyumcu|halı,turist,pazarlık,kemer,tarihi
Dolmabahçe Sarayı|Boğaz,Saat,Avize|padişah,Atatürk,müze,bahçe,kristal
Paris|Moda,Romantik,Sanat|kruvasan,moda,müze,sanat,bere
Londra|Kraliyet,Yağmur,Kırmızı otobüs|İngiltere,çay saati,metro,sis,saray
Uludağ|Kayak,Kar,Teleferik|kar,otel,kış,zirve,mangal
`],
['oyun', 'Oyuncak & Oyun', '🧸', '#b98bff', '#19e3d0', `
Top|Yuvarlak,Tekme,Zıplamak|futbol,park,çocuk,oyun,kale
Bebek|Oyuncak,Saç,Elbise|biberon,tarak,oyun evi,kıyafet,uyku
Oyuncak ayı|Pelüş,Yumuşak,Sarılmak|uyku,yatak,çocuk,kahverengi,hediye
Yapboz|Parçalar,Resim,Sabır|köşe,kenar,masa,bin parça,çerçeve
Uçurtma|İp,Rüzgar,Gökyüzü|kuyruk,bahar,kağıt,koşmak,çıta
Salıncak|Park,Zincir,İleri geri|çocuk,kaydırak,bahçe,itmek,oturak
Kaydırak|Park,Merdiven,Kaymak|çocuk,salıncak,havuz,su parkı,inmek
Saklambaç|Ebe,Gizlenmek,Saymak|saymak,çocuk,oyun,arama,kapı arkası
Körebe|Ebe,El yordamı,Mendil|çocuk,yakalamak,oyun,mendil,kahkaha
Yakan top|İki takım,Vurulmak,Kaçmak|okul bahçesi,çocuk,ortada,can,teneffüs
İp atlama|Zıplamak,Tekerleme,Çevirmek|çocuk,teneffüs,saymak,bahçe,ritim
Seksek|Tebeşir,Kareler,Tek ayak|taş,zıplamak,kaldırım,çocuk,numara
Misket|Cam,Renkli,Toprak|çocuk,çukur,nişan,torba,yuvarlak
Tavla|Zar,Pul,Kahvehane|şeşbeş,kahvehane,tahta,düşeş,çay
Okey|Taş,Istaka,Dört kişi|gösterge,çifte,kahvehane,masa,joker
Domino|Taşlar,Noktalar,Devrilme|sıra,oyun,masa,siyah beyaz,zincir
İskambil|Kupa,Maça,Deste|joker,papaz,kız,karıştırmak,masa
Zar|Altı yüz,Atmak,Şans|tavla,nokta,küp,çift,kutu oyunu
Yo-yo|İp,Aşağı yukarı,Plastik|oyuncak,çocuk,hüner,parmak,dönmek
Topaç|Dönmek,Çevirmek,İp|oyuncak,denge,yere atmak,hız,çocuk
Oyuncak araba|Tekerlek,Pil,Yarış|çocuk,kumanda,pist,hız,koleksiyon
Oyun hamuru|Şekil vermek,Renkli,Yoğurmak|çocuk,kalıp,yumuşak,el,heykel
Tombala|Numara,Kartlar,Torba|yılbaşı,çinko,şans,aile,kese
Bilmece|Soru,Cevap,Akıl|tahmin,bulmaca,çocuk,zeka,eğlence
Bulmaca|Kare,Kelime,Gazete|kalem,çözmek,soru,harf,boşluk
Kukla|İp,Sahne,Perde|tiyatro,el,çocuk,oyuncu,hikaye
Karagöz|Perde,Deri tasvir,Bursa|Hacivat,ışık,Bursa,hikaye,şaka
Çember|Bel,Döndürmek,Plastik halka|spor,dans,kalça,denge,renkli
Su tabancası|Yaz,Islanmak,Tetik|oyuncak,çocuk,bahçe,şaka,plastik
`],
['tatil', 'Tatil & Plaj', '🏖️', '#19e3d0', '#ffe14a', `
Plaj|Kum,Şezlong,Dalga|havlu,güneş kremi,deniz,şemsiye,yaz
Şezlong|Uzanmak,Havuz kenarı,Güneş|plaj,şemsiye,havlu,kitap,dinlenmek
Güneş kremi|Koruma,Faktör,Losyon|plaj,yanmak,cilt,şişe,yaz
Havlu|Kurulanmak,Banyo,Pamuklu|plaj,el,yüz,ıslak,bornoz
Kova|Kum,Kürek,Çocuk|plaj,su,sap,plastik,doldurmak
Kumdan kale|Kova,Kule,Dalga|plaj,çocuk,kürek,inşa,hendek
Bavul|Tekerlek,Bagaj,Hazırlamak|kıyafet,yolculuk,kilit,etiket,havalimanı
Pasaport|Yurt dışı,Vize,Gümrük|kimlik,havalimanı,mühür,fotoğraf,bordo
Kamp|Çadır,Ateş,Uyku tulumu|orman,fener,doğa,yıldızlar,çakı
Çadır|Kazık,Kamp,Uyku tulumu|orman,fermuar,yağmur,doğa,fener
Havuz|Mayo,Dalış,Klor|yüzmek,su,otel,cankurtaran,şezlong
Cankurtaran|Düdük,Kırmızı şort,Yüzme|plaj,havuz,dalga,nöbet,koşmak
Şişme yatak|Pompa,Havuz,Yüzmek|deniz,plastik,uzanmak,hava,renkli
Deniz kabuğu|Sahil,Spiral,Kulağa dayamak|kum,midye,koleksiyon,inci,dalga
Fotoğraf|Poz,Çekmek,Hatıra|kamera,albüm,selfie,gülümse,çerçeve
Kartpostal|Pul,Manzara,Göndermek|mektup,tatil,posta,hatıra,yazı
Magnet|Buzdolabı,Hatıra,Turist|şehir,yapışmak,koleksiyon,süs,hediye
Tekne turu|Koy,Mavi,Yüzme molası|deniz,kaptan,ada,mayo,öğle yemeği
Şnorkel|Maske,Balıklar,Su altı|deniz,yüzgeç,mercan,su altı,dalış
Tatil köyü|Her şey dahil,Animatör,Havuz|otel,plaj,açık büfe,yaz,eğlence
Açık büfe|Tabak,Sıra,Sınırsız|kahvaltı,otel,tatlı,salata,doymak
Yazlık|Site,Balkon,Bahçe|tatil,deniz,komşu,mangal,sivrisinek
Sivrisinek|Vızıltı,Kaşıntı,Yaz gecesi|ısırık,sprey,cibinlik,kan,kulak
Dalga|Köpük,Sörf,Kıyı|deniz,okyanus,rüzgar,kum,ses
Martı|Simit,Kanat,Vapur|kuş,deniz,çığlık,iskele,beyaz
Midye|Limon,Kabuk,Dolma|sokak,deniz,pilav,tava,siyah
Jet ski|Hız,Deniz,Motor|dalga,gürültü,kiralık,can yeleği,turist
Bornoz|Banyo,Kemer,Kapüşon|havlu,otel,duş,yumuşak,beyaz
`]
];

/* =========================================================================
   KELİME modu — "Sahtekâr kim?" kelime oyunu
   Herkes aynı gizli kelimeyi görür; sahtekâr(lar) yalnızca bir ipucu alır.
   ========================================================================= */
const { dat, acc } = MEK.h;
const WORDS = [], CAT = [], CAT_BY = {};
CATS.forEach(([id, name, emo, c1, c2, txt], ci) => {
  const c = { id, name, emo, c1, c2, words: [] };
  CAT.push(c); CAT_BY[id] = ci;
  txt.trim().split('\n').forEach(line => {
    const [w, h, r] = line.split('|');
    c.words.push(WORDS.length);
    WORDS.push({ w: w.trim(), c: ci, h: h.split(',').map(s => s.trim()), r: r.split(',').map(s => s.trim()) });
  });
});
const GROUPS = [
  ['yemek', 'Yemek & Mutfak', ['yiyecek', 'meyve', 'mutfak']],
  ['doga', 'Hayvanlar & Doğa', ['hayvan', 'doga']],
  ['ev', 'Ev & Günlük Hayat', ['ev', 'giyim', 'okul', 'teknoloji']],
  ['yer', 'Yerler & Seyahat', ['mekan', 'unlu', 'ulasim', 'tatil']],
  ['eglence', 'Eğlence & Spor', ['spor', 'muzik', 'oyun']],
  ['insan', 'İnsan & Gelenek', ['meslek', 'vucut', 'bayram']]
];
function poolFor(opt) {
  const s = String(opt || 'all');
  let ids = null;
  if (s.startsWith('g:')) { const g = GROUPS.find(x => x[0] === s.slice(2)); if (g) ids = g[2]; }
  else if (s.startsWith('c:') && CAT_BY[s.slice(2)] != null) ids = [s.slice(2)];
  if (!ids) return WORDS.map((_, i) => i);
  return ids.flatMap(id => CAT[CAT_BY[id]].words);
}

/* ---------- Türkçe katlama, sızıntı ve tahmin eşleştirme ---------- */
const FOLD = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
const fold = s => String(s || '').toLocaleLowerCase('tr-TR').replace(/[çğıöşüâîû]/g, c => FOLD[c])
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
// metin, kelimenin kendisini ya da kökünü (ilk 4 harf; kısa kelimede kelimenin kendisi) içeriyor mu?
function leaks(word, text) {
  const T = fold(text).split(' ').filter(Boolean);
  for (const w of fold(word).split(' ')) {
    if (!w || /^\d+$/.test(w)) continue;
    if (w.length >= 4) { const st = w.slice(0, 4); if (T.some(t => t.includes(st))) return true; }
    else if (w.length >= 2 && T.some(t => t.startsWith(w))) return true;
  }
  return false;
}
function lev(a, b) {
  const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
function guessMatches(word, tx) {
  const a = fold(word).replace(/ /g, ''), b = fold(tx).replace(/ /g, '');
  if (!b) return false;
  if (a === b) return true;
  return a.length >= 5 && lev(a, b) <= 1;
}
const cap = s => { const t = String(s || ''); return t ? t[0].toLocaleUpperCase('tr-TR') + t.slice(1) : t; };
function cleanClue(s) {
  const t = String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
  if (!/[A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû0-9]/.test(t) || t.split(' ').length > 3) return '';
  return t;
}
const cleanChat = s => String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);

/* ---------- tekrar etmeyen kelime geçmişi (yöneten cihazda) ---------- */
const HKEY = 'cs.kelime.gecmis';
function histLoad() { try { const a = JSON.parse(localStorage.getItem(HKEY) || '[]'); return Array.isArray(a) ? a.filter(x => typeof x === 'string') : []; } catch { return []; } }
function histSave(a) { try { localStorage.setItem(HKEY, JSON.stringify(a.slice(-900))); } catch { /* depolama kapalı */ } }
function pickWord(st) {
  const pool = st.pool, used = new Set(st.usedW);
  let hist = histLoad(); const H = new Set(hist);
  let free = pool.filter(i => !H.has(WORDS[i].w) && !used.has(i));
  if (free.length < Math.max(3, Math.ceil(pool.length * 0.1))) {
    // havuzun çoğu kullanıldı: yalnızca en yeni %30'u hatırla, gerisini serbest bırak
    const inPool = new Set(pool.map(i => WORDS[i].w));
    const keep = new Set(hist.filter(w => inPool.has(w)).slice(-Math.floor(pool.length * 0.3)));
    hist = hist.filter(w => !inPool.has(w) || keep.has(w));
    free = pool.filter(i => !keep.has(WORDS[i].w) && !used.has(i));
    if (!free.length) free = pool.filter(i => !used.has(i));
    if (!free.length) free = pool.slice();
  }
  const k = free[Math.floor(Math.random() * free.length)];
  hist.push(WORDS[k].w); histSave(hist);
  st.usedW.push(k);
  return k;
}

/* ---------- sabitler ---------- */
const K_DEAL_MS = 45000, K_SPIN_MS = 4200, K_VOTE_MS = 60000, K_REVEAL_MS = 8200, K_GUESS_MS = 45000, K_SCORE_MS = 25000;
const nK = st => st.pl.length;
const onK = (st, i) => st.local || st.pl[i].bot || !!st.on[i];
const catInfo = ci => { const c = CAT[ci]; return { id: c.id, name: c.name, emo: c.emo, c1: c.c1, c2: c.c2 }; };
const needWord = (st, pi) => st.pl[pi].bot || (st.local ? st.solo : st.writeOn);

// sahtekârın bilgisine uyan aday kelimeler (botlar ve öneriler için)
function candidates(st, pi) {
  const hint = st.hintOn ? st.hints[pi] : null, f = hint ? fold(hint) : '';
  let base = st.catOn ? CAT[WORDS[st.w].c].words : st.pool;
  if (f) {
    const m = WORDS.map((_, i) => i).filter(i => WORDS[i].h.concat(WORDS[i].r).some(x => fold(x) === f) && (!st.catOn || WORDS[i].c === WORDS[st.w].c));
    if (m.length) base = m;
  }
  return base;
}
function makeSugg(st, pi) {
  const W = WORDS[st.w], out = [];
  let src;
  if (!st.imps.includes(pi)) src = shuffle(W.r);
  else src = shuffle(candidates(st, pi)).slice(0, 6).flatMap(i => shuffle(WORDS[i].r).slice(0, 2));
  for (const x of src) { if (out.length >= 3) break; if (!out.some(y => fold(y) === fold(x)) && !leaks(W.w, x)) out.push(x); }
  return out.map(cap);
}

/* ---------- tur akışı ---------- */
function kStartRound(st, ctx) {
  const n = nK(st);
  st.round++;
  st.w = pickWord(st);
  const cnt = st.impOpt === 2 && n >= 5 ? 2 : 1;
  let imps = shuffle(st.pl.map((_, i) => i)).slice(0, cnt).sort((a, b) => a - b);
  if (st.lastImps && imps.join() === st.lastImps.join() && n > cnt) imps = shuffle(st.pl.map((_, i) => i)).slice(0, cnt).sort((a, b) => a - b);
  st.imps = imps; st.lastImps = imps.slice();
  const hs = shuffle(WORDS[st.w].h);
  st.hints = {}; imps.forEach((i, k) => { st.hints[i] = hs[k % hs.length]; });
  st.sugg = {}; st.pl.forEach((_, i) => { st.sugg[i] = makeSugg(st, i); });
  st.clues = []; st.order = []; st.cRound = 0; st.cIdx = 0; st.starter = -1;
  st.votes = {}; st.vready = {}; st.vIdx = 0; st.quickBots = {}; st.res = null; st.opts8 = []; st.guesser = -1;
  st.endAt = 0; st.until = 0; st.ready = {};
  st.pl.forEach((p, i) => { if (p.bot) st.ready[i] = true; });
  st.phase = 'deal'; st.dealIdx = 0;
  if (!st.local) st.until = Date.now() + K_DEAL_MS;
  st.tk++;
  ctx.emit({ t: 'kround', rd: st.round }, `🕵️ ${st.round}. tur! ${cnt === 2 ? 'Aranızda 2 sahtekâr var.' : 'Aranızda bir sahtekâr var.'} Kartlara bakın.`, 'gold');
  ctx.sync(); kArm(st, ctx);
}
function kArm(st, ctx) {
  const tk = st.tk, at = (t, fn) => ctx.later(Math.max(0, t - Date.now()), () => { if (st.tk === tk) fn(); });
  const ph = st.phase;
  if (ph === 'deal' && st.until) at(st.until, () => kStartSpin(st, ctx));
  else if (ph === 'spin') at(st.until, () => kStartClue(st, ctx));
  else if (ph === 'discuss' && st.endAt) at(st.endAt, () => kStartVote(st, ctx, 'time'));
  else if (ph === 'vote' && st.until) at(st.until, () => kResolve(st, ctx));
  else if (ph === 'reveal') at(st.until, () => kAfterReveal(st, ctx));
  else if (ph === 'guess' && st.until) at(st.until, () => kGuess(st, ctx, st.guesser, null));
  else if (ph === 'score' && st.until) at(st.until, () => kNext(st, ctx));
}
function kCheckReady(st, ctx) {
  if (st.phase !== 'deal' || (st.local && !st.solo)) return false;
  const need = st.pl.map((_, i) => i).filter(i => onK(st, i));
  if (need.every(i => st.ready[i])) { kStartSpin(st, ctx); return true; }
  return false;
}
function kStartSpin(st, ctx) {
  if (st.phase !== 'deal') return;
  const n = nK(st);
  st.starter = Math.floor(Math.random() * n);                         // herkes arasından eşit olasılıkla
  st.order = Array.from({ length: n }, (_, k) => (st.starter + k) % n);
  st.phase = 'spin'; st.until = Date.now() + K_SPIN_MS; st.tk++;
  ctx.emit({ t: 'kspin', s: st.starter }, `🎲 Herkes kartını gördü. İlk konuşan: ${st.pl[st.starter].name}!`, 'good');
  ctx.sync(); kArm(st, ctx);
}
function kStartClue(st, ctx) {
  if (st.phase !== 'spin') return;
  if (!st.clueRounds) { kStartDiscuss(st, ctx); return; }
  st.phase = 'clue'; st.cRound = 1; st.cIdx = -1; st.until = 0; st.tk++;
  kAdvance(st, ctx, true);
}
function kAdvance(st, ctx, first) {
  const n = nK(st);
  for (;;) {
    st.cIdx++;
    if (st.cIdx >= n) { st.cIdx = 0; st.cRound++; }
    if (st.cRound > st.clueRounds) { kStartDiscuss(st, ctx); return; }
    const pi = st.order[st.cIdx];
    if (onK(st, pi)) break;
    st.clues.push({ pi, w: null, r: st.cRound, skip: true });         // bağlı olmayan oyuncu atlanır
  }
  if (first) ctx.emit({ t: 'kclueGo' }, `🗣️ Söz turu başladı: herkes sırayla kelimeyle ilgili tek bir kelime söylesin.`, '');
  ctx.sync();
}
function kClue(st, ctx, pi, w, skip) {
  const m = { pi, w: w || null, r: st.cRound, skip: !!skip };
  st.clues.push(m);
  ctx.emit({ t: 'kclue', pi, w: m.w, skip: m.skip }, skip ? `${st.pl[pi].name} sırasını geçti.` : m.w ? `🗣️ ${st.pl[pi].name}: “${m.w}”` : `🗣️ ${st.pl[pi].name} kelimesini söyledi.`, '');
  kAdvance(st, ctx, false);
}
function kStartDiscuss(st, ctx) {
  st.phase = 'discuss'; st.vready = {}; st.endAt = st.timeMs ? Date.now() + st.timeMs : 0; st.until = 0; st.tk++;
  ctx.emit({ t: 'kdisc' }, `💬 Tartışma başladı! ${st.timeMs ? `${st.timeMs / 60000} dakikanız var.` : 'Süre sınırı yok.'}`, 'gold');
  ctx.sync(); kArm(st, ctx);
}
function kCheckVReady(st, ctx) {
  if (st.phase !== 'discuss' || st.local) return false;
  const hum = st.pl.map((_, i) => i).filter(i => !st.pl[i].bot && onK(st, i));
  if (hum.length && hum.every(i => st.vready[i])) { kStartVote(st, ctx, 'ready'); return true; }
  return false;
}
function kStartVote(st, ctx, why) {
  if (st.phase !== 'discuss') return;
  st.phase = 'vote'; st.votes = {}; st.vIdx = 0; st.quickBots = {}; st.endAt = 0; st.tk++;
  st.quick = st.local && !st.solo && st.voteStyle === 'hizli';
  st.until = st.local ? 0 : Date.now() + K_VOTE_MS;
  if (st.quick) st.pl.forEach((p, i) => { if (p.bot) st.quickBots[i] = botVote(st, i); });
  ctx.emit({ t: 'kvstart', why }, why === 'time' ? '⏰ Süre doldu! Oylama zamanı.' : '🗳️ Oylama başladı! Sahtekâr kim?', 'bad');
  ctx.sync(); kArm(st, ctx);
}
function voters(st) { return st.pl.map((_, i) => i).filter(i => onK(st, i)); }
function kCastVote(st, ctx, pi, target) {
  if (st.phase !== 'vote' || st.quick || st.votes[pi] != null) return;
  if (!Number.isInteger(target) || target < 0 || target >= nK(st) || target === pi) return;
  if (st.local && !st.solo && pi !== kTurn(st)) return;
  st.votes[pi] = target;
  ctx.emit({ t: 'kvote', pi }, '', '');
  if (st.local && !st.solo) {
    st.vIdx++;
    if (st.vIdx >= nK(st)) { kResolve(st, ctx); return; }
    ctx.sync(); return;
  }
  if (voters(st).every(i => st.votes[i] != null)) { kResolve(st, ctx); return; }
  ctx.sync();
}
function kResolve(st, ctx, quickPick) {
  if (st.phase !== 'vote') return;
  const n = nK(st), tally = st.pl.map(() => 0);
  let accused = -1;
  if (st.quick) { accused = Number.isInteger(quickPick) && quickPick >= 0 && quickPick < n ? quickPick : -1; if (accused >= 0) tally[accused] = 1; }
  else {
    Object.values(st.votes).forEach(t => { tally[t]++; });
    const mx = Math.max(...tally);
    const top = tally.map((v, i) => i).filter(i => tally[i] === mx);
    accused = mx > 0 && top.length === 1 ? top[0] : -1;
  }
  const caught = accused >= 0 && st.imps.includes(accused);
  st.res = { accused, caught, tally, votes: Object.assign({}, st.votes), quick: !!st.quick };
  st.phase = 'reveal'; st.until = Date.now() + K_REVEAL_MS; st.tk++;
  ctx.emit({ t: 'kreveal', acc: accused, caught }, '', '');
  ctx.sync(); kArm(st, ctx);
}
function kAfterReveal(st, ctx) {
  if (st.phase !== 'reveal') return;
  const r = st.res;
  const who = st.imps.map(i => st.pl[i].name).join(' & ');
  if (r.caught) {
    ctx.emit({ t: 'klog' }, `🎯 ${st.pl[r.accused].name} yakalandı! Son şans: kelimeyi tahmin etmeli.`, 'good');
    st.phase = 'guess'; st.guesser = r.accused; st.tk++;
    const W = WORDS[st.w];
    const same = shuffle(CAT[W.c].words.filter(i => i !== st.w)).slice(0, 7);
    st.opts8 = shuffle([st.w].concat(same)).map(i => WORDS[i].w);
    st.until = st.local ? 0 : Date.now() + K_GUESS_MS;
    ctx.sync(); kArm(st, ctx);
  } else {
    ctx.emit({ t: 'klog' }, r.accused < 0 ? `🤝 Oylar eşit çıktı! Sahtekâr kaçtı: ${who}.` : `😇 ${st.pl[r.accused].name} masumdu! Sahtekâr: ${who}.`, 'bad');
    kScore(st, ctx, false, null);
  }
}
function kGuess(st, ctx, pi, a) {
  if (st.phase !== 'guess' || pi !== st.guesser) return;
  let ok = false, gtx = null;
  if (a && Number.isInteger(a.k) && a.k >= 0 && a.k < st.opts8.length) { gtx = st.opts8[a.k]; ok = gtx === WORDS[st.w].w; }
  else if (a && typeof a.tx === 'string' && !st.local) { gtx = cleanChat(a.tx).slice(0, 30); if (!gtx) return; ok = guessMatches(WORDS[st.w].w, gtx); }
  else if (a) return;
  ctx.emit({ t: 'kguess', ok }, gtx == null ? `⌛ ${st.pl[pi].name} tahmin edemedi.` : ok ? `😈 ${st.pl[pi].name} kelimeyi bildi: “${gtx}”!` : `❌ ${st.pl[pi].name} yanlış tahmin etti: “${gtx}”.`, ok ? 'bad' : 'good');
  kScore(st, ctx, ok, gtx);
}
function kScore(st, ctx, guessed, gtx) {
  const n = nK(st), r = st.res, gains = st.pl.map(() => 0), imps = st.imps;
  const votedImp = i => !r.quick && r.votes[i] != null && imps.includes(r.votes[i]);
  for (let i = 0; i < n; i++) {
    if (imps.includes(i)) {
      if (r.caught && i === r.accused) gains[i] = guessed ? 3 : 0;
      else gains[i] = r.caught ? 2 : 3;
    } else gains[i] = (r.caught && !guessed ? 1 : 0) + (votedImp(i) ? 1 : 0);
  }
  gains.forEach((g, i) => { st.score[i] += g; });
  Object.assign(r, { guessed: !!guessed, gtx, gains, imps: imps.slice(), word: WORDS[st.w].w, cat: WORDS[st.w].c, hints: Object.assign({}, st.hints) });
  st.hist.push({ round: st.round, w: WORDS[st.w].w, imps: imps.slice(), caught: r.caught, guessed: !!guessed });
  if (r.caught && !guessed) st.caughtN++;
  st.phase = 'score'; st.until = st.local ? 0 : Date.now() + K_SCORE_MS; st.tk++;
  ctx.emit({ t: 'kscore', gains, win: r.caught && !guessed ? 'civ' : 'imp' }, `📜 Kelime: ${WORDS[st.w].w}. ${r.caught && !guessed ? 'Masumlar kazandı!' : 'Sahtekâr kazandı!'}`, 'gold');
  ctx.sync(); kArm(st, ctx);
}
function kNext(st, ctx) {
  if (st.phase !== 'score') return;
  if (st.round >= st.rounds) kFinish(st, ctx); else kStartRound(st, ctx);
}
function kFinish(st, ctx) {
  st.phase = 'end'; st.tk++; st.until = 0;
  ctx.sync();
  const order = st.pl.map((_, i) => i).sort((a, b) => st.score[b] - st.score[a] || a - b);
  const top = st.score[order[0]], tie = order.filter(i => st.score[i] === top).length > 1;
  ctx.end({
    title: tie ? 'Berabere bitti!' : `${st.pl[order[0]].name} kazandı!`,
    ranking: order.map(i => ({ pi: i, score: st.score[i], label: `${st.score[i]} puan` })),
    note: `${st.rounds} tur oynandı · sahtekâr ${st.caughtN} kez yakalandı`
  });
}
function kTurn(st) {
  const ph = st.phase;
  if (ph === 'deal') return st.local && !st.solo ? (st.hum[st.dealIdx] ?? null) : null;
  if (ph === 'clue') return st.order[st.cIdx] ?? null;
  if (ph === 'vote') {
    if (st.quick) return null;
    if (st.local && !st.solo) return st.vIdx < nK(st) ? st.vIdx : null;
    const b = st.pl.findIndex((p, i) => p.bot && st.votes[i] == null);
    return b >= 0 ? b : null;
  }
  if (ph === 'guess') return st.guesser;
  return null;
}

/* ---------- bilgisayar ---------- */
function botClue(st, pi) {
  const W = WORDS[st.w], said = new Set(st.clues.filter(c => c.w).map(c => fold(c.w)));
  const fresh = x => x && !said.has(fold(x)) && !leaks(W.w, x);
  let pool;
  if (!st.imps.includes(pi)) pool = shuffle(W.r).concat(shuffle(W.h));
  else {
    const cand = shuffle(candidates(st, pi));
    pool = [];
    if (st.hintOn && Math.random() < 0.35) pool.push(st.hints[pi]);
    cand.slice(0, 8).forEach(i => pool.push(...shuffle(WORDS[i].r).slice(0, 2)));
    if (st.hintOn) pool.push(st.hints[pi]);
  }
  const w = pool.find(fresh) || shuffle(CAT[W.c].words.map(i => WORDS[i].r[0])).find(fresh) || 'Hmm';
  return cap(w);
}
function suspicion(st, by) {
  const W = WORDS[st.w];
  const R = new Set(W.r.concat(W.h).map(fold));
  const fits = w => { const f = fold(w); if (R.has(f)) return true; for (const x of R) if (x.length >= 4 && f.length >= 4 && (x.includes(f) || f.includes(x))) return true; return false; };
  return st.pl.map((_, j) => {
    if (j === by) return -99;
    let s = Math.random() * 0.9;
    st.clues.filter(c => c.pi === j && c.w).forEach(c => { s += fits(c.w) ? -1 : 1.3; });
    return s;
  });
}
function botVote(st, pi) {
  const n = nK(st);
  if (st.imps.includes(pi)) {
    const others = st.pl.map((_, i) => i).filter(i => i !== pi && !st.imps.includes(i));
    const pool = others.length ? others : st.pl.map((_, i) => i).filter(i => i !== pi);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const s = suspicion(st, pi);
  let best = (pi + 1) % n;
  for (let j = 0; j < n; j++) if (j !== pi && s[j] > s[best]) best = j;
  return best;
}
function botGuess(st, pi) {
  const cand = new Set(candidates(st, pi).map(i => WORDS[i].w)), h = st.hintOn ? fold(st.hints[pi]) : '';
  if (Math.random() < 0.4) return Math.floor(Math.random() * st.opts8.length);   // bazen düpedüz tahmin
  let best = 0, bs = -1;
  st.opts8.forEach((w, k) => {
    const W = WORDS.find(x => x.w === w);
    let s = Math.random() * 2.6 + (cand.has(w) ? 1 : 0);              // bilerek biraz şaşkın
    if (h && W && W.h.concat(W.r).some(x => fold(x) === h)) s += 0.6;
    if (s > bs) { bs = s; best = k; }
  });
  return best;
}

/* ---------- sözleşme (Kelime) ---------- */
const KEL = {
  setup(players, opts, ctx, notice) {
    const local = ctx.mode === 'local';
    const hum = players.map((p, i) => i).filter(i => !players[i].isBot);
    const st = {
      mode: 'kelime', notice: notice || '',
      pl: players.map(p => ({ name: p.name, color: p.color, bot: !!p.isBot })), score: players.map(() => 0), on: players.map(() => true),
      local, solo: local && hum.length === 1, hum,
      rounds: [3, 5, 7].includes(+opts.rounds) ? +opts.rounds : 5,
      impOpt: String(opts.imp) === '2' ? 2 : 1,
      hintOn: String(opts.hint ?? '1') !== '0', catOn: String(opts.showcat ?? '1') !== '0',
      catsOpt: String(opts.cats || 'all'), pool: poolFor(opts.cats),
      timeMs: ({ 2: 2, 3: 3, 5: 5, 0: 0 }[String(opts.time ?? '3')] ?? 3) * 60000,
      clueRounds: ({ 0: 0, 1: 1, 2: 2 }[String(opts.clue ?? '1')] ?? 1),
      writeOn: String(opts.write ?? '1') !== '0', voteStyle: opts.vote === 'hizli' ? 'hizli' : 'gizli',
      round: 0, usedW: [], w: 0, imps: [], lastImps: null, hints: {}, sugg: {},
      phase: 'deal', dealIdx: 0, ready: {}, starter: -1, order: [], cRound: 0, cIdx: 0, clues: [],
      endAt: 0, until: 0, vready: {}, votes: {}, vIdx: 0, quick: false, quickBots: {}, res: null, opts8: [], guesser: -1,
      hist: [], caughtN: 0, chat: [], chatSeq: 0, lastMsg: players.map(() => 0), tk: 0
    };
    if (opts.time === '0') st.timeMs = 0;
    kStartRound(st, ctx);
    return st;
  },
  action(st, pi, a, ctx) {
    if (st.phase === 'end' || !a) return;
    const n = nK(st), host = st.local || pi === ctx.hostPi;
    switch (a.t) {
      case 'seen': {                                       // elden ele kart sırası
        if (!st.local || st.solo || st.phase !== 'deal' || pi !== st.hum[st.dealIdx]) return;
        st.dealIdx++;
        if (st.dealIdx >= st.hum.length) { kStartSpin(st, ctx); return; }
        ctx.sync(); return;
      }
      case 'ready': {
        if (st.phase !== 'deal' || (st.local && !st.solo) || st.ready[pi]) return;
        st.ready[pi] = true;
        if (!kCheckReady(st, ctx)) ctx.sync();
        return;
      }
      case 'clue': {
        if (st.phase !== 'clue' || pi !== st.order[st.cIdx]) return;
        if (a.skip) { kClue(st, ctx, pi, null, true); return; }
        if (needWord(st, pi)) {
          const w = cleanClue(a.w); if (!w) return;
          if (!st.imps.includes(pi) && leaks(WORDS[st.w].w, w)) return;   // kelimenin kendisi söylenemez
          if (st.clues.some(c => c.w && fold(c.w) === fold(w))) return;      // aynı kelime iki kez söylenmez
          kClue(st, ctx, pi, cap(w), false);
        } else kClue(st, ctx, pi, null, false);
        return;
      }
      case 'vready': {
        if (st.phase !== 'discuss' || st.local || st.vready[pi]) return;
        st.vready[pi] = true;
        if (!kCheckVReady(st, ctx)) ctx.sync();
        return;
      }
      case 'tovote': { if (st.phase === 'discuss' && host) kStartVote(st, ctx, 'host'); return; }
      case 'vote': { kCastVote(st, ctx, pi, a.to); return; }
      case 'qpick': { if (st.phase === 'vote' && st.quick && Number.isInteger(a.to) && a.to >= -1 && a.to < n) kResolve(st, ctx, a.to); return; }
      case 'guess': { kGuess(st, ctx, pi, a); return; }
      case 'next': {
        if (!host) return;
        if (st.phase === 'deal' && !st.local) { kStartSpin(st, ctx); return; }
        if (st.phase === 'reveal') { kAfterReveal(st, ctx); return; }
        if (st.phase === 'score') kNext(st, ctx);
        return;
      }
      case 'chat': {
        if (st.local) return;
        const tx = cleanChat(a.tx); if (!tx) return;
        const now = Date.now(); if (now - (st.lastMsg[pi] || 0) < 400) return; st.lastMsg[pi] = now;
        if (st.phase !== 'score' && st.phase !== 'end' && !st.imps.includes(pi) && leaks(WORDS[st.w].w, tx)) return;
        const m = { id: ++st.chatSeq, k: 'c', pi, tx }; st.chat.push(m); if (st.chat.length > 60) st.chat.splice(0, st.chat.length - 60);
        ctx.emit({ t: 'kchat', m }, '', ''); ctx.sync(); return;
      }
      default:
    }
  },
  view(st, viewer) {
    let all = viewer === 'all';
    let seat = typeof viewer === 'number' && viewer >= 0 && viewer < nK(st) ? viewer : -1;
    if (all && st.solo) { all = false; seat = st.hum[0]; }
    const ph = st.phase, W = WORDS[st.w], open = ph === 'score' || ph === 'end';
    const card = i => (st.imps.includes(i)
      ? { imp: true, hint: st.hintOn ? st.hints[i] : null, cat: st.catOn ? catInfo(W.c) : null, two: st.imps.length > 1 }
      : { imp: false, word: W.w, cat: catInfo(W.c) });
    let res = null;
    if (st.res && (ph === 'reveal' || ph === 'guess' || open)) {
      const r = st.res;
      res = { accused: r.accused, caught: r.caught, tally: r.tally.slice(), votes: Object.assign({}, r.votes), quick: r.quick,
        imps: open || !r.caught ? st.imps.slice() : [r.accused] };
      if (open) Object.assign(res, { guessed: r.guessed, gtx: r.gtx, gains: r.gains.slice(), word: r.word, cat: catInfo(r.cat), hints: Object.assign({}, r.hints) });
    }
    return {
      mode: 'kelime', notice: st.notice, phase: ph, round: st.round, rounds: st.rounds, local: st.local, solo: st.solo, hotseat: all,
      you: all ? -2 : seat, hum: st.hum.slice(), impCount: st.imps.length,
      hintOn: st.hintOn, catOn: st.catOn, writeOn: st.writeOn, voteStyle: st.voteStyle, quick: !!st.quick, clueRounds: st.clueRounds, timeMs: st.timeMs,
      players: st.pl.map((p, i) => ({ name: p.name, color: p.color, bot: p.bot, score: st.score[i], on: onK(st, i) })),
      cat: st.catOn || open ? catInfo(W.c) : null,
      dealIdx: st.dealIdx, ready: Object.keys(st.ready).map(Number), starter: st.starter, order: st.order.slice(), cRound: st.cRound, cIdx: st.cIdx,
      turn: kTurn(st), clues: st.clues.map(c => ({ pi: c.pi, w: c.w, r: c.r, skip: c.skip })),
      endAt: st.endAt, until: st.until, vready: Object.keys(st.vready).map(Number), voted: Object.keys(st.votes).map(Number), vIdx: st.vIdx,
      quickBots: st.quick ? Object.assign({}, st.quickBots) : null,
      opts8: ph === 'guess' ? st.opts8.slice() : null, guesser: st.guesser,
      res, chat: st.chat.slice(-40),
      me: seat >= 0 ? card(seat) : null,
      sugg: seat >= 0 && ph === 'clue' ? (st.sugg[seat] || []).slice() : null,
      myVote: seat >= 0 && st.votes[seat] != null && ph === 'vote' ? st.votes[seat] : null,
      cards: all ? st.pl.map((p, i) => (p.bot ? null : card(i))) : null
    };
  },
  turnOf: kTurn,
  botAct(st, pi, ctx) {
    const ph = st.phase;
    if (ph === 'clue' && st.order[st.cIdx] === pi) kClue(st, ctx, pi, botClue(st, pi), false);
    else if (ph === 'vote' && !st.quick && st.votes[pi] == null) kCastVote(st, ctx, pi, botVote(st, pi));
    else if (ph === 'guess' && st.guesser === pi) kGuess(st, ctx, pi, { k: botGuess(st, pi) });
    else if (ph === 'deal' && st.local && !st.solo && st.hum[st.dealIdx] === pi) { st.dealIdx++; if (st.dealIdx >= st.hum.length) kStartSpin(st, ctx); else ctx.sync(); }
  },
  skipTurn(st, pi, ctx) {
    if (st.phase === 'clue' && st.order[st.cIdx] === pi) kClue(st, ctx, pi, null, true);
    else if (st.phase === 'guess' && st.guesser === pi) kGuess(st, ctx, pi, null);
    else ctx.sync();
  },
  onPresence(st, pi, online, ctx) {
    st.on[pi] = online;
    if (online) return;
    if (st.phase === 'deal') kCheckReady(st, ctx);
    else if (st.phase === 'discuss') kCheckVReady(st, ctx);
    else if (st.phase === 'vote' && !st.local && voters(st).every(i => st.votes[i] != null) && Object.keys(st.votes).length) kResolve(st, ctx);
  },
  resume(st, ctx) { st.tk++; if (st.phase !== 'end') kArm(st, ctx); }
};

/* ---------- Kelime arayüzü ---------- */
const KUI = (() => {
let root = null, ui = null, V = null, timerT = null;
let arrowDeg = 0, spinBusy = 0, roundKey = '', turnKey = '', lastTick = -1;
let dealOpen = false, dealLooked = false, dealKey = '';
let cardOpen = false, peek = null, gvShown = false, gvKey = '', sel = null, gsel = null, showSugg = false;
let qT0 = 0, feed = [], lastChat = 0, hold = null, noticeShown = false, lastDown = 0;
const q = s => root && root.querySelector(s);
const P = i => (V && V.players[i]) || { name: '?', color: '#fff' };
const me = () => (V && V.you >= 0 ? V.you : -1);
const hot = () => !!(V && V.hotseat);
const canHost = () => ui && (ui.mode === 'local' || ui.isHost);
const nowH = () => ui.hostNow();
const av = (i, cls = '') => `<span class="cs-w-av ${cls}" style="--pc:${P(i).color}">${P(i).bot ? '🤖' : esc(initial(P(i).name))}</span>`;
const nm = i => `<b class="cs-w-nm" style="color:${P(i).color}">${esc(P(i).name)}</b>`;
const UP = s => String(s).toLocaleUpperCase('tr-TR');
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function send(a) { Sound.init(); if (V && V.solo && a.as == null) a.as = V.you; ui.send(a); }   // tek kişi + bot: bot sırasında da insan oynar

/* ---------- kart ---------- */
function faceHTML(c) {
  if (!c) return '<div class="cs-w-face watch"><div class="cs-w-emo">👀</div><b class="cs-w-word">İzleyici</b></div>';
  if (c.imp) {
    return `<div class="cs-w-face imp"><div class="cs-w-emo">😈</div><p class="cs-w-cap">Gizli rolün</p><b class="cs-w-word">SAHTEKÂRSIN!</b>
      ${c.hint ? `<p class="cs-w-hint">İpucun: <b>${esc(c.hint)}</b></p>` : '<p class="cs-w-hint">İpucun yok · kulağını dört aç!</p>'}
      ${c.cat ? `<p class="cs-w-cat">${c.cat.emo} ${esc(c.cat.name)}</p>` : ''}
      ${c.two ? '<p class="cs-w-cat two">Bu turda 2 sahtekâr var</p>' : ''}
      <p class="cs-w-tip">Belli etme, uydur, kelimeyi yakala!</p></div>`;
  }
  const L = c.word.length, sz = L > 13 ? 'xs' : L > 9 ? 's' : L > 6 ? 'm' : '';
  return `<div class="cs-w-face civ" style="--c1:${c.cat.c1};--c2:${c.cat.c2}"><span class="cs-w-catb">${c.cat.emo} ${esc(c.cat.name)}</span>
    <div class="cs-w-emo">${c.cat.emo}</div><p class="cs-w-cap">Gizli kelimen</p><b class="cs-w-word ${sz}">${esc(UP(c.word))}</b>
    <p class="cs-w-tip">Kelimeyi söyleme! İlgili bir ipucu ver, sahtekârı bul.</p></div>`;
}
function flipHTML(c, o) {
  return `<button type="button" class="cs-w-flip ${o.open ? 'open' : ''} ${o.small ? 'small' : ''} ${c && c.imp ? 'is-imp' : ''}" data-flip="${o.key}" aria-label="Kartı çevir">
    <span class="cs-w-fn" style="--pc:${o.color || 'var(--violet)'}">
      ${o.name ? `<span class="cs-w-fav" style="--pc:${o.color}">${esc(initial(o.name))}</span><b class="cs-w-fname">${esc(UP(o.name))}</b>` : '<span class="cs-w-fq">?</span><b class="cs-w-fname">KARTIM</b>'}
      <span class="cs-w-ftap">👆 Dokun, kartını çevir</span><small>Basılı tutarsan bırakınca kapanır</small></span>
    <span class="cs-w-fw">${faceHTML(c)}</span></button>`;
}

/* ---------- masa (oyuncu çemberi) ---------- */
const angOf = i => -90 + i * 360 / V.players.length;
function setArrow(i, spins, dur) {
  const a = q('.cs-w-arrow'); if (!a || i == null || i < 0) return;
  const target = angOf(i) + 90;
  const delta = (((target - arrowDeg) % 360) + 360) % 360;
  arrowDeg += delta + (spins || 0) * 360;
  a.style.transition = `transform ${dur || .6}s cubic-bezier(.17,.75,.2,1)`;
  a.style.transform = `rotate(${arrowDeg}deg)`;
}
function arrowTarget(v) {
  if (v.phase === 'clue' || v.phase === 'guess') return v.turn;
  if (v.phase === 'deal' && hot()) return v.hum[v.dealIdx];
  if (v.phase === 'vote' && hot() && !v.quick) return v.vIdx < v.players.length ? v.vIdx : null;
  if (v.phase === 'spin' || v.phase === 'discuss') return v.starter;
  if (v.phase === 'reveal' && v.res) return v.res.accused >= 0 ? v.res.accused : null;
  return null;
}
function lastClue(v, i) {
  if (v.phase !== 'clue' && v.phase !== 'discuss') return null;
  for (let k = v.clues.length - 1; k >= 0; k--) if (v.clues[k].pi === i) return v.clues[k];
  return null;
}
function renderRing(v) {
  const n = v.players.length, ring = q('.cs-w-ring'), m = me();
  const open = v.res && (v.phase === 'score' || v.phase === 'end');
  const readySet = new Set(v.phase === 'deal' ? (hot() ? v.hum.slice(0, v.dealIdx) : v.ready) : v.phase === 'vote' ? v.voted : v.phase === 'discuss' ? v.vready : []);
  ring.style.setProperty('--n', n);
  ring.innerHTML = v.players.map((p, i) => {
    const a = angOf(i) * Math.PI / 180, x = 50 + 39 * Math.cos(a), y = 50 + 39 * Math.sin(a);
    const lc = lastClue(v, i);
    const isImp = (open && v.res.imps.includes(i)) || (v.phase === 'reveal' && v.res && !v.res.caught && v.res.imps.includes(i)) || ((v.phase === 'guess') && i === v.guesser);
    const gain = open && v.res.gains && v.res.gains[i] ? `<i class="cs-w-gain">+${v.res.gains[i]}</i>` : '';
    const cls = [i === v.turn && ['clue', 'guess'].includes(v.phase) ? 'turn' : '', i === m ? 'me' : '', p.on ? '' : 'off', isImp ? 'imp' : '', readySet.has(i) ? 'done' : '',
      v.phase === 'reveal' && v.res && v.res.accused === i ? 'acc' : ''].join(' ');
    const bub = lc ? `<span class="cs-w-bub ${lc.skip ? 'skip' : ''}">${lc.skip ? '—' : lc.w ? esc(lc.w) : '🗣️'}</span>` : '';
    return `<div class="cs-w-seat ${cls}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;--pc:${p.color}" data-seat="${i}">
      ${av(i)}<span class="cs-w-chk">✓</span><b class="cs-w-sn">${esc(p.name)}${i === m ? ' <small>(sen)</small>' : ''}</b><em class="cs-w-sc">${p.score}${gain}</em>${bub}</div>`;
  }).join('');
}
function hubHTML(v) {
  const n = v.players.length;
  switch (v.phase) {
    case 'deal': return hot() ? `<span class="cs-w-hi">🃏</span><small>Kart sırası</small><b>${v.dealIdx + 1}/${v.hum.length}</b>` : `<span class="cs-w-hi">🃏</span><small>Hazır</small><b>${v.ready.length}/${n}</b>`;
    case 'spin': return '<span class="cs-w-hi">🎲</span><small>Kim başlıyor?</small>';
    case 'clue': return `<span class="cs-w-hi">🎤</span><small>Söz turu ${v.cRound}/${v.clueRounds}</small><b style="color:${P(v.turn).color}">${esc(P(v.turn).name)}</b>`;
    case 'discuss': return `<span class="cs-w-hi">💬</span><small>Tartışma</small><b class="cs-w-hubt">${v.endAt ? '' : '∞'}</b>`;
    case 'vote': return v.quick ? '<span class="cs-w-hi">👉</span><small>Hızlı oylama</small>' : `<span class="cs-w-hi">🗳️</span><small>Oy verdi</small><b>${v.voted.length}/${n}</b>`;
    case 'reveal': return '<span class="cs-w-hi">🥁</span><small>Açıklanıyor</small>';
    case 'guess': return '<span class="cs-w-hi">🎯</span><small>Son şans</small>';
    case 'score': return '<span class="cs-w-hi">📜</span><small>Tur sonucu</small>';
    default: return '<span class="cs-w-hi">🏆</span><small>Oyun bitti</small>';
  }
}

/* ---------- panel ---------- */
const turnLine = (mine, h) => `<div class="g-turn cs-w-turn ${mine ? 'mine' : ''}"><span>${h}</span></div>`;
function panelHTML(v) {
  const m = me(), n = v.players.length, ph = v.phase;
  if (ph === 'deal') {
    if (hot()) return turnLine(true, `📱 Kart sırası: ${esc(P(v.hum[v.dealIdx]).name)}`);
    if (m < 0) return turnLine(false, '👀 Oyuncular kartlarına bakıyor…');
    const rd = v.ready.includes(m);
    return `${turnLine(!rd, rd ? `✅ Hazırsın · ${v.ready.length}/${n} hazır` : '🃏 Kartına bak, sonra hazır ol!')}
      <div class="cs-w-dealcard">${flipHTML(v.me, { key: 'mine', open: cardOpen, name: P(m).name, color: P(m).color })}</div>
      <div class="cs-w-row">${rd ? '' : '<button type="button" class="btn btn-spin cs-w-big" data-act="ready">Gördüm, hazırım ✓</button>'}
      ${!v.local && canHost() ? `<button type="button" class="btn btn-ghost" data-act="next">Herkesi bekleme, başlat ▶</button>` : ''}</div>
      ${v.until ? `<p class="g-sub">Otomatik başlama: <b class="cs-w-cd" data-until="${v.until}"></b></p>` : ''}`;
  }
  if (ph === 'spin') return `${turnLine(false, '🎲 Çark dönüyor… kim başlayacak?')}<p class="g-sub">Herkes arasından rastgele biri seçiliyor.</p>`;
  if (ph === 'clue') {
    const t = v.turn, mine = hot() ? !P(t).bot : t === m;
    const sub = `<p class="g-sub">Kelimeyle ilgili <b>tek bir kelime</b> söyle · Söz turu ${v.cRound}/${v.clueRounds}</p>`;
    if (P(t).bot) return `${turnLine(false, `🤖 ${esc(P(t).name)} düşünüyor…`)}${sub}`;
    if (hot()) {
      return `<div class="cs-w-big-turn" style="--pc:${P(t).color}">👉 <b>${esc(UP(P(t).name))}</b><small>söyle bakalım!</small></div>${sub}
        <div class="cs-w-row"><button type="button" class="btn btn-spin cs-w-big" data-act="said">✅ Söyledi</button><button type="button" class="btn btn-ghost" data-act="skip">Atla</button><button type="button" class="btn btn-ghost" data-act="peek">👁 Kartıma bak</button></div>`;
    }
    if (!mine) return `${turnLine(false, `🎤 Sıra: ${esc(P(t).name)}`)}${sub}`;
    if (v.solo || v.writeOn) {
      const sg = v.sugg && v.sugg.length ? `<div class="cs-w-sugg ${showSugg ? 'on' : ''}">${showSugg ? v.sugg.map(s => `<button type="button" class="cs-w-chip" data-sg="${esc(s)}">${esc(s)}</button>`).join('') : '<button type="button" class="cs-w-chip ghost" data-act="sugg">💡 Fikir ver</button>'}</div>` : '';
      return `${turnLine(true, '⭐ Sıra sende! İpucu kelimeni yaz')}
        <form class="cs-w-clueform" autocomplete="off"><input class="cs-w-cin" maxlength="24" placeholder="Tek kelime…" enterkeyhint="send" aria-label="İpucu kelimen" spellcheck="false"><button type="submit" class="btn btn-spin">Söyle</button></form>${sg}
        <p class="g-sub">Çok açık verme, sahtekâr da dinliyor! 😏</p>`;
    }
    return `${turnLine(true, '⭐ Sıra sende! Kelimeni yüksek sesle söyle')}<div class="cs-w-row"><button type="button" class="btn btn-spin cs-w-big" data-act="said">✅ Söyledim</button></div>`;
  }
  if (ph === 'discuss') {
    const head = `<div class="cs-w-disc"><span>🗣️</span><b>Tartışın!</b><small>Sahtekâr kim? Kim fazla genel konuştu?</small></div>`;
    if (hot() || v.local) return `${head}<div class="cs-w-row"><button type="button" class="btn btn-solve cs-w-big" data-act="tovote">🗳️ Oylamaya geç</button>${hot() ? '<button type="button" class="btn btn-ghost" data-act="peek">👁 Kartıma bak</button>' : ''}</div>`;
    const hum = v.players.filter(p => !p.bot && p.on).length, rd = v.vready.includes(m);
    return `${head}<div class="cs-w-row">${m >= 0 ? `<button type="button" class="btn ${rd ? 'btn-ghost' : 'btn-vowel'} cs-w-big" data-act="vready" ${rd ? 'disabled' : ''}>✋ ${rd ? 'Hazırsın' : 'Oylamaya hazırım'} (${v.vready.length}/${hum})</button>` : ''}
      ${canHost() ? '<button type="button" class="btn btn-solve" data-act="tovote">🗳️ Oylamaya geç</button>' : ''}</div>`;
  }
  if (ph === 'vote') {
    if (hot()) return turnLine(false, v.quick ? '👉 Hızlı oylama!' : `🗳️ Gizli oylama · ${v.voted.length}/${n}`);
    const done = `<p class="g-sub cs-w-vcount">🗳️ <b>${v.voted.length}/${n}</b> oy verdi ${v.until ? `· <b class="cs-w-cd" data-until="${v.until}"></b>` : ''}</p>`;
    if (m < 0) return turnLine(false, '👀 Oylama sürüyor') + done;
    if (v.myVote != null) return `${turnLine(false, `✅ Oyun: ${esc(P(v.myVote).name)} · diğerleri bekleniyor`)}${done}`;
    return `${turnLine(true, '⭐ Sahtekâr sence kim?')}${pickGrid(v, m, 'vsel')}
      <div class="cs-w-row"><button type="button" class="btn btn-solve cs-w-big" data-act="vote" ${sel == null ? 'disabled' : ''}>${sel == null ? 'Birini seç' : `🗳️ ${esc(P(sel).name)} sahtekâr!`}</button></div>${done}`;
  }
  if (ph === 'reveal') return turnLine(false, '🥁 Oylar açıklanıyor…');
  if (ph === 'guess') return turnLine(false, `🎯 ${esc(P(v.guesser).name)} son şansını kullanıyor`);
  if (ph === 'score') return turnLine(false, `📜 ${v.round}. tur bitti`);
  return '<div class="g-turn win">Oyun bitti!</div>';
}
function pickGrid(v, self, key) {
  return `<div class="cs-w-pick">${v.players.map((p, i) => i === self ? '' : `<button type="button" class="cs-w-pk ${sel === i ? 'on' : ''}" style="--pc:${p.color}" data-${key}="${i}">${av(i)}<b>${esc(p.name)}</b></button>`).join('')}</div>`;
}

/* ---------- katmanlar ---------- */
function overHTML(v) {
  const ph = v.phase, m = me();
  if (ph === 'deal' && hot()) {
    const hum = v.hum, k = v.dealIdx, cur = hum[k], nx = hum[k + 1];
    if (cur == null) return ['', ''];
    return [`<div class="cs-w-deal"><p class="cs-w-kick">KART SIRASI · ${k + 1}/${hum.length}</p>
      <div class="cs-w-minis">${hum.map((s, j) => `<span class="cs-w-mini ${j < k ? 'done' : j === k ? 'cur' : ''}" style="--pc:${P(s).color}">${j < k ? '✓' : esc(initial(P(s).name))}</span>`).join('')}</div>
      ${flipHTML(v.cards[cur], { key: 'deal', open: dealOpen, name: P(cur).name, color: P(cur).color })}
      <button type="button" class="btn btn-spin cs-w-next" data-act="dnext" ${dealLooked ? '' : 'disabled'}>${nx != null ? `Sıradaki oyuncu: ${esc(P(nx).name)} ➜` : 'Herkes baktı · Başlayalım! 🎲'}</button>
      <p class="cs-w-tip2">${dealLooked ? (nx != null ? `Kartı kapat ve telefonu <b>${esc(dat(P(nx).name))}</b> ver.` : 'Kartı kapat, ilk konuşanı seçelim!') : 'Kartına dokun ve gizlice bak 👀 Başkaları bakmasın!'}</p></div>`, 'deal'];
  }
  if (peek && hot() && (ph === 'clue' || ph === 'discuss')) {
    if (peek.who == null) return [`<p class="cs-w-ot">👁 Kim kartına bakacak?</p><div class="cs-w-pick">${v.hum.map(i => `<button type="button" class="cs-w-pk" style="--pc:${P(i).color}" data-peek="${i}">${av(i)}<b>${esc(P(i).name)}</b></button>`).join('')}</div><button type="button" class="btn btn-ghost" data-act="peekx">Vazgeç</button>`, 'pick'];
    return [`<div class="cs-w-deal"><p class="cs-w-kick">KARTA BAKIŞ</p>${flipHTML(v.cards[peek.who], { key: 'peek', open: peek.open, name: P(peek.who).name, color: P(peek.who).color })}
      <button type="button" class="btn btn-spin cs-w-next" data-act="peekx">Gizle ve kapat ✓</button></div>`, 'deal'];
  }
  if (ph === 'vote' && hot() && v.quick) {
    const bots = Object.entries(v.quickBots || {});
    return [`<p class="cs-w-kick">HIZLI OYLAMA</p><p class="cs-w-ot">Herkes aynı anda en şüpheli kişiyi işaret etsin!</p>
      <div class="cs-w-count"><span>3</span><span>2</span><span>1</span><span class="go">👉 GÖSTER!</span></div>
      <div class="cs-w-qafter">${bots.length ? `<div class="cs-w-qbots">${bots.map(([b, t]) => `<span>${av(+b)} → ${nm(+t)}</span>`).join('')}</div>` : ''}
      <p class="cs-w-os">En çok parmak kimi gösteriyor?</p>
      <div class="cs-w-pick">${v.players.map((p, i) => `<button type="button" class="cs-w-pk" style="--pc:${p.color}" data-qpick="${i}">${av(i)}<b>${esc(p.name)}</b></button>`).join('')}</div>
      <button type="button" class="btn btn-ghost" data-qpick="-1">🤝 Berabere / karar yok</button></div>`, 'quick'];
  }
  if (ph === 'vote' && hot()) {
    const t = v.vIdx; if (t >= v.players.length) return ['', ''];
    const prog = `<div class="cs-w-minis">${v.players.map((p, i) => `<span class="cs-w-mini ${v.voted.includes(i) ? 'done' : i === t ? 'cur' : ''}" style="--pc:${p.color}">${v.voted.includes(i) ? '✓' : p.bot ? '🤖' : esc(initial(p.name))}</span>`).join('')}</div>`;
    if (P(t).bot) return [`<p class="cs-w-kick">GİZLİ OYLAMA</p>${prog}<div class="cs-w-botv">${av(t, 'big')}<b>${esc(P(t).name)}</b><small>oyunu veriyor… 🤔</small></div>`, 'gvote'];
    if (!gvShown) return [`<p class="cs-w-kick">GİZLİ OYLAMA</p>${prog}<div class="cs-w-pass"><div class="cs-w-phone">📱</div><p class="cs-w-ot">Telefonu <b style="color:${P(t).color}">${esc(dat(P(t).name))}</b> ver</p><p class="cs-w-os">Oyunu kimse görmesin!</p>
      <button type="button" class="btn btn-spin cs-w-next" data-act="gvshow">🗳️ Ben ${esc(P(t).name)}, oyumu vereceğim</button></div>`, 'gvote'];
    return [`<p class="cs-w-kick">GİZLİ OYLAMA</p>${prog}<p class="cs-w-ot">${esc(P(t).name)}, sahtekâr sence kim?</p>${pickGrid(v, t, 'vsel')}
      <button type="button" class="btn btn-solve cs-w-next" data-act="gvote" ${sel == null ? 'disabled' : ''}>${sel == null ? 'Birini seç' : `Oyumu ver: ${esc(P(sel).name)} ✓`}</button>`, 'gvote'];
  }
  if (ph === 'reveal' && v.res) return [revealHTML(v), 'reveal'];
  if (ph === 'guess' && v.opts8) {
    const g = v.guesser, can = hot() || g === m;
    return [`<p class="cs-w-kick">SON ŞANS</p><div class="cs-w-gh">${av(g, 'big')}<div><b>${esc(UP(P(g).name))}</b> yakalandı! 😈<small>Gizli kelimeyi bilirse puanları o kapar.</small></div></div>
      ${can ? `<p class="cs-w-os">${hot() ? `${esc(P(g).name)}, gizli kelime hangisi?` : 'Gizli kelime hangisi?'}</p>` : `<p class="cs-w-os">${esc(P(g).name)} düşünüyor… ⏳ ${v.until ? `<b class="cs-w-cd" data-until="${v.until}"></b>` : ''}</p>`}
      <div class="cs-w-opts">${v.opts8.map((w, k) => `<button type="button" class="cs-w-opt ${gsel === k ? 'on' : ''}" data-g="${k}" ${can ? '' : 'disabled'}>${esc(w)}</button>`).join('')}</div>
      ${can ? `<button type="button" class="btn btn-spin cs-w-next" data-act="guess" ${gsel == null ? 'disabled' : ''}>${gsel == null ? 'Bir kelime seç' : `🎯 Tahminim: ${esc(v.opts8[gsel])}`}</button>` : ''}
      ${can && !v.local ? `<form class="cs-w-gform" autocomplete="off"><input class="cs-w-gin" maxlength="30" placeholder="…ya da kendin yaz" aria-label="Tahminini yaz" spellcheck="false"><button type="submit" class="btn btn-vowel">Gönder</button></form>${v.until ? `<p class="cs-w-os">Kalan süre: <b class="cs-w-cd" data-until="${v.until}"></b></p>` : ''}` : ''}`, 'guess'];
  }
  if (ph === 'score' && v.res) return [scoreHTML(v), 'score'];
  return ['', ''];
}
function revealHTML(v) {
  const r = v.res, n = v.players.length, mx = Math.max(1, ...r.tally);
  const real = r.imps.filter(i => i !== r.accused);
  const realH = real.length ? `<div class="cs-w-real">Asıl sahtekâr${real.length > 1 ? 'lar' : ''}: ${real.map(i => `${av(i)} <b style="color:${P(i).color}">${esc(UP(P(i).name))}</b>`).join(' & ')} 😈</div>` : '';
  let verdict;
  if (r.accused < 0) verdict = `<div class="cs-w-verdict miss"><b>OYLAR EŞİT! 🤝</b><em>Kimse elenmedi…</em></div>${realH}`;
  else if (r.caught) verdict = `<div class="cs-w-verdict caught">${av(r.accused, 'big')}<b>${esc(UP(P(r.accused).name))}!</b><em>😈 Yakalandı!</em></div>`;
  else verdict = `<div class="cs-w-verdict miss">${av(r.accused, 'big')}<b>${esc(UP(P(r.accused).name))}…</b><em>😇 masumdu!</em></div>${realH}`;
  const order = v.players.map((p, i) => i).filter(i => r.tally[i] > 0).sort((a, b) => r.tally[b] - r.tally[a]);
  const tally = r.quick ? `<p class="cs-w-os">Grup kararı: ${r.accused >= 0 ? nm(r.accused) : 'karar yok'}</p>` : `<div class="cs-w-tally">${order.map(i => `<div class="cs-w-tr" style="--pc:${P(i).color};--w:${Math.round(r.tally[i] / mx * 100)}%">${av(i)}<b>${esc(P(i).name)}</b><i><s></s></i><em>${r.tally[i]}</em></div>`).join('') || '<p class="cs-w-os">Kimse oy vermedi.</p>'}</div>`;
  const foot = canHost() ? '<button type="button" class="btn btn-ghost cs-w-skip" data-act="next">Devam ▶</button>' : '';
  return `<p class="cs-w-kick">OYLAR SAYILDI · ${n} OYUNCU</p>${tally}<div class="cs-w-drum">Sahtekâr… <span>🥁</span></div>${verdict}${foot}`;
}
function scoreHTML(v) {
  const r = v.res, last = v.round >= v.rounds, m = me();
  const imps = r.imps.map(i => `<span class="cs-w-impl">${av(i)} <b style="color:${P(i).color}">${esc(P(i).name)}</b><small>${r.hints[i] ? `ipucu: “${esc(r.hints[i])}”` : 'ipucusuz'}</small></span>`).join('');
  const line = r.caught && !r.guessed ? '🎉 Masumlar kazandı! Sahtekâr yakalandı ve kelimeyi bilemedi.'
    : r.caught ? `😈 Sahtekâr yakalandı ama kelimeyi bildi${r.gtx ? `: “${esc(r.gtx)}”` : ''}!`
      : r.accused < 0 ? '🤝 Oylar eşitti, sahtekâr sıvıştı!' : '😱 Masum biri suçlandı, sahtekâr kazandı!';
  const order = v.players.map((p, i) => i).sort((a, b) => v.players[b].score - v.players[a].score);
  const L = r.word.length, sz = L > 13 ? 'xs' : L > 9 ? 's' : '';
  const foot = v.phase === 'end' ? '' : canHost()
    ? `<button type="button" class="btn btn-spin cs-w-next" data-act="next">${last ? '🏆 Sonuçları gör' : '▶ Sonraki tur'}</button>`
    : `<p class="cs-w-os">${last ? 'Sonuçlar' : 'Sonraki tur'} <b class="cs-w-cd" data-until="${v.until}"></b> içinde…</p>`;
  return `<p class="cs-w-kick">TUR ${v.round}/${v.rounds} SONUCU</p>
    <div class="cs-w-reveal-word" style="--c1:${r.cat.c1};--c2:${r.cat.c2}"><span>${r.cat.emo}</span><small>Gizli kelime</small><b class="${sz}">${esc(UP(r.word))}</b></div>
    <div class="cs-w-imps">😈 ${imps}</div>
    <p class="cs-w-result ${r.caught && !r.guessed ? 'civ' : 'imp'}">${line}</p>
    ${m >= 0 && r.gains ? `<p class="cs-w-you ${r.gains[m] > 0 ? 'w' : 'l'}">${r.gains[m] > 0 ? `Bu tur +${r.gains[m]} puan aldın! 🎉` : 'Bu tur puan yok 😅'}</p>` : ''}
    <ol class="cs-w-gains">${order.map(i => `<li style="--pc:${P(i).color}">${av(i)}<b>${esc(P(i).name)}</b>${r.gains[i] ? `<i>+${r.gains[i]}</i>` : '<i class="z">+0</i>'}<em>${v.players[i].score}</em></li>`).join('')}</ol>${foot}`;
}
function setOver(h, cls) {
  const box = q('.cs-w-over');
  if (box.dataset.h !== h) {
    const cur = box.firstElementChild;
    const g1 = box.querySelector('.cs-w-gin'), keep = g1 ? g1.value : '';
    if (h && cur && box.dataset.c === cls && cls !== 'reveal' && cls !== 'quick') cur.innerHTML = h;
    else box.innerHTML = h ? `<div class="cs-w-modal ${cls}">${h}</div>` : '';
    const g2 = box.querySelector('.cs-w-gin'); if (g2 && keep) g2.value = keep;
    box.dataset.h = h; box.dataset.c = cls;
  }
  box.hidden = !h; box.className = 'cs-w-over ' + cls;
}

/* ---------- yan sütun ---------- */
function renderSide(v) {
  const m = me(), mc = q('.cs-w-mycard');
  const showCard = m >= 0 && v.me && v.phase !== 'deal' && v.phase !== 'end';
  mc.hidden = !showCard;
  if (showCard) {
    const h = flipHTML(v.me, { key: 'mine', open: cardOpen, small: true });
    if (mc.dataset.h !== h) { mc.innerHTML = h; mc.dataset.h = h; }
  }
  const cl = q('.cs-w-clues ol');
  const rounds = [];
  v.clues.forEach(c => { (rounds[c.r] = rounds[c.r] || []).push(c); });
  let h = '';
  rounds.forEach((list, r) => { if (!list) return; h += `<li class="cs-w-rh">${r}. söz turu</li>` + list.map(c => `<li class="cs-w-cl ${c.skip ? 'skip' : ''}" style="--pc:${P(c.pi).color}">${av(c.pi)}<b>${esc(P(c.pi).name)}</b><span>${c.skip ? 'atladı' : c.w ? esc(c.w) : '🗣️ sesli söyledi'}</span></li>`).join(''); });
  if (v.phase === 'clue' && v.turn != null) h += `<li class="cs-w-cl wait" style="--pc:${P(v.turn).color}">${av(v.turn)}<b>${esc(P(v.turn).name)}</b><span>…</span></li>`;
  cl.innerHTML = h || `<li class="cs-w-empty">${v.clueRounds ? 'Söz turunda söylenen kelimeler burada görünür.' : 'Bu oyunda söz turu yok, doğrudan tartışın!'}</li>`;
  q('.cs-w-clues').hidden = !v.clueRounds && !v.clues.length;
  const form = q('.cs-w-chat'); form.hidden = v.local;
  const inp = q('.cs-w-chin'); const dis = m < 0 || v.phase === 'end';
  if (inp.disabled !== dis) inp.disabled = dis;
}
function renderFeed() {
  const ol = q('.cs-w-msgs'); if (!ol) return;
  const near = ol.scrollHeight - ol.scrollTop - ol.clientHeight < 60;
  ol.innerHTML = feed.slice(-40).map(m => m.k === 'c'
    ? `<li class="cs-w-m" style="--pc:${P(m.pi).color}">${av(m.pi)}<div><b>${esc(P(m.pi).name)}</b><p>${esc(m.tx)}</p></div></li>`
    : `<li class="cs-w-sys ${m.cls || ''}">${esc(m.tx)}</li>`).join('') || '<li class="cs-w-sys">Oyun akışı burada.</li>';
  if (near || ol.dataset.init !== '1') { ol.scrollTop = ol.scrollHeight; ol.dataset.init = '1'; }
}

/* ---------- çizim ---------- */
function render(v) {
  const pv = V; V = v;
  if (!root) return;
  const rk = ui.mode + ':' + v.round;
  if (rk !== roundKey) { roundKey = rk; cardOpen = false; peek = null; dealOpen = false; dealLooked = false; showSugg = false; sel = null; gsel = null; }
  if (!pv && !noticeShown && v.notice) { noticeShown = true; setTimeout(() => banner('KELİME MODU', 'pink'), 300); feed.push({ k: 'sys', tx: v.notice, cls: 'bad' }); }
  if (!pv || pv.phase !== v.phase) { sel = null; gsel = null; if (v.phase !== 'clue' && v.phase !== 'discuss') peek = null; if (v.phase === 'vote') qT0 = Date.now(); }
  const dk = v.phase + ':' + v.dealIdx;
  if (dk !== dealKey) { dealKey = dk; dealOpen = false; dealLooked = false; }
  const gk = v.phase + ':' + v.vIdx;
  if (gk !== gvKey) { gvKey = gk; gvShown = false; sel = v.phase === 'vote' ? null : sel; }
  if (!pv) v.chat.forEach(m => { if (m.k === 'c' && m.id > lastChat) { feed.push(m); lastChat = m.id; } });
  const w = q('.cs-w'); w.dataset.phase = v.phase; w.classList.toggle('hot', hot());
  // üst bilgi
  q('.cs-w-round').innerHTML = v.phase === 'end' ? 'Bitti' : `<small>TUR</small><b>${v.round}</b><small>/${v.rounds}</small>`;
  const cc = q('.cs-w-catchip');
  cc.innerHTML = v.cat ? `${v.cat.emo} <b>${esc(v.cat.name)}</b>` : `❔ <b>Kategori gizli</b>`;
  cc.style.cssText = v.cat ? `--c1:${v.cat.c1};--c2:${v.cat.c2}` : '';
  renderRing(v);
  const hub = q('.cs-w-hubtx'), hh = hubHTML(v); if (hub.dataset.h !== hh) { hub.innerHTML = hh; hub.dataset.h = hh; }
  // ok
  if (Date.now() > spinBusy) {
    const t = arrowTarget(v);
    if (t != null && t >= 0) setArrow(t, 0, .6);
    q('.cs-w-arrow').classList.toggle('dim', t == null || t < 0);
  }
  // panel (yazılan taslak korunur)
  const pan = q('.cs-w-panel'), ph = panelHTML(v);
  if (pan.dataset.h !== ph) {
    const ci = pan.querySelector('.cs-w-cin'), draft = ci ? ci.value : '', foc = ci && document.activeElement === ci;
    pan.innerHTML = ph; pan.dataset.h = ph;
    const ni = pan.querySelector('.cs-w-cin'); if (ni) { ni.value = draft; if (foc || !draft) { try { ni.focus({ preventScroll: true }); } catch { /* */ } } }
  }
  const [oh, oc] = overHTML(v); setOver(oh, oc);
  renderSide(v);
  // sıra sende uyarısı
  const tk = v.phase + ':' + v.cRound + ':' + v.cIdx + ':' + v.turn;
  if (tk !== turnKey) {
    turnKey = tk;
    if (pv && v.phase === 'clue' && !hot() && v.turn === me() && me() >= 0) { Sound.special(); banner('SIRA SENDE! 🎤', 'pink'); }
  }
  if (pv && pv.phase !== 'spin' && v.phase === 'spin' && Date.now() > spinBusy) spin(v.starter);
  tick();
}
function spin(s) {
  if (s == null || s < 0 || !root) return;
  const dur = 3.4;
  spinBusy = Date.now() + dur * 1000 + 100;
  q('.cs-w-arrow').classList.remove('dim');
  setArrow(s, 4, dur);
  let k = 0; const steps = 22;
  const go = () => {
    if (!root || k >= steps) return;
    Sound.tick(Math.max(.1, 1 - k / steps));
    k++; setTimeout(go, 40 + Math.pow(k / steps, 2.2) * 320);
  };
  go();
  setTimeout(() => {
    if (!root || !V) return;
    Sound.stop(); banner(`İLK KONUŞAN: ${UP(P(s).name)} 🎤`, 'good');
    const el = q(`.cs-w-seat[data-seat="${s}"]`); if (el) { el.classList.add('picked'); const [x, y] = centerOf(el); FX.burst(x, y, 40, true); }
  }, dur * 1000);
}
function tick() {
  if (!V || !root) return;
  const v = V, now = nowH();
  const ref = v.phase === 'discuss' ? v.endAt : v.until;
  const left = ref ? Math.max(0, ref - now) : 0;
  const tm = q('.cs-w-timer'), show = !!ref && ['discuss', 'vote', 'guess', 'deal'].includes(v.phase);
  tm.hidden = !show && !(v.phase === 'discuss' && !v.endAt);
  q('.cs-w-tnum').textContent = v.phase === 'discuss' && !v.endAt ? '∞' : mmss(left);
  const low = show && left <= 10000;
  tm.classList.toggle('low', low);
  const ht = q('.cs-w-hubt'); if (ht && v.endAt) { ht.textContent = mmss(left); ht.classList.toggle('low', low); }
  root.querySelectorAll('.cs-w-cd').forEach(el => { el.textContent = mmss(Math.max(0, (+el.dataset.until) - now)); });
  const s = Math.ceil(left / 1000);
  if (v.phase === 'discuss' && v.endAt && s <= 10 && s > 0 && s !== lastTick) { lastTick = s; Sound.tick(.85); }
}

/* ---------- olaylar ---------- */
function onEvent(e) {
  if (!root || !V) return;
  const m = me();
  switch (e.t) {
    case 'kround': Sound.whoosh(); banner(`${e.rd}. TUR`, 'pink'); break;
    case 'kspin': spin(e.s); break;
    case 'kclue': if (!e.skip) { Sound.good(); const el = q(`.cs-w-seat[data-seat="${e.pi}"]`); if (el) { const [x, y] = centerOf(el); FX.burst(x, y, 14, false); } } break;
    case 'kdisc': Sound.stop(); banner('TARTIŞIN! 🗣️', 'good'); break;
    case 'kvstart':
      Sound.bad(); flash('bad'); banner('OYLAMA! 🗳️', 'bad');
      setTimeout(() => {
        if (!root || !V || !V.quick) return;
        [0, 800, 1600].forEach(d => setTimeout(() => Sound.tick(.9), d));
        setTimeout(() => { Sound.special(); FX.confetti(30); }, 2400);
      }, 50);
      break;
    case 'kvote': Sound.tick(.6); break;
    case 'kreveal': {
      Sound.whoosh();
      for (let k = 0; k < 16; k++) setTimeout(() => Sound.tick(.3 + k / 20), 1000 + k * 120);
      setTimeout(() => {
        if (!root) return;
        if (e.caught) { Sound.solve(); FX.confetti(90); flash('good'); }
        else { Sound.bankrupt(); flash('bad'); }
        const el = e.acc >= 0 && q(`.cs-w-seat[data-seat="${e.acc}"]`); if (el) { const [x, y] = centerOf(el); FX.burst(x, y, 40, e.caught); }
      }, 3000);
      if (!e.caught) setTimeout(() => { if (root) { Sound.bad(); banner('SAHTEKÂR KAÇTI! 😈', 'bad'); } }, 4400);
      break;
    }
    case 'kguess': if (e.ok) { Sound.bankrupt(); flash('bad'); banner('BİLDİ! 😈', 'bad'); } else { Sound.solve(); FX.confetti(80); banner('BİLEMEDİ! 🎉', 'good'); } break;
    case 'kscore': { const won = m >= 0 ? e.gains[m] > 0 : e.win === 'civ'; if (won) { Sound.good(); FX.confetti(50); } break; }
    case 'kchat': if (e.m && e.m.k === 'c' && e.m.id > lastChat) { lastChat = e.m.id; feed.push(e.m); renderFeed(); if (e.m.pi !== m) Sound.tick(.3); } break;
    default:
  }
}
function log(tx, cls) { if (!tx) return; feed.push({ k: 'sys', tx, cls }); if (feed.length > 80) feed.splice(0, feed.length - 80); renderFeed(); }

/* ---------- girdi ---------- */
function flipEl(el, open) {
  el.classList.toggle('open', open);
  const k = el.dataset.flip;
  if (k === 'deal') {
    dealOpen = open;
    if (open && !dealLooked) {
      dealLooked = true;
      const b = q('.cs-w-over [data-act="dnext"]'); if (b) b.disabled = false;
      q('.cs-w-over').dataset.h = '';
    }
  } else if (k === 'peek') { if (peek) peek.open = open; }
  else { cardOpen = open; q('.cs-w-panel').dataset.h = ''; q('.cs-w-mycard').dataset.h = ''; }
  if (open) Sound.special(); else Sound.tick(.4);
}
function onDown(e) {
  const el = e.target.closest('[data-flip]'); if (!el || !root.contains(el)) return;
  Sound.init();
  e.preventDefault(); lastDown = Date.now();
  if (el.classList.contains('open')) { flipEl(el, false); hold = null; return; }
  flipEl(el, true); hold = { el, t: Date.now() };
}
function onUp() {
  if (!hold) return;
  const h = hold; hold = null;
  if (Date.now() - h.t > 450) flipEl(h.el, false);               // basılı tutma: bırakınca kapanır
  else if (h.el.dataset.flip === 'deal') { const tip = q('.cs-w-tip2'); if (tip && V) { const nx = V.hum[V.dealIdx + 1]; tip.innerHTML = nx != null ? `Kartı kapat ve telefonu <b>${esc(dat(P(nx).name))}</b> ver.` : 'Kartı kapat, ilk konuşanı seçelim!'; } }
}
function onClick(e) {
  const fl = e.target.closest('[data-flip]');
  if (fl) { if (Date.now() - lastDown > 900) flipEl(fl, !fl.classList.contains('open')); return; }   // klavye (dokunuş zaten işlendi)
  const b = e.target.closest('button'); if (!b || b.disabled || !V || !root.contains(b) || b.dataset.flip) return;
  const v = V, d = b.dataset;
  if (d.vsel != null) { sel = +d.vsel; Sound.tick(.5); rerender(); return; }
  if (d.g != null) { gsel = +d.g; Sound.tick(.5); rerender(); return; }
  if (d.qpick != null) { send({ t: 'qpick', to: +d.qpick }); return; }
  if (d.peek != null) { peek = { who: +d.peek, open: false }; rerender(); return; }
  if (d.sg != null) { const i = q('.cs-w-cin'); if (i) { i.value = d.sg; i.focus(); } return; }
  switch (d.act) {
    case 'ready': cardOpen = false; send({ t: 'ready' }); break;
    case 'dnext': { if (!dealLooked) return; const cur = v.hum[v.dealIdx]; dealOpen = false; const f = q('.cs-w-over [data-flip]'); if (f) f.classList.remove('open'); Sound.whoosh(); setTimeout(() => send({ t: 'seen', as: cur }), 260); break; }
    case 'said': send({ t: 'clue', as: v.turn }); break;
    case 'skip': send({ t: 'clue', skip: true, as: v.turn }); break;
    case 'sugg': showSugg = true; rerender(); break;
    case 'peek': peek = { who: null }; rerender(); break;
    case 'peekx': peek = null; rerender(); break;
    case 'tovote': send({ t: 'tovote' }); break;
    case 'vready': send({ t: 'vready' }); break;
    case 'vote': if (sel != null) { send({ t: 'vote', to: sel }); sel = null; } break;
    case 'gvshow': gvShown = true; sel = null; Sound.special(); rerender(); break;
    case 'gvote': if (sel != null) { const t = v.vIdx, to = sel; gvShown = false; sel = null; send({ t: 'vote', to, as: t }); } break;
    case 'guess': if (gsel != null) { const a = { t: 'guess', k: gsel }; if (hot()) a.as = v.guesser; gsel = null; send(a); } break;
    case 'next': send({ t: 'next' }); break;
    default:
  }
}
function onSubmit(e) {
  const f = e.target; if (!V) return;
  e.preventDefault();
  if (f.classList.contains('cs-w-clueform')) {
    const inp = f.querySelector('.cs-w-cin'), w = cleanClue(inp.value);
    if (!w) { banner('Tek bir kelime yaz', 'pink'); return; }
    if (V.me && !V.me.imp && leaks(V.me.word, w)) { Sound.bad(); banner('Kelimenin kendisi olmaz! 🙊', 'bad'); return; }
    if (V.clues.some(c => c.w && fold(c.w) === fold(w))) { Sound.bad(); banner('Bu kelime söylendi! 🔁', 'bad'); return; }
    const a = { t: 'clue', w }; if (V.local) a.as = V.turn;
    inp.value = ''; send(a);
  } else if (f.classList.contains('cs-w-gform')) {
    const inp = f.querySelector('.cs-w-gin'), tx = inp.value.trim(); if (!tx) return;
    inp.value = ''; send({ t: 'guess', tx });
  } else if (f.classList.contains('cs-w-chat')) {
    const inp = f.querySelector('.cs-w-chin'), tx = cleanChat(inp.value); if (!tx) return;
    if (V.me && !V.me.imp && V.phase !== 'score' && leaks(V.me.word, tx)) { banner('Kelimeyi yazamazsın! 🙊', 'bad'); return; }
    inp.value = ''; send({ t: 'chat', tx });
  }
}
const rerender = () => { if (V) render(V); };
function mount(r, api) {
  root = r; ui = api; V = null; feed = []; lastChat = 0; roundKey = ''; turnKey = ''; dealKey = ''; gvKey = ''; arrowDeg = 0; spinBusy = 0; noticeShown = false;
  cardOpen = false; peek = null; dealOpen = false; dealLooked = false; sel = null; gsel = null; hold = null;
  root.innerHTML = `<div class="g-wrap cs cs-w">
    <div class="cs-w-top"><div class="cs-w-round"></div><div class="cs-w-catchip"></div><div class="cs-w-timer" hidden>⏱ <span class="cs-w-tnum">0:00</span></div></div>
    <div class="cs-w-grid">
      <section class="cs-w-stage">
        <div class="cs-w-table"><div class="cs-w-felt"></div><div class="cs-w-arrow dim"><i></i></div><div class="cs-w-hub"><div class="cs-w-hubtx"></div></div><div class="cs-w-ring"></div></div>
        <div class="cs-w-panel"></div>
      </section>
      <aside class="cs-w-side">
        <div class="cs-w-mycard" hidden></div>
        <div class="cs-w-box cs-w-clues"><h3>📝 Söylenenler</h3><ol></ol></div>
        <div class="cs-w-box cs-w-feed"><h3>📣 Akış</h3><ol class="cs-w-msgs" aria-live="polite"></ol>
          <form class="cs-w-chat" autocomplete="off" hidden><input class="cs-w-chin" maxlength="120" placeholder="Sohbet et…" aria-label="Sohbet" spellcheck="false" enterkeyhint="send"><button type="submit" class="btn btn-vowel">Gönder</button></form></div>
      </aside>
    </div>
    <div class="cs-w-over" hidden></div>
  </div>`;
  root.addEventListener('click', onClick);
  root.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  root.addEventListener('submit', onSubmit);
  timerT = setInterval(tick, 250);
  renderFeed();
}
function unmount() {
  clearInterval(timerT); timerT = null;
  if (root) { root.removeEventListener('click', onClick); root.removeEventListener('pointerdown', onDown); root.removeEventListener('submit', onSubmit); }
  window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
  root = null; ui = null; V = null;
}
return { mount, render, onEvent, unmount, log };
})();

/* =========================================================================
   Mod seçici: Kelime (varsayılan) ya da Mekân (klasik)
   ========================================================================= */
const subOf = st => (st && st.mode === 'mekan' ? MEK : KEL);
let mroot = null, mapi = null, cur = null, pendingLog = [];
CFX.registerGame({
  id: 'casus', name: 'Casus Kim?', icon: '🕵️', color: '#ff3b5c', min: 3, max: 8, hotseat: true, bot: true, localMin: 1, botDelay: 1100,
  tagline: 'Herkes kelimeyi bilir, biri bilmez: sahtekârı bul!',
  rules: 'Herkes aynı gizli kelimeyi görür; sahtekâr yalnızca bir ipucu alır. Sırayla kelimeyle ilgili tek bir kelime söyleyin, tartışın ve sahtekârı oylayın. Yakalanan sahtekâr kelimeyi bilirse puanları kapar! (Mekân modu: klasik konum oyunu, yalnızca insanlarla.)',
  options: [
    { key: 'mode', label: 'Mod', def: 'kelime', choices: [{ v: 'kelime', label: 'Kelime' }, { v: 'mekan', label: 'Mekân (klasik)' }] },
    { key: 'imp', label: 'Sahtekâr sayısı', def: '1', choices: [{ v: '1', label: '1' }, { v: '2', label: '2 (5+ kişide)' }] },
    { key: 'hint', label: 'Sahtekâra ipucu', def: '1', choices: [{ v: '1', label: 'Açık' }, { v: '0', label: 'Kapalı' }] },
    { key: 'showcat', label: 'Kategori gösterilsin', def: '1', choices: [{ v: '1', label: 'Açık' }, { v: '0', label: 'Kapalı' }] },
    { key: 'cats', label: 'Kategoriler', def: 'all', choices: [{ v: 'all', label: `Hepsi (${WORDS.length} kelime)` }]
      .concat(GROUPS.map(g => ({ v: 'g:' + g[0], label: `${g[1]} (${poolFor('g:' + g[0]).length})` })))
      .concat(CAT.map(c => ({ v: 'c:' + c.id, label: `${c.emo} ${c.name} (${c.words.length})` }))) },
    { key: 'time', label: 'Tartışma süresi', def: '3', choices: [{ v: '2', label: '2 dk' }, { v: '3', label: '3 dk' }, { v: '5', label: '5 dk' }, { v: '0', label: 'Süresiz' }] },
    { key: 'rounds', label: 'Tur sayısı', def: '5', choices: [{ v: '3', label: '3 tur' }, { v: '5', label: '5 tur' }, { v: '7', label: '7 tur' }] },
    { key: 'clue', label: 'Söz turu', def: '1', choices: [{ v: '1', label: '1 tur' }, { v: '2', label: '2 tur' }, { v: '0', label: 'Yok' }] },
    { key: 'write', label: 'Kelimeyi yaz (online)', def: '1', choices: [{ v: '1', label: 'Açık' }, { v: '0', label: 'Kapalı' }] },
    { key: 'vote', label: 'Oylama (tek telefon)', def: 'gizli', choices: [{ v: 'gizli', label: 'Gizli' }, { v: 'hizli', label: 'Hızlı' }] },
    { key: 'mtime', label: 'Mekân tur süresi', def: '8', choices: [{ v: '5', label: '5 dk' }, { v: '8', label: '8 dk' }, { v: '10', label: '10 dk' }] }
  ],
  setup(players, opts, ctx) {
    const o = opts || {};
    if (o.mode === 'mekan') {
      if (!players.some(p => p.isBot)) {
        const st = MEK.setup(players, { time: o.mtime || '8', rounds: o.rounds || '3', spies: o.imp || '1', pool: '30' }, ctx);
        st.mode = 'mekan';
        return st;
      }
      return KEL.setup(players, o, ctx, 'Mekân modu bilgisayar rakiplerle oynanamıyor; oyun Kelime moduyla başladı.');
    }
    return KEL.setup(players, o, ctx, '');
  },
  action(st, pi, a, ctx) { subOf(st).action(st, pi, a, ctx); },
  view(st, viewer) { const v = subOf(st).view(st, viewer); if (st.mode === 'mekan') v.mode = 'mekan'; return v; },
  turnOf(st) { return subOf(st).turnOf(st); },
  botAct(st, pi, ctx) { if (st.mode !== 'mekan') KEL.botAct(st, pi, ctx); },
  skipTurn(st, pi, ctx) { subOf(st).skipTurn(st, pi, ctx); },
  onPresence(st, pi, online, ctx) { subOf(st).onPresence(st, pi, online, ctx); },
  resume(st, ctx) { subOf(st).resume(st, ctx); },
  mount(r, api) { mroot = r; mapi = api; cur = null; pendingLog = []; },
  render(v, api) {
    if (!mroot) return;
    const want = v && v.mode === 'mekan' ? MEK : KUI;
    if (cur !== want) {
      if (cur) cur.unmount();
      mroot.innerHTML = ''; cur = want; cur.mount(mroot, api || mapi);
      cur.render(v);
      pendingLog.splice(0).forEach(([t, c]) => cur.log(t, c));
      return;
    }
    cur.render(v);
  },
  onEvent(e) { if (cur) cur.onEvent(e); },
  unmount() { if (cur) cur.unmount(); cur = null; mroot = null; mapi = null; },
  log(text, cls) { if (cur) cur.log(text, cls); else { pendingLog.push([text, cls]); if (pendingLog.length > 20) pendingLog.shift(); } },
  _test: { WORDS, CAT, GROUPS, poolFor, fold, leaks, guessMatches, cleanClue, histLoad, HKEY, KEL, MEK, botClue, botVote, botGuess, candidates }
});
})();
