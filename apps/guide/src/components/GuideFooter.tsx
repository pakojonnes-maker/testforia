import { useId } from 'react';
import { getTranslation } from '../lib/i18n';

/**
 * Franja de azulejo. Los colores salen del tema de la agencia (primario, secundario y acento), no de
 * una paleta fija: cada guía enseña su propia marca en el pie.
 */
export function AzulejoStrip({ height = 36 }: { height?: number }) {
  const id = 'azu' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width="100%" height={height} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width={height} height={height} patternUnits="userSpaceOnUse">
          <g transform={`scale(${(height / 56).toFixed(4)})`}>
            <rect width="56" height="56" style={{ fill: 'var(--g-cal)' }} />
            <rect x="1" y="1" width="54" height="54" fill="none" strokeWidth="1.2" style={{ stroke: 'var(--g-fill)' }} />
            <path d="M28 6 C31 17 39 25 50 28 C39 31 31 39 28 50 C25 39 17 31 6 28 C17 25 25 17 28 6 Z" style={{ fill: 'var(--g-fill)' }} />
            <circle cx="28" cy="28" r="5" style={{ fill: 'var(--g-accent)' }} />
            {[[0, 0], [56, 0], [0, 56], [56, 56]].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="7" style={{ fill: 'var(--g-second)' }} />
            ))}
          </g>
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#${id})`} />
    </svg>
  );
}

// Pie de las pestañas de contenido: acceso permanente a Privacidad y aviso legal (art. 10 LSSI) y el
// crédito de la plataforma. La franja oscura sigue por detrás de la barra inferior, sin hueco de papel.
export default function GuideFooter({ lang }: { lang: string }) {
  return (
    <footer className="g-foot">
      <AzulejoStrip />
      <div className="g-foot-in">
        <a href={`/legal?lang=${lang}`}>{getTranslation('legal_link', lang)}</a>
        <a className="g-credit" href="https://visualtastes.com" target="_blank" rel="noopener noreferrer">
          {getTranslation('footer_credit', lang)}
        </a>
      </div>
    </footer>
  );
}
