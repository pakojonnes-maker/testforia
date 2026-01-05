import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    Paper,
    Chip,
    Divider
} from '@mui/material';
import {
    CardGiftcard,
    CheckCircle,
    Cancel,
    AccessTime
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

    // Extract token from URL path - two formats:
    // 1. Legacy: /r/{token}
    // 2. New: /{slug}/oferta/{token}
    const legacyMatch = location.pathname.match(/^\/r\/([a-zA-Z0-9]+)$/);
    const newMatch = location.pathname.match(/^\/([^/]+)\/oferta\/([a-zA-Z0-9]+)$/);

    const token = legacyMatch?.[1] || newMatch?.[2];
    const slugFromUrl = newMatch?.[1] || null;

    console.log('🎫 [RedemptionPage] Path:', location.pathname, 'Token:', token, 'Slug:', slugFromUrl);

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ClaimData | null>(null);
    const [error, setError] = useState<string | null>(null);



    useEffect(() => {
        if (!token) {
            console.error('🎫 [RedemptionPage] No token found in URL');
            setError('Token no válido');
            setLoading(false);
            return;
        }

        const fetchClaim = async () => {
            try {
                const apiUrl = `${API_URL}/api/r/${token}`;
                console.log('🎫 [RedemptionPage] Fetching:', apiUrl);

                const response = await fetch(apiUrl);
                const result = await response.json();

                console.log('🎫 [RedemptionPage] Response:', result);

                if (!result.success) {
                    setError(result.message || 'Oferta no encontrada');
                    return;
                }

                setData(result);


            } catch (err) {
                console.error('Error fetching claim:', err);
                setError('Error de conexión');
            } finally {
                setLoading(false);
            }
        };

        fetchClaim();
    }, [token]);

    // Format date for display
    const formatDate = (isoDate: string) => {
        const date = new Date(isoDate);
        return date.toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    // Calculate days remaining
    const getDaysRemaining = (expiresAt: string) => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(0, diff);
    };

    if (loading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="100vh"
                bgcolor="#121212"
            >
                <CircularProgress sx={{ color: '#FFD700' }} />
            </Box>
        );
    }

    if (error || !data) {
        return (
            <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                minHeight="100vh"
                bgcolor="#121212"
                color="white"
                p={3}
                textAlign="center"
            >
                <Cancel sx={{ fontSize: 80, color: '#ff5252', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                    Oferta no encontrada
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    {error || 'El enlace no es válido o ha expirado.'}
                </Typography>
            </Box>
        );
    }

    const { claim, campaign, reward, restaurant } = data;
    const daysRemaining = getDaysRemaining(claim.expires_at);
    const isExpired = claim.status === 'expired' || daysRemaining <= 0;
    const isRedeemed = claim.status === 'redeemed';
    const isValid = claim.is_valid && !isExpired && !isRedeemed;

    const displayTitle = reward?.name || campaign.title || campaign.name;
    const displayDescription = reward?.description || campaign.description;
    const displayImage = reward?.image_url || campaign.image_url;

    return (
        <Box
            minHeight="100vh"
            bgcolor="#121212"
            color="white"
            display="flex"
            flexDirection="column"
            alignItems="center"
            p={2}
            pt={4}
        >
            {/* Restaurant Header */}
            <Box display="flex" alignItems="center" mb={3}>
                {restaurant.logo_url && (
                    <Box
                        component="img"
                        src={restaurant.logo_url}
                        alt={restaurant.name}
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            mr: 2,
                            objectFit: 'cover'
                        }}
                    />
                )}
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {restaurant.name}
                </Typography>
            </Box>

            {/* Status Banner */}
            <Chip
                icon={isValid ? <CheckCircle /> : isRedeemed ? <CheckCircle /> : <Cancel />}
                label={
                    isValid ? 'OFERTA VÁLIDA' :
                        isRedeemed ? 'YA CANJEADA' :
                            'EXPIRADA'
                }
                color={isValid ? 'success' : isRedeemed ? 'warning' : 'error'}
                sx={{ mb: 3, fontWeight: 'bold', fontSize: '0.9rem' }}
            />

            {/* Main Card */}
            <Paper
                elevation={8}
                sx={{
                    bgcolor: '#1E1E1E',
                    borderRadius: 4,
                    overflow: 'hidden',
                    maxWidth: 400,
                    width: '100%'
                }}
            >
                {/* Image */}
                {displayImage ? (
                    <Box
                        component="img"
                        src={displayImage}
                        alt={displayTitle}
                        sx={{
                            width: '100%',
                            height: 180,
                            objectFit: 'cover'
                        }}
                    />
                ) : (
                    <Box
                        sx={{
                            height: 120,
                            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <CardGiftcard sx={{ fontSize: 60, color: 'rgba(0,0,0,0.3)' }} />
                    </Box>
                )}

                {/* Content */}
                <Box p={3}>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, fontFamily: 'Fraunces' }}>
                        {displayTitle}
                    </Typography>

                    {displayDescription && (
                        <Typography variant="body2" sx={{ opacity: 0.7, mb: 2, whiteSpace: 'pre-line' }}>
                            {displayDescription}
                        </Typography>
                    )}

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 2 }} />

                    {/* Validity Info */}
                    <Box display="flex" alignItems="center" mb={2}>
                        <AccessTime sx={{ fontSize: 20, mr: 1, color: isExpired ? '#ff5252' : '#4caf50' }} />
                        <Box>
                            <Typography variant="caption" sx={{ opacity: 0.5, display: 'block' }}>
                                Válido hasta
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {formatDate(claim.expires_at)}
                                {isValid && ` (${daysRemaining} días restantes)`}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Validation Code & QR */}
                    {isValid && (
                        <>
                            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 2 }} />

                            <Typography variant="caption" sx={{ opacity: 0.5, display: 'block', mb: 1, textAlign: 'center' }}>
                                Muestra este código al personal
                            </Typography>

                            <Box
                                sx={{
                                    bgcolor: 'rgba(255,215,0,0.1)',
                                    border: '2px dashed #FFD700',
                                    borderRadius: 2,
                                    p: 2,
                                    textAlign: 'center'
                                }}
                            >
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontFamily: 'monospace',
                                        fontWeight: 'bold',
                                        color: '#FFD700',
                                        letterSpacing: 4
                                    }}
                                >
                                    {claim.validation_code}
                                </Typography>
                            </Box>
                        </>
                    )}

                    {isRedeemed && (
                        <Box sx={{ textAlign: 'center', mt: 2 }}>
                            <CheckCircle sx={{ fontSize: 48, color: '#ffa726', mb: 1 }} />
                            <Typography variant="body2" sx={{ color: '#ffa726' }}>
                                Esta oferta ya ha sido canjeada
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* Menu Navigation Button */}
            {restaurant.slug && (
                <Box
                    component="a"
                    href={`https://menu.visualtastes.com/${restaurant.slug}`}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        mt: 3,
                        py: 1.5,
                        px: 4,
                        bgcolor: 'rgba(255,255,255,0.1)',
                        borderRadius: 3,
                        color: 'white',
                        textDecoration: 'none',
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        transition: 'all 0.2s',
                        '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.15)',
                            transform: 'translateY(-2px)'
                        }
                    }}
                >
                    🍽️ Ver menú de {restaurant.name}
                </Box>
            )}

            {/* Footer */}
            <Box mt={4} textAlign="center">
                <Typography variant="caption" sx={{ opacity: 0.3 }}>
                    Powered by VisualTaste
                </Typography>
            </Box>
        </Box>
    );
};

export default RedemptionPage;

