/**
 * Lienzo ambiente: una foto del alojamiento, muy atenuada, bajo el degradado de
 * marca.
 *
 * Antes era una escena mediterránea dibujada (sol, olas, reflejo) y luego un
 * degradado sordo a secas. La foto vuelve a traer sitio y calidez —la pantalla
 * parece parte de la casa y no una web abierta en la tele— pero entra por
 * DEBAJO del scrim, no encima:
 *
 * toda la app es de tinta clara sobre fondo oscuro (`--tv-text` es casi blanco,
 * y las teselas se separan del lienzo por SALTO DE LUMINANCIA hacia arriba, ver
 * lib/theme.ts). Una pared encalada a plena luz invierte esa polaridad de golpe:
 * el reloj y el nombre del alojamiento, que van sobreimpresos sin tarjeta
 * propia, se quedan sin contraste, y las teselas oscuras pasan de flotar a
 * hundirse. El scrim deja pasar lo que aporta la foto (la temperatura de la
 * luz, la sombra del olivo, el suelo abajo) y no lo que la rompe.
 *
 * Si alguna vez hay que verla más: son `--tv-scrim-top` / `--tv-scrim-bottom`
 * en lib/theme.ts, nada más. Bajar de ~0.80 empieza a comerse la cabecera, que
 * es el texto más desprotegido de la pantalla.
 */

export function MediterraneanBackground({ image }: { image?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Color de base bajo la foto: si la imagen aún no ha decodificado (o la
          sobrescrita del anfitrión no carga), lo que se ve es el degradado de
          siempre y no un rectángulo blanco de un fotograma. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(165deg, var(--tv-canvas, #0a2431) 0%, var(--tv-canvas-deep, #06202c) 62%, #04161f 100%)',
        }}
      />

      {image && (
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          decoding="async"
        />
      )}

      {/* Scrim: devuelve el lienzo a la oscuridad que el resto del sistema da
          por supuesta. Va teñido con el color de marca, no con negro puro, para
          que la foto no quede sucia sino "de noche". */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg,
            var(--tv-scrim-top, rgba(6,32,44,0.93)) 0%,
            var(--tv-scrim-bottom, rgba(10,36,49,0.84)) 100%)`,
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
