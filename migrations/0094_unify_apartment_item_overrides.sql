-- =====================================================
-- 0094 — Una sola capa de overrides por apartamento
-- =====================================================
-- Hasta aquí convivían DOS modelos para lo mismo, y el más viejo era una
-- trampa:
--
--   guide_apartment_pois (0053)  — opt-in TODO O NADA. workerGuide.js hacía
--       `SELECT COUNT(*) ... WHERE apartment_id = ?` y, si había UNA sola fila,
--       dejaba de servir el catálogo de la zona y pasaba a un INNER JOIN contra
--       esa lista. Incluir un sitio excluía todos los demás. Un piso con 2 filas
--       enseñaba 2 sitios de los 12 de su zona, y las experiencias reservables
--       no aparecían nunca en Explorar.
--
--   guide_apartment_item_order (0091) — LEFT JOIN sobre el catálogo de la zona
--       con is_hidden. El modelo correcto: por defecto se ve todo, el anfitrión
--       oculta lo que no quiera. 0091 la creó precisamente para NO tocar la
--       tabla de arriba (sus comentarios describen la trampa y la rodean), así
--       que el proyecto acabó pagando los dos modelos a la vez.
--
-- Esta migración se queda con el segundo modelo para todo y borra el primero.
--
-- TRES DECISIONES QUE VAN AQUÍ, no en el código:
--
-- 1. item_type='experience' desaparece; pasa a ser 'poi'.
--    La migración 0059 unificó lugares y experiencias en guide_pois: una
--    experiencia es una fila con is_bookable = 1, no otra entidad. Mantener dos
--    item_type para la misma tabla permitía DOS filas de override para el mismo
--    guide_pois.id con is_hidden contradictorio, y hacía que cambiar is_bookable
--    en el admin dejara huérfana la fila de override en silencio. La clave de
--    override sigue a la TABLA, no a cómo se presente el ítem.
--
-- 2. order_override = 0 pasa a NULL.
--    guide_apartment_pois.order_override era `DEFAULT 0` y el admin insertaba
--    `data.order_override || 0`, así que TODAS las filas valían 0. Como el orden
--    es COALESCE(override, order_index), ese 0 se comía el order_index global y
--    el desempate real acababa siendo el id — aleatorio. En este modelo NULL
--    significa "sin preferencia, hereda el orden global", que es lo que aquel 0
--    quería decir.
--
-- 3. Los POIs que HOY no están asignados a un apartamento NO se marcan ocultos.
--    Podría parecer que no estar en la lista era una decisión del anfitrión,
--    pero no lo era: en un sistema opt-in "no incluido" es el estado por
--    defecto, no una elección. Efecto buscado: los pisos existentes pasan a
--    enseñar el catálogo entero de su zona.
--
-- Los campos de distancia se mueven aquí también. 0053 los puso en guide_pois
-- (nivel ZONA: "5 min" es igual para todos los pisos, que es falso) y 0059 los
-- duplicó en guide_apartment_pois sin que nadie los leyera nunca — workerGuide.js
-- seguía sirviendo los de guide_pois. 0063 ya decía que la distancia por piso
-- "now lives in guide_apartment_pois"; esto lo hace cierto. El valor de
-- guide_pois se queda como defecto de zona y el de aquí lo pisa cuando existe.
--
-- NO ES RE-EJECUTABLE, y es a propósito. Como no hay ledger de migraciones,
-- alguien la volverá a lanzar: tras el primer uso las dos tablas origen ya no
-- existen y falla en el primer INSERT con "no such table: guide_apartment_pois".
-- Ese error es la señal de que YA está aplicada, no de que esté rota; no hay
-- nada que arreglar ni datos a medias.
-- =====================================================

CREATE TABLE IF NOT EXISTS guide_apartment_items (
    apartment_id     TEXT NOT NULL,
    item_type        TEXT NOT NULL,   -- 'poi' | 'store_item' | 'restaurant'
    item_id          TEXT NOT NULL,   -- guide_pois.id | guide_store_items.id | restaurants.id
    is_hidden        BOOLEAN DEFAULT FALSE,
    order_override   INTEGER,         -- NULL = hereda el order_index global. NUNCA poner DEFAULT 0.
    -- Distancia/tiempo desde ESTE apartamento. NULL = usar el valor de zona
    -- que lleve el propio ítem.
    travel_time_text TEXT,
    travel_mode      TEXT,            -- walk|drive|bike
    distance_text    TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (apartment_id, item_type, item_id),
    FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id) ON DELETE CASCADE
);

-- El acceso real es siempre "dame los overrides de este piso para este tipo",
-- y la visibilidad se filtra en el mismo WHERE.
CREATE INDEX IF NOT EXISTS idx_guide_apt_items_lookup
    ON guide_apartment_items(apartment_id, item_type, is_hidden);

-- -----------------------------------------------------
-- Traspaso 1: guide_apartment_pois → item_type 'poi'
-- -----------------------------------------------------
INSERT OR IGNORE INTO guide_apartment_items
    (apartment_id, item_type, item_id, is_hidden, order_override,
     travel_time_text, travel_mode, distance_text, created_at, modified_at)
SELECT
    apartment_id,
    'poi',
    poi_id,
    COALESCE(is_hidden, 0),
    NULLIF(order_override, 0),   -- ver decisión 2 arriba
    travel_time_text,
    travel_mode,
    distance_text,
    COALESCE(created_at, CURRENT_TIMESTAMP),
    CURRENT_TIMESTAMP
FROM guide_apartment_pois;

-- -----------------------------------------------------
-- Traspaso 2: guide_apartment_item_order
-- -----------------------------------------------------
-- store_item y restaurant se copian tal cual: no pueden chocar con nada.
INSERT OR IGNORE INTO guide_apartment_items
    (apartment_id, item_type, item_id, is_hidden, order_override, created_at, modified_at)
SELECT apartment_id, item_type, item_id, COALESCE(is_hidden, 0), order_override,
       COALESCE(created_at, CURRENT_TIMESTAMP), COALESCE(modified_at, CURRENT_TIMESTAMP)
FROM guide_apartment_item_order
WHERE item_type IN ('store_item', 'restaurant');

-- 'experience' → 'poi'. Aquí SÍ puede haber choque (el mismo guide_pois.id con
-- fila en las dos tablas viejas). Gana esta: una fila en item_order es una
-- decisión explícita del anfitrión sobre orden/visibilidad, mientras que la de
-- guide_apartment_pois sólo significaba "incluido".
INSERT INTO guide_apartment_items
    (apartment_id, item_type, item_id, is_hidden, order_override, created_at, modified_at)
SELECT apartment_id, 'poi', item_id, COALESCE(is_hidden, 0), order_override,
       COALESCE(created_at, CURRENT_TIMESTAMP), COALESCE(modified_at, CURRENT_TIMESTAMP)
FROM guide_apartment_item_order
WHERE item_type = 'experience'
ON CONFLICT(apartment_id, item_type, item_id) DO UPDATE SET
    is_hidden      = excluded.is_hidden,
    order_override = excluded.order_override,
    modified_at    = CURRENT_TIMESTAMP;

-- -----------------------------------------------------
-- Fuera las dos viejas
-- -----------------------------------------------------
-- Se borran de verdad, no se dejan "por si acaso": mientras exista
-- guide_apartment_pois, el `SELECT COUNT(*)` puede volver en cualquier refactor
-- y con él el vaciado de mapas.
DROP INDEX IF EXISTS idx_guide_apt_pois_apt;
DROP TABLE IF EXISTS guide_apartment_pois;
DROP TABLE IF EXISTS guide_apartment_item_order;
