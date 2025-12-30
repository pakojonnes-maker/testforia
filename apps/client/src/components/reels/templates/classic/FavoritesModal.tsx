import React from 'react';
import { Box, Typography, IconButton, Drawer, List, ListItem, ListItemText, ListItemAvatar, Avatar } from '@mui/material';
import { Close } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface FavoritesModalProps {
    open: boolean;
    onClose: () => void;
    favoriteDishes: any[];
    onDishClick: (dish: any) => void;
    config: any;
    currentLanguage: string;
}

const FavoritesModal: React.FC<FavoritesModalProps> = ({
    open,
    onClose,
    favoriteDishes,
    onDishClick,
    config,
    currentLanguage
}) => {
    // Branding colors
    const branding = config?.restaurant?.branding || {};
    const colors = {
        primary: branding.primary_color || '#FF6B6B',
        secondary: branding.secondary_color || '#4ECDC4',
        text: branding.text_color || '#FFFFFF',
        background: branding.background_color || '#000000'
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: '100%',
                    maxWidth: '400px', // Mobile friendly max width
                    bgcolor: '#1a1a1a', // Dark background
                    color: '#fff',
                    borderLeft: `1px solid ${colors.secondary}`
                }
            }}
        >
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <Typography variant="h6" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 700, color: colors.secondary }}>
                    Mis Favoritos ({favoriteDishes.length})
                </Typography>
                <IconButton onClick={onClose} sx={{ color: '#fff' }}>
                    <Close />
                </IconButton>
            </Box>

            <Box sx={{ overflowY: 'auto', height: '100%', p: 2 }}>
                {favoriteDishes.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50%', opacity: 0.6 }}>
                        <Typography variant="body1" sx={{ textAlign: 'center', mb: 2 }}>
                            Aún no tienes favoritos.
                        </Typography>
                        <Typography variant="body2" sx={{ textAlign: 'center' }}>
                            ¡Dale corazón a los platos que más te gusten!
                        </Typography>
                    </Box>
                ) : (
                    <List>
                        <AnimatePresence>
                            {favoriteDishes.map((dish) => (
                                <motion.div
                                    key={dish.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ListItem
                                        alignItems="flex-start"
                                        button
                                        onClick={() => {
                                            onDishClick(dish);
                                            onClose();
                                        }}
                                        sx={{
                                            mb: 2,
                                            bgcolor: 'rgba(255,255,255,0.05)',
                                            borderRadius: 2,
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Avatar
                                                variant="rounded"
                                                src={dish.media?.[0]?.url || dish.image}
                                                sx={{ width: 60, height: 60, mr: 2 }}
                                            />
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff' }}>
                                                    {dish.translations?.name?.[currentLanguage] || dish.name}
                                                </Typography>
                                            }
                                            secondary={
                                                <Typography variant="body2" sx={{ color: colors.primary, fontWeight: 600 }}>
                                                    €{dish.price?.toFixed(2)}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </List>
                )}
            </Box>
        </Drawer>
    );
};

export default FavoritesModal;
