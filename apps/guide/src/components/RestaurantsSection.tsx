import React, { useMemo, useState } from 'react';
import { getTranslation } from '../lib/i18n';
import type { GuideRestaurant } from '../lib/types';
import MediaPlaceholder, { isRealImage } from './MediaPlaceholder';
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

// Botones de la tarjeta, medidos sobre la maqueta (Stitch "The Table"): los dos
// principales son SÓLIDOS y de la misma altura — antes uno era sólido y el otro
// con borde, y por eso la tarjeta no se parecía. `flex-auto` (no `flex-1`) porque
// en la maqueta el ancho sigue al contenido y el sobrante se reparte: con las
// etiquetas de 13 idiomas, un reparto fijo 50/50 partía "Wegbeschreibung" en dos
// líneas y dejaba "Reservar" flotando en una caja enorme.
const SOLID_BUTTON =
  'flex-auto flex items-center justify-center gap-2 bg-primary text-on-primary font-label-caps text-label-caps uppercase text-center py-5 px-4 hover:bg-primary-container transition-colors';
// Sólo la carta en vídeo (clientes de VisualTaste) va con borde: es la tercera
// acción, y con tres bloques sólidos apilados la tarjeta se volvería un muro azul.
const OUTLINE_BUTTON =
  'w-full flex items-center justify-center gap-2 border border-primary text-primary font-label-caps text-label-caps uppercase text-center py-5 px-4 hover:bg-primary hover:text-on-primary transition-colors';

// "The Table" (Stitch): columna editorial única de tarjetas verticales, sin
// cartulina — la foto en arco a todo el ancho de la columna sobre el fondo de la
// página, eyebrow de cocina, titular serif, descripción y botones sólidos.
// Encima, una fila de filtros por tipo de cocina.
//
// Sustituye a las filas alternadas izquierda/derecha: en móvil (donde está el 95%
// de los huéspedes) esa alternancia no se percibía y el CTA quedaba como un botón
// suelto pequeño.
export default function RestaurantsSection({ restaurants, zoneName, lang, onLanguageChange, onIntent, buildRestaurantUrl }: RestaurantsSectionProps) {
  const [activeKey, setActiveKey] = useState(ALL);
  const [reserving, setReserving] = useState<GuideRestaurant | null>(null);
  // Portadas que han fallado al cargar (404, R2 sin el objeto): caen al
  // MediaPlaceholder en vez de dejar el icono de imagen rota con el alt.
  const [brokenCovers, setBrokenCovers] = useState<ReadonlySet<string>>(() => new Set());

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

  if (list.length === 0) {
    return (
      <div className="text-center py-12 text-on-surface-variant">
        <span className="material-symbols-outlined text-5xl opacity-30">restaurant</span>
        <p className="mt-2 font-body-md text-body-md">{getTranslation('no_restaurants', lang)}</p>
      </div>
    );
  }

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

  const markCoverBroken = (id: string) => setBrokenCovers(prev => new Set(prev).add(id));

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

      {canFilter ? (
        // La raya fina bajo toda la fila y el subrayado grueso de la pestaña
        // activa son los de la maqueta; con filtros, esa raya hace de separador
        // y sobra el horizon-rule.
        // .hide-scrollbar + data-no-tab-swipe: es un scroller horizontal dentro
        // de una pestaña que el gesto de swipe de GuidebookPage intentaría
        // secuestrar (ver SWIPE_IGNORE_SELECTOR), igual que CategoryChipRail.
        <div
          role="group"
          aria-label={getTranslation('tab_restaurants', lang)}
          data-no-tab-swipe
          className="hide-scrollbar flex gap-8 overflow-x-auto border-b border-primary/30 pb-2 max-w-2xl mx-auto w-full"
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
                className={`shrink-0 pb-1 border-b-2 font-label-caps text-label-caps uppercase tracking-widest whitespace-nowrap transition-colors ${
                  isActive ? 'text-primary border-primary' : 'text-secondary border-transparent hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="horizon-rule max-w-2xl mx-auto" />
      )}

      <div className="flex flex-col gap-stack-lg max-w-2xl mx-auto w-full">
        {visible.map((r, index) => {
          const eyebrow = cuisineOf(r) || getTranslation('category_restaurants', lang);
          const description = r.description?.trim();
          const showCover = isRealImage(r.cover_image) && !brokenCovers.has(r.id);

          return (
            <article key={r.id} className="flex flex-col w-full">
              {/* Sin cartulina ni marco: la foto va directa sobre el fondo de la
                  página, a todo el ancho de la columna (17→248 px en la maqueta,
                  arco semicircular de radio ancho/2, proporción ~7:8). El arco es
                  el de InfoSection/ServicesSection (.arch-mask). A partir de md la
                  columna llega a 672 px y 7:8 daría una foto de 768 px de alto (el
                  viewport entero): ahí pasa a cuadrada, que además es una de las
                  proporciones donde .arch-mask sigue siendo un arco de verdad. */}
              <div className="relative w-full aspect-[7/8] md:aspect-square">
                {showCover ? (
                  <img
                    className="w-full h-full object-cover arch-mask"
                    src={r.cover_image ?? undefined}
                    alt={r.name}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    onError={() => markCoverBroken(r.id)}
                  />
                ) : (
                  <MediaPlaceholder label={r.name} className="arch-mask" />
                )}
              </div>
              <div className="pt-6 flex flex-col items-start">
                <span className="font-label-caps text-label-caps text-secondary uppercase mb-2">{eyebrow}</span>
                <h3 className="font-headline-md text-headline-md text-primary mb-3">{r.name}</h3>
                {description && (
                  <p className="font-body-md text-body-md text-on-surface-variant line-clamp-4">{description}</p>
                )}
                <div className={`flex flex-wrap gap-4 w-full ${description ? 'mt-8' : 'mt-4'}`}>
                  {/* fontSize inline: la hoja de Material Symbols fija 24px sobre
                      la misma especificidad que el utility, y un icono de 24px
                      junto a un label de 12px se come el botón. El icono va
                      DESPUÉS del texto, como en la maqueta (en RTL el flex lo
                      invierte solo). */}
                  {r.reservation && (
                    <button type="button" onClick={() => setReserving(r)} className={SOLID_BUTTON}>
                      {getTranslation('reserve', lang)}
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_month</span>
                    </button>
                  )}
                  <button type="button" onClick={() => openDirections(r)} className={SOLID_BUTTON}>
                    {getTranslation('directions', lang)}
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}>location_on</span>
                  </button>
                </div>
                {/* La carta en vídeo sólo existe para los restaurantes que son
                    cliente de VisualTaste (tienen slug). Sigue registrando
                    click_menu: de ahí sale la atribución guía → carta. */}
                {r.slug && (
                  <button type="button" onClick={() => openMenu(r)} className={`${OUTLINE_BUTTON} mt-4`}>
                    {getTranslation('view_video_menu', lang)}
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}>play_arrow</span>
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {reserving?.reservation && (
        <RestaurantReserveModal
          restaurant={reserving}
          reservation={reserving.reservation}
          lang={lang}
          onClose={() => setReserving(null)}
          onChannel={(action: ReserveChannelAction) => onIntent('restaurant', reserving.id, action)}
        />
      )}
    </div>
  );
}
