// apps/admin/src/components/analytics/PWAInsights.tsx
import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress, Stack } from '@mui/material';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';

interface Props {
    pwaData?: {
        installed: number;
        total: number;
        rate: number;
    };
}

export default function PWAInsights({ pwaData }: Props) {
    if (!pwaData || pwaData.total === 0) {
        return (
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        PWA Instalaciones
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Sin datos de instalación de PWA aún
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    const installRate = (pwaData.rate * 100).toFixed(1);

    return (
        <Card>
            <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <InstallMobileIcon color="primary" />
                    <Typography variant="h6">
                        PWA Instalaciones
                    </Typography>
                </Stack>

                <Box sx={{ mb: 3 }}>
                    <Typography variant="h3" component="div" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {pwaData.installed}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        de {pwaData.total} visitantes
                    </Typography>
                </Box>

                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Tasa de instalación
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={parseFloat(installRate)}
                        sx={{ height: 8, borderRadius: 4, mb: 1 }}
                        color={parseFloat(installRate) > 20 ? 'success' : 'primary'}
                    />
                    <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main' }}>
                        {installRate}%
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
}
