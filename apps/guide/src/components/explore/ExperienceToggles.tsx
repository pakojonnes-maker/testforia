import React from 'react';
import { getTranslation } from '../../lib/i18n';

interface ExperienceTogglesProps {
  free: boolean;
  paid: boolean;
  onToggleFree: () => void;
  onTogglePaid: () => void;
  lang: string;
}

// Text-only tabs per the user's reference mockup: no hard pill button, just
// an elegant serif (Newsreader) label with a thin underline marking the
// active one. Deliberate exception to the app's usual 0px flat/label-caps
// system (CLAUDE.md) — this floating chrome sits directly on the map,
// Airbnb-style, same spot the old segmented pill occupied.
//
// The pair sits on a soft frosted-glass plate (not a solid card, not two
// separate pill buttons) — over a busy map tile the thin italic strokes
// disappear without SOME backdrop. Deliberately low background opacity: this
// should read as blurred map showing through, not a white card with text on
// it — backdrop-blur-lg carries the legibility, the tint is just enough to
// keep contrast consistent regardless of what's underneath.
//
// Both start ON (see useExploreState) so the map/list show everything by
// default; these two toggles let the guest narrow down from there. Paid's
// active color is the hardcoded gold #f7be29 (same value as
// --color-tertiary-fixed-dim, kept literal here rather than via the Tailwind
// class so it can never be swapped by an agency theme) so "premium" reads as
// a distinct, consistent color across every agency's branding — matches the
// map pins in mapPins.ts.
const GOLD = '#f7be29';

export default function ExperienceToggles({ free, paid, onToggleFree, onTogglePaid, lang }: ExperienceTogglesProps) {
  return (
    <div className="flex justify-center">
      <div className="flex items-center gap-6 px-5 py-1.5 rounded-full bg-surface-container-lowest/25 backdrop-blur-lg shadow-md">
        <button
          type="button"
          onClick={onToggleFree}
          aria-pressed={free}
          className={`pb-1 border-b-2 font-headline-sm text-headline-sm italic whitespace-nowrap transition-colors ${
            free ? 'text-primary border-primary' : 'text-on-surface-variant border-transparent'
          }`}
        >
          {getTranslation('experience_toggle_free', lang)}
        </button>
        <button
          type="button"
          onClick={onTogglePaid}
          aria-pressed={paid}
          className={`pb-1 border-b-2 font-headline-sm text-headline-sm italic whitespace-nowrap transition-colors ${
            paid ? '' : 'text-on-surface-variant border-transparent'
          }`}
          style={paid ? { color: GOLD, borderColor: GOLD } : undefined}
        >
          {getTranslation('experience_toggle_paid', lang)}
        </button>
      </div>
    </div>
  );
}
