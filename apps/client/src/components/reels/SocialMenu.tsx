import React, { useState } from 'react';
import { Box, IconButton, Paper } from '@mui/material';
import { Menu as MenuIcon, Instagram, LocalOffer, WhatsApp } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface SocialMenuProps {
    restaurant: any;
    onOpenOffer: () => void;
}

const SocialMenu: React.FC<SocialMenuProps> = ({ restaurant, onOpenOffer }) => {
    console.log('SocialMenu restaurant:', restaurant);
    console.log('SocialMenu instagram:', restaurant?.social_media?.instagram || restaurant?.instagram_url || restaurant?.instagram);
    const [isOpen, setIsOpen] = useState(false);

    const getInstagramUrl = () => {
        if (!restaurant) return null;
        return restaurant.social_media?.instagram ||
            restaurant.instagram_url ||
            restaurant.instagram ||
            restaurant.details?.instagram_url;
    };

    const getWhatsAppNumber = () => {
        if (!restaurant) return null;
        return restaurant.contact?.whatsapp_number ||
            restaurant.whatsapp_number ||
            restaurant.phone ||
            restaurant.details?.whatsapp_number;
    };

    const handleInstagramClick = () => {
        const url = getInstagramUrl();
        if (url) {
            window.open(url, '_blank');
        }
    };

    const handleWhatsAppClick = () => {
        const phone = getWhatsAppNumber();
        if (phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            window.open(`https://wa.me/${cleanPhone}`, '_blank');
        }
    };

    return (
        <Box
            sx={{
                position: 'absolute',
                top: 80, // Below header
                left: 16,
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 1
            }}
        >
            <IconButton
                onClick={() => setIsOpen(!isOpen)}
                sx={{
                    bgcolor: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    backdropFilter: 'blur(4px)',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                }}
            >
                <MenuIcon />
            </IconButton>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: -20, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Paper
                            elevation={4}
                            sx={{
                                display: 'flex',
                                gap: 1,
                                p: 0.5,
                                bgcolor: 'rgba(0,0,0,0.6)',
                                backdropFilter: 'blur(4px)',
                                borderRadius: '24px',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}
                        >
                            {getInstagramUrl() && (
                                <IconButton
                                    size="small"
                                    onClick={handleInstagramClick}
                                    sx={{
                                        color: 'white',
                                        background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        '&:hover': {
                                            transform: 'scale(1.1)'
                                        }
                                    }}
                                >
                                    <Instagram fontSize="small" sx={{ color: 'inherit' }} />
                                </IconButton>
                            )}

                            <IconButton
                                size="small"
                                onClick={() => {
                                    console.log('🔍 [SocialMenu] Offer button clicked');
                                    onOpenOffer();
                                }}
                                sx={{ color: '#FFD700' }}
                            >
                                <LocalOffer fontSize="small" />
                            </IconButton>

                            {getWhatsAppNumber() && (
                                <IconButton size="small" onClick={handleWhatsAppClick} sx={{ color: '#25D366' }}>
                                    <WhatsApp fontSize="small" />
                                </IconButton>
                            )}
                        </Paper>
                    </motion.div>
                )}
            </AnimatePresence>
        </Box>
    );
};

export default SocialMenu;
