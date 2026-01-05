import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, CircularProgress, Alert } from '@mui/material';
import { WhatsApp as WhatsAppIcon, CardGiftcard } from '@mui/icons-material';
import { API_URL } from '../../lib/apiClient';

/**
 * ClaimPrize Component
 * Form to input contact info and claim the reward.
 * Shows WhatsApp save button on success.
 */

interface ClaimPrizeProps {
    sessionId: string;
    rewardId: string;
    rewardName?: string;
    rewardDescription?: string;
    campaignId: string;
    restaurantId: string;
    restaurantName?: string;
    restaurantSlug?: string;
    onClaimSuccess?: (data: any) => void;
}

export const ClaimPrize: React.FC<ClaimPrizeProps> = ({
    sessionId,
    rewardId,
    rewardName,
    rewardDescription,
    campaignId,
    restaurantId,
    restaurantName,
    restaurantSlug,
    onClaimSuccess,
}) => {
    const [contact, setContact] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [claimData, setClaimData] = useState<{
        magic_link?: string;
        expires_at?: string;
    } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate contact format (phone or email)
        const phoneRegex = /^\+?[0-9]{9,15}$/;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const cleanContact = contact.replace(/\s/g, '');

        const isPhone = phoneRegex.test(cleanContact);
        const isEmail = emailRegex.test(contact);

        if (!isPhone && !isEmail) {
            setError('Introduce un teléfono válido (+34612345678) o email');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const visitorId = localStorage.getItem('vt_visitor_id');

            const response = await fetch(`${API_URL}/api/loyalty/claim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    reward_id: rewardId,
                    campaign_id: campaignId,
                    contact: contact,
                    restaurant_id: restaurantId,
                    visitor_id: visitorId
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Error claiming prize');
            }

            setSuccess(true);
            if (data.magic_link) {
                setClaimData({
                    magic_link: data.magic_link,
                    expires_at: data.expires_at
                });
            }

            onClaimSuccess?.(data);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Something went wrong.');
        } finally {
            setIsLoading(false);
        }
    };

    const formatExpiryDate = (isoDate: string) => {
        const date = new Date(isoDate);
        return date.toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const generateWhatsAppUrl = () => {
        if (!claimData?.magic_link) return '';

        const expiryFormatted = claimData.expires_at
            ? formatExpiryDate(claimData.expires_at)
            : '';

        const message = encodeURIComponent(
            `🎁 *${restaurantName || 'Premio'}*\n\n` +
            `🏆 ${rewardName || 'Tu premio'}\n` +
            `${rewardDescription || ''}\n\n` +
            `📅 Válido hasta: ${expiryFormatted}\n` +
            `🔗 Ver premio: ${claimData.magic_link}`
        );

        return `https://wa.me/?text=${message}`;
    };

    if (success) {
        return (
            <Paper sx={{ p: 4, bgcolor: '#1a1a1a', color: 'white', borderRadius: 3, maxWidth: 380, textAlign: 'center' }}>
                <CardGiftcard sx={{ fontSize: 60, color: '#FFD700', mb: 2 }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                    🎉 ¡Premio Reclamado!
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
                    {rewardName || 'Tu premio está listo'}
                </Typography>

                {claimData?.expires_at && (
                    <Typography variant="caption" sx={{ display: 'block', opacity: 0.6, mb: 2 }}>
                        📅 Válido hasta: {formatExpiryDate(claimData.expires_at)}
                    </Typography>
                )}

                {claimData?.magic_link && (
                    <Button
                        component="a"
                        href={generateWhatsAppUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="contained"
                        fullWidth
                        startIcon={<WhatsAppIcon />}
                        sx={{
                            bgcolor: '#25D366',
                            color: 'white',
                            fontWeight: 'bold',
                            py: 1.5,
                            mb: 2,
                            borderRadius: 2,
                            '&:hover': { bgcolor: '#1DA851' }
                        }}
                    >
                        Guardar en WhatsApp
                    </Button>
                )}

                {restaurantSlug && (
                    <Button
                        component="a"
                        href={`https://menu.visualtastes.com/${restaurantSlug}`}
                        sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}
                    >
                        🍽️ Ver menú
                    </Button>
                )}
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 4, bgcolor: '#1a1a1a', color: 'white', borderRadius: 3, maxWidth: 380 }}>
            <Box textAlign="center" mb={3}>
                <CardGiftcard sx={{ fontSize: 50, color: '#FFD700', mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    🎊 ¡Ganaste!
                </Typography>
                {rewardName && (
                    <Typography variant="h6" sx={{ color: '#FFD700', mt: 1 }}>
                        {rewardName}
                    </Typography>
                )}
            </Box>

            <Typography variant="body2" sx={{ opacity: 0.7, textAlign: 'center', mb: 3 }}>
                Ingresa tu WhatsApp para guardar tu premio y recibirlo.
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>
                <TextField
                    fullWidth
                    placeholder="Tu WhatsApp (ej: +34612345678)"
                    value={contact}
                    onChange={e => setContact(e.target.value)}
                    required
                    sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                            bgcolor: 'rgba(255,255,255,0.05)',
                            color: 'white',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }
                        }
                    }}
                />

                <Typography variant="caption" sx={{ display: 'block', opacity: 0.5, textAlign: 'center', mb: 2 }}>
                    Al reclamar, aceptas recibir un enlace para acceder a tu premio.
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={isLoading || !contact}
                    sx={{
                        bgcolor: '#25D366',
                        py: 1.5,
                        fontWeight: 'bold',
                        borderRadius: 2,
                        '&:hover': { bgcolor: '#1DA851' },
                        '&:disabled': { bgcolor: 'rgba(255,255,255,0.1)' }
                    }}
                >
                    {isLoading ? <CircularProgress size={24} /> : '🎁 Reclamar Premio'}
                </Button>
            </Box>
        </Paper>
    );
};

export default ClaimPrize;
