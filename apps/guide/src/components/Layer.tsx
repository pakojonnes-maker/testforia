import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { isRtl } from '../lib/i18n';

interface LayerProps {
  lang: string;
  children: ReactNode;
}

/**
 * Todo lo que se abre encima de la guía (hojas, fichas, avisos) va en un portal sobre <body>, no dentro
 * de la pestaña: la pestaña se anima con un transform y un transform convierte al elemento en el bloque
 * contenedor de sus descendientes position:fixed (ver .tab-slide-in-* en index.css). Un portal deja la
 * hoja anclada al viewport.
 *
 * Fuera de .guide-app no llegan ni las reglas base (fuentes, botones sin borde) ni el sentido de lectura,
 * así que este envoltorio los lleva consigo. `display: contents` para que no pinte ninguna caja propia.
 */
export default function Layer({ lang, children }: LayerProps) {
  return createPortal(
    <div className="guide-app" style={{ display: 'contents' }} dir={isRtl(lang) ? 'rtl' : 'ltr'} lang={lang}>
      {children}
    </div>,
    document.body,
  );
}
