/* =========================================================================
   OYUN SALONU — DALGA BOYU
   Her turda bir oyuncu Medyum olur. İki zıt uçlu bir yelpaze kartı herkese
   görünür; gizli hedef bölgeyi yalnızca Medyum görür ve tek bir ipucu verir.
   Tahminciler büyük kadranın ibresini birlikte çevirip kilitler. Takım
   modunda rakip takım "sol mu, sağ mı?" diye bonus puan için tahmin eder.
   2–8 kişi online, aynı cihazda sırayla ya da bilgisayarlarla.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial } = CFX;

/* ---------- yelpaze kartları: "Sol|Sağ|örnek konum;örnek konum;…" (0 = sol uç, 100 = sağ uç) ---------- */
const RAW = [
  'Soğuk|Sıcak|Kutup ayısı 3;Buzdolabı 13;Sonbahar yağmuru 32;Ilık duş 58;Demlenmiş çay 80;Volkan lavı 97',
  'Sıkıcı|Heyecanlı|Vergi formu 4;Bekleme salonu 14;Hava durumu bülteni 35;Futbol derbisi 70;Lunapark 84;Paraşütle atlamak 97',
  'Ucuz|Pahalı|Simit 4;Otobüs bileti 13;Sinema bileti 33;Akıllı telefon 64;Araba 84;Özel yat 98',
  'Kötü film|İyi film|Yarıda çıkılan film 4;İzlerken uyuduğun film 16;Bir kere izlenir 45;Arkadaşa önerilen film 70;Defalarca izlenen film 88;Herkesi ağlatan klasik 96',
  'Çocukça|Yetişkince|Oyuncak ayı 4;Çizgi film 12;Salıncak 20;Bilgisayar oyunu 45;Sade kahve 74;Vergi beyannamesi 95',
  'Az bilinen|Çok ünlü|Mahallenin bakkalı 5;Köy muhtarı 13;Yerel radyo spikeri 28;Dizi oyuncusu 62;Dünya kupası yıldızı 86;Aya ilk ayak basan astronot 95',
  'Küçük|Büyük|Kum tanesi 2;Karınca 8;Elma 22;Köpek 40;At 60;Fil 78;Dağ 96',
  'Hafif|Ağır|Tüy 2;Kâğıt yaprağı 8;Telefon 24;Dolu bavul 55;Buzdolabı 78;Kamyon 96',
  'Yavaş|Hızlı|Salyangoz 3;Kaplumbağa 10;Yürüyen insan 27;Bisiklet 45;Araba 67;Uçak 85;Işık 99',
  'Yumuşak|Sert|Pamuk 3;Yastık 10;Ekmek içi 24;Elma 55;Tahta 76;Elmas 98',
  'Sessiz|Gürültülü|Kütüphane 4;Fısıltı 10;Sohbet 40;Kalabalık pazar 66;Rock konseri 85;Havai fişek 94',
  'Karanlık|Aydınlık|Mağara 3;Gece yarısı 10;Mum ışığı 30;Bulutlu gün 55;Öğle güneşi 88;Güneşin yüzeyi 98',
  'Kuru|Islak|Çöl 3;Kraker 9;Kum 20;Toprak 38;Sabah çiyi 62;Yağmurlu sokak 80;Okyanus 98',
  'Kısa|Uzun|Kibrit çöpü 5;Kalem 15;Masa 38;Otobüs 62;Köprü 82;Nehir 96',
  'Sığ|Derin|Su birikintisi 3;Küvet 12;Havuz 35;Göl 60;Deniz 80;Okyanus çukuru 98',
  'Dar|Geniş|İğne deliği 3;Koridor 18;Ara sokak 30;Otoyol 65;Meydan 80;Bozkır 95',
  'Alçak|Yüksek|Halı 3;Tabure 12;Kapı 30;Ağaç 50;Gökdelen 78;Everest 96',
  'Yakın|Uzak|Burnunun ucu 2;Komşu 10;Market 22;Başka şehir 50;Başka kıta 74;Ay 88;Başka galaksi 99',
  'Kısa süren|Uzun süren|Göz kırpma 2;Hapşırık 6;Şarkı 24;Film 40;Tatil 58;Okul yılları 78;Bir ömür 96',
  'Yeni|Eski|Bugünün gazetesi 3;Geçen yılın telefonu 22;Babaannenin dikiş makinesi 60;Antika saat 76;Piramitler 92;Dinozor fosili 98',
  'Az|Çok|Bir damla 3;Bir avuç 15;Bir kova 35;Bir havuz 60;Bir göl 80;Okyanus 98',
  'Basit|Karmaşık|Taş kâğıt makas 4;Çocuk yapbozu 18;Tuşlu telefon 30;Satranç 62;Bilgisayar 80;İnsan beyni 97',
  'Kolay|Zor|Nefes almak 2;Yumurta haşlamak 12;Bisiklete binmek 28;Araba kullanmak 45;Yeni dil öğrenmek 70;Beyin ameliyatı 96',
  'Güvenli|Tehlikeli|Battaniye 3;Kütüphane 8;Bisiklet 35;Motosiklet 64;Köpekbalığıyla yüzmek 88;Volkan kraterine inmek 97',
  'Sağlıklı|Sağlıksız|Brokoli 4;Elma 10;Yoğurt 18;Makarna 45;Hamburger 74;Gazlı içecek 82;Sigara 98',
  'Tatlı|Tuzlu|Pamuk şeker 3;Baklava 7;Meyve 20;Ekmek 55;Cips 84;Turşu 92;Deniz suyu 98',
  'Acısız|Çok acı|Süt 2;Pilav 6;Ketçap 15;Biber salçası 48;Acı biber 78;Dünyanın en acı biberi 99',
  'İğrenç|Lezzetli|Bozuk süt 3;Küflü ekmek 6;Hastane yemeği 26;Kantin tostu 46;Ev yemeği 75;Annenin böreği 93',
  'Kahvaltılık|Akşam yemeği|Bal kaymak 3;Menemen 6;Simit 10;Çorba 50;Mantı 76;Kebap 88',
  'Daha çok meyve|Daha çok sebze|Elma 3;Çilek 6;Avokado 38;Domates 50;Patlıcan 85;Ispanak 97',
  'Doğal|Yapay|Dağ 3;Ağaç 5;Bal 15;Kâğıt 50;Plastik 85;Robot 96',
  'Kırsal|Kentsel|Tarla 3;Köy kahvesi 12;Kasaba pazarı 35;Banliyö 60;Alışveriş merkezi 82;Gökdelen 96',
  'Mutsuz|Mutlu|Cenaze 4;Pazartesi sabahı 22;Sıradan bir gün 50;Cuma akşamı 72;Doğum günü 85;Piyango kazanmak 97',
  'Korkutucu|Sevimli|Dev örümcek 4;Köpekbalığı 10;Yarasa 25;Kirpi 70;Kedi yavrusu 92;Panda 95',
  'Sinir bozucu|Rahatlatıcı|Sivrisinek vızıltısı 3;Trafik sıkışıklığı 8;Alarm sesi 15;Yağmur sesi 80;Kedi mırlaması 88;Masaj 93',
  'Utanç verici|Gurur verici|Herkesin içinde düşmek 5;Fermuarın açık kalması 10;Yanlış kişiye el sallamak 20;Sınavı geçmek 68;Mezuniyet 85;Olimpiyat madalyası 97',
  'Sıradan|Tuhaf|Diş fırçalamak 3;Ekmek almak 5;Şemsiye taşımak 15;Pijamayla dışarı çıkmak 60;Kafada karpuz taşımak 80;Tavuğu tasmayla gezdirmek 93',
  'Ciddi|Komik|Cenaze töreni 3;Mahkeme 8;İş görüşmesi 15;Aile yemeği 50;Muz kabuğuna basmak 85;Palyaço 91',
  'Romantik değil|Çok romantik|Fatura ödemek 4;Dişçi randevusu 7;Pizza siparişi 35;Sinema randevusu 65;Mum ışığında yemek 88;Deniz kenarında gün batımı 95',
  'İçe dönük|Dışa dönük|Keşiş 4;Kitap kurdu 14;Kedi 22;Köpek 78;Sunucu 86;Parti organizatörü 93',
  'Tembel|Çalışkan|Koala 4;Kanepedeki kedi 8;Pazar sabahı uyuyan genç 15;Kunduz 85;Arı 92;Karınca 95',
  'Sakin|Sinirli|Yoga hocası 4;Kaplumbağa 8;Kütüphaneci 15;Trafikteki taksici 75;Boğa 88;Aç aslan 91',
  'Cesur|Korkak|İtfaiyeci 5;Astronot 8;Dağcı 15;Fare 80;Tavşan 88;Gölgesinden korkan kedi 95',
  'Masum|Suçlu|Yeni doğmuş bebek 2;Kedi yavrusu 8;Kurabiye kavanozuna uzanan çocuk 40;Kopya çeken öğrenci 62;Sahte para basan 88;Banka soyguncusu 93',
  'Dürüst|Yalancı|Ayna 3;Hakem 15;Reklam 70;Seçim vaadi 80;Balıkçı hikâyesi 86;Yalan söyledikçe burnu uzayan kukla 97',
  'İyi kalpli|Kötü kalpli|Melek 2;Hemşire 10;Komşu teyze 28;Kurnaz tilki 64;Masal cadısı 85;Şeytan 98',
  'Modası geçmiş|Moda|Daktilo 5;Faks makinesi 10;Kaset çalar 18;Bel çantası 50;Dar paça pantolon 70;Yeni çıkan spor ayakkabı 92',
  'Rahat|Rahatsız|Pijama 3;Eşofman 8;Kot pantolon 40;Takım elbise 64;Yüksek topuklu ayakkabı 85;Ortaçağ zırhı 97',
  'Gereksiz|Gerekli|Kokteyl şemsiyesi 4;Biblo 10;Parfüm 30;Şemsiye 55;Diş fırçası 82;İçme suyu 98',
  'Kirli|Temiz|Çamur 3;Çöp kutusu 6;Maç sonrası forma 20;Kullanılmış tabak 26;Yeni yıkanmış çarşaf 88;Ameliyathane 97',
  'Çirkin|Güzel|Çöp yığını 4;Beton duvar 18;Otopark 26;Park 64;Gün batımı 88;Gökkuşağı 92;Kuzey ışıkları 97',
  'Kokusuz|Kokulu|Su 3;Cam 5;Ekmek 45;Kahve 70;Parfüm 85;Kokarca 98',
  'Hoş kokulu|Kötü kokulu|Gül 3;Taze ekmek 8;Kahve 15;Benzin 60;Ter kokulu çorap 86;Kokarca 98',
  'Kolay meslek|Zor meslek|Dondurma tadımcısı 7;Kasiyer 30;Öğretmen 55;Madenci 80;Cerrah 86;Astronot 93',
  'Az kazandırır|Çok kazandırır|Stajyerlik 5;Garsonluk 15;Öğretmenlik 35;Mühendislik 55;Doktorluk 75;Futbol yıldızlığı 96',
  'Sabah|Gece|Gün doğumu 4;Kahvaltı 10;Öğle arası 45;Akşam yemeği 72;Yıldızlar 90;Gece yarısı atıştırması 96',
  'Yaz|Kış|Plaj 3;Karpuz 5;Dondurma 10;Sonbahar yaprağı 55;Sahlep 85;Kardan adam 96',
  'Geçmiş|Gelecek|Dinozorlar 2;Piramitler 8;Şövalyeler 18;Daktilo 40;Akıllı telefon 55;Uçan araba 85;Mars kolonisi 95',
  'Tarihî|Modern|Kale 5;Kervansaray 10;Tramvay 40;Cam gökdelen 86;Elektrikli araba 90;Akıllı ev 95',
  'Kalabalık|Tenha|Sabah metrosu 3;Stadyum 6;Kapalı çarşı 15;Kışın sahil 70;Dağ başı 88;Issız ada 96',
  'Tatil gibi|İş gibi|Plaj 3;Hamak 5;Kamp 20;Toplantı 85;Mesai 90;Vergi dairesi 95',
  'Evde yapılır|Dışarıda yapılır|Uyumak 5;Yemek pişirmek 12;Kitap okumak 35;Koşu 75;Piknik 88;Kamp 95',
  'Tek başına yapılır|Kalabalıkla yapılır|Günlük yazmak 3;Meditasyon 6;Kitap okumak 10;Satranç 35;Futbol 80;Düğün halayı 95',
  'Gerçek|Hayali|Su 3;Ağaç 5;Dinozor 20;Uzaylı 70;Ejderha 90;Tek boynuzlu at 96',
  'Bilim|Büyü|Mikroskop 3;Aşı 10;Burç yorumu 70;Kahve falı 76;Simya 82;Sihirli değnek 96',
  'Mantıklı|Saçma|Yağmurda şemsiye almak 5;Erken yatmak 10;Gece kahve içmek 50;Kışın tişörtle gezmek 70;Çorbayı çatalla içmek 88;Bulutlara merdiven kurmak 97',
  'Yasal|Yasa dışı|Yürüyüş 3;Otopark 10;Yere çöp atmak 55;Kırmızıda geçmek 70;Kaçakçılık 92;Banka soygunu 98',
  'Kibar|Kaba|Teşekkür etmek 3;Kapıyı tutmak 6;Sırada beklemek 15;Sözünü kesmek 65;Ağzı açık çiğnemek 75;Yüzüne kapı çarpmak 92',
  'Kuralcı|Asi|Hakem 5;Muhasebeci 10;Öğretmen 15;Sanatçı 60;Rock yıldızı 85;Korsan 95',
  'Önemsiz|Önemli|Toz 3;Kaybolan çorap teki 6;Doğum günü kartı 40;İş görüşmesi 70;Düğün 82;Ameliyat 95',
  'Hantal|Zarif|Fil 5;Ayı 10;Kamyon 15;Kedi 75;Kuğu 92;Balerin 96',
  'Esnek|Katı|Lastik 3;Hamur 8;Yoga hocası 12;Plastik cetvel 50;Tahta 75;Beton 95',
  'Görünmez|Göze batan|Hava 2;Bukalemun 8;Gece gri kedi 15;Kırmızı araba 70;Fosforlu yelek 90;Havai fişek 95',
  'Sade|Lüks|Kâğıt bardak 3;Plastik tabak 6;Pazar tezgâhı 15;Kristal avize 85;Altın saat 92;Saray 97',
  'Sabırlı|Sabırsız|Balıkçı 5;Bahçıvan 10;Kaplumbağa 15;Mikrodalgayı izleyen aç insan 70;Kornaya basan sürücü 85;Yolda "Geldik mi?" diyen çocuk 93',
  'Gizli|Herkesin bildiği|Şifre 3;Günlük 8;Sürpriz parti 15;Dedikodu 55;Hava durumu 85;Güneşin doğudan doğduğu 97',
  'Tehlikeli hayvan|Zararsız hayvan|Aslan 3;Timsah 4;Köpekbalığı 6;Arı 40;At 60;Kaplumbağa 85;Japon balığı 97',
  'Vahşi|Evcil|Kurt 3;Aslan 5;Tilki 15;Keçi 70;Kedi 88;Köpek 92;Kanarya 95',
  'Kara canlısı|Deniz canlısı|Deve 3;Aslan 5;Kurbağa 45;Kaplumbağa 50;Penguen 60;Fok 75;Balina 98',
  'Akıllı|Akılsız|Yunus 4;Karga 10;Köpek 20;Tavuk 70;Hindi 78;Japon balığı 86',
  'Uçamaz|Uçmada usta|Taş 2;Penguen 5;Tavuk 20;Güvercin 60;Kartal 85;Şahin 92',
  'Analog|Dijital|Kum saati 3;Plak 8;Kaset 20;CD 50;Akıllı saat 85;Yapay zekâ 97',
  'Taşınabilir|Taşınamaz|Telefon 3;Kitap 8;Bavul 25;Buzdolabı 65;Ev 92;Dağ 99',
  'Kırılgan|Dayanıklı|Yumurta 3;Cam bardak 6;Porselen tabak 10;Plastik kutu 50;Taş 80;Elmas 97',
  'Tek kullanımlık|Ömürlük|Peçete 3;Plastik çatal 6;Kalem 30;Ayakkabı 50;Çelik tencere 80;Alyans 92',
  'Pratik|Gösterişli|Çakı 4;Sırt çantası 8;Spor ayakkabı 20;Kol saati 50;Pullu elbise 85;Taç 95',
  'Kolay tarif|Zor tarif|Su kaynatmak 2;Tost 6;Makarna 15;Kuru fasulye 50;Mantı 80;El açması baklava 93',
  'Hafif yemek|Ağır yemek|Salata 5;Çorba 15;Izgara balık 30;Pizza 65;Kuzu tandır 86;İskender 90',
  'Soğuk içilir|Sıcak içilir|Limonata 3;Ayran 6;Su 15;Süt 50;Kahve 85;Çay 90;Sahlep 95',
  'Çıtır|Lapa gibi|Cips 3;Kraker 6;Elma 20;Ekmek 55;Muhallebi 92;Puding 95',
  'Genç|Yaşlı|Bebek 2;Öğrenci 15;Üniversiteli 25;Orta yaşlı 55;Dede 85;Asırlık çınar 97',
  'Az konuşan|Çok konuşan|Balık 3;Keşiş 5;Kedi 25;Öğretmen 70;Spiker 80;Papağan 88;Berber 92',
  'Güvenilir|Güvenilmez|Köpek 5;Pusula 8;Hava durumu tahmini 50;Bozuk saat 75;Tilki 85;Dolandırıcı 97',
  'Lider|Takipçi|Kaptan 5;Orkestra şefi 8;Öğretmen 25;Asistan 70;Yavru ördek 90;Koyun 93',
  'Zinde|Uykulu|Nöbetçi asker 5;Gece baykuşu 10;Kahve içmiş öğrenci 15;Pazartesi sabahı 75;Koala 90;Kış uykusundaki ayı 96',
  'Dağınık|Düzenli|Çocuk odası 8;Sınav haftasında masa 15;Kuş yuvası 20;Kütüphane rafı 80;Arı peteği 88;Asker dolabı 95',
  'Unutkan|Hafızası güçlü|Japon balığı 3;Anahtarını kaybeden 15;Ezberci öğrenci 70;Ansiklopedi 90;Fil 92;Bilgisayar 97',
  'Kötü tatil|Harika tatil|Gıda zehirlenmesi 3;Kayıp bavul 8;Yağmurlu kamp 15;Sakin bir kasaba 60;Tropik ada 90;Dünya turu 96',
  'Kötü hediye|Harika hediye|Kullanılmış diş fırçası 2;Çorap 25;Kupa bardak 35;Kitap 60;Konser bileti 80;Köpek yavrusu 90',
  'Kötü süper güç|İyi süper güç|Tırnakları hızlı uzatmak 5;Sadece salı günleri görünmezlik 12;Su altında konuşmak 40;Uçmak 85;Işınlanmak 92;Zamanı durdurmak 96',
  'Kötü evcil hayvan|İyi evcil hayvan|Timsah 3;Akrep 5;Yılan 25;Kirpi 50;Hamster 65;Kedi 90;Köpek 92',
  'Bilim kurgu|Gerçek hayat|Uçan halı 3;Konuşan hayvan 8;Zaman makinesi 10;Robot hizmetçi 55;Elektrikli araba 92;Bisiklet 98',
  'Mütevazı|Gösterişli|Kulübe 3;Çadır 6;Apartman dairesi 30;Villa 70;Saray 95;Altın kaplı araba 97',
  'Sıcak renk|Soğuk renk|Kırmızı 3;Turuncu 10;Sarı 25;Yeşil 60;Mor 70;Mavi 85;Lacivert 95',
  'Açık renk|Koyu renk|Beyaz 2;Krem 8;Pembe 20;Gri 50;Lacivert 85;Siyah 98',
  'Ucuz tatil|Pahalı tatil|Balkon tatili 2;Kamp 15;Köy evi 25;Otel 55;Gemi turu 85;Uzay turu 99',
  'Az şekerli|Çok şekerli|Sade kahve 3;Limon 6;Elma 30;Kola 80;Lokum 90;Pamuk şeker 96',
  'Otçul|Etçil|İnek 3;Tavşan 5;Ayı 50;İnsan 55;Köpek 70;Aslan 95;Köpekbalığı 97',
  'Güçsüz|Güçlü|Kelebek 3;Fare 10;Çocuk 20;Futbolcu 55;Halterci 85;Fil 92',
  'Kolay sınav|Zor sınav|Göz testi 5;Kısa quiz 15;Ehliyet sınavı 45;Dönem sonu sınavı 55;Üniversite sınavı 82;Doktora savunması 92',
  'Çok popüler spor|Az bilinen spor|Futbol 3;Basketbol 10;Voleybol 20;Okçuluk 60;Golf 66;Kriket 80;Curling 92',
  'Tehlikesiz spor|Tehlikeli spor|Satranç 2;Bowling 8;Yüzme 30;Futbol 40;Boks 75;Serbest dalış 85;Motor yarışı 90',
  'Yavaş müzik|Hızlı müzik|Ninni 3;Ağıt 8;Slow dans 15;Pop şarkısı 55;Halay 75;Heavy metal 95',
  'Hüzünlü şarkı|Neşeli şarkı|Ağıt 3;Ayrılık şarkısı 8;Aşk şarkısı 50;Düğün şarkısı 85;Çocuk şarkısı 88;Doğum günü şarkısı 92',
  'Sakin hobi|Heyecanlı hobi|Pul koleksiyonu 5;Örgü 10;Bulmaca 15;Fotoğrafçılık 45;Kaya tırmanışı 85;Paraşüt 97',
  'Ucuz hobi|Pahalı hobi|Yürüyüş 2;Kitap okumak 10;Resim 35;Fotoğrafçılık 60;Golf 85;Yat yarışı 97',
  'Kötü alışkanlık|İyi alışkanlık|Yalan söylemek 5;Tırnak yemek 15;Geç kalmak 20;Erken kalkmak 75;Düzenli spor 80;Yardımseverlik 95',
  'Kalın ses|İnce ses|Gök gürültüsü 3;Ayı kükremesi 5;Bas gitar 10;İnsan konuşması 50;Kuş cıvıltısı 85;Düdük 92;Fare sesi 95',
  'Gece canlısı|Gündüz canlısı|Baykuş 3;Yarasa 5;Ateş böceği 10;Kedi 35;İnsan 70;Arı 85;Horoz 95',
  'Gökyüzü|Yeraltı|Yıldız 2;Bulut 10;Kuş 20;Ağaç 40;Metro 75;Köstebek 88;Dünyanın çekirdeği 98',
  'Kaygan|Pürüzlü|Buz 3;Sabun 6;Cam 12;Kâğıt 40;Ağaç kabuğu 75;Kirpi sırtı 90;Zımpara 95',
  'Parlak|Mat|Ayna 3;Elmas 4;Altın 10;Tahta 70;Kâğıt 75;Kumaş 80;Kil 92',
  'Yuvarlak|Köşeli|Top 2;Portakal 6;Simit 10;Yumurta 15;Kitap 85;Zar 92;Küp şeker 95',
  'Sıvı|Katı|Su 3;Bal 20;Jöle 45;Hamur 60;Peynir 75;Taş 98',
  'Kısa ömürlü|Uzun ömürlü|Sinek 3;Kesme çiçek 10;Hamster 20;Köpek 40;İnsan 70;Kaplumbağa 85;Çınar ağacı 95',
  'Az kalorili|Çok kalorili|Su 2;Salatalık 5;Elma 15;Ekmek 45;Pizza 75;Baklava 92;Tereyağı 95',
  'Anlaşılır|Anlaşılmaz|Trafik işareti 5;Resimli kitap 10;Gazete 25;Hukuk metni 75;Doktor yazısı 90;Kuantum fiziği 95',
  'Rahatsız edici ses|Hoş ses|Tebeşir gıcırtısı 3;Alarm 8;Matkap 10;Sohbet 50;Gitar 75;Kuş sesi 88;Dalga sesi 92',
  'Kötü fikir|İyi fikir|Prize çatal sokmak 2;Sınav gecesi sabaha kadar oyun 8;Kışın denize girmek 20;Şemsiye almak 80;Su içmek 90;Emniyet kemeri takmak 96',
  'Gereksiz icat|Harika icat|Muz askısı 5;Elektrikli çatal 10;Özçekim çubuğu 35;Buzdolabı 85;İnternet 92;Tekerlek 95',
  'Az uyur|Çok uyur|Zürafa 5;Yeni doğan bebeğin annesi 10;Sınav haftasında öğrenci 20;Yetişkin insan 50;Kedi 85;Koala 96',
  'Az su ister|Çok su ister|Kaktüs 3;Deve 5;Kedi 25;İnsan 50;Pirinç tarlası 90;Nilüfer 92;Balık 98',
  'İnsana benzer|Hiç benzemez|Şempanze 4;Maymun 8;Ayı 35;Kedi 55;Balık 80;Denizanası 92;Taş 98',
  'Ödül gibi|Ceza gibi|Madalya 3;Dondurma 10;Harçlık 15;Ev ödevi 70;Kırmızı kart 88;Hapis 96',
  'Yetenek ister|Herkes yapabilir|Cerrahlık 3;Keman çalmak 5;Resim yapmak 25;Yemek yapmak 50;Yürümek 92;Esnemek 97',
  'Kalıcı|Geçici|Taş heykel 4;Dövme 5;Ev 15;Saç kesimi 60;Kum kalesi 88;Sabun köpüğü 96',
  'Sıcakkanlı|Mesafeli|Köpek 5;Teyze 10;Komşu 25;Kedi 60;Bürokrat 85;Saray muhafızı 92',
  'Her günkü|Özel gün|Diş fırçalamak 2;İşe gitmek 6;Kahvaltı 8;Pazar kahvaltısı 40;Doğum günü 80;Düğün 95',
  'Saklanır|Sergilenir|Şifre 3;Günlük 5;Kumbara 15;Fotoğraf albümü 45;Tablo 80;Kupa 85;Madalya 90',
  'Kısa yolculuk|Uzun yolculuk|Odadan mutfağa 2;Okula yürümek 15;Şehirlerarası otobüs 50;Kıtalar arası uçuş 80;Dünya turu 92;Mars yolculuğu 99',
  'Angarya|Eğlence|Bulaşık 3;Ütü 5;Çamaşır 8;Bahçe işleri 40;Yemek yapmak 45;Oyun oynamak 92;Dans 95',
  'Hep kaybolur|Asla kaybolmaz|Çorap teki 3;Şemsiye 8;Kalem 12;Telefon 45;Cüzdan 50;Buzdolabı 92;Ev 97',
  'Az bacaklı|Çok bacaklı|Yılan 3;İnsan 20;Köpek 35;Böcek 55;Örümcek 70;Kırkayak 97',
  'Mütevazı yemek|Lüks yemek|Simit 5;Ekmek arası 10;Kuru fasulye pilav 15;Lahmacun 30;Biftek 75;Istakoz 92;Havyar 95',
  'Çok erken|Çok geç|Bir saat önce gelmek 3;On dakika önce gelmek 20;Tam vaktinde 50;Beş dakika gecikmek 62;Yarım saat gecikmek 82;Ertesi gün gelmek 98',
  'Kısa saç|Uzun saç|Kel 2;Asker tıraşı 8;Kısa kesim 20;Omuz hizası 50;Bel hizası 80;Masal prensesinin saçı 97',
  'Az bilinen hayvan|Herkesin bildiği hayvan|Aye-aye 4;Okapi 8;Pangolin 12;Ornitorenk 25;Aslan 90;Kedi 95;Köpek 97',
  'Kolay çizilir|Zor çizilir|Daire 3;Güneş 8;Ev 15;Kedi 40;At 70;İnsan yüzü 80;Kalabalık şehir 95',
  'Doyurucu|Hiç doyurmaz|Mantı 5;Kuru fasulye 8;Makarna 15;Çorba 40;Salata 70;Bir dilim elma 85;Su 98',
  'Sakin hayvan|Hiperaktif hayvan|Tembel hayvan 3;Kaplumbağa 6;İnek 20;Kedi 45;Köpek yavrusu 80;Sincap 90;Sinek 95',
  'Dümdüz|Kıvrım kıvrım|Cetvel 3;Düz yol 6;Spagetti 20;Dalgalı saç 55;Burgu makarna 80;Kuzu yünü 85;Yay 92',
  'Çabuk biter|Hiç bitmez|Hafta sonu 5;Maaş 10;Yazın dondurma 15;Film 40;Ders 65;Banka kuyruğu 82;Bitmeyen dizi 94',
  'Çocuk oyuncağı|Usta işi|Parmak boyası 3;Lego kule 5;Kum kalesi 10;Mobilya kurmak 50;Ev inşa etmek 85;Saat tamiri 92',
  'Korku|Komedi|Zombi filmi 3;Perili ev 8;Gerilim 25;Dram 50;Romantik komedi 80;Skeç programı 95',
  'Gerçekçi|Soyut|Fotoğraf 3;Portre 10;Manzara resmi 20;Karikatür 55;Çocuk çizimi 70;Rastgele boya sıçratma 96',
  'Kısa mesaj|Uzun mesaj|Tamam 2;Tek emoji 4;Doğum günü kutlaması 25;E-posta 50;Mektup 75;Roman 98',
  'Planlı|Anlık|Düğün 3;Taşınma 10;Tatil 15;Akşam yemeği 55;Atıştırmak 85;Hapşırmak 98',
  'Satın alınabilir|Paha biçilemez|Ekmek 5;Araba 15;Ev 25;Sağlık 85;Zaman 90;Dostluk 92',
  'Basit oyun|Strateji oyunu|Saklambaç 4;Yakar top 8;Dama 35;Tavla 45;Satranç 85;Go 92',
  'Kimse sevmez|Herkes sever|Acı şurup 3;Ciğer 15;Bamya 25;Patlıcan 45;Pizza 88;Patates kızartması 90;Çikolata 95',
  'Kirli iş|Temiz iş|Kanalizasyon işçisi 3;Tamirci 15;Bahçıvan 25;Aşçı 50;Ofis çalışanı 80;Eczacı 88',
  'Yorucu|Dinlendirici|Maraton 3;Taşınma 6;Merdiven çıkmak 15;Yürüyüş 50;Kitap okumak 80;Masaj 92;Öğle uykusu 95',
  'Sevimsiz böcek|Sevimli böcek|Hamamböceği 3;Sivrisinek 6;Kene 8;Karınca 45;Arı 60;Kelebek 88;Uğur böceği 95',
  'Sıradan iş|Hayal mesleği|Fotokopi çekmek 4;Evrak doldurmak 8;Kasiyerlik 20;Pilotluk 75;Astronotluk 92;Dünya gezgini 95',
  'Basit giysi|Süslü giysi|Atlet 3;Tişört 6;Kot pantolon 20;Gömlek 40;Takım elbise 70;Gelinlik 92;Kostüm balosu elbisesi 95',
  'Sevilmeyen sabah|Sevilen sabah|Pazartesi 3;Sınav sabahı 8;Erken uçuş 15;Sıradan çarşamba 45;Cumartesi 85;Bayram sabahı 92',
  'Nadir|Her yerde|Dört yapraklı yonca 5;Kuyruklu yıldız 3;Gökkuşağı 25;Kedi 80;Güvercin 90;Toz 97',
  'Az şans|Çok şans|Kara kedi 5;Kırık ayna 8;Yazı tura 50;Uğur böceği 75;Dört yapraklı yonca 90;Piyango ikramiyesi 97',
  'Alçakgönüllü|Kendini beğenmiş|Keşiş 4;Gönüllü hemşire 10;Öğretmen 25;Ünlü şef 65;Tavus kuşu 90;Aynaya hayran kral 96',
  'Yürüyerek gidilir|Uçakla gidilir|Bakkal 2;Okul 10;Komşu mahalle 20;Başka şehir 55;Başka ülke 80;Başka kıta 95',
  'Evde kalınır|Mutlaka gidilir|Sıkıcı toplantı 10;Uzak akrabanın düğünü 35;Arkadaş doğum günü 70;Kendi mezuniyetin 92;Kendi düğünün 98;Yağmurda alışveriş 15',
  'Köpek gibi|Kedi gibi|Sadık dost 4;Topu getiren 8;Kuyruk sallayan 12;Bağımsız 80;Kutuya giren 88;Kanepede uyuklayan 85',
  'Sıradan gün|Unutulmaz gün|Salı 3;Market alışverişi 8;Ders günü 15;İlk iş günü 70;Mezuniyet 85;Çocuğunun doğduğu gün 97',
  'Kolay telaffuz|Zor telaffuz|Su 3;Elma 6;Kitap 10;Şemsiye 40;Kütüphane 55;Çekoslovakyalılaştıramadıklarımızdan 99',
  'Bayat|Taze|Dünkü ekmek 15;Bayat simit 10;Küflü peynir 3;Konserve 45;Pazar sebzesi 80;Fırından yeni çıkmış ekmek 96',
  'Kısa soluklu|Uzun soluklu|Sprint 3;Hapşırık 5;Şarkı 25;Maç 45;Maraton 85;Dünya turu 95',
  'Kıskanç|Cömert|Ejderha hazinesi 5;Cimri tüccar 8;Hediyeyi saklayan çocuk 20;Paylaşan arkadaş 75;İkram eden teyze 88;Noel Baba 96'
];

function norm(s) { return String(s || '').toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim(); }
const SPECS = RAW.map(line => {
  const [l, r, ex] = line.split('|');
  const items = ex.split(';').map(s => { const m = s.trim().match(/^(.*\S)\s+(\d+)$/); return { t: m[1], p: +m[2], n: norm(m[1]) }; });
  return { l, r, items };
});

/* ---------- kurallar ---------- */
const B4 = 2.5, B3 = 7.5, B2 = 12.5;     // hedef merkezine uzaklık (0–100 ölçeğinde); 100 birim = 180°
const TMIN = 6, TMAX = 94, REVEAL_MS = 7000;
const TEAM_NAMES = ['Turkuaz', 'Pembe'], TEAM_COL = ['#19e3d0', '#ff3fa4'];
function bandPts(dial, tgt) { const d = Math.abs(dial - tgt); return d <= B4 ? 4 : d <= B3 ? 3 : d <= B2 ? 2 : 0; }
function clampPos(p) { p = +p; if (!isFinite(p)) return 50; return Math.round(Math.max(0, Math.min(100, p)) * 10) / 10; }
function cleanClue(t) { const s = String(t == null ? '' : t).replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40); return s; }
function clueOk(s) { return s.length >= 1 && /\p{L}/u.test(s) && !/^[\d\s.,%+-]+$/.test(s); }
const rnd = (a, b) => a + Math.random() * (b - a);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;   // ~[-1,1]
const isBot = (st, i) => !!(st.pl[i] && st.pl[i].isBot);

function guessersOf(st) { return st.teams[st.act].filter(i => i !== st.med); }
function oppOf(st) { return st.mode === 'team' ? st.teams[1 - st.act] : []; }
function captainOf(st, list) {
  if (!list.length) return null;
  const h = list.find(i => !isBot(st, i) && st.on[i]); if (h != null) return h;
  const b = list.find(i => isBot(st, i)); if (b != null) return b;
  return list[0];
}

/* ---------- bilgisayar: ipucu seçme ve ipucu yorumlama ---------- */
function botClue(st) {
  const sp = SPECS[st.spec];
  const cands = sp.items.map(it => ({ it, d: Math.abs(it.p - st.tgt) + rnd(0, 3) })).sort((a, b) => a.d - b.d);
  const fresh = cands.find(c => !st.used.includes(c.it.t)) || cands[0];
  return fresh.it.t;
}
function suggestFor(specIdx, tgt) {
  const sp = SPECS[specIdx]; if (!sp || tgt == null) return '';
  return sp.items.slice().sort((a, b) => Math.abs(a.p - tgt) - Math.abs(b.p - tgt))[0].t;
}
function tokMatch(a, b) { if (a === b) return true; const k = Math.min(5, a.length, b.length); return k >= 4 && a.slice(0, k) === b.slice(0, k); }
// İpucunun yelpazedeki konumunu tahmin et: örnek listesi, anahtar kelimeler, yoğunluk sözcükleri + gürültü
function estimate(specIdx, clue, noise = 1) {
  const sp = SPECS[specIdx], c = norm(clue);
  const toks = c.split(' ').filter(w => w.length >= 3);
  let est = null, conf = 0;
  for (const it of sp.items) {
    if (it.n === c) { est = it.p; conf = 1; break; }
    const it2 = it.n.split(' ').filter(w => w.length >= 3);
    if (!it2.length || !toks.length) continue;
    const hit = it2.filter(w => toks.some(t => tokMatch(t, w))).length / Math.max(it2.length, toks.length);
    if (hit > conf) { conf = hit; est = it.p; }
  }
  if (est == null || conf < .34) {
    const L = norm(sp.l).split(' ').filter(w => w.length >= 3), R = norm(sp.r).split(' ').filter(w => w.length >= 3);
    const hl = toks.some(t => L.some(w => tokMatch(t, w))), hr = toks.some(t => R.some(w => tokMatch(t, w)));
    if (hl && !hr) { est = 12; conf = .5; } else if (hr && !hl) { est = 88; conf = .5; }
  }
  if (est == null) { est = 50 + gauss() * 28; conf = .15; }
  const words = c.split(' ');
  if (words.some(w => ['aşırı', 'çok', 'en', 'süper', 'mega', 'acayip', 'müthiş', 'dünyanın'].includes(w))) est = 50 + (est - 50) * 1.3;
  if (words.some(w => ['biraz', 'orta', 'ortalama', 'normal', 'idare', 'vasat', 'arada', 'sıradan'].includes(w))) est = 50 + (est - 50) * .55;
  const spread = (conf >= 1 ? 15 : conf >= .5 ? 20 : 26) * noise;
  return clampPos(Math.max(1, Math.min(99, est + gauss() * spread)));
}

/* ---------- akış ---------- */
function drawCard(st) {
  if (st.dp >= st.deck.length) { st.deck = CFX.shuffle(SPECS.map((_, i) => i)); st.dp = 0; }
  return st.deck[st.dp++];
}
function newTurn(st, ctx, sameTeam) {
  if (st.mode === 'team' && !sameTeam && st.turnNo > 0) st.act = 1 - st.act;
  const team = st.teams[st.act];
  st.med = team[st.medIdx[st.act] % team.length]; st.medIdx[st.act]++;
  st.spec = drawCard(st);
  st.tgt = Math.round(rnd(TMIN, TMAX) * 10) / 10;
  st.clue = ''; st.dial = 50; st.side = null; st.props = {}; st.peek = false; st.botGoal = null; st.botOwn = null; st.botSteps = 0;
  st.phase = 'clue'; st.turnNo++; st.cardNo += st.mode === 'coop' ? 1 : 0; st.tk++;
  const sp = SPECS[st.spec], who = st.pl[st.med].name;
  ctx.emit({ t: 'turn', med: st.med, team: st.act },
    `${st.mode === 'coop' ? `Kart ${st.cardNo}/${st.cards}` : `${TEAM_NAMES[st.act]} takım`} · Medyum: ${who} · ${sp.l} ↔ ${sp.r}`);
  arm(st, ctx); ctx.sync();
}
function arm(st, ctx) {
  const tk = st.tk;
  const at = (ms, fn) => ctx.later(Math.max(0, ms), () => { if (st.tk === tk) fn(); });
  if (st.phase === 'guess') {
    const g = guessersOf(st), cap = captainOf(st, g);
    g.forEach(i => {
      if (!isBot(st, i) || i === cap || st.props[i] != null) return;
      at(rnd(1300, 3600), () => {
        if (st.phase !== 'guess') return;
        st.props[i] = estimate(st.spec, st.clue);
        ctx.emit({ t: 'prop', pi: i }, `${st.pl[i].name}: "Bence ${st.props[i] < 50 ? (st.props[i] < 25 ? 'iyice sola' : 'biraz sola') : (st.props[i] > 75 ? 'iyice sağa' : 'biraz sağa')} çevirelim."`);
        ctx.sync();
      });
    });
  } else if (st.phase === 'reveal') {
    at(st.revealAt + REVEAL_MS - Date.now(), () => afterReveal(st, ctx));
  }
}
function lockDial(st, ctx, pi) {
  st.tk++;
  const who = pi != null && st.pl[pi] ? st.pl[pi].name : 'Takım';
  if (st.mode === 'team') {
    st.phase = 'side';
    ctx.emit({ t: 'lock', pi }, `${who} kadranı kilitledi. ${TEAM_NAMES[1 - st.act]} takım: hedef ibrenin solunda mı sağında mı?`);
  } else {
    ctx.emit({ t: 'lock', pi }, `${who} kadranı kilitledi.`);
    reveal(st, ctx);
    return;
  }
  ctx.sync();
}
function reveal(st, ctx) {
  const pts = bandPts(st.dial, st.tgt);
  let bonus = 0, sideOk = null;
  if (st.mode === 'team') {
    st.tsc[st.act] += pts;
    if (st.side) {
      sideOk = st.side === 'L' ? st.tgt < st.dial : st.tgt > st.dial;
      if (sideOk && pts < 4) { bonus = 1; st.tsc[1 - st.act] += 1; }
    }
  } else st.total += pts;
  st.medPts[st.med] += pts;
  st.phase = 'reveal'; st.revealAt = Date.now(); st.tk++;
  const sp = SPECS[st.spec];
  st.last = { pts, bonus, sideOk, side: st.side, dial: st.dial, tgt: st.tgt, clue: st.clue, med: st.med, team: st.act };
  st.hist.push({ l: sp.l, r: sp.r, clue: st.clue, pts, tgt: st.tgt, dial: st.dial, team: st.act, bonus });
  const ptxt = pts === 4 ? 'TAM İSABET! 4 puan' : pts ? `${pts} puan` : 'Iska, puan yok';
  const who = st.mode === 'team' ? `${TEAM_NAMES[st.act]} takım` : 'Ekip';
  let log = `"${st.clue}" → ${who}: ${ptxt}.`;
  if (st.mode === 'team' && st.side) log += sideOk ? (bonus ? ` ${TEAM_NAMES[1 - st.act]} takım yönü bildi: +1.` : ` ${TEAM_NAMES[1 - st.act]} yönü bildi ama tam isabet bonusu engelledi.`) : ` ${TEAM_NAMES[1 - st.act]} takım yönü bilemedi.`;
  ctx.emit({ t: 'reveal', pts, bonus });
  const tk = st.tk;   // sonuç satırı perde açıldıktan sonra günlüğe düşsün (davul sırasında sürpriz bozulmasın)
  ctx.later(2600, () => { if (st.tk === tk) ctx.emit({ t: 'rlog' }, log, pts >= 3 ? 'good' : pts ? 'gold' : 'bad'); });
  arm(st, ctx); ctx.sync();
}
function afterReveal(st, ctx) {
  if (st.phase !== 'reveal') return;
  if (st.mode === 'team') {
    const [a, b] = st.tsc;
    if (Math.max(a, b) >= st.goal && a !== b) return finish(st, ctx);
    const L = st.last;
    if (st.catchup && L && L.pts === 4 && st.tsc[L.team] < st.tsc[1 - L.team]) {
      ctx.emit({ t: 'catchup', team: L.team }, `Telafi kuralı: ${TEAM_NAMES[L.team]} takım geride olduğu için tam isabetle bir tur daha oynuyor!`, 'gold');
      return newTurn(st, ctx, true);
    }
    return newTurn(st, ctx, false);
  }
  if (st.cardNo >= st.cards) return finish(st, ctx);
  newTurn(st, ctx, false);
}
function rating(pct) {
  if (pct >= .85) return 'Zihin okuyucular! 🔮';
  if (pct >= .7) return 'Aynı frekanstasınız! 📻';
  if (pct >= .55) return 'Güzel uyum 👍';
  if (pct >= .4) return 'Biraz parazit var 📡';
  return 'Frekans kayıp… 🌫️';
}
function finish(st, ctx) {
  st.phase = 'done'; st.tk++;
  ctx.sync();
  if (st.mode === 'team') {
    const w = st.tsc[0] > st.tsc[1] ? 0 : 1;
    const order = st.teams[w].concat(st.teams[1 - w]);
    ctx.end({ title: `${TEAM_NAMES[w]} takım kazandı!`,
      ranking: order.map(i => { const t = st.teams[0].includes(i) ? 0 : 1; return { pi: i, score: st.tsc[t], label: `${TEAM_NAMES[t]} · ${st.tsc[t]} puan` }; }),
      note: `${TEAM_NAMES[0]} ${st.tsc[0]} – ${st.tsc[1]} ${TEAM_NAMES[1]} · ${st.turnNo} kart oynandı.` });
  } else {
    const max = st.cards * 4, pct = st.total / max;
    const order = st.pl.map((_, i) => i).sort((a, b) => st.medPts[b] - st.medPts[a]);
    ctx.end({ title: rating(pct),
      ranking: order.map(i => ({ pi: i, score: st.total, label: `Medyumken ${st.medPts[i]} puan` })),
      note: `Ortak skor: ${st.total} / ${max} (%${Math.round(pct * 100)}).` });
  }
}

function action(st, pi, a, ctx) {
  if (!a || st.phase === 'done') return;
  switch (a.t) {
    case 'peek':
      if (st.phase !== 'clue' || pi !== st.med || st.peek) return;
      st.peek = true; ctx.sync(); return;
    case 'clue': {
      if (st.phase !== 'clue' || pi !== st.med) return;
      const c = cleanClue(a.text); if (!clueOk(c)) return;
      st.clue = c; st.used.push(c); st.peek = false; st.phase = 'guess'; st.dial = 50; st.tk++;
      ctx.emit({ t: 'clue', text: c, pi }, `📻 ${st.pl[pi].name} ipucu verdi: "${c}"`, 'gold');
      arm(st, ctx); ctx.sync(); return;
    }
    case 'dial': {
      if (st.phase !== 'guess' || !guessersOf(st).includes(pi)) return;
      st.dial = clampPos(a.p); ctx.sync(); return;
    }
    case 'lock': {
      if (st.phase !== 'guess' || !guessersOf(st).includes(pi)) return;
      if (a.p != null) st.dial = clampPos(a.p);
      lockDial(st, ctx, pi); return;
    }
    case 'side': {
      if (st.phase !== 'side' || !oppOf(st).includes(pi) || (a.s !== 'L' && a.s !== 'R')) return;
      st.side = a.s;
      ctx.emit({ t: 'side', pi, s: a.s }, `${st.pl[pi].name}: "Hedef ${a.s === 'L' ? 'solda' : 'sağda'}!"`);
      reveal(st, ctx); return;
    }
    default:
  }
}

function canSeeTarget(st, viewer) {
  if (st.phase === 'reveal' || st.phase === 'done') return true;
  if (viewer === 'all') return !isBot(st, st.med) && (st.humans === 1 || (st.phase === 'clue' && st.peek));
  return viewer === st.med;
}
function view(st, viewer) {
  const live = CFX.Room && CFX.Room.game ? CFX.Room.game.players : null;
  const g = guessersOf(st), opp = oppOf(st);
  const v = {
    mode: st.mode, goal: st.goal, cards: st.cards, cardNo: st.cardNo, turnNo: st.turnNo, total: st.total, tsc: st.tsc, teams: st.teams,
    pl: st.pl.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, on: live && live[i] ? live[i].online !== false : true })),
    act: st.act, med: st.med, spec: st.spec, l: SPECS[st.spec].l, r: SPECS[st.spec].r, clue: st.clue, dial: st.dial, phase: st.phase,
    side: st.side, props: st.props, guessers: g, opp, cap: captainOf(st, g), oppCap: captainOf(st, opp), humans: st.humans,
    needPeek: st.phase === 'clue' && viewer === 'all' && !isBot(st, st.med) && st.humans > 1 && !st.peek,
    revealAt: st.revealAt, revealMs: REVEAL_MS, medPts: st.medPts, catchup: st.catchup,
    last: (st.phase === 'reveal' || st.phase === 'done') ? st.last : null,
    hist: st.hist.slice(-6), cardPts: st.mode === 'coop' ? st.hist.map(h => h.pts) : [], tgt: null
  };
  if (canSeeTarget(st, viewer)) v.tgt = st.tgt;
  return v;
}

/* ---------- arayüz ---------- */
let root = null, ui = null, V = null, timers = [];
let needle = 50, dragging = false, pendDial = null, lastFastAt = 0, fastT = null;
let revealKey = -1, revealShown = -1, shutterOpen = false, lastTurn = -1;
const CX = 200, CY = 205, R = 188;
const later = (ms, fn) => { const id = setTimeout(() => { timers = timers.filter(x => x !== id); fn(); }, ms); timers.push(id); };
const lowAnim = () => document.body.classList.contains('anim-low');
const ang = p => Math.PI * (1 - p / 100);
const pt = (p, r) => [CX + r * Math.cos(ang(p)), CY - r * Math.sin(ang(p))];
function wedge(p0, p1, r0, r1) {
  p0 = Math.max(0, p0); p1 = Math.min(100, p1); if (p1 <= p0) return '';
  const [x0, y0] = pt(p0, r1), [x1, y1] = pt(p1, r1), [x2, y2] = pt(p1, r0), [x3, y3] = pt(p0, r0);
  const f = n => n.toFixed(1);
  return `M${f(x0)},${f(y0)} A${r1},${r1} 0 0 1 ${f(x1)},${f(y1)} L${f(x2)},${f(y2)} A${r0},${r0} 0 0 0 ${f(x3)},${f(y3)} Z`;
}

function myRole(v) {
  const me = ui.me, local = ui.mode === 'local';
  if (v.phase === 'clue') return local ? (!v.pl[v.med].isBot ? 'med' : null) : (me === v.med ? 'med' : null);
  if (v.phase === 'guess') return local ? (v.cap != null && !v.pl[v.cap].isBot ? 'guess' : null) : (v.guessers.includes(me) ? 'guess' : null);
  if (v.phase === 'side') return local ? (v.oppCap != null && !v.pl[v.oppCap].isBot ? 'side' : null) : (v.opp.includes(me) ? 'side' : null);
  return null;
}
const canDrag = () => V && V.phase === 'guess' && myRole(V) === 'guess';
const nm = (v, i) => `<b style="color:${v.pl[i].color}">${esc(v.pl[i].name)}</b>`;
function teamOf(v, i) { return v.teams[0].includes(i) ? 0 : 1; }

function svgDial() {
  let ticks = '';
  for (let p = 0; p <= 100; p += 2.5) {
    const big = p % 10 === 0, [x0, y0] = pt(p, R - 4), [x1, y1] = pt(p, R - (big ? 18 : 11));
    ticks += `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" class="${big ? 'big' : ''}"/>`;
  }
  let grille = '';
  for (let r = 30; r < R; r += 13) grille += `<path d="M${CX - r},${CY} A${r},${r} 0 0 1 ${CX + r},${CY}" />`;
  return `<svg class="dlg-svg" viewBox="0 0 400 214" aria-hidden="true">
    <defs>
      <clipPath id="dlgClip"><path d="M${CX - R},${CY} A${R},${R} 0 0 1 ${CX + R},${CY} Z"/></clipPath>
      <linearGradient id="dlgRim" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#5aa2ff"/><stop offset=".25" stop-color="#19e3d0"/><stop offset=".5" stop-color="#ffe14a"/><stop offset=".75" stop-color="#ff8a00"/><stop offset="1" stop-color="#ff3f6c"/></linearGradient>
      <radialGradient id="dlgFace" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#fff8e6"/><stop offset=".7" stop-color="#f6e7c4"/><stop offset="1" stop-color="#e2cb98"/></radialGradient>
      <radialGradient id="dlgKnob" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#fff3c4"/><stop offset=".35" stop-color="#d7a43c"/><stop offset="1" stop-color="#6b4210"/></radialGradient>
      <linearGradient id="dlgShut" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3b2a6e"/><stop offset="1" stop-color="#1a0f3c"/></linearGradient>
    </defs>
    <path d="M${CX - R - 8},${CY} A${R + 8},${R + 8} 0 0 1 ${CX + R + 8},${CY}" class="dlg-rim" stroke="url(#dlgRim)"/>
    <g clip-path="url(#dlgClip)">
      <path d="M${CX - R},${CY} A${R},${R} 0 0 1 ${CX + R},${CY} Z" fill="url(#dlgFace)"/>
      <g class="dlg-target"></g>
      <g class="dlg-ticks">${ticks}</g>
      <g class="dlg-shutter"><path d="M${CX - R - 2},${CY} A${R + 2},${R + 2} 0 0 1 ${CX + R + 2},${CY} Z" fill="url(#dlgShut)"/><g class="dlg-grille">${grille}</g>
        <text x="${CX}" y="${CY - 120}" class="dlg-shut-t">DALGA BOYU</text><text x="${CX}" y="${CY - 98}" class="dlg-shut-s">· · · gizli frekans · · ·</text></g>
      <g class="dlg-props"></g>
    </g>
    <g class="dlg-needle"><line x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY - R + 12}" class="dlg-nl"/><path d="M${CX - 7},${CY - R + 30} L${CX},${CY - R + 6} L${CX + 7},${CY - R + 30} Z" class="dlg-ntip"/></g>
    <circle cx="${CX}" cy="${CY}" r="30" fill="url(#dlgKnob)" class="dlg-knob"/><circle cx="${CX}" cy="${CY}" r="19" class="dlg-knob2"/>
  </svg>`;
}

function drawTarget(v) {
  const g = root.querySelector('.dlg-target');
  const key = v.tgt == null ? '' : String(v.tgt);
  if (g.dataset.k === key) return;
  g.dataset.k = key;
  if (v.tgt == null) { g.innerHTML = ''; return; }
  const t = v.tgt, r0 = 34, r1 = R;
  const lab = (p, n) => { if (p < 1 || p > 99) return ''; const [x, y] = pt(p, R - 34); return `<text x="${x.toFixed(1)}" y="${(y + 6).toFixed(1)}" class="dlg-bn">${n}</text>`; };
  g.innerHTML = `<path class="dlg-b2" d="${wedge(t - B2, t + B2, r0, r1)}"/><path class="dlg-b3" d="${wedge(t - B3, t + B3, r0, r1)}"/><path class="dlg-b4" d="${wedge(t - B4, t + B4, r0, r1)}"/>
    ${lab(t - (B2 + B3) / 2, 2)}${lab(t - (B3 + B4) / 2, 3)}${lab(t, 4)}${lab(t + (B3 + B4) / 2, 3)}${lab(t + (B2 + B3) / 2, 2)}`;
}
function setNeedle(p, instant) {
  needle = clampPos(p);
  const n = root && root.querySelector('.dlg-needle'); if (!n) return;
  n.classList.toggle('instant', !!instant);
  n.style.transform = `rotate(${(needle * 1.8 - 90).toFixed(2)}deg)`;
  const box = root.querySelector('.dlg-dialbox'); if (box) box.setAttribute('aria-valuenow', String(Math.round(needle)));
}
function setShutter(open) {
  shutterOpen = open;
  const s = root.querySelector('.dlg-shutter'); if (s) s.classList.toggle('open', open);
}

function drawProps(v) {
  const g = root.querySelector('.dlg-props');
  const show = v.phase === 'guess' || v.phase === 'side';
  g.innerHTML = !show ? '' : Object.keys(v.props || {}).map(k => {
    const i = +k, p = v.props[k], [x, y] = pt(p, R - 58), [x1, y1] = pt(p, R - 6), [x2, y2] = pt(p, R - 44);
    return `<g class="dlg-prop"><line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${v.pl[i].color}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="${v.pl[i].color}"/><text x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}">${esc(initial(v.pl[i].name))}</text></g>`;
  }).join('');
}

function topHtml(v) {
  if ((v.phase === 'reveal') && v.last && revealShown !== v.turnNo) {   // perde açılana kadar eski skoru göster
    const L = v.last;
    v = Object.assign({}, v, { tsc: v.tsc.slice(), total: v.total - (v.mode === 'coop' ? L.pts : 0), cardPts: v.cardPts.slice(0, Math.max(0, v.cardPts.length - 1)) });
    if (v.mode === 'team') { v.tsc[L.team] -= L.pts; v.tsc[1 - L.team] -= L.bonus; }
  }
  const chip = i => {
    const p = v.pl[i], active = (v.phase === 'clue' && i === v.med) || (v.phase === 'guess' && v.guessers.includes(i)) || (v.phase === 'side' && v.opp.includes(i));
    return `<span class="dlg-pc ${active ? 'on' : ''} ${p.on ? '' : 'off'}" style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${esc(initial(p.name))}</span><span class="dlg-pn">${esc(p.name)}${ui.me === i ? ' · sen' : ''}</span>${i === v.med && v.phase !== 'done' ? '<span class="dlg-medi" title="Medyum">📻</span>' : ''}</span>`;
  };
  if (v.mode === 'team') {
    return [0, 1].map(t => {
      const pips = Array.from({ length: v.goal }, (_, k) => `<i class="${k < v.tsc[t] ? 'f' : ''}"></i>`).join('');
      const over = v.tsc[t] > v.goal ? `<i class="f x">+${v.tsc[t] - v.goal}</i>` : '';
      return `<div class="dlg-team ${v.act === t && v.phase !== 'done' ? 'act' : ''}" style="--tc:${TEAM_COL[t]}">
        <div class="dlg-th"><b>${TEAM_NAMES[t].toLocaleUpperCase('tr-TR')}</b><span class="dlg-ts">${v.tsc[t]}</span></div>
        <div class="dlg-track" aria-label="${v.tsc[t]} / ${v.goal} puan">${pips}${over}</div>
        <div class="dlg-mem">${v.teams[t].map(chip).join('')}</div></div>`;
    }).join('');
  }
  const pips = Array.from({ length: v.cards }, (_, k) => { const p = v.cardPts[k]; return `<i class="c ${p != null ? 'f p' + p : ''} ${k === v.cardNo - 1 && p == null ? 'now' : ''}">${p != null ? p : ''}</i>`; }).join('');
  return `<div class="dlg-team coop act" style="--tc:var(--yellow)">
    <div class="dlg-th"><b>ORTAK FREKANS</b><span class="dlg-ts">${v.total}<small>/${v.cards * 4}</small></span></div>
    <div class="dlg-track"><span class="dlg-cardno">Kart ${Math.min(v.cardNo, v.cards)}/${v.cards}</span>${pips}</div>
    <div class="dlg-mem">${v.pl.map((_, i) => chip(i)).join('')}</div></div>`;
}

function statusHtml(v) {
  const role = myRole(v), local = ui.mode === 'local';
  const medN = nm(v, v.med);
  const tn = t => `<b style="color:${TEAM_COL[t]}">${TEAM_NAMES[t]}</b>`;
  if (v.phase === 'clue') {
    if (role === 'med') return local && v.humans > 1 ? `<span class="g-turn mine">📻 ${esc(v.pl[v.med].name)}: Medyum sensin</span>` : `<span class="g-turn mine">⭐ Sıra sende · Medyumsun, ipucu ver</span>`;
    return `<span class="g-turn">Medyum ${medN} ${v.pl[v.med].isBot ? 'frekansı arıyor…' : 'ipucunu düşünüyor…'}</span>`;
  }
  if (v.phase === 'guess') {
    const who = v.mode === 'team' ? `${tn(v.act)} takım` : 'Tahminciler';
    if (role === 'guess') return local && v.humans > 1 ? `<span class="g-turn mine">⭐ ${v.mode === 'team' ? TEAM_NAMES[v.act] + ' takım' : 'Tahminciler'}: kadranı çevirin</span>` : `<span class="g-turn mine">⭐ Sıra sende · kadranı çevir, kilitle</span>`;
    return `<span class="g-turn">${who} kadranı çeviriyor…</span>`;
  }
  if (v.phase === 'side') {
    if (role === 'side') return local && v.humans > 1 ? `<span class="g-turn mine">⭐ ${TEAM_NAMES[1 - v.act]} takım: sol mu sağ mı?</span>` : `<span class="g-turn mine">⭐ Sıra sende · hedef solda mı sağda mı?</span>`;
    return `<span class="g-turn">${tn(1 - v.act)} takım yön tahmini yapıyor…</span>`;
  }
  if (v.phase === 'reveal') {
    if (revealShown !== v.turnNo || !v.last) return `<span class="g-turn">📡 Frekans açılıyor…</span>`;
    const L = v.last;
    return `<span class="g-turn ${L.pts >= 3 ? 'win' : ''}">${L.pts === 4 ? '🎯 Tam isabet!' : L.pts ? `${L.pts} puan` : 'Iska!'}${v.mode === 'team' ? ` · ${tn(L.team)}` : ''}</span>`;
  }
  return '<span class="g-turn">Oyun bitti</span>';
}

function controlsHtml(v) {
  const role = myRole(v);
  if (v.phase === 'clue') {
    if (role === 'med' && v.needPeek) return '';
    if (role === 'med') return `<form class="dlg-clueform" autocomplete="off">
        <input class="dlg-in" maxlength="40" placeholder="Tek kelime ya da kısa ifade…" aria-label="İpucu" enterkeyhint="send">
        <button type="submit" class="btn btn-spin dlg-send">GÖNDER</button>
        <button type="button" class="btn btn-ghost dlg-sug" title="Öneri getir">💡 Öneri</button>
        <p class="dlg-hint">Hedef bölgeyi anlatan bir şey yaz: <b>${esc(v.l)}</b> ucuna yakınsa ona, <b>${esc(v.r)}</b> ucuna yakınsa ona benzeyen. Sayı yazmak yok!</p>
        <p class="dlg-err" hidden></p></form>`;
    return `<p class="dlg-wait"><span class="dlg-static"></span>Medyumun ipucu bekleniyor</p>`;
  }
  if (v.phase === 'guess') {
    if (role === 'guess') return `<div class="dlg-row"><p class="dlg-hint c">İbreyi sürükle ya da kadrana dokun. Hazır olunca kilitle.</p><button type="button" class="btn btn-spin dlg-lock">🔒 KİLİTLE</button></div>`;
    return `<p class="dlg-wait">${ui.me === v.med ? 'Tahmincileri izle… ipucunu sen verdin, sessiz kal! 🤐' : 'Kadran canlı dönüyor, izle…'}</p>`;
  }
  if (v.phase === 'side') {
    if (role === 'side') return `<div class="dlg-row"><p class="dlg-hint c">Gerçek hedef ibrenin hangi tarafında? Bilirseniz +1 (tam isabette geçersiz).</p>
      <div class="dlg-sides"><button type="button" class="btn btn-vowel dlg-side" data-s="L">◀ SOLDA</button><button type="button" class="btn btn-vowel dlg-side" data-s="R">SAĞDA ▶</button></div></div>`;
    return `<p class="dlg-wait">Rakip takım sol mu sağ mı diye düşünüyor…</p>`;
  }
  if (v.phase === 'reveal' && v.last) return `<div class="dlg-next"><span class="dlg-nbar" style="--d:${v.revealMs}ms"></span>Sonraki kart hazırlanıyor…</div>`;
  return '';
}

function ptsText(L, v) {
  const main = L.pts === 4 ? '🎯 TAM İSABET!' : L.pts ? `+${L.pts} PUAN` : 'ISKA!';
  let sub = v.mode === 'team' ? `${TEAM_NAMES[L.team]} takım` : 'Ortak skor';
  if (v.mode === 'team' && L.side) sub += L.sideOk ? (L.bonus ? ` · ${TEAM_NAMES[1 - L.team]} yönü bildi +1` : ` · ${TEAM_NAMES[1 - L.team]} yönü bildi (bonus yok)`) : ` · ${TEAM_NAMES[1 - L.team]} yönü bilemedi`;
  return `<b class="p${L.pts}">${main}</b><small>${esc(sub)}</small>`;
}

function render(v) {
  const prev = V; V = v;
  if (!root) return;
  const newTurnSeen = v.turnNo !== lastTurn; lastTurn = v.turnNo;
  root.querySelector('.dlg-top').innerHTML = topHtml(v);
  root.querySelector('.dlg-status').innerHTML = statusHtml(v);
  root.querySelector('.dlg-l').textContent = v.l;
  root.querySelector('.dlg-r').textContent = v.r;
  const clue = root.querySelector('.dlg-clue');
  clue.innerHTML = v.clue ? `<span class="dlg-ql">İPUCU</span><span class="dlg-qt">“${esc(v.clue)}”</span><span class="dlg-qm">— ${esc(v.pl[v.med].name)}</span>` : `<span class="dlg-ql">İPUCU</span><span class="dlg-qt dim">${v.phase === 'clue' ? '…' : ''}</span>`;
  // kontrol alanı (aynı aşama/rolde yazılan ipucunu silmemek için yalnızca değişince yeniden çiz)
  const ck = [v.phase, myRole(v), v.needPeek, v.turnNo, v.last ? 1 : 0].join('|');
  const ctl = root.querySelector('.dlg-ctl');
  if (ctl.dataset.k !== ck) { ctl.dataset.k = ck; ctl.innerHTML = controlsHtml(v); const inp = ctl.querySelector('.dlg-in'); if (inp && !CFX.isPhone()) setTimeout(() => inp.focus(), 50); }
  // gizli bakış ekranı (aynı cihaz)
  const peek = root.querySelector('.dlg-peek');
  peek.hidden = !v.needPeek;
  if (v.needPeek) peek.innerHTML = `<div class="dlg-pk"><div class="dlg-pk-i">🙈</div><b>SADECE MEDYUM BAKSIN</b><p>${nm(v, v.med)}, cihazı al. Diğerleri ekrana bakmasın!</p><button type="button" class="btn btn-spin dlg-peekbtn">👁 ${esc(v.pl[v.med].name)}, hedefi göster</button></div>`;
  root.querySelector('.dlg-radio').classList.toggle('peeking', v.needPeek);
  // kadran
  drawTarget(v); drawProps(v);
  const box = root.querySelector('.dlg-dialbox');
  box.classList.toggle('can', canDrag());
  box.classList.toggle('locked', v.phase === 'side' || v.phase === 'reveal' || v.phase === 'done');
  box.classList.toggle('idle', v.phase === 'clue');
  if (!dragging) {
    let p = v.phase === 'clue' ? 50 : v.dial;
    if (pendDial && Date.now() < pendDial.until && v.phase === 'guess' && Math.abs(p - pendDial.p) > .05) p = pendDial.p; else pendDial = null;
    setNeedle(p, false);
  }
  // perde
  if (v.phase === 'reveal' && v.last) {
    if (revealKey !== v.turnNo) startReveal(v);
  } else {
    root.querySelector('.dlg-pts').classList.remove('show');
    setShutter(v.tgt != null);
  }
  if (v.phase === 'done' && v.last) { setShutter(true); showPts(v); }
  if (newTurnSeen && prev && v.phase === 'clue') root.querySelector('.dlg-pts').classList.remove('show');
}
function showPts(v) {
  const el = root.querySelector('.dlg-pts');
  el.style.setProperty('--px', v.last.tgt < 50 ? '76%' : '24%');   // hedefin karşı tarafında dursun
  el.innerHTML = ptsText(v.last, v); el.classList.add('show');
}
function drum(ms) {
  if (!Sound.ok || !Sound.ok('dlgDrum', 200)) return;
  const n = Math.floor(ms / 55);
  for (let i = 0; i < n; i++) Sound.noise(.06, { filter: 'bandpass', freq: 180 + i * 4, q: 1.2, gain: .18 + .32 * i / n, when: i * .055, decayPow: 2 });
  Sound.noise(.5, { filter: 'lowpass', freq: 1200, gain: .5, when: n * .055, decayPow: 1.4 });
}
function startReveal(v) {
  revealKey = v.turnNo;
  const age = ui.hostNow() - (v.revealAt || 0);
  const fast = age > 3500 || lowAnim();
  const wasOpen = shutterOpen;
  const tDrum = fast ? 0 : (wasOpen ? 500 : 1500);
  if (!fast && !wasOpen) { setShutter(false); drum(tDrum); }
  later(tDrum, () => {
    if (!root || !V || V.turnNo !== v.turnNo) return;
    setShutter(true); if (!fast && !wasOpen) Sound.whoosh();
    later(fast ? 0 : 950, () => {
      if (!root || !V || V.turnNo !== v.turnNo || !V.last) return;
      revealShown = v.turnNo; showPts(V); root.querySelector('.dlg-top').innerHTML = topHtml(V);
      root.querySelector('.dlg-status').innerHTML = statusHtml(V);
      const L = V.last;
      if (fast) return;
      if (L.pts === 4) { Sound.solve(); FX.confetti(110); flash('good'); }
      else if (L.pts >= 2) { Sound.good(); if (L.pts === 3) FX.confetti(40); }
      else { Sound.bad(); flash('bad'); }
      const box = root.querySelector('.dlg-dialbox');
      if (box && L.pts && FX.burst) { const r = box.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height * .55, L.pts * 10); }
    });
  });
}

function posFromEvent(e) {
  const svg = root.querySelector('.dlg-svg'), r = svg.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * 400, y = (e.clientY - r.top) / r.height * 214;
  let th = Math.atan2(CY - y, x - CX);
  if (y > CY) th = x < CX ? Math.PI : 0;
  if (th < 0) th = x < CX ? Math.PI : 0;
  return clampPos((1 - th / Math.PI) * 100);
}
function sendFast(force) {
  if (ui.mode !== 'online' || !V) return;
  const now = Date.now();
  const go = () => { lastFastAt = Date.now(); fastT = null; ui.fast({ k: 'dl', p: needle, tn: V ? V.turnNo : 0 }); };
  if (force || now - lastFastAt >= 110) { clearTimeout(fastT); go(); }
  else if (!fastT) fastT = setTimeout(go, 110 - (now - lastFastAt));
}
function commitDial() {
  pendDial = { p: needle, until: Date.now() + 1500 };
  ui.send({ t: 'dial', p: needle });
}
function onFast(m) {
  if (!V || !root || !m || m.k !== 'dl' || m.tn !== V.turnNo || V.phase !== 'guess' || dragging) return;
  if (m.seat === ui.me && ui.me >= 0) return;
  pendDial = null;
  setNeedle(m.p, false);
  root.querySelector('.dlg-dialbox').classList.add('live');
  clearTimeout(onFast.t); onFast.t = setTimeout(() => { if (root) root.querySelector('.dlg-dialbox').classList.remove('live'); }, 600);
}

function mount(r, api) {
  root = r; ui = api; V = null; timers = []; needle = 50; dragging = false; pendDial = null; revealKey = -1; revealShown = -1; shutterOpen = false; lastTurn = -1;
  root.innerHTML = `<div class="g-wrap dlg">
    <div class="dlg-top"></div>
    <div class="g-status dlg-status"></div>
    <div class="dlg-radio">
      <div class="dlg-card"><span class="dlg-end dlg-l"></span><span class="dlg-arrow">⟷</span><span class="dlg-end dlg-r"></span></div>
      <div class="dlg-dialbox" role="slider" tabindex="0" aria-label="Kadran" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">${svgDial()}<div class="dlg-pts" aria-live="polite"></div></div>
      <div class="dlg-clue"></div>
      <div class="dlg-ctl"></div>
      <div class="dlg-peek" hidden></div>
    </div>
  </div>`;
  const box = root.querySelector('.dlg-dialbox');
  box.addEventListener('pointerdown', e => {
    if (!canDrag()) return;
    e.preventDefault(); Sound.init();
    dragging = true; box.classList.add('drag');
    try { box.setPointerCapture(e.pointerId); } catch { /* */ }
    setNeedle(posFromEvent(e), true); Sound.tick(.3); sendFast();
  });
  let lastTickP = 50;
  box.addEventListener('pointermove', e => {
    if (!dragging) return;
    setNeedle(posFromEvent(e), true); sendFast();
    if (Math.abs(needle - lastTickP) >= 2.5) { lastTickP = needle; Sound.tick(.2); }
  });
  const end = () => { if (!dragging) return; dragging = false; box.classList.remove('drag'); sendFast(true); commitDial(); };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end); box.addEventListener('lostpointercapture', end);
  box.addEventListener('keydown', e => {
    if (!canDrag()) return;
    const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0; if (!d) return;
    e.preventDefault(); setNeedle(needle + d * (e.shiftKey ? 5 : 1), false); sendFast(); clearTimeout(box._kt); box._kt = setTimeout(commitDial, 350);
  });
  root.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('.dlg-peekbtn')) { Sound.init(); Sound.special(); ui.send({ t: 'peek' }); return; }
    if (t.closest('.dlg-lock')) { if (!canDrag()) return; Sound.init(); ui.send({ t: 'lock', p: needle }); return; }
    const sd = t.closest('.dlg-side'); if (sd) { Sound.init(); ui.send({ t: 'side', s: sd.dataset.s }); return; }
    if (t.closest('.dlg-sug') && V && V.tgt != null) {
      const inp = root.querySelector('.dlg-in'); if (!inp) return;
      const sp = SPECS[V.spec], list = sp.items.slice().sort((a, b) => Math.abs(a.p - V.tgt) - Math.abs(b.p - V.tgt));
      const cur = list.findIndex(x => x.t === inp.value);
      inp.value = list[(cur + 1) % Math.min(3, list.length)].t; inp.focus(); Sound.tick(.4);
    }
  });
  root.addEventListener('submit', e => {
    e.preventDefault();
    const inp = root.querySelector('.dlg-in'), err = root.querySelector('.dlg-err'); if (!inp) return;
    const c = cleanClue(inp.value);
    if (!clueOk(c)) { err.hidden = false; err.textContent = c ? 'İpucu harf içermeli; sadece sayı olmaz.' : 'Önce bir ipucu yaz.'; Sound.bad(); return; }
    Sound.init(); ui.send({ t: 'clue', text: c }); inp.blur();
  });
}
function unmount() { timers.forEach(clearTimeout); timers = []; clearTimeout(fastT); root = null; ui = null; V = null; }
function onEvent(e) {
  if (!V) return;
  if (e.t === 'clue') { Sound.special(); }
  else if (e.t === 'lock') Sound.stop();
  else if (e.t === 'side') Sound.tick(.6);
  else if (e.t === 'prop') Sound.tick(.3);
  else if (e.t === 'turn') { Sound.whoosh(); }
  else if (e.t === 'catchup') { banner('TELAFİ TURU!', 'pink'); Sound.special(); }
}

CFX.registerGame({
  id: 'dalgaboyu', name: 'Dalga Boyu', icon: '📻', color: '#ff8a00', min: 2, max: 8, hotseat: true, bot: true, localMin: 1,
  tagline: 'Medyumun ipucuyla gizli frekansı bul',
  rules: 'Her turda bir Medyum, iki zıt uç arasındaki gizli hedefi görür ve tek bir ipucu verir. Tahminciler kadranın ibresini çevirip kilitler: hedefin tam ortası 4, yakını 3, kenarı 2 puan. Takım modunda (en az 4 kişi) rakip takım "sol mu sağ mı?" diyerek 1 bonus puan kapabilir; Ortak modda herkes birlikte en yüksek skoru hedefler.',
  options: [
    { key: 'mode', label: 'Mod', def: 'takim', choices: [{ v: 'takim', label: 'Takım' }, { v: 'ortak', label: 'Ortak' }] },
    { key: 'goal', label: 'Hedef puan (Takım)', def: '10', choices: [{ v: '6', label: '6' }, { v: '10', label: '10' }, { v: '15', label: '15' }] },
    { key: 'cards', label: 'Kart sayısı (Ortak)', def: '8', choices: [{ v: '5', label: '5' }, { v: '8', label: '8' }, { v: '10', label: '10' }, { v: '13', label: '13' }] },
    { key: 'catchup', label: 'Telafi kuralı', def: '1', choices: [{ v: '1', label: 'Açık' }, { v: '0', label: 'Kapalı' }] }
  ],
  setup(players, opts, ctx) {
    const n = players.length;
    const mode = opts.mode === 'ortak' || n < 4 ? 'coop' : 'team';
    const teams = mode === 'team' ? [players.map((_, i) => i).filter(i => i % 2 === 0), players.map((_, i) => i).filter(i => i % 2 === 1)] : [players.map((_, i) => i)];
    const st = {
      pl: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })), on: players.map(() => true),
      humans: players.filter(p => !p.isBot).length,
      mode, teams, tsc: [0, 0], total: 0, goal: [6, 10, 15].includes(+opts.goal) ? +opts.goal : 10,
      cards: [5, 8, 10, 13].includes(+opts.cards) ? +opts.cards : 8, catchup: opts.catchup !== '0',
      act: Math.random() < .5 ? 0 : 1, medIdx: [0, 0], med: 0, spec: 0, tgt: 50, clue: '', dial: 50, phase: 'clue', side: null, props: {},
      peek: false, deck: CFX.shuffle(SPECS.map((_, i) => i)), dp: 0, turnNo: 0, cardNo: 0, tk: 0, revealAt: 0, last: null, hist: [], used: [],
      medPts: players.map(() => 0), botGoal: null, botSteps: 0
    };
    if (mode === 'coop') st.act = 0;
    if (opts.mode !== 'ortak' && n < 4) ctx.emit({ t: 'info' }, 'Takım modu için en az 4 oyuncu gerekir; Ortak modda oynanıyor.', 'gold');
    newTurn(st, ctx, true);
    return st;
  },
  action, view,
  turnOf(st) {
    if (st.phase === 'clue') return st.med;
    if (st.phase === 'guess') return captainOf(st, guessersOf(st));
    if (st.phase === 'side') return captainOf(st, oppOf(st));
    return null;
  },
  botDelay: 950,
  botAct(st, pi, ctx) {
    if (st.phase === 'clue' && pi === st.med) return action(st, pi, { t: 'clue', text: botClue(st) }, ctx);
    if (st.phase === 'guess' && guessersOf(st).includes(pi)) {
      if (st.botOwn == null) st.botOwn = estimate(st.spec, st.clue);
      const others = Object.keys(st.props).filter(k => +k !== pi).map(k => st.props[k]);
      st.botGoal = clampPos(others.length ? (st.botOwn * 2 + others.reduce((a, b) => a + b, 0)) / (2 + others.length) : st.botOwn);
      st.botSteps++;
      const d = st.botGoal - st.dial;
      if ((Math.abs(d) < .6 && st.botSteps >= 2) || st.botSteps > 6) return action(st, pi, { t: 'lock', p: st.botGoal }, ctx);
      return action(st, pi, { t: 'dial', p: st.dial + Math.max(-28, Math.min(28, d)) }, ctx);
    }
    if (st.phase === 'side' && oppOf(st).includes(pi)) {
      const est = estimate(st.spec, st.clue, 1.4);
      const s = Math.abs(est - st.dial) < 1 ? (Math.random() < .5 ? 'L' : 'R') : (est < st.dial ? 'L' : 'R');
      return action(st, pi, { t: 'side', s }, ctx);
    }
  },
  skipTurn(st, pi, ctx) {
    if (st.phase === 'clue' && pi === st.med) {
      ctx.emit({ t: 'skip' }, `${st.pl[pi].name} ipucu veremedi; Medyumluk sıradakine geçti.`, 'bad');
      if (st.mode === 'coop') st.cardNo = Math.max(0, st.cardNo - 1);   // kart harcanmasın
      newTurn(st, ctx, true);                                           // aynı takım, sıradaki medyum
    } else if (st.phase === 'guess') lockDial(st, ctx, pi);
    else if (st.phase === 'side') action(st, pi, { t: 'side', s: st.dial >= 50 ? 'L' : 'R' }, ctx);
  },
  onPresence(st, pi, online, ctx) { st.on[pi] = online; ctx.sync(); },
  resume(st, ctx) { if (st.phase === 'done') return; st.tk++; arm(st, ctx); },
  mount, render, onEvent, onFast, unmount,
  _test: { SPECS, RAW, bandPts, estimate, botClue, suggestFor, cleanClue, clueOk, view, action, captainOf, guessersOf, oppOf, B4, B3, B2 }
});
})();
