import { Fragment, useMemo, useState, type ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert, Box, Chip, CircularProgress, Collapse, Grid, IconButton, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TablePagination, TableRow, Tooltip, Typography,
} from '@mui/material';
import {
    KeyboardArrowDown as KeyboardArrowDownIcon,
    KeyboardArrowUp as KeyboardArrowUpIcon,
    Smartphone as SmartphoneIcon,
    Computer as ComputerIcon,
    History as HistoryIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { Panel } from '../common/Panel';
import { DATA } from '../../theme';

interface SessionRowData {
    id: string;
    started_at: string;
    duration_seconds: number | null;
    device_type: string | null;
    os_name: string | null;
    browser: string | null;
    country: string | null;
    city: string | null;
    visit_count: number | null;
    language_code: string | null;
    referrer: string | null;
    pwa_installed: number | null;
    user_name: string | null;
    cart_value: number | null;
    events: Record<string, number>;
    liked_dishes: string[];
}

function RecurrenceBadge({ visitCount }: { visitCount: number | null }) {
    const count = visitCount || 1;
    if (count <= 1) {
        return <Chip label="Nueva" size="small" variant="outlined" sx={{ color: DATA.olive, borderColor: DATA.olive, fontWeight: 600 }} />;
    }
    return (
        <Tooltip title={`Este visitante ha venido ${count} veces`}>
            <Chip label={`×${count}`} size="small" sx={{ bgcolor: DATA.cobalt, color: '#FFFFFF', fontWeight: 700 }} />
        </Tooltip>
    );
}

const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—';
    return `${Math.floor(seconds / 60)} m ${seconds % 60} s`;
};

const joinParts = (parts: Array<string | null>, empty: string) => parts.filter(Boolean).join(' · ') || empty;

function SessionRow({ row, defaultOpen }: { row: SessionRowData; defaultOpen: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    const isMobileDevice = row.device_type?.toLowerCase().includes('mobile');
    return (
        <Fragment>
            <TableRow hover onClick={() => setOpen(!open)} sx={{ cursor: 'pointer', '& > *': { borderBottom: open ? 'unset' : undefined } }}>
                <TableCell padding="checkbox">
                    <IconButton size="small" aria-label={open ? 'Plegar' : 'Desplegar'}>
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell>{format(new Date(row.started_at), 'd MMM HH:mm', { locale: es })}</TableCell>
                <TableCell>{row.user_name || 'Invitado'}</TableCell>
                <TableCell><RecurrenceBadge visitCount={row.visit_count} /></TableCell>
                <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                        {isMobileDevice ? <SmartphoneIcon fontSize="small" color="action" /> : <ComputerIcon fontSize="small" color="action" />}
                        <Typography variant="body2">{joinParts([row.os_name, row.browser], 'Desconocido')}</Typography>
                    </Stack>
                </TableCell>
                <TableCell>{joinParts([row.city, row.country], '—')}</TableCell>
                <TableCell align="right">{formatDuration(row.duration_seconds)}</TableCell>
                <TableCell align="right">
                    {row.cart_value && row.cart_value > 0 ? (
                        <Typography variant="body2" sx={{ fontWeight: 700, color: DATA.olive }}>{row.cart_value.toFixed(2)} €</Typography>
                    ) : '—'}
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell sx={{ py: 0 }} colSpan={8}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Grid container spacing={3} sx={{ py: 2 }}>
                            <Grid item xs={12} md={4}>
                                <Typography variant="overline" color="text.secondary">Interacciones</Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                    <Chip label={`${row.events?.viewdish || 0} platos vistos`} size="small" variant="outlined" />
                                    <Chip label={`${row.events?.favorite || 0} favoritos`} size="small" variant="outlined" />
                                    <Chip label={`${row.events?.view_section || 0} secciones`} size="small" variant="outlined" />
                                </Stack>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography variant="overline" color="text.secondary">Platos que gustaron</Typography>
                                {row.liked_dishes?.length > 0 ? (
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                        {row.liked_dishes.map((dish) => <Chip key={dish} label={dish} size="small" color="primary" variant="outlined" />)}
                                    </Stack>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">Ninguno</Typography>
                                )}
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography variant="overline" color="text.secondary">Contexto</Typography>
                                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                    {(row.visit_count ?? 0) > 1 && <Typography variant="body2">Visita nº {row.visit_count}</Typography>}
                                    {row.language_code && <Typography variant="body2" color="text.secondary">Idioma: {row.language_code.toUpperCase()}</Typography>}
                                    {row.referrer && (
                                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 260 }}>Viene de: {row.referrer}</Typography>
                                    )}
                                    {row.pwa_installed === 1 && <Chip label="App instalada (PWA)" size="small" variant="outlined" sx={{ width: 'fit-content' }} />}
                                </Stack>
                            </Grid>
                        </Grid>
                    </Collapse>
                </TableCell>
            </TableRow>
        </Fragment>
    );
}

export default function SessionsTab({ timeRange }: { timeRange: string }) {
    const { currentRestaurant } = useAuth();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const { data, isLoading, isError } = useQuery({
        queryKey: ['analytics-sessions', currentRestaurant?.id, timeRange, page, rowsPerPage],
        queryFn: () => apiClient.getSessionAnalytics(currentRestaurant!.id, { timeRange, page: page + 1, limit: rowsPerPage }),
        enabled: !!currentRestaurant?.id,
        keepPreviousData: true,
    });
    const rows: SessionRowData[] = data?.data ?? [];

    // Nuevas/recurrentes de la página cargada.
    const summary = useMemo(() => ({
        newCount: rows.filter((s) => !s.visit_count || s.visit_count <= 1).length,
        returningCount: rows.filter((s) => (s.visit_count ?? 0) > 1).length,
    }), [rows]);

    return (
        <Panel
            flush
            icon={<HistoryIcon />}
            title="Sesiones"
            subtitle="Registro de visitas a la carta y lo que hizo cada una."
            action={rows.length > 0 && (
                <Stack direction="row" spacing={1}>
                    <Chip size="small" variant="outlined" label={`${summary.newCount} nuevas`} sx={{ color: DATA.olive, borderColor: DATA.olive }} />
                    <Chip size="small" variant="outlined" label={`${summary.returningCount} recurrentes`} sx={{ color: DATA.cobalt, borderColor: DATA.cobalt }} />
                </Stack>
            )}
        >
            {isLoading && !data ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
            ) : isError ? (
                <Alert severity="error" sx={{ m: 3 }}>No se pudieron cargar las sesiones</Alert>
            ) : (
                <>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell padding="checkbox" />
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
                                {rows.map((row, index) => <SessionRow key={row.id} row={row} defaultOpen={index === 0} />)}
                                {rows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">No hay sesiones en este periodo</Typography>
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
                        onPageChange={(_, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e: ChangeEvent<HTMLInputElement>) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        labelRowsPerPage="Filas por página"
                    />
                </>
            )}
        </Panel>
    );
}
