-- =====================================================
-- POI MEDIA — WIKIMEDIA/WIKIPEDIA SOURCED IMAGES — MIGRATION 0061
-- =====================================================
-- One PRIMARY_IMAGE per POI, uploaded to R2 mediabucket under guide/pois/.
-- Source: Wikipedia lead images (es.wikipedia.org REST summary API), which are
-- themselves hosted on Wikimedia Commons under free licenses (CC BY-SA / CC0 / PD).
-- 39 of the 70 guide_pois rows got a verified photo match; the remainder had no
-- suitable free lead image found automatically and are left without media —
-- to be filled manually via the admin panel image upload.
-- =====================================================

-- NOTE: poi_benalmadena_colomares / _parque_paloma / _stupa images were fetched
-- and uploaded to R2 (guide/pois/*.jpg) but are NOT inserted here: those POI ids
-- don't actually exist in production guide_pois (migration 0060 assumed they were
-- already present from 0055, but 0055 was apparently only ever applied locally).
-- The files are ready in R2 for whenever that zone_benalmadena data gap is fixed.
INSERT OR IGNORE INTO guide_poi_media (id, poi_id, r2_key, media_type, role, order_index) VALUES
  ('poimedia_benalmadena_mariposario', 'poi_benalmadena_mariposario', 'guide/pois/poi_benalmadena_mariposario.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_benalmadena_selwo_marina', 'poi_benalmadena_selwo_marina', 'guide/pois/poi_benalmadena_selwo_marina.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_benalmadena_teleferico', 'poi_benalmadena_teleferico', 'guide/pois/poi_benalmadena_teleferico.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_fuengirola_bioparc', 'poi_fuengirola_bioparc', 'guide/pois/poi_fuengirola_bioparc.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_fuengirola_boliches', 'poi_fuengirola_boliches', 'guide/pois/poi_fuengirola_boliches.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_fuengirola_castillo_sohail', 'poi_fuengirola_castillo_sohail', 'guide/pois/poi_fuengirola_castillo_sohail.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_alcazaba', 'poi_malaga_alcazaba', 'guide/pois/poi_malaga_alcazaba.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_atarazanas', 'poi_malaga_atarazanas', 'guide/pois/poi_malaga_atarazanas.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_casa_natal_picasso', 'poi_malaga_casa_natal_picasso', 'guide/pois/poi_malaga_casa_natal_picasso.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_catedral', 'poi_malaga_catedral', 'guide/pois/poi_malaga_catedral.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_cementerio_ingles', 'poi_malaga_cementerio_ingles', 'guide/pois/poi_malaga_cementerio_ingles.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_concepcion', 'poi_malaga_concepcion', 'guide/pois/poi_malaga_concepcion.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_cripta_victoria', 'poi_malaga_cripta_victoria', 'guide/pois/poi_malaga_cripta_victoria.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_gibralfaro', 'poi_malaga_gibralfaro', 'guide/pois/poi_malaga_gibralfaro.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_larios', 'poi_malaga_larios', 'guide/pois/poi_malaga_larios.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_malagueta', 'poi_malaga_malagueta', 'guide/pois/poi_malaga_malagueta.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_mirador_gibralfaro', 'poi_malaga_mirador_gibralfaro', 'guide/pois/poi_malaga_mirador_gibralfaro.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_muelle_uno', 'poi_malaga_muelle_uno', 'guide/pois/poi_malaga_muelle_uno.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_museo_automovilistico', 'poi_malaga_museo_automovilistico', 'guide/pois/poi_malaga_museo_automovilistico.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_museo_picasso', 'poi_malaga_museo_picasso', 'guide/pois/poi_malaga_museo_picasso.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_plaza_constitucion', 'poi_malaga_plaza_constitucion', 'guide/pois/poi_malaga_plaza_constitucion.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_plaza_merced', 'poi_malaga_plaza_merced', 'guide/pois/poi_malaga_plaza_merced.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_pompidou', 'poi_malaga_pompidou', 'guide/pois/poi_malaga_pompidou.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_santo_cristo', 'poi_malaga_santo_cristo', 'guide/pois/poi_malaga_santo_cristo.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_soho', 'poi_malaga_soho', 'guide/pois/poi_malaga_soho.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_teatro_romano', 'poi_malaga_teatro_romano', 'guide/pois/poi_malaga_teatro_romano.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_malaga_thyssen', 'poi_malaga_thyssen', 'guide/pois/poi_malaga_thyssen.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_marbella_basilica_vega', 'poi_marbella_basilica_vega', 'guide/pois/poi_marbella_basilica_vega.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_marbella_encarnacion', 'poi_marbella_encarnacion', 'guide/pois/poi_marbella_encarnacion.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_marbella_murallas', 'poi_marbella_murallas', 'guide/pois/poi_marbella_murallas.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_marbella_museo_grabado', 'poi_marbella_museo_grabado', 'guide/pois/poi_marbella_museo_grabado.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_marbella_naranjos', 'poi_marbella_naranjos', 'guide/pois/poi_marbella_naranjos.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_marbella_puerto_banus', 'poi_marbella_puerto_banus', 'guide/pois/poi_marbella_puerto_banus.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_marbella_villa_romana', 'poi_marbella_villa_romana', 'guide/pois/poi_marbella_villa_romana.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_torremolinos_bajondillo', 'poi_torremolinos_bajondillo', 'guide/pois/poi_torremolinos_bajondillo.jpg', 'image', 'PRIMARY_IMAGE', 0),
  ('poimedia_torremolinos_carihuela', 'poi_torremolinos_carihuela', 'guide/pois/poi_torremolinos_carihuela.jpg', 'image', 'PRIMARY_IMAGE', 0);
