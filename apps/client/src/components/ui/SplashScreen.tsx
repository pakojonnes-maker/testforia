import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Box } from '@mui/material';

// Logo girando y salida partida en dos de la portada y de las landings de restaurante.
//
// Antes también era la pantalla de consentimiento de la carta (un diálogo solo en español
// delante de la carta, en cada primera visita). La carta ya no pasa por aquí: mide de forma
// anónima y pregunta "¿te reconocemos la próxima vez?" en su propia bienvenida, en el idioma
// del cliente (ver providers/TrackingAndPushProvider.tsx).

interface SplashScreenProps {
    isAppReady: boolean;
    onComplete: () => void;
}

const FONT = '"Fraunces Variable", "Fraunces", serif';

const SplashScreen = ({ isAppReady, onComplete }: SplashScreenProps) => {
    const [startExit, setStartExit] = useState(false);
    const [rotationFinished, setRotationFinished] = useState(false);

    useEffect(() => {
        if (isAppReady && rotationFinished) {
            const timer = setTimeout(() => setStartExit(true), 100);
            return () => clearTimeout(timer);
        }
    }, [isAppReady, rotationFinished]);

    const half = (side: 'left' | 'right') => (
        <motion.div
            initial={{ x: 0 }}
            animate={startExit ? { x: side === 'left' ? '-100%' : '100%' } : { x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={side === 'right' ? () => { if (startExit) onComplete(); } : undefined}
            style={{
                width: '50%',
                height: '100%',
                backgroundColor: '#000',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: side === 'left' ? 'flex-end' : 'flex-start', justifyContent: 'center' }}>
                <div style={{ position: 'relative', width: '0px', height: '0px', opacity: startExit ? 1 : 0 }}>
                    <img
                        src="/logo.png"
                        alt=""
                        style={{
                            position: 'absolute',
                            width: '120px',
                            maxWidth: 'unset',
                            height: '120px',
                            top: '-60px',
                            [side === 'left' ? 'right' : 'left']: '-60px',
                            objectFit: 'contain'
                        }}
                    />
                </div>
                <div style={{ position: 'relative', width: '0px', height: '0px', opacity: startExit ? 1 : 0, marginTop: '80px' }}>
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            [side === 'left' ? 'right' : 'left']: 0,
                            transform: side === 'left' ? 'translateX(50%)' : 'translateX(-50%)',
                            width: '300px',
                            textAlign: 'center',
                            fontFamily: FONT,
                            color: '#fff',
                            opacity: 0.7,
                            textTransform: 'uppercase',
                            letterSpacing: '0.2em',
                            fontSize: '0.75rem',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Powered by VisualTaste
                    </Box>
                </div>
            </Box>
        </motion.div>
    );

    return (
        <Box sx={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', pointerEvents: startExit ? 'none' : 'auto' }}>
            <style>
                {`
                @keyframes smoothSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .logo-spinner {
                    animation: smoothSpin 1.4s ease-in-out forwards;
                    will-change: transform;
                }
                `}
            </style>

            {!startExit && (
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                        pointerEvents: 'none'
                    }}
                >
                    <Box sx={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                            src="/logo.png"
                            alt=""
                            className={rotationFinished ? undefined : 'logo-spinner'}
                            onAnimationEnd={() => setRotationFinished(true)}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    </Box>
                    <Box
                        sx={{
                            marginTop: 4,
                            opacity: 0.7,
                            fontFamily: FONT,
                            color: '#fff',
                            textAlign: 'center',
                            textTransform: 'uppercase',
                            letterSpacing: '0.2em',
                            fontSize: '0.75rem',
                            width: '100%'
                        }}
                    >
                        Powered by VisualTaste
                    </Box>
                </Box>
            )}

            {half('left')}
            {half('right')}
        </Box>
    );
};

export default SplashScreen;
