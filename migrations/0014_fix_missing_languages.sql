-- FIX: Ensure languages exist before translation
-- Run this script FIRST to resolve "FOREIGN KEY constraint failed" errors.

INSERT OR IGNORE INTO languages (code, name, native_name, flag_emoji, is_active) VALUES
('nl', 'Dutch', 'Nederlands', '🇳🇱', 1),
('sv', 'Swedish', 'Svenska', '🇸🇪', 1),
('pl', 'Polish', 'Polski', '🇵🇱', 1),
('tr', 'Turkish', 'Türkçe', '🇹🇷', 1),
('zh', 'Chinese', '中文', '🇨🇳', 1),
('ko', 'Korean', '한국어', '🇰🇷', 1);

-- Note: 'pt' likely already existed, which is why it worked. 'nl' was missing.
