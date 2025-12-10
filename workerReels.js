// workerReels.js - VERSIÓN OPTIMIZADA CON PREFIJO reel_ + MARKETING

export async function handleReelsRequests(request, env) {
    const url = new URL(request.url);

    // ✅ Endpoint: GET /restaurants/:slug/reels
    if (request.method === "GET" && url.pathname.match(/^\/restaurants\/[^/]+\/reels$/)) {
        const slug = url.pathname.split('/')[2];
        const params = new URLSearchParams(url.search);
        const menuId = params.get('menu_id');
        const langCode = params.get('lang') || 'es';

        try {
            console.log(`[Reels] 🎬 Processing: ${slug}, language: ${langCode}`);

            // ✅ 1. RESTAURANT + THEME
            const restaurant = await env.DB.prepare(`
        SELECT 
          r.id, r.name, r.slug, r.logo_url, r.cover_image_url, r.website,
          r.reel_template_id, r.theme_id,
          rd.instagram_url,
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
            let customColors = null;
            let configOverrides = {};

            if (reelConfig?.config_overrides) {
                try {
                    configOverrides = JSON.parse(reelConfig.config_overrides);

                    // ✅ CORREGIDO: Leer campos con prefijo reel_
                    if (configOverrides.reel_primary_color) {
                        customColors = {
                            primary: configOverrides.reel_primary_color,
                            secondary: configOverrides.reel_secondary_color,
                            text: configOverrides.reel_text_color,
                            background: configOverrides.reel_background_color
                        };
                        console.log('[Reels] ✅ Using custom reel colors:', customColors);
                    }
                } catch (e) {
                    console.warn('[Reels] Error parsing config_overrides:', e);
                }
            }

            // ✅ 4. CONSTRUIR BRANDING CON JERARQUÍA: reel colors > theme colors > defaults
            const branding = {
                primary_color: customColors?.primary || restaurant.primary_color || '#FF6B6B',
                secondary_color: customColors?.secondary || restaurant.secondary_color || '#4ECDC4',
                accent_color: restaurant.accent_color || '#FF8C42', // Solo de theme (no hay reel_accent_color)
                text_color: customColors?.text || restaurant.text_color || '#FFFFFF',
                background_color: customColors?.background || restaurant.background_color || '#000000',
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

            // ✅ 12.5 [NEW] MARKETING CAMPAIGN
            const activeCampaign = await env.DB.prepare(`
        SELECT * FROM marketing_campaigns 
        WHERE restaurant_id = ? AND is_active = TRUE 
        ORDER BY priority DESC, created_at DESC 
        LIMIT 1
      `).bind(restaurant.id).first();

            let marketingCampaign = undefined;
            if (activeCampaign) {
                try {
                    marketingCampaign = {
                        id: activeCampaign.id,
                        type: activeCampaign.type,
                        content: JSON.parse(activeCampaign.content || '{}'),
                        settings: JSON.parse(activeCampaign.settings || '{}')
                    };
                } catch (e) {
                    console.error("Error parsing campaign JSON", e);
                }
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
                    branding
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
                theme: {
                    fontFamily: restaurant.font_family || 'Inter, sans-serif',
                    fontAccent: restaurant.font_accent || 'serif',
                    accentColor: restaurant.accent_color || '#FF8C42',
                    textColor: restaurant.text_color || '#FFFFFF',
                    backgroundColor: restaurant.background_color || '#000000',
                },
                marketing: marketingCampaign // [NEW] Include marketing
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
      da.dish_id, a.id as allergen_id, a.icon_url,
      GROUP_CONCAT(
        CASE WHEN t.language_code = ? THEN t.value END
      ) as allergen_name
    FROM dish_allergens da
    JOIN allergens a ON da.allergen_id = a.id
    LEFT JOIN translations t ON t.entity_id = a.id 
      AND t.entity_type = 'allergen' 
      AND t.language_code = ?
    WHERE da.dish_id IN (${dishIds.map(() => '?').join(',')})
    GROUP BY da.dish_id, a.id, a.icon_url
  `).bind(langCode, langCode, ...dishIds).all();

    const allergensByDish = {};
    (allergensQuery.results || []).forEach(item => {
        if (!allergensByDish[item.dish_id]) allergensByDish[item.dish_id] = [];
        allergensByDish[item.dish_id].push({
            id: item.allergen_id,
            name: item.allergen_name || item.allergen_id,
            icon_url: item.icon_url
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
        position: dish.order_index,
        media,
        allergens: allergensList
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
