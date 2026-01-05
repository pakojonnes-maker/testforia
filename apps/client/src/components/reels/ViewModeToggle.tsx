import React from 'react';
import { Box, IconButton } from '@mui/material';
import { Movie, ViewList } from '@mui/icons-material';
import { motion } from 'framer-motion';

interface ViewModeToggleProps {
    viewMode: 'reels' | 'list';
    onViewModeChange: (mode: 'reels' | 'list') => void;
    colors: {
        secondary: string;
        accent?: string;
    };
    hidden?: boolean; // ✅ Hide when dish content is expanded
}

const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
    viewMode,
    onViewModeChange,
    colors,
    hidden = false
}) => {
    // Use accent color if available, otherwise fallback to secondary
    const activeColor = colors.accent || colors.secondary || '#4ECDC4';

    return (
        <Box
            sx={{
                position: 'absolute',
                top: 80, // Aligned below header (matches SocialMenu)
                right: 16,
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                // ✅ Hide when dish content is expanded
                opacity: hidden ? 0 : 1,
                visibility: hidden ? 'hidden' : 'visible',
                pointerEvents: hidden ? 'none' : 'auto',
                transition: 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out'
            }}
        >
            <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        bgcolor: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 20,
                        p: 0.5,
                        gap: 0.5
                    }}
                >
                    {/* Reel Mode Button */}
                    <IconButton
                        onClick={() => onViewModeChange('reels')}
                        size="small"
                        sx={{
                            width: { xs: 32, sm: 36 },
                            height: { xs: 32, sm: 36 },
                            bgcolor: viewMode === 'reels' ? activeColor : 'transparent',
                            color: viewMode === 'reels' ? '#fff' : 'rgba(255,255,255,0.6)',
                            borderRadius: '50%',
                            transition: 'all 0.3s ease',
                            boxShadow: viewMode === 'reels' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                            '&:hover': {
                                bgcolor: viewMode === 'reels' ? activeColor : 'rgba(255,255,255,0.1)',
                                color: '#fff'
                            }
                        }}
                    >
                        <Movie sx={{ fontSize: { xs: 18, sm: 20 } }} />
                    </IconButton>

                    {/* List Mode Button */}
                    <IconButton
                        onClick={() => onViewModeChange('list')}
                        size="small"
                        sx={{
                            width: { xs: 32, sm: 36 },
                            height: { xs: 32, sm: 36 },
                            bgcolor: viewMode === 'list' ? activeColor : 'transparent',
                            color: viewMode === 'list' ? '#fff' : 'rgba(255,255,255,0.6)',
                            borderRadius: '50%',
                            transition: 'all 0.3s ease',
                            boxShadow: viewMode === 'list' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                            '&:hover': {
                                bgcolor: viewMode === 'list' ? activeColor : 'rgba(255,255,255,0.1)',
                                color: '#fff'
                            }
                        }}
                    >
                        <ViewList sx={{ fontSize: { xs: 18, sm: 20 } }} />
                    </IconButton>
                </Box>
            </motion.div>
        </Box>
    );
};

export default ViewModeToggle;
