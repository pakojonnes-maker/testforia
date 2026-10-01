// scripts/poi-seed/lib/google.mjs — Google Places (API New) para el sembrador de POIs.
// =============================================================================
// Mismo coste que el importador del admin (workerGuideImport.js):
//  - Text Search con field mask "places.id" (SKU "IDs Only"): gratis siempre.
//  - Place Details SIN editorialSummary ni fotos: el campo más caro de la máscara
//    (rating, horario, web, teléfono) es del tramo Enterprise, 1.000 llamadas
//    gratis al mes. Se queda FUERA a propósito lo de Atmosphere (editorialSummary,
//    reviews) y las fotos: el texto lo escribimos nosotros y las fotos de Google
//    no se pueden guardar.
//
// Todo se cachea en .cache/google/ (ignorado por git): relanzar el script no
// vuelve a llamar a Google salvo que cambie la consulta de un POI. MONTHLY_CAP es
// un freno propio, por debajo de los 1.000 gratuitos, porque el importador del
// admin gasta de la misma bolsa y no ve este contador.
// =============================================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const BASE = 'https://places.googleapis.com/v1';
const DETAILS_MASK = [
    'id', 'displayName', 'formattedAddress', 'shortFormattedAddress', 'location',
    'types', 'primaryType', 'googleMapsUri', 'websiteUri', 'internationalPhoneNumber',
    'regularOpeningHours.weekdayDescriptions', 'rating', 'userRatingCount', 'businessStatus',
].join(',');
const MONTHLY_CAP = 350;

/** La clave sale del entorno o de .dev.vars (el fichero de secretos locales de wrangler, ignorado por git). */
export function loadApiKey(repoRoot) {
    if (process.env.GOOGLE_PLACES_API_KEY) return process.env.GOOGLE_PLACES_API_KEY.trim();
    const devVars = join(repoRoot, '.dev.vars');
    if (existsSync(devVars)) {
        const vars = readFileSync(devVars, 'utf8').split(/\r?\n/)
            .map(l => l.match(/^\s*([\w.-]+)\s*=\s*(.*)$/)).filter(Boolean)
            .map(([, name, value]) => [name, value.trim().replace(/^["']|["']$/g, '')]);
        // Por nombre, o la primera variable cuyo valor tenga forma de clave de API de
        // Google (AIza + 35): así vale aunque la línea se llame de otra manera.
        const hit = vars.find(([n]) => n === 'GOOGLE_PLACES_API_KEY') || vars.find(([, v]) => /^AIza[\w-]{35}$/.test(v));
        if (hit) return hit[1];
    }
    return null;
}

function month() {
    return new Date().toISOString().slice(0, 7);
}

export class PlacesClient {
    constructor({ apiKey, cacheDir }) {
        this.apiKey = apiKey;
        this.cacheDir = cacheDir;
        this.budgetPath = join(cacheDir, '_budget.json');
        mkdirSync(cacheDir, { recursive: true });
        const saved = existsSync(this.budgetPath) ? JSON.parse(readFileSync(this.budgetPath, 'utf8')) : {};
        this.budget = saved.month === month() ? saved : { month: month(), details: 0, searches: 0 };
    }

    saveBudget() {
        writeFileSync(this.budgetPath, JSON.stringify(this.budget, null, 1));
    }

    cachePath(zoneSlug, key) {
        return join(this.cacheDir, zoneSlug, `${key}.json`);
    }

    readCache(zoneSlug, key) {
        const p = this.cachePath(zoneSlug, key);
        return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
    }

    async searchId(query, bias) {
        const body = { textQuery: query, maxResultCount: 1, languageCode: 'es', regionCode: 'ES' };
        if (bias) body.locationBias = { circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: bias.radius } };
        const res = await fetch(`${BASE}/places:searchText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': this.apiKey, 'X-Goog-FieldMask': 'places.id' },
            body: JSON.stringify(body),
        });
        this.budget.searches++;
        if (!res.ok) throw new Error(`Text Search ${res.status}: ${(await res.text()).slice(0, 300)}`);
        const data = await res.json();
        return data.places?.[0]?.id || null;
    }

    async details(placeId) {
        if (this.budget.details >= MONTHLY_CAP) {
            throw new Error(`Tope propio de ${MONTHLY_CAP} Place Details este mes alcanzado (.cache/google/_budget.json).`);
        }
        const res = await fetch(`${BASE}/places/${encodeURIComponent(placeId)}?languageCode=es&regionCode=ES`, {
            headers: { 'X-Goog-Api-Key': this.apiKey, 'X-Goog-FieldMask': DETAILS_MASK },
        });
        this.budget.details++;
        if (!res.ok) throw new Error(`Place Details ${res.status}: ${(await res.text()).slice(0, 300)}`);
        return res.json();
    }

    /**
     * Resuelve un POI y lo deja en caché. Si la caché ya tiene la MISMA consulta
     * (o el mismo place_id fijado a mano), no se llama a Google.
     */
    async resolve(zoneSlug, key, { query, placeId, bias }) {
        const cached = this.readCache(zoneSlug, key);
        if (cached && cached.query === (placeId || query)) return { ...cached, fromCache: true };

        const id = placeId || await this.searchId(query, bias);
        const entry = { query: placeId || query, placeId: id, place: id ? await this.details(id) : null, fetched_at: new Date().toISOString() };
        const p = this.cachePath(zoneSlug, key);
        mkdirSync(dirname(p), { recursive: true });
        writeFileSync(p, JSON.stringify(entry, null, 1));
        this.saveBudget();
        return { ...entry, fromCache: false };
    }
}
