// workerMediaUrl.js — fotos y vídeos por el dominio propio de R2
// ============================================
// Cada foto, cada vídeo y cada trozo de vídeo que pide un huésped pasaba por
// este worker (`/media/<clave>`, workerMedia.js): una petición de las 100.000
// diarias del plan Free y una lectura de R2 por archivo, sin caché de CDN.
// Conectando el bucket a un dominio propio (env.MEDIA_BASE_URL, p. ej.
// https://media.visualtastes.com) los sirve Cloudflare directamente, cacheados
// en el borde, y el worker no interviene.
//
// La reescritura se hace AL SALIR, sobre el JSON ya serializado, y no donde se
// construye cada URL:
//   - coge también las URLs absolutas guardadas en la base (portadas, logos,
//     teselas de la tele), que nacieron con el origen del worker dentro;
//   - lo cacheado en KV se queda como estaba, así que poner o quitar la variable
//     surte efecto en el mismo deploy, sin esperar 24 h ni invalidar nada.
//
// `/media/` sigue vivo y sin cambios: lo usan el panel, los APK ya instalados y
// todo lo que cuelga de System/ (iconos, banderas, alérgenos), que se subió a
// mano y cuyo tipo de contenido solo está garantizado al servirlo desde aquí.
// ============================================

/** El dominio de media, sin barra final. Solo https y sin ruta: cualquier otra cosa se ignora. */
function mediaBase(env) {
    const raw = typeof env?.MEDIA_BASE_URL === 'string' ? env.MEDIA_BASE_URL.trim().replace(/\/+$/, '') : '';
    if (!raw) return null;
    if (!/^https:\/\/[a-z0-9.-]+$/i.test(raw)) {
        // Un valor mal escrito rompería todas las imágenes de todas las guías a la vez.
        console.warn('[Media] MEDIA_BASE_URL no es un origen https válido; se ignora');
        return null;
    }
    return raw;
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Cambia `<origin>/media/<clave>` por `<MEDIA_BASE_URL>/<clave>` en un JSON ya
 * serializado. Sin la variable devuelve el texto tal cual.
 *
 * @param {string} origin - el origen de este worker en la petición (url.origin)
 * @param {string} json
 */
export function publicMediaUrls(env, origin, json) {
    const base = mediaBase(env);
    if (!base || !origin || typeof json !== 'string') return json;
    return json.replace(new RegExp(`${escapeRegExp(origin)}/media/(?!System/)`, 'g'), `${base}/`);
}
