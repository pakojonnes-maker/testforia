-- Migration to remove Catalan language and all associated data
BEGIN TRANSACTION;

-- 1. Update users who have 'ca' as preferred language to default 'es'
UPDATE users SET preferred_language = 'es' WHERE preferred_language = 'ca';

-- 2. Delete dependent data from tables with Foreign Keys or logical references
-- Deleting from child tables first to avoid Foreign Key constraint violations
DELETE FROM translations WHERE language_code = 'ca';
DELETE FROM restaurant_translations WHERE language_code = 'ca';
DELETE FROM dietary_labels WHERE language_code = 'ca';
DELETE FROM ingredient_translations WHERE language_code = 'ca';
DELETE FROM dish_messages WHERE language_code = 'ca';
DELETE FROM landing_seo WHERE language_code = 'ca';
DELETE FROM restaurant_languages WHERE language_code = 'ca';
DELETE FROM localization_strings WHERE language_code = 'ca';

-- 3. Finally, delete the language itself
DELETE FROM languages WHERE code = 'ca';

COMMIT;
