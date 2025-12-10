// apps/admin/src/components/analytics/TimeSeriesChart.tsx
import React, { useState, useMemo } from 'react';
import { Card, CardContent, Typography, Box, ButtonGroup, Button } from '@mui/material';
import { Line } from 'react-chartjs-2';

interface Props {
    data: Array<{
        date: string;
        totalViews: number;
        uniqueVisitors: number;
        totalSessions: number;
    }>;
    timeRange: string;
}

type Metric = 'views' | 'visitors' | 'sessions';

export default function TimeSeriesChart({ data, timeRange }: Props) {
    const [selectedMetric] = useState<Metric>('sessions');

    const chartData = useMemo(() => {
        const labels = data.map(d =>
            new Date(d.date).toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            })
        );

        const datasets = [
            {
                label: 'Sesiones',
                data: data.map(d => d.totalSessions),
                fill: true,
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                borderColor: '#1976d2',
                borderWidth: 3,
                pointBackgroundColor: '#1976d2',
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.4,
            },
        ];

        return { labels, datasets };
    }, [data, selectedMetric]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                cornerRadius: 8,
                padding: 12,
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#666' },
            },
            y: {
                grid: { color: '#f0f0f0' },
                ticks: { color: '#666' },
            },
        },
    };

    return (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6">Evolución de Sesiones</Typography>
                </Box>
                <Box sx={{ height: 350 }}>
                    <Line data={chartData} options={options} />
                </Box>
            </CardContent>
        </Card>
    );
}
