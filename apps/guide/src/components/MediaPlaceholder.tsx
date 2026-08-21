import React from 'react';

interface MediaPlaceholderProps {
  label: string;
  className?: string;
}

// "Branded Placeholder" (DESIGN.md — Components): grain-textured tile fill +
// centered serif wordmark, rendered as real DOM text inside the container's
// own aspect ratio. Replaces the old pattern of falling back to an external
// placehold.co image: that baked the label into a fixed-resolution raster
// (e.g. 600x400), so object-cover cropped it unpredictably — and sometimes
// severely — whenever the actual container aspect (a tall arch-mask card vs.
// a short wide one) didn't match the source image, cutting text off at both
// edges. A DOM label never gets cropped, and looks identical everywhere.
//
// The fill used to be a diagonal checkerboard (.azulejo-pattern) at 8%
// opacity — technically an homage to Spanish tile, but that exact motif
// (alternating transparent squares) is the universal "missing image" icon in
// every browser and image editor, so items without a photo (an "Emergencias"
// info card, say) read as broken rather than as a deliberate placeholder.
// .bg-grain (already used for the landing page's mockups) plus a soft photo
// icon reads as "no photo yet" without borrowing that broken-image language.
export default function MediaPlaceholder({ label, className = '' }: MediaPlaceholderProps) {
  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center gap-2 overflow-hidden bg-surface-container bg-grain ${className}`}>
      <span className="material-symbols-outlined relative text-primary/25 text-[36px]" aria-hidden="true">image</span>
      {label && (
        <span className="relative font-display-lg text-headline-md text-primary uppercase tracking-tight opacity-60 text-center px-4 line-clamp-2">
          {label}
        </span>
      )}
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
