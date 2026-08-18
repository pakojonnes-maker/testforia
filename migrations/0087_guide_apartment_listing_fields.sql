-- 0087_guide_apartment_listing_fields.sql
--
-- Soporte para el importador de apartamentos desde URL (botón "Importar desde
-- URL" en el admin, junto al de Excel). Antes de esta migración
-- guide_apartments no tenía NINGÚN campo de características del piso: solo
-- cover_image_url, wifi y whatsapp (verificado contra el esquema REMOTO con
-- `wrangler d1 execute --remote`, no contra BDschemaFinal.sql).
--
-- Todo NULLABLE a propósito: no rompe ni el alta manual ni el importador de
-- Excel existente, que no rellenan ninguna de estas columnas.
--
-- Campos "mapeados" (capacity..source_url) son los que la app puede llegar a
-- pintar en apps/guide. gallery_urls guarda URLs remotas de la extracción —
-- migrarlas a R2 queda fuera de esta fase (solo la portada se descarga).
--
-- source_payload guarda el JSON-LD/OpenGraph completo tal cual se extrajo,
-- sin filtrar por lo que la app usa hoy: es la red de seguridad para no tener
-- que volver a pedirle la URL al anfitrión si en el futuro se quiere usar un
-- campo que hoy no se mapea (camas, idiomas del anfitrión, reviews...).

ALTER TABLE guide_apartments ADD COLUMN capacity INTEGER;
ALTER TABLE guide_apartments ADD COLUMN bedrooms INTEGER;
ALTER TABLE guide_apartments ADD COLUMN bathrooms REAL;
ALTER TABLE guide_apartments ADD COLUMN size_m2 INTEGER;
ALTER TABLE guide_apartments ADD COLUMN checkin_time TEXT;
ALTER TABLE guide_apartments ADD COLUMN checkout_time TEXT;
ALTER TABLE guide_apartments ADD COLUMN property_type TEXT;
ALTER TABLE guide_apartments ADD COLUMN description TEXT;
ALTER TABLE guide_apartments ADD COLUMN amenities TEXT;
ALTER TABLE guide_apartments ADD COLUMN gallery_urls TEXT;
ALTER TABLE guide_apartments ADD COLUMN source_url TEXT;
ALTER TABLE guide_apartments ADD COLUMN source_payload TEXT;
ALTER TABLE guide_apartments ADD COLUMN imported_at TIMESTAMP;
