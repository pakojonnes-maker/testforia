import { useEffect } from 'react';
import { buildWhatsAppUrl } from '../lib/api';
import { getTranslation } from '../lib/i18n';

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

export default function WelcomeModal({ welcome, onClose, lang }: WelcomeModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const actionHref = (() => {
    if (!welcome.action_enabled || !welcome.action_data) return null;
    if (welcome.action_type === 'WHATSAPP') return buildWhatsAppUrl(welcome.action_data);
    if (welcome.action_type === 'PHONE') return `tel:${welcome.action_data.replace(/[^+\d]/g, '')}`;
    return welcome.action_data;
  })();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-on-background/60 animate-[fadeIn_0.2s_ease]"
      onClick={onClose}
    >
      <div
        className="relative w-full md:max-w-sm md:mx-4 bg-surface-container-lowest border border-on-background/10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button — always available, independent of the action button below */}
        <button
          onClick={onClose}
          aria-label={getTranslation('close', lang)}
          className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center bg-on-background/40 text-crisp-white hover:bg-on-background/60 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {welcome.image_url && (
          <div className="w-full h-48 md:h-56 overflow-hidden">
            <img src={welcome.image_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-6 text-center">
          <h2 className="font-headline-md text-headline-md text-on-background mb-2">{welcome.title}</h2>
          {welcome.body && (
            <p className="font-body-md text-body-md text-on-surface-variant whitespace-pre-line mb-5">
              {welcome.body}
            </p>
          )}

          {actionHref && (
            <a
              href={actionHref}
              target={welcome.action_type === 'URL' ? '_blank' : undefined}
              rel="noopener noreferrer"
              onClick={onClose}
              className="block w-full py-3 text-crisp-white font-label-caps text-label-caps uppercase transition-colors"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {welcome.action_label || getTranslation('show_more', lang)}
            </a>
          )}
        </div>

        <div className="pb-[env(safe-area-inset-bottom,16px)] md:pb-0" />
      </div>
    </div>
  );
}
