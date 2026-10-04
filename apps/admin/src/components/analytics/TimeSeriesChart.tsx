// apps/admin/src/components/analytics/TimeSeriesChart.tsx
// Evolución diaria de sesiones y visitantes únicos.
import { useMemo, useState } from 'react';
import { Box, Chip, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions, ScriptableContext } from 'chart.js';
import TimelineIcon from '@mui/icons-material/Timeline';
import { Panel } from '../common/Panel';
import { DATA } from '../../theme';
import { chartGrid, chartTicks, chartTooltip, withAlpha } from '../../theme/charts';
import { EmptyPanelState } from './RankedList';

export interface DataPoint {
    date: string;
    uniqueVisitors: number;
    totalSessions: number;
}

type MetricView = 'all' | 'sessions' | 'visitors';

// Relleno degradado bajo la línea (necesita el área ya calculada).
const fillFor = (hex: string) => (ctx: ScriptableContext<'line'>) => {
    const { ctx: c, chartArea } = ctx.chart;
    if (!chartArea) return withAlpha(hex, 0.1);
    const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, withAlpha(hex, 0.25));
    gradient.addColorStop(1, withAlpha(hex, 0));
    return gradient;
};

const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: chartTooltip },
    scales: {
        x: { grid: { display: false }, ticks: { ...chartTicks, maxRotation: 45, autoSkip: true, maxTicksLimit: 12 }, border: { display: false } },
        y: { grid: chartGrid, ticks: { ...chartTicks, padding: 8, precision: 0 }, border: { display: false }, beginAtZero: true },
    },
};

export default function TimeSeriesChart({ data }: { data: DataPoint[] }) {
    const [metricView, setMetricView] = useState<MetricView>('all');

    const totals = useMemo(() => ({
        sessions: data.reduce((sum, d) => sum + d.totalSessions, 0),
        visitors: data.reduce((sum, d) => sum + d.uniqueVisitors, 0),
    }), [data]);

    // Tendencia: media de la segunda mitad del periodo frente a la primera.
    const trend = useMemo(() => {
        if (data.length < 2) return null;
        const mid = Math.floor(data.length / 2);
        const avg = (rows: DataPoint[]) => rows.reduce((s, d) => s + d.totalSessions, 0) / (rows.length || 1);
        const first = avg(data.slice(0, mid));
        if (first === 0) return null;
        return ((avg(data.slice(mid)) - first) / first) * 100;
    }, [data]);

    const chartData = useMemo<ChartData<'line'>>(() => {
        const labels = data.map(d => new Date(d.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }));
        const datasets: ChartData<'line'>['datasets'] = [];
        const points = data.length > 14 ? 2 : 4;
        if (metricView !== 'visitors') {
            datasets.push({
                label: 'Sesiones', data: data.map(d => d.totalSessions), fill: true, backgroundColor: fillFor(DATA.cobalt),
                borderColor: DATA.cobalt, borderWidth: 2, pointBackgroundColor: DATA.cobalt, pointRadius: points, tension: 0.35,
            });
        }
        if (metricView !== 'sessions') {
            datasets.push({
                label: 'Visitantes únicos', data: data.map(d => d.uniqueVisitors), fill: metricView === 'visitors',
                backgroundColor: metricView === 'visitors' ? fillFor(DATA.olive) : 'transparent',
                borderColor: DATA.olive, borderWidth: 2, pointBackgroundColor: DATA.olive, pointRadius: points,
                borderDash: metricView === 'all' ? [5, 3] : [], tension: 0.35,
            });
        }
        return { labels, datasets };
    }, [data, metricView]);

    const trendColor = trend === null || Math.abs(trend) <= 5 ? DATA.muted : trend > 0 ? DATA.olive : '#B3261E';

    return (
        <Panel
            icon={<TimelineIcon />}
            title="Evolución del tráfico"
            subtitle={`${totals.sessions.toLocaleString('es-ES')} sesiones · ${totals.visitors.toLocaleString('es-ES')} visitantes · ~${data.length ? (totals.sessions / data.length).toFixed(1) : 0}/día`}
            action={
                <Stack direction="row" spacing={1} alignItems="center">
                    <ToggleButtonGroup size="small" exclusive value={metricView} onChange={(_, v) => v && setMetricView(v)}>
                        <ToggleButton value="all">Todo</ToggleButton>
                        <ToggleButton value="sessions">Sesiones</ToggleButton>
                        <ToggleButton value="visitors">Visitantes</ToggleButton>
                    </ToggleButtonGroup>
                    {trend !== null && (
                        <Chip size="small" variant="outlined" label={`${trend > 0 ? '+' : ''}${trend.toFixed(1)} %`}
                            sx={{ color: trendColor, borderColor: trendColor, fontWeight: 600 }} />
                    )}
                </Stack>
            }
        >
            {totals.sessions === 0 ? (
                <EmptyPanelState icon={<TimelineIcon />} text="Sin sesiones en este periodo" />
            ) : (
                <>
                    {metricView === 'all' && (
                        <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <Box sx={{ width: 14, height: 2, bgcolor: DATA.cobalt }} />
                                <Typography variant="caption" color="text.secondary">Sesiones</Typography>
                            </Stack>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <Box sx={{ width: 14, borderTop: `2px dashed ${DATA.olive}` }} />
                                <Typography variant="caption" color="text.secondary">Visitantes únicos</Typography>
                            </Stack>
                        </Stack>
                    )}
                    <Box sx={{ height: 280 }}>
                        <Line data={chartData} options={options} />
                    </Box>
                </>
            )}
        </Panel>
    );
}
