import React from 'react';
import { getCategoryLabel } from '../../lib/i18n';
import MediaPlaceholder, { isRealImage } from '../MediaPlaceholder';
import AccessBadge, { BookableBadge } from '../AccessBadge';
import type { GuidePoi } from '../../lib/types';

interface PoiCardProps {
  poi: GuidePoi;
  lang: string;
  /** `peek`: compact, lives in the sheet's always-visible header once a pin is selected. `row`: sheet's scrollable list. */
  variant: 'peek' | 'row';
  onOpen: () => void;
  /** Precomputed by the caller: poi.travel_time_text at home, or a haversine
   * distance phrase (explore_travel_from_home) elsewhere — see ExploreSection. */
  travelLabel?: string | null;
  selected?: boolean;
}

// One card, two contexts — matches the AccessBadge/BookableBadge pattern of a
// single component with a variant prop rather than two near-duplicates.
export default function PoiCard({ poi, lang, variant, onOpen, travelLabel, selected }: PoiCardProps) {
  const image = poi.media?.[0]?.url;
  const imgSizeClass = variant === 'peek' ? 'w-16 h-16' : 'w-20 h-20';
  // The peek card IS always the selected POI by construction (it's only ever
  // rendered for one) — showing a "selected" tint on it too would be
  // redundant with its position/close-button and just look like an
  // unexplained highlighted box. The tint earns its keep in the row list,
  // where it's the one visual cue for "this is the one you picked" among
  // everything else.
  const showSelectedTint = selected && variant === 'row';

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full flex items-stretch gap-3 text-left border-b border-on-background/10 transition-colors ${
        showSelectedTint ? 'bg-primary/5' : 'hover:bg-on-background/[0.03]'
      }`}
    >
      <div className={`relative ${imgSizeClass} shrink-0 arch-mask overflow-hidden bg-surface-variant`}>
        {isRealImage(image) ? (
          <img src={image} alt={poi.name} className="w-full h-full object-cover" />
        ) : (
          <MediaPlaceholder label={poi.name} />
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 py-2 pr-3">
        <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">
          {getCategoryLabel(poi.category, lang)}
        </span>
        <h4 className="font-headline-sm text-headline-sm leading-tight text-on-background line-clamp-1">{poi.name}</h4>
        <div className="flex items-center gap-2 flex-wrap">
          <AccessBadge item={poi} lang={lang} variant="inline" />
          {poi.is_bookable && <BookableBadge lang={lang} variant="inline" />}
          {poi.rating != null && (
            <span className="font-mono-badge text-mono-badge text-on-surface-variant">★ {poi.rating.toFixed(1)}</span>
          )}
        </div>
        {travelLabel && (
          <span className="font-label-sm text-label-sm text-on-surface-variant line-clamp-1">{travelLabel}</span>
        )}
      </div>
    </button>
  );
}
