-- 0086_guide_agency_font_roles.sql
--
-- Por qué: GuidebookPage.tsx aplicaba agency.font_family a TODOS los tokens
-- tipográficos a la vez (titular + cuerpo + label), pensado como "una sola
-- fuente para toda la agencia". Pero GuideDesignPage.tsx (admin) hacía
-- default a 'Montserrat' cuando font_family era null, así que cualquier
-- guardado del panel de Diseño persistía 'Montserrat' sin que nadie lo
-- eligiera — y eso pisaba el sistema tipográfico real del guidebook
-- (Newsreader/Inter/Archivo Narrow, definido en apps/guide/src/index.css).
-- En producción las 2 agencias existentes (agency_test, agency_cds_apts)
-- tenían font_family = 'Montserrat'.
--
-- Esta migración separa una fuente por rol (headline/body/label) para que
-- personalizar un rol no pise los otros dos, y limpia el valor heredado de
-- font_family. La columna font_family se deja en el esquema (no se dropea)
-- pero deja de leerse en código a partir de este cambio.

ALTER TABLE guide_agencies ADD COLUMN headline_font TEXT;
ALTER TABLE guide_agencies ADD COLUMN body_font TEXT;
ALTER TABLE guide_agencies ADD COLUMN label_font TEXT;

UPDATE guide_agencies SET font_family = NULL WHERE font_family IS NOT NULL;
