import React from 'react';
import { getTranslation } from '../lib/i18n';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  cuisine_type: string;
  tier: string;
  cover_image: string;
}

interface RestaurantsSectionProps {
  restaurants: Restaurant[];
  zoneName: string;
  lang: string;
  onIntent: (type: 'restaurant', id: string, action: string) => void;
  /** Construye la URL del menú de un restaurante con la atribución del guidebook. */
  buildRestaurantUrl: (slug: string) => string;
}

// "The Table" (Stitch): filas editoriales a todo el ancho, imagen y contenido
// alternando de lado, separadas por horizon-rule — en vez de la rejilla
// 8+4 anterior.
export default function RestaurantsSection({ restaurants, zoneName, lang, onIntent, buildRestaurantUrl }: RestaurantsSectionProps) {
  if (!restaurants || restaurants.length === 0) {
    return (
      <div className="text-center py-12 text-on-surface-variant">
        <span className="material-symbols-outlined text-5xl opacity-30">restaurant</span>
        <p className="mt-2 font-body-md text-body-md">{getTranslation('no_restaurants', lang)}</p>
      </div>
    );
  }

  // `guide_zone_restaurants.tier` solo admite 'basic'|'featured' (CHECK de la tabla) —
  // el destacado debe compararse contra ese valor, no contra 'premium', que nunca
  // puede darse.
  const featuredId = restaurants.find(r => r.tier === 'featured')?.id ?? restaurants[0].id;

  const openMenu = (r: Restaurant) => {
    onIntent('restaurant', r.id, 'click_menu');
    if (r.slug) window.open(buildRestaurantUrl(r.slug), '_blank');
  };

  return (
    <div className="flex flex-col gap-stack-lg">
      <section className="flex flex-col gap-2">
        <h2 className="font-display-xl text-display-xl text-on-background uppercase tracking-tighter">
          {getTranslation('restaurants_title', lang).replace('{zone}', zoneName || getTranslation('surroundings_fallback', lang))}
        </h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">{getTranslation('restaurants_default_description', lang)}</p>
      </section>

      <div className="flex flex-col">
        {restaurants.map((r, idx) => {
          const isFeatured = r.id === featuredId;
          const bgImg = r.cover_image || 'https://placehold.co/600x400/e3e2df/434655?text=' + encodeURIComponent(r.name);
          const cuisineLabel = r.cuisine_type ? getTranslation('cuisine_label', lang).replace('{cuisine}', r.cuisine_type) : '';
          const reversed = idx % 2 === 1;

          return (
            <React.Fragment key={r.id}>
              <div className={`flex flex-col md:flex-row ${reversed ? 'md:flex-row-reverse' : ''} gap-6 md:gap-8 items-center py-stack-lg`}>
                <div className="w-full md:w-4/12 relative shrink-0">
                  {isFeatured && (
                    <div className="absolute top-4 right-4 z-10 stamped-badge-1 bg-tertiary-fixed-dim text-on-tertiary-fixed font-mono-badge text-mono-badge px-3 py-1 border border-on-background/10 uppercase">
                      {getTranslation('premium_badge', lang)}
                    </div>
                  )}
                  <img className="w-full h-[260px] md:h-[320px] object-cover arch-mask border border-on-background/10" src={bgImg} alt={r.name} />
                </div>
                <div className="w-full md:w-7/12 flex flex-col justify-center items-start">
                  <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest mb-2">{getTranslation('category_restaurants', lang)}</span>
                  <h3 className="font-headline-md text-headline-md mb-3 text-on-background">{r.name}</h3>
                  {cuisineLabel && (
                    <p className="font-body-md text-body-md text-on-surface-variant mb-6 max-w-xl">{cuisineLabel}</p>
                  )}
                  <button
                    onClick={() => openMenu(r)}
                    className="bg-primary text-on-primary font-label-caps text-label-caps uppercase px-6 py-3 hover:bg-primary-container transition-colors flex items-center gap-2"
                  >
                    {getTranslation('view_menu', lang)}
                    <span className="material-symbols-outlined icon-directional">arrow_forward</span>
                  </button>
                </div>
              </div>
              {idx < restaurants.length - 1 && <div className="horizon-rule" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
