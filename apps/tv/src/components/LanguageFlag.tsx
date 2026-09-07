import type { LanguageOption } from '../lib/languages'

/**
 * Bandera de un idioma: imagen real, no el emoji — ver el comentario en
 * lib/languages.ts sobre por qué el emoji no es fiable en esta plataforma.
 * Componente compartido para que la rejilla de idiomas y la tesela del
 * inicio pinten exactamente la misma bandera, al mismo tratamiento visual.
 */
export function LanguageFlag({ language, height = 32 }: { language: LanguageOption; height?: number }) {
  const width = Math.round(height * (4 / 3))
  const radius = Math.round(height * 0.14)

  if (language.flag) {
    return (
      <img
        src={language.flag}
        alt=""
        width={width}
        height={height}
        style={{
          width, height, borderRadius: radius, objectFit: 'cover',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.18)',
        }}
      />
    )
  }

  // Sin bandera honesta (catalán) se pone el código en texto, que es mejor
  // que colgarle la bandera de otro país.
  return (
    <span
      className="grid shrink-0 place-items-center font-bold"
      style={{
        width, height, borderRadius: radius,
        background: 'rgba(0,0,0,0.28)', color: 'var(--tv-text)',
        fontSize: Math.round(height * 0.42),
      }}
    >
      {language.code.toUpperCase()}
    </span>
  )
}
