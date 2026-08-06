import { useEffect, useState } from 'react';
import { getTranslation } from '../lib/i18n';
import { getConsent, setConsent } from '../lib/consent';

interface ConsentBannerProps {
  lang: string;
  /** Ruta de la página legal, para que el huésped pueda informarse ANTES de decidir. */
  legalHref: string;
}

/**
 * Banner de consentimiento del guidebook.
 *
 * Reglas de diseño que son requisitos legales, no gustos:
 *  - Aceptar y rechazar tienen el MISMO peso visual y el mismo tamaño. Que
 *    rechazar cueste más que aceptar es un patrón engañoso (Directrices 3/2022
 *    del CEPD) y es lo que más multa la AEPD en cookies.
 *  - No hay muro ni "X" que equivalga a aceptar: mientras no haya respuesta no se
 *    recoge nada, porque la puerta está en lib/api.ts.
 *  - El enlace a la información legal está ANTES de los botones: sin información
 *    previa el consentimiento no es informado y no vale.
 */
export default function ConsentBanner({ lang, legalHref }: ConsentBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Pequeño retardo para no competir con la entrada de la portada. No hay
    // urgencia: sin decisión no se registra nada.
    if (getConsent() !== 'unset') return;
    const timer = setTimeout(() => setVisible(true), 700);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const decide = (state: 'granted' | 'denied') => {
    setConsent(state);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label={getTranslation('consent_title', lang)}
      className="fixed inset-x-0 bottom-0 z-[9999] p-4 flex justify-center pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-xl bg-surface-container-lowest border border-on-background/15 shadow-2xl p-5 flex flex-col gap-4">
        <div>
          <p className="font-label-caps text-label-caps text-primary uppercase mb-2">
            {getTranslation('consent_title', lang)}
          </p>
          <p className="font-body-md text-body-md text-on-surface leading-relaxed">
            {getTranslation('consent_body', lang)}
          </p>
          <a
            href={legalHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 font-label-md text-label-md text-on-surface-variant underline underline-offset-2 hover:text-primary transition-colors"
          >
            {getTranslation('legal_link', lang)}
          </a>
        </div>

        {/* Mismo tamaño, misma tipografía, misma altura: solo cambia el color. */}
        <div className="flex gap-3">
          <button
            onClick={() => decide('denied')}
            className="flex-1 py-3 px-4 font-label-md text-label-md uppercase tracking-wide border border-on-background/25 text-on-surface hover:border-on-background/50 transition-colors"
          >
            {getTranslation('consent_reject', lang)}
          </button>
          <button
            onClick={() => decide('granted')}
            className="flex-1 py-3 px-4 font-label-md text-label-md uppercase tracking-wide bg-primary text-on-primary hover:bg-primary-container transition-colors"
          >
            {getTranslation('consent_accept', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
