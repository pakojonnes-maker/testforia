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
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [consent, setConsent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [showPrivacy, setShowPrivacy] = useState(false); // ✅ State Modal

    if (!campaign) return null;

    // Extract config from campaign
    const { content, settings } = campaign;
    const title = content?.title || `¡Bienvenido a ${restaurant?.name}!`;
    const description = content?.description || 'Únete a nuestra comunidad para recibir ofertas exclusivas y novedades.';
    const imageUrl = content?.image_url;

    const showForm = settings?.show_capture_form !== false; // Default true
    const showEmail = settings?.show_email !== false; // Default true
    const showPhone = settings?.show_phone !== false; // Default true

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!consent) {
            setError('Debes aceptar la política de privacidad');
            return;
        }
        if (!email && !phone) {
            setError('Introduce tu email o teléfono');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const type = email ? 'email' : 'phone';
            const value = email || phone;

            const response = await fetch(`${API_URL}/api/leads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurant_id: restaurant.id,
                    campaign_id: campaign.id, // Link to campaign
                    type,
                    contact_value: value,
                    consent_given: true,
                    source: 'welcome_modal'
                })
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                // Save to local storage that user has subscribed
                localStorage.setItem(`subscribed_${restaurant.id}`, 'true');
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                setError(data.message || 'Error al guardar');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <Dialog
                open={open}
                onClose={onClose}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        bgcolor: '#1a1a1a',
                        color: 'white',
                        maxWidth: '350px',
                        m: 2
                    }
                }}
            >
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <CardGiftcard sx={{ fontSize: 60, color: '#FFD700', mb: 2 }} />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                        ¡Gracias!
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.8 }}>
                        Tus datos se han guardado correctamente. ¡Disfruta de tu oferta!
                    </Typography>
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

                {showForm ? (
                    <Box component="form" onSubmit={handleSubmit} sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {showEmail && (
                            <TextField
                                placeholder="Tu Email (para descuentos)"
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
                            <Typography variant="caption" sx={{ opacity: 0.5 }}>O</Typography>
                        )}

                        {showPhone && (
                            <TextField
                                placeholder="Tu WhatsApp (para comunidad)"
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
                                    Acepto la <Link
                                        component="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setShowPrivacy(true);
                                        }}
                                        sx={{ color: '#FFD700', verticalAlign: 'baseline', textDecoration: 'none' }}
                                    >Política de Privacidad</Link> y consiento el tratamiento de mis datos.
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
                            {loading ? 'Guardando...' : 'Obtener Oferta'}
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{ px: 3 }}>
                        <Button
                            onClick={onClose}
                            variant="contained"
                            sx={{
                                bgcolor: '#FFD700',
                                color: 'black',
                                fontWeight: 'bold',
                                py: 1.5,
                                borderRadius: 2,
                                width: '100%',
                                '&:hover': { bgcolor: '#FFC000' }
                            }}
                        >
                            Entendido
                        </Button>
                    </Box>
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
                        <Typography variant="h5" sx={{ fontFamily: 'Fraunces', color: '#FFD700' }}>
                            Política de Privacidad
                        </Typography>
                        <IconButton onClick={() => setShowPrivacy(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            <Close />
                        </IconButton>
                    </Box>
                    <Box sx={{ maxHeight: '60vh', overflowY: 'auto', pr: 1 }}>
                        <PrivacyContent />
                    </Box>
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Button
                            onClick={() => setShowPrivacy(false)}
                            variant="outlined"
                            sx={{ color: '#FFD700', borderColor: '#FFD700' }}
                        >
                            Cerrar
                        </Button>
                    </Box>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
};

export default WelcomeModal;
