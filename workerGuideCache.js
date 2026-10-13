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
// Lo que comparten varias guías (el contenido de una zona, el diseño y la tienda
// de una agencia, el catálogo de la plataforma) NO va en esa clave: lleva su
// propia versión (`ver:zone:{id}`, `ver:agency:{id}`, `ver:all`) y cada entrada
// guarda en sus metadatos con cuáles se generó. Al leerla se comparan, y si
// alguna ha cambiado la entrada no vale (readGuidePayload). Antes un cambio así
// reescribía `ver:apt:*` de cada piso afectado: con 50 pisos en una zona, 51
// escrituras por POI editado contra las 1.000 diarias del plan Free.
//
// Split into its own module (rather than living in workerGuide.js or
// workerGuideAdmin.js) because those two already import from each other
// (workerGuide.js reads ACTIVE_LANGUAGES from workerGuideAdmin.js), and both
// need these helpers — a third shared module avoids a circular import.
// ============================================

export async function getGuideVersion(env, slug) {
    if (!env.GUIDE_CACHE) return '0';
    return (await env.GUIDE_CACHE.get(`ver:apt:${slug}`)) || '0';
}

export async function touchGuideVersion(env, slug) {
    if (!env.GUIDE_CACHE || !slug) return;
    await env.GUIDE_CACHE.put(`ver:apt:${slug}`, String(Date.now()));
}

// Zone-level content (POIs, experiences, zone-restaurant links) is shared by every
// apartment in that zone: una sola clave por zona, que leen tanto la guía de cada
// piso (readGuideScope) como el endpoint /guide/:slug/explore.
//
// Va por id y no por slug: el slug de una zona se puede editar, y una entrada
// cacheada seguiría mirando la clave del slug viejo, que ya nadie toca.
export async function touchZoneGuideVersions(env, zoneId) {
    if (!env.GUIDE_CACHE || !zoneId) return;
    await env.GUIDE_CACHE.put(`ver:zone:${zoneId}`, String(Date.now()));
}

// Todos los alojamientos de una AGENCIA: su diseño (colores, fuentes) y los
// productos de Tienda con owner_type='agency' salen en la guía de cada propiedad
// de ese property manager, y solo en esas.
export async function touchAgencyGuideVersions(env, agencyId) {
    if (!env.GUIDE_CACHE || !agencyId) return;
    await env.GUIDE_CACHE.put(`ver:agency:${agencyId}`, String(Date.now()));
}

// Per-zone version for the "explore other cities" endpoint (GET /guide/:slug/explore).
// Bumped by touchZoneGuideVersions above (POI/experience edits within that zone).
export async function getZoneExploreVersion(env, zoneId) {
    if (!env.GUIDE_CACHE || !zoneId) return '0';
    return (await env.GUIDE_CACHE.get(`ver:zone:${zoneId}`)) || '0';
}

// Region-wide catalog version: the list of sibling cities (name/slug/lat/lng/
// is_active) shown in the explore endpoint's city picker. Only changes when a zone
// itself is created/edited/deactivated — not on every POI edit — so it's a separate
// version from ver:zone:{id} rather than folded into it.
export async function getZoneCatalogVersion(env) {
    if (!env.GUIDE_CACHE) return '0';
    return (await env.GUIDE_CACHE.get('ver:zonecatalog')) || '0';
}

export async function touchZoneCatalogVersion(env) {
    if (!env.GUIDE_CACHE) return;
    await env.GUIDE_CACHE.put('ver:zonecatalog', String(Date.now()));
}

// Platform store items (guide_store_items.owner_type='platform') and zone-restaurant
// links are visible on every apartment's guide, not just one apartment or one zone.
// También sirve a mano tras un deploy que cambie la forma del JSON: una escritura
// invalida todas las guías (CLAUDE.md §3).
export async function touchAllGuideVersions(env) {
    if (!env.GUIDE_CACHE) return;
    await env.GUIDE_CACHE.put('ver:all', String(Date.now()));
}

// Las versiones compartidas de las que depende la guía de un piso. Hay que
// leerlas ANTES de consultar el contenido en D1: si un cambio entra a mitad, la
// entrada se guarda con la marca anterior y la siguiente lectura la descarta. Al
// revés (contenido primero) se daría por fresca una guía ya vieja durante 24 h.
export async function readGuideScope(env, zoneId, agencyId) {
    const [zone, agency, all] = await Promise.all([
        zoneId ? env.GUIDE_CACHE.get(`ver:zone:${zoneId}`) : null,
        agencyId ? env.GUIDE_CACHE.get(`ver:agency:${agencyId}`) : null,
        env.GUIDE_CACHE.get('ver:all'),
    ]);
    return { z: zoneId || null, a: agencyId || null, s: `${zone || '0'}.${agency || '0'}.${all || '0'}` };
}

// Devuelve el JSON cacheado solo si las versiones compartidas siguen siendo las
// de cuando se generó. Una entrada sin metadatos (anterior a este esquema) no vale.
export async function readGuidePayload(env, cacheKey) {
    const { value, metadata } = await env.GUIDE_CACHE.getWithMetadata(cacheKey);
    if (!value || !metadata?.s) return null;
    const current = await readGuideScope(env, metadata.z, metadata.a);
    return current.s === metadata.s ? value : null;
}

export async function writeGuidePayload(env, cacheKey, body, scope) {
    await env.GUIDE_CACHE.put(cacheKey, body, { expirationTtl: 86400, metadata: scope });
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
