import { useMemo, useState } from 'react';
import { getTranslation } from '../lib/i18n';
import type { GuideRestaurant } from '../lib/types';
import PhotoFigure from './PhotoFigure';
import { LanguageSwitcher } from './Header';
import RestaurantReserveModal from './RestaurantReserveModal';
import type { ReserveChannelAction } from './RestaurantReserveModal';

interface RestaurantsSectionProps {
  restaurants: GuideRestaurant[];
  zoneName: string;
  lang: string;
  onLanguageChange?: (lang: string) => void;
  onIntent: (type: 'restaurant', id: string, action: string) => void;
  /** Construye la URL del menú de un restaurante con la atribución del guidebook. */
  buildRestaurantUrl: (slug: string) => string;
}

const ALL = 'all';

const cuisineOf = (r: GuideRestaurant) => r.cuisine_type?.trim() ?? '';
// "Marisco" y "marisco " son la misma categoría: el texto lo escribe una persona
// en el admin y no debe partir el filtro en dos pestañas.
const cuisineKey = (r: GuideRestaurant) => cuisineOf(r).toLowerCase();

// Dónde comer: título con el idioma a su lado, la zona, la divulgación comercial, una fila de chips por tipo
// de cocina y una columna de tarjetas verticales — foto en arco a ancho de columna (o la inicial, si no hay
// foto o no carga), cocina, nombre y las acciones. «Reservar» sale solo si el restaurante tiene algún canal
// de reserva; «Ver carta en vídeo», solo si es cliente de VisualTaste (tiene slug).
export default function RestaurantsSection({ restaurants, zoneName, lang, onLanguageChange, onIntent, buildRestaurantUrl }: RestaurantsSectionProps) {
  const [activeKey, setActiveKey] = useState(ALL);
  const [reserving, setReserving] = useState<GuideRestaurant | null>(null);

  const list = restaurants ?? [];

  // Categorías = los tipos de cocina de los restaurantes asignados a la zona, en
  // el orden en que aparecen (que ya es el de ranking del backend), y con la
  // primera grafía vista como etiqueta.
  const categories = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const r of restaurants ?? []) {
      const label = cuisineOf(r);
      if (label && !byKey.has(cuisineKey(r))) byKey.set(cuisineKey(r), label);
    }
    return Array.from(byKey, ([key, label]) => ({ key, label }));
  }, [restaurants]);

  // La fila de filtros sólo aparece si alguna categoría deja fuera a algún
  // restaurante: con todos en la misma cocina, "Todos | Marisco" no filtraría nada.
  const canFilter = categories.some(c => list.some(r => cuisineKey(r) !== c.key));
  // Si la categoría activa desaparece (otro idioma, datos nuevos), vuelve a "Todos".
  const selected = canFilter && categories.some(c => c.key === activeKey) ? activeKey : ALL;
  const visible = selected === ALL ? list : list.filter(r => cuisineKey(r) === selected);

  const openMenu = (r: GuideRestaurant) => {
    onIntent('restaurant', r.id, 'click_menu');
    if (r.slug) window.open(buildRestaurantUrl(r.slug), '_blank');
  };

  // Sin lat/long (la tabla restaurants no las tiene, ver workerGuide.js) — Google
  // Maps acepta texto libre como destination=, así que no hace falta geocodificar.
  // Si el restaurante tiene su enlace exacto de Maps (restaurant_details), gana.
  const openDirections = (r: GuideRestaurant) => {
    onIntent('restaurant', r.id, 'click_directions');
    const destination = [r.name, r.address, r.city, r.country].filter(Boolean).join(', ');
    const url = r.maps_url || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <div className="g-titlebar">
        <h1 className="g-h1">{getTranslation('eat_heading', lang)}</h1>
        <LanguageSwitcher lang={lang} onLanguageChange={onLanguageChange} />
      </div>
      <p className="g-p g-sub">
        {getTranslation('restaurants_title', lang).replace('{zone}', zoneName || getTranslation('surroundings_fallback', lang))}
      </p>
      {/* Divulgación de la relación comercial. Una recomendación retribuida que
          no se identifica como tal es publicidad encubierta (Directiva
          2005/29/CE, art. 7.2 y anexo I.11; en España, TRLGDCU y Ley 3/1991).
          El backend ya registra estos clics como `guide_affiliate_intents`. */}
      <p className="g-disc">{getTranslation('affiliate_disclosure', lang)}</p>

      {canFilter && (
        // .hide-scrollbar + data-no-tab-swipe: es un scroller horizontal dentro
        // de una pestaña que el gesto de swipe de GuidebookPage intentaría
        // secuestrar (ver SWIPE_IGNORE_SELECTOR), igual que CategoryChipRail.
        <div
          role="group"
          aria-label={getTranslation('tab_restaurants', lang)}
          data-no-tab-swipe
          className="g-filters hide-scrollbar"
        >
          {[{ key: ALL, label: getTranslation('filter_all', lang) }, ...categories].map(tab => {
            const isActive = tab.key === selected;
            return (
              <button
                key={tab.key}
                type="button"
                aria-pressed={isActive}
                onClick={e => {
                  setActiveKey(tab.key);
                  // Con muchas cocinas la fila desborda: acerca la elegida al centro.
                  e.currentTarget.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
                }}
                className={`g-chip${isActive ? ' on' : ''}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {list.length === 0 ? (
        <div className="g-empty g-empty-page">
          <p>{getTranslation('no_restaurants', lang)}</p>
        </div>
      ) : (
        <div className="g-cards">
          {visible.map((r, index) => {
            const eyebrow = cuisineOf(r) || getTranslation('category_restaurants', lang);
            const description = r.description?.trim();
            return (
              <article key={r.id} className="g-card">
                <PhotoFigure className="g-arch" src={r.cover_image} alt={r.name} name={r.name} eager={index === 0} />
                <div className="g-card-body">
                  <span className="g-eyebrow">{eyebrow}</span>
                  <h2 className="g-h2">{r.name}</h2>
                  {description && <p className="g-p g-clamp">{description}</p>}
                  <div className="g-btns">
                    {r.reservation && (
                      <button type="button" className="g-pill fill" onClick={() => setReserving(r)}>
                        {getTranslation('reserve', lang)}
                      </button>
                    )}
                    <button type="button" className="g-pill fill" onClick={() => openDirections(r)}>
                      {getTranslation('directions', lang)}
                    </button>
                  </div>
                  {/* La carta en vídeo sólo existe para los restaurantes que son
                      cliente de VisualTaste (tienen slug). Sigue registrando
                      click_menu: de ahí sale la atribución guía → carta. */}
                  {r.slug && (
                    <button type="button" className="g-pill line wide" onClick={() => openMenu(r)}>
                      {getTranslation('view_video_menu', lang)}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {reserving?.reservation && (
        <RestaurantReserveModal
          restaurant={reserving}
          reservation={reserving.reservation}
          lang={lang}
          onClose={() => setReserving(null)}
          onChannel={(action: ReserveChannelAction) => onIntent('restaurant', reserving.id, action)}
        />
      )}
    </>
  );
}
