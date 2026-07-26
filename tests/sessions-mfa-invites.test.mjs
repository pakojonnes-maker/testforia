// Test de Fases 2 (sesiones revocables), 3 (invitaciones) y 4 (MFA).
// Ejecutar:  npm run test:security
//
// Entorno simulado: users/restaurant_staff/restaurants/admin_invitations en
// memoria, KV con Map. No es exhaustivo como authz.test.mjs — cubre las
// rutas críticas de cada fase.

import { loadWorkerModule } from './_load.mjs';

const { module: auth, cleanup } = await loadWorkerModule('workerAuthentication.js');
const {
    handleAuthRequests, authenticateRequest, createInvitation,
    hotp, base32Decode, base32Encode, verifyTotp, validatePassword,
} = auth;

const JWT_SECRET = 'secreto-de-prueba';
const GOOD_PASSWORD = 'contraseña-larga-de-prueba';

function makeEnv(seed = {}) {
    const kv = new Map();
    const state = {
        users: seed.users ?? [],
        invitations: seed.invitations ?? [],
        restaurantStaff: seed.restaurantStaff ?? [],
        restaurants: seed.restaurants ?? [{ id: 'rest_1', name: 'Casa Ana' }],
    };

    const env = {
        JWT_SECRET,
        RATE_LIMIT_KV: {
            // Replica la firma real de Cloudflare KV: get(key) devuelve texto
            // crudo, get(key, {type:'json'}) lo parsea. hitRateLimit usa la
            // segunda forma; la caché de token_version usa la primera.
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
                                if (s.includes('FROM admin_invitations ai')) {
                                    const inv = state.invitations.find((i) => i.token_hash === args[0]);
                                    if (!inv) return null;
                                    const r = state.restaurants.find((x) => x.id === inv.restaurant_id);
                                    return { ...inv, restaurant_name: r?.name ?? null };
                                }
                                if (s.includes('FROM admin_invitations WHERE token_hash')) {
                                    return state.invitations.find((i) => i.token_hash === args[0]) ?? null;
                                }
                                if (s.includes('FROM restaurant_staff WHERE restaurant_id = ? AND user_id')) {
                                    return state.restaurantStaff.find(
                                        (x) => x.restaurant_id === args[0] && x.user_id === args[1]
                                    ) ?? null;
                                }
                                if (s.includes('FROM restaurants WHERE id')) {
                                    return state.restaurants.find((r) => r.id === args[0]) ?? null;
                                }
                                return null;
                            },
                            async all() {
                                if (s.includes('FROM restaurants')) return { results: [] };
                                if (s.includes('FROM guide_agencies') || s.includes('FROM guide_agency_staff')) return { results: [] };
                                return { results: [] };
                            },
                            async run() {
                                if (s.startsWith('INSERT INTO users')) {
                                    state.users.push({
                                        id: args[0], email: args[1], display_name: args[2], password_hash: args[3],
                                        is_superadmin: 0, token_version: 0, totp_enabled: 0,
                                    });
                                } else if (s.startsWith('INSERT INTO restaurant_staff')) {
                                    state.restaurantStaff.push({ restaurant_id: args[0], user_id: args[1], role: args[2] });
                                } else if (s.startsWith('INSERT INTO admin_invitations')) {
                                    const [id, token_hash, email, restaurant_id, agency_id, role, invited_by, expires_at] = args;
                                    state.invitations.push({ id, token_hash, email, restaurant_id, agency_id, role, invited_by, expires_at, used_at: null });
                                } else if (s.includes('UPDATE admin_invitations SET used_at')) {
                                    const inv = state.invitations.find((i) => i.id === args[0]);
                                    if (inv) inv.used_at = new Date().toISOString();
                                } else if (s.includes('token_version = token_version + 1') && s.includes('password_hash')) {
                                    const u = state.users.find((x) => x.id === args[1]);
                                    if (u) { u.password_hash = args[0]; u.token_version = (u.token_version ?? 0) + 1; }
                                } else if (s.includes('token_version = token_version + 1')) {
                                    const u = state.users.find((x) => x.id === args[0]);
                                    if (u) u.token_version = (u.token_version ?? 0) + 1;
                                } else if (s.includes('totp_secret = ?, totp_enabled = 1')) {
                                    const u = state.users.find((x) => x.id === args[2]);
                                    if (u) { u.totp_secret = args[0]; u.totp_enabled = 1; u.totp_recovery_codes = args[1]; }
                                } else if (s.includes('totp_secret = NULL')) {
                                    const u = state.users.find((x) => x.id === args[0]);
                                    if (u) { u.totp_secret = null; u.totp_enabled = 0; u.totp_recovery_codes = null; }
                                } else if (s.includes('SET totp_recovery_codes = ?')) {
                                    const u = state.users.find((x) => x.id === args[1]);
                                    if (u) u.totp_recovery_codes = args[0];
                                } else if (s.includes('SET password_hash = ?')) {
                                    const u = state.users.find((x) => x.id === args[1]);
                                    if (u) u.password_hash = args[0];
                                } else if (s.includes('last_login')) {
                                    // no-op
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

function req(path, { method = 'GET', body = null, token = null, ip = '203.0.113.1' } = {}) {
    const headers = { 'CF-Connecting-IP': ip };
    if (body) headers['content-type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return new Request('https://api.visualtastes.com' + path, {
        method, headers, body: body ? JSON.stringify(body) : undefined,
    });
}

let pass = 0, fail = 0;
function assert(label, condition, detail = '') {
    condition ? pass++ : fail++;
    console.log(`${condition ? '  ok  ' : ' FAIL '} ${label}${detail ? '  — ' + detail : ''}`);
}
async function json(res) { return res.json(); }

// ===========================================================================
console.log('\n=== Fase 2: sesiones revocables ===');
{
    const realHash = await auth.hashPassword(GOOD_PASSWORD);
    const { env: env2, state } = makeEnv({
        users: [{ id: 'u1', email: 'ana@test.com', display_name: 'Ana', password_hash: realHash, is_superadmin: 0, token_version: 0, totp_enabled: 0 }],
    });

    const login1 = await handleAuthRequests(req('/auth/login', { method: 'POST', body: { email: 'ana@test.com', password: GOOD_PASSWORD } }), env2);
    const body1 = await json(login1);
    assert('Login inicial devuelve token', login1.status === 200 && !!body1.token);

    let userData = await authenticateRequest(req('/auth/me', { token: body1.token }), env2);
    assert('El token recién emitido autentica', userData?.userId === 'u1');

    const logoutRes = await handleAuthRequests(req('/auth/logout', { method: 'POST', token: body1.token }), env2, userData);
    assert('Logout responde 200', logoutRes.status === 200);
    assert('token_version se incrementó en D1', state.users[0].token_version === 1);

    userData = await authenticateRequest(req('/auth/me', { token: body1.token }), env2);
    assert('El token de ANTES del logout ya no autentica', userData === null);

    const login2 = await handleAuthRequests(req('/auth/login', { method: 'POST', body: { email: 'ana@test.com', password: GOOD_PASSWORD }, ip: '203.0.113.9' }), env2);
    const body2 = await json(login2);
    const userData2 = await authenticateRequest(req('/auth/me', { token: body2.token }), env2);
    assert('Un login NUEVO tras logout sí autentica', userData2?.userId === 'u1');

    const changeRes = await handleAuthRequests(
        req('/auth/me/password', { method: 'PUT', token: body2.token, body: { currentPassword: GOOD_PASSWORD, newPassword: 'otra-contraseña-larga-123' } }),
        env2, userData2
    );
    assert('Cambio de contraseña responde 200', changeRes.status === 200);
    const stillValid = await authenticateRequest(req('/auth/me', { token: body2.token }), env2);
    assert('Cambiar la contraseña también revoca el token usado para pedirlo', stillValid === null);
}

// ===========================================================================
console.log('\n=== Fase 3: invitaciones ===');
{
    const { env, state } = makeEnv({ restaurants: [{ id: 'rest_1', name: 'Casa Ana' }] });

    const { token } = await createInvitation(env, { email: 'nuevo@test.com', role: 'staff', restaurantId: 'rest_1', invitedBy: 'owner_1' });
    assert('createInvitation no guarda el token en claro', !state.invitations[0].token_hash.includes(token));

    const badToken = await handleAuthRequests(req('/auth/invitations/token-falso'), env);
    assert('Token inexistente → 404', badToken.status === 404);

    const inspect = await handleAuthRequests(req(`/auth/invitations/${token}`), env);
    const inspectBody = await json(inspect);
    assert('Inspección de invitación válida', inspect.status === 200 && inspectBody.invitation.valid === true && inspectBody.invitation.restaurantName === 'Casa Ana');

    const weak = await handleAuthRequests(req(`/auth/invitations/${token}/accept`, { method: 'POST', body: { password: 'corta' } }), env);
    assert('Contraseña débil al aceptar → 400', weak.status === 400);

    const accept = await handleAuthRequests(req(`/auth/invitations/${token}/accept`, { method: 'POST', body: { password: 'contraseña-de-invitado-larga' } }), env);
    const acceptBody = await json(accept);
    assert('Aceptar invitación crea cuenta y devuelve token de sesión', accept.status === 200 && !!acceptBody.token);
    assert('El usuario nuevo queda con el rol de la invitación', state.restaurantStaff.some((s) => s.user_id === acceptBody.user.id && s.role === 'staff'));

    const reuse = await handleAuthRequests(req(`/auth/invitations/${token}/accept`, { method: 'POST', body: { password: 'contraseña-de-invitado-larga' } }), env);
    assert('Reusar una invitación ya canjeada → 409', reuse.status === 409);

    // Invitación caducada.
    const { token: expiredToken } = await createInvitation(env, { email: 'tarde@test.com', role: 'staff', restaurantId: 'rest_1', invitedBy: 'owner_1' });
    state.invitations.find((i) => i.email === 'tarde@test.com').expires_at = new Date(Date.now() - 1000).toISOString();
    const expiredRes = await handleAuthRequests(req(`/auth/invitations/${expiredToken}/accept`, { method: 'POST', body: { password: 'contraseña-de-invitado-larga' } }), env);
    assert('Invitación caducada → 410', expiredRes.status === 410);

    // Reset: usuario YA existente con YA una fila en restaurant_staff — el rol no debe tocarse.
    const existingUserId = acceptBody.user.id;
    const before = state.restaurantStaff.find((s) => s.user_id === existingUserId);
    const { token: resetToken } = await createInvitation(env, { email: 'nuevo@test.com', role: null, restaurantId: 'rest_1', invitedBy: 'owner_1' });
    const resetAccept = await handleAuthRequests(req(`/auth/invitations/${resetToken}/accept`, { method: 'POST', body: { password: 'contraseña-reseteada-larga' } }), env);
    assert('Redimir un enlace de reset (usuario existente) → 200', resetAccept.status === 200);
    assert('El rol existente NO cambia al resetear contraseña', state.restaurantStaff.find((s) => s.user_id === existingUserId).role === before.role);
    assert('No se duplica la fila de restaurant_staff', state.restaurantStaff.filter((s) => s.user_id === existingUserId).length === 1);
}

// ===========================================================================
console.log('\n=== Fase 4: MFA (TOTP) ===');
{
    // --- Vector oficial RFC 4226 Apéndice D ---
    const rfcSecret = new TextEncoder().encode('12345678901234567890');
    const rfcExpected = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];
    let rfcOk = true;
    for (let counter = 0; counter < rfcExpected.length; counter++) {
        const code = await hotp(rfcSecret, counter);
        if (code !== rfcExpected[counter]) { rfcOk = false; console.log(`   contador ${counter}: esperado ${rfcExpected[counter]}, obtenido ${code}`); }
    }
    assert('hotp() reproduce el vector oficial RFC 4226', rfcOk);

    const secret = base32Encode(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]));
    assert('base32 round-trip', Buffer.from(base32Decode(secret)).equals(Buffer.from([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20])));

    const now = Date.now();
    const counter = Math.floor(now / 1000 / 30);
    const validCode = await hotp(base32Decode(secret), counter);
    assert('verifyTotp acepta el código correcto del instante actual', await verifyTotp(secret, validCode, { at: now }));
    assert('verifyTotp rechaza un código incorrecto', !(await verifyTotp(secret, '000000', { at: now })));

    // --- Flujo completo vía handleAuthRequests ---
    const { env, state } = makeEnv({
        users: [{ id: 'u1', email: 'ana@test.com', display_name: 'Ana', password_hash: await auth.hashPassword(GOOD_PASSWORD), is_superadmin: 0, token_version: 0, totp_enabled: 0 }],
    });
    const userData = { userId: 'u1', email: 'ana@test.com' };

    const setupRes = await handleAuthRequests(req('/auth/mfa/setup', { method: 'POST', token: 'x' }), env, userData);
    const setupBody = await json(setupRes);
    assert('mfa/setup devuelve un secreto y un provisioning URI', setupRes.status === 200 && !!setupBody.secret && setupBody.provisioningUri.startsWith('otpauth://'));

    const wrongEnable = await handleAuthRequests(req('/auth/mfa/enable', { method: 'POST', body: { secret: setupBody.secret, code: '000000' }, token: 'x' }), env, userData);
    assert('mfa/enable con código incorrecto → 400', wrongEnable.status === 400);

    const rightCode = await hotp(base32Decode(setupBody.secret), Math.floor(Date.now() / 1000 / 30));
    const enableRes = await handleAuthRequests(req('/auth/mfa/enable', { method: 'POST', body: { secret: setupBody.secret, code: rightCode }, token: 'x' }), env, userData);
    const enableBody = await json(enableRes);
    assert('mfa/enable con código correcto → 200 con 8 códigos de recuperación', enableRes.status === 200 && enableBody.recoveryCodes.length === 8);
    assert('El usuario queda con totp_enabled', state.users[0].totp_enabled === 1);

    // Login ahora exige MFA.
    const loginRes = await handleAuthRequests(req('/auth/login', { method: 'POST', body: { email: 'ana@test.com', password: GOOD_PASSWORD }, ip: '198.51.100.5' }), env);
    const loginBody = await json(loginRes);
    assert('Login con MFA activo devuelve mfaRequired + ticket, no token', loginRes.status === 200 && loginBody.mfaRequired === true && !!loginBody.ticket && !loginBody.token);

    const wrongVerify = await handleAuthRequests(req('/auth/mfa/verify', { method: 'POST', body: { ticket: loginBody.ticket, code: '000000' } }), env);
    assert('mfa/verify con código incorrecto → 401', wrongVerify.status === 401);

    // Agotar el límite de intentos del ticket (5).
    let rateLimited = false;
    for (let i = 0; i < 5; i++) {
        const r = await handleAuthRequests(req('/auth/mfa/verify', { method: 'POST', body: { ticket: loginBody.ticket, code: '000000' } }), env);
        if (r.status === 429) rateLimited = true;
    }
    assert('Tras varios intentos fallidos, mfa/verify se bloquea (429)', rateLimited);

    // Ticket nuevo para probar el código correcto sin chocar con el límite anterior.
    const login2 = await handleAuthRequests(req('/auth/login', { method: 'POST', body: { email: 'ana@test.com', password: GOOD_PASSWORD }, ip: '198.51.100.6' }), env);
    const login2Body = await json(login2);
    const rightTotp = await hotp(base32Decode(setupBody.secret), Math.floor(Date.now() / 1000 / 30));
    const verifyOk = await handleAuthRequests(req('/auth/mfa/verify', { method: 'POST', body: { ticket: login2Body.ticket, code: rightTotp } }), env);
    const verifyOkBody = await json(verifyOk);
    assert('mfa/verify con código correcto → 200 con token de sesión', verifyOk.status === 200 && !!verifyOkBody.token);

    const reuseTicket = await handleAuthRequests(req('/auth/mfa/verify', { method: 'POST', body: { ticket: login2Body.ticket, code: rightTotp } }), env);
    assert('El ticket ya usado no puede reutilizarse', reuseTicket.status === 401);

    // Código de recuperación.
    const login3 = await handleAuthRequests(req('/auth/login', { method: 'POST', body: { email: 'ana@test.com', password: GOOD_PASSWORD }, ip: '198.51.100.7' }), env);
    const login3Body = await json(login3);
    const recoveryCode = enableBody.recoveryCodes[0];
    const recoveryVerify = await handleAuthRequests(req('/auth/mfa/verify', { method: 'POST', body: { ticket: login3Body.ticket, code: recoveryCode } }), env);
    assert('Un código de recuperación válido también completa el login', recoveryVerify.status === 200);

    const login4 = await handleAuthRequests(req('/auth/login', { method: 'POST', body: { email: 'ana@test.com', password: GOOD_PASSWORD }, ip: '198.51.100.8' }), env);
    const login4Body = await json(login4);
    const reuseRecovery = await handleAuthRequests(req('/auth/mfa/verify', { method: 'POST', body: { ticket: login4Body.ticket, code: recoveryCode } }), env);
    assert('El mismo código de recuperación no sirve dos veces', reuseRecovery.status === 401);

    // Desactivar.
    const disableWrongPw = await handleAuthRequests(req('/auth/mfa/disable', { method: 'POST', body: { password: 'mal' }, token: 'x' }), env, userData);
    assert('mfa/disable con contraseña incorrecta → 401', disableWrongPw.status === 401);
    const disableRes = await handleAuthRequests(req('/auth/mfa/disable', { method: 'POST', body: { password: GOOD_PASSWORD }, token: 'x' }), env, userData);
    assert('mfa/disable con contraseña correcta → 200', disableRes.status === 200);
    assert('totp_enabled vuelve a 0', state.users[0].totp_enabled === 0);
}

cleanup();
console.log(`\n${pass} ok, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
