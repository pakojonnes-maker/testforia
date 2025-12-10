-- Example Marketing Campaign for Yucas (rest_yucas_01)

INSERT INTO marketing_campaigns (id, restaurant_id, name, type, is_active, content, settings, start_date, end_date)
VALUES (
    'camp_yucas_welcome_01',
    'rest_yucas_01',
    'Bienvenida Yucas 2025',
    'welcome_modal',
    TRUE,
    '{
        "title": "¡Bienvenido a Yucas!",
        "description": "Disfruta de la auténtica experiencia latina. Suscríbete y recibe un postre gratis en tu primera visita.",
        "image_url": "https://pub-813e0e75525741699742d0e74e442805.r2.dev/restaurants/rest_yucas_01/dishes/dish_yucas_tres_leches/primary/tres_leches.mp4"
    }',
    '{
        "show_capture_form": true,
        "show_email": true,
        "show_phone": true,
        "auto_open": true,
        "delay": 2000
    }',
    CURRENT_TIMESTAMP,
    NULL
);
