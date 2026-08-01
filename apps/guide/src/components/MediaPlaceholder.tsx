import React from 'react';

interface MediaPlaceholderProps {
  label: string;
  className?: string;
}

// "Branded Placeholder" (DESIGN.md — Components): azulejo tile fill + centered
// serif wordmark, rendered as real DOM text inside the container's own
// aspect ratio. Replaces the old pattern of falling back to an external
// placehold.co image: that baked the label into a fixed-resolution raster
// (e.g. 600x400), so object-cover cropped it unpredictably — and sometimes
// severely — whenever the actual container aspect (a tall arch-mask card vs.
// a short wide one) didn't match the source image, cutting text off at both
// edges. A DOM label never gets cropped, and looks identical everywhere.
export default function MediaPlaceholder({ label, className = '' }: MediaPlaceholderProps) {
  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-surface-container ${className}`}>
      <div className="absolute inset-0 azulejo-pattern" />
      <span className="relative font-display-lg text-headline-md text-primary uppercase tracking-tight opacity-60 text-center px-4 line-clamp-2">
        {label}
      </span>
    </div>
  );
}

// Algunas filas antiguas en la BD guardaron literalmente la URL de un
// placeholder externo (p.ej. el "No Image" que WelcomeHero usaba antes) como
// si fuera la imagen real del POI/plato. Tratarla como "sin imagen" evita
// mostrar ese placeholder ajeno — con su propio recorte inconsistente — en
// vez del nuestro.
export function isRealImage(url?: string | null): url is string {
  return !!url && !url.includes('placehold.co');
}
