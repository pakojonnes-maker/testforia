import React from 'react';
import { getTranslation } from '../../lib/i18n';

interface ExperienceTogglesProps {
  free: boolean;
  paid: boolean;
  onToggleFree: () => void;
  onTogglePaid: () => void;
  lang: string;
}

// Both start ON (see useExploreState) so the map/list show everything by
// default; these two buttons let the guest narrow down from there. Paid uses
// --color-tertiary-fixed-dim (gold, not agency-overridable) rather than
// --color-primary specifically so "premium" reads as a distinct, consistent
// color across every agency's branding — matches the map pins in mapPins.ts.
export default function ExperienceToggles({ free, paid, onToggleFree, onTogglePaid, lang }: ExperienceTogglesProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onToggleFree}
        aria-pressed={free}
        className={`flex-1 px-4 py-2.5 border font-label-caps text-label-caps uppercase tracking-widest transition-colors ${
          free
            ? 'bg-primary text-on-primary border-primary'
            : 'bg-surface-container-lowest text-on-surface-variant border-on-background/10'
        }`}
      >
        {getTranslation('experience_toggle_free', lang)}
      </button>
      <button
        type="button"
        onClick={onTogglePaid}
        aria-pressed={paid}
        className={`flex-1 px-4 py-2.5 border font-label-caps text-label-caps uppercase tracking-widest transition-colors ${
          paid
            ? 'bg-tertiary-fixed-dim text-on-tertiary-fixed border-tertiary-fixed-dim'
            : 'bg-surface-container-lowest text-on-surface-variant border-on-background/10'
        }`}
      >
        {getTranslation('experience_toggle_paid', lang)}
      </button>
    </div>
  );
}
