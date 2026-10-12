// El SQL del worker, contra SQLite de verdad y con el esquema de producción.
// Ejecutar:  npm run test:sql
//
// En las demás suites D1 es un doble que contesta lo que el test le dice: un SELECT a una columna que no
// existe pasa. Así llegó a producción un worker que pedía columnas de una migración sin aplicar (jul-2026:
// la guía pública dio 500 hasta que alguien aplicó la 0059 y la 0060 a mano).
//
// Aquí el SQL lo compila y lo ejecuta el mismo motor que en producción (tests/_d1.mjs), sobre
// BDschemaFinal.sql, que es el esquema EXPORTADO de producción. Dos pasadas:
//
//   1. EN FRÍO. Se lee cada worker*.js, se saca el texto de cada `.prepare(...)` y se compila con EXPLAIN,
//      sin ejecutarlo. Cubre todos los módulos, también las ramas a las que ningún test llega. Solo vale
//      para el SQL de texto fijo (y para el que solo interpola la lista de un IN).
//   2. EN CALIENTE. Se lanzan contra el router las peticiones de tests/routes.test.mjs con una sesión de
//      superadmin y una base con datos mínimos. Así se ejecuta también el SQL que se construye al vuelo
//      (filtros, SET dinámicos), y sale lo que solo se ve al ejecutar: parámetros de más o de menos.
//
// **Si falla con «no such column» en código nuevo**: el worker va por delante de la base. Aplica la
// migración a producción y regenera BDschemaFinal.sql (skill /migracion); el test te dice cuál la crea.
// No se arregla añadiendo la columna al esquema a mano: ese fichero dice lo que HAY en producción.
//
// Lo que NO prueba: que el resultado sea el correcto. Solo que SQLite acepta la consulta.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, compileError, isSqlError, loadSchema, openD1, seed } from './_d1.mjs';
import { loadWorkerModule } from './_load.mjs';

let pass = 0, fail = 0;
function check(label, ok, detail = '') {
    ok ? pass++ : fail++;
    console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${!ok && detail ? `\n        ${detail}` : ''}`);
}

// SQL que ya fallaba el día que se escribió esta suite (oct-2026). Se apunta aquí para que la suite pueda
// bloquear lo NUEVO sin quedarse en rojo por lo viejo; falla también si uno de estos deja de fallar, para que
// la lista se vacíe al arreglarlos. No añadas nada aquí para hacer pasar un cambio tuyo: arregla la consulta.
// Hubo dos (los teléfonos del admin de la guía pasaban un valor de más a .bind()) y se arreglaron el mismo día.
// Forma de una entrada: { sql: 'trozo de la consulta', error: 'trozo del error', donde: 'fichero, función y por qué' }
const CONOCIDOS = [];

const d1 = await openD1();
if (!d1) {
    // Sin motor no hay nada que probar. No se da por bueno en silencio: la línea sale en el resumen.
    console.log('  --   saltado: no encuentro Miniflare (ni en el repo ni en la instalación global de wrangler)');
    console.log('\n0 ok, 0 fail');
    process.exit(0);
}
const { db } = d1;
const oneLine = (sql) => sql.replace(/\s+/g, ' ').trim();

/** Si el error nombra una tabla o columna que alguna migración crea, lo dice: suele ser la que falta aplicar. */
const MIGRATIONS = readdirSync(join(ROOT, 'migrations')).filter((f) => f.endsWith('.sql')).sort()
    .map((f) => ({ file: f, text: readFileSync(join(ROOT, 'migrations', f), 'utf8') }));
function hint(error) {
    const name = (error.match(/no such (?:column|table): (?:\w+\.)?(\w+)/) || error.match(/has no column named (\w+)/) || [])[1];
    if (!name) return '';
    const creators = MIGRATIONS.filter((m) => new RegExp(`\\b${name}\\b`).test(m.text)).map((m) => m.file).slice(-2);
    return creators.length
        ? `  ← la nombra migrations/${creators.join(' y ')}: ¿está aplicada en producción y regenerado BDschemaFinal.sql?`
        : '  ← ninguna migración la crea: ¿un nombre mal escrito?';
}

try {
    // =========================================================================
    console.log('\n--- Esquema de producción ---');
    const tables = await loadSchema(db);
    check(`BDschemaFinal.sql carga entero en SQLite (${tables} tablas, Miniflare ${d1.version})`, tables > 80, `solo ${tables} tablas`);

    // =========================================================================
    // 1. EN FRÍO: cada .prepare() de texto fijo compila
    // =========================================================================
    console.log('\n--- En frío: el SQL de texto fijo de cada módulo compila ---');
    const staticTexts = new Set();
    let dynamicSites = 0;

    /**
     * Los `.prepare(x)` de un fuente: su SQL si es de texto fijo, o null si se construye al vuelo.
     *
     * Se lee a mano y no con un analizador de JavaScript para no depender de node_modules: la suite tiene que
     * correr en un worktree recién creado, que es desde donde se despliega. Solo hay que entender el primer
     * argumento: una plantilla, una cadena o cualquier otra cosa (una variable: se construye al vuelo).
     */
    function prepareCalls(source) {
        const found = [];
        const lineAt = (index) => source.slice(0, index).split('\n').length;
        for (const match of source.matchAll(/\.prepare\(\s*/g)) {
            let i = match.index + match[0].length;
            const open = source[i];
            const line = lineAt(match.index);
            if (open === "'" || open === '"') {
                let text = '';
                for (i++; i < source.length && source[i] !== open; i++) text += source[i] === '\\' ? source[++i] : source[i];
                found.push({ line, sql: text });
            } else if (open === '`') {
                // Trozos de texto y, entre ellos, las expresiones ${…} (que pueden llevar llaves y plantillas dentro).
                const quasis = [''];
                let exprs = 0;
                for (i++; i < source.length && source[i] !== '`'; i++) {
                    if (source[i] === '\\') { quasis[quasis.length - 1] += source[++i]; continue; }
                    if (source[i] === '$' && source[i + 1] === '{') {
                        let depth = 1;
                        for (i += 2; i < source.length && depth > 0; i++) {
                            const c = source[i];
                            if (c === '{') depth++;
                            else if (c === '}') depth--;
                            else if (c === "'" || c === '"' || c === '`') { for (i++; i < source.length && source[i] !== c; i++) if (source[i] === '\\') i++; }
                        }
                        i--;
                        exprs++;
                        quasis.push('');
                        continue;
                    }
                    quasis[quasis.length - 1] += source[i];
                }
                // `… IN (${marcas})`: la lista de un IN son solo «?», así que con uno compila igual.
                const inList = quasis.slice(0, -1).every((q, n) => /\bIN\s*\(\s*$/i.test(q) && /^\s*\)/.test(quasis[n + 1]));
                found.push({ line, sql: exprs === 0 ? quasis[0] : inList ? quasis.join('?') : null });
            } else if (/[A-Za-z_$]/.test(open || '')) {
                found.push({ line, sql: null });
            }
        }
        return found;
    }

    let compiled = 0;
    for (const file of readdirSync(ROOT).filter((f) => /^worker.*\.js$/.test(f)).sort()) {
        const calls = prepareCalls(readFileSync(join(ROOT, file), 'utf8'));
        const fixed = calls.filter((c) => c.sql !== null);
        dynamicSites += calls.length - fixed.length;
        if (!calls.length) continue;
        const errors = [];
        for (let i = 0; i < fixed.length; i += 20) {
            await Promise.all(fixed.slice(i, i + 20).map(async (c) => {
                staticTexts.add(oneLine(c.sql));
                const error = await compileError(db, c.sql);
                if (error) errors.push(`${file}:${c.line}  ${error}${hint(error)}`);
            }));
        }
        compiled += fixed.length;
        const rest = calls.length - fixed.length;
        check(`${file}: ${fixed.length} consultas compilan${rest ? ` (+${rest} que se construyen al vuelo)` : ''}`, errors.length === 0, errors.sort().join('\n        '));
    }
    check(`Se ha leído el SQL del worker (${compiled} consultas de texto fijo, ${dynamicSites} al vuelo)`, compiled > 400, 'demasiado pocas: ¿ha cambiado cómo se llama a .prepare()?');

    // =========================================================================
    // 2. EN CALIENTE: las peticiones de la tabla de rutas, contra la base real
    // =========================================================================
    console.log('\n--- En caliente: el router contra la base real ---');

    // Datos mínimos para que las peticiones pasen de la primera consulta: dos restaurantes con su dueño,
    // una agencia con un piso y su tele. Los nombres son los que usa tests/routes.test.mjs.
    const seeded = [];
    const put = async (table, row) => {
        try { await seed(db, table, row); seeded.push(table); } catch (error) { console.log(`  --   semilla de ${table} sin poner: ${String(error.message).slice(0, 110)}`); }
    };
    await put('accounts', { id: 'acc_test' });
    await put('users', { id: 'user_a', email: 'a@example.com' });
    await put('users', { id: 'user_root', email: 'root@example.com', is_superadmin: 1 });
    for (const [id, slug] of [['rest_A', 'casa-a'], ['rest_B', 'casa-b']]) await put('restaurants', { id, slug, account_id: 'acc_test', name: slug });
    await put('restaurant_staff', { restaurant_id: 'rest_A', user_id: 'user_a', role: 'owner', is_active: 1 });
    await put('menus', { id: 'menu_A', restaurant_id: 'rest_A', name: 'Carta' });
    await put('sections', { id: 'sec_A', restaurant_id: 'rest_A', menu_id: 'menu_A' });
    await put('dishes', { id: 'dish_A', restaurant_id: 'rest_A' });
    await put('guide_agencies', { id: 'agency_1', name: 'Agencia', slug: 'agencia' });
    await put('guide_zones', { id: 'zone_1', name: 'Zona', slug: 'zona' });
    await put('guide_apartments', { id: 'apt_1', agency_id: 'agency_1', zone_id: 'zone_1', slug: 'mi-piso-1a2b3c4d', name: 'Mi piso', is_active: 1 });
    await put('guide_apartment_info', { id: 'info_1', apartment_id: 'apt_1' });
    await put('guide_tv_devices', { id: 'tv_1', apartment_id: 'apt_1', pairing_code: 'ABC123' });

    // Toda sentencia que ejecute el worker pasa por aquí: se apunta su texto y, si falla, por qué.
    // El texto tal cual se guarda aparte: puesto en una línea, un comentario «--» se come el resto de la consulta.
    const executed = new Map(); // SQL en una línea → { sql, error: el de SQL o null }
    const note = (sql, error) => {
        const key = oneLine(sql);
        const message = error && isSqlError(String(error.message)) ? String(error.message) : null;
        executed.set(key, { sql, error: message ?? executed.get(key)?.error ?? null });
    };
    const tracked = (statement, sql) => {
        const run = (method) => async (...args) => {
            try { const out = await statement[method](...args); note(sql, null); return out; } catch (error) { note(sql, error); throw error; }
        };
        return {
            sql, statement,
            bind: (...args) => { try { return tracked(statement.bind(...args), sql); } catch (error) { note(sql, error); throw error; } },
            first: run('first'), all: run('all'), run: run('run'), raw: run('raw'),
        };
    };
    const recordingDb = {
        prepare: (sql) => tracked(db.prepare(sql), sql),
        // Un batch es una transacción: si falla no dice qué sentencia fue, así que se apuntan todas y luego
        // se compila cada una por separado.
        batch: async (list) => {
            try { const out = await db.batch(list.map((s) => s.statement)); list.forEach((s) => note(s.sql, null)); return out; } catch (error) { list.forEach((s) => note(s.sql, null)); throw error; }
        },
        exec: (sql) => db.exec(sql),
    };

    const kv = { get: async () => null, put: async () => {}, delete: async () => {}, list: async () => ({ keys: [] }) };
    const env = {
        JWT_SECRET: 'secreto-de-prueba-no-usado-en-ningun-sitio-real',
        DB: recordingDb,
        GUIDE_CACHE: kv,
        RATE_LIMIT_KV: kv,
        R2_BUCKET: { get: async () => null, head: async () => null, put: async () => ({}), delete: async () => {}, list: async () => ({ objects: [] }) },
        AI: { run: async () => ({ response: '' }) },
    };
    const ctx = { waitUntil: (p) => { Promise.resolve(p).catch(() => {}); }, passThroughOnException() {} };
    globalThis.fetch = async (url) => { throw new Error(`fetch a ${url} bloqueado en el test`); };

    const enc = new TextEncoder();
    const b64url = (input) => {
        const bytes = typeof input === 'string' ? enc.encode(input) : new Uint8Array(input);
        let bin = '';
        for (const b of bytes) bin += String.fromCharCode(b);
        return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };
    const now = Math.floor(Date.now() / 1000);
    const jwtInput = `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ userId: 'user_root', email: 'root@example.com', is_superadmin: true, tv: 0, iat: now, exp: now + 600 }))}`;
    const key = await crypto.subtle.importKey('raw', enc.encode(env.JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const token = `${jwtInput}.${b64url(await crypto.subtle.sign('HMAC', key, enc.encode(jwtInput)))}`;

    // Las filas «MÉTODO /ruta» de la tabla de rutas, leídas de su fuente: cada endpoint que alguien añade
    // allí se ejecuta aquí contra la base real sin tocar este fichero. Primero las lecturas; los DELETE, al
    // final, para que no dejen sin datos a las demás.
    const rows = [...new Set([...readFileSync(join(ROOT, 'tests', 'routes.test.mjs'), 'utf8').matchAll(/'((?:GET|POST|PUT|PATCH|DELETE) \/[^'\s]*)'/g)]
        .map((m) => m[1].replace('%', 'A').replace(/#.*$/, '')))];
    // Lecturas con mucho SQL que la tabla de rutas no necesita (allí basta una fila por handler): los
    // listados y las estadísticas del admin, con y sin filtros, que es donde se construye SQL al vuelo.
    const ADMIN = ['agencies', 'agencies/agency_1', 'apartments', 'apartments/apt_1', 'apartments/apt_1/info', 'apartments/apt_1/info/info_1/steps',
        'apartments/apt_1/info/info_1/translations', 'apartments/apt_1/info/coverage', 'apartments/apt_1/orderable', 'apartments/apt_1/orders',
        'apartments/apt_1/phones', 'apartments/apt_1/stats', 'apartments/apt_1/store-items', 'apartments/apt_1/welcome', 'commissions', 'commissions/summary',
        'experiences', 'info-categories', 'phone-categories', 'pois', 'restaurants-search', 'stats', 'stats/conversions', 'stats/dashboard', 'stats/devices',
        'stats/experiences', 'stats/sessions', 'stats/store', 'store-items', 'zone-restaurants', 'zones', 'tv/stats/apt_1', 'tv/tiles', 'tv/devices', 'tv/fleet', 'qr/overview'];
    const FILTERS = 'agency_id=agency_1&zone_id=zone_1&apartment_id=apt_1&restaurant_id=rest_A&restaurantId=rest_A&q=casa&days=30&period=30d&date=2026-10-12&month=2026-10&party_size=2';
    rows.push(
        ...ADMIN.map((p) => `GET /guide/admin/${p}`),
        ...ADMIN.map((p) => `GET /guide/admin/${p}?${FILTERS}`),
        'GET /guide/mi-piso-1a2b3c4d?lang=en', 'GET /guide/mi-piso-1a2b3c4d/explore?zone=zone_1', 'GET /guide/tv/config/ABC123?lang=en',
        ...['analytics', 'analytics/dishes', 'analytics/sections', 'analytics/sessions', 'dishes', 'sections', 'sessions', 'menus', 'reservations',
            'reservations/availability', 'reservations/availability/calendar', 'delivery/orders/rest_A', 'api/campaigns', 'api/loyalty/card',
            'track/analytics/overview'].map((p) => `GET /${p}?${FILTERS}`),
        ...['campaigns', 'loyalty-program', 'loyalty-cards', 'redeem-pin', 'staff-qrs', 'notifications/subscribers'].map((p) => `GET /api/restaurants/rest_A/${p}`),
        ...['', '/staff', '/reels', '/landing', '/sections', '/menus', '/dishes', '/allergens', '/analytics'].map((p) => `GET /restaurants/casa-a${p}`),
    );
    const order = { GET: 0, POST: 1, PUT: 2, PATCH: 3, DELETE: 4 };
    rows.sort((a, b) => order[a.split(' ')[0]] - order[b.split(' ')[0]]);

    const { module: workerMod, cleanup } = await loadWorkerModule('worker.js');
    const saved = { log: console.log, error: console.error, warn: console.warn };
    console.log = console.error = console.warn = () => {};
    let crashed = 0;
    try {
        for (const row of rows) {
            const [method, path] = row.split(' ');
            const init = { method, headers: { Authorization: `Bearer ${token}` } };
            if (method !== 'GET' && method !== 'DELETE') {
                init.headers['content-type'] = 'application/json';
                init.body = JSON.stringify({ restaurant_id: 'rest_A', apartment_id: 'apt_1', agency_id: 'agency_1' });
            }
            try { await workerMod.default.fetch(new Request(`https://api.test${path}`, init), env, ctx); } catch { crashed++; }
        }
    } finally {
        Object.assign(console, saved);
        cleanup();
    }
    check(`${rows.length} peticiones lanzadas contra ${new Set(seeded).size} tablas con datos`, rows.length > 100 && crashed === 0, `${rows.length} filas leídas de routes.test.mjs, ${crashed} reventaron fuera del router`);

    // Lo que se ejecutó y no era texto fijo es SQL construido al vuelo: se compila ahora, ya con su forma final.
    const dynamicTexts = [...executed.keys()].filter((sql) => !staticTexts.has(sql));
    const runtimeErrors = [];
    const known = new Set();
    const report = (text, error) => {
        const old = CONOCIDOS.find((k) => text.includes(k.sql) && error.includes(k.error));
        if (old) known.add(old);
        else runtimeErrors.push(`${error.replace(/^D1_ERROR:\s*/, '')}${hint(error)}\n          ${text.slice(0, 220)}`);
    };
    for (const [text, { error }] of executed) if (error) report(text, error);
    for (const text of dynamicTexts) {
        const { sql, error: seen } = executed.get(text);
        if (seen) continue; // ya está apuntada con su error
        const error = await compileError(db, sql);
        if (error && isSqlError(error)) report(text, error);
    }
    check(`${executed.size} sentencias distintas ejecutadas (${dynamicTexts.length} construidas al vuelo): SQLite las acepta`, runtimeErrors.length === 0, runtimeErrors.join('\n        '));
    for (const k of known) console.log(`  --   fallo conocido, sin arreglar: ${k.donde}`);
    const fixed = CONOCIDOS.filter((k) => !known.has(k));
    if (CONOCIDOS.length) check(`Los ${CONOCIDOS.length} fallos conocidos siguen fallando (si no, bórralos de CONOCIDOS)`, fixed.length === 0, `ya no falla: ${fixed.map((k) => k.donde).join(' · ')}`);
    check('La pasada en caliente llega al SQL dinámico', dynamicTexts.length >= 10, `solo ${dynamicTexts.length}: ¿faltan datos de semilla o filas en la tabla de rutas?`);
} finally {
    await d1.dispose();
}

console.log(`\n${pass} ok, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
