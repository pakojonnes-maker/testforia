// apps/admin/src/components/analytics/EngagementMetrics.tsx
import React from 'react';
import { Card, CardContent, Typography, Grid, Box, LinearProgress, Tooltip } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import StarIcon from '@mui/icons-material/Star';
import ShareIcon from '@mui/icons-material/Share';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HeightIcon from '@mui/icons-material/Height';
import ViewStreamIcon from '@mui/icons-material/ViewStream';

interface Props {
    summary: {
        dishViews: number;
        favorites: number;
        ratings: number;
        shares: number;
        avgDishViewDuration?: number;
        avgSectionTime?: number;
        avgScrollDepth?: number;
    };
    detailed?: boolean;
}

export default function EngagementMetrics({ summary, detailed = false }: Props) {
    const {
        dishViews,
        favorites,
        ratings,
        shares,
        avgDishViewDuration = 0,
        avgSectionTime = 0,
        avgScrollDepth = 0
    } = summary;

    const favoriteRate = dishViews > 0 ? (favorites / dishViews) * 100 : 0;
    const ratingRate = dishViews > 0 ? (ratings / dishViews) * 100 : 0;
    const shareRate = dishViews > 0 ? (shares / dishViews) * 100 : 0;

    // Métricas de conversión (tasas)
    const conversionMetrics = [
        {
            icon: <FavoriteIcon sx={{ color: 'error.main' }} />,
            label: 'Favoritos',
            value: favorites,
            rate: favoriteRate,
            color: 'error' as const,
            suffix: '% conv.',
            type: 'rate'
        },
        {
            icon: <StarIcon sx={{ color: 'warning.main' }} />,
            label: 'Valoraciones',
            value: ratings,
            rate: ratingRate,
            color: 'warning' as const,
            suffix: '% conv.',
            type: 'rate'
        },
        {
            icon: <ShareIcon sx={{ color: 'info.main' }} />,
            label: 'Compartidos',
            value: shares,
            rate: shareRate,
            color: 'info' as const,
            suffix: '% conv.',
            type: 'rate'
        },
    ];

    // Métricas de calidad (tiempos y scroll)
    const qualityMetrics = [
        {
            icon: <AccessTimeIcon sx={{ color: 'primary.main' }} />,
            label: 'Tiempo en Plato',
            value: avgDishViewDuration.toFixed(1),
            subValue: 'segundos',
            progress: Math.min((avgDishViewDuration / 30) * 100, 100), // Base 30s
            color: 'primary' as const,
            type: 'value'
        },
        {
            icon: <ViewStreamIcon sx={{ color: 'secondary.main' }} />,
            label: 'Tiempo en Sección',
            value: avgSectionTime.toFixed(1),
            subValue: 'segundos',
            progress: Math.min((avgSectionTime / 60) * 100, 100), // Base 60s
            color: 'secondary' as const,
            type: 'value'
        },
        {
            icon: <HeightIcon sx={{ color: 'success.main' }} />,
            label: 'Profundidad Scroll',
            value: avgScrollDepth.toFixed(0),
            subValue: '%',
            progress: avgScrollDepth,
            color: 'success' as const,
            type: 'value'
        }
    ];

    const metricsToShow = detailed
        ? [...conversionMetrics, ...qualityMetrics]
        : conversionMetrics;

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Métricas de Engagement
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Basado en {(dishViews || 0).toLocaleString()} vistas de platos
                </Typography>

                <Grid container spacing={3}>
                    {metricsToShow.map((metric, idx) => (
                        <Grid item xs={12} sm={detailed ? 6 : 12} key={idx}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                {metric.icon}
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {metric.label}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                                        </Typography>
                                        {metric.type === 'value' && (
                                            <Typography variant="caption" color="text.secondary">
                                                {metric.subValue}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </Box>

                            <Tooltip title={metric.type === 'rate' ? `${metric.rate.toFixed(1)}% de conversión` : ''}>
                                <LinearProgress
                                    variant="determinate"
                                    value={metric.type === 'rate' ? Math.min(metric.rate * 5, 100) : metric.progress} // Escala visual para tasas bajas
                                    color={metric.color}
                                    sx={{ height: 6, borderRadius: 3, opacity: 0.8 }}
                                />
                            </Tooltip>

                            {metric.type === 'rate' && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                    {metric.rate.toFixed(2)}% conversión
                                </Typography>
                            )}
                        </Grid>
                    ))}
                </Grid>
            </CardContent>
        </Card>
    );
}
