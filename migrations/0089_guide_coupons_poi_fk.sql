-- guide_coupons: repunta la FK de guide_experiences(id) a guide_pois(id)
--
-- Por qué: guide_experiences ya NO EXISTE en producción (confirmado con
-- `wrangler d1 export --remote --no-data`: 85 tablas, ninguna se llama así).
-- Las experiencias se unificaron dentro de guide_pois en la migración
-- 0059_unify_guide_pois.sql, que ya añadió guide_coupons.poi_id y lo
-- backfilleó con `UPDATE guide_coupons SET poi_id = experience_id` (las filas
-- de experiencia se copiaron a guide_pois REUSANDO SU ID, así que poi_id y
-- experience_id valen lo mismo para cualquier fila existente). Lo que quedó
-- sin arreglar es la FK: `FOREIGN KEY (experience_id) REFERENCES
-- guide_experiences(id)` sigue apuntando a una tabla fantasma. Con
-- PRAGMA foreign_keys activo, cualquier INSERT/UPDATE en guide_coupons
-- revienta contra esa tabla inexistente. Hoy no se nota (0 filas en
-- producción, ningún worker*.js ni apps/* escribe en guide_coupons todavía
-- - comprobado por grep) pero es una mina para cuando se implemente la
-- gestión de cupones.
--
-- SQLite no permite ALTER de una foreign key, así que hace falta el baile:
-- tabla nueva con la FK correcta -> copiar datos (poi_id ya backfilleado,
-- con fallback a experience_id por si alguna fila se coló sin backfill) ->
-- drop de la vieja -> rename. experience_id se elimina: nada en el código
-- lo usa y poi_id es la referencia correcta de aquí en adelante.
--
-- Verificado contra el esquema REAL de producción (no BDschemaFinal.sql,
-- que en este repo se desfasa en horas): guide_coupons remoto ahora mismo
-- tiene 0 filas, así que esta migración es estructural, no de datos.

PRAGMA defer_foreign_keys = TRUE;

CREATE TABLE guide_coupons_new (
  id              TEXT PRIMARY KEY,
  poi_id          TEXT NOT NULL,
  code            TEXT NOT NULL UNIQUE,
  discount_type   TEXT CHECK(discount_type IN ('percentage', 'fixed')),
  discount_value  REAL NOT NULL,
  max_uses        INTEGER,
  current_uses    INTEGER DEFAULT 0,
  valid_from      TIMESTAMP,
  valid_until     TIMESTAMP,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (poi_id) REFERENCES guide_pois(id)
);

INSERT INTO guide_coupons_new (
  id, poi_id, code, discount_type, discount_value, max_uses, current_uses,
  valid_from, valid_until, is_active, created_at
)
SELECT
  id, COALESCE(poi_id, experience_id), code, discount_type, discount_value,
  max_uses, current_uses, valid_from, valid_until, is_active, created_at
FROM guide_coupons;

DROP TABLE guide_coupons;

ALTER TABLE guide_coupons_new RENAME TO guide_coupons;

CREATE INDEX IF NOT EXISTS idx_guide_coupons_poi ON guide_coupons(poi_id, is_active);
