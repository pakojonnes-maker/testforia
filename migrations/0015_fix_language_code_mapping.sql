-- FIX: Map Standard ISO Codes to Legacy Project Codes
-- The project uses 'cn' for Chinese and 'kr' for Korean.
-- We must duplicate translations from 'zh' -> 'cn' and 'ko' -> 'kr'.

BEGIN TRANSACTION;

-- 1. Chinese (zh -> cn)
REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
SELECT entity_id, entity_type, 'cn', field, value
FROM translations
WHERE language_code = 'zh' AND entity_type = 'allergen';

-- 2. Korean (ko -> kr)
REPLACE INTO translations (entity_id, entity_type, language_code, field, value)
SELECT entity_id, entity_type, 'kr', field, value
FROM translations
WHERE language_code = 'ko' AND entity_type = 'allergen';

COMMIT;
