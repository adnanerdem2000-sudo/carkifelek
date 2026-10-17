/* =========================================================================
   OYUN SALONU — KOMİK CEVAP
   Herkes kendine düşen esprili sorulara gizlice cevap yazar. Her soru iki
   oyuncuya gider; diğerleri isimsiz iki cevaptan komik olanı oylar. Oylar
   uçarak cevaba konar, yazarlar açıklanır. 3 tur; son tur herkese aynı soru.
   3–8 kişi online ya da tek cihazda bilgisayar rakiplerle.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial } = CFX;

/* ---------- soru havuzu (kategori → soru) ---------- */
const RAW = {
  hay: [
    'Kedilerin gizli toplantısındaki gündem maddesi:',
    'Bir köpeğin günlüğüne yazdığı en dramatik cümle:',
    'Penguenlerin tatile gitmek istediği yer:',
    'Bir zürafanın en büyük derdi:',
    'Akvaryumdaki balığın sahibine söylemek istediği şey:',
    'Bir papağanın asla tekrar etmemesi gereken cümle:',
    'Salyangozların düzenlediği yarışın adı:',
    'Bir ayının kış uykusundan uyanınca ilk sorusu:',
    'Tavuğun karşıdan karşıya geçmesinin gerçek sebebi:',
    'Bir karıncanın iş görüşmesinde saydığı güçlü yanı:',
    'Hamsterın tekerlekte koşarken düşündüğü şey:',
    'Bir ahtapotun sekiz koluyla aynı anda yaptığı işler:',
    'İneklerin kendi aralarında konuştuğu en popüler dedikodu:',
    'Bir baykuşun gece vardiyası hakkındaki şikâyeti:',
    'Bir kaplumbağanın aceleyle yaptığı tek şey:',
    'Kedinin masadaki bardağı düşürmeden önce düşündüğü şey:',
    'Bir aslanın ormanın kralı olarak çıkardığı ilk kanun:',
    'Güvercinlerin şehirdeki en sevdiği mekân:',
    'Bir köpeğin postacıya yazdığı özür mektubunun ilk cümlesi:',
    'Bir sincabın fındık sakladığı en saçma yer:',
    'Hayvanat bahçesindeki maymunların ziyaretçiler hakkındaki yorumu:',
    'Bir arının kraliçeye sunduğu bahane:',
    'Bir yunusun insanlara öğretmek istediği numara:',
    'Çiftlikteki horozun ötmek yerine yapmak istediği şey:',
    'Bir kurbağanın prense dönüşmeyi reddetme sebebi:',
    'Kedilerin insanları ayırdığı gizli kategori:'
  ],
  yem: [
    'Uzaylıların Dünya\'da ilk denediği yemek:',
    'Bir pizzanın üzerine asla konmaması gereken malzeme:',
    'Buzdolabının gece yarısı fısıldadığı şey:',
    'Lokanta menüsünde görülebilecek en tuhaf yemek adı:',
    'Annenin "Bir tabak daha ye" dediği yemeğin gizli tarifi:',
    'Bir dondurma çeşidine verilebilecek en kötü isim:',
    'Kahvaltı sofrasında kimsenin dokunmadığı yiyecek:',
    'Bir simidin hayattaki en büyük hayali:',
    'Patatesin kızartılmadan önceki son sözleri:',
    'Bir aşçının yemeği yaktığında kullandığı bahane:',
    'Çorbaya düşen sineğin garsona söylediği:',
    'Yemek yarışmasında jürinin yapabileceği en garip yorum:',
    'Yeni çıkan cips çeşidinin aroması:',
    'Bir sandviçin içinden çıkan en sürpriz malzeme:',
    'Mantının neden bu kadar küçük olduğunun açıklaması:',
    'Tencerenin kapağına söylediği romantik söz:',
    'Limonun bu kadar ekşi olmasının sebebi:',
    'Bir hamburgercinin yeni menüsünün adı:',
    'Diyet yapan birinin rüyasında gördüğü yemek:',
    'Bir çaydanlığın gün boyu şikâyet ettiği şey:',
    'Karpuzun çekirdeklerine verdiği öğüt:',
    'Bir lahmacunun özgeçmişindeki en önemli başarı:',
    'Mikrodalga fırının gizli yeteneği:',
    'Bir kekin kabarmamasının gerçek nedeni:',
    'Baklavanın kat sayısıyla ilgili büyük sır:',
    'Midesi guruldayan birinin midesine yaptığı konuşma:'
  ],
  okl: [
    'Öğretmenin asla söylemeyeceği cümle:',
    'Ödevi yapmamak için uydurulan en yaratıcı bahane:',
    'Okul zilinin yerine çalması gereken ses:',
    'Teneffüste oynanabilecek en saçma oyun:',
    'Karne gününde anneye söylenecek en iyi açılış cümlesi:',
    'Bir silginin kaleme sitemi:',
    'Okul kantininde satılması gereken yeni ürün:',
    'Matematik problemindeki adamın 47 karpuz almasının sebebi:',
    'Sınıf başkanı adayının seçim vaadi:',
    'Müdürün anons sisteminden yapmak istediği gizli duyuru:',
    'Tahtanın tebeşire söylediği:',
    'Okul gezisinde gidilebilecek en tuhaf yer:',
    'Okullarda yeni açılan bir dersin adı:',
    'Sınavdan önce kalemine yaptığın moral konuşması:',
    'Kopya çekerken yakalanan birinin söylediği ilk şey:',
    'Okul çantasının dibinden çıkan en saçma şey:',
    'Beden eğitimi öğretmeninin icat ettiği yeni spor:',
    'Tarih kitabına girmesi gereken önemsiz bir olay:',
    'Öğretmenler odasında gerçekte konuşulan konu:',
    'Okul servisi şoförünün radyoda açtığı yayın:',
    'Fen deneyi ters gidince ortaya çıkan şey:',
    'Yaz tatili ödevine yazılan ilk cümle:',
    'Kütüphanecinin sessizlik kuralına eklediği yeni madde:',
    'Sınıfın en arka sırasında kurulan gizli kulübün adı:',
    'Okul yemekhanesinde cuma günü çıkan gizemli yemek:',
    'Öğretmen "sürpriz yazılı" deyince sınıfın yaptığı ilk şey:'
  ],
  tek: [
    'Bir robotun sabah alarmında yazan not:',
    'Telefonunun şarjı %1\'deyken attığın son mesaj:',
    'Akıllı buzdolabının sana gönderdiği bildirim:',
    'Bir yapay zekânın gizli hobisi:',
    'Wi-Fi şifresi olarak kullanılabilecek en komik cümle:',
    'Robot süpürgenin evde keşfettiği en büyük sır:',
    'Bilgisayarın "Güncelleniyor" derken gerçekte yaptığı şey:',
    'Navigasyon uygulamasının en sinirli yönlendirmesi:',
    'Bir uygulamanın asla göstermemesi gereken hata mesajı:',
    'Akıllı saatin seni motive etmek için söylediği:',
    'İnsan olmaya çalışan bir robotun yaptığı ilk hata:',
    'Aile grubuna yanlışlıkla gönderilen mesaj:',
    'Otomatik düzeltmenin yaptığı en büyük felaket:',
    'Yeni çıkan bir sosyal medya uygulamasının adı:',
    'Yazıcının neden hiç çalışmadığına dair itirafı:',
    'Kulaklık kablosunun kendi kendine düğümlenme sebebi:',
    'Bir oyun konsolunun tatile çıkınca yaptığı ilk şey:',
    'Akıllı evin sahibine kızınca kilitlediği şey:',
    'Bir robotun yazdığı aşk şiirinin ilk dizesi:',
    'Bilgisayar virüsünün ekranda bıraktığı not:',
    'Emekli olan bir robotun hayali:',
    'Televizyon kumandasının kaybolunca gittiği yer:',
    'Sesli asistanın asla cevap vermemesi gereken soru:',
    'Bir dronun gökyüzünden gördüğü en garip şey:',
    'Şifreni unutunca karşına çıkan güvenlik sorusu:',
    'Robot köpeğin sahibinden istediği oyuncak:'
  ],
  kah: [
    'Bir süper kahramanın en işe yaramaz gücü:',
    'Bir süper kahramana verilebilecek en kötü isim:',
    'Bir büyücünün ters giden büyüsü:',
    'Ejderhanın şatoyu beklerken sıkılınca yaptığı şey:',
    'Lambadaki cinin yanlış anladığı dilek:',
    'Süper kahraman pelerininin etiketindeki yıkama talimatı:',
    'Kötü adamın dünyayı ele geçirme planındaki en zayıf halka:',
    'Sihirli değneğin kullanım kılavuzundaki uyarı:',
    'Masallardaki devin gizli korkusu:',
    'Bir süper kahramanın emekli olduktan sonraki mesleği:',
    'Uçabilen bir insanın havada yaşadığı en büyük sorun:',
    'Görünmez olsaydın yapacağın ilk masum şaka:',
    'Bir süper kahramanın gizli kimliğini ele veren an:',
    'Korsan kaptanın hazine haritasındaki yanlış yönlendirme:',
    'Bir vampirin diş hekimine söylediği:',
    'Kırmızı Başlıklı Kız\'ın sepetinde aslında olan şey:',
    'Bir hayaletin evdekileri korkutmak için yaptığı en zayıf girişim:',
    'Ölümsüzlük iksirinin yan etkisi:',
    'Sihir okulundaki en sıkıcı ders:',
    'Bir şövalyenin zırhının içinde unuttuğu şey:',
    'Süper kötünün gizli üssünün Wi-Fi adı:',
    'Zaman makinesiyle geçmişe gidince yapılacak en saçma şey:',
    'Bir cücenin dev olunca yaptığı ilk şey:',
    'Süper kahraman ekibine katılma mülakatındaki soru:',
    'Bir peri masalının yeni ve modern sonu:',
    'Kahramanın kötü adama söylediği en etkisiz tehdit:'
  ],
  uza: [
    'Uzaylıların Dünya\'ya gönderdiği ilk mesaj:',
    'Ay\'da açılan ilk dükkân:',
    'Bir astronotun uzay istasyonunda en çok özlediği şey:',
    'Mars\'ta satılan hatıra eşyası:',
    'Uzaylıların insanları izledikten sonra yazdığı raporun başlığı:',
    'Bir UFO\'nun park cezası yemesinin sebebi:',
    'Uzay gemisindeki en gereksiz düğme:',
    '3000 yılında okullarda okutulan ders:',
    'Geleceğin arabalarındaki yeni özellik:',
    'Uzaylıların Dünya\'dan götürmek istediği tek şey:',
    'Güneş\'in Ay\'a bıraktığı not:',
    'Bir kara deliğin içinden çıkan eşya:',
    'Uzaylı bir ailenin akşam yemeğinde konuştuğu konu:',
    'Satürn\'ün halkalarının gerçek kullanım amacı:',
    'Uzayda yaşanan ilk trafik kazasının sebebi:',
    'Bir yıldızın dilek tutan insanlara cevabı:',
    'Uzaylı turistin Dünya\'daki en büyük hayal kırıklığı:',
    'Bir göktaşının Dünya\'ya düşmeden önceki son düşüncesi:',
    'Geleceğin moda trendi:',
    'Robotların yönettiği bir gelecekte insanların görevi:',
    'Bir uzaylının Türkçe öğrenirken zorlandığı kelime:',
    'Uzay istasyonunda yasak olan şey:',
    'Plüton\'un gezegenlikten çıkarılınca yazdığı itiraz dilekçesi:',
    'Ay\'daki ayak izinin yanında bulunan not:',
    'Geleceğin ışınlanma cihazındaki küçük hata:',
    'Uzaylıların insanlarda hiç anlamadığı alışkanlık:'
  ],
  ev: [
    'Annenin "Beş dakika" demesinin gerçek anlamı:',
    'Evde kaybolan tek çorabın gittiği yer:',
    'Babanın uzaktan kumandayı kimseye vermeme sebebi:',
    'Komşunun duvarından gelen gizemli ses:',
    'Kardeşinin odana girince söylediği ilk bahane:',
    'Çamaşır makinesinin çorap yeme bahanesi:',
    'Misafir gelince ortadan kaldırılan eşyaların gittiği yer:',
    'Pazartesi sabahına verilecek yeni isim:',
    'Anneannenin "Üşüdün mü?" sorusundan sonra gelen şey:',
    'Aile mesaj grubunun adı:',
    'Kanepenin altından çıkan en şaşırtıcı şey:',
    'Evdeki saksı bitkisinin sahibine söylemek istediği şey:',
    'Bayramda büyüklerin en sık sorduğu soru:',
    'Elektrikler kesilince ailenin yaptığı ilk şey:',
    'Bir yastığın gece boyunca dinlediği şey:',
    'Banyoda şarkı söylerken gelen alkışın sahibi:',
    'Babanın "Ben gençken..." diye başlayan hikâyesinin sonu:',
    'Ev anahtarlarının her sabah saklandığı yer:',
    'Kapı zili çalınca ev halkının panik planı:',
    'Bahar temizliğinde bulunan en eski şey:',
    'Aynanın sabahları sana söylemekten çekindiği şey:',
    'Kedinin evin gerçek sahibi olduğunu kanıtlayan belge:',
    'Uyku vakti çocukların uydurduğu en iyi bahane:',
    'Buzdolabı mıknatıslarının gizli görevi:',
    'Hafta sonu erkenden uyandırılınca söylenen ilk kelime:',
    'Annenin "Ben sana demiştim" demeden önceki bakışının anlamı:'
  ],
  mes: [
    'Bir itfaiyecinin ağaçtaki kediye söylediği:',
    'Diş hekiminin ağzın doluyken sorduğu soru:',
    'Bir pilotun anonsta asla söylememesi gereken şey:',
    'Kuaförün "Biraz uzun kalsın" lafından anladığı şey:',
    'Siparişi karıştıran garsonun masaya getirdiği şey:',
    'Hava durumu sunucusunun en dürüst tahmini:',
    'Ünlü bir dedektifin çözemediği en basit vaka:',
    'Şefin mutfakta bağırdığı en garip komut:',
    'Bir postacının en büyük korkusu:',
    'Müze bekçisinin gece sıkılınca yaptığı şey:',
    'Bir sihirbazın gösterisinde ters giden numara:',
    'Yeni ortaya çıkan tuhaf bir meslek:',
    'Bir doktorun reçeteye yazdığı en tuhaf tavsiye:',
    'Patronun toplantıda söylediği en saçma motivasyon cümlesi:',
    'Bir çiftçinin ineklerine yaptığı sabah konuşması:',
    'Hayvanat bahçesi bakıcısı ilanında aranan nitelik:',
    'Taksicinin yolda anlattığı en uzun hikâyenin konusu:',
    'Bir palyaçonun izin gününde yaptığı şey:',
    'Bir kütüphanecinin kitaplara fısıldadığı:',
    'Cankurtaranın düdüğünü çalmasının gerçek sebebi:',
    'Astronot olmak isteyen birinin özgeçmişindeki tek tecrübe:',
    'Bir bilim insanının laboratuvarda yanlışlıkla icat ettiği şey:',
    'Bir futbol hakeminin maç sonu röportajı:',
    'Bir mimarın tasarladığı en garip bina:',
    'Bir dalgıcın denizin dibinde bulduğu en tuhaf şey:',
    'Bir orkestra şefinin çubuğunu kaybedince kullandığı şey:'
  ],
  tat: [
    'Tatil valizine mutlaka konan gereksiz eşya:',
    'Plajda şemsiyesini rüzgâra kaptıran birinin bağırdığı:',
    'Kamp ateşi başında anlatılan en korkunç (ama komik) hikâye:',
    'Otel odasında sunulan en tuhaf hizmet:',
    'Yeni icat edilen olimpik spor:',
    'Maratonu bitiremeyen koşucunun bahanesi:',
    'Futbol takımının taraftarlara yazdığı özür mektubu:',
    'Bir dağcının zirveye ulaşınca söylediği ilk söz:',
    'Lunaparkta açılan yeni oyuncağın adı:',
    'Kumdan kalenin dalgaya son sözleri:',
    'Tatil fotoğrafının altına yazılacak en abartılı açıklama:',
    'Havalimanında güvenlikten geçerken çantandan çıkan şey:',
    'Bir turist rehberinin uydurduğu tarihi bilgi:',
    'Kar tatilinde kayak yerine kullanılan şey:',
    'Satranç oyuncusunun maç sırasında rakibine fısıldadığı:',
    'Bir bisikletin sahibine söylemek istediği şey:',
    'Piknikte karıncaların ilk kaçırdığı yiyecek:',
    'Yüzme havuzuna asılan yeni kural:',
    'Takım maskotunun kostümün içinde düşündüğü şey:',
    'Uzun yol otobüsündeki yeni ikram:',
    'Kalecinin gol yedikten sonra topa söylediği:',
    'Çadırın gece rüzgârda uçup gitmesinin sebebi:',
    'Tatilden dönünce iş yerine getirilen en tuhaf hediye:',
    'Bir balıkçının oltasına takılan en büyük "balık":',
    'Yoga hocasının icat ettiği yeni poz:',
    'Sahilde satılan en gereksiz şey:'
  ],
  gen: [
    'Bir bulutun yere düşen yağmur damlasına son mesajı:',
    'Asla icat edilmemesi gereken bir alet:',
    'Emekli bir kalemin yazacağı kitabın adı:',
    'Trafik ışıklarının gizli dili:',
    'Asansörde söylenebilecek en garip cümle:',
    'Rüyada uçarken birden düşmenin gerçek sebebi:',
    'Müzede sergilenmesi gereken sıradan bir eşya:',
    'Yeni bir bayramın adı ve nasıl kutlandığı:',
    'Bir şemsiyenin güneşli günlerde yaptığı şey:',
    'Dünyanın en kısa korku hikâyesi:',
    'Bir taşın hayatındaki en büyük macera:',
    'Gökkuşağına eklenmesi gereken yeni renk:',
    'Rekorlar kitabına girmek için yapılabilecek en saçma şey:',
    'Çok kibar bir hırsızın bıraktığı not:',
    'Saatlerin ileri geri alınmasının gerçek sebebi:',
    'Park bankının gördüğü en tuhaf şey:',
    'Bir mektubun zarfına söylediği:',
    'Yeni uydurulmuş bir atasözü:',
    'Bir filme verilebilecek en kötü isim:',
    'Erken kalkanlar derneğinin sloganı:',
    'Bir trafik konisinin hayali:',
    'Doğum günü pastasındaki mumların dileği:',
    'Kayıp eşya bürosundaki en garip eşya:',
    'Gölgenin sahibinden bıktığı an:',
    'Dönmekten sıkılan bir rüzgârgülünün yaptığı şey:',
    'Dünyaya bir günlüğüne getirilecek yeni kural:',
    'Pazar yerinde duyulan en tuhaf satıcı bağırışı:',
    'Hapşırana "çok yaşa" yerine söylenecek yeni söz:',
    'Kâğıttan uçağın pilotunun anonsu:',
    '"İtiniz" yazmasına rağmen çekilen kapının tepkisi:'
  ]
};
const PROMPTS = [];
for (const c of Object.keys(RAW)) for (const t of RAW[c]) PROMPTS.push({ t, c });

/* ---------- bilgisayar rakiplerin cevap havuzu ---------- */
const BOT = {
  hay: ['Daha çok mama, daha az banyo', 'Kutunun içinde sonsuz uyku hakkı', 'Tüy dökmek bir sanattır', 'İnsanları eğitme programı', 'Tasmanın modası geçti', 'Kuyruk kovalamak olimpik spor olsun', 'Postacı aslında bir casus', 'Sabah beşte herkesi uyandırmak', 'Güneşte uzun bir şekerleme', 'Balık kılçığından bir taç', 'Kanepe artık resmen bizim', 'Fareler sendika kurdu', 'Havuç fiyatlarına zam protestosu', 'Çok yavaş ama çok kararlı bir telaş', 'Yuvaya Wi-Fi bağlatmak', 'Pati iziyle imza kampanyası', 'Kediler toplantıya hiç gelmedi', 'Tüylü başkanlık seçimi', 'Ayna karşısında havlama provası', 'Gizli fındık deposu ifşa oldu', 'Herkes bana bakıyor, poz veriyorum'],
  yem: ['Çikolatalı turşu', 'Ketçaplı dondurma', 'Sarımsaklı sakız', 'Üç günlük bayat simit', 'Kendi kendini yiyen kek', 'Mayonezli çay', 'Annemin "az kaldı" dediği yemek', 'Fazla tuzlu bir hayal kırıklığı', 'Pizzanın üstüne pilav', 'Gece yarısı gizli peynir operasyonu', 'Patlıcan, yine patlıcan', 'Brokoli kılığında kurabiye', 'Yanmış ama gururlu bir börek', 'Acılı muhallebi', 'Sucuklu sütlaç', 'Diyet baklava (yok öyle bir şey)', 'Menüde yazan "şefin keyfi"', 'Fasulyeyle aramızda bir dostluk var', 'Çay demlenene kadar sabır', 'Çıtır çıtır bir hayal kırıklığı', 'Bir lokma daha, son lokma (yalan)'],
  okl: ['Ödevimi robot süpürge yedi', 'Teneffüs artık 45 dakika', 'Yarın okul tatil!', 'Tebeşir tozundan bir bulut', 'Şarkılı yoklama', 'Kantinde bedava tost', 'Silgi kokusu terapisi', 'Karne yerine "Denedi" belgesi', 'Karpuzcu amca yine 47 tane aldı', 'Pazartesi sınavı iptal edildi', 'Öğretmenler odasında gizli çay partisi', 'Defterin son sayfasındaki çizimler', 'Ödev mi? Hangi ödev?', 'Sıranın altındaki antika sakızlar', 'Zil çalınca ışık hızında koşu', 'Kopya kâğıdı kadar küçük bir not', 'Okul servisinde karaoke', 'Fen deneyinde patlayan volkan', 'Herkese tam not, benden', 'Tahtada unutulmuş dev bir çizim', 'Sessiz okuma yerine sessiz uyuma'],
  tek: ['Şarjım bitti, beni arama', 'Güncelleme 1/9845', 'Bugün kendimi yeniden başlattım', 'Wi-Fi şifresi: sorma123', 'Yükleniyor... hâlâ yükleniyor...', 'Robot da olsam pazartesiyi sevmem', 'Sesli asistan bana küstü', 'Otomatik düzeltme: "patates"', 'Kumanda yine kanepenin içinde', 'Bip bop, kahve lazım', 'Hata 404: Motivasyon bulunamadı', 'Yazıcı sadece cuma günleri çalışır', 'Kablosuz kulaklığın tek teki kayıp', 'Bildirim: Su içmeyi yine unuttun', 'Robot süpürge kanepe altında mahsur', 'Şarj kablosu tam üç metre kısa', 'Yapay zekâ da bilmiyormuş', 'Akıllı buzdolabı bana diyet önerdi', 'Uygulama yanıt vermiyor, ben de', 'Şarj %1, umut %100', 'Beni kapatıp açtılar, her şey düzeldi'],
  kah: ['Uçabiliyor ama sadece üç santim', 'Kaplumbağa Hızı Adam', 'Pelerin elde yıkanmalıdır', 'Görünmezlik, ama sadece gözler kapalıyken', 'Her seferinde yanlış otobüse binmek', 'Ejderha sadece ılık hava üflüyor', 'Büyü yanlışlıkla herkesi ördek yaptı', 'Kötü adam sıra beklemeyi sevmiyor', 'Sihirli değnek kalem pille çalışıyor', 'Ölümsüzlük ama bitmeyen hıçkırık', 'Pelerinine takılıp düşen kahraman', 'Gizli kimlik: mahallenin bakkalı', 'Süper kötünün annesi aradı', 'Dev aslında örümcekten korkuyor', 'Lamba cini yıllık izinde', 'Kahramanın tek zaafı: kurabiye', 'Uçan halı otoparkta kaldı', 'Zırhın içinde kayıp bir sandviç', 'Büyü kitabı yemek tarifi çıktı', 'Kaptan Yavaş Ama Emin', 'Wi-Fi adı: "BuradaKötüYok"'],
  uza: ['Merhaba, çayınız var mı?', 'Ay\'da lahmacun salonu', 'Yerçekimsiz saç modeli', 'Mars hatırası: bir avuç kırmızı toz', 'İnsanlar neden pazartesiyi icat etti?', 'UFO yanlış yere park etti', 'Uzay gemisinde kaybolan kumanda', 'Işınlanınca bir terlik geride kaldı', 'Kara delikten çıkan tek çorap', 'Uzaylılar trafikte korna çalmıyor', 'Satürn\'ün halkaları aslında hulahop', 'Ay\'a giden dolmuş', 'Uzay yemeği: tüpte mantı', 'Geleceğin modası: alüminyum folyo', 'Robotlar yönetiyor, biz çay demliyoruz', 'Plüton hâlâ küs', 'Uzaylılar kebabı çok sevdi', 'Galaksiler arası mesaj grubu', 'Uzay istasyonunda zıplamak yasak', 'Astronot evdeki kedisini özlemiş', 'Bip! Barış için geldik (ve börek)'],
  ev: ['Beş dakika = iki saat', 'Tek çorap paralel evrene gitti', 'Kumanda babanın tahtıdır', 'Komşu gece üçte matkapla konser veriyor', 'Misafir gelince her şey dolaba', 'Pazartesi yerine "Pazar Bis"', '"Üşüdün, bir hırka daha giy"', 'Aile grubu: "Günaydın" çiçekleri', 'Kanepenin altından 2009 model kek', 'Bitki: "Su ver, sohbet etme"', '"Okul nasıl gidiyor bakalım?"', 'Elektrik kesilince mum ve dedikodu', 'Banyo konseri, kedi tek seyirci', '"Ben gençken her yere yürürdük"', 'Anahtar hep son baktığın yerde', 'Kapı çalınca herkes yere yatar', 'Temizlikte bulunan kayıp hazineler', 'Kedinin tapusu: imzasız ama geçerli', 'Bir bardak su daha lütfen', 'Mıknatıslar aslında buzdolabını tutuyor', 'O meşhur "ben demiştim" bakışı'],
  mes: ['Aşağıya bakma, ben de bakmıyorum', 'Ağzın açık, nasılsın bakalım?', 'Sağdaki düğme neydi ya?', 'Biraz uzun = tamamen kel', 'Çorba yerine dondurma', 'Yarın hava: belki', 'Kayıp çorap vakası', '"Daha çok tereyağı!"', 'Küçük ama çok gürültülü bir köpek', 'Müzede heykellerle dans', 'Tavşan şapkadan çıkmayı reddetti', 'Profesyonel kanepe test uzmanı', 'Reçete: bol uyku ve bir dondurma', '"Hepimiz bir aileyiz, maaş yok"', 'İneklere günaydın şarkısı', '"Ben bu yolları bilirim"', 'Palyaço izin gününde çok ciddi', 'Düdük sadece ritim tutmak için', 'Laboratuvarda yanlışlıkla çikolatalı turşu', '"Ben bir şey görmedim"', 'Baş aşağı ama çok şık bir bina'],
  tat: ['Valizde üç kat kazak (yaz ortasında)', 'Şemsiye uçtu, ben de peşinden', 'Kamp hikâyesi: "Wi-Fi yok!"', 'Otelde yastık menüsü', 'Olimpik kanepe atlama', 'Maratonda simitçiye takıldım', '"Kupayı bir dahaki sefere alırız"', '"Asansör yok muydu?"', 'Yavaş dönen dönme dolap', 'Kum kalesi: "Beni unutmayın!"', '"Sanki cennet" (ayağım yandı)', 'Çantadan bir kavanoz turşu çıktı', 'Rehber: "Bu taşı ben koydum"', 'Kayak yerine tepsi', '"Atın nereye gidiyor öyle?"', 'Karıncalar bayram etti', 'Havuzda simitle dans yasak', 'Maskotun içi sauna gibi', 'Limon kolonyalı kek ikramı', 'Oltaya eski bir ayakkabı takıldı', 'Yoga pozu: yorgun patates'],
  gen: []
};
const GENERIC = ['Tamamen tesadüf, yemin ederim', 'Bunu annem bile bilmiyor', 'Üç kilo közlenmiş patlıcan', 'Gizli bir dans gösterisi', 'Bir kova dolusu konfeti', 'Salı günleri yasak', 'Sessizce ağlayan bir terlik', 'Yanlışlıkla 400 tane lahmacun', 'Uzaktan kumandalı pijama', 'Kimse sormadı ama: şemsiye', 'Ayakkabı bağcığından bir köprü', 'Dünyanın en uzun "hıı"sı', 'Kocaman bir "ups!"', 'Kırk yıllık bir sakız', 'Bir paket kraker ve büyük hayaller', 'Kendi kendini alkışlayan eller', 'Canı sıkılmış bir zürafa', 'Tavana yapışmış bir kek', 'Çok kibar bir ördek', 'Hep yanlış zamanda hapşırmak', 'Pijamayla resmi toplantı', 'Dedemin efsanevi bıyığı', 'Bulaşık makinesinin aşk mektubu', 'Mikrofonsuz bir konser', 'Gizli bir çorap koleksiyonu', 'Sabahın altısında trompet', 'Üstünde "acil değil" yazan acil not', 'Çok ciddi bir kaplumbağa', 'Patates! Her şeyin cevabı patates', 'Bir kâse pilav ve bir sır', 'Tek kanatlı bir uçan halı', 'Kimsenin anlamadığı bir espri', 'Yarım kalmış bir bulmaca', 'Aşırı heyecanlı bir hamster', 'Durmadan öten oyuncak ördek', 'Kuzenimin uydurduğu bir kelime', 'Bir yudum çay, bir ton dram', 'Biri bana bir pasta borçlu', 'Herkes alkışlasın, ben bekliyorum', 'Bunu ancak bir penguen anlar'];
BOT.gen = GENERIC;

/* ---------- sabitler ---------- */
const MAXLEN = 60, NONE_TX = '(cevap gelmedi)';
const INTRO_MS = 3800, VOTE_MS = 10000, FVOTE_MS = 20000, REVEAL_MS = 6200, SWEEP_EXTRA = 1200, BOARD_MS = 6500, FREVEAL_MS = 9500, EMPTY_MS = 2600;
const PTS = 100, SWEEP_BONUS = 250;
const ROUND_NAME = r => r === 3 ? 'SON TUR' : `${r}. TUR`;

/* ---------- yardımcılar (yöneten cihaz) ---------- */
const rnd = (a, b) => a + Math.random() * (b - a);
function shuf(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function clean(tx) {
  if (typeof tx !== 'string') return '';
  const s = tx.replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e]/g, ' ').replace(/\s+/g, ' ').trim();
  return [...s].slice(0, MAXLEN).join('').trim();
}
const pairKey = (a, b) => a < b ? a + '-' + b : b + '-' + a;
// Eşleştirme: her soru tam 2 farklı oyuncuya, her oyuncuya tam 2 soru.
// Rastgele bir sıralamada i. soru = (s[i], s[i+1 mod n]). Önceki turlardaki ikilileri tekrarlamamaya çalışır.
function makePairs(n, prev) {
  const seen = new Set((prev || []).map(p => pairKey(p[0], p[1])));
  let best = null, bestCost = Infinity;
  for (let t = 0; t < 400 && bestCost > 0; t++) {
    const s = shuf(Array.from({ length: n }, (_, i) => i));
    const pairs = s.map((p, i) => [p, s[(i + 1) % n]]);
    const cost = pairs.filter(p => seen.has(pairKey(p[0], p[1]))).length;
    if (cost < bestCost) { best = pairs; bestCost = cost; }
  }
  return shuf(best).map(p => Math.random() < .5 ? p : [p[1], p[0]]);
}
// Bir kapışmanın puanı: oy × 100 × çarpan; rakip gerçekten cevap verdiyse ve tüm oylar tek tarafa gittiyse KAPIŞMA bonusu
function scoreMatch(votes, none, hidden, mult) {
  const c = [0, 0];
  votes.forEach(v => { if ((v === 0 || v === 1) && !hidden[v] && !none[v]) c[v]++; });
  const pts = c.map(x => x * PTS * mult);
  let sweep = -1;
  for (const k of [0, 1]) if (c[k] > 0 && c[1 - k] === 0 && !none[1 - k] && !hidden[1 - k]) sweep = k;
  if (sweep >= 0) pts[sweep] += SWEEP_BONUS * mult;
  return { c, pts, sweep };
}
function scoreFinal(picks, order, mult) {
  const c = order.map(() => 0);
  picks.forEach(ks => { if (Array.isArray(ks)) ks.forEach(k => { if (c[k] != null) c[k]++; }); });
  return { c, pts: c.map(x => x * PTS * mult) };
}

/* ---------- kurallar ---------- */
const nOf = st => st.pl.length;
const isBot = (st, i) => !!st.pl[i].isBot;
function drawPrompt(st) {
  if (st.dp >= st.deck.length) { st.deck = shuf(PROMPTS.map((_, i) => i)); st.dp = 0; }
  return st.deck[st.dp++];
}
const myMus = (st, pi) => st.mus.map((m, i) => i).filter(i => st.mus[i].a.includes(pi));
function doneAnswer(st, pi) {
  if (st.phase === 'fanswer') return st.fin.ans[pi] != null;
  return myMus(st, pi).every(i => st.mus[i].ans[st.mus[i].a.indexOf(pi)] != null);
}
// "Gizle" oylamasına katılanlar: bağlı insan oyuncular (cevabın yazarı hariç)
const electorate = (st, author) => st.pl.map((_, i) => i).filter(i => !isBot(st, i) && st.on[i] && i !== author);
// oylama: kapışma
const canVoteMu = (st, pi) => {
  const mu = st.mus[st.cur];
  if (!mu || st.phase !== 'vote' || !st.on[pi] || mu.a.includes(pi)) return false;
  return [0, 1].some(k => !mu.none[k] && !mu.hidden[k]);
};
const muVoters = st => st.pl.map((_, i) => i).filter(i => canVoteMu(st, i));
// oylama: son tur
function finValid(st, pi) { const f = st.fin; return f.order.map((a, k) => k).filter(k => f.order[k] !== pi && !f.none[f.order[k]] && !f.hidden[f.order[k]]); }
const finReq = (st, pi) => Math.min(2, finValid(st, pi).length);
const canVoteFin = (st, pi) => st.phase === 'fvote' && st.on[pi] && finReq(st, pi) > 0;
const finVoters = st => st.pl.map((_, i) => i).filter(i => canVoteFin(st, i));

function setPhase(st, ctx, phase, ms) {
  st.phase = phase; st.tk++;
  if (ms && DEF && DEF.speed) ms = Math.round(ms * DEF.speed);     // yalnızca testler için (varsayılan 1)
  st.dur = ms || 0; st.endAt = ms ? Date.now() + ms : 0;
}
function startRound(st, ctx) {
  st.round++; st.mult = st.round; st.gain = st.pl.map(() => 0);
  setPhase(st, ctx, 'intro', INTRO_MS);
  const how = st.round === 3 ? 'herkes aynı soruya cevap yazıyor, puanlar ×3!' : `herkese 2 soru düştü${st.round === 2 ? ', puanlar ×2!' : '.'}`;
  ctx.emit({ t: 'round', r: st.round }, `${ROUND_NAME(st.round).toLocaleLowerCase('tr-TR').replace('son tur', 'Son tur')} başlıyor: ${how}`, 'gold');
  ctx.sync(); arm(st, ctx);
}
function startAnswer(st, ctx) {
  if (st.round < 3) {
    const pairs = makePairs(nOf(st), st.prevPairs);
    st.prevPairs = st.prevPairs.concat(pairs);
    st.mus = pairs.map(a => ({ q: drawPrompt(st), a, ans: [null, null], none: [false, false], hide: [[], []], hidden: [false, false], votes: st.pl.map(() => -1), res: null }));
    st.cur = -1;
    setPhase(st, ctx, 'answer', st.ansSec * 1000);
  } else {
    st.fin = { q: drawPrompt(st), ans: st.pl.map(() => null), none: st.pl.map(() => false), hide: st.pl.map(() => []), hidden: st.pl.map(() => false), order: [], picks: st.pl.map(() => null), res: null };
    st.mus = []; st.cur = -1;
    setPhase(st, ctx, 'fanswer', st.ansSec * 1000);
  }
  ctx.emit({ t: 'astart' });
  ctx.sync(); arm(st, ctx);
}
function allAnswered(st) { return st.pl.every((_, i) => !st.on[i] || doneAnswer(st, i)); }
function humansAnswered(st) { return st.pl.every((_, i) => isBot(st, i) || !st.on[i] || doneAnswer(st, i)); }
function submitAnswer(st, ctx, pi, k, raw) {
  const tx = clean(raw); if (!tx) return false;
  if (st.phase === 'answer') {
    const list = myMus(st, pi); const m = list[k | 0]; if (m == null) return false;
    const mu = st.mus[m], side = mu.a.indexOf(pi);
    if (mu.ans[side] != null) return false;
    mu.ans[side] = tx;
  } else if (st.phase === 'fanswer') {
    if (st.fin.ans[pi] != null) return false;
    st.fin.ans[pi] = tx;
  } else return false;
  const fin = doneAnswer(st, pi);
  ctx.emit({ t: 'answered', pi, fin }, fin ? `${st.pl[pi].name} cevaplarını gönderdi.` : null);
  if (allAnswered(st)) { closeAnswers(st, ctx); return true; }
  ctx.sync();
  if (fin && humansAnswered(st)) hurryBots(st, ctx);
  return true;
}
function closeAnswers(st, ctx) {
  if (st.phase === 'answer') {
    let miss = 0;
    for (const mu of st.mus) for (const k of [0, 1]) if (mu.ans[k] == null) { mu.ans[k] = NONE_TX; mu.none[k] = true; miss++; }
    ctx.emit({ t: 'aclose' }, miss ? `Süre doldu! ${miss} cevap gelmedi.` : 'Tüm cevaplar geldi. Oylama başlıyor!');
    nextVote(st, ctx);
  } else if (st.phase === 'fanswer') {
    const f = st.fin; let miss = 0;
    f.ans.forEach((a, i) => { if (a == null) { f.ans[i] = NONE_TX; f.none[i] = true; miss++; } });
    f.order = shuf(st.pl.map((_, i) => i));
    setPhase(st, ctx, 'fvote', FVOTE_MS);
    ctx.emit({ t: 'vstart', final: true }, `${miss ? `${miss} cevap gelmedi. ` : ''}Son tur oylaması: en komik 2 cevabı seç!`);
    if (!finVoters(st).length) { st.endAt = Date.now() + EMPTY_MS; st.dur = EMPTY_MS; }
    ctx.sync(); arm(st, ctx);
  }
}
function nextVote(st, ctx) {
  st.cur++;
  if (st.cur >= st.mus.length) { startBoard(st, ctx); return; }
  setPhase(st, ctx, 'vote', VOTE_MS);
  if (!muVoters(st).length) { st.endAt = Date.now() + EMPTY_MS; st.dur = EMPTY_MS; }
  ctx.emit({ t: 'vstart', i: st.cur });
  ctx.sync(); arm(st, ctx);
}
function checkVotesDone(st, ctx) {
  const done = st.phase === 'vote' ? muVoters(st).every(i => st.mus[st.cur].votes[i] !== -1)
    : st.phase === 'fvote' ? finVoters(st).every(i => st.fin.picks[i] != null) : false;
  if (!done) { if (humansVoted(st)) hurryBots(st, ctx); return false; }
  const at = Date.now() + 700;
  if (st.endAt > at) { st.endAt = at; st.tk++; arm(st, ctx); }
  return true;
}
function humansVoted(st) {
  if (st.phase === 'vote') return muVoters(st).every(i => isBot(st, i) || st.mus[st.cur].votes[i] !== -1);
  if (st.phase === 'fvote') return finVoters(st).every(i => isBot(st, i) || st.fin.picks[i] != null);
  return false;
}
function doReveal(st, ctx) {
  if (st.phase === 'vote') {
    const mu = st.mus[st.cur];
    const r = scoreMatch(mu.votes, mu.none, mu.hidden, st.mult);
    mu.res = r;
    mu.a.forEach((pi, k) => { st.score[pi] += r.pts[k]; st.gain[pi] += r.pts[k]; });
    if (r.sweep >= 0) st.sweeps++;
    const empty = mu.none[0] && mu.none[1];
    setPhase(st, ctx, 'reveal', empty ? EMPTY_MS : REVEAL_MS + (r.sweep >= 0 ? SWEEP_EXTRA : 0));
    const nm = k => st.pl[mu.a[k]].name;
    let log;
    if (empty) log = `Kapışma ${st.cur + 1}: iki taraftan da cevap gelmedi.`;
    else if (r.c[0] === r.c[1]) log = `Kapışma ${st.cur + 1}: ${nm(0)} ile ${nm(1)} berabere (${r.c[0]}–${r.c[1]}).`;
    else { const w = r.c[0] > r.c[1] ? 0 : 1; log = `Kapışma ${st.cur + 1}: ${nm(w)} kazandı, +${r.pts[w]} puan${r.sweep >= 0 ? ' · KAPIŞMA!' : ''}`; }
    ctx.emit({ t: 'reveal', sweep: r.sweep >= 0 ? mu.a[r.sweep] : -1 }, log, r.sweep >= 0 ? 'gold' : (empty ? 'bad' : 'good'));
  } else if (st.phase === 'fvote') {
    const f = st.fin;
    const r = scoreFinal(f.picks, f.order, st.mult);
    f.res = r;
    f.order.forEach((pi, k) => { st.score[pi] += r.pts[k]; st.gain[pi] += r.pts[k]; });
    setPhase(st, ctx, 'freveal', FREVEAL_MS);
    const top = Math.max(0, ...r.c);
    const best = top ? f.order.filter((pi, k) => r.c[k] === top).map(pi => st.pl[pi].name) : [];
    ctx.emit({ t: 'freveal' }, best.length ? `Son turun en komiği: ${best.join(', ')} (${top} oy)` : 'Son turda kimse oy vermedi.', 'gold');
  } else return;
  ctx.sync(); arm(st, ctx);
}
function startBoard(st, ctx) {
  setPhase(st, ctx, 'board', BOARD_MS);
  ctx.emit({ t: 'board' }, `${st.round}. tur bitti. Puan durumu: ${leaders(st)}`);
  ctx.sync(); arm(st, ctx);
}
function leaders(st) { return st.pl.map((p, i) => i).sort((a, b) => st.score[b] - st.score[a] || a - b).slice(0, 3).map(i => `${st.pl[i].name} ${st.score[i]}`).join(', '); }
function finish(st, ctx) {
  setPhase(st, ctx, 'end', 0);
  const order = st.pl.map((_, i) => i).sort((a, b) => st.score[b] - st.score[a] || a - b);
  const top = st.score[order[0]], tie = order.filter(i => st.score[i] === top).length > 1;
  ctx.emit({ t: 'win', pi: tie ? -1 : order[0] }, tie ? 'Oyun berabere bitti!' : `${st.pl[order[0]].name} oyunu kazandı! 🏆`, 'gold');
  ctx.sync();
  ctx.end({
    title: tie ? 'Berabere bitti!' : `${st.pl[order[0]].name} kazandı!`,
    ranking: order.map(i => ({ pi: i, score: st.score[i], label: `${st.score[i]} puan` })),
    note: `${nOf(st)} oyuncu · 3 tur · ${st.sweeps} KAPIŞMA`
  });
}
function hidePress(st, ctx, pi, k) {
  let author, list;
  if (st.phase === 'vote') {
    const mu = st.mus[st.cur]; if (!mu || (k !== 0 && k !== 1) || mu.hidden[k] || mu.none[k]) return;
    author = mu.a[k]; list = mu.hide[k];
  } else if (st.phase === 'fvote') {
    const f = st.fin; author = f.order[k]; if (author == null || f.hidden[author] || f.none[author]) return;
    list = f.hide[author];
  } else return;
  const el = electorate(st, author);
  if (!el.includes(pi)) return;
  const at = list.indexOf(pi);
  if (at >= 0) list.splice(at, 1); else list.push(pi);
  const n = list.filter(i => el.includes(i)).length;
  if (n * 2 > el.length) {
    if (st.phase === 'vote') {
      const mu = st.mus[st.cur]; mu.hidden[k] = true;
      mu.votes = mu.votes.map(v => v === k ? -1 : v);
    } else {
      const f = st.fin; f.hidden[author] = true;
      f.picks = f.picks.map(ks => (ks && ks.includes(k)) ? null : ks);
    }
    ctx.emit({ t: 'hidden' }, 'Bir cevap çoğunluk kararıyla gizlendi. 🙈', 'bad');
    if (!checkVotesDone(st, ctx)) hurryBots(st, ctx);   // oyu silinen bilgisayarlar yeniden oylasın
  } else ctx.emit({ t: 'hidetap' });
  ctx.sync();
}

/* ---------- bilgisayar rakipler ---------- */
function botText(st, cat) {
  const own = BOT[cat] || GENERIC;
  const pool = Math.random() < .72 ? shuf(own).concat(shuf(GENERIC)) : shuf(GENERIC).concat(shuf(own));
  let tx = pool.find(x => !st.usedBot.includes(x));
  if (!tx) tx = pool[0];
  st.usedBot.push(tx);
  return tx;
}
function botAnswerAll(st, ctx, pi) {
  if (!isBot(st, pi) || doneAnswer(st, pi)) return;
  if (st.phase === 'answer') {
    const list = myMus(st, pi);
    const k = list.findIndex(m => st.mus[m].ans[st.mus[m].a.indexOf(pi)] == null);
    if (k < 0) return;
    const ok = submitAnswer(st, ctx, pi, k, botText(st, PROMPTS[st.mus[list[k]].q].c));
    if (ok && st.phase === 'answer' && !doneAnswer(st, pi)) { const tk = st.tk; ctx.later(rnd(900, 2600), () => { if (st.tk === tk) botAnswerAll(st, ctx, pi); }); }
  } else if (st.phase === 'fanswer') submitAnswer(st, ctx, pi, 0, botText(st, PROMPTS[st.fin.q].c));
}
function taste(tx, none, hidden, humanAuthor) {
  if (none || hidden) return -10;
  const L = [...tx].length;
  return Math.random() + (L >= 12 && L <= 48 ? .35 : 0) + (/[!?"…]/.test(tx) ? .1 : 0) + (humanAuthor ? .25 : 0);
}
function botVote(st, ctx, pi) {
  if (st.phase === 'vote') {
    const mu = st.mus[st.cur]; if (!canVoteMu(st, pi) || mu.votes[pi] !== -1) return;
    const s = [0, 1].map(k => taste(mu.ans[k], mu.none[k], mu.hidden[k], !isBot(st, mu.a[k])));
    action(st, pi, { t: 'vote', k: s[0] >= s[1] ? 0 : 1 }, ctx);
  } else if (st.phase === 'fvote') {
    const f = st.fin; if (!canVoteFin(st, pi) || f.picks[pi] != null) return;
    const ks = finValid(st, pi).map(k => ({ k, s: taste(f.ans[f.order[k]], false, false, !isBot(st, f.order[k])) })).sort((a, b) => b.s - a.s).slice(0, finReq(st, pi)).map(o => o.k);
    action(st, pi, { t: 'fvote', ks }, ctx);
  }
}
function hurryBots(st, ctx) {
  const tk = st.tk;
  st.pl.forEach((p, i) => {
    if (!p.isBot) return;
    if ((st.phase === 'answer' || st.phase === 'fanswer') && !doneAnswer(st, i)) ctx.later(rnd(500, 1800), () => { if (st.tk === tk) botAnswerAll(st, ctx, i); });
    if (st.phase === 'vote' || st.phase === 'fvote') ctx.later(rnd(300, 1100), () => { if (st.tk === tk) botVote(st, ctx, i); });
  });
}
// Zamanlayıcıları kur (her aşama değişiminde st.tk artar → eski zamanlayıcılar boşa düşer)
function arm(st, ctx) {
  const tk = st.tk, now = Date.now();
  const at = (t, fn) => ctx.later(Math.max(0, t - now), () => { if (st.tk === tk) fn(); });
  const ph = st.phase;
  if (ph === 'intro') at(st.endAt, () => startAnswer(st, ctx));
  else if (ph === 'answer' || ph === 'fanswer') {
    at(st.endAt, () => closeAnswers(st, ctx));
    const span = Math.max(4000, Math.min(st.ansSec * 1000 * .45, st.endAt - now - 3000));
    st.pl.forEach((p, i) => { if (p.isBot && !doneAnswer(st, i)) at(now + rnd(2500, span), () => botAnswerAll(st, ctx, i)); });
  } else if (ph === 'vote' || ph === 'fvote') {
    at(st.endAt, () => doReveal(st, ctx));
    const span = Math.max(1600, Math.min(ph === 'fvote' ? 9000 : 5200, st.endAt - now - 800));
    st.pl.forEach((p, i) => { if (p.isBot) at(now + rnd(1400, span), () => botVote(st, ctx, i)); });
  } else if (ph === 'reveal') at(st.endAt, () => nextVote(st, ctx));
  else if (ph === 'board') at(st.endAt, () => startRound(st, ctx));
  else if (ph === 'freveal') at(st.endAt, () => finish(st, ctx));
}
function action(st, pi, a, ctx) {
  if (st.phase === 'end' || !a) return;
  switch (a.t) {
    case 'answer': submitAnswer(st, ctx, pi, a.k | 0, a.tx); return;
    case 'vote': {
      if (st.phase !== 'vote' || !canVoteMu(st, pi)) return;
      const mu = st.mus[st.cur], k = a.k;
      if ((k !== 0 && k !== 1) || mu.votes[pi] !== -1 || mu.none[k] || mu.hidden[k]) return;
      mu.votes[pi] = k;
      ctx.emit({ t: 'vote' });
      checkVotesDone(st, ctx);
      ctx.sync(); return;
    }
    case 'fvote': {
      if (st.phase !== 'fvote' || !canVoteFin(st, pi) || st.fin.picks[pi] != null || !Array.isArray(a.ks)) return;
      const valid = finValid(st, pi), req = finReq(st, pi);
      const ks = [...new Set(a.ks.map(x => x | 0))];
      if (ks.length !== req || !ks.every(k => valid.includes(k))) return;
      st.fin.picks[pi] = ks;
      ctx.emit({ t: 'vote' });
      checkVotesDone(st, ctx);
      ctx.sync(); return;
    }
    case 'hide': hidePress(st, ctx, pi, a.k | 0); return;
    default:
  }
}

/* ---------- görünüm (her izleyiciye ayrı; gizli bilgi sızmaz) ---------- */
function view(st, viewer) {
  const me = typeof viewer === 'number' ? viewer : -1;
  const ph = st.phase;
  const answering = ph === 'answer' || ph === 'fanswer';
  const showGain = ph === 'board' || ph === 'end' || ph === 'freveal';
  const v = {
    phase: ph, round: st.round, mult: st.mult, endAt: st.endAt, dur: st.dur, ansSec: st.ansSec, sweeps: st.sweeps,
    players: st.pl.map((p, i) => ({ name: p.name, color: p.color, isBot: !!p.isBot, on: st.on[i], score: st.score[i], gain: showGain ? st.gain[i] : 0, done: answering ? doneAnswer(st, i) : null })),
    my: null, mu: null, fin: null
  };
  if (ph === 'answer' && me >= 0) v.my = myMus(st, me).map(m => ({ q: PROMPTS[st.mus[m].q].t, ans: st.mus[m].ans[st.mus[m].a.indexOf(me)] }));
  if (ph === 'fanswer') v.my = me >= 0 ? [{ q: PROMPTS[st.fin.q].t, ans: st.fin.ans[me] }] : null;
  if (ph === 'fanswer' && me < 0) v.fq = PROMPTS[st.fin.q].t;
  if ((ph === 'vote' || ph === 'reveal') && st.mus[st.cur]) {
    const mu = st.mus[st.cur], rev = ph === 'reveal';
    v.mu = {
      i: st.cur, n: st.mus.length, q: PROMPTS[mu.q].t,
      ans: [0, 1].map(k => ({ tx: mu.hidden[k] ? null : mu.ans[k], none: mu.none[k], hidden: mu.hidden[k], hideN: mu.hide[k].length, iHid: mu.hide[k].includes(me),
        canHide: !rev && !mu.hidden[k] && !mu.none[k] && electorate(st, mu.a[k]).includes(me) })),
      mine: mu.a.indexOf(me), myVote: me >= 0 ? mu.votes[me] : -1, canVote: canVoteMu(st, me) && mu.votes[me] === -1,
      voted: mu.votes.filter(x => x !== -1).length, voters: muVoters(st).length,
      res: rev && mu.res ? { voters: [0, 1].map(k => mu.votes.map((x, i) => x === k && !mu.hidden[k] && !mu.none[k] ? i : -1).filter(i => i >= 0)), authors: mu.a.slice(), pts: mu.res.pts, sweep: mu.res.sweep } : null
    };
  }
  if ((ph === 'fvote' || ph === 'freveal' || ph === 'end') && st.fin && st.fin.order.length) {
    const f = st.fin, rev = ph !== 'fvote';
    v.fin = {
      q: PROMPTS[f.q].t,
      ans: f.order.map((pi, k) => ({ tx: f.hidden[pi] ? null : f.ans[pi], none: f.none[pi], hidden: f.hidden[pi], hideN: f.hide[pi].length, iHid: f.hide[pi].includes(me), mine: pi === me,
        canHide: !rev && !f.hidden[pi] && !f.none[pi] && electorate(st, pi).includes(me) })),
      myPicks: me >= 0 ? f.picks[me] : null, req: me >= 0 ? finReq(st, me) : 0, canVote: canVoteFin(st, me) && f.picks[me] == null,
      voted: f.picks.filter(x => x != null).length, voters: finVoters(st).length,
      res: rev && f.res ? { voters: f.order.map((pi, k) => f.picks.map((ks, i) => ks && ks.includes(k) ? i : -1).filter(i => i >= 0)), authors: f.order.slice(), pts: f.res.pts } : null
    };
  }
  return v;
}

/* =========================================================================
   ARAYÜZ
   ========================================================================= */
let root = null, ui = null, V = null, lastKey = '', timerT = null, cT = [], sel = [], lastTick = -1, revealDone = false, draft = {};
const q = s => root && root.querySelector(s);
const qa = s => root ? [...root.querySelectorAll(s)] : [];
const later = (ms, fn) => { const id = setTimeout(() => { cT = cT.filter(x => x !== id); if (root) fn(); }, ms); cT.push(id); };
const clearLater = () => { cT.forEach(clearTimeout); cT = []; };
const lowAnim = () => document.body.classList.contains('anim-low') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const P = i => (V && V.players[i]) || { name: '?', color: '#888' };
// avatar etiketi: baş harf; "Bilgisayar 3" gibi numaralı botlarda numara da eklenir (B3)
const avLab = i => { const p = P(i), m = p.isBot && /(\d+)$/.exec(p.name); return initial(p.name) + (m ? m[1] : ''); };
const avHTML = (i, cls = '', extra = '') => { const l = avLab(i); return `<span class="av ${cls} ${[...l].length > 1 ? 'kc-two' : ''}" style="--pc:${P(i).color}" ${extra} title="${esc(P(i).name)}">${esc(l)}</span>`; };
const isMe = i => typeof ui.me === 'number' && ui.me >= 0 && i === ui.me;
const BOLT = '<svg viewBox="0 0 64 120" aria-hidden="true"><defs><linearGradient id="kcBoltG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7b0"/><stop offset=".5" stop-color="#ffe14a"/><stop offset="1" stop-color="#ff8a00"/></linearGradient></defs><path d="M40 2 L8 66 H30 L20 118 L58 46 H35 Z" fill="url(#kcBoltG)" stroke="#7a2a00" stroke-width="3" stroke-linejoin="round"/></svg>';

function stageKey(v) {
  const ph = v.phase;
  if (ph === 'answer' || ph === 'fanswer') { const k = v.my ? v.my.findIndex(x => x.ans == null) : -2; return `${ph}|${v.round}|${k}`; }
  if (ph === 'vote' || ph === 'reveal') return `${ph}|${v.round}|${v.mu ? v.mu.i : ''}`;
  return `${ph}|${v.round}`;
}

/* ---------- oyuncu şeridi ---------- */
function renderPlayers(v) {
  const box = q('.kc-players');
  const answering = v.phase === 'answer' || v.phase === 'fanswer';
  box.classList.toggle('many', v.players.length >= 5);
  box.innerHTML = v.players.map((p, i) => {
    const st = answering ? (p.done ? '<i class="kc-st ok" title="Hazır">✓</i>' : (p.on ? '<i class="kc-st wr" title="Yazıyor">✎</i>' : '')) : '';
    return `<div class="kc-pl ${p.on ? '' : 'off'} ${isMe(i) ? 'me' : ''} ${answering && p.done ? 'done' : ''}" style="--pc:${p.color}" data-pi="${i}" title="${esc(p.name)}">
      ${avHTML(i)}<span class="kc-pn"><b>${esc(p.name)}</b><small>${isMe(i) ? 'sen' : p.isBot ? '🤖 bot' : p.on ? '' : 'bağlantı yok'}</small></span><span class="kc-sc">${p.score}</span>${st}</div>`;
  }).join('');
}
function renderStatus(v) {
  const st = q('.kc-status'), me = ui.me, spect = typeof me !== 'number' || me < 0;
  let h;
  const ph = v.phase;
  if (ph === 'intro') h = `<span class="g-turn">🎬 ${ROUND_NAME(v.round)} başlıyor…</span>`;
  else if (ph === 'answer' || ph === 'fanswer') {
    const left = v.players.filter(p => p.on && !p.done).length;
    if (v.my && v.my.some(x => x.ans == null)) h = '<span class="g-turn mine">⭐ Sıra sende · cevap yaz!</span>';
    else h = `<span class="g-turn">${spect ? '👀 ' : '✅ '}${left ? `${left} oyuncu yazıyor…` : 'Herkes hazır!'}</span>`;
  } else if (ph === 'vote') {
    const mu = v.mu;
    if (mu.canVote) h = '<span class="g-turn mine">⭐ Sıra sende · komik olanı oyla!</span>';
    else if (mu.mine >= 0) h = '<span class="g-turn">🤞 Bu senin kapışman! Oylar bekleniyor</span>';
    else if (mu.myVote >= 0) h = '<span class="g-turn win">Oyun alındı ✓</span>';
    else h = `<span class="g-turn">${spect ? '👀 ' : ''}Oylama sürüyor…</span>`;
  } else if (ph === 'fvote') {
    const f = v.fin;
    if (f.canVote) h = `<span class="g-turn mine">⭐ Sıra sende · en komik ${f.req} cevabı seç!</span>`;
    else if (f.myPicks) h = '<span class="g-turn win">Oyların alındı ✓</span>';
    else h = `<span class="g-turn">${spect ? '👀 ' : ''}Son tur oylaması sürüyor…</span>`;
  } else if (ph === 'reveal' || ph === 'freveal') h = '<span class="g-turn">🎉 Sonuçlar!</span>';
  else if (ph === 'board') h = '<span class="g-turn">📊 Puan durumu</span>';
  else h = '<span class="g-turn win">🏆 Oyun bitti!</span>';
  st.innerHTML = h;
}

/* ---------- sahne ---------- */
function introHTML(v) {
  const r = v.round;
  const desc = r === 3 ? 'Herkese aynı soru! Cevapları oku, en komik <b>2</b> tanesini seç.' : `Her oyuncuya <b>2</b> soru düşer. Her soruyu iki kişi cevaplar, diğerleri oylar.`;
  return `<div class="kc-intro ${r === 3 ? 'final' : ''}"><div class="kc-rnum">${ROUND_NAME(r)}</div><div class="kc-mult">PUAN ×${v.mult}</div><p>${desc}</p><p class="kc-small">Her oy ${100 * v.mult} puan · tüm oyları alana KAPIŞMA bonusu</p></div>`;
}
function answerHTML(v) {
  const my = v.my;
  if (!my) return `<div class="kc-wait"><div class="kc-big kc-bob">✍️</div><b>Oyuncular cevap yazıyor…</b>${v.fq ? `<p class="kc-q sm">${esc(v.fq)}</p>` : '<p>Sorular gizli, cevaplar da!</p>'}</div>`;
  const k = my.findIndex(x => x.ans == null);
  if (k < 0) {
    return `<div class="kc-wait"><div class="kc-big kc-bob">✅</div><b>Cevapların gönderildi!</b><p>Diğerleri yazarken bir nefes al.</p>
      <ul class="kc-mine">${my.map(x => `<li><small>${esc(x.q)}</small><span>“${esc(x.ans)}”</span></li>`).join('')}</ul></div>`;
  }
  const d = draft[stageKey(v)] || '';
  return `<div class="kc-qcard"><span class="kc-qlab">${v.phase === 'fanswer' ? 'SON TUR · herkese aynı soru' : `Soru ${k + 1}/${my.length}`}</span><p class="kc-q">${esc(my[k].q)}</p></div>
    <form class="kc-form" autocomplete="off">
      <label class="kc-inwrap"><input class="kc-in" maxlength="${MAXLEN}" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="send" placeholder="Komik cevabını yaz…" aria-label="Cevabın" value="${esc(d)}"><span class="kc-cnt">${[...d].length}/${MAXLEN}</span></label>
      <button type="submit" class="btn btn-spin kc-send">GÖNDER</button>
    </form>
    <p class="kc-tip">😏 Kimin yazdığı oylamadan sonra açıklanır.</p>`;
}
function ansText(a) {
  if (a.hidden) return '<span class="kc-tx hid">🙈 Bu cevap gizlendi</span>';
  if (a.none) return `<span class="kc-tx none">${NONE_TX}</span>`;
  return `<span class="kc-tx">${esc(a.tx)}</span>`;
}
function cardHTML(a, k, opts) {
  const res = opts.res, letter = String.fromCharCode(65 + k);
  let extra = '';
  if (res) {
    const vs = res.voters[k] || [];
    const au = res.authors[k];
    extra = `<div class="kc-voters">${vs.map(pi => avHTML(pi, 'kc-vav', `data-v="${pi}"`)).join('')}</div>
      <div class="kc-reveal"><span class="kc-author" style="--pc:${P(au).color}">${avHTML(au)}<b>${esc(P(au).name)}</b></span><span class="kc-pts">${res.pts[k] ? '+' + res.pts[k] : '0'}</span></div>
      ${opts.sweep ? '<span class="kc-stamp">KAPIŞMA!</span>' : ''}${opts.rank ? `<span class="kc-rank">${opts.rank}</span>` : ''}`;
  }
  return `<div class="kc-card c${k % 8} ${opts.cls || ''}" data-k="${k}" style="--i:${k}">
    <span class="kc-let">${letter}</span>
    <button type="button" class="kc-pick" data-${opts.final ? 'fk' : 'vote'}="${k}">${ansText(a)}<span class="kc-tag"></span></button>
    ${res ? '' : `<div class="kc-cfoot"><button type="button" class="kc-hide" data-hide="${k}" aria-label="Bu cevabı gizlemek için oy ver">🙈 Gizle<em></em></button></div>`}
    ${extra}</div>`;
}
function voteHTML(v) {
  const mu = v.mu, res = mu.res;
  const win = res ? (res.pts[0] === res.pts[1] ? -1 : res.pts[0] > res.pts[1] ? 0 : 1) : -1;
  return `<div class="kc-qhead"><span class="kc-qlab">Kapışma ${mu.i + 1}/${mu.n} · ×${v.mult}</span><p class="kc-q">${esc(mu.q)}</p></div>
    <div class="kc-vs ${res ? 'rev' : ''}">
      ${cardHTML(mu.ans[0], 0, { res, cls: 's0' + (win === 0 ? ' win' : win === 1 ? ' lose' : ''), sweep: res && res.sweep === 0 })}
      <div class="kc-bolt">${BOLT}<b>VS</b></div>
      ${cardHTML(mu.ans[1], 1, { res, cls: 's1' + (win === 1 ? ' win' : win === 0 ? ' lose' : ''), sweep: res && res.sweep === 1 })}
    </div>
    ${res ? '<div class="kc-meter"><i class="a"><b>0</b></i><i class="b"><b>0</b></i></div>' : ''}
    <p class="kc-vinfo"></p>`;
}
function fvoteHTML(v) {
  const f = v.fin, res = f.res;
  let idx = f.ans.map((a, k) => k);
  let ranks = {};
  if (res) {
    idx.sort((a, b) => res.pts[b] - res.pts[a] || a - b);
    idx.forEach((k, j) => { ranks[k] = j === 0 || res.pts[k] < res.pts[idx[j - 1]] ? j + 1 : ranks[idx[j - 1]]; });
  }
  const top = res ? Math.max(...res.pts) : 0;
  return `<div class="kc-qhead final"><span class="kc-qlab">SON TUR · ×${v.mult} · ${res ? 'sonuçlar' : `en komik ${Math.max(1, f.req || 2)} cevabı seç`}</span><p class="kc-q">${esc(f.q)}</p></div>
    <div class="kc-fgrid n${f.ans.length} ${res ? 'rev' : ''}">${idx.map(k => cardHTML(f.ans[k], k, { res, final: true, cls: 'f' + (res && top > 0 && res.pts[k] === top ? ' win' : ''), rank: res ? (ranks[k] <= 3 ? ['🥇', '🥈', '🥉'][ranks[k] - 1] : ranks[k] + '.') : '' })).join('')}</div>
    ${res ? '' : '<div class="kc-fbar"><button type="button" class="btn btn-spin kc-fsend" disabled>OYLA</button></div>'}
    <p class="kc-vinfo"></p>`;
}
function boardHTML(v) {
  const order = v.players.map((p, i) => i).sort((a, b) => v.players[b].score - v.players[a].score || a - b);
  const max = Math.max(1, ...v.players.map(p => p.score));
  const end = v.phase === 'end';
  return `<div class="kc-board"><h3>${end ? 'FİNAL' : `${v.round}. TUR SONU`}</h3>
    <ol>${order.map((i, j) => { const p = v.players[i]; return `<li class="${isMe(i) ? 'me' : ''}" style="--pc:${p.color};--w:${Math.round(p.score / max * 100)}%;--d:${j}">
      <span class="kc-rk">${j + 1}</span>${avHTML(i)}<b>${esc(p.name)}</b><span class="kc-bar"><i></i></span><span class="kc-bs">${p.score}</span>${p.gain ? `<span class="kc-gn">+${p.gain}</span>` : '<span class="kc-gn z">+0</span>'}</li>`; }).join('')}</ol>
    <p class="kc-small">${end ? 'Tebrikler! 🎉' : v.round === 2 ? 'Sıradaki: <b>SON TUR</b> · puanlar ×3!' : `Sıradaki: <b>${v.round + 1}. TUR</b> · puanlar ×${v.round + 1}`}</p></div>`;
}
function buildStage(v) {
  clearLater(); revealDone = false; sel = [];
  const body = q('.kc-body'), ph = v.phase;
  let h = '';
  if (ph === 'intro') h = introHTML(v);
  else if (ph === 'answer' || ph === 'fanswer') h = answerHTML(v);
  else if ((ph === 'vote' || ph === 'reveal') && v.mu) h = voteHTML(v);
  else if ((ph === 'fvote' || ph === 'freveal') && v.fin) h = fvoteHTML(v);
  else if (ph === 'board' || ph === 'end') h = boardHTML(v);
  body.innerHTML = h;
  body.dataset.phase = ph;
  q('.kc-round').textContent = ph === 'end' ? 'Oyun bitti' : `${ROUND_NAME(v.round)} · ×${v.mult}`;
  if (ph === 'answer' || ph === 'fanswer') {
    const inp = q('.kc-in');
    if (inp && !(CFX.isPhone && CFX.isPhone())) setTimeout(() => { if (inp.isConnected) inp.focus({ preventScroll: true }); }, 60);
  }
  if (ph === 'reveal' || ph === 'freveal') runReveal(v);
}
function updateStage(v) {
  const ph = v.phase;
  if (ph === 'vote' || ph === 'reveal') {
    const mu = v.mu; if (!mu) return;
    qa('.kc-card').forEach(c => {
      const k = +c.dataset.k, a = mu.ans[k];
      c.classList.toggle('mine', mu.mine === k);
      c.classList.toggle('chosen', mu.myVote === k);
      c.classList.toggle('hidden', !!a.hidden);
      const b = c.querySelector('.kc-pick');
      if (a.hidden && !b.querySelector('.hid')) b.querySelector('.kc-tx').outerHTML = ansText(a);
      b.disabled = ph !== 'vote' || !mu.canVote || a.none || a.hidden;
      b.querySelector('.kc-tag').textContent = mu.mine === k ? 'Senin cevabın' : mu.myVote === k ? 'Oyun ✓' : '';
      const hb = c.querySelector('.kc-hide');
      if (hb) { hb.disabled = !a.canHide; hb.classList.toggle('on', !!a.iHid); hb.querySelector('em').textContent = a.hideN ? ` (${a.hideN})` : ''; hb.hidden = a.none || a.hidden || (mu.mine === k); }
    });
    const info = q('.kc-vinfo');
    if (ph === 'vote') info.innerHTML = `${mu.canVote ? 'Daha komik olana dokun!' : mu.mine >= 0 ? 'Bu kapışmada oy veremezsin.' : mu.myVote >= 0 ? 'Diğer oylar bekleniyor…' : ''} <span class="kc-vc">🗳️ ${mu.voted}/${mu.voters}</span>`;
    else info.innerHTML = '';
  } else if (ph === 'fvote' || ph === 'freveal') {
    const f = v.fin; if (!f) return;
    if (!f.canVote) sel = [];
    sel = sel.filter(k => f.ans[k] && !f.ans[k].hidden);
    const picks = f.myPicks || sel;
    qa('.kc-card').forEach(c => {
      const k = +c.dataset.k, a = f.ans[k];
      c.classList.toggle('mine', !!a.mine);
      c.classList.toggle('chosen', picks.includes(k));
      c.classList.toggle('hidden', !!a.hidden);
      const b = c.querySelector('.kc-pick');
      if (a.hidden && !b.querySelector('.hid')) b.querySelector('.kc-tx').outerHTML = ansText(a);
      b.disabled = ph !== 'fvote' || !f.canVote || a.none || a.hidden || a.mine;
      b.querySelector('.kc-tag').textContent = a.mine ? 'Senin cevabın' : picks.includes(k) ? (f.myPicks ? 'Oyun ✓' : 'Seçildi ✓') : '';
      const hb = c.querySelector('.kc-hide');
      if (hb) { hb.disabled = !a.canHide; hb.classList.toggle('on', !!a.iHid); hb.querySelector('em').textContent = a.hideN ? ` (${a.hideN})` : ''; hb.hidden = a.none || a.hidden || a.mine; }
    });
    const btn = q('.kc-fsend');
    if (btn) {
      btn.hidden = !f.canVote;
      btn.disabled = !f.canVote || sel.length !== f.req;
      btn.textContent = `OYLA (${sel.length}/${f.req})`;
    }
    const info = q('.kc-vinfo');
    if (ph === 'fvote') info.innerHTML = `${f.canVote ? `Favori ${f.req} cevabına dokun, sonra OYLA.` : f.myPicks ? 'Diğer oylar bekleniyor…' : ''} <span class="kc-vc">🗳️ ${f.voted}/${f.voters}</span>`;
    else info.innerHTML = '';
  }
}

/* ---------- açıklama animasyonu: oy veren avatarlar uçarak cevaba konar ---------- */
function runReveal(v) {
  const stage = q('.kc-vs, .kc-fgrid'); if (!stage) return;
  const targets = qa('.kc-vav');
  const isMu = v.phase === 'reveal';
  const meter = () => {
    const m = q('.kc-meter'); if (!m) return;
    const landed = [0, 1].map(k => qa(`.kc-card[data-k="${k}"] .kc-vav.in`).length);   // konan avatarlar sayılır (çift sayım olmaz)
    const s = landed[0] + landed[1];
    const pa = s ? landed[0] / s * 100 : 50;
    m.querySelector('.a').style.width = pa + '%'; m.querySelector('.b').style.width = (100 - pa) + '%';
    m.querySelector('.a b').textContent = landed[0]; m.querySelector('.b b').textContent = landed[1];
    m.classList.toggle('empty', !s);
  };
  meter();
  const fin = () => {
    if (!root || revealDone) return; revealDone = true;
    targets.forEach(t => t.classList.add('in'));
    meter();
    stage.classList.add('shown');
    Sound.good();
    const sw = isMu && v.mu.res && v.mu.res.sweep >= 0;
    if (sw) {
      later(350, () => { Sound.solve(); banner('KAPIŞMA!', 'pink'); flash('good'); FX.confetti(70); });
    }
    qa('.kc-card.win').forEach(c => { const r = c.getBoundingClientRect(); if (r.width) FX.burst(r.left + r.width / 2, r.top + r.height / 3, sw ? 40 : 22); });
  };
  if (lowAnim() || !targets.length || !Element.prototype.animate) { later(targets.length ? 300 : 500, fin); return; }
  const step = Math.max(110, Math.min(220, 1600 / targets.length));
  targets.forEach((t, j) => {
    later(380 + j * step, () => {
      if (!t.isConnected) return;
      const pi = +t.dataset.v;
      const chip = q(`.kc-pl[data-pi="${pi}"] .av`);
      const a = chip && chip.getBoundingClientRect(), b = t.getBoundingClientRect();
      const done = () => {
        t.classList.add('in'); Sound.tick(.55);
        const card = t.closest('.kc-card'); if (card) { card.classList.remove('bump'); void card.offsetWidth; card.classList.add('bump'); }
        if (isMu) meter();
      };
      if (!a || !a.width || !b.width) { done(); return; }
      const f = document.createElement('span');
      f.className = 'av kc-fly' + (avLab(pi).length > 1 ? ' kc-two' : ''); f.style.setProperty('--pc', P(pi).color); f.textContent = avLab(pi);
      f.style.left = a.left + 'px'; f.style.top = a.top + 'px'; f.style.width = a.width + 'px'; f.style.height = a.height + 'px';
      document.body.appendChild(f);
      const dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2), sc = b.width / a.width;
      const anim = f.animate([
        { transform: 'translate(0,0) scale(1) rotate(0)' },
        { transform: `translate(${dx * .5}px, ${dy * .5 - 70}px) scale(1.5) rotate(200deg)`, offset: .5 },
        { transform: `translate(${dx}px, ${dy}px) scale(${sc}) rotate(360deg)` }
      ], { duration: 680, easing: 'cubic-bezier(.45,0,.25,1)' });
      const end = () => { f.remove(); if (root) done(); };
      anim.onfinish = end; anim.oncancel = end;
    });
  });
  later(380 + targets.length * step + 800, fin);
}

/* ---------- zaman göstergesi ---------- */
function tickTimer() {
  if (!root || !V) return;
  const clk = q('.kc-clock'), bar = q('.kc-tbar i');
  const timed = V.endAt && ['answer', 'fanswer', 'vote', 'fvote'].includes(V.phase);
  if (!timed) { clk.hidden = true; bar.style.transform = 'scaleX(0)'; bar.parentElement.classList.remove('low'); return; }
  const left = Math.max(0, V.endAt - ui.hostNow()), f = Math.max(0, Math.min(1, left / (V.dur || 1)));
  const s = Math.ceil(left / 1000);
  clk.hidden = false; clk.textContent = s; clk.style.setProperty('--p', f);
  bar.style.transform = `scaleX(${f})`;
  const low = s <= 5;
  clk.classList.toggle('low', low); bar.parentElement.classList.toggle('low', low);
  if (low && s > 0 && s !== lastTick) {
    lastTick = s;
    const needMe = (V.my && V.my.some(x => x.ans == null)) || (V.mu && V.mu.canVote) || (V.fin && V.fin.canVote);
    if (needMe) Sound.tick(.8);
  }
}

/* ---------- render ---------- */
function render(v) {
  V = v; if (!root) return;
  renderPlayers(v); renderStatus(v);
  const key = stageKey(v);
  if (key !== lastKey) { lastKey = key; buildStage(v); }
  updateStage(v);
  root.querySelector('.kc').dataset.phase = v.phase;
  tickTimer();
}
function onEvent(e) {
  if (!root) return;
  if (e.t === 'round') { Sound.whoosh(); banner(e.r === 3 ? 'SON TUR ×3' : `${e.r}. TUR${e.r > 1 ? ' ×' + e.r : ''}`, 'pink'); }
  else if (e.t === 'astart') Sound.special();
  else if (e.t === 'answered') {
    if (!isMe(e.pi)) Sound.tick(.35);
    if (e.fin) { const chip = q(`.kc-pl[data-pi="${e.pi}"]`); if (chip) { const r = chip.getBoundingClientRect(); if (r.width) FX.burst(r.left + r.width / 2, r.top + r.height / 2, 14, false); } }
  } else if (e.t === 'vstart') { Sound.whoosh(); if (e.final) banner('OYLAMA!', 'pink'); }
  else if (e.t === 'vote') Sound.tick(.3);
  else if (e.t === 'reveal' || e.t === 'freveal') Sound.stop();
  else if (e.t === 'hidden') { Sound.bad(); banner('GİZLENDİ 🙈', 'bad'); }
  else if (e.t === 'hidetap') Sound.tick(.2);
  else if (e.t === 'board') Sound.buy();
  else if (e.t === 'win') {
    FX.confetti(220); Sound.fanfare();
    if (e.pi >= 0 && V && V.players[e.pi]) banner(`${V.players[e.pi].name.toLocaleUpperCase('tr-TR')} KAZANDI!`, 'good');
  }
}
function onClick(e) {
  const b = e.target.closest('button'); if (!b || b.disabled || !V) return;
  Sound.init();
  if (b.dataset.vote != null) {
    ui.send({ t: 'vote', k: +b.dataset.vote });
    qa('.kc-pick').forEach(x => { x.disabled = true; });
    b.closest('.kc-card').classList.add('chosen'); Sound.good();
  } else if (b.dataset.fk != null) {
    const k = +b.dataset.fk, f = V.fin; if (!f || !f.canVote) return;
    const at = sel.indexOf(k);
    if (at >= 0) sel.splice(at, 1); else { sel.push(k); if (sel.length > f.req) sel.shift(); }
    Sound.tick(.6); updateStage(V);
  } else if (b.classList.contains('kc-fsend')) {
    const f = V.fin; if (!f || sel.length !== f.req) return;
    ui.send({ t: 'fvote', ks: sel.slice() }); b.disabled = true; Sound.good();
  } else if (b.dataset.hide != null) {
    ui.send({ t: 'hide', k: +b.dataset.hide }); b.classList.toggle('on');
  }
}
function onSubmit(e) {
  e.preventDefault();
  const inp = q('.kc-in'), btn = q('.kc-send'); if (!inp || !V || !V.my) return;
  const tx = inp.value.replace(/\s+/g, ' ').trim();
  if (!tx) { inp.focus(); inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake'); Sound.bad(); return; }
  const k = V.my.findIndex(x => x.ans == null); if (k < 0) return;
  Sound.init(); Sound.buy();
  delete draft[lastKey];
  ui.send({ t: 'answer', k, tx });
  btn.disabled = true; inp.disabled = true;
}
function onInput(e) {
  if (!e.target.classList.contains('kc-in')) return;
  const n = [...e.target.value].length, c = q('.kc-cnt');
  if (c) { c.textContent = `${n}/${MAXLEN}`; c.classList.toggle('full', n >= MAXLEN - 5); }
  draft[lastKey] = e.target.value;
}
function mount(r, api) {
  root = r; ui = api; V = null; lastKey = ''; sel = []; draft = {}; lastTick = -1;
  root.innerHTML = `<div class="g-wrap kc">
    <div class="kc-players"></div>
    <div class="g-status kc-status"></div>
    <section class="kc-stage">
      <div class="kc-lights" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="kc-top"><span class="kc-round"></span><span class="kc-clock" hidden>0</span></div>
      <div class="kc-tbar"><i></i></div>
      <div class="kc-body"></div>
    </section>
  </div>`;
  root.addEventListener('click', onClick);
  root.addEventListener('submit', onSubmit);
  root.addEventListener('input', onInput);
  timerT = setInterval(tickTimer, 200);
}
function unmount() {
  clearInterval(timerT); timerT = null; clearLater();
  document.querySelectorAll('.kc-fly').forEach(x => x.remove());
  if (root) { root.removeEventListener('click', onClick); root.removeEventListener('submit', onSubmit); root.removeEventListener('input', onInput); }
  root = null; ui = null; V = null;
}

let DEF = null;
CFX.registerGame(DEF = {
  id: 'komikcevap', name: 'Komik Cevap', icon: '🎤', color: '#ffb627', min: 3, max: 8, hotseat: false, bot: true, localMin: 1,
  tagline: 'En komik cevabı yaz, oyları topla',
  rules: 'Herkes kendine düşen sorulara gizlice komik bir cevap yazar; her soru iki oyuncuya gider. Diğerleri isimsiz iki cevaptan komik olanı oylar, her oy 100 puan (2. turda ×2). Son turda herkes aynı soruyu cevaplar ve en sevdiği 2 cevabı seçer (×3).',
  options: [{ key: 'time', label: 'Cevap süresi', def: '90', choices: [{ v: '60', label: '60 sn' }, { v: '90', label: '90 sn' }] }],
  setup(players, opts, ctx) {
    const st = {
      pl: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })),
      score: players.map(() => 0), gain: players.map(() => 0), on: players.map(() => true),
      ansSec: +opts.time === 60 ? 60 : 90, round: 0, mult: 1, phase: 'intro', tk: 0, endAt: 0, dur: 0,
      deck: shuf(PROMPTS.map((_, i) => i)), dp: 0, prevPairs: [], mus: [], cur: -1, fin: null, usedBot: [], sweeps: 0
    };
    startRound(st, ctx);
    return st;
  },
  action,
  view,
  turnOf() { return null; },          // herkes aynı anda oynar; botlar kendi zamanlayıcılarıyla
  botDelay: 900,
  botAct() {},
  skipTurn() {},
  onPresence(st, pi, online, ctx) {
    st.on[pi] = online;
    if (online) return;
    if ((st.phase === 'answer' || st.phase === 'fanswer') && allAnswered(st)) { closeAnswers(st, ctx); return; }
    if (st.phase === 'vote' || st.phase === 'fvote') {
      const anyone = st.phase === 'vote' ? muVoters(st).length : finVoters(st).length;
      if (!anyone) { const at = Date.now() + 700; if (st.endAt > at) { st.endAt = at; st.tk++; arm(st, ctx); } }
      else checkVotesDone(st, ctx);
    }
  },
  resume(st, ctx) { if (st.phase === 'end') return; st.tk++; arm(st, ctx); },
  mount, render, onEvent, unmount,
  _test: { PROMPTS, BOT, GENERIC, makePairs, scoreMatch, scoreFinal, clean, view, action, electorate }
});
})();
