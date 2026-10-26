/* =========================================================================
   OYUN SALONU — TELEFON ÇİZ
   Herkes komik bir cümle yazar; defterler elden ele dolaşır: bir sonraki
   oyuncu cümleyi çizer, sonraki çizimi anlatır, sonraki o anlatımı çizer…
   Sonunda albüm herkesin ekranında adım adım açılır, en sevilen adım oylanır.
   Modlar: Klasik, Hızlı, Gizli Başlangıç, Animasyon (önceki kareden devam et).
   Çizimler ortak çizim kitiyle (fırça, sprey, neon, kova, şekil, desen, geri al/yinele)
   yapılır ve kompakt bir işlem listesi olarak gönderilir (≤ 40 KB).
   3–8 kişi online; tek cihazda 1 kişi + bilgisayar oyuncular.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, initial, clamp, pick, shuffle } = CFX;

/* ---------- başlangıç cümleleri (Rastgele cümle) ---------- */
const PROMPTS = `Penguen bisiklet sürüyor
Kedi pizza siparişi veriyor
Fil balerin olmak istiyor
Robot dondurma yerken ağlıyor
Tavşan roketle aya gidiyor
Hayalet gözlük takıp kitap okuyor
Köpek gitar çalıp şarkı söylüyor
Balık şemsiyeyle yürüyüşe çıkmış
Ayı pastanın mumlarını üflüyor
İnek telefonla selfie çekiyor
Dinozor otobüsü kaçırıyor
Ahtapot sekiz fincan kahve içiyor
Kurbağa taç takıp kral olmuş
Uzaylı bakkaldan ekmek alıyor
Arı çiçeğe aşkını ilan ediyor
Kelebek uçak kullanıyor
Yılan şapka takıp dans ediyor
Kaplumbağa araba yarışını kazanıyor
Örümcek kazak örüyor
Kardan adam güneşte tatil yapıyor
Dede kaykayla okula gidiyor
Nine dağın tepesinde gitar çalıyor
Bulut yağmur yağdırmayı unutmuş
Ay ile güneş saklambaç oynuyor
Yıldız kayarken dilek tutuyor
Ağaç evin çatısına çıkmış
Elma ile muz kavga ediyor
Pizza uzayda yüzüyor
Robot köpeğini gezdiriyor
Penguen dondurma dükkânı açmış
Kedi balık tutmayı öğreniyor
Fil kum saatine sığmaya çalışıyor
Tavşan havuç yerine pasta istiyor
Gemi bulutların üstünde gidiyor
Saat geç kaldığı için koşuyor
Balon ayıyı uçuruyor
Hayalet kendinden korkuyor
Uzaylı ineği kaçırmaya çalışıyor
Köpek postacıyı kovalıyor
Kral tacını kaybetmiş
Kraliçe bisikletle saraya gidiyor
Dinozor diş fırçalıyor
Ahtapot davul çalıyor
Kurbağa yağmurda şemsiye satıyor
Arı bal yerine kahve yapıyor
Robot çiçek suluyor
Penguen çölde güneşleniyor
Kedi telefonda annesiyle konuşuyor
Fil fareden korkup sandalyeye çıkmış
Yılan kendine düğüm atmış
Balık ağaca tırmanıyor
Ayı arı kovanını soyuyor
Kaplumbağa roket gibi hızlı
Dede robotla satranç oynuyor
Çocuk dev bir balonla uçuyor
Öğretmen tahtaya dinozor çiziyor
Doktor ayının dişini çekiyor
Aşçı pizzayı havaya atıyor
Polis kediyi ağaçtan indiriyor
Astronot ayda futbol oynuyor
Pilot uçağı park edemiyor
Kardan adam sobanın yanında eriyor
Güneş gözlük takmış
Ay uykusuz kalmış
Yıldızlar pijama partisi yapıyor
Bulut ağlıyor çünkü dondurması düştü
Ev yürüyerek taşınıyor
Araba yüzmeyi öğreniyor
Otobüs şoförü bir köpek
Tren yerine salyangoz bekleniyor
Uçak kuşlarla yarışıyor
Gemi küvette batmış
Roket fırına sığmamış
Pasta kendini yemiş
Dondurma güneşten kaçıyor
Elma ağaçtan atlamış
Muz kabuğuyla kayak yapıyor
Kahve fincanı uyuyor
Telefon kendi kendine çalıyor
Kitap okuyucusunu okuyor
Top dağdan yuvarlanıyor
Şemsiye rüzgârla uçmuş
Gözlük kendini arıyor
Şapkadan tavşan yerine fil çıkmış
Kalp şeklinde bir pizza
Robot âşık olmuş
Hayalet çamaşır asıyor
Gitar konser veriyor
Saat on üçü vuruyor
Dağın tepesinde bir buzdolabı
Denizde yüzen bir ev
Kedi ile köpek el ele tutuşmuş
Penguen garsonluk yapıyor
Fil asansöre binmeye çalışıyor
Tavşan sihirbazı şapkadan çıkarıyor
İnek ayın üstünden atlıyor
Dinozor doğum günü kutluyor
Ahtapot aynı anda sekiz kitap okuyor
Kurbağa prens olmayı reddediyor
Uzaylı Türk kahvesi içiyor
Arı dans kursuna gidiyor
Kelebek tırtıl günlerini anlatıyor
Yılan merdivenden kayıyor
Kaplumbağa kabuğunu kiraya vermiş
Örümcek internette sörf yapıyor
Kardan adam havuç burnunu arıyor
Nine motosikletle yarışıyor
Dede kedisine masal okuyor
Bebek robotu yönetiyor
Çocuk bulutları sayıyor
Balık bisiklete ihtiyaç duymuyor
Ayı kış uykusundan geç kalmış
Köpek kendi kuyruğunu yakalamış
Kedi kutuya sığmaya çalışıyor
Penguen buzdolabını açık unutmuş
Fil hortumuyla duş alıyor
Tavşan saatine bakıp koşuyor
Kral pizza dağıtıyor
Robot kardan adam yapıyor
Hayalet saklambaçta hep kazanıyor
Uzaylı otobüs durağında bekliyor
Ahtapot kendini düğümlemiş
Dinozor ev arıyor
Gemi çölde mahsur kalmış
Araba ağacın tepesinde
Balon pastanın mumlarını söndürüyor
Güneş ile bulut kavga ediyor
Yıldız yere düşmüş
Ay pizza dilimi gibi
Elma kurdu kitap yazıyor
Saat çay saatini kaçırıyor
Telefon tatile çıkmış
Gözlük takan bir balık
Şapka giyen bir yılan
Gitar çalan bir kurbağa
Kahve içen bir kaplumbağa
Roket süren bir nine
Kitap okuyan bir dinozor
Top oynayan bir ahtapot
Şemsiyeli bir arı
Dans eden bir buzdolabı
Uçan bir inek
Ağlayan bir soğan
Gülümseyen bir dağ
Uyuyan bir yanardağ
Kayak yapan bir penguen
Sörf yapan bir kedi
Paraşütle atlayan bir köpek
Karate yapan bir tavşan
Yoga yapan bir fil
Selfie çeken bir ayı
Şarkı söyleyen bir balık
Kek pişiren bir robot
Bulaşık yıkayan bir hayalet
Çiçek toplayan bir uzaylı
Mektup yazan bir örümcek
Saç kestiren bir aslan
Piknik yapan karıncalar
Futbol oynayan pengüenler
Uzay gemisinde çay keyfi
Ormanda kaybolan bir pizza
Denizaltında doğum günü partisi`.split('\n').map(s => s.trim()).filter(Boolean);

/* ---------- bilgisayarın çizim kütüphanesi (0–100 kutu; y aşağı) ----------
   şekil: ['c'|'e'|'a'|'l'|'C', renk(-1 = simgenin rengi), ...sayılar]
   c: daire cx,cy,r · e: elips cx,cy,rx,ry · a: yay cx,cy,r,başlangıç°,bitiş° · l: çizgi x1,y1,x2,y2… · C: kalın nokta x,y
   s: anahtar kökler; '=' ile başlayan kök tam kelime (+ yaygın ekler) ister.                                   */
const ICONS = [
  { n: 'balık', s: ['köpekbal', 'balık', 'balığ'], c: 5, d: [['e', -1, 44, 50, 28, 16], ['l', -1, 72, 50, 92, 34, 92, 66, 72, 50], ['C', 0, 28, 46], ['l', -1, 36, 40, 40, 50, 36, 60], ['l', -1, 40, 35, 50, 26, 56, 35]] },
  { n: 'kedi', s: ['kedi', 'pisi'], c: 0, d: [['c', -1, 50, 55, 25], ['l', -1, 30, 42, 30, 18, 46, 32], ['l', -1, 54, 32, 70, 18, 70, 42], ['C', -1, 41, 52], ['C', -1, 59, 52], ['l', 1, 47, 60, 50, 63, 53, 60], ['l', -1, 22, 58, 40, 62], ['l', -1, 22, 68, 40, 66], ['l', -1, 60, 62, 78, 58], ['l', -1, 60, 66, 78, 68]] },
  { n: 'köpek', s: ['köpe', 'köpü'], c: 7, d: [['c', -1, 50, 52, 22], ['e', -1, 26, 52, 7, 16], ['e', -1, 74, 52, 7, 16], ['C', 0, 42, 48], ['C', 0, 58, 48], ['c', 0, 50, 59, 4], ['l', 0, 44, 66, 50, 70, 56, 66], ['l', 1, 50, 70, 50, 77]] },
  { n: 'penguen', s: ['pengu', 'pengü'], c: 0, d: [['e', -1, 50, 55, 22, 35], ['e', -1, 50, 62, 13, 24], ['C', -1, 44, 34], ['C', -1, 56, 34], ['l', 2, 45, 41, 50, 47, 55, 41, 45, 41], ['l', -1, 29, 48, 18, 68], ['l', -1, 71, 48, 82, 68], ['l', 2, 38, 90, 46, 92], ['l', 2, 54, 92, 62, 90]] },
  { n: 'kuş', s: ['=kuş', 'kuşl'], c: 5, d: [['e', -1, 48, 56, 22, 14], ['c', -1, 70, 40, 10], ['l', 2, 79, 37, 89, 41, 79, 45], ['C', 0, 72, 38], ['l', -1, 38, 52, 50, 44, 58, 56], ['l', -1, 27, 54, 12, 46, 16, 62, 27, 60], ['l', 2, 44, 69, 44, 84], ['l', 2, 54, 69, 54, 84]] },
  { n: 'fil', s: ['=fil', 'filler'], c: 0, d: [['e', -1, 55, 55, 28, 20], ['c', -1, 26, 44, 14], ['l', -1, 14, 50, 10, 68, 18, 82], ['e', -1, 34, 44, 7, 11], ['C', -1, 22, 40], ['l', -1, 35, 72, 35, 88], ['l', -1, 48, 74, 48, 88], ['l', -1, 64, 74, 64, 88], ['l', -1, 76, 70, 76, 88], ['l', -1, 83, 52, 90, 62]] },
  { n: 'tavşan', s: ['tavşa'], c: 0, d: [['c', -1, 50, 62, 18], ['e', -1, 42, 30, 5, 16], ['e', -1, 58, 30, 5, 16], ['C', -1, 44, 58], ['C', -1, 56, 58], ['l', 1, 48, 65, 50, 67, 52, 65], ['l', -1, 47, 71, 47, 77, 53, 77, 53, 71], ['l', -1, 30, 64, 42, 66], ['l', -1, 58, 66, 70, 64]] },
  { n: 'yılan', s: ['yılan'], c: 4, d: [['l', -1, 8, 70, 14, 60, 20, 56, 26, 60, 32, 70, 38, 80, 44, 84, 50, 80, 56, 70, 62, 60, 68, 56, 74, 58, 80, 62], ['c', -1, 86, 58, 7], ['C', 0, 88, 55], ['l', 1, 92, 61, 98, 63, 96, 58]] },
  { n: 'inek', s: ['inek', 'ineğ'], c: 0, d: [['l', -1, 25, 40, 80, 40, 80, 68, 25, 68, 25, 40], ['e', -1, 16, 46, 10, 12], ['l', -1, 10, 35, 6, 28], ['l', -1, 22, 35, 26, 28], ['C', -1, 13, 44], ['e', -1, 45, 50, 7, 5], ['e', -1, 64, 58, 6, 5], ['l', -1, 30, 68, 30, 86], ['l', -1, 42, 68, 42, 86], ['l', -1, 64, 68, 64, 86], ['l', -1, 76, 68, 76, 86], ['l', -1, 80, 45, 90, 58]] },
  { n: 'arı', s: ['=arı', 'arıl'], c: 3, d: [['e', -1, 50, 56, 20, 13], ['l', 0, 44, 44, 44, 68], ['l', 0, 54, 44, 54, 68], ['e', 5, 44, 36, 8, 11], ['e', 5, 58, 36, 8, 11], ['l', 0, 70, 56, 80, 56], ['C', 0, 35, 52], ['l', 0, 32, 46, 26, 36]] },
  { n: 'kelebek', s: ['kelebe'], c: 6, d: [['e', -1, 34, 40, 15, 14], ['e', -1, 66, 40, 15, 14], ['e', 1, 38, 66, 11, 10], ['e', 1, 62, 66, 11, 10], ['l', 0, 50, 28, 50, 80], ['l', 0, 50, 30, 42, 16], ['l', 0, 50, 30, 58, 16]] },
  { n: 'örümcek', s: ['örümce', 'örümceğ'], c: 0, d: [['c', -1, 50, 56, 12], ['c', -1, 50, 38, 7], ['l', -1, 40, 50, 24, 40, 14, 50], ['l', -1, 40, 55, 22, 52, 12, 62], ['l', -1, 40, 60, 24, 66, 16, 78], ['l', -1, 42, 64, 30, 76, 26, 90], ['l', -1, 60, 50, 76, 40, 86, 50], ['l', -1, 60, 55, 78, 52, 88, 62], ['l', -1, 60, 60, 76, 66, 84, 78], ['l', -1, 58, 64, 70, 76, 74, 90]] },
  { n: 'ayı', s: ['=ayı', 'ayıl'], c: 7, d: [['c', -1, 50, 55, 24], ['c', -1, 30, 34, 8], ['c', -1, 70, 34, 8], ['C', 0, 42, 50], ['C', 0, 58, 50], ['e', -1, 50, 64, 9, 7], ['C', 0, 50, 61]] },
  { n: 'ev', s: ['=ev', 'evler'], c: 0, d: [['l', -1, 25, 50, 25, 90, 75, 90, 75, 50], ['l', 1, 16, 54, 50, 22, 84, 54], ['l', 7, 44, 90, 44, 70, 56, 70, 56, 90], ['l', 5, 31, 58, 40, 58, 40, 67, 31, 67, 31, 58], ['l', 5, 60, 58, 69, 58, 69, 67, 60, 67, 60, 58], ['l', 0, 64, 34, 64, 24, 70, 24, 70, 40]] },
  { n: 'ağaç', s: ['ağaç', 'ağac', 'orman'], c: 4, d: [['l', 7, 45, 92, 46, 58], ['l', 7, 55, 92, 54, 58], ['c', -1, 50, 38, 24], ['c', -1, 34, 50, 12], ['c', -1, 66, 50, 12], ['C', 1, 42, 36], ['C', 1, 58, 30], ['C', 1, 56, 46]] },
  { n: 'çiçek', s: ['çiçe'], c: 1, d: [['c', -1, 63, 32, 8], ['c', -1, 56.5, 43.3, 8], ['c', -1, 43.5, 43.3, 8], ['c', -1, 37, 32, 8], ['c', -1, 43.5, 20.7, 8], ['c', -1, 56.5, 20.7, 8], ['c', 3, 50, 32, 6], ['l', 4, 50, 46, 50, 92], ['e', 4, 60, 70, 9, 4]] },
  { n: 'güneş', s: ['güneş'], c: 3, d: [['c', -1, 50, 50, 17], ['l', 2, 74, 50, 86, 50], ['l', 2, 67, 67, 75, 75], ['l', 2, 50, 74, 50, 86], ['l', 2, 33, 67, 25, 75], ['l', 2, 26, 50, 14, 50], ['l', 2, 33, 33, 25, 25], ['l', 2, 50, 26, 50, 14], ['l', 2, 67, 33, 75, 25], ['C', 0, 44, 46], ['C', 0, 56, 46], ['a', 0, 50, 52, 8, 20, 160]] },
  { n: 'ay', s: ['=ay', 'hilal'], c: 3, d: [['a', -1, 50, 50, 30, 60, 300], ['a', -1, 64, 50, 26, 88, 272]] },
  { n: 'yıldız', s: ['yıldız'], c: 3, d: [['l', -1, 50, 14, 59.4, 39.1, 86.1, 40.3, 65.2, 56.9, 72.3, 82.7, 50, 68, 27.7, 82.7, 34.8, 56.9, 13.9, 40.3, 40.6, 39.1, 50, 14]] },
  { n: 'yağmur', s: ['yağmur'], c: 0, d: [['a', -1, 32, 43, 14, 90, 270], ['a', -1, 48, 29, 18, 180, 345], ['a', -1, 70, 39, 14, 250, 450], ['l', -1, 32, 57, 70, 53], ['l', 5, 30, 64, 26, 74], ['l', 5, 45, 66, 41, 76], ['l', 5, 60, 64, 56, 74], ['l', 5, 72, 68, 68, 78], ['l', 5, 38, 82, 34, 90], ['l', 5, 55, 82, 51, 90]] },
  { n: 'bulut', s: ['bulut'], c: 5, d: [['a', -1, 32, 58, 14, 90, 270], ['a', -1, 48, 44, 18, 180, 345], ['a', -1, 70, 54, 14, 250, 450], ['l', -1, 32, 72, 70, 68]] },
  { n: 'kardan adam', s: ['kardan', '=kar'], c: 5, d: [['c', -1, 50, 70, 20], ['c', -1, 50, 36, 14], ['C', 0, 45, 33], ['C', 0, 55, 33], ['l', 2, 50, 38, 63, 40, 50, 42], ['l', 7, 31, 62, 14, 50], ['l', 7, 69, 62, 86, 50], ['C', 0, 50, 64], ['C', 0, 50, 74]] },
  { n: 'araba', s: ['araba'], c: 1, d: [['l', -1, 8, 66, 8, 52, 26, 50, 36, 34, 64, 34, 76, 50, 92, 52, 92, 66, 8, 66], ['c', 0, 28, 68, 9], ['c', 0, 72, 68, 9], ['l', 5, 38, 48, 40, 38, 62, 38, 70, 48, 38, 48], ['l', -1, 52, 38, 52, 48]] },
  { n: 'otobüs', s: ['otobüs'], c: 3, d: [['l', -1, 8, 30, 92, 30, 92, 72, 8, 72, 8, 30], ['l', 5, 14, 38, 30, 38, 30, 52, 14, 52, 14, 38], ['l', 5, 36, 38, 52, 38, 52, 52, 36, 52, 36, 38], ['l', 5, 58, 38, 74, 38, 74, 52, 58, 52, 58, 38], ['l', 5, 80, 38, 88, 38, 88, 60, 80, 60, 80, 38], ['c', 0, 26, 74, 8], ['c', 0, 74, 74, 8]] },
  { n: 'bisiklet', s: ['bisiklet', 'bisikle'], c: 5, d: [['c', 0, 24, 66, 16], ['c', 0, 76, 66, 16], ['l', -1, 24, 66, 42, 42, 66, 42, 76, 66], ['l', -1, 42, 42, 50, 66, 24, 66], ['l', -1, 50, 66, 66, 42], ['l', -1, 36, 34, 48, 34], ['l', -1, 42, 42, 42, 34], ['l', -1, 66, 42, 64, 30, 72, 28]] },
  { n: 'uçak', s: ['uçak', 'uçağ'], c: 5, d: [['e', -1, 50, 50, 38, 8], ['l', -1, 44, 46, 32, 18, 42, 18, 58, 46], ['l', -1, 44, 54, 32, 82, 42, 82, 58, 54], ['l', -1, 16, 46, 10, 30, 18, 30, 26, 44], ['C', 0, 74, 48], ['C', 0, 66, 48], ['C', 0, 58, 48]] },
  { n: 'gemi', s: ['gemi', 'tekne', 'kayık', 'denizaltı'], c: 7, d: [['l', -1, 8, 60, 92, 60, 78, 80, 22, 80, 8, 60], ['l', 0, 50, 60, 50, 12], ['l', 1, 52, 14, 80, 50, 52, 50], ['l', 5, 5, 90, 15, 86, 25, 90, 35, 86, 45, 90, 55, 86, 65, 90, 75, 86, 85, 90, 95, 86]] },
  { n: 'roket', s: ['roket', 'uzay'], c: 1, d: [['l', -1, 50, 8, 62, 28, 62, 70, 38, 70, 38, 28, 50, 8], ['l', -1, 38, 54, 26, 76, 38, 70], ['l', -1, 62, 54, 74, 76, 62, 70], ['c', 5, 50, 38, 6], ['l', 2, 42, 72, 46, 90, 50, 80, 54, 92, 58, 72]] },
  { n: 'pizza', s: ['pizza'], c: 2, d: [['l', -1, 50, 90, 18, 22, 82, 22, 50, 90], ['l', 7, 18, 22, 24, 16, 40, 13, 60, 13, 76, 16, 82, 22], ['c', 1, 42, 34, 6], ['c', 1, 60, 40, 5], ['c', 1, 50, 58, 5]] },
  { n: 'pasta', s: ['pasta', '=kek', 'doğum gün'], c: 7, d: [['l', -1, 20, 55, 80, 55, 80, 86, 20, 86, 20, 55], ['l', 1, 20, 62, 28, 68, 36, 62, 44, 68, 52, 62, 60, 68, 68, 62, 76, 68, 80, 64], ['l', 5, 50, 55, 50, 38], ['l', 2, 50, 36, 46, 30, 50, 22, 54, 30, 50, 36], ['l', 6, 35, 55, 35, 44], ['l', 6, 65, 55, 65, 44]] },
  { n: 'dondurma', s: ['dondurma'], c: 2, d: [['l', -1, 34, 48, 50, 92, 66, 48], ['l', -1, 40, 58, 58, 72], ['l', -1, 60, 58, 44, 74], ['c', 1, 50, 38, 15], ['c', 3, 44, 24, 9]] },
  { n: 'elma', s: ['elma'], c: 1, d: [['c', -1, 50, 60, 24], ['l', 7, 50, 36, 53, 22], ['e', 4, 60, 28, 8, 4]] },
  { n: 'muz', s: ['=muz'], c: 3, d: [['l', -1, 18, 30, 22, 52, 36, 70, 56, 78, 78, 74, 88, 64, 76, 66, 58, 66, 42, 58, 30, 44, 24, 30, 18, 30], ['l', 7, 18, 30, 16, 24]] },
  { n: 'kahve', s: ['kahve', '=çay', 'fincan', 'bardak'], c: 7, d: [['l', -1, 24, 40, 30, 82, 64, 82, 70, 40, 24, 40], ['a', -1, 72, 58, 10, -80, 80], ['l', 0, 38, 32, 34, 24, 40, 16], ['l', 0, 52, 32, 48, 24, 54, 16], ['l', -1, 20, 88, 74, 88]] },
  { n: 'telefon', s: ['telefon', 'selfie'], c: 0, d: [['l', -1, 34, 12, 66, 12, 66, 88, 34, 88, 34, 12], ['l', 5, 39, 20, 61, 20, 61, 74, 39, 74, 39, 20], ['C', -1, 50, 81]] },
  { n: 'kitap', s: ['kitap', 'kitab', 'masal'], c: 5, d: [['l', -1, 50, 30, 50, 80], ['l', -1, 50, 30, 32, 24, 14, 28, 14, 78, 32, 74, 50, 80], ['l', -1, 50, 30, 68, 24, 86, 28, 86, 78, 68, 74, 50, 80], ['l', 0, 20, 40, 42, 42], ['l', 0, 20, 50, 42, 52], ['l', 0, 58, 42, 80, 40], ['l', 0, 58, 52, 80, 50]] },
  { n: 'top', s: ['=top', 'futbol'], c: 1, d: [['c', -1, 50, 50, 30], ['l', -1, 20, 50, 35, 41, 50, 38, 65, 41, 80, 50], ['l', -1, 50, 20, 45, 35, 45, 65, 50, 80]] },
  { n: 'şemsiye', s: ['şemsiye'], c: 6, d: [['a', -1, 50, 52, 36, 180, 360], ['l', -1, 14, 52, 26, 46, 38, 52, 50, 46, 62, 52, 74, 46, 86, 52], ['l', 0, 50, 16, 50, 82], ['a', 0, 44, 82, 6, 0, 180]] },
  { n: 'gözlük', s: ['gözlü'], c: 0, d: [['c', -1, 32, 52, 14], ['c', -1, 68, 52, 14], ['a', -1, 50, 52, 5, 200, 340], ['l', -1, 18, 48, 6, 40], ['l', -1, 82, 48, 94, 40]] },
  { n: 'şapka', s: ['şapka'], c: 0, d: [['e', -1, 50, 72, 38, 7], ['l', -1, 30, 70, 32, 30, 68, 30, 70, 70], ['l', 1, 31, 60, 69, 60]] },
  { n: 'kalp', s: ['kalp', 'kalb', '=aşk', 'âşık', 'aşık'], c: 1, d: [['l', -1, 50, 86, 20, 58, 12, 40, 18, 26, 32, 20, 44, 24, 50, 34, 56, 24, 68, 20, 82, 26, 88, 40, 80, 58, 50, 86]] },
  { n: 'robot', s: ['robot'], c: 5, d: [['l', -1, 32, 18, 68, 18, 68, 44, 32, 44, 32, 18], ['C', 1, 42, 30], ['C', 1, 58, 30], ['l', 0, 42, 38, 58, 38], ['l', 0, 50, 18, 50, 8], ['C', 1, 50, 7], ['l', -1, 28, 50, 72, 50, 72, 80, 28, 80, 28, 50], ['l', -1, 28, 56, 16, 70], ['l', -1, 72, 56, 84, 70], ['l', -1, 38, 80, 38, 94], ['l', -1, 62, 80, 62, 94]] },
  { n: 'hayalet', s: ['hayalet'], c: 6, d: [['l', -1, 26, 88, 26, 46], ['a', -1, 50, 46, 24, 180, 360], ['l', -1, 74, 46, 74, 88, 66, 82, 58, 88, 50, 82, 42, 88, 34, 82, 26, 88], ['C', 0, 42, 46], ['C', 0, 58, 46], ['c', 0, 50, 60, 4]] },
  { n: 'balon', s: ['balon'], c: 1, d: [['e', -1, 50, 36, 20, 25], ['l', -1, 47, 61, 53, 61, 50, 66, 47, 61], ['l', 0, 50, 66, 46, 74, 54, 82, 46, 90, 50, 96]] },
  { n: 'gitar', s: ['gitar', 'konser', 'müzik'], c: 7, d: [['c', -1, 40, 68, 18], ['c', -1, 54, 48, 12], ['l', -1, 60, 42, 84, 14], ['l', 0, 80, 10, 90, 16, 86, 22], ['c', 0, 44, 62, 5], ['l', 0, 40, 72, 82, 20]] },
  { n: 'mikrofon', s: ['mikrofon', 'şarkı'], c: 0, d: [['c', -1, 50, 26, 12], ['l', -1, 44, 36, 46, 80, 54, 80, 56, 36], ['l', -1, 40, 22, 60, 30]] },
  { n: 'saat', s: ['saat'], c: 0, d: [['c', -1, 50, 50, 32], ['l', 1, 50, 50, 50, 28], ['l', 1, 50, 50, 66, 56], ['C', -1, 50, 22], ['C', -1, 78, 50], ['C', -1, 50, 78], ['C', -1, 22, 50]] },
  { n: 'dağ', s: ['=dağ', 'yanardağ'], c: 7, d: [['l', -1, 4, 86, 34, 28, 52, 56, 68, 38, 96, 86, 4, 86], ['l', 5, 26, 44, 34, 28, 42, 44, 36, 40, 30, 46, 26, 44]] },
  { n: 'deniz', s: ['deniz', 'okyanus', 'dalga', 'havuz', 'küvet'], c: 5, d: [['l', -1, 5, 40, 15, 34, 25, 40, 35, 34, 45, 40, 55, 34, 65, 40, 75, 34, 85, 40, 95, 34], ['l', -1, 5, 58, 15, 52, 25, 58, 35, 52, 45, 58, 55, 52, 65, 58, 75, 52, 85, 58, 95, 52], ['l', -1, 5, 76, 15, 70, 25, 76, 35, 70, 45, 76, 55, 70, 65, 76, 75, 70, 85, 76, 95, 70]] },
  { n: 'taç', s: ['=taç', 'tacı', 'kral', 'prens', 'saray'], c: 3, d: [['l', -1, 22, 72, 22, 34, 36, 52, 50, 28, 64, 52, 78, 34, 78, 72, 22, 72], ['C', 1, 50, 62], ['C', 5, 36, 64], ['C', 4, 64, 64]] },
  { n: 'dinozor', s: ['dinozor'], c: 4, d: [['l', -1, 10, 70, 30, 56, 48, 52, 60, 40, 64, 22, 74, 18, 82, 22, 80, 30, 70, 30, 68, 44, 70, 60, 62, 72, 46, 76, 24, 76, 10, 70], ['l', -1, 34, 76, 34, 90], ['l', -1, 56, 74, 56, 90], ['C', 0, 75, 23], ['l', -1, 36, 52, 40, 44, 46, 52, 50, 44, 56, 50]] },
  { n: 'ahtapot', s: ['ahtapot'], c: 6, d: [['a', -1, 50, 40, 22, 180, 360], ['l', -1, 28, 40, 28, 52], ['l', -1, 72, 40, 72, 52], ['l', -1, 28, 52, 20, 70, 26, 86], ['l', -1, 38, 54, 34, 74, 40, 90], ['l', -1, 50, 54, 50, 76, 56, 92], ['l', -1, 62, 54, 66, 74, 60, 90], ['l', -1, 72, 52, 80, 70, 74, 86], ['C', 0, 42, 38], ['C', 0, 58, 38]] },
  { n: 'kurbağa', s: ['kurbağ'], c: 4, d: [['e', -1, 50, 62, 26, 18], ['c', -1, 36, 40, 8], ['c', -1, 64, 40, 8], ['C', 0, 36, 40], ['C', 0, 64, 40], ['a', 1, 50, 60, 14, 20, 160], ['l', -1, 26, 74, 14, 88, 26, 86], ['l', -1, 74, 74, 86, 88, 74, 86]] },
  { n: 'kaplumbağa', s: ['kaplumba'], c: 4, d: [['a', -1, 50, 62, 28, 180, 360], ['l', -1, 22, 62, 78, 62], ['c', -1, 86, 56, 7], ['l', -1, 30, 62, 28, 72], ['l', -1, 70, 62, 72, 72], ['l', -1, 40, 46, 50, 40, 60, 46, 56, 56, 44, 56, 40, 46]] },
  { n: 'uzaylı', s: ['uzaylı', 'ufo'], c: 4, d: [['e', -1, 50, 44, 22, 26], ['e', 0, 40, 42, 7, 5], ['e', 0, 60, 42, 7, 5], ['l', -1, 40, 20, 32, 6], ['l', -1, 60, 20, 68, 6], ['C', -1, 32, 6], ['C', -1, 68, 6], ['a', 0, 50, 56, 6, 20, 160], ['l', -1, 42, 70, 40, 90], ['l', -1, 58, 70, 60, 90]] },
  { n: 'insan', s: ['adam', 'kadın', 'çocu', 'insan', '=dede', '=nine', 'teyze', 'amca', 'öğretmen', '=kız', 'oğlan', 'polis', 'doktor', 'aşçı', '=baba', 'anne', 'komşu', 'bakkal', 'astronot', 'pilot', 'öğrenci', 'garson', 'şoför', 'sihirbaz', 'bebe', 'postacı', 'kraliçe'], c: 0, d: [['c', -1, 50, 20, 10], ['l', -1, 50, 30, 50, 62], ['l', -1, 30, 46, 50, 40, 70, 46], ['l', -1, 36, 90, 50, 62, 64, 90], ['C', -1, 46, 18], ['C', -1, 54, 18], ['a', -1, 50, 21, 5, 20, 160]] }
];
const ICON_BY = {}; ICONS.forEach(ic => { ICON_BY[ic.n] = ic; });
// komik karıştırmalar: bilgisayar çizimi "yanlış" görebilir
const CONF = {
  kedi: ['köpek', 'tavşan', 'ayı', 'hamster'], köpek: ['kedi', 'ayı', 'koyun'], penguen: ['kuş', 'garson', 'şişe'], balık: ['uçak', 'limon', 'kayık'], kuş: ['penguen', 'uçak', 'tavuk'],
  fil: ['bulut', 'inek', 'çaydanlık'], tavşan: ['kedi', 'kanguru', 'kurbağa'], yılan: ['solucan', 'hortum', 'spagetti'], inek: ['masa', 'köpek', 'fil'], arı: ['sinek', 'kaplan', 'balık'],
  kelebek: ['papyon', 'kuş', 'çiçek'], örümcek: ['güneş', 'ahtapot', 'karınca'], ayı: ['kedi', 'köpek', 'patates'], ev: ['çadır', 'kutu', 'kale'], ağaç: ['brokoli', 'bulut', 'lolipop'],
  çiçek: ['güneş', 'lolipop', 'yıldız'], güneş: ['çiçek', 'saat', 'portakal'], ay: ['muz', 'tırnak', 'gülümseme'], yıldız: ['denizyıldızı', 'çiçek', 'kar tanesi'], yağmur: ['duş', 'bulut', 'ağlayan bulut'],
  bulut: ['koyun', 'pamuk', 'ağaç'], 'kardan adam': ['sekiz', 'kartopu', 'hayalet'], araba: ['ayakkabı', 'otobüs', 'kaplumbağa'], otobüs: ['buzdolabı', 'tren', 'kutu'], bisiklet: ['gözlük', 'motosiklet', 'iki tekerlek'],
  uçak: ['balık', 'kuş', 'roket'], gemi: ['ayakkabı', 'muz', 'kayık'], roket: ['kalem', 'havuç', 'uçak'], pizza: ['peynir', 'üçgen', 'dilim karpuz'], pasta: ['ev', 'kutu', 'hamburger'],
  dondurma: ['mikrofon', 'meşale', 'havuç'], elma: ['top', 'domates', 'kiraz'], muz: ['ay', 'bumerang', 'gülümseme'], kahve: ['çorba', 'kova', 'saksı'], telefon: ['kapı', 'kitap', 'kumanda'],
  kitap: ['kelebek', 'çatı', 'laptop'], top: ['elma', 'portakal', 'gezegen'], şemsiye: ['mantar', 'denizanası', 'çadır'], gözlük: ['bisiklet', 'sekiz', 'dürbün'], şapka: ['kova', 'pasta', 'kale'],
  kalp: ['çilek', 'popo', 'yaprak'], robot: ['buzdolabı', 'çamaşır makinesi', 'kutu adam'], hayalet: ['çarşaf', 'bulut', 'dondurma'], balon: ['lolipop', 'elma', 'kiraz'], gitar: ['keman', 'raket', 'armut'],
  mikrofon: ['dondurma', 'meşale', 'lolipop'], saat: ['pizza', 'güneş', 'tabak'], dağ: ['üçgen', 'çadır', 'piramit'], deniz: ['spagetti', 'saç', 'dalga'], taç: ['çatal', 'çit', 'kale'],
  dinozor: ['ejderha', 'kertenkele', 'zürafa'], ahtapot: ['denizanası', 'örümcek', 'hayalet'], kurbağa: ['kaplumbağa', 'yeşil balon', 'uzaylı'], kaplumbağa: ['kaplumbağa terbiyecisi', 'kask', 'kurbağa'],
  uzaylı: ['kurbağa', 'salatalık', 'böcek'], insan: ['çöp adam', 'korkuluk', 'yıldız']
};
const ICON_TEMPL = {
  1: ['Bir {A}', 'Mutlu bir {A}', 'Çok ciddi bir {A}', 'Uçan bir {A}', 'Dans eden bir {A}', '{A} poz veriyor', 'Kocaman bir {A}', 'Üzgün bir {A}', 'Sanırım bu bir {A}'],
  2: ['{A} ile {B}', '{A} ve {B} dans ediyor', '{A} ile {B} kavga ediyor', 'Dev bir {A} ile minik bir {B}', '{A} ile {B} tatilde', '{A}, {B} kılığında', '{A} ve {B} en iyi arkadaş', '{A} ile {B} yarışıyor'],
  3: ['{A}, {B} ve {C}', '{A}, {B} ile {C} aynı karede', '{A} ile {B} bir {C} buldu', 'Bir {A}, bir {B} ve büyük bir {C} dramı']
};
const EMPTY_DESC = ['Boş bir sayfa… derin bir sanat eseri', 'Kutup ayısı karda kayboldu', 'Görünmez bir kedi', 'Hiçbir şey… ya da her şey', 'Beyaz bir duvara bakan beyaz bir tavşan', 'Sisli bir sabah'];
const FUNNY_NOUN = ['patates', 'çorap', 'karpuz', 'buzdolabı', 'terlik', 'lahmacun', 'kanguru', 'çaydanlık', 'zürafa', 'yastık', 'süpürge', 'simit', 'tost makinesi', 'flamingo'];
const FUNNY_TAIL = [' ama uzayda', ' (sanırım)', ' ve herkes şaşkın', ' ama tersten', ' gece yarısı', ' ve çok mutlu', ' ama yağmur yağıyor'];
const SUFFIX = new Set(['', 'a', 'e', 'ı', 'i', 'u', 'ü', 'da', 'de', 'ta', 'te', 'dan', 'den', 'tan', 'ten', 'ın', 'in', 'un', 'ün', 'nın', 'nin', 'nun', 'nün', 'lar', 'ler', 'la', 'le', 'yla', 'yle', 'ya', 'ye', 'yı', 'yi', 'yu', 'yü', 'ları', 'leri', 'lara', 'lere', 'larla', 'lerle', 'ım', 'im', 'um', 'üm', 'ımı', 'imi', 'ının', 'inin', 'ını', 'ini', 'ına', 'ine', 'sı', 'si', 'su', 'sü']);

/* @@PAINTKIT-BEGIN — bu blok Çiz Bil ve Telefon Çiz'de birebir aynıdır (kaynak: ortak çizim kiti) */
/* ---------- ÇİZİM KİTİ ----------
   İşlem günlüğü (op): { i, t, k, c, a, w, d, f, p }
   t: 's' serbest çizgi · 'l' düz çizgi · 'r' dikdörtgen · 'o' elips · 'f' boya kovası · 'x' temizle · 'b' zemin rengi
   k: 0 kalem · 1 fırça · 2 marker · 3 sprey · 4 neon · 5 silgi
   c: renk 'rrggbb' · a: opaklık 5–100 · w: kalınlık (tuval genişliğinin binde biri) · d: desen (0 düz) · f: dolu şekil
   p: koordinatlar 0–1000 (iki eksende de tuvale göre).
   Boya kovası her cihazda aynı sabit çözünürlüklü "sınır rasterı" üzerinde, yalnızca tam sayı/IEEE
   aritmetiğiyle hesaplanır; böylece tohum noktası + renk aynıysa dolan bölge her cihazda birebir aynıdır. */
const PK = (() => {
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64I = {}; [...B64].forEach((ch, i) => { B64I[ch] = i; });
const enc = p => { let s = ''; for (const n of p) s += B64[(n >> 6) & 63] + B64[n & 63]; return s; };
const dec = s => { const o = []; for (let i = 0; i + 1 < s.length; i += 2) o.push(((B64I[s[i]] | 0) << 6) | (B64I[s[i + 1]] | 0)); return o; };
const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
const HAS_DOM = typeof document !== 'undefined';

const PALETTE = ['1b1530', '4a4458', '9a95ab', 'ffffff', 'e8222e', 'ff7a1a', 'ffd60a', '2fbf4a', '1a8cff', '6b3dff', 'ff4fb8', '8b5a2b',
  'ffe0c4', 'f1c27d', 'c68642', '7a4a2a', 'ffb3c7', 'ffe5a3', 'b8f2c9', 'b3d9ff', 'd9c2ff', '39ff14', '00f0ff', 'ff00e6'];
const PAL_NAMES = ['Siyah', 'Koyu gri', 'Gri', 'Beyaz', 'Kırmızı', 'Turuncu', 'Sarı', 'Yeşil', 'Mavi', 'Mor', 'Pembe', 'Kahverengi',
  'Açık ten', 'Buğday ten', 'Esmer ten', 'Koyu ten', 'Pastel pembe', 'Pastel sarı', 'Pastel yeşil', 'Pastel mavi', 'Lila', 'Neon yeşil', 'Neon mavi', 'Neon pembe'];
const PATTERNS = ['Düz', 'Noktalı', 'Çizgili', 'Kareli', 'Yıldız', 'Kalp', 'Zikzak', 'Tuğla', 'Çim', 'Dama', 'Dalga'];
const NPAT = PATTERNS.length - 1;
const PAT_U = 34;                                   // desen karosu: tuval genişliğinin binde 34'ü
const TOOLS = [
  { id: 'pen', t: 's', k: 0, name: 'Kalem', key: 'p' },
  { id: 'brush', t: 's', k: 1, name: 'Fırça', key: 'b' },
  { id: 'marker', t: 's', k: 2, name: 'Marker', key: 'm' },
  { id: 'spray', t: 's', k: 3, name: 'Sprey', key: 's' },
  { id: 'neon', t: 's', k: 4, name: 'Neon', key: 'n' },
  { id: 'eraser', t: 's', k: 5, name: 'Silgi', key: 'e' },
  { id: 'fill', t: 'f', name: 'Boya kovası', key: 'g' },
  { id: 'line', t: 'l', name: 'Düz çizgi', key: 'l' },
  { id: 'rect', t: 'r', name: 'Dikdörtgen', key: 'r' },
  { id: 'ellipse', t: 'o', name: 'Elips', key: 'o' },
  { id: 'picker', t: '', name: 'Damlalık', key: 'i' }
];
const TOOL = {}; TOOLS.forEach(t => { TOOL[t.id] = t; });
const QUICK = ['pen', 'brush', 'fill', 'eraser'];
const SIZE_PRESETS = [3, 6, 12, 22, 40];
const STROKE_MAX = 1500;                            // tek çizgide en çok nokta (uzunsa bölünür)

/* ---------- kodlama / doğrulama ---------- */
function unpack(w, maxPts) {
  if (!w || typeof w !== 'object') return null;
  const t = w.t;
  if (typeof t !== 'string' || t.length !== 1 || !'slrofxb'.includes(t)) return null;
  const i = w.i; if (!Number.isInteger(i) || i < 0 || i > 1e7) return null;
  const op = { i, t };
  if (t === 'x') return op;
  op.c = typeof w.c === 'string' && /^[0-9a-fA-F]{6}$/.test(w.c) ? w.c.toLowerCase() : '1b1530';
  if (t === 'b') return op;
  op.a = cl(Math.round(+w.a) || 100, 5, 100);
  op.d = cl(w.d | 0, 0, NPAT);
  let p = typeof w.p === 'string' ? (/^[A-Za-z0-9_-]*$/.test(w.p) ? dec(w.p) : null) : Array.isArray(w.p) ? w.p.map(v => Math.round(+v) || 0) : null;
  if (!p) return null;
  p = p.map(v => cl(v, 0, 1000)); if (p.length % 2) p.pop();
  if (t === 'f') { if (p.length !== 2) return null; op.p = p; return op; }
  op.w = cl(Math.round(+w.w) || 6, 1, 80);
  if (t === 's') {
    op.k = cl(w.k | 0, 0, 5); if (op.k === 5 || op.k === 3) op.d = 0;
    if (p.length < 2 || p.length / 2 > (maxPts || STROKE_MAX)) return null;
    op.p = p; if (w.e) op.e = 1; return op;
  }
  if (p.length !== 4) return null;
  op.f = w.f ? 1 : 0; op.p = p; return op;
}
function pack(op) { const o = {}; for (const k in op) if (k !== 'e') o[k] = op[k]; if (o.p) o.p = enc(o.p); return o; }
const meta = op => ({ k: op.k, c: op.c, a: op.a, w: op.w, d: op.d });
const npts = ops => ops.reduce((s, o) => s + (o.t === 's' && o.p ? o.p.length >> 1 : 0), 0);
function rdp(p, eps) {
  const n = p.length >> 1; if (n <= 2) return p.slice();
  const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let md = 0, mi = -1;
    const ax = p[a * 2], ay = p[a * 2 + 1], bx = p[b * 2], by = p[b * 2 + 1], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    for (let i = a + 1; i < b; i++) { const d = L === 0 ? Math.hypot(p[i * 2] - ax, p[i * 2 + 1] - ay) : Math.abs(dy * p[i * 2] - dx * p[i * 2 + 1] + bx * ay - by * ax) / L; if (d > md) { md = d; mi = i; } }
    if (md > eps && mi > 0) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  const o = []; for (let i = 0; i < n; i++) if (keep[i]) o.push(p[i * 2], p[i * 2 + 1]); return o;
}

/* ---------- belirlenimci sınır rasterı ---------- */
function rNew(W, H) { return { W, H, k: new Uint32Array(W * H), tab: new Map() }; }
function keyOf(op) {
  if (op.t === 's' && op.k === 5) return 0;
  const a = op.t === 's' && op.k === 2 ? Math.round(op.a * 0.5) : op.a;
  return ((parseInt(op.c, 16) ^ (a << 24) ^ Math.imul(op.d | 0, 0x9E3779B1) ^ (op.t === 's' && op.k === 3 ? 0x2545F491 : 0)) >>> 0) || 1;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// sprey damlaları (birim uzayında; y ekseni en-boy oranıyla düzeltilir → daire)
function sprayDots(op, asp, cb) {
  const p = op.p, n = p.length >> 1, R = op.w * 1.1, cnt = cl(Math.round(op.w * 0.6) + 4, 5, 28), sz = Math.max(1.2, op.w * 0.09);
  for (let k = 0; k < n; k++) {
    const r = rng((Math.imul(op.i + 1, 0x9E3779B1) ^ Math.imul(k + 1, 0x85EBCA77)) >>> 0);
    let got = 0;
    for (let tr = 0; tr < cnt * 4 && got < cnt; tr++) {
      const u = r() * 2 - 1, v = r() * 2 - 1;
      if (u * u + v * v > 1) continue;
      got++; cb(p[2 * k] + u * R, p[2 * k + 1] + v * R * asp, sz);
    }
  }
}
// kalem yolu: p0 → (k) kontrol Pk, bitiş orta(Pk, Pk+1) → son nokta (görünür çizim ile aynı geometri)
function flatten(p, sx, sy) {
  const n = p.length >> 1, out = [p[0] * sx, p[1] * sy];
  if (n === 1) return out;
  let x0 = out[0], y0 = out[1];
  for (let k = 1; k < n - 1; k++) {
    const cx = p[2 * k] * sx, cy = p[2 * k + 1] * sy, ex = (cx + p[2 * k + 2] * sx) / 2, ey = (cy + p[2 * k + 3] * sy) / 2;
    const len = Math.abs(cx - x0) + Math.abs(cy - y0) + Math.abs(ex - cx) + Math.abs(ey - cy);
    const st = cl(Math.ceil(len / 3), 1, 8);
    for (let j = 1; j <= st; j++) { const t = j / st, u = 1 - t; out.push(u * u * x0 + 2 * u * t * cx + t * t * ex, u * u * y0 + 2 * u * t * cy + t * t * ey); }
    x0 = ex; y0 = ey;
  }
  out.push(p[2 * n - 2] * sx, p[2 * n - 1] * sy);
  return out;
}
function rCap(R, x0, y0, x1, y1, r, key) {
  const { W, H, k } = R;
  const mnx = Math.max(0, Math.floor(Math.min(x0, x1) - r)), mxx = Math.min(W - 1, Math.ceil(Math.max(x0, x1) + r));
  const mny = Math.max(0, Math.floor(Math.min(y0, y1) - r)), mxy = Math.min(H - 1, Math.ceil(Math.max(y0, y1) + r));
  const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy, r2 = r * r;
  for (let y = mny; y <= mxy; y++) {
    const py = y + 0.5;
    for (let x = mnx; x <= mxx; x++) {
      const px = x + 0.5;
      let t = L2 ? ((px - x0) * dx + (py - y0) * dy) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = x0 + t * dx - px, ey = y0 + t * dy - py;
      if (ex * ex + ey * ey <= r2) k[y * W + x] = key;
    }
  }
}
function rRect(R, x0, y0, x1, y1, key) {
  const { W, H, k } = R;
  for (let y = Math.max(0, Math.ceil(y0 - 0.5)); y <= Math.min(H - 1, Math.floor(y1 - 0.5)); y++)
    for (let x = Math.max(0, Math.ceil(x0 - 0.5)); x <= Math.min(W - 1, Math.floor(x1 - 0.5)); x++) k[y * W + x] = key;
}
function rEll(R, cx, cy, rx, ry, rin, key) {      // rin: kalınlığın yarısı (0 = dolu)
  const { W, H, k } = R;
  const ox = rx + rin, oy = ry + rin, ix = rx - rin, iy = ry - rin;
  if (ox <= 0 || oy <= 0) return;
  for (let y = Math.max(0, Math.floor(cy - oy)); y <= Math.min(H - 1, Math.ceil(cy + oy)); y++) {
    const dy = y + 0.5 - cy;
    for (let x = Math.max(0, Math.floor(cx - ox)); x <= Math.min(W - 1, Math.ceil(cx + ox)); x++) {
      const dx = x + 0.5 - cx;
      if ((dx * dx) / (ox * ox) + (dy * dy) / (oy * oy) > 1) continue;
      if (rin > 0 && ix > 0 && iy > 0 && (dx * dx) / (ix * ix) + (dy * dy) / (iy * iy) < 1) continue;
      k[y * W + x] = key;
    }
  }
}
function rasterOp(R, op, asp) {
  const sx = R.W / 1000, sy = R.H / 1000, key = keyOf(op);
  if (key) R.tab.set(key, [op.c, op.a, op.d | 0]);
  const t = op.t;
  if (t === 's') {
    if (op.k === 3) {
      sprayDots(op, asp, (x, y, s) => {
        const px = Math.floor(x * sx), py = Math.floor(y * sy), q = s * sx >= 2 ? 2 : 1;
        for (let yy = py; yy < py + q; yy++) for (let xx = px; xx < px + q; xx++) if (xx >= 0 && yy >= 0 && xx < R.W && yy < R.H) R.k[yy * R.W + xx] = key;
      });
      return;
    }
    const r = Math.max(0.8, op.w * sx * (op.k === 1 ? 0.3 : 0.5));
    const f = flatten(op.p, sx, sy);
    if (f.length === 2) { rCap(R, f[0], f[1], f[0], f[1], r, key); return; }
    for (let j = 2; j < f.length; j += 2) rCap(R, f[j - 2], f[j - 1], f[j], f[j + 1], r, key);
    return;
  }
  const [a0, b0, a1, b1] = op.p, x0 = Math.min(a0, a1) * sx, x1 = Math.max(a0, a1) * sx, y0 = Math.min(b0, b1) * sy, y1 = Math.max(b0, b1) * sy;
  const r = Math.max(0.8, op.w * sx * 0.5);
  if (t === 'l') rCap(R, a0 * sx, b0 * sy, a1 * sx, b1 * sy, r, key);
  else if (t === 'r') {
    if (op.f) rRect(R, x0, y0, x1, y1, key);
    else { rCap(R, x0, y0, x1, y0, r, key); rCap(R, x1, y0, x1, y1, r, key); rCap(R, x1, y1, x0, y1, r, key); rCap(R, x0, y1, x0, y0, r, key); }
  } else if (t === 'o') rEll(R, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, op.f ? 0 : r, key);
}
// 4-komşulu tarama satırı doldurma → [y, x0, x1, ...]
function rFlood(R, fx, fy) {
  const { W, H, k } = R;
  const sx0 = cl(Math.floor(fx), 0, W - 1), sy0 = cl(Math.floor(fy), 0, H - 1);
  const target = k[sy0 * W + sx0], seen = new Uint8Array(W * H), runs = [], stack = [sx0, sy0];
  while (stack.length) {
    const y = stack.pop(), x = stack.pop(), row = y * W;
    if (seen[row + x] || k[row + x] !== target) continue;
    let l = x, r = x;
    while (l > 0 && !seen[row + l - 1] && k[row + l - 1] === target) l--;
    while (r < W - 1 && !seen[row + r + 1] && k[row + r + 1] === target) r++;
    for (let i = l; i <= r; i++) seen[row + i] = 1;
    runs.push(y, l, r);
    for (const ny of [y - 1, y + 1]) {
      if (ny < 0 || ny >= H) continue;
      const nr = ny * W; let inSpan = false;
      for (let i = l; i <= r; i++) {
        const ok = !seen[nr + i] && k[nr + i] === target;
        if (ok && !inSpan) { stack.push(i, ny); inSpan = true; } else if (!ok) inSpan = false;
      }
    }
  }
  return Int32Array.from(runs);
}
function rRuns(R, runs, key) { const { W, k } = R; for (let j = 0; j < runs.length; j += 3) { const row = runs[j] * W; for (let x = runs[j + 1]; x <= runs[j + 2]; x++) k[row + x] = key; } }
// test/teşhis: rasteri RGBA piksellerine çevir (desenler piksel fonksiyonuyla)
function patAt(d, u, v) {
  switch (d) {
    case 1: return (u - 0.5) * (u - 0.5) + (v - 0.5) * (v - 0.5) < 0.04;
    case 2: return ((u + v) % 1) < 0.3;
    case 3: return u < 0.14 || v < 0.14;
    case 4: return Math.abs(u - 0.5) + Math.abs(v - 0.5) < 0.3;
    case 5: { const x = (u - 0.5) * 2.6, y = (0.45 - v) * 2.6, q = x * x + y * y - 1; return q * q * q - x * x * y * y * y < 0; }
    case 6: { const tri = Math.abs(((u * 2) % 1) - 0.5) * 2; return Math.abs(v - 0.35 - 0.3 * tri) < 0.08; }
    case 7: return v < 0.08 || (v < 0.5 ? u < 0.08 : Math.abs(u - 0.5) < 0.04) || Math.abs(v - 0.5) < 0.04;
    case 8: return v > 0.35 && Math.abs(((u * 3) % 1) - 0.5) < 0.1 + (1 - v) * 0;
    case 9: return (u < 0.5) !== (v < 0.5);
    case 10: { const tri = Math.abs(((u * 2) % 1) - 0.5) * 2; return Math.abs(v - 0.5 + 0.25 * (tri - 0.5)) < 0.07; }
    default: return true;
  }
}
function rPixels(R) {
  const { W, H, k } = R, out = new Uint32Array(W * H), T = PAT_U / 1000 * W;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const key = k[y * W + x]; if (!key) { out[y * W + x] = 0xffffffff; continue; }
    const e = R.tab.get(key) || ['000000', 100, 0];
    const on = e[2] ? patAt(e[2], (x % T) / T, (y % T) / T) : true;
    out[y * W + x] = on ? ((parseInt(e[0], 16) << 8) | Math.round(e[1] * 2.55)) >>> 0 : 0xffffffff;
  }
  return out;
}

/* ---------- işlem uygulama (raster + isteğe bağlı tuval) ---------- */
function newScene(RW, RH) { return { RW, RH, asp: RW / RH, R: rNew(RW, RH), bg: null, masks: new WeakMap(), tmp: null }; }
function sceneApply(S, op, g, W, H) {
  if (op.t === 'x') { S.R = rNew(S.RW, S.RH); S.bg = null; if (g) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); } return; }
  if (op.t === 'b') { S.bg = op.c; return; }
  if (op.t === 'f') {
    let m = S.masks.get(op);
    if (!m) { m = { runs: rFlood(S.R, op.p[0] / 1000 * S.RW, op.p[1] / 1000 * S.RH), mc: null }; S.masks.set(op, m); }
    const key = keyOf(op); S.R.tab.set(key, [op.c, op.a, op.d | 0]); rRuns(S.R, m.runs, key);
    if (g && W > 1 && HAS_DOM) { if (!m.mc) m.mc = maskCanvas(m.runs, S.RW, S.RH); drawFill(S, g, W, H, op, m.mc); }
    return;
  }
  rasterOp(S.R, op, S.asp);
  if (g && W > 1) drawOp(g, W, H, op, S.asp);
}
function lastClear(ops) { for (let j = ops.length - 1; j >= 0; j--) if (ops[j].t === 'x') return j + 1; return 0; }
function replay(ops, RW, RH) { const S = newScene(RW, RH); for (let j = lastClear(ops); j < ops.length; j++) sceneApply(S, ops[j], null, 0, 0); return S; }

/* ---------- tuvale çizim ---------- */
const patCache = new Map();
function patTile(d, col, s) {
  const t = document.createElement('canvas'); t.width = t.height = s;
  const g = t.getContext('2d'); g.fillStyle = g.strokeStyle = '#' + col; g.lineCap = 'round'; g.lineJoin = 'round';
  const L = (w, pts) => { g.lineWidth = Math.max(1, s * w); g.beginPath(); g.moveTo(pts[0] * s, pts[1] * s); for (let j = 2; j < pts.length; j += 2) g.lineTo(pts[j] * s, pts[j + 1] * s); g.stroke(); };
  const C = (x, y, r) => { g.beginPath(); g.arc(x * s, y * s, r * s, 0, Math.PI * 2); g.fill(); };
  g.globalAlpha = 0.2; g.fillRect(0, 0, s, s); g.globalAlpha = 1;      // hafif zemin tonu: desenli alan "dolu" görünsün
  switch (d) {
    case 1: C(0.5, 0.5, 0.17); C(0, 0, 0.17); C(1, 0, 0.17); C(0, 1, 0.17); C(1, 1, 0.17); break;
    case 2: L(0.2, [0, 1, 1, 0]); L(0.2, [-0.5, 0.5, 0.5, -0.5]); L(0.2, [0.5, 1.5, 1.5, 0.5]); break;
    case 3: g.fillRect(0, 0, s, Math.max(1, s * 0.12)); g.fillRect(0, 0, Math.max(1, s * 0.12), s); break;
    case 4: { g.beginPath(); for (let j = 0; j < 10; j++) { const r = (j % 2 ? 0.17 : 0.4) * s, an = -Math.PI / 2 + j * Math.PI / 5; g.lineTo(s / 2 + Math.cos(an) * r, s / 2 + Math.sin(an) * r); } g.closePath(); g.fill(); break; }
    case 5: { g.beginPath(); g.moveTo(0.5 * s, 0.82 * s); g.bezierCurveTo(0.08 * s, 0.55 * s, 0.14 * s, 0.16 * s, 0.5 * s, 0.34 * s); g.bezierCurveTo(0.86 * s, 0.16 * s, 0.92 * s, 0.55 * s, 0.5 * s, 0.82 * s); g.fill(); break; }
    case 6: L(0.13, [-0.25, 0.65, 0, 0.35, 0.25, 0.65, 0.5, 0.35, 0.75, 0.65, 1, 0.35, 1.25, 0.65]); break;
    case 7: { const w = Math.max(1, s * 0.08); g.fillRect(0, 0, s, w); g.fillRect(0, s / 2 - w / 2, s, w); g.fillRect(0, 0, w, s / 2); g.fillRect(s / 2 - w / 2, s / 2, w, s / 2); break; }
    case 8: { const bl = [[0.12, 1, 0.05, 0.38], [0.3, 1, 0.38, 0.5], [0.5, 1, 0.48, 0.3], [0.7, 1, 0.8, 0.45], [0.88, 1, 0.93, 0.36]]; for (const b of bl) L(0.09, b); break; }
    case 9: g.fillRect(0, 0, s / 2, s / 2); g.fillRect(s / 2, s / 2, s / 2, s / 2); break;
    case 10: { g.lineWidth = Math.max(1, s * 0.12); g.beginPath(); g.moveTo(0, 0.5 * s); g.quadraticCurveTo(0.25 * s, 0.2 * s, 0.5 * s, 0.5 * s); g.quadraticCurveTo(0.75 * s, 0.8 * s, s, 0.5 * s); g.stroke(); break; }
    default: g.fillRect(0, 0, s, s);
  }
  return t;
}
function patternFor(g, d, col, W) {
  const T = PAT_U / 1000 * W, px = Math.max(6, Math.round(T)), key = d + ':' + col + ':' + px;
  let tile = patCache.get(key);
  if (!tile) { if (patCache.size > 80) patCache.clear(); tile = patTile(d, col, px); patCache.set(key, tile); }
  const pat = g.createPattern(tile, 'repeat');
  if (pat && pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix([T / px, 0, 0, T / px, 0, 0]));
  return pat || '#' + col;
}
const lum = c => { const n = parseInt(c, 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
const tileBg = c => (lum(c) > 0.78 ? '#2b2150' : '#fbf8ff');
function light(c, f) { const n = parseInt(c, 16), m = v => Math.round(v + (255 - v) * f); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => m(v).toString(16).padStart(2, '0')).join(''); }
function tracePath(g, p, sx, sy) {
  const n = p.length >> 1;
  g.beginPath(); g.moveTo(p[0] * sx, p[1] * sy);
  if (n === 1) { g.lineTo(p[0] * sx + 0.01, p[1] * sy); return; }
  for (let k = 1; k < n - 1; k++) { const ax = p[2 * k] * sx, ay = p[2 * k + 1] * sy, bx = p[2 * k + 2] * sx, by = p[2 * k + 3] * sy; g.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2); }
  g.lineTo(p[2 * n - 2] * sx, p[2 * n - 1] * sy);
}
function drawOp(g, W, H, op, asp) {
  const sx = W / 1000, sy = H / 1000, t = op.t;
  if (t === 'x' || t === 'b' || t === 'f') return;
  g.save();
  const col = '#' + op.c, a = op.a / 100, w = Math.max(1, op.w * sx);
  const style = op.d ? patternFor(g, op.d, op.c, W) : col;
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (t === 's') {
    const k = op.k;
    if (k === 3) { g.globalAlpha = a; g.fillStyle = col; sprayDots(op, asp, (x, y, s) => { const q = Math.max(1, s * sx); g.fillRect(x * sx - q / 2, y * sy - q / 2, q, q); }); }
    else {
      tracePath(g, op.p, sx, sy);
      if (k === 5) { g.globalCompositeOperation = 'destination-out'; g.strokeStyle = '#000'; g.lineWidth = w; g.stroke(); }
      else if (k === 1) { g.globalAlpha = a * 0.92; g.strokeStyle = style; g.lineWidth = w * 0.6; g.shadowColor = col; g.shadowBlur = w * 0.7; g.stroke(); }
      else if (k === 2) { g.globalAlpha = a * 0.5; g.strokeStyle = style; g.lineWidth = w; g.lineCap = 'square'; g.stroke(); }
      else if (k === 4) { g.globalAlpha = a; g.strokeStyle = style; g.lineWidth = w; g.shadowColor = col; g.shadowBlur = w * 1.6; g.stroke(); g.shadowBlur = w * 0.5; g.strokeStyle = light(op.c, 0.72); g.lineWidth = w * 0.38; g.stroke(); }
      else { g.globalAlpha = a; g.strokeStyle = style; g.lineWidth = w; g.stroke(); }
    }
  } else {
    const [a0, b0, a1, b1] = op.p;
    g.globalAlpha = a; g.strokeStyle = g.fillStyle = style; g.lineWidth = w;
    g.beginPath();
    if (t === 'l') { g.moveTo(a0 * sx, b0 * sy); g.lineTo(a1 * sx, b1 * sy); g.stroke(); }
    else {
      const x0 = Math.min(a0, a1) * sx, y0 = Math.min(b0, b1) * sy, x1 = Math.max(a0, a1) * sx, y1 = Math.max(b0, b1) * sy;
      if (t === 'r') g.rect(x0, y0, x1 - x0, y1 - y0);
      else g.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.max(0.1, (x1 - x0) / 2), Math.max(0.1, (y1 - y0) / 2), 0, 0, Math.PI * 2);
      if (op.f) g.fill(); else g.stroke();
    }
  }
  g.restore();
}
function maskCanvas(runs, RW, RH) {
  let x0 = RW, y0 = RH, x1 = -1, y1 = -1;
  for (let j = 0; j < runs.length; j += 3) { const y = runs[j]; if (y < y0) y0 = y; if (y > y1) y1 = y; if (runs[j + 1] < x0) x0 = runs[j + 1]; if (runs[j + 2] > x1) x1 = runs[j + 2]; }
  if (x1 < 0) return null;
  const bx = Math.max(0, x0 - 1), by = Math.max(0, y0 - 1), bw = Math.min(RW - 1, x1 + 1) - bx + 1, bh = Math.min(RH - 1, y1 + 1) - by + 1;
  const c = document.createElement('canvas'); c.width = bw; c.height = bh;
  const g = c.getContext('2d'), img = g.createImageData(bw, bh), A = img.data;
  const m = new Uint8Array(bw * bh);
  for (let j = 0; j < runs.length; j += 3) {           // 1 piksel genişletme: kenarlarda kâğıt rengi sızmasın
    const y = runs[j], xa = Math.max(bx, runs[j + 1] - 1), xb = Math.min(bx + bw - 1, runs[j + 2] + 1);
    for (let yy = Math.max(by, y - 1); yy <= Math.min(by + bh - 1, y + 1); yy++) { const row = (yy - by) * bw; for (let x = xa; x <= xb; x++) m[row + x - bx] = 1; }
  }
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {      // 3×3 yumuşatma: büyütülünce kenar basamaklanmasın
    let s = 0, c = 0;
    for (let yy = y - 1; yy <= y + 1; yy++) { if (yy < 0 || yy >= bh) continue; for (let xx = x - 1; xx <= x + 1; xx++) { if (xx < 0 || xx >= bw) continue; s += m[yy * bw + xx]; c++; } }
    const a = m[y * bw + x] ? Math.max(170, Math.round(s / c * 255)) : Math.round(s / 9 * 255 * 0.85);
    A[(y * bw + x) * 4 + 3] = a;
  }
  g.putImageData(img, 0, 0);
  return { cv: c, x: bx, y: by, w: bw, h: bh };
}
function drawFill(S, g, W, H, op, m) {
  if (!m) return;
  const sx = W / S.RW, sy = H / S.RH;
  const dx = Math.floor(m.x * sx), dy = Math.floor(m.y * sy), dw = Math.max(1, Math.ceil((m.x + m.w) * sx) - dx), dh = Math.max(1, Math.ceil((m.y + m.h) * sy) - dy);
  if (!S.tmp) S.tmp = document.createElement('canvas');
  const t = S.tmp; if (t.width < dw) t.width = dw; if (t.height < dh) t.height = dh;
  const tg = t.getContext('2d');
  tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, dw, dh);
  tg.imageSmoothingEnabled = true; tg.drawImage(m.cv, m.x * sx - dx, m.y * sy - dy, m.w * sx, m.h * sy);
  tg.globalCompositeOperation = 'source-in';
  tg.translate(-dx, -dy); tg.fillStyle = op.d ? patternFor(tg, op.d, op.c, W) : '#' + op.c; tg.fillRect(dx, dy, dw, dh);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = op.a / 100; g.drawImage(t, 0, 0, dw, dh, dx, dy, dw, dh); g.restore();
}
function canvasSize(el, dprMax) {
  const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return null;
  const dpr = Math.min(dprMax || 2.5, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
  return [Math.max(1, Math.round(w * dpr)), Math.max(1, Math.round(h * dpr))];
}
// salt-okunur çizim (albüm, küçük resimler)
function paintStatic(el, ops, RW, RH, dprMax) {
  if (!el) return;
  const sz = canvasSize(el, dprMax); if (!sz) return;
  if (el.width !== sz[0] || el.height !== sz[1]) { el.width = sz[0]; el.height = sz[1]; }
  const g = el.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, sz[0], sz[1]);
  const S = newScene(RW, RH);
  for (let j = lastClear(ops); j < ops.length; j++) sceneApply(S, ops[j], g, sz[0], sz[1]);
  el.style.backgroundColor = S.bg ? '#' + S.bg : '';
}

class Painter {
  constructor(cv, RW, RH) {
    this.cv = cv; this.g = cv.getContext('2d'); this.RW = RW; this.RH = RH;
    this.base = document.createElement('canvas'); this.bg2 = this.base.getContext('2d');
    this.ops = []; this.live = []; this.S = newScene(RW, RH); this.raf = 0; this.to = 0;
  }
  fit() {
    const sz = canvasSize(this.cv); if (!sz) return false;
    if (sz[0] !== this.cv.width || sz[1] !== this.cv.height) { this.cv.width = this.base.width = sz[0]; this.cv.height = this.base.height = sz[1]; this.rebuild(); }
    return true;
  }
  setOps(ops, live) { this.ops = ops; this.live = live || []; this.rebuild(); }
  rebuild() {
    const masks = this.S.masks; this.S = newScene(this.RW, this.RH); this.S.masks = masks;
    const W = this.base.width, H = this.base.height;
    this.bg2.setTransform(1, 0, 0, 1, 0, 0); this.bg2.clearRect(0, 0, W, H);
    for (let j = lastClear(this.ops); j < this.ops.length; j++) sceneApply(this.S, this.ops[j], this.bg2, W, H);
    this.show();
  }
  push(op) { this.ops.push(op); sceneApply(this.S, op, this.bg2, this.base.width, this.base.height); this.show(); }
  pop() { const op = this.ops.pop(); this.rebuild(); return op; }
  get bg() { return this.S.bg; }
  show() {
    if (this.raf) return;
    const run = () => { if (!this.raf) return; cancelAnimationFrame(this.raf); clearTimeout(this.to); this.raf = 0; this.paint(); };
    this.raf = requestAnimationFrame(run); this.to = setTimeout(run, 80);
  }
  paint() {
    const g = this.g, W = this.cv.width, H = this.cv.height;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.clearRect(0, 0, W, H); if (this.base.width > 1) g.drawImage(this.base, 0, 0);
    for (const op of this.live) drawOp(g, W, H, op, this.S.asp);
    const bg = this.S.bg ? '#' + this.S.bg : '';
    if (this.cv.style.backgroundColor !== bg) this.cv.style.backgroundColor = bg;
  }
  destroy() { cancelAnimationFrame(this.raf); clearTimeout(this.to); this.raf = 0; }
}

/* ---------- simgeler ---------- */
const SV = b => `<svg viewBox="0 0 24 24" aria-hidden="true">${b}</svg>`;
const ICON = {
  pen: SV('<path d="M4 20l1.2-4.6L15.6 5a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z"/><path d="M13.5 7l3.5 3.5"/>'),
  brush: SV('<path d="M20 4c-3 1.2-7.6 5.4-9.4 7.8l1.6 1.6C14.6 11.6 18.8 7 20 4z"/><path d="M9.6 12.8c-2.6 0-4 1.8-4 4 0 1.4-.8 2.4-1.6 3 3.4.6 7.6-.4 7.6-4.6"/>'),
  marker: SV('<path d="M7 17l-2 3h5l1-1"/><path d="M8 16l7.6-10.4a2 2 0 0 1 2.8-.4l1.4 1a2 2 0 0 1 .4 2.8L12 19z"/>'),
  spray: SV('<rect x="5" y="10" width="8" height="11" rx="2"/><path d="M7 10V7h4v3"/><path d="M15.5 5h.01M18 3.5h.01M18 6.5h.01M20.5 5h.01M20.5 8h.01M18 9.5h.01" stroke-width="2.4"/>'),
  neon: SV('<path d="M12 2.8l1.9 5.6 5.7 1.9-5.7 1.9L12 17.8l-1.9-5.6-5.7-1.9 5.7-1.9z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/>'),
  eraser: SV('<path d="M9 20h11"/><path d="M4.6 14.6l9-9a2 2 0 0 1 2.8 0l3 3a2 2 0 0 1 0 2.8L11 19.8H8.6z"/><path d="M9 10.2l5.8 5.8"/>'),
  fill: SV('<path d="M4 11.5L11.5 4l7 7-7.5 7.5a2 2 0 0 1-2.8 0L4 14.3a2 2 0 0 1 0-2.8z"/><path d="M4.5 12h13.5"/><path d="M20.5 14.5s1.8 2.4 1.8 3.6a1.8 1.8 0 0 1-3.6 0c0-1.2 1.8-3.6 1.8-3.6z"/>'),
  line: SV('<path d="M5 19L19 5"/><circle cx="5" cy="19" r="1.6"/><circle cx="19" cy="5" r="1.6"/>'),
  rect: SV('<rect x="3.5" y="6" width="17" height="12" rx="1.5"/>'),
  ellipse: SV('<ellipse cx="12" cy="12" rx="9" ry="6.6"/>'),
  picker: SV('<path d="M20 4a2.4 2.4 0 0 0-3.4 0l-2.3 2.3-1.2-1.2-1.8 1.8 6 6 1.8-1.8-1.2-1.2L20 7.4A2.4 2.4 0 0 0 20 4z"/><path d="M11.5 8.5L4.6 15.4a2 2 0 0 0-.6 1.4V20h3.2a2 2 0 0 0 1.4-.6l6.9-6.9"/><path d="M6.5 15.5h6"/>'),
  undo: SV('<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  redo: SV('<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
  trash: SV('<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>'),
  shapes: SV('<path d="M8.5 3.5l5 8.5h-10z"/><circle cx="16.5" cy="16" r="4.5"/><rect x="3.5" y="14.5" width="6" height="6" rx="1"/>'),
  bg: SV('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 16l5-5 4 4 2.5-2.5 5.5 5.5"/><circle cx="15.5" cy="9" r="1.6"/>'),
  stroke: SV('<rect x="4" y="6" width="16" height="12" rx="2"/>'),
  filled: SV('<rect x="4" y="6" width="16" height="12" rx="2" fill="currentColor"/>'),
  reset: SV('<path d="M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5"/>'),
  ghost: SV('<path d="M6 20V10a6 6 0 0 1 12 0v10l-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6z"/><path d="M10 10h.01M14 10h.01" stroke-width="2.6"/>')
};

/* ---------- etkileşimli tahta (çizen) ---------- */
const SKEY = 'cf.paint.v1';
function loadSet() {
  const def = { tool: 'pen', c: '1b1530', a: 100, d: 0, f: 0, ws: { pen: 6, brush: 16, marker: 18, spray: 22, neon: 9, eraser: 26, line: 6, rect: 6, ellipse: 6 }, recent: ['e8222e', '1a8cff', 'ffd60a', '2fbf4a', 'ff4fb8', 'ffffff'] };
  try { const s = JSON.parse(localStorage.getItem(SKEY) || 'null'); if (s && typeof s === 'object') { Object.assign(def.ws, s.ws || {}); ['c', 'a', 'd', 'f'].forEach(k => { if (s[k] != null) def[k] = s[k]; }); if (Array.isArray(s.recent)) def.recent = s.recent.filter(c => /^[0-9a-f]{6}$/.test(c)).slice(0, 8); if (TOOL[s.tool] && s.tool !== 'picker') def.tool = s.tool; } } catch { /* depolama kapalı olabilir */ }
  if (!/^[0-9a-f]{6}$/.test(def.c)) def.c = '1b1530';
  def.a = cl(def.a | 0 || 100, 5, 100); def.d = cl(def.d | 0, 0, NPAT); def.f = def.f ? 1 : 0;
  return def;
}
function saveSet(s) { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch { /* */ } }

class Board {
  // cfg: { K (css öneki), bar, cv, wrap (yakınlaştırılan öğe), frame (tuval çerçevesi), painter, store {ops, redo, nid},
  //        canDraw(), emit(type, op), confirm(title, text, yes) → Promise, maxPts, maxOps, maxFills, simplify, paper }
  constructor(cfg) {
    this.cfg = cfg; this.K = cfg.K; this.p = cfg.painter; this.st = cfg.store;
    this.set = loadSet(); this.cur = null; this.curPid = null; this.ptrs = new Map(); this.pz = null; this.zs = 1; this.ztx = 0; this.zty = 0;
    this.prevTool = 'pen'; this.sprayT = null; this.toastT = null; this.lastPatCol = '';
    this.onDown = this.onDown.bind(this); this.onMove = this.onMove.bind(this); this.onUp = this.onUp.bind(this);
    this.onKey = this.onKey.bind(this); this.onDocDown = this.onDocDown.bind(this); this.onBar = this.onBar.bind(this); this.onInput = this.onInput.bind(this);
    const cv = cfg.cv;
    cv.addEventListener('pointerdown', this.onDown); cv.addEventListener('pointermove', this.onMove);
    cv.addEventListener('pointerup', this.onUp); cv.addEventListener('pointercancel', this.onUp); cv.addEventListener('lostpointercapture', this.onUp);
    cv.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', this.onKey); document.addEventListener('pointerdown', this.onDocDown, true);
    const zr = document.createElement('button'); zr.type = 'button'; zr.className = cfg.K + '-zreset'; zr.innerHTML = ICON.reset; zr.title = 'Yakınlaştırmayı sıfırla'; zr.setAttribute('aria-label', 'Yakınlaştırmayı sıfırla');
    zr.addEventListener('click', () => this.resetZoom()); cfg.frame.appendChild(zr); this.zr = zr;
    this.build();
  }
  get ops() { return this.p.ops; }
  id() { return this.st.nid++; }
  destroy() {
    const cv = this.cfg.cv;
    cv.removeEventListener('pointerdown', this.onDown); cv.removeEventListener('pointermove', this.onMove);
    cv.removeEventListener('pointerup', this.onUp); cv.removeEventListener('pointercancel', this.onUp); cv.removeEventListener('lostpointercapture', this.onUp);
    document.removeEventListener('keydown', this.onKey); document.removeEventListener('pointerdown', this.onDocDown, true);
    clearInterval(this.sprayT); clearTimeout(this.toastT); if (this.zr) this.zr.remove();
  }
  /* ----- araç çubuğu ----- */
  build() {
    const K = this.K, s = this.set;
    const tb = (id, extra = '') => `<button type="button" class="${K}-b ${K}-t" data-tool="${id}" title="${TOOL[id].name} (${TOOL[id].key.toUpperCase()})" aria-label="${TOOL[id].name}" ${extra}>${ICON[id]}</button>`;
    this.cfg.bar.innerHTML = `<div class="${K}" data-open="">
      <div class="${K}-panels">
        <section class="${K}-panel ${K}-p-tools" data-panel="tools">
          <h4>Araçlar</h4>
          <div class="${K}-tools">${TOOLS.map(t => `<button type="button" class="${K}-tool" data-tool="${t.id}" title="${t.name} (${t.key.toUpperCase()})">${ICON[t.id]}<span>${t.name}</span></button>`).join('')}</div>
          <div class="${K}-seg" role="group" aria-label="Şekil"><button type="button" data-fm="0">${ICON.stroke}<span>Çerçeve</span></button><button type="button" data-fm="1">${ICON.filled}<span>Dolu</span></button></div>
          <button type="button" class="${K}-wide ${K}-clr2" data-act="clear">${ICON.trash}<span>Tuvali temizle</span></button>
        </section>
        <section class="${K}-panel ${K}-p-colors" data-panel="colors">
          <h4>Renk <span class="${K}-hex"></span></h4>
          <div class="${K}-pal">${PALETTE.map((c, i) => `<button type="button" class="${K}-sw" data-col="${c}" style="--sw:#${c}" title="${PAL_NAMES[i]}" aria-label="${PAL_NAMES[i]}"></button>`).join('')}</div>
          <div class="${K}-crow">
            <label class="${K}-custom" title="Özel renk"><input type="color" class="${K}-cin" value="#${s.c}" aria-label="Özel renk seç"><span>+</span></label>
            <div class="${K}-recent" aria-label="Son renkler"></div>
          </div>
          <div class="${K}-orow"><span>Opaklık</span><input type="range" class="${K}-ar" min="5" max="100" step="5" aria-label="Opaklık"><b class="${K}-av"></b></div>
          <button type="button" class="${K}-wide" data-act="bg">${ICON.bg}<span>Zemini bu renge boya</span></button>
        </section>
        <section class="${K}-panel ${K}-p-size" data-panel="size">
          <h4>Kalınlık <b class="${K}-wv"></b></h4>
          <div class="${K}-srow"><input type="range" class="${K}-wr" min="1" max="80" aria-label="Kalınlık"><span class="${K}-prev"><i></i></span></div>
          <div class="${K}-pre">${SIZE_PRESETS.map(w => `<button type="button" data-w="${w}" aria-label="Kalınlık ${w}"><i style="--d:${Math.round(3 + w * 0.55)}px"></i></button>`).join('')}</div>
        </section>
        <section class="${K}-panel ${K}-p-pat" data-panel="pattern">
          <h4>Desen</h4>
          <div class="${K}-pats">${PATTERNS.map((n, i) => `<button type="button" class="${K}-pt" data-pat="${i}" title="${n}"><canvas width="44" height="44"></canvas><span>${n}</span></button>`).join('')}</div>
        </section>
        <section class="${K}-panel ${K}-p-acts" data-panel="acts">
          <button type="button" class="${K}-b" data-act="undo" title="Geri al (Ctrl+Z)" aria-label="Geri al">${ICON.undo}<span>Geri al</span></button>
          <button type="button" class="${K}-b" data-act="redo" title="Yinele (Ctrl+Y)" aria-label="Yinele">${ICON.redo}<span>Yinele</span></button>
          <button type="button" class="${K}-b ${K}-danger" data-act="clear" title="Temizle" aria-label="Temizle">${ICON.trash}<span>Temizle</span></button>
        </section>
      </div>
      <div class="${K}-bar">
        <div class="${K}-row">
          ${QUICK.map(id => tb(id)).join('')}
          <button type="button" class="${K}-b ${K}-more" data-open-p="tools" aria-label="Tüm araçlar" title="Tüm araçlar">${ICON.shapes}</button>
          <button type="button" class="${K}-b" data-act="undo" aria-label="Geri al" title="Geri al (Ctrl+Z)">${ICON.undo}</button>
          <button type="button" class="${K}-b" data-act="redo" aria-label="Yinele" title="Yinele (Ctrl+Y)">${ICON.redo}</button>
        </div>
        <div class="${K}-row">
          <button type="button" class="${K}-b ${K}-cur" data-open-p="colors" aria-label="Renkler"><i></i></button>
          <div class="${K}-quick"></div>
          <button type="button" class="${K}-b ${K}-szb" data-open-p="size" aria-label="Kalınlık"><i></i></button>
          <button type="button" class="${K}-b ${K}-ptb" data-open-p="pattern" aria-label="Desen"><canvas width="40" height="40"></canvas></button>
        </div>
      </div>
      <div class="${K}-toast" hidden></div>
    </div>`;
    this.el = this.cfg.bar.querySelector('.' + K);
    this.el.addEventListener('click', this.onBar); this.el.addEventListener('input', this.onInput); this.el.addEventListener('change', this.onInput);
    this.refresh(true);
  }
  q(s) { return this.el.querySelector(s); }
  qa(s) { return this.el.querySelectorAll(s); }
  refresh(force) {
    if (!this.el) return;
    const K = this.K, s = this.set, tl = TOOL[s.tool], can = this.cfg.canDraw(), w = s.ws[s.tool] || 6;
    this.el.classList.toggle('off', !can);
    this.qa('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === s.tool));
    const more = this.q(`.${K}-more`); more.innerHTML = QUICK.includes(s.tool) ? ICON.shapes : ICON[s.tool]; more.classList.toggle('on', !QUICK.includes(s.tool));
    this.qa('[data-fm]').forEach(b => b.classList.toggle('on', +b.dataset.fm === s.f));
    this.qa('[data-col]').forEach(b => b.classList.toggle('on', b.dataset.col === s.c));
    this.qa('[data-pat]').forEach(b => b.classList.toggle('on', +b.dataset.pat === s.d));
    this.qa('[data-w]').forEach(b => b.classList.toggle('on', +b.dataset.w === w));
    const rgba = `rgba(${parseInt(s.c.slice(0, 2), 16)},${parseInt(s.c.slice(2, 4), 16)},${parseInt(s.c.slice(4, 6), 16)},${s.a / 100})`;
    this.el.style.setProperty('--kc', '#' + s.c); this.el.style.setProperty('--kca', rgba); this.el.style.setProperty('--kpb', tileBg(s.c));
    this.el.style.setProperty('--kw', Math.round(cl(3 + w * 0.42, 3, 30)) + 'px');
    this.q(`.${K}-hex`).textContent = '#' + s.c.toUpperCase();
    const wr = this.q(`.${K}-wr`); if (+wr.value !== w) wr.value = w; this.q(`.${K}-wv`).textContent = w;
    const ar = this.q(`.${K}-ar`); if (+ar.value !== s.a) ar.value = s.a; this.q(`.${K}-av`).textContent = s.a + '%';
    const cin = this.q(`.${K}-cin`); if (document.activeElement !== cin && cin.value !== '#' + s.c) cin.value = '#' + s.c;
    const rec = s.recent.filter(c => c !== s.c);
    this.q(`.${K}-recent`).innerHTML = rec.slice(0, 6).map(c => `<button type="button" class="${K}-sw" data-col="${c}" style="--sw:#${c}" aria-label="Son renk #${c}"></button>`).join('');
    this.q(`.${K}-quick`).innerHTML = rec.slice(0, 4).map(c => `<button type="button" class="${K}-b ${K}-qs" data-col="${c}" style="--sw:#${c}" aria-label="Renk #${c}"><i></i></button>`).join('');
    const patOk = tl.t !== '' && !(tl.t === 's' && (tl.k === 3 || tl.k === 5));
    this.el.dataset.tool = s.tool; this.el.classList.toggle('nopat', !patOk); this.el.classList.toggle('shape', tl.t === 'r' || tl.t === 'o');
    if (force || this.lastPatCol !== s.c + s.d) { this.lastPatCol = s.c + s.d; this.paintPats(); }
    const dis = !can;
    this.qa('button, input').forEach(b => { b.disabled = dis; });
    if (can) {
      this.qa('[data-act="undo"]').forEach(b => { b.disabled = !this.ops.length && !this.cur; });
      this.qa('[data-act="redo"]').forEach(b => { b.disabled = !this.st.redo.length; });
      this.qa('[data-act="clear"]').forEach(b => { b.disabled = !this.ops.length || this.ops[this.ops.length - 1].t === 'x'; });
    }
    this.cfg.frame.classList.toggle(K + '-zoomed', this.zs > 1.01);
  }
  paintPats() {
    const s = this.set;
    const tile = (cv, d) => {
      const g = cv.getContext('2d'), W = cv.width; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, W);
      g.fillStyle = tileBg(s.c); g.fillRect(0, 0, W, W);
      if (!d) { g.fillStyle = '#' + s.c; g.fillRect(0, 0, W, W); return; }
      g.fillStyle = patternFor(g, d, s.c, W * 1000 / (PAT_U * 2.2)); g.fillRect(0, 0, W, W);
    };
    this.qa('[data-pat] canvas').forEach(cv => tile(cv, +cv.parentElement.dataset.pat));
    const bt = this.q(`.${this.K}-ptb canvas`);
    if (s.d) tile(bt, s.d);
    else {                                             // desen yokken: dört desenli küçük mozaik (düğmenin anlamı belli olsun)
      const g = bt.getContext('2d'), W = bt.width, h = W / 2; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#fbf8ff'; g.fillRect(0, 0, W, W);
      [1, 4, 2, 9].forEach((d, j) => { g.save(); g.beginPath(); g.rect((j % 2) * h, (j >> 1) * h, h, h); g.clip(); g.fillStyle = patternFor(g, d, j % 3 ? '6b3dff' : 'ff4fb8', W * 1000 / (PAT_U * 3.2)); g.fillRect(0, 0, W, W); g.restore(); });
    }
  }
  open(p) { this.el.dataset.open = this.el.dataset.open === p ? '' : p; }
  close() { if (this.el) this.el.dataset.open = ''; }
  onDocDown(e) { if (this.el && this.el.dataset.open && !this.el.contains(e.target)) this.close(); }
  save() { saveSet(this.set); }
  setTool(id) {
    if (!TOOL[id]) return;
    if ((id === 'picker' || id === 'eraser') && this.set.tool !== 'picker' && this.set.tool !== 'eraser') this.prevTool = this.set.tool;
    this.set.tool = id; this.save(); this.refresh();
  }
  setColor(c, keep) {
    this.set.c = c; if (!keep) this.addRecent(c);
    if (this.set.tool === 'eraser' || this.set.tool === 'picker') this.set.tool = this.prevTool && this.prevTool !== 'eraser' && this.prevTool !== 'picker' ? this.prevTool : 'pen';
    this.save(); this.refresh();
  }
  addRecent(c) { const r = this.set.recent.filter(x => x !== c); r.unshift(c); this.set.recent = r.slice(0, 8); }
  onBar(e) {
    const b = e.target.closest('button'); if (!b || b.disabled || !this.cfg.canDraw()) return;
    if (b.dataset.openP) { this.open(b.dataset.openP); return; }
    if (b.dataset.tool) { this.setTool(b.dataset.tool); if (b.closest('[data-panel]')) this.close(); return; }
    if (b.dataset.col) { this.setColor(b.dataset.col); this.close(); return; }
    if (b.dataset.pat != null) { this.set.d = +b.dataset.pat; const tl = TOOL[this.set.tool]; if (tl.t === '' || (tl.t === 's' && (tl.k === 3 || tl.k === 5))) this.set.tool = 'fill'; this.save(); this.refresh(); this.close(); return; }
    if (b.dataset.w) { this.set.ws[this.set.tool] = +b.dataset.w; this.save(); this.refresh(); return; }
    if (b.dataset.fm != null) { this.set.f = +b.dataset.fm; if (!(this.set.tool === 'rect' || this.set.tool === 'ellipse')) this.set.tool = 'rect'; this.save(); this.refresh(); return; }
    const a = b.dataset.act;
    if (a === 'undo') this.undo(); else if (a === 'redo') this.redo(); else if (a === 'clear') { this.close(); this.clear(); }
    else if (a === 'bg') { this.close(); this.commit({ i: this.id(), t: 'b', c: this.set.c }); this.toast('Zemin boyandı'); }
  }
  onInput(e) {
    const t = e.target, K = this.K;
    if (t.classList.contains(K + '-wr')) { this.set.ws[this.set.tool] = cl(+t.value | 0, 1, 80); this.refresh(); if (e.type === 'change') this.save(); }
    else if (t.classList.contains(K + '-ar')) { this.set.a = cl(+t.value | 0, 5, 100); this.refresh(); if (e.type === 'change') this.save(); }
    else if (t.classList.contains(K + '-cin')) { const c = t.value.replace('#', '').toLowerCase(); if (/^[0-9a-f]{6}$/.test(c)) this.setColor(c, e.type !== 'change'); }
  }
  toast(msg) {
    const t = this.q(`.${this.K}-toast`); if (!t) return;
    t.textContent = msg; t.hidden = false; t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
    clearTimeout(this.toastT); this.toastT = setTimeout(() => { t.hidden = true; }, 1800);
  }
  onKey(e) {
    if (!this.cfg.canDraw() || !this.cfg.cv.isConnected) return;
    const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
    const mod = e.ctrlKey || e.metaKey, k = (e.key || '').toLowerCase();
    if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); this.undo(); return; }
    if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); this.redo(); return; }
    if (mod || e.altKey) return;
    if (k === '[' || k === ']') { const w = this.set.ws[this.set.tool] || 6; this.set.ws[this.set.tool] = cl(w + (k === ']' ? Math.max(1, Math.round(w * 0.2)) : -Math.max(1, Math.round(w * 0.2))), 1, 80); this.save(); this.refresh(); return; }
    const t = TOOLS.find(x => x.key === k); if (t) { this.setTool(t.id); }
  }
  /* ----- komutlar ----- */
  commit(op, type) {
    this.p.push(op); this.st.redo.length = 0;
    if (op.c && op.t !== 'b' && !(op.t === 's' && op.k === 5)) this.addRecent(op.c);
    this.cfg.emit(type || 'add', op); this.refresh();
  }
  undo() {
    if (this.cur) this.finish();
    if (!this.ops.length) return;
    const op = this.p.pop(); this.st.redo.push(op);
    this.cfg.emit('undo', op); this.refresh();
  }
  redo() {
    if (this.cur) this.finish();
    const op = this.st.redo.pop(); if (!op) return;
    this.p.push(op); this.cfg.emit('redo', op); this.refresh();
  }
  async clear() {
    if (!this.ops.length || this.ops[this.ops.length - 1].t === 'x') return;
    if (this.cur) this.finish();
    const ok = this.cfg.confirm ? await this.cfg.confirm('Tuvali temizle', 'Tüm çizim silinecek. (Geri al ile geri getirebilirsin.)', 'Temizle') : true;
    if (!ok || !this.cfg.canDraw()) return;
    this.commit({ i: this.id(), t: 'x' });
  }
  budgetOk(kind) {
    const c = this.cfg;
    if (c.maxOps && this.ops.length >= c.maxOps) { this.toast('Tuval dolu! Biraz geri al ya da temizle.'); return false; }
    if (kind === 's' && c.maxPts && npts(this.ops) >= c.maxPts - 40) { this.toast('Tuval dolu! Biraz geri al ya da temizle.'); return false; }
    if (kind === 'f' && c.maxFills && this.ops.filter(o => o.t === 'f').length >= c.maxFills) { this.toast('Çok fazla boya kovası kullanıldı.'); return false; }
    return true;
  }
  /* ----- girdi ----- */
  unit(e) {
    const r = this.cfg.cv.getBoundingClientRect();
    return [cl(Math.round((e.clientX - r.left) / r.width * 1000), 0, 1000), cl(Math.round((e.clientY - r.top) / r.height * 1000), 0, 1000)];
  }
  onDown(e) {
    if (!this.cfg.canDraw() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.pointerType });
    if (this.ptrs.size === 2 && e.pointerType === 'touch') { this.cancelCur(); this.pinchStart(); return; }
    if (this.ptrs.size > 1) return;
    try { this.cfg.cv.setPointerCapture(e.pointerId); } catch { /* */ }
    this.close();
    const [x, y] = this.unit(e), s = this.set, tl = TOOL[s.tool];
    if (tl.id === 'picker') { this.pick(x, y); return; }
    if (tl.t === 'f') { if (this.budgetOk('f')) this.commit({ i: this.id(), t: 'f', c: s.c, a: s.a, d: s.d, p: [x, y] }); return; }
    if (!this.budgetOk(tl.t === 's' ? 's' : 'o')) return;
    const op = { i: this.id(), t: tl.t, c: s.c, a: s.a, w: s.ws[tl.id] || 6, d: (tl.k === 3 || tl.k === 5) ? 0 : s.d };
    if (tl.t === 's') { op.k = tl.k; op.p = [x, y]; } else { op.f = s.f; op.p = [x, y, x, y]; }
    this.cur = op; this.curPid = e.pointerId; this.p.live = [op]; this.p.show();
    if (op.t === 's') {
      this.cfg.emit('begin', op);
      if (op.k === 3) { clearInterval(this.sprayT); this.sprayT = setInterval(() => { const c = this.cur; if (!c || c !== op) { clearInterval(this.sprayT); return; } if (c.p.length >> 1 < STROKE_MAX) { c.p.push(c.p[c.p.length - 2], c.p[c.p.length - 1]); this.p.show(); this.cfg.emit('pts', c); } }, 90); }
    }
    this.refresh();
  }
  onMove(e) {
    if (this.ptrs.has(e.pointerId)) this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.pointerType });
    if (this.pz) { e.preventDefault(); this.pinchMove(); return; }
    const op = this.cur; if (!op || this.curPid !== e.pointerId) return;
    e.preventDefault();
    if (op.t === 's') {
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      const cw = this.cfg.cv.clientWidth || 300, ch = this.cfg.cv.clientHeight || 300, minD = op.k === 3 ? 3 : 1.8;
      let added = false;
      for (const ev of (evs.length ? evs : [e])) {
        const [x, y] = this.unit(ev), p = op.p, lx = p[p.length - 2], ly = p[p.length - 1];
        if (Math.hypot((x - lx) * cw / 1000, (y - ly) * ch / 1000) < minD) continue;
        if ((p.length >> 1) >= STROKE_MAX) { this.split(); return; }
        p.push(x, y); added = true;
      }
      if (added) { this.p.show(); this.cfg.emit('pts', op); }
    } else {
      let [x, y] = this.unit(e);
      if (e.shiftKey && op.t !== 'l') { const asp = this.p.RW / this.p.RH, dx = x - op.p[0], dy = (y - op.p[1]) / asp, m = Math.max(Math.abs(dx), Math.abs(dy)); x = cl(Math.round(op.p[0] + Math.sign(dx || 1) * m), 0, 1000); y = cl(Math.round(op.p[1] + Math.sign(dy || 1) * m * asp), 0, 1000); }
      op.p[2] = x; op.p[3] = y; this.p.show();
    }
  }
  onUp(e) {
    this.ptrs.delete(e.pointerId);
    if (this.pz) { if (this.ptrs.size < 2) this.pz = null; return; }
    if (!this.cur || (e && this.curPid !== e.pointerId)) return;
    this.finish();
  }
  split() {                                           // çok uzun çizgi: kes ve aynı ayarlarla devam et
    const op = this.cur, lx = op.p[op.p.length - 2], ly = op.p[op.p.length - 1];
    this.finish();
    if (!this.budgetOk('s')) return;
    const n = Object.assign({}, op, { i: this.id(), p: [lx, ly] }); delete n.e;
    this.cur = n; this.p.live = [n]; this.cfg.emit('begin', n);
  }
  finish() {
    const op = this.cur; if (!op) return;
    this.cur = null; this.curPid = null; this.p.live = []; clearInterval(this.sprayT);
    if (op.t === 's') {
      if (this.cfg.simplify && op.k !== 3) op.p = rdp(op.p, this.cfg.simplify);
      this.commit(op, 'end'); return;
    }
    const dx = Math.abs(op.p[2] - op.p[0]), dy = Math.abs(op.p[3] - op.p[1]);
    if ((op.t === 'l' && dx + dy < 3) || (op.t !== 'l' && (dx < 3 || dy < 3))) { this.p.show(); this.refresh(); return; }
    this.commit(op, 'add');
  }
  cancelCur() {
    const op = this.cur; if (!op) return;
    this.cur = null; this.curPid = null; this.p.live = []; this.p.show(); clearInterval(this.sprayT);
    if (op.t === 's') this.cfg.emit('cancel', op);
    this.refresh();
  }
  pick(x, y) {
    const cv = this.cfg.cv, px = cl(Math.floor(x / 1000 * cv.width), 0, cv.width - 1), py = cl(Math.floor(y / 1000 * cv.height), 0, cv.height - 1);
    this.p.paint();
    let d; try { d = cv.getContext('2d').getImageData(px, py, 1, 1).data; } catch { return; }
    const bg = this.p.bg || this.cfg.paper || 'ffffff', bn = parseInt(bg, 16), al = d[3] / 255;
    const mix = (v, b) => Math.round(v * al + b * (1 - al));
    const c = [mix(d[0], (bn >> 16) & 255), mix(d[1], (bn >> 8) & 255), mix(d[2], bn & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
    this.set.tool = this.prevTool && this.prevTool !== 'picker' ? this.prevTool : 'pen';
    this.setColor(c); this.toast('Renk alındı #' + c.toUpperCase());
  }
  /* ----- iki parmakla yakınlaştırma ----- */
  pinchStart() {
    const [a, b] = [...this.ptrs.values()];
    this.pz = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, s0: this.zs, tx0: this.ztx, ty0: this.zty };
  }
  pinchMove() {
    const v = [...this.ptrs.values()]; if (v.length < 2) return;
    const [a, b] = v, z = this.pz, r = this.cfg.frame.getBoundingClientRect();
    const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const s = cl(z.s0 * d / z.d0, 1, 4);
    const cx = (z.mx - r.left - z.tx0) / z.s0, cy = (z.my - r.top - z.ty0) / z.s0;
    this.zoom(s, mx - r.left - cx * s, my - r.top - cy * s);
  }
  zoom(s, tx, ty) {
    const r = this.cfg.frame.getBoundingClientRect();
    this.zs = s; this.ztx = cl(tx, r.width - r.width * s, 0); this.zty = cl(ty, r.height - r.height * s, 0);
    if (s <= 1.01) { this.zs = 1; this.ztx = this.zty = 0; }
    this.cfg.wrap.style.transform = this.zs > 1 ? `translate(${this.ztx}px,${this.zty}px) scale(${this.zs})` : '';
    this.cfg.frame.classList.toggle(this.K + '-zoomed', this.zs > 1.01);
  }
  resetZoom() { this.zoom(1, 0, 0); }
}

return { enc, dec, unpack, pack, meta, npts, rdp, keyOf, rNew, rasterOp, rFlood, rRuns, rPixels, replay, newScene, sceneApply, lastClear,
  drawOp, paintStatic, Painter, Board, ICON, PALETTE, PATTERNS, TOOLS, STROKE_MAX, light };
})();
/* @@PAINTKIT-END */

/* ---------- sabitler ---------- */
const RW = 480, RH = 480;                       // boya kovası sınır rasteri (kare tuval, her cihazda aynı)
const PAPER = 'fffdf6';
const MAX_BYTES = 40000, IMG_MAX = 56000, THUMB_BYTES = 9000, MAX_OPS = 1500, MAX_PTS = 12000, TX_MAX = 80;
const C_MAX_PTS = 9500, C_MAX_OPS = 1200, C_MAX_FILLS = 120;
const REACT = ['👍', '😂', '😮'];
const ALB_MS = 4000, ALB_CHAIN_MS = 5500, ALB_MANUAL_MS = 30000, VOTE_MS = 60000;
const OLDPAL = ['1b1530', 'e8222e', 'ff7a1a', 'ffd60a', '2fbf4a', '1a8cff', '6b3dff', '8b5a2b'];
const OLDW = [6, 12, 26];
const PASTEL = ['b3d9ff', 'ffe5a3', 'd9c2ff', 'b8f2c9', 'ffb3c7', 'ffe0c4'];
const MODES = { classic: 'Klasik', fast: 'Hızlı', secret: 'Gizli Başlangıç', anim: 'Animasyon (Devam Et)' };
const drawBytes = d => JSON.stringify(d).length;
const hasDraw = it => !!it && it.k === 'd' && (!!it.img || (Array.isArray(it.d) && it.d.length > 0));
// albüm/oylama küçük resimleri: çizgileri sadeleştirerek bütçeye sığdır (sonuç her cihazda aynı op listesi)
function simplifyOps(d, budget) {
  if (drawBytes(d) <= budget) return d;
  let ops = d.map(o => PK.unpack(o, 4000)).filter(Boolean);
  for (let eps = 2; eps < 120; eps *= 1.6) {
    const out = ops.map(o => (o.t === 's' && o.k !== 3 ? Object.assign({}, o, { p: PK.rdp(o.p, eps) }) : o)).map(PK.pack);
    if (drawBytes(out) <= budget) return out;
  }
  const out = ops.map(o => (o.t === 's' && o.k !== 3 ? Object.assign({}, o, { p: PK.rdp(o.p, 120) }) : o)).map(PK.pack);
  while (out.length > 1 && drawBytes(out) > budget) out.splice(PK.lastClear(out), 1);
  return out;
}
const lowerTR = s => String(s || '').toLocaleLowerCase('tr-TR');
const capTR = s => { s = String(s || ''); return s ? s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1) : s; };
const tokensTR = s => lowerTR(s).split(/[^a-zçğıöşüâîû]+/u).filter(Boolean);
const cleanTx = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, TX_MAX);

/* ---------- zincir dönüşü ----------
   Zincir c'yi c. oyuncu başlatır; zincirin s. adımını (c+s) mod n. oyuncu yapar.
   Böylece her adımda herkes tam bir zincirde çalışır ve bir öncekinin işini alır.
   Animasyon modunda yazıdan sonra her adım çizimdir: sıradaki, öncekini soluk bir katman olarak görüp devam eder. */
const chainOf = (p, s, n) => ((p - s) % n + n) % n;
const workerOf = (c, s, n) => (c + s) % n;
const kindOf = (mode, s) => s === 0 ? 'write' : mode === 'anim' ? 'draw' : (s % 2 ? 'draw' : 'desc');
function stepsFor(n, len, mode) {
  let s = len === 'short' ? Math.min(4, n) : len === 'long' ? Math.min(2 * n, 12) : n;
  if (mode === 'secret') s = Math.min(s + 1, 13);         // ilk sayfa gizli cümle: herkes yine n iş yapar
  return Math.max(2, s);
}

/* ---------- bilgisayarın kafası ---------- */
function stemHit(tok, stem) {
  if (stem[0] === '=') { const b = stem.slice(1); return tok.startsWith(b) && SUFFIX.has(tok.slice(b.length)); }
  return tok.startsWith(stem);
}
function matchIcons(text) {
  const toks = tokensTR(text), lowAll = lowerTR(text), out = [];
  for (const tok of toks) {
    for (const ic of ICONS) {
      if (ic.s.some(st => st.includes(' ') ? lowAll.includes(st) : stemHit(tok, st))) { if (!out.includes(ic.n)) out.push(ic.n); break; }
    }
  }
  return out;
}
function shapePts(sh) {
  const t = sh[0], a = sh.slice(2), out = [];
  if (t === 'C') return [a[0], a[1]];
  if (t === 'l') return a.slice();
  let cx = a[0], cy = a[1], rx, ry, a0 = 0, a1 = 360;
  if (t === 'c') { rx = ry = a[2]; }
  else if (t === 'e') { rx = a[2]; ry = a[3]; }
  else { rx = ry = a[2]; a0 = a[3]; a1 = a[4]; }
  const steps = Math.max(8, Math.round(Math.abs(a1 - a0) / 360 * Math.max(14, (rx + ry) * 0.9)));
  for (let i = 0; i <= steps; i++) { const ang = (a0 + (a1 - a0) * i / steps) * Math.PI / 180; out.push(cx + Math.cos(ang) * rx, cy + Math.sin(ang) * ry); }
  return out;
}
// Bir simgeyi el çizimi gibi (titrek, hafif eğik) bir kutuya yerleştirir → [{c, w, p, body}]
function iconStrokes(ic, bx, by, size, wrongColor) {
  const rot = (Math.random() - 0.5) * 0.3, cos = Math.cos(rot), sin = Math.sin(rot), sc = size / 100;
  const col = wrongColor ? Math.floor(Math.random() * 8) : ic.c;
  const tf = (x, y) => [clamp(Math.round(bx + ((x - 50) * cos - (y - 50) * sin + 50) * sc), 0, 1000), clamp(Math.round(by + ((x - 50) * sin + (y - 50) * cos + 50) * sc), 0, 1000)];
  return ic.d.map((sh, j) => {
    const pts = shapePts(sh), p = [], jt = 1.4;
    for (let i = 0; i < pts.length; i += 2) p.push(...tf(pts[i] + (Math.random() - 0.5) * jt, pts[i + 1] + (Math.random() - 0.5) * jt));
    const o = { c: sh[1] < 0 ? col : sh[1], w: sh[0] === 'C' ? 2 : 1, p };
    if (j === 0 && (sh[0] === 'c' || sh[0] === 'e')) o.body = tf(sh[2], sh[3]);     // kapalı gövde: içi boya kovasıyla doldurulabilir
    return o;
  });
}
const QMARK = [['l', 0, 34, 30, 40, 18, 52, 14, 64, 20, 66, 32, 58, 42, 50, 50, 50, 62], ['C', 0, 50, 78]];
function botDraw(text, dx = 0) {
  let names = matchIcons(text).slice(0, 3);
  let unsure = false;
  if (!names.length) { names = [pick(ICONS).n]; unsure = true; }
  else if (Math.random() < 0.18) {                    // komik hata: bir şeyi yanlış anlamış
    const k = Math.floor(Math.random() * names.length);
    const alt = ICONS.filter(ic => !names.includes(ic.n));
    names[k] = pick(alt).n;
  }
  const lay = names.length === 1 ? [[150, 150, 700]] : names.length === 2 ? [[30, 260, 470], [500, 260, 470]] : [[40, 60, 440], [520, 60, 440], [280, 520, 440]];
  const wrong = Math.random() < 0.12;
  const ops = []; let id = 0;
  const tool = Math.random() < 0.14 ? 4 : Math.random() < 0.12 ? 2 : 0;          // bazen neon ya da marker
  const fillBody = Math.random() < 0.55, bgFill = Math.random() < 0.38, grass = Math.random() < 0.25;
  if (grass) ops.push({ i: id++, t: 'r', c: '2fbf4a', a: 100, w: 6, d: 8, f: 1, p: [0, 880, 1000, 1000] });
  names.forEach((nm, i) => {
    const [x, y, s] = lay[i], ic = ICON_BY[nm];
    const strokes = iconStrokes(ic, clamp(x + dx + (Math.random() - 0.5) * 40, 0, 900), y + (Math.random() - 0.5) * 40, s, wrong);
    strokes.forEach(st => {
      ops.push({ i: id++, t: 's', k: tool, c: OLDPAL[st.c] || OLDPAL[0], a: 100, w: OLDW[st.w] || 12, d: 0, p: st.p });
      if (st.body && fillBody) ops.push({ i: id++, t: 'f', c: PK.light(OLDPAL[st.c] || OLDPAL[0], 0.55).slice(1), a: 100, d: Math.random() < 0.2 ? 1 : 0, p: st.body });
    });
  });
  if (unsure) iconStrokes({ c: 0, d: QMARK }, 700, 20, 280, false).forEach(st => ops.push({ i: id++, t: 's', k: 0, c: OLDPAL[st.c], a: 100, w: OLDW[st.w], d: 0, p: st.p }));
  if (bgFill) ops.push({ i: id++, t: 'f', c: pick(PASTEL), a: 100, d: 0, p: [6, 6] });
  return { k: 'd', d: ops.map(PK.pack), icons: names };
}
// Animasyon modu: önceki kareyi biraz kaydırıp devam ettir (insan çizimi de olsa)
function botContinue(prev, prompt, s) {
  const ops = prev && prev.k === 'd' && Array.isArray(prev.d) ? prev.d.map(o => PK.unpack(o, 4000)).filter(Boolean) : [];
  if (!ops.length) { const it = botDraw(prompt || pick(PROMPTS), (s % 3) * 60 - 60); return it; }
  const dx = 38 + Math.round(Math.random() * 20), dy = Math.round(Math.sin(s * 1.7) * 24);
  let id = 0;
  const out = ops.map(o => {
    const n = Object.assign({}, o, { i: id++ });
    if (n.p) n.p = n.p.map((v, j) => clamp(v + (j % 2 ? dy : dx), 0, 1000));
    return n;
  });
  const b = out.filter(o => o.p && o.t !== 'f').reduce((m, o) => { for (let j = 0; j < o.p.length; j += 2) { m[0] = Math.min(m[0], o.p[j]); m[1] = Math.min(m[1], o.p[j + 1]); m[2] = Math.max(m[2], o.p[j + 1]); } return m; }, [1000, 1000, 0]);
  const x0 = Math.max(0, b[0] - 30), ym = (b[1] + b[2]) / 2;            // hız çizgileri
  for (let k = -1; k <= 1; k++) out.push({ i: id++, t: 's', k: 0, c: '9a95ab', a: 100, w: 5, d: 0, p: [x0, Math.round(ym + k * 40), Math.max(0, x0 - 70), Math.round(ym + k * 40)] });
  return { k: 'd', d: out.map(PK.pack), icons: prev.icons };
}
function nameSentence(names) {
  const t = pick(ICON_TEMPL[Math.min(3, names.length)]);
  return capTR(t.replace('{A}', names[0]).replace('{B}', names[1] || '').replace('{C}', names[2] || ''));
}
function botDescribe(drawing, srcText, used) {
  if (!drawing || drawing.auto || !hasDraw(drawing)) return pick(EMPTY_DESC);
  if (drawing.icons && drawing.icons.length) {
    const names = drawing.icons.map(nm => (Math.random() < 0.25 && CONF[nm]) ? pick(CONF[nm]) : nm);
    return nameSentence(names);
  }
  return mutate(srcText || pick(PROMPTS), used);
}
function mutate(text, used) {
  const r = Math.random(), words = String(text).split(' ');
  if (r < 0.15) return capTR(text);
  if (r < 0.55) {
    const idx = words.map((w, i) => ({ w, i })).filter(o => matchIcons(o.w).length);
    if (idx.length) {
      const o = pick(idx), nm = matchIcons(o.w)[0];
      const repl = CONF[nm] ? pick(CONF[nm]) : pick(ICONS).n;
      words[o.i] = repl;
      return capTR(words.join(' '));
    }
    const cand = words.map((w, i) => ({ w, i })).filter(o => o.i < words.length - 1 && o.w.length >= 4);
    if (cand.length) { words[pick(cand).i] = pick(FUNNY_NOUN); return capTR(words.join(' ')); }
  }
  if (r < 0.8) {
    const toks = tokensTR(text).filter(t => t.length >= 4);
    const sim = PROMPTS.filter(p => p !== text && !used.includes(p) && tokensTR(p).some(t => toks.some(k => t.startsWith(k.slice(0, 4)))));
    return sim.length ? pick(sim) : pick(PROMPTS);
  }
  return capTR(text) + pick(FUNNY_TAIL);
}

/* ---------- kurallar (yöneten cihaz) ---------- */
const nOf = st => st.pl.length;
const curC = (st, p) => chainOf(p, st.step, nOf(st));
const kindAt = (st, s) => kindOf(st.mode, s);
function secFor(st, kind) {
  if (st.mode === 'fast') return kind === 'draw' ? Math.min(st.drawSec, 45) : kind === 'desc' ? 20 : 25;
  return kind === 'draw' ? st.drawSec : kind === 'desc' ? st.descSec : st.descSec + 15;
}
function emptyItem(kind, p, note) { return kind === 'draw' ? { k: 'd', d: [], by: p, auto: 1, note } : { k: 't', tx: note, by: p, auto: 1 }; }
function freshPrompt(st) { let pool = PROMPTS.filter(x => !st.used.includes(x)); if (!pool.length) pool = PROMPTS; const tx = pick(pool); st.used.push(tx); return tx; }
function botItem(st, p) {
  const s = st.step, kind = kindAt(st, s), c = curC(st, p), ch = st.chains[c];
  let it;
  if (kind === 'write') it = { k: 't', tx: freshPrompt(st) };
  else if (kind === 'draw') {
    const src = ch[s - 1];
    if (st.mode === 'anim' && s >= 2) it = botContinue(src, ch[0] && ch[0].k === 't' ? ch[0].tx : '', s);
    else it = botDraw(src && src.k === 't' && !src.auto ? src.tx : pick(PROMPTS));
  } else {
    const src2 = ch[s - 2];
    it = { k: 't', tx: cleanTx(botDescribe(ch[s - 1], src2 && src2.k === 't' && !src2.auto ? src2.tx : '', st.used)) || 'Bir şey' };
  }
  it.by = p;
  return it;
}
function parseItem(kind, a) {
  if (kind === 'draw') {
    if (typeof a.img === 'string') {
      if (a.img.length > IMG_MAX || !/^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(a.img)) return null;
      return { k: 'd', d: [], img: a.img };
    }
    if (!Array.isArray(a.d) || a.d.length > MAX_OPS) return null;
    const out = []; let pts = 0, last = -1;
    for (const w of a.d) {
      const op = PK.unpack(w, 4000); if (!op) return null;
      if (op.i <= last) return null; last = op.i;
      if (op.t === 's') { pts += op.p.length / 2; if (pts > MAX_PTS) return null; }
      out.push(PK.pack(op));
    }
    if (drawBytes(out) > MAX_BYTES + 8000) return null;
    const vis = out.slice(PK.lastClear(out));
    return vis.length ? { k: 'd', d: out } : { k: 'd', d: [], note: '(boş)', auto: 1 };
  }
  if (typeof a.tx !== 'string') return null;
  const tx = cleanTx(a.tx); if (!tx) return null;
  return { k: 't', tx };
}
function startStep(st, ctx) {
  const kind = kindAt(st, st.step), now = Date.now();
  st.phase = 'play'; st.done = st.pl.map(() => false); st.draft = st.pl.map(() => null); st.adv = false;
  st.startAt = now; st.endAt = now + secFor(st, kind) * 1000; st.tk++;
  const title = kind === 'write' ? 'Yaz!' : kind === 'draw' ? (st.mode === 'anim' && st.step >= 2 ? 'Devam et!' : 'Çiz!') : 'Ne görüyorsun?';
  ctx.emit({ t: 'step', s: st.step, kind, cont: st.mode === 'anim' && st.step >= 2 ? 1 : 0 }, `Adım ${st.step + 1}/${st.steps}: ${title}`, 'gold');
  st.pl.forEach((p, i) => { if (!p.bot && !st.on[i]) fill(st, i, '(bağlantı koptu)'); });
  armPlay(st, ctx);
  ctx.sync();
  checkAll(st, ctx);
}
function fill(st, p, why) {
  const kind = kindAt(st, st.step), c = curC(st, p), cur = st.chains[c][st.step];
  if (cur && !cur.auto) { /* daha önce gönderilmiş (sonra düzeltmeye açılmış) iş geçerli kalır */ }
  else if (st.draft[p]) { st.chains[c][st.step] = Object.assign(st.draft[p], { by: p, late: 1 }); }
  else st.chains[c][st.step] = emptyItem(kind, p, why);
  st.done[p] = true;
}
function submit(st, p, item, ctx) {
  const c = curC(st, p);
  item.by = p;
  st.chains[c][st.step] = item; st.done[p] = true; st.draft[p] = null;
  ctx.emit({ t: 'sub', pi: p, s: st.step });
  ctx.sync();
  checkAll(st, ctx);
}
function checkAll(st, ctx) {
  if (st.phase !== 'play' || st.adv || !st.done.every(Boolean)) return;
  st.adv = true; const tk = ++st.tk;
  ctx.later(st.local ? 700 : 1000, () => { if (st.tk === tk) advance(st, ctx); });
}
function advance(st, ctx) {
  if (st.step + 1 < st.steps) { st.step++; startStep(st, ctx); }
  else startAlbum(st, ctx);
}
function armPlay(st, ctx) {
  const tk = st.tk, now = Date.now(), s = st.step, kind = kindAt(st, s);
  ctx.later(Math.max(0, st.endAt + (st.local ? 400 : 1800) - now), () => {
    if (st.tk !== tk || st.phase !== 'play' || st.step !== s) return;
    let late = 0;
    st.pl.forEach((p, i) => { if (!st.done[i]) { late++; fill(st, i, st.on[i] ? '(boş)' : '(bağlantı koptu)'); } });
    if (late) ctx.emit({ t: 'timeup' }, 'Süre doldu!', 'bad');
    st.adv = true; st.tk++;
    advance(st, ctx);
  });
  st.pl.forEach((p, i) => {
    if (!p.bot || st.done[i]) return;
    const base = kind === 'draw' ? 4000 : kind === 'desc' ? 2500 : 1800;
    const span = Math.max(1000, Math.min(secFor(st, kind) * 1000 * 0.4, kind === 'draw' ? 9000 : 5000));
    ctx.later(base + Math.random() * span, () => {
      if (st.tk !== tk || st.phase !== 'play' || st.done[i]) return;
      submit(st, i, botItem(st, i), ctx);
    });
  });
}
function startAlbum(st, ctx) {
  st.phase = 'album'; st.alb = { c: 0, s: 0 }; st.tk++;
  ctx.emit({ t: 'album', c: 0, s: 0 }, 'Albüm açılıyor! 📖', 'good');
  armAlbum(st, ctx);
  ctx.sync();
}
function albDelay(st) { if (!st.auto) return ALB_MANUAL_MS; return st.alb.s === st.steps - 1 ? (st.mode === 'anim' ? ALB_CHAIN_MS + 2500 : ALB_CHAIN_MS) : ALB_MS; }
function armAlbum(st, ctx) {
  const tk = st.tk, d = albDelay(st);
  st.albAt = Date.now() + d; st.albDur = d;
  ctx.later(d, () => { if (st.tk === tk && st.phase === 'album') albNext(st, ctx); });
  // bilgisayar oyuncular albüme tepki verir
  const it = st.chains[st.alb.c][st.alb.s];
  st.pl.forEach((p, i) => {
    if (!p.bot || Math.random() > (st.alb.s ? 0.45 : 0.2) || (it && it.by === i)) return;
    ctx.later(600 + Math.random() * Math.min(2600, d - 700), () => { if (st.tk === tk) react(st, i, Math.random() < 0.55 ? 1 : Math.floor(Math.random() * 3), ctx); });
  });
}
function albNext(st, ctx) {
  const a = st.alb;
  if (a.s + 1 < st.steps) a.s++;
  else if (a.c + 1 < nOf(st)) { a.c++; a.s = 0; }
  else { startVote(st, ctx); return; }
  st.tk++;
  ctx.emit({ t: 'alb', c: a.c, s: a.s }, a.s === 0 ? `Zincir ${a.c + 1}: ${st.pl[a.c].name} başlattı` : '');
  armAlbum(st, ctx);
  ctx.sync();
}
function react(st, p, e, ctx) {
  const now = Date.now();
  if (now - (st.rt[p] || 0) < 280) return;
  st.rt[p] = now;
  ctx.emit({ t: 'react', pi: p, e });
}
function thumbOf(it) {
  if (!it || it.k !== 'd' || !it.d || !it.d.length) return it;
  return Object.assign({}, it, { d: simplifyOps(it.d, THUMB_BYTES) });
}
function startVote(st, ctx) {
  st.phase = 'vote'; st.votes = st.pl.map(() => null); st.tk++;
  st.voteEnd = Date.now() + VOTE_MS;
  st.thumbs = st.chains.map(ch => ch.map(thumbOf));
  ctx.emit({ t: 'vote' }, 'Oylama: en sevdiğin adımı seç! ⭐', 'gold');
  const tk = st.tk;
  ctx.later(VOTE_MS + 300, () => { if (st.tk === tk && st.phase === 'vote') finish(st, ctx); });
  botVotes(st, ctx);
  ctx.sync();
}
const votable = (it, p) => !!it && it.by !== p && !it.auto && !it.sec;
function botVotes(st, ctx) {
  const tk = st.tk;
  st.pl.forEach((p, i) => {
    if (!p.bot || st.votes[i]) return;
    ctx.later(1500 + Math.random() * 4000, () => {
      if (st.tk !== tk || st.phase !== 'vote' || st.votes[i]) return;
      const opts = [];
      st.chains.forEach((ch, c) => ch.forEach((it, s) => { if (votable(it, i)) opts.push({ c, s, w: it.k === 'd' ? 2 : 1 }); }));
      if (!opts.length) { st.votes[i] = { c: -1, s: -1 }; ctx.sync(); checkVotes(st, ctx); return; }
      const o = pick(opts.flatMap(x => x.w === 2 ? [x, x] : [x]));
      castVote(st, i, o.c, o.s, ctx);
    });
  });
}
function canVote(st, p, c, s) { return votable(st.chains[c] && st.chains[c][s], p); }
function castVote(st, p, c, s, ctx) {
  st.votes[p] = { c, s };
  ctx.emit({ t: 'voted', pi: p });
  ctx.sync();
  checkVotes(st, ctx);
}
function checkVotes(st, ctx) {
  if (st.phase !== 'vote' || st.vadv) return;
  const need = st.pl.map((p, i) => i).filter(i => st.pl[i].bot || st.on[i]);
  if (need.every(i => st.votes[i])) {
    st.vadv = true; const tk = ++st.tk;
    ctx.later(1200, () => { if (st.tk === tk) finish(st, ctx); });
  }
}
function finish(st, ctx) {
  if (st.phase === 'end') return;
  st.phase = 'end'; st.tk++;
  const n = nOf(st), stars = st.pl.map(() => 0), done = st.pl.map(() => 0), tally = {};
  st.votes.forEach(v => { if (!v || v.c < 0) return; const it = st.chains[v.c][v.s]; if (!it) return; stars[it.by]++; const k = v.c + ':' + v.s; tally[k] = (tally[k] || 0) + 1; });
  st.chains.forEach(ch => ch.forEach(it => { if (it && !it.auto && !it.sec && (it.k === 't' || hasDraw(it))) done[it.by]++; }));
  st.stars = stars; st.compl = done;
  st.score = st.pl.map((_, i) => stars[i] * 3 + done[i]);
  st.fav = Object.keys(tally).map(k => { const [c, s] = k.split(':').map(Number); return { c, s, v: tally[k] }; })
    .sort((a, b) => b.v - a.v || a.c - b.c || a.s - b.s).slice(0, 3);
  ctx.emit({ t: 'end' });
  ctx.sync();
  const order = st.pl.map((_, i) => i).sort((a, b) => st.score[b] - st.score[a] || stars[b] - stars[a] || a - b);
  const top = st.score[order[0]], tie = order.filter(i => st.score[i] === top).length > 1;
  const best = st.fav[0] ? st.chains[st.fav[0].c][st.fav[0].s] : null;
  ctx.end({
    title: tie ? 'Berabere! Herkes sanatçı 🎨' : `${st.pl[order[0]].name} albümün yıldızı!`,
    ranking: order.map(i => ({ pi: i, score: st.score[i], label: `${st.score[i]} puan · ${stars[i]}⭐` })),
    note: `${MODES[st.mode]} · ${n} zincir · ${st.steps} adım · ⭐ oy başına 3 puan, tamamlanan her adım 1 puan` + (best ? ` · En sevilen: ${best.k === 't' ? '“' + best.tx + '”' : st.pl[best.by].name + ' çizimi'}` : '')
  });
}
function viewItem(it) {
  if (!it) return null;
  const o = { k: it.k, by: it.by };
  if (it.auto) o.auto = 1;
  if (it.sec) o.sec = 1;
  if (it.note) o.note = it.note;
  if (it.k === 't') o.tx = it.tx; else { o.d = it.d || []; if (it.img) o.img = it.img; }
  return o;
}

/* ---------- arayüz durumu ---------- */
let root = null, ui = null, V = null, mainKey = '', timerT = null, draftT = null, ro = null;
const D = { key: '', ops: [], redo: [], nid: 0, dirty: false, ghost: true };     // çizim taslağı (yalnızca bu cihazda)
const T = { key: '', val: '', dirty: false };                                      // yazı taslağı
let autoSent = '', albShown = { c: -1, s: -1 }, flipT = null;
let P = null, B = null;
const painted = new Map();               // salt-okunur tuvaller → op listesi
const q = s => root && root.querySelector(s);
const isLocal = () => ui && ui.mode === 'local';
const meIdx = () => (V && typeof ui.me === 'number' && ui.me >= 0 && ui.me < V.players.length) ? ui.me : -1;
const now = () => (ui ? ui.hostNow() : Date.now());
const stepKey = () => V ? `${V.gid}:${V.step}` : '';
const verb = s => s === 0 ? 'yazdı' : V && V.mode === 'anim' ? (s === 1 ? 'çizdi' : 'devam ettirdi') : (s % 2 ? 'çizdi' : 'şöyle anladı');

/* ---------- tuval çizimi ---------- */
const decOps = d => (d || []).map(o => PK.unpack(o, 4000)).filter(Boolean);
function paintCanvas(el, ops) {
  if (!el) return;
  painted.set(el, ops);
  PK.paintStatic(el, ops, RW, RH);
}
function repaintAll() {
  for (const [el, s] of painted) { if (!el.isConnected) painted.delete(el); else paintCanvas(el, s); }
  if (P && P.cv.isConnected && P.fit()) P.show();
}
function dropBoard() {
  if (B) { B.destroy(); B = null; }
  if (P) { P.destroy(); P = null; }
}

/* ---------- çizim girdisi ---------- */
const canDraw = () => !!V && V.ph === 'play' && V.kind === 'draw' && V.task && !V.task.done && !!P;
const hasContent = () => D.ops.length > PK.lastClear(D.ops);
function boardEmit(type) {
  D.dirty = true; updateDrawBtns();
  if (type === 'undo') Sound.whoosh(); else if (type === 'add' || type === 'redo') Sound.tick(0.35);
}
function updateDrawBtns() {
  const sb = q('[data-act="send"]'); if (sb && V && V.kind === 'draw') sb.disabled = !hasContent();
}

/* ---------- gönderme ---------- */
function send(a) { ui.send(a); }
// çizimi kompakt op listesi olarak gönder; 40 KB'ı aşarsa (çok nadir) resme çevir
function rasterize() {
  const sz = 480, c = document.createElement('canvas'); c.width = c.height = sz;
  const S = PK.newScene(RW, RH), g = c.getContext('2d');
  for (let j = PK.lastClear(D.ops); j < D.ops.length; j++) PK.sceneApply(S, D.ops[j], g, sz, sz);
  const out = document.createElement('canvas'); out.width = out.height = sz;
  const og = out.getContext('2d'); og.fillStyle = '#' + (S.bg || PAPER); og.fillRect(0, 0, sz, sz); og.drawImage(c, 0, 0);
  for (const [type, qs] of [['image/webp', [0.8, 0.6, 0.45, 0.3]], ['image/jpeg', [0.7, 0.5, 0.35]]]) {
    for (const qq of qs) { const u = out.toDataURL(type, qq); if (u.startsWith('data:' + type) && u.length <= IMG_MAX) return u; }
  }
  const small = document.createElement('canvas'); small.width = small.height = 300; small.getContext('2d').drawImage(out, 0, 0, 300, 300);
  return small.toDataURL('image/jpeg', 0.4);
}
function encodeDrawing() {
  const d = D.ops.map(PK.pack);
  if (drawBytes(d) <= MAX_BYTES) return { d };
  return { img: rasterize() };
}
function currentPayload() {
  if (!V || !V.task) return null;
  if (V.kind === 'draw') return hasContent() ? encodeDrawing() : null;
  const inp = q('.tc-in'); const tx = cleanTx(inp ? inp.value : T.val);
  return tx ? { tx } : null;
}
function doSubmit(auto) {
  if (!V || V.ph !== 'play' || !V.task || V.task.done) return;
  if (B && B.cur) B.finish();
  const pl = currentPayload();
  if (!pl) { if (!auto) { const inp = q('.tc-in'); if (inp) { inp.focus(); inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake'); } } return; }
  send(Object.assign({ t: 'sub', s: V.step }, pl));
  D.dirty = false; T.dirty = false;
  const sb = q('[data-act="send"]'); if (sb) sb.disabled = true;
  Sound.good();
}
function maybeDraft() {
  // Bağlantı koparsa yöneten cihazda son hâlin kalsın diye ara sıra taslak gönder (yalnızca katılımcılar)
  if (!V || isLocal() || ui.isHost || V.ph !== 'play' || !V.task || V.task.done) return;
  if (V.kind === 'draw' ? !D.dirty : !T.dirty) return;
  if (B && B.cur) return;
  const pl = currentPayload(); if (!pl) return;
  send(Object.assign({ t: 'draft', s: V.step }, pl));
  D.dirty = false; T.dirty = false;
}

/* ---------- çizim (render) ---------- */
const chipName = p => p.bot ? p.name.replace(/^Bilgisayar\s*/, 'Bot ') : p.name;
function avatar(p) { return `<span class="av" style="--pc:${p.color}">${p.bot ? '🤖' : initial(p.name)}</span>`; }
function pname(i) { const p = V && V.players[i]; return p ? `<b style="color:${p.color}">${esc(p.name)}</b>` : '?'; }
function renderPlayers(v) {
  const box = q('.tc-players'), me = meIdx();
  box.innerHTML = v.players.map((p, i) => {
    let st = '';
    if (v.ph === 'play') st = p.done ? '<i class="tc-ok">✓</i>' : '<i class="tc-wk">✏️</i>';
    else if (v.ph === 'vote') st = p.done ? '<i class="tc-ok">✓</i>' : '<i class="tc-wk">🤔</i>';
    else if (v.ph === 'end' && p.score != null) st = `<i class="tc-sc">${p.score}</i>`;
    return `<div class="tc-pl ${p.on ? '' : 'off'} ${i === me ? 'me' : ''} ${(v.ph === 'play' || v.ph === 'vote') && p.done ? 'done' : ''}" style="--pc:${p.color}" data-pi="${i}">${avatar(p)}<b>${esc(chipName(p))}</b>${st}</div>`;
  }).join('');
}
function renderHead(v) {
  const t = q('.tc-title'), sub = q('.tc-sub');
  let title = '', s = '';
  if (v.ph === 'play') {
    title = v.kind === 'write' ? 'Yaz!' : v.kind === 'draw' ? (v.mode === 'anim' && v.step >= 2 ? 'Devam et!' : 'Çiz!') : 'Ne görüyorsun?';
    s = `Adım ${v.step + 1}/${v.steps}` + (v.mode !== 'classic' ? ` · ${MODES[v.mode]}` : '');
  } else if (v.ph === 'album') { title = 'Albüm'; s = `Zincir ${v.alb.c + 1}/${v.n} · adım ${v.alb.s + 1}/${v.steps}`; }
  else if (v.ph === 'vote') { title = 'Oylama'; s = 'En sevdiğin adıma ⭐ ver'; }
  else { title = 'Final'; s = 'Albüm kapandı'; }
  if (t.textContent !== title) { t.textContent = title; t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop'); }
  sub.textContent = s;
  q('.tc').dataset.kind = v.ph === 'play' ? v.kind : v.ph;
}
function renderStatus(v) {
  const st = q('.tc-status'), me = meIdx();
  const waiting = v.players.map((p, i) => ({ p, i })).filter(o => !o.p.done);
  let h;
  if (v.ph === 'play') {
    if (me < 0) h = '<span class="g-turn">👀 İzliyorsun · herkes defterinde çalışıyor</span>';
    else if (!v.task.done) h = `<span class="g-turn mine">⭐ Sıra sende · ${v.kind === 'write' ? 'komik bir cümle yaz' : v.kind === 'draw' ? (v.mode === 'anim' && v.step >= 2 ? 'önceki kareden devam et' : 'cümleyi çiz') : 'çizimi anlat'}</span>`;
    else h = `<span class="g-turn win">✓ Gönderildi · bekleniyor: ${waiting.map(o => esc(o.p.name)).join(', ') || '—'}</span>`;
  } else if (v.ph === 'album') {
    const it = v.chain.items[v.chain.items.length - 1];
    h = `<span class="g-turn">📖 ${pname(v.alb.c)} zinciri · ${it ? (it.sec ? '🎲 gizli cümle' : pname(it.by) + ' ' + verb(v.alb.s)) : ''}</span>`;
  } else if (v.ph === 'vote') {
    h = me < 0 ? '<span class="g-turn">👀 Oylama sürüyor</span>' : v.myVote ? '<span class="g-turn win">⭐ Oyun verildi · istersen değiştir</span>' : '<span class="g-turn mine">⭐ Sıra sende · favori adımını seç</span>';
  } else h = '<span class="g-turn win">🎉 Oyun bitti!</span>';
  st.innerHTML = h;
}
function itemHTML(it, s, opts = {}) {
  if (!it) return '<div class="tc-tx miss">—</div>';
  if (it.k === 't') return `<div class="tc-tx ${it.auto ? 'miss' : ''}">${esc(it.tx)}</div>`;
  if (it.img) return `<div class="tc-pic"><img src="${esc(it.img)}" alt="Çizim" draggable="false"></div>`;
  if (!it.d || !it.d.length) return `<div class="tc-pic empty"><span>${esc(it.note || '(boş)')}</span></div>`;
  return `<div class="tc-pic"><canvas data-paint="${opts.ref || ''}" aria-label="Çizim"></canvas></div>`;
}
function byLine(it, s) {
  if (!it) return '';
  if (it.sec) return `<span class="tc-av-dice">🎲</span><span class="tc-byl"><b class="tc-sec">Gizli başlangıç cümlesi</b></span>`;
  const p = V.players[it.by];
  return `${p ? avatar(p) : ''}<span class="tc-byl">${p ? `<b style="color:${p.color}">${esc(p.name)}</b> ${verb(s)}` : ''}</span>`;
}
function buildPlay(v) {
  const main = q('.tc-main'), me = meIdx();
  painted.clear(); dropBoard();
  if (me < 0 || !v.task) {
    main.innerHTML = `<div class="tc-paper tc-wait"><div class="tc-big">👀</div><p>Oyuncular defterlerinde çalışıyor.<br>Hepsini albümde birlikte göreceğiz!</p></div>`;
    return;
  }
  const t = v.task, sk = stepKey();
  if (t.done) {
    const prev = v.kind === 'draw' ? '<div class="tc-board mini"><canvas class="tc-mine"></canvas></div>' : (T.key === sk && T.val ? `<p class="tc-hand">“${esc(T.val)}”</p>` : '');
    main.innerHTML = `<div class="tc-paper tc-wait"><div class="tc-big tc-bob">📨</div><p class="tc-ot">Defterini bir sonraki oyuncuya verdin!</p>${prev}
      <p class="tc-os">Herkes bitirince yeni defter gelecek.</p>
      <button type="button" class="btn btn-ghost tc-edit" data-act="edit">✏️ Düzelt</button></div>`;
    const mc = q('.tc-mine'); if (mc && D.key === sk) paintCanvas(mc, D.ops);
    return;
  }
  if (v.kind === 'draw') {
    if (D.key !== sk) { D.key = sk; D.ops = []; D.redo = []; D.nid = 0; D.dirty = false; D.ghost = true; }
    const src = t.input, cont = v.mode === 'anim' && src && src.k === 'd';
    const noteTx = cont ? (t.prompt || '') : (src && src.tx ? src.tx : '(boş)');
    main.innerHTML = `<div class="tc-note"><small>${cont ? 'Animasyon · önceki kareden devam et' : 'Çizmen gereken'}</small><b>${esc(noteTx || 'Önceki kareyi biraz değiştirerek devam ettir')}</b></div>
      <div class="tc-board draw">
        <div class="tck-zoom"><canvas class="tc-cv" aria-label="Çizim tuvali"></canvas>${cont ? `<canvas class="tc-ghost" aria-hidden="true"${D.ghost ? '' : ' hidden'}></canvas>${src.img ? `<img class="tc-ghost" src="${esc(src.img)}" alt=""${D.ghost ? '' : ' hidden'}>` : ''}` : ''}</div>
        ${cont ? `<button type="button" class="tc-gbtn ${D.ghost ? 'on' : ''}" data-act="ghost" title="Önceki kareyi göster/gizle" aria-label="Önceki kareyi göster/gizle">${PK.ICON.ghost}</button>` : ''}
      </div>
      <div class="tc-tools"></div>
      <button type="button" class="btn btn-spin tc-send" data-act="send">✓ Çizimi gönder</button>`;
    const cv = q('.tc-cv');
    P = new PK.Painter(cv, RW, RH); P.ops = D.ops;
    B = new PK.Board({
      K: 'tck', bar: q('.tc-tools'), cv, wrap: q('.tck-zoom'), frame: q('.tc-board.draw'), painter: P, store: D,
      canDraw, emit: boardEmit, confirm: (a, b, c) => CFX.confirmBox(a, b, c),
      maxPts: C_MAX_PTS, maxOps: C_MAX_OPS, maxFills: C_MAX_FILLS, simplify: 0.7, paper: PAPER
    });
    P.fit(); P.rebuild();
    if (cont && src.d && src.d.length) { const gc = q('canvas.tc-ghost'); paintCanvas(gc, decOps(src.d)); }
    B.refresh(true); updateDrawBtns();
    return;
  }
  // yazma / anlatma
  if (T.key !== sk) { T.key = sk; T.val = ''; T.dirty = false; }
  const write = v.kind === 'write';
  const inputBox = write ? '' : `<div class="tc-board view">${itemHTML(t.input, v.step - 1, { ref: 'in' })}</div>`;
  main.innerHTML = `${inputBox}<div class="tc-paper tc-form">
      <label class="tc-lbl" for="tcIn">${write ? 'Komik bir başlangıç cümlesi yaz' : 'Bu çizimde ne görüyorsun?'}</label>
      <textarea id="tcIn" class="tc-in" rows="2" maxlength="${TX_MAX}" enterkeyhint="send" autocomplete="off" spellcheck="false" placeholder="${write ? 'Örn: Penguen bisiklet sürüyor' : 'Gördüğünü bir cümleyle anlat…'}"></textarea>
      <div class="tc-row">${write ? '<button type="button" class="btn btn-vowel tc-rnd" data-act="rnd">🎲 Rastgele cümle</button>' : ''}<button type="button" class="btn btn-spin tc-send" data-act="send">✓ Gönder</button></div>
    </div>`;
  const inp = q('.tc-in'); inp.value = T.val;
  inp.addEventListener('input', () => { T.val = inp.value; T.dirty = true; });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSubmit(false); } });
  if (!write) { const c = q('canvas[data-paint="in"]'); if (c) paintCanvas(c, decOps(t.input.d)); }
  if (!('ontouchstart' in window) && write) setTimeout(() => { if (inp.isConnected) inp.focus({ preventScroll: true }); }, 60);
}
function buildAlbum(v) {
  const main = q('.tc-main'); painted.clear(); dropBoard(); clearInterval(flipT);
  const isHostCtl = canAdvance(v);
  main.innerHTML = `<div class="tc-album">
      <div class="tc-ahead">${avatar(v.players[v.alb.c])}<div><small>Zincir ${v.alb.c + 1}/${v.n}</small><b>${esc(v.players[v.alb.c].name)} zinciri</b></div></div>
      <ol class="tc-steps"></ol>
    </div>
    <div class="tc-abar">
      <div class="tc-reacts">${REACT.map((e, i) => `<button type="button" class="tc-re" data-react="${i}" aria-label="Tepki ${e}">${e}</button>`).join('')}</div>
      ${isHostCtl ? '<button type="button" class="btn btn-spin tc-next" data-act="next">İleri ▶</button>' : `<span class="tc-auto">${v.auto ? 'Otomatik ilerliyor' : 'Kurucu ilerletiyor'}</span>`}
      <div class="tc-aprog"><i></i></div>
    </div>`;
  albShown = { c: v.alb.c, s: -1 };
}
function appendAlbum(v) {
  const ol = q('.tc-steps'); if (!ol) return;
  const items = v.chain.items;
  for (let s = albShown.s + 1; s < items.length; s++) {
    const it = items[s], li = document.createElement('li');
    li.className = 'tc-it ' + (it && it.k === 'd' ? 'pic' : 'txt') + (s === 0 ? ' first' : '');
    li.style.setProperty('--tilt', ((s % 2 ? 1 : -1) * (0.6 + (s * 37 % 10) / 10)).toFixed(2) + 'deg');
    li.innerHTML = `<div class="tc-by">${byLine(it, s)}<em>${s + 1}</em></div>${itemHTML(it, s, { ref: 'a' + s })}`;
    ol.appendChild(li);
    const c = li.querySelector('canvas'); if (c) paintCanvas(c, decOps(it.d));
    if (s === items.length - 1 && albShown.s >= 0) {
      requestAnimationFrame(() => { try { li.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* */ } });
    }
  }
  albShown.s = items.length - 1;
  // animasyon modu: zincirin sonunda kareler sırayla oynatılır
  if (v.mode === 'anim' && items.length === v.steps && !q('.tc-flip')) {
    const frames = items.filter(it => it && it.k === 'd' && hasDraw(it));
    if (frames.length >= 2) {
      const li = document.createElement('li'); li.className = 'tc-it pic tc-flip';
      li.innerHTML = `<div class="tc-by"><span class="tc-av-dice">🎞️</span><span class="tc-byl"><b>Animasyon</b> · ${frames.length} kare</span><em>▶</em></div><div class="tc-pic tc-frames">${frames.map((it, k) => it.img ? `<img src="${esc(it.img)}" alt="" data-f="${k}">` : `<canvas data-f="${k}"></canvas>`).join('')}</div>`;
      ol.appendChild(li);
      frames.forEach((it, k) => { const c = li.querySelector(`canvas[data-f="${k}"]`); if (c) paintCanvas(c, decOps(it.d)); });
      let f = 0; const els = [...li.querySelectorAll('[data-f]')];
      const show = () => { els.forEach((e, k) => { e.style.opacity = k === f ? '1' : '0'; }); f = (f + 1) % els.length; };
      show(); clearInterval(flipT); flipT = setInterval(() => { if (!li.isConnected) { clearInterval(flipT); return; } show(); }, 420);
      requestAnimationFrame(() => { try { li.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* */ } });
    }
  }
}
const canAdvance = v => !!v && (v.host === meIdx() || (v.host < 0 && meIdx() >= 0));
function buildVote(v) {
  const main = q('.tc-main'); painted.clear(); dropBoard(); clearInterval(flipT);
  const me = meIdx();
  main.innerHTML = `<div class="tc-vote">${v.chains.map((ch, c) => `<section class="tc-vc"><h3>${avatar(v.players[c])}<span>${esc(v.players[c].name)} zinciri</span></h3><div class="tc-vgrid">${ch.items.map((it, s) => {
    const own = it && it.by === me && !it.sec, dis = !it || it.auto || it.sec || own || me < 0;
    return `<button type="button" class="tc-vi ${it && it.k === 'd' ? 'pic' : 'txt'} ${own ? 'own' : ''}" data-vc="${c}" data-vs="${s}" ${dis ? 'disabled' : ''}>
      <span class="tc-vb">${it ? (it.sec ? '🎲 Gizli cümle' : esc(v.players[it.by].name)) : ''}${own ? ' · sen' : ''}</span>${itemHTML(it, s, { ref: `v${c}_${s}` })}<span class="tc-star">⭐</span></button>`;
  }).join('')}</div></section>`).join('')}</div>
  <div class="tc-abar"><div class="tc-reacts">${REACT.map((e, i) => `<button type="button" class="tc-re" data-react="${i}" aria-label="Tepki ${e}">${e}</button>`).join('')}</div>
  ${ui.isHost ? '<button type="button" class="btn btn-ghost tc-next" data-act="endVote">Oylamayı bitir</button>' : ''}</div>`;
  v.chains.forEach((ch, c) => ch.items.forEach((it, s) => { if (it && it.k === 'd' && it.d && it.d.length && !it.img) paintCanvas(q(`canvas[data-paint="v${c}_${s}"]`), decOps(it.d)); }));
}
function updateVote(v) {
  const sel = v.myVote;
  root.querySelectorAll('.tc-vi').forEach(b => b.classList.toggle('sel', !!sel && +b.dataset.vc === sel.c && +b.dataset.vs === sel.s));
}
function buildEnd(v) {
  const main = q('.tc-main'); painted.clear(); dropBoard(); clearInterval(flipT);
  const medal = ['🥇', '🥈', '🥉'];
  main.innerHTML = `<div class="tc-paper tc-end"><h3>⭐ Favoriler</h3>${v.fav.length ? `<div class="tc-favs">${v.fav.map((f, k) => {
    return `<div class="tc-fav"><div class="tc-by"><span class="tc-medal">${medal[k]}</span>${byLine(f.item, f.s)}<em>${f.v}⭐</em></div>${itemHTML(f.item, f.s, { ref: 'f' + k })}</div>`;
  }).join('')}</div>` : '<p class="tc-os">Kimse oy vermedi — hepsi birbirinden güzeldi!</p>'}</div>`;
  v.fav.forEach((f, k) => { if (f.item && f.item.k === 'd' && f.item.d && f.item.d.length && !f.item.img) paintCanvas(q(`canvas[data-paint="f${k}"]`), decOps(f.item.d)); });
}
function render(v) {
  V = v; if (!root) return;
  const me = meIdx();
  let key;
  if (v.ph === 'play') key = `p:${v.gid}:${v.step}:${me}:${v.task ? (v.task.done ? 1 : 0) : 'x'}`;
  else if (v.ph === 'album') key = `a:${v.gid}:${v.alb.c}`;
  else key = `${v.ph}:${v.gid}`;
  renderPlayers(v); renderHead(v); renderStatus(v);
  if (key !== mainKey) {
    mainKey = key;
    if (v.ph === 'play') buildPlay(v); else if (v.ph === 'album') buildAlbum(v); else if (v.ph === 'vote') buildVote(v); else buildEnd(v);
    try { q('.tc').scrollIntoView({ block: 'start' }); } catch { /* */ }
  }
  if (v.ph === 'album') appendAlbum(v);
  if (v.ph === 'vote') updateVote(v);
  if (v.ph === 'play' && v.kind === 'draw') { updateDrawBtns(); if (B) B.refresh(); }
  tick();
}
function tick() {
  if (!root || !V) return;
  const bar = q('.tc-timer i'), num = q('.tc-time');
  let end = 0, dur = 1;
  if (V.ph === 'play') { end = V.endAt; dur = V.dur; }
  else if (V.ph === 'vote') { end = V.endAt; dur = V.dur; }
  const left = end ? Math.max(0, end - now()) : 0;
  if (end) {
    bar.style.transform = `scaleX(${clamp(left / dur, 0, 1)})`;
    num.textContent = String(Math.ceil(left / 1000)); num.hidden = false;
    const low = left < 10000; num.classList.toggle('low', low); bar.parentElement.classList.toggle('low', low);
  } else { bar.style.transform = 'scaleX(0)'; num.hidden = true; }
  bar.parentElement.hidden = !end;
  // süre bitmek üzere: elindekini otomatik gönder
  if (V.ph === 'play' && V.task && !V.task.done && end && left < (isLocal() ? 350 : 900)) {
    const k = stepKey(); if (autoSent !== k) { autoSent = k; doSubmit(true); }
  }
  if (V.ph === 'play' && V.task && !V.task.done && end && left < 10500 && left > 0) {
    const s = Math.ceil(left / 1000); if (s <= 5 && tick.last !== s) { tick.last = s; Sound.tick(0.7); }
  }
  if (V.ph === 'album') {
    const pb = q('.tc-aprog i');
    if (pb) { const f = V.albAt ? clamp((V.albAt - now()) / (V.albDur || 1), 0, 1) : 0; pb.style.transform = `scaleX(${f})`; }
  }
}

/* ---------- olaylar ---------- */
function floatEmoji(pi, e) {
  const lay = q('.tc-float'); if (!lay || !V) return;
  const p = V.players[pi]; const el = document.createElement('span');
  el.className = 'tc-fl';
  el.style.left = (8 + Math.random() * 80) + '%';
  el.style.setProperty('--dx', ((Math.random() - 0.5) * 80).toFixed(0) + 'px');
  el.style.setProperty('--pc', p ? p.color : '#fff');
  el.innerHTML = `${REACT[e] || '👍'}<small>${p ? esc(p.name) : ''}</small>`;
  lay.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
function onEvent(e) {
  if (!root) return;
  if (e.t === 'react') { floatEmoji(e.pi, e.e); if (e.pi === meIdx()) Sound.tick(0.4); return; }
  if (e.t === 'step') {
    Sound.whoosh();
    banner(e.kind === 'write' ? 'YAZ!' : e.kind === 'draw' ? (e.cont ? 'DEVAM ET!' : 'ÇİZ!') : 'NE GÖRÜYORSUN?', 'pink');
  } else if (e.t === 'sub') { if (e.pi !== meIdx()) Sound.tick(0.3); }
  else if (e.t === 'timeup') { Sound.bad(); }
  else if (e.t === 'album') { Sound.solve(); banner('ALBÜM! 📖', 'good'); FX.confetti(50); }
  else if (e.t === 'alb') { if (e.s === 0) { Sound.special(); banner(`ZİNCİR ${e.c + 1}`, 'pink'); } else Sound.stop(); }
  else if (e.t === 'vote') { Sound.special(); banner('OYLAMA! ⭐', 'good'); }
  else if (e.t === 'voted') { Sound.tick(0.4); }
}

/* ---------- kurulum ---------- */
function onClick(e) {
  const b = e.target.closest('button'); if (!b || b.disabled || !V) return;
  if (b.closest('.tc-tools') || b.closest('.tck-zreset')) return;
  if (b.dataset.react != null) { Sound.init(); send({ t: 'react', e: +b.dataset.react }); b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); return; }
  if (b.dataset.vc != null) {
    Sound.init(); send({ t: 'vote', c: +b.dataset.vc, s: +b.dataset.vs });
    root.querySelectorAll('.tc-vi').forEach(x => x.classList.toggle('sel', x === b)); Sound.good(); return;
  }
  const act = b.dataset.act;
  if (act === 'send') doSubmit(false);
  else if (act === 'rnd') { const inp = q('.tc-in'); if (inp) { let p = pick(PROMPTS); if (p === inp.value) p = pick(PROMPTS); inp.value = p; T.val = p; T.dirty = true; Sound.tick(0.6); } }
  else if (act === 'edit') { send({ t: 'edit', s: V.step }); }
  else if (act === 'next') { send({ t: 'next', c: V.alb.c, s: V.alb.s }); }
  else if (act === 'endVote') { send({ t: 'endVote' }); }
  else if (act === 'ghost') { D.ghost = !D.ghost; b.classList.toggle('on', D.ghost); root.querySelectorAll('.tc-ghost').forEach(g => { g.hidden = !D.ghost; }); Sound.tick(0.4); }
}
function mount(r, api) {
  root = r; ui = api; V = null; mainKey = ''; autoSent = ''; albShown = { c: -1, s: -1 };
  D.key = ''; D.ops = []; D.redo = []; D.nid = 0; T.key = ''; T.val = ''; painted.clear();
  root.innerHTML = `<div class="g-wrap tc">
    <div class="tc-players"></div>
    <div class="tc-head"><div class="tc-ht"><h2 class="tc-title">Yaz!</h2><span class="tc-sub"></span></div><span class="tc-time" hidden>–</span></div>
    <div class="tc-timer" hidden><i></i></div>
    <div class="g-status tc-status"></div>
    <section class="tc-main"></section>
    <div class="tc-float" aria-hidden="true"></div>
  </div>`;
  root.addEventListener('click', onClick);
  if (window.ResizeObserver) { ro = new ResizeObserver(() => repaintAll()); ro.observe(q('.tc-main')); }
  addEventListener('resize', repaintAll);
  timerT = setInterval(tick, 200);
  draftT = setInterval(maybeDraft, 6000);
}
function unmount() {
  clearInterval(timerT); clearInterval(draftT); clearInterval(flipT); timerT = draftT = flipT = null;
  if (ro) { ro.disconnect(); ro = null; }
  removeEventListener('resize', repaintAll);
  if (root) root.removeEventListener('click', onClick);
  painted.clear(); dropBoard();
  root = null; ui = null; V = null;
}

CFX.registerGame({
  id: 'telefoncis', name: 'Telefon Çiz', icon: '📞', color: '#ff8a00', min: 3, max: 8, hotseat: false, bot: true, localMin: 1,
  tagline: 'Yaz, çiz, anlat — defterler elden ele bozulsun',
  rules: 'Herkes komik bir cümle yazar; defterler dolaşır: sıradaki oyuncu cümleyi çizer, sonraki çizimi anlatır, sonraki onu çizer. Hızlı, Gizli Başlangıç ve Animasyon (önceki kareden devam et) modları da var. Sonunda albüm adım adım açılır, en sevdiğin adıma oy verirsin (oy başına 3, tamamlanan adım başına 1 puan).',
  botDelay: 900,
  options: [
    { key: 'mode', label: 'Mod', def: 'classic', choices: [{ v: 'classic', label: 'Klasik' }, { v: 'fast', label: 'Hızlı' }, { v: 'secret', label: 'Gizli Başlangıç' }, { v: 'anim', label: 'Animasyon' }] },
    { key: 'len', label: 'Zincir uzunluğu', def: 'full', choices: [{ v: 'full', label: 'Herkes kadar' }, { v: 'short', label: 'Kısa (4 adım)' }, { v: 'long', label: 'Uzun (2 tur)' }] },
    { key: 'draw', label: 'Çizim süresi', def: '90', choices: [{ v: '45', label: '45 sn' }, { v: '60', label: '60 sn' }, { v: '90', label: '90 sn' }, { v: '120', label: '120 sn' }, { v: '150', label: '150 sn' }] },
    { key: 'desc', label: 'Anlatma süresi', def: '45', choices: [{ v: '30', label: '30 sn' }, { v: '45', label: '45 sn' }, { v: '60', label: '60 sn' }] },
    { key: 'album', label: 'Albüm', def: 'auto', choices: [{ v: 'auto', label: 'Otomatik (4 sn)' }, { v: 'host', label: 'Kurucu ilerletir' }] }
  ],
  setup(players, opts, ctx) {
    const n = players.length, mode = MODES[opts.mode] ? opts.mode : 'classic';
    const st = {
      gid: Math.random().toString(36).slice(2, 8),
      pl: players.map(p => ({ name: p.name, color: p.color, bot: !!p.isBot })), on: players.map(() => true),
      local: ctx.mode === 'local', host: ctx.hostPi, n, mode,
      steps: stepsFor(n, opts.len, mode),
      drawSec: [45, 60, 90, 120, 150].includes(+opts.draw) ? +opts.draw : 90,
      descSec: [30, 45, 60].includes(+opts.desc) ? +opts.desc : 45,
      auto: opts.album !== 'host',
      chains: players.map(() => []), step: 0, phase: 'play', done: [], draft: [], adv: false, vadv: false,
      startAt: 0, endAt: 0, tk: 0, alb: { c: 0, s: 0 }, albAt: 0, albDur: 1, votes: [], voteEnd: 0, thumbs: null,
      rt: players.map(() => 0), used: [], score: players.map(() => 0), stars: null, compl: null, fav: []
    };
    if (mode === 'secret') {                       // ilk sayfa: listeden gizli cümle; herkes doğrudan çizimle başlar
      st.chains.forEach((ch, c) => { ch[0] = { k: 't', tx: freshPrompt(st), by: c, sec: 1 }; });
      st.step = 1;
    }
    startStep(st, ctx);
    return st;
  },
  action(st, pi, a, ctx) {
    if (st.phase === 'end') return;
    switch (a.t) {
      case 'sub': case 'draft': {
        if (st.phase !== 'play' || a.s !== st.step || st.done[pi] || st.adv) return;
        const it = parseItem(kindAt(st, st.step), a); if (!it) return;
        if (a.t === 'draft') { it.by = pi; st.draft[pi] = it; return; }
        submit(st, pi, it, ctx); return;
      }
      case 'edit': {
        if (st.phase !== 'play' || a.s !== st.step || !st.done[pi] || st.adv) return;
        st.done[pi] = false; ctx.sync(); return;
      }
      case 'react': {
        if (st.phase !== 'album' && st.phase !== 'vote') return;
        const e = a.e | 0; if (e < 0 || e >= REACT.length) return;
        react(st, pi, e, ctx); return;
      }
      case 'next': {
        if (st.phase !== 'album') return;
        if (!(pi === st.host || (st.host < 0 && !st.pl[pi].bot))) return;
        if (a.c !== st.alb.c || a.s !== st.alb.s) return;            // çift basma: aynı adımı iki kez geçme
        albNext(st, ctx); return;
      }
      case 'vote': {
        if (st.phase !== 'vote' || st.vadv) return;
        const c = a.c | 0, s = a.s | 0;
        if (!canVote(st, pi, c, s)) return;
        castVote(st, pi, c, s, ctx); return;
      }
      case 'endVote': {
        if (st.phase !== 'vote' || !(pi === st.host || st.host < 0)) return;
        finish(st, ctx); return;
      }
      default:
    }
  },
  view(st, viewer) {
    const me = typeof viewer === 'number' && viewer >= 0 && viewer < nOf(st) ? viewer : -1;
    const v = {
      gid: st.gid, ph: st.phase, n: nOf(st), steps: st.steps, step: st.step, kind: kindAt(st, st.step), host: st.host, mode: st.mode,
      players: st.pl.map((p, i) => ({ name: p.name, color: p.color, on: st.on[i], bot: p.bot,
        done: st.phase === 'play' ? !!st.done[i] : st.phase === 'vote' ? !!st.votes[i] : false,
        score: st.phase === 'end' ? st.score[i] : null }))
    };
    if (st.phase === 'play') {
      v.endAt = st.endAt; v.dur = st.endAt - st.startAt;
      if (me >= 0) {
        const c = curC(st, me), ch = st.chains[c];
        // gizlilik: oyuncu yalnızca üzerinde çalışacağı parçayı görür (animasyonda + başlangıç cümlesi)
        v.task = { input: st.step > 0 ? viewItem(ch[st.step - 1]) : null, done: !!st.done[me] };
        if (st.mode === 'anim' && st.step >= 2 && ch[0] && ch[0].k === 't') v.task.prompt = ch[0].tx;
      }
    } else if (st.phase === 'album') {
      v.alb = { c: st.alb.c, s: st.alb.s }; v.auto = st.auto; v.albAt = st.albAt; v.albDur = st.albDur;
      v.chain = { by: st.alb.c, items: st.chains[st.alb.c].slice(0, st.alb.s + 1).map(viewItem) };
    } else if (st.phase === 'vote') {
      v.endAt = st.voteEnd; v.dur = VOTE_MS;
      v.chains = st.thumbs.map((ch, c) => ({ by: c, items: ch.map(viewItem) }));
      v.myVote = me >= 0 ? st.votes[me] : null;
    } else {
      v.fav = st.fav.map(f => ({ c: f.c, s: f.s, v: f.v, item: viewItem(st.chains[f.c][f.s]) }));
    }
    return v;
  },
  turnOf() { return null; },                    // herkes aynı anda oynar; bilgisayarlar kendi zamanlayıcısıyla
  botAct() { /* kullanılmıyor: bilgisayar hamleleri armPlay/startVote içinde zamanlanır */ },
  skipTurn() { /* sıra yok */ },
  onPresence(st, pi, online, ctx) {
    st.on[pi] = online;
    if (online) return;
    if (st.phase === 'play' && !st.done[pi] && !st.adv) { fill(st, pi, '(bağlantı koptu)'); ctx.emit({ t: 'sub', pi, s: st.step }); ctx.sync(); checkAll(st, ctx); }
    else if (st.phase === 'vote') checkVotes(st, ctx);
  },
  resume(st, ctx) {
    st.tk++;
    if (st.phase === 'play') {
      if (st.adv) { st.adv = false; }
      armPlay(st, ctx); checkAll(st, ctx);
    } else if (st.phase === 'album') armAlbum(st, ctx);
    else if (st.phase === 'vote') {
      st.vadv = false; const tk = st.tk;
      ctx.later(Math.max(0, st.voteEnd - Date.now()), () => { if (st.tk === tk && st.phase === 'vote') finish(st, ctx); });
      botVotes(st, ctx); checkVotes(st, ctx);
    }
  },
  mount, render, onEvent, unmount,
  _test: { chainOf, workerOf, kindOf, stepsFor, matchIcons, botDraw, botContinue, botDescribe, mutate, simplifyOps, PROMPTS, ICONS, parseItem, PK, MAX_BYTES, drawBytes }
});
})();
