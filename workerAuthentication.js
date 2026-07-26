// JWT_SECRET ahora se lee desde env (configurado en Cloudflare Dashboard)
// Ver: Workers & Pages > visualtasteworker > Configuración > Variables y secretos
import { getCorsHeaders } from './workerCors.js';
import { logSecurityEvent, getClientIp } from './workerAudit.js';

export const JWT_ALGORITHM = 'HS256';
export const JWT_EXPIRATION = '7d'; // 7 days
const ACCESS_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

// ---------------------------------------------------------------------------
// Configuración del hashing de contraseñas
// ---------------------------------------------------------------------------
// 600.000 iteraciones es la recomendación de OWASP para PBKDF2-HMAC-SHA256.
// Cuesta ~330 ms de CPU por derivación, así que encarece también el login
// legítimo: es aceptable porque el login es infrecuente y porque el rate
// limiting de más abajo acota el uso del endpoint como amplificador de DoS.
// Si alguna vez hay que bajarlo, este es el único sitio que tocar.
const PBKDF2_ITERATIONS = 600000;
const PBKDF2_SALT_SIZE = 16;
const PBKDF2_HASH_ALGO = 'SHA-256';

// Iteraciones del formato antiguo (`salt_hex:hash_hex`, sin prefijo). Se sigue
// aceptando para no invalidar las contraseñas existentes; en el primer login
// correcto el hash se regenera con el formato y el coste actuales.
const LEGACY_PBKDF2_ITERATIONS = 100000;

// NIST SP 800-63B pide 8 como mínimo absoluto. Para un panel de administración
// 12 es lo razonable. Lo que NO se hace, también por NIST: forzar rotación
// periódica ni exigir composición (mayúsculas/símbolos), que empeoran las
// contraseñas reales en vez de mejorarlas.
export const MIN_PASSWORD_LENGTH = 12;

/**
 * Valida una contraseña contra la política.
 * @returns {string|null} mensaje de error, o null si es válida
 */
export function validatePassword(password) {
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
        return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
    }
    if (password.length > 256) {
        return 'La contraseña no puede superar los 256 caracteres';
    }
    return null;
}
// ===========================================================================
// PASSWORD UTILITIES (Native Web Crypto)
// ===========================================================================
/**
 * Generate a secure random password
 * @param {number} length - Password length (default 12)
 * @returns {string} - Random alphanumeric password
 */
export function generateSecurePassword(length = 12) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const randomValues = crypto.getRandomValues(new Uint8Array(length));
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars[randomValues[i] % chars.length];
    }
    return password;
}
/**
 * Deriva el hash PBKDF2 de una contraseña.
 */
async function deriveHash(password, salt, iterations) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );
    const hash = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: iterations,
            hash: PBKDF2_HASH_ALGO
        },
        keyMaterial,
        256
    );
    return buf2hex(hash);
}

/**
 * Hashea una contraseña.
 *
 * Formato: `pbkdf2$<iteraciones>$<salt_hex>$<hash_hex>`
 *
 * Lleva el número de iteraciones dentro para que subirlo en el futuro no
 * invalide los hashes ya almacenados: `verifyPassword` usa el valor guardado y
 * avisa de que toca regenerar.
 *
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_SIZE));
    const hashHex = await deriveHash(password, salt, PBKDF2_ITERATIONS);
    return `pbkdf2$${PBKDF2_ITERATIONS}$${buf2hex(salt)}$${hashHex}`;
}

/**
 * Descompone un hash almacenado, en formato nuevo o antiguo.
 * @returns {{salt: Uint8Array, hashHex: string, iterations: number, legacy: boolean}|null}
 */
function parseStoredHash(storedHash) {
    if (typeof storedHash !== 'string' || !storedHash) return null;

    // Formato nuevo, versionado.
    if (storedHash.startsWith('pbkdf2$')) {
        const [, iterStr, saltHex, hashHex] = storedHash.split('$');
        const iterations = Number.parseInt(iterStr, 10);
        if (!Number.isInteger(iterations) || iterations <= 0 || !saltHex || !hashHex) return null;
        return { salt: hex2buf(saltHex), hashHex, iterations, legacy: false };
    }

    // Formato antiguo: `salt_hex:hash_hex`, siempre 100.000 iteraciones.
    const [saltHex, hashHex] = storedHash.split(':');
    if (!saltHex || !hashHex) return null;
    return { salt: hex2buf(saltHex), hashHex, iterations: LEGACY_PBKDF2_ITERATIONS, legacy: true };
}

/**
 * Verifica una contraseña contra el hash almacenado.
 *
 * @returns {Promise<{valid: boolean, needsRehash: boolean}>}
 *   `needsRehash` indica que el hash es válido pero está por debajo del coste
 *   actual: quien llame debe regenerarlo (solo puede hacerse aquí, que es el
 *   único momento en que se tiene la contraseña en claro).
 */
async function verifyPassword(password, storedHash) {
    const parsed = parseStoredHash(storedHash);
    if (!parsed) return { valid: false, needsRehash: false };

    const computedHex = await deriveHash(password, parsed.salt, parsed.iterations);
    const valid = timingSafeEqual(computedHex, parsed.hashHex);

    return {
        valid,
        needsRehash: valid && (parsed.legacy || parsed.iterations < PBKDF2_ITERATIONS),
    };
}

/**
 * Consume el mismo tiempo de CPU que una verificación real.
 *
 * Sin esto, un login contra un email inexistente responde de inmediato
 * mientras que uno contra un email real tarda ~330 ms: la diferencia permite
 * enumerar qué cuentas existen pese a que el mensaje de error sea idéntico.
 */
async function dummyVerify(password) {
    const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_SIZE));
    await deriveHash(typeof password === 'string' ? password : '', salt, PBKDF2_ITERATIONS);
}

/**
 * Comparación en tiempo constante de dos cadenas hexadecimales.
 *
 * `===` cortocircuita en el primer carácter distinto, lo que filtra por
 * temporización cuánto prefijo has acertado.
 */
function timingSafeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}
function buf2hex(buffer) {
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}
function hex2buf(hex) {
    const pairs = hex.match(/.{1,2}/g);
    if (!pairs) return new Uint8Array(0);
    return new Uint8Array(pairs.map(byte => parseInt(byte, 16)));
}
// ===========================================================================
// JWT UTILITIES
// ===========================================================================
async function generateJWT(payload, secret) {
    const header = { alg: JWT_ALGORITHM, typ: 'JWT' };
    const expirationTime = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS;
    const jwtPayload = { ...payload, iat: Math.floor(Date.now() / 1000), exp: expirationTime };
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const signature = await signHMAC(signatureInput, secret);
    return `${signatureInput}.${signature}`;
}
async function verifyJWT(token, secret) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const [encodedHeader, encodedPayload, signature] = parts;
        const signatureInput = `${encodedHeader}.${encodedPayload}`;
        const expectedSignature = await signHMAC(signatureInput, secret);
        if (!timingSafeEqual(signature, expectedSignature)) return null;
        const payload = JSON.parse(base64UrlDecode(encodedPayload));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch (error) {
        return null;
    }
}
async function signHMAC(data, secret) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(data);
    const key = await crypto.subtle.importKey(
        'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    return base64UrlEncode(signature);
}
function base64UrlEncode(data) {
    let base64;
    if (typeof data === 'string') {
        base64 = btoa(data);
    } else {
        const bytes = new Uint8Array(data);
        base64 = btoa(String.fromCharCode(...bytes));
    }
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function base64UrlDecode(base64Url) {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return atob(base64);
}
// ===========================================================================
// RATE LIMITING DEL LOGIN
// ===========================================================================
// Dos ventanas simultáneas, porque protegen de ataques distintos:
//
//   - por email+IP  → fuerza bruta contra UNA cuenta concreta.
//   - por IP        → credential stuffing: muchos emails, pocos intentos
//                     cada uno, que la primera ventana no vería.
//
// El contador por email+IP se borra al acertar la contraseña, para que un
// usuario legítimo que se equivoca unas cuantas veces no arrastre el bloqueo.
//
// Deliberadamente NO se bloquea la cuenta en sí: sería un vector trivial de
// denegación de servicio contra un cliente concreto (basta con fallar cinco
// veces contra su email desde cualquier IP).

const LOGIN_LIMIT_PER_ACCOUNT = { limit: 5, windowSeconds: 900 };   // 5 / 15 min
const LOGIN_LIMIT_PER_IP = { limit: 30, windowSeconds: 3600 };      // 30 / hora

/**
 * Consulta e incrementa un contador con ventana fija en KV.
 * @returns {Promise<{allowed: boolean, retryAfter: number}>}
 */
async function hitRateLimit(env, key, { limit, windowSeconds }) {
    // Sin binding de KV no se puede contar. Se deja pasar en vez de bloquear el
    // login entero, pero se avisa: es una degradación de seguridad, no algo
    // normal. Ver wrangler.toml → RATE_LIMIT_KV.
    if (!env.RATE_LIMIT_KV) {
        console.warn('[Auth] RATE_LIMIT_KV no está configurado: login sin rate limiting');
        return { allowed: true, retryAfter: 0 };
    }

    const now = Math.floor(Date.now() / 1000);
    try {
        const data = await env.RATE_LIMIT_KV.get(key, { type: 'json' });

        if (data && now - data.windowStart < windowSeconds) {
            if (data.count >= limit) {
                return { allowed: false, retryAfter: windowSeconds - (now - data.windowStart) };
            }
            await env.RATE_LIMIT_KV.put(
                key,
                JSON.stringify({ count: data.count + 1, windowStart: data.windowStart }),
                // El TTL cubre lo que resta de ventana, no la ventana entera:
                // si no, cada intento la extendería y nunca expiraría.
                { expirationTtl: Math.max(60, windowSeconds - (now - data.windowStart)) }
            );
            return { allowed: true, retryAfter: 0 };
        }

        await env.RATE_LIMIT_KV.put(
            key,
            JSON.stringify({ count: 1, windowStart: now }),
            { expirationTtl: windowSeconds }
        );
        return { allowed: true, retryAfter: 0 };
    } catch (error) {
        // Un fallo de KV no debe dejar a nadie fuera de su panel.
        console.error('[Auth] Error de rate limiting:', error.message);
        return { allowed: true, retryAfter: 0 };
    }
}

async function clearRateLimit(env, key) {
    if (!env.RATE_LIMIT_KV) return;
    try {
        await env.RATE_LIMIT_KV.delete(key);
    } catch (error) {
        console.error('[Auth] Error limpiando rate limit:', error.message);
    }
}

// ===========================================================================
// REVOCACIÓN DE SESIONES (token_version)
// ===========================================================================
// No hay tabla de sesiones por dispositivo — eso exigiría refresh tokens,
// cookies httpOnly y mover el worker a un dominio propio (hoy vive en
// *.workers.dev, distinto del de admin.visualtastes.com; una cookie no
// funcionaría entre ambos sin eso). En su lugar: cada usuario tiene un
// contador (`token_version`) en D1. El JWT lleva el valor vigente en el
// momento de emitirse (`tv`); si no coincide con el actual, el token se trata
// como revocado aunque su firma y su `exp` sigan siendo válidos.
//
// Coste: consultar D1 en CADA request protegida sería caro. Se cachea en KV
// con TTL corto, así que el caso común (mismo usuario, requests seguidas) no
// toca la base de datos.
const TOKEN_VERSION_CACHE_TTL = 300; // 5 min

async function getCurrentTokenVersion(env, userId) {
    const cacheKey = `tv:${userId}`;
    if (env.RATE_LIMIT_KV) {
        try {
            const cached = await env.RATE_LIMIT_KV.get(cacheKey);
            if (cached !== null) return Number(cached);
        } catch (error) {
            console.error('[Auth] Error leyendo caché de token_version:', error.message);
        }
    }

    const row = await env.DB.prepare(`SELECT token_version FROM users WHERE id = ? LIMIT 1`)
        .bind(userId).first();
    const current = row?.token_version ?? 0;

    if (env.RATE_LIMIT_KV) {
        try {
            await env.RATE_LIMIT_KV.put(cacheKey, String(current), { expirationTtl: TOKEN_VERSION_CACHE_TTL });
        } catch (error) {
            console.error('[Auth] Error escribiendo caché de token_version:', error.message);
        }
    }
    return current;
}

async function isTokenVersionValid(env, userId, claimedTv) {
    try {
        const current = await getCurrentTokenVersion(env, userId);
        return current === Number(claimedTv ?? 0);
    } catch (error) {
        console.error('[Auth] Error verificando token_version:', error.message);
        // Fallo de D1: la firma del JWT ya garantiza la identidad; este check es
        // una capa adicional de revocación, no la autenticación primaria. Fail
        // open aquí evita que un incidente de infraestructura tumbe a todo el
        // mundo de su sesión.
        return true;
    }
}

/**
 * Revoca TODAS las sesiones de un usuario (no solo la de un dispositivo: no
 * hay tabla de sesiones por dispositivo, ver arriba). Usado por logout y por
 * cambio de contraseña.
 */
async function revokeAllSessions(env, userId) {
    await env.DB.prepare(`UPDATE users SET token_version = token_version + 1 WHERE id = ?`)
        .bind(userId).run();
    if (env.RATE_LIMIT_KV) {
        try {
            await env.RATE_LIMIT_KV.delete(`tv:${userId}`);
        } catch (error) {
            console.error('[Auth] Error limpiando caché de token_version:', error.message);
        }
    }
}

// ===========================================================================
// AUTHENTICATION MIDDLEWARE
// ===========================================================================
/**
 * Autenticar request: verifica la firma/expiración del JWT y que no haya
 * sido revocado (logout o cambio de contraseña) desde que se emitió.
 * @param {Request} request
 * @param {Object} env - Entorno de Cloudflare con JWT_SECRET
 */
export async function authenticateRequest(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    const payload = await verifyJWT(token, env.JWT_SECRET);
    if (!payload) return null;

    const valid = await isTokenVersionValid(env, payload.userId, payload.tv);
    if (!valid) return null;

    return payload;
}
// ===========================================================================
// MFA (TOTP, RFC 6238) — segundo factor opcional, autogestionado
// ===========================================================================
// Sin dependencias externas: HOTP es HMAC-SHA1 truncado (RFC 4226), TOTP es
// HOTP con el contador derivado del tiempo (RFC 6238). Todo con Web Crypto
// nativo, disponible en el runtime del Worker.
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1; // acepta el código del paso anterior/siguiente (deriva de reloj)
const MFA_TICKET_TTL_SECONDS = 300; // 5 min
const RECOVERY_CODE_COUNT = 8;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// base32Encode/Decode y hotp se exportan solo para poder validarlos en tests
// contra los vectores de prueba oficiales (RFC 4226 Apéndice D); el resto del
// código los usa siempre a través de verifyTotp.
export function base32Encode(bytes) {
    let bits = 0, value = 0, output = '';
    for (const byte of bytes) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) {
        output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }
    return output;
}

export function base32Decode(str) {
    const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = 0, value = 0;
    const bytes = [];
    for (const char of clean) {
        const idx = BASE32_ALPHABET.indexOf(char);
        if (idx === -1) continue;
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    return new Uint8Array(bytes);
}

/** Secreto de 160 bits (20 bytes), el tamaño estándar recomendado para TOTP. */
function generateTotpSecret() {
    return base32Encode(crypto.getRandomValues(new Uint8Array(20)));
}

/**
 * HOTP (RFC 4226). El contador cabe en 32 bits hasta el año ~136.000 con
 * pasos de 30s, así que la mitad alta del entero de 64 bits siempre es 0.
 */
export async function hotp(secretBytes, counter, digits = TOTP_DIGITS) {
    const buf = new ArrayBuffer(8);
    new DataView(buf).setUint32(4, counter, false);
    const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = (
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff)
    ) % 10 ** digits;
    return String(code).padStart(digits, '0');
}

/**
 * Verifica un código TOTP con una ventana de tolerancia (deriva de reloj del
 * móvil del usuario). Comparación en tiempo constante para no filtrar por
 * temporización cuántos dígitos ha acertado un atacante.
 */
export async function verifyTotp(secretBase32, code, { at = Date.now() } = {}) {
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return false;
    const secretBytes = base32Decode(secretBase32);
    const counter = Math.floor(at / 1000 / TOTP_STEP_SECONDS);
    for (let delta = -TOTP_WINDOW; delta <= TOTP_WINDOW; delta++) {
        const candidate = await hotp(secretBytes, counter + delta);
        if (timingSafeEqual(candidate, code)) return true;
    }
    return false;
}

function buildTotpProvisioningUri(secretBase32, email) {
    const label = encodeURIComponent(`VisualTaste Admin:${email}`);
    const issuer = encodeURIComponent('VisualTaste');
    return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${issuer}&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
}

async function sha256Hex(text) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return buf2hex(digest);
}

function generateRecoveryCodes(count = RECOVERY_CODE_COUNT) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const bytes = crypto.getRandomValues(new Uint8Array(5));
        const raw = base32Encode(bytes).slice(0, 8);
        codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
    }
    return codes;
}

/**
 * Ticket de un solo uso que enlaza "esta contraseña era correcta" con "falta
 * el segundo factor". Vive en KV, no en el JWT: si viviera en un JWT firmado,
 * cualquiera con ese token a medias podría intentar fuerza bruta contra el
 * código sin que el servidor pudiera invalidarlo antes de que expire.
 */
async function createMfaTicket(env, userId) {
    const ticket = base64UrlEncode(crypto.getRandomValues(new Uint8Array(24)));
    if (!env.RATE_LIMIT_KV) {
        // Sin KV no hay dónde guardar el ticket. No se puede exigir MFA sin
        // esto, así que se documenta como dependencia dura de esta función,
        // no como una degradación silenciosa (a diferencia del rate limit).
        throw new Error('RATE_LIMIT_KV no configurado: no se puede emitir un ticket de MFA');
    }
    await env.RATE_LIMIT_KV.put(`mfa_ticket:${ticket}`, userId, { expirationTtl: MFA_TICKET_TTL_SECONDS });
    return ticket;
}

/** Consulta a qué usuario pertenece un ticket, sin invalidarlo todavía. */
async function peekMfaTicket(env, ticket) {
    if (!env.RATE_LIMIT_KV || typeof ticket !== 'string' || !ticket) return null;
    return await env.RATE_LIMIT_KV.get(`mfa_ticket:${ticket}`);
}

/** Invalida el ticket. Se llama solo tras validar el código correctamente. */
async function consumeMfaTicket(env, ticket) {
    if (!env.RATE_LIMIT_KV || typeof ticket !== 'string' || !ticket) return;
    await env.RATE_LIMIT_KV.delete(`mfa_ticket:${ticket}`);
}

// ===========================================================================
// INVITACIONES — altas sin contraseñas en claro
// ===========================================================================
// Sustituye a "generar una contraseña aleatoria y devolverla en la respuesta"
// (lo que hacían addRestaurantUser/resetUserPassword en workerRestaurants.js).
// Solo se guarda el HASH del token; el crudo únicamente existe en el enlace
// que se envía. Sirve tanto para altas nuevas como para "olvidé mi
// contraseña": el comportamiento en `handleAcceptInvitation` depende de si el
// email ya tiene cuenta.
const INVITATION_TTL_HOURS = 72;

/**
 * Crea una invitación y devuelve el token EN CLARO una sola vez — quien llame
 * es responsable de mandarlo (email o, a falta de proveedor, mostrarlo para
 * copiar) y de no guardarlo en ningún sitio más.
 *
 * @param {Object} env
 * @param {{email:string, role?:string, restaurantId?:string|null, agencyId?:string|null, invitedBy:string}} params
 * @returns {Promise<{token:string, expiresAt:string}>}
 */
export async function createInvitation(env, { email, role, restaurantId = null, agencyId = null, invitedBy }) {
    const token = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
    const tokenHash = await sha256Hex(token);
    const id = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const expiresAt = new Date(Date.now() + INVITATION_TTL_HOURS * 3600 * 1000).toISOString();

    await env.DB.prepare(`
        INSERT INTO admin_invitations (id, token_hash, email, restaurant_id, agency_id, role, invited_by, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, tokenHash, email.trim().toLowerCase(), restaurantId, agencyId, role || 'staff', invitedBy, expiresAt).run();

    return { token, expiresAt };
}

async function handleGetInvitation(env, token) {
    try {
        const tokenHash = await sha256Hex(token);
        const inv = await env.DB.prepare(`
            SELECT ai.email, ai.role, ai.expires_at, ai.used_at, r.name AS restaurant_name
            FROM admin_invitations ai
            LEFT JOIN restaurants r ON r.id = ai.restaurant_id
            WHERE ai.token_hash = ? LIMIT 1
        `).bind(tokenHash).first();

        if (!inv) return createResponse({ success: false, message: 'Invitación no encontrada' }, 404);

        const expired = new Date(inv.expires_at) < new Date();
        const used = !!inv.used_at;
        return createResponse({
            success: true,
            invitation: {
                email: inv.email,
                role: inv.role,
                restaurantName: inv.restaurant_name || null,
                valid: !expired && !used,
                expired,
                used,
            },
        });
    } catch (error) {
        console.error('[Auth] Error consultando invitación:', error.message);
        return createResponse({ success: false, message: 'Error interno del servidor' }, 500);
    }
}

async function handleAcceptInvitation(request, env, token) {
    try {
        const { password } = await request.json();
        const policyError = validatePassword(password);
        if (policyError) return createResponse({ success: false, message: policyError }, 400);

        const tokenHash = await sha256Hex(token);
        const inv = await env.DB.prepare(`SELECT * FROM admin_invitations WHERE token_hash = ? LIMIT 1`)
            .bind(tokenHash).first();

        if (!inv) return createResponse({ success: false, message: 'Invitación no válida' }, 404);
        if (inv.used_at) return createResponse({ success: false, message: 'Esta invitación ya se ha usado' }, 409);
        if (new Date(inv.expires_at) < new Date()) {
            return createResponse({ success: false, message: 'Esta invitación ha caducado' }, 410);
        }

        const passwordHash = await hashPassword(password);
        let user = await env.DB.prepare(`SELECT id, email, display_name, photo_url, is_superadmin, token_version FROM users WHERE email = ? LIMIT 1`)
            .bind(inv.email).first();

        if (!user) {
            const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            await env.DB.prepare(`
                INSERT INTO users (id, email, display_name, password_hash, auth_provider, created_at)
                VALUES (?, ?, ?, ?, 'email', CURRENT_TIMESTAMP)
            `).bind(userId, inv.email, inv.email.split('@')[0], passwordHash).run();
            user = { id: userId, email: inv.email, display_name: inv.email.split('@')[0], photo_url: null, is_superadmin: 0, token_version: 0 };
            if (inv.restaurant_id) {
                await env.DB.prepare(`
                    INSERT INTO restaurant_staff (restaurant_id, user_id, role, is_active, created_at)
                    VALUES (?, ?, ?, TRUE, CURRENT_TIMESTAMP)
                `).bind(inv.restaurant_id, user.id, inv.role).run();
            }
        } else {
            // Cuenta existente redimiendo un enlace: fija la contraseña nueva
            // y revoca cualquier sesión abierta con la anterior.
            await env.DB.prepare(`UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?`)
                .bind(passwordHash, user.id).run();
            user.token_version = (user.token_version ?? 0) + 1;
            if (env.RATE_LIMIT_KV) await env.RATE_LIMIT_KV.delete(`tv:${user.id}`).catch(() => {});

            if (inv.restaurant_id) {
                const existingStaff = await env.DB.prepare(
                    `SELECT 1 FROM restaurant_staff WHERE restaurant_id = ? AND user_id = ?`
                ).bind(inv.restaurant_id, user.id).first();
                // Solo se asigna el rol de la invitación si el usuario no
                // pertenecía ya a este restaurante — un reseteo de contraseña
                // no debe poder cambiar silenciosamente el rol de alguien.
                if (!existingStaff) {
                    await env.DB.prepare(`
                        INSERT INTO restaurant_staff (restaurant_id, user_id, role, is_active, created_at)
                        VALUES (?, ?, ?, TRUE, CURRENT_TIMESTAMP)
                    `).bind(inv.restaurant_id, user.id, inv.role).run();
                }
            }
        }

        await env.DB.prepare(`UPDATE admin_invitations SET used_at = CURRENT_TIMESTAMP WHERE id = ?`)
            .bind(inv.id).run();

        const response = await buildAuthenticatedResponse(env, user);
        await logSecurityEvent(env, {
            type: 'invitation_accepted', userId: user.id, restaurantId: inv.restaurant_id, request,
            detail: { email: inv.email },
        });
        return createResponse(response);
    } catch (error) {
        console.error('[Auth] Error aceptando invitación:', error.message);
        return createResponse({ success: false, message: 'Error interno del servidor' }, 500);
    }
}

// ===========================================================================
// ENDPOINT HANDLERS
// ===========================================================================

/**
 * Construye la respuesta de "sesión iniciada": token + datos de usuario con
 * sus restaurantes y agencias. Compartido por login, aceptar invitación y
 * completar el desafío de MFA — los tres son formas de "esta persona acaba
 * de demostrar quién es", y las tres necesitan exactamente lo mismo.
 *
 * @param {Object} env
 * @param {{id, email, display_name, photo_url, is_superadmin, token_version}} user
 */
async function buildAuthenticatedResponse(env, user) {
    let restaurants = [];
    const isSuperAdmin = user.is_superadmin === 1 || user.is_superadmin === true;
    if (isSuperAdmin) {
        const allRestaurants = await env.DB.prepare(`
            SELECT id, name, slug, 'owner' as role, features
            FROM restaurants
            WHERE is_active = TRUE
            ORDER BY name ASC
        `).all();
        restaurants = allRestaurants.results;
    } else {
        const staffRestaurants = await env.DB.prepare(`
            SELECT r.id, r.name, r.slug, rs.role, r.features
            FROM restaurant_staff rs
            JOIN restaurants r ON rs.restaurant_id = r.id
            WHERE rs.user_id = ? AND rs.is_active = TRUE
            ORDER BY r.name ASC
        `).bind(user.id).all();
        restaurants = staffRestaurants.results;
    }

    let agencies = [];
    try {
        if (isSuperAdmin) {
            const allAgencies = await env.DB.prepare(`
                SELECT id, name, slug, logo_url FROM guide_agencies WHERE is_active = 1 ORDER BY name ASC
            `).all();
            agencies = allAgencies.results || [];
        } else {
            const staffAgencies = await env.DB.prepare(`
                SELECT a.id, a.name, a.slug, a.logo_url
                FROM guide_agency_staff gas
                JOIN guide_agencies a ON gas.agency_id = a.id
                WHERE gas.user_id = ? AND a.is_active = 1
                ORDER BY a.name ASC
            `).bind(user.id).all();
            agencies = staffAgencies.results || [];
        }
    } catch (e) {
        console.log('[Auth] guide_agencies table may not exist yet, skipping:', e.message);
    }

    const token = await generateJWT({
        userId: user.id,
        email: user.email,
        is_superadmin: isSuperAdmin,
        tv: user.token_version ?? 0,
        restaurants: restaurants.map(r => r.id)
    }, env.JWT_SECRET);

    await env.DB.prepare(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(user.id).run();

    return {
        success: true,
        token,
        user: {
            id: user.id,
            email: user.email,
            display_name: user.display_name,
            photo_url: user.photo_url,
            is_superadmin: isSuperAdmin,
            restaurants,
            agencies
        }
    };
}

async function handleLogin(request, env) {
    try {
        const { email, password } = await request.json();
        if (!email || !password) {
            return createResponse(
                { success: false, message: 'Email y contraseña son requeridos' },
                400
            );
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const clientIp = getClientIp(request);
        const accountKey = `ratelimit:login:${normalizedEmail}:${clientIp}`;
        const ipKey = `ratelimit:login-ip:${clientIp}`;

        // Rate limiting ANTES de tocar la base de datos o derivar ningún hash:
        // una request bloqueada debe costar lo mínimo posible.
        const [accountLimit, ipLimit] = await Promise.all([
            hitRateLimit(env, accountKey, LOGIN_LIMIT_PER_ACCOUNT),
            hitRateLimit(env, ipKey, LOGIN_LIMIT_PER_IP),
        ]);
        if (!accountLimit.allowed || !ipLimit.allowed) {
            const retryAfter = Math.max(accountLimit.retryAfter, ipLimit.retryAfter);
            console.warn(`[Auth] 429 login: ip=${clientIp}`);
            await logSecurityEvent(env, { type: 'login_rate_limited', request, detail: { email: normalizedEmail } });
            return createResponse(
                {
                    success: false,
                    message: 'Demasiados intentos. Inténtalo de nuevo más tarde.',
                    retryAfter,
                },
                429,
                request,
                { 'Retry-After': String(retryAfter) }
            );
        }

        const user = await env.DB.prepare(`
      SELECT id, email, display_name, password_hash, photo_url, is_superadmin, token_version,
             totp_enabled, totp_secret, totp_recovery_codes
      FROM users WHERE email = ? LIMIT 1
    `).bind(normalizedEmail).first();

        if (!user) {
            // Se deriva un hash igualmente para que el tiempo de respuesta no
            // revele si el email existe. El mensaje ya era idéntico; faltaba
            // que el reloj también lo fuera.
            await dummyVerify(password);
            await logSecurityEvent(env, { type: 'login_failed', request, detail: { email: normalizedEmail, reason: 'no_such_user' } });
            return createResponse(
                { success: false, message: 'Credenciales inválidas' },
                401
            );
        }

        const { valid, needsRehash } = await verifyPassword(password, user.password_hash);
        if (!valid) {
            await logSecurityEvent(env, { type: 'login_failed', userId: user.id, request, detail: { reason: 'bad_password' } });
            return createResponse(
                { success: false, message: 'Credenciales inválidas' },
                401
            );
        }

        // Credenciales correctas: se libera el contador de esta cuenta.
        await clearRateLimit(env, accountKey);

        // Migración perezosa del hash. Solo aquí se tiene la contraseña en
        // claro, así que es el único momento posible para regenerarlo con el
        // coste actual. Si falla, el login sigue adelante: es una mejora
        // oportunista, no un requisito para entrar.
        if (needsRehash) {
            try {
                const upgraded = await hashPassword(password);
                await env.DB.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`)
                    .bind(upgraded, user.id).run();
                console.log(`[Auth] Hash actualizado a ${PBKDF2_ITERATIONS} iteraciones: user=${user.id}`);
            } catch (rehashError) {
                console.error('[Auth] No se pudo actualizar el hash:', rehashError.message);
            }
        }

        // Contraseña correcta pero la cuenta tiene MFA: no se emite el token
        // de sesión todavía. Se emite un ticket de un solo uso, válido 5 min,
        // que solo sirve para completar el segundo factor en /auth/mfa/verify.
        if (user.totp_enabled === 1) {
            const ticket = await createMfaTicket(env, user.id);
            await logSecurityEvent(env, { type: 'login_mfa_challenge', userId: user.id, request });
            return createResponse({ success: true, mfaRequired: true, ticket });
        }

        const response = await buildAuthenticatedResponse(env, user);
        await logSecurityEvent(env, { type: 'login_success', userId: user.id, request });
        return createResponse(response);
    } catch (error) {
        console.error('[Auth] Login error:', error);
        return createResponse(
            { success: false, message: 'Error interno del servidor' },
            500
        );
    }
}
/**
 * `userData` llega ya autenticado (y con la revocación comprobada) por el
 * guardia central de worker.js — no se vuelve a verificar el JWT aquí.
 */
async function handleGetCurrentUser(env, userData) {
    try {
        const user = await env.DB.prepare(`
      SELECT id, email, display_name, photo_url, is_superadmin, totp_enabled
      FROM users WHERE id = ? LIMIT 1
    `).bind(userData.userId).first();
        if (!user) {
            return createResponse(
                { success: false, message: 'Usuario no encontrado' },
                404
            );
        }
        let restaurants = [];
        const isSuperAdmin = user.is_superadmin === 1;
        if (isSuperAdmin) {
            const allRestaurants = await env.DB.prepare(`
                SELECT id, name, slug, 'owner' as role, features
                FROM restaurants
                WHERE is_active = TRUE
                ORDER BY name ASC
            `).all();
            restaurants = allRestaurants.results;
        } else {
            const staffRestaurants = await env.DB.prepare(`
                SELECT r.id, r.name, r.slug, rs.role, r.features
                FROM restaurant_staff rs
                JOIN restaurants r ON rs.restaurant_id = r.id
                WHERE rs.user_id = ? AND rs.is_active = TRUE
                ORDER BY r.name ASC
            `).bind(user.id).all();
            restaurants = staffRestaurants.results;
        }

        // ✅ Guidebook: fetch agencies
        let agencies = [];
        try {
            if (isSuperAdmin) {
                const allAgencies = await env.DB.prepare(`
                    SELECT id, name, slug, logo_url FROM guide_agencies WHERE is_active = 1 ORDER BY name ASC
                `).all();
                agencies = allAgencies.results || [];
            } else {
                const staffAgencies = await env.DB.prepare(`
                    SELECT a.id, a.name, a.slug, a.logo_url
                    FROM guide_agency_staff gas
                    JOIN guide_agencies a ON gas.agency_id = a.id
                    WHERE gas.user_id = ? AND a.is_active = 1
                    ORDER BY a.name ASC
                `).bind(user.id).all();
                agencies = staffAgencies.results || [];
            }
        } catch (e) {
            console.log('[Auth] guide_agencies table may not exist yet, skipping:', e.message);
        }

        return createResponse({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                display_name: user.display_name,
                photo_url: user.photo_url,
                is_superadmin: isSuperAdmin,
                mfaEnabled: user.totp_enabled === 1,
                restaurants: restaurants,
                agencies: agencies
            }
        });
    } catch (error) {
        return createResponse(
            { success: false, message: 'Error interno del servidor' },
            500
        );
    }
}
async function handleRegister(request, env, userData) {
    // No hay registro público, y tampoco registro "por ser usuario cualquiera":
    // este endpoint crea una cuenta con el rol que se le pida en el restaurante
    // que se le pida, así que queda reservado a superadmin. El alta normal de
    // staff va por POST /restaurants/:id/users, que exige rol 'owner' en ESE
    // restaurante.
    if (userData.is_superadmin !== true) {
        return createResponse(
            { success: false, message: 'No autorizado' },
            403
        );
    }
    try {
        const { email, password, display_name, restaurant_id, role } = await request.json();
        if (!email || !password || !restaurant_id) {
            return createResponse(
                { success: false, message: 'Faltan datos requeridos' },
                400
            );
        }
        const policyError = validatePassword(password);
        if (policyError) {
            return createResponse({ success: false, message: policyError }, 400);
        }
        const existingUser = await env.DB.prepare(
            `SELECT id FROM users WHERE email = ? LIMIT 1`
        ).bind(email).first();
        if (existingUser) {
            return createResponse(
                { success: false, message: 'El usuario ya existe' },
                409
            );
        }
        // Hash password using Native Web Crypto
        const passwordHash = await hashPassword(password);
        const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await env.DB.prepare(`
      INSERT INTO users (id, email, display_name, password_hash, auth_provider, created_at)
      VALUES (?, ?, ?, ?, 'email', CURRENT_TIMESTAMP)
    `).bind(userId, email, display_name || email.split('@')[0], passwordHash).run();
        await env.DB.prepare(`
      INSERT INTO restaurant_staff (restaurant_id, user_id, role, is_active, created_at)
      VALUES (?, ?, ?, TRUE, CURRENT_TIMESTAMP)
    `).bind(restaurant_id, userId, role || 'staff').run();
        return createResponse({
            success: true,
            message: 'Usuario creado exitosamente',
            user: {
                id: userId,
                email,
                display_name: display_name || email.split('@')[0]
            }
        });
    } catch (error) {
        console.error('[Auth] Register error:', error);
        return createResponse(
            { success: false, message: 'Error interno del servidor' },
            500
        );
    }
}
async function handleChangePassword(request, env, userData) {
    try {
        const { currentPassword, newPassword } = await request.json();
        if (!currentPassword || !newPassword) {
            return createResponse(
                { success: false, message: 'Se requiere contraseña actual y nueva' },
                400
            );
        }
        const policyError = validatePassword(newPassword);
        if (policyError) {
            return createResponse({ success: false, message: policyError }, 400);
        }
        // Get current user and verify current password
        const user = await env.DB.prepare(`
            SELECT id, password_hash FROM users WHERE id = ? LIMIT 1
        `).bind(userData.userId).first();
        if (!user) {
            return createResponse(
                { success: false, message: 'Usuario no encontrado' },
                404
            );
        }
        // Verify current password
        const { valid } = await verifyPassword(currentPassword, user.password_hash);
        if (!valid) {
            return createResponse(
                { success: false, message: 'La contraseña actual es incorrecta' },
                401
            );
        }
        // Hash and save new password
        const newPasswordHash = await hashPassword(newPassword);
        await env.DB.prepare(`
            UPDATE users SET password_hash = ? WHERE id = ?
        `).bind(newPasswordHash, user.id).run();
        // Cambiar la contraseña invalida cualquier otra sesión abierta con la
        // antigua: si alguien más la tenía, deja de servirle en la siguiente
        // request.
        await revokeAllSessions(env, user.id);
        await logSecurityEvent(env, { type: 'password_changed', userId: user.id, request });
        console.log(`[Auth] Password changed for user ${userData.userId}`);
        return createResponse({
            success: true,
            message: 'Contraseña actualizada correctamente'
        });
    } catch (error) {
        console.error('[Auth] Change password error:', error);
        return createResponse(
            { success: false, message: 'Error interno del servidor' },
            500
        );
    }
}

/**
 * Cierra sesión revocando TODAS las sesiones de la cuenta (no solo la de este
 * dispositivo — ver la nota junto a `revokeAllSessions`). Antes, logout era
 * puramente del lado del cliente y el token de 7 días seguía sirviendo.
 */
async function handleLogout(request, env, userData) {
    try {
        await revokeAllSessions(env, userData.userId);
        await logSecurityEvent(env, { type: 'logout', userId: userData.userId, request });
        return createResponse({ success: true, message: 'Sesión cerrada' });
    } catch (error) {
        console.error('[Auth] Logout error:', error);
        return createResponse({ success: false, message: 'Error interno del servidor' }, 500);
    }
}

// ---------------------------------------------------------------------------
// MFA — endpoints
// ---------------------------------------------------------------------------

/** Paso 1 de la activación: genera un secreto SIN persistirlo todavía. */
async function handleMfaSetup(request, env, userData) {
    try {
        const user = await env.DB.prepare(`SELECT email, totp_enabled FROM users WHERE id = ? LIMIT 1`)
            .bind(userData.userId).first();
        if (!user) return createResponse({ success: false, message: 'Usuario no encontrado' }, 404);
        if (user.totp_enabled === 1) {
            return createResponse({ success: false, message: 'El MFA ya está activado' }, 409);
        }
        const secret = generateTotpSecret();
        return createResponse({
            success: true,
            secret,
            provisioningUri: buildTotpProvisioningUri(secret, user.email),
        });
    } catch (error) {
        console.error('[Auth] MFA setup error:', error);
        return createResponse({ success: false, message: 'Error interno del servidor' }, 500);
    }
}

/**
 * Paso 2: confirma que el secreto generado en el paso 1 funciona (el usuario
 * ha escaneado bien el QR) antes de guardarlo. Sin este paso, un secreto mal
 * escaneado dejaría al usuario fuera de su cuenta en el siguiente login.
 */
async function handleMfaEnable(request, env, userData) {
    try {
        const { secret, code } = await request.json();
        if (!secret || !code) {
            return createResponse({ success: false, message: 'Faltan secret o code' }, 400);
        }
        const ok = await verifyTotp(secret, code);
        if (!ok) {
            return createResponse({ success: false, message: 'Código incorrecto' }, 400);
        }
        const recoveryCodes = generateRecoveryCodes();
        const hashedCodes = await Promise.all(recoveryCodes.map(sha256Hex));
        await env.DB.prepare(`
            UPDATE users SET totp_secret = ?, totp_enabled = 1, totp_recovery_codes = ? WHERE id = ?
        `).bind(secret, JSON.stringify(hashedCodes), userData.userId).run();
        await logSecurityEvent(env, { type: 'mfa_enabled', userId: userData.userId, request });
        return createResponse({ success: true, recoveryCodes });
    } catch (error) {
        console.error('[Auth] MFA enable error:', error);
        return createResponse({ success: false, message: 'Error interno del servidor' }, 500);
    }
}

async function handleMfaDisable(request, env, userData) {
    try {
        const { password } = await request.json();
        const user = await env.DB.prepare(`SELECT password_hash FROM users WHERE id = ? LIMIT 1`)
            .bind(userData.userId).first();
        if (!user) return createResponse({ success: false, message: 'Usuario no encontrado' }, 404);

        const { valid } = await verifyPassword(password || '', user.password_hash);
        if (!valid) {
            return createResponse({ success: false, message: 'Contraseña incorrecta' }, 401);
        }
        await env.DB.prepare(`
            UPDATE users SET totp_secret = NULL, totp_enabled = 0, totp_recovery_codes = NULL WHERE id = ?
        `).bind(userData.userId).run();
        await logSecurityEvent(env, { type: 'mfa_disabled', userId: userData.userId, request });
        return createResponse({ success: true, message: 'MFA desactivado' });
    } catch (error) {
        console.error('[Auth] MFA disable error:', error);
        return createResponse({ success: false, message: 'Error interno del servidor' }, 500);
    }
}

/**
 * Completa el login cuando la cuenta tiene MFA: canjea el ticket emitido por
 * handleLogin junto con el código TOTP (o un código de recuperación).
 */
async function handleMfaVerify(request, env) {
    try {
        const { ticket, code } = await request.json();
        if (!ticket || !code) {
            return createResponse({ success: false, message: 'Faltan ticket o code' }, 400);
        }

        // El espacio de un código de 6 dígitos es pequeño (10^6): limitar
        // intentos por ticket es imprescindible, no una mejora opcional.
        const attemptKey = `ratelimit:mfa:${ticket}`;
        const attempts = await hitRateLimit(env, attemptKey, { limit: 5, windowSeconds: MFA_TICKET_TTL_SECONDS });
        if (!attempts.allowed) {
            return createResponse(
                { success: false, message: 'Demasiados intentos. Vuelve a iniciar sesión.' },
                429,
                request,
                { 'Retry-After': String(attempts.retryAfter) }
            );
        }

        const userId = await peekMfaTicket(env, ticket);
        if (!userId) {
            return createResponse({ success: false, message: 'Ticket inválido o caducado' }, 401);
        }

        const user = await env.DB.prepare(`
            SELECT id, email, display_name, photo_url, is_superadmin, token_version, totp_secret, totp_recovery_codes
            FROM users WHERE id = ? LIMIT 1
        `).bind(userId).first();
        if (!user || !user.totp_secret) {
            return createResponse({ success: false, message: 'Ticket inválido o caducado' }, 401);
        }

        let ok = await verifyTotp(user.totp_secret, code);
        let usedRecoveryCode = false;

        if (!ok && /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code)) {
            const codes = JSON.parse(user.totp_recovery_codes || '[]');
            const codeHash = await sha256Hex(code.toUpperCase());
            const idx = codes.findIndex((h) => timingSafeEqual(h, codeHash));
            if (idx !== -1) {
                ok = true;
                usedRecoveryCode = true;
                codes.splice(idx, 1);
                await env.DB.prepare(`UPDATE users SET totp_recovery_codes = ? WHERE id = ?`)
                    .bind(JSON.stringify(codes), user.id).run();
            }
        }

        if (!ok) {
            await logSecurityEvent(env, { type: 'mfa_challenge_failed', userId: user.id, request });
            return createResponse({ success: false, message: 'Código incorrecto' }, 401);
        }

        // Código válido: el ticket ya no debe poder reutilizarse.
        await consumeMfaTicket(env, ticket);

        const response = await buildAuthenticatedResponse(env, user);
        await logSecurityEvent(env, {
            type: 'login_success', userId: user.id, request,
            detail: usedRecoveryCode ? { mfa: 'recovery_code' } : { mfa: 'totp' },
        });
        return createResponse(response);
    } catch (error) {
        console.error('[Auth] MFA verify error:', error);
        return createResponse({ success: false, message: 'Error interno del servidor' }, 500);
    }
}
function createResponse(data, status = 200, request = null, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...getCorsHeaders(request), ...extraHeaders },
    });
}
// ===========================================================================
// MAIN HANDLER & EXPORTS
// ===========================================================================
/**
 * Handle authentication requests
 * @param {Request} request 
 * @param {Object} env 
 * @returns {Promise<Response>}
 */
/**
 * @param {Request} request
 * @param {Object} env
 * @param {Object|null} userData - resuelto por el guardia central de
 *        worker.js (JWT verificado + token_version comprobado). null en las
 *        rutas públicas (login, MFA verify, invitaciones).
 */
export async function handleAuthRequests(request, env, userData = null) {
    const url = new URL(request.url);
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: getCorsHeaders(request),
        });
    }

    // --- Rutas públicas ---
    if (url.pathname === '/auth/login' && request.method === 'POST') {
        return await handleLogin(request, env);
    }
    if (url.pathname === '/auth/mfa/verify' && request.method === 'POST') {
        return await handleMfaVerify(request, env);
    }
    const inviteAccept = url.pathname.match(/^\/auth\/invitations\/([^/]+)\/accept$/);
    if (inviteAccept && request.method === 'POST') {
        return await handleAcceptInvitation(request, env, inviteAccept[1]);
    }
    const inviteInspect = url.pathname.match(/^\/auth\/invitations\/([^/]+)$/);
    if (inviteInspect && request.method === 'GET') {
        return await handleGetInvitation(env, inviteInspect[1]);
    }

    // --- Rutas protegidas: exigen userData ya autenticado por el guardia central ---
    if (!userData) {
        // Defensivo: no debería ocurrir para estas rutas, porque worker.js ya
        // las excluye de PUBLIC_ROUTES. Cubre el default export de más abajo,
        // que es código muerto (no lo usa worker.js) pero se mantiene coherente.
        const protectedPaths = [
            '/auth/me', '/auth/register', '/auth/me/password', '/auth/logout',
            '/auth/mfa/setup', '/auth/mfa/enable', '/auth/mfa/disable',
        ];
        if (protectedPaths.includes(url.pathname)) {
            return createResponse({ success: false, message: 'No autorizado' }, 401);
        }
    }

    if (url.pathname === '/auth/me' && request.method === 'GET') {
        return await handleGetCurrentUser(env, userData);
    }
    if (url.pathname === '/auth/register' && request.method === 'POST') {
        return await handleRegister(request, env, userData);
    }
    if (url.pathname === '/auth/me/password' && request.method === 'PUT') {
        return await handleChangePassword(request, env, userData);
    }
    if (url.pathname === '/auth/logout' && request.method === 'POST') {
        return await handleLogout(request, env, userData);
    }
    if (url.pathname === '/auth/mfa/setup' && request.method === 'POST') {
        return await handleMfaSetup(request, env, userData);
    }
    if (url.pathname === '/auth/mfa/enable' && request.method === 'POST') {
        return await handleMfaEnable(request, env, userData);
    }
    if (url.pathname === '/auth/mfa/disable' && request.method === 'POST') {
        return await handleMfaDisable(request, env, userData);
    }
    return null; // Return null if not an auth request
}
// Export verifyJWT for use in other workers
export { verifyJWT };
export default {
    async fetch(request, env) {
        const response = await handleAuthRequests(request, env);
        return response || createResponse(
            { success: false, message: 'Endpoint no encontrado' },
            404
        );
    },
};