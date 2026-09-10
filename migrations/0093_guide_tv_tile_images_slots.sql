-- =====================================================
-- MIGRATION 0093: tres ranuras más para las teselas de la TV
-- =====================================================
-- La 0092 dejó cinco ranuras (eat, do, store, info, background). Ahora también
-- tienen foto propia el selector de idioma, "Tu estancia" y el WiFi, así que el
-- CHECK de guide_tv_tile_images.slot tiene que admitir 'lang', 'stay' y 'wifi'.
--
-- SQLite NO permite modificar un CHECK con ALTER TABLE: hay que recrear la
-- tabla y copiar, con el patrón de siempre — tabla nueva, INSERT SELECT, DROP,
-- RENAME.
--
-- SIN "BEGIN TRANSACTION" a pelo, aunque el patrón lo pida: D1 remoto lo
-- RECHAZA de plano ("please use state.storage.transaction() instead of the SQL
-- BEGIN TRANSACTION") porque ya envuelve el fichero entero en su propia
-- transacción — si algo falla a medias, la base vuelve sola a su estado
-- anterior. El SQLite local, en cambio, sí lo acepta: esta migración se aplicó
-- limpiamente en local y luego reventó contra producción. Que un fichero pase
-- en local NO es prueba de que pase en remoto.
--
-- Tampoco se toca PRAGMA foreign_keys: D1 ejecuta con defer_foreign_keys, así
-- que el DROP de la tabla vieja no dispara la FK a guide_apartments.

CREATE TABLE guide_tv_tile_images_new (
  apartment_id  TEXT NOT NULL,
  -- Mismas claves que TileSlot en apps/tv/src/lib/tileImages.ts y que
  -- VALID_TILE_SLOTS en workerTvScreen.js. Los tres se mueven juntos.
  slot          TEXT NOT NULL CHECK(slot IN (
                  'eat', 'do', 'store', 'info',
                  'lang', 'stay', 'wifi',
                  'background'
                )),
  image_url     TEXT NOT NULL,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (apartment_id, slot),
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id) ON DELETE CASCADE
);

INSERT INTO guide_tv_tile_images_new (apartment_id, slot, image_url, updated_at)
SELECT apartment_id, slot, image_url, updated_at FROM guide_tv_tile_images;

DROP TABLE guide_tv_tile_images;

ALTER TABLE guide_tv_tile_images_new RENAME TO guide_tv_tile_images;
