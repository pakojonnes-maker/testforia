import { useState, useEffect } from 'react';
import { Box, Button, Typography, Fade } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Security } from '@mui/icons-material';

const CONSENT_KEY = 'vt_consent_analytics';

export const CookieConsentBanner = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem(CONSENT_KEY);
        if (consent === null) {
            // Small delay to not overwhelm immediate load
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem(CONSENT_KEY, 'true');
        setIsVisible(false);
        // Dispatch event for dynamic init
        window.dispatchEvent(new Event('vt-consent-update'));
    };

    const handleReject = () => {
        localStorage.setItem(CONSENT_KEY, 'false');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                    style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: 9999,
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'center'
                    }}
                >
                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: '600px',
                            bgcolor: 'rgba(20, 20, 20, 0.85)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '16px',
                            p: 3,
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2
                        }}
                    >
                        <Box display="flex" alignItems="start" gap={2}>
                            <Cookie sx={{ color: '#fff', opacity: 0.8, fontSize: 32 }} />
                            <Box flex={1}>
                                <Typography variant="h6" color="#fff" fontWeight="600" fontFamily='"Fraunces", serif' gutterBottom>
                                    Experiencia personalizada
                                </Typography>
                                <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" lineHeight={1.6}>
                                    Utilizamos cookies analíticas para mejorar tu experiencia y recordar tus preferencias.
                                    Estos datos son anónimos se conservan durante 12 meses.
                                </Typography>
                                <Button
                                    size="small"
                                    onClick={() => setShowDetails(!showDetails)}
                                    sx={{ color: '#aaa', textTransform: 'none', p: 0, mt: 1, textDecoration: 'underline' }}
                                >
                                    {showDetails ? 'Ocultar detalles' : 'Más información'}
                                </Button>
                            </Box>
                        </Box>

                        {showDetails && (
                            <Fade in>
                                <Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', p: 2, borderRadius: 2 }}>
                                    <Typography variant="caption" color="rgba(255,255,255,0.6)" display="block" mb={1}>
                                        <Security sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                                        <strong>Privacidad:</strong> No guardamos datos personales identificables.
                                    </Typography>
                                    <Typography variant="caption" color="rgba(255,255,255,0.6)" display="block" mb={1}>
                                        <strong>Duración:</strong> Los datos se eliminan automáticamente tras 12 meses de inactividad.
                                    </Typography>
                                    <Typography variant="caption" color="rgba(255,255,255,0.6)" display="block">
                                        <strong>Control:</strong> Puedes revocar este permiso en cualquier momento desde el menú de la aplicación.
                                    </Typography>
                                </Box>
                            </Fade>
                        )}

                        <Box display="flex" gap={2} justifyContent="flex-end" flexWrap="wrap">
                            <Button
                                onClick={handleReject}
                                sx={{
                                    color: '#fff',
                                    borderColor: 'rgba(255,255,255,0.2)',
                                    flex: { xs: 1, sm: 'none' },
                                    '&:hover': { borderColor: '#fff' }
                                }}
                                variant="outlined"
                            >
                                Solo necesarias
                            </Button>
                            <Button
                                onClick={handleAccept}
                                sx={{
                                    bgcolor: '#fff',
                                    color: '#000',
                                    fontWeight: 'bold',
                                    flex: { xs: 1, sm: 'none' },
                                    '&:hover': { bgcolor: '#e0e0e0' }
                                }}
                                variant="contained"
                            >
                                Aceptar y Continuar
                            </Button>
                        </Box>
                    </Box>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
