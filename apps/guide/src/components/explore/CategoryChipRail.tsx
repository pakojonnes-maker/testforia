import React from 'react';
import { getTranslation, getCategoryLabel } from '../../lib/i18n';
import { getCategoryIcon } from '../../lib/poiCategories';

interface CategoryChipRailProps {
  /** Raw category values present in the active zone, already canonically ordered — see useExploreState. */
  categories: string[];
  active: string; // 'all' or a category value
  onChange: (category: string) => void;
  lang: string;
}

// .hide-scrollbar + data-no-tab-swipe are both required here: this is a
// horizontal scroller sitting inside the Explore tab, which otherwise the
// GuidebookPage tab-swipe gesture would try to hijack (see
// SWIPE_IGNORE_SELECTOR in GuidebookPage.tsx).
export default function CategoryChipRail({ categories, active, onChange, lang }: CategoryChipRailProps) {
  const items = ['all', ...categories];
  return (
    <div className="hide-scrollbar flex gap-2 overflow-x-auto" data-no-tab-swipe>
      {items.map(cat => {
        const isActive = cat === active;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            aria-pressed={isActive}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 border font-label-caps text-label-caps uppercase tracking-widest whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-surface-container-lowest text-on-surface-variant border-on-background/10'
            }`}
          >
            {cat !== 'all' && <span className="material-symbols-outlined text-[16px]">{getCategoryIcon(cat)}</span>}
            {cat === 'all' ? getTranslation('filter_all', lang) : getCategoryLabel(cat, lang)}
          </button>
        );
      })}
    </div>
  );
}
