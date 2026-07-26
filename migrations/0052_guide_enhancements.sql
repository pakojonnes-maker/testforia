-- =====================================================
-- GUIDEBOOK ENHANCEMENTS - MIGRATION 0052
-- =====================================================

-- 1. Add service subcategory to experiences
-- Examples: 'nautical/yacht', 'nautical/kayak', 'gastro/chef', 'beauty/nails', 'beauty/massage', 'transport/transfer', 'adventure/surf'
ALTER TABLE guide_experiences ADD COLUMN service_subcategory TEXT;

-- 2. Add agency branding/theming
ALTER TABLE guide_agencies ADD COLUMN primary_color TEXT;     -- hex eg: '#1565C0'
ALTER TABLE guide_agencies ADD COLUMN secondary_color TEXT;   -- hex
ALTER TABLE guide_agencies ADD COLUMN accent_color TEXT;      -- hex
ALTER TABLE guide_agencies ADD COLUMN font_family TEXT;       -- eg: 'Lato', uses default Inter if null

-- 3. Device fingerprint tracking for guest count estimation
ALTER TABLE guide_sessions ADD COLUMN device_fingerprint TEXT;

-- 4. Track which sections users visit in the guidebook
CREATE TABLE IF NOT EXISTS guide_section_views (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  apartment_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  section TEXT NOT NULL CHECK(section IN ('info', 'discover', 'restaurants', 'services')),
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES guide_sessions(id),
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id)
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_guide_sessions_fingerprint ON guide_sessions(device_fingerprint, apartment_id);
CREATE INDEX IF NOT EXISTS idx_guide_section_views_apt ON guide_section_views(apartment_id, section, created_at);
CREATE INDEX IF NOT EXISTS idx_guide_section_views_session ON guide_section_views(session_id);
