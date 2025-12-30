-- Add all supported languages to Yucas restaurant
-- Step 1: Ensure all language codes exist in the languages table
-- Step 2: Link them to the restaurant

-- Insert missing languages into the languages table (if they don't exist)
INSERT OR IGNORE INTO languages (code, name, native_name, flag_emoji, is_active) VALUES
('fr', 'French', 'Français', '🇫🇷', 1),
('de', 'German', 'Deutsch', '🇩🇪', 1),
('it', 'Italian', 'Italiano', '🇮🇹', 1),
('pt', 'Portuguese', 'Português', '🇵🇹', 1),
('kr', 'Korean', '한국어', '🇰🇷', 1),
('ja', 'Japanese', '日本語', '🇯🇵', 1),
('bn', 'Bengali', 'বাংলা', '🇧🇩', 1),
('ar', 'Arabic', 'العربية', '🇦🇪', 1), -- Using AE flag based on ae.svg
('ru', 'Russian', 'Русский', '🇷🇺', 1),
('ua', 'Ukrainian', 'Українська', '🇺🇦', 1),
('cn', 'Chinese', '中文', '🇨🇳', 1),
('in', 'Hindi', 'हिन्दी', '🇮🇳', 1);

-- Now add these languages to Yucas restaurant
INSERT OR IGNORE INTO restaurant_languages (restaurant_id, language_code, priority, completion_percentage, is_enabled, created_at, modified_at) VALUES
('rest_yucas_01', 'fr', 3, 0, 1, datetime('now'), datetime('now')),
('rest_yucas_01', 'de', 4, 0, 1, datetime('now'), datetime('now')),
('rest_yucas_01', 'it', 5, 0, 1, datetime('now'), datetime('now')),
('rest_yucas_01', 'pt', 6, 0, 1, datetime('now'), datetime('now')),
('rest_yucas_01', 'kr', 8, 0, 1, datetime('now'), datetime('now')),
('rest_yucas_01', 'ja', 9, 0, 1, datetime('now'), datetime('now')),
('rest_yucas_01', 'bn', 10, 0, 1, datetime('now'), datetime('now')),
('rest_yucas_01', 'ar', 11, 0, 1, datetime('now'), datetime('now')),
('rest_yucas_01', 'ru', 12, 0, 1, datetime('now'), datetime('now')),
('rest_yucas_01', 'ua', 13, 0, 1, datetime('now'), datetime('now')),
('rest_yucas_01', 'cn', 14, 0, 1, datetime('now'), datetime('now')),
('rest_yucas_01', 'in', 15, 0, 1, datetime('now'), datetime('now'));
