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
// El countdown de segundo a segundo solo lo consume el aviso de "sesión a
// punto de cerrarse" (DashboardLayout mira timeUntilLogout <= 60). Antes se
// arrancaba desde el primer segundo de la sesión, lo que forzaba un
// setState — y por tanto un re-render de todo el admin bajo DashboardLayout —
// cada segundo durante los 15 minutos completos. Ahora solo corre en esta
// ventana final antes del logout.
const COUNTDOWN_WINDOW_MS = 90 * 1000;

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
    const countdownStartTimerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityRef = useRef<number>(Date.now());
    const isIdleRef = useRef(false);

    // Los callbacks del consumidor viven en refs: en DashboardLayout son
    // arrow functions inline (identidad nueva cada render). Si fueran
    // dependencias de resetIdleTimer, cada render del consumidor forzaría
    // recrear el efecto de listeners de window más abajo.
    const onIdleRef = useRef(onIdle);
    const onActiveRef = useRef(onActive);
    const onLogoutRef = useRef(onLogout);
    useEffect(() => { onIdleRef.current = onIdle; }, [onIdle]);
    useEffect(() => { onActiveRef.current = onActive; }, [onActive]);
    useEffect(() => { onLogoutRef.current = onLogout; }, [onLogout]);

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
        if (countdownStartTimerRef.current) {
            clearTimeout(countdownStartTimerRef.current);
            countdownStartTimerRef.current = null;
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
    }, []);

    // Función para actualizar los contadores, un tick por segundo
    const startCountdown = useCallback(() => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
        }

        countdownIntervalRef.current = setInterval(() => {
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
        if (isIdleRef.current) {
            isIdleRef.current = false;
            setIsIdle(false);
            onActiveRef.current?.();
        }

        // Limpiar timers anteriores
        clearAllTimers();

        // Iniciar timer de inactividad
        idleTimerRef.current = setTimeout(() => {
            isIdleRef.current = true;
            setIsIdle(true);
            onIdleRef.current?.();
        }, idleTimeout);

        // Iniciar timer de logout automático
        logoutTimerRef.current = setTimeout(() => {
            onLogoutRef.current?.();
        }, logoutTimeout);

        // El countdown de 1s arranca solo al entrar en la ventana final,
        // no desde ya.
        const delayUntilCountdown = Math.max(0, logoutTimeout - COUNTDOWN_WINDOW_MS);
        countdownStartTimerRef.current = setTimeout(startCountdown, delayUntilCountdown);
    }, [enabled, idleTimeout, logoutTimeout, clearAllTimers, startCountdown]);

    // Eventos que indican actividad del usuario
    useEffect(() => {
        if (!enabled) {
            clearAllTimers();
            setIsIdle(false);
            isIdleRef.current = false;
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
