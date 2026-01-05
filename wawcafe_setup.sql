-- Waw Cafe Setup Script (COMPLETE)
-- Generated based on CSV input + Default Menu Structure

BEGIN TRANSACTION;

-- 1. Create Theme and Template (if not exist)
INSERT OR IGNORE INTO themes (id, name, is_premium) VALUES 
('theme_dark_modern', 'Dark Modern', 0);

INSERT OR IGNORE INTO reel_templates (id, name, is_active) VALUES 
('tmpl_standard', 'Standard Layout', 1);

-- 2. Create Restaurant
INSERT OR REPLACE INTO restaurants (
    id, account_id, name, slug, email, phone, 
    theme_id, reel_template_id, language_default, 
    logo_url, cover_image_url, address, city, is_active
) VALUES (
    'rest_wawcafe_01', 
    'acc_default', -- Placeholder account
    'Waw Cafe', 
    'wawcafe', 
    'contact@wawcafe.com', 
    '+34600000000', 
    'theme_dark_modern', 
    'tmpl_standard', 
    'es', 
    'upload_assets/logo_waw.png', 
    'upload_assets/cover_waw.jpg', 
    'Calle Falsa 123', 
    'Madrid', 
    1
);

-- 3. Restaurant Details
INSERT OR REPLACE INTO restaurant_details (
    id, restaurant_id, 
    opening_hours, 
    whatsapp_number, instagram_url, google_review_url,
    has_wifi, has_delivery, accepts_reservations
) VALUES (
    'det_wawcafe_01', 'rest_wawcafe_01',
    '{"monday": {"open": "08:00", "close": "20:00"}}',
    '+34600000000', 'https://instagram.com/wawcafe', NULL,
    1, 0, 0
);

-- 4. Create Admin User
-- Note: Password hash is a placeholder. User should reset it.
INSERT OR IGNORE INTO users (
    id, email, display_name, auth_provider, preferred_language, password_hash
) VALUES (
    'user_wawcafe_admin', 
    'hola@wawcafe.com', 
    'Admin Waw Cafe', 
    'email', 
    'es', 
    '05c802e250573a7d55ebc2ab60a33476:5ea39fa2c413addc4939be5bc599d981505f073cb456fe6a0dbf19b8c31247bc'
);

-- 5. Link User to Restaurant
INSERT OR REPLACE INTO restaurant_staff (
    restaurant_id, user_id, role, is_active
) VALUES (
    'rest_wawcafe_01', 'user_wawcafe_admin', 'owner', 1
);

-- 6. Supported Languages
INSERT OR REPLACE INTO restaurant_languages (restaurant_id, language_code, is_enabled) VALUES
('rest_wawcafe_01', 'es', 1),
('rest_wawcafe_01', 'en', 1);

-- 7. Initial QR Code
INSERT OR IGNORE INTO qr_codes (id, restaurant_id, type) VALUES
('qr_wawcafe_default', 'rest_wawcafe_01', 'menu');

-- 8. Landing SEO
INSERT OR REPLACE INTO landing_seo (restaurant_id, language_code, seo_title) VALUES
('rest_wawcafe_01', 'es', 'Waw Cafe - Madrid'),
('rest_wawcafe_01', 'en', 'Waw Cafe - Madrid');

-- ==========================================
-- MENU & DISHES SETUP (DEFAULT STRUCTURE)
-- ==========================================

-- 9. Create Default Menu
INSERT OR REPLACE INTO menus (id, restaurant_id, name, is_active, is_default) VALUES
('menu_wawcafe_main', 'rest_wawcafe_01', 'Menú Principal', 1, 1);

-- 10. Create Sections (Categories)
INSERT OR REPLACE INTO sections (id, menu_id, restaurant_id, order_index) VALUES
('sect_wawcafe_coffees', 'menu_wawcafe_main', 'rest_wawcafe_01', 1),
('sect_wawcafe_pastries', 'menu_wawcafe_main', 'rest_wawcafe_01', 2);

-- 11. Translate Sections
INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
('sect_wawcafe_coffees', 'section', 'es', 'name', 'Cafés de Especialidad'),
('sect_wawcafe_coffees', 'section', 'en', 'name', 'Specialty Coffees'),
('sect_wawcafe_pastries', 'section', 'es', 'name', 'Bollería Artesanal'),
('sect_wawcafe_pastries', 'section', 'en', 'name', 'Artisan Pastries');

-- 12. Create Example Dishes
INSERT OR REPLACE INTO dishes (id, restaurant_id, status, price, is_vegetarian, is_gluten_free) VALUES
('dish_waw_latte', 'rest_wawcafe_01', 'active', 3.50, 1, 1),
('dish_waw_croissant', 'rest_wawcafe_01', 'active', 2.50, 1, 0),
('dish_waw_matcha', 'rest_wawcafe_01', 'active', 4.50, 1, 1);

-- 13. Link Dishes to Sections
INSERT OR REPLACE INTO section_dishes (section_id, dish_id, order_index) VALUES
('sect_wawcafe_coffees', 'dish_waw_latte', 1),
('sect_wawcafe_coffees', 'dish_waw_matcha', 2),
('sect_wawcafe_pastries', 'dish_waw_croissant', 1);

-- 14. Translate Dishes
INSERT OR REPLACE INTO translations (entity_id, entity_type, language_code, field, value) VALUES
-- Latte
('dish_waw_latte', 'dish', 'es', 'name', 'Café Latte'),
('dish_waw_latte', 'dish', 'es', 'description', 'Espresso doble con leche texturizada.'),
('dish_waw_latte', 'dish', 'en', 'name', 'Caffe Latte'),
('dish_waw_latte', 'dish', 'en', 'description', 'Double espresso with textured milk.'),
-- Matcha
('dish_waw_matcha', 'dish', 'es', 'name', 'Matcha Latte'),
('dish_waw_matcha', 'dish', 'es', 'description', 'Té matcha ceremonial con leche de avena.'),
('dish_waw_matcha', 'dish', 'en', 'name', 'Matcha Latte'),
('dish_waw_matcha', 'dish', 'en', 'description', 'Ceremonial matcha tea with oat milk.'),
-- Croissant
('dish_waw_croissant', 'dish', 'es', 'name', 'Croissant de Mantequilla'),
('dish_waw_croissant', 'dish', 'es', 'description', 'Crujiente y dorado, hecho en casa cada mañana.'),
('dish_waw_croissant', 'dish', 'en', 'name', 'Butter Croissant'),
('dish_waw_croissant', 'dish', 'en', 'description', 'Crispy and golden, homemade every morning.');

-- 15. Link Allergens (Example)
-- Assuming 'allergen_milk', 'allergen_gluten' exist in DB from initial migration
INSERT OR IGNORE INTO dish_allergens (dish_id, allergen_id) VALUES
('dish_waw_latte', 'allergen_milk'),
('dish_waw_croissant', 'allergen_gluten'),
('dish_waw_croissant', 'allergen_milk'),
('dish_waw_croissant', 'allergen_eggs');

-- 16. Placeholder Media (Optional but recommended so it doesn't crash UI)
INSERT OR REPLACE INTO dish_media (
    id, dish_id, media_type, content_type, r2_key, is_primary, width, height
) VALUES
('media_waw_latte', 'dish_waw_latte', 'image', 'image/jpeg', 'upload_assets/latte_placeholder.jpg', 1, 800, 600),
('media_waw_croissant', 'dish_waw_croissant', 'image', 'image/jpeg', 'upload_assets/croissant_placeholder.jpg', 1, 800, 600),
('media_waw_matcha', 'dish_waw_matcha', 'image', 'image/jpeg', 'upload_assets/matcha_placeholder.jpg', 1, 800, 600);

COMMIT;
