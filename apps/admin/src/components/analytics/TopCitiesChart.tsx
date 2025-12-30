// apps/admin/src/components/analytics/TopCitiesChart.tsx
import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress, alpha, Stack } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PublicIcon from '@mui/icons-material/Public';

interface CityData {
    key: string;
    count: number;
}

interface Props {
    cities: CityData[];
    countries?: CityData[];
}

export default function TopCitiesChart({ cities, countries }: Props) {
    const topCities = cities?.slice(0, 6) || [];
    const totalSessions = topCities.reduce((sum, c) => sum + c.count, 0);

    const getLocationEmoji = (city: string): string => {
        const cityLower = city.toLowerCase();
        if (cityLower.includes('madrid')) return '🏛️';
        if (cityLower.includes('barcelona')) return '⛪';
        if (cityLower.includes('valencia')) return '🍊';
        if (cityLower.includes('sevilla')) return '💃';
        if (cityLower.includes('bilbao')) return '🌉';
        if (cityLower.includes('málaga') || cityLower.includes('malaga')) return '☀️';
        if (cityLower === 'unknown') return '❓';
        return '📍';
    };

    const formatCityName = (city: string): string => {
        if (city === 'unknown' || !city) return 'Ubicación desconocida';
        return city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
    };

    if (topCities.length === 0 || totalSessions === 0) {
        return (
            <Card sx={{
                height: '100%',
                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.03) 0%, rgba(6, 182, 212, 0.03) 100%)',
                border: '1px solid rgba(14, 165, 233, 0.1)',
            }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 280 }}>
                    <PublicIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                    <Typography color="text.secondary">Aún no hay datos de ubicación</Typography>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{
            height: '100%',
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.03) 0%, rgba(6, 182, 212, 0.03) 100%)',
            border: '1px solid rgba(14, 165, 233, 0.1)',
        }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <LocationOnIcon sx={{ color: '#0ea5e9' }} />
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            🌍 Origen de Clientes
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            De dónde vienen tus visitantes
                        </Typography>
                    </Box>
                </Box>

                <Stack spacing={1.5}>
                    {topCities.map((city, index) => {
                        const percentage = (city.count / totalSessions) * 100;

                        return (
                            <Box key={city.key}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography sx={{ fontSize: '1rem' }}>
                                            {getLocationEmoji(city.key)}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight: index === 0 ? 600 : 400,
                                            }}
                                        >
                                            {formatCityName(city.key)}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight: 600,
                                                color: index === 0 ? '#0ea5e9' : 'text.secondary'
                                            }}
                                        >
                                            {percentage.toFixed(1)}%
                                        </Typography>
                                        <Typography variant="caption" color="text.disabled">
                                            ({city.count})
                                        </Typography>
                                    </Box>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={percentage}
                                    sx={{
                                        height: 6,
                                        borderRadius: 3,
                                        bgcolor: alpha('#0ea5e9', 0.1),
                                        '& .MuiLinearProgress-bar': {
                                            borderRadius: 3,
                                            background: index === 0
                                                ? 'linear-gradient(90deg, #0ea5e9, #06b6d4)'
                                                : alpha('#0ea5e9', 0.5 - (index * 0.08))
                                        }
                                    }}
                                />
                            </Box>
                        );
                    })}
                </Stack>

                {/* Quick insight */}
                {topCities[0] && topCities[0].key !== 'unknown' && (
                    <Box sx={{
                        mt: 3,
                        p: 2,
                        borderRadius: 2,
                        bgcolor: alpha('#0ea5e9', 0.08),
                        border: '1px solid',
                        borderColor: alpha('#0ea5e9', 0.15)
                    }}>
                        <Typography variant="caption" color="text.secondary">
                            💡 La mayoría de tus clientes vienen de <strong>{formatCityName(topCities[0].key)}</strong>.
                            Considera hacer campañas locales en esta zona.
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}
