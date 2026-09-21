import type { CollectionKind } from '../lib/collections'

/**
 * Rutas de la app «Mirador». Menos que las de la clásica: la ficha de un
 * apartado de la casa ya no es una pantalla aparte, es la hoja de la derecha
 * de Guías rápidas (lista + hoja en una sola pantalla).
 */
export type MirRoute =
  | { name: 'home' }
  | { name: 'collection'; kind: CollectionKind }
  | { name: 'detail'; kind: CollectionKind; id: string }
  | { name: 'info' }
  | { name: 'wifi' }
  | { name: 'language' }

/** Nombre del evento `screen_view`: estable y legible en el panel de KPIs. */
export function screenName(route: MirRoute): string {
  return route.name === 'collection' || route.name === 'detail' ? `${route.name}:${route.kind}` : route.name
}
