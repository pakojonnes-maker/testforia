import { getTranslation } from '../lib/i18n';

// `guide_pois` es una tabla única: sitios que se visitan (gratis o con entrada) y experiencias reservables
// conviven en ella. Sin una marca visible, en Lugares una cala gratuita, un museo con entrada y un tour de
// pago se ven exactamente igual. Esto centraliza esa marca para filas, ficha y mapa. Sin iconos: el acceso
// se distingue por la forma del distintivo (contorno = gratis, relleno de acento = de pago) y por su texto.
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
  /** Sobre una foto: fondo opaco para que se lea. */
  overlay?: boolean;
}

export default function AccessBadge({ item, lang, overlay = false }: AccessBadgeProps) {
  return (
    <span className={`g-badge ${isFreeAccess(item) ? 'free' : 'paid'}${overlay ? ' ov' : ''}`}>
      <bdi>{getAccessLabel(item, lang)}</bdi>
    </span>
  );
}

/** Chip aparte: distingue una experiencia reservable de un sitio que solo se visita. */
export function BookableBadge({ lang }: { lang: string }) {
  return <span className="g-badge book">{getTranslation('access_bookable', lang)}</span>;
}

/** «4,6 / 5»: la nota de Google, con la coma o el punto de cada idioma. */
export function RatingBadge({ rating, lang }: { rating: number; lang: string }) {
  let text: string;
  try {
    text = new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating);
  } catch {
    text = rating.toFixed(1);
  }
  // dir="ltr": «4,6 / 5» es una expresión numérica y en un párrafo RTL la barra la volvía «5 / 4,6».
  return <span className="g-badge rate" dir="ltr">{text} / 5</span>;
}
