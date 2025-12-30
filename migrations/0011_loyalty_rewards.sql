-- ==================================================================================
-- LOYALTY SYSTEM REWARDS & CLAIMS
-- ==================================================================================

-- 1. Campaign Rewards (The Prizes)
-- Linked to a specific campaign (e.g., "Scratch & Win Summer").
CREATE TABLE IF NOT EXISTS campaign_rewards (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  probability REAL DEFAULT 0, -- 0.0 to 1.0 (for probabilistic games)
  max_quantity INTEGER, -- Inventory limit
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE CASCADE
);

-- 2. Campaign Claims (The Winners/Redemptions)
-- Records who won what and their redemption status.
CREATE TABLE IF NOT EXISTS campaign_claims (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  reward_id TEXT, -- Nullable if campaign is just "viewed" or generic
  session_id TEXT NOT NULL,
  customer_contact TEXT,
  magic_link_token TEXT UNIQUE,
  status TEXT DEFAULT 'active', -- active, redeemed, expired
  redeemed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id),
  FOREIGN KEY (reward_id) REFERENCES campaign_rewards(id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- 3. Add Google Review URL to Restaurant Details
ALTER TABLE restaurant_details ADD COLUMN google_review_url TEXT;

-- 4. Update QR Codes for Staff Attribution
-- We add 'type' to distinguish menu QRs from waiter/loyalty QRs.
-- We add 'assigned_staff_id' to link to a specific waiter.
ALTER TABLE qr_codes ADD COLUMN type TEXT DEFAULT 'menu'; -- 'menu', 'loyalty', 'staff'
ALTER TABLE qr_codes ADD COLUMN assigned_staff_id TEXT;
-- Note: SQLite might not support adding FK constraints in ALTER TABLE easily, 
-- but we can logical enforcement or recreate table if needed. 
-- For now, simple columns are enough.

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_rewards_campaign ON campaign_rewards(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_claims_token ON campaign_claims(magic_link_token);
CREATE INDEX IF NOT EXISTS idx_campaign_claims_session ON campaign_claims(session_id);
