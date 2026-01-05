// apps/client/src/components/marketing/FloatingLauncher.tsx
// Floating button launcher for Scratch & Win campaigns in the menu

import React, { useState, useEffect } from 'react';
import { Box, Fab, Zoom, Dialog, IconButton, Typography } from '@mui/material';
import { CardGiftcard, Close } from '@mui/icons-material';

interface FloatingLauncherProps {
    campaign: {
        id: string;
        name: string;
        content?: {
            title?: string;
            description?: string;
        };
        settings?: {
            display_mode?: 'fab' | 'timer';
        };
    };
    restaurantSlug?: string;
    onPlay?: () => void;
}

/**
 * FloatingLauncher - Shows a floating button or timed popup for Scratch & Win
 * 
 * display_mode:
 * - 'fab': Always visible floating action button
 * - 'timer': Appears after 2 minutes of viewing the menu
 */
export const FloatingLauncher: React.FC<FloatingLauncherProps> = ({
    campaign,
    restaurantSlug,
    onPlay
}) => {
    const [visible, setVisible] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const displayMode = campaign.settings?.display_mode || 'fab';

    useEffect(() => {
        // Check if user has already played today
        const playedKey = `scratch_played_${campaign.id}`;
        const playedToday = localStorage.getItem(playedKey);
        const today = new Date().toDateString();

        if (playedToday === today) {
            return; // Don't show if already played today
        }

        if (displayMode === 'fab') {
            // Show immediately with slight delay for animation
            const timer = setTimeout(() => setVisible(true), 1500);
            return () => clearTimeout(timer);
        } else if (displayMode === 'timer') {
            // Show after 2 minutes
            const timer = setTimeout(() => {
                setVisible(true);
                setDialogOpen(true); // Auto-open dialog for timer mode
            }, 2 * 60 * 1000);
            return () => clearTimeout(timer);
        }
    }, [campaign.id, displayMode]);

    const handlePlay = () => {
        // Save that user clicked to play
        localStorage.setItem(`scratch_played_${campaign.id}`, new Date().toDateString());

        // Navigate to loyalty page
        const loyaltyUrl = `/${restaurantSlug}/loyalty/${campaign.id}`;
        window.location.href = loyaltyUrl;

        onPlay?.();
    };

    const handleClose = () => {
        setDialogOpen(false);
        // Don't hide FAB, just close dialog
    };

    if (!visible) return null;

    return (
        <>
            {/* Floating Action Button */}
            <Zoom in={visible && !dialogOpen}>
                <Fab
                    onClick={() => setDialogOpen(true)}
                    sx={{
                        position: 'fixed',
                        bottom: 90,
                        right: 16,
                        zIndex: 1000,
                        background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                        color: '#1a1a2e',
                        boxShadow: '0 4px 20px rgba(255,215,0,0.4)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #FFE44D 0%, #FFB733 100%)',
                        },
                        animation: 'pulse-glow 2s ease-in-out infinite'
                    }}
                >
                    <CardGiftcard />
                </Fab>
            </Zoom>

            {/* Promo Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={handleClose}
                PaperProps={{
                    sx: {
                        bgcolor: '#1a1a2e',
                        borderRadius: 4,
                        maxWidth: 340,
                        overflow: 'hidden'
                    }
                }}
            >
                <IconButton
                    onClick={handleClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: 'rgba(255,255,255,0.5)',
                        zIndex: 1
                    }}
                >
                    <Close />
                </IconButton>

                <Box
                    sx={{
                        background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                        p: 4,
                        textAlign: 'center'
                    }}
                >
                    <Typography sx={{ fontSize: 64 }}>🎁</Typography>
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 700,
                            color: '#1a1a2e',
                            fontFamily: '"SF Pro Display", system-ui'
                        }}
                    >
                        {campaign.content?.title || '¡Rasca y Gana!'}
                    </Typography>
                </Box>

                <Box sx={{ p: 3, textAlign: 'center', color: 'white' }}>
                    <Typography variant="body2" sx={{ opacity: 0.8, mb: 3 }}>
                        {campaign.content?.description || 'Prueba tu suerte y gana premios exclusivos'}
                    </Typography>

                    <Box
                        component="button"
                        onClick={handlePlay}
                        sx={{
                            width: '100%',
                            py: 2,
                            px: 4,
                            border: 'none',
                            borderRadius: 3,
                            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                            color: '#1a1a2e',
                            fontSize: 16,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': {
                                transform: 'scale(1.02)',
                                boxShadow: '0 6px 20px rgba(255,215,0,0.4)'
                            },
                            '&:active': {
                                transform: 'scale(0.98)'
                            }
                        }}
                    >
                        🎰 ¡Jugar Ahora!
                    </Box>

                    <Typography
                        variant="caption"
                        sx={{
                            display: 'block',
                            mt: 2,
                            opacity: 0.5
                        }}
                    >
                        Un intento por día
                    </Typography>
                </Box>
            </Dialog>

            {/* Pulse animation */}
            <style>{`
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 4px 20px rgba(255,215,0,0.4); }
                    50% { box-shadow: 0 4px 30px rgba(255,215,0,0.7); }
                }
            `}</style>
        </>
    );
};

export default FloatingLauncher;
