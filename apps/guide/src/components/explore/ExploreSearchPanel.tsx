import { getTranslation } from '../../lib/i18n';
import type { CitySummary, GuidePoi } from '../../lib/types';
import useDismissableLayer from '../../hooks/useDismissableLayer';
import Layer from '../Layer';

interface ExploreSearchPanelProps {
  lang: string;
  query: string;
  onQueryChange: (q: string) => void;
  cityResults: CitySummary[];
  poiResults: GuidePoi[];
  activeZoneSlug: string;
  activeZoneName: string;
  onSelectCity: (slug: string) => void;
  onSelectPoi: (id: string) => void;
  onClose: () => void;
}

// Misma promesa que el resto de capas (WelcomeModal, PoiDetailModal…): Escape y el botón atrás del móvil
// cierran, y con ella abierta no hay swipe entre pestañas. Pantalla completa: arriba el campo y «Cancelar»,
// debajo las ciudades de la región y, si hay texto, los lugares de la ciudad activa que coinciden.
export default function ExploreSearchPanel({
  lang, query, onQueryChange, cityResults, poiResults,
  activeZoneSlug, activeZoneName, onSelectCity, onSelectPoi, onClose,
}: ExploreSearchPanelProps) {
  useDismissableLayer(true, onClose);
  const placeholder = getTranslation('explore_search_in_city', lang).replace('{city}', activeZoneName);
  const noResults = getTranslation('explore_no_results', lang).replace('{query}', query);

  return (
    <Layer lang={lang}>
      <div data-no-tab-swipe className="g-full" role="dialog" aria-modal="true" aria-label={getTranslation('explore_where_to', lang)}>
        <div className="g-srow">
          <label className="sr" htmlFor="g-explore-q">{placeholder}</label>
          {/* type="text" y no "search": el navegador pinta su propia «×» de borrar dentro de un campo search,
              y aquí no hay iconos. inputMode/enterKeyHint le dan al móvil el teclado de búsqueda igualmente. */}
          <div className="g-sinput">
            <input
              id="g-explore-q"
              autoFocus
              type="text"
              inputMode="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={placeholder}
              autoComplete="off"
              autoCorrect="off"
            />
          </div>
          <button type="button" className="g-back" onClick={onClose}>{getTranslation('explore_cancel_search', lang)}</button>
        </div>

        {(cityResults.length > 0 || !query) && (
          <section className="g-ssec">
            <h2 className="g-kd">{getTranslation('explore_cities_title', lang)}</h2>
            {cityResults.map(city => (
              <button
                key={city.slug}
                type="button"
                onClick={() => onSelectCity(city.slug)}
                aria-current={city.slug === activeZoneSlug ? 'true' : undefined}
                className={`g-city${city.slug === activeZoneSlug ? ' on' : ''}`}
              >
                <span className="nm">
                  <b>{city.name}</b>
                  {city.is_home && <em>({getTranslation('explore_home_city_badge', lang)})</em>}
                </span>
                <small>{getTranslation('explore_results_count', lang).replace('{count}', String(city.poi_count))}</small>
              </button>
            ))}
          </section>
        )}

        {query && (
          <section className="g-ssec">
            <h2 className="g-kd">{getTranslation('explore_places_title', lang).replace('{city}', activeZoneName)}</h2>
            {poiResults.length === 0 ? (
              <p className="g-p g-ssec-empty">{noResults}</p>
            ) : (
              poiResults.map(poi => (
                <button key={poi.id} type="button" className="g-place" onClick={() => onSelectPoi(poi.id)}>
                  {poi.name}
                </button>
              ))
            )}
          </section>
        )}
      </div>
    </Layer>
  );
}
