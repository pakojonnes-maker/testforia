// ===========================================================================
// LOGIN CON GOOGLE — solo para superadmins de una lista cerrada
// ===========================================================================
//   POST /auth/google          { credential }  → sesión, o { mfaRequired, ticket }
//   GET  /auth/google/config                   → { enabled, clientId? }  (público)
//
// El navegador obtiene un ID token de Google (Google Identity Services: un JWT
// RS256) y lo manda aquí. No hay OAuth con redirección ni client secret: este
// módulo solo verifica el token y, si todo cuadra, emite la misma sesión que
// /auth/login (buildAuthenticatedResponse). Nada más del sistema cambia: ni el
// JWT, ni authenticateRequest, ni workerAuthz.
//
// Invariantes — no relajar sin pensarlo:
//   1. NUNCA crea usuarios. El email tiene que estar en GOOGLE_ADMIN_EMAILS Y
//      existir ya en `users` con is_superadmin. Es otra puerta a una cuenta que
//      ya existe, no una vía de alta.
//   2. `aud` debe ser EXACTAMENTE GOOGLE_CLIENT_ID. Sin esta línea se aceptaría
//      un ID token que Google emitió para cualquier otra aplicación.
//   3. Solo RS256 con las claves del JWKS de Google. Cualquier otro `alg`
//      (incluidos "none" y HS256) se rechaza antes de mirar la firma.
//   4. Si la cuenta tiene TOTP activo, Google NO lo salta: se devuelve el mismo
//      ticket de MFA que el login por contraseña. Quitarlo sería rebajar la
//      seguridad de esa cuenta a propósito, no un efecto colateral.
//   5. Los rechazos por identidad (403) devuelven todos el mismo mensaje; la
//      razón real solo va al log de auditoría (security_audit_log).
//
// Sin secretos nuevos: GOOGLE_CLIENT_ID y GOOGLE_ADMIN_EMAILS son
// configuración, no credenciales, y viven en [vars] de wrangler.toml. Sin ellos
// el login responde 503 y /auth/google/config dice enabled:false, así que este
// código se puede desplegar antes de crear el Client ID en Google Cloud.
//
// Sin nonce, a propósito: el ID token va del navegador a este endpoint por TLS y
// se canjea al instante, y `iat` recortado a 10 min ya acota su reutilización
// sin añadir un endpoint ni estado en KV. Quien pudiera leer ese token ya podría
// leer el JWT de sesión del localStorage del admin.
// ===========================================================================

import { getCorsHeaders } from './workerCors.js';
import { logSecurityEvent, getClientIp } from './workerAudit.js';
import { hitRateLimit, buildAuthenticatedResponse, createMfaTicket } from './workerAuthentication.js';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

const CLOCK_SKEW_SECONDS = 60;
// Un ID token dura 1 h, pero aquí se canjea nada más recibirlo: pedir que se
// haya emitido hace poco descarta uno viejo que se hubiera filtrado.
const ID_TOKEN_MAX_AGE_SECONDS = 600;
// Los ID tokens de Google rondan 1 KB; esto solo corta cuerpos absurdos.
const MAX_CREDENTIAL_LENGTH = 4096;

// El uso legítimo es 1-2 intentos al día: 10 por IP y 15 min sobra, y acota el
// coste de las peticiones basura (cada una cuesta parseo y una verificación RSA).
const GOOGLE_LOGIN_LIMIT_PER_IP = { limit: 10, windowSeconds: 900 };

// Google publica sus claves con max-age de horas; se recarga cada hora.
const JWKS_TTL_MS = 60 * 60 * 1000;
// Una `kid` desconocida fuerza recargar (rotación de claves), pero como mucho una
// vez por minuto: si no, cualquiera podría usar este endpoint para martillear a
// Google mandando kids inventadas.
const JWKS_MIN_REFRESH_MS = 60 * 1000;
const JWKS_FETCH_TIMEOUT_MS = 5000;

const B64URL_SEGMENT = /^[A-Za-z0-9_-]+$/;

// ---------------------------------------------------------------------------
// JWKS de Google (caché por isolate)
// ---------------------------------------------------------------------------
let jwksCache = { keys: null, fetchedAt: 0 };

/** Solo para tests: sin esto la caché de módulo se arrastra entre escenarios. */
export function resetGoogleKeyCacheForTests() {
    jwksCache = { keys: null, fetchedAt: 0 };
}

async function fetchGoogleKeys() {
    const res = await fetch(GOOGLE_JWKS_URL, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(JWKS_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`JWKS HTTP ${res.status}`);
    const body = await res.json();

    const keys = new Map();
    for (const jwk of Array.isArray(body?.keys) ? body.keys : []) {
        if (jwk && jwk.kty === 'RSA' && typeof jwk.kid === 'string' && jwk.n && jwk.e) {
            keys.set(jwk.kid, jwk);
        }
    }
    if (keys.size === 0) throw new Error('JWKS sin claves RSA');
    return keys;
}

/**
 * JWK de Google para una `kid`. Devuelve null si esa kid no existe; lanza solo
 * si no hay forma de tener claves (sin caché y Google no responde).
 */
async function getGoogleKey(kid) {
    const now = Date.now();
    const fresh = jwksCache.keys !== null && now - jwksCache.fetchedAt < JWKS_TTL_MS;
    if (fresh && jwksCache.keys.has(kid)) return jwksCache.keys.get(kid);

    const recentlyFetched = jwksCache.keys !== null && now - jwksCache.fetchedAt < JWKS_MIN_REFRESH_MS;
    if (!recentlyFetched) {
        try {
            jwksCache = { keys: await fetchGoogleKeys(), fetchedAt: now };
        } catch (error) {
            // Con claves ya cacheadas (aunque hayan caducado) se sigue con ellas:
            // mejor una clave de hace unas horas que dejar al superadmin fuera
            // porque Google tarde. Sin ninguna, el error sube.
            if (jwksCache.keys === null) throw error;
            console.warn('[GoogleAuth] No se pudo refrescar el JWKS, se usa la caché:', error.message);
        }
    }
    return jwksCache.keys.get(kid) ?? null;
}

// ---------------------------------------------------------------------------
// Verificación del ID token
// ---------------------------------------------------------------------------
function b64urlToBytes(segment) {
    const b64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

function decodeJsonSegment(segment) {
    return JSON.parse(new TextDecoder().decode(b64urlToBytes(segment)));
}

/**
 * Verifica un ID token de Google contra las claves publicadas por Google y
 * contra el Client ID de esta aplicación.
 * @returns {Promise<{ok: true, claims: object} | {ok: false, reason: string}>}
 */
async function verifyGoogleIdToken(credential, clientId) {
    const parts = credential.split('.');
    if (parts.length !== 3 || !parts.every((p) => B64URL_SEGMENT.test(p))) {
        return { ok: false, reason: 'malformed' };
    }

    let header, claims, signature;
    try {
        header = decodeJsonSegment(parts[0]);
        claims = decodeJsonSegment(parts[1]);
        signature = b64urlToBytes(parts[2]);
    } catch {
        return { ok: false, reason: 'malformed' };
    }
    if (!header || typeof header !== 'object' || !claims || typeof claims !== 'object') {
        return { ok: false, reason: 'malformed' };
    }

    // 1. Algoritmo: solo RS256. Antes de tocar la firma, así "none" y HS256 (la
    //    clásica confusión de algoritmo) ni llegan a evaluarse.
    if (header.alg !== 'RS256') return { ok: false, reason: 'bad_alg' };
    if (typeof header.kid !== 'string' || !header.kid) return { ok: false, reason: 'no_kid' };

    // 2. Firma con la clave que Google publica para esa kid.
    let jwk;
    try {
        jwk = await getGoogleKey(header.kid);
    } catch (error) {
        console.error('[GoogleAuth] JWKS no disponible:', error.message);
        return { ok: false, reason: 'jwks_unavailable' };
    }
    if (!jwk) return { ok: false, reason: 'unknown_kid' };

    // Importar y verificar van en try separados: si Google publicara una clave que
    // este runtime no sabe importar, eso es un fallo de configuración (que hay que
    // ver en la auditoría como tal), no un token falsificado.
    let key;
    try {
        key = await crypto.subtle.importKey(
            'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
        );
    } catch (error) {
        console.error('[GoogleAuth] No se pudo importar la clave de Google:', error.message);
        return { ok: false, reason: 'key_import_failed' };
    }

    let signatureValid = false;
    try {
        signatureValid = await crypto.subtle.verify(
            'RSASSA-PKCS1-v1_5', key, signature, new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
        );
    } catch {
        return { ok: false, reason: 'bad_signature' };
    }
    if (!signatureValid) return { ok: false, reason: 'bad_signature' };

    // 3. Claims. Solo se miran cuando la firma ya es válida. Number.isFinite no
    //    convierte tipos: un "exp" en texto falla en vez de colarse.
    const now = Math.floor(Date.now() / 1000);
    if (!GOOGLE_ISSUERS.includes(claims.iss)) return { ok: false, reason: 'bad_issuer' };
    if (claims.aud !== clientId) return { ok: false, reason: 'bad_audience' };
    if (claims.azp !== undefined && claims.azp !== clientId) return { ok: false, reason: 'bad_audience' };
    if (!Number.isFinite(claims.exp) || claims.exp + CLOCK_SKEW_SECONDS <= now) return { ok: false, reason: 'expired' };
    if (!Number.isFinite(claims.iat) || claims.iat - CLOCK_SKEW_SECONDS > now) return { ok: false, reason: 'iat_invalid' };
    if (now - claims.iat > ID_TOKEN_MAX_AGE_SECONDS) return { ok: false, reason: 'too_old' };
    if (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf - CLOCK_SKEW_SECONDS > now)) {
        return { ok: false, reason: 'not_yet_valid' };
    }
    if (typeof claims.email !== 'string' || !claims.email) return { ok: false, reason: 'no_email' };
    if (claims.email_verified !== true && claims.email_verified !== 'true') return { ok: false, reason: 'email_unverified' };

    return { ok: true, claims };
}

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------
function getGoogleLoginConfig(env) {
    const clientId = String(env.GOOGLE_CLIENT_ID ?? '').trim();
    const allowedEmails = new Set(
        String(env.GOOGLE_ADMIN_EMAILS ?? '')
            .split(/[\s,;]+/)
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean)
    );
    return { clientId, allowedEmails, enabled: clientId !== '' && allowedEmails.size > 0 };
}

function createResponse(data, status = 200, request = null, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...getCorsHeaders(request), 'Cache-Control': 'no-store', ...extraHeaders },
    });
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------
/**
 * Le dice al panel si debe pintar el botón y con qué Client ID. El Client ID es
 * público por diseño (viaja en el navegador de cualquier web con Google
 * Sign-In); la lista de emails NO se expone. Servirlo desde aquí evita tener el
 * Client ID en dos sitios (worker y variables de build del admin) que se
 * desincronizarían.
 */
function handleGoogleConfig(request, env) {
    const { clientId, enabled } = getGoogleLoginConfig(env);
    const body = enabled ? { success: true, enabled: true, clientId } : { success: true, enabled: false };
    return createResponse(body, 200, request);
}

async function handleGoogleLogin(request, env) {
    try {
        const { clientId, allowedEmails, enabled } = getGoogleLoginConfig(env);
        if (!enabled) {
            return createResponse({ success: false, message: 'El acceso con Google no está configurado' }, 503, request);
        }

        let credential;
        try {
            ({ credential } = await request.json());
        } catch {
            return createResponse({ success: false, message: 'Cuerpo de la petición inválido' }, 400, request);
        }
        if (typeof credential !== 'string' || !credential || credential.length > MAX_CREDENTIAL_LENGTH) {
            return createResponse({ success: false, message: 'Falta la credencial de Google' }, 400, request);
        }

        // Rate limiting ANTES de derivar nada ni de llamar a Google.
        const clientIp = getClientIp(request);
        const limit = await hitRateLimit(env, `ratelimit:google-login-ip:${clientIp}`, GOOGLE_LOGIN_LIMIT_PER_IP);
        if (!limit.allowed) {
            console.warn(`[GoogleAuth] 429 login: ip=${clientIp}`);
            await logSecurityEvent(env, { type: 'login_rate_limited', request, detail: { provider: 'google' } });
            return createResponse(
                { success: false, message: 'Demasiados intentos. Inténtalo de nuevo más tarde.', retryAfter: limit.retryAfter },
                429,
                request,
                { 'Retry-After': String(limit.retryAfter) }
            );
        }

        const result = await verifyGoogleIdToken(credential, clientId);
        if (!result.ok) {
            await logSecurityEvent(env, { type: 'login_failed', request, detail: { provider: 'google', reason: result.reason } });
            if (result.reason === 'jwks_unavailable') {
                return createResponse(
                    { success: false, message: 'Google no responde ahora mismo. Usa tu contraseña o inténtalo de nuevo en un rato.' },
                    503,
                    request
                );
            }
            return createResponse({ success: false, message: 'No se pudo verificar la cuenta de Google' }, 401, request);
        }

        // Identidad verificada por Google. Falta decidir si esa identidad puede
        // entrar aquí: siempre el mismo 403, sea cual sea el motivo real.
        const email = result.claims.email.trim().toLowerCase();
        const deny = async (reason, userId = null) => {
            await logSecurityEvent(env, { type: 'login_failed', userId, request, detail: { provider: 'google', reason, email } });
            return createResponse({ success: false, message: 'Esta cuenta de Google no tiene acceso al panel' }, 403, request);
        };

        if (!allowedEmails.has(email)) return await deny('not_allowlisted');

        // Solo se busca, nunca se crea (invariante 1).
        const user = await env.DB.prepare(`
            SELECT id, email, display_name, photo_url, is_superadmin, token_version, totp_enabled
            FROM users WHERE email = ? LIMIT 1
        `).bind(email).first();
        if (!user) return await deny('no_such_user');
        if (user.is_superadmin !== 1 && user.is_superadmin !== true) return await deny('not_superadmin', user.id);

        // Google no sustituye al segundo factor de la cuenta (invariante 4).
        if (user.totp_enabled === 1) {
            const ticket = await createMfaTicket(env, user.id);
            await logSecurityEvent(env, { type: 'login_mfa_challenge', userId: user.id, request, detail: { provider: 'google' } });
            return createResponse({ success: true, mfaRequired: true, ticket }, 200, request);
        }

        const response = await buildAuthenticatedResponse(env, user);
        await logSecurityEvent(env, { type: 'login_success', userId: user.id, request, detail: { provider: 'google' } });
        return createResponse(response, 200, request);
    } catch (error) {
        console.error('[GoogleAuth] Login error:', error);
        return createResponse({ success: false, message: 'Error interno del servidor' }, 500, request);
    }
}

export async function handleGoogleAuthRequests(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/auth/google/config' && request.method === 'GET') {
        return handleGoogleConfig(request, env);
    }
    if (pathname === '/auth/google' && request.method === 'POST') {
        return await handleGoogleLogin(request, env);
    }
    return null;
}
