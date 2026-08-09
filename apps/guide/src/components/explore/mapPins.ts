import L from 'leaflet';
import { getCategoryIcon } from '../../lib/poiCategories';

interface PoiPinOptions {
  category: string;
  isPaid: boolean;
  priceLabel?: string | null;
  selected?: boolean;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/**
 * Airbnb-style map pin: a flat square glyph for free POIs, or a pill (icon +
 * price) for paid/mixed ones — the shape difference alone signals "costs
 * money" before the guest reads anything, matching the gold "Experiencias
 * premium" toggle. Selected state swaps to --color-primary regardless of type.
 *
 * Styling lives in index.css (.vt-poi-pin*), not Tailwind utility classes
 * inside this HTML string: Tailwind v4's scanner isn't guaranteed to pick up
 * class names assembled inside a Leaflet divIcon template, and
 * --color-primary/--color-tertiary-fixed-dim need to keep tracking the
 * agency's runtime theme override (GuidebookPage.tsx), which plain CSS custom
 * properties do automatically and composed Tailwind classes would not.
 */
export function createPoiPin({ category, isPaid, priceLabel, selected = false }: PoiPinOptions): L.DivIcon {
  const hasLabel = isPaid && !!priceLabel;
  const iconName = isPaid && !hasLabel ? 'confirmation_number' : getCategoryIcon(category);
  const labelHtml = hasLabel ? `<span class="vt-poi-pin-label">${escapeHtml(priceLabel!)}</span>` : '';
  const classes = ['vt-poi-pin', isPaid && 'vt-poi-pin--paid', selected && 'vt-poi-pin--selected']
    .filter(Boolean)
    .join(' ');
  const width = hasLabel ? Math.max(30, 34 + priceLabel!.length * 6) : 30;

  return L.divIcon({
    className: 'vt-poi-pin-wrapper',
    html: `<div class="${classes}"><span class="material-symbols-outlined" aria-hidden="true">${iconName}</span>${labelHtml}</div>`,
    iconSize: [width, 30],
    iconAnchor: [width / 2, 30],
  });
}
