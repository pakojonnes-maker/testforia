import React, { useState } from 'react';
import { getTranslation, getCategoryLabel } from '../lib/i18n';
import MapModal from './MapModal';
import PoiDetailModal, { PoiDetailItem } from './PoiDetailModal';
import MediaPlaceholder, { isRealImage } from './MediaPlaceholder';
import AccessBadge, { BookableBadge } from './AccessBadge';

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
  poi_type?: string;
  access_type?: string;
  price_display?: string;
  duration_text?: string;
  is_bookable?: boolean;
}

interface DiscoverSectionProps {
  pois: POI[];
  zoneName: string;
  zoneDescription: string;
  lang: string;
}

// Los restaurantes tienen su propia pestaña (ver RestaurantsSection.tsx) — Descubre
// se queda solo con POIs (naturaleza, playas, cultura...).
export default function DiscoverSection({ pois, zoneName, zoneDescription, lang }: DiscoverSectionProps) {
  const ALL_FILTER = 'todos';
  const [activeFilter, setActiveFilter] = useState<string>(ALL_FILTER);
  const [showMap, setShowMap] = useState(false);
  const [mapPois, setMapPois] = useState<POI[] | null>(null);
  const [mapTargetId, setMapTargetId] = useState<string | undefined>(undefined);
  const [selectedItem, setSelectedItem] = useState<PoiDetailItem | null>(null);

  const openMapFor = (poisToShow: POI[] | null, targetId?: string) => {
    setMapPois(poisToShow);
    setMapTargetId(targetId);
    setSelectedItem(null);
    setShowMap(true);
  };

  const combinedItems = pois.map(p => ({
    id: p.id, type: 'poi' as const, name: p.name,
    description: p.description, category: p.category,
    image: p.media?.[0]?.url, url: p.google_maps_url,
    rating: p.rating, travel_time_text: p.travel_time_text, travel_mode: p.travel_mode, distance_text: p.distance_text,
    latitude: p.latitude, longitude: p.longitude,
    access_type: p.access_type, price_display: p.price_display,
    duration_text: p.duration_text, is_bookable: p.is_bookable,
  }));

  const categories = [ALL_FILTER, ...Array.from(new Set(combinedItems.map(i => i.category)))];

  const filteredItems = combinedItems.filter(item =>
    activeFilter === ALL_FILTER || item.category === activeFilter
  );

  // Highlight the highest-rated POI instead of just "whatever came first from the
  // DB query", which is what idx === 0 used to mean.
  const featuredItemId = filteredItems.length > 0
    ? filteredItems.reduce((best, item) => (item.rating ?? 0) > (best.rating ?? 0) ? item : best, filteredItems[0]).id
    : null;

  return (
    <div className="flex flex-col gap-stack-lg">
      {/* Page Header */}
      <section className="flex flex-col gap-2">
        <h2 className="font-display-xl text-display-lg md:text-display-xl text-on-background">
          {getTranslation('discover_title', lang).replace('{zone}', zoneName || getTranslation('surroundings_fallback', lang))}
        </h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
          {zoneDescription || getTranslation('discover_default_description', lang)}
        </p>
      </section>

      <div className="horizon-rule hidden md:block" />

      {/* Category Filter Tabs */}
      <div className="flex gap-8 overflow-x-auto hide-scrollbar border-b border-on-background/10 -mx-margin-mobile px-margin-mobile md:mx-0 md:px-0">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`pb-3 font-label-caps text-label-caps uppercase tracking-widest whitespace-nowrap transition-colors ${
              activeFilter === cat
                ? 'text-primary border-b-2 border-primary'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {cat === ALL_FILTER ? getTranslation('filter_all', lang) : getCategoryLabel(cat, lang)}
          </button>
        ))}
      </div>

      {/* Content Grid */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-x-gutter gap-y-stack-lg">
        {filteredItems.map((item) => {
          const isFeatured = item.id === featuredItemId;

          if (isFeatured) {
            return (
              <article key={item.id} className="col-span-1 md:col-span-12 flex flex-col md:flex-row gap-6 md:gap-8 items-start border border-on-background/10 bg-surface-container-lowest p-4 md:p-6">
                <div className="w-full md:w-5/12 aspect-[4/5] relative arch-mask overflow-hidden bg-surface-variant flex-shrink-0">
                  {isRealImage(item.image) ? (
                    <img className="w-full h-full object-cover" src={item.image} alt={item.name} />
                  ) : (
                    <MediaPlaceholder label={item.name} />
                  )}
                  {item.rating && (
                    <div className="absolute top-4 right-4 stamped-badge-1 bg-tertiary-fixed-dim text-on-tertiary-fixed font-mono-badge text-mono-badge px-2 py-1 uppercase border border-on-background/10">
                      ★ {item.rating.toFixed(1)}
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex flex-col items-start gap-2">
                    <AccessBadge item={item} lang={lang} stamp={3} />
                    {item.is_bookable && <BookableBadge lang={lang} />}
                  </div>
                </div>
                <div className="w-full md:w-7/12 flex flex-col justify-between h-full">
                  <div>
                    <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest mb-2 block">{getCategoryLabel(item.category, lang)}</span>
                    <h3 className="font-headline-md text-headline-md text-on-background mb-3">{item.name}</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-6 max-w-lg">{item.description}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-auto border-t border-on-background/10 pt-6">
                    {item.travel_time_text && (
                      <div className="flex items-center gap-1 text-on-surface-variant shrink-0">
                        <span className="material-symbols-outlined text-[16px]">
                          {item.travel_mode === 'drive' ? 'directions_car' : 'directions_walk'}
                        </span>
                        <span className="font-label-sm text-label-sm">
                          {item.travel_time_text}{item.distance_text ? ` / ${item.distance_text}` : ''}
                        </span>
                      </div>
                    )}
                    {item.duration_text && (
                      <div className="flex items-center gap-1 text-on-surface-variant shrink-0">
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        <span className="font-label-sm text-label-sm">{item.duration_text}</span>
                      </div>
                    )}
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="bg-primary text-on-primary font-label-caps text-label-caps uppercase px-6 py-3 hover:bg-primary-container transition-colors flex-1 sm:flex-none text-center"
                    >
                      {getTranslation('view_details', lang)}
                    </button>
                  </div>
                </div>
              </article>
            );
          }

          // Secondary Cards
          return (
            <article key={item.id} className="col-span-1 md:col-span-4 bg-surface-container-lowest border border-on-background/10 flex flex-col group">
              <div className="relative aspect-[4/5] w-full arch-mask overflow-hidden m-2 bg-surface-variant">
                {isRealImage(item.image) ? (
                  <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={item.image} alt={item.name} />
                ) : (
                  <MediaPlaceholder label={item.name} />
                )}
                {item.rating && (
                  <div className="absolute top-2 right-2 stamped-badge-2 bg-tertiary-fixed-dim text-on-tertiary-fixed font-mono-badge text-mono-badge px-2 py-1 uppercase border border-on-background/10">
                    ★ {item.rating.toFixed(1)}
                  </div>
                )}
                <div className="absolute top-2 left-2 flex flex-col items-start gap-1.5">
                  <AccessBadge item={item} lang={lang} stamp={1} />
                  {item.is_bookable && <BookableBadge lang={lang} />}
                </div>
              </div>
              <div className="p-4 flex flex-col gap-2 flex-grow">
                <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">{getCategoryLabel(item.category, lang)}</span>
                <h3 className="font-headline-md text-[20px] leading-tight text-on-background line-clamp-1">{item.name}</h3>
                <p className="font-body-md text-[14px] text-on-surface-variant line-clamp-2">{item.description}</p>

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

                <div className="mt-auto pt-2 border-t border-on-background/10">
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="w-full py-2 border border-primary text-primary font-label-caps text-label-caps uppercase hover:bg-primary hover:text-on-primary transition-colors text-center"
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
      <section className="relative mt-4 border border-on-background/10 overflow-hidden">
        <div className="absolute inset-0 azulejo-pattern" />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 p-6">
          <div className="flex flex-col gap-2 max-w-lg">
            <h3 className="font-headline-md text-headline-md text-on-background">{getTranslation('prefer_map_title', lang)}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">{getTranslation('prefer_map_desc', lang)}</p>
          </div>
          <button onClick={() => openMapFor(null, featuredItemId ?? undefined)} className="bg-primary text-on-primary px-6 py-3 font-label-caps text-label-caps uppercase hover:bg-primary-container transition-colors flex items-center gap-2 whitespace-nowrap w-full md:w-auto justify-center shrink-0">
            <span className="material-symbols-outlined">map</span>
            {getTranslation('open_interactive_map', lang)}
          </button>
        </div>
      </section>

      {showMap && (
        <MapModal
          pois={mapPois ?? pois}
          onClose={() => { setShowMap(false); setMapPois(null); setMapTargetId(undefined); }}
          zoneName={zoneName}
          lang={lang}
          targetId={mapTargetId}
        />
      )}

      {selectedItem && (
        <PoiDetailModal
          item={selectedItem}
          lang={lang}
          onClose={() => setSelectedItem(null)}
          onOpenMap={() => {
            const fullPoi = pois.find(p => p.id === selectedItem.id);
            openMapFor(fullPoi ? [fullPoi] : null, selectedItem.id);
          }}
        />
      )}
    </div>
  );
}
