import React, { useState } from 'react';
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
import { Close, CardGiftcard, CheckCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../contexts/TranslationContext';
import { API_URL } from '../../lib/apiClient';
import type { TransitionProps } from '@mui/material/transitions';

export interface LoyaltyProgram {
    stamps_required: number;
    reward_name?: string;
    reward_description?: string;
    reward_image_url?: string;
    stamp_icon?: string;
    card_color?: string;
    terms?: string;
}

export interface LoyaltyCard {
    id: string;
    stamps: number;
    status: 'active' | 'completed' | 'redeemed' | 'expired';
    magic_link_token?: string;
    expires_at?: string | null;
    completed_at?: string | null;
}

interface LoyaltyCardModalProps {
    open: boolean;
    onClose: () => void;
    program?: LoyaltyProgram | null;
    card?: LoyaltyCard | null;
    onCardChange: (card: LoyaltyCard | null) => void;
    restaurantId: string;
    restaurantSlug?: string;
    accentColor?: string;
    visitorId: string | null;
}

const SlideUpTransition = React.forwardRef(function Transition(
    props: TransitionProps & { children: React.ReactElement },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const LoyaltyCardModal: React.FC<LoyaltyCardModalProps> = ({
    open, onClose, program, card, onCardChange, restaurantId, restaurantSlug, accentColor, visitorId
}) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();

    const [askingPin, setAskingPin] = useState(false);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    if (!program) return null;

    const color = accentColor || program.card_color || '#FFD700';
    const stampIcon = program.stamp_icon || '⭐';
    const stampsRequired = program.stamps_required || 8;
    const currentStamps = card?.stamps || 0;
    const isCompleted = card?.status === 'completed';
    const isRedeemed = card?.status === 'redeemed';

    const handleStart = () => {
        setPinError(null);
        setPin('');
        setAskingPin(true);
    };

    const handleConfirmStamp = async () => {
        if (pin.length < 4) {
            setPinError(t('loyalty_pin_required', 'Introduce el PIN de 4 dígitos'));
            return;
        }
        setLoading(true);
        setPinError(null);
        try {
            const res = await fetch(`${API_URL}/api/loyalty/stamp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurant_id: restaurantId, visitor_id: visitorId, pin })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setPinError(data.message || t('loyalty_pin_wrong', 'PIN incorrecto'));
                return;
            }
            onCardChange(data.card);
            setAskingPin(false);
            setPin('');
        } catch (e) {
            setPinError(t('error_connection', 'Error de conexión'));
        } finally {
            setLoading(false);
        }
    };

    const handleViewReward = () => {
        if (card?.magic_link_token && restaurantSlug) {
            onClose();
            navigate(`/${restaurantSlug}/oferta/${card.magic_link_token}`);
        }
    };

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
                    backgroundImage: `radial-gradient(ellipse at top, ${color}12 0%, transparent 50%)`
                }
            }}
        >
            {isMobile && (
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5, pb: 0.5 }}>
                    <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.25)' }} />
                </Box>
            )}

            <IconButton
                onClick={onClose}
                sx={{
                    position: 'absolute', right: 12, top: isMobile ? 16 : 12,
                    color: 'rgba(255,255,255,0.5)', zIndex: 10,
                    bgcolor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' }
                }}
                size="small"
            >
                <Close fontSize="small" />
            </IconButton>

            <DialogContent sx={{ pt: 4, px: 3, pb: isMobile ? 4 : 3, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: '"Fraunces", serif', mb: 0.5 }}>
                    {t('loyalty_title', 'Tu tarjeta de fidelidad')}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.6, mb: 3 }}>
                    {program.reward_name
                        ? t('loyalty_reward_line', `Completa la tarjeta y consigue: ${program.reward_name}`)
                        : t('loyalty_generic_line', 'Junta sellos en cada visita y consigue tu premio')}
                </Typography>

                {/* Stamp grid */}
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.min(stampsRequired, 5)}, 1fr)`,
                    gap: 1.5,
                    mb: 3,
                    px: 1
                }}>
                    {Array.from({ length: stampsRequired }).map((_, i) => {
                        const filled = i < currentStamps;
                        return (
                            <Box
                                key={i}
                                sx={{
                                    aspectRatio: '1',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.4rem',
                                    bgcolor: filled ? `${color}25` : 'rgba(255,255,255,0.04)',
                                    border: `2px solid ${filled ? color : 'rgba(255,255,255,0.12)'}`,
                                    opacity: filled ? 1 : 0.4,
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {filled ? stampIcon : ''}
                            </Box>
                        );
                    })}
                </Box>

                <Typography variant="caption" sx={{ opacity: 0.5, display: 'block', mb: 3 }}>
                    {currentStamps}/{stampsRequired} {t('loyalty_stamps_label', 'sellos')}
                </Typography>

                {isRedeemed ? (
                    <Box sx={{ py: 2 }}>
                        <CheckCircle sx={{ fontSize: 48, color: '#22c55e', mb: 1 }} />
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                            {t('loyalty_already_redeemed', 'Ya canjeaste esta tarjeta. ¡Gracias por volver!')}
                        </Typography>
                    </Box>
                ) : isCompleted ? (
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleViewReward}
                        sx={{
                            bgcolor: color, color: '#0f0f1a', fontWeight: 700, py: 1.8,
                            borderRadius: 3, textTransform: 'none',
                            boxShadow: `0 8px 24px ${color}40`,
                            '&:hover': { bgcolor: color, filter: 'brightness(1.1)' }
                        }}
                    >
                        🎁 {t('loyalty_view_reward', 'Ver mi premio')}
                    </Button>
                ) : askingPin ? (
                    <Box>
                        <Typography variant="caption" sx={{ display: 'block', mb: 1.5, opacity: 0.6 }}>
                            {t('loyalty_ask_staff', 'Pide al camarero que introduzca el PIN')}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
                            <input
                                type="tel"
                                inputMode="numeric"
                                maxLength={4}
                                value={pin}
                                onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setPinError(null); }}
                                placeholder="····"
                                autoFocus
                                style={{
                                    width: '140px', fontSize: '28px', fontFamily: 'monospace',
                                    textAlign: 'center', letterSpacing: '12px', padding: '12px',
                                    borderRadius: '12px',
                                    border: `2px solid ${pinError ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
                                    background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none'
                                }}
                            />
                        </Box>
                        {pinError && (
                            <Typography variant="caption" sx={{ display: 'block', color: '#ef4444', mb: 1.5 }}>
                                {pinError}
                            </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <Button
                                fullWidth
                                onClick={() => setAskingPin(false)}
                                sx={{ color: 'rgba(255,255,255,0.5)', bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 3, py: 1.5 }}
                            >
                                {t('button_cancel', 'Cancelar')}
                            </Button>
                            <Button
                                fullWidth
                                variant="contained"
                                disabled={loading}
                                onClick={handleConfirmStamp}
                                sx={{ bgcolor: color, color: '#0f0f1a', fontWeight: 700, borderRadius: 3, py: 1.5 }}
                            >
                                {loading ? '...' : t('button_confirm', 'Confirmar')}
                            </Button>
                        </Box>
                    </Box>
                ) : (
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleStart}
                        startIcon={<CardGiftcard />}
                        sx={{
                            bgcolor: color, color: '#0f0f1a', fontWeight: 700, py: 1.8,
                            borderRadius: 3, textTransform: 'none',
                            boxShadow: `0 8px 24px ${color}40`,
                            '&:hover': { bgcolor: color, filter: 'brightness(1.1)' }
                        }}
                    >
                        {t('loyalty_add_stamp', 'Sumar sello')}
                    </Button>
                )}

                {program.terms && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 2, opacity: 0.35, fontSize: '0.7rem' }}>
                        {program.terms}
                    </Typography>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default LoyaltyCardModal;
