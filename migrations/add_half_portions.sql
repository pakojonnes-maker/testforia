-- Migration: Add half portion support to dishes table

ALTER TABLE dishes ADD COLUMN half_price REAL;
ALTER TABLE dishes ADD COLUMN has_half_portion BOOLEAN DEFAULT FALSE;
