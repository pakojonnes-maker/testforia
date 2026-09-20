-- =====================================================
-- MIGRATION 0095: Restaurantes traídos de Google (guide_pois)
-- =====================================================
-- La pestaña Restaurantes de la guía sólo podía enseñar restaurantes que son
-- cliente de VisualTaste (restaurants + guide_zone_restaurants). Para enseñar
-- cualquier restaurante de la zona, el importador de Google (workerGuideImport.js,
-- botón "Importar de Google" de "Restaurantes por zona") los crea como filas de
-- guide_pois con category = 'Restaurantes': la misma tabla y el mismo formulario de
-- edición que las experiencias, en vez de una tercera tabla que mantener.
--
-- Casi todo lo que hace falta YA existe en guide_pois: google_place_id,
-- google_rating, google_rating_count, google_synced_at (0082), opening_hours, phone,
-- website_url, booking_url (reserva online), subcategory (= tipo de cocina, lo que
-- alimenta el filtro de la guía), action_type/action_data (= WhatsApp o enlace de
-- reserva, los mismos campos que ya rellena el host en una experiencia), is_featured
-- y promotion_* (0091). Esta migración añade sólo lo que Google devuelve y hoy se
-- tiraba:
--
--   google_types          JSON con place.types: todas las etiquetas de Google.
--   google_primary_type   place.primaryType ('italian_restaurant'): el código estable
--                         de la cocina. subcategory guarda el texto legible y editable.
--   business_status       OPERATIONAL | CLOSED_TEMPORARILY | CLOSED_PERMANENTLY |
--                         FUTURE_OPENING.
--   price_level           enum crudo PRICE_LEVEL_*; price_display es el '€€' ya formateado.
--   google_raw            JSON de la respuesta de Place Details (sin fotos ni reseñas):
--                         horarios por periodos, atributos (terraza, perros, reservas,
--                         qué comidas sirve...), componentes de dirección, rango de
--                         precios... "por si hace falta más adelante" (petición de
--                         Francisco, 2026-09-19). Estructura estable con la clave _vt
--                         (máscara usada y fecha de la consulta).
--
-- ⚠️ google_raw y los términos de Google. Los ToS de Maps Platform sólo permiten guardar
-- el place_id sin límite; el resto es caché temporal. Guardarlo es una decisión de
-- producto expresa. Por eso va TODO en UNA columna y junto a google_synced_at: si un día
-- hay que purgarlo, es `UPDATE guide_pois SET google_raw = NULL`, no otra migración.
-- No añadir aquí fotos (sus nombres caducan y tampoco se pueden guardar) ni reseñas.
--
-- El listado del admin devuelve `p.*`, así que workerGuideAdmin.js (listPOIs) descarta
-- google_raw de la respuesta: ningún listado debe arrastrar varios KB por fila.
--
-- Sin índice nuevo a propósito: la guía separa los restaurantes en JS sobre el catálogo de
-- la zona que ya carga (idx_guide_pois_zone_active lo cubre) y el admin filtra por
-- categoría en el cliente. Añadirlo sería pagar cada escritura sin que nada lo lea.
--
-- NOTA: ejecutar una sola vez. ADD COLUMN no es idempotente.

ALTER TABLE guide_pois ADD COLUMN google_types TEXT;
ALTER TABLE guide_pois ADD COLUMN google_primary_type TEXT;
ALTER TABLE guide_pois ADD COLUMN business_status TEXT;
ALTER TABLE guide_pois ADD COLUMN price_level TEXT;
ALTER TABLE guide_pois ADD COLUMN google_raw TEXT;
