-- ═══════════════════════════════════════════════════════════════════
-- 0055_demo_benalmadena_apartment.sql
-- Demo completa para presentación a cliente
-- Apartamento: "Acogedor apartamento cerca del Parque de la Paloma"
-- Ubicación: Arroyo de la Miel, Benalmádena, Málaga (Airbnb #17913808)
-- ═══════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════
-- 1. ZONA — Benalmádena, Costa del Sol
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_zones (id, name, slug, country, region, latitude, longitude, cover_image_url, is_active)
VALUES (
  'zone_benalmadena',
  'Benalmádena',
  'benalmadena',
  'ES',
  'Costa del Sol',
  36.5995,
  -4.5165,
  NULL,
  1
);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
VALUES
  ('zone_benalmadena', 'zone', 'es', 'name',        'Benalmádena'),
  ('zone_benalmadena', 'zone', 'es', 'description', 'Joya de la Costa del Sol, Benalmádena combina playas de bandera azul, el animado Puerto Marina, monumentos únicos y un casco antiguo con encanto. A 20 minutos de Málaga capital por metro.'),
  ('zone_benalmadena', 'zone', 'en', 'name',        'Benalmádena'),
  ('zone_benalmadena', 'zone', 'en', 'description', 'A jewel of the Costa del Sol, Benalmádena combines blue flag beaches, the vibrant Puerto Marina, unique monuments and a charming old town. Just 20 minutes from Málaga city centre by metro.'),
  ('zone_benalmadena', 'zone', 'fr', 'name',        'Benalmádena'),
  ('zone_benalmadena', 'zone', 'fr', 'description', 'Joyau de la Costa del Sol, Benalmádena allie plages au drapeau bleu, le vivant Puerto Marina, des monuments uniques et un vieux bourg plein de charme. À 20 minutes de Málaga en métro.'),
  ('zone_benalmadena', 'zone', 'de', 'name',        'Benalmádena'),
  ('zone_benalmadena', 'zone', 'de', 'description', 'Benalmádena ist ein Juwel der Costa del Sol: Blaue-Flagge-Strände, das lebhafte Puerto Marina, einzigartige Denkmäler und eine charmante Altstadt. Nur 20 Minuten mit der Metro von Málaga.'),
  ('zone_benalmadena', 'zone', 'it', 'name',        'Benalmádena'),
  ('zone_benalmadena', 'zone', 'it', 'description', 'Gioiello della Costa del Sol, Benalmádena unisce spiagge bandiera blu, il vivace Puerto Marina, monumenti unici e un centro storico affascinante. A soli 20 minuti da Málaga in metro.');

-- ════════════════════════════════════════
-- 2. AGENCIA — Costa del Sol Apartments
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_agencies (id, name, slug, contact_email, contact_phone, primary_color, secondary_color, accent_color, is_active)
VALUES (
  'agency_cds_apts',
  'Costa del Sol Apartments',
  'costa-del-sol-apartments',
  'hola@cdsapartments.com',
  '+34 651 234 567',
  '#1E6B5C',
  '#F7D08A',
  '#E8734A',
  1
);

-- ════════════════════════════════════════
-- 3. APARTAMENTO
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_apartments (id, agency_id, zone_id, name, slug, address, latitude, longitude, cover_image_url, is_active)
VALUES (
  'apt_demo_paloma',
  'agency_cds_apts',
  'zone_benalmadena',
  'Acogedor apartamento cerca del Parque de la Paloma',
  'paloma-park-benalmadena',
  'Arroyo de la Miel, 29631 Benalmádena, Málaga, España',
  36.5960,
  -4.5223,
  NULL,
  1
);

-- ════════════════════════════════════════
-- 4. INFORMACIÓN DEL APARTAMENTO
-- ════════════════════════════════════════

-- 4.1 WiFi (credenciales inventadas — actualizar con las reales)
INSERT OR IGNORE INTO guide_apartment_info (id, apartment_id, info_key, icon_name, order_index)
VALUES ('info_apt_demo_paloma_wifi', 'apt_demo_paloma', 'wifi', 'wifi', 10);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
VALUES
  ('info_apt_demo_paloma_wifi', 'apartment_info', 'es', 'title',   'WiFi'),
  ('info_apt_demo_paloma_wifi', 'apartment_info', 'es', 'content', '**Red:** PalomaPark_5G\n**Contraseña:** benalmadena2024#'),
  ('info_apt_demo_paloma_wifi', 'apartment_info', 'en', 'title',   'WiFi'),
  ('info_apt_demo_paloma_wifi', 'apartment_info', 'en', 'content', '**Network:** PalomaPark_5G\n**Password:** benalmadena2024#'),
  ('info_apt_demo_paloma_wifi', 'apartment_info', 'fr', 'title',   'WiFi'),
  ('info_apt_demo_paloma_wifi', 'apartment_info', 'fr', 'content', '**Réseau:** PalomaPark_5G\n**Mot de passe:** benalmadena2024#'),
  ('info_apt_demo_paloma_wifi', 'apartment_info', 'de', 'title',   'WLAN'),
  ('info_apt_demo_paloma_wifi', 'apartment_info', 'de', 'content', '**Netzwerk:** PalomaPark_5G\n**Passwort:** benalmadena2024#');

-- 4.2 Check-in (código de caja inventado — actualizar con el real)
INSERT OR IGNORE INTO guide_apartment_info (id, apartment_id, info_key, icon_name, order_index)
VALUES ('info_apt_demo_paloma_checkin', 'apt_demo_paloma', 'checkin', 'key', 20);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
VALUES
  ('info_apt_demo_paloma_checkin', 'apartment_info', 'es', 'title',   'Check-in'),
  ('info_apt_demo_paloma_checkin', 'apartment_info', 'es', 'content', 'Llegada a partir de las **15:00 h**.\n\nLa caja de llaves está en la entrada del edificio (columna derecha):\nCódigo: **3847#**\n\n¿Problemas? Llama o escribe por WhatsApp al **+34 651 234 567**.'),
  ('info_apt_demo_paloma_checkin', 'apartment_info', 'en', 'title',   'Check-in'),
  ('info_apt_demo_paloma_checkin', 'apartment_info', 'en', 'content', 'Arrival from **3:00 PM**.\n\nThe key lockbox is at the building entrance (right column):\nCode: **3847#**\n\nProblems? Call or WhatsApp **+34 651 234 567**.'),
  ('info_apt_demo_paloma_checkin', 'apartment_info', 'fr', 'title',   'Check-in'),
  ('info_apt_demo_paloma_checkin', 'apartment_info', 'fr', 'content', 'Arrivée à partir de **15h00**.\n\nLa boîte à clés se trouve à l''entrée de l''immeuble (colonne de droite):\nCode: **3847#**\n\nProblèmes? Appelez ou WhatsApp **+34 651 234 567**.'),
  ('info_apt_demo_paloma_checkin', 'apartment_info', 'de', 'title',   'Check-in'),
  ('info_apt_demo_paloma_checkin', 'apartment_info', 'de', 'content', 'Anreise ab **15:00 Uhr**.\n\nDer Schlüsselkasten befindet sich am Gebäudeeingang (rechte Säule):\nCode: **3847#**\n\nProbleme? Anrufen oder WhatsApp **+34 651 234 567**.');

-- 4.3 Check-out
INSERT OR IGNORE INTO guide_apartment_info (id, apartment_id, info_key, icon_name, order_index)
VALUES ('info_apt_demo_paloma_checkout', 'apt_demo_paloma', 'checkout', 'logout', 30);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
VALUES
  ('info_apt_demo_paloma_checkout', 'apartment_info', 'es', 'title',   'Check-out'),
  ('info_apt_demo_paloma_checkout', 'apartment_info', 'es', 'content', 'Salida antes de las **11:00 h**.\n\n✓ Deja las llaves en la caja de la entrada\n✓ Cierra todas las ventanas y persianas\n✓ Apaga luces y aire acondicionado\n✓ Deja las toallas en el baño\n\nGracias por tu estancia, ¡vuelve pronto! 😊'),
  ('info_apt_demo_paloma_checkout', 'apartment_info', 'en', 'title',   'Check-out'),
  ('info_apt_demo_paloma_checkout', 'apartment_info', 'en', 'content', 'Departure before **11:00 AM**.\n\n✓ Leave keys in the entrance lockbox\n✓ Close all windows and blinds\n✓ Turn off lights and air conditioning\n✓ Leave towels in the bathroom\n\nThanks for staying, see you soon! 😊'),
  ('info_apt_demo_paloma_checkout', 'apartment_info', 'fr', 'title',   'Check-out'),
  ('info_apt_demo_paloma_checkout', 'apartment_info', 'fr', 'content', 'Départ avant **11h00**.\n\n✓ Laissez les clés dans la boîte à l''entrée\n✓ Fermez toutes les fenêtres et volets\n✓ Éteignez les lumières et la climatisation\n✓ Laissez les serviettes dans la salle de bain'),
  ('info_apt_demo_paloma_checkout', 'apartment_info', 'de', 'title',   'Check-out'),
  ('info_apt_demo_paloma_checkout', 'apartment_info', 'de', 'content', 'Abreise vor **11:00 Uhr**.\n\n✓ Schlüssel in den Eingangskasten legen\n✓ Alle Fenster und Rollläden schließen\n✓ Licht und Klimaanlage ausschalten\n✓ Handtücher im Bad lassen');

-- 4.4 Normas de la casa
INSERT OR IGNORE INTO guide_apartment_info (id, apartment_id, info_key, icon_name, order_index)
VALUES ('info_apt_demo_paloma_rules', 'apt_demo_paloma', 'rules', 'rule', 40);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
VALUES
  ('info_apt_demo_paloma_rules', 'apartment_info', 'es', 'title',   'Normas de la casa'),
  ('info_apt_demo_paloma_rules', 'apartment_info', 'es', 'content', '🚭 No fumar en el interior\n🐾 No se admiten mascotas\n🔇 Silencio de 22:00 a 9:00 h (respeto a los vecinos)\n👥 Máximo 4 huéspedes\n🎉 No se permiten fiestas ni eventos'),
  ('info_apt_demo_paloma_rules', 'apartment_info', 'en', 'title',   'House Rules'),
  ('info_apt_demo_paloma_rules', 'apartment_info', 'en', 'content', '🚭 No smoking indoors\n🐾 No pets allowed\n🔇 Quiet hours 10 PM – 9 AM (respect for neighbours)\n👥 Maximum 4 guests\n🎉 No parties or events'),
  ('info_apt_demo_paloma_rules', 'apartment_info', 'fr', 'title',   'Règlement intérieur'),
  ('info_apt_demo_paloma_rules', 'apartment_info', 'fr', 'content', '🚭 Interdiction de fumer à l''intérieur\n🐾 Animaux non acceptés\n🔇 Silence de 22h à 9h\n👥 Maximum 4 personnes\n🎉 Fêtes et événements interdits'),
  ('info_apt_demo_paloma_rules', 'apartment_info', 'de', 'title',   'Hausregeln'),
  ('info_apt_demo_paloma_rules', 'apartment_info', 'de', 'content', '🚭 Rauchen im Innenbereich verboten\n🐾 Keine Haustiere erlaubt\n🔇 Ruhezeit 22:00 – 9:00 Uhr\n👥 Maximal 4 Gäste\n🎉 Keine Partys oder Veranstaltungen');

-- 4.5 Aparcamiento
INSERT OR IGNORE INTO guide_apartment_info (id, apartment_id, info_key, icon_name, order_index)
VALUES ('info_apt_demo_paloma_parking', 'apt_demo_paloma', 'parking', 'local_parking', 50);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
VALUES
  ('info_apt_demo_paloma_parking', 'apartment_info', 'es', 'title',   'Aparcamiento'),
  ('info_apt_demo_paloma_parking', 'apartment_info', 'es', 'content', 'Aparcamiento en la vía pública disponible en las calles del entorno (zona azul lunes–sábado; gratuito domingos y festivos).\n\n🅿️ **Parking Arroyo de la Miel** — Av. de la Constitución\n3 min a pie · cubierto · tarifas desde 1€/h'),
  ('info_apt_demo_paloma_parking', 'apartment_info', 'en', 'title',   'Parking'),
  ('info_apt_demo_paloma_parking', 'apartment_info', 'en', 'content', 'On-street parking available nearby (blue zone Mon–Sat; free on Sundays and public holidays).\n\n🅿️ **Parking Arroyo de la Miel** — Av. de la Constitución\n3 min walk · covered · from €1/h'),
  ('info_apt_demo_paloma_parking', 'apartment_info', 'de', 'title',   'Parken'),
  ('info_apt_demo_paloma_parking', 'apartment_info', 'de', 'content', 'Straßenparkplätze in der Umgebung (blaue Zone Mo–Sa; kostenlos an Sonn- und Feiertagen).\n\n🅿️ **Parking Arroyo de la Miel** — Av. de la Constitución\n3 Min. Fußweg · überdacht · ab 1€/Std.');

-- 4.6 Supermercados
INSERT OR IGNORE INTO guide_apartment_info (id, apartment_id, info_key, icon_name, order_index)
VALUES ('info_apt_demo_paloma_supermarket', 'apt_demo_paloma', 'supermarket', 'shopping_cart', 60);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
VALUES
  ('info_apt_demo_paloma_supermarket', 'apartment_info', 'es', 'title',   'Supermercados'),
  ('info_apt_demo_paloma_supermarket', 'apartment_info', 'es', 'content', '🛒 **Mercadona** — C/ Palma 12 · 7 min a pie\n🛒 **Lidl** — Av. de la Constitución · 10 min a pie\n🛒 **Día** — C/ Málaga 5 · 5 min a pie'),
  ('info_apt_demo_paloma_supermarket', 'apartment_info', 'en', 'title',   'Supermarkets'),
  ('info_apt_demo_paloma_supermarket', 'apartment_info', 'en', 'content', '🛒 **Mercadona** — C/ Palma 12 · 7 min walk\n🛒 **Lidl** — Av. de la Constitución · 10 min walk\n🛒 **Día** — C/ Málaga 5 · 5 min walk'),
  ('info_apt_demo_paloma_supermarket', 'apartment_info', 'fr', 'title',   'Supermarchés'),
  ('info_apt_demo_paloma_supermarket', 'apartment_info', 'fr', 'content', '🛒 **Mercadona** — C/ Palma 12 · 7 min à pied\n🛒 **Lidl** — Av. de la Constitución · 10 min à pied\n🛒 **Día** — C/ Málaga 5 · 5 min à pied'),
  ('info_apt_demo_paloma_supermarket', 'apartment_info', 'de', 'title',   'Supermärkte'),
  ('info_apt_demo_paloma_supermarket', 'apartment_info', 'de', 'content', '🛒 **Mercadona** — C/ Palma 12 · 7 Min. zu Fuß\n🛒 **Lidl** — Av. de la Constitución · 10 Min. zu Fuß\n🛒 **Día** — C/ Málaga 5 · 5 Min. zu Fuß');

-- 4.7 Transporte
INSERT OR IGNORE INTO guide_apartment_info (id, apartment_id, info_key, icon_name, order_index)
VALUES ('info_apt_demo_paloma_transport', 'apt_demo_paloma', 'transport', 'directions_bus', 70);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
VALUES
  ('info_apt_demo_paloma_transport', 'apartment_info', 'es', 'title',   'Cómo moverse'),
  ('info_apt_demo_paloma_transport', 'apartment_info', 'es', 'content', '🚇 **Metro C1** — Estación Arroyo de la Miel, 3 min a pie → Málaga centro en 20 min\n🚌 **Bus 120/121** — Parada Av. de la Constitución → Puerto Marina\n🚕 **Taxi** — 952 567 890 (disponible 24h)\n✈️ **Aeropuerto de Málaga** — 15 min en coche'),
  ('info_apt_demo_paloma_transport', 'apartment_info', 'en', 'title',   'Getting Around'),
  ('info_apt_demo_paloma_transport', 'apartment_info', 'en', 'content', '🚇 **Metro C1** — Arroyo de la Miel station, 3 min walk → Málaga centre in 20 min\n🚌 **Bus 120/121** — Stop at Av. de la Constitución → Puerto Marina\n🚕 **Taxi** — 952 567 890 (24h)\n✈️ **Málaga Airport** — 15 min by car'),
  ('info_apt_demo_paloma_transport', 'apartment_info', 'fr', 'title',   'Se déplacer'),
  ('info_apt_demo_paloma_transport', 'apartment_info', 'fr', 'content', '🚇 **Métro C1** — Gare Arroyo de la Miel, 3 min à pied → Centre de Málaga en 20 min\n🚌 **Bus 120/121** — Arrêt Av. de la Constitución → Puerto Marina\n🚕 **Taxi** — 952 567 890 (24h/24)\n✈️ **Aéroport de Málaga** — 15 min en voiture'),
  ('info_apt_demo_paloma_transport', 'apartment_info', 'de', 'title',   'Mobilität'),
  ('info_apt_demo_paloma_transport', 'apartment_info', 'de', 'content', '🚇 **Metro C1** — Haltestelle Arroyo de la Miel, 3 Min. Fußweg → Málaga-Zentrum in 20 Min.\n🚌 **Bus 120/121** — Haltestelle Av. de la Constitución → Puerto Marina\n🚕 **Taxi** — 952 567 890 (24h)\n✈️ **Flughafen Málaga** — 15 Min. mit dem Auto');

-- 4.8 Emergencias
INSERT OR IGNORE INTO guide_apartment_info (id, apartment_id, info_key, icon_name, order_index)
VALUES ('info_apt_demo_paloma_emergency', 'apt_demo_paloma', 'emergency', 'emergency', 80);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
VALUES
  ('info_apt_demo_paloma_emergency', 'apartment_info', 'es', 'title',   'Emergencias'),
  ('info_apt_demo_paloma_emergency', 'apartment_info', 'es', 'content', '🆘 **Emergencias generales** — 112\n👮 **Policía Nacional** — 091 · **Local** — 092\n🏥 **Centro Salud Arroyo** — 951 032 200\n🔥 **Bomberos** — 080\n🏨 **Anfitrión (WhatsApp 24h)** — +34 651 234 567'),
  ('info_apt_demo_paloma_emergency', 'apartment_info', 'en', 'title',   'Emergency Contacts'),
  ('info_apt_demo_paloma_emergency', 'apartment_info', 'en', 'content', '🆘 **General emergencies** — 112\n👮 **National Police** — 091 · **Local** — 092\n🏥 **Arroyo Health Centre** — 951 032 200\n🔥 **Fire service** — 080\n🏨 **Host (WhatsApp 24h)** — +34 651 234 567'),
  ('info_apt_demo_paloma_emergency', 'apartment_info', 'fr', 'title',   'Urgences'),
  ('info_apt_demo_paloma_emergency', 'apartment_info', 'fr', 'content', '🆘 **Urgences générales** — 112\n👮 **Police Nationale** — 091 · **Locale** — 092\n🏥 **Centre de santé Arroyo** — 951 032 200\n🔥 **Pompiers** — 080\n🏨 **Hôte (WhatsApp 24h)** — +34 651 234 567'),
  ('info_apt_demo_paloma_emergency', 'apartment_info', 'de', 'title',   'Notfallkontakte'),
  ('info_apt_demo_paloma_emergency', 'apartment_info', 'de', 'content', '🆘 **Notruf** — 112\n👮 **Nationalpolizei** — 091 · **Lokalpolizei** — 092\n🏥 **Gesundheitszentrum Arroyo** — 951 032 200\n🔥 **Feuerwehr** — 080\n🏨 **Gastgeber (WhatsApp 24h)** — +34 651 234 567');

-- ════════════════════════════════════════
-- 5. PUNTOS DE INTERÉS (POIs)
-- ════════════════════════════════════════

-- 5.1 Parque de la Paloma — a 5 min a pie del apartamento
INSERT OR IGNORE INTO guide_pois (id, zone_id, category, latitude, longitude, order_index, rating, travel_time_text, travel_mode, distance_text, is_active)
VALUES ('poi_benalmadena_parque_paloma', 'zone_benalmadena', 'park', 36.5933, -4.5225, 10, 4.8, '5 min', 'walk', '400 m', 1);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
VALUES
  ('poi_benalmadena_parque_paloma', 'poi', 'es', 'name',        'Parque de la Paloma'),
  ('poi_benalmadena_parque_paloma', 'poi', 'es', 'description', 'Extenso parque urbano con lagos, fauna libre (pavos reales, conejos, gansos) y zonas de picnic. Ideal para una mañana en familia. Entrada gratuita. A solo 5 minutos del apartamento.'),
  ('poi_benalmadena_parque_paloma', 'poi', 'es', 'short_tip',   'Visita al amanecer para ver los pavos reales despertar'),
  ('poi_benalmadena_parque_paloma', 'poi', 'en', 'name',        'Parque de la Paloma'),
  ('poi_benalmadena_parque_paloma', 'poi', 'en', 'description', 'Large urban park with lakes, free-roaming wildlife (peacocks, rabbits, geese) and picnic areas. Perfect for a family morning. Free entry. Just 5 minutes from the apartment.'),
  ('poi_benalmadena_parque_paloma', 'poi', 'en', 'short_tip',   'Visit at dawn to see the peacocks wake up'),
  ('poi_benalmadena_parque_paloma', 'poi', 'fr', 'name',        'Parc de la Paloma'),
  ('poi_benalmadena_parque_paloma', 'poi', 'fr', 'description', 'Grand parc urbain avec lacs, faune en liberté (paons, lapins, oies) et aires de pique-nique. Idéal pour une matinée en famille. Entrée gratuite.'),
  ('poi_benalmadena_parque_paloma', 'poi', 'fr', 'short_tip',   'À l''aube, les paons sont particulièrement actifs'),
  ('poi_benalmadena_parque_paloma', 'poi', 'de', 'name',        'Parque de la Paloma'),
  ('poi_benalmadena_parque_paloma', 'poi', 'de', 'description', 'Großer Stadtpark mit Seen, freilaufenden Tieren (Pfauen, Kaninchen, Gänsen) und Picknickbereichen. Ideal für einen Familienmorgen. Eintritt frei.'),
  ('poi_benalmadena_parque_paloma', 'poi', 'de', 'short_tip',   'Bei Sonnenaufgang sind die Pfauen besonders aktiv');

-- 5.2 Puerto Marina
INSERT OR IGNORE INTO guide_pois (id, zone_id, category, latitude, longitude, order_index, rating, travel_time_text, travel_mode, distance_text, is_active)
VALUES ('poi_benalmadena_puerto_marina', 'zone_benalmadena', 'marina', 36.5903, -4.5028, 20, 4.7, '10 min', 'drive', '3 km', 1);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
VALUES
  ('poi_benalmadena_puerto_marina', 'poi', 'es', 'name',        'Puerto Marina'),
  ('poi_benalmadena_puerto_marina', 'poi', 'es', 'description', 'Uno de los puertos deportivos más bonitos de Europa, con más de 1.000 amarres. Paseo marítimo con restaurantes, terrazas y tiendas. Ambiente animado hasta la madrugada.'),
  ('poi_benalmadena_puerto_marina', 'poi', 'es', 'short_tip',   'Los restaurantes con terraza sobre el mar son imprescindibles al atardecer'),
  ('poi_benalmadena_puerto_marina', 'poi', 'en', 'name',        'Puerto Marina'),
  ('poi_benalmadena_puerto_marina', 'poi', 'en', 'description', 'One of the most beautiful marinas in Europe, with over 1,000 berths. Seafront promenade with restaurants, terraces and shops. Lively atmosphere well into the night.'),
  ('poi_benalmadena_puerto_marina', 'poi', 'en', 'short_tip',   'Waterfront terrace restaurants are unmissable at sunset'),
  ('poi_benalmadena_puerto_marina', 'poi', 'fr', 'name',        'Puerto Marina'),
  ('poi_benalmadena_puerto_marina', 'poi', 'fr', 'description', 'L''un des ports de plaisance les plus beaux d''Europe, avec plus de 1 000 anneaux. Promenade maritime avec restaurants, terrasses et boutiques. Ambiance animée jusqu''à l''aube.'),
  ('poi_benalmadena_puerto_marina', 'poi', 'fr', 'short_tip',   'Les restaurants en terrasse sur l''eau sont incontournables au coucher du soleil'),
  ('poi_benalmadena_puerto_marina', 'poi', 'de', 'name',        'Puerto Marina'),
  ('poi_benalmadena_puerto_marina', 'poi', 'de', 'description', 'Einer der schönsten Sporthafen Europas mit über 1.000 Liegeplätzen. Strandpromenade mit Restaurants, Terrassen und Geschäften. Lebendige Atmosphäre bis in die Nacht.'),
  ('poi_benalmadena_puerto_marina', 'poi', 'de', 'short_tip',   'Die Terrassen-Restaurants am Wasser sind bei Sonnenuntergang ein Muss');

-- 5.3 Castillo de Colomares
INSERT OR IGNORE INTO guide_pois (id, zone_id, category, latitude, longitude, order_index, rating, travel_time_text, travel_mode, distance_text, is_active)
VALUES ('poi_benalmadena_colomares', 'zone_benalmadena', 'monument', 36.5944, -4.5328, 30, 4.6, '15 min', 'walk', '1,2 km', 1);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
VALUES
  ('poi_benalmadena_colomares', 'poi', 'es', 'name',        'Castillo de Colomares'),
  ('poi_benalmadena_colomares', 'poi', 'es', 'description', 'Monumento único dedicado a Cristóbal Colón y al descubrimiento de América. Mezcla estilos románico, gótico, mudéjar y bizantino. Alberga la iglesia más pequeña del mundo según el Guinness.'),
  ('poi_benalmadena_colomares', 'poi', 'es', 'short_tip',   'La capilla interior tiene capacidad para una persona — perfecta para la foto más original'),
  ('poi_benalmadena_colomares', 'poi', 'en', 'name',        'Castillo de Colomares'),
  ('poi_benalmadena_colomares', 'poi', 'en', 'description', 'A unique monument dedicated to Christopher Columbus and the discovery of America. It blends Romanesque, Gothic, Mudéjar and Byzantine styles, and contains the world''s smallest church per Guinness Records.'),
  ('poi_benalmadena_colomares', 'poi', 'en', 'short_tip',   'The tiny interior chapel fits one person — ideal for the most original photo'),
  ('poi_benalmadena_colomares', 'poi', 'fr', 'name',        'Château de Colomares'),
  ('poi_benalmadena_colomares', 'poi', 'fr', 'description', 'Monument unique dédié à Christophe Colomb et à la découverte de l''Amérique. Mêle styles roman, gothique, mudéjar et byzantin. Abrite la plus petite église du monde selon le Guinness.'),
  ('poi_benalmadena_colomares', 'poi', 'fr', 'short_tip',   'La chapelle intérieure n''accueille qu''une personne — parfait pour une photo insolite'),
  ('poi_benalmadena_colomares', 'poi', 'de', 'name',        'Castillo de Colomares'),
  ('poi_benalmadena_colomares', 'poi', 'de', 'description', 'Einzigartiges Denkmal für Christoph Kolumbus und die Entdeckung Amerikas. Vereint romanische, gotische, Mudéjar- und byzantinische Stile. Enthält laut Guinness die kleinste Kirche der Welt.'),
  ('poi_benalmadena_colomares', 'poi', 'de', 'short_tip',   'Die winzige Kapelle fasst eine Person — ideal für das originellste Foto');

-- 5.4 Stupa Budista
INSERT OR IGNORE INTO guide_pois (id, zone_id, category, latitude, longitude, order_index, rating, travel_time_text, travel_mode, distance_text, is_active)
VALUES ('poi_benalmadena_stupa', 'zone_benalmadena', 'monument', 36.6072, -4.5401, 40, 4.5, '8 min', 'drive', '2,5 km', 1);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
VALUES
  ('poi_benalmadena_stupa', 'poi', 'es', 'name',        'Stupa Budista'),
  ('poi_benalmadena_stupa', 'poi', 'es', 'description', 'Una de las estupas budistas más grandes de Europa Occidental (33 m de altura). Construida en 2003, ofrece vistas panorámicas espectaculares a la costa y un ambiente de paz único.'),
  ('poi_benalmadena_stupa', 'poi', 'es', 'short_tip',   'Las vistas al Mediterráneo desde aquí son de las mejores de toda la zona'),
  ('poi_benalmadena_stupa', 'poi', 'en', 'name',        'Buddhist Stupa'),
  ('poi_benalmadena_stupa', 'poi', 'en', 'description', 'One of the largest Buddhist stupas in Western Europe (33m tall). Built in 2003, it offers spectacular panoramic coastal views and a uniquely peaceful atmosphere.'),
  ('poi_benalmadena_stupa', 'poi', 'en', 'short_tip',   'The Mediterranean views from here are among the best in the entire area'),
  ('poi_benalmadena_stupa', 'poi', 'fr', 'name',        'Stupa Bouddhiste'),
  ('poi_benalmadena_stupa', 'poi', 'fr', 'description', 'L''un des plus grands stupas bouddhistes d''Europe occidentale (33 m). Construit en 2003, il offre des vues panoramiques spectaculaires sur la côte et une atmosphère de paix unique.'),
  ('poi_benalmadena_stupa', 'poi', 'fr', 'short_tip',   'Les vues sur la Méditerranée depuis ici comptent parmi les plus belles de la région'),
  ('poi_benalmadena_stupa', 'poi', 'de', 'name',        'Buddhistische Stupa'),
  ('poi_benalmadena_stupa', 'poi', 'de', 'description', 'Eine der größten buddhistischen Stupas Westeuropas (33 m hoch). 2003 erbaut, bietet sie spektakuläre Panoramablicke auf die Küste und eine einzigartig friedliche Atmosphäre.'),
  ('poi_benalmadena_stupa', 'poi', 'de', 'short_tip',   'Der Blick auf das Mittelmeer von hier ist einer der schönsten in der ganzen Region');

-- 5.5 Playa de Malapesquera
INSERT OR IGNORE INTO guide_pois (id, zone_id, category, latitude, longitude, order_index, rating, travel_time_text, travel_mode, distance_text, is_active)
VALUES ('poi_benalmadena_malapesquera', 'zone_benalmadena', 'beach', 36.5855, -4.5178, 50, 4.4, '20 min', 'walk', '1,5 km', 1);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
VALUES
  ('poi_benalmadena_malapesquera', 'poi', 'es', 'name',        'Playa de Malapesquera'),
  ('poi_benalmadena_malapesquera', 'poi', 'es', 'description', 'Playa de bandera azul con arena fina y aguas tranquilas. Cuenta con chiringuitos, duchas, hamacas y vigilancia en temporada. Perfecta para disfrutar de los espetos andaluces.'),
  ('poi_benalmadena_malapesquera', 'poi', 'es', 'short_tip',   'Los espetos de sardinas en el chiringuito son obligatorios'),
  ('poi_benalmadena_malapesquera', 'poi', 'en', 'name',        'Malapesquera Beach'),
  ('poi_benalmadena_malapesquera', 'poi', 'en', 'description', 'Blue flag beach with fine sand and calm waters. Has beach bars, showers, sun loungers and lifeguards in season. Perfect for enjoying traditional Andalusian espetos (sardines on a skewer).'),
  ('poi_benalmadena_malapesquera', 'poi', 'en', 'short_tip',   'Sardine espetos at the beach bar are a must'),
  ('poi_benalmadena_malapesquera', 'poi', 'fr', 'name',        'Plage de Malapesquera'),
  ('poi_benalmadena_malapesquera', 'poi', 'fr', 'description', 'Plage Pavillon Bleu aux eaux calmes et sable fin. Bars de plage, douches, chaises longues et surveillance en saison. Idéale pour goûter les espetos andalous (sardines grillées).'),
  ('poi_benalmadena_malapesquera', 'poi', 'fr', 'short_tip',   'Les espetos de sardines au bar de plage sont incontournables'),
  ('poi_benalmadena_malapesquera', 'poi', 'de', 'name',        'Strand Malapesquera'),
  ('poi_benalmadena_malapesquera', 'poi', 'de', 'description', 'Blaue-Flagge-Strand mit feinem Sand und ruhigem Wasser. Strandrestaurants, Duschen, Liegen und Rettungsschwimmer in der Saison. Perfekt für andalusische Espetos (Sardinenspieße).'),
  ('poi_benalmadena_malapesquera', 'poi', 'de', 'short_tip',   'Sardinen-Espetos am Strandrestaurant sind ein Muss');

-- 5.6 Benalmádena Pueblo (casco antiguo)
INSERT OR IGNORE INTO guide_pois (id, zone_id, category, latitude, longitude, order_index, rating, travel_time_text, travel_mode, distance_text, is_active)
VALUES ('poi_benalmadena_pueblo', 'zone_benalmadena', 'viewpoint', 36.6055, -4.5477, 60, 4.8, '12 min', 'drive', '4 km', 1);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
VALUES
  ('poi_benalmadena_pueblo', 'poi', 'es', 'name',        'Benalmádena Pueblo'),
  ('poi_benalmadena_pueblo', 'poi', 'es', 'description', 'El casco antiguo: calles empedradas, casas blancas con macetas de colores y miradores con vistas espectaculares al mar. No te pierdas el Museo de Arte Precolombino y la Iglesia de Santo Domingo.'),
  ('poi_benalmadena_pueblo', 'poi', 'es', 'short_tip',   'El mirador junto a la iglesia de Santo Domingo tiene el mejor atardecer de la Costa del Sol'),
  ('poi_benalmadena_pueblo', 'poi', 'en', 'name',        'Benalmádena Old Town'),
  ('poi_benalmadena_pueblo', 'poi', 'en', 'description', 'The historic centre: cobblestone streets, white houses with colourful flower pots and viewpoints with spectacular sea views. Don''t miss the Pre-Columbian Art Museum and Santo Domingo Church.'),
  ('poi_benalmadena_pueblo', 'poi', 'en', 'short_tip',   'The viewpoint by Santo Domingo Church has the best sunset on the Costa del Sol'),
  ('poi_benalmadena_pueblo', 'poi', 'fr', 'name',        'Vieux-Benalmádena'),
  ('poi_benalmadena_pueblo', 'poi', 'fr', 'description', 'Le centre historique: ruelles pavées, maisons blanches fleuries et miradors avec des vues spectaculaires sur la mer. Ne ratez pas le Musée d''Art Précolombien et l''Église Santo Domingo.'),
  ('poi_benalmadena_pueblo', 'poi', 'fr', 'short_tip',   'Le belvédère près de l''Église Santo Domingo offre le plus beau coucher de soleil de la Costa del Sol'),
  ('poi_benalmadena_pueblo', 'poi', 'de', 'name',        'Benalmádena Altstadt'),
  ('poi_benalmadena_pueblo', 'poi', 'de', 'description', 'Die Altstadt: gepflasterte Gassen, weiße Häuser mit bunten Blumentöpfen und Aussichtspunkte mit spektakulärem Meerblick. Sehenswert: Präkolumbianisches Kunstmuseum und Kirche Santo Domingo.'),
  ('poi_benalmadena_pueblo', 'poi', 'de', 'short_tip',   'Der Aussichtspunkt bei der Kirche Santo Domingo hat den schönsten Sonnenuntergang der Costa del Sol');

-- ════════════════════════════════════════
-- 6. VINCULAR POIs AL APARTAMENTO
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_apartment_pois (apartment_id, poi_id, order_override)
VALUES
  ('apt_demo_paloma', 'poi_benalmadena_parque_paloma',    10),
  ('apt_demo_paloma', 'poi_benalmadena_puerto_marina',    20),
  ('apt_demo_paloma', 'poi_benalmadena_colomares',        30),
  ('apt_demo_paloma', 'poi_benalmadena_stupa',            40),
  ('apt_demo_paloma', 'poi_benalmadena_malapesquera',     50),
  ('apt_demo_paloma', 'poi_benalmadena_pueblo',           60);

-- ════════════════════════════════════════
-- 7. EXPERIENCIAS
-- ════════════════════════════════════════

-- 7.1 Alquiler de Kayak (FEATURED)
INSERT OR IGNORE INTO guide_experiences (id, zone_id, category, action_type, action_data, action_prefilled_message, price_display, is_featured, is_active, service_subcategory, order_index)
VALUES (
  'exp_benalmadena_kayak',
  'zone_benalmadena',
  'actividades',
  'WHATSAPP',
  '+34600123456',
  'Hola, soy huésped del apartamento {{apartment_name}} y me gustaría reservar un kayak.',
  'Desde 20€/hora',
  1, 1,
  'nautical/kayak',
  10
);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
VALUES
  ('exp_benalmadena_kayak', 'experience', 'es', 'name',        'Alquiler de Kayak'),
  ('exp_benalmadena_kayak', 'experience', 'es', 'description', 'Explora la Costa del Sol en kayak desde Puerto Marina. Todo el equipo incluido. No se necesita experiencia previa. Monitores certificados disponibles.'),
  ('exp_benalmadena_kayak', 'experience', 'es', 'cta_label',   'Reservar por WhatsApp'),
  ('exp_benalmadena_kayak', 'experience', 'en', 'name',        'Kayak Rental'),
  ('exp_benalmadena_kayak', 'experience', 'en', 'description', 'Explore the Costa del Sol by kayak from Puerto Marina. All equipment included. No prior experience needed. Certified instructors available.'),
  ('exp_benalmadena_kayak', 'experience', 'en', 'cta_label',   'Book via WhatsApp'),
  ('exp_benalmadena_kayak', 'experience', 'fr', 'name',        'Location de Kayak'),
  ('exp_benalmadena_kayak', 'experience', 'fr', 'description', 'Explorez la Costa del Sol en kayak depuis Puerto Marina. Tout l''équipement inclus. Aucune expérience préalable requise. Moniteurs certifiés disponibles.'),
  ('exp_benalmadena_kayak', 'experience', 'fr', 'cta_label',   'Réserver par WhatsApp'),
  ('exp_benalmadena_kayak', 'experience', 'de', 'name',        'Kajak-Verleih'),
  ('exp_benalmadena_kayak', 'experience', 'de', 'description', 'Erkunden Sie die Costa del Sol per Kajak vom Puerto Marina aus. Gesamte Ausrüstung inklusive. Keine Vorerfahrung nötig. Zertifizierte Instructor verfügbar.'),
  ('exp_benalmadena_kayak', 'experience', 'de', 'cta_label',   'Per WhatsApp buchen');

-- 7.2 Tour en Catamarán (FEATURED + badge exclusive)
INSERT OR IGNORE INTO guide_experiences (id, zone_id, category, action_type, action_data, action_prefilled_message, price_display, is_featured, is_active, service_subcategory, order_index, badge_type)
VALUES (
  'exp_benalmadena_catamaran',
  'zone_benalmadena',
  'actividades',
  'WHATSAPP',
  '+34611987654',
  'Hola, soy huésped del apartamento {{apartment_name}} y me gustaría reservar el tour en catamarán.',
  'Desde 45€/persona',
  1, 1,
  'nautical/catamaran',
  20,
  'exclusive'
);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
VALUES
  ('exp_benalmadena_catamaran', 'experience', 'es', 'name',        'Tour en Catamarán'),
  ('exp_benalmadena_catamaran', 'experience', 'es', 'description', 'Excursión de 3 horas por la Costa del Sol: avistamiento de delfines, snorkel y open bar incluidos. Salidas diarias desde Puerto Marina. ¡Experiencia inolvidable!'),
  ('exp_benalmadena_catamaran', 'experience', 'es', 'cta_label',   'Reservar ahora'),
  ('exp_benalmadena_catamaran', 'experience', 'en', 'name',        'Catamaran Tour'),
  ('exp_benalmadena_catamaran', 'experience', 'en', 'description', '3-hour cruise along the Costa del Sol: dolphin watching, snorkelling and open bar included. Daily departures from Puerto Marina. An unforgettable experience!'),
  ('exp_benalmadena_catamaran', 'experience', 'en', 'cta_label',   'Book now'),
  ('exp_benalmadena_catamaran', 'experience', 'fr', 'name',        'Tour en Catamaran'),
  ('exp_benalmadena_catamaran', 'experience', 'fr', 'description', 'Croisière de 3h sur la Costa del Sol: observation de dauphins, snorkeling et open bar inclus. Départs quotidiens depuis Puerto Marina. Une expérience inoubliable!'),
  ('exp_benalmadena_catamaran', 'experience', 'fr', 'cta_label',   'Réserver maintenant'),
  ('exp_benalmadena_catamaran', 'experience', 'de', 'name',        'Katamaran-Tour'),
  ('exp_benalmadena_catamaran', 'experience', 'de', 'description', '3-stündige Kreuzfahrt entlang der Costa del Sol: Delfinbeobachtung, Schnorcheln und Open Bar inklusive. Tägliche Abfahrten vom Puerto Marina. Ein unvergessliches Erlebnis!'),
  ('exp_benalmadena_catamaran', 'experience', 'de', 'cta_label',   'Jetzt buchen');

-- 7.3 Traslado al Aeropuerto de Málaga
INSERT OR IGNORE INTO guide_experiences (id, zone_id, category, action_type, action_data, action_prefilled_message, price_display, is_featured, is_active, order_index)
VALUES (
  'exp_benalmadena_taxi',
  'zone_benalmadena',
  'transporte',
  'WHATSAPP',
  '+34612345678',
  'Hola, soy huésped del apartamento {{apartment_name}} y necesito un traslado al aeropuerto de Málaga.',
  'Desde 35€/trayecto',
  0, 1,
  30
);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
VALUES
  ('exp_benalmadena_taxi', 'experience', 'es', 'name',        'Traslado Aeropuerto Málaga'),
  ('exp_benalmadena_taxi', 'experience', 'es', 'description', 'Taxi privado puerta a puerta entre el apartamento y el Aeropuerto de Málaga-Costa del Sol. Disponible 24h, 7 días. Reserva con antelación para garantizar disponibilidad.'),
  ('exp_benalmadena_taxi', 'experience', 'es', 'cta_label',   'Solicitar traslado'),
  ('exp_benalmadena_taxi', 'experience', 'en', 'name',        'Málaga Airport Transfer'),
  ('exp_benalmadena_taxi', 'experience', 'en', 'description', 'Private door-to-door taxi between the apartment and Málaga-Costa del Sol Airport. Available 24/7. Book in advance to guarantee availability.'),
  ('exp_benalmadena_taxi', 'experience', 'en', 'cta_label',   'Request transfer'),
  ('exp_benalmadena_taxi', 'experience', 'fr', 'name',        'Transfert Aéroport de Málaga'),
  ('exp_benalmadena_taxi', 'experience', 'fr', 'description', 'Taxi privé porte-à-porte entre l''appartement et l''Aéroport de Málaga-Costa del Sol. Disponible 24h/24, 7j/7. Réservez à l''avance pour garantir la disponibilité.'),
  ('exp_benalmadena_taxi', 'experience', 'fr', 'cta_label',   'Demander un transfert'),
  ('exp_benalmadena_taxi', 'experience', 'de', 'name',        'Transfer Flughafen Málaga'),
  ('exp_benalmadena_taxi', 'experience', 'de', 'description', 'Privater Tür-zu-Tür-Taxi zwischen dem Apartment und dem Flughafen Málaga-Costa del Sol. Rund um die Uhr, 7 Tage die Woche verfügbar. Im Voraus buchen, um Verfügbarkeit zu sichern.'),
  ('exp_benalmadena_taxi', 'experience', 'de', 'cta_label',   'Transfer anfragen');

-- 7.4 Spa & Masaje (badge courtesy — 10% dto para huéspedes)
INSERT OR IGNORE INTO guide_experiences (id, zone_id, category, action_type, action_data, price_display, is_featured, is_active, order_index, badge_type)
VALUES (
  'exp_benalmadena_spa',
  'zone_benalmadena',
  'relax',
  'PHONE',
  '+34951234567',
  'Desde 60€/sesión',
  0, 1,
  40,
  'courtesy'
);

INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
VALUES
  ('exp_benalmadena_spa', 'experience', 'es', 'name',        'Spa & Masaje'),
  ('exp_benalmadena_spa', 'experience', 'es', 'description', 'Centro de bienestar a 10 min del apartamento. Masajes relajantes, rituales andaluces, baño turco y jacuzzi. Los huéspedes de nuestros apartamentos disfrutan de un 10% de descuento solo con mencionar este guidebook.'),
  ('exp_benalmadena_spa', 'experience', 'es', 'cta_label',   'Llamar para reservar'),
  ('exp_benalmadena_spa', 'experience', 'en', 'name',        'Spa & Massage'),
  ('exp_benalmadena_spa', 'experience', 'en', 'description', 'Wellness centre 10 min from the apartment. Relaxing massages, Andalusian rituals, Turkish bath and jacuzzi. Our apartment guests enjoy a 10% discount just by mentioning this guidebook.'),
  ('exp_benalmadena_spa', 'experience', 'en', 'cta_label',   'Call to book'),
  ('exp_benalmadena_spa', 'experience', 'fr', 'name',        'Spa & Massage'),
  ('exp_benalmadena_spa', 'experience', 'fr', 'description', 'Centre de bien-être à 10 min de l''appartement. Massages relaxants, rituels andalous, hammam et jacuzzi. Nos hôtes bénéficient de 10% de remise en mentionnant ce guidebook.'),
  ('exp_benalmadena_spa', 'experience', 'fr', 'cta_label',   'Appeler pour réserver'),
  ('exp_benalmadena_spa', 'experience', 'de', 'name',        'Spa & Massage'),
  ('exp_benalmadena_spa', 'experience', 'de', 'description', 'Wellnesszentrum 10 Min. vom Apartment. Entspannungsmassagen, andalusische Rituale, türkisches Bad und Jacuzzi. Unsere Gäste erhalten 10% Rabatt, wenn sie diesen Guidebook erwähnen.'),
  ('exp_benalmadena_spa', 'experience', 'de', 'cta_label',   'Anrufen und buchen');

-- ════════════════════════════════════════
-- 8. VINCULAR AGENCIA AL USUARIO ADMIN
-- (Ejecuta primero el bloque de arriba y luego este)
-- ════════════════════════════════════════
INSERT OR IGNORE INTO guide_agency_staff (agency_id, user_id, role)
SELECT 'agency_cds_apts', id, 'admin'
FROM users
WHERE email = 'franciscotortosaestudios@gmail.com'
LIMIT 1;
