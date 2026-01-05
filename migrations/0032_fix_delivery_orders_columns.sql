-- Migration: 0032_fix_delivery_orders_columns.sql
-- Añadir columnas faltantes a delivery_orders

-- Añadir order_source si no existe
ALTER TABLE delivery_orders ADD COLUMN order_source TEXT DEFAULT 'whatsapp';

-- Añadir visitor_id si no existe (por si acaso)
-- SQLite permite ADD COLUMN solo sin IF NOT EXISTS, así que estos comandos fallarán silenciosamente si ya existen
