-- =====================================================
-- MIGRATION 0054: Add cuisine_type to guide_zone_restaurants
-- =====================================================
-- The main `restaurants` table does not have a cuisine_type column.
-- We store it per-zone in the bridge table so each zone can
-- customize how a restaurant is labelled (e.g. "Mediterránea", "Japonesa").

ALTER TABLE guide_zone_restaurants ADD COLUMN cuisine_type_override TEXT;

-- Optional: seed the value for existing rows from restaurants.name if needed
-- UPDATE guide_zone_restaurants SET cuisine_type_override = NULL; -- keep null by default
