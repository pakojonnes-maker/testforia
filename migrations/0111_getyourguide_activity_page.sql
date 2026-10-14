-- =====================================================
-- MIGRACIÓN 0111: los enlaces a UNA actividad de GetYourGuide abren su ficha
-- =====================================================
-- Solo datos, ningún cambio de esquema.
--
-- Por qué: en el móvil, GetYourGuide no abre la ficha de la actividad cuando el
-- enlace lleva partner_id: redirige a una búsqueda con esa actividad la primera
-- y otras debajo (`/s?...&et=<id>&lc=<zona>`). Lo hace a propósito (su ayuda,
-- «Integration's landing page»: dicen que convierte un 5 % más) y se desactiva
-- con `&mkt_cmp=true`. Comprobado el 2026-10-14 con un navegador de Android:
-- sin el parámetro, el botón «Comprar entradas» del Teleférico llevaba a esa
-- búsqueda y Francisco lo vio como «una página generalista»; con él abre la
-- ficha y conserva partner_id y cmp.
--
-- Solo los cinco enlaces a una actividad de la 0110. Las tarjetas generales
-- («Excursiones y actividades», poi_gyg_*) van a la página de la zona y no
-- llevan nada que desactivar.
--
-- Idempotente: no toca un enlace que ya lleve el parámetro.
-- Después de aplicarla: `ver:all` en KV (y `ver:zonecatalog` para «Explorar»).
-- =====================================================

UPDATE guide_pois
SET action_data = action_data || '&mkt_cmp=true',
    modified_at = CURRENT_TIMESTAMP
WHERE id IN (
    'poi_malaga_museo_picasso',
    'poi_malaga_pompidou',
    'poi_torremolinos_cocodrilos',
    'poi_benalmadena_teleferico',
    'poi_fuengirola_bioparc'
)
  AND affiliate_network = 'getyourguide'
  AND action_data LIKE 'https://www.getyourguide.com/%-t%/?partner_id=%'
  AND action_data NOT LIKE '%mkt_cmp=%';
