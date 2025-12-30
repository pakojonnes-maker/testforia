import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Card,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Avatar,
    TableSortLabel,
    CircularProgress,
    Alert,
    Tooltip,
    IconButton
} from '@mui/material';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { Info as InfoIcon } from '@mui/icons-material';

interface DishesTabProps {
    timeRange: string;
}

type Order = 'asc' | 'desc';

export default function DishesTab({ timeRange }: DishesTabProps) {
    const { currentRestaurant } = useAuth();
    const [orderBy, setOrderBy] = useState<string>('views');
    const [order, setOrder] = useState<Order>('desc');

    const { data, isLoading, error } = useQuery({
        queryKey: ['analytics-dishes', currentRestaurant?.id, timeRange],
        queryFn: async () => {
            if (!currentRestaurant?.id) throw new Error('No restaurant selected');
            return await apiClient.getDishAnalytics(currentRestaurant.id, { timeRange });
        },
        enabled: !!currentRestaurant?.id,
    });

    const handleRequestSort = (property: string) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const sortedData = React.useMemo(() => {
        if (!data?.data) return [];
        return [...data.data].sort((a, b) => {
            const aValue = a[orderBy] || 0;
            const bValue = b[orderBy] || 0;
            if (order === 'desc') {
                return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
            } else {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            }
        });
    }, [data, orderBy, order]);

    if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">Error al cargar datos de platos</Alert>;

    const headers = [
        { id: 'name', label: 'Plato', align: 'left' },
        { id: 'views', label: 'Vistas', align: 'right', tooltip: 'Veces que se ha visualizado el plato' },
        { id: 'favorites', label: 'Favoritos', align: 'right', tooltip: 'Veces añadido a favoritos' },
        { id: 'cart_additions', label: 'Carrito', align: 'right', tooltip: 'Veces añadido al carrito' },
        { id: 'avg_dwell_seconds', label: 'Tiempo Medio', align: 'right', tooltip: 'Tiempo medio de visualización (segundos)' },
    ];

    return (
        <Card>
            <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Rendimiento de Platos</Typography>
                <Typography variant="body2" color="text.secondary">
                    Análisis detallado de cómo interactúan los usuarios con cada plato de tu menú.
                </Typography>
            </Box>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Plato</TableCell>
                            {headers.slice(1).map((headCell) => (
                                <TableCell
                                    key={headCell.id}
                                    align={headCell.align as any}
                                    sortDirection={orderBy === headCell.id ? order : false}
                                >
                                    <TableSortLabel
                                        active={orderBy === headCell.id}
                                        direction={orderBy === headCell.id ? order : 'asc'}
                                        onClick={() => handleRequestSort(headCell.id)}
                                    >
                                        {headCell.label}
                                        {headCell.tooltip && (
                                            <Tooltip title={headCell.tooltip}>
                                                <IconButton size="small" sx={{ ml: 0.5 }}><InfoIcon fontSize="small" /></IconButton>
                                            </Tooltip>
                                        )}
                                    </TableSortLabel>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedData.map((row: any) => (
                            <TableRow key={row.dish_id} hover>
                                <TableCell component="th" scope="row">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar
                                            src={row.image || undefined}
                                            variant="rounded"
                                            sx={{ width: 48, height: 48 }}
                                        >
                                            {row.name?.charAt(0)}
                                        </Avatar>
                                        <Typography variant="subtitle2">{row.name}</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell align="right">{row.views || 0}</TableCell>
                                <TableCell align="right">{row.favorites || 0}</TableCell>
                                <TableCell align="right">{row.cart_additions || 0}</TableCell>
                                <TableCell align="right">{(row.avg_dwell_seconds || 0).toFixed(1)}s</TableCell>
                            </TableRow>
                        ))}
                        {sortedData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">No hay datos disponibles para este periodo</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Card>
    );
}
