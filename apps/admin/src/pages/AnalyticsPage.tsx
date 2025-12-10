// apps/admin/src/pages/AnalyticsPage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  Stack,
  Divider,
  Alert,
} from '@mui/material';
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
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/apiClient';

// Components
import SummaryKPIs from '../components/analytics/SummaryKPIs';
import TimeSeriesChart from '../components/analytics/TimeSeriesChart';
import DeviceBreakdown from '../components/analytics/DeviceBreakdown';
import HourlyTrafficChart from '../components/analytics/HourlyTrafficChart';
import CartAnalytics from '../components/analytics/CartAnalytics';

// New Tabs
import DishesTab from '../components/analytics/DishesTab';
import SectionsTab from '../components/analytics/SectionsTab';
import SessionsTab from '../components/analytics/SessionsTab';

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

type TimeRange = 'today' | 'week' | 'month' | 'quarter';
type TabValue = 'dishes' | 'kpis' | 'sections' | 'sessions';

export default function AnalyticsPage() {
  const { currentRestaurant } = useAuth();
  const restaurantId = currentRestaurant?.id;

  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [activeTab, setActiveTab] = useState<TabValue>('dishes');

  // Query principal para KPIs y resumen (se mantiene para la tab de KPIs)
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', restaurantId, timeRange],
    queryFn: async () => {
      if (!restaurantId) throw new Error('No restaurant selected');
      return await apiClient.getAnalytics(restaurantId, {
        timeRange,
        top: 20,
        lang: 'es',
      });
    },
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading && !data) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Visión completa del rendimiento de tu negocio
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ bgcolor: 'background.paper', p: 0.5, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          {[
            { key: 'today', label: 'Hoy' },
            { key: 'week', label: '7 días' },
            { key: 'month', label: '30 días' },
            { key: 'quarter', label: '3 meses' },
          ].map(option => (
            <Button
              key={option.key}
              variant={timeRange === option.key ? 'contained' : 'text'}
              color={timeRange === option.key ? 'primary' : 'inherit'}
              onClick={() => setTimeRange(option.key as TimeRange)}
              sx={{
                borderRadius: 2.5,
                px: 3,
                py: 1,
                minWidth: 'auto',
                boxShadow: timeRange === option.key ? '0 2px 8px rgba(0,122,255,0.25)' : 'none',
                bgcolor: timeRange === option.key ? 'primary.main' : 'transparent',
                '&:hover': {
                  bgcolor: timeRange === option.key ? 'primary.dark' : 'rgba(0,0,0,0.04)',
                }
              }}
            >
              {option.label}
            </Button>
          ))}
        </Stack>
      </Box>

      {/* Tabs de Navegación */}
      <Box sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
            '& .MuiTab-root': {
              fontSize: '1rem',
              mr: 2,
              textTransform: 'none',
              fontWeight: 600
            }
          }}
        >
          <Tab label="Platos" value="dishes" />
          <Tab label="KPIs" value="kpis" />
          <Tab label="Secciones" value="sections" />
          <Tab label="Sesiones" value="sessions" />
        </Tabs>
        <Divider sx={{ mt: '-1px' }} />
      </Box>

      {/* Contenido de Tabs */}

      {/* 1. Platos */}
      {activeTab === 'dishes' && (
        <DishesTab timeRange={timeRange} />
      )}

      {/* 2. KPIs */}
      {activeTab === 'kpis' && data && (
        <KPIsTab data={data} timeRange={timeRange} />
      )}

      {/* 3. Secciones */}
      {activeTab === 'sections' && (
        <SectionsTab timeRange={timeRange} />
      )}

      {/* 4. Sesiones */}
      {activeTab === 'sessions' && (
        <SessionsTab timeRange={timeRange} />
      )}

    </Container>
  );
}

// ==================== KPI TAB (Agrupada) ====================

function KPIsTab({ data, timeRange }: any) {
  return (
    <Grid container spacing={3}>
      {/* 1. Resumen Principal (Top Cards) */}
      <Grid item xs={12}>
        <SummaryKPIs data={data.summary} timeRange={timeRange} />
      </Grid>

      {/* 2. Gráfico Temporal Principal */}
      <Grid item xs={12} lg={8}>
        <TimeSeriesChart data={data.timeseries} timeRange={timeRange} />
      </Grid>

      {/* 3. Tráfico por Hora (Heatmap simplificado) */}
      <Grid item xs={12} lg={4}>
        <HourlyTrafficChart data={data.trafficByHour} />
      </Grid>

      {/* 4. Analítica de Carrito (Ahora Real) */}
      <Grid item xs={12} md={6}>
        <CartAnalytics data={data.cartMetrics} />
      </Grid>

      {/* 5. Desglose de Dispositivos (Siempre útil) */}
      <Grid item xs={12} md={6}>
        <DeviceBreakdown breakdowns={data.breakdowns || {}} />
      </Grid>
    </Grid>
  );
}

// ==================== ESTADOS ====================

function LoadingState() {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>Cargando Analytics...</Typography>
      <Grid container spacing={3}>
        {[...Array(3)].map((_, i) => (
          <Grid item xs={12} key={i}>
            <Card><CardContent sx={{ height: 200 }} /></Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

function ErrorState({ error }: any) {
  return (
    <Container maxWidth="xl" sx={{ py: 3, textAlign: 'center' }}>
      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="h6">Error al cargar analytics</Typography>
        <Typography>{error?.message || 'Error desconocido'}</Typography>
      </Alert>
    </Container>
  );
}
