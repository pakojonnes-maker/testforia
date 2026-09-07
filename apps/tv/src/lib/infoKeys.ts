/**
 * Utilidades sobre las CLAVES de los apartados de información de la casa.
 *
 * Este archivo se llamaba `infoIcon.ts` y contenía un mapa de ~80 emoji
 * (icono/clave → 🔑, 📶, 🅿️…) que se pintaba como imagen de respaldo de cada
 * apartado, hasta a 144 px en la ficha. Se quitó entero, junto con el resto de
 * la iconografía de la app:
 *
 *  · Era redundante. Cada emoji vivía pegado a una etiqueta que ya decía lo
 *    mismo, y a 3 m lo que se lee es la etiqueta.
 *  · Era frágil. Es el mismo motivo por el que las banderas de idioma se
 *    sirven como SVG y no como emoji (ver lib/languages.ts): muchas builds de
 *    TV Android y de Fire OS traen NotoColorEmoji incompleto o no lo traen. El
 *    fallo no era un icono feo, era un cuadrado de tofu de 144 px presidiendo
 *    la ficha. Y algunos eran secuencias ZWJ (👨‍🍳), que se parten aún antes.
 *
 * El respaldo sin foto es ahora el degradado del color de la categoría, que es
 * lo que PhotoTile ya hacía en el mosaico de inicio y se lee bien.
 */

/** ¿Este apartado es el código de entrada? Decide si el inicio le da tesela propia. */
export function isDoorCode(key?: string): boolean {
  return /entry|door|codigo|código/i.test(key || '')
}
