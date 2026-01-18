import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    alpha
} from '@mui/material';
import {
    CheckCircle,
    Cancel,
    AccessTime,
    Warning
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { API_URL } from '../lib/apiClient';

interface ClaimData {
    success: boolean;
    claim: {
        id: string;
        status: 'active' | 'redeemed' | 'expired';
        is_valid: boolean;
        expires_at: string;
        created_at: string;
        redeemed_at?: string;
        validation_code: string;
    };
    campaign: {
        id: string;
        name: string;
        type: string;
        title?: string;
        description?: string;
        image_url?: string;
    };
    reward?: {
        id: string;
        name: string;
        description?: string;
        image_url?: string;
    } | null;
    restaurant: {
        id: string;
        name: string;
        slug: string;
        logo_url?: string;
    };
    is_returning_visitor: boolean;
}

export const RedemptionPage: React.FC = () => {
    const location = useLocation();

    // Extract token from URL path
    const legacyMatch = location.pathname.match(/^\/r\/([a-zA-Z0-9]+)$/);
    const newMatch = location.pathname.match(/^\/([^/]+)\/oferta\/([a-zA-Z0-9]+)$/);
    const token = legacyMatch?.[1] || newMatch?.[2];

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ClaimData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [redeeming, setRedeeming] = useState(false);
    const [localRedeemedAt, setLocalRedeemedAt] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setError('Token no válido');
            setLoading(false);
            return;
        }

        const fetchClaim = async () => {
            try {
                const response = await fetch(`${API_URL}/api/r/${token}`);
                const result = await response.json();

                if (!result.success) {
                    setError(result.message || 'Oferta no encontrada');
                    return;
                }

                setData(result);
                if (result.claim?.redeemed_at) {
                    setLocalRedeemedAt(result.claim.redeemed_at);
                }
            } catch (err) {
                console.error('Error fetching claim:', err);
                setError('Error de conexión');
            } finally {
                setLoading(false);
            }
        };

        fetchClaim();
    }, [token]);

    const handleRedeem = async () => {
        if (!token) return;
        setRedeeming(true);

        try {
            const response = await fetch(`${API_URL}/api/r/${token}/redeem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();

            if (result.success) {
                setLocalRedeemedAt(result.redeemed_at);
                if (data) {
                    setData({
                        ...data,
                        claim: { ...data.claim, status: 'redeemed', is_valid: false }
                    });
                }
            } else {
                setError(result.message);
            }
        } catch (err) {
            console.error('Error redeeming:', err);
            setError('Error al canjear');
        } finally {
            setRedeeming(false);
            setShowConfirmDialog(false);
        }
    };

    const formatDateTime = (isoDate: string) => {
        const date = new Date(isoDate);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (isoDate: string) => {
        const date = new Date(isoDate);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getDaysRemaining = (expiresAt: string) => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    };

    // Loading state
    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="#0a0a0a">
                <CircularProgress sx={{ color: '#FFD700' }} />
            </Box>
        );
    }

    // Error state
    if (error || !data) {
        return (
            <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                minHeight="100vh"
                bgcolor="#0a0a0a"
                color="white"
                p={3}
                textAlign="center"
            >
                <Cancel sx={{ fontSize: 64, color: '#ef4444', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Oferta no encontrada
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.5 }}>
                    {error || 'El enlace no es válido o ha expirado.'}
                </Typography>
            </Box>
        );
    }

    const { claim, campaign, reward, restaurant } = data;
    const daysRemaining = getDaysRemaining(claim.expires_at);
    const isExpired = claim.status === 'expired' || daysRemaining <= 0;
    const isRedeemed = claim.status === 'redeemed' || !!localRedeemedAt;
    const isValid = claim.is_valid && !isExpired && !isRedeemed;

    const displayTitle = reward?.name || campaign.title || campaign.name;
    const displayDescription = reward?.description || campaign.description;
    const displayImage = reward?.image_url || campaign.image_url;

    return (
        <Box
            minHeight="100vh"
            bgcolor="#0a0a0a"
            color="white"
            display="flex"
            flexDirection="column"
            alignItems="center"
            p={3}
        >
            {/* Restaurant Header */}
            <Box display="flex" alignItems="center" gap={1.5} mb={4}>
                {restaurant.logo_url && (
                    <Box
                        component="img"
                        src={restaurant.logo_url}
                        alt={restaurant.name}
                        sx={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                    />
                )}
                <Typography variant="subtitle1" sx={{ fontWeight: 500, opacity: 0.9 }}>
                    {restaurant.name}
                </Typography>
            </Box>

            {/* Main Card */}
            <Box
                sx={{
                    maxWidth: 360,
                    width: '100%',
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: alpha('#fff', 0.08),
                    bgcolor: alpha('#fff', 0.02)
                }}
            >
                {/* Image */}
                {displayImage && (
                    <Box
                        component="img"
                        src={displayImage}
                        alt={displayTitle}
                        sx={{ width: '100%', height: 160, objectFit: 'cover' }}
                    />
                )}

                {/* Content */}
                <Box p={3}>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2 }}>
                        {displayTitle}
                    </Typography>

                    {displayDescription && (
                        <Typography variant="body2" sx={{ opacity: 0.6, mb: 3, lineHeight: 1.5 }}>
                            {displayDescription}
                        </Typography>
                    )}

                    {/* Status */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mb: 3,
                            py: 1.5,
                            px: 2,
                            borderRadius: 2,
                            bgcolor: isValid ? alpha('#22c55e', 0.1) : isRedeemed ? alpha('#f59e0b', 0.1) : alpha('#ef4444', 0.1)
                        }}
                    >
                        {isValid ? (
                            <CheckCircle sx={{ color: '#22c55e', fontSize: 20 }} />
                        ) : isRedeemed ? (
                            <CheckCircle sx={{ color: '#f59e0b', fontSize: 20 }} />
                        ) : (
                            <Cancel sx={{ color: '#ef4444', fontSize: 20 }} />
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 600, color: isValid ? '#22c55e' : isRedeemed ? '#f59e0b' : '#ef4444' }}>
                            {isValid ? 'Oferta válida' : isRedeemed ? 'Canjeada' : 'Expirada'}
                        </Typography>
                    </Box>

                    {/* Validity / Redemption Info */}
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <AccessTime sx={{ fontSize: 18, opacity: 0.4 }} />
                        <Box>
                            {isRedeemed && (localRedeemedAt || claim.redeemed_at) ? (
                                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                    Canjeado el {formatDateTime(localRedeemedAt || claim.redeemed_at || '')}
                                </Typography>
                            ) : (
                                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                    Válido hasta {formatDate(claim.expires_at)} ({daysRemaining} días)
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    {/* Validation Code - Only for valid offers */}
                    {isValid && (
                        <Box sx={{ textAlign: 'center', mb: 3 }}>
                            <Typography variant="caption" sx={{ opacity: 0.4, display: 'block', mb: 1 }}>
                                Código de validación
                            </Typography>
                            <Typography
                                variant="h4"
                                sx={{
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    color: '#FFD700',
                                    letterSpacing: 3,
                                    py: 1.5,
                                    px: 2,
                                    borderRadius: 2,
                                    border: '2px dashed',
                                    borderColor: alpha('#FFD700', 0.3),
                                    bgcolor: alpha('#FFD700', 0.05)
                                }}
                            >
                                {claim.validation_code}
                            </Typography>
                        </Box>
                    )}

                    {/* Redeem Button - Only for valid offers */}
                    {isValid && (
                        <Box sx={{ mt: 2 }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 0.5,
                                    mb: 1.5,
                                    py: 1,
                                    px: 2,
                                    borderRadius: 1,
                                    bgcolor: alpha('#f59e0b', 0.1),
                                    border: '1px solid',
                                    borderColor: alpha('#f59e0b', 0.2)
                                }}
                            >
                                <Warning sx={{ color: '#f59e0b', fontSize: 16 }} />
                                <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 500 }}>
                                    Solo pulsar ante el camarero
                                </Typography>
                            </Box>

                            <Button
                                fullWidth
                                variant="contained"
                                onClick={() => setShowConfirmDialog(true)}
                                disabled={redeeming}
                                sx={{
                                    py: 1.5,
                                    bgcolor: '#22c55e',
                                    color: 'white',
                                    fontWeight: 600,
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                    '&:hover': { bgcolor: '#16a34a' }
                                }}
                            >
                                {redeeming ? 'Canjeando...' : 'Canjear Oferta'}
                            </Button>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Menu Link */}
            {restaurant.slug && (
                <Box
                    component="a"
                    href={`https://menu.visualtastes.com/${restaurant.slug}`}
                    sx={{
                        mt: 4,
                        py: 1,
                        px: 3,
                        borderRadius: 2,
                        bgcolor: alpha('#fff', 0.05),
                        color: 'white',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        opacity: 0.7,
                        transition: 'opacity 0.2s',
                        '&:hover': { opacity: 1 }
                    }}
                >
                    Ver menú de {restaurant.name}
                </Box>
            )}

            {/* Footer */}
            <Typography variant="caption" sx={{ mt: 4, opacity: 0.2 }}>
                Powered by VisualTaste
            </Typography>

            {/* Confirmation Dialog */}
            <Dialog
                open={showConfirmDialog}
                onClose={() => setShowConfirmDialog(false)}
                PaperProps={{
                    sx: {
                        bgcolor: '#1a1a1a',
                        color: 'white',
                        borderRadius: 3,
                        maxWidth: 340
                    }
                }}
            >
                <DialogTitle sx={{ textAlign: 'center', pt: 3, pb: 1 }}>
                    <Warning sx={{ fontSize: 48, color: '#f59e0b', mb: 1 }} />
                    <Typography component="span" variant="h6" sx={{ fontWeight: 600, display: 'block' }}>
                        ¿Estás con el personal?
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ textAlign: 'center', opacity: 0.7, lineHeight: 1.6 }}>
                        Esta acción marcará la oferta como usada y no se podrá deshacer.
                        Solo pulsa "Confirmar" si el camarero te lo indica.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                    <Button
                        fullWidth
                        onClick={() => setShowConfirmDialog(false)}
                        sx={{
                            color: 'white',
                            bgcolor: alpha('#fff', 0.1),
                            '&:hover': { bgcolor: alpha('#fff', 0.15) }
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleRedeem}
                        disabled={redeeming}
                        sx={{
                            bgcolor: '#22c55e',
                            '&:hover': { bgcolor: '#16a34a' }
                        }}
                    >
                        {redeeming ? 'Canjeando...' : 'Confirmar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RedemptionPage;
