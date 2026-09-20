import { useState } from 'react';
import { buildWhatsAppUrl } from '../lib/api';
import { getTranslation } from '../lib/i18n';
import useDismissableLayer from '../hooks/useDismissableLayer';
import { isRealImage } from '../lib/media';
import Layer from './Layer';

export interface WelcomeModalData {
  image_url: string | null;
  title: string;
  body: string;
  action_enabled: boolean;
  action_type: 'URL' | 'WHATSAPP' | 'PHONE' | null;
  action_data: string | null;
  action_label: string;
}

interface WelcomeModalProps {
  welcome: WelcomeModalData;
  onClose: () => void;
  lang: string;
}

// La bienvenida del anfitrión: una hoja desde abajo con la foto en un arco que asoma por encima del borde.
// «Cerrar» está siempre, aparte de la acción. Si la foto no carga, la hoja sigue siendo válida sin ella.
export default function WelcomeModal({ welcome, onClose, lang }: WelcomeModalProps) {
  useDismissableLayer(true, onClose);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = isRealImage(welcome.image_url) && !imageFailed;

  const actionHref = (() => {
    if (!welcome.action_enabled || !welcome.action_data) return null;
    if (welcome.action_type === 'WHATSAPP') return buildWhatsAppUrl(welcome.action_data);
    if (welcome.action_type === 'PHONE') return `tel:${welcome.action_data.replace(/[^+\d]/g, '')}`;
    return welcome.action_data;
  })();

  return (
    <Layer lang={lang}>
      <div className="g-scrim" onClick={onClose} />
      <div className={`g-wsheet${showImage ? '' : ' noimg'}`} role="dialog" aria-modal="true" aria-label={welcome.title}>
        <button type="button" className="g-close" onClick={onClose}>{getTranslation('close', lang)}</button>
        {showImage && (
          <figure className="g-warch">
            <img src={welcome.image_url as string} alt="" onError={() => setImageFailed(true)} />
          </figure>
        )}
        <div className="g-wcontent">
          <h2 className="g-h2">{welcome.title}</h2>
          {welcome.body && <p className="g-p">{welcome.body}</p>}
          {actionHref && (
            <a
              className="g-pill fill"
              href={actionHref}
              target={welcome.action_type === 'URL' ? '_blank' : undefined}
              rel="noopener noreferrer"
              onClick={onClose}
            >
              {welcome.action_label || getTranslation('show_more', lang)}
            </a>
          )}
        </div>
      </div>
    </Layer>
  );
}
