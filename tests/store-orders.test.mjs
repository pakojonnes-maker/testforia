// Test del límite de pedidos de la Tienda del guidebook (workerGuideStore.js).
// Ejecutar:  node tests/store-orders.test.mjs
//
// POST /guide/store/orders es público: lo llama la guía desde el móvil del huésped. El límite contaba
// cada pedido en KV con la clave que mandaba el cliente (visitorId), con dos problemas: cualquiera
// podía gastar el cupo diario de escrituras de KV que comparte con la caché de las guías cambiando de
// id en cada petición, y a quien se inventaba el id (o no mandaba ninguno) el límite no le frenaba
// nada. Ahora cuenta los pedidos que ya se guardan en D1, por visitante y por apartamento.

import { loadWorkerModule } from './_load.mjs';

const { module: store, cleanup } = await loadWorkerModule('workerGuideStore.js');
const { handleGuideStoreRequests } = store;

const APARTMENTS = {
    apt_1: { id: 'apt_1', name: 'Ático Paloma', agency_id: 'ag_1', contact_whatsapp: '+34 600 111 222' },
    apt_2: { id: 'apt_2', name: 'Casa Olivo', agency_id: 'ag_1', contact_whatsapp: '+34 600 333 444' },
};
const ITEMS = [
    { id: 'item_host', owner_type: 'host', price_amount: 12, price_currency: 'EUR', contact_whatsapp: null },
    { id: 'item_platform', owner_type: 'platform', price_amount: 9.5, price_currency: 'EUR', contact_whatsapp: null },
];

function makeEnv() {
    const state = { orders: [], lines: 0, kvWrites: 0, d1Calls: 0 };
    const kv = { async get() { return null; }, async put() { state.kvWrites++; }, async delete() { state.kvWrites++; } };
    const statement = (s, args) => ({
        s,
        args,
        async first() {
            state.d1Calls++;
            if (s.includes('FROM guide_store_orders')) {
                // El SELECT de overHourlyLimit: bind(apartamento, desde, visitante, desde).
                const [apartmentId, sinceApt, visitorId, sinceVisitor] = args;
                return {
                    by_apartment: state.orders.filter((o) => o.apartment_id === apartmentId && o.created_at > sinceApt).length,
                    // Como en SQL: `visitor_id = NULL` no casa con ninguna fila.
                    by_visitor: state.orders.filter((o) => visitorId != null && o.visitor_id === visitorId && o.created_at > sinceVisitor).length,
                };
            }
            if (s.includes('FROM guide_apartments')) return APARTMENTS[args[0]] ?? null;
            return null;
        },
        async all() {
            state.d1Calls++;
            if (s.includes('FROM guide_store_items')) return { results: ITEMS.filter((i) => args.includes(i.id)) };
            return { results: [] }; // sin traducciones: el pedido usa el id como nombre
        },
    });
    const env = {
        RATE_LIMIT_KV: kv,
        GUIDE_CACHE: kv,
        PLATFORM_WHATSAPP: '+34 600 999 000',
        DB: {
            prepare(sql) {
                const s = sql.replace(/\s+/g, ' ').trim();
                return { bind: (...args) => statement(s, args) };
            },
            async batch(statements) {
                state.d1Calls++;
                for (const { s, args } of statements) {
                    if (s.startsWith('INSERT INTO guide_store_orders ')) {
                        const [id, apartment_id, , visitor_id, , , created_at] = args;
                        state.orders.push({ id, apartment_id, visitor_id, created_at });
                    } else if (s.startsWith('INSERT INTO guide_store_order_items')) {
                        state.lines++;
                    }
                }
                return statements.map(() => ({ success: true }));
            },
        },
    };
    return { env, state };
}

/** Siembra pedidos antiguos (o ajenos) sin pasar por el endpoint. */
function seed(state, count, { apartment = 'apt_1', visitor = null, at = Date.now() } = {}) {
    for (let i = 0; i < count; i++) {
        state.orders.push({ id: `seed_${state.orders.length}`, apartment_id: apartment, visitor_id: visitor, created_at: new Date(at).toISOString() });
    }
}

function order(env, { visitor = 'v-ana', apartment = 'apt_1', items = ['item_host'], ip = '203.0.113.40', raw } = {}) {
    return handleGuideStoreRequests(new Request('https://api.visualtastes.com/guide/store/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip },
        body: raw ?? JSON.stringify({
            apartmentId: apartment,
            items: items.map((itemId) => ({ itemId, quantity: 1 })),
            ...(visitor ? { visitorId: visitor } : {}),
        }),
    }), env);
}

let pass = 0, fail = 0;
function assert(label, condition, detail = '') {
    condition ? pass++ : fail++;
    console.log(`${condition ? '  ok  ' : ' FAIL '} ${label}${detail ? '  — ' + detail : ''}`);
}

console.log('\n--- Un huésped pide: entra, se guarda y no gasta KV ---');
{
    const { env, state } = makeEnv();
    const res = await order(env);
    const body = await res.json();
    assert('El pedido entra (200) con su enlace de WhatsApp',
        res.status === 200 && body.success === true && body.orders.length === 1 && body.orders[0].whatsappUrl.startsWith('https://wa.me/+34600111222?text='));
    assert('...y queda guardado con su apartamento y su visitante',
        state.orders.length === 1 && state.orders[0].apartment_id === 'apt_1' && state.orders[0].visitor_id === 'v-ana' && state.lines === 1);

    const codes = [];
    for (let i = 0; i < 7; i++) codes.push((await order(env)).status);
    assert('Hasta 8 pedidos en una hora del mismo visitante: todos entran', codes.every((c) => c === 200), codes.join(','));
    assert('...sin una sola escritura en KV', state.kvWrites === 0, `${state.kvWrites} escrituras`);

    const ninth = await order(env);
    assert('El 9º se rechaza (429)', ninth.status === 429 && (await ninth.json()).success === false);
    assert('...y no se guarda', state.orders.length === 8, `${state.orders.length} pedidos`);
    assert('Otro visitante del mismo piso sigue pudiendo pedir', (await order(env, { visitor: 'v-luis' })).status === 200);
    assert('El rechazo tampoco escribe en KV', state.kvWrites === 0, `${state.kvWrites} escrituras`);
}

console.log('\n--- Cambiar de visitorId en cada petición ya no sirve ---');
{
    const { env, state } = makeEnv();
    const codes = [];
    for (let i = 0; i < 35; i++) codes.push((await order(env, { visitor: `inventado-${i}` })).status);
    assert('Los 30 primeros pedidos del apartamento entran', codes.slice(0, 30).every((c) => c === 200), codes.join(','));
    assert('A partir del 31º se rechazan (429) aunque el id sea nuevo', codes.slice(30).every((c) => c === 429), codes.join(','));
    assert('...y en D1 no hay más de 30 pedidos', state.orders.length === 30, `${state.orders.length} pedidos`);
    assert('35 peticiones con 35 ids: 0 escrituras en KV', state.kvWrites === 0, `${state.kvWrites} escrituras`);
    assert('Otro apartamento no hereda el bloqueo', (await order(env, { apartment: 'apt_2', visitor: 'v-ana' })).status === 200);
}

console.log('\n--- Sin visitorId (antes: sin límite ninguno) ---');
{
    const { env, state } = makeEnv();
    const codes = [];
    for (let i = 0; i < 32; i++) codes.push((await order(env, { visitor: null })).status);
    assert('Sin id, los pedidos entran...', codes.slice(0, 30).every((c) => c === 200), codes.join(','));
    assert('...hasta el tope del apartamento', codes.slice(30).every((c) => c === 429) && state.orders.length === 30, codes.join(','));
    assert('...y tampoco escriben en KV', state.kvWrites === 0, `${state.kvWrites} escrituras`);
}

console.log('\n--- Ventana de una hora y carrito mixto ---');
{
    const { env, state } = makeEnv();
    const hace61min = Date.now() - 61 * 60 * 1000;
    seed(state, 8, { visitor: 'v-ana', at: hace61min });
    seed(state, 30, { at: hace61min });
    assert('Los pedidos de hace más de una hora ya no cuentan', (await order(env)).status === 200);

    seed(state, 8, { apartment: 'apt_2', visitor: 'v-ana' });
    assert('El tope por visitante vale aunque cambie de apartamento', (await order(env)).status === 429);

    const mixed = await order(env, { visitor: 'v-eva', items: ['item_host', 'item_platform'] });
    const body = await mixed.json();
    assert('Un carrito mixto se guarda como dos pedidos, cada uno con su WhatsApp',
        mixed.status === 200 && body.orders.length === 2 && new Set(body.orders.map((o) => o.whatsappUrl.split('?')[0])).size === 2);
    assert('...y cuenta dos para ese visitante',
        state.orders.filter((o) => o.visitor_id === 'v-eva').length === 2);
}

console.log('\n--- Barrera por minuto ---');
{
    const { env, state } = makeEnv();
    const ip = '203.0.113.41';
    const keys = [];
    env.AUTH_IP_LIMITER = { async limit({ key }) { keys.push(key); return { success: true }; } };
    assert('Con la barrera sin saltar, el pedido entra', (await order(env, { ip })).status === 200);
    assert('...y se consulta por IP y con su ámbito', keys.length === 1 && keys[0] === `store-order:${ip}`, keys.join(','));

    env.AUTH_IP_LIMITER = { async limit() { return { success: false }; } };
    const before = state.d1Calls;
    assert('Con la barrera saltada → 429', (await order(env, { ip })).status === 429);
    assert('...sin tocar D1 ni KV', state.d1Calls === before && state.kvWrites === 0, `${state.d1Calls - before} llamadas a D1, ${state.kvWrites} escrituras`);
    assert('...y sin leer siquiera el cuerpo', (await order(env, { ip, raw: 'esto no es JSON' })).status === 429);
}

console.log('\n--- Lo que ya se rechazaba se sigue rechazando ---');
{
    const { env, state } = makeEnv();
    assert('JSON roto → 400', (await order(env, { raw: '{' })).status === 400);
    assert('Apartamento que no existe → 404', (await order(env, { apartment: 'apt_nope' })).status === 404);
    assert('Producto que ese piso no vende → 404', (await order(env, { items: ['item_ajeno'] })).status === 404);
    assert('Nada de eso guarda un pedido ni escribe en KV', state.orders.length === 0 && state.kvWrites === 0);
}

cleanup();
console.log(`\n${pass} ok, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
