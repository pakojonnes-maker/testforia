import React, { useState } from 'react';
import { Box, Typography, Button, IconButton, Modal, Fade, TextField } from '@mui/material';
import { Star, StarBorder, Close } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTranslation } from '../../contexts/TranslationContext';

export interface RatingModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (rating: number, comment: string) => void;
    googleReviewUrl?: string;
    previousRating?: number | null;
}

const RatingModal: React.FC<RatingModalProps> = ({ open, onClose, onSubmit, googleReviewUrl, previousRating }) => {
    const { t } = useTranslation();
    const [rating, setRating] = useState<number>(previousRating || 0);
    const [hover, setHover] = useState<number>(-1);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);

    // If previously rated high, show the success state immediately to allow Google link access
    const [showGoogleLink, setShowGoogleLink] = useState(false);

    // Reset/Sync state when modal opens or props change
    React.useEffect(() => {
        if (open) {
            setRating(previousRating || 0);
            setSubmitted(false);
            setShowGoogleLink(false);
            setComment('');
        }
    }, [open, previousRating]);

    const handleSubmit = () => {
        if (rating === 0) return;

        onSubmit(rating, comment);
        setSubmitted(true);

        if (rating >= 4 && googleReviewUrl) {
            setShowGoogleLink(true);
        } else {
            // Auto close for low ratings after a delay
            setTimeout(() => {
                onClose();
                // Reset state after close
                setTimeout(() => {
                    setSubmitted(false);
                    if (!previousRating) setRating(0);
                }, 500);
            }, 2500);
        }
    };

    const handleGoogleRedirect = () => {
        if (googleReviewUrl) {
            window.open(googleReviewUrl, '_blank');
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            closeAfterTransition
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2
            }}
        >
            <Fade in={open}>
                <Box
                    sx={{
                        bgcolor: '#1a1a1a',
                        color: 'white',
                        borderRadius: 3,
                        p: 4,
                        maxWidth: 400,
                        width: '100%',
                        textAlign: 'center',
                        position: 'relative',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        outline: 'none'
                    }}
                >
                    <IconButton
                        onClick={onClose}
                        aria-label={t('button_close', 'Cerrar')}
                        sx={{ position: 'absolute', insetInlineEnd: 8, top: 8, color: 'text.secondary' }}
                    >
                        <Close />
                    </IconButton>

                    {!submitted && !showGoogleLink ? (
                        <>
                            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                                {previousRating ? t('carta_rt_title_prev', 'Tu valoración') : t('carta_rt_title', '¿Qué te ha parecido?')}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                                {t('carta_rt_sub', 'Tu opinión nos ayuda a mejorar.')}
                            </Typography>

                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <IconButton
                                        key={star}
                                        aria-label={t('carta_rt_star', '{n} de 5').replace('{n}', String(star))}
                                        aria-pressed={rating === star}
                                        onPointerDown={() => {
                                            setRating(star);
                                            setHover(-1);
                                        }}
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHover(star)}
                                        onMouseLeave={() => setHover(-1)}
                                        sx={{
                                            p: 0.5,
                                            transform: (hover >= star || (hover === -1 && rating >= star)) ? 'scale(1.1)' : 'scale(1)',
                                            transition: 'transform 0.2s',
                                            // Prevent touch delay on mobile
                                            touchAction: 'manipulation'
                                        }}
                                    >
                                        {(hover >= star || (hover === -1 && rating >= star)) ? (
                                            <Star sx={{ fontSize: 32, color: '#FFD700' }} />
                                        ) : (
                                            <StarBorder sx={{ fontSize: 32, color: 'rgba(255,255,255,0.3)' }} />
                                        )}
                                    </IconButton>
                                ))}
                            </Box>

                            {/* Optional Comment Field */}
                            {rating > 0 && rating <= 3 && (
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={2}
                                    placeholder={t('carta_rt_improve', '¿En qué podemos mejorar?')}
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    sx={{
                                        mb: 3,
                                        '& .MuiOutlinedInput-root': {
                                            color: 'white',
                                            bgcolor: 'rgba(255,255,255,0.05)',
                                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                                        }
                                    }}
                                />
                            )}

                            <Button
                                fullWidth
                                variant="contained"
                                disabled={rating === 0}
                                onClick={handleSubmit}
                                sx={{
                                    bgcolor: 'white',
                                    color: 'black',
                                    fontWeight: 600,
                                    '&:hover': { bgcolor: '#f0f0f0' },
                                    '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }
                                }}
                            >
                                {t('carta_rt_send', 'Enviar')}
                            </Button>
                        </>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {rating >= 4 ? (
                                <>
                                    <Typography variant="h5" sx={{ mb: 2 }}>🎉</Typography>
                                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                                        {t('carta_rt_glad', '¡Nos alegra que te haya gustado!')}
                                    </Typography>
                                    {googleReviewUrl && (
                                        <>
                                            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                                                {t('carta_rt_google_invite', 'Te invitamos a compartir tu experiencia en Google para ayudarnos a crecer.')}
                                            </Typography>
                                            <Button
                                                fullWidth
                                                variant="contained"
                                                onClick={handleGoogleRedirect}
                                                endIcon={<Star sx={{ color: '#FFD700' }} />}
                                                sx={{
                                                    bgcolor: '#4285F4', // Google Blue
                                                    color: 'white',
                                                    fontWeight: 600,
                                                    '&:hover': { bgcolor: '#3367D6' }
                                                }}
                                            >
                                                {t('carta_rt_google_btn', 'Escribir reseña en Google')}
                                            </Button>
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Typography variant="h5" sx={{ mb: 2 }}>🙏</Typography>
                                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                                        {t('carta_rt_thanks', '¡Gracias por tu opinión!')}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        {t('carta_rt_thanks_sub', 'Tomamos nota para seguir mejorando.')}
                                    </Typography>
                                </>
                            )}
                        </motion.div>
                    )}
                </Box>
            </Fade>
        </Modal>
    );
};

export default RatingModal;
