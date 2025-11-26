// apps/admin/src/components/analytics/DeviceBreakdown.tsx
import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { Doughnut } from 'react-chartjs-2';

interface Props {
    breakdowns: {
        devices?: Array<{ key: string; count: number }>;
        os?: Array<{ key: string; count: number }>;
        browsers?: Array<{ key: string; count: number }>;
    };
}

export default function DeviceBreakdown({ breakdowns }: Props) {
    const { devices = [] } = breakdowns;

    const chartData = useMemo(() => {
        const labels = devices.map(d => d.key.charAt(0).toUpperCase() + d.key.slice(1));
        const data = devices.map(d => d.count);
        const colors = ['#1976d2', '#42a5f5', '#90caf9', '#bbdefb'];

        return {
            labels,
            datasets: [
                {
                    data,
                    backgroundColor: colors.slice(0, data.length),
                    borderWidth: 3,
                    borderColor: '#fff',
                },
            ],
        };
    }, [devices]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    usePointStyle: true,
                    padding: 15,
                },
            },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                callbacks: {
                    label: (context: any) => {
                        const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                        const percentage = ((context.parsed / total) * 100).toFixed(1);
                        return `${context.label}: ${percentage}%`;
                    },
                },
            },
        },
        cutout: '65%',
    };

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Distribución de Dispositivos
                </Typography>
                <Box sx={{ height: 280 }}>
                    <Doughnut data={chartData} options={options} />
                </Box>
            </CardContent>
        </Card>
    );
}
