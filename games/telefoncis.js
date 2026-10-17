/* =========================================================================
   OYUN SALONU — TELEFON ÇİZ
   Herkes komik bir cümle yazar; defterler elden ele dolaşır: bir sonraki
   oyuncu cümleyi çizer, sonraki çizimi anlatır, sonraki o anlatımı çizer…
   Sonunda albüm herkesin ekranında adım adım açılır, en sevilen adım oylanır.
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

/* ---------- sabitler ---------- */
const PALETTE = ['#1b1530', '#ff2e63', '#ff8a00', '#ffd60a', '#22c55e', '#2f7bff', '#8b3dff', '#8b5a2b'];
const COLOR_NAMES = ['Siyah', 'Kırmızı', 'Turuncu', 'Sarı', 'Yeşil', 'Mavi', 'Mor', 'Kahverengi'];
const SIZES = [6, 14, 30];
const ERASER = 8;
const MAX_PTS = 2400, MAX_STROKES = 500, SEND_PTS = 1600, THUMB_PTS = 320, TX_MAX = 80;
const REACT = ['👍', '😂', '😮'];
const ALB_MS = 4000, ALB_CHAIN_MS = 5500, ALB_MANUAL_MS = 30000, VOTE_MS = 60000;
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64I = {}; [...B64].forEach((c, i) => { B64I[c] = i; });
const enc = p => { let s = ''; for (const n of p) s += B64[n >> 6] + B64[n & 63]; return s; };
const dec = s => { const o = []; for (let i = 0; i + 1 < s.length; i += 2) o.push(((B64I[s[i]] | 0) << 6) | (B64I[s[i + 1]] | 0)); return o; };
function rdp(p, eps) {
  const n = p.length / 2; if (n <= 2) return p.slice();
  const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let md = 0, mi = -1;
    const ax = p[a * 2], ay = p[a * 2 + 1], bx = p[b * 2], by = p[b * 2 + 1], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) { const d = (dx === 0 && dy === 0) ? Math.hypot(p[i * 2] - ax, p[i * 2 + 1] - ay) : Math.abs(dy * p[i * 2] - dx * p[i * 2 + 1] + bx * ay - by * ax) / L; if (d > md) { md = d; mi = i; } }
    if (md > eps && mi > 0) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  const o = []; for (let i = 0; i < n; i++) if (keep[i]) o.push(p[i * 2], p[i * 2 + 1]); return o;
}
// çizgileri toplam nokta bütçesine sığdır (sadeleştirme) → [{c,w,p:b64}]
function pack(strokes, budget) {
  let list = strokes.filter(s => s.p.length >= 2).map(s => ({ c: s.c, w: s.w, p: s.p.map(v => clamp(Math.round(v), 0, 1000)) }));
  const total = () => list.reduce((a, s) => a + s.p.length / 2, 0);
  for (let eps = 1.2; total() > budget && eps < 200; eps *= 1.6) list = list.map(s => ({ c: s.c, w: s.w, p: rdp(s.p, eps) }));
  while (total() > budget && list.length > 1) list.shift();
  if (list.length > MAX_STROKES) list = list.slice(-MAX_STROKES);
  return list.map(s => ({ c: s.c, w: s.w, p: enc(s.p) }));
}
const lowerTR = s => String(s || '').toLocaleLowerCase('tr-TR');
const capTR = s => { s = String(s || ''); return s ? s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1) : s; };
const tokensTR = s => lowerTR(s).split(/[^a-zçğıöşüâîû]+/u).filter(Boolean);
const cleanTx = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, TX_MAX);

/* ---------- zincir dönüşü ----------
   Zincir c'yi c. oyuncu başlatır; zincirin s. adımını (c+s) mod n. oyuncu yapar.
   Böylece her adımda herkes tam bir zincirde çalışır ve bir öncekinin işini alır.          */
const chainOf = (p, s, n) => ((p - s) % n + n) % n;
const workerOf = (c, s, n) => (c + s) % n;
const kindOf = s => s === 0 ? 'write' : (s % 2 ? 'draw' : 'desc');
const stepsFor = (n, short) => short ? Math.min(4, n) : n;

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
// Bir simgeyi el çizimi gibi (titrek, hafif eğik) bir kutuya yerleştirir
function iconStrokes(ic, bx, by, size, wrongColor) {
  const rot = (Math.random() - .5) * .3, cos = Math.cos(rot), sin = Math.sin(rot), sc = size / 100;
  const col = wrongColor ? Math.floor(Math.random() * 8) : ic.c;
  return ic.d.map(sh => {
    const pts = shapePts(sh), p = [];
    const j = 1.4;
    for (let i = 0; i < pts.length; i += 2) {
      const x = pts[i] - 50 + (Math.random() - .5) * j, y = pts[i + 1] - 50 + (Math.random() - .5) * j;
      p.push(clamp(Math.round(bx + (x * cos - y * sin + 50) * sc), 0, 1000), clamp(Math.round(by + (x * sin + y * cos + 50) * sc), 0, 1000));
    }
    return { c: sh[1] < 0 ? col : sh[1], w: sh[0] === 'C' ? 2 : 1, p };
  });
}
const QMARK = [['l', 0, 34, 30, 40, 18, 52, 14, 64, 20, 66, 32, 58, 42, 50, 50, 50, 62], ['C', 0, 50, 78]];
function botDraw(text) {
  let names = matchIcons(text).slice(0, 3);
  let unsure = false;
  if (!names.length) { names = [pick(ICONS).n]; unsure = true; }
  else if (Math.random() < .18) {                    // komik hata: bir şeyi yanlış anlamış
    const k = Math.floor(Math.random() * names.length);
    const alt = ICONS.filter(ic => !names.includes(ic.n));
    names[k] = pick(alt).n;
  }
  const lay = names.length === 1 ? [[150, 150, 700]] : names.length === 2 ? [[30, 260, 470], [500, 260, 470]] : [[40, 60, 440], [520, 60, 440], [280, 520, 440]];
  const wrong = Math.random() < .12;
  let strokes = [];
  names.forEach((nm, i) => { const [x, y, s] = lay[i]; strokes = strokes.concat(iconStrokes(ICON_BY[nm], x + (Math.random() - .5) * 40, y + (Math.random() - .5) * 40, s, wrong)); });
  if (unsure) strokes = strokes.concat(iconStrokes({ c: 0, d: QMARK }, 700, 20, 280, false));
  return { k: 'd', d: pack(strokes, MAX_PTS), icons: names };
}
function nameSentence(names) {
  const t = pick(ICON_TEMPL[Math.min(3, names.length)]);
  return capTR(t.replace('{A}', names[0]).replace('{B}', names[1] || '').replace('{C}', names[2] || ''));
}
function botDescribe(drawing, srcText, used) {
  if (!drawing || drawing.auto || !drawing.d || !drawing.d.length) return pick(EMPTY_DESC);
  if (drawing.icons && drawing.icons.length) {
    const names = drawing.icons.map(nm => (Math.random() < .25 && CONF[nm]) ? pick(CONF[nm]) : nm);
    return nameSentence(names);
  }
  return mutate(srcText || pick(PROMPTS), used);
}
function mutate(text, used) {
  const r = Math.random(), words = String(text).split(' ');
  if (r < .15) return capTR(text);
  if (r < .55) {
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
  if (r < .8) {
    const toks = tokensTR(text).filter(t => t.length >= 4);
    const sim = PROMPTS.filter(p => p !== text && !used.includes(p) && tokensTR(p).some(t => toks.some(k => t.startsWith(k.slice(0, 4)))));
    return sim.length ? pick(sim) : pick(PROMPTS);
  }
  return capTR(text) + pick(FUNNY_TAIL);
}

/* ---------- kurallar (yöneten cihaz) ---------- */
const nOf = st => st.pl.length;
const curC = (st, p) => chainOf(p, st.step, nOf(st));
function secFor(st, kind) { return kind === 'draw' ? st.drawSec : kind === 'desc' ? st.descSec : st.descSec + 15; }
function emptyItem(kind, p, note) { return kind === 'draw' ? { k: 'd', d: [], by: p, auto: 1, note } : { k: 't', tx: note, by: p, auto: 1 }; }
function botItem(st, p) {
  const s = st.step, kind = kindOf(s), c = curC(st, p), ch = st.chains[c];
  let it;
  if (kind === 'write') {
    let pool = PROMPTS.filter(x => !st.used.includes(x)); if (!pool.length) pool = PROMPTS;
    it = { k: 't', tx: pick(pool) }; st.used.push(it.tx);
  } else if (kind === 'draw') {
    const src = ch[s - 1];
    it = botDraw(src && src.k === 't' && !src.auto ? src.tx : pick(PROMPTS));
  } else {
    const src2 = ch[s - 2];
    it = { k: 't', tx: cleanTx(botDescribe(ch[s - 1], src2 && src2.k === 't' && !src2.auto ? src2.tx : '', st.used)) || 'Bir şey' };
  }
  it.by = p;
  return it;
}
function parseItem(kind, a) {
  if (kind === 'draw') {
    if (!Array.isArray(a.d) || a.d.length > MAX_STROKES) return null;
    const out = []; let pts = 0;
    for (const s of a.d) {
      if (!s || typeof s.p !== 'string' || s.p.length < 2 || s.p.length > 12000 || !/^[A-Za-z0-9_-]+$/.test(s.p)) return null;
      const p = dec(s.p).map(v => clamp(v, 0, 1000)); if (p.length % 2) p.pop(); if (!p.length) continue;
      pts += p.length / 2; if (pts > MAX_PTS) return null;
      out.push({ c: clamp(s.c | 0, 0, ERASER), w: clamp(s.w | 0, 0, 2), p: enc(p) });
    }
    return out.length ? { k: 'd', d: out } : { k: 'd', d: [], note: '(boş)', auto: 1 };
  }
  if (typeof a.tx !== 'string') return null;
  const tx = cleanTx(a.tx); if (!tx) return null;
  return { k: 't', tx };
}
function startStep(st, ctx) {
  const kind = kindOf(st.step), now = Date.now();
  st.phase = 'play'; st.done = st.pl.map(() => false); st.draft = st.pl.map(() => null); st.adv = false;
  st.startAt = now; st.endAt = now + secFor(st, kind) * 1000; st.tk++;
  const title = kind === 'write' ? 'Yaz!' : kind === 'draw' ? 'Çiz!' : 'Ne görüyorsun?';
  ctx.emit({ t: 'step', s: st.step, kind }, `Adım ${st.step + 1}/${st.steps}: ${title}`, 'gold');
  st.pl.forEach((p, i) => { if (!p.bot && !st.on[i]) fill(st, i, '(bağlantı koptu)'); });
  armPlay(st, ctx);
  ctx.sync();
  checkAll(st, ctx);
}
function fill(st, p, why) {
  const kind = kindOf(st.step), c = curC(st, p), cur = st.chains[c][st.step];
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
  const tk = st.tk, now = Date.now(), s = st.step, kind = kindOf(s);
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
    const span = Math.max(1000, Math.min(secFor(st, kind) * 1000 * .4, kind === 'draw' ? 9000 : 5000));
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
function albDelay(st) { if (!st.auto) return ALB_MANUAL_MS; return st.alb.s === st.steps - 1 ? ALB_CHAIN_MS : ALB_MS; }
function armAlbum(st, ctx) {
  const tk = st.tk, d = albDelay(st);
  st.albAt = Date.now() + d; st.albDur = d;
  ctx.later(d, () => { if (st.tk === tk && st.phase === 'album') albNext(st, ctx); });
  // bilgisayar oyuncular albüme tepki verir
  const it = st.chains[st.alb.c][st.alb.s];
  st.pl.forEach((p, i) => {
    if (!p.bot || Math.random() > (st.alb.s ? .45 : .2) || (it && it.by === i)) return;
    ctx.later(600 + Math.random() * Math.min(2600, d - 700), () => { if (st.tk === tk) react(st, i, Math.random() < .55 ? 1 : Math.floor(Math.random() * 3), ctx); });
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
  if (!it || it.k !== 'd' || !it.d.length) return it;
  const strokes = it.d.map(s => ({ c: s.c, w: s.w, p: dec(s.p) }));
  return Object.assign({}, it, { d: pack(strokes, THUMB_PTS) });
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
function botVotes(st, ctx) {
  const tk = st.tk;
  st.pl.forEach((p, i) => {
    if (!p.bot || st.votes[i]) return;
    ctx.later(1500 + Math.random() * 4000, () => {
      if (st.tk !== tk || st.phase !== 'vote' || st.votes[i]) return;
      const opts = [];
      st.chains.forEach((ch, c) => ch.forEach((it, s) => { if (it && it.by !== i && !it.auto) opts.push({ c, s, w: it.k === 'd' ? 2 : 1 }); }));
      if (!opts.length) { st.votes[i] = { c: -1, s: -1 }; ctx.sync(); checkVotes(st, ctx); return; }
      const o = pick(opts.flatMap(x => x.w === 2 ? [x, x] : [x]));
      castVote(st, i, o.c, o.s, ctx);
    });
  });
}
function canVote(st, p, c, s) {
  const it = st.chains[c] && st.chains[c][s];
  return !!it && it.by !== p && !it.auto;
}
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
  st.chains.forEach(ch => ch.forEach(it => { if (it && !it.auto && (it.k === 't' || it.d.length)) done[it.by]++; }));
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
    note: `${n} zincir · ${st.steps} adım · ⭐ oy başına 3 puan, tamamlanan her adım 1 puan` + (best ? ` · En sevilen: ${best.k === 't' ? '“' + best.tx + '”' : st.pl[best.by].name + ' çizimi'}` : '')
  });
}
function viewItem(it) {
  if (!it) return null;
  const o = { k: it.k, by: it.by };
  if (it.auto) o.auto = 1;
  if (it.note) o.note = it.note;
  if (it.k === 't') o.tx = it.tx; else o.d = it.d;
  return o;
}

/* ---------- arayüz durumu ---------- */
let root = null, ui = null, V = null, mainKey = '', timerT = null, draftT = null, ro = null;
let tool = { c: 0, w: 1 };
const D = { key: '', strokes: [], cur: null, backup: null, dirty: false, sentAt: 0 };   // çizim taslağı (yalnızca bu cihazda)
const T = { key: '', val: '', dirty: false };                                          // yazı taslağı
let autoSent = '', albShown = { c: -1, s: -1 }, voteSel = null;
let cv = null, cx = null;
const painted = new Map();               // salt-okunur tuvaller → çizgiler
const q = s => root && root.querySelector(s);
const isLocal = () => ui && ui.mode === 'local';
const meIdx = () => (V && typeof ui.me === 'number' && ui.me >= 0 && ui.me < V.players.length) ? ui.me : -1;
const now = () => (ui ? ui.hostNow() : Date.now());
const stepKey = () => V ? `${V.gid}:${V.step}` : '';
const verb = s => s === 0 ? 'yazdı' : (s % 2 ? 'çizdi' : 'şöyle anladı');

/* ---------- tuval çizimi ---------- */
function drawStroke(c2, W, H, s, from) {
  const p = s.p, n = p.length >> 1; if (!n) return;
  const er = s.c === ERASER;
  c2.globalCompositeOperation = er ? 'destination-out' : 'source-over';
  c2.strokeStyle = c2.fillStyle = er ? '#000' : (PALETTE[s.c] || PALETTE[0]);
  c2.lineWidth = Math.max(1.2, SIZES[s.w] * (er ? 1.8 : 1) / 1000 * W);
  c2.lineCap = 'round'; c2.lineJoin = 'round';
  const P = k => [p[2 * k] / 1000 * W, p[2 * k + 1] / 1000 * H];
  if (n === 1) { const [x, y] = P(0); c2.beginPath(); c2.arc(x, y, c2.lineWidth / 2, 0, Math.PI * 2); c2.fill(); c2.globalCompositeOperation = 'source-over'; return; }
  const k0 = Math.max(1, (from >> 1) - 1);
  c2.beginPath();
  if (k0 === 1) { const [x, y] = P(0); c2.moveTo(x, y); } else { const [ax, ay] = P(k0 - 1), [bx, by] = P(k0); c2.moveTo((ax + bx) / 2, (ay + by) / 2); }
  for (let k = k0; k < n - 1; k++) { const [ax, ay] = P(k), [bx, by] = P(k + 1); c2.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2); }
  const [lx, ly] = P(n - 1); c2.lineTo(lx, ly); c2.stroke();
  c2.globalCompositeOperation = 'source-over';
}
const decStrokes = d => (d || []).map(s => ({ c: s.c, w: s.w, p: dec(s.p) }));
function paintCanvas(el, strokes) {
  if (!el) return;
  painted.set(el, strokes);
  const r = el.getBoundingClientRect(); if (!r.width) return;
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
  if (el.width !== W || el.height !== H) { el.width = W; el.height = H; }
  const c2 = el.getContext('2d'); c2.clearRect(0, 0, W, H);
  for (const s of strokes) drawStroke(c2, W, H, s, 0);
}
function repaintAll() {
  for (const [el, s] of painted) { if (!el.isConnected) painted.delete(el); else paintCanvas(el, s); }
  fitDraw();
}
function fitDraw() {
  if (!cv || !cv.isConnected) return;
  const r = cv.getBoundingClientRect(); if (!r.width) return;
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  redrawDraw();
}
function redrawDraw() { if (!cx) return; cx.clearRect(0, 0, cv.width, cv.height); for (const s of D.strokes) drawStroke(cx, cv.width, cv.height, s, 0); }

/* ---------- çizim girdisi ---------- */
const canDraw = () => !!V && V.ph === 'play' && V.kind === 'draw' && V.task && !V.task.done;
function toUnit(e) { const r = cv.getBoundingClientRect(); return [clamp(Math.round((e.clientX - r.left) / r.width * 1000), 0, 1000), clamp(Math.round((e.clientY - r.top) / r.height * 1000), 0, 1000)]; }
function onDown(e) {
  if (!canDraw() || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault(); Sound.init();
  try { cv.setPointerCapture(e.pointerId); } catch { /* */ }
  const [x, y] = toUnit(e);
  D.cur = { c: tool.c, w: tool.w, p: [x, y], pid: e.pointerId }; D.strokes.push(D.cur); D.backup = null; D.dirty = true;
  drawStroke(cx, cv.width, cv.height, D.cur, 0); updateDrawBtns();
}
function onMove(e) {
  const s = D.cur; if (!s || s.pid !== e.pointerId) return;
  e.preventDefault();
  const r = cv.getBoundingClientRect();
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of (evs.length ? evs : [e])) {
    const [x, y] = toUnit(ev), p = s.p, lx = p[p.length - 2], ly = p[p.length - 1];
    if (Math.hypot((x - lx) * r.width / 1000, (y - ly) * r.height / 1000) < 2) continue;
    if (p.length >= 3000) break;
    p.push(x, y); drawStroke(cx, cv.width, cv.height, s, p.length - 2);
  }
}
function onUp(e) { if (!D.cur || (e && D.cur.pid !== e.pointerId)) return; delete D.cur.pid; D.cur = null; }
function toolClick(b) {
  if (!canDraw()) return;
  Sound.init();
  if (b.dataset.c != null) { tool.c = +b.dataset.c; Sound.tick(.5); }
  else if (b.dataset.w != null) { tool.w = +b.dataset.w; if (tool.c === ERASER) tool.c = 0; Sound.tick(.5); }
  else if (b.dataset.tool === 'undo') {
    D.cur = null;
    if (D.strokes.length) D.strokes.pop(); else if (D.backup) { D.strokes = D.backup; D.backup = null; }
    D.dirty = true; redrawDraw(); Sound.whoosh();
  } else if (b.dataset.tool === 'clear') {
    if (!D.strokes.length) return;
    D.cur = null; D.backup = D.strokes; D.strokes = []; D.dirty = true; redrawDraw(); Sound.whoosh();
  }
  renderTools(); updateDrawBtns();
}
function renderTools() {
  const t = q('.tc-tools'); if (!t) return;
  t.querySelectorAll('button').forEach(b => {
    if (b.dataset.c != null) b.classList.toggle('on', +b.dataset.c === tool.c);
    if (b.dataset.w != null) { b.classList.toggle('on', +b.dataset.w === tool.w && tool.c !== ERASER); b.style.setProperty('--dot', tool.c === ERASER ? '#999' : PALETTE[tool.c]); }
  });
  const board = q('.tc-board.draw'); if (board) board.classList.toggle('erase', tool.c === ERASER);
}
function updateDrawBtns() {
  const sb = q('[data-act="send"]'); if (sb && V && V.kind === 'draw') sb.disabled = !D.strokes.length;
  const ub = q('[data-tool="undo"]'); if (ub) ub.disabled = !D.strokes.length && !D.backup;
}

/* ---------- gönderme ---------- */
function send(a) { ui.send(a); }
function currentPayload() {
  if (!V || !V.task) return null;
  if (V.kind === 'draw') return D.strokes.length ? { d: pack(D.strokes, SEND_PTS) } : null;
  const inp = q('.tc-in'); const tx = cleanTx(inp ? inp.value : T.val);
  return tx ? { tx } : null;
}
function doSubmit(auto) {
  if (!V || V.ph !== 'play' || !V.task || V.task.done) return;
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
    title = v.kind === 'write' ? 'Yaz!' : v.kind === 'draw' ? 'Çiz!' : 'Ne görüyorsun?';
    s = `Adım ${v.step + 1}/${v.steps}`;
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
    else if (!v.task.done) h = `<span class="g-turn mine">⭐ Sıra sende · ${v.kind === 'write' ? 'komik bir cümle yaz' : v.kind === 'draw' ? 'cümleyi çiz' : 'çizimi anlat'}</span>`;
    else h = `<span class="g-turn win">✓ Gönderildi · bekleniyor: ${waiting.map(o => esc(o.p.name)).join(', ') || '—'}</span>`;
  } else if (v.ph === 'album') {
    const it = v.chain.items[v.chain.items.length - 1];
    h = `<span class="g-turn">📖 ${pname(v.alb.c)} zinciri · ${it ? pname(it.by) + ' ' + verb(v.alb.s) : ''}</span>`;
  } else if (v.ph === 'vote') {
    h = me < 0 ? '<span class="g-turn">👀 Oylama sürüyor</span>' : v.myVote ? '<span class="g-turn win">⭐ Oyun verildi · istersen değiştir</span>' : '<span class="g-turn mine">⭐ Sıra sende · favori adımını seç</span>';
  } else h = '<span class="g-turn win">🎉 Oyun bitti!</span>';
  st.innerHTML = h;
}
function itemHTML(it, s, opts = {}) {
  if (!it) return '<div class="tc-tx miss">—</div>';
  if (it.k === 't') return `<div class="tc-tx ${it.auto ? 'miss' : ''}">${esc(it.tx)}</div>`;
  if (!it.d || !it.d.length) return `<div class="tc-pic empty"><span>${esc(it.note || '(boş)')}</span></div>`;
  return `<div class="tc-pic"><canvas data-paint="${opts.ref || ''}" aria-label="Çizim"></canvas></div>`;
}
function buildPlay(v) {
  const main = q('.tc-main'), me = meIdx();
  painted.clear(); cv = null; cx = null;
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
    const mc = q('.tc-mine'); if (mc && D.key === sk) paintCanvas(mc, D.strokes);
    return;
  }
  if (v.kind === 'draw') {
    if (D.key !== sk) { D.key = sk; D.strokes = []; D.cur = null; D.backup = null; D.dirty = false; tool = { c: 0, w: 1 }; }
    const src = t.input;
    const colors = PALETTE.map((c, i) => `<button type="button" class="tc-col" data-c="${i}" style="--sw:${c}" aria-label="${COLOR_NAMES[i]}"></button>`).join('');
    main.innerHTML = `<div class="tc-note"><small>Çizmen gereken</small><b>${esc(src && src.tx ? src.tx : '(boş)')}</b></div>
      <div class="tc-board draw"><canvas class="tc-cv" aria-label="Çizim tuvali"></canvas></div>
      <div class="tc-tools">
        <div class="tc-cols">${colors}</div>
        <div class="tc-acts">${SIZES.map((_, i) => `<button type="button" class="tc-size s${i}" data-w="${i}" aria-label="${['İnce', 'Orta', 'Kalın'][i]} fırça"><i></i></button>`).join('')}
          <button type="button" class="tc-tb" data-c="${ERASER}" aria-label="Silgi">🧽</button>
          <button type="button" class="tc-tb" data-tool="undo" aria-label="Geri al">↶</button>
          <button type="button" class="tc-tb" data-tool="clear" aria-label="Temizle">🗑️</button></div>
      </div>
      <button type="button" class="btn btn-spin tc-send" data-act="send">✓ Çizimi gönder</button>`;
    cv = q('.tc-cv'); cx = cv.getContext('2d');
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp); cv.addEventListener('lostpointercapture', onUp);
    fitDraw(); renderTools(); updateDrawBtns();
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
  if (!write) { const c = q('canvas[data-paint="in"]'); if (c) paintCanvas(c, decStrokes(t.input.d)); }
  if (!('ontouchstart' in window) && write) setTimeout(() => { if (inp.isConnected) inp.focus({ preventScroll: true }); }, 60);
}
function buildAlbum(v) {
  const main = q('.tc-main'); painted.clear(); cv = null; cx = null;
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
    const p = it ? v.players[it.by] : null;
    li.className = 'tc-it ' + (it && it.k === 'd' ? 'pic' : 'txt') + (s === 0 ? ' first' : '');
    li.style.setProperty('--tilt', ((s % 2 ? 1 : -1) * (0.6 + (s * 37 % 10) / 10)).toFixed(2) + 'deg');
    li.innerHTML = `<div class="tc-by">${p ? avatar(p) : ''}<span class="tc-byl">${p ? `<b style="color:${p.color}">${esc(p.name)}</b> ${verb(s)}` : ''}</span><em>${s + 1}</em></div>${itemHTML(it, s, { ref: 'a' + s })}`;
    ol.appendChild(li);
    const c = li.querySelector('canvas'); if (c) paintCanvas(c, decStrokes(it.d));
    if (s === items.length - 1 && albShown.s >= 0) {
      requestAnimationFrame(() => { try { li.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* */ } });
    }
  }
  albShown.s = items.length - 1;
}
const canAdvance = v => !!v && (v.host === meIdx() || (v.host < 0 && meIdx() >= 0));
function buildVote(v) {
  const main = q('.tc-main'); painted.clear(); cv = null; cx = null;
  const me = meIdx();
  main.innerHTML = `<div class="tc-vote">${v.chains.map((ch, c) => `<section class="tc-vc"><h3>${avatar(v.players[c])}<span>${esc(v.players[c].name)} zinciri</span></h3><div class="tc-vgrid">${ch.items.map((it, s) => {
    const own = it && it.by === me, dis = !it || it.auto || own || me < 0;
    return `<button type="button" class="tc-vi ${it && it.k === 'd' ? 'pic' : 'txt'} ${own ? 'own' : ''}" data-vc="${c}" data-vs="${s}" ${dis ? 'disabled' : ''}>
      <span class="tc-vb">${it ? esc(v.players[it.by].name) : ''}${own ? ' · sen' : ''}</span>${itemHTML(it, s, { ref: `v${c}_${s}` })}<span class="tc-star">⭐</span></button>`;
  }).join('')}</div></section>`).join('')}</div>
  <div class="tc-abar"><div class="tc-reacts">${REACT.map((e, i) => `<button type="button" class="tc-re" data-react="${i}" aria-label="Tepki ${e}">${e}</button>`).join('')}</div>
  ${ui.isHost ? '<button type="button" class="btn btn-ghost tc-next" data-act="endVote">Oylamayı bitir</button>' : ''}</div>`;
  v.chains.forEach((ch, c) => ch.items.forEach((it, s) => { if (it && it.k === 'd' && it.d.length) paintCanvas(q(`canvas[data-paint="v${c}_${s}"]`), decStrokes(it.d)); }));
}
function updateVote(v) {
  const sel = v.myVote;
  root.querySelectorAll('.tc-vi').forEach(b => b.classList.toggle('sel', !!sel && +b.dataset.vc === sel.c && +b.dataset.vs === sel.s));
}
function buildEnd(v) {
  const main = q('.tc-main'); painted.clear(); cv = null; cx = null;
  const medal = ['🥇', '🥈', '🥉'];
  main.innerHTML = `<div class="tc-paper tc-end"><h3>⭐ Favoriler</h3>${v.fav.length ? `<div class="tc-favs">${v.fav.map((f, k) => {
    const p = f.item ? v.players[f.item.by] : null;
    return `<div class="tc-fav"><div class="tc-by"><span class="tc-medal">${medal[k]}</span>${p ? avatar(p) : ''}<span class="tc-byl">${p ? `<b style="color:${p.color}">${esc(p.name)}</b> ${verb(f.s)}` : ''}</span><em>${f.v}⭐</em></div>${itemHTML(f.item, f.s, { ref: 'f' + k })}</div>`;
  }).join('')}</div>` : '<p class="tc-os">Kimse oy vermedi — hepsi birbirinden güzeldi!</p>'}</div>`;
  v.fav.forEach((f, k) => { if (f.item && f.item.k === 'd' && f.item.d.length) paintCanvas(q(`canvas[data-paint="f${k}"]`), decStrokes(f.item.d)); });
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
  if (v.ph === 'play' && v.kind === 'draw') updateDrawBtns();
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
    const s = Math.ceil(left / 1000); if (s <= 5 && tick.last !== s) { tick.last = s; Sound.tick(.7); }
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
  el.style.setProperty('--dx', ((Math.random() - .5) * 80).toFixed(0) + 'px');
  el.style.setProperty('--pc', p ? p.color : '#fff');
  el.innerHTML = `${REACT[e] || '👍'}<small>${p ? esc(p.name) : ''}</small>`;
  lay.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
function onEvent(e) {
  if (!root) return;
  if (e.t === 'react') { floatEmoji(e.pi, e.e); if (e.pi === meIdx()) Sound.tick(.4); return; }
  if (e.t === 'step') {
    Sound.whoosh();
    banner(e.kind === 'write' ? 'YAZ!' : e.kind === 'draw' ? 'ÇİZ!' : 'NE GÖRÜYORSUN?', 'pink');
  } else if (e.t === 'sub') { if (e.pi !== meIdx()) Sound.tick(.3); }
  else if (e.t === 'timeup') { Sound.bad(); }
  else if (e.t === 'album') { Sound.solve(); banner('ALBÜM! 📖', 'good'); FX.confetti(50); }
  else if (e.t === 'alb') { if (e.s === 0) { Sound.special(); banner(`ZİNCİR ${e.c + 1}`, 'pink'); } else Sound.stop(); }
  else if (e.t === 'vote') { Sound.special(); banner('OYLAMA! ⭐', 'good'); }
  else if (e.t === 'voted') { Sound.tick(.4); }
}

/* ---------- kurulum ---------- */
function onClick(e) {
  const b = e.target.closest('button'); if (!b || b.disabled || !V) return;
  if (b.closest('.tc-tools')) { toolClick(b); return; }
  if (b.dataset.react != null) { Sound.init(); send({ t: 'react', e: +b.dataset.react }); b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); return; }
  if (b.dataset.vc != null) {
    Sound.init(); send({ t: 'vote', c: +b.dataset.vc, s: +b.dataset.vs });
    root.querySelectorAll('.tc-vi').forEach(x => x.classList.toggle('sel', x === b)); Sound.good(); return;
  }
  const act = b.dataset.act;
  if (act === 'send') doSubmit(false);
  else if (act === 'rnd') { const inp = q('.tc-in'); if (inp) { let p = pick(PROMPTS); if (p === inp.value) p = pick(PROMPTS); inp.value = p; T.val = p; T.dirty = true; Sound.tick(.6); } }
  else if (act === 'edit') { send({ t: 'edit', s: V.step }); }
  else if (act === 'next') { send({ t: 'next', c: V.alb.c, s: V.alb.s }); }
  else if (act === 'endVote') { send({ t: 'endVote' }); }
}
function mount(r, api) {
  root = r; ui = api; V = null; mainKey = ''; autoSent = ''; albShown = { c: -1, s: -1 };
  D.key = ''; D.strokes = []; D.cur = null; T.key = ''; T.val = ''; painted.clear();
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
  clearInterval(timerT); clearInterval(draftT); timerT = draftT = null;
  if (ro) { ro.disconnect(); ro = null; }
  removeEventListener('resize', repaintAll);
  if (root) root.removeEventListener('click', onClick);
  painted.clear();
  root = null; ui = null; V = null; cv = null; cx = null;
}

CFX.registerGame({
  id: 'telefoncis', name: 'Telefon Çiz', icon: '📞', color: '#ff8a00', min: 3, max: 8, hotseat: false, bot: true, localMin: 1,
  tagline: 'Yaz, çiz, anlat — defterler elden ele bozulsun',
  rules: 'Herkes komik bir cümle yazar; defterler dolaşır: sıradaki oyuncu cümleyi çizer, sonraki çizimi anlatır, sonraki onu çizer. Sonunda albüm adım adım açılır, en sevdiğin adıma oy verirsin (oy başına 3, tamamlanan adım başına 1 puan).',
  botDelay: 900,
  options: [
    { key: 'len', label: 'Zincir uzunluğu', def: 'full', choices: [{ v: 'full', label: 'Herkes kadar' }, { v: 'short', label: 'Kısa (4 adım)' }] },
    { key: 'draw', label: 'Çizim süresi', def: '90', choices: [{ v: '60', label: '60 sn' }, { v: '90', label: '90 sn' }, { v: '120', label: '120 sn' }] },
    { key: 'desc', label: 'Anlatma süresi', def: '45', choices: [{ v: '30', label: '30 sn' }, { v: '45', label: '45 sn' }, { v: '60', label: '60 sn' }] },
    { key: 'album', label: 'Albüm', def: 'auto', choices: [{ v: 'auto', label: 'Otomatik (4 sn)' }, { v: 'host', label: 'Kurucu ilerletir' }] }
  ],
  setup(players, opts, ctx) {
    const n = players.length;
    const st = {
      gid: Math.random().toString(36).slice(2, 8),
      pl: players.map(p => ({ name: p.name, color: p.color, bot: !!p.isBot })), on: players.map(() => true),
      local: ctx.mode === 'local', host: ctx.hostPi, n,
      steps: stepsFor(n, opts.len === 'short'),
      drawSec: [60, 90, 120].includes(+opts.draw) ? +opts.draw : 90,
      descSec: [30, 45, 60].includes(+opts.desc) ? +opts.desc : 45,
      auto: opts.album !== 'host',
      chains: players.map(() => []), step: 0, phase: 'play', done: [], draft: [], adv: false, vadv: false,
      startAt: 0, endAt: 0, tk: 0, alb: { c: 0, s: 0 }, albAt: 0, albDur: 1, votes: [], voteEnd: 0, thumbs: null,
      rt: players.map(() => 0), used: [], score: players.map(() => 0), stars: null, compl: null, fav: []
    };
    startStep(st, ctx);
    return st;
  },
  action(st, pi, a, ctx) {
    if (st.phase === 'end') return;
    switch (a.t) {
      case 'sub': case 'draft': {
        if (st.phase !== 'play' || a.s !== st.step || st.done[pi] || st.adv) return;
        const it = parseItem(kindOf(st.step), a); if (!it) return;
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
      gid: st.gid, ph: st.phase, n: nOf(st), steps: st.steps, step: st.step, kind: kindOf(st.step), host: st.host,
      players: st.pl.map((p, i) => ({ name: p.name, color: p.color, on: st.on[i], bot: p.bot,
        done: st.phase === 'play' ? !!st.done[i] : st.phase === 'vote' ? !!st.votes[i] : false,
        score: st.phase === 'end' ? st.score[i] : null }))
    };
    if (st.phase === 'play') {
      v.endAt = st.endAt; v.dur = st.endAt - st.startAt;
      if (me >= 0) {
        const c = curC(st, me);
        // gizlilik: oyuncu yalnızca üzerinde çalışacağı tek parçayı görür
        v.task = { input: st.step > 0 ? viewItem(st.chains[c][st.step - 1]) : null, done: !!st.done[me] };
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
  _test: { chainOf, workerOf, kindOf, stepsFor, matchIcons, botDraw, botDescribe, mutate, pack, enc, dec, PROMPTS, ICONS, parseItem }
});
})();
