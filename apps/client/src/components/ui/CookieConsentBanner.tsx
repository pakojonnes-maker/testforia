import { useState, useEffect } from 'react';
import { Box, Button, Typography, Fade, Link } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Security } from '@mui/icons-material';

const CONSENT_KEY = 'vt_consent_analytics';

/**
 * Banner de consentimiento (art. 22.2 LSSI / art. 6.1.a RGPD).
 *
 * Reglas que impone el diseño de este componente, y por qué:
 *
 * 1. Los dos botones tienen el MISMO peso visual. Antes "Aceptar" era un botón
 *    blanco relleno y "Solo necesarias" un contorno gris: rechazar debe costar
 *    exactamente lo mismo que aceptar (Directrices 3/2022 del CEPD sobre patrones
 *    engañosos, y criterio constante de la AEPD).
 * 2. No se preselecciona nada y no hay muro: cerrar sin elegir equivale a no
 *    consentir, porque el tracking es opt-in real desde
 *    TrackingAndPushProvider.hasAnalyticsConsent().
 * 3. El texto dice "dispositivo", no solo "cookies": lo que guardamos es
 *    almacenamiento local, y el art. 22.2 LSSI cubre igualmente ambos.
 * 4. Enlace a la política de privacidad ANTES de decidir — sin información previa
 *    el consentimiento no es informado y, por tanto, no es válido.
 */
export const CookieConsentBanner = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem(CONSENT_KEY);
        if (consent === null) {
            // Retardo corto, solo para no pisar la animación de entrada de la carta.
            // No hay prisa en mostrarlo: sin respuesta no se recoge ningún dato.
            const timer = setTimeout(() => setIsVisible(true), 600);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem(CONSENT_KEY, 'true');
        setIsVisible(false);
        window.dispatchEvent(new Event('vt-consent-update'));
    };

    const handleReject = () => {
        localStorage.setItem(CONSENT_KEY, 'false');
        setIsVisible(false);
        // Antes esto solo escribía en localStorage y nadie lo leía: la sesión
        // seguía corriendo y el backend guardaba consent_analytics=1. Ahora se
        // avisa al provider para que corte el envío y solicite el borrado.
        window.dispatchEvent(new Event('vt-consent-revoked'));
    };

    if (!isVisible) return null;

    // Misma geometría y tipografía para aceptar y rechazar; solo cambia el color
    // de fondo, y ninguno de los dos queda visualmente hundido.
    const actionButtonSx = {
        flex: 1,
        py: 1.25,
        borderRadius: 2,
        fontWeight: 600,
        fontSize: '0.9rem',
        textTransform: 'none' as const,
        minWidth: 150,
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                    role="dialog"
                    aria-label="Preferencias de privacidad"
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
                            bgcolor: 'rgba(20, 20, 20, 0.92)',
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
                                    Tú decides
                                </Typography>
                                <Typography variant="body2" color="rgba(255, 255, 255, 0.75)" lineHeight={1.6}>
                                    Queremos guardar un identificador aleatorio en tu dispositivo para
                                    saber qué platos interesan más y reconocer visitas repetidas. No es
                                    publicidad, no hay terceros y no vendemos nada.{' '}
                                    <strong>Si dices que no, no se recoge ningún dato</strong> y la carta
                                    funciona igual.
                                </Typography>
                                <Box display="flex" gap={2} mt={1} flexWrap="wrap">
                                    <Button
                                        size="small"
                                        onClick={() => setShowDetails(!showDetails)}
                                        sx={{ color: '#bbb', textTransform: 'none', p: 0, textDecoration: 'underline', minWidth: 0 }}
                                    >
                                        {showDetails ? 'Ocultar detalles' : 'Ver detalles'}
                                    </Button>
                                    <Link
                                        href="/legal/privacy"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{ color: '#bbb', fontSize: '0.8125rem', textDecorationColor: 'rgba(255,255,255,0.4)' }}
                                    >
                                        Política de privacidad
                                    </Link>
                                </Box>
                            </Box>
                        </Box>

                        {showDetails && (
                            <Fade in>
                                <Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', p: 2, borderRadius: 2 }}>
                                    <Typography variant="caption" color="rgba(255,255,255,0.7)" display="block" mb={1}>
                                        <Security sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                                        <strong>Qué se guarda:</strong> un identificador aleatorio
                                        (<code>vt_visitor_id</code>) en el almacenamiento local de tu
                                        navegador. No contiene tu nombre ni tu correo, pero permite
                                        reconocer que has vuelto, así que lo tratamos como dato personal.
                                    </Typography>
                                    <Typography variant="caption" color="rgba(255,255,255,0.7)" display="block" mb={1}>
                                        <strong>Qué se mide:</strong> platos vistos, tiempo de
                                        visionado, secciones, favoritos y valoraciones. Tu IP nunca se
                                        almacena tal cual: se convierte en un código que rota cada 24 h.
                                    </Typography>
                                    <Typography variant="caption" color="rgba(255,255,255,0.7)" display="block" mb={1}>
                                        <strong>Cuánto dura:</strong> 12 meses desde tu última visita.
                                    </Typography>
                                    <Typography variant="caption" color="rgba(255,255,255,0.7)" display="block">
                                        <strong>Control:</strong> puedes cambiar de opinión cuando
                                        quieras desde Configuración de Privacidad, en el menú de la app.
                                    </Typography>
                                </Box>
                            </Fade>
                        )}

                        <Box display="flex" gap={1.5} flexWrap="wrap">
                            <Button
                                onClick={handleReject}
                                variant="contained"
                                disableElevation
                                sx={{
                                    ...actionButtonSx,
                                    bgcolor: 'rgba(255,255,255,0.14)',
                                    color: '#fff',
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' }
                                }}
                            >
                                Rechazar
                            </Button>
                            <Button
                                onClick={handleAccept}
                                variant="contained"
                                disableElevation
                                sx={{
                                    ...actionButtonSx,
                                    bgcolor: '#fff',
                                    color: '#000',
                                    '&:hover': { bgcolor: '#e0e0e0' }
                                }}
                            >
                                Aceptar
                            </Button>
                        </Box>
                    </Box>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
