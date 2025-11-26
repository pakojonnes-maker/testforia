// apps/admin/src/pages/AnalyticsPage.tsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  ButtonGroup,
  Alert,
  Tabs,
  Tab,
  Chip,
  Stack,
  Divider,
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
import { Line, Bar, Doughnut } from 'react-chartjs-2';
// Adjust import path based on actual location found
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/apiClient';

// Components
import SummaryKPIs from '../components/analytics/SummaryKPIs';
import TimeSeriesChart from '../components/analytics/TimeSeriesChart';
import DishPerformanceTable from '../components/analytics/DishPerformanceTable';
import SectionPerformanceTable from '../components/analytics/SectionPerformanceTable';
import DeviceBreakdown from '../components/analytics/DeviceBreakdown';
import GeographicInsights from '../components/analytics/GeographicInsights';
import UserBehaviorFlow from '../components/analytics/UserBehaviorFlow';
import HourlyTrafficChart from '../components/analytics/HourlyTrafficChart';
import QRAttribution from '../components/analytics/QRAttribution';
import PWAInsights from '../components/analytics/PWAInsights';
import CartAnalytics from '../components/analytics/CartAnalytics';
import EngagementMetrics from '../components/analytics/EngagementMetrics';
import RecommendationsPanel from '../components/analytics/RecommendationsPanel';

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
type TabValue = 'overview' | 'dishes' | 'users' | 'conversion' | 'technical';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const restaurantId = user?.currentRestaurant?.id;

  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [activeTab, setActiveTab] = useState<TabValue>('overview');

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

  // Estado de carga
  if (isLoading) {
    return <LoadingState />;
  }

  // Estado de error
  if (error || !data) {
    return <ErrorState error={error} />;
  }

  // Sin datos suficientes
  if (!data.summary || data.summary.totalViews === 0) {
    return <EmptyState />;
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
            Visión general del rendimiento de tu menú digital
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

      {/* KPIs Principales - Siempre visible */}
      <Box sx={{ mb: 5 }}>
        <SummaryKPIs data={data.summary} timeRange={timeRange} />
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
            }
          }}
        >
          <Tab label="Vista General" value="overview" />
          <Tab label="Platos" value="dishes" />
          <Tab label="Usuarios" value="users" />
          <Tab label="Conversión" value="conversion" />
          <Tab label="Técnico" value="technical" />
        </Tabs>
        <Divider sx={{ mt: '-1px' }} />
      </Box>

      {/* Vista General */}
      {activeTab === 'overview' && (
        <OverviewTab data={data} timeRange={timeRange} />
      )}

      {/* Platos y Secciones */}
      {activeTab === 'dishes' && (
        <DishesTab data={data} />
      )}

      {/* Comportamiento de Usuarios */}
      {activeTab === 'users' && (
        <UsersTab data={data} />
      )}

      {/* Conversión y Engagement */}
      {activeTab === 'conversion' && (
        <ConversionTab data={data} />
      )}

      {/* Técnico y Atribución */}
      {activeTab === 'technical' && (
        <TechnicalTab data={data} />
      )}
    </Container>
  );
}

// ==================== TABS ====================

function OverviewTab({ data, timeRange }: any) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <TimeSeriesChart data={data.timeseries} timeRange={timeRange} />
      </Grid>
      <Grid item xs={12} md={8}>
        <HourlyTrafficChart data={data.trafficByHour} />
      </Grid>
      <Grid item xs={12} md={4}>
        <RecommendationsPanel data={data} />
      </Grid>
      <Grid item xs={12} md={6}>
        <DishPerformanceTable dishes={data.topDishes?.slice(0, 5) || []} compact />
      </Grid>
      <Grid item xs={12} md={6}>
        <EngagementMetrics summary={data.summary} />
      </Grid>
    </Grid>
  );
}

function DishesTab({ data }: any) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <DishPerformanceTable dishes={data.topDishes || []} />
      </Grid>
      <Grid item xs={12}>
        <SectionPerformanceTable sections={data.topSections || []} />
      </Grid>
    </Grid>
  );
}

function UsersTab({ data }: any) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <GeographicInsights
          countries={data.breakdowns?.countries || []}
          cities={data.breakdowns?.cities || []}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <DeviceBreakdown breakdowns={data.breakdowns || {}} />
      </Grid>
      <Grid item xs={12}>
        <UserBehaviorFlow flows={data.flows || []} />
      </Grid>
    </Grid>
  );
}

function ConversionTab({ data }: any) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <CartAnalytics data={data} />
      </Grid>
      <Grid item xs={12} md={6}>
        <EngagementMetrics summary={data.summary} detailed />
      </Grid>
      <Grid item xs={12} md={6}>
        <RecommendationsPanel data={data} />
      </Grid>
    </Grid>
  );
}

function TechnicalTab({ data }: any) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <QRAttribution qrData={data.qrAttribution || []} />
      </Grid>
      <Grid item xs={12} md={4}>
        <PWAInsights pwaData={data.breakdowns?.pwa} />
      </Grid>
      <Grid item xs={12}>
        <TechnicalBreakdowns breakdowns={data.breakdowns || {}} />
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
        {[...Array(6)].map((_, i) => (
          <Grid item xs={12} md={4} key={i}>
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

function EmptyState() {
  return (
    <Container maxWidth="xl" sx={{ py: 3, textAlign: 'center' }}>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="h6">Sin datos suficientes</Typography>
        <Typography>Los datos aparecerán cuando los clientes empiecen a usar tu menú digital.</Typography>
      </Alert>
    </Container>
  );
}

// ==================== COMPONENTE TÉCNICO ====================

function TechnicalBreakdowns({ breakdowns }: any) {
  const { devices, os, browsers, languages, networks } = breakdowns;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Desglose Técnico</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Sistemas Operativos
            </Typography>
            {(os || []).slice(0, 5).map((item: any) => (
              <Stack key={item.key} direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="body2">{item.key}</Typography>
                <Chip label={item.count} size="small" />
              </Stack>
            ))}
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Navegadores
            </Typography>
            {(browsers || []).slice(0, 5).map((item: any) => (
              <Stack key={item.key} direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="body2">{item.key}</Typography>
                <Chip label={item.count} size="small" />
              </Stack>
            ))}
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Tipos de Red
            </Typography>
            {(networks || []).slice(0, 5).map((item: any) => (
              <Stack key={item.key} direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="body2">{item.key}</Typography>
                <Chip label={item.count} size="small" />
              </Stack>
            ))}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
