-- =====================================================
-- GUIDEBOOK SEED DATA — Zona piloto: Nerja
-- =====================================================
-- Run AFTER 0050_guidebook_ecosystem.sql
-- Creates: 1 zone, 1 agency, 2 apartments, 3 POIs, 3 experiences
-- =====================================================

-- ZONE: Nerja
INSERT OR IGNORE INTO guide_zones (id, name, slug, country, region, latitude, longitude, cover_image_url)
VALUES ('zone_nerja', 'Nerja', 'nerja', 'ES', 'Costa del Sol', 36.7440, -3.8790, NULL);

-- AGENCY: Test Agency
INSERT OR IGNORE INTO guide_agencies (id, name, slug, contact_email, contact_phone, logo_url)
VALUES ('agency_test', 'Renters Costa Sol', 'renters-costa-sol', 'info@renterscostasol.com', '+34612345678', NULL);

-- APARTMENTS
INSERT OR IGNORE INTO guide_apartments (id, agency_id, zone_id, name, slug, address)
VALUES 
  ('apt_nerja_1', 'agency_test', 'zone_nerja', 'Piso Playa Burriana 2B', 'piso-playa-burriana-2b', 'Calle Carabeo 15, Nerja'),
  ('apt_nerja_2', 'agency_test', 'zone_nerja', 'Ático Balcón de Europa', 'atico-balcon-europa', 'Plaza Balcón de Europa 3, Nerja');

-- APARTMENT INFO for apt_nerja_1
INSERT OR IGNORE INTO guide_apartment_info (id, apartment_id, info_key, icon_name, order_index)
VALUES 
  ('info_nerja1_wifi', 'apt_nerja_1', 'wifi', 'wifi', 0),
  ('info_nerja1_trash', 'apt_nerja_1', 'trash', 'delete', 1),
  ('info_nerja1_rules', 'apt_nerja_1', 'rules', 'gavel', 2),
  ('info_nerja1_checkout', 'apt_nerja_1', 'checkout', 'schedule', 3),
  ('info_nerja1_parking', 'apt_nerja_1', 'parking', 'local_parking', 4);

-- APARTMENT INFO for apt_nerja_2
INSERT OR IGNORE INTO guide_apartment_info (id, apartment_id, info_key, icon_name, order_index)
VALUES 
  ('info_nerja2_wifi', 'apt_nerja_2', 'wifi', 'wifi', 0),
  ('info_nerja2_rules', 'apt_nerja_2', 'rules', 'gavel', 1),
  ('info_nerja2_checkout', 'apt_nerja_2', 'checkout', 'schedule', 2);

-- TRANSLATIONS for apartment info (ES + EN)
INSERT OR IGNORE INTO translations (entity_id, entity_type, field, language_code, value)
VALUES 
  -- WiFi apt 1
  ('info_nerja1_wifi', 'apartment_info', 'title', 'es', 'WiFi'),
  ('info_nerja1_wifi', 'apartment_info', 'content', 'es', 'Red: PisoPlaya2B / Contraseña: Burriana2024'),
  ('info_nerja1_wifi', 'apartment_info', 'title', 'en', 'WiFi'),
  ('info_nerja1_wifi', 'apartment_info', 'content', 'en', 'Network: PisoPlaya2B / Password: Burriana2024'),
  -- Trash apt 1
  ('info_nerja1_trash', 'apartment_info', 'title', 'es', 'Basura'),
  ('info_nerja1_trash', 'apartment_info', 'content', 'es', 'Contenedores en la esquina de la calle. Orgánico (marrón), envases (amarillo), papel (azul), vidrio (verde). Por favor sacar la basura antes de las 22:00.'),
  ('info_nerja1_trash', 'apartment_info', 'title', 'en', 'Rubbish'),
  ('info_nerja1_trash', 'apartment_info', 'content', 'en', 'Bins at the street corner. Organic (brown), packaging (yellow), paper (blue), glass (green). Please take the rubbish out before 10pm.'),
  -- Rules apt 1
  ('info_nerja1_rules', 'apartment_info', 'title', 'es', 'Normas'),
  ('info_nerja1_rules', 'apartment_info', 'content', 'es', 'No fumar dentro del apartamento. Silencio entre 23:00 y 8:00. No se permiten fiestas. Máximo 4 personas.'),
  ('info_nerja1_rules', 'apartment_info', 'title', 'en', 'House Rules'),
  ('info_nerja1_rules', 'apartment_info', 'content', 'en', 'No smoking inside the apartment. Quiet hours 11pm-8am. No parties allowed. Maximum 4 guests.'),
  -- Checkout apt 1
  ('info_nerja1_checkout', 'apartment_info', 'title', 'es', 'Check-out'),
  ('info_nerja1_checkout', 'apartment_info', 'content', 'es', 'Check-out antes de las 11:00. Dejar las llaves en el buzón. Dejar las toallas usadas en el baño.'),
  ('info_nerja1_checkout', 'apartment_info', 'title', 'en', 'Check-out'),
  ('info_nerja1_checkout', 'apartment_info', 'content', 'en', 'Check-out before 11am. Leave keys in the mailbox. Leave used towels in the bathroom.'),
  -- Parking apt 1
  ('info_nerja1_parking', 'apartment_info', 'title', 'es', 'Parking'),
  ('info_nerja1_parking', 'apartment_info', 'content', 'es', 'Plaza de garaje incluida: Sótano -1, plaza 23. Acceso con mando gris.'),
  ('info_nerja1_parking', 'apartment_info', 'title', 'en', 'Parking'),
  ('info_nerja1_parking', 'apartment_info', 'content', 'en', 'Garage space included: Basement -1, spot 23. Access with grey remote.'),
  -- WiFi apt 2
  ('info_nerja2_wifi', 'apartment_info', 'title', 'es', 'WiFi'),
  ('info_nerja2_wifi', 'apartment_info', 'content', 'es', 'Red: AticoBalcon / Contraseña: Europa2024'),
  ('info_nerja2_wifi', 'apartment_info', 'title', 'en', 'WiFi'),
  ('info_nerja2_wifi', 'apartment_info', 'content', 'en', 'Network: AticoBalcon / Password: Europa2024'),
  -- Rules apt 2
  ('info_nerja2_rules', 'apartment_info', 'title', 'es', 'Normas de la casa'),
  ('info_nerja2_rules', 'apartment_info', 'content', 'es', 'No fumar. Silencio entre 22:00 y 9:00. Cuidar el mobiliario de la terraza.'),
  ('info_nerja2_rules', 'apartment_info', 'title', 'en', 'House Rules'),
  ('info_nerja2_rules', 'apartment_info', 'content', 'en', 'No smoking. Quiet hours 10pm-9am. Please take care of terrace furniture.'),
  -- Checkout apt 2
  ('info_nerja2_checkout', 'apartment_info', 'title', 'es', 'Check-out'),
  ('info_nerja2_checkout', 'apartment_info', 'content', 'es', 'Check-out antes de las 10:00. Dejar llaves dentro y cerrar con un portazo.'),
  ('info_nerja2_checkout', 'apartment_info', 'title', 'en', 'Check-out'),
  ('info_nerja2_checkout', 'apartment_info', 'content', 'en', 'Check-out before 10am. Leave keys inside and slam the door shut.');

-- ZONE TRANSLATIONS
INSERT OR IGNORE INTO translations (entity_id, entity_type, field, language_code, value)
VALUES 
  ('zone_nerja', 'zone', 'name', 'es', 'Nerja'),
  ('zone_nerja', 'zone', 'name', 'en', 'Nerja'),
  ('zone_nerja', 'zone', 'description', 'es', 'La joya de la Costa del Sol oriental. Playas cristalinas, cuevas milenarias y el icónico Balcón de Europa.'),
  ('zone_nerja', 'zone', 'description', 'en', 'The jewel of the eastern Costa del Sol. Crystal-clear beaches, ancient caves, and the iconic Balcón de Europa.');

-- POIs
INSERT OR IGNORE INTO guide_pois (id, zone_id, category, latitude, longitude, google_maps_url, order_index)
VALUES 
  ('poi_balcon', 'zone_nerja', 'viewpoint', 36.7447, -3.8752, 'https://maps.google.com/?q=36.7447,-3.8752', 0),
  ('poi_cuevas', 'zone_nerja', 'monument', 36.7620, -3.8445, 'https://maps.google.com/?q=36.7620,-3.8445', 1),
  ('poi_burriana', 'zone_nerja', 'beach', 36.7388, -3.8670, 'https://maps.google.com/?q=36.7388,-3.8670', 2);

-- POI TRANSLATIONS
INSERT OR IGNORE INTO translations (entity_id, entity_type, field, language_code, value)
VALUES 
  ('poi_balcon', 'poi', 'name', 'es', 'Balcón de Europa'),
  ('poi_balcon', 'poi', 'name', 'en', 'Balcony of Europe'),
  ('poi_balcon', 'poi', 'description', 'es', 'El mirador más famoso de la Costa del Sol. Vistas panorámicas al Mediterráneo y las montañas. Imprescindible al atardecer.'),
  ('poi_balcon', 'poi', 'description', 'en', 'The most famous viewpoint on the Costa del Sol. Panoramic views of the Mediterranean and mountains. A must at sunset.'),
  ('poi_cuevas', 'poi', 'name', 'es', 'Cuevas de Nerja'),
  ('poi_cuevas', 'poi', 'name', 'en', 'Caves of Nerja'),
  ('poi_cuevas', 'poi', 'description', 'es', 'Cuevas prehistóricas con estalactitas y estalagmitas impresionantes. La columna más grande del mundo. Visita guiada de 45 min.'),
  ('poi_cuevas', 'poi', 'description', 'en', 'Prehistoric caves with stunning stalactites and stalagmites. Home to the world''s largest column. 45-min guided tour.'),
  ('poi_burriana', 'poi', 'name', 'es', 'Playa Burriana'),
  ('poi_burriana', 'poi', 'name', 'en', 'Burriana Beach'),
  ('poi_burriana', 'poi', 'description', 'es', 'La playa más popular de Nerja. Arena fina, chiringuitos y deportes acuáticos. Perfecta para familias.'),
  ('poi_burriana', 'poi', 'description', 'en', 'Nerja''s most popular beach. Fine sand, beach bars, and water sports. Perfect for families.');

-- EXPERIENCES
INSERT OR IGNORE INTO guide_experiences (id, zone_id, category, action_type, action_data, action_prefilled_message, commission_type, commission_value, price_display, order_index, is_featured)
VALUES 
  ('exp_kayak', 'zone_nerja', 'water_sport', 'WHATSAPP', '+34600111222', 'Hola, estoy alojado en {{apartment_name}} y me interesa la excursión en kayak por las cuevas de Maro. ¿Tienen disponibilidad?', 'percentage', 15, 'Desde 35€/persona', 0, TRUE),
  ('exp_buggy', 'zone_nerja', 'adventure', 'URL', 'https://example-buggy-nerja.com/book?ref=visualtastes', NULL, 'fixed', 5, '85€/buggy', 1, FALSE),
  ('exp_cooking', 'zone_nerja', 'class', 'WHATSAPP', '+34600333444', 'Hola, me gustaría reservar una clase de cocina española. Estoy en {{apartment_name}}.', 'percentage', 10, '60€/persona', 2, FALSE);

-- EXPERIENCE TRANSLATIONS
INSERT OR IGNORE INTO translations (entity_id, entity_type, field, language_code, value)
VALUES 
  ('exp_kayak', 'experience', 'name', 'es', 'Kayak a las Cuevas de Maro'),
  ('exp_kayak', 'experience', 'name', 'en', 'Kayak to Maro Caves'),
  ('exp_kayak', 'experience', 'description', 'es', 'Explora las cuevas marinas y calas escondidas en kayak. Incluye snorkel y guía. Duración 3h.'),
  ('exp_kayak', 'experience', 'description', 'en', 'Explore sea caves and hidden coves by kayak. Includes snorkeling and guide. Duration 3h.'),
  ('exp_kayak', 'experience', 'cta_label', 'es', 'Reservar por WhatsApp'),
  ('exp_kayak', 'experience', 'cta_label', 'en', 'Book via WhatsApp'),
  ('exp_buggy', 'experience', 'name', 'es', 'Ruta en Buggy por la Sierra'),
  ('exp_buggy', 'experience', 'name', 'en', 'Buggy Tour through the Mountains'),
  ('exp_buggy', 'experience', 'description', 'es', 'Aventura off-road por los caminos de la sierra de Nerja. Vistas espectaculares. Duración 2h.'),
  ('exp_buggy', 'experience', 'description', 'en', 'Off-road adventure through Nerja''s mountain trails. Spectacular views. Duration 2h.'),
  ('exp_buggy', 'experience', 'cta_label', 'es', 'Reservar online'),
  ('exp_buggy', 'experience', 'cta_label', 'en', 'Book online'),
  ('exp_cooking', 'experience', 'name', 'es', 'Clase de Cocina Española'),
  ('exp_cooking', 'experience', 'name', 'en', 'Spanish Cooking Class'),
  ('exp_cooking', 'experience', 'description', 'es', 'Aprende a preparar paella, gazpacho y tortilla con un chef local. Incluye comida y bebida.'),
  ('exp_cooking', 'experience', 'description', 'en', 'Learn to cook paella, gazpacho and tortilla with a local chef. Includes meal and drinks.'),
  ('exp_cooking', 'experience', 'cta_label', 'es', 'Reservar por WhatsApp'),
  ('exp_cooking', 'experience', 'cta_label', 'en', 'Book via WhatsApp');
