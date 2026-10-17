/* =========================================================================
   OYUN SALONU — BOMBA KELİME
   Ortadaki heceyi içeren bir kelime yaz, bombayı sıradakine pasla! Bomba
   kimin elinde patlarsa bir can gider; canı biten elenir, son kalan kazanır.
   2–8 kişi online, aynı cihazda elden ele ya da bilgisayara karşı.
   ========================================================================= */
(() => {
'use strict';
const { esc, Sound, FX, banner, flash, initial, up, clamp, centerOf } = CFX;

/* ---------- sözlük kaynağı (küçük harfle yazıldı, yüklenirken büyütülür) ----------
   N: isimler (çoğul, -de/-den, -li/-siz… türetilir)   "!" = ince ünlü uyumlu alıntı (saat!, kalp!)
   A: sıfatlar (çoğul, -lik türetilir)
   V: fiil kökleri (-mek, -di, -iyor, -ecek, -miş, -en… türetilir)  "*" = ünlüden önce t→d (git*, et*)
   W: olduğu gibi alınan kelimeler (zamir, zarf, sayı, türemiş/çekimli sık kullanılan biçimler) */
const TIERS = 'MA AK AR AN EK KA ME LA AL ER EN LE RA TA Lİ YA AM DE SA AT LI ET İK İN IK EM BA TE İL EL HA DA RE AY İR IR UR KE Sİ NE KU SE|MAK MEK AS ON NA Dİ OR Rİ İM İZ VA Kİ AMA BE AŞ Bİ KO SI YE PA KI AH AZ OL LIK ES Mİ UL AV UN LU UM Tİ TI Nİ AĞ ŞA GE İT AP İŞ ZA UK ÜR İY CE IN LAM EME RI İS CI IL AB Cİ ZE LİK CA EV ÇA AD RU IZ EY MU UT BU OK IM VE Gİ GÜ Çİ YO KAR LEM MAN KAL TER|GA ÜN ÇE UZ TO DO ED IŞ TU AF EŞ SU BO ÖR ÜZ ŞE YI Vİ Zİ ÜK FA TÜ GÖ LÜ KÜ YU PE SO DÜ OT Hİ ÜM AC FE ÜL LO EZ DU EC ÖZ ÇI DI Fİ SÜ HE EF Şİ AÇ CU İD NI TAR ŞI ĞI US UŞ KAN RO İF UY KUR ZI Pİ RÜ YAR ÖN IS OM OĞ Yİ PO OP AKA NU DER İP LUK AĞI OY ENİ AVA BİL EĞ ATI EP PAR SAN ANI ANE MO YÜ ACI ASA ANT ÜT KÖ GU ILI ÜŞ İÇ KEN URU KAT ATA RET EKİ YAN ENE ABA ALE SAL LEK EMİ LET REN SAR ULU LAK ARM NLI HAN MEN BİR AHA MAR HAL YON KOR|ÜS ĞA ŞU MÜ OZ EÇ EB OS IC SÖ GI VU NO ĞU İYA İC LİM DÖ AKI KIR ANS İNİ İH AZA RAN DEM TEM YET APA ÖL İRİ OKU TEK KUL BAL BAN YUM ALİ KON KAP VER ZAR KET RAM VAR VAN MER AZI URA ART ALT ZU TİK Ğİ RAR BAŞ AVU ÖĞ SİN ÜRÜ YAZ FO BÜ EH OŞ IT SIR SAK CÜ UC AHİ YAT AŞI HAR HU KES GÜN MET TLİ AĞL PU GEL LAT ERA GO SAT AŞA ÖK TAK İV EĞİ SEV RLİ BUR NAK KOL KEL AĞA ENG Aİ ARK RKE GEN MUT KAM KİM ICI GAR NCE MİN ÇEK İB EVİ ARE ARİ ZÜ NEK DİN SEL NÜ BI ÇO OĞU ONU NER ŞAR BER OB OD ANG ŞAM HI HAY KUM KİL BAR LÜK RAD UMA EKE ADE SER KİN AJ ÜZE İZİ ÇÜ KİR UÇ BEK YAK TOP DAM BÖ MUR AA TUR NET ETİ AKİ FI BUL İNC NCA RTA ORT İNA ÖZL CİL MI TAB BAĞ KAB KRA İKA KER ECİ NCİ HO BAK RAF TES TIK KAV ZO HAM ŞEK RAT ZEL FİL İTA ŞÜ İKİ IKI SIK GÖZ KEM ÜC İNE MAT İST SÜR NİZ ETE UH PI KAH AMB ÇAR DOL CAN UP ÇU SAY İLA EŞİ PAN AMU NEM GER ORA KIL BEN ZİN TUT SIN EMA DİY DEĞ ÇIK ÜRE';
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
const BAR = [...'ABCÇDEGHIİKLMNOPRSŞTUÜYZ'];          // "harf alfabesi": hepsini kullanan +1 can kazanır
const BARSET = new Set(BAR);
const lastV = w => { for (let i = w.length - 1; i >= 0; i--) if (VOW.includes(w[i])) return w[i]; return 'E'; };
const isFront = (w, f) => f || FRONT.includes(lastV(w));
const a2 = (w, f) => isFront(w, f) ? 'E' : 'A';
const i4 = (w, f) => { const v = lastV(w); if (f) return 'OU'.includes(v) || 'ÖÜ'.includes(v) ? 'Ü' : 'İ'; return { A: 'I', I: 'I', O: 'U', U: 'U', E: 'İ', İ: 'İ', Ö: 'Ü', Ü: 'Ü' }[v]; };
const endsV = w => VOW.includes(w[w.length - 1]);
const dt = w => HARD.includes(w[w.length - 1]) ? 'T' : 'D';
const FOLD = { Ç: 'C', Ğ: 'G', İ: 'I', Ö: 'O', Ş: 'S', Ü: 'U' };
const fold = w => w.replace(/[ÇĞİÖŞÜ]/g, c => FOLD[c]);

function nounForms(w, f) {
  const pl = w + 'L' + a2(w, f) + 'R', loc = w + dt(w) + a2(w, f);
  const o = [w, pl, pl + i4(pl), pl + 'D' + a2(pl), pl + 'D' + a2(pl) + 'N', loc, loc + 'N', w + 'L' + i4(w, f), w + 'S' + i4(w, f) + 'Z'];
  if (endsV(w) && w.length > 2) o.push(w + 'Y' + a2(w, f), w + 'Y' + i4(w, f), w + 'S' + i4(w, f));
  return o;
}
function adjForms(w, f) { return [w, w + 'L' + a2(w, f) + 'R', w + 'L' + i4(w, f) + 'K']; }
function verbForms(s, voice) {
  const v = endsV(s), sv = voice && s.endsWith('T') ? s.slice(0, -1) + 'D' : s, a = a2(s), di = s + dt(s) + i4(s);
  const vs = v ? s + 'Y' : sv;                             // ünlüyle başlayan ek için gövde
  const iyor = v ? s.slice(0, -1) + i4(s.slice(0, -1)) + 'YOR' : sv + i4(s) + 'YOR';
  return [s, s + 'M' + a + 'K', s + 'M' + a, s + 'M' + a + 'Z', s + 'M' + a + 'L' + i4(s + 'M' + a), di, di + 'M', di + 'K', di + 'L' + a2(di) + 'R',
    s + 'M' + i4(s) + 'Ş', iyor, iyor + 'UM', vs + a + 'C' + a + 'K', vs + a + 'N', vs + a + 'R' + a + 'K'];
}

let DICT = null;
function buildDict() {
  const t0 = Date.now();
  const full = new Set(), base = new Set();
  const ok = w => w.length >= 3 && [...w].every(c => ALPHA.has(c));
  const add = (w, isBase) => { if (!ok(w)) return; full.add(w); if (isBase) base.add(w); };
  const toks = s => up(s).split(/\s+/).filter(Boolean);
  for (const t of toks(RAW.N)) { const f = t.endsWith('!'), w = t.replace('!', ''); add(w, true); nounForms(w, f).forEach(x => add(x)); }
  for (const t of toks(RAW.A)) { const f = t.endsWith('!'), w = t.replace('!', ''); add(w, true); adjForms(w, f).forEach(x => add(x)); }
  for (const t of toks(RAW.V)) { const vc = t.endsWith('*'), s = t.replace('*', ''); const fs = verbForms(s, vc); add(fs[1], true); fs.forEach(x => add(x)); }
  for (const t of toks(RAW.W)) add(t, true);
  const W5 = window.WORDS5;
  if (W5) for (const k of ['answers', 'extra']) if (typeof W5[k] === 'string') for (const t of toks(W5[k])) add(t, true);
  const list = [...full], baseList = [...base];
  DICT = { set: full, base, list, baseList, fold: null, tiers: null, ms: 0 };
  DICT.tiers = TIERS ? TIERS.split('|').map(t => t.split(' ').filter(Boolean)) : computeTiers(DICT);
  DICT.ms = Date.now() - t0;
  return DICT;
}
// Yanlış klavye düzeni toleransı: İ/I, Ş/S… farkını yok sayarak eşleştirme (ilk ihtiyaçta kurulur)
function foldMap(D) {
  if (D.fold) return D.fold;
  const m = new Map();
  for (const w of D.baseList.concat(D.list)) { const k = fold(w); if (!m.has(k)) m.set(k, w); }
  return (D.fold = m);
}
// Hece havuzu: kök kelimelerde sık geçen 2–3 harfli parçalar; zorluk = kaç kök kelimede geçtiği.
// Derleme betiği bunu bir kez hesaplayıp TIERS sabitine yazar (çalışırken yeniden hesaplanmaz).
const NOPROMPT = new Set('ETM TME RME NME LME ŞMA TMA NMA LMA KMA AŞM ENM ANM İRM IRM ERM URM ATM ŞME RMA YOR IYO İYO UYO ÜYO DAN DEN TAN TEN LAR LER'.split(' '));
function computeTiers(D) {
  const cnt = (arr) => { const m = new Map(); for (const w of arr) { const seen = new Set(); for (const L of [2, 3]) for (let i = 0; i + L <= w.length; i++) { const s = w.substr(i, L); if (!seen.has(s)) { seen.add(s); m.set(s, (m.get(s) || 0) + 1); } } } return m; };
  const cb = cnt(D.baseList), cf = cnt(D.list);
  const tiers = [[], [], [], []];
  for (const [s, nb] of [...cb].sort((x, y) => y[1] - x[1])) {
    const nf = cf.get(s) || 0;
    if (nf < 40 || nb < 14 || NOPROMPT.has(s) || ![...s].some(c => VOW.includes(c))) continue;
    if (s.length === 3 && nb / nf < 0.1) continue;
    const t = s.length === 2 ? (nb >= 150 ? 0 : nb >= 70 ? 1 : nb >= 30 ? 2 : 3) : (nb >= 45 ? 1 : nb >= 25 ? 2 : 3);
    tiers[t].push(s);
  }
  return tiers;
}
const dict = () => DICT || buildDict();

/* ---------- kurallar (yöneten cihaz) ---------- */
const FUSE = { kisa: [6000, 14000], normal: [8000, 20000], uzun: [12000, 28000] };
const LVL = { kolay: [0, 1], normal: [0, 2], zor: [1, 3] };
const BOT = {
  kolay: { think: [2000, 6500], miss: .2, typo: .18, key: [150, 230], long: false },
  normal: { think: [1200, 4200], miss: .1, typo: .1, key: [110, 170], long: false },
  zor: { think: [600, 2400], miss: .04, typo: .05, key: [70, 120], long: true }
};
const START_MS = 2600, BOOM_MS = 2700, MIN_PASS = 3000, LVL_STEP = 7, MAXLEN = 24;
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const alivePl = st => st.alive.map((a, i) => a ? i : -1).filter(i => i >= 0);
function nextAlive(st, pi) { const n = st.pl.length; for (let k = 1; k <= n; k++) { const j = (pi + k) % n; if (st.alive[j]) return j; } return pi; }

function pickPrompt(st) {
  const D = dict(), [lo, hi] = LVL[st.diff] || LVL.normal;
  const lvl = Math.min(hi, lo + Math.floor(st.ok / LVL_STEP));
  st.lvl = lvl;
  let t = Math.random() < .68 ? lvl : rnd(lo, lvl);
  let pool = D.tiers[t].filter(s => !st.recent.includes(s));
  while (!pool.length && t > 0) { t--; pool = D.tiers[t].filter(s => !st.recent.includes(s)); }
  if (!pool.length) pool = D.tiers[0];
  // kullanılmamış en az birkaç kelimesi olan heceyi seç
  for (let k = 0; k < 12; k++) {
    const s = pool[Math.floor(Math.random() * pool.length)];
    let free = 0; for (const w of D.baseList) if (w.includes(s) && !st.used[w] && ++free >= 6) break;
    if (free >= 6 || k === 11) { st.prompt = s; break; }
  }
  st.recent.push(st.prompt); if (st.recent.length > 14) st.recent.shift();
}
function check(st, raw) {
  const D = dict();
  let w = [...up(String(raw || ''))].filter(c => ALPHA.has(c)).join('').slice(0, MAXLEN);
  if (w.length < 3) return { why: 'En az 3 harf yaz', w };
  if (!D.set.has(w)) { const f = foldMap(D).get(fold(w)); if (f) w = f; }
  if (!w.includes(st.prompt)) return { why: `Kelimede “${st.prompt}” geçmiyor`, w };
  if (!D.set.has(w)) return { why: 'Sözlükte yok', w };
  if (st.used[w]) return { why: 'Bu kelime kullanıldı', w };
  return { ok: true, w };
}
function example(st) {
  const D = dict(), c = D.baseList.filter(w => w.includes(st.prompt) && !st.used[w] && w.length <= 9);
  return c.length ? c[Math.floor(Math.random() * c.length)] : '';
}
function arm(st, ctx) {
  const tk = st.tk, now = Date.now();
  const at = (t, fn) => ctx.later(Math.max(0, t - now), () => { if (st.tk === tk) fn(); });
  if (st.phase === 'start' || st.phase === 'boom') at(st.pe, () => afterPause(st, ctx));
  else if (st.phase === 'play') {
    st.heatAt.forEach((t, i) => { if (st.heat < i + 1) at(t, () => { if (st.heat < i + 1) { st.heat = i + 1; ctx.sync(); } }); });
    at(st.endAt, () => explode(st, ctx));
  }
}
function newBomb(st, ctx, who) {
  const [a, b] = FUSE[st.fuse] || FUSE.normal, now = Date.now(), fuse = rnd(a, b);
  st.bomb++; st.cur = who; st.endAt = now + fuse; st.heat = 0;
  st.heatAt = [.5, .75, .9].map(f => Math.round(now + fuse * f));
  pickPrompt(st); st.turnId++; st.phase = 'play'; st.tk++;
  ctx.emit({ t: 'bomb', pi: who, b: st.bomb });
  ctx.sync(); arm(st, ctx);
}
function explode(st, ctx) {
  if (st.phase !== 'play') return;
  const pi = st.cur, p = st.pl[pi];
  st.hearts[pi] = Math.max(0, st.hearts[pi] - 1);
  const out = st.hearts[pi] === 0;
  if (out) { st.alive[pi] = false; st.out.push(pi); }
  st.phase = 'boom'; st.boomPi = pi; st.pe = Date.now() + BOOM_MS; st.tk++; st.turnId++;
  const ex = example(st);
  st.lastEx = ex;
  ctx.emit({ t: 'boom', pi, out, ex, pr: st.prompt },
    out ? `💥 Bomba ${p.name} elinde patladı ve elendi!${ex ? ` (Örnek: ${ex})` : ''}` : `💥 Bomba ${p.name} elinde patladı! ${st.hearts[pi]} can kaldı.${ex ? ` (Örnek: ${ex})` : ''}`, 'bad');
  ctx.sync(); arm(st, ctx);
}
function afterPause(st, ctx) {
  if (st.phase === 'start') { newBomb(st, ctx, st.cur); return; }
  if (st.phase !== 'boom') return;
  if (alivePl(st).length <= 1) { finish(st, ctx); return; }
  newBomb(st, ctx, st.alive[st.boomPi] ? st.boomPi : nextAlive(st, st.boomPi));
}
function finish(st, ctx) {
  st.phase = 'end'; st.tk++;
  const al = alivePl(st), order = al.concat(st.out.slice().reverse());
  const win = order[0];
  ctx.emit({ t: 'win', pi: win }, `🏆 ${st.pl[win].name} hayatta kalan son oyuncu!`, 'gold');
  ctx.sync();
  ctx.end({
    title: `${st.pl[win].name} hayatta kaldı!`,
    ranking: order.map((pi, k) => ({ pi, label: `${k === 0 ? '🏆 ' : ''}${st.words[pi]} kelime` })),
    note: `Toplam ${st.ok} kelime kullanıldı.${st.longest ? ` En uzun kelime: ${st.longest} (${st.pl[st.longPi].name}).` : ''}`
  });
}

/* ---------- arayüz durumu ---------- */
let root = null, ui = null, V = null, input = '', pending = false, pendT = null, lastTid = -1, liveTxt = '', liveTid = -1, liveSeat = -1;
let tickT = null, fastT = null, lastFast = 0, msgT = null, startT = null, seatsBuilt = '', prevHearts = [], barOwner = -1, phaseSeen = '', rotNow = 90;

// Yerel/kurucu ekranda canlı yazıyı göster, online ise diğer cihazlara yolla (bilgisayar oyuncuları için)
function live(pi, text, tid) {
  if (root && V) { liveTxt = text; liveTid = tid; liveSeat = pi; paintInput(); paintLiveSeat(); }
  if (CFX.Room && CFX.Room.mode === 'host') CFX.Room.fast({ k: 'ty', s: pi, x: text, tid });
}

const DEF = {
  id: 'bomba', name: 'Bomba Kelime', icon: '💣', color: '#ff5a36', min: 2, max: 8, hotseat: true, bot: true, localMin: 1,
  tagline: 'Heceyi içeren kelimeyi yaz, bombayı pasla!',
  rules: 'Ortadaki heceyi (ör. AR) içeren bir kelime yaz ve bombayı sıradakine pasla. Bomba kimin elinde patlarsa bir can gider; canı biten elenir. Alt çubuktaki tüm harfleri kullanan +1 can kazanır, son kalan kazanır!',
  options: [
    { key: 'can', label: 'Can', def: '2', choices: [{ v: '2', label: '2 can' }, { v: '3', label: '3 can' }] },
    { key: 'zorluk', label: 'Zorluk', def: 'normal', choices: [{ v: 'kolay', label: 'Kolay' }, { v: 'normal', label: 'Normal' }, { v: 'zor', label: 'Zor' }] },
    { key: 'fitil', label: 'Fitil', def: 'normal', choices: [{ v: 'kisa', label: 'Kısa' }, { v: 'normal', label: 'Normal' }, { v: 'uzun', label: 'Uzun' }] },
    { key: 'bot', label: 'Bilgisayar', def: 'normal', choices: [{ v: 'kolay', label: 'Acemi' }, { v: 'normal', label: 'Usta' }, { v: 'zor', label: 'Dahi' }] }
  ],
  setup(players, opts, ctx) {
    dict();
    const n = players.length, H = opts.can === '3' ? 3 : 2;
    const st = {
      pl: players.map(p => ({ name: p.name, color: p.color, isBot: !!p.isBot })),
      hearts: Array(n).fill(H), startH: H, maxH: H + 1, alive: Array(n).fill(true), out: [],
      used: {}, letters: Array(n).fill(''), last: Array(n).fill(''), words: Array(n).fill(0),
      diff: LVL[opts.zorluk] ? opts.zorluk : 'normal', fuse: FUSE[opts.fitil] ? opts.fitil : 'normal', botLvl: BOT[opts.bot] ? opts.bot : 'normal',
      cur: Math.floor(Math.random() * n), prompt: '', lvl: 0, phase: 'start', pe: Date.now() + START_MS,
      bomb: 0, turnId: 0, heat: 0, endAt: 0, heatAt: [], tk: 0, ok: 0, recent: [], botTurn: -1,
      boomPi: -1, lastEx: '', longest: '', longPi: -1, feed: []
    };
    st.tk++;
    if (ctx) arm(st, ctx);
    return st;
  },
  resume(st, ctx) { st.tk++; st.botTurn = -1; if (st.phase === 'end') return; arm(st, ctx); },
  action(st, pi, a, ctx) {
    if (!a || a.t !== 'word' || st.phase !== 'play' || pi !== st.cur || !st.alive[pi]) return;
    if (a.tid != null && a.tid !== st.turnId) return;
    const r = check(st, a.w);
    if (!r.ok) { ctx.emit({ t: 'bad', pi, why: r.why, w: r.w, tid: st.turnId }); return; }
    const w = r.w, now = Date.now();
    st.used[w] = 1; st.last[pi] = w; st.words[pi]++; st.ok++;
    if (w.length > st.longest.length) { st.longest = w; st.longPi = pi; }
    let L = st.letters[pi];
    for (const c of w) if (BARSET.has(c) && !L.includes(c)) L += c;
    let bonus = false, gain = false;
    if (L.length >= BAR.length) { L = ''; bonus = true; if (st.hearts[pi] < st.maxH) { st.hearts[pi]++; gain = true; } }
    st.letters[pi] = L;
    st.feed.push({ pi, w }); if (st.feed.length > 8) st.feed.shift();
    const name = st.pl[pi].name;
    st.cur = nextAlive(st, pi);
    if (st.endAt - now < MIN_PASS) st.endAt = now + MIN_PASS;
    pickPrompt(st); st.turnId++; st.tk++;
    ctx.emit({ t: 'ok', pi, w, bonus, gain, nx: st.cur },
      bonus ? `${name}: ${w} — tüm harfleri tamamladı${gain ? ', +1 can!' : ' (can zaten dolu)'}` : `${name}: ${w}`, bonus ? 'gold' : '');
    ctx.sync(); arm(st, ctx);
  },
  view(st) {
    const R = CFX.Room && CFX.Room.game;
    return {
      pl: st.pl.map((p, i) => ({ name: p.name, color: p.color, isBot: p.isBot, online: R && R.players[i] ? R.players[i].online !== false : true })),
      hearts: st.hearts, maxH: st.maxH, alive: st.alive, out: st.out, letters: st.letters, last: st.last, words: st.words,
      cur: st.cur, prompt: st.prompt, lvl: st.lvl, diff: st.diff, phase: st.phase, pe: st.pe, bomb: st.bomb, turnId: st.turnId, heat: st.heat,
      boomPi: st.boomPi, lastEx: st.lastEx, ok: st.ok, feed: st.feed
    };
  },
  turnOf(st) { return st.phase === 'play' ? st.cur : null; },
  botDelay: 650,
  botAct(st, pi, ctx) {
    if (st.phase !== 'play' || st.cur !== pi || st.botTurn === st.turnId) return;
    st.botTurn = st.turnId;
    const tid = st.turnId, B = BOT[st.botLvl] || BOT.normal, D = dict();
    const still = () => st.phase === 'play' && st.cur === pi && st.turnId === tid;
    const think = rnd(B.think[0], B.think[1]);
    const used = st.used, pr = st.prompt, mine = st.letters[pi];
    let cands = D.baseList.filter(w => w.includes(pr) && !used[w] && w.length <= (B.long ? 12 : 8));
    if (!cands.length) cands = D.list.filter(w => w.includes(pr) && !used[w]);
    let word = null;
    if (cands.length && Math.random() >= B.miss) {
      if (B.long) { // dahi: eksik harfleri en çok tamamlayan kelimeyi seçer
        let best = -1;
        for (let k = 0; k < 40; k++) { const w = cands[Math.floor(Math.random() * cands.length)]; const sc = new Set([...w].filter(c => BARSET.has(c) && !mine.includes(c))).size + Math.random(); if (sc > best) { best = sc; word = w; } }
      } else word = cands[Math.floor(Math.random() * cands.length)];
    }
    let t = think;
    const type = (text, then) => {
      for (let i = 1; i <= text.length; i++) { t += rnd(B.key[0], B.key[1]); const s = text.slice(0, i); ctx.later(t, () => { if (still()) live(pi, s, tid); }); }
      t += 250; ctx.later(t, () => { if (still()) then(); });
    };
    const erase = (then) => { t += 380; ctx.later(t, () => { if (still()) { live(pi, '', tid); then(); } }); };
    if (!word) { // bulamadı: heceyi yazıp bekler, bomba patlar
      type(pr, () => { t += rnd(1500, 3500); ctx.later(t, () => { if (still()) live(pi, '', tid); }); });
      return;
    }
    const submit = () => DEF.action(st, pi, { t: 'word', w: word, tid }, ctx);
    if (Math.random() < B.typo) {
      const wrongs = Object.keys(used).filter(w => w.includes(pr));
      let wrong = wrongs.length && Math.random() < .5 ? wrongs[Math.floor(Math.random() * wrongs.length)] : '';
      if (!wrong) { // bir harfi atlayarak yanlış yazar
        const at = word.indexOf(pr), idx = [...word].map((c, i) => i).filter(i => i < at || i >= at + pr.length);
        const k = idx.length ? idx[Math.floor(Math.random() * idx.length)] : word.length - 1;
        wrong = word.slice(0, k) + word.slice(k + 1);
        if (D.set.has(wrong) || wrong.length < 3) wrong = word + word[word.length - 1];
      }
      type(wrong, () => { DEF.action(st, pi, { t: 'word', w: wrong, tid }, ctx); erase(() => type(word, submit)); });
    } else type(word, submit);
  },
  skipTurn(st, pi, ctx) { if (st.phase === 'play' && st.cur === pi) explode(st, ctx); },
  serialize(st) { return st; },
  deserialize(o) { return o; },
  mount, render, onEvent, onFast, unmount,
  _t: { arm, buildDict, computeTiers, foldMap, dict: () => dict(), nounForms, verbForms, adjForms, check, fold, BAR, LVL, FUSE, pickPrompt, nextAlive }
};

/* ---------- arayüz ---------- */
const dn = p => p.isBot ? p.name.replace(/^Bilgisayar\b/, 'Bot') : p.name;
const KB = [[...'ERTYUIOPĞÜ'], [...'ASDFGHJKLŞİ'], ['SİL', ...'ZCVBNMÖÇ', 'TEMİZLE']];
function canAct() {
  if (!V || V.phase !== 'play' || !V.alive[V.cur]) return false;
  if (ui.mode === 'local') return !V.pl[V.cur].isBot;
  return ui.me === V.cur;
}
function mount(r, api) {
  root = r; ui = api; V = null; input = ''; pending = false; lastTid = -1; liveTxt = ''; liveTid = -1; liveSeat = -1; seatsBuilt = ''; prevHearts = []; barOwner = -1; phaseSeen = '';
  root.innerHTML = `<div class="g-wrap bb">
    <div class="bb-stage">
      <div class="bb-table">
        <div class="bb-felt"></div>
        <div class="bb-arrow"><i></i></div>
        <div class="bb-seats"></div>
        <div class="bb-bomb" data-heat="0">
          <svg viewBox="0 0 120 120" aria-hidden="true"><defs><radialGradient id="bbGrad" cx="36%" cy="34%" r="72%"><stop offset="0" stop-color="#7d7b9c"/><stop offset=".32" stop-color="#2f2c4a"/><stop offset="1" stop-color="#06050e"/></radialGradient></defs>
            <path class="bb-fuse" d="M80 30 q8 -16 24 -15" stroke="#d9b277" stroke-width="5" fill="none" stroke-linecap="round"/>
            <rect x="67" y="22" width="20" height="15" rx="3" transform="rotate(38 77 30)" fill="#45415f" stroke="#1b1930" stroke-width="2"/>
            <circle class="bb-body" cx="56" cy="67" r="45" fill="url(#bbGrad)" stroke="#000" stroke-width="2"/>
            <ellipse cx="38" cy="47" rx="13" ry="7" fill="rgba(255,255,255,.32)" transform="rotate(-32 38 47)"/>
          </svg>
          <span class="bb-spark"></span>
          <b class="bb-prompt"></b>
        </div>
        <div class="bb-boom"><span>BUM!</span></div>
        <div class="bb-count" hidden></div>
      </div>
    </div>
    <div class="bb-side">
      <div class="g-status bb-status"></div>
      <div class="bb-input" aria-live="polite"><span class="bb-txt"></span><div class="bb-msg"></div></div>
      <div class="bb-barwrap"><div class="bb-barlbl"></div><div class="bb-bar">${BAR.map(c => `<span data-c="${c}">${c}</span>`).join('')}</div></div>
      <div class="bb-kb">${KB.map(row => `<div class="bb-row">${row.map(k => `<button type="button" class="bb-k ${k.length > 1 ? 'wide' : ''}" data-k="${k}" ${k === 'SİL' ? 'aria-label="Son harfi sil"' : ''}>${k === 'SİL' ? '⌫' : k === 'TEMİZLE' ? '✕' : k}</button>`).join('')}</div>`).join('')}
        <div class="bb-row"><button type="button" class="bb-k bb-send" data-k="ENTER">GÖNDER ⏎</button></div>
      </div>
    </div>
  </div>`;
  root.querySelector('.bb-kb').addEventListener('click', e => { const b = e.target.closest('.bb-k'); if (b && !b.disabled) { Sound.init(); press(b.dataset.k); } });
  document.addEventListener('keydown', onKey);
  clearTimeout(tickT); tickLoop();
}
function onKey(e) {
  if (document.body.dataset.game !== 'bomba' || !root) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target && e.target.closest && e.target.closest('input,textarea,select')) return;
  for (const id of ['confirm', 'settings', 'results']) { const el = document.getElementById(id); if (el && !el.hidden) return; }
  if (!canAct()) return;
  if (e.key === 'Enter') { e.preventDefault(); if (!e.repeat) press('ENTER'); return; }
  if (e.key === 'Backspace') { e.preventDefault(); press('SİL'); return; }
  if (e.key === 'Escape') { press('TEMİZLE'); return; }
  if (e.key && [...e.key].length === 1) { const L = up(e.key); if (ALPHA.has(L)) { e.preventDefault(); press(L); } }
}
function press(k) {
  if (!canAct() || pending) return;
  if (k === 'ENTER') { submit(); return; }
  if (k === 'SİL') input = [...input].slice(0, -1).join('');
  else if (k === 'TEMİZLE') input = '';
  else if (ALPHA.has(k) && [...input].length < MAXLEN) input += k;
  else return;
  Sound.tick(.6);
  sendFast(); paintInput(); paintLiveSeat();
}
function submit() {
  if (!input || pending) return;
  if ([...input].length < 3) { say('En az 3 harf yaz', 'bad'); shake(); Sound.bad(); return; }
  pending = true; sendFast(true);
  clearTimeout(pendT); pendT = setTimeout(() => { pending = false; paintInput(); }, 4000);
  paintInput();
  ui.send({ t: 'word', w: input, tid: V.turnId });
}
function sendFast(now) {
  if (ui.mode !== 'online' || !V) return;
  const go = () => { lastFast = Date.now(); fastT = null; if (V && canAct()) ui.fast({ k: 'ty', x: input, tid: V.turnId }); };
  clearTimeout(fastT);
  const wait = 200 - (Date.now() - lastFast);
  if (now || wait <= 0) go(); else fastT = setTimeout(go, wait);
}
function onFast(m) {
  if (!m || m.k !== 'ty' || !V || !root) return;
  const seat = m.s != null ? m.s : m.seat;
  if (seat !== V.cur || m.tid !== V.turnId || canAct()) return;
  liveTxt = String(m.x || '').slice(0, MAXLEN); liveTid = m.tid; liveSeat = seat;
  paintInput(); paintLiveSeat();
}
function say(text, cls) {
  const m = root && root.querySelector('.bb-msg'); if (!m) return;
  m.textContent = text; m.className = 'bb-msg show ' + (cls || '');
  clearTimeout(msgT); msgT = setTimeout(() => { if (m) m.className = 'bb-msg'; }, 2200);
}
function shake() { const el = root && root.querySelector('.bb-input'); if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
function hl(text, pr) {
  const i = pr ? text.indexOf(pr) : -1;
  if (i < 0) return esc(text);
  return esc(text.slice(0, i)) + `<mark>${esc(pr)}</mark>` + esc(text.slice(i + pr.length));
}
function shownText() {
  if (!V) return '';
  if (canAct()) return input;
  return liveTid === V.turnId && liveSeat === V.cur ? liveTxt : '';
}
function paintInput() {
  if (!root || !V) return;
  const box = root.querySelector('.bb-input'), tx = root.querySelector('.bb-txt');
  const mine = canAct(), t = shownText();
  box.classList.toggle('mine', mine); box.classList.toggle('pending', pending);
  box.style.setProperty('--pc', V.pl[V.cur] ? V.pl[V.cur].color : '#fff');
  if (V.phase !== 'play') { tx.innerHTML = V.phase === 'boom' && V.lastEx ? `<small>Örnek: </small>${hl(V.lastEx, '')}` : '<small>…</small>'; box.classList.remove('mine'); return; }
  if (t) tx.innerHTML = hl(t, V.prompt) + (mine ? '<i class="bb-caret"></i>' : '');
  else tx.innerHTML = mine ? `<small>“${esc(V.prompt)}” geçen bir kelime yaz</small><i class="bb-caret"></i>` : `<small>${esc(dn(V.pl[V.cur]))} ${V.pl[V.cur].isBot ? 'düşünüyor' : 'yazıyor'}…</small>`;
}
function paintLiveSeat() {
  if (!root || !V) return;
  root.querySelectorAll('.bb-seat').forEach(s => {
    const i = +s.dataset.i, w = s.querySelector('.bb-word');
    if (V.phase === 'play' && i === V.cur) { const t = shownText(); w.innerHTML = t ? hl(t, V.prompt) : '<i>…</i>'; w.classList.add('typing'); }
    else { w.textContent = V.last[i] || ''; w.classList.remove('typing'); }
  });
}
function seatAngle(i) {
  const n = V.pl.length, me = ui.mode === 'online' && ui.me >= 0 ? ui.me : 0;
  return (90 + (i - me) * 360 / n) * Math.PI / 180;
}
function buildSeats() {
  const key = V.pl.map(p => p.name).join('|') + ':' + ui.me;
  if (seatsBuilt === key) return;
  seatsBuilt = key;
  const n = V.pl.length, R = n > 6 ? 41 : 40;
  root.querySelector('.bb-seats').innerHTML = V.pl.map((p, i) => {
    const a = seatAngle(i), x = 50 + R * Math.cos(a), y = 50 + R * Math.sin(a);
    return `<div class="bb-seat" data-i="${i}" style="--pc:${p.color};left:${x.toFixed(2)}%;top:${y.toFixed(2)}%">
      <span class="av bb-av" style="--pc:${p.color}">${initial(p.name)}</span>
      <b class="bb-name">${p.isBot ? '🤖 ' : ''}${esc(dn(p))}</b>
      <span class="bb-hearts"></span>
      <span class="bb-word"></span></div>`;
  }).join('');
  root.querySelector('.bb-table').classList.toggle('many', n > 5);
}
function render(v) {
  if (!root) return;
  const prev = V; V = v;
  buildSeats();
  if (v.turnId !== lastTid) { lastTid = v.turnId; input = ''; pending = false; clearTimeout(pendT); liveTxt = ''; liveTid = -1; }
  const mine = canAct(), p = v.pl, cur = p[v.cur];
  // oyuncular
  root.querySelectorAll('.bb-seat').forEach(s => {
    const i = +s.dataset.i;
    s.classList.toggle('cur', v.phase === 'play' && i === v.cur);
    s.classList.toggle('out', !v.alive[i]);
    s.classList.toggle('off', p[i].online === false);
    s.classList.toggle('me', ui.mode === 'online' && i === ui.me);
    const h = v.hearts[i];
    s.querySelector('.bb-hearts').innerHTML = v.alive[i] ? Array.from({ length: Math.max(v.maxH, h) }, (_, k) => `<i class="${k < h ? 'on' : ''}">${k < h ? '❤' : '♡'}</i>`).join('') : '<i class="dead">💀 elendi</i>';
    if (prevHearts[i] != null && h < prevHearts[i]) { s.classList.remove('hurt'); void s.offsetWidth; s.classList.add('hurt'); }
    if (prevHearts[i] != null && h > prevHearts[i]) { s.classList.remove('heal'); void s.offsetWidth; s.classList.add('heal'); }
    prevHearts[i] = h;
  });
  // bomba
  const bomb = root.querySelector('.bb-bomb'), arrow = root.querySelector('.bb-arrow');
  const tgt = v.phase === 'boom' ? v.boomPi : v.cur;
  const a = seatAngle(tgt >= 0 ? tgt : 0), off = v.phase === 'play' ? 30 : v.phase === 'boom' ? 60 : 0;
  bomb.style.setProperty('--dx', (Math.cos(a) * off).toFixed(1) + '%');
  bomb.style.setProperty('--dy', (Math.sin(a) * off).toFixed(1) + '%');
  bomb.dataset.heat = v.phase === 'play' ? v.heat : 0;
  bomb.classList.toggle('gone', v.phase === 'boom' || v.phase === 'end');
  bomb.classList.toggle('idle', v.phase === 'start');
  root.querySelector('.bb-prompt').textContent = v.phase === 'play' ? v.prompt : v.phase === 'start' ? '?' : '';
  const deg = a * 180 / Math.PI; let d = ((deg - rotNow) % 360 + 540) % 360 - 180; rotNow += d;
  arrow.style.setProperty('--rot', rotNow.toFixed(1) + 'deg');
  arrow.style.setProperty('--pc', cur ? cur.color : '#fff');
  arrow.classList.toggle('show', v.phase === 'play');
  // başlangıç geri sayımı
  const cnt = root.querySelector('.bb-count');
  cnt.hidden = v.phase !== 'start';
  clearInterval(startT);
  if (v.phase === 'start') { const upd = () => { const left = Math.max(0, Math.ceil((v.pe - ui.hostNow()) / 1000)); cnt.innerHTML = `<small>HAZIR OL</small>${left || '💣'}`; }; upd(); startT = setInterval(upd, 200); }
  // durum
  const st = root.querySelector('.bb-status');
  const lvlName = ['Isınma', 'Kolay', 'Orta', 'Zor'][v.lvl] || '';
  if (v.phase === 'start') st.innerHTML = `<span class="g-turn">İlk bomba: <b style="color:${cur.color}">${esc(dn(cur))}</b></span>`;
  else if (v.phase === 'play') {
    if (mine && ui.mode === 'local' && p.filter(x => !x.isBot).length > 1) st.innerHTML = `<span class="g-turn mine">💣 Sıra: ${esc(cur.name)} · yaz!</span>`;
    else if (mine) st.innerHTML = `<span class="g-turn mine">💣 Sıra sende · hece: ${esc(v.prompt)}</span>`;
    else st.innerHTML = `<span class="g-turn">Sıra: <b style="color:${cur.color}">${esc(dn(cur))}</b>${cur.isBot ? ' 🤖' : ''}<small class="bb-lvl">${lvlName}</small></span>`;
  } else if (v.phase === 'boom') { const b = p[v.boomPi]; st.innerHTML = `<span class="g-turn bb-boomtxt">💥 ${esc(dn(b))} ${v.alive[v.boomPi] ? 'bir can kaybetti' : 'elendi'}!</span>`; }
  else st.innerHTML = '<span class="g-turn win">Oyun bitti</span>';
  // harf çubuğu sahibi
  const humans = p.map((x, i) => x.isBot ? -1 : i).filter(i => i >= 0);
  if (ui.mode === 'online') barOwner = ui.me >= 0 ? ui.me : v.cur;
  else if (!p[v.cur].isBot) barOwner = v.cur;
  else if (barOwner < 0 || p[barOwner].isBot) barOwner = humans[0] != null ? humans[0] : v.cur;
  const L = v.letters[barOwner] || '';
  root.querySelectorAll('.bb-bar span').forEach(s => s.classList.toggle('on', L.includes(s.dataset.c)));
  const multi = ui.mode === 'local' && humans.length > 1;
  root.querySelector('.bb-barlbl').innerHTML = `${multi || ui.mode === 'online' && ui.me < 0 ? `<b style="color:${p[barOwner].color}">${esc(p[barOwner].name)}</b> · ` : ''}Harf alfabesi <b>${L.length}/${BAR.length}</b> · hepsini kullan, <span class="bb-plus">+1 ❤</span>`;
  // klavye
  root.querySelectorAll('.bb-k').forEach(b => { b.disabled = !mine; });
  root.querySelector('.bb-kb').classList.toggle('on', mine);
  if (mine && prev && (prev.turnId !== v.turnId) && v.phase === 'play') { Sound.special(); if (navigator.vibrate) try { navigator.vibrate(40); } catch { /* */ } }
  if (v.phase !== phaseSeen) { phaseSeen = v.phase; }
  paintInput(); paintLiveSeat();
}
function tickLoop() {
  const period = !V || V.phase !== 'play' ? 400 : [880, 600, 360, 200][V.heat] || 880;
  if (V && V.phase === 'play') {
    tickSound(V.heat);
    const b = root && root.querySelector('.bb-bomb');
    if (b) { b.classList.remove('throb'); void b.offsetWidth; b.classList.add('throb'); }
  }
  tickT = setTimeout(tickLoop, period);
}
function tickSound(heat) {
  if (!Sound.ok || !Sound.ok('bbtick', 60)) return;
  try { Sound.noise(.035, { freq: 2600 + heat * 500, q: 5, gain: .35 + heat * .08 }); Sound.tone(heat >= 3 ? 1500 : 1100, .03, { type: 'square', gain: .04 + heat * .015 }); } catch { /* ses yok */ }
}
function boomSound() {
  if (!Sound.ok || !Sound.ok('bbboom', 400)) return;
  try { Sound.noise(1.1, { filter: 'lowpass', freq: 700, q: .7, gain: .9, decayPow: 1.4 }); Sound.tone(110, .7, { type: 'sine', gain: .5, slide: 38 }); Sound.noise(.4, { freq: 3000, q: .5, gain: .25 }); } catch { /* ses yok */ }
}
function seatEl(pi) { return root && root.querySelector(`.bb-seat[data-i="${pi}"]`); }
function floatWord(pi, w) {
  const tb = root.querySelector('.bb-table'), s = seatEl(pi); if (!tb || !s) return;
  const f = document.createElement('span'); f.className = 'bb-fly'; f.textContent = w;
  f.style.left = s.style.left; f.style.top = s.style.top;
  tb.appendChild(f); setTimeout(() => f.remove(), 1300);
}
function onEvent(e) {
  if (!root) return;
  const nm = pi => V && V.pl[pi] ? V.pl[pi].name.toLocaleUpperCase('tr-TR') : '';
  if (e.t === 'bad') {
    const actor = V && (ui.mode === 'local' ? !V.pl[e.pi].isBot : ui.me === e.pi);
    if (actor && V.turnId === e.tid) { pending = false; clearTimeout(pendT); say(e.why || 'Geçersiz', 'bad'); shake(); Sound.bad(); paintInput(); }
    else { shake(); if (V && e.pi === V.cur) say(`${e.w || ''}: ${e.why}`, 'bad'); }
  } else if (e.t === 'ok') {
    Sound.good(); floatWord(e.pi, e.w);
    const s = seatEl(e.pi); if (s) { s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); }
    if (e.bonus) {
      Sound.special(); banner(e.gain ? `${nm(e.pi)} +1 CAN!` : `${nm(e.pi)} ALFABEYİ BİTİRDİ`, 'good');
      if (s) { const [x, y] = centerOf(s); FX.burst(x, y, 50); }
    }
    say('', '');
  } else if (e.t === 'boom') {
    boomSound(); flash('bad');
    const wrap = root.querySelector('.bb'), bm = root.querySelector('.bb-boom'), tb = root.querySelector('.bb-table');
    wrap.classList.remove('bb-shake'); void wrap.offsetWidth; wrap.classList.add('bb-shake');
    const s = seatEl(e.pi);
    if (s) { bm.style.left = s.style.left; bm.style.top = s.style.top; }
    bm.classList.remove('go'); void bm.offsetWidth; bm.classList.add('go');
    if (s) { const [x, y] = centerOf(s); FX.burst(x, y, 60, true); FX.burst(x, y, 30, false); }
    else if (tb) { const [x, y] = centerOf(tb); FX.burst(x, y, 60); }
    banner(e.out ? `${nm(e.pi)} ELENDİ!` : 'BUM!', 'bad');
    if (navigator.vibrate) try { navigator.vibrate([80, 40, 160]); } catch { /* */ }
  } else if (e.t === 'bomb') {
    Sound.whoosh();
  } else if (e.t === 'win') {
    Sound.solve(); FX.confetti(120);
  }
}
function unmount() {
  document.removeEventListener('keydown', onKey);
  clearTimeout(tickT); clearTimeout(fastT); clearTimeout(msgT); clearTimeout(pendT); clearInterval(startT);
  root = null; V = null; ui = null;
}

CFX.registerGame(DEF);
})();
