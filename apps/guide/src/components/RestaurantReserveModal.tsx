import React, { useId } from 'react';
import { createPortal } from 'react-dom';
import { getTranslation } from '../lib/i18n';
import { buildWhatsAppUrl } from '../lib/api';
import useDismissableLayer from '../hooks/useDismissableLayer';
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
  icon: string;
  iconClass: string;
  label: string;
  detail: string;
  onClick: () => void;
}

const ROW_CLASS =
  'flex items-center gap-4 px-5 py-4 min-h-[64px] border-b border-on-background/10 last:border-b-0 hover:bg-primary/5 active:bg-primary/10 transition-colors';

function ChannelRow({ href, external, icon, iconClass, label, detail, onClick }: ChannelRowProps) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      onClick={onClick}
      className={ROW_CLASS}
    >
      <span className={`material-symbols-outlined text-2xl shrink-0 ${iconClass}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      {/* min-w-0: sin él un flex-1 conserva min-width:auto y una etiqueta larga
          (alemán, ruso) empuja la fila y se come el número. */}
      <div className="flex-1 min-w-0">
        <p className="font-label-caps text-label-caps text-on-surface-variant uppercase break-words">{label}</p>
        {/* <bdi>: un número de teléfono dentro de un párrafo RTL (árabe) debe
            conservar su orden de dígitos sin que el párrafo deje de alinearse
            a la derecha, que es lo que haría un dir="ltr" en el <p>. */}
        <p className="font-mono-badge text-[18px] tracking-wide text-on-background break-words"><bdi>{detail}</bdi></p>
      </div>
      <span className="material-symbols-outlined text-primary shrink-0 icon-directional">chevron_right</span>
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
// Portal sobre <body> por la misma razón que PhonesModal: el transform de la
// transición entre pestañas captura los position:fixed de sus hijos.
export default function RestaurantReserveModal({ restaurant, reservation, lang, onClose, onChannel }: RestaurantReserveModalProps) {
  useDismissableLayer(true, onClose);
  const titleId = useId();
  const { phones, whatsapp, url } = reservation;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-on-background/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="bg-surface-container-lowest border border-on-background/10 w-full md:max-w-md max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="shrink-0 p-5 flex items-start justify-between gap-3 border-b border-on-background/10">
          <div className="min-w-0">
            <p className="font-label-caps text-label-caps text-secondary uppercase mb-1">
              {getTranslation('reserve_title', lang)}
            </p>
            <h3 id={titleId} className="font-headline-md text-headline-md text-on-background break-words">
              {restaurant.name}
            </h3>
          </div>
          <button
            type="button"
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
          {phones.map(phone => (
            <ChannelRow
              key={phone}
              href={`tel:${phone.replace(/[^+\d]/g, '')}`}
              icon="call"
              iconClass="text-primary"
              label={getTranslation('book_phone', lang)}
              detail={phone}
              onClick={() => onChannel('click_phone')}
            />
          ))}
          {whatsapp && (
            <ChannelRow
              href={buildWhatsAppUrl(whatsapp)}
              external
              icon="chat"
              // Verde de marca de WhatsApp, como en CTAButton: el huésped lo
              // reconoce y no forma parte de la paleta de la guía.
              iconClass="text-[#25D366]"
              label={getTranslation('book_whatsapp', lang)}
              detail={whatsapp}
              onClick={() => onChannel('click_whatsapp')}
            />
          )}
          {url && (
            <ChannelRow
              href={url}
              external
              icon="language"
              iconClass="text-primary"
              label={getTranslation('book_online', lang)}
              detail={hostOf(url)}
              onClick={() => onChannel('click_url')}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
