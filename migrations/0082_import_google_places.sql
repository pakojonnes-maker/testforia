-- 0082_import_google_places.sql
--
-- Soporte para el importador de POIs desde Google Maps (admin superadmin).
-- El importador resuelve una URL de Google Maps a un place_id, trae los datos vía
-- Places API (New), y los mapea a guide_pois reutilizando createPOI/updatePOI
-- existentes en workerGuideAdmin.js. google_place_id, google_rating,
-- google_rating_count, source y external_id YA EXISTEN en guide_pois desde antes
-- (ver BDschemaFinal.sql) — esta migración solo añade lo que faltaba:
--
-- 1. google_synced_at: cuándo se importó/resincronizó por última vez desde Google,
--    para poder mostrarlo en el admin y, más adelante, decidir qué está desactualizado.
-- 2. Índice único parcial sobre google_place_id: evita crear dos veces el mismo POI
--    de Google si se pega la misma URL (o una equivalente que resuelve al mismo
--    place_id) en dos importaciones distintas. Parcial (WHERE ... NOT NULL) porque
--    los POIs manuales no tienen place_id y no deben chocar entre sí.
--    Verificado antes de escribir esta migración: no hay duplicados de
--    google_place_id en producción (SELECT ... GROUP BY ... HAVING COUNT(*) > 1
--    devolvió 0 filas), así que el índice se puede crear sin conflicto.

ALTER TABLE guide_pois ADD COLUMN google_synced_at TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_guide_pois_google_place_id
  ON guide_pois(google_place_id) WHERE google_place_id IS NOT NULL;
