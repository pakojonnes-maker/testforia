#!/usr/bin/env node
// scripts/poi-seed/enrich.mjs
// =============================================================================
// Paso 1: resuelve cada POI de las fichas contra Google Places y lo deja en
// .cache/google/<zona>/<poi>.json. No escribe en ninguna base de datos.
//
//   node scripts/poi-seed/enrich.mjs [<slug-de-zona>|all]
//
// Necesita GOOGLE_PLACES_API_KEY en el entorno o en .dev.vars. Lo ya resuelto
// sale de la caché sin llamar a Google; para forzar una nueva búsqueda, cambia la
// `query` del POI en su ficha o fija su `place_id`.
// =============================================================================

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PlacesClient, loadApiKey } from './lib/google.mjs';
import { loadZones, poiKey, distanceKm, nameOverlap } from './lib/data.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

const apiKey = loadApiKey(ROOT);
if (!apiKey) {
    console.error('Falta GOOGLE_PLACES_API_KEY: añade la línea GOOGLE_PLACES_API_KEY=... a .dev.vars (ignorado por git).');
    process.exit(1);
}

const client = new PlacesClient({ apiKey, cacheDir: join(HERE, '.cache', 'google') });
const zones = loadZones(join(HERE, 'data'), process.argv[2]);

let calls = 0;
for (const { zone, pois } of zones) {
    console.log(`\n${zone.name}`);
    const bias = { lat: zone.latitude, lng: zone.longitude, radius: zone.search_radius_m || 15000 };
    for (const poi of pois) {
        if (poi.deactivate || (!poi.query && !poi.place_id)) continue;
        const label = poi.i18n?.name?.es || poi.id || poi.key;
        try {
            const r = await client.resolve(zone.slug, poiKey(poi), { query: poi.query, placeId: poi.place_id, bias });
            if (!r.fromCache) calls++;
            if (!r.place) {
                console.log(`  ✗ ${label} — Google no encontró nada para «${poi.query}»`);
                continue;
            }
            const km = distanceKm(zone.latitude, zone.longitude, r.place.location.latitude, r.place.location.longitude);
            const overlap = poi.i18n?.name?.es ? nameOverlap(poi.i18n.name.es, r.place.displayName?.text) : 1;
            const flags = [];
            if (km > (poi.max_km ?? zone.max_km ?? 8)) flags.push(`a ${km.toFixed(1)} km`);
            if (overlap < 0.5) flags.push('nombre distinto');
            if (r.place.businessStatus && r.place.businessStatus !== 'OPERATIONAL') flags.push(r.place.businessStatus);
            console.log(`  ${flags.length ? '!' : '✓'} ${label} → ${r.place.displayName?.text}${flags.length ? `  [${flags.join(', ')}]` : ''}`);
        } catch (err) {
            console.log(`  ✗ ${label} — ${err.message}`);
            if (/Tope propio/.test(err.message)) process.exit(1);
        }
    }
}
console.log(`\nLlamadas nuevas a Google: ${calls}. Este mes: ${client.budget.details} Place Details, ${client.budget.searches} búsquedas.`);
