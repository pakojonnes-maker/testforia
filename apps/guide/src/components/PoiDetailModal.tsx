import React, { useEffect } from 'react';
import { getTranslation, getCategoryLabel } from '../lib/i18n';

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
}

interface PoiDetailModalProps {
  item: PoiDetailItem;
  lang: string;
  onClose: () => void;
  onOpenMap: () => void;
}

export default function PoiDetailModal({ item, lang, onClose, onOpenMap }: PoiDetailModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const bgImg = item.image || 'https://placehold.co/800x500/e5e2dd/55433d?text=' + encodeURIComponent(item.name);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease]"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full h-full md:h-auto md:max-h-[90vh] md:w-[90vw] md:max-w-2xl md:mx-auto md:my-auto md:rounded-2xl overflow-hidden bg-crisp-white"
        onClick={e => e.stopPropagation()}
      >
        {/* Hero image */}
        <div className="relative h-64 md:h-80 w-full shrink-0">
          <img src={bgImg} alt={item.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          {item.rating && (
            <div className="absolute top-4 left-4 flex items-center gap-1 bg-crisp-white/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm">
              <span className="material-symbols-outlined text-[#D4A853] text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              <span className="font-label-sm text-label-sm text-deep-sea">{item.rating.toFixed(1)}</span>
            </div>
          )}
          <div className="absolute bottom-4 left-6 right-6">
            <span className="text-label-sm font-label-sm text-crisp-white/80 uppercase tracking-wider">{getCategoryLabel(item.category, lang)}</span>
            <h3 className="text-headline-lg-mobile font-headline-lg-mobile text-crisp-white">{item.name}</h3>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto">
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
          <p className="text-body-md font-body-md text-on-surface-variant whitespace-pre-wrap leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex flex-col sm:flex-row gap-3 mt-auto">
          <button
            onClick={onOpenMap}
            className="flex-1 py-3 rounded-lg border border-deep-sea text-deep-sea font-label-lg text-label-lg hover:bg-deep-sea hover:text-crisp-white transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
            {getTranslation('view_map', lang)}
          </button>
          {item.url && (
            <button
              onClick={() => window.open(item.url, '_blank')}
              className="flex-1 py-3 rounded-lg bg-terracotta text-crisp-white font-label-lg text-label-lg hover:bg-primary transition-colors flex items-center justify-center gap-2"
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
