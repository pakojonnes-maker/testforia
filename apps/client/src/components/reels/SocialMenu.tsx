import React, { useState } from 'react';
import { Box, IconButton, Paper } from '@mui/material';
import { Menu as MenuIcon, Instagram, LocalOffer, WhatsApp, EventAvailable, Star, Close, Notifications, NotificationsActive, TwoWheeler } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useDishTracking } from '../../providers/TrackingAndPushProvider';

interface SocialMenuProps {
    restaurant: any;
    onOpenOffer: () => void;
    reservationsEnabled?: boolean;
    onOpenReservation?: () => void;
    deliveryEnabled?: boolean;
    onOpenDelivery?: () => void;
    previousRating?: number | null;
    hidden?: boolean; // ✅ Hide when dish content is expanded
}
import RatingModal from '../ui/RatingModal';

const SocialMenu: React.FC<SocialMenuProps> = ({ restaurant, onOpenOffer, reservationsEnabled, onOpenReservation, deliveryEnabled, onOpenDelivery, hidden = false }) => {
    console.log('SocialMenu restaurant:', restaurant);
    console.log('SocialMenu instagram:', restaurant?.social_media?.instagram || restaurant?.instagram_url || restaurant?.instagram);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { subscribeToPush, isPushEnabled, isPushSupported } = useDishTracking(); // Hook import

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


    // Rating State
    const [ratingModalOpen, setRatingModalOpen] = useState(false);
    const [currentRating, setCurrentRating] = useState<number | null>(null); // Local state to update immediately

    const handleRatingSubmit = async (rating: number, comment: string) => {
        try {
            const visitorId = localStorage.getItem('visitor_id'); // Assuming this key
            const sessionId = sessionStorage.getItem('session_id'); // Assuming this key or similar

            if (!visitorId) {
                console.warn('No visitor_id found for rating');
                // Could generate one here if needed
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev'}/restaurants/${restaurant.slug}/rating`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rating,
                    comment,
                    visitor_id: visitorId,
                    session_id: sessionId
                })
            });

            if (response.ok) {
                console.log('Rating submitted successfully');
                setCurrentRating(rating);
                // Save to localStorage to avoid asking again if needed, but we wanted to allow re-rate for high scores.
                localStorage.setItem(`rated_${restaurant.id}`, rating.toString());
            }
        } catch (error) {
            console.error('Error submitting rating:', error);
        }
    };

    // Determine effective rating (prop or local)
    const effectiveRating = currentRating || restaurant.userStatus?.previousRating || (localStorage.getItem(`rated_${restaurant?.id}`) ? parseInt(localStorage.getItem(`rated_${restaurant?.id}`)!) : null);

    // Hide star if rated <= 3 (per user request "ya no se volvera a activar")? 
    // User said: "Si es mas de 3 estrellas ... ya no se volvera a activar". Wait.
    // User Request: "Si es mas de 3 estrellas simplemente dara las gracias y ya no se volvera a activar. Si son 4 o 5 entonces te llevara a la pagina de google..."
    // Wait, re-reading: "Si es mas de 3 estrellas simplemente dara las gracias y ya no se volvera a activar." -> Checks usage of "mas de 3". 
    // "mas de 3" usually means > 3 (4, 5).
    // Let's re-read carefully: "Si es mas de 3 estrellas simplemente dara las gracias y ya no se volvera a activar. Si son 4 o 5 entonces te llevara a la pagina de google".
    // This is contradictory. "mas de 3" includes 4 and 5.
    // Maybe they meant "mas de 3 (bad logic) OR menos de 3?".
    // Let's look at the second request: "Permite que pueda volver a calificar si ha puesto 5 o mas, si ha puesto 3 estrellas que no le permita redirigirlos."
    // OK, Current logic:
    // <= 3: Thanks & Done. ("ya no se volvera a activar" -> Hide icon?)
    // >= 4: Google Redirect. Allow Re-rate.

    const shouldShowStar = !effectiveRating || effectiveRating >= 4;

    return (
        <Box
            sx={{
                position: 'absolute',
                top: 80, // Below header
                left: 16,
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                // ✅ Hide when dish content is expanded
                opacity: hidden ? 0 : 1,
                visibility: hidden ? 'hidden' : 'visible',
                pointerEvents: hidden ? 'none' : 'auto',
                transition: 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out'
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
                {isOpen ? <Close /> : <MenuIcon />}
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
                            {/* Delivery */}
                            {deliveryEnabled && onOpenDelivery && (
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        onOpenDelivery();
                                        setIsOpen(false);
                                    }}
                                    sx={{
                                        color: '#fff',
                                        '&:hover': {
                                            transform: 'scale(1.1)',
                                            color: '#6366f1'
                                        }
                                    }}
                                >
                                    <TwoWheeler fontSize="small" />
                                </IconButton>
                            )}

                            {/* Reservations */}
                            {reservationsEnabled && onOpenReservation && (
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        onOpenReservation();
                                        setIsOpen(false);
                                    }}
                                    sx={{
                                        color: '#fff',
                                        '&:hover': {
                                            transform: 'scale(1.1)',
                                            color: '#69F0AE'
                                        }
                                    }}
                                >
                                    <EventAvailable fontSize="small" />
                                </IconButton>
                            )}

                            {/* Rating Star */}
                            {shouldShowStar && (
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        setRatingModalOpen(true);
                                        setIsOpen(false);
                                    }}
                                    sx={{
                                        color: effectiveRating && effectiveRating >= 4 ? '#FFD700' : 'white', // Gold if high rating
                                        '&:hover': {
                                            transform: 'scale(1.1)',
                                            color: '#FFD700'
                                        }
                                    }}
                                >
                                    <Star fontSize="small" />
                                </IconButton>
                            )}

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

                            {/* Notifications Bell */}
                            {isPushSupported && !isPushEnabled && (
                                <IconButton
                                    size="small"
                                    disabled={loading}
                                    onClick={async () => {
                                        setLoading(true);
                                        const result = await subscribeToPush();
                                        setLoading(false);

                                        if (result === 'success') {
                                            alert('✅ Notificaciones activadas correctamente');
                                        } else if (result === 'denied') {
                                            alert('❌ Has bloqueado las notificaciones. Por favor, actívalas en la configuración del navegador.');
                                        } else if (result === 'ios_prompt') {
                                            // The prompt is handled by provider, no alert needed or maybe a hint
                                        } else if (result === 'error') {
                                            alert('❌ Error al activar las notificaciones. Inténtalo de nuevo.');
                                        }
                                    }}
                                    sx={{
                                        color: 'white',
                                        '&:hover': {
                                            color: '#FF4081',
                                            transform: 'scale(1.1)'
                                        },
                                        opacity: loading ? 0.5 : 1
                                    }}
                                >
                                    <Notifications fontSize="small" />
                                </IconButton>
                            )}
                            {isPushEnabled && (
                                <IconButton
                                    size="small"
                                    onClick={() => alert('✅ Las notificaciones están activadas. ¡Gracias!')}
                                    sx={{
                                        color: '#FFD700', // Gold to show it's active/premium
                                        '&:hover': {
                                            transform: 'scale(1.1)'
                                        }
                                    }}
                                >
                                    <NotificationsActive fontSize="small" />
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

            <RatingModal
                open={ratingModalOpen}
                onClose={() => setRatingModalOpen(false)}
                onSubmit={handleRatingSubmit}
                googleReviewUrl={restaurant?.google_review_url || restaurant?.details?.google_review_url}
                previousRating={effectiveRating}
            />
        </Box>
    );
};

export default SocialMenu;
