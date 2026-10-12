// ===========================================================================
// LOG DE AUDITORÍA DE SEGURIDAD
// ===========================================================================
// Escritura best-effort: un fallo al registrar un evento NUNCA debe romper la
// operación real (un login que triunfa no puede fallar porque el INSERT del
// log falle). Por eso cada llamada va envuelta en try/catch interno y no
// propaga errores.
//
// No sustituye a `wrangler tail` ni a los logs de Cloudflare (efímeros): esta
// tabla es la fuente de verdad para reconstruir qué pasó con una cuenta,
// necesaria para responder a un incidente (RGPD Art. 33 exige poder hacerlo).
// ===========================================================================

/**
 * IP del cliente. CF-Connecting-IP es la que pone Cloudflare y no se puede
 * falsear desde fuera del edge; X-Forwarded-For es el fallback para entornos
 * sin ese header (dev local).
 */
export function getClientIp(request) {
    return request.headers.get('CF-Connecting-IP')
        || request.headers.get('X-Forwarded-For')?.split(',')[0].trim()
        || 'unknown';
}

/**
 * @param {Object} env
 * @param {Object} params
 * @param {string} params.type - p.ej. 'login_success', 'login_failed', 'password_changed'
 * @param {string|null} [params.userId]
 * @param {string|null} [params.targetUserId] - cuando la acción es sobre otra cuenta
 * @param {string|null} [params.restaurantId]
 * @param {Request|null} [params.request] - para extraer IP y User-Agent
 * @param {Object|null} [params.detail] - contexto adicional, se guarda como JSON
 */
export async function logSecurityEvent(env, { type, userId = null, targetUserId = null, restaurantId = null, request = null, detail = null }) {
    if (!env.DB) return;
    try {
        const id = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const ip = request ? getClientIp(request) : null;
        const userAgent = request?.headers?.get('User-Agent') ?? null;
        await env.DB.prepare(`
            INSERT INTO security_audit_log
                (id, event_type, user_id, target_user_id, restaurant_id, ip, user_agent, detail)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id, type, userId, targetUserId, restaurantId, ip, userAgent,
            detail ? JSON.stringify(detail) : null
        ).run();
    } catch (error) {
        console.error('[Audit] Error registrando evento:', error.message);
    }
}

/**
 * Eventos recientes de una IP, del más antiguo al más nuevo. Es lo que cuentan
 * los límites de intentos de las rutas públicas (login, PIN de sellos): el fallo
 * ya se escribe aquí para poder investigarlo, así que contarlo no cuesta ninguna
 * escritura más. Antes cada intento gastaba una de KV, y con el cupo agotado el
 * límite dejaba pasar.
 *
 * Si D1 falla devuelve una lista vacía: un límite que no se puede comprobar no
 * debe dejar a nadie fuera de su panel.
 *
 * @param {string[]} types - valores de event_type
 * @returns {Promise<Array<{type: string, restaurantId: string|null, detail: Object|null, at: number}>>}
 */
export async function recentEventsByIp(env, ip, types, windowSeconds) {
    if (!env.DB || !ip || !types.length) return [];
    // Mismo formato que CURRENT_TIMESTAMP ('YYYY-MM-DD HH:MM:SS', UTC).
    const since = new Date(Date.now() - windowSeconds * 1000).toISOString().slice(0, 19).replace('T', ' ');
    try {
        const { results } = await env.DB.prepare(`
            SELECT event_type, restaurant_id, detail, created_at
            FROM security_audit_log
            WHERE ip = ? AND created_at > ? AND event_type IN (${types.map(() => '?').join(', ')})
            ORDER BY created_at DESC, rowid DESC
            LIMIT 200
        `).bind(ip, since, ...types).all();
        return (results || []).reverse().map((row) => {
            let detail = null;
            try { detail = row.detail ? JSON.parse(row.detail) : null; } catch { /* detalle ilegible: se ignora */ }
            return {
                type: row.event_type,
                restaurantId: row.restaurant_id ?? null,
                detail,
                at: Date.parse(`${String(row.created_at).replace(' ', 'T')}Z`),
            };
        });
    } catch (error) {
        console.error('[Audit] Error leyendo eventos recientes:', error.message);
        return [];
    }
}
