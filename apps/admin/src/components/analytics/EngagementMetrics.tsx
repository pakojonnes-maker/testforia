// apps/admin/src/components/analytics/EngagementMetrics.tsx
import React from 'react';
import { Card, CardContent, Typography, Grid, Box, LinearProgress } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import StarIcon from '@mui/icons-material/Star';
import ShareIcon from '@mui/icons-material/Share';

interface Props {
    summary: {
        dishViews: number;
        favorites: number;
        ratings: number;
        shares: number;
    };
    detailed?: boolean;
}

export default function EngagementMetrics({ summary, detailed = false }: Props) {
    const { dishViews, favorites, ratings, shares } = summary;

    const favoriteRate = dishViews > 0 ? (favorites / dishViews) * 100 : 0;
    const ratingRate = dishViews > 0 ? (ratings / dishViews) * 100 : 0;
    const shareRate = dishViews > 0 ? (shares / dishViews) * 100 : 0;

    const metrics = [
        {
            icon: <FavoriteIcon sx={{ color: 'error.main' }} />,
            label: 'Favoritos',
            value: favorites,
            rate: favoriteRate,
            color: 'error' as const,
        },
        {
            icon: <StarIcon sx={{ color: 'warning.main' }} />,
            label: 'Valoraciones',
            value: ratings,
            rate: ratingRate,
            color: 'warning' as const,
        },
        {
            icon: <ShareIcon sx={{ color: 'info.main' }} />,
            label: 'Compartidos',
            value: shares,
            rate: shareRate,
            color: 'info' as const,
        },
    ];

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Métricas de Engagement
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Basado en {(dishViews || 0).toLocaleString()} vistas de platos
                </Typography>

                <Grid container spacing={3}>
                    {metrics.map((metric, idx) => (
                        <Grid item xs={12} key={idx}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                {metric.icon}
                                <Typography variant="body2" sx={{ flex: 1 }}>
                                    {metric.label}
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    {(metric?.value || 0).toLocaleString()}
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={Math.min(metric.rate, 100)}
                                color={metric.color}
                                sx={{ height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                {metric.rate.toFixed(2)}% de las vistas
                            </Typography>
                        </Grid>
                    ))}
                </Grid>
            </CardContent>
        </Card>
    );
}
