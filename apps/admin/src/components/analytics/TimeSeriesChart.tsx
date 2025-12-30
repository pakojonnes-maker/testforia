// apps/admin/src/components/analytics/TimeSeriesChart.tsx
import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, Chip, alpha } from '@mui/material';
import { Line } from 'react-chartjs-2';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

interface Props {
    data: Array<{
        date: string;
        totalViews: number;
        uniqueVisitors: number;
        totalSessions: number;
    }>;
    timeRange: string;
}

export default function TimeSeriesChart({ data, timeRange }: Props) {
    // Calculate trend
    const trend = useMemo(() => {
        if (!data || data.length < 2) return { direction: 'flat', percentage: 0 };

        const midpoint = Math.floor(data.length / 2);
        const firstHalf = data.slice(0, midpoint);
        const secondHalf = data.slice(midpoint);

        const firstAvg = firstHalf.reduce((sum, d) => sum + d.totalSessions, 0) / (firstHalf.length || 1);
        const secondAvg = secondHalf.reduce((sum, d) => sum + d.totalSessions, 0) / (secondHalf.length || 1);

        if (firstAvg === 0) return { direction: 'up', percentage: 100 };

        const change = ((secondAvg - firstAvg) / firstAvg) * 100;
        return {
            direction: change > 5 ? 'up' : change < -5 ? 'down' : 'flat',
            percentage: Math.abs(change).toFixed(1)
        };
    }, [data]);

    const chartData = useMemo(() => {
        const labels = data.map(d =>
            new Date(d.date).toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            })
        );

        return {
            labels,
            datasets: [
                {
                    label: 'Sesiones',
                    data: data.map(d => d.totalSessions),
                    fill: true,
                    backgroundColor: (context: any) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return 'rgba(99, 102, 241, 0.1)';
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
                        gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.15)');
                        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
                        return gradient;
                    },
                    borderColor: '#818cf8',
                    borderWidth: 3,
                    pointBackgroundColor: '#818cf8',
                    pointBorderColor: '#1e1b4b',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#a5b4fc',
                    pointHoverBorderColor: '#fff',
                    tension: 0.4,
                },
            ],
        };
    }, [data]);

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
                padding: 16,
                displayColors: false,
                titleFont: { size: 14, weight: 'bold' as const },
                bodyFont: { size: 13 },
                callbacks: {
                    title: (items: any) => items[0]?.label || '',
                    label: (context: any) => {
                        const value = context.raw;
                        const dataIndex = context.dataIndex;
                        const prevValue = dataIndex > 0 ? data[dataIndex - 1]?.totalSessions : null;

                        let label = `📊 ${value} sesiones`;

                        if (prevValue !== null && prevValue !== 0) {
                            const change = ((value - prevValue) / prevValue) * 100;
                            const arrow = change >= 0 ? '↑' : '↓';
                            const color = change >= 0 ? '🟢' : '🔴';
                            label += `\n${color} ${arrow} ${Math.abs(change).toFixed(1)}% vs día anterior`;
                        }

                        return label;
                    }
                },
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: '#94a3b8',
                    font: { size: 11 }
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
                    padding: 8
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

    // Calculate total sessions in period
    const totalSessions = useMemo(() =>
        data.reduce((sum, d) => sum + d.totalSessions, 0), [data]);

    return (
        <Card sx={{
            height: '100%',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.1)',
        }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                            📈 Evolución de Sesiones
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {totalSessions.toLocaleString()} sesiones en el periodo
                        </Typography>
                    </Box>
                    <Chip
                        icon={<TrendIcon sx={{ fontSize: 18, color: `${trendColor} !important` }} />}
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
                </Box>
                <Box sx={{ flexGrow: 1, minHeight: 300 }}>
                    <Line data={chartData} options={options} />
                </Box>
            </CardContent>
        </Card>
    );
}
