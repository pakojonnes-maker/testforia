// ===========================================================================
// ENVÍO DE EMAIL (Resend)
// ===========================================================================
// Sin RESEND_API_KEY configurado, sendEmail no falla: devuelve sent:false y
// quien llame debe mostrar el enlace para que el admin lo comparta a mano.
// Es peor que automatizarlo, pero sigue siendo mejor que lo que había antes
// (una contraseña en claro en la respuesta JSON) — así que no bloquea nada
// mientras no haya cuenta de Resend.
// ===========================================================================

/**
 * @param {Object} env
 * @param {{to:string, subject:string, html:string}} params
 * @returns {Promise<{sent:boolean, reason?:string}>}
 */
export async function sendEmail(env, { to, subject, html }) {
    if (!env.RESEND_API_KEY) {
        console.warn('[Email] RESEND_API_KEY no configurado; no se envía correo (modo manual)');
        return { sent: false, reason: 'no_api_key' };
    }
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: env.EMAIL_FROM || 'VisualTaste <onboarding@resend.dev>',
                to,
                subject,
                html,
            }),
        });
        if (!res.ok) {
            console.error('[Email] Resend respondió', res.status, await res.text());
            return { sent: false, reason: 'provider_error' };
        }
        return { sent: true };
    } catch (error) {
        console.error('[Email] Error enviando:', error.message);
        return { sent: false, reason: 'network_error' };
    }
}

export function invitationEmailHtml({ restaurantName, role, inviteUrl, isReset }) {
    const title = isReset ? 'Restablece tu contraseña' : `Te han invitado a ${restaurantName}`;
    const body = isReset
        ? `Alguien ha solicitado restablecer tu contraseña en VisualTaste. Si no has sido tú, ignora este correo.`
        : `Te han invitado a unirte a <strong>${restaurantName}</strong> como <strong>${role}</strong> en el panel de VisualTaste.`;
    return `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>${title}</h2>
            <p>${body}</p>
            <p><a href="${inviteUrl}" style="display:inline-block; padding:12px 20px; background:#111; color:#fff; text-decoration:none; border-radius:6px;">
                ${isReset ? 'Elegir nueva contraseña' : 'Aceptar invitación'}
            </a></p>
            <p style="color:#666; font-size:13px;">Este enlace caduca en 72 horas y solo puede usarse una vez.</p>
        </div>
    `;
}
