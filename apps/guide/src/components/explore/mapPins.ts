import L from 'leaflet';

interface PoiPinOptions {
  /** El número de su fila en la lista: la chincheta y la fila se reconocen por él. */
  number: number;
  isPaid: boolean;
  priceLabel?: string | null;
  selected?: boolean;
}

// Un precio va en la chincheta solo si es corto («45 €», «9,50 €»). «desde 23,90 €» o «15-25 € por persona»
// tapan media calle y se pisan entre sí en cuanto hay dos lugares cerca: en esos casos la chincheta de pago
// lleva el número, igual que las demás, y el precio se lee en el distintivo de su fila.
const MAX_PRICE_CHARS = 7;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/**
 * Chincheta del mapa, sin iconos: un círculo con el número del lugar; los de pago van en el color de acento
 * (con el precio dentro, en píldora, si es corto); el elegido se rellena con el primario de la agencia y lleva
 * un anillo.
 *
 * Los estilos viven en lugares.css (.vt-poi-pin*), no en clases de Tailwind dentro de esta cadena: el escáner
 * de Tailwind no ve de forma fiable los nombres que se montan dentro de un L.divIcon, y esos estilos deben
 * seguir el tema de la agencia (variables --g-*), que var() hace solo.
 */
export function createPoiPin({ number, isPaid, priceLabel, selected = false }: PoiPinOptions): L.DivIcon {
  const price = (priceLabel ?? '').trim();
  const hasPrice = isPaid && price.length > 0 && price.length <= MAX_PRICE_CHARS;
  const label = hasPrice ? price : String(number);
  const classes = ['vt-poi-pin', isPaid && 'vt-poi-pin--paid', hasPrice && 'vt-poi-pin--price', selected && 'vt-poi-pin--selected']
    .filter(Boolean)
    .join(' ');
  const height = selected ? 42 : 36;
  // El tamaño del icono lo manda Leaflet, no el contenido: la píldora crece con el precio, dentro de un tope.
  const width = hasPrice ? Math.min(96, Math.max(54, 26 + label.length * 8)) : height;

  return L.divIcon({
    className: 'vt-poi-pin-wrapper',
    html: `<div class="${classes}"><span class="vt-poi-pin-label"><bdi>${escapeHtml(label)}</bdi></span></div>`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height / 2],
  });
}

/** Dónde está el alojamiento: un arco de tinta con un punto de acento (colores en lugares.css, siguen a la agencia). */
export function homeIcon(): L.DivIcon {
  return L.divIcon({
    className: 'vt-poi-pin-wrapper',
    html: '<svg class="vt-home" viewBox="0 0 26 32" width="26" height="32" aria-hidden="true"><path d="M1 31 V13 A12 12 0 0 1 25 13 V31 Z"></path><circle cx="13" cy="17" r="4.2"></circle></svg>',
    iconSize: [26, 32],
    iconAnchor: [13, 16],
  });
}
