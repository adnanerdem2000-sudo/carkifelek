/* =========================================================================
   OYUN SALONU — CASUS KİM?
   Herkes gizli bir konumu ve rolünü görür; casus yalnızca casus olduğunu
   bilir. Oyuncular sırayla birbirine soru sorar, şüpheliyi oybirliğiyle
   suçlar. Casus yakalanmadan konumu tahmin etmeye çalışır.
   3–8 kişi online ya da tek telefonda "elden ele".
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial, shuffle, clamp, centerOf } = CFX;

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

CFX.registerGame({
  id: 'casus', name: 'Casus Kim?', icon: '🕵️', color: '#ff3b5c', min: 3, max: 8, hotseat: true, bot: false, localMin: 3,
  tagline: 'Gizli konumu bil, aradaki casusu yakala',
  rules: 'Herkes gizli konumu ve rolünü görür; casus yalnızca casus olduğunu bilir. Sırayla birbirinize soru sorun, şüpheliyi oybirliğiyle suçlayın. Casus ise yakalanmadan konumu tahmin etmeye çalışır.',
  options: [
    { key: 'time', label: 'Tur süresi', def: '8', choices: [{ v: '5', label: '5 dk' }, { v: '8', label: '8 dk' }, { v: '10', label: '10 dk' }] },
    { key: 'rounds', label: 'Tur sayısı', def: '3', choices: [{ v: '3', label: '3 tur' }, { v: '5', label: '5 tur' }] },
    { key: 'spies', label: 'Casus sayısı', def: '1', choices: [{ v: '1', label: '1 casus' }, { v: '2', label: '2 (6+ kişide)' }] },
    { key: 'pool', label: 'Konum havuzu', def: '30', choices: [{ v: '20', label: '20 konum' }, { v: '30', label: '30 konum' }, { v: 'all', label: `Tümü (${LOCS.length})` }] }
  ],
  setup(players, opts, ctx) {
    const timeMin = [5, 8, 10].includes(+opts.time) ? +opts.time : 8;
    const rounds = [3, 5].includes(+opts.rounds) ? +opts.rounds : 3;
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
  mount, render, onEvent, unmount,
  log(text, cls) { addLog(text, cls); },
  _test: { LOCS, dat, acc, cleanTx, mmss }
});
})();
