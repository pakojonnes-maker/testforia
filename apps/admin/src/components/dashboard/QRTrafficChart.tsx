// apps/admin/src/components/dashboard/QRTrafficChart.tsx

import {
    Box,
    Paper,
    Typography,
    LinearProgress,
    Stack,
    Skeleton,
    Tooltip
} from '@mui/material';
import { QrCode as QrCodeIcon } from '@mui/icons-material';
import type { QRStatsResponse } from '../../types/dashboard';

interface QRTrafficChartProps {
    data?: QRStatsResponse;
    loading?: boolean;
}

export function QRTrafficChart({ data, loading }: QRTrafficChartProps) {
    if (loading) {
        return (
            <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', height: '100%' }}>
                <Typography variant="h6" gutterBottom><Skeleton width={150} /></Typography>
                <Stack spacing={3} mt={2}>
                    {[1, 2, 3, 4].map((i) => (
                        <Box key={i}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Skeleton width={100} />
                                <Skeleton width={30} />
                            </Box>
                            <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 4 }} />
                        </Box>
                    ))}
                </Stack>
            </Paper>
        );
    }

    if (!data || !data.qrStats || data.qrStats.length === 0) {
        return (
            <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                    No hay datos de tráfico QR disponibles.
                </Typography>
            </Paper>
        );
    }

    // Calculate max value for scaling
    const maxScans = Math.max(...data.qrStats.map((s: { scans: number }) => s.scans), 1);

    // Sort by scans descending
    const sortedStats = [...data.qrStats].sort((a, b) => b.scans - a.scans);

    return (
        <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <QrCodeIcon color="primary" />
                <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                    Tráfico por QR
                </Typography>
            </Box>

            <Stack spacing={3}>
                {sortedStats.slice(0, 5).map((stat) => (
                    <Box key={stat.qrCode}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1 }}>
                            <Box>
                                <Typography variant="body2" fontWeight={600}>
                                    {stat.location}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {stat.uniqueUsers} usuarios únicos
                                </Typography>
                            </Box>
                            <Typography variant="body2" fontWeight={700} color="primary">
                                {stat.scans}
                            </Typography>
                        </Box>
                        <Tooltip title={`${stat.scans} escaneos (${((stat.scans / maxScans) * 100).toFixed(0)}% del máximo)`}>
                            <LinearProgress
                                variant="determinate"
                                value={(stat.scans / maxScans) * 100}
                                sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    bgcolor: 'action.hover',
                                    '& .MuiLinearProgress-bar': {
                                        borderRadius: 4,
                                    }
                                }}
                            />
                        </Tooltip>
                    </Box>
                ))}
            </Stack>
        </Paper>
    );
}
