// apps/admin/src/pages/AnalyticsPage.tsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
  Button,
  ButtonGroup,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItem,
  ListItemText,
  Alert,
  Skeleton,
} from '@mui/material';

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/apiClient';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

// Interfaces
interface AnalyticsData {
  summary: {
    totalViews: number;
    uniqueVisitors: number;
    totalSessions: number;
    avgSessionDuration: number;
    dishViews: number;
    favorites: number;
    ratings: number;
    shares: number;
  };
  timeseries: Array<{
    date: string;
    totalViews: number;
    uniqueVisitors: number;
    totalSessions: number;
  }>;
  topDishes: Array<{
    dishId: string;
    name: string;
    views: number;
    favorites: number;
    ratings: number;
    avgRating: number;
  }>;
  topSections: Array<{
    sectionId: string;
    name: string;
    views: number;
    dishViews: number;
  }>;
  breakdowns: {
    devices: Array<{ key: string; count: number }>;
    browsers: Array<{ key: string; count: number }>;
    languages: Array<{ key: string; count: number }>;
    countries: Array<{ key: string; count: number }>;
    pwa: { installed: number; total: number; rate: number };
  };
  trafficByHour: Array<{ hour: string; sessions: number }>;
}

// Theme colors
const COLORS = {
  primary: '#1976d2',
  success: '#2e7d32',
  warning: '#ed6c02',
  error: '#d32f2f',
  info: '#0288d1',
};

const CHART_COLORS = [
  '#1976d2', '#42a5f5', '#90caf9', '#bbdefb', '#e3f2fd',
  '#2e7d32', '#4caf50', '#81c784', '#a5d6a7', '#c8e6c9'
];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const restaurantId = user?.currentRestaurant?.id;
  
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'quarter'>('week');
  const [selectedMetric, setSelectedMetric] = useState<'views' | 'visitors' | 'sessions'>('views');

  // Query para obtener analytics
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['analytics', restaurantId, timeRange],
  queryFn: async () => {
    if (!restaurantId) throw new Error('No restaurant selected');
    
    // ✅ AHORA SIGUE EL MISMO PATRÓN que DashboardPage y SectionsPage
    return await apiClient.getAnalytics(restaurantId, {
      timeRange,
      top: 10,
      lang: 'es',
    });
  },
  enabled: !!restaurantId,
  staleTime: 5 * 60 * 1000,
});

  // Cálculos derivados
  const insights = useMemo(() => {
    if (!data) return null;
    
    const summary = data.summary || {};
    const topDishes = data.topDishes || [];
    const timeseries = data.timeseries || [];

    const currentPeriodDays = timeRange === 'today' ? 1 : 
                             timeRange === 'week' ? 7 : 
                             timeRange === 'month' ? 30 : 90;
    
    const totalViews = summary.totalViews || 0;
    const avgSessionDuration = (summary.avgSessionDuration || 0) / 60;
    const avgViewsPerDay = totalViews / currentPeriodDays;

    const starDishes = topDishes.filter(d => 
      d && d.views > avgViewsPerDay && (d.favorites || 0) > 0
    );
    
    const strugglingDishes = topDishes.filter(d => 
      d && d.views > 0 && (d.favorites || 0) === 0 && d.views < avgViewsPerDay / 2
    );

    let trend = 'stable';
    if (timeseries.length >= 6) {
      const recentViews = timeseries.slice(-3).reduce((sum, day) => 
        sum + (day?.totalViews || 0), 0
      );
      const earlierViews = timeseries.slice(0, 3).reduce((sum, day) => 
        sum + (day?.totalViews || 0), 0
      );
      trend = recentViews > earlierViews ? 'up' : earlierViews > recentViews ? 'down' : 'stable';
    }

    return {
      avgViewsPerDay: Math.round(avgViewsPerDay),
      avgSessionDuration: Math.round(avgSessionDuration * 10) / 10,
      conversionRate: totalViews > 0 ? 
        Math.round(((summary.favorites || 0) / totalViews) * 100 * 10) / 10 : 0,
      starDishes,
      strugglingDishes,
      trend: trend as 'up' | 'down' | 'stable',
      engagementRate: (summary.dishViews || 0) > 0 ? 
        Math.round((((summary.favorites || 0) + (summary.shares || 0)) / summary.dishViews) * 100 * 10) / 10 : 0,
    };
  }, [data, timeRange]);

  // Preparar datos para gráficos
  const chartData = useMemo(() => {
    if (!data) return null;

    const timeseries = data.timeseries || [];
    const trafficByHour = data.trafficByHour || [];
    const devices = (data.breakdowns?.devices || []).slice(0, 5);

    const timeseriesData = {
      labels: timeseries.length > 0 ? 
        timeseries.map(d => 
          new Date(d.date).toLocaleDateString('es-ES', { 
            weekday: 'short', 
            day: 'numeric',
            month: 'short' 
          })
        ) : ['Sin datos'],
      datasets: [
        {
          label: selectedMetric === 'views' ? 'Visitas' : selectedMetric === 'visitors' ? 'Visitantes' : 'Sesiones',
          data: timeseries.length > 0 ? 
            timeseries.map(d => 
              selectedMetric === 'views' ? (d.totalViews || 0) : 
              selectedMetric === 'visitors' ? (d.uniqueVisitors || 0) : 
              (d.totalSessions || 0)
            ) : [0],
          fill: true,
          backgroundColor: `${COLORS.primary}20`,
          borderColor: COLORS.primary,
          borderWidth: 2,
          pointBackgroundColor: COLORS.primary,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
        },
      ],
    };

    const hourlyData = {
      labels: trafficByHour.length > 0 ? 
        trafficByHour.map(h => `${h.hour}:00`) : ['00:00'],
      datasets: [
        {
          label: 'Sesiones',
          data: trafficByHour.length > 0 ? 
            trafficByHour.map(h => h.sessions || 0) : [0],
          backgroundColor: COLORS.primary,
          borderColor: COLORS.primary,
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };

    const devicesData = {
      labels: devices.length > 0 ? 
        devices.map(d => d.key?.charAt(0).toUpperCase() + d.key?.slice(1) || 'Desconocido') :
        ['Sin datos'],
      datasets: [
        {
          data: devices.length > 0 ? 
            devices.map(d => d.count || 0) : [1],
          backgroundColor: CHART_COLORS.slice(0, Math.max(devices.length, 1)),
          borderWidth: 2,
          borderColor: '#fff',
          hoverBorderWidth: 3,
        },
      ],
    };

    return {
      timeseries: timeseriesData,
      hourly: hourlyData,
      devices: devicesData,
    };
  }, [data, selectedMetric]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#666',
        },
      },
      y: {
        grid: {
          color: '#f0f0f0',
        },
        ticks: {
          color: '#666',
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((context.parsed / total) * 100);
            return `${context.label}: ${percentage}%`;
          },
        },
      },
    },
    cutout: '60%',
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 2 }} />
        <Skeleton variant="text" width={500} height={24} sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          {[...Array(4)].map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 1 }} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 3, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6">Error al cargar analytics</Typography>
          <Typography>No se pudieron obtener los datos de analytics. Verifica tu conexión e inténtalo de nuevo.</Typography>
        </Alert>
        <Button variant="contained" onClick={() => refetch()}>
          Reintentar
        </Button>
      </Container>
    );
  }

  if (!data) {
    return (
      <Container maxWidth="xl" sx={{ py: 3, textAlign: 'center' }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="h6">Sin datos suficientes</Typography>
          <Typography>Aún no hay suficientes datos para mostrar analytics detallados. Los datos aparecerán una vez que los clientes empiecen a interactuar con tu menú.</Typography>
        </Alert>
      </Container>
    );
  }

  const safeInsights = insights || {
    avgViewsPerDay: 0,
    avgSessionDuration: 0,
    conversionRate: 0,
    starDishes: [],
    strugglingDishes: [],
    trend: 'stable' as const,
    engagementRate: 0,
  };

  const safeChartData = chartData || {
    timeseries: {
      labels: ['Sin datos'],
      datasets: [{ label: 'Sin datos', data: [0], backgroundColor: COLORS.primary }]
    },
    hourly: {
      labels: ['Sin datos'],
      datasets: [{ label: 'Sin datos', data: [0], backgroundColor: COLORS.primary }]
    },
    devices: {
      labels: ['Sin datos'],
      datasets: [{ data: [1], backgroundColor: [COLORS.primary] }]
    }
  };

  const safeData = {
    summary: {
      totalViews: 0,
      uniqueVisitors: 0,
      totalSessions: 0,
      avgSessionDuration: 0,
      dishViews: 0,
      favorites: 0,
      ratings: 0,
      shares: 0,
      ...data.summary
    },
    timeseries: data.timeseries || [],
    topDishes: data.topDishes || [],
    topSections: data.topSections || [],
    breakdowns: {
      devices: [],
      browsers: [],
      languages: [],
      countries: [],
      pwa: { installed: 0, total: 0, rate: 0 },
      ...data.breakdowns
    },
    trafficByHour: data.trafficByHour || [],
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Analytics del Restaurante
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Insights sobre el rendimiento de tu menú digital y comportamiento de clientes
        </Typography>
        
        {/* Time Range Selector */}
        <ButtonGroup variant="outlined" size="small">
          {[
            { key: 'today', label: 'Hoy' },
            { key: 'week', label: '7 días' },
            { key: 'month', label: '30 días' },
            { key: 'quarter', label: '3 meses' },
          ].map(option => (
            <Button
              key={option.key}
              variant={timeRange === option.key ? 'contained' : 'outlined'}
              onClick={() => setTimeRange(option.key as any)}
            >
              {option.label}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      {/* KPIs Principales */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h4" component="div" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {safeData.summary.totalViews.toLocaleString()}
              </Typography>
              <Typography variant="h6" color="text.primary" gutterBottom>
                Visitas Totales
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {safeInsights.avgViewsPerDay}/día promedio
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h4" component="div" sx={{ fontWeight: 600, color: 'info.main' }}>
                {safeData.summary.uniqueVisitors.toLocaleString()}
              </Typography>
              <Typography variant="h6" color="text.primary" gutterBottom>
                Visitantes Únicos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {safeData.summary.totalSessions > 0 ? Math.round((safeData.summary.uniqueVisitors / safeData.summary.totalSessions) * 100) : 0}% nuevos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h4" component="div" sx={{ fontWeight: 600, color: 'success.main' }}>
                {safeInsights.avgSessionDuration}min
              </Typography>
              <Typography variant="h6" color="text.primary" gutterBottom>
                Tiempo Promedio
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {safeData.summary.totalSessions} sesiones
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h4" component="div" sx={{ fontWeight: 600, color: 'error.main' }}>
                {safeInsights.engagementRate}%
              </Typography>
              <Typography variant="h6" color="text.primary" gutterBottom>
                Tasa de Engagement
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {safeData.summary.favorites} favoritos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Insights y Alertas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Insights Clave
            </Typography>
            <Stack spacing={2}>
              {safeInsights.trend === 'up' && (
                <Alert severity="success">
                  <strong>Tendencia positiva:</strong> Las visitas han aumentado en los últimos días
                </Alert>
              )}
              
              {safeInsights.conversionRate > 5 && (
                <Alert severity="success">
                  <strong>Buena conversión:</strong> {safeInsights.conversionRate}% de visitantes añaden favoritos
                </Alert>
              )}
              
              {safeInsights.avgSessionDuration > 2 && (
                <Alert severity="info">
                  <strong>Alto engagement:</strong> Los usuarios pasan {safeInsights.avgSessionDuration} minutos promedio
                </Alert>
              )}
              
              {safeInsights.strugglingDishes.length > 0 && (
                <Alert severity="warning">
                  <strong>Oportunidad:</strong> {safeInsights.strugglingDishes.length} platos necesitan más atención
                </Alert>
              )}

              {safeData.summary.totalViews === 0 && (
                <Alert severity="info">
                  <strong>Datos iniciales:</strong> Los analytics aparecerán cuando los clientes empiecen a usar el menú
                </Alert>
              )}
            </Stack>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recomendaciones
            </Typography>
            <List dense>
              {safeInsights.starDishes.length > 0 && (
                <ListItem>
                  <ListItemText 
                    primary={`Promociona tus platos estrella: ${safeInsights.starDishes.slice(0, 2).map(d => d.name).join(', ')}`}
                    secondary="Estos platos tienen alta visualización y engagement"
                  />
                </ListItem>
              )}
              
              {safeData.breakdowns.devices.find(d => d.key === 'mobile')?.count > safeData.summary.totalSessions * 0.7 && (
                <ListItem>
                  <ListItemText 
                    primary="Optimiza para móvil"
                    secondary="El 70%+ de tus visitantes usan dispositivos móviles"
                  />
                </ListItem>
              )}
              
              {safeInsights.strugglingDishes.length > 0 && (
                <ListItem>
                  <ListItemText 
                    primary="Mejora platos con bajo engagement"
                    secondary={`Considera actualizar fotos o descripciones de ${safeInsights.strugglingDishes.length} platos`}
                  />
                </ListItem>
              )}

              {safeData.summary.totalViews === 0 && (
                <>
                  <ListItem>
                    <ListItemText 
                      primary="Comparte tu menú digital"
                      secondary="Invita a tus clientes a ver el menú escaneando el código QR"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Promociona en redes sociales"
                      secondary="Comparte el enlace de tu menú en Instagram, Facebook, etc."
                    />
                  </ListItem>
                </>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Gráfico de Tendencias */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Evolución Temporal</Typography>
              <ButtonGroup size="small">
                {[
                  { key: 'views', label: 'Visitas' },
                  { key: 'visitors', label: 'Visitantes' },
                  { key: 'sessions', label: 'Sesiones' },
                ].map(metric => (
                  <Button
                    key={metric.key}
                    variant={selectedMetric === metric.key ? 'contained' : 'outlined'}
                    onClick={() => setSelectedMetric(metric.key as any)}
                  >
                    {metric.label}
                  </Button>
                ))}
              </ButtonGroup>
            </Box>
            
            <Box sx={{ width: '100%', height: 300 }}>
              <Line data={safeChartData.timeseries} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Platos y Rendimiento */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Rendimiento por Platos</Typography>
            {safeData.topDishes.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Plato</TableCell>
                      <TableCell align="right">Visitas</TableCell>
                      <TableCell align="right">Favoritos</TableCell>
                      <TableCell align="right">Rating</TableCell>
                      <TableCell align="right">Engagement</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {safeData.topDishes.slice(0, 8).map((dish, index) => {
                      const engagement = dish.views > 0 ? ((dish.favorites + dish.ratings) / dish.views) * 100 : 0;
                      return (
                        <TableRow key={dish.dishId || index}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {dish.name || 'Plato sin nombre'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={500}>
                              {dish.views?.toLocaleString() || 0}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {dish.favorites || 0}
                          </TableCell>
                          <TableCell align="right">
                            {(dish.avgRating || 0) > 0 ? dish.avgRating.toFixed(1) : '-'}
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(engagement, 100)}
                                sx={{ width: 50, height: 4 }}
                                color={engagement > 15 ? 'success' : engagement > 5 ? 'warning' : 'error'}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {engagement.toFixed(1)}%
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  Los platos aparecerán aquí una vez que los clientes empiecen a interactuar con el menú
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Dispositivos</Typography>
            <Box sx={{ height: 250 }}>
              <Doughnut data={safeChartData.devices} options={doughnutOptions} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Tráfico por Hora */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Tráfico por Hora del Día</Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <Bar data={safeChartData.hourly} options={chartOptions} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Usa esta información para programar promociones y contenido en horarios de mayor actividad
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
