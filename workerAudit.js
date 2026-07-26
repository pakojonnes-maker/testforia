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
