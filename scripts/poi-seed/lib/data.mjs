// scripts/poi-seed/lib/data.mjs — carga de fichas y utilidades comunes.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const ACTIVE_LANGUAGES = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'ar', 'ru', 'uk', 'zh', 'ja', 'ko'];

// Deben coincidir con CATEGORIES de GuidePoisPage.tsx y TYPE_TO_CATEGORY de workerGuideImport.js.
export const CATEGORIES = ['Cultura', 'Naturaleza', 'Playas', 'Compras', 'Actividades', 'Restaurantes', 'Otro'];
// Comentario de migrations/0059_unify_guide_pois.sql.
export const POI_TYPES = ['sight', 'attraction', 'museum', 'beach', 'nature', 'service', 'experience'];
export const ACCESS_TYPES = ['free', 'paid', 'mixed'];

/**
 * Fichas de data/ con sus textos ya fundidos en `poi.i18n` y `zone.i18n`.
 *
 * El texto vive aparte, en text/<zona>/<idioma>.json ({ "<key o id>": { name,
 * description, short_tip }, "_zone": { name, description } }), porque se escribe
 * idioma a idioma y así cada fichero se revisa entero de una vez. Un campo que no
 * aparece en ningún idioma no se toca en la base: en un POI que ya existe, poner
 * solo `short_tip` cambia el consejo y deja intactos su nombre y su descripción.
 */
export function loadZones(dataDir, only) {
    const files = readdirSync(dataDir).filter(f => f.endsWith('.json')).sort();
    const textRoot = join(dataDir, '..', 'text');
    const zones = files.map(f => {
        const z = { file: f, ...JSON.parse(readFileSync(join(dataDir, f), 'utf8')) };
        const byKey = new Map(z.pois.map(p => [poiKey(p), p]));
        const dir = join(textRoot, z.zone.slug);
        if (!existsSync(dir)) return z;
        for (const lf of readdirSync(dir).filter(n => n.endsWith('.json'))) {
            const lang = lf.replace('.json', '');
            if (!ACTIVE_LANGUAGES.includes(lang)) throw new Error(`text/${z.zone.slug}/${lf}: idioma no activo`);
            const texts = JSON.parse(readFileSync(join(dir, lf), 'utf8'));
            for (const [key, fields] of Object.entries(texts)) {
                const target = key === '_zone' ? z.zone : byKey.get(key);
                if (!target) throw new Error(`text/${z.zone.slug}/${lf}: «${key}» no está en data/${f}`);
                target.i18n ??= {};
                for (const [field, value] of Object.entries(fields)) {
                    (target.i18n[field] ??= {})[lang] = value;
                }
            }
        }
        return z;
    });
    if (!only || only === 'all') return zones;
    const picked = zones.filter(z => z.zone.slug === only);
    if (picked.length === 0) throw new Error(`No hay ficha para la zona "${only}" en data/ (hay: ${zones.map(z => z.zone.slug).join(', ')})`);
    return picked;
}

/** Volcado de producción (lo deja scripts/poi-seed/README.md → «Volcado»). */
export function loadExisting(cacheDir) {
    const p = join(cacheDir, 'existing.json');
    if (!existsSync(p)) throw new Error('Falta .cache/existing.json: haz primero el volcado de producción (README).');
    return JSON.parse(readFileSync(p, 'utf8'));
}

/** Clave estable de un POI dentro de su zona: su id si ya existe, su `key` si es nuevo. */
export const poiKey = (poi) => poi.id || poi.key;

export function newPoiId(zone, poi) {
    return `poi_${zone.slug.replace(/-/g, '_')}_${poi.key.replace(/-/g, '_')}`;
}

export function distanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

function normalize(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Parecido entre nuestro nombre y el de Google, de 0 a 1: la proporción de palabras
 * significativas de la más corta que aparecen en la otra. Es solo un aviso para
 * revisar a ojo («Puente Nuevo» frente a «Puente Nuevo de Ronda» da 1).
 */
export function nameOverlap(a, b) {
    const stop = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'museo', 'iglesia', 'malaga', 'ronda', 'mijas', 'fuengirola', 'torremolinos', 'benalmadena']);
    const words = s => normalize(s).split(' ').filter(w => w.length > 2 && !stop.has(w));
    const wa = words(a), wb = new Set(words(b));
    const [short, long] = wa.length <= wb.size ? [wa, wb] : [[...wb], new Set(wa)];
    if (short.length === 0) return 1;
    return short.filter(w => long.has(w)).length / short.length;
}
