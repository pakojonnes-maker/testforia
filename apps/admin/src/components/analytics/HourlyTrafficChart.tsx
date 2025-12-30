// apps/admin/src/components/analytics/HourlyTrafficChart.tsx
import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, alpha } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface Props {
    data: Array<{ hour: string; sessions: number }>;
}

export default function HourlyTrafficChart({ data }: Props) {
    // Find peak hour
    const peakHour = useMemo(() => {
        if (!data || data.length === 0) return null;
        const max = data.reduce((prev, curr) =>
            curr.sessions > prev.sessions ? curr : prev
        );
        return max;
    }, [data]);

    const chartData = useMemo(() => {
        // Ensure we have 24 hours
        const hourlyData = Array.from({ length: 24 }, (_, i) => {
            const found = data.find(d => parseInt(d.hour) === i);
            return found?.sessions || 0;
        });

        const labels = Array.from({ length: 24 }, (_, i) =>
            `${i.toString().padStart(2, '0')}:00`
        );

        const maxValue = Math.max(...hourlyData, 1);

        return {
            labels,
            datasets: [
                {
                    label: 'Sesiones',
                    data: hourlyData,
                    backgroundColor: hourlyData.map((value) => {
                        const intensity = value / maxValue;
                        if (intensity > 0.8) return 'rgba(239, 68, 68, 0.9)'; // Peak - red
                        if (intensity > 0.5) return 'rgba(249, 115, 22, 0.85)'; // High - orange
                        if (intensity > 0.3) return 'rgba(234, 179, 8, 0.8)'; // Medium - yellow
                        if (intensity > 0) return 'rgba(34, 197, 94, 0.75)'; // Low - green
                        return 'rgba(100, 116, 139, 0.3)'; // Empty
                    }),
                    borderRadius: 6,
                    borderSkipped: false,
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
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleColor: '#f8fafc',
                bodyColor: '#e2e8f0',
                borderColor: 'rgba(249, 115, 22, 0.3)',
                borderWidth: 1,
                cornerRadius: 12,
                padding: 14,
                displayColors: false,
                callbacks: {
                    title: (items: any) => `🕐 ${items[0]?.label || ''}`,
                    label: (context: any) => {
                        const value = context.raw;
                        const hour = parseInt(context.label);

                        let period = '';
                        if (hour >= 12 && hour < 15) period = '(Almuerzo)';
                        else if (hour >= 19 && hour < 23) period = '(Cena)';
                        else if (hour >= 6 && hour < 12) period = '(Mañana)';

                        return `${value} sesiones ${period}`;
                    }
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: '#94a3b8',
                    font: { size: 10 },
                    maxRotation: 0,
                    callback: function (_: any, index: number) {
                        // Show only key hours
                        return [0, 6, 12, 18].includes(index) ? `${index}h` : '';
                    }
                },
                border: { display: false }
            },
            y: {
                grid: {
                    color: 'rgba(148, 163, 184, 0.08)',
                },
                ticks: {
                    color: '#94a3b8',
                    font: { size: 10 },
                    stepSize: 1
                },
                border: { display: false },
                beginAtZero: true,
            },
        },
    };

    return (
        <Card sx={{
            height: '100%',
            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.03) 0%, rgba(234, 179, 8, 0.03) 100%)',
            border: '1px solid rgba(249, 115, 22, 0.1)',
        }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccessTimeIcon sx={{ color: '#f97316' }} />
                            Horas Pico
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Programa tus promociones en las horas de mayor actividad
                        </Typography>
                    </Box>
                    {peakHour && peakHour.sessions > 0 && (
                        <Box sx={{
                            bgcolor: alpha('#ef4444', 0.1),
                            px: 1.5,
                            py: 0.75,
                            borderRadius: 2,
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.65rem' }}>
                                HORA PICO
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#ef4444' }}>
                                {peakHour.hour}:00
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Box sx={{ height: 250 }}>
                    <Bar data={chartData} options={options} />
                </Box>

                {/* Legend */}
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                    {[
                        { color: 'rgba(239, 68, 68, 0.9)', label: 'Máximo' },
                        { color: 'rgba(249, 115, 22, 0.85)', label: 'Alto' },
                        { color: 'rgba(234, 179, 8, 0.8)', label: 'Medio' },
                        { color: 'rgba(34, 197, 94, 0.75)', label: 'Bajo' },
                    ].map(item => (
                        <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{
                                width: 12,
                                height: 12,
                                borderRadius: 1,
                                bgcolor: item.color
                            }} />
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                {item.label}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </CardContent>
        </Card>
    );
}
