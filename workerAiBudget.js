// workerAiBudget.js — Presupuesto diario COMPARTIDO de Workers AI
// =====================================================
// El chat del guidebook (workerGuideAI.js) y el traductor
// (workerGuideTranslate.js) gastan de la misma bolsa: las 10.000 neuronas
// gratis al día de la cuenta. La cuenta está en Workers Free (comprobado el
// 2026-09-30), así que pasarse no cuesta dinero: Workers AI devuelve 3036 y
// ya. Este módulo existe para cortar ANTES y con reparto:
//
//   - Tope total: AI_DAILY_CAP (9.000). Deja 1.000 de margen para lo que se
//     cuenta tarde (el gasto real se sabe al terminar cada llamada).
//   - Chat: como mucho CHAT_DAILY_CAP (4.000, ~100 mensajes con Gemma 4) y
//     APARTMENT_DAILY_CAP por piso, para que uno solo no se lo lleve todo.
//   - Traductor: todo lo que el chat no use, menos una reserva mínima para el
//     chat (CHAT_RESERVE). Con el chat en calma, 7.500 neuronas: ~160 POIs
//     traducidos a los 12 idiomas. Mientras se dan de alta POIs, la traducción
//     es la que más gasta y no debe quedarse con un trozo fijo.
//
// Se guarda en D1 (tabla ai_usage_daily, migración 0096), no en KV: KV admite
// 1.000 escrituras/día en el plan Free para toda la cuenta y la caché de las
// guías también escribe ahí. El día es UTC, el mismo reloj con el que
// Cloudflare reinicia su cupo.
//
// Si D1 falla, se deja pasar: el corte de Cloudflare (3036) sigue detrás y no
// puede facturar. Quedarse sin chat por un fallo del contador sería peor.
// =====================================================

export const AI_DAILY_CAP = 9000;
export const CHAT_DAILY_CAP = 4000;
export const CHAT_RESERVE = 1500;
export const APARTMENT_DAILY_CAP = 1200;

/** Tarifas publicadas (workers-ai/platform/pricing), en neuronas por millón de tokens. */
export const MODEL_RATES = {
    '@cf/google/gemma-4-26b-a4b-it': { input: 9091, output: 27273 },
};

export function utcDay(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

export function secondsUntilUtcMidnight(date = new Date()) {
    const next = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
    return Math.ceil((next - date.getTime()) / 1000);
}

/**
 * Neuronas de una llamada según su `usage`. Workers AI ya devuelve la cifra
 * exacta en `usage.neurons` (modelos nuevos); si no, se calcula con tokens.
 * @returns {number|null} null si no hay datos para calcularlo.
 */
export function neuronsFromUsage(model, usage) {
    if (typeof usage?.neurons === 'number') return usage.neurons;
    const rates = MODEL_RATES[model];
    if (!rates || typeof usage?.prompt_tokens !== 'number' || typeof usage?.completion_tokens !== 'number') return null;
    return (usage.prompt_tokens * rates.input + usage.completion_tokens * rates.output) / 1_000_000;
}

export const chatApartmentScope = (apartmentId) => `chat:apt:${apartmentId}`;

/**
 * Gasto de hoy por ámbito.
 * @returns {Promise<Record<string, number>|null>} null si D1 no responde.
 */
export async function readUsage(env, scopes) {
    if (!env.DB) return null;
    try {
        const placeholders = scopes.map(() => '?').join(',');
        const rows = await env.DB.prepare(
            `SELECT scope, neurons FROM ai_usage_daily WHERE day = ? AND scope IN (${placeholders})`
        ).bind(utcDay(), ...scopes).all();
        const usage = Object.fromEntries(scopes.map(s => [s, 0]));
        for (const row of rows.results || []) usage[row.scope] = Number(row.neurons) || 0;
        return usage;
    } catch (err) {
        console.error('[AiBudget] No se pudo leer el gasto:', err.message);
        return null;
    }
}

/**
 * Suma gasto (puede ser negativo: corrección de una estimación).
 * @param {Array<{scope: string, neurons: number, calls?: number}>} entries
 */
export async function addUsage(env, entries) {
    const valid = entries.filter(e => e.scope && Number.isFinite(e.neurons) && (e.neurons !== 0 || e.calls));
    if (!env.DB || valid.length === 0) return;
    const day = utcDay();
    try {
        await env.DB.batch(valid.map(e => env.DB.prepare(`
            INSERT INTO ai_usage_daily (day, scope, neurons, calls) VALUES (?, ?, ?, ?)
            ON CONFLICT(day, scope) DO UPDATE SET
                neurons = neurons + excluded.neurons,
                calls = calls + excluded.calls
        `).bind(day, e.scope, e.neurons, e.calls ?? 0)));
    } catch (err) {
        console.error('[AiBudget] No se pudo apuntar el gasto:', err.message);
    }
}

/**
 * ¿Cabe un mensaje del chat que costará unas `estimate` neuronas?
 * @returns {Promise<{allowed: boolean, reason?: 'apartment'|'chat'|'total', tracked: boolean}>}
 */
export async function checkChatBudget(env, apartmentId, estimate) {
    const aptScope = chatApartmentScope(apartmentId);
    const usage = await readUsage(env, ['chat', 'translate', aptScope]);
    if (!usage) return { allowed: true, tracked: false };
    if (usage[aptScope] + estimate > APARTMENT_DAILY_CAP) return { allowed: false, reason: 'apartment', tracked: true };
    if (usage.chat + estimate > CHAT_DAILY_CAP) return { allowed: false, reason: 'chat', tracked: true };
    if (usage.chat + usage.translate + estimate > AI_DAILY_CAP) return { allowed: false, reason: 'total', tracked: true };
    return { allowed: true, tracked: true };
}

/**
 * Presupuesto del traductor para hoy: lo que queda del total una vez apartado
 * lo que ya ha gastado el chat, o su reserva si ha gastado menos.
 * @returns {Promise<{limit: number, spent: number, remaining: number, resetsIn: number, tracked: boolean}>}
 */
export async function readTranslateBudget(env) {
    const resetsIn = secondsUntilUtcMidnight();
    const usage = await readUsage(env, ['chat', 'translate']);
    if (!usage) {
        const limit = AI_DAILY_CAP - CHAT_RESERVE;
        return { limit, spent: 0, remaining: limit, resetsIn, tracked: false };
    }
    const limit = AI_DAILY_CAP - Math.max(usage.chat, CHAT_RESERVE);
    return { limit, spent: usage.translate, remaining: Math.max(0, limit - usage.translate), resetsIn, tracked: true };
}
