-- =====================================================
-- MIGRATION 0079: Structured WiFi fields on guide_apartments
-- =====================================================
-- The TV welcome screen (apps/tv) needs SSID/password separately to build a
-- WIFI: QR that connects automatically. Until now the WiFi lived only as free
-- text inside guide_apartment_info (key='wifi'), which the guide website
-- renders as-is but the TV can't parse reliably (host-authored, no fixed
-- format). These columns are optional: the worker falls back to parsing the
-- free-text info item when they're empty, so existing apartments keep working.

ALTER TABLE guide_apartments ADD COLUMN wifi_ssid TEXT;
ALTER TABLE guide_apartments ADD COLUMN wifi_password TEXT;
ALTER TABLE guide_apartments ADD COLUMN wifi_security TEXT DEFAULT 'WPA';
