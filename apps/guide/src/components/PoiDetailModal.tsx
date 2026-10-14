import { getTranslation, getCategoryLabel } from '../lib/i18n';
import type { CtaActionType } from '../lib/types';
import AccessBadge, { BookableBadge, RatingBadge } from './AccessBadge';
import CTAButton from './CTAButton';
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
  /** El botón de reserva de una reservable, ya resuelto por el worker (el mismo que en la Tienda). */
  cta?: {
    action_type: CtaActionType;
    action_data: string;
    prefilled_message: string;
    cta_label?: string;
    cta_source?: 'affiliate' | 'direct';
  };
}

interface PoiDetailModalProps {
  item: PoiDetailItem;
  lang: string;
  onClose: () => void;
  /** Opcional: en Lugares el mapa ya está detrás de la hoja, así que ese sitio se salta este botón. */
  onOpenMap?: () => void;
  /** Registra el clic en el botón de reserva, como en la Tienda. */
  onIntent?: (action: string) => void;
}

// La ficha de un lugar: foto en arco, distintivos (acceso, reservable, nota), nombre, lo que cuesta llegar y
// cuánto dura, la descripción y dos acciones fijas abajo («Ver mapa» y «Cómo llegar»). La foto se omite si no
// hay: la ficha empieza directamente por el nombre.
export default function PoiDetailModal({ item, lang, onClose, onOpenMap, onIntent }: PoiDetailModalProps) {
  useDismissableLayer(true, onClose);

  // Una reservable con botón se reserva desde aquí: el botón pasa a ser la acción principal, «Cómo llegar» la
  // secundaria y «Ver mapa» sale (cerrar la ficha ya devuelve el mapa) para que quepan dos en la barra.
  const cta = item.cta?.action_type && item.cta.action_data?.trim() ? item.cta : null;
  const mapButton = cta ? undefined : onOpenMap;

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

        {/* Sólo junto a un enlace que de verdad es retribuido (Directiva 2005/29/CE, anexo I.11), como en la Tienda. */}
        {cta?.cta_source === 'affiliate' && <p className="g-disc">{getTranslation('affiliate_disclosure', lang)}</p>}

        {(mapButton || item.url || cta) && (
          <div className="g-actions">
            {mapButton && (
              <button type="button" className="g-pill line" onClick={mapButton}>{getTranslation('view_map', lang)}</button>
            )}
            {item.url && (
              <button type="button" className={`g-pill ${cta ? 'line' : 'fill'}`} onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}>
                {getTranslation('directions', lang)}
              </button>
            )}
            {cta && <CTAButton experience={{ id: item.id, ...cta }} lang={lang} onIntent={action => onIntent?.(action)} />}
          </div>
        )}
      </div>
    </Layer>
  );
}
