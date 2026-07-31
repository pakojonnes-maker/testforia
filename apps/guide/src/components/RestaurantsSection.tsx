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
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h2 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-deep-sea">
          {getTranslation('restaurants_title', lang).replace('{zone}', zoneName || getTranslation('surroundings_fallback', lang))}
        </h2>
        <p className="text-body-md font-body-md text-on-surface-variant">{getTranslation('restaurants_default_description', lang)}</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {restaurants.map(r => {
          const isFeatured = r.id === featuredId;
          const bgImg = r.cover_image || 'https://placehold.co/600x400/e5e2dd/55433d?text=' + encodeURIComponent(r.name);
          const cuisineLabel = r.cuisine_type ? getTranslation('cuisine_label', lang).replace('{cuisine}', r.cuisine_type) : '';

          if (isFeatured) {
            return (
              <article key={r.id} className="col-span-1 md:col-span-8 bg-crisp-white rounded-xl shadow-[0px_4px_20px_rgba(201,109,75,0.08)] overflow-hidden flex flex-col hover:shadow-[0px_12px_32px_rgba(30,58,95,0.12)] transition-shadow duration-300 group">
                <div className="relative h-64 md:h-80 w-full overflow-hidden">
                  <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" src={bgImg} alt={r.name} />
                  {r.tier === 'featured' && (
                    <div className="absolute top-4 right-4 bg-crisp-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <span className="material-symbols-outlined text-terracotta text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="text-label-sm font-label-sm text-deep-sea font-bold">{getTranslation('premium_badge', lang)}</span>
                    </div>
                  )}
                </div>
                <div className="p-6 flex flex-col gap-4 flex-grow">
                  <div>
                    <span className="text-label-sm font-label-sm text-olive uppercase tracking-wider mb-1 block">{getTranslation('category_restaurants', lang)}</span>
                    <h3 className="text-headline-md font-headline-md text-deep-sea font-semibold">{r.name}</h3>
                    {cuisineLabel && <p className="text-body-md font-body-md text-on-surface-variant mt-1">{cuisineLabel}</p>}
                  </div>
                  <div className="mt-auto pt-4 flex justify-end border-t border-warm-sand">
                    <button
                      onClick={() => openMenu(r)}
                      className="text-terracotta font-label-lg text-label-lg flex items-center gap-1 hover:text-primary-container transition-colors group/btn"
                    >
                      {getTranslation('view_menu', lang)}
                      <span className="material-symbols-outlined icon-directional text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          }

          return (
            <article key={r.id} className="col-span-1 md:col-span-4 bg-crisp-white rounded-xl shadow-[0px_4px_20px_rgba(201,109,75,0.08)] overflow-hidden flex flex-col hover:shadow-[0px_12px_32px_rgba(30,58,95,0.12)] transition-shadow duration-300 group">
              <div className="relative h-48 w-full overflow-hidden">
                <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" src={bgImg} alt={r.name} />
              </div>
              <div className="p-5 flex flex-col gap-3 flex-grow">
                <div>
                  <span className="text-label-sm font-label-sm text-olive uppercase tracking-wider mb-1 block">{getTranslation('category_restaurants', lang)}</span>
                  <h3 className="text-headline-md text-[20px] font-headline-md text-deep-sea font-semibold line-clamp-1">{r.name}</h3>
                  {cuisineLabel && <p className="text-body-md text-[14px] font-body-md text-on-surface-variant line-clamp-2">{cuisineLabel}</p>}
                </div>
                <div className="mt-auto pt-3">
                  <button
                    onClick={() => openMenu(r)}
                    className="w-full py-2 rounded-lg border border-deep-sea text-deep-sea font-label-lg text-label-lg hover:bg-deep-sea hover:text-crisp-white transition-colors text-center"
                  >
                    {getTranslation('view_menu', lang)}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
