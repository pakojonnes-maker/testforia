import React from 'react';
import { getTranslation } from '../../lib/i18n';
import { LanguageSwitcher } from '../Header';
import CategoryChipRail from './CategoryChipRail';
import ExperienceToggles from './ExperienceToggles';

interface ExploreTopBarProps {
  lang: string;
  onLanguageChange?: (lang: string) => void;
  cityName: string;
  isHomeZone: boolean;
  homeCityName: string;
  onOpenSearch: () => void;
  onGoHome: () => void;
  categories: string[];
  activeCategory: string;
  onCategoryChange: (c: string) => void;
  /** Category chips are hidden until the guest taps the tune icon — they
   * shouldn't clutter the map by default (see ExploreSection). */
  filtersOpen: boolean;
  onToggleFilters: () => void;
  free: boolean;
  paid: boolean;
  onToggleFree: () => void;
  onTogglePaid: () => void;
}

// Collapsed search trigger (opens ExploreSearchPanel) + the "back to my area"
// shortcut when browsing another city + toggles + category chips, all
// floating over the map. ExploreSection wraps this in the pointer-events
// pass-through container so the map keeps panning in the gaps between rows.
//
// Rounded pill chrome here is a deliberate exception to the app's usual 0px
// flat system — this is the floating map UI, Airbnb-style, per the user's
// reference mockup; the sheet/cards below keep the flat/bordered system.
export default function ExploreTopBar({
  lang, onLanguageChange, cityName, isHomeZone, homeCityName, onOpenSearch, onGoHome,
  categories, activeCategory, onCategoryChange, filtersOpen, onToggleFilters,
  free, paid, onToggleFree, onTogglePaid,
}: ExploreTopBarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-1 bg-surface-container-lowest border border-on-background/10 rounded-2xl pl-4 pr-2 py-1">
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex-1 min-w-0 flex items-center gap-3 py-1.5 text-left"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[20px] shrink-0">search</span>
            <span className="flex-1 min-w-0">
              <span className="block font-label-caps text-[11px] text-on-background font-bold uppercase tracking-wide">
                {getTranslation('explore_where_to', lang)}
              </span>
              <span className="block font-body-md text-body-md text-on-surface-variant truncate">{cityName}</span>
            </span>
          </button>
          <span className="w-px h-8 bg-on-background/10 shrink-0" aria-hidden="true" />
          <button
            type="button"
            onClick={onToggleFilters}
            aria-pressed={filtersOpen}
            aria-label={getTranslation('explore_filters', lang)}
            className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
              filtersOpen ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">tune</span>
          </button>
        </div>
        {!isHomeZone && (
          <button
            type="button"
            onClick={onGoHome}
            aria-label={homeCityName}
            title={homeCityName}
            className="shrink-0 w-11 h-11 flex items-center justify-center bg-surface-container-lowest border border-on-background/10 rounded-full text-primary"
          >
            <span className="material-symbols-outlined text-[20px]">home</span>
          </button>
        )}
        {/* Explore has no app header (see GuidebookPage.tsx) — the language
            switcher lives here instead, same corner it always sat in. */}
        <LanguageSwitcher lang={lang} onLanguageChange={onLanguageChange} variant="floating" />
      </div>
      <ExperienceToggles free={free} paid={paid} onToggleFree={onToggleFree} onTogglePaid={onTogglePaid} lang={lang} />
      {filtersOpen && categories.length > 0 && (
        <CategoryChipRail categories={categories} active={activeCategory} onChange={onCategoryChange} lang={lang} />
      )}
    </div>
  );
}
