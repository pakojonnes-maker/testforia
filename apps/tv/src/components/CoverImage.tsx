import { useEffect, useState, type ReactNode } from 'react'

/**
 * Foto con plan B.
 *
 * Todas las imágenes de la pantalla vienen de R2 por red, y en un apartamento
 * la red se cae a ratos. Sin esto, una foto que no llegaba dejaba un hueco liso
 * bajo el velo degradado, con el texto blanco flotando sobre nada.
 *
 * Lo llamativo es que el respaldo YA ESTABA DISEÑADO en cada pantalla (el
 * degradado de marca con el icono de la categoría), pero sólo se pintaba cuando
 * el dato venía vacío — nunca cuando la descarga fallaba, que es el caso
 * frecuente. Aquí los dos son el mismo camino.
 */
export function CoverImage({
  src,
  fallback,
  className = 'absolute inset-0 h-full w-full object-cover',
}: {
  src?: string | null
  fallback: ReactNode
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  // Reset al cambiar de foto: este componente se reutiliza al navegar entre
  // fichas, y sin esto una imagen rota marcaba como rota también la siguiente.
  useEffect(() => { setFailed(false) }, [src])

  if (!src || failed) return <>{fallback}</>

  return (
    <img
      src={src}
      alt=""
      className={className}
      onError={() => setFailed(true)}
      // La TV no hace scroll: todo lo que se pide está a la vista, así que
      // decodificar de forma asíncrona sólo evita bloquear el hilo principal.
      decoding="async"
    />
  )
}
