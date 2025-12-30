import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Button,
    Dialog,
    Slide,
    DialogContent,

} from '@mui/material';
import { Close, Add, Remove, Favorite, FavoriteBorder } from '@mui/icons-material';
import type { TransitionProps } from '@mui/material/transitions';

import { useTranslation } from '../../../../contexts/TranslationContext';

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement<any, any>;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

interface DishDetailModalProps {
    dish: any;
    isOpen: boolean;
    onClose: () => void;
    currentLanguage: string;
    colors: any;
    onAddToCart: (dish: any, quantity: number, portion?: 'full' | 'half', price?: number) => void;
}

const DishDetailModal: React.FC<DishDetailModalProps> = ({
    dish,
    isOpen,
    onClose,
    currentLanguage,
    colors,
    onAddToCart
}) => {
    const { t } = useTranslation();
    const [selectedPortion, setSelectedPortion] = useState<'full' | 'half'>('full');
    const [quantity, setQuantity] = useState(1);
    const [isFavorite, setIsFavorite] = useState(false);

    // Reset states when dish changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setQuantity(1);
            setSelectedPortion('full');
            // Here you would typically check if dish is favored from a store/context
            setIsFavorite(false);
        }
    }, [isOpen, dish?.id]);

    if (!dish) return null;

    const dishName = dish.translations?.name?.[currentLanguage] || dish.name || t('dish_untitled', 'Plato');
    const description = dish.translations?.description?.[currentLanguage] || dish.description || '';
    const media = dish.media?.[0];
    const imageUrl = media?.thumbnail_url || media?.url;

    const currentPrice = selectedPortion === 'half' ? (dish.half_price || 0) : (dish.price || 0);

    const handleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsFavorite(!isFavorite);
    };

    const handleAdd = () => {
        const currentPrice = selectedPortion === 'half' && dish.half_price ? dish.half_price : dish.price;
        onAddToCart(dish, quantity, selectedPortion, currentPrice);
        onClose();
    };

    return (
        <Dialog
            open={isOpen}
            TransitionComponent={Transition as any}
            keepMounted
            onClose={onClose}
            fullScreen
            PaperProps={{
                sx: {
                    bgcolor: '#000',
                    backgroundImage: 'none'
                }
            }}
        >
            {/* Close Button */}
            <IconButton
                onClick={onClose}
                sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    zIndex: 10,
                    color: '#fff',
                    bgcolor: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                }}
            >
                <Close />
            </IconButton>

            {/* Hero Image */}
            <Box sx={{ height: '40vh', position: 'relative', width: '100%' }}>
                {imageUrl ? (
                    <Box
                        component="img"
                        src={imageUrl}
                        alt={dishName}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <Box sx={{ width: '100%', height: '100%', bgcolor: '#222' }} />
                )}
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '50%',
                        background: 'linear-gradient(to top, #000 0%, transparent 100%)'
                    }}
                />
            </Box>

            <DialogContent sx={{ px: 3, pb: 4, pt: 1, position: 'relative', mt: '-20px' }}>
                {/* Header: Name and Price */}
                <Box sx={{ mb: 3 }}>
                    <Typography
                        variant="h4"
                        sx={{
                            color: colors.text,
                            fontFamily: '"Fraunces", serif',
                            fontWeight: 700,
                            fontSize: '2rem',
                            lineHeight: 1.1,
                            mb: 1
                        }}
                    >
                        {dishName}
                    </Typography>
                    <Typography
                        variant="h5"
                        sx={{
                            color: colors.primary,
                            fontFamily: '"Fraunces", serif',
                            fontWeight: 700,
                            fontSize: '1.5rem'
                        }}
                    >
                        €{currentPrice.toFixed(2)}
                    </Typography>
                </Box>

                {/* Description */}
                <Typography
                    sx={{
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '1rem',
                        lineHeight: 1.6,
                        mb: 4,
                        fontFamily: '"Inter", sans-serif'
                    }}
                >
                    {description}
                </Typography>

                {/* Portion Selector */}
                {dish.has_half_portion && (
                    <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
                        <Button
                            onClick={() => setSelectedPortion('full')}
                            variant={selectedPortion === 'full' ? 'contained' : 'outlined'}
                            sx={{
                                flex: 1,
                                bgcolor: selectedPortion === 'full' ? colors.primary : 'transparent',
                                color: selectedPortion === 'full' ? '#fff' : colors.text,
                                borderColor: selectedPortion === 'full' ? colors.primary : 'rgba(255,255,255,0.3)',
                                borderRadius: 2,
                                py: 1.5,
                                textTransform: 'none',
                                fontWeight: 600,
                                fontFamily: '"Fraunces", serif',
                                '&:hover': {
                                    bgcolor: selectedPortion === 'full' ? colors.primary : 'rgba(255,255,255,0.1)',
                                    borderColor: selectedPortion === 'full' ? colors.primary : '#fff'
                                }
                            }}
                        >
                            Ración Completa
                            <Typography component="span" sx={{ display: 'block', fontSize: '0.8rem', opacity: 0.8, mt: 0.5 }}>
                                €{(dish.price || 0).toFixed(2)}
                            </Typography>
                        </Button>
                        <Button
                            onClick={() => setSelectedPortion('half')}
                            variant={selectedPortion === 'half' ? 'contained' : 'outlined'}
                            sx={{
                                flex: 1,
                                bgcolor: selectedPortion === 'half' ? colors.primary : 'transparent',
                                color: selectedPortion === 'half' ? '#fff' : colors.text,
                                borderColor: selectedPortion === 'half' ? colors.primary : 'rgba(255,255,255,0.3)',
                                borderRadius: 2,
                                py: 1.5,
                                textTransform: 'none',
                                fontWeight: 600,
                                fontFamily: '"Fraunces", serif',
                                '&:hover': {
                                    bgcolor: selectedPortion === 'half' ? colors.primary : 'rgba(255,255,255,0.1)',
                                    borderColor: selectedPortion === 'half' ? colors.primary : '#fff'
                                }
                            }}
                        >
                            Media Ración
                            <Typography component="span" sx={{ display: 'block', fontSize: '0.8rem', opacity: 0.8, mt: 0.5 }}>
                                €{(dish.half_price || 0).toFixed(2)}
                            </Typography>
                        </Button>
                    </Box>
                )}

                {/* Allergens would go here if data structure is matched */}

                {/* Actions Footer */}
                <Box
                    sx={{
                        position: 'fixed', // Sticky footer inside modal
                        bottom: 0,
                        left: 0,
                        right: 0,
                        p: 3,
                        bgcolor: 'rgba(0,0,0,0.9)',
                        backdropFilter: 'blur(20px)',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                    }}
                >
                    {/* Favorite Button */}
                    <IconButton
                        onClick={handleFavorite}
                        sx={{
                            bgcolor: 'rgba(255,255,255,0.1)',
                            color: isFavorite ? colors.primary : '#fff',
                            width: 50,
                            height: 50,
                            borderRadius: '50%',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                        }}
                    >
                        {isFavorite ? <Favorite /> : <FavoriteBorder />}
                    </IconButton>

                    {/* Quantity & Add */}
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            borderRadius: 20,
                            height: 50,
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 1,
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        <IconButton
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            sx={{ color: '#fff' }}
                        >
                            <Remove />
                        </IconButton>
                        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>{quantity}</Typography>
                        <IconButton
                            onClick={() => setQuantity(quantity + 1)}
                            sx={{ color: '#fff' }}
                        >
                            <Add />
                        </IconButton>
                    </Box>

                    <Button
                        variant="contained"
                        onClick={handleAdd}
                        sx={{
                            bgcolor: colors.accent || colors.secondary,
                            color: '#fff',
                            height: 50,
                            borderRadius: 20,
                            px: 4,
                            fontWeight: 700,
                            fontSize: '1rem',
                            textTransform: 'none',
                            fontFamily: '"Fraunces", serif',
                            boxShadow: `0 4px 20px ${colors.accent || colors.secondary}60`,
                            '&:hover': { bgcolor: colors.accent || colors.secondary, opacity: 0.9 }
                        }}
                    >
                        Agregar
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default DishDetailModal;
