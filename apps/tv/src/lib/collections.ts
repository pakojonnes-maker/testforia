import type { GuidebookData } from './api'

/**
 * Normaliza las tres fuentes de recomendaciones del guidebook (restaurantes,
 * experiencias y POIs) a una sola forma, para que la pantalla de colección y
 * la de detalle sean UN componente cada una en vez de tres variantes.
 *
 * Lo que cambia entre las tres no es el layout, es la ACCIÓN: un restaurante
 * lleva a la carta Gravy, una experiencia a WhatsApp y un POI a Google Maps.
 * Eso queda encapsulado aquí en `qr`.
 */

// Carta digital "Gravy" (apps/client): experiencia táctil tipo Reels, por eso
// se delega al móvil con un QR en vez de navegarla desde la TV.
const MENU_URL = import.meta.env.VITE_MENU_URL || 'https://menu.visualtastes.com'

export type CollectionKind = 'eat' | 'do' | 'nearby'

export interface EntryQr {
  data: string
  /** Texto bajo el QR: dice QUÉ pasa al escanear, no "escanea el código". */
  caption: string
  /** Evento de KPI que corresponde a enseñar este QR. */
  event: 'menu_qr_shown' | 'booking_qr_shown'
}

export interface Entry {
  id: string
  kind: CollectionKind
  name: string
  /** Línea corta bajo el título: cocina, precio o categoría. */
  subtitle: string
  description: string
  image?: string
  /** Fotos adicionales para la galería del detalle, además de `image`. Real
   *  siempre: viene de guide_poi_media o de la portada, nunca inventada. */
  gallery: string[]
  /** Distintivo sobre la foto (Destacado). */
  badge?: string
  /**
   * El enlace de esta ficha es retribuido (afiliación) o su puesto está
   * pagado. Hay que decirlo donde el huésped lo vea: identificar la publicidad
   * es obligatorio (Directiva 2005/29/CE, anexo I.11), y en la TV no había
   * ningún aviso — sólo en la guía.
   */
  sponsored: boolean
  /** true = alimenta la fila "Destacados" de la colección en vez de su
   *  categoría. Restaurantes no tienen este concepto (siempre false): "Premium"
   *  ya es su distintivo, ver buildEat. */
  featured: boolean
  /** Chips de datos junto al título en el detalle. */
  facts: Array<{ icon: string; label: string }>
  qr?: EntryQr
  category?: string
  subcategory?: string | null
  /** Ficha de contacto del detalle — sólo restaurantes y guía (POI/experiencia)
   *  la rellenan; ninguno la tiene siempre completa, el detalle omite lo que
   *  falte en vez de mostrar un hueco. */
  address?: string | null
  phone?: string | null
  website?: string | null
  openingHours?: string | null
  /** Distancia/tiempo desde el alojamiento — sólo guía (POI/experiencia): un
   *  restaurante no tiene esto precalculado, ver workerGuide.js. */
  distanceText?: string | null
  travelTimeText?: string | null
  travelMode?: 'walk' | 'drive' | 'bike' | null
}

export interface Collection {
  kind: CollectionKind
  /** Etiqueta corta para las teselas del inicio. */
  tile: string
  title: string
  eyebrow: string
  /** Etiqueta de la fila cuando no hay categorías que agrupar (p.ej. "eat",
   *  donde todo es 'restaurant') — ver buildSections en CollectionScreen. */
  railLabel: string
  entries: Entry[]
}

function whatsappUrl(phone: string, message?: string): string {
  const digits = phone.replace(/[^+\d]/g, '')
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${digits}${text}`
}

/**
 * QR de reserva de una experiencia, sea cual sea el canal.
 *
 * Antes esto sólo miraba `action_type === 'whatsapp'` en minúsculas — y el
 * backend manda 'WHATSAPP' — así que NINGUNA experiencia enseñaba QR en la TV,
 * ni las de WhatsApp ni las de enlace web. El tipo llega ya resuelto por el
 * worker (si hay CTA secundario, es el secundario), así que aquí sólo hay que
 * traducirlo a algo escaneable.
 *
 * El caption dice qué pasa al escanear, no repite la etiqueta del botón: en la
 * TV no hay botón que etiquetar.
 */
function bookingQr(exp: GuidebookData['experiences'][number]): EntryQr | undefined {
  const data = (exp.action_data || '').trim()
  if (!data) return undefined

  switch (exp.action_type) {
    case 'WHATSAPP':
      return {
        data: whatsappUrl(data, exp.prefilled_message),
        caption: 'Escanea para reservar por WhatsApp',
        event: 'booking_qr_shown',
      }
    case 'URL':
      return {
        data,
        caption: 'Escanea para reservar en tu móvil',
        event: 'booking_qr_shown',
      }
    case 'PHONE':
      // Un QR `tel:` abre el marcador del móvil ya con el número puesto: en una
      // TV es más útil que enseñar los dígitos para que los copie a mano.
      return {
        data: `tel:${data.replace(/[^+\d]/g, '')}`,
        caption: 'Escanea para llamar y reservar',
        event: 'booking_qr_shown',
      }
    default:
      // COUPON no tiene destino que escanear.
      return undefined
  }
}

/**
 * Une portada + galería en una sola lista sin huecos ni duplicados: la
 * portada (cover_image_url) y la galería (guide_poi_media) son dos campos
 * independientes en el backend y a veces se pisan (la portada es también la
 * primera foto subida). "Siempre mostrar las fotos que tenemos" significa
 * esto: ninguna foto real se descarta, pero tampoco se repite la misma.
 */
function photoSet(cover: string | null | undefined, media?: Array<{ url: string }>): { image?: string; gallery: string[] } {
  const urls = [cover, ...(media || []).map(m => m.url)].filter((u): u is string => Boolean(u))
  const unique = Array.from(new Set(urls))
  return { image: unique[0], gallery: unique.slice(1) }
}

function buildEat(data: GuidebookData): Entry[] {
  return data.restaurants.map((r): Entry => ({
    id: r.id,
    kind: 'eat',
    name: r.name,
    subtitle: r.cuisine_type || 'Restaurante',
    description: r.description || '',
    image: r.cover_image || undefined,
    // Un restaurante delega su fotografía a la carta Gravy (QR abajo): ese es
    // el catálogo visual real, no un mosaico de fotos sueltas en la TV.
    gallery: [],
    // El tier real de guide_zone_restaurants es 'basic' | 'featured' (CHECK de
    // la tabla). Aquí se comparaba con 'premium', que no existe: ni el badge ni
    // la fila de destacados se activaban nunca. Ahora un restaurante destacado
    // sube a su propia fila, igual que una experiencia destacada.
    featured: r.tier === 'featured' || r.is_promoted === true,
    badge: r.tier === 'featured' ? 'Destacado' : undefined,
    sponsored: r.is_promoted === true,
    category: 'restaurant',
    // Sin tipo de cocina el antetítulo ya dice 'Restaurante'; repetirlo como
    // chip justo debajo sólo añade ruido.
    facts: [
      ...(r.cuisine_type ? [{ icon: '🍽️', label: r.cuisine_type }] : []),
      ...(r.tier === 'featured' ? [{ icon: '⭐', label: 'Selección del anfitrión' }] : []),
    ],
    address: [r.address, r.city].filter(Boolean).join(', ') || null,
    phone: r.phone || null,
    website: r.website || null,
    // La atribución va incrustada en el QR: sin `ref`/`apt` no se puede saber
    // que esa visita a la carta salió de esta TV, y el ROI de la pantalla
    // vuelve a ser inmedible.
    qr: r.slug
      ? {
          data: `${MENU_URL}/${r.slug}?ref=tv&apt=${encodeURIComponent(data.apartment.id)}`,
          caption: 'Escanea para ver la carta completa en tu móvil',
          event: 'menu_qr_shown',
        }
      : undefined,
  }))
}

function buildDo(data: GuidebookData): Entry[] {
  return data.experiences.map((e): Entry => {
    const { image, gallery } = photoSet(e.cover_image_url, e.media)
    return {
      id: e.id,
      kind: 'do',
      name: e.name,
      subtitle: e.price_display || e.category || 'Experiencia',
      description: e.description || '',
      image,
      gallery,
      // Una experiencia con el puesto pagado sube a la fila de destacados
      // igual que una destacada por criterio del anfitrión; lo que las
      // distingue es el aviso de publicidad, no la posición.
      featured: e.is_featured || e.is_promoted === true,
      badge: e.is_featured ? 'Destacado' : undefined,
      sponsored: e.cta_source === 'affiliate' || e.is_promoted === true,
      category: e.category,
      subcategory: e.service_subcategory,
      address: e.address || null,
      phone: e.phone || null,
      website: e.website_url || null,
      openingHours: e.opening_hours || null,
      distanceText: e.distance_text || null,
      travelTimeText: e.travel_time_text || null,
      travelMode: e.travel_mode || null,
      // El precio ya es el antetítulo de la ficha (y el pie de la tarjeta), así
      // que no se repite como chip: en el detalle salía dos veces seguidas.
      facts: [
        ...(e.category ? [{ icon: '🎟️', label: e.category }] : []),
        ...(e.duration_text ? [{ icon: '⏱️', label: e.duration_text }] : []),
      ],
      qr: bookingQr(e),
    }
  })
}

function buildNearby(data: GuidebookData): Entry[] {
  return data.pois.map((p): Entry => {
    const { image, gallery } = photoSet(p.cover_image_url, p.media)
    return {
      id: p.id,
      kind: 'nearby',
      name: p.name,
      subtitle: p.category || 'Lugar de interés',
      description: p.description || '',
      image,
      gallery,
      featured: p.is_featured === true || p.is_promoted === true,
      badge: p.is_featured ? 'Destacado' : undefined,
      sponsored: p.is_promoted === true,
      category: p.category,
      address: p.address || null,
      phone: p.phone || null,
      website: p.website_url || null,
      openingHours: p.opening_hours || null,
      distanceText: p.distance_text || null,
      travelTimeText: p.travel_time_text || null,
      travelMode: p.travel_mode || null,
      facts: p.category ? [{ icon: '📍', label: p.category }] : [],
      qr: p.google_maps_url
        ? {
            data: p.google_maps_url,
            caption: 'Escanea para abrir la ruta en tu móvil',
            // Abrir direcciones es intención de visita, igual que una reserva:
            // se cuenta con el mismo KPI para no inventar un tipo de evento que
            // el backend (workerTvScreen.js) no acepta.
            event: 'booking_qr_shown',
          }
        : undefined,
    }
  })
}

export function buildCollections(data: GuidebookData): Collection[] {
  return [
    {
      kind: 'eat',
      tile: 'Dónde comer',
      title: 'Dónde comer',
      eyebrow: 'Recomendaciones',
      railLabel: 'Recomendado por tu anfitrión',
      entries: buildEat(data),
    },
    {
      kind: 'do',
      tile: 'Qué hacer',
      title: 'Experiencias',
      eyebrow: 'Qué hacer',
      railLabel: 'Reservable desde tu móvil',
      entries: buildDo(data),
    },
    {
      kind: 'nearby',
      tile: 'Alrededores',
      title: 'Alrededores',
      eyebrow: 'Qué ver cerca',
      railLabel: 'Lugares de interés',
      entries: buildNearby(data),
    },
  ]
}

export function findCollection(collections: Collection[], kind: CollectionKind): Collection | undefined {
  return collections.find(c => c.kind === kind)
}
