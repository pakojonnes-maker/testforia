// workerGuideAdmin.js — Guidebook Administration API
// ============================================
// Protected endpoints for managing guidebook content.
// Auth handled centrally in worker.js
// ============================================
// Routes:
//   GET    /guide/admin/agencies                    — List agencies (superadmin: all, staff: own)
//   GET    /guide/admin/agencies/:id                — Agency detail
//   POST   /guide/admin/agencies                    — Create agency (superadmin only)
//   PUT    /guide/admin/agencies/:id                — Update agency
//   GET    /guide/admin/apartments?agency_id=X      — List apartments
//   POST   /guide/admin/apartments                  — Create apartment
//   PUT    /guide/admin/apartments/:id              — Update apartment
//   GET    /guide/admin/apartments/:id/info         — Get apartment info items
//   POST   /guide/admin/apartments/:id/info         — Upsert apartment info
//   GET    /guide/admin/zones                       — List zones (superadmin)
//   POST   /guide/admin/zones                       — Create zone (superadmin)
//   PUT    /guide/admin/zones/:id                   — Update zone (superadmin)
//   GET    /guide/admin/pois?zone_id=X              — List POIs
//   POST   /guide/admin/pois                        — Create POI (superadmin)
//   PUT    /guide/admin/pois/:id                    — Update POI (superadmin)
//   GET    /guide/admin/experiences?zone_id=X       — List experiences
//   POST   /guide/admin/experiences                 — Create experience (superadmin)
//   PUT    /guide/admin/experiences/:id             — Update experience (superadmin)
//   GET    /guide/admin/stats?agency_id=X           — Agency stats
//   GET    /guide/admin/zone-restaurants?zone_id=X  — List zone restaurant links
//   POST   /guide/admin/zone-restaurants            — Link restaurant to zone (superadmin)
//   DELETE /guide/admin/zone-restaurants             — Unlink restaurant from zone (superadmin)
// ============================================

import { verifyJWT } from './workerAuthentication.js';

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function errorResponse(message, status = 400) {
    return jsonResponse({ success: false, error: message }, status);
}

function generateId(prefix = 'g') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Main handler
 */
export async function handleGuideAdminRequests(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/guide/admin/')) return null;

    // Auth is handled by worker.js, but we need user data for authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return errorResponse('Unauthorized', 401);
    }
    const userData = await verifyJWT(authHeader.substring(7), env.JWT_SECRET);
    if (!userData) return errorResponse('Unauthorized', 401);

    const isSuperAdmin = userData.is_superadmin === true;
    const userId = userData.userId;

    // Determine which agency(ies) this user can access
    let userAgencyIds = [];
    if (!isSuperAdmin) {
        const staffRows = await env.DB.prepare(
            'SELECT agency_id FROM guide_agency_staff WHERE user_id = ? AND is_active = TRUE'
        ).bind(userId).all();
        userAgencyIds = (staffRows.results || []).map(r => r.agency_id);
        if (userAgencyIds.length === 0) {
            return errorResponse('User has no agency access', 403);
        }
    }

    const path = url.pathname.replace('/guide/admin/', '');
    const method = request.method;

    try {
        // ============ AGENCIES ============
        if (path === 'agencies' && method === 'GET') {
            return await listAgencies(env, isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^agencies\/[^/]+$/) && method === 'GET') {
            const id = path.split('/')[1];
            return await getAgency(env, id, isSuperAdmin, userAgencyIds);
        }
        if (path === 'agencies' && method === 'POST') {
            if (!isSuperAdmin) return errorResponse('Only superadmin can create agencies', 403);
            return await createAgency(env, await request.json());
        }
        if (path.match(/^agencies\/[^/]+$/) && method === 'PUT') {
            const id = path.split('/')[1];
            if (!isSuperAdmin && !userAgencyIds.includes(id)) return errorResponse('Forbidden', 403);
            return await updateAgency(env, id, await request.json());
        }

        // ============ APARTMENTS ============
        if (path === 'apartments' && method === 'GET') {
            const agencyId = url.searchParams.get('agency_id');
            return await listApartments(env, agencyId, isSuperAdmin, userAgencyIds);
        }
        if (path === 'apartments' && method === 'POST') {
            const body = await request.json();
            if (!isSuperAdmin && !userAgencyIds.includes(body.agency_id)) return errorResponse('Forbidden', 403);
            return await createApartment(env, body);
        }
        if (path.match(/^apartments\/[^/]+$/) && method === 'GET') {
            const id = path.split('/')[1];
            return await getApartment(env, id, isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+$/) && method === 'PUT') {
            const id = path.split('/')[1];
            return await updateApartment(env, id, await request.json(), isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/info$/) && method === 'GET') {
            const aptId = path.split('/')[1];
            const lang = url.searchParams.get('lang') || 'es';
            return await getApartmentInfo(env, aptId, lang);
        }
        if (path.match(/^apartments\/[^/]+\/info$/) && method === 'POST') {
            const aptId = path.split('/')[1];
            return await upsertApartmentInfo(env, aptId, await request.json(), isSuperAdmin, userAgencyIds);
        }

        // ============ ZONES (superadmin only) ============
        if (path === 'zones' && method === 'GET') {
            return await listZones(env);
        }
        if (path === 'zones' && method === 'POST') {
            if (!isSuperAdmin) return errorResponse('Only superadmin can manage zones', 403);
            return await createZone(env, await request.json());
        }
        if (path.match(/^zones\/[^/]+$/) && method === 'PUT') {
            if (!isSuperAdmin) return errorResponse('Only superadmin can manage zones', 403);
            const id = path.split('/')[1];
            return await updateZone(env, id, await request.json());
        }

        // ============ POIs (superadmin only) ============
        if (path === 'pois' && method === 'GET') {
            const zoneId = url.searchParams.get('zone_id');
            return await listPOIs(env, zoneId);
        }
        if (path === 'pois' && method === 'POST') {
            if (!isSuperAdmin) return errorResponse('Only superadmin can manage POIs', 403);
            return await createPOI(env, await request.json());
        }
        if (path.match(/^pois\/[^/]+$/) && method === 'PUT') {
            if (!isSuperAdmin) return errorResponse('Only superadmin can manage POIs', 403);
            const id = path.split('/')[1];
            return await updatePOI(env, id, await request.json());
        }

        // ============ EXPERIENCES (superadmin only) ============
        if (path === 'experiences' && method === 'GET') {
            const zoneId = url.searchParams.get('zone_id');
            return await listExperiences(env, zoneId);
        }
        if (path === 'experiences' && method === 'POST') {
            if (!isSuperAdmin) return errorResponse('Only superadmin can manage experiences', 403);
            return await createExperience(env, await request.json());
        }
        if (path.match(/^experiences\/[^/]+$/) && method === 'PUT') {
            if (!isSuperAdmin) return errorResponse('Only superadmin can manage experiences', 403);
            const id = path.split('/')[1];
            return await updateExperience(env, id, await request.json());
        }

        // ============ ZONE-RESTAURANTS (superadmin only) ============
        if (path === 'zone-restaurants' && method === 'GET') {
            const zoneId = url.searchParams.get('zone_id');
            return await listZoneRestaurants(env, zoneId);
        }
        if (path === 'zone-restaurants' && method === 'POST') {
            if (!isSuperAdmin) return errorResponse('Only superadmin can manage zone restaurants', 403);
            return await linkZoneRestaurant(env, await request.json());
        }
        if (path === 'zone-restaurants' && method === 'DELETE') {
            if (!isSuperAdmin) return errorResponse('Only superadmin can manage zone restaurants', 403);
            return await unlinkZoneRestaurant(env, await request.json());
        }

        // ============ STATS ============
        if (path === 'stats' && method === 'GET') {
            const agencyId = url.searchParams.get('agency_id');
            if (!isSuperAdmin && !userAgencyIds.includes(agencyId)) return errorResponse('Forbidden', 403);
            return await getAgencyStats(env, agencyId, url.searchParams);
        }

        return null; // Not a guide admin route
    } catch (error) {
        console.error('[GuideAdmin] Error:', error);
        return errorResponse('Admin error: ' + error.message, 500);
    }
}

// ============================================
// AGENCY CRUD
// ============================================
async function listAgencies(env, isSuperAdmin, userAgencyIds) {
    let query = 'SELECT * FROM guide_agencies WHERE is_active = TRUE';
    let params = [];
    if (!isSuperAdmin) {
        const placeholders = userAgencyIds.map(() => '?').join(',');
        query += ` AND id IN (${placeholders})`;
        params = userAgencyIds;
    }
    query += ' ORDER BY name ASC';
    const result = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse({ success: true, agencies: result.results || [] });
}

async function getAgency(env, id, isSuperAdmin, userAgencyIds) {
    if (!isSuperAdmin && !userAgencyIds.includes(id)) return errorResponse('Forbidden', 403);
    const agency = await env.DB.prepare('SELECT * FROM guide_agencies WHERE id = ?').bind(id).first();
    if (!agency) return errorResponse('Agency not found', 404);

    // Get apartment count
    const aptCount = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM guide_apartments WHERE agency_id = ? AND is_active = TRUE'
    ).bind(id).first();

    return jsonResponse({ success: true, agency, apartmentCount: aptCount?.count || 0 });
}

async function createAgency(env, data) {
    const id = generateId('agency');
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await env.DB.prepare(`
        INSERT INTO guide_agencies (id, name, slug, contact_email, contact_phone, logo_url)
        VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, data.name, slug, data.contact_email || null, data.contact_phone || null, data.logo_url || null).run();
    return jsonResponse({ success: true, id, slug });
}

async function updateAgency(env, id, data) {
    const sets = [];
    const vals = [];
    if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
    if (data.contact_email !== undefined) { sets.push('contact_email = ?'); vals.push(data.contact_email); }
    if (data.contact_phone !== undefined) { sets.push('contact_phone = ?'); vals.push(data.contact_phone); }
    if (data.logo_url !== undefined) { sets.push('logo_url = ?'); vals.push(data.logo_url); }
    if (data.is_active !== undefined) { sets.push('is_active = ?'); vals.push(data.is_active ? 1 : 0); }
    if (sets.length === 0) return errorResponse('No fields to update');
    sets.push('modified_at = CURRENT_TIMESTAMP');
    vals.push(id);
    await env.DB.prepare(`UPDATE guide_agencies SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    return jsonResponse({ success: true });
}

// ============================================
// APARTMENT CRUD
// ============================================
async function listApartments(env, agencyId, isSuperAdmin, userAgencyIds) {
    let query = `
        SELECT a.*, z.name as zone_name
        FROM guide_apartments a
        JOIN guide_zones z ON a.zone_id = z.id
        WHERE a.is_active = TRUE
    `;
    const params = [];
    if (agencyId) {
        if (!isSuperAdmin && !userAgencyIds.includes(agencyId)) return errorResponse('Forbidden', 403);
        query += ' AND a.agency_id = ?';
        params.push(agencyId);
    } else if (!isSuperAdmin) {
        const placeholders = userAgencyIds.map(() => '?').join(',');
        query += ` AND a.agency_id IN (${placeholders})`;
        params.push(...userAgencyIds);
    }
    query += ' ORDER BY a.name ASC';
    const result = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse({ success: true, apartments: result.results || [] });
}

async function getApartment(env, id, isSuperAdmin, userAgencyIds) {
    const apt = await env.DB.prepare('SELECT * FROM guide_apartments WHERE id = ?').bind(id).first();
    if (!apt) return errorResponse('Apartment not found', 404);
    if (!isSuperAdmin && !userAgencyIds.includes(apt.agency_id)) return errorResponse('Forbidden', 403);
    return jsonResponse({ success: true, apartment: apt });
}

async function createApartment(env, data) {
    if (!data.agency_id || !data.zone_id || !data.name) {
        return errorResponse('agency_id, zone_id, and name are required');
    }
    const id = generateId('apt');
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await env.DB.prepare(`
        INSERT INTO guide_apartments (id, agency_id, zone_id, name, slug, address, latitude, longitude, cover_image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, data.agency_id, data.zone_id, data.name, slug,
        data.address || null, data.latitude || null, data.longitude || null, data.cover_image_url || null
    ).run();
    return jsonResponse({ success: true, id, slug });
}

async function updateApartment(env, id, data, isSuperAdmin, userAgencyIds) {
    // Verify ownership
    const apt = await env.DB.prepare('SELECT agency_id FROM guide_apartments WHERE id = ?').bind(id).first();
    if (!apt) return errorResponse('Apartment not found', 404);
    if (!isSuperAdmin && !userAgencyIds.includes(apt.agency_id)) return errorResponse('Forbidden', 403);

    const sets = [];
    const vals = [];
    for (const field of ['name', 'address', 'latitude', 'longitude', 'cover_image_url', 'zone_id']) {
        if (data[field] !== undefined) { sets.push(`${field} = ?`); vals.push(data[field]); }
    }
    if (data.is_active !== undefined) { sets.push('is_active = ?'); vals.push(data.is_active ? 1 : 0); }
    if (sets.length === 0) return errorResponse('No fields to update');
    sets.push('modified_at = CURRENT_TIMESTAMP');
    vals.push(id);
    await env.DB.prepare(`UPDATE guide_apartments SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    return jsonResponse({ success: true });
}

// ============================================
// APARTMENT INFO (agency owners can edit)
// ============================================
async function getApartmentInfo(env, aptId, lang) {
    const items = await env.DB.prepare(`
        SELECT 
            ai.id, ai.info_key, ai.icon_name, ai.order_index,
            t_title.value AS title,
            t_content.value AS content
        FROM guide_apartment_info ai
        LEFT JOIN translations t_title ON ai.id = t_title.entity_id 
            AND t_title.entity_type = 'apartment_info' AND t_title.field = 'title' AND t_title.language_code = ?
        LEFT JOIN translations t_content ON ai.id = t_content.entity_id 
            AND t_content.entity_type = 'apartment_info' AND t_content.field = 'content' AND t_content.language_code = ?
        WHERE ai.apartment_id = ?
        ORDER BY ai.order_index ASC
    `).bind(lang, lang, aptId).all();

    const infoResults = items.results || [];
    if (infoResults.length > 0) {
        const infoIds = infoResults.map(i => i.id);
        const placeholders = infoIds.map(() => '?').join(',');
        const media = await env.DB.prepare(`
            SELECT apartment_info_id, id, r2_key, media_type, order_index
            FROM guide_apartment_media
            WHERE apartment_info_id IN (${placeholders})
            ORDER BY order_index ASC
        `).bind(...infoIds).all();

        const mediaByInfo = {};
        for (const m of (media.results || [])) {
            if (!mediaByInfo[m.apartment_info_id]) mediaByInfo[m.apartment_info_id] = [];
            mediaByInfo[m.apartment_info_id].push(m);
        }

        for (const item of infoResults) {
            item.media = mediaByInfo[item.id] || [];
        }
    }

    return jsonResponse({ success: true, info: infoResults });
}

async function upsertApartmentInfo(env, aptId, data, isSuperAdmin, userAgencyIds) {
    // Verify ownership
    const apt = await env.DB.prepare('SELECT agency_id FROM guide_apartments WHERE id = ?').bind(aptId).first();
    if (!apt) return errorResponse('Apartment not found', 404);
    if (!isSuperAdmin && !userAgencyIds.includes(apt.agency_id)) return errorResponse('Forbidden', 403);

    // data: { info_key, icon_name?, order_index?, translations: { es: { title, content }, en: { title, content } } }
    const { info_key, icon_name, order_index, translations } = data;
    if (!info_key) return errorResponse('info_key is required');

    const infoId = `info_${aptId}_${info_key}`;

    // Upsert the info record
    await env.DB.prepare(`
        INSERT INTO guide_apartment_info (id, apartment_id, info_key, icon_name, order_index)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(apartment_id, info_key) DO UPDATE SET
            icon_name = COALESCE(excluded.icon_name, icon_name),
            order_index = excluded.order_index,
            modified_at = CURRENT_TIMESTAMP
    `).bind(infoId, aptId, info_key, icon_name || null, order_index || 0).run();

    // Upsert translations
    if (translations && typeof translations === 'object') {
        const statements = [];
        for (const [lang, fields] of Object.entries(translations)) {
            if (fields.title !== undefined) {
                statements.push(
                    env.DB.prepare(`
                        INSERT INTO translations (entity_id, entity_type, field, language_code, value)
                        VALUES (?, 'apartment_info', 'title', ?, ?)
                        ON CONFLICT(entity_id, entity_type, field, language_code) DO UPDATE SET value = excluded.value
                    `).bind(infoId, lang, fields.title)
                );
            }
            if (fields.content !== undefined) {
                statements.push(
                    env.DB.prepare(`
                        INSERT INTO translations (entity_id, entity_type, field, language_code, value)
                        VALUES (?, 'apartment_info', 'content', ?, ?)
                        ON CONFLICT(entity_id, entity_type, field, language_code) DO UPDATE SET value = excluded.value
                    `).bind(infoId, lang, fields.content)
                );
            }
        }
        if (statements.length > 0) {
            await env.DB.batch(statements);
        }
    }

    // Upsert media if provided
    if (data.media && Array.isArray(data.media)) {
        // First delete existing media for this info item (full replace)
        await env.DB.prepare('DELETE FROM guide_apartment_media WHERE apartment_info_id = ?').bind(infoId).run();
        
        if (data.media.length > 0) {
            const mediaStatements = data.media.map((m, index) => {
                const mediaId = generateId('med');
                return env.DB.prepare(`
                    INSERT INTO guide_apartment_media (id, apartment_info_id, r2_key, media_type, order_index)
                    VALUES (?, ?, ?, ?, ?)
                `).bind(mediaId, infoId, m.r2_key, m.media_type || 'image', index);
            });
            await env.DB.batch(mediaStatements);
        }
    }

    return jsonResponse({ success: true, infoId });
}

// ============================================
// ZONES (superadmin only)
// ============================================
async function listZones(env) {
    const result = await env.DB.prepare(`
        SELECT z.*, 
            (SELECT COUNT(*) FROM guide_apartments WHERE zone_id = z.id AND is_active = TRUE) as apartment_count,
            (SELECT COUNT(*) FROM guide_pois WHERE zone_id = z.id AND is_active = TRUE) as poi_count,
            (SELECT COUNT(*) FROM guide_experiences WHERE zone_id = z.id AND is_active = TRUE) as experience_count
        FROM guide_zones z WHERE z.is_active = TRUE ORDER BY z.name ASC
    `).all();
    return jsonResponse({ success: true, zones: result.results || [] });
}

async function createZone(env, data) {
    if (!data.name) return errorResponse('name is required');
    const id = data.id || `zone_${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await env.DB.prepare(`
        INSERT INTO guide_zones (id, name, slug, country, region, latitude, longitude, cover_image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, data.name, slug, data.country || 'ES', data.region || null,
        data.latitude || null, data.longitude || null, data.cover_image_url || null
    ).run();
    return jsonResponse({ success: true, id, slug });
}

async function updateZone(env, id, data) {
    const sets = [];
    const vals = [];
    for (const field of ['name', 'country', 'region', 'latitude', 'longitude', 'cover_image_url']) {
        if (data[field] !== undefined) { sets.push(`${field} = ?`); vals.push(data[field]); }
    }
    if (data.is_active !== undefined) { sets.push('is_active = ?'); vals.push(data.is_active ? 1 : 0); }
    if (sets.length === 0) return errorResponse('No fields to update');
    sets.push('modified_at = CURRENT_TIMESTAMP');
    vals.push(id);
    await env.DB.prepare(`UPDATE guide_zones SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    return jsonResponse({ success: true });
}

// ============================================
// POIs (superadmin only)
// ============================================
async function listPOIs(env, zoneId) {
    let query = 'SELECT * FROM guide_pois WHERE is_active = TRUE';
    const params = [];
    if (zoneId) { query += ' AND zone_id = ?'; params.push(zoneId); }
    query += ' ORDER BY order_index ASC';
    const result = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse({ success: true, pois: result.results || [] });
}

async function createPOI(env, data) {
    if (!data.zone_id || !data.category) return errorResponse('zone_id and category are required');
    const id = generateId('poi');
    await env.DB.prepare(`
        INSERT INTO guide_pois (id, zone_id, category, latitude, longitude, google_maps_url, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, data.zone_id, data.category,
        data.latitude || null, data.longitude || null, data.google_maps_url || null, data.order_index || 0
    ).run();

    // Save translations if provided
    if (data.translations) {
        await saveTranslations(env, id, 'poi', data.translations);
    }
    return jsonResponse({ success: true, id });
}

async function updatePOI(env, id, data) {
    const sets = [];
    const vals = [];
    for (const field of ['category', 'latitude', 'longitude', 'google_maps_url', 'order_index']) {
        if (data[field] !== undefined) { sets.push(`${field} = ?`); vals.push(data[field]); }
    }
    if (data.is_active !== undefined) { sets.push('is_active = ?'); vals.push(data.is_active ? 1 : 0); }
    if (sets.length > 0) {
        sets.push('modified_at = CURRENT_TIMESTAMP');
        vals.push(id);
        await env.DB.prepare(`UPDATE guide_pois SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    }
    if (data.translations) {
        await saveTranslations(env, id, 'poi', data.translations);
    }
    return jsonResponse({ success: true });
}

// ============================================
// EXPERIENCES (superadmin only)
// ============================================
async function listExperiences(env, zoneId) {
    let query = 'SELECT * FROM guide_experiences WHERE is_active = TRUE';
    const params = [];
    if (zoneId) { query += ' AND zone_id = ?'; params.push(zoneId); }
    query += ' ORDER BY is_featured DESC, order_index ASC';
    const result = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse({ success: true, experiences: result.results || [] });
}

async function createExperience(env, data) {
    if (!data.zone_id || !data.category || !data.action_type || !data.action_data) {
        return errorResponse('zone_id, category, action_type, and action_data are required');
    }
    const id = generateId('exp');
    await env.DB.prepare(`
        INSERT INTO guide_experiences (id, zone_id, category, action_type, action_data, action_prefilled_message,
            commission_type, commission_value, price_display, cover_image_url, order_index, is_featured)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, data.zone_id, data.category, data.action_type, data.action_data,
        data.action_prefilled_message || null, data.commission_type || 'none',
        data.commission_value || 0, data.price_display || null,
        data.cover_image_url || null, data.order_index || 0, data.is_featured ? 1 : 0
    ).run();

    if (data.translations) {
        await saveTranslations(env, id, 'experience', data.translations);
    }
    return jsonResponse({ success: true, id });
}

async function updateExperience(env, id, data) {
    const sets = [];
    const vals = [];
    for (const field of ['category', 'action_type', 'action_data', 'action_prefilled_message',
        'commission_type', 'commission_value', 'price_display', 'cover_image_url', 'order_index']) {
        if (data[field] !== undefined) { sets.push(`${field} = ?`); vals.push(data[field]); }
    }
    if (data.is_featured !== undefined) { sets.push('is_featured = ?'); vals.push(data.is_featured ? 1 : 0); }
    if (data.is_active !== undefined) { sets.push('is_active = ?'); vals.push(data.is_active ? 1 : 0); }
    if (sets.length > 0) {
        sets.push('modified_at = CURRENT_TIMESTAMP');
        vals.push(id);
        await env.DB.prepare(`UPDATE guide_experiences SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    }
    if (data.translations) {
        await saveTranslations(env, id, 'experience', data.translations);
    }
    return jsonResponse({ success: true });
}

// ============================================
// ZONE-RESTAURANTS
// ============================================
async function listZoneRestaurants(env, zoneId) {
    if (!zoneId) return errorResponse('zone_id is required');
    const result = await env.DB.prepare(`
        SELECT zr.*, r.name as restaurant_name, r.slug as restaurant_slug
        FROM guide_zone_restaurants zr
        JOIN restaurants r ON zr.restaurant_id = r.id
        WHERE zr.zone_id = ? AND zr.is_active = TRUE
        ORDER BY zr.tier DESC, r.name ASC
    `).bind(zoneId).all();
    return jsonResponse({ success: true, restaurants: result.results || [] });
}

async function linkZoneRestaurant(env, data) {
    if (!data.zone_id || !data.restaurant_id) return errorResponse('zone_id and restaurant_id required');
    await env.DB.prepare(`
        INSERT INTO guide_zone_restaurants (zone_id, restaurant_id, tier, order_override)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(zone_id, restaurant_id) DO UPDATE SET
            tier = excluded.tier, order_override = excluded.order_override, is_active = TRUE
    `).bind(data.zone_id, data.restaurant_id, data.tier || 'basic', data.order_override || null).run();
    return jsonResponse({ success: true });
}

async function unlinkZoneRestaurant(env, data) {
    if (!data.zone_id || !data.restaurant_id) return errorResponse('zone_id and restaurant_id required');
    await env.DB.prepare(
        'UPDATE guide_zone_restaurants SET is_active = FALSE WHERE zone_id = ? AND restaurant_id = ?'
    ).bind(data.zone_id, data.restaurant_id).run();
    return jsonResponse({ success: true });
}

// ============================================
// STATS (minimal — per user request)
// ============================================
async function getAgencyStats(env, agencyId, params) {
    if (!agencyId) return errorResponse('agency_id is required');

    const fromDate = params.get('from') || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const toDate = params.get('to') || new Date().toISOString().split('T')[0];
    const fromTs = fromDate + 'T00:00:00';
    const toTs = toDate + 'T23:59:59';

    // Get all apartment IDs for this agency
    const apartments = await env.DB.prepare(
        'SELECT id FROM guide_apartments WHERE agency_id = ? AND is_active = TRUE'
    ).bind(agencyId).all();
    const aptIds = (apartments.results || []).map(a => a.id);

    if (aptIds.length === 0) {
        return jsonResponse({
            success: true,
            stats: { qr_scans: 0, avg_duration: 0, restaurant_clicks: 0, experience_clicks: 0, by_language: [], top_restaurants: [] }
        });
    }

    const placeholders = aptIds.map(() => '?').join(',');

    const [scanStats, intentStats, langBreakdown, topRestaurants] = await Promise.all([
        // QR scans + avg duration
        env.DB.prepare(`
            SELECT COUNT(*) as total_scans, AVG(duration_seconds) as avg_duration
            FROM guide_sessions
            WHERE apartment_id IN (${placeholders}) AND started_at BETWEEN ? AND ?
        `).bind(...aptIds, fromTs, toTs).first(),

        // Intent clicks by type
        env.DB.prepare(`
            SELECT 
                SUM(CASE WHEN target_type = 'restaurant' THEN 1 ELSE 0 END) as restaurant_clicks,
                SUM(CASE WHEN target_type = 'experience' THEN 1 ELSE 0 END) as experience_clicks
            FROM guide_affiliate_intents
            WHERE agency_id = ? AND created_at BETWEEN ? AND ?
        `).bind(agencyId, fromTs, toTs).first(),

        // Language breakdown
        env.DB.prepare(`
            SELECT language_code as lang, COUNT(*) as count
            FROM guide_sessions
            WHERE apartment_id IN (${placeholders}) AND started_at BETWEEN ? AND ?
            GROUP BY language_code ORDER BY count DESC
        `).bind(...aptIds, fromTs, toTs).all(),

        // Top clicked restaurants
        env.DB.prepare(`
            SELECT gi.target_id, r.name, COUNT(*) as clicks
            FROM guide_affiliate_intents gi
            JOIN restaurants r ON gi.target_id = r.id
            WHERE gi.agency_id = ? AND gi.target_type = 'restaurant' AND gi.created_at BETWEEN ? AND ?
            GROUP BY gi.target_id ORDER BY clicks DESC LIMIT 5
        `).bind(agencyId, fromTs, toTs).all()
    ]);

    return jsonResponse({
        success: true,
        stats: {
            qr_scans: scanStats?.total_scans || 0,
            avg_duration: Math.round(scanStats?.avg_duration || 0),
            restaurant_clicks: intentStats?.restaurant_clicks || 0,
            experience_clicks: intentStats?.experience_clicks || 0,
            by_language: langBreakdown.results || [],
            top_restaurants: (topRestaurants.results || []).map(r => ({
                id: r.target_id,
                name: r.name,
                clicks: r.clicks
            }))
        },
        range: { from: fromDate, to: toDate }
    });
}

// ============================================
// UTILITY: Save translations in batch
// ============================================
async function saveTranslations(env, entityId, entityType, translations) {
    // translations format: { es: { name: "...", description: "..." }, en: { name: "...", description: "..." } }
    const statements = [];
    for (const [lang, fields] of Object.entries(translations)) {
        for (const [field, value] of Object.entries(fields)) {
            statements.push(
                env.DB.prepare(`
                    INSERT INTO translations (entity_id, entity_type, field, language_code, value)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(entity_id, entity_type, field, language_code) DO UPDATE SET value = excluded.value
                `).bind(entityId, entityType, field, lang, value)
            );
        }
    }
    if (statements.length > 0) {
        await env.DB.batch(statements);
    }
}
