
import React from 'react';
import { Box, Typography, Paper, Avatar } from '@mui/material';
import { AccessTime } from '@mui/icons-material';

interface NotificationPreviewProps {
    title: string;
    message: string;
    icon?: string;
    image?: string;
    badge?: string; // Small icon (not used in standard expanded view efficiently but we can show it)
    color?: string; // Accent color
    appName?: string;
}

export const NotificationPreview: React.FC<NotificationPreviewProps> = ({
    title,
    message,
    icon,
    image,
    color = '#2196f3',
    appName = 'Restaurante'
}) => {
    // Android 12+ Style Mockup
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <Box sx={{ width: '100%', maxWidth: 360, margin: '0 auto', fontFamily: 'Roboto, sans-serif' }}>

            {/* Android Status Bar Mock */}
            <Box sx={{
                bgcolor: '#000',
                color: '#fff',
                px: 2,
                py: 0.5,
                fontSize: 12,
                display: 'flex',
                justifyContent: 'space-between',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16
            }}>
                <Box>{currentTime}</Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <AccessTime sx={{ fontSize: 14 }} />
                </Box>
            </Box>

            {/* Notification Shade Background */}
            <Box sx={{
                bgcolor: '#121212', // Dark mode background
                color: '#e0e0e0',
                p: 2,
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
                minHeight: 100
            }}>

                {/* The Notification Card */}
                <Paper sx={{
                    bgcolor: '#2d2d2d',
                    color: '#ffffff',
                    borderRadius: 4,
                    overflow: 'hidden',
                    mb: 1
                }} elevation={0}>

                    {/* Header */}
                    <Box sx={{ p: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {/* Small Icon + Accent Color Circle if needed, or just colorized icon */}
                        {icon ? (
                            <Avatar
                                src={icon}
                                sx={{ width: 24, height: 24, bgcolor: 'transparent' }}
                                imgProps={{ style: { objectFit: 'contain' } }}
                            />
                        ) : (
                            <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: color }} />
                        )}

                        <Typography variant="caption" sx={{ color: color, fontWeight: 500, flex: 1 }}>
                            {appName} • {currentTime}
                        </Typography>

                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                    </Box>

                    {/* Body Content */}
                    <Box sx={{ px: 2, pb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2, mb: 0.5 }}>
                            {title || 'Título de la notificación'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#b0b0b0', lineHeight: 1.3 }}>
                            {message || 'El contenido de la notificación aparecerá aquí. Puede ser de varias líneas.'}
                        </Typography>
                    </Box>

                    {/* Big Picture */}
                    {image && (
                        <Box sx={{
                            width: '100%',
                            height: 160,
                            backgroundImage: `url(${image})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            borderTop: '1px solid #333'
                        }} />
                    )}

                </Paper>

                <Typography variant="caption" sx={{ color: '#666', textAlign: 'center', display: 'block', mt: 2 }}>
                    Vista previa aproximada (Android Dark Mode)
                </Typography>

            </Box>
        </Box>
    );
};
