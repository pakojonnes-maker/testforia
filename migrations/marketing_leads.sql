CREATE TABLE marketing_leads (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('email', 'phone')),
  contact_value TEXT NOT NULL,
  name TEXT,
  consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT DEFAULT 'welcome_modal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE INDEX idx_marketing_leads_restaurant ON marketing_leads(restaurant_id);
