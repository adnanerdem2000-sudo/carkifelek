/* =========================================================================
   OYUN SALONU — BİLGİ YARIŞMASI
   Herkes aynı anda cevaplar: 4 şıktan doğruyu ilk bulan en çok puanı alır.
   1–6 kişi online (herkes kendi telefonundan) ya da tek cihazda tek kişi.
   Soru bankası bu dosyanın başında: [kategori, zorluk(1-3), soru, doğru, yanlış1, yanlış2, yanlış3]
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial, shuffle, store } = CFX;

const CATS = {
  gk: ['Genel Kültür', '💡'], ta: ['Tarih', '🏛️'], co: ['Coğrafya', '🌍'], bi: ['Bilim', '🔬'],
  sp: ['Spor', '⚽'], si: ['Sinema & Dizi', '🎬'], mu: ['Müzik', '🎵'], ed: ['Edebiyat', '📚'],
  tr: ['Türkiye', '🌷'], te: ['Teknoloji', '💻'], do: ['Doğa & Hayvanlar', '🦊'], ye: ['Yemek & Kültür', '🍲']
};

/* ---------- soru bankası ---------- */
const BANK = [
// GENEL KÜLTÜR
['gk', 1, "Gökkuşağında geleneksel olarak kaç renk sayılır?", "7", "5", "6", "8"],
['gk', 1, "Bir düzine kaç adettir?", "12", "10", "20", "6"],
['gk', 1, "Satrançta oyunun başında her oyuncunun kaç piyonu vardır?", "8", "6", "10", "16"],
['gk', 1, "Satranç tahtasında toplam kaç kare bulunur?", "64", "48", "81", "100"],
['gk', 1, "“Mona Lisa” tablosunun ressamı kimdir?", "Leonardo da Vinci", "Michelangelo", "Rafael", "Rembrandt"],
['gk', 2, "“Mona Lisa” tablosu hangi müzede sergilenmektedir?", "Louvre Müzesi", "Prado Müzesi", "British Museum", "Uffizi Galerisi"],
['gk', 1, "Olimpiyat bayrağında kaç halka bulunur?", "5", "4", "6", "7"],
['gk', 2, "Roma rakamlarıyla yazılan “L” hangi sayıyı gösterir?", "50", "100", "500", "10"],
['gk', 2, "Roma rakamlarıyla yazılan “XC” kaçtır?", "90", "110", "40", "60"],
['gk', 2, "Altın evlilik yıl dönümü kaçıncı yılda kutlanır?", "50", "25", "40", "60"],
['gk', 1, "Mors alfabesiyle gönderilen en bilinen imdat çağrısı hangisidir?", "SOS", "SIS", "OSO", "SOT"],
['gk', 2, "UNESCO'nun genel merkezi hangi şehirdedir?", "Paris", "Cenevre", "New York", "Roma"],
['gk', 1, "Birleşmiş Milletler'in genel merkezi hangi şehirdedir?", "New York", "Cenevre", "Paris", "Viyana"],
['gk', 2, "NATO'nun genel merkezi hangi şehirdedir?", "Brüksel", "Paris", "Londra", "Washington"],
['gk', 2, "Nobel ödüllerine adını veren Alfred Nobel hangi ülkenin vatandaşıydı?", "İsveç", "Norveç", "Danimarka", "Finlandiya"],
['gk', 3, "Nobel Barış Ödülü hangi şehirde verilir?", "Oslo", "Stockholm", "Cenevre", "Kopenhag"],
['gk', 2, "Bir haftada kaç saat vardır?", "168", "144", "172", "160"],
['gk', 1, "Artık yıllarda şubat ayı kaç gün çeker?", "29", "28", "30", "31"],
['gk', 2, "Anadili olarak en çok kişinin konuştuğu dil hangisidir?", "Çince (Mandarin)", "İngilizce", "İspanyolca", "Hintçe"],
['gk', 1, "Japonya'nın para birimi nedir?", "Yen", "Yuan", "Won", "Rupi"],
['gk', 1, "Birleşik Krallık'ın para birimi nedir?", "Sterlin", "Euro", "Dolar", "Frank"],
['gk', 2, "Güney Kore'nin para birimi nedir?", "Won", "Yen", "Yuan", "Baht"],
['gk', 2, "İsviçre'nin para birimi nedir?", "İsviçre frangı", "Euro", "Kron", "Mark"],
['gk', 2, "Hindistan'ın para birimi nedir?", "Rupi", "Taka", "Dinar", "Riyal"],
['gk', 2, "Antik Dünyanın Yedi Harikası'ndan günümüze ulaşan tek yapı hangisidir?", "Gize'deki Büyük Piramit", "İskenderiye Feneri", "Babil'in Asma Bahçeleri", "Rodos Heykeli"],
['gk', 2, "Tavlada her oyuncu kaç pulla oynar?", "15", "12", "16", "10"],
['gk', 3, "Okey oyununda toplam kaç taş bulunur?", "106", "104", "108", "100"],
['gk', 1, "Mavi ile sarı boya karıştırılınca hangi renk elde edilir?", "Yeşil", "Mor", "Turuncu", "Pembe"],
['gk', 1, "Braille alfabesi kimlerin okuyup yazması için geliştirilmiştir?", "Görme engelliler", "İşitme engelliler", "Denizciler", "Askerler"],
['gk', 1, "Batı astrolojisinde kaç burç vardır?", "12", "10", "13", "9"],
['gk', 2, "“Düşünen Adam” heykeli hangi sanatçının eseridir?", "Auguste Rodin", "Michelangelo", "Donatello", "Bernini"],
['gk', 1, "“Yıldızlı Gece” tablosu hangi ressama aittir?", "Vincent van Gogh", "Claude Monet", "Pablo Picasso", "Salvador Dalí"],
['gk', 2, "“Guernica” tablosunun ressamı kimdir?", "Pablo Picasso", "Salvador Dalí", "Francisco Goya", "Joan Miró"],
['gk', 2, "“Son Akşam Yemeği” freskini kim yapmıştır?", "Leonardo da Vinci", "Michelangelo", "Caravaggio", "Botticelli"],
['gk', 2, "Sistina Şapeli'nin ünlü tavan fresklerini kim yapmıştır?", "Michelangelo", "Rafael", "Leonardo da Vinci", "Tiziano"],
['gk', 2, "Eriyen saatleriyle tanınan “Belleğin Azmi” tablosu kime aittir?", "Salvador Dalí", "René Magritte", "Pablo Picasso", "Wassily Kandinsky"],
['gk', 2, "“Çığlık” tablosunun ressamı kimdir?", "Edvard Munch", "Gustav Klimt", "Vincent van Gogh", "Henri Matisse"],
['gk', 2, "New York'taki Özgürlük Heykeli ABD'ye hangi ülke tarafından hediye edilmiştir?", "Fransa", "Birleşik Krallık", "İspanya", "İtalya"],
['gk', 2, "Esperanto nedir?", "Yapay olarak oluşturulmuş bir dil", "Bir Latin dansı", "Bir mimari üslup", "Bir telli çalgı"],
['gk', 1, "Çeyrek saat kaç dakikadır?", "15", "25", "20", "10"],
['gk', 1, "Bir yıl yaklaşık kaç haftadır?", "52", "48", "56", "60"],
// TARİH
['ta', 1, "İstanbul'un fethi hangi yılda gerçekleşmiştir?", "1453", "1071", "1299", "1517"],
['ta', 1, "Malazgirt Savaşı hangi yılda yapılmıştır?", "1071", "1176", "1453", "1243"],
['ta', 2, "Malazgirt Savaşı'nda Selçuklu ordusunun komutanı kimdi?", "Alparslan", "Tuğrul Bey", "Melikşah", "I. Kılıçarslan"],
['ta', 1, "Osmanlı Devleti'nin kurucusu kimdir?", "Osman Bey", "Orhan Bey", "Ertuğrul Gazi", "I. Murat"],
['ta', 1, "Osmanlı Devleti'nin kuruluş yılı olarak genellikle hangi yıl kabul edilir?", "1299", "1071", "1453", "1326"],
['ta', 1, "İstanbul'u fetheden Osmanlı padişahı kimdir?", "II. Mehmet (Fatih)", "Yavuz Sultan Selim", "Kanuni Sultan Süleyman", "II. Bayezid"],
['ta', 2, "Mısır Seferi'yle halifeliği Osmanlı'ya geçiren padişah kimdir?", "Yavuz Sultan Selim", "Kanuni Sultan Süleyman", "Fatih Sultan Mehmet", "II. Murat"],
['ta', 2, "Tahtta en uzun süre kalan Osmanlı padişahı kimdir?", "Kanuni Sultan Süleyman", "II. Abdülhamid", "Fatih Sultan Mehmet", "IV. Mehmet"],
['ta', 3, "Mohaç Meydan Muharebesi hangi yılda yapılmıştır?", "1526", "1453", "1538", "1683"],
['ta', 2, "Preveze Deniz Savaşı'nda Osmanlı donanmasını kim komuta etmiştir?", "Barbaros Hayreddin Paşa", "Piri Reis", "Turgut Reis", "Oruç Reis"],
['ta', 2, "İstanbul'un fethinden önce Osmanlı Devleti'nin başkenti hangi şehirdi?", "Edirne", "Bursa", "İznik", "Söğüt"],
['ta', 2, "Osmanlı Devleti'nin son padişahı kimdir?", "VI. Mehmet Vahdettin", "V. Mehmet Reşat", "II. Abdülhamid", "Abdülaziz"],
['ta', 1, "Mustafa Kemal Kurtuluş Savaşı'nı başlatmak için Samsun'a hangi tarihte çıkmıştır?", "19 Mayıs 1919", "23 Nisan 1920", "30 Ağustos 1922", "29 Ekim 1923"],
['ta', 1, "Türkiye Büyük Millet Meclisi hangi tarihte açılmıştır?", "23 Nisan 1920", "19 Mayıs 1919", "29 Ekim 1923", "3 Mart 1924"],
['ta', 1, "Cumhuriyet hangi tarihte ilan edilmiştir?", "29 Ekim 1923", "23 Nisan 1920", "30 Ağustos 1922", "24 Temmuz 1923"],
['ta', 2, "Lozan Barış Antlaşması hangi yıl imzalanmıştır?", "1923", "1920", "1922", "1919"],
['ta', 2, "Sevr Antlaşması hangi yıl imzalanmıştır?", "1920", "1918", "1923", "1914"],
['ta', 2, "Mondros Ateşkes Antlaşması hangi yıl imzalanmıştır?", "1918", "1919", "1920", "1914"],
['ta', 2, "Başkomutan Meydan Muharebesi hangi tarihte kazanılmıştır?", "30 Ağustos 1922", "9 Eylül 1922", "26 Ağustos 1921", "23 Ağustos 1921"],
['ta', 3, "Sakarya Meydan Muharebesi'nin ardından TBMM Mustafa Kemal'e hangi rütbe ve unvanı vermiştir?", "Mareşal rütbesi ve Gazi unvanı", "Orgeneral rütbesi ve Paşa unvanı", "Başkomutanlık ve Atatürk soyadı", "Tümgeneral rütbesi ve Gazi unvanı"],
['ta', 2, "“Atatürk” soyadı Mustafa Kemal'e hangi yıl verilmiştir?", "1934", "1923", "1928", "1938"],
['ta', 2, "Latin harflerine dayanan yeni Türk alfabesi hangi yıl kabul edilmiştir?", "1928", "1923", "1934", "1926"],
['ta', 2, "Türk kadınlarına milletvekili seçme ve seçilme hakkı hangi yıl tanınmıştır?", "1934", "1930", "1923", "1946"],
['ta', 3, "Halifelik hangi yıl kaldırılmıştır?", "1924", "1922", "1923", "1925"],
['ta', 2, "18 Mart Çanakkale Deniz Zaferi hangi yıl kazanılmıştır?", "1915", "1914", "1916", "1918"],
['ta', 1, "Birinci Dünya Savaşı hangi yıl başlamıştır?", "1914", "1912", "1918", "1939"],
['ta', 1, "İkinci Dünya Savaşı hangi yıl sona ermiştir?", "1945", "1944", "1946", "1939"],
['ta', 2, "Berlin Duvarı hangi yıl yıkılmıştır?", "1989", "1991", "1985", "1961"],
['ta', 2, "Sovyetler Birliği hangi yıl dağılmıştır?", "1991", "1989", "1993", "1985"],
['ta', 2, "Fransız İhtilali hangi yıl başlamıştır?", "1789", "1776", "1815", "1848"],
['ta', 2, "ABD Bağımsızlık Bildirgesi hangi yıl ilan edilmiştir?", "1776", "1789", "1812", "1492"],
['ta', 1, "Kristof Kolomb Amerika kıtasına ilk kez hangi yıl ulaşmıştır?", "1492", "1453", "1517", "1607"],
['ta', 1, "Ay'a ayak basan ilk insan kimdir?", "Neil Armstrong", "Buzz Aldrin", "Yuri Gagarin", "Michael Collins"],
['ta', 2, "Apollo 11 ile insanlar Ay'a ilk kez hangi yıl inmiştir?", "1969", "1965", "1972", "1961"],
['ta', 2, "Çivi yazısını geliştiren Mezopotamya uygarlığı hangisidir?", "Sümerler", "Hititler", "Lidyalılar", "Frigler"],
['ta', 2, "Bilinen ilk yazılı barış antlaşması kabul edilen Kadeş Antlaşması hangi iki devlet arasında imzalanmıştır?", "Hititler ve Mısırlılar", "Sümerler ve Akadlar", "Lidyalılar ve Persler", "Urartular ve Asurlular"],
['ta', 2, "Parayı ilk kez kullandığı kabul edilen Anadolu uygarlığı hangisidir?", "Lidyalılar", "Frigler", "Urartular", "İyonlar"],
['ta', 2, "Orhun (Göktürk) Yazıtları bugün hangi ülkenin sınırları içindedir?", "Moğolistan", "Kazakistan", "Çin", "Kırgızistan"],
['ta', 2, "Büyük Selçuklu Devleti'nin kurucusu olarak kabul edilen hükümdar kimdir?", "Tuğrul Bey", "Alparslan", "Melikşah", "Sultan Sencer"],
['ta', 3, "Anadolu Selçuklu Devleti'nin kurucusu kimdir?", "Kutalmışoğlu Süleyman Şah", "Alparslan", "I. Kılıçarslan", "Melikşah"],
['ta', 3, "Miryokefalon Savaşı hangi yılda yapılmıştır?", "1176", "1071", "1243", "1204"],
['ta', 3, "Anadolu Selçuklu Devleti 1243 Kösedağ Savaşı'nı kime karşı kaybetmiştir?", "Moğollar", "Bizans", "Haçlılar", "Memlükler"],
['ta', 2, "1402 Ankara Savaşı hangi iki hükümdar arasında yapılmıştır?", "Yıldırım Bayezid ve Timur", "Fatih ve Uzun Hasan", "Yavuz Selim ve Şah İsmail", "Kanuni ve Şah Tahmasb"],
['ta', 2, "1514 Çaldıran Savaşı'nda Osmanlı Devleti hangi devlete karşı savaşmıştır?", "Safeviler", "Memlükler", "Akkoyunlular", "Timurlular"],
['ta', 3, "Otlukbeli Savaşı'nda Fatih Sultan Mehmet kimi yenmiştir?", "Akkoyunlu hükümdarı Uzun Hasan", "Timur", "Şah İsmail", "Karamanoğlu İbrahim Bey"],
['ta', 3, "Lale Devri hangi padişahın döneminde yaşanmıştır?", "III. Ahmet", "IV. Murat", "II. Mahmut", "I. Abdülhamid"],
['ta', 2, "Yeniçeri Ocağı'nı kaldıran padişah kimdir?", "II. Mahmut", "III. Selim", "Abdülmecid", "I. Abdülhamid"],
['ta', 3, "Tanzimat Fermanı hangi padişah döneminde ilan edilmiştir?", "Abdülmecid", "II. Mahmut", "Abdülaziz", "II. Abdülhamid"],
['ta', 3, "Osmanlı Devleti'nde I. Meşrutiyet hangi yıl ilan edilmiştir?", "1876", "1839", "1908", "1856"],
['ta', 3, "Batı Roma İmparatorluğu hangi yıl yıkılmıştır?", "476", "395", "330", "1453"],
['ta', 2, "Magna Carta hangi ülkede imzalanmıştır?", "İngiltere", "Fransa", "İspanya", "Almanya"],
['ta', 3, "Gize'deki Büyük Piramit hangi firavun adına yaptırılmıştır?", "Keops (Hufu)", "Tutankamon", "II. Ramses", "Akhenaton"],
['ta', 2, "Napolyon son büyük yenilgisini hangi savaşta almıştır?", "Waterloo", "Austerlitz", "Trafalgar", "Jena"],
['ta', 2, "Asya Hun Devleti'nde orduyu onlu sisteme göre düzenlediği kabul edilen hükümdar kimdir?", "Mete Han", "Attila", "Bumin Kağan", "Bilge Kağan"],
['ta', 2, "“Tanrı'nın Kırbacı” lakabıyla anılan Avrupa Hun hükümdarı kimdir?", "Attila", "Mete Han", "Bilge Kağan", "Balamir"],
['ta', 3, "Göktürk Devleti'nin kurucusu kimdir?", "Bumin Kağan", "Bilge Kağan", "Kutluk Kağan", "Tonyukuk"],
['ta', 1, "Mustafa Kemal Atatürk hangi şehirde doğmuştur?", "Selanik", "Manastır", "İstanbul", "Üsküp"],
['ta', 3, "Atatürk “Nutuk”u hangi yıl okumuştur?", "1927", "1923", "1930", "1925"],
['ta', 2, "Amerika kıtasını da gösteren 1513 tarihli ünlü dünya haritasını çizen Osmanlı denizcisi kimdir?", "Piri Reis", "Barbaros Hayreddin", "Seydi Ali Reis", "Turgut Reis"],
['ta', 2, "Osmanlı'da Türkçe eser basan ilk matbaayı kuran kişi kimdir?", "İbrahim Müteferrika", "Katip Çelebi", "Evliya Çelebi", "Şinasi"],
['ta', 1, "Avrupa'da hareketli harflerle baskı yapan matbaayı geliştiren kimdir?", "Johannes Gutenberg", "Leonardo da Vinci", "Galileo Galilei", "Martin Luther"],
// COĞRAFYA
['co', 1, "Dünyanın en büyük okyanusu hangisidir?", "Pasifik (Büyük) Okyanusu", "Atlas Okyanusu", "Hint Okyanusu", "Arktik Okyanusu"],
['co', 1, "Dünyanın en yüksek dağı hangisidir?", "Everest", "K2", "Kilimanjaro", "Mont Blanc"],
['co', 1, "Yüzölçümü bakımından dünyanın en büyük ülkesi hangisidir?", "Rusya", "Kanada", "Çin", "ABD"],
['co', 1, "Yüzölçümü bakımından en büyük kıta hangisidir?", "Asya", "Afrika", "Kuzey Amerika", "Avrupa"],
['co', 2, "Dünyanın en büyük sıcak çölü hangisidir?", "Sahra Çölü", "Gobi Çölü", "Kalahari Çölü", "Atacama Çölü"],
['co', 2, "Taşıdığı su miktarı (debisi) en yüksek nehir hangisidir?", "Amazon", "Nil", "Mississippi", "Yangtze"],
['co', 2, "Avustralya'nın başkenti neresidir?", "Kanberra", "Sidney", "Melbourne", "Perth"],
['co', 2, "Kanada'nın başkenti neresidir?", "Ottawa", "Toronto", "Vancouver", "Montreal"],
['co', 2, "Brezilya'nın başkenti neresidir?", "Brasília", "Rio de Janeiro", "São Paulo", "Salvador"],
['co', 1, "Japonya'nın başkenti neresidir?", "Tokyo", "Kyoto", "Osaka", "Hiroşima"],
['co', 1, "Mısır'ın başkenti neresidir?", "Kahire", "İskenderiye", "Luksor", "Asvan"],
['co', 3, "İsviçre'nin federal başkenti neresidir?", "Bern", "Cenevre", "Zürih", "Basel"],
['co', 3, "Yeni Zelanda'nın başkenti neresidir?", "Wellington", "Auckland", "Christchurch", "Queenstown"],
['co', 3, "Fas'ın başkenti neresidir?", "Rabat", "Kazablanka", "Marakeş", "Fes"],
['co', 1, "Azerbaycan'ın başkenti neresidir?", "Bakü", "Gence", "Tiflis", "Erivan"],
['co', 2, "Macaristan'ın başkenti neresidir?", "Budapeşte", "Prag", "Viyana", "Bükreş"],
['co', 2, "Arjantin'in başkenti neresidir?", "Buenos Aires", "Santiago", "Montevideo", "Lima"],
['co', 2, "İzlanda'nın başkenti neresidir?", "Reykjavik", "Oslo", "Helsinki", "Nuuk"],
['co', 2, "Kenya'nın başkenti neresidir?", "Nairobi", "Mombasa", "Addis Ababa", "Kampala"],
['co', 1, "Aşağıdaki ülkelerden hangisinin hem Avrupa'da hem Asya'da toprağı vardır?", "Türkiye", "Yunanistan", "İran", "Mısır"],
['co', 2, "Süveyş Kanalı hangi iki denizi birbirine bağlar?", "Akdeniz ve Kızıldeniz", "Akdeniz ve Karadeniz", "Kızıldeniz ve Arap Denizi", "Ege ve Marmara"],
['co', 2, "Panama Kanalı hangi iki okyanusu birbirine bağlar?", "Atlas ve Pasifik", "Atlas ve Hint", "Pasifik ve Hint", "Arktik ve Atlas"],
['co', 2, "Akdeniz'i Atlas Okyanusu'na bağlayan boğaz hangisidir?", "Cebelitarık Boğazı", "Hürmüz Boğazı", "Babülmendep Boğazı", "Macellan Boğazı"],
['co', 3, "Hürmüz Boğazı hangi körfezin girişindedir?", "Basra Körfezi", "Aden Körfezi", "Bengal Körfezi", "Meksika Körfezi"],
['co', 2, "Kıta sayılmayan en büyük ada hangisidir?", "Grönland", "Madagaskar", "Borneo", "Yeni Gine"],
['co', 2, "Kilimanjaro Dağı hangi ülkededir?", "Tanzanya", "Kenya", "Etiyopya", "Uganda"],
['co', 3, "Dünyanın en derin gölü hangisidir?", "Baykal Gölü", "Tanganika Gölü", "Victoria Gölü", "Van Gölü"],
['co', 3, "Yüzölçümü bakımından dünyanın en büyük gölü kabul edilen su kütlesi hangisidir?", "Hazar Denizi", "Superior Gölü", "Victoria Gölü", "Baykal Gölü"],
['co', 1, "Adını Ekvator çizgisinden alan Güney Amerika ülkesi hangisidir?", "Ekvador", "Kolombiya", "Peru", "Venezuela"],
['co', 1, "Bayrağında akçaağaç yaprağı bulunan ülke hangisidir?", "Kanada", "İsviçre", "Avusturya", "Yeni Zelanda"],
['co', 1, "Kanalları ve gondollarıyla ünlü Venedik hangi ülkededir?", "İtalya", "Yunanistan", "Hırvatistan", "Fransa"],
['co', 2, "Karadaki en uzun dağ sırası hangisidir?", "And Dağları", "Himalayalar", "Alp Dağları", "Kayalık Dağlar"],
['co', 2, "Aşağıdakilerden hangisi İskandinav ülkelerinden biri değildir?", "Hollanda", "Norveç", "İsveç", "Danimarka"],
['co', 3, "Aşağıdakilerden hangisi “Baltık ülkeleri” olarak anılan üç ülkeden biri değildir?", "Finlandiya", "Estonya", "Letonya", "Litvanya"],
['co', 2, "Tuna Nehri hangi denize dökülür?", "Karadeniz", "Akdeniz", "Baltık Denizi", "Adriyatik Denizi"],
['co', 1, "Yüzölçümü bakımından dünyanın en küçük ülkesi hangisidir?", "Vatikan", "Monako", "San Marino", "Lihtenştayn"],
['co', 3, "Topraklarının tamamı İtalya tarafından çevrelenen iki ülkeden biri olan, Vatikan dışındaki ülke hangisidir?", "San Marino", "Monako", "Andorra", "Malta"],
['co', 1, "Kalıcı yerleşik nüfusu olmayan kıta hangisidir?", "Antarktika", "Avustralya", "Afrika", "Güney Amerika"],
['co', 3, "Dünyanın en yüksek şelalesi hangisidir?", "Angel Şelalesi", "Niagara Şelalesi", "Victoria Şelalesi", "İguazu Şelalesi"],
['co', 1, "Niagara Şelalesi hangi iki ülkenin sınırındadır?", "ABD ve Kanada", "ABD ve Meksika", "Brezilya ve Arjantin", "Kanada ve Grönland"],
['co', 2, "Aşağıdaki ada ülkelerinden hangisi Hint Okyanusu'ndadır?", "Maldivler", "Küba", "Fiji", "İzlanda"],
['co', 2, "Başlangıç meridyeni (0° boylamı) Londra'daki hangi yerden geçer?", "Greenwich", "Westminster", "Wimbledon", "Camden"],
['co', 2, "Gobi Çölü hangi iki ülkenin topraklarındadır?", "Moğolistan ve Çin", "Hindistan ve Pakistan", "İran ve Afganistan", "Kazakistan ve Rusya"],
['co', 3, "Karalar üzerindeki en alçak nokta nerededir?", "Lut Gölü (Ölü Deniz) kıyısı", "Hazar Denizi kıyısı", "Ölüm Vadisi", "Sahra Çölü'nün ortası"],
['co', 2, "Machu Picchu antik kenti hangi ülkededir?", "Peru", "Meksika", "Bolivya", "Şili"],
['co', 2, "Kayaya oyulmuş antik kent Petra hangi ülkededir?", "Ürdün", "Mısır", "Suriye", "Lübnan"],
['co', 1, "Taç Mahal hangi ülkededir?", "Hindistan", "Pakistan", "İran", "Bangladeş"],
['co', 1, "Kolezyum hangi şehirdedir?", "Roma", "Atina", "Napoli", "Milano"],
['co', 1, "“Güneşin doğduğu ülke” olarak anılan ülke hangisidir?", "Japonya", "Çin", "Kore", "Tayland"],
['co', 1, "And Dağları hangi kıtadadır?", "Güney Amerika", "Asya", "Afrika", "Kuzey Amerika"],
// BİLİM
['bi', 1, "Suyun kimyasal formülü nedir?", "H₂O", "CO₂", "O₂", "H₂O₂"],
['bi', 1, "Deniz seviyesinde saf su kaç santigrat derecede kaynar?", "100 °C", "90 °C", "80 °C", "120 °C"],
['bi', 2, "Işığın boşluktaki hızı yaklaşık ne kadardır?", "300.000 km/sn", "30.000 km/sn", "3.000.000 km/sn", "150.000 km/sn"],
['bi', 2, "Ses havada yaklaşık hangi hızla yayılır?", "340 m/sn", "34 m/sn", "3.400 m/sn", "300.000 km/sn"],
['bi', 2, "Altının kimyasal sembolü nedir?", "Au", "Ag", "Al", "Gd"],
['bi', 2, "Gümüşün kimyasal sembolü nedir?", "Ag", "Au", "Gm", "Si"],
['bi', 2, "Demirin kimyasal sembolü nedir?", "Fe", "De", "Ir", "Dm"],
['bi', 3, "Sodyumun kimyasal sembolü nedir?", "Na", "So", "Sd", "S"],
['bi', 1, "Periyodik tablonun ilk elementi hangisidir?", "Hidrojen", "Helyum", "Lityum", "Oksijen"],
['bi', 2, "Atmosferde en çok bulunan gaz hangisidir?", "Azot", "Oksijen", "Karbondioksit", "Argon"],
['bi', 1, "Bitkilerin güneş ışığını kullanarak besin üretmesine ne denir?", "Fotosentez", "Solunum", "Fermantasyon", "Osmoz"],
['bi', 1, "Güneş Sistemi'nin en büyük gezegeni hangisidir?", "Jüpiter", "Satürn", "Neptün", "Uranüs"],
['bi', 1, "Güneş'e en yakın gezegen hangisidir?", "Merkür", "Venüs", "Mars", "Dünya"],
['bi', 1, "“Kızıl Gezegen” olarak bilinen gezegen hangisidir?", "Mars", "Venüs", "Jüpiter", "Merkür"],
['bi', 1, "Belirgin halkalarıyla en çok tanınan gezegen hangisidir?", "Satürn", "Mars", "Venüs", "Merkür"],
['bi', 3, "Yüzey sıcaklığı en yüksek olan gezegen hangisidir?", "Venüs", "Merkür", "Mars", "Jüpiter"],
['bi', 3, "Mars'ın iki uydusunun adı nedir?", "Fobos ve Deimos", "Titan ve Rhea", "İo ve Europa", "Triton ve Nereid"],
['bi', 2, "Yetişkin bir insanın iskeletinde yaklaşık kaç kemik bulunur?", "206", "186", "212", "230"],
['bi', 1, "İnsan kalbi kaç odacıktan oluşur?", "4", "2", "3", "6"],
['bi', 2, "Alyuvarlarda oksijen taşıyan protein hangisidir?", "Hemoglobin", "İnsülin", "Keratin", "Kolajen"],
['bi', 2, "Kanın pıhtılaşmasında görev alan kan hücreleri hangileridir?", "Trombositler", "Alyuvarlar", "Akyuvarlar", "Nöronlar"],
['bi', 2, "İnsülin hormonu hangi organdan salgılanır?", "Pankreas", "Karaciğer", "Böbrek", "Tiroit bezi"],
['bi', 2, "Vücuttaki en büyük organ hangisidir?", "Deri", "Karaciğer", "Akciğer", "Beyin"],
['bi', 2, "İnsan hücrelerinde normalde kaç çift kromozom bulunur?", "23", "22", "24", "46"],
['bi', 2, "DNA'nın açık adı nedir?", "Deoksiribonükleik asit", "Diribonükleik asit", "Dioksinükleik asit", "Deoksiaminoasit"],
['bi', 2, "“Genel verici” olarak bilinen kan grubu hangisidir?", "0 Rh(-)", "AB Rh(+)", "A Rh(+)", "B Rh(-)"],
['bi', 1, "Evrensel çekim yasasını ortaya koyan bilim insanı kimdir?", "Isaac Newton", "Galileo Galilei", "Albert Einstein", "Johannes Kepler"],
['bi', 1, "Görelilik kuramını geliştiren bilim insanı kimdir?", "Albert Einstein", "Isaac Newton", "Niels Bohr", "Stephen Hawking"],
['bi', 2, "Penisilini keşfeden bilim insanı kimdir?", "Alexander Fleming", "Louis Pasteur", "Robert Koch", "Marie Curie"],
['bi', 3, "Nobel Ödülü'nü hem fizik hem kimya dalında kazanan bilim insanı kimdir?", "Marie Curie", "Albert Einstein", "Niels Bohr", "Ernest Rutherford"],
['bi', 2, "Elektrik akımının birimi nedir?", "Amper", "Volt", "Ohm", "Watt"],
['bi', 2, "Elektriksel direncin birimi nedir?", "Ohm", "Amper", "Joule", "Tesla"],
['bi', 2, "Kuvvetin SI birimi nedir?", "Newton", "Joule", "Pascal", "Watt"],
['bi', 1, "Ses aşağıdaki ortamlardan hangisinde yayılamaz?", "Boşluk (vakum)", "Su", "Hava", "Demir"],
['bi', 2, "Mutlak sıfır yaklaşık kaç santigrat derecedir?", "-273,15 °C", "-100 °C", "-459,67 °C", "0 °C"],
['bi', 1, "Pi sayısının ilk üç basamağı nedir?", "3,14", "3,41", "3,12", "3,16"],
['bi', 1, "Bir üçgenin iç açılarının toplamı kaç derecedir?", "180", "360", "90", "270"],
['bi', 2, "Aşağıdakilerden hangisi asal sayıdır?", "29", "21", "27", "33"],
['bi', 2, "Elmas hangi elementten oluşur?", "Karbon", "Silisyum", "Kalsiyum", "Kükürt"],
['bi', 1, "Demirin paslanması hangi kimyasal olaydır?", "Oksitlenme", "Buharlaşma", "Erime", "Süblimleşme"],
['bi', 2, "Katı bir maddenin sıvılaşmadan doğrudan gaza dönüşmesine ne denir?", "Süblimleşme", "Yoğuşma", "Buharlaşma", "Donma"],
['bi', 2, "pH değeri 7 olan bir çözelti nasıl nitelendirilir?", "Nötr", "Asidik", "Bazik", "Tuzlu"],
['bi', 2, "Gökyüzünün mavi görünmesinin temel nedeni nedir?", "Güneş ışığının atmosferde saçılması", "Okyanusların gökyüzüne yansıması", "Ozon tabakasının renginin mavi olması", "Bulutlardaki su buharının rengi"],
['bi', 2, "“Işık yılı” neyin birimidir?", "Uzaklık", "Zaman", "Hız", "Parlaklık"],
['bi', 2, "Güneş'ten çıkan ışık Dünya'ya yaklaşık ne kadar sürede ulaşır?", "8 dakika", "8 saniye", "1 saat", "1 gün"],
['bi', 2, "Atom çekirdeğinde bulunan yüksüz parçacık hangisidir?", "Nötron", "Proton", "Elektron", "Foton"],
['bi', 2, "Oda sıcaklığında sıvı halde bulunan metal hangisidir?", "Cıva", "Kurşun", "Bakır", "Çinko"],
['bi', 3, "C vitamini eksikliğinin yol açtığı hastalık hangisidir?", "İskorbüt (skorbüt)", "Raşitizm", "Beriberi", "Pellagra"],
['bi', 2, "Bitki hücrelerinde fotosentezin gerçekleştiği organel hangisidir?", "Kloroplast", "Mitokondri", "Ribozom", "Golgi cisimciği"],
['bi', 2, "Hücrenin “enerji santrali” olarak bilinen organel hangisidir?", "Mitokondri", "Kloroplast", "Lizozom", "Çekirdekçik"],
['bi', 1, "Sağlıklı bir insanın normal vücut sıcaklığı yaklaşık kaç derecedir?", "37 °C", "35 °C", "39 °C", "40 °C"],
['bi', 2, "“Türlerin Kökeni” kitabının yazarı kimdir?", "Charles Darwin", "Gregor Mendel", "Jean-Baptiste Lamarck", "Louis Pasteur"],
['bi', 2, "Kalıtımın temel yasalarını bezelyelerle yaptığı deneylerle ortaya koyan bilim insanı kimdir?", "Gregor Mendel", "Charles Darwin", "Louis Pasteur", "James Watson"],
['bi', 1, "Yerkürenin en dış katmanı hangisidir?", "Yer kabuğu", "Manto", "Dış çekirdek", "İç çekirdek"],
['bi', 2, "Depremlerin büyüklüğünü ifade etmek için geleneksel olarak kullanılan ölçek hangisidir?", "Richter ölçeği", "Beaufort ölçeği", "Mohs ölçeği", "Kelvin ölçeği"],
['bi', 3, "Minerallerin sertliğini karşılaştırmak için kullanılan ölçek hangisidir?", "Mohs ölçeği", "Richter ölçeği", "Beaufort ölçeği", "Fahrenheit ölçeği"],
// SPOR
['sp', 1, "Bir futbol takımı sahada kaç oyuncuyla yer alır?", "11", "10", "12", "9"],
['sp', 1, "Basketbolda bir takım sahada kaç oyuncuyla yer alır?", "5", "6", "7", "4"],
['sp', 1, "Voleybolda bir takım sahada kaç oyuncuyla yer alır?", "6", "5", "7", "8"],
['sp', 2, "Hentbolda bir takım sahada kaleci dahil kaç oyuncuyla yer alır?", "7", "6", "8", "11"],
['sp', 1, "Basketbolda başarılı bir serbest atış kaç sayı değerindedir?", "1", "2", "3", "0,5"],
['sp', 1, "Futbolda normal maç süresi kaç dakikadır?", "90", "80", "100", "60"],
['sp', 1, "Futbolda hakem bir oyuncuyu oyundan atarken hangi renk kart gösterir?", "Kırmızı", "Sarı", "Mavi", "Yeşil"],
['sp', 2, "Teniste sıfır puan hangi terimle ifade edilir?", "Love", "Deuce", "Ace", "Let"],
['sp', 2, "Teniste rakibin dokunamadığı başarılı servise ne denir?", "As", "Let", "Deuce", "Break"],
['sp', 2, "Wimbledon tenis turnuvası hangi zeminde oynanır?", "Çim", "Toprak", "Sert kort", "Halı"],
['sp', 2, "Roland Garros (Fransa Açık) tenis turnuvası hangi zeminde oynanır?", "Toprak", "Çim", "Sert kort", "Halı"],
['sp', 2, "Maraton koşusunun resmi mesafesi ne kadardır?", "42,195 km", "40 km", "21,097 km", "50 km"],
['sp', 2, "Maraton koşusu adını hangi ülkedeki bir yerden alır?", "Yunanistan", "İtalya", "Mısır", "Türkiye"],
['sp', 2, "İlk modern Olimpiyat Oyunları 1896'da hangi şehirde düzenlenmiştir?", "Atina", "Paris", "Londra", "Roma"],
['sp', 1, "Yaz Olimpiyat Oyunları kaç yılda bir düzenlenir?", "4", "2", "3", "5"],
['sp', 2, "İlk FIFA Dünya Kupası hangi yıl düzenlenmiştir?", "1930", "1924", "1950", "1934"],
['sp', 2, "İlk FIFA Dünya Kupası'na hangi ülke ev sahipliği yapmıştır?", "Uruguay", "Brezilya", "İtalya", "Fransa"],
['sp', 1, "Türkiye A Milli Futbol Takımı Dünya Kupası'nda hangi yıl üçüncü olmuştur?", "2002", "1954", "2006", "1998"],
['sp', 2, "Türkiye 2008 Avrupa Futbol Şampiyonası'nda hangi tura kadar yükselmiştir?", "Yarı final", "Çeyrek final", "Final", "Son 16"],
['sp', 2, "Galatasaray UEFA Kupası'nı hangi yıl kazanmıştır?", "2000", "1999", "2002", "1996"],
['sp', 3, "Galatasaray 2000 UEFA Kupası finalinde hangi takımı yenmiştir?", "Arsenal", "Leeds United", "Real Madrid", "Parma"],
['sp', 2, "2005 UEFA Şampiyonlar Ligi finalini İstanbul'da kazanan takım hangisidir?", "Liverpool", "Milan", "Barcelona", "Chelsea"],
['sp', 3, "Golfte bir deliği parın bir vuruş altında tamamlamaya ne denir?", "Birdie", "Eagle", "Bogey", "Albatros"],
['sp', 2, "Bowlingde ilk atışta bütün lobutları devirmeye ne denir?", "Strike", "Spare", "Split", "Gutter"],
['sp', 1, "Sumo güreşi hangi ülkenin geleneksel sporudur?", "Japonya", "Çin", "Kore", "Moğolistan"],
['sp', 1, "Tarihi Kırkpınar Yağlı Güreşleri hangi ilde yapılır?", "Edirne", "Kırklareli", "Tekirdağ", "Bursa"],
['sp', 2, "Taekwondo hangi ülke kökenli bir dövüş sporudur?", "Güney Kore", "Japonya", "Çin", "Tayland"],
['sp', 2, "Judo hangi ülke kökenli bir dövüş sporudur?", "Japonya", "Güney Kore", "Çin", "Brezilya"],
['sp', 1, "Formula 1'de yarışın bittiğini gösteren bayrak hangisidir?", "Damalı bayrak", "Sarı bayrak", "Kırmızı bayrak", "Mavi bayrak"],
['sp', 2, "Michael Schumacher kariyerinde kaç kez Formula 1 Dünya Şampiyonu olmuştur?", "7", "5", "6", "4"],
['sp', 1, "Muhammed Ali hangi sporla ünlüdür?", "Boks", "Güreş", "Atletizm", "Basketbol"],
['sp', 1, "Usain Bolt hangi ülkenin sporcusudur?", "Jamaika", "ABD", "Kenya", "Trinidad ve Tobago"],
['sp', 1, "Naim Süleymanoğlu hangi spor dalında olimpiyat şampiyonu olmuştur?", "Halter", "Güreş", "Boks", "Judo"],
['sp', 2, "Naim Süleymanoğlu hangi lakapla anılır?", "Cep Herkülü", "Altın Bilek", "Kara Şimşek", "Demir Yumruk"],
['sp', 2, "Olimpiyat şampiyonu Hamza Yerlikaya hangi spor dalında yarışmıştır?", "Güreş", "Halter", "Judo", "Boks"],
['sp', 3, "NBA'de 2008 yılında “En Çok Gelişme Gösteren Oyuncu” ödülünü alan Türk basketbolcu kimdir?", "Hidayet Türkoğlu", "Mehmet Okur", "Ersan İlyasova", "Cedi Osman"],
['sp', 3, "Mehmet Okur 2004 yılında hangi takımla NBA şampiyonu olmuştur?", "Detroit Pistons", "Utah Jazz", "Chicago Bulls", "Los Angeles Lakers"],
['sp', 3, "Basketbolda potanın çemberi yerden kaç metre yüksekliktedir?", "3,05 m", "2,75 m", "3,50 m", "2,90 m"],
['sp', 3, "Futbol kalesinin genişliği kaç metredir?", "7,32 m", "6,50 m", "8,00 m", "7,00 m"],
['sp', 2, "Voleybolda (beşinci set hariç) bir seti kazanmak için kaç sayıya ulaşmak gerekir?", "25", "21", "15", "30"],
['sp', 2, "Masa tenisinde bir set kaç sayıda biter?", "11", "21", "15", "25"],
['sp', 2, "Kriket hangi ülkede doğmuştur?", "İngiltere", "Hindistan", "Avustralya", "Güney Afrika"],
['sp', 1, "Tour de France hangi spor dalında düzenlenen bir yarıştır?", "Bisiklet", "Atletizm", "Otomobil", "Yelken"],
['sp', 1, "Super Bowl hangi sporun final maçıdır?", "Amerikan futbolu", "Beyzbol", "Basketbol", "Buz hokeyi"],
['sp', 1, "Pelé hangi ülkenin futbolcusudur?", "Brezilya", "Arjantin", "Uruguay", "Portekiz"],
['sp', 2, "Maradona'nın 1986 Dünya Kupası'nda İngiltere'ye eliyle attığı tartışmalı gol hangi adla anılır?", "Tanrı'nın Eli", "Altın Gol", "Gümüş Gol", "Uçan Kafa"],
['sp', 1, "Ballon d'Or (Altın Top) ödülü hangi spor dalında verilir?", "Futbol", "Basketbol", "Tenis", "Voleybol"],
// SİNEMA & DİZİ
['si', 1, "“Titanik” (1997) filminin yönetmeni kimdir?", "James Cameron", "Steven Spielberg", "Ridley Scott", "Christopher Nolan"],
['si', 2, "“Jurassic Park” (1993) filminin yönetmeni kimdir?", "Steven Spielberg", "James Cameron", "George Lucas", "Peter Jackson"],
['si', 2, "“Yüzüklerin Efendisi” film üçlemesinin yönetmeni kimdir?", "Peter Jackson", "Steven Spielberg", "George Lucas", "Guillermo del Toro"],
['si', 2, "“Baba” (The Godfather) filminin yönetmeni kimdir?", "Francis Ford Coppola", "Martin Scorsese", "Brian De Palma", "Sergio Leone"],
['si', 2, "1972 yapımı ilk “Baba” filminde Vito Corleone'yi kim canlandırmıştır?", "Marlon Brando", "Al Pacino", "Robert De Niro", "James Caan"],
['si', 1, "“Star Wars” serisini yaratan kişi kimdir?", "George Lucas", "Steven Spielberg", "James Cameron", "Stanley Kubrick"],
['si', 1, "Harry Potter filmlerinde Harry Potter'ı kim canlandırmıştır?", "Daniel Radcliffe", "Rupert Grint", "Tom Felton", "Elijah Wood"],
['si', 1, "Harry Potter'ın okuduğu büyücülük okulunun adı nedir?", "Hogwarts", "Durmstrang", "Beauxbatons", "Narnia"],
['si', 1, "“Yüzüklerin Efendisi”nde Tek Yüzük'ü yok etmek için Hüküm Dağı'na götüren hobbit kimdir?", "Frodo Baggins", "Pippin Took", "Merry Brandybuck", "Gandalf"],
['si', 1, "“Matrix” filminde Neo'yu canlandıran oyuncu kimdir?", "Keanu Reeves", "Tom Cruise", "Brad Pitt", "Johnny Depp"],
['si', 2, "“Forrest Gump” rolüyle En İyi Erkek Oyuncu Oscar'ını kazanan oyuncu kimdir?", "Tom Hanks", "Robin Williams", "Kevin Costner", "Jim Carrey"],
['si', 2, "“Kuzuların Sessizliği”nde Hannibal Lecter'ı canlandıran oyuncu kimdir?", "Anthony Hopkins", "Jack Nicholson", "Gary Oldman", "Ralph Fiennes"],
['si', 2, "Cannes Film Festivali'nin en büyük ödülü hangisidir?", "Altın Palmiye", "Altın Ayı", "Altın Aslan", "Altın Küre"],
['si', 3, "Venedik Film Festivali'nin en büyük ödülü hangisidir?", "Altın Aslan", "Altın Palmiye", "Altın Ayı", "Altın Lale"],
['si', 2, "Antalya'da düzenlenen köklü film festivalinin ödülü hangisidir?", "Altın Portakal", "Altın Koza", "Altın Lale", "Altın Kelebek"],
['si', 2, "Nuri Bilge Ceylan'a Cannes'da Altın Palmiye kazandıran film hangisidir?", "Kış Uykusu", "Uzak", "Bir Zamanlar Anadolu'da", "Ahlat Ağacı"],
['si', 3, "1982'de Cannes'da Altın Palmiye kazanan, senaryosu Yılmaz Güney'e ait film hangisidir?", "Yol", "Sürü", "Umut", "Duvar"],
['si', 1, "“Hababam Sınıfı” filmlerinde Mahmut Hoca'yı canlandıran usta oyuncu kimdir?", "Münir Özkul", "Şener Şen", "Kemal Sunal", "Halit Akçatepe"],
['si', 1, "“Hababam Sınıfı”nda İnek Şaban karakterini kim canlandırmıştır?", "Kemal Sunal", "Halit Akçatepe", "Tarık Akan", "Şener Şen"],
['si', 2, "“Eşkıya” (1996) filminde Baran karakterini canlandıran oyuncu kimdir?", "Şener Şen", "Uğur Yücel", "Tarık Akan", "Kadir İnanır"],
['si', 2, "“Eşkıya” filminin yönetmeni kimdir?", "Yavuz Turgul", "Ertem Eğilmez", "Zeki Ökten", "Atıf Yılmaz"],
['si', 3, "“Selvi Boylum Al Yazmalım” (1977) filminin yönetmeni kimdir?", "Atıf Yılmaz", "Yavuz Turgul", "Halit Refiğ", "Lütfi Akad"],
['si', 3, "“Selvi Boylum Al Yazmalım” filmi hangi yazarın eserinden uyarlanmıştır?", "Cengiz Aytmatov", "Yaşar Kemal", "Orhan Kemal", "Sabahattin Ali"],
['si', 2, "“Babam ve Oğlum” (2005) filminin yönetmeni kimdir?", "Çağan Irmak", "Cem Yılmaz", "Yılmaz Erdoğan", "Ferzan Özpetek"],
['si', 2, "“Vizontele” filminin senaryosunu yazan ve filmde rol alan isim kimdir?", "Yılmaz Erdoğan", "Cem Yılmaz", "Şahan Gökbakar", "Ata Demirer"],
['si', 1, "“G.O.R.A.” filminin senaristi ve başrol oyuncusu kimdir?", "Cem Yılmaz", "Yılmaz Erdoğan", "Şahan Gökbakar", "Tolga Çevik"],
['si', 2, "Türk sinemasının simgesi olan ve adını İstanbul'daki bir sokaktan alan kavram hangisidir?", "Yeşilçam", "Beyoğlu", "Cihangir", "Pera"],
['si', 2, "Türk sinemasında “Sultan” lakabıyla anılan oyuncu kimdir?", "Türkan Şoray", "Hülya Koçyiğit", "Fatma Girik", "Filiz Akın"],
['si', 1, "Disney'in “Aslan Kral” filmindeki genç aslanın adı nedir?", "Simba", "Mufasa", "Nala", "Scar"],
['si', 1, "“Oyuncak Hikâyesi” (Toy Story) filmindeki kovboy oyuncağın adı nedir?", "Woody", "Buzz", "Rex", "Slinky"],
['si', 2, "Tamamen bilgisayar animasyonuyla yapılan ilk uzun metrajlı sinema filmi hangisidir?", "Oyuncak Hikâyesi (Toy Story)", "Shrek", "Kayıp Balık Nemo", "Karlar Ülkesi"],
['si', 3, "Walt Disney'in ilk uzun metrajlı animasyon filmi hangisidir?", "Pamuk Prenses ve Yedi Cüceler", "Pinokyo", "Bambi", "Külkedisi"],
['si', 2, "Türkiye'de “Şarlo” olarak tanınan, sessiz sinemanın efsane oyuncusu kimdir?", "Charlie Chaplin", "Buster Keaton", "Harold Lloyd", "Stan Laurel"],
['si', 2, "Sinematografı icat ederek sinemanın doğuşunu sağlayan kardeşler kimdir?", "Lumière Kardeşler", "Wright Kardeşler", "Grimm Kardeşler", "Warner Kardeşler"],
['si', 2, "“Sapık” (Psycho, 1960) filminin yönetmeni kimdir?", "Alfred Hitchcock", "Stanley Kubrick", "Orson Welles", "Billy Wilder"],
['si', 2, "“2001: Bir Uzay Destanı” filminin yönetmeni kimdir?", "Stanley Kubrick", "Alfred Hitchcock", "Steven Spielberg", "Andrey Tarkovski"],
['si', 2, "“Ucuz Roman” (Pulp Fiction) filminin yönetmeni kimdir?", "Quentin Tarantino", "Guy Ritchie", "Robert Rodriguez", "David Lynch"],
['si', 2, "“Başlangıç” (Inception) filminin yönetmeni kimdir?", "Christopher Nolan", "Denis Villeneuve", "Ridley Scott", "David Fincher"],
['si', 2, "“Breaking Bad” dizisinde kimya öğretmeni olan ana karakterin adı nedir?", "Walter White", "Jesse Pinkman", "Saul Goodman", "Hank Schrader"],
['si', 1, "“Friends” dizisi hangi şehirde geçer?", "New York", "Los Angeles", "Chicago", "Boston"],
['si', 1, "“Muhteşem Yüzyıl” dizisi hangi padişahın dönemini anlatır?", "Kanuni Sultan Süleyman", "Fatih Sultan Mehmet", "Yavuz Sultan Selim", "IV. Murat"],
['si', 2, "“Behzat Ç.” dizisi hangi şehirde geçer?", "Ankara", "İstanbul", "İzmir", "Bursa"],
['si', 2, "“Ezel” dizisinde Ezel karakterini canlandıran oyuncu kimdir?", "Kenan İmirzalıoğlu", "Kıvanç Tatlıtuğ", "Halit Ergenç", "Engin Akyürek"],
['si', 2, "“Kurtlar Vadisi” dizisinde Polat Alemdar'ı canlandıran oyuncu kimdir?", "Necati Şaşmaz", "Kenan İmirzalıoğlu", "Mehmet Aslantuğ", "Haluk Bilginer"],
['si', 2, "Oscar'da En İyi Film ödülünü kazanan ilk İngilizce olmayan film “Parazit” hangi ülkenin yapımıdır?", "Güney Kore", "Japonya", "Çin", "Tayvan"],
// MÜZİK
['mu', 2, "İstiklal Marşı'nın bugün çalınan resmi bestesi kime aittir?", "Osman Zeki Üngör", "Mehmet Akif Ersoy", "Buhurizade Itri", "Hamamizade İsmail Dede Efendi"],
['mu', 3, "Aşağıdakilerden hangisi “Türk Beşleri” olarak anılan bestecilerden biri değildir?", "Fazıl Say", "Ahmet Adnan Saygun", "Cemal Reşit Rey", "Ulvi Cemal Erkin"],
['mu', 3, "“Yunus Emre Oratoryosu”nun bestecisi kimdir?", "Ahmet Adnan Saygun", "Cemal Reşit Rey", "Necil Kazım Akses", "Hasan Ferit Alnar"],
['mu', 2, "Mevlevi müziğinde önemli yeri olan, kamıştan yapılan üflemeli çalgı hangisidir?", "Ney", "Zurna", "Mey", "Tulum"],
['mu', 2, "Kucakta yatay tutulan, telleri parmaklara takılan mızraplarla çalınan, yamuk biçimli Türk müziği çalgısı hangisidir?", "Kanun", "Ud", "Tanbur", "Kemençe"],
['mu', 1, "Karadeniz yöresiyle özdeşleşen yaylı çalgı hangisidir?", "Kemençe", "Bağlama", "Zurna", "Darbuka"],
['mu', 1, "Halk arasında davulla birlikte anılan, düğünlerin vazgeçilmezi nefesli çalgı hangisidir?", "Zurna", "Ney", "Flüt", "Kaval"],
['mu', 2, "“Ay Işığı Sonatı”nın bestecisi kimdir?", "Ludwig van Beethoven", "Wolfgang Amadeus Mozart", "Frédéric Chopin", "Johann Sebastian Bach"],
['mu', 2, "“Rondo alla Turca” olarak bilinen ünlü piyano parçası hangi besteciye aittir?", "Wolfgang Amadeus Mozart", "Joseph Haydn", "Franz Schubert", "Antonio Vivaldi"],
['mu', 1, "“Dört Mevsim” konçertolarının bestecisi kimdir?", "Antonio Vivaldi", "Johann Sebastian Bach", "Georg Friedrich Händel", "Wolfgang Amadeus Mozart"],
['mu', 2, "İşitme yetisini büyük ölçüde kaybettikten sonra da beste yapmayı sürdüren ünlü besteci kimdir?", "Ludwig van Beethoven", "Wolfgang Amadeus Mozart", "Frédéric Chopin", "Franz Liszt"],
['mu', 2, "“Kuğu Gölü” balesinin bestecisi kimdir?", "Pyotr İlyiç Çaykovski", "İgor Stravinski", "Sergey Rahmaninov", "Sergey Prokofyev"],
['mu', 1, "Bir orkestrayı yöneten kişiye ne denir?", "Şef", "Solist", "Konsertmayster", "Korist"],
['mu', 2, "Notaların üzerine yazıldığı beş paralel çizgiye ne ad verilir?", "Porte", "Anahtar", "Ölçü", "Akor"],
['mu', 1, "Batı müziğindeki temel nota adları (do, re, mi…) kaç tanedir?", "7", "8", "5", "12"],
['mu', 3, "Standart bir piyanoda kaç tuş bulunur?", "88", "76", "92", "64"],
['mu', 1, "Standart bir klasik gitarda kaç tel bulunur?", "6", "4", "5", "8"],
['mu', 2, "Kemanda kaç tel bulunur?", "4", "5", "6", "3"],
['mu', 2, "The Beatles grubu hangi şehirden çıkmıştır?", "Liverpool", "Londra", "Manchester", "Birmingham"],
['mu', 1, "Freddie Mercury hangi grubun solistiydi?", "Queen", "The Rolling Stones", "Led Zeppelin", "Pink Floyd"],
['mu', 1, "“Pop'un Kralı” olarak anılan sanatçı kimdir?", "Michael Jackson", "Elvis Presley", "Prince", "Freddie Mercury"],
['mu', 1, "“Rock and Roll'un Kralı” olarak anılan sanatçı kimdir?", "Elvis Presley", "Michael Jackson", "Chuck Berry", "Mick Jagger"],
['mu', 1, "Bob Marley hangi müzik türüyle özdeşleşmiştir?", "Reggae", "Caz", "Blues", "Country"],
['mu', 1, "Türk pop müziğinde “Megastar” lakabıyla anılan sanatçı kimdir?", "Tarkan", "Mustafa Sandal", "Hakan Peker", "Kenan Doğulu"],
['mu', 1, "Sezen Aksu hangi lakapla anılır?", "Minik Serçe", "Diva", "Sultan", "Kraliçe"],
['mu', 1, "Barış Manço'nun TRT'de yıllarca sunduğu ünlü program hangisidir?", "7'den 77'ye", "Bizim Sokak", "Susam Sokağı", "Pazar Keyfi"],
['mu', 2, "“Gülpembe” şarkısı hangi sanatçıya aittir?", "Barış Manço", "Cem Karaca", "Erkin Koray", "Fikret Kızılok"],
['mu', 2, "“Resimdeki Gözyaşları” şarkısıyla özdeşleşen sanatçı kimdir?", "Cem Karaca", "Barış Manço", "Erkin Koray", "Edip Akbayram"],
['mu', 1, "Türk sanat müziğinde “Sanat Güneşi” olarak anılan sanatçı kimdir?", "Zeki Müren", "Müzeyyen Senar", "Bülent Ersoy", "Emel Sayın"],
['mu', 1, "“Uzun ince bir yoldayım” dizeleriyle tanınan halk ozanı kimdir?", "Âşık Veysel", "Neşet Ertaş", "Pir Sultan Abdal", "Karacaoğlan"],
['mu', 2, "“Bozkırın Tezenesi” olarak anılan halk müziği sanatçısı kimdir?", "Neşet Ertaş", "Âşık Veysel", "Âşık Mahsuni Şerif", "Arif Sağ"],
['mu', 2, "Eurovision Şarkı Yarışması'nda Türkiye'ye birinciliği getiren sanatçı kimdir?", "Sertab Erener", "Şebnem Paker", "Hadise", "Athena"],
['mu', 3, "“Güzel Mavi Tuna” valsinin bestecisi kimdir?", "Johann Strauss (oğul)", "Johannes Brahms", "Gustav Mahler", "Franz Liszt"],
['mu', 3, "“Carmen” operasının bestecisi kimdir?", "Georges Bizet", "Giuseppe Verdi", "Giacomo Puccini", "Gioachino Rossini"],
['mu', 3, "“Bolero”nun bestecisi kimdir?", "Maurice Ravel", "Claude Debussy", "Erik Satie", "Georges Bizet"],
['mu', 2, "Tango dansı ve müziği en çok hangi ülkeyle özdeşleşmiştir?", "Arjantin", "İspanya", "Brezilya", "Küba"],
['mu', 1, "Flamenko hangi ülkenin geleneksel müzik ve dans türüdür?", "İspanya", "Meksika", "Portekiz", "İtalya"],
['mu', 2, "Mozart'ın doğduğu Salzburg şehri bugün hangi ülkededir?", "Avusturya", "Almanya", "İtalya", "Macaristan"],
['mu', 1, "Fazıl Say hangi çalgının virtüözü olarak tanınır?", "Piyano", "Keman", "Viyolonsel", "Gitar"],
['mu', 1, "Bir şarkıda bölümler arasında tekrar eden kısma ne denir?", "Nakarat", "Kıta", "Uvertür", "Arya"],
['mu', 2, "Kadeh biçimli gövdesiyle tanınan, elle çalınan vurmalı çalgı hangisidir?", "Darbuka", "Bendir", "Zil", "Kös"],
['mu', 1, "Âşık Veysel'in çaldığı ve Türk halk müziğinin temel çalgısı olan enstrüman hangisidir?", "Bağlama", "Ud", "Ney", "Kanun"],
// EDEBİYAT
['ed', 1, "“Sefiller” romanının yazarı kimdir?", "Victor Hugo", "Honoré de Balzac", "Alexandre Dumas", "Émile Zola"],
['ed', 1, "“Suç ve Ceza” romanının yazarı kimdir?", "Fyodor Dostoyevski", "Lev Tolstoy", "Anton Çehov", "Nikolay Gogol"],
['ed', 1, "“Savaş ve Barış” romanının yazarı kimdir?", "Lev Tolstoy", "Fyodor Dostoyevski", "İvan Turgenyev", "Aleksandr Puşkin"],
['ed', 2, "“Don Kişot” romanının yazarı kimdir?", "Miguel de Cervantes", "Lope de Vega", "Dante Alighieri", "Giovanni Boccaccio"],
['ed', 2, "Don Kişot'un sadık yaverinin adı nedir?", "Sancho Panza", "Rocinante", "Dulcinea", "Lazarillo"],
['ed', 2, "“İlahi Komedya”nın yazarı kimdir?", "Dante Alighieri", "Francesco Petrarca", "Giovanni Boccaccio", "Niccolò Machiavelli"],
['ed', 1, "“Hamlet” oyununun yazarı kimdir?", "William Shakespeare", "Christopher Marlowe", "Charles Dickens", "John Milton"],
['ed', 2, "“Romeo ve Juliet” hangi İtalyan şehrinde geçer?", "Verona", "Venedik", "Floransa", "Roma"],
['ed', 1, "“Simyacı” romanının yazarı kimdir?", "Paulo Coelho", "Gabriel García Márquez", "Jorge Amado", "Isabel Allende"],
['ed', 2, "“Yüzyıllık Yalnızlık” romanının yazarı kimdir?", "Gabriel García Márquez", "Jorge Luis Borges", "Paulo Coelho", "Mario Vargas Llosa"],
['ed', 1, "“1984” romanının yazarı kimdir?", "George Orwell", "Aldous Huxley", "Ray Bradbury", "H. G. Wells"],
['ed', 2, "“Cesur Yeni Dünya” romanının yazarı kimdir?", "Aldous Huxley", "George Orwell", "Ray Bradbury", "Isaac Asimov"],
['ed', 2, "Gregor Samsa'nın bir sabah böceğe dönüştüğü “Dönüşüm”ün yazarı kimdir?", "Franz Kafka", "Albert Camus", "Jean-Paul Sartre", "Hermann Hesse"],
['ed', 2, "“Yabancı” romanının yazarı kimdir?", "Albert Camus", "Jean-Paul Sartre", "Franz Kafka", "André Gide"],
['ed', 1, "“Küçük Prens” kitabının yazarı kimdir?", "Antoine de Saint-Exupéry", "Jules Verne", "Victor Hugo", "Alexandre Dumas"],
['ed', 2, "“Seksen Günde Devriâlem” romanının yazarı kimdir?", "Jules Verne", "H. G. Wells", "Alexandre Dumas", "Robert Louis Stevenson"],
['ed', 2, "“Monte Kristo Kontu” romanının yazarı kimdir?", "Alexandre Dumas", "Victor Hugo", "Jules Verne", "Stendhal"],
['ed', 2, "“Robinson Crusoe” romanının yazarı kimdir?", "Daniel Defoe", "Jonathan Swift", "Robert Louis Stevenson", "Mark Twain"],
['ed', 1, "Sherlock Holmes karakterinin yaratıcısı kimdir?", "Arthur Conan Doyle", "Agatha Christie", "Edgar Allan Poe", "Charles Dickens"],
['ed', 2, "Agatha Christie'nin ünlü Belçikalı dedektifi kimdir?", "Hercule Poirot", "Miss Marple", "Sherlock Holmes", "Komiser Maigret"],
['ed', 1, "“Oliver Twist” romanının yazarı kimdir?", "Charles Dickens", "Thomas Hardy", "Jane Austen", "Oscar Wilde"],
['ed', 2, "“Aşk ve Gurur” (Gurur ve Önyargı) romanının yazarı kimdir?", "Jane Austen", "Charlotte Brontë", "Emily Brontë", "Virginia Woolf"],
['ed', 3, "“Uğultulu Tepeler” romanının yazarı kimdir?", "Emily Brontë", "Charlotte Brontë", "Jane Austen", "Mary Shelley"],
['ed', 2, "“Frankenstein” romanının yazarı kimdir?", "Mary Shelley", "Bram Stoker", "Edgar Allan Poe", "H. G. Wells"],
['ed', 2, "“Drakula” romanının yazarı kimdir?", "Bram Stoker", "Mary Shelley", "Oscar Wilde", "Edgar Allan Poe"],
['ed', 2, "“Moby Dick” romanının yazarı kimdir?", "Herman Melville", "Ernest Hemingway", "Mark Twain", "Jack London"],
['ed', 2, "“Yaşlı Adam ve Deniz” romanının yazarı kimdir?", "Ernest Hemingway", "John Steinbeck", "William Faulkner", "Herman Melville"],
['ed', 2, "“Tom Sawyer'ın Maceraları” kitabının yazarı kimdir?", "Mark Twain", "Jack London", "Charles Dickens", "Ernest Hemingway"],
['ed', 2, "“Fareler ve İnsanlar” romanının yazarı kimdir?", "John Steinbeck", "Ernest Hemingway", "F. Scott Fitzgerald", "J. D. Salinger"],
['ed', 2, "“Faust” adlı eserin yazarı kimdir?", "Johann Wolfgang von Goethe", "Friedrich Schiller", "Heinrich Heine", "Thomas Mann"],
['ed', 1, "Harry Potter kitaplarının yazarı kimdir?", "J. K. Rowling", "J. R. R. Tolkien", "C. S. Lewis", "Roald Dahl"],
['ed', 1, "“Yüzüklerin Efendisi” kitaplarının yazarı kimdir?", "J. R. R. Tolkien", "C. S. Lewis", "J. K. Rowling", "George R. R. Martin"],
['ed', 2, "“Narnia Günlükleri”nin yazarı kimdir?", "C. S. Lewis", "J. R. R. Tolkien", "Lewis Carroll", "Roald Dahl"],
['ed', 3, "“Pinokyo”nun yazarı kimdir?", "Carlo Collodi", "Grimm Kardeşler", "Hans Christian Andersen", "Charles Perrault"],
['ed', 2, "“Çirkin Ördek Yavrusu” masalının yazarı kimdir?", "Hans Christian Andersen", "Grimm Kardeşler", "Charles Perrault", "Ezop"],
['ed', 1, "“İnce Memed” romanının yazarı kimdir?", "Yaşar Kemal", "Orhan Kemal", "Kemal Tahir", "Fakir Baykurt"],
['ed', 1, "“Kürk Mantolu Madonna” romanının yazarı kimdir?", "Sabahattin Ali", "Ahmet Hamdi Tanpınar", "Peyami Safa", "Halide Edib Adıvar"],
['ed', 2, "“Saatleri Ayarlama Enstitüsü” romanının yazarı kimdir?", "Ahmet Hamdi Tanpınar", "Oğuz Atay", "Yusuf Atılgan", "Sait Faik Abasıyanık"],
['ed', 2, "“Tutunamayanlar” romanının yazarı kimdir?", "Oğuz Atay", "Yusuf Atılgan", "Bilge Karasu", "Adalet Ağaoğlu"],
['ed', 1, "Nobel Edebiyat Ödülü'nü kazanan ilk Türk yazar kimdir?", "Orhan Pamuk", "Yaşar Kemal", "Nazım Hikmet", "Ahmet Hamdi Tanpınar"],
['ed', 2, "Orhan Pamuk Nobel Edebiyat Ödülü'nü hangi yıl almıştır?", "2006", "2002", "2010", "1998"],
['ed', 1, "“Çalıkuşu” romanının yazarı kimdir?", "Reşat Nuri Güntekin", "Halide Edib Adıvar", "Refik Halit Karay", "Yakup Kadri Karaosmanoğlu"],
['ed', 2, "“Çalıkuşu” romanının kahramanının adı nedir?", "Feride", "Bihter", "Leyla", "Zehra"],
['ed', 2, "“Aşk-ı Memnu” romanının yazarı kimdir?", "Halit Ziya Uşaklıgil", "Reşat Nuri Güntekin", "Namık Kemal", "Ahmet Mithat Efendi"],
['ed', 2, "“Sinekli Bakkal” romanının yazarı kimdir?", "Halide Edib Adıvar", "Reşat Nuri Güntekin", "Peyami Safa", "Sabahattin Ali"],
['ed', 3, "“Yaban” romanının yazarı kimdir?", "Yakup Kadri Karaosmanoğlu", "Reşat Nuri Güntekin", "Halide Edib Adıvar", "Kemal Tahir"],
['ed', 3, "“Araba Sevdası” romanının yazarı kimdir?", "Recaizade Mahmut Ekrem", "Namık Kemal", "Şemsettin Sami", "Ahmet Mithat Efendi"],
['ed', 3, "Türk edebiyatının ilk romanı kabul edilen “Taaşşuk-ı Talat ve Fitnat”ın yazarı kimdir?", "Şemsettin Sami", "Namık Kemal", "Ahmet Mithat Efendi", "Recaizade Mahmut Ekrem"],
['ed', 3, "“Vatan yahut Silistre” oyununun yazarı kimdir?", "Namık Kemal", "Şinasi", "Ziya Paşa", "Abdülhak Hamit Tarhan"],
['ed', 3, "“Şair Evlenmesi” adlı tiyatro eserinin yazarı kimdir?", "Şinasi", "Namık Kemal", "Ahmet Vefik Paşa", "Ziya Paşa"],
['ed', 1, "İstiklal Marşı'nın şairi kimdir?", "Mehmet Akif Ersoy", "Namık Kemal", "Ziya Gökalp", "Tevfik Fikret"],
['ed', 2, "Mehmet Akif Ersoy'un şiirlerini topladığı eserin adı nedir?", "Safahat", "Kendi Gök Kubbemiz", "Çile", "Han Duvarları"],
['ed', 2, "“Kaldırımlar” şiiri hangi şaire aittir?", "Necip Fazıl Kısakürek", "Nazım Hikmet", "Orhan Veli Kanık", "Cahit Sıtkı Tarancı"],
['ed', 2, "“Otuz Beş Yaş” şiirinin şairi kimdir?", "Cahit Sıtkı Tarancı", "Orhan Veli Kanık", "Ziya Osman Saba", "Ahmet Muhip Dıranas"],
['ed', 3, "Aşağıdakilerden hangisi Garip akımının üç kurucusundan biri değildir?", "Attilâ İlhan", "Orhan Veli Kanık", "Oktay Rifat", "Melih Cevdet Anday"],
['ed', 2, "“İstanbul'u Dinliyorum” şiirinin şairi kimdir?", "Orhan Veli Kanık", "Nazım Hikmet", "Yahya Kemal Beyatlı", "Cemal Süreya"],
['ed', 2, "“Memleketimden İnsan Manzaraları” kimin eseridir?", "Nazım Hikmet", "Ahmet Arif", "Attilâ İlhan", "Can Yücel"],
['ed', 3, "“Hasretinden Prangalar Eskittim” kitabının şairi kimdir?", "Ahmet Arif", "Nazım Hikmet", "Enver Gökçe", "Hasan Hüseyin Korkmazgil"],
['ed', 2, "“Sessiz Gemi” şiirinin şairi kimdir?", "Yahya Kemal Beyatlı", "Ahmet Haşim", "Tevfik Fikret", "Necip Fazıl Kısakürek"],
['ed', 2, "Dede Korkut Hikâyeleri hangi Türk boyunun yaşayışını anlatır?", "Oğuzlar", "Uygurlar", "Kıpçaklar", "Karluklar"],
['ed', 2, "“Divanü Lügati't-Türk” adlı eserin yazarı kimdir?", "Kaşgarlı Mahmud", "Yusuf Has Hacib", "Ali Şir Nevai", "Edip Ahmet Yükneki"],
['ed', 2, "“Kutadgu Bilig” adlı eserin yazarı kimdir?", "Yusuf Has Hacib", "Kaşgarlı Mahmud", "Ahmet Yesevi", "Ali Şir Nevai"],
['ed', 3, "Türkçenin Farsçadan üstün olduğunu savunduğu “Muhakemetü'l-Lügateyn”in yazarı kimdir?", "Ali Şir Nevai", "Kaşgarlı Mahmud", "Fuzuli", "Yusuf Has Hacib"],
['ed', 2, "“Leyla ile Mecnun” mesnevisiyle ünlü 16. yüzyıl divan şairi kimdir?", "Fuzuli", "Baki", "Nedim", "Şeyh Galip"],
['ed', 3, "“Hüsn ü Aşk” mesnevisinin şairi kimdir?", "Şeyh Galip", "Fuzuli", "Nef'i", "Nabi"],
['ed', 3, "Lale Devri'nin ünlü şairi, şarkı türündeki şiirleriyle tanınan divan şairi kimdir?", "Nedim", "Baki", "Fuzuli", "Nef'i"],
['ed', 3, "Divan edebiyatında “Sultanü'ş-Şuara” (Şairler Sultanı) olarak anılan şair kimdir?", "Baki", "Fuzuli", "Nedim", "Nef'i"],
// TÜRKİYE
['tr', 1, "Türkiye'nin başkenti neresidir?", "Ankara", "İstanbul", "İzmir", "Konya"],
['tr', 3, "Ankara hangi tarihte başkent ilan edilmiştir?", "13 Ekim 1923", "29 Ekim 1923", "23 Nisan 1920", "1 Kasım 1922"],
['tr', 1, "Türkiye'nin en yüksek dağı hangisidir?", "Ağrı Dağı", "Erciyes Dağı", "Süphan Dağı", "Kaçkar Dağı"],
['tr', 3, "Ağrı Dağı'nın yüksekliği yaklaşık kaç metredir?", "5.137 m", "4.058 m", "3.917 m", "5.642 m"],
['tr', 1, "Türkiye'nin en büyük gölü hangisidir?", "Van Gölü", "Tuz Gölü", "Beyşehir Gölü", "Eğirdir Gölü"],
['tr', 2, "Kaynağı da döküldüğü yer de Türkiye sınırları içinde olan en uzun akarsu hangisidir?", "Kızılırmak", "Sakarya", "Yeşilırmak", "Büyük Menderes"],
['tr', 2, "Yüzölçümü bakımından Türkiye'nin en büyük ili hangisidir?", "Konya", "Sivas", "Ankara", "Erzurum"],
['tr', 3, "Yüzölçümü bakımından Türkiye'nin en küçük ili hangisidir?", "Yalova", "Kilis", "Bartın", "Bayburt"],
['tr', 1, "Türkiye kaç ilden oluşur?", "81", "79", "80", "82"],
['tr', 3, "Türkiye'nin 81. ili olan il hangisidir?", "Düzce", "Osmaniye", "Kilis", "Yalova"],
['tr', 1, "Türkiye kaç coğrafi bölgeye ayrılır?", "7", "6", "8", "5"],
['tr', 2, "Yüzölçümü en büyük coğrafi bölgemiz hangisidir?", "Doğu Anadolu Bölgesi", "İç Anadolu Bölgesi", "Karadeniz Bölgesi", "Akdeniz Bölgesi"],
['tr', 1, "Peribacalarıyla ünlü bölge hangisidir?", "Kapadokya", "Pamukkale", "Safranbolu", "Mardin"],
['tr', 2, "Pamukkale travertenleri hangi ildedir?", "Denizli", "Muğla", "Aydın", "Antalya"],
['tr', 2, "Dev heykelleriyle ünlü Nemrut Dağı hangi ildedir?", "Adıyaman", "Malatya", "Şanlıurfa", "Van"],
['tr', 1, "Göbeklitepe hangi ildedir?", "Şanlıurfa", "Mardin", "Diyarbakır", "Gaziantep"],
['tr', 2, "Sümela Manastırı hangi ildedir?", "Trabzon", "Rize", "Artvin", "Giresun"],
['tr', 2, "Ani Harabeleri hangi ildedir?", "Kars", "Ardahan", "Ağrı", "Iğdır"],
['tr', 2, "Efes Antik Kenti hangi ildedir?", "İzmir", "Aydın", "Muğla", "Manisa"],
['tr', 2, "Troya (Truva) Antik Kenti hangi ildedir?", "Çanakkale", "Balıkesir", "İzmir", "Edirne"],
['tr', 2, "Tarihi evleriyle ünlü Safranbolu hangi ilin ilçesidir?", "Karabük", "Bartın", "Kastamonu", "Zonguldak"],
['tr', 2, "Hitit başkenti Hattuşa'nın kalıntıları hangi ildedir?", "Çorum", "Kayseri", "Kırşehir", "Yozgat"],
['tr', 2, "Neolitik yerleşim yeri Çatalhöyük hangi ildedir?", "Konya", "Aksaray", "Niğde", "Karaman"],
['tr', 2, "Antik Dünyanın Yedi Harikası'ndan Halikarnas Mozolesi bugün hangi ilçededir?", "Bodrum", "Marmaris", "Kuşadası", "Çeşme"],
['tr', 3, "Ayasofya'yı bugünkü haliyle yaptıran Bizans imparatoru kimdir?", "I. Justinianus", "I. Konstantinos", "II. Theodosius", "Herakleios"],
['tr', 3, "Sultanahmet Camii'nin mimarı kimdir?", "Sedefkâr Mehmed Ağa", "Mimar Sinan", "Mimar Kemaleddin", "Davud Ağa"],
['tr', 1, "İstanbul'daki Süleymaniye Camii'nin mimarı kimdir?", "Mimar Sinan", "Sedefkâr Mehmed Ağa", "Mimar Kemaleddin", "Mimar Hayreddin"],
['tr', 2, "Mimar Sinan'ın “ustalık eserim” dediği Selimiye Camii hangi ildedir?", "Edirne", "İstanbul", "Bursa", "Konya"],
['tr', 1, "Plaka kodu 34 olan il hangisidir?", "İstanbul", "Ankara", "İzmir", "Bursa"],
['tr', 2, "Plaka kodu 01 olan il hangisidir?", "Adana", "Ankara", "Adıyaman", "Afyonkarahisar"],
['tr', 3, "Türkiye'nin en doğu ucu hangi ilin sınırları içindedir?", "Iğdır", "Kars", "Van", "Hakkari"],
['tr', 2, "Türkiye'nin en kuzey ucu olan İnceburun hangi ildedir?", "Sinop", "Kastamonu", "Samsun", "Kırklareli"],
['tr', 2, "Türkiye'nin en büyük adası hangisidir?", "Gökçeada", "Bozcaada", "Marmara Adası", "Büyükada"],
['tr', 1, "İstanbul Boğazı hangi iki denizi birbirine bağlar?", "Karadeniz ve Marmara", "Marmara ve Ege", "Karadeniz ve Ege", "Akdeniz ve Marmara"],
['tr', 2, "Çanakkale Boğazı hangi iki denizi birbirine bağlar?", "Marmara ve Ege", "Karadeniz ve Marmara", "Ege ve Akdeniz", "Karadeniz ve Ege"],
['tr', 1, "Türkiye'de çay üretimiyle en çok özdeşleşen il hangisidir?", "Rize", "Ordu", "Samsun", "Sinop"],
['tr', 1, "Türkiye'nin en kalabalık ili hangisidir?", "İstanbul", "Ankara", "İzmir", "Bursa"],
['tr', 2, "TBMM'nin ilk başkanı kimdir?", "Mustafa Kemal Atatürk", "İsmet İnönü", "Fevzi Çakmak", "Kâzım Karabekir"],
['tr', 2, "Türkiye Cumhuriyeti'nin ilk başbakanı kimdir?", "İsmet İnönü", "Celal Bayar", "Adnan Menderes", "Refik Saydam"],
['tr', 2, "Türkiye Cumhuriyeti'nin üçüncü cumhurbaşkanı kimdir?", "Celal Bayar", "Cemal Gürsel", "İsmet İnönü", "Cevdet Sunay"],
['tr', 2, "Türkiye'nin ilk kadın savaş pilotu kimdir?", "Sabiha Gökçen", "Afet İnan", "Halide Edib Adıvar", "Nezihe Muhiddin"],
['tr', 2, "Türkiye'nin ilk kadın başbakanı kimdir?", "Tansu Çiller", "Meral Akşener", "Türkan Akyol", "Nermin Neftçi"],
['tr', 3, "1877-78 Osmanlı-Rus Savaşı'nda Aziziye Tabyası'ndaki kahramanlığıyla tanınan Nene Hatun hangi şehrin savunmasına katılmıştır?", "Erzurum", "Kars", "Ardahan", "Van"],
['tr', 1, "Mevlana Müzesi hangi ildedir?", "Konya", "Karaman", "Kayseri", "Afyonkarahisar"],
['tr', 2, "Hacı Bektaş-ı Veli Türbesi hangi ildedir?", "Nevşehir", "Kırşehir", "Konya", "Amasya"],
['tr', 2, "Nasreddin Hoca'nın türbesi hangi ilçededir?", "Akşehir", "Sivrihisar", "Beypazarı", "Ilgın"],
['tr', 3, "Türkiye'nin ilk milli parkı hangisidir?", "Yozgat Çamlığı Milli Parkı", "Uludağ Milli Parkı", "Kuşcenneti Milli Parkı", "Olimpos Beydağları Milli Parkı"],
['tr', 1, "Uludağ hangi ildedir?", "Bursa", "Bolu", "Kayseri", "Erzurum"],
['tr', 2, "Atatürk Barajı hangi nehir üzerine kurulmuştur?", "Fırat", "Dicle", "Kızılırmak", "Seyhan"],
['tr', 2, "Tuz Gölü hangi coğrafi bölgededir?", "İç Anadolu Bölgesi", "Ege Bölgesi", "Doğu Anadolu Bölgesi", "Akdeniz Bölgesi"],
['tr', 3, "Nesli tehlikedeki kelaynak kuşlarının korunduğu Birecik hangi ilin ilçesidir?", "Şanlıurfa", "Gaziantep", "Adıyaman", "Mardin"],
// TEKNOLOJİ
['te', 2, "World Wide Web'i (WWW) icat eden bilim insanı kimdir?", "Tim Berners-Lee", "Bill Gates", "Steve Jobs", "Vint Cerf"],
['te', 1, "“www” kısaltmasının açılımı nedir?", "World Wide Web", "World Web Wire", "Wide World Web", "Web Wide World"],
['te', 1, "Telefonu icat ettiği kabul edilen kişi kimdir?", "Alexander Graham Bell", "Thomas Edison", "Nikola Tesla", "Guglielmo Marconi"],
['te', 2, "Akkor ampulü geliştirip yaygınlaştırmasıyla tanınan mucit kimdir?", "Thomas Edison", "Nikola Tesla", "Alexander Graham Bell", "Alessandro Volta"],
['te', 1, "CPU kısaltmasının Türkçe karşılığı nedir?", "Merkezi işlem birimi", "Ana bellek", "Ekran kartı", "Güç kaynağı"],
['te', 2, "Bilgisayar kapatıldığında içeriği silinen bellek türü hangisidir?", "RAM", "ROM", "SSD", "Sabit disk"],
['te', 1, "Web sayfalarının yapısını oluşturmak için kullanılan işaretleme dili hangisidir?", "HTML", "SQL", "Python", "C++"],
['te', 1, "İkilik (binary) sayı sisteminde hangi rakamlar kullanılır?", "0 ve 1", "1 ve 2", "0'dan 9'a kadar", "0'dan 7'ye kadar"],
['te', 1, "8 bit kaç bayt eder?", "1", "8", "2", "4"],
['te', 2, "İkilik sistemde yazılan “101” sayısı onluk sistemde kaçtır?", "5", "3", "6", "101"],
['te', 3, "Bilgisayar faresini icat eden kişi kimdir?", "Douglas Engelbart", "Steve Jobs", "Bill Gates", "Alan Turing"],
['te', 2, "Enigma şifresinin çözülmesine katkısıyla bilinen, bilgisayar biliminin öncülerinden İngiliz matematikçi kimdir?", "Alan Turing", "John von Neumann", "Charles Babbage", "Claude Shannon"],
['te', 2, "İlk bilgisayar programını yazdığı kabul edilen kadın matematikçi kimdir?", "Ada Lovelace", "Grace Hopper", "Marie Curie", "Hedy Lamarr"],
['te', 1, "Microsoft'un kurucularından biri kimdir?", "Bill Gates", "Steve Jobs", "Jeff Bezos", "Larry Page"],
['te', 2, "Linux çekirdeğini geliştiren yazılımcı kimdir?", "Linus Torvalds", "Richard Stallman", "Dennis Ritchie", "Ken Thompson"],
['te', 3, "Android işletim sistemi hangi çekirdeğe dayanır?", "Linux", "Windows NT", "Darwin (macOS)", "DOS"],
['te', 3, "Bluetooth adını nereden alır?", "Bir Viking kralının lakabından", "Mavi dişli bir köpek balığından", "Mucidinin soyadından", "Bir mavi kuş türünden"],
['te', 1, "GPS teknolojisi temel olarak ne amaçla kullanılır?", "Konum belirleme", "Dosya sıkıştırma", "Ses kaydetme", "Virüs tarama"],
['te', 1, "İstenmeden toplu olarak gönderilen e-postalara ne ad verilir?", "Spam", "Cookie", "Firewall", "Patch"],
['te', 1, "E-posta adreslerinde kullanılan “@” işareti Türkçede yaygın olarak nasıl okunur?", "Et", "Diyez", "Yıldız", "Tire"],
['te', 1, "Q ve F, Türkiye'de ne tür standartların adıdır?", "Klavye dizilimi", "Ekran çözünürlüğü", "Dosya biçimi", "Programlama dili"],
['te', 2, "Web adreslerindeki “https” ifadesindeki “s” harfi neyi belirtir?", "Güvenli (secure)", "Hızlı (speed)", "Sunucu (server)", "Standart"],
['te', 1, "Aşağıdakilerden hangisi bir resim dosyası biçimidir?", "PNG", "MP3", "DOCX", "EXE"],
['te', 2, "Birden çok dosyayı tek bir sıkıştırılmış arşivde toplamak için kullanılan biçim hangisidir?", "ZIP", "MP3", "PNG", "TXT"],
['te', 3, "Python programlama dili adını nereden almıştır?", "Monty Python komedi grubundan", "Bir yılan türünden", "Mucidinin köpeğinden", "Bir Yunan tanrısından"],
['te', 2, "Uzaya fırlatılan ilk yapay uydu hangisidir?", "Sputnik 1", "Explorer 1", "Vostok 1", "Apollo 1"],
['te', 2, "İnternetin öncüsü kabul edilen ağ hangisidir?", "ARPANET", "ETHERNET", "USENET", "BITNET"],
['te', 3, "Moore Yasası neyle ilgili bir öngörüdür?", "Çiplerdeki transistör sayısının düzenli olarak katlanması", "İnternet hızının her yıl yarıya inmesi", "Pil ömrünün her yıl ikiye katlanması", "Ekran boyutlarının her yıl büyümesi"],
['te', 2, "Web sitelerindeki CAPTCHA testlerinin amacı nedir?", "Kullanıcının insan mı bot mu olduğunu ayırt etmek", "İnternet hızını ölçmek", "Şifreyi sıfırlamak", "Reklamları engellemek"],
['te', 1, "Dijital bir görüntüyü oluşturan en küçük noktaya ne denir?", "Piksel", "Bayt", "Vektör", "Hertz"],
['te', 1, "Bilgisayarlarda “Ctrl + C” kısayolu genellikle ne işe yarar?", "Kopyalama", "Yapıştırma", "Kesme", "Geri alma"],
['te', 2, "“Emoji” sözcüğü hangi dilden gelir?", "Japonca", "İngilizce", "Korece", "Çince"],
['te', 2, "Kâğıt ilk olarak hangi uygarlıkta icat edilmiştir?", "Çin", "Mısır", "Mezopotamya", "Hindistan"],
['te', 2, "Buhar makinesini geliştirerek Sanayi Devrimi'ne büyük katkı yapan İskoç mucit kimdir?", "James Watt", "George Stephenson", "Michael Faraday", "Isaac Newton"],
['te', 2, "Radyonun mucidi olarak tanınan İtalyan kimdir?", "Guglielmo Marconi", "Alessandro Volta", "Luigi Galvani", "Enrico Fermi"],
['te', 1, "İlk motorlu uçağı başarıyla uçuran kardeşler kimdir?", "Wright Kardeşler", "Lumière Kardeşler", "Montgolfier Kardeşler", "Grimm Kardeşler"],
['te', 2, "Hezarfen Ahmed Çelebi rivayete göre neyle ünlüdür?", "Galata Kulesi'nden Üsküdar'a uçmasıyla", "İlk denizaltıyı yapmasıyla", "Matbaayı İstanbul'a getirmesiyle", "İlk saat kulesini yapmasıyla"],
['te', 3, "12-13. yüzyılda otomatik makineler tasarlayan, sibernetiğin öncülerinden kabul edilen bilgin kimdir?", "El-Cezeri", "Uluğ Bey", "Piri Reis", "Takiyüddin"],
// DOĞA & HAYVANLAR
['do', 1, "Dünyanın en büyük hayvanı hangisidir?", "Mavi balina", "Afrika fili", "Balina köpekbalığı", "Kaşalot"],
['do', 1, "Karadaki en hızlı hayvan hangisidir?", "Çita", "Aslan", "Ceylan", "At"],
['do', 1, "Dünyanın en uzun boylu hayvanı hangisidir?", "Zürafa", "Fil", "Deve", "Devekuşu"],
['do', 1, "Kanguru hangi kıtaya özgüdür?", "Avustralya", "Afrika", "Güney Amerika", "Asya"],
['do', 1, "Dev pandaların temel besini nedir?", "Bambu", "Okaliptüs", "Balık", "Meyve"],
['do', 2, "Koalalar hangi ağacın yapraklarıyla beslenir?", "Okaliptüs", "Bambu", "Meşe", "Çam"],
['do', 1, "Yarasalar hangi canlı grubuna aittir?", "Memeliler", "Kuşlar", "Sürüngenler", "Böcekler"],
['do', 1, "Örümceklerin kaç bacağı vardır?", "8", "6", "10", "12"],
['do', 3, "Ahtapotun kaç kalbi vardır?", "3", "1", "2", "4"],
['do', 1, "Aşağıdaki kuşlardan hangisi uçamaz?", "Penguen", "Martı", "Kartal", "Serçe"],
['do', 1, "Dünyanın en büyük kuşu hangisidir?", "Devekuşu", "Albatros", "Kartal", "Pelikan"],
['do', 3, "Kanat açıklığı en geniş olan kuş hangisidir?", "Albatros", "Kartal", "Akbaba", "Pelikan"],
['do', 1, "Tırtıllar hangi canlıya dönüşür?", "Kelebek", "Arı", "Uğur böceği", "Sinek"],
['do', 2, "Kurbağa yavrusuna ne ad verilir?", "İribaş", "Tırtıl", "Kurtçuk", "Civciv"],
['do', 1, "Bukalemunun en bilinen özelliği nedir?", "Renk değiştirebilmesi", "Uçabilmesi", "Zehirli olması", "Kış uykusuna yatması"],
['do', 1, "Aşağıdaki hayvanlardan hangisi kış uykusuna yatar?", "Ayı", "Kurt", "Tilki", "Geyik"],
['do', 2, "Bal arısı kolonisinde yumurtlayan tek dişi hangisidir?", "Kraliçe arı", "İşçi arı", "Erkek arı", "Bekçi arı"],
['do', 2, "Memeli olduğu halde yumurtlayan hayvan hangisidir?", "Ornitorenk", "Yunus", "Yarasa", "Kanguru"],
['do', 2, "Dünyanın en uzun boylu ağaçları olarak bilinen tür hangisidir?", "Sekoya", "Baobab", "Meşe", "Zeytin"],
['do', 2, "Baobab ağaçları en çok hangi kıtada yetişir?", "Afrika", "Avrupa", "Güney Amerika", "Antarktika"],
['do', 2, "Van kedisinin en bilinen özelliklerinden biri nedir?", "İki gözünün farklı renkte olabilmesi", "Kuyruğunun olmaması", "Tüysüz olması", "Kulaklarının kıvrık olması"],
['do', 2, "Kangal köpeği adını hangi ilin ilçesinden alır?", "Sivas", "Kayseri", "Malatya", "Erzurum"],
['do', 2, "Ankara keçisinden elde edilen ünlü lif hangisidir?", "Tiftik", "Kaşmir", "Merinos", "Alpaka"],
['do', 1, "Caretta caretta nedir?", "Bir deniz kaplumbağası", "Bir kuş türü", "Bir balık türü", "Bir fok türü"],
['do', 2, "Türkiye kıyılarında yaşayan, nesli tehlikedeki fok türü hangisidir?", "Akdeniz foku", "Kutup foku", "Kürklü fok", "Fil foku"],
['do', 2, "Flamingoların pembe renkli olmasının nedeni nedir?", "Beslendikleri karides ve alglerdeki pigmentler", "Güneş yanığı", "Suyun tuzluluğu", "Kan dolaşımlarının hızı"],
['do', 2, "Kutup ayıları doğal olarak hangi bölgede yaşar?", "Kuzey Kutbu çevresi (Arktik)", "Antarktika", "Himalayalar", "Sibirya tayga ormanları"],
['do', 2, "Fillerin hortumu aslında hangi organlarının birleşimidir?", "Burun ve üst dudak", "Dil ve alt dudak", "Diş ve burun", "Çene ve dil"],
['do', 2, "Fildişi aslında nedir?", "Dişin uzamış hali", "Boynuz", "Kemik çıkıntısı", "Tırnak"],
['do', 2, "Örümcekler hangi hayvan sınıfına aittir?", "Örümceğimsiler (araknidler)", "Böcekler", "Kabuklular", "Sürüngenler"],
['do', 2, "Köpekbalıkları hangi hayvan grubuna aittir?", "Kıkırdaklı balıklar", "Memeliler", "Sürüngenler", "İki yaşamlılar"],
['do', 2, "Kedigiller familyasının en büyük üyesi hangisidir?", "Kaplan", "Aslan", "Jaguar", "Leopar"],
['do', 2, "Aslanlar genellikle hangi ortamda yaşar?", "Savan", "Yağmur ormanı", "Tundra", "Tayga"],
['do', 3, "Bambu hangi bitki familyasına aittir?", "Buğdaygiller (çimen familyası)", "Meşegiller", "Kaktüsler", "Eğrelti otları"],
['do', 2, "Venüs sinekkapanı nasıl bir bitkidir?", "Böcekleri yakalayıp sindiren bir bitki", "Çölde yetişen bir kaktüs", "Su altında yaşayan bir yosun", "Yalnızca geceleri açan bir çiçek"],
['do', 2, "Develer hörgüçlerinde ne depolar?", "Yağ", "Su", "Kan", "Kum"],
['do', 2, "Bal arıları besin kaynağının yerini diğer arılara nasıl bildirir?", "Dans ederek", "Şarkı söyleyerek", "Renk değiştirerek", "Yer çizerek"],
['do', 2, "Somon balıkları yumurtlamak için genellikle nereye göç eder?", "Doğdukları tatlı su akarsularına", "Okyanus diplerine", "Kutup buzullarının altına", "Mercan resiflerine"],
['do', 2, "Ateş böceklerinin ışık üretmesine ne ad verilir?", "Biyolüminesans", "Fotosentez", "Floresan", "Kemosentez"],
['do', 2, "Şapkalı mantarlar canlıların sınıflandırılmasında nereye yerleştirilir?", "Ayrı bir alem olan Mantarlar alemine", "Bitkiler alemine", "Hayvanlar alemine", "Bakteriler alemine"],
['do', 1, "Dünyanın en büyük yağmur ormanı hangisidir?", "Amazon", "Kongo", "Borneo", "Kara Orman"],
['do', 1, "Ozon tabakası Dünya'yı neye karşı korur?", "Güneş'in morötesi (UV) ışınlarına", "Meteorlara", "Depremlere", "Kasırgalara"],
['do', 3, "Nesli tehlike altındaki kelaynak kuşu hangi kuş grubuna aittir?", "İbisler", "Kartallar", "Baykuşlar", "Martılar"],
// YEMEK & KÜLTÜR
['ye', 1, "Pizza hangi ülkenin mutfağından dünyaya yayılmıştır?", "İtalya", "Yunanistan", "Fransa", "İspanya"],
['ye', 1, "Suşi hangi ülkenin mutfağına aittir?", "Japonya", "Çin", "Kore", "Tayland"],
['ye', 2, "Paella hangi ülkenin geleneksel yemeğidir?", "İspanya", "İtalya", "Portekiz", "Meksika"],
['ye', 2, "Guacamole sosunun ana malzemesi nedir?", "Avokado", "Domates", "Biber", "Mısır"],
['ye', 1, "Humusun ana malzemesi nedir?", "Nohut", "Mercimek", "Fasulye", "Bakla"],
['ye', 1, "Cacığın temel malzemeleri nelerdir?", "Yoğurt ve salatalık", "Süt ve pirinç", "Domates ve biber", "Peynir ve maydanoz"],
['ye', 1, "Mantısıyla en çok özdeşleşen il hangisidir?", "Kayseri", "Konya", "Sivas", "Kastamonu"],
['ye', 1, "İskender kebap hangi şehirle özdeşleşmiştir?", "Bursa", "Adana", "Gaziantep", "İzmir"],
['ye', 2, "Pişmaniyesiyle ünlü il hangisidir?", "Kocaeli", "Bolu", "Sakarya", "Bursa"],
['ye', 2, "Cağ kebabı hangi ilin yöresel yemeğidir?", "Erzurum", "Erzincan", "Kars", "Van"],
['ye', 2, "Testi kebabıyla ünlü il hangisidir?", "Nevşehir", "Trabzon", "Edirne", "Manisa"],
['ye', 2, "Tava ciğeriyle ünlü il hangisidir?", "Edirne", "Kırklareli", "Bursa", "Konya"],
['ye', 2, "Her yıl Mesir Macunu Festivali düzenlenen il hangisidir?", "Manisa", "İzmir", "Aydın", "Denizli"],
['ye', 1, "Baklavasıyla en çok özdeşleşen il hangisidir?", "Gaziantep", "Hatay", "Konya", "Bursa"],
['ye', 2, "Künefesiyle ünlü il hangisidir?", "Hatay", "Gaziantep", "Adana", "Mersin"],
['ye', 2, "Kokoreç neyden yapılır?", "Kuzu bağırsağı", "Dana dili", "Tavuk ciğeri", "Balık"],
['ye', 3, "Türk kahvesi kültürü ve geleneği UNESCO Somut Olmayan Kültürel Miras listesine hangi yıl alınmıştır?", "2013", "2009", "2016", "2005"],
['ye', 1, "Türk kahvesi geleneksel olarak hangi kapta pişirilir?", "Cezve", "Demlik", "Semaver", "Güğüm"],
['ye', 2, "Tarhananın temel malzemeleri nelerdir?", "Un ve yoğurt", "Pirinç ve süt", "Mercimek ve bulgur", "Nişasta ve şeker"],
['ye', 2, "Aşure geleneksel olarak hangi ayda pişirilip dağıtılır?", "Muharrem", "Ramazan", "Recep", "Şaban"],
['ye', 2, "Lokum İngilizcede hangi adla bilinir?", "Turkish delight", "Turkish candy", "Sweet cube", "Rose jelly"],
['ye', 2, "İstanbul'da kumpiriyle ünlü semt hangisidir?", "Ortaköy", "Kadıköy", "Eminönü", "Balat"],
['ye', 1, "Kruvasan en çok hangi ülkenin kahvaltısıyla özdeşleşmiştir?", "Fransa", "Almanya", "Birleşik Krallık", "Rusya"],
['ye', 2, "Borş çorbasına rengini veren ana sebze hangisidir?", "Pancar", "Lahana", "Havuç", "Domates"],
['ye', 2, "Kimçi hangi ülkenin geleneksel yemeğidir?", "Kore", "Japonya", "Çin", "Vietnam"],
['ye', 1, "Tako (taco) hangi ülkenin mutfağına aittir?", "Meksika", "İspanya", "Arjantin", "Peru"],
['ye', 2, "Fondü hangi ülkenin ulusal yemeği olarak bilinir?", "İsviçre", "Fransa", "Belçika", "Hollanda"],
['ye', 2, "Gulaş hangi ülkenin geleneksel yemeğidir?", "Macaristan", "Polonya", "Çekya", "Romanya"],
['ye', 3, "Safran neyden elde edilir?", "Bir çiğdem türünün çiçeğindeki tepeciklerden", "Bir ağacın kabuğundan", "Bir bitkinin kökünden", "Bir meyvenin çekirdeğinden"],
['ye', 2, "Tarçın bitkinin hangi kısmından elde edilir?", "Ağaç kabuğu", "Çiçeği", "Tohumu", "Kökü"],
['ye', 2, "Köri karışımlarına sarı rengini veren baharat hangisidir?", "Zerdeçal", "Kimyon", "Karabiber", "Tarçın"],
['ye', 3, "Geleneksel İtalyan mozzarellası (mozzarella di bufala) hangi hayvanın sütünden yapılır?", "Manda", "Keçi", "Koyun", "Deve"],
['ye', 2, "Hıdırellez her yıl hangi tarihte kutlanır?", "6 Mayıs", "21 Mart", "1 Mayıs", "21 Haziran"],
['ye', 2, "Nevruz her yıl hangi tarihte kutlanır?", "21 Mart", "6 Mayıs", "1 Ocak", "21 Haziran"],
['ye', 1, "Karagöz ile Hacivat nedir?", "Geleneksel bir gölge oyunu", "Bir kukla tiyatrosu", "Bir halk dansı", "Bir destan"],
['ye', 2, "Kahvehanelerde tek başına hikâye anlatan geleneksel sanatçıya ne denir?", "Meddah", "Ozan", "Hattat", "Mehter"],
['ye', 2, "Ebru sanatı nasıl yapılır?", "Su yüzeyine serpilen boyalarla desen oluşturularak", "Taş oyularak", "Cam üflenerek", "Ahşaba sedef kakılarak"],
['ye', 1, "Hat sanatı neyle ilgilidir?", "Güzel yazı", "Minyatür resim", "Çömlekçilik", "Halı dokuma"],
['ye', 2, "Çinileriyle ünlü İznik hangi ilin ilçesidir?", "Bursa", "Kütahya", "Eskişehir", "Bilecik"],
['ye', 1, "Horon hangi yörenin halk dansıdır?", "Karadeniz", "Ege", "İç Anadolu", "Trakya"],
['ye', 1, "Zeybek hangi yöreyle özdeşleşmiş bir halk dansıdır?", "Ege", "Karadeniz", "Doğu Anadolu", "Trakya"],
['ye', 1, "Japon kâğıt katlama sanatına ne ad verilir?", "Origami", "İkebana", "Bonsai", "Haiku"],
['ye', 2, "Öğle saatlerinde kısa bir dinlenme olan “siesta” geleneğiyle en çok hangi ülke anılır?", "İspanya", "İsveç", "Almanya", "Japonya"],
['ye', 1, "Dünyaca ünlü karnavalıyla bilinen Brezilya şehri hangisidir?", "Rio de Janeiro", "Brasília", "Manaus", "Curitiba"],
['ye', 2, "İzmir'de simide ne ad verilir?", "Gevrek", "Halka", "Çörek", "Pide"],
['ye', 2, "Boyoz hangi ilin yöresel hamur işidir?", "İzmir", "Manisa", "Aydın", "Muğla"],
['ye', 1, "“İmam bayıldı” yemeğinin ana sebzesi hangisidir?", "Patlıcan", "Kabak", "Biber", "Lahana"],
['ye', 2, "“Hünkâr beğendi” yemeğinde etin altına konan beğendi neyden yapılır?", "Patlıcan", "Patates", "Nohut", "Kabak"],
['ye', 1, "Ramazan ayında oruç açılırken yenen akşam yemeğine ne denir?", "İftar", "Sahur", "Kuşluk", "Ziyafet"],
['ye', 1, "Hamsi en çok hangi bölgemizle özdeşleşmiştir?", "Karadeniz", "Ege", "Akdeniz", "İç Anadolu"]
];

/* ---------- sabitler ---------- */
const DIFF = ['', 'KOLAY', 'ORTA', 'ZOR'];
const LETTERS = ['A', 'B', 'C', 'D'];
const T_INTRO = 2800, T_PRE = 1700, T_REVEAL = 3600, T_BOARD = 4800, T_FINAL = 2600, GRACE = 450;
const SEEN_KEY = 'bilgi.seen.v1';
const qKey = q => { let h = 5381; for (const ch of q[2]) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h.toString(36); };

/* ---------- kurallar (yöneten cihaz) ---------- */
function pickQuestions(n, cat) {
  const pool = BANK.map((_, i) => i).filter(i => cat === 'mix' || BANK[i][0] === cat);
  const seen = new Set(store.get(SEEN_KEY, []) || []);
  const order = shuffle(pool.filter(i => !seen.has(qKey(BANK[i])))).concat(shuffle(pool.filter(i => seen.has(qKey(BANK[i])))));
  let chosen = [];
  if (cat === 'mix') {
    // Karışıkta kategorileri dengele: önce her kategoriden sınırlı sayıda, sonra kalanla doldur
    const limit = Math.ceil(n / Object.keys(CATS).length), cnt = {};
    for (const i of order) { if (chosen.length >= n) break; const c = BANK[i][0]; if ((cnt[c] || 0) < limit) { chosen.push(i); cnt[c] = (cnt[c] || 0) + 1; } }
    for (const i of order) { if (chosen.length >= n) break; if (!chosen.includes(i)) chosen.push(i); }
  } else chosen = order.slice(0, n);
  // Kolaydan zora doğru hafif bir artış (biraz rastgelelikle)
  const key = new Map(chosen.map(i => [i, BANK[i][1] + Math.random() * 1.7]));
  chosen.sort((a, b) => key.get(a) - key.get(b));
  try { const list = (store.get(SEEN_KEY, []) || []).filter(k => !chosen.some(i => qKey(BANK[i]) === k)); store.set(SEEN_KEY, list.concat(chosen.map(i => qKey(BANK[i]))).slice(-360)); } catch { /* yok say */ }
  return chosen;
}
function rankOrder(st) {
  return st.players.map((_, i) => i).sort((a, b) => (st.scores[b] - st.scores[a]) || (st.correctN[b] - st.correctN[a]) || (st.fastMs[a] - st.fastMs[b]) || (a - b));
}
function arm(st, ctx) {
  if (st.phase === 'done') return;
  const step = st.step, at = st.phase === 'question' ? st.deadline + GRACE : st.until;
  ctx.later(Math.max(0, at - Date.now()), () => { if (st.step === step) advance(st, ctx); });
}
function setPhase(st, phase, ms, ctx) { st.phase = phase; st.step++; st.until = Date.now() + ms; arm(st, ctx); }
function advance(st, ctx) {
  if (st.phase === 'intro' || st.phase === 'board') nextQuestion(st, ctx);
  else if (st.phase === 'pre') startQuestion(st, ctx);
  else if (st.phase === 'question') reveal(st, ctx);
  else if (st.phase === 'reveal') afterReveal(st, ctx);
  else if (st.phase === 'final') finish(st, ctx);
}
function nextQuestion(st, ctx) {
  st.qi++;
  const b = BANK[st.qs[st.qi]];
  const opts = shuffle([0, 1, 2, 3]);
  st.q = { cat: b[0], diff: b[1], text: b[2], opts: opts.map(k => b[3 + k]), correct: opts.indexOf(0) };
  st.answers = st.players.map(() => null);
  setPhase(st, 'pre', T_PRE, ctx);
  ctx.emit({ t: 'pre', qi: st.qi });
  ctx.sync();
}
function startQuestion(st, ctx) {
  st.start = Date.now(); st.deadline = st.start + st.time * 1000;
  st.answers = st.players.map(() => null);
  st.phase = 'question'; st.step++; arm(st, ctx);
  ctx.emit({ t: 'q', qi: st.qi });
  ctx.sync();
}
function allIn(st, ctx) {
  const live = st.players.map((_, i) => i).filter(i => ctx.isOnline(i));
  return live.length > 0 && live.every(i => st.answers[i]);
}
function reveal(st, ctx) {
  if (st.phase !== 'question') return;
  const q = st.q, total = st.time * 1000, picks = [0, 0, 0, 0];
  const res = st.players.map((p, pi) => {
    const a = st.answers[pi];
    if (a) picks[a.c]++;
    const ok = !!a && a.c === q.correct;
    let pts = 0, bonus = 0;
    if (ok) {
      pts = 100 + Math.round(100 * Math.max(0, total - a.ms) / total);
      st.streak[pi]++; st.correctN[pi]++; st.fastMs[pi] += a.ms;
      if (st.streak[pi] >= 3) bonus = Math.min(100, 20 * (st.streak[pi] - 2));
    } else st.streak[pi] = 0;
    st.scores[pi] += pts + bonus;
    st.best[pi] = Math.max(st.best[pi], st.streak[pi]);
    return { pi, c: a ? a.c : null, ok, pts, bonus, streak: st.streak[pi], ms: a ? a.ms : null };
  });
  st.last = { qi: st.qi, correct: q.correct, picks, res };
  setPhase(st, 'reveal', T_REVEAL, ctx);
  const winners = res.filter(r => r.ok).map(r => `${st.players[r.pi].name} +${r.pts + r.bonus}`);
  ctx.emit({ t: 'reveal', qi: st.qi, res: res.map(r => ({ pi: r.pi, ok: r.ok, c: r.c, gain: r.pts + r.bonus, streak: r.streak })) },
    `${st.qi + 1}. soru · Doğru cevap: ${q.opts[q.correct]}${st.players.length > 1 ? (winners.length ? ' · ' + winners.join(', ') : ' · kimse bilemedi') : (res[0].ok ? ` · +${res[0].pts + res[0].bonus} puan` : '')}`,
    res.some(r => r.ok) ? 'good' : 'bad');
  ctx.sync();
}
function afterReveal(st, ctx) {
  if (st.qi + 1 >= st.count) {
    setPhase(st, 'final', T_FINAL, ctx);
    const top = rankOrder(st)[0];
    ctx.emit({ t: 'final', pi: top }, `Yarışma bitti! Birinci: ${st.players[top].name} (${st.scores[top]} puan)`, 'gold');
    ctx.sync();
  } else if ((st.qi + 1) % 5 === 0) {
    setPhase(st, 'board', T_BOARD, ctx);
    ctx.emit({ t: 'board' }, `${st.qi + 1}. sorudan sonra ara sıralama.`);
    ctx.sync();
  } else nextQuestion(st, ctx);
}
function finish(st, ctx) {
  st.phase = 'done'; st.step++;
  ctx.sync();
  const order = rankOrder(st), solo = st.players.length === 1, top = order[0];
  const tie = !solo && order.length > 1 && st.scores[order[1]] === st.scores[top] && st.correctN[order[1]] === st.correctN[top] && st.fastMs[order[1]] === st.fastMs[top];
  ctx.end({
    title: solo ? `${st.scores[top]} puan topladın!` : tie ? 'Berabere bitti!' : `${st.players[top].name} kazandı!`,
    ranking: order.map(pi => ({ pi, score: st.scores[pi], label: `${st.scores[pi]} puan · ${st.correctN[pi]}✓` })),
    note: `${st.count} soru · ${st.cat === 'mix' ? 'Karışık' : CATS[st.cat][0]} · soru başına ${st.time} sn · ✓ doğru sayısı.` + (solo ? ` En uzun doğru serin: ${st.best[top]}.` : ' Eşitlikte doğru sayısı, sonra toplam hız belirler.')
  });
}

/* ---------- arayüz ---------- */
let root = null, ui = null, V = null, built = '', loop = null, deadline = 0, deadQi = -1, lastSec = -1, picked = null;
const catOf = k => CATS[k] || ['Karışık', '🎲'];
function remainMs() { return Math.max(0, deadline - performance.now()); }
function stageFor(v) {
  const p = v.players;
  if (v.phase === 'intro') {
    const c = v.cat === 'mix' ? ['Karışık', '🎲'] : catOf(v.cat);
    return `<div class="bq-intro"><div class="bq-logo"><span>BİLGİ</span><span>YARIŞMASI</span></div>
      <p class="bq-introsub">${v.count} soru · ${c[1]} ${esc(c[0])} · soru başına ${v.time} sn</p>
      <p class="bq-introhelp">Doğru cevap 100 puan, hızlı olana +100'e kadar bonus. Üst üste 3 doğrudan sonra seri bonusu!</p>
      <div class="bq-ready">HAZIR OLUN!</div></div>`;
  }
  if (v.phase === 'pre') {
    const c = catOf(v.qcat);
    return `<div class="bq-pre"><span class="bq-pre-n">SORU ${v.qi + 1}<small>/${v.count}</small></span><span class="bq-pre-icon">${c[1]}</span>
      <b class="bq-pre-cat">${esc(c[0])}</b><span class="bq-diff d${v.diff}">${DIFF[v.diff]}</span></div>`;
  }
  if (v.phase === 'question' || v.phase === 'reveal') {
    const c = catOf(v.qcat);
    return `<div class="bq-card">
      <div class="bq-meta"><span class="bq-num">SORU ${v.qi + 1}/${v.count}</span><span class="bq-chip">${c[1]} ${esc(c[0])}</span><span class="bq-diff d${v.diff}">${DIFF[v.diff]}</span>
        <span class="bq-ring" aria-hidden="true"><svg viewBox="0 0 44 44"><circle class="bg" r="19" cx="22" cy="22"/><circle class="fg" r="19" cx="22" cy="22"/></svg><b class="bq-sec">${v.time}</b></span></div>
      <div class="bq-bar"><i></i></div>
      <h2 class="bq-q">${esc(v.text)}</h2></div>
      <div class="bq-answers">${v.opts.map((o, i) => `<button type="button" class="bq-ans a${i}" data-c="${i}"><span class="bq-key">${LETTERS[i]}</span><span class="bq-txt">${esc(o)}</span><span class="bq-picks"></span></button>`).join('')}</div>
      <div class="bq-result" aria-live="polite"></div>`;
  }
  // ara / son sıralama
  const fin = v.phase !== 'board', max = Math.max(1, ...p.map(x => x.score)), medals = ['🥇', '🥈', '🥉'];
  return `<div class="bq-board ${fin ? 'fin' : ''}"><h2>${fin ? 'SON SIRALAMA' : 'ARA SIRALAMA'}<small>${fin ? `${v.count} soru tamamlandı` : `${v.qi + 1}/${v.count} soru`}</small></h2>
    <ol>${v.order.map((pi, r) => { const x = p[pi]; return `<li style="--pc:${x.color};--w:${Math.round(100 * x.score / max)}%;--d:${r * 90}ms" class="${pi === v.me ? 'me' : ''}">
      <span class="bq-rk">${medals[r] || r + 1}</span><span class="av" style="--pc:${x.color}">${initial(x.name)}</span>
      <span class="bq-bn"><b>${esc(x.name)}${pi === v.me ? ' <small>(sen)</small>' : ''}</b><small>${x.hits} doğru${x.streak >= 2 ? ` · 🔥${x.streak} seri` : ''}</small><i class="bq-bbar"></i></span>
      <span class="bq-bs">${x.score}</span></li>`; }).join('')}</ol></div>`;
}
function render(v) {
  const prev = V; V = v;
  if (!root) return;
  const key = (v.phase === 'question' || v.phase === 'reveal' ? 'qa' : v.phase) + ':' + v.qi;
  const stage = root.querySelector('.bq-stage');
  if (key !== built) { stage.innerHTML = stageFor(v); stage.dataset.phase = v.phase; built = key; if (!(prev && prev.qi === v.qi)) picked = null; }
  stage.dataset.phase = v.phase;
  root.querySelector('.bq').classList.toggle('reveal', v.phase === 'reveal');
  if (v.phase === 'question') {
    const nd = performance.now() + v.left;
    if (deadQi !== v.qi || Math.abs(nd - deadline) > 600) { deadline = nd; deadQi = v.qi; lastSec = -1; }
  }
  if (v.phase === 'reveal' && deadQi === v.qi) deadline = 0;
  updateQA(v);
  renderPlayers(v);
  renderStatus(v);
  tickUI();
}
function myChoice(v) {
  if (v.phase === 'reveal') { const r = v.last && v.last.res[v.me]; return r ? r.c : null; }
  if (v.mine != null) return v.mine;
  return picked && picked.qi === v.qi ? picked.c : null;
}
function updateQA(v) {
  if (v.phase !== 'question' && v.phase !== 'reveal') return;
  const mine = myChoice(v), btns = root.querySelectorAll('.bq-ans');
  const canPick = v.phase === 'question' && v.me >= 0 && mine == null && remainMs() > 0;
  btns.forEach(b => {
    const i = +b.dataset.c;
    b.disabled = !canPick;
    b.classList.toggle('picked', mine === i);
    if (v.phase === 'reveal') {
      const L = v.last, ok = i === L.correct;
      b.classList.toggle('ok', ok); b.classList.toggle('bad', !ok && mine === i); b.classList.toggle('dim', !ok && mine !== i);
      const who = L.res.filter(r => r.c === i);
      b.querySelector('.bq-picks').innerHTML = who.length && v.players.length > 1 ? `${v.players.length > 1 ? who.map(r => `<span class="av" style="--pc:${v.players[r.pi].color}" title="${esc(v.players[r.pi].name)}">${initial(v.players[r.pi].name)}</span>`).join('') : ''}<em>${who.length} kişi</em>` : '';
    } else b.classList.remove('ok', 'bad', 'dim');
  });
  const res = root.querySelector('.bq-result');
  if (v.phase === 'reveal' && v.players.length > 1) {
    const L = v.last;
    res.innerHTML = L.res.map(r => { const x = v.players[r.pi]; return `<span class="bq-rr ${r.ok ? 'ok' : r.c == null ? 'none' : 'no'} ${r.pi === v.me ? 'me' : ''}" style="--pc:${x.color}">
      <span class="av" style="--pc:${x.color}">${initial(x.name)}</span><b>${esc(x.name)}</b>
      ${r.ok ? `<em>+${r.pts}</em>${r.bonus ? `<i class="bq-fire">🔥+${r.bonus}</i>` : ''}<small>${(r.ms / 1000).toFixed(1)} sn</small>` : `<em>${r.c == null ? 'cevapsız' : '✗ 0'}</em>`}</span>`; }).join('');
    res.classList.add('show');
  } else { res.innerHTML = ''; res.classList.remove('show'); }
}
function renderPlayers(v) {
  const el = root.querySelector('.bq-players');
  el.innerHTML = v.players.map((x, i) => {
    let tag = '';
    if (v.phase === 'question') tag = v.answered && v.answered[i] ? '<span class="bq-tag done">✓</span>' : (x.online ? '<span class="bq-tag wait">…</span>' : '<span class="bq-tag off">⚠</span>');
    else if (v.phase === 'reveal' && v.last) { const r = v.last.res[i]; tag = r.ok ? `<span class="bq-tag gain">+${r.pts + r.bonus}</span>` : '<span class="bq-tag miss">✗</span>'; }
    const active = v.phase === 'question' && !(v.answered && v.answered[i]) && x.online;
    return `<div class="g-chip bq-pc ${active ? 'active' : ''} ${x.online ? '' : 'off'}" style="--pc:${x.color}"><span class="av" style="--pc:${x.color}">${initial(x.name)}</span>
      <b>${esc(x.name)}</b>${i === v.me ? '<small class="bq-you">sen</small>' : ''}<span class="g-num">${x.score}</span>${x.streak >= 2 ? `<span class="bq-streak" title="Doğru serisi">🔥${x.streak}</span>` : ''}${tag}</div>`;
  }).join('');
}
function renderStatus(v) {
  const el = root.querySelector('.bq-status'), n = v.players.length;
  let h = '';
  if (v.phase === 'intro') h = `<span class="g-turn">${n > 1 ? `${n} yarışmacı · herkes aynı anda cevaplar` : 'Tek kişilik yarışma'}</span>`;
  else if (v.phase === 'pre') h = `<span class="g-turn">Soru geliyor…</span>`;
  else if (v.phase === 'question') {
    const cnt = (v.answered || []).filter(Boolean).length, mine = myChoice(v);
    if (v.me < 0) h = `<span class="g-turn">👀 İzliyorsun · ${cnt}/${n} cevapladı</span>`;
    else if (mine != null) h = `<span class="g-turn">🔒 Cevabın kilitlendi: <b>${LETTERS[mine]}</b>${n > 1 ? ` · ${cnt}/${n} cevapladı` : ''}</span>`;
    else if (remainMs() <= 0) h = '<span class="g-turn">⏰ Süre doldu</span>';
    else h = `<span class="g-turn mine">⭐ Cevabını seç!${n > 1 ? ` · ${cnt}/${n}` : ''}</span>`;
  } else if (v.phase === 'reveal') {
    const r = v.me >= 0 && v.last ? v.last.res[v.me] : null;
    if (!r) h = `<span class="g-turn">Doğru cevap: <b>${LETTERS[v.last.correct]}</b></span>`;
    else if (r.ok) h = `<span class="g-turn win">✅ Doğru! +${r.pts + r.bonus} puan${r.bonus ? ` (seri bonusu +${r.bonus})` : ''}</span>`;
    else h = `<span class="g-turn bq-wrong">${r.c == null ? '⏰ Süre doldu' : '❌ Yanlış'} · doğru cevap <b>${LETTERS[v.last.correct]}</b></span>`;
  } else if (v.phase === 'board') h = '<span class="g-turn">Sıradaki soru birazdan…</span>';
  else { const t = v.order[0]; h = `<span class="g-turn win">🏆 ${n > 1 ? `${esc(v.players[t].name)} birinci!` : `${v.players[t].score} puan`}</span>`; }
  if (el.innerHTML !== h) el.innerHTML = h;
}
// Geri sayım: halka, çubuk, saniye ve son 5 saniyede tik sesi
function tickUI() {
  if (!root || !V) return;
  const ring = root.querySelector('.bq-ring'), bar = root.querySelector('.bq-bar i'), sec = root.querySelector('.bq-sec');
  if (!ring) return;
  const total = V.time * 1000;
  let frac, s;
  if (V.phase === 'question') { const r = remainMs(); frac = r / total; s = Math.ceil(r / 1000); }
  else { frac = 0; s = 0; }
  const C = 2 * Math.PI * 19;
  ring.querySelector('.fg').style.strokeDashoffset = String(C * (1 - frac));
  bar.style.transform = `scaleX(${frac})`;
  sec.textContent = V.phase === 'question' ? s : '✓';
  const warn = V.phase === 'question' && s <= 5;
  ring.classList.toggle('warn', warn); root.querySelector('.bq-bar').classList.toggle('warn', warn);
  if (V.phase === 'question' && s !== lastSec) {
    if (lastSec !== -1 && s <= 5 && s > 0) Sound.tick(s <= 2 ? .9 : .5);
    if (s === 0 && lastSec > 0) { updateQA(V); renderStatus(V); }
    lastSec = s;
  }
}
function choose(i) {
  const v = V;
  if (!v || v.phase !== 'question' || v.me < 0 || myChoice(v) != null || remainMs() <= 0) return;
  if (i < 0 || i > 3) return;
  picked = { qi: v.qi, c: i };
  Sound.init(); Sound.tick(.7);
  updateQA(v); renderStatus(v);
  ui.send({ t: 'ans', q: v.qi, c: i });
}
function onClick(e) { const b = e.target.closest('.bq-ans'); if (b && !b.disabled) choose(+b.dataset.c); }
function onKey(e) {
  if (!root || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
  if (document.querySelector('.overlay:not([hidden])')) return;
  const k = e.key.toLocaleLowerCase('tr-TR'), m = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 };
  if (k in m) { choose(m[k]); }
}
function mount(r, api) {
  root = r; ui = api; V = null; built = ''; picked = null; deadline = 0; deadQi = -1; lastSec = -1;
  root.innerHTML = `<div class="g-wrap bq"><div class="g-status bq-status"></div><div class="bq-stage"></div><div class="g-players bq-players"></div></div>`;
  root.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  clearInterval(loop); loop = setInterval(tickUI, 100);
}
function onEvent(e) {
  if (!root) return;
  const me = ui ? ui.me : -1;
  if (e.t === 'pre') Sound.whoosh();
  else if (e.t === 'q') Sound.stop();
  else if (e.t === 'ans') { if (e.pi !== me) Sound.tick(.25); }
  else if (e.t === 'reveal') {
    const r = (e.res || []).find(x => x.pi === me);
    if (!r) { Sound.whoosh(); return; }
    if (r.ok) { Sound.good(); flash('good'); banner(r.streak >= 3 ? `🔥 ${r.streak} SERİ! +${r.gain}` : `DOĞRU! +${r.gain}`, 'good'); }
    else { Sound.bad(); flash('bad'); banner(r.c == null ? 'SÜRE DOLDU' : 'YANLIŞ', 'bad'); }
  } else if (e.t === 'board') Sound.special();
  else if (e.t === 'final') {
    const solo = V && V.players.length === 1;
    if (e.pi === me) { Sound.solve(); FX.confetti(220); banner(solo ? 'YARIŞMA BİTTİ!' : 'ŞAMPİYON SENSİN!', 'good'); }
    else { Sound.special(); FX.confetti(60); if (V && V.players[e.pi]) banner(`${V.players[e.pi].name.toLocaleUpperCase('tr-TR')} ŞAMPİYON!`, 'pink'); }
  }
}

CFX.registerGame({
  id: 'bilgi', name: 'Bilgi Yarışması', icon: '🧠', color: '#8b3dff', min: 1, max: 6, hotseat: false, bot: false, localMin: 1,
  tagline: 'Herkes aynı anda cevaplar, hızlı olan kazanır',
  rules: 'Her soruda dört şık var; herkes kendi cihazından aynı anda cevaplar. Doğru cevap 100 puan, hızlı olana 100 puana kadar bonus, üst üste doğrulara seri bonusu. En çok puanı toplayan kazanır.',
  options: [
    { key: 'count', label: 'Soru sayısı', def: '10', choices: [{ v: '10', label: '10' }, { v: '15', label: '15' }, { v: '20', label: '20' }] },
    { key: 'cat', label: 'Kategori', def: 'mix', choices: [{ v: 'mix', label: '🎲 Karışık' }].concat(Object.keys(CATS).map(k => ({ v: k, label: `${CATS[k][1]} ${CATS[k][0]}` }))) },
    { key: 'time', label: 'Süre', def: '20', choices: [{ v: '15', label: '15 sn' }, { v: '20', label: '20 sn' }, { v: '30', label: '30 sn' }] }
  ],
  bank: BANK, cats: CATS,
  setup(players, opts, ctx) {
    opts = opts || {};
    const count = [10, 15, 20].includes(+opts.count) ? +opts.count : 10;
    const time = [15, 20, 30].includes(+opts.time) ? +opts.time : 20;
    const cat = CATS[opts.cat] ? opts.cat : 'mix';
    const z = () => players.map(() => 0);
    const st = {
      players: players.map(p => ({ name: p.name, color: p.color })), count, time, cat,
      qs: pickQuestions(count, cat), qi: -1, phase: 'intro', step: 0, until: Date.now() + T_INTRO,
      q: null, start: 0, deadline: 0, answers: players.map(() => null), last: null,
      scores: z(), streak: z(), best: z(), correctN: z(), fastMs: z(), online: players.map(() => true)
    };
    if (ctx) { arm(st, ctx); ctx.emit({ t: 'start' }, `Bilgi Yarışması başladı: ${count} soru · ${cat === 'mix' ? 'Karışık' : CATS[cat][0]} · ${time} sn.`, 'gold'); }
    return st;
  },
  action(st, pi, a, ctx) {
    if (!a || a.t !== 'ans' || st.phase !== 'question') return;
    if (!st.players[pi] || st.answers[pi] || (a.q | 0) !== st.qi) return;
    const c = a.c | 0; if (c < 0 || c > 3 || c !== a.c) return;
    const now = Date.now(); if (now > st.deadline + GRACE) return;
    st.answers[pi] = { c, ms: Math.max(0, Math.min(st.time * 1000, now - st.start)) };
    ctx.emit({ t: 'ans', pi });
    if (allIn(st, ctx)) reveal(st, ctx); else ctx.sync();
  },
  view(st, viewer) {
    const me = typeof viewer === 'number' && viewer >= 0 && viewer < st.players.length ? viewer : -1;
    const ph = st.phase;
    const v = { phase: ph, qi: st.qi, count: st.count, time: st.time, cat: st.cat, me, order: rankOrder(st),
      players: st.players.map((p, i) => ({ name: p.name, color: p.color, online: st.online[i] !== false, score: st.scores[i], streak: st.streak[i], hits: st.correctN[i] })) };
    if (st.q && ph !== 'intro') { v.qcat = st.q.cat; v.diff = st.q.diff; }
    if (ph === 'question' || ph === 'reveal') { v.text = st.q.text; v.opts = st.q.opts.slice(); }
    if (ph === 'question') {
      v.left = Math.max(0, st.deadline - Date.now());
      v.answered = st.answers.map(x => !!x);
      v.mine = me >= 0 && st.answers[me] ? st.answers[me].c : null;   // yalnız kendi seçimi; doğru şık yok
    }
    if (ph === 'reveal') v.last = st.last;
    return v;
  },
  turnOf() { return null; },
  onPresence(st, pi, online, ctx) {
    st.online[pi] = online;
    if (st.phase === 'question' && allIn(st, ctx)) reveal(st, ctx);
  },
  resume(st, ctx) { arm(st, ctx); },
  mount, render, onEvent,
  unmount() {
    if (root) root.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
    clearInterval(loop); loop = null;
    root = null; ui = null; V = null; built = ''; picked = null;
  }
});
})();
