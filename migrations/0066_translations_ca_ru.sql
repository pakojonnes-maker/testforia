-- =====================================================
-- COSTA DEL SOL POIs — CATALAN + RUSSIAN TRANSLATIONS — MIGRATION 0066
-- =====================================================
-- Adds ca/ru translations (name, description, short_tip/cta_label) for the 74
-- POIs/experiences from migrations 0060 and 0063. es/en/fr/de/it/pt already
-- exist; the worker falls back to es when a language is missing, so this is
-- additive. Remaining languages (ar/uk/zh/ja/ko) are a follow-up.
-- =====================================================

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES

-- ════════════════════════════════════════
-- MÁLAGA — FREE
-- ════════════════════════════════════════
('poi_malaga_teatro_romano', 'poi', 'ca', 'name', 'Teatre Romà de Màlaga'),
('poi_malaga_teatro_romano', 'poi', 'ca', 'description', 'Als peus de l''Alcazaba, aquest teatre del segle I aC és el vestigi romà més important de la ciutat. Reutilitzat pels àrabs per construir la fortalesa, avui es visita lliurement amb el seu centre d''interpretació.'),
('poi_malaga_teatro_romano', 'poi', 'ca', 'short_tip', 'Entrada gratuïta. Tancat els dilluns. Il·luminat de nit.'),
('poi_malaga_teatro_romano', 'poi', 'ru', 'name', 'Римский театр Малаги'),
('poi_malaga_teatro_romano', 'poi', 'ru', 'description', 'У подножия Алькасабы находится этот театр I века до н.э. — самый важный римский памятник города. Позже арабы использовали его камни для строительства крепости; сегодня вход свободный, есть центр для посетителей.'),
('poi_malaga_teatro_romano', 'poi', 'ru', 'short_tip', 'Бесплатный вход. Закрыто по понедельникам. Красиво подсвечивается вечером.'),

('poi_malaga_larios', 'poi', 'ca', 'name', 'Carrer Marqués de Larios'),
('poi_malaga_larios', 'poi', 'ca', 'description', 'La gran artèria comercial i vianant del centre històric, amb edificis de finals del XIX. Decorada espectacularment per Nadal i durant la Fira de Màlaga.'),
('poi_malaga_larios', 'poi', 'ca', 'short_tip', 'Al capvespre s''omple de música de carrer i terrasses'),
('poi_malaga_larios', 'poi', 'ru', 'name', 'Улица Маркес-де-Лариос'),
('poi_malaga_larios', 'poi', 'ru', 'description', 'Главная пешеходная торговая улица исторического центра, застроенная зданиями конца XIX века. Впечатляюще украшается на Рождество и во время ярмарки Малаги.'),
('poi_malaga_larios', 'poi', 'ru', 'short_tip', 'На закате улица наполняется уличными музыкантами и открытыми террасами'),

('poi_malaga_plaza_constitucion', 'poi', 'ca', 'name', 'Plaza de la Constitución'),
('poi_malaga_plaza_constitucion', 'poi', 'ca', 'description', 'Cor històric i polític de la ciutat des de l''edat mitjana, amb la Font de Gènova del segle XVI. Punt de partida natural per explorar el centre a peu.'),
('poi_malaga_plaza_constitucion', 'poi', 'ca', 'short_tip', 'D''aquí surten diverses rutes de free tour'),
('poi_malaga_plaza_constitucion', 'poi', 'ru', 'name', 'Пласа-де-ла-Конститусьон'),
('poi_malaga_plaza_constitucion', 'poi', 'ru', 'description', 'Исторический и политический центр города со времён Средневековья, с фонтаном Дженоа XVI века. Естественная отправная точка для пеших прогулок по центру.'),
('poi_malaga_plaza_constitucion', 'poi', 'ru', 'short_tip', 'Отсюда начинаются несколько бесплатных пеших экскурсий'),

('poi_malaga_atarazanas', 'poi', 'ca', 'name', 'Mercat d''Atarazanas'),
('poi_malaga_atarazanas', 'poi', 'ca', 'description', 'Mercat central del segle XIX construït sobre antigues drassanes nassarites, amb una gran vidriera modernista. Peix fresc, pernil i bars de tapes dins del mateix mercat.'),
('poi_malaga_atarazanas', 'poi', 'ca', 'short_tip', 'Vine al matí entre setmana per evitar aglomeracions'),
('poi_malaga_atarazanas', 'poi', 'ru', 'name', 'Рынок Атарасанас'),
('poi_malaga_atarazanas', 'poi', 'ru', 'description', 'Центральный рынок XIX века, построенный на месте старинных назридских верфей, с большим витражом в стиле модерн. Свежая рыба, хамон и тапас-бары прямо внутри рынка.'),
('poi_malaga_atarazanas', 'poi', 'ru', 'short_tip', 'Приходите утром в будний день, чтобы избежать толпы'),

('poi_malaga_plaza_merced', 'poi', 'ca', 'name', 'Plaza de la Merced'),
('poi_malaga_plaza_merced', 'poi', 'ca', 'description', 'Àmplia plaça porticada on va néixer Picasso, amb un obelisc dedicat al General Torrijos. Envoltada de terrasses, és un dels punts de trobada preferits dels malaguenys.'),
('poi_malaga_plaza_merced', 'poi', 'ca', 'short_tip', 'La Casa Natal de Picasso és just en aquesta plaça'),
('poi_malaga_plaza_merced', 'poi', 'ru', 'name', 'Пласа-де-ла-Мерсед'),
('poi_malaga_plaza_merced', 'poi', 'ru', 'description', 'Просторная аркадная площадь, где родился Пикассо, с обелиском в честь генерала Торрихоса. Окружена террасами — одно из любимых мест встреч у местных жителей.'),
('poi_malaga_plaza_merced', 'poi', 'ru', 'short_tip', 'Дом, где родился Пикассо, находится прямо на этой площади'),

('poi_malaga_cripta_victoria', 'poi', 'ca', 'name', 'Cripta de la Basílica de la Victoria'),
('poi_malaga_cripta_victoria', 'poi', 'ca', 'description', 'Joia amagada sota la Basílica de la Victoria: una cripta barroca amb nínxols i l''impressionant Panteó dels Comtes de Buenavista. Poc coneguda fins i tot entre malaguenys.'),
('poi_malaga_cripta_victoria', 'poi', 'ca', 'short_tip', 'Si la cripta sembla tancada, pregunta a la sagristia — de vegades obre si ho demanes'),
('poi_malaga_cripta_victoria', 'poi', 'ru', 'name', 'Крипта базилики Ла-Виктория'),
('poi_malaga_cripta_victoria', 'poi', 'ru', 'description', 'Скрытая жемчужина под базиликой Ла-Виктория: барочная крипта с нишами и впечатляющий пантеон графов Буэнависта. Малоизвестна даже среди местных жителей.'),
('poi_malaga_cripta_victoria', 'poi', 'ru', 'short_tip', 'Если крипта кажется закрытой, спросите в ризнице — иногда открывают по просьбе'),

('poi_malaga_cementerio_ingles', 'poi', 'ca', 'name', 'Cementiri Anglès'),
('poi_malaga_cementerio_ingles', 'poi', 'ca', 'description', 'El primer cementiri protestant d''Espanya (1831), un jardí romàntic i tranquil amb tombes d''escriptors i diplomàtics, a pocs metres de la platja de la Malagueta.'),
('poi_malaga_cementerio_ingles', 'poi', 'ca', 'short_tip', 'Entrada gratuïta, tancat els dilluns'),
('poi_malaga_cementerio_ingles', 'poi', 'ru', 'name', 'Английское кладбище'),
('poi_malaga_cementerio_ingles', 'poi', 'ru', 'description', 'Первое протестантское кладбище в Испании (1831), тихий романтичный сад с могилами писателей и дипломатов, в нескольких шагах от пляжа Малагета.'),
('poi_malaga_cementerio_ingles', 'poi', 'ru', 'short_tip', 'Бесплатный вход, закрыто по понедельникам'),

('poi_malaga_soho', 'poi', 'ca', 'name', 'Barri del Soho (art urbà)'),
('poi_malaga_soho', 'poi', 'ca', 'description', 'El museu d''art urbà a l''aire lliure de Màlaga (MAUS): façanes senceres pintades per artistes internacionals com D*Face, ROA o Obey. Una manera diferent de descobrir el centre.'),
('poi_malaga_soho', 'poi', 'ca', 'short_tip', 'Descarrega''t el mapa del MAUS per no perdre''t cap mural'),
('poi_malaga_soho', 'poi', 'ru', 'name', 'Квартал Сохо (уличное искусство)'),
('poi_malaga_soho', 'poi', 'ru', 'description', 'Музей уличного искусства Малаги под открытым небом (MAUS): целые фасады домов расписаны международными художниками, такими как D*Face, ROA и Obey. Необычный способ познакомиться с центром города.'),
('poi_malaga_soho', 'poi', 'ru', 'short_tip', 'Скачайте карту MAUS, чтобы не пропустить ни одного мурала'),

('poi_malaga_pasaje_chinitas', 'poi', 'ca', 'name', 'Pasaje de Chinitas'),
('poi_malaga_pasaje_chinitas', 'poi', 'ca', 'description', 'Carreró històric lligat al flamenc i al poeta Federico García Lorca, avui ple de bars de tapes. Molt a prop de la Plaza de la Constitución.'),
('poi_malaga_pasaje_chinitas', 'poi', 'ca', 'short_tip', 'Bona parada per tapejar abans o després de visitar el centre'),
('poi_malaga_pasaje_chinitas', 'poi', 'ru', 'name', 'Пасахе-де-Чинитас'),
('poi_malaga_pasaje_chinitas', 'poi', 'ru', 'description', 'Исторический переулок, связанный с фламенко и поэтом Федерико Гарсиа Лоркой, сегодня заполнен барами с тапас. Совсем рядом с площадью Конститусьон.'),
('poi_malaga_pasaje_chinitas', 'poi', 'ru', 'short_tip', 'Отличное место, чтобы перекусить тапас до или после прогулки по центру'),

('poi_malaga_muelle_uno', 'poi', 'ca', 'name', 'Muelle Uno i Palmeral de las Sorpresas'),
('poi_malaga_muelle_uno', 'poi', 'ca', 'description', 'Passeig portuari renovat al costat del centre, amb jardins, botigues, terrasses i vistes als creuers. El Centre Pompidou Màlaga hi és mateix.'),
('poi_malaga_muelle_uno', 'poi', 'ca', 'short_tip', 'Ideal per passejar al capvespre amb vistes al Castell de Gibralfaro'),
('poi_malaga_muelle_uno', 'poi', 'ru', 'name', 'Муэлье-Уно и Пальмераль-де-лас-Сорпресас'),
('poi_malaga_muelle_uno', 'poi', 'ru', 'description', 'Обновлённая портовая набережная рядом с центром, с садами, магазинами, террасами и видом на круизные лайнеры. Здесь же находится центр Помпиду Малага.'),
('poi_malaga_muelle_uno', 'poi', 'ru', 'short_tip', 'Отлично подходит для прогулки на закате с видом на замок Хибральфаро'),

('poi_malaga_malagueta', 'poi', 'ca', 'name', 'Platja de la Malagueta'),
('poi_malaga_malagueta', 'poi', 'ca', 'description', 'La platja urbana per excel·lència de Màlaga capital, a 10 minuts a peu del centre històric. Sorra fosca, xiringuitos i passeig marítim complet.'),
('poi_malaga_malagueta', 'poi', 'ca', 'short_tip', 'Els espetos de sardines dels xiringuitos són un clàssic'),
('poi_malaga_malagueta', 'poi', 'ru', 'name', 'Пляж Малагета'),
('poi_malaga_malagueta', 'poi', 'ru', 'description', 'Главный городской пляж Малаги, в 10 минутах ходьбы от исторического центра. Тёмный песок, пляжные бары и полноценная набережная.'),
('poi_malaga_malagueta', 'poi', 'ru', 'short_tip', 'Шпажки с жареными сардинами (эспетос) в пляжных барах — местная классика'),

('poi_malaga_mirador_gibralfaro', 'poi', 'ca', 'name', 'Mirador de Gibralfaro'),
('poi_malaga_mirador_gibralfaro', 'poi', 'ca', 'description', 'Mirador gratuït al costat del castell amb les millors vistes panoràmiques de la ciutat, el port i la plaça de toros de la Malagueta.'),
('poi_malaga_mirador_gibralfaro', 'poi', 'ca', 'short_tip', 'Puja amb l''autobús 35 o camina 30 min des del centre — la vista ho val'),
('poi_malaga_mirador_gibralfaro', 'poi', 'ru', 'name', 'Смотровая площадка Хибральфаро'),
('poi_malaga_mirador_gibralfaro', 'poi', 'ru', 'description', 'Бесплатная смотровая площадка рядом с замком с лучшим панорамным видом на город, порт и арену для боя быков Ла-Малагета.'),
('poi_malaga_mirador_gibralfaro', 'poi', 'ru', 'short_tip', 'Доедьте на автобусе 35 или пройдите 30 минут пешком от центра — вид того стоит'),

('poi_malaga_santo_cristo', 'poi', 'ca', 'name', 'Església del Santo Cristo de la Salud'),
('poi_malaga_santo_cristo', 'poi', 'ca', 'description', 'Església barroca del segle XVII amb una vistosa façana de marbre vermell, molt vinculada a la Setmana Santa de Màlaga.'),
('poi_malaga_santo_cristo', 'poi', 'ca', 'short_tip', 'Just al costat del carrer Larios, fàcil de combinar amb el passeig pel centre'),
('poi_malaga_santo_cristo', 'poi', 'ru', 'name', 'Церковь Санто-Кристо-де-ла-Салуд'),
('poi_malaga_santo_cristo', 'poi', 'ru', 'description', 'Барочная церковь XVII века с эффектным фасадом из красного мрамора, тесно связана со Страстной неделей в Малаге.'),
('poi_malaga_santo_cristo', 'poi', 'ru', 'short_tip', 'Прямо рядом с улицей Ларьос, легко совместить с прогулкой по центру'),

-- ════════════════════════════════════════
-- MÁLAGA — PREMIUM
-- ════════════════════════════════════════
('poi_malaga_alcazaba', 'poi', 'ca', 'name', 'Alcazaba de Màlaga'),
('poi_malaga_alcazaba', 'poi', 'ca', 'description', 'Fortalesa palatina àrab del segle XI, la millor conservada d''Espanya. Jardins, patis amb vistes al mar i el Teatre Romà als seus peus.'),
('poi_malaga_alcazaba', 'poi', 'ca', 'cta_label', 'Comprar entrades'),
('poi_malaga_alcazaba', 'poi', 'ru', 'name', 'Алькасаба Малаги'),
('poi_malaga_alcazaba', 'poi', 'ru', 'description', 'Мавританская дворцовая крепость XI века, лучше всего сохранившаяся в Испании. Сады, дворики с видом на море и Римский театр у подножия.'),
('poi_malaga_alcazaba', 'poi', 'ru', 'cta_label', 'Купить билеты'),

('poi_malaga_gibralfaro', 'poi', 'ca', 'name', 'Castell de Gibralfaro'),
('poi_malaga_gibralfaro', 'poi', 'ca', 'description', 'Fortalesa militar del segle XIV al cim del mateix nom, connectada a l''Alcazaba per una muralla. Les vistes de 360° de la ciutat són les millors de Màlaga.'),
('poi_malaga_gibralfaro', 'poi', 'ca', 'cta_label', 'Comprar entrades'),
('poi_malaga_gibralfaro', 'poi', 'ru', 'name', 'Замок Хибральфаро'),
('poi_malaga_gibralfaro', 'poi', 'ru', 'description', 'Военная крепость XIV века на одноимённом холме, соединённая с Алькасабой крепостной стеной. Панорамный вид на 360° — лучший в Малаге.'),
('poi_malaga_gibralfaro', 'poi', 'ru', 'cta_label', 'Купить билеты'),

('poi_malaga_catedral', 'poi', 'ca', 'name', 'Catedral de Màlaga ("La Manquita")'),
('poi_malaga_catedral', 'poi', 'ca', 'description', 'Catedral renaixentista famosa per la seva torre inacabada, d''aquí el sobrenom "la Manquita". La pujada a les cobertes ofereix una vista única del centre històric.'),
('poi_malaga_catedral', 'poi', 'ca', 'cta_label', 'Comprar entrades'),
('poi_malaga_catedral', 'poi', 'ru', 'name', 'Собор Малаги ("Ла-Манкита")'),
('poi_malaga_catedral', 'poi', 'ru', 'description', 'Ренессансный собор, знаменитый своей недостроенной башней, отсюда и прозвище "однорукая". Подъём на крышу открывает уникальный вид на исторический центр.'),
('poi_malaga_catedral', 'poi', 'ru', 'cta_label', 'Купить билеты'),

('poi_malaga_museo_picasso', 'poi', 'ca', 'name', 'Museu Picasso Màlaga'),
('poi_malaga_museo_picasso', 'poi', 'ca', 'description', 'Més de 200 obres de l''artista malagueny al Palau de Buenavista, donades per la família Picasso. Imprescindible per entendre la seva evolució artística.'),
('poi_malaga_museo_picasso', 'poi', 'ca', 'cta_label', 'Comprar entrades'),
('poi_malaga_museo_picasso', 'poi', 'ru', 'name', 'Музей Пикассо в Малаге'),
('poi_malaga_museo_picasso', 'poi', 'ru', 'description', 'Более 200 работ художника, родившегося в Малаге, во дворце Буэнависта, подаренных семьёй Пикассо. Обязательно к посещению, чтобы понять его творческую эволюцию.'),
('poi_malaga_museo_picasso', 'poi', 'ru', 'cta_label', 'Купить билеты'),

('poi_malaga_casa_natal_picasso', 'poi', 'ca', 'name', 'Casa Natal de Picasso'),
('poi_malaga_casa_natal_picasso', 'poi', 'ca', 'description', 'L''habitatge on va néixer Pablo Picasso el 1881, a la Plaza de la Merced. Mobles d''època, obra primerenca i objectes personals de la família.'),
('poi_malaga_casa_natal_picasso', 'poi', 'ca', 'cta_label', 'Comprar entrades'),
('poi_malaga_casa_natal_picasso', 'poi', 'ru', 'name', 'Дом-музей рождения Пикассо'),
('poi_malaga_casa_natal_picasso', 'poi', 'ru', 'description', 'Дом, где в 1881 году родился Пабло Пикассо, на площади Мерсед. Мебель того времени, ранние работы и личные вещи семьи.'),
('poi_malaga_casa_natal_picasso', 'poi', 'ru', 'cta_label', 'Купить билеты'),

('poi_malaga_pompidou', 'poi', 'ca', 'name', 'Centre Pompidou Màlaga'),
('poi_malaga_pompidou', 'poi', 'ca', 'description', 'L''única seu del Pompidou fora de França, reconeixible pel seu cub de vidre de colors al port. Art modern i contemporani de la col·lecció parisenca.'),
('poi_malaga_pompidou', 'poi', 'ca', 'cta_label', 'Comprar entrades'),
('poi_malaga_pompidou', 'poi', 'ru', 'name', 'Центр Помпиду Малага'),
('poi_malaga_pompidou', 'poi', 'ru', 'description', 'Единственный филиал центра Помпиду за пределами Франции, узнаваемый по разноцветному стеклянному кубу в порту. Современное искусство из парижской коллекции.'),
('poi_malaga_pompidou', 'poi', 'ru', 'cta_label', 'Купить билеты'),

('poi_malaga_thyssen', 'poi', 'ca', 'name', 'Museu Carmen Thyssen Màlaga'),
('poi_malaga_thyssen', 'poi', 'ca', 'description', 'Pintura espanyola del segle XIX, amb especial pes en l''escola andalusa i el costumisme, en un petit palau renaixentista del centre històric.'),
('poi_malaga_thyssen', 'poi', 'ca', 'cta_label', 'Comprar entrades'),
('poi_malaga_thyssen', 'poi', 'ru', 'name', 'Музей Кармен Тиссен Малага'),
('poi_malaga_thyssen', 'poi', 'ru', 'description', 'Испанская живопись XIX века с акцентом на андалузскую школу и бытовой жанр, в ренессансном дворце исторического центра.'),
('poi_malaga_thyssen', 'poi', 'ru', 'cta_label', 'Купить билеты'),

('poi_malaga_concepcion', 'poi', 'ca', 'name', 'Jardí Botànic-Històric La Concepción'),
('poi_malaga_concepcion', 'poi', 'ca', 'description', 'Jardí subtropical del segle XIX declarat Bé d''Interès Cultural, amb més de 25 hectàrees, palmeres centenàries i un jaciment megalític.'),
('poi_malaga_concepcion', 'poi', 'ca', 'cta_label', 'Comprar entrades'),
('poi_malaga_concepcion', 'poi', 'ru', 'name', 'Ботанический сад Ла-Консепсьон'),
('poi_malaga_concepcion', 'poi', 'ru', 'description', 'Субтропический сад XIX века, признанный памятником культуры, площадью более 25 гектаров, с вековыми пальмами и мегалитическим памятником.'),
('poi_malaga_concepcion', 'poi', 'ru', 'cta_label', 'Купить билеты'),

('poi_malaga_museo_automovilistico', 'poi', 'ca', 'name', 'Museu de l''Automòbil i de la Moda'),
('poi_malaga_museo_automovilistico', 'poi', 'ca', 'description', 'Col·lecció única que combina cotxes clàssics d''època amb alta costura i barrets, en una antiga fàbrica de tabac reconvertida.'),
('poi_malaga_museo_automovilistico', 'poi', 'ca', 'cta_label', 'Comprar entrades'),
('poi_malaga_museo_automovilistico', 'poi', 'ru', 'name', 'Музей автомобилей и моды'),
('poi_malaga_museo_automovilistico', 'poi', 'ru', 'description', 'Уникальная коллекция, объединяющая классические ретро-автомобили с высокой модой и шляпами, в здании бывшей табачной фабрики.'),
('poi_malaga_museo_automovilistico', 'poi', 'ru', 'cta_label', 'Купить билеты'),

-- ════════════════════════════════════════
-- TORREMOLINOS — FREE
-- ════════════════════════════════════════
('poi_torremolinos_san_miguel', 'poi', 'ca', 'name', 'Carrer San Miguel'),
('poi_torremolinos_san_miguel', 'poi', 'ca', 'description', 'Carrer comercial per a vianants del centre, cor de Torremolinos des dels anys 60. Botigues, geladeries i ambient animat tot el dia.'),
('poi_torremolinos_san_miguel', 'poi', 'ca', 'short_tip', 'Punt de partida perfecte cap a la Cuesta del Tajo'),
('poi_torremolinos_san_miguel', 'poi', 'ru', 'name', 'Улица Сан-Мигель'),
('poi_torremolinos_san_miguel', 'poi', 'ru', 'description', 'Пешеходная торговая улица в центре, сердце Торремолиноса с 1960-х годов. Магазины, кафе-мороженое и оживлённая атмосфера весь день.'),
('poi_torremolinos_san_miguel', 'poi', 'ru', 'short_tip', 'Отличная отправная точка к улице Куэста-дель-Тахо'),

('poi_torremolinos_cuesta_tajo', 'poi', 'ca', 'name', 'Cuesta del Tajo'),
('poi_torremolinos_cuesta_tajo', 'poi', 'ca', 'description', 'Antic carrer-barranc que baixa des del centre fins a la platja de La Carihuela, amb vistes al mar i cases emblanquinades tradicionals.'),
('poi_torremolinos_cuesta_tajo', 'poi', 'ca', 'short_tip', 'La baixada és fàcil, la pujada té força pendent'),
('poi_torremolinos_cuesta_tajo', 'poi', 'ru', 'name', 'Куэста-дель-Тахо'),
('poi_torremolinos_cuesta_tajo', 'poi', 'ru', 'description', 'Старинная улица-овраг, спускающаяся от центра к пляжу Ла-Карихуэла, с видом на море и традиционными белёными домами.'),
('poi_torremolinos_cuesta_tajo', 'poi', 'ru', 'short_tip', 'Спуск лёгкий, а подъём обратно довольно крутой'),

('poi_torremolinos_torre_pimentel', 'poi', 'ca', 'name', 'Torre de Pimentel (Torre dels Molins)'),
('poi_torremolinos_torre_pimentel', 'poi', 'ca', 'description', 'Torre de guaita del segle XV que dona nom a la ciutat ("Torre de los Molinos"). Una de les poques restes històriques visibles del Torremolinos anterior al turisme.'),
('poi_torremolinos_torre_pimentel', 'poi', 'ca', 'short_tip', 'Petita però amb molta història — fàcil de combinar amb la Cuesta del Tajo'),
('poi_torremolinos_torre_pimentel', 'poi', 'ru', 'name', 'Башня Пиментель (Башня мельниц)'),
('poi_torremolinos_torre_pimentel', 'poi', 'ru', 'description', 'Сторожевая башня XV века, давшая название городу ("Башня мельниц"). Один из немногих сохранившихся исторических памятников Торремолиноса до эпохи туризма.'),
('poi_torremolinos_torre_pimentel', 'poi', 'ru', 'short_tip', 'Небольшая, но с богатой историей — легко совместить с Куэста-дель-Тахо'),

('poi_torremolinos_carihuela', 'poi', 'ca', 'name', 'Barri de La Carihuela'),
('poi_torremolinos_carihuela', 'poi', 'ca', 'description', 'Antic barri de pescadors vora el mar, avui ple de restaurants de peix fresc i xiringuitos. El passeig marítim més autèntic de Torremolinos.'),
('poi_torremolinos_carihuela', 'poi', 'ca', 'short_tip', 'Tasta els "boquerones victorianos", especialitat local d''anxoves fregides'),
('poi_torremolinos_carihuela', 'poi', 'ru', 'name', 'Квартал Ла-Карихуэла'),
('poi_torremolinos_carihuela', 'poi', 'ru', 'description', 'Бывший рыбацкий квартал у моря, сегодня полон ресторанов свежей рыбы и пляжных баров. Самая аутентичная набережная Торремолиноса.'),
('poi_torremolinos_carihuela', 'poi', 'ru', 'short_tip', 'Попробуйте "boquerones victorianos" — местное блюдо из жареных анчоусов'),

('poi_torremolinos_bajondillo', 'poi', 'ca', 'name', 'Platja del Bajondillo'),
('poi_torremolinos_bajondillo', 'poi', 'ca', 'description', 'Una de les platges més cèntriques i concorregudes de Torremolinos, amb tots els serveis i accés fàcil des del centre.'),
('poi_torremolinos_bajondillo', 'poi', 'ca', 'short_tip', 'Molt concorreguda a l''estiu — arriba d''hora si vols lloc'),
('poi_torremolinos_bajondillo', 'poi', 'ru', 'name', 'Пляж Бахондильо'),
('poi_torremolinos_bajondillo', 'poi', 'ru', 'description', 'Один из самых центральных и популярных пляжей Торремолиноса, со всеми удобствами и лёгким доступом из центра.'),
('poi_torremolinos_bajondillo', 'poi', 'ru', 'short_tip', 'Летом очень многолюдно — приходите пораньше, чтобы занять место'),

('poi_torremolinos_bateria', 'poi', 'ca', 'name', 'Parque de la Batería'),
('poi_torremolinos_bateria', 'poi', 'ca', 'description', 'Parc costaner amb una antiga torre-mirador i jardins sobre el penya-segat. Un racó tranquil lluny del bullici, amb vistes al mar.'),
('poi_torremolinos_bateria', 'poi', 'ca', 'short_tip', 'Ideal per a un passeig tranquil al capvespre'),
('poi_torremolinos_bateria', 'poi', 'ru', 'name', 'Парк Батерия'),
('poi_torremolinos_bateria', 'poi', 'ru', 'description', 'Прибрежный парк со старой сторожевой башней и садами над обрывом. Тихий уголок вдали от суеты с видом на море.'),
('poi_torremolinos_bateria', 'poi', 'ru', 'short_tip', 'Отлично подходит для спокойной прогулки на закате'),

('poi_torremolinos_molino_inca', 'poi', 'ca', 'name', 'Jardí Botànic Molino de Inca'),
('poi_torremolinos_molino_inca', 'poi', 'ca', 'description', 'Antiga font i molí d''aigua reconvertit en un frondós jardí botànic gratuït, amb estanys, cascades i ocells. Un oasi verd poc conegut pels turistes.'),
('poi_torremolinos_molino_inca', 'poi', 'ca', 'short_tip', 'Entrada gratuïta — perfecte per escapar de la calor a l''estiu'),
('poi_torremolinos_molino_inca', 'poi', 'ru', 'name', 'Ботанический сад Молино-де-Инка'),
('poi_torremolinos_molino_inca', 'poi', 'ru', 'description', 'Старинный источник и водяная мельница, превращённые в пышный бесплатный ботанический сад с прудами, водопадами и птицами. Зелёный оазис, о котором мало кто из туристов знает.'),
('poi_torremolinos_molino_inca', 'poi', 'ru', 'short_tip', 'Бесплатный вход — отличное место, чтобы спастись от летней жары'),

-- ════════════════════════════════════════
-- TORREMOLINOS — PREMIUM
-- ════════════════════════════════════════
('poi_torremolinos_cocodrilos', 'poi', 'ca', 'name', 'Cocodrilos Park'),
('poi_torremolinos_cocodrilos', 'poi', 'ca', 'description', 'L''únic parc de cocodrils d''Espanya, amb més de 300 exemplars. Inclou zona de rèptils, exhibicions i la possibilitat d''agafar una cria de cocodril.'),
('poi_torremolinos_cocodrilos', 'poi', 'ca', 'cta_label', 'Comprar entrades'),
('poi_torremolinos_cocodrilos', 'poi', 'ru', 'name', 'Парк крокодилов'),
('poi_torremolinos_cocodrilos', 'poi', 'ru', 'description', 'Единственный крокодиловый парк в Испании, с более чем 300 особями. Включает террариум, шоу и возможность подержать детёныша крокодила.'),
('poi_torremolinos_cocodrilos', 'poi', 'ru', 'cta_label', 'Купить билеты'),

('poi_torremolinos_aqualand', 'poi', 'ca', 'name', 'Aqualand Torremolinos'),
('poi_torremolinos_aqualand', 'poi', 'ca', 'description', 'El parc aquàtic més gran de la Costa del Sol occidental, amb tobogans, piscina d''onades i zona infantil. Única seu de la cadena en aquesta part de la costa.'),
('poi_torremolinos_aqualand', 'poi', 'ca', 'cta_label', 'Comprar entrades'),
('poi_torremolinos_aqualand', 'poi', 'ru', 'name', 'Аквапарк Торремолинос'),
('poi_torremolinos_aqualand', 'poi', 'ru', 'description', 'Крупнейший аквапарк западного побережья Коста-дель-Соль с горками, бассейном с волнами и детской зоной. Единственный парк этой сети на этом участке побережья.'),
('poi_torremolinos_aqualand', 'poi', 'ru', 'cta_label', 'Купить билеты'),

-- ════════════════════════════════════════
-- BENALMÁDENA
-- ════════════════════════════════════════
('poi_benalmadena_parque_paloma', 'poi', 'ca', 'name', 'Parque de la Paloma'),
('poi_benalmadena_parque_paloma', 'poi', 'ca', 'description', 'Extens parc urbà amb llacs, fauna lliure (paons, conills, oques) i zones de pícnic. Ideal per a un matí en família. Entrada gratuïta.'),
('poi_benalmadena_parque_paloma', 'poi', 'ca', 'short_tip', 'Visita a l''alba per veure els paons despertar-se'),
('poi_benalmadena_parque_paloma', 'poi', 'ru', 'name', 'Парк Ла-Палома'),
('poi_benalmadena_parque_paloma', 'poi', 'ru', 'description', 'Большой городской парк с озёрами, свободно гуляющими животными (павлины, кролики, гуси) и зонами для пикника. Идеально для семейного утра. Бесплатный вход.'),
('poi_benalmadena_parque_paloma', 'poi', 'ru', 'short_tip', 'Приходите на рассвете, чтобы увидеть, как просыпаются павлины'),

('poi_benalmadena_puerto_marina', 'poi', 'ca', 'name', 'Puerto Marina'),
('poi_benalmadena_puerto_marina', 'poi', 'ca', 'description', 'Un dels ports esportius més bonics d''Europa, amb més de 1.000 amarratges. Passeig marítim amb restaurants, terrasses i botigues. Ambient animat fins a la matinada.'),
('poi_benalmadena_puerto_marina', 'poi', 'ca', 'short_tip', 'Els restaurants amb terrassa sobre el mar són imprescindibles al capvespre'),
('poi_benalmadena_puerto_marina', 'poi', 'ru', 'name', 'Пуэрто-Марина'),
('poi_benalmadena_puerto_marina', 'poi', 'ru', 'description', 'Одна из самых красивых марин Европы, с более чем 1000 причальных мест. Набережная с ресторанами, террасами и магазинами. Оживлённая атмосфера до поздней ночи.'),
('poi_benalmadena_puerto_marina', 'poi', 'ru', 'short_tip', 'Рестораны с террасами у воды особенно хороши на закате'),

('poi_benalmadena_colomares', 'poi', 'ca', 'name', 'Castillo de Colomares'),
('poi_benalmadena_colomares', 'poi', 'ca', 'description', 'Monument únic dedicat a Cristòfor Colom i al descobriment d''Amèrica. Barreja estils romànic, gòtic, mudèjar i bizantí. Alberga l''església més petita del món segons el Guinness.'),
('poi_benalmadena_colomares', 'poi', 'ca', 'short_tip', 'La capella interior té capacitat per a una persona — perfecta per a la foto més original'),
('poi_benalmadena_colomares', 'poi', 'ru', 'name', 'Замок Коломарес'),
('poi_benalmadena_colomares', 'poi', 'ru', 'description', 'Уникальный памятник, посвящённый Христофору Колумбу и открытию Америки. Сочетает романский, готический, мудехарский и византийский стили. По данным Книги рекордов Гиннесса, здесь находится самая маленькая церковь в мире.'),
('poi_benalmadena_colomares', 'poi', 'ru', 'short_tip', 'Внутренняя часовня вмещает всего одного человека — идеально для самого оригинального фото'),

('poi_benalmadena_stupa', 'poi', 'ca', 'name', 'Estupa de la Il·luminació'),
('poi_benalmadena_stupa', 'poi', 'ca', 'description', 'Una de les estupes budistes més grans d''Europa Occidental (33 m d''alçada). Construïda el 2003, ofereix vistes panoràmiques espectaculars a la costa i un ambient de pau únic.'),
('poi_benalmadena_stupa', 'poi', 'ca', 'short_tip', 'Les vistes al Mediterrani des d''aquí són de les millors de tota la zona'),
('poi_benalmadena_stupa', 'poi', 'ru', 'name', 'Ступа Просветления'),
('poi_benalmadena_stupa', 'poi', 'ru', 'description', 'Одна из крупнейших буддийских ступ в Западной Европе (высотой 33 м). Построена в 2003 году, открывает впечатляющий панорамный вид на побережье и уникальную умиротворяющую атмосферу.'),
('poi_benalmadena_stupa', 'poi', 'ru', 'short_tip', 'Вид на Средиземное море отсюда — один из лучших во всей округе'),

('poi_benalmadena_malapesquera', 'poi', 'ca', 'name', 'Platja de Malapesquera'),
('poi_benalmadena_malapesquera', 'poi', 'ca', 'description', 'Platja de bandera blava amb sorra fina i aigües tranquil·les. Compta amb xiringuitos, dutxes, gandules i vigilància en temporada. Perfecta per gaudir dels espetos andalusos.'),
('poi_benalmadena_malapesquera', 'poi', 'ca', 'short_tip', 'Els espetos de sardines al xiringuito són obligatoris'),
('poi_benalmadena_malapesquera', 'poi', 'ru', 'name', 'Пляж Малапескера'),
('poi_benalmadena_malapesquera', 'poi', 'ru', 'description', 'Пляж с голубым флагом, мелким песком и спокойной водой. Есть пляжные бары, душевые, шезлонги и спасатели в сезон. Идеально, чтобы попробовать андалузские эспетос.'),
('poi_benalmadena_malapesquera', 'poi', 'ru', 'short_tip', 'Шпажки с сардинами в пляжном баре — must-try'),

('poi_benalmadena_pueblo', 'poi', 'ca', 'name', 'Benalmádena Pueblo'),
('poi_benalmadena_pueblo', 'poi', 'ca', 'description', 'El nucli antic: carrers empedrats, cases blanques amb testos de colors i miradors amb vistes espectaculars al mar. No et perdis el Museu d''Art Precolombí i l''Església de Santo Domingo.'),
('poi_benalmadena_pueblo', 'poi', 'ca', 'short_tip', 'El mirador al costat de l''església de Santo Domingo té la millor posta de sol de la Costa del Sol'),
('poi_benalmadena_pueblo', 'poi', 'ru', 'name', 'Старый город Бенальмадены'),
('poi_benalmadena_pueblo', 'poi', 'ru', 'description', 'Исторический центр: мощёные улочки, белые дома с цветными горшками и смотровые площадки с потрясающим видом на море. Не пропустите Музей доколумбова искусства и церковь Санто-Доминго.'),
('poi_benalmadena_pueblo', 'poi', 'ru', 'short_tip', 'Смотровая площадка у церкви Санто-Доминго — лучшее место для заката на всём побережье Коста-дель-Соль'),

('poi_benalmadena_plaza_espana', 'poi', 'ca', 'name', 'Plaza de España (Benalmádena Pueblo)'),
('poi_benalmadena_plaza_espana', 'poi', 'ca', 'description', 'Plaça central del nucli antic, punt de trobada amb terrasses, a prop de l''Església de Santo Domingo i amb vistes a la vall. Ideal per començar la visita al poble.'),
('poi_benalmadena_plaza_espana', 'poi', 'ca', 'short_tip', 'Bon punt de referència per aparcar i explorar el poble a peu'),
('poi_benalmadena_plaza_espana', 'poi', 'ru', 'name', 'Пласа-де-Эспанья (Бенальмадена Пуэбло)'),
('poi_benalmadena_plaza_espana', 'poi', 'ru', 'description', 'Центральная площадь старого города, место встреч с террасами, рядом с церковью Санто-Доминго и видом на долину. Идеальное место, чтобы начать осмотр посёлка.'),
('poi_benalmadena_plaza_espana', 'poi', 'ru', 'short_tip', 'Удобный ориентир, чтобы припарковаться и гулять по посёлку пешком'),

('poi_benalmadena_teleferico', 'poi', 'ca', 'name', 'Telefèric de Benalmádena'),
('poi_benalmadena_teleferico', 'poi', 'ca', 'description', 'Puja en 15 min als 769 m del Monte Calamorro per gaudir de vistes a tota la Costa del Sol, Gibraltar i el nord d''Àfrica. A dalt: exhibicions d''aus rapinyaires i rutes de senderisme. Únic a la costa.'),
('poi_benalmadena_teleferico', 'poi', 'ca', 'cta_label', 'Comprar entrades'),
('poi_benalmadena_teleferico', 'poi', 'ru', 'name', 'Канатная дорога Бенальмадены'),
('poi_benalmadena_teleferico', 'poi', 'ru', 'description', 'За 15 минут поднимитесь на вершину горы Каламорро (769 м) с видом на всё побережье Коста-дель-Соль, Гибралтар и Северную Африку. Наверху: шоу хищных птиц и пешие маршруты. Уникальный аттракцион на этом побережье.'),
('poi_benalmadena_teleferico', 'poi', 'ru', 'cta_label', 'Купить билеты'),

('poi_benalmadena_mariposario', 'poi', 'ca', 'name', 'Mariposario de Benalmádena'),
('poi_benalmadena_mariposario', 'poi', 'ca', 'description', 'Un dels mariposaris més grans d''Europa, amb milers de papallones tropicals volant lliures en un hivernacle al costat de l''Estupa Budista.'),
('poi_benalmadena_mariposario', 'poi', 'ca', 'cta_label', 'Comprar entrades'),
('poi_benalmadena_mariposario', 'poi', 'ru', 'name', 'Парк бабочек Бенальмадены'),
('poi_benalmadena_mariposario', 'poi', 'ru', 'description', 'Один из крупнейших парков бабочек в Европе — тысячи тропических бабочек свободно летают в оранжерее рядом с буддийской ступой.'),
('poi_benalmadena_mariposario', 'poi', 'ru', 'cta_label', 'Купить билеты'),

('poi_benalmadena_selwo_marina', 'poi', 'ca', 'name', 'Selwo Marina'),
('poi_benalmadena_selwo_marina', 'poi', 'ca', 'description', 'Parc marí amb delfinari, colònia de pingüins i ocells exòtics, al costat del port de Benalmádena. L''únic parc d''aquest tipus a la zona.'),
('poi_benalmadena_selwo_marina', 'poi', 'ca', 'cta_label', 'Comprar entrades'),
('poi_benalmadena_selwo_marina', 'poi', 'ru', 'name', 'Selwo Marina'),
('poi_benalmadena_selwo_marina', 'poi', 'ru', 'description', 'Морской парк с дельфинарием, колонией пингвинов и экзотическими птицами, рядом с портом Бенальмадены. Единственный парк такого типа в этом районе.'),
('poi_benalmadena_selwo_marina', 'poi', 'ru', 'cta_label', 'Купить билеты'),

-- ════════════════════════════════════════
-- FUENGIROLA — FREE
-- ════════════════════════════════════════
('poi_fuengirola_castillo_sohail', 'poi', 'ca', 'name', 'Castell Sohail'),
('poi_fuengirola_castillo_sohail', 'poi', 'ca', 'description', 'Fortalesa àrab del segle X a la desembocadura del riu Fuengirola, reconstruïda després d''un terratrèmol al segle XVIII. El recinte exterior es visita gratis; avui acull concerts.'),
('poi_fuengirola_castillo_sohail', 'poi', 'ca', 'short_tip', 'A l''estiu s''hi fan concerts — consulta la cartellera'),
('poi_fuengirola_castillo_sohail', 'poi', 'ru', 'name', 'Замок Сохаиль'),
('poi_fuengirola_castillo_sohail', 'poi', 'ru', 'description', 'Мавританская крепость X века у устья реки Фуэнхирола, восстановленная после землетрясения в XVIII веке. Внешняя территория открыта бесплатно; сегодня здесь проходят концерты.'),
('poi_fuengirola_castillo_sohail', 'poi', 'ru', 'short_tip', 'Летом внутри замка проходят концерты — проверьте афишу'),

('poi_fuengirola_paseo_maritimo', 'poi', 'ca', 'name', 'Passeig Marítim Rey de España'),
('poi_fuengirola_paseo_maritimo', 'poi', 'ca', 'description', 'Un dels passeigs marítims més llargs de la Costa del Sol (més de 7 km), que recorre tota la façana de platges de Fuengirola.'),
('poi_fuengirola_paseo_maritimo', 'poi', 'ca', 'short_tip', 'Perfecte per córrer o anar en bici a l''alba'),
('poi_fuengirola_paseo_maritimo', 'poi', 'ru', 'name', 'Набережная Рей-де-Эспанья'),
('poi_fuengirola_paseo_maritimo', 'poi', 'ru', 'description', 'Одна из самых длинных набережных на Коста-дель-Соль (более 7 км), проходящая вдоль всех пляжей Фуэнхиролы.'),
('poi_fuengirola_paseo_maritimo', 'poi', 'ru', 'short_tip', 'Отлично подходит для утренней пробежки или велопрогулки на рассвете'),

('poi_fuengirola_casco_antiguo', 'poi', 'ca', 'name', 'Nucli Antic de Fuengirola'),
('poi_fuengirola_casco_antiguo', 'poi', 'ca', 'description', 'Carrers per a vianants al voltant de la Plaza de la Constitución, amb comerç local, mercat dels dimarts i tapes tradicionals.'),
('poi_fuengirola_casco_antiguo', 'poi', 'ca', 'short_tip', 'El mercat dels dimarts al recinte firal és molt popular'),
('poi_fuengirola_casco_antiguo', 'poi', 'ru', 'name', 'Старый город Фуэнхиролы'),
('poi_fuengirola_casco_antiguo', 'poi', 'ru', 'description', 'Пешеходные улицы вокруг площади Конститусьон с местными магазинами, рынком по вторникам и традиционными тапас-барами.'),
('poi_fuengirola_casco_antiguo', 'poi', 'ru', 'short_tip', 'Рынок по вторникам на ярмарочной площади очень популярен'),

('poi_fuengirola_parque_fluvial', 'poi', 'ca', 'name', 'Parc Fluvial del Riu Fuengirola'),
('poi_fuengirola_parque_fluvial', 'poi', 'ca', 'description', 'Corredor verd vora la llera del riu, amb carril bici i zones d''ombra. Una escapada tranquil·la lluny de la platja, poc coneguda pels visitants.'),
('poi_fuengirola_parque_fluvial', 'poi', 'ca', 'short_tip', 'Connecta a peu o en bici amb el Bioparc i el Castell Sohail'),
('poi_fuengirola_parque_fluvial', 'poi', 'ru', 'name', 'Речной парк реки Фуэнхирола'),
('poi_fuengirola_parque_fluvial', 'poi', 'ru', 'description', 'Зелёный коридор вдоль русла реки, с велодорожкой и тенистыми зонами. Тихое место вдали от пляжа, малоизвестное туристам.'),
('poi_fuengirola_parque_fluvial', 'poi', 'ru', 'short_tip', 'Соединяет пешком или на велосипеде с Биопарком и замком Сохаиль'),

('poi_fuengirola_boliches', 'poi', 'ca', 'name', 'Los Boliches'),
('poi_fuengirola_boliches', 'poi', 'ca', 'description', 'Antic barri de pescadors avui integrat a Fuengirola, amb carrers estrets, església pròpia i bon ambient de tapes vora el mar.'),
('poi_fuengirola_boliches', 'poi', 'ca', 'short_tip', 'Menys turístic que el centre — bona opció per menjar peix fresc'),
('poi_fuengirola_boliches', 'poi', 'ru', 'name', 'Лос-Боличес'),
('poi_fuengirola_boliches', 'poi', 'ru', 'description', 'Бывший рыбацкий квартал, сегодня часть Фуэнхиролы, с узкими улочками, собственной церковью и отличной атмосферой тапас-баров у моря.'),
('poi_fuengirola_boliches', 'poi', 'ru', 'short_tip', 'Менее туристический, чем центр — хороший вариант для свежей рыбы'),

('poi_fuengirola_santa_amalia', 'poi', 'ca', 'name', 'Platja de Santa Amalia'),
('poi_fuengirola_santa_amalia', 'poi', 'ca', 'description', 'Platja urbana àmplia i ben equipada, amb bandera blava, xiringuitos i tots els serveis. Una de les preferides per les famílies.'),
('poi_fuengirola_santa_amalia', 'poi', 'ca', 'short_tip', 'Bona opció amb nens per l''accés fàcil i les aigües tranquil·les'),
('poi_fuengirola_santa_amalia', 'poi', 'ru', 'name', 'Пляж Санта-Амалия'),
('poi_fuengirola_santa_amalia', 'poi', 'ru', 'description', 'Просторный, хорошо оборудованный городской пляж с голубым флагом, пляжными барами и всеми удобствами. Один из любимых у семей с детьми.'),
('poi_fuengirola_santa_amalia', 'poi', 'ru', 'short_tip', 'Хороший вариант с детьми благодаря лёгкому доступу и спокойной воде'),

-- ════════════════════════════════════════
-- FUENGIROLA — PREMIUM
-- ════════════════════════════════════════
('poi_fuengirola_bioparc', 'poi', 'ca', 'name', 'Bioparc Fuengirola'),
('poi_fuengirola_bioparc', 'poi', 'ca', 'description', 'Zoo d''immersió (sense gàbies ni reixes visibles) amb més de 200 espècies, moltes en perill d''extinció. Top 10 d''atraccions de la província de Màlaga a TripAdvisor.'),
('poi_fuengirola_bioparc', 'poi', 'ca', 'cta_label', 'Comprar entrades'),
('poi_fuengirola_bioparc', 'poi', 'ru', 'name', 'Биопарк Фуэнхирола'),
('poi_fuengirola_bioparc', 'poi', 'ru', 'description', 'Зоопарк без видимых клеток и решёток, с более чем 200 видами животных, многие из которых находятся под угрозой исчезновения. Входит в топ-10 достопримечательностей провинции Малага по версии TripAdvisor.'),
('poi_fuengirola_bioparc', 'poi', 'ru', 'cta_label', 'Купить билеты'),

-- ════════════════════════════════════════
-- MIJAS — FREE
-- ════════════════════════════════════════
('poi_mijas_casco_antiguo', 'poi', 'ca', 'name', 'Nucli Antic de Mijas Pueblo'),
('poi_mijas_casco_antiguo', 'poi', 'ca', 'description', 'El poble blanc enfilat a la serra, amb carrers empedrats, testos de geranis i vistes al Mediterrani. Un dels pobles amb més encant de la Costa del Sol.'),
('poi_mijas_casco_antiguo', 'poi', 'ca', 'short_tip', 'Aparca a l''entrada del poble — el centre és totalment per a vianants'),
('poi_mijas_casco_antiguo', 'poi', 'ru', 'name', 'Старый город Михас-Пуэбло'),
('poi_mijas_casco_antiguo', 'poi', 'ru', 'description', 'Белая деревня, примостившаяся в горах, с мощёными улочками, горшками с геранью и видом на Средиземное море. Одна из самых очаровательных деревень Коста-дель-Соль.'),
('poi_mijas_casco_antiguo', 'poi', 'ru', 'short_tip', 'Оставьте машину на въезде в деревню — центр полностью пешеходный'),

('poi_mijas_mirador_compas', 'poi', 'ca', 'name', 'Mirador del Compás'),
('poi_mijas_mirador_compas', 'poi', 'ca', 'description', 'Balcó natural amb vistes espectaculars a Fuengirola, la costa i, en dies clars, fins a l''Àfrica. Un dels millors miradors gratuïts de la zona.'),
('poi_mijas_mirador_compas', 'poi', 'ca', 'short_tip', 'Els dies clars d''hivern ofereixen la millor visibilitat'),
('poi_mijas_mirador_compas', 'poi', 'ru', 'name', 'Смотровая площадка Мирадор-дель-Компас'),
('poi_mijas_mirador_compas', 'poi', 'ru', 'description', 'Природный балкон со впечатляющим видом на Фуэнхиролу, побережье, а в ясные дни — даже на Африку. Одна из лучших бесплатных смотровых площадок в округе.'),
('poi_mijas_mirador_compas', 'poi', 'ru', 'short_tip', 'Ясные зимние дни дают лучшую видимость'),

('poi_mijas_jardines_muralla', 'poi', 'ca', 'name', 'Jardins de la Muralla'),
('poi_mijas_jardines_muralla', 'poi', 'ca', 'description', 'Jardins esglaonats construïts sobre les restes de l''antiga muralla àrab del poble, amb miradors i vegetació mediterrània.'),
('poi_mijas_jardines_muralla', 'poi', 'ca', 'short_tip', 'Un passeig curt però amb molt encant, ideal abans o després de dinar'),
('poi_mijas_jardines_muralla', 'poi', 'ru', 'name', 'Сады Мурайя'),
('poi_mijas_jardines_muralla', 'poi', 'ru', 'description', 'Террасные сады, построенные на остатках старой арабской стены посёлка, со смотровыми площадками и средиземноморской растительностью.'),
('poi_mijas_jardines_muralla', 'poi', 'ru', 'short_tip', 'Короткая, но очаровательная прогулка — отлично до или после обеда'),

('poi_mijas_ermita_peña', 'poi', 'ca', 'name', 'Ermita de la Virgen de la Peña'),
('poi_mijas_ermita_peña', 'poi', 'ca', 'description', 'Petita ermita excavada directament a la roca, dedicada a la patrona de Mijas. Una de les joies més singulars del poble.'),
('poi_mijas_ermita_peña', 'poi', 'ca', 'short_tip', 'Entrada gratuïta — visita ràpida però molt especial'),
('poi_mijas_ermita_peña', 'poi', 'ru', 'name', 'Часовня Девы Пенья'),
('poi_mijas_ermita_peña', 'poi', 'ru', 'description', 'Небольшая часовня, высеченная прямо в скале, посвящённая покровительнице Михаса. Одна из самых необычных жемчужин посёлка.'),
('poi_mijas_ermita_peña', 'poi', 'ru', 'short_tip', 'Бесплатный вход — короткое, но очень особенное посещение'),

('poi_mijas_plaza_virgen_peña', 'poi', 'ca', 'name', 'Plaza Virgen de la Peña'),
('poi_mijas_plaza_virgen_peña', 'poi', 'ca', 'description', 'Plaça principal del poble, punt de partida dels burro-taxi i amb les millors vistes a la vall des del seu balcó.'),
('poi_mijas_plaza_virgen_peña', 'poi', 'ca', 'short_tip', 'Punt de trobada habitual — tot és fàcil de localitzar des d''aquí'),
('poi_mijas_plaza_virgen_peña', 'poi', 'ru', 'name', 'Площадь Девы Пенья'),
('poi_mijas_plaza_virgen_peña', 'poi', 'ru', 'description', 'Главная площадь посёлка, отправная точка ослиных такси, с лучшим видом на долину с её балкона.'),
('poi_mijas_plaza_virgen_peña', 'poi', 'ru', 'short_tip', 'Привычное место встреч — отсюда легко найти всё остальное'),

('poi_mijas_cac', 'poi', 'ca', 'name', 'CAC Mijas (Centre d''Art Contemporani)'),
('poi_mijas_cac', 'poi', 'ca', 'description', 'Col·lecció permanent que inclou obres originals de Picasso, Dalí i Miró, amb entrada gratuïta. Sorprenent per a un poble d''aquesta mida.'),
('poi_mijas_cac', 'poi', 'ca', 'short_tip', 'Entrada gratuïta — imprescindible encara que no t''agradin els museus'),
('poi_mijas_cac', 'poi', 'ru', 'name', 'CAC Михас (Центр современного искусства)'),
('poi_mijas_cac', 'poi', 'ru', 'description', 'Постоянная коллекция с оригинальными работами Пикассо, Дали и Миро, вход бесплатный. Удивительно для посёлка такого размера.'),
('poi_mijas_cac', 'poi', 'ru', 'short_tip', 'Бесплатный вход — стоит посетить, даже если музеи обычно не для вас'),

('poi_mijas_cala', 'poi', 'ca', 'name', 'Platja de La Cala de Mijas'),
('poi_mijas_cala', 'poi', 'ca', 'description', 'La platja de Mijas Costa, amb un passeig marítim animat, xiringuitos i ambient més tranquil que Fuengirola o Marbella.'),
('poi_mijas_cala', 'poi', 'ca', 'short_tip', 'Bona base si t''allotges a prop de la costa en lloc del poble'),
('poi_mijas_cala', 'poi', 'ru', 'name', 'Пляж Ла-Кала-де-Михас'),
('poi_mijas_cala', 'poi', 'ru', 'description', 'Пляж района Михас-Коста с оживлённой набережной, пляжными барами и более спокойной атмосферой, чем в Фуэнхироле или Марбелье.'),
('poi_mijas_cala', 'poi', 'ru', 'short_tip', 'Хорошая база, если вы остановились ближе к побережью, а не в самом посёлке'),

-- ════════════════════════════════════════
-- MIJAS — PREMIUM
-- ════════════════════════════════════════
('poi_mijas_carromato', 'poi', 'ca', 'name', 'Carromato de Mijas (Museu de Miniatures)'),
('poi_mijas_carromato', 'poi', 'ca', 'description', 'Museu de miniatures inaugurat el 1972 dins d''un carro de fusta, amb més de 300 peces de 50 països recopilades pel "Professor Max". Una joia insòlita del poble.'),
('poi_mijas_carromato', 'poi', 'ca', 'cta_label', 'Més informació'),
('poi_mijas_carromato', 'poi', 'ru', 'name', 'Карромато-де-Михас (Музей миниатюр)'),
('poi_mijas_carromato', 'poi', 'ru', 'description', 'Музей миниатюр, открытый в 1972 году в деревянном фургоне, с более чем 300 экспонатами из 50 стран, собранными "Профессором Максом". Необычная жемчужина посёлка.'),
('poi_mijas_carromato', 'poi', 'ru', 'cta_label', 'Подробнее'),

('poi_mijas_plaza_toros', 'poi', 'ca', 'name', 'Plaça de Toros de Mijas'),
('poi_mijas_plaza_toros', 'poi', 'ca', 'description', 'Una de les poques places de toros ovalades del món, construïda el 1900 sobre un antic aljub àrab. Inclou un petit museu taurí.'),
('poi_mijas_plaza_toros', 'poi', 'ca', 'cta_label', 'Més informació'),
('poi_mijas_plaza_toros', 'poi', 'ru', 'name', 'Арена для боя быков Михаса'),
('poi_mijas_plaza_toros', 'poi', 'ru', 'description', 'Одна из немногих в мире овальных арен для боя быков, построенная в 1900 году над старинной арабской цистерной. Включает небольшой музей корриды.'),
('poi_mijas_plaza_toros', 'poi', 'ru', 'cta_label', 'Подробнее'),

('poi_mijas_burro_taxi', 'poi', 'ca', 'name', 'Burro-Taxi de Mijas'),
('poi_mijas_burro_taxi', 'poi', 'ca', 'description', 'Passeig tradicional amb burro pels carrers del poble, símbol històric de Mijas des dels anys 60. Surt des de la Plaza Virgen de la Peña.'),
('poi_mijas_burro_taxi', 'poi', 'ca', 'short_tip', 'Alguns visitants qüestionen el benestar animal — val la pena considerar-ho abans de reservar'),
('poi_mijas_burro_taxi', 'poi', 'ca', 'cta_label', 'Més informació'),
('poi_mijas_burro_taxi', 'poi', 'ru', 'name', 'Ослиное такси Михаса'),
('poi_mijas_burro_taxi', 'poi', 'ru', 'description', 'Традиционная поездка на осле по улицам посёлка, исторический символ Михаса с 1960-х годов. Отправление с площади Девы Пенья.'),
('poi_mijas_burro_taxi', 'poi', 'ru', 'short_tip', 'Некоторые посетители выражают обеспокоенность благополучием животных — стоит учесть перед бронированием'),
('poi_mijas_burro_taxi', 'poi', 'ru', 'cta_label', 'Подробнее'),

-- ════════════════════════════════════════
-- MARBELLA — FREE
-- ════════════════════════════════════════
('poi_marbella_naranjos', 'poi', 'ca', 'name', 'Plaza de los Naranjos'),
('poi_marbella_naranjos', 'poi', 'ca', 'description', 'El cor del nucli antic des de 1485, amb tarongers, l''ajuntament renaixentista i terrasses en un entorn impecablement cuidat.'),
('poi_marbella_naranjos', 'poi', 'ca', 'short_tip', 'Punt de partida ideal per perdre''t pel laberint de carrers blancs'),
('poi_marbella_naranjos', 'poi', 'ru', 'name', 'Пласа-де-лос-Наранхос'),
('poi_marbella_naranjos', 'poi', 'ru', 'description', 'Сердце старого города с 1485 года, с апельсиновыми деревьями, ренессансной ратушей и террасами в безупречно ухоженной обстановке.'),
('poi_marbella_naranjos', 'poi', 'ru', 'short_tip', 'Идеальная отправная точка, чтобы заблудиться в лабиринте белых улочек'),

('poi_marbella_murallas', 'poi', 'ca', 'name', 'Muralles del Castell Àrab'),
('poi_marbella_murallas', 'poi', 'ca', 'description', 'Restes de la fortificació àrab del segle X que protegia l''antiga Marbella, encara visibles entre els carrers del nucli històric.'),
('poi_marbella_murallas', 'poi', 'ca', 'short_tip', 'Fàcil de combinar amb un passeig per la Plaza de los Naranjos'),
('poi_marbella_murallas', 'poi', 'ru', 'name', 'Стены арабского замка'),
('poi_marbella_murallas', 'poi', 'ru', 'description', 'Остатки арабских укреплений X века, защищавших старую Марбелью, до сих пор видны среди улиц исторического центра.'),
('poi_marbella_murallas', 'poi', 'ru', 'short_tip', 'Легко совместить с прогулкой по площади Наранхос'),

('poi_marbella_encarnacion', 'poi', 'ca', 'name', 'Església de la Encarnación'),
('poi_marbella_encarnacion', 'poi', 'ca', 'description', 'Església principal del nucli antic, construïda entre els segles XVI i XVIII, amb una façana barroca i un campanar que domina l''skyline del centre històric.'),
('poi_marbella_encarnacion', 'poi', 'ca', 'short_tip', 'Entrada gratuïta fora de l''horari de misses'),
('poi_marbella_encarnacion', 'poi', 'ru', 'name', 'Церковь Энкарнасьон'),
('poi_marbella_encarnacion', 'poi', 'ru', 'description', 'Главная церковь старого города, построенная между XVI и XVIII веками, с барочным фасадом и колокольней, доминирующей над историческим центром.'),
('poi_marbella_encarnacion', 'poi', 'ru', 'short_tip', 'Бесплатный вход вне часов проведения месс'),

('poi_marbella_avenida_mar', 'poi', 'ca', 'name', 'Avenida del Mar'),
('poi_marbella_avenida_mar', 'poi', 'ca', 'description', 'Passeig per a vianants que connecta el nucli antic amb la platja, amb 10 escultures originals de Salvador Dalí exposades a l''aire lliure — una col·lecció única a la costa.'),
('poi_marbella_avenida_mar', 'poi', 'ca', 'short_tip', 'Busca "L''Home Elefant" i "Noblesa del Temps", les més fotografiades'),
('poi_marbella_avenida_mar', 'poi', 'ru', 'name', 'Авенида-дель-Мар'),
('poi_marbella_avenida_mar', 'poi', 'ru', 'description', 'Пешеходная аллея, соединяющая старый город с пляжем, с 10 оригинальными скульптурами Сальвадора Дали под открытым небом — уникальная коллекция на этом побережье.'),
('poi_marbella_avenida_mar', 'poi', 'ru', 'short_tip', 'Ищите "Человека-слона" и "Благородство времени" — самые фотографируемые работы'),

('poi_marbella_villa_romana', 'poi', 'ca', 'name', 'Vil·la Romana de Río Verde'),
('poi_marbella_villa_romana', 'poi', 'ca', 'description', 'Jaciment arqueològic d''una vil·la romana dels segles I-II dC amb mosaics originals molt ben conservats. Una joia amagada que pocs turistes visiten.'),
('poi_marbella_villa_romana', 'poi', 'ca', 'short_tip', 'Consulta l''horari d''obertura abans d''anar-hi — és reduït'),
('poi_marbella_villa_romana', 'poi', 'ru', 'name', 'Римская вилла Рио-Верде'),
('poi_marbella_villa_romana', 'poi', 'ru', 'description', 'Археологический памятник — римская вилла I-II веков н.э. с прекрасно сохранившимися оригинальными мозаиками. Скрытая жемчужина, которую посещают немногие туристы.'),
('poi_marbella_villa_romana', 'poi', 'ru', 'short_tip', 'Уточните часы работы перед посещением — они ограничены'),

('poi_marbella_basilica_vega', 'poi', 'ca', 'name', 'Basílica Paleocristiana de Vega del Mar'),
('poi_marbella_basilica_vega', 'poi', 'ca', 'description', 'Restes d''una basílica visigoda dels segles IV-VI, amb una insòlita doble capçalera. Es troba vora la desembocadura del riu Guadalmina, a San Pedro de Alcántara.'),
('poi_marbella_basilica_vega', 'poi', 'ca', 'short_tip', 'Combina-la amb les Termes Romanes de Las Bóvedas, són al costat'),
('poi_marbella_basilica_vega', 'poi', 'ru', 'name', 'Раннехристианская базилика Вега-дель-Мар'),
('poi_marbella_basilica_vega', 'poi', 'ru', 'description', 'Остатки вестготской базилики IV-VI веков с необычной двойной апсидой. Находится у устья реки Гуадальмина, в Сан-Педро-де-Алькантара.'),
('poi_marbella_basilica_vega', 'poi', 'ru', 'short_tip', 'Совместите с римскими термами Лас-Бовед, они находятся рядом'),

('poi_marbella_termas', 'poi', 'ca', 'name', 'Termes Romanes de Las Bóvedas'),
('poi_marbella_termas', 'poi', 'ca', 'description', 'Banys termals romans dels segles III-IV, un dels millor conservats d''Andalusia, amb sales de bany fred, tebi i calent encara reconeixibles.'),
('poi_marbella_termas', 'poi', 'ca', 'short_tip', 'Es visiten gratis però amb horari limitat — comprova-ho abans'),
('poi_marbella_termas', 'poi', 'ru', 'name', 'Римские термы Лас-Бовед'),
('poi_marbella_termas', 'poi', 'ru', 'description', 'Римские термальные бани III-IV веков, одни из лучше всего сохранившихся в Андалусии, с ещё узнаваемыми залами для холодной, тёплой и горячей воды.'),
('poi_marbella_termas', 'poi', 'ru', 'short_tip', 'Вход бесплатный, но часы работы ограничены — уточните заранее'),

('poi_marbella_puerto_banus', 'poi', 'ca', 'name', 'Puerto Banús'),
('poi_marbella_puerto_banus', 'poi', 'ca', 'description', 'El port esportiu de luxe més famós d''Espanya, amb iots, cotxes esportius i botigues d''alta gamma. Un espectacle gratuït de gent i estil de vida.'),
('poi_marbella_puerto_banus', 'poi', 'ca', 'short_tip', 'Vés-hi al capvespre per veure els iots il·luminats'),
('poi_marbella_puerto_banus', 'poi', 'ru', 'name', 'Пуэрто-Банус'),
('poi_marbella_puerto_banus', 'poi', 'ru', 'description', 'Самая известная роскошная марина Испании с яхтами, спортивными автомобилями и элитными бутиками. Бесплатное зрелище людей и стиля жизни.'),
('poi_marbella_puerto_banus', 'poi', 'ru', 'short_tip', 'Приходите на закате, чтобы увидеть освещённые яхты'),

('poi_marbella_fontanilla', 'poi', 'ca', 'name', 'Platja de la Fontanilla'),
('poi_marbella_fontanilla', 'poi', 'ca', 'description', 'Platja urbana al costat del nucli antic, amb passeig marítim, xiringuitos i el Cable Ski Marbella a prop. Fàcil de combinar amb la visita al centre.'),
('poi_marbella_fontanilla', 'poi', 'ca', 'short_tip', 'A 10 minuts a peu de la Plaza de los Naranjos'),
('poi_marbella_fontanilla', 'poi', 'ru', 'name', 'Пляж Фонтанилья'),
('poi_marbella_fontanilla', 'poi', 'ru', 'description', 'Городской пляж рядом со старым городом, с набережной, пляжными барами и находящимся неподалёку Cable Ski Marbella. Легко совместить с посещением центра.'),
('poi_marbella_fontanilla', 'poi', 'ru', 'short_tip', 'В 10 минутах ходьбы от площади Наранхос'),

('poi_marbella_museo_ralli', 'poi', 'ca', 'name', 'Museu Ralli Marbella'),
('poi_marbella_museo_ralli', 'poi', 'ca', 'description', 'Museu d''art llatinoamericà i europeu contemporani (Dalí, Botero, entre d''altres) amb entrada completament gratuïta — poc habitual per a una col·lecció d''aquest nivell.'),
('poi_marbella_museo_ralli', 'poi', 'ca', 'short_tip', 'Tancat els dilluns i a l''estiu (jul-ago); comprova-ho abans d''anar-hi'),
('poi_marbella_museo_ralli', 'poi', 'ru', 'name', 'Музей Ралли Марбелья'),
('poi_marbella_museo_ralli', 'poi', 'ru', 'description', 'Музей латиноамериканского и современного европейского искусства (Дали, Ботеро и другие) с полностью бесплатным входом — редкость для коллекции такого уровня.'),
('poi_marbella_museo_ralli', 'poi', 'ru', 'short_tip', 'Закрыт по понедельникам и летом (июль-август); уточните перед визитом'),

-- ════════════════════════════════════════
-- MARBELLA — PREMIUM
-- ════════════════════════════════════════
('poi_marbella_museo_grabado', 'poi', 'ca', 'name', 'Museu del Gravat Espanyol Contemporani'),
('poi_marbella_museo_grabado', 'poi', 'ca', 'description', 'L''únic museu d''Espanya dedicat exclusivament al gravat, amb obres de Picasso, Miró i Dalí, en un edifici del segle XVI del nucli antic.'),
('poi_marbella_museo_grabado', 'poi', 'ca', 'cta_label', 'Més informació'),
('poi_marbella_museo_grabado', 'poi', 'ru', 'name', 'Музей современной испанской гравюры'),
('poi_marbella_museo_grabado', 'poi', 'ru', 'description', 'Единственный музей в Испании, полностью посвящённый гравюре, с работами Пикассо, Миро и Дали, в здании XVI века в старом городе.'),
('poi_marbella_museo_grabado', 'poi', 'ru', 'cta_label', 'Подробнее'),

('poi_marbella_museo_bonsai', 'poi', 'ca', 'name', 'Museu del Bonsai'),
('poi_marbella_museo_bonsai', 'poi', 'ca', 'description', 'Una de les col·leccions de bonsais més importants d''Europa, amb exemplars centenaris al Parque de la Represa. Una experiència única i poc coneguda.'),
('poi_marbella_museo_bonsai', 'poi', 'ca', 'cta_label', 'Més informació'),
('poi_marbella_museo_bonsai', 'poi', 'ru', 'name', 'Музей бонсай'),
('poi_marbella_museo_bonsai', 'poi', 'ru', 'description', 'Одна из самых значимых коллекций бонсай в Европе, с вековыми экземплярами в парке Ла-Репреса. Уникальный и малоизвестный опыт.'),
('poi_marbella_museo_bonsai', 'poi', 'ru', 'cta_label', 'Подробнее'),

-- ════════════════════════════════════════
-- BENALMÁDENA — DEMO SERVICES
-- ════════════════════════════════════════
('exp_benalmadena_kayak', 'poi', 'ca', 'name', 'Lloguer de Caiac'),
('exp_benalmadena_kayak', 'poi', 'ca', 'description', 'Explora la Costa del Sol en caiac des de Puerto Marina. Tot l''equip inclòs. No cal experiència prèvia. Monitors certificats disponibles.'),
('exp_benalmadena_kayak', 'poi', 'ca', 'cta_label', 'Reserva per WhatsApp'),
('exp_benalmadena_kayak', 'poi', 'ru', 'name', 'Аренда каяка'),
('exp_benalmadena_kayak', 'poi', 'ru', 'description', 'Исследуйте Коста-дель-Соль на каяке от Пуэрто-Марина. Всё снаряжение включено. Опыт не требуется. Доступны сертифицированные инструкторы.'),
('exp_benalmadena_kayak', 'poi', 'ru', 'cta_label', 'Забронировать через WhatsApp'),

('exp_benalmadena_catamaran', 'poi', 'ca', 'name', 'Tour en Catamarà'),
('exp_benalmadena_catamaran', 'poi', 'ca', 'description', 'Excursió de 3 hores per la Costa del Sol: observació de dofins, esnòrquel i barra lliure inclosos. Sortides diàries des de Puerto Marina. Una experiència inoblidable!'),
('exp_benalmadena_catamaran', 'poi', 'ca', 'cta_label', 'Reserva ara'),
('exp_benalmadena_catamaran', 'poi', 'ru', 'name', 'Прогулка на катамаране'),
('exp_benalmadena_catamaran', 'poi', 'ru', 'description', '3-часовая прогулка вдоль Коста-дель-Соль: наблюдение за дельфинами, снорклинг и открытый бар включены. Ежедневные отправления из Пуэрто-Марина. Незабываемые впечатления!'),
('exp_benalmadena_catamaran', 'poi', 'ru', 'cta_label', 'Забронировать сейчас'),

('exp_benalmadena_taxi', 'poi', 'ca', 'name', 'Trasllat Aeroport de Màlaga'),
('exp_benalmadena_taxi', 'poi', 'ca', 'description', 'Taxi privat porta a porta entre l''apartament i l''Aeroport de Màlaga-Costa del Sol. Disponible 24 hores, 7 dies. Reserva amb antelació per garantir disponibilitat.'),
('exp_benalmadena_taxi', 'poi', 'ca', 'cta_label', 'Sol·licitar trasllat'),
('exp_benalmadena_taxi', 'poi', 'ru', 'name', 'Трансфер в аэропорт Малаги'),
('exp_benalmadena_taxi', 'poi', 'ru', 'description', 'Частное такси от двери до двери между апартаментами и аэропортом Малага-Коста-дель-Соль. Доступно круглосуточно, 7 дней в неделю. Бронируйте заранее, чтобы гарантировать наличие.'),
('exp_benalmadena_taxi', 'poi', 'ru', 'cta_label', 'Заказать трансфер'),

('exp_benalmadena_spa', 'poi', 'ca', 'name', 'Spa & Massatge'),
('exp_benalmadena_spa', 'poi', 'ca', 'description', 'Centre de benestar a 10 min de l''apartament. Massatges relaxants, rituals andalusos, bany turc i jacuzzi. Els nostres hostes gaudeixen d''un 10% de descompte només mencionant aquesta guia.'),
('exp_benalmadena_spa', 'poi', 'ca', 'cta_label', 'Truca per reservar'),
('exp_benalmadena_spa', 'poi', 'ru', 'name', 'Спа и массаж'),
('exp_benalmadena_spa', 'poi', 'ru', 'description', 'Оздоровительный центр в 10 минутах от апартаментов. Расслабляющий массаж, андалузские ритуалы, турецкая баня и джакузи. Наши гости получают скидку 10%, просто упомянув этот гид.'),
('exp_benalmadena_spa', 'poi', 'ru', 'cta_label', 'Позвонить и забронировать');
