-- =====================================================
-- MIGRATION 0085: Teléfonos por defecto + corrección de nombre de categoría
-- =====================================================
-- Por qué: el checklist de teléfonos (migración 0084) partía vacío — el
-- anfitrión tenía que añadir CADA número a mano, agencia incluida. Eso se
-- sentía "como un simple agregador" en vez de un checklist de verdad.
-- Esta migración añade una categoría 'emergency' (112) al catálogo y
-- siembra 4 números por defecto en TODOS los apartamentos existentes:
--   emergency=112, police=092, firefighters=080, ambulance=061
-- más el teléfono de la agencia (guide_agencies.contact_phone) cuando existe,
-- SIEMPRE primero (order_index=10, ya el más bajo del catálogo desde 0084).
-- El anfitrión puede seguir borrando cualquiera de estos desde el checklist
-- (DELETE /guide/admin/apartments/:id/phones/:pid, sin cambios) — esto solo
-- cambia el estado inicial.
--
-- IDs deterministas (phone_{apartment_id}_{category_key}, mismo patrón que
-- info_${aptId}_${info_key} en guide_apartment_info) + INSERT OR IGNORE: si
-- un anfitrión ya había añadido a mano un número para alguna de estas
-- categorías antes de esta migración, esa fila YA existe (con otro id, el
-- que generó upsertApartmentPhone) y esta migración añade una fila más al
-- lado — no hay UNIQUE(apartment_id, category_key) que lo impida a
-- propósito, porque 'custom' sí admite varias filas. Verificado antes de
-- escribir esto: 0 filas en guide_apartment_phones en producción, así que
-- hoy esto no puede duplicar nada.
--
-- workerGuideAdmin.js createApartment siembra estos mismos 4 números (+
-- agencia) para apartamentos NUEVOS a partir de ahora, así que esta
-- migración es solo el backfill de los que ya existían.
--
-- Aparte: 'door_code' llevaba desde 0083 con el nombre 'es' "Código de
-- acceso" en el catálogo, mientras que el guest-facing (i18n.ts,
-- door_code_title) siempre dijo "Código de Entrada" — un anfitrión buscando
-- "código de entrada" entre 58 categorías no reconocía "código de acceso"
-- como la misma cosa. Alineado aquí para que el picker del admin diga lo
-- mismo que ve el huésped.
-- =====================================================

UPDATE translations SET value = 'Código de Entrada'
WHERE entity_id = 'door_code' AND entity_type = 'info_category'
  AND language_code = 'es' AND field = 'name';

-- ---------------------------------------------------------
-- Nueva categoría de teléfono: emergencias generales (112)
-- ---------------------------------------------------------
INSERT OR IGNORE INTO guide_phone_categories (key, icon_name, order_index) VALUES
('emergency', 'emergency', 15);

INSERT OR IGNORE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
('emergency', 'phone_category', 'es', 'name', 'Emergencias'),
('emergency', 'phone_category', 'en', 'name', 'Emergency'),
('emergency', 'phone_category', 'fr', 'name', 'Urgences'),
('emergency', 'phone_category', 'de', 'name', 'Notruf'),
('emergency', 'phone_category', 'it', 'name', 'Emergenza'),
('emergency', 'phone_category', 'pt', 'name', 'Emergência'),
('emergency', 'phone_category', 'ca', 'name', 'Emergències'),
('emergency', 'phone_category', 'ar', 'name', 'الطوارئ'),
('emergency', 'phone_category', 'ru', 'name', 'Экстренная служба'),
('emergency', 'phone_category', 'uk', 'name', 'Екстрена служба'),
('emergency', 'phone_category', 'zh', 'name', '紧急求助'),
('emergency', 'phone_category', 'ja', 'name', '緊急通報'),
('emergency', 'phone_category', 'ko', 'name', '긴급 신고');

-- ---------------------------------------------------------
-- Backfill: 4 números por defecto en todos los apartamentos existentes
-- ---------------------------------------------------------
INSERT OR IGNORE INTO guide_apartment_phones (id, apartment_id, category_key, phone_number, order_index)
SELECT 'phone_' || id || '_emergency', id, 'emergency', '112', 0 FROM guide_apartments;

INSERT OR IGNORE INTO guide_apartment_phones (id, apartment_id, category_key, phone_number, order_index)
SELECT 'phone_' || id || '_police', id, 'police', '092', 0 FROM guide_apartments;

INSERT OR IGNORE INTO guide_apartment_phones (id, apartment_id, category_key, phone_number, order_index)
SELECT 'phone_' || id || '_firefighters', id, 'firefighters', '080', 0 FROM guide_apartments;

INSERT OR IGNORE INTO guide_apartment_phones (id, apartment_id, category_key, phone_number, order_index)
SELECT 'phone_' || id || '_ambulance', id, 'ambulance', '061', 0 FROM guide_apartments;

-- Teléfono de la agencia — solo cuando la agencia tiene contact_phone relleno,
-- para no crear una fila con número vacío/NULL.
INSERT OR IGNORE INTO guide_apartment_phones (id, apartment_id, category_key, phone_number, order_index)
SELECT 'phone_' || a.id || '_agency', a.id, 'agency', ag.contact_phone, 0
FROM guide_apartments a
JOIN guide_agencies ag ON a.agency_id = ag.id
WHERE ag.contact_phone IS NOT NULL AND TRIM(ag.contact_phone) != '';
