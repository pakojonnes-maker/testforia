-- =====================================================
-- BENALMÁDENA REPAIR — MIGRATION 0063
-- =====================================================
-- WHY THIS EXISTS
-- ---------------
-- migrations/0055_demo_benalmadena_apartment.sql was never applied to ANY
-- database (verified 2026-07-25: neither agency_cds_apts nor apt_demo_paloma
-- exist in production; local D1 holds a third, unrelated state). Migration 0060
-- trusted that file's contents ("zone_benalmadena already has 6 demo POIs — NOT
-- duplicated here") and therefore:
--   * skipped inserting those 6 POIs, leaving the zone with only 4, and
--   * only conditionally inserted the zone 'name', never 'description',
--     making zone_benalmadena the ONLY zone in the catalog with no description.
-- This migration repairs both gaps and deploys the demo apartment.
--
-- WHY 0055 IS NOT SIMPLY RE-RUN
-- -----------------------------
-- 1. Category vocabulary: 0055 uses raw slugs ('park','marina','monument',
--    'beach','viewpoint'); 0060 and the whole live catalog use display
--    categories ('Cultura','Playas','Naturaleza','Compras','Actividades').
--    DiscoverSection builds its filter chips from DISTINCT category values, so
--    replaying 0055 would give Benalmádena a different chip vocabulary from
--    every other zone.
-- 2. 0055 stores travel_time_text / travel_mode / distance_text ON the POI row.
--    Those are relative to a specific apartment, and migration 0059 moved them
--    to guide_apartment_pois. Replaying 0055 would reintroduce that modeling bug.
-- 3. 0055 writes experiences into the deprecated guide_experiences table and
--    tags translations as entity_type='experience'; both are superseded by the
--    unified guide_pois model (is_bookable = 1, entity_type='poi').
-- So the content of 0055 is re-authored here in the current model. The Spanish
-- and English POI copy is reused verbatim except that apartment-relative phrases
-- ("A solo 5 minutos del apartamento") were removed — POI copy is shared by every
-- apartment in the zone; per-apartment distance now lives in guide_apartment_pois.
--
-- DEMO DATA WARNING
-- -----------------
-- The apartment below is a SALES DEMO. Its WiFi password, key-box code (3847#)
-- and phone numbers are invented, and the four services (kayak, catamaran, taxi,
-- spa) use placeholder phone numbers. Services are ZONE-scoped, so any future
-- real apartment created in zone_benalmadena would inherit them — deactivate
-- them (is_active = 0) before onboarding a real client in this zone.
-- =====================================================

-- ════════════════════════════════════════
-- 1. ZONE DESCRIPTION (the gap 0060 left behind)
-- ════════════════════════════════════════
INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
  ('zone_benalmadena', 'zone', 'es', 'name', 'Benalmádena'),
  ('zone_benalmadena', 'zone', 'es', 'description', 'Joya de la Costa del Sol, Benalmádena combina playas de bandera azul, el animado Puerto Marina, monumentos únicos y un casco antiguo con encanto. A 20 minutos de Málaga capital por metro.'),
  ('zone_benalmadena', 'zone', 'en', 'name', 'Benalmádena'),
  ('zone_benalmadena', 'zone', 'en', 'description', 'A jewel of the Costa del Sol, Benalmádena combines blue flag beaches, the vibrant Puerto Marina, unique monuments and a charming old town. Just 20 minutes from Málaga city centre by metro.'),
  ('zone_benalmadena', 'zone', 'fr', 'name', 'Benalmádena'),
  ('zone_benalmadena', 'zone', 'fr', 'description', 'Joyau de la Costa del Sol, Benalmádena allie plages au drapeau bleu, le vivant Puerto Marina, des monuments uniques et un vieux bourg plein de charme. À 20 minutes de Málaga en métro.'),
  ('zone_benalmadena', 'zone', 'de', 'name', 'Benalmádena'),
  ('zone_benalmadena', 'zone', 'de', 'description', 'Benalmádena ist ein Juwel der Costa del Sol: Blaue-Flagge-Strände, das lebhafte Puerto Marina, einzigartige Denkmäler und eine charmante Altstadt. Nur 20 Minuten mit der Metro von Málaga.');

-- ════════════════════════════════════════
-- 2. THE 6 MISSING POIs (re-authored in the 0060 model)
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_pois (id, zone_id, category, poi_type, access_type, latitude, longitude, google_maps_url, rating, order_index, is_active, source) VALUES
  ('poi_benalmadena_parque_paloma', 'zone_benalmadena', 'Naturaleza', 'nature', 'free', 36.5933, -4.5225, 'https://www.google.com/maps/search/?api=1&query=36.5933,-4.5225', 4.8, 10, 1, 'manual'),
  ('poi_benalmadena_puerto_marina',  'zone_benalmadena', 'Compras',    'sight',  'free', 36.5903, -4.5028, 'https://www.google.com/maps/search/?api=1&query=36.5903,-4.5028', 4.7, 20, 1, 'manual'),
  ('poi_benalmadena_colomares',      'zone_benalmadena', 'Cultura',    'sight',  'paid', 36.5944, -4.5328, 'https://www.google.com/maps/search/?api=1&query=36.5944,-4.5328', 4.6, 30, 1, 'manual'),
  ('poi_benalmadena_stupa',          'zone_benalmadena', 'Cultura',    'sight',  'free', 36.6072, -4.5401, 'https://www.google.com/maps/search/?api=1&query=36.6072,-4.5401', 4.5, 40, 1, 'manual'),
  ('poi_benalmadena_malapesquera',   'zone_benalmadena', 'Playas',     'beach',  'free', 36.5855, -4.5178, 'https://www.google.com/maps/search/?api=1&query=36.5855,-4.5178', 4.4, 50, 1, 'manual'),
  ('poi_benalmadena_pueblo',         'zone_benalmadena', 'Cultura',    'sight',  'free', 36.6055, -4.5477, 'https://www.google.com/maps/search/?api=1&query=36.6055,-4.5477', 4.8, 60, 1, 'manual');

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
  ('poi_benalmadena_parque_paloma', 'poi', 'es', 'name', 'Parque de la Paloma'),
  ('poi_benalmadena_parque_paloma', 'poi', 'es', 'description', 'Extenso parque urbano con lagos, fauna libre (pavos reales, conejos, gansos) y zonas de picnic. Ideal para una mañana en familia. Entrada gratuita.'),
  ('poi_benalmadena_parque_paloma', 'poi', 'es', 'short_tip', 'Visita al amanecer para ver los pavos reales despertar'),
  ('poi_benalmadena_parque_paloma', 'poi', 'en', 'name', 'Parque de la Paloma'),
  ('poi_benalmadena_parque_paloma', 'poi', 'en', 'description', 'Large urban park with lakes, free-roaming wildlife (peacocks, rabbits, geese) and picnic areas. Perfect for a family morning. Free entry.'),
  ('poi_benalmadena_parque_paloma', 'poi', 'en', 'short_tip', 'Visit at dawn to see the peacocks wake up'),
  ('poi_benalmadena_parque_paloma', 'poi', 'fr', 'name', 'Parc de la Paloma'),
  ('poi_benalmadena_parque_paloma', 'poi', 'fr', 'description', 'Grand parc urbain avec lacs, faune en liberté (paons, lapins, oies) et aires de pique-nique. Idéal pour une matinée en famille. Entrée gratuite.'),
  ('poi_benalmadena_parque_paloma', 'poi', 'fr', 'short_tip', 'À l''aube, les paons sont particulièrement actifs'),
  ('poi_benalmadena_parque_paloma', 'poi', 'de', 'name', 'Parque de la Paloma'),
  ('poi_benalmadena_parque_paloma', 'poi', 'de', 'description', 'Großer Stadtpark mit Seen, freilaufenden Tieren (Pfauen, Kaninchen, Gänsen) und Picknickbereichen. Ideal für einen Familienmorgen. Eintritt frei.'),
  ('poi_benalmadena_parque_paloma', 'poi', 'de', 'short_tip', 'Bei Sonnenaufgang sind die Pfauen besonders aktiv'),

  ('poi_benalmadena_puerto_marina', 'poi', 'es', 'name', 'Puerto Marina'),
  ('poi_benalmadena_puerto_marina', 'poi', 'es', 'description', 'Uno de los puertos deportivos más bonitos de Europa, con más de 1.000 amarres. Paseo marítimo con restaurantes, terrazas y tiendas. Ambiente animado hasta la madrugada.'),
  ('poi_benalmadena_puerto_marina', 'poi', 'es', 'short_tip', 'Los restaurantes con terraza sobre el mar son imprescindibles al atardecer'),
  ('poi_benalmadena_puerto_marina', 'poi', 'en', 'name', 'Puerto Marina'),
  ('poi_benalmadena_puerto_marina', 'poi', 'en', 'description', 'One of the most beautiful marinas in Europe, with over 1,000 berths. Seafront promenade with restaurants, terraces and shops. Lively atmosphere well into the night.'),
  ('poi_benalmadena_puerto_marina', 'poi', 'en', 'short_tip', 'Waterfront terrace restaurants are unmissable at sunset'),
  ('poi_benalmadena_puerto_marina', 'poi', 'fr', 'name', 'Puerto Marina'),
  ('poi_benalmadena_puerto_marina', 'poi', 'fr', 'description', 'L''un des ports de plaisance les plus beaux d''Europe, avec plus de 1 000 anneaux. Promenade maritime avec restaurants, terrasses et boutiques. Ambiance animée jusqu''à l''aube.'),
  ('poi_benalmadena_puerto_marina', 'poi', 'fr', 'short_tip', 'Les restaurants en terrasse sur l''eau sont incontournables au coucher du soleil'),
  ('poi_benalmadena_puerto_marina', 'poi', 'de', 'name', 'Puerto Marina'),
  ('poi_benalmadena_puerto_marina', 'poi', 'de', 'description', 'Einer der schönsten Sporthafen Europas mit über 1.000 Liegeplätzen. Strandpromenade mit Restaurants, Terrassen und Geschäften. Lebendige Atmosphäre bis in die Nacht.'),
  ('poi_benalmadena_puerto_marina', 'poi', 'de', 'short_tip', 'Die Terrassen-Restaurants am Wasser sind bei Sonnenuntergang ein Muss'),

  ('poi_benalmadena_colomares', 'poi', 'es', 'name', 'Castillo de Colomares'),
  ('poi_benalmadena_colomares', 'poi', 'es', 'description', 'Monumento único dedicado a Cristóbal Colón y al descubrimiento de América. Mezcla estilos románico, gótico, mudéjar y bizantino. Alberga la iglesia más pequeña del mundo según el Guinness.'),
  ('poi_benalmadena_colomares', 'poi', 'es', 'short_tip', 'La capilla interior tiene capacidad para una persona — perfecta para la foto más original'),
  ('poi_benalmadena_colomares', 'poi', 'en', 'name', 'Castillo de Colomares'),
  ('poi_benalmadena_colomares', 'poi', 'en', 'description', 'A unique monument dedicated to Christopher Columbus and the discovery of America. It blends Romanesque, Gothic, Mudéjar and Byzantine styles, and contains the world''s smallest church per Guinness Records.'),
  ('poi_benalmadena_colomares', 'poi', 'en', 'short_tip', 'The tiny interior chapel fits one person — ideal for the most original photo'),
  ('poi_benalmadena_colomares', 'poi', 'fr', 'name', 'Château de Colomares'),
  ('poi_benalmadena_colomares', 'poi', 'fr', 'description', 'Monument unique dédié à Christophe Colomb et à la découverte de l''Amérique. Mêle styles roman, gothique, mudéjar et byzantin. Abrite la plus petite église du monde selon le Guinness.'),
  ('poi_benalmadena_colomares', 'poi', 'fr', 'short_tip', 'La chapelle intérieure n''accueille qu''une personne — parfait pour une photo insolite'),
  ('poi_benalmadena_colomares', 'poi', 'de', 'name', 'Castillo de Colomares'),
  ('poi_benalmadena_colomares', 'poi', 'de', 'description', 'Einzigartiges Denkmal für Christoph Kolumbus und die Entdeckung Amerikas. Vereint romanische, gotische, Mudéjar- und byzantinische Stile. Enthält laut Guinness die kleinste Kirche der Welt.'),
  ('poi_benalmadena_colomares', 'poi', 'de', 'short_tip', 'Die winzige Kapelle fasst eine Person — ideal für das originellste Foto'),

  ('poi_benalmadena_stupa', 'poi', 'es', 'name', 'Estupa de la Iluminación'),
  ('poi_benalmadena_stupa', 'poi', 'es', 'description', 'Una de las estupas budistas más grandes de Europa Occidental (33 m de altura). Construida en 2003, ofrece vistas panorámicas espectaculares a la costa y un ambiente de paz único.'),
  ('poi_benalmadena_stupa', 'poi', 'es', 'short_tip', 'Las vistas al Mediterráneo desde aquí son de las mejores de toda la zona'),
  ('poi_benalmadena_stupa', 'poi', 'en', 'name', 'Enlightenment Stupa'),
  ('poi_benalmadena_stupa', 'poi', 'en', 'description', 'One of the largest Buddhist stupas in Western Europe (33m tall). Built in 2003, it offers spectacular panoramic coastal views and a uniquely peaceful atmosphere.'),
  ('poi_benalmadena_stupa', 'poi', 'en', 'short_tip', 'The Mediterranean views from here are among the best in the entire area'),
  ('poi_benalmadena_stupa', 'poi', 'fr', 'name', 'Stupa de l''Illumination'),
  ('poi_benalmadena_stupa', 'poi', 'fr', 'description', 'L''un des plus grands stupas bouddhistes d''Europe occidentale (33 m). Construit en 2003, il offre des vues panoramiques spectaculaires sur la côte et une atmosphère de paix unique.'),
  ('poi_benalmadena_stupa', 'poi', 'fr', 'short_tip', 'Les vues sur la Méditerranée depuis ici comptent parmi les plus belles de la région'),
  ('poi_benalmadena_stupa', 'poi', 'de', 'name', 'Erleuchtungs-Stupa'),
  ('poi_benalmadena_stupa', 'poi', 'de', 'description', 'Eine der größten buddhistischen Stupas Westeuropas (33 m hoch). 2003 erbaut, bietet sie spektakuläre Panoramablicke auf die Küste und eine einzigartig friedliche Atmosphäre.'),
  ('poi_benalmadena_stupa', 'poi', 'de', 'short_tip', 'Der Blick auf das Mittelmeer von hier ist einer der schönsten in der ganzen Region'),

  ('poi_benalmadena_malapesquera', 'poi', 'es', 'name', 'Playa de Malapesquera'),
  ('poi_benalmadena_malapesquera', 'poi', 'es', 'description', 'Playa de bandera azul con arena fina y aguas tranquilas. Cuenta con chiringuitos, duchas, hamacas y vigilancia en temporada. Perfecta para disfrutar de los espetos andaluces.'),
  ('poi_benalmadena_malapesquera', 'poi', 'es', 'short_tip', 'Los espetos de sardinas en el chiringuito son obligatorios'),
  ('poi_benalmadena_malapesquera', 'poi', 'en', 'name', 'Malapesquera Beach'),
  ('poi_benalmadena_malapesquera', 'poi', 'en', 'description', 'Blue flag beach with fine sand and calm waters. Has beach bars, showers, sun loungers and lifeguards in season. Perfect for enjoying traditional Andalusian espetos (sardines on a skewer).'),
  ('poi_benalmadena_malapesquera', 'poi', 'en', 'short_tip', 'Sardine espetos at the beach bar are a must'),
  ('poi_benalmadena_malapesquera', 'poi', 'fr', 'name', 'Plage de Malapesquera'),
  ('poi_benalmadena_malapesquera', 'poi', 'fr', 'description', 'Plage Pavillon Bleu aux eaux calmes et sable fin. Bars de plage, douches, chaises longues et surveillance en saison. Idéale pour goûter les espetos andalous (sardines grillées).'),
  ('poi_benalmadena_malapesquera', 'poi', 'fr', 'short_tip', 'Les espetos de sardines au bar de plage sont incontournables'),
  ('poi_benalmadena_malapesquera', 'poi', 'de', 'name', 'Strand Malapesquera'),
  ('poi_benalmadena_malapesquera', 'poi', 'de', 'description', 'Blaue-Flagge-Strand mit feinem Sand und ruhigem Wasser. Strandrestaurants, Duschen, Liegen und Rettungsschwimmer in der Saison. Perfekt für andalusische Espetos (Sardinenspieße).'),
  ('poi_benalmadena_malapesquera', 'poi', 'de', 'short_tip', 'Sardinen-Espetos am Strandrestaurant sind ein Muss'),

  ('poi_benalmadena_pueblo', 'poi', 'es', 'name', 'Benalmádena Pueblo'),
  ('poi_benalmadena_pueblo', 'poi', 'es', 'description', 'El casco antiguo: calles empedradas, casas blancas con macetas de colores y miradores con vistas espectaculares al mar. No te pierdas el Museo de Arte Precolombino y la Iglesia de Santo Domingo.'),
  ('poi_benalmadena_pueblo', 'poi', 'es', 'short_tip', 'El mirador junto a la iglesia de Santo Domingo tiene el mejor atardecer de la Costa del Sol'),
  ('poi_benalmadena_pueblo', 'poi', 'en', 'name', 'Benalmádena Old Town'),
  ('poi_benalmadena_pueblo', 'poi', 'en', 'description', 'The historic centre: cobblestone streets, white houses with colourful flower pots and viewpoints with spectacular sea views. Don''t miss the Pre-Columbian Art Museum and Santo Domingo Church.'),
  ('poi_benalmadena_pueblo', 'poi', 'en', 'short_tip', 'The viewpoint by Santo Domingo Church has the best sunset on the Costa del Sol'),
  ('poi_benalmadena_pueblo', 'poi', 'fr', 'name', 'Vieux-Benalmádena'),
  ('poi_benalmadena_pueblo', 'poi', 'fr', 'description', 'Le centre historique: ruelles pavées, maisons blanches fleuries et miradors avec des vues spectaculaires sur la mer. Ne ratez pas le Musée d''Art Précolombien et l''Église Santo Domingo.'),
  ('poi_benalmadena_pueblo', 'poi', 'fr', 'short_tip', 'Le belvédère près de l''Église Santo Domingo offre le plus beau coucher de soleil de la Costa del Sol'),
  ('poi_benalmadena_pueblo', 'poi', 'de', 'name', 'Benalmádena Altstadt'),
  ('poi_benalmadena_pueblo', 'poi', 'de', 'description', 'Die Altstadt: gepflasterte Gassen, weiße Häuser mit bunten Blumentöpfen und Aussichtspunkte mit spektakulärem Meerblick. Sehenswert: Präkolumbianisches Kunstmuseum und Kirche Santo Domingo.'),
  ('poi_benalmadena_pueblo', 'poi', 'de', 'short_tip', 'Der Aussichtspunkt bei der Kirche Santo Domingo hat den schönsten Sonnenuntergang der Costa del Sol');

-- ════════════════════════════════════════
-- 3. POI MEDIA (images already uploaded to R2 under guide/pois/)
--    puerto_marina and pueblo have no free image source yet.
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_poi_media (id, poi_id, r2_key, media_type, role, order_index) VALUES
  ('poimedia_benalmadena_parque_paloma', 'poi_benalmadena_parque_paloma', 'guide/pois/poi_benalmadena_parque_paloma.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_benalmadena_colomares',     'poi_benalmadena_colomares',     'guide/pois/poi_benalmadena_colomares.jpg',     'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_benalmadena_stupa',         'poi_benalmadena_stupa',         'guide/pois/poi_benalmadena_stupa.jpg',         'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_benalmadena_malapesquera',  'poi_benalmadena_malapesquera',  'guide/pois/poi_benalmadena_malapesquera.jpg',  'image', 'PRIMARY_IMAGE', 0);

-- ════════════════════════════════════════
-- 4. DEMO AGENCY + APARTMENT
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_agencies (id, name, slug, contact_email, contact_phone, primary_color, secondary_color, accent_color, is_active)
VALUES ('agency_cds_apts', 'Costa del Sol Apartments', 'costa-del-sol-apartments', 'hola@cdsapartments.com', '+34 651 234 567', '#1E6B5C', '#F7D08A', '#E8734A', 1);

INSERT OR IGNORE INTO guide_apartments (id, agency_id, zone_id, name, slug, address, latitude, longitude, is_active)
VALUES ('apt_demo_paloma', 'agency_cds_apts', 'zone_benalmadena', 'Acogedor apartamento cerca del Parque de la Paloma', 'paloma-park-benalmadena', 'Arroyo de la Miel, 29631 Benalmádena, Málaga, España', 36.5960, -4.5223, 1);

-- ════════════════════════════════════════
-- 5. APARTMENT INFO (demo credentials — see warning in header)
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_apartment_info (id, apartment_id, info_key, icon_name, order_index) VALUES
  ('info_apt_demo_paloma_wifi',        'apt_demo_paloma', 'wifi',        'wifi',            10),
  ('info_apt_demo_paloma_checkin',     'apt_demo_paloma', 'checkin',     'key',             20),
  ('info_apt_demo_paloma_checkout',    'apt_demo_paloma', 'checkout',    'logout',          30),
  ('info_apt_demo_paloma_rules',       'apt_demo_paloma', 'rules',       'rule',            40),
  ('info_apt_demo_paloma_parking',     'apt_demo_paloma', 'parking',     'local_parking',   50),
  ('info_apt_demo_paloma_supermarket', 'apt_demo_paloma', 'supermarket', 'shopping_cart',   60),
  ('info_apt_demo_paloma_transport',   'apt_demo_paloma', 'transport',   'directions_bus',  70),
  ('info_apt_demo_paloma_emergency',   'apt_demo_paloma', 'emergency',   'emergency',       80);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
  ('info_apt_demo_paloma_wifi', 'apartment_info', 'es', 'title', 'WiFi'),
  ('info_apt_demo_paloma_wifi', 'apartment_info', 'es', 'content', 'Red: PalomaPark_5G' || char(10) || 'Contraseña: benalmadena2024#'),
  ('info_apt_demo_paloma_wifi', 'apartment_info', 'en', 'title', 'WiFi'),
  ('info_apt_demo_paloma_wifi', 'apartment_info', 'en', 'content', 'Network: PalomaPark_5G' || char(10) || 'Password: benalmadena2024#'),
  ('info_apt_demo_paloma_wifi', 'apartment_info', 'fr', 'title', 'WiFi'),
  ('info_apt_demo_paloma_wifi', 'apartment_info', 'fr', 'content', 'Réseau: PalomaPark_5G' || char(10) || 'Mot de passe: benalmadena2024#'),
  ('info_apt_demo_paloma_wifi', 'apartment_info', 'de', 'title', 'WLAN'),
  ('info_apt_demo_paloma_wifi', 'apartment_info', 'de', 'content', 'Netzwerk: PalomaPark_5G' || char(10) || 'Passwort: benalmadena2024#'),

  ('info_apt_demo_paloma_checkin', 'apartment_info', 'es', 'title', 'Check-in'),
  ('info_apt_demo_paloma_checkin', 'apartment_info', 'es', 'content', 'Llegada a partir de las 15:00 h.' || char(10) || char(10) || 'La caja de llaves está en la entrada del edificio (columna derecha):' || char(10) || 'Código: 3847#' || char(10) || char(10) || '¿Problemas? Llama o escribe por WhatsApp al +34 651 234 567.'),
  ('info_apt_demo_paloma_checkin', 'apartment_info', 'en', 'title', 'Check-in'),
  ('info_apt_demo_paloma_checkin', 'apartment_info', 'en', 'content', 'Arrival from 3:00 PM.' || char(10) || char(10) || 'The key lockbox is at the building entrance (right column):' || char(10) || 'Code: 3847#' || char(10) || char(10) || 'Problems? Call or WhatsApp +34 651 234 567.'),
  ('info_apt_demo_paloma_checkin', 'apartment_info', 'fr', 'title', 'Check-in'),
  ('info_apt_demo_paloma_checkin', 'apartment_info', 'fr', 'content', 'Arrivée à partir de 15h00.' || char(10) || char(10) || 'La boîte à clés se trouve à l''entrée de l''immeuble (colonne de droite):' || char(10) || 'Code: 3847#' || char(10) || char(10) || 'Problèmes? Appelez ou WhatsApp +34 651 234 567.'),
  ('info_apt_demo_paloma_checkin', 'apartment_info', 'de', 'title', 'Check-in'),
  ('info_apt_demo_paloma_checkin', 'apartment_info', 'de', 'content', 'Anreise ab 15:00 Uhr.' || char(10) || char(10) || 'Der Schlüsselkasten befindet sich am Gebäudeeingang (rechte Säule):' || char(10) || 'Code: 3847#' || char(10) || char(10) || 'Probleme? Anrufen oder WhatsApp +34 651 234 567.'),

  ('info_apt_demo_paloma_checkout', 'apartment_info', 'es', 'title', 'Check-out'),
  ('info_apt_demo_paloma_checkout', 'apartment_info', 'es', 'content', 'Salida antes de las 11:00 h.' || char(10) || char(10) || '✓ Deja las llaves en la caja de la entrada' || char(10) || '✓ Cierra todas las ventanas y persianas' || char(10) || '✓ Apaga luces y aire acondicionado' || char(10) || '✓ Deja las toallas en el baño' || char(10) || char(10) || 'Gracias por tu estancia, ¡vuelve pronto! 😊'),
  ('info_apt_demo_paloma_checkout', 'apartment_info', 'en', 'title', 'Check-out'),
  ('info_apt_demo_paloma_checkout', 'apartment_info', 'en', 'content', 'Departure before 11:00 AM.' || char(10) || char(10) || '✓ Leave keys in the entrance lockbox' || char(10) || '✓ Close all windows and blinds' || char(10) || '✓ Turn off lights and air conditioning' || char(10) || '✓ Leave towels in the bathroom' || char(10) || char(10) || 'Thanks for staying, see you soon! 😊'),
  ('info_apt_demo_paloma_checkout', 'apartment_info', 'fr', 'title', 'Check-out'),
  ('info_apt_demo_paloma_checkout', 'apartment_info', 'fr', 'content', 'Départ avant 11h00.' || char(10) || char(10) || '✓ Laissez les clés dans la boîte à l''entrée' || char(10) || '✓ Fermez toutes les fenêtres et volets' || char(10) || '✓ Éteignez les lumières et la climatisation' || char(10) || '✓ Laissez les serviettes dans la salle de bain'),
  ('info_apt_demo_paloma_checkout', 'apartment_info', 'de', 'title', 'Check-out'),
  ('info_apt_demo_paloma_checkout', 'apartment_info', 'de', 'content', 'Abreise vor 11:00 Uhr.' || char(10) || char(10) || '✓ Schlüssel in den Eingangskasten legen' || char(10) || '✓ Alle Fenster und Rollläden schließen' || char(10) || '✓ Licht und Klimaanlage ausschalten' || char(10) || '✓ Handtücher im Bad lassen'),

  ('info_apt_demo_paloma_rules', 'apartment_info', 'es', 'title', 'Normas de la casa'),
  ('info_apt_demo_paloma_rules', 'apartment_info', 'es', 'content', '🚭 No fumar en el interior' || char(10) || '🐾 No se admiten mascotas' || char(10) || '🔇 Silencio de 22:00 a 9:00 h (respeto a los vecinos)' || char(10) || '👥 Máximo 4 huéspedes' || char(10) || '🎉 No se permiten fiestas ni eventos'),
  ('info_apt_demo_paloma_rules', 'apartment_info', 'en', 'title', 'House Rules'),
  ('info_apt_demo_paloma_rules', 'apartment_info', 'en', 'content', '🚭 No smoking indoors' || char(10) || '🐾 No pets allowed' || char(10) || '🔇 Quiet hours 10 PM – 9 AM (respect for neighbours)' || char(10) || '👥 Maximum 4 guests' || char(10) || '🎉 No parties or events'),
  ('info_apt_demo_paloma_rules', 'apartment_info', 'fr', 'title', 'Règlement intérieur'),
  ('info_apt_demo_paloma_rules', 'apartment_info', 'fr', 'content', '🚭 Interdiction de fumer à l''intérieur' || char(10) || '🐾 Animaux non acceptés' || char(10) || '🔇 Silence de 22h à 9h' || char(10) || '👥 Maximum 4 personnes' || char(10) || '🎉 Fêtes et événements interdits'),
  ('info_apt_demo_paloma_rules', 'apartment_info', 'de', 'title', 'Hausregeln'),
  ('info_apt_demo_paloma_rules', 'apartment_info', 'de', 'content', '🚭 Rauchen im Innenbereich verboten' || char(10) || '🐾 Keine Haustiere erlaubt' || char(10) || '🔇 Ruhezeit 22:00 – 9:00 Uhr' || char(10) || '👥 Maximal 4 Gäste' || char(10) || '🎉 Keine Partys oder Veranstaltungen'),

  ('info_apt_demo_paloma_parking', 'apartment_info', 'es', 'title', 'Aparcamiento'),
  ('info_apt_demo_paloma_parking', 'apartment_info', 'es', 'content', 'Aparcamiento en la vía pública disponible en las calles del entorno (zona azul lunes–sábado; gratuito domingos y festivos).' || char(10) || char(10) || '🅿️ Parking Arroyo de la Miel — Av. de la Constitución' || char(10) || '3 min a pie · cubierto · tarifas desde 1€/h'),
  ('info_apt_demo_paloma_parking', 'apartment_info', 'en', 'title', 'Parking'),
  ('info_apt_demo_paloma_parking', 'apartment_info', 'en', 'content', 'On-street parking available nearby (blue zone Mon–Sat; free on Sundays and public holidays).' || char(10) || char(10) || '🅿️ Parking Arroyo de la Miel — Av. de la Constitución' || char(10) || '3 min walk · covered · from €1/h'),
  ('info_apt_demo_paloma_parking', 'apartment_info', 'de', 'title', 'Parken'),
  ('info_apt_demo_paloma_parking', 'apartment_info', 'de', 'content', 'Straßenparkplätze in der Umgebung (blaue Zone Mo–Sa; kostenlos an Sonn- und Feiertagen).' || char(10) || char(10) || '🅿️ Parking Arroyo de la Miel — Av. de la Constitución' || char(10) || '3 Min. Fußweg · überdacht · ab 1€/Std.'),

  ('info_apt_demo_paloma_supermarket', 'apartment_info', 'es', 'title', 'Supermercados'),
  ('info_apt_demo_paloma_supermarket', 'apartment_info', 'es', 'content', '🛒 Mercadona — C/ Palma 12 · 7 min a pie' || char(10) || '🛒 Lidl — Av. de la Constitución · 10 min a pie' || char(10) || '🛒 Día — C/ Málaga 5 · 5 min a pie'),
  ('info_apt_demo_paloma_supermarket', 'apartment_info', 'en', 'title', 'Supermarkets'),
  ('info_apt_demo_paloma_supermarket', 'apartment_info', 'en', 'content', '🛒 Mercadona — C/ Palma 12 · 7 min walk' || char(10) || '🛒 Lidl — Av. de la Constitución · 10 min walk' || char(10) || '🛒 Día — C/ Málaga 5 · 5 min walk'),
  ('info_apt_demo_paloma_supermarket', 'apartment_info', 'fr', 'title', 'Supermarchés'),
  ('info_apt_demo_paloma_supermarket', 'apartment_info', 'fr', 'content', '🛒 Mercadona — C/ Palma 12 · 7 min à pied' || char(10) || '🛒 Lidl — Av. de la Constitución · 10 min à pied' || char(10) || '🛒 Día — C/ Málaga 5 · 5 min à pied'),
  ('info_apt_demo_paloma_supermarket', 'apartment_info', 'de', 'title', 'Supermärkte'),
  ('info_apt_demo_paloma_supermarket', 'apartment_info', 'de', 'content', '🛒 Mercadona — C/ Palma 12 · 7 Min. zu Fuß' || char(10) || '🛒 Lidl — Av. de la Constitución · 10 Min. zu Fuß' || char(10) || '🛒 Día — C/ Málaga 5 · 5 Min. zu Fuß'),

  ('info_apt_demo_paloma_transport', 'apartment_info', 'es', 'title', 'Cómo moverse'),
  ('info_apt_demo_paloma_transport', 'apartment_info', 'es', 'content', '🚇 Metro C1 — Estación Arroyo de la Miel, 3 min a pie → Málaga centro en 20 min' || char(10) || '🚌 Bus 120/121 — Parada Av. de la Constitución → Puerto Marina' || char(10) || '🚕 Taxi — 952 567 890 (disponible 24h)' || char(10) || '✈️ Aeropuerto de Málaga — 15 min en coche'),
  ('info_apt_demo_paloma_transport', 'apartment_info', 'en', 'title', 'Getting Around'),
  ('info_apt_demo_paloma_transport', 'apartment_info', 'en', 'content', '🚇 Metro C1 — Arroyo de la Miel station, 3 min walk → Málaga centre in 20 min' || char(10) || '🚌 Bus 120/121 — Stop at Av. de la Constitución → Puerto Marina' || char(10) || '🚕 Taxi — 952 567 890 (24h)' || char(10) || '✈️ Málaga Airport — 15 min by car'),
  ('info_apt_demo_paloma_transport', 'apartment_info', 'fr', 'title', 'Se déplacer'),
  ('info_apt_demo_paloma_transport', 'apartment_info', 'fr', 'content', '🚇 Métro C1 — Gare Arroyo de la Miel, 3 min à pied → Centre de Málaga en 20 min' || char(10) || '🚌 Bus 120/121 — Arrêt Av. de la Constitución → Puerto Marina' || char(10) || '🚕 Taxi — 952 567 890 (24h/24)' || char(10) || '✈️ Aéroport de Málaga — 15 min en voiture'),
  ('info_apt_demo_paloma_transport', 'apartment_info', 'de', 'title', 'Mobilität'),
  ('info_apt_demo_paloma_transport', 'apartment_info', 'de', 'content', '🚇 Metro C1 — Haltestelle Arroyo de la Miel, 3 Min. Fußweg → Málaga-Zentrum in 20 Min.' || char(10) || '🚌 Bus 120/121 — Haltestelle Av. de la Constitución → Puerto Marina' || char(10) || '🚕 Taxi — 952 567 890 (24h)' || char(10) || '✈️ Flughafen Málaga — 15 Min. mit dem Auto'),

  ('info_apt_demo_paloma_emergency', 'apartment_info', 'es', 'title', 'Emergencias'),
  ('info_apt_demo_paloma_emergency', 'apartment_info', 'es', 'content', '🆘 Emergencias generales — 112' || char(10) || '👮 Policía Nacional — 091 · Local — 092' || char(10) || '🏥 Centro Salud Arroyo — 951 032 200' || char(10) || '🔥 Bomberos — 080' || char(10) || '🏨 Anfitrión (WhatsApp 24h) — +34 651 234 567'),
  ('info_apt_demo_paloma_emergency', 'apartment_info', 'en', 'title', 'Emergency Contacts'),
  ('info_apt_demo_paloma_emergency', 'apartment_info', 'en', 'content', '🆘 General emergencies — 112' || char(10) || '👮 National Police — 091 · Local — 092' || char(10) || '🏥 Arroyo Health Centre — 951 032 200' || char(10) || '🔥 Fire service — 080' || char(10) || '🏨 Host (WhatsApp 24h) — +34 651 234 567'),
  ('info_apt_demo_paloma_emergency', 'apartment_info', 'fr', 'title', 'Urgences'),
  ('info_apt_demo_paloma_emergency', 'apartment_info', 'fr', 'content', '🆘 Urgences générales — 112' || char(10) || '👮 Police Nationale — 091 · Locale — 092' || char(10) || '🏥 Centre de santé Arroyo — 951 032 200' || char(10) || '🔥 Pompiers — 080' || char(10) || '🏨 Hôte (WhatsApp 24h) — +34 651 234 567'),
  ('info_apt_demo_paloma_emergency', 'apartment_info', 'de', 'title', 'Notfallkontakte'),
  ('info_apt_demo_paloma_emergency', 'apartment_info', 'de', 'content', '🆘 Notruf — 112' || char(10) || '👮 Nationalpolizei — 091 · Lokalpolizei — 092' || char(10) || '🏥 Gesundheitszentrum Arroyo — 951 032 200' || char(10) || '🔥 Feuerwehr — 080' || char(10) || '🏨 Gastgeber (WhatsApp 24h) — +34 651 234 567');

-- ════════════════════════════════════════
-- 6. LINK POIs TO THE APARTMENT
--    Travel info lives HERE (per-apartment), not on the POI — this is the
--    modeling fix from migration 0059 in action. All 10 zone POIs are assigned
--    so the demo shows a full map; the 4 pre-existing ones have no measured
--    travel time yet and are left NULL.
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_apartment_pois (apartment_id, poi_id, order_override, travel_time_text, travel_mode, distance_text) VALUES
  ('apt_demo_paloma', 'poi_benalmadena_parque_paloma', 10, '5 min',  'walk',  '400 m'),
  ('apt_demo_paloma', 'poi_benalmadena_puerto_marina', 20, '10 min', 'drive', '3 km'),
  ('apt_demo_paloma', 'poi_benalmadena_colomares',     30, '15 min', 'walk',  '1,2 km'),
  ('apt_demo_paloma', 'poi_benalmadena_stupa',         40, '8 min',  'drive', '2,5 km'),
  ('apt_demo_paloma', 'poi_benalmadena_malapesquera',  50, '20 min', 'walk',  '1,5 km'),
  ('apt_demo_paloma', 'poi_benalmadena_pueblo',        60, '12 min', 'drive', '4 km'),
  ('apt_demo_paloma', 'poi_benalmadena_plaza_espana',  70, NULL, NULL, NULL),
  ('apt_demo_paloma', 'poi_benalmadena_teleferico',    80, NULL, NULL, NULL),
  ('apt_demo_paloma', 'poi_benalmadena_mariposario',   90, NULL, NULL, NULL),
  ('apt_demo_paloma', 'poi_benalmadena_selwo_marina', 100, NULL, NULL, NULL);

-- ════════════════════════════════════════
-- 7. DEMO SERVICES (were guide_experiences in 0055 → now bookable guide_pois)
--    No coordinates on purpose: these are services, not places, so they appear
--    in "Promociones" but never as a map pin. poi_type='service' captures that.
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_pois (id, zone_id, category, subcategory, poi_type, access_type, is_bookable, action_type, action_data, action_prefilled_message, price_display, badge_type, commission_type, commission_value, is_featured, is_active, order_index, source) VALUES
  ('exp_benalmadena_kayak', 'zone_benalmadena', 'Actividades', 'nautical/kayak', 'service', 'paid', 1, 'WHATSAPP', '+34600123456', 'Hola, soy huésped del apartamento {{apartment_name}} y me gustaría reservar un kayak.', 'Desde 20€/hora', NULL, 'none', 0, 1, 1, 110, 'demo'),
  ('exp_benalmadena_catamaran', 'zone_benalmadena', 'Actividades', 'nautical/catamaran', 'service', 'paid', 1, 'WHATSAPP', '+34611987654', 'Hola, soy huésped del apartamento {{apartment_name}} y me gustaría reservar el tour en catamarán.', 'Desde 45€/persona', 'exclusive', 'none', 0, 1, 1, 120, 'demo'),
  ('exp_benalmadena_taxi', 'zone_benalmadena', 'Transporte', NULL, 'service', 'paid', 1, 'WHATSAPP', '+34612345678', 'Hola, soy huésped del apartamento {{apartment_name}} y necesito un traslado al aeropuerto de Málaga.', 'Desde 35€/trayecto', NULL, 'none', 0, 0, 1, 130, 'demo'),
  ('exp_benalmadena_spa', 'zone_benalmadena', 'Bienestar', NULL, 'service', 'paid', 1, 'PHONE', '+34951234567', NULL, 'Desde 60€/sesión', 'courtesy', 'none', 0, 0, 1, 140, 'demo');

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
  ('exp_benalmadena_kayak', 'poi', 'es', 'name', 'Alquiler de Kayak'),
  ('exp_benalmadena_kayak', 'poi', 'es', 'description', 'Explora la Costa del Sol en kayak desde Puerto Marina. Todo el equipo incluido. No se necesita experiencia previa. Monitores certificados disponibles.'),
  ('exp_benalmadena_kayak', 'poi', 'es', 'cta_label', 'Reservar por WhatsApp'),
  ('exp_benalmadena_kayak', 'poi', 'en', 'name', 'Kayak Rental'),
  ('exp_benalmadena_kayak', 'poi', 'en', 'description', 'Explore the Costa del Sol by kayak from Puerto Marina. All equipment included. No prior experience needed. Certified instructors available.'),
  ('exp_benalmadena_kayak', 'poi', 'en', 'cta_label', 'Book via WhatsApp'),
  ('exp_benalmadena_kayak', 'poi', 'fr', 'name', 'Location de Kayak'),
  ('exp_benalmadena_kayak', 'poi', 'fr', 'description', 'Explorez la Costa del Sol en kayak depuis Puerto Marina. Tout l''équipement inclus. Aucune expérience préalable requise. Moniteurs certifiés disponibles.'),
  ('exp_benalmadena_kayak', 'poi', 'fr', 'cta_label', 'Réserver par WhatsApp'),
  ('exp_benalmadena_kayak', 'poi', 'de', 'name', 'Kajak-Verleih'),
  ('exp_benalmadena_kayak', 'poi', 'de', 'description', 'Erkunden Sie die Costa del Sol per Kajak vom Puerto Marina aus. Gesamte Ausrüstung inklusive. Keine Vorerfahrung nötig. Zertifizierte Guides verfügbar.'),
  ('exp_benalmadena_kayak', 'poi', 'de', 'cta_label', 'Per WhatsApp buchen'),

  ('exp_benalmadena_catamaran', 'poi', 'es', 'name', 'Tour en Catamarán'),
  ('exp_benalmadena_catamaran', 'poi', 'es', 'description', 'Excursión de 3 horas por la Costa del Sol: avistamiento de delfines, snorkel y open bar incluidos. Salidas diarias desde Puerto Marina. ¡Experiencia inolvidable!'),
  ('exp_benalmadena_catamaran', 'poi', 'es', 'cta_label', 'Reservar ahora'),
  ('exp_benalmadena_catamaran', 'poi', 'en', 'name', 'Catamaran Tour'),
  ('exp_benalmadena_catamaran', 'poi', 'en', 'description', '3-hour cruise along the Costa del Sol: dolphin watching, snorkelling and open bar included. Daily departures from Puerto Marina. An unforgettable experience!'),
  ('exp_benalmadena_catamaran', 'poi', 'en', 'cta_label', 'Book now'),
  ('exp_benalmadena_catamaran', 'poi', 'fr', 'name', 'Tour en Catamaran'),
  ('exp_benalmadena_catamaran', 'poi', 'fr', 'description', 'Croisière de 3h sur la Costa del Sol: observation de dauphins, snorkeling et open bar inclus. Départs quotidiens depuis Puerto Marina. Une expérience inoubliable!'),
  ('exp_benalmadena_catamaran', 'poi', 'fr', 'cta_label', 'Réserver maintenant'),
  ('exp_benalmadena_catamaran', 'poi', 'de', 'name', 'Katamaran-Tour'),
  ('exp_benalmadena_catamaran', 'poi', 'de', 'description', '3-stündige Kreuzfahrt entlang der Costa del Sol: Delfinbeobachtung, Schnorcheln und Open Bar inklusive. Tägliche Abfahrten vom Puerto Marina. Ein unvergessliches Erlebnis!'),
  ('exp_benalmadena_catamaran', 'poi', 'de', 'cta_label', 'Jetzt buchen'),

  ('exp_benalmadena_taxi', 'poi', 'es', 'name', 'Traslado Aeropuerto Málaga'),
  ('exp_benalmadena_taxi', 'poi', 'es', 'description', 'Taxi privado puerta a puerta entre el apartamento y el Aeropuerto de Málaga-Costa del Sol. Disponible 24h, 7 días. Reserva con antelación para garantizar disponibilidad.'),
  ('exp_benalmadena_taxi', 'poi', 'es', 'cta_label', 'Solicitar traslado'),
  ('exp_benalmadena_taxi', 'poi', 'en', 'name', 'Málaga Airport Transfer'),
  ('exp_benalmadena_taxi', 'poi', 'en', 'description', 'Private door-to-door taxi between the apartment and Málaga-Costa del Sol Airport. Available 24/7. Book in advance to guarantee availability.'),
  ('exp_benalmadena_taxi', 'poi', 'en', 'cta_label', 'Request transfer'),
  ('exp_benalmadena_taxi', 'poi', 'fr', 'name', 'Transfert Aéroport de Málaga'),
  ('exp_benalmadena_taxi', 'poi', 'fr', 'description', 'Taxi privé porte-à-porte entre l''appartement et l''Aéroport de Málaga-Costa del Sol. Disponible 24h/24, 7j/7. Réservez à l''avance pour garantir la disponibilité.'),
  ('exp_benalmadena_taxi', 'poi', 'fr', 'cta_label', 'Demander un transfert'),
  ('exp_benalmadena_taxi', 'poi', 'de', 'name', 'Transfer Flughafen Málaga'),
  ('exp_benalmadena_taxi', 'poi', 'de', 'description', 'Privates Tür-zu-Tür-Taxi zwischen dem Apartment und dem Flughafen Málaga-Costa del Sol. Rund um die Uhr, 7 Tage die Woche verfügbar. Im Voraus buchen, um Verfügbarkeit zu sichern.'),
  ('exp_benalmadena_taxi', 'poi', 'de', 'cta_label', 'Transfer anfragen'),

  ('exp_benalmadena_spa', 'poi', 'es', 'name', 'Spa & Masaje'),
  ('exp_benalmadena_spa', 'poi', 'es', 'description', 'Centro de bienestar a 10 min del apartamento. Masajes relajantes, rituales andaluces, baño turco y jacuzzi. Los huéspedes de nuestros apartamentos disfrutan de un 10% de descuento solo con mencionar este guidebook.'),
  ('exp_benalmadena_spa', 'poi', 'es', 'cta_label', 'Llamar para reservar'),
  ('exp_benalmadena_spa', 'poi', 'en', 'name', 'Spa & Massage'),
  ('exp_benalmadena_spa', 'poi', 'en', 'description', 'Wellness centre 10 min from the apartment. Relaxing massages, Andalusian rituals, Turkish bath and jacuzzi. Our apartment guests enjoy a 10% discount just by mentioning this guidebook.'),
  ('exp_benalmadena_spa', 'poi', 'en', 'cta_label', 'Call to book'),
  ('exp_benalmadena_spa', 'poi', 'fr', 'name', 'Spa & Massage'),
  ('exp_benalmadena_spa', 'poi', 'fr', 'description', 'Centre de bien-être à 10 min de l''appartement. Massages relaxants, rituels andalous, hammam et jacuzzi. Nos hôtes bénéficient de 10% de remise en mentionnant ce guidebook.'),
  ('exp_benalmadena_spa', 'poi', 'fr', 'cta_label', 'Appeler pour réserver'),
  ('exp_benalmadena_spa', 'poi', 'de', 'name', 'Spa & Massage'),
  ('exp_benalmadena_spa', 'poi', 'de', 'description', 'Wellnesszentrum 10 Min. vom Apartment. Entspannungsmassagen, andalusische Rituale, türkisches Bad und Jacuzzi. Unsere Gäste erhalten 10% Rabatt, wenn sie diesen Guidebook erwähnen.'),
  ('exp_benalmadena_spa', 'poi', 'de', 'cta_label', 'Anrufen und buchen');

-- ════════════════════════════════════════
-- 8. LINK THE DEMO AGENCY TO THE ADMIN USER (no-op if the user isn't found)
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_agency_staff (agency_id, user_id, role)
SELECT 'agency_cds_apts', id, 'admin' FROM users WHERE email = 'franciscotortosaestudios@gmail.com' LIMIT 1;
