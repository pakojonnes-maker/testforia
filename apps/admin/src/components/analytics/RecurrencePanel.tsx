// apps/admin/src/components/analytics/RecurrencePanel.tsx
// Panel de recurrencia de visitantes para KPI tab
import { useMemo } from 'react';
import { Card, CardContent, Typography, Box, alpha, Chip, Stack, Tooltip } from '@mui/material';
import { Doughnut } from 'react-chartjs-2';
import PersonIcon from '@mui/icons-material/Person';
import LoopIcon from '@mui/icons-material/Loop';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import StarIcon from '@mui/icons-material/Star';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

interface Props {
    newVisitors: number;
    returningVisitors: number;
    uniqueVisitors: number;
    totalSessions: number;
}



export default function RecurrencePanel({ newVisitors, returningVisitors, uniqueVisitors, totalSessions }: Props) {
    const returnRate = uniqueVisitors > 0
        ? ((returningVisitors / uniqueVisitors) * 100)
        : 0;

    const avgVisitsPerUser = uniqueVisitors > 0
        ? (totalSessions / uniqueVisitors)
        : 0;

    // Donut chart data
    const chartData = useMemo(() => ({
        labels: ['Nuevos', 'Recurrentes'],
        datasets: [{
            data: [newVisitors || 0, returningVisitors || 0],
            backgroundColor: [
                'rgba(34, 197, 94, 0.85)',
                'rgba(139, 92, 246, 0.85)',
            ],
            borderColor: [
                'rgba(34, 197, 94, 1)',
                'rgba(139, 92, 246, 1)',
            ],
            borderWidth: 2,
            hoverOffset: 6,
            cutout: '70%',
        }]
    }), [newVisitors, returningVisitors]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleColor: '#f8fafc',
                bodyColor: '#e2e8f0',
                cornerRadius: 12,
                padding: 12,
                callbacks: {
                    label: (context: any) => {
                        const total = newVisitors + returningVisitors;
                        const pct = total > 0 ? ((context.raw / total) * 100).toFixed(1) : '0';
                        return `${context.label}: ${context.raw} (${pct}%)`;
                    }
                }
            }
        }
    };

    const hasData = (newVisitors + returningVisitors) > 0;

    return (
        <Card sx={{
            height: '100%',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.04) 0%, rgba(99, 102, 241, 0.04) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.12)',
        }}>
            <CardContent sx={{ height: '100%' }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                    <Box sx={{
                        p: 0.75,
                        borderRadius: 2,
                        bgcolor: alpha('#8b5cf6', 0.12),
                        display: 'flex',
                    }}>
                        <LoopIcon sx={{ color: '#8b5cf6', fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                            Recurrencia
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Visitantes nuevos vs recurrentes
                        </Typography>
                    </Box>
                </Box>

                {!hasData ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary" variant="body2">
                            Sin datos de visitantes en este periodo
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
                        {/* Left: Donut chart */}
                        <Box sx={{
                            position: 'relative',
                            width: 140, height: 140,
                            minWidth: 140,
                            mx: { xs: 'auto', md: 0 }
                        }}>
                            <Doughnut data={chartData} options={chartOptions} />
                            {/* Center stat */}
                            <Box sx={{
                                position: 'absolute',
                                top: '50%', left: '50%',
                                transform: 'translate(-50%, -50%)',
                                textAlign: 'center',
                            }}>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: '#8b5cf6', lineHeight: 1 }}>
                                    {returnRate.toFixed(0)}%
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                                    retorno
                                </Typography>
                            </Box>
                        </Box>

                        {/* Right: Stats breakdown */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            {/* Legend chips */}
                            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                                <Chip
                                    icon={<FiberNewIcon sx={{ fontSize: 14 }} />}
                                    label={`${newVisitors} Nuevos`}
                                    size="small"
                                    sx={{
                                        bgcolor: alpha('#22c55e', 0.1),
                                        color: '#22c55e',
                                        fontWeight: 600,
                                        '& .MuiChip-icon': { color: '#22c55e' }
                                    }}
                                />
                                <Chip
                                    icon={<LoopIcon sx={{ fontSize: 14 }} />}
                                    label={`${returningVisitors} Recurrentes`}
                                    size="small"
                                    sx={{
                                        bgcolor: alpha('#8b5cf6', 0.1),
                                        color: '#8b5cf6',
                                        fontWeight: 600,
                                        '& .MuiChip-icon': { color: '#8b5cf6' }
                                    }}
                                />
                            </Stack>

                            {/* Key metrics */}
                            <Stack spacing={1.5}>
                                <Tooltip title="Media de visitas por usuario único" arrow>
                                    <Box sx={{
                                        display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'center',
                                        p: 1.5, borderRadius: 2,
                                        bgcolor: alpha('#6366f1', 0.06),
                                        border: `1px solid ${alpha('#6366f1', 0.1)}`,
                                        cursor: 'default'
                                    }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <TrendingUpIcon sx={{ fontSize: 16, color: '#6366f1' }} />
                                            <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                                                Visitas / usuario
                                            </Typography>
                                        </Stack>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#6366f1' }}>
                                            {avgVisitsPerUser.toFixed(1)}x
                                        </Typography>
                                    </Box>
                                </Tooltip>

                                {returningVisitors >= 5 && (
                                    <Tooltip title="Visitantes con alta fidelidad (aportan el mayor valor)" arrow>
                                        <Box sx={{
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center',
                                            p: 1.5, borderRadius: 2,
                                            bgcolor: alpha('#f59e0b', 0.06),
                                            border: `1px solid ${alpha('#f59e0b', 0.1)}`,
                                            cursor: 'default'
                                        }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <StarIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                                                <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                                                    Super fans
                                                </Typography>
                                            </Stack>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                                                {returningVisitors} 🌟
                                            </Typography>
                                        </Box>
                                    </Tooltip>
                                )}
                            </Stack>
                        </Box>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}
