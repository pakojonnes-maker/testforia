import React, { useState } from 'react';
import { getTranslation } from '../lib/i18n';
import MapModal from './MapModal';

interface POI {
  id: string;
  name: string;
  description: string;
  category: string;
  google_maps_url: string;
  media: any[];
  rating?: number;
  travel_time_text?: string;
  travel_mode?: 'walk' | 'drive' | 'bike';
  distance_text?: string;
  latitude?: number;
  longitude?: number;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  cuisine_type: string;
  tier: string;
  cover_image: string;
}

interface DiscoverSectionProps {
  pois: POI[];
  restaurants?: Restaurant[];
  zoneName: string;
  zoneDescription: string;
  lang: string;
  onIntent: (type: 'restaurant' | 'experience' | 'product', id: string, action: string) => void;
  /** Construye la URL del menú de un restaurante con la atribución del guidebook. */
  buildRestaurantUrl: (slug: string) => string;
}

export default function DiscoverSection({ pois, restaurants = [], zoneName, zoneDescription, lang, onIntent, buildRestaurantUrl }: DiscoverSectionProps) {
  const ALL_FILTER = 'todos';
  const [activeFilter, setActiveFilter] = useState<string>(ALL_FILTER);
  const [showMap, setShowMap] = useState(false);
  const categoryRestaurants = getTranslation('category_restaurants', lang);

  // Combine POIs and Restaurants for the unified view
  const combinedItems = [
    ...restaurants.map(r => ({
      id: r.id, type: 'restaurant' as const, name: r.name,
      description: r.cuisine_type ? getTranslation('cuisine_label', lang).replace('{cuisine}', r.cuisine_type) : '',
      category: categoryRestaurants, image: r.cover_image,
      // FIX: apuntaba a `/r/{slug}`, una ruta relativa al dominio del guidebook
      // que no existe en su router (solo hay `/` y `/:slug`), así que el enlace
      // al menú del restaurante llevaba a una página en blanco. Ahora apunta al
      // menú real y lleva incrustada la atribución al apartamento de origen.
      url: r.slug ? buildRestaurantUrl(r.slug) : undefined,
      tier: r.tier, rating: undefined, travel_time_text: undefined, travel_mode: undefined, distance_text: undefined
    })),
    ...pois.map(p => ({
      id: p.id, type: 'poi' as const, name: p.name,
      description: p.description, category: p.category,
      image: p.media?.[0]?.url, url: p.google_maps_url, tier: '',
      rating: p.rating, travel_time_text: p.travel_time_text, travel_mode: p.travel_mode, distance_text: p.distance_text
    }))
  ];

  const categories = [ALL_FILTER, ...Array.from(new Set(combinedItems.map(i => i.category)))];

  const filteredItems = combinedItems.filter(item =>
    activeFilter === ALL_FILTER || item.category === activeFilter
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <section className="flex flex-col gap-2">
        <h2 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-deep-sea">
          {getTranslation('discover_title', lang).replace('{zone}', zoneName || getTranslation('surroundings_fallback', lang))}
        </h2>
        <p className="text-body-md font-body-md text-on-surface-variant">
          {zoneDescription || getTranslation('discover_default_description', lang)}
        </p>
      </section>

      {/* Category Filter Chips */}
      <div className="flex gap-3 overflow-x-auto hide-scrollbar py-2 -mx-margin-mobile px-margin-mobile md:mx-0 md:px-0">
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`px-6 py-2 rounded-full font-label-lg text-label-lg whitespace-nowrap transition-colors ${
              activeFilter === cat 
                ? 'bg-deep-sea text-crisp-white border border-deep-sea' 
                : 'bg-deep-sea/10 text-on-surface border border-deep-sea/20 hover:bg-deep-sea/20'
            }`}
          >
            {cat === ALL_FILTER ? getTranslation('filter_all', lang) : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Bento Grid Layout for Locations */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {filteredItems.map((item, idx) => {
          const isFeatured = idx === 0; // Make the first item large
          const bgImg = item.image || 'https://placehold.co/600x400/e5e2dd/55433d?text=' + encodeURIComponent(item.name);
          
          if (isFeatured) {
            return (
              <article key={item.id} className="col-span-1 md:col-span-8 bg-crisp-white rounded-xl shadow-[0px_4px_20px_rgba(201,109,75,0.08)] overflow-hidden flex flex-col hover:shadow-[0px_12px_32px_rgba(30,58,95,0.12)] transition-shadow duration-300 group">
                <div className="relative h-64 md:h-80 w-full overflow-hidden">
                  <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" src={bgImg} alt={item.name} />
                  {item.rating && (
                    <div className="flex items-center gap-1 bg-crisp-white/90 backdrop-blur-sm rounded-full px-2 py-1 absolute top-4 right-4 shadow-sm">
                      <span className="material-symbols-outlined text-[#D4A853] text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                      <span className="font-label-sm text-label-sm text-deep-sea">{item.rating.toFixed(1)}</span>
                    </div>
                  )}
                  {item.tier === 'premium' && (
                    <div className="absolute top-4 right-4 bg-crisp-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <span className="material-symbols-outlined text-terracotta text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="text-label-sm font-label-sm text-deep-sea font-bold">{getTranslation('premium_badge', lang)}</span>
                    </div>
                  )}
                </div>
                <div className="p-6 flex flex-col gap-4 flex-grow">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-label-sm font-label-sm text-olive uppercase tracking-wider mb-1 block">{item.category}</span>
                      <h3 className="text-headline-md font-headline-md text-deep-sea font-semibold">{item.name}</h3>
                    </div>
                  </div>
                  <p className="text-body-md font-body-md text-on-surface-variant line-clamp-2">{item.description}</p>
                  <div className="mt-auto pt-4 flex justify-between items-center border-t border-warm-sand">
                    {item.travel_time_text ? (
                      <div className="flex items-center gap-1 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px]">
                          {item.travel_mode === 'drive' ? 'directions_car' : 'directions_walk'}
                        </span>
                        <span className="font-label-sm text-label-sm">
                          {item.travel_time_text}{item.distance_text ? ` / ${item.distance_text}` : ''}
                        </span>
                      </div>
                    ) : (
                      <div />
                    )}
                    <button 
                      onClick={() => {
                        if (item.type === 'restaurant') onIntent('restaurant', item.id, 'click_menu');
                        if (item.url) window.open(item.url, '_blank');
                      }}
                      className="text-terracotta font-label-lg text-label-lg flex items-center gap-1 hover:text-primary-container transition-colors group/btn"
                    >
                      {item.type === 'restaurant' ? getTranslation('view_menu', lang) : getTranslation('view_map', lang)}
                      <span className="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          }

          // Secondary Cards
          return (
            <article key={item.id} className="col-span-1 md:col-span-4 bg-crisp-white rounded-xl shadow-[0px_4px_20px_rgba(201,109,75,0.08)] overflow-hidden flex flex-col hover:shadow-[0px_12px_32px_rgba(30,58,95,0.12)] transition-shadow duration-300 group">
              <div className="relative h-48 w-full overflow-hidden">
                <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" src={bgImg} alt={item.name} />
                {item.rating && (
                  <div className="flex items-center gap-1 bg-crisp-white/90 backdrop-blur-sm rounded-full px-2 py-1 absolute top-4 right-4 shadow-sm">
                    <span className="material-symbols-outlined text-[#D4A853] text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                    <span className="font-label-sm text-label-sm text-deep-sea">{item.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <div className="p-5 flex flex-col gap-3 flex-grow">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-headline-md text-[20px] font-headline-md text-deep-sea font-semibold line-clamp-1">{item.name}</h3>
                </div>
                <p className="text-body-md text-[14px] font-body-md text-on-surface-variant line-clamp-2">{item.description}</p>
                
                {item.travel_time_text && (
                  <div className="flex items-center gap-1 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">
                      {item.travel_mode === 'drive' ? 'directions_car' : 'directions_walk'}
                    </span>
                    <span className="font-label-sm text-label-sm">
                      {item.travel_time_text}{item.distance_text ? ` / ${item.distance_text}` : ''}
                    </span>
                  </div>
                )}

                <div className="mt-auto pt-3">
                  <button 
                    onClick={() => {
                      if (item.type === 'restaurant') onIntent('restaurant', item.id, 'click_menu');
                      if (item.url) window.open(item.url, '_blank');
                    }}
                    className="w-full py-2 rounded-lg border border-deep-sea text-deep-sea font-label-lg text-label-lg hover:bg-deep-sea hover:text-crisp-white transition-colors text-center"
                  >
                    {getTranslation('view_details', lang)}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Map Teaser */}
      <section className="mt-4 bg-warm-sand rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0px_4px_20px_rgba(201,109,75,0.08)]">
        <div className="flex flex-col gap-2 max-w-lg">
          <h3 className="text-headline-md font-headline-md text-deep-sea font-semibold">{getTranslation('prefer_map_title', lang)}</h3>
          <p className="text-body-md font-body-md text-on-surface-variant">{getTranslation('prefer_map_desc', lang)}</p>
        </div>
        <button onClick={() => setShowMap(true)} className="bg-terracotta text-crisp-white px-6 py-3 rounded-lg font-label-lg text-label-lg hover:bg-primary transition-colors flex items-center gap-2 whitespace-nowrap w-full md:w-auto justify-center shadow-sm">
          <span className="material-symbols-outlined">map</span>
          {getTranslation('open_interactive_map', lang)}
        </button>
      </section>

      {showMap && <MapModal pois={pois} onClose={() => setShowMap(false)} zoneName={zoneName} lang={lang} />}
    </div>
  );
}
