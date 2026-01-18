// workerReels.js - VERSIÓN OPTIMIZADA CON PREFIJO reel_ + MARKETING

export async function handleReelsRequests(request, env) {
    const url = new URL(request.url);

    // ✅ Endpoint: GET /restaurants/:slug/reels
    if (request.method === "GET" && url.pathname.match(/^\/restaurants\/[^/]+\/reels$/)) {
        const slug = url.pathname.split('/')[2];
        const params = new URLSearchParams(url.search);
        const menuId = params.get('menu_id');
        const langCode = params.get('lang') || 'es';
        const visitorId = request.headers.get('x-visitor-id') || params.get('visitor_id'); // Capture visitor_id if sent

        try {
            console.log(`[Reels] 🎬 Processing: ${slug}, language: ${langCode}`);

            // ✅ 1. RESTAURANT + THEME
            const restaurant = await env.DB.prepare(`
        SELECT 
          r.id, r.name, r.slug, r.logo_url, r.cover_image_url, r.website,
          r.reel_template_id, r.theme_id,
          rd.instagram_url, rd.google_review_url,
          t.primary_color, t.secondary_color, t.accent_color,
          t.text_color, t.background_color, t.font_family, t.font_accent
        FROM restaurants r
        LEFT JOIN restaurant_details rd ON r.id = rd.restaurant_id
        LEFT JOIN themes t ON r.theme_id = t.id
        WHERE r.slug = ? AND r.is_active = TRUE
      `).bind(slug).first();

            if (!restaurant) {
                console.log(`[Reels] ❌ Restaurant not found: ${slug}`);
                return createResponse({ success: false, message: "Restaurant not found" }, 404);
            }

            // ✅ 2. REEL CONFIG (con colores custom con prefijo reel_)
            const reelConfig = await env.DB.prepare(`
        SELECT 
          rrc.template_id, rrc.config_overrides,
          rt.name as template_name, rt.description as template_description,
          rt.is_premium as template_is_premium, rt.is_active
        FROM restaurant_reel_configs rrc
        JOIN reel_templates rt ON rrc.template_id = rt.id
        WHERE rrc.restaurant_id = ? AND rt.is_active = TRUE
      `).bind(restaurant.id).first();

            // ✅ 3. PARSEAR config_overrides Y APLICAR JERARQUÍA
            let configOverrides = {};

            if (reelConfig?.config_overrides) {
                try {
                    configOverrides = JSON.parse(reelConfig.config_overrides);
                    console.log('[Reels] ✅ Loaded config_overrides:', Object.keys(configOverrides));
                } catch (e) {
                    console.warn('[Reels] Error parsing config_overrides:', e);
                }
            }

            // ✅ 4. CONSTRUIR BRANDING CON JERARQUÍA: reel colors > theme colors > defaults
            const branding = {
                primary_color: configOverrides.reel_primary_color || restaurant.primary_color || '#FF6B6B',
                secondary_color: configOverrides.reel_secondary_color || restaurant.secondary_color || '#4ECDC4',
                accent_color: configOverrides.reel_accent_color || restaurant.accent_color || '#FF8C42',
                text_color: configOverrides.reel_text_color || restaurant.text_color || '#FFFFFF',
                background_color: configOverrides.reel_background_color || restaurant.background_color || '#000000',
                font_family: configOverrides.font_family || restaurant.font_family || 'Inter, sans-serif',
                font_accent: configOverrides.font_accent || restaurant.font_accent || 'serif'
            };

            console.log('[Reels] 🎨 Final branding:', branding);

            // ✅ 5. TEMPLATE FALLBACK (optimizado)
            let templateInfo = null;
            if (!reelConfig) {
                if (restaurant.reel_template_id) {
                    templateInfo = await env.DB.prepare(`
            SELECT id, name, description, is_premium
            FROM reel_templates
            WHERE id = ? AND is_active = TRUE
          `).bind(restaurant.reel_template_id).first();
                }

                if (!templateInfo) {
                    templateInfo = await env.DB.prepare(`
            SELECT id, name, description, is_premium
            FROM reel_templates
            WHERE is_active = TRUE
            ORDER BY id = 'tpl_classic' DESC
            LIMIT 1
          `).first();
                }
            }

            // ✅ 6. MENU SELECTION (optimizado - una sola query)
            const menu = await getActiveMenu(env, restaurant.id, menuId);

            if (!menu) {
                console.log(`[Reels] ❌ No menus found for: ${slug}`);
                return createResponse({ success: false, message: "No active menus found" }, 404);
            }

            // ✅ 7. SECTIONS CON TRADUCCIONES
            const sections = await getSectionsWithTranslations(env, menu.id, langCode);

            if (sections.length === 0) {
                return createResponse({ success: false, message: "Menu has no sections" }, 404);
            }

            // ✅ 8. DISHES CON TRADUCCIONES
            const sectionIds = sections.map(s => s.id);
            const dishes = await getDishesWithTranslations(env, sectionIds, langCode);

            if (dishes.length === 0) {
                return createResponse({ success: false, message: "Menu has no active dishes" }, 404);
            }

            // ✅ 9. MEDIA Y ALLERGENS
            const dishIds = dishes.map(d => d.id);
            const [mediaByDish, allergensByDish] = await Promise.all([
                getDishMedia(env, dishIds, url.origin),
                getDishAllergens(env, dishIds, langCode)
            ]);

            // ✅ 10. CONSTRUIR SECCIONES CON PLATOS (refactorizado)
            const sectionsWithDishes = sections.map(section => ({
                id: section.id,
                name: section.name,
                description: section.description,
                order_index: section.order_index,
                icon_url: section.icon_url,
                bg_color: section.bg_color,
                dishes: dishes
                    .filter(d => d.section_id === section.id)
                    .map(dish => buildDishResponse(dish, mediaByDish[dish.id], allergensByDish[dish.id]))
            }));

            // ✅ 11. LANGUAGES DISPONIBLES
            const languages = await env.DB.prepare(`
        SELECT l.code, l.name, l.native_name, l.flag_emoji 
        FROM restaurant_languages rl
        JOIN languages l ON rl.language_code = l.code
        WHERE rl.restaurant_id = ? AND rl.is_enabled = TRUE
        ORDER BY rl.priority
      `).bind(restaurant.id).all();

            // ✅ 12. TEMPLATE CONFIG
            const finalTemplateId = reelConfig?.template_id || templateInfo?.id || 'tpl_classic';
            const templateConfig = await buildTemplateConfig(env, finalTemplateId, configOverrides);

            // ✅ 12.5 [ENHANCED] MARKETING CAMPAIGNS - Load all active campaign types
            const allCampaigns = await env.DB.prepare(`
                SELECT * FROM marketing_campaigns 
                WHERE restaurant_id = ? AND is_active = TRUE
                ORDER BY type, priority DESC, created_at DESC
            `).bind(restaurant.id).all();

            // Organize campaigns by type
            let marketingCampaign = undefined;  // welcome_modal (primary)
            let scratchWinCampaign = undefined; // scratch_win with display settings
            let eventCampaigns = [];            // events with show_in_menu

            for (const campaign of (allCampaigns.results || [])) {
                try {
                    const parsedCampaign = {
                        id: campaign.id,
                        name: campaign.name,
                        type: campaign.type,
                        content: JSON.parse(campaign.content || '{}'),
                        settings: JSON.parse(campaign.settings || '{}'),
                        start_date: campaign.start_date,
                        end_date: campaign.end_date
                    };

                    if (campaign.type === 'welcome_modal' && !marketingCampaign) {
                        marketingCampaign = parsedCampaign;
                    } else if (campaign.type === 'scratch_win' && !scratchWinCampaign) {
                        // Only include if display_mode is not 'hidden'
                        if (parsedCampaign.settings?.display_mode && parsedCampaign.settings.display_mode !== 'hidden') {
                            scratchWinCampaign = parsedCampaign;
                        }
                    } else if (campaign.type === 'event') {
                        // Only include if show_in_menu is true
                        if (parsedCampaign.settings?.show_in_menu === true) {
                            eventCampaigns.push(parsedCampaign);
                        }
                    }
                } catch (e) {
                    console.error("Error parsing campaign JSON", e);
                }
            }

            // ✅ 12.6 [NEW] RESERVATION STATUS
            const reservationSettings = await env.DB.prepare(`
                SELECT is_enabled FROM reservation_settings WHERE restaurant_id = ?
            `).bind(restaurant.id).first();
            const reservationsEnabled = reservationSettings?.is_enabled === 1;

            // ✅ 12.7 [NEW] DELIVERY SETTINGS
            const deliverySettings = await env.DB.prepare(`
                SELECT is_enabled, show_whatsapp, show_phone, custom_whatsapp, custom_phone,
                       payment_methods, shipping_cost, free_shipping_threshold, minimum_order,
                       delivery_hours, closed_dates
                FROM delivery_settings WHERE restaurant_id = ?
            `).bind(restaurant.id).first();
            const deliveryEnabled = deliverySettings?.is_enabled === 1;

            // ✅ 12.8 [NEW] GLOBAL TRANSLATIONS
            const globalTranslationsQuery = await env.DB.prepare(`
                SELECT key_name, label
                FROM localization_strings
                WHERE context = 'reels' AND language_code = ?
            `).bind(langCode).all();

            const globalTranslations = {};
            (globalTranslationsQuery.results || []).forEach(t => {
                globalTranslations[t.key_name] = t.label;
            });

            // ✅ 12.9 [NEW] GOOGLE RATING STATUS
            let previousRating = null;
            if (visitorId) {
                const ratingEntry = await env.DB.prepare(`
                    SELECT rating, created_at FROM restaurant_ratings 
                    WHERE restaurant_id = ? AND visitor_id = ?
                    ORDER BY created_at DESC LIMIT 1
                 `).bind(restaurant.id, visitorId).first();
                if (ratingEntry) previousRating = ratingEntry.rating;
            }

            // ✅ 13. RESPUESTA FINAL
            const response = {
                success: true,
                restaurant: {
                    id: restaurant.id,
                    name: restaurant.name,
                    slug: restaurant.slug,
                    logo_url: restaurant.logo_url,
                    cover_image_url: restaurant.cover_image_url,
                    website: restaurant.website,
                    instagram_url: restaurant.instagram_url,
                    google_review_url: restaurant.google_review_url,
                    branding
                },
                userStatus: {
                    hasRated: !!previousRating,
                    previousRating: previousRating
                },
                menu: {
                    id: menu.id,
                    name: menu.name,
                    description: menu.description
                },
                sections: sectionsWithDishes,
                languages: languages.results || [],
                template: {
                    id: finalTemplateId,
                    name: reelConfig?.template_name || templateInfo?.name || 'Classic',
                    description: reelConfig?.template_description || templateInfo?.description || 'Default template',
                    is_premium: reelConfig?.template_is_premium || templateInfo?.is_premium || false
                },
                config: templateConfig,
                overrides: configOverrides, // ✅ All reel color overrides (reel_* prefixed)
                theme: {
                    fontFamily: restaurant.font_family || 'Inter, sans-serif',
                    fontAccent: restaurant.font_accent || 'serif',
                    accentColor: restaurant.accent_color || '#FF8C42',
                    textColor: restaurant.text_color || '#FFFFFF',
                    backgroundColor: restaurant.background_color || '#000000',
                },
                marketing: marketingCampaign, // Welcome modal campaign
                scratchWin: scratchWinCampaign, // Scratch & Win with visibility settings
                events: eventCampaigns, // Events with show_in_menu
                reservationsEnabled: reservationsEnabled, // [NEW] Reservations
                deliveryEnabled: deliveryEnabled, // [NEW] Delivery enabled flag
                deliverySettings: deliverySettings ? {
                    is_enabled: deliverySettings.is_enabled === 1,
                    show_whatsapp: deliverySettings.show_whatsapp === 1,
                    show_phone: deliverySettings.show_phone === 1,
                    whatsapp_number: deliverySettings.custom_whatsapp || restaurant.phone,
                    phone_number: deliverySettings.custom_phone || restaurant.phone,
                    payment_methods: deliverySettings.payment_methods ? JSON.parse(deliverySettings.payment_methods) : { cash: true, card: false },
                    shipping_cost: deliverySettings.shipping_cost || 0,
                    free_shipping_threshold: deliverySettings.free_shipping_threshold || 0,
                    minimum_order: deliverySettings.minimum_order || 0,
                    delivery_hours: deliverySettings.delivery_hours ? JSON.parse(deliverySettings.delivery_hours) : null,
                    closed_dates: deliverySettings.closed_dates ? JSON.parse(deliverySettings.closed_dates) : []
                } : null, // [NEW] Full delivery config
                translations: globalTranslations // [NEW] Global Translations
            };

            console.log(`[Reels] ✅ Response: ${sectionsWithDishes.length} sections, ${dishes.length} dishes`);

            return createResponse(response);

        } catch (error) {
            console.error("[Reels] ❌ Error:", error);
            return createResponse({
                success: false,
                message: "Error processing request",
                error: error.message
            }, 500);
        }
    }


    // NUEVAS RUTAS: Marketing y Loyalty
    if (url.pathname.startsWith('/marketing/active')) {
        return handleMarketingActive(request, env);
    }
    if (url.pathname.startsWith('/marketing/interact')) {
        return handleMarketingInteract(request, env);
    }
    if (url.pathname.startsWith('/loyalty/scan')) {
        return handleLoyaltyScan(request, env);
    }
    if (url.pathname.startsWith('/loyalty/play')) {
        return handleLoyaltyPlay(request, env);
    }
    if (url.pathname.startsWith('/loyalty/claim')) {
        return handleLoyaltyClaim(request, env);
    }

    // ✅ Endpoint: POST /restaurants/:slug/rating
    if (request.method === "POST" && url.pathname.match(/^\/restaurants\/[^/]+\/rating$/)) {
        try {
            const slug = url.pathname.split('/')[2];
            const body = await request.json();
            const { rating, comment, visitor_id, session_id } = body;

            // Validation
            if (!rating || rating < 1 || rating > 5) {
                return createResponse({ success: false, message: "Invalid rating" }, 400);
            }
            if (!visitor_id) {
                return createResponse({ success: false, message: "Visitor ID required" }, 400);
            }

            // Get Restaurant ID
            const restaurant = await env.DB.prepare("SELECT id FROM restaurants WHERE slug = ?").bind(slug).first();
            if (!restaurant) {
                return createResponse({ success: false, message: "Restaurant not found" }, 404);
            }

            // Insert Rating
            const id = crypto.randomUUID();
            // Upsert strategy if we want to allow updating:
            // But strict requirement suggests distinct events. Let's allowing inserting multiple times? 
            // "Permite que pueda volver a calificar" -> likely update or new entry.
            // Let's do new entry to track history, or update. 
            // Implementation Plan said: "Upsert (Update if exists) or Insert new rating"
            // Let's use INSERT OR REPLACE logic or just multiple inserts logic if we want history. 
            // For simplicity and to match "latest matters":

            // We will check if exists first to decide ID, or just insert new one. 
            // Let's insert a NEW record effectively acting as "latest rating".

            await env.DB.prepare(`
                INSERT INTO restaurant_ratings (id, restaurant_id, rating, comment, visitor_id, session_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `).bind(id, restaurant.id, rating, comment || null, visitor_id, session_id || null).run();

            return createResponse({ success: true, message: "Rating saved" });

        } catch (error) {
            console.error("[Reels] ❌ Error saving rating:", error);
            return createResponse({ success: false, message: error.message }, 500);
        }
    }

    return null;
}

// ============================================
// HELPER FUNCTIONS (optimizaciones)
// ============================================

async function getActiveMenu(env, restaurantId, menuId) {
    if (menuId) {
        return await env.DB.prepare(`
      SELECT id, name, description
      FROM menus
      WHERE id = ? AND restaurant_id = ? AND is_active = TRUE
    `).bind(menuId, restaurantId).first();
    }

    // Buscar menú por defecto o el más reciente
    return await env.DB.prepare(`
    SELECT id, name, description
    FROM menus
    WHERE restaurant_id = ? AND is_active = TRUE
    ORDER BY is_default DESC, created_at DESC
    LIMIT 1
  `).bind(restaurantId).first();
}

async function getSectionsWithTranslations(env, menuId, langCode) {
    const sectionsQuery = await env.DB.prepare(`
    SELECT 
      s.id, s.order_index, s.icon_url, s.bg_color,
      GROUP_CONCAT(
        CASE WHEN t.language_code = ? THEN 
          t.field || ':' || t.value 
        END, '|'
      ) as translations
    FROM sections s
    LEFT JOIN translations t ON t.entity_id = s.id 
      AND t.entity_type = 'section'
      AND t.language_code = ?
    WHERE s.menu_id = ?
      AND s.is_visible = TRUE
    GROUP BY s.id, s.order_index, s.icon_url, s.bg_color
    ORDER BY s.order_index
  `).bind(langCode, langCode, menuId).all();

    const sections = sectionsQuery.results || [];

    sections.forEach(section => {
        const translations = parseTranslations(section.translations);
        section.name = translations.name || `Section ${section.id}`;
        section.description = translations.description || '';
        delete section.translations;
    });

    return sections;
}

async function getDishesWithTranslations(env, sectionIds, langCode) {
    const dishesQuery = await env.DB.prepare(`
    SELECT 
      d.id, d.price, d.discount_price, d.discount_active,
      d.is_vegetarian, d.is_vegan, d.is_gluten_free, 
      d.is_new, d.is_featured, d.calories, d.preparation_time,
      d.half_price, d.has_half_portion,
      sd.section_id, sd.order_index,
      GROUP_CONCAT(
        CASE WHEN t.language_code = ? THEN 
          t.field || ':' || t.value 
        END, '|'
      ) as translations
    FROM section_dishes sd
    JOIN dishes d ON sd.dish_id = d.id
    LEFT JOIN translations t ON t.entity_id = d.id 
      AND t.entity_type = 'dish'
      AND t.language_code = ?
    WHERE sd.section_id IN (${sectionIds.map(() => '?').join(',')})
      AND d.status = 'active'
    GROUP BY d.id, sd.section_id, sd.order_index
    ORDER BY sd.section_id, sd.order_index
  `).bind(langCode, langCode, ...sectionIds).all();

    const dishes = dishesQuery.results || [];

    dishes.forEach(dish => {
        const translations = parseTranslations(dish.translations);
        dish.name = translations.name || `Dish ${dish.id}`;
        dish.description = translations.description || '';
        dish.ingredients = translations.ingredients || '';
        delete dish.translations;
    });

    return dishes;
}

async function getDishMedia(env, dishIds, origin) {
    const mediaQuery = await env.DB.prepare(`
    SELECT dish_id, media_type, r2_key, role, is_primary, 
           display_name, duration, order_index, width, height
    FROM dish_media
    WHERE dish_id IN (${dishIds.map(() => '?').join(',')})
    ORDER BY dish_id, role DESC, order_index ASC
  `).bind(...dishIds).all();

    const mediaByDish = {};
    (mediaQuery.results || []).forEach(m => {
        if (!mediaByDish[m.dish_id]) mediaByDish[m.dish_id] = [];
        m.url = `${origin}/media/${m.r2_key}`; // Pre-construir URL
        mediaByDish[m.dish_id].push(m);
    });

    return mediaByDish;
}

async function getDishAllergens(env, dishIds, langCode) {
    const allergensQuery = await env.DB.prepare(`
    SELECT 
      da.dish_id, a.id as allergen_id, 
      GROUP_CONCAT(
        CASE WHEN t.language_code = ? THEN t.value END
      ) as allergen_name
    FROM dish_allergens da
    JOIN allergens a ON da.allergen_id = a.id
    LEFT JOIN translations t ON t.entity_id = a.id 
      AND t.entity_type = 'allergen' 
      AND t.language_code = ?
    WHERE da.dish_id IN (${dishIds.map(() => '?').join(',')})
    GROUP BY da.dish_id, a.id
  `).bind(langCode, langCode, ...dishIds).all();

    const origin = 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

    // Mapeo de casos especiales para nombres de archivos
    const filenameOverrides = {
        'allergen_crustaceans': 'allergen_crustacean.svg',
        'allergen_lupin': 'allergen_lupins.svg',
        'allergen_sulphites': 'allergen_sulfites.svg',
        'allergen_molluscs': 'allergen_shellfish.svg',
        'allergen_soy': 'allergen_soya.svg'
    };

    const allergensByDish = {};
    (allergensQuery.results || []).forEach(item => {
        if (!allergensByDish[item.dish_id]) allergensByDish[item.dish_id] = [];

        let filename;
        if (filenameOverrides[item.allergen_id]) {
            filename = filenameOverrides[item.allergen_id];
        } else {
            // Por defecto usar el ID completo (ej. 'allergen_celery.svg')
            filename = `${item.allergen_id}.svg`;
        }

        // Usar 'System' con mayúscula
        const iconUrl = `${origin}/media/System/allergens/${filename}`;

        allergensByDish[item.dish_id].push({
            id: item.allergen_id,
            name: item.allergen_name || item.allergen_id,
            icon_url: iconUrl
        });
    });

    return allergensByDish;
}

function buildDishResponse(dish, mediaList = [], allergensList = []) {
    const primaryVideo = mediaList.find(m =>
        m.media_type === 'video' && (m.role === 'PRIMARY_VIDEO' || m.is_primary)
    );

    const primaryImage = mediaList.find(m =>
        m.media_type === 'image' && (m.role === 'PRIMARY_IMAGE' || m.is_primary)
    );

    const media = [];

    if (primaryVideo) {
        media.push({
            type: 'video',
            url: primaryVideo.url,
            thumbnail_url: primaryImage?.url || null,
            duration: primaryVideo.duration,
            display_name: primaryVideo.display_name || 'Video',
            width: primaryVideo.width,
            height: primaryVideo.height
        });
    } else if (primaryImage) {
        media.push({
            type: 'image',
            url: primaryImage.url,
            display_name: primaryImage.display_name || 'Image',
            width: primaryImage.width,
            height: primaryImage.height
        });
    }

    // Gallery images
    mediaList
        .filter(m => m.role === 'GALLERY_IMAGE' || (!m.is_primary && m.media_type === 'image'))
        .forEach(img => {
            media.push({
                type: 'image',
                url: img.url,
                display_name: img.display_name || 'Gallery image',
                width: img.width,
                height: img.height
            });
        });

    return {
        id: dish.id,
        name: dish.name,
        description: dish.description,
        price: dish.price,
        discount_price: dish.discount_active ? dish.discount_price : null,
        discount_active: !!dish.discount_active,
        calories: dish.calories,
        preparation_time: dish.preparation_time,
        is_vegetarian: !!dish.is_vegetarian,
        is_vegan: !!dish.is_vegan,
        is_gluten_free: !!dish.is_gluten_free,
        is_new: !!dish.is_new,
        is_featured: !!dish.is_featured,
        has_half_portion: !!dish.has_half_portion,
        half_price: dish.half_price || null,
        position: dish.order_index,
        media,
        allergens: allergensList,
        ingredients: dish.ingredients || null
    };
}

async function buildTemplateConfig(env, templateId, configOverrides) {
    const defaultConfigQuery = await env.DB.prepare(`
    SELECT config_key, config_value, value_type
    FROM reel_template_configs
    WHERE template_id = ?
  `).bind(templateId).all();

    const templateConfig = {};
    (defaultConfigQuery.results || []).forEach(cfg => {
        let value = cfg.config_value;
        if (cfg.value_type === 'boolean') {
            value = value === 'true' || value === '1' || value === true;
        } else if (cfg.value_type === 'number') {
            value = parseFloat(value) || 0;
        } else if (cfg.value_type === 'json' && value) {
            try {
                value = JSON.parse(value);
            } catch (e) {
                console.warn('Error parsing template config JSON:', e);
            }
        }
        templateConfig[cfg.config_key] = value;
    });

    // ✅ Aplicar overrides NO relacionados con colores reel_
    const nonColorOverrides = { ...configOverrides };
    delete nonColorOverrides.reel_primary_color;
    delete nonColorOverrides.reel_secondary_color;
    delete nonColorOverrides.reel_text_color;
    delete nonColorOverrides.reel_background_color;

    Object.assign(templateConfig, nonColorOverrides);

    return templateConfig;
}

function parseTranslations(translationsString) {
    const translations = {};
    if (translationsString) {
        translationsString.split('|').forEach(pair => {
            if (pair && pair.includes(':')) {
                const [field, value] = pair.split(':', 2);
                if (field && value) {
                    translations[field] = value;
                }
            }
        });
    }
    return translations;
}

export function createResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Cache-Control": status === 200 ? "public, max-age=60" : "no-cache"
        },
    });
}


export async function handleLoyaltyRequests(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    console.log(`[Loyalty] Request: ${request.method} ${pathname}`);

    if (pathname === '/api/loyalty/scan') return handleLoyaltyScan(request, env);
    if (pathname === '/api/loyalty/play') return handleLoyaltyPlay(request, env);
    if (pathname === '/api/loyalty/claim') return handleLoyaltyClaim(request, env);

    console.log(`[Loyalty] No match for ${pathname}`);
    return null;
}

// ============================================
// MARKETING & LOYALTY HANDLERS
// ============================================

async function handleMarketingActive(request, env) {
    if (request.method !== 'GET') return createResponse('Method not allowed', 405);
    const url = new URL(request.url);
    const restaurantId = url.searchParams.get('restaurant_id');

    if (!restaurantId) return createResponse({ error: 'restaurant_id required' }, 400);

    const campaigns = await env.DB.prepare(`
        SELECT * FROM marketing_campaigns 
        WHERE restaurant_id = ? AND is_active = TRUE 
        ORDER BY priority DESC, created_at DESC
    `).bind(restaurantId).all();

    const results = (campaigns.results || []).map(c => {
        try {
            return {
                ...c,
                content: JSON.parse(c.content || '{}'),
                settings: JSON.parse(c.settings || '{}')
            };
        } catch (e) {
            return c;
        }
    });

    return createResponse({ campaigns: results });
}

async function handleMarketingInteract(request, env) {
    if (request.method !== 'POST') return createResponse('Method not allowed', 405);
    try {
        const body = await request.json();
        const { restaurant_id, campaign_id, type, contact_value, metadata } = body;

        await env.DB.prepare(`
            INSERT INTO marketing_leads (id, restaurant_id, campaign_id, type, contact_value, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(crypto.randomUUID(), restaurant_id, campaign_id, type, contact_value, JSON.stringify(metadata || {})).run();

        return createResponse({ success: true });
    } catch (e) {
        return createResponse({ error: e.message }, 500);
    }
}

async function handleLoyaltyScan(request, env) {
    if (request.method !== 'POST') return createResponse('Method not allowed', 405);
    try {
        const { qr_id } = await request.json();

        // 1. Validate QR and get associated staff
        const qrCode = await env.DB.prepare(`
            SELECT * FROM qr_codes WHERE id = ?
        `).bind(qr_id).first();

        if (!qrCode) return createResponse({ error: 'Invalid QR' }, 404);

        // 2. Start Session (attributed to waiter if exists)
        const sessionId = crypto.randomUUID();
        await env.DB.prepare(`
            INSERT INTO sessions (id, restaurant_id, qr_code_id, started_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(sessionId, qrCode.restaurant_id, qr_id).run();

        // 3. Find active Scratch Campaign for this restaurant
        const campaign = await env.DB.prepare(`
            SELECT * FROM marketing_campaigns 
            WHERE restaurant_id = ? AND type = 'scratch_win' AND is_active = TRUE
            ORDER BY priority DESC LIMIT 1
        `).bind(qrCode.restaurant_id).first();

        if (!campaign) {
            return createResponse({
                session_id: sessionId,
                has_game: false,
                message: "No active game"
            });
        }

        return createResponse({
            session_id: sessionId,
            restaurant_id: qrCode.restaurant_id, // ✅ Added for frontend context
            has_game: true,
            campaign: {
                id: campaign.id,
                name: campaign.name,
                content: JSON.parse(campaign.content || '{}')
            }
        });

    } catch (e) {
        return createResponse({ error: e.message }, 500);
    }
}

async function handleLoyaltyPlay(request, env) {
    if (request.method !== 'POST') return createResponse('Method not allowed', 405);
    try {
        const { session_id, campaign_id, visitor_id } = await request.json();

        // FRAUD PREVENTION: Check if visitor has played in last 24 hours
        if (visitor_id) {
            const recentPlay = await env.DB.prepare(`
                SELECT id FROM campaign_events 
                WHERE campaign_id = ? 
                  AND visitor_id = ? 
                  AND event_type = 'game_played'
                  AND created_at > datetime('now', '-24 hours')
                LIMIT 1
            `).bind(campaign_id, visitor_id).first();

            if (recentPlay) {
                return createResponse({
                    win: false,
                    cooldown: true,
                    message: "Ya has jugado hoy. ¡Vuelve mañana!"
                });
            }
        }

        // 1. Get available rewards for this campaign
        const rewards = await env.DB.prepare(`
            SELECT * FROM campaign_rewards 
            WHERE campaign_id = ? AND is_active = TRUE AND (max_quantity IS NULL OR max_quantity > 0)
        `).bind(campaign_id).all();

        if (!rewards.results || rewards.results.length === 0) {
            return createResponse({ win: false, message: "No prizes available" });
        }

        // 2. Simple weighted probability logic
        let selectedReward = null;
        const roll = Math.random();
        let cumulative = 0.0;

        for (const r of rewards.results) {
            cumulative += r.probability;
            if (roll < cumulative) {
                selectedReward = r;
                break;
            }
        }

        // 3. Track the play attempt (for fraud prevention)
        if (visitor_id) {
            await env.DB.prepare(`
                INSERT INTO campaign_events (id, campaign_id, visitor_id, session_id, event_type, metadata, created_at)
                VALUES (?, ?, ?, ?, 'game_played', ?, CURRENT_TIMESTAMP)
            `).bind(
                crypto.randomUUID(),
                campaign_id,
                visitor_id,
                session_id || null,
                JSON.stringify({ won: !!selectedReward, reward_id: selectedReward?.id || null })
            ).run();
        }

        if (selectedReward) {
            return createResponse({
                win: true,
                reward: {
                    id: selectedReward.id,
                    name: selectedReward.name,
                    image_url: selectedReward.image_url,
                    description: selectedReward.description
                }
            });
        } else {
            return createResponse({ win: false, message: "Try again next time!" });
        }

    } catch (e) {
        return createResponse({ error: e.message }, 500);
    }
}

async function handleLoyaltyClaim(request, env) {
    if (request.method !== 'POST') return createResponse('Method not allowed', 405);
    try {
        const { session_id, reward_id, campaign_id, contact, restaurant_id } = await request.json();

        // 1. Verify existence
        const reward = await env.DB.prepare('SELECT * FROM campaign_rewards WHERE id = ?').bind(reward_id).first();
        if (!reward) return createResponse({ error: 'Invalid reward' }, 400);

        // 2. Create Claim
        const claimId = crypto.randomUUID();
        const magicToken = crypto.randomUUID().split('-').join('').substring(0, 12); // Simple token

        await env.DB.prepare(`
            INSERT INTO campaign_claims (id, restaurant_id, campaign_id, reward_id, session_id, customer_contact, magic_link_token)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(claimId, restaurant_id, campaign_id, reward_id, session_id, contact, magicToken).run();

        // 3. Decrement inventory if applicable
        if (reward.max_quantity > 0) {
            await env.DB.prepare('UPDATE campaign_rewards SET max_quantity = max_quantity - 1 WHERE id = ?').bind(reward_id).run();
        }

        // 4. Get Google Review URL
        const details = await env.DB.prepare('SELECT google_review_url FROM restaurant_details WHERE restaurant_id = ?').bind(restaurant_id).first();

        return createResponse({
            success: true,
            magic_link: `https://visualtaste.com/loyalty/wallet?token=${magicToken}`, // Mock URL
            google_review_url: details?.google_review_url || null
        });

    } catch (e) {
        return createResponse({ error: e.message }, 500);
    }
}
