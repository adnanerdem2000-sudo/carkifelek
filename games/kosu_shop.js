/* =========================================================================
   OYUN SALONU — PATİLİ YARIŞ · MAĞAZA, PROFİL VE İLERLEME
   Eşya kataloğu (karakterler, renkler, şapka, gözlük, tişört, pantolon,
   ayakkabı, kostüm, aksesuar, iz efekti), cihazdaki profil (altın, sahip
   olunan eşyalar, giyilen görünüm, istatistik), günlük görevler, başarımlar,
   günün vitrini, ödül hesabı ve yerel liderlik tablosu.
   Kozmetiklerin yarışa HİÇBİR etkisi yoktur: buradaki hiçbir değer fiziğe
   ya da güçlere aktarılmaz. Node testleri için window olmadan da yüklenir.
   ========================================================================= */
(function (root) {
'use strict';
const NS = root.PatiliYaris = root.PatiliYaris || {};

/* ------------------------------------------------------------------ sabitler */
const RARITY = [
  { n: 'Sıradan', c: '#b8c4d6' },
  { n: 'Nadir', c: '#4fb3ff' },
  { n: 'Epik', c: '#c06bff' },
  { n: 'Efsanevi', c: '#ffb627' }
];
const SLOTS = [
  { k: 'char', n: 'Karakter', i: '🐾' },
  { k: 'skin', n: 'Renk', i: '🎨' },
  { k: 'hat', n: 'Şapka', i: '🎩' },
  { k: 'glasses', n: 'Gözlük', i: '🕶️' },
  { k: 'shirt', n: 'Tişört', i: '👕' },
  { k: 'pants', n: 'Pantolon', i: '👖' },
  { k: 'shoes', n: 'Ayakkabı', i: '👟' },
  { k: 'costume', n: 'Kostüm', i: '🦸' },
  { k: 'acc', n: 'Aksesuar', i: '🎈' },
  { k: 'trail', n: 'İz Efekti', i: '✨' }
];
const WORLDS = {
  cayir: { n: 'Çiçekli Çayır', i: '🌼', loc: "Çiçekli Çayır'da" },
  seker: { n: 'Şeker Diyarı', i: '🍭', loc: "Şeker Diyarı'nda" },
  buzul: { n: 'Buzul Tepeleri', i: '❄️', loc: "Buzul Tepeleri'nde" },
  volkan: { n: 'Volkan Adası', i: '🌋', loc: "Volkan Adası'nda" },
  gece: { n: 'Gece Şehri', i: '🌃', loc: "Gece Şehri'nde" }
};
const WORLD_IDS = Object.keys(WORLDS);
const START_GOLD = 150;

/* ------------------------------------------------------------------ katalog
   id, s: bölme, n: ad, r: nadirlik 0-3, p: fiyat, st: çizim stili, c: renkler
   free: başta sahip olunur · rot: yalnız günün vitrininde satılır
   ach: yalnız başarımla açılır (satılmaz)                                    */
const C = [];
const add = (s, id, n, r, p, st, c, x) => C.push(Object.assign({ id, s, n, r, p, st, c: c || [] }, x || {}));
// Karakterler (hepsi aynı hız ve fizikle koşar)
add('char', 'tilki', 'Tilki', 0, 0, 'tilki', [], { free: true });
add('char', 'panda', 'Panda', 0, 0, 'panda', [], { free: true });
add('char', 'tavsan', 'Tavşan', 0, 0, 'tavsan', [], { free: true });
add('char', 'kedi', 'Kedi', 0, 0, 'kedi', [], { free: true });
add('char', 'penguen', 'Penguen', 1, 300, 'penguen');
add('char', 'ayicik', 'Ayıcık', 1, 300, 'ayicik');
add('char', 'kurbaga', 'Kurbağa', 1, 350, 'kurbaga');
add('char', 'rakun', 'Rakun', 1, 400, 'rakun');
add('char', 'ejderha', 'Ejderha Bebek', 3, 2400, 'ejderha');
add('char', 'unicorn', 'Unicorn', 3, 3000, 'unicorn', [], { rot: true });
// Renkler (kürk/ten rengi)
add('skin', 'kar', 'Kar Beyazı', 0, 120, 'pal', ['#eef1f8', '#ffffff']);
add('skin', 'gece', 'Gece Mavisi', 1, 280, 'pal', ['#4656a8', '#c9d2ff']);
add('skin', 'pembe', 'Pembe Şeker', 1, 280, 'pal', ['#ff9ccf', '#ffe3f1']);
add('skin', 'nane', 'Nane', 1, 300, 'pal', ['#6fdcb8', '#e6fff6']);
add('skin', 'lav', 'Lav', 2, 800, 'pal', ['#ff5a2a', '#ffd36b']);
add('skin', 'golge', 'Gölge', 2, 900, 'pal', ['#3a3444', '#6d667b']);
add('skin', 'altin', 'Altın', 3, 2200, 'gold', ['#ffc93c', '#fff2b0']);
add('skin', 'galaksi', 'Galaksi', 3, 2800, 'galaxy', ['#5b3cc4', '#a98bff'], { rot: true });
// Şapkalar
add('hat', 'kep', 'Kırmızı Kep', 0, 80, 'cap', ['#e8433a', '#ffffff']);
add('hat', 'kep_mavi', 'Mavi Kep', 0, 80, 'cap', ['#2f7bff', '#ffe14a']);
add('hat', 'bere', 'Ponponlu Bere', 0, 90, 'beanie', ['#ffb627', '#ff5d8f']);
add('hat', 'parti', 'Parti Külahı', 0, 100, 'party', ['#ff3fa4', '#ffe14a']);
add('hat', 'kovboy', 'Kovboy Şapkası', 1, 260, 'cowboy', ['#a0622d', '#5a3214']);
add('hat', 'silindir', 'Silindir Şapka', 1, 320, 'tophat', ['#24212b', '#e8433a']);
add('hat', 'korsan', 'Korsan Şapkası', 1, 340, 'pirate', ['#2a2230', '#ffffff']);
add('hat', 'asci', 'Aşçı Şapkası', 1, 260, 'chef', ['#ffffff', '#e5e7ef']);
add('hat', 'cicek_taci', 'Çiçek Tacı', 1, 300, 'flowers', ['#ff7eb6', '#ffe14a']);
add('hat', 'kulaklik', 'Kulaklık', 1, 380, 'headphones', ['#2b2b33', '#19e3d0']);
add('hat', 'mantar', 'Mantar Şapka', 1, 290, 'mushroom', ['#e8433a', '#ffffff']);
add('hat', 'viking', 'Viking Miğferi', 2, 760, 'viking', ['#9aa3ad', '#f3e0b0']);
add('hat', 'buyucu', 'Büyücü Şapkası', 2, 880, 'wizard', ['#5b3cc4', '#ffe14a']);
add('hat', 'pervane', 'Pervaneli Şapka', 2, 720, 'propeller', ['#19e3d0', '#ff3fa4', '#ffe14a']);
add('hat', 'kral_taci', 'Kral Tacı', 3, 2600, 'crown', ['#ffd84a', '#2f7bff'], { rot: true });
add('hat', 'zafer_taci', 'Zafer Tacı', 3, 0, 'crown', ['#ffc93c', '#ff3fa4'], { ach: 'ilk_zafer' });
// Gözlükler
add('glasses', 'gunes', 'Güneş Gözlüğü', 0, 90, 'shades', ['#1b1b22']);
add('glasses', 'yuvarlak', 'Yuvarlak Gözlük', 0, 80, 'round', ['#6b3d1e']);
add('glasses', 'kalp', 'Kalp Gözlük', 1, 260, 'heart', ['#ff3fa4']);
add('glasses', 'yildiz', 'Yıldız Gözlük', 1, 280, 'star', ['#ffd23a']);
add('glasses', 'kayak', 'Kayak Gözlüğü', 1, 320, 'ski', ['#19e3d0', '#ff8a00']);
add('glasses', 'monokl', 'Monokl', 1, 300, 'monocle', ['#ffc93c']);
add('glasses', 'pilot', 'Pilot Gözlüğü', 1, 340, 'aviator', ['#c9a227', '#4a2a0a']);
add('glasses', 'piksel', 'Pikselli Gözlük', 2, 780, 'pixel', ['#111111']);
add('glasses', 'neon', 'Neon Vizör', 2, 950, 'visor', ['#19e3d0', '#ff3fa4']);
add('glasses', 'lazer', 'Lazer Gözler', 3, 2000, 'laser', ['#ff2a2a'], { rot: true });
// Tişörtler
add('shirt', 'tee_kirmizi', 'Kırmızı Tişört', 0, 60, 'tee', ['#e8433a', '#b52a22']);
add('shirt', 'tee_mavi', 'Mavi Tişört', 0, 60, 'tee', ['#2f7bff', '#1d55c4']);
add('shirt', 'tee_sari', 'Sarı Tişört', 0, 60, 'tee', ['#ffd84a', '#e0a91c']);
add('shirt', 'cizgili', 'Çizgili Tişört', 0, 110, 'stripes', ['#ffffff', '#2f7bff']);
add('shirt', 'puantiye', 'Puantiyeli Tişört', 0, 120, 'dots', ['#ff8fc8', '#ffffff']);
add('shirt', 'yildizli', 'Yıldızlı Tişört', 1, 240, 'stars', ['#1d2a6b', '#ffe14a']);
add('shirt', 'kalpli', 'Kalpli Tişört', 1, 240, 'hearts', ['#ffffff', '#ff3fa4']);
add('shirt', 'forma', 'Futbol Forması', 1, 300, 'jersey', ['#19a35a', '#ffffff']);
add('shirt', 'hawaii', 'Hawaii Gömleği', 1, 320, 'hawaii', ['#19c9d0', '#ff8a00']);
add('shirt', 'kapusonlu', 'Kapüşonlu', 1, 340, 'hoodie', ['#8b3dff', '#ffffff']);
add('shirt', 'smokin', 'Smokin', 2, 820, 'tux', ['#1b1b22', '#ffffff']);
add('shirt', 'gokkusagi', 'Gökkuşağı Tişört', 2, 900, 'rainbow', ['#ff4f6d', '#ffd84a']);
// Pantolonlar
add('pants', 'kot', 'Kot Pantolon', 0, 70, 'jeans', ['#3557a8', '#26407d']);
add('pants', 'sort', 'Şort', 0, 70, 'shorts', ['#ff8a00', '#c96600']);
add('pants', 'esofman', 'Eşofman', 0, 90, 'track', ['#2b2b33', '#ffffff']);
add('pants', 'ekose', 'Ekose Pantolon', 1, 260, 'plaid', ['#c0392b', '#2b2b33']);
add('pants', 'kargo', 'Kargo Pantolon', 1, 240, 'cargo', ['#6b7d3a', '#4d5a29']);
add('pants', 'tutu', 'Tütü Etek', 1, 300, 'tutu', ['#ff9ccf', '#ffd1e8']);
add('pants', 'kamuflaj', 'Kamuflaj', 1, 320, 'camo', ['#5a6b3a', '#3b4a25']);
add('pants', 'yildiz_tayt', 'Yıldızlı Tayt', 2, 780, 'starleg', ['#2a1a5e', '#ffe14a']);
add('pants', 'altin_pantolon', 'Altın Pantolon', 2, 850, 'goldpants', ['#ffc93c', '#c98a00']);
// Ayakkabılar
add('shoes', 'spor', 'Spor Ayakkabı', 0, 70, 'sneaker', ['#ffffff', '#e8433a']);
add('shoes', 'bot', 'Deri Bot', 0, 90, 'boot', ['#7a4a2a', '#4a2a12']);
add('shoes', 'terlik', 'Terlik', 0, 60, 'slipper', ['#19e3d0', '#ffffff']);
add('shoes', 'cizme', 'Yağmur Çizmesi', 1, 240, 'rainboot', ['#ffd84a', '#e0a91c']);
add('shoes', 'neon_ayk', 'Neon Ayakkabı', 1, 320, 'neon', ['#2bff88', '#ff3fa4']);
add('shoes', 'palyaco', 'Palyaço Ayakkabısı', 1, 300, 'clown', ['#e8433a', '#ffd84a']);
add('shoes', 'bulut_ayk', 'Bulut Patik', 2, 760, 'cloud', ['#ffffff', '#bfe6ff']);
add('shoes', 'roket', 'Roket Ayakkabı', 2, 900, 'rocket', ['#9aa3ad', '#ff8a00']);
add('shoes', 'altin_ayk', 'Altın Ayakkabı', 3, 0, 'sneaker', ['#ffc93c', '#fff2b0'], { ach: 'maratoncu' });
// Kostümler (tişört ve pantolonun üstüne giyilir)
add('costume', 'ari', 'Arı', 1, 420, 'bee', ['#ffd84a', '#22222b']);
add('costume', 'palyaco_k', 'Palyaço', 1, 400, 'clownsuit', ['#ff3fa4', '#19e3d0']);
add('costume', 'ninja', 'Ninja', 2, 880, 'ninja', ['#25252e', '#e8433a']);
add('costume', 'super', 'Süper Kahraman', 2, 950, 'superhero', ['#2f7bff', '#e8433a', '#ffd84a']);
add('costume', 'dino', 'Dinozor Tulumu', 2, 980, 'dino', ['#6fd36a', '#ffd84a']);
add('costume', 'korsan_k', 'Korsan Kaptan', 2, 920, 'captain', ['#7a1f2b', '#ffd84a']);
add('costume', 'sovalye', 'Şövalye', 2, 1100, 'knight', ['#b9c2cc', '#e8433a']);
add('costume', 'astronot', 'Astronot', 3, 1900, 'astronaut', ['#f2f4f8', '#ff8a00']);
add('costume', 'kar_prens', 'Buz Prensi', 3, 2400, 'icequeen', ['#bfe6ff', '#ffffff'], { rot: true });
// Aksesuarlar
add('acc', 'atki', 'Atkı', 0, 80, 'scarf', ['#e8433a', '#ffffff']);
add('acc', 'papyon', 'Papyon', 0, 70, 'bowtie', ['#ff3fa4']);
add('acc', 'balon', 'Balon', 0, 110, 'balloon', ['#ff3fa4']);
add('acc', 'canta', 'Sırt Çantası', 0, 120, 'backpack', ['#ff8a00', '#c96600']);
add('acc', 'gitar', 'Gitar', 1, 380, 'guitar', ['#c0392b', '#f3d39b']);
add('acc', 'asa', 'Yıldız Asası', 1, 340, 'wand', ['#ffe14a', '#ff8fc8']);
add('acc', 'melek', 'Melek Kanatları', 2, 900, 'angelwings', ['#ffffff', '#cfe8ff']);
add('acc', 'kelebek', 'Kelebek Kanatları', 2, 850, 'butterfly', ['#ff8fc8', '#8b3dff']);
add('acc', 'jetpack', 'Jetpack', 2, 1000, 'jetpack', ['#9aa3ad', '#ff8a00']);
add('acc', 'hale', 'Hale', 2, 800, 'halo', ['#ffe14a']);
add('acc', 'ejder_kanat', 'Ejder Kanatları', 3, 2200, 'dragonwings', ['#8b3dff', '#ff3fa4'], { rot: true });
add('acc', 'pelerin', 'Şampiyon Pelerini', 3, 0, 'cape', ['#e8433a', '#ffd84a'], { ach: 'seri_galip' });
add('acc', 'gezgin', 'Gezgin Çantası', 2, 0, 'backpack', ['#2bd96b', '#1a9a4a'], { ach: 'gezgin' });
add('acc', 'madalya', 'Altın Madalya', 1, 0, 'medal', ['#ffc93c', '#e8433a'], { ach: 'podyum' });
// İz efektleri (koşarken arkada kalan süs)
add('trail', 'iz_cicek', 'Çiçek İzi', 0, 140, 'petals', ['#ff9ccf', '#ffffff']);
add('trail', 'iz_kalp', 'Kalp İzi', 1, 260, 'hearts', ['#ff3fa4', '#ff8fc8']);
add('trail', 'iz_yildiz', 'Yıldız İzi', 1, 260, 'stars', ['#ffe14a', '#fff6b0']);
add('trail', 'iz_kar', 'Kar Tanesi İzi', 1, 300, 'snow', ['#ffffff', '#bfe6ff']);
add('trail', 'iz_baloncuk', 'Baloncuk İzi', 1, 280, 'bubbles', ['#bfe6ff', '#ffffff']);
add('trail', 'iz_nota', 'Nota İzi', 1, 300, 'notes', ['#8b3dff', '#19e3d0']);
add('trail', 'iz_gokkusagi', 'Gökkuşağı İzi', 2, 900, 'rainbow', []);
add('trail', 'iz_ates', 'Ateş İzi', 2, 850, 'fire', ['#ff8a00', '#ffe14a']);
add('trail', 'iz_simsek', 'Şimşek İzi', 3, 2000, 'sparks', ['#7ff3ff', '#ffffff'], { rot: true });

const BYID = {}; C.forEach(it => { BYID[it.id] = it; });
const CHARS = C.filter(it => it.s === 'char').map(it => it.id);

/* ------------------------------------------------------------------ başarımlar */
const ACH = [
  { id: 'ilk_adim', n: 'İlk Adım', d: 'İlk yarışını bitir.', g: 50, ok: s => s.finishes >= 1 },
  { id: 'ilk_zafer', n: 'İlk Zafer', d: 'En az 2 kişilik bir yarış kazan.', g: 100, item: 'zafer_taci', ok: s => s.wins >= 1 },
  { id: 'podyum', n: 'Podyum Müdavimi', d: '10 kez ilk 3\'e gir.', g: 150, item: 'madalya', ok: s => s.podiums >= 10 },
  { id: 'seri_galip', n: 'Şampiyon', d: '10 yarış kazan.', g: 300, item: 'pelerin', ok: s => s.wins >= 10 },
  { id: 'maratoncu', n: 'Maratoncu', d: '30 yarış bitir.', g: 300, item: 'altin_ayk', ok: s => s.finishes >= 30 },
  { id: 'gezgin', n: 'Dünya Gezgini', d: '5 dünyanın hepsinde yarış bitir.', g: 200, item: 'gezgin', ok: s => WORLD_IDS.every(w => (s.worlds || {})[w]) },
  { id: 'hiz', n: 'Hız Tutkunu', d: 'Bir parkuru par süresinin altında bitir.', g: 100, ok: s => s.underPar >= 1 },
  { id: 'kusursuz', n: 'Kusursuz', d: 'Hiç tökezlemeden bir yarış kazan.', g: 150, ok: s => s.cleanWins >= 1 },
  { id: 'muzcu', n: 'Muz Ustası', d: 'Muz kabuğuyla 10 rakip kaydır.', g: 150, ok: s => s.bananaHits >= 10 },
  { id: 'kalkan', n: 'Kalkan Duvarı', d: 'Kalkanla 10 saldırı engelle.', g: 150, ok: s => s.blocks >= 10 },
  { id: 'simsek_kral', n: 'Şimşek Kral', d: 'Şimşekle 5 rakibi çarp.', g: 150, ok: s => s.zapHits >= 5 },
  { id: 'turbo', n: 'Turbo Tutkunu', d: '25 kez turbo kullan.', g: 100, ok: s => (s.pw.turbo || 0) >= 25 },
  { id: 'altin_avcisi', n: 'Altın Avcısı', d: 'Parkurlarda toplam 500 altın topla.', g: 200, ok: s => s.coins >= 500 },
  { id: 'koleksiyon', n: 'Koleksiyoncu', d: '20 eşyaya sahip ol.', g: 250, ok: (s, p) => p.owned.filter(id => BYID[id] && !BYID[id].free).length >= 20 },
  { id: 'moda', n: 'Moda İkonu', d: 'Aynı anda 6 farklı bölmede eşya giy.', g: 100, ok: (s, p) => ['skin', 'hat', 'glasses', 'shirt', 'pants', 'shoes', 'costume', 'acc', 'trail'].filter(k => p.look[k]).length >= 6 },
  { id: 'zengin', n: 'Zengin Pati', d: 'Aynı anda 3.000 altına sahip ol.', g: 100, ok: (s, p) => p.gold >= 3000 }
];

/* ------------------------------------------------------------------ günlük görevler */
const QUESTS = [
  { id: 'bitir', d: '{n} yarış bitir', goal: 3, g: 60, m: 'finish' },
  { id: 'guc', d: '{n} kez güç kullan', goal: 6, g: 50, m: 'pw' },
  { id: 'muz', d: '{n} kez muz kabuğu kullan', goal: 3, g: 50, m: 'pw_muz' },
  { id: 'podyum', d: '{n} kez ilk 3\'e gir', goal: 2, g: 70, m: 'podium' },
  { id: 'kazan', d: 'Bir yarış kazan', goal: 1, g: 80, m: 'win' },
  { id: 'altin', d: 'Parkurda {n} altın topla', goal: 40, g: 50, m: 'coins' },
  { id: 'temiz', d: 'Hiç tökezlemeden bir yarış bitir', goal: 1, g: 70, m: 'clean' },
  { id: 'isabet', d: 'Rakiplerine {n} kez isabet ettir', goal: 4, g: 60, m: 'hitgiven' },
  { id: 'turbo', d: '{n} kez turbo kullan', goal: 3, g: 40, m: 'pw_turbo' },
  { id: 'par', d: 'Bir parkuru par süresinin altında bitir', goal: 1, g: 80, m: 'underpar' },
  { id: 'zipla', d: '{n} kez zıpla', goal: 150, g: 40, m: 'jumps' },
  { id: 'dunya', d: '{w} bir yarış bitir', goal: 1, g: 60, m: 'world' }
];

/* ------------------------------------------------------------------ yardımcılar */
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function today(d) { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
const fmtG = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function fmtMs(ms) { if (ms == null || !isFinite(ms)) return '—'; const s = ms / 1000, m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(2).padStart(5, '0')}`; }

const DEFAULT_LOOK = { char: 'tilki', skin: null, hat: null, glasses: null, shirt: null, pants: null, shoes: null, costume: null, acc: null, trail: null };
const LOOK_KEYS = Object.keys(DEFAULT_LOOK);

function defaultProfile() {
  return {
    v: 1, gold: START_GOLD, owned: C.filter(it => it.free).map(it => it.id),
    look: Object.assign({}, DEFAULT_LOOK),
    stats: { races: 0, finishes: 0, wins: 0, podiums: 0, coins: 0, hits: 0, hitGiven: 0, bananaHits: 0, zapHits: 0, blocks: 0, jumps: 0, underPar: 0, cleanWins: 0, goldEarned: 0, pw: {}, worlds: {} },
    best: {}, ach: {}, daily: null, board: {}, seen: {}
  };
}
// Bozuk / eski kayıtları onar (eksik alanları varsayılanla doldur)
function fixProfile(p) {
  const d = defaultProfile();
  if (!p || typeof p !== 'object') return d;
  const out = Object.assign(d, p);
  out.stats = Object.assign(defaultProfile().stats, p.stats || {});
  out.stats.pw = Object.assign({}, (p.stats && p.stats.pw) || {});
  out.stats.worlds = Object.assign({}, (p.stats && p.stats.worlds) || {});
  out.owned = Array.isArray(p.owned) ? p.owned.filter(id => BYID[id]) : d.owned;
  C.filter(it => it.free).forEach(it => { if (!out.owned.includes(it.id)) out.owned.push(it.id); });
  out.look = sanitizeLook(p.look);
  LOOK_KEYS.forEach(k => { const v = out.look[k]; if (v && !out.owned.includes(v)) out.look[k] = k === 'char' ? 'tilki' : null; });
  out.gold = Math.max(0, Math.floor(+out.gold || 0));
  ['best', 'ach', 'board', 'seen'].forEach(k => { if (!out[k] || typeof out[k] !== 'object') out[k] = {}; });
  return out;
}
const KEY = 'py.profile.v1';
function storage() { try { return root.localStorage || null; } catch { return null; } }
function load(st) {
  const s = st || storage();
  try { const raw = s && s.getItem(KEY); return fixProfile(raw ? JSON.parse(raw) : null); } catch { return defaultProfile(); }
}
function save(p, st) { const s = st || storage(); try { if (s) s.setItem(KEY, JSON.stringify(p)); return true; } catch { return false; } }

/* ------------------------------------------------------------------ görünüm doğrulama
   Online'da gelen görünüm sadece biçim olarak doğrulanır (sahiplik bu cihazdadır);
   görünümün oyuna etkisi yoktur.                                               */
function sanitizeLook(look) {
  const out = Object.assign({}, DEFAULT_LOOK);
  if (!look || typeof look !== 'object') return out;
  LOOK_KEYS.forEach(k => {
    const v = look[k];
    if (typeof v !== 'string' || v.length > 24) return;
    const it = BYID[v]; if (!it || it.s !== k) return;
    out[k] = v;
  });
  if (!out.char) out.char = 'tilki';
  return out;
}
function botLook(rng) {
  rng = rng || Math.random;
  const pickOf = s => { const l = C.filter(it => it.s === s); return l[Math.floor(rng() * l.length)].id; };
  const look = Object.assign({}, DEFAULT_LOOK, { char: pickOf('char') });
  if (rng() < .45) look.hat = pickOf('hat');
  if (rng() < .3) look.glasses = pickOf('glasses');
  if (rng() < .25) look.costume = pickOf('costume');
  else { if (rng() < .55) look.shirt = pickOf('shirt'); if (rng() < .4) look.pants = pickOf('pants'); }
  if (rng() < .4) look.shoes = pickOf('shoes');
  if (rng() < .3) look.acc = pickOf('acc');
  if (rng() < .2) look.skin = pickOf('skin');
  if (rng() < .2) look.trail = pickOf('trail');
  return look;
}

/* ------------------------------------------------------------------ günün vitrini */
function dailyShop(date) {
  const rng = mulberry(hashStr('vitrin:' + date));
  const pool = C.filter(it => !it.free && !it.ach);
  const rare = pool.filter(it => it.rot), normal = pool.filter(it => !it.rot);
  const out = [];
  const take = (list, n) => { const l = list.slice(); while (n-- > 0 && l.length) { const k = Math.floor(rng() * l.length); out.push(l.splice(k, 1)[0].id); } };
  take(rare, 1);
  take(normal.filter(it => it.r >= 2), 1);
  take(normal.filter(it => it.r === 1), 2);
  take(normal.filter(it => it.r === 0), 2);
  return out;
}
const DISCOUNT = .8;
function priceOf(id, date) {
  const it = BYID[id]; if (!it) return Infinity;
  if (dailyShop(date || today()).includes(id)) return Math.round(it.p * DISCOUNT / 5) * 5;
  return it.p;
}
// satın alınabilir mi? { ok, err }
function canBuy(p, id, date) {
  const it = BYID[id];
  if (!it) return { ok: false, err: 'Böyle bir eşya yok.' };
  if (p.owned.includes(id)) return { ok: false, err: 'Bu eşya zaten sende.' };
  if (it.ach) return { ok: false, err: 'Bu eşya yalnız başarımla açılır.' };
  if (it.free) return { ok: false, err: 'Bu eşya zaten ücretsiz.' };
  date = date || today();
  if (it.rot && !dailyShop(date).includes(id)) return { ok: false, err: 'Bu nadir eşya yalnız günün vitrininde satılır.' };
  const price = priceOf(id, date);
  if (p.gold < price) return { ok: false, err: `Yetersiz altın (${fmtG(price - p.gold)} eksik).` };
  return { ok: true, price };
}
function buy(p, id, date) {
  const c = canBuy(p, id, date); if (!c.ok) return c;
  p.gold -= c.price; p.owned.push(id);
  const unlocked = checkAch(p);
  return { ok: true, price: c.price, unlocked };
}
function equip(p, id) {
  const it = BYID[id]; if (!it || !p.owned.includes(id)) return false;
  p.look[it.s] = id;
  checkAch(p);
  return true;
}
function unequip(p, slot) { if (slot === 'char' || !(slot in p.look)) return false; p.look[slot] = null; return true; }

/* ------------------------------------------------------------------ günlük görev durumu */
function ensureDaily(p, date) {
  date = date || today();
  if (p.daily && p.daily.date === date && Array.isArray(p.daily.q)) return p.daily;
  const rng = mulberry(hashStr('gorev:' + date));
  const ids = QUESTS.map(q => q.id), pickd = [];
  while (pickd.length < 3) { const k = Math.floor(rng() * ids.length); pickd.push(ids.splice(k, 1)[0]); }
  const world = WORLD_IDS[Math.floor(rng() * WORLD_IDS.length)];
  p.daily = { date, q: pickd.map(id => ({ id, n: 0, done: false, w: id === 'dunya' ? world : undefined })) };
  return p.daily;
}
function questInfo(q) {
  const d = QUESTS.find(x => x.id === q.id); if (!d) return null;
  const text = d.d.replace('{n}', d.goal).replace('{w}', q.w && WORLDS[q.w] ? WORLDS[q.w].loc : '');
  return { text, goal: d.goal, g: d.g, m: d.m, n: Math.min(q.n, d.goal), done: q.done };
}

/* ------------------------------------------------------------------ ödül hesabı
   race: { place (1..n), n, ms (bitirdiyse), finished, par, hits, pwUsed, coins, pb }
   Daha hızlı ve daha iyi yarışa daha çok altın.                                 */
const PLACE_G = [45, 32, 24, 18, 14, 11];
function calcReward(r) {
  const lines = [];
  const add2 = (k, label, g) => { g = Math.max(0, Math.round(g)); if (g > 0) lines.push({ k, label, g }); };
  if (r.finished) {
    add2('fin', 'Yarışı bitirdin', 20);
    if (r.n > 1) add2('place', `${r.place}. sıra`, (PLACE_G[r.place - 1] || 8) * (0.75 + 0.05 * Math.min(6, r.n)));
    else add2('place', 'Zamana karşı', 15);
    if (r.par && r.ms < r.par) add2('time', 'Hız bonusu (par altı)', Math.min(45, (r.par - r.ms) / 1000 * 3));
    if (!r.hits) add2('clean', 'Kusursuz koşu', 12);
    if (r.pb) add2('pb', 'Kişisel rekor!', 15);
  } else add2('dnf', 'Katılım', 6);
  if (r.pwUsed) add2('pw', `Güç kullanımı ×${r.pwUsed}`, Math.min(10, r.pwUsed * 2));
  if (r.coins) add2('coins', `Toplanan altın ×${r.coins}`, r.coins);
  return { lines, total: lines.reduce((a, l) => a + l.g, 0) };
}

/* ------------------------------------------------------------------ yarış sonucunu işle
   race: { world, place, n, ms, finished, par, coins, hits, jumps, pw:{turbo:2,..},
           hitGiven, bananaHits, zapHits, blocks, names:[{name, ms, me}] , date }
   Dönen: { reward, quests:[{text,g}], ach:[{n,g,item}], gold (son), pb }        */
function applyRace(p, race) {
  const s = p.stats, date = race.date || today();
  const pwUsed = Object.values(race.pw || {}).reduce((a, b) => a + b, 0);
  const prevBest = p.best[race.world];
  const pb = !!(race.finished && race.ms && (!prevBest || race.ms < prevBest));
  if (pb) p.best[race.world] = race.ms;
  const reward = calcReward({ place: race.place, n: race.n, ms: race.ms, finished: race.finished, par: race.par, hits: race.hits, pwUsed, coins: race.coins, pb: pb && !!prevBest });
  // istatistik
  s.races++;
  if (race.finished) { s.finishes++; s.worlds[race.world] = (s.worlds[race.world] || 0) + 1; }
  const win = race.finished && race.place === 1 && race.n > 1;
  if (win) s.wins++;
  if (race.finished && race.place <= 3 && race.n > 1) s.podiums++;
  if (win && !race.hits) s.cleanWins++;
  const under = race.finished && race.par && race.ms < race.par;
  if (under) s.underPar++;
  s.coins += race.coins || 0; s.hits += race.hits || 0; s.jumps += race.jumps || 0;
  s.hitGiven += race.hitGiven || 0; s.bananaHits += race.bananaHits || 0; s.zapHits += race.zapHits || 0; s.blocks += race.blocks || 0;
  Object.entries(race.pw || {}).forEach(([k, v]) => { s.pw[k] = (s.pw[k] || 0) + v; });
  // görevler
  const daily = ensureDaily(p, date), qDone = [];
  const metric = {
    finish: race.finished ? 1 : 0, pw: pwUsed, pw_muz: (race.pw || {}).muz || 0, pw_turbo: (race.pw || {}).turbo || 0,
    podium: race.finished && race.place <= 3 && race.n > 1 ? 1 : 0, win: win ? 1 : 0, coins: race.coins || 0,
    clean: race.finished && !race.hits ? 1 : 0, hitgiven: race.hitGiven || 0, underpar: under ? 1 : 0, jumps: race.jumps || 0
  };
  let questGold = 0;
  daily.q.forEach(q => {
    if (q.done) return;
    const d = QUESTS.find(x => x.id === q.id); if (!d) return;
    const inc = d.m === 'world' ? (race.finished && race.world === q.w ? 1 : 0) : (metric[d.m] || 0);
    q.n = Math.min(d.goal, q.n + inc);
    if (q.n >= d.goal) { q.done = true; questGold += d.g; qDone.push({ text: questInfo(q).text, g: d.g }); }
  });
  p.gold += reward.total + questGold;
  s.goldEarned += reward.total + questGold;
  // liderlik
  (race.names || []).forEach(x => { if (x.ms) boardAdd(p, race.world, x.name, x.ms, x.me, date); });
  const ach = checkAch(p);
  return { reward, quests: qDone, questGold, ach, pb, gold: p.gold };
}
// başarımları denetle; yeni açılanların altın ve eşyasını ver
function checkAch(p) {
  const out = [];
  let again = true;
  while (again) {
    again = false;
    for (const a of ACH) {
      if (p.ach[a.id]) continue;
      let ok = false; try { ok = a.ok(p.stats, p); } catch { ok = false; }
      if (!ok) continue;
      p.ach[a.id] = today();
      p.gold += a.g; p.stats.goldEarned += a.g;
      if (a.item && !p.owned.includes(a.item)) p.owned.push(a.item);
      out.push({ id: a.id, n: a.n, g: a.g, item: a.item ? BYID[a.item].n : null });
      again = true;            // altın/eşya başka başarımı tetikleyebilir
    }
  }
  return out;
}

/* ------------------------------------------------------------------ yerel liderlik */
function boardAdd(p, world, name, ms, me, date) {
  if (!WORLDS[world] || !name || !(ms > 0)) return;
  const list = p.board[world] = p.board[world] || [];
  const key = String(name).slice(0, 16);
  const cur = list.find(x => x.name === key);
  if (cur) { if (ms < cur.ms) { cur.ms = ms; cur.date = date || today(); } if (me) cur.me = true; }
  else list.push({ name: key, ms, date: date || today(), me: !!me });
  list.sort((a, b) => a.ms - b.ms);
  if (list.length > 15) list.length = 15;
}

/* ------------------------------------------------------------------ dışa aktar */
NS.shop = {
  RARITY, SLOTS, WORLDS, WORLD_IDS, CATALOG: C, BYID, CHARS, ACH, QUESTS, DEFAULT_LOOK, LOOK_KEYS, START_GOLD, DISCOUNT,
  hashStr, mulberry, today, fmtG, fmtMs,
  defaultProfile, fixProfile, load, save, sanitizeLook, botLook,
  dailyShop, priceOf, canBuy, buy, equip, unequip,
  ensureDaily, questInfo, calcReward, applyRace, checkAch, boardAdd
};
if (typeof module !== 'undefined' && module.exports) module.exports = NS.shop;
})(typeof window !== 'undefined' ? window : globalThis);
