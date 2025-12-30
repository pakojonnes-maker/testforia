// apps/admin/src/components/analytics/CartAnalytics.tsx
import React from 'react';
import { Card, CardContent, Typography, Grid, Box, alpha, CircularProgress } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import InventoryIcon from '@mui/icons-material/Inventory';

interface CartMetrics {
    // API returns camelCase
    totalCarts?: number;
    totalItems?: number;
    avgValue?: number;
    totalValue?: number;
    conversionRate?: number;
    cartsShown?: number;
    cartsAbandoned?: number;
    // Also support snake_case fallbacks
    total_carts_created?: number;
    total_items_added?: number;
    avg_cart_value?: number;
    total_estimated_value?: number;
    avg_conversion_rate?: number;
    total_carts_abandoned?: number;
}

interface Props {
    data?: CartMetrics | null;
}

// Circular gauge component
function ConversionGauge({ value }: { value: number }) {
    const safeValue = isNaN(value) ? 0 : value;
    const normalizedValue = Math.min(Math.max(safeValue, 0), 100);
    const color = safeValue >= 10 ? '#22c55e' : safeValue >= 5 ? '#f59e0b' : '#ef4444';

    return (
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress
                variant="determinate"
                value={100}
                size={100}
                thickness={4}
                sx={{ color: alpha(color, 0.15) }}
            />
            <CircularProgress
                variant="determinate"
                value={normalizedValue}
                size={100}
                thickness={4}
                sx={{
                    color: color,
                    position: 'absolute',
                    left: 0,
                    '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round',
                    }
                }}
            />
            <Box
                sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Typography variant="h5" sx={{ fontWeight: 700, color, lineHeight: 1 }}>
                    {safeValue.toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    Conversión
                </Typography>
            </Box>
        </Box>
    );
}

// Stat card component
function StatCard({
    icon: Icon,
    label,
    value,
    subtitle,
    color
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subtitle?: string;
    color: string;
}) {
    return (
        <Box sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: alpha(color, 0.08),
            border: `1px solid ${alpha(color, 0.15)}`,
            height: '100%'
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Icon sx={{ color, fontSize: 18 }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {label}
                </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color, mb: 0.25 }}>
                {value}
            </Typography>
            {subtitle && (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                    {subtitle}
                </Typography>
            )}
        </Box>
    );
}

export default function CartAnalytics({ data }: Props) {
    // Extract values - support BOTH camelCase (from API) and snake_case
    const totalCarts = data?.totalCarts ?? data?.total_carts_created ?? 0;
    const totalItems = data?.totalItems ?? data?.total_items_added ?? 0;
    const avgValue = data?.avgValue ?? data?.avg_cart_value ?? 0;
    const totalValue = data?.totalValue ?? data?.total_estimated_value ?? 0;
    const conversionRate = (data?.conversionRate ?? data?.avg_conversion_rate ?? 0) * 100;
    const cartsAbandoned = data?.cartsAbandoned ?? data?.total_carts_abandoned ?? 0;

    // Check if we have ANY meaningful data
    const hasData = data !== null && data !== undefined;
    const hasAnyValue = totalCarts > 0 || totalItems > 0 || totalValue > 0 || avgValue > 0;
    const isEmpty = !hasData || !hasAnyValue;

    const abandonedRate = totalCarts > 0
        ? (cartsAbandoned / totalCarts) * 100
        : 0;
    const itemsPerCart = totalCarts > 0
        ? (totalItems / totalCarts).toFixed(1)
        : totalItems.toString();

    return (
        <Card sx={{
            height: '100%',
            background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.03) 0%, rgba(34, 197, 94, 0.03) 100%)',
            border: '1px solid rgba(20, 184, 166, 0.1)',
        }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ShoppingCartIcon sx={{ color: '#14b8a6' }} />
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                🛒 Rendimiento de Ventas
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Métricas de carrito y conversión
                            </Typography>
                        </Box>
                    </Box>
                    {!isEmpty && totalValue > 0 && (
                        <Box sx={{
                            textAlign: 'right',
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: alpha('#22c55e', 0.1),
                            border: `1px solid ${alpha('#22c55e', 0.2)}`
                        }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                VALOR ESTIMADO
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#22c55e' }}>
                                €{totalValue.toFixed(0)}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {isEmpty ? (
                    <Box sx={{
                        py: 6,
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2
                    }}>
                        <ShoppingCartIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                        <Typography color="text.secondary" variant="body2">
                            Aún no hay datos de carritos para mostrar.
                        </Typography>
                        <Typography color="text.disabled" variant="caption">
                            Los datos aparecerán cuando los clientes añadan platos al carrito.
                        </Typography>
                    </Box>
                ) : (
                    <Grid container spacing={2}>
                        {/* Conversion gauge - prominent */}
                        <Grid item xs={12} sm={4}>
                            <Box sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                p: 2,
                                borderRadius: 2,
                                bgcolor: alpha('#14b8a6', 0.05),
                                border: `1px solid ${alpha('#14b8a6', 0.1)}`
                            }}>
                                <ConversionGauge value={conversionRate} />
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                                    De carritos creados a pedidos
                                </Typography>
                            </Box>
                        </Grid>

                        {/* Stats grid */}
                        <Grid item xs={12} sm={8}>
                            <Grid container spacing={1.5}>
                                <Grid item xs={6}>
                                    <StatCard
                                        icon={InventoryIcon}
                                        label="Carritos Creados"
                                        value={totalCarts}
                                        color="#6366f1"
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <StatCard
                                        icon={ReceiptLongIcon}
                                        label="Ticket Medio"
                                        value={`€${avgValue.toFixed(2)}`}
                                        color="#14b8a6"
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <StatCard
                                        icon={TrendingUpIcon}
                                        label="Items Añadidos"
                                        value={totalItems}
                                        subtitle={totalCarts > 0 ? `${itemsPerCart} por carrito` : ''}
                                        color="#8b5cf6"
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <StatCard
                                        icon={RemoveShoppingCartIcon}
                                        label="Abandonados"
                                        value={cartsAbandoned}
                                        subtitle={abandonedRate > 0 ? `${abandonedRate.toFixed(0)}% tasa abandono` : 'Sin abandonos'}
                                        color="#ef4444"
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                )}
            </CardContent>
        </Card>
    );
}
