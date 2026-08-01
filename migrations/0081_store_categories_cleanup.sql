-- =====================================================
-- MIGRATION 0081: Limpieza de categorías de guide_store_items
-- =====================================================
-- 0080 documentó `category` como un único enum que mezclaba dos cosas distintas:
-- agrupaciones reales (local_product, custom, grocery) y nombres de servicios muy
-- específicos (late_checkout, early_checkin, cleaning, crib, transfer, welcome_pack,
-- parking, rental) — cada uno su propia "categoría" de un solo ítem. En la práctica
-- eso hacía que "Pack de bienvenida" apareciera como una categoría en sí misma en vez
-- de una agrupación, y que el admin no supiera bajo qué categoría meter "traslado" o
-- "cuna" salvo repitiendo el nombre del servicio.
--
-- Esta migración fusiona esos nombres específicos en agrupaciones reales:
--   late_checkout, early_checkin              -> checkinout   ("Check-in / Check-out")
--   cleaning, crib, transfer, parking, rental  -> service       ("Servicios de la estancia")
--   welcome_pack                               -> welcome       ("Bienvenida")
-- local_product, grocery y custom no cambian. El nombre específico del ítem (p.ej.
-- "Traslado al aeropuerto" o "Pack de bienvenida") ya vive en `translations.name` —
-- category solo necesita servir para filtrar/agrupar en la tienda, no para nombrar.
--
-- Sin CHECK constraint (igual que 0080): el enum se documenta aquí, no se fuerza en
-- la tabla, para no tener que reconstruirla el día que se añada un séptimo valor.
-- Verificado contra producción antes de escribir esto: las únicas 4 filas reales
-- (sitem_platform_oliveoil/cheese en local_product, sitem_host_cleaning en cleaning,
-- sitem_host_welcomepack en welcome_pack) — ningún dato usaba late_checkout,
-- early_checkin, crib, transfer, parking, rental o grocery todavía.

UPDATE guide_store_items SET category = 'checkinout' WHERE category IN ('late_checkout', 'early_checkin');
UPDATE guide_store_items SET category = 'service' WHERE category IN ('cleaning', 'crib', 'transfer', 'parking', 'rental');
UPDATE guide_store_items SET category = 'welcome' WHERE category = 'welcome_pack';
