/* =========================================================================
   OYUN SALONU — KELİME KARE
   Kutu sallanır, harfler 4×4 (ya da 5×5) kareye dökülür. Komşu harfleri
   (çapraz dahil) parmağınla birleştirip süre bitmeden olabildiğince çok
   kelime bul. Herkes aynı anda oynar; kelimeler tur sonunda açıklanır.
   Klasik kuralda birden fazla kişinin bulduğu kelimeler iptal olur.
   1–8 kişi online ya da tek cihazda bilgisayar rakiplerle.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial, up } = CFX;

/* ---------- sözlük kaynağı (Bomba Kelime ile aynı kök listeler) ----------
   N: isimler (çoğul, -de/-den, -li/-siz… türetilir)   "!" = ince ünlü uyumlu alıntı (saat!, kalp!)
   A: sıfatlar (çoğul, -lik türetilir)
   V: fiil kökleri (-mek, -di, -iyor, -ecek, -miş, -en… türetilir)  "*" = ünlüden önce t→d (git*, et*)
   W: olduğu gibi alınan kelimeler (zamir, zarf, sayı, çekimli sık biçimler) */
const RAW = {
N: `baş kafa saç alın kaş göz kirpik kulak burun yanak ağız dudak diş dil çene boyun omuz kol dirsek bilek el
parmak tırnak avuç göğüs sırt bel karın göbek kalça bacak diz baldır ayak topuk taban deri kemik kas kan damar
kalp! akciğer ciğer mide bağırsak böbrek beyin sinir yüz bıyık sakal ense şakak gırtlak boğaz ter tükürük
nefes ses vücut beden organ iskelet omurga kaburga tenis yumruk tokat anne baba kardeş abla ağabey abi dede
nine babaanne anneanne teyze hala amca dayı kuzen yeğen torun eş koca karı gelin damat kayınvalide kayınpeder
enişte yenge bebek çocuk oğul kız evlat aile akraba komşu arkadaş dost düşman misafir konuk insan adam kadın
erkek genç ihtiyar delikanlı hanım bey efendi beyefendi hanımefendi kişi halk millet toplum vatandaş yabancı
turist yolcu sürücü şoför pilot kaptan denizci asker subay komutan general! polis bekçi itfaiyeci doktor
hemşire eczacı dişçi veteriner öğretmen öğrenci müdür hoca usta çırak işçi memur patron işveren yönetici
başkan bakan vali kaymakam muhtar hakim savcı avukat mühendis mimar ressam heykeltıraş müzisyen şarkıcı oyuncu
aktör aktris yönetmen yazar şair gazeteci muhabir spiker sunucu fotoğrafçı terzi berber kuaför aşçı garson
kasap fırıncı bakkal manav çiftçi çoban balıkçı avcı oduncu marangoz demirci kuyumcu tamirci elektrikçi
tesisatçı boyacı temizlikçi kapıcı postacı kurye satıcı müşteri tüccar esnaf banker muhasebeci sekreter
danışman uzman bilgin profesör araştırmacı astronot dalgıç sporcu futbolcu basketbolcu hakem antrenör şampiyon
kral kraliçe prens prenses padişah sultan vezir paşa ağa derviş imam rahip hacı kahraman lider önder dahi deli
aptal hırsız haydut korsan casus dedektif katil suçlu tanık mahkum kurban hasta yaralı cenaze hayalet cadı
peri dev cüce büyücü sihirbaz palyaço cambaz bekar dul yetim öksüz kardeşlik çiftçilik ev oda salon mutfak
banyo tuvalet yatak yorgan yastık çarşaf battaniye halı kilim perde pencere kapı duvar tavan zemin çatı baca
merdiven balkon bahçe avlu bodrum koridor antre dolap gardırop çekmece raf masa sandalye koltuk kanepe sehpa
ayna lamba avize ampul priz kablo anahtar kilit zil musluk lavabo küvet duş havlu sabun şampuan tarak fırça
süpürge faraş kova paspas bez deterjan çamaşır bulaşık ütü fırın ocak tencere tava kapak çaydanlık demlik
cezve bardak fincan kupa tabak kase çanak kaşık çatal bıçak kepçe süzgeç rende tepsi sürahi şişe kavanoz kutu
sepet çuval torba poşet çanta bavul valiz cüzdan saat! takvim tablo resim çerçeve vazo saksı mum kibrit çakmak
sigara kül küllük televizyon radyo telefon bilgisayar klavye fare ekran yazıcı kamera hoparlör kulaklık şarj
pil kumanda vantilatör klima kalorifer soba şömine odun kömür gaz elektrik su ışık gölge minder şilte beşik
hamak salıncak çit ekmek süt yoğurt ayran peynir yağ zeytin bal reçel pekmez tahin helva şeker tuz biber
baharat kimyon nane kekik maydanoz dereotu fesleğen sarımsak soğan domates salatalık patates havuç kabak
patlıcan ıspanak lahana marul roka turp pancar bezelye fasulye nohut mercimek bulgur pirinç makarna erişte un
maya yumurta et tavuk balık hamsi levrek çipura alabalık uskumru palamut lüfer sardalya karides midye ahtapot
kalamar köfte kebap döner lahmacun pide börek mantı dolma sarma çorba pilav salata cacık turşu meze kızartma
omlet menemen sucuk pastırma salam sosis tost sandviç hamburger pizza cips kraker bisküvi kurabiye kek pasta
tatlı baklava künefe kadayıf lokum sütlaç muhallebi kazandibi aşure dondurma çikolata şekerleme sakız lolipop
meyve sebze elma armut ayva muz portakal mandalina limon greyfurt çilek kiraz vişne erik kayısı şeftali üzüm
karpuz kavun incir nar dut böğürtlen ahududu ananas kivi mango avokado hurma fındık ceviz badem fıstık leblebi
çekirdek kestane çay kahve şerbet limonata kola soda boza salep kakao içecek yemek kahvaltı sofra lokma
porsiyon ziyafet simit poğaça açma gözleme katmer bazlama yufka hamur tarhana kuskus kavurma güveç musakka
kumpir kokoreç işkembe paça haşlama yahni ızgara mangal kızılcık misket kuruyemiş çerez lavaş dürüm köz biftek
pirzola but kanat sakatat bonfile kıyma hayvan kedi köpek kuş at eşek katır inek öküz boğa dana buzağı manda
koyun kuzu keçi oğlak horoz civciv ördek kaz hindi güvercin serçe karga kartal şahin doğan atmaca baykuş
leylek turna kuğu flamingo papağan kanarya bülbül martı penguen aslan kaplan leopar çita jaguar pars vaşak
kurt tilki çakal sırtlan ayı panda koala kanguru zürafa zebra fil gergedan hipopotam maymun goril şempanze
orangutan yarasa sincap tavşan kirpi köstebek sıçan hamster kunduz geyik ceylan karaca domuz yılan kertenkele
timsah kaplumbağa kurbağa semender bukalemun iguana balina yunus fok mors yengeç ıstakoz istiridye salyangoz
sümüklüböcek solucan böcek karınca arı sinek sivrisinek kelebek güve tırtıl örümcek akrep çekirge bit pire
kene kuzgun saksağan ağaçkakan kırlangıç bıldırcın keklik sülün deve lama bizon dinozor ejderha yaratık
canavar yavru kuyruk pençe gaga tüy yele boynuz toynak yuva kafes ağıl kümes ahır yem tasma kovan vatoz
orkinos somon sazan yayın doğa dünya gezegen güneş ay yıldız gök bulut yağmur kar dolu sis buz rüzgar fırtına
kasırga hortum şimşek yıldırım hava iklim mevsim ilkbahar yaz sonbahar kış bahar deniz okyanus göl nehir ırmak
dere şelale kaynak pınar çeşme dalga kıyı sahil plaj kum çakıl taş kaya toprak çamur tepe dağ zirve vadi ova
yayla kanyon mağara volkan yanardağ ada yarımada körfez koy çöl vaha orman ağaç çalı ot çimen çim yaprak dal
gövde kök tohum fidan filiz tomurcuk çiçek gül lale papatya menekşe karanfil zambak sümbül nergis orkide
lavanta yasemin manolya çam meşe kavak söğüt çınar ladin köknar sedir selvi ıhlamur palmiye bambu kaktüs yosun
mantar ateş alev duman buhar enerji karanlık gece gündüz sabah öğle akşam şafak gün hafta yıl asır yüzyıl
dakika saniye zaman an maden altın gümüş bakır demir çelik kurşun kalay çinko alüminyum elmas yakut zümrüt
inci kristal! cam plastik kağıt karton tahta kumaş pamuk yün ipek keten naylon lastik kauçuk petrol! benzin
mazot doğalgaz oksijen hidrojen karbon atom molekül hücre gen virüs mikrop bakteri uzay galaksi meteor
kuyrukluyıldız dolunay hilal tutulma gelgit buzul çığ deprem sel kuraklık heyelan tufan bora poyraz lodos
meltem esinti çisenti sağanak kırağı çiy buzdağı ufuk ekvator kutup şehir kent köy kasaba ilçe il mahalle
sokak cadde bulvar meydan park köprü tünel yol otoyol kavşak kaldırım durak istasyon gar liman havalimanı
havaalanı terminal! otogar okul üniversite fakülte sınıf kütüphane müze sinema tiyatro opera stadyum hastane
eczane klinik banka postane karakol belediye mahkeme cezaevi hapishane cami kilise türbe saray kale kule hamam
çarşı pazar market dükkan mağaza butik büfe kafe kahvehane lokanta restoran pastane otel pansiyon motel kamp
ofis büro fabrika atölye depo ambar çiftlik tarla bağ bostan sera değirmen kuyu baraj fener iskele rıhtım
tersane apartman bina site villa gökdelen yurt sanayi kışla karargah sınır gümrük çadır kulübe barınak sığınak
mezar mezarlık anıt heykel havuz bank lunapark hayvanat sirk fuar sergi galeri stüdyo laboratuvar rasathane
planetaryum araba otomobil taksi otobüs minibüs dolmuş kamyon kamyonet tır traktör motosiklet bisiklet tren
metro tramvay vapur gemi tekne sandal kayık yat feribot denizaltı uçak helikopter roket balon paraşüt kızak
ambulans itfaiye tank teleferik asansör tekerlek direksiyon fren motor korna far plaka bagaj bilet yolculuk
seyahat gezi tatil harita pusula rota vagon lokomotif ray peron kabin kokpit kanatçık pervane dümen yelken
çapa kürek güverte gidon pedal zincir sele jant egzoz vites debriyaj kaporta kaput tampon silecek kask kitap
defter kalem kurşunkalem silgi kalemtıraş cetvel makas yapıştırıcı zımba ataş dosya klasör zarf mektup pul
kartpostal not ödev sınav test soru cevap ders konu kurs dershane tebeşir küre atlas sözlük ansiklopedi dergi
gazete roman hikaye öykü masal şiir destan makale yazı cümle kelime sözcük harf! hece alfabe rakam sayı
toplama çıkarma çarpma bölme matematik geometri fizik kimya biyoloji tarih coğrafya edebiyat felsefe müzik
sanat bilim teknoloji bilgi ilim ödül diploma karne puan başarı hata kalemlik önlük teneffüs öğretim eğitim
okuma yazma kompozisyon paragraf sayfa satır cilt bölüm başlık özet dipnot ünite kitapçık broşür afiş poster
ilan etiket fiş makbuz dilekçe aşk sevgi sevgili nefret öfke korku umut hayal! rüya düş düşünce fikir akıl
zeka duygu his heyecan sevinç mutluluk hüzün keder acı ağrı dert sorun problem çözüm amaç hedef niyet istek
arzu dilek dua şans kader talih fırsat tehlike risk güven inanç saygı onur gurur utanç ayıp suç ceza hak hukuk
kanun yasa kural adalet özgürlük barış savaş zafer yenilgi kavga tartışma anlaşma sözleşme söz vaat yemin sır
gizem mucize macera olay durum hal! iş meslek görev sorumluluk emek çaba gayret sabır cesaret merak ilgi
dikkat! hafıza anı hatıra geçmiş gelecek şimdi hayat yaşam ölüm doğum sağlık hastalık tedavi ilaç aşı grip
nezle öksürük yara para lira kuruş dolar avro fiyat ücret maaş borç kredi vergi fatura hesap kasa kart çek
hediye armağan sürpriz parti düğün nişan bayram tören kutlama festival! şenlik eğlence oyun oyuncak top
uçurtma bilye zar satranç dama tavla bulmaca bilmece şaka fıkra espri gülümseme kahkaha haber mesaj sinyal!
işaret sembol! renk şekil boyut ölçü ağırlık uzunluk genişlik yükseklik derinlik hız güç kuvvet gürültü şarkı
türkü melodi nota ritim dans halay sanatçı film dizi program kanal reklam sahne rol! karakter son başlangıç
orta merkez kenar köşe uç yan ön arka üst alt iç dış sağ sol yön kuzey güney doğu batı yer ülke devlet vatan
memleket bölge bayrak marş ordu silah tüfek tabanca kılıç mızrak ok yay kalkan zırh miğfer bomba füze mermi
barut kahır sitem özlem hasret vicdan merhamet şefkat! kıskançlık kibir tembellik cimrilik dürüstlük yalan
hile düzen kaos uyum denge ahenk birlik beraberlik dostluk düşmanlık yalnızlık sessizlik huzur rahatlık konfor
lüks zenginlik yoksulluk fakirlik açlık susuzluk uykusuzluk yorgunluk can ruh gönül yürek nabız tansiyon
elbise giysi kıyafet gömlek tişört kazak hırka ceket mont palto kaban yelek pantolon şort etek tayt pijama
çorap ayakkabı terlik bot çizme sandalet şapka bere kasket atkı eldiven kemer kravat papyon mendil şal eşarp
mayo bikini küpe kolye yüzük bilezik bileklik gözlük şemsiye cep düğme fermuar yaka iplik iğne yüksük kanaviçe
dantel nakış örgü desen astar cepken şalvar kaftan cübbe kürk pelerin maske peruk taç toka kurdele rozet
madalyon broş futbol! basketbol! voleybol! hentbol! yüzme koşu güreş boks judo karate halter jimnastik kayak
sörf dalış golf maç gol! file raket takım kaleci forvet defans taraftar tribün madalya şampiyonluk lig turnuva
rekor antrenman spor penaltı korner faul ofsayt devre skor tablosu forma krampon eşofman ısınma maraton sprint
atlama gülle cirit okçuluk eskrim binicilik yelkencilik davul zurna bağlama saz ud ney keman gitar piyano org
flüt klarnet trompet akordeon arp def darbuka kemençe mızıka trombon saksafon çello kontrbas bateri zilli maşa
kaval tulum internet tablet uygulama yazılım donanım robot makine cihaz alet araç gereç şifre video fotoğraf
mikrofon modem uydu anten işlemci bellek disk ağ bağlantı tuş imleç simge belge yedek sensör çip batarya
adaptör adres ad isim soyadı yaş boy kilo numara kimlik pasaport vize form rapor liste plan proje örnek model
tip tür çeşit cins grup ekip kulüp dernek şirket firma kurum kuruluş örgüt meclis hükümet cumhuriyet demokrasi
seçim oy sandık aday kampanya toplantı konferans kongre seminer tarım hayvancılık ticaret ekonomi politika
kültür medeniyet uygarlık gelenek görenek örf adet töre izin mesai vardiya randevu davet ziyaret sefer göç
sürgün keşif icat buluş deney gözlem araştırma inceleme analiz sonuç neden sebep etken etki tepki tavır
davranış hareket eylem adım girişim teşebbüs deneme alıştırma pratik teori kuram yöntem metot sistem yapı
biçim tarz üslup moda akım dönem çağ devir nesil kuşak soy köken pazartesi salı çarşamba perşembe cuma
cumartesi şubat mart nisan mayıs haziran temmuz ağustos eylül ekim kasım aralık ağıt alkış anahtarlık ambalaj
amblem anket arşiv asfalt aşama atık avantaj ayar bahane bakım bakış balçık bandaj bando bant baskı başkent
batak bayır beceri bedel benek beton boru boya buhran bulgu bunalım burç cephe cevher cıvata cila cisim çabuk
çağrı çare çark çekiç çelenk çengel çivi çizgi çizim çukur damla daire dağıtım defne değer değişim delik demet
destek detay dikiş dilim dinlence direk diyet dizgi doku dolgu düğüm düdük düzey ebat efsane ekin eklem eksen
eleştiri emir enkaz envanter erzak eser esin etkinlik evrak evren fayans fayda feryat fidanlık fişek fiyaka
formül fotokopi gaye gazoz gelir gider gidiş geliş gişe gözlükçü gram grev gurbet hamle hane hangar harç
harman hasar hazine hendek heves ihale ikram ilmek imza inşaat ipucu iskambil istif işlem işlev kabuk kademe
kafile kalıp kalite kanca kapasite kargo karşılık kasnak kaşe katalog katman kavram kaygı kazan kazı kazık
keçe kement kepenk kervan kese keski kıvılcım kira kiremit kireç kitle kodaman koku kokteyl koleksiyon kolon
kompas kontrol! koordinat kopya kordon kostüm kozmetik köşk kuruntu küf küme labirent lağım lezzet lif lisans
lise logo lokal! madde makara mal manşet manzara marka masraf matbaa mekan menfaat mengene merhem mesafe metin
mevki mezun mihrap miktar mimari minare mobilya mozaik mucit muska mühür müzayede nakit nesne nimet nokta
numune nüfus oba odak ölçek önem önlem örtü özellik pafta paket pano pansuman parça parfüm parmaklık parsel
pasaj pay pazarlık pense pervaz pinpon pist plaket platform podyum porselen portre posta pota pudra rampa
reçete rehber rekabet ruhsat rulo salça salgın sancak sapma sargı sayaç seçenek sedye semt sermaye sevk sicil
sirke siyaset slogan sohbet spiral stok sual sunum süreç süs şablon şahit şamandıra şantiye şarap şart şema
şerit şifa şikayet şube tabela tahıl takas taksit talep tane tarif tasarı tasarım tasarruf teklif telaş tel
tema temel temas tempo terazi teslimat teşvik tezgah tık tıp tuğla tuzak tül tütün uğraş ulaşım unvan usul!
uyarı üretim ürün vaka vakıf varlık vasıta vazife veri vida virgül yağış yamaç yangın yankı yapboz yarış
yarışma yatırım yazıhane yelpaze yemlik yükümlülük yük yumak yumru yüzey zahmet zam zanaat zarar zevk ziynet
zorluk ağırlama ağlama bekleme süzme dökme oturma yürüyüş koşuşturma alışveriş görüşme konuşma buluşma kavuşma
barışma tanışma uçuş dönüş giriş çıkış iniş biniş duruş anlayış seziş okuyuş yazılış dönemeç düzenleme abajur
abartı abone acemi aceleci adaçayı adaş ağaçlık ahize ahlak ahşap aidat akçe akıntı aktivite akvaryum alan
alarm alay albüm alçı alem alıcı alışkanlık allık altlık anlam anons antika arazi arena arıza arma armoni
ateşkes ayakkabılık aynalık ayrıntı badana bahçıvan baltalık baraka barbunya bayi bebeklik beklenti benzinlik
beyanname bıçkı biblo bidon bijuteri bilanço bilardo bileşen billur binbaşı bitki biyografi bluz bobin boncuk
bonus bordro borsa boyunluk boşluk bozkır branda burs buyruk canlılık cankurtaran cemiyet cephane cıva ciro
civar çağlayan çakı çalgı çamaşırhane çardak çayır çimento çini çizelge çömlek çöplük çörek dağcı dağcılık
daktilo dalgalı damga danışma darphane dekor demirhane denetim deneyim deste dinamo dirhem divan diyar dolmen
donanma döşek döşeme dürbün düzlük ecza egzersiz ehliyet eklenti elek emanet emekli emzik enginar enstrüman
esans eşik evlilik ezan fanus fasıl fayton fıçı figür filo filtre fitil fiyonk gazino gemici gerdanlık girdap
gofret gondol gölet gözetleme gözlemevi gravür güğüm gündem güneşlik güreşçi hafriyat hakemlik halat hamal
hasır haşhaş havalandırma haznedar hediyelik heybe hızar hostes ışıldak ibrik ikiz imbik inşaatçı ipotek
iskemle işçilik kahvaltılık kamış kanape kandil kantar kapan kaplıca kapsül karavan karnaval karyola kaset
katar kılavuz kılıf kırık kırlent kırtasiye kiler kitabe kitapçı kitaplık klozet koli kolonya komodin konak
konserve kontrat körük kumbara kundak kürsü leğen maket mandal manivela marmelat masaüstü maşrapa matara
medrese megafon merdane mermer mesken mezura mıknatıs mikser misafirhane muhtarlık nalbur nargile navlun
nazarlık nişasta oklava orkestra oto otopark oyuncakçı ödünç palamar paravan patika paye peştamal pikap pipet
piyango plak pompa portmanto potin radyatör rakı resepsiyon rögar rüzgarlık sabunluk sahan sahanlık salamura
saman sapan savak seccade semaver servis sıra sırık sızıntı sigorta silindir sini sirkülasyon sofa soğutucu
sopa sürgü şadırvan şamdan şebeke şezlong şırınga tabure teleskop telsiz termometre termos testere tığ tokmak
topaç tornavida tuzluk tülbent tüp ultrason vinç vitrin yaba yayık yazlık yumurtalık zımpara`,
A: `güzel çirkin iyi kötü büyük küçük uzun kısa geniş dar yüksek alçak derin sığ kalın ince ağır hafif sıcak soğuk
ılık serin taze bayat yeni eski genç yaşlı hızlı yavaş kolay zor basit karmaşık temiz kirli dolu boş açık
kapalı aydınlık karanlık parlak mat sert yumuşak kuru ıslak nemli sulu tatlı tuzlu acı ekşi lezzetli tatsız
güçlü zayıf şişman sıska zengin fakir yoksul mutlu mutsuz üzgün neşeli sevinçli kızgın öfkeli sinirli sakin
rahat huzurlu yorgun dinç aç tok susuz uykulu hasta sağlıklı sağlam akıllı zeki aptal cahil bilgili bilge
çalışkan tembel cesur korkak utangaç sıkılgan konuşkan sessiz gürültülü kibar nazik kaba saygılı dürüst
yalancı cömert cimri sevimli şirin hoş tuhaf garip acayip ilginç sıkıcı eğlenceli komik ciddi önemli gerekli
doğru yanlış gerçek sahte doğal yapay canlı cansız diri kırmızı mavi yeşil sarı turuncu mor pembe beyaz siyah
kara ak gri kahverengi lacivert bordo turkuaz eflatun bej krem renkli renksiz düz eğri yuvarlak kare sivri
keskin kör dik yatay dikey paralel modern klasik geleneksel milli yerli uzak yakın kalabalık tenha ıssız gizli
belli belirsiz net bulanık berrak duru pis ucuz pahalı değerli değersiz kıymetli nadir yaygın sık seyrek
sıradan özel genel resmi samimi içten sevecen şefkatli merhametli acımasız zalim kıskanç bencil mütevazı
kibirli gururlu inatçı sabırlı sabırsız meraklı ilgili ilgisiz dikkatli dikkatsiz düzenli dağınık titiz özenli
çabuk ani sürekli kalıcı geçici tam yarım eksik çeşitli farklı aynı benzer eşit denk dev minik ufak iri cüce
tombul zarif şık havalı sade süslü gösterişli lüks çıplak tüylü kıllı kel sarışın esmer kumral kızıl solgun
sıkı gevşek gergin sıkışık ferah bol kıt yasak serbest özgür esir bağımsız birleşik ayrı ortak bireysel toplu
yalnız meşgul! normal! ideal! final! sosyal! orijinal! global! formal! lokal! dijital! total! liberal!
radikal! muhteşem harika mükemmel berbat rezil şahane fevkalade olağan olağanüstü müthiş korkunç dehşetli cici
sevgili aziz kutsal masum suçlu haklı haksız adil insaflı insafsız vicdanlı vicdansız hain sadık vefalı
vefasız kararlı kararsız cesaretli girişken atılgan çekingen ürkek ürpertici gizemli esrarlı sihirli büyülü
masalsı efsanevi tarihi antik ilkel çağdaş güncel eskimiş yıpranmış kırık bozuk çatlak delik yırtık yamuk
çarpık kambur topal sağır dilsiz şaşı kekeme çolak sakat yaralı bitkin halsiz keyifli keyifsiz neşesiz hüzünlü
kederli acılı dertli tasalı kaygılı endişeli tedirgin huzursuz korkulu ürkütücü tehlikeli güvenli emin şüpheli
kuşkulu kesin muhtemel olası gereksiz faydalı yararlı zararlı verimli verimsiz bereketli kurak çorak sulak
dağlık engebeli kumlu çamurlu tozlu dumanlı sisli bulutlu yağmurlu karlı rüzgarlı fırtınalı güneşli ılıman
akıcı alımlı alıngan anlamlı anlamsız arsız asil asık atak ayıp bağımlı baskın başarılı başarısız batıl belalı
beceriksiz becerikli bilinçli bilinçsiz bitişik buğulu buruk buruşuk cılız cıvık coşkulu cüretkar çalımlı
çapkın çekici çelimsiz çetin çevik çıtır çilli çürük dalgın davetkar dayanıklı dayanıksız değişik değişken
detaylı devasa dindar dinamik dingin dirençli doyumsuz dökük dolgun duyarlı duyarsız duygusal düşünceli düşük
ebedi edepli edepsiz eğik ekonomik elverişli emektar engelli erdemli erken esnek eşsiz etkili etkisiz evcil
evli fani feci gamsız geçkin gelişmiş gelişigüzel geveze göçebe gönüllü görkemli gösterişsiz gözde güçsüz
gülünç güleç güvenilir hafifmeşrep hamarat hantal hareketli hassas hayırlı hayırsız hayali hazır hevesli
hilekar hırçın hırslı hoşgörülü hukuki huysuz hür ılımlı inişli insancıl itaatkar izinli kabadayı kaçak kadim
kalitesiz kaliteli kalpsiz kamusal kanlı kansız kapsamlı karamsar karışık kasvetli katı kavgacı kayıp kıvrak
kıvırcık kişisel kolaycı konforlu kopuk korunaklı koyu kuralcı kurnaz kusurlu kusursuz kuvvetli küstah
kötümser lekeli lekesiz maceracı maddi mahcup manevi marifetli maskeli mavimsi meçhul medeni memnun mesut
meşhur mevcut minnettar mistik mızmız muazzam muntazam mutlak mülayim münasip nafile namlı namuslu narin nazlı
nefis nitelikli nostaljik obur oyunbaz ölümlü ölümsüz önemsiz öncül özgün pasaklı pasif aktif paslı patavatsız
pısırık pinti pratik rahatsız romantik sağduyulu sakar saf sağlıksız salaş samimiyetsiz sarhoş sefil sevdalı
sevimsiz sinsi sıhhatli sıkıntılı sıradışı somut soyut sorumlu sorumsuz suskun şakacı şanslı şanssız şaşkın
şeffaf şımarık şiddetli şişko şüpheci tanıdık tanınmış tarafsız tasasız taşkın tedbirli tehlikesiz telaşlı
terbiyeli terbiyesiz teslim tıknaz tutkulu tutucu tutumlu uçarı uçsuz ulu umutlu umutsuz uslu uyanık uygun
uyumlu uyumsuz uzman ücretsiz ünlü üşengeç vahşi varlıklı vasat yabani yakışıklı yalın yaman yapışkan yaratıcı
yardımsever yaramaz yararsız yetenekli yeteneksiz yetersiz yeterli yılışık yiğit yorucu yüce zahmetli zararsız
zevkli zevksiz zinde zorlu zorunlu`,
V: `al ver gel git* yap et* ol bil gör bak dur kal çık gir koş yürü otur kalk yat uyu uyan iç oku yaz çiz sil sor
söyle konuş anla dinle izle bekle ara bul kaybet* kazan başla bitir bit dön döndür getir götür taşı at tut
bırak aç kapa kapat sev sevin üzül kız gül ağla kork sat öde düşün hatırla unut öğren öğret çalış dene seç giy
çıkar yıka temizle pişir kes doğra karıştır koy sür öl doğ büyü küçül yaşa oyna sakla gizle göster anlat sus
bağır çağır uç yüz atla zıpla tırman düş kır kırıl boz bozul yık yıkıl kur kurul aş geç geçir eğlen dinlen
sinirlen heyecanlan utan şaşır inan güven özle beğen iste dile yolla gönder taşın yerleş sıkıl acık susa doy
ısın üşü terle hastalan iyileş büyüt yetiş yetiştir topla böl çarp ekle say hesapla ölç tart dik ek biç sula
kaz göm sök tak bağla çöz ör yala ısır çiğne yut kokla dokun hisset* duy sez tat* seyret* affet* reddet*
zannet* kaybol kaç kovala yakala it çek sürükle fırlat savur salla sars titre çal kirala borçlan harca
biriktir yatır kutla evlen boşan nişanlan doğur besle eğit öp sarıl kucakla okşa giyin soyun yıkan taran boya
ört sar katla ütüle as onar fısılda mırıldan öt havla miyavla kükre sürün emekle dolaş gez gezin bin in uzan
uzat kısalt genişlet daralt yükselt alçal düzelt değiş değiştir dönüş dönüştür sabret* şükret* emret* kahret*
keşfet* kaydet* hallet* hapset* naklet* devret* defet* güt* dağıt dağıl toplan birleş birleştir ayır ayrıl
katıl bekleş görüş tanış tanıt buluş kavuş barış küs darıl kızdır sevindir üz güldür ağlat korkut şaşırt uyut
uyandır yedir içir giydir oturt kaldır indir bindir çıkart sokul sok sakın kurtar kurtul kaçır tutukla yargıla
cezalandır ödüllendir öv yer eleştir suçla bağışla yardımlaş paylaş paylaştır yönet yönlendir denetle yürüt
çalıştır işlet kullan tüket üret yarat tasarla planla hazırla düzenle sırala diz yerleştir süpür parlat cilala
sıva döşe kapla örtül koru korun beklet ertele hızlan hızlandır yavaşla yavaşlat durdur başlat tamamla eksil
artır azal azalt çoğal çoğalt küçült genişle daral yüksel ısıt soğut dondur eri erit kaynat kızart haşla kavur
fırınla közle tuzla şekerle tatlandır baharatla çırp yoğur rendele soy dilimle süz sık sıkıştır ez öğüt koklaş
öpüş kucaklaş sıkış selamlaş vedalaş konuştur dinlet okut yazdır çizdir açıkla tanımla tarif özetle yorumla
çevir hecele ezberle tekrarla sına değerlendir puanla notla karşılaştır ele sınıflandır grupla sek sıçra kay
kaydır yuvarla yuvarlan sallan devril devir gevşe gevşet ger esne eğil eğ bük kopar kop yırt yırtıl del delin
tıka kilitle gülümse kıkırda hıçkır inle sızlan şikayetlen haykır söylen homurdan ıslıkla alkışla şakalaş
takıl sinirlendir gücen alın düşle um bağlan anımsa an kurgula oy yont şekillendir süsle donat kon tüne
cıvılda vızılda dal batır bat yüzdür boğ boğul ıslan ıslat kurula kuru kurut ürper yan yak söndür sön tutuş
parla parılda ışılda karar ağar sarar kızar morar mavileş yeşer çiçeklen filizlen olgunlaş çürü kokuş satın
ödünç takasla pazarla zamla ucuzla pahalan ulaştır ulaş var uğra sap eriş yaklaş uzaklaş görün belir gizlen
saklan araştır incele gözle gözlemle dikil`,
W: `ben sen biz siz onlar bana sana ona bize size onlara beni seni onu bizi sizi onları benim senin onun bizim
sizin onların bende sende onda bizde sizde onlarda benden senden ondan bizden sizden onlardan benimle seninle
onunla bizimle sizinle kendi kendim kendin kendisi kendimiz kendiniz kendileri hepsi herkes kimse biri birisi
birileri bazı bazıları bazen hiç hiçbir hiçbiri her hep hepimiz hepiniz daima asla artık şimdi bugün yarın dün
sonra önce hemen henüz daha çok biraz pek gayet oldukça epey hayli yine gene tekrar bile sadece ancak ama
fakat lakin veya ile çünkü eğer ise madem için gibi kadar göre karşı beri dolayı rağmen üzere evet hayır tamam
peki belki elbette tabii kesinlikle mutlaka galiba herhalde sanki acaba nasıl neden niçin niye nerede nereye
nereden nereli hangi hangisi kaç kaçta kaçıncı kim kime kimi kimin kimde kimden neyi neye nede burada şurada
orada burası şurası orası buraya oraya şuraya buradan oradan şuradan bunlar şunlar bunu şunu bunun şunun bunda
şunda bundan şundan bunları şunları öyle böyle şöyle bunca nice merhaba selam günaydın hoşçakal teşekkür
teşekkürler sağol lütfen pardon affedersiniz rica tebrikler maşallah inşallah haydi hadi aferin bravo eyvah
eyvallah yaşasın imdat yazık vah hey hoppala oha bir iki üç dört beş altı yedi sekiz dokuz yirmi otuz kırk
elli altmış yetmiş seksen doksan yüz bin milyon milyar sıfır yarım çeyrek birinci ikinci üçüncü dördüncü
beşinci altıncı yedinci sekizinci dokuzuncu onuncu yüzüncü birer ikişer üçer dörder beşer altışar yedişer
sekizer dokuzar onar yüzer biner ikisi üçü dördü beşi altısı yedisi sekizi dokuzu ikimiz üçümüz ikiniz ikinizi
demek dedi dedim dedik dediler diyor diyorum diyecek demiş diyen demeli deme demez derken yemek yedim yedik
yediler yiyor yiyorum yiyecek yemiş yiyen yemeli yeme yemez yerken gidiyor gidiyorum gidecek gidecekler giden
giderek gitti gittim gittik gittiler gelir gelirim gelirken gider yapar yaparım yaparken alır alırım verir
verirken olur olurken olmaz bilir bilirim görür bakar durur kalır çıkar girer koşar yürür oturur kalkar yatar
uyur içer okur yazar çizer sorar söyler konuşur anlar dinler izler bekler arar bulur kazanır başlar biter
döner getirir götürür taşır atar tutar bırakır açar kapar sever güler ağlar korkar satar öder düşünür hatırlar
unutur öğrenir öğretir çalışır dener seçer giyer yıkar keser koyar ölür doğar büyür yaşar oynar saklar
gösterir anlatır susar uçar atlar düşer kırar kurar geçer inanır güvenir özler beğenir ister gönderir sayar
duyar tadar eder ederim edecek etti ettim ettik etmiş etmek eden ediyor ediyorum edemez etmez olacak olacağım
olmuş olmak olan oldu oldum olduk oluyor oluyorum olsun olsa olmalı olabilir olamaz olmayan olduğu olduğunu
olduğum değil değilim değilsin değiliz var vardı varmış yok yoktu yokmuş idi imiş iken ikenki sıcacık serince
kupkuru sırılsıklam tertemiz upuzun kısacık minicik ufacık bembeyaz kapkara simsiyah kıpkırmızı masmavi
yemyeşil sapsarı mosmor dupduru dümdüz yepyeni eskice ağırca kolayca yavaşça hızlıca sessizce gizlice usulca
dikkatlice tatlıca akıllıca bencilce yaşlıca yüksekçe zayıfça zengince yumuşacık sapasağlam rengarenk kocaman
güzelce iyice azıcık çabucak yavaşçacık hemencecik birden aniden derhal yeniden baştan sonunda nihayet ilkin
önceden sonradan şimdiden yarından bugünden dünden gündüzün geceleyin sabahleyin akşamleyin yazın kışın
baharda güzün sık arada sırada ara sıra genellikle çoğunlukla nadiren beraber birlikte ayrı tek yavaş yalnızca
özellikle bilhassa aslında gerçekten doğrusu açıkçası kısaca uzunca uzun bol apansız ansızın yukarı aşağı
ileri geri içeri dışarı öte karşıda yukarıda aşağıda içeride dışarıda ileride geride önde arkada yanında
üstünde altında içinde dışında önünde arkasında arasında ortasında karşısında yakında uzakta evde okulda işte
yolda kitapçı gözlükçü sütçü simitçi çiçekçi dondurmacı kebapçı dönerci pideci köfteci tatlıcı börekçi
yoğurtçu çaycı kahveci oyuncakçı kırtasiyeci eskici hurdacı kuruyemişçi bilgisayarcı telefoncu camcı halıcı
kilimci pazarcı saatçi ayakkabıcı lokantacı otelci turşucu balcı peynirci şekerci lokumcu mobilyacı kunduracı
semerci nalbant bakırcı kalaycı sepetçi çömlekçi çinici hattat ciltçi matbaacı sucu gazozcu bozacı salepçi
sahaflar sahaf dilci sözlükçü tarihçi coğrafyacı edebiyatçı matematikçi fizikçi kimyacı biyolog sosyolog
psikolog arkeolog jeolog astronom gökbilimci dilbilimci şakacı inatçı kavgacı yardımcı yolcu sporcu koşucu
yüzücü güreşçi boksör okçu atıcı nişancı binici avcı tuzakçı rehber kılavuz çalgıcı davulcu zurnacı kemancı
gitarcı piyanist flütçü sazcı gözlük tuzluk kitaplık şekerlik kömürlük odunluk ayakkabılık kulaklık sözlük
yağmurluk gecelik önlük dizlik başlık kalemlik çöplük mezarlık ormanlık çamlık kayalık taşlık kumluk çimenlik
otluk sazlık çiçeklik gelinlik damatlık günlük aylık yıllık haftalık saatlik dakikalık gündelik yazlık kışlık
güneşlik gölgelik askılık banyoluk mutfaklık yemeklik bayramlık hediyelik kahvaltılık lokantalık sabahlık
akşamlık öğlelik çocukluk gençlik yaşlılık ihtiyarlık bebeklik kardeşlik arkadaşlık dostluk komşuluk insanlık
hayvanlık babalık annelik evlilik bekarlık öğrencilik öğretmenlik doktorluk askerlik başkanlık krallık
padişahlık sultanlık beylik ağalık paşalık hanımlık efendilik ustalık çıraklık işçilik memurluk patronluk
kahramanlık liderlik delilik aptallık hırsızlık korsanlık casusluk dedektiflik kölelik esirlik tutsaklık
yolculuk denizcilik balıkçılık avcılık çiftçilik çobanlık kasaplık terzilik berberlik aşçılık garsonluk
bakkallık marangozluk demircilik kuyumculuk gözyaşları mutluluklar sevgiler selamlar saygılar başarılar
kutlamalar iyilikler güzellikler mutlulukla sevgiyle saygıyla sabırla dikkatle özenle hızla yavaşlıkla neşeyle
korkuyla üzüntüyle merakla heyecanla umutla sevinçle gururla öfkeyle kırmızılık mavilik yeşillik sarılık
beyazlık siyahlık karalık anneciğim babacığım canım canımız tatlım hayatım güzelim kuzum yavrum ilkokul
ortaokul lise üniversite anaokulu kreş yuva dershane yurt pansiyon öğrenciler öğretmenler müdürler okullar
sınıflar dersler kitaplar defterler kalemler alışveriş alışverişler yardım yardımlar iyi akşamlar geceler hoş
geldin bulduk geçmiş afiyet kolay gelsin solda sağda ortada köşede kenarda akşamüstü ateşböceği ayçiçeği
başörtüsü buzdolabı denizanası denizatı denizyıldızı devekuşu eşekarısı gökkuşağı gökyüzü gözbebeği gözyaşı
hamamböceği kafatası kesekağıdı köpekbalığı milletvekili mürekkepbalığı rengeyiği suaygırı tavukgöğsü
tavuskuşu tereyağı uğurböceği yılbaşı zeytinyağı kafatasları buzdolapları köpekbalıkları gökkuşakları
milletvekilleri ayçiçekleri başörtüleri tereyağlı zeytinyağlı ilk son sonraki önceki lazım bütün tüm mümkün
imkansız fazla çift tekli çiftler`
};

/* ---------- Türkçe ses uyumu ve türetme ---------- */
const VOW = 'AEIİOÖUÜ', FRONT = 'EİÖÜ', HARD = 'ÇFHKPSŞT';
const ALPHA = new Set('ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ');
const LETTERS = [...'ABCÇDEFGĞHIİKLMNOÖPRSŞTUÜVYZ'];
const lastV = w => { for (let i = w.length - 1; i >= 0; i--) if (VOW.includes(w[i])) return w[i]; return 'E'; };
const isFront = (w, f) => f || FRONT.includes(lastV(w));
const a2 = (w, f) => isFront(w, f) ? 'E' : 'A';
const i4 = (w, f) => { const v = lastV(w); if (f) return 'OU'.includes(v) || 'ÖÜ'.includes(v) ? 'Ü' : 'İ'; return { A: 'I', I: 'I', O: 'U', U: 'U', E: 'İ', İ: 'İ', Ö: 'Ü', Ü: 'Ü' }[v]; };
const endsV = w => VOW.includes(w[w.length - 1]);
const dt = w => HARD.includes(w[w.length - 1]) ? 'T' : 'D';
const FOLD = { Ç: 'C', Ğ: 'G', İ: 'I', Ö: 'O', Ş: 'S', Ü: 'U' };
const foldC = c => FOLD[c] || c;

function nounForms(w, f) {
  const pl = w + 'L' + a2(w, f) + 'R', loc = w + dt(w) + a2(w, f);
  const o = [w, pl, pl + i4(pl), pl + 'D' + a2(pl), pl + 'D' + a2(pl) + 'N', loc, loc + 'N', w + 'L' + i4(w, f), w + 'S' + i4(w, f) + 'Z'];
  if (endsV(w) && w.length > 2) o.push(w + 'Y' + a2(w, f), w + 'Y' + i4(w, f), w + 'S' + i4(w, f));
  return o;
}
function adjForms(w, f) { return [w, w + 'L' + a2(w, f) + 'R', w + 'L' + i4(w, f) + 'K']; }
function verbForms(s, voice) {
  const v = endsV(s), sv = voice && s.endsWith('T') ? s.slice(0, -1) + 'D' : s, a = a2(s), di = s + dt(s) + i4(s);
  const vs = v ? s + 'Y' : sv;
  const iyor = v ? s.slice(0, -1) + i4(s.slice(0, -1)) + 'YOR' : sv + i4(s) + 'YOR';
  return [s, s + 'M' + a + 'K', s + 'M' + a, s + 'M' + a + 'Z', s + 'M' + a + 'L' + i4(s + 'M' + a), di, di + 'M', di + 'K', di + 'L' + a2(di) + 'R',
    s + 'M' + i4(s) + 'Ş', iyor, iyor + 'UM', vs + a + 'C' + a + 'K', vs + a + 'N', vs + a + 'R' + a + 'K'];
}

let DICT = null;
function buildDict() {
  const t0 = Date.now();
  const full = new Set(), base = new Set();
  const ok = w => w.length >= 3 && w.length <= 25 && [...w].every(c => ALPHA.has(c));
  const add = (w, isBase) => { if (!ok(w)) return; full.add(w); if (isBase) base.add(w); };
  const toks = s => up(s).split(/\s+/).filter(Boolean);
  for (const t of toks(RAW.N)) { const f = t.endsWith('!'), w = t.replace('!', ''); add(w, true); nounForms(w, f).forEach(x => add(x)); }
  for (const t of toks(RAW.A)) { const f = t.endsWith('!'), w = t.replace('!', ''); add(w, true); adjForms(w, f).forEach(x => add(x)); }
  for (const t of toks(RAW.V)) { const vc = t.endsWith('*'), s = t.replace('*', ''); const fs = verbForms(s, vc); add(fs[1], true); fs.forEach(x => add(x)); }
  for (const t of toks(RAW.W)) add(t, true);
  const W5 = window.WORDS5;
  if (W5) for (const k of ['answers', 'extra']) if (typeof W5[k] === 'string') for (const t of toks(W5[k])) add(t, true);
  DICT = { set: full, base, size: full.size, pre: null, ms: Date.now() - t0 };
  return DICT;
}
const dict = () => DICT || buildDict();
// Çözücü için ön ek kümesi (yalnızca oyunu yöneten cihazda, ilk ihtiyaçta)
function prefixes() {
  const D = dict(); if (D.pre) return D.pre;
  const P = new Set();
  for (const w of D.set) { const a = [...w]; let s = ''; for (let i = 0; i < a.length - 1; i++) { s += a[i]; P.add(s); } }
  return (D.pre = P);
}

/* ---------- tahta: harf ağırlıkları, komşuluk, çözücü ---------- */
const VWT = { A: 12, E: 9.5, İ: 8.5, I: 5, U: 3.3, O: 2.6, Ü: 2, Ö: .8 };
const CWT = { N: 7.5, R: 7, L: 6.2, K: 5, D: 4.6, M: 4, Y: 3.4, T: 3.4, S: 3.2, B: 2.6, Ş: 1.8, Z: 1.6, G: 1.3, Ç: 1.4, H: 1.1, Ğ: .7, V: .9, C: 1, P: .8, F: .3 };
const RARE = new Set('ĞÖFVCPHJ');
const NB = {};
function nbrs(n) {
  if (NB[n]) return NB[n];
  const out = [];
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n), c = i % n, a = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue; const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < n && cc >= 0 && cc < n) a.push(rr * n + cc);
    }
    out.push(a);
  }
  return (NB[n] = out);
}
const adj = (n, a, b) => nbrs(n)[a].includes(b);
function wpick(W) { let t = 0; for (const k in W) t += W[k]; let r = Math.random() * t; for (const k in W) { r -= W[k]; if (r <= 0) return k; } return Object.keys(W)[0]; }
function rawBoard(n) {
  const N = n * n, nv = n === 4 ? 6 + (Math.random() < .45 ? 1 : 0) : 10 + (Math.random() < .5 ? 1 : 0);
  const cnt = {}, out = [];
  const take = W => { for (let k = 0; k < 40; k++) { const L = wpick(W); const lim = RARE.has(L) ? 1 : (n === 4 ? 2 : 3); if ((cnt[L] || 0) < lim || k === 39) { cnt[L] = (cnt[L] || 0) + 1; return L; } } return 'A'; };
  for (let i = 0; i < nv; i++) out.push(take(VWT));
  for (let i = nv; i < N; i++) out.push(take(CWT));
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
function solve(board, n) {
  const D = dict(), P = prefixes(), NBn = nbrs(n), out = new Set(), used = new Array(n * n).fill(false);
  const go = (i, s, len) => {
    s += board[i]; len++;
    const isW = len >= 3 && D.set.has(s), isP = P.has(s);
    if (isW) out.add(s);
    if (!isP) return;
    used[i] = true;
    for (const j of NBn[i]) if (!used[j]) go(j, s, len);
    used[i] = false;
  };
  for (let i = 0; i < n * n; i++) go(i, '', 0);
  return [...out];
}
const MIN_WORDS = { 4: 45, 5: 95 };
function genBoard(n) {
  let best = null;
  for (let k = 0; k < 60; k++) {
    const b = rawBoard(n), w = solve(b, n);
    const long = w.some(x => [...x].length >= 6);
    if (!best || w.length > best.words.length) best = { board: b, words: w };
    if (w.length >= MIN_WORDS[n] && long) return { board: b, words: w, tries: k + 1 };
  }
  return Object.assign(best, { tries: 60 });
}
const clean = raw => [...up(String(raw == null ? '' : raw))].filter(c => ALPHA.has(c)).slice(0, 25).join('');
function validPath(board, n, w, path) {
  const L = [...w];
  if (!Array.isArray(path) || path.length !== L.length) return false;
  const seen = new Set();
  for (let k = 0; k < path.length; k++) {
    const i = path[k];
    if (!Number.isInteger(i) || i < 0 || i >= n * n || seen.has(i) || board[i] !== L[k]) return false;
    if (k && !adj(n, path[k - 1], i)) return false;
    seen.add(i);
  }
  return true;
}
// Kelimenin tahtadaki yolları. loose: İ/I, Ş/S… farkını yok say (gerçek harfleri de döndürür)
function findPaths(board, n, w, loose, cap = 12) {
  const L = [...w], NBn = nbrs(n), out = [], used = new Array(n * n).fill(false), path = [];
  const eq = (a, b) => loose ? foldC(a) === foldC(b) : a === b;
  const go = (i, k) => {
    if (out.length >= cap || used[i] || !eq(board[i], L[k])) return;
    used[i] = true; path.push(i);
    if (k === L.length - 1) out.push({ path: path.slice(), w: path.map(j => board[j]).join('') });
    else for (const j of NBn[i]) go(j, k + 1);
    used[i] = false; path.pop();
  };
  if (L.length) for (let i = 0; i < n * n; i++) go(i, 0);
  return out;
}
const findPath = (board, n, w) => { const r = findPaths(board, n, w, false, 1); return r.length ? r[0].path : null; };
// Bir denemeyi değerlendirir. r: ok | dup | short | dict | board
function judge(board, n, raw, path, mine) {
  const w = clean(raw), D = dict(), has = x => mine && mine.indexOf(x) >= 0;
  if ([...w].length < 3) return { r: 'short', w };
  const exact = validPath(board, n, w, path) ? path : findPath(board, n, w);
  if (exact && D.set.has(w)) return has(w) ? { r: 'dup', w } : { r: 'ok', w, path: exact };
  const alts = findPaths(board, n, w, true, 24);
  const hit = alts.find(a => D.set.has(a.w));
  if (hit) return has(hit.w) ? { r: 'dup', w: hit.w } : { r: 'ok', w: hit.w, path: hit.path };
  if (!exact && !alts.length) return { r: 'board', w };
  return { r: 'dict', w: exact ? w : alts[0].w };
}
const pts = L => L < 3 ? 0 : L <= 4 ? 1 : L === 5 ? 2 : L === 6 ? 3 : L === 7 ? 5 : 11;
const wlen = w => [...w].length;
const byLen = (a, b) => wlen(b) - wlen(a) || a.localeCompare(b, 'tr');

/* ---------- kurallar (yöneten cihaz) ---------- */
const SHAKE_MS = 2900, REVEAL_MS = 35000, FINAL_MS = 45000, GRACE_MS = 700, MAX_FOUND = 500;
const SKILL = {
  acemi: { gap: [7500, 14000], first: [5000, 9000], max: 5, pref: -1 },
  usta: { gap: [4300, 8200], first: [3000, 6000], max: 6, pref: 0 },
  dahi: { gap: [2400, 4800], first: [1800, 3500], max: 99, pref: 1 }
};
const rnd = (a, b) => a + Math.random() * (b - a);
const humanOn = (st, i) => !st.pl[i].isBot && st.on[i];

function setup(players, opts, ctx) {
  const st = {
    pl: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })),
    on: players.map(() => true),
    size: String(opts.size) === '5' ? 5 : 4,
    sec: String(opts.time) === '180' ? 180 : 120,
    rounds: String(opts.rounds) === '3' ? 3 : 1,
    mode: opts.mode === 'herkes' ? 'herkes' : 'klasik',
    skill: SKILL[opts.skill] ? opts.skill : 'usta',
    round: 0, phase: 'shake', endAt: 0, dur: 0, tk: 0,
    board: [], words: [], found: players.map(() => []), score: players.map(() => 0), nw: players.map(() => 0),
    hist: [], rev: null, ready: players.map(() => false), best: null
  };
  startRound(st, ctx);
  return st;
}
function startRound(st, ctx) {
  st.round++;
  const g = genBoard(st.size);
  st.board = g.board; st.words = g.words;
  st.found = st.pl.map(() => []); st.rev = null; st.ready = st.pl.map(() => false);
  st.phase = 'shake'; st.dur = SHAKE_MS; st.endAt = Date.now() + SHAKE_MS; st.tk++;
  ctx.emit({ t: 'shake', r: st.round }, `${st.round}. tur: kutu sallandı! Tahtada ${st.words.length} kelime saklı.`, 'gold');
  arm(st, ctx); ctx.sync();
}
function startPlay(st, ctx) {
  st.phase = 'play'; st.dur = st.sec * 1000; st.endAt = Date.now() + st.dur; st.tk++;
  ctx.emit({ t: 'go' });
  arm(st, ctx); ctx.sync();
}
function arm(st, ctx) {
  const tk = st.tk, now = Date.now();
  const at = (t, fn) => ctx.later(Math.max(0, t - now), () => { if (st.tk === tk) fn(); });
  if (st.phase === 'shake') at(st.endAt, () => startPlay(st, ctx));
  else if (st.phase === 'play') {
    at(st.endAt, () => closeRound(st, ctx));
    const s = SKILL[st.skill];
    st.pl.forEach((p, i) => { if (p.isBot) at(now + rnd(s.first[0], s.first[1]), () => botStep(st, ctx, i)); });
  } else if (st.phase === 'reveal') at(st.endAt, () => nextOrEnd(st, ctx));
}
function botPick(st, i) {
  const s = SKILL[st.skill], D = dict(), mine = new Set(st.found[i]);
  let pool = st.words.filter(w => !mine.has(w) && wlen(w) <= s.max);
  if (!pool.length) pool = st.words.filter(w => !mine.has(w));
  if (!pool.length) return null;
  const wt = pool.map(w => { const L = wlen(w); let x = D.base.has(w) ? 3 : 1; x *= s.pref > 0 ? L * L / 9 : s.pref < 0 ? 4 / L : 1; return x; });
  let t = wt.reduce((a, b) => a + b, 0), r = Math.random() * t;
  for (let k = 0; k < pool.length; k++) { r -= wt[k]; if (r <= 0) return pool[k]; }
  return pool[pool.length - 1];
}
function botStep(st, ctx, i) {
  if (st.phase !== 'play' || !st.pl[i] || !st.pl[i].isBot) return;
  const w = botPick(st, i);
  if (w) submit(st, ctx, i, w, findPath(st.board, st.size, w), 'b');
  const s = SKILL[st.skill], tk = st.tk, next = rnd(s.gap[0], s.gap[1]);
  if (w && Date.now() + next < st.endAt) ctx.later(next, () => { if (st.tk === tk) botStep(st, ctx, i); });
}
function submit(st, ctx, pi, raw, path, id) {
  if (st.phase !== 'play' || Date.now() > st.endAt + GRACE_MS) return null;
  if (st.found[pi].length >= MAX_FOUND) return null;
  const j = judge(st.board, st.size, raw, path, st.found[pi]);
  const L = j.r === 'ok' ? wlen(j.w) : 0;
  if (j.r === 'ok') st.found[pi].push(j.w);
  // kelimenin kendisi olaya yazılmaz: bulunan kelimeler tur sonuna kadar gizli
  ctx.emit({ t: 'res', pi, id: String(id || '').slice(0, 24), r: j.r, pts: pts(L), len: L, n: st.found[pi].length },
    L >= 7 ? `${st.pl[pi].name} ${L} harfli bir kelime buldu! 🔥` : '', 'gold');
  if (j.r === 'ok') ctx.sync();
  return j;
}
function closeRound(st, ctx) {
  if (st.phase !== 'play') return;
  const D = dict(), cnt = {};
  st.found.forEach(f => f.forEach(w => { cnt[w] = (cnt[w] || 0) + 1; }));
  const per = st.found.map(f => {
    const list = f.slice().sort(byLen).map(w => { const x = st.mode === 'klasik' && cnt[w] > 1; return { w, p: x ? 0 : pts(wlen(w)), x: x ? 1 : 0 }; });
    return { list, sum: list.reduce((a, o) => a + o.p, 0), n: list.filter(o => !o.x).length };
  });
  const prev = st.score.slice();
  per.forEach((r, i) => { st.score[i] += r.sum; st.nw[i] += r.n; });
  const all = Object.keys(cnt).sort(byLen);
  let best = null;
  if (all.length) { const w = all[0]; best = { w, who: st.found.map((f, i) => f.includes(w) ? i : -1).filter(i => i >= 0), len: wlen(w) }; }
  if (best && (!st.best || best.len > st.best.len)) st.best = Object.assign({ r: st.round }, best);
  const missed = st.words.filter(w => !cnt[w]).sort((a, b) => wlen(b) - wlen(a) || (D.base.has(b) - D.base.has(a)) || a.localeCompare(b, 'tr')).slice(0, 10);
  st.rev = { round: st.round, per, prev, score: st.score.slice(), best, missed, total: st.words.length, foundAll: all.length, last: st.round >= st.rounds };
  st.hist.push(per.map(r => r.sum));
  st.phase = 'reveal'; st.dur = st.rev.last ? FINAL_MS : REVEAL_MS; st.endAt = Date.now() + st.dur; st.tk++;
  const top = per.map((r, i) => i).sort((a, b) => per[b].sum - per[a].sum)[0];
  ctx.emit({ t: 'reveal' }, `Süre doldu! Turun en iyisi ${st.pl[top].name} (+${per[top].sum}).${best ? ` En uzun kelime: ${best.w}.` : ''}`, 'good');
  arm(st, ctx); ctx.sync();
}
function allReady(st) { const h = st.pl.map((p, i) => i).filter(i => humanOn(st, i)); return h.every(i => st.ready[i]); }
function nextOrEnd(st, ctx) {
  if (st.phase !== 'reveal') return;
  if (st.round < st.rounds) { startRound(st, ctx); return; }
  finish(st, ctx);
}
function finish(st, ctx) {
  st.phase = 'end'; st.tk++;
  const order = st.pl.map((p, i) => i).sort((a, b) => st.score[b] - st.score[a] || st.nw[b] - st.nw[a]);
  const w = order[0], tie = order.length > 1 && st.score[order[1]] === st.score[w];
  ctx.emit({ t: 'win', pi: tie ? -1 : w }, tie ? 'Oyun berabere bitti!' : `${st.pl[w].name} kazandı! 🏆`, 'gold');
  ctx.sync();
  ctx.end({
    title: tie ? 'Berabere!' : `${st.pl[w].name} kazandı!`,
    ranking: order.map(i => ({ pi: i, score: st.score[i], label: `${st.score[i]} puan · ${st.nw[i]} kelime` })),
    note: st.best ? `En uzun kelime: ${st.best.w} (${st.best.len} harf) — ${st.best.who.map(i => st.pl[i].name).join(', ')}` : 'Kelime Kare'
  });
}
function action(st, pi, a, ctx) {
  if (!a || st.phase === 'end' || !st.pl[pi] || st.pl[pi].isBot) return;
  if (a.t === 'word') { if (typeof a.w !== 'string' || a.w.length > 60) return; submit(st, ctx, pi, a.w, Array.isArray(a.p) ? a.p.slice(0, 26) : null, a.id); return; }
  if (a.t === 'ready') {
    if (st.phase !== 'reveal' || st.ready[pi]) return;
    st.ready[pi] = true;
    ctx.emit({ t: 'ready', pi });
    if (allReady(st)) nextOrEnd(st, ctx); else ctx.sync();
  }
}
function view(st, viewer) {
  const me = typeof viewer === 'number' && viewer >= 0 && viewer < st.pl.length ? viewer : -1;
  const open = st.phase === 'reveal' || st.phase === 'end';
  return {
    phase: st.phase, round: st.round, rounds: st.rounds, size: st.size, sec: st.sec, mode: st.mode, skill: st.skill,
    endAt: st.endAt, dur: st.dur, board: st.board.slice(), total: st.words.length,
    players: st.pl.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, on: st.on[i], n: st.found[i].length, score: st.score[i], ready: st.ready[i] })),
    me, mine: me >= 0 ? st.found[me].slice() : null,
    rev: open ? st.rev : null
  };
}

/* ====================================================================
   Çizim (her cihaz)
   ==================================================================== */
let root = null, ui = null, V = null, timerT = null, lastKey = '', lastTick = -1, scramT = null;
let path = [], typed = '', dragging = false, lastPt = null, pend = [], seq = 0, fbT = null, hlT = null, revKey = '', builtN = 0;
const q = s => root && root.querySelector(s);
const qa = s => root ? [...root.querySelectorAll(s)] : [];
const later = (ms, fn) => setTimeout(() => { if (root) fn(); }, ms);
const lowAnim = () => matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const canPlay = () => V && V.phase === 'play' && V.me >= 0 && V.endAt - ui.hostNow() > -GRACE_MS;
const myList = () => { const m = (V && V.mine) || []; return m.concat(pend.filter(p => p.ok && !m.includes(p.w)).map(p => p.w)); };
const PMSG = { ok: '', dup: 'Zaten buldun', short: 'En az 3 harf', dict: 'Sözlükte yok', board: 'Tahtada yok' };

function blip(k) { if (Sound.ok && Sound.ok('kqtile', 22)) Sound.tone(392 * Math.pow(2, Math.min(k, 14) / 12 * 2), .09, { type: 'triangle', gain: .14 }); }

/* ---------- oyuncu şeridi ---------- */
function renderPlayers(v) {
  const box = q('.kq-players'); if (!box) return;
  const open = v.phase === 'reveal' || v.phase === 'end';
  if (box.children.length !== v.players.length) {
    const n = v.players.length; box.style.setProperty('--cols', n <= 3 ? n : n === 4 ? 2 : n <= 6 ? 3 : 4);
    box.innerHTML = v.players.map((p, i) => `<div class="kq-pl" data-pi="${i}" style="--pc:${p.color}"><span class="av" style="--pc:${p.color}">${p.isBot ? '🤖' : esc(initial(p.name))}</span>
      <span class="kq-pn"><b>${esc(p.isBot ? p.name.replace('Bilgisayar', 'Bot') : p.name)}</b><small><i class="kq-cnt">0</i> kelime</small></span><span class="kq-ps g-num">0</span><span class="kq-rd" aria-hidden="true">✓</span></div>`).join('');
  }
  v.players.forEach((p, i) => {
    const el = box.children[i];
    el.classList.toggle('me', i === v.me); el.classList.toggle('off', !p.on);
    el.classList.toggle('ready', open && p.ready && !p.isBot);
    const n = i === v.me ? Math.max(p.n, myList().length) : p.n;
    const c = el.querySelector('.kq-cnt'); if (c.textContent !== String(n)) c.textContent = n;
    const s = el.querySelector('.kq-ps'); if (!el.dataset.anim && s.textContent !== String(p.score)) s.textContent = p.score;
  });
}
function pulsePl(pi, big) {
  const el = q(`.kq-pl[data-pi="${pi}"]`); if (!el) return;
  el.classList.remove('pulse', 'big'); void el.offsetWidth; el.classList.add('pulse'); if (big) el.classList.add('big');
}

/* ---------- üst bilgi + zaman halkası ---------- */
function renderHud(v) {
  q('.kq-round').innerHTML = `<small>TUR</small><b>${v.round}/${v.rounds}</b>`;
  const list = myList();
  const sc = list.reduce((a, w) => a + pts(wlen(w)), 0);
  q('.kq-mn').textContent = v.me >= 0 ? list.length : '–';
  q('.kq-mp').textContent = v.me >= 0 ? sc : '–';
  q('.kq-tag').textContent = v.mode === 'klasik' ? 'Klasik · ortak kelime iptal' : 'Herkes puan alır';
}
function tickTimer() {
  if (!root || !V) return;
  const ring = q('.kq-ring'), fg = q('.kq-ring .fg'), num = q('.kq-ring b');
  const live = V.phase === 'play' || V.phase === 'shake' || V.phase === 'reveal';
  const left = live ? Math.max(0, V.endAt - ui.hostNow()) : 0, f = live ? Math.max(0, Math.min(1, left / (V.dur || 1))) : 0;
  const s = Math.ceil(left / 1000);
  if (V.phase === 'play') {
    num.textContent = s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : s;
    fg.style.strokeDashoffset = String(113.1 * (1 - f));
    const low = s <= 10;
    ring.classList.toggle('low', low);
    if (low && s > 0 && s !== lastTick) { lastTick = s; Sound.tick(.9); }
  } else if (V.phase === 'shake') { num.textContent = '…'; fg.style.strokeDashoffset = '0'; ring.classList.remove('low'); }
  else { num.textContent = '0'; fg.style.strokeDashoffset = '113.1'; ring.classList.remove('low'); }
  ring.classList.toggle('shake', V.phase === 'shake');
  const nx = q('.kq-nxt small'); if (nx && V.phase === 'reveal') nx.textContent = `${s} sn`;
}

/* ---------- tahta ---------- */
function buildGrid(v) {
  const g = q('.kq-grid'); const n = v.size;
  builtN = n;
  q('.kq-box').style.setProperty('--n', n);
  g.innerHTML = v.board.map((L, i) => `<div class="kq-cell" data-i="${i}"><div class="kq-tile"><span>${L}</span></div></div>`).join('');
  q('.kq-line').setAttribute('viewBox', `0 0 ${n} ${n}`);
}
function tileEls() { return qa('.kq-cell'); }
function shakeIn(v) {
  clearInterval(scramT);
  const box = q('.kq-box'), cells = tileEls();
  if (lowAnim()) { cells.forEach((c, i) => { c.querySelector('span').textContent = v.board[i]; }); return; }
  box.classList.remove('shaking'); void box.offsetWidth; box.classList.add('shaking');
  const t0 = performance.now(), settle = cells.map(() => 1000 + Math.random() * 1500);
  cells.forEach((c, i) => {
    c.classList.add('roll'); c.classList.remove('land');
    c.style.setProperty('--rx', `${(Math.random() * 2 - 1) * 60}px`); c.style.setProperty('--ry', `${-40 - Math.random() * 80}px`);
    c.style.setProperty('--rr', `${(Math.random() * 2 - 1) * 200}deg`);
  });
  scramT = setInterval(() => {
    if (!root) { clearInterval(scramT); return; }
    const el = performance.now() - t0; let live = 0;
    cells.forEach((c, i) => {
      if (!c.classList.contains('roll')) return;
      const sp = c.querySelector('span');
      if (el >= settle[i]) { sp.textContent = v.board[i]; c.classList.remove('roll'); c.classList.add('land'); if (Sound.ok && Sound.ok('kqland', 35)) Sound.tone(180 + Math.random() * 90, .07, { type: 'square', gain: .06 }); }
      else { live++; sp.textContent = LETTERS[Math.floor(Math.random() * LETTERS.length)]; }
    });
    if (!live) { clearInterval(scramT); box.classList.remove('shaking'); }
  }, 75);
}
function paintPath(cls) {
  const cells = tileEls(), n = builtN;
  cells.forEach((c, i) => { const k = path.indexOf(i); c.classList.toggle('on', k >= 0); c.classList.toggle('head', k >= 0 && k === path.length - 1); });
  const pl = q('.kq-line polyline');
  pl.setAttribute('points', path.map(i => `${(i % n) + .5},${Math.floor(i / n) + .5}`).join(' '));
  const svg = q('.kq-line'); svg.classList.remove('good', 'dup', 'bad'); if (cls) svg.classList.add(cls);
  q('.kq-line .dots').innerHTML = path.map(i => `<circle cx="${(i % n) + .5}" cy="${Math.floor(i / n) + .5}" r=".09"/>`).join('');
}
function showWord(text, cls, msg) {
  const w = q('.kq-word'), t = q('.kq-wtxt'), m = q('.kq-wmsg');
  clearTimeout(fbT);
  w.classList.remove('good', 'dup', 'bad', 'typing', 'shake', 'idle');
  t.innerHTML = text ? [...text].map((c, i) => `<i style="--d:${i}">${esc(c)}</i>`).join('') : '';
  m.textContent = msg || '';
  if (cls) { void w.offsetWidth; w.classList.add(cls); if (cls === 'bad') w.classList.add('shake'); }
}
function idleWord() {
  if (!V) return;
  const w = q('.kq-word');
  let msg = '';
  if (V.phase === 'shake') msg = 'Kutu sallanıyor…';
  else if (V.phase === 'play') msg = V.me >= 0 ? 'Harfleri sürükleyerek kelime yap' : 'İzliyorsun';
  else if (V.phase === 'reveal') msg = 'Kelimeye dokun, tahtada yolunu gör';
  else msg = 'Oyun bitti';
  showWord('', '', ''); q('.kq-wmsg').textContent = msg; w.classList.add('idle');
}
function curText() { return path.length ? path.map(i => V.board[i]).join('') : typed; }
function liveWord() { const t = curText(); if (!t) { idleWord(); return; } showWord(t, 'typing', path.length || !typed ? '' : 'Tahtada yok'); }

function cellAt(x, y, first) {
  const g = q('.kq-grid').getBoundingClientRect(), n = builtN;
  const fx = (x - g.left) / g.width * n, fy = (y - g.top) / g.height * n;
  const c = Math.floor(fx), r = Math.floor(fy);
  if (c < 0 || r < 0 || c >= n || r >= n) return -1;
  const dx = fx - c - .5, dy = fy - r - .5;
  if (dx * dx + dy * dy > (first ? .5 : .4) * (first ? .5 : .4)) return -1;   // köşelerden geçerken komşuyu yakalamasın
  return r * n + c;
}
function hitCell(i) {
  if (i < 0) return;
  const last = path[path.length - 1];
  if (!path.length) { path.push(i); blip(0); }
  else if (i === last) return;
  else if (path.length > 1 && i === path[path.length - 2]) { path.pop(); blip(path.length - 1); }
  else if (!path.includes(i) && adj(builtN, last, i)) { path.push(i); blip(path.length - 1); }
  else return;
  paintPath(); liveWord();
}
function trace(x, y) {
  const n = builtN, g = q('.kq-grid').getBoundingClientRect(), stepPx = g.width / n / 5;
  if (lastPt) {
    const dx = x - lastPt[0], dy = y - lastPt[1], d = Math.hypot(dx, dy), k = Math.min(30, Math.floor(d / stepPx));
    for (let s = 1; s <= k; s++) hitCell(cellAt(lastPt[0] + dx * s / (k + 1), lastPt[1] + dy * s / (k + 1)));
  }
  hitCell(cellAt(x, y));
  lastPt = [x, y];
}
function onDown(e) {
  if (!canPlay() || (e.button != null && e.button > 0)) return;
  e.preventDefault(); Sound.init();
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* */ }
  dragging = true; typed = ''; path = []; lastPt = null;
  const i = cellAt(e.clientX, e.clientY, true);
  if (i >= 0) { hitCell(i); lastPt = [e.clientX, e.clientY]; }
}
function onMove(e) {
  if (!dragging) return;
  e.preventDefault();
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
  if (evs.length) evs.forEach(c => trace(c.clientX, c.clientY)); else trace(e.clientX, e.clientY);
}
function onUp() {
  if (!dragging) return;
  dragging = false; lastPt = null;
  if (path.length >= 3) attempt(curText(), path.slice());
  else if (path.length) { showWord(curText(), 'bad', PMSG.short); Sound.bad(); clearPathSoon('bad'); }
}
function clearPathSoon(cls) {
  const p = path.slice();
  paintPath(cls);
  p.forEach(i => { const c = tileEls()[i]; if (c) { c.classList.remove('fb-good', 'fb-dup', 'fb-bad'); void c.offsetWidth; c.classList.add('fb-' + cls); } });
  path = []; typed = '';
  clearTimeout(hlT);
  hlT = later(380, () => { if (!dragging && !path.length) paintPath(); });
  fbT = later(1500, () => { if (!dragging && !path.length && !typed) idleWord(); });
}
function attempt(text, p) {
  if (!canPlay()) return;
  const j = judge(V.board, V.size, text, p, myList());
  const L = j.w ? wlen(j.w) : 0;
  if (j.r === 'ok') {
    const P = pts(L), id = 'k' + (++seq);
    pend.push({ id, w: j.w, ok: true });
    ui.send({ t: 'word', w: j.w, p: j.path, id });
    showWord(j.w, 'good', `+${P} puan`);
    floatPts(`+${P}`, L >= 7 ? 'gold' : '');
    if (L >= 7) { Sound.solve(); flash('good'); const r = q('.kq-word').getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, 30); }
    else if (L >= 5) Sound.special(); else Sound.good();
    path = j.path; clearPathSoon('good');
    renderFound(); renderHud(V); renderPlayers(V);
  } else {
    showWord(j.w || text, j.r === 'dup' ? 'dup' : 'bad', PMSG[j.r]);
    if (j.r === 'dup') { Sound.tick(.3); if (j.path || findPath(V.board, V.size, j.w)) path = findPath(V.board, V.size, j.w) || p; }
    else Sound.bad();
    if (!path.length) path = p || [];
    clearPathSoon(j.r === 'dup' ? 'dup' : 'bad');
    if (j.r === 'dup') { const chip = qa('.kq-fw').find(x => x.dataset.w === j.w); if (chip) { chip.classList.remove('hi'); void chip.offsetWidth; chip.classList.add('hi'); } }
  }
}
function floatPts(text, cls) {
  const w = q('.kq-word'); if (!w) return;
  const f = document.createElement('span'); f.className = 'kq-float ' + (cls || ''); f.textContent = text;
  w.appendChild(f); later(1100, () => f.remove());
}

/* ---------- klavye ---------- */
function typedPath() {
  if (!typed) return [];
  const ex = findPath(V.board, V.size, typed); if (ex) return ex;
  const lo = findPaths(V.board, V.size, typed, true, 1); return lo.length ? lo[0].path : [];
}
function onKey(e) {
  if (!root || !V || e.ctrlKey || e.metaKey || e.altKey) return;
  const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return;
  if (!canPlay() || dragging) return;
  const k = e.key;
  if (k === 'Enter') { e.preventDefault(); if (typed) { const p = typedPath(); const t = typed; path = p; attempt(t, p.length === wlen(t) ? p : null); } return; }
  if (k === 'Backspace') { e.preventDefault(); typed = [...typed].slice(0, -1).join(''); path = typedPath(); paintPath(); liveWord(); return; }
  if (k === 'Escape') { typed = ''; path = []; paintPath(); idleWord(); return; }
  if (k && [...k].length === 1) {
    const L = up(k); if (!ALPHA.has(L)) return;
    e.preventDefault(); Sound.init();
    if (wlen(typed) >= 25) return;
    typed += L; path = typedPath(); blip(wlen(typed) - 1); paintPath(); liveWord();
  }
}

/* ---------- bulunan kelimeler ---------- */
function renderFound() {
  const box = q('.kq-flist'); if (!box || !V) return;
  const list = myList();
  q('.kq-fh').innerHTML = V.me >= 0 ? `Bulduğun kelimeler <b>${list.length}</b>` : 'İzleyici';
  const key = list.join(',');
  if (box.dataset.k === key) return;
  box.dataset.k = key;
  if (!list.length) { box.innerHTML = `<p class="kq-empty">${V.me >= 0 ? 'Henüz kelime yok. Komşu harfleri (çapraz da olur) birleştir; en az 3 harf.' : 'Oyuncuların kelimeleri tur sonunda açıklanır.'}</p>`; return; }
  box.innerHTML = list.slice().reverse().map((w, k) => `<span class="kq-fw ${k === 0 ? 'new' : ''} ${wlen(w) >= 7 ? 'long' : ''}" data-w="${esc(w)}">${esc(w)}<sup>${pts(wlen(w))}</sup></span>`).join('');
}

/* ---------- tur sonu ---------- */
function renderReveal(v) {
  const R = v.rev, box = q('.kq-reveal'); if (!R || !box) return;
  const key = v.round + ':' + v.phase;
  const n = v.players.length;
  const order = v.players.map((p, i) => i).sort((a, b) => R.score[b] - R.score[a]);
  const prevOrder = v.players.map((p, i) => i).sort((a, b) => R.prev[b] - R.prev[a]);
  const max = Math.max(1, ...R.score);
  if (revKey !== key) {
    revKey = key;
    const missed = R.missed.length ? R.missed.map(w => `<button type="button" class="kq-rw miss" data-w="${esc(w)}">${esc(w)}<sup>${wlen(w)}</sup></button>`).join('') : '<span class="kq-empty">Hiçbir kelime kaçmadı! 🤯</span>';
    const bestPl = R.best ? R.best.who.map(i => esc(v.players[i].name)).join(', ') : '';
    const lists = order.map(i => {
      const P = R.per[i], p = v.players[i];
      return `<div class="kq-pw" style="--pc:${p.color}"><div class="kq-pwh"><span class="av" style="--pc:${p.color}">${p.isBot ? '🤖' : esc(initial(p.name))}</span><b>${esc(p.name)}</b><span class="kq-pws">+${P.sum}</span></div>
        <div class="kq-pwl">${P.list.length ? P.list.map(o => `<button type="button" class="kq-rw ${o.x ? 'x' : ''} ${R.best && o.w === R.best.w ? 'best' : ''}" data-w="${esc(o.w)}">${esc(o.w)}<sup>${o.x ? '0' : o.p}</sup></button>`).join('') : '<span class="kq-empty">Kelime bulamadı</span>'}</div></div>`;
    }).join('');
    box.innerHTML = `<div class="kq-rvh"><h3>${R.last ? (v.rounds > 1 ? 'SON TUR' : 'TUR SONU') : `${R.round}. TUR`}</h3>
        <p>Tahtadaki <b>${R.total}</b> kelimeden <b>${R.foundAll}</b> tanesi bulundu${v.mode === 'klasik' ? ' · ortak kelimeler iptal' : ''}</p></div>
      <div class="kq-sb" style="height:${n * 50}px">${v.players.map((p, i) => `<div class="kq-sr" data-pi="${i}" style="--pc:${p.color};transform:translateY(${prevOrder.indexOf(i) * 50}px)">
        <span class="av" style="--pc:${p.color}">${p.isBot ? '🤖' : esc(initial(p.name))}</span><b class="kq-srn">${esc(p.name)}</b>
        <span class="kq-bar"><i style="width:${R.prev[i] / max * 100}%"></i></span><span class="kq-gain">+${R.per[i].sum}</span><span class="kq-tot g-num">${R.prev[i]}</span></div>`).join('')}</div>
      ${R.best ? `<div class="kq-best"><span>🏆</span><div><small>En uzun kelime</small><button type="button" class="kq-rw best" data-w="${esc(R.best.w)}">${esc(R.best.w)}</button><em>${bestPl} · ${R.best.len} harf</em></div></div>` : ''}
      <div class="kq-lists">${lists}</div>
      <div class="kq-miss"><h4>Kaçırılan en uzun kelimeler</h4><div class="kq-pwl">${missed}</div></div>
      <div class="kq-nxt">${v.me >= 0 ? `<button type="button" class="btn btn-spin kq-ready">${R.last ? 'SONUÇLARA GEÇ' : 'HAZIRIM · SONRAKİ TUR'}</button>` : ''}<small></small><span class="kq-rc"></span></div>`;
    // puan tablosu animasyonu
    const rows = qa('.kq-sr');
    later(lowAnim() ? 50 : 700, () => {
      rows.forEach(r => {
        const i = +r.dataset.pi; r.style.transform = `translateY(${order.indexOf(i) * 50}px)`;
        r.querySelector('.kq-bar i').style.width = `${R.score[i] / max * 100}%`;
        countUp(r.querySelector('.kq-tot'), R.prev[i], R.score[i]);
        if (R.per[i].sum) r.classList.add('gain');
      });
      Sound.buy();
    });
    if (v.phase === 'end') { const b = q('.kq-ready'); if (b) b.hidden = true; }
  }
  const me = v.me >= 0 ? v.players[v.me] : null, btn = q('.kq-ready');
  const hum = v.players.filter(p => !p.isBot && p.on), rd = hum.filter(p => p.ready).length;
  if (btn) { btn.disabled = !me || me.ready || v.phase !== 'reveal'; if (me && me.ready) btn.textContent = 'HAZIR ✓ · BEKLENİYOR'; }
  const rc = q('.kq-rc'); if (rc) rc.textContent = hum.length > 1 ? `${rd}/${hum.length} hazır` : '';
}
function countUp(el, a, b) {
  if (!el) return; if (a === b || lowAnim()) { el.textContent = b; return; }
  const t0 = performance.now(), D = 900;
  const st = () => { if (!root) return; const f = Math.min(1, (performance.now() - t0) / D); el.textContent = Math.round(a + (b - a) * (1 - Math.pow(1 - f, 3))); if (f < 1) requestAnimationFrame(st); };
  requestAnimationFrame(st);
}
function showPathOf(w) {
  if (!V) return;
  const p = findPath(V.board, V.size, w); if (!p) return;
  path = p; paintPath('good'); showWord(w, 'good', `${wlen(w)} harf · ${pts(wlen(w))} puan`);
  clearTimeout(hlT); hlT = later(2200, () => { path = []; paintPath(); idleWord(); });
  if (innerWidth < 900) { const b = q('.kq-box'); const r = b.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) b.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}

/* ---------- render ---------- */
function render(v) {
  const prev = V; V = v; if (!root) return;
  const key = v.round + ':' + v.size;
  const wrap = q('.kq');
  wrap.dataset.phase = v.phase;
  if (key !== lastKey || !builtN) {
    lastKey = key; pend = []; path = []; typed = ''; dragging = false; revKey = '';
    buildGrid(v);
    if (v.phase === 'shake') shakeIn(v);
    q('.kq-reveal').innerHTML = '';
    idleWord();
  } else if (prev && prev.phase !== v.phase) {
    if (v.phase !== 'play') { dragging = false; path = []; typed = ''; paintPath(); }
    idleWord();
  }
  if (v.mine) pend = pend.filter(p => !v.mine.includes(p.w));
  renderPlayers(v); renderHud(v); renderFound();
  const open = v.phase === 'reveal' || v.phase === 'end';
  q('.kq-reveal').hidden = !open; q('.kq-found').hidden = open;
  if (open) renderReveal(v);
  q('.kq-box').classList.toggle('locked', !canPlay() && !open);
  tickTimer();
}
function onEvent(e) {
  if (!root) return;
  if (e.t === 'shake') { Sound.whoosh(); if (V && V.rounds > 1) banner(`${e.r}. TUR`, 'pink'); }
  else if (e.t === 'go') {
    Sound.special();
    const w = q('.kq-word'); if (w && !path.length && !typed) { showWord('BAŞLA!', 'good', V && V.me >= 0 ? 'Harfleri sürükleyerek kelime yap' : ''); fbT = later(1300, () => { if (!path.length && !typed && !dragging) idleWord(); }); }
  } else if (e.t === 'res') {
    if (V && e.pi === V.me && e.id) {
      const k = pend.findIndex(p => p.id === e.id);
      if (k >= 0 && e.r !== 'ok') { const w = pend[k].w; pend.splice(k, 1); showWord(w, 'bad', 'Geçersiz sayıldı'); Sound.bad(); renderFound(); renderHud(V); }
    }
    if (e.r === 'ok' && V && e.pi !== V.me) { pulsePl(e.pi, e.len >= 7); if (e.len >= 7) Sound.tick(.5); }
    else if (e.r === 'ok') pulsePl(e.pi, e.len >= 7);
  } else if (e.t === 'reveal') { Sound.stop(); banner('SÜRE DOLDU!', 'pink'); }
  else if (e.t === 'ready') Sound.tick(.4);
}
function onClick(e) {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.classList.contains('kq-ready')) { Sound.init(); ui.send({ t: 'ready' }); b.disabled = true; b.textContent = 'HAZIR ✓ · BEKLENİYOR'; Sound.good(); return; }
  if (b.classList.contains('kq-rw')) { Sound.tick(.4); showPathOf(b.dataset.w); }
}
function mount(r, api) {
  root = r; ui = api; V = null; lastKey = ''; lastTick = -1; path = []; typed = ''; dragging = false; pend = []; revKey = ''; builtN = 0;
  root.innerHTML = `<div class="g-wrap kq">
    <div class="kq-players"></div>
    <div class="kq-main">
      <section class="kq-play">
        <div class="kq-hud">
          <div class="kq-round"></div>
          <div class="kq-ring"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="bg" cx="22" cy="22" r="18"/><circle class="fg" cx="22" cy="22" r="18"/></svg><b>0</b></div>
          <div class="kq-me"><span><b class="kq-mn">0</b><small>kelime</small></span><span><b class="kq-mp">0</b><small>puan</small></span></div>
        </div>
        <div class="kq-word idle" aria-live="polite"><span class="kq-wtxt"></span><span class="kq-wmsg"></span></div>
        <div class="kq-box"><div class="kq-tray"></div><div class="kq-grid"></div>
          <svg class="kq-line" viewBox="0 0 4 4" aria-hidden="true"><polyline points=""/><g class="dots"></g></svg></div>
        <p class="kq-tag g-sub"></p>
      </section>
      <aside class="kq-side">
        <div class="kq-found g-panel"><h3 class="kq-fh">Bulduğun kelimeler</h3><div class="kq-flist"></div></div>
        <section class="kq-reveal g-panel" hidden></section>
      </aside>
    </div>
  </div>`;
  const box = q('.kq-box');
  box.addEventListener('pointerdown', onDown);
  box.addEventListener('pointermove', onMove);
  box.addEventListener('pointerup', onUp);
  box.addEventListener('pointercancel', onUp);
  box.addEventListener('lostpointercapture', onUp);
  root.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  timerT = setInterval(tickTimer, 200);
}
function unmount() {
  clearInterval(timerT); clearInterval(scramT); clearTimeout(fbT); clearTimeout(hlT); timerT = null;
  document.removeEventListener('keydown', onKey);
  if (root) root.removeEventListener('click', onClick);
  root = null; ui = null; V = null; builtN = 0;
}

CFX.registerGame({
  id: 'kelimekare', name: 'Kelime Kare', icon: '🔠', color: '#ffb02e', min: 1, max: 8, hotseat: false, bot: true, localMin: 1,
  tagline: 'Harfleri birleştir, en çok kelimeyi bul',
  rules: 'Kutu sallanır, harfler kareye dökülür. Yan yana ya da çapraz komşu harfleri parmağınla birleştirerek süre bitmeden en az 3 harfli kelimeler bul (bir harf aynı kelimede bir kez). 3–4 harf 1, 5 harf 2, 6 harf 3, 7 harf 5, 8+ harf 11 puan; Klasik kuralda birden fazla kişinin bulduğu kelimeler iptal olur.',
  options: [
    { key: 'mode', label: 'Kural', def: 'klasik', choices: [{ v: 'klasik', label: 'Klasik' }, { v: 'herkes', label: 'Herkes Puan Alır' }] },
    { key: 'time', label: 'Tur süresi', def: '120', choices: [{ v: '120', label: '2 dk' }, { v: '180', label: '3 dk' }] },
    { key: 'rounds', label: 'Tur sayısı', def: '3', choices: [{ v: '1', label: '1 tur' }, { v: '3', label: '3 tur' }] },
    { key: 'size', label: 'Tahta', def: '4', choices: [{ v: '4', label: '4×4' }, { v: '5', label: '5×5' }] },
    { key: 'skill', label: 'Bilgisayar', def: 'usta', choices: [{ v: 'acemi', label: 'Acemi' }, { v: 'usta', label: 'Usta' }, { v: 'dahi', label: 'Dahi' }] }
  ],
  setup, action, view,
  turnOf() { return null; },        // herkes aynı anda oynar; bilgisayarlar kendi zamanlayıcılarıyla
  botDelay: 900,
  botAct() {},
  skipTurn() {},
  onPresence(st, pi, online, ctx) {
    st.on[pi] = online;
    if (!online && st.phase === 'reveal' && allReady(st) && st.pl.some((p, i) => humanOn(st, i))) nextOrEnd(st, ctx);
  },
  resume(st, ctx) { if (st.phase === 'end') return; st.tk++; arm(st, ctx); },
  mount, render, onEvent, unmount,
  _t: { dict, prefixes, solve, genBoard, rawBoard, judge, validPath, findPath, findPaths, pts, clean, view, action, setup, botPick, botStep, submit, closeRound, nextOrEnd, nbrs, SKILL }
});
})();
