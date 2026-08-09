import React from 'react';
import { getTranslation } from '../../lib/i18n';
import CategoryChipRail from './CategoryChipRail';
import ExperienceToggles from './ExperienceToggles';

interface ExploreTopBarProps {
  lang: string;
  cityName: string;
  isHomeZone: boolean;
  homeCityName: string;
  onOpenSearch: () => void;
  onGoHome: () => void;
  categories: string[];
  activeCategory: string;
  onCategoryChange: (c: string) => void;
  free: boolean;
  paid: boolean;
  onToggleFree: () => void;
  onTogglePaid: () => void;
}

// Collapsed search trigger (opens ExploreSearchPanel) + the "back to my area"
// shortcut when browsing another city + toggles + category chips, all
// floating over the map. ExploreSection wraps this in the pointer-events
// pass-through container so the map keeps panning in the gaps between rows.
export default function ExploreTopBar({
  lang, cityName, isHomeZone, homeCityName, onOpenSearch, onGoHome,
  categories, activeCategory, onCategoryChange,
  free, paid, onToggleFree, onTogglePaid,
}: ExploreTopBarProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex-1 min-w-0 flex items-center gap-2 bg-surface-container-lowest border border-on-background/10 px-3 py-2.5 text-left"
        >
          <span className="material-symbols-outlined text-on-surface-variant text-[20px] shrink-0">search</span>
          <span className="flex-1 min-w-0">
            <span className="block font-label-sm text-label-sm text-on-surface-variant">
              {getTranslation('explore_search_placeholder', lang)}
            </span>
            <span className="block font-headline-sm text-headline-sm text-on-background truncate">{cityName}</span>
          </span>
        </button>
        {!isHomeZone && (
          <button
            type="button"
            onClick={onGoHome}
            aria-label={homeCityName}
            title={homeCityName}
            className="shrink-0 w-11 h-11 flex items-center justify-center bg-surface-container-lowest border border-on-background/10 text-primary"
          >
            <span className="material-symbols-outlined text-[20px]">home</span>
          </button>
        )}
      </div>
      <ExperienceToggles free={free} paid={paid} onToggleFree={onToggleFree} onTogglePaid={onTogglePaid} lang={lang} />
      {categories.length > 0 && (
        <CategoryChipRail categories={categories} active={activeCategory} onChange={onCategoryChange} lang={lang} />
      )}
    </div>
  );
}
