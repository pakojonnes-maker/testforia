import React from 'react';
import { getTranslation, getCategoryLabel } from '../lib/i18n';
import MediaPlaceholder, { isRealImage } from './MediaPlaceholder';
import AccessBadge, { BookableBadge } from './AccessBadge';
import useDismissableLayer from '../hooks/useDismissableLayer';

export interface PoiDetailItem {
  id: string;
  name: string;
  description: string;
  category: string;
  image?: string;
  url?: string; // google_maps_url
  rating?: number;
  travel_time_text?: string;
  travel_mode?: 'walk' | 'drive' | 'bike';
  distance_text?: string;
  access_type?: string;
  price_display?: string;
  duration_text?: string;
  is_bookable?: boolean;
}

interface PoiDetailModalProps {
  item: PoiDetailItem;
  lang: string;
  onClose: () => void;
  /** Optional: the Explore tab's map is already behind the sheet, so it skips this button entirely. */
  onOpenMap?: () => void;
}

export default function PoiDetailModal({ item, lang, onClose, onOpenMap }: PoiDetailModalProps) {
  useDismissableLayer(true, onClose);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-on-background/60 animate-[fadeIn_0.2s_ease]"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full h-full md:h-auto md:max-h-[90vh] md:w-[90vw] md:max-w-2xl md:mx-auto md:my-auto overflow-hidden bg-surface-container-lowest border border-on-background/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Hero image */}
        <div className="relative h-64 md:h-80 w-full shrink-0">
          {isRealImage(item.image) ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <MediaPlaceholder label={item.name} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-on-background/80 via-on-background/10 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-on-background/40 text-crisp-white hover:bg-on-background/60 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <div className="absolute top-4 left-4 flex flex-col items-start gap-2">
            {item.rating && (
              <span className="stamped-badge-1 flex items-center gap-1 bg-tertiary-fixed-dim text-on-tertiary-fixed font-mono-badge text-mono-badge px-2 py-1 border border-on-background/10">
                ★ {item.rating.toFixed(1)}
              </span>
            )}
            <AccessBadge item={item} lang={lang} stamp={3} />
            {item.is_bookable && <BookableBadge lang={lang} />}
          </div>
          <div className="absolute bottom-4 left-6 right-6">
            <span className="font-label-caps text-label-caps text-crisp-white/80 uppercase tracking-widest">{getCategoryLabel(item.category, lang)}</span>
            <h3 className="font-headline-md text-headline-md text-crisp-white">{item.name}</h3>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {item.travel_time_text && (
              <div className="flex items-center gap-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">
                  {item.travel_mode === 'drive' ? 'directions_car' : 'directions_walk'}
                </span>
                <span className="font-label-sm text-label-sm">
                  {item.travel_time_text}{item.distance_text ? ` / ${item.distance_text}` : ''}
                </span>
              </div>
            )}
            {item.duration_text && (
              <div className="flex items-center gap-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                <span className="font-label-sm text-label-sm">
                  {getTranslation('poi_duration_label', lang)}: {item.duration_text}
                </span>
              </div>
            )}
            {/* El acceso/precio no se repite aquí: ya va como sello sobre la foto. */}
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant whitespace-pre-wrap leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex flex-col sm:flex-row gap-3 mt-auto">
          {onOpenMap && (
            <button
              onClick={onOpenMap}
              className="flex-1 py-3 border border-primary text-primary font-label-caps text-label-caps uppercase hover:bg-primary hover:text-on-primary transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">map</span>
              {getTranslation('view_map', lang)}
            </button>
          )}
          {item.url && (
            <button
              onClick={() => window.open(item.url, '_blank')}
              className="flex-1 py-3 bg-primary text-on-primary font-label-caps text-label-caps uppercase hover:bg-primary-container transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">directions</span>
              {getTranslation('directions', lang)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
