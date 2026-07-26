-- ==================================================================================
-- SISTEMA DE LEALTAD: tarjeta de sellos por visita.
-- Cada restaurante configura un programa (nº de sellos, premio). El cliente
-- acumula un sello por visita validada por el camarero (PIN de restaurant_details.
-- redeem_pin, reutilizado del flujo de canje existente). Al completar la tarjeta
-- se genera un magic_link_token y se canjea con el mismo flujo que ya usa
-- RedemptionPage (/api/r/:token, /api/r/:token/redeem).
-- ==================================================================================

CREATE TABLE IF NOT EXISTS loyalty_programs (
  restaurant_id TEXT PRIMARY KEY,
  is_active INTEGER NOT NULL DEFAULT 0,
  stamps_required INTEGER NOT NULL DEFAULT 8,
  reward_name TEXT,
  reward_description TEXT,
  reward_image_url TEXT,
  stamp_icon TEXT DEFAULT '⭐',
  card_color TEXT,
  expiry_days INTEGER, -- null = sin caducidad tras completar
  terms TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS loyalty_cards (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  stamps INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active | completed | redeemed | expired
  magic_link_token TEXT UNIQUE,
  expires_at TIMESTAMP,
  completed_at TIMESTAMP,
  redeemed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Solo puede haber una tarjeta activa/completada (sin canjear) a la vez por
-- visitante y restaurante. Tras canjear o expirar, puede empezar una nueva.
CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_cards_open
  ON loyalty_cards(restaurant_id, visitor_id)
  WHERE status IN ('active', 'completed');

CREATE INDEX IF NOT EXISTS idx_loyalty_cards_token ON loyalty_cards(magic_link_token);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_restaurant_status ON loyalty_cards(restaurant_id, status);

CREATE TABLE IF NOT EXISTS loyalty_stamps (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES loyalty_cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_loyalty_stamps_card ON loyalty_stamps(card_id);
