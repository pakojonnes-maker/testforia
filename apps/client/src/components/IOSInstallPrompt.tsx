import { Box, Typography, IconButton, Paper, Backdrop, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import IosShareIcon from '@mui/icons-material/IosShare';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import OfflineBoltIcon from '@mui/icons-material/OfflineBolt';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useTranslation } from '../contexts/TranslationContext';

const DISMISS_KEY = 'vt_ios_prompt_dismissed';

interface Props {
    open: boolean;
    onClose: () => void;
}

/** Cómo añadir la carta a la pantalla de inicio del iPhone: sin eso, iOS no entrega avisos push. */
export const IOSInstallPrompt = ({ open, onClose }: Props) => {
    const { t } = useTranslation();
    const [isDismissedForever, setIsDismissedForever] = useState(() => {
        try { return localStorage.getItem(DISMISS_KEY) === 'true'; } catch { return false; }
    });

    if (!open || isDismissedForever) return null;

    const handleDontShowAgain = () => {
        try { localStorage.setItem(DISMISS_KEY, 'true'); } catch { /* ignorar */ }
        setIsDismissedForever(true);
        onClose();
    };

    const step = {
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        borderRadius: 3,
        bgcolor: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)'
    };
    const stepIcon = {
        minWidth: 40,
        height: 40,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    };

    return (
        <AnimatePresence>
            <Backdrop open={true} sx={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-label={t('carta_ios_title', 'Añade la carta a tu iPhone')}
                    style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        width: '100%',
                        zIndex: 10000
                    }}
                >
                    <Paper
                        sx={{
                            borderTopLeftRadius: 28,
                            borderTopRightRadius: 28,
                            p: 3,
                            pb: 4,
                            background: 'linear-gradient(180deg, rgba(30,30,30,0.98) 0%, rgba(15,15,15,0.99) 100%)',
                            backdropFilter: 'blur(24px)',
                            borderTop: '1px solid rgba(255,255,255,0.15)',
                            color: 'white',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2,
                            boxShadow: '0 -10px 60px rgba(0,0,0,0.6)'
                        }}
                    >
                        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                            <IconButton onClick={onClose} aria-label={t('button_close', 'Cerrar')} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                <CloseIcon />
                            </IconButton>
                        </Box>

                        {/* Benefits Section */}
                        <Box sx={{ display: 'flex', gap: 3, mb: 1 }}>
                            <Box sx={{ textAlign: 'center' }}>
                                <NotificationsActiveIcon sx={{ fontSize: 32, color: '#FF6B6B' }} />
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'rgba(255,255,255,0.7)' }}>
                                    {t('carta_ios_offers', 'Ofertas VIP')}
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                                <OfflineBoltIcon sx={{ fontSize: 32, color: '#4ECDC4' }} />
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'rgba(255,255,255,0.7)' }}>
                                    {t('carta_ios_fast', 'Más rápido')}
                                </Typography>
                            </Box>
                        </Box>

                        <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center', lineHeight: 1.3 }}>
                            {t('carta_ios_title', 'Añade la carta a tu iPhone')}
                        </Typography>

                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: 300 }}>
                            {t('carta_ios_body', 'En iPhone los avisos solo llegan si la carta está en tu pantalla de inicio. Ábrela desde allí y actívalos.')}
                        </Typography>

                        {/* Steps */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', maxWidth: 320, mt: 1 }}>
                            <Box sx={step}>
                                <Box sx={{ ...stepIcon, bgcolor: 'rgba(0,122,255,0.15)' }}>
                                    <IosShareIcon sx={{ color: '#007AFF' }} />
                                </Box>
                                <Typography variant="body2">{t('carta_ios_step1', 'Pulsa «Compartir» abajo')}</Typography>
                            </Box>

                            <Box sx={step}>
                                <Box sx={{ ...stepIcon, bgcolor: 'rgba(255,255,255,0.1)' }}>
                                    <AddBoxOutlinedIcon sx={{ color: '#fff' }} />
                                </Box>
                                <Typography variant="body2">{t('carta_ios_step2', 'Elige «Añadir a pantalla de inicio»')}</Typography>
                            </Box>
                        </Box>

                        {/* Arrow pointing down to Safari bar */}
                        <motion.div
                            animate={{ y: [0, 8, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        >
                            <Typography sx={{ fontSize: 28, mt: 1 }} aria-hidden="true">👇</Typography>
                        </motion.div>

                        <Button
                            onClick={handleDontShowAgain}
                            sx={{
                                mt: 1,
                                color: 'rgba(255,255,255,0.4)',
                                fontSize: '0.75rem',
                                textTransform: 'none',
                                '&:hover': { color: 'rgba(255,255,255,0.6)', bgcolor: 'transparent' }
                            }}
                        >
                            {t('carta_ios_never', 'No volver a mostrar')}
                        </Button>
                    </Paper>
                </motion.div>
            </Backdrop>
        </AnimatePresence>
    );
};
