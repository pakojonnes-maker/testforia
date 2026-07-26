-- =====================================================
-- MIGRATION 0055: Welcome modal per apartment
-- =====================================================
-- Shows once per guide page load (not persisted/suppressed client-side —
-- the agency wants it to greet the guest every time they open the guide).

CREATE TABLE IF NOT EXISTS guide_welcome_modals (
  id              TEXT PRIMARY KEY,
  apartment_id    TEXT NOT NULL UNIQUE,
  is_active       BOOLEAN DEFAULT FALSE,
  image_url       TEXT,
  action_enabled  BOOLEAN DEFAULT FALSE,
  action_type     TEXT CHECK(action_type IN ('URL', 'WHATSAPP', 'PHONE')),
  action_data     TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES guide_apartments(id) ON DELETE CASCADE
);
-- Translations: entity_type = 'welcome_modal', fields: 'title', 'body', 'action_label'

CREATE INDEX IF NOT EXISTS idx_guide_welcome_modals_apartment ON guide_welcome_modals(apartment_id, is_active);
