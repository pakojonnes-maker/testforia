import { useState } from 'react';
import { getTranslation, LANG_NAMES } from '../lib/i18n';
import useDismissableLayer from '../hooks/useDismissableLayer';
import Layer from './Layer';

interface LanguageSwitcherProps {
  lang: string;
  onLanguageChange?: (lang: string) => void;
  /** `bar`: el nombre del idioma (cabeceras de pestaña). `floating`: solo el código, donde falta sitio (mapa, esquina). */
  variant?: 'bar' | 'floating';
}

/**
 * Selector de idioma: una píldora con el idioma actual que abre una hoja con los 13. Sin banderas ni
 * iconos: cada idioma se muestra con su nombre en su propia lengua y su código. Al final de la hoja va el
 * enlace a Privacidad y aviso legal, para que se llegue a él desde cualquier pestaña (Lugares y Conserje
 * no llevan pie).
 */
export function LanguageSwitcher({ lang, onLanguageChange, variant = 'bar' }: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const compact = variant === 'floating';
  const label = compact ? lang.toUpperCase() : LANG_NAMES[lang] || lang.toUpperCase();

  return (
    <>
      <button
        type="button"
        className={`g-lang${compact ? ' s' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${getTranslation('language_title', lang)}: ${LANG_NAMES[lang] || lang}`}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      {open && (
        <LanguageSheet
          lang={lang}
          onPick={(code) => {
            onLanguageChange?.(code);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function LanguageSheet({ lang, onPick, onClose }: { lang: string; onPick: (code: string) => void; onClose: () => void }) {
  useDismissableLayer(true, onClose);
  return (
    <Layer lang={lang}>
      <div className="g-scrim" onClick={onClose} />
      <div className="g-lsheet" role="dialog" aria-modal="true" aria-label={getTranslation('language_title', lang)}>
        <div className="g-handle" />
        <div className="g-titlebar">
          <h2 className="g-h1">{getTranslation('language_title', lang)}</h2>
          <button type="button" className="g-close" onClick={onClose}>{getTranslation('close', lang)}</button>
        </div>
        <div className="g-langs">
          {Object.entries(LANG_NAMES).map(([code, name]) => (
            <button
              key={code}
              type="button"
              lang={code}
              className={`g-lr${code === lang ? ' on' : ''}`}
              aria-current={code === lang ? 'true' : undefined}
              onClick={() => onPick(code)}
            >
              <span>{name}</span>
              <small>{code.toUpperCase()}</small>
            </button>
          ))}
        </div>
        <div className="g-lfoot">
          <a className="g-link" href={`/legal?lang=${lang}`}>{getTranslation('legal_link', lang)}</a>
        </div>
      </div>
    </Layer>
  );
}
