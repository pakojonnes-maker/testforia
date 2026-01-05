// apps/client/src/components/marketing/EventBanner.tsx
// Banner component to display upcoming events in the menu

import React from 'react';
import { Box, Typography } from '@mui/material';
import { Event as EventIcon, ArrowForward } from '@mui/icons-material';

interface EventCampaign {
    id: string;
    name: string;
    content?: {
        title?: string;
        description?: string;
        image_url?: string;
        location?: string;
    };
    start_date?: string;
    end_date?: string;
}

interface EventBannerProps {
    events: EventCampaign[];
    restaurantSlug?: string;
}

/**
 * EventBanner - Displays upcoming events as an elegant banner in the menu
 */
export const EventBanner: React.FC<EventBannerProps> = ({
    events,
    restaurantSlug
}) => {
    if (!events || events.length === 0) return null;

    // Show first event (most recent/priority)
    const event = events[0];
    const content = event.content || {};

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
    };

    const handleClick = () => {
        window.location.href = `/${restaurantSlug}/evento/${event.id}`;
    };

    return (
        <Box
            onClick={handleClick}
            sx={{
                mx: 2,
                my: 2,
                borderRadius: 3,
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
                background: content.image_url
                    ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url(${content.image_url})`
                    : 'linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transition: 'transform 0.2s',
                '&:hover': {
                    transform: 'scale(1.02)'
                }
            }}
        >
            <Box sx={{ p: 2.5, color: 'white' }}>
                {/* Event Badge */}
                <Box
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        bgcolor: 'rgba(255,255,255,0.15)',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 2,
                        mb: 1.5,
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    <EventIcon sx={{ fontSize: 14 }} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        PRÓXIMO EVENTO
                    </Typography>
                </Box>

                {/* Title */}
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 700,
                        lineHeight: 1.2,
                        mb: 0.5,
                        fontFamily: '"SF Pro Display", system-ui'
                    }}
                >
                    {content.title || event.name}
                </Typography>

                {/* Date & Location */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, opacity: 0.9 }}>
                    {event.start_date && (
                        <Typography variant="caption">
                            📅 {formatDate(event.start_date)}
                        </Typography>
                    )}
                    {content.location && (
                        <Typography variant="caption">
                            📍 {content.location}
                        </Typography>
                    )}
                </Box>

                {/* CTA */}
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1.5 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                        }}
                    >
                        Ver detalles <ArrowForward sx={{ fontSize: 16 }} />
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default EventBanner;
