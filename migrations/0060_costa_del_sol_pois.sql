-- =====================================================
-- COSTA DEL SOL POIs — MIGRATION 0060
-- =====================================================
-- Depends on 0059 (unified guide_pois superset table).
-- Zones: Málaga capital, Torremolinos, Benalmádena, Fuengirola, Mijas, Marbella.
--
-- Classification rule applied (per municipality):
--   FREE  (access_type='free', is_bookable=0)  -> monuments/streets/parks/beaches
--         with free access. Shown in "Descubre" + map pin.
--   PAID/PREMIUM (access_type='paid', is_bookable=1) -> ONLY attractions that are
--         genuinely exclusive to that specific municipality (per TripAdvisor's
--         "Top things to do"). Generic coast-wide activities (jet-ski rental,
--         standard boat trips, generic beach clubs) are excluded on purpose.
--
-- guide_benalmadena already has 6 demo POIs from migration 0055 (Parque de la
-- Paloma, Puerto Marina, Castillo de Colomares, Stupa Budista, Playa de
-- Malapesquera, Benalmádena Pueblo) — NOT duplicated here; only new items added.
--
-- Coordinates/prices/hours were verified via web search where noted; the rest
-- are best-effort from general knowledge and MUST be spot-checked by the
-- agency/superadmin before going live with a real customer (all data here is
-- demo, per project instructions). google_place_id / opening_hours JSON are
-- left NULL — fill via Google Places sync later (google_place_id column exists
-- precisely for that future sync).
--
-- Translations: es + en only (worker falls back to es for missing languages).
-- fr/de/etc. can be added later via the admin panel per KNOWLEDGE_IDIOMAS.md.
-- =====================================================

-- ════════════════════════════════════════
-- 0. ZONES
-- ════════════════════════════════════════
-- NOTE: migrations/*.sql are gitignored and applied manually (no CI ordering
-- guarantee), so zone_benalmadena is (re)created here defensively too. This is
-- safe/idempotent whether or not 0055_demo_benalmadena_apartment.sql has run:
-- both use INSERT OR IGNORE on the same id, and column values match 0055's.
INSERT OR IGNORE INTO guide_zones (id, name, slug, country, region, latitude, longitude, cover_image_url, is_active)
VALUES
  ('zone_benalmadena', 'Benalmádena', 'benalmadena', 'ES', 'Costa del Sol', 36.5977, -4.5164, NULL, 1),
  ('zone_malaga',        'Málaga',        'malaga',        'ES', 'Costa del Sol', 36.7213, -4.4213, NULL, 1),
  ('zone_torremolinos',  'Torremolinos',  'torremolinos',  'ES', 'Costa del Sol', 36.6236, -4.4998, NULL, 1),
  ('zone_fuengirola',    'Fuengirola',    'fuengirola',    'ES', 'Costa del Sol', 36.5411, -4.6247, NULL, 1),
  ('zone_mijas',         'Mijas',         'mijas',         'ES', 'Costa del Sol', 36.5964, -4.6372, NULL, 1),
  ('zone_marbella',      'Marbella',      'marbella',      'ES', 'Costa del Sol', 36.5099, -4.8850, NULL, 1);

-- Benalmádena es/en name+description only added if 0055 hasn't already set them
-- (INSERT OR IGNORE on translations' implicit unique key would need ON CONFLICT;
-- simplest safe approach: only insert if no 'name' translation exists yet).
INSERT INTO translations (entity_id, entity_type, language_code, field, value)
SELECT 'zone_benalmadena', 'zone', 'es', 'name', 'Benalmádena'
WHERE NOT EXISTS (SELECT 1 FROM translations WHERE entity_id = 'zone_benalmadena' AND entity_type = 'zone' AND language_code = 'es' AND field = 'name');
INSERT INTO translations (entity_id, entity_type, language_code, field, value)
SELECT 'zone_benalmadena', 'zone', 'en', 'name', 'Benalmádena'
WHERE NOT EXISTS (SELECT 1 FROM translations WHERE entity_id = 'zone_benalmadena' AND entity_type = 'zone' AND language_code = 'en' AND field = 'name');

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
  ('zone_malaga', 'zone', 'es', 'name', 'Málaga'),
  ('zone_malaga', 'zone', 'es', 'description', 'Capital de la Costa del Sol: casco histórico monumental, museos de talla mundial (Picasso, Pompidou, Thyssen) y un puerto renovado. Cuna de Picasso.'),
  ('zone_malaga', 'zone', 'en', 'name', 'Málaga'),
  ('zone_malaga', 'zone', 'en', 'description', 'Capital of the Costa del Sol: a monumental old town, world-class museums (Picasso, Pompidou, Thyssen) and a renovated port. Picasso''s birthplace.'),
  ('zone_torremolinos', 'zone', 'es', 'name', 'Torremolinos'),
  ('zone_torremolinos', 'zone', 'es', 'description', 'Pionera del turismo en la Costa del Sol. Playas extensas, el barrio marinero de La Carihuela y un ambiente animado día y noche.'),
  ('zone_torremolinos', 'zone', 'en', 'name', 'Torremolinos'),
  ('zone_torremolinos', 'zone', 'en', 'description', 'The Costa del Sol''s original tourist town. Long beaches, the fishing quarter of La Carihuela, and a lively atmosphere day and night.'),
  ('zone_fuengirola', 'zone', 'es', 'name', 'Fuengirola'),
  ('zone_fuengirola', 'zone', 'es', 'description', 'Playas urbanas de 8 km, un paseo marítimo animado y el Bioparc, uno de los zoos de inmersión más reconocidos de España.'),
  ('zone_fuengirola', 'zone', 'en', 'name', 'Fuengirola'),
  ('zone_fuengirola', 'zone', 'en', 'description', '8 km of urban beaches, a lively seafront promenade, and Bioparc, one of Spain''s best-known immersion zoos.'),
  ('zone_mijas', 'zone', 'es', 'name', 'Mijas'),
  ('zone_mijas', 'zone', 'es', 'description', 'El pueblo blanco por excelencia de la Costa del Sol, encaramado en la sierra con vistas al Mediterráneo, calles floridas y los famosos burro-taxi.'),
  ('zone_mijas', 'zone', 'en', 'name', 'Mijas'),
  ('zone_mijas', 'zone', 'en', 'description', 'The quintessential white village of the Costa del Sol, perched on the mountainside with Mediterranean views, flower-lined streets and the famous donkey-taxis.'),
  ('zone_marbella', 'zone', 'es', 'name', 'Marbella'),
  ('zone_marbella', 'zone', 'es', 'description', 'Lujo, casco antiguo andaluz impecable y un rico patrimonio romano poco conocido. Incluye Puerto Banús y San Pedro de Alcántara.'),
  ('zone_marbella', 'zone', 'en', 'name', 'Marbella'),
  ('zone_marbella', 'zone', 'en', 'description', 'Luxury, an immaculate Andalusian old town, and a lesser-known rich Roman heritage. Includes Puerto Banús and San Pedro de Alcántara.');


-- ════════════════════════════════════════
-- 1. MÁLAGA CAPITAL — FREE
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_pois (id, zone_id, category, poi_type, access_type, latitude, longitude, google_maps_url, order_index, is_active, source) VALUES
  ('poi_malaga_teatro_romano',   'zone_malaga', 'Cultura',    'sight',   'free', 36.72127, -4.41639, 'https://www.google.com/maps/search/?api=1&query=36.72127,-4.41639', 10, 1, 'manual'),
  ('poi_malaga_larios',          'zone_malaga', 'Compras',    'sight',   'free', 36.71960, -4.41940, 'https://www.google.com/maps/search/?api=1&query=36.7196,-4.4194',   20, 1, 'manual'),
  ('poi_malaga_plaza_constitucion','zone_malaga','Cultura',   'sight',   'free', 36.72050, -4.42030, 'https://www.google.com/maps/search/?api=1&query=36.7205,-4.4203',   30, 1, 'manual'),
  ('poi_malaga_atarazanas',      'zone_malaga', 'Compras',    'sight',   'free', 36.71920, -4.42250, 'https://www.google.com/maps/search/?api=1&query=36.7192,-4.4225',   40, 1, 'manual'),
  ('poi_malaga_plaza_merced',    'zone_malaga', 'Cultura',    'sight',   'free', 36.72370, -4.41710, 'https://www.google.com/maps/search/?api=1&query=36.7237,-4.4171',   50, 1, 'manual'),
  ('poi_malaga_cripta_victoria', 'zone_malaga', 'Cultura',    'sight',   'free', 36.72800, -4.41570, 'https://www.google.com/maps/search/?api=1&query=36.7280,-4.4157',   60, 1, 'manual'),
  ('poi_malaga_cementerio_ingles','zone_malaga','Cultura',    'sight',   'free', 36.71690, -4.40900, 'https://www.google.com/maps/search/?api=1&query=36.7169,-4.4090',   70, 1, 'manual'),
  ('poi_malaga_soho',            'zone_malaga', 'Cultura',    'sight',   'free', 36.71570, -4.42050, 'https://www.google.com/maps/search/?api=1&query=36.7157,-4.4205',   80, 1, 'manual'),
  ('poi_malaga_pasaje_chinitas', 'zone_malaga', 'Cultura',    'sight',   'free', 36.72070, -4.42040, 'https://www.google.com/maps/search/?api=1&query=36.7207,-4.4204',   90, 1, 'manual'),
  ('poi_malaga_muelle_uno',      'zone_malaga', 'Naturaleza', 'sight',   'free', 36.71580, -4.41600, 'https://www.google.com/maps/search/?api=1&query=36.7158,-4.4160',  100, 1, 'manual'),
  ('poi_malaga_malagueta',       'zone_malaga', 'Playas',     'beach',   'free', 36.71880, -4.40790, 'https://www.google.com/maps/search/?api=1&query=36.7188,-4.4079',  110, 1, 'manual'),
  ('poi_malaga_mirador_gibralfaro','zone_malaga','Naturaleza','sight',   'free', 36.72330, -4.40870, 'https://www.google.com/maps/search/?api=1&query=36.7233,-4.4087',  120, 1, 'manual'),
  ('poi_malaga_santo_cristo',    'zone_malaga', 'Cultura',    'sight',   'free', 36.72170, -4.41930, 'https://www.google.com/maps/search/?api=1&query=36.7217,-4.4193',  130, 1, 'manual');

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
  ('poi_malaga_teatro_romano', 'poi', 'es', 'name', 'Teatro Romano de Málaga'),
  ('poi_malaga_teatro_romano', 'poi', 'es', 'description', 'Al pie de la Alcazaba, este teatro del siglo I a.C. es el vestigio romano más importante de la ciudad. Reutilizado por los árabes para construir la fortaleza, hoy se visita libremente junto a su centro de interpretación.'),
  ('poi_malaga_teatro_romano', 'poi', 'es', 'short_tip', 'Entrada gratuita. Cerrado los lunes. De noche, iluminado.'),
  ('poi_malaga_teatro_romano', 'poi', 'en', 'name', 'Roman Theatre of Málaga'),
  ('poi_malaga_teatro_romano', 'poi', 'en', 'description', 'At the foot of the Alcazaba, this 1st-century BC theatre is the city''s most important Roman remain. Free to visit, with a small interpretation centre.'),
  ('poi_malaga_teatro_romano', 'poi', 'en', 'short_tip', 'Free entry. Closed Mondays. Beautifully lit at night.'),

  ('poi_malaga_larios', 'poi', 'es', 'name', 'Calle Marqués de Larios'),
  ('poi_malaga_larios', 'poi', 'es', 'description', 'La gran arteria comercial y peatonal del centro histórico, con edificios de finales del XIX. Decorada espectacularmente en Navidad y durante la Feria de Málaga.'),
  ('poi_malaga_larios', 'poi', 'es', 'short_tip', 'Al atardecer se llena de música callejera y terrazas'),
  ('poi_malaga_larios', 'poi', 'en', 'name', 'Marqués de Larios Street'),
  ('poi_malaga_larios', 'poi', 'en', 'description', 'The main pedestrian shopping street of the historic centre, lined with late-19th-century buildings. Spectacularly decorated at Christmas and during the Málaga Fair.'),
  ('poi_malaga_larios', 'poi', 'en', 'short_tip', 'Fills up with street music and terraces at sunset'),

  ('poi_malaga_plaza_constitucion', 'poi', 'es', 'name', 'Plaza de la Constitución'),
  ('poi_malaga_plaza_constitucion', 'poi', 'es', 'description', 'Corazón histórico y político de la ciudad desde la Edad Media, con la Fuente de Génova del siglo XVI. Punto de partida natural para explorar el centro a pie.'),
  ('poi_malaga_plaza_constitucion', 'poi', 'es', 'short_tip', 'Salen desde aquí varias rutas de free tour'),
  ('poi_malaga_plaza_constitucion', 'poi', 'en', 'name', 'Plaza de la Constitución'),
  ('poi_malaga_plaza_constitucion', 'poi', 'en', 'description', 'The city''s historic and political heart since medieval times, with the 16th-century Genoa Fountain. A natural starting point for exploring the centre on foot.'),
  ('poi_malaga_plaza_constitucion', 'poi', 'en', 'short_tip', 'Several free walking tours depart from here'),

  ('poi_malaga_atarazanas', 'poi', 'es', 'name', 'Mercado de Atarazanas'),
  ('poi_malaga_atarazanas', 'poi', 'es', 'description', 'Mercado central del siglo XIX construido sobre unos antiguos astilleros nazaríes, con una gran vidriera modernista. Pescado fresco, jamón y bares de tapas dentro del propio mercado.'),
  ('poi_malaga_atarazanas', 'poi', 'es', 'short_tip', 'Ve por la mañana entre semana para evitar aglomeraciones'),
  ('poi_malaga_atarazanas', 'poi', 'en', 'name', 'Atarazanas Market'),
  ('poi_malaga_atarazanas', 'poi', 'en', 'description', 'A 19th-century central market built over an old Nasrid shipyard, with a large Art Nouveau stained-glass window. Fresh fish, cured ham and tapas bars right inside the market.'),
  ('poi_malaga_atarazanas', 'poi', 'en', 'short_tip', 'Go on a weekday morning to avoid the crowds'),

  ('poi_malaga_plaza_merced', 'poi', 'es', 'name', 'Plaza de la Merced'),
  ('poi_malaga_plaza_merced', 'poi', 'es', 'description', 'Amplia plaza porticada donde nació Picasso, con un obelisco dedicado al General Torrijos. Rodeada de terrazas, es uno de los puntos de encuentro favoritos de los malagueños.'),
  ('poi_malaga_plaza_merced', 'poi', 'es', 'short_tip', 'La Casa Natal de Picasso está justo en esta plaza'),
  ('poi_malaga_plaza_merced', 'poi', 'en', 'name', 'Plaza de la Merced'),
  ('poi_malaga_plaza_merced', 'poi', 'en', 'description', 'A large arcaded square where Picasso was born, with an obelisk honouring General Torrijos. Lined with terraces, it''s one of the locals'' favourite meeting points.'),
  ('poi_malaga_plaza_merced', 'poi', 'en', 'short_tip', 'Picasso''s birth house is right on this square'),

  ('poi_malaga_cripta_victoria', 'poi', 'es', 'name', 'Cripta de la Basílica de la Victoria'),
  ('poi_malaga_cripta_victoria', 'poi', 'es', 'description', 'Joya oculta bajo la Basílica de la Victoria: una cripta barroca con nichos y el impresionante Panteón de los Condes de Buenavista. Poco conocida incluso entre malagueños.'),
  ('poi_malaga_cripta_victoria', 'poi', 'es', 'short_tip', 'Pregunta en la sacristía si la cripta no está abierta — a veces requiere pedirla'),
  ('poi_malaga_cripta_victoria', 'poi', 'en', 'name', 'Crypt of the Basílica de la Victoria'),
  ('poi_malaga_cripta_victoria', 'poi', 'en', 'description', 'A hidden gem beneath the Basílica de la Victoria: a Baroque crypt with niches and the striking Pantheon of the Counts of Buenavista. Little known even among locals.'),
  ('poi_malaga_cripta_victoria', 'poi', 'en', 'short_tip', 'If the crypt looks closed, ask at the sacristy — it sometimes opens on request'),

  ('poi_malaga_cementerio_ingles', 'poi', 'es', 'name', 'Cementerio Inglés'),
  ('poi_malaga_cementerio_ingles', 'poi', 'es', 'description', 'El primer cementerio protestante de España (1831), un jardín romántico y tranquilo con tumbas de escritores y diplomáticos, a pocos metros de la playa de la Malagueta.'),
  ('poi_malaga_cementerio_ingles', 'poi', 'es', 'short_tip', 'Entrada gratuita, cerrado los lunes'),
  ('poi_malaga_cementerio_ingles', 'poi', 'en', 'name', 'English Cemetery'),
  ('poi_malaga_cementerio_ingles', 'poi', 'en', 'description', 'Spain''s first Protestant cemetery (1831), a quiet romantic garden with the graves of writers and diplomats, just steps from La Malagueta beach.'),
  ('poi_malaga_cementerio_ingles', 'poi', 'en', 'short_tip', 'Free entry, closed on Mondays'),

  ('poi_malaga_soho', 'poi', 'es', 'name', 'Barrio del Soho (arte urbano)'),
  ('poi_malaga_soho', 'poi', 'es', 'description', 'El "Museo de Arte Urbano de Málaga" (MAUS) al aire libre: fachadas enteras pintadas por artistas internacionales como D*Face, ROA u Obey. Un paseo distinto por el centro.'),
  ('poi_malaga_soho', 'poi', 'es', 'short_tip', 'Descarga el mapa del MAUS para no perderte ningún mural'),
  ('poi_malaga_soho', 'poi', 'en', 'name', 'Soho District (street art)'),
  ('poi_malaga_soho', 'poi', 'en', 'description', 'Málaga''s open-air Urban Art Museum (MAUS): entire building facades painted by international artists like D*Face, ROA and Obey. A different way to explore the centre.'),
  ('poi_malaga_soho', 'poi', 'en', 'short_tip', 'Download the MAUS map so you don''t miss any mural'),

  ('poi_malaga_pasaje_chinitas', 'poi', 'es', 'name', 'Pasaje de Chinitas'),
  ('poi_malaga_pasaje_chinitas', 'poi', 'es', 'description', 'Callejón histórico ligado al flamenco y a Federico García Lorca, hoy lleno de bares y tapas. Muy cerca de Plaza de la Constitución.'),
  ('poi_malaga_pasaje_chinitas', 'poi', 'es', 'short_tip', 'Buena parada para tapear antes o después del centro'),
  ('poi_malaga_pasaje_chinitas', 'poi', 'en', 'name', 'Pasaje de Chinitas'),
  ('poi_malaga_pasaje_chinitas', 'poi', 'en', 'description', 'A historic alley tied to flamenco and to the poet Federico García Lorca, now lined with tapas bars. Just steps from Plaza de la Constitución.'),
  ('poi_malaga_pasaje_chinitas', 'poi', 'en', 'short_tip', 'A good tapas stop before or after exploring the centre'),

  ('poi_malaga_muelle_uno', 'poi', 'es', 'name', 'Muelle Uno y Palmeral de las Sorpresas'),
  ('poi_malaga_muelle_uno', 'poi', 'es', 'description', 'Paseo portuario renovado junto al centro, con jardines, tiendas, terrazas y vistas a los cruceros. El Centre Pompidou Málaga está aquí mismo.'),
  ('poi_malaga_muelle_uno', 'poi', 'es', 'short_tip', 'Ideal para pasear al atardecer con vistas al Castillo de Gibralfaro'),
  ('poi_malaga_muelle_uno', 'poi', 'en', 'name', 'Muelle Uno & Palmeral de las Sorpresas'),
  ('poi_malaga_muelle_uno', 'poi', 'en', 'description', 'A renovated harbourside promenade next to the centre, with gardens, shops, terraces and cruise-ship views. The Centre Pompidou Málaga sits right here.'),
  ('poi_malaga_muelle_uno', 'poi', 'en', 'short_tip', 'Great for a sunset stroll with views of Gibralfaro Castle'),

  ('poi_malaga_malagueta', 'poi', 'es', 'name', 'Playa de la Malagueta'),
  ('poi_malaga_malagueta', 'poi', 'es', 'description', 'La playa urbana por excelencia de Málaga capital, a 10 minutos andando del centro histórico. Arena oscura, chiringuitos y paseo marítimo completo.'),
  ('poi_malaga_malagueta', 'poi', 'es', 'short_tip', 'Los espetos de sardinas de los chiringuitos son un clásico'),
  ('poi_malaga_malagueta', 'poi', 'en', 'name', 'La Malagueta Beach'),
  ('poi_malaga_malagueta', 'poi', 'en', 'description', 'Málaga city''s classic urban beach, a 10-minute walk from the historic centre. Dark sand, beach bars and a full seafront promenade.'),
  ('poi_malaga_malagueta', 'poi', 'en', 'short_tip', 'Grilled sardine skewers (espetos) at the beach bars are a classic'),

  ('poi_malaga_mirador_gibralfaro', 'poi', 'es', 'name', 'Mirador de Gibralfaro'),
  ('poi_malaga_mirador_gibralfaro', 'poi', 'es', 'description', 'Mirador gratuito junto al castillo con las mejores vistas panorámicas de la ciudad, el puerto y la Plaza de Toros de La Malagueta.'),
  ('poi_malaga_mirador_gibralfaro', 'poi', 'es', 'short_tip', 'Sube en autobús 35 o anda 30 min desde el centro — la vista compensa'),
  ('poi_malaga_mirador_gibralfaro', 'poi', 'en', 'name', 'Gibralfaro Viewpoint'),
  ('poi_malaga_mirador_gibralfaro', 'poi', 'en', 'description', 'A free viewpoint next to the castle with the best panoramic views of the city, the port and the La Malagueta bullring.'),
  ('poi_malaga_mirador_gibralfaro', 'poi', 'en', 'short_tip', 'Take bus 35 or walk 30 min from the centre — the view is worth it'),

  ('poi_malaga_santo_cristo', 'poi', 'es', 'name', 'Iglesia del Santo Cristo de la Salud'),
  ('poi_malaga_santo_cristo', 'poi', 'es', 'description', 'Iglesia barroca del siglo XVII con una llamativa fachada de mármol rojo, muy vinculada a la Semana Santa malagueña.'),
  ('poi_malaga_santo_cristo', 'poi', 'es', 'short_tip', 'Justo al lado de calle Larios, fácil de combinar con el paseo por el centro'),
  ('poi_malaga_santo_cristo', 'poi', 'en', 'name', 'Church of Santo Cristo de la Salud'),
  ('poi_malaga_santo_cristo', 'poi', 'en', 'description', 'A 17th-century Baroque church with a striking red marble facade, closely tied to Málaga''s Holy Week processions.'),
  ('poi_malaga_santo_cristo', 'poi', 'en', 'short_tip', 'Right next to Calle Larios — easy to combine with a stroll through the centre');


-- ════════════════════════════════════════
-- 2. MÁLAGA CAPITAL — PREMIUM (de pago, exclusivos)
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_pois (
  id, zone_id, category, poi_type, access_type, latitude, longitude, google_maps_url,
  is_bookable, action_type, action_data, price_display, badge_type, commission_type, commission_value,
  order_index, is_active, is_featured, source
) VALUES
  ('poi_malaga_alcazaba', 'zone_malaga', 'Cultura', 'attraction', 'paid', 36.72120, -4.41570, 'https://www.google.com/maps/search/?api=1&query=36.7212,-4.4157',
    1, 'URL', 'https://www.alcazabaygibralfaro.malaga.eu', 'desde 3,50 €', 'exclusive', 'none', 0, 10, 1, 1, 'manual'),
  ('poi_malaga_gibralfaro', 'zone_malaga', 'Cultura', 'attraction', 'paid', 36.72310, -4.40880, 'https://www.google.com/maps/search/?api=1&query=36.7231,-4.4088',
    1, 'URL', 'https://www.alcazabaygibralfaro.malaga.eu', 'desde 3,50 € (combinada con Alcazaba 5,50 €)', 'exclusive', 'none', 0, 20, 1, 0, 'manual'),
  ('poi_malaga_catedral', 'zone_malaga', 'Cultura', 'attraction', 'paid', 36.72050, -4.42000, 'https://www.google.com/maps/search/?api=1&query=36.7205,-4.4200',
    1, 'URL', 'https://www.malagacatedral.com', 'desde 8 € (Cubiertas desde 10 €)', 'exclusive', 'none', 0, 30, 1, 1, 'manual'),
  ('poi_malaga_museo_picasso', 'zone_malaga', 'Cultura', 'museum', 'paid', 36.72150, -4.41790, 'https://www.google.com/maps/search/?api=1&query=36.7215,-4.4179',
    1, 'URL', 'https://www.museopicassomalaga.org', 'desde 12 €', 'exclusive', 'none', 0, 40, 1, 1, 'manual'),
  ('poi_malaga_casa_natal_picasso', 'zone_malaga', 'Cultura', 'museum', 'paid', 36.72370, -4.41720, 'https://www.google.com/maps/search/?api=1&query=36.7237,-4.4172',
    1, 'URL', 'https://fundacionpicasso.malaga.eu', 'desde 4 €', 'exclusive', 'none', 0, 50, 1, 0, 'manual'),
  ('poi_malaga_pompidou', 'zone_malaga', 'Cultura', 'museum', 'paid', 36.71570, -4.41570, 'https://www.google.com/maps/search/?api=1&query=36.7157,-4.4157',
    1, 'URL', 'https://centrepompidou-malaga.eu', 'desde 9 €', 'exclusive', 'none', 0, 60, 1, 0, 'manual'),
  ('poi_malaga_thyssen', 'zone_malaga', 'Cultura', 'museum', 'paid', 36.72110, -4.42120, 'https://www.google.com/maps/search/?api=1&query=36.7211,-4.4212',
    1, 'URL', 'https://www.carmenthyssenmalaga.org', 'desde 10 €', 'exclusive', 'none', 0, 70, 1, 0, 'manual'),
  ('poi_malaga_concepcion', 'zone_malaga', 'Naturaleza', 'attraction', 'paid', 36.74420, -4.43630, 'https://www.google.com/maps/search/?api=1&query=36.7442,-4.4363',
    1, 'URL', 'https://www.laconcepcion.malaga.eu', 'desde 5,20 €', 'exclusive', 'none', 0, 80, 1, 0, 'manual'),
  ('poi_malaga_museo_automovilistico', 'zone_malaga', 'Cultura', 'museum', 'paid', 36.70470, -4.42950, 'https://www.google.com/maps/search/?api=1&query=36.7047,-4.4295',
    1, 'URL', 'https://museoautomovilmalaga.com', 'desde 9,50 €', 'exclusive', 'none', 0, 90, 1, 0, 'manual');

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
  ('poi_malaga_alcazaba', 'poi', 'es', 'name', 'Alcazaba de Málaga'),
  ('poi_malaga_alcazaba', 'poi', 'es', 'description', 'Fortaleza palaciega árabe del siglo XI, la mejor conservada de España. Jardines, patios con vistas al mar y el Teatro Romano a sus pies.'),
  ('poi_malaga_alcazaba', 'poi', 'es', 'cta_label', 'Comprar entradas'),
  ('poi_malaga_alcazaba', 'poi', 'en', 'name', 'Alcazaba of Málaga'),
  ('poi_malaga_alcazaba', 'poi', 'en', 'description', 'An 11th-century Moorish palace-fortress, the best preserved in Spain. Gardens, sea-view courtyards, and the Roman Theatre at its base.'),
  ('poi_malaga_alcazaba', 'poi', 'en', 'cta_label', 'Buy tickets'),

  ('poi_malaga_gibralfaro', 'poi', 'es', 'name', 'Castillo de Gibralfaro'),
  ('poi_malaga_gibralfaro', 'poi', 'es', 'description', 'Fortaleza militar del siglo XIV sobre el monte del mismo nombre, conectada a la Alcazaba por una muralla. Las vistas a 360° de la ciudad son las mejores de Málaga.'),
  ('poi_malaga_gibralfaro', 'poi', 'es', 'cta_label', 'Comprar entradas'),
  ('poi_malaga_gibralfaro', 'poi', 'en', 'name', 'Gibralfaro Castle'),
  ('poi_malaga_gibralfaro', 'poi', 'en', 'description', 'A 14th-century military fortress atop the hill of the same name, linked to the Alcazaba by a wall. The 360° views over the city are Málaga''s best.'),
  ('poi_malaga_gibralfaro', 'poi', 'en', 'cta_label', 'Buy tickets'),

  ('poi_malaga_catedral', 'poi', 'es', 'name', 'Catedral de Málaga ("La Manquita")'),
  ('poi_malaga_catedral', 'poi', 'es', 'description', 'Catedral renacentista con su famosa torre inacabada, de ahí el apodo "La Manquita". La subida a las Cubiertas ofrece una vista única del centro histórico.'),
  ('poi_malaga_catedral', 'poi', 'es', 'cta_label', 'Comprar entradas'),
  ('poi_malaga_catedral', 'poi', 'en', 'name', 'Málaga Cathedral ("La Manquita")'),
  ('poi_malaga_catedral', 'poi', 'en', 'description', 'A Renaissance cathedral famous for its unfinished tower, hence the nickname "the one-armed lady". Climbing the rooftop (Cubiertas) gives a unique view over the old town.'),
  ('poi_malaga_catedral', 'poi', 'en', 'cta_label', 'Buy tickets'),

  ('poi_malaga_museo_picasso', 'poi', 'es', 'name', 'Museo Picasso Málaga'),
  ('poi_malaga_museo_picasso', 'poi', 'es', 'description', 'Más de 200 obras del artista malagueño en el Palacio de Buenavista, donado por la familia Picasso. Imprescindible para entender su evolución artística.'),
  ('poi_malaga_museo_picasso', 'poi', 'es', 'cta_label', 'Comprar entradas'),
  ('poi_malaga_museo_picasso', 'poi', 'en', 'name', 'Museo Picasso Málaga'),
  ('poi_malaga_museo_picasso', 'poi', 'en', 'description', 'Over 200 works by the Málaga-born artist in the Buenavista Palace, donated by the Picasso family. Essential for understanding his artistic evolution.'),
  ('poi_malaga_museo_picasso', 'poi', 'en', 'cta_label', 'Buy tickets'),

  ('poi_malaga_casa_natal_picasso', 'poi', 'es', 'name', 'Casa Natal de Picasso'),
  ('poi_malaga_casa_natal_picasso', 'poi', 'es', 'description', 'La vivienda donde nació Pablo Picasso en 1881, en la Plaza de la Merced. Muebles de época, obra temprana y objetos personales de la familia.'),
  ('poi_malaga_casa_natal_picasso', 'poi', 'es', 'cta_label', 'Comprar entradas'),
  ('poi_malaga_casa_natal_picasso', 'poi', 'en', 'name', 'Picasso''s Birthplace House'),
  ('poi_malaga_casa_natal_picasso', 'poi', 'en', 'description', 'The house where Pablo Picasso was born in 1881, on Plaza de la Merced. Period furniture, early work and personal family objects.'),
  ('poi_malaga_casa_natal_picasso', 'poi', 'en', 'cta_label', 'Buy tickets'),

  ('poi_malaga_pompidou', 'poi', 'es', 'name', 'Centre Pompidou Málaga'),
  ('poi_malaga_pompidou', 'poi', 'es', 'description', 'La única sede del Pompidou fuera de Francia, reconocible por su cubo de cristal de colores en el puerto. Arte moderno y contemporáneo de la colección parisina.'),
  ('poi_malaga_pompidou', 'poi', 'es', 'cta_label', 'Comprar entradas'),
  ('poi_malaga_pompidou', 'poi', 'en', 'name', 'Centre Pompidou Málaga'),
  ('poi_malaga_pompidou', 'poi', 'en', 'description', 'The only Pompidou outpost outside France, recognisable by its colourful glass cube on the harbour. Modern and contemporary art from the Paris collection.'),
  ('poi_malaga_pompidou', 'poi', 'en', 'cta_label', 'Buy tickets'),

  ('poi_malaga_thyssen', 'poi', 'es', 'name', 'Museo Carmen Thyssen Málaga'),
  ('poi_malaga_thyssen', 'poi', 'es', 'description', 'Pintura española del XIX, con especial peso en la escuela andaluza y el costumbrismo, en un palacete renacentista del centro histórico.'),
  ('poi_malaga_thyssen', 'poi', 'es', 'cta_label', 'Comprar entradas'),
  ('poi_malaga_thyssen', 'poi', 'en', 'name', 'Carmen Thyssen Museum Málaga'),
  ('poi_malaga_thyssen', 'poi', 'en', 'description', '19th-century Spanish painting, with a strong focus on the Andalusian school, housed in a Renaissance-era palace in the old town.'),
  ('poi_malaga_thyssen', 'poi', 'en', 'cta_label', 'Buy tickets'),

  ('poi_malaga_concepcion', 'poi', 'es', 'name', 'Jardín Botánico-Histórico La Concepción'),
  ('poi_malaga_concepcion', 'poi', 'es', 'description', 'Jardín subtropical del siglo XIX declarado Bien de Interés Cultural, con más de 25 hectáreas, palmeras centenarias y un yacimiento megalítico.'),
  ('poi_malaga_concepcion', 'poi', 'es', 'cta_label', 'Comprar entradas'),
  ('poi_malaga_concepcion', 'poi', 'en', 'name', 'La Concepción Historical-Botanical Garden'),
  ('poi_malaga_concepcion', 'poi', 'en', 'description', 'A 19th-century subtropical garden protected as a Site of Cultural Interest, spanning 25+ hectares with centuries-old palms and a megalithic site.'),
  ('poi_malaga_concepcion', 'poi', 'en', 'cta_label', 'Buy tickets'),

  ('poi_malaga_museo_automovilistico', 'poi', 'es', 'name', 'Museo Automovilístico y de la Moda'),
  ('poi_malaga_museo_automovilistico', 'poi', 'es', 'description', 'Colección única que combina coches clásicos de época con alta costura y sombreros, en una antigua fábrica de tabaco reconvertida.'),
  ('poi_malaga_museo_automovilistico', 'poi', 'es', 'cta_label', 'Comprar entradas'),
  ('poi_malaga_museo_automovilistico', 'poi', 'en', 'name', 'Automobile & Fashion Museum'),
  ('poi_malaga_museo_automovilistico', 'poi', 'en', 'description', 'A unique collection pairing classic vintage cars with haute couture and hats, housed in a converted historic tobacco factory.'),
  ('poi_malaga_museo_automovilistico', 'poi', 'en', 'cta_label', 'Buy tickets');


-- ════════════════════════════════════════
-- 3. TORREMOLINOS — FREE
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_pois (id, zone_id, category, poi_type, access_type, latitude, longitude, google_maps_url, order_index, is_active, source) VALUES
  ('poi_torremolinos_san_miguel',   'zone_torremolinos', 'Compras',    'sight', 'free', 36.62290, -4.49980, 'https://www.google.com/maps/search/?api=1&query=36.6229,-4.4998', 10, 1, 'manual'),
  ('poi_torremolinos_cuesta_tajo',  'zone_torremolinos', 'Cultura',    'sight', 'free', 36.62150, -4.50080, 'https://www.google.com/maps/search/?api=1&query=36.6215,-4.5008', 20, 1, 'manual'),
  ('poi_torremolinos_torre_pimentel','zone_torremolinos','Cultura',   'sight', 'free', 36.62220, -4.50130, 'https://www.google.com/maps/search/?api=1&query=36.6222,-4.5013', 30, 1, 'manual'),
  ('poi_torremolinos_carihuela',    'zone_torremolinos', 'Cultura',    'sight', 'free', 36.61750, -4.50400, 'https://www.google.com/maps/search/?api=1&query=36.6175,-4.5040', 40, 1, 'manual'),
  ('poi_torremolinos_bajondillo',   'zone_torremolinos', 'Playas',     'beach', 'free', 36.61980, -4.49750, 'https://www.google.com/maps/search/?api=1&query=36.6198,-4.4975', 50, 1, 'manual'),
  ('poi_torremolinos_bateria',      'zone_torremolinos', 'Naturaleza', 'sight', 'free', 36.61200, -4.50700, 'https://www.google.com/maps/search/?api=1&query=36.6120,-4.5070', 60, 1, 'manual'),
  ('poi_torremolinos_molino_inca',  'zone_torremolinos', 'Naturaleza', 'nature','free', 36.63000, -4.48500, 'https://www.google.com/maps/search/?api=1&query=36.6300,-4.4850', 70, 1, 'manual');

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
  ('poi_torremolinos_san_miguel', 'poi', 'es', 'name', 'Calle San Miguel'),
  ('poi_torremolinos_san_miguel', 'poi', 'es', 'description', 'Calle peatonal comercial del centro, corazón de Torremolinos desde los años 60. Tiendas, heladerías y ambiente animado todo el día.'),
  ('poi_torremolinos_san_miguel', 'poi', 'es', 'short_tip', 'Punto de partida perfecto hacia la Cuesta del Tajo'),
  ('poi_torremolinos_san_miguel', 'poi', 'en', 'name', 'Calle San Miguel'),
  ('poi_torremolinos_san_miguel', 'poi', 'en', 'description', 'The town centre''s pedestrian shopping street, Torremolinos'' heart since the 1960s. Shops, ice-cream parlours and a lively atmosphere all day.'),
  ('poi_torremolinos_san_miguel', 'poi', 'en', 'short_tip', 'A great starting point towards Cuesta del Tajo'),

  ('poi_torremolinos_cuesta_tajo', 'poi', 'es', 'name', 'Cuesta del Tajo'),
  ('poi_torremolinos_cuesta_tajo', 'poi', 'es', 'description', 'Antigua calle-barranco que baja desde el centro hasta la playa de La Carihuela, con vistas al mar y casas encaladas tradicionales.'),
  ('poi_torremolinos_cuesta_tajo', 'poi', 'es', 'short_tip', 'La bajada es fácil, la subida tiene bastante pendiente'),
  ('poi_torremolinos_cuesta_tajo', 'poi', 'en', 'name', 'Cuesta del Tajo'),
  ('poi_torremolinos_cuesta_tajo', 'poi', 'en', 'description', 'An old ravine-street descending from the centre to La Carihuela beach, with sea views and traditional whitewashed houses.'),
  ('poi_torremolinos_cuesta_tajo', 'poi', 'en', 'short_tip', 'Easy going down, fairly steep coming back up'),

  ('poi_torremolinos_torre_pimentel', 'poi', 'es', 'name', 'Torre de Pimentel (Torre de los Molinos)'),
  ('poi_torremolinos_torre_pimentel', 'poi', 'es', 'description', 'Torre vigía del siglo XV que da nombre a la ciudad ("Torre de los Molinos"). Uno de los pocos restos históricos visibles del Torremolinos anterior al turismo.'),
  ('poi_torremolinos_torre_pimentel', 'poi', 'es', 'short_tip', 'Pequeña pero con mucha historia — fácil de combinar con la Cuesta del Tajo'),
  ('poi_torremolinos_torre_pimentel', 'poi', 'en', 'name', 'Torre de Pimentel (Mills Tower)'),
  ('poi_torremolinos_torre_pimentel', 'poi', 'en', 'description', 'A 15th-century watchtower that gives the town its name ("Tower of the Mills"). One of the few visible historic remains of pre-tourism Torremolinos.'),
  ('poi_torremolinos_torre_pimentel', 'poi', 'en', 'short_tip', 'Small but full of history — easy to combine with Cuesta del Tajo'),

  ('poi_torremolinos_carihuela', 'poi', 'es', 'name', 'Barrio de La Carihuela'),
  ('poi_torremolinos_carihuela', 'poi', 'es', 'description', 'Antiguo barrio de pescadores junto al mar, hoy lleno de restaurantes de pescado fresco y chiringuitos. El paseo marítimo más auténtico de Torremolinos.'),
  ('poi_torremolinos_carihuela', 'poi', 'es', 'short_tip', 'Pide un plato de boquerones victorianos, especialidad de la zona'),
  ('poi_torremolinos_carihuela', 'poi', 'en', 'name', 'La Carihuela District'),
  ('poi_torremolinos_carihuela', 'poi', 'en', 'description', 'A former fishermen''s quarter by the sea, now full of fresh-fish restaurants and beach bars. Torremolinos'' most authentic seafront.'),
  ('poi_torremolinos_carihuela', 'poi', 'en', 'short_tip', 'Try the local specialty "boquerones victorianos" (fried anchovies)'),

  ('poi_torremolinos_bajondillo', 'poi', 'es', 'name', 'Playa del Bajondillo'),
  ('poi_torremolinos_bajondillo', 'poi', 'es', 'description', 'Una de las playas más céntricas y concurridas de Torremolinos, con todos los servicios y fácil acceso desde el centro.'),
  ('poi_torremolinos_bajondillo', 'poi', 'es', 'short_tip', 'Muy concurrida en verano — llega temprano si quieres sitio'),
  ('poi_torremolinos_bajondillo', 'poi', 'en', 'name', 'Bajondillo Beach'),
  ('poi_torremolinos_bajondillo', 'poi', 'en', 'description', 'One of Torremolinos'' most central and popular beaches, fully serviced and an easy walk from the centre.'),
  ('poi_torremolinos_bajondillo', 'poi', 'en', 'short_tip', 'Very busy in summer — arrive early for a good spot'),

  ('poi_torremolinos_bateria', 'poi', 'es', 'name', 'Parque de la Batería'),
  ('poi_torremolinos_bateria', 'poi', 'es', 'description', 'Parque costero con una antigua torre-mirador y jardines sobre el acantilado. Un rincón tranquilo lejos del bullicio, con vistas al mar.'),
  ('poi_torremolinos_bateria', 'poi', 'es', 'short_tip', 'Ideal para un paseo tranquilo al atardecer'),
  ('poi_torremolinos_bateria', 'poi', 'en', 'name', 'Parque de la Batería'),
  ('poi_torremolinos_bateria', 'poi', 'en', 'description', 'A coastal park with an old watchtower and gardens over the cliffside. A quiet corner away from the crowds, with sea views.'),
  ('poi_torremolinos_bateria', 'poi', 'en', 'short_tip', 'Great for a peaceful sunset walk'),

  ('poi_torremolinos_molino_inca', 'poi', 'es', 'name', 'Jardín Botánico Molino de Inca'),
  ('poi_torremolinos_molino_inca', 'poi', 'es', 'description', 'Antiguo manantial y molino de agua reconvertido en un frondoso jardín botánico gratuito, con estanques, cascadas y aves. Un oasis verde poco conocido por los turistas.'),
  ('poi_torremolinos_molino_inca', 'poi', 'es', 'short_tip', 'Entrada gratuita — perfecto para escapar del calor en verano'),
  ('poi_torremolinos_molino_inca', 'poi', 'en', 'name', 'Molino de Inca Botanical Garden'),
  ('poi_torremolinos_molino_inca', 'poi', 'en', 'description', 'A former spring and watermill turned into a lush, free botanical garden, with ponds, waterfalls and birdlife. A green oasis most tourists never find.'),
  ('poi_torremolinos_molino_inca', 'poi', 'en', 'short_tip', 'Free entry — a perfect escape from the summer heat');


-- ════════════════════════════════════════
-- 4. TORREMOLINOS — PREMIUM
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_pois (
  id, zone_id, category, poi_type, access_type, latitude, longitude, google_maps_url,
  is_bookable, action_type, action_data, price_display, badge_type, commission_type, commission_value,
  order_index, is_active, is_featured, source
) VALUES
  ('poi_torremolinos_cocodrilos', 'zone_torremolinos', 'Actividades', 'attraction', 'paid', 36.62800, -4.49000, 'https://www.google.com/maps/search/?api=1&query=36.6280,-4.4900',
    1, 'URL', 'https://www.cocodrilospark.com', 'desde 18,90 €', 'exclusive', 'none', 0, 10, 1, 1, 'manual'),
  ('poi_torremolinos_aqualand', 'zone_torremolinos', 'Actividades', 'attraction', 'paid', 36.62700, -4.48200, 'https://www.google.com/maps/search/?api=1&query=36.6270,-4.4820',
    1, 'URL', 'https://www.aqualand.es/torremolinos', 'desde 26 €', 'exclusive', 'none', 0, 20, 1, 0, 'manual');

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
  ('poi_torremolinos_cocodrilos', 'poi', 'es', 'name', 'Cocodrilos Park'),
  ('poi_torremolinos_cocodrilos', 'poi', 'es', 'description', 'Único parque de cocodrilos de España, con más de 300 ejemplares. Incluye zona de reptiles, exhibiciones y la posibilidad de sostener una cría de cocodrilo.'),
  ('poi_torremolinos_cocodrilos', 'poi', 'es', 'cta_label', 'Comprar entradas'),
  ('poi_torremolinos_cocodrilos', 'poi', 'en', 'name', 'Cocodrilos Park (Crocodile Park)'),
  ('poi_torremolinos_cocodrilos', 'poi', 'en', 'description', 'Spain''s only crocodile park, home to over 300 crocodiles. Includes a reptile area, shows, and the chance to hold a baby crocodile.'),
  ('poi_torremolinos_cocodrilos', 'poi', 'en', 'cta_label', 'Buy tickets'),

  ('poi_torremolinos_aqualand', 'poi', 'es', 'name', 'Aqualand Torremolinos'),
  ('poi_torremolinos_aqualand', 'poi', 'es', 'description', 'El mayor parque acuático de la Costa del Sol occidental, con toboganes, piscina de olas y zona infantil. Única sede de la cadena en esta parte de la costa.'),
  ('poi_torremolinos_aqualand', 'poi', 'es', 'cta_label', 'Comprar entradas'),
  ('poi_torremolinos_aqualand', 'poi', 'en', 'name', 'Aqualand Torremolinos'),
  ('poi_torremolinos_aqualand', 'poi', 'en', 'description', 'The largest water park in the western Costa del Sol, with slides, a wave pool and a kids'' area. The only park in the chain on this stretch of coast.'),
  ('poi_torremolinos_aqualand', 'poi', 'en', 'cta_label', 'Buy tickets');


-- ════════════════════════════════════════
-- 5. BENALMÁDENA — nuevos (no duplica los 6 de la demo 0055)
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_pois (id, zone_id, category, poi_type, access_type, latitude, longitude, google_maps_url, order_index, is_active, source) VALUES
  ('poi_benalmadena_plaza_espana', 'zone_benalmadena', 'Cultura', 'sight', 'free', 36.59460, -4.51630, 'https://www.google.com/maps/search/?api=1&query=36.5946,-4.5163', 70, 1, 'manual');

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
  ('poi_benalmadena_plaza_espana', 'poi', 'es', 'name', 'Plaza de España (Benalmádena Pueblo)'),
  ('poi_benalmadena_plaza_espana', 'poi', 'es', 'description', 'Plaza central del casco antiguo, punto de encuentro con terrazas, la Iglesia de Santo Domingo cerca y vistas al valle. Ideal para empezar la visita al pueblo.'),
  ('poi_benalmadena_plaza_espana', 'poi', 'es', 'short_tip', 'Buen punto de referencia para aparcar y explorar el pueblo a pie'),
  ('poi_benalmadena_plaza_espana', 'poi', 'en', 'name', 'Plaza de España (Benalmádena Pueblo)'),
  ('poi_benalmadena_plaza_espana', 'poi', 'en', 'description', 'The old town''s central square, a meeting point with terraces, close to Santo Domingo Church, with valley views. A great place to start exploring the village.'),
  ('poi_benalmadena_plaza_espana', 'poi', 'en', 'short_tip', 'A handy reference point to park and explore the village on foot');

INSERT OR IGNORE INTO guide_pois (
  id, zone_id, category, poi_type, access_type, latitude, longitude, google_maps_url,
  is_bookable, action_type, action_data, price_display, badge_type, commission_type, commission_value,
  order_index, is_active, is_featured, source
) VALUES
  ('poi_benalmadena_teleferico', 'zone_benalmadena', 'Naturaleza', 'attraction', 'paid', 36.59700, -4.55900, 'https://www.google.com/maps/search/?api=1&query=36.5970,-4.5590',
    1, 'URL', 'https://www.telefericobenalmadena.com', 'desde 23,90 €', 'exclusive', 'none', 0, 80, 1, 1, 'manual'),
  ('poi_benalmadena_mariposario', 'zone_benalmadena', 'Naturaleza', 'attraction', 'paid', 36.59460, -4.51750, 'https://www.google.com/maps/search/?api=1&query=36.5946,-4.5175',
    1, 'URL', 'https://www.mariposariodebenalmadena.com', 'desde 14 €', 'exclusive', 'none', 0, 90, 1, 0, 'manual'),
  ('poi_benalmadena_selwo_marina', 'zone_benalmadena', 'Naturaleza', 'attraction', 'paid', 36.58780, -4.52500, 'https://www.google.com/maps/search/?api=1&query=36.5878,-4.5250',
    1, 'URL', 'https://www.selwomarina.es', 'desde 23 €', 'exclusive', 'none', 0, 100, 1, 0, 'manual');

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
  ('poi_benalmadena_teleferico', 'poi', 'es', 'name', 'Teleférico de Benalmádena'),
  ('poi_benalmadena_teleferico', 'poi', 'es', 'description', 'Sube en 15 min a los 769 m del Monte Calamorro para vistas de toda la Costa del Sol, Gibraltar y el norte de África. Arriba: exhibiciones de aves rapaces y rutas de senderismo. Único en la costa.'),
  ('poi_benalmadena_teleferico', 'poi', 'es', 'cta_label', 'Comprar entradas'),
  ('poi_benalmadena_teleferico', 'poi', 'en', 'name', 'Benalmádena Cable Car'),
  ('poi_benalmadena_teleferico', 'poi', 'en', 'description', 'A 15-minute ride to the 769 m summit of Monte Calamorro with views over the whole coast, Gibraltar and North Africa. Birds-of-prey shows and hiking trails at the top. One of a kind on the coast.'),
  ('poi_benalmadena_teleferico', 'poi', 'en', 'cta_label', 'Buy tickets'),

  ('poi_benalmadena_mariposario', 'poi', 'es', 'name', 'Mariposario de Benalmádena'),
  ('poi_benalmadena_mariposario', 'poi', 'es', 'description', 'Uno de los mariposarios más grandes de Europa, con miles de mariposas tropicales volando libres en un invernadero junto a la Estupa Budista.'),
  ('poi_benalmadena_mariposario', 'poi', 'es', 'cta_label', 'Comprar entradas'),
  ('poi_benalmadena_mariposario', 'poi', 'en', 'name', 'Benalmádena Butterfly Park'),
  ('poi_benalmadena_mariposario', 'poi', 'en', 'description', 'One of the largest butterfly parks in Europe, with thousands of tropical butterflies flying free inside a greenhouse next to the Buddhist Stupa.'),
  ('poi_benalmadena_mariposario', 'poi', 'en', 'cta_label', 'Buy tickets'),

  ('poi_benalmadena_selwo_marina', 'poi', 'es', 'name', 'Selwo Marina'),
  ('poi_benalmadena_selwo_marina', 'poi', 'es', 'description', 'Parque marino con delfinario, pingüinera y aves exóticas, junto al puerto de Benalmádena. El único parque de este tipo en la zona.'),
  ('poi_benalmadena_selwo_marina', 'poi', 'es', 'cta_label', 'Comprar entradas'),
  ('poi_benalmadena_selwo_marina', 'poi', 'en', 'name', 'Selwo Marina'),
  ('poi_benalmadena_selwo_marina', 'poi', 'en', 'description', 'A marine park with a dolphinarium, penguin colony and exotic birds, right by the Benalmádena harbour. The only park of its kind in the area.'),
  ('poi_benalmadena_selwo_marina', 'poi', 'en', 'cta_label', 'Buy tickets');


-- ════════════════════════════════════════
-- 6. FUENGIROLA — FREE
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_pois (id, zone_id, category, poi_type, access_type, latitude, longitude, google_maps_url, order_index, is_active, source) VALUES
  ('poi_fuengirola_castillo_sohail', 'zone_fuengirola', 'Cultura',    'sight', 'free', 36.52960, -4.63650, 'https://www.google.com/maps/search/?api=1&query=36.5296,-4.6365', 10, 1, 'manual'),
  ('poi_fuengirola_paseo_maritimo',  'zone_fuengirola', 'Naturaleza', 'sight', 'free', 36.53800, -4.62300, 'https://www.google.com/maps/search/?api=1&query=36.5380,-4.6230', 20, 1, 'manual'),
  ('poi_fuengirola_casco_antiguo',   'zone_fuengirola', 'Cultura',    'sight', 'free', 36.54060, -4.62450, 'https://www.google.com/maps/search/?api=1&query=36.5406,-4.6245', 30, 1, 'manual'),
  ('poi_fuengirola_parque_fluvial',  'zone_fuengirola', 'Naturaleza', 'nature','free', 36.53500, -4.62800, 'https://www.google.com/maps/search/?api=1&query=36.5350,-4.6280', 40, 1, 'manual'),
  ('poi_fuengirola_boliches',        'zone_fuengirola', 'Cultura',    'sight', 'free', 36.54800, -4.61200, 'https://www.google.com/maps/search/?api=1&query=36.5480,-4.6120', 50, 1, 'manual'),
  ('poi_fuengirola_santa_amalia',    'zone_fuengirola', 'Playas',     'beach', 'free', 36.54500, -4.61500, 'https://www.google.com/maps/search/?api=1&query=36.5450,-4.6150', 60, 1, 'manual');

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
  ('poi_fuengirola_castillo_sohail', 'poi', 'es', 'name', 'Castillo Sohail'),
  ('poi_fuengirola_castillo_sohail', 'poi', 'es', 'description', 'Fortaleza árabe del siglo X en la desembocadura del río Fuengirola, reconstruida tras un terremoto en el XVIII. El recinto exterior se visita gratis; hoy acoge conciertos.'),
  ('poi_fuengirola_castillo_sohail', 'poi', 'es', 'short_tip', 'En verano se celebran conciertos dentro del castillo — consulta cartelera'),
  ('poi_fuengirola_castillo_sohail', 'poi', 'en', 'name', 'Sohail Castle'),
  ('poi_fuengirola_castillo_sohail', 'poi', 'en', 'description', 'A 10th-century Moorish fortress at the mouth of the Fuengirola river, rebuilt after an 18th-century earthquake. The outer grounds are free to visit and now host concerts.'),
  ('poi_fuengirola_castillo_sohail', 'poi', 'en', 'short_tip', 'Concerts are held inside the castle in summer — check the schedule'),

  ('poi_fuengirola_paseo_maritimo', 'poi', 'es', 'name', 'Paseo Marítimo Rey de España'),
  ('poi_fuengirola_paseo_maritimo', 'poi', 'es', 'description', 'Uno de los paseos marítimos más largos de la Costa del Sol (más de 7 km), que recorre toda la fachada de playas de Fuengirola.'),
  ('poi_fuengirola_paseo_maritimo', 'poi', 'es', 'short_tip', 'Perfecto para correr o pasear en bici al amanecer'),
  ('poi_fuengirola_paseo_maritimo', 'poi', 'en', 'name', 'Rey de España Promenade'),
  ('poi_fuengirola_paseo_maritimo', 'poi', 'en', 'description', 'One of the longest seafront promenades on the Costa del Sol (over 7 km), running along the whole of Fuengirola''s beachfront.'),
  ('poi_fuengirola_paseo_maritimo', 'poi', 'en', 'short_tip', 'Great for a run or a bike ride at sunrise'),

  ('poi_fuengirola_casco_antiguo', 'poi', 'es', 'name', 'Casco Antiguo de Fuengirola'),
  ('poi_fuengirola_casco_antiguo', 'poi', 'es', 'description', 'Calles peatonales alrededor de la Plaza de la Constitución, con comercio local, mercado de los martes y tapeo tradicional.'),
  ('poi_fuengirola_casco_antiguo', 'poi', 'es', 'short_tip', 'El mercadillo de los martes en el recinto ferial es muy popular'),
  ('poi_fuengirola_casco_antiguo', 'poi', 'en', 'name', 'Fuengirola Old Town'),
  ('poi_fuengirola_casco_antiguo', 'poi', 'en', 'description', 'Pedestrian streets around Plaza de la Constitución, with local shops, a Tuesday street market and traditional tapas bars.'),
  ('poi_fuengirola_casco_antiguo', 'poi', 'en', 'short_tip', 'The Tuesday street market at the fairground is very popular'),

  ('poi_fuengirola_parque_fluvial', 'poi', 'es', 'name', 'Parque Fluvial del Río Fuengirola'),
  ('poi_fuengirola_parque_fluvial', 'poi', 'es', 'description', 'Corredor verde junto al cauce del río, con carril bici y zonas de sombra. Una escapada tranquila lejos de la playa, poco conocida por los visitantes.'),
  ('poi_fuengirola_parque_fluvial', 'poi', 'es', 'short_tip', 'Conecta a pie o en bici con el Bioparc y el Castillo Sohail'),
  ('poi_fuengirola_parque_fluvial', 'poi', 'en', 'name', 'Fuengirola River Park'),
  ('poi_fuengirola_parque_fluvial', 'poi', 'en', 'description', 'A green corridor along the riverbed, with a bike lane and shaded areas. A quiet escape from the beach that most visitors never discover.'),
  ('poi_fuengirola_parque_fluvial', 'poi', 'en', 'short_tip', 'Connects on foot or by bike to Bioparc and Sohail Castle'),

  ('poi_fuengirola_boliches', 'poi', 'es', 'name', 'Los Boliches'),
  ('poi_fuengirola_boliches', 'poi', 'es', 'description', 'Antiguo barrio de pescadores hoy integrado en Fuengirola, con calles estrechas, iglesia propia y buen ambiente de tapeo junto al mar.'),
  ('poi_fuengirola_boliches', 'poi', 'es', 'short_tip', 'Menos turístico que el centro — buena opción para comer pescado fresco'),
  ('poi_fuengirola_boliches', 'poi', 'en', 'name', 'Los Boliches'),
  ('poi_fuengirola_boliches', 'poi', 'en', 'description', 'A former fishing quarter now part of Fuengirola, with narrow streets, its own church and a great tapas scene by the sea.'),
  ('poi_fuengirola_boliches', 'poi', 'en', 'short_tip', 'Less touristy than the centre — a good spot for fresh fish'),

  ('poi_fuengirola_santa_amalia', 'poi', 'es', 'name', 'Playa de Santa Amalia'),
  ('poi_fuengirola_santa_amalia', 'poi', 'es', 'description', 'Playa urbana amplia y bien equipada, con bandera azul, chiringuitos y todos los servicios. Una de las favoritas de las familias.'),
  ('poi_fuengirola_santa_amalia', 'poi', 'es', 'short_tip', 'Buena opción con niños por su acceso fácil y aguas tranquilas'),
  ('poi_fuengirola_santa_amalia', 'poi', 'en', 'name', 'Santa Amalia Beach'),
  ('poi_fuengirola_santa_amalia', 'poi', 'en', 'description', 'A wide, well-equipped urban beach with a blue flag, beach bars and full services. A family favourite.'),
  ('poi_fuengirola_santa_amalia', 'poi', 'en', 'short_tip', 'A good choice with kids thanks to easy access and calm waters');


-- ════════════════════════════════════════
-- 7. FUENGIROLA — PREMIUM
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_pois (
  id, zone_id, category, poi_type, access_type, latitude, longitude, google_maps_url,
  is_bookable, action_type, action_data, price_display, badge_type, commission_type, commission_value,
  order_index, is_active, is_featured, source
) VALUES
  ('poi_fuengirola_bioparc', 'zone_fuengirola', 'Naturaleza', 'attraction', 'paid', 36.54240, -4.62740, 'https://www.google.com/maps/search/?api=1&query=36.5424,-4.6274',
    1, 'URL', 'https://www.bioparcfuengirola.es', 'desde 23,95 €', 'exclusive', 'none', 0, 10, 1, 1, 'manual');

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
  ('poi_fuengirola_bioparc', 'poi', 'es', 'name', 'Bioparc Fuengirola'),
  ('poi_fuengirola_bioparc', 'poi', 'es', 'description', 'Zoo de inmersión (sin jaulas o rejas visibles) con más de 200 especies, muchas en peligro de extinción. Top 10 de atracciones de la provincia de Málaga en TripAdvisor.'),
  ('poi_fuengirola_bioparc', 'poi', 'es', 'cta_label', 'Comprar entradas'),
  ('poi_fuengirola_bioparc', 'poi', 'en', 'name', 'Bioparc Fuengirola'),
  ('poi_fuengirola_bioparc', 'poi', 'en', 'description', 'An immersion zoo (no visible bars or cages) with 200+ species, many endangered. A TripAdvisor top-10 attraction in the Province of Málaga.'),
  ('poi_fuengirola_bioparc', 'poi', 'en', 'cta_label', 'Buy tickets');


-- ════════════════════════════════════════
-- 8. MIJAS — FREE
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_pois (id, zone_id, category, poi_type, access_type, latitude, longitude, google_maps_url, order_index, is_active, source) VALUES
  ('poi_mijas_casco_antiguo',    'zone_mijas', 'Cultura',    'sight', 'free', 36.59640, -4.63720, 'https://www.google.com/maps/search/?api=1&query=36.5964,-4.6372', 10, 1, 'manual'),
  ('poi_mijas_mirador_compas',   'zone_mijas', 'Naturaleza', 'sight', 'free', 36.59580, -4.63900, 'https://www.google.com/maps/search/?api=1&query=36.5958,-4.6390', 20, 1, 'manual'),
  ('poi_mijas_jardines_muralla', 'zone_mijas', 'Naturaleza', 'nature','free', 36.59700, -4.63650, 'https://www.google.com/maps/search/?api=1&query=36.5970,-4.6365', 30, 1, 'manual'),
  ('poi_mijas_ermita_peña',      'zone_mijas', 'Cultura',    'sight', 'free', 36.59750, -4.63950, 'https://www.google.com/maps/search/?api=1&query=36.5975,-4.6395', 40, 1, 'manual'),
  ('poi_mijas_plaza_virgen_peña','zone_mijas', 'Cultura',    'sight', 'free', 36.59720, -4.63920, 'https://www.google.com/maps/search/?api=1&query=36.5972,-4.6392', 50, 1, 'manual'),
  ('poi_mijas_cac',              'zone_mijas', 'Cultura',    'museum','free', 36.59680, -4.63680, 'https://www.google.com/maps/search/?api=1&query=36.5968,-4.6368', 60, 1, 'manual'),
  ('poi_mijas_cala',              'zone_mijas', 'Playas',    'beach', 'free', 36.50870, -4.68900, 'https://www.google.com/maps/search/?api=1&query=36.5087,-4.6890', 70, 1, 'manual');

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
  ('poi_mijas_casco_antiguo', 'poi', 'es', 'name', 'Casco Antiguo de Mijas Pueblo'),
  ('poi_mijas_casco_antiguo', 'poi', 'es', 'description', 'El pueblo blanco encaramado en la sierra, con calles empedradas, macetas de geranios y vistas al Mediterráneo. Uno de los pueblos con más encanto de la Costa del Sol.'),
  ('poi_mijas_casco_antiguo', 'poi', 'es', 'short_tip', 'Aparca en la entrada del pueblo — el centro es totalmente peatonal'),
  ('poi_mijas_casco_antiguo', 'poi', 'en', 'name', 'Mijas Pueblo Old Town'),
  ('poi_mijas_casco_antiguo', 'poi', 'en', 'description', 'The white village perched on the mountainside, with cobbled streets, geranium pots and Mediterranean views. One of the most charming villages on the Costa del Sol.'),
  ('poi_mijas_casco_antiguo', 'poi', 'en', 'short_tip', 'Park at the village entrance — the centre is fully pedestrian'),

  ('poi_mijas_mirador_compas', 'poi', 'es', 'name', 'Mirador del Compás'),
  ('poi_mijas_mirador_compas', 'poi', 'es', 'description', 'Balcón natural con vistas espectaculares a Fuengirola, la costa y, en días claros, hasta África. Uno de los mejores miradores gratuitos de la zona.'),
  ('poi_mijas_mirador_compas', 'poi', 'es', 'short_tip', 'Los días despejados de invierno ofrecen la mejor visibilidad'),
  ('poi_mijas_mirador_compas', 'poi', 'en', 'name', 'Mirador del Compás'),
  ('poi_mijas_mirador_compas', 'poi', 'en', 'description', 'A natural balcony with spectacular views over Fuengirola, the coast and, on clear days, as far as Africa. One of the best free viewpoints in the area.'),
  ('poi_mijas_mirador_compas', 'poi', 'en', 'short_tip', 'Clear winter days offer the best visibility'),

  ('poi_mijas_jardines_muralla', 'poi', 'es', 'name', 'Jardines de la Muralla'),
  ('poi_mijas_jardines_muralla', 'poi', 'es', 'description', 'Jardines escalonados construidos sobre los restos de la antigua muralla árabe del pueblo, con miradores y vegetación mediterránea.'),
  ('poi_mijas_jardines_muralla', 'poi', 'es', 'short_tip', 'Un paseo corto pero con mucho encanto, ideal antes o después de comer'),
  ('poi_mijas_jardines_muralla', 'poi', 'en', 'name', 'Muralla Gardens'),
  ('poi_mijas_jardines_muralla', 'poi', 'en', 'description', 'Terraced gardens built over the remains of the village''s old Moorish wall, with viewpoints and Mediterranean vegetation.'),
  ('poi_mijas_jardines_muralla', 'poi', 'en', 'short_tip', 'A short but charming stroll, great before or after lunch'),

  ('poi_mijas_ermita_peña', 'poi', 'es', 'name', 'Ermita de la Virgen de la Peña'),
  ('poi_mijas_ermita_peña', 'poi', 'es', 'description', 'Pequeña ermita excavada directamente en la roca, dedicada a la patrona de Mijas. Una de las joyas más singulares del pueblo.'),
  ('poi_mijas_ermita_peña', 'poi', 'es', 'short_tip', 'Entrada gratuita — visita rápida pero muy especial'),
  ('poi_mijas_ermita_peña', 'poi', 'en', 'name', 'Ermita de la Virgen de la Peña'),
  ('poi_mijas_ermita_peña', 'poi', 'en', 'description', 'A small chapel carved directly into the rock, dedicated to Mijas'' patron saint. One of the village''s most unique gems.'),
  ('poi_mijas_ermita_peña', 'poi', 'en', 'short_tip', 'Free entry — a quick but very special visit'),

  ('poi_mijas_plaza_virgen_peña', 'poi', 'es', 'name', 'Plaza Virgen de la Peña'),
  ('poi_mijas_plaza_virgen_peña', 'poi', 'es', 'description', 'Plaza principal del pueblo, punto de partida de los burro-taxi y con las mejores vistas al valle desde su balcón.'),
  ('poi_mijas_plaza_virgen_peña', 'poi', 'es', 'short_tip', 'Punto de encuentro habitual — fácil de localizar todo desde aquí'),
  ('poi_mijas_plaza_virgen_peña', 'poi', 'en', 'name', 'Plaza Virgen de la Peña'),
  ('poi_mijas_plaza_virgen_peña', 'poi', 'en', 'description', 'The village''s main square, starting point for the donkey-taxis, with the best valley views from its balcony.'),
  ('poi_mijas_plaza_virgen_peña', 'poi', 'en', 'short_tip', 'A natural meeting point — everything is easy to find from here'),

  ('poi_mijas_cac', 'poi', 'es', 'name', 'CAC Mijas (Centro de Arte Contemporáneo)'),
  ('poi_mijas_cac', 'poi', 'es', 'description', 'Colección permanente que incluye obras originales de Picasso, Dalí y Miró, con entrada gratuita. Sorprendente para un pueblo de este tamaño.'),
  ('poi_mijas_cac', 'poi', 'es', 'short_tip', 'Entrada gratuita — imprescindible aunque no seas de museos'),
  ('poi_mijas_cac', 'poi', 'en', 'name', 'CAC Mijas (Contemporary Art Centre)'),
  ('poi_mijas_cac', 'poi', 'en', 'description', 'A permanent collection featuring original works by Picasso, Dalí and Miró, with free admission. Surprising for a village this size.'),
  ('poi_mijas_cac', 'poi', 'en', 'short_tip', 'Free entry — worth it even if museums aren''t usually your thing'),

  ('poi_mijas_cala', 'poi', 'es', 'name', 'Playa de La Cala de Mijas'),
  ('poi_mijas_cala', 'poi', 'es', 'description', 'La playa de Mijas Costa, con un paseo marítimo animado, chiringuitos y ambiente más tranquilo que Fuengirola o Marbella.'),
  ('poi_mijas_cala', 'poi', 'es', 'short_tip', 'Buena base si te alojas cerca de la costa en lugar del pueblo'),
  ('poi_mijas_cala', 'poi', 'en', 'name', 'La Cala de Mijas Beach'),
  ('poi_mijas_cala', 'poi', 'en', 'description', 'Mijas Costa''s beach, with a lively promenade, beach bars and a calmer vibe than Fuengirola or Marbella.'),
  ('poi_mijas_cala', 'poi', 'en', 'short_tip', 'A good base if you''re staying near the coast rather than the village');


-- ════════════════════════════════════════
-- 9. MIJAS — PREMIUM
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_pois (
  id, zone_id, category, poi_type, access_type, latitude, longitude, google_maps_url,
  is_bookable, action_type, action_data, price_display, badge_type, commission_type, commission_value,
  order_index, is_active, is_featured, source
) VALUES
  ('poi_mijas_carromato', 'zone_mijas', 'Cultura', 'museum', 'paid', 36.59600, -4.63750, 'https://www.google.com/maps/search/?api=1&query=36.5960,-4.6375',
    1, 'URL', 'https://www.mijas.es', 'desde 3 €', 'exclusive', 'none', 0, 10, 1, 1, 'manual'),
  ('poi_mijas_plaza_toros', 'zone_mijas', 'Cultura', 'museum', 'paid', 36.59520, -4.63800, 'https://www.google.com/maps/search/?api=1&query=36.5952,-4.6380',
    1, 'URL', 'https://www.mijas.es', 'desde 3,50 €', 'exclusive', 'none', 0, 20, 1, 0, 'manual'),
  ('poi_mijas_burro_taxi', 'zone_mijas', 'Actividades', 'experience', 'paid', 36.59720, -4.63920, 'https://www.google.com/maps/search/?api=1&query=36.5972,-4.6392',
    1, 'IN_APP', 'burro_taxi_mijas', 'desde 10 €', 'exclusive', 'none', 0, 30, 1, 0, 'manual');

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
  ('poi_mijas_carromato', 'poi', 'es', 'name', 'Carromato de Mijas (Museo de Miniaturas)'),
  ('poi_mijas_carromato', 'poi', 'es', 'description', 'Museo de miniaturas inaugurado en 1972 dentro de un carromato de madera, con más de 300 piezas de 50 países recopiladas por "el Profesor Max". Una joya insólita del pueblo.'),
  ('poi_mijas_carromato', 'poi', 'es', 'cta_label', 'Más información'),
  ('poi_mijas_carromato', 'poi', 'en', 'name', 'Carromato de Mijas (Miniature Museum)'),
  ('poi_mijas_carromato', 'poi', 'en', 'description', 'A miniature museum opened in 1972 inside a wooden wagon, with 300+ pieces from 50 countries collected by "Professor Max". A quirky village gem.'),
  ('poi_mijas_carromato', 'poi', 'en', 'cta_label', 'More info'),

  ('poi_mijas_plaza_toros', 'poi', 'es', 'name', 'Plaza de Toros de Mijas'),
  ('poi_mijas_plaza_toros', 'poi', 'es', 'description', 'Una de las pocas plazas de toros ovaladas del mundo, construida en 1900 sobre un antiguo aljibe árabe. Incluye un pequeño museo taurino.'),
  ('poi_mijas_plaza_toros', 'poi', 'es', 'cta_label', 'Más información'),
  ('poi_mijas_plaza_toros', 'poi', 'en', 'name', 'Mijas Bullring'),
  ('poi_mijas_plaza_toros', 'poi', 'en', 'description', 'One of the few oval-shaped bullrings in the world, built in 1900 over an old Moorish water cistern. Includes a small bullfighting museum.'),
  ('poi_mijas_plaza_toros', 'poi', 'en', 'cta_label', 'More info'),

  ('poi_mijas_burro_taxi', 'poi', 'es', 'name', 'Burro-Taxi de Mijas'),
  ('poi_mijas_burro_taxi', 'poi', 'es', 'description', 'Paseo tradicional en burro por las calles del pueblo, símbolo histórico de Mijas desde los años 60. Sale desde la Plaza Virgen de la Peña.'),
  ('poi_mijas_burro_taxi', 'poi', 'es', 'short_tip', 'Algunos visitantes señalan dudas sobre el bienestar animal — valóralo antes de reservar'),
  ('poi_mijas_burro_taxi', 'poi', 'es', 'cta_label', 'Más información'),
  ('poi_mijas_burro_taxi', 'poi', 'en', 'name', 'Mijas Donkey-Taxi'),
  ('poi_mijas_burro_taxi', 'poi', 'en', 'description', 'A traditional donkey ride through the village streets, a historic symbol of Mijas since the 1960s. Departs from Plaza Virgen de la Peña.'),
  ('poi_mijas_burro_taxi', 'poi', 'en', 'short_tip', 'Some visitors have raised animal-welfare concerns — worth considering before booking'),
  ('poi_mijas_burro_taxi', 'poi', 'en', 'cta_label', 'More info');


-- ════════════════════════════════════════
-- 10. MARBELLA — FREE
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_pois (id, zone_id, category, poi_type, access_type, latitude, longitude, google_maps_url, order_index, is_active, source) VALUES
  ('poi_marbella_naranjos',      'zone_marbella', 'Cultura',    'sight', 'free', 36.51030, -4.88620, 'https://www.google.com/maps/search/?api=1&query=36.5103,-4.8862', 10, 1, 'manual'),
  ('poi_marbella_murallas',      'zone_marbella', 'Cultura',    'sight', 'free', 36.51100, -4.88700, 'https://www.google.com/maps/search/?api=1&query=36.5110,-4.8870', 20, 1, 'manual'),
  ('poi_marbella_encarnacion',   'zone_marbella', 'Cultura',    'sight', 'free', 36.50980, -4.88550, 'https://www.google.com/maps/search/?api=1&query=36.5098,-4.8855', 30, 1, 'manual'),
  ('poi_marbella_avenida_mar',   'zone_marbella', 'Cultura',    'sight', 'free', 36.50870, -4.88400, 'https://www.google.com/maps/search/?api=1&query=36.5087,-4.8840', 40, 1, 'manual'),
  ('poi_marbella_villa_romana',  'zone_marbella', 'Cultura',    'sight', 'free', 36.49900, -4.93300, 'https://www.google.com/maps/search/?api=1&query=36.4990,-4.9330', 50, 1, 'manual'),
  ('poi_marbella_basilica_vega', 'zone_marbella', 'Cultura',    'sight', 'free', 36.48700, -4.95500, 'https://www.google.com/maps/search/?api=1&query=36.4870,-4.9550', 60, 1, 'manual'),
  ('poi_marbella_termas',        'zone_marbella', 'Cultura',    'sight', 'free', 36.48690, -4.95580, 'https://www.google.com/maps/search/?api=1&query=36.4869,-4.9558', 70, 1, 'manual'),
  ('poi_marbella_puerto_banus',  'zone_marbella', 'Compras',    'sight', 'free', 36.48480, -4.95200, 'https://www.google.com/maps/search/?api=1&query=36.4848,-4.9520', 80, 1, 'manual'),
  ('poi_marbella_fontanilla',    'zone_marbella', 'Playas',     'beach', 'free', 36.51150, -4.89450, 'https://www.google.com/maps/search/?api=1&query=36.5115,-4.8945', 90, 1, 'manual'),
  ('poi_marbella_museo_ralli',   'zone_marbella', 'Cultura',    'museum','free', 36.49850, -4.93250, 'https://www.google.com/maps/search/?api=1&query=36.4985,-4.9325', 100, 1, 'manual');

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
  ('poi_marbella_naranjos', 'poi', 'es', 'name', 'Plaza de los Naranjos'),
  ('poi_marbella_naranjos', 'poi', 'es', 'description', 'El corazón del casco antiguo desde 1485, con naranjos, el Ayuntamiento renacentista y terrazas en un entorno impecablemente cuidado.'),
  ('poi_marbella_naranjos', 'poi', 'es', 'short_tip', 'Punto de partida ideal para perderse por el laberinto de calles blancas'),
  ('poi_marbella_naranjos', 'poi', 'en', 'name', 'Plaza de los Naranjos'),
  ('poi_marbella_naranjos', 'poi', 'en', 'description', 'The heart of the old town since 1485, with orange trees, the Renaissance town hall and terraces in an immaculately kept setting.'),
  ('poi_marbella_naranjos', 'poi', 'en', 'short_tip', 'The perfect starting point to get lost in the maze of white streets'),

  ('poi_marbella_murallas', 'poi', 'es', 'name', 'Murallas del Castillo Árabe'),
  ('poi_marbella_murallas', 'poi', 'es', 'description', 'Restos de la fortificación árabe del siglo X que protegía la antigua Marbella, visibles todavía entre las calles del casco histórico.'),
  ('poi_marbella_murallas', 'poi', 'es', 'short_tip', 'Fácil de combinar con un paseo por la Plaza de los Naranjos'),
  ('poi_marbella_murallas', 'poi', 'en', 'name', 'Arab Castle Walls'),
  ('poi_marbella_murallas', 'poi', 'en', 'description', 'Remains of the 10th-century Moorish fortification that protected old Marbella, still visible among the streets of the historic centre.'),
  ('poi_marbella_murallas', 'poi', 'en', 'short_tip', 'Easy to combine with a walk through Plaza de los Naranjos'),

  ('poi_marbella_encarnacion', 'poi', 'es', 'name', 'Iglesia de la Encarnación'),
  ('poi_marbella_encarnacion', 'poi', 'es', 'description', 'Iglesia principal del casco antiguo, construida entre los siglos XVI y XVIII, con una fachada barroca y un campanario que domina el skyline del centro histórico.'),
  ('poi_marbella_encarnacion', 'poi', 'es', 'short_tip', 'Entrada gratuita fuera de horario de misas'),
  ('poi_marbella_encarnacion', 'poi', 'en', 'name', 'Church of the Encarnación'),
  ('poi_marbella_encarnacion', 'poi', 'en', 'description', 'The old town''s main church, built between the 16th and 18th centuries, with a Baroque facade and a bell tower that dominates the historic skyline.'),
  ('poi_marbella_encarnacion', 'poi', 'en', 'short_tip', 'Free entry outside of mass times'),

  ('poi_marbella_avenida_mar', 'poi', 'es', 'name', 'Avenida del Mar'),
  ('poi_marbella_avenida_mar', 'poi', 'es', 'description', 'Paseo peatonal que conecta el casco antiguo con la playa, con 10 esculturas originales de Salvador Dalí expuestas al aire libre — una colección única en la costa.'),
  ('poi_marbella_avenida_mar', 'poi', 'es', 'short_tip', 'Busca "El Hombre Elefante" y "Nobleza del Tiempo", las más fotografiadas'),
  ('poi_marbella_avenida_mar', 'poi', 'en', 'name', 'Avenida del Mar'),
  ('poi_marbella_avenida_mar', 'poi', 'en', 'description', 'A pedestrian avenue linking the old town to the beach, lined with 10 original Salvador Dalí sculptures on open-air display — a one-of-a-kind collection on the coast.'),
  ('poi_marbella_avenida_mar', 'poi', 'en', 'short_tip', 'Look out for "The Elephant Man" and "Nobility of Time", the most photographed pieces'),

  ('poi_marbella_villa_romana', 'poi', 'es', 'name', 'Villa Romana de Río Verde'),
  ('poi_marbella_villa_romana', 'poi', 'es', 'description', 'Yacimiento arqueológico de una villa romana del siglo I-II d.C. con mosaicos originales muy bien conservados. Una joya oculta que pocos turistas visitan.'),
  ('poi_marbella_villa_romana', 'poi', 'es', 'short_tip', 'Consulta el horario de apertura antes de ir — es reducido'),
  ('poi_marbella_villa_romana', 'poi', 'en', 'name', 'Río Verde Roman Villa'),
  ('poi_marbella_villa_romana', 'poi', 'en', 'description', 'An archaeological site of a 1st–2nd century AD Roman villa with remarkably well-preserved original mosaics. A hidden gem few tourists ever visit.'),
  ('poi_marbella_villa_romana', 'poi', 'en', 'short_tip', 'Check opening hours before going — they''re limited'),

  ('poi_marbella_basilica_vega', 'poi', 'es', 'name', 'Basílica Paleocristiana de Vega del Mar'),
  ('poi_marbella_basilica_vega', 'poi', 'es', 'description', 'Restos de una basílica visigoda de los siglos IV-VI, con una insólita doble cabecera. Se encuentra junto a la desembocadura del río Guadalmina, en San Pedro de Alcántara.'),
  ('poi_marbella_basilica_vega', 'poi', 'es', 'short_tip', 'Combínala con las Termas Romanas de Las Bóvedas, están al lado'),
  ('poi_marbella_basilica_vega', 'poi', 'en', 'name', 'Vega del Mar Paleo-Christian Basilica'),
  ('poi_marbella_basilica_vega', 'poi', 'en', 'description', 'Remains of a 4th–6th-century Visigothic basilica with an unusual double apse, next to the mouth of the Guadalmina river in San Pedro de Alcántara.'),
  ('poi_marbella_basilica_vega', 'poi', 'en', 'short_tip', 'Combine it with the Las Bóvedas Roman Baths right next door'),

  ('poi_marbella_termas', 'poi', 'es', 'name', 'Termas Romanas de Las Bóvedas'),
  ('poi_marbella_termas', 'poi', 'es', 'description', 'Baños termales romanos del siglo III-IV, uno de los mejor conservados de Andalucía, con salas de baño frío, templado y caliente aún reconocibles.'),
  ('poi_marbella_termas', 'poi', 'es', 'short_tip', 'Se visitan gratis pero con horario limitado — comprueba antes'),
  ('poi_marbella_termas', 'poi', 'en', 'name', 'Las Bóvedas Roman Baths'),
  ('poi_marbella_termas', 'poi', 'en', 'description', '3rd–4th-century Roman thermal baths, among the best preserved in Andalusia, with the cold, warm and hot rooms still recognisable.'),
  ('poi_marbella_termas', 'poi', 'en', 'short_tip', 'Free to visit but with limited opening hours — check beforehand'),

  ('poi_marbella_puerto_banus', 'poi', 'es', 'name', 'Puerto Banús'),
  ('poi_marbella_puerto_banus', 'poi', 'es', 'description', 'El puerto deportivo de lujo más famoso de España, con yates, coches deportivos y boutiques de alta gama. Un espectáculo gratuito de gente y estilo de vida.'),
  ('poi_marbella_puerto_banus', 'poi', 'es', 'short_tip', 'Ve al atardecer para ver los yates iluminados'),
  ('poi_marbella_puerto_banus', 'poi', 'en', 'name', 'Puerto Banús'),
  ('poi_marbella_puerto_banus', 'poi', 'en', 'description', 'Spain''s most famous luxury marina, with yachts, sports cars and high-end boutiques. A free show of people-watching and lifestyle.'),
  ('poi_marbella_puerto_banus', 'poi', 'en', 'short_tip', 'Go at sunset to see the yachts lit up'),

  ('poi_marbella_fontanilla', 'poi', 'es', 'name', 'Playa de la Fontanilla'),
  ('poi_marbella_fontanilla', 'poi', 'es', 'description', 'Playa urbana junto al casco antiguo, con paseo marítimo, chiringuitos y el Cable Ski Marbella cerca. Fácil de combinar con la visita al centro.'),
  ('poi_marbella_fontanilla', 'poi', 'es', 'short_tip', 'A 10 minutos andando de la Plaza de los Naranjos'),
  ('poi_marbella_fontanilla', 'poi', 'en', 'name', 'La Fontanilla Beach'),
  ('poi_marbella_fontanilla', 'poi', 'en', 'description', 'An urban beach next to the old town, with a promenade, beach bars and Cable Ski Marbella nearby. Easy to combine with visiting the centre.'),
  ('poi_marbella_fontanilla', 'poi', 'en', 'short_tip', 'A 10-minute walk from Plaza de los Naranjos'),

  ('poi_marbella_museo_ralli', 'poi', 'es', 'name', 'Museo Ralli Marbella'),
  ('poi_marbella_museo_ralli', 'poi', 'es', 'description', 'Museo de arte latinoamericano y europeo contemporáneo (Dalí, Botero, entre otros) con entrada completamente gratuita — poco frecuente para una colección de este nivel.'),
  ('poi_marbella_museo_ralli', 'poi', 'es', 'short_tip', 'Cerrado los lunes y en verano (jul-ago); comprueba antes de ir'),
  ('poi_marbella_museo_ralli', 'poi', 'en', 'name', 'Ralli Museum Marbella'),
  ('poi_marbella_museo_ralli', 'poi', 'en', 'description', 'A museum of Latin American and contemporary European art (Dalí, Botero, among others) with completely free admission — unusual for a collection of this caliber.'),
  ('poi_marbella_museo_ralli', 'poi', 'en', 'short_tip', 'Closed Mondays and in summer (Jul-Aug); check before going');


-- ════════════════════════════════════════
-- 11. MARBELLA — PREMIUM
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_pois (
  id, zone_id, category, poi_type, access_type, latitude, longitude, google_maps_url,
  is_bookable, action_type, action_data, price_display, badge_type, commission_type, commission_value,
  order_index, is_active, is_featured, source
) VALUES
  ('poi_marbella_museo_grabado', 'zone_marbella', 'Cultura', 'museum', 'paid', 36.51050, -4.88650, 'https://www.google.com/maps/search/?api=1&query=36.5105,-4.8865',
    1, 'URL', 'https://www.museodelgrabado.com', 'desde 2,50 €', 'exclusive', 'none', 0, 10, 1, 0, 'manual'),
  ('poi_marbella_museo_bonsai', 'zone_marbella', 'Naturaleza', 'museum', 'paid', 36.50600, -4.87700, 'https://www.google.com/maps/search/?api=1&query=36.5060,-4.8770',
    1, 'URL', 'https://www.marbella.es', 'desde 4 €', 'exclusive', 'none', 0, 20, 1, 1, 'manual');

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
  ('poi_marbella_museo_grabado', 'poi', 'es', 'name', 'Museo del Grabado Español Contemporáneo'),
  ('poi_marbella_museo_grabado', 'poi', 'es', 'description', 'Único museo de España dedicado en exclusiva al grabado, con obras de Picasso, Miró y Dalí, en un edificio del siglo XVI del casco antiguo.'),
  ('poi_marbella_museo_grabado', 'poi', 'es', 'cta_label', 'Más información'),
  ('poi_marbella_museo_grabado', 'poi', 'en', 'name', 'Contemporary Spanish Engraving Museum'),
  ('poi_marbella_museo_grabado', 'poi', 'en', 'description', 'Spain''s only museum devoted entirely to engraving, with works by Picasso, Miró and Dalí, housed in a 16th-century building in the old town.'),
  ('poi_marbella_museo_grabado', 'poi', 'en', 'cta_label', 'More info'),

  ('poi_marbella_museo_bonsai', 'poi', 'es', 'name', 'Museo del Bonsái'),
  ('poi_marbella_museo_bonsai', 'poi', 'es', 'description', 'Una de las colecciones de bonsáis más importantes de Europa, con ejemplares centenarios en el Parque de la Represa. Experiencia única y muy poco conocida.'),
  ('poi_marbella_museo_bonsai', 'poi', 'es', 'cta_label', 'Más información'),
  ('poi_marbella_museo_bonsai', 'poi', 'en', 'name', 'Bonsai Museum'),
  ('poi_marbella_museo_bonsai', 'poi', 'en', 'description', 'One of the most important bonsai collections in Europe, with centuries-old specimens in Parque de la Represa. A unique and little-known experience.'),
  ('poi_marbella_museo_bonsai', 'poi', 'en', 'cta_label', 'More info');
