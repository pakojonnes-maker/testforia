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
    TableSortLabel,
    CircularProgress,
    Alert,
    Tooltip,
    IconButton
} from '@mui/material';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { Info as InfoIcon } from '@mui/icons-material';

interface SectionsTabProps {
    timeRange: string;
}

type Order = 'asc' | 'desc';

export default function SectionsTab({ timeRange }: SectionsTabProps) {
    const { currentRestaurant } = useAuth();
    const [orderBy, setOrderBy] = useState<string>('views');
    const [order, setOrder] = useState<Order>('desc');

    const { data, isLoading, error } = useQuery({
        queryKey: ['analytics-sections', currentRestaurant?.id, timeRange],
        queryFn: async () => {
            if (!currentRestaurant?.id) throw new Error('No restaurant selected');
            return await apiClient.getSectionAnalytics(currentRestaurant.id, { timeRange });
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
    if (error) return <Alert severity="error">Error al cargar datos de secciones</Alert>;

    const headers = [
        { id: 'name', label: 'Sección', align: 'left' },
        { id: 'views', label: 'Vistas de Sección', align: 'right', tooltip: 'Veces que se ha visualizado la sección' },
        { id: 'dish_views', label: 'Vistas de Platos', align: 'right', tooltip: 'Total de vistas de platos dentro de esta sección' },
        { id: 'avg_dwell_seconds', label: 'Tiempo Medio', align: 'right', tooltip: 'Tiempo medio de permanencia en la sección' },
        { id: 'avg_scroll_depth', label: 'Profundidad Scroll', align: 'right', tooltip: 'Porcentaje medio de scroll realizado' },
    ];

    return (
        <Card>
            <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Rendimiento de Secciones</Typography>
                <Typography variant="body2" color="text.secondary">
                    Análisis de qué categorías de tu menú atraen más atención.
                </Typography>
            </Box>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Sección</TableCell>
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
                            <TableRow key={row.section_id} hover>
                                <TableCell component="th" scope="row">
                                    <Typography variant="subtitle2">{row.name}</Typography>
                                </TableCell>
                                <TableCell align="right">{row.views}</TableCell>
                                <TableCell align="right">{row.dish_views}</TableCell>
                                <TableCell align="right">{row.avg_dwell_seconds.toFixed(1)}s</TableCell>
                                <TableCell align="right">{row.avg_scroll_depth.toFixed(0)}%</TableCell>
                            </TableRow>
                        ))}
                        {sortedData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
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
