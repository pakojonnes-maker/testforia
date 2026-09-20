import { getTranslation } from '../lib/i18n';
import { paragraphs } from '../lib/text';
import useDismissableLayer from '../hooks/useDismissableLayer';
import PhotoFigure from './PhotoFigure';
import Layer from './Layer';

export interface InfoItem {
  id: string;
  key: string;
  category?: string | null;
  icon: string;
  color?: string | null;
  title: string;
  // El nombre genérico traducido de la categoría (p. ej. "Lavadora"). Solo se enseña como antetítulo cuando
  // difiere de `title`, es decir, cuando el anfitrión escribió un título propio sobre la categoría.
  category_name?: string | null;
  content: string;
  media: any[];
  category_image_url?: string | null;
  // Punto de recogida opcional (migración 0084) — hoy solo lo rellena el admin para door_code, pero el
  // campo es genérico a nivel de item.
  pickup_instructions?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_sequential?: boolean;
  steps?: Array<{
    id: string;
    step_number: number;
    title: string;
    content: string;
    media: Array<{ url: string }>;
    checklist_items?: string[];
  }>;
}

interface GuideDetailModalProps {
  item: InfoItem;
  image?: string;
  eyebrow?: string | null;
  lang: string;
  onClose: () => void;
}

// La ficha de una guía del apartamento («cómo funciona la lavadora», «dónde aparcar»). Contenido de lectura,
// no un aviso: a pantalla completa, con la foto en un arco y el texto o los pasos debajo. Un texto se parte
// en párrafos; una guía secuencial se dibuja como pasos con su número, su foto y su lista de comprobación.
export default function GuideDetailModal({ item, image, eyebrow, lang, onClose }: GuideDetailModalProps) {
  useDismissableLayer(true, onClose);

  const steps = item.is_sequential && item.steps && item.steps.length > 0 ? item.steps : null;
  const paras = steps ? [] : paragraphs(item.content);

  return (
    <Layer lang={lang}>
      <div className="g-scrim" onClick={onClose} />
      <div className="g-full" role="dialog" aria-modal="true" aria-label={item.title}>
        <div className="g-mhead">
          <span className="g-kd">{eyebrow || getTranslation('quick_guides', lang)}</span>
          <button type="button" className="g-close" onClick={onClose}>{getTranslation('close', lang)}</button>
        </div>

        <PhotoFigure className="g-arch g-arch-m" src={image} alt={item.title} name={item.title} omitIfMissing />

        <div className="g-name">
          <h1 className="g-h1">{item.title}</h1>
        </div>

        {steps ? (
          <ol className="g-seq">
            {steps.map(step => (
              <li key={step.id}>
                <div className="g-seq-n">
                  <i>{step.step_number}</i>
                  <span className="g-line" aria-hidden="true" />
                </div>
                <div className="g-seq-b">
                  <h3 className="g-h3">{step.title}</h3>
                  {step.content && <p className="g-prewrap">{step.content}</p>}
                  {step.checklist_items && step.checklist_items.length > 0 && (
                    <ul className="g-check">
                      {step.checklist_items.map((entry, k) => <li key={k}>{entry}</li>)}
                    </ul>
                  )}
                  {step.media?.[0]?.url && (
                    <PhotoFigure className="g-seq-ph" src={step.media[0].url} alt={step.title} name="" />
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="g-body">
            {paras.map((p, i) => (
              <div key={i}>
                {p.head && <h3 className="g-h3 g-body-head">{p.head}</h3>}
                {p.body && <p>{p.body}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layer>
  );
}
