import { getTranslation } from '../lib/i18n';
import useDismissableLayer from '../hooks/useDismissableLayer';
import Layer from './Layer';

export interface PhoneEntry {
  id: string;
  category: string;
  icon: string;
  name: string;
  phone_number: string;
}

interface PhonesModalProps {
  phones: PhoneEntry[];
  lang: string;
  onClose: () => void;
}

// Una lista de números, cada fila un enlace tel:. Llega ya ordenada (agencia primero) desde workerGuide.js.
// El campo `icon` de cada teléfono ya no se usa: la fila dice el nombre, el número y «Llamar».
export default function PhonesModal({ phones, lang, onClose }: PhonesModalProps) {
  useDismissableLayer(true, onClose);

  return (
    <Layer lang={lang}>
      <div className="g-scrim" onClick={onClose} />
      <div className="g-full" role="dialog" aria-modal="true" aria-label={getTranslation('phones_title', lang)}>
        <div className="g-titlebar">
          <h2 className="g-h1">{getTranslation('phones_title', lang)}</h2>
          <button type="button" className="g-close" onClick={onClose}>{getTranslation('close', lang)}</button>
        </div>
        <div className="g-plist">
          {phones.map(p => (
            <a key={p.id} className="g-prow" href={`tel:${p.phone_number}`}>
              <div>
                <span className="g-kd mute">{p.name}</span>
                <b dir="ltr">{p.phone_number}</b>
              </div>
              <span className="g-go">{getTranslation('call', lang)}</span>
            </a>
          ))}
        </div>
      </div>
    </Layer>
  );
}
