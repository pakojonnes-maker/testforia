// ===========================================================================
// AUTORIZACIÓN POR TENANT (restaurantes)
// ===========================================================================
// La autenticación (¿quién eres?) vive en workerAuthentication.js.
// Este módulo responde a la otra mitad: ¿puedes tocar ESTE restaurante?
//
// Principio: la fuente de verdad es `restaurant_staff` en D1, NO el claim
// `restaurants` del JWT. El token vive hasta 7 días; si echas a alguien de un
// restaurante, la expulsión tiene que surtir efecto en la request siguiente,
// no cuando le caduque el token.
// ===========================================================================

// Jerarquía de roles. Un 'owner' puede hacer todo lo de un 'manager', etc.
const ROLE_RANK = {
    staff: 1,
    manager: 2,
    owner: 3,
};

// Segmentos que ocupan la posición del identificador de restaurante en la URL
// pero NO son un identificador (rutas de búsqueda/listado).
const NON_TENANT_SEGMENTS = new Set(['by-slug']);

/**
 * Determina el acceso efectivo de un usuario a un restaurante.
 *
 * Resuelve el restaurante (los endpoints aceptan indistintamente id o slug) y
 * el rol del usuario en él con UNA sola consulta: este guardia corre en cada
 * request protegida, así que la latencia importa.
 *
 * @param {Object} env
 * @param {Object} userData - payload del JWT ya verificado
 * @param {string} slugOrId
 * @returns {Promise<{allowed: boolean, restaurantId: string|null, role: string|null, isSuperAdmin: boolean}>}
 */
export async function getRestaurantAccess(env, userData, slugOrId) {
    const isSuperAdmin = userData?.is_superadmin === true;
    const denied = { allowed: false, restaurantId: null, role: null, isSuperAdmin };

    if (!slugOrId) return denied;
    if (!isSuperAdmin && !userData?.userId) return denied;

    try {
        const row = await env.DB.prepare(`
            SELECT r.id AS restaurant_id, rs.role AS role
            FROM restaurants r
            LEFT JOIN restaurant_staff rs
                ON rs.restaurant_id = r.id
               AND rs.user_id = ?
               AND rs.is_active = TRUE
            WHERE r.id = ? OR r.slug = ?
            LIMIT 1
        `).bind(userData?.userId ?? '', slugOrId, slugOrId).first();

        // Restaurante inexistente: se trata igual que "sin acceso" para no dar
        // un oráculo de existencia a quien vaya probando ids.
        if (!row) return denied;

        if (isSuperAdmin) {
            return { allowed: true, restaurantId: row.restaurant_id, role: 'owner', isSuperAdmin: true };
        }
        if (!row.role) {
            return { allowed: false, restaurantId: row.restaurant_id, role: null, isSuperAdmin: false };
        }
        return { allowed: true, restaurantId: row.restaurant_id, role: row.role, isSuperAdmin: false };
    } catch (error) {
        console.error('[Authz] Error resolviendo acceso al restaurante:', error.message);
        // Ante un fallo de D1 se deniega. Nunca abrir por error.
        return denied;
    }
}

/**
 * ¿El rol concedido alcanza el mínimo exigido?
 */
export function roleSatisfies(role, minRole) {
    return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[minRole] ?? Infinity);
}

/**
 * Extrae el identificador de restaurante de la ruta, si lo hay.
 * Cubre `/restaurants/{x}/...` y `/api/restaurants/{x}/...`, que es como se
 * expresa el ámbito de tenant en todos los módulos del worker.
 * @returns {string|null}
 */
export function extractRestaurantRef(pathname) {
    const segs = pathname.split('/').filter(Boolean);
    let idx = -1;
    if (segs[0] === 'restaurants') idx = 1;
    else if (segs[0] === 'api' && segs[1] === 'restaurants') idx = 2;
    if (idx === -1) return null;

    const ref = segs[idx];
    if (!ref || NON_TENANT_SEGMENTS.has(ref)) return null;
    return ref;
}

// Rutas que llevan el restaurante (id o slug) en la URL pero no detrás de
// `/restaurants/`. Sin esta lista se colaban por las cuatro capas: ni son
// `/restaurants/{x}`, ni un recurso hijo, ni llevan restaurant_id en la query o
// el body, así que cualquier sesión válida podía cambiar la configuración de
// reservas o de delivery de otro restaurante, o leer sus pedidos (teléfono y
// dirección del cliente). Las variantes GET públicas de config no pasan por
// aquí: worker.js las atiende sin autenticar.
const TENANT_PATH_ROUTES = [
    // /reservations/config/{restaurante}
    (s) => (s[0] === 'reservations' && s[1] === 'config' && s.length === 3 ? s[2] : null),
    // /delivery/config|settings|translations/{restaurante}
    (s) => (s[0] === 'delivery' && ['config', 'settings', 'translations'].includes(s[1]) && s.length === 3 ? s[2] : null),
    // GET /delivery/orders/{restaurante} lista los pedidos. Con cuatro segmentos
    // (/delivery/orders/{pedido}/status) es un recurso hijo: lo resuelve la capa 2.
    (s) => (s[0] === 'delivery' && s[1] === 'orders' && s.length === 3 ? s[2] : null),
];

function extractTenantPathRef(pathname) {
    const segs = pathname.split('/').filter(Boolean);
    for (const match of TENANT_PATH_ROUTES) {
        const ref = match(segs);
        if (ref) return ref;
    }
    return null;
}

// ---------------------------------------------------------------------------
// SEGUNDA CAPA: recursos hijos sin restaurante en la URL
// ---------------------------------------------------------------------------
// Muchas rutas operan sobre un recurso por su id sin mencionar el restaurante
// (`PUT /dishes/{id}`, `DELETE /media/{id}`, `PATCH /api/campaigns/{id}`...).
// El guardia de ruta no puede verlas, así que aquí resolvemos el recurso a su
// restaurante propietario y reutilizamos la misma comprobación de pertenencia.
//
// `match` recibe los segmentos de la ruta ya troceados. Si devuelve un id, se
// consulta `sql` (que debe devolver una columna `restaurant_id`). Si la
// consulta no encuentra fila, se deja pasar: no es una ruta de recurso (p.ej.
// `/reservations/availability`) o el id no existe y el handler responderá 404.
const RESOURCE_ROUTES = [
    {
        name: 'dish',
        match: (s) => (s[0] === 'dishes' && s.length >= 2 ? s[1] : null),
        sql: `SELECT restaurant_id FROM dishes WHERE id = ? LIMIT 1`,
    },
    {
        name: 'menu',
        match: (s) => (s[0] === 'menus' && s.length >= 2 ? s[1] : null),
        sql: `SELECT restaurant_id FROM menus WHERE id = ? LIMIT 1`,
    },
    {
        name: 'section',
        match: (s) => (s[0] === 'sections' && s.length >= 2 ? s[1] : null),
        sql: `SELECT restaurant_id FROM sections WHERE id = ? LIMIT 1`,
    },
    {
        name: 'media',
        match: (s) => (s[0] === 'media' && s.length >= 2 && s[1] !== 'upload' ? s[1] : null),
        sql: `SELECT d.restaurant_id FROM dish_media dm
              JOIN dishes d ON dm.dish_id = d.id
              WHERE dm.id = ? LIMIT 1`,
    },
    {
        name: 'reservation',
        match: (s) => (s[0] === 'reservations' && s.length === 2 ? s[1] : null),
        sql: `SELECT restaurant_id FROM reservations WHERE id = ? LIMIT 1`,
    },
    {
        name: 'campaign',
        match: (s) => (s[0] === 'api' && s[1] === 'campaigns' && s.length >= 3 ? s[2] : null),
        sql: `SELECT restaurant_id FROM marketing_campaigns WHERE id = ? LIMIT 1`,
    },
    {
        name: 'landing-section',
        match: (s) =>
            s[0] === 'admin' && s[1] === 'landing' && s[2] === 'sections' && s.length >= 4
                ? s[3]
                : null,
        sql: `SELECT restaurant_id FROM restaurant_landing_sections WHERE id = ? LIMIT 1`,
    },
    {
        name: 'delivery-order',
        match: (s) => (s[0] === 'delivery' && s[1] === 'orders' && s.length === 4 ? s[2] : null),
        sql: `SELECT restaurant_id FROM delivery_orders WHERE id = ? LIMIT 1`,
    },
    {
        name: 'loyalty-card',
        match: (s) =>
            s[0] === 'api' && s[1] === 'loyalty' && s[2] === 'cards' && s.length >= 4
                ? s[3]
                : null,
        sql: `SELECT restaurant_id FROM loyalty_cards WHERE id = ? LIMIT 1`,
    },
];

/**
 * Resuelve el restaurante propietario del recurso al que apunta la ruta.
 * @returns {Promise<{kind: string, restaurantId: string}|null>}
 */
async function resolveResourceOwner(pathname, env) {
    const segs = pathname.split('/').filter(Boolean);
    for (const route of RESOURCE_ROUTES) {
        const id = route.match(segs);
        if (!id) continue;
        try {
            const row = await env.DB.prepare(route.sql).bind(id).first();
            if (row?.restaurant_id) {
                return { kind: route.name, restaurantId: row.restaurant_id };
            }
        } catch (error) {
            console.error(`[Authz] Error resolviendo ${route.name}:`, error.message);
            // Fallo de infraestructura sobre una ruta que SÍ es de recurso:
            // denegar antes que arriesgar. Se señala con un propietario
            // imposible, que nunca casará con ningún restaurante del usuario.
            return { kind: route.name, restaurantId: ' denied' };
        }
        // Coincide la forma de la ruta pero no hay recurso con ese id: no es
        // una ruta de recurso o el id no existe. Se deja al handler.
        return null;
    }
    return null;
}

/**
 * Guardia central de tenant. Se llama UNA vez en worker.js, después de
 * autenticar y antes de despachar a los handlers.
 *
 * Devuelve:
 *  - `{ scoped: false }` si la ruta no está dentro del ámbito de un restaurante.
 *  - `{ scoped: true, access }` si el usuario tiene acceso.
 *  - `{ scoped: true, denied: true, access }` si no lo tiene.
 *
 * Es responsabilidad de worker.js convertir `denied` en un 403.
 */
export async function checkRestaurantScope(request, env, userData) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Capa 1: el restaurante viaja en la ruta.
    const ref = extractRestaurantRef(pathname) ?? extractTenantPathRef(pathname);
    if (ref) {
        const access = await getRestaurantAccess(env, userData, ref);
        if (!access.allowed) return { scoped: true, denied: true, access };
        return { scoped: true, access };
    }

    // Capa 2: la ruta apunta a un recurso hijo; resolvemos su propietario.
    const owner = await resolveResourceOwner(pathname, env);
    if (owner) {
        const access = await getRestaurantAccess(env, userData, owner.restaurantId);
        if (!access.allowed) {
            return { scoped: true, denied: true, access, resource: owner.kind };
        }
        return { scoped: true, access, resource: owner.kind };
    }

    // Capa 3: el restaurante viaja en la query (`/analytics?restaurant_id=...`).
    const queryRef = url.searchParams.get('restaurant_id') || url.searchParams.get('restaurantId');
    if (queryRef) {
        const access = await getRestaurantAccess(env, userData, queryRef);
        if (!access.allowed) return { scoped: true, denied: true, access, via: 'query' };
        return { scoped: true, access, via: 'query' };
    }

    // Capa 4: el restaurante viaja en el body (`POST /dishes`,
    // `POST /api/notifications/send`). Solo se inspecciona en rutas protegidas
    // con cuerpo JSON, así que los endpoints públicos (reservas de cliente,
    // tracking, sellos de fidelidad) nunca pasan por aquí.
    const bodyRef = await extractBodyRestaurantRef(request);
    if (bodyRef) {
        const access = await getRestaurantAccess(env, userData, bodyRef);
        if (!access.allowed) return { scoped: true, denied: true, access, via: 'body' };
        return { scoped: true, access, via: 'body' };
    }

    return { scoped: false };
}

/**
 * Lee `restaurant_id` del cuerpo JSON sin consumirlo para los handlers.
 * Devuelve null ante cualquier cuerpo que no sea JSON parseable: este guardia
 * no debe romper una request por un content-type inesperado.
 */
async function extractBodyRestaurantRef(request) {
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'DELETE') {
        return null;
    }
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;

    try {
        const body = await request.clone().json();
        const ref = body?.restaurant_id ?? body?.restaurantId;
        return typeof ref === 'string' && ref ? ref : null;
    } catch {
        return null;
    }
}

/**
 * Guardia por endpoint, para elevar el mínimo de rol en operaciones sensibles
 * (gestión de staff, borrados). Se usa dentro de los handlers, que ya reciben
 * el `access` resuelto por el guardia central.
 *
 * @returns {string|null} mensaje de error si NO cumple, null si cumple
 */
export function requireRole(access, minRole) {
    if (!access?.allowed) return 'No tienes acceso a este restaurante';
    if (!roleSatisfies(access.role, minRole)) {
        return `Esta operación requiere rol '${minRole}' o superior`;
    }
    return null;
}

export { ROLE_RANK };
