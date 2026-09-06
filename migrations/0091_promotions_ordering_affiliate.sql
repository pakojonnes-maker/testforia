-- =====================================================
-- MIGRATION 0091: Orden promocionable + CTA doble con afiliación
-- =====================================================
-- Dos problemas distintos que comparten pantalla, por eso van juntos:
--
-- A) ORDEN. Hoy sólo hay dos niveles (is_featured DESC, order_index ASC) y en
--    restaurantes ni eso: workerGuide.js ordenaba con `ABS(RANDOM()) % 1000`
--    porque guide_zone_restaurants.order_override nunca se ha podido editar
--    desde el admin. Peor aún, ese orden aleatorio se CONGELA dentro del JSON
--    cacheado en KV, así que no rota por visita — se queda fijo hasta que
--    caduque la entrada. Se añade un tercer nivel POR ENCIMA de is_featured:
--    la promoción de pago, con vigencia propia.
--
--    Por qué un campo aparte y no reutilizar is_featured: son dos cosas que se
--    facturan distinto. is_featured = "esto lo recomiendo de verdad" (criterio
--    editorial del anfitrión). promotion_rank = "esto me lo pagan". Mezclarlas
--    hace imposible justificar ante un cliente qué se le vendió, y ante el
--    huésped qué recomendación es publicidad (Directiva 2005/29/CE, anexo I.11).
--
--    Orden efectivo en las tres listas:
--       1. promoción vigente (promotion_rank ASC)
--       2. is_featured DESC
--       3. orden manual: COALESCE(override del apartamento, order_index)
--
-- B) AFILIACIÓN. Hoy una experiencia tiene UNA sola acción (action_type +
--    action_data). No se puede tener a la vez el enlace de afiliado y el
--    WhatsApp del partner. Se añade un CTA secundario que, cuando está
--    relleno, MANDA: es el único que ve el huésped (botón en la guía, QR
--    incrustado en la TV) y el principal queda como respaldo.
--
--    El worker resuelve cuál gana y devuelve YA resuelto action_type/action_data,
--    para que guía y TV no puedan divergir (hoy divergen: apps/tv comparaba
--    action_type === 'whatsapp' en minúsculas contra el 'WHATSAPP' que escribe
--    el admin, así que en la TV no salía un QR de reserva jamás).
--
-- Enums documentados en comentario y validados en el worker, no con CHECK —
-- mismo criterio que 0059/0080: añadir un valor no debe obligar a reconstruir
-- la tabla.
--
-- NOTA: ejecutar una sola vez. ADD COLUMN no es idempotente.
-- =====================================================

-- -----------------------------------------------------
-- A.1 Promoción de pago — experiencias y lugares (guide_pois)
-- -----------------------------------------------------
-- promotion_rank NULL = sin promoción. Menor = más arriba.
-- Las fechas son opcionales: NULL/NULL = promoción indefinida hasta que se
-- borre a mano. Se guardan como TEXT ISO igual que el resto de timestamps del
-- esquema, y se comparan con datetime('now') en el worker.
ALTER TABLE guide_pois ADD COLUMN promotion_rank INTEGER;
ALTER TABLE guide_pois ADD COLUMN promoted_from  TIMESTAMP;
ALTER TABLE guide_pois ADD COLUMN promoted_until TIMESTAMP;

-- -----------------------------------------------------
-- A.2 Promoción de pago — tienda (guide_store_items)
-- -----------------------------------------------------
ALTER TABLE guide_store_items ADD COLUMN promotion_rank INTEGER;
ALTER TABLE guide_store_items ADD COLUMN promoted_from  TIMESTAMP;
ALTER TABLE guide_store_items ADD COLUMN promoted_until TIMESTAMP;

-- -----------------------------------------------------
-- A.3 Promoción de pago — restaurantes de zona
-- -----------------------------------------------------
-- guide_zone_restaurants YA tiene order_override (0050); lo que faltaba era
-- poder editarlo y un nivel por encima. El tier 'featured' se queda como está
-- (es el equivalente a is_featured aquí).
ALTER TABLE guide_zone_restaurants ADD COLUMN promotion_rank INTEGER;
ALTER TABLE guide_zone_restaurants ADD COLUMN promoted_from  TIMESTAMP;
ALTER TABLE guide_zone_restaurants ADD COLUMN promoted_until TIMESTAMP;

-- -----------------------------------------------------
-- A.4 Override de orden por apartamento
-- -----------------------------------------------------
-- Tabla polimórfica deliberada, no una por tipo. El precedente del repo es
-- translations.entity_id y guide_affiliate_intents.target_id: referencia por
-- (tipo, id) sin FK al ítem.
--
-- Por qué NO se reutiliza guide_apartment_pois, que ya tiene order_override:
-- workerGuide.js decide con `SELECT COUNT(*) FROM guide_apartment_pois WHERE
-- apartment_id = ?` si el apartamento tiene POIs curados, y en ese caso deja de
-- servir el catálogo entero de la zona. Meter ahí filas sólo para ordenar
-- experiencias haría que a cualquier anfitrión que no hubiera curado POIs se le
-- vaciara el mapa de golpe.
--
-- is_hidden da además lo que no había: un anfitrión que no quiere vender el
-- aceite de la plataforma, o que no quiere esa experiencia en su guía, puede
-- ocultarla sin tocar el catálogo global.
CREATE TABLE IF NOT EXISTS guide_apartment_item_order (
  apartment_id   TEXT NOT NULL,
  item_type      TEXT NOT NULL,           -- 'experience' | 'store_item' | 'restaurant'
  item_id        TEXT NOT NULL,           -- guide_pois.id | guide_store_items.id | restaurants.id
  order_override INTEGER,                 -- NULL = hereda el order_index global
  is_hidden      BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (apartment_id, item_type, item_id),
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- B.1 Afiliación en el CTA principal
-- -----------------------------------------------------
-- action_is_affiliate marca que el enlace principal es retribuido. Se expone al
-- frontend para poder poner el aviso de publicidad EN LA TARJETA que lo lleva,
-- en vez del párrafo general que hay hoy en ServicesSection.tsx — que afirma que
-- todas las experiencias son de afiliación y dejará de ser cierto en cuanto
-- convivan las dos vías.
ALTER TABLE guide_pois ADD COLUMN action_is_affiliate BOOLEAN DEFAULT FALSE;

-- Red del programa. Libre; los valores previstos hoy:
--   getyourguide | civitatis | viator | booking | amazon | custom
ALTER TABLE guide_pois ADD COLUMN affiliate_network TEXT;

-- Identificador de partner / sub-id base. NO se concatena a ciegas a la URL:
-- muchas redes firman el enlace y un parámetro extra desconocido lo rompe. El
-- worker sólo SUSTITUYE marcadores que el admin haya escrito dentro de la URL,
-- misma convención que {{apartment_name}} en los mensajes prefijados:
--   {{affiliate_code}}  -> este campo
--   {{sub_id}}          -> "<slug del apartamento>-<guide|tv>"
--   {{apartment_id}}    -> guide_apartments.id
--   {{surface}}         -> 'guide' | 'tv'
-- Sin marcadores, la URL se sirve intacta.
ALTER TABLE guide_pois ADD COLUMN affiliate_code TEXT;

-- -----------------------------------------------------
-- B.2 CTA secundario — si está relleno, MANDA
-- -----------------------------------------------------
-- secondary_action_type: URL | WHATSAPP | PHONE (NULL = no hay secundario).
-- La etiqueta del botón viaja en translations, entity_type='poi',
-- field='secondary_cta_label', igual que 'cta_label'.
ALTER TABLE guide_pois ADD COLUMN secondary_action_type TEXT;
ALTER TABLE guide_pois ADD COLUMN secondary_action_data TEXT;
ALTER TABLE guide_pois ADD COLUMN secondary_action_prefilled_message TEXT;

-- -----------------------------------------------------
-- ÍNDICES
-- -----------------------------------------------------
-- El orden de las listas empieza siempre por la promoción vigente, así que el
-- índice tiene que cubrir zone + bookable + rank para que no haya scan.
CREATE INDEX IF NOT EXISTS idx_guide_pois_promoted
  ON guide_pois(zone_id, is_bookable, promotion_rank);

CREATE INDEX IF NOT EXISTS idx_guide_store_items_promoted
  ON guide_store_items(is_active, promotion_rank);

CREATE INDEX IF NOT EXISTS idx_guide_apt_item_order
  ON guide_apartment_item_order(apartment_id, item_type, is_hidden);
