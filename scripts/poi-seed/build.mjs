#!/usr/bin/env node
// scripts/poi-seed/build.mjs
// =============================================================================
// Paso 2: cruza las fichas (data/*.json), lo resuelto en Google (.cache/google) y
// el volcado de producción (.cache/existing.json, .cache/place_ids.json) y genera,
// por zona:
//   out/<zona>.sql         lo que se aplica con `wrangler d1 execute --remote --file`
//   out/<zona>.review.md   lo que hay que mirar antes de aplicarlo
//
//   node scripts/poi-seed/build.mjs [<slug-de-zona>|all]
//
// NO aplica nada (misma razón que scripts/demo-seed: wrangler lanzado desde Node
// pasaría por debajo del hook pre-deploy-guard). Sin red: solo lee cachés.
//
// Por qué SQL y no los endpoints del admin: cada POST /guide/admin/pois llama a
// touchZoneGuideVersions, que escribe en KV una vez por apartamento de la zona,
// y el importador suma dos escrituras más por ficha. Con la cuenta en Workers
// Free (1.000 escrituras de KV al día para TODA la cuenta) un lote de 100 POIs
// se comería la mitad del día. Aquí se invalida la caché una sola vez por zona,
// al final (ver los comandos que imprime este script).
// =============================================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    ACTIVE_LANGUAGES, CATEGORIES, POI_TYPES, ACCESS_TYPES,
    loadZones, loadExisting, poiKey, newPoiId, distanceKm, nameOverlap,
} from './lib/data.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE = join(HERE, '.cache');
const KV_NAMESPACE_ID = '89c387501e00410b9d4f0d80dc563bf2'; // GUIDE_CACHE (wrangler.toml)
const POI_FIELDS = ['name', 'description', 'short_tip'];
const ZONE_FIELDS = ['name', 'description'];
// Lo que una ficha puede fijar a mano en `set` (subconjunto de POI_WRITABLE_FIELDS de workerGuideAdmin.js).
const SETTABLE = ['category', 'subcategory', 'poi_type', 'access_type', 'price_display', 'price_amount',
    'duration_text', 'website_url', 'is_bookable', 'order_index', 'action_type', 'action_data'];

function lit(value) {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
    if (typeof value === 'boolean') return value ? '1' : '0';
    return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Traducciones de los campos que trae la ficha. Se borran SOLO esos campos de esa
 * entidad y se reinsertan: un DELETE por entidad entera se llevaría por delante
 * campos que no son nuestros (cta_label de una experiencia, por ejemplo). Y
 * DELETE + INSERT en vez de ON CONFLICT porque la D1 local y la de producción no
 * tienen la misma restricción única en `translations` (ver scripts/demo-seed/lib/sql.mjs).
 */
function translationSql(entityId, entityType, i18n, fields, warnings, label) {
    const present = fields.filter(f => i18n?.[f]);
    if (present.length === 0) return [];
    const rows = [];
    for (const field of present) {
        const missing = ACTIVE_LANGUAGES.filter(l => !String(i18n[field][l] || '').trim());
        if (missing.length) warnings.push(`${label}: «${field}» sin ${missing.join(', ')}`);
        for (const lang of ACTIVE_LANGUAGES) {
            const v = String(i18n[field][lang] || '').trim();
            if (v) rows.push(`  (${lit(entityId)}, ${lit(entityType)}, ${lit(lang)}, ${lit(field)}, ${lit(v)})`);
        }
    }
    return [
        `DELETE FROM translations WHERE entity_id = ${lit(entityId)} AND entity_type = ${lit(entityType)} AND field IN (${present.map(lit).join(', ')});`,
        `INSERT INTO translations (entity_id, entity_type, language_code, field, value) VALUES\n${rows.join(',\n')};`,
    ];
}

/** Columnas que salen de Google. `keepIfSet` = no pisar lo que ya puso alguien a mano. */
function googleColumns(place) {
    return {
        latitude: place.location?.latitude ?? null,
        longitude: place.location?.longitude ?? null,
        google_place_id: place.id,
        external_id: place.id,
        google_maps_url: place.googleMapsUri || null,
        address: place.shortFormattedAddress || place.formattedAddress || null,
        website_url: place.websiteUri || null,
        phone: place.internationalPhoneNumber || null,
        opening_hours: place.regularOpeningHours?.weekdayDescriptions?.join('\n') || null,
        // Semilla de nuestra nota, igual que hace el importador del admin.
        rating: place.rating ?? null,
        google_rating: place.rating ?? null,
        google_rating_count: place.userRatingCount ?? null,
        google_primary_type: place.primaryType || null,
        google_types: place.types ? JSON.stringify(place.types) : null,
        business_status: place.businessStatus || null,
    };
}
const KEEP_IF_SET = ['website_url', 'phone'];

function validate(poi, label, errors, warnings) {
    if (poi.category && !CATEGORIES.includes(poi.category)) errors.push(`${label}: categoría «${poi.category}» no existe`);
    if (poi.poi_type && !POI_TYPES.includes(poi.poi_type)) errors.push(`${label}: poi_type «${poi.poi_type}» no existe`);
    const access = poi.access_type ?? poi.set?.access_type;
    if (access && !ACCESS_TYPES.includes(access)) errors.push(`${label}: access_type «${access}» no existe`);
    const price = poi.price_display ?? poi.set?.price_display;
    if (access === 'paid' && !price) warnings.push(`${label}: de pago sin precio (saldrá «De pago»)`);
    if (access === 'free' && price) warnings.push(`${label}: gratis con precio «${price}» (el precio no se verá)`);
}

const existing = loadExisting(CACHE);
const existingById = new Map(existing.map(r => [r.id, r]));
// place_id de TODA la tabla guide_pois (también restaurantes y otras zonas): el
// índice único idx_guide_pois_google_place_id es global, no por zona.
const placeIdsPath = join(CACHE, 'place_ids.json');
if (!existsSync(placeIdsPath)) {
    console.error('Falta .cache/place_ids.json: haz el volcado de producción (README).');
    process.exit(1);
}
const placeOwner = new Map(JSON.parse(readFileSync(placeIdsPath, 'utf8')).map(r => [r.google_place_id, r.id]));
const apartments = existsSync(join(CACHE, 'apartments.json')) ? JSON.parse(readFileSync(join(CACHE, 'apartments.json'), 'utf8')) : null;

const zones = loadZones(join(HERE, 'data'), process.argv[2]);
mkdirSync(join(HERE, 'out'), { recursive: true });
let failed = false;
const kvKeys = new Set();

for (const { zone, pois, file } of zones) {
    const errors = [];
    const warnings = [];
    const sql = [
        `-- ${zone.name}: generado por scripts/poi-seed/build.mjs desde data/${file} el ${new Date().toISOString()}`,
        `-- Aplicar: npx wrangler d1 execute restaurant-menu-saas --remote --file=scripts/poi-seed/out/${zone.slug}.sql`,
    ];
    const review = [`# ${zone.name} — revisión antes de aplicar\n`,
        '| | Nuestro nombre | Google | km | Acceso | Avisos |', '|---|---|---|---|---|---|'];
    const counts = { nuevos: 0, actualizados: 0, desactivados: 0 };

    if (zone.create) {
        sql.push(`\n-- Zona nueva`,
            `INSERT INTO guide_zones (id, name, slug, country, region, latitude, longitude) VALUES (${[zone.id, zone.name, zone.slug, zone.country || 'ES', zone.region, zone.latitude, zone.longitude].map(lit).join(', ')})\n` +
            `  ON CONFLICT(id) DO UPDATE SET name = excluded.name, region = excluded.region, latitude = excluded.latitude, longitude = excluded.longitude, modified_at = CURRENT_TIMESTAMP;`);
        kvKeys.add('ver:zonecatalog');
    }
    sql.push(...translationSql(zone.id, 'zone', zone.i18n, ZONE_FIELDS, warnings, `zona ${zone.slug}`));

    // Las desactivaciones van primero y sueltan su place_id: el índice único es
    // global y no mira is_active, así que un duplicado desactivado que conservara
    // el place_id impediría dárselo a la ficha buena (caso del Teleférico).
    const ordered = [...pois.filter(p => p.deactivate), ...pois.filter(p => !p.deactivate)];
    for (const poi of ordered.filter(p => p.deactivate)) {
        const pid = existingById.get(poi.id)?.google_place_id;
        if (pid && placeOwner.get(pid) === poi.id) placeOwner.delete(pid);
    }

    const seenPlaces = new Map();
    ordered.forEach((poi) => {
        const index = pois.indexOf(poi);
        const key = poiKey(poi);
        const label = poi.i18n?.name?.es || existingById.get(poi.id)?.tr?.['es.name'] || key;
        const row = poi.id ? existingById.get(poi.id) : null;
        if (poi.id && !row) { errors.push(`${label}: el id ${poi.id} no está en el volcado de producción`); return; }
        if (row && row.zone_id !== zone.id) { errors.push(`${label}: ${poi.id} es de ${row.zone_id}, no de ${zone.id}`); return; }
        validate(poi, label, errors, warnings);

        if (poi.deactivate) {
            sql.push(`\n-- ${label}: desactivar (${poi.reason || 'sin motivo'})`,
                `UPDATE guide_pois SET is_active = 0, google_place_id = NULL, modified_at = CURRENT_TIMESTAMP WHERE id = ${lit(poi.id)};`);
            review.push(`| ⊘ | ${label} | — | — | — | desactivar: ${poi.reason || ''} |`);
            counts.desactivados++;
            return;
        }

        const cachePath = join(CACHE, 'google', zone.slug, `${key}.json`);
        const cached = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : null;
        const wantsGoogle = Boolean(poi.query || poi.place_id);
        if (wantsGoogle && !cached) errors.push(`${label}: sin resolver en Google (lanza enrich.mjs)`);
        const stale = wantsGoogle && cached && cached.query !== (poi.place_id || poi.query);
        if (stale) errors.push(`${label}: la consulta cambió desde la última resolución (relanza enrich.mjs)`);
        const place = stale ? null : cached?.place || null;
        if (wantsGoogle && cached && !stale && !place) errors.push(`${label}: Google no encontró «${poi.query}»`);

        const flags = [];
        let km = null;
        if (place) {
            const owner = placeOwner.get(place.id);
            const id = row ? row.id : newPoiId(zone, poi);
            if (owner && owner !== id) errors.push(`${label}: Google lo resuelve al place_id de ${owner}, que ya existe (duplicado)`);
            if (seenPlaces.has(place.id)) errors.push(`${label}: mismo sitio de Google que ${seenPlaces.get(place.id)}`);
            seenPlaces.set(place.id, label);
            km = distanceKm(zone.latitude, zone.longitude, place.location.latitude, place.location.longitude);
            if (km > (poi.max_km ?? zone.max_km ?? 8)) flags.push(`lejos (${km.toFixed(1)} km)`);
            if (poi.i18n?.name?.es && nameOverlap(poi.i18n.name.es, place.displayName?.text) < 0.5) flags.push('nombre distinto');
            if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') flags.push(place.businessStatus);
            if (row?.latitude != null) {
                const moved = distanceKm(row.latitude, row.longitude, place.location.latitude, place.location.longitude) * 1000;
                if (moved > 400) flags.push(`el pin se mueve ${Math.round(moved)} m`);
            }
        }
        const access = poi.access_type ?? poi.set?.access_type ?? row?.access_type ?? 'free';
        const price = poi.price_display ?? poi.set?.price_display ?? row?.price_display ?? '';
        review.push(`| ${row ? '✎' : '+'} | ${label} | ${place?.displayName?.text || '—'} | ${km == null ? '—' : km.toFixed(1)} | ${access}${price ? ` ${price}` : ''} | ${flags.join(', ')} |`);
        if (flags.length) warnings.push(`${label}: ${flags.join(', ')}`);

        if (!row) {
            // ---------------------------------------------------------- POI nuevo
            const id = newPoiId(zone, poi);
            if (!wantsGoogle && poi.latitude == null) errors.push(`${label}: nuevo sin Google ni coordenadas`);
            for (const f of POI_FIELDS) if (!poi.i18n?.[f]?.es) errors.push(`${label}: falta «${f}» en español`);
            const cols = {
                id, zone_id: zone.id,
                category: poi.category, poi_type: poi.poi_type || 'sight', subcategory: poi.subcategory ?? null,
                access_type: access, price_display: price || null, price_amount: poi.price_amount ?? null, price_currency: 'EUR',
                duration_text: poi.duration_text ?? null,
                is_bookable: 0, is_active: 1, order_index: poi.order_index ?? 1000 + index,
                source: 'google_places',
                ...(place ? googleColumns(place) : { latitude: poi.latitude, longitude: poi.longitude }),
                google_synced_at: place ? cached.fetched_at : null,
            };
            if (poi.website_url) cols.website_url = poi.website_url;
            const names = Object.keys(cols);
            const updates = names.filter(c => c !== 'id' && c !== 'zone_id').map(c => `${c} = excluded.${c}`);
            sql.push(`\n-- + ${label}`,
                `INSERT INTO guide_pois (${names.join(', ')}) VALUES (${names.map(c => lit(cols[c])).join(', ')})\n  ON CONFLICT(id) DO UPDATE SET ${updates.join(', ')}, modified_at = CURRENT_TIMESTAMP;`,
                ...translationSql(id, 'poi', poi.i18n, POI_FIELDS, warnings, label));
            counts.nuevos++;
        } else {
            // ------------------------------------------------- POI que ya existe
            const sets = {};
            for (const [k, v] of Object.entries(poi.set || {})) {
                if (!SETTABLE.includes(k)) errors.push(`${label}: «${k}» no se puede fijar desde la ficha`);
                else sets[k] = v;
            }
            if (place && poi.google !== false) {
                for (const [k, v] of Object.entries(googleColumns(place))) {
                    if (v == null || k in sets) continue;
                    if (KEEP_IF_SET.includes(k) && row[k]) continue;
                    sets[k] = v;
                }
                sets.google_synced_at = cached.fetched_at;
                if (row.source === 'manual') sets.source = 'google_places';
            }
            const assignments = Object.entries(sets).map(([k, v]) => `${k} = ${lit(v)}`);
            const tr = translationSql(row.id, 'poi', poi.i18n, POI_FIELDS, warnings, label);
            if (assignments.length === 0 && tr.length === 0) return;
            sql.push(`\n-- ✎ ${label}`);
            if (assignments.length) sql.push(`UPDATE guide_pois SET ${assignments.join(', ')}, modified_at = CURRENT_TIMESTAMP WHERE id = ${lit(row.id)};`);
            sql.push(...tr);
            counts.actualizados++;
        }
    });

    // Los POIs de producción que la ficha no menciona se quedan como están, pero
    // se listan: casi siempre es un olvido al escribir la ficha.
    const mentioned = new Set(pois.filter(p => p.id).map(p => p.id));
    const untouched = existing.filter(r => r.zone_id === zone.id && r.is_active && !mentioned.has(r.id));
    for (const r of untouched) warnings.push(`sin tocar (no está en la ficha): ${r.tr?.['es.name'] || r.id}`);

    kvKeys.add(`ver:zone:${zone.slug}`);
    for (const a of apartments?.filter(a => a.zone_id === zone.id) || []) kvKeys.add(`ver:apt:${a.slug}`);

    const summary = `${counts.nuevos} nuevos · ${counts.actualizados} actualizados · ${counts.desactivados} desactivados`;
    review.splice(1, 0, `${summary}\n`,
        errors.length ? `## Errores (no se genera el SQL)\n\n${errors.map(e => `- ${e}`).join('\n')}\n` : '',
        warnings.length ? `## Avisos\n\n${warnings.map(w => `- ${w}`).join('\n')}\n` : '', '## POIs\n');
    writeFileSync(join(HERE, 'out', `${zone.slug}.review.md`), review.join('\n') + '\n');
    if (errors.length) {
        failed = true;
        console.log(`✗ ${zone.name}: ${errors.length} errores — out/${zone.slug}.review.md`);
        errors.slice(0, 8).forEach(e => console.log(`    ${e}`));
    } else {
        writeFileSync(join(HERE, 'out', `${zone.slug}.sql`), sql.join('\n') + '\n');
        console.log(`✓ ${zone.name}: ${summary}${warnings.length ? ` · ${warnings.length} avisos` : ''} — out/${zone.slug}.sql`);
    }
}

if (!apartments) console.log('\n(Sin .cache/apartments.json: los comandos de caché no incluyen los apartamentos.)');
console.log('\nTras aplicar el SQL, invalidar la caché del guide (una escritura de KV por clave):');
for (const k of kvKeys) {
    console.log(`  npx wrangler kv key put --namespace-id=${KV_NAMESPACE_ID} "${k}" "$(date +%s%3N)" --remote`);
}
process.exit(failed ? 1 : 0);
