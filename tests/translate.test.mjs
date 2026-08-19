// Test del traductor automático del guidebook (workerGuideTranslate.js).
// Ejecutar:  npm run test:translate
//
// Cubre lo que de verdad puede romper en producción sin que se note:
//   - Parseo de la respuesta del modelo (los instruct devuelven JSON envuelto
//     en ```json o con una frase delante más veces de lo que parece).
//   - Que NO se pise contenido ya traducido: este endpoint se usa en backfills
//     masivos y un bug aquí arrasaría con trabajo manual de forma silenciosa.
//   - Que no se escriban idiomas ni campos que el modelo se invente (la FK
//     translations.language_code → languages.code reventaría el batch entero).
//   - Guardarraíles HTTP (solo superadmin).
//
// Lo que NO se testea: la llamada real a Workers AI (haría falta el binding y
// gastaría neuronas del tier gratuito) — env.AI.run va mockeado.

import { loadWorkerModule } from './_load.mjs';

const { module: translator, cleanup } = await loadWorkerModule('workerGuideTranslate.js');
const { parseModelJson, translateEntity, handleGuideTranslateRequests, neuronsForUsage } = translator;

// --- Utilidades -------------------------------------------------------------

/** Firma un JWT HS256 igual que generateJWT() en workerAuthentication.js. */
async function signTestJWT(payload, secret) {
    const b64url = (data) => {
        const base64 = typeof data === 'string'
            ? btoa(data)
            : btoa(String.fromCharCode(...new Uint8Array(data)));
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };
    const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = b64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }));
    const signingInput = `${header}.${body}`;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
    return `${signingInput}.${b64url(sigBuffer)}`;
}

/**
 * env de mentira con:
 *  - DB: la tabla `translations` como array de filas; guarda los INSERT en
 *    `written` para poder comprobar qué se escribió de verdad.
 *  - AI: devuelve lo que diga `aiResponder(sourceFields, targetLangs)`.
 */
function makeEnv(rows, aiResponder) {
    const written = [];
    const aiCalls = [];
    return {
        written,
        aiCalls,
        AI: {
            async run(model, opts) {
                // El prompt lleva el JSON del origen y la lista de idiomas; se
                // guarda entero para poder afirmar sobre lo que se le pidió.
                aiCalls.push({ model, prompt: opts.messages.map(m => m.content).join('\n') });
                const out = aiResponder(aiCalls.length);
                // Workers AI devuelve `usage` en generación de texto; el módulo
                // lo usa para contabilizar neuronas reales.
                return typeof out === 'string'
                    ? { response: out, usage: { prompt_tokens: 300, completion_tokens: 500 } }
                    : out;
            },
        },
        DB: {
            prepare(sql) {
                const s = sql.replace(/\s+/g, ' ').trim();
                return {
                    bind(...args) {
                        return {
                            async all() {
                                if (s.includes('FROM translations')) {
                                    return {
                                        results: rows.filter(r => r.entity_id === args[0] && r.entity_type === args[1]),
                                    };
                                }
                                return { results: [] };
                            },
                            async first() {
                                if (s.includes('FROM guide_pois')) return { zone_id: 'zone_1' };
                                return null;
                            },
                            // batch() recibe los objetos devueltos por bind(): se
                            // marcan con los args para inspeccionarlos luego.
                            _args: args,
                            _sql: s,
                        };
                    },
                };
            },
            async batch(statements) {
                for (const st of statements) {
                    if (st._sql.includes('INSERT INTO translations')) {
                        const [entity_id, entity_type, field, language_code, value] = st._args;
                        written.push({ entity_id, entity_type, field, language_code, value });
                    }
                }
                return [];
            },
        },
    };
}

const ALL_TARGETS = ['en', 'fr', 'de', 'it', 'pt', 'ca', 'ar', 'ru', 'uk', 'zh', 'ja', 'ko'];

// --- Runner ------------------------------------------------------------------

let pass = 0, fail = 0;
function assert(label, condition, detail = '') {
    condition ? pass++ : fail++;
    console.log(`${condition ? '  ok  ' : ' FAIL '} ${label}${detail ? '  — ' + detail : ''}`);
}

// -----------------------------------------------------------------------------

console.log('\n--- parseModelJson: respuestas reales de modelos instruct ---');
{
    assert('JSON pelado', parseModelJson('{"en":{"description":"Hi"}}')?.en?.description === 'Hi');
    assert(
        'JSON envuelto en bloque markdown ```json',
        parseModelJson('```json\n{"en":{"description":"Hi"}}\n```')?.en?.description === 'Hi'
    );
    assert(
        'JSON con una frase delante',
        parseModelJson('Claro, aquí tienes:\n{"fr":{"description":"Salut"}}')?.fr?.description === 'Salut'
    );
    assert('Texto sin JSON → null', parseModelJson('lo siento, no puedo') === null);
    assert('JSON roto → null (no revienta)', parseModelJson('{"en": {"description"') === null);
    assert('Entrada vacía → null', parseModelJson('') === null);
    assert('Entrada no-string → null', parseModelJson(undefined) === null);
}

console.log('\n--- translateGroup: acepta el formato chat-completions (choices[].message.content) ---');
{
    // Bug real en producción (2026-08-02 a 2026-08-19): gemma-4-26b-a4b-it es
    // un modelo de razonamiento y devuelve el formato chat-completions de
    // OpenAI, NO el {response: "texto"} clásico de Workers AI.
    // response.response era `undefined` en TODAS las llamadas reales desde
    // que existe este módulo — parseModelJson nunca tuvo nada que parsear, así
    // que las 3 importaciones hechas hasta este fix guardaron 0 de 12 idiomas
    // pese a gastar neuronas (`usage` sí vive en la raíz en ambos formatos).
    const rows = [
        { entity_id: 'poi_11', entity_type: 'poi', language_code: 'es', field: 'description', value: 'Hola' },
    ];
    const env = makeEnv(rows, () => ({
        // Sin campo `response` — así es la respuesta real de este modelo.
        choices: [{ message: { content: '{"en":{"description":"Hi"}}', reasoning_content: 'blah blah blah' } }],
        usage: { prompt_tokens: 300, completion_tokens: 500 },
    }));

    const result = await translateEntity(env, 'poi_11', 'poi', {
        fields: ['description'], targetLangs: ['en'], force: false,
    });

    assert('Se extrae el texto de choices[0].message.content', env.written.some(w => w.language_code === 'en' && w.value === 'Hi'));
    assert('Estado "translated"', result.status === 'translated', result.status);
}

console.log('\n--- translateEntity: no pisar lo que ya existe ---');
{
    // POI con descripción en 'es' y ya traducida a 'en' a mano.
    const rows = [
        { entity_id: 'poi_1', entity_type: 'poi', language_code: 'es', field: 'description', value: 'Bar con vistas al mar' },
        { entity_id: 'poi_1', entity_type: 'poi', language_code: 'en', field: 'description', value: 'Traducción escrita a mano' },
    ];
    const env = makeEnv(rows, () => JSON.stringify({
        fr: { description: 'Bar avec vue sur mer' },
        de: { description: 'Bar mit Meerblick' },
        it: { description: 'Bar con vista mare' },
        pt: { description: 'Bar com vista para o mar' },
    }));

    const result = await translateEntity(env, 'poi_1', 'poi', {
        fields: ['description', 'short_tip', 'cta_label'],
        targetLangs: ALL_TARGETS,
        force: false,
    });

    const wroteEnglish = env.written.some(w => w.language_code === 'en');
    assert('NO se reescribe el inglés que ya existía', !wroteEnglish);
    assert('Estado "translated"', result.status === 'translated', result.status);

    // El inglés no debe ni llegar al prompt: pagar por retraducirlo sería
    // gastar neuronas para tirar el resultado.
    const enInPrompt = env.aiCalls.some(c => /Idiomas destino:.*"en"/.test(c.prompt));
    assert('El inglés ya traducido no se manda al modelo', !enInPrompt);
}

console.log('\n--- translateEntity: force sí reescribe ---');
{
    const rows = [
        { entity_id: 'poi_1', entity_type: 'poi', language_code: 'es', field: 'description', value: 'Bar con vistas' },
        { entity_id: 'poi_1', entity_type: 'poi', language_code: 'en', field: 'description', value: 'Vieja' },
    ];
    const env = makeEnv(rows, () => JSON.stringify({ en: { description: 'Nueva' } }));
    await translateEntity(env, 'poi_1', 'poi', {
        fields: ['description'],
        targetLangs: ['en'],
        force: true,
    });
    assert(
        'Con force:true sí se sobrescribe el inglés',
        env.written.some(w => w.language_code === 'en' && w.value === 'Nueva')
    );
}

console.log('\n--- translateEntity: nada que hacer ---');
{
    // Sin contenido en español no hay de dónde traducir.
    const env = makeEnv([], () => '{}');
    const result = await translateEntity(env, 'poi_vacio', 'poi', {
        fields: ['description'], targetLangs: ALL_TARGETS, force: false,
    });
    assert('Sin origen en español → skipped', result.status === 'skipped' && result.reason === 'no_source_content');
    assert('No se llama al modelo si no hay nada que traducir', env.aiCalls.length === 0);
}
{
    // Ya traducido a todos los idiomas: ni una neurona.
    const rows = [
        { entity_id: 'poi_2', entity_type: 'poi', language_code: 'es', field: 'description', value: 'Hola' },
        ...ALL_TARGETS.map(l => ({ entity_id: 'poi_2', entity_type: 'poi', language_code: l, field: 'description', value: 'x' })),
    ];
    const env = makeEnv(rows, () => '{}');
    const result = await translateEntity(env, 'poi_2', 'poi', {
        fields: ['description'], targetLangs: ALL_TARGETS, force: false,
    });
    assert('Todo traducido → up_to_date', result.status === 'up_to_date');
    assert('Relanzar un backfill ya hecho no gasta IA', env.aiCalls.length === 0);
}

console.log('\n--- translateEntity: se filtra lo que el modelo se inventa ---');
{
    const rows = [
        { entity_id: 'poi_3', entity_type: 'poi', language_code: 'es', field: 'description', value: 'Hola' },
    ];
    const env = makeEnv(rows, () => JSON.stringify({
        fr: { description: 'Salut', inventado: 'no debería guardarse' },
        // 'nl' es un idioma ELIMINADO del proyecto (CLAUDE.md §5) y rompería la
        // FK contra `languages`; el modelo lo devuelve igualmente de vez en cuando.
        nl: { description: 'Hallo' },
        de: { description: '   ' }, // solo espacios: value es NOT NULL, peor que no tenerlo
    }));

    await translateEntity(env, 'poi_3', 'poi', {
        fields: ['description'], targetLangs: ['fr', 'de'], force: false,
    });

    assert('Se guarda el idioma pedido', env.written.some(w => w.language_code === 'fr' && w.value === 'Salut'));
    assert('Se descarta un idioma NO pedido (rompería la FK)', !env.written.some(w => w.language_code === 'nl'));
    assert('Se descarta un campo inventado', !env.written.some(w => w.field === 'inventado'));
    assert('Se descarta una traducción en blanco', !env.written.some(w => w.language_code === 'de'));
}

console.log('\n--- translateEntity: un fallo del modelo no tira el resto ---');
{
    const rows = [
        { entity_id: 'poi_4', entity_type: 'poi', language_code: 'es', field: 'description', value: 'Hola' },
    ];
    // 12 idiomas en grupos de 2 = 6 llamadas; la segunda devuelve basura.
    const env = makeEnv(rows, (callNumber) => {
        if (callNumber === 2) return 'lo siento, no puedo ayudarte con eso';
        return JSON.stringify(Object.fromEntries(ALL_TARGETS.map(l => [l, { description: `desc-${l}` }])));
    });

    const result = await translateEntity(env, 'poi_4', 'poi', {
        fields: ['description'], targetLangs: ALL_TARGETS, force: false,
    });

    assert('Se hacen 6 llamadas (12 idiomas en grupos de 2)', env.aiCalls.length === 6, `fueron ${env.aiCalls.length}`);
    assert('Estado "partial" cuando falla un grupo pero otros sí traducen', result.status === 'partial', result.status);
    assert('Los grupos que sí funcionaron se guardan', env.written.length > 0);
    assert('Se informa de qué idiomas fallaron', (result.failed_langs || []).length === 2, JSON.stringify(result.failed_langs));
}

console.log('\n--- translateEntity: si fallan TODOS los grupos, es "failed" (no "partial") ---');
{
    // Bug real en producción (2026-08-19): con LANG_GROUP_SIZE=4 y
    // max_tokens=1400, los 3 POIs importados hasta entonces gastaron
    // neuronas en llamadas que devolvían 200 con el JSON cortado por el tope
    // de tokens — 0 idiomas escritos. El estado salía "partial" porque
    // failedLangs.length > 0 se comprobaba ANTES que doneLangs.length === 0,
    // así que el frontend lo contaba como traducción correcta. Este test fija
    // que un fallo total es "failed", no "partial".
    const rows = [
        { entity_id: 'poi_10', entity_type: 'poi', language_code: 'es', field: 'description', value: 'Hola' },
    ];
    const env = makeEnv(rows, () => 'lo siento, no puedo ayudarte con eso');

    const result = await translateEntity(env, 'poi_10', 'poi', {
        fields: ['description'], targetLangs: ALL_TARGETS, force: false,
    });

    assert('0 idiomas traducidos → estado "failed"', result.status === 'failed', result.status);
    assert('Estado "failed" ≠ "partial"', result.status !== 'partial');
    assert('No se escribe nada', env.written.length === 0);
    assert('Pero las neuronas sí se contabilizan (se llamó al modelo)', result.neurons > 0, String(result.neurons));
}

console.log('\n--- neuronsForUsage: gasto real, no estimado ---');
{
    // Tarifas de gemma-4-26b-a4b-it: 9.091 entrada / 27.273 salida por M tokens.
    // 300 in + 500 out = 0.0027273 + 0.0136365 M-neuronas ≈ 16.36
    const n = neuronsForUsage({ prompt_tokens: 300, completion_tokens: 500 });
    assert('300 in + 500 out ≈ 16,4 neuronas', Math.abs(n - 16.36) < 0.1, String(n));
    assert('Sin usage → fallback, NO cero', neuronsForUsage(undefined) === 25);
    assert('usage incompleto → fallback', neuronsForUsage({ prompt_tokens: 100 }) === 25);
    assert('Cero tokens → cero neuronas', neuronsForUsage({ prompt_tokens: 0, completion_tokens: 0 }) === 0);
}

console.log('\n--- Contabilidad: lo que no se traduce no se cobra ---');
{
    const rows = [
        { entity_id: 'poi_5', entity_type: 'poi', language_code: 'es', field: 'description', value: 'Hola' },
        ...ALL_TARGETS.map(l => ({ entity_id: 'poi_5', entity_type: 'poi', language_code: l, field: 'description', value: 'x' })),
    ];
    const env = makeEnv(rows, () => '{}');
    const result = await translateEntity(env, 'poi_5', 'poi', {
        fields: ['description'], targetLangs: ALL_TARGETS, force: false,
    });
    assert('Un POI ya al día cuesta 0 neuronas', result.neurons === 0);
}
{
    const rows = [
        { entity_id: 'poi_6', entity_type: 'poi', language_code: 'es', field: 'description', value: 'Hola' },
    ];
    const env = makeEnv(rows, () => JSON.stringify(
        Object.fromEntries(ALL_TARGETS.map(l => [l, { description: `d-${l}` }]))
    ));
    const result = await translateEntity(env, 'poi_6', 'poi', {
        fields: ['description'], targetLangs: ALL_TARGETS, force: false,
    });
    // 6 llamadas × 16,36 ≈ 98
    assert('Un POI completo cuesta ~98 neuronas (6 llamadas)', Math.abs(result.neurons - 98.18) < 0.5, String(result.neurons));
}
{
    // Una respuesta ilegible consume igual: si no se contara, una racha de
    // respuestas basura se saltaría el presupuesto entero.
    const rows = [
        { entity_id: 'poi_7', entity_type: 'poi', language_code: 'es', field: 'description', value: 'Hola' },
    ];
    const env = makeEnv(rows, () => 'no puedo ayudarte');
    const result = await translateEntity(env, 'poi_7', 'poi', {
        fields: ['description'], targetLangs: ['en'], force: false,
    });
    assert('Una respuesta basura del modelo SÍ se contabiliza', result.neurons > 0, String(result.neurons));
    assert('...y no se guarda nada', result.written === 0);
}

console.log('\n--- Presupuesto en neuronas: corta y no llama al modelo ---');
{
    const rows = [
        { entity_id: 'poi_8', entity_type: 'poi', language_code: 'es', field: 'description', value: 'Hola' },
    ];
    const env = makeEnv(rows, () => JSON.stringify({ en: { description: 'Hi' } }));
    // KV que dice que el presupuesto del día ya está gastado.
    env.RATE_LIMIT_KV = {
        async get() { return { spent: 6000, windowStart: Math.floor(Date.now() / 1000) }; },
        async put() {},
    };
    const result = await translateEntity(env, 'poi_8', 'poi', {
        fields: ['description'], targetLangs: ALL_TARGETS, force: false,
    });
    assert('Presupuesto agotado → budget_exhausted', result.status === 'budget_exhausted', result.status);
    assert('Presupuesto agotado → CERO llamadas al modelo', env.aiCalls.length === 0);
    assert('Presupuesto agotado → coste marginal cero', result.neurons === 0);
}
{
    // Con presupuesto disponible sí traduce y apunta el gasto en KV.
    const rows = [
        { entity_id: 'poi_9', entity_type: 'poi', language_code: 'es', field: 'description', value: 'Hola' },
    ];
    const env = makeEnv(rows, () => JSON.stringify({ en: { description: 'Hi' } }));
    let stored = null;
    env.RATE_LIMIT_KV = {
        async get() { return stored; },
        async put(_k, v) { stored = JSON.parse(v); },
    };
    await translateEntity(env, 'poi_9', 'poi', {
        fields: ['description'], targetLangs: ['en'], force: false,
    });
    assert('Con presupuesto sí llama al modelo', env.aiCalls.length === 1);
    assert('El gasto queda apuntado en KV', stored?.spent > 0, JSON.stringify(stored));
}

console.log('\n--- handleGuideTranslateRequests: guardarraíles HTTP ---');
{
    const SECRET = 'test-secret-para-los-tests';
    const env = { JWT_SECRET: SECRET, AI: {}, DB: {} };
    const post = (headers = {}) => new Request('https://api.test/guide/admin/translate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ entity_type: 'poi', entity_ids: ['poi_1'] }),
    });

    let res = await handleGuideTranslateRequests(post(), env);
    assert('Sin cabecera Authorization → 401', res?.status === 401);

    res = await handleGuideTranslateRequests(post({ Authorization: 'Bearer no-es-un-jwt' }), env);
    assert('Token inválido → 401', res?.status === 401);

    const staffToken = await signTestJWT({ userId: 'u1', is_superadmin: false }, SECRET);
    res = await handleGuideTranslateRequests(post({ Authorization: `Bearer ${staffToken}` }), env);
    assert('Autenticado pero NO superadmin → 403', res?.status === 403);

    const adminToken = await signTestJWT({ userId: 'u2', is_superadmin: true }, SECRET);
    const getReq = new Request('https://api.test/guide/admin/translate', {
        method: 'GET', headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('GET sobre la ruta → null (no la sirve este módulo)', await handleGuideTranslateRequests(getReq, env) === null);

    const otherReq = new Request('https://api.test/guide/admin/pois', { method: 'POST' });
    assert('Otra ruta → null inmediato, sin comprobar auth', await handleGuideTranslateRequests(otherReq, env) === null);
}

console.log('\n--- handleGuideTranslateRequests: validación de entrada ---');
{
    const SECRET = 'test-secret-para-los-tests';
    const adminToken = await signTestJWT({ userId: 'u2', is_superadmin: true }, SECRET);
    const call = (body, extraEnv = {}) => handleGuideTranslateRequests(
        new Request('https://api.test/guide/admin/translate', {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify(body),
        }),
        { JWT_SECRET: SECRET, AI: {}, DB: {}, ...extraEnv }
    );

    assert('Sin entity_type → 400', (await call({ entity_ids: ['a'] }))?.status === 400);
    assert('entity_ids vacío → 400', (await call({ entity_type: 'poi', entity_ids: [] }))?.status === 400);
    assert(
        'Más de 25 entidades → 400',
        (await call({ entity_type: 'poi', entity_ids: Array.from({ length: 26 }, (_, i) => `p${i}`) }))?.status === 400
    );
    assert(
        'target_langs solo con idiomas inactivos → 400',
        (await call({ entity_type: 'poi', entity_ids: ['a'], target_langs: ['nl', 'sv'] }))?.status === 400
    );

    const noAi = await handleGuideTranslateRequests(
        new Request('https://api.test/guide/admin/translate', {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({ entity_type: 'poi', entity_ids: ['a'] }),
        }),
        { JWT_SECRET: SECRET, DB: {} } // sin binding AI
    );
    assert('Sin binding AI → 503, no un 500 críptico', noAi?.status === 503);
}

// -----------------------------------------------------------------------------

cleanup();
console.log(`\n${pass} ok, ${fail} fail\n`);
process.exit(fail > 0 ? 1 : 0);
