import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, TextField, Button, Grid,
    Divider, IconButton, Chip, Alert, Snackbar
} from '@mui/material';
import { Add, Delete, Save } from '@mui/icons-material';
import { apiClient } from '../../lib/apiClient';

interface Props {
    restaurantId: string;
}

interface ScheduleDay {
    start: string;
    end: string;
}

interface WeeklySchedule {
    [key: string]: ScheduleDay[];
}

export const ReservationSettings: React.FC<Props> = ({ restaurantId }) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Settings State
    const [settings, setSettings] = useState({
        max_capacity: 50,
        max_party_size: 10,
        slot_duration_minutes: 90,
        advance_days: 30,
        booking_availability: {
            monday: [] as ScheduleDay[],
            tuesday: [] as ScheduleDay[],
            wednesday: [] as ScheduleDay[],
            thursday: [] as ScheduleDay[],
            friday: [] as ScheduleDay[],
            saturday: [] as ScheduleDay[],
            sunday: [] as ScheduleDay[]
        } as WeeklySchedule,
        closed_dates: [] as string[]
    });

    // Valid days for iteration
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels: { [key: string]: string } = {
        monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves',
        friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
    };

    useEffect(() => {
        loadSettings();
    }, [restaurantId]);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await apiClient.getReservationSettings(restaurantId);
            if (data) {
                // Parse JSONs if they come as strings, or default
                let availability = data.booking_availability;
                // If it's the old format or null, initialize empty structure
                if (!availability || Object.keys(availability).length === 0) {
                    availability = {
                        monday: [], tuesday: [], wednesday: [], thursday: [],
                        friday: [], saturday: [], sunday: []
                    };
                }

                setSettings({
                    max_capacity: data.max_capacity || 50,
                    max_party_size: data.max_party_size || 10,
                    slot_duration_minutes: data.slot_duration_minutes || 90,
                    advance_days: data.advance_days || 30,
                    booking_availability: availability,
                    closed_dates: data.closed_dates ? (typeof data.closed_dates === 'string' ? JSON.parse(data.closed_dates) : data.closed_dates) : []
                });
            }
        } catch (error) {
            console.error("Error loading settings:", error);
            setMessage({ type: 'error', text: 'Error al cargar configuración' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiClient.updateReservationConfig(restaurantId, {
                ...settings,
                is_enabled: true // We assume if they are editing here, they want to keep enabled status or handle it via the main toggle outside
            });
            setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Error al guardar configuración' });
        } finally {
            setSaving(false);
        }
    };

    // --- Schedule Handlers ---
    const addSlot = (day: string) => {
        const newSchedule = { ...settings.booking_availability };
        if (!newSchedule[day]) newSchedule[day] = [];
        newSchedule[day].push({ start: '13:00', end: '15:00' });
        setSettings({ ...settings, booking_availability: newSchedule });
    };

    const removeSlot = (day: string, index: number) => {
        const newSchedule = { ...settings.booking_availability };
        newSchedule[day].splice(index, 1);
        setSettings({ ...settings, booking_availability: newSchedule });
    };

    const updateSlot = (day: string, index: number, field: 'start' | 'end', value: string) => {
        const newSchedule = { ...settings.booking_availability };
        newSchedule[day][index] = { ...newSchedule[day][index], [field]: value };
        setSettings({ ...settings, booking_availability: newSchedule });
    };

    const copyScheduleToAll = (sourceDay: string) => {
        const sourceSlots = settings.booking_availability[sourceDay];
        const newSchedule = { ...settings.booking_availability };
        daysOfWeek.forEach(day => {
            if (day !== sourceDay) {
                newSchedule[day] = [...sourceSlots];
            }
        });
        setSettings({ ...settings, booking_availability: newSchedule });
        setMessage({ type: 'success', text: `Horario de ${dayLabels[sourceDay]} copiado a todos los días` });
    };

    // --- Closed Dates Handlers ---
    const [newClosedDate, setNewClosedDate] = useState('');

    const addClosedDate = () => {
        if (newClosedDate && !settings.closed_dates.includes(newClosedDate)) {
            setSettings({
                ...settings,
                closed_dates: [...settings.closed_dates, newClosedDate].sort()
            });
            setNewClosedDate('');
        }
    };

    const removeClosedDate = (dateToRemove: string) => {
        setSettings({
            ...settings,
            closed_dates: settings.closed_dates.filter(d => d !== dateToRemove)
        });
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Configuración General</Typography>
                <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </Box>

            <Paper sx={{ p: 3, mb: 4 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            fullWidth
                            label="Capacidad Máxima (personas)"
                            type="number"
                            value={settings.max_capacity}
                            onChange={(e) => setSettings({ ...settings, max_capacity: parseInt(e.target.value) || 0 })}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            fullWidth
                            label="Max. Personas por Mesa"
                            type="number"
                            value={settings.max_party_size}
                            onChange={(e) => setSettings({ ...settings, max_party_size: parseInt(e.target.value) || 0 })}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            fullWidth
                            label="Duración Reserva (min)"
                            type="number"
                            value={settings.slot_duration_minutes}
                            onChange={(e) => setSettings({ ...settings, slot_duration_minutes: parseInt(e.target.value) || 0 })}
                            helperText="Tiempo que ocupa la mesa"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            fullWidth
                            label="Antelación Máxima (días)"
                            type="number"
                            value={settings.advance_days}
                            onChange={(e) => setSettings({ ...settings, advance_days: parseInt(e.target.value) || 0 })}
                            helperText="Días futuros disponibles"
                        />
                    </Grid>
                </Grid>
            </Paper>

            <Typography variant="h6" gutterBottom>Horarios de Apertura</Typography>
            <Paper sx={{ p: 3, mb: 4 }}>
                <Grid container spacing={4}>
                    {daysOfWeek.map(day => (
                        <Grid item xs={12} key={day}>
                            <Box display="flex" alignItems="flex-start" gap={2}>
                                <Box width={120} pt={1}>
                                    <Typography fontWeight="bold">{dayLabels[day]}</Typography>
                                    <Button size="small" sx={{ fontSize: '0.7rem', textTransform: 'none' }} onClick={() => copyScheduleToAll(day)}>
                                        Copiar a todos
                                    </Button>
                                </Box>
                                <Box flex={1}>
                                    {settings.booking_availability[day]?.map((slot, index) => (
                                        <Box key={index} display="flex" alignItems="center" gap={2} mb={1}>
                                            <TextField
                                                type="time"
                                                size="small"
                                                value={slot.start}
                                                onChange={(e) => updateSlot(day, index, 'start', e.target.value)}
                                                sx={{ width: 130 }}
                                            />
                                            <Typography>-</Typography>
                                            <TextField
                                                type="time"
                                                size="small"
                                                value={slot.end}
                                                onChange={(e) => updateSlot(day, index, 'end', e.target.value)}
                                                sx={{ width: 130 }}
                                            />
                                            <IconButton size="small" color="error" onClick={() => removeSlot(day, index)}>
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    ))}
                                    <Button startIcon={<Add />} size="small" onClick={() => addSlot(day)}>
                                        Añadir Turno
                                    </Button>
                                </Box>
                            </Box>
                            <Divider sx={{ mt: 2 }} />
                        </Grid>
                    ))}
                </Grid>
            </Paper>

            <Typography variant="h6" gutterBottom>Días Cerrados (Excepciones)</Typography>
            <Paper sx={{ p: 3, mb: 4 }}>
                <Typography variant="body2" color="textSecondary" mb={2}>
                    Añade días específicos donde el restaurante estará cerrado (festivos, vacaciones, etc.)
                </Typography>

                <Box display="flex" gap={2} mb={3}>
                    <TextField
                        type="date"
                        size="small"
                        value={newClosedDate}
                        onChange={(e) => setNewClosedDate(e.target.value)}
                        label="Seleccionar fecha"
                        InputLabelProps={{ shrink: true }}
                    />
                    <Button variant="outlined" onClick={addClosedDate} disabled={!newClosedDate}>
                        Añadir Fecha Cerrada
                    </Button>
                </Box>

                <Box display="flex" gap={1} flexWrap="wrap">
                    {settings.closed_dates.map(date => (
                        <Chip
                            key={date}
                            label={new Date(date).toLocaleDateString()}
                            onDelete={() => removeClosedDate(date)}
                            color="error"
                            variant="outlined"
                        />
                    ))}
                    {settings.closed_dates.length === 0 && (
                        <Typography variant="caption" color="textSecondary">No hay días cerrados configurados.</Typography>
                    )}
                </Box>
            </Paper>

            <Snackbar
                open={!!message}
                autoHideDuration={4000}
                onClose={() => setMessage(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setMessage(null)} severity={message?.type || 'info'} sx={{ width: '100%' }}>
                    {message?.text}
                </Alert>
            </Snackbar>
        </Box>
    );
};
