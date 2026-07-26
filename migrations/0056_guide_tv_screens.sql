-- =====================================================
-- MIGRATION 0056: Guidebook on TV (pairing + analytics)
-- =====================================================
-- Backs the "VisualTaste TV" welcome-screen product (apps/tv): a physical
-- Android TV device is paired to one apartment via a short human-friendly
-- pairing code, and guest interactions on the TV are logged for host-facing
-- KPIs (impressions, WiFi reveals, section views).

CREATE TABLE IF NOT EXISTS guide_tv_devices (
  id              TEXT PRIMARY KEY,
  apartment_id    TEXT NOT NULL,
  pairing_code    TEXT UNIQUE NOT NULL,
  device_label    TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  paired_at       TIMESTAMP,
  last_seen_at    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_guide_tv_devices_apartment ON guide_tv_devices(apartment_id);
CREATE INDEX IF NOT EXISTS idx_guide_tv_devices_pairing_code ON guide_tv_devices(pairing_code);

CREATE TABLE IF NOT EXISTS guide_tv_events (
  id              TEXT PRIMARY KEY,
  apartment_id    TEXT NOT NULL,
  device_id       TEXT,
  event_type      TEXT NOT NULL CHECK(event_type IN (
                    'impression', 'screen_view', 'wifi_reveal',
                    'poi_select', 'menu_qr_shown', 'booking_qr_shown'
                  )),
  screen          TEXT,
  lang            TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES guide_tv_devices(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_guide_tv_events_apartment ON guide_tv_events(apartment_id, created_at);
CREATE INDEX IF NOT EXISTS idx_guide_tv_events_type ON guide_tv_events(event_type);
