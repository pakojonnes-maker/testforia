import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Paper, Switch, FormControlLabel,
    Button, Dialog, DialogTitle, DialogContent, DialogActions,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Tabs, Tab, Chip, IconButton, CircularProgress,
    TextField, Grid, Select, MenuItem, InputLabel, FormControl,
    Card, CardContent, Avatar, Tooltip, alpha, useTheme, useMediaQuery,
    Stack, Collapse, Badge
} from '@mui/material';
import {
    People, AccessTime, CheckCircle, Cancel, EventSeat,
    Warning, Refresh, History, ThumbDown, PlaylistAddCheck,
    Email, Phone, Edit, CalendarViewDay, TrendingUp,
    Restaurant, EventAvailable, HourglassEmpty, Block,
    ExpandMore, ExpandLess, TableRestaurant, Notes,
    ChevronLeft, ChevronRight
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/apiClient';
import { ReservationCalendar } from '../components/reservations/ReservationCalendar';
import { ReservationSettings } from '../components/reservations/ReservationSettings';

interface Reservation {
    id: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    reservation_date: string;
    reservation_time: string;
    party_size: number;
    status: string;
    special_requests?: string;
    admin_notes?: string;
    table_assignment?: string;
    created_at: string;
}

const ReservationsPage: React.FC = () => {
    const { currentRestaurant } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));

    // Main Data State
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [allReservations, setAllReservations] = useState<Reservation[]>([]);
    const [logs, setLogs] = useState<any[]>([]);

    // UI State
    const [currentTab, setCurrentTab] = useState(0);
    const [listLoading, setListLoading] = useState(false);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    // Settings Toggle State
    const [isEnabled, setIsEnabled] = useState(false);
    const [showSafetyDialog, setShowSafetyDialog] = useState(false);
    const [toggleLoading, setToggleLoading] = useState(false);

    // Calendar State
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const restaurantId = currentRestaurant?.id;

    // Edit Dialog State
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
    const [editForm, setEditForm] = useState({
        date: '', time: '', party_size: 2, status: '',
        client_name: '', client_email: '', client_phone: '',
        special_requests: '', admin_notes: '', table_assignment: ''
    });

    // Load Settings
    useEffect(() => {
        if (restaurantId) {
            apiClient.getReservationSettings(restaurantId)
                .then(settings => setIsEnabled(settings?.is_enabled || false))
                .catch(err => console.error(err));
        }
    }, [restaurantId]);

    // Load Data on Tab Change
    useEffect(() => {
        if (!restaurantId) return;
        if (currentTab === 0) {
            loadReservations();
            loadAllReservationsForCalendar();
        } else if (currentTab === 1) loadReservationsAll();
        else if (currentTab === 3) loadLogs();
    }, [restaurantId, currentTab, selectedDate]);

    const loadReservations = async () => {
        setListLoading(true);
        try {
            const data = await apiClient.getReservationsList(restaurantId!, selectedDate);
            if (data.success) setReservations(data.reservations);
        } catch (error) { console.error(error); }
        finally { setListLoading(false); }
    };

    const loadAllReservationsForCalendar = async () => {
        try {
            const data = await apiClient.getReservationsList(restaurantId!);
            if (data.success) setAllReservations(data.reservations);
        } catch (error) { console.error(error); }
    };

    const loadReservationsAll = async () => {
        setListLoading(true);
        try {
            const data = await apiClient.getReservationsList(restaurantId!);
            if (data.success) setReservations(data.reservations);
        } catch (error) { console.error(error); }
        finally { setListLoading(false); }
    };

    const loadLogs = async () => {
        setListLoading(true);
        try {
            const data = await apiClient.getReservationLogs(restaurantId!);
            if (data.success) setLogs(data.logs);
        } catch (error) { console.error(error); }
        finally { setListLoading(false); }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await apiClient.reservations.updateReservation(id, { status: newStatus });
            loadReservations();
            loadAllReservationsForCalendar();
        } catch (error) { console.error(error); }
    };

    const handleEditClick = (res: Reservation) => {
        setEditingReservation(res);
        setEditForm({
            date: res.reservation_date, time: res.reservation_time,
            party_size: res.party_size, status: res.status,
            client_name: res.client_name, client_email: res.client_email,
            client_phone: res.client_phone, special_requests: res.special_requests || '',
            admin_notes: res.admin_notes || '', table_assignment: res.table_assignment || ''
        });
        setEditDialogOpen(true);
    };

    const handleEditSave = async () => {
        if (!editingReservation) return;
        try {
            await apiClient.reservations.updateReservation(editingReservation.id, editForm);
            setEditDialogOpen(false);
            setEditingReservation(null);
            loadReservations();
            loadAllReservationsForCalendar();
        } catch (error) { console.error("Failed to update", error); }
    };

    const handleToggleConfirm = async (newState: boolean) => {
        if (!restaurantId) return;
        setToggleLoading(true);
        try {
            await apiClient.toggleReservations(restaurantId, newState);
            setIsEnabled(newState);
            setShowSafetyDialog(false);
        } catch (error) { console.error(error); }
        finally { setToggleLoading(false); }
    };

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
            confirmed: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: <CheckCircle fontSize="small" />, label: 'Confirmada' },
            pending: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: <HourglassEmpty fontSize="small" />, label: 'Pendiente' },
            cancelled: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: <Cancel fontSize="small" />, label: 'Cancelada' },
            cancelled_restaurant: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: <Block fontSize="small" />, label: 'Denegada' },
            cancelled_user: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.1)', icon: <Cancel fontSize="small" />, label: 'Cancelada' },
            no_show: { color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)', icon: <ThumbDown fontSize="small" />, label: 'No Show' },
            completed: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', icon: <EventAvailable fontSize="small" />, label: 'Completada' },
            waitlist: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', icon: <PlaylistAddCheck fontSize="small" />, label: 'Espera' },
        };
        return configs[status] || { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', icon: null, label: status };
    };

    // Stats
    const todayStats = {
        total: reservations.length,
        confirmed: reservations.filter(r => r.status === 'confirmed').length,
        pending: reservations.filter(r => r.status === 'pending').length,
        covers: reservations.filter(r => ['confirmed', 'pending'].includes(r.status)).reduce((sum, r) => sum + r.party_size, 0),
    };

    // Calendar data - group reservations by date
    const reservationsByDate = useMemo(() => {
        const map: Record<string, Reservation[]> = {};
        allReservations.forEach(r => {
            if (!map[r.reservation_date]) map[r.reservation_date] = [];
            map[r.reservation_date].push(r);
        });
        return map;
    }, [allReservations]);

    // Calendar Helper
    const getCalendarDays = () => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday start

        const days: (Date | null)[] = [];
        for (let i = 0; i < startPadding; i++) days.push(null);
        for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
        return days;
    };

    const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

    // Mobile Reservation Card
    const MobileReservationCard = ({ res }: { res: Reservation }) => {
        const status = getStatusConfig(res.status);
        const isExpanded = expandedCard === res.id;

        return (
            <Paper elevation={0} sx={{ mb: 2, borderRadius: 3, border: `1px solid ${alpha(status.color, 0.3)}`, bgcolor: alpha(status.color, 0.05), overflow: 'hidden' }}>
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }} onClick={() => setExpandedCard(isExpanded ? null : res.id)}>
                    <Box sx={{ minWidth: 60, textAlign: 'center', py: 1, px: 1, borderRadius: 2, bgcolor: alpha('#3b82f6', 0.15) }}>
                        <Typography variant="subtitle2" fontWeight="800" color="#60a5fa">{res.reservation_time}</Typography>
                    </Box>
                    <Box flex={1} overflow="hidden">
                        <Typography variant="subtitle1" fontWeight="700" noWrap>{res.client_name}</Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                            <People fontSize="small" sx={{ color: '#94a3b8', fontSize: 16 }} />
                            <Typography variant="body2" color="text.secondary">{res.party_size}</Typography>
                            {res.table_assignment && (
                                <Chip icon={<TableRestaurant sx={{ fontSize: 14 }} />} label={res.table_assignment} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                            )}
                        </Box>
                    </Box>
                    <Chip label={status.label} size="small" sx={{ bgcolor: status.bg, color: status.color, fontWeight: 600, fontSize: '0.7rem' }} />
                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </Box>

                <Collapse in={isExpanded}>
                    <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <Stack spacing={1} mb={2}>
                            <Button fullWidth variant="outlined" size="small" startIcon={<Phone />} href={`tel:${res.client_phone}`} sx={{ justifyContent: 'flex-start', color: '#f8fafc' }}>
                                {res.client_phone}
                            </Button>
                            <Button fullWidth variant="outlined" size="small" startIcon={<Email />} href={`mailto:${res.client_email}`} sx={{ justifyContent: 'flex-start', color: '#94a3b8' }}>
                                {res.client_email}
                            </Button>
                        </Stack>
                        {res.special_requests && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>📝 Cliente: {res.special_requests}</Typography>}
                        {res.admin_notes && <Typography variant="body2" sx={{ mb: 1, p: 1, bgcolor: 'rgba(59,130,246,0.1)', borderRadius: 1 }}>🔒 Staff: {res.admin_notes}</Typography>}

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Button size="small" variant="contained" startIcon={<Edit />} onClick={() => handleEditClick(res)}>Editar</Button>
                            {res.status === 'pending' && (
                                <>
                                    <Button size="small" color="success" variant="outlined" onClick={() => handleStatusChange(res.id, 'confirmed')}>✓</Button>
                                    <Button size="small" color="error" variant="outlined" onClick={() => handleStatusChange(res.id, 'cancelled_restaurant')}>✗</Button>
                                </>
                            )}
                        </Stack>
                    </Box>
                </Collapse>
            </Paper>
        );
    };

    // Stat Card
    const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) => (
        <Card sx={{ background: `linear-gradient(135deg, rgba(30, 41, 59, 0.8), ${alpha(color, 0.2)})`, border: 'none' }}>
            <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Box display="flex" alignItems="center" gap={isMobile ? 1.5 : 2}>
                    <Avatar sx={{ bgcolor: alpha(color, 0.2), color: color, width: isMobile ? 40 : 44, height: isMobile ? 40 : 44 }}>{icon}</Avatar>
                    <Box>
                        <Typography variant={isMobile ? "h5" : "h4"} fontWeight="800" color="#fff">{value}</Typography>
                        <Typography variant="caption" sx={{ color: alpha('#fff', 0.7), fontWeight: 500 }}>{label}</Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );

    // Desktop Calendar Component
    const DesktopCalendar = () => {
        const days = getCalendarDays();
        const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const today = new Date().toISOString().split('T')[0];

        return (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, mb: 3 }}>
                {/* Calendar Header */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <IconButton onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}>
                        <ChevronLeft />
                    </IconButton>
                    <Typography variant="h6" fontWeight="700">
                        {calendarMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </Typography>
                    <IconButton onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}>
                        <ChevronRight />
                    </IconButton>
                </Box>

                {/* Week Day Headers */}
                <Grid container spacing={0.5} mb={1}>
                    {weekDays.map(d => (
                        <Grid item xs={12 / 7} key={d}>
                            <Typography variant="caption" color="text.secondary" align="center" display="block" fontWeight="600">{d}</Typography>
                        </Grid>
                    ))}
                </Grid>

                {/* Calendar Days Grid */}
                <Grid container spacing={0.5}>
                    {days.map((day, idx) => {
                        if (!day) return <Grid item xs={12 / 7} key={`empty-${idx}`}><Box sx={{ height: 70 }} /></Grid>;

                        const dateKey = formatDateKey(day);
                        const dayReservations = reservationsByDate[dateKey] || [];
                        const isToday = dateKey === today;
                        const isSelected = dateKey === selectedDate;
                        const confirmed = dayReservations.filter(r => r.status === 'confirmed').length;
                        const pending = dayReservations.filter(r => r.status === 'pending').length;

                        return (
                            <Grid item xs={12 / 7} key={dateKey}>
                                <Paper
                                    elevation={0}
                                    onClick={() => setSelectedDate(dateKey)}
                                    sx={{
                                        height: 70,
                                        p: 1,
                                        cursor: 'pointer',
                                        borderRadius: 2,
                                        border: isSelected ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.05)',
                                        bgcolor: isSelected ? 'rgba(59,130,246,0.15)' : isToday ? 'rgba(16,185,129,0.1)' : 'transparent',
                                        transition: 'all 0.2s',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                                    }}
                                >
                                    <Typography variant="body2" fontWeight={isToday ? 700 : 500} color={isToday ? '#10b981' : 'text.primary'}>
                                        {day.getDate()}
                                    </Typography>
                                    {dayReservations.length > 0 && (
                                        <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                                            {confirmed > 0 && <Chip label={confirmed} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(16,185,129,0.3)', color: '#10b981' }} />}
                                            {pending > 0 && <Chip label={pending} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(245,158,11,0.3)', color: '#f59e0b' }} />}
                                        </Box>
                                    )}
                                </Paper>
                            </Grid>
                        );
                    })}
                </Grid>
            </Paper>
        );
    };

    return (
        <Box sx={{ minHeight: '100vh', px: isMobile ? 1 : 0 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 2, mb: 3, pb: 2, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Box>
                    <Typography variant={isMobile ? "h5" : "h4"} fontWeight="800" sx={{ background: 'linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Reservas
                    </Typography>
                </Box>
                <Paper elevation={0} sx={{ p: isMobile ? 1.5 : 2, display: 'flex', alignItems: 'center', gap: 1.5, borderRadius: 2, bgcolor: isEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${isEnabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isEnabled ? '#10b981' : '#ef4444', boxShadow: `0 0 8px ${isEnabled ? '#10b981' : '#ef4444'}` }} />
                    <Typography variant="body2" fontWeight="600" color={isEnabled ? '#10b981' : '#ef4444'}>{isEnabled ? 'Activo' : 'Inactivo'}</Typography>
                    <Switch checked={isEnabled} onChange={() => isEnabled ? setShowSafetyDialog(true) : handleToggleConfirm(true)} disabled={toggleLoading} size="small" />
                </Paper>
            </Box>

            {/* Stats */}
            {currentTab === 0 && (
                <Grid container spacing={isMobile ? 1.5 : 2} sx={{ mb: 3 }}>
                    <Grid item xs={6} md={3}><StatCard icon={<EventSeat />} label="Total" value={todayStats.total} color="#3b82f6" /></Grid>
                    <Grid item xs={6} md={3}><StatCard icon={<CheckCircle />} label="Confirmadas" value={todayStats.confirmed} color="#10b981" /></Grid>
                    <Grid item xs={6} md={3}><StatCard icon={<HourglassEmpty />} label="Pendientes" value={todayStats.pending} color="#f59e0b" /></Grid>
                    <Grid item xs={6} md={3}><StatCard icon={<People />} label="Comensales" value={todayStats.covers} color="#8b5cf6" /></Grid>
                </Grid>
            )}

            {/* Tabs */}
            <Paper elevation={0} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} variant={isMobile ? "scrollable" : "standard"} scrollButtons={isMobile ? "auto" : false} sx={{ '& .MuiTab-root': { minWidth: isMobile ? 'auto' : 120, py: 1.5, px: isMobile ? 2 : 3 } }}>
                    <Tab icon={<Restaurant />} iconPosition="start" label={isMobile ? "" : "Calendario"} />
                    <Tab icon={<TrendingUp />} iconPosition="start" label={isMobile ? "" : "Lista"} />
                    <Tab icon={<PlaylistAddCheck />} iconPosition="start" label={isMobile ? "" : "Espera"} />
                    <Tab icon={<History />} iconPosition="start" label={isMobile ? "" : "Logs"} />
                    <Tab label="⚙️" />
                </Tabs>
            </Paper>

            {/* Main Content */}
            <Box>
                {/* Tab 0: Calendar + Day View */}
                {currentTab === 0 && (
                    <Grid container spacing={3}>
                        {/* Calendar - PC Only */}
                        {!isMobile && (
                            <Grid item md={5} lg={4}>
                                <DesktopCalendar />
                            </Grid>
                        )}

                        {/* Day View */}
                        <Grid item xs={12} md={7} lg={8}>
                            <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, borderRadius: 2 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                                    <Typography variant="h6" fontWeight="700">
                                        {new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </Typography>
                                    <Box display="flex" gap={1}>
                                        {isMobile && (
                                            <TextField type="date" size="small" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} sx={{ width: 150 }} />
                                        )}
                                        <IconButton onClick={loadReservations} disabled={listLoading}><Refresh /></IconButton>
                                    </Box>
                                </Box>

                                {listLoading ? (
                                    <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
                                ) : reservations.length === 0 ? (
                                    <Box textAlign="center" py={6}>
                                        <EventSeat sx={{ fontSize: 48, color: 'rgba(255,255,255,0.1)', mb: 1 }} />
                                        <Typography color="text.secondary">No hay reservas</Typography>
                                    </Box>
                                ) : (
                                    reservations.sort((a, b) => a.reservation_time.localeCompare(b.reservation_time)).map(res => (
                                        <MobileReservationCard key={res.id} res={res} />
                                    ))
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                )}

                {/* Tab 1: Full List */}
                {currentTab === 1 && (
                    <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, borderRadius: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                            <Typography variant="h6" fontWeight="700">Todas las Reservas</Typography>
                            <Button startIcon={<Refresh />} variant="outlined" onClick={loadReservationsAll} disabled={listLoading}>Actualizar</Button>
                        </Box>
                        {listLoading ? <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box> : (
                            reservations.map(res => <MobileReservationCard key={res.id} res={res} />)
                        )}
                    </Paper>
                )}

                {/* Tab 2: Waitlist */}
                {currentTab === 2 && (
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, textAlign: 'center', py: 8 }}>
                        <PlaylistAddCheck sx={{ fontSize: 48, color: 'rgba(255,255,255,0.1)', mb: 1 }} />
                        <Typography color="text.secondary">Próximamente</Typography>
                    </Paper>
                )}

                {/* Tab 3: Logs */}
                {currentTab === 3 && (
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2 }}>
                        {logs.map(log => (
                            <Paper key={log.id} elevation={0} sx={{ p: 2, mb: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                                    <Typography variant="caption" color="text.secondary">{new Date(log.created_at).toLocaleString()}</Typography>
                                    <Chip label={log.action} size="small" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }} />
                                </Box>
                                <Typography variant="body2" mt={0.5}>{log.client_name || 'Reserva'} - {log.reason || log.new_state || '-'}</Typography>
                            </Paper>
                        ))}
                    </Paper>
                )}

                {/* Tab 4: Settings */}
                {currentTab === 4 && (
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
                        <ReservationSettings restaurantId={restaurantId || ''} />
                    </Paper>
                )}
            </Box>

            {/* Dialogs */}
            <Dialog open={showSafetyDialog} onClose={() => setShowSafetyDialog(false)} fullWidth maxWidth="xs">
                <DialogTitle><Warning color="warning" sx={{ mr: 1, verticalAlign: 'middle' }} />¿Deshabilitar?</DialogTitle>
                <DialogContent><Typography variant="body2">Los clientes no podrán hacer nuevas reservas.</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowSafetyDialog(false)}>Cancelar</Button>
                    <Button onClick={() => handleToggleConfirm(false)} color="error" variant="contained">Deshabilitar</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
                <DialogTitle>✏️ Editar Reserva</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={6}><TextField label="Fecha" type="date" fullWidth InputLabelProps={{ shrink: true }} value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} /></Grid>
                        <Grid item xs={6}><TextField label="Hora" type="time" fullWidth InputLabelProps={{ shrink: true }} value={editForm.time} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} /></Grid>
                        <Grid item xs={6}><TextField label="Personas" type="number" fullWidth value={editForm.party_size} onChange={(e) => setEditForm({ ...editForm, party_size: parseInt(e.target.value) })} /></Grid>
                        <Grid item xs={6}>
                            <FormControl fullWidth><InputLabel>Estado</InputLabel>
                                <Select label="Estado" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                                    <MenuItem value="pending">Pendiente</MenuItem>
                                    <MenuItem value="confirmed">Confirmada</MenuItem>
                                    <MenuItem value="cancelled_restaurant">Cancelada</MenuItem>
                                    <MenuItem value="no_show">No Show</MenuItem>
                                    <MenuItem value="completed">Completada</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}><TextField label="Nombre" fullWidth value={editForm.client_name} onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })} /></Grid>
                        <Grid item xs={6}><TextField label="Teléfono" fullWidth value={editForm.client_phone} onChange={(e) => setEditForm({ ...editForm, client_phone: e.target.value })} /></Grid>
                        <Grid item xs={6}><TextField label="Email" fullWidth value={editForm.client_email} onChange={(e) => setEditForm({ ...editForm, client_email: e.target.value })} /></Grid>
                        <Grid item xs={12}><TextField label="Notas del cliente" fullWidth multiline rows={2} value={editForm.special_requests} onChange={(e) => setEditForm({ ...editForm, special_requests: e.target.value })} helperText="Visible para el cliente" /></Grid>

                        {/* Admin-Only Fields */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="primary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Notes fontSize="small" /> Notas internas (solo staff)
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Mesa asignada"
                                fullWidth
                                value={editForm.table_assignment}
                                onChange={(e) => setEditForm({ ...editForm, table_assignment: e.target.value })}
                                placeholder="Ej: Mesa 5"
                                InputProps={{ startAdornment: <TableRestaurant sx={{ mr: 1, color: '#94a3b8' }} /> }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={8}>
                            <TextField
                                label="Notas internas"
                                fullWidth
                                multiline
                                rows={2}
                                value={editForm.admin_notes}
                                onChange={(e) => setEditForm({ ...editForm, admin_notes: e.target.value })}
                                placeholder="Ej: VIP, alergia a nueces, cumpleaños..."
                                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(59,130,246,0.05)' } }}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleEditSave} variant="contained">Guardar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ReservationsPage;
