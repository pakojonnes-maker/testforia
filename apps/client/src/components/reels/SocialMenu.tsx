import React, { useState } from 'react';
import { IconButton, Box, Snackbar, Alert as MuiAlert } from '@mui/material';
import { Instagram, Star, EventAvailable, TwoWheeler, WhatsApp, Notifications, NotificationsActive, LocalOffer } from '@mui/icons-material';
import { useDishTracking } from '../../providers/TrackingAndPushProvider';
import RatingModal from '../ui/RatingModal';
interface SocialMenuProps {
    restaurant: any;
    onOpenOffer: () => void;
    hasCampaign?: boolean;
    reservationsEnabled?: boolean;
    onOpenReservation?: () => void;
    deliveryEnabled?: boolean;
    onOpenDelivery?: () => void;
    previousRating?: number | null;
}

const SocialMenu: React.FC<SocialMenuProps> = ({ restaurant, onOpenOffer, hasCampaign = false, reservationsEnabled, onOpenReservation, deliveryEnabled, onOpenDelivery }) => {

    // Removed isOpen state since we're rendering icons inline
    const [loading, setLoading] = useState(false);
    const { subscribeToPush, isPushEnabled, isPushSupported } = useDishTracking(); // Hook import
    // ✅ Local snackbar for push notification feedback (replaces alert())
    const [pushSnackbar, setPushSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({ open: false, message: '', severity: 'info' });

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
            // ✅ FIX: Use correct key 'vt_visitor_id' and parse JSON {value, expiry}
            let visitorId: string | null = null;
            try {
                const raw = localStorage.getItem('vt_visitor_id');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed.value && (!parsed.expiry || Date.now() <= parsed.expiry)) {
                        visitorId = parsed.value;
                    }
                }
            } catch { /* ignore parse errors */ }
            const sessionId = sessionStorage.getItem('session_id');

            if (!visitorId) {

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
        <>
            {/* Delivery */}
            {deliveryEnabled && onOpenDelivery && (
                <IconButton
                    onClick={onOpenDelivery}
                    sx={{
                        width: 40,
                        height: 40,
                        bgcolor: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: { xs: 'none', md: '0 2px 8px rgba(0,0,0,0.4)' },
                        color: '#fff',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            bgcolor: 'rgba(0,0,0,0.5)',
                            transform: 'scale(1.05)',
                            color: '#6366f1'
                        }
                    }}
                >
                    <TwoWheeler sx={{ fontSize: 20 }} />
                </IconButton>
            )}

            {/* Reservations */}
            {reservationsEnabled && onOpenReservation && (
                <IconButton
                    onClick={onOpenReservation}
                    sx={{
                        width: 40,
                        height: 40,
                        bgcolor: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: { xs: 'none', md: '0 2px 8px rgba(0,0,0,0.4)' },
                        color: '#fff',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            bgcolor: 'rgba(0,0,0,0.5)',
                            transform: 'scale(1.05)',
                            color: '#69F0AE'
                        }
                    }}
                >
                    <EventAvailable sx={{ fontSize: 20 }} />
                </IconButton>
            )}

            {/* Rating Star */}
            {shouldShowStar && (
                <IconButton
                    onClick={() => setRatingModalOpen(true)}
                    sx={{
                        width: 40,
                        height: 40,
                        bgcolor: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: { xs: 'none', md: '0 2px 8px rgba(0,0,0,0.4)' },
                        color: effectiveRating && effectiveRating >= 4 ? '#FFD700' : 'white',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            bgcolor: 'rgba(0,0,0,0.5)',
                            transform: 'scale(1.05)',
                            color: '#FFD700'
                        }
                    }}
                >
                    <Star sx={{ fontSize: 20 }} />
                </IconButton>
            )}

            {/* Instagram */}
            {getInstagramUrl() && (
                <IconButton
                    onClick={handleInstagramClick}
                    sx={{
                        width: 40,
                        height: 40,
                        bgcolor: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: { xs: 'none', md: '0 2px 8px rgba(0,0,0,0.4)' },
                        color: 'white',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            bgcolor: 'rgba(0,0,0,0.5)',
                            transform: 'scale(1.05)'
                        }
                    }}
                >
                    <Box sx={{
                        display: 'flex',
                        background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        <Instagram sx={{ fontSize: 20, color: 'inherit' }} />
                    </Box>
                </IconButton>
            )}

            {/* Notifications Bell */}
            {isPushSupported && !isPushEnabled && (
                <IconButton
                    disabled={loading}
                    onClick={async () => {
                        setLoading(true);
                        const result = await subscribeToPush();
                        setLoading(false);
                        if (result === 'success') {
                            setPushSnackbar({ open: true, message: '🔔 ¡Notificaciones activadas!', severity: 'success' });
                        } else if (result === 'denied') {
                            setPushSnackbar({ open: true, message: 'Notificaciones bloqueadas. Actívalas en configuración.', severity: 'warning' });
                        }
                    }}
                    sx={{
                        width: 40,
                        height: 40,
                        bgcolor: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: { xs: 'none', md: '0 2px 8px rgba(0,0,0,0.4)' },
                        color: 'white',
                        opacity: loading ? 0.5 : 1,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            bgcolor: 'rgba(0,0,0,0.5)',
                            transform: 'scale(1.05)',
                            color: '#FF4081'
                        }
                    }}
                >
                    <Notifications sx={{ fontSize: 20 }} />
                </IconButton>
            )}
            
            {isPushEnabled && (
                <IconButton
                    onClick={() => setPushSnackbar({ open: true, message: '✅ Las notificaciones ya están activadas.', severity: 'info' })}
                    sx={{
                        width: 40,
                        height: 40,
                        bgcolor: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: { xs: 'none', md: '0 2px 8px rgba(0,0,0,0.4)' },
                        color: '#FFD700',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            bgcolor: 'rgba(0,0,0,0.5)',
                            transform: 'scale(1.05)'
                        }
                    }}
                >
                    <NotificationsActive sx={{ fontSize: 20 }} />
                </IconButton>
            )}

            {/* Offer */}
            {hasCampaign && (
                <IconButton
                    onClick={() => onOpenOffer()}
                    sx={{
                        width: 40,
                        height: 40,
                        bgcolor: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: { xs: 'none', md: '0 2px 8px rgba(0,0,0,0.4)' },
                        color: '#FFD700',
                        animation: 'offer-pulse 2s ease-in-out infinite',
                        '@keyframes offer-pulse': {
                            '0%, 100%': { transform: 'scale(1)' },
                            '50%': { transform: 'scale(1.15)' }
                        },
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            bgcolor: 'rgba(0,0,0,0.5)',
                            transform: 'scale(1.05)'
                        }
                    }}
                >
                    <LocalOffer sx={{ fontSize: 20 }} />
                </IconButton>
            )}

            {/* WhatsApp */}
            {getWhatsAppNumber() && (
                <IconButton 
                    onClick={handleWhatsAppClick}
                    sx={{
                        width: 40,
                        height: 40,
                        bgcolor: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: { xs: 'none', md: '0 2px 8px rgba(0,0,0,0.4)' },
                        color: '#25D366',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            bgcolor: 'rgba(0,0,0,0.5)',
                            transform: 'scale(1.05)'
                        }
                    }}
                >
                    <WhatsApp sx={{ fontSize: 20 }} />
                </IconButton>
            )}

            <RatingModal
                open={ratingModalOpen}
                onClose={() => setRatingModalOpen(false)}
                onSubmit={handleRatingSubmit}
                googleReviewUrl={restaurant?.google_review_url || restaurant?.details?.google_review_url}
                previousRating={effectiveRating}
            />

            {/* ✅ Snackbar for push notification feedback */}
            <Snackbar
                open={pushSnackbar.open}
                autoHideDuration={4000}
                onClose={() => setPushSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <MuiAlert
                    elevation={6}
                    variant="filled"
                    severity={pushSnackbar.severity}
                    onClose={() => setPushSnackbar(prev => ({ ...prev, open: false }))}
                    sx={{ width: '100%', borderRadius: 3 }}
                >
                    {pushSnackbar.message}
                </MuiAlert>
            </Snackbar>
        </>
    );
};

export default SocialMenu;
