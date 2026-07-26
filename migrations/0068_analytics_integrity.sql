-- =====================================================
-- MIGRATION 0068: Integridad de analitica + atribucion cruzada
-- =====================================================
-- Contexto (auditoria del 2026-07-26 contra produccion):
--   * La recurrencia se contaba a nivel de SESION, no de VISITANTE: un visitante
--     con 3 sesiones aparecia a la vez como "nuevo" y como "recurrente"
--     (394 unicos reales vs 394+63=457 declarados).
--   * El guidebook identificaba dispositivos con un hash de 32 bits de
--     UA+idioma+pantalla+tz: 66 sesiones colapsaban en 9 identidades.
--   * No habia forma de saber que un huesped del apartamento X abrio el menu
--     del restaurante Y: los dos mundos no compartian ningun identificador.
--   * Un unico dispositivo de pruebas acumulaba 184 de 1009 sesiones (18%) y
--     contaminaba todas las medias del panel.
--
-- Esta migracion solo ANADE columnas e indices. No borra ni reescribe datos.
-- =====================================================

-- -----------------------------------------------------
-- 1. sessions: atribucion cruzada (guide/TV -> menu)
-- -----------------------------------------------------
-- referral_source: 'guide' | 'tv' | 'qr' | 'direct' (NULL = desconocido/legacy)
-- Permite responder "cuantas sesiones de menu vienen del apartamento X"
-- y, encadenando con cart_sessions, cuanto negocio genera cada alojamiento.
ALTER TABLE sessions ADD COLUMN referral_source TEXT;
ALTER TABLE sessions ADD COLUMN referral_apartment_id TEXT;
ALTER TABLE sessions ADD COLUMN referral_session_id TEXT;

-- Marca de trafico interno (desarrollo, pruebas, personal del restaurante).
-- Se excluye de todos los KPIs para que las medias sean reales.
ALTER TABLE sessions ADD COLUMN is_internal INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sessions_referral_apt
    ON sessions(referral_apartment_id, started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_referral_source
    ON sessions(restaurant_id, referral_source, started_at);

-- -----------------------------------------------------
-- 2. guide_sessions: identidad estable + recurrencia
-- -----------------------------------------------------
-- visitor_id es un UUID persistido en localStorage por apps/guide (igual que
-- vt_visitor_id en el menu). device_fingerprint se mantiene solo como fallback
-- para navegadores sin storage, ya no como identidad principal.
ALTER TABLE guide_sessions ADD COLUMN visitor_id TEXT;
ALTER TABLE guide_sessions ADD COLUMN visit_count INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_guide_sessions_visitor
    ON guide_sessions(visitor_id, apartment_id);

-- -----------------------------------------------------
-- 3. guide_tv_events: que se selecciono y en que sesion de TV
-- -----------------------------------------------------
-- Sin target_id, 'poi_select' registraba que alguien pulso un POI pero no cual.
-- tv_session_id agrupa los eventos de un mismo "encendido" (la app genera uno
-- nuevo tras 30 min de inactividad del mando), para poder pasar de contar
-- eventos sueltos a contar estancias.
ALTER TABLE guide_tv_events ADD COLUMN target_id TEXT;
ALTER TABLE guide_tv_events ADD COLUMN tv_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_guide_tv_events_session
    ON guide_tv_events(tv_session_id);

-- -----------------------------------------------------
-- 4. Marcar como interno el dispositivo de pruebas detectado
-- -----------------------------------------------------
-- Un solo visitor_id concentra 184 de las 1009 sesiones historicas. Se marca
-- para sacarlo de las medias sin borrar el dato.
UPDATE sessions SET is_internal = 1
WHERE visitor_id IN (
    SELECT visitor_id FROM sessions
    WHERE visitor_id IS NOT NULL
    GROUP BY visitor_id
    HAVING COUNT(*) >= 100
);

-- -----------------------------------------------------
-- 5. Tablas muertas (decision pendiente, NO se borran aqui)
-- -----------------------------------------------------
-- Verificado en produccion el 2026-07-26: 0 filas y 0 escrituras en todo el
-- repo. El codigo que las leia se ha eliminado en este mismo cambio, asi que
-- ya no afectan a ningun panel. Se dejan por si hay que recuperar historico;
-- descomenta cuando quieras cerrarlas del todo.
--
--   DROP TABLE IF EXISTS entry_exit_flows;   -- 0 filas, panel UserBehaviorFlow
--   DROP TABLE IF EXISTS daily_analytics;    -- 34 filas congeladas en 2026-01-18
--
-- qr_scans NO se borra: a partir de este cambio si se escribe (ver
-- workerTracking.js), en cuanto los QR generados incluyan ?qr=<qr_code_id>.
