// Bulmaca veri doğrulayıcı: node data/validate.js data/parts/p1.json [...]
// Her kayıt: {cat, a, d, sub, mean, theme}
const fs = require('fs');
const LETTERS = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVWXYZ';
const up = s => s.toLocaleUpperCase('tr-TR');
const lettersOnly = s => [...up(s)].filter(c => LETTERS.includes(c)).join('');
const words = s => up(s).split(/[^A-ZÇĞIİÖŞÜWXQ]+/u).filter(Boolean);

function leak(answer, hint) {
  const H = up(hint);
  const Hw = words(hint);
  const Hflat = lettersOnly(hint);
  const aw = words(answer);
  const reasons = [];
  if (Hflat.includes(lettersOnly(answer)) && lettersOnly(answer).length >= 3) reasons.push('cevabın tamamı');
  const STOP = new Set(['BİR','İLE','GİBİ','DAHA','ÇOK','VAR','YOK','OLUR','OLMAZ','KADAR','İÇİN','HER','DEĞİL','AMA','SONRA','ÖNCE','KENDİ']);
  for (const w of aw) {
    if (STOP.has(w)) continue;
    if (w.length >= 6 && Hflat.includes(w.slice(0, 6))) reasons.push('önek: ' + w);
    if (w.length >= 4) {
      const stem = w.length >= 6 ? w.slice(0, Math.max(4, w.length - 3)) : w;
      if (Hw.some(h => h.includes(stem))) reasons.push('kelime/kök: ' + w);
    } else if (w.length === 3) {
      if (Hw.includes(w)) reasons.push('kısa kelime: ' + w);
    }
  }
  return reasons;
}

function validate(list, file) {
  const errs = [];
  const seen = new Map();
  list.forEach((p, i) => {
    const tag = `${file}#${i} ${p && p.a}`;
    if (!p || typeof p !== 'object') return errs.push(tag + ': nesne değil');
    for (const k of ['cat', 'a', 'sub', 'mean', 'theme']) if (typeof p[k] !== 'string' || !p[k].trim()) errs.push(tag + ': eksik alan ' + k);
    if (![1, 2, 3, 4].includes(p.d)) errs.push(tag + ': d 1-4 olmalı');
    if (typeof p.a !== 'string') return;
    const A = up(p.a.trim());
    if (!/^[A-ZÇĞIİÖŞÜ ,.'\-!?]+$/u.test(A)) errs.push(tag + ': cevapta geçersiz karakter');
    if (A.length > 52) errs.push(tag + ': cevap çok uzun (>52)');
    if (words(A).some(w => w.length > 13)) errs.push(tag + ': 13 harften uzun kelime');
    if (lettersOnly(A).length < 3) errs.push(tag + ': cevap çok kısa');
    const key = lettersOnly(A);
    if (seen.has(key)) errs.push(tag + ': tekrar eden cevap (#' + seen.get(key) + ')');
    seen.set(key, i);
    for (const k of ['sub', 'mean', 'theme']) {
      const h = p[k] || '';
      if (h.length < 12 || h.length > 160) errs.push(tag + `: ${k} uzunluğu 12-160 olmalı`);
      const r = leak(A, h);
      if (r.length) errs.push(tag + `: ${k} cevabı sızdırıyor (${r.join(', ')})`);
    }
    if (p.sub === p.mean || p.mean === p.theme || p.sub === p.theme) errs.push(tag + ': ipuçları birbirinin aynısı');
  });
  return errs;
}

if (require.main === module) {
  let total = 0, bad = 0;
  for (const f of process.argv.slice(2)) {
    let list;
    try { list = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.log(f + ': JSON HATASI ' + e.message); bad++; continue; }
    const errs = validate(list, f);
    total += list.length;
    const byCat = {};
    list.forEach(p => byCat[p.cat] = (byCat[p.cat] || 0) + 1);
    console.log(f, list.length, 'kayıt', JSON.stringify(byCat));
    errs.forEach(e => console.log('  ✗ ' + e));
    bad += errs.length;
  }
  console.log(`TOPLAM ${total} kayıt, ${bad} hata`);
  process.exit(bad ? 1 : 0);
}
module.exports = { validate, leak, lettersOnly, up, words };
