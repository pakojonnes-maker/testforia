import React from 'react';
import { buildWhatsAppUrl } from '../lib/api';
import { getTranslation } from '../lib/i18n';

interface Experience {
  id: string;
  action_type: string;
  action_data: string;
  prefilled_message: string;
  cta_label?: string;
}

interface CTAButtonProps {
  experience: Experience;
  lang: string;
  onIntent: (action: string) => void;
}

// Flat, uppercase label-caps button — WhatsApp keeps its brand green (not part
// of the guidebook palette, guests recognize it), everything else is cobalt.
export default function CTAButton({ experience, lang, onIntent }: CTAButtonProps) {
  const { action_type, action_data, prefilled_message, cta_label } = experience;

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

  let iconName = 'arrow_forward';
  let defaultLabelKey = 'show_more';
  let bgClass = 'bg-primary hover:bg-primary-container';

  if (action_type === 'WHATSAPP') {
    iconName = 'chat';
    defaultLabelKey = 'book_whatsapp';
    bgClass = 'bg-[#25D366] hover:bg-[#1fb959]';
  } else if (action_type === 'URL') {
    iconName = 'language';
    defaultLabelKey = 'book_online';
    bgClass = 'bg-primary hover:bg-primary-container';
  } else if (action_type === 'PHONE') {
    iconName = 'phone';
    defaultLabelKey = 'call_now';
    bgClass = 'bg-secondary hover:bg-on-secondary-fixed-variant';
  }

  const label = cta_label || getTranslation(defaultLabelKey, lang);

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center justify-center gap-2 px-5 py-3 font-label-caps text-label-caps uppercase text-on-primary w-full transition-colors ${bgClass}`}
    >
      <span className={`material-symbols-outlined text-[18px]${iconName === 'arrow_forward' ? ' icon-directional' : ''}`}>{iconName}</span>
      {label}
    </button>
  );
}
