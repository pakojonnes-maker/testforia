// workerGuideCache.js — Guide KV cache versioning
// ============================================
// Each guide cache key embeds a version timestamp (guide:{slug}:{lang}:v{version})
// instead of being explicitly deleted on every edit. Editing content just bumps
// `ver:apt:{slug}` (1 KV write, no read-before-write race since it's a plain
// overwrite) instead of deleting one key per active language (13 deletes/edit,
// which capped content edits at ~77/day against the Free tier's 1,000 deletes/day).
// Stale versioned keys are never explicitly removed — nothing points at them
// anymore, so they just fall off via TTL.
//
// Split into its own module (rather than living in workerGuide.js or
// workerGuideAdmin.js) because those two already import from each other
// (workerGuide.js reads ACTIVE_LANGUAGES from workerGuideAdmin.js), and both
// need these helpers — a third shared module avoids a circular import.
// ============================================

// Escribe una entrada de caché SIN poder romper la respuesta. La caché es una
// optimización: el free tier de KV son 1.000 escrituras/día y, agotadas, `put`
// lanza excepción. Sin este try/catch esa excepción subía hasta el handler y
// convertía en 500 una respuesta que ya estaba calculada y lista para servir.
export async function putGuideCache(env, key, value, ttl = 86400) {
    if (!env.GUIDE_CACHE || !key) return;
    try {
        await env.GUIDE_CACHE.put(key, value, { expirationTtl: ttl });
    } catch (error) {
        console.error('[GuideCache] No se pudo escribir la caché (¿cupo de KV agotado?):', error.message);
    }
}

// ---------------------------------------------------------------------------
// Versión compuesta de la guía: cuatro alcances, UNA escritura por edición.
// ---------------------------------------------------------------------------
// Antes, editar un POI o un producto compartido escribía una clave `ver:apt:*`
// por cada apartamento afectado (toda la zona, toda la agencia, toda la
// plataforma). El free tier de KV son 1.000 escrituras/día: una tarde editando
// POIs en una zona con 40 pisos las agotaba, y con ellas la caché entera.
//
// Ahora la versión de una guía se compone de cuatro contadores y cada edición
// toca solo el que le corresponde:
//   ver:apt:{slug}       contenido de ese piso
//   ver:zone:{zoneSlug}  POIs / experiencias de la zona (lo lee también Explorar)
//   ver:agency:{id}      catálogo de tienda de la agencia
//   ver:all              cosas de plataforma (tienda global, restaurantes de zona)
// Coste: 4 lecturas de KV en paralelo por petición (cupo de 100.000/día, 100
// veces el de escrituras) a cambio de que editar cueste siempre 1 escritura.
//
// La clave de caché cambia de forma (`v<a>.<z>.<g>.<all>`), así que el primer
// despliegue deja huérfanas las entradas anteriores: sin bump manual, la guía
// se regenera sola. Y `ver:all` sirve de "invalidar todo" con una sola escritura.

const SCOPE_MEMO_TTL_MS = 5 * 60 * 1000;
const scopeMemo = new Map(); // slug -> { zoneSlug, agencyId, exp }

// Zona y agencia de un piso. Se memoriza por isolate: cambian casi nunca, y si
// un piso se mueve de zona la propia edición bumpea su ver:apt, de modo que la
// guía se recalcula bien; solo tarda hasta 5 min en enterarse de las ediciones
// futuras de su NUEVA zona.
async function resolveGuideScope(env, slug) {
    const hit = scopeMemo.get(slug);
    if (hit && hit.exp > Date.now()) return hit;
    const row = await env.DB.prepare(`
        SELECT z.slug AS zone_slug, a.agency_id AS agency_id
        FROM guide_apartments a JOIN guide_zones z ON z.id = a.zone_id
        WHERE a.slug = ?
    `).bind(slug).first();
    if (!row) return null; // piso inexistente: no se memoriza para no ocultar un alta posterior
    const scope = { zoneSlug: row.zone_slug, agencyId: row.agency_id, exp: Date.now() + SCOPE_MEMO_TTL_MS };
    scopeMemo.set(slug, scope);
    return scope;
}

export async function getGuideVersion(env, slug) {
    if (!env.GUIDE_CACHE) return '0';
    const scope = await resolveGuideScope(env, slug);
    if (!scope) return (await env.GUIDE_CACHE.get(`ver:apt:${slug}`)) || '0';
    const [apt, zone, agency, all] = await Promise.all([
        env.GUIDE_CACHE.get(`ver:apt:${slug}`),
        env.GUIDE_CACHE.get(`ver:zone:${scope.zoneSlug}`),
        env.GUIDE_CACHE.get(`ver:agency:${scope.agencyId}`),
        env.GUIDE_CACHE.get('ver:all'),
    ]);
    return `${apt || 0}.${zone || 0}.${agency || 0}.${all || 0}`;
}

export async function touchGuideVersion(env, slug) {
    if (!env.GUIDE_CACHE) return;
    await env.GUIDE_CACHE.put(`ver:apt:${slug}`, String(Date.now()));
}

// Un POI/experiencia es contenido de ZONA: lo comparten todos sus pisos. Una
// escritura (ver:zone) invalida la guía de todos ellos Y el Explorar de la zona.
export async function touchZoneGuideVersions(env, zoneId) {
    if (!env.GUIDE_CACHE || !zoneId) return;
    const zoneRow = await env.DB.prepare('SELECT slug FROM guide_zones WHERE id = ?').bind(zoneId).first();
    if (zoneRow?.slug) await env.GUIDE_CACHE.put(`ver:zone:${zoneRow.slug}`, String(Date.now()));
}

// Catálogo de Tienda de una AGENCIA: sale en todos sus pisos. Una escritura.
export async function touchAgencyGuideVersions(env, agencyId) {
    if (!env.GUIDE_CACHE || !agencyId) return;
    await env.GUIDE_CACHE.put(`ver:agency:${agencyId}`, String(Date.now()));
}

// Per-zone version for the "explore other cities" endpoint (GET /guide/:slug/explore).
// Bumped by touchZoneGuideVersions above (POI/experience edits within that zone).
export async function getZoneExploreVersion(env, zoneSlug) {
    if (!env.GUIDE_CACHE || !zoneSlug) return '0';
    return (await env.GUIDE_CACHE.get(`ver:zone:${zoneSlug}`)) || '0';
}

// Region-wide catalog version: the list of sibling cities (name/slug/lat/lng/
// is_active) shown in the explore endpoint's city picker. Only changes when a zone
// itself is created/edited/deactivated — not on every POI edit — so it's a separate
// version from ver:zone:{slug} rather than folded into it.
export async function getZoneCatalogVersion(env) {
    if (!env.GUIDE_CACHE) return '0';
    return (await env.GUIDE_CACHE.get('ver:zonecatalog')) || '0';
}

export async function touchZoneCatalogVersion(env) {
    if (!env.GUIDE_CACHE) return;
    await env.GUIDE_CACHE.put('ver:zonecatalog', String(Date.now()));
}

// Tienda de plataforma (guide_store_items.owner_type='platform') y vínculos
// zona-restaurante se ven en la guía de TODOS los pisos: una sola clave global.
export async function touchAllGuideVersions(env) {
    if (!env.GUIDE_CACHE) return;
    await env.GUIDE_CACHE.put('ver:all', String(Date.now()));
}

// Same scheme for the digital menu (workerReels.js). Keyed by restaurant slug,
// same as the guide is keyed by apartment slug.
export async function getMenuVersion(env, slug) {
    if (!env.GUIDE_CACHE) return '0';
    return (await env.GUIDE_CACHE.get(`ver:restaurant:${slug}`)) || '0';
}

export async function touchMenuVersion(env, slug) {
    if (!env.GUIDE_CACHE || !slug) return;
    await env.GUIDE_CACHE.put(`ver:restaurant:${slug}`, String(Date.now()));
}
