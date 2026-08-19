// workerGuideTranslate.js — Traducción automática de contenido del guidebook
// =====================================================
// Endpoint: POST /guide/admin/translate   (superadmin)
//
// Rellena la tabla `translations` en los 13 idiomas activos a partir del
// contenido en español, usando Workers AI. Nace para el importador de Google
// Maps (workerGuideImport.js): un POI importado llega solo con `es` (la
// editorialSummary de Google), y sin esto se quedaba monolingüe para siempre.
// Como trabaja sobre `translations` genérica y no sobre guide_pois, sirve
// igual para cualquier entity_type que ya use saveTranslations.
//
// ---------------------------------------------------------------------------
// POR QUÉ ES UN ENDPOINT APARTE Y NO UN HOOK DENTRO DE createPOI/updatePOI
// ---------------------------------------------------------------------------
// Un lote de importación son hasta 20 POIs. Traducir dentro del POST/PUT
// añadiría ~3 llamadas de IA (varios segundos) a CADA guardado, y peor: una
// caída de Workers AI o un 429 haría fallar el guardado del POI, que es el
// dato que de verdad importa. Separándolo:
//   1. El POI se guarda siempre, pase lo que pase con la IA.
//   2. El admin puede reintentar solo la traducción sin retocar el POI.
//   3. Sirve de backfill para los POIs que ya existían antes de esto.
//
// ---------------------------------------------------------------------------
// COSTE: POR QUÉ ESTO NO PUEDE GENERAR UNA FACTURA
// ---------------------------------------------------------------------------
// En el plan Workers Free no existe facturación por exceso: al agotar las
// 10.000 neuronas/día, Workers AI devuelve error 3036 / HTTP 429 y ya está
// (docs: workers-ai/platform/errors). Para que hubiera cargos habría que
// contratar Workers Paid a mano. Aun así, este módulo NO se apoya solo en eso:
//
//   - Presupuesto diario propio (TRANSLATE_NEURON_BUDGET): 6.000 de las 10.000
//     neuronas del día, dejando ~4.000 garantizadas al asistente IA del huésped
//     (workerGuideAI.js). Se contabiliza el gasto REAL leyendo el `usage` que
//     devuelve Workers AI, no un número de llamadas. Sin esto, un backfill de
//     todo el catálogo dejaría a los huéspedes sin chat hasta las 00:00 UTC —
//     el riesgo real aquí es de disponibilidad, no de dinero.
//   - Límite por usuario (anti-bucle si el admin le da mil veces al botón).
//   - Todo pasa por el AI Gateway 'guidebook-ai', que ya tiene configurado un
//     spend limit real de $5/día impuesto por Cloudflare en el borde. Hoy en
//     plan Free ese tope nunca se dispara (el coste siempre es $0), pero es el
//     seguro que se activa solo si algún día se sube a Workers Paid.
//   - Los textos de entrada se truncan (MAX_FIELD_CHARS) y max_tokens está
//     acotado: una descripción kilométrica no puede disparar el gasto.
//
// El coste real depende de cuánto texto tenga cada campo, así que varía
// entidad a entidad — y grupos más pequeños (LANG_GROUP_SIZE) cuestan algo
// más EN TOTAL por entidad que grupos grandes, porque el system prompt se
// repite en cada llamada. Es el precio de no truncar el JSON de salida (ver
// el porqué junto a LANG_GROUP_SIZE). El presupuesto de 6.000 sigue dando
// para decenas de POIs al día; la respuesta del endpoint devuelve el gasto
// exacto en `usage`, así que ese número se puede contrastar con la realidad
// en vez de creérselo.
// =====================================================

import { verifyJWT, hitRateLimit } from './workerAuthentication.js';
import { ACTIVE_LANGUAGES } from './workerGuideAdmin.js';
import { touchZoneGuideVersions } from './workerGuideCache.js';

// Gemma 4 26B A4B: mixture-of-experts (26B totales, ~4B activos), por eso
// cuesta lo mismo que un 8B denso (9.091 neuronas/M entrada, 27.273/M salida)
// rindiendo bastante más. Se elige sobre llama-3.1-8b-instruct-fp8 (el del
// chatbot) por idiomas: la model card de Llama 3.1 solo cubre oficialmente
// en/de/fr/it/pt/hi/es/th — se deja fuera ar, ru, uk, zh, ja, ko y ca, que son
// 7 de nuestros 13. Confirmado disponible en plan Free en el changelog de
// Cloudflare del 2026-07-28 (el que movió kimi-k2.6 y glm-5.2 a solo-pago).
const TRANSLATE_MODEL = '@cf/google/gemma-4-26b-a4b-it';

// El mismo gateway que el chatbot: reutiliza su spend limit y deja las
// traducciones visibles en las analíticas junto al resto del gasto de IA.
const AI_GATEWAY_ID = 'guidebook-ai';

// Tarifas publicadas de TRANSLATE_MODEL (workers-ai/platform/pricing). Si se
// cambia de modelo hay que cambiarlas aquí también, o el contador mentirá.
const NEURONS_PER_M_INPUT = 9091;
const NEURONS_PER_M_OUTPUT = 27273;

// 6.000 de las 10.000 neuronas gratis del día. Las ~4.000 restantes quedan para
// el asistente IA del huésped (workerGuideAI.js), que comparte la misma bolsa de
// la cuenta. Subir esto es exactamente lo que separa un backfill grande de
// dejar a los huéspedes sin chat hasta las 00:00 UTC.
const TRANSLATE_NEURON_BUDGET = 6000;
const BUDGET_KEY = 'translate:neurons:daily';
const BUDGET_WINDOW_SECONDS = 86400;

// Cuando Workers AI no devuelve `usage` (no está garantizado en todos los
// modelos ni en todos los caminos), se imputa esto en vez de 0. Contar 0 haría
// que el presupuesto no avanzara nunca y el cortafuegos no serviría de nada.
// Es una sobreestimación deliberada: ~17 es el coste típico de una llamada.
const FALLBACK_NEURONS_PER_CALL = 25;

// Red de seguridad anti-bucle por usuario, no un límite de negocio.
const TRANSLATE_PER_USER = { limit: 120, windowSeconds: 3600 };

const MAX_ENTITIES_PER_REQUEST = 25;
// Acota el peor caso de tokens de salida: el modelo no puede devolver más de
// lo que se le da, y lo que se le da está capado.
const MAX_FIELD_CHARS = 1200;
// Los idiomas se piden en grupos: un JSON con los 12 de golpe se llevaría por
// delante los 12 si el formato falla. Grupos de 4 tampoco bastaban de
// verdad: en producción (2026-08-19) un POI con un solo campo pobló el tope
// de max_tokens en las 2 llamadas de 4 idiomas que sí respondieron — el JSON
// salía cortado a mitad, parseModelJson no podía parsearlo, y las 3
// importaciones que se habían hecho hasta entonces se quedaron con 0 de 12
// idiomas escritos (gastando las neuronas igual) sin que la UI lo avisara.
// Grupos de 2 con más margen de tokens (ver max_tokens en translateGroup) es
// lo que de verdad le cabe al modelo con los 3 campos (description/
// short_tip/cta_label) a la vez sin arriesgarse a cortar el JSON.
const LANG_GROUP_SIZE = 2;

// Campos que se traducen por defecto. `name` se queda FUERA a propósito: los
// nombres de POI son nombres propios ("El Pimpi", "Cueva de Nerja") y un
// huésped japonés necesita leer el mismo rótulo que verá en la calle. Se puede
// forzar pasando `fields` explícitamente si algún día interesa (p. ej. para
// nombres genéricos tipo "Mercado Central").
const DEFAULT_FIELDS = ['description', 'short_tip', 'cta_label'];

// Nombre nativo de cada idioma: un modelo traduce mejor con "français" que con
// el código ISO suelto, sobre todo en los pares menos frecuentes (ca, uk).
const LANGUAGE_NAMES = {
    es: 'español', en: 'English', fr: 'français', de: 'Deutsch', it: 'italiano',
    pt: 'português', ca: 'català', ar: 'العربية (árabe estándar moderno)',
    ru: 'русский', uk: 'українська', zh: '简体中文 (chino simplificado)',
    ja: '日本語', ko: '한국어',
};

const SOURCE_LANG = 'es'; // Fuente de verdad del proyecto (CLAUDE.md §5).

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function errorResponse(message, status = 400) {
    return jsonResponse({ success: false, error: message }, status);
}

function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

// ---------------------------------------------------------------------------
// Contabilidad de neuronas
// ---------------------------------------------------------------------------
// Workers AI devuelve `usage` (prompt_tokens / completion_tokens) en cada
// respuesta de generación de texto, así que el gasto no se estima: se lee. Se
// convierte a neuronas con las tarifas del modelo para poder (a) enseñarle al
// admin lo que ha costado cada ejecución y (b) cortar por gasto real en vez de
// por número de llamadas, que era solo un proxy.

/** @returns {number} neuronas consumidas por una llamada, según su `usage`. */
export function neuronsForUsage(usage) {
    const inTokens = usage?.prompt_tokens;
    const outTokens = usage?.completion_tokens;
    if (typeof inTokens !== 'number' || typeof outTokens !== 'number') {
        return FALLBACK_NEURONS_PER_CALL;
    }
    return (inTokens * NEURONS_PER_M_INPUT + outTokens * NEURONS_PER_M_OUTPUT) / 1_000_000;
}

/**
 * Estado del presupuesto diario, con ventana fija en KV al estilo de
 * hitRateLimit(). Sin binding de KV se deja pasar (y se avisa): quedarse sin
 * traductor porque falta un namespace sería peor que traducir sin contador, y
 * en plan Free el gasto no puede generar factura de todas formas.
 */
async function readBudget(env) {
    if (!env.RATE_LIMIT_KV) return { spent: 0, remaining: TRANSLATE_NEURON_BUDGET, resetsIn: 0, tracked: false };
    const now = Math.floor(Date.now() / 1000);
    try {
        const data = await env.RATE_LIMIT_KV.get(BUDGET_KEY, { type: 'json' });
        if (data && now - data.windowStart < BUDGET_WINDOW_SECONDS) {
            return {
                spent: data.spent,
                remaining: Math.max(0, TRANSLATE_NEURON_BUDGET - data.spent),
                resetsIn: BUDGET_WINDOW_SECONDS - (now - data.windowStart),
                windowStart: data.windowStart,
                tracked: true,
            };
        }
        return { spent: 0, remaining: TRANSLATE_NEURON_BUDGET, resetsIn: BUDGET_WINDOW_SECONDS, windowStart: now, tracked: true };
    } catch (err) {
        console.error('[GuideTranslate] No se pudo leer el presupuesto:', err.message);
        return { spent: 0, remaining: TRANSLATE_NEURON_BUDGET, resetsIn: 0, tracked: false };
    }
}

/**
 * Suma el gasto REAL después de la llamada. Consecuencia asumida: como el
 * cobro es posterior, una llamada puede rebasar el tope por su propio coste
 * (~17 neuronas) antes de que el corte actúe. Es la misma eventual consistency
 * que documentan los spend limits de AI Gateway, y a esta escala da igual.
 */
async function addSpentNeurons(env, neurons) {
    if (!env.RATE_LIMIT_KV || neurons <= 0) return;
    const now = Math.floor(Date.now() / 1000);
    try {
        const data = await env.RATE_LIMIT_KV.get(BUDGET_KEY, { type: 'json' });
        const inWindow = data && now - data.windowStart < BUDGET_WINDOW_SECONDS;
        const windowStart = inWindow ? data.windowStart : now;
        const spent = (inWindow ? data.spent : 0) + neurons;
        await env.RATE_LIMIT_KV.put(
            BUDGET_KEY,
            JSON.stringify({ spent, windowStart }),
            // El TTL cubre lo que resta de ventana, no la ventana entera: si no,
            // cada llamada la extendería y el presupuesto no se resetearía nunca.
            { expirationTtl: Math.max(60, BUDGET_WINDOW_SECONDS - (now - windowStart)) }
        );
    } catch (err) {
        console.error('[GuideTranslate] No se pudo apuntar el gasto:', err.message);
    }
}

// ---------------------------------------------------------------------------
// Llamada al modelo
// ---------------------------------------------------------------------------

function buildPrompt(sourceFields, targetLangs) {
    const langList = targetLangs.map(l => `"${l}" (${LANGUAGE_NAMES[l] || l})`).join(', ');

    const system = [
        'Eres un traductor profesional especializado en guías turísticas y alojamientos vacacionales.',
        'Traduces del español a otros idiomas manteniendo un tono cercano, claro y comercial.',
        '',
        'REGLAS:',
        '1. Devuelve ÚNICAMENTE un objeto JSON válido. Sin explicaciones, sin markdown, sin ```.',
        '2. La forma exacta es: {"<código_idioma>": {"<campo>": "<traducción>"}}.',
        '3. Traduce TODOS los campos que recibas, para TODOS los idiomas pedidos.',
        '4. Los nombres propios (restaurantes, playas, museos, calles, marcas) NO se traducen',
        '   ni se transliteran: se copian tal cual. Sí se traduce el descriptor genérico que',
        '   los acompaña ("Playa de la Malagueta" → "La Malagueta Beach").',
        '5. Conserva números, precios, horarios y URLs exactamente como están.',
        '6. No añadas información que no esté en el original ni inventes detalles.',
        '7. Respeta la longitud aproximada del original: es texto para una tarjeta, no un ensayo.',
    ].join('\n');

    const user = [
        `Idiomas destino: ${langList}.`,
        '',
        'Texto original en español:',
        JSON.stringify(sourceFields, null, 2),
        '',
        `Devuelve el JSON con una clave por cada idioma destino (${targetLangs.join(', ')}),`,
        `y dentro de cada una los campos: ${Object.keys(sourceFields).join(', ')}.`,
    ].join('\n');

    return [
        { role: 'system', content: system },
        { role: 'user', content: user },
    ];
}

/**
 * Extrae el objeto JSON de la respuesta del modelo. Aunque el prompt pide JSON
 * pelado, los modelos instruct devuelven de vez en cuando el objeto envuelto en
 * un bloque ```json o con una frase delante; recortar entre la primera '{' y la
 * última '}' cubre los dos casos sin depender de que el modelo obedezca.
 */
export function parseModelJson(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
        return JSON.parse(raw.slice(start, end + 1));
    } catch {
        return null;
    }
}

/**
 * Traduce un grupo de idiomas en una sola llamada.
 * @returns {Promise<{ ok: boolean, translations?: object, error?: string, budget?: boolean }>}
 */
async function translateGroup(env, sourceFields, targetLangs) {
    // El presupuesto se comprueba ANTES de llamar al modelo, igual que en
    // workerGuideAI.js: al agotarse, el coste marginal es cero de verdad, no
    // "una llamada que luego descartamos". El apunte del gasto sí va después,
    // porque hasta que no responde no se sabe cuánto ha costado.
    const budget = await readBudget(env);
    if (budget.tracked && budget.remaining <= 0) {
        return { ok: false, budget: true, error: 'daily_ai_budget_exhausted', neurons: 0 };
    }

    let response;
    try {
        response = await env.AI.run(
            TRANSLATE_MODEL,
            {
                messages: buildPrompt(sourceFields, targetLangs),
                // 1.400 no bastaba ni para 4 idiomas × 1 campo (ver el porqué
                // junto a LANG_GROUP_SIZE): el modelo llegaba al tope y el
                // JSON salía cortado. Con grupos de 2 este techo sigue
                // acotando el peor caso — una respuesta desbocada no puede
                // disparar el consumo de neuronas — pero con margen real
                // para los 3 campos.
                max_tokens: 3000,
                // Traducir no es escribir: se quiere reproducibilidad, no
                // creatividad.
                temperature: 0.2,
            },
            { gateway: { id: AI_GATEWAY_ID } }
        );
    } catch (err) {
        // Aquí caen tanto el 3036 (tier gratuito agotado) como el 3040 (sin
        // capacidad) y los errores de red. Se propaga el mensaje para que el
        // admin vea por qué no se tradujo, en vez de un fallo mudo.
        console.warn('[GuideTranslate] Workers AI falló:', err.message);
        // Si la llamada no llegó a completarse no hay nada que imputar: el
        // error incluye el 3036 (tier agotado), que no consume neuronas.
        return { ok: false, error: err.message || 'ai_error', neurons: 0 };
    }

    // Se apunta el gasto aunque la respuesta venga mal formada: el modelo ha
    // consumido igual, y no contarlo dejaría un agujero por el que una racha de
    // respuestas basura se saltaría el presupuesto entero.
    const neurons = neuronsForUsage(response?.usage);
    await addSpentNeurons(env, neurons);

    // gemma-4-26b-a4b-it es un modelo de razonamiento: NO devuelve el
    // {response: "texto"} clásico de Workers AI, sino el formato
    // chat-completions de OpenAI, con el texto en choices[0].message.content
    // (el razonamiento previo va aparte en .reasoning_content). Confirmado
    // con logs reales de producción (2026-08-19): response.response era
    // `undefined` en TODAS las llamadas desde que existe este módulo, así que
    // parseModelJson nunca tuvo nada que parsear — 0 traducciones guardadas
    // en las 3 importaciones hechas hasta este fix, pese a que las neuronas
    // sí se gastaban (`usage` vive en la raíz en ambos formatos, por eso el
    // contador de gasto siempre fue correcto y el bug no se notó ahí).
    const rawText = response?.response ?? response?.choices?.[0]?.message?.content;
    const parsed = parseModelJson(rawText);
    if (!parsed) {
        console.warn('[GuideTranslate] Respuesta no parseable del modelo');
        return { ok: false, error: 'invalid_model_output', neurons };
    }

    // Se filtra lo que devuelve el modelo contra lo que se pidió: un idioma
    // inventado rompería la FK translations.language_code → languages.code, y
    // un campo inventado ensuciaría la tabla.
    const clean = {};
    for (const lang of targetLangs) {
        const got = parsed[lang];
        if (!got || typeof got !== 'object') continue;
        const fields = {};
        for (const field of Object.keys(sourceFields)) {
            const value = got[field];
            // `value` es NOT NULL en translations: una cadena vacía es peor que
            // no tener traducción (el COALESCE del guide ya cae a 'es').
            if (typeof value === 'string' && value.trim()) {
                fields[field] = value.trim();
            }
        }
        if (Object.keys(fields).length > 0) clean[lang] = fields;
    }

    return { ok: true, translations: clean, neurons };
}

// ---------------------------------------------------------------------------
// Lectura del origen y escritura del resultado
// ---------------------------------------------------------------------------

/**
 * Devuelve { source: {field: value}, existing: {lang: Set<field>} } leyendo de
 * `translations` en una sola query.
 */
async function loadEntityTranslations(env, entityId, entityType, fields) {
    const rows = await env.DB.prepare(`
        SELECT language_code, field, value
        FROM translations
        WHERE entity_id = ? AND entity_type = ?
    `).bind(entityId, entityType).all();

    const source = {};
    const existing = {};
    for (const row of rows.results || []) {
        if (row.language_code === SOURCE_LANG && fields.includes(row.field) && row.value?.trim()) {
            source[row.field] = row.value.trim().slice(0, MAX_FIELD_CHARS);
        }
        if (!existing[row.language_code]) existing[row.language_code] = new Set();
        if (row.value?.trim()) existing[row.language_code].add(row.field);
    }
    return { source, existing };
}

async function writeTranslations(env, entityId, entityType, byLang) {
    const statements = [];
    for (const [lang, fields] of Object.entries(byLang)) {
        for (const [field, value] of Object.entries(fields)) {
            statements.push(
                env.DB.prepare(`
                    INSERT INTO translations (entity_id, entity_type, field, language_code, value)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(entity_id, entity_type, field, language_code)
                    DO UPDATE SET value = excluded.value, modified_at = CURRENT_TIMESTAMP
                `).bind(entityId, entityType, field, lang, value)
            );
        }
    }
    if (statements.length > 0) await env.DB.batch(statements);
    return statements.length;
}

/**
 * Traduce una entidad. No pisa nunca una traducción existente salvo `force`:
 * el contenido que ya escribió una persona vale más que lo que genere el
 * modelo, y este endpoint se llama también en backfills masivos donde es fácil
 * arrasar sin querer con trabajo manual.
 */
export async function translateEntity(env, entityId, entityType, { fields, targetLangs, force }) {
    const { source, existing } = await loadEntityTranslations(env, entityId, entityType, fields);

    if (Object.keys(source).length === 0) {
        return { id: entityId, status: 'skipped', reason: 'no_source_content', written: 0, neurons: 0 };
    }

    // Por idioma, qué campos faltan de verdad. Si no falta nada, no se gasta
    // ni una neurona en esa entidad.
    const pending = {};
    for (const lang of targetLangs) {
        const have = existing[lang] || new Set();
        const missing = Object.keys(source).filter(f => force || !have.has(f));
        if (missing.length > 0) pending[lang] = missing;
    }

    const langsToDo = Object.keys(pending);
    if (langsToDo.length === 0) {
        // Este es el caso que hace idempotente al backfill: relanzarlo sobre lo
        // ya traducido sale de aquí sin tocar la IA, con coste cero.
        return { id: entityId, status: 'up_to_date', written: 0, neurons: 0 };
    }

    const collected = {};
    const failedLangs = [];
    let budgetHit = false;
    let neurons = 0;

    for (const group of chunk(langsToDo, LANG_GROUP_SIZE)) {
        // Solo se mandan al modelo los campos que hacen falta para ESTE grupo:
        // si a un idioma solo le falta `short_tip`, no se paga por retraducir
        // la descripción entera.
        const neededFields = new Set();
        for (const lang of group) pending[lang].forEach(f => neededFields.add(f));
        const groupSource = {};
        for (const f of neededFields) groupSource[f] = source[f];

        const result = await translateGroup(env, groupSource, group);
        neurons += result.neurons || 0;
        if (!result.ok) {
            failedLangs.push(...group);
            if (result.budget) { budgetHit = true; break; } // sin presupuesto, los grupos siguientes fallarían igual
            continue;
        }
        for (const [lang, fieldValues] of Object.entries(result.translations)) {
            // Se descarta lo que el modelo devuelva para campos que ya estaban
            // traducidos (puede rellenar de más si el grupo compartía campos).
            const allowed = pending[lang] || [];
            const filtered = {};
            for (const [f, v] of Object.entries(fieldValues)) {
                if (allowed.includes(f)) filtered[f] = v;
            }
            if (Object.keys(filtered).length > 0) collected[lang] = filtered;
        }
    }

    const written = await writeTranslations(env, entityId, entityType, collected);
    const doneLangs = Object.keys(collected);

    return {
        id: entityId,
        // OJO al orden: si NADA se tradujo (doneLangs vacío) es 'failed' pase
        // lo que pase con failedLangs. Antes el chequeo de failedLangs iba
        // primero, así que un fallo TOTAL (todos los grupos sin traducir)
        // también salía como 'partial' — y el frontend cuenta 'partial' como
        // traducción correcta (GuidePoisImportDialog.tsx). Bug real en
        // producción el 2026-08-19: los 3 POIs importados hasta entonces
        // tenían 0 de 12 idiomas escritos y los 3 se reportaron como éxito.
        status: budgetHit ? 'budget_exhausted'
            : doneLangs.length === 0 ? 'failed'
            : failedLangs.length > 0 ? 'partial'
            : 'translated',
        written,
        neurons,
        langs: doneLangs,
        failed_langs: [...new Set(failedLangs)],
    };
}

// ---------------------------------------------------------------------------
// Handler HTTP
// ---------------------------------------------------------------------------

async function runTranslation(env, body, userId) {
    if (!env.AI) return errorResponse('ai_not_configured', 503);

    const { entity_type, entity_ids, fields, target_langs, force } = body || {};

    if (!entity_type || typeof entity_type !== 'string') {
        return errorResponse('entity_type is required');
    }
    if (!Array.isArray(entity_ids) || entity_ids.length === 0) {
        return errorResponse('entity_ids must be a non-empty array');
    }
    if (entity_ids.length > MAX_ENTITIES_PER_REQUEST) {
        return errorResponse(`Maximum ${MAX_ENTITIES_PER_REQUEST} entities per request`);
    }

    const selectedFields = Array.isArray(fields) && fields.length > 0 ? fields : DEFAULT_FIELDS;

    // Nunca se traduce hacia el propio idioma origen, y solo a idiomas activos:
    // translations.language_code tiene FK contra `languages`, así que un código
    // suelto reventaría el INSERT entero del lote.
    const requested = Array.isArray(target_langs) && target_langs.length > 0 ? target_langs : ACTIVE_LANGUAGES;
    const targetLangs = requested.filter(l => l !== SOURCE_LANG && ACTIVE_LANGUAGES.includes(l));
    if (targetLangs.length === 0) return errorResponse('No valid target languages');

    if (env.RATE_LIMIT_KV) {
        const userLimit = await hitRateLimit(env, `translate:user:${userId}`, TRANSLATE_PER_USER);
        if (!userLimit.allowed) return errorResponse('rate_limited', 429);
    } else {
        console.warn('[GuideTranslate] RATE_LIMIT_KV no configurado: traductor sin presupuesto diario');
    }

    const results = [];
    const touchedZones = new Set();
    let spentNeurons = 0;
    for (const entityId of entity_ids) {
        try {
            const result = await translateEntity(env, entityId, entity_type, {
                fields: selectedFields,
                targetLangs,
                force: force === true,
            });
            results.push(result);
            spentNeurons += result.neurons || 0;
            if (result.written > 0 && entity_type === 'poi') {
                const poi = await env.DB.prepare('SELECT zone_id FROM guide_pois WHERE id = ?').bind(entityId).first();
                if (poi?.zone_id) touchedZones.add(poi.zone_id);
            }
            // Sin presupuesto no tiene sentido seguir intentándolo con el resto
            // del lote: se corta y se informa de lo que quedó pendiente.
            if (result.status === 'budget_exhausted') break;
        } catch (err) {
            console.error('[GuideTranslate] Fallo traduciendo', entityId, err.message);
            results.push({ id: entityId, status: 'failed', error: err.message, written: 0 });
        }
    }

    // Traducir cambia lo que sirve GET /guide/:slug, y esa respuesta va por la
    // caché KV versionada (CLAUDE.md §3): sin este bump, producción seguiría
    // devolviendo el guidebook sin los idiomas nuevos con X-Cache: HIT.
    for (const zoneId of touchedZones) {
        await touchZoneGuideVersions(env, zoneId);
    }

    const budgetAfter = await readBudget(env);
    const pendingIds = entity_ids.slice(results.length);
    return jsonResponse({
        success: true,
        model: TRANSLATE_MODEL,
        target_langs: targetLangs,
        fields: selectedFields,
        results,
        // Gasto REAL de esta ejecución, calculado con el `usage` que devuelve
        // Workers AI — no una estimación. `budget_*` es el presupuesto de ESTE
        // traductor, NO las neuronas restantes de la cuenta: el asistente IA del
        // huésped gasta de la misma bolsa de 10.000/día y no se cuenta aquí. Si
        // algún día se quiere el número real de la cuenta, sale del dashboard de
        // Workers AI o de la GraphQL Analytics API, no de este contador.
        usage: {
            neurons_spent: Math.round(spentNeurons * 10) / 10,
            budget_limit: TRANSLATE_NEURON_BUDGET,
            budget_remaining: Math.round(budgetAfter.remaining),
            budget_resets_in_seconds: budgetAfter.resetsIn,
            budget_tracked: budgetAfter.tracked,
        },
        // No vacío solo cuando se cortó por presupuesto: le dice al frontend
        // exactamente qué reintentar mañana, sin recalcularlo.
        pending_ids: pendingIds,
    });
}

/**
 * Registrar en worker.js ANTES del bloque genérico "/guide/admin/", igual que
 * el importador y las pantallas de TV.
 */
export async function handleGuideTranslateRequests(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/guide/admin/translate') return null;
    if (request.method !== 'POST') return null;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return errorResponse('Unauthorized', 401);
    const userData = await verifyJWT(authHeader.substring(7), env.JWT_SECRET);
    if (!userData) return errorResponse('Unauthorized', 401);
    // Mismo nivel que gestionar POIs y que el importador: el catálogo de zona es
    // contenido de plataforma, no de una agencia concreta.
    if (userData.is_superadmin !== true) {
        return errorResponse('Only superadmin can run automatic translation', 403);
    }

    try {
        let body;
        try { body = await request.json(); } catch { return errorResponse('Invalid JSON body'); }
        return await runTranslation(env, body, userData.userId);
    } catch (error) {
        console.error('[GuideTranslate] Error:', error.message);
        return errorResponse('Translation error: ' + error.message, 500);
    }
}
