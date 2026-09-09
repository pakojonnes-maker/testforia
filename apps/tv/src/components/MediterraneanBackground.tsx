import { CoverImage } from './CoverImage'

/**
 * Lienzo ambiente: la foto del alojamiento, a cara descubierta.
 *
 * Llevó encima un velo (scrim de marca + dos halos + viñeta) para proteger el
 * texto de la cabecera, que va sobreimpreso sin tarjeta propia. Se ha quitado a
 * petición: la foto se ve tal cual, sin nada delante.
 *
 * Si la cabecera se queda corta de contraste sobre una foto clara, la solución
 * NO es devolver el velo a toda la pantalla —eso apaga la foto entera para
 * arreglar una franja—: es darle fondo propio a la cabecera, o elegir una foto
 * con la zona superior tranquila. Los fondos de serie están compuestos con la
 * parte de arriba despejada justo por esto.
 *
 * El bloque decorativo de abajo sobrevive SÓLO como respaldo para cuando no hay
 * foto que pintar: una URL sobrescrita por el anfitrión que devuelve 404 dejaría
 * si no un rectángulo liso detrás del mosaico.
 */
export function MediterraneanBackground({ image }: { image?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <CoverImage
        src={image}
        fallback={
          <>
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
          </>
        }
      />
    </div>
  )
}
