// workerGuide.js — Guidebook Public API
// ============================================
// Endpoint: GET /guide/:apartment_slug?lang=es
// Returns complete guidebook data for a single apartment
// ============================================

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function errorResponse(message, status = 400) {
    return jsonResponse({ success: false, error: message }, status);
}

/**
 * Main handler for guide public routes
 */
export async function handleGuideRequests(request, env) {
    const url = new URL(request.url);

    // Only handle GET /guide/:slug
    const match = url.pathname.match(/^\/guide\/([^/]+)$/);
    if (!match || request.method !== 'GET') return null;

    const slug = match[1];
    const lang = url.searchParams.get('lang') || 'es';

    try {
        return await handleGetGuidebook(env, slug, lang);
    } catch (error) {
        console.error('[Guide] Error:', error);
        return errorResponse('Error loading guidebook: ' + error.message, 500);
    }
}

/**
 * Load complete guidebook for an apartment
 */
async function handleGetGuidebook(env, slug, lang) {
    // 1. Load apartment + zone + agency
    const apartment = await env.DB.prepare(`
        SELECT 
            a.id, a.name, a.slug, a.address, a.latitude, a.longitude, a.cover_image_url,
            a.zone_id, a.agency_id
        FROM guide_apartments a
        WHERE a.slug = ? AND a.is_active = TRUE
    `).bind(slug).first();

    if (!apartment) {
        return errorResponse('Apartment not found', 404);
    }

    // 2. Parallel load: zone, agency, info, POIs, experiences, restaurants
    const [zone, agency, apartmentInfo, pois, experiences, zoneRestaurants] = await Promise.all([
        // Zone
        env.DB.prepare(`
            SELECT id, name, slug, country, region, latitude, longitude, cover_image_url
            FROM guide_zones WHERE id = ? AND is_active = TRUE
        `).bind(apartment.zone_id).first(),

        // Agency
        env.DB.prepare(`
            SELECT id, name, slug, logo_url
            FROM guide_agencies WHERE id = ? AND is_active = TRUE
        `).bind(apartment.agency_id).first(),

        // Apartment info with translations
        env.DB.prepare(`
            SELECT 
                ai.id, ai.info_key, ai.icon_name, ai.order_index,
                t_title.value AS title,
                t_content.value AS content
            FROM guide_apartment_info ai
            LEFT JOIN translations t_title ON ai.id = t_title.entity_id 
                AND t_title.entity_type = 'apartment_info' 
                AND t_title.field = 'title' 
                AND t_title.language_code = ?
            LEFT JOIN translations t_content ON ai.id = t_content.entity_id 
                AND t_content.entity_type = 'apartment_info'
                AND t_content.field = 'content' 
                AND t_content.language_code = ?
            WHERE ai.apartment_id = ?
            ORDER BY ai.order_index ASC
        `).bind(lang, lang, apartment.id).all(),

        // POIs with translations
        env.DB.prepare(`
            SELECT 
                p.id, p.category, p.latitude, p.longitude, p.google_maps_url,
                t_name.value AS name,
                t_desc.value AS description
            FROM guide_pois p
            LEFT JOIN translations t_name ON p.id = t_name.entity_id 
                AND t_name.entity_type = 'poi' 
                AND t_name.field = 'name' 
                AND t_name.language_code = ?
            LEFT JOIN translations t_desc ON p.id = t_desc.entity_id 
                AND t_desc.entity_type = 'poi' 
                AND t_desc.field = 'description' 
                AND t_desc.language_code = ?
            WHERE p.zone_id = ? AND p.is_active = TRUE
            ORDER BY p.order_index ASC
        `).bind(lang, lang, apartment.zone_id).all(),

        // Experiences with translations
        env.DB.prepare(`
            SELECT 
                e.id, e.category, e.action_type, e.action_data, e.action_prefilled_message,
                e.price_display, e.cover_image_url, e.is_featured,
                t_name.value AS name,
                t_desc.value AS description,
                t_cta.value AS cta_label
            FROM guide_experiences e
            LEFT JOIN translations t_name ON e.id = t_name.entity_id 
                AND t_name.entity_type = 'experience' 
                AND t_name.field = 'name' 
                AND t_name.language_code = ?
            LEFT JOIN translations t_desc ON e.id = t_desc.entity_id 
                AND t_desc.entity_type = 'experience' 
                AND t_desc.field = 'description' 
                AND t_desc.language_code = ?
            LEFT JOIN translations t_cta ON e.id = t_cta.entity_id 
                AND t_cta.entity_type = 'experience' 
                AND t_cta.field = 'cta_label' 
                AND t_cta.language_code = ?
            WHERE e.zone_id = ? AND e.is_active = TRUE
            ORDER BY e.is_featured DESC, e.order_index ASC
        `).bind(lang, lang, lang, apartment.zone_id).all(),

        // Zone restaurants (bridge to existing restaurants table)
        env.DB.prepare(`
            SELECT 
                r.id, r.name, r.slug,
                zr.tier,
                (SELECT dm.r2_key FROM dish_media dm 
                 JOIN dishes d ON dm.dish_id = d.id 
                 WHERE d.restaurant_id = r.id AND dm.is_primary = 1 
                 LIMIT 1) AS cover_image
            FROM guide_zone_restaurants zr
            JOIN restaurants r ON zr.restaurant_id = r.id AND r.is_active = TRUE
            WHERE zr.zone_id = ? AND zr.is_active = TRUE
            ORDER BY 
                CASE WHEN zr.tier = 'featured' THEN 0 ELSE 1 END,
                CASE WHEN zr.order_override IS NOT NULL THEN zr.order_override 
                     ELSE ABS(RANDOM()) % 1000 END
        `).bind(apartment.zone_id).all()
    ]);

    if (!zone) {
        return errorResponse('Zone not found for this apartment', 404);
    }

    // 3. Load POI media
    const poiIds = (pois.results || []).map(p => p.id);
    let poiMedia = {};
    if (poiIds.length > 0) {
        const placeholders = poiIds.map(() => '?').join(',');
        const mediaResults = await env.DB.prepare(`
            SELECT poi_id, id, r2_key, media_type, role, order_index
            FROM guide_poi_media
            WHERE poi_id IN (${placeholders})
            ORDER BY order_index ASC
        `).bind(...poiIds).all();

        for (const media of (mediaResults.results || [])) {
            if (!poiMedia[media.poi_id]) poiMedia[media.poi_id] = [];
            poiMedia[media.poi_id].push({
                id: media.id,
                url: `/media/${media.r2_key}`,
                type: media.media_type,
                role: media.role
            });
        }
    }

    // 4. Load apartment media
    const infoIds = (apartmentInfo.results || []).map(i => i.id);
    let aptMedia = {};
    if (infoIds.length > 0) {
        const placeholders = infoIds.map(() => '?').join(',');
        const mediaResults = await env.DB.prepare(`
            SELECT apartment_info_id, id, r2_key, media_type, order_index
            FROM guide_apartment_media
            WHERE apartment_info_id IN (${placeholders})
            ORDER BY order_index ASC
        `).bind(...infoIds).all();

        for (const media of (mediaResults.results || [])) {
            if (!aptMedia[media.apartment_info_id]) aptMedia[media.apartment_info_id] = [];
            aptMedia[media.apartment_info_id].push({
                id: media.id,
                url: `/media/${media.r2_key}`,
                type: media.media_type
            });
        }
    }

    // 5. Get zone translated description
    const zoneDesc = await env.DB.prepare(`
        SELECT value FROM translations
        WHERE entity_id = ? AND entity_type = 'zone' AND field = 'description' AND language_code = ?
    `).bind(zone.id, lang).first();

    // 6. Compose response  
    // Replace {{apartment_name}} in prefilled WhatsApp messages
    const processedExperiences = (experiences.results || []).map(exp => {
        let prefilled = exp.action_prefilled_message;
        if (prefilled) {
            prefilled = prefilled.replace(/\{\{apartment_name\}\}/g, apartment.name);
        }
        return {
            id: exp.id,
            name: exp.name || exp.id,
            description: exp.description || '',
            category: exp.category,
            action_type: exp.action_type,
            action_data: exp.action_data,
            prefilled_message: prefilled,
            price_display: exp.price_display,
            cover_image_url: exp.cover_image_url,
            is_featured: exp.is_featured === 1,
            cta_label: exp.cta_label || (exp.action_type === 'WHATSAPP' ? 'WhatsApp' : 'Reservar')
        };
    });

    return jsonResponse({
        success: true,
        apartment: {
            id: apartment.id,
            name: apartment.name,
            slug: apartment.slug,
            address: apartment.address,
            cover_image_url: apartment.cover_image_url,
            info: (apartmentInfo.results || []).map(info => ({
                id: info.id,
                key: info.info_key,
                icon: info.icon_name,
                title: info.title || info.info_key,
                content: info.content || '',
                media: aptMedia[info.id] || []
            }))
        },
        zone: {
            id: zone.id,
            name: zone.name,
            slug: zone.slug,
            region: zone.region,
            cover_image_url: zone.cover_image_url,
            description: zoneDesc?.value || ''
        },
        agency: {
            id: agency?.id,
            name: agency?.name || 'Host',
            logo_url: agency?.logo_url
        },
        pois: (pois.results || []).map(poi => ({
            id: poi.id,
            name: poi.name || poi.id,
            description: poi.description || '',
            category: poi.category,
            latitude: poi.latitude,
            longitude: poi.longitude,
            google_maps_url: poi.google_maps_url,
            media: poiMedia[poi.id] || []
        })),
        restaurants: (zoneRestaurants.results || []).map(r => ({
            id: r.id,
            name: r.name,
            slug: r.slug,
            tier: r.tier,
            cover_image: r.cover_image ? `/media/${r.cover_image}` : null
        })),
        experiences: processedExperiences,
        meta: {
            lang,
            available_langs: ['es', 'en', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'zh', 'ja', 'ko', 'ar']
        }
    });
}
