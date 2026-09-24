// Test del login con Google (workerGoogleAuth.js).
// Ejecutar:  npm run test:google-auth
//
// Firma ID tokens con una clave RSA generada al vuelo y sirve su JWKS por un
// fetch simulado, así que ejercita la verificación de verdad (firma incluida)
// sin llamar a Google. Cada caso "malo" es un ataque concreto: el token es
// perfecto salvo UNA cosa, y esa cosa es lo que se comprueba.
//
// Tarda unos segundos: genera claves RSA-2048 y el login por contraseña que se
// comprueba al final deriva PBKDF2 con 600.000 iteraciones.

import { loadWorkerModule } from './_load.mjs';

const { module: googleMod, cleanup: cleanupGoogle } = await loadWorkerModule('workerGoogleAuth.js');
const { module: authMod, cleanup: cleanupAuth } = await loadWorkerModule('workerAuthentication.js');
const { module: workerMod, cleanup: cleanupWorker } = await loadWorkerModule('worker.js');
const { handleGoogleAuthRequests, resetGoogleKeyCacheForTests } = googleMod;
const { verifyJWT, handleAuthRequests, hotp, base32Decode, base32Encode } = authMod;

const JWT_SECRET = 'secreto-de-prueba-no-usado-en-ningun-sitio-real';
const CLIENT_ID = '1234567890-testclient.apps.googleusercontent.com';
const OTHER_CLIENT_ID = '9999999999-otraapp.apps.googleusercontent.com';
const ADMIN_EMAIL = 'admin@example.com';
const INTRUDER_EMAIL = 'intruso@example.com';
const KID = 'test-key-1';
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

// --- Criptografía de prueba --------------------------------------------------

const enc = new TextEncoder();

function b64url(input) {
    const bytes = typeof input === 'string' ? enc.encode(input) : new Uint8Array(input);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function makeKeyPair(kid) {
    const pair = await crypto.subtle.generateKey(
        { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
        true, ['sign', 'verify']
    );
    const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
    return { privateKey: pair.privateKey, jwk: { ...jwk, kid, alg: 'RS256', use: 'sig' } };
}

const nowSec = () => Math.floor(Date.now() / 1000);

function defaultClaims() {
    const n = nowSec();
    return {
        iss: 'https://accounts.google.com', aud: CLIENT_ID, azp: CLIENT_ID, sub: '1130000000000000000',
        email: ADMIN_EMAIL, email_verified: true, iat: n, nbf: n - 5, exp: n + 3600,
    };
}

/** ID token válido; `header`/`claims` sobrescriben campos y un valor undefined elimina el campo. */
async function signToken({ key, kid = KID, header = {}, claims = {} }) {
    const h = { alg: 'RS256', typ: 'JWT', kid, ...header };
    const input = `${b64url(JSON.stringify(h))}.${b64url(JSON.stringify({ ...defaultClaims(), ...claims }))}`;
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key.privateKey, enc.encode(input));
    return `${input}.${b64url(sig)}`;
}

// --- Google simulado: JWKS + reloj -------------------------------------------

const realFetch = globalThis.fetch;
const jwks = { keys: [], calls: 0, fail: false };
globalThis.fetch = async (url) => {
    if (String(url) !== JWKS_URL) throw new Error(`fetch inesperado en el test: ${url}`);
    jwks.calls++;
    if (jwks.fail) throw new Error('red caída (simulada)');
    return new Response(JSON.stringify({ keys: jwks.keys }), { status: 200, headers: { 'content-type': 'application/json' } });
};

const realNow = Date.now;
const advanceClock = (ms) => { Date.now = () => realNow() + ms; };
const resetClock = () => { Date.now = realNow; };

// --- Entorno simulado --------------------------------------------------------

function adminUser(overrides = {}) {
    return {
        id: 'user_admin', email: ADMIN_EMAIL, display_name: 'Admin', photo_url: null,
        is_superadmin: 1, token_version: 0, totp_enabled: 0, ...overrides,
    };
}

function makeEnv({ users, config = {} } = {}) {
    const kv = new Map();
    const state = { users: users ?? [adminUser()], audit: [], insertedUsers: [], lastLogins: [] };

    const statement = (s, args) => ({
        async first() {
            if (s.includes('FROM users WHERE email')) return state.users.find((u) => u.email === args[0]) ?? null;
            if (s.includes('FROM users WHERE id')) return state.users.find((u) => u.id === args[0]) ?? null;
            return null;
        },
        async all() { return { results: [] }; },
        async run() {
            if (s.startsWith('INSERT INTO security_audit_log')) {
                // (id, event_type, user_id, target_user_id, restaurant_id, ip, user_agent, detail)
                state.audit.push({ type: args[1], userId: args[2], detail: args[7] ? JSON.parse(args[7]) : null });
            } else if (s.startsWith('INSERT INTO users')) {
                state.insertedUsers.push(args);
            } else if (s.includes('UPDATE users SET last_login')) {
                state.lastLogins.push(args[0]);
            }
            return { success: true };
        },
    });

    const env = {
        JWT_SECRET,
        GOOGLE_CLIENT_ID: CLIENT_ID,
        GOOGLE_ADMIN_EMAILS: ADMIN_EMAIL,
        ...config,
        RATE_LIMIT_KV: {
            async get(key, opts) {
                if (!kv.has(key)) return null;
                const raw = kv.get(key);
                return opts?.type === 'json' ? JSON.parse(raw) : raw;
            },
            async put(key, value) { kv.set(key, typeof value === 'string' ? value : JSON.stringify(value)); },
            async delete(key) { kv.delete(key); },
        },
        DB: {
            prepare(sql) {
                const s = sql.replace(/\s+/g, ' ').trim();
                // buildAuthenticatedResponse llama a .all() con y sin .bind()
                return { ...statement(s, []), bind: (...args) => statement(s, args) };
            },
        },
    };
    return { env, state, kv };
}

function googleRequest(credential, { ip = '203.0.113.10', origin = 'https://admin.visualtastes.com', raw } = {}) {
    return new Request('https://api.visualtastes.com/auth/google', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip, Origin: origin },
        body: raw ?? JSON.stringify({ credential }),
    });
}

const login = (env, credential, opts) => handleGoogleAuthRequests(googleRequest(credential, opts), env);

// --- Runner --------------------------------------------------------------------

let pass = 0, fail = 0;
function assert(label, condition, detail = '') {
    condition ? pass++ : fail++;
    console.log(`${condition ? '  ok  ' : ' FAIL '} ${label}${detail ? '  — ' + detail : ''}`);
}

const goodKey = await makeKeyPair(KID);
// Misma kid, otra clave: es lo que haría un atacante firmando con la suya.
const attackerKey = await makeKeyPair(KID);

/** Estado limpio entre escenarios: caché de claves de Google, reloj y contadores. */
function fresh() {
    resetGoogleKeyCacheForTests();
    resetClock();
    jwks.calls = 0;
    jwks.fail = false;
    jwks.keys = [goodKey.jwk];
}

const lastAudit = (state, type) => [...state.audit].reverse().find((e) => e.type === type);

// --- Tests ---------------------------------------------------------------------

console.log('\n--- Camino feliz ---');
{
    fresh();
    const { env, state } = makeEnv();
    const res = await login(env, await signToken({ key: goodKey }));
    const body = await res.json();
    assert('Token válido de la cuenta permitida → 200 con sesión', res.status === 200 && body.success === true && !!body.token);

    const payload = await verifyJWT(body.token, JWT_SECRET);
    assert('El JWT emitido es el de siempre: verifica con JWT_SECRET', payload?.userId === 'user_admin' && payload?.email === ADMIN_EMAIL);
    assert('Sale como superadmin', payload?.is_superadmin === true && body.user?.is_superadmin === true);
    assert('Lleva tv (token_version), así que el logout lo sigue revocando', payload?.tv === 0);
    assert('Se actualiza last_login', state.lastLogins.length === 1);
    assert('Auditado como login_success con provider=google',
        state.audit.some((e) => e.type === 'login_success' && e.detail?.provider === 'google' && e.userId === 'user_admin'));
    assert('La respuesta no se cachea (lleva un bearer token)', res.headers.get('Cache-Control') === 'no-store');
    assert('No se crea ningún usuario', state.insertedUsers.length === 0);
}

console.log('\n--- Ataques al ID token: todos deben dar 401 y ninguna sesión ---');
{
    const unsigned = (header, sig) =>
        `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(defaultClaims()))}.${sig}`;

    const tampered = async () => {
        // Token legítimo de OTRA cuenta de Google al que se le edita el email por el del admin.
        const legit = await signToken({ key: goodKey, claims: { email: INTRUDER_EMAIL } });
        const [h, , s] = legit.split('.');
        return `${h}.${b64url(JSON.stringify(defaultClaims()))}.${s}`;
    };

    const attacks = [
        ['Token de OTRA aplicación de Google (aud ajeno), con firma válida', () => signToken({ key: goodKey, claims: { aud: OTHER_CLIENT_ID, azp: OTHER_CLIENT_ID } }), 'bad_audience'],
        ['aud correcto pero azp de otra aplicación', () => signToken({ key: goodKey, claims: { azp: OTHER_CLIENT_ID } }), 'bad_audience'],
        ['aud como lista que incluye el nuestro (no se acepta)', () => signToken({ key: goodKey, claims: { aud: [CLIENT_ID, OTHER_CLIENT_ID] } }), 'bad_audience'],
        ['Emisor que no es Google', () => signToken({ key: goodKey, claims: { iss: 'https://accounts.evil.example' } }), 'bad_issuer'],
        ['Caducado', () => signToken({ key: goodKey, claims: { exp: nowSec() - 3600 } }), 'expired'],
        ['exp como texto (intento de colar tipos)', () => signToken({ key: goodKey, claims: { exp: String(nowSec() + 3600) } }), 'expired'],
        ['Emitido hace 2 h y aún sin caducar: demasiado viejo para canjearlo', () => signToken({ key: goodKey, claims: { iat: nowSec() - 7200, exp: nowSec() + 1800 } }), 'too_old'],
        ['Emitido en el futuro', () => signToken({ key: goodKey, claims: { iat: nowSec() + 3600, nbf: undefined } }), 'iat_invalid'],
        ['Todavía no válido (nbf en el futuro)', () => signToken({ key: goodKey, claims: { nbf: nowSec() + 3600 } }), 'not_yet_valid'],
        ['Email sin verificar', () => signToken({ key: goodKey, claims: { email_verified: false } }), 'email_unverified'],
        ['Sin el claim email_verified', () => signToken({ key: goodKey, claims: { email_verified: undefined } }), 'email_unverified'],
        ['Sin email', () => signToken({ key: goodKey, claims: { email: undefined } }), 'no_email'],
        ['alg = none con firma de relleno', async () => unsigned({ alg: 'none', typ: 'JWT', kid: KID }, 'AAAA'), 'bad_alg'],
        ['alg = none con la firma vacía', async () => unsigned({ alg: 'none', typ: 'JWT', kid: KID }, ''), 'malformed'],
        ['alg = HS256 (confusión de algoritmo)', () => signToken({ key: goodKey, header: { alg: 'HS256' } }), 'bad_alg'],
        ['Sin kid', () => signToken({ key: goodKey, header: { kid: undefined } }), 'no_kid'],
        ['kid que Google no publica', () => signToken({ key: goodKey, kid: 'clave-inventada' }), 'unknown_kid'],
        ['Firmado con OTRA clave usando la kid de Google', () => signToken({ key: attackerKey }), 'bad_signature'],
        ['Payload editado después de firmar (email cambiado por el del admin)', tampered, 'bad_signature'],
        ['No es un JWT', async () => 'esto-no-es-un-jwt', 'malformed'],
        ['Tres partes pero no base64', async () => 'a!b.c@d.e#f', 'malformed'],
        ['Cabecera que no es JSON', async () => `${b64url('no-json')}.${b64url('{}')}.${b64url('x')}`, 'malformed'],
    ];

    const messages = new Set();
    for (const [label, build, reason] of attacks) {
        fresh();
        const { env, state } = makeEnv();
        const res = await login(env, await build());
        const body = await res.json();
        assert(`${label} → 401 sin sesión`, res.status === 401 && !body.token && !body.ticket, `status ${res.status}`);
        assert(`   …y se audita como ${reason}`, lastAudit(state, 'login_failed')?.detail?.reason === reason,
            `registrado: ${lastAudit(state, 'login_failed')?.detail?.reason}`);
        messages.add(body.message);
    }
    assert('Todos los rechazos de token dan el MISMO mensaje (no revelan el motivo)', messages.size === 1, [...messages].join(' | '));
}

console.log('\n--- Token perfecto de Google, pero la cuenta no puede entrar (403) ---');
{
    const messages = new Set();

    fresh();
    let ctx = makeEnv({ users: [adminUser(), adminUser({ id: 'user_intruso', email: INTRUDER_EMAIL })] });
    let res = await login(ctx.env, await signToken({ key: goodKey, claims: { email: INTRUDER_EMAIL } }));
    let body = await res.json();
    assert('Superadmin en la BD pero fuera de GOOGLE_ADMIN_EMAILS → 403 sin sesión', res.status === 403 && !body.token);
    assert('   …auditado como not_allowlisted', lastAudit(ctx.state, 'login_failed')?.detail?.reason === 'not_allowlisted');
    messages.add(body.message);

    fresh();
    ctx = makeEnv({ users: [] });
    res = await login(ctx.env, await signToken({ key: goodKey }));
    body = await res.json();
    assert('En la lista pero SIN fila en users → 403', res.status === 403 && !body.token);
    assert('   …y NO se crea el usuario (el login con Google nunca da de alta)', ctx.state.insertedUsers.length === 0 && ctx.state.users.length === 0);
    assert('   …auditado como no_such_user', lastAudit(ctx.state, 'login_failed')?.detail?.reason === 'no_such_user');
    messages.add(body.message);

    fresh();
    ctx = makeEnv({ users: [adminUser({ is_superadmin: 0 })] });
    res = await login(ctx.env, await signToken({ key: goodKey }));
    body = await res.json();
    assert('En la lista y con fila, pero no superadmin → 403', res.status === 403 && !body.token);
    assert('   …auditado como not_superadmin, con el usuario', lastAudit(ctx.state, 'login_failed')?.detail?.reason === 'not_superadmin' && lastAudit(ctx.state, 'login_failed')?.userId === 'user_admin');
    messages.add(body.message);

    assert('Los tres 403 dan el MISMO mensaje (no revelan cuál falló)', messages.size === 1, [...messages].join(' | '));
}

console.log('\n--- El email se compara sin distinguir mayúsculas ni formato de la lista ---');
{
    fresh();
    let ctx = makeEnv();
    let res = await login(ctx.env, await signToken({ key: goodKey, claims: { email: 'Admin@Example.COM' } }));
    assert('Email del token en mayúsculas → 200', res.status === 200);

    fresh();
    ctx = makeEnv({ config: { GOOGLE_ADMIN_EMAILS: ' Otro@Example.com ,  ADMIN@example.com; ' } });
    res = await login(ctx.env, await signToken({ key: goodKey }));
    assert('Lista con espacios, comas, punto y coma y mayúsculas → 200', res.status === 200);
}

console.log('\n--- Cuenta con TOTP activo: Google no salta el segundo factor ---');
{
    fresh();
    const secret = base32Encode(crypto.getRandomValues(new Uint8Array(20)));
    const ctx = makeEnv({ users: [adminUser({ totp_enabled: 1, totp_secret: secret, totp_recovery_codes: '[]' })] });
    const res = await login(ctx.env, await signToken({ key: goodKey }));
    const body = await res.json();
    assert('Google NO da sesión: responde mfaRequired con un ticket', res.status === 200 && body.mfaRequired === true && !!body.ticket && !body.token);
    assert('El ticket queda en KV para /auth/mfa/verify (el mismo mecanismo que la contraseña)',
        (await ctx.env.RATE_LIMIT_KV.get(`mfa_ticket:${body.ticket}`)) === 'user_admin');
    assert('Auditado como login_mfa_challenge (google)', lastAudit(ctx.state, 'login_mfa_challenge')?.detail?.provider === 'google');
    assert('last_login no se toca hasta completar el MFA', ctx.state.lastLogins.length === 0);

    // El ticket emitido por Google se canjea con el /auth/mfa/verify de siempre.
    const code = await hotp(base32Decode(secret), Math.floor(Date.now() / 1000 / 30));
    const verify = await handleAuthRequests(new Request('https://api.visualtastes.com/auth/mfa/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '203.0.113.20' },
        body: JSON.stringify({ ticket: body.ticket, code }),
    }), ctx.env);
    const verifyBody = await verify.json();
    assert('Ticket + código TOTP correcto en /auth/mfa/verify → sesión', verify.status === 200 && !!verifyBody.token);
    assert('   …y esa sesión es la del superadmin', (await verifyJWT(verifyBody.token, JWT_SECRET))?.is_superadmin === true);
}

console.log('\n--- Configuración: sin Client ID o sin lista, apagado ---');
{
    const getConfig = (env, origin = 'https://admin.visualtastes.com') => handleGoogleAuthRequests(
        new Request('https://api.visualtastes.com/auth/google/config', { headers: { Origin: origin } }), env);

    fresh();
    let ctx = makeEnv();
    let res = await getConfig(ctx.env);
    let text = await res.text();
    let cfg = JSON.parse(text);
    assert('Configurado: /config devuelve enabled y el Client ID', res.status === 200 && cfg.enabled === true && cfg.clientId === CLIENT_ID);
    assert('   …sin filtrar la lista de emails permitidos', !text.includes(ADMIN_EMAIL) && !('allowedEmails' in cfg));
    assert('   …con CORS para el origen del admin', res.headers.get('Access-Control-Allow-Origin') === 'https://admin.visualtastes.com');
    res = await getConfig(ctx.env, 'https://sitio-malicioso.example');
    assert('   …y sin eco de un origen no permitido', res.headers.get('Access-Control-Allow-Origin') !== 'https://sitio-malicioso.example');

    const apagados = [
        ['GOOGLE_CLIENT_ID vacío', { GOOGLE_CLIENT_ID: '' }],
        ['GOOGLE_CLIENT_ID solo espacios', { GOOGLE_CLIENT_ID: '   ' }],
        ['GOOGLE_CLIENT_ID sin definir', { GOOGLE_CLIENT_ID: undefined }],
        ['GOOGLE_ADMIN_EMAILS vacía', { GOOGLE_ADMIN_EMAILS: '' }],
        ['GOOGLE_ADMIN_EMAILS sin definir', { GOOGLE_ADMIN_EMAILS: undefined }],
    ];
    for (const [label, config] of apagados) {
        fresh();
        ctx = makeEnv({ config });
        res = await getConfig(ctx.env);
        cfg = await res.json();
        assert(`${label}: /config dice enabled:false y no da Client ID`, res.status === 200 && cfg.enabled === false && !('clientId' in cfg));
        res = await login(ctx.env, await signToken({ key: goodKey }));
        const loginBody = await res.json();
        assert(`${label}: el login responde 503 y no da sesión`, res.status === 503 && !loginBody.token, `status ${res.status}`);
    }
}

console.log('\n--- Cuerpo de la petición ---');
{
    fresh();
    const { env } = makeEnv();
    const cases = [
        ['JSON inválido', 'esto no es json'],
        ['Cuerpo null', 'null'],
        ['Sin credential', JSON.stringify({})],
        ['credential que no es texto', JSON.stringify({ credential: 12345 })],
        ['credential vacío', JSON.stringify({ credential: '' })],
        ['credential de 5.000 caracteres', JSON.stringify({ credential: 'a'.repeat(5000) })],
    ];
    for (const [label, raw] of cases) {
        const res = await login(env, undefined, { raw });
        const body = await res.json();
        assert(`${label} → 400 sin sesión`, res.status === 400 && !body.token, `status ${res.status}`);
    }
}

console.log('\n--- Rate limiting por IP ---');
{
    fresh();
    const { env, state } = makeEnv();
    const ip = '198.51.100.7';
    const statuses = [];
    for (let i = 0; i < 12; i++) statuses.push((await login(env, 'basura', { ip })).status);
    assert('Los 10 primeros intentos se procesan (401)', statuses.slice(0, 10).every((s) => s === 401), statuses.join(','));
    assert('A partir del 11º se bloquea (429)', statuses.slice(10).every((s) => s === 429), statuses.join(','));

    const blocked = await login(env, await signToken({ key: goodKey }), { ip });
    assert('Bloquea incluso un token válido', blocked.status === 429);
    assert('Incluye Retry-After', Number(blocked.headers.get('Retry-After')) > 0, `Retry-After: ${blocked.headers.get('Retry-After')}`);
    assert('El bloqueo queda auditado', state.audit.some((e) => e.type === 'login_rate_limited' && e.detail?.provider === 'google'));

    const otherIp = await login(env, await signToken({ key: goodKey }), { ip: '198.51.100.8' });
    assert('Otra IP no hereda el bloqueo', otherIp.status === 200);
}

console.log('\n--- Caché del JWKS de Google ---');
{
    fresh();
    const { env } = makeEnv();
    for (let i = 0; i < 3; i++) await login(env, await signToken({ key: goodKey }));
    assert('Tres logins seguidos piden el JWKS UNA sola vez', jwks.calls === 1, `${jwks.calls} peticiones`);

    const unknown = await login(env, await signToken({ key: goodKey, kid: 'kid-nueva' }));
    assert('Una kid desconocida justo después NO vuelve a llamar a Google (anti-martilleo)',
        unknown.status === 401 && jwks.calls === 1, `${jwks.calls} peticiones`);

    // Rotación de claves: Google publica una nueva y pasa más de un minuto.
    const rotated = await makeKeyPair('kid-rotada');
    jwks.keys = [goodKey.jwk, rotated.jwk];
    advanceClock(2 * 60 * 1000);
    const afterRotation = await login(env, await signToken({ key: rotated, kid: 'kid-rotada' }));
    assert('Tras una rotación, la kid nueva se acepta recargando el JWKS',
        afterRotation.status === 200 && jwks.calls === 2, `status ${afterRotation.status}, ${jwks.calls} peticiones`);
}
{
    fresh();
    const { env } = makeEnv();
    await login(env, await signToken({ key: goodKey }));
    advanceClock(61 * 60 * 1000);
    const afterTtl = await login(env, await signToken({ key: goodKey }));
    assert('Pasada 1 h la caché caduca y se recarga', afterTtl.status === 200 && jwks.calls === 2, `${jwks.calls} peticiones`);

    // Google no responde y la caché ya caducó: se sigue con las claves que había.
    advanceClock(122 * 60 * 1000);
    jwks.fail = true;
    const stale = await login(env, await signToken({ key: goodKey }));
    assert('Con la caché caducada y Google caído, sigue entrando con las claves que ya tenía',
        stale.status === 200 && jwks.calls === 3, `status ${stale.status}, ${jwks.calls} peticiones`);
}
{
    fresh();
    jwks.fail = true;
    const { env, state } = makeEnv();
    const res = await login(env, await signToken({ key: goodKey }));
    const body = await res.json();
    assert('Sin caché y con Google caído → 503 (la contraseña sigue siendo la salida)',
        res.status === 503 && !body.token && /Google/.test(body.message), `status ${res.status}`);
    assert('   …auditado como jwks_unavailable', lastAudit(state, 'login_failed')?.detail?.reason === 'jwks_unavailable');
}

console.log('--- Clave de Google que este runtime no sabe importar ---');
{
    fresh();
    // Una clave con otro `alg` del que se pide es inválida por especificación WebCrypto: importKey debe rechazarla.
    jwks.keys = [{ ...goodKey.jwk, alg: 'RS512' }];
    const { env, state } = makeEnv();
    const res = await login(env, await signToken({ key: goodKey }));
    const body = await res.json();
    assert('JWK inservible → 401 sin sesión', res.status === 401 && !body.token, `status ${res.status}`);
    assert('   …auditado como key_import_failed, no como bad_signature (es configuración, no un ataque)',
        lastAudit(state, 'login_failed')?.detail?.reason === 'key_import_failed',
        `registrado: ${lastAudit(state, 'login_failed')?.detail?.reason}`);
}
resetClock();

console.log('\n--- Cableado en worker.js: ruta pública y despacho ---');
{
    fresh();
    const { env } = makeEnv();

    // worker.js hace console.log de cada request: se silencia solo durante la llamada.
    const viaWorker = async (path, { method = 'GET', body, headers = {} } = {}) => {
        const log = console.log;
        console.log = () => {};
        try {
            return await workerMod.default.fetch(new Request(`https://api.visualtastes.com${path}`, {
                method,
                headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '203.0.113.30', Origin: 'https://admin.visualtastes.com', ...headers },
                body: body === undefined ? undefined : JSON.stringify(body),
            }), env, { waitUntil() {} });
        } finally {
            console.log = log;
        }
    };

    const ok = await viaWorker('/auth/google', { method: 'POST', body: { credential: await signToken({ key: goodKey }) } });
    const okBody = await ok.json();
    assert('POST /auth/google sin Authorization llega al handler y da sesión', ok.status === 200 && !!okBody.token, `status ${ok.status}`);
    assert('   …con CORS para el admin', ok.headers.get('Access-Control-Allow-Origin') === 'https://admin.visualtastes.com');

    const cfg = await viaWorker('/auth/google/config');
    const cfgBody = await cfg.json();
    assert('GET /auth/google/config es público', cfg.status === 200 && cfgBody.enabled === true && cfgBody.clientId === CLIENT_ID);

    const junk = await viaWorker('/auth/google', { method: 'POST', body: { credential: 'basura' } });
    const junkBody = await junk.json();
    assert('Un token basura lo rechaza el handler (su mensaje), no el guardia central',
        junk.status === 401 && junkBody.message === 'No se pudo verificar la cuenta de Google', junkBody.message);

    // Nada más se ha vuelto público por accidente: estas rutas siguen exigiendo sesión.
    const guarded = [
        ['GET', '/auth/google'],
        ['POST', '/auth/google/config'],
        ['POST', '/auth/google/extra'],
        ['POST', '/auth/google/'],
        ['GET', '/auth/googlex'],
    ];
    for (const [method, path] of guarded) {
        const res = await viaWorker(path, { method, body: method === 'POST' ? {} : undefined });
        const body = await res.json();
        assert(`${method} ${path} sigue protegida → 401 "No autorizado"`, res.status === 401 && body.message === 'No autorizado', `status ${res.status}: ${body.message}`);
    }

    const me = await viaWorker('/auth/me', { headers: { Authorization: `Bearer ${okBody.token}` } });
    assert('La sesión emitida por Google es aceptada por el guardia central (GET /auth/me)', me.status === 200, `status ${me.status}`);

    const pwd = await viaWorker('/auth/login', { method: 'POST', body: { email: 'nadie@example.com', password: 'una-contraseña-larga-cualquiera' } });
    const pwdBody = await pwd.json();
    assert('El login por contraseña sigue enrutándose igual (401 credenciales inválidas)', pwd.status === 401 && pwdBody.message === 'Credenciales inválidas', `status ${pwd.status}`);
}

globalThis.fetch = realFetch;
resetClock();
cleanupGoogle();
cleanupAuth();
cleanupWorker();
console.log(`\n${pass} ok, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
