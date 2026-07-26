-- =====================================================
-- MIGRATION 0069: Rendimiento de analitica (post-auditoria Cloudflare 2026-07-26)
-- =====================================================
-- 1. guide_affiliate_intents no tenia indice por session_id: el panel admin
--    (getSessions en workerGuideAdmin.js) hace una subquery COUNT(*) correlacionada
--    por cada sesion devuelta -> full scan de la tabla por cada fila del listado.
--    Con LIMIT 200 (el default), son hasta 200 full scans en una sola carga.
CREATE INDEX IF NOT EXISTS idx_guide_intents_session
    ON guide_affiliate_intents(session_id);

-- 2. idx_guide_pois_zone e idx_guide_pois_zone_active son identicos
--    (zone_id, is_active, order_index), creados en migraciones distintas
--    (0050 y 0053) sin darse cuenta de que ya existia. Un indice duplicado
--    no aporta nada a las lecturas y penaliza cada INSERT/UPDATE de guide_pois
--    al mantenerse dos veces la misma estructura. Se conserva
--    idx_guide_pois_zone_active (nombre mas descriptivo, migracion mas reciente).
DROP INDEX IF EXISTS idx_guide_pois_zone;
