import React from 'react';
import { getTranslation } from '../lib/i18n';

// `guide_pois` es una tabla única: sitios que se visitan (gratis o con entrada) y
// experiencias reservables conviven en ella. Sin una marca visible, en la pestaña
// "Ubicaciones" una cala gratuita, un museo con entrada y un tour de pago se ven
// exactamente igual. Esto centraliza esa marca para tarjetas, ficha y mapa.
export type AccessType = 'free' | 'paid' | 'mixed';

export interface AccessInfo {
  access_type?: string;
  price_display?: string;
  is_bookable?: boolean;
}

export const isFreeAccess = (item: AccessInfo): boolean =>
  (item.access_type || 'free') === 'free';

/** Precio si el host lo ha puesto; si no, la etiqueta genérica del tipo de acceso. */
export function getAccessLabel(item: AccessInfo, lang: string): string {
  const access = (item.access_type || 'free') as AccessType;
  if (access === 'free') return getTranslation('access_free', lang);
  if (item.price_display) return item.price_display;
  return getTranslation(access === 'mixed' ? 'access_mixed' : 'access_paid', lang);
}

interface AccessBadgeProps {
  item: AccessInfo;
  lang: string;
  /** `overlay` va encima de la foto; `inline` dentro del cuerpo de la tarjeta. */
  variant?: 'overlay' | 'inline';
  /** Rotación del sello (1/2/3) para que una fila de tarjetas no parezca calcada. */
  stamp?: 1 | 2 | 3;
}

export default function AccessBadge({ item, lang, variant = 'overlay', stamp = 1 }: AccessBadgeProps) {
  const free = isFreeAccess(item);
  const label = getAccessLabel(item, lang);

  const tone = free
    ? 'bg-crisp-white/95 text-primary'
    : 'bg-primary text-on-primary';
  const stampClass = variant === 'overlay' ? `stamped-badge-${stamp}` : '';

  return (
    <span className={`inline-flex items-center gap-1 ${stampClass} ${tone} font-mono-badge text-mono-badge px-2 py-1 uppercase border border-on-background/10 whitespace-nowrap`}>
      <span className="material-symbols-outlined text-[14px] leading-none">
        {free ? 'lock_open_right' : 'confirmation_number'}
      </span>
      {label}
    </span>
  );
}

/** Chip aparte: distingue una experiencia reservable de un sitio que solo se visita. */
export function BookableBadge({ lang, variant = 'overlay' }: { lang: string; variant?: 'overlay' | 'inline' }) {
  return (
    <span className={`inline-flex items-center gap-1 ${variant === 'overlay' ? 'stamped-badge-2' : ''} bg-secondary text-crisp-white font-mono-badge text-mono-badge px-2 py-1 uppercase border border-on-background/10 whitespace-nowrap`}>
      <span className="material-symbols-outlined text-[14px] leading-none">event_available</span>
      {getTranslation('access_bookable', lang)}
    </span>
  );
}
