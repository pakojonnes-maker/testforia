import { pick, type Translations } from './i18n'

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

// Cabecera de cada fila de categoría (pantalla de colección) y chip del
// detalle. `category` llega TAL CUAL de guide_pois: sólo name/description pasan
// por la tabla `translations`, así que sin este mapa "Naturaleza" salía en
// español en los 13 idiomas. Las zonas lo siembran a veces como etiqueta en
// español y a veces como slug en inglés; los dos casos acaban aquí.
//
// En plural a propósito, porque encabezan una fila de varias fichas. Las
// entradas del final son las de `apps/guide` (CATEGORY_LABELS) que la TV no
// tenía y enseñaba como el slug crudo ("Viewpoint").
const LABELS: Record<string, Translations> = {
  cultura: { es: 'Cultura', en: 'Culture', fr: 'Culture', de: 'Kultur', it: 'Cultura', pt: 'Cultura', ca: 'Cultura', ar: 'الثقافة', ru: 'Культура', uk: 'Культура', zh: '文化', ja: '文化', ko: '문화' },
  naturaleza: { es: 'Naturaleza', en: 'Nature', fr: 'Nature', de: 'Natur', it: 'Natura', pt: 'Natureza', ca: 'Natura', ar: 'الطبيعة', ru: 'Природа', uk: 'Природа', zh: '自然', ja: '自然', ko: '자연' },
  compras: { es: 'Compras', en: 'Shopping', fr: 'Shopping', de: 'Einkaufen', it: 'Shopping', pt: 'Compras', ca: 'Compres', ar: 'التسوق', ru: 'Шопинг', uk: 'Шопінг', zh: '购物', ja: 'ショッピング', ko: '쇼핑' },
  playas: { es: 'Playas', en: 'Beaches', fr: 'Plages', de: 'Strände', it: 'Spiagge', pt: 'Praias', ca: 'Platges', ar: 'الشواطئ', ru: 'Пляжи', uk: 'Пляжі', zh: '海滩', ja: 'ビーチ', ko: '해변' },
  actividades: { es: 'Actividades', en: 'Activities', fr: 'Activités', de: 'Aktivitäten', it: 'Attività', pt: 'Atividades', ca: 'Activitats', ar: 'الأنشطة', ru: 'Активности', uk: 'Активності', zh: '活动', ja: 'アクティビティ', ko: '액티비티' },
  transporte: { es: 'Transporte', en: 'Transport', fr: 'Transport', de: 'Transport', it: 'Trasporto', pt: 'Transporte', ca: 'Transport', ar: 'النقل', ru: 'Транспорт', uk: 'Транспорт', zh: '交通', ja: '交通', ko: '교통' },
  bienestar: { es: 'Bienestar', en: 'Wellness', fr: 'Bien-être', de: 'Wellness', it: 'Benessere', pt: 'Bem-estar', ca: 'Benestar', ar: 'العافية', ru: 'Велнес', uk: 'Велнес', zh: '养生', ja: 'ウェルネス', ko: '웰니스' },
  gastronomia: { es: 'Gastronomía', en: 'Food & drink', fr: 'Gastronomie', de: 'Kulinarik', it: 'Gastronomia', pt: 'Gastronomia', ca: 'Gastronomia', ar: 'المأكولات', ru: 'Гастрономия', uk: 'Гастрономія', zh: '美食', ja: 'グルメ', ko: '미식' },
  restaurantes: { es: 'Restaurantes', en: 'Restaurants', fr: 'Restaurants', de: 'Restaurants', it: 'Ristoranti', pt: 'Restaurantes', ca: 'Restaurants', ar: 'المطاعم', ru: 'Рестораны', uk: 'Ресторани', zh: '餐厅', ja: 'レストラン', ko: '레스토랑' },
  nautica: { es: 'Náutica', en: 'Water sports', fr: 'Nautisme', de: 'Wassersport', it: 'Nautica', pt: 'Náutica', ca: 'Nàutica', ar: 'الرياضات المائية', ru: 'Водный спорт', uk: 'Водний спорт', zh: '水上运动', ja: 'マリンスポーツ', ko: '수상 스포츠' },
  otro: { es: 'Otros', en: 'Other', fr: 'Autres', de: 'Sonstiges', it: 'Altro', pt: 'Outros', ca: 'Altres', ar: 'أخرى', ru: 'Другое', uk: 'Інше', zh: '其他', ja: 'その他', ko: '기타' },
  // Agrupación de la Tienda (buildStore en collections.ts) — mismo criterio
  // host/platform que ya usa apps/guide (ServicesSection.tsx).
  store_host: { es: 'Productos del anfitrión', en: "Your host's products", fr: "Produits de l'hôte", de: 'Produkte des Gastgebers', it: "Prodotti dell'host", pt: 'Produtos do anfitrião', ca: "Productes de l'amfitrió", ar: 'منتجات المضيف', ru: 'Товары хозяина', uk: 'Товари господаря', zh: '房东的商品', ja: 'ホストの商品', ko: '호스트 상품' },
  store_platform: { es: 'Productos locales', en: 'Local products', fr: 'Produits locaux', de: 'Lokale Produkte', it: 'Prodotti locali', pt: 'Produtos locais', ca: 'Productes locals', ar: 'منتجات محلية', ru: 'Местные продукты', uk: 'Місцеві продукти', zh: '本地产品', ja: '地元の特産品', ko: '지역 특산품' },
  // Traídas de apps/guide tal cual.
  viewpoint: { es: 'Mirador', en: 'Viewpoint', fr: 'Point de vue', de: 'Aussichtspunkt', it: 'Punto panoramico', pt: 'Miradouro', ca: 'Mirador', ar: 'نقطة مشاهدة', ru: 'Смотровая площадка', uk: 'Оглядовий майданчик', zh: '观景点', ja: '展望スポット', ko: '전망대' },
  monument: { es: 'Monumento', en: 'Monument', fr: 'Monument', de: 'Denkmal', it: 'Monumento', pt: 'Monumento', ca: 'Monument', ar: 'معلم', ru: 'Памятник', uk: 'Пам’ятка', zh: '古迹', ja: '記念碑', ko: '기념물' },
  water_sport: { es: 'Deporte acuático', en: 'Water sports', fr: 'Sports nautiques', de: 'Wassersport', it: 'Sport acquatici', pt: 'Desportos aquáticos', ca: 'Esports aquàtics', ar: 'رياضة مائية', ru: 'Водный спорт', uk: 'Водний спорт', zh: '水上运动', ja: 'ウォータースポーツ', ko: '수상 스포츠' },
  adventure: { es: 'Aventura', en: 'Adventure', fr: 'Aventure', de: 'Abenteuer', it: 'Avventura', pt: 'Aventura', ca: 'Aventura', ar: 'مغامرة', ru: 'Приключение', uk: 'Пригода', zh: '探险', ja: 'アドベンチャー', ko: '어드벤처' },
  class: { es: 'Clase / Taller', en: 'Class / Workshop', fr: 'Cours / Atelier', de: 'Kurs / Workshop', it: 'Corso / Laboratorio', pt: 'Aula / Workshop', ca: 'Classe / Taller', ar: 'دورة / ورشة', ru: 'Занятие / Мастер-класс', uk: 'Заняття / Майстер-клас', zh: '课程/工作坊', ja: 'レッスン／ワークショップ', ko: '클래스/워크숍' },
  park: { es: 'Parque', en: 'Park', fr: 'Parc', de: 'Park', it: 'Parco', pt: 'Parque', ca: 'Parc', ar: 'حديقة', ru: 'Парк', uk: 'Парк', zh: '公园', ja: '公園', ko: '공원' },
  marina: { es: 'Puerto deportivo', en: 'Marina', fr: 'Port de plaisance', de: 'Yachthafen', it: 'Porto turistico', pt: 'Marina', ca: 'Port esportiu', ar: 'مارينا', ru: 'Марина', uk: 'Марина', zh: '游艇码头', ja: 'マリーナ', ko: '마리나' },
}

// Slugs en inglés (y sinónimos) que las zonas usan para la misma categoría.
const ALIASES: Record<string, string> = {
  beach: 'playas', landmark: 'cultura', nature: 'naturaleza', food: 'gastronomia',
  shopping: 'compras', relax: 'bienestar', boat: 'nautica', kayak: 'nautica',
}

const MORE: Translations = { es: 'Más recomendaciones', en: 'More recommendations', fr: 'Plus de recommandations', de: 'Weitere Empfehlungen', it: 'Altri consigli', pt: 'Mais recomendações', ca: 'Més recomanacions', ar: 'المزيد من التوصيات', ru: 'Ещё рекомендации', uk: 'Ще рекомендації', zh: '更多推荐', ja: 'その他のおすすめ', ko: '더 많은 추천' }

export function categoryLabel(category: string | null | undefined, lang: string): string {
  const lower = (category || '').trim().toLowerCase()
  if (!lower) return pick(MORE, lang)
  // Sin tildes en la clave: el seed puede traer "Gastronomía" o "gastronomia".
  const key = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const entry = LABELS[ALIASES[key] ?? key]
  if (entry) return pick(entry, lang)
  // Categoría sin mapear: mayúscula inicial como respaldo legible.
  return lower.charAt(0).toUpperCase() + lower.slice(1).replace(/_/g, ' ')
}
