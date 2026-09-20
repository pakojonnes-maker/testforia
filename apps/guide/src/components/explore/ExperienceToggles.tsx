import { getTranslation } from '../../lib/i18n';

interface ExperienceTogglesProps {
  free: boolean;
  paid: boolean;
  onToggleFree: () => void;
  onTogglePaid: () => void;
  lang: string;
}

// Dos conmutadores independientes, en cursiva de titular con un subrayado: el de las experiencias con el
// primario de la agencia y el de pago con su acento. El estado va en aria-pressed, no solo en el color.
export default function ExperienceToggles({ free, paid, onToggleFree, onTogglePaid, lang }: ExperienceTogglesProps) {
  return (
    <div className="g-tog" role="group">
      <button type="button" aria-pressed={free} className={free ? 'on' : ''} onClick={onToggleFree}>
        {getTranslation('experience_toggle_free', lang)}
      </button>
      <button type="button" aria-pressed={paid} className={paid ? 'on gold' : ''} onClick={onTogglePaid}>
        {getTranslation('experience_toggle_paid', lang)}
      </button>
    </div>
  );
}
