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

export async function getGuideVersion(env, slug) {
    if (!env.GUIDE_CACHE) return '0';
    return (await env.GUIDE_CACHE.get(`ver:apt:${slug}`)) || '0';
}

export async function touchGuideVersion(env, slug) {
    if (!env.GUIDE_CACHE || !slug) return;
    await env.GUIDE_CACHE.put(`ver:apt:${slug}`, String(Date.now()));
}

// Zone-level content (POIs, experiences, zone-restaurant links) is shared by every
// apartment in that zone, so there's no single zone cache key to bump — touch every
// active apartment's version instead. This is an admin-only write path (rare), so
// the extra D1 read here is cheap relative to what it saves on the public read path.
export async function touchZoneGuideVersions(env, zoneId) {
    if (!env.GUIDE_CACHE || !zoneId) return;
    const apts = await env.DB.prepare(
        'SELECT slug FROM guide_apartments WHERE zone_id = ? AND is_active = TRUE'
    ).bind(zoneId).all();
    const now = String(Date.now());
    await Promise.all((apts.results || []).map(a => env.GUIDE_CACHE.put(`ver:apt:${a.slug}`, now)));
}

// Platform store items (guide_store_items.owner_type='platform') and zone-restaurant
// links are visible on every apartment's guide, not just one apartment or one zone —
// there's no single cache key to bump for those, so touch every active apartment.
// Admin-only write path (rare), so the extra D1 read is cheap relative to what it saves
// on the public read path.
export async function touchAllGuideVersions(env) {
    if (!env.GUIDE_CACHE) return;
    const apts = await env.DB.prepare(
        'SELECT slug FROM guide_apartments WHERE is_active = TRUE'
    ).all();
    const now = String(Date.now());
    await Promise.all((apts.results || []).map(a => env.GUIDE_CACHE.put(`ver:apt:${a.slug}`, now)));
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
