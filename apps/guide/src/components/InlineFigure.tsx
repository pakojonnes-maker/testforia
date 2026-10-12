import { useState } from 'react';

/** Foto que va DENTRO del texto de una guía: `after` = tras qué apartado (1 = el primero). */
export interface InlinePhoto {
  id: string;
  url: string;
  after: number;
  width?: number | null;
  height?: number | null;
}

/** Alto máximo de una foto intercalada, en vh: una foto vertical no debe llenar la pantalla entera. */
const INLINE_MAX_VH = 62;

/**
 * Una foto entre dos párrafos. Se ve entera, sin recortar: enseña un botón, una llave, un mando, y el
 * recorte de un arco podría dejar fuera justo eso. Con las medidas que guarda el admin el hueco queda
 * reservado antes de que llegue la foto; si no carga, no se dibuja nada.
 */
export default function InlineFigure({ photo, alt }: { photo: InlinePhoto; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  const { width, height } = photo;
  const sized = !!width && !!height;
  return (
    <figure className="g-inph" style={sized ? { width: `min(100%, ${(INLINE_MAX_VH * width) / height}vh)` } : undefined}>
      <img
        src={photo.url}
        alt={alt}
        width={sized ? width : undefined}
        height={sized ? height : undefined}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </figure>
  );
}
