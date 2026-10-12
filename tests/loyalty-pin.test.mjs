// Test del límite de intentos del PIN de sellos (workerLoyalty.js).
// Ejecutar:  node tests/loyalty-pin.test.mjs
//
// POST /api/loyalty/stamp es público: lo llama la carta desde el móvil del cliente. El límite contaba
// cada sello en KV, con dos problemas: cualquiera podía gastar el cupo diario de escrituras de KV que
// comparte con la caché de las guías, y un restaurante lleno sellando desde su WiFi (misma IP) se
// bloqueaba a sí mismo al sello 16. Ahora cuenta solo los PIN equivocados, en security_audit_log.

import { loadWorkerModule } from './_load.mjs';
import { makeAuditLog } from './_audit.mjs';

const { module: loyalty, cleanup } = await loadWorkerModule('workerLoyalty.js');
const { handleLoyaltyRequests } = loyalty;

const PIN = '4821';

function makeEnv() {
    const audit = makeAuditLog();
    const state = { audit, kvWrites: 0, stamps: 0 };
    const kv = { async get() { return null; }, async put() { state.kvWrites++; }, async delete() { state.kvWrites++; } };
    const env = {
        RATE_LIMIT_KV: kv,
        GUIDE_CACHE: kv,
        DB: {
            prepare(sql) {
                const s = sql.replace(/\s+/g, ' ').trim();
                return {
                    bind(...args) {
                        return {
                            async first() {
                                if (s.includes('FROM loyalty_programs')) return { restaurant_id: args[0], is_active: 1, stamps_required: 10 };
                                if (s.includes('FROM restaurant_details')) return { redeem_pin: PIN };
                                if (s.includes('FROM restaurants')) return { slug: 'casa-ana' };
                                return null; // sin tarjeta previa: cada sello crea la suya
                            },
                            async all() {
                                if (s.includes('FROM security_audit_log')) return { results: audit.select(args) };
                                return { results: [] };
                            },
                            async run() {
                                if (s.startsWith('INSERT INTO security_audit_log')) audit.insert(args);
                                if (s.startsWith('INSERT INTO loyalty_stamps')) state.stamps++;
                                return { success: true };
                            },
                        };
                    },
                };
            },
        },
    };
    return { env, state };
}

let visitor = 0;
function stamp(env, pin, { ip = '203.0.113.20', restaurant = 'rest_1' } = {}) {
    return handleLoyaltyRequests(new Request('https://api.visualtastes.com/api/loyalty/stamp', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip },
        body: JSON.stringify({ restaurant_id: restaurant, visitor_id: `v${++visitor}`, ...(pin ? { pin } : {}) }),
    }), env);
}

let pass = 0, fail = 0;
function assert(label, condition, detail = '') {
    condition ? pass++ : fail++;
    console.log(`${condition ? '  ok  ' : ' FAIL '} ${label}${detail ? '  — ' + detail : ''}`);
}

console.log('\n--- Sellar no gasta KV ni tiene tope ---');
{
    const { env, state } = makeEnv();
    const codes = [];
    for (let i = 0; i < 20; i++) codes.push((await stamp(env, PIN)).status);
    assert('20 sellos seguidos desde la misma IP: todos entran', codes.every((c) => c === 200), codes.join(','));
    assert('...y los 20 se guardan', state.stamps === 20, `${state.stamps} sellos`);
    assert('...sin escribir en KV', state.kvWrites === 0, `${state.kvWrites} escrituras`);
    assert('...ni dejar nada en el log de seguridad', state.audit.rows.length === 0);
}

console.log('\n--- Los PIN equivocados sí cuentan ---');
{
    const { env, state } = makeEnv();
    const sinPin = await stamp(env, null);
    assert('Sin PIN → 403 pidiendo el PIN', sinPin.status === 403 && (await sinPin.json()).requires_pin === true);
    assert('...y no cuenta como intento', state.audit.rows.length === 0);

    const codes = [];
    for (let i = 0; i < 17; i++) codes.push((await stamp(env, '0000')).status);
    assert('Los 15 primeros PIN equivocados se contestan (403)', codes.slice(0, 15).every((c) => c === 403), codes.join(','));
    assert('A partir del 16º se bloquea (429)', codes.slice(15).every((c) => c === 429), codes.join(','));
    assert('Bloqueada, ni el PIN bueno entra', (await stamp(env, PIN)).status === 429);
    assert('Los fallos quedan en security_audit_log con su restaurante',
        state.audit.rows.length === 15 && state.audit.rows.every((r) => r.event_type === 'loyalty_pin_failed' && r.restaurant_id === 'rest_1'));
    assert('Nada de esto escribe en KV', state.kvWrites === 0, `${state.kvWrites} escrituras`);

    assert('Otra IP no hereda el bloqueo', (await stamp(env, PIN, { ip: '203.0.113.21' })).status === 200);
    assert('Otro restaurante desde la misma IP tampoco', (await stamp(env, PIN, { restaurant: 'rest_2' })).status === 200);
}

console.log('\n--- Ventana y barrera por minuto ---');
{
    const { env, state } = makeEnv();
    const ip = '203.0.113.30';
    const hace16min = Date.now() - 16 * 60 * 1000;
    for (let i = 0; i < 15; i++) state.audit.seed('loyalty_pin_failed', ip, null, { at: hace16min, restaurantId: 'rest_1' });
    assert('15 fallos de hace 16 minutos ya no bloquean', (await stamp(env, PIN, { ip })).status === 200);

    const keys = [];
    env.AUTH_IP_LIMITER = { async limit({ key }) { keys.push(key); return { success: false }; } };
    assert('Con la barrera por minuto saltada → 429', (await stamp(env, PIN, { ip })).status === 429);
    assert('...por IP y con su ámbito', keys.length === 1 && keys[0] === `stamp-pin:${ip}`, keys.join(','));
}

cleanup();
console.log(`\n${pass} ok, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
