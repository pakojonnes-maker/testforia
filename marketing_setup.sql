-- 1. Create table for marketing leads
CREATE TABLE IF NOT EXISTS marketing_leads (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('email', 'phone')),
    contact_value TEXT NOT NULL,
    source TEXT DEFAULT 'welcome_modal',
    consent_given BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- 2. Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_marketing_leads_restaurant ON marketing_leads(restaurant_id);

-- 3. Update existing restaurants with default marketing config (if features is null or empty)
-- Note: This is a safe update that tries to preserve existing JSON if possible, 
-- but for simplicity in SQLite we might just append or merge if supported, 
-- or just set it if null. Here we assume we want to ensure the structure exists.

-- Example of how to update a specific restaurant (replace 'RESTAURANT_ID' with actual ID)
-- UPDATE restaurants 
-- SET features = json_patch(
--     COALESCE(features, '{}'), 
--     '{
--         "marketing_popup": {
--             "title": "¡Oferta Especial!",
--             "description": "Suscríbete para recibir un postre gratis en tu próxima visita.",
--             "imageUrl": "https://visualtasteworker.franciscotortosaestudios.workers.dev/media/System/placeholders/dessert.jpg",
--             "showCaptureForm": true,
--             "showEmail": true,
--             "showPhone": true,
--             "enableAutoOpen": true,
--             "delay": 2000
--         }
--     }'
-- )
-- WHERE id = 'RESTAURANT_ID';
