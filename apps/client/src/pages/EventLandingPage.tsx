// apps/client/src/pages/EventLandingPage.tsx
// Event Campaign Landing Page - Shows event details and direct WhatsApp share

import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    Paper,
    Button,
    Chip,
    Divider,
    TextField,
    Alert
} from '@mui/material';
import {
    Event as EventIcon,
    Place as PlaceIcon,
    AccessTime,
    WhatsApp as WhatsAppIcon,
    CheckCircle as CheckIcon
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { API_URL } from '../lib/apiClient';

interface EventData {
    campaign: {
        id: string;
        name: string;
        type: string;
        is_active: boolean;
        content: {
            title?: string;
            description?: string;
            image_url?: string;
            location?: string;
        };
        start_date?: string;
        end_date?: string;
    };
    restaurant: {
        id: string;
        name: string;
        slug: string;
        logo_url?: string;
    };
}

export const EventLandingPage: React.FC = () => {
    const location = useLocation();

    // Extract from URL: /{slug}/evento/{campaignId}
    const match = location.pathname.match(/^\/([^/]+)\/evento\/([^/]+)$/);
    const campaignId = match?.[2];

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<EventData | null>(null);
    const [error, setError] = useState<string | null>(null);

    // RSVP state
    const [rsvpContact, setRsvpContact] = useState('');
    const [rsvpLoading, setRsvpLoading] = useState(false);
    const [rsvpSuccess, setRsvpSuccess] = useState(false);
    const [rsvpError, setRsvpError] = useState<string | null>(null);

    useEffect(() => {
        if (!campaignId) {
            setError('Evento no encontrado');
            setLoading(false);
            return;
        }

        const fetchEvent = async () => {
            try {
                const response = await fetch(`${API_URL}/api/campaigns/${campaignId}`);
                const result = await response.json();

                if (!result.success || !result.campaign) {
                    setError('Evento no encontrado');
                    return;
                }

                setData(result);

            } catch (err) {
                console.error('Error fetching event:', err);
                setError('Error de conexión');
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();
    }, [campaignId]);

    const handleRsvp = async () => {
        if (!rsvpContact || !data) return;

        // Validate contact format
        const phoneRegex = /^\+?[0-9]{9,15}$/;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const cleanContact = rsvpContact.replace(/\s/g, '');

        const isPhone = phoneRegex.test(cleanContact);
        const isEmail = emailRegex.test(rsvpContact);

        if (!isPhone && !isEmail) {
            setRsvpError('Introduce un teléfono válido (+34612345678) o email');
            return;
        }

        setRsvpLoading(true);
        setRsvpError(null);

        try {
            const visitorId = localStorage.getItem('vt_visitor_id');
            const response = await fetch(`${API_URL}/api/leads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurant_id: data.restaurant.id,
                    campaign_id: data.campaign.id,
                    type: isEmail ? 'email' : 'phone',
                    contact_value: isEmail ? rsvpContact : cleanContact,
                    source: 'event_rsvp',
                    consent_given: true,
                    visitor_id: visitorId,
                    metadata: { event_name: data.campaign.content?.title || data.campaign.name }
                })
            });

            const result = await response.json();
            if (result.success) {
                setRsvpSuccess(true);
            } else {
                setRsvpError(result.message || 'Error al registrar');
            }
        } catch (err) {
            setRsvpError('Error de conexión');
        } finally {
            setRsvpLoading(false);
        }
    };

    const formatDate = (isoDate: string) => {
        const date = new Date(isoDate);
        return date.toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="#121212">
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
                <EventIcon sx={{ fontSize: 80, color: '#666', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                    Evento no encontrado
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    {error || 'El enlace no es válido.'}
                </Typography>
            </Box>
        );
    }

    const { campaign, restaurant } = data;
    const content = campaign.content || {};

    return (
        <Box
            minHeight="100vh"
            bgcolor="#121212"
            color="white"
        >
            {/* Hero Image */}
            {content.image_url ? (
                <Box
                    component="img"
                    src={content.image_url}
                    alt={campaign.name}
                    sx={{
                        width: '100%',
                        height: 250,
                        objectFit: 'cover'
                    }}
                />
            ) : (
                <Box
                    sx={{
                        height: 200,
                        background: 'linear-gradient(135deg, #9c27b0 0%, #673ab7 50%, #3f51b5 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <EventIcon sx={{ fontSize: 80, color: 'rgba(255,255,255,0.3)' }} />
                </Box>
            )}

            {/* Content */}
            <Box p={3} sx={{ mt: -4, position: 'relative' }}>
                {/* Restaurant Card */}
                <Paper
                    sx={{
                        bgcolor: '#1E1E1E',
                        borderRadius: 3,
                        p: 3,
                        mb: 3
                    }}
                >
                    {/* Restaurant Header */}
                    <Box display="flex" alignItems="center" mb={2}>
                        {restaurant.logo_url && (
                            <Box
                                component="img"
                                src={restaurant.logo_url}
                                alt={restaurant.name}
                                sx={{
                                    width: 50,
                                    height: 50,
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

                    <Chip
                        label="EVENTO ACTIVO"
                        color="secondary"
                        size="small"
                        sx={{ mb: 2, fontWeight: 'bold' }}
                    />

                    {/* Event Title */}
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, fontFamily: 'Fraunces' }}>
                        {content.title || campaign.name}
                    </Typography>

                    {/* Description */}
                    {content.description && (
                        <Typography variant="body1" sx={{ opacity: 0.8, mb: 3, whiteSpace: 'pre-line' }}>
                            {content.description}
                        </Typography>
                    )}

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 2 }} />

                    {/* Event Details */}
                    <Box display="flex" flexDirection="column" gap={1.5}>
                        {(campaign.start_date || campaign.end_date) && (
                            <Box display="flex" alignItems="center" gap={1}>
                                <AccessTime sx={{ color: 'secondary.main' }} />
                                <Typography variant="body2">
                                    {campaign.start_date && formatDate(campaign.start_date)}
                                    {campaign.end_date && ` - ${formatDate(campaign.end_date)}`}
                                </Typography>
                            </Box>
                        )}
                        {content.location && (
                            <Box display="flex" alignItems="center" gap={1}>
                                <PlaceIcon sx={{ color: 'secondary.main' }} />
                                <Typography variant="body2">{content.location}</Typography>
                            </Box>
                        )}
                    </Box>
                </Paper>

                {/* RSVP Section - Lead Capture */}
                <Paper sx={{ bgcolor: '#1E1E1E', borderRadius: 3, p: 3, mb: 2 }}>
                    {rsvpSuccess ? (
                        <Box textAlign="center">
                            <CheckIcon sx={{ fontSize: 50, color: '#4CAF50', mb: 1 }} />
                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                                ¡Registrado! 🎉
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.7, mt: 1 }}>
                                Te avisaremos antes del evento
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, textAlign: 'center' }}>
                                🎟️ ¿Te interesa asistir?
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.7, mb: 2, textAlign: 'center' }}>
                                Déjanos tu contacto y te recordaremos el evento
                            </Typography>

                            <TextField
                                fullWidth
                                placeholder="Tu email o WhatsApp"
                                value={rsvpContact}
                                onChange={(e) => setRsvpContact(e.target.value)}
                                sx={{
                                    mb: 2,
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: 'rgba(255,255,255,0.05)',
                                        color: 'white',
                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }
                                    }
                                }}
                            />

                            {rsvpError && <Alert severity="error" sx={{ mb: 2 }}>{rsvpError}</Alert>}

                            <Button
                                fullWidth
                                variant="contained"
                                onClick={handleRsvp}
                                disabled={rsvpLoading || !rsvpContact}
                                sx={{
                                    bgcolor: '#9c27b0',
                                    py: 1.5,
                                    fontWeight: 'bold',
                                    '&:hover': { bgcolor: '#7b1fa2' }
                                }}
                            >
                                {rsvpLoading ? <CircularProgress size={24} /> : '¡Me apunto! 🎉'}
                            </Button>
                        </>
                    )}
                </Paper>

                {/* Share Section - Direct WhatsApp share, no phone capture needed */}
                <Paper sx={{ bgcolor: '#1E1E1E', borderRadius: 3, p: 3, textAlign: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                        📱 Comparte este evento
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.7, mb: 3 }}>
                        Guárdalo en WhatsApp para no olvidarlo
                    </Typography>

                    <Button
                        component="a"
                        href={(() => {
                            const eventDate = campaign.start_date
                                ? new Date(campaign.start_date).toLocaleDateString()
                                : '';
                            const message = encodeURIComponent(
                                `🎉 *${content.title || campaign.name}*\n\n` +
                                `📍 ${restaurant.name}\n` +
                                `${content.description || ''}\n\n` +
                                (eventDate ? `📅 ${eventDate}\n` : '') +
                                (content.location ? `📌 ${content.location}\n` : '') +
                                `\n🔗 Ver menú: https://menu.visualtastes.com/${restaurant.slug}`
                            );
                            return `https://wa.me/?text=${message}`;
                        })()}
                        target="_blank"
                        fullWidth
                        variant="contained"
                        startIcon={<WhatsAppIcon />}
                        sx={{
                            bgcolor: '#25D366',
                            py: 1.5,
                            fontWeight: 'bold',
                            '&:hover': { bgcolor: '#1DA851' }
                        }}
                    >
                        Guardar en WhatsApp
                    </Button>
                </Paper>


                {/* Menu Link */}
                <Box mt={3} textAlign="center">
                    <Button
                        component="a"
                        href={`https://menu.visualtastes.com/${restaurant.slug}`}
                        sx={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                        🍽️ Ver menú de {restaurant.name}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default EventLandingPage;
