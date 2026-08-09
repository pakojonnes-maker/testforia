import React from 'react';
import { getTranslation } from '../../lib/i18n';

interface ExperienceTogglesProps {
  free: boolean;
  paid: boolean;
  onToggleFree: () => void;
  onTogglePaid: () => void;
  lang: string;
}

// Compact centered segmented pill (per the user's reference mockup), not two
// full-width blocks: a single rounded outer pill holding two inner pills,
// sized to their own text. This is a deliberate exception to the app's
// usual 0px-radius flat system (CLAUDE.md) — this floating chrome sits
// directly on the map, Airbnb-style, same as the search bar next to it;
// the flat/bordered system still governs everything below in the sheet.
//
// Both start ON (see useExploreState) so the map/list show everything by
// default; these two buttons let the guest narrow down from there. Paid uses
// --color-tertiary-fixed-dim (gold, not agency-overridable) rather than
// --color-primary specifically so "premium" reads as a distinct, consistent
// color across every agency's branding — matches the map pins in mapPins.ts.
export default function ExperienceToggles({ free, paid, onToggleFree, onTogglePaid, lang }: ExperienceTogglesProps) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-1 bg-surface-container-lowest border border-on-background/10 rounded-full p-1">
        <button
          type="button"
          onClick={onToggleFree}
          aria-pressed={free}
          className={`px-4 py-2 rounded-full font-label-sm text-label-sm uppercase tracking-wide whitespace-nowrap transition-colors ${
            free ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
          }`}
        >
          {getTranslation('experience_toggle_free', lang)}
        </button>
        <button
          type="button"
          onClick={onTogglePaid}
          aria-pressed={paid}
          className={`px-4 py-2 rounded-full font-label-sm text-label-sm uppercase tracking-wide whitespace-nowrap transition-colors ${
            paid ? 'bg-tertiary-fixed-dim text-on-tertiary-fixed' : 'text-on-surface-variant'
          }`}
        >
          {getTranslation('experience_toggle_paid', lang)}
        </button>
      </div>
    </div>
  );
}
