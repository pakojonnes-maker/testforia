import { useState, type ReactNode } from 'react';
import { isRealImage } from './MediaPlaceholder';

interface PhotoFigureProps {
  /** Clase de la forma: g-arch, g-fig, g-ph… Con o sin foto, la forma es la misma. */
  className: string;
  src?: string | null;
  alt: string;
  /** De aquí sale la inicial cuando no hay foto. */
  name?: string;
  eager?: boolean;
  /** Sin foto (o si no carga) no se dibuja nada: para las fichas de detalle, donde un arco con solo una inicial ocupa sitio sin decir nada. */
  omitIfMissing?: boolean;
  children?: ReactNode;
}

/**
 * Una foto dentro de su forma (arco, tesela, miniatura). Sin foto —o si la URL no carga— la forma se queda
 * con el fondo de arena y la inicial en grande, en vez de un icono de imagen rota: «sin foto todavía» se
 * ve intencionado, no averiado.
 */
export default function PhotoFigure({ className, src, alt, name, eager = false, omitIfMissing = false, children }: PhotoFigureProps) {
  const [failed, setFailed] = useState(false);
  const real = isRealImage(src) && !failed;
  const initial = (name ?? alt ?? '').trim().charAt(0).toUpperCase();
  if (!real && omitIfMissing) return null;
  return (
    <figure className={`${className}${real ? '' : ' g-noph'}`}>
      {real ? (
        <img src={src as string} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />
      ) : initial ? (
        <i aria-hidden="true">{initial}</i>
      ) : null}
      {children}
    </figure>
  );
}
