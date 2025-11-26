// apps/admin/src/components/dashboard/DishPerformanceTable.tsx

import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Box,
    Avatar,
    Chip,
    Skeleton
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Remove as RemoveIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material';
import type { TopDishesResponse } from '../../types/dashboard';
import { getTrendColor } from '../../lib/utils/dashboardHelpers';

interface DishPerformanceTableProps {
    data?: TopDishesResponse;
    loading?: boolean;
}

export function DishPerformanceTable({ data, loading }: DishPerformanceTableProps) {
    if (loading) {
        return (
            <Paper elevation={0} sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                <Typography variant="h6" gutterBottom>
                    <Skeleton width={200} />
                </Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell><Skeleton width={100} /></TableCell>
                                <TableCell align="right"><Skeleton width={60} /></TableCell>
                                <TableCell align="right"><Skeleton width={60} /></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {[1, 2, 3, 4, 5].map((i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton variant="text" /></TableCell>
                                    <TableCell><Skeleton variant="text" /></TableCell>
                                    <TableCell><Skeleton variant="text" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        );
    }

    if (!data || !data.topViewed || data.topViewed.length === 0) {
        return (
            <Paper elevation={0} sx={{ p: 3, textAlign: 'center', border: 1, borderColor: 'divider' }}>
                <Typography variant="body1" color="text.secondary">
                    No hay datos de rendimiento disponibles aún.
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                    Platos más populares
                </Typography>
            </Box>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell>Plato</TableCell>
                            <TableCell align="right">Vistas</TableCell>
                            <TableCell align="right">Tendencia</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.topViewed.map((dish) => {
                            const trendColor = getTrendColor(dish.trend > 0 ? 'up' : dish.trend < 0 ? 'down' : 'neutral');
                            const TrendIcon = dish.trend > 0 ? TrendingUpIcon : dish.trend < 0 ? TrendingDownIcon : RemoveIcon;

                            return (
                                <TableRow
                                    key={dish.dishId}
                                    hover
                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                    <TableCell component="th" scope="row">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Avatar
                                                src={dish.thumbnailUrl || '/placeholder-dish.jpg'}
                                                variant="rounded"
                                                sx={{ width: 40, height: 40 }}
                                            >
                                                {dish.dishName.charAt(0)}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {dish.dishName}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                            <VisibilityIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography variant="body2" fontWeight={600}>
                                                {dish.views}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Chip
                                            icon={<TrendIcon sx={{ '&&': { color: trendColor } }} />}
                                            label={`${dish.trend > 0 ? '+' : ''}${dish.trend.toFixed(1)}%`}
                                            size="small"
                                            sx={{
                                                height: 24,
                                                bgcolor: `${trendColor}15`,
                                                color: trendColor,
                                                fontWeight: 600,
                                                '& .MuiChip-label': { px: 1 }
                                            }}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}
