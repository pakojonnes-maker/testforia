-- =====================================================
-- MIGRATION 0092: Imágenes de las teselas de VisualTaste TV
-- =====================================================
-- La pantalla de bienvenida pinta cuatro secciones con foto (Dónde comer, Qué
-- hacer, Tienda, Normas de la casa) más un fondo a pantalla completa. Hasta
-- ahora esas fotos salían del CONTENIDO: la portada del primer restaurante que
-- tuviera una, la de la zona, la del primer producto de la tienda. Lo elegía el
-- catálogo, no nadie: cada alojamiento encendía un mosaico distinto y con
-- recortes que no estaban pensados para la caja que ocupan.
--
-- A partir de aquí las cinco imágenes DE SERIE van empaquetadas dentro del APK
-- (apps/tv/src/assets/tiles), así que la pantalla tiene su aspecto final aunque
-- el WiFi del apartamento no levante en el arranque — que es justo cuando menos
-- se puede contar con él. Esta tabla guarda sólo las EXCEPCIONES: el anfitrión
-- que sube su propia foto desde el admin (Pantalla TV → Imágenes de la
-- pantalla). Lo que no esté aquí se pinta con la de serie.
--
-- Por eso es una tabla y no cinco columnas en guide_apartments: lo normal es no
-- tener ninguna fila, y añadir una ranura nueva (una sexta tesela) no obliga a
-- tocar el esquema de la tabla más caliente del guidebook.
CREATE TABLE IF NOT EXISTS guide_tv_tile_images (
  apartment_id  TEXT NOT NULL,
  -- Las mismas cinco claves que TileSlot en apps/tv/src/lib/tileImages.ts. El
  -- CHECK es el que evita que una ranura mal escrita desde el admin se guarde
  -- en silencio y no se pinte nunca en ninguna parte.
  slot          TEXT NOT NULL CHECK(slot IN ('eat', 'do', 'store', 'info', 'background')),
  image_url     TEXT NOT NULL,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (apartment_id, slot),
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id) ON DELETE CASCADE
);

-- La PK ya cubre la lectura por apartamento (es el prefijo del índice), que es
-- la única consulta que hace workerTvScreen.js. No hace falta índice aparte.
