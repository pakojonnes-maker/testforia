import { getTranslation, getCategoryLabel } from '../lib/i18n';
import AccessBadge, { BookableBadge, RatingBadge } from './AccessBadge';
import PhotoFigure from './PhotoFigure';
import Layer from './Layer';
import useDismissableLayer from '../hooks/useDismissableLayer';

export interface PoiDetailItem {
  id: string;
  name: string;
  description: string;
  category: string;
  image?: string;
  url?: string; // google_maps_url
  rating?: number;
  travel_time_text?: string;
  travel_mode?: 'walk' | 'drive' | 'bike';
  distance_text?: string;
  access_type?: string;
  price_display?: string;
  duration_text?: string;
  is_bookable?: boolean;
}

interface PoiDetailModalProps {
  item: PoiDetailItem;
  lang: string;
  onClose: () => void;
  /** Opcional: en Lugares el mapa ya está detrás de la hoja, así que ese sitio se salta este botón. */
  onOpenMap?: () => void;
}

// La ficha de un lugar: foto en arco, distintivos (acceso, reservable, nota), nombre, lo que cuesta llegar y
// cuánto dura, la descripción y dos acciones fijas abajo («Ver mapa» y «Cómo llegar»). La foto se omite si no
// hay: la ficha empieza directamente por el nombre.
export default function PoiDetailModal({ item, lang, onClose, onOpenMap }: PoiDetailModalProps) {
  useDismissableLayer(true, onClose);

  // Nunca se inventa una cifra: cada bloque existe solo si el dato existe.
  const stats: Array<{ value: string; caption: string }> = [];
  if (item.travel_time_text) stats.push({ value: item.travel_time_text, caption: item.distance_text || '' });
  if (item.duration_text) stats.push({ value: item.duration_text, caption: getTranslation('poi_duration_label', lang) });

  return (
    <Layer lang={lang}>
      <div className="g-scrim" onClick={onClose} />
      <div className="g-full" role="dialog" aria-modal="true" aria-label={item.name}>
        <div className="g-mhead">
          <span className="g-kd">{getCategoryLabel(item.category, lang)}</span>
          <button type="button" className="g-close" onClick={onClose}>{getTranslation('close', lang)}</button>
        </div>

        <PhotoFigure className="g-arch g-arch-m" src={item.image} alt={item.name} name={item.name} omitIfMissing />

        <div className="g-lugar-head">
          <div className="g-badges">
            <AccessBadge item={item} lang={lang} />
            {item.is_bookable && <BookableBadge lang={lang} />}
            {item.rating != null && <RatingBadge rating={item.rating} lang={lang} />}
          </div>
          <h1 className="g-h1">{item.name}</h1>
        </div>

        {stats.length > 0 && (
          <div className={`g-stats${stats.length === 1 ? ' one' : ''}`}>
            {stats.map((s, i) => (
              <div className="g-stat" key={i}>
                <b><bdi>{s.value}</bdi></b>
                {s.caption && <span><bdi>{s.caption}</bdi></span>}
              </div>
            ))}
          </div>
        )}

        {item.description && <p className="g-desc">{item.description}</p>}

        {(onOpenMap || item.url) && (
          <div className="g-actions">
            {onOpenMap && (
              <button type="button" className="g-pill line" onClick={onOpenMap}>{getTranslation('view_map', lang)}</button>
            )}
            {item.url && (
              <button type="button" className="g-pill fill" onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}>
                {getTranslation('directions', lang)}
              </button>
            )}
          </div>
        )}
      </div>
    </Layer>
  );
}
