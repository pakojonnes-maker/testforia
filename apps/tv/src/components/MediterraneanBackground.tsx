/**
 * Lienzo ambiente. Antes era una escena mediterránea completa (sol, olas,
 * reflejo) y ese era justo el problema: con tarjetas de cristal encima, cada
 * una tenía un contraste distinto según lo que le tocara detrás, y el ojo iba
 * al fondo en vez de al contenido.
 *
 * Ahora es un degradado sordo teñido con el color de la marca del anfitrión,
 * más un halo muy tenue. Mantiene la identidad sin competir con nada.
 */
export function MediterraneanBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(165deg, var(--tv-canvas, #0a2431) 0%, var(--tv-canvas-deep, #06202c) 62%, #04161f 100%)',
        }}
      />

      {/* Halo de marca en la esquina superior: da profundidad y sitúa la
          cabecera sin robar atención al mosaico. */}
      <div
        className="absolute rounded-full"
        style={{
          width: '70vw',
          height: '70vw',
          top: '-32vw',
          right: '-18vw',
          background: 'radial-gradient(circle, var(--tv-accent-soft, rgba(52,194,201,0.16)) 0%, transparent 68%)',
          animation: 'ambient-drift 26s ease-in-out infinite alternate',
        }}
      />

      {/* Segundo halo, frío, abajo a la izquierda: rompe la simetría sin ruido. */}
      <div
        className="absolute rounded-full"
        style={{
          width: '46vw',
          height: '46vw',
          bottom: '-22vw',
          left: '-12vw',
          background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
        }}
      />

      {/* Viñeta: empuja la mirada al centro, que es donde vive el contenido. */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(125% 95% at 50% 45%, transparent 52%, rgba(0,0,0,0.42) 100%)' }}
      />
    </div>
  )
}
