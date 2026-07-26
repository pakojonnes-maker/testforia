-- =====================================================
-- UNIFY GUIDE POIS + EXPERIENCES INTO A SINGLE TABLE - MIGRATION 0059
-- =====================================================
-- Rationale: "free vs paid" was the wrong axis. A paid monument (Alcazaba,
-- Bioparc, Teleférico) is BOTH a located place (map pin, rating, per-apartment
-- curation) AND a monetizable item (price, CTA, commission). The old split
-- (guide_pois = located/free, guide_experiences = sellable/no-location) could
-- not represent it. We make guide_pois the single superset table:
--   * is_bookable = 0  -> informational place  (rendered in "Descubre" + map)
--   * is_bookable = 1  -> sellable item        (rendered in "Promociones")
--   * an item can be BOTH (has coords AND is_bookable) -> appears in both.
--
-- Compatibility strategy (low risk):
--   * Existing experience rows are copied into guide_pois REUSING THEIR ID.
--   * translations entity_type 'experience' -> 'poi' (ids unchanged).
--   * guide_affiliate_intents keeps target_type='experience' as a LOGICAL label
--     that now resolves against guide_pois (no frontend / tracking-worker change).
--   * guide_experiences table is kept (deprecated) — NOT dropped.
--
-- NOTE: run once. ADD COLUMN is not idempotent (re-running errors on existing cols),
-- matching the convention of migrations 0052/0053. Enums are documented in comments
-- (no CHECK on ALTER) and enforced in the worker layer.
-- =====================================================

-- 1. Classification axes (the two real dimensions, now explicit)
ALTER TABLE guide_pois ADD COLUMN poi_type    TEXT NOT NULL DEFAULT 'sight';   -- sight|attraction|museum|beach|nature|service|experience
ALTER TABLE guide_pois ADD COLUMN subcategory TEXT;                            -- free text (maps old experiences.service_subcategory)
ALTER TABLE guide_pois ADD COLUMN access_type TEXT NOT NULL DEFAULT 'free';    -- free|paid|mixed

-- 2. Richer location / external-source data ("cuantos más datos mejor")
ALTER TABLE guide_pois ADD COLUMN address          TEXT;
ALTER TABLE guide_pois ADD COLUMN google_place_id  TEXT;   -- for Google Places sync / dedupe
ALTER TABLE guide_pois ADD COLUMN what3words        TEXT;

-- 3. Ratings (editorial + external)
ALTER TABLE guide_pois ADD COLUMN rating_count        INTEGER;
ALTER TABLE guide_pois ADD COLUMN google_rating       REAL;
ALTER TABLE guide_pois ADD COLUMN google_rating_count INTEGER;

-- 4. Practical info
ALTER TABLE guide_pois ADD COLUMN opening_hours TEXT;   -- JSON per day
ALTER TABLE guide_pois ADD COLUMN phone         TEXT;
ALTER TABLE guide_pois ADD COLUMN website_url   TEXT;
ALTER TABLE guide_pois ADD COLUMN booking_url   TEXT;
ALTER TABLE guide_pois ADD COLUMN duration_text TEXT;   -- e.g. "1-2 h"

-- 5. Price (numeric for sort/filter + display strings for UI)
ALTER TABLE guide_pois ADD COLUMN price_amount           REAL;
ALTER TABLE guide_pois ADD COLUMN price_currency         TEXT DEFAULT 'EUR';
ALTER TABLE guide_pois ADD COLUMN price_display          TEXT;
ALTER TABLE guide_pois ADD COLUMN original_price_display TEXT;
ALTER TABLE guide_pois ADD COLUMN discount_display       TEXT;

-- 6. Monetization / CTA (previously exclusive to guide_experiences)
ALTER TABLE guide_pois ADD COLUMN is_bookable             BOOLEAN DEFAULT FALSE;
ALTER TABLE guide_pois ADD COLUMN action_type             TEXT;   -- URL|WHATSAPP|PHONE|COUPON|IN_APP
ALTER TABLE guide_pois ADD COLUMN action_data             TEXT;
ALTER TABLE guide_pois ADD COLUMN action_prefilled_message TEXT;
ALTER TABLE guide_pois ADD COLUMN commission_type         TEXT;   -- percentage|fixed|none
ALTER TABLE guide_pois ADD COLUMN commission_value        REAL DEFAULT 0;
ALTER TABLE guide_pois ADD COLUMN badge_type              TEXT;   -- discount|courtesy|exclusive|new|free

-- 7. Media fallback (external URL) + featured flag + provenance
ALTER TABLE guide_pois ADD COLUMN cover_image_url TEXT;   -- external URL fallback (guide_poi_media = R2 canonical)
ALTER TABLE guide_pois ADD COLUMN is_featured     BOOLEAN DEFAULT FALSE;
ALTER TABLE guide_pois ADD COLUMN source          TEXT;   -- manual|google|tripadvisor|migrated
ALTER TABLE guide_pois ADD COLUMN external_id     TEXT;

-- 8. Travel info belongs to the apartment<->poi relation (relative to each flat)
ALTER TABLE guide_apartment_pois ADD COLUMN travel_time_text TEXT;
ALTER TABLE guide_apartment_pois ADD COLUMN travel_mode      TEXT;   -- walk|drive|bike
ALTER TABLE guide_apartment_pois ADD COLUMN distance_text    TEXT;

-- 9. Coupons: add poi_id (keeps experience_id for back-compat; same id value)
ALTER TABLE guide_coupons ADD COLUMN poi_id TEXT;

-- =====================================================
-- DATA MIGRATION: guide_experiences -> guide_pois (reuse ids)
-- =====================================================
INSERT INTO guide_pois (
    id, zone_id, category, subcategory, poi_type, access_type, is_bookable,
    action_type, action_data, action_prefilled_message,
    commission_type, commission_value,
    price_display, original_price_display, discount_display, badge_type,
    cover_image_url, is_featured, is_active, order_index, source,
    created_at, modified_at
)
SELECT
    e.id, e.zone_id, e.category, e.service_subcategory, 'experience', 'paid', 1,
    e.action_type, e.action_data, e.action_prefilled_message,
    e.commission_type, e.commission_value,
    e.price_display, e.original_price_display, e.discount_display, e.badge_type,
    e.cover_image_url, e.is_featured, e.is_active, e.order_index, 'migrated',
    e.created_at, e.modified_at
FROM guide_experiences e
WHERE e.id NOT IN (SELECT id FROM guide_pois);

-- Translations follow the row: 'experience' -> 'poi' (name/description/cta_label)
UPDATE translations SET entity_type = 'poi' WHERE entity_type = 'experience';

-- Coupons: backfill poi_id from the (unchanged) experience id
UPDATE guide_coupons SET poi_id = experience_id WHERE poi_id IS NULL;

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_guide_pois_bookable ON guide_pois(zone_id, is_bookable, is_active, is_featured, order_index);
CREATE INDEX IF NOT EXISTS idx_guide_pois_type     ON guide_pois(zone_id, poi_type, is_active);
CREATE INDEX IF NOT EXISTS idx_guide_pois_coords   ON guide_pois(zone_id, is_active, latitude);
