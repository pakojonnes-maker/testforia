import React, { useEffect, useState } from 'react';
import { getTranslation } from '../lib/i18n';
import { isRealImage } from './MediaPlaceholder';

interface EntryCodeModalProps {
  code: string;
  pickupInstructions?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  image?: string | null;
  lang: string;
  onClose: () => void;
}

// Mismo lenguaje visual que PoiDetailModal (foto hero + cuerpo + acción), pero
// la foto es opcional aquí: la mayoría de apartamentos no tendrán portada
// configurada para el código de entrada, así que cae a un panel de icono en
// vez de dejar un hueco vacío.
export default function EntryCodeModal({ code, pickupInstructions, latitude, longitude, image, lang, onClose }: EntryCodeModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {});
  };

  const hasLocation = latitude != null && longitude != null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-on-background/60 animate-[fadeIn_0.2s_ease]"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full h-full md:h-auto md:max-h-[90vh] md:w-[90vw] md:max-w-lg md:mx-auto md:my-auto overflow-hidden bg-surface-container-lowest border border-on-background/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-48 md:h-56 w-full shrink-0 bg-primary/10">
          {isRealImage(image) ? (
            <img src={image as string} alt={getTranslation('door_code_title', lang)} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>door_front</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-on-background/70 via-transparent to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-on-background/40 text-crisp-white hover:bg-on-background/60 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6 overflow-y-auto">
          <div>
            <p className="font-label-caps text-label-caps text-primary uppercase mb-2">{getTranslation('door_code_title', lang)}</p>
            <div className="flex items-center justify-between bg-primary/5 border border-primary/25 p-4">
              <span className="font-mono-badge text-[24px] text-on-background tracking-widest">{code}</span>
              <button
                onClick={copyCode}
                className="p-2 hover:bg-primary/10 transition-colors flex items-center gap-1"
                aria-label={getTranslation('copy_btn', lang)}
              >
                {copied && <span className="font-label-sm text-label-sm text-primary">{getTranslation('copied', lang)}</span>}
                <span className="material-symbols-outlined text-primary text-[20px]">{copied ? 'check' : 'content_copy'}</span>
              </button>
            </div>
          </div>

          {pickupInstructions && (
            <div>
              <p className="font-label-caps text-label-caps text-secondary uppercase mb-2">{getTranslation('entry_code_pickup_title', lang)}</p>
              <p className="font-body-md text-body-md text-on-surface-variant whitespace-pre-wrap leading-relaxed">{pickupInstructions}</p>
            </div>
          )}
        </div>

        {hasLocation && (
          <div className="p-6 pt-0 mt-auto shrink-0">
            <button
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_blank')}
              className="w-full py-3 bg-primary text-on-primary font-label-caps text-label-caps uppercase hover:bg-primary-container transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">directions</span>
              {getTranslation('directions', lang)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
