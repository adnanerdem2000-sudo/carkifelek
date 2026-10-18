/* =========================================================================
   OYUN SALONU — UZAY EKİBİ
   Ortak bağırma oyunu. Herkesin ekranında rastgele düğme, şalter, sürgü,
   kadran ve tuş takımlarından oluşan bir kontrol paneli; ayrıca süresi
   azalan TEK bir komut vardır. Komut çoğunlukla başka birinin panelindedir:
   yüksek sesle bağırın! Doğru komutlar rotayı ilerletir, kaçanlar gövdeye
   zarar verir. Sektöre ulaşınca yeni panel, daha kısa süre. Gövde 0 = son.
   2–8 kişi online; tek cihazda 1 kişi + bilgisayar ekip arkadaşları.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial } = CFX;

/* ---------- yardımcılar ---------- */
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pickA = a => a[Math.floor(Math.random() * a.length)];
const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const upTR = s => String(s).toLocaleUpperCase('tr-TR');

/* ---------- teknogevezelik sözlüğü ---------- */
const ADJ = ['Kuantum', 'Plazma', 'Gravitasyonel', 'Nötron', 'Hiper', 'Turbo', 'Foton', 'İyonik', 'Manyetik', 'Kozmik', 'Antimadde', 'Nükleer',
  'Galaktik', 'Elektro', 'Termal', 'Sonik', 'Lazer', 'Holografik', 'Kristal', 'Takyon', 'Nebula', 'Süper', 'Mega', 'Mikro', 'Radyoaktif', 'Ultra',
  'Siber', 'Pozitronik', 'Spektral', 'Kuark', 'Fraktal', 'Yıldızsal', 'Paralel', 'Titreşimli', 'Yarı Kararlı', 'Çift Kutuplu', 'Ters Akışlı',
  'Dört Boyutlu', 'Elastik', 'Akışkan', 'Aerodinamik', 'Sentetik', 'Atomik', 'Sismik', 'Hidrolik', 'Pnömatik', 'Bükümlü', 'Fokurdayan'];
const FOODS = ['Simit', 'Turşu', 'Lahmacun', 'Kokoreç', 'Börek', 'Baklava', 'Mantı', 'Çaydanlık', 'Semaver', 'Pide', 'Kumpir', 'Döner', 'Ayran',
  'Lokum', 'Pestil', 'Sucuk', 'Pastırma', 'Midye', 'Kestane', 'Leblebi', 'Fındık', 'Kepçe', 'Cezve', 'Tespih', 'Terlik', 'Peynir', 'Helva',
  'Karpuz', 'Patlıcan', 'Pişmaniye', 'Gözleme', 'Menemen', 'Kavurma', 'Tavla', 'Kaşık', 'Tencere', 'Süzgeç', 'Oklava', 'Mısır', 'Salep', 'Boza',
  'Çiğ Köfte', 'İskender', 'Hamsi', 'Kumru', 'Aşure', 'Tulumba', 'Şalgam', 'Kaymak', 'Poğaça', 'Kadayıf', 'Künefe', 'Dolma', 'Sarma', 'Kurabiye'];
// iyelik ekli (-sı/-si) cihaz adları → "…Vanası'nı", "…Vanası'na"
const DEV = ['Vanası', 'Ayarı', 'Kolu', 'Düğmesi', 'Şalteri', 'Pompası', 'Bobini', 'Sigortası', 'Kadranı', 'Pedalı', 'Valfi', 'Motoru', 'Fanı',
  'Sensörü', 'Filtresi', 'Kondansatörü', 'Regülatörü', 'Rotoru', 'Pistonu', 'Anteni', 'Mıknatısı', 'Reaktörü', 'Devresi', 'Türbini', 'Modülatörü',
  'Jiroskopu', 'Ateşleyicisi', 'Dengeleyicisi', 'Isıtıcısı', 'Soğutucusu', 'Kapakçığı', 'Çarkı', 'Yayı', 'Mandalı', 'Hortumu', 'Kablosu',
  'Pervanesi', 'Göstergesi', 'Tetiği', 'Kalkanı'];
const DIAL_SETS = [['Kıtır', 'Gevrek', 'Lokum', 'Hamur'], ['Mor', 'Fıstık', 'Turkuaz', 'Fuşya'], ['Hafif', 'Orta', 'Acılı', 'Ateş'],
  ['Alfa', 'Beta', 'Gama', 'Delta'], ['Çay', 'Kahve', 'Ayran', 'Şalgam'], ['Pıt', 'Fıs', 'Vın', 'Güm'], ['Kuzey', 'Doğu', 'Güney', 'Batı'], ['Bir', 'İki', 'Üç', 'Dört']];
const SW3_SETS = [['Geri', 'Dur', 'İleri'], ['Aşağı', 'Orta', 'Yukarı'], ['Soğuk', 'Ilık', 'Sıcak'], ['Kapalı', 'Rölanti', 'Turbo'], ['Sol', 'Merkez', 'Sağ'],
  ['Az', 'Biraz', 'Çok'], ['Mışıl', 'Pır', 'Vızz']];
const NCOL = 6;    // kontrol renk sayısı (CSS'te --c0..5)

/* ---------- Türkçe ekler (kesme işaretli, ünsüz yumuşaması yazılmaz) ---------- */
const VOW = 'aıoueiöüAIOUEİÖÜâ';
function lastVowel(w) { for (let i = w.length - 1; i >= 0; i--) { const ch = w[i]; if (VOW.includes(ch)) return ({ A: 'a', I: 'ı', O: 'o', U: 'u', E: 'e', İ: 'i', Ö: 'ö', Ü: 'ü', â: 'a' })[ch] || ch; } return 'e'; }
function acc(name, poss) {   // belirtme (-ı/-i/-u/-ü)
  const v = ({ a: 'ı', ı: 'ı', o: 'u', u: 'u', e: 'i', i: 'i', ö: 'ü', ü: 'ü' })[lastVowel(name)];
  return name + "'" + (poss ? 'n' : VOW.includes(name[name.length - 1]) ? 'y' : '') + v;
}
function dat(name, poss) {   // yönelme (-a/-e)
  const v = 'aıou'.includes(lastVowel(name)) ? 'a' : 'e';
  return name + "'" + (poss ? 'n' : VOW.includes(name[name.length - 1]) ? 'y' : '') + v;
}

/* ---------- zorluk ---------- */
const DIFF = {
  kolay:  { label: 'Kolay',  t0: 17, dec: .6, tmin: 8,   dmg: 7,  ctrl: [4, 4, 5], botD: [2000, 4200], hazGap: [26, 40], hazFrom: 3, ast: 7500 },
  normal: { label: 'Normal', t0: 13.5, dec: .7, tmin: 6.5, dmg: 9, ctrl: [4, 5, 5, 6], botD: [1500, 3400], hazGap: [17, 28], hazFrom: 2, ast: 6500 },
  cilgin: { label: 'Çılgın', t0: 10.5, dec: .6, tmin: 5,   dmg: 11, ctrl: [5, 6], botD: [1100, 2600], hazGap: [10, 18], hazFrom: 1, ast: 5500 }
};
const HAZ_NAMES = { ast: 'ASTEROİT', worm: 'SOLUCAN DELİĞİ', zap: 'ELEKTRİK ARIZASI', slime: 'UZAY SÜMÜĞÜ' };
const HAZ_ICON = { ast: '☄️', worm: '🌀', zap: '⚡', slime: '🟢' };
const HOLD_MS = 1400;

/* =========================================================================
   KURUCU TARAFI: kurallar
   ========================================================================= */
const isBot = (st, i) => !!(st.pl[i] && st.pl[i].isBot);
const onCount = st => st.on.filter(Boolean).length;
function D(st) { return DIFF[st.diff] || DIFF.normal; }
function ctrlCount(st, i) {
  const d = D(st); let c = d.ctrl[Math.min(st.sector - 1, d.ctrl.length - 1)];
  if (st.small[i]) c = Math.min(c, 5);
  return c;
}
function calcNeed(st) { return Math.max(2, onCount(st)) * (3 + st.sector) + 2; }
function insDur(st, c) {
  const d = D(st);
  const base = Math.max(d.tmin, d.t0 - d.dec * (st.sector - 1));
  return Math.round((base + (c.type === 'pad' || c.type === 'hold' ? 2 : 0) + (st.pl.length >= 6 ? 1 : 0)) * 1000);
}
function dmgOf(st, base) { return Math.max(3, Math.round(base * Math.min(1, 3.5 / Math.max(1, onCount(st))))); }

function makeName(st, usedNow, foodsNow) {
  for (let k = 0; k < 120; k++) {
    const food = pickA(FOODS);
    if (k < 70 && foodsNow.has(food)) continue;
    const r = Math.random(); let name, poss;
    if (r < .4) { name = pickA(ADJ) + ' ' + food; poss = false; }
    else if (r < .68) { name = food + ' ' + pickA(DEV); poss = true; }
    else { name = pickA(ADJ) + ' ' + food + ' ' + pickA(DEV); poss = true; }
    if (name.length > 27 || usedNow.has(name)) continue;
    if (k < 60 && st.usedNames.includes(name)) continue;
    usedNow.add(name); foodsNow.add(food);
    st.usedNames.push(name); if (st.usedNames.length > 400) st.usedNames.shift();
    return { name, poss };
  }
  for (const a of ADJ) for (const f of FOODS) { const name = a + ' ' + f; if (!usedNow.has(name)) { usedNow.add(name); return { name, poss: false }; } }
  return { name: 'Yedek Simit', poss: false };
}
function pickTypes(cnt) {
  const out = [], lim = { sld: 1, pad: 1, hold: 1 };
  for (const t of shuf(['btn', 'tog', 'sld', 'dial', 'sw3', 'hold', 'pad', 'tog', 'btn', 'sw3', 'dial'])) {
    if (out.length >= cnt) break;
    const have = out.filter(x => x === t).length;
    if (have >= (lim[t] || 2)) continue;
    out.push(t);
  }
  while (out.length < cnt) out.push(pickA(['btn', 'tog']));
  return out;
}
function makeCtrl(st, type, owner, usedNow, foodsNow) {
  const nm = makeName(st, usedNow, foodsNow);
  const c = { id: 'c' + (++st.cseq), owner, type, name: nm.name, poss: nm.poss, col: ri(0, NCOL - 1), val: 0 };
  if (type === 'tog') c.val = ri(0, 1);
  else if (type === 'sld') c.val = ri(0, 5);
  else if (type === 'dial') { c.labels = pickA(DIAL_SETS); c.val = ri(0, 3); }
  else if (type === 'sw3') { c.labels = pickA(SW3_SETS); c.val = ri(0, 2); }
  else if (type === 'pad') c.val = ri(10, 99);
  return c;
}
function genPanels(st) {
  st.ctrls = {}; st.panels = st.pl.map(() => []);
  const usedNow = new Set(), foodsNow = new Set();
  st.pl.forEach((p, i) => {
    for (const tp of pickTypes(ctrlCount(st, i))) { const c = makeCtrl(st, tp, i, usedNow, foodsNow); st.ctrls[c.id] = c; st.panels[i].push(c.id); }
  });
}
function pickTarget(c) {
  const other = (lo, hi) => { let v; do v = ri(lo, hi); while (v === c.val); return v; };
  switch (c.type) {
    case 'tog': return 1 - c.val;
    case 'sld': return other(0, 5);
    case 'dial': return other(0, 3);
    case 'sw3': return other(0, 2);
    case 'pad': return other(10, 99);
    default: return null;   // btn, hold: basmak yeter
  }
}
function insText(c, tgt) {
  switch (c.type) {
    case 'btn': return `{${dat(c.name, c.poss)}} [BAS]!`;
    case 'hold': return `{${dat(c.name, c.poss)}} [BASILI TUT]!`;
    case 'tog': return `{${acc(c.name, c.poss)}} [${tgt ? 'AÇ' : 'KAPAT'}]!`;
    case 'sld': return `{${acc(c.name, c.poss)}} [${tgt}] yap!`;
    case 'dial': return `{${acc(c.name, c.poss)}} [${upTR(c.labels[tgt])}] yap!`;
    case 'sw3': return `{${acc(c.name, c.poss)}} [${upTR(c.labels[tgt])}] konumuna al!`;
    case 'pad': return `{${dat(c.name, c.poss)}} [${tgt}] gir!`;
  }
  return '';
}
const plain = t => String(t || '').replace(/[{}[\]]/g, '');
function validVal(c, v) {
  if (c.type === 'btn' || c.type === 'hold') return 0;
  if (typeof v !== 'number' || !Number.isInteger(v)) return undefined;
  const hi = { tog: 1, sld: 5, dial: 3, sw3: 2, pad: 99 }[c.type];
  return v >= 0 && v <= hi ? v : undefined;
}

// zamanlayıcı: mutlak zamana göre, st.tk değişirse (geri yükleme) boşa düşer
function at(st, ctx, t, fn) { const tk = st.tk; ctx.later(Math.max(0, t - Date.now()), () => { if (st.tk === tk) fn(); }); }

function newIns(st, ctx, i) {
  if (st.phase !== 'play' || !st.on[i] || st.ins[i]) return;
  const busy = new Set(st.ins.filter(Boolean).map(x => x.cid));
  const cands = Object.values(st.ctrls).filter(c => st.on[c.owner] && !busy.has(c.id) && c.id !== st.prevC[i]);
  if (!cands.length) { st.nextAt[i] = Date.now() + 900; armNext(st, ctx, i); return; }
  const others = cands.filter(c => c.owner !== i), own = cands.filter(c => c.owner === i);
  const pool = others.length && (!own.length || Math.random() < .75) ? others : own;
  const c = pickA(pool), tgt = pickTarget(c), now = Date.now();
  const ins = { id: ++st.iseq, by: i, cid: c.id, tgt, t0: now, t1: now + insDur(st, c), txt: insText(c, tgt), heard: false };
  st.ins[i] = ins; st.res[i] = null; st.prevC[i] = c.id;
  armIns(st, ctx, ins);
  if (isBot(st, c.owner)) botHandle(st, ctx, ins, false);
}
function armIns(st, ctx, ins) {
  at(st, ctx, ins.t1, () => { const cur = st.ins[ins.by]; if (cur && cur.id === ins.id && st.phase === 'play') expire(st, ctx, ins.by); });
}
function armNext(st, ctx, i) {
  const sec = st.sector;
  at(st, ctx, st.nextAt[i] || Date.now(), () => { if (st.sector === sec && st.phase === 'play' && !st.ins[i]) { newIns(st, ctx, i); ctx.sync(); } });
}
function queueNext(st, ctx, i, ms) { st.nextAt[i] = Date.now() + ms; armNext(st, ctx, i); }

function expire(st, ctx, i) {
  const ins = st.ins[i]; if (!ins) return;
  st.ins[i] = null; st.res[i] = { k: 'miss', at: Date.now() }; st.missed++;
  const c = st.ctrls[ins.cid];
  const dmg = dmgOf(st, D(st).dmg);
  ctx.emit({ t: 'miss', by: i, dmg }, `⏱ ${st.pl[i].name}'in komutu kaçtı! Gövde −${dmg}`, 'bad');
  if (c) c.missed = (c.missed || 0) + 1;
  damage(st, ctx, dmg);
  if (st.phase === 'play') queueNext(st, ctx, i, 1000);
  ctx.sync();
}
function complete(st, ctx, ins, doer) {
  st.ins[ins.by] = null; st.res[ins.by] = { k: 'ok', at: Date.now() };
  st.prog++; st.done[doer]++; st.given[ins.by]++; st.total++;
  ctx.emit({ t: 'ok', by: ins.by, doer });
  if (st.prog >= st.need) { warp(st, ctx); return; }
  queueNext(st, ctx, ins.by, 650);
}
function doSet(st, ctx, pi, c, v) {
  if (c.type === 'btn' || c.type === 'hold') c.val++;
  else { if (c.val === v) return false; c.val = v; }
  if (st.phase === 'play') {
    for (const ins of st.ins.slice()) {
      if (!ins || ins.cid !== c.id || st.phase !== 'play') continue;
      if (ins.tgt == null || ins.tgt === c.val) complete(st, ctx, ins, pi);
    }
  }
  return true;
}
function damage(st, ctx, n) {
  st.hull = Math.max(0, st.hull - n);
  if (st.hull <= 0 && st.phase !== 'end') gameOver(st, ctx);
}

/* ---------- sektör geçişi ---------- */
function clearLive(st) {
  st.ins = st.pl.map(() => null); st.res = st.pl.map(() => null); st.fx = st.pl.map(() => null); st.ast = null;
}
function warp(st, ctx, first) {
  clearLive(st);
  if (!first) { st.sector++; st.hull = Math.min(100, st.hull + 15); }
  genPanels(st);
  st.prog = 0; st.need = calcNeed(st);
  st.phase = 'warp'; st.endAt = Date.now() + (first ? 3600 : 4200); st.dur = st.endAt - Date.now();
  if (!first) ctx.emit({ t: 'warp', s: st.sector }, `🚀 Ekip ${st.sector}. sektöre ulaştı! Gövde onarıldı (+15).`, 'gold');
  else ctx.emit({ t: 'start' }, '🚀 Kalkış! Komutları ekibe bağırın.', 'gold');
  armPhase(st, ctx);
  ctx.sync();
}
function startPlay(st, ctx) {
  st.phase = 'play'; st.endAt = 0;
  const now = Date.now();
  st.pl.forEach((p, i) => { if (st.on[i]) { st.nextAt[i] = now + 300 + i * 350 + ri(0, 500); armNext(st, ctx, i); } });
  scheduleHaz(st, ctx);
  ctx.sync();
}
function gameOver(st, ctx) {
  clearLive(st);
  st.phase = 'end'; st.endAt = Date.now() + 2800;
  ctx.emit({ t: 'boom' }, `💥 Gövde parçalandı! Ekip ${st.sector}. sektörde kaldı.`, 'bad');
  armPhase(st, ctx);
}
function finish(st, ctx) {
  if (st.over) return; st.over = true;
  const order = st.pl.map((_, i) => i).sort((a, b) => st.done[b] - st.done[a] || st.given[b] - st.given[a]);
  ctx.end({
    title: `Ekip ${st.sector}. sektöre ulaştı!`,
    ranking: order.map(i => ({ pi: i, score: st.done[i], label: `${st.done[i]} görev` })),
    note: `${D(st).label} zorluk · ${st.total} komut tamamlandı, ${st.missed} komut kaçtı. Sıralama: kendi panelinde tamamlanan komut sayısı.`
  });
}
function armPhase(st, ctx) {
  if (st.phase === 'warp') { const s = st.sector; at(st, ctx, st.endAt, () => { if (st.phase === 'warp' && st.sector === s) startPlay(st, ctx); }); }
  else if (st.phase === 'end') at(st, ctx, st.endAt, () => finish(st, ctx));
}

/* ---------- tehlikeler ---------- */
function scheduleHaz(st, ctx) {
  const d = D(st);
  if (!st.haz || st.sector < d.hazFrom || st.phase !== 'play') { st.hazAt = 0; return; }
  st.hazAt = Date.now() + rnd(d.hazGap[0], d.hazGap[1]) * 1000;
  armHaz(st, ctx);
}
function armHaz(st, ctx) {
  if (!st.hazAt) return;
  const sec = st.sector, when = st.hazAt;
  at(st, ctx, when, () => { if (st.phase === 'play' && st.sector === sec && st.hazAt === when) { fireHaz(st, ctx); scheduleHaz(st, ctx); ctx.sync(); } });
}
function fireHaz(st, ctx, kind) {
  if (st.phase !== 'play') return;
  const now = Date.now(), d = D(st);
  const k = kind || pickA(['ast', 'worm', 'zap', 'slime'].filter(x => x !== st.lastHaz));
  st.lastHaz = k;
  if (k === 'ast') {
    if (st.ast) return;
    st.ast = { id: ++st.iseq, t0: now, t1: now + d.ast, ok: st.pl.map((_, i) => !st.on[i]) };
    ctx.emit({ t: 'haz', k }, '☄️ Asteroit yağmuru! Herkes YATIR düğmesine bassın!', 'bad');
    const id = st.ast.id;
    at(st, ctx, st.ast.t1, () => { if (st.ast && st.ast.id === id) { resolveAst(st, ctx); ctx.sync(); } });
    st.pl.forEach((p, i) => { if (p.isBot && st.on[i] && Math.random() < .96) at(st, ctx, now + rnd(700, Math.min(3200, d.ast - 900)), () => { if (st.ast && st.ast.id === id) yat(st, ctx, i); }); });
    return;
  }
  const free = st.pl.map((_, i) => i).filter(i => st.on[i] && !st.fx[i]);
  if (!free.length) return;
  const want = Math.min(free.length, st.pl.length >= 4 ? 2 : 1), who = [];
  const bag = []; free.forEach(i => { for (let w = 0; w < (isBot(st, i) ? 1 : 3); w++) bag.push(i); });
  while (who.length < want && bag.length) { const i = pickA(bag); if (!who.includes(i)) who.push(i); for (let j = bag.length - 1; j >= 0; j--) if (bag[j] === i) bag.splice(j, 1); }
  const dur = k === 'slime' ? 16000 : 9000;
  who.forEach(i => {
    const fx = { k, t1: now + dur, seed: ri(1, 1e9) };
    st.fx[i] = fx;
    at(st, ctx, fx.t1, () => { if (st.fx[i] && st.fx[i].seed === fx.seed) { st.fx[i] = null; ctx.sync(); } });
  });
  const names = who.map(i => st.pl[i].name).join(', ');
  const line = { worm: `🌀 Solucan deliği! ${names} panelindeki harfler karıştı.`, zap: `⚡ Elektrik arızası! ${names} paneli titriyor.`, slime: `🟢 Uzay sümüğü! ${names} ekranını silmeli.` }[k];
  ctx.emit({ t: 'haz', k, who }, line, 'bad');
}
function yat(st, ctx, i) {
  if (!st.ast || st.ast.ok[i]) return;
  st.ast.ok[i] = true;
  ctx.emit({ t: 'yat', pi: i });
  if (st.ast.ok.every((o, j) => o || !st.on[j])) resolveAst(st, ctx);
  ctx.sync();
}
function resolveAst(st, ctx) {
  const a = st.ast; if (!a) return;
  st.ast = null;
  const miss = st.pl.map((_, i) => i).filter(i => st.on[i] && !a.ok[i]);
  if (!miss.length) { ctx.emit({ t: 'astok' }, '☄️ Herkes yattı, asteroitler sıyırıp geçti!', 'good'); return; }
  const dmg = Math.min(25, dmgOf(st, 7) * miss.length);
  ctx.emit({ t: 'asthit', dmg, who: miss }, `☄️ Asteroit çarptı! Yatmayan: ${miss.map(i => st.pl[i].name).join(', ')} · Gövde −${dmg}`, 'bad');
  damage(st, ctx, dmg);
}

/* ---------- bilgisayar ekip arkadaşları ---------- */
// Panelinde komut olan bilgisayar biraz sonra yapar. İnsanın komutunu "BAĞIR" ile duyurursa çok daha hızlı.
function botHandle(st, ctx, ins, shouted) {
  const c = st.ctrls[ins.cid]; if (!c || !isBot(st, c.owner)) return;
  const b = c.owner, d = D(st);
  let delay = rnd(d.botD[0], d.botD[1]) + (st.fx[b] ? 1500 : 0);
  if (shouted) delay = rnd(600, 1500);
  else {
    if (!isBot(st, ins.by)) delay += 3200;       // bağırılmayan insan komutu: geç duyar
    if (Math.random() < .04) return;               // arada bir hiç duymaz
  }
  at(st, ctx, Date.now() + delay, () => {
    const cur = st.ins[ins.by]; if (!cur || cur.id !== ins.id || st.phase !== 'play') return;
    const cc = st.ctrls[ins.cid]; if (!cc || !st.on[b]) return;
    doSet(st, ctx, b, cc, ins.tgt == null ? 0 : ins.tgt);
    ctx.sync();
  });
}

/* ---------- hamleler ---------- */
function action(st, pi, a, ctx) {
  if (!a || st.phase === 'end' || st.over) return;
  switch (a.t) {
    case 'set': {
      if (st.phase !== 'play' && st.phase !== 'warp') return;
      const c = st.ctrls[a.cid]; if (!c || c.owner !== pi || !st.on[pi]) return;
      const v = validVal(c, a.v); if (v === undefined) return;
      if (doSet(st, ctx, pi, c, v)) ctx.sync();
      return;
    }
    case 'yat': if (st.phase === 'play') yat(st, ctx, pi); return;
    case 'shout': {
      const ins = st.ins[pi]; if (st.phase !== 'play' || !ins || ins.heard) return;
      ins.heard = true;
      const c = st.ctrls[ins.cid], owner = c ? c.owner : -1;
      const reply = owner === pi ? 'sen' : isBot(st, owner) ? 'var' : 'yok';
      ctx.emit({ t: 'shout', by: pi, reply, from: reply === 'var' ? owner : -1 });
      if (reply === 'var') botHandle(st, ctx, ins, true);
      ctx.sync();
      return;
    }
    case 'small': {
      const on = !!a.on; if (st.small[pi] === on) return;
      st.small[pi] = on;
      // ilk kalkıştan önce gelirse paneli hemen küçült (komut yokken güvenli)
      if (st.phase === 'warp' && st.panels[pi] && st.panels[pi].length > ctrlCount(st, pi)) {
        while (st.panels[pi].length > ctrlCount(st, pi)) { const id = st.panels[pi].pop(); delete st.ctrls[id]; }
        ctx.sync();
      }
      return;
    }
    default: return;
  }
}

/* ---------- görünüm (her izleyici yalnız kendi panelini/komutunu görür) ---------- */
function view(st, viewer) {
  const me = typeof viewer === 'number' && viewer >= 0 && viewer < st.pl.length ? viewer : -1;
  const v = {
    phase: st.phase, sector: st.sector, hull: st.hull, prog: st.prog, need: st.need, diff: st.diff, endAt: st.endAt, dur: st.dur,
    total: st.total, missed: st.missed, bots: st.pl.some(p => p.isBot), me,
    crew: st.pl.map((p, i) => ({ name: p.name, color: p.color, bot: !!p.isBot, on: st.on[i], done: st.done[i], fx: st.fx[i] ? st.fx[i].k : null, yat: st.ast ? !!st.ast.ok[i] : null }))
  };
  if (me >= 0) {
    v.panel = st.panels[me].map(id => { const c = st.ctrls[id]; return { id, type: c.type, name: c.name, col: c.col, val: c.val, labels: c.labels || null }; });
    v.pkey = st.sector + ':' + st.panels[me].join(',');
    const ins = st.ins[me];
    v.ins = ins ? { id: ins.id, txt: ins.txt, t0: ins.t0, t1: ins.t1, heard: ins.heard } : null;
    v.res = st.res[me];
    v.calls = st.ins.map((x, j) => (x && j !== me && isBot(st, j) && st.ctrls[x.cid] && st.ctrls[x.cid].owner === me) ? { id: x.id, from: j, txt: x.txt, t0: x.t0, t1: x.t1 } : null).filter(Boolean);
    v.fx = st.fx[me];
  } else { v.panel = null; v.ins = null; v.calls = []; v.fx = null; }
  v.ast = st.ast ? { id: st.ast.id, t0: st.ast.t0, t1: st.ast.t1, mine: me >= 0 ? !!st.ast.ok[me] : true,
    n: st.ast.ok.filter((o, i) => o && st.on[i]).length, of: onCount(st) } : null;
  return v;
}

function setup(players, opts) {
  const st = {
    pl: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })),
    on: players.map(() => true), small: players.map(() => false),
    diff: DIFF[opts.zorluk] ? opts.zorluk : 'normal', haz: opts.tehlike !== 'kapali',
    phase: 'warp', sector: 1, hull: 100, prog: 0, need: 0, endAt: 0, dur: 0, tk: 0,
    ctrls: {}, panels: [], usedNames: [], cseq: 0, iseq: 0,
    ins: [], res: [], fx: [], ast: null, prevC: players.map(() => null), nextAt: players.map(() => 0),
    done: players.map(() => 0), given: players.map(() => 0), total: 0, missed: 0, hazAt: 0, lastHaz: null, over: false
  };
  return st;
}

/* =========================================================================
   ÇİZİM (her cihaz)
   ========================================================================= */
let root = null, ui = null, V = null, M = null;
let pkey = '', lov = {}, timerT = null, kp = null, hold = null, wiped = {}, lastBeep = -1, lastAst = 0, lastRes = null, lastWarpS = 0;
let stars = null;
const q = s => root && root.querySelector(s);
const qa = s => root ? [...root.querySelectorAll(s)] : [];
const lowAnim = () => document.body.classList.contains('anim-low') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmtTxt = t => esc(t).replace(/\{([^}]*)\}/g, '<b>$1</b>').replace(/\[([^\]]*)\]/g, '<em>$1</em>');

/* ---------- sesler (CFX.Sound üstüne kısa mekanik tıkırtılar) ---------- */
function sfx(k, x) {
  try {
    if (!Sound.ok('uz' + k, 30)) return;
    switch (k) {
      case 'tog': Sound.noise(.05, { filter: 'highpass', freq: 3200, gain: .4 }); Sound.tone(170, .07, { type: 'square', gain: .12 }); Sound.tone(x ? 900 : 600, .06, { type: 'triangle', gain: .12, when: .03 }); break;
      case 'btn': Sound.tone(560, .09, { type: 'square', gain: .1, slide: 280 }); Sound.noise(.05, { freq: 1800, gain: .25 }); break;
      case 'sld': Sound.tone(520 + (x || 0) * 130, .06, { type: 'triangle', gain: .2 }); Sound.noise(.025, { filter: 'highpass', freq: 4000, gain: .2 }); break;
      case 'dial': Sound.noise(.035, { filter: 'highpass', freq: 5200, gain: .35 }); Sound.tone(1250, .03, { type: 'square', gain: .05 }); break;
      case 'sw3': Sound.noise(.07, { filter: 'bandpass', freq: 1100, q: 1, gain: .45 }); Sound.tone(130, .09, { type: 'square', gain: .1 }); break;
      case 'key': Sound.tone(1320 + (x || 0) * 40, .06, { type: 'sine', gain: .16 }); break;
      case 'holdt': Sound.tone(300 + (x || 0) * 500, .07, { type: 'sawtooth', gain: .05 }); break;
      case 'holdok': Sound.tone(660, .1, { type: 'square', gain: .08 }); Sound.tone(1320, .18, { type: 'triangle', gain: .14, when: .07 }); break;
      case 'yat': Sound.tone(110, .3, { type: 'sawtooth', gain: .14, slide: 60 }); Sound.noise(.25, { filter: 'lowpass', freq: 500, gain: .4 }); break;
      case 'alarm': Sound.tone(880, .12, { type: 'square', gain: .08 }); Sound.tone(660, .12, { type: 'square', gain: .08, when: .14 }); break;
      case 'beep': Sound.tone(1760, .05, { type: 'square', gain: .05 }); break;
      case 'wipe': Sound.noise(.12, { filter: 'bandpass', freq: 700, q: .8, gain: .25 }); break;
      case 'boom': Sound.noise(1.2, { filter: 'lowpass', freq: 380, gain: .9, decayPow: 1.4 }); Sound.tone(90, 1, { type: 'sawtooth', gain: .15, slide: 30 }); break;
    }
  } catch { /* ses yoksa sessiz */ }
}

/* ---------- yıldız alanı (normalde süzülür, sektör geçişinde ışık hızı) ---------- */
function starsInit(cv) {
  const S = { cv, ctx: cv.getContext('2d'), list: [], speed: .06, target: .06, raf: 0, last: 0, w: 0, h: 0 };
  for (let i = 0; i < 150; i++) S.list.push({ x: rnd(-1, 1), y: rnd(-1, 1), z: rnd(.05, 1), pz: 0 });
  const resize = () => { S.w = cv.width = Math.max(1, innerWidth); S.h = cv.height = Math.max(1, innerHeight); };
  resize(); S.resize = resize; addEventListener('resize', resize);
  const loop = t => {
    S.raf = requestAnimationFrame(loop);
    const dt = Math.min(.06, (t - (S.last || t)) / 1000); S.last = t;
    if (document.hidden) return;
    const low = lowAnim();
    S.speed += (S.target - S.speed) * Math.min(1, dt * 2.2);
    const sp = low ? Math.min(S.speed, .1) : S.speed;
    const c = S.ctx, w = S.w, h = S.h, cx = w / 2, cy = h * .42, sc = Math.max(w, h) * .55;
    const warpy = sp > .4;
    c.globalAlpha = warpy ? .38 : 1; c.fillStyle = '#060216'; c.fillRect(0, 0, w, h); c.globalAlpha = 1;
    if (!warpy) {
      const g = c.createRadialGradient(cx * .5, cy * .6, 0, cx * .5, cy * .6, sc * .9);
      g.addColorStop(0, 'rgba(139,61,255,.20)'); g.addColorStop(1, 'rgba(139,61,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const g2 = c.createRadialGradient(w * .85, h * .8, 0, w * .85, h * .8, sc * .8);
      g2.addColorStop(0, 'rgba(25,227,208,.12)'); g2.addColorStop(1, 'rgba(25,227,208,0)'); c.fillStyle = g2; c.fillRect(0, 0, w, h);
    }
    for (const s of S.list) {
      s.pz = s.z; s.z -= sp * dt;
      if (s.z <= .02) { s.x = rnd(-1, 1); s.y = rnd(-1, 1); s.z = 1; s.pz = 1; continue; }
      const x = cx + s.x / s.z * sc * .5, y = cy + s.y / s.z * sc * .5;
      if (x < -20 || x > w + 20 || y < -20 || y > h + 20) { s.x = rnd(-1, 1); s.y = rnd(-1, 1); s.z = 1; s.pz = 1; continue; }
      const b = Math.min(1, (1 - s.z) * 1.4);
      if (warpy) {
        const px = cx + s.x / s.pz * sc * .5, py = cy + s.y / s.pz * sc * .5;
        c.strokeStyle = `rgba(${180 + (s.x > 0 ? 60 : 0)},${220},255,${b})`; c.lineWidth = 1 + (1 - s.z) * 2.2;
        c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke();
      } else {
        c.fillStyle = `rgba(230,225,255,${b})`; const r = (1 - s.z) * 1.9 + .3; c.fillRect(x - r / 2, y - r / 2, r, r);
      }
    }
  };
  S.raf = requestAnimationFrame(loop);
  S.stop = () => { cancelAnimationFrame(S.raf); removeEventListener('resize', resize); };
  return S;
}

/* ---------- kontrol HTML'i ---------- */
function scramble(name, seed) {
  let s = seed || 1; const r = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  return name.split(' ').map(w => { const a = [...w]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.join(''); }).join(' ');
}
function ctrlBody(c) {
  switch (c.type) {
    case 'btn': return `<button type="button" class="uz-btn" data-act="press" aria-label="${esc(c.name)}: bas"><span></span></button>`;
    case 'tog': return `<button type="button" class="uz-tog" data-act="tog" aria-label="${esc(c.name)}: aç/kapat"><span class="uz-tog-led"></span><span class="uz-tog-slot"><i></i></span><small class="uz-tog-txt"></small></button>`;
    case 'sld': return `<div class="uz-sld" role="group" aria-label="${esc(c.name)}">${[0, 1, 2, 3, 4, 5].map(k => `<button type="button" data-act="sld" data-v="${k}" aria-label="${k}"><i></i><b>${k}</b></button>`).join('')}</div>`;
    case 'dial': return `<div class="uz-dial"><button type="button" class="uz-arr" data-act="dial" data-d="-1" aria-label="Geri çevir">◀</button>
      <button type="button" class="uz-knob" data-act="dial" data-d="1" aria-label="${esc(c.name)}: çevir"><i></i></button>
      <button type="button" class="uz-arr" data-act="dial" data-d="1" aria-label="İleri çevir">▶</button></div><div class="uz-lcd uz-dial-lcd"></div>`;
    case 'sw3': return `<div class="uz-sw3"><span class="uz-sw3-track"><i></i></span>${c.labels.map((l, k) => `<button type="button" data-act="sw3" data-v="${k}">${esc(l)}</button>`).join('')}</div>`;
    case 'hold': return `<button type="button" class="uz-hold" aria-label="${esc(c.name)}: basılı tut"><i></i><span>BASILI TUT</span></button>`;
    case 'pad': return `<div class="uz-padc"><div class="uz-lcd uz-pad-lcd"></div><button type="button" class="uz-padbtn" data-act="pad">⌨ TUŞLA</button></div>`;
  }
  return '';
}
function curVal(c) { const o = lov[c.id]; return o && o.until > performance.now() ? o.v : c.val; }
function updCtrl(el, c) {
  const v = curVal(c);
  switch (c.type) {
    case 'tog': el.classList.toggle('on', v === 1); el.querySelector('.uz-tog-txt').textContent = v ? 'AÇIK' : 'KAPALI'; break;
    case 'sld': el.querySelectorAll('.uz-sld button').forEach((b, k) => { b.classList.toggle('f', k <= v); b.classList.toggle('cur', k === v); }); break;
    case 'dial': el.querySelector('.uz-knob').style.setProperty('--r', (-135 + v * 90) + 'deg'); el.querySelector('.uz-dial-lcd').textContent = upTR(c.labels[v]); el.dataset.v = v; break;
    case 'sw3': el.querySelector('.uz-sw3').dataset.v = v; el.querySelectorAll('.uz-sw3 button').forEach((b, k) => b.classList.toggle('cur', k === v)); break;
    case 'pad': el.querySelector('.uz-pad-lcd').textContent = String(v).padStart(2, '0'); break;
  }
}

/* ---------- render parçaları ---------- */
function renderCrew(v) {
  const el = q('.uz-crew'), many = v.crew.length > 4;
  el.classList.toggle('many', many);
  el.innerHTML = v.crew.map((p, i) => `<div class="uz-mate ${i === v.me ? 'me' : ''} ${p.on ? '' : 'off'} ${p.fx ? 'hit' : ''} ${p.yat ? 'yat' : ''}" style="--pc:${p.color}" title="${esc(p.name)}">
    <span class="av" style="--pc:${p.color}">${p.bot ? '🤖' : esc(initial(p.name))}</span><b>${esc(p.name)}</b>
    <span class="uz-done" title="Panelinde tamamlanan">✓${p.done}</span>${p.fx ? `<span class="uz-mfx">${HAZ_ICON[p.fx]}</span>` : ''}${p.yat ? '<span class="uz-mfx">🛡️</span>' : ''}${p.on ? '' : '<span class="uz-mfx">📴</span>'}</div>`).join('');
}
function renderHud(v) {
  q('.uz-sec b').textContent = v.sector;
  const hull = q('.uz-hull'); hull.style.setProperty('--f', v.hull / 100); q('.uz-hull em').textContent = v.hull;
  hull.classList.toggle('mid', v.hull <= 60 && v.hull > 30); hull.classList.toggle('low', v.hull <= 30);
  q('.uz-prog').style.setProperty('--f', v.need ? Math.min(1, v.prog / v.need) : 0); q('.uz-prog em').textContent = `${v.prog}/${v.need}`;
  q('.uz-diff').textContent = (DIFF[v.diff] || DIFF.normal).label;
}
function renderCmd(v) {
  const box = q('.uz-cmd'), txt = q('.uz-cmd-txt'), tag = q('.uz-cmd-tag'), sh = q('.uz-shout');
  let key, cls = '';
  if (v.me < 0) { key = 'spec'; tag.textContent = '👀 İZLEYİCİ'; txt.innerHTML = 'Ekip panelleri gizli. Gövde ve rotayı izliyorsun.'; }
  else if (v.phase === 'warp') { key = 'warp' + v.sector; tag.textContent = '🚀 IŞIK HIZI'; txt.innerHTML = v.sector === 1 && !v.total && !v.missed ? 'Yeni panelini tanı! Komutlar birazdan gelecek.' : `<b>${v.sector}. sektöre</b> atlanıyor… Yeni paneline göz at!`; }
  else if (v.phase === 'end') { key = 'end'; cls = 'miss'; tag.textContent = '💥 HASAR'; txt.innerHTML = 'Gövde parçalandı!'; }
  else if (v.ins) { key = 'i' + v.ins.id; cls = 'live'; tag.textContent = '📟 KOMUT'; txt.innerHTML = fmtTxt(v.ins.txt); }
  else if (v.res && v.res.k === 'ok') { key = 'ok' + v.res.at; cls = 'ok'; tag.textContent = '✅ TAMAM'; txt.innerHTML = '<b>Harika!</b> Komut uygulandı.'; }
  else if (v.res && v.res.k === 'miss') { key = 'mi' + v.res.at; cls = 'miss'; tag.textContent = '⏱ KAÇTI'; txt.innerHTML = '<b>Geç kaldınız!</b> Gövde hasar aldı.'; }
  else { key = 'wait'; tag.textContent = '📟 KOMUT'; txt.innerHTML = 'Yeni komut geliyor…'; }
  if (box.dataset.key !== key) { box.dataset.key = key; box.className = 'uz-cmd ' + cls; void box.offsetWidth; box.classList.add('pop'); }
  sh.hidden = !(v.bots && v.ins && v.phase === 'play');
  sh.disabled = !!(v.ins && v.ins.heard);
  sh.textContent = v.ins && v.ins.heard ? '📢 BAĞIRDIN' : '📢 BAĞIR';
}
function renderCalls(v) {
  const el = q('.uz-calls');
  const ids = (v.calls || []).map(c => c.id).join(',');
  if (el.dataset.ids === ids) return;
  const old = new Set((el.dataset.ids || '').split(',').filter(Boolean));
  el.dataset.ids = ids;
  el.innerHTML = (v.calls || []).map(c => { const p = v.crew[c.from] || {}; return `<div class="uz-call ${old.has(String(c.id)) ? '' : 'new'}" data-t0="${c.t0}" data-t1="${c.t1}" style="--pc:${p.color || '#fff'}">
    <span class="av" style="--pc:${p.color || '#fff'}">🤖</span><p><small>${esc(p.name || '')} bağırıyor:</small>${fmtTxt(c.txt)}</p><i class="uz-cbar"><i></i></i></div>`; }).join('');
  if ((v.calls || []).some(c => !old.has(String(c.id)))) sfx('alarm');
}
function renderPanel(v) {
  const panel = q('.uz-panel'), grid = q('.uz-grid');
  panel.classList.toggle('spec', !v.panel);
  if (!v.panel) { if (pkey !== 'spec') { pkey = 'spec'; grid.innerHTML = '<p class="uz-specmsg">🛰️ İzleyici modu: kontrol panelleri yalnız ekip üyelerinde görünür.</p>'; } return; }
  if (v.pkey !== pkey) {
    pkey = v.pkey; lov = {}; closeKp(); cancelHold();
    const ones = v.panel.filter(c => c.type !== 'sld').length;
    grid.innerHTML = v.panel.map((c, k) => `<div class="uz-c uz-t-${c.type} ${c.type === 'sld' ? 'wide' : ''} ${(c.type !== 'sld' && ones % 2 === 1 && v.panel.slice(k + 1).every(x => x.type === 'sld')) ? 'lastodd' : ''}" data-cid="${c.id}" style="--cc:var(--uz-c${c.col})">
      <span class="uz-rv" aria-hidden="true"></span><div class="uz-name"></div><div class="uz-body">${ctrlBody(c)}</div></div>`).join('');
    grid.dataset.n = v.panel.length;
    if (v.phase === 'warp' && v.sector > 1) panel.classList.add('fresh');
    setTimeout(() => panel && panel.classList.remove('fresh'), 1400);
  }
  const worm = v.fx && v.fx.k === 'worm';
  v.panel.forEach(c => {
    const el = grid.querySelector(`[data-cid="${c.id}"]`); if (!el) return;
    el.querySelector('.uz-name').textContent = worm ? scramble(c.name, v.fx.seed + c.id.length * 7 + c.id.charCodeAt(c.id.length - 1)) : c.name;
    updCtrl(el, c);
  });
  panel.classList.toggle('worm', !!worm);
  panel.classList.toggle('zap', !!(v.fx && v.fx.k === 'zap'));
}
function renderFx(v) {
  const lay = q('.uz-fx');
  const slime = v.fx && v.fx.k === 'slime' && !wiped[v.fx.seed] ? v.fx : null;
  const key = slime ? String(slime.seed) : '';
  if (lay.dataset.key === key) return;
  lay.dataset.key = key;
  if (!slime) { lay.innerHTML = ''; return; }
  let s = slime.seed; const r = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const n = 6;
  lay.innerHTML = Array.from({ length: n }, (_, k) => {
    const x = 2 + ((k % 3) * 32) + r() * 10, y = 4 + Math.floor(k / 3) * 46 + r() * 18, sz = 30 + r() * 12;
    return `<div class="uz-blob" data-hp="100" style="left:${x}%;top:${y}%;width:${sz}%;--rot:${Math.round(r() * 360)}deg"><i></i><i></i><i></i></div>`;
  }).join('') + '<div class="uz-fxhint">🖐 Sümüğü sil! Parmağını sürt.</div>';
}
function renderAst(v) {
  const ov = q('.uz-ast');
  if (!v.ast || v.phase !== 'play') { ov.hidden = true; return; }
  ov.hidden = false;
  ov.classList.toggle('done', v.ast.mine);
  q('.uz-ast-n').textContent = `${v.ast.n}/${v.ast.of} yattı`;
  q('.uz-yat').disabled = v.ast.mine;
  q('.uz-yat').innerHTML = v.ast.mine ? '🛡️ YATTIN!' : 'YATIR!';
}
function renderWarp(v) {
  const w = q('.uz-warp');
  const show = v.phase === 'warp' || v.phase === 'end';
  w.hidden = !show;
  M.classList.toggle('warping', v.phase === 'warp');
  M.classList.toggle('dead', v.phase === 'end');
  if (stars) stars.target = v.phase === 'warp' ? 1.9 : v.phase === 'end' ? .01 : .06;
  if (!show) return;
  if (v.phase === 'warp') {
    const first = v.sector === 1 && !v.total && !v.missed;
    q('.uz-warp-big').textContent = first ? 'KALKIŞ!' : `SEKTÖR ${v.sector}`;
    q('.uz-warp-sub').textContent = first ? 'Komutlarını ekibe yüksek sesle bağır!' : `Gövde onarıldı +15 · ${v.need} komut gerekli`;
  } else {
    q('.uz-warp-big').textContent = '💥 GÖVDE GİTTİ!';
    q('.uz-warp-sub').textContent = `Ekip ${v.sector}. sektöre ulaştı`;
  }
}

/* ---------- zaman göstergeleri ---------- */
function tick() {
  if (!root || !V) return;
  const now = ui.hostNow();
  const bar = q('.uz-tbar i'), sec = q('.uz-cmd-sec');
  if (V.ins && V.phase === 'play') {
    const left = Math.max(0, V.ins.t1 - now), f = Math.max(0, Math.min(1, left / Math.max(1, V.ins.t1 - V.ins.t0)));
    bar.style.transform = `scaleX(${f})`; bar.parentElement.classList.toggle('low', f < .3);
    const s = Math.ceil(left / 1000); sec.textContent = s; sec.hidden = false;
    if (f < .3 && s > 0 && s !== lastBeep) { lastBeep = s; sfx('beep'); }
  } else { bar.style.transform = 'scaleX(0)'; sec.hidden = true; }
  qa('.uz-call').forEach(c => { const t0 = +c.dataset.t0, t1 = +c.dataset.t1, f = Math.max(0, Math.min(1, (t1 - now) / Math.max(1, t1 - t0))); const i = c.querySelector('.uz-cbar i'); if (i) i.style.transform = `scaleX(${f})`; c.classList.toggle('low', f < .3); });
  if (V.ast && V.phase === 'play') { const left = Math.max(0, V.ast.t1 - now); q('.uz-ast-t').textContent = (left / 1000).toFixed(1) + ' sn'; }
  if (V.phase === 'warp' && V.endAt) { const left = Math.max(0, Math.ceil((V.endAt - now) / 1000)); q('.uz-warp-cd').textContent = left > 0 ? left : '▶'; }
  else q('.uz-warp-cd').textContent = '';
  if (V.fx && V.fx.k === 'slime' && !wiped[V.fx.seed] && V.fx.t1 < now) { wiped[V.fx.seed] = 1; renderFx(V); }
}

function render(v) {
  V = v; if (!root) return;
  M.dataset.phase = v.phase;
  renderCrew(v); renderHud(v); renderCmd(v); renderCalls(v); renderPanel(v); renderFx(v); renderAst(v); renderWarp(v);
  if (v.res && (!lastRes || lastRes.at !== v.res.at)) {
    if (lastRes !== null || Date.now() - v.res.at < 3000) {
      if (v.res.k === 'ok') { sfx('holdok'); const r = q('.uz-cmd').getBoundingClientRect(); if (r.width) FX.burst(r.left + r.width / 2, r.top + r.height / 2, 22, true); }
    }
  }
  lastRes = v.res || lastRes || false;
  tick();
}

/* ---------- olaylar ---------- */
function shake(cls) { if (!M || lowAnim()) return; M.classList.remove('shake', 'shake-big'); void M.offsetWidth; M.classList.add(cls || 'shake'); setTimeout(() => M && M.classList.remove(cls || 'shake'), 700); }
function toast(text, cls) {
  const t = q('.uz-toast'); if (!t) return;
  const cmd = q('.uz-cmd'); if (cmd) t.style.top = (cmd.offsetTop + cmd.offsetHeight - 14) + 'px';
  t.textContent = text; t.className = 'uz-toast show ' + (cls || ''); clearTimeout(t._t); t._t = setTimeout(() => { t.className = 'uz-toast'; }, 1800);
}
function onEvent(e) {
  if (!root) return;
  const me = ui.me;
  if (e.t === 'ok') { if (e.by === me) { Sound.good(); flash('good'); } else if (e.doer === me) sfx('holdok'); else Sound.tick(.4); q('.uz-prog').classList.remove('bump'); void q('.uz-prog').offsetWidth; q('.uz-prog').classList.add('bump'); }
  else if (e.t === 'miss') { Sound.bad(); flash('bad'); shake(); toast(`GÖVDE −${e.dmg}`, 'bad'); }
  else if (e.t === 'warp') { Sound.whoosh(); setTimeout(() => Sound.solve(), 250); FX.confetti(60); }
  else if (e.t === 'start') Sound.whoosh();
  else if (e.t === 'haz') {
    Sound.bankrupt();
    if (e.k === 'ast') { banner('☄️ ASTEROİT! YATIR!', 'bad'); shake('shake-big'); }
    else if (e.who && e.who.includes(me)) { banner(`${HAZ_ICON[e.k]} ${HAZ_NAMES[e.k]}!`, 'bad'); if (e.k === 'zap') shake(); }
    else toast(`${HAZ_ICON[e.k]} ${HAZ_NAMES[e.k]}`, 'bad');
  }
  else if (e.t === 'yat') { if (e.pi === me) sfx('yat'); }
  else if (e.t === 'astok') { Sound.good(); banner('SIYIRDI GEÇTİ!', 'good'); }
  else if (e.t === 'asthit') { Sound.bankrupt(); flash('bad'); shake('shake-big'); toast(`ÇARPIŞMA! GÖVDE −${e.dmg}`, 'bad'); }
  else if (e.t === 'shout') {
    if (e.by !== me) return;
    const nm = V && V.crew[e.from] ? V.crew[e.from].name : 'Ekip';
    if (e.reply === 'var') toast(`🤖 ${nm}: “Bende! Hallediyorum.”`, 'good');
    else if (e.reply === 'sen') toast('🤖 Ekip: “Bizde yok, senin panelinde!”', 'pink');
    else toast('📢 Bağırdın!', '');
  }
  else if (e.t === 'boom') { sfx('boom'); Sound.bankrupt(); flash('bad'); shake('shake-big'); }
}

/* ---------- etkileşim ---------- */
function sendSet(cid, v) { ui.send({ t: 'set', cid, v }); }
function setLocal(c, v) {
  lov[c.id] = { v, until: performance.now() + 1500 };
  const el = q(`[data-cid="${c.id}"]`); if (el) { updCtrl(el, c); el.classList.remove('kick'); void el.offsetWidth; el.classList.add('kick'); }
  sendSet(c.id, v);
}
function ctrlOf(el) { const ce = el && el.closest('[data-cid]'); return ce && V && V.panel ? V.panel.find(x => x.id === ce.dataset.cid) : null; }
function onClick(e) {
  const b = e.target.closest('[data-act]'); if (!b || !root.contains(b) || b.disabled || !V) return;
  Sound.init();
  const act = b.dataset.act;
  if (act === 'shout') { ui.send({ t: 'shout' }); b.disabled = true; Sound.special(); return; }
  if (act === 'yat') { ui.send({ t: 'yat' }); b.disabled = true; sfx('yat'); if (navigator.vibrate) try { navigator.vibrate(60); } catch { /* */ } return; }
  if (act === 'kp') { kpKey(b.dataset.k); return; }
  const c = ctrlOf(b); if (!c) return;
  const cur = curVal(c);
  switch (act) {
    case 'press': { sfx('btn'); sendSet(c.id, 0); const el = b.closest('.uz-c'); el.classList.remove('kick'); void el.offsetWidth; el.classList.add('kick'); break; }
    case 'tog': sfx('tog', 1 - cur); setLocal(c, 1 - cur); break;
    case 'sld': { const v = +b.dataset.v; if (v !== cur) { sfx('sld', v); setLocal(c, v); } break; }
    case 'dial': sfx('dial'); setLocal(c, (cur + (+b.dataset.d) + 4) % 4); break;
    case 'sw3': { const v = +b.dataset.v; if (v !== cur) { sfx('sw3'); setLocal(c, v); } break; }
    case 'pad': openKp(c); break;
  }
}
/* tuş takımı */
function openKp(c) {
  kp = { cid: c.id, buf: '' };
  const el = q('.uz-kp');
  el.innerHTML = `<div class="uz-kp-head"><b>${esc(c.name)}</b><button type="button" class="uz-kp-x" data-act="kp" data-k="x" aria-label="Kapat">✕</button></div>
    <div class="uz-lcd uz-kp-lcd">__</div>
    <div class="uz-kp-keys">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'GİR'].map(k => `<button type="button" data-act="kp" data-k="${k}" class="${k === 'GİR' ? 'go' : k === '⌫' ? 'del' : ''}">${k}</button>`).join('')}</div>`;
  el.hidden = false; sfx('key');
}
function kpShow() { const l = q('.uz-kp-lcd'); if (l && kp) l.textContent = (kp.buf || '').padEnd(2, '_'); }
function kpKey(k) {
  if (!kp) return;
  if (k === 'x') { closeKp(); return; }
  if (k === '⌫') { kp.buf = kp.buf.slice(0, -1); sfx('key', 2); }
  else if (k === 'GİR') {
    const c = V.panel && V.panel.find(x => x.id === kp.cid);
    if (c && kp.buf.length) { const v = +kp.buf; sfx('holdok'); if (v !== curVal(c)) setLocal(c, v); }
    closeKp(); return;
  } else if (/^\d$/.test(k)) { kp.buf = (kp.buf.length >= 2 ? '' : kp.buf) + k; sfx('key', +k); }
  kpShow();
}
function closeKp() { kp = null; const el = q('.uz-kp'); if (el) { el.hidden = true; el.innerHTML = ''; } }
/* basılı tutma düğmesi */
function onDown(e) {
  const b = e.target.closest('.uz-hold');
  if (b && V && V.panel) {
    e.preventDefault(); Sound.init();
    const c = ctrlOf(b); if (!c) return;
    cancelHold();
    try { b.setPointerCapture(e.pointerId); } catch { /* */ }
    hold = { b, c, t0: performance.now(), step: 0, raf: 0 };
    b.classList.add('down');
    const run = () => {
      if (!hold) return;
      const f = Math.min(1, (performance.now() - hold.t0) / HOLD_MS);
      hold.b.style.setProperty('--p', f);
      const st = Math.floor(f * 6); if (st > hold.step) { hold.step = st; sfx('holdt', f); }
      if (f >= 1) { const { b: bb, c: cc } = hold; hold = null; bb.classList.remove('down'); bb.classList.add('fired'); setTimeout(() => { bb.classList.remove('fired'); bb.style.setProperty('--p', 0); }, 450); sfx('holdok'); sendSet(cc.id, 0); return; }
      hold.raf = requestAnimationFrame(run);
    };
    hold.raf = requestAnimationFrame(run);
    return;
  }
  const blob = e.target.closest('.uz-blob');
  if (blob) { e.preventDefault(); blob._lx = e.clientX; blob._ly = e.clientY; try { blob.setPointerCapture(e.pointerId); } catch { /* */ } }
}
function cancelHold() { if (!hold) return; cancelAnimationFrame(hold.raf); hold.b.classList.remove('down'); hold.b.style.setProperty('--p', 0); hold = null; }
function onUp(e) { cancelHold(); const blob = e.target && e.target.closest && e.target.closest('.uz-blob'); if (blob) blob._lx = null; }
function onMove(e) {
  const blob = e.target.closest && e.target.closest('.uz-blob'); if (!blob || blob._lx == null || blob.classList.contains('gone')) return;
  const d = Math.hypot(e.clientX - blob._lx, e.clientY - blob._ly); blob._lx = e.clientX; blob._ly = e.clientY;
  let hp = +blob.dataset.hp - d * .55; blob.dataset.hp = hp; blob.style.opacity = Math.max(.15, hp / 100);
  if (d > 6) sfx('wipe');
  if (hp <= 0) {
    blob.classList.add('gone'); setTimeout(() => blob.remove(), 300);
    const left = qa('.uz-blob:not(.gone)').length;
    if (!left && V && V.fx) { wiped[V.fx.seed] = 1; setTimeout(() => { if (V) renderFx(V); }, 320); Sound.good(); }
  }
}

function mount(r, api) {
  root = r; ui = api; V = null; pkey = ''; lov = {}; kp = null; hold = null; wiped = {}; lastBeep = -1; lastRes = null;
  root.innerHTML = `<div class="uz">
    <canvas class="uz-stars" aria-hidden="true"></canvas>
    <div class="uz-main">
      <div class="uz-crew"></div>
      <div class="uz-hud">
        <div class="uz-sec"><small>SEKTÖR</small><b>1</b><span class="uz-diff"></span></div>
        <div class="uz-bars">
          <div class="uz-bar uz-hull"><span>GÖVDE</span><i><s></s></i><em>100</em></div>
          <div class="uz-bar uz-prog"><span>ROTA</span><i><s></s></i><em>0/0</em></div>
        </div>
      </div>
      <section class="uz-cmd" aria-live="polite">
        <div class="uz-cmd-top"><span class="uz-cmd-tag">📟 KOMUT</span><button type="button" class="uz-shout" data-act="shout" hidden>📢 BAĞIR</button><span class="uz-cmd-sec" hidden>0</span></div>
        <div class="uz-cmd-txt"></div>
        <div class="uz-tbar"><i></i></div>
      </section>
      <div class="uz-calls"></div>
      <section class="uz-panel">
        <div class="uz-grid"></div>
        <div class="uz-fx"></div>
        <div class="uz-ast" hidden><div class="uz-ast-in"><div class="uz-ast-rock" aria-hidden="true">☄️</div><b>ASTEROİT!</b><button type="button" class="uz-yat" data-act="yat">YATIR!</button><span><span class="uz-ast-n"></span> · <span class="uz-ast-t"></span></span></div></div>
        <div class="uz-kp" hidden></div>
      </section>
      <div class="uz-toast"></div>
    </div>
    <div class="uz-warp" hidden><div class="uz-warp-big"></div><div class="uz-warp-sub"></div><div class="uz-warp-cd"></div></div>
  </div>`;
  M = root.querySelector('.uz-main');
  root.addEventListener('click', onClick);
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp); root.addEventListener('pointercancel', onUp); root.addEventListener('lostpointercapture', onUp);
  root.addEventListener('contextmenu', onCtx);
  stars = starsInit(root.querySelector('.uz-stars'));
  timerT = setInterval(tick, 100);
  // telefonda / alçak ekranda en fazla 5 kontrol
  setTimeout(() => { if (ui && (innerWidth < 760 || innerHeight < 700)) ui.send({ t: 'small', on: true }); }, 50);
}
function onCtx(e) { if (e.target.closest('.uz-panel')) e.preventDefault(); }
function unmount() {
  clearInterval(timerT); timerT = null; cancelHold();
  if (stars) { stars.stop(); stars = null; }
  if (root) {
    root.removeEventListener('click', onClick); root.removeEventListener('pointerdown', onDown); root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerup', onUp); root.removeEventListener('pointercancel', onUp); root.removeEventListener('lostpointercapture', onUp);
    root.removeEventListener('contextmenu', onCtx);
  }
  root = null; ui = null; V = null; M = null;
}

CFX.registerGame({
  id: 'uzayekibi', name: 'Uzay Ekibi', icon: '🚀', color: '#19e3d0', min: 2, max: 8, hotseat: false, bot: true, localMin: 1,
  tagline: 'Komutunu ekibe bağır, gemiyi kurtar',
  rules: 'Herkesin ekranında tuhaf adlı düğmelerle dolu bir panel ve süresi azalan bir komut var; komut çoğunlukla başkasının panelindedir, yüksek sesle bağırın! Doğru komutlar rotayı ilerletip yeni sektöre taşır, kaçan komutlar ve asteroit gibi tehlikeler gövdeye zarar verir. Gövde sıfırlanınca oyun biter; puan ulaşılan sektördür.',
  options: [
    { key: 'zorluk', label: 'Zorluk', def: 'normal', choices: [{ v: 'kolay', label: 'Kolay' }, { v: 'normal', label: 'Normal' }, { v: 'cilgin', label: 'Çılgın' }] },
    { key: 'tehlike', label: 'Tehlikeler', def: 'acik', choices: [{ v: 'acik', label: 'Açık' }, { v: 'kapali', label: 'Kapalı' }] }
  ],
  setup(players, opts, ctx) { const st = setup(players, opts || {}); warp(st, ctx, true); return st; },
  action, view,
  turnOf() { return null; },          // herkes aynı anda; zamanlayıcılar ve bilgisayarlar kendi kendine
  botDelay: 900,
  botAct() {},
  skipTurn() {},
  onPresence(st, pi, online, ctx) {
    if (st.on[pi] === online) return;
    st.on[pi] = online;
    if (st.phase === 'end' || st.over) return;
    if (!online) {
      st.ins[pi] = null; st.res[pi] = null; st.fx[pi] = null;
      // bu panele düşen komutları başkalarına yeniden dağıt (hasarsız)
      st.ins.forEach((x, j) => { if (x && st.ctrls[x.cid] && st.ctrls[x.cid].owner === pi) { st.ins[j] = null; if (st.phase === 'play') queueNext(st, ctx, j, 400); } });
      ctx.emit({ t: 'off', pi }, `📴 ${st.pl[pi].name} paneli devre dışı; komutlar yeniden dağıtıldı.`, 'bad');
      if (st.ast && st.ast.ok.every((o, j) => o || !st.on[j])) resolveAst(st, ctx);
    } else if (st.phase === 'play') queueNext(st, ctx, pi, 900);
    ctx.sync();
  },
  resume(st, ctx) {
    st.tk++;
    if (st.phase === 'end') { armPhase(st, ctx); return; }
    if (st.phase === 'warp') { armPhase(st, ctx); return; }
    st.ins.forEach(x => { if (x) { armIns(st, ctx, x); const c = st.ctrls[x.cid]; if (c && isBot(st, c.owner)) botHandle(st, ctx, x, x.heard); } });
    st.pl.forEach((p, i) => { if (!st.ins[i] && st.on[i]) armNext(st, ctx, i); });
    if (st.ast) { const id = st.ast.id; at(st, ctx, st.ast.t1, () => { if (st.ast && st.ast.id === id) { resolveAst(st, ctx); ctx.sync(); } }); }
    st.fx.forEach((fx, i) => { if (fx) at(st, ctx, fx.t1, () => { if (st.fx[i] && st.fx[i].seed === fx.seed) { st.fx[i] = null; ctx.sync(); } }); });
    if (st.hazAt) armHaz(st, ctx); else scheduleHaz(st, ctx);
  },
  mount, render, onEvent, unmount,
  _test: { acc, dat, makeName, genPanels, pickTarget, insText, plain, newIns, doSet, view, action, fireHaz, warp, setup, calcNeed, DIFF, ADJ, FOODS, DEV, validVal, expire, scramble }
});
})();
