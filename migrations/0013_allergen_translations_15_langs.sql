-- Migration: Add 15 languages and translate allergens (Transaction Safe)
-- Fixes FOREIGN KEY constraint failed error
-- Created: 2025-12-23

BEGIN TRANSACTION;

-- 1. Ensure Languages Exist (Standard ISO Codes)
-- We strictly ensure 'ko', 'zh', 'tr', 'nl', 'sv', 'pl' etc exist before using them.
INSERT OR IGNORE INTO languages (code, name, native_name, flag_emoji, is_active) VALUES
('es', 'Spanish', 'Español', '🇪🇸', 1),
('en', 'English', 'English', '🇬🇧', 1),
('fr', 'French', 'Français', '🇫🇷', 1),
('de', 'German', 'Deutsch', '🇩🇪', 1),
('it', 'Italian', 'Italiano', '🇮🇹', 1),
('pt', 'Portuguese', 'Português', '🇵🇹', 1),
('nl', 'Dutch', 'Nederlands', '🇳🇱', 1),
('sv', 'Swedish', 'Svenska', '🇸🇪', 1),
('pl', 'Polish', 'Polski', '🇵🇱', 1),
('ru', 'Russian', 'Русский', '🇷🇺', 1),
('zh', 'Chinese', '中文', '🇨🇳', 1),
('ja', 'Japanese', '日本語', '🇯🇵', 1),
('ar', 'Arabic', 'العربية', '🇸🇦', 1),
('ko', 'Korean', '한국어', '🇰🇷', 1),
('tr', 'Turkish', 'Türkçe', '🇹🇷', 1);

-- 2. Insert Translations for Allergens (Safe REPLACE)

-- Gluten
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_gluten', 'allergen', 'es', 'name', 'Gluten');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_gluten', 'allergen', 'en', 'name', 'Gluten');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_gluten', 'allergen', 'fr', 'name', 'Gluten');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_gluten', 'allergen', 'de', 'name', 'Gluten');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_gluten', 'allergen', 'it', 'name', 'Glutine');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_gluten', 'allergen', 'pt', 'name', 'Glúten');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_gluten', 'allergen', 'nl', 'name', 'Gluten');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_gluten', 'allergen', 'sv', 'name', 'Gluten');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_gluten', 'allergen', 'pl', 'name', 'Gluten');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_gluten', 'allergen', 'ru', 'name', 'Глютен');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_gluten', 'allergen', 'zh', 'name', '麸质');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_gluten', 'allergen', 'ja', 'name', 'グルテン');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_gluten', 'allergen', 'ar', 'name', 'غلوتين');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_gluten', 'allergen', 'ko', 'name', '글루텐');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_gluten', 'allergen', 'tr', 'name', 'Glüten');

-- Milk
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_milk', 'allergen', 'es', 'name', 'Lácteos');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_milk', 'allergen', 'en', 'name', 'Milk');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_milk', 'allergen', 'fr', 'name', 'Lait');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_milk', 'allergen', 'de', 'name', 'Milch');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_milk', 'allergen', 'it', 'name', 'Latte');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_milk', 'allergen', 'pt', 'name', 'Leite');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_milk', 'allergen', 'nl', 'name', 'Melk');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_milk', 'allergen', 'sv', 'name', 'Mjölk');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_milk', 'allergen', 'pl', 'name', 'Mleko');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_milk', 'allergen', 'ru', 'name', 'Молоко');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_milk', 'allergen', 'zh', 'name', '牛奶');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_milk', 'allergen', 'ja', 'name', '牛乳');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_milk', 'allergen', 'ar', 'name', 'حليب');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_milk', 'allergen', 'ko', 'name', '우유');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_milk', 'allergen', 'tr', 'name', 'Süt');

-- Eggs
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_eggs', 'allergen', 'es', 'name', 'Huevo');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_eggs', 'allergen', 'en', 'name', 'Eggs');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_eggs', 'allergen', 'fr', 'name', 'Œufs');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_eggs', 'allergen', 'de', 'name', 'Eier');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_eggs', 'allergen', 'it', 'name', 'Uova');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_eggs', 'allergen', 'pt', 'name', 'Ovos');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_eggs', 'allergen', 'nl', 'name', 'Eieren');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_eggs', 'allergen', 'sv', 'name', 'Ägg');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_eggs', 'allergen', 'pl', 'name', 'Jaja');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_eggs', 'allergen', 'ru', 'name', 'Яйца');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_eggs', 'allergen', 'zh', 'name', '蛋');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_eggs', 'allergen', 'ja', 'name', '卵');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_eggs', 'allergen', 'ar', 'name', 'بيض');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_eggs', 'allergen', 'ko', 'name', '계란');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_eggs', 'allergen', 'tr', 'name', 'Yumurta');

-- Fish
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_fish', 'allergen', 'es', 'name', 'Pescado');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_fish', 'allergen', 'en', 'name', 'Fish');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_fish', 'allergen', 'fr', 'name', 'Poisson');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_fish', 'allergen', 'de', 'name', 'Fisch');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_fish', 'allergen', 'it', 'name', 'Pesce');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_fish', 'allergen', 'pt', 'name', 'Peixe');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_fish', 'allergen', 'nl', 'name', 'Vis');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_fish', 'allergen', 'sv', 'name', 'Fisk');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_fish', 'allergen', 'pl', 'name', 'Ryby');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_fish', 'allergen', 'ru', 'name', 'Рыба');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_fish', 'allergen', 'zh', 'name', '鱼');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_fish', 'allergen', 'ja', 'name', '魚');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_fish', 'allergen', 'ar', 'name', 'سمك');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_fish', 'allergen', 'ko', 'name', '생선');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_fish', 'allergen', 'tr', 'name', 'Balık');

-- Crustaceans
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_crustaceans', 'allergen', 'es', 'name', 'Crustáceos');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_crustaceans', 'allergen', 'en', 'name', 'Crustaceans');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_crustaceans', 'allergen', 'fr', 'name', 'Crustacés');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_crustaceans', 'allergen', 'de', 'name', 'Krebstiere');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_crustaceans', 'allergen', 'it', 'name', 'Crostacei');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_crustaceans', 'allergen', 'pt', 'name', 'Crustáceos');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_crustaceans', 'allergen', 'nl', 'name', 'Schaaldieren');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_crustaceans', 'allergen', 'sv', 'name', 'Kräftdjur');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_crustaceans', 'allergen', 'pl', 'name', 'Skorupiaki');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_crustaceans', 'allergen', 'ru', 'name', 'Ракообразные');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_crustaceans', 'allergen', 'zh', 'name', '甲壳类');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_crustaceans', 'allergen', 'ja', 'name', '甲殻類');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_crustaceans', 'allergen', 'ar', 'name', 'قشريات');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_crustaceans', 'allergen', 'ko', 'name', '갑각류');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_crustaceans', 'allergen', 'tr', 'name', 'Kabuklular');

-- Nuts
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_nuts', 'allergen', 'es', 'name', 'Frutos Secos');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_nuts', 'allergen', 'en', 'name', 'Nuts');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_nuts', 'allergen', 'fr', 'name', 'Fruits à coque');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_nuts', 'allergen', 'de', 'name', 'Schalenfrüchte');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_nuts', 'allergen', 'it', 'name', 'Frutta a guscio');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_nuts', 'allergen', 'pt', 'name', 'Frutos de casca rija');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_nuts', 'allergen', 'nl', 'name', 'Noten');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_nuts', 'allergen', 'sv', 'name', 'Nötter');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_nuts', 'allergen', 'pl', 'name', 'Orzechy');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_nuts', 'allergen', 'ru', 'name', 'Орехи');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_nuts', 'allergen', 'zh', 'name', '坚果');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_nuts', 'allergen', 'ja', 'name', 'ナッツ');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_nuts', 'allergen', 'ar', 'name', 'مكسرات');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_nuts', 'allergen', 'ko', 'name', '견과류');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_nuts', 'allergen', 'tr', 'name', 'Kuruyemiş');

-- Peanuts
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_peanuts', 'allergen', 'es', 'name', 'Cacahuetes');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_peanuts', 'allergen', 'en', 'name', 'Peanuts');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_peanuts', 'allergen', 'fr', 'name', 'Arachides');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_peanuts', 'allergen', 'de', 'name', 'Erdnüsse');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_peanuts', 'allergen', 'it', 'name', 'Arachidi');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_peanuts', 'allergen', 'pt', 'name', 'Amendoins');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_peanuts', 'allergen', 'nl', 'name', 'Pinda''s');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_peanuts', 'allergen', 'sv', 'name', 'Jordnötter');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_peanuts', 'allergen', 'pl', 'name', 'Orzeszki ziemne');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_peanuts', 'allergen', 'ru', 'name', 'Арахис');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_peanuts', 'allergen', 'zh', 'name', '花生');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_peanuts', 'allergen', 'ja', 'name', 'ピーナッツ');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_peanuts', 'allergen', 'ar', 'name', 'فول سوداني');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_peanuts', 'allergen', 'ko', 'name', '땅콩');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_peanuts', 'allergen', 'tr', 'name', 'Yer fıstığı');

-- Soy
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_soy', 'allergen', 'es', 'name', 'Soja');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_soy', 'allergen', 'en', 'name', 'Soy');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_soy', 'allergen', 'fr', 'name', 'Soja');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_soy', 'allergen', 'de', 'name', 'Soja');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_soy', 'allergen', 'it', 'name', 'Soia');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_soy', 'allergen', 'pt', 'name', 'Soja');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_soy', 'allergen', 'nl', 'name', 'Soja');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_soy', 'allergen', 'sv', 'name', 'Soja');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_soy', 'allergen', 'pl', 'name', 'Soja');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_soy', 'allergen', 'ru', 'name', 'Соя');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_soy', 'allergen', 'zh', 'name', '大豆');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_soy', 'allergen', 'ja', 'name', '大豆');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_soy', 'allergen', 'ar', 'name', 'صويا');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_soy', 'allergen', 'ko', 'name', '대두');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_soy', 'allergen', 'tr', 'name', 'Soya');

-- Celery
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_celery', 'allergen', 'es', 'name', 'Apio');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_celery', 'allergen', 'en', 'name', 'Celery');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_celery', 'allergen', 'fr', 'name', 'Céleri');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_celery', 'allergen', 'de', 'name', 'Sellerie');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_celery', 'allergen', 'it', 'name', 'Sedano');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_celery', 'allergen', 'pt', 'name', 'Aipo');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_celery', 'allergen', 'nl', 'name', 'Selderij');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_celery', 'allergen', 'sv', 'name', 'Selleri');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_celery', 'allergen', 'pl', 'name', 'Seler');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_celery', 'allergen', 'ru', 'name', 'Сельдерей');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_celery', 'allergen', 'zh', 'name', '芹菜');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_celery', 'allergen', 'ja', 'name', 'セロリ');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_celery', 'allergen', 'ar', 'name', 'كرفس');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_celery', 'allergen', 'ko', 'name', '셀러리');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_celery', 'allergen', 'tr', 'name', 'Kereviz');

-- Mustard
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_mustard', 'allergen', 'es', 'name', 'Mostaza');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_mustard', 'allergen', 'en', 'name', 'Mustard');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_mustard', 'allergen', 'fr', 'name', 'Moutarde');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_mustard', 'allergen', 'de', 'name', 'Senf');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_mustard', 'allergen', 'it', 'name', 'Senape');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_mustard', 'allergen', 'pt', 'name', 'Mostarda');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_mustard', 'allergen', 'nl', 'name', 'Mosterd');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_mustard', 'allergen', 'sv', 'name', 'Senap');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_mustard', 'allergen', 'pl', 'name', 'Gorczyca');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_mustard', 'allergen', 'ru', 'name', 'Горчица');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_mustard', 'allergen', 'zh', 'name', '芥末');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_mustard', 'allergen', 'ja', 'name', 'マスタード');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_mustard', 'allergen', 'ar', 'name', 'خردل');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_mustard', 'allergen', 'ko', 'name', '겨자');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_mustard', 'allergen', 'tr', 'name', 'Hardal');

-- Sesame
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sesame', 'allergen', 'es', 'name', 'Sésamo');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sesame', 'allergen', 'en', 'name', 'Sesame');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sesame', 'allergen', 'fr', 'name', 'Sésame');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sesame', 'allergen', 'de', 'name', 'Sesam');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sesame', 'allergen', 'it', 'name', 'Sesamo');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sesame', 'allergen', 'pt', 'name', 'Sésamo');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sesame', 'allergen', 'nl', 'name', 'Sesam');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sesame', 'allergen', 'sv', 'name', 'Sesam');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sesame', 'allergen', 'pl', 'name', 'Sezam');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sesame', 'allergen', 'ru', 'name', 'Кунжут');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sesame', 'allergen', 'zh', 'name', '芝麻');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sesame', 'allergen', 'ja', 'name', 'ゴマ');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sesame', 'allergen', 'ar', 'name', 'سمسم');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sesame', 'allergen', 'ko', 'name', '참깨');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sesame', 'allergen', 'tr', 'name', 'Susam');

-- Sulphites
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sulphites', 'allergen', 'es', 'name', 'Sulfitos');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sulphites', 'allergen', 'en', 'name', 'Sulphites');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sulphites', 'allergen', 'fr', 'name', 'Sulfites');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sulphites', 'allergen', 'de', 'name', 'Sulfite');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sulphites', 'allergen', 'it', 'name', 'Solfiti');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sulphites', 'allergen', 'pt', 'name', 'Sulfitos');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sulphites', 'allergen', 'nl', 'name', 'Sulfieten');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sulphites', 'allergen', 'sv', 'name', 'Sulfiter');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sulphites', 'allergen', 'pl', 'name', 'Siarczyny');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sulphites', 'allergen', 'ru', 'name', 'Сульфиты');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sulphites', 'allergen', 'zh', 'name', '亚硫酸盐');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sulphites', 'allergen', 'ja', 'name', '亜硫酸塩');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sulphites', 'allergen', 'ar', 'name', 'كبريتites');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sulphites', 'allergen', 'ko', 'name', '아황산염');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_sulphites', 'allergen', 'tr', 'name', 'Sülfitler');

-- Lupin
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_lupin', 'allergen', 'es', 'name', 'Altramuces');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_lupin', 'allergen', 'en', 'name', 'Lupin');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_lupin', 'allergen', 'fr', 'name', 'Lupin');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_lupin', 'allergen', 'de', 'name', 'Lupine');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_lupin', 'allergen', 'it', 'name', 'Lupini');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_lupin', 'allergen', 'pt', 'name', 'Tremoço');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_lupin', 'allergen', 'nl', 'name', 'Lupine');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_lupin', 'allergen', 'sv', 'name', 'Lupin');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_lupin', 'allergen', 'pl', 'name', 'Łubin');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_lupin', 'allergen', 'ru', 'name', 'Люпин');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_lupin', 'allergen', 'zh', 'name', '羽扇豆');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_lupin', 'allergen', 'ja', 'name', 'ルピナス');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_lupin', 'allergen', 'ar', 'name', 'ترمس');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_lupin', 'allergen', 'ko', 'name', '루핀');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_lupin', 'allergen', 'tr', 'name', 'Acı bakla');

-- Molluscs
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_molluscs', 'allergen', 'es', 'name', 'Moluscos');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_molluscs', 'allergen', 'en', 'name', 'Molluscs');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_molluscs', 'allergen', 'fr', 'name', 'Mollusques');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_molluscs', 'allergen', 'de', 'name', 'Weichtiere');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_molluscs', 'allergen', 'it', 'name', 'Molluschi');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_molluscs', 'allergen', 'pt', 'name', 'Moluscos');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_molluscs', 'allergen', 'nl', 'name', 'Weekdieren');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_molluscs', 'allergen', 'sv', 'name', 'Blötdjur');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_molluscs', 'allergen', 'pl', 'name', 'Mięczaki');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_molluscs', 'allergen', 'ru', 'name', 'Моллюски');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_molluscs', 'allergen', 'zh', 'name', '软体动物');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_molluscs', 'allergen', 'ja', 'name', '軟体動物');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_molluscs', 'allergen', 'ar', 'name', 'رخويات');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_molluscs', 'allergen', 'ko', 'name', '연체동물');
REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES ('allergen_molluscs', 'allergen', 'tr', 'name', 'Yumuşakçalar');

COMMIT;
