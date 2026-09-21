import { Focusable } from '../../lib/spatialNav'
import { orderedLanguages } from '../../lib/languages'
import { getTvString } from '../../lib/i18n'
import { tileImage } from '../../lib/tileImages'
import type { GuidebookData } from '../../lib/api'
import { Az, AzulejoDefs, BackBar, Backdrop } from '../parts'

/**
 * Selector de idioma: azulejos con el nombre de cada idioma en SU idioma. Sin
 * banderas: un idioma no es un país (el catalán ni tiene bandera «honesta») y el
 * nombre nativo es lo que reconoce el huésped. El título va en el idioma ACTUAL:
 * quien no lo lea se guía por los nombres de abajo.
 *
 * El guidebook ya viene traducido del backend; cambiar aquí sólo recarga los
 * datos en el idioma elegido, la traducción no se hace en la tele.
 */
export function Idioma({
  data, lang, rtl, onBack, onSelect,
}: {
  data: GuidebookData
  lang: string
  rtl: boolean
  onBack: () => void
  onSelect: (code: string) => void
}) {
  const languages = orderedLanguages(data.meta?.available_langs)
  const hasCurrent = languages.some(l => l.code === lang)

  return (
    <>
      <AzulejoDefs />
      <Backdrop image={tileImage('background', data.tv?.tiles)} sun={[880, -120, 260]} rtl={rtl} />
      <BackBar lang={lang} onBack={onBack} />
      <h1 className="h1 abs" style={{ insetInlineStart: 72, top: 140 }}>{getTvString('choose_language', lang)}</h1>
      <p className="body abs" style={{ insetInlineStart: 72, top: 252, maxWidth: '84ch' }}>{getTvString('language_hint', lang)}</p>

      <div className="lgrid">
        {languages.map((language, i) => {
          const current = language.code === lang
          return (
            <Focusable
              key={language.code}
              id={`lang-${language.code}`}
              className={`lt ${language.code}${current ? ' cur' : ''}`}
              autoFocus={current || (i === 0 && !hasCurrent)}
              onSelect={() => onSelect(language.code)}
            >
              <Az />
              <span dir={language.rtl ? 'rtl' : undefined}>{language.native}</span>
            </Focusable>
          )
        })}
      </div>
    </>
  )
}
