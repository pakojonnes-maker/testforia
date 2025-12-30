import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Switch, FormControlLabel,
    Button, Dialog, DialogTitle, DialogContent, DialogActions,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Tabs, Tab, Chip, IconButton, CircularProgress,
    TextField
} from '@mui/material';
import {
    People, AccessTime, CheckCircle, Cancel,
    Warning, Refresh, History, ThumbDown, PlaylistAddCheck
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
    created_at: string;
}

const ReservationsPage: React.FC = () => {
    const { currentRestaurant } = useAuth();

    // Main Data State
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [logs, setLogs] = useState<any[]>([]);

    // UI State
    const [currentTab, setCurrentTab] = useState(0);
    const [listLoading, setListLoading] = useState(false);

    // Settings Toggle State
    const [isEnabled, setIsEnabled] = useState(false);
    const [showSafetyDialog, setShowSafetyDialog] = useState(false);
    const [toggleLoading, setToggleLoading] = useState(false);

    // Filter State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const restaurantId = currentRestaurant?.id;

    // Load Settings Only Once
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
        } else if (currentTab === 1) {
            loadReservationsAll();
        } else if (currentTab === 2) {
            // Waitlist
        } else if (currentTab === 3) {
            loadLogs();
        }
    }, [restaurantId, currentTab]);

    const loadReservations = async () => {
        setListLoading(true);
        try {
            const data = await apiClient.getReservationsList(restaurantId!, selectedDate);
            if (data.success) {
                setReservations(data.reservations);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setListLoading(false);
        }
    };

    const loadReservationsAll = async () => {
        setListLoading(true);
        try {
            // Passing undefined date to fetch all (or backend default limit)
            const data = await apiClient.getReservationsList(restaurantId!);
            if (data.success) {
                setReservations(data.reservations);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setListLoading(false);
        }
    };

    const loadLogs = async () => {
        setListLoading(true);
        try {
            const data = await apiClient.getReservationLogs(restaurantId!);
            if (data.success) {
                setLogs(data.logs);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setListLoading(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await apiClient.updateReservationStatus(id, newStatus);
            // Refresh current view
            if (currentTab === 0) loadReservations();
            else if (currentTab === 1) loadReservationsAll();
        } catch (error) {
            console.error(error);
            alert("Error al actualizar estado");
        }
    };

    const handleToggleRequest = () => {
        if (isEnabled) {
            setShowSafetyDialog(true);
        } else {
            // Enable directly
            handleToggleConfirm(true);
        }
    };

    const handleToggleConfirm = async (newState: boolean) => {
        if (!restaurantId) {
            console.error("Missing restaurant ID");
            return;
        }
        setToggleLoading(true);
        try {
            await apiClient.toggleReservations(restaurantId, newState);
            setIsEnabled(newState);
            setShowSafetyDialog(false);
        } catch (error) {
            console.error(error);
        } finally {
            setToggleLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'success';
            case 'pending': return 'warning';
            case 'cancelled': return 'error';
            case 'cancelled_restaurant': return 'error';
            case 'completed': return 'info';
            case 'waitlist': return 'info';
            default: return 'default';
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" fontWeight="bold">Reservas de Mesa</Typography>

                <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid rgba(0,0,0,0.12)' }}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={isEnabled}
                                onChange={handleToggleRequest}
                                disabled={toggleLoading}
                            />
                        }
                        label={
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography fontWeight="bold">{isEnabled ? "Habilitado" : "Deshabilitado"}</Typography>
                                {toggleLoading && <CircularProgress size={16} />}
                            </Box>
                        }
                    />
                </Paper>
            </Box>

            <Dialog open={showSafetyDialog} onClose={() => setShowSafetyDialog(false)}>
                <DialogTitle display="flex" alignItems="center" gap={1}>
                    <Warning color="warning" /> ¿Deshabilitar Reservas?
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Al deshabilitar las reservas, los clientes ya no podrán ver la opción en el menú digital.
                        Las reservas existentes <b>no se cancelarán</b>, pero no entrarán nuevas.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowSafetyDialog(false)}>Cancelar</Button>
                    <Button onClick={() => handleToggleConfirm(false)} color="error" variant="contained">
                        Deshabilitar
                    </Button>
                </DialogActions>
            </Dialog>

            <Box mb={2}>
                <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label="Gestión Diaria" />
                    <Tab label="Todas las Reservas" />
                    <Tab label="Lista de Espera" />
                    <Tab icon={<History />} iconPosition="start" label="Logs" />
                    <Tab label="Configuración" />
                </Tabs>
            </Box>

            <Paper sx={{ p: 3, mb: 4 }}>
                {currentTab === 0 && (
                    <Box mb={3}>
                        <ReservationCalendar
                            restaurantId={restaurantId || ''}
                            selectedDate={selectedDate}
                            onDateSelect={(d) => setSelectedDate(d)}
                        />
                        <Box display="flex" alignItems="center" gap={2}>
                            <TextField
                                label="Selección Manual"
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                size="small"
                                sx={{ width: 180 }}
                            />
                            <Button
                                startIcon={<Refresh />}
                                variant="outlined"
                                onClick={loadReservations}
                                disabled={listLoading}
                            >
                                Recargar Lista
                            </Button>
                        </Box>
                    </Box>
                )}

                {currentTab === 1 && (
                    <Box display="flex" alignItems="center" gap={2} mb={3}>
                        <Typography variant="h6" color="textSecondary">Próximas Reservas</Typography>
                        <Button
                            startIcon={<Refresh />}
                            variant="outlined"
                            onClick={() => loadReservationsAll()}
                            disabled={listLoading}
                        >
                            Actualizar
                        </Button>
                    </Box>
                )}

                {currentTab === 3 ? (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Fecha/Hora</TableCell>
                                    <TableCell>Acción</TableCell>
                                    <TableCell>Reserva</TableCell>
                                    <TableCell>Usuario</TableCell>
                                    <TableCell>Detalle</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {logs.map(log => (
                                    <TableRow key={log.id}>
                                        <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem' }}>{log.action}</TableCell>
                                        <TableCell>{log.client_name || log.reservation_id.substr(0, 8)}...</TableCell>
                                        <TableCell>{log.changed_by}</TableCell>
                                        <TableCell>{log.reason || log.new_state || '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : currentTab === 4 ? (
                    <ReservationSettings restaurantId={restaurantId || ''} />
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Fecha</TableCell>
                                    <TableCell>Hora</TableCell>
                                    <TableCell>Cliente</TableCell>
                                    <TableCell>Comensales</TableCell>
                                    <TableCell>Contacto</TableCell>
                                    <TableCell>Notas</TableCell>
                                    <TableCell>Estado</TableCell>
                                    <TableCell align="right">Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {listLoading ? (
                                    <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={20} /></TableCell></TableRow>
                                ) : reservations.length === 0 ? (
                                    <TableRow><TableCell colSpan={8} align="center">No hay reservas para mostrar.</TableCell></TableRow>
                                ) : (
                                    reservations.map(res => (
                                        <TableRow key={res.id}>
                                            <TableCell>{new Date(res.reservation_date).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <Chip icon={<AccessTime />} label={res.reservation_time} size="small" variant="outlined" />
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>{res.client_name}</TableCell>
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={0.5}>
                                                    <People fontSize="small" color="action" /> {res.party_size}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{res.client_email}</Typography>
                                                <Typography variant="caption" color="textSecondary">{res.client_phone}</Typography>
                                            </TableCell>
                                            <TableCell>{res.special_requests || '-'}</TableCell>
                                            <TableCell>
                                                <Chip label={res.status} color={getStatusColor(res.status) as any} size="small" />
                                            </TableCell>
                                            <TableCell align="right">
                                                {res.status === 'pending' && (
                                                    <Box display="flex" gap={1} justifyContent="flex-end">
                                                        <IconButton
                                                            size="small" color="success"
                                                            onClick={() => handleStatusChange(res.id, 'confirmed')}
                                                            title="Confirmar"
                                                        >
                                                            <CheckCircle />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small" color="warning"
                                                            onClick={() => handleStatusChange(res.id, 'waitlist')}
                                                            title="Mover a Lista de Espera"
                                                        >
                                                            <PlaylistAddCheck />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small" color="error"
                                                            onClick={() => handleStatusChange(res.id, 'cancelled_restaurant')}
                                                            title="Denegar"
                                                        >
                                                            <ThumbDown />
                                                        </IconButton>
                                                    </Box>
                                                )}
                                                {res.status === 'confirmed' && (
                                                    <IconButton
                                                        size="small" color="error"
                                                        onClick={() => handleStatusChange(res.id, 'cancelled_restaurant')}
                                                        title="Cancelar"
                                                    >
                                                        <Cancel />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            <Typography variant="caption" color="textSecondary">
                * Las reservas "No-Show" se pueden marcar manualmente para seguimiento interno.
            </Typography>
        </Box>
    );
};

export default ReservationsPage;
