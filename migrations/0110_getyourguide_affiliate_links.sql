-- =====================================================
-- MIGRACIÓN 0110: enlaces de afiliado de GetYourGuide en el catálogo
-- =====================================================
-- Solo datos, ningún cambio de esquema (no hay que regenerar BDschemaFinal.sql).
--
-- Por qué: hasta hoy ninguna fila de guide_pois llevaba un enlace retribuido
-- (comprobado en producción el 2026-10-14: 0 filas con action_is_affiliate = 1).
-- Las 15 experiencias reservables apuntaban a la web oficial de cada sitio, que
-- no paga nada, y cinco zonas no tenían ninguna experiencia.
--
-- Forma del enlace (comprobada contra el generador del panel de partner):
--   <página de GetYourGuide>/?partner_id=<id>&utm_medium=online_publisher&cmp=<campaña>
-- El id va en affiliate_code y la campaña es {{sub_id}}: workerGuide.js
-- (applyUrlPlaceholders) los sustituye al servir, y sub_id sale como
-- "<slug del piso>-guide" o "<slug del piso>-tv". `cmp` solo admite letras,
-- números y guiones, que es justo lo que tiene un slug.
--
-- El dominio es www.getyourguide.com SIN prefijo de idioma: redirige al idioma
-- del visitante conservando los parámetros (el `.es` que da el generador fija el
-- español, y la guía sale en 13 idiomas).
--
-- 1) Experiencias que ya existían: solo cambian las cinco en las que
--    GetYourGuide vende LA MISMA entrada y a un precio que no supera el que
--    enseña la tarjeta (price_display). Las demás se quedan en la web oficial a
--    propósito: en la Alcazaba, Gibralfaro y la Catedral GetYourGuide solo vende
--    la entrada con guía o audioguía (13–18 € frente a los 6–7 € de la tarjeta);
--    Aqualand (39 € frente a 26 €) y el Museo Automovilístico (12 € frente a
--    10 €) son más caros que en taquilla; y del Thyssen, La Concepción, la Casa
--    Natal de Picasso y los dos de Mijas no vende nada. Mandar a un botón de
--    «7 €» a una página de 16 € sería engañar al huésped.
--    La web oficial no se pierde: sigue en website_url.
--
-- 2) Una tarjeta general por zona («Excursiones y actividades») que lleva a la
--    página del destino en GetYourGuide. Rincón de la Victoria y Torrox no tienen
--    página propia allí (6 y 10 actividades): van a Málaga y a Nerja.
--    Sin coordenadas, así que no sale en el mapa de Explorar; order_index 900
--    para que quede detrás de las experiencias concretas de la zona.
--    La foto es la de un lugar que ya está en esa zona, referida por
--    cover_image_url y NO por una fila de guide_poi_media: deletePoi y
--    deletePoiMedia borran la clave de R2, y con una fila compartida borrar la
--    tarjeta desde el admin se llevaría la foto del lugar original.
--
-- Idempotente: los UPDATE no tocan una fila que ya sea de afiliado y los INSERT
-- son OR IGNORE.
--
-- Después de aplicarla: una escritura en KV, `ver:all`, o las guías siguen
-- sirviendo el catálogo anterior hasta que caduque la caché.
-- =====================================================

-- -----------------------------------------------------
-- 1. Experiencias existentes cuyo ticket vende GetYourGuide al mismo precio
-- -----------------------------------------------------
UPDATE guide_pois
SET action_type = 'URL',
    action_data = 'https://www.getyourguide.com/malaga-l402/museo-picasso-malaga-coleccion-permanente-t32477/?partner_id={{affiliate_code}}&utm_medium=online_publisher&cmp={{sub_id}}',
    action_is_affiliate = 1, affiliate_network = 'getyourguide', affiliate_code = 'Y5VN1RM',
    modified_at = CURRENT_TIMESTAMP
WHERE id = 'poi_malaga_museo_picasso' AND COALESCE(action_is_affiliate, 0) = 0;

UPDATE guide_pois
SET action_type = 'URL',
    action_data = 'https://www.getyourguide.com/malaga-l402/centro-pompidou-malaga-ticket-t211791/?partner_id={{affiliate_code}}&utm_medium=online_publisher&cmp={{sub_id}}',
    action_is_affiliate = 1, affiliate_network = 'getyourguide', affiliate_code = 'Y5VN1RM',
    modified_at = CURRENT_TIMESTAMP
WHERE id = 'poi_malaga_pompidou' AND COALESCE(action_is_affiliate, 0) = 0;

UPDATE guide_pois
SET action_type = 'URL',
    action_data = 'https://www.getyourguide.com/torremolinos-l826/torremolinos-ticket-de-entrada-al-crocodile-park-t383871/?partner_id={{affiliate_code}}&utm_medium=online_publisher&cmp={{sub_id}}',
    action_is_affiliate = 1, affiliate_network = 'getyourguide', affiliate_code = 'Y5VN1RM',
    modified_at = CURRENT_TIMESTAMP
WHERE id = 'poi_torremolinos_cocodrilos' AND COALESCE(action_is_affiliate, 0) = 0;

UPDATE guide_pois
SET action_type = 'URL',
    action_data = 'https://www.getyourguide.com/benalmadena-l429/benalmadena-ticket-para-el-teleferico-del-monte-calamorro-t402242/?partner_id={{affiliate_code}}&utm_medium=online_publisher&cmp={{sub_id}}',
    action_is_affiliate = 1, affiliate_network = 'getyourguide', affiliate_code = 'Y5VN1RM',
    modified_at = CURRENT_TIMESTAMP
WHERE id = 'poi_benalmadena_teleferico' AND COALESCE(action_is_affiliate, 0) = 0;

UPDATE guide_pois
SET action_type = 'URL',
    action_data = 'https://www.getyourguide.com/fuengirola-l1160/fuengirola-ticket-de-entrada-al-bioparc-t496528/?partner_id={{affiliate_code}}&utm_medium=online_publisher&cmp={{sub_id}}',
    action_is_affiliate = 1, affiliate_network = 'getyourguide', affiliate_code = 'Y5VN1RM',
    modified_at = CURRENT_TIMESTAMP
WHERE id = 'poi_fuengirola_bioparc' AND COALESCE(action_is_affiliate, 0) = 0;

-- -----------------------------------------------------
-- 2. Tarjeta general de cada zona
-- -----------------------------------------------------
-- destino: página de GetYourGuide. foto: guide_poi_media.id del lugar de la zona
-- cuya imagen se enseña (Puerto Marina, el paseo marítimo, el mirador de
-- Gibralfaro, Puerto Banús, Mijas Pueblo, el Balcón de Europa, la Casa Fuerte de
-- Bezmiliana, el Tajo, el Bajondillo y Torrox pueblo).
WITH dest(zone_id, poi_id, destino, foto) AS (VALUES
    ('zone_benalmadena',           'poi_gyg_benalmadena',           'benalmadena-l429',  'poimedia_poi_mt0qfcfn_r5wfmx'),
    ('zone_fuengirola',            'poi_gyg_fuengirola',            'fuengirola-l1160',  'poimedia_poi_fuengirola_paseo_maritimo'),
    ('zone_malaga',                'poi_gyg_malaga',                'malaga-l402',       'poimedia_malaga_mirador_gibralfaro'),
    ('zone_marbella',              'poi_gyg_marbella',              'marbella-l1217',    'poimedia_poi_marbella_banus'),
    ('zone_mijas',                 'poi_gyg_mijas',                 'mijas-l90747',      'poimedia_poi_mijas_casco_antiguo'),
    ('zone_nerja',                 'poi_gyg_nerja',                 'nerja-l90213',      'poimedia_poi_balcon'),
    ('zone_rincon_de_la_victoria', 'poi_gyg_rincon_de_la_victoria', 'malaga-l402',       'poimedia_poi_rincon_de_la_victoria_casa_fuerte_bezmiliana'),
    ('zone_ronda',                 'poi_gyg_ronda',                 'ronda-l838',        'poimedia_poi_ronda_tajo'),
    ('zone_torremolinos',          'poi_gyg_torremolinos',          'torremolinos-l826', 'poimedia_torremolinos_bajondillo'),
    ('zone_torrox',                'poi_gyg_torrox',                'nerja-l90213',      'poimedia_poi_torrox_torrox_pueblo')
)
INSERT OR IGNORE INTO guide_pois (
    id, zone_id, category, poi_type, access_type, order_index, is_active,
    is_bookable, is_featured, action_type, action_data,
    action_is_affiliate, affiliate_network, affiliate_code, cover_image_url
)
SELECT
    d.poi_id, d.zone_id, 'Actividades', 'experience', 'paid', 900, 1,
    1, 0, 'URL',
    'https://www.getyourguide.com/' || d.destino || '/?partner_id={{affiliate_code}}&utm_medium=online_publisher&cmp={{sub_id}}',
    1, 'getyourguide', 'Y5VN1RM',
    -- Con el origen del worker delante, que es lo que publicMediaUrls reescribe
    -- al dominio de media al servir.
    (SELECT 'https://visualtasteworker.franciscotortosaestudios.workers.dev/media/' || m.r2_key
       FROM guide_poi_media m WHERE m.id = d.foto)
FROM dest d
JOIN guide_zones z ON z.id = d.zone_id;

-- -----------------------------------------------------
-- 3. Textos de la tarjeta general, en los 13 idiomas
-- -----------------------------------------------------
WITH tr(lang, field, value) AS (VALUES
    ('es', 'name', 'Excursiones y actividades'),
    ('en', 'name', 'Tours and activities'),
    ('fr', 'name', 'Excursions et activités'),
    ('de', 'name', 'Ausflüge und Aktivitäten'),
    ('it', 'name', 'Escursioni e attività'),
    ('pt', 'name', 'Excursões e atividades'),
    ('ca', 'name', 'Excursions i activitats'),
    ('ar', 'name', 'جولات وأنشطة'),
    ('ru', 'name', 'Экскурсии и развлечения'),
    ('uk', 'name', 'Екскурсії та розваги'),
    ('zh', 'name', '游览与活动'),
    ('ja', 'name', 'ツアーとアクティビティ'),
    ('ko', 'name', '투어 및 액티비티'),

    ('es', 'description', 'Visitas guiadas, entradas y excursiones de un día por la zona, con opiniones de otros viajeros. Se reserva online en GetYourGuide.'),
    ('en', 'description', 'Guided tours, tickets and day trips around the area, with reviews from other travellers. Book online with GetYourGuide.'),
    ('fr', 'description', 'Visites guidées, billets et excursions à la journée dans les environs, avec les avis d''autres voyageurs. Réservation en ligne sur GetYourGuide.'),
    ('de', 'description', 'Führungen, Tickets und Tagesausflüge in der Umgebung, mit Bewertungen anderer Reisender. Online buchbar bei GetYourGuide.'),
    ('it', 'description', 'Visite guidate, biglietti ed escursioni di un giorno nei dintorni, con le recensioni di altri viaggiatori. Si prenota online su GetYourGuide.'),
    ('pt', 'description', 'Visitas guiadas, bilhetes e excursões de um dia pela zona, com opiniões de outros viajantes. Reserva-se online na GetYourGuide.'),
    ('ca', 'description', 'Visites guiades, entrades i excursions d''un dia per la zona, amb opinions d''altres viatgers. Es reserva en línia a GetYourGuide.'),
    ('ar', 'description', 'جولات مع مرشد وتذاكر دخول ورحلات ليوم واحد في المنطقة، مع تقييمات مسافرين آخرين. الحجز عبر الإنترنت على GetYourGuide.'),
    ('ru', 'description', 'Экскурсии с гидом, билеты и однодневные поездки по окрестностям с отзывами других путешественников. Бронирование онлайн на GetYourGuide.'),
    ('uk', 'description', 'Екскурсії з гідом, квитки та одноденні поїздки околицями з відгуками інших мандрівників. Бронювання онлайн на GetYourGuide.'),
    ('zh', 'description', '周边的导览游、门票和一日游，附有其他旅客的评价。可在 GetYourGuide 在线预订。'),
    ('ja', 'description', '周辺のガイド付きツアー、入場チケット、日帰り旅行を、ほかの旅行者の口コミとあわせてご覧いただけます。GetYourGuideでオンライン予約できます。'),
    ('ko', 'description', '주변 가이드 투어, 입장권, 당일 여행을 다른 여행자들의 후기와 함께 확인하세요. GetYourGuide에서 온라인으로 예약할 수 있습니다.'),

    ('es', 'cta_label', 'Ver actividades'),
    ('en', 'cta_label', 'See activities'),
    ('fr', 'cta_label', 'Voir les activités'),
    ('de', 'cta_label', 'Aktivitäten ansehen'),
    ('it', 'cta_label', 'Vedi le attività'),
    ('pt', 'cta_label', 'Ver atividades'),
    ('ca', 'cta_label', 'Veure activitats'),
    ('ar', 'cta_label', 'عرض الأنشطة'),
    ('ru', 'cta_label', 'Смотреть варианты'),
    ('uk', 'cta_label', 'Переглянути варіанти'),
    ('zh', 'cta_label', '查看活动'),
    ('ja', 'cta_label', 'アクティビティを見る'),
    ('ko', 'cta_label', '액티비티 보기')
)
INSERT OR IGNORE INTO translations (entity_id, entity_type, language_code, field, value)
SELECT p.id, 'poi', tr.lang, tr.field, tr.value
FROM guide_pois p
CROSS JOIN tr
WHERE p.id IN (
    'poi_gyg_benalmadena', 'poi_gyg_fuengirola', 'poi_gyg_malaga', 'poi_gyg_marbella',
    'poi_gyg_mijas', 'poi_gyg_nerja', 'poi_gyg_rincon_de_la_victoria', 'poi_gyg_ronda',
    'poi_gyg_torremolinos', 'poi_gyg_torrox'
);
