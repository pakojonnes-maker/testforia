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
export function NoPhoto({ className = 'absolute inset-0' }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--tv-nophoto, linear-gradient(150deg, var(--tv-accent), var(--tv-secondary)))',
        boxShadow: 'inset 0 0 0 1px rgba(12, 42, 55, 0.18)',
      }}
    />
  )
}
