-- =====================================================
-- GUIDEBOOK ENHANCEMENTS v2 - MIGRATION 0053
-- =====================================================

-- 1. POI enrichment fields (rating, distance, travel info)
ALTER TABLE guide_pois ADD COLUMN rating REAL;
ALTER TABLE guide_pois ADD COLUMN travel_time_text TEXT;    -- e.g. "5 min"
ALTER TABLE guide_pois ADD COLUMN travel_mode TEXT CHECK(travel_mode IN ('walk', 'drive', 'bike'));
ALTER TABLE guide_pois ADD COLUMN distance_text TEXT;       -- e.g. "450 m"

-- 2. Experience promotion fields (badges, discount display, original price)
ALTER TABLE guide_experiences ADD COLUMN discount_display TEXT;           -- e.g. "20% Dto"
ALTER TABLE guide_experiences ADD COLUMN original_price_display TEXT;     -- e.g. "€250/persona"
ALTER TABLE guide_experiences ADD COLUMN badge_type TEXT CHECK(badge_type IN ('discount', 'courtesy', 'exclusive', 'new'));

-- 3. Apartment-POI bridge table (agency assigns which POIs appear in each apartment)
--    Fallback: if no rows exist for an apartment, return all zone POIs
CREATE TABLE IF NOT EXISTS guide_apartment_pois (
  apartment_id TEXT NOT NULL,
  poi_id       TEXT NOT NULL,
  order_override INTEGER DEFAULT 0,
  is_hidden    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (apartment_id, poi_id),
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id) ON DELETE CASCADE,
  FOREIGN KEY (poi_id) REFERENCES guide_pois(id) ON DELETE CASCADE
);

-- 4. Sequential guide support on apartment info items
ALTER TABLE guide_apartment_info ADD COLUMN is_sequential BOOLEAN DEFAULT FALSE;
ALTER TABLE guide_apartment_info ADD COLUMN guide_group TEXT;  -- e.g. 'Alojamiento', 'Electrodomésticos', 'Normas'
ALTER TABLE guide_apartment_info ADD COLUMN has_checklist BOOLEAN DEFAULT FALSE;

-- 5. Steps for sequential guides
CREATE TABLE IF NOT EXISTS guide_info_steps (
  id                  TEXT PRIMARY KEY,
  apartment_info_id   TEXT NOT NULL,
  step_number         INTEGER NOT NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(apartment_info_id, step_number),
  FOREIGN KEY (apartment_info_id) REFERENCES guide_apartment_info(id) ON DELETE CASCADE
);
-- Step text goes in translations table:
--   entity_type = 'guide_step', field = 'title' | 'content' | 'checklist_items' (JSON array)

-- 6. Media for individual steps
CREATE TABLE IF NOT EXISTS guide_info_step_media (
  id          TEXT PRIMARY KEY,
  step_id     TEXT NOT NULL,
  r2_key      TEXT NOT NULL,
  media_type  TEXT NOT NULL CHECK(media_type IN ('image', 'video')),
  order_index INTEGER DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (step_id) REFERENCES guide_info_steps(id) ON DELETE CASCADE
);

-- 7. Coupons for COUPON action_type experiences
CREATE TABLE IF NOT EXISTS guide_coupons (
  id              TEXT PRIMARY KEY,
  experience_id   TEXT NOT NULL,
  code            TEXT NOT NULL UNIQUE,
  discount_type   TEXT CHECK(discount_type IN ('percentage', 'fixed')),
  discount_value  REAL NOT NULL,
  max_uses        INTEGER,
  current_uses    INTEGER DEFAULT 0,
  valid_from      TIMESTAMP,
  valid_until     TIMESTAMP,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (experience_id) REFERENCES guide_experiences(id)
);

-- 8. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_guide_apt_pois_apt ON guide_apartment_pois(apartment_id, is_hidden, order_override);
CREATE INDEX IF NOT EXISTS idx_guide_info_steps ON guide_info_steps(apartment_info_id, step_number);
CREATE INDEX IF NOT EXISTS idx_guide_step_media ON guide_info_step_media(step_id, order_index);
CREATE INDEX IF NOT EXISTS idx_guide_coupons_exp ON guide_coupons(experience_id, is_active);
CREATE INDEX IF NOT EXISTS idx_guide_pois_zone_active ON guide_pois(zone_id, is_active, order_index);
CREATE INDEX IF NOT EXISTS idx_guide_experiences_zone ON guide_experiences(zone_id, is_active, is_featured, order_index);
