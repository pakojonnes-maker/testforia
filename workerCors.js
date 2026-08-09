// ===========================================================================
// CORS — origen único de la lista de dominios permitidos
// ===========================================================================
// Antes esta lista estaba duplicada en worker.js y workerAuthentication.js, y
// ya habían divergido: la de auth no incluía guide ni tv. Un solo sitio.
// ===========================================================================

export const ALLOWED_ORIGINS = [
    'https://admin.visualtastes.com',
    'https://menu.visualtastes.com',
    'https://visualtastes.com',
    'https://guide.visualtastes.com',
    'https://tv.visualtastes.com',
    'http://localhost:5173',   // dev cliente
    'http://localhost:5174',   // dev admin
    'http://localhost:5175',   // dev guide
    'http://localhost:5176',   // dev tv
    'http://localhost:5185',   // dev guide-verify (segunda instancia para sesiones paralelas, ver .claude/launch.json)
    'http://menu.localhost:5173',
    'http://admin.localhost:5174',
];

/**
 * Cabeceras CORS con el origen validado contra la allowlist.
 * Si el origen no está permitido se devuelve el primero de la lista, que no
 * casará con el del navegador y hará que este bloquee la respuesta.
 */
export function getCorsHeaders(request) {
    const origin = request?.headers?.get('Origin') || '';
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Vary': 'Origin',
    };
}
