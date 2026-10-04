import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Alert, Box, Button, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControl, Grid, IconButton, InputLabel, MenuItem, Select, Stack, Switch, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    People, CheckCircle, EventSeat, HourglassEmpty, Edit, Email, Phone, ExpandMore, ExpandLess,
    ChevronLeft, ChevronRight, EventAvailable, History, TableRestaurant,
} from '@mui/icons-material';
import {
    addMonths, eachDayOfInterval, endOfMonth, format, getDay, isSameMonth, parseISO, startOfMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { apiClient, type Reservation, type ReservationUpdate } from '../lib/apiClient';
import { PageHeader } from '../components/common/PageHeader';
import { Panel } from '../components/common/Panel';
import { StatCard } from '../components/common/StatCard';
import { ReservationSettings } from '../components/reservations/ReservationSettings';
import { DATA, STATUS_COLORS } from '../theme';

type TabKey = 'calendar' | 'list' | 'logs' | 'settings';

const STATUS: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pendiente', color: STATUS_COLORS.pending },
    confirmed: { label: 'Confirmada', color: STATUS_COLORS.confirmed },
    completed: { label: 'Completada', color: STATUS_COLORS.completed },
    cancelled: { label: 'Cancelada', color: STATUS_COLORS.cancelled },
    cancelled_restaurant: { label: 'Denegada', color: STATUS_COLORS.cancelled },
    cancelled_user: { label: 'Cancelada por el cliente', color: STATUS_COLORS.cancelled },
    no_show: { label: 'No se presentó', color: STATUS_COLORS.no_show },
    waitlist: { label: 'En espera', color: STATUS_COLORS.waitlist },
};
const statusOf = (status: string) => STATUS[status] ?? { label: status, color: DATA.muted };

// Fechas siempre en local: `toISOString()` sobre una medianoche local daba el
// día anterior en España, y las reservas del 3 salían en la casilla del 4.
const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');
const WEEK_DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function StatusChip({ status }: { status: string }) {
    const s = statusOf(status);
    return <Chip size="small" label={s.label} sx={{ bgcolor: alpha(s.color, 0.1), color: s.color, fontWeight: 600 }} />;
}

function ReservationCard({ res, onEdit, onStatus, busy }: {
    res: Reservation;
    onEdit: (res: Reservation) => void;
    onStatus: (res: Reservation, status: string) => void;
    busy: boolean;
}) {
    const [open, setOpen] = useState(false);
    const color = statusOf(res.status).color;
    return (
        <Box sx={{ border: 1, borderColor: 'divider', borderLeft: `3px solid ${color}`, mb: 1.5, bgcolor: 'background.paper' }}>
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
                <Box sx={{ minWidth: 64, textAlign: 'center' }}>
                    <Typography variant="subtitle1" fontWeight={700} color="primary.main">{res.reservation_time}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {format(parseISO(res.reservation_date), 'd MMM', { locale: es })}
                    </Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={600} noWrap>{res.client_name}</Typography>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <People sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">{res.party_size}</Typography>
                        </Stack>
                        {res.table_assignment && (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                                <TableRestaurant sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">{res.table_assignment}</Typography>
                            </Stack>
                        )}
                    </Stack>
                </Box>
                <StatusChip status={res.status} />
                {open ? <ExpandLess /> : <ExpandMore />}
            </Box>
            <Collapse in={open}>
                <Box sx={{ px: 2, pb: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
                        <Button variant="outlined" size="small" startIcon={<Phone />} href={`tel:${res.client_phone}`}>{res.client_phone}</Button>
                        <Button variant="outlined" size="small" startIcon={<Email />} href={`mailto:${res.client_email}`}>{res.client_email}</Button>
                    </Stack>
                    {res.special_requests && (
                        <Typography variant="body2" sx={{ mb: 1 }}><strong>Cliente:</strong> {res.special_requests}</Typography>
                    )}
                    {res.admin_notes && (
                        <Typography variant="body2" sx={{ mb: 1, p: 1, bgcolor: alpha(DATA.cobalt, 0.06) }}>
                            <strong>Solo personal:</strong> {res.admin_notes}
                        </Typography>
                    )}
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button size="small" variant="contained" startIcon={<Edit />} onClick={() => onEdit(res)}>Editar</Button>
                        {res.status === 'pending' && (
                            <>
                                <Button size="small" variant="outlined" color="success" disabled={busy} onClick={() => onStatus(res, 'confirmed')}>Confirmar</Button>
                                <Button size="small" variant="outlined" color="error" disabled={busy} onClick={() => onStatus(res, 'cancelled_restaurant')}>Denegar</Button>
                            </>
                        )}
                        {res.status === 'confirmed' && (
                            <>
                                <Button size="small" variant="outlined" disabled={busy} onClick={() => onStatus(res, 'completed')}>Completada</Button>
                                <Button size="small" variant="outlined" color="inherit" disabled={busy} onClick={() => onStatus(res, 'no_show')}>No se presentó</Button>
                            </>
                        )}
                    </Stack>
                </Box>
            </Collapse>
        </Box>
    );
}

function MonthCalendar({ month, onMonth, selected, onSelect, byDate }: {
    month: Date;
    onMonth: (date: Date) => void;
    selected: string;
    onSelect: (key: string) => void;
    byDate: Map<string, Reservation[]>;
}) {
    const today = dayKey(new Date());
    const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
    const lead = (getDay(days[0]) + 6) % 7; // semana empieza en lunes

    return (
        <Panel>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={() => onMonth(addMonths(month, -1))} aria-label="Mes anterior"><ChevronLeft /></IconButton>
                <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>{format(month, 'LLLL yyyy', { locale: es })}</Typography>
                <IconButton onClick={() => onMonth(addMonths(month, 1))} aria-label="Mes siguiente"><ChevronRight /></IconButton>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                {WEEK_DAYS.map((d) => (
                    <Typography key={d} variant="caption" color="text.secondary" align="center" fontWeight={600}>{d}</Typography>
                ))}
                {Array.from({ length: lead }, (_, i) => <Box key={`pad-${i}`} />)}
                {days.map((day) => {
                    const key = dayKey(day);
                    const list = byDate.get(key) ?? [];
                    const confirmed = list.filter((r) => r.status === 'confirmed').length;
                    const pending = list.filter((r) => r.status === 'pending').length;
                    const isSelected = key === selected;
                    return (
                        <Box
                            key={key}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelect(key)}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(key)}
                            sx={{
                                minHeight: 64, p: 0.75, cursor: 'pointer',
                                border: 1, borderColor: isSelected ? 'primary.main' : 'divider',
                                bgcolor: isSelected ? alpha(DATA.cobalt, 0.08) : 'transparent',
                                opacity: isSameMonth(day, month) ? 1 : 0.4,
                                '&:hover': { bgcolor: alpha(DATA.cobalt, 0.04) },
                            }}
                        >
                            <Typography variant="body2" fontWeight={key === today ? 700 : 500} color={key === today ? 'primary.main' : 'text.primary'}>
                                {format(day, 'd')}
                            </Typography>
                            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                                {confirmed > 0 && <Box sx={{ px: 0.5, fontSize: 11, fontWeight: 700, color: '#fff', bgcolor: STATUS_COLORS.confirmed }}>{confirmed}</Box>}
                                {pending > 0 && <Box sx={{ px: 0.5, fontSize: 11, fontWeight: 700, color: '#1B1C1A', bgcolor: 'warning.main' }}>{pending}</Box>}
                            </Stack>
                        </Box>
                    );
                })}
            </Box>
        </Panel>
    );
}

const EMPTY_FORM = {
    date: '', time: '', party_size: 2, status: '', client_name: '', client_email: '', client_phone: '',
    special_requests: '', admin_notes: '', table_assignment: '',
};

function EditDialog({ reservation, onClose, onSave, saving }: {
    reservation: Reservation | null;
    onClose: () => void;
    onSave: (id: string, data: ReservationUpdate) => void;
    saving: boolean;
}) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [loadedId, setLoadedId] = useState<string | null>(null);
    // El formulario se rellena al abrir (y se olvida al cerrar, para no
    // reabrir con cambios que no se guardaron).
    if (!reservation && loadedId) setLoadedId(null);
    if (reservation && reservation.id !== loadedId) {
        setLoadedId(reservation.id);
        setForm({
            date: reservation.reservation_date, time: reservation.reservation_time, party_size: reservation.party_size,
            status: reservation.status, client_name: reservation.client_name, client_email: reservation.client_email,
            client_phone: reservation.client_phone, special_requests: reservation.special_requests || '',
            admin_notes: reservation.admin_notes || '', table_assignment: reservation.table_assignment || '',
        });
    }
    const field = (key: keyof typeof EMPTY_FORM) => ({
        value: form[key],
        onChange: (e: { target: { value: string } }) =>
            setForm({ ...form, [key]: key === 'party_size' ? parseInt(e.target.value, 10) || 1 : e.target.value }),
    });

    return (
        <Dialog open={!!reservation} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Editar reserva</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2} sx={{ mt: 0 }}>
                    <Grid item xs={6}><TextField label="Fecha" type="date" fullWidth InputLabelProps={{ shrink: true }} {...field('date')} /></Grid>
                    <Grid item xs={6}><TextField label="Hora" type="time" fullWidth InputLabelProps={{ shrink: true }} {...field('time')} /></Grid>
                    <Grid item xs={6}><TextField label="Personas" type="number" fullWidth inputProps={{ min: 1 }} {...field('party_size')} /></Grid>
                    <Grid item xs={6}>
                        <FormControl fullWidth>
                            <InputLabel>Estado</InputLabel>
                            <Select label="Estado" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                {['pending', 'confirmed', 'completed', 'cancelled_restaurant', 'no_show'].map((s) => (
                                    <MenuItem key={s} value={s}>{statusOf(s).label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}><TextField label="Nombre" fullWidth {...field('client_name')} /></Grid>
                    <Grid item xs={6}><TextField label="Teléfono" fullWidth {...field('client_phone')} /></Grid>
                    <Grid item xs={6}><TextField label="Email" fullWidth {...field('client_email')} /></Grid>
                    <Grid item xs={12}><TextField label="Notas del cliente" fullWidth multiline rows={2} helperText="Las ve el cliente" {...field('special_requests')} /></Grid>
                    <Grid item xs={12}><Typography variant="overline" color="text.secondary">Solo personal</Typography></Grid>
                    <Grid item xs={12} sm={4}><TextField label="Mesa" fullWidth placeholder="Mesa 5" {...field('table_assignment')} /></Grid>
                    <Grid item xs={12} sm={8}><TextField label="Notas internas" fullWidth multiline rows={2} placeholder="VIP, alergia, cumpleaños…" {...field('admin_notes')} /></Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" disabled={saving} onClick={() => reservation && onSave(reservation.id, form)}>
                    {saving ? 'Guardando…' : 'Guardar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default function ReservationsPage() {
    const { currentRestaurant } = useAuth();
    const restaurantId: string | undefined = currentRestaurant?.id;
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<TabKey>('calendar');
    const [month, setMonth] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(() => dayKey(new Date()));
    const [editing, setEditing] = useState<Reservation | null>(null);
    const [confirmDisable, setConfirmDisable] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Una sola lista: el calendario y el día seleccionado salen de ella.
    const { data: reservations = [], isLoading, refetch } = useQuery({
        queryKey: ['reservations', restaurantId],
        queryFn: async () => (await apiClient.getReservationsList(restaurantId!)).reservations ?? [],
        enabled: !!restaurantId,
    });
    const { data: isEnabled = false } = useQuery({
        queryKey: ['reservation-enabled', restaurantId],
        queryFn: async () => !!(await apiClient.getReservationSettings(restaurantId!))?.is_enabled,
        enabled: !!restaurantId,
    });
    const { data: logs = [], isLoading: logsLoading } = useQuery({
        queryKey: ['reservation-logs', restaurantId],
        queryFn: async () => (await apiClient.getReservationLogs(restaurantId!)).logs ?? [],
        enabled: !!restaurantId && tab === 'logs',
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['reservations', restaurantId] });
        queryClient.invalidateQueries({ queryKey: ['pending-reservations'] });
        queryClient.invalidateQueries({ queryKey: ['reservation-logs', restaurantId] });
    };
    const update = useMutation({
        mutationFn: ({ id, data }: { id: string; data: ReservationUpdate }) => apiClient.updateReservation(id, data),
        onSuccess: () => { invalidate(); setEditing(null); },
        onError: (e: Error) => setError(e.message || 'No se pudo guardar la reserva'),
    });
    const toggle = useMutation({
        mutationFn: (enabled: boolean) => apiClient.toggleReservations(restaurantId!, enabled),
        onSuccess: (_, enabled) => {
            queryClient.setQueryData(['reservation-enabled', restaurantId], enabled);
            setConfirmDisable(false);
        },
        onError: (e: Error) => setError(e.message || 'No se pudo cambiar el estado'),
    });

    const byDate = useMemo(() => {
        const map = new Map<string, Reservation[]>();
        for (const r of reservations) map.set(r.reservation_date, [...(map.get(r.reservation_date) ?? []), r]);
        return map;
    }, [reservations]);
    const dayList = useMemo(
        () => [...(byDate.get(selectedDate) ?? [])].sort((a, b) => a.reservation_time.localeCompare(b.reservation_time)),
        [byDate, selectedDate],
    );
    const stats = useMemo(() => ({
        total: dayList.length,
        confirmed: dayList.filter((r) => r.status === 'confirmed').length,
        pending: dayList.filter((r) => r.status === 'pending').length,
        covers: dayList.filter((r) => r.status === 'confirmed' || r.status === 'pending').reduce((s, r) => s + r.party_size, 0),
    }), [dayList]);

    if (!restaurantId) return <Alert severity="info">Selecciona un restaurante.</Alert>;

    const card = (res: Reservation) => (
        <ReservationCard key={res.id} res={res} onEdit={setEditing} busy={update.isPending}
            onStatus={(r, status) => update.mutate({ id: r.id, data: { status } })} />
    );
    const listOrEmpty = (list: Reservation[], empty: string): ReactNode =>
        isLoading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            : list.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.disabled' }}>
                    <EventSeat sx={{ fontSize: 44 }} />
                    <Typography color="text.secondary">{empty}</Typography>
                </Box>
            ) : list.map(card);

    return (
        <Box>
            <PageHeader
                icon={<EventAvailable />}
                title="Reservas"
                subtitle={isEnabled ? 'Los clientes pueden reservar desde la carta' : 'Las reservas desde la carta están desactivadas'}
                actions={
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 0.5, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                        <Typography variant="body2" fontWeight={600} sx={{ color: isEnabled ? STATUS_COLORS.confirmed : 'text.secondary' }}>
                            {isEnabled ? 'Activas' : 'Desactivadas'}
                        </Typography>
                        <Switch checked={isEnabled} disabled={toggle.isPending}
                            onChange={() => (isEnabled ? setConfirmDisable(true) : toggle.mutate(true))}
                            inputProps={{ 'aria-label': 'Activar reservas' }} />
                    </Stack>
                }
            />

            {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>{error}</Alert>}

            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tab value="calendar" label="Calendario" />
                <Tab value="list" label="Todas" />
                <Tab value="logs" label="Registro" />
                <Tab value="settings" label="Ajustes" />
            </Tabs>

            {tab === 'calendar' && (
                <>
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={6} md={3}><StatCard icon={<EventSeat />} title="Reservas del día" value={stats.total} color={DATA.sea} /></Grid>
                        <Grid item xs={6} md={3}><StatCard icon={<CheckCircle />} title="Confirmadas" value={stats.confirmed} color={STATUS_COLORS.confirmed} /></Grid>
                        <Grid item xs={6} md={3}><StatCard icon={<HourglassEmpty />} title="Pendientes" value={stats.pending} color={STATUS_COLORS.pending} /></Grid>
                        <Grid item xs={6} md={3}><StatCard icon={<People />} title="Comensales" value={stats.covers} color={DATA.cobalt} /></Grid>
                    </Grid>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={5} lg={4}>
                            <MonthCalendar month={month} onMonth={setMonth} selected={selectedDate} onSelect={setSelectedDate} byDate={byDate} />
                        </Grid>
                        <Grid item xs={12} md={7} lg={8}>
                            <Panel
                                title={format(parseISO(selectedDate), "EEEE d 'de' MMMM", { locale: es })}
                                action={<Button size="small" onClick={() => refetch()}>Actualizar</Button>}
                            >
                                {listOrEmpty(dayList, 'No hay reservas este día')}
                            </Panel>
                        </Grid>
                    </Grid>
                </>
            )}

            {tab === 'list' && (
                <Panel title="Todas las reservas" action={<Button size="small" onClick={() => refetch()}>Actualizar</Button>}>
                    {listOrEmpty(reservations, 'Todavía no hay reservas')}
                </Panel>
            )}

            {tab === 'logs' && (
                <Panel icon={<History />} title="Registro" subtitle="Últimos 50 cambios">
                    {logsLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
                    ) : logs.length === 0 ? (
                        <Typography color="text.secondary">Sin cambios registrados.</Typography>
                    ) : logs.map((log: any) => (
                        <Box key={log.id} sx={{ py: 1.25, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                            <Typography variant="body2">
                                <strong>{log.client_name || 'Reserva'}</strong>
                                {' — '}
                                {log.previous_state ? `${statusOf(log.previous_state).label} → ` : ''}
                                {statusOf(log.new_state || '').label || log.reason}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {new Date(log.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                        </Box>
                    ))}
                </Panel>
            )}

            {tab === 'settings' && <ReservationSettings restaurantId={restaurantId} isEnabled={isEnabled} />}

            <Dialog open={confirmDisable} onClose={() => setConfirmDisable(false)} fullWidth maxWidth="xs">
                <DialogTitle>¿Desactivar las reservas?</DialogTitle>
                <DialogContent><Typography variant="body2">Los clientes no podrán hacer reservas nuevas desde la carta.</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDisable(false)}>Cancelar</Button>
                    <Button onClick={() => toggle.mutate(false)} color="error" variant="contained" disabled={toggle.isPending}>Desactivar</Button>
                </DialogActions>
            </Dialog>

            <EditDialog reservation={editing} onClose={() => setEditing(null)} saving={update.isPending}
                onSave={(id, data) => update.mutate({ id, data })} />
        </Box>
    );
}
