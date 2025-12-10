-- ==================================================================================
-- MARKETING ARCHITECTURE
-- Scalable structure for managing offers, popups, and leads.
-- ==================================================================================

-- 1. Marketing Campaigns (The "Configuration")
-- Instead of storing config in the restaurant JSON, we use a dedicated table.
-- This allows multiple campaigns, scheduling, and A/B testing in the future.
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    name TEXT NOT NULL,              -- Internal name (e.g., "Welcome Summer 2025")
    type TEXT NOT NULL,              -- 'welcome_modal', 'exit_intent', 'banner', 'newsletter'
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,      -- Higher number = higher priority
    
    -- Configuration & Content
    -- We use JSON for flexibility within the structured table.
    -- content: { title, description, image_url, ... }
    -- settings: { show_email, show_phone, auto_open, delay, ... }
    content JSON,
    settings JSON,
    
    -- Scheduling
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- 2. Marketing Leads (The "Results")
-- Links leads to specific campaigns for better attribution.
CREATE TABLE IF NOT EXISTS marketing_leads (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    campaign_id TEXT,                -- Link to the specific campaign (optional but recommended)
    
    type TEXT NOT NULL CHECK(type IN ('email', 'phone')),
    contact_value TEXT NOT NULL,
    
    -- Metadata
    source TEXT,                     -- 'welcome_modal', 'footer', etc. (redundant if campaign_id is used, but good for backup)
    consent_given BOOLEAN DEFAULT TRUE,
    metadata JSON,                   -- { device: 'mobile', url: '/menu', ... }
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_restaurant ON marketing_campaigns(restaurant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_restaurant ON marketing_leads(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_campaign ON marketing_leads(campaign_id);

-- ==================================================================================
-- MIGRATION / SEED EXAMPLE
-- ==================================================================================

-- Example: Insert a default welcome modal for a restaurant
-- INSERT INTO marketing_campaigns (id, restaurant_id, name, type, is_active, content, settings)
-- VALUES (
--     'uuid-123',
--     'RESTAURANT_ID',
--     'Default Welcome Offer',
--     'welcome_modal',
--     TRUE,
--     '{ "title": "¡Oferta de Bienvenida!", "description": "Suscríbete y gana un postre.", "image_url": "..." }',
--     '{ "show_email": true, "show_phone": true, "auto_open": true, "delay": 2000 }'
-- );
