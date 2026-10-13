// Test de endurecimiento del login (workerAuthentication.js).
// Ejecutar:  npm run test:auth
//
// Es un test de integración: llama a handleAuthRequests con Requests reales y
// un D1/KV simulados, en vez de tocar internos no exportados.
//
// Tarda unos segundos a propósito: cada login deriva PBKDF2 de verdad
// (100.000 iteraciones, el tope de Workers), que es justo lo que se quiere comprobar.

import { loadWorkerModule } from './_load.mjs';
import { makeAuditLog } from './_audit.mjs';

const { module: auth, cleanup } = await loadWorkerModule('workerAuthentication.js');
const { handleAuthRequests, hashPassword, validatePassword, verifyJWT } = auth;

const JWT_SECRET = 'secreto-de-prueba-no-usado-en-ningun-sitio-real';
const GOOD_PASSWORD = 'contraseña-larga-de-prueba';

// --- Utilidades ------------------------------------------------------------

function buf2hex(buffer) {
    return [...new Uint8Array(buffer)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Reproduce el formato antiguo: `salt_hex:hash_hex` con 100.000 iteraciones. */
async function legacyHash(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const km = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, km, 256
    );
    return `${buf2hex(salt)}:${buf2hex(bits)}`;
}

// --- Entorno simulado ------------------------------------------------------

function makeEnv(users) {
    const kv = new Map();
    const audit = makeAuditLog();
    const state = { users, updates: [], kv, kvWrites: 0, audit };

    const env = {
        JWT_SECRET,
        RATE_LIMIT_KV: {
            async get(key) {
                const v = kv.get(key);
                return v === undefined ? null : JSON.parse(v);
            },
            async put(key, value) { state.kvWrites++; kv.set(key, value); },
            async delete(key) { state.kvWrites++; kv.delete(key); },
        },
        DB: {
            prepare(sql) {
                const s = sql.replace(/\s+/g, ' ').trim();
                return {
                    bind(...args) {
                        return {
                            async first() {
                                if (s.includes('FROM users WHERE email')) {
                                    return state.users.find((u) => u.email === args[0]) ?? null;
                                }
                                if (s.includes('FROM users WHERE id')) {
                                    return state.users.find((u) => u.id === args[0]) ?? null;
                                }
                                return null;
                            },
                            async all() {
                                if (s.includes('FROM security_audit_log')) return { results: audit.select(args) };
                                return { results: [] };
                            },
                            async run() {
                                if (s.startsWith('INSERT INTO security_audit_log')) audit.insert(args);
                                if (s.includes('UPDATE users SET password_hash')) {
                                    const u = state.users.find((x) => x.id === args[1]);
                                    if (u) u.password_hash = args[0];
                                    state.updates.push('password_hash');
                                }
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

function loginRequest(email, password, ip = '203.0.113.10') {
    return new Request('https://api.visualtastes.com/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip },
        body: JSON.stringify({ email, password }),
    });
}

// --- Runner ----------------------------------------------------------------

let pass = 0, fail = 0;
function assert(label, condition, detail = '') {
    condition ? pass++ : fail++;
    console.log(`${condition ? '  ok  ' : ' FAIL '} ${label}${detail ? '  — ' + detail : ''}`);
}

// --- Tests -----------------------------------------------------------------

console.log('\n--- Login básico ---');
{
    const { env } = makeEnv([
        { id: 'u1', email: 'ana@test.com', display_name: 'Ana', password_hash: await hashPassword(GOOD_PASSWORD), photo_url: null, is_superadmin: 0 },
    ]);

    const ok = await handleAuthRequests(loginRequest('ana@test.com', GOOD_PASSWORD), env);
    const okBody = await ok.json();
    assert('Credenciales correctas → 200 con token', ok.status === 200 && !!okBody.token);

    const payload = await verifyJWT(okBody.token, JWT_SECRET);
    assert('El token emitido verifica contra JWT_SECRET', payload?.userId === 'u1');
    assert('Un token con otro secreto no verifica', (await verifyJWT(okBody.token, 'otro-secreto')) === null);

    const bad = await handleAuthRequests(loginRequest('ana@test.com', 'contraseña-equivocada'), env);
    const badBody = await bad.json();
    assert('Contraseña incorrecta → 401', bad.status === 401);

    const nouser = await handleAuthRequests(loginRequest('nadie@test.com', GOOD_PASSWORD), env);
    const nouserBody = await nouser.json();
    assert('Email inexistente → 401', nouser.status === 401);
    assert('El mensaje no distingue entre contraseña mala y cuenta inexistente',
        nouserBody.message === badBody.message, `"${badBody.message}" / "${nouserBody.message}"`);
}

console.log('\n--- Enumeración de cuentas por temporización ---');
{
    const { env } = makeEnv([
        { id: 'u1', email: 'ana@test.com', display_name: 'Ana', password_hash: await hashPassword(GOOD_PASSWORD), photo_url: null, is_superadmin: 0 },
    ]);
    const time = async (email, ip) => {
        const t0 = performance.now();
        await handleAuthRequests(loginRequest(email, 'una-contraseña-cualquiera', ip), env);
        return performance.now() - t0;
    };
    // IPs distintas para no chocar con el rate limiting.
    const existente = await time('ana@test.com', '198.51.100.1');
    const inexistente = await time('nadie@test.com', '198.51.100.2');
    const ratio = Math.max(existente, inexistente) / Math.min(existente, inexistente);
    assert('El tiempo no delata si la cuenta existe', ratio < 1.5,
        `existente ${existente.toFixed(0)}ms vs inexistente ${inexistente.toFixed(0)}ms (ratio ${ratio.toFixed(2)})`);
}

console.log('\n--- Rate limiting ---');
{
    const { env } = makeEnv([
        { id: 'u1', email: 'ana@test.com', display_name: 'Ana', password_hash: await hashPassword(GOOD_PASSWORD), photo_url: null, is_superadmin: 0 },
    ]);
    const ip = '192.0.2.50';
    const codes = [];
    for (let i = 0; i < 7; i++) {
        const r = await handleAuthRequests(loginRequest('ana@test.com', 'mal', ip), env);
        codes.push(r.status);
    }
    assert('Los 5 primeros intentos se procesan (401)', codes.slice(0, 5).every((c) => c === 401), codes.join(','));
    assert('A partir del 6º se bloquea (429)', codes.slice(5).every((c) => c === 429), codes.join(','));

    const blocked = await handleAuthRequests(loginRequest('ana@test.com', GOOD_PASSWORD, ip), env);
    assert('Bloquea incluso con la contraseña correcta', blocked.status === 429);
    assert('Incluye Retry-After', Number(blocked.headers.get('Retry-After')) > 0,
        `Retry-After: ${blocked.headers.get('Retry-After')}`);

    // Otra IP no arrastra el bloqueo de la primera.
    const otraIp = await handleAuthRequests(loginRequest('ana@test.com', GOOD_PASSWORD, '192.0.2.99'), env);
    assert('Otra IP no hereda el bloqueo', otraIp.status === 200);
}

console.log('\n--- El acierto libera el contador ---');
{
    const { env } = makeEnv([
        { id: 'u1', email: 'ana@test.com', display_name: 'Ana', password_hash: await hashPassword(GOOD_PASSWORD), photo_url: null, is_superadmin: 0 },
    ]);
    const ip = '192.0.2.77';
    for (let i = 0; i < 3; i++) await handleAuthRequests(loginRequest('ana@test.com', 'mal', ip), env);
    const good = await handleAuthRequests(loginRequest('ana@test.com', GOOD_PASSWORD, ip), env);
    assert('Login correcto tras 3 fallos → 200', good.status === 200);
    for (let i = 0; i < 5; i++) await handleAuthRequests(loginRequest('ana@test.com', 'mal', ip), env);
    const sixth = await handleAuthRequests(loginRequest('ana@test.com', 'mal', ip), env);
    assert('El contador se reinició: vuelve a haber 5 intentos', sixth.status === 429);
}

// Los fallos se cuentan en security_audit_log, no en KV. Los escenarios de aquí siembran la tabla en
// vez de hacer 30 logins de verdad: cada uno deriva PBKDF2 y la suite tardaría medio minuto más.
console.log('\n--- El límite no gasta KV y aguanta lo que KV no aguantaba ---');
{
    const seedUser = async () => makeEnv([
        { id: 'u1', email: 'ana@test.com', display_name: 'Ana', password_hash: await hashPassword(GOOD_PASSWORD), photo_url: null, is_superadmin: 0 },
    ]);

    {
        const { env, state } = await seedUser();
        const ip = '192.0.2.120';
        await handleAuthRequests(loginRequest('ana@test.com', 'mal', ip), env);
        await handleAuthRequests(loginRequest('nadie@test.com', 'mal', ip), env);
        await handleAuthRequests(loginRequest('ana@test.com', GOOD_PASSWORD, ip), env);
        assert('Dos fallos y un acierto: ni una escritura en KV', state.kvWrites === 0, `${state.kvWrites} escrituras`);
        assert('Los dos fallos quedan en el log con su email',
            state.audit.rows.filter((r) => r.event_type === 'login_failed' && JSON.parse(r.detail).email).length === 2);
    }

    {
        // Credential stuffing: 30 emails distintos desde una IP. La ventana por cuenta no lo ve.
        const { env, state } = await seedUser();
        const ip = '192.0.2.121';
        for (let i = 0; i < 30; i++) state.audit.seed('login_failed', ip, { email: `victima${i}@test.com`, reason: 'no_such_user' });
        const r = await handleAuthRequests(loginRequest('ana@test.com', GOOD_PASSWORD, ip), env);
        assert('30 fallos en una hora desde una IP → 429 aunque la contraseña sea buena', r.status === 429);
        const otra = await handleAuthRequests(loginRequest('ana@test.com', GOOD_PASSWORD, '192.0.2.122'), env);
        assert('...y otra IP entra', otra.status === 200);
    }

    {
        // Fuera de su ventana un fallo ya no cuenta: 5 de hace 16 minutos no bloquean la cuenta.
        const { env, state } = await seedUser();
        const ip = '192.0.2.123';
        const hace16min = Date.now() - 16 * 60 * 1000;
        for (let i = 0; i < 5; i++) state.audit.seed('login_failed', ip, { email: 'ana@test.com', reason: 'bad_password' }, { at: hace16min });
        const r = await handleAuthRequests(loginRequest('ana@test.com', GOOD_PASSWORD, ip), env);
        assert('5 fallos de hace 16 minutos ya no bloquean', r.status === 200);
    }

    {
        // Los fallos del acceso con Google no bloquean la contraseña de esa cuenta.
        const { env, state } = await seedUser();
        const ip = '192.0.2.124';
        for (let i = 0; i < 5; i++) state.audit.seed('login_failed', ip, { provider: 'google', reason: 'not_allowed', email: 'ana@test.com' });
        const r = await handleAuthRequests(loginRequest('ana@test.com', GOOD_PASSWORD, ip), env);
        assert('5 rechazos de Google para ese email no cuentan como contraseñas falladas', r.status === 200);
    }

    {
        // La barrera por minuto corta antes de leer o escribir nada.
        const { env, state } = await seedUser();
        const keys = [];
        env.AUTH_IP_LIMITER = { async limit({ key }) { keys.push(key); return { success: false }; } };
        const r = await handleAuthRequests(loginRequest('ana@test.com', GOOD_PASSWORD, '192.0.2.125'), env);
        assert('Con la barrera por minuto saltada → 429 con Retry-After', r.status === 429 && r.headers.get('Retry-After') === '60');
        assert('...por IP y con su ámbito', keys.length === 1 && keys[0] === 'login:192.0.2.125', keys.join(','));
        assert('...y sin dejar fila en el log de auditoría', state.audit.rows.length === 0, `${state.audit.rows.length} filas`);
    }
}

console.log('\n--- Migración del hash antiguo ---');
{
    const old = await legacyHash(GOOD_PASSWORD);
    const { env, state } = makeEnv([
        { id: 'u1', email: 'ana@test.com', display_name: 'Ana', password_hash: old, photo_url: null, is_superadmin: 0 },
    ]);
    assert('El hash de partida está en formato antiguo', old.includes(':') && !old.startsWith('pbkdf2$'));

    const r = await handleAuthRequests(loginRequest('ana@test.com', GOOD_PASSWORD, '192.0.2.11'), env);
    assert('Una contraseña con hash antiguo sigue entrando', r.status === 200);

    const nuevo = state.users[0].password_hash;
    assert('El hash se regeneró al formato nuevo', nuevo.startsWith('pbkdf2$100000$'), nuevo.slice(0, 24) + '…');
    // Node deriva PBKDF2 con las iteraciones que le pidan; el runtime de Workers lanza por encima de
    // 100.000. Con 600.000 esta suite pasaba y en producción nadie podía poner una contraseña (jul–oct 2026).
    assert('Las iteraciones caben en lo que admite Workers (100.000 como mucho)', Number(nuevo.split('$')[1]) <= 100000, nuevo.split('$')[1]);

    const r2 = await handleAuthRequests(loginRequest('ana@test.com', GOOD_PASSWORD, '192.0.2.12'), env);
    assert('Y se sigue pudiendo entrar con el hash nuevo', r2.status === 200);

    const r3 = await handleAuthRequests(loginRequest('ana@test.com', 'otra-cosa-distinta', '192.0.2.13'), env);
    assert('Una contraseña incorrecta sigue fallando tras migrar', r3.status === 401);
}

console.log('\n--- Política de contraseñas ---');
{
    assert('Rechaza 6 caracteres', validatePassword('abc123') !== null);
    assert('Rechaza 11 caracteres', validatePassword('12345678901') !== null);
    assert('Acepta 12 caracteres', validatePassword('123456789012') === null);
    assert('Acepta una passphrase larga sin símbolos', validatePassword('caballo correcto grapa pila') === null);
    assert('Rechaza más de 256 caracteres', validatePassword('a'.repeat(257)) !== null);
}

cleanup();
console.log(`\n${pass} ok, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
