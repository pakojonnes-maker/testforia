-- ==================================================================================
-- CAMPAIGN SYSTEM ENHANCEMENTS
-- New fields for WhatsApp save, expiry, tracking, and redemption
-- ==================================================================================

-- 1. Add new columns to campaign_claims
ALTER TABLE campaign_claims ADD COLUMN visitor_id TEXT;
ALTER TABLE campaign_claims ADD COLUMN expires_at TIMESTAMP;
ALTER TABLE campaign_claims ADD COLUMN save_method TEXT; -- 'whatsapp', 'email', 'direct'
ALTER TABLE campaign_claims ADD COLUMN opened_at TIMESTAMP; -- When magic link was opened
ALTER TABLE campaign_claims ADD COLUMN source TEXT; -- 'welcome_modal', 'event', 'scratch_win'

-- 2. Campaign Events table for detailed tracking
CREATE TABLE IF NOT EXISTS campaign_events (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    claim_id TEXT,
    visitor_id TEXT,
    session_id TEXT,
    restaurant_id TEXT,
    event_type TEXT NOT NULL, -- 'shown', 'dismissed', 'phone_captured', 'email_captured', 'whatsapp_saved', 'opened', 'redeemed'
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (claim_id) REFERENCES campaign_claims(id) ON DELETE SET NULL
);

-- 3. Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign ON campaign_events(campaign_id, event_type);
CREATE INDEX IF NOT EXISTS idx_campaign_events_visitor ON campaign_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_campaign_claims_visitor ON campaign_claims(visitor_id);
CREATE INDEX IF NOT EXISTS idx_campaign_claims_expires ON campaign_claims(expires_at, status);
