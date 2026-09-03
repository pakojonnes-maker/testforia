import { Focusable } from '../lib/spatialNav'
import { orderedLanguages } from '../lib/languages'

/**
 * Selector de idioma. El guidebook ya viene traducido del backend (13 idiomas
 * activos), así que cambiar aquí sólo recarga los datos en el idioma elegido:
 * la traducción no se hace en la TV.
 *
 * Cada opción se escribe en SU PROPIO idioma. Un huésped alemán busca
 * "Deutsch", no "Alemán" — que es lo único que sabría leer si la lista
 * estuviera en el idioma actual de la pantalla.
 */
export function LanguageScreen({
  available, current, onSelect,
}: {
  available?: string[]
  current: string
  onSelect: (code: string) => void
}) {
  const languages = orderedLanguages(available)

  return (
    <div className="screen-in flex h-full flex-col">
      <div className="shrink-0 pb-8">
        <div className="t-label" style={{ color: 'var(--tv-accent)' }}>Idioma</div>
        <h2 className="t-display mt-3 text-6xl font-bold" style={{ color: 'var(--tv-text)' }}>
          Elige tu idioma
        </h2>
        <p className="mt-3 max-w-[60ch] text-lg" style={{ color: 'var(--tv-text-dim)' }}>
          Toda la pantalla, incluidas las recomendaciones y las normas de la casa.
        </p>
      </div>

      <div className="col-scroll min-h-0 flex-1">
        <div className="grid grid-cols-4 gap-4 pt-1">
          {languages.map((language, i) => {
            const isCurrent = language.code === current
            return (
              <Focusable
                key={language.code}
                id={`lang-${language.code}`}
                autoFocus={isCurrent || (i === 0 && !languages.some(l => l.code === current))}
                onSelect={() => onSelect(language.code)}
              >
                <div
                  className="flex items-center gap-4 p-5"
                  style={{
                    borderRadius: '1.25rem',
                    background: isCurrent ? 'var(--tv-accent)' : 'var(--tv-surface)',
                    border: '1px solid var(--tv-line)',
                  }}
                >
                  {/* Sin bandera honesta (catalán) se pone el código en texto,
                      que es mejor que colgarle la bandera de otro país. */}
                  {language.flag ? (
                    <span className="text-4xl leading-none">{language.flag}</span>
                  ) : (
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold"
                      style={{
                        background: 'rgba(0,0,0,0.28)',
                        color: isCurrent ? 'var(--tv-accent-ink)' : 'var(--tv-text)',
                      }}
                    >
                      {language.code.toUpperCase()}
                    </span>
                  )}

                  <span
                    className="t-display truncate text-2xl font-bold"
                    style={{ color: isCurrent ? 'var(--tv-accent-ink)' : 'var(--tv-text)' }}
                    dir={language.rtl ? 'rtl' : undefined}
                  >
                    {language.native}
                  </span>
                </div>
              </Focusable>
            )
          })}
        </div>
      </div>
    </div>
  )
}
