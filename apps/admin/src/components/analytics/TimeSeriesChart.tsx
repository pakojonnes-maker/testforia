// apps/admin/src/components/analytics/TimeSeriesChart.tsx
// Evolución de Sesiones y Visitantes - Rediseñado con multi-dataset
import { useMemo, useState } from 'react';
import { Card, CardContent, Typography, Box, Chip, alpha, Stack, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { Line } from 'react-chartjs-2';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonIcon from '@mui/icons-material/Person';
import EventIcon from '@mui/icons-material/Event';

interface DataPoint {
    date: string;
    totalViews?: number;
    total_views?: number;
    uniqueVisitors?: number;
    unique_visitors?: number;
    totalSessions?: number;
    total_sessions?: number;
}

interface Props {
    data: DataPoint[];
    timeRange: string;
}

type MetricView = 'all' | 'sessions' | 'visitors';

export default function TimeSeriesChart({ data }: Props) {
    const [metricView, setMetricView] = useState<MetricView>('all');

    // Calculate trend from totalSessions
    const trend = useMemo(() => {
        if (!data || data.length < 2) return { direction: 'flat' as const, percentage: '0' };

        const midpoint = Math.floor(data.length / 2);
        const firstHalf = data.slice(0, midpoint);
        const secondHalf = data.slice(midpoint);

        const firstAvg = firstHalf.reduce((sum, d) => sum + (d.totalSessions ?? d.total_sessions ?? 0), 0) / (firstHalf.length || 1);
        const secondAvg = secondHalf.reduce((sum, d) => sum + (d.totalSessions ?? d.total_sessions ?? 0), 0) / (secondHalf.length || 1);

        if (firstAvg === 0) return { direction: 'up' as const, percentage: '100' };

        const change = ((secondAvg - firstAvg) / firstAvg) * 100;
        return {
            direction: change > 5 ? 'up' as const : change < -5 ? 'down' as const : 'flat' as const,
            percentage: Math.abs(change).toFixed(1)
        };
    }, [data]);

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return { labels: [], datasets: [] };

        const labels = data.map(d =>
            new Date(d.date).toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            })
        );

        const datasets: any[] = [];

        if (metricView === 'all' || metricView === 'sessions') {
            datasets.push({
                label: 'Sesiones',
                data: data.map(d => (d.totalSessions ?? d.total_sessions ?? 0)),
                fill: true,
                backgroundColor: (context: any) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return 'rgba(99, 102, 241, 0.1)';
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
                    gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.1)');
                    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
                    return gradient;
                },
                borderColor: '#818cf8',
                borderWidth: 2.5,
                pointBackgroundColor: '#818cf8',
                pointBorderColor: '#1e1b4b',
                pointBorderWidth: 2,
                pointRadius: data.length > 14 ? 3 : 5,
                pointHoverRadius: 7,
                tension: 0.4,
            });
        }

        if (metricView === 'all' || metricView === 'visitors') {
            datasets.push({
                label: 'Visitantes Únicos',
                data: data.map(d => (d.uniqueVisitors ?? d.unique_visitors ?? 0)),
                fill: metricView !== 'all',
                backgroundColor: metricView !== 'all' ? (context: any) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return 'rgba(34, 197, 94, 0.1)';
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
                    gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.1)');
                    gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
                    return gradient;
                } : 'transparent',
                borderColor: '#22c55e',
                borderWidth: 2,
                pointBackgroundColor: '#22c55e',
                pointBorderColor: '#052e16',
                pointBorderWidth: 2,
                pointRadius: data.length > 14 ? 2 : 4,
                pointHoverRadius: 6,
                borderDash: metricView === 'all' ? [5, 3] : [],
                tension: 0.4,
            });
        }

        return { labels, datasets };
    }, [data, metricView]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleColor: '#f8fafc',
                bodyColor: '#e2e8f0',
                borderColor: 'rgba(99, 102, 241, 0.3)',
                borderWidth: 1,
                cornerRadius: 12,
                padding: 14,
                displayColors: true,
                boxWidth: 8,
                boxHeight: 8,
                boxPadding: 4,
                usePointStyle: true,
                titleFont: { size: 13, weight: 'bold' as const },
                bodyFont: { size: 12 },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: '#94a3b8',
                    font: { size: 11 },
                    maxRotation: 45,
                    autoSkip: true,
                    maxTicksLimit: 12,
                },
                border: { display: false }
            },
            y: {
                grid: {
                    color: 'rgba(148, 163, 184, 0.08)',
                    drawBorder: false,
                },
                ticks: {
                    color: '#94a3b8',
                    font: { size: 11 },
                    padding: 8,
                    precision: 0,
                },
                border: { display: false },
                beginAtZero: true,
            },
        },
    };

    const TrendIcon = trend.direction === 'up' ? TrendingUpIcon :
        trend.direction === 'down' ? TrendingDownIcon : TrendingFlatIcon;

    const trendColor = trend.direction === 'up' ? '#22c55e' :
        trend.direction === 'down' ? '#ef4444' : '#94a3b8';

    // Summary stats
    const totalSessions = useMemo(() =>
        data?.reduce((sum, d) => sum + (d.totalSessions ?? d.total_sessions ?? 0), 0) || 0, [data]);
    const totalVisitors = useMemo(() =>
        data?.reduce((sum, d) => sum + (d.uniqueVisitors ?? d.unique_visitors ?? 0), 0) || 0, [data]);
    const avgDaily = data && data.length > 0
        ? (totalSessions / data.length).toFixed(1)
        : '0';

    const isEmpty = !data || data.length === 0 || totalSessions === 0;

    return (
        <Card sx={{
            height: '100%',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.1)',
        }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                            📈 Evolución de Tráfico
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                                {totalSessions.toLocaleString()} sesiones · {totalVisitors.toLocaleString()} visitantes · ~{avgDaily}/día
                            </Typography>
                        </Stack>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                        {/* Metric toggle */}
                        <ToggleButtonGroup
                            value={metricView}
                            exclusive
                            onChange={(_, v) => v && setMetricView(v)}
                            size="small"
                            sx={{
                                '& .MuiToggleButton-root': {
                                    px: 1.5,
                                    py: 0.5,
                                    fontSize: '0.7rem',
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    '&.Mui-selected': {
                                        bgcolor: alpha('#6366f1', 0.15),
                                        color: '#818cf8',
                                        borderColor: alpha('#6366f1', 0.3),
                                    }
                                }
                            }}
                        >
                            <ToggleButton value="all">
                                <EventIcon sx={{ fontSize: 14, mr: 0.5 }} /> Todo
                            </ToggleButton>
                            <ToggleButton value="sessions">
                                <EventIcon sx={{ fontSize: 14, mr: 0.5 }} /> Sesiones
                            </ToggleButton>
                            <ToggleButton value="visitors">
                                <PersonIcon sx={{ fontSize: 14, mr: 0.5 }} /> Visitantes
                            </ToggleButton>
                        </ToggleButtonGroup>

                        <Chip
                            icon={<TrendIcon sx={{ fontSize: 16, color: `${trendColor} !important` }} />}
                            label={`${trend.percentage}%`}
                            size="small"
                            sx={{
                                bgcolor: alpha(trendColor, 0.1),
                                color: trendColor,
                                fontWeight: 600,
                                border: `1px solid ${alpha(trendColor, 0.3)}`,
                                '& .MuiChip-icon': { color: trendColor }
                            }}
                        />
                    </Stack>
                </Box>

                {/* Legend */}
                {metricView === 'all' && (
                    <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <Box sx={{ width: 12, height: 3, borderRadius: 1, bgcolor: '#818cf8' }} />
                            <Typography variant="caption" color="text.secondary">Sesiones</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <Box sx={{ width: 12, height: 0, borderRadius: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: '#22c55e' }} />
                            <Typography variant="caption" color="text.secondary">Visitantes únicos</Typography>
                        </Stack>
                    </Stack>
                )}

                {/* Chart */}
                <Box sx={{ flexGrow: 1, minHeight: 280 }}>
                    {isEmpty ? (
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            flexDirection: 'column',
                            gap: 1
                        }}>
                            <VisibilityIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                            <Typography color="text.secondary" variant="body2">
                                Sin datos de sesiones en este periodo
                            </Typography>
                        </Box>
                    ) : (
                        <Line data={chartData} options={options} />
                    )}
                </Box>
            </CardContent>
        </Card>
    );
}
