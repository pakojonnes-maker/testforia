import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getTranslation, getCategoryLabel } from '../lib/i18n';
import MediaPlaceholder, { isRealImage } from './MediaPlaceholder';

type TabKey = 'info' | 'discover' | 'restaurants' | 'services' | 'chat';
type ItemKind = 'restaurant' | 'experience' | 'product';

interface Restaurant {
  id: string; name: string; slug: string; cuisine_type: string; tier: string; cover_image: string;
}
interface Experience {
  id: string; name: string; category: string; is_featured: boolean; cover_image_url?: string; price_display: string;
}
interface StoreItem {
  id: string; name: string; category: string; price_display: string; cover_image_url?: string | null; is_featured: boolean;
}

interface CarouselItem {
  id: string; kind: ItemKind; name: string; subtitle: string; image?: string | null; price?: string; tab: TabKey;
}

interface FeaturedCarouselProps {
  restaurants: Restaurant[];
  experiences: Experience[];
  storeItems: StoreItem[];
  lang: string;
  onNavigateTab: (tab: TabKey) => void;
  onIntent: (type: ItemKind, id: string, action: string) => void;
}

const ROTATE_MS = 6000;

// "Para ti" (Stitch home carousel): rotating banner mixing recommended
// experiences, store products, and featured restaurants — a click takes the
// guest straight to the tab that item lives in (Tienda/Restaurantes), same
// pattern ChatIASection already uses for its suggestion chips.
export default function FeaturedCarousel({ restaurants, experiences, storeItems, lang, onNavigateTab, onIntent }: FeaturedCarouselProps) {
  const items: CarouselItem[] = useMemo(() => {
    const list: CarouselItem[] = [];
    experiences.filter(e => e.is_featured).forEach(e => list.push({
      id: `experience-${e.id}`, kind: 'experience', name: e.name,
      subtitle: getCategoryLabel(e.category, lang), image: e.cover_image_url,
      price: e.price_display, tab: 'services',
    }));
    storeItems.filter(i => i.is_featured).forEach(i => list.push({
      id: `product-${i.id}`, kind: 'product', name: i.name,
      subtitle: getCategoryLabel(i.category, lang), image: i.cover_image_url,
      price: i.price_display, tab: 'services',
    }));
    // `guide_zone_restaurants.tier` solo admite 'basic'|'featured' — igual que en
    // RestaurantsSection.tsx, no comparar nunca contra 'premium'.
    restaurants.filter(r => r.tier === 'featured').forEach(r => list.push({
      id: `restaurant-${r.id}`, kind: 'restaurant', name: r.name,
      subtitle: r.cuisine_type
        ? getTranslation('cuisine_label', lang).replace('{cuisine}', r.cuisine_type)
        : getTranslation('category_restaurants', lang),
      image: r.cover_image, tab: 'restaurants',
    }));
    return list;
  }, [restaurants, experiences, storeItems, lang]);

  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Si cambia el número de slides (p.ej. cambio de idioma recarga los datos),
  // el índice activo puede quedar fuera de rango.
  useEffect(() => {
    setIndex(0);
  }, [items.length]);

  useEffect(() => {
    if (items.length < 2) return;
    timerRef.current = setInterval(() => {
      setIndex(i => (i + 1) % items.length);
    }, ROTATE_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [items.length]);

  if (items.length === 0) return null;

  const goTo = (i: number) => {
    setIndex(i);
    if (timerRef.current) clearInterval(timerRef.current);
    if (items.length > 1) {
      timerRef.current = setInterval(() => setIndex(x => (x + 1) % items.length), ROTATE_MS);
    }
  };

  const KIND_LABEL: Record<ItemKind, string> = {
    restaurant: getTranslation('tab_restaurants', lang),
    experience: getTranslation('exclusive_promotions', lang),
    product: getTranslation('tab_services', lang),
  };

  const handleSelect = (item: CarouselItem) => {
    onIntent(item.kind, item.id.replace(`${item.kind}-`, ''), 'click_home_carousel');
    onNavigateTab(item.tab);
  };

  return (
    <section className="flex flex-col gap-stack-md">
      <h2 className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">
        {getTranslation('recommended_for_you', lang)}
      </h2>

      <div className="relative w-full aspect-[4/3] md:aspect-[21/9] overflow-hidden border border-on-background/10 bg-surface-variant">
        {items.map((item, i) => (
          <button
            key={item.id}
            onClick={() => handleSelect(item)}
            className="absolute inset-0 w-full h-full text-left transition-opacity duration-700 ease-in-out"
            style={{ opacity: i === index ? 1 : 0, pointerEvents: i === index ? 'auto' : 'none' }}
            aria-hidden={i !== index}
            tabIndex={i === index ? 0 : -1}
          >
            {isRealImage(item.image) ? (
              <img src={item.image!} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <MediaPlaceholder label={item.name} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-on-background/85 via-on-background/15 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <span className="font-label-caps text-label-caps text-crisp-white/80 uppercase tracking-widest">
                  {KIND_LABEL[item.kind]} · {item.subtitle}
                </span>
                <h3 className="font-headline-md text-headline-md md:text-display-lg text-crisp-white line-clamp-1">
                  {item.name}
                </h3>
              </div>
              {item.price && (
                <span className="shrink-0 stamped-badge-1 bg-tertiary-fixed-dim text-on-tertiary-fixed font-mono-badge text-mono-badge px-2.5 py-1.5 border border-on-background/20 uppercase">
                  {item.price}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => goTo(i)}
              aria-label={item.name}
              className={`h-1.5 transition-all ${i === index ? 'w-6 bg-primary' : 'w-1.5 bg-on-background/20'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
