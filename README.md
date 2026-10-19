# Oyun Salonu — Çarkıfelek ve arkadaşları

Telefonda ve bilgisayarda tarayıcıda çalışan, arkadaşlarla online oynanan Türkçe oyun salonu.

**Oyna:** https://adnanerdem2000-sudo.github.io/carkifelek/

## Nasıl oynanır
- **Arkadaşlarla online:** biri adını yazıp **Oda kur**'a basar, çıkan 5 harfli kodu ya da **Paylaş** linkini gönderir. Diğerleri linke dokunup katılır. Kurucu lobide oyunu seçer ve başlatır; oyun bitince lobiye dönüp başka oyun seçilebilir.
- **Bu cihazda:** aynı telefonda sırayla ya da bilgisayara karşı.

## Oyunlar
| Oyun | Kişi | Not |
|---|---|---|
| 🎡 Çarkıfelek | 1–4 | Çark, bulmaca, ipucu marketi; 1.339 bulmaca |
| 🐾 Patili Yarış | 1–6 | Sevimli hayvanlarla engelli koşu, güçler, market |
| 🦎 Bukalemun Saklambaç | 2–6 | Şekil değiştir, kendini boya, ebe arasın; 10 harita |
| 🚨 Hain Kim? | 4–8 | Görev yap, dondurulanı bildir, haini toplantıda oyla; 2 harita |
| 🏃 Kovalamaca | 2–8 | Ebelemece, Sıcak Patates, Dondurmaca; 3 arena |
| 💣 Bomba Kelime | 2–8 | Heceyi içeren kelimeyi yaz, bombayı geçir |
| 🕵️ Casus Kim? | 3–8 | Herkes mekânı bilir, casus bilmez |
| 🗝️ Kelime Kodu | 4–8 | İki takım, kaptan tek kelimelik ipucu verir |
| 😂 Komik Cevap | 3–8 | En komik cevabı yaz, oylansın |
| 📞 Telefon Çiz | 3–8 | Cümle → çizim → tahmin zinciri, sonunda albüm |
| 🎉 Parti Tahtası | 2–8 | Zar, anahtar, kupa, eşyalar; her tur sonunda 9 mini oyundan biri |
| 🟪 Düşen Zemin | 2–8 | Bastığın altıgen düşer, en son ayakta kalan kazanır; 3 arena |
| 🖌️ Boya Savaşı | 2–8 | Haritanın en çok yerini kendi renginle boya; tek ya da takım |
| ☃️ Kar Topu Savaşı | 2–8 | Takım maçı, bayrak kapmaca, herkes tek; kardan duvarlar |
| 👩‍🍳 Mutfak Kaosu | 1–6 | Birlikte döner, menemen, çorba, pide yetiştirin; 5 mutfak |
| 🚀 Uzay Ekibi | 2–8 | Ekranındaki komutu arkadaşına bağır, gemi düşmesin |
| 📻 Dalga Boyu | 2–8 | Medyum ipucu verir, ekip kadranda gizli noktayı bulur |
| 🔠 Kelime Kare | 1–8 | Harf tablosunda parmağını kaydırarak kelime bul; 4×4 / 5×5 |
| ✏️ Çiz Bil | 2–6 | Biri çizer, diğerleri tahmin eder |
| 🏙️ Emlak Kralı | 2–6 | 40 kare, 3 tahta, 3D zar, açık artırma, takas, ipotek; Klasik/Hızlı/Mega/Kaos modları |
| 🚢 Amiral Battı | 2 | Gemi yerleştir, sırayla ateş et |
| 🎲 Zar Turnuvası | 1–4 | Beş zar, 13 kategori |
| 🟦 Kutu Kapmaca | 2–4 | Çizgi çek, kutu kap |
| ⚫ Ters Yüz | 2 | Taşları çevir |
| 🔴 Dört Taş | 2 | Dört taşı diz |
| 🎯 Kızma Birader | 2–4 | Klasik |
| 🪨 Mangala | 2 | Geleneksel Türk oyunu |
| ♟️ Türk Daması | 2 | Resmî kurallar |
| 🧠 Bilgi Yarışması | 1–6 | 591 soru, herkes aynı anda |
| 🪢 Adam Asmaca Yarışı | 1–4 | Sırayla harf tahmini |
| 🔤 Kelime Avı | 1–4 | 5 harfli gizli kelime, herkes aynı anda |

Odalar en fazla 8 kişiliktir. Çoğu oyunda bilgisayar rakip vardır; Kelime Kodu ve Casus Kim? gerçek oyuncularla oynanır.

## Teknik
Kurulum gerekmez; `index.html` dosyasını açmak yeterli. Online oyunda ayrı sunucu yoktur: oda kurucunun tarayıcısı oyunu yönetir, cihazlar herkese açık ücretsiz MQTT aracıları (broker.emqx.io, broker.hivemq.com, test.mosquitto.org) üzerinden WebSocket ile haberleşir. Gizli bilgiler (cevaplar, gemiler, eller) diğer cihazlara gönderilmez. Bağlantı koparsa cihazlar yeniden bağlanır, sayfayı yenileyen oyuncu koltuğuna döner, bağlantısı kopan oyuncunun sırası otomatik geçer.

- `core.js`: oda sistemi, online bağlantı, menü/lobi, ortak sonuç ekranı
- `games/*.js`: her oyun ayrı modül (`CFX.registerGame`)
- `veri/`: Çarkıfelek bulmaca kaynakları ve denetim araçları
