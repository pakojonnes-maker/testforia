import React, { useLayoutEffect, useRef, useState } from 'react';
import { getTranslation } from '../../lib/i18n';
import { useExploreState } from '../../hooks/useExploreState';
import { useMediaQuery } from '../../hooks/useMediaQuery';
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

// BottomSheet's own drag-handle chrome around whatever `header` it's given:
// the handle button is min-h-11, i.e. the 44px minimum touch target, fixed
// regardless of header content. Kept in sync with BottomSheet.tsx by hand since
// it's simple, unchanging markup, not worth threading a measured value back up
// for.
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
    // straight-line distance (away-zone POI), a walk/drive icon next to it
    // would claim a precision the number doesn't have.
    access_type: poi.access_type,
    price_display: poi.price_display,
    duration_text: poi.duration_text,
    is_bookable: poi.is_bookable,
  };
}

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

  // No sheet on desktop (see the two return branches below) — a static side
  // panel instead, same as Airbnb's own map view. matchMedia rather than a
  // Tailwind-only trick because the branch changes which components mount
  // (BottomSheet vs a plain <aside>), not just their styling.
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // Con la hoja cubriendo el mapa entero, el botón atrás del móvil tiene que
  // devolver el mapa antes de plantearse sacar al huésped de la guía.
  useBackClosable(!isDesktop && snap === 'full', () => setSnap('half'));

  // Category chips stay hidden until the guest asks for them (tune icon) —
  // the floating chrome over the map should default to just search + the
  // free/premium toggles, not a full row of category buttons.
  const [filtersOpen, setFiltersOpen] = useState(false);

  const topBarRef = useRef<HTMLDivElement>(null);
  const [topBarHeight, setTopBarHeight] = useState(0);
  useLayoutEffect(() => {
    if (isDesktop) return; // fitBounds padding only matters for the floating mobile bar
    const el = topBarRef.current;
    if (!el) return;
    const measure = () => setTopBarHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isDesktop]);

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

  // Peek shows the sheet's header content and NOTHING past it — not a
  // sliver of the next row, not empty space. Measured from the actual
  // rendered header (count row + first card, or the selected peek card),
  // rather than a guessed constant: card height varies with a 2-line title,
  // a longer travel label, etc., and a hardcoded number drifts out of sync
  // with real content sooner or later. 98 is a close-enough first guess
  // (matches one row card) so the sheet doesn't visibly jump on first paint
  // while this settles from its real ResizeObserver reading.
  const headerContentRef = useRef<HTMLDivElement>(null);
  const [headerContentHeight, setHeaderContentHeight] = useState(98);
  useLayoutEffect(() => {
    if (isDesktop) return;
    const el = headerContentRef.current;
    if (!el) return;
    const measure = () => setHeaderContentHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // Re-attach whenever the header's CONTENT identity changes (selection
    // toggles between "count row" and "selected card") — same element ref,
    // but ResizeObserver already re-fires on any size change regardless, so
    // this dependency is really just for the it's-a-new-DOM-subtree case.
  }, [isDesktop, selectedPoi?.id]);
  const peekHeight = SHEET_HANDLE_CHROME_PX + headerContentHeight;

  // Idle with results and nothing selected: the first card lives in the
  // sheet's fixed header (see peekHeight above) so "peek" shows exactly one
  // full card, not a sliver of a second one — the rest scroll normally.
  const showFirstCardInHeader = !selectedPoi && zoneStatus === 'idle' && visiblePois.length > 0;
  const [firstVisiblePoi, ...restVisiblePois] = visiblePois;
  const scrollablePois = showFirstCardInHeader ? restVisiblePois : visiblePois;

  const topBar = (
    <ExploreTopBar
      lang={lang}
      onLanguageChange={onLanguageChange}
      cityName={activeZone.name}
      isHomeZone={isHomeZone}
      homeCityName={zone.name}
      onOpenSearch={() => search.setOpen(true)}
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
  );

  const searchPanel = search.open && (
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
  );

  const detailModal = detailPoi && (
    <PoiDetailModal item={toDetailItem(detailPoi, travelLabelFor(detailPoi))} lang={lang} onClose={closeDetail} />
  );

  // Shared between mobile (inside BottomSheet's scrollable children) and
  // desktop (inside <aside>, the full list — desktop has no peek/header
  // split, so it always gets the complete, unsliced list). Status/empty
  // states rendered once regardless of which list is passed in.
  const renderPoiRows = (poisToShow: GuidePoi[]) => (
    <>
      {zoneStatus === 'loading' && (
        <p className="p-6 text-center font-body-md text-body-md text-on-surface-variant">
          {getTranslation('explore_loading_city', lang).replace('{city}', activeZone.name)}
        </p>
      )}
      {zoneStatus === 'error' && (
        <div className="p-6 flex flex-col items-center gap-3 text-center">
          <p className="font-body-md text-body-md text-on-surface-variant">{getTranslation('explore_city_error', lang)}</p>
          <button
            type="button"
            onClick={retry}
            className="px-4 py-2 border border-primary text-primary font-label-caps text-label-caps uppercase"
          >
            {getTranslation('explore_retry', lang)}
          </button>
        </div>
      )}
      {zoneStatus === 'idle' && visiblePois.length === 0 && (
        <p className="p-6 text-center font-body-md text-body-md text-on-surface-variant">
          {getTranslation('explore_filters_empty', lang)}
        </p>
      )}
      {zoneStatus === 'idle' && poisToShow.map(poi => (
        <PoiCard
          key={poi.id}
          poi={poi}
          lang={lang}
          variant="row"
          selected={poi.id === selectedPoiId}
          onOpen={() => { selectPoi(poi.id); openDetail(poi.id); }}
          travelLabel={travelLabelFor(poi)}
        />
      ))}
    </>
  );

  if (isDesktop) {
    return (
      <div className="flex h-full">
        <aside className="w-[420px] shrink-0 border-r border-on-background/10 overflow-y-auto flex flex-col">
          <div className="p-3 border-b border-on-background/10 shrink-0">{topBar}</div>
          <div className="p-3 flex flex-col gap-2">{renderPoiRows(visiblePois)}</div>
        </aside>
        <div className="relative flex-1">
          <ExploreMap
            pois={visiblePois}
            zone={activeZone}
            selectedPoiId={selectedPoiId}
            onSelectPoi={selectPoi}
            topInset={16}
            bottomInset={16}
          />
        </div>
        {searchPanel}
        {detailModal}
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <ExploreMap
        pois={visiblePois}
        zone={activeZone}
        selectedPoiId={selectedPoiId}
        onSelectPoi={selectPoi}
        topInset={topBarHeight}
        bottomInset={peekHeight}
      />

      {/* pointer-events-none on the wrapper + pointer-events-auto on the bar
          itself lets the map still pan/zoom through the transparent margin
          around it. */}
      <div ref={topBarRef} data-no-tab-swipe className="absolute top-0 inset-x-0 z-20 p-3 pointer-events-none">
        <div className="pointer-events-auto">{topBar}</div>
      </div>

      {searchPanel}

      <BottomSheet
        snap={snap}
        onSnapChange={setSnap}
        peekHeight={peekHeight}
        toggleLabel={getTranslation('explore_drag_hint', lang)}
        header={
          <div ref={headerContentRef}>
            {selectedPoi ? (
              <div className="px-3 pb-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <PoiCard
                    poi={selectedPoi}
                    lang={lang}
                    variant="peek"
                    selected
                    onOpen={() => openDetail(selectedPoi.id)}
                    travelLabel={travelLabelFor(selectedPoi)}
                  />
                </div>
                <button
                  type="button"
                  onClick={clearSelection}
                  aria-label={getTranslation('close', lang)}
                  className="w-8 h-8 shrink-0 flex items-center justify-center border border-on-background/10 bg-surface-container-lowest"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ) : (
              <>
                <div className="px-4 pb-1 flex items-center justify-between gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {getTranslation('explore_results_count', lang).replace('{count}', String(visiblePois.length))}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant/70">
                    {getTranslation('explore_drag_hint', lang)}
                  </span>
                </div>
                {/* Only the FIRST card sits in the fixed header — peek shows
                    exactly one complete card, not a sliver of a second one
                    (see peekHeight above). The rest scroll normally below. */}
                {showFirstCardInHeader && (
                  <div className="px-3 pb-2">
                    <PoiCard
                      poi={firstVisiblePoi}
                      lang={lang}
                      variant="row"
                      onOpen={() => { selectPoi(firstVisiblePoi.id); openDetail(firstVisiblePoi.id); }}
                      travelLabel={travelLabelFor(firstVisiblePoi)}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        }
      >
        <div className="p-3 flex flex-col gap-2">{renderPoiRows(scrollablePois)}</div>
      </BottomSheet>

      {detailModal}
    </div>
  );
}
