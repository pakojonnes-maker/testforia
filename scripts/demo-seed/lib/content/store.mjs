// scripts/demo-seed/lib/content/store.mjs
// =============================================================================
// Tienda del apartamento demo (guide_store_items, owner_type='host') y modal
// de bienvenida (guide_welcome_modals).
//
// `cta_label` NO se traduce a propósito: CTAButton.tsx hace
// `cta_label || getTranslation(defaultLabelKey, lang)`, así que dejándolo vacío
// el botón sale ya traducido a los 13 idiomas por el i18n del frontend. Poner
// un texto propio serían 78 cadenas más para conseguir exactamente lo mismo.
//
// `category` es una AGRUPACIÓN, no el nombre del servicio, y el vocabulario
// vigente es el de la migración 0081:
//   checkinout | service | welcome | grocery | local_product | custom
//
// El comentario de guide_store_items todavía lista el enum de la 0080
// (late_checkout, early_checkin, transfer, welcome_pack...), que la 0081
// fusionó precisamente porque convertía cada servicio en su propia categoría.
// Este archivo se escribió siguiendo ese comentario viejo, así que las demos
// sembradas salían con categorías que el admin no sabe etiquetar: la tarjeta
// enseñaba "late_checkout" en crudo y el filtro por categoría no las cazaba.
//
// Nada de 'cleaning' (limpieza intermedia) en el catálogo demo: es el upsell
// que en España activa el IVA del servicio y complica la conversación de
// precios justo cuando estás enseñando el producto. Si algún día se quiere,
// es añadir un objeto más aquí.
// =============================================================================

export const STORE_ITEMS = [
    {
        slug: 'late-checkout',
        category: 'checkinout',
        icon: 'schedule',
        price: 35,
        priceDisplay: '35 €',
        featured: true,
        order: 10,
        image: 'store-late-checkout.jpg',
        name: {
            es: 'Salida tardía hasta las 14:00', en: 'Late check-out until 14:00', fr: 'Départ tardif jusqu\'à 14h00',
            de: 'Später Check-out bis 14:00 Uhr', it: 'Check-out posticipato fino alle 14:00', pt: 'Saída tardia até às 14:00',
            ca: 'Sortida tardana fins a les 14:00', ar: 'مغادرة متأخرة حتى الساعة ١٤:٠٠', ru: 'Поздний выезд до 14:00',
            uk: 'Пізній виїзд до 14:00', zh: '延迟退房至 14:00', ja: 'レイトチェックアウト（14時まで）', ko: '레이트 체크아웃 (14:00까지)',
        },
        description: {
            es: 'Cuatro horas más sin prisas: comida tranquila, último baño en la piscina y una ducha antes de coger el coche. Sujeto a disponibilidad; te confirmamos la noche anterior.',
            en: 'Four unhurried extra hours: a relaxed lunch, one last swim and a shower before you get in the car. Subject to availability; we confirm the night before.',
            fr: 'Quatre heures de plus sans se presser : un déjeuner tranquille, un dernier bain et une douche avant de reprendre la route. Sous réserve de disponibilité ; nous confirmons la veille au soir.',
            de: 'Vier entspannte Stunden extra: in Ruhe essen, noch einmal in den Pool und duschen, bevor es ins Auto geht. Nach Verfügbarkeit; wir bestätigen am Vorabend.',
            it: 'Quattro ore in più senza fretta: pranzo tranquillo, ultimo bagno in piscina e una doccia prima di salire in macchina. Soggetto a disponibilità; confermiamo la sera prima.',
            pt: 'Mais quatro horas sem pressas: um almoço tranquilo, o último mergulho e um duche antes de entrar no carro. Sujeito a disponibilidade; confirmamos na véspera.',
            ca: 'Quatre hores més sense presses: dinar tranquil, últim bany a la piscina i una dutxa abans d\'agafar el cotxe. Subjecte a disponibilitat; t\'ho confirmem la nit abans.',
            ar: 'أربع ساعات إضافية دون عجلة: غداء هادئ، وسباحة أخيرة، ودُش قبل ركوب السيارة. حسب التوافر؛ نؤكد لك في الليلة السابقة.',
            ru: 'Четыре дополнительных часа без спешки: спокойный обед, последнее купание и душ перед дорогой. При наличии свободного дня; подтверждаем накануне вечером.',
            uk: 'Чотири додаткові години без поспіху: спокійний обід, останнє купання й душ перед дорогою. За наявності вільного дня; підтверджуємо напередодні ввечері.',
            zh: '多出四个小时，不必赶时间：从容吃顿午饭、再游一次泳，出发前冲个澡。视当日空房情况而定，我们会在前一晚确认。',
            ja: '急がずに過ごせる4時間の延長。ゆっくり昼食をとり、最後にもうひと泳ぎして、車に乗る前にシャワーを。空き状況によります。前夜にご連絡します。',
            ko: '서두르지 않아도 되는 네 시간의 여유. 느긋한 점심, 마지막 수영, 그리고 출발 전 샤워까지. 당일 예약 상황에 따라 가능하며 전날 밤에 확정해 드립니다.',
        },
    },
    {
        slug: 'early-checkin',
        category: 'checkinout',
        icon: 'login',
        price: 35,
        priceDisplay: '35 €',
        featured: false,
        order: 20,
        image: 'store-early-checkin.jpg',
        name: {
            es: 'Entrada anticipada desde las 12:00', en: 'Early check-in from 12:00', fr: 'Arrivée anticipée dès 12h00',
            de: 'Früher Check-in ab 12:00 Uhr', it: 'Check-in anticipato dalle 12:00', pt: 'Entrada antecipada a partir das 12:00',
            ca: 'Entrada anticipada des de les 12:00', ar: 'وصول مبكر من الساعة ١٢:٠٠', ru: 'Ранний заезд с 12:00',
            uk: 'Ранній заїзд із 12:00', zh: '提前入住，12:00 起', ja: 'アーリーチェックイン（12時から）', ko: '얼리 체크인 (12:00부터)',
        },
        description: {
            es: 'Si llegas de un viaje largo, cuatro horas antes cambian el día entero: dejar las maletas, comer algo y empezar las vacaciones ya. Te lo confirmamos según la salida anterior.',
            en: 'After a long journey, four hours earlier changes the whole day: drop the bags, eat something and start the holiday right away. We confirm depending on the previous check-out.',
            fr: 'Après un long trajet, quatre heures plus tôt changent toute la journée : poser les valises, manger un morceau et commencer les vacances tout de suite. Confirmation selon le départ précédent.',
            de: 'Nach einer langen Anreise verändern vier Stunden früher den ganzen Tag: Koffer abstellen, etwas essen und sofort Urlaub machen. Bestätigung je nach vorherigem Check-out.',
            it: 'Dopo un viaggio lungo, quattro ore prima cambiano l\'intera giornata: posare le valigie, mangiare qualcosa e iniziare subito la vacanza. Confermiamo in base alla partenza precedente.',
            pt: 'Depois de uma viagem longa, quatro horas antes mudam o dia inteiro: largar as malas, comer algo e começar já as férias. Confirmamos consoante a saída anterior.',
            ca: 'Si véns d\'un viatge llarg, quatre hores abans et canvien el dia sencer: deixar les maletes, menjar alguna cosa i començar les vacances. T\'ho confirmem segons la sortida anterior.',
            ar: 'بعد رحلة طويلة، أربع ساعات مبكرة تغيّر اليوم كله: ضع الحقائب، تناول شيئًا، وابدأ إجازتك فورًا. نؤكد ذلك حسب موعد مغادرة النزلاء السابقين.',
            ru: 'После долгой дороги четыре часа раньше меняют весь день: оставить чемоданы, перекусить и сразу начать отпуск. Подтверждаем в зависимости от предыдущего выезда.',
            uk: 'Після довгої дороги чотири години раніше змінюють весь день: залишити валізи, перекусити й одразу почати відпустку. Підтверджуємо залежно від попереднього виїзду.',
            zh: '长途跋涉之后，提前四小时能改变一整天：放下行李、吃点东西，假期立刻开始。是否可行取决于前一位客人的退房时间。',
            ja: '長旅のあとの4時間前倒しは、一日の質を変えます。荷物を置いて、何か食べて、すぐに休暇を始められます。前のお客様のチェックアウト次第でご案内します。',
            ko: '긴 여정 끝의 네 시간은 하루 전체를 바꿉니다. 짐을 내려놓고 간단히 식사한 뒤 바로 휴가를 시작하세요. 직전 체크아웃 상황에 따라 확정해 드립니다.',
        },
    },
    {
        slug: 'welcome-pack',
        category: 'welcome',
        icon: 'redeem',
        price: 45,
        priceDisplay: '45 €',
        featured: true,
        order: 30,
        image: 'store-welcome-pack.jpg',
        name: {
            es: 'Cesta de bienvenida del Somontano', en: 'Somontano welcome hamper', fr: 'Panier de bienvenue du Somontano',
            de: 'Willkommenskorb aus dem Somontano', it: 'Cesto di benvenuto del Somontano', pt: 'Cabaz de boas-vindas do Somontano',
            ca: 'Cistella de benvinguda del Somontano', ar: 'سلة ترحيب من منطقة سومونتانو', ru: 'Приветственная корзина из Сомонтано',
            uk: 'Вітальний кошик із Сомонтано', zh: '索蒙塔诺迎宾礼篮', ja: 'ソモンターノのウェルカムバスケット', ko: '소몬타노 웰컴 바스켓',
        },
        description: {
            es: 'Te la dejamos en la mesa de la cocina antes de que llegues: una botella de tinto del Somontano, queso de Radiquero, longaniza de Graus, pan de pueblo y fruta de temporada.',
            en: 'Waiting on the kitchen table before you arrive: a bottle of Somontano red, Radiquero cheese, Graus sausage, village bread and seasonal fruit.',
            fr: 'Posé sur la table de la cuisine avant votre arrivée : une bouteille de rouge du Somontano, du fromage de Radiquero, de la longanisse de Graus, du pain de village et des fruits de saison.',
            de: 'Steht schon vor Ihrer Ankunft auf dem Küchentisch: eine Flasche Somontano-Rotwein, Käse aus Radiquero, Wurst aus Graus, Landbrot und Obst der Saison.',
            it: 'Ti aspetta sul tavolo della cucina prima che arrivi: una bottiglia di rosso del Somontano, formaggio di Radiquero, salsiccia di Graus, pane di paese e frutta di stagione.',
            pt: 'Fica à sua espera na mesa da cozinha antes de chegar: uma garrafa de tinto do Somontano, queijo de Radiquero, chouriço de Graus, pão caseiro e fruta da época.',
            ca: 'Te la deixem a la taula de la cuina abans que arribis: una ampolla de negre del Somontano, formatge de Radiquero, llonganissa de Graus, pa de poble i fruita de temporada.',
            ar: 'نتركها على طاولة المطبخ قبل وصولك: زجاجة نبيذ أحمر من سومونتانو، وجبن راديكيرو، ونقانق غراوس، وخبز القرية، وفاكهة الموسم.',
            ru: 'Ждёт вас на кухонном столе ещё до приезда: бутылка красного из Сомонтано, сыр из Радикеро, колбаса из Грауса, деревенский хлеб и сезонные фрукты.',
            uk: 'Чекає на вас на кухонному столі ще до приїзду: пляшка червоного із Сомонтано, сир із Радікеро, ковбаса з Ґрауса, сільський хліб і сезонні фрукти.',
            zh: '在你抵达前就摆在厨房餐桌上：一瓶索蒙塔诺红葡萄酒、拉迪克罗奶酪、格劳斯香肠、乡村面包和当季水果。',
            ja: 'ご到着前にキッチンのテーブルにご用意します。ソモンターノの赤ワイン1本、ラディケロのチーズ、グラウスのソーセージ、田舎パン、旬の果物。',
            ko: '도착 전 주방 식탁에 준비해 둡니다. 소몬타노 레드와인 한 병, 라디케로 치즈, 그라우스 소시지, 시골빵, 그리고 제철 과일.',
        },
    },
    {
        slug: 'grocery-run',
        category: 'grocery',
        icon: 'shopping_basket',
        price: 25,
        priceDisplay: '25 € + compra',
        featured: false,
        order: 40,
        image: 'store-grocery.jpg',
        name: {
            es: 'Nevera llena a tu llegada', en: 'A full fridge when you arrive', fr: 'Le frigo plein à votre arrivée',
            de: 'Voller Kühlschrank bei Ankunft', it: 'Frigo pieno al tuo arrivo', pt: 'Frigorífico cheio à sua chegada',
            ca: 'Nevera plena en arribar', ar: 'ثلاجة ممتلئة عند وصولك', ru: 'Полный холодильник к приезду',
            uk: 'Повний холодильник до приїзду', zh: '抵达时冰箱已装满', ja: '到着時に冷蔵庫がいっぱい', ko: '도착하면 채워져 있는 냉장고',
        },
        description: {
            es: 'Mándanos tu lista por WhatsApp dos días antes y hacemos la compra. Pagas 25 € por el servicio más el ticket, que te dejamos encima de la mesa. Perfecto si llegáis de noche o con niños.',
            en: 'Send us your list on WhatsApp two days ahead and we do the shopping. You pay 25 € for the service plus the receipt, which we leave on the table. Ideal if you arrive late or with children.',
            fr: 'Envoyez-nous votre liste sur WhatsApp deux jours avant et nous faisons les courses. Vous payez 25 € pour le service, plus le ticket que nous laissons sur la table. Parfait si vous arrivez de nuit ou avec des enfants.',
            de: 'Schicken Sie uns Ihre Liste zwei Tage vorher per WhatsApp, wir erledigen den Einkauf. Sie zahlen 25 € für den Service plus den Kassenbon, den wir auf den Tisch legen. Ideal bei später Ankunft oder mit Kindern.',
            it: 'Mandaci la lista su WhatsApp due giorni prima e facciamo la spesa. Paghi 25 € per il servizio più lo scontrino, che lasciamo sul tavolo. Perfetto se arrivate di notte o con bambini.',
            pt: 'Envie-nos a sua lista por WhatsApp dois dias antes e fazemos as compras. Paga 25 € pelo serviço mais o talão, que deixamos em cima da mesa. Perfeito se chegar de noite ou com crianças.',
            ca: 'Envia\'ns la llista per WhatsApp dos dies abans i fem la compra. Pagues 25 € pel servei més el tiquet, que et deixem sobre la taula. Perfecte si arribeu de nit o amb canalla.',
            ar: 'أرسل لنا قائمتك على واتساب قبل يومين ونتولى التسوق. تدفع ٢٥ يورو مقابل الخدمة بالإضافة إلى قيمة الفاتورة التي نتركها على الطاولة. مثالي إذا وصلت ليلًا أو مع أطفال.',
            ru: 'Пришлите список в WhatsApp за два дня, и мы съездим за покупками. Вы платите 25 € за услугу плюс сумму по чеку, который мы оставим на столе. Отлично, если приезжаете поздно или с детьми.',
            uk: 'Надішліть список у WhatsApp за два дні, і ми з\'їздимо по продукти. Ви платите 25 € за послугу плюс суму за чеком, який ми залишимо на столі. Чудово, якщо приїжджаєте пізно або з дітьми.',
            zh: '提前两天把清单用 WhatsApp 发给我们，采购由我们完成。服务费 25 欧元，另加小票金额，小票会放在餐桌上。夜间抵达或带孩子出行尤其省事。',
            ja: '2日前までにWhatsAppでリストをお送りいただければ、こちらで買い出しをします。サービス料25ユーロとレシート分をお支払いください。レシートはテーブルに置いておきます。夜遅い到着やお子さま連れの方に。',
            ko: '이틀 전에 WhatsApp으로 목록을 보내주시면 저희가 장을 봐둡니다. 서비스 요금 25 €와 영수증 금액을 지불하시면 되고, 영수증은 식탁 위에 놓아둡니다. 늦은 밤 도착이나 아이와 함께라면 특히 편리합니다.',
        },
    },
    {
        slug: 'airport-transfer',
        category: 'service',
        icon: 'airport_shuttle',
        price: 120,
        priceDisplay: '120 € por trayecto',
        featured: false,
        order: 50,
        image: 'store-transfer.jpg',
        name: {
            es: 'Traslado desde el aeropuerto', en: 'Airport transfer', fr: 'Transfert depuis l\'aéroport',
            de: 'Flughafentransfer', it: 'Transfer dall\'aeroporto', pt: 'Transfer do aeroporto',
            ca: 'Trasllat des de l\'aeroport', ar: 'خدمة النقل من المطار', ru: 'Трансфер из аэропорта',
            uk: 'Трансфер з аеропорту', zh: '机场接送', ja: '空港送迎', ko: '공항 픽업 서비스',
        },
        description: {
            es: 'Conductor de confianza desde el aeropuerto de Zaragoza hasta la puerta, con sillita infantil si la necesitas. Hora y media de trayecto y ni una preocupación después de un vuelo.',
            en: 'A trusted driver from Zaragoza airport to the front door, with a child seat if you need one. An hour and a half on the road and nothing to worry about after a flight.',
            fr: 'Un chauffeur de confiance depuis l\'aéroport de Saragosse jusqu\'à la porte, avec siège enfant si besoin. Une heure et demie de route et aucun souci après un vol.',
            de: 'Ein verlässlicher Fahrer vom Flughafen Zaragoza bis vor die Tür, auf Wunsch mit Kindersitz. Anderthalb Stunden Fahrt und nach dem Flug keine Sorgen mehr.',
            it: 'Autista di fiducia dall\'aeroporto di Saragozza fino alla porta, con seggiolino per bambini se serve. Un\'ora e mezza di viaggio e nessun pensiero dopo un volo.',
            pt: 'Motorista de confiança do aeroporto de Saragoça até à porta, com cadeirinha se precisar. Hora e meia de viagem e nenhuma preocupação depois de um voo.',
            ca: 'Conductor de confiança des de l\'aeroport de Saragossa fins a la porta, amb cadireta infantil si en necessites. Una hora i mitja de trajecte i cap preocupació després d\'un vol.',
            ar: 'سائق موثوق من مطار سرقسطة حتى باب المنزل، مع مقعد أطفال إن احتجت. ساعة ونصف على الطريق ودون أي قلق بعد رحلة الطيران.',
            ru: 'Надёжный водитель от аэропорта Сарагосы прямо до двери, при необходимости с детским креслом. Полтора часа в пути и никаких забот после перелёта.',
            uk: 'Надійний водій від аеропорту Сарагоси просто до дверей, за потреби з дитячим кріслом. Півтори години в дорозі й жодних турбот після перельоту.',
            zh: '由可靠的司机从萨拉戈萨机场直接送到门口，需要的话可配儿童座椅。车程一个半小时，下飞机后什么都不用操心。',
            ja: 'サラゴサ空港から玄関先まで、信頼できるドライバーがお送りします。チャイルドシートもご用意可能です。所要時間は1時間半。フライトのあと、何も心配はいりません。',
            ko: '사라고사 공항에서 현관까지 믿을 수 있는 기사가 모십니다. 필요하시면 카시트도 준비해 드립니다. 이동 시간 1시간 30분, 비행 후 신경 쓸 일이 없습니다.',
        },
    },
    {
        slug: 'local-produce',
        category: 'local_product',
        icon: 'wine_bar',
        price: 32,
        priceDisplay: '32 €',
        featured: false,
        order: 60,
        image: 'store-local-produce.jpg',
        name: {
            es: 'Lote de vino y aceite de la tierra', en: 'Local wine and olive oil set', fr: 'Coffret vin et huile d\'olive du pays',
            de: 'Wein- und Olivenöl-Set aus der Region', it: 'Confezione di vino e olio del territorio', pt: 'Conjunto de vinho e azeite da região',
            ca: 'Lot de vi i oli de la terra', ar: 'مجموعة نبيذ وزيت زيتون محليَّين', ru: 'Набор местного вина и оливкового масла',
            uk: 'Набір місцевого вина та оливкової олії', zh: '本地葡萄酒与橄榄油礼盒', ja: '地元ワインとオリーブオイルのセット', ko: '현지 와인·올리브유 세트',
        },
        description: {
            es: 'Para llevarte a casa: dos botellas de Somontano (un tinto y un blanco de gewürztraminer) y medio litro de aceite virgen extra del Bajo Aragón, en caja de madera. Te lo dejamos preparado en el recibidor.',
            en: 'To take home: two bottles of Somontano (a red and a gewürztraminer white) and half a litre of Bajo Aragón extra virgin olive oil, in a wooden box. We leave it ready in the hallway.',
            fr: 'À emporter chez vous : deux bouteilles du Somontano (un rouge et un blanc de gewurztraminer) et un demi-litre d\'huile d\'olive vierge extra du Bajo Aragón, en caisse bois. Nous le préparons dans l\'entrée.',
            de: 'Für zu Hause: zwei Flaschen Somontano (ein Roter und ein Gewürztraminer) und ein halber Liter natives Olivenöl extra aus dem Bajo Aragón, in der Holzkiste. Wir stellen es fertig in den Flur.',
            it: 'Da portare a casa: due bottiglie del Somontano (un rosso e un bianco di gewürztraminer) e mezzo litro di olio extravergine del Bajo Aragón, in cassetta di legno. Lo lasciamo pronto all\'ingresso.',
            pt: 'Para levar para casa: duas garrafas do Somontano (um tinto e um branco de gewürztraminer) e meio litro de azeite virgem extra do Bajo Aragón, em caixa de madeira. Deixamos tudo pronto na entrada.',
            ca: 'Per emportar-te a casa: dues ampolles del Somontano (un negre i un blanc de gewürztraminer) i mig litre d\'oli verge extra del Bajo Aragón, en caixa de fusta. T\'ho deixem preparat al rebedor.',
            ar: 'لتأخذه معك إلى البيت: زجاجتان من نبيذ سومونتانو (أحمر وأبيض من عنب غيفورتسترامينر) ونصف لتر من زيت الزيتون البكر الممتاز من باخو أراغون، في صندوق خشبي. نجهّزه لك عند المدخل.',
            ru: 'Домой с собой: две бутылки из Сомонтано (красное и белое из гевюрцтраминера) и пол-литра оливкового масла extra virgin из Бахо-Арагона, в деревянном ящике. Оставим готовым в прихожей.',
            uk: 'Додому із собою: дві пляшки із Сомонтано (червоне й біле з ґевюрцтрамінера) та пів літра оливкової олії extra virgin із Бахо-Араґона, у дерев\'яній скриньці. Залишимо готовим у передпокої.',
            zh: '带回家的伴手礼：两瓶索蒙塔诺葡萄酒（一红一白，白酒为琼瑶浆）和半升下阿拉贡特级初榨橄榄油，木盒包装。我们会提前放在玄关。',
            ja: 'おみやげに。ソモンターノのワイン2本（赤とゲヴュルツトラミネールの白）と、バホ・アラゴン産エクストラバージンオリーブオイル500ml。木箱入りで玄関にご用意しておきます。',
            ko: '집으로 가져가실 선물. 소몬타노 와인 두 병(레드 한 병과 게뷔르츠트라미너 화이트 한 병)과 바호아라곤 엑스트라 버진 올리브유 500ml를 나무 상자에 담아 현관에 준비해 둡니다.',
        },
    },
];

// -----------------------------------------------------------------------------
// Modal de bienvenida (guide_welcome_modals). Se muestra una vez al abrir la
// guía. `action_label` sí se traduce aquí porque este botón no pasa por
// CTAButton.tsx y no tiene texto por defecto.
// -----------------------------------------------------------------------------
export const WELCOME_MODAL = {
    image: 'welcome.jpg',
    actionType: 'WHATSAPP',
    title: {
        es: 'Bienvenido a {{apartment_name}}', en: 'Welcome to {{apartment_name}}', fr: 'Bienvenue à {{apartment_name}}',
        de: 'Willkommen in {{apartment_name}}', it: 'Benvenuto a {{apartment_name}}', pt: 'Bem-vindo a {{apartment_name}}',
        ca: 'Benvingut a {{apartment_name}}', ar: 'أهلًا بك في {{apartment_name}}', ru: 'Добро пожаловать в {{apartment_name}}',
        uk: 'Ласкаво просимо до {{apartment_name}}', zh: '欢迎来到{{apartment_name}}', ja: '{{apartment_name}}へようこそ', ko: '{{apartment_name}}에 오신 것을 환영합니다',
    },
    body: {
        es: 'Aquí tienes todo lo que necesitas: cómo entrar, cómo funciona la casa y qué merece la pena cerca. Está en tu idioma y no hace falta instalar nada. Cualquier duda, escríbenos.',
        en: 'Everything you need is here: how to get in, how the house works and what\'s worth seeing nearby. It\'s in your language and there\'s nothing to install. Any questions, just message us.',
        fr: 'Vous trouverez ici tout le nécessaire : comment entrer, comment fonctionne la maison et ce qui vaut le détour aux alentours. C\'est dans votre langue et il n\'y a rien à installer. Une question ? Écrivez-nous.',
        de: 'Hier finden Sie alles: wie Sie hineinkommen, wie das Haus funktioniert und was sich in der Nähe lohnt. In Ihrer Sprache und ohne Installation. Bei Fragen schreiben Sie uns einfach.',
        it: 'Qui trovi tutto quello che serve: come entrare, come funziona la casa e cosa vale la pena vedere qui vicino. È nella tua lingua e non devi installare nulla. Per qualsiasi dubbio, scrivici.',
        pt: 'Aqui tem tudo o que precisa: como entrar, como funciona a casa e o que vale a pena ver por perto. Está no seu idioma e não é preciso instalar nada. Qualquer dúvida, escreva-nos.',
        ca: 'Aquí tens tot el que necessites: com entrar, com funciona la casa i què val la pena a prop. És en el teu idioma i no cal instal·lar res. Qualsevol dubte, escriu-nos.',
        ar: 'هنا كل ما تحتاجه: كيفية الدخول، وكيف يعمل المنزل، وما يستحق الزيارة في الجوار. كل ذلك بلغتك ودون تثبيت أي تطبيق. لأي استفسار، راسلنا.',
        ru: 'Здесь всё, что нужно: как попасть внутрь, как устроен дом и что стоит посмотреть рядом. На вашем языке и без установки приложений. Будут вопросы — напишите нам.',
        uk: 'Тут усе, що потрібно: як потрапити всередину, як влаштований будинок і що варто побачити поруч. Вашою мовою й без встановлення застосунків. Виникнуть питання — напишіть нам.',
        zh: '你需要的一切都在这里：如何进门、房子怎么用，以及附近有什么值得一去。界面是你的语言，无需安装任何应用。有任何疑问，随时联系我们。',
        ja: '必要なことはすべてここに。入り方、家の使い方、近くで足を運ぶ価値のある場所。お使いの言語で表示され、アプリのインストールは不要です。ご不明な点はお気軽にご連絡ください。',
        ko: '필요한 모든 것이 여기 있습니다. 들어오는 방법, 집을 쓰는 방법, 그리고 근처에서 가볼 만한 곳까지. 사용하시는 언어로 표시되며 설치할 앱도 없습니다. 궁금한 점은 언제든 메시지 주세요.',
    },
    actionLabel: {
        es: 'Escribir a {{host_name}}', en: 'Message {{host_name}}', fr: 'Écrire à {{host_name}}',
        de: '{{host_name}} schreiben', it: 'Scrivi a {{host_name}}', pt: 'Escrever a {{host_name}}',
        ca: 'Escriure a {{host_name}}', ar: 'مراسلة {{host_name}}', ru: 'Написать {{host_name}}',
        uk: 'Написати {{host_name}}', zh: '联系 {{host_name}}', ja: '{{host_name}}に連絡する', ko: '{{host_name}}에게 메시지',
    },
};
