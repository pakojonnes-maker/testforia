-- =====================================================
-- MIGRATION 0106: la pestaña Conserje entra en guide_section_views
-- =====================================================
-- La guía del huésped tiene cinco pestañas (TAB_ORDER en
-- apps/guide/src/pages/GuidebookPage.tsx): info, discover, restaurants,
-- services y chat. Al cambiar de pestaña manda la clave tal cual a
-- POST /guide/track/section-view, pero ni el worker ni esta tabla conocían
-- 'chat' (el Conserje llegó después que la 0052): el worker contestaba 400
-- «Invalid section», la guía se traga el error (es best-effort) y abrir el
-- Conserje no dejaba rastro. Comprobado en producción el 2026-10-11: 502 filas,
-- ninguna con section = 'chat'.
--
-- SQLite NO permite modificar un CHECK con ALTER TABLE: tabla nueva, INSERT
-- SELECT, DROP, RENAME, como en la 0093. Sin abrir transacción a mano: D1 remoto
-- rechaza el BEGIN y ya envuelve el fichero entero en la suya. Y sin escribir esa
-- sentencia con sus dos palabras ni en un comentario: `wrangler d1 execute --local`
-- busca el texto a pelo y rechaza el fichero entero («contains several
-- transactions»). Le pasó al primer borrador de esta migración.
--
-- Los índices se van con el DROP y hay que volver a crearlos DESPUÉS del
-- RENAME (los nombres de índice son globales: antes chocarían con los de la
-- tabla vieja). Son los tres que hay en producción según sqlite_master, no los
-- dos de la 0052: idx_guide_section_views_created no sale en ninguna migración
-- numerada.
--
-- Ninguna otra tabla, vista ni trigger referencia guide_section_views
-- (comprobado en sqlite_master), y ninguna de las 502 filas apunta a una sesión o
-- a un piso que ya no exista, así que la copia pasa las dos FK tal cual.
--
-- ORDEN: esta migración ANTES que el worker que acepta 'chat'. Al revés, el
-- INSERT choca con el CHECK viejo y el endpoint devuelve 500 en vez de 400.

DROP TABLE IF EXISTS guide_section_views_new;

CREATE TABLE guide_section_views_new (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  apartment_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  -- Mismas claves que TabKey / TAB_ORDER en apps/guide/src/pages/GuidebookPage.tsx,
  -- que VALID_SECTIONS en workerGuideTracking.js y que SECTION_LABELS en
  -- apps/admin/src/pages/guide/GuideAgencyDashboard.tsx. Los cuatro se mueven juntos.
  section TEXT NOT NULL CHECK(section IN ('info', 'discover', 'restaurants', 'services', 'chat')),
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES guide_sessions(id),
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id)
);

INSERT INTO guide_section_views_new (id, session_id, apartment_id, zone_id, section, duration_seconds, created_at)
SELECT id, session_id, apartment_id, zone_id, section, duration_seconds, created_at
FROM guide_section_views;

DROP TABLE guide_section_views;

ALTER TABLE guide_section_views_new RENAME TO guide_section_views;

CREATE INDEX idx_guide_section_views_apt ON guide_section_views(apartment_id, section, created_at);
CREATE INDEX idx_guide_section_views_session ON guide_section_views(session_id);
CREATE INDEX idx_guide_section_views_created ON guide_section_views(created_at);
