// apps/admin/src/hooks/useIdleDetection.ts

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseIdleDetectionOptions {
    /**
     * Tiempo de inactividad en milisegundos antes de considerar al usuario inactivo
     * @default 300000 (5 minutos)
     */
    idleTimeout?: number;

    /**
     * Tiempo de inactividad en milisegundos antes de cerrar sesión automáticamente
     * @default 1800000 (30 minutos)
     */
    logoutTimeout?: number;

    /**
     * Callback que se ejecuta cuando el usuario se vuelve inactivo
     */
    onIdle?: () => void;

    /**
     * Callback que se ejecuta cuando el usuario vuelve a estar activo
     */
    onActive?: () => void;

    /**
     * Callback que se ejecuta cuando se alcanza el tiempo de logout
     */
    onLogout?: () => void;

    /**
     * Habilitar o deshabilitar la detección de inactividad
     * @default true
     */
    enabled?: boolean;
}

interface UseIdleDetectionReturn {
    /** Indica si el usuario está actualmente inactivo */
    isIdle: boolean;
    /** Tiempo restante en segundos hasta que se considere inactivo */
    timeUntilIdle: number;
    /** Tiempo restante en segundos hasta el logout automático */
    timeUntilLogout: number;
    /** Función para resetear manualmente el timer de inactividad */
    resetIdleTimer: () => void;
}

/**
 * Hook personalizado para detectar inactividad del usuario
 * 
 * Rastrea eventos del mouse, teclado, scroll y touch para determinar
 * si el usuario está activo. Después de cierto tiempo sin actividad,
 * marca al usuario como inactivo y puede ejecutar callbacks.
 * 
 * @example
 * ```tsx
 * const { isIdle, timeUntilLogout } = useIdleDetection({
 *   idleTimeout: 5 * 60 * 1000, // 5 minutos
 *   logoutTimeout: 30 * 60 * 1000, // 30 minutos
 *   onIdle: () => console.log('Usuario inactivo'),
 *   onLogout: () => logout()
 * });
 * ```
 */
export function useIdleDetection({
    idleTimeout = 5 * 60 * 1000, // 5 minutos por defecto
    logoutTimeout = 30 * 60 * 1000, // 30 minutos por defecto
    onIdle,
    onActive,
    onLogout,
    enabled = true
}: UseIdleDetectionOptions = {}): UseIdleDetectionReturn {
    const [isIdle, setIsIdle] = useState(false);
    const [timeUntilIdle, setTimeUntilIdle] = useState(idleTimeout / 1000);
    const [timeUntilLogout, setTimeUntilLogout] = useState(logoutTimeout / 1000);

    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    // Función para limpiar todos los timers
    const clearAllTimers = useCallback(() => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
        if (logoutTimerRef.current) {
            clearTimeout(logoutTimerRef.current);
            logoutTimerRef.current = null;
        }
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
    }, []);

    // Función para actualizar los contadores
    const startCountdown = useCallback(() => {
        // Limpiar countdown anterior
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
        }

        // Actualizar cada segundo
        countdownTimerRef.current = setInterval(() => {
            const now = Date.now();
            const timeSinceActivity = now - lastActivityRef.current;

            const secondsUntilIdle = Math.max(0, Math.floor((idleTimeout - timeSinceActivity) / 1000));
            const secondsUntilLogout = Math.max(0, Math.floor((logoutTimeout - timeSinceActivity) / 1000));

            setTimeUntilIdle(secondsUntilIdle);
            setTimeUntilLogout(secondsUntilLogout);
        }, 1000);
    }, [idleTimeout, logoutTimeout]);

    // Función para resetear el timer de inactividad
    const resetIdleTimer = useCallback(() => {
        if (!enabled) return;

        lastActivityRef.current = Date.now();
        setTimeUntilIdle(idleTimeout / 1000);
        setTimeUntilLogout(logoutTimeout / 1000);

        // Si estaba inactivo, marcar como activo
        if (isIdle) {
            setIsIdle(false);
            onActive?.();
        }

        // Limpiar timers anteriores
        clearAllTimers();

        // Iniciar timer de inactividad
        idleTimerRef.current = setTimeout(() => {
            setIsIdle(true);
            onIdle?.();
        }, idleTimeout);

        // Iniciar timer de logout automático
        logoutTimerRef.current = setTimeout(() => {
            onLogout?.();
        }, logoutTimeout);

        // Iniciar countdown
        startCountdown();
    }, [enabled, idleTimeout, logoutTimeout, isIdle, onIdle, onActive, onLogout, clearAllTimers, startCountdown]);

    // Eventos que indican actividad del usuario
    useEffect(() => {
        if (!enabled) {
            clearAllTimers();
            setIsIdle(false);
            return;
        }

        // Lista de eventos a escuchar
        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ];

        // Throttle para evitar demasiadas llamadas
        let throttleTimer: NodeJS.Timeout | null = null;
        const handleActivity = () => {
            if (!throttleTimer) {
                resetIdleTimer();
                throttleTimer = setTimeout(() => {
                    throttleTimer = null;
                }, 1000); // Throttle de 1 segundo
            }
        };

        // Agregar event listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // Iniciar el timer inmediatamente
        resetIdleTimer();

        // Cleanup
        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            clearAllTimers();
            if (throttleTimer) {
                clearTimeout(throttleTimer);
            }
        };
    }, [enabled, resetIdleTimer, clearAllTimers]);

    return {
        isIdle,
        timeUntilIdle,
        timeUntilLogout,
        resetIdleTimer
    };
}
