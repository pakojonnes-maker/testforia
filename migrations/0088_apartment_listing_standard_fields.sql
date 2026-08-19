-- 0088_apartment_listing_standard_fields.sql
--
-- Campos del estándar schema.org/VacationRental que la migración 0087 dejó
-- fuera pero que sí forman parte de lo que Google documenta como
-- "recomendado" (developers.google.com/search/docs/appearance/structured-data/vacation-rental):
-- aggregateRating, containsPlace.bed, identifier. No es ad-hoc de ninguna
-- web concreta — es el propio vocabulario, así que aplica a cualquier sitio
-- que lo implemente (comprobado: Airbnb SÍ trae aggregateRating en su
-- VacationRental; containsPlace.bed no se ha visto aún en un caso real, pero
-- el extractor debe estar preparado para leerlo si aparece).
--
-- Deliberadamente fuera: `review` (lista anidada de reseñas, sin sitio donde
-- mostrarlas todavía) y `knowsLanguage` (idiomas del anfitrión, poco
-- relevante para el guidebook). Decisión explícita, no descuido.
--
-- Todo NULLABLE, mismo motivo que 0087: no rompe nada existente.

ALTER TABLE guide_apartments ADD COLUMN beds INTEGER;
ALTER TABLE guide_apartments ADD COLUMN rating_value REAL;
ALTER TABLE guide_apartments ADD COLUMN rating_count INTEGER;
ALTER TABLE guide_apartments ADD COLUMN external_identifier TEXT;
