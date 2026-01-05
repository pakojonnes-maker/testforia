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

// Components - Updated imports
import SummaryKPIs from '../components/analytics/SummaryKPIs';
import TimeSeriesChart from '../components/analytics/TimeSeriesChart';
import HourlyTrafficChart from '../components/analytics/HourlyTrafficChart';
import CartAnalytics from '../components/analytics/CartAnalytics';
import TopDishesChart from '../components/analytics/TopDishesChart';
import ConversionFunnel from '../components/analytics/ConversionFunnel';
import TopCitiesChart from '../components/analytics/TopCitiesChart';

// Tabs
import DishesTab from '../components/analytics/DishesTab';
import SectionsTab from '../components/analytics/SectionsTab';
import CampaignsTab from '../components/analytics/CampaignsTab';
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
type TabValue = 'dishes' | 'kpis' | 'sections' | 'sessions' | 'campaigns';

export default function AnalyticsPage() {
  const { currentRestaurant } = useAuth();
  const restaurantId = currentRestaurant?.id;

  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [activeTab, setActiveTab] = useState<TabValue>('kpis');

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
          <Tab label="Campañas" value="campaigns" />
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

      {/* 5. Campañas */}
      {activeTab === 'campaigns' && (
        <CampaignsTab timeRange={timeRange} />
      )}

    </Container>
  );
}

// ==================== KPI TAB (Rediseñada) ====================

function KPIsTab({ data, timeRange }: any) {
  // Prepare funnel data
  const funnelData = {
    totalSessions: data.summary?.totalSessions || data.summary?.total_sessions || 0,
    dishViews: data.summary?.dishViews || data.summary?.dish_views || 0,
    favorites: data.summary?.favorites || 0,
    cartItems: data.cartMetrics?.total_items_added || 0,
  };

  return (
    <Grid container spacing={3}>
      {/* Row 1: Summary KPIs */}
      <Grid item xs={12}>
        <SummaryKPIs
          data={data.summary}
          timeRange={timeRange}
          cartMetrics={data.cartMetrics}
        />
      </Grid>

      {/* Row 2: Evolución de Sesiones (8 cols) + Horas Pico (4 cols) */}
      <Grid item xs={12} lg={8}>
        <TimeSeriesChart data={data.timeseries} timeRange={timeRange} />
      </Grid>
      <Grid item xs={12} lg={4}>
        <HourlyTrafficChart data={data.trafficByHour} />
      </Grid>

      {/* Row 3: Top Platos (4 cols) + Funnel de Conversión (4 cols) + Top Ciudades (4 cols) */}
      <Grid item xs={12} md={6} lg={4}>
        <TopDishesChart dishes={data.topDishes || []} />
      </Grid>
      <Grid item xs={12} md={6} lg={4}>
        <ConversionFunnel data={funnelData} />
      </Grid>
      <Grid item xs={12} md={6} lg={4}>
        <TopCitiesChart
          cities={data.breakdowns?.cities || []}
          countries={data.breakdowns?.countries || []}
        />
      </Grid>

      {/* Row 4: Cart Analytics (full width for prominence) */}
      <Grid item xs={12}>
        <CartAnalytics data={data.cartMetrics} />
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
