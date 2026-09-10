/**
 * Etiquetas legibles de las categorías del guidebook.
 *
 * Este archivo mapeaba además cada categoría a un DEGRADADO propio, para las
 * tarjetas sin foto: una paleta de magentas y naranjas que no existía en
 * ninguna otra pantalla de la app. Se ha ido a components/NoPhoto.tsx, que usa
 * el degradado de la MARCA del anfitrión — el mismo gesto que ya usaban el
 * mosaico de inicio y Guías Rápidas. Lo que diferencia una tarjeta sin foto de
 * otra es su título y la fila en la que está, no un color inventado por
 * categoría; y con una guía sin fotos subidas, aquella paleta se comía la
 * pantalla entera.
 */

// Etiqueta legible para la cabecera de cada fila de categoría (pantalla de
// colección). El resto de la app TV no traduce su propio texto de UI a los 13
// idiomas (sólo el CONTENIDO viene traducido del backend, ver App.tsx/
// collections.ts) — aquí se sigue la misma convención: español fijo, con
// mayúscula inicial como fallback razonable para una categoría sin mapear.
const LABEL: Record<string, string> = {
  cultura: 'Cultura', naturaleza: 'Naturaleza', compras: 'Compras', playas: 'Playas',
  actividades: 'Actividades', transporte: 'Transporte', bienestar: 'Bienestar',
  relax: 'Bienestar', gastronomia: 'Gastronomía', restaurantes: 'Restaurantes', otro: 'Otros',
  beach: 'Playas', landmark: 'Cultura', nature: 'Naturaleza', food: 'Gastronomía',
  boat: 'Náutica', kayak: 'Náutica', shopping: 'Compras',
  // Agrupación de la Tienda (buildStore en collections.ts) — mismo criterio
  // host/platform que ya usa apps/guide (ServicesSection.tsx).
  store_host: 'Productos del anfitrión', store_platform: 'Productos locales',
}

export function categoryLabel(category?: string | null): string {
  const key = (category || '').trim().toLowerCase()
  if (!key) return 'Más recomendaciones'
  if (LABEL[key]) return LABEL[key]
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
}
