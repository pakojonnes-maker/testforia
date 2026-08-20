import React from 'react';
import { createPortal } from 'react-dom';
import { getTranslation } from '../lib/i18n';
import useDismissableLayer from '../hooks/useDismissableLayer';

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
//
// Va en un portal sobre <body>: renderizado en su sitio del árbol queda dentro
// del div de la pestaña activa, que durante la transición tiene un transform y
// por tanto captura los position:fixed de sus hijos (ver .tab-slide-in-* en
// index.css). El portal también lo deja por encima del BottomNavBar, que es
// hermano posterior de <main> con z-50.
export default function PhonesModal({ phones, lang, onClose }: PhonesModalProps) {
  useDismissableLayer(true, onClose);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-stretch md:items-center justify-center md:p-4 bg-on-background/60 animate-[fadeIn_0.2s_ease]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Pantalla completa en móvil (es una lista que puede tener 6-8 números
          de emergencia), tarjeta en escritorio — mismo patrón que
          PoiDetailModal. */}
      <div
        className="bg-surface-container-lowest border border-on-background/10 w-full h-full md:h-auto md:max-h-[90vh] md:max-w-lg flex flex-col overflow-hidden animate-[slideUp_0.3s_ease]"
        onClick={e => e.stopPropagation()}
      >
        <div className="shrink-0 p-5 flex items-center justify-between gap-3 border-b border-on-background/10">
          <h3 className="font-headline-md text-headline-md text-on-background min-w-0 break-words">
            {getTranslation('phones_title', lang)}
          </h3>
          <button
            onClick={onClose}
            aria-label={getTranslation('close', lang)}
            className="w-11 h-11 shrink-0 flex items-center justify-center hover:bg-on-background/5 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div
          className="flex-1 min-h-0 overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]"
          style={{ scrollbarWidth: 'thin' }}
        >
          {phones.map(p => (
            <a
              key={p.id}
              href={`tel:${p.phone_number}`}
              className="flex items-center gap-4 px-5 py-4 min-h-[64px] border-b border-on-background/10 last:border-b-0 hover:bg-primary/5 active:bg-primary/10 transition-colors"
            >
              <span className="material-symbols-outlined text-primary text-2xl shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>{p.icon}</span>
              {/* min-w-0 es obligatorio aquí: un flex-1 a secas conserva
                  min-width:auto, así que una etiqueta larga ("AMBULANCIA /
                  EMERGENCIAS") empujaba la fila y el overflow-hidden del padre
                  se comía el número de teléfono. */}
              <div className="flex-1 min-w-0">
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase break-words">{p.name}</p>
                <p className="font-mono-badge text-[18px] tracking-wide text-on-background break-words">{p.phone_number}</p>
              </div>
              <span className="material-symbols-outlined text-primary shrink-0">call</span>
            </a>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
