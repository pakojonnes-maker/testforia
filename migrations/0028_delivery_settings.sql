-- Migration: 0028_delivery_settings.sql
-- Sistema de Delivery: Configuración principal por restaurante

CREATE TABLE IF NOT EXISTS delivery_settings (
  restaurant_id TEXT PRIMARY KEY,
  is_enabled BOOLEAN DEFAULT FALSE,
  
  -- Contacto
  show_whatsapp BOOLEAN DEFAULT TRUE,
  show_phone BOOLEAN DEFAULT FALSE,
  custom_whatsapp TEXT,  -- Override de restaurant_details.whatsapp_number
  custom_phone TEXT,     -- Override de restaurants.phone
  
  -- Horarios y Disponibilidad (JSON)
  -- Formato: {"monday": [{"start":"12:00","end":"22:00"}], "tuesday": [], ...}
  delivery_hours TEXT,
  -- Formato: ["2026-01-25", "2026-01-26"]
  closed_dates TEXT,
  
  -- Métodos de Pago (JSON)
  -- Formato: {"cash": true, "card": false}
  payment_methods TEXT DEFAULT '{"cash":true,"card":false}',
  
  -- Costes
  shipping_cost REAL DEFAULT 0,            -- Coste fijo de envío en €
  free_shipping_threshold REAL DEFAULT 0,  -- 0 = siempre gratis si shipping_cost=0
  minimum_order REAL DEFAULT 0,            -- Pedido mínimo en €
  
  -- Mensaje personalizado (fallback si no hay traducción)
  custom_message TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_delivery_settings_enabled ON delivery_settings(restaurant_id, is_enabled);
