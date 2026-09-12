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
  onUnavailable,
  className = 'absolute inset-0 h-full w-full object-cover',
}: {
  src?: string | null
  fallback: ReactNode
  /**
   * Se llama cuando no hay foto que enseñar: ni URL, ni descarga que funcione.
   * Existe porque hay sitios donde el respaldo no es "pinta otra cosa en el
   * mismo hueco" sino "este hueco sobra" — la ficha de Guías Rápidas colapsa su
   * columna de imagen y le da el ancho entero al texto. Sin esto, el consumidor
   * no puede distinguir "sin foto" de "la foto da 404", que es el caso normal
   * cuando una demo se siembra y las imágenes no se llegan a subir.
   */
  onUnavailable?: (unavailable: boolean) => void
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  // Reset al cambiar de foto: este componente se reutiliza al navegar entre
  // fichas, y sin esto una imagen rota marcaba como rota también la siguiente.
  useEffect(() => { setFailed(false) }, [src])

  const unavailable = !src || failed
  useEffect(() => { onUnavailable?.(unavailable) }, [unavailable, onUnavailable])

  if (unavailable) return <>{fallback}</>

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
