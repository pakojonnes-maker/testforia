-- Migration: 0031_delivery_orders.sql
-- Sistema de Delivery v4: Tabla de pedidos

-- Tabla principal de pedidos de delivery
CREATE TABLE IF NOT EXISTS delivery_orders (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  
  -- Customer info
  customer_name TEXT,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_notes TEXT,
  
  -- Order details
  items TEXT NOT NULL, -- JSON array: [{dish_id, name, quantity, price}]
  subtotal REAL NOT NULL,
  shipping_cost REAL DEFAULT 0,
  total REAL NOT NULL,
  payment_method TEXT, -- 'cash' | 'card'
  
  -- Status tracking
  status TEXT DEFAULT 'pending', -- pending, confirmed, preparing, delivered, cancelled
  
  -- Metadata
  session_id TEXT,
  visitor_id TEXT,
  order_source TEXT DEFAULT 'whatsapp', -- 'whatsapp' | 'phone'
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP,
  delivered_at TIMESTAMP,
  
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_delivery_orders_restaurant ON delivery_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_created ON delivery_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_phone ON delivery_orders(customer_phone);
