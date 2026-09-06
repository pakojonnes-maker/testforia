import React from 'react';
import { getTranslation } from '../lib/i18n';
import MediaPlaceholder, { isRealImage } from './MediaPlaceholder';
import { LanguageSwitcher } from './Header';

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
  onLanguageChange?: (lang: string) => void;
  onIntent: (type: 'restaurant', id: string, action: string) => void;
  /** Construye la URL del menú de un restaurante con la atribución del guidebook. */
  buildRestaurantUrl: (slug: string) => string;
}

// "The Table" (Stitch): columna editorial única de tarjetas verticales — foto a
// sangre arriba con su stamped badge, eyebrow de cocina, titular serif y CTA de
// ancho completo a la carta en vídeo. Sustituye a las filas alternadas
// izquierda/derecha: en móvil (donde está el 95% de los huéspedes) esa
// alternancia no se percibía y el CTA quedaba como un botón suelto pequeño.
export default function RestaurantsSection({ restaurants, zoneName, lang, onLanguageChange, onIntent, buildRestaurantUrl }: RestaurantsSectionProps) {
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
        {/* El título va arriba del todo (sin el hueco que antes reservaba el
            selector de idioma flotante) y la bandera se integra en su misma
            fila — a diferencia de Info/Chat, aquí no hay una foto de portada
            debajo de la que "flotar". items-start la alinea con la primera
            línea del título aunque este llegue a ocupar 3 en móvil.
            hyphens-auto (+ min-w-0, imprescindible dentro de un flex item para
            que el corte llegue a aplicarse) evita que una palabra suelta larga
            ("BENALMÁDENA", "RESTAURANTES") desborde su propia caja y se pinte
            por debajo del círculo — flexbox reserva el ancho para la bandera,
            pero sin esto una palabra que no cabe entera sigue desbordando en
            vez de partirse. Con guion en vez de break-words a secas: parte por
            sílaba real (según el idioma del <html>, que ya fija GuidebookPage)
            en lugar de a mitad de palabra sin más. break-words de respaldo
            para idiomas sin diccionario de guionado (zh/ja/ko/ar). */}
        <div className="flex items-start gap-4">
          <h2 className="flex-1 min-w-0 hyphens-auto break-words font-display-xl text-display-lg md:text-display-xl text-primary uppercase tracking-wide"
            lang={lang}
          >
            {getTranslation('restaurants_title', lang).replace('{zone}', zoneName || getTranslation('surroundings_fallback', lang))}
          </h2>
          <LanguageSwitcher lang={lang} onLanguageChange={onLanguageChange} variant="floating" />
        </div>
        {/* Divulgación de la relación comercial. Una recomendación retribuida que
            no se identifica como tal es publicidad encubierta (Directiva
            2005/29/CE, art. 7.2 y anexo I.11; en España, TRLGDCU y Ley 3/1991).
            El backend ya registra estos clics como `guide_affiliate_intents`. */}
        <p className="font-body-sm text-[11px] leading-snug text-on-surface-variant/60">
          {getTranslation('affiliate_disclosure', lang)}
        </p>
      </section>

      <div className="horizon-rule max-w-2xl mx-auto" />

      <div className="flex flex-col gap-stack-lg max-w-2xl mx-auto w-full">
        {restaurants.map((r) => {
          const isFeatured = r.id === featuredId;
          const cuisineLabel = r.cuisine_type ? getTranslation('cuisine_label', lang).replace('{cuisine}', r.cuisine_type) : '';

          return (
            <article key={r.id} className="bg-surface-container-lowest border border-on-background/10 flex flex-col w-full">
              {/* Arco a juego con las tarjetas de guías/experiencias (InfoSection,
                  ServicesSection) — antes era una foto rectangular a sangre, la
                  única de la app sin el tratamiento en arco. */}
              <div className="relative w-full aspect-[4/5] p-2 shrink-0">
                {isRealImage(r.cover_image) ? (
                  <img className="w-full h-full object-cover arch-mask" src={r.cover_image} alt={r.name} />
                ) : (
                  <MediaPlaceholder label={r.name} className="arch-mask" />
                )}
                {isFeatured && (
                  <div className="absolute top-5 right-5 stamped-badge-1 bg-tertiary-fixed-dim text-on-tertiary-fixed font-mono-badge text-mono-badge px-2.5 py-1.5 border border-on-background/20 uppercase">
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
