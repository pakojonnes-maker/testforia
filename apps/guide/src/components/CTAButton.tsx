import { buildWhatsAppUrl } from '../lib/api';
import { getTranslation } from '../lib/i18n';
import type { CtaActionType } from '../lib/types';

interface Experience {
  id: string;
  // Ya resuelto por el worker (principal o secundario, ver workerGuide.js).
  action_type: CtaActionType;
  action_data: string;
  prefilled_message: string;
  cta_label?: string;
}

interface CTAButtonProps {
  experience: Experience;
  lang: string;
  onIntent: (action: string) => void;
}

// El botón de una experiencia: una píldora con el relleno de la agencia y solo texto. Ya no hay un color por
// canal (el verde de WhatsApp, el azul de la llamada): la etiqueta dice qué hará, y el color es el de la marca.
export default function CTAButton({ experience, lang, onIntent }: CTAButtonProps) {
  const { action_type, action_data, prefilled_message, cta_label } = experience;

  // Sin canal o sin destino no hay nada que pulsar. Antes se pintaba igual un
  // botón que caía en el `default` del switch y no hacía absolutamente nada.
  if (!action_type || !action_data?.trim()) return null;

  const handleClick = () => {
    switch (action_type) {
      case 'WHATSAPP': {
        const url = buildWhatsAppUrl(action_data, prefilled_message);
        onIntent('click_whatsapp');
        window.open(url, '_blank');
        break;
      }
      case 'URL':
        onIntent('click_url');
        window.open(action_data, '_blank');
        break;
      case 'PHONE':
        onIntent('click_phone');
        window.location.href = `tel:${action_data}`;
        break;
      default:
        onIntent('click_other');
        break;
    }
  };

  const defaultLabelKey =
    action_type === 'WHATSAPP' ? 'book_whatsapp'
    : action_type === 'URL' ? 'book_online'
    : action_type === 'PHONE' ? 'call_now'
    : 'show_more';

  return (
    <button type="button" onClick={handleClick} className="g-pill fill">
      {cta_label || getTranslation(defaultLabelKey, lang)}
    </button>
  );
}
