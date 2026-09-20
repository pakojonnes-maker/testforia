import { useId } from 'react';
import { getTranslation } from '../lib/i18n';
import { buildWhatsAppUrl } from '../lib/api';
import useDismissableLayer from '../hooks/useDismissableLayer';
import Layer from './Layer';
import type { GuideRestaurant, RestaurantReservation } from '../lib/types';

/**
 * Sólo se registra el canal que el huésped elige, no la apertura de la hoja:
 * guide_affiliate_intents cuenta una fila por clic, y contar los dos duplicaría
 * cada intento de reserva. Son los mismos nombres que ya usa CTAButton.
 */
export type ReserveChannelAction = 'click_phone' | 'click_whatsapp' | 'click_url';

interface RestaurantReserveModalProps {
  restaurant: GuideRestaurant;
  reservation: RestaurantReservation;
  lang: string;
  onClose: () => void;
  onChannel: (action: ReserveChannelAction) => void;
}

interface ChannelRowProps {
  href: string;
  external?: boolean;
  label: string;
  detail: string;
  /** Lo que se hace al tocarla: «Llamar» o «Abrir». */
  action: string;
  onClick: () => void;
}

// Una fila por canal: qué es (etiqueta), a dónde lleva (número o dominio) y el verbo. Sin iconos.
function ChannelRow({ href, external, label, detail, action, onClick }: ChannelRowProps) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      onClick={onClick}
      className="g-chan"
    >
      <div>
        <span className="g-k">{label}</span>
        {/* <bdi>: un número de teléfono dentro de un párrafo RTL (árabe) debe
            conservar su orden de dígitos sin que el párrafo deje de alinearse
            a la derecha, que es lo que haría un dir="ltr" en el contenedor. */}
        <b><bdi>{detail}</bdi></b>
      </div>
      <span className="g-go">{action}</span>
    </a>
  );
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

// Hoja de "Reservar": deja ELEGIR canal — cada teléfono del restaurante, WhatsApp
// si lo tiene y la reserva online si existe.
//
// Se abre siempre, incluso con un solo canal: un "Reservar" que lanzase una
// llamada al primer toque sería un accidente esperando a pasar, y en un portátil
// un tel: directo no hace nada visible, mientras que aquí el número se ve y se
// puede copiar.
//
// Va por Layer (portal sobre <body>) por la misma razón que el resto de hojas: el transform
// de la transición entre pestañas captura los position:fixed de sus hijos.
export default function RestaurantReserveModal({ restaurant, reservation, lang, onClose, onChannel }: RestaurantReserveModalProps) {
  useDismissableLayer(true, onClose);
  const titleId = useId();
  const { phones, whatsapp, url } = reservation;

  return (
    <Layer lang={lang}>
      <div className="g-scrim" onClick={onClose} />
      <div className="g-lsheet g-rsheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="g-handle" />
        <div className="g-rhead">
          <div className="g-rtitle">
            <span className="g-k">{getTranslation('reserve_title', lang)}</span>
            <h2 id={titleId} className="g-h2">{restaurant.name}</h2>
          </div>
          <button type="button" className="g-back" onClick={onClose}>{getTranslation('close', lang)}</button>
        </div>

        <div>
          {phones.map(phone => (
            <ChannelRow
              key={phone}
              href={`tel:${phone.replace(/[^+\d]/g, '')}`}
              label={getTranslation('book_phone', lang)}
              detail={phone}
              action={getTranslation('call', lang)}
              onClick={() => onChannel('click_phone')}
            />
          ))}
          {whatsapp && (
            <ChannelRow
              href={buildWhatsAppUrl(whatsapp)}
              external
              label={getTranslation('book_whatsapp', lang)}
              detail={whatsapp}
              action={getTranslation('open', lang)}
              onClick={() => onChannel('click_whatsapp')}
            />
          )}
          {url && (
            <ChannelRow
              href={url}
              external
              label={getTranslation('book_online', lang)}
              detail={hostOf(url)}
              action={getTranslation('open', lang)}
              onClick={() => onChannel('click_url')}
            />
          )}
        </div>
      </div>
    </Layer>
  );
}
