import { getCategoryLabel } from '../../lib/i18n';
import PhotoFigure from '../PhotoFigure';
import AccessBadge, { BookableBadge, RatingBadge } from '../AccessBadge';
import type { GuidePoi } from '../../lib/types';

interface PoiCardProps {
  poi: GuidePoi;
  lang: string;
  /** `peek`: compacta, vive en la cabecera fija de la hoja cuando hay un pin elegido. `row`: la lista que se desliza. */
  variant: 'peek' | 'row';
  onOpen: () => void;
  /** Lo calcula quien la pinta: poi.travel_time_text en casa, o una distancia en línea recta (explore_travel_from_home) fuera. */
  travelLabel?: string | null;
  selected?: boolean;
  /** El número que lleva su chincheta en el mapa: une la fila con el pin sin necesidad de iconos de categoría. */
  number?: number;
}

// Una tarjeta, dos contextos. Foto en un arco pequeño con contorno de arena, categoría en mayúsculas con
// el número del pin, nombre, distintivos (acceso, reservable, nota) y lo que cuesta llegar.
export default function PoiCard({ poi, lang, variant, onOpen, travelLabel, selected, number }: PoiCardProps) {
  const image = poi.media?.[0]?.url;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`g-poi2${variant === 'peek' ? ' peek' : ''}${selected && variant === 'row' ? ' sel' : ''}`}
    >
      <PhotoFigure className="g-ph" src={image} alt="" name={poi.name} />
      <span className="g-pb">
        <span className="g-kd">
          {number != null && <i className="g-nn">{number}</i>}
          {getCategoryLabel(poi.category, lang)}
        </span>
        <span className="g-h3">{poi.name}</span>
        <span className="g-badges">
          <AccessBadge item={poi} lang={lang} />
          {poi.is_bookable && <BookableBadge lang={lang} />}
          {poi.rating != null && <RatingBadge rating={poi.rating} lang={lang} />}
        </span>
        {travelLabel && <span className="g-meta"><bdi>{travelLabel}</bdi></span>}
      </span>
    </button>
  );
}
