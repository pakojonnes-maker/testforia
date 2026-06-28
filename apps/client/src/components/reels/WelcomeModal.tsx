import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    Typography,
    Box,
    TextField,
    Button,
    IconButton,
    Checkbox,
    FormControlLabel,
    Link,
    Slide,
    useMediaQuery,
    useTheme
} from '@mui/material';
import { Close, CardGiftcard, CheckCircle } from '@mui/icons-material';
import { API_URL } from '../../lib/apiClient';
import { PrivacyContent } from '../legal/PrivacyContent';
import { useTranslation } from '../../contexts/TranslationContext';
import type { TransitionProps } from '@mui/material/transitions';

// Matches the new 'marketing_campaigns' table structure
export interface Campaign {
    id: string;
    type: 'welcome_modal' | 'exit_intent' | 'banner' | 'newsletter';
    content: {
        title?: string;
        description?: string;
        image_url?: string;
    };
    settings: {
        show_capture_form?: boolean;
        show_email?: boolean;
        show_phone?: boolean;
        auto_open?: boolean;
        delay?: number;
        show_consent?: boolean;
    };
}

interface WelcomeModalProps {
    open: boolean;
    onClose: () => void;
    restaurant: any;
    campaign?: Campaign;
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

    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [consent, setConsent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [showPrivacy, setShowPrivacy] = useState(false);

    // Claim data for WhatsApp save
    const [claimData, setClaimData] = useState<{
        magic_link?: string;
        expires_at?: string;
        validation_code?: string;
    } | null>(null);


    if (!campaign) return null;

    // Extract config from campaign - handle both parsed object and JSON string
    const rawContent = campaign.content;
    const content = typeof rawContent === 'string' ? JSON.parse(rawContent || '{}') : (rawContent || {});
    const rawSettings = campaign.settings;
    const settings = typeof rawSettings === 'string' ? JSON.parse(rawSettings || '{}') : (rawSettings || {});

    const title = content?.title || `${t('welcome_title_prefix', '¡Bienvenido a ')}${restaurant?.name}!`;
    const description = content?.description || t('welcome_description_default', 'Únete a nuestra comunidad para recibir ofertas exclusivas y novedades.');
    const imageUrl = content?.image_url;

    const showForm = settings?.show_capture_form !== false; // Default true
    const showEmail = settings?.show_email !== false; // Default true
    const showPhone = settings?.show_phone !== false; // Default true

    // If no contact fields are enabled, treat as informative-only campaign
    const isInformativeOnly = !showEmail && !showPhone;

    // ✅ Extract branding colors from restaurant (with fallbacks)
    const accentColor = restaurant?.branding?.accent_color || restaurant?.branding?.accentColor || '#FFD700';


    // Format expiry date for display
    const formatExpiryDate = (isoDate: string) => {
        const date = new Date(isoDate);
        return date.toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    // Generate WhatsApp message with translations
    const generateWhatsAppUrl = () => {
        if (!claimData?.magic_link) return '';

        const expiryFormatted = claimData.expires_at ? formatExpiryDate(claimData.expires_at) : '';

        const message = encodeURIComponent(
            `🎁 *${restaurant?.name}*\n\n` +
            `${title}\n` +
            `${description}\n\n` +
            `📅 ${t('valid_until', 'Válido hasta')}: ${expiryFormatted}\n` +
            `🔗 ${t('open_offer', 'Ver oferta')}: ${claimData.magic_link}`
        );

        return `https://wa.me/?text=${message}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!consent) {
            setError(t('error_accept_privacy', 'Debes aceptar la política de privacidad'));
            return;
        }
        if (!email && !phone) {
            setError(t('error_enter_contact', 'Introduce tu email o teléfono'));
            return;
        }

        // Input sanitization: trim and enforce max lengths
        const sanitizedEmail = email.trim().substring(0, 254); // RFC 5321 max length
        const sanitizedPhone = phone.trim().replace(/[^\d+\s-]/g, '').substring(0, 20);

        // Phone validation
        const phoneRegex = /^\+?[0-9]{9,15}$/;
        if (sanitizedPhone && !phoneRegex.test(sanitizedPhone.replace(/[\s-]/g, ''))) {
            setError(t('error_invalid_phone', 'Formato de teléfono inválido (ej: +34612345678)'));
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (sanitizedEmail && !emailRegex.test(sanitizedEmail)) {
            setError(t('error_invalid_email', 'Formato de email inválido'));
            return;
        }

        setLoading(true);
        setError('');


        try {
            const type = sanitizedEmail ? 'email' : 'phone';
            const value = sanitizedEmail || sanitizedPhone;

            // Get session and visitor IDs from localStorage
            const sessionId = localStorage.getItem('vt_session_id');
            const visitorId = localStorage.getItem('vt_visitor_id');

            const response = await fetch(`${API_URL}/api/leads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurant_id: restaurant.id,
                    campaign_id: campaign.id,
                    type,
                    contact_value: value,
                    consent_given: true,
                    source: 'welcome_modal',
                    session_id: sessionId,
                    visitor_id: visitorId,
                    save_method: 'whatsapp'
                })
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                // Store claim data for WhatsApp save
                if (data.magic_link) {
                    setClaimData({
                        magic_link: data.magic_link,
                        expires_at: data.expires_at,
                        validation_code: data.magic_token?.toUpperCase()?.substring(0, 8)
                    });
                }
                // Save to local storage that user has subscribed
                localStorage.setItem(`subscribed_${restaurant.id}`, 'true');
            } else {
                setError(data.message || t('error_save_generic', 'Error al guardar'));
            }
        } catch (err) {
            setError(t('error_connection', 'Error de conexión'));
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // SUCCESS STATE
    // ============================================
    if (success) {
        const whatsAppUrl = generateWhatsAppUrl();

        return (
            <Dialog
                open={open}
                onClose={onClose}
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
                        backgroundImage: `radial-gradient(ellipse at top, ${accentColor}15 0%, transparent 60%)`,
                        overflow: 'hidden'
                    }
                }}
            >
                {/* ✅ Drag handle for mobile */}
                {isMobile && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5, pb: 0.5 }}>
                        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />
                    </Box>
                )}

                <Box sx={{ p: 4, textAlign: 'center' }}>
                    {/* ✅ Animated success icon */}
                    <Box sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        bgcolor: `${accentColor}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 3,
                        animation: 'success-pop 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
                        '@keyframes success-pop': {
                            '0%': { transform: 'scale(0)' },
                            '100%': { transform: 'scale(1)' }
                        }
                    }}>
                        <CheckCircle sx={{ fontSize: 48, color: accentColor }} />
                    </Box>

                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, fontFamily: '"Fraunces", serif' }}>
                        {t('success_title', '¡Gracias!')}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.7, mb: 3, lineHeight: 1.6 }}>
                        {t('success_message', 'Tus datos se han guardado correctamente.')}
                    </Typography>

                    {claimData?.expires_at && (
                        <Typography variant="caption" sx={{ display: 'block', opacity: 0.5, mb: 3 }}>
                            📅 {t('valid_until', 'Válido hasta')}: {formatExpiryDate(claimData.expires_at)}
                        </Typography>
                    )}

                    {whatsAppUrl && (
                        <Button
                            component="a"
                            href={whatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="contained"
                            fullWidth
                            sx={{
                                bgcolor: '#25D366',
                                color: 'white',
                                fontWeight: 700,
                                py: 1.8,
                                mb: 2,
                                borderRadius: 3,
                                fontSize: '0.95rem',
                                textTransform: 'none',
                                boxShadow: '0 8px 24px rgba(37,211,102,0.3)',
                                '&:hover': { bgcolor: '#1DA851', boxShadow: '0 12px 32px rgba(37,211,102,0.4)' }
                            }}
                            onClick={() => {
                                localStorage.setItem(`whatsapp_saved_${campaign.id}`, 'true');
                            }}
                        >
                            📱 {t('save_to_whatsapp', 'Guardar en WhatsApp')}
                        </Button>
                    )}

                    <Button
                        onClick={onClose}
                        variant="text"
                        sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textTransform: 'none' }}
                    >
                        {t('button_close', 'Cerrar')}
                    </Button>
                </Box>
            </Dialog>
        )
    }


    // ============================================
    // MAIN MODAL
    // ============================================
    return (
        <Dialog
            open={open}
            onClose={onClose}
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

            <DialogContent sx={{ pt: 0, px: 0, pb: isMobile ? 4 : 3, textAlign: 'center', overflow: 'auto' }}>
                {/* ✅ Hero image with gradient overlay */}
                {imageUrl ? (
                    <Box sx={{ position: 'relative', mb: 0 }}>
                        <Box
                            component="img"
                            src={imageUrl}
                            alt="Offer"
                            sx={{
                                width: '100%',
                                height: { xs: '220px', sm: '240px' },
                                objectFit: 'cover',
                                display: 'block'
                            }}
                        />
                        {/* ✅ Bottom gradient overlay for text readability */}
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

                {/* ✅ Content section with proper spacing */}
                <Box sx={{ px: 3, mt: imageUrl ? -2 : 2, mb: 3, position: 'relative', zIndex: 2 }}>
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
                        {description}
                    </Typography>
                </Box>

                {/* ✅ Form section */}
                {showForm && !isInformativeOnly ? (
                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        sx={{
                            px: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2
                        }}
                    >
                        {showEmail && (
                            <TextField
                                placeholder={t('placeholder_email', 'Tu Email (para descuentos)')}
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setPhone(''); }}
                                fullWidth
                                variant="outlined"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: 'rgba(255,255,255,0.06)',
                                        borderRadius: 3,
                                        color: 'white',
                                        fontSize: '0.95rem',
                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
                                        '&.Mui-focused fieldset': { borderColor: accentColor, borderWidth: 2 }
                                    }
                                }}
                            />
                        )}

                        {showEmail && showPhone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.08)' }} />
                                <Typography variant="caption" sx={{ opacity: 0.4, fontSize: '0.75rem' }}>
                                    {t('or', 'O')}
                                </Typography>
                                <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.08)' }} />
                            </Box>
                        )}

                        {showPhone && (
                            <TextField
                                placeholder={t('placeholder_whatsapp', 'Tu WhatsApp (para comunidad)')}
                                type="tel"
                                value={phone}
                                onChange={(e) => { setPhone(e.target.value); setEmail(''); }}
                                fullWidth
                                variant="outlined"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: 'rgba(255,255,255,0.06)',
                                        borderRadius: 3,
                                        color: 'white',
                                        fontSize: '0.95rem',
                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
                                        '&.Mui-focused fieldset': { borderColor: '#25D366', borderWidth: 2 }
                                    }
                                }}
                            />
                        )}

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={consent}
                                    onChange={(e) => setConsent(e.target.checked)}
                                    sx={{
                                        color: 'rgba(255,255,255,0.3)',
                                        '&.Mui-checked': { color: accentColor },
                                        padding: '6px'
                                    }}
                                    size="small"
                                />
                            }
                            label={
                                <Typography variant="caption" sx={{ opacity: 0.6, textAlign: 'left', display: 'block', fontSize: '0.7rem', lineHeight: 1.4 }}>
                                    {t('consent_prefix', 'Acepto la ')} <Link
                                        component="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setShowPrivacy(true);
                                        }}
                                        sx={{ color: accentColor, verticalAlign: 'baseline', textDecoration: 'none', fontSize: '0.7rem' }}
                                    >{t('privacy_policy_link', 'Política de Privacidad')}</Link> {t('consent_suffix', ' y consiento el tratamiento de mis datos.')}
                                </Typography>
                            }
                            sx={{ alignItems: 'flex-start', ml: 0, mr: 0 }}
                        />

                        {error && (
                            <Typography
                                sx={{
                                    color: '#ff6b6b',
                                    fontSize: '0.8rem',
                                    bgcolor: 'rgba(255,107,107,0.1)',
                                    borderRadius: 2,
                                    px: 2,
                                    py: 1
                                }}
                            >
                                {error}
                            </Typography>
                        )}

                        {/* ✅ Primary CTA with restaurant accent color */}
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={loading}
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
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    bgcolor: accentColor,
                                    filter: 'brightness(1.1)',
                                    boxShadow: `0 12px 32px ${accentColor}50`,
                                    transform: 'translateY(-1px)'
                                },
                                '&:active': {
                                    transform: 'translateY(0)'
                                },
                                '&.Mui-disabled': {
                                    bgcolor: `${accentColor}60`,
                                    color: 'rgba(0,0,0,0.5)'
                                }
                            }}
                        >
                            {loading ? t('button_saving', 'Guardando...') : t('button_get_offer', '🎁 Obtener Oferta')}
                        </Button>
                    </Box>
                ) : isInformativeOnly ? (
                    /* ✅ Informative-only: show a CTA to close/view menu instead of empty space */
                    <Box sx={{ px: 3 }}>
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
                                }
                            }}
                        >
                            {t('button_view_menu', '📖 Ver Menú')}
                        </Button>
                    </Box>
                ) : null}

                {/* ✅ Safe area padding for iOS */}
                {isMobile && (
                    <Box sx={{ pb: 'env(safe-area-inset-bottom, 16px)' }} />
                )}
            </DialogContent>

            {/* ✅ Sub-Modal de Privacidad */}
            <Dialog
                open={showPrivacy}
                onClose={() => setShowPrivacy(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        bgcolor: '#1E1E1E',
                        color: 'white',
                    }
                }}
            >
                <DialogContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h5" sx={{ fontFamily: '"Fraunces", serif', color: accentColor }}>
                            {t('privacy_policy_link', 'Política de Privacidad')}
                        </Typography>
                        <IconButton onClick={() => setShowPrivacy(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            <Close />
                        </IconButton>
                    </Box>
                    <Box
                        data-allow-scroll
                        className="allow-scroll"
                        sx={{ maxHeight: '60vh', overflowY: 'auto', pr: 1, touchAction: 'pan-y' }}
                    >
                        <PrivacyContent />
                    </Box>
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Button
                            onClick={() => setShowPrivacy(false)}
                            variant="outlined"
                            sx={{ color: accentColor, borderColor: accentColor }}
                        >
                            {t('button_close', 'Cerrar')}
                        </Button>
                    </Box>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
};

export default WelcomeModal;
