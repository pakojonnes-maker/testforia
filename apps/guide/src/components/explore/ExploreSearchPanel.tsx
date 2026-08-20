import React from 'react';
import { getTranslation } from '../../lib/i18n';
import type { CitySummary, GuidePoi } from '../../lib/types';
import useDismissableLayer from '../../hooks/useDismissableLayer';

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

// Same overlay contract as the app's other modals (WelcomeModal, PoiDetailModal,
// ...): locks document.body scroll while mounted. That's independent of the
// Explore tab's own h-dvh/overflow-hidden shell (a different element), so it
// doesn't fight the tab-swipe contract described in GuidebookPage.tsx.
export default function ExploreSearchPanel({
  lang, query, onQueryChange, cityResults, poiResults,
  activeZoneSlug, activeZoneName, onSelectCity, onSelectPoi, onClose,
}: ExploreSearchPanelProps) {
  useDismissableLayer(true, onClose);

  return (
    <div data-no-tab-swipe className="fixed inset-0 z-[70] flex flex-col bg-surface-container-lowest">
      <div className="flex items-center gap-2 p-3 border-b border-on-background/10 shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-surface-container-low px-3 py-2.5">
          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={getTranslation('explore_search_in_city', lang).replace('{city}', activeZoneName)}
            className="flex-1 min-w-0 bg-transparent outline-none font-body-md text-body-md text-on-background placeholder:text-on-surface-variant"
          />
          {query && (
            <button type="button" onClick={() => onQueryChange('')} aria-label={getTranslation('close', lang)}>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">close</span>
            </button>
          )}
        </div>
        <button type="button" onClick={onClose} className="shrink-0 font-label-caps text-label-caps uppercase text-primary px-2">
          {getTranslation('explore_cancel_search', lang)}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <section className="p-4 flex flex-col gap-1">
          <h3 className="font-label-caps text-label-caps text-secondary uppercase tracking-widest mb-1">
            {getTranslation('explore_cities_title', lang)}
          </h3>
          {cityResults.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant py-2">
              {getTranslation('explore_no_results', lang).replace('{query}', query)}
            </p>
          ) : (
            cityResults.map(city => (
              <button
                key={city.slug}
                type="button"
                onClick={() => onSelectCity(city.slug)}
                className={`flex items-center justify-between gap-2 py-3 border-b border-on-background/10 text-left ${
                  city.slug === activeZoneSlug ? 'text-primary' : 'text-on-background'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[20px] shrink-0">location_city</span>
                  <span className="font-body-lg text-body-lg truncate">{city.name}</span>
                  {city.is_home && (
                    <span className="font-label-sm text-label-sm text-secondary shrink-0">
                      ({getTranslation('explore_home_city_badge', lang)})
                    </span>
                  )}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">
                  {getTranslation('explore_results_count', lang).replace('{count}', String(city.poi_count))}
                </span>
              </button>
            ))
          )}
        </section>

        {query && (
          <section className="p-4 flex flex-col gap-1 border-t border-on-background/10">
            <h3 className="font-label-caps text-label-caps text-secondary uppercase tracking-widest mb-1">
              {getTranslation('explore_places_title', lang).replace('{city}', activeZoneName)}
            </h3>
            {poiResults.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant py-2">
                {getTranslation('explore_no_results', lang).replace('{query}', query)}
              </p>
            ) : (
              poiResults.map(poi => (
                <button
                  key={poi.id}
                  type="button"
                  onClick={() => onSelectPoi(poi.id)}
                  className="flex items-center gap-2 py-3 border-b border-on-background/10 text-left"
                >
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant shrink-0">place</span>
                  <span className="font-body-md text-body-md text-on-background line-clamp-1">{poi.name}</span>
                </button>
              ))
            )}
          </section>
        )}
      </div>
    </div>
  );
}
