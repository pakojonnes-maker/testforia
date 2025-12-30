import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Button, Typography, Fade, Switch } from '@mui/material';


interface SplashScreenProps {
    isAppReady: boolean;
    onComplete: () => void;
}

const CONSENT_KEY = 'vt_consent_analytics';

export const SplashScreen = ({ isAppReady, onComplete }: SplashScreenProps) => {
    const [startExit, setStartExit] = useState(false);
    const [rotationFinished, setRotationFinished] = useState(false);
    const [consentNeeded, setConsentNeeded] = useState(false);
    const [showConsentUI, setShowConsentUI] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [processingConsent, setProcessingConsent] = useState(false);

    // Config state
    const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

    // Initial check
    useEffect(() => {
        const consent = localStorage.getItem(CONSENT_KEY);
        if (consent === null) {
            setConsentNeeded(true);
        }
    }, []);

    // Ensure we track the rotation state reliably
    const handleRotationEnd = () => {
        setRotationFinished(true);

        // If consent is needed and we haven't shown it yet, show it now
        if (consentNeeded && !processingConsent) {
            setShowConsentUI(true);
        }
    };

    // Main flow logic
    useEffect(() => {
        // Condition to exit: 
        // 1. App is Ready (data loaded)
        // 2. Rotation finished (at least one loop)
        // 3. Either consent was not needed OR consent has been processed
        // 4. We are not currently showing the Consent UI
        if (isAppReady && rotationFinished && !consentNeeded && !showConsentUI) {
            const timer = setTimeout(() => {
                setStartExit(true);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isAppReady, rotationFinished, consentNeeded, showConsentUI]);

    const handleConsent = (accepted: boolean) => {
        localStorage.setItem(CONSENT_KEY, accepted ? 'true' : 'false');

        // Notify Provider
        window.dispatchEvent(new Event('vt-consent-update'));

        setProcessingConsent(true);
        setShowConsentUI(false);
        setConsentNeeded(false);
        setRotationFinished(false); // Reset rotation to force another spin
    };

    return (
        <Box
            sx={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                pointerEvents: startExit ? 'none' : 'auto',
            }}
        >
            <style>
                {`
                @keyframes smoothSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .logo-spinner {
                    animation: smoothSpin 2.5s ease-in-out forwards;
                    will-change: transform;
                }
                .logo-spinner.spinning {
                     animation: none; /* Reset */
                     opacity: 0.99; /* Force reflow */
                }
                `}
            </style>

            {/* CENTRAL CONTENT - Logo & Consent */}
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
                        pointerEvents: showConsentUI ? 'auto' : 'none'
                    }}
                >
                    {/* LOGO */}
                    <Box sx={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: showConsentUI ? 4 : 0, transition: 'margin 0.5s ease' }}>
                        {(!rotationFinished || processingConsent) && (
                            <img
                                src="/logo.png"
                                className="logo-spinner"
                                onAnimationEnd={handleRotationEnd}
                                key={processingConsent ? 'spin-2' : 'spin-1'} // Remount to restart animation
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain'
                                }}
                            />
                        )}
                        {(rotationFinished && !processingConsent) && (
                            <img
                                src="/logo.png"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    transform: 'rotate(0deg)' // Static if waiting
                                }}
                            />
                        )}
                    </Box>

                    {/* CONSENT UI - FADE IN */}
                    <AnimatePresence>
                        {showConsentUI && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5 }}
                                style={{ width: '90%', maxWidth: '400px' }}
                            >
                                <Box
                                    sx={{
                                        bgcolor: 'rgba(20, 20, 20, 0.9)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '16px',
                                        p: 3,
                                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                                        textAlign: 'center'
                                    }}
                                >
                                    {!showDetails ? (
                                        // INITIAL VIEW
                                        <>
                                            <Typography variant="h6" color="#fff" fontFamily='"Fraunces", serif' gutterBottom>
                                                Experiencia VisualTaste
                                            </Typography>
                                            <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" mb={3} lineHeight={1.5}>
                                                Utilizamos cookies para recordar tus preferencias y mejorar la experiencia.
                                            </Typography>

                                            <Box display="flex" flexDirection="column" gap={1.5}>
                                                <Button
                                                    fullWidth
                                                    variant="contained"
                                                    onClick={() => handleConsent(true)}
                                                    sx={{
                                                        bgcolor: '#E6B15F',
                                                        color: '#000',
                                                        fontWeight: 'bold',
                                                        py: 1.5,
                                                        fontSize: '1rem',
                                                        '&:hover': { bgcolor: '#F0C070' },
                                                        boxShadow: '0 4px 15px rgba(230, 177, 95, 0.3)'
                                                    }}
                                                >
                                                    Aceptar todo
                                                </Button>

                                                <Button
                                                    fullWidth
                                                    onClick={() => setShowDetails(true)}
                                                    sx={{
                                                        color: 'rgba(255,255,255,0.7)',
                                                        borderColor: 'rgba(255,255,255,0.2)',
                                                        '&:hover': { borderColor: '#fff', color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' }
                                                    }}
                                                    variant="outlined"
                                                    size="medium"
                                                >
                                                    Configurar cookies
                                                </Button>

                                                <Typography variant="caption" color="rgba(255,255,255,0.4)" fontSize="0.7rem" mt={1}>
                                                    Respetamos tu privacidad conforme al RGPD.
                                                </Typography>
                                            </Box>
                                        </>
                                    ) : (
                                        // CONFIGURATION VIEW
                                        <Fade in>
                                            <Box display="flex" flexDirection="column" gap={2} textAlign="left" sx={{ width: '100%' }}>
                                                <Typography variant="subtitle2" color="#E6B15F" fontWeight="bold">
                                                    Configuración de Privacidad
                                                </Typography>

                                                {/* Technical Cookies */}
                                                <Box display="flex" justifyContent="space-between" alignItems="center" p={1.5} sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1 }}>
                                                    <Box>
                                                        <Typography variant="body2" color="#fff" fontWeight="bold">Técnicas</Typography>
                                                        <Typography variant="caption" color="rgba(255,255,255,0.5)" display="block" lineHeight={1.2}>Necesarias para funcionamiento.</Typography>
                                                    </Box>
                                                    <Switch checked disabled size="small" />
                                                </Box>

                                                {/* Analytics Cookies */}
                                                <Box display="flex" justifyContent="space-between" alignItems="center" p={1.5} sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1 }}>
                                                    <Box>
                                                        <Typography variant="body2" color="#fff" fontWeight="bold">Analíticas</Typography>
                                                        <Typography variant="caption" color="rgba(255,255,255,0.5)" display="block" lineHeight={1.2}>Métricas anónimas de uso.</Typography>
                                                    </Box>
                                                    <Switch
                                                        checked={analyticsEnabled}
                                                        onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                                                        size="small"
                                                        sx={{
                                                            '& .MuiSwitch-switchBase.Mui-checked': { color: '#E6B15F' },
                                                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#E6B15F' },
                                                        }}
                                                    />
                                                </Box>

                                                <Box display="flex" gap={1} mt={2}>
                                                    <Button
                                                        fullWidth
                                                        onClick={() => setShowDetails(false)}
                                                        sx={{
                                                            color: 'rgba(255,255,255,0.5)',
                                                            borderColor: 'rgba(255,255,255,0.1)',
                                                            fontSize: '0.8rem',
                                                            '&:hover': { borderColor: '#fff', color: '#fff' }
                                                        }}
                                                        variant="outlined"
                                                    >
                                                        Volver
                                                    </Button>
                                                    <Button
                                                        fullWidth
                                                        onClick={() => handleConsent(analyticsEnabled)}
                                                        variant="contained"
                                                        sx={{
                                                            bgcolor: '#fff',
                                                            color: '#000',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.8rem',
                                                            '&:hover': { bgcolor: '#e0e0e0' }
                                                        }}
                                                    >
                                                        Guardar cambios
                                                    </Button>
                                                </Box>
                                            </Box>
                                        </Fade>
                                    )}
                                </Box>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Powered By Text (Hide when Consent UI is visible to reduce clutter) */}
                    {!showConsentUI && (
                        <Box
                            sx={{
                                marginTop: 4,
                                opacity: 0.7,
                                fontFamily: '"Fraunces", serif',
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
                    )}
                </Box>
            )}

            {/* Left Panel */}
            <motion.div
                initial={{ x: 0 }}
                animate={startExit ? { x: '-100%' } : { x: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
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
                <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                    {/* Left Half Logo Container */}
                    <div style={{ position: 'relative', width: '0px', height: '0px', opacity: startExit ? 1 : 0 }}>
                        <img
                            src="/logo.png"
                            style={{
                                position: 'absolute',
                                width: '120px',
                                maxWidth: 'unset',
                                height: '120px',
                                top: '-60px',
                                right: '-60px',
                                objectFit: 'contain'
                            }}
                        />
                    </div>
                    <div style={{ position: 'relative', width: '0px', height: '0px', opacity: startExit ? 1 : 0, marginTop: '80px' }}>
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                transform: 'translateX(50%)',
                                width: '300px',
                                textAlign: 'center',
                                fontFamily: '"Fraunces", serif',
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

            {/* Right Panel */}
            <motion.div
                initial={{ x: 0 }}
                animate={startExit ? { x: '100%' } : { x: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                onAnimationComplete={() => {
                    if (startExit) onComplete();
                }}
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
                <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                    {/* Right Half Logo */}
                    <div style={{ position: 'relative', width: '0px', height: '0px', opacity: startExit ? 1 : 0 }}>
                        <img
                            src="/logo.png"
                            style={{
                                position: 'absolute',
                                width: '120px',
                                maxWidth: 'unset',
                                height: '120px',
                                top: '-60px',
                                left: '-60px',
                                objectFit: 'contain'
                            }}
                        />
                    </div>
                    <div style={{ position: 'relative', width: '0px', height: '0px', opacity: startExit ? 1 : 0, marginTop: '80px' }}>
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                transform: 'translateX(-50%)',
                                width: '300px',
                                textAlign: 'center',
                                fontFamily: '"Fraunces", serif',
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
        </Box>
    );
};
