import { useState } from 'react';
import { getTranslation } from '../lib/i18n';
import { codeSize } from '../lib/text';
import useDismissableLayer from '../hooks/useDismissableLayer';
import PhotoFigure from './PhotoFigure';
import Layer from './Layer';

interface EntryCodeModalProps {
  code: string;
  pickupInstructions?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  image?: string | null;
  lang: string;
  onClose: () => void;
}

// El código de entrada en grande, dónde recogerlo y cómo llegar. La foto es opcional: la mayoría de pisos
// no tienen portada configurada para el código, y entonces la hoja empieza directamente por el código.
export default function EntryCodeModal({ code, pickupInstructions, latitude, longitude, image, lang, onClose }: EntryCodeModalProps) {
  const [copied, setCopied] = useState(false);
  useDismissableLayer(true, onClose);

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
    <Layer lang={lang}>
      <div className="g-scrim" onClick={onClose} />
      <div className="g-full" role="dialog" aria-modal="true" aria-label={getTranslation('door_code_title', lang)}>
        <div className="g-mhead">
          <span className="g-kd">{getTranslation('door_code_title', lang)}</span>
          <button type="button" className="g-close" onClick={onClose}>{getTranslation('close', lang)}</button>
        </div>

        <PhotoFigure className="g-arch g-arch-m" src={image} alt="" name="" omitIfMissing />

        <div className="g-when" style={{ marginTop: 28 }}>
          <div className="g-codebox">
            <span className={`g-code2 ${codeSize(code)}`} dir="ltr">{code}</span>
            <button type="button" className="g-pill fill" onClick={copyCode}>
              {copied ? getTranslation('copied', lang) : getTranslation('copy_btn', lang)}
            </button>
          </div>
        </div>

        {pickupInstructions && (
          <div className="g-when">
            <span className="g-kd">{getTranslation('entry_code_pickup_title', lang)}</span>
            <p className="g-p g-prewrap">{pickupInstructions}</p>
          </div>
        )}

        {hasLocation && (
          <div className="g-bottom">
            <button
              type="button"
              className="g-pill fill"
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_blank', 'noopener,noreferrer')}
            >
              {getTranslation('directions', lang)}
            </button>
          </div>
        )}
      </div>
    </Layer>
  );
}
