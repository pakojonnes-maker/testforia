import eatDefault from '../assets/tiles/eat.webp'
import doDefault from '../assets/tiles/do.webp'
import storeDefault from '../assets/tiles/store.webp'
import infoDefault from '../assets/tiles/info.webp'
import backgroundDefault from '../assets/tiles/background.webp'

/**
 * Imágenes de las teselas del inicio y del fondo de pantalla.
 *
 * Por qué van EMPAQUETADAS y no por red: el shell de la TV vive dentro del APK
 * y arranca en el WiFi de un apartamento turístico, que es justo el momento en
 * que la red menos se puede dar por supuesta (ver CLAUDE.md §2). Una pantalla
 * de bienvenida cuyo aspecto depende de cinco descargas es una pantalla que a
 * veces se enciende gris. Vite las mete en el bundle con hash, así que salen
 * del disco local y están pintadas antes del primer fetch.
 *
 * Pesan 432 KB las cinco en WebP (los PNG originales eran 8,6 MB): a esa
 * escala caben en el APK sin discusión.
 */

/** Las cinco ranuras que el anfitrión puede sobrescribir desde el admin. */
export type TileSlot = 'eat' | 'do' | 'store' | 'info' | 'background'

export const TILE_SLOTS: TileSlot[] = ['eat', 'do', 'store', 'info', 'background']

export const DEFAULT_TILE_IMAGES: Record<TileSlot, string> = {
  eat: eatDefault,
  do: doDefault,
  store: storeDefault,
  info: infoDefault,
  background: backgroundDefault,
}

/** Overrides que llegan en `/guide/tv/config/:code` bajo `tv.tiles`. */
export type TileOverrides = Partial<Record<TileSlot, string | null>> | undefined

/**
 * Imagen efectiva de una ranura: override del anfitrión, o la de serie.
 *
 * Deliberadamente NO se cae a una foto sacada del contenido (la portada del
 * primer restaurante, la de la zona…), que es lo que hacía antes. Esas fotos
 * las elige el catálogo, no un diseñador: cada alojamiento pintaba un mosaico
 * distinto y a menudo con una foto de plato recortada por la mitad en la tesela
 * de "Tienda". Estas cinco están compuestas para el sitio que ocupan, y el
 * anfitrión que quiera las suyas las sube desde Pantalla TV.
 */
export function tileImage(slot: TileSlot, overrides: TileOverrides): string {
  const override = overrides?.[slot]
  return (typeof override === 'string' && override.trim()) || DEFAULT_TILE_IMAGES[slot]
}
