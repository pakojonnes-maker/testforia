import { useEffect } from 'react';

// Cuántas capas (modales, paneles, hojas) piden el bloqueo a la vez. Con un
// simple set/reset por componente, cerrar un modal abierto DESDE otro modal
// devolvía el scroll al body aunque el de fuera siguiera abierto.
let lockCount = 0;

/**
 * Bloquea el scroll de la página mientras `active` sea true.
 *
 * OJO: `document.body.style.overflow === 'hidden'` no es solo cosmético — es la
 * señal que GuidebookPage.tsx usa para desactivar el swipe entre pestañas
 * mientras hay una capa abierta. Mantener ese contrato exacto.
 */
export default function useLockBodyScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockCount += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      lockCount -= 1;
      if (lockCount <= 0) {
        lockCount = 0;
        document.body.style.overflow = '';
      }
    };
  }, [active]);
}
