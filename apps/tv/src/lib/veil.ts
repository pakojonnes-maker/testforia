/**
 * Velo de PIE de una tarjeta con foto: opaco donde se apoya el texto y
 * transparente arriba, para que la foto se vea a plena saturación en la parte
 * que no lleva nada encima.
 *
 * Las paradas van en PÍXELES, no en porcentajes. Con porcentajes el velo se
 * estira con la tarjeta: en las cortas el antetítulo caía en la zona casi
 * transparente y desaparecía, y en las altas la foto salía apagada de arriba
 * abajo. Lo que hay que proteger es el TEXTO, y el texto siempre mide lo mismo
 * — así que el velo se ata a SU altura y no a la de la caja.
 *
 * `content` es el alto aproximado del bloque de texto en px de diseño. El velo
 * cubre hasta ahí y se disuelve en los 80 px siguientes.
 *
 * Vivía dentro de Tile.tsx (mosaico de inicio) y las tarjetas de catálogo
 * llevaban su propia versión en PORCENTAJES —el error que este comentario ya
 * describía—: con un 42 % sobre una tarjeta de 520 px, el velo se comía 218 px
 * de fotografía. Es la misma pieza, así que ahora es un solo sitio.
 */
export function bottomVeil(content: number): string {
  return `linear-gradient(0deg,
    rgba(4,16,22,0.94) 0px,
    rgba(4,16,22,0.86) ${Math.round(content * 0.55)}px,
    rgba(4,16,22,0.55) ${content}px,
    rgba(4,16,22,0.06) ${content + 80}px)`
}
