-- =====================================================
-- COSTA DEL SOL POIs — ITALIAN + PORTUGUESE TRANSLATIONS — MIGRATION 0064
-- =====================================================
-- Adds it/pt translations (name, description, short_tip/cta_label) for the 74
-- POIs/experiences from migrations 0060 and 0063. es/en/fr/de already existed;
-- the worker falls back to es when a language is missing, so this is additive.
-- Remaining languages (ca/ar/ru/uk/zh/ja/ko) are a follow-up.
-- =====================================================

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES

-- ════════════════════════════════════════
-- MÁLAGA — FREE
-- ════════════════════════════════════════
('poi_malaga_teatro_romano', 'poi', 'it', 'name', 'Teatro Romano di Málaga'),
('poi_malaga_teatro_romano', 'poi', 'it', 'description', 'Ai piedi dell''Alcazaba, questo teatro del I secolo a.C. è il resto romano più importante della città. Riutilizzato dagli arabi per costruire la fortezza, oggi si visita liberamente insieme al suo centro visitatori.'),
('poi_malaga_teatro_romano', 'poi', 'it', 'short_tip', 'Ingresso gratuito. Chiuso il lunedì. Illuminato di sera.'),
('poi_malaga_teatro_romano', 'poi', 'pt', 'name', 'Teatro Romano de Málaga'),
('poi_malaga_teatro_romano', 'poi', 'pt', 'description', 'Aos pés da Alcazaba, este teatro do século I a.C. é o vestígio romano mais importante da cidade. Reaproveitado pelos árabes para construir a fortaleza, hoje visita-se livremente junto ao seu centro de interpretação.'),
('poi_malaga_teatro_romano', 'poi', 'pt', 'short_tip', 'Entrada gratuita. Fechado às segundas-feiras. Iluminado à noite.'),

('poi_malaga_larios', 'poi', 'it', 'name', 'Via Marqués de Larios'),
('poi_malaga_larios', 'poi', 'it', 'description', 'La grande arteria commerciale e pedonale del centro storico, con edifici di fine Ottocento. Decorata in modo spettacolare a Natale e durante la Feria di Málaga.'),
('poi_malaga_larios', 'poi', 'it', 'short_tip', 'Al tramonto si riempie di musica di strada e terrazze'),
('poi_malaga_larios', 'poi', 'pt', 'name', 'Rua Marqués de Larios'),
('poi_malaga_larios', 'poi', 'pt', 'description', 'A grande artéria comercial e pedonal do centro histórico, com edifícios do final do século XIX. Decorada de forma espetacular no Natal e durante a Feria de Málaga.'),
('poi_malaga_larios', 'poi', 'pt', 'short_tip', 'Ao entardecer enche-se de música de rua e esplanadas'),

('poi_malaga_plaza_constitucion', 'poi', 'it', 'name', 'Plaza de la Constitución'),
('poi_malaga_plaza_constitucion', 'poi', 'it', 'description', 'Cuore storico e politico della città sin dal Medioevo, con la Fontana di Genova del XVI secolo. Punto di partenza naturale per esplorare il centro a piedi.'),
('poi_malaga_plaza_constitucion', 'poi', 'it', 'short_tip', 'Da qui partono diversi free tour a piedi'),
('poi_malaga_plaza_constitucion', 'poi', 'pt', 'name', 'Plaza de la Constitución'),
('poi_malaga_plaza_constitucion', 'poi', 'pt', 'description', 'Coração histórico e político da cidade desde a Idade Média, com a Fonte de Génova do século XVI. Ponto de partida natural para explorar o centro a pé.'),
('poi_malaga_plaza_constitucion', 'poi', 'pt', 'short_tip', 'Vários free tours partem daqui'),

('poi_malaga_atarazanas', 'poi', 'it', 'name', 'Mercato di Atarazanas'),
('poi_malaga_atarazanas', 'poi', 'it', 'description', 'Mercato centrale ottocentesco costruito su antichi cantieri navali nasridi, con una grande vetrata liberty. Pesce fresco, prosciutto e bar di tapas all''interno del mercato stesso.'),
('poi_malaga_atarazanas', 'poi', 'it', 'short_tip', 'Vai la mattina infrasettimanale per evitare la folla'),
('poi_malaga_atarazanas', 'poi', 'pt', 'name', 'Mercado de Atarazanas'),
('poi_malaga_atarazanas', 'poi', 'pt', 'description', 'Mercado central do século XIX construído sobre antigos estaleiros nazaridas, com um grande vitral art nouveau. Peixe fresco, presunto e bares de tapas dentro do próprio mercado.'),
('poi_malaga_atarazanas', 'poi', 'pt', 'short_tip', 'Vá de manhã em dia de semana para evitar multidões'),

('poi_malaga_plaza_merced', 'poi', 'it', 'name', 'Plaza de la Merced'),
('poi_malaga_plaza_merced', 'poi', 'it', 'description', 'Ampia piazza porticata dove nacque Picasso, con un obelisco dedicato al generale Torrijos. Circondata da terrazze, è uno dei luoghi d''incontro preferiti dai malagueni.'),
('poi_malaga_plaza_merced', 'poi', 'it', 'short_tip', 'La Casa Natale di Picasso si trova proprio su questa piazza'),
('poi_malaga_plaza_merced', 'poi', 'pt', 'name', 'Plaza de la Merced'),
('poi_malaga_plaza_merced', 'poi', 'pt', 'description', 'Ampla praça porticada onde Picasso nasceu, com um obelisco dedicado ao general Torrijos. Rodeada de esplanadas, é um dos pontos de encontro preferidos dos malaguenhos.'),
('poi_malaga_plaza_merced', 'poi', 'pt', 'short_tip', 'A Casa Natal de Picasso fica mesmo nesta praça'),

('poi_malaga_cripta_victoria', 'poi', 'it', 'name', 'Cripta della Basilica della Victoria'),
('poi_malaga_cripta_victoria', 'poi', 'it', 'description', 'Gioiello nascosto sotto la Basilica della Victoria: una cripta barocca con nicchie e l''imponente Pantheon dei Conti di Buenavista. Poco conosciuta anche tra i malagueni.'),
('poi_malaga_cripta_victoria', 'poi', 'it', 'short_tip', 'Se la cripta sembra chiusa, chiedi in sacrestia — a volte apre su richiesta'),
('poi_malaga_cripta_victoria', 'poi', 'pt', 'name', 'Cripta da Basílica da Victoria'),
('poi_malaga_cripta_victoria', 'poi', 'pt', 'description', 'Joia escondida sob a Basílica da Victoria: uma cripta barroca com nichos e o impressionante Panteão dos Condes de Buenavista. Pouco conhecida mesmo entre os malaguenhos.'),
('poi_malaga_cripta_victoria', 'poi', 'pt', 'short_tip', 'Se a cripta parecer fechada, pergunte na sacristia — às vezes abre a pedido'),

('poi_malaga_cementerio_ingles', 'poi', 'it', 'name', 'Cimitero Inglese'),
('poi_malaga_cementerio_ingles', 'poi', 'it', 'description', 'Il primo cimitero protestante di Spagna (1831), un giardino romantico e tranquillo con le tombe di scrittori e diplomatici, a pochi passi dalla spiaggia della Malagueta.'),
('poi_malaga_cementerio_ingles', 'poi', 'it', 'short_tip', 'Ingresso gratuito, chiuso il lunedì'),
('poi_malaga_cementerio_ingles', 'poi', 'pt', 'name', 'Cemitério Inglês'),
('poi_malaga_cementerio_ingles', 'poi', 'pt', 'description', 'O primeiro cemitério protestante de Espanha (1831), um jardim romântico e tranquilo com túmulos de escritores e diplomatas, a poucos metros da praia da Malagueta.'),
('poi_malaga_cementerio_ingles', 'poi', 'pt', 'short_tip', 'Entrada gratuita, fechado às segundas-feiras'),

('poi_malaga_soho', 'poi', 'it', 'name', 'Quartiere Soho (street art)'),
('poi_malaga_soho', 'poi', 'it', 'description', 'Il museo d''arte urbana a cielo aperto di Málaga (MAUS): intere facciate dipinte da artisti internazionali come D*Face, ROA e Obey. Un modo diverso di scoprire il centro.'),
('poi_malaga_soho', 'poi', 'it', 'short_tip', 'Scarica la mappa del MAUS per non perdere nessun murale'),
('poi_malaga_soho', 'poi', 'pt', 'name', 'Bairro do Soho (arte urbana)'),
('poi_malaga_soho', 'poi', 'pt', 'description', 'O museu de arte urbana a céu aberto de Málaga (MAUS): fachadas inteiras pintadas por artistas internacionais como D*Face, ROA ou Obey. Uma forma diferente de descobrir o centro.'),
('poi_malaga_soho', 'poi', 'pt', 'short_tip', 'Descarregue o mapa do MAUS para não perder nenhum mural'),

('poi_malaga_pasaje_chinitas', 'poi', 'it', 'name', 'Pasaje de Chinitas'),
('poi_malaga_pasaje_chinitas', 'poi', 'it', 'description', 'Vicolo storico legato al flamenco e al poeta Federico García Lorca, oggi pieno di bar di tapas. Vicinissimo a Plaza de la Constitución.'),
('poi_malaga_pasaje_chinitas', 'poi', 'it', 'short_tip', 'Ottima tappa per le tapas prima o dopo la visita al centro'),
('poi_malaga_pasaje_chinitas', 'poi', 'pt', 'name', 'Pasaje de Chinitas'),
('poi_malaga_pasaje_chinitas', 'poi', 'pt', 'description', 'Beco histórico ligado ao flamenco e ao poeta Federico García Lorca, hoje repleto de bares de tapas. Muito perto da Plaza de la Constitución.'),
('poi_malaga_pasaje_chinitas', 'poi', 'pt', 'short_tip', 'Boa paragem para petiscar antes ou depois de visitar o centro'),

('poi_malaga_muelle_uno', 'poi', 'it', 'name', 'Muelle Uno e Palmeral de las Sorpresas'),
('poi_malaga_muelle_uno', 'poi', 'it', 'description', 'Lungomare portuale rinnovato accanto al centro, con giardini, negozi, terrazze e vista sulle navi da crociera. Il Centre Pompidou Málaga si trova proprio qui.'),
('poi_malaga_muelle_uno', 'poi', 'it', 'short_tip', 'Ideale per una passeggiata al tramonto con vista sul Castello di Gibralfaro'),
('poi_malaga_muelle_uno', 'poi', 'pt', 'name', 'Muelle Uno e Palmeral de las Sorpresas'),
('poi_malaga_muelle_uno', 'poi', 'pt', 'description', 'Passeio portuário renovado junto ao centro, com jardins, lojas, esplanadas e vista para os navios de cruzeiro. O Centre Pompidou Málaga fica mesmo aqui.'),
('poi_malaga_muelle_uno', 'poi', 'pt', 'short_tip', 'Ideal para um passeio ao entardecer com vista para o Castelo de Gibralfaro'),

('poi_malaga_malagueta', 'poi', 'it', 'name', 'Spiaggia della Malagueta'),
('poi_malaga_malagueta', 'poi', 'it', 'description', 'La spiaggia urbana per eccellenza di Málaga, a 10 minuti a piedi dal centro storico. Sabbia scura, chiringuitos e lungomare completo.'),
('poi_malaga_malagueta', 'poi', 'it', 'short_tip', 'Gli spiedini di sardine (espetos) dei chiringuitos sono un classico'),
('poi_malaga_malagueta', 'poi', 'pt', 'name', 'Praia da Malagueta'),
('poi_malaga_malagueta', 'poi', 'pt', 'description', 'A praia urbana por excelência de Málaga capital, a 10 minutos a pé do centro histórico. Areia escura, quiosques de praia e passeio marítimo completo.'),
('poi_malaga_malagueta', 'poi', 'pt', 'short_tip', 'Os espetos de sardinhas dos quiosques são um clássico'),

('poi_malaga_mirador_gibralfaro', 'poi', 'it', 'name', 'Belvedere di Gibralfaro'),
('poi_malaga_mirador_gibralfaro', 'poi', 'it', 'description', 'Belvedere gratuito accanto al castello con le migliori viste panoramiche sulla città, il porto e l''arena della Malagueta.'),
('poi_malaga_mirador_gibralfaro', 'poi', 'it', 'short_tip', 'Prendi l''autobus 35 o cammina 30 min dal centro — la vista ripaga'),
('poi_malaga_mirador_gibralfaro', 'poi', 'pt', 'name', 'Miradouro de Gibralfaro'),
('poi_malaga_mirador_gibralfaro', 'poi', 'pt', 'description', 'Miradouro gratuito junto ao castelo com as melhores vistas panorâmicas da cidade, do porto e da praça de touros da Malagueta.'),
('poi_malaga_mirador_gibralfaro', 'poi', 'pt', 'short_tip', 'Apanhe o autocarro 35 ou caminhe 30 min desde o centro — a vista compensa'),

('poi_malaga_santo_cristo', 'poi', 'it', 'name', 'Chiesa del Santo Cristo de la Salud'),
('poi_malaga_santo_cristo', 'poi', 'it', 'description', 'Chiesa barocca del XVII secolo con una vistosa facciata in marmo rosso, strettamente legata alla Settimana Santa di Málaga.'),
('poi_malaga_santo_cristo', 'poi', 'it', 'short_tip', 'Proprio accanto a Calle Larios, facile da combinare con una passeggiata in centro'),
('poi_malaga_santo_cristo', 'poi', 'pt', 'name', 'Igreja do Santo Cristo de la Salud'),
('poi_malaga_santo_cristo', 'poi', 'pt', 'description', 'Igreja barroca do século XVII com uma marcante fachada em mármore vermelho, muito ligada à Semana Santa de Málaga.'),
('poi_malaga_santo_cristo', 'poi', 'pt', 'short_tip', 'Mesmo ao lado da rua Larios, fácil de combinar com um passeio pelo centro'),

-- ════════════════════════════════════════
-- MÁLAGA — PREMIUM
-- ════════════════════════════════════════
('poi_malaga_alcazaba', 'poi', 'it', 'name', 'Alcazaba di Málaga'),
('poi_malaga_alcazaba', 'poi', 'it', 'description', 'Fortezza palaziale araba dell''XI secolo, la meglio conservata di Spagna. Giardini, cortili con vista sul mare e il Teatro Romano ai suoi piedi.'),
('poi_malaga_alcazaba', 'poi', 'it', 'cta_label', 'Acquista i biglietti'),
('poi_malaga_alcazaba', 'poi', 'pt', 'name', 'Alcazaba de Málaga'),
('poi_malaga_alcazaba', 'poi', 'pt', 'description', 'Fortaleza palaciana árabe do século XI, a melhor conservada de Espanha. Jardins, pátios com vista para o mar e o Teatro Romano aos seus pés.'),
('poi_malaga_alcazaba', 'poi', 'pt', 'cta_label', 'Comprar bilhetes'),

('poi_malaga_gibralfaro', 'poi', 'it', 'name', 'Castello di Gibralfaro'),
('poi_malaga_gibralfaro', 'poi', 'it', 'description', 'Fortezza militare del XIV secolo sul monte omonimo, collegata all''Alcazaba da una cinta muraria. La vista a 360° sulla città è la migliore di Málaga.'),
('poi_malaga_gibralfaro', 'poi', 'it', 'cta_label', 'Acquista i biglietti'),
('poi_malaga_gibralfaro', 'poi', 'pt', 'name', 'Castelo de Gibralfaro'),
('poi_malaga_gibralfaro', 'poi', 'pt', 'description', 'Fortaleza militar do século XIV no monte homónimo, ligada à Alcazaba por uma muralha. A vista de 360° sobre a cidade é a melhor de Málaga.'),
('poi_malaga_gibralfaro', 'poi', 'pt', 'cta_label', 'Comprar bilhetes'),

('poi_malaga_catedral', 'poi', 'it', 'name', 'Cattedrale di Málaga ("La Manquita")'),
('poi_malaga_catedral', 'poi', 'it', 'description', 'Cattedrale rinascimentale famosa per la sua torre incompiuta, da cui il soprannome "la Monca". La salita sui tetti offre una vista unica sul centro storico.'),
('poi_malaga_catedral', 'poi', 'it', 'cta_label', 'Acquista i biglietti'),
('poi_malaga_catedral', 'poi', 'pt', 'name', 'Catedral de Málaga ("La Manquita")'),
('poi_malaga_catedral', 'poi', 'pt', 'description', 'Catedral renascentista famosa pela sua torre inacabada, daí a alcunha "a Maneta". A subida às Coberturas oferece uma vista única sobre o centro histórico.'),
('poi_malaga_catedral', 'poi', 'pt', 'cta_label', 'Comprar bilhetes'),

('poi_malaga_museo_picasso', 'poi', 'it', 'name', 'Museo Picasso Málaga'),
('poi_malaga_museo_picasso', 'poi', 'it', 'description', 'Oltre 200 opere dell''artista malagueno nel Palazzo di Buenavista, donate dalla famiglia Picasso. Imprescindibile per capire la sua evoluzione artistica.'),
('poi_malaga_museo_picasso', 'poi', 'it', 'cta_label', 'Acquista i biglietti'),
('poi_malaga_museo_picasso', 'poi', 'pt', 'name', 'Museu Picasso Málaga'),
('poi_malaga_museo_picasso', 'poi', 'pt', 'description', 'Mais de 200 obras do artista natural de Málaga no Palácio de Buenavista, doadas pela família Picasso. Imprescindível para entender a sua evolução artística.'),
('poi_malaga_museo_picasso', 'poi', 'pt', 'cta_label', 'Comprar bilhetes'),

('poi_malaga_casa_natal_picasso', 'poi', 'it', 'name', 'Casa Natale di Picasso'),
('poi_malaga_casa_natal_picasso', 'poi', 'it', 'description', 'La casa dove nacque Pablo Picasso nel 1881, in Plaza de la Merced. Arredi d''epoca, opere giovanili e oggetti personali della famiglia.'),
('poi_malaga_casa_natal_picasso', 'poi', 'it', 'cta_label', 'Acquista i biglietti'),
('poi_malaga_casa_natal_picasso', 'poi', 'pt', 'name', 'Casa Natal de Picasso'),
('poi_malaga_casa_natal_picasso', 'poi', 'pt', 'description', 'A casa onde Pablo Picasso nasceu em 1881, na Plaza de la Merced. Mobiliário de época, obras de juventude e objetos pessoais da família.'),
('poi_malaga_casa_natal_picasso', 'poi', 'pt', 'cta_label', 'Comprar bilhetes'),

('poi_malaga_pompidou', 'poi', 'it', 'name', 'Centre Pompidou Málaga'),
('poi_malaga_pompidou', 'poi', 'it', 'description', 'L''unica sede del Pompidou fuori dalla Francia, riconoscibile per il suo cubo di vetro colorato nel porto. Arte moderna e contemporanea dalla collezione parigina.'),
('poi_malaga_pompidou', 'poi', 'it', 'cta_label', 'Acquista i biglietti'),
('poi_malaga_pompidou', 'poi', 'pt', 'name', 'Centre Pompidou Málaga'),
('poi_malaga_pompidou', 'poi', 'pt', 'description', 'A única sede do Pompidou fora de França, reconhecível pelo seu cubo de vidro colorido no porto. Arte moderna e contemporânea da coleção parisiense.'),
('poi_malaga_pompidou', 'poi', 'pt', 'cta_label', 'Comprar bilhetes'),

('poi_malaga_thyssen', 'poi', 'it', 'name', 'Museo Carmen Thyssen Málaga'),
('poi_malaga_thyssen', 'poi', 'it', 'description', 'Pittura spagnola dell''Ottocento, con particolare attenzione alla scuola andalusa e al costumbrismo, in un palazzetto rinascimentale del centro storico.'),
('poi_malaga_thyssen', 'poi', 'it', 'cta_label', 'Acquista i biglietti'),
('poi_malaga_thyssen', 'poi', 'pt', 'name', 'Museu Carmen Thyssen Málaga'),
('poi_malaga_thyssen', 'poi', 'pt', 'description', 'Pintura espanhola do século XIX, com especial destaque para a escola andaluza e o costumbrismo, num palacete renascentista do centro histórico.'),
('poi_malaga_thyssen', 'poi', 'pt', 'cta_label', 'Comprar bilhetes'),

('poi_malaga_concepcion', 'poi', 'it', 'name', 'Giardino Botanico-Storico La Concepción'),
('poi_malaga_concepcion', 'poi', 'it', 'description', 'Giardino subtropicale dell''Ottocento dichiarato Bene di Interesse Culturale, con oltre 25 ettari, palme secolari e un sito megalitico.'),
('poi_malaga_concepcion', 'poi', 'it', 'cta_label', 'Acquista i biglietti'),
('poi_malaga_concepcion', 'poi', 'pt', 'name', 'Jardim Botânico-Histórico La Concepción'),
('poi_malaga_concepcion', 'poi', 'pt', 'description', 'Jardim subtropical do século XIX classificado como Bem de Interesse Cultural, com mais de 25 hectares, palmeiras centenárias e um sítio megalítico.'),
('poi_malaga_concepcion', 'poi', 'pt', 'cta_label', 'Comprar bilhetes'),

('poi_malaga_museo_automovilistico', 'poi', 'it', 'name', 'Museo dell''Automobile e della Moda'),
('poi_malaga_museo_automovilistico', 'poi', 'it', 'description', 'Collezione unica che unisce auto d''epoca classiche ad alta moda e cappelli, in un''ex fabbrica di tabacco riconvertita.'),
('poi_malaga_museo_automovilistico', 'poi', 'it', 'cta_label', 'Acquista i biglietti'),
('poi_malaga_museo_automovilistico', 'poi', 'pt', 'name', 'Museu Automóvel e da Moda'),
('poi_malaga_museo_automovilistico', 'poi', 'pt', 'description', 'Coleção única que combina carros clássicos de época com alta-costura e chapéus, numa antiga fábrica de tabaco reconvertida.'),
('poi_malaga_museo_automovilistico', 'poi', 'pt', 'cta_label', 'Comprar bilhetes'),

-- ════════════════════════════════════════
-- TORREMOLINOS — FREE
-- ════════════════════════════════════════
('poi_torremolinos_san_miguel', 'poi', 'it', 'name', 'Calle San Miguel'),
('poi_torremolinos_san_miguel', 'poi', 'it', 'description', 'Via pedonale commerciale del centro, cuore di Torremolinos sin dagli anni ''60. Negozi, gelaterie e atmosfera animata tutto il giorno.'),
('poi_torremolinos_san_miguel', 'poi', 'it', 'short_tip', 'Ottimo punto di partenza verso la Cuesta del Tajo'),
('poi_torremolinos_san_miguel', 'poi', 'pt', 'name', 'Calle San Miguel'),
('poi_torremolinos_san_miguel', 'poi', 'pt', 'description', 'Rua pedonal comercial do centro, coração de Torremolinos desde os anos 60. Lojas, gelatarias e ambiente animado o dia todo.'),
('poi_torremolinos_san_miguel', 'poi', 'pt', 'short_tip', 'Excelente ponto de partida para a Cuesta del Tajo'),

('poi_torremolinos_cuesta_tajo', 'poi', 'it', 'name', 'Cuesta del Tajo'),
('poi_torremolinos_cuesta_tajo', 'poi', 'it', 'description', 'Antica via-burrone che scende dal centro fino alla spiaggia di La Carihuela, con vista sul mare e tradizionali case imbiancate a calce.'),
('poi_torremolinos_cuesta_tajo', 'poi', 'it', 'short_tip', 'La discesa è facile, la salita è piuttosto ripida'),
('poi_torremolinos_cuesta_tajo', 'poi', 'pt', 'name', 'Cuesta del Tajo'),
('poi_torremolinos_cuesta_tajo', 'poi', 'pt', 'description', 'Antiga rua-ravina que desce do centro até à praia de La Carihuela, com vista para o mar e casas caiadas tradicionais.'),
('poi_torremolinos_cuesta_tajo', 'poi', 'pt', 'short_tip', 'A descida é fácil, a subida tem bastante inclinação'),

('poi_torremolinos_torre_pimentel', 'poi', 'it', 'name', 'Torre de Pimentel (Torre dei Mulini)'),
('poi_torremolinos_torre_pimentel', 'poi', 'it', 'description', 'Torre di guardia del XV secolo che dà il nome alla città ("Torre de los Molinos"). Una delle poche testimonianze storiche visibili della Torremolinos pre-turistica.'),
('poi_torremolinos_torre_pimentel', 'poi', 'it', 'short_tip', 'Piccola ma ricca di storia — facile da combinare con la Cuesta del Tajo'),
('poi_torremolinos_torre_pimentel', 'poi', 'pt', 'name', 'Torre de Pimentel (Torre dos Moinhos)'),
('poi_torremolinos_torre_pimentel', 'poi', 'pt', 'description', 'Torre de vigia do século XV que dá o nome à cidade ("Torre de los Molinos"). Um dos poucos vestígios históricos visíveis da Torremolinos anterior ao turismo.'),
('poi_torremolinos_torre_pimentel', 'poi', 'pt', 'short_tip', 'Pequena mas cheia de história — fácil de combinar com a Cuesta del Tajo'),

('poi_torremolinos_carihuela', 'poi', 'it', 'name', 'Quartiere di La Carihuela'),
('poi_torremolinos_carihuela', 'poi', 'it', 'description', 'Antico quartiere di pescatori sul mare, oggi pieno di ristoranti di pesce fresco e chiringuitos. Il lungomare più autentico di Torremolinos.'),
('poi_torremolinos_carihuela', 'poi', 'it', 'short_tip', 'Prova i "boquerones victorianos", specialità locale di acciughe fritte'),
('poi_torremolinos_carihuela', 'poi', 'pt', 'name', 'Bairro de La Carihuela'),
('poi_torremolinos_carihuela', 'poi', 'pt', 'description', 'Antigo bairro de pescadores junto ao mar, hoje repleto de restaurantes de peixe fresco e quiosques de praia. O passeio marítimo mais autêntico de Torremolinos.'),
('poi_torremolinos_carihuela', 'poi', 'pt', 'short_tip', 'Experimente os "boquerones victorianos", especialidade local de biqueirões fritos'),

('poi_torremolinos_bajondillo', 'poi', 'it', 'name', 'Spiaggia del Bajondillo'),
('poi_torremolinos_bajondillo', 'poi', 'it', 'description', 'Una delle spiagge più centrali e frequentate di Torremolinos, con tutti i servizi e facile accesso dal centro.'),
('poi_torremolinos_bajondillo', 'poi', 'it', 'short_tip', 'Molto affollata in estate — arriva presto per trovare posto'),
('poi_torremolinos_bajondillo', 'poi', 'pt', 'name', 'Praia do Bajondillo'),
('poi_torremolinos_bajondillo', 'poi', 'pt', 'description', 'Uma das praias mais centrais e concorridas de Torremolinos, com todos os serviços e fácil acesso a partir do centro.'),
('poi_torremolinos_bajondillo', 'poi', 'pt', 'short_tip', 'Muito concorrida no verão — chegue cedo para garantir lugar'),

('poi_torremolinos_bateria', 'poi', 'it', 'name', 'Parque de la Batería'),
('poi_torremolinos_bateria', 'poi', 'it', 'description', 'Parco costiero con un''antica torre di avvistamento e giardini sulla scogliera. Un angolo tranquillo lontano dalla confusione, con vista sul mare.'),
('poi_torremolinos_bateria', 'poi', 'it', 'short_tip', 'Ideale per una passeggiata tranquilla al tramonto'),
('poi_torremolinos_bateria', 'poi', 'pt', 'name', 'Parque de la Batería'),
('poi_torremolinos_bateria', 'poi', 'pt', 'description', 'Parque costeiro com uma antiga torre-miradouro e jardins sobre a falésia. Um recanto tranquilo longe da azáfama, com vista para o mar.'),
('poi_torremolinos_bateria', 'poi', 'pt', 'short_tip', 'Ideal para um passeio tranquilo ao entardecer'),

('poi_torremolinos_molino_inca', 'poi', 'it', 'name', 'Giardino Botanico Molino de Inca'),
('poi_torremolinos_molino_inca', 'poi', 'it', 'description', 'Antica sorgente e mulino ad acqua trasformati in un rigoglioso giardino botanico gratuito, con laghetti, cascate e uccelli. Un''oasi verde poco conosciuta dai turisti.'),
('poi_torremolinos_molino_inca', 'poi', 'it', 'short_tip', 'Ingresso gratuito — perfetto per sfuggire al caldo estivo'),
('poi_torremolinos_molino_inca', 'poi', 'pt', 'name', 'Jardim Botânico Molino de Inca'),
('poi_torremolinos_molino_inca', 'poi', 'pt', 'description', 'Antiga nascente e moinho de água transformados num frondoso jardim botânico gratuito, com lagos, cascatas e aves. Um oásis verde pouco conhecido dos turistas.'),
('poi_torremolinos_molino_inca', 'poi', 'pt', 'short_tip', 'Entrada gratuita — perfeito para escapar ao calor no verão'),

-- ════════════════════════════════════════
-- TORREMOLINOS — PREMIUM
-- ════════════════════════════════════════
('poi_torremolinos_cocodrilos', 'poi', 'it', 'name', 'Cocodrilos Park'),
('poi_torremolinos_cocodrilos', 'poi', 'it', 'description', 'L''unico parco di coccodrilli in Spagna, con oltre 300 esemplari. Include un''area rettili, spettacoli e la possibilità di tenere in braccio un cucciolo di coccodrillo.'),
('poi_torremolinos_cocodrilos', 'poi', 'it', 'cta_label', 'Acquista i biglietti'),
('poi_torremolinos_cocodrilos', 'poi', 'pt', 'name', 'Cocodrilos Park'),
('poi_torremolinos_cocodrilos', 'poi', 'pt', 'description', 'O único parque de crocodilos de Espanha, com mais de 300 exemplares. Inclui zona de répteis, exibições e a possibilidade de segurar uma cria de crocodilo.'),
('poi_torremolinos_cocodrilos', 'poi', 'pt', 'cta_label', 'Comprar bilhetes'),

('poi_torremolinos_aqualand', 'poi', 'it', 'name', 'Aqualand Torremolinos'),
('poi_torremolinos_aqualand', 'poi', 'it', 'description', 'Il più grande parco acquatico della Costa del Sol occidentale, con scivoli, piscina con onde e area bambini. Unica sede della catena in questa parte della costa.'),
('poi_torremolinos_aqualand', 'poi', 'it', 'cta_label', 'Acquista i biglietti'),
('poi_torremolinos_aqualand', 'poi', 'pt', 'name', 'Aqualand Torremolinos'),
('poi_torremolinos_aqualand', 'poi', 'pt', 'description', 'O maior parque aquático da Costa del Sol ocidental, com toboáguas, piscina de ondas e zona infantil. Único parque da cadeia nesta parte da costa.'),
('poi_torremolinos_aqualand', 'poi', 'pt', 'cta_label', 'Comprar bilhetes'),

-- ════════════════════════════════════════
-- BENALMÁDENA
-- ════════════════════════════════════════
('poi_benalmadena_parque_paloma', 'poi', 'it', 'name', 'Parque de la Paloma'),
('poi_benalmadena_parque_paloma', 'poi', 'it', 'description', 'Ampio parco urbano con laghi, fauna libera (pavoni, conigli, oche) e aree picnic. Ideale per una mattinata in famiglia. Ingresso gratuito.'),
('poi_benalmadena_parque_paloma', 'poi', 'it', 'short_tip', 'Visita all''alba per vedere i pavoni svegliarsi'),
('poi_benalmadena_parque_paloma', 'poi', 'pt', 'name', 'Parque de la Paloma'),
('poi_benalmadena_parque_paloma', 'poi', 'pt', 'description', 'Extenso parque urbano com lagos, fauna livre (pavões, coelhos, gansos) e zonas de piquenique. Ideal para uma manhã em família. Entrada gratuita.'),
('poi_benalmadena_parque_paloma', 'poi', 'pt', 'short_tip', 'Visite ao amanhecer para ver os pavões a acordar'),

('poi_benalmadena_puerto_marina', 'poi', 'it', 'name', 'Puerto Marina'),
('poi_benalmadena_puerto_marina', 'poi', 'it', 'description', 'Uno dei porti turistici più belli d''Europa, con oltre 1.000 posti barca. Lungomare con ristoranti, terrazze e negozi. Atmosfera animata fino a tarda notte.'),
('poi_benalmadena_puerto_marina', 'poi', 'it', 'short_tip', 'I ristoranti in terrazza sul mare sono imperdibili al tramonto'),
('poi_benalmadena_puerto_marina', 'poi', 'pt', 'name', 'Puerto Marina'),
('poi_benalmadena_puerto_marina', 'poi', 'pt', 'description', 'Uma das marinas mais bonitas da Europa, com mais de 1.000 lugares de amarração. Passeio marítimo com restaurantes, esplanadas e lojas. Ambiente animado até tarde.'),
('poi_benalmadena_puerto_marina', 'poi', 'pt', 'short_tip', 'Os restaurantes com esplanada sobre o mar são imperdíveis ao entardecer'),

('poi_benalmadena_colomares', 'poi', 'it', 'name', 'Castillo de Colomares'),
('poi_benalmadena_colomares', 'poi', 'it', 'description', 'Monumento unico dedicato a Cristoforo Colombo e alla scoperta dell''America. Fonde stili romanico, gotico, mudéjar e bizantino. Ospita la chiesa più piccola del mondo secondo il Guinness.'),
('poi_benalmadena_colomares', 'poi', 'it', 'short_tip', 'La cappella interna ha spazio per una sola persona — perfetta per la foto più originale'),
('poi_benalmadena_colomares', 'poi', 'pt', 'name', 'Castillo de Colomares'),
('poi_benalmadena_colomares', 'poi', 'pt', 'description', 'Monumento único dedicado a Cristóvão Colombo e à descoberta da América. Mistura estilos românico, gótico, mudéjar e bizantino. Alberga a igreja mais pequena do mundo segundo o Guinness.'),
('poi_benalmadena_colomares', 'poi', 'pt', 'short_tip', 'A capela interior tem capacidade para uma pessoa — perfeita para a foto mais original'),

('poi_benalmadena_stupa', 'poi', 'it', 'name', 'Stupa dell''Illuminazione'),
('poi_benalmadena_stupa', 'poi', 'it', 'description', 'Una delle più grandi stupe buddiste dell''Europa occidentale (33 m di altezza). Costruita nel 2003, offre viste panoramiche spettacolari sulla costa e un''atmosfera di pace unica.'),
('poi_benalmadena_stupa', 'poi', 'it', 'short_tip', 'Le viste sul Mediterraneo da qui sono tra le migliori di tutta la zona'),
('poi_benalmadena_stupa', 'poi', 'pt', 'name', 'Estupa da Iluminação'),
('poi_benalmadena_stupa', 'poi', 'pt', 'description', 'Uma das maiores estupas budistas da Europa Ocidental (33 m de altura). Construída em 2003, oferece vistas panorâmicas espetaculares sobre a costa e um ambiente de paz único.'),
('poi_benalmadena_stupa', 'poi', 'pt', 'short_tip', 'As vistas sobre o Mediterrâneo daqui estão entre as melhores de toda a zona'),

('poi_benalmadena_malapesquera', 'poi', 'it', 'name', 'Spiaggia di Malapesquera'),
('poi_benalmadena_malapesquera', 'poi', 'it', 'description', 'Spiaggia bandiera blu con sabbia fine e acque calme. Dispone di chiringuitos, docce, lettini e sorveglianza in stagione. Perfetta per gustare gli espetos andalusi.'),
('poi_benalmadena_malapesquera', 'poi', 'it', 'short_tip', 'Gli spiedini di sardine al chiringuito sono d''obbligo'),
('poi_benalmadena_malapesquera', 'poi', 'pt', 'name', 'Praia de Malapesquera'),
('poi_benalmadena_malapesquera', 'poi', 'pt', 'description', 'Praia com bandeira azul, areia fina e águas calmas. Conta com quiosques de praia, duches, espreguiçadeiras e vigilância na época balnear. Perfeita para os espetos andaluzes.'),
('poi_benalmadena_malapesquera', 'poi', 'pt', 'short_tip', 'Os espetos de sardinhas no quiosque são obrigatórios'),

('poi_benalmadena_pueblo', 'poi', 'it', 'name', 'Centro storico di Benalmádena'),
('poi_benalmadena_pueblo', 'poi', 'it', 'description', 'Il centro storico: strade acciottolate, case bianche con vasi colorati e belvedere con viste spettacolari sul mare. Da non perdere il Museo di Arte Precolombiana e la Chiesa di Santo Domingo.'),
('poi_benalmadena_pueblo', 'poi', 'it', 'short_tip', 'Il belvedere accanto alla chiesa di Santo Domingo ha il miglior tramonto della Costa del Sol'),
('poi_benalmadena_pueblo', 'poi', 'pt', 'name', 'Benalmádena Pueblo'),
('poi_benalmadena_pueblo', 'poi', 'pt', 'description', 'O centro histórico: ruas de calçada, casas brancas com vasos coloridos e miradouros com vistas espetaculares para o mar. Não perca o Museu de Arte Pré-Colombiana e a Igreja de Santo Domingo.'),
('poi_benalmadena_pueblo', 'poi', 'pt', 'short_tip', 'O miradouro junto à igreja de Santo Domingo tem o melhor pôr do sol da Costa del Sol'),

('poi_benalmadena_plaza_espana', 'poi', 'it', 'name', 'Plaza de España (Benalmádena Pueblo)'),
('poi_benalmadena_plaza_espana', 'poi', 'it', 'description', 'Piazza centrale del centro storico, punto d''incontro con terrazze, vicina alla Chiesa di Santo Domingo e con vista sulla vallata. Ideale per iniziare la visita al paese.'),
('poi_benalmadena_plaza_espana', 'poi', 'it', 'short_tip', 'Buon punto di riferimento per parcheggiare ed esplorare il paese a piedi'),
('poi_benalmadena_plaza_espana', 'poi', 'pt', 'name', 'Plaza de España (Benalmádena Pueblo)'),
('poi_benalmadena_plaza_espana', 'poi', 'pt', 'description', 'Praça central do centro histórico, ponto de encontro com esplanadas, perto da Igreja de Santo Domingo e com vista para o vale. Ideal para começar a visita à vila.'),
('poi_benalmadena_plaza_espana', 'poi', 'pt', 'short_tip', 'Bom ponto de referência para estacionar e explorar a vila a pé'),

('poi_benalmadena_teleferico', 'poi', 'it', 'name', 'Funivia di Benalmádena'),
('poi_benalmadena_teleferico', 'poi', 'it', 'description', 'Sali in 15 minuti ai 769 m del Monte Calamorro per viste su tutta la Costa del Sol, Gibilterra e il nord Africa. In cima: spettacoli di rapaci e sentieri escursionistici. Unica sulla costa.'),
('poi_benalmadena_teleferico', 'poi', 'it', 'cta_label', 'Acquista i biglietti'),
('poi_benalmadena_teleferico', 'poi', 'pt', 'name', 'Teleférico de Benalmádena'),
('poi_benalmadena_teleferico', 'poi', 'pt', 'description', 'Suba em 15 min até aos 769 m do Monte Calamorro para vistas sobre toda a Costa del Sol, Gibraltar e o norte de África. No topo: exibições de aves de rapina e trilhos de caminhada. Único na costa.'),
('poi_benalmadena_teleferico', 'poi', 'pt', 'cta_label', 'Comprar bilhetes'),

('poi_benalmadena_mariposario', 'poi', 'it', 'name', 'Mariposario de Benalmádena'),
('poi_benalmadena_mariposario', 'poi', 'it', 'description', 'Una delle più grandi serre di farfalle d''Europa, con migliaia di farfalle tropicali che volano libere in una serra accanto alla Stupa buddista.'),
('poi_benalmadena_mariposario', 'poi', 'it', 'cta_label', 'Acquista i biglietti'),
('poi_benalmadena_mariposario', 'poi', 'pt', 'name', 'Mariposário de Benalmádena'),
('poi_benalmadena_mariposario', 'poi', 'pt', 'description', 'Um dos maiores mariposários da Europa, com milhares de borboletas tropicais a voar livremente numa estufa junto à Estupa Budista.'),
('poi_benalmadena_mariposario', 'poi', 'pt', 'cta_label', 'Comprar bilhetes'),

('poi_benalmadena_selwo_marina', 'poi', 'it', 'name', 'Selwo Marina'),
('poi_benalmadena_selwo_marina', 'poi', 'it', 'description', 'Parco marino con delfinario, colonia di pinguini e uccelli esotici, accanto al porto di Benalmádena. L''unico parco di questo tipo nella zona.'),
('poi_benalmadena_selwo_marina', 'poi', 'it', 'cta_label', 'Acquista i biglietti'),
('poi_benalmadena_selwo_marina', 'poi', 'pt', 'name', 'Selwo Marina'),
('poi_benalmadena_selwo_marina', 'poi', 'pt', 'description', 'Parque marinho com delfinário, colónia de pinguins e aves exóticas, junto ao porto de Benalmádena. O único parque deste tipo na região.'),
('poi_benalmadena_selwo_marina', 'poi', 'pt', 'cta_label', 'Comprar bilhetes'),

-- ════════════════════════════════════════
-- FUENGIROLA — FREE
-- ════════════════════════════════════════
('poi_fuengirola_castillo_sohail', 'poi', 'it', 'name', 'Castello Sohail'),
('poi_fuengirola_castillo_sohail', 'poi', 'it', 'description', 'Fortezza moresca del X secolo alla foce del fiume Fuengirola, ricostruita dopo un terremoto nel XVIII secolo. Il recinto esterno si visita gratuitamente; oggi ospita concerti.'),
('poi_fuengirola_castillo_sohail', 'poi', 'it', 'short_tip', 'In estate si tengono concerti all''interno del castello — controlla il programma'),
('poi_fuengirola_castillo_sohail', 'poi', 'pt', 'name', 'Castelo Sohail'),
('poi_fuengirola_castillo_sohail', 'poi', 'pt', 'description', 'Fortaleza árabe do século X na foz do rio Fuengirola, reconstruída após um terramoto no século XVIII. O recinto exterior visita-se gratuitamente; hoje acolhe concertos.'),
('poi_fuengirola_castillo_sohail', 'poi', 'pt', 'short_tip', 'No verão realizam-se concertos dentro do castelo — consulte a programação'),

('poi_fuengirola_paseo_maritimo', 'poi', 'it', 'name', 'Lungomare Rey de España'),
('poi_fuengirola_paseo_maritimo', 'poi', 'it', 'description', 'Uno dei lungomare più lunghi della Costa del Sol (oltre 7 km), che percorre tutto il fronte spiagge di Fuengirola.'),
('poi_fuengirola_paseo_maritimo', 'poi', 'it', 'short_tip', 'Perfetto per correre o andare in bici all''alba'),
('poi_fuengirola_paseo_maritimo', 'poi', 'pt', 'name', 'Passeio Marítimo Rey de España'),
('poi_fuengirola_paseo_maritimo', 'poi', 'pt', 'description', 'Um dos passeios marítimos mais longos da Costa del Sol (mais de 7 km), que percorre toda a frente de praias de Fuengirola.'),
('poi_fuengirola_paseo_maritimo', 'poi', 'pt', 'short_tip', 'Perfeito para correr ou andar de bicicleta ao amanhecer'),

('poi_fuengirola_casco_antiguo', 'poi', 'it', 'name', 'Centro storico di Fuengirola'),
('poi_fuengirola_casco_antiguo', 'poi', 'it', 'description', 'Strade pedonali intorno a Plaza de la Constitución, con negozi locali, mercato del martedì e tapas tradizionali.'),
('poi_fuengirola_casco_antiguo', 'poi', 'it', 'short_tip', 'Il mercatino del martedì al recinto fieristico è molto popolare'),
('poi_fuengirola_casco_antiguo', 'poi', 'pt', 'name', 'Centro Histórico de Fuengirola'),
('poi_fuengirola_casco_antiguo', 'poi', 'pt', 'description', 'Ruas pedonais em torno da Plaza de la Constitución, com comércio local, mercado das terças-feiras e petiscos tradicionais.'),
('poi_fuengirola_casco_antiguo', 'poi', 'pt', 'short_tip', 'O mercado de rua das terças-feiras no recinto ferial é muito popular'),

('poi_fuengirola_parque_fluvial', 'poi', 'it', 'name', 'Parco Fluviale del Río Fuengirola'),
('poi_fuengirola_parque_fluvial', 'poi', 'it', 'description', 'Corridoio verde lungo il letto del fiume, con pista ciclabile e zone d''ombra. Una fuga tranquilla lontano dalla spiaggia, poco conosciuta dai visitatori.'),
('poi_fuengirola_parque_fluvial', 'poi', 'it', 'short_tip', 'Collega a piedi o in bici il Bioparc e il Castello Sohail'),
('poi_fuengirola_parque_fluvial', 'poi', 'pt', 'name', 'Parque Fluvial do Rio Fuengirola'),
('poi_fuengirola_parque_fluvial', 'poi', 'pt', 'description', 'Corredor verde junto ao leito do rio, com ciclovia e zonas de sombra. Uma escapadela tranquila longe da praia, pouco conhecida dos visitantes.'),
('poi_fuengirola_parque_fluvial', 'poi', 'pt', 'short_tip', 'Liga a pé ou de bicicleta ao Bioparc e ao Castelo Sohail'),

('poi_fuengirola_boliches', 'poi', 'it', 'name', 'Los Boliches'),
('poi_fuengirola_boliches', 'poi', 'it', 'description', 'Antico quartiere di pescatori oggi parte di Fuengirola, con vicoli stretti, una chiesa propria e un ottimo ambiente di tapas sul mare.'),
('poi_fuengirola_boliches', 'poi', 'it', 'short_tip', 'Meno turistico del centro — buona scelta per mangiare pesce fresco'),
('poi_fuengirola_boliches', 'poi', 'pt', 'name', 'Los Boliches'),
('poi_fuengirola_boliches', 'poi', 'pt', 'description', 'Antigo bairro de pescadores hoje integrado em Fuengirola, com ruas estreitas, igreja própria e um bom ambiente de petiscos junto ao mar.'),
('poi_fuengirola_boliches', 'poi', 'pt', 'short_tip', 'Menos turístico do que o centro — boa opção para comer peixe fresco'),

('poi_fuengirola_santa_amalia', 'poi', 'it', 'name', 'Spiaggia di Santa Amalia'),
('poi_fuengirola_santa_amalia', 'poi', 'it', 'description', 'Ampia spiaggia urbana ben attrezzata, con bandiera blu, chiringuitos e tutti i servizi. Una delle preferite dalle famiglie.'),
('poi_fuengirola_santa_amalia', 'poi', 'it', 'short_tip', 'Buona opzione con bambini per l''accesso facile e le acque calme'),
('poi_fuengirola_santa_amalia', 'poi', 'pt', 'name', 'Praia de Santa Amalia'),
('poi_fuengirola_santa_amalia', 'poi', 'pt', 'description', 'Praia urbana ampla e bem equipada, com bandeira azul, quiosques de praia e todos os serviços. Uma das preferidas das famílias.'),
('poi_fuengirola_santa_amalia', 'poi', 'pt', 'short_tip', 'Boa opção com crianças pelo acesso fácil e águas tranquilas'),

-- ════════════════════════════════════════
-- FUENGIROLA — PREMIUM
-- ════════════════════════════════════════
('poi_fuengirola_bioparc', 'poi', 'it', 'name', 'Bioparc Fuengirola'),
('poi_fuengirola_bioparc', 'poi', 'it', 'description', 'Zoo di immersione (senza gabbie o inferriate visibili) con oltre 200 specie, molte a rischio di estinzione. Tra le 10 migliori attrazioni della provincia di Málaga su TripAdvisor.'),
('poi_fuengirola_bioparc', 'poi', 'it', 'cta_label', 'Acquista i biglietti'),
('poi_fuengirola_bioparc', 'poi', 'pt', 'name', 'Bioparc Fuengirola'),
('poi_fuengirola_bioparc', 'poi', 'pt', 'description', 'Zoo de imersão (sem jaulas ou grades visíveis) com mais de 200 espécies, muitas em risco de extinção. Top 10 das atrações da província de Málaga no TripAdvisor.'),
('poi_fuengirola_bioparc', 'poi', 'pt', 'cta_label', 'Comprar bilhetes'),

-- ════════════════════════════════════════
-- MIJAS — FREE
-- ════════════════════════════════════════
('poi_mijas_casco_antiguo', 'poi', 'it', 'name', 'Centro storico di Mijas Pueblo'),
('poi_mijas_casco_antiguo', 'poi', 'it', 'description', 'Il paese bianco arroccato sulla montagna, con strade acciottolate, vasi di gerani e vista sul Mediterraneo. Uno dei paesi più affascinanti della Costa del Sol.'),
('poi_mijas_casco_antiguo', 'poi', 'it', 'short_tip', 'Parcheggia all''ingresso del paese — il centro è completamente pedonale'),
('poi_mijas_casco_antiguo', 'poi', 'pt', 'name', 'Centro Histórico de Mijas Pueblo'),
('poi_mijas_casco_antiguo', 'poi', 'pt', 'description', 'A vila branca empoleirada na serra, com ruas de calçada, vasos de gerânios e vista para o Mediterrâneo. Uma das vilas com mais encanto da Costa del Sol.'),
('poi_mijas_casco_antiguo', 'poi', 'pt', 'short_tip', 'Estacione à entrada da vila — o centro é totalmente pedonal'),

('poi_mijas_mirador_compas', 'poi', 'it', 'name', 'Mirador del Compás'),
('poi_mijas_mirador_compas', 'poi', 'it', 'description', 'Balcone naturale con vista spettacolare su Fuengirola, la costa e, nelle giornate limpide, fino all''Africa. Uno dei migliori belvedere gratuiti della zona.'),
('poi_mijas_mirador_compas', 'poi', 'it', 'short_tip', 'Le giornate invernali limpide offrono la migliore visibilità'),
('poi_mijas_mirador_compas', 'poi', 'pt', 'name', 'Mirador del Compás'),
('poi_mijas_mirador_compas', 'poi', 'pt', 'description', 'Varanda natural com vistas espetaculares sobre Fuengirola, a costa e, em dias claros, até África. Um dos melhores miradouros gratuitos da região.'),
('poi_mijas_mirador_compas', 'poi', 'pt', 'short_tip', 'Os dias de inverno limpos oferecem a melhor visibilidade'),

('poi_mijas_jardines_muralla', 'poi', 'it', 'name', 'Giardini della Muraglia'),
('poi_mijas_jardines_muralla', 'poi', 'it', 'description', 'Giardini terrazzati costruiti sui resti dell''antica muraglia araba del paese, con belvedere e vegetazione mediterranea.'),
('poi_mijas_jardines_muralla', 'poi', 'it', 'short_tip', 'Una passeggiata breve ma piena di fascino, ideale prima o dopo pranzo'),
('poi_mijas_jardines_muralla', 'poi', 'pt', 'name', 'Jardins da Muralha'),
('poi_mijas_jardines_muralla', 'poi', 'pt', 'description', 'Jardins em socalcos construídos sobre os restos da antiga muralha árabe da vila, com miradouros e vegetação mediterrânica.'),
('poi_mijas_jardines_muralla', 'poi', 'pt', 'short_tip', 'Um passeio curto mas com muito encanto, ideal antes ou depois de almoçar'),

('poi_mijas_ermita_peña', 'poi', 'it', 'name', 'Eremo della Virgen de la Peña'),
('poi_mijas_ermita_peña', 'poi', 'it', 'description', 'Piccolo eremo scavato direttamente nella roccia, dedicato alla patrona di Mijas. Uno dei gioielli più singolari del paese.'),
('poi_mijas_ermita_peña', 'poi', 'it', 'short_tip', 'Ingresso gratuito — visita rapida ma molto speciale'),
('poi_mijas_ermita_peña', 'poi', 'pt', 'name', 'Ermida da Virgen de la Peña'),
('poi_mijas_ermita_peña', 'poi', 'pt', 'description', 'Pequena ermida escavada diretamente na rocha, dedicada à padroeira de Mijas. Uma das joias mais singulares da vila.'),
('poi_mijas_ermita_peña', 'poi', 'pt', 'short_tip', 'Entrada gratuita — visita rápida mas muito especial'),

('poi_mijas_plaza_virgen_peña', 'poi', 'it', 'name', 'Plaza Virgen de la Peña'),
('poi_mijas_plaza_virgen_peña', 'poi', 'it', 'description', 'Piazza principale del paese, punto di partenza dei burro-taxi e con le migliori viste sulla vallata dal suo balcone.'),
('poi_mijas_plaza_virgen_peña', 'poi', 'it', 'short_tip', 'Punto d''incontro abituale — tutto è facile da trovare da qui'),
('poi_mijas_plaza_virgen_peña', 'poi', 'pt', 'name', 'Plaza Virgen de la Peña'),
('poi_mijas_plaza_virgen_peña', 'poi', 'pt', 'description', 'Praça principal da vila, ponto de partida dos burro-taxi e com as melhores vistas para o vale a partir da sua varanda.'),
('poi_mijas_plaza_virgen_peña', 'poi', 'pt', 'short_tip', 'Ponto de encontro habitual — fácil de localizar tudo a partir daqui'),

('poi_mijas_cac', 'poi', 'it', 'name', 'CAC Mijas (Centro d''Arte Contemporanea)'),
('poi_mijas_cac', 'poi', 'it', 'description', 'Collezione permanente con opere originali di Picasso, Dalí e Miró, a ingresso gratuito. Sorprendente per un paese di queste dimensioni.'),
('poi_mijas_cac', 'poi', 'it', 'short_tip', 'Ingresso gratuito — da non perdere anche se i musei non fanno per te'),
('poi_mijas_cac', 'poi', 'pt', 'name', 'CAC Mijas (Centro de Arte Contemporânea)'),
('poi_mijas_cac', 'poi', 'pt', 'description', 'Coleção permanente que inclui obras originais de Picasso, Dalí e Miró, com entrada gratuita. Surpreendente para uma vila deste tamanho.'),
('poi_mijas_cac', 'poi', 'pt', 'short_tip', 'Entrada gratuita — imprescindível mesmo que não goste de museus'),

('poi_mijas_cala', 'poi', 'it', 'name', 'Spiaggia di La Cala de Mijas'),
('poi_mijas_cala', 'poi', 'it', 'description', 'La spiaggia di Mijas Costa, con un lungomare animato, chiringuitos e un''atmosfera più tranquilla rispetto a Fuengirola o Marbella.'),
('poi_mijas_cala', 'poi', 'it', 'short_tip', 'Buona base se alloggi vicino alla costa invece che al paese'),
('poi_mijas_cala', 'poi', 'pt', 'name', 'Praia de La Cala de Mijas'),
('poi_mijas_cala', 'poi', 'pt', 'description', 'A praia de Mijas Costa, com um passeio marítimo animado, quiosques de praia e ambiente mais tranquilo do que Fuengirola ou Marbella.'),
('poi_mijas_cala', 'poi', 'pt', 'short_tip', 'Boa base se estiver hospedado perto da costa em vez da vila'),

-- ════════════════════════════════════════
-- MIJAS — PREMIUM
-- ════════════════════════════════════════
('poi_mijas_carromato', 'poi', 'it', 'name', 'Carromato de Mijas (Museo delle Miniature)'),
('poi_mijas_carromato', 'poi', 'it', 'description', 'Museo delle miniature inaugurato nel 1972 dentro un carro di legno, con oltre 300 pezzi da 50 paesi raccolti dal "Professor Max". Un insolito gioiello del paese.'),
('poi_mijas_carromato', 'poi', 'it', 'cta_label', 'Maggiori informazioni'),
('poi_mijas_carromato', 'poi', 'pt', 'name', 'Carromato de Mijas (Museu de Miniaturas)'),
('poi_mijas_carromato', 'poi', 'pt', 'description', 'Museu de miniaturas inaugurado em 1972 dentro de uma carroça de madeira, com mais de 300 peças de 50 países reunidas pelo "Professor Max". Uma joia insólita da vila.'),
('poi_mijas_carromato', 'poi', 'pt', 'cta_label', 'Mais informações'),

('poi_mijas_plaza_toros', 'poi', 'it', 'name', 'Arena di Mijas'),
('poi_mijas_plaza_toros', 'poi', 'it', 'description', 'Una delle poche arene ovali al mondo, costruita nel 1900 su un''antica cisterna araba. Include un piccolo museo taurino.'),
('poi_mijas_plaza_toros', 'poi', 'it', 'cta_label', 'Maggiori informazioni'),
('poi_mijas_plaza_toros', 'poi', 'pt', 'name', 'Praça de Touros de Mijas'),
('poi_mijas_plaza_toros', 'poi', 'pt', 'description', 'Uma das poucas praças de touros ovais do mundo, construída em 1900 sobre uma antiga cisterna árabe. Inclui um pequeno museu taurino.'),
('poi_mijas_plaza_toros', 'poi', 'pt', 'cta_label', 'Mais informações'),

('poi_mijas_burro_taxi', 'poi', 'it', 'name', 'Burro-Taxi di Mijas'),
('poi_mijas_burro_taxi', 'poi', 'it', 'description', 'Tradizionale passeggiata in groppa a un asino per le vie del paese, simbolo storico di Mijas dagli anni ''60. Si parte da Plaza Virgen de la Peña.'),
('poi_mijas_burro_taxi', 'poi', 'it', 'short_tip', 'Alcuni visitatori sollevano dubbi sul benessere degli animali — da considerare prima di prenotare'),
('poi_mijas_burro_taxi', 'poi', 'it', 'cta_label', 'Maggiori informazioni'),
('poi_mijas_burro_taxi', 'poi', 'pt', 'name', 'Burro-Táxi de Mijas'),
('poi_mijas_burro_taxi', 'poi', 'pt', 'description', 'Passeio tradicional de burro pelas ruas da vila, símbolo histórico de Mijas desde os anos 60. Parte da Plaza Virgen de la Peña.'),
('poi_mijas_burro_taxi', 'poi', 'pt', 'short_tip', 'Alguns visitantes levantam dúvidas sobre o bem-estar animal — considere antes de reservar'),
('poi_mijas_burro_taxi', 'poi', 'pt', 'cta_label', 'Mais informações'),

-- ════════════════════════════════════════
-- MARBELLA — FREE
-- ════════════════════════════════════════
('poi_marbella_naranjos', 'poi', 'it', 'name', 'Plaza de los Naranjos'),
('poi_marbella_naranjos', 'poi', 'it', 'description', 'Il cuore del centro storico dal 1485, con aranci, il municipio rinascimentale e terrazze in un ambiente impeccabilmente curato.'),
('poi_marbella_naranjos', 'poi', 'it', 'short_tip', 'Punto di partenza ideale per perdersi nel labirinto di vicoli bianchi'),
('poi_marbella_naranjos', 'poi', 'pt', 'name', 'Plaza de los Naranjos'),
('poi_marbella_naranjos', 'poi', 'pt', 'description', 'O coração do centro histórico desde 1485, com laranjeiras, a câmara municipal renascentista e esplanadas num ambiente impecavelmente cuidado.'),
('poi_marbella_naranjos', 'poi', 'pt', 'short_tip', 'Ponto de partida ideal para se perder no labirinto de ruas brancas'),

('poi_marbella_murallas', 'poi', 'it', 'name', 'Mura del Castello Arabo'),
('poi_marbella_murallas', 'poi', 'it', 'description', 'Resti della fortificazione araba del X secolo che proteggeva l''antica Marbella, ancora visibili tra le vie del centro storico.'),
('poi_marbella_murallas', 'poi', 'it', 'short_tip', 'Facile da combinare con una passeggiata a Plaza de los Naranjos'),
('poi_marbella_murallas', 'poi', 'pt', 'name', 'Muralhas do Castelo Árabe'),
('poi_marbella_murallas', 'poi', 'pt', 'description', 'Vestígios da fortificação árabe do século X que protegia a antiga Marbella, ainda visíveis entre as ruas do centro histórico.'),
('poi_marbella_murallas', 'poi', 'pt', 'short_tip', 'Fácil de combinar com um passeio pela Plaza de los Naranjos'),

('poi_marbella_encarnacion', 'poi', 'it', 'name', 'Chiesa dell''Encarnación'),
('poi_marbella_encarnacion', 'poi', 'it', 'description', 'Chiesa principale del centro storico, costruita tra il XVI e il XVIII secolo, con una facciata barocca e un campanile che domina lo skyline del centro storico.'),
('poi_marbella_encarnacion', 'poi', 'it', 'short_tip', 'Ingresso gratuito fuori dagli orari delle messe'),
('poi_marbella_encarnacion', 'poi', 'pt', 'name', 'Igreja da Encarnación'),
('poi_marbella_encarnacion', 'poi', 'pt', 'description', 'Igreja principal do centro histórico, construída entre os séculos XVI e XVIII, com uma fachada barroca e um campanário que domina o horizonte do centro histórico.'),
('poi_marbella_encarnacion', 'poi', 'pt', 'short_tip', 'Entrada gratuita fora dos horários de missa'),

('poi_marbella_avenida_mar', 'poi', 'it', 'name', 'Avenida del Mar'),
('poi_marbella_avenida_mar', 'poi', 'it', 'description', 'Viale pedonale che collega il centro storico alla spiaggia, con 10 sculture originali di Salvador Dalí esposte all''aperto — una collezione unica sulla costa.'),
('poi_marbella_avenida_mar', 'poi', 'it', 'short_tip', 'Cerca "L''Uomo Elefante" e "Nobiltà del Tempo", le più fotografate'),
('poi_marbella_avenida_mar', 'poi', 'pt', 'name', 'Avenida del Mar'),
('poi_marbella_avenida_mar', 'poi', 'pt', 'description', 'Avenida pedonal que liga o centro histórico à praia, com 10 esculturas originais de Salvador Dalí expostas ao ar livre — uma coleção única na costa.'),
('poi_marbella_avenida_mar', 'poi', 'pt', 'short_tip', 'Procure "O Homem Elefante" e "Nobreza do Tempo", as mais fotografadas'),

('poi_marbella_villa_romana', 'poi', 'it', 'name', 'Villa Romana di Río Verde'),
('poi_marbella_villa_romana', 'poi', 'it', 'description', 'Sito archeologico di una villa romana del I-II secolo d.C. con mosaici originali molto ben conservati. Un gioiello nascosto che pochi turisti visitano.'),
('poi_marbella_villa_romana', 'poi', 'it', 'short_tip', 'Controlla gli orari di apertura prima di andare — sono ridotti'),
('poi_marbella_villa_romana', 'poi', 'pt', 'name', 'Vila Romana de Río Verde'),
('poi_marbella_villa_romana', 'poi', 'pt', 'description', 'Sítio arqueológico de uma vila romana dos séculos I-II d.C. com mosaicos originais muito bem conservados. Uma joia escondida que poucos turistas visitam.'),
('poi_marbella_villa_romana', 'poi', 'pt', 'short_tip', 'Verifique o horário de funcionamento antes de ir — é reduzido'),

('poi_marbella_basilica_vega', 'poi', 'it', 'name', 'Basilica Paleocristiana di Vega del Mar'),
('poi_marbella_basilica_vega', 'poi', 'it', 'description', 'Resti di una basilica visigota dei secoli IV-VI, con un''insolita doppia abside. Si trova vicino alla foce del fiume Guadalmina, a San Pedro de Alcántara.'),
('poi_marbella_basilica_vega', 'poi', 'it', 'short_tip', 'Combinala con le Terme Romane di Las Bóvedas, sono proprio accanto'),
('poi_marbella_basilica_vega', 'poi', 'pt', 'name', 'Basílica Paleocristã de Vega del Mar'),
('poi_marbella_basilica_vega', 'poi', 'pt', 'description', 'Vestígios de uma basílica visigótica dos séculos IV-VI, com uma insólita dupla cabeceira. Situa-se junto à foz do rio Guadalmina, em San Pedro de Alcántara.'),
('poi_marbella_basilica_vega', 'poi', 'pt', 'short_tip', 'Combine com as Termas Romanas de Las Bóvedas, ficam ao lado'),

('poi_marbella_termas', 'poi', 'it', 'name', 'Terme Romane di Las Bóvedas'),
('poi_marbella_termas', 'poi', 'it', 'description', 'Terme romane del III-IV secolo, tra le meglio conservate dell''Andalusia, con sale per bagni freddi, tiepidi e caldi ancora riconoscibili.'),
('poi_marbella_termas', 'poi', 'it', 'short_tip', 'Si visitano gratis ma con orari limitati — controlla prima'),
('poi_marbella_termas', 'poi', 'pt', 'name', 'Termas Romanas de Las Bóvedas'),
('poi_marbella_termas', 'poi', 'pt', 'description', 'Banhos termais romanos dos séculos III-IV, dos melhor conservados da Andaluzia, com salas de banho frio, morno e quente ainda reconhecíveis.'),
('poi_marbella_termas', 'poi', 'pt', 'short_tip', 'Visitam-se gratuitamente mas com horário limitado — verifique antes'),

('poi_marbella_puerto_banus', 'poi', 'it', 'name', 'Puerto Banús'),
('poi_marbella_puerto_banus', 'poi', 'it', 'description', 'Il porto turistico di lusso più famoso di Spagna, con yacht, auto sportive e boutique di alta gamma. Uno spettacolo gratuito di persone e stile di vita.'),
('poi_marbella_puerto_banus', 'poi', 'it', 'short_tip', 'Vai al tramonto per vedere gli yacht illuminati'),
('poi_marbella_puerto_banus', 'poi', 'pt', 'name', 'Puerto Banús'),
('poi_marbella_puerto_banus', 'poi', 'pt', 'description', 'A marina de luxo mais famosa de Espanha, com iates, carros desportivos e boutiques de alta gama. Um espetáculo gratuito de pessoas e estilo de vida.'),
('poi_marbella_puerto_banus', 'poi', 'pt', 'short_tip', 'Vá ao entardecer para ver os iates iluminados'),

('poi_marbella_fontanilla', 'poi', 'it', 'name', 'Spiaggia della Fontanilla'),
('poi_marbella_fontanilla', 'poi', 'it', 'description', 'Spiaggia urbana accanto al centro storico, con lungomare, chiringuitos e il Cable Ski Marbella nelle vicinanze. Facile da combinare con la visita al centro.'),
('poi_marbella_fontanilla', 'poi', 'it', 'short_tip', 'A 10 minuti a piedi da Plaza de los Naranjos'),
('poi_marbella_fontanilla', 'poi', 'pt', 'name', 'Praia da Fontanilla'),
('poi_marbella_fontanilla', 'poi', 'pt', 'description', 'Praia urbana junto ao centro histórico, com passeio marítimo, quiosques de praia e o Cable Ski Marbella nas proximidades. Fácil de combinar com a visita ao centro.'),
('poi_marbella_fontanilla', 'poi', 'pt', 'short_tip', 'A 10 minutos a pé da Plaza de los Naranjos'),

('poi_marbella_museo_ralli', 'poi', 'it', 'name', 'Museo Ralli Marbella'),
('poi_marbella_museo_ralli', 'poi', 'it', 'description', 'Museo di arte latinoamericana ed europea contemporanea (Dalí, Botero, tra gli altri) con ingresso completamente gratuito — raro per una collezione di questo livello.'),
('poi_marbella_museo_ralli', 'poi', 'it', 'short_tip', 'Chiuso il lunedì e in estate (lug-ago); controlla prima di andare'),
('poi_marbella_museo_ralli', 'poi', 'pt', 'name', 'Museu Ralli Marbella'),
('poi_marbella_museo_ralli', 'poi', 'pt', 'description', 'Museu de arte latino-americana e europeia contemporânea (Dalí, Botero, entre outros) com entrada totalmente gratuita — pouco comum para uma coleção deste nível.'),
('poi_marbella_museo_ralli', 'poi', 'pt', 'short_tip', 'Fechado às segundas-feiras e no verão (jul-ago); verifique antes de ir'),

-- ════════════════════════════════════════
-- MARBELLA — PREMIUM
-- ════════════════════════════════════════
('poi_marbella_museo_grabado', 'poi', 'it', 'name', 'Museo dell''Incisione Spagnola Contemporanea'),
('poi_marbella_museo_grabado', 'poi', 'it', 'description', 'L''unico museo di Spagna dedicato esclusivamente all''incisione, con opere di Picasso, Miró e Dalí, in un edificio del XVI secolo del centro storico.'),
('poi_marbella_museo_grabado', 'poi', 'it', 'cta_label', 'Maggiori informazioni'),
('poi_marbella_museo_grabado', 'poi', 'pt', 'name', 'Museu da Gravura Espanhola Contemporânea'),
('poi_marbella_museo_grabado', 'poi', 'pt', 'description', 'O único museu de Espanha dedicado exclusivamente à gravura, com obras de Picasso, Miró e Dalí, num edifício do século XVI do centro histórico.'),
('poi_marbella_museo_grabado', 'poi', 'pt', 'cta_label', 'Mais informações'),

('poi_marbella_museo_bonsai', 'poi', 'it', 'name', 'Museo del Bonsai'),
('poi_marbella_museo_bonsai', 'poi', 'it', 'description', 'Una delle collezioni di bonsai più importanti d''Europa, con esemplari secolari nel Parque de la Represa. Un''esperienza unica e poco conosciuta.'),
('poi_marbella_museo_bonsai', 'poi', 'it', 'cta_label', 'Maggiori informazioni'),
('poi_marbella_museo_bonsai', 'poi', 'pt', 'name', 'Museu do Bonsai'),
('poi_marbella_museo_bonsai', 'poi', 'pt', 'description', 'Uma das coleções de bonsais mais importantes da Europa, com exemplares centenários no Parque de la Represa. Uma experiência única e pouco conhecida.'),
('poi_marbella_museo_bonsai', 'poi', 'pt', 'cta_label', 'Mais informações'),

-- ════════════════════════════════════════
-- BENALMÁDENA — DEMO SERVICES
-- ════════════════════════════════════════
('exp_benalmadena_kayak', 'poi', 'it', 'name', 'Noleggio Kayak'),
('exp_benalmadena_kayak', 'poi', 'it', 'description', 'Esplora la Costa del Sol in kayak da Puerto Marina. Tutta l''attrezzatura inclusa. Non è richiesta esperienza precedente. Istruttori certificati disponibili.'),
('exp_benalmadena_kayak', 'poi', 'it', 'cta_label', 'Prenota su WhatsApp'),
('exp_benalmadena_kayak', 'poi', 'pt', 'name', 'Aluguer de Caiaque'),
('exp_benalmadena_kayak', 'poi', 'pt', 'description', 'Explore a Costa del Sol de caiaque a partir do Puerto Marina. Todo o equipamento incluído. Não é necessária experiência prévia. Monitores certificados disponíveis.'),
('exp_benalmadena_kayak', 'poi', 'pt', 'cta_label', 'Reservar via WhatsApp'),

('exp_benalmadena_catamaran', 'poi', 'it', 'name', 'Tour in Catamarano'),
('exp_benalmadena_catamaran', 'poi', 'it', 'description', 'Escursione di 3 ore lungo la Costa del Sol: avvistamento di delfini, snorkeling e open bar inclusi. Partenze giornaliere da Puerto Marina. Un''esperienza indimenticabile!'),
('exp_benalmadena_catamaran', 'poi', 'it', 'cta_label', 'Prenota ora'),
('exp_benalmadena_catamaran', 'poi', 'pt', 'name', 'Passeio de Catamarã'),
('exp_benalmadena_catamaran', 'poi', 'pt', 'description', 'Passeio de 3 horas pela Costa del Sol: observação de golfinhos, snorkeling e open bar incluídos. Partidas diárias a partir do Puerto Marina. Uma experiência inesquecível!'),
('exp_benalmadena_catamaran', 'poi', 'pt', 'cta_label', 'Reservar agora'),

('exp_benalmadena_taxi', 'poi', 'it', 'name', 'Transfer Aeroporto di Málaga'),
('exp_benalmadena_taxi', 'poi', 'it', 'description', 'Taxi privato porta a porta tra l''appartamento e l''Aeroporto di Málaga-Costa del Sol. Disponibile 24 ore su 24, 7 giorni su 7. Prenota in anticipo per garantire la disponibilità.'),
('exp_benalmadena_taxi', 'poi', 'it', 'cta_label', 'Richiedi il transfer'),
('exp_benalmadena_taxi', 'poi', 'pt', 'name', 'Transfer Aeroporto de Málaga'),
('exp_benalmadena_taxi', 'poi', 'pt', 'description', 'Táxi privado porta-a-porta entre o apartamento e o Aeroporto de Málaga-Costa del Sol. Disponível 24h, 7 dias por semana. Reserve com antecedência para garantir disponibilidade.'),
('exp_benalmadena_taxi', 'poi', 'pt', 'cta_label', 'Solicitar transfer'),

('exp_benalmadena_spa', 'poi', 'it', 'name', 'Spa & Massaggio'),
('exp_benalmadena_spa', 'poi', 'it', 'description', 'Centro benessere a 10 min dall''appartamento. Massaggi rilassanti, rituali andalusi, bagno turco e jacuzzi. I nostri ospiti usufruiscono di uno sconto del 10% menzionando questa guida.'),
('exp_benalmadena_spa', 'poi', 'it', 'cta_label', 'Chiama per prenotare'),
('exp_benalmadena_spa', 'poi', 'pt', 'name', 'Spa & Massagem'),
('exp_benalmadena_spa', 'poi', 'pt', 'description', 'Centro de bem-estar a 10 min do apartamento. Massagens relaxantes, rituais andaluzes, banho turco e jacuzzi. Os nossos hóspedes desfrutam de 10% de desconto só por mencionar este guia.'),
('exp_benalmadena_spa', 'poi', 'pt', 'cta_label', 'Ligar para reservar');
