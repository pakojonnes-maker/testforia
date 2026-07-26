-- =====================================================
-- ZONE DESCRIPTIONS — FR/DE/IT/PT — MIGRATION 0065
-- =====================================================
-- Closes a gap found while verifying 0064: the 6 Costa del Sol zones only had
-- es/en descriptions (zone_benalmadena had fr/de too, from 0063). Adds the
-- missing languages so the zone header/subtitle in the guide isn't the only
-- thing silently falling back to Spanish while every POI under it is localized.
-- zone_nerja is untouched (separate pre-existing demo, out of scope here).
-- =====================================================

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES

('zone_malaga', 'zone', 'fr', 'name', 'Málaga'),
('zone_malaga', 'zone', 'fr', 'description', 'Capitale de la Costa del Sol : une vieille ville monumentale, des musées de renommée mondiale (Picasso, Pompidou, Thyssen) et un port rénové. Ville natale de Picasso.'),
('zone_malaga', 'zone', 'de', 'name', 'Málaga'),
('zone_malaga', 'zone', 'de', 'description', 'Hauptstadt der Costa del Sol: eine monumentale Altstadt, Weltklasse-Museen (Picasso, Pompidou, Thyssen) und ein renovierter Hafen. Geburtsort von Picasso.'),
('zone_malaga', 'zone', 'it', 'name', 'Málaga'),
('zone_malaga', 'zone', 'it', 'description', 'Capitale della Costa del Sol: un centro storico monumentale, musei di fama mondiale (Picasso, Pompidou, Thyssen) e un porto rinnovato. Città natale di Picasso.'),
('zone_malaga', 'zone', 'pt', 'name', 'Málaga'),
('zone_malaga', 'zone', 'pt', 'description', 'Capital da Costa del Sol: um centro histórico monumental, museus de classe mundial (Picasso, Pompidou, Thyssen) e um porto renovado. Terra natal de Picasso.'),

('zone_torremolinos', 'zone', 'fr', 'name', 'Torremolinos'),
('zone_torremolinos', 'zone', 'fr', 'description', 'La ville touristique historique de la Costa del Sol. De longues plages, le quartier de pêcheurs de La Carihuela et une ambiance animée jour et nuit.'),
('zone_torremolinos', 'zone', 'de', 'name', 'Torremolinos'),
('zone_torremolinos', 'zone', 'de', 'description', 'Die ursprüngliche Touristenstadt der Costa del Sol. Lange Strände, das Fischerviertel La Carihuela und Tag und Nacht eine lebendige Atmosphäre.'),
('zone_torremolinos', 'zone', 'it', 'name', 'Torremolinos'),
('zone_torremolinos', 'zone', 'it', 'description', 'La città turistica pionieristica della Costa del Sol. Spiagge estese, il quartiere di pescatori di La Carihuela e un''atmosfera animata giorno e notte.'),
('zone_torremolinos', 'zone', 'pt', 'name', 'Torremolinos'),
('zone_torremolinos', 'zone', 'pt', 'description', 'A cidade turística pioneira da Costa del Sol. Praias extensas, o bairro piscatório de La Carihuela e um ambiente animado de dia e de noite.'),

('zone_fuengirola', 'zone', 'fr', 'name', 'Fuengirola'),
('zone_fuengirola', 'zone', 'fr', 'description', '8 km de plages urbaines, une promenade maritime animée et le Bioparc, l''un des zoos d''immersion les plus réputés d''Espagne.'),
('zone_fuengirola', 'zone', 'de', 'name', 'Fuengirola'),
('zone_fuengirola', 'zone', 'de', 'description', '8 km Stadtstrände, eine lebhafte Strandpromenade und der Bioparc, einer der bekanntesten Immersions-Zoos Spaniens.'),
('zone_fuengirola', 'zone', 'it', 'name', 'Fuengirola'),
('zone_fuengirola', 'zone', 'it', 'description', '8 km di spiagge urbane, un lungomare animato e il Bioparc, uno degli zoo di immersione più rinomati di Spagna.'),
('zone_fuengirola', 'zone', 'pt', 'name', 'Fuengirola'),
('zone_fuengirola', 'zone', 'pt', 'description', '8 km de praias urbanas, um passeio marítimo animado e o Bioparc, um dos zoos de imersão mais reconhecidos de Espanha.'),

('zone_mijas', 'zone', 'fr', 'name', 'Mijas'),
('zone_mijas', 'zone', 'fr', 'description', 'Le village blanc emblématique de la Costa del Sol, perché sur la montagne avec vue sur la Méditerranée, des rues fleuries et les fameux ânes-taxis.'),
('zone_mijas', 'zone', 'de', 'name', 'Mijas'),
('zone_mijas', 'zone', 'de', 'description', 'Das typische weiße Dorf der Costa del Sol, hoch in den Bergen mit Blick auf das Mittelmeer, blumengeschmückten Straßen und den berühmten Esel-Taxis.'),
('zone_mijas', 'zone', 'it', 'name', 'Mijas'),
('zone_mijas', 'zone', 'it', 'description', 'Il paese bianco per eccellenza della Costa del Sol, arroccato sulla montagna con vista sul Mediterraneo, strade fiorite e i famosi burro-taxi.'),
('zone_mijas', 'zone', 'pt', 'name', 'Mijas'),
('zone_mijas', 'zone', 'pt', 'description', 'A vila branca por excelência da Costa del Sol, empoleirada na serra com vista para o Mediterrâneo, ruas floridas e os famosos burro-táxis.'),

('zone_marbella', 'zone', 'fr', 'name', 'Marbella'),
('zone_marbella', 'zone', 'fr', 'description', 'Luxe, une vieille ville andalouse impeccable et un riche patrimoine romain méconnu. Comprend Puerto Banús et San Pedro de Alcántara.'),
('zone_marbella', 'zone', 'de', 'name', 'Marbella'),
('zone_marbella', 'zone', 'de', 'description', 'Luxus, eine makellose andalusische Altstadt und ein wenig bekanntes, reiches römisches Erbe. Umfasst Puerto Banús und San Pedro de Alcántara.'),
('zone_marbella', 'zone', 'it', 'name', 'Marbella'),
('zone_marbella', 'zone', 'it', 'description', 'Lusso, un centro storico andaluso impeccabile e un ricco patrimonio romano poco conosciuto. Include Puerto Banús e San Pedro de Alcántara.'),
('zone_marbella', 'zone', 'pt', 'name', 'Marbella'),
('zone_marbella', 'zone', 'pt', 'description', 'Luxo, um centro histórico andaluz impecável e um rico património romano pouco conhecido. Inclui Puerto Banús e San Pedro de Alcántara.'),

('zone_benalmadena', 'zone', 'it', 'name', 'Benalmádena'),
('zone_benalmadena', 'zone', 'it', 'description', 'Gioiello della Costa del Sol, Benalmádena unisce spiagge bandiera blu, il vivace Puerto Marina, monumenti unici e un centro storico affascinante. A 20 minuti da Málaga in metro.'),
('zone_benalmadena', 'zone', 'pt', 'name', 'Benalmádena'),
('zone_benalmadena', 'zone', 'pt', 'description', 'Joia da Costa del Sol, Benalmádena combina praias com bandeira azul, o animado Puerto Marina, monumentos únicos e um centro histórico encantador. A 20 minutos do centro de Málaga de metro.');
