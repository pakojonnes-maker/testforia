// ===========================================================================
// CLOUDFLARE WORKER - AUTHENTICATION API (Zero-Dependency Version)
// ===========================================================================
// Secure authentication worker for VisualTaste admin panel
// Uses native Web Crypto API (PBKDF2) for password hashing
// No external dependencies required - Copy & Paste ready
// ===========================================================================

// ===========================================================================
// CONFIGURATION
// ===========================================================================

const JWT_SECRET = 'YOUR_SECRET_KEY_HERE_CHANGE_IN_PRODUCTION'; // ⚠️ CHANGE THIS!
const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRATION = '7d'; // 7 days

// Password Hashing Configuration
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_SALT_SIZE = 16;
const PBKDF2_HASH_ALGO = 'SHA-256';

// ===========================================================================
// PASSWORD UTILITIES (Native Web Crypto)
// ===========================================================================

/**
 * Hash a password using PBKDF2
 * @param {string} password 
 * @returns {Promise<string>} Format: "salt_hex:hash_hex"
 */
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_SIZE));
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
            iterations: PBKDF2_ITERATIONS,
            hash: PBKDF2_HASH_ALGO
        },
        keyMaterial,
        256
    );

    return `${buf2hex(salt)}:${buf2hex(hash)}`;
}

/**
 * Verify a password against a stored hash
 * @param {string} password - Plain text password
 * @param {string} storedHash - Format: "salt_hex:hash_hex"
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, storedHash) {
    const [saltHex, originalHashHex] = storedHash.split(':');
    if (!saltHex || !originalHashHex) return false;

    const salt = hex2buf(saltHex);
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
            iterations: PBKDF2_ITERATIONS,
            hash: PBKDF2_HASH_ALGO
        },
        keyMaterial,
        256
    );

    const newHashHex = buf2hex(hash);
    return newHashHex === originalHashHex;
}

function buf2hex(buffer) {
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}

function hex2buf(hex) {
    return new Uint8Array(
        hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
    );
}

// ===========================================================================
// JWT UTILITIES
// ===========================================================================

async function generateJWT(payload, secret) {
    const header = { alg: JWT_ALGORITHM, typ: 'JWT' };
    const expirationTime = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
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
        if (signature !== expectedSignature) return null;

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
    if (typeof data === 'string') base64 = btoa(data);
    else {
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
// AUTHENTICATION MIDDLEWARE
// ===========================================================================

async function authenticateRequest(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    return await verifyJWT(token, JWT_SECRET);
}

// ===========================================================================
// ENDPOINT HANDLERS
// ===========================================================================

async function handleLogin(request, env) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return createResponse({ success: false, message: 'Email y contraseña son requeridos' }, 400);
        }

        const user = await env.DB.prepare(`
      SELECT id, email, display_name, password_hash, photo_url
      FROM users WHERE email = ? LIMIT 1
    `).bind(email).first();

        if (!user) {
            return createResponse({ success: false, message: 'Credenciales inválidas' }, 401);
        }

        // Verify password using Native Web Crypto
        const isValidPassword = await verifyPassword(password, user.password_hash);
        if (!isValidPassword) {
            return createResponse({ success: false, message: 'Credenciales inválidas' }, 401);
        }

        const restaurants = await env.DB.prepare(`
      SELECT r.id, r.name, r.slug, rs.role
      FROM restaurant_staff rs
      JOIN restaurants r ON rs.restaurant_id = r.id
      WHERE rs.user_id = ? AND rs.is_active = TRUE
      ORDER BY r.name ASC
    `).bind(user.id).all();

        const token = await generateJWT({
            userId: user.id,
            email: user.email,
            restaurants: restaurants.results.map(r => r.id)
        }, JWT_SECRET);

        await env.DB.prepare(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`).bind(user.id).run();

        return createResponse({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                display_name: user.display_name,
                photo_url: user.photo_url,
                restaurants: restaurants.results
            }
        });

    } catch (error) {
        console.error('[Auth] Login error:', error);
        return createResponse({ success: false, message: 'Error interno del servidor' }, 500);
    }
}

async function handleGetCurrentUser(request, env) {
    const userData = await authenticateRequest(request);
    if (!userData) return createResponse({ success: false, message: 'No autorizado' }, 401);

    try {
        const user = await env.DB.prepare(`
      SELECT id, email, display_name, photo_url
      FROM users WHERE id = ? LIMIT 1
    `).bind(userData.userId).first();

        if (!user) return createResponse({ success: false, message: 'Usuario no encontrado' }, 404);

        const restaurants = await env.DB.prepare(`
      SELECT r.id, r.name, r.slug, rs.role
      FROM restaurant_staff rs
      JOIN restaurants r ON rs.restaurant_id = r.id
      WHERE rs.user_id = ? AND rs.is_active = TRUE
      ORDER BY r.name ASC
    `).bind(user.id).all();

        return createResponse({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                display_name: user.display_name,
                photo_url: user.photo_url,
                restaurants: restaurants.results
            }
        });

    } catch (error) {
        return createResponse({ success: false, message: 'Error interno del servidor' }, 500);
    }
}

async function handleRegister(request, env) {
    const userData = await authenticateRequest(request);
    if (!userData) return createResponse({ success: false, message: 'No autorizado' }, 401);

    try {
        const { email, password, display_name, restaurant_id, role } = await request.json();

        if (!email || !password || !restaurant_id) {
            return createResponse({ success: false, message: 'Faltan datos requeridos' }, 400);
        }

        const existingUser = await env.DB.prepare(`SELECT id FROM users WHERE email = ? LIMIT 1`).bind(email).first();
        if (existingUser) return createResponse({ success: false, message: 'El usuario ya existe' }, 409);

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
            user: { id: userId, email, display_name: display_name || email.split('@')[0] }
        });

    } catch (error) {
        console.error('[Auth] Register error:', error);
        return createResponse({ success: false, message: 'Error interno del servidor' }, 500);
    }
}

function createResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            const signatureInput = `${encodedHeader}.${encodedPayload}`;

            const expectedSignature = await signHMAC(signatureInput, secret);
            if(signature !== expectedSignature) return null;

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
    if (typeof data === 'string') base64 = btoa(data);
    else {
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
// AUTHENTICATION MIDDLEWARE
// ===========================================================================

async function authenticateRequest(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    return await verifyJWT(token, JWT_SECRET);
}

// ===========================================================================
// ENDPOINT HANDLERS
// ===========================================================================

async function handleLogin(request, env) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return createResponse({ success: false, message: 'Email y contraseña son requeridos' }, 400);
        }

        const user = await env.DB.prepare(`
      SELECT id, email, display_name, password_hash, photo_url
      FROM users WHERE email = ? LIMIT 1
    `).bind(email).first();

        if (!user) {
            return createResponse({ success: false, message: 'Credenciales inválidas' }, 401);
        }

        // Verify password using Native Web Crypto
        const isValidPassword = await verifyPassword(password, user.password_hash);
        if (!isValidPassword) {
            return createResponse({ success: false, message: 'Credenciales inválidas' }, 401);
        }

        const restaurants = await env.DB.prepare(`
      SELECT r.id, r.name, r.slug, rs.role
      FROM restaurant_staff rs
      JOIN restaurants r ON rs.restaurant_id = r.id
      WHERE rs.user_id = ? AND rs.is_active = TRUE
      ORDER BY r.name ASC
    `).bind(user.id).all();

        const token = await generateJWT({
            userId: user.id,
            email: user.email,
            restaurants: restaurants.results.map(r => r.id)
        }, JWT_SECRET);

        await env.DB.prepare(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`).bind(user.id).run();

        return createResponse({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                display_name: user.display_name,
                photo_url: user.photo_url,
                restaurants: restaurants.results
            }
        });

    } catch (error) {
        console.error('[Auth] Login error:', error);
        return createResponse({ success: false, message: 'Error interno del servidor' }, 500);
    }
}

async function handleGetCurrentUser(request, env) {
    const userData = await authenticateRequest(request);
    if (!userData) return createResponse({ success: false, message: 'No autorizado' }, 401);

    try {
        const user = await env.DB.prepare(`
      SELECT id, email, display_name, photo_url
      FROM users WHERE id = ? LIMIT 1
    `).bind(userData.userId).first();

        if (!user) return createResponse({ success: false, message: 'Usuario no encontrado' }, 404);

        const restaurants = await env.DB.prepare(`
      SELECT r.id, r.name, r.slug, rs.role
      FROM restaurant_staff rs
      JOIN restaurants r ON rs.restaurant_id = r.id
      WHERE rs.user_id = ? AND rs.is_active = TRUE
      ORDER BY r.name ASC
    `).bind(user.id).all();

        return createResponse({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                display_name: user.display_name,
                photo_url: user.photo_url,
                restaurants: restaurants.results
            }
        });

    } catch (error) {
        return createResponse({ success: false, message: 'Error interno del servidor' }, 500);
    }
}

async function handleRegister(request, env) {
    const userData = await authenticateRequest(request);
    if (!userData) return createResponse({ success: false, message: 'No autorizado' }, 401);

    try {
        const { email, password, display_name, restaurant_id, role } = await request.json();

        if (!email || !password || !restaurant_id) {
            return createResponse({ success: false, message: 'Faltan datos requeridos' }, 400);
        }

        const existingUser = await env.DB.prepare(`SELECT id FROM users WHERE email = ? LIMIT 1`).bind(email).first();
        if (existingUser) return createResponse({ success: false, message: 'El usuario ya existe' }, 409);

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
            user: { id: userId, email, display_name: display_name || email.split('@')[0] }
        });

    } catch (error) {
        console.error('[Auth] Register error:', error);
        return createResponse({ success: false, message: 'Error interno del servidor' }, 500);
    }
}

function createResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
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
export async function handleAuthRequests(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    if (url.pathname === '/auth/login' && request.method === 'POST') return await handleLogin(request, env);
    if (url.pathname === '/auth/me' && request.method === 'GET') return await handleGetCurrentUser(request, env);
    if (url.pathname === '/auth/register' && request.method === 'POST') return await handleRegister(request, env);

    return null; // Return null if not an auth request, allowing other workers to handle it
}

// Export verifyJWT for use in other workers
export { verifyJWT };

export default {
    async fetch(request, env) {
        const response = await handleAuthRequests(request, env);
        return response || createResponse({ success: false, message: 'Endpoint no encontrado' }, 404);
    },
};
