// workerVisitorHash.js — Identidad de visitante sin tocar el dispositivo
// ============================================================================
// POR QUÉ EXISTE
//
// Hasta ahora el guidebook identificaba al huésped con un UUID de 12 meses en
// localStorage (`vt_guide_visitor_id`) y, antes de eso, con una huella de
// dispositivo. Las dos cosas son almacenamiento/acceso en el terminal del
// usuario (art. 22.2 LSSI), así que exigían consentimiento — y el banner que lo
// pedía dejó la analítica prácticamente a cero: sin un "sí" explícito no se
// abría ni una sesión, y de ahí colgaba TODO (section views, intents, la
// tarjeta "Personas en el apartamento hoy").
//
// Este módulo es la alternativa: una identidad que se deriva EN EL SERVIDOR y
// que no escribe absolutamente nada en el móvil del huésped. Si no tocamos su
// terminal, el art. 22.2 no entra en juego y no hace falta pedir permiso para
// contar visitas.
//
// CÓMO SE MANTIENE ANÓNIMA (esto es el núcleo, no un detalle)
//
//   hash = SHA-256( salt_del_día || IP || User-Agent )
//
// El salt es ALEATORIO y vive en KV con un TTL de 48 h. Es deliberado que NO se
// derive de un secreto estable (algo como SHA-256(SECRET + fecha)): si el salt
// fuera recalculable, nosotros mismos podríamos reconstruir el hash de ayer
// para una IP dada y enlazar a la misma persona a lo largo del tiempo. Eso
// convertiría esto en un rastreador de 30 días disfrazado, y ya no sería
// medición anónima. Al ser aleatorio y caducar, el vínculo desaparece de verdad
// cuando el salt se va: ni nosotros podemos deshacerlo.
//
// LA CONSECUENCIA, DICHA CLARO: no se puede reconocer al mismo huésped en días
// distintos. `visit_count` ("ha vuelto 3 días") solo es real para quien haya
// dado su consentimiento explícito y tenga por tanto un visitor_id persistente.
// Es el precio de no pedir permiso, y es un precio que se paga a propósito.
// ============================================================================

import { getClientIp } from './workerAudit.js';

const SALT_KV_PREFIX = 'analytics:salt:';
// 48 h y no 24: cubre el día entero más el desfase entre la medianoche UTC con
// la que se calcula la clave y la medianoche local del huésped, sin dejar un
// hueco en el que el salt del día en curso ya no exista.
const SALT_TTL_SECONDS = 60 * 60 * 48;

// Caché por isolate. Evita una lectura de KV por request y, sobre todo, reduce
// la ventana en la que dos requests simultáneas generarían dos salts distintos
// para el mismo día (KV es eventualmente consistente: no hay compare-and-set).
const saltCache = new Map();

/** Día UTC en formato YYYY-MM-DD. Es la unidad de rotación del salt. */
export function utcDay(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

function randomSalt() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Salt del día, creado al vuelo la primera vez que se necesita.
 *
 * Si KV no está disponible se usa un salt aleatorio de este isolate: los
 * recuentos de visitantes únicos se inflan (cada isolate ve identidades
 * distintas), pero NUNCA se enlaza a nadie entre días. Preferimos un número
 * inexacto a romper en silencio la propiedad que justifica no pedir permiso.
 */
async function getDailySalt(env, day) {
    const cached = saltCache.get(day);
    if (cached) return cached;

    const key = `${SALT_KV_PREFIX}${day}`;
    try {
        let salt = await env.GUIDE_CACHE?.get(key);
        if (!salt) {
            salt = randomSalt();
            await env.GUIDE_CACHE?.put(key, salt, { expirationTtl: SALT_TTL_SECONDS });
        }
        if (salt) {
            saltCache.set(day, salt);
            return salt;
        }
    } catch (err) {
        console.error('[VisitorHash] KV no disponible, salt degradado:', err.message);
    }

    const fallback = randomSalt();
    saltCache.set(day, fallback);
    return fallback;
}

async function sha256Hex(input) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Identidad anónima del visitante para HOY.
 *
 * Se trunca a 32 caracteres hex (128 bits): de sobra para que no haya colisiones
 * en el volumen de un guidebook, y la mitad de bytes que guardar en D1.
 *
 * El hash NO incluye el apartamento a propósito. Tiene que ser el mismo valor
 * para el mismo dispositivo en la guía y en la carta del restaurante, porque es
 * justo lo que permite el join del mismo día en workerTracking.js (el huésped
 * ve el restaurante en la guía a mediodía y escanea el QR de la mesa por la
 * noche, sin ningún ?ref= en la URL).
 *
 * @returns {Promise<string|null>} null si no hay señales suficientes.
 */
export async function computeVisitorDayHash(request, env, day = utcDay()) {
    const ip = getClientIp(request);
    const ua = request.headers.get('User-Agent') || '';
    if (ip === 'unknown' && !ua) return null;

    const salt = await getDailySalt(env, day);
    const hash = await sha256Hex(`${salt}|${ip}|${ua}`);
    return hash.slice(0, 32);
}
