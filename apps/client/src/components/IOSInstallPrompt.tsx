

import { Box, Typography, IconButton, Paper, Backdrop } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import IosShareIcon from '@mui/icons-material/IosShare';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import { useDishTracking } from '../providers/TrackingAndPushProvider';
import { AnimatePresence, motion } from 'framer-motion';

export const IOSInstallPrompt = () => {
    const { showIOSPrompt, setShowIOSPrompt } = useDishTracking();

    if (!showIOSPrompt) return null;

    return (
        <AnimatePresence>
            <Backdrop open={true} sx={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setShowIOSPrompt(false)}>
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
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            p: 3,
                            pb: 6,
                            background: 'rgba(20, 20, 20, 0.95)',
                            backdropFilter: 'blur(20px)',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            color: 'white',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2,
                            boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
                        }}
                    >
                        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                            <IconButton onClick={() => setShowIOSPrompt(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                <CloseIcon />
                            </IconButton>
                        </Box>

                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
                            Instala la App para recibir ofertas VIP
                        </Typography>

                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: 300, mb: 2 }}>
                            Para recibir notificaciones exclusivas, necesitas añadir esta web a tu pantalla de inicio.
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 320 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)' }}>
                                <IosShareIcon sx={{ color: '#007AFF' }} />
                                <Typography variant="body2">
                                    1. Toca el botón <strong>Compartir</strong> en la barra inferior.
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)' }}>
                                <AddBoxOutlinedIcon sx={{ color: '#fff' }} />
                                <Typography variant="body2">
                                    2. Selecciona <strong>"Añadir a inicio"</strong> (Add to Home Screen).
                                </Typography>
                            </Box>
                        </Box>

                        <Typography variant="caption" sx={{ mt: 2, color: 'rgba(255,255,255,0.4)' }}>
                            Después abre la App desde el inicio.
                        </Typography>
                    </Paper>
                </motion.div>
            </Backdrop>
        </AnimatePresence>
    );
};
