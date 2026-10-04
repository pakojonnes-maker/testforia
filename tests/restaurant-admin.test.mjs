// Endpoints del admin de restaurantes arreglados en oct-2026: campañas de
// marketing (JSON doblemente codificado, DELETE) y reservas (PATCH roto,
// reserva pública validada).
// Ejecutar:  npm run test:restaurant-admin
import { loadWorkerModule } from './_load.mjs';

let pass = 0, fail = 0;
function check(label, ok, detail = '') {
    ok ? pass++ : fail++;
    console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${!ok && detail ? `  → ${detail}` : ''}`);
}

// D1 simulado: responde según el SQL y anota cada sentencia ejecutada.
function fakeDb(answer) {
    const log = [];
    const stmt = (sql, args = []) => ({
        sql, args,
        bind: (...a) => stmt(sql, a),
        first: async () => { log.push({ sql, args }); return answer(sql, args, 'first'); },
        all: async () => { log.push({ sql, args }); return { results: answer(sql, args, 'all') ?? [] }; },
        run: async () => { log.push({ sql, args }); return { meta: { changes: 1 } }; },
    });
    return {
        log,
        prepare: (sql) => stmt(sql),
        batch: async (list) => list.map(s => { log.push({ sql: s.sql, args: s.args }); return { results: answer(s.sql, s.args, 'all') ?? [] }; }),
    };
}

const kv = () => {
    const puts = [];
    return { puts, get: async () => null, put: async (k, v) => { puts.push([k, v]); } };
};

// ---------------------------------------------------------------------------
console.log('\n--- parseStoredJson: campañas tal como las dejaba el admin ---');
const marketing = await loadWorkerModule('workerMarketing.js');
const { parseStoredJson, handleMarketingRequests } = marketing.module;

const content = { title: 'Menú por 15,80', body: 'hamburguesa: patatas y bebida', media_type: 'none' };
// El admin hacía JSON.stringify y el worker otra vez JSON.stringify.
const doubleEncoded = JSON.stringify(JSON.stringify(content));
check('objeto tal cual', JSON.stringify(parseStoredJson(content)) === JSON.stringify(content));
check('string JSON normal', parseStoredJson(JSON.stringify(content)).title === content.title);
check('doblemente codificado (3 de 4 en producción)', parseStoredJson(doubleEncoded).body === content.body);

// Pecados: GET devolvía un string, el admin lo volvía a parsear y quedaba otro
// string; luego {...settings, delay} lo trocea carácter a carácter.
const settings = { auto_open: true, frequency: 'daily', dismissible: false };
const asString = JSON.stringify(JSON.stringify(settings));
const charMap = { ...asString.split(''), delay: 3000 };
const storedCharMap = JSON.stringify(JSON.stringify(charMap));
const repaired = parseStoredJson(storedCharMap);
check('settings troceado + claves añadidas encima', repaired.frequency === 'daily' && repaired.delay === 3000 && repaired.dismissible === false,
    JSON.stringify(repaired));
check('null / vacío / basura → {}', JSON.stringify([parseStoredJson(null), parseStoredJson(''), parseStoredJson('{roto')]) === '[{},{},{}]');
check('un array no es un objeto de campaña', JSON.stringify(parseStoredJson('[1,2]')) === '{}');

// ---------------------------------------------------------------------------
console.log('\n--- Campañas: escribir limpio, DELETE, invalidar la carta ---');
{
    const db = fakeDb((sql) => {
        if (sql.includes('RETURNING restaurant_id')) return { restaurant_id: 'rest_A' };
        if (sql.includes('SELECT slug FROM restaurants')) return { slug: 'casa-ana' };
        return null;
    });
    const env = { DB: db, GUIDE_CACHE: kv() };
    const put = await handleMarketingRequests(new Request('https://x/api/campaigns/camp_1', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Bienvenida', content: JSON.stringify(content), settings }),
    }), env);
    const update = db.log.find(q => q.sql.includes('UPDATE marketing_campaigns'));
    check('PUT responde 200', put.status === 200);
    check('PUT guarda content como objeto JSON (una sola codificación)', JSON.parse(update.args[1]).title === content.title, update.args[1]);
    check('PUT invalida la caché de la carta', env.GUIDE_CACHE.puts.some(([k]) => k === 'ver:restaurant:casa-ana'));

    const del = await handleMarketingRequests(new Request('https://x/api/campaigns/camp_1', { method: 'DELETE' }), env);
    check('DELETE existe y responde 200', del.status === 200);
    check('DELETE borra por id', db.log.some(q => q.sql.includes('DELETE FROM marketing_campaigns') && q.args[0] === 'camp_1'));
}
marketing.cleanup();

// ---------------------------------------------------------------------------
console.log('\n--- Reservas ---');
const reservations = await loadWorkerModule('workerReservations.js');
const { handleReservationRequests } = reservations.module;
{
    const db = fakeDb((sql) => {
        if (sql.includes('SELECT status FROM reservations')) return { status: 'pending' };
        return null;
    });
    const res = await handleReservationRequests(new Request('https://x/reservations/res_1', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed', admin_notes: 'VIP', party_size: '4' }),
    }), { DB: db });
    const body = await res.json();
    const update = db.log.find(q => q.sql.includes('UPDATE reservations'));
    check('PATCH /reservations/:id ya no da 500', res.status === 200 && body.success === true, JSON.stringify(body));
    check('PATCH aplica estado, notas y comensales', update?.args.includes('confirmed') && update.args.includes('VIP') && update.args.includes(4));
    check('PATCH registra el estado anterior en el log',
        db.log.some(q => q.sql.includes('INSERT INTO reservation_logs') && q.args.includes('pending') && q.args.includes('confirmed')));

    const bad = await handleReservationRequests(new Request('https://x/reservations/res_1', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'lo-que-sea' }),
    }), { DB: db });
    check('PATCH rechaza un estado inventado', bad.status === 400);
}
{
    const booking = {
        restaurant_id: 'rest_A', client_name: 'Lucía', client_email: 'l@x.es', client_phone: '+34 600 000 000',
        reservation_date: '2026-10-10', reservation_time: '21:00', party_size: 2, accepted_policy: true,
    };
    const post = (env, body = booking) => handleReservationRequests(new Request('https://x/reservations', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    }), env);

    const closed = fakeDb(() => null);
    check('POST /reservations rechaza si el restaurante no tiene reservas activas', (await post({ DB: closed })).status === 403);

    const open = fakeDb((sql) => (sql.includes('FROM reservation_settings') ? { max_party_size: 6 } : null));
    const ok = await post({ DB: open });
    const insert = open.log.find(q => q.sql.includes('INSERT INTO reservations'));
    check('POST /reservations crea la reserva', ok.status === 200);
    check('POST /reservations no pasa undefined a D1 (notas/ocasión → null)', insert && !insert.args.includes(undefined));
    const { client_phone: _omit, ...noPhone } = booking;
    check('POST /reservations sin teléfono → 400 (la columna es NOT NULL)', (await post({ DB: open }, noPhone)).status === 400);
    check('POST /reservations rechaza grupos por encima del máximo', (await post({ DB: open }, { ...booking, party_size: 9 })).status === 400);
    check('POST /reservations rechaza fechas mal formadas', (await post({ DB: open }, { ...booking, reservation_date: '10/10/2026' })).status === 400);

    const limited = { DB: open, RESERVATION_IP_LIMITER: { limit: async () => ({ success: false }) } };
    check('POST /reservations respeta el freno por IP', (await post(limited)).status === 429);
}
{
    const db = fakeDb((sql) => (sql.includes('magic_link_token') ? { id: 'res_1', status: 'pending' } : null));
    await handleReservationRequests(new Request('https://x/reservations/by-token/abc-123'), { DB: db });
    const select = db.log[0]?.sql ?? '';
    check('by-token no devuelve notas internas ni IP', !select.includes('r.*') && !select.includes('admin_notes') && !select.includes('ip_address'));
}
reservations.cleanup();

console.log(`\n${pass} ok, ${fail} fail`);
process.exit(fail ? 1 : 0);
