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
    CircularProgress,
    Alert,
    Chip,
    IconButton,
    Collapse,
    TablePagination,
    Stack,
    Divider
} from '@mui/material';
import {
    KeyboardArrowDown as KeyboardArrowDownIcon,
    KeyboardArrowUp as KeyboardArrowUpIcon,
    Smartphone as SmartphoneIcon,
    Computer as ComputerIcon,
    Public as PublicIcon,
    AccessTime as AccessTimeIcon,
    ShoppingCart as ShoppingCartIcon,
    Favorite as FavoriteIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
interface SessionsTabProps {
    timeRange: string;
}
function SessionRow({ row, defaultOpen = false }: { row: any; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    const getDeviceIcon = (type: string) => {
        if (type?.toLowerCase().includes('mobile')) return <SmartphoneIcon fontSize="small" />;
        return <ComputerIcon fontSize="small" />;
    };
    const formatDuration = (seconds: number) => {
        if (!seconds) return '-';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };
    return (
        <React.Fragment>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' } }} hover onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>
                <TableCell>
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpen(!open);
                        }}
                    >
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell component="th" scope="row">
                    <Stack direction="row" spacing={1} alignItems="center">
                        <AccessTimeIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                            {format(new Date(row.started_at), "d MMM HH:mm", { locale: es })}
                        </Typography>
                    </Stack>
                </TableCell>
                <TableCell>{row.user_name || 'Invitado'}</TableCell>
                <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                        {getDeviceIcon(row.device_type)}
                        <Typography variant="body2">{row.os_name} - {row.browser}</Typography>
                    </Stack>
                </TableCell>
                <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <PublicIcon fontSize="small" color="action" />
                        <Typography variant="body2">{row.city}, {row.country}</Typography>
                    </Stack>
                </TableCell>
                <TableCell align="right">{formatDuration(row.duration_seconds)}</TableCell>
                <TableCell align="right">
                    {row.cart_value > 0 ? (
                        <Chip
                            icon={<ShoppingCartIcon fontSize="small" />}
                            label={`${row.cart_value.toFixed(2)}€`}
                            color="success"
                            size="small"
                            variant="outlined"
                        />
                    ) : '-'}
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                            <Typography variant="subtitle2" gutterBottom component="div">
                                Detalles de la Sesión
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                        INTERACCIONES
                                    </Typography>
                                    <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                                        <Chip icon={<VisibilityIcon />} label={`${row.events?.viewdish || 0} Platos vistos`} size="small" />
                                        <Chip icon={<FavoriteIcon />} label={`${row.events?.favorite || 0} Favoritos`} size="small" />
                                        <Chip label={`${row.events?.view_section || 0} Secciones`} size="small" variant="outlined" />
                                    </Stack>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                        PLATOS QUE GUSTARON
                                    </Typography>
                                    {row.liked_dishes && row.liked_dishes.length > 0 ? (
                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                            {row.liked_dishes.map((dish: string, idx: number) => (
                                                <Chip key={idx} label={dish} size="small" color="primary" variant="outlined" />
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">Ninguno</Typography>
                                    )}
                                </Grid>
                            </Grid>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}
import { Grid } from '@mui/material';
export default function SessionsTab({ timeRange }: SessionsTabProps) {
    const { currentRestaurant } = useAuth();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const { data, isLoading, error } = useQuery({
        queryKey: ['analytics-sessions', currentRestaurant?.id, timeRange, page, rowsPerPage],
        queryFn: async () => {
            if (!currentRestaurant?.id) throw new Error('No restaurant selected');
            return await apiClient.getSessionAnalytics(currentRestaurant.id, {
                timeRange,
                page: page + 1,
                limit: rowsPerPage
            });
        },
        enabled: !!currentRestaurant?.id,
        keepPreviousData: true,
    });
    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    if (isLoading && !data) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">Error al cargar sesiones</Alert>;
    return (
        <Card>
            <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Sesiones de Usuarios</Typography>
                <Typography variant="body2" color="text.secondary">
                    Registro detallado de visitas y comportamiento de usuarios.
                </Typography>
            </Box>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell />
                            <TableCell>Fecha</TableCell>
                            <TableCell>Usuario</TableCell>
                            <TableCell>Dispositivo</TableCell>
                            <TableCell>Ubicación</TableCell>
                            <TableCell align="right">Duración</TableCell>
                            <TableCell align="right">Carrito</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data?.data?.map((row: any, index: number) => (
                            <SessionRow key={row.id} row={row} defaultOpen={index === 0} />
                        ))}
                        {(!data?.data || data.data.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">No hay sesiones registradas en este periodo</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={data?.pagination?.total || 0}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Filas por página"
            />
        </Card>
    );
}
