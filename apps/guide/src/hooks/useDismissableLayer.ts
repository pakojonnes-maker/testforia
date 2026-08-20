import { useEffect, useRef } from 'react';
import useLockBodyScroll from './useLockBodyScroll';

let layerSeq = 0;

/**
 * Hace que el botón "atrás" del móvil cierre esta capa en vez de sacar al
 * huésped del guidebook entero.
 *
 * Empuja una entrada de historial con la MISMA URL a propósito: BrowserRouter
 * escucha `popstate`, y si cambiásemos el path recalcularía la ruta y
 * remontaría la página. Con la URL intacta, react-router ve la misma location
 * y no hace nada; el state se copia tal cual para no descuadrar su índice
 * interno.
 */
export function useBackClosable(open: boolean, onClose: () => void) {
  // El callback se lee por ref para que redefinirlo en cada render del padre no
  // reinicie el efecto (y con él la entrada de historial).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const idRef = useRef(0);
  const pushedRef = useRef(false);
  // Si el efecto vuelve a montarse justo después de limpiarse, la capa sigue
  // viva y su cleanup era falso (ver queueMicrotask más abajo).
  const aliveRef = useRef(false);

  useEffect(() => {
    if (!open) {
      pushedRef.current = false;
      return;
    }
    aliveRef.current = true;

    // Idempotente: en desarrollo StrictMode ejecuta el efecto dos veces, y sin
    // esta guarda una sola capa dejaba dos entradas en el historial (el primer
    // "atrás" del huésped no habría hecho nada visible).
    if (!pushedRef.current) {
      idRef.current = ++layerSeq;
      window.history.pushState({ ...window.history.state, vtLayer: idRef.current }, '', window.location.href);
      pushedRef.current = true;
    }
    const id = idRef.current;

    let closedByBack = false;
    const onPop = () => {
      closedByBack = true;
      pushedRef.current = false;
      onCloseRef.current();
    };
    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('popstate', onPop);
      aliveRef.current = false;
      // Cerrada con el botón atrás: el navegador ya ha consumido la entrada.
      if (closedByBack) return;
      // Cerrada por la X, el overlay o Escape: nuestra entrada sigue en la pila
      // y hay que consumirla, o el siguiente "atrás" se gastaría en no hacer
      // nada visible.
      //
      // Aplazado un tick a propósito: en desarrollo React monta, limpia y
      // vuelve a montar los efectos (StrictMode). Retrocediendo aquí mismo, ese
      // cleanup falso disparaba un popstate que el efecto recién montado
      // interpretaba como "atrás" y cerraba la capa en el mismo instante de
      // abrirla — el modal parpadeaba y desaparecía.
      queueMicrotask(() => {
        if (aliveRef.current) return;
        if (window.history.state?.vtLayer === id) {
          pushedRef.current = false;
          window.history.back();
        }
      });
    };
  }, [open]);
}

/**
 * Las tres cosas que toda capa modal de la guía necesita y que hasta ahora cada
 * componente resolvía a medias por su cuenta: bloquear el scroll de detrás,
 * cerrarse con Escape y cerrarse con el botón atrás del móvil.
 */
export default function useDismissableLayer(open: boolean, onClose: () => void) {
  useLockBodyScroll(open);
  useBackClosable(open, onClose);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
}
