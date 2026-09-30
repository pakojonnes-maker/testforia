// Test del presupuesto diario compartido de Workers AI (workerAiBudget.js) y de
// cómo lo usa el chat del guidebook (workerGuideAI.js).
// Ejecutar:  npm run test:ai-budget
//
// Lo que se cubre: que el chat corte ANTES de llamar al modelo (por piso, por
// chat y por total), que el traductor se quede con lo que el chat no usa menos
// su reserva, que el gasto se apunte en D1 con el `usage` real del stream (y se
// devuelva si la llamada falla), y que el chat ya no escriba en KV.

import { loadWorkerModule } from './_load.mjs';

const { module: budget, cleanup: cleanupBudget } = await loadWorkerModule('workerAiBudget.js');
const { module: chat, cleanup: cleanupChat } = await loadWorkerModule('workerGuideAI.js');
const {
    AI_DAILY_CAP, CHAT_DAILY_CAP, CHAT_RESERVE, APARTMENT_DAILY_CAP,
    utcDay, secondsUntilUtcMidnight, neuronsFromUsage, addUsage, readUsage,
    checkChatBudget, readTranslateBudget,
} = budget;
const { handleGuideAI } = chat;

let pass = 0, fail = 0;
function assert(label, condition, detail = '') {
    condition ? pass++ : fail++;
    console.log(`${condition ? '  ok  ' : ' FAIL '} ${label}${detail ? '  — ' + detail : ''}`);
}

/**
 * D1 de mentira que entiende las dos sentencias de workerAiBudget.js (el
 * SELECT por día y ámbitos, y el upsert) sobre un Map, más el SELECT del slug
 * del apartamento que hace el chat.
 */
function makeDb({ broken = false } = {}) {
    const table = new Map(); // `${day}|${scope}` → { neurons, calls }
    const db = {
        table,
        set(scope, neurons) { table.set(`${utcDay()}|${scope}`, { neurons, calls: 1 }); },
        get(scope) { return table.get(`${utcDay()}|${scope}`)?.neurons ?? 0; },
        prepare(sql) {
            const s = sql.replace(/\s+/g, ' ').trim();
            return {
                bind(...args) {
                    return {
                        _sql: s, _args: args,
                        async all() {
                            if (broken) throw new Error('D1 caído');
                            if (s.includes('FROM ai_usage_daily')) {
                                const [day, ...scopes] = args;
                                return {
                                    results: scopes
                                        .filter(sc => table.has(`${day}|${sc}`))
                                        .map(sc => ({ scope: sc, neurons: table.get(`${day}|${sc}`).neurons })),
                                };
                            }
                            return { results: [] };
                        },
                        async first() {
                            if (s.includes('FROM guide_apartments')) return args[0] === 'apt_1' ? { slug: 'piso-uno' } : null;
                            return null;
                        },
                    };
                },
            };
        },
        async batch(statements) {
            if (broken) throw new Error('D1 caído');
            for (const st of statements) {
                if (!st._sql.includes('INSERT INTO ai_usage_daily')) continue;
                const [day, scope, neurons, calls] = st._args;
                const key = `${day}|${scope}`;
                const prev = table.get(key) || { neurons: 0, calls: 0 };
                table.set(key, { neurons: prev.neurons + neurons, calls: prev.calls + calls });
            }
            return [];
        },
    };
    return db;
}

// -----------------------------------------------------------------------------

console.log('\n--- Reloj y neuronas ---');
{
    assert('utcDay es YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(utcDay()));
    assert('A las 23:30 UTC quedan 1.800 s', secondsUntilUtcMidnight(new Date('2026-09-30T23:30:00Z')) === 1800);
    assert('usage.neurons manda si viene', neuronsFromUsage('@cf/google/gemma-4-26b-a4b-it', { neurons: 12.5, prompt_tokens: 1 }) === 12.5);
    const n = neuronsFromUsage('@cf/google/gemma-4-26b-a4b-it', { prompt_tokens: 4000, completion_tokens: 150 });
    assert('4.000 in + 150 out en Gemma 4 ≈ 40,5', Math.abs(n - 40.45) < 0.1, String(n));
    assert('Modelo sin tarifa y sin usage.neurons → null', neuronsFromUsage('@cf/x/y', { prompt_tokens: 1, completion_tokens: 1 }) === null);
}

console.log('\n--- addUsage / readUsage: acumula y admite correcciones ---');
{
    const env = { DB: makeDb() };
    await addUsage(env, [{ scope: 'chat', neurons: 40, calls: 1 }]);
    await addUsage(env, [{ scope: 'chat', neurons: -5 }]);
    const u = await readUsage(env, ['chat', 'translate']);
    assert('40 − 5 = 35 en chat', u.chat === 35, JSON.stringify(u));
    assert('Ámbito sin filas → 0', u.translate === 0);
    assert('D1 caído → readUsage null', (await readUsage({ DB: makeDb({ broken: true }) }, ['chat'])) === null);
}

console.log('\n--- Chat: corta antes del modelo ---');
{
    const env = { DB: makeDb() };
    assert('Día vacío → permitido', (await checkChatBudget(env, 'apt_1', 40)).allowed);

    env.DB.set('chat:apt:apt_1', APARTMENT_DAILY_CAP - 10);
    let r = await checkChatBudget(env, 'apt_1', 40);
    assert('Piso en su tope → corta por "apartment"', !r.allowed && r.reason === 'apartment', JSON.stringify(r));
    assert('...pero otro piso sigue pudiendo', (await checkChatBudget(env, 'apt_2', 40)).allowed);

    env.DB.set('chat', CHAT_DAILY_CAP - 10);
    r = await checkChatBudget(env, 'apt_2', 40);
    assert('Chat en su tope → corta por "chat"', !r.allowed && r.reason === 'chat', JSON.stringify(r));
}
{
    const env = { DB: makeDb() };
    env.DB.set('chat', 1000);
    env.DB.set('translate', AI_DAILY_CAP - 1000 - 10);
    const r = await checkChatBudget(env, 'apt_1', 40);
    assert('Chat + traductor en el total → corta por "total"', !r.allowed && r.reason === 'total', JSON.stringify(r));
}
{
    const r = await checkChatBudget({ DB: makeDb({ broken: true }) }, 'apt_1', 40);
    assert('D1 caído → deja pasar (Cloudflare corta detrás, sin factura)', r.allowed && !r.tracked);
}

console.log('\n--- Traductor: lo que el chat no usa, menos su reserva ---');
{
    const env = { DB: makeDb() };
    let b = await readTranslateBudget(env);
    assert(`Chat en calma → límite ${AI_DAILY_CAP - CHAT_RESERVE}`, b.limit === AI_DAILY_CAP - CHAT_RESERVE, String(b.limit));
    env.DB.set('chat', 3000);
    env.DB.set('translate', 2000);
    b = await readTranslateBudget(env);
    assert('Chat 3.000 → límite 6.000, quedan 4.000', b.limit === 6000 && b.remaining === 4000, JSON.stringify(b));

    env.DB.set('chat', 0);
    env.DB.set('translate', AI_DAILY_CAP - CHAT_RESERVE);
    b = await readTranslateBudget(env);
    assert('Traductor agotado → remaining 0', b.remaining === 0);
    assert('...y el chat sigue teniendo su reserva', (await checkChatBudget(env, 'apt_1', 40)).allowed);
}

// -----------------------------------------------------------------------------
// Handler del chat

const GUIDE = {
    success: true,
    apartment: { id: 'apt_1', name: 'Piso Uno', address: 'Calle 1', checkin_time: '16:00', checkout_time: '11:00', wifi: { ssid: 'Red', password: 'clave123' }, phones: [], info: [] },
    zone: { name: 'Benalmádena', region: 'Costa del Sol' },
    store_items: [], experiences: [], restaurants: [], pois: [],
};

function sse(text, usage) {
    const lines = [
        `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}`,
        `data: ${JSON.stringify({ response: '', usage })}`,
        'data: [DONE]',
    ];
    return new Response(lines.join('\n\n') + '\n\n').body;
}

function makeChatEnv({ db = makeDb(), aiRun, ipOk = true } = {}) {
    const calls = [];
    let kvWrites = 0;
    return {
        calls,
        get kvWrites() { return kvWrites; },
        DB: db,
        GUIDE_CACHE: { async get(k) { return k.startsWith('guide:') ? JSON.stringify(GUIDE) : null; }, async put() { kvWrites++; } },
        RATE_LIMIT_KV: { async get() { return null; }, async put() { kvWrites++; } },
        AI_CHAT_IP_LIMITER: { async limit() { return { success: ipOk }; } },
        AI_CHAT_VISITOR_LIMITER: { async limit() { return { success: true }; } },
        AI: { async run(model, input, opts) { calls.push({ model, input, opts }); return aiRun(model, input); } },
    };
}

const chatRequest = (body) => new Request('https://w.test/guide/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.1' },
    body: JSON.stringify({ apartmentId: 'apt_1', message: '¿Clave del WiFi?', lang: 'es', visitorId: 'v-1', ...body }),
});

console.log('\n--- Chat: gasto real apuntado desde el stream ---');
{
    const env = makeChatEnv({ aiRun: () => sse('La clave es clave123.', { prompt_tokens: 900, completion_tokens: 12, neurons: 8.5 }) });
    const res = await handleGuideAI(chatRequest({}), env);
    const text = await res.text(); // consumir el stream dispara el apunte final
    assert('Responde 200 en streaming', res.status === 200 && text.includes('clave123'));
    const call = env.calls[0];
    assert('Usa Gemma 4', call?.model === '@cf/google/gemma-4-26b-a4b-it', call?.model);
    assert('Sin razonamiento', call?.input.chat_template_kwargs?.enable_thinking === false);
    assert('Por el AI Gateway guidebook-ai', call?.opts?.gateway?.id === 'guidebook-ai');
    assert('Chat apuntado con el gasto REAL (8,5), no la estimación', Math.abs(env.DB.get('chat') - 8.5) < 1e-9, String(env.DB.get('chat')));
    assert('Piso apuntado igual', Math.abs(env.DB.get('chat:apt:apt_1') - 8.5) < 1e-9, String(env.DB.get('chat:apt:apt_1')));
    assert('El chat no escribe en KV', env.kvWrites === 0, String(env.kvWrites));
}
{
    // El stream no trae `usage` al final: se queda la estimación (conservadora).
    const env = makeChatEnv({ aiRun: () => new Response('data: {"response":"hola"}\n\ndata: [DONE]\n\n').body });
    const res = await handleGuideAI(chatRequest({}), env);
    await res.text();
    const spent = env.DB.get('chat');
    assert('Sin usage final → queda la estimación (> 0)', spent > 0, String(spent));
}

console.log('\n--- Chat: cortes ---');
{
    const db = makeDb();
    db.set('chat', CHAT_DAILY_CAP);
    const env = makeChatEnv({ db, aiRun: () => sse('x', { neurons: 1 }) });
    const res = await handleGuideAI(chatRequest({}), env);
    const body = await res.json();
    assert('Chat agotado → 503 ai_unavailable', res.status === 503 && body.error === 'ai_unavailable', `${res.status} ${body.error}`);
    assert('...sin llamar al modelo', env.calls.length === 0);
}
{
    const env = makeChatEnv({ ipOk: false, aiRun: () => sse('x', { neurons: 1 }) });
    const res = await handleGuideAI(chatRequest({}), env);
    assert('Freno por IP → 429 sin llamar al modelo', res.status === 429 && env.calls.length === 0, String(res.status));
}
{
    const env = makeChatEnv({ aiRun: () => sse('x', { neurons: 1 }) });
    const res = await handleGuideAI(chatRequest({ apartmentId: 'apt_no_existe' }), env);
    assert('Piso inventado → 404, sin modelo ni gasto', res.status === 404 && env.calls.length === 0 && env.DB.table.size === 0);
}
{
    const env = makeChatEnv({ aiRun: () => { const e = new Error('limit'); e.code = 3036; throw e; } });
    const res = await handleGuideAI(chatRequest({}), env);
    assert('3036 de Cloudflare → 503 ai_unavailable', res.status === 503, String(res.status));
    assert('...y la estimación apuntada se devuelve (gasto 0)', Math.abs(env.DB.get('chat')) < 1e-9, String(env.DB.get('chat')));
}

cleanupBudget();
cleanupChat();
console.log(`\n${pass} ok, ${fail} fail`);
process.exit(fail ? 1 : 0);
