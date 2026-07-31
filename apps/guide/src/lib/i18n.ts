// UI strings for the guest-facing guidebook.
// Dynamic content (apartment info, POIs, experiences, zone descriptions) is translated
// server-side via the `translations` table (see workerGuide.js) — this file only covers
// static interface copy (buttons, headings, empty states, chat assistant, etc).
//
// 13 active languages (see CLAUDE.md §5): es (source of truth), en, fr, de, it, pt, ca,
// ar, ru, uk, zh, ja, ko. Keep ACTIVE_LANGUAGES below in sync with workerGuideAdmin.js.
export const ACTIVE_LANGUAGES = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'ar', 'ru', 'uk', 'zh', 'ja', 'ko'];

// Languages that must render right-to-left. Only `ar` today, but keep this a list
// (not a single check) since guidebooks add languages fairly often (see CLAUDE.md §5).
export const RTL_LANGUAGES = ['ar'];
export const isRtl = (lang: string) => RTL_LANGUAGES.includes(lang);

export const UI_STRINGS: Record<string, Record<string, string>> = {
  // Navigation tabs (Header nav + BottomNavBar)
  tab_info: { es: 'Casa', en: 'Home', fr: 'Accueil', de: 'Zuhause', it: 'Casa', pt: 'Casa', ca: 'Casa', ar: 'الرئيسية', ru: 'Главная', uk: 'Головна', zh: '首页', ja: 'ホーム', ko: '홈' },
  tab_discover: { es: 'Ubicaciones', en: 'Locations', fr: 'Lieux', de: 'Orte', it: 'Luoghi', pt: 'Locais', ca: 'Ubicacions', ar: 'المواقع', ru: 'Места', uk: 'Місця', zh: '地点', ja: '場所', ko: '위치' },
  tab_services: { es: 'Tienda', en: 'Store', fr: 'Boutique', de: 'Shop', it: 'Negozio', pt: 'Loja', ca: 'Botiga', ar: 'المتجر', ru: 'Магазин', uk: 'Магазин', zh: '商店', ja: 'ストア', ko: '스토어' },
  tab_restaurants: { es: 'Restaurantes', en: 'Restaurants', fr: 'Restaurants', de: 'Restaurants', it: 'Ristoranti', pt: 'Restaurantes', ca: 'Restaurants', ar: 'المطاعم', ru: 'Рестораны', uk: 'Ресторани', zh: '餐厅', ja: 'レストラン', ko: '레스토랑' },
  tab_chat: { es: 'Chat IA', en: 'AI Chat', fr: 'Chat IA', de: 'KI-Chat', it: 'Chat IA', pt: 'Chat IA', ca: 'Xat IA', ar: 'محادثة الذكاء الاصطناعي', ru: 'ИИ-чат', uk: 'ІІ-чат', zh: 'AI 聊天', ja: 'AIチャット', ko: 'AI 채팅' },

  // WelcomeHero
  view_address: { es: 'Ver Dirección', en: 'View Address', fr: "Voir l'adresse", de: 'Adresse ansehen', it: 'Vedi indirizzo', pt: 'Ver morada', ca: 'Veure adreça', ar: 'عرض العنوان', ru: 'Показать адрес', uk: 'Показати адресу', zh: '查看地址', ja: '住所を見る', ko: '주소 보기' },

  // InfoSection
  door_code_title: { es: 'Código de Entrada', en: 'Entry Code', fr: "Code d'accès", de: 'Zugangscode', it: "Codice d'ingresso", pt: 'Código de entrada', ca: "Codi d'entrada", ar: 'رمز الدخول', ru: 'Код входа', uk: 'Код входу', zh: '门禁密码', ja: '入口コード', ko: '출입 코드' },
  quick_guides: { es: 'Guías Rápidas', en: 'Quick Guides', fr: 'Guides rapides', de: 'Kurzanleitungen', it: 'Guide rapide', pt: 'Guias rápidos', ca: 'Guies ràpides', ar: 'أدلة سريعة', ru: 'Краткие инструкции', uk: 'Короткі інструкції', zh: '快速指南', ja: 'クイックガイド', ko: '빠른 안내' },
  connectivity: { es: 'Conectividad', en: 'Connectivity', fr: 'Connectivité', de: 'Konnektivität', it: 'Connettività', pt: 'Conectividade', ca: 'Connectivitat', ar: 'الاتصال', ru: 'Подключение', uk: 'Підключення', zh: '网络连接', ja: '接続', ko: '연결' },
  network_password_label: { es: 'Red / Contraseña', en: 'Network / Password', fr: 'Réseau / Mot de passe', de: 'Netzwerk / Passwort', it: 'Rete / Password', pt: 'Rede / Senha', ca: 'Xarxa / Contrasenya', ar: 'الشبكة / كلمة المرور', ru: 'Сеть / Пароль', uk: 'Мережа / Пароль', zh: '网络 / 密码', ja: 'ネットワーク／パスワード', ko: '네트워크 / 비밀번호' },

  // DiscoverSection — {zone} placeholder is replaced via .replace('{zone}', ...)
  discover_title: { es: 'Descubre {zone}', en: 'Discover {zone}', fr: 'Découvrez {zone}', de: 'Entdecke {zone}', it: 'Scopri {zone}', pt: 'Descubra {zone}', ca: 'Descobreix {zone}', ar: 'اكتشف {zone}', ru: 'Откройте для себя {zone}', uk: 'Відкрийте для себе {zone}', zh: '探索{zone}', ja: '{zone}を探索', ko: '{zone} 둘러보기' },
  surroundings_fallback: { es: 'los Alrededores', en: 'the Surroundings', fr: 'les environs', de: 'die Umgebung', it: 'i dintorni', pt: 'os arredores', ca: 'els voltants', ar: 'المناطق المحيطة', ru: 'окрестности', uk: 'околиці', zh: '周边地区', ja: '周辺エリア', ko: '주변 지역' },
  discover_default_description: {
    es: 'Explora nuestra cuidada selección de lugares cercanos para disfrutar al máximo de tu estancia.',
    en: 'Explore our curated selection of nearby places to make the most of your stay.',
    fr: 'Découvrez notre sélection de lieux à proximité pour profiter pleinement de votre séjour.',
    de: 'Entdecke unsere sorgfältig ausgewählten Orte in der Nähe, um das Beste aus deinem Aufenthalt zu machen.',
    it: 'Esplora la nostra selezione curata di luoghi vicini per goderti al massimo il tuo soggiorno.',
    pt: 'Explore a nossa seleção cuidada de locais próximos para aproveitar ao máximo a sua estadia.',
    ca: 'Explora la nostra selecció acurada de llocs propers per gaudir al màxim de la teva estada.',
    ar: 'استكشف مجموعتنا المختارة من الأماكن القريبة للاستمتاع بإقامتك إلى أقصى حد.',
    ru: 'Ознакомьтесь с нашей подборкой ближайших мест, чтобы максимально насладиться пребыванием.',
    uk: 'Ознайомтеся з нашою добіркою найближчих місць, щоб максимально насолодитися перебуванням.',
    zh: '探索我们精心挑选的周边景点，尽享您的住宿时光。',
    ja: '厳選した周辺スポットを巡って、滞在を存分にお楽しみください。',
    ko: '엄선된 주변 명소를 둘러보고 머무는 동안 최고의 시간을 보내세요.',
  },
  cuisine_label: { es: 'Cocina {cuisine}', en: '{cuisine} Cuisine', fr: 'Cuisine {cuisine}', de: '{cuisine} Küche', it: 'Cucina {cuisine}', pt: 'Cozinha {cuisine}', ca: 'Cuina {cuisine}', ar: 'مطبخ {cuisine}', ru: '{cuisine} кухня', uk: '{cuisine} кухня', zh: '{cuisine}菜', ja: '{cuisine}料理', ko: '{cuisine} 요리' },
  category_restaurants: { es: 'Restaurantes', en: 'Restaurants', fr: 'Restaurants', de: 'Restaurants', it: 'Ristoranti', pt: 'Restaurantes', ca: 'Restaurants', ar: 'المطاعم', ru: 'Рестораны', uk: 'Ресторани', zh: '餐厅', ja: 'レストラン', ko: '레스토랑' },
  premium_badge: { es: 'Premium', en: 'Premium', fr: 'Premium', de: 'Premium', it: 'Premium', pt: 'Premium', ca: 'Premium', ar: 'مميز', ru: 'Премиум', uk: 'Преміум', zh: '尊享', ja: 'プレミアム', ko: '프리미엄' },
  view_menu: { es: 'Ver Menú', en: 'See menu', fr: 'Voir la carte', de: 'Speisekarte', it: 'Vedi menù', pt: 'Ver menu', ca: 'Veure carta', ar: 'عرض القائمة', ru: 'Смотреть меню', uk: 'Переглянути меню', zh: '查看菜单', ja: 'メニューを見る', ko: '메뉴 보기' },
  view_map: { es: 'Ver Mapa', en: 'See Map', fr: 'Voir la carte', de: 'Karte ansehen', it: 'Vedi mappa', pt: 'Ver mapa', ca: 'Veure mapa', ar: 'عرض الخريطة', ru: 'Смотреть карту', uk: 'Переглянути карту', zh: '查看地图', ja: '地図を見る', ko: '지도 보기' },
  view_details: { es: 'Ver detalles', en: 'View details', fr: 'Voir les détails', de: 'Details ansehen', it: 'Vedi dettagli', pt: 'Ver detalhes', ca: 'Veure detalls', ar: 'عرض التفاصيل', ru: 'Подробнее', uk: 'Детальніше', zh: '查看详情', ja: '詳細を見る', ko: '자세히 보기' },
  prefer_map_title: { es: '¿Prefieres ver el mapa?', en: 'Prefer to see the map?', fr: 'Vous préférez voir la carte ?', de: 'Lieber die Karte ansehen?', it: 'Preferisci vedere la mappa?', pt: 'Prefere ver o mapa?', ca: 'Prefereixes veure el mapa?', ar: 'هل تفضل رؤية الخريطة؟', ru: 'Хотите посмотреть карту?', uk: 'Бажаєте переглянути карту?', zh: '想看地图吗？', ja: '地図で見たいですか？', ko: '지도로 보시겠어요?' },
  prefer_map_desc: {
    es: 'Explora todas nuestras recomendaciones geolocalizadas para planificar mejor tu ruta por la zona.',
    en: 'Explore all our geolocated recommendations to better plan your route around the area.',
    fr: 'Explorez toutes nos recommandations géolocalisées pour mieux planifier votre itinéraire dans la région.',
    de: 'Entdecke alle unsere geolokalisierten Empfehlungen, um deine Route in der Umgebung besser zu planen.',
    it: 'Esplora tutti i nostri consigli geolocalizzati per pianificare al meglio il tuo percorso nella zona.',
    pt: 'Explore todas as nossas recomendações geolocalizadas para planear melhor o seu percurso pela zona.',
    ca: 'Explora totes les nostres recomanacions geolocalitzades per planificar millor la teva ruta per la zona.',
    ar: 'استكشف جميع توصياتنا المحددة الموقع لتخطيط مسارك في المنطقة بشكل أفضل.',
    ru: 'Ознакомьтесь со всеми нашими геолокационными рекомендациями, чтобы лучше спланировать маршрут по округе.',
    uk: 'Ознайомтеся з усіма нашими геолокаційними рекомендаціями, щоб краще спланувати маршрут по околиці.',
    zh: '查看我们所有基于位置的推荐，更好地规划您在该地区的路线。',
    ja: '位置情報付きのおすすめスポットをすべて確認して、エリア内のルートを計画しましょう。',
    ko: '위치 기반 추천 장소를 모두 살펴보고 주변 경로를 더 잘 계획해 보세요.',
  },
  open_interactive_map: { es: 'Abrir Mapa Interactivo', en: 'Open Interactive Map', fr: 'Ouvrir la carte interactive', de: 'Interaktive Karte öffnen', it: 'Apri mappa interattiva', pt: 'Abrir mapa interativo', ca: 'Obrir mapa interactiu', ar: 'فتح الخريطة التفاعلية', ru: 'Открыть интерактивную карту', uk: 'Відкрити інтерактивну карту', zh: '打开互动地图', ja: 'インタラクティブマップを開く', ko: '인터랙티브 지도 열기' },
  filter_all: { es: 'Todos', en: 'All', fr: 'Tous', de: 'Alle', it: 'Tutti', pt: 'Todos', ca: 'Tots', ar: 'الكل', ru: 'Все', uk: 'Всі', zh: '全部', ja: 'すべて', ko: '전체' },

  // ServicesSection — {zone} placeholder replaced via .replace('{zone}', ...)
  exclusive_promotions: { es: 'Promociones Exclusivas', en: 'Exclusive Deals', fr: 'Offres exclusives', de: 'Exklusive Angebote', it: 'Offerte esclusive', pt: 'Ofertas exclusivas', ca: 'Promocions exclusives', ar: 'عروض حصرية', ru: 'Эксклюзивные предложения', uk: 'Ексклюзивні пропозиції', zh: '专属优惠', ja: '限定オファー', ko: '독점 혜택' },
  services_subtitle: {
    es: 'Descubre ofertas y actividades seleccionadas especialmente para tu estancia en {zone}.',
    en: 'Discover offers and activities selected especially for your stay in {zone}.',
    fr: 'Découvrez des offres et activités sélectionnées spécialement pour votre séjour à {zone}.',
    de: 'Entdecke Angebote und Aktivitäten, die speziell für deinen Aufenthalt in {zone} ausgewählt wurden.',
    it: 'Scopri offerte e attività selezionate appositamente per il tuo soggiorno a {zone}.',
    pt: 'Descubra ofertas e atividades selecionadas especialmente para a sua estadia em {zone}.',
    ca: 'Descobreix ofertes i activitats seleccionades especialment per a la teva estada a {zone}.',
    ar: 'اكتشف العروض والأنشطة المختارة خصيصًا لإقامتك في {zone}.',
    ru: 'Откройте для себя предложения и мероприятия, подобранные специально для вашего пребывания в {zone}.',
    uk: 'Відкрийте для себе пропозиції та заходи, підібрані спеціально для вашого перебування в {zone}.',
    zh: '发现专为您在{zone}的住宿精心挑选的优惠和活动。',
    ja: '{zone}での滞在のために厳選されたお得な情報やアクティビティをご紹介します。',
    ko: '{zone}에서의 숙박을 위해 엄선된 혜택과 액티비티를 만나보세요.',
  },
  badge_courtesy: { es: 'Cortesía', en: 'Courtesy', fr: 'Offert', de: 'Kulanz', it: 'Cortesia', pt: 'Cortesia', ca: 'Cortesia', ar: 'مجاملة', ru: 'Бесплатно', uk: 'Безкоштовно', zh: '免费赠送', ja: '特典', ko: '무료 제공' },
  badge_exclusive: { es: 'Exclusivo', en: 'Exclusive', fr: 'Exclusif', de: 'Exklusiv', it: 'Esclusivo', pt: 'Exclusivo', ca: 'Exclusiu', ar: 'حصري', ru: 'Эксклюзив', uk: 'Ексклюзив', zh: '独家', ja: '限定', ko: '독점' },
  badge_new: { es: 'Nuevo', en: 'New', fr: 'Nouveau', de: 'Neu', it: 'Nuovo', pt: 'Novo', ca: 'Nou', ar: 'جديد', ru: 'Новинка', uk: 'Новинка', zh: '新品', ja: '新着', ko: '신규' },
  no_services: { es: 'No hay promociones disponibles', en: 'No promotions available', fr: 'Aucune offre disponible', de: 'Keine Angebote verfügbar', it: 'Nessuna offerta disponibile', pt: 'Sem ofertas disponíveis', ca: 'No hi ha promocions disponibles', ar: 'لا توجد عروض متاحة', ru: 'Нет доступных акций', uk: 'Немає доступних акцій', zh: '暂无优惠活动', ja: '現在ご利用いただけるお得情報はありません', ko: '이용 가능한 프로모션이 없습니다' },

  // ChatIASection
  chat_assistant_title: { es: 'Asistente Virtual', en: 'Virtual Assistant', fr: 'Assistant virtuel', de: 'Virtueller Assistent', it: 'Assistente virtuale', pt: 'Assistente virtual', ca: 'Assistent virtual', ar: 'المساعد الافتراضي', ru: 'Виртуальный ассистент', uk: 'Віртуальний асистент', zh: '虚拟助手', ja: 'バーチャルアシスタント', ko: '가상 어시스턴트' },
  chat_assistant_subtitle: {
    es: 'Hola. Estoy aquí para ayudarte a aprovechar al máximo tu estancia.',
    en: "Hi there. I'm here to help you make the most of your stay.",
    fr: 'Bonjour. Je suis là pour vous aider à profiter au maximum de votre séjour.',
    de: 'Hallo. Ich bin hier, um dir zu helfen, das Beste aus deinem Aufenthalt zu machen.',
    it: 'Ciao. Sono qui per aiutarti a goderti al massimo il tuo soggiorno.',
    pt: 'Olá. Estou aqui para o ajudar a aproveitar ao máximo a sua estadia.',
    ca: 'Hola. Sóc aquí per ajudar-te a gaudir al màxim de la teva estada.',
    ar: 'مرحبًا. أنا هنا لمساعدتك على الاستفادة القصوى من إقامتك.',
    ru: 'Привет! Я здесь, чтобы помочь вам максимально насладиться пребыванием.',
    uk: 'Привіт! Я тут, щоб допомогти вам максимально насолодитися перебуванням.',
    zh: '你好，我在这里帮助你充分享受本次住宿。',
    ja: 'こんにちは。滞在を最大限楽しめるようお手伝いします。',
    ko: '안녕하세요. 머무는 동안 최고의 시간을 보낼 수 있도록 도와드릴게요.',
  },
  chat_placeholder: { es: 'Escribe tu mensaje aquí...', en: 'Type your message here...', fr: 'Écrivez votre message ici...', de: 'Schreibe hier deine Nachricht...', it: 'Scrivi qui il tuo messaggio...', pt: 'Escreva a sua mensagem aqui...', ca: 'Escriu el teu missatge aquí...', ar: 'اكتب رسالتك هنا...', ru: 'Введите сообщение...', uk: 'Введіть повідомлення...', zh: '在此输入您的消息...', ja: 'メッセージを入力してください...', ko: '메시지를 입력하세요...' },
  chat_disclaimer: {
    es: 'Asistente con IA · Las respuestas se basan en la información de tu alojamiento',
    en: "AI-powered assistant · Answers are based on your accommodation's information",
    fr: 'Assistant IA · Les réponses sont basées sur les informations de votre logement',
    de: 'KI-gestützter Assistent · Antworten basieren auf den Informationen deiner Unterkunft',
    it: 'Assistente IA · Le risposte si basano sulle informazioni del tuo alloggio',
    pt: 'Assistente com IA · As respostas baseiam-se na informação do seu alojamento',
    ca: "Assistent amb IA · Les respostes es basen en la informació del teu allotjament",
    ar: 'مساعد يعمل بالذكاء الاصطناعي · تعتمد الإجابات على معلومات مكان إقامتك',
    ru: 'ИИ-ассистент · Ответы основаны на информации о вашем жилье',
    uk: 'ІІ-асистент · Відповіді ґрунтуються на інформації про ваше житло',
    zh: 'AI 智能助手 · 回答基于您住宿信息',
    ja: 'AIアシスタント · 回答は宿泊施設の情報に基づいています',
    ko: 'AI 어시스턴트 · 답변은 숙소 정보를 기반으로 합니다',
  },
  chat_loading_demo: {
    es: 'El asistente está cargando los datos del apartamento. Por favor inténtalo de nuevo en un momento.',
    en: 'The assistant is loading the apartment data. Please try again in a moment.',
    fr: "L'assistant charge les données de l'appartement. Veuillez réessayer dans un instant.",
    de: 'Der Assistent lädt die Daten der Unterkunft. Bitte versuche es gleich noch einmal.',
    it: "L'assistente sta caricando i dati dell'appartamento. Riprova tra un momento.",
    pt: 'O assistente está a carregar os dados do apartamento. Tente novamente daqui a pouco.',
    ca: "L'assistent està carregant les dades de l'apartament. Torna-ho a provar d'aquí un moment.",
    ar: 'يقوم المساعد بتحميل بيانات الشقة. يرجى المحاولة مرة أخرى بعد قليل.',
    ru: 'Ассистент загружает данные о квартире. Пожалуйста, повторите попытку через минуту.',
    uk: 'Асистент завантажує дані про квартиру. Будь ласка, спробуйте ще раз за хвилину.',
    zh: '助手正在加载房源数据，请稍后重试。',
    ja: 'アシスタントが物件データを読み込んでいます。少し経ってからもう一度お試しください。',
    ko: '어시스턴트가 숙소 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.',
  },
  chat_connection_error: {
    es: 'Lo siento, no he podido conectar con el asistente. Por favor intenta de nuevo.',
    en: "Sorry, I couldn't connect to the assistant. Please try again.",
    fr: "Désolé, je n'ai pas pu me connecter à l'assistant. Veuillez réessayer.",
    de: 'Entschuldigung, die Verbindung zum Assistenten ist fehlgeschlagen. Bitte versuche es erneut.',
    it: "Spiacenti, non è stato possibile connettersi all'assistente. Riprova.",
    pt: 'Desculpe, não foi possível ligar ao assistente. Tente novamente.',
    ca: "Ho sento, no he pogut connectar amb l'assistent. Torna-ho a provar.",
    ar: 'عذرًا، لم أتمكن من الاتصال بالمساعد. يرجى المحاولة مرة أخرى.',
    ru: 'Извините, не удалось подключиться к ассистенту. Попробуйте ещё раз.',
    uk: 'Вибачте, не вдалося підключитися до асистента. Спробуйте ще раз.',
    zh: '抱歉，无法连接到助手，请重试。',
    ja: '申し訳ありません、アシスタントに接続できませんでした。もう一度お試しください。',
    ko: '죄송합니다. 어시스턴트에 연결할 수 없습니다. 다시 시도해 주세요.',
  },
  chat_rate_limited: {
    es: 'Has enviado muchos mensajes seguidos. Espera unos minutos e inténtalo de nuevo.',
    en: "You've sent a lot of messages in a row. Please wait a few minutes and try again.",
    fr: 'Vous avez envoyé beaucoup de messages à la suite. Attendez quelques minutes et réessayez.',
    de: 'Du hast viele Nachrichten hintereinander gesendet. Bitte warte ein paar Minuten und versuche es erneut.',
    it: 'Hai inviato molti messaggi di seguito. Attendi qualche minuto e riprova.',
    pt: 'Enviou muitas mensagens seguidas. Aguarde uns minutos e tente novamente.',
    ca: 'Has enviat molts missatges seguits. Espera uns minuts i torna-ho a provar.',
    ar: 'لقد أرسلت الكثير من الرسائل المتتالية. يرجى الانتظار بضع دقائق ثم المحاولة مرة أخرى.',
    ru: 'Вы отправили слишком много сообщений подряд. Подождите несколько минут и попробуйте снова.',
    uk: 'Ви надіслали забагато повідомлень поспіль. Зачекайте кілька хвилин і спробуйте ще раз.',
    zh: '您连续发送了太多消息，请稍等几分钟后重试。',
    ja: '短時間に多くのメッセージを送信しました。数分待ってからもう一度お試しください。',
    ko: '짧은 시간에 너무 많은 메시지를 보냈습니다. 몇 분 후 다시 시도해 주세요.',
  },
  chat_unavailable: {
    es: 'El asistente está muy solicitado ahora mismo. Inténtalo más tarde o contacta a tu anfitrión.',
    en: 'The assistant is in high demand right now. Please try again later or contact your host.',
    fr: "L'assistant est très sollicité en ce moment. Réessayez plus tard ou contactez votre hôte.",
    de: 'Der Assistent ist gerade sehr gefragt. Versuche es später erneut oder wende dich an deinen Gastgeber.',
    it: "L'assistente è molto richiesto in questo momento. Riprova più tardi o contatta il tuo host.",
    pt: 'O assistente está muito solicitado agora. Tente mais tarde ou contacte o seu anfitrião.',
    ca: "L'assistent està molt sol·licitat ara mateix. Torna-ho a provar més tard o contacta amb el teu amfitrió.",
    ar: 'المساعد مطلوب بكثرة الآن. حاول مرة أخرى لاحقًا أو تواصل مع مضيفك.',
    ru: 'Ассистент сейчас очень востребован. Попробуйте позже или свяжитесь с хозяином.',
    uk: 'Асистент зараз дуже затребуваний. Спробуйте пізніше або зв\'яжіться з господарем.',
    zh: '助手现在需求量很大，请稍后再试或联系您的房东。',
    ja: 'ただいまアシスタントが混み合っています。しばらくしてから再度お試しいただくか、ホストにお問い合わせください。',
    ko: '지금 어시스턴트 이용이 많습니다. 나중에 다시 시도하거나 호스트에게 문의해 주세요.',
  },

  // MapModal — {count} placeholder replaced via .replace('{count}', ...)
  places_on_map: { es: '{count} lugares en el mapa', en: '{count} places on the map', fr: '{count} lieux sur la carte', de: '{count} Orte auf der Karte', it: '{count} luoghi sulla mappa', pt: '{count} locais no mapa', ca: '{count} llocs al mapa', ar: '{count} أماكن على الخريطة', ru: '{count} мест на карте', uk: '{count} місць на карті', zh: '地图上有{count}个地点', ja: '地図上の{count}件のスポット', ko: '지도에 {count}개 장소' },
  no_coordinates: { es: 'No hay coordenadas disponibles para mostrar el mapa', en: 'No coordinates available to show the map', fr: 'Aucune coordonnée disponible pour afficher la carte', de: 'Keine Koordinaten verfügbar, um die Karte anzuzeigen', it: 'Nessuna coordinata disponibile per mostrare la mappa', pt: 'Sem coordenadas disponíveis para mostrar o mapa', ca: 'No hi ha coordenades disponibles per mostrar el mapa', ar: 'لا توجد إحداثيات متاحة لعرض الخريطة', ru: 'Нет доступных координат для отображения карты', uk: 'Немає доступних координат для показу карти', zh: '暂无可用坐标来显示地图', ja: '地図を表示するための座標がありません', ko: '지도를 표시할 좌표 정보가 없습니다' },
  close: { es: 'Cerrar', en: 'Close', fr: 'Fermer', de: 'Schließen', it: 'Chiudi', pt: 'Fechar', ca: 'Tancar', ar: 'إغلاق', ru: 'Закрыть', uk: 'Закрити', zh: '关闭', ja: '閉じる', ko: '닫기' },

  // GuidebookPage
  guidebook_not_found: { es: 'Guidebook no encontrado', en: 'Guidebook not found', fr: 'Guide introuvable', de: 'Guidebook nicht gefunden', it: 'Guidebook non trovato', pt: 'Guidebook não encontrado', ca: 'Guidebook no trobat', ar: 'لم يتم العثور على الدليل', ru: 'Гид не найден', uk: 'Гід не знайдено', zh: '未找到指南', ja: 'ガイドが見つかりません', ko: '가이드북을 찾을 수 없습니다' },

  // Generic / shared
  wifi_network: { es: 'Red', en: 'Network', fr: 'Réseau', de: 'Netzwerk', it: 'Rete', pt: 'Rede', ca: 'Xarxa', ar: 'الشبكة', ru: 'Сеть', uk: 'Мережа', zh: '网络', ja: 'ネットワーク', ko: '네트워크' },
  wifi_password: { es: 'Contraseña', en: 'Password', fr: 'Mot de passe', de: 'Passwort', it: 'Password', pt: 'Senha', ca: 'Contrasenya', ar: 'كلمة المرور', ru: 'Пароль', uk: 'Пароль', zh: '密码', ja: 'パスワード', ko: '비밀번호' },
  copy_btn: { es: 'Copiar', en: 'Copy', fr: 'Copier', de: 'Kopieren', it: 'Copia', pt: 'Copiar', ca: 'Copiar', ar: 'نسخ', ru: 'Копировать', uk: 'Копіювати', zh: '复制', ja: 'コピー', ko: '복사' },
  copied: { es: '¡Copiado!', en: 'Copied!', fr: 'Copié!', de: 'Kopiert!', it: 'Copiato!', pt: 'Copiado!', ca: 'Copiat!', ar: 'تم النسخ!', ru: 'Скопировано!', uk: 'Скопійовано!', zh: '已复制！', ja: 'コピーしました！', ko: '복사됨!' },
  directions: { es: 'Cómo llegar', en: 'Directions', fr: 'Itinéraire', de: 'Route', it: 'Indicazioni', pt: 'Direções', ca: 'Com arribar', ar: 'الاتجاهات', ru: 'Маршрут', uk: 'Маршрут', zh: '路线', ja: '道順', ko: '길찾기' },
  recommended: { es: 'Recomendado', en: 'Recommended', fr: 'Recommandé', de: 'Empfohlen', it: 'Consigliato', pt: 'Recomendado', ca: 'Recomanat', ar: 'موصى به', ru: 'Рекомендуется', uk: 'Рекомендовано', zh: '推荐', ja: 'おすすめ', ko: '추천' },
  popular: { es: 'Popular', en: 'Popular', fr: 'Populaire', de: 'Beliebt', it: 'Popolare', pt: 'Popular', ca: 'Popular', ar: 'شائع', ru: 'Популярное', uk: 'Популярне', zh: '热门', ja: '人気', ko: '인기' },
  book_whatsapp: { es: 'Reservar por WhatsApp', en: 'Book via WhatsApp', fr: 'Réserver par WhatsApp', de: 'Per WhatsApp buchen', it: 'Prenota via WhatsApp', pt: 'Reservar por WhatsApp', ca: 'Reservar per WhatsApp', ar: 'الحجز عبر واتساب', ru: 'Забронировать через WhatsApp', uk: 'Забронювати через WhatsApp', zh: '通过WhatsApp预订', ja: 'WhatsAppで予約', ko: '왓츠앱으로 예약' },
  book_online: { es: 'Reservar online', en: 'Book online', fr: 'Réserver en ligne', de: 'Online buchen', it: 'Prenota online', pt: 'Reservar online', ca: 'Reservar en línia', ar: 'الحجز عبر الإنترنت', ru: 'Забронировать онлайн', uk: 'Забронювати онлайн', zh: '在线预订', ja: 'オンライン予約', ko: '온라인 예약' },
  call_now: { es: 'Llamar ahora', en: 'Call now', fr: 'Appeler', de: 'Jetzt anrufen', it: 'Chiama ora', pt: 'Ligar agora', ca: 'Trucar ara', ar: 'اتصل الآن', ru: 'Позвонить', uk: 'Зателефонувати', zh: '立即致电', ja: '今すぐ電話', ko: '지금 전화하기' },
  explore_zone: { es: 'Explora', en: 'Explore', fr: 'Explorer', de: 'Erkunden', it: 'Esplora', pt: 'Explorar', ca: 'Explora', ar: 'استكشف', ru: 'Исследовать', uk: 'Досліджувати', zh: '探索', ja: '探索する', ko: '탐색하기' },
  where_to_eat: { es: 'Dónde comer', en: 'Where to eat', fr: 'Où manger', de: 'Wo essen', it: 'Dove mangiare', pt: 'Onde comer', ca: 'On menjar', ar: 'أين تأكل', ru: 'Где поесть', uk: 'Де поїсти', zh: '在哪里吃饭', ja: '食事する場所', ko: '식사 장소' },
  activities: { es: 'Experiencias', en: 'Experiences', fr: 'Expériences', de: 'Erlebnisse', it: 'Esperienze', pt: 'Experiências', ca: 'Experiències', ar: 'التجارب', ru: 'Впечатления', uk: 'Враження', zh: '体验', ja: '体験', ko: '체험' },
  loading: { es: 'Cargando tu guía...', en: 'Loading your guide...', fr: 'Chargement...', de: 'Laden...', it: 'Caricamento...', pt: 'A carregar...', ca: 'Carregant la teva guia...', ar: 'جارٍ تحميل دليلك...', ru: 'Загрузка вашего гида...', uk: 'Завантаження вашого гіда...', zh: '正在加载您的指南...', ja: 'ガイドを読み込み中...', ko: '가이드를 불러오는 중...' },
  no_info: { es: 'Sin información disponible', en: 'No information available', fr: 'Aucune information', de: 'Keine Informationen', it: 'Nessuna informazione', pt: 'Sem informação', ca: 'Sense informació disponible', ar: 'لا توجد معلومات متاحة', ru: 'Информация недоступна', uk: 'Інформація відсутня', zh: '暂无信息', ja: '情報がありません', ko: '정보 없음' },
  show_more: { es: 'Ver más', en: 'Show more', fr: 'Voir plus', de: 'Mehr anzeigen', it: 'Mostra altro', pt: 'Ver mais', ca: 'Veure més', ar: 'عرض المزيد', ru: 'Показать больше', uk: 'Показати більше', zh: '查看更多', ja: 'もっと見る', ko: '더 보기' },
  show_less: { es: 'Ver menos', en: 'Show less', fr: 'Voir moins', de: 'Weniger', it: 'Meno', pt: 'Ver menos', ca: 'Veure menys', ar: 'عرض أقل', ru: 'Скрыть', uk: 'Приховати', zh: '收起', ja: '閉じる', ko: '간략히' },

  // ServicesSection → Tienda (host + platform store items) + carrito de pedido
  store_title: { es: 'Tienda', en: 'Store', fr: 'Boutique', de: 'Shop', it: 'Negozio', pt: 'Loja', ca: 'Botiga', ar: 'المتجر', ru: 'Магазин', uk: 'Магазин', zh: '商店', ja: 'ストア', ko: '스토어' },
  host_products_title: { es: 'Productos y servicios del anfitrión', en: "Your host's products & services", fr: "Produits et services de l'hôte", de: 'Produkte & Services deines Gastgebers', it: "Prodotti e servizi dell'host", pt: 'Produtos e serviços do anfitrião', ca: "Productes i serveis de l'amfitrió", ar: 'منتجات وخدمات المضيف', ru: 'Товары и услуги хозяина', uk: 'Товари та послуги господаря', zh: '房东的产品与服务', ja: 'ホストの商品・サービス', ko: '호스트의 상품 및 서비스' },
  host_badge: { es: 'Del anfitrión', en: 'From your host', fr: "De l'hôte", de: 'Vom Gastgeber', it: "Dall'host", pt: 'Do anfitrião', ca: "De l'amfitrió", ar: 'من المضيف', ru: 'От хозяина', uk: 'Від господаря', zh: '来自房东', ja: 'ホストより', ko: '호스트 제공' },
  local_products_title: { es: 'Productos locales', en: 'Local products', fr: 'Produits locaux', de: 'Lokale Produkte', it: 'Prodotti locali', pt: 'Produtos locais', ca: 'Productes locals', ar: 'منتجات محلية', ru: 'Местные продукты', uk: 'Місцеві продукти', zh: '本地产品', ja: '地元の特産品', ko: '지역 특산품' },
  no_store_items: { es: 'Todavía no hay productos disponibles', en: 'No products available yet', fr: 'Aucun produit disponible pour le moment', de: 'Noch keine Produkte verfügbar', it: 'Nessun prodotto disponibile per ora', pt: 'Ainda não há produtos disponíveis', ca: 'Encara no hi ha productes disponibles', ar: 'لا توجد منتجات متاحة بعد', ru: 'Пока нет доступных товаров', uk: 'Поки немає доступних товарів', zh: '暂无可用商品', ja: 'まだ利用可能な商品がありません', ko: '아직 이용 가능한 상품이 없습니다' },
  add_to_order: { es: 'Añadir', en: 'Add', fr: 'Ajouter', de: 'Hinzufügen', it: 'Aggiungi', pt: 'Adicionar', ca: 'Afegir', ar: 'إضافة', ru: 'Добавить', uk: 'Додати', zh: '添加', ja: '追加', ko: '추가' },
  added_to_order: { es: 'Añadido', en: 'Added', fr: 'Ajouté', de: 'Hinzugefügt', it: 'Aggiunto', pt: 'Adicionado', ca: 'Afegit', ar: 'تمت الإضافة', ru: 'Добавлено', uk: 'Додано', zh: '已添加', ja: '追加済み', ko: '추가됨' },
  your_order: { es: 'Tu pedido', en: 'Your order', fr: 'Votre commande', de: 'Deine Bestellung', it: 'Il tuo ordine', pt: 'O seu pedido', ca: 'La teva comanda', ar: 'طلبك', ru: 'Ваш заказ', uk: 'Ваше замовлення', zh: '您的订单', ja: 'ご注文', ko: '주문 내역' },
  send_order_whatsapp: { es: 'Enviar pedido por WhatsApp', en: 'Send order via WhatsApp', fr: 'Envoyer la commande par WhatsApp', de: 'Bestellung per WhatsApp senden', it: "Invia l'ordine via WhatsApp", pt: 'Enviar pedido por WhatsApp', ca: 'Enviar la comanda per WhatsApp', ar: 'إرسال الطلب عبر واتساب', ru: 'Отправить заказ через WhatsApp', uk: 'Надіслати замовлення через WhatsApp', zh: '通过WhatsApp发送订单', ja: 'WhatsAppで注文を送信', ko: '왓츠앱으로 주문 보내기' },
  order_sending: { es: 'Enviando...', en: 'Sending...', fr: 'Envoi...', de: 'Wird gesendet...', it: 'Invio...', pt: 'A enviar...', ca: 'Enviant...', ar: 'جارٍ الإرسال...', ru: 'Отправка...', uk: 'Надсилання...', zh: '发送中...', ja: '送信中...', ko: '전송 중...' },
  order_sent_success: { es: '¡Pedido enviado! Se ha abierto WhatsApp para confirmarlo.', en: 'Order sent! WhatsApp has opened so you can confirm it.', fr: 'Commande envoyée ! WhatsApp s\'est ouvert pour la confirmer.', de: 'Bestellung gesendet! WhatsApp wurde geöffnet, um sie zu bestätigen.', it: 'Ordine inviato! WhatsApp si è aperto per confermarlo.', pt: 'Pedido enviado! O WhatsApp abriu-se para o confirmar.', ca: 'Comanda enviada! S\'ha obert el WhatsApp per confirmar-la.', ar: 'تم إرسال الطلب! تم فتح واتساب لتأكيده.', ru: 'Заказ отправлен! Открылся WhatsApp для подтверждения.', uk: 'Замовлення надіслано! Відкрито WhatsApp для підтвердження.', zh: '订单已发送！WhatsApp已打开以便确认。', ja: '注文を送信しました！確認のためWhatsAppが開きました。', ko: '주문이 전송되었습니다! 확인을 위해 왓츠앱이 열렸습니다.' },
  order_no_contact: { es: 'Este pedido se ha guardado, pero tu anfitrión todavía no ha configurado un WhatsApp de contacto. Pregúntale directamente.', en: "This order was saved, but your host hasn't set up a WhatsApp contact yet. Please ask them directly.", fr: "Cette commande a été enregistrée, mais votre hôte n'a pas encore configuré de contact WhatsApp. Demandez-lui directement.", de: 'Diese Bestellung wurde gespeichert, aber dein Gastgeber hat noch keinen WhatsApp-Kontakt eingerichtet. Frag ihn direkt.', it: "Questo ordine è stato salvato, ma il tuo host non ha ancora impostato un contatto WhatsApp. Chiediglielo direttamente.", pt: 'Este pedido foi guardado, mas o seu anfitrião ainda não configurou um contacto de WhatsApp. Pergunte-lhe diretamente.', ca: 'Aquesta comanda s\'ha desat, però el teu amfitrió encara no ha configurat un contacte de WhatsApp. Pregunta-li directament.', ar: 'تم حفظ هذا الطلب، لكن مضيفك لم يقم بعد بإعداد رقم واتساب للتواصل. يرجى سؤاله مباشرة.', ru: 'Заказ сохранён, но хозяин ещё не указал контакт WhatsApp. Спросите его напрямую.', uk: 'Замовлення збережено, але господар ще не вказав контакт WhatsApp. Запитайте його напряму.', zh: '订单已保存，但您的房东尚未设置WhatsApp联系方式，请直接询问房东。', ja: 'ご注文は保存されましたが、ホストがまだWhatsAppの連絡先を設定していません。直接お尋ねください。', ko: '주문이 저장되었지만 호스트가 아직 왓츠앱 연락처를 설정하지 않았습니다. 직접 문의해 주세요.' },
  order_error: { es: 'No se ha podido enviar el pedido. Inténtalo de nuevo.', en: "The order couldn't be sent. Please try again.", fr: "La commande n'a pas pu être envoyée. Veuillez réessayer.", de: 'Die Bestellung konnte nicht gesendet werden. Bitte versuche es erneut.', it: "Non è stato possibile inviare l'ordine. Riprova.", pt: 'Não foi possível enviar o pedido. Tente novamente.', ca: 'No s\'ha pogut enviar la comanda. Torna-ho a provar.', ar: 'تعذر إرسال الطلب. يرجى المحاولة مرة أخرى.', ru: 'Не удалось отправить заказ. Попробуйте ещё раз.', uk: 'Не вдалося надіслати замовлення. Спробуйте ще раз.', zh: '订单发送失败，请重试。', ja: '注文を送信できませんでした。もう一度お試しください。', ko: '주문을 보낼 수 없습니다. 다시 시도해 주세요.' },
  view_order: { es: 'Ver pedido', en: 'View order', fr: 'Voir la commande', de: 'Bestellung ansehen', it: "Vedi l'ordine", pt: 'Ver pedido', ca: 'Veure la comanda', ar: 'عرض الطلب', ru: 'Смотреть заказ', uk: 'Переглянути замовлення', zh: '查看订单', ja: '注文を見る', ko: '주문 보기' },
  clear_order: { es: 'Vaciar', en: 'Clear', fr: 'Vider', de: 'Leeren', it: 'Svuota', pt: 'Esvaziar', ca: 'Buidar', ar: 'إفراغ', ru: 'Очистить', uk: 'Очистити', zh: '清空', ja: 'クリア', ko: '비우기' },

  // RestaurantsSection (split de DiscoverSection)
  restaurants_title: { es: 'Restaurantes en {zone}', en: 'Restaurants in {zone}', fr: 'Restaurants à {zone}', de: 'Restaurants in {zone}', it: 'Ristoranti a {zone}', pt: 'Restaurantes em {zone}', ca: 'Restaurants a {zone}', ar: 'مطاعم في {zone}', ru: 'Рестораны в {zone}', uk: 'Ресторани в {zone}', zh: '{zone}的餐厅', ja: '{zone}のレストラン', ko: '{zone}의 레스토랑' },
  restaurants_default_description: { es: 'Descubre dónde comer durante tu estancia.', en: 'Discover where to eat during your stay.', fr: 'Découvrez où manger pendant votre séjour.', de: 'Entdecke, wo du während deines Aufenthalts essen kannst.', it: 'Scopri dove mangiare durante il tuo soggiorno.', pt: 'Descubra onde comer durante a sua estadia.', ca: 'Descobreix on menjar durant la teva estada.', ar: 'اكتشف أين تأكل خلال إقامتك.', ru: 'Узнайте, где поесть во время вашего пребывания.', uk: 'Дізнайтеся, де поїсти під час перебування.', zh: '探索住宿期间的用餐地点。', ja: '滞在中のお食事場所を見つけましょう。', ko: '머무는 동안 식사할 곳을 찾아보세요.' },
  no_restaurants: { es: 'No hay restaurantes disponibles', en: 'No restaurants available', fr: 'Aucun restaurant disponible', de: 'Keine Restaurants verfügbar', it: 'Nessun ristorante disponibile', pt: 'Sem restaurantes disponíveis', ca: 'No hi ha restaurants disponibles', ar: 'لا توجد مطاعم متاحة', ru: 'Нет доступных ресторанов', uk: 'Немає доступних ресторанів', zh: '暂无可用餐厅', ja: '利用可能なレストランがありません', ko: '이용 가능한 레스토랑이 없습니다' },
};

export function getTranslation(key: string, lang: string): string {
  if (!UI_STRINGS[key]) return key;
  return UI_STRINGS[key][lang] || UI_STRINGS[key]['en'] || UI_STRINGS[key]['es'] || key;
}

// POI/experience `category` and `subcategory` come straight from the guide_pois columns
// (see workerGuide.js) — only `name`/`description` go through the `translations` table.
// Zones seed this field inconsistently: some store an English slug ('viewpoint', 'beach'),
// others a ready-made Spanish label ('Naturaleza', 'Compras'). Both are normalized here so
// every one of the 13 active languages shows a real translation instead of raw Spanish.
const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  naturaleza: { es: 'Naturaleza', en: 'Nature', fr: 'Nature', de: 'Natur', it: 'Natura', pt: 'Natureza', ca: 'Natura', ar: 'الطبيعة', ru: 'Природа', uk: 'Природа', zh: '自然', ja: '自然', ko: '자연' },
  compras: { es: 'Compras', en: 'Shopping', fr: 'Shopping', de: 'Einkaufen', it: 'Shopping', pt: 'Compras', ca: 'Compres', ar: 'التسوق', ru: 'Шопинг', uk: 'Шопінг', zh: '购物', ja: 'ショッピング', ko: '쇼핑' },
  cultura: { es: 'Cultura', en: 'Culture', fr: 'Culture', de: 'Kultur', it: 'Cultura', pt: 'Cultura', ca: 'Cultura', ar: 'الثقافة', ru: 'Культура', uk: 'Культура', zh: '文化', ja: '文化', ko: '문화' },
  playas: { es: 'Playas', en: 'Beaches', fr: 'Plages', de: 'Strände', it: 'Spiagge', pt: 'Praias', ca: 'Platges', ar: 'الشواطئ', ru: 'Пляжи', uk: 'Пляжі', zh: '海滩', ja: 'ビーチ', ko: '해변' },
  actividades: { es: 'Actividades', en: 'Activities', fr: 'Activités', de: 'Aktivitäten', it: 'Attività', pt: 'Atividades', ca: 'Activitats', ar: 'الأنشطة', ru: 'Активности', uk: 'Активності', zh: '活动', ja: 'アクティビティ', ko: '액티비티' },
  transporte: { es: 'Transporte', en: 'Transport', fr: 'Transport', de: 'Transport', it: 'Trasporto', pt: 'Transporte', ca: 'Transport', ar: 'النقل', ru: 'Транспорт', uk: 'Транспорт', zh: '交通', ja: '交通', ko: '교통' },
  bienestar: { es: 'Bienestar', en: 'Wellness', fr: 'Bien-être', de: 'Wellness', it: 'Benessere', pt: 'Bem-estar', ca: 'Benestar', ar: 'العافية', ru: 'Велнес', uk: 'Велнес', zh: '养生', ja: 'ウェルネス', ko: '웰니스' },
  viewpoint: { es: 'Mirador', en: 'Viewpoint', fr: 'Point de vue', de: 'Aussichtspunkt', it: 'Punto panoramico', pt: 'Miradouro', ca: 'Mirador', ar: 'نقطة مشاهدة', ru: 'Смотровая площадка', uk: 'Оглядовий майданчик', zh: '观景点', ja: '展望スポット', ko: '전망대' },
  monument: { es: 'Monumento', en: 'Monument', fr: 'Monument', de: 'Denkmal', it: 'Monumento', pt: 'Monumento', ca: 'Monument', ar: 'معلم', ru: 'Памятник', uk: 'Пам’ятка', zh: '古迹', ja: '記念碑', ko: '기념물' },
  beach: { es: 'Playa', en: 'Beach', fr: 'Plage', de: 'Strand', it: 'Spiaggia', pt: 'Praia', ca: 'Platja', ar: 'شاطئ', ru: 'Пляж', uk: 'Пляж', zh: '海滩', ja: 'ビーチ', ko: '해변' },
  water_sport: { es: 'Deporte acuático', en: 'Water sports', fr: 'Sports nautiques', de: 'Wassersport', it: 'Sport acquatici', pt: 'Desportos aquáticos', ca: 'Esports aquàtics', ar: 'رياضة مائية', ru: 'Водный спорт', uk: 'Водний спорт', zh: '水上运动', ja: 'ウォータースポーツ', ko: '수상 스포츠' },
  adventure: { es: 'Aventura', en: 'Adventure', fr: 'Aventure', de: 'Abenteuer', it: 'Avventura', pt: 'Aventura', ca: 'Aventura', ar: 'مغامرة', ru: 'Приключение', uk: 'Пригода', zh: '探险', ja: 'アドベンチャー', ko: '어드벤처' },
  class: { es: 'Clase / Taller', en: 'Class / Workshop', fr: 'Cours / Atelier', de: 'Kurs / Workshop', it: 'Corso / Laboratorio', pt: 'Aula / Workshop', ca: 'Classe / Taller', ar: 'دورة / ورشة', ru: 'Занятие / Мастер-класс', uk: 'Заняття / Майстер-клас', zh: '课程/工作坊', ja: 'レッスン／ワークショップ', ko: '클래스/워크숍' },
  park: { es: 'Parque', en: 'Park', fr: 'Parc', de: 'Park', it: 'Parco', pt: 'Parque', ca: 'Parc', ar: 'حديقة', ru: 'Парк', uk: 'Парк', zh: '公园', ja: '公園', ko: '공원' },
  marina: { es: 'Puerto deportivo', en: 'Marina', fr: 'Port de plaisance', de: 'Yachthafen', it: 'Porto turistico', pt: 'Marina', ca: 'Port esportiu', ar: 'مارينا', ru: 'Марина', uk: 'Марина', zh: '游艇码头', ja: 'マリーナ', ko: '마리나' },

  // Categorías de la Tienda (guide_store_items.category — ver migrations/0080_guide_store.sql)
  late_checkout: { es: 'Late check-out', en: 'Late check-out', fr: 'Départ tardif', de: 'Später Check-out', it: 'Late check-out', pt: 'Check-out tardio', ca: 'Late check-out', ar: 'تسجيل مغادرة متأخر', ru: 'Поздний выезд', uk: 'Пізній виїзд', zh: '延迟退房', ja: 'レイトチェックアウト', ko: '레이트 체크아웃' },
  early_checkin: { es: 'Early check-in', en: 'Early check-in', fr: 'Arrivée anticipée', de: 'Früher Check-in', it: 'Early check-in', pt: 'Check-in antecipado', ca: 'Early check-in', ar: 'تسجيل وصول مبكر', ru: 'Ранний заезд', uk: 'Раннє заселення', zh: '提前入住', ja: 'アーリーチェックイン', ko: '얼리 체크인' },
  cleaning: { es: 'Limpieza extra', en: 'Extra cleaning', fr: 'Ménage supplémentaire', de: 'Zusätzliche Reinigung', it: 'Pulizia extra', pt: 'Limpeza extra', ca: 'Neteja extra', ar: 'تنظيف إضافي', ru: 'Дополнительная уборка', uk: 'Додаткове прибирання', zh: '额外清洁', ja: '追加清掃', ko: '추가 청소' },
  crib: { es: 'Cuna / trona', en: 'Crib / high chair', fr: 'Lit bébé / chaise haute', de: 'Kinderbett / Hochstuhl', it: 'Culla / seggiolone', pt: 'Berço / cadeira alta', ca: 'Bressol / trona', ar: 'سرير أطفال / كرسي مرتفع', ru: 'Кроватка / стульчик', uk: 'Ліжечко / стільчик', zh: '婴儿床/餐椅', ja: 'ベビーベッド／ハイチェア', ko: '아기 침대 / 하이체어' },
  transfer: { es: 'Traslado', en: 'Transfer', fr: 'Transfert', de: 'Transfer', it: 'Trasferimento', pt: 'Transfer', ca: 'Trasllat', ar: 'خدمة النقل', ru: 'Трансфер', uk: 'Трансфер', zh: '接送服务', ja: '送迎', ko: '이동 서비스' },
  welcome_pack: { es: 'Pack de bienvenida', en: 'Welcome pack', fr: 'Pack de bienvenue', de: 'Willkommenspaket', it: 'Pacchetto di benvenuto', pt: 'Pack de boas-vindas', ca: 'Pack de benvinguda', ar: 'حزمة ترحيب', ru: 'Приветственный набор', uk: 'Вітальний набір', zh: '欢迎礼包', ja: 'ウェルカムパック', ko: '웰컴 팩' },
  parking: { es: 'Parking', en: 'Parking', fr: 'Parking', de: 'Parkplatz', it: 'Parcheggio', pt: 'Estacionamento', ca: 'Aparcament', ar: 'موقف سيارات', ru: 'Парковка', uk: 'Парковка', zh: '停车位', ja: '駐車場', ko: '주차' },
  rental: { es: 'Alquiler', en: 'Rental', fr: 'Location', de: 'Verleih', it: 'Noleggio', pt: 'Aluguer', ca: 'Lloguer', ar: 'تأجير', ru: 'Прокат', uk: 'Прокат', zh: '租赁', ja: 'レンタル', ko: '대여' },
  grocery: { es: 'Compra / grocery', en: 'Grocery shopping', fr: 'Courses', de: 'Einkaufsservice', it: 'Spesa', pt: 'Compras', ca: 'Compra', ar: 'تسوق البقالة', ru: 'Продукты', uk: 'Продукти', zh: '代买杂货', ja: '食料品の買い物', ko: '장보기' },
  local_product: { es: 'Producto local', en: 'Local product', fr: 'Produit local', de: 'Lokales Produkt', it: 'Prodotto locale', pt: 'Produto local', ca: 'Producte local', ar: 'منتج محلي', ru: 'Местный продукт', uk: 'Місцевий продукт', zh: '本地产品', ja: '地元の特産品', ko: '지역 특산품' },
  custom: { es: 'Personalizado', en: 'Custom', fr: 'Personnalisé', de: 'Individuell', it: 'Personalizzato', pt: 'Personalizado', ca: 'Personalitzat', ar: 'مخصص', ru: 'Другое', uk: 'Інше', zh: '自定义', ja: 'カスタム', ko: '맞춤' },
};

const SUBCATEGORY_LABELS: Record<string, Record<string, string>> = {
  'nautical/kayak': { es: 'Náutica · Kayak', en: 'Watersports · Kayak', fr: 'Nautisme · Kayak', de: 'Wassersport · Kajak', it: 'Nautica · Kayak', pt: 'Náutica · Caiaque', ca: 'Nàutica · Caiac', ar: 'رياضة مائية · كاياك', ru: 'Водный спорт · Каяк', uk: 'Водний спорт · Каяк', zh: '水上运动 · 皮划艇', ja: 'ウォータースポーツ・カヤック', ko: '수상 스포츠 · 카약' },
  'nautical/catamaran': { es: 'Náutica · Catamarán', en: 'Watersports · Catamaran', fr: 'Nautisme · Catamaran', de: 'Wassersport · Katamaran', it: 'Nautica · Catamarano', pt: 'Náutica · Catamarã', ca: 'Nàutica · Catamarà', ar: 'رياضة مائية · قارب شراعي', ru: 'Водный спорт · Катамаран', uk: 'Водний спорт · Катамаран', zh: '水上运动 · 双体船', ja: 'ウォータースポーツ・カタマラン', ko: '수상 스포츠 · 카타마란' },
};

function humanizeFallback(raw: string): string {
  const last = raw.split('/').pop() || raw;
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/_/g, ' ');
}

/** Translates a raw `category` value from guide_pois into the given language, with a readable fallback for anything not yet mapped. */
export function getCategoryLabel(rawCategory: string | null | undefined, lang: string): string {
  if (!rawCategory) return '';
  const entry = CATEGORY_LABELS[rawCategory.trim().toLowerCase()];
  if (entry) return entry[lang] || entry.en || entry.es;
  return humanizeFallback(rawCategory);
}

/** Same as getCategoryLabel but for the `subcategory`/`service_subcategory` field (e.g. "nautical/kayak"). */
export function getSubcategoryLabel(rawSubcategory: string | null | undefined, lang: string): string | null {
  if (!rawSubcategory) return null;
  const entry = SUBCATEGORY_LABELS[rawSubcategory.trim().toLowerCase()];
  if (entry) return entry[lang] || entry.en || entry.es;
  return humanizeFallback(rawSubcategory);
}
