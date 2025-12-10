import React from 'react';
import { Card, CardContent, Typography, Grid, Box, LinearProgress, Stack } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

interface CartMetrics {
    total_carts_created: number;
    total_carts_shown: number;
    total_carts_abandoned: number;
    avg_conversion_rate: number;
    total_estimated_value: number;
    avg_cart_value: number;
    total_items_added: number;
}

interface Props {
    data: CartMetrics;
}

export default function CartAnalytics({ data }: Props) {
    // Si no hay datos o son 0, mostrar estado vacío elegante
    const isEmpty = !data || data.total_carts_created === 0;

    const conversionRate = (data?.avg_conversion_rate || 0) * 100;
    const abandonedRate = data?.total_carts_created > 0
        ? (data.total_carts_abandoned / data.total_carts_created) * 100
        : 0;

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ShoppingCartIcon color="primary" />
                        <Typography variant="h6">Rendimiento de Ventas (Beta)</Typography>
                    </Box>
                    {!isEmpty && (
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary">Valor Total Estimado</Typography>
                            <Typography variant="h6" color="success.main" fontWeight="bold">
                                {data.total_estimated_value?.toFixed(2)}€
                            </Typography>
                        </Box>
                    )}
                </Box>

                {isEmpty ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary" variant="body2">
                            Aún no hay suficientes datos de carritos para mostrar métricas.
                        </Typography>
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {/* Tasa de Conversión */}
                        <Grid item xs={12}>
                            <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Tasa de Conversión (Pedidos / Carts)</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                    {conversionRate.toFixed(1)}%
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={Math.min(conversionRate, 100)}
                                color="success"
                                sx={{ height: 8, borderRadius: 4 }}
                            />
                        </Grid>

                        {/* Métricas Clave */}
                        <Grid item xs={6}>
                            <Stack spacing={0.5}>
                                <Typography variant="caption" color="text.secondary">Carritos Creados</Typography>
                                <Typography variant="h5">{data.total_carts_created}</Typography>
                            </Stack>
                        </Grid>
                        <Grid item xs={6}>
                            <Stack spacing={0.5}>
                                <Typography variant="caption" color="text.secondary">Ticket Medio</Typography>
                                <Typography variant="h5">{data.avg_cart_value?.toFixed(2)}€</Typography>
                            </Stack>
                        </Grid>
                        <Grid item xs={6}>
                            <Stack spacing={0.5}>
                                <Typography variant="caption" color="text.secondary">Items / Carrito</Typography>
                                <Typography variant="h5">{(data.total_items_added / (data.total_carts_created || 1)).toFixed(1)}</Typography>
                            </Stack>
                        </Grid>
                        <Grid item xs={6}>
                            <Stack spacing={0.5}>
                                <Typography variant="caption" color="text.secondary">Abandonados</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="h5" color="error.main">{data.total_carts_abandoned}</Typography>
                                    <Typography variant="caption" color="error.main">({abandonedRate.toFixed(0)}%)</Typography>
                                </Box>
                            </Stack>
                        </Grid>
                    </Grid>
                )}
            </CardContent>
        </Card>
    );
}
