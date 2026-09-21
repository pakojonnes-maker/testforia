/**
 * Copy de interfaz de la pantalla TV, en los 13 idiomas activos (CLAUDE.md §5).
 *
 * El CONTENIDO (nombres, descripciones, apartados de la casa) ya llega traducido
 * del backend; esto es sólo el texto propio de la app. Hasta sep-2026 casi todo
 * iba en español fijo y en coreano la portada salía mitad 한국어, mitad
 * "Dónde comer" / "WiFi de la casa".
 *
 * `Translations` exige los 13 idiomas: una cadena nueva a la que le falte uno
 * no compila, en vez de colarse en español en producción.
 *
 * Donde `apps/guide/src/lib/i18n.ts` ya dice lo mismo se reutiliza su texto
 * (Tienda, Guías Rápidas, Red/Contraseña…), para que el móvil y la tele no
 * llamen de dos formas a la misma cosa. `rules` es el `name` de la categoría
 * 'rules' de `migrations/0083_guide_info_categories.sql`.
 *
 * Ojo con el ANCHO: la tesela del WiFi mide ~300 px útiles, así que `wifi_key`
 * es a propósito más corto que `wifi_password` (pantalla completa).
 */

export type TvLang = 'es' | 'en' | 'fr' | 'de' | 'it' | 'pt' | 'ca' | 'ar' | 'ru' | 'uk' | 'zh' | 'ja' | 'ko'
export type Translations = Record<TvLang, string>

const TV_STRINGS = {
  // ---- Inicio (mosaico) ----
  rules: {
    es: 'Normas de la casa', en: 'House Rules', fr: 'Règlement intérieur', de: 'Hausordnung',
    it: 'Regole della casa', pt: 'Regras da casa', ca: 'Normes de la casa', ar: 'قواعد المنزل',
    ru: 'Правила дома', uk: 'Правила дому', zh: '房屋守则', ja: 'ハウスルール', ko: '하우스 룰',
  },
  quick_guides: {
    es: 'Guías Rápidas', en: 'Quick Guides', fr: 'Guides rapides', de: 'Kurzanleitungen',
    it: 'Guide rapide', pt: 'Guias rápidos', ca: 'Guies ràpides', ar: 'أدلة سريعة',
    ru: 'Краткие инструкции', uk: 'Короткі інструкції', zh: '快速指南', ja: 'クイックガイド', ko: '빠른 안내',
  },
  store_title: {
    es: 'Tienda', en: 'Store', fr: 'Boutique', de: 'Shop', it: 'Negozio', pt: 'Loja',
    ca: 'Botiga', ar: 'المتجر', ru: 'Магазин', uk: 'Магазин', zh: '商店', ja: 'ストア', ko: '스토어',
  },
  where_to_eat: {
    es: 'Dónde comer', en: 'Where to eat', fr: 'Où manger', de: 'Essen gehen',
    it: 'Dove mangiare', pt: 'Onde comer', ca: 'On menjar', ar: 'أين تأكل',
    ru: 'Где поесть', uk: 'Де поїсти', zh: '美食推荐', ja: 'グルメ', ko: '주변 맛집',
  },
  // Tesela del inicio. Dentro, la sección se titula `experiences`.
  things_to_do: {
    es: 'Qué hacer', en: 'Things to do', fr: 'Que faire', de: 'Unternehmungen',
    it: 'Cosa fare', pt: 'O que fazer', ca: 'Què fer', ar: 'ماذا تفعل',
    ru: 'Чем заняться', uk: 'Чим зайнятися', zh: '玩乐', ja: '観光・体験', ko: '즐길 거리',
  },
  experiences: {
    es: 'Experiencias', en: 'Experiences', fr: 'Expériences', de: 'Erlebnisse',
    it: 'Esperienze', pt: 'Experiências', ca: 'Experiències', ar: 'التجارب',
    ru: 'Впечатления', uk: 'Враження', zh: '体验', ja: '体験', ko: '체험',
  },
  language: {
    es: 'Idioma', en: 'Language', fr: 'Langue', de: 'Sprache', it: 'Lingua', pt: 'Idioma',
    ca: 'Idioma', ar: 'اللغة', ru: 'Язык', uk: 'Мова', zh: '语言', ja: '言語', ko: '언어',
  },
  your_stay: {
    es: 'Tu estancia', en: 'Your stay', fr: 'Votre séjour', de: 'Dein Aufenthalt',
    it: 'Il tuo soggiorno', pt: 'A sua estadia', ca: 'La teva estada', ar: 'إقامتك',
    ru: 'Ваше пребывание', uk: 'Ваше перебування', zh: '您的住宿', ja: 'ご滞在', ko: '숙박 안내',
  },

  // ---- WiFi (tesela y pantalla) ----
  wifi_title: {
    es: 'WiFi de la casa', en: 'House WiFi', fr: 'WiFi du logement', de: 'WLAN der Unterkunft',
    it: 'Wi-Fi della casa', pt: 'Wi-Fi da casa', ca: 'WiFi de la casa', ar: 'واي فاي المنزل',
    ru: 'Домашний Wi-Fi', uk: 'Домашній Wi-Fi', zh: '住宿 WiFi', ja: '宿のWi-Fi', ko: '숙소 와이파이',
  },
  wifi_tile_hint: {
    es: 'Apunta la cámara del móvil: se conecta solo.',
    en: 'Point your phone camera here to connect automatically.',
    fr: "Visez avec l'appareil photo du téléphone : connexion automatique.",
    de: 'Richte die Handykamera darauf – die Verbindung klappt automatisch.',
    it: 'Inquadra con la fotocamera del telefono: si connette da solo.',
    pt: 'Aponte a câmara do telemóvel: a ligação é automática.',
    ca: 'Apunta la càmera del mòbil: es connecta sol.',
    ar: 'وجّه كاميرا هاتفك نحو الرمز للاتصال تلقائيًا.',
    ru: 'Наведите камеру телефона — Wi-Fi подключится сам.',
    uk: 'Наведіть камеру на код — Wi-Fi підключиться сам.',
    zh: '用手机相机扫一扫即可自动连接。',
    ja: 'スマホのカメラをかざすだけで自動接続します。',
    ko: '휴대폰 카메라로 비추면 자동으로 연결됩니다.',
  },
  wifi_network: {
    es: 'Red', en: 'Network', fr: 'Réseau', de: 'WLAN', it: 'Rete', pt: 'Rede', ca: 'Xarxa',
    ar: 'الشبكة', ru: 'Сеть', uk: 'Мережа', zh: '网络', ja: 'SSID', ko: '네트워크',
  },
  /**
   * Etiqueta CORTA de la tesela; la pantalla completa usa `wifi_password`.
   * Medido: con "Password"/"Passwort" (~150 px) una clave de 12 caracteres ya
   * se partía en dos líneas. "WLAN-Code" y "chiave di rete" son de uso común.
   */
  wifi_key: {
    es: 'Clave', en: 'Key', fr: 'Clé', de: 'Code', it: 'Chiave', pt: 'Senha', ca: 'Clau',
    ar: 'كلمة المرور', ru: 'Пароль', uk: 'Пароль', zh: '密码', ja: 'パスワード', ko: '비밀번호',
  },
  wifi_password: {
    es: 'Contraseña', en: 'Password', fr: 'Mot de passe', de: 'Passwort', it: 'Password',
    pt: 'Senha', ca: 'Contrasenya', ar: 'كلمة المرور', ru: 'Пароль', uk: 'Пароль',
    zh: '密码', ja: 'パスワード', ko: '비밀번호',
  },
  wifi_ask_host: {
    es: 'Consulta los datos del WiFi con tu anfitrión',
    en: 'Ask your host for the WiFi details',
    fr: 'Demandez les identifiants WiFi à votre hôte',
    de: 'Frag deinen Gastgeber nach den WLAN-Daten',
    it: 'Chiedi i dati del Wi-Fi al tuo host',
    pt: 'Peça os dados do Wi-Fi ao seu anfitrião',
    ca: 'Demana les dades del WiFi al teu amfitrió',
    ar: 'اطلب بيانات الواي فاي من مضيفك',
    ru: 'Уточните данные Wi-Fi у хозяина',
    uk: 'Уточніть дані Wi-Fi у господаря',
    zh: '请向房东索取 WiFi 信息',
    ja: 'Wi-Fiの情報はホストにお尋ねください',
    ko: '와이파이 정보는 호스트에게 문의하세요',
  },
  // Sin "a la derecha": en árabe (RTL) el QR queda a la IZQUIERDA del texto.
  wifi_screen_hint: {
    es: 'Apunta la cámara de tu móvil al código QR y te conectarás automáticamente, sin escribir nada.',
    en: "Point your phone's camera at the QR code and you'll connect automatically, without typing anything.",
    fr: "Pointez l'appareil photo de votre téléphone vers le code QR : vous serez connecté automatiquement, sans rien saisir.",
    de: 'Richte die Kamera deines Handys auf den QR-Code und du bist automatisch verbunden – ganz ohne Tippen.',
    it: 'Inquadra il codice QR con la fotocamera del telefono e ti connetterai automaticamente, senza digitare nulla.',
    pt: 'Aponte a câmara do telemóvel para o código QR e ficará ligado automaticamente, sem escrever nada.',
    ca: 'Apunta la càmera del mòbil al codi QR i et connectaràs automàticament, sense escriure res.',
    ar: 'وجّه كاميرا هاتفك نحو رمز QR وسيتم الاتصال تلقائيًا دون الحاجة إلى كتابة أي شيء.',
    ru: 'Наведите камеру телефона на QR-код — подключение произойдёт автоматически, ничего вводить не нужно.',
    uk: 'Наведіть камеру на QR-код — і Wi-Fi підключиться автоматично, нічого вводити не потрібно.',
    zh: '用手机相机扫描二维码，无需输入密码即可自动连接。',
    ja: 'スマホのカメラでQRコードを読み取るだけで、入力なしで自動的に接続されます。',
    ko: '휴대폰 카메라로 QR 코드를 비추면 아무것도 입력하지 않아도 자동으로 연결됩니다.',
  },
  wifi_scan_cta: {
    es: 'Escanea para conectarte', en: 'Scan to connect', fr: 'Scannez pour vous connecter',
    de: 'Scannen und verbinden', it: 'Scansiona per connetterti', pt: 'Digitalize para se ligar',
    ca: 'Escaneja per connectar-te', ar: 'امسح للاتصال', ru: 'Отсканируйте, чтобы подключиться',
    uk: 'Скануйте, щоб підключитися', zh: '扫码连接', ja: 'スキャンして接続', ko: '스캔하여 연결',
  },

  // ---- Colecciones (comer / hacer / tienda) ----
  rail_eat: {
    es: 'Recomendado por tu anfitrión', en: 'Recommended by your host', fr: 'Recommandé par votre hôte',
    de: 'Empfohlen von deinem Gastgeber', it: 'Consigliato dal tuo host', pt: 'Recomendado pelo seu anfitrião',
    ca: 'Recomanat pel teu amfitrió', ar: 'موصى به من مضيفك', ru: 'Рекомендации хозяина',
    uk: 'Рекомендації господаря', zh: '房东推荐', ja: 'ホストのおすすめ', ko: '호스트 추천',
  },
  rail_do: {
    es: 'Reservable desde tu móvil', en: 'Book from your phone', fr: 'Réservable depuis votre téléphone',
    de: 'Direkt per Handy buchbar', it: 'Prenotabile dal telefono', pt: 'Reservável a partir do telemóvel',
    ca: 'Reservable des del mòbil', ar: 'قابل للحجز من هاتفك', ru: 'Можно забронировать с телефона',
    uk: 'Можна забронювати через телефон', zh: '可用手机预订', ja: 'スマホで予約できます', ko: '휴대폰으로 예약 가능',
  },
  rail_store: {
    es: 'Disponible durante tu estancia', en: 'Available during your stay', fr: 'Disponible pendant votre séjour',
    de: 'Während deines Aufenthalts verfügbar', it: 'Disponibile durante il soggiorno',
    pt: 'Disponível durante a sua estadia', ca: 'Disponible durant la teva estada', ar: 'متاح طوال إقامتك',
    ru: 'Доступно во время проживания', uk: 'Доступно під час перебування', zh: '住宿期间可订购',
    ja: 'ご滞在中にご利用いただけます', ko: '숙박 기간 중 이용 가능',
  },
  featured_row: {
    es: 'Destacados', en: 'Featured', fr: 'Coups de cœur', de: 'Highlights', it: 'In evidenza',
    pt: 'Destaques', ca: 'Destacats', ar: 'مختارات مميزة', ru: 'Рекомендуем', uk: 'Рекомендуємо',
    zh: '精选推荐', ja: 'おすすめ', ko: '추천',
  },
  featured_badge: {
    es: 'Destacado', en: 'Featured', fr: 'Coup de cœur', de: 'Highlight', it: 'In evidenza',
    pt: 'Destaque', ca: 'Destacat', ar: 'مميز', ru: 'Рекомендуем', uk: 'Рекомендуємо',
    zh: '精选', ja: 'おすすめ', ko: '추천',
  },
  sold_out_badge: {
    es: 'Agotado', en: 'Sold out', fr: 'Épuisé', de: 'Ausverkauft', it: 'Esaurito', pt: 'Esgotado',
    ca: 'Exhaurit', ar: 'نفدت الكمية', ru: 'Нет в наличии', uk: 'Немає в наявності',
    zh: '已售罄', ja: '売り切れ', ko: '품절',
  },
  collection_empty: {
    es: 'Tu anfitrión aún no ha añadido recomendaciones en esta sección.',
    en: "Your host hasn't added any recommendations to this section yet.",
    fr: "Votre hôte n'a pas encore ajouté de recommandations dans cette section.",
    de: 'Dein Gastgeber hat in diesem Bereich noch keine Empfehlungen hinzugefügt.',
    it: 'Il tuo host non ha ancora aggiunto consigli in questa sezione.',
    pt: 'O seu anfitrião ainda não adicionou recomendações a esta secção.',
    ca: 'El teu amfitrió encara no ha afegit recomanacions en aquesta secció.',
    ar: 'لم يُضف مضيفك أي توصيات في هذا القسم بعد.',
    ru: 'Хозяин пока не добавил рекомендации в этот раздел.',
    uk: 'Господар ще не додав рекомендацій до цього розділу.',
    zh: '房东尚未在此版块添加推荐。',
    ja: 'ホストはこのセクションにまだおすすめを追加していません。',
    ko: '호스트가 아직 이 섹션에 추천을 추가하지 않았습니다.',
  },

  // ---- Fichas (collections.ts rellena subtítulos, datos y QR) ----
  restaurant: {
    es: 'Restaurante', en: 'Restaurant', fr: 'Restaurant', de: 'Restaurant', it: 'Ristorante',
    pt: 'Restaurante', ca: 'Restaurant', ar: 'مطعم', ru: 'Ресторан', uk: 'Ресторан',
    zh: '餐厅', ja: 'レストラン', ko: '레스토랑',
  },
  experience: {
    es: 'Experiencia', en: 'Experience', fr: 'Expérience', de: 'Erlebnis', it: 'Esperienza',
    pt: 'Experiência', ca: 'Experiència', ar: 'تجربة', ru: 'Впечатление', uk: 'Враження',
    zh: '体验', ja: '体験', ko: '체험',
  },
  host_pick: {
    es: 'Selección del anfitrión', en: "Host's pick", fr: "Sélection de l'hôte", de: 'Tipp vom Gastgeber',
    it: "Scelta dell'host", pt: 'Escolha do anfitrião', ca: "Selecció de l'amfitrió", ar: 'اختيار المضيف',
    ru: 'Выбор хозяина', uk: 'Вибір господаря', zh: '房东精选', ja: 'ホストのおすすめ', ko: '호스트 추천',
  },
  qr_menu: {
    es: 'Escanea para ver la carta completa en tu móvil',
    en: 'Scan to see the full menu on your phone',
    fr: 'Scannez pour voir la carte complète sur votre téléphone',
    de: 'Scannen und die ganze Speisekarte auf dem Handy ansehen',
    it: 'Scansiona per vedere il menù completo sul telefono',
    pt: 'Digitalize para ver o menu completo no telemóvel',
    ca: 'Escaneja per veure la carta completa al mòbil',
    ar: 'امسح لعرض القائمة كاملة على هاتفك',
    ru: 'Отсканируйте, чтобы открыть всё меню на телефоне',
    uk: 'Відскануйте, щоб відкрити все меню на телефоні',
    zh: '扫码在手机上查看完整菜单',
    ja: 'スキャンするとスマホでメニューをすべて見られます',
    ko: '스캔하면 휴대폰에서 전체 메뉴를 볼 수 있습니다',
  },
  qr_book_whatsapp: {
    es: 'Escanea para reservar por WhatsApp', en: 'Scan to book via WhatsApp',
    fr: 'Scannez pour réserver par WhatsApp', de: 'Scannen und per WhatsApp buchen',
    it: 'Scansiona per prenotare via WhatsApp', pt: 'Digitalize para reservar por WhatsApp',
    ca: 'Escaneja per reservar per WhatsApp', ar: 'امسح للحجز عبر واتساب',
    ru: 'Отсканируйте, чтобы забронировать через WhatsApp', uk: 'Відскануйте, щоб забронювати через WhatsApp',
    zh: '扫码通过 WhatsApp 预订', ja: 'スキャンしてWhatsAppで予約', ko: '스캔하여 WhatsApp으로 예약',
  },
  qr_book_online: {
    es: 'Escanea para reservar en tu móvil', en: 'Scan to book on your phone',
    fr: 'Scannez pour réserver sur votre téléphone', de: 'Scannen und auf dem Handy buchen',
    it: 'Scansiona per prenotare dal telefono', pt: 'Digitalize para reservar no telemóvel',
    ca: 'Escaneja per reservar al mòbil', ar: 'امسح للحجز من هاتفك',
    ru: 'Отсканируйте, чтобы забронировать на телефоне', uk: 'Відскануйте, щоб забронювати на телефоні',
    zh: '扫码用手机预订', ja: 'スキャンしてスマホで予約', ko: '스캔하여 휴대폰으로 예약',
  },
  qr_book_call: {
    es: 'Escanea para llamar y reservar', en: 'Scan to call and book',
    fr: 'Scannez pour appeler et réserver', de: 'Scannen, anrufen und buchen',
    it: 'Scansiona per chiamare e prenotare', pt: 'Digitalize para ligar e reservar',
    ca: 'Escaneja per trucar i reservar', ar: 'امسح للاتصال والحجز',
    ru: 'Отсканируйте, чтобы позвонить и забронировать', uk: 'Відскануйте, щоб зателефонувати й забронювати',
    zh: '扫码致电预订', ja: 'スキャンして電話で予約', ko: '스캔하여 전화로 예약',
  },

  // ---- Detalle de una ficha ----
  travel_walk: {
    es: 'A pie', en: 'On foot', fr: 'À pied', de: 'Zu Fuß', it: 'A piedi', pt: 'A pé', ca: 'A peu',
    ar: 'سيرًا على الأقدام', ru: 'Пешком', uk: 'Пішки', zh: '步行', ja: '徒歩', ko: '도보',
  },
  travel_bike: {
    es: 'En bici', en: 'By bike', fr: 'À vélo', de: 'Mit dem Rad', it: 'In bici', pt: 'De bicicleta',
    ca: 'En bici', ar: 'بالدراجة', ru: 'На велосипеде', uk: 'Велосипедом', zh: '骑行', ja: '自転車', ko: '자전거',
  },
  travel_drive: {
    es: 'En coche', en: 'By car', fr: 'En voiture', de: 'Mit dem Auto', it: 'In auto', pt: 'De carro',
    ca: 'En cotxe', ar: 'بالسيارة', ru: 'На машине', uk: 'Автомобілем', zh: '驾车', ja: '車', ko: '자동차',
  },
  contact_details: {
    es: 'Datos de contacto', en: 'Contact details', fr: 'Coordonnées', de: 'Kontakt', it: 'Contatti',
    pt: 'Contactos', ca: 'Dades de contacte', ar: 'معلومات الاتصال', ru: 'Контакты', uk: 'Контакти',
    zh: '联系方式', ja: '連絡先', ko: '연락처',
  },
  getting_there: {
    es: 'Distancia y cómo llegar', en: 'Distance & directions', fr: 'Distance et itinéraire',
    de: 'Entfernung & Anfahrt', it: 'Distanza e come arrivare', pt: 'Distância e como chegar',
    ca: 'Distància i com arribar-hi', ar: 'المسافة وكيفية الوصول', ru: 'Расстояние и как добраться',
    uk: 'Відстань і як дістатися', zh: '距离与交通', ja: '距離とアクセス', ko: '거리 및 가는 길',
  },
  detail_no_description: {
    es: 'Una recomendación de tu anfitrión para esta estancia.',
    en: 'A recommendation from your host for this stay.',
    fr: 'Une recommandation de votre hôte pour ce séjour.',
    de: 'Eine Empfehlung deines Gastgebers für diesen Aufenthalt.',
    it: 'Un consiglio del tuo host per questo soggiorno.',
    pt: 'Uma recomendação do seu anfitrião para esta estadia.',
    ca: 'Una recomanació del teu amfitrió per a aquesta estada.',
    ar: 'توصية من مضيفك لهذه الإقامة.',
    ru: 'Рекомендация хозяина для вашего пребывания.',
    uk: 'Рекомендація господаря для вашого перебування.',
    zh: '房东为您本次住宿推荐。',
    ja: 'ホストからのおすすめです。',
    ko: '호스트가 이번 숙박을 위해 추천합니다.',
  },
  ask_host_booking: {
    es: 'Pregunta a tu anfitrión para reservar o pedir indicaciones.',
    en: 'Ask your host to book or to get directions.',
    fr: 'Demandez à votre hôte pour réserver ou obtenir un itinéraire.',
    de: 'Frag deinen Gastgeber nach einer Buchung oder dem Weg.',
    it: 'Chiedi al tuo host per prenotare o avere indicazioni.',
    pt: 'Fale com o seu anfitrião para reservar ou pedir indicações.',
    ca: 'Pregunta al teu amfitrió per reservar o demanar indicacions.',
    ar: 'اسأل مضيفك للحجز أو لمعرفة الطريق.',
    ru: 'Чтобы забронировать или узнать дорогу, обратитесь к хозяину.',
    uk: 'Щоб забронювати або дізнатися дорогу, зверніться до господаря.',
    zh: '如需预订或问路，请联系房东。',
    ja: '予約や行き方はホストにお尋ねください。',
    ko: '예약이나 길 안내는 호스트에게 문의하세요.',
  },
  // Identificar la publicidad es obligatorio (Directiva 2005/29/CE, anexo I.11):
  // tiene que entenderse en el idioma del huésped, no sólo en español.
  sponsored: {
    es: 'Publicidad · tu anfitrión puede recibir una comisión',
    en: 'Ad · your host may receive a commission',
    fr: 'Publicité · votre hôte peut percevoir une commission',
    de: 'Anzeige · dein Gastgeber kann eine Provision erhalten',
    it: 'Pubblicità · il tuo host potrebbe ricevere una commissione',
    pt: 'Publicidade · o seu anfitrião pode receber uma comissão',
    ca: 'Publicitat · el teu amfitrió pot rebre una comissió',
    ar: 'إعلان · قد يحصل مضيفك على عمولة',
    ru: 'Реклама · хозяин может получать комиссию',
    uk: 'Реклама · господар може отримувати комісію',
    zh: '广告 · 房东可能获得佣金',
    ja: '広告 · ホストが手数料を受け取る場合があります',
    ko: '광고 · 호스트가 수수료를 받을 수 있습니다',
  },

  // ---- Pedido de la tienda ----
  order_whatsapp: {
    es: 'Pedir por WhatsApp', en: 'Order via WhatsApp', fr: 'Commander par WhatsApp',
    de: 'Per WhatsApp bestellen', it: 'Ordina via WhatsApp', pt: 'Encomendar por WhatsApp',
    ca: 'Demanar per WhatsApp', ar: 'اطلب عبر واتساب', ru: 'Заказать в WhatsApp',
    uk: 'Замовити у WhatsApp', zh: '通过 WhatsApp 下单', ja: 'WhatsAppで注文', ko: 'WhatsApp으로 주문',
  },
  order_loading: {
    es: 'Generando pedido…', en: 'Creating order…', fr: 'Création de la commande…',
    de: 'Bestellung wird erstellt…', it: "Creazione dell'ordine…", pt: 'A criar o pedido…',
    ca: 'Generant la comanda…', ar: 'جارٍ إنشاء الطلب…', ru: 'Оформляем заказ…',
    uk: 'Оформлюємо замовлення…', zh: '正在生成订单…', ja: '注文を作成中…', ko: '주문 생성 중…',
  },
  order_qr: {
    es: 'Escanea para confirmar tu pedido por WhatsApp',
    en: 'Scan to confirm your order via WhatsApp',
    fr: 'Scannez pour confirmer votre commande par WhatsApp',
    de: 'Scannen und die Bestellung per WhatsApp bestätigen',
    it: "Scansiona per confermare l'ordine via WhatsApp",
    pt: 'Digitalize para confirmar o pedido por WhatsApp',
    ca: 'Escaneja per confirmar la comanda per WhatsApp',
    ar: 'امسح لتأكيد طلبك عبر واتساب',
    ru: 'Отсканируйте, чтобы подтвердить заказ в WhatsApp',
    uk: 'Відскануйте, щоб підтвердити замовлення у WhatsApp',
    zh: '扫码通过 WhatsApp 确认订单',
    ja: 'スキャンしてWhatsAppで注文を確定',
    ko: '스캔하여 WhatsApp으로 주문 확정',
  },
  order_no_contact: {
    es: 'Pregunta a tu anfitrión para pedir este producto.',
    en: 'Ask your host to order this product.',
    fr: 'Demandez à votre hôte pour commander ce produit.',
    de: 'Frag deinen Gastgeber, um dieses Produkt zu bestellen.',
    it: 'Chiedi al tuo host per ordinare questo prodotto.',
    pt: 'Fale com o seu anfitrião para encomendar este produto.',
    ca: 'Pregunta al teu amfitrió per demanar aquest producte.',
    ar: 'اسأل مضيفك لطلب هذا المنتج.',
    ru: 'Чтобы заказать этот товар, обратитесь к хозяину.',
    uk: 'Щоб замовити цей товар, зверніться до господаря.',
    zh: '如需订购此商品，请联系房东。',
    ja: 'この商品のご注文はホストにお尋ねください。',
    ko: '이 상품을 주문하려면 호스트에게 문의하세요.',
  },
  order_error: {
    es: 'No se ha podido generar el pedido.', en: "The order couldn't be created.",
    fr: "La commande n'a pas pu être créée.", de: 'Die Bestellung konnte nicht erstellt werden.',
    it: "Non è stato possibile creare l'ordine.", pt: 'Não foi possível criar o pedido.',
    ca: "No s'ha pogut generar la comanda.", ar: 'تعذّر إنشاء الطلب.', ru: 'Не удалось оформить заказ.',
    uk: 'Не вдалося оформити замовлення.', zh: '订单生成失败。', ja: '注文を作成できませんでした。',
    ko: '주문을 생성할 수 없습니다.',
  },
  order_retry: {
    es: 'Reintentar', en: 'Retry', fr: 'Réessayer', de: 'Erneut versuchen', it: 'Riprova',
    pt: 'Tentar novamente', ca: 'Torna-ho a provar', ar: 'إعادة المحاولة', ru: 'Повторить',
    uk: 'Повторити', zh: '重试', ja: '再試行', ko: '다시 시도',
  },
  sold_out_detail: {
    es: 'Producto agotado por ahora.', en: 'This product is sold out for now.',
    fr: 'Produit épuisé pour le moment.', de: 'Dieses Produkt ist derzeit ausverkauft.',
    it: 'Prodotto esaurito al momento.', pt: 'Produto esgotado de momento.',
    ca: 'Producte exhaurit de moment.', ar: 'هذا المنتج غير متوفر حاليًا.',
    ru: 'Этого товара пока нет в наличии.', uk: 'Цього товару поки немає в наявності.',
    zh: '该商品暂时售罄。', ja: 'この商品は現在売り切れです。', ko: '현재 품절된 상품입니다.',
  },

  // ---- Guías Rápidas: ficha de un apartado ----
  house_info: {
    es: 'Información de la casa', en: 'House information', fr: 'Infos du logement',
    de: 'Infos zur Unterkunft', it: 'Informazioni sulla casa', pt: 'Informações da casa',
    ca: 'Informació de la casa', ar: 'معلومات المنزل', ru: 'Информация о жилье',
    uk: 'Інформація про житло', zh: '房屋信息', ja: '宿のご案内', ko: '숙소 정보',
  },
  info_no_content: {
    es: 'Tu anfitrión aún no ha añadido detalles para este apartado.',
    en: "Your host hasn't added details for this section yet.",
    fr: "Votre hôte n'a pas encore ajouté de détails pour cette rubrique.",
    de: 'Dein Gastgeber hat für diesen Punkt noch keine Details hinzugefügt.',
    it: 'Il tuo host non ha ancora aggiunto dettagli per questa voce.',
    pt: 'O seu anfitrião ainda não adicionou detalhes a este tema.',
    ca: 'El teu amfitrió encara no ha afegit detalls en aquest apartat.',
    ar: 'لم يُضف مضيفك تفاصيل لهذا البند بعد.',
    ru: 'Хозяин пока не добавил подробности в этот пункт.',
    uk: 'Господар ще не додав подробиць до цього пункту.',
    zh: '房东尚未为此项添加详细信息。',
    ja: 'ホストはこの項目の詳細をまだ追加していません。',
    ko: '호스트가 아직 이 항목의 세부 정보를 추가하지 않았습니다.',
  },

  // ---- Selector de idioma ----
  choose_language: {
    es: 'Elige tu idioma', en: 'Choose your language', fr: 'Choisissez votre langue',
    de: 'Wähle deine Sprache', it: 'Scegli la tua lingua', pt: 'Escolha o seu idioma',
    ca: 'Tria el teu idioma', ar: 'اختر لغتك', ru: 'Выберите язык', uk: 'Оберіть мову',
    zh: '选择语言', ja: '言語を選択', ko: '언어 선택',
  },
  language_hint: {
    es: 'Toda la pantalla, incluidas las recomendaciones y las normas de la casa.',
    en: 'The whole screen, including recommendations and house rules.',
    fr: "Tout l'écran, y compris les recommandations et le règlement intérieur.",
    de: 'Der ganze Bildschirm, auch Empfehlungen und Hausordnung.',
    it: 'Tutto lo schermo, compresi i consigli e le regole della casa.',
    pt: 'Todo o ecrã, incluindo as recomendações e as regras da casa.',
    ca: 'Tota la pantalla, incloses les recomanacions i les normes de la casa.',
    ar: 'الشاشة بأكملها، بما في ذلك التوصيات وقواعد المنزل.',
    ru: 'Весь экран, включая рекомендации и правила дома.',
    uk: 'Увесь екран, включно з рекомендаціями та правилами дому.',
    zh: '整个屏幕都会切换，包括推荐内容和房屋守则。',
    ja: 'おすすめやハウスルールを含め、画面全体が切り替わります。',
    ko: '추천 정보와 하우스 룰을 포함해 화면 전체에 적용됩니다.',
  },

  // ---- Navegación y estados ----
  back: {
    es: 'Volver', en: 'Back', fr: 'Retour', de: 'Zurück', it: 'Indietro', pt: 'Voltar', ca: 'Tornar',
    ar: 'رجوع', ru: 'Назад', uk: 'Назад', zh: '返回', ja: '戻る', ko: '뒤로',
  },
  back_home: {
    es: 'Volver al inicio', en: 'Back to home', fr: "Retour à l'accueil", de: 'Zurück zum Start',
    it: "Torna all'inizio", pt: 'Voltar ao início', ca: "Tornar a l'inici", ar: 'العودة إلى الرئيسية',
    ru: 'На главную', uk: 'На головну', zh: '返回首页', ja: 'ホームに戻る', ko: '홈으로',
  },
  loading: {
    es: 'Cargando…', en: 'Loading…', fr: 'Chargement…', de: 'Wird geladen…', it: 'Caricamento…',
    pt: 'A carregar…', ca: 'Carregant…', ar: 'جارٍ التحميل…', ru: 'Загрузка…', uk: 'Завантаження…',
    zh: '加载中…', ja: '読み込み中…', ko: '불러오는 중…',
  },
  section_unavailable: {
    es: 'Sección no disponible', en: 'Section not available', fr: 'Section indisponible',
    de: 'Bereich nicht verfügbar', it: 'Sezione non disponibile', pt: 'Secção indisponível',
    ca: 'Secció no disponible', ar: 'القسم غير متاح', ru: 'Раздел недоступен', uk: 'Розділ недоступний',
    zh: '此版块暂不可用', ja: 'このセクションは利用できません', ko: '이 섹션을 사용할 수 없습니다',
  },
  entry_unavailable: {
    es: 'Ficha no disponible', en: 'Details not available', fr: 'Fiche indisponible',
    de: 'Eintrag nicht verfügbar', it: 'Scheda non disponibile', pt: 'Ficha indisponível',
    ca: 'Fitxa no disponible', ar: 'التفاصيل غير متاحة', ru: 'Карточка недоступна', uk: 'Картка недоступна',
    zh: '内容暂不可用', ja: 'この項目は表示できません', ko: '항목을 표시할 수 없습니다',
  },
  info_unavailable: {
    es: 'Apartado no disponible', en: 'Item not available', fr: 'Rubrique indisponible',
    de: 'Punkt nicht verfügbar', it: 'Voce non disponibile', pt: 'Tema indisponível',
    ca: 'Apartat no disponible', ar: 'هذا البند غير متاح', ru: 'Пункт недоступен', uk: 'Пункт недоступний',
    zh: '该项暂不可用', ja: 'この情報は表示できません', ko: '정보를 표시할 수 없습니다',
  },
  // Lo lee el instalador delante de la tele, pero sale en pantalla: se traduce.
  demo_data: {
    es: 'Datos de ejemplo', en: 'Sample data', fr: "Données d'exemple", de: 'Beispieldaten',
    it: 'Dati di esempio', pt: 'Dados de exemplo', ca: "Dades d'exemple", ar: 'بيانات تجريبية',
    ru: 'Демо-данные', uk: 'Демо-дані', zh: '示例数据', ja: 'サンプルデータ', ko: '샘플 데이터',
  },
} satisfies Record<string, Translations>

export type TvStringKey = keyof typeof TV_STRINGS

/** Cadena de interfaz en `lang`; inglés si el idioma no es uno de los 13 (CLAUDE.md §5). */
export function getTvString(key: TvStringKey, lang: string): string {
  return pick(TV_STRINGS[key], lang)
}

/** Resuelve un bloque de 13 idiomas con el mismo criterio de respaldo. */
export function pick(entry: Translations, lang: string): string {
  return entry[lang.toLowerCase() as TvLang] ?? entry.en
}
