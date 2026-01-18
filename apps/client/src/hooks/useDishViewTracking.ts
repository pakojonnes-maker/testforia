// src/hooks/useDishViewTracking.tsx
import { useEffect, useRef } from 'react';
import { useDishTracking } from '../providers/TrackingAndPushProvider';

interface UseDishViewTrackingOptions {
  dishId: string;
  sectionId?: string;
  threshold?: number;
  minVisibleTime?: number;
  enabled?: boolean;
}

export function useDishViewTracking({
  dishId,
  sectionId,
  threshold = 0.5,
  minVisibleTime = 1500,
  enabled = true
}: UseDishViewTrackingOptions) {
  const { viewDish, isReady } = useDishTracking();
  const elementRef = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const timerRef = useRef<number | null>(null);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !dishId || !isReady() || hasTrackedRef.current) {
      return;
    }

    const element = elementRef.current;
    if (!element) {
      return;
    }

    console.debug('👁️ [useDishViewTracking] Configurando observer para:', dishId);

    // Crear observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
            console.debug('👁️ [useDishViewTracking] Plato visible:', dishId);

            // Iniciar timer
            timerRef.current = window.setTimeout(() => {
              if (!hasTrackedRef.current && isReady()) {
                console.log('✅ [useDishViewTracking] Registrando vista:', dishId, 'sectionId:', sectionId);
                viewDish(dishId, sectionId);
                hasTrackedRef.current = true;

                // Cleanup observer después de trackear
                if (observerRef.current) {
                  observerRef.current.disconnect();
                  observerRef.current = null;
                }
              }
            }, minVisibleTime);
          } else {
            // Cancelar timer si el elemento sale de vista
            if (timerRef.current) {
              clearTimeout(timerRef.current);
              timerRef.current = null;
            }
          }
        });
      },
      {
        threshold: [threshold],
        rootMargin: '0px'
      }
    );

    // Observar elemento
    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [dishId, threshold, minVisibleTime, enabled, viewDish, isReady]);

  return {
    ref: elementRef,
    hasTracked: hasTrackedRef.current
  };
}
