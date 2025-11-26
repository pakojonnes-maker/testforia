// apps/admin/src/components/analytics/HourlyTrafficChart.tsx
import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { Bar } from 'react-chartjs-2';

interface Props {
    data: Array<{ hour: string; sessions: number }>;
}

export default function HourlyTrafficChart({ data }: Props) {
    const chartData = useMemo(() => {
        const labels = data.map(h => `${h.hour}:00`);
        const values = data.map(h => h.sessions);

        return {
            labels,
            datasets: [
                {
                    label: 'Sesiones',
                    data: values,
                    backgroundColor: '#1976d2',
                    borderColor: '#1976d2',
                    borderWidth: 1,
                    borderRadius: 6,
                },
            ],
        };
    }, [data]);

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
                <Typography variant="h6" gutterBottom>
                    Tráfico por Hora del Día
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Identifica las horas pico para programar promociones y contenido
                </Typography>
                <Box sx={{ height: 300 }}>
                    <Bar data={chartData} options={options} />
                </Box>
            </CardContent>
        </Card>
    );
}
