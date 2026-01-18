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
    Link
} from '@mui/material';
import { Close, CardGiftcard } from '@mui/icons-material';
import { API_URL } from '../../lib/apiClient';
import { PrivacyContent } from '../legal/PrivacyContent'; // ✅ Import
import { useTranslation } from '../../contexts/TranslationContext';

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

const WelcomeModal: React.FC<WelcomeModalProps> = ({ open, onClose, restaurant, campaign }) => {
    const { t } = useTranslation();
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

    if (success) {
        const whatsAppUrl = generateWhatsAppUrl();

        return (
            <Dialog
                open={open}
                onClose={onClose}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        bgcolor: '#1a1a1a',
                        color: 'white',
                        maxWidth: '380px',
                        m: 2
                    }
                }}
            >
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <CardGiftcard sx={{ fontSize: 60, color: '#FFD700', mb: 2 }} />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                        {t('success_title', '¡Gracias!')}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8, mb: 3 }}>
                        {t('success_message', 'Tus datos se han guardado correctamente.')}
                    </Typography>

                    {claimData?.expires_at && (
                        <Typography variant="caption" sx={{ display: 'block', opacity: 0.6, mb: 2 }}>
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
                                fontWeight: 'bold',
                                py: 1.5,
                                mb: 2,
                                borderRadius: 2,
                                '&:hover': { bgcolor: '#1DA851' }
                            }}
                            onClick={() => {
                                // Track WhatsApp save event
                                localStorage.setItem(`whatsapp_saved_${campaign.id}`, 'true');
                            }}
                        >
                            📱 {t('save_to_whatsapp', 'Guardar en WhatsApp')}
                        </Button>
                    )}

                    <Button
                        onClick={onClose}
                        variant="text"
                        sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}
                    >
                        {t('button_close', 'Cerrar')}
                    </Button>
                </Box>
            </Dialog>
        )
    }


    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="xs"
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    bgcolor: '#1a1a1a',
                    color: 'white',
                    backgroundImage: 'linear-gradient(145deg, #1a1a1a 0%, #2a2a2a 100%)',
                    m: 2,
                    overflow: 'hidden'
                }
            }}
        >
            <IconButton
                onClick={onClose}
                sx={{
                    position: 'absolute',
                    right: 8,
                    top: 8,
                    color: 'rgba(255,255,255,0.5)',
                    zIndex: 10
                }}
            >
                <Close />
            </IconButton>

            <DialogContent sx={{ pt: 0, px: 0, pb: 4, textAlign: 'center' }}>
                {imageUrl ? (
                    <Box
                        component="img"
                        src={imageUrl}
                        alt="Offer"
                        sx={{
                            width: '100%',
                            height: '200px',
                            objectFit: 'cover',
                            mb: 3
                        }}
                    />
                ) : (
                    <Box sx={{ pt: 4, px: 3, mb: 3 }}>
                        <CardGiftcard sx={{ fontSize: 48, color: '#FFD700', mb: 1 }} />
                    </Box>
                )}

                <Box sx={{ px: 3, mb: 3 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'Fraunces', mb: 1 }}>
                        {title}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.7, whiteSpace: 'pre-line' }}>
                        {description}
                    </Typography>
                </Box>

                {showForm && !isInformativeOnly ? (
                    <Box component="form" onSubmit={handleSubmit} sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                                        bgcolor: 'rgba(255,255,255,0.05)',
                                        borderRadius: 2,
                                        color: 'white',
                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                                        '&.Mui-focused fieldset': { borderColor: '#FFD700' }
                                    }
                                }}
                            />
                        )}

                        {showEmail && showPhone && (
                            <Typography variant="caption" sx={{ opacity: 0.5 }}>{t('or', 'O')}</Typography>
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
                                        bgcolor: 'rgba(255,255,255,0.05)',
                                        borderRadius: 2,
                                        color: 'white',
                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                                        '&.Mui-focused fieldset': { borderColor: '#25D366' }
                                    }
                                }}
                            />
                        )}

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={consent}
                                    onChange={(e) => setConsent(e.target.checked)}
                                    sx={{ color: 'rgba(255,255,255,0.5)', '&.Mui-checked': { color: '#FFD700' } }}
                                />
                            }
                            label={
                                <Typography variant="caption" sx={{ opacity: 0.7, textAlign: 'left', display: 'block' }}>
                                    {t('consent_prefix', 'Acepto la ')} <Link
                                        component="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setShowPrivacy(true);
                                        }}
                                        sx={{ color: '#FFD700', verticalAlign: 'baseline', textDecoration: 'none' }}
                                    >{t('privacy_policy_link', 'Política de Privacidad')}</Link> {t('consent_suffix', ' y consiento el tratamiento de mis datos.')}
                                </Typography>
                            }
                            sx={{ alignItems: 'flex-start', ml: 0 }}
                        />

                        {error && (
                            <Typography color="error" variant="caption">
                                {error}
                            </Typography>
                        )}

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={loading}
                            sx={{
                                bgcolor: '#FFD700',
                                color: 'black',
                                fontWeight: 'bold',
                                py: 1.5,
                                borderRadius: 2,
                                '&:hover': { bgcolor: '#FFC000' }
                            }}
                        >
                            {loading ? t('button_saving', 'Guardando...') : t('button_get_offer', 'Obtener Oferta')}
                        </Button>
                    </Box>
                ) : null}
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
                        <Typography variant="h5" sx={{ fontFamily: 'Fraunces', color: '#FFD700' }}>
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
                            sx={{ color: '#FFD700', borderColor: '#FFD700' }}
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
