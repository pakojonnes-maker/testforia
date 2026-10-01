-- =============================================================================
-- 0097 — Borrado de contenido de demo y de POIs erróneos (2026-10-01)
-- =============================================================================
-- Destructivo e irreversible. Copia de las 455 filas afectadas, sacada justo antes,
-- en scripts/poi-seed/.cache/backup-borrado-2026-10-01.json (local, fuera de git).
--
-- Qué se borra:
--   1. La agencia de prueba «Renters Costa Sol» (agency_test) y sus dos pisos de
--      Nerja: apt_nerja_1 (piso-playa-burriana-2b-ddda02db, TV NDFY9M) y
--      apt_nerja_2 (atico-balcon-europa-2f0ec9ff). Sin personal, comisiones,
--      tienda, pedidos ni fotos en R2.
--   2. Las tres experiencias de demo de Nerja (exp_kayak, exp_buggy, exp_cooking):
--      enlace a example-buggy-nerja.com y WhatsApp a teléfonos de relleno.
--   3. Tres POIs de Benalmádena: el Teleférico duplicado de Google
--      (poi_mubz2kyt_fni4me; se queda poi_benalmadena_teleferico), el skatepark
--      (poi_mtybk38s_6y7sdx) y el polideportivo (poi_mubz2lwv_a73izm).
--
-- Espejo de deleteApartment() y deletePoi() de workerGuideAdmin.js (hijos antes
-- que padres: D1 comprueba las claves ajenas al momento). Ninguna de estas filas
-- tiene comisiones (comprobado), así que nada del ledger se toca salvo quitarle
-- la referencia a intents que desaparecen, como hace deleteApartment().
--
-- Después de aplicarlo hay que borrar en KV las claves de los dos slugs
-- (guide:{slug}:* y ver:apt:{slug}): si no, sus URLs siguen sirviendo la guía,
-- WiFi incluido, hasta que caduquen. Ver la memoria kv-cache-slug-huerfana.
-- =============================================================================

-- 1. translations (EAV sin claves ajenas)
DELETE FROM translations WHERE entity_type = 'apartment_info'
  AND entity_id IN (SELECT id FROM guide_apartment_info WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2'));
DELETE FROM translations WHERE entity_type = 'guide_step'
  AND entity_id IN (SELECT s.id FROM guide_info_steps s
                    JOIN guide_apartment_info i ON s.apartment_info_id = i.id
                    WHERE i.apartment_id IN ('apt_nerja_1','apt_nerja_2'));
DELETE FROM translations WHERE entity_type = 'welcome_modal'
  AND entity_id IN (SELECT id FROM guide_welcome_modals WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2'));
DELETE FROM translations WHERE entity_type = 'store_item'
  AND entity_id IN (SELECT id FROM guide_store_items WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2') OR agency_id = 'agency_test');
DELETE FROM translations WHERE entity_type = 'poi'
  AND entity_id IN ('exp_kayak','exp_buggy','exp_cooking','poi_mubz2kyt_fni4me','poi_mtybk38s_6y7sdx','poi_mubz2lwv_a73izm');

-- 2. contenido de las guías de los pisos
DELETE FROM guide_info_step_media WHERE step_id IN (
  SELECT s.id FROM guide_info_steps s
  JOIN guide_apartment_info i ON s.apartment_info_id = i.id WHERE i.apartment_id IN ('apt_nerja_1','apt_nerja_2'));
DELETE FROM guide_info_steps WHERE apartment_info_id IN (
  SELECT id FROM guide_apartment_info WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2'));
DELETE FROM guide_apartment_media WHERE apartment_info_id IN (
  SELECT id FROM guide_apartment_info WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2'));
DELETE FROM guide_apartment_info WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2');

-- 3. resto de lo que cuelga de los pisos
DELETE FROM guide_apartment_phones WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2');
DELETE FROM guide_welcome_modals WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2');
DELETE FROM guide_apartment_items WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2');
DELETE FROM guide_store_order_items WHERE order_id IN (
  SELECT id FROM guide_store_orders WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2'));
DELETE FROM guide_store_orders WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2');
DELETE FROM guide_store_items WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2') OR agency_id = 'agency_test';
DELETE FROM guide_tv_tile_images WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2');
DELETE FROM guide_tv_events WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2');
DELETE FROM guide_tv_devices WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2');

-- 4. analítica de los pisos y de las experiencias de demo
UPDATE guide_commission_ledger SET intent_id = NULL WHERE intent_id IN (
  SELECT id FROM guide_affiliate_intents
  WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2')
     OR agency_id = 'agency_test'
     OR session_id IN (SELECT id FROM guide_sessions WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2'))
     OR (target_type = 'experience' AND target_id IN ('exp_kayak','exp_buggy','exp_cooking','poi_mubz2kyt_fni4me','poi_mtybk38s_6y7sdx','poi_mubz2lwv_a73izm')));
DELETE FROM guide_affiliate_intents
  WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2')
     OR agency_id = 'agency_test'
     OR session_id IN (SELECT id FROM guide_sessions WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2'))
     OR (target_type = 'experience' AND target_id IN ('exp_kayak','exp_buggy','exp_cooking','poi_mubz2kyt_fni4me','poi_mtybk38s_6y7sdx','poi_mubz2lwv_a73izm'));
DELETE FROM guide_section_views
  WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2')
     OR session_id IN (SELECT id FROM guide_sessions WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2'));
DELETE FROM guide_sessions WHERE apartment_id IN ('apt_nerja_1','apt_nerja_2');
DELETE FROM guide_tv_events WHERE event_type = 'poi_select'
  AND target_id IN ('exp_kayak','exp_buggy','exp_cooking','poi_mubz2kyt_fni4me','poi_mtybk38s_6y7sdx','poi_mubz2lwv_a73izm');

-- 5. los POIs (deletePoi: cupones, overrides y media antes que la fila)
DELETE FROM guide_coupons WHERE poi_id IN ('exp_kayak','exp_buggy','exp_cooking','poi_mubz2kyt_fni4me','poi_mtybk38s_6y7sdx','poi_mubz2lwv_a73izm');
DELETE FROM guide_apartment_items WHERE item_type = 'poi'
  AND item_id IN ('exp_kayak','exp_buggy','exp_cooking','poi_mubz2kyt_fni4me','poi_mtybk38s_6y7sdx','poi_mubz2lwv_a73izm');
DELETE FROM guide_poi_media WHERE poi_id IN ('exp_kayak','exp_buggy','exp_cooking','poi_mubz2kyt_fni4me','poi_mtybk38s_6y7sdx','poi_mubz2lwv_a73izm');
DELETE FROM guide_pois WHERE id IN ('exp_kayak','exp_buggy','exp_cooking','poi_mubz2kyt_fni4me','poi_mtybk38s_6y7sdx','poi_mubz2lwv_a73izm');

-- 6. los pisos y la agencia
DELETE FROM guide_apartments WHERE id IN ('apt_nerja_1','apt_nerja_2');
DELETE FROM admin_invitations WHERE agency_id = 'agency_test';
DELETE FROM guide_agency_staff WHERE agency_id = 'agency_test';
DELETE FROM guide_agencies WHERE id = 'agency_test';
