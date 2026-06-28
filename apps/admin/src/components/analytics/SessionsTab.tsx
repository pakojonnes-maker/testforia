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
    Grid,
    Tooltip
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
    Visibility as VisibilityIcon,
    FiberNew as FiberNewIcon,
    Loop as LoopIcon,
    Language as LanguageIcon
} from '@mui/icons-material';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SessionsTabProps {
    timeRange: string;
}

// ✅ NEW: Recurrence badge component
function RecurrenceBadge({ visitCount }: { visitCount?: number }) {
    const count = visitCount || 1;
    if (count <= 1) {
        return (
            <Chip
                icon={<FiberNewIcon sx={{ fontSize: 14 }} />}
                label="Nueva"
                size="small"
                sx={{
                    bgcolor: 'rgba(34, 197, 94, 0.12)',
                    color: '#22c55e',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    height: 24,
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    '& .MuiChip-icon': { color: '#22c55e' }
                }}
            />
        );
    }
    return (
        <Tooltip title={`Este visitante ha venido ${count} veces`} arrow>
            <Chip
                icon={<LoopIcon sx={{ fontSize: 14 }} />}
                label={`x${count}`}
                size="small"
                sx={{
                    bgcolor: 'rgba(139, 92, 246, 0.12)',
                    color: '#8b5cf6',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    height: 24,
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    '& .MuiChip-icon': { color: '#8b5cf6' }
                }}
            />
        </Tooltip>
    );
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
                {/* ✅ NEW: Recurrence column */}
                <TableCell>
                    <RecurrenceBadge visitCount={row.visit_count} />
                </TableCell>
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
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                            <Typography variant="subtitle2" gutterBottom component="div">
                                Detalles de la Sesión
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={4}>
                                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                        INTERACCIONES
                                    </Typography>
                                    <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                                        <Chip icon={<VisibilityIcon />} label={`${row.events?.viewdish || 0} Platos vistos`} size="small" />
                                        <Chip icon={<FavoriteIcon />} label={`${row.events?.favorite || 0} Favoritos`} size="small" />
                                        <Chip label={`${row.events?.view_section || 0} Secciones`} size="small" variant="outlined" />
                                    </Stack>
                                </Grid>
                                <Grid item xs={12} md={4}>
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
                                {/* ✅ NEW: Session metadata with recurrence context */}
                                <Grid item xs={12} md={4}>
                                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                        CONTEXTO
                                    </Typography>
                                    <Stack spacing={0.5}>
                                        {row.visit_count > 1 && (
                                            <Typography variant="body2" sx={{ color: '#8b5cf6' }}>
                                                🔄 Visita nº {row.visit_count}
                                            </Typography>
                                        )}
                                        {row.language_code && (
                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                <LanguageIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    {row.language_code.toUpperCase()}
                                                </Typography>
                                            </Stack>
                                        )}
                                        {row.referrer && (
                                            <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                                                📎 {row.referrer}
                                            </Typography>
                                        )}
                                        {row.pwa_installed === 1 && (
                                            <Chip label="PWA" size="small" sx={{
                                                bgcolor: 'rgba(99, 102, 241, 0.12)',
                                                color: '#6366f1',
                                                fontWeight: 600,
                                                fontSize: '0.65rem',
                                                height: 20,
                                                width: 'fit-content'
                                            }} />
                                        )}
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}

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

    // ✅ NEW: Calculate recurrence summary from loaded sessions
    const recurrenceSummary = React.useMemo(() => {
        if (!data?.data) return null;
        const sessions = data.data;
        const newCount = sessions.filter((s: any) => !s.visit_count || s.visit_count <= 1).length;
        const returningCount = sessions.filter((s: any) => s.visit_count > 1).length;
        return { newCount, returningCount, total: sessions.length };
    }, [data?.data]);

    if (isLoading && !data) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">Error al cargar sesiones</Alert>;
    return (
        <Card>
            <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Sesiones de Usuarios</Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                        Registro detallado de visitas y comportamiento de usuarios.
                    </Typography>
                    {/* ✅ NEW: Inline recurrence summary */}
                    {recurrenceSummary && recurrenceSummary.total > 0 && (
                        <Stack direction="row" spacing={1}>
                            <Chip
                                icon={<FiberNewIcon sx={{ fontSize: 14 }} />}
                                label={`${recurrenceSummary.newCount} nuevas`}
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(34, 197, 94, 0.08)',
                                    color: '#22c55e',
                                    fontSize: '0.7rem',
                                    '& .MuiChip-icon': { color: '#22c55e' }
                                }}
                            />
                            <Chip
                                icon={<LoopIcon sx={{ fontSize: 14 }} />}
                                label={`${recurrenceSummary.returningCount} recurrentes`}
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(139, 92, 246, 0.08)',
                                    color: '#8b5cf6',
                                    fontSize: '0.7rem',
                                    '& .MuiChip-icon': { color: '#8b5cf6' }
                                }}
                            />
                        </Stack>
                    )}
                </Stack>
            </Box>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell />
                            <TableCell>Fecha</TableCell>
                            <TableCell>Usuario</TableCell>
                            <TableCell>Visita</TableCell>
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
                                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
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
