// apps/admin/src/components/analytics/GeographicInsights.tsx
import React from 'react';
import { Card, CardContent, Typography, Box, Stack, Chip, Divider } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import LocationCityIcon from '@mui/icons-material/LocationCity';

interface Props {
    countries: Array<{ key: string; count: number }>;
    cities: Array<{ key: string; count: number }>;
}

export default function GeographicInsights({ countries, cities }: Props) {
    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Distribución Geográfica
                </Typography>

                <Box sx={{ mb: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                        <PublicIcon color="primary" />
                        <Typography variant="subtitle2" color="text.secondary">
                            Países
                        </Typography>
                    </Stack>
                    {countries.slice(0, 5).map((country) => (
                        <Stack key={country.key} direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Typography variant="body2">{country.key || 'Desconocido'}</Typography>
                            <Chip label={(country?.count || 0).toLocaleString()} size="small" color="primary" />
                        </Stack>
                    ))}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                        <LocationCityIcon color="secondary" />
                        <Typography variant="subtitle2" color="text.secondary">
                            Ciudades
                        </Typography>
                    </Stack>
                    {cities.slice(0, 5).map((city) => (
                        <Stack key={city.key} direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Typography variant="body2">{city.key || 'Desconocido'}</Typography>
                            <Chip label={(city?.count || 0).toLocaleString()} size="small" color="secondary" />
                        </Stack>
                    ))}
                </Box>
            </CardContent>
        </Card>
    );
}
