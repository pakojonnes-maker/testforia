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
  let bgColors = 'var(--brand-primary)';
  
  if (action_type === 'WHATSAPP') {
    iconName = 'chat';
    defaultLabelKey = 'book_whatsapp';
    bgColors = '#25D366';
  } else if (action_type === 'URL') {
    iconName = 'language';
    defaultLabelKey = 'book_online';
    bgColors = 'var(--brand-primary)';
  } else if (action_type === 'PHONE') {
    iconName = 'phone';
    defaultLabelKey = 'call_now';
    bgColors = 'var(--oliva)';
  }

  const label = cta_label || getTranslation(defaultLabelKey, lang);

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 20px',
        borderRadius: 'var(--r-pill)',
        fontSize: '0.9rem',
        fontWeight: 700,
        background: bgColors,
        color: '#fff',
        transition: 'transform 0.2s, box-shadow 0.2s',
        width: '100%',
        boxShadow: 'var(--sh-sm)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--sh-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'var(--sh-sm)';
      }}
    >
      <span className="material-icons-round" style={{ fontSize: '18px' }}>{iconName}</span>
      {label}
    </button>
  );
}
