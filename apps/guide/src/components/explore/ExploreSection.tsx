import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getTranslation } from '../../lib/i18n';
import { useExploreState } from '../../hooks/useExploreState';
import { useBackClosable } from '../../hooks/useDismissableLayer';
import { haversineKm, formatDistanceKm } from '../../lib/poiCategories';
import ExploreMap from './ExploreMap';
import BottomSheet from './BottomSheet';
import PoiCard from './PoiCard';
import ExploreTopBar from './ExploreTopBar';
import ExploreSearchPanel from './ExploreSearchPanel';
import PoiDetailModal, { type PoiDetailItem } from '../PoiDetailModal';
import type { GuidePoi, CitySummary, ZoneSummary } from '../../lib/types';

interface ExploreSectionProps {
  apartmentSlug: string;
  lang: string;
  onLanguageChange?: (lang: string) => void;
  zone: ZoneSummary; // the apartment's own (home) zone
  cities: CitySummary[];
  pois: GuidePoi[]; // home zone's POIs, from the main guidebook payload
  apartmentLatLng: [number, number] | null;
}

// El tirador de BottomSheet (.g-xhandle) mide 44px de alto, el área táctil mínima, con independencia de
// lo que lleve dentro. Se mantiene a mano en sintonía con BottomSheet.tsx porque es un marcado fijo, que no
// merece devolver una medida hacia arriba.
const SHEET_HANDLE_CHROME_PX = 44;

function toDetailItem(poi: GuidePoi, travelLabel: string | null): PoiDetailItem {
  return {
    id: poi.id,
    name: poi.name,
    description: poi.description,
    category: poi.category,
    image: poi.media?.[0]?.url,
    url: poi.google_maps_url,
    rating: poi.rating ?? undefined,
    travel_time_text: travelLabel ?? undefined,
    // travel_mode omitted on purpose: once travelLabel is a synthesized
    // straight-line distance (away-zone POI), a walk/drive marker next to it
    // would claim a precision the number doesn't have.
    access_type: poi.access_type,
    price_display: poi.price_display,
    duration_text: poi.duration_text,
    is_bookable: poi.is_bookable,
  };
}

// Lugares: el mapa a pantalla completa con la barra de búsqueda flotando encima y una hoja de tres alturas
// debajo. Es la misma composición en cualquier ancho: la guía es una columna de móvil (ver .g-app), así que
// ya no hay una versión de escritorio con panel lateral.
export default function ExploreSection({ apartmentSlug, lang, onLanguageChange, zone, cities, pois, apartmentLatLng }: ExploreSectionProps) {
  const explore = useExploreState({ apartmentSlug, lang, homeZone: zone, homePois: pois, homeCities: cities });
  const {
    activeZone, isHomeZone, zoneStatus, retry, setActiveZone,
    categories, activeCategory, setActiveCategory,
    access, toggleFree, togglePaid,
    visiblePois,
    selectedPoiId, selectedPoi, selectPoi, clearSelection,
    detailPoi, openDetail, closeDetail,
    snap, setSnap,
    search,
  } = explore;

  // Con la hoja cubriendo el mapa entero, el botón atrás del móvil tiene que
  // devolver el mapa antes de plantearse sacar al huésped de la guía.
  useBackClosable(snap === 'full', () => setSnap('half'));

  // Category chips stay hidden until the guest asks for them ("Filtros") —
  // the floating chrome over the map should default to just search + the
  // free/premium toggles, not a full row of category buttons.
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Lo que mide la barra flotante sirve para dos cosas: que el fitBounds no meta chinchetas debajo de ella y
  // que la hoja, abierta del todo, se detenga justo debajo (BottomSheet.topReserve).
  const topBarRef = useRef<HTMLDivElement>(null);
  const [topBarHeight, setTopBarHeight] = useState(0);
  useLayoutEffect(() => {
    const el = topBarRef.current;
    if (!el) return;
    const measure = () => setTopBarHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Home zone: the real per-apartment travel text the host/import curated.
  // Any other zone: the backend sends travel_time_text as null on purpose
  // (it's relative to THIS apartment, would be wrong or nonsensical for a
  // POI in a different city) — fall back to a straight-line distance instead.
  const travelLabelFor = (poi: GuidePoi): string | null => {
    if (isHomeZone) return poi.travel_time_text || null;
    if (!apartmentLatLng || poi.latitude == null || poi.longitude == null) return null;
    const km = haversineKm(apartmentLatLng[0], apartmentLatLng[1], poi.latitude, poi.longitude);
    return getTranslation('explore_travel_from_home', lang).replace('{distance}', formatDistanceKm(km));
  };

  // El número de cada fila es su posición en la lista visible, y es el mismo que lleva su chincheta.
  const numberOf = useMemo(() => new Map(visiblePois.map((p, i) => [p.id, i + 1])), [visiblePois]);

  // Peek shows the sheet's header content and NOTHING past it — not a
  // sliver of the next row, not empty space. Measured from the actual
  // rendered header (title row + first card, or the selected peek card, or
  // the status message), rather than a guessed constant: card height varies
  // with a 2-line title, a longer travel label, etc., and a hardcoded number
  // drifts out of sync with real content sooner or later. 150 is a close-enough
  // first guess so the sheet doesn't visibly jump on first paint while this
  // settles from its real ResizeObserver reading.
  const headerContentRef = useRef<HTMLDivElement>(null);
  const [headerContentHeight, setHeaderContentHeight] = useState(150);
  useLayoutEffect(() => {
    const el = headerContentRef.current;
    if (!el) return;
    const measure = () => setHeaderContentHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // Re-attach whenever the header's CONTENT identity changes (selection
    // toggles between "title row + card" and "selected card") — same element ref,
    // but ResizeObserver already re-fires on any size change regardless, so
    // this dependency is really just for the it's-a-new-DOM-subtree case.
  }, [selectedPoi?.id]);
  const peekHeight = SHEET_HANDLE_CHROME_PX + headerContentHeight;

  // Idle with results and nothing selected: the first card lives in the
  // sheet's fixed header (see peekHeight above) so "peek" shows exactly one
  // full card, not a sliver of a second one — the rest scroll normally.
  const status: 'loading' | 'error' | 'empty' | 'ready' =
    zoneStatus === 'loading' ? 'loading' : zoneStatus === 'error' ? 'error' : visiblePois.length === 0 ? 'empty' : 'ready';
  const showFirstCardInHeader = !selectedPoi && status === 'ready';
  const [firstVisiblePoi, ...restVisiblePois] = visiblePois;
  const scrollablePois = showFirstCardInHeader ? restVisiblePois : visiblePois;

  const openPoi = (poi: GuidePoi) => { selectPoi(poi.id); openDetail(poi.id); };

  const renderRow = (poi: GuidePoi) => (
    <PoiCard
      key={poi.id}
      poi={poi}
      lang={lang}
      variant="row"
      number={numberOf.get(poi.id)}
      selected={poi.id === selectedPoiId}
      onOpen={() => openPoi(poi)}
      travelLabel={travelLabelFor(poi)}
    />
  );

  // Cargando, error o sin resultados: el mensaje va en la cabecera de la hoja, que es lo único que se ve con
  // la hoja abajo (dentro de la lista quedaba oculto justo cuando el huésped más lo necesita).
  const statusBlock = status === 'ready' ? null : (
    <div className="g-empty g-empty-sheet" role={status === 'error' ? 'alert' : 'status'}>
      {status === 'loading' && <p>{getTranslation('explore_loading_city', lang).replace('{city}', activeZone.name)}</p>}
      {status === 'error' && (
        <>
          <p>{getTranslation('explore_city_error', lang)}</p>
          <button type="button" className="g-pill line" onClick={retry}>{getTranslation('explore_retry', lang)}</button>
        </>
      )}
      {status === 'empty' && <p>{getTranslation('explore_filters_empty', lang)}</p>}
    </div>
  );

  return (
    <div className="relative h-full overflow-hidden">
      <ExploreMap
        pois={visiblePois}
        zone={activeZone}
        selectedPoiId={selectedPoiId}
        onSelectPoi={selectPoi}
        homeLatLng={apartmentLatLng}
        selectedCaption={selectedPoi ? travelLabelFor(selectedPoi) : null}
        topInset={topBarHeight}
        bottomInset={peekHeight}
      />

      {/* pointer-events-none en el envoltorio y auto en la barra: el mapa sigue pudiendo arrastrarse y
          hacer zoom a través del margen transparente que la rodea. */}
      <div ref={topBarRef} data-no-tab-swipe className="g-mtop-wrap">
        <ExploreTopBar
          lang={lang}
          onLanguageChange={onLanguageChange}
          cityName={activeZone.name}
          isHomeZone={isHomeZone}
          homeCityName={zone.name}
          onOpenSearch={() => { search.setQuery(''); search.setOpen(true); }}
          onGoHome={() => setActiveZone(zone.slug)}
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen(v => !v)}
          free={access.free}
          paid={access.paid}
          onToggleFree={toggleFree}
          onTogglePaid={togglePaid}
        />
      </div>

      {search.open && (
        <ExploreSearchPanel
          lang={lang}
          query={search.query}
          onQueryChange={search.setQuery}
          cityResults={search.cityResults}
          poiResults={search.poiResults}
          activeZoneSlug={activeZone.slug}
          activeZoneName={activeZone.name}
          onSelectCity={(slug) => { setActiveZone(slug); search.setOpen(false); }}
          onSelectPoi={(id) => { selectPoi(id); openDetail(id); search.setOpen(false); }}
          onClose={() => search.setOpen(false)}
        />
      )}

      <BottomSheet
        snap={snap}
        onSnapChange={setSnap}
        peekHeight={peekHeight}
        topReserve={topBarHeight}
        toggleLabel={getTranslation('explore_drag_hint', lang)}
        header={
          <div ref={headerContentRef}>
            {selectedPoi ? (
              <div className="g-peekrow">
                <PoiCard
                  poi={selectedPoi}
                  lang={lang}
                  variant="peek"
                  selected
                  number={numberOf.get(selectedPoi.id)}
                  onOpen={() => openDetail(selectedPoi.id)}
                  travelLabel={travelLabelFor(selectedPoi)}
                />
                <button type="button" className="g-back" onClick={clearSelection}>
                  {getTranslation('close', lang)}
                </button>
              </div>
            ) : (
              <>
                <div className="g-sheet-h">
                  <h2 className="g-h2">{getTranslation('explore_places_title', lang).replace('{city}', activeZone.name)}</h2>
                  {status !== 'loading' && status !== 'error' && (
                    <span className="g-meta">
                      {getTranslation('explore_results_count', lang).replace('{count}', String(visiblePois.length))}
                    </span>
                  )}
                </div>
                {statusBlock}
                {/* Only the FIRST card sits in the fixed header — peek shows
                    exactly one complete card, not a sliver of a second one
                    (see peekHeight above). The rest scroll normally below. */}
                {showFirstCardInHeader && renderRow(firstVisiblePoi)}
              </>
            )}
          </div>
        }
      >
        <div className="g-plist">{scrollablePois.map(renderRow)}</div>
      </BottomSheet>

      {detailPoi && (
        <PoiDetailModal item={toDetailItem(detailPoi, travelLabelFor(detailPoi))} lang={lang} onClose={closeDetail} onOpenMap={closeDetail} />
      )}
    </div>
  );
}
