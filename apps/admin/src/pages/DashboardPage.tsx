// apps/admin/src/pages/DashboardPage.tsx

import { useState } from 'react';
import {
    Container,
    Grid,
    Box,
    Typography,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Fade,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    AccessTime as AccessTimeIcon,
    TrendingUp as TrendingUpIcon,
    People as PeopleIcon,
    RestaurantMenu as RestaurantMenuIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardData } from '../hooks/useDashboardData';
import { KPICard } from '../components/dashboard/KPICard';
import { AlertsSection } from '../components/dashboard/AlertsSection';
import { DishPerformanceTable } from '../components/dashboard/DishPerformanceTable';
import { QRTrafficChart } from '../components/dashboard/QRTrafficChart';
import { SmartRecommendations } from '../components/dashboard/SmartRecommendations';
import type { DashboardPeriod } from '../types/dashboard';
import { formatDuration } from '../lib/utils/dashboardHelpers';

export default function DashboardPage() {
    const { currentRestaurant } = useAuth();
    const [period, setPeriod] = useState<DashboardPeriod>('7d');

    const {
        summary,
        topDishes,
        qrStats,
        alerts,
        recommendations,
        isLoading
    } = useDashboardData(currentRestaurant?.id, period);

    const handleRefresh = () => {
        window.location.reload(); // Simple reload for now, or we could expose refetch from hook
    };

    if (!currentRestaurant) {
        return (
            <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="h5">Selecciona un restaurante para ver el panel.</Typography>
            </Container>
        );
    }

    return (
        <Fade in timeout={500}>
            <Container maxWidth="xl" sx={{ py: 4 }}>
                {/* Header Section */}
                <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'stretch', sm: 'center' },
                    mb: 4,
                    gap: 2
                }}>
                    <Box>
                        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
                            Buenos días
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Aquí tienes el resumen de {currentRestaurant.name}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Período</InputLabel>
                            <Select
                                value={period}
                                label="Período"
                                onChange={(e) => setPeriod(e.target.value as DashboardPeriod)}
                            >
                                <MenuItem value="1d">Hoy</MenuItem>
                                <MenuItem value="7d">Últimos 7 días</MenuItem>
                                <MenuItem value="30d">Últimos 30 días</MenuItem>
                            </Select>
                        </FormControl>
                        <Tooltip title="Actualizar datos">
                            <IconButton onClick={handleRefresh} sx={{ bgcolor: 'action.hover' }}>
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                <Grid container spacing={3}>
                    {/* Left Column: KPIs and Main Content */}
                    <Grid item xs={12} lg={8}>
                        {/* KPIs Row */}
                        <Grid container spacing={3} sx={{ mb: 4 }}>
                            <Grid item xs={12} sm={4}>
                                <KPICard
                                    title="Vistas Totales"
                                    value={summary?.today.views || 0}
                                    change={summary?.change.views}
                                    trend={summary?.change.views ? (summary.change.views > 0 ? 'up' : 'down') : 'neutral'}
                                    icon={<TrendingUpIcon />}
                                    loading={isLoading}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <KPICard
                                    title="Sesiones"
                                    value={summary?.today.sessions || 0}
                                    change={summary?.change.sessions}
                                    trend={summary?.change.sessions ? (summary.change.sessions > 0 ? 'up' : 'down') : 'neutral'}
                                    icon={<PeopleIcon />}
                                    loading={isLoading}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <KPICard
                                    title="Tiempo Promedio"
                                    value={formatDuration(summary?.today.avgDuration || 0)}
                                    change={summary?.change.avgDuration}
                                    trend={summary?.change.avgDuration ? (summary.change.avgDuration > 0 ? 'up' : 'down') : 'neutral'}
                                    icon={<AccessTimeIcon />}
                                    loading={isLoading}
                                />
                            </Grid>
                        </Grid>

                        {/* Smart Recommendation (if any) */}
                        {recommendations && recommendations.length > 0 && (
                            <Box sx={{ mb: 4 }}>
                                <SmartRecommendations recommendations={recommendations} loading={isLoading} />
                            </Box>
                        )}

                        {/* Charts and Tables Row */}
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <DishPerformanceTable data={topDishes} loading={isLoading} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <QRTrafficChart data={qrStats} loading={isLoading} />
                            </Grid>
                        </Grid>
                    </Grid>

                    {/* Right Column: Alerts and Secondary Info */}
                    <Grid item xs={12} lg={4}>
                        <Box sx={{ position: 'sticky', top: 24 }}>
                            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
                                Atención Requerida
                            </Typography>
                            <AlertsSection alerts={alerts} loading={isLoading} />

                            {/* Additional quick stats or info could go here */}
                            <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <RestaurantMenuIcon color="primary" />
                                    <Typography variant="subtitle1" fontWeight={600}>
                                        Estado del Menú
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    Tu menú tiene <strong>{topDishes?.topViewed?.length || 0}</strong> platos activos recibiendo visitas.
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Última actualización: {new Date().toLocaleTimeString()}
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            </Container>
        </Fade>
    );
}
