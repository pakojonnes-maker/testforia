// apps/admin/src/components/analytics/DishPerformanceTable.tsx
import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    LinearProgress,
    Box,
    Chip,
} from '@mui/material';

interface Dish {
    dish_id: string;
    name: string;
    views: number;
    favorites: number;
    ratings: number;
    avg_rating: number;
}

interface Props {
    dishes: Dish[];
    compact?: boolean;
}

export default function DishPerformanceTable({ dishes, compact = false }: Props) {
    const calculateEngagement = (dish: Dish) => {
        if (dish.views === 0) return 0;
        return ((dish.favorites + dish.ratings) / dish.views) * 100;
    };

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Rendimiento de Platos {compact && '(Top 5)'}
                </Typography>
                <TableContainer>
                    <Table size={compact ? 'small' : 'medium'}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Plato</TableCell>
                                <TableCell align="right">Vistas</TableCell>
                                <TableCell align="right">Favoritos</TableCell>
                                <TableCell align="right">Rating</TableCell>
                                <TableCell align="right">Engagement</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {dishes.map((dish, index) => {
                                const engagement = calculateEngagement(dish);
                                return (
                                    <TableRow key={dish.dish_id || index}>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>
                                                {dish.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Chip label={(dish?.views || 0).toLocaleString()} size="small" color="primary" variant="outlined" />
                                        </TableCell>
                                        <TableCell align="right">{dish?.favorites || 0}</TableCell>
                                        <TableCell align="right">
                                            {dish.avg_rating > 0 ? (
                                                <Chip label={dish.avg_rating.toFixed(1)} size="small" color="success" />
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={Math.min(engagement, 100)}
                                                    sx={{ width: 60, height: 6, borderRadius: 3 }}
                                                    color={engagement > 15 ? 'success' : engagement > 5 ? 'warning' : 'error'}
                                                />
                                                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 45 }}>
                                                    {engagement.toFixed(1)}%
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
}
