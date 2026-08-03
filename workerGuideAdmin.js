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
//   GET    /guide/admin/apartments/:id/info/coverage — Per-language translation coverage
//   GET    /guide/admin/apartments/:id/info/:infoId/translations — All langs for one block
//   PUT    /guide/admin/apartments/:id/info/reorder — Reorder info blocks
//   POST   /guide/admin/apartments/:id/info/bulk-translations — Import translations (JSON, all langs at once)
//   POST   /guide/admin/apartments/:id/info/:infoId/media       — Upload a photo/video for an info block
//   DELETE /guide/admin/apartments/:id/info/:infoId/media/:mid  — Delete one info block media item
//   DELETE /guide/admin/apartments/:id/info/:infoId — Delete an info block
//   GET    /guide/admin/info-categories             — Global info category catalog (icon/color/name)
//   GET    /guide/admin/apartments/:id/phones       — List apartment phone entries (agency first)
//   POST   /guide/admin/apartments/:id/phones       — Create/update a phone entry (checklist add/edit)
//   DELETE /guide/admin/apartments/:id/phones/:pid  — Delete a phone entry (checklist remove)
//   GET    /guide/admin/phone-categories             — Global phone category catalog (icon/name), read-only
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
import { touchGuideVersion, touchZoneGuideVersions, touchAllGuideVersions } from './workerGuideCache.js';

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

async function getApartmentSlug(env, aptId) {
    const apt = await env.DB.prepare('SELECT slug FROM guide_apartments WHERE id = ?').bind(aptId).first();
    return apt?.slug;
}

// 13 active languages for this project (see CLAUDE.md §5). 'nl' (Dutch) and other
// legacy codes were removed project-wide; keep this list in sync with the rest of the app.
export const ACTIVE_LANGUAGES = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'ar', 'ru', 'uk', 'zh', 'ja', 'ko'];

// Cache invalidation now lives in workerGuideCache.js (touchGuideVersion /
// touchZoneGuideVersions) — bumping a version instead of deleting one KV key
// per active language. See that file for why.

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
        if (path.match(/^apartments\/[^/]+\/info\/coverage$/) && method === 'GET') {
            const aptId = path.split('/')[1];
            return await getApartmentInfoCoverage(env, aptId, isSuperAdmin, userAgencyIds);
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
        if (path.match(/^apartments\/[^/]+\/info\/[^/]+\/translations$/) && method === 'GET') {
            const parts = path.split('/');
            return await getApartmentInfoTranslations(env, parts[1], parts[3], isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/info\/reorder$/) && method === 'PUT') {
            const aptId = path.split('/')[1];
            return await reorderApartmentInfo(env, aptId, await request.json(), isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/info\/bulk-translations$/) && method === 'POST') {
            const aptId = path.split('/')[1];
            return await bulkImportApartmentInfoTranslations(env, aptId, await request.json(), isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/info\/[^/]+\/media$/) && method === 'POST') {
            const parts = path.split('/');
            return await addApartmentInfoMedia(env, parts[1], parts[3], request, isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/info\/[^/]+\/media\/[^/]+$/) && method === 'DELETE') {
            const parts = path.split('/');
            return await deleteApartmentInfoMedia(env, parts[1], parts[3], parts[5], isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/info\/[^/]+$/) && method === 'DELETE') {
            const parts = path.split('/');
            return await deleteApartmentInfo(env, parts[1], parts[3], isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/stats$/) && method === 'GET') {
            const aptId = path.split('/')[1];
            return await getApartmentStats(env, aptId, url.searchParams, isSuperAdmin, userAgencyIds);
        }

        // ============ WELCOME MODAL ============
        if (path.match(/^apartments\/[^/]+\/welcome$/) && method === 'GET') {
            const aptId = path.split('/')[1];
            return await getWelcomeModal(env, aptId, isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/welcome$/) && method === 'PUT') {
            const aptId = path.split('/')[1];
            return await upsertWelcomeModal(env, aptId, await request.json(), isSuperAdmin, userAgencyIds);
        }

        // ============ STORE ITEMS — host (per-apartment, agency-writable) ============
        if (path.match(/^apartments\/[^/]+\/store-items$/) && method === 'GET') {
            const aptId = path.split('/')[1];
            return await listApartmentStoreItems(env, aptId, isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/store-items$/) && method === 'POST') {
            const aptId = path.split('/')[1];
            return await createApartmentStoreItem(env, aptId, await request.json(), isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/store-items\/reorder$/) && method === 'PUT') {
            const aptId = path.split('/')[1];
            return await reorderApartmentStoreItems(env, aptId, await request.json(), isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/store-items\/[^/]+$/) && method === 'PUT') {
            const parts = path.split('/');
            return await updateApartmentStoreItem(env, parts[1], parts[3], await request.json(), isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/store-items\/[^/]+$/) && method === 'DELETE') {
            const parts = path.split('/');
            return await deleteApartmentStoreItem(env, parts[1], parts[3], isSuperAdmin, userAgencyIds);
        }

        // ============ STORE ITEMS — platform catalog (superadmin only, global) ============
        if (path === 'store-items' && method === 'GET') {
            if (!isSuperAdmin) return errorResponse('Only superadmin can manage the platform catalog', 403);
            return await listPlatformStoreItems(env);
        }
        if (path === 'store-items' && method === 'POST') {
            if (!isSuperAdmin) return errorResponse('Only superadmin can manage the platform catalog', 403);
            return await createPlatformStoreItem(env, await request.json());
        }
        if (path.match(/^store-items\/[^/]+$/) && method === 'PUT') {
            if (!isSuperAdmin) return errorResponse('Only superadmin can manage the platform catalog', 403);
            const id = path.split('/')[1];
            return await updatePlatformStoreItem(env, id, await request.json());
        }
        if (path.match(/^store-items\/[^/]+$/) && method === 'DELETE') {
            if (!isSuperAdmin) return errorResponse('Only superadmin can manage the platform catalog', 403);
            const id = path.split('/')[1];
            return await deletePlatformStoreItem(env, id);
        }

        // ============ STORE ORDERS ============
        if (path.match(/^apartments\/[^/]+\/orders$/) && method === 'GET') {
            const aptId = path.split('/')[1];
            return await listApartmentOrders(env, aptId, url.searchParams, isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^orders\/[^/]+$/) && method === 'PUT') {
            const id = path.split('/')[1];
            return await updateStoreOrderStatus(env, id, await request.json(), isSuperAdmin, userAgencyIds);
        }
        if (path === 'stats/store' && method === 'GET') {
            const aptId = url.searchParams.get('apartment_id');
            if (!aptId) return errorResponse('apartment_id required');
            return await getStoreStats(env, aptId, url.searchParams, isSuperAdmin, userAgencyIds);
        }

        // ============ APARTMENT POIS ============
        if (path.match(/^apartments\/[^/]+\/pois$/) && method === 'GET') {
            const aptId = path.split('/')[1];
            return await listApartmentPois(env, aptId, isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/pois$/) && method === 'POST') {
            const aptId = path.split('/')[1];
            return await assignApartmentPoi(env, aptId, await request.json(), isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/pois\/reorder$/) && method === 'PUT') {
            const aptId = path.split('/')[1];
            return await reorderApartmentPois(env, aptId, await request.json(), isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/pois\/[^/]+$/) && method === 'DELETE') {
            const parts = path.split('/');
            return await removeApartmentPoi(env, parts[1], parts[3], isSuperAdmin, userAgencyIds);
        }

        // ============ GUIDE INFO STEPS ============
        if (path.match(/^apartments\/[^/]+\/info\/[^/]+\/steps$/) && method === 'GET') {
            const parts = path.split('/');
            return await listGuideInfoSteps(env, parts[1], parts[3], isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/info\/[^/]+\/steps$/) && method === 'POST') {
            const parts = path.split('/');
            return await createGuideInfoStep(env, parts[1], parts[3], await request.json(), isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/info\/[^/]+\/steps\/reorder$/) && method === 'PUT') {
            const parts = path.split('/');
            return await reorderGuideInfoSteps(env, parts[1], parts[3], await request.json(), isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/info\/[^/]+\/steps\/[^/]+$/) && method === 'PUT') {
            const parts = path.split('/');
            return await updateGuideInfoStep(env, parts[1], parts[3], parts[5], await request.json(), isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/info\/[^/]+\/steps\/[^/]+$/) && method === 'DELETE') {
            const parts = path.split('/');
            return await deleteGuideInfoStep(env, parts[1], parts[3], parts[5], isSuperAdmin, userAgencyIds);
        }

        // ============ INFO CATEGORIES (global catalog, read-only for agencies) ============
        if (path === 'info-categories' && method === 'GET') {
            return await listInfoCategories(env, url.searchParams.get('lang'));
        }

        // ============ PHONES (per-apartment checklist) ============
        if (path.match(/^apartments\/[^/]+\/phones$/) && method === 'GET') {
            const aptId = path.split('/')[1];
            return await listApartmentPhones(env, aptId, url.searchParams.get('lang') || 'es', isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/phones$/) && method === 'POST') {
            const aptId = path.split('/')[1];
            return await upsertApartmentPhone(env, aptId, await request.json(), isSuperAdmin, userAgencyIds);
        }
        if (path.match(/^apartments\/[^/]+\/phones\/[^/]+$/) && method === 'DELETE') {
            const parts = path.split('/');
            return await deleteApartmentPhone(env, parts[1], parts[3], isSuperAdmin, userAgencyIds);
        }

        // ============ PHONE CATEGORIES (global catalog, read-only for agencies) ============
        if (path === 'phone-categories' && method === 'GET') {
            return await listPhoneCategories(env, url.searchParams.get('lang'));
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
        if (path.match(/^pois\/[^/]+\/media$/) && method === 'POST') {
            if (!isSuperAdmin) return errorResponse('Only superadmin can manage POIs', 403);
            const id = path.split('/')[1];
            return await addPoiMedia(env, id, request);
        }
        if (path.match(/^pois\/[^/]+\/media\/[^/]+$/) && method === 'DELETE') {
            if (!isSuperAdmin) return errorResponse('Only superadmin can manage POIs', 403);
            const parts = path.split('/');
            return await deletePoiMedia(env, parts[1], parts[3]);
        }

        // ============ EXPERIENCES ============
        if (path === 'experiences' && method === 'GET') {
            const zoneId = url.searchParams.get('zone_id');
            return await listExperiences(env, zoneId, isSuperAdmin);
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
        if (path.match(/^experiences\/[^/]+$/) && method === 'DELETE') {
            if (!isSuperAdmin) return errorResponse('Only superadmin can manage experiences', 403);
            const id = path.split('/')[1];
            return await deleteExperience(env, id);
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
        // Search across the core `restaurants` table (the actual SaaS tenants), so the
        // zone-restaurants admin page can find a restaurant to link without needing its
        // own restaurant CRUD — that already lives in workerRestaurants.js.
        if (path === 'restaurants-search' && method === 'GET') {
            if (!isSuperAdmin) return errorResponse('Only superadmin can search restaurants', 403);
            return await searchRestaurants(env, url.searchParams.get('q') || '');
        }

        // ============ STATS & COMMISSIONS ============
        if (path === 'stats' && method === 'GET') {
            const agencyId = url.searchParams.get('agency_id');
            if (!isSuperAdmin && !userAgencyIds.includes(agencyId)) return errorResponse('Forbidden', 403);
            return await getAgencyStats(env, agencyId, url.searchParams);
        }
        if (path === 'stats/dashboard' && method === 'GET') {
            const agencyId = url.searchParams.get('agency_id');
            if (!isSuperAdmin && !userAgencyIds.includes(agencyId)) return errorResponse('Forbidden', 403);
            return await getStatsDashboard(env, agencyId, url.searchParams);
        }
        if (path === 'stats/devices' && method === 'GET') {
            const aptId = url.searchParams.get('apartment_id');
            return await getStatsDevices(env, aptId, url.searchParams, isSuperAdmin, userAgencyIds);
        }
        if (path === 'stats/conversions' && method === 'GET') {
            if (!isSuperAdmin) return errorResponse('Only superadmin can view the conversion funnel', 403);
            return await getRestaurantConversions(env, url.searchParams);
        }
        if (path === 'stats/experiences' && method === 'GET') {
            const zoneId = url.searchParams.get('zone_id');
            // Assuming this is superadmin or requires specific zone check. We'll leave it superadmin for simplicity unless agency is given.
            return await getStatsExperiences(env, zoneId, url.searchParams);
        }
        if (path === 'stats/sessions' && method === 'GET') {
            const agencyId = url.searchParams.get('agency_id');
            if (!isSuperAdmin && !userAgencyIds.includes(agencyId)) return errorResponse('Forbidden', 403);
            return await getSessionsLog(env, agencyId, url.searchParams);
        }
        if (path.match(/^stats\/sessions\/[^/]+$/) && method === 'GET') {
            const sessionId = path.split('/')[2];
            return await getSessionDetail(env, sessionId, isSuperAdmin, userAgencyIds);
        }

        // ============ COMMISSIONS ============
        if (path === 'commissions' && method === 'GET') {
            const agencyId = url.searchParams.get('agency_id');
            if (!isSuperAdmin && !userAgencyIds.includes(agencyId)) return errorResponse('Forbidden', 403);
            return await listCommissions(env, agencyId, url.searchParams);
        }
        if (path === 'commissions/summary' && method === 'GET') {
            const agencyId = url.searchParams.get('agency_id');
            if (!isSuperAdmin && !userAgencyIds.includes(agencyId)) return errorResponse('Forbidden', 403);
            return await getCommissionsSummary(env, agencyId);
        }
        if (path.match(/^commissions\/[^/]+$/) && method === 'PUT') {
            const id = path.split('/')[1];
            return await updateCommission(env, id, await request.json(), isSuperAdmin, userAgencyIds);
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
    for (const field of ['name', 'contact_email', 'contact_phone', 'logo_url', 'primary_color', 'secondary_color', 'accent_color', 'font_family']) {
        if (data[field] !== undefined) { sets.push(`${field} = ?`); vals.push(data[field]); }
    }
    if (data.is_active !== undefined) { sets.push('is_active = ?'); vals.push(data.is_active ? 1 : 0); }
    if (sets.length === 0) return errorResponse('No fields to update');
    sets.push('modified_at = CURRENT_TIMESTAMP');
    vals.push(id);
    await env.DB.prepare(`UPDATE guide_agencies SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();

    // El diseño (colores/fuente) es de la agencia, pero se sirve cacheado en el
    // payload de CADA apartamento (workerGuide.js), con TTL de 24h. Sin esto, un
    // cambio de color guardado aquí no se veía en la guía hasta que la caché
    // expirase sola — el bug real detrás de "no coge los colores".
    const apartments = await env.DB.prepare(
        'SELECT slug FROM guide_apartments WHERE agency_id = ? AND is_active = TRUE'
    ).bind(id).all();
    for (const apt of (apartments.results || [])) {
        if (apt.slug) await touchGuideVersion(env, apt.slug);
    }

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
    for (const field of ['name', 'address', 'latitude', 'longitude', 'cover_image_url', 'zone_id', 'wifi_ssid', 'wifi_password', 'wifi_security', 'contact_whatsapp']) {
        if (data[field] !== undefined) { sets.push(`${field} = ?`); vals.push(data[field]); }
    }
    if (data.is_active !== undefined) { sets.push('is_active = ?'); vals.push(data.is_active ? 1 : 0); }
    if (sets.length === 0) return errorResponse('No fields to update');
    sets.push('modified_at = CURRENT_TIMESTAMP');
    vals.push(id);
    await env.DB.prepare(`UPDATE guide_apartments SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    
    const slug = apt.slug || await getApartmentSlug(env, id);
    if (slug) await touchGuideVersion(env, slug);
    
    return jsonResponse({ success: true });
}

// ============================================
// APARTMENT INFO (agency owners can edit)
// ============================================
async function getApartmentInfo(env, aptId, lang) {
    // title/content deliberately do NOT fall back to 'es' here (unlike the public
    // workerGuide.js) — the admin needs to show "no translation yet" per language
    // tab. category_name is different: it's sourced from the global catalog, which
    // is seeded complete in all 13 languages, so it's safe (and useful) to always
    // resolve it — it's the preview of what the guest will actually see as the
    // title when the host hasn't written a custom one.
    const items = await env.DB.prepare(`
        SELECT
            ai.id, ai.info_key, ai.icon_name, ai.order_index, ai.category_key, ai.use_custom_title,
            ai.latitude, ai.longitude,
            t_title.value AS title,
            t_content.value AS content,
            t_pickup.value AS pickup_instructions,
            c.icon_name AS category_icon_name, c.color AS category_color, c.image_r2_key AS category_image_r2_key,
            COALESCE(cat_name.value, cat_name_es.value) AS category_name,
            CASE WHEN ai.use_custom_title THEN t_title.value ELSE COALESCE(cat_name.value, cat_name_es.value) END AS resolved_title
        FROM guide_apartment_info ai
        LEFT JOIN translations t_title ON ai.id = t_title.entity_id
            AND t_title.entity_type = 'apartment_info' AND t_title.field = 'title' AND t_title.language_code = ?
        LEFT JOIN translations t_content ON ai.id = t_content.entity_id
            AND t_content.entity_type = 'apartment_info' AND t_content.field = 'content' AND t_content.language_code = ?
        LEFT JOIN translations t_pickup ON ai.id = t_pickup.entity_id
            AND t_pickup.entity_type = 'apartment_info' AND t_pickup.field = 'pickup_instructions' AND t_pickup.language_code = ?
        LEFT JOIN guide_info_categories c ON ai.category_key = c.key
        LEFT JOIN translations cat_name ON c.key = cat_name.entity_id
            AND cat_name.entity_type = 'info_category' AND cat_name.field = 'name' AND cat_name.language_code = ?
        LEFT JOIN translations cat_name_es ON c.key = cat_name_es.entity_id
            AND cat_name_es.entity_type = 'info_category' AND cat_name_es.field = 'name' AND cat_name_es.language_code = 'es'
        WHERE ai.apartment_id = ?
        ORDER BY ai.order_index ASC
    `).bind(lang, lang, lang, lang, aptId).all();

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

// One aggregate query instead of fetching all 13 languages client-side just to
// count non-empty blocks — powers the "es 12/12 · ja 0/12" coverage strip in
// the admin so a host can see at a glance what still needs a manual translation
// pass (see CLAUDE.md: no auto-translate yet, this is the manual-workflow helper).
async function getApartmentInfoCoverage(env, aptId, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const total = await env.DB.prepare(
        'SELECT COUNT(*) as c FROM guide_apartment_info WHERE apartment_id = ?'
    ).bind(aptId).first();

    const rows = await env.DB.prepare(`
        SELECT t.language_code, COUNT(DISTINCT t.entity_id) as c
        FROM translations t
        JOIN guide_apartment_info ai ON ai.id = t.entity_id
        WHERE ai.apartment_id = ? AND t.entity_type = 'apartment_info' AND t.field = 'content'
        GROUP BY t.language_code
    `).bind(aptId).all();

    const byLang = {};
    for (const lang of ACTIVE_LANGUAGES) byLang[lang] = 0;
    for (const r of (rows.results || [])) byLang[r.language_code] = r.c;

    return jsonResponse({ success: true, total: total?.c || 0, by_lang: byLang });
}

// Every language at once for ONE info block — what the edit dialog needs to
// populate all 13 language fields before showing the form. Loading only the
// current tab's language here was the root cause of a data-loss bug: the old
// dialog only ever knew about the language you were viewing, so saving wiped
// out every other language it had never loaded. One cheap query, no join
// needed beyond the ownership check (checkAptAccess already did that).
async function getApartmentInfoTranslations(env, aptId, infoId, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const rows = await env.DB.prepare(
        `SELECT language_code, field, value FROM translations WHERE entity_id = ? AND entity_type = 'apartment_info'`
    ).bind(infoId).all();

    const translations = {};
    for (const r of (rows.results || [])) {
        if (!translations[r.language_code]) translations[r.language_code] = {};
        translations[r.language_code][r.field] = r.value;
    }

    return jsonResponse({ success: true, translations });
}

async function upsertApartmentInfo(env, aptId, data, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    // data: { info_key, icon_name?, order_index?, category_key?, use_custom_title?,
    //         latitude?, longitude?,
    //         translations: { es: { title, content, pickup_instructions }, ... } }
    // category_key drives the catalog (icon/color/translated name) that
    // workerGuide.js resolves for the guest — see migration 0083. icon_name here
    // is only an apartment-specific OVERRIDE of the category's icon; leave it null
    // to inherit. use_custom_title=false (the default) means the title is entirely
    // the category's name and translations.title is ignored/unused for this block.
    // latitude/longitude (migración 0084) son opcionales y genéricos: el punto de
    // recogida de ESTE item concreto (código de entrada, parking...) cuando no
    // coincide con la ubicación del apartamento. pickup_instructions (texto de
    // "dónde encontrarlo") vive en translations, no en columna — mismo EAV que
    // title/content.
    const { info_key, icon_name, order_index, category_key, use_custom_title, latitude, longitude, translations } = data;
    if (!info_key) return errorResponse('info_key is required');

    const infoId = `info_${aptId}_${info_key}`;

    // Upsert the info record
    await env.DB.prepare(`
        INSERT INTO guide_apartment_info (id, apartment_id, info_key, icon_name, order_index, category_key, use_custom_title, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(apartment_id, info_key) DO UPDATE SET
            icon_name = COALESCE(excluded.icon_name, icon_name),
            order_index = excluded.order_index,
            category_key = COALESCE(excluded.category_key, category_key),
            use_custom_title = excluded.use_custom_title,
            latitude = excluded.latitude,
            longitude = excluded.longitude,
            modified_at = CURRENT_TIMESTAMP
    `).bind(infoId, aptId, info_key, icon_name || null, order_index || 0, category_key || null, use_custom_title ? 1 : 0, latitude ?? null, longitude ?? null).run();

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
            if (fields.pickup_instructions !== undefined) {
                statements.push(
                    env.DB.prepare(`
                        INSERT INTO translations (entity_id, entity_type, field, language_code, value)
                        VALUES (?, 'apartment_info', 'pickup_instructions', ?, ?)
                        ON CONFLICT(entity_id, entity_type, field, language_code) DO UPDATE SET value = excluded.value
                    `).bind(infoId, lang, fields.pickup_instructions)
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

    if (access.apt.slug) await touchGuideVersion(env, access.apt.slug);

    return jsonResponse({ success: true, infoId });
}

async function reorderApartmentInfo(env, aptId, data, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;
    if (!data.items || !Array.isArray(data.items)) return errorResponse('items array required');

    const statements = data.items.map(i =>
        env.DB.prepare('UPDATE guide_apartment_info SET order_index = ? WHERE id = ? AND apartment_id = ?')
        .bind(i.order_index, i.id, aptId)
    );
    if (statements.length > 0) await env.DB.batch(statements);

    if (access.apt.slug) await touchGuideVersion(env, access.apt.slug);
    return jsonResponse({ success: true });
}

async function deleteApartmentInfo(env, aptId, infoId, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const media = await env.DB.prepare(
        'SELECT r2_key FROM guide_apartment_media WHERE apartment_info_id = ?'
    ).bind(infoId).all();

    // guide_apartment_media and guide_info_steps cascade via FK ON DELETE CASCADE.
    // translations has no FK (it's a generic EAV table keyed by entity_id/entity_type)
    // so it needs an explicit delete — same pattern as deleteGuideInfoStep below.
    await env.DB.prepare('DELETE FROM guide_apartment_info WHERE id = ? AND apartment_id = ?').bind(infoId, aptId).run();
    await env.DB.prepare('DELETE FROM translations WHERE entity_id = ? AND entity_type = ?').bind(infoId, 'apartment_info').run();

    for (const m of (media.results || [])) {
        await env.R2_BUCKET.delete(m.r2_key).catch(() => {});
    }

    if (access.apt.slug) await touchGuideVersion(env, access.apt.slug);
    return jsonResponse({ success: true });
}

async function addApartmentInfoMedia(env, aptId, infoId, request, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) return errorResponse('file required');

        const ext = file.name.split('.').pop();
        const uuid = generateId('');
        const r2Key = `guide/apartments/${aptId}/info/${infoId}/${uuid}.${ext}`;

        await env.R2_BUCKET.put(r2Key, file.stream(), {
            httpMetadata: { contentType: file.type }
        });

        // Every upload becomes the new cover (order_index 0) — same UX as
        // addPoiMedia's PRIMARY_IMAGE promotion below, adapted to this table's
        // plain order_index (guide_apartment_media has no `role` column).
        await env.DB.prepare(
            'UPDATE guide_apartment_media SET order_index = order_index + 1 WHERE apartment_info_id = ?'
        ).bind(infoId).run();

        const id = generateId('aim');
        const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
        await env.DB.prepare(`
            INSERT INTO guide_apartment_media (id, apartment_info_id, r2_key, media_type, order_index)
            VALUES (?, ?, ?, ?, 0)
        `).bind(id, infoId, r2Key, mediaType).run();

        if (access.apt.slug) await touchGuideVersion(env, access.apt.slug);

        const origin = new URL(request.url).origin;
        return jsonResponse({ success: true, id, r2_key: r2Key, url: `${origin}/media/${r2Key}`, media_type: mediaType });
    } catch (err) {
        return errorResponse('Upload failed: ' + err.message, 500);
    }
}

async function deleteApartmentInfoMedia(env, aptId, infoId, mediaId, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const media = await env.DB.prepare(
        'SELECT r2_key FROM guide_apartment_media WHERE id = ? AND apartment_info_id = ?'
    ).bind(mediaId, infoId).first();
    if (!media) return errorResponse('Not found', 404);

    await env.R2_BUCKET.delete(media.r2_key);
    await env.DB.prepare('DELETE FROM guide_apartment_media WHERE id = ?').bind(mediaId).run();

    if (access.apt.slug) await touchGuideVersion(env, access.apt.slug);
    return jsonResponse({ success: true });
}

// Bulk-import translations for an apartment's info blocks in one shot — the
// backend half of the "export JSON / paste into an external AI / import JSON"
// manual translation workflow (see CLAUDE.md: no in-app auto-translate yet).
// Body shape mirrors the `translations` field already used by upsertApartmentInfo,
// with one extra level keyed by info_key, so the JSON this apartment's
// GET .../info?lang=es export produces is directly the template to fill in:
//   { "wifi":  { "en": { "title": "...", "content": "..." }, "ja": {...} },
//     "rules": { "en": {...}, ... } }
async function bulkImportApartmentInfoTranslations(env, aptId, data, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return errorResponse('Body must be an object keyed by info_key');
    }

    const existing = await env.DB.prepare(
        'SELECT info_key FROM guide_apartment_info WHERE apartment_id = ?'
    ).bind(aptId).all();
    const validKeys = new Set((existing.results || []).map(r => r.info_key));
    const validLangs = new Set(ACTIVE_LANGUAGES);

    const statements = [];
    const skipped = [];
    let importedFields = 0;

    for (const [infoKey, byLang] of Object.entries(data)) {
        if (!validKeys.has(infoKey)) { skipped.push(`${infoKey}: no existe ese bloque en este apartamento`); continue; }
        if (!byLang || typeof byLang !== 'object') continue;
        const infoId = `info_${aptId}_${infoKey}`;

        for (const [lang, fields] of Object.entries(byLang)) {
            if (!validLangs.has(lang)) { skipped.push(`${infoKey}.${lang}: idioma desconocido`); continue; }
            if (!fields || typeof fields !== 'object') continue;

            for (const field of ['title', 'content']) {
                const value = fields[field];
                // Reject blanks rather than store them — a half-formed paste
                // must not silently wipe an existing translation (this is the
                // same failure mode as the admin dialog bug being fixed
                // alongside this: never overwrite good data with empty).
                if (typeof value !== 'string' || value.trim() === '') continue;
                statements.push(
                    env.DB.prepare(`
                        INSERT INTO translations (entity_id, entity_type, field, language_code, value)
                        VALUES (?, 'apartment_info', ?, ?, ?)
                        ON CONFLICT(entity_id, entity_type, field, language_code) DO UPDATE SET value = excluded.value
                    `).bind(infoId, field, lang, value.trim())
                );
                importedFields++;
            }
        }
    }

    if (statements.length > 0) await env.DB.batch(statements);
    if (access.apt.slug) await touchGuideVersion(env, access.apt.slug);

    return jsonResponse({ success: true, imported_fields: importedFields, skipped });
}

// Global catalog of info categories (icon/color/translated name) — see migration
// 0083. Read-only for every authenticated admin user (agency or superadmin): it's
// platform-wide reference data, same access level as `zones`. name/hint fall back
// to 'es' when the requested language is missing — 'hint' in particular is only
// ever seeded in 'es' on purpose (it's a host-facing tooltip, not guest content;
// see the migration's header comment for why translating it to all 13 wasn't worth it).
async function listInfoCategories(env, lang) {
    const l = lang || 'es';
    const cats = await env.DB.prepare(`
        SELECT c.key, c.group_key, c.icon_name, c.color, c.image_r2_key, c.order_index,
               COALESCE(t_name.value, t_name_es.value) AS name,
               COALESCE(t_hint.value, t_hint_es.value) AS hint
        FROM guide_info_categories c
        LEFT JOIN translations t_name ON c.key = t_name.entity_id
            AND t_name.entity_type = 'info_category' AND t_name.field = 'name' AND t_name.language_code = ?
        LEFT JOIN translations t_name_es ON c.key = t_name_es.entity_id
            AND t_name_es.entity_type = 'info_category' AND t_name_es.field = 'name' AND t_name_es.language_code = 'es'
        LEFT JOIN translations t_hint ON c.key = t_hint.entity_id
            AND t_hint.entity_type = 'info_category' AND t_hint.field = 'hint' AND t_hint.language_code = ?
        LEFT JOIN translations t_hint_es ON c.key = t_hint_es.entity_id
            AND t_hint_es.entity_type = 'info_category' AND t_hint_es.field = 'hint' AND t_hint_es.language_code = 'es'
        WHERE c.is_active = TRUE
        ORDER BY c.order_index ASC
    `).bind(l, l).all();

    return jsonResponse({ success: true, categories: cats.results || [] });
}

// ============================================
// PHONES (per-apartment checklist — migración 0084)
// ============================================
// Catálogo aparte de guide_info_categories: un teléfono necesita número +
// "la agencia siempre primera", que no encaja en el modelo de bloque de texto
// libre de apartment_info. Ver cabecera de la migración 0084.

async function listApartmentPhones(env, aptId, lang, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const l = lang || 'es';
    const rows = await env.DB.prepare(`
        SELECT
            p.id, p.category_key, p.phone_number, p.label, p.order_index,
            pc.icon_name AS category_icon_name,
            COALESCE(t_name.value, t_name_es.value) AS category_name
        FROM guide_apartment_phones p
        JOIN guide_phone_categories pc ON p.category_key = pc.key
        LEFT JOIN translations t_name ON pc.key = t_name.entity_id
            AND t_name.entity_type = 'phone_category' AND t_name.field = 'name' AND t_name.language_code = ?
        LEFT JOIN translations t_name_es ON pc.key = t_name_es.entity_id
            AND t_name_es.entity_type = 'phone_category' AND t_name_es.field = 'name' AND t_name_es.language_code = 'es'
        WHERE p.apartment_id = ?
        ORDER BY pc.order_index ASC, p.order_index ASC
    `).bind(l, l, aptId).all();

    return jsonResponse({ success: true, phones: rows.results || [] });
}

// Un solo endpoint para crear y editar (como upsertApartmentInfo): con `id` en
// el body actualiza esa fila (verificando que sea de este apartamento), sin
// `id` crea una nueva. 'custom' es la única categoría pensada para tener más
// de una fila por apartamento, pero no se fuerza a nivel de base de datos —
// el checklist del admin es quien impide duplicar agency/police/etc.
async function upsertApartmentPhone(env, aptId, data, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const { id, category_key, phone_number, label, order_index } = data;
    if (!category_key) return errorResponse('category_key is required');
    if (!phone_number) return errorResponse('phone_number is required');

    const category = await env.DB.prepare(
        'SELECT key FROM guide_phone_categories WHERE key = ? AND is_active = TRUE'
    ).bind(category_key).first();
    if (!category) return errorResponse('Unknown phone category');

    let phoneId = id;
    if (id) {
        const existing = await env.DB.prepare(
            'SELECT id FROM guide_apartment_phones WHERE id = ? AND apartment_id = ?'
        ).bind(id, aptId).first();
        if (!existing) return errorResponse('Phone entry not found', 404);

        await env.DB.prepare(`
            UPDATE guide_apartment_phones
            SET category_key = ?, phone_number = ?, label = ?, order_index = ?, modified_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).bind(category_key, phone_number, label || null, order_index || 0, id).run();
    } else {
        phoneId = generateId('phone');
        await env.DB.prepare(`
            INSERT INTO guide_apartment_phones (id, apartment_id, category_key, phone_number, label, order_index)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(phoneId, aptId, category_key, phone_number, label || null, order_index || 0).run();
    }

    if (access.apt.slug) await touchGuideVersion(env, access.apt.slug);
    return jsonResponse({ success: true, id: phoneId });
}

async function deleteApartmentPhone(env, aptId, phoneId, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    await env.DB.prepare(
        'DELETE FROM guide_apartment_phones WHERE id = ? AND apartment_id = ?'
    ).bind(phoneId, aptId).run();

    if (access.apt.slug) await touchGuideVersion(env, access.apt.slug);
    return jsonResponse({ success: true });
}

// Catálogo global, solo lectura para agencias — mismo nivel de acceso que
// info-categories/zones.
async function listPhoneCategories(env, lang) {
    const l = lang || 'es';
    const cats = await env.DB.prepare(`
        SELECT c.key, c.icon_name, c.order_index,
               COALESCE(t_name.value, t_name_es.value) AS name
        FROM guide_phone_categories c
        LEFT JOIN translations t_name ON c.key = t_name.entity_id
            AND t_name.entity_type = 'phone_category' AND t_name.field = 'name' AND t_name.language_code = ?
        LEFT JOIN translations t_name_es ON c.key = t_name_es.entity_id
            AND t_name_es.entity_type = 'phone_category' AND t_name_es.field = 'name' AND t_name_es.language_code = 'es'
        WHERE c.is_active = TRUE
        ORDER BY c.order_index ASC
    `).bind(l, l).all();

    return jsonResponse({ success: true, categories: cats.results || [] });
}

// ============================================
// WELCOME MODAL (per-apartment greeting popup)
// ============================================
async function getWelcomeModal(env, aptId, isSuperAdmin, userAgencyIds) {
    const apt = await env.DB.prepare('SELECT agency_id FROM guide_apartments WHERE id = ?').bind(aptId).first();
    if (!apt) return errorResponse('Apartment not found', 404);
    if (!isSuperAdmin && !userAgencyIds.includes(apt.agency_id)) return errorResponse('Forbidden', 403);

    const modal = await env.DB.prepare('SELECT * FROM guide_welcome_modals WHERE apartment_id = ?').bind(aptId).first();
    if (!modal) return jsonResponse({ success: true, welcome: null });

    const translations = await env.DB.prepare(
        `SELECT field, language_code, value FROM translations WHERE entity_id = ? AND entity_type = 'welcome_modal'`
    ).bind(modal.id).all();

    const byLang = {};
    for (const t of (translations.results || [])) {
        if (!byLang[t.language_code]) byLang[t.language_code] = {};
        byLang[t.language_code][t.field] = t.value;
    }

    return jsonResponse({ success: true, welcome: { ...modal, translations: byLang } });
}

async function upsertWelcomeModal(env, aptId, data, isSuperAdmin, userAgencyIds) {
    const apt = await env.DB.prepare('SELECT agency_id, slug FROM guide_apartments WHERE id = ?').bind(aptId).first();
    if (!apt) return errorResponse('Apartment not found', 404);
    if (!isSuperAdmin && !userAgencyIds.includes(apt.agency_id)) return errorResponse('Forbidden', 403);

    const existing = await env.DB.prepare('SELECT id FROM guide_welcome_modals WHERE apartment_id = ?').bind(aptId).first();
    const id = existing?.id || generateId('welcome');

    await env.DB.prepare(`
        INSERT INTO guide_welcome_modals (id, apartment_id, is_active, image_url, action_enabled, action_type, action_data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(apartment_id) DO UPDATE SET
            is_active = excluded.is_active,
            image_url = excluded.image_url,
            action_enabled = excluded.action_enabled,
            action_type = excluded.action_type,
            action_data = excluded.action_data,
            modified_at = CURRENT_TIMESTAMP
    `).bind(
        id, aptId,
        data.is_active ? 1 : 0,
        data.image_url || null,
        data.action_enabled ? 1 : 0,
        data.action_type || null,
        data.action_data || null
    ).run();

    if (data.translations && typeof data.translations === 'object') {
        await saveTranslations(env, id, 'welcome_modal', data.translations);
    }

    if (apt.slug) await touchGuideVersion(env, apt.slug);

    return jsonResponse({ success: true, id });
}

// ============================================
// STORE ITEMS
// ============================================
// owner_type='host'     -> agency-writable, scoped a un apartamento (checkAptAccess).
// owner_type='platform' -> superadmin-only, catálogo global visible en TODAS las guías.
// Ver migrations/0080_guide_store.sql para el porqué de una tabla propia en vez de
// reutilizar guide_pois.

const STORE_ITEM_WRITABLE_FIELDS = [
    'category', 'icon_name', 'price_amount', 'price_currency', 'price_display',
    'cover_image_url', 'contact_whatsapp', 'order_index', 'stock_qty'
];

// El listado usa SELECT * (sin traducciones) porque son varias filas por idioma;
// se cargan aparte y se agrupan por item para no hacer un JOIN por idioma. Añade
// `translations: {lang: {name, description}}` y, para pintar listas sin abrir el
// diálogo de edición, una `name`/`description` de conveniencia (ES, con fallback
// a la primera que haya).
async function attachStoreItemTranslations(env, items) {
    if (!items || items.length === 0) return items;
    const ids = items.map(i => i.id);
    const placeholders = ids.map(() => '?').join(',');
    const rows = await env.DB.prepare(
        `SELECT entity_id, field, language_code, value FROM translations
         WHERE entity_type = 'store_item' AND entity_id IN (${placeholders})`
    ).bind(...ids).all();

    const byItem = {};
    for (const row of (rows.results || [])) {
        (byItem[row.entity_id] ??= {});
        (byItem[row.entity_id][row.language_code] ??= {});
        byItem[row.entity_id][row.language_code][row.field] = row.value;
    }
    for (const item of items) {
        const translations = byItem[item.id] || {};
        item.translations = translations;
        const firstWithName = Object.values(translations).find(t => t.name);
        item.name = translations.es?.name || firstWithName?.name || item.id;
        item.description = translations.es?.description || firstWithName?.description || '';
    }
    return items;
}

async function listApartmentStoreItems(env, aptId, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const result = await env.DB.prepare(
        'SELECT * FROM guide_store_items WHERE apartment_id = ? ORDER BY order_index ASC'
    ).bind(aptId).all();
    const items = result.results || [];
    await attachStoreItemTranslations(env, items);
    return jsonResponse({ success: true, items });
}

async function createApartmentStoreItem(env, aptId, data, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;
    if (!data.category) return errorResponse('category is required');

    const id = generateId('sitem');
    await env.DB.prepare(`
        INSERT INTO guide_store_items
            (id, owner_type, apartment_id, agency_id, category, icon_name,
             price_amount, price_currency, price_display, cover_image_url,
             contact_whatsapp, is_featured, is_active, order_index, stock_unlimited, stock_qty)
        VALUES (?, 'host', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        id, aptId, access.apt.agency_id, data.category, data.icon_name || null,
        data.price_amount ?? null, data.price_currency || 'EUR', data.price_display || null, data.cover_image_url || null,
        data.contact_whatsapp || null, data.is_featured ? 1 : 0, data.is_active === false ? 0 : 1,
        data.order_index ?? 0, data.stock_unlimited === false ? 0 : 1, data.stock_qty ?? null
    ).run();

    if (data.translations && typeof data.translations === 'object') {
        await saveTranslations(env, id, 'store_item', data.translations);
    }
    if (access.apt.slug) await touchGuideVersion(env, access.apt.slug);
    return jsonResponse({ success: true, id });
}

async function updateApartmentStoreItem(env, aptId, itemId, data, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const item = await env.DB.prepare(
        'SELECT id FROM guide_store_items WHERE id = ? AND apartment_id = ?'
    ).bind(itemId, aptId).first();
    if (!item) return errorResponse('Store item not found', 404);

    const sets = [];
    const vals = [];
    for (const field of STORE_ITEM_WRITABLE_FIELDS) {
        if (data[field] !== undefined) { sets.push(`${field} = ?`); vals.push(data[field]); }
    }
    if (data.is_featured !== undefined) { sets.push('is_featured = ?'); vals.push(data.is_featured ? 1 : 0); }
    if (data.is_active !== undefined) { sets.push('is_active = ?'); vals.push(data.is_active ? 1 : 0); }
    if (data.stock_unlimited !== undefined) { sets.push('stock_unlimited = ?'); vals.push(data.stock_unlimited ? 1 : 0); }
    if (sets.length > 0) {
        sets.push('modified_at = CURRENT_TIMESTAMP');
        vals.push(itemId);
        await env.DB.prepare(`UPDATE guide_store_items SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    }

    if (data.translations && typeof data.translations === 'object') {
        await saveTranslations(env, itemId, 'store_item', data.translations);
    }
    if (access.apt.slug) await touchGuideVersion(env, access.apt.slug);
    return jsonResponse({ success: true });
}

async function deleteApartmentStoreItem(env, aptId, itemId, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    await env.DB.prepare(
        'UPDATE guide_store_items SET is_active = FALSE WHERE id = ? AND apartment_id = ?'
    ).bind(itemId, aptId).run();
    if (access.apt.slug) await touchGuideVersion(env, access.apt.slug);
    return jsonResponse({ success: true });
}

async function reorderApartmentStoreItems(env, aptId, data, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const order = Array.isArray(data.order) ? data.order : [];
    const statements = order.map((itemId, idx) =>
        env.DB.prepare('UPDATE guide_store_items SET order_index = ? WHERE id = ? AND apartment_id = ?').bind(idx, itemId, aptId)
    );
    if (statements.length > 0) await env.DB.batch(statements);
    if (access.apt.slug) await touchGuideVersion(env, access.apt.slug);
    return jsonResponse({ success: true });
}

// ---- Catálogo platform (superadmin only, global) ----
// A diferencia del resto (apartamento/zona), un item de plataforma es visible en
// TODAS las guías a la vez, así que una escritura aquí bumpea la versión de TODOS
// los apartamentos activos (touchAllGuideVersions) — es una ruta admin-only y rara,
// así que el coste extra de KV writes es asumible a cambio de que el catálogo
// nuevo se vea al instante en vez de depender del TTL de 24h.
async function listPlatformStoreItems(env) {
    const result = await env.DB.prepare(
        `SELECT * FROM guide_store_items WHERE owner_type = 'platform' ORDER BY order_index ASC`
    ).all();
    const items = result.results || [];
    await attachStoreItemTranslations(env, items);
    return jsonResponse({ success: true, items });
}

async function createPlatformStoreItem(env, data) {
    if (!data.category) return errorResponse('category is required');
    const id = generateId('sitem');
    await env.DB.prepare(`
        INSERT INTO guide_store_items
            (id, owner_type, apartment_id, agency_id, category, icon_name,
             price_amount, price_currency, price_display, cover_image_url,
             contact_whatsapp, is_featured, is_active, order_index, stock_unlimited, stock_qty)
        VALUES (?, 'platform', NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        id, data.category, data.icon_name || null,
        data.price_amount ?? null, data.price_currency || 'EUR', data.price_display || null, data.cover_image_url || null,
        data.contact_whatsapp || null, data.is_featured ? 1 : 0, data.is_active === false ? 0 : 1,
        data.order_index ?? 0, data.stock_unlimited === false ? 0 : 1, data.stock_qty ?? null
    ).run();
    if (data.translations && typeof data.translations === 'object') {
        await saveTranslations(env, id, 'store_item', data.translations);
    }
    await touchAllGuideVersions(env);
    return jsonResponse({ success: true, id });
}

async function updatePlatformStoreItem(env, id, data) {
    const item = await env.DB.prepare(
        `SELECT id FROM guide_store_items WHERE id = ? AND owner_type = 'platform'`
    ).bind(id).first();
    if (!item) return errorResponse('Store item not found', 404);

    const sets = [];
    const vals = [];
    for (const field of STORE_ITEM_WRITABLE_FIELDS) {
        if (data[field] !== undefined) { sets.push(`${field} = ?`); vals.push(data[field]); }
    }
    if (data.is_featured !== undefined) { sets.push('is_featured = ?'); vals.push(data.is_featured ? 1 : 0); }
    if (data.is_active !== undefined) { sets.push('is_active = ?'); vals.push(data.is_active ? 1 : 0); }
    if (data.stock_unlimited !== undefined) { sets.push('stock_unlimited = ?'); vals.push(data.stock_unlimited ? 1 : 0); }
    if (sets.length > 0) {
        sets.push('modified_at = CURRENT_TIMESTAMP');
        vals.push(id);
        await env.DB.prepare(`UPDATE guide_store_items SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    }
    if (data.translations && typeof data.translations === 'object') {
        await saveTranslations(env, id, 'store_item', data.translations);
    }
    await touchAllGuideVersions(env);
    return jsonResponse({ success: true });
}

async function deletePlatformStoreItem(env, id) {
    await env.DB.prepare(
        `UPDATE guide_store_items SET is_active = FALSE WHERE id = ? AND owner_type = 'platform'`
    ).bind(id).run();
    await touchAllGuideVersions(env);
    return jsonResponse({ success: true });
}

// ============================================
// STORE ORDERS
// ============================================
async function listApartmentOrders(env, aptId, params, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const status = params.get('status');
    const days = Math.min(parseInt(params.get('days') || '90', 10) || 90, 365);

    let query = `
        SELECT * FROM guide_store_orders
        WHERE apartment_id = ? AND created_at >= datetime('now', ?)
    `;
    const vals = [aptId, `-${days} days`];
    if (status) { query += ' AND status = ?'; vals.push(status); }
    query += ' ORDER BY created_at DESC LIMIT 200';

    const orders = await env.DB.prepare(query).bind(...vals).all();
    const orderIds = (orders.results || []).map(o => o.id);
    const itemsByOrder = {};
    if (orderIds.length > 0) {
        const placeholders = orderIds.map(() => '?').join(',');
        const items = await env.DB.prepare(
            `SELECT * FROM guide_store_order_items WHERE order_id IN (${placeholders})`
        ).bind(...orderIds).all();
        for (const it of (items.results || [])) {
            if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
            itemsByOrder[it.order_id].push(it);
        }
    }

    return jsonResponse({
        success: true,
        orders: (orders.results || []).map(o => ({ ...o, items: itemsByOrder[o.id] || [] }))
    });
}

async function updateStoreOrderStatus(env, orderId, data, isSuperAdmin, userAgencyIds) {
    const validStatuses = ['requested', 'contacted', 'completed', 'cancelled'];
    if (!validStatuses.includes(data.status)) return errorResponse('Invalid status');

    const order = await env.DB.prepare(`
        SELECT o.id, a.agency_id FROM guide_store_orders o
        JOIN guide_apartments a ON o.apartment_id = a.id
        WHERE o.id = ?
    `).bind(orderId).first();
    if (!order) return errorResponse('Order not found', 404);
    if (!isSuperAdmin && !userAgencyIds.includes(order.agency_id)) return errorResponse('Forbidden', 403);

    await env.DB.prepare(
        'UPDATE guide_store_orders SET status = ?, modified_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(data.status, orderId).run();
    return jsonResponse({ success: true });
}

async function getStoreStats(env, aptId, params, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const days = Math.min(parseInt(params.get('days') || '30', 10) || 30, 365);

    const byItem = await env.DB.prepare(`
        SELECT oi.item_id, oi.item_name_es, COUNT(DISTINCT oi.order_id) AS order_count, SUM(oi.quantity) AS total_qty
        FROM guide_store_order_items oi
        JOIN guide_store_orders o ON oi.order_id = o.id
        WHERE o.apartment_id = ? AND o.created_at >= datetime('now', ?)
        GROUP BY oi.item_id, oi.item_name_es
        ORDER BY order_count DESC
    `).bind(aptId, `-${days} days`).all();

    const byStatus = await env.DB.prepare(`
        SELECT status, COUNT(*) AS count FROM guide_store_orders
        WHERE apartment_id = ? AND created_at >= datetime('now', ?)
        GROUP BY status
    `).bind(aptId, `-${days} days`).all();

    return jsonResponse({ success: true, byItem: byItem.results || [], byStatus: byStatus.results || [] });
}

// ============================================
// ZONES (superadmin only)
// ============================================
async function listZones(env) {
    const result = await env.DB.prepare(`
        SELECT z.*, 
            (SELECT COUNT(*) FROM guide_apartments WHERE zone_id = z.id AND is_active = TRUE) as apartment_count,
            (SELECT COUNT(*) FROM guide_pois WHERE zone_id = z.id AND is_active = TRUE AND (is_bookable = 0 OR is_bookable IS NULL)) as poi_count,
            (SELECT COUNT(*) FROM guide_pois WHERE zone_id = z.id AND is_active = TRUE AND is_bookable = 1) as experience_count
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
    await touchZoneGuideVersions(env, id);
    return jsonResponse({ success: true });
}

// ============================================
// POIs (superadmin only)
// ============================================
async function listPOIs(env, zoneId) {
    let query = `SELECT p.*, t_name.value AS name_es, t_name_en.value AS name_en, t_desc.value AS description_es, t_desc_en.value AS description_en,
            t_tip.value AS short_tip_es, t_tip_en.value AS short_tip_en
        FROM guide_pois p
        LEFT JOIN translations t_name ON p.id = t_name.entity_id
            AND t_name.entity_type = 'poi' AND t_name.field = 'name' AND t_name.language_code = 'es'
        LEFT JOIN translations t_name_en ON p.id = t_name_en.entity_id
            AND t_name_en.entity_type = 'poi' AND t_name_en.field = 'name' AND t_name_en.language_code = 'en'
        LEFT JOIN translations t_desc ON p.id = t_desc.entity_id
            AND t_desc.entity_type = 'poi' AND t_desc.field = 'description' AND t_desc.language_code = 'es'
        LEFT JOIN translations t_desc_en ON p.id = t_desc_en.entity_id
            AND t_desc_en.entity_type = 'poi' AND t_desc_en.field = 'description' AND t_desc_en.language_code = 'en'
        LEFT JOIN translations t_tip ON p.id = t_tip.entity_id
            AND t_tip.entity_type = 'poi' AND t_tip.field = 'short_tip' AND t_tip.language_code = 'es'
        LEFT JOIN translations t_tip_en ON p.id = t_tip_en.entity_id
            AND t_tip_en.entity_type = 'poi' AND t_tip_en.field = 'short_tip' AND t_tip_en.language_code = 'en'
        WHERE p.is_active = TRUE AND (p.is_bookable = 0 OR p.is_bookable IS NULL)`;
    const params = [];
    if (zoneId) { query += ' AND p.zone_id = ?'; params.push(zoneId); }
    query += ' ORDER BY p.order_index ASC';
    const result = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse({ success: true, pois: result.results || [] });
}

// Columns on the unified guide_pois table that admins may set directly.
// Kept in one place so createPOI / updatePOI / experiences stay in sync.
const POI_WRITABLE_FIELDS = [
    'category', 'subcategory', 'poi_type', 'access_type',
    'latitude', 'longitude', 'address', 'google_maps_url', 'google_place_id', 'what3words',
    'rating', 'rating_count', 'google_rating', 'google_rating_count',
    'opening_hours', 'phone', 'website_url', 'booking_url', 'duration_text',
    'price_amount', 'price_currency', 'price_display', 'original_price_display', 'discount_display',
    'action_type', 'action_data', 'action_prefilled_message',
    'commission_type', 'commission_value', 'badge_type',
    'cover_image_url', 'source', 'external_id', 'order_index', 'google_synced_at'
];

function collectPoiTranslations(data, fields) {
    const translations = {};
    for (const lang of ['es', 'en']) {
        const t = {};
        for (const f of fields) {
            if (data[`${f}_${lang}`]) t[f] = data[`${f}_${lang}`];
        }
        if (Object.keys(t).length > 0) translations[lang] = t;
    }
    return translations;
}

async function createPOI(env, data) {
    if (!data.zone_id || !data.category) return errorResponse('zone_id and category are required');
    const id = generateId('poi');

    const cols = ['id', 'zone_id'];
    const vals = [id, data.zone_id];
    for (const field of POI_WRITABLE_FIELDS) {
        if (data[field] !== undefined) { cols.push(field); vals.push(data[field]); }
    }
    for (const boolField of ['is_bookable', 'is_featured']) {
        if (data[boolField] !== undefined) { cols.push(boolField); vals.push(data[boolField] ? 1 : 0); }
    }
    const placeholders = cols.map(() => '?').join(', ');
    await env.DB.prepare(
        `INSERT INTO guide_pois (${cols.join(', ')}) VALUES (${placeholders})`
    ).bind(...vals).run();

    const translations = collectPoiTranslations(data, ['name', 'description', 'short_tip', 'cta_label']);
    if (Object.keys(translations).length > 0) {
        await saveTranslations(env, id, 'poi', translations);
    } else if (data.translations) {
        await saveTranslations(env, id, 'poi', data.translations);
    }
    await touchZoneGuideVersions(env, data.zone_id);
    return jsonResponse({ success: true, id });
}

async function updatePOI(env, id, data) {
    const sets = [];
    const vals = [];
    for (const field of POI_WRITABLE_FIELDS) {
        if (data[field] !== undefined) { sets.push(`${field} = ?`); vals.push(data[field]); }
    }
    for (const boolField of ['is_bookable', 'is_featured', 'is_active']) {
        if (data[boolField] !== undefined) { sets.push(`${boolField} = ?`); vals.push(data[boolField] ? 1 : 0); }
    }
    if (sets.length > 0) {
        sets.push('modified_at = CURRENT_TIMESTAMP');
        vals.push(id);
        await env.DB.prepare(`UPDATE guide_pois SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    }
    const translations = collectPoiTranslations(data, ['name', 'description', 'short_tip', 'cta_label']);
    if (Object.keys(translations).length > 0) {
        await saveTranslations(env, id, 'poi', translations);
    } else if (data.translations) {
        await saveTranslations(env, id, 'poi', data.translations);
    }
    // zone_id is immutable via POI_WRITABLE_FIELDS, so a post-update lookup is fine.
    const poi = await env.DB.prepare('SELECT zone_id FROM guide_pois WHERE id = ?').bind(id).first();
    await touchZoneGuideVersions(env, poi?.zone_id);
    return jsonResponse({ success: true });
}

// ============================================
// EXPERIENCES (superadmin only)
// ============================================
async function listExperiences(env, zoneId, isSuperAdmin) {
    // Experiences are the bookable slice of the unified guide_pois table.
    // service_subcategory is aliased from subcategory to keep the admin API shape.
    let query = `SELECT e.*, e.subcategory AS service_subcategory, t_name.value AS name_es, t_name_en.value AS name_en,
            t_desc.value AS description_es, t_desc_en.value AS description_en,
            t_cta.value AS cta_label_es, t_cta_en.value AS cta_label_en
        FROM guide_pois e
        LEFT JOIN translations t_name ON e.id = t_name.entity_id
            AND t_name.entity_type = 'poi' AND t_name.field = 'name' AND t_name.language_code = 'es'
        LEFT JOIN translations t_name_en ON e.id = t_name_en.entity_id
            AND t_name_en.entity_type = 'poi' AND t_name_en.field = 'name' AND t_name_en.language_code = 'en'
        LEFT JOIN translations t_desc ON e.id = t_desc.entity_id
            AND t_desc.entity_type = 'poi' AND t_desc.field = 'description' AND t_desc.language_code = 'es'
        LEFT JOIN translations t_desc_en ON e.id = t_desc_en.entity_id
            AND t_desc_en.entity_type = 'poi' AND t_desc_en.field = 'description' AND t_desc_en.language_code = 'en'
        LEFT JOIN translations t_cta ON e.id = t_cta.entity_id
            AND t_cta.entity_type = 'poi' AND t_cta.field = 'cta_label' AND t_cta.language_code = 'es'
        LEFT JOIN translations t_cta_en ON e.id = t_cta_en.entity_id
            AND t_cta_en.entity_type = 'poi' AND t_cta_en.field = 'cta_label' AND t_cta_en.language_code = 'en'
        WHERE e.is_bookable = TRUE`;
    const params = [];
    // Superadmin manages the full catalog and needs to see inactive experiences too
    // (otherwise there's no way to re-activate one once toggled off). Agency users only
    // ever see the live, active catalog.
    if (!isSuperAdmin) query += ' AND e.is_active = TRUE';
    if (zoneId) { query += ' AND e.zone_id = ?'; params.push(zoneId); }
    query += ' ORDER BY e.is_featured DESC, e.order_index ASC';
    const result = await env.DB.prepare(query).bind(...params).all();
    let experiences = result.results || [];

    // Commissions and internal action config are superadmin-only business data —
    // agency staff can see which promotions are active, not how they're wired or paid.
    if (!isSuperAdmin) {
        experiences = experiences.map(({ commission_type, commission_value, action_data, action_prefilled_message, ...rest }) => rest);
    }

    return jsonResponse({ success: true, experiences });
}

// Experiences are stored in guide_pois as bookable rows (is_bookable = 1).
// The admin sends `service_subcategory`; we normalize it to the `subcategory` column.
function normalizeExperienceData(data) {
    const d = { ...data };
    if (d.service_subcategory !== undefined && d.subcategory === undefined) {
        d.subcategory = d.service_subcategory;
    }
    return d;
}

async function createExperience(env, data) {
    if (!data.zone_id || !data.category || !data.action_type || !data.action_data) {
        return errorResponse('zone_id, category, action_type, and action_data are required');
    }
    const d = normalizeExperienceData(data);
    const id = generateId('exp');

    const cols = ['id', 'zone_id', 'is_bookable', 'poi_type', 'access_type'];
    const vals = [id, d.zone_id, 1, d.poi_type || 'experience', d.access_type || 'paid'];
    for (const field of POI_WRITABLE_FIELDS) {
        if (d[field] !== undefined) { cols.push(field); vals.push(d[field]); }
    }
    if (d.is_featured !== undefined) { cols.push('is_featured'); vals.push(d.is_featured ? 1 : 0); }
    // commission defaults preserved from the old experiences handler
    if (d.commission_type === undefined) { cols.push('commission_type'); vals.push('none'); }
    const placeholders = cols.map(() => '?').join(', ');
    await env.DB.prepare(
        `INSERT INTO guide_pois (${cols.join(', ')}) VALUES (${placeholders})`
    ).bind(...vals).run();

    const translations = collectPoiTranslations(d, ['name', 'description', 'short_tip', 'cta_label']);
    if (Object.keys(translations).length > 0) {
        await saveTranslations(env, id, 'poi', translations);
    } else if (d.translations) {
        await saveTranslations(env, id, 'poi', d.translations);
    }
    await touchZoneGuideVersions(env, d.zone_id);
    return jsonResponse({ success: true, id });
}

async function updateExperience(env, id, data) {
    const d = normalizeExperienceData(data);
    const sets = [];
    const vals = [];
    for (const field of POI_WRITABLE_FIELDS) {
        if (d[field] !== undefined) { sets.push(`${field} = ?`); vals.push(d[field]); }
    }
    for (const boolField of ['is_featured', 'is_active', 'is_bookable']) {
        if (d[boolField] !== undefined) { sets.push(`${boolField} = ?`); vals.push(d[boolField] ? 1 : 0); }
    }
    if (sets.length > 0) {
        sets.push('modified_at = CURRENT_TIMESTAMP');
        vals.push(id);
        await env.DB.prepare(`UPDATE guide_pois SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    }
    const translations = collectPoiTranslations(d, ['name', 'description', 'short_tip', 'cta_label']);
    if (Object.keys(translations).length > 0) {
        await saveTranslations(env, id, 'poi', translations);
    } else if (d.translations) {
        await saveTranslations(env, id, 'poi', d.translations);
    }
    // zone_id is immutable via POI_WRITABLE_FIELDS, so a post-update lookup is fine.
    const exp = await env.DB.prepare('SELECT zone_id FROM guide_pois WHERE id = ?').bind(id).first();
    await touchZoneGuideVersions(env, exp?.zone_id);
    return jsonResponse({ success: true });
}

async function deleteExperience(env, id) {
    const exp = await env.DB.prepare('SELECT zone_id FROM guide_pois WHERE id = ?').bind(id).first();
    await env.DB.prepare('UPDATE guide_pois SET is_active = FALSE WHERE id = ?').bind(id).run();
    await touchZoneGuideVersions(env, exp?.zone_id);
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
    await touchZoneGuideVersions(env, data.zone_id);
    return jsonResponse({ success: true });
}

async function unlinkZoneRestaurant(env, data) {
    if (!data.zone_id || !data.restaurant_id) return errorResponse('zone_id and restaurant_id required');
    await env.DB.prepare(
        'UPDATE guide_zone_restaurants SET is_active = FALSE WHERE zone_id = ? AND restaurant_id = ?'
    ).bind(data.zone_id, data.restaurant_id).run();
    await touchZoneGuideVersions(env, data.zone_id);
    return jsonResponse({ success: true });
}

async function searchRestaurants(env, q) {
    const term = q.trim();
    if (!term) return jsonResponse({ success: true, restaurants: [] });
    // También compara ignorando espacios: si no, buscar "wawcafe" no encuentra
    // "Waw Cafe" porque la subcadena literal nunca aparece en el nombre.
    const noSpaces = term.replace(/\s+/g, '');
    const result = await env.DB.prepare(
        `SELECT id, name, slug FROM restaurants WHERE is_active = 1 AND (name LIKE ? OR REPLACE(name, ' ', '') LIKE ?) ORDER BY name LIMIT 20`
    ).bind(`%${term}%`, `%${noSpaces}%`).all();
    return jsonResponse({ success: true, restaurants: result.results || [] });
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
        // Sesiones de guía + visitantes únicos + duración media.
        // OJO: esto NO son escaneos de QR (se exponía como `qr_scans`, que hacía leer
        // "150 escaneos" cuando eran ~40 huéspedes). Son aperturas de la guía.
        env.DB.prepare(`
            SELECT COUNT(*) as total_sessions,
                   COUNT(DISTINCT COALESCE(visitor_id, device_fingerprint, id)) as unique_visitors,
                   AVG(COALESCE(duration_seconds, 0)) as avg_duration
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
            guide_sessions: scanStats?.total_sessions || 0,
            unique_visitors: scanStats?.unique_visitors || 0,
            // Alias conservado para no romper el dashboard existente mientras se
            // actualiza la UI; usa `guide_sessions`, que es lo que realmente mide.
            qr_scans: scanStats?.total_sessions || 0,
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

// ============================================
// APARTMENT STATS
// ============================================
async function getApartmentStats(env, aptId, params, isSuperAdmin, userAgencyIds) {
    // Verify access
    const apt = await env.DB.prepare('SELECT agency_id FROM guide_apartments WHERE id = ?').bind(aptId).first();
    if (!apt) return errorResponse('Apartment not found', 404);
    if (!isSuperAdmin && !userAgencyIds.includes(apt.agency_id)) return errorResponse('Forbidden', 403);

    const days = parseInt(params.get('days') || '30');
    const fromTs = new Date(Date.now() - days * 86400000).toISOString();

    const [sessionStats, deviceStats, sectionStats, langStats] = await Promise.all([
        // AVG(duration_seconds) ignoraba los NULL. Como el 79% de las sesiones nunca
        // dispararon session/end (móvil que se apaga, app cerrada en frío) y son
        // justo las más cortas, la media salía sesgada al alza: 150 s declarados
        // frente a 32 s reales. Ahora las sesiones sin cierre cuentan como 0.
        env.DB.prepare(`
            SELECT COUNT(*) as total_sessions,
                   AVG(COALESCE(duration_seconds, 0)) as avg_duration,
                   SUM(CASE WHEN duration_seconds IS NULL THEN 1 ELSE 0 END) as sessions_without_end,
                   SUM(CASE WHEN visit_count > 1 THEN 1 ELSE 0 END) as returning_sessions
            FROM guide_sessions WHERE apartment_id = ? AND started_at >= ?
        `).bind(aptId, fromTs).first(),

        // Visitantes únicos por visitor_id (UUID estable). device_fingerprint solo
        // como respaldo para las sesiones antiguas que no lo tienen.
        env.DB.prepare(`
            SELECT COUNT(DISTINCT COALESCE(visitor_id, device_fingerprint, id)) as unique_devices
            FROM guide_sessions WHERE apartment_id = ? AND started_at >= ?
        `).bind(aptId, fromTs).first(),

        env.DB.prepare(`
            SELECT section, COUNT(*) as views
            FROM guide_section_views WHERE apartment_id = ? AND created_at >= ?
            GROUP BY section ORDER BY views DESC
        `).bind(aptId, fromTs).all(),

        env.DB.prepare(`
            SELECT language_code as lang, COUNT(*) as count
            FROM guide_sessions WHERE apartment_id = ? AND started_at >= ?
            GROUP BY language_code ORDER BY count DESC
        `).bind(aptId, fromTs).all(),
    ]);

    return jsonResponse({
        success: true,
        stats: {
            total_sessions: sessionStats?.total_sessions || 0,
            avg_duration_seconds: Math.round(sessionStats?.avg_duration || 0),
            unique_devices: deviceStats?.unique_devices || 0,
            // Transparencia sobre la calidad del dato: qué porcentaje de sesiones
            // nunca cerró, que es lo que hace que la media de duración sea un mínimo
            // y no un valor exacto.
            sessions_without_end: sessionStats?.sessions_without_end || 0,
            returning_sessions: sessionStats?.returning_sessions || 0,
            section_views: sectionStats.results || [],
            by_language: langStats.results || [],
        },
        period_days: days
    });
}
// ============================================
// APARTMENT POIS
// ============================================
async function checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds) {
    const apt = await env.DB.prepare('SELECT agency_id, slug FROM guide_apartments WHERE id = ?').bind(aptId).first();
    if (!apt) return { error: errorResponse('Apartment not found', 404) };
    if (!isSuperAdmin && !userAgencyIds.includes(apt.agency_id)) return { error: errorResponse('Forbidden', 403) };
    return { apt };
}

async function listApartmentPois(env, aptId, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const result = await env.DB.prepare(`
        SELECT gap.poi_id, gap.order_override, p.* 
        FROM guide_apartment_pois gap
        JOIN guide_pois p ON gap.poi_id = p.id
        WHERE gap.apartment_id = ?
        ORDER BY gap.order_override ASC
    `).bind(aptId).all();

    return jsonResponse({ success: true, pois: result.results || [] });
}

async function assignApartmentPoi(env, aptId, data, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;
    if (!data.poi_id) return errorResponse('poi_id required');

    await env.DB.prepare(`
        INSERT INTO guide_apartment_pois (apartment_id, poi_id, order_override)
        VALUES (?, ?, ?)
        ON CONFLICT(apartment_id, poi_id) DO UPDATE SET order_override = excluded.order_override
    `).bind(aptId, data.poi_id, data.order_override || 0).run();

    await touchGuideVersion(env, access.apt.slug);
    return jsonResponse({ success: true });
}

async function reorderApartmentPois(env, aptId, data, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;
    if (!data.items || !Array.isArray(data.items)) return errorResponse('items array required');

    const statements = data.items.map(i => 
        env.DB.prepare('UPDATE guide_apartment_pois SET order_override = ? WHERE apartment_id = ? AND poi_id = ?')
        .bind(i.order_override, aptId, i.poi_id)
    );
    if (statements.length > 0) await env.DB.batch(statements);

    await touchGuideVersion(env, access.apt.slug);
    return jsonResponse({ success: true });
}

async function removeApartmentPoi(env, aptId, poiId, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    await env.DB.prepare('DELETE FROM guide_apartment_pois WHERE apartment_id = ? AND poi_id = ?').bind(aptId, poiId).run();
    await touchGuideVersion(env, access.apt.slug);
    return jsonResponse({ success: true });
}

// ============================================
// GUIDE INFO STEPS
// ============================================
async function listGuideInfoSteps(env, aptId, infoId, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const result = await env.DB.prepare('SELECT * FROM guide_info_steps WHERE apartment_info_id = ? ORDER BY step_number ASC').bind(infoId).all();
    return jsonResponse({ success: true, steps: result.results || [] });
}

async function createGuideInfoStep(env, aptId, infoId, data, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const id = generateId('step');
    await env.DB.prepare(`
        INSERT INTO guide_info_steps (id, apartment_info_id, step_number)
        VALUES (?, ?, ?)
    `).bind(id, infoId, data.step_number || 0).run();

    if (data.title_es || data.content_es || data.checklist_items_es) {
        await saveTranslations(env, id, 'guide_step', {
            es: { title: data.title_es, content: data.content_es, checklist_items: data.checklist_items_es },
            en: { title: data.title_en, content: data.content_en, checklist_items: data.checklist_items_en }
        });
    }

    await touchGuideVersion(env, access.apt.slug);
    return jsonResponse({ success: true, id });
}

async function reorderGuideInfoSteps(env, aptId, infoId, data, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;
    if (!data.items || !Array.isArray(data.items)) return errorResponse('items array required');

    const statements = data.items.map(i => 
        env.DB.prepare('UPDATE guide_info_steps SET step_number = ? WHERE id = ? AND apartment_info_id = ?')
        .bind(i.step_number, i.id, infoId)
    );
    if (statements.length > 0) await env.DB.batch(statements);

    await touchGuideVersion(env, access.apt.slug);
    return jsonResponse({ success: true });
}

async function updateGuideInfoStep(env, aptId, infoId, stepId, data, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const sets = [];
    const vals = [];
    if (data.step_number !== undefined) { sets.push('step_number = ?'); vals.push(data.step_number); }
    
    if (sets.length > 0) {
        vals.push(stepId);
        await env.DB.prepare(`UPDATE guide_info_steps SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    }

    if (data.title_es || data.content_es || data.checklist_items_es) {
        await saveTranslations(env, stepId, 'guide_step', {
            es: { title: data.title_es, content: data.content_es, checklist_items: data.checklist_items_es },
            en: { title: data.title_en, content: data.content_en, checklist_items: data.checklist_items_en }
        });
    }

    await touchGuideVersion(env, access.apt.slug);
    return jsonResponse({ success: true });
}

async function deleteGuideInfoStep(env, aptId, infoId, stepId, isSuperAdmin, userAgencyIds) {
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    await env.DB.prepare('DELETE FROM guide_info_steps WHERE id = ?').bind(stepId).run();
    await env.DB.prepare('DELETE FROM translations WHERE entity_id = ? AND entity_type = ?').bind(stepId, 'guide_step').run();

    await touchGuideVersion(env, access.apt.slug);
    return jsonResponse({ success: true });
}

// ============================================
// COMMISSIONS
// ============================================
async function listCommissions(env, agencyId, params) {
    let query = `
        SELECT c.*, a.name as agency_name
        FROM guide_commission_ledger c
        LEFT JOIN guide_agencies a ON c.agency_id = a.id
        WHERE 1=1
    `;
    const qParams = [];
    
    if (agencyId) { query += ' AND c.agency_id = ?'; qParams.push(agencyId); }
    if (params.get('status')) { query += ' AND c.status = ?'; qParams.push(params.get('status')); }
    if (params.get('from')) { query += ' AND c.created_at >= ?'; qParams.push(params.get('from') + 'T00:00:00'); }
    if (params.get('to')) { query += ' AND c.created_at <= ?'; qParams.push(params.get('to') + 'T23:59:59'); }

    query += ' ORDER BY c.created_at DESC';
    const result = await env.DB.prepare(query).bind(...qParams).all();
    return jsonResponse({ success: true, commissions: result.results || [] });
}

async function getCommissionsSummary(env, agencyId) {
    let query = `
        SELECT status, COUNT(*) as count, SUM(amount) as total_amount
        FROM guide_commission_ledger
        WHERE 1=1
    `;
    const params = [];
    if (agencyId) { query += ' AND agency_id = ?'; params.push(agencyId); }
    query += ' GROUP BY status';
    
    const result = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse({ success: true, summary: result.results || [] });
}

async function updateCommission(env, id, data, isSuperAdmin, userAgencyIds) {
    const comm = await env.DB.prepare('SELECT agency_id FROM guide_commission_ledger WHERE id = ?').bind(id).first();
    if (!comm) return errorResponse('Not found', 404);
    if (!isSuperAdmin && !userAgencyIds.includes(comm.agency_id)) return errorResponse('Forbidden', 403);

    const sets = [];
    const vals = [];
    if (data.status) { sets.push('status = ?'); vals.push(data.status); }
    if (data.notes !== undefined) { sets.push('notes = ?'); vals.push(data.notes); }
    
    if (sets.length === 0) return errorResponse('No fields to update');
    vals.push(id);
    await env.DB.prepare(`UPDATE guide_commission_ledger SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    return jsonResponse({ success: true });
}

// ============================================
// ENHANCED STATS
// ============================================
async function getStatsDashboard(env, agencyId, params) {
    const fromTs = params.get('from') ? params.get('from') + 'T00:00:00' : new Date(Date.now() - 30 * 86400000).toISOString();
    const toTs = params.get('to') ? params.get('to') + 'T23:59:59' : new Date().toISOString();

    const apartments = await env.DB.prepare('SELECT id, name FROM guide_apartments WHERE agency_id = ? AND is_active = TRUE').bind(agencyId).all();
    const aptIds = (apartments.results || []).map(a => a.id);
    if (aptIds.length === 0) return jsonResponse({ success: true, dashboard: {} });

    const placeholders = aptIds.map(() => '?').join(',');

    const [sessions, devices, intents, languages, exps, aptActivity] = await Promise.all([
        env.DB.prepare(`SELECT COUNT(*) as c, AVG(duration_seconds) as d, DATE(started_at) as date FROM guide_sessions WHERE apartment_id IN (${placeholders}) AND started_at BETWEEN ? AND ? GROUP BY DATE(started_at)`).bind(...aptIds, fromTs, toTs).all(),
        env.DB.prepare(`SELECT COUNT(DISTINCT COALESCE(visitor_id, device_fingerprint, id)) as c FROM guide_sessions WHERE apartment_id IN (${placeholders}) AND started_at BETWEEN ? AND ?`).bind(...aptIds, fromTs, toTs).first(),
        env.DB.prepare(`SELECT COUNT(*) as c FROM guide_affiliate_intents WHERE agency_id = ? AND created_at BETWEEN ? AND ?`).bind(agencyId, fromTs, toTs).first(),
        env.DB.prepare(`SELECT language_code as code, COUNT(*) as count FROM guide_sessions WHERE apartment_id IN (${placeholders}) AND started_at BETWEEN ? AND ? GROUP BY language_code`).bind(...aptIds, fromTs, toTs).all(),
        env.DB.prepare(`SELECT e.id, COALESCE(t.value, e.category) AS name, COUNT(i.id) as clicks FROM guide_pois e LEFT JOIN translations t ON e.id = t.entity_id AND t.entity_type = 'poi' AND t.field = 'name' AND t.language_code = 'es' JOIN guide_affiliate_intents i ON e.id = i.target_id WHERE i.target_type = 'experience' AND i.agency_id = ? AND i.created_at BETWEEN ? AND ? GROUP BY e.id ORDER BY clicks DESC LIMIT 5`).bind(agencyId, fromTs, toTs).all(),
        env.DB.prepare(`SELECT apartment_id, COUNT(DISTINCT COALESCE(visitor_id, device_fingerprint, id)) as unique_devices_today, MAX(started_at) as last_session_at FROM guide_sessions WHERE apartment_id IN (${placeholders}) AND started_at >= date('now') GROUP BY apartment_id`).bind(...aptIds).all()
    ]);

    const totalSessions = (sessions.results || []).reduce((sum, r) => sum + r.c, 0);
    const avgDuration = (sessions.results || []).reduce((sum, r) => sum + r.d, 0) / (sessions.results?.length || 1);
    const totalIntents = intents?.c || 0;

    return jsonResponse({
        success: true,
        dashboard: {
            total_sessions: totalSessions,
            unique_devices: devices?.c || 0,
            avg_duration_seconds: Math.round(avgDuration),
            total_intents: totalIntents,
            conversion_rate: totalSessions > 0 ? (totalIntents / totalSessions) : 0,
            sessions_by_day: (sessions.results || []).map(r => ({ date: r.date, count: r.c })),
            languages: languages.results || [],
            top_experiences: exps.results || [],
            apartments_activity: (apartments.results || []).map(a => {
                const act = (aptActivity.results || []).find(ac => ac.apartment_id === a.id);
                return { id: a.id, name: a.name, unique_devices_today: act?.unique_devices_today || 0, last_session_at: act?.last_session_at || null };
            })
        }
    });
}

async function getStatsDevices(env, aptId, params, isSuperAdmin, userAgencyIds) {
    if (!aptId) return errorResponse('apartment_id required');
    const access = await checkAptAccess(env, aptId, isSuperAdmin, userAgencyIds);
    if (access.error) return access.error;

    const date = params.get('date') || new Date().toISOString().split('T')[0];
    // FIX: seleccionaba `country_code`, columna que no existe en guide_sessions
    // (la columna real es `country`), así que este endpoint devolvía 500 siempre.
    // Y filtraba por device_fingerprint IS NOT NULL, descartando sesiones válidas.
    const sessions = await env.DB.prepare(`
        SELECT COALESCE(visitor_id, device_fingerprint, id) AS visitor_key,
               started_at, language_code as language, country
        FROM guide_sessions
        WHERE apartment_id = ? AND DATE(started_at) = ?
        ORDER BY started_at DESC
    `).bind(aptId, date).all();

    const uniqueDevices = new Set((sessions.results || []).map(s => s.visitor_key)).size;

    return jsonResponse({
        success: true,
        date,
        unique_devices: uniqueDevices,
        sessions: (sessions.results || []).map(s => ({ started_at: s.started_at, language: s.language, country: s.country }))
    });
}

async function getStatsExperiences(env, zoneId, params) {
    if (!zoneId) return errorResponse('zone_id required');
    const fromTs = params.get('from') ? params.get('from') + 'T00:00:00' : new Date(Date.now() - 30 * 86400000).toISOString();
    const toTs = params.get('to') ? params.get('to') + 'T23:59:59' : new Date().toISOString();

    const exps = await env.DB.prepare(`
        SELECT e.id, COALESCE(t.value, e.category) AS name, e.action_type, COUNT(i.id) as clicks, SUM(i.commission_value) as commission_earned
        FROM guide_pois e
        LEFT JOIN translations t ON e.id = t.entity_id AND t.entity_type = 'poi' AND t.field = 'name' AND t.language_code = 'es'
        LEFT JOIN guide_affiliate_intents i ON e.id = i.target_id AND i.target_type = 'experience' AND i.created_at BETWEEN ? AND ?
        WHERE e.zone_id = ? AND e.is_bookable = 1
        GROUP BY e.id
        ORDER BY clicks DESC
    `).bind(fromTs, toTs, zoneId).all();

    return jsonResponse({ success: true, experiences: exps.results || [] });
}

// ============================================
// GUIDE→RESTAURANT CONVERSION FUNNEL (superadmin only)
// ============================================
// Clic (guide_affiliate_intents) -> aterrizado (sessions.referral_apartment_id
// presente, la sesión de menú supo de dónde venía) -> convertido (además
// sessions.qr_code_id presente: el huésped escaneó de verdad el QR físico de
// mesa del restaurante, workerTracking.js valida ese id contra qr_codes del
// propio restaurante). "Convertido" es la única prueba de visita real que
// existe hoy en el sistema — es la palanca para negociar comisión o
// colocación de pago con un restaurante, así que se guarda solo para
// superadmin: ni la agencia (ve solo clics, vía getAgencyStats/top_restaurants)
// ni el propio restaurante (ve su AttributionPanel, que no distingue esto) lo ven.
//
// El "aterrizado" de una sesión puede venir de la URL (?ref=guide&apt=&gsid=,
// mismo clic) o de la cookie cross-dominio en .visualtastes.com que persiste
// esa referencia varios días (ver apps/guide/src/lib/api.ts setReferralCookie
// y apps/client TrackingAndPushProvider.tsx) — así se captura el caso real de
// "vio el restaurante en la guía, fue a cenar dos días después".
async function getRestaurantConversions(env, params) {
    const days = Math.min(parseInt(params.get('days') || '30', 10) || 30, 365);
    const fromTs = new Date(Date.now() - days * 86400000).toISOString();

    const [clicks, landed, converted] = await Promise.all([
        env.DB.prepare(`
            SELECT gi.target_id AS restaurant_id, r.name AS restaurant_name,
                   gi.apartment_id, a.name AS apartment_name,
                   COUNT(*) AS clicks
            FROM guide_affiliate_intents gi
            LEFT JOIN restaurants r ON r.id = gi.target_id
            LEFT JOIN guide_apartments a ON a.id = gi.apartment_id
            WHERE gi.target_type = 'restaurant' AND gi.created_at >= ?
            GROUP BY gi.target_id, gi.apartment_id
        `).bind(fromTs).all(),

        env.DB.prepare(`
            SELECT s.restaurant_id, r.name AS restaurant_name,
                   s.referral_apartment_id AS apartment_id, a.name AS apartment_name,
                   COUNT(*) AS landed
            FROM sessions s
            LEFT JOIN restaurants r ON r.id = s.restaurant_id
            LEFT JOIN guide_apartments a ON a.id = s.referral_apartment_id
            WHERE s.referral_source = 'guide' AND s.referral_apartment_id IS NOT NULL AND s.started_at >= ?
            GROUP BY s.restaurant_id, s.referral_apartment_id
        `).bind(fromTs).all(),

        env.DB.prepare(`
            SELECT s.restaurant_id, r.name AS restaurant_name,
                   s.referral_apartment_id AS apartment_id, a.name AS apartment_name,
                   COUNT(*) AS converted
            FROM sessions s
            LEFT JOIN restaurants r ON r.id = s.restaurant_id
            LEFT JOIN guide_apartments a ON a.id = s.referral_apartment_id
            WHERE s.referral_source = 'guide' AND s.referral_apartment_id IS NOT NULL
                AND s.qr_code_id IS NOT NULL AND s.started_at >= ?
            GROUP BY s.restaurant_id, s.referral_apartment_id
        `).bind(fromTs).all(),
    ]);

    const key = (r, a) => `${r}::${a}`;
    const merged = {};
    const upsert = (row, field) => {
        const k = key(row.restaurant_id, row.apartment_id);
        if (!merged[k]) {
            merged[k] = {
                restaurant_id: row.restaurant_id, restaurant_name: row.restaurant_name || row.restaurant_id,
                apartment_id: row.apartment_id, apartment_name: row.apartment_name || row.apartment_id,
                clicks: 0, landed: 0, converted: 0
            };
        }
        merged[k][field] = row[field];
    };
    for (const row of (clicks.results || [])) upsert(row, 'clicks');
    for (const row of (landed.results || [])) upsert(row, 'landed');
    for (const row of (converted.results || [])) upsert(row, 'converted');

    const rows = Object.values(merged).sort((a, b) => b.clicks - a.clicks);
    return jsonResponse({ success: true, rows, range_days: days });
}

// ============================================
// SESSION LOG (per-visitor detail: who saw what, when, from where)
// ============================================
async function getSessionsLog(env, agencyId, params) {
    if (!agencyId) return errorResponse('agency_id is required');

    const fromDate = params.get('from') || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const toDate = params.get('to') || new Date().toISOString().split('T')[0];
    const fromTs = fromDate + 'T00:00:00';
    const toTs = toDate + 'T23:59:59';
    const apartmentId = params.get('apartment_id');
    // Default/max raised vs a typical page size: rows are grouped into visitors client-side,
    // so we need enough raw sessions in range for repeat-visit grouping to be meaningful.
    const limit = Math.min(parseInt(params.get('limit') || '200', 10) || 200, 300);
    const offset = parseInt(params.get('offset') || '0', 10) || 0;

    let query = `
        SELECT s.id, s.apartment_id, a.name as apartment_name, s.device_type, s.os_name, s.browser,
               s.country, s.city, s.language_code, s.started_at, s.ended_at, s.duration_seconds,
               s.device_fingerprint,
               (SELECT COUNT(*) FROM guide_affiliate_intents i WHERE i.session_id = s.id) as intents_count,
               (SELECT COUNT(*) FROM guide_section_views sv WHERE sv.session_id = s.id) as sections_count
        FROM guide_sessions s
        JOIN guide_apartments a ON s.apartment_id = a.id
        WHERE a.agency_id = ? AND s.started_at BETWEEN ? AND ?
    `;
    const qParams = [agencyId, fromTs, toTs];
    if (apartmentId) { query += ' AND s.apartment_id = ?'; qParams.push(apartmentId); }
    query += ' ORDER BY s.started_at DESC LIMIT ? OFFSET ?';
    qParams.push(limit, offset);

    const result = await env.DB.prepare(query).bind(...qParams).all();
    return jsonResponse({ success: true, sessions: result.results || [] });
}

async function getSessionDetail(env, sessionId, isSuperAdmin, userAgencyIds) {
    const session = await env.DB.prepare(`
        SELECT s.*, a.name as apartment_name, a.agency_id
        FROM guide_sessions s JOIN guide_apartments a ON s.apartment_id = a.id
        WHERE s.id = ?
    `).bind(sessionId).first();
    if (!session) return errorResponse('Session not found', 404);
    if (!isSuperAdmin && !userAgencyIds.includes(session.agency_id)) return errorResponse('Forbidden', 403);

    const [intents, sections] = await Promise.all([
        env.DB.prepare('SELECT target_type, target_id, action_taken, created_at FROM guide_affiliate_intents WHERE session_id = ? ORDER BY created_at ASC').bind(sessionId).all(),
        env.DB.prepare('SELECT section, duration_seconds, created_at FROM guide_section_views WHERE session_id = ? ORDER BY created_at ASC').bind(sessionId).all(),
    ]);

    const intentRows = intents.results || [];

    // Resolve human-readable names for what was clicked (restaurants / experiences)
    // in a couple of batched lookups rather than a complex conditional JOIN.
    const restaurantIds = [...new Set(intentRows.filter(i => i.target_type === 'restaurant').map(i => i.target_id))];
    const experienceIds = [...new Set(intentRows.filter(i => i.target_type === 'experience').map(i => i.target_id))];
    const nameMap = {};
    if (restaurantIds.length > 0) {
        const ph = restaurantIds.map(() => '?').join(',');
        const rows = await env.DB.prepare(`SELECT id, name FROM restaurants WHERE id IN (${ph})`).bind(...restaurantIds).all();
        for (const r of (rows.results || [])) nameMap[`restaurant:${r.id}`] = r.name;
    }
    if (experienceIds.length > 0) {
        const ph = experienceIds.map(() => '?').join(',');
        const rows = await env.DB.prepare(`
            SELECT e.id, COALESCE(t.value, e.category) as name FROM guide_pois e
            LEFT JOIN translations t ON e.id = t.entity_id AND t.entity_type = 'poi' AND t.field = 'name' AND t.language_code = 'es'
            WHERE e.id IN (${ph})
        `).bind(...experienceIds).all();
        for (const r of (rows.results || [])) nameMap[`experience:${r.id}`] = r.name;
    }

    const timeline = [
        ...intentRows.map(i => ({
            type: 'intent',
            target_type: i.target_type,
            target_name: nameMap[`${i.target_type}:${i.target_id}`] || i.target_id,
            action: i.action_taken,
            at: i.created_at,
        })),
        ...(sections.results || []).map(s => ({
            type: 'section',
            section: s.section,
            duration_seconds: s.duration_seconds,
            at: s.created_at,
        })),
    ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    return jsonResponse({ success: true, session, timeline });
}

// ============================================
// POI MEDIA
// ============================================
async function addPoiMedia(env, poiId, request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) return errorResponse('file required');

        const ext = file.name.split('.').pop();
        const uuid = generateId('');
        const r2Key = `guide/pois/${poiId}/${uuid}.${ext}`;

        await env.R2_BUCKET.put(r2Key, file.stream(), {
            httpMetadata: { contentType: file.type }
        });

        const existingCount = await env.DB.prepare(
            'SELECT COUNT(*) as c FROM guide_poi_media WHERE poi_id = ?'
        ).bind(poiId).first();

        // Every upload becomes the new PRIMARY_IMAGE (what the public guide
        // picks up as the card cover). Any previous primary is demoted to
        // the gallery instead of being left as a stale, still-visible cover.
        await env.DB.prepare(
            `UPDATE guide_poi_media SET role = 'GALLERY_IMAGE' WHERE poi_id = ? AND role = 'PRIMARY_IMAGE'`
        ).bind(poiId).run();

        const id = generateId('pm');
        await env.DB.prepare(`
            INSERT INTO guide_poi_media (id, poi_id, r2_key, media_type, role, order_index)
            VALUES (?, ?, ?, 'image', 'PRIMARY_IMAGE', ?)
        `).bind(id, poiId, r2Key, existingCount?.c || 0).run();

        const poi = await env.DB.prepare('SELECT zone_id FROM guide_pois WHERE id = ?').bind(poiId).first();
        await touchZoneGuideVersions(env, poi?.zone_id);

        const origin = new URL(request.url).origin;
        return jsonResponse({ success: true, id, r2_key: r2Key, url: `${origin}/media/${r2Key}`, role: 'PRIMARY_IMAGE' });
    } catch (err) {
        return errorResponse('Upload failed: ' + err.message, 500);
    }
}

async function deletePoiMedia(env, poiId, mediaId) {
    const media = await env.DB.prepare('SELECT r2_key FROM guide_poi_media WHERE id = ? AND poi_id = ?').bind(mediaId, poiId).first();
    if (!media) return errorResponse('Not found', 404);

    await env.R2_BUCKET.delete(media.r2_key);
    await env.DB.prepare('DELETE FROM guide_poi_media WHERE id = ?').bind(mediaId).run();

    const poi = await env.DB.prepare('SELECT zone_id FROM guide_pois WHERE id = ?').bind(poiId).first();
    await touchZoneGuideVersions(env, poi?.zone_id);

    return jsonResponse({ success: true });
}
