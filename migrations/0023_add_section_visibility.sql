-- Migration: Add visibility column to sections table
-- Author: System
-- Date: 2025-12-29
-- Description: Allows sections to be hidden from public view while admins work on them

-- Step 1: Add the is_visible column with default TRUE for backwards compatibility
ALTER TABLE sections ADD COLUMN is_visible BOOLEAN DEFAULT TRUE;

-- Step 2: Create composite index for optimized public queries
-- This index covers the common query pattern: filter by restaurant, menu, visibility, ordered by order_index
CREATE INDEX idx_sections_visible ON sections(restaurant_id, menu_id, is_visible, order_index);

-- Verification query (run manually to confirm):
-- SELECT id, is_visible FROM sections LIMIT 5;
