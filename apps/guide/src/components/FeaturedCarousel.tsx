import { useMemo } from 'react';
import { getTranslation, getCategoryLabel } from '../lib/i18n';
import PhotoFigure from './PhotoFigure';

type TabKey = 'info' | 'discover' | 'restaurants' | 'services' | 'chat';
type ItemKind = 'restaurant' | 'experience' | 'product';

interface Restaurant {
  id: string; name: string; slug: string | null; cuisine_type: string | null; tier: string; cover_image: string | null;
  is_promoted?: boolean;
}
interface Experience {
  id: string; name: string; category: string; is_featured: boolean; is_promoted?: boolean; cover_image_url?: string; price_display: string;
}
interface StoreItem {
  id: string; name: string; category: string; price_display: string; cover_image_url?: string | null; is_featured: boolean; is_promoted?: boolean;
}

interface RailItem {
  id: string; kind: ItemKind; name: string; subtitle: string; image?: string | null; price?: string; tab: TabKey;
  /** Puesto de pago: abre el carril, que es el sitio más visible de la guía. */
  promoted?: boolean;
}

interface FeaturedCarouselProps {
  restaurants: Restaurant[];
  experiences: Experience[];
  storeItems: StoreItem[];
  lang: string;
  onNavigateTab: (tab: TabKey) => void;
  onIntent: (type: ItemKind, id: string, action: string) => void;
}

// «Para ti»: un carril de arcos que mezcla experiencias destacadas, productos de la tienda y restaurantes
// destacados. Tocar uno lleva a la pestaña donde vive. Antes era un carrusel que rotaba solo cada 6 s; un
// carril que el huésped desliza a su ritmo no se mueve mientras lee y no necesita botones de punto.
export default function FeaturedCarousel({ restaurants, experiences, storeItems, lang, onNavigateTab, onIntent }: FeaturedCarouselProps) {
  const items: RailItem[] = useMemo(() => {
    const list: RailItem[] = [];
    experiences.filter(e => e.is_featured || e.is_promoted).forEach(e => list.push({
      id: `experience-${e.id}`, kind: 'experience', name: e.name,
      subtitle: getCategoryLabel(e.category, lang), image: e.cover_image_url,
      price: e.price_display, tab: 'services', promoted: e.is_promoted,
    }));
    storeItems.filter(i => i.is_featured || i.is_promoted).forEach(i => list.push({
      id: `product-${i.id}`, kind: 'product', name: i.name,
      subtitle: getCategoryLabel(i.category, lang), image: i.cover_image_url,
      price: i.price_display, tab: 'services', promoted: i.is_promoted,
    }));
    // `guide_zone_restaurants.tier` solo admite 'basic'|'featured' — igual que en RestaurantsSection.tsx,
    // no comparar nunca contra 'premium'.
    restaurants.filter(r => r.tier === 'featured' || r.is_promoted).forEach(r => list.push({
      id: `restaurant-${r.id}`, kind: 'restaurant', name: r.name,
      subtitle: r.cuisine_type
        ? getTranslation('cuisine_label', lang).replace('{cuisine}', r.cuisine_type)
        : getTranslation('category_restaurants', lang),
      image: r.cover_image, tab: 'restaurants', promoted: r.is_promoted,
    }));
    // La lista se arma por tipo, así que sin esto un puesto pagado de restaurante quedaría detrás de
    // cualquier experiencia destacada. sort es estable: dentro de cada grupo se conserva el orden del backend.
    return list.sort((a, b) => Number(!!b.promoted) - Number(!!a.promoted));
  }, [restaurants, experiences, storeItems, lang]);

  if (items.length === 0) return null;

  const KIND_LABEL: Record<ItemKind, string> = {
    restaurant: getTranslation('tab_restaurants', lang),
    experience: getTranslation('exclusive_promotions', lang),
    product: getTranslation('tab_services', lang),
  };

  const handleSelect = (item: RailItem) => {
    onIntent(item.kind, item.id.replace(`${item.kind}-`, ''), 'click_home_carousel');
    onNavigateTab(item.tab);
  };

  return (
    <section className="g-sec g-sec-rail">
      <h2 className="g-h2">{getTranslation('recommended_for_you', lang)}</h2>
      <div className="g-rail hide-scrollbar">
        {items.map(item => (
          <button key={item.id} type="button" className="g-rc" onClick={() => handleSelect(item)}>
            <PhotoFigure className="g-fig" src={item.image} alt="" name={item.name} />
            <span className="g-h3">{item.name}</span>
            <span className="g-meta">{KIND_LABEL[item.kind]} · {item.subtitle}</span>
            {item.price && <span className="g-rprice">{item.price}</span>}
          </button>
        ))}
      </div>
    </section>
  );
}
