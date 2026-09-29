-- 0096 — Índices de guide/TV: quitar los que solo cuestan escrituras, añadir los que faltan.
--
-- Por qué: en D1 cada índice cuenta como una fila escrita más por INSERT (el panel
-- de producción mostraba ~7 filas escritas por cada INSERT de guide_sessions), y el
-- free tier son 100.000 filas escritas/día. Además hay lecturas que recorren tablas
-- enteras por falta de índice. Medido en producción (sep-2026): listPOIs leía 3.588
-- filas para 92 POIs porque guide_poi_media no tiene índice en poi_id.
--
-- Idempotente. Sin datos: solo índices. No hay ledger de migraciones (CLAUDE.md §3):
-- comprueba el estado real con `SELECT name FROM sqlite_master WHERE type='index'`.

-- ---------------------------------------------------------------------------
-- 1. Índices que faltan (lecturas que hoy recorren la tabla entera)
-- ---------------------------------------------------------------------------
-- loadPoiMedia (WHERE poi_id IN (...) ORDER BY order_index) y la subconsulta de
-- portada de listPOIs, que se ejecuta una vez por POI.
CREATE INDEX IF NOT EXISTS idx_guide_poi_media_poi
  ON guide_poi_media(poi_id, order_index);

-- Fotos de cada bloque de la guía (WHERE apartment_info_id = ?).
CREATE INDEX IF NOT EXISTS idx_guide_apartment_media_info
  ON guide_apartment_media(apartment_info_id, order_index);

-- Purga nocturna (scheduled() en worker.js): filtra por fecha sola y, con los
-- índices actuales (todos empiezan por apartment_id/zone_id/visitor...), recorre
-- las tablas enteras cada noche. Con estos, el coste pasa a ser el de las filas
-- que se borran de verdad. Compensado abajo: guide_sessions cambia un índice por otro.
CREATE INDEX IF NOT EXISTS idx_guide_sessions_started
  ON guide_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_guide_section_views_created
  ON guide_section_views(created_at);
CREATE INDEX IF NOT EXISTS idx_guide_tv_events_created
  ON guide_tv_events(created_at);
CREATE INDEX IF NOT EXISTS idx_guide_intents_created
  ON guide_affiliate_intents(created_at);

-- ---------------------------------------------------------------------------
-- 2. Índices redundantes o muertos (solo suman escrituras)
-- ---------------------------------------------------------------------------
-- device_fingerprint ya no se escribe (workerGuideTracking.js, "Analítica anónima
-- por defecto"): el índice se mantenía sobre una columna siempre NULL para
-- consultas que ya no existen.
DROP INDEX IF EXISTS idx_guide_sessions_fingerprint;

-- slug es UNIQUE en la tabla: SQLite ya creó un índice único automático, el
-- explícito es una copia.
DROP INDEX IF EXISTS idx_guide_apartments_slug;

-- pairing_code es UNIQUE NOT NULL en la tabla: mismo caso.
DROP INDEX IF EXISTS idx_guide_tv_devices_pairing_code;

-- (entity_id, entity_type) es el prefijo de la PRIMARY KEY de translations
-- (entity_id, entity_type, language_code, field): cualquier búsqueda que lo usaba
-- sigue usando la PK. translations es la tabla más escrita de guide (traducciones
-- a 13 idiomas), así que cada índice de menos abarata cada guardado.
DROP INDEX IF EXISTS idx_translations_entity;
