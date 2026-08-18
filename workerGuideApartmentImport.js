// workerGuideApartmentImport.js — Importador masivo de apartamentos (Excel/CSV)
// =====================================================
// Endpoint: POST /guide/admin/import/apartments/preview   (agencia propia o superadmin)
//
// La agencia rellena una plantilla (generada en el admin a partir de datos en
// vivo: zonas + catálogo de categorías — apps/admin/src/lib/guideApartmentTemplate.ts)
// y la sube. El PARSEO del .xlsx/.csv ocurre en el navegador (librería `xlsx`);
// este módulo nunca toca un binario de Excel, solo JSON ya estructurado.
//
// Aquí se valida cada fila (¿existe la zona?, ¿ya hay un apartamento parecido
// en esta agencia?, ¿las categorías de info/teléfono son del catálogo?) y se
// geocodifica la dirección con la Geocoding API de Google. Es DE SOLO LECTURA
// a propósito, mismo motivo que workerGuideImport.js (importador de POIs): el
// alta real la hace el frontend llamando a los endpoints que YA existen
// (POST /guide/admin/apartments, .../info, .../phones) en workerGuideAdmin.js
// — duplicar esa escritura aquí sería la forma segura de que, con el tiempo,
// uno de los dos caminos se olvide de invalidar la caché KV o de aplicar la
// misma authz de agencia.
//
// Coste real de Google (a diferencia de las SKUs de Places documentadas en
// workerGuideImport.js, esto NO se ha verificado contra la Google Cloud
// Console de esta cuenta — comprobar que "Geocoding API" esté ACTIVADA para
// la misma key que ya usa el importador de POIs, GOOGLE_PLACES_API_KEY, antes
// de confiar en este importador en producción; si Google devuelve
// REQUEST_DENIED es casi seguro eso):
//  - Geocoding API: $5/1.000 peticiones tras el crédito gratuito mensual de
//    $200 de Google Cloud (~40.000 peticiones/mes gratis con solo esta API).
//    RATE_LIMIT_GEOCODE_BUDGET se queda muy por debajo a propósito.
// =====================================================

import { verifyJWT, hitRateLimit } from './workerAuthentication.js';
import { nameSimilarity } from './workerGuideImport.js';

const GEOCODE_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';
const FETCH_TIMEOUT_MS = 8000;

// 40 filas/lote: generoso para una agencia mediana, acotado para que el
// Worker no se pase de tiempo geocodificando en serie dentro de una sola
// request (ver el bucle secuencial en previewApartmentsImport).
const MAX_ROWS_PER_BATCH = 40;
// Red de seguridad anti-bucle, no un límite de negocio (una agencia real no
// sube el mismo lote 15 veces en una hora).
const RATE_LIMIT_PREVIEW_PER_USER = { limit: 15, windowSeconds: 3600 };
// Presupuesto MENSUAL compartido por toda la cuenta (no por usuario): se
// consume 1 unidad por fila con dirección no vacía, en el momento real de
// llamar a Google — así que un preview repetido sobre las mismas filas SÍ
// vuelve a gastar presupuesto (no hay caché de geocodificación todavía; si
// esto se vuelve un problema real, cachear por dirección normalizada en KV
// es el siguiente paso, no reinventar el rate limiter).
const RATE_LIMIT_GEOCODE_BUDGET = { limit: 2000, windowSeconds: 2592000 };
// Mismo umbral que workerGuideImport.js (LIKELY_MATCH_THRESHOLD) para que
// "probable duplicado" signifique lo mismo en los dos importadores del admin.
const LIKELY_MATCH_THRESHOLD = 0.72;

// seedDefaultPhones (workerGuideAdmin.js) las añade solas al crear el
// apartamento, con INSERT OR IGNORE e id determinista. upsertApartmentPhone
// (el endpoint que usa el commit del frontend) NO tiene ese mismo
// idempotente: si la fila de Excel repite una de estas categorías, el
// resultado es una entrada duplicada, no un reemplazo — se avisa en vez de
// filtrarla, porque sigue siendo válido querer un número de agencia distinto
// del que ya trajo el seed.
const AUTO_SEEDED_PHONE_CATEGORIES = new Set(['emergency', 'police', 'firefighters', 'ambulance', 'agency']);

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function errorResponse(message, status = 400) {
    return jsonResponse({ success: false, error: message }, status);
}

// Mismo esquema que createApartment en workerGuideAdmin.js — tiene que
// coincidir, o el chequeo de slug duplicado de abajo compara contra un slug
// que el commit real no va a generar.
function slugify(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Traduce una dirección en texto libre a coordenadas. A diferencia de
 * resolvePlaceRef en workerGuideImport.js (que busca una FICHA de Google
 * Maps), un piso privado no es un "place" — por eso esto usa la Geocoding
 * API clásica, no Places Text Search.
 *
 * Exportada: workerGuideApartmentLink.js (importador desde URL) la reutiliza
 * para la vía 3 (dirección en texto plano) y como relleno de coordenadas
 * cuando una web de origen publica dirección pero no lat/lng estructurada.
 */
export async function geocodeAddress(env, address) {
    if (!address || !address.trim()) return { ok: false, reason: 'no_address' };
    if (!env.GOOGLE_PLACES_API_KEY) return { ok: false, reason: 'not_configured' };
    if (env.RATE_LIMIT_KV) {
        const budget = await hitRateLimit(env, 'aptimport:geocode:budget', RATE_LIMIT_GEOCODE_BUDGET);
        if (!budget.allowed) return { ok: false, reason: 'budget_exhausted' };
    }

    const params = new URLSearchParams({
        address: address.trim(),
        key: env.GOOGLE_PLACES_API_KEY,
        language: 'es',
        region: 'es',
    });
    try {
        const res = await fetch(`${GEOCODE_BASE}?${params.toString()}`, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) return { ok: false, reason: `http_${res.status}` };
        const data = await res.json();
        if (data.status !== 'OK' || !data.results?.[0]) {
            return { ok: false, reason: data.status || 'no_results' };
        }
        const top = data.results[0];
        return {
            ok: true,
            latitude: top.geometry?.location?.lat ?? null,
            longitude: top.geometry?.location?.lng ?? null,
            formatted_address: top.formatted_address || null,
        };
    } catch (err) {
        console.warn('[GuideApartmentImport] Geocoding error de red:', err.message);
        return { ok: false, reason: 'network_error' };
    }
}

function resolveZone(zoneName, zones) {
    const target = (zoneName || '').trim();
    if (!target) return { zone: null, score: 0 };
    const exact = zones.find(z => z.name.toLowerCase() === target.toLowerCase());
    if (exact) return { zone: exact, score: 1 };
    let best = null, bestScore = 0;
    for (const z of zones) {
        const score = nameSimilarity(z.name, target);
        if (score > bestScore) { bestScore = score; best = z; }
    }
    return bestScore >= LIKELY_MATCH_THRESHOLD ? { zone: best, score: bestScore } : { zone: null, score: bestScore };
}

// Exportada: workerGuideApartmentLink.js la reutiliza para avisar de
// "probable duplicado" con el mismo umbral y criterio que el importador de
// Excel, en vez de mantener una segunda copia de este scoring.
export function findLikelyDuplicate(name, existingApartments) {
    let best = null, bestScore = 0;
    for (const apt of existingApartments) {
        const score = nameSimilarity(apt.name, name);
        if (score > bestScore) { bestScore = score; best = apt; }
    }
    return bestScore >= LIKELY_MATCH_THRESHOLD ? { apartment: best, score: bestScore } : null;
}

/**
 * Valida y enriquece una fila. Nunca lanza: cualquier fallo se refleja en
 * `status`/`error`/`warnings` para que el preview pueda mostrar el lote
 * entero de una vez, fila buena junto a fila mala.
 */
async function previewRow(env, row, ctx) {
    const { zones, infoCategoryKeys, phoneCategoryKeys, existingApartments, existingSlugs } = ctx;
    const warnings = [];
    const name = (row.name || '').trim();
    if (!name) {
        return { row_number: row.row_number, status: 'error', error: 'Falta el nombre del apartamento', warnings };
    }

    const { zone, score: zoneScore } = resolveZone(row.zone_name, zones);
    if (!zone) {
        return {
            row_number: row.row_number, name, status: 'zone_not_found',
            error: `Zona "${row.zone_name || ''}" no reconocida`,
            zone_name_input: row.zone_name || '', warnings,
        };
    }
    if (zoneScore < 1) warnings.push(`Zona interpretada como "${zone.name}" (no coincidía exacto)`);

    const dup = findLikelyDuplicate(name, existingApartments);

    const slug = slugify(name);
    if (!dup && existingSlugs.has(slug)) {
        // Nombre distinto pero mismo slug generado (acentos/símbolos que se
        // pierden al normalizar, o mismo nombre en otra agencia — slug es
        // UNIQUE global en guide_apartments). No es "probable duplicado" por
        // nombre parecido: es un choque seguro que el commit real rechazaría,
        // así que se marca como error explícito aquí en vez de fallar a medio
        // lote.
        return {
            row_number: row.row_number, name, status: 'error',
            error: `El slug "${slug}" ya existe (¿nombre repetido?)`, warnings,
        };
    }

    const geo = await geocodeAddress(env, row.address);
    if (!geo.ok && row.address?.trim()) warnings.push(`Dirección no geocodificada (${geo.reason})`);

    // guide_apartment_info tiene UNIQUE(apartment_id, info_key) — dos filas
    // con la misma categoría para el mismo apartamento (columna ancha +
    // "Info extra", o dos filas de "Info extra") no fallarían al importar,
    // pero la segunda pisaría a la primera en silencio vía el upsert. Se
    // detecta aquí para que la agencia lo vea ANTES de que eso pase.
    const info = [];
    const seenInfoKeys = new Set();
    for (const item of row.info || []) {
        const text = (item.text || '').trim();
        if (!text) continue;
        if (!infoCategoryKeys.has(item.category_key)) {
            warnings.push(`Categoría de info desconocida: "${item.category_key}" (se omite)`);
            continue;
        }
        if (seenInfoKeys.has(item.category_key)) {
            warnings.push(`Categoría de info repetida: "${item.category_key}" (se queda con el último valor)`);
            const idx = info.findIndex(f => f.category_key === item.category_key);
            if (idx >= 0) info.splice(idx, 1);
        }
        seenInfoKeys.add(item.category_key);
        info.push({ category_key: item.category_key, text, custom_title: item.custom_title?.trim() || null });
    }

    const phones = [];
    for (const item of row.phones || []) {
        const number = (item.number || '').trim();
        if (!number) continue;
        if (!phoneCategoryKeys.has(item.category_key)) {
            warnings.push(`Categoría de teléfono desconocida: "${item.category_key}" (se omite)`);
            continue;
        }
        if (AUTO_SEEDED_PHONE_CATEGORIES.has(item.category_key)) {
            warnings.push(`"${item.category_key}" ya se añade automáticamente al crear el apartamento — este se sumará como entrada adicional, no lo sustituye`);
        }
        phones.push({ category_key: item.category_key, number });
    }

    return {
        row_number: row.row_number,
        name,
        slug,
        address: row.address?.trim() || null,
        status: dup ? 'likely_duplicate' : 'new',
        zone_id: zone.id,
        zone_matched_name: zone.name,
        existing_apartment_id: dup?.apartment.id || null,
        match_score: dup?.score ?? null,
        latitude: geo.latitude ?? null,
        longitude: geo.longitude ?? null,
        formatted_address: geo.formatted_address ?? null,
        geocoded: geo.ok === true,
        wifi_ssid: row.wifi_ssid?.trim() || null,
        wifi_password: row.wifi_password?.trim() || null,
        whatsapp: row.whatsapp?.trim() || null,
        info,
        phones,
        warnings,
    };
}

async function previewApartmentsImport(env, body, userId, isSuperAdmin, userAgencyIds) {
    const { agency_id, rows } = body || {};
    if (!agency_id) return errorResponse('agency_id is required');
    if (!isSuperAdmin && !userAgencyIds.includes(agency_id)) return errorResponse('Forbidden', 403);
    if (!Array.isArray(rows) || rows.length === 0) return errorResponse('rows must be a non-empty array');
    if (rows.length > MAX_ROWS_PER_BATCH) {
        return errorResponse(`Máximo ${MAX_ROWS_PER_BATCH} apartamentos por lote — divide el archivo en varias importaciones.`);
    }

    if (env.RATE_LIMIT_KV) {
        const userLimit = await hitRateLimit(env, `aptimport:user:${userId}`, RATE_LIMIT_PREVIEW_PER_USER);
        if (!userLimit.allowed) return errorResponse('rate_limited', 429);
    } else {
        console.warn('[GuideApartmentImport] RATE_LIMIT_KV no configurado: importador sin límite de uso');
    }
    if (!env.GOOGLE_PLACES_API_KEY) {
        console.warn('[GuideApartmentImport] GOOGLE_PLACES_API_KEY no configurada: direcciones sin geocodificar');
    }

    const [zonesRes, infoCatsRes, phoneCatsRes, existingAptsRes, allSlugsRes] = await Promise.all([
        env.DB.prepare('SELECT id, name FROM guide_zones WHERE is_active = TRUE').all(),
        env.DB.prepare('SELECT key FROM guide_info_categories WHERE is_active = TRUE').all(),
        env.DB.prepare('SELECT key FROM guide_phone_categories WHERE is_active = TRUE').all(),
        env.DB.prepare('SELECT id, name, slug FROM guide_apartments WHERE agency_id = ? AND is_active = TRUE').bind(agency_id).all(),
        env.DB.prepare('SELECT slug FROM guide_apartments').all(),
    ]);

    const ctx = {
        zones: zonesRes.results || [],
        infoCategoryKeys: new Set((infoCatsRes.results || []).map(r => r.key)),
        phoneCategoryKeys: new Set((phoneCatsRes.results || []).map(r => r.key)),
        existingApartments: existingAptsRes.results || [],
        existingSlugs: new Set((allSlugsRes.results || []).map(r => r.slug)),
    };

    // Secuencial, no Promise.all: cada fila con dirección dispara una llamada
    // de red a Google, y Promise.all en paralelo sobre 40 filas sería la
    // forma más rápida de agotar RATE_LIMIT_GEOCODE_BUDGET con un solo click.
    const results = [];
    for (const row of rows) {
        results.push(await previewRow(env, row, ctx));
    }
    return jsonResponse({ success: true, results });
}

/**
 * Registrar en worker.js ANTES del bloque genérico "/guide/admin/", justo
 * después del importador de POIs — mismo motivo que ese (ver su comentario
 * de registro): handleGuideAdminRequests no reconoce este path, pero no
 * depender de ese detalle interno es más robusto a largo plazo.
 */
export async function handleGuideApartmentImportRequests(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/guide/admin/import/apartments/')) return null;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return errorResponse('Unauthorized', 401);
    const userData = await verifyJWT(authHeader.substring(7), env.JWT_SECRET);
    if (!userData) return errorResponse('Unauthorized', 401);

    const isSuperAdmin = userData.is_superadmin === true;
    let userAgencyIds = [];
    if (!isSuperAdmin) {
        const staffRows = await env.DB.prepare(
            'SELECT agency_id FROM guide_agency_staff WHERE user_id = ? AND is_active = TRUE'
        ).bind(userData.userId).all();
        userAgencyIds = (staffRows.results || []).map(r => r.agency_id);
        if (userAgencyIds.length === 0) return errorResponse('User has no agency access', 403);
    }

    const path = url.pathname.replace('/guide/admin/import/apartments/', '');
    const method = request.method;

    try {
        if (path === 'preview' && method === 'POST') {
            let body;
            try { body = await request.json(); } catch { return errorResponse('Invalid JSON body'); }
            return await previewApartmentsImport(env, body, userData.userId, isSuperAdmin, userAgencyIds);
        }
        return null;
    } catch (error) {
        console.error('[GuideApartmentImport] Error:', error.message);
        return errorResponse('Import error: ' + error.message, 500);
    }
}
