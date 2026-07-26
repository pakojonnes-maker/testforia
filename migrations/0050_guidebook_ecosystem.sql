-- =====================================================
-- GUIDEBOOK ECOSYSTEM - MIGRATION 0050
-- =====================================================
-- Safe: All tables use CREATE IF NOT EXISTS
-- Safe: No ALTER on existing tables
-- Safe: guide_sessions is a NEW separate table
-- =====================================================

-- 1. ZONES (geographic grouping)
CREATE TABLE IF NOT EXISTS guide_zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  country TEXT DEFAULT 'ES',
  region TEXT,
  latitude REAL,
  longitude REAL,
  timezone TEXT DEFAULT 'Europe/Madrid',
  cover_image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. AGENCIES
CREATE TABLE IF NOT EXISTS guide_agencies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. AGENCY STAFF (links to existing users table)
CREATE TABLE IF NOT EXISTS guide_agency_staff (
  agency_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (agency_id, user_id),
  FOREIGN KEY (agency_id) REFERENCES guide_agencies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. APARTMENTS
CREATE TABLE IF NOT EXISTS guide_apartments (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  latitude REAL,
  longitude REAL,
  cover_image_url TEXT,
  qr_code_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agency_id) REFERENCES guide_agencies(id),
  FOREIGN KEY (zone_id) REFERENCES guide_zones(id)
);

-- 5. APARTMENT INFO (custom per apartment — wifi, rules, etc.)
CREATE TABLE IF NOT EXISTS guide_apartment_info (
  id TEXT PRIMARY KEY,
  apartment_id TEXT NOT NULL,
  info_key TEXT NOT NULL,
  icon_name TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id) ON DELETE CASCADE,
  UNIQUE(apartment_id, info_key)
);
-- Content translations via existing `translations` table:
-- entity_type = 'apartment_info', fields: 'title', 'content'

-- 6. APARTMENT MEDIA (photos/videos for instructions)
CREATE TABLE IF NOT EXISTS guide_apartment_media (
  id TEXT PRIMARY KEY,
  apartment_info_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK(media_type IN ('image', 'video')),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_info_id) REFERENCES guide_apartment_info(id) ON DELETE CASCADE
);

-- 7. POINTS OF INTEREST (tourism — video/reel format)
CREATE TABLE IF NOT EXISTS guide_pois (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL,
  category TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  google_maps_url TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zone_id) REFERENCES guide_zones(id)
);
-- Translations: entity_type = 'poi', fields: 'name', 'description', 'short_tip'

-- 8. POI MEDIA
CREATE TABLE IF NOT EXISTS guide_poi_media (
  id TEXT PRIMARY KEY,
  poi_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK(media_type IN ('image', 'video', 'thumbnail')),
  role TEXT CHECK(role IN ('PRIMARY_VIDEO', 'PRIMARY_IMAGE', 'GALLERY_IMAGE', 'THUMBNAIL')),
  width INTEGER,
  height INTEGER,
  duration INTEGER,
  file_size INTEGER,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (poi_id) REFERENCES guide_pois(id) ON DELETE CASCADE
);

-- 9. EXPERIENCES (activities — list + CTA format)
CREATE TABLE IF NOT EXISTS guide_experiences (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL,
  category TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK(action_type IN ('URL', 'WHATSAPP', 'PHONE', 'COUPON', 'IN_APP')),
  action_data TEXT NOT NULL,
  action_prefilled_message TEXT,
  commission_type TEXT CHECK(commission_type IN ('percentage', 'fixed', 'none')),
  commission_value REAL DEFAULT 0,
  price_display TEXT,
  cover_image_url TEXT,
  order_index INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zone_id) REFERENCES guide_zones(id)
);
-- Translations: entity_type = 'experience', fields: 'name', 'description', 'cta_label'

-- 10. ZONE-RESTAURANT BRIDGE (links existing restaurants to zones)
CREATE TABLE IF NOT EXISTS guide_zone_restaurants (
  zone_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'basic' CHECK(tier IN ('basic', 'featured')),
  order_override INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (zone_id, restaurant_id),
  FOREIGN KEY (zone_id) REFERENCES guide_zones(id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- 11. GUIDE SESSIONS (separate from menu sessions — lightweight)
CREATE TABLE IF NOT EXISTS guide_sessions (
  id TEXT PRIMARY KEY,
  apartment_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  device_type TEXT,
  os_name TEXT,
  browser TEXT,
  country TEXT,
  city TEXT,
  language_code TEXT DEFAULT 'es',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id)
);

-- 12. AFFILIATE INTENTS (multi-channel tracking)
CREATE TABLE IF NOT EXISTS guide_affiliate_intents (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  apartment_id TEXT,
  agency_id TEXT,
  zone_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('restaurant', 'experience', 'product')),
  target_id TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  user_agent TEXT,
  ip_country TEXT,
  ip_city TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES guide_sessions(id),
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id),
  FOREIGN KEY (agency_id) REFERENCES guide_agencies(id),
  FOREIGN KEY (zone_id) REFERENCES guide_zones(id)
);

-- 13. COMMISSION LEDGER
CREATE TABLE IF NOT EXISTS guide_commission_ledger (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL,
  intent_id TEXT,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'EUR',
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'paid', 'disputed')),
  notes TEXT,
  confirmed_at TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agency_id) REFERENCES guide_agencies(id),
  FOREIGN KEY (intent_id) REFERENCES guide_affiliate_intents(id)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_guide_apartments_zone ON guide_apartments(zone_id, is_active);
CREATE INDEX IF NOT EXISTS idx_guide_apartments_agency ON guide_apartments(agency_id);
CREATE INDEX IF NOT EXISTS idx_guide_apartments_slug ON guide_apartments(slug);
CREATE INDEX IF NOT EXISTS idx_guide_pois_zone ON guide_pois(zone_id, is_active, order_index);
CREATE INDEX IF NOT EXISTS idx_guide_experiences_zone ON guide_experiences(zone_id, is_active, order_index);
CREATE INDEX IF NOT EXISTS idx_guide_zone_rest_zone ON guide_zone_restaurants(zone_id, is_active);
CREATE INDEX IF NOT EXISTS idx_guide_zone_rest_tier ON guide_zone_restaurants(zone_id, tier, is_active);
CREATE INDEX IF NOT EXISTS idx_guide_intents_apartment ON guide_affiliate_intents(apartment_id, created_at);
CREATE INDEX IF NOT EXISTS idx_guide_intents_agency ON guide_affiliate_intents(agency_id, created_at);
CREATE INDEX IF NOT EXISTS idx_guide_intents_target ON guide_affiliate_intents(target_type, target_id, created_at);
CREATE INDEX IF NOT EXISTS idx_guide_ledger_agency ON guide_commission_ledger(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_guide_sessions_apartment ON guide_sessions(apartment_id, started_at);
CREATE INDEX IF NOT EXISTS idx_guide_sessions_zone ON guide_sessions(zone_id, started_at);
CREATE INDEX IF NOT EXISTS idx_guide_agency_staff_user ON guide_agency_staff(user_id);
