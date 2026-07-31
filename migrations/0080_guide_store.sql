-- =====================================================
-- MIGRATION 0080: Tienda del guidebook (host + platform) + pedidos
-- =====================================================
-- Hasta ahora el guidebook no tenía forma de que un property manager vendiera
-- NADA propio: "experiencias" vive en guide_pois, es zone-scoped y su CRUD es
-- superadmin-only (workerGuideAdmin.js listExperiences/createExperience).
-- Esta migración añade una tienda con dos dueños posibles:
--   owner_type='host'     -> apartment_id/agency_id NOT NULL. Lo crea y edita
--                            la agencia (late checkout, limpieza, welcome pack...).
--   owner_type='platform' -> apartment_id NULL, visible en TODAS las guías.
--                            Solo el superadmin escribe aquí — es el slot
--                            reservado de VisualTaste dentro de la tienda de
--                            cada anfitrión (aceite, queso, productos locales).
-- owner_type se valida en el worker, no con CHECK, siguiendo el criterio ya
-- usado en 0059 (enums documentados en comentario, no en la constraint, para
-- no tener que reconstruir la tabla el día que se añada un tercer valor).
--
-- El pedido se guarda en D1 ANTES de abrir WhatsApp: sin esto, igual que pasa
-- hoy con CTAButton en experiencias, un "pedido" no deja ningún rastro
-- auditable. guide_store_order_items congela item_name_es porque si el
-- manager renombra o borra el ítem después, el pedido histórico debe seguir
-- siendo legible.

CREATE TABLE IF NOT EXISTS guide_store_items (
  id                TEXT PRIMARY KEY,
  owner_type        TEXT NOT NULL,          -- 'host' | 'platform'
  apartment_id      TEXT,                   -- NULL si owner_type='platform'
  agency_id         TEXT,                   -- NULL si owner_type='platform'
  category          TEXT NOT NULL,          -- late_checkout|early_checkin|cleaning|crib|transfer|
                                             -- welcome_pack|parking|rental|grocery|local_product|custom
  icon_name         TEXT,
  price_amount      REAL,
  price_currency    TEXT DEFAULT 'EUR',
  price_display     TEXT,                   -- fallback en texto libre si no encaja en price_amount
  cover_image_url   TEXT,
  contact_whatsapp  TEXT,                    -- override puntual del ítem; si NULL se resuelve en
                                             -- el worker: host -> apartment.contact_whatsapp,
                                             -- platform -> env.PLATFORM_WHATSAPP
  is_featured       BOOLEAN DEFAULT FALSE,
  is_active         BOOLEAN DEFAULT TRUE,
  order_index       INTEGER DEFAULT 0,
  stock_unlimited   BOOLEAN DEFAULT TRUE,    -- productos físicos con stock finito (aceite, queso)
  stock_qty         INTEGER,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id) ON DELETE CASCADE,
  FOREIGN KEY (agency_id)    REFERENCES guide_agencies(id)
);
-- Translations: entity_type = 'store_item', fields: 'name', 'description', 'cta_label'

CREATE INDEX IF NOT EXISTS idx_guide_store_items_apt   ON guide_store_items(apartment_id, is_active, order_index);
CREATE INDEX IF NOT EXISTS idx_guide_store_items_owner ON guide_store_items(owner_type, is_active);

CREATE TABLE IF NOT EXISTS guide_store_orders (
  id               TEXT PRIMARY KEY,
  apartment_id     TEXT NOT NULL,
  session_id       TEXT,                    -- guide_sessions.id, si existía en ese momento
  visitor_id       TEXT,                    -- localStorage vt_guide_visitor_id
  contact_channel  TEXT DEFAULT 'whatsapp', -- whatsapp|phone
  status           TEXT DEFAULT 'requested', -- requested|contacted|completed|cancelled
  total_amount     REAL,
  currency         TEXT DEFAULT 'EUR',
  guest_note       TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_guide_store_orders_apt ON guide_store_orders(apartment_id, created_at);

CREATE TABLE IF NOT EXISTS guide_store_order_items (
  id           TEXT PRIMARY KEY,
  order_id     TEXT NOT NULL,
  item_id      TEXT NOT NULL,
  item_name_es TEXT NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1,
  unit_price   REAL,
  FOREIGN KEY (order_id) REFERENCES guide_store_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id)  REFERENCES guide_store_items(id)
);

CREATE INDEX IF NOT EXISTS idx_guide_store_order_items_order ON guide_store_order_items(order_id);

-- Número que recibe el pedido: host usa este campo, platform usa
-- env.PLATFORM_WHATSAPP salvo que el ítem lleve su propio contact_whatsapp.
ALTER TABLE guide_apartments ADD COLUMN contact_whatsapp TEXT;

-- Número de pruebas de Francisco para el apartamento de demo (host items:
-- limpieza extra, welcome pack). Los productos platform (aceite, queso) usan
-- env.PLATFORM_WHATSAPP en wrangler.toml, mismo número.
UPDATE guide_apartments SET contact_whatsapp = '+34633747033' WHERE id = 'apt_demo_paloma';

-- -----------------------------------------------------
-- Seed de prueba (pedido de Francisco): 2 productos de plataforma (aceite,
-- queso) + 2 servicios de la agencia (limpieza extra, welcome pack) atados al
-- apartamento de demo existente en D1 (apt_demo_paloma / agency_cds_apts).
-- -----------------------------------------------------

INSERT OR IGNORE INTO guide_store_items
  (id, owner_type, apartment_id, agency_id, category, icon_name, price_amount, price_currency, is_featured, is_active, order_index, stock_unlimited)
VALUES
  ('sitem_platform_oliveoil', 'platform', NULL, NULL, 'local_product', 'liquor', 12.50, 'EUR', 1, 1, 0, 1),
  ('sitem_platform_cheese',   'platform', NULL, NULL, 'local_product', 'lunch_dining', 9.90, 'EUR', 0, 1, 1, 1),
  ('sitem_host_cleaning',     'host', 'apt_demo_paloma', 'agency_cds_apts', 'cleaning', 'cleaning_services', 25.00, 'EUR', 0, 1, 0, 1),
  ('sitem_host_welcomepack',  'host', 'apt_demo_paloma', 'agency_cds_apts', 'welcome_pack', 'redeem', 15.00, 'EUR', 1, 1, 1, 1);

INSERT OR IGNORE INTO translations (entity_id, entity_type, field, language_code, value) VALUES
  ('sitem_platform_oliveoil', 'store_item', 'name', 'es', 'Aceite de oliva virgen extra'),
  ('sitem_platform_oliveoil', 'store_item', 'description', 'es', 'Aceite de oliva virgen extra de producción local, botella de 500ml. Un recuerdo auténtico de tu estancia.'),
  ('sitem_platform_oliveoil', 'store_item', 'name', 'en', 'Extra virgin olive oil'),
  ('sitem_platform_oliveoil', 'store_item', 'description', 'en', 'Locally produced extra virgin olive oil, 500ml bottle. An authentic taste to take home.'),

  ('sitem_platform_cheese', 'store_item', 'name', 'es', 'Queso curado artesano'),
  ('sitem_platform_cheese', 'store_item', 'description', 'es', 'Queso curado de elaboración artesanal de la zona, pieza de 400g aproximadamente.'),
  ('sitem_platform_cheese', 'store_item', 'name', 'en', 'Artisan cured cheese'),
  ('sitem_platform_cheese', 'store_item', 'description', 'en', 'Locally made artisan cured cheese, approx. 400g piece.'),

  ('sitem_host_cleaning', 'store_item', 'name', 'es', 'Limpieza extra durante la estancia'),
  ('sitem_host_cleaning', 'store_item', 'description', 'es', 'Servicio de limpieza adicional en cualquier día de tu estancia, a petición.'),
  ('sitem_host_cleaning', 'store_item', 'name', 'en', 'Extra cleaning during your stay'),
  ('sitem_host_cleaning', 'store_item', 'description', 'en', 'Additional cleaning service on any day of your stay, on request.'),

  ('sitem_host_welcomepack', 'store_item', 'name', 'es', 'Pack de bienvenida'),
  ('sitem_host_welcomepack', 'store_item', 'description', 'es', 'Cesta de bienvenida con productos locales, agua, café y detalles de cortesía esperándote a tu llegada.'),
  ('sitem_host_welcomepack', 'store_item', 'name', 'en', 'Welcome pack'),
  ('sitem_host_welcomepack', 'store_item', 'description', 'en', 'Welcome basket with local products, water, coffee and courtesy treats waiting for you on arrival.');
