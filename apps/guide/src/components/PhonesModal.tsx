import React, { useEffect } from 'react';
import { getTranslation } from '../lib/i18n';

export interface PhoneEntry {
  id: string;
  category: string;
  icon: string;
  name: string;
  phone_number: string;
}

interface PhonesModalProps {
  phones: PhoneEntry[];
  lang: string;
  onClose: () => void;
}

// Lista simple, cada fila es un link tel: — ya llega ordenada agencia-primero
// desde workerGuide.js (order_index del catálogo guide_phone_categories).
export default function PhonesModal({ phones, lang, onClose }: PhonesModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-on-background/60 animate-[fadeIn_0.2s_ease]"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest border border-on-background/10 w-full max-w-lg overflow-hidden animate-[slideUp_0.3s_ease]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 flex items-center justify-between border-b border-on-background/10">
          <h3 className="font-headline-md text-headline-md text-on-background">{getTranslation('phones_title', lang)}</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-on-background/5 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {phones.map(p => (
            <a
              key={p.id}
              href={`tel:${p.phone_number}`}
              className="flex items-center gap-4 p-6 border-b border-on-background/10 last:border-b-0 hover:bg-primary/5 transition-colors"
            >
              <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{p.icon}</span>
              <div className="flex-1">
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">{p.name}</p>
                <p className="font-mono-badge text-[16px] text-on-background">{p.phone_number}</p>
              </div>
              <span className="material-symbols-outlined text-primary">call</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
