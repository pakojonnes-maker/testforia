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
  /** Distintivo sobre la foto (Premium / Destacado). */
  badge?: string
  /** Chips de datos junto al título en el detalle. */
  facts: Array<{ icon: string; label: string }>
  qr?: EntryQr
  category?: string
  subcategory?: string | null
}

export interface Collection {
  kind: CollectionKind
  /** Etiqueta corta para las teselas del inicio. */
  tile: string
  title: string
  eyebrow: string
  intro: string
  /** Título de la fila de tarjetas: es lo que VISTO llama "Host Suggestions". */
  railLabel: string
  entries: Entry[]
}

function whatsappUrl(phone: string, message?: string): string {
  const digits = phone.replace(/[^+\d]/g, '')
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${digits}${text}`
}

function buildEat(data: GuidebookData): Entry[] {
  return data.restaurants.map((r): Entry => ({
    id: r.id,
    kind: 'eat',
    name: r.name,
    subtitle: r.cuisine_type || 'Restaurante',
    description: '',
    image: r.cover_image || undefined,
    badge: r.tier === 'premium' ? 'Premium' : undefined,
    category: 'restaurant',
    // Sin tipo de cocina el antetítulo ya dice 'Restaurante'; repetirlo como
    // chip justo debajo sólo añade ruido.
    facts: [
      ...(r.cuisine_type ? [{ icon: '🍽️', label: r.cuisine_type }] : []),
      ...(r.tier === 'premium' ? [{ icon: '⭐', label: 'Selección del anfitrión' }] : []),
    ],
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
    const phone = e.action_type === 'whatsapp' ? e.action_data : null
    return {
      id: e.id,
      kind: 'do',
      name: e.name,
      subtitle: e.price_display || e.category || 'Experiencia',
      description: e.description || '',
      image: e.cover_image_url || undefined,
      badge: e.is_featured ? 'Destacado' : undefined,
      category: e.category,
      subcategory: e.service_subcategory,
      // El precio ya es el antetítulo de la ficha (y el pie de la tarjeta), así
      // que no se repite como chip: en el detalle salía dos veces seguidas.
      facts: e.category ? [{ icon: '🎟️', label: e.category }] : [],
      qr: phone
        ? {
            data: whatsappUrl(phone, e.prefilled_message),
            caption: e.cta_label || 'Escanea para reservar por WhatsApp',
            event: 'booking_qr_shown',
          }
        : undefined,
    }
  })
}

function buildNearby(data: GuidebookData): Entry[] {
  return data.pois.map((p): Entry => ({
    id: p.id,
    kind: 'nearby',
    name: p.name,
    subtitle: p.category || 'Lugar de interés',
    description: p.description || '',
    image: p.media?.[0]?.url,
    category: p.category,
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
  }))
}

export function buildCollections(data: GuidebookData): Collection[] {
  const zone = data.zone?.name || 'la zona'
  return [
    {
      kind: 'eat',
      tile: 'Dónde comer',
      title: 'Dónde comer',
      eyebrow: 'Recomendaciones',
      intro: `Los sitios que recomendamos de verdad en ${zone}. Escanea el código de cualquiera para abrir su carta en el móvil antes de salir de casa.`,
      railLabel: 'Recomendado por tu anfitrión',
      entries: buildEat(data),
    },
    {
      kind: 'do',
      tile: 'Qué hacer',
      title: 'Qué hacer',
      eyebrow: 'Experiencias',
      intro: data.zone?.description || `Planes y experiencias reservables cerca de ${zone}.`,
      railLabel: 'Reservable desde tu móvil',
      entries: buildDo(data),
    },
    {
      kind: 'nearby',
      tile: 'Alrededores',
      title: 'Alrededores',
      eyebrow: 'Qué ver cerca',
      intro: `Playas, cultura y rincones de ${zone} que merecen la visita. Escanea para llevarte la ruta en el móvil.`,
      railLabel: 'Lugares de interés',
      entries: buildNearby(data),
    },
  ]
}

export function findCollection(collections: Collection[], kind: CollectionKind): Collection | undefined {
  return collections.find(c => c.kind === kind)
}
