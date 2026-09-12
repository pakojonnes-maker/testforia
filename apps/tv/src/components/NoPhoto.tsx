/**
 * Fondo de una tarjeta SIN fotografía.
 *
 * Ya existía como gesto —el degradado de la marca del anfitrión— en el mosaico
 * de inicio (PhotoTile) y en Guías Rápidas (InfoScreen/InfoDetailScreen). Lo
 * que NO seguía esa convención eran justo las dos pantallas de catálogo,
 * Colección y Ficha: sacaban el color de una paleta por CATEGORÍA propia
 * (categoryVisual.ts) con magentas y naranjas que no aparecen en ningún otro
 * sitio de la app.
 *
 * Eso se nota poco cuando hay fotos y muchísimo cuando no las hay, que es el
 * caso normal el día que se enseña una demo a una agencia: la Tienda de The
 * Host Edition no tiene subida NINGUNA foto (los 2 productos del catálogo
 * global nunca la tuvieron y los 6 del piso apuntan a claves de R2 que dan
 * 404), así que la pantalla entera se convertía en tres arcos magenta sobre
 * una pared encalada. La ausencia de foto no puede ser lo más llamativo de la
 * pantalla.
 *
 * El filete interior oscuro no es decorativo: estas tarjetas se pintan sobre el
 * FONDO DEL ANFITRIÓN, que puede ser una pared encalada o una foto nocturna, y
 * el borde de la tarjeta (--tv-line, blanco al 14 %) desaparece sobre fondo
 * claro. Con el filete la silueta existe siempre, venga el fondo que venga.
 */
/**
 * Tinte opcional: el color de la CATEGORÍA (guide_info_categories.color), que
 * usan las teselas de Guías Rápidas para que un apartado se distinga de otro
 * cuando ninguno tiene foto.
 *
 * Esos colores vienen sembrados con la paleta por defecto de Tailwind tal cual
 * —#2563EB, #16A34A, #7C3AED, #DC2626— y hasta ahora se pintaban a pelo. Sobre
 * una pared encalada, con tipografía Playfair y el acento dorado del anfitrión,
 * eso son cuatro carteles de colores primarios: la pantalla dejaba de parecer un
 * objeto de la casa. El tono es información útil (azul = llegadas, verde =
 * exterior), así que no se tira: se BAJA al registro del resto de la app
 * componiendo el color bajo la misma tinta del velo, que es lo que ya oscurece
 * las teselas que sí tienen fotografía. El resultado es el mismo azul, pero en
 * la luminosidad a la que vive todo lo demás.
 *
 * Se hace por composición de capas y no con color-mix() a propósito: esto se
 * pinta en el WebView de un Android TV barato, y color-mix() es reciente.
 */
function tintedGround(tint: string): string {
  return `linear-gradient(150deg, rgba(4,16,22,0.58) 0%, rgba(4,16,22,0.88) 100%), ${tint}`
}

export function NoPhoto({ tint, className = 'absolute inset-0' }: { tint?: string | null; className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: tint
          ? tintedGround(tint)
          : 'var(--tv-nophoto, linear-gradient(150deg, var(--tv-accent), var(--tv-secondary)))',
        boxShadow: 'inset 0 0 0 1px rgba(12, 42, 55, 0.18)',
      }}
    />
  )
}
