-- Migration: Add ingredients and allergens translations for Reels (All Languages)
-- Context: 'reels'

-- Primero borramos si ya existen para evitar duplicados en reruns parciales (opcional pero seguro)
DELETE FROM localization_strings WHERE context = 'reels' AND key_name IN ('ingredients', 'allergens');

INSERT INTO localization_strings (context, key_name, language_code, label) VALUES
-- Spanish (es)
('reels', 'ingredients', 'es', 'Ingredientes'),
('reels', 'allergens', 'es', 'Alérgenos'),

-- English (en)
('reels', 'ingredients', 'en', 'Ingredients'),
('reels', 'allergens', 'en', 'Allergens'),

-- French (fr)
('reels', 'ingredients', 'fr', 'Ingrédients'),
('reels', 'allergens', 'fr', 'Allergènes'),

-- German (de)
('reels', 'ingredients', 'de', 'Zutaten'),
('reels', 'allergens', 'de', 'Allergene'),

-- Italian (it)
('reels', 'ingredients', 'it', 'Ingredienti'),
('reels', 'allergens', 'it', 'Allergeni'),

-- Portuguese (pt)
('reels', 'ingredients', 'pt', 'Ingredientes'),
('reels', 'allergens', 'pt', 'Alérgenos'),

-- Korean (kr)
('reels', 'ingredients', 'kr', '재료'),
('reels', 'allergens', 'kr', '알레르기 정보'),

-- Japanese (ja)
('reels', 'ingredients', 'ja', '原材料'),
('reels', 'allergens', 'ja', 'アレルギー情報'),

-- Bengali (bn)
('reels', 'ingredients', 'bn', 'উপকরণ'),
('reels', 'allergens', 'bn', 'অ্যালার্জেন'),

-- Arabic (ar)
('reels', 'ingredients', 'ar', 'المكونات'),
('reels', 'allergens', 'ar', 'مسببات الحساسية'),

-- Russian (ru)
('reels', 'ingredients', 'ru', 'Ингредиенты'),
('reels', 'allergens', 'ru', 'Аллергены'),

-- Ukrainian (ua)
('reels', 'ingredients', 'ua', 'Інгредієнти'),
('reels', 'allergens', 'ua', 'Алергени'),

-- Chinese (cn)
('reels', 'ingredients', 'cn', '配料'),
('reels', 'allergens', 'cn', '过敏原'),

-- Hindi (in)
('reels', 'ingredients', 'in', 'सामग्री'),
('reels', 'allergens', 'in', 'एलर्जी जानकारी'),

-- Dutch (nl)
('reels', 'ingredients', 'nl', 'Ingrediënten'),
('reels', 'allergens', 'nl', 'Allergenen'),

-- Swedish (sv)
('reels', 'ingredients', 'sv', 'Ingredienser'),
('reels', 'allergens', 'sv', 'Allergener'),

-- Polish (pl)
('reels', 'ingredients', 'pl', 'Składniki'),
('reels', 'allergens', 'pl', 'Alergeny'),

-- Turkish (tr)
('reels', 'ingredients', 'tr', 'İçindekiler'),
('reels', 'allergens', 'tr', 'Alerjenler'),

-- Chinese (zh - Duplicate of cn based on request, or alternate script)
('reels', 'ingredients', 'zh', '配料'),
('reels', 'allergens', 'zh', '过敏原'),

-- Korean (ko - Standard code)
('reels', 'ingredients', 'ko', '재료'),
('reels', 'allergens', 'ko', '알레르기 정보');
