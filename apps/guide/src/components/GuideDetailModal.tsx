import React from 'react';
import { createPortal } from 'react-dom';
import { getTranslation } from '../lib/i18n';
import MediaPlaceholder, { isRealImage } from './MediaPlaceholder';
import useDismissableLayer from '../hooks/useDismissableLayer';

export interface InfoItem {
  id: string;
  key: string;
  category?: string | null;
  icon: string;
  color?: string | null;
  title: string;
  // The category's generic translated name (e.g. "Lavadora"). Only shown as an
  // eyebrow above the headline when it differs from `title` — i.e. the host
  // wrote a custom title on top of the category. See workerGuide.js.
  category_name?: string | null;
  content: string;
  media: any[];
  category_image_url?: string | null;
  // Punto de recogida opcional (migración 0084) — hoy solo lo rellena el admin
  // para door_code, pero el campo es genérico a nivel de item.
  pickup_instructions?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_sequential?: boolean;
  steps?: Array<{
    id: string;
    step_number: number;
    title: string;
    content: string;
    media: Array<{ url: string }>;
    checklist_items?: string[];
  }>;
}

interface GuideDetailModalProps {
  item: InfoItem;
  image?: string;
  eyebrow?: string | null;
  lang: string;
  onClose: () => void;
}

// La ficha de una guía del apartamento ("cómo funciona la lavadora", "dónde
// aparcar"...). Es contenido de lectura, no un aviso: a pantalla completa en
// móvil para que quepa el texto y las fotos de los pasos, tarjeta en escritorio
// — el mismo par que PoiDetailModal.
export default function GuideDetailModal({ item, image, eyebrow, lang, onClose }: GuideDetailModalProps) {
  useDismissableLayer(true, onClose);

  const steps = item.is_sequential && item.steps && item.steps.length > 0 ? item.steps : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-stretch md:items-center justify-center md:p-4 bg-on-background/60 animate-[fadeIn_0.2s_ease]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-surface-container-lowest border border-on-background/10 w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl flex flex-col overflow-hidden animate-[slideUp_0.3s_ease]"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative shrink-0 h-56 md:h-72">
          {isRealImage(image) ? (
            <img src={image} className="w-full h-full object-cover" alt={item.title} />
          ) : (
            <MediaPlaceholder label={item.title} />
          )}
          <button
            className="absolute top-4 right-4 w-11 h-11 bg-on-background/50 text-crisp-white flex items-center justify-center hover:bg-on-background/70 transition-colors"
            onClick={onClose}
            aria-label={getTranslation('close', lang)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <div className="absolute inset-0 bg-gradient-to-t from-on-background/85 via-on-background/10 to-transparent pointer-events-none" />
          <div className="absolute bottom-5 left-5 right-5">
            {eyebrow && (
              <span className="font-mono-badge text-mono-badge uppercase text-crisp-white/80 mb-1 block">{eyebrow}</span>
            )}
            <h3 className="font-headline-md text-headline-md text-crisp-white break-words">{item.title}</h3>
          </div>
        </div>

        {/* El cuerpo se queda con todo el alto sobrante y scrollea él solo: con
            un max-h en el cuerpo pero ninguno en la tarjeta, en pantallas
            cortas el modal terminaba más alto que el viewport. */}
        <div
          className="flex-1 min-h-0 overflow-y-auto p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
          style={{ scrollbarWidth: 'thin' }}
        >
          {steps ? (
            <ol className="flex flex-col">
              {steps.map((step, i) => (
                <li key={step.id} className="flex gap-4">
                  {/* Columna del número con línea de continuidad: en una guía
                      secuencial lo que importa es ver que hay un antes y un
                      después, no solo el número suelto. */}
                  <div className="flex flex-col items-center shrink-0">
                    <span className="w-9 h-9 bg-primary text-on-primary flex items-center justify-center font-mono-badge text-mono-badge">
                      {step.step_number}
                    </span>
                    {i < steps.length - 1 && <span className="w-px flex-1 bg-on-background/15 my-1" aria-hidden="true" />}
                  </div>
                  <div className={`flex-1 min-w-0 ${i < steps.length - 1 ? 'pb-8' : ''}`}>
                    <h4 className="font-label-caps text-label-caps uppercase text-on-background mb-1 break-words">{step.title}</h4>
                    <p className="font-body-md text-body-md text-on-surface-variant whitespace-pre-wrap break-words">{step.content}</p>
                    {step.media?.[0] && (
                      <img src={step.media[0].url} className="mt-3 w-full object-cover max-h-56 border border-on-background/10" alt={step.title} />
                    )}
                    {step.checklist_items && step.checklist_items.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {step.checklist_items.map((entry, k) => (
                          <li key={k} className="flex items-start gap-2 font-body-md text-body-md text-on-surface-variant">
                            <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">check_circle</span>
                            <span className="min-w-0 break-words">{entry}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="font-body-md text-body-md text-on-surface-variant whitespace-pre-wrap break-words leading-relaxed">
              {item.content}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
