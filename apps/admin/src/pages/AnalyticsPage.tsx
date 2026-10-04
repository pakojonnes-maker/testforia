// apps/admin/src/pages/AnalyticsPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, CircularProgress, Grid, Tab, Tabs, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { BarChart as StatsIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/apiClient';
import { PageHeader } from '../components/common/PageHeader';

import SummaryKPIs from '../components/analytics/SummaryKPIs';
import TimeSeriesChart from '../components/analytics/TimeSeriesChart';
import HourlyTrafficChart from '../components/analytics/HourlyTrafficChart';
import RecurrencePanel from '../components/analytics/RecurrencePanel';
import AttributionPanel from '../components/analytics/AttributionPanel';
import TopDishesChart from '../components/analytics/TopDishesChart';
import ConversionFunnel from '../components/analytics/ConversionFunnel';
import TopCitiesChart from '../components/analytics/TopCitiesChart';
import DishesTab from '../components/analytics/DishesTab';
import SectionsTab from '../components/analytics/SectionsTab';
import SessionsTab from '../components/analytics/SessionsTab';

type TimeRange = 'today' | 'week' | 'month' | 'quarter';
type TabValue = 'kpis' | 'dishes' | 'sections' | 'sessions';

const RANGES: Array<{ key: TimeRange; label: string }> = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: '7 días' },
  { key: 'month', label: '30 días' },
  { key: 'quarter', label: '3 meses' },
];

export default function AnalyticsPage() {
  const { currentRestaurant } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [activeTab, setActiveTab] = useState<TabValue>('kpis');

  return (
    <Box>
      <PageHeader
        icon={<StatsIcon />}
        title="Estadísticas"
        subtitle="Cómo usan tus clientes la carta"
        actions={
          <ToggleButtonGroup size="small" exclusive value={timeRange} onChange={(_, v) => v && setTimeRange(v)}>
            {RANGES.map((r) => <ToggleButton key={r.key} value={r.key}>{r.label}</ToggleButton>)}
          </ToggleButtonGroup>
        }
      />

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Resumen" value="kpis" />
        <Tab label="Platos" value="dishes" />
        <Tab label="Secciones" value="sections" />
        <Tab label="Sesiones" value="sessions" />
      </Tabs>

      {!currentRestaurant?.id ? (
        <Alert severity="info">Selecciona un restaurante para ver sus estadísticas.</Alert>
      ) : (
        <>
          {activeTab === 'kpis' && <KpisTab restaurantId={currentRestaurant.id} timeRange={timeRange} />}
          {activeTab === 'dishes' && <DishesTab timeRange={timeRange} />}
          {activeTab === 'sections' && <SectionsTab timeRange={timeRange} />}
          {activeTab === 'sessions' && <SessionsTab timeRange={timeRange} />}
        </>
      )}
    </Box>
  );
}

// Solo se pide el resumen cuando se mira esta pestaña (antes se cargaba
// siempre, y bloqueaba toda la página mientras tanto).
function KpisTab({ restaurantId, timeRange }: { restaurantId: string; timeRange: TimeRange }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', restaurantId, timeRange],
    queryFn: () => apiClient.getAnalytics(restaurantId, { timeRange, top: 10, lang: 'es' }),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error || !data) {
    return <Alert severity="error">No se pudieron cargar las estadísticas: {(error as Error)?.message || 'error desconocido'}</Alert>;
  }

  const { summary } = data;
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <SummaryKPIs data={summary} cartMetrics={data.cartMetrics} />
      </Grid>
      <Grid item xs={12} lg={8}>
        <TimeSeriesChart data={data.timeseries} />
      </Grid>
      <Grid item xs={12} lg={4}>
        <HourlyTrafficChart data={data.trafficByHour} />
      </Grid>
      <Grid item xs={12} md={6}>
        <RecurrencePanel
          newVisitors={summary.new_visitors}
          returningVisitors={summary.returning_visitors}
          uniqueVisitors={summary.uniqueVisitors}
          totalSessions={summary.totalSessions}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <ConversionFunnel data={{
          totalSessions: summary.totalSessions,
          dishViews: summary.dishViews,
          favorites: summary.favorites,
          cartItems: data.cartMetrics.totalItems,
        }} />
      </Grid>
      {/* Origen del tráfico: guidebook / TV / QR / directo, y qué alojamientos envían más clientes. */}
      <Grid item xs={12} md={6}>
        <AttributionPanel attribution={data.attribution} topApartments={data.topApartments} />
      </Grid>
      <Grid item xs={12} md={6}>
        <TopDishesChart dishes={data.topDishes} />
      </Grid>
      <Grid item xs={12} md={6}>
        <TopCitiesChart cities={data.cities} totalSessions={summary.totalSessions} />
      </Grid>
    </Grid>
  );
}
