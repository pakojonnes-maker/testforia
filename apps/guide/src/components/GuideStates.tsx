import { getTranslation } from '../lib/i18n';

/** El arco de la marca con sol y ola: la ilustración de los estados sin contenido. Sin iconos. */
export function ArchGlyph({ width = 64 }: { width?: number }) {
  return (
    <svg width={width} height={Math.round(width * 1.25)} viewBox="0 0 64 80" fill="none" aria-hidden="true" focusable="false">
      <path d="M4 78V32a28 28 0 0 1 56 0v46Z" strokeWidth="2" style={{ stroke: 'var(--g-ink)' }} />
      <path d="M11 78V33a21 21 0 0 1 42 0v45" strokeWidth="1.5" style={{ stroke: 'var(--g-arena2)' }} />
      <circle cx="32" cy="42" r="8" style={{ fill: 'var(--g-accent)' }} />
      <path d="M12 65c5-4 10-4 14.5 0s9 4 14 0 8-3 12-1" strokeWidth="2" strokeLinecap="round" style={{ stroke: 'var(--g-fill)' }} />
    </svg>
  );
}

/** Mientras llega la guía. La agencia aún no se conoce, así que va con los colores del diseño. */
export function GuideLoading({ lang }: { lang: string }) {
  return (
    <div className="guide-app g-state" role="status" aria-live="polite" dir="ltr">
      <ArchGlyph width={132} />
      <p className="g-loadtxt">{getTranslation('loading', lang)}</p>
      <span className="g-load-bar" aria-hidden="true"><i /></span>
    </div>
  );
}

/** Enlace roto o guía que ya no existe. */
export function GuideNotFound({ lang }: { lang: string }) {
  return (
    <div className="guide-app g-state" role="alert">
      <ArchGlyph width={92} />
      <div className="g-404" aria-hidden="true">404</div>
      <h1 className="g-h2">{getTranslation('guidebook_not_found', lang)}</h1>
    </div>
  );
}
