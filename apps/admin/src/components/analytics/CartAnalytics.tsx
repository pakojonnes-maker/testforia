// apps/admin/src/components/analytics/CartAnalytics.tsx
import React from 'react';
import { Card, CardContent, Typography, Grid, Box, LinearProgress, Alert } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

interface Props {
    data: any; // Aquí podrías agregar datos de cart_sessions y cart_daily_metrics
}

export default function CartAnalytics({ data }: Props) {
    // Por ahora placeholder - puedes extender el worker para incluir cart metrics
    return (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <ShoppingCartIcon color="primary" fontSize="large" />
                    <Typography variant="h6">
                        Analytics de Carritos (Próximamente)
                    </Typography>
                </Box>
                <Alert severity="info">
                    Esta sección mostrará métricas de carritos de compra cuando los clientes comiencen a crear pedidos.
                    Incluirá: tasa de conversión, valor promedio del carrito, platos más añadidos, y carritos abandonados.
                </Alert>
            </CardContent>
        </Card>
    );
}
