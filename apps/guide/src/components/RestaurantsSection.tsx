import React from 'react';
import { getTranslation } from '../lib/i18n';
import MediaPlaceholder, { isRealImage } from './MediaPlaceholder';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  cuisine_type: string;
  tier: string;
  cover_image: string;
  address: string | null;
  city: string | null;
  country: string | null;
}

interface RestaurantsSectionProps {
  restaurants: Restaurant[];
  zoneName: string;
  lang: string;
  onIntent: (type: 'restaurant', id: string, action: string) => void;
  /** Construye la URL del menú de un restaurante con la atribución del guidebook. */
  buildRestaurantUrl: (slug: string) => string;
}

// "The Table" (Stitch): columna editorial única de tarjetas verticales — foto a
// sangre arriba con su stamped badge, eyebrow de cocina, titular serif y CTA de
// ancho completo a la carta en vídeo. Sustituye a las filas alternadas
// izquierda/derecha: en móvil (donde está el 95% de los huéspedes) esa
// alternancia no se percibía y el CTA quedaba como un botón suelto pequeño.
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

  // Sin lat/long (la tabla restaurants no las tiene, ver workerGuide.js) — Google
  // Maps acepta texto libre como destination=, así que no hace falta geocodificar.
  const openDirections = (r: Restaurant) => {
    onIntent('restaurant', r.id, 'click_directions');
    const destination = [r.name, r.address, r.city, r.country].filter(Boolean).join(', ');
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`, '_blank');
  };

  return (
    <div className="flex flex-col gap-stack-lg">
      <section className="flex flex-col gap-2 max-w-2xl mx-auto w-full">
        <h2 className="font-display-xl text-display-lg md:text-display-xl text-on-background uppercase tracking-wide">
          {getTranslation('restaurants_title', lang).replace('{zone}', zoneName || getTranslation('surroundings_fallback', lang))}
        </h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">{getTranslation('restaurants_default_description', lang)}</p>
      </section>

      <div className="horizon-rule max-w-2xl mx-auto" />

      <div className="flex flex-col gap-stack-lg max-w-2xl mx-auto w-full">
        {restaurants.map((r) => {
          const isFeatured = r.id === featuredId;
          const cuisineLabel = r.cuisine_type ? getTranslation('cuisine_label', lang).replace('{cuisine}', r.cuisine_type) : '';

          return (
            <article key={r.id} className="bg-surface-container-lowest border border-on-background/10 flex flex-col w-full">
              <div className="relative w-full h-[240px] md:h-[300px] shrink-0">
                {isRealImage(r.cover_image) ? (
                  <img className="w-full h-full object-cover" src={r.cover_image} alt={r.name} />
                ) : (
                  <MediaPlaceholder label={r.name} />
                )}
                {isFeatured && (
                  <div className="absolute top-4 right-4 stamped-badge-1 bg-tertiary-fixed-dim text-on-tertiary-fixed font-mono-badge text-mono-badge px-2.5 py-1.5 border border-on-background/20 uppercase">
                    {getTranslation('premium_badge', lang)}
                  </div>
                )}
              </div>
              <div className="p-6 flex flex-col items-start">
                <span className="font-label-caps text-label-caps text-secondary uppercase mb-2">
                  {cuisineLabel || getTranslation('category_restaurants', lang)}
                </span>
                <h3 className={`font-headline-md text-headline-md mb-5 ${isFeatured ? 'text-primary' : 'text-on-background'}`}>{r.name}</h3>
                <div className="flex gap-3 w-full">
                  {/* fontSize inline: la hoja de Material Symbols fija 24px sobre
                      la misma especificidad que el utility, y un icono de 24px
                      junto a un label de 12px se come el botón. */}
                  <button
                    onClick={() => openMenu(r)}
                    className="flex-1 bg-primary text-on-primary font-label-caps text-label-caps uppercase py-4 hover:bg-primary-container transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}>play_circle</span>
                    {getTranslation('view_menu', lang)}
                  </button>
                  <button
                    onClick={() => openDirections(r)}
                    className="flex-1 border border-primary text-primary font-label-caps text-label-caps uppercase py-4 hover:bg-primary hover:text-on-primary transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>directions</span>
                    {getTranslation('directions', lang)}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
