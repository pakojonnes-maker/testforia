

import { Box, Typography, IconButton, Paper, Backdrop, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import IosShareIcon from '@mui/icons-material/IosShare';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import OfflineBoltIcon from '@mui/icons-material/OfflineBolt';
import { useDishTracking } from '../providers/TrackingAndPushProvider';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

const DISMISS_KEY = 'vt_ios_prompt_dismissed';

export const IOSInstallPrompt = () => {
    const { showIOSPrompt, setShowIOSPrompt } = useDishTracking();
    const [isDismissedForever, setIsDismissedForever] = useState(() => {
        return localStorage.getItem(DISMISS_KEY) === 'true';
    });

    // Don't show if dismissed forever or not triggered
    if (!showIOSPrompt || isDismissedForever) return null;

    const handleClose = () => {
        setShowIOSPrompt(false);
    };

    const handleDontShowAgain = () => {
        localStorage.setItem(DISMISS_KEY, 'true');
        setIsDismissedForever(true);
        setShowIOSPrompt(false);
    };

    return (
        <AnimatePresence>
            <Backdrop open={true} sx={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={handleClose}>
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
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
                            <IconButton onClick={handleClose} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                <CloseIcon />
                            </IconButton>
                        </Box>

                        {/* Benefits Section */}
                        <Box sx={{ display: 'flex', gap: 3, mb: 1 }}>
                            <Box sx={{ textAlign: 'center' }}>
                                <NotificationsActiveIcon sx={{ fontSize: 32, color: '#FF6B6B' }} />
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'rgba(255,255,255,0.7)' }}>
                                    Ofertas VIP
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                                <OfflineBoltIcon sx={{ fontSize: 32, color: '#4ECDC4' }} />
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'rgba(255,255,255,0.7)' }}>
                                    Más rápido
                                </Typography>
                            </Box>
                        </Box>

                        <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center', lineHeight: 1.3 }}>
                            Añade la App a tu iPhone
                        </Typography>

                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: 300 }}>
                            Recibe <strong style={{ color: '#FF6B6B' }}>ofertas exclusivas</strong> y accede más rápido al menú
                        </Typography>

                        {/* Steps */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', maxWidth: 320, mt: 1 }}>
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                p: 2,
                                borderRadius: 3,
                                bgcolor: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.08)'
                            }}>
                                <Box sx={{
                                    minWidth: 40,
                                    height: 40,
                                    borderRadius: 2,
                                    bgcolor: 'rgba(0,122,255,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <IosShareIcon sx={{ color: '#007AFF' }} />
                                </Box>
                                <Typography variant="body2">
                                    Pulsa <strong>Compartir</strong> <IosShareIcon sx={{ fontSize: 14, verticalAlign: 'middle', color: '#007AFF' }} /> abajo
                                </Typography>
                            </Box>

                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                p: 2,
                                borderRadius: 3,
                                bgcolor: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.08)'
                            }}>
                                <Box sx={{
                                    minWidth: 40,
                                    height: 40,
                                    borderRadius: 2,
                                    bgcolor: 'rgba(255,255,255,0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <AddBoxOutlinedIcon sx={{ color: '#fff' }} />
                                </Box>
                                <Typography variant="body2">
                                    Elige <strong>"Añadir a inicio"</strong>
                                </Typography>
                            </Box>
                        </Box>

                        {/* Arrow pointing down to Safari bar */}
                        <motion.div
                            animate={{ y: [0, 8, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        >
                            <Typography sx={{ fontSize: 28, mt: 1 }}>👇</Typography>
                        </motion.div>

                        {/* Don't show again */}
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
                            No volver a mostrar
                        </Button>
                    </Paper>
                </motion.div>
            </Backdrop>
        </AnimatePresence>
    );
};
