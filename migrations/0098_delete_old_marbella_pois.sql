-- =============================================================================
-- 0098 — Borrado de los POIs antiguos de Marbella (2026-10-01)
-- =============================================================================
-- Los 12 POIs que sembró 0060 en zone_marbella tenían coordenadas escritas a mano,
-- sin place_id de Google, precios con «desde» y un museo cerrado desde 2018 (el
-- del Bonsái, que figuraba como reservable). La zona se rehace desde cero con
-- scripts/poi-seed (data/marbella.json): esta migración va SIEMPRE justo antes de
-- scripts/poi-seed/out/marbella.sql, para que Marbella no se quede vacía.
--
-- Copia de las 487 filas y de las 7 fotos de R2 en
-- scripts/poi-seed/.cache/backup-marbella-2026-10-01/ (local, fuera de git).
-- Ninguno tenía cupones, overrides, clics ni comisiones (comprobado). La zona no
-- tiene restaurantes en guide_pois. Todo va por id explícito: relanzarla después
-- del lote no puede tocar los POIs nuevos (sus ids son distintos).
--
-- Espejo de deletePoi() (workerGuideAdmin.js). Las fotos de R2 se borran aparte:
--   npx wrangler r2 object delete mediabucket/guide/pois/poi_marbella_<id>.jpg --remote
-- para basilica_vega, encarnacion, murallas, museo_grabado, naranjos,
-- puerto_banus y villa_romana.
-- =============================================================================

DELETE FROM translations WHERE entity_type = 'poi' AND entity_id IN (
  'poi_marbella_avenida_mar','poi_marbella_basilica_vega','poi_marbella_encarnacion',
  'poi_marbella_fontanilla','poi_marbella_murallas','poi_marbella_museo_bonsai',
  'poi_marbella_museo_grabado','poi_marbella_museo_ralli','poi_marbella_naranjos',
  'poi_marbella_puerto_banus','poi_marbella_termas','poi_marbella_villa_romana');
DELETE FROM guide_affiliate_intents WHERE target_type = 'experience' AND target_id IN (
  'poi_marbella_museo_bonsai','poi_marbella_museo_grabado');
DELETE FROM guide_tv_events WHERE event_type = 'poi_select' AND target_id IN (
  'poi_marbella_avenida_mar','poi_marbella_basilica_vega','poi_marbella_encarnacion',
  'poi_marbella_fontanilla','poi_marbella_murallas','poi_marbella_museo_bonsai',
  'poi_marbella_museo_grabado','poi_marbella_museo_ralli','poi_marbella_naranjos',
  'poi_marbella_puerto_banus','poi_marbella_termas','poi_marbella_villa_romana');
DELETE FROM guide_coupons WHERE poi_id IN (
  'poi_marbella_avenida_mar','poi_marbella_basilica_vega','poi_marbella_encarnacion',
  'poi_marbella_fontanilla','poi_marbella_murallas','poi_marbella_museo_bonsai',
  'poi_marbella_museo_grabado','poi_marbella_museo_ralli','poi_marbella_naranjos',
  'poi_marbella_puerto_banus','poi_marbella_termas','poi_marbella_villa_romana');
DELETE FROM guide_apartment_items WHERE item_type = 'poi' AND item_id IN (
  'poi_marbella_avenida_mar','poi_marbella_basilica_vega','poi_marbella_encarnacion',
  'poi_marbella_fontanilla','poi_marbella_murallas','poi_marbella_museo_bonsai',
  'poi_marbella_museo_grabado','poi_marbella_museo_ralli','poi_marbella_naranjos',
  'poi_marbella_puerto_banus','poi_marbella_termas','poi_marbella_villa_romana');
DELETE FROM guide_poi_media WHERE poi_id IN (
  'poi_marbella_avenida_mar','poi_marbella_basilica_vega','poi_marbella_encarnacion',
  'poi_marbella_fontanilla','poi_marbella_murallas','poi_marbella_museo_bonsai',
  'poi_marbella_museo_grabado','poi_marbella_museo_ralli','poi_marbella_naranjos',
  'poi_marbella_puerto_banus','poi_marbella_termas','poi_marbella_villa_romana');
DELETE FROM guide_pois WHERE id IN (
  'poi_marbella_avenida_mar','poi_marbella_basilica_vega','poi_marbella_encarnacion',
  'poi_marbella_fontanilla','poi_marbella_murallas','poi_marbella_museo_bonsai',
  'poi_marbella_museo_grabado','poi_marbella_museo_ralli','poi_marbella_naranjos',
  'poi_marbella_puerto_banus','poi_marbella_termas','poi_marbella_villa_romana');
