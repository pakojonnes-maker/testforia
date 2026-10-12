-- 0107 — Fotos intercaladas en el texto de una guía del apartamento.
--
-- Hasta ahora las fotos de un bloque (guide_apartment_media) solo servían de
-- portada: la guía y la tele pintan la primera y las demás no se ven. Para
-- guiar al huésped («este es el botón», «la llave está aquí») la foto tiene que
-- salir JUNTO al párrafo que la explica.
--
-- after_block = tras qué apartado del texto va la foto (1 = tras el primero).
-- Un apartado es lo que separan las líneas en blanco, igual que parte el texto
-- apps/guide/src/lib/text.ts. NULL = como hasta hoy (portada del bloque).
--
-- La posición se guarda AQUÍ y no como una marca dentro del texto a propósito:
-- el texto existe una vez por idioma (13) y una marca tendría que sobrevivir a
-- cada traducción y al traductor automático. Así la foto vale para todos los
-- idiomas sin traducir nada; si un idioma tiene menos apartados, cae al final.
--
-- width/height = medidas de la imagen, que el admin conoce al subirla. La guía
-- reserva el hueco con ellas para que el texto no salte cuando llega la foto.
--
-- Orden de despliegue: ESTA migración primero, luego el worker (workerGuide.js
-- y workerGuideAdmin.js leen estas columnas en sus SELECT).

ALTER TABLE guide_apartment_media ADD COLUMN after_block INTEGER;
ALTER TABLE guide_apartment_media ADD COLUMN width INTEGER;
ALTER TABLE guide_apartment_media ADD COLUMN height INTEGER;
