import type { GuidebookData } from './api'

// Guidebook de ejemplo con la MISMA forma que devuelve el worker, para que las
// pantallas Guía y Alrededores rendericen sin red. Se sustituye por fetchGuidebook.
export const MOCK_GUIDE: GuidebookData = {
  apartment: {
    id: 'apt_demo', name: 'Villa Serena', slug: 'villa-serena',
    address: 'Cala Blanca, 12 · Menorca', cover_image_url: '',
    info: [
      { id: 'i1', key: 'entry', icon: 'key', title: 'Código de entrada', content: '4821', media: [] },
      { id: 'i2', key: 'checkout', icon: 'clock', title: 'Check-out', content: 'Antes de las 11:00. Deja las llaves en la caja.', media: [] },
      { id: 'i3', key: 'ac', icon: 'snow', title: 'Aire acondicionado', content: 'Mando en el salón. Modo frío recomendado a 24°.', media: [] },
      { id: 'i4', key: 'trash', icon: 'trash', title: 'Basura', content: 'Contenedores de reciclaje a 50 m, a la derecha del portal.', media: [] },
    ],
  },
  zone: {
    id: 'z1', name: 'Cala Blanca', slug: 'cala-blanca', region: 'Menorca',
    description: 'Un rincón tranquilo del sur de Menorca: calas de arena blanca, aguas turquesas y pueblos blancos con encanto mediterráneo. Perfecto para desconectar.',
    cover_image_url: '',
  },
  agency: {
    id: 'ag1', name: 'Mediterrà Stays', logo_url: '',
    primary_color: '#128099', secondary_color: '#06415c', accent_color: '#e07a5f',
  },
  pois: [
    { id: 'p1', name: 'Cala Macarella', description: 'Una de las calas más icónicas de Menorca: arena blanca fina y agua color esmeralda rodeada de pinos. A 20 min en coche.', category: 'beach', google_maps_url: 'https://maps.google.com/?q=Cala+Macarella', media: [] },
    { id: 'p2', name: 'Ciutadella', description: 'Casco histórico con puerto, catedral gótica y calles empedradas llenas de tiendas y terrazas. Ideal al atardecer.', category: 'landmark', google_maps_url: 'https://maps.google.com/?q=Ciutadella+de+Menorca', media: [] },
    { id: 'p3', name: 'Faro de Punta Nati', description: 'Faro solitario sobre acantilados salvajes. El mejor sitio de la isla para ver la puesta de sol.', category: 'nature', google_maps_url: 'https://maps.google.com/?q=Faro+Punta+Nati', media: [] },
    { id: 'p4', name: 'Mercat des Peix', description: 'Mercado del pescado convertido en gastro-mercado. Tapas, ostras y vino local en ambiente animado.', category: 'food', google_maps_url: 'https://maps.google.com/?q=Mercat+des+Peix+Ciutadella', media: [] },
    { id: 'p5', name: 'Naveta des Tudons', description: 'Monumento funerario megalítico de más de 3.000 años, el mejor conservado de Menorca.', category: 'landmark', google_maps_url: 'https://maps.google.com/?q=Naveta+des+Tudons', media: [] },
  ],
  restaurants: [
    { id: 'r1', name: 'Cafè Balear', slug: 'cafe-balear', cuisine_type: 'Marisco', tier: 'premium', cover_image: '' },
    { id: 'r2', name: 'Es Tast de na Silvia', slug: 'es-tast', cuisine_type: 'Km 0', tier: 'premium', cover_image: '' },
    { id: 'r3', name: 'Ulisses', slug: 'ulisses', cuisine_type: 'Mediterránea', tier: 'standard', cover_image: '' },
    { id: 'r4', name: 'Smoix', slug: 'smoix', cuisine_type: 'Autor', tier: 'premium', cover_image: '' },
  ],
  experiences: [
    { id: 'e1', name: 'Paseo en velero al atardecer', description: 'Navega las calas del sur con copa de cava incluida.', category: 'boat', service_subcategory: null, action_type: 'whatsapp', action_data: '', prefilled_message: '', price_display: 'desde 65€', is_featured: true, cta_label: 'Reservar', cover_image_url: '' },
    { id: 'e2', name: 'Ruta en kayak por cuevas', description: 'Explora cuevas marinas con guía local. 2 h.', category: 'kayak', service_subcategory: null, action_type: 'whatsapp', action_data: '', prefilled_message: '', price_display: '40€', is_featured: false, cta_label: 'Reservar', cover_image_url: '' },
    { id: 'e3', name: 'Cata de quesos de Mahón', description: 'Degustación en una quesería artesanal con maridaje.', category: 'food', service_subcategory: null, action_type: 'whatsapp', action_data: '', prefilled_message: '', price_display: '30€', is_featured: false, cta_label: 'Reservar', cover_image_url: '' },
  ],
  meta: { lang: 'es', available_langs: ['es', 'en', 'fr', 'de'] },
}
