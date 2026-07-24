import React from 'react';
import {
    Dialog,
    DialogContent,
    Typography,
    Box,
    Button,
    IconButton,
    Slide,
    useMediaQuery,
    useTheme
} from '@mui/material';
import { Close, CardGiftcard } from '@mui/icons-material';
import { useTranslation } from '../../contexts/TranslationContext';
import type { TransitionProps } from '@mui/material/transitions';

// Matches 'marketing_campaigns' table, type = 'welcome_modal'.
// Purely informative: header image/video + title + text + accept button.
export interface WelcomeCampaign {
    id: string;
    type: string;
    content: {
        media_type?: 'image' | 'video' | 'none';
        media_url?: string;
        video_poster?: string;
        title?: string;
        body?: string;
        cta_label?: string;
        secondary_cta?: { label?: string; url?: string } | null;
        /** @deprecated legacy field, kept for content authored before the rework */
        description?: string;
        /** @deprecated legacy field, kept for content authored before the rework */
        image_url?: string;
    };
    settings: {
        auto_open?: boolean;
        delay?: number;
        frequency?: 'once' | 'session' | 'daily' | 'always';
        dismissible?: boolean;
        use_branding?: boolean;
    };
}

interface WelcomeModalProps {
    open: boolean;
    onClose: () => void;
    restaurant: any;
    campaign?: WelcomeCampaign;
}

// ✅ Slide-up transition for mobile bottom-sheet feel
const SlideUpTransition = React.forwardRef(function Transition(
    props: TransitionProps & { children: React.ReactElement },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const WelcomeModal: React.FC<WelcomeModalProps> = ({ open, onClose, restaurant, campaign }) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    if (!campaign) return null;

    // Extract config from campaign - handle both parsed object and JSON string
    const rawContent = campaign.content;
    const content = typeof rawContent === 'string' ? JSON.parse(rawContent || '{}') : (rawContent || {});
    const rawSettings = campaign.settings;
    const settings = typeof rawSettings === 'string' ? JSON.parse(rawSettings || '{}') : (rawSettings || {});

    const title = content.title || `${t('welcome_title_prefix', '¡Bienvenido a ')}${restaurant?.name}!`;
    const body = content.body || content.description || t('welcome_description_default', '¡Esperamos que disfrutes tu experiencia con nosotros!');
    const mediaUrl = content.media_url || content.image_url;
    const mediaType: 'image' | 'video' | 'none' = content.media_type || (mediaUrl ? 'image' : 'none');
    const ctaLabel = content.cta_label || t('button_accept', '¡Entendido!');
    const secondaryCta = content.secondary_cta?.url ? content.secondary_cta : null;
    const dismissible = settings.dismissible !== false;
    const useBranding = settings.use_branding !== false;

    const accentColor = useBranding
        ? (restaurant?.branding?.accent_color || restaurant?.branding?.accentColor || '#FFD700')
        : '#FFD700';

    const handleDialogClose = (_event: unknown, reason?: 'backdropClick' | 'escapeKeyDown') => {
        if (!dismissible && (reason === 'backdropClick' || reason === 'escapeKeyDown')) return;
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleDialogClose}
            fullScreen={isMobile}
            TransitionComponent={isMobile ? SlideUpTransition as any : undefined}
            PaperProps={{
                sx: {
                    borderRadius: isMobile ? '24px 24px 0 0' : 3,
                    bgcolor: '#0f0f1a',
                    color: 'white',
                    maxWidth: isMobile ? '100%' : '400px',
                    width: '100%',
                    m: isMobile ? 0 : 2,
                    mt: isMobile ? 'auto' : 2,
                    maxHeight: isMobile ? '85vh' : 'auto',
                    position: isMobile ? 'fixed' : 'relative',
                    bottom: isMobile ? 0 : 'auto',
                    overflow: 'hidden',
                    backgroundImage: `radial-gradient(ellipse at top, ${accentColor}10 0%, transparent 50%)`
                }
            }}
        >
            {/* ✅ Drag handle for mobile */}
            {isMobile && (
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5, pb: 0.5, position: 'relative', zIndex: 10 }}>
                    <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.25)' }} />
                </Box>
            )}

            {/* Close button */}
            {dismissible && (
                <IconButton
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 12,
                        top: isMobile ? 16 : 12,
                        color: 'rgba(255,255,255,0.5)',
                        zIndex: 10,
                        bgcolor: 'rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(8px)',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' }
                    }}
                    size="small"
                >
                    <Close fontSize="small" />
                </IconButton>
            )}

            <DialogContent sx={{ pt: 0, px: 0, pb: isMobile ? 4 : 3, textAlign: 'center', overflow: 'auto' }}>
                {/* ✅ Hero media with gradient overlay */}
                {mediaType === 'video' && mediaUrl ? (
                    <Box sx={{ position: 'relative', mb: 0 }}>
                        <Box
                            component="video"
                            src={mediaUrl}
                            poster={content.video_poster}
                            autoPlay
                            muted
                            loop
                            playsInline
                            sx={{
                                width: '100%',
                                height: { xs: '220px', sm: '240px' },
                                objectFit: 'cover',
                                display: 'block'
                            }}
                        />
                        <Box sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '60%',
                            background: 'linear-gradient(transparent, #0f0f1a)',
                            pointerEvents: 'none'
                        }} />
                    </Box>
                ) : mediaType === 'image' && mediaUrl ? (
                    <Box sx={{ position: 'relative', mb: 0 }}>
                        <Box
                            component="img"
                            src={mediaUrl}
                            alt={title}
                            sx={{
                                width: '100%',
                                height: { xs: '220px', sm: '240px' },
                                objectFit: 'cover',
                                display: 'block'
                            }}
                        />
                        <Box sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '60%',
                            background: 'linear-gradient(transparent, #0f0f1a)',
                            pointerEvents: 'none'
                        }} />
                    </Box>
                ) : (
                    <Box sx={{
                        pt: isMobile ? 3 : 4,
                        px: 3,
                        mb: 1,
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        <Box sx={{
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            bgcolor: `${accentColor}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `2px solid ${accentColor}30`
                        }}>
                            <CardGiftcard sx={{ fontSize: 36, color: accentColor }} />
                        </Box>
                    </Box>
                )}

                {/* ✅ Content section */}
                <Box sx={{ px: 3, mt: mediaType !== 'none' && mediaUrl ? -2 : 2, mb: 3, position: 'relative', zIndex: 2 }}>
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 800,
                            fontFamily: '"Fraunces", serif',
                            mb: 1.5,
                            fontSize: { xs: '1.4rem', sm: '1.5rem' },
                            lineHeight: 1.2,
                            background: `linear-gradient(135deg, #fff 0%, ${accentColor} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}
                    >
                        {title}
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            opacity: 0.65,
                            whiteSpace: 'pre-line',
                            lineHeight: 1.6,
                            fontSize: '0.9rem',
                            maxWidth: '320px',
                            mx: 'auto'
                        }}
                    >
                        {body}
                    </Typography>
                </Box>

                {/* ✅ Actions: single accept CTA + optional secondary link */}
                <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Button
                        onClick={onClose}
                        variant="contained"
                        fullWidth
                        sx={{
                            bgcolor: accentColor,
                            color: '#0f0f1a',
                            fontWeight: 700,
                            py: 1.8,
                            borderRadius: 3,
                            fontSize: '0.95rem',
                            textTransform: 'none',
                            boxShadow: `0 8px 24px ${accentColor}40`,
                            '&:hover': {
                                bgcolor: accentColor,
                                filter: 'brightness(1.1)',
                                boxShadow: `0 12px 32px ${accentColor}50`
                            }
                        }}
                    >
                        {ctaLabel}
                    </Button>

                    {secondaryCta && (
                        <Button
                            component="a"
                            href={secondaryCta.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={onClose}
                            variant="text"
                            sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', textTransform: 'none' }}
                        >
                            {secondaryCta.label || t('view_more', 'Ver más')}
                        </Button>
                    )}
                </Box>

                {/* ✅ Safe area padding for iOS */}
                {isMobile && (
                    <Box sx={{ pb: 'env(safe-area-inset-bottom, 16px)' }} />
                )}
            </DialogContent>
        </Dialog>
    );
};

export default WelcomeModal;
