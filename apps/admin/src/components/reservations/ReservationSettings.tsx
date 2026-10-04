import { useState, useEffect } from 'react';
import {
    Alert, Box, Button, Chip, CircularProgress, Divider, Grid, IconButton, Snackbar, Stack, TextField, Typography,
} from '@mui/material';
import { Add, Delete, Save, Schedule, EventBusy, Tune } from '@mui/icons-material';
import { apiClient } from '../../lib/apiClient';
import { Panel } from '../common/Panel';

interface Slot {
    start: string;
    end: string;
}

type WeeklySchedule = Record<string, Slot[]>;

interface ReservationConfig {
    is_enabled: boolean;
    max_capacity: number;
    max_party_size: number;
    slot_duration_minutes: number;
    advance_days: number;
    booking_availability: WeeklySchedule;
    closed_dates: string[];
    // Lo que esta pantalla no edita también se reenvía: el PUT reescribe la fila entera.
    gap_between_slots_minutes?: number | null;
    holiday_closures?: unknown;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = {
    monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves',
    friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
};

const emptyWeek = (): WeeklySchedule => Object.fromEntries(DAYS.map((d) => [d, []]));

const parseList = (value: unknown): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return []; }
    }
    return [];
};

/** @param isEnabled el estado del interruptor de la cabecera de Reservas, que manda sobre el cargado. */
export function ReservationSettings({ restaurantId, isEnabled }: { restaurantId: string; isEnabled: boolean }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [config, setConfig] = useState<ReservationConfig | null>(null);
    const [newClosedDate, setNewClosedDate] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        apiClient.getReservationSettings(restaurantId)
            .then((data) => {
                if (cancelled) return;
                const availability = data?.booking_availability && Object.keys(data.booking_availability).length > 0
                    ? { ...emptyWeek(), ...data.booking_availability }
                    : emptyWeek();
                setConfig({
                    ...data,
                    is_enabled: !!data?.is_enabled,
                    max_capacity: data?.max_capacity || 50,
                    max_party_size: data?.max_party_size || 10,
                    slot_duration_minutes: data?.slot_duration_minutes || 90,
                    advance_days: data?.advance_days || 30,
                    booking_availability: availability,
                    closed_dates: parseList(data?.closed_dates),
                });
            })
            .catch(() => !cancelled && setMessage({ type: 'error', text: 'Error al cargar la configuración' }))
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [restaurantId]);

    if (loading || !config) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
    }

    const update = (patch: Partial<ReservationConfig>) => setConfig({ ...config, ...patch });
    const setDay = (day: string, slots: Slot[]) =>
        update({ booking_availability: { ...config.booking_availability, [day]: slots } });

    const handleSave = async () => {
        setSaving(true);
        try {
            // is_enabled tal como está en la cabecera: antes se mandaba siempre true
            // y guardar el horario reactivaba unas reservas que el restaurante había apagado.
            await apiClient.updateReservationConfig(restaurantId, { ...config, is_enabled: isEnabled });
            setMessage({ type: 'success', text: 'Configuración guardada' });
        } catch {
            setMessage({ type: 'error', text: 'Error al guardar la configuración' });
        } finally {
            setSaving(false);
        }
    };

    const numberField = (label: string, key: 'max_capacity' | 'max_party_size' | 'slot_duration_minutes' | 'advance_days', helperText?: string) => (
        <TextField
            fullWidth
            label={label}
            type="number"
            value={config[key]}
            onChange={(e) => update({ [key]: parseInt(e.target.value, 10) || 0 })}
            helperText={helperText}
        />
    );

    const addClosedDate = () => {
        if (newClosedDate && !config.closed_dates.includes(newClosedDate)) {
            update({ closed_dates: [...config.closed_dates, newClosedDate].sort() });
            setNewClosedDate('');
        }
    };

    return (
        <Stack spacing={3}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving}>
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                </Button>
            </Box>

            <Panel icon={<Tune />} title="General">
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>{numberField('Capacidad máxima (personas)', 'max_capacity')}</Grid>
                    <Grid item xs={12} sm={6} md={3}>{numberField('Máx. personas por reserva', 'max_party_size')}</Grid>
                    <Grid item xs={12} sm={6} md={3}>{numberField('Duración de la reserva (min)', 'slot_duration_minutes', 'Tiempo que ocupa la mesa')}</Grid>
                    <Grid item xs={12} sm={6} md={3}>{numberField('Antelación máxima (días)', 'advance_days', 'Días futuros reservables')}</Grid>
                </Grid>
            </Panel>

            <Panel icon={<Schedule />} title="Horario de reservas">
                <Stack divider={<Divider />} spacing={2}>
                    {DAYS.map((day) => {
                        const slots = config.booking_availability[day] ?? [];
                        return (
                            <Box key={day} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                                <Box sx={{ width: 130, pt: 1, flexShrink: 0 }}>
                                    <Typography fontWeight={600}>{DAY_LABELS[day]}</Typography>
                                    <Button size="small" sx={{ px: 0 }}
                                        onClick={() => {
                                            update({ booking_availability: Object.fromEntries(DAYS.map((d) => [d, slots.map((s) => ({ ...s }))])) });
                                            setMessage({ type: 'success', text: `Horario del ${DAY_LABELS[day].toLowerCase()} copiado a todos los días` });
                                        }}>
                                        Copiar a todos
                                    </Button>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    {slots.map((slot, index) => (
                                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                            <TextField type="time" size="small" value={slot.start} sx={{ width: 130 }}
                                                onChange={(e) => setDay(day, slots.map((s, i) => (i === index ? { ...s, start: e.target.value } : s)))} />
                                            <Typography color="text.secondary">–</Typography>
                                            <TextField type="time" size="small" value={slot.end} sx={{ width: 130 }}
                                                onChange={(e) => setDay(day, slots.map((s, i) => (i === index ? { ...s, end: e.target.value } : s)))} />
                                            <IconButton size="small" color="error" aria-label="Quitar turno"
                                                onClick={() => setDay(day, slots.filter((_, i) => i !== index))}>
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    ))}
                                    <Button startIcon={<Add />} size="small" onClick={() => setDay(day, [...slots, { start: '13:00', end: '15:00' }])}>
                                        Añadir turno
                                    </Button>
                                </Box>
                            </Box>
                        );
                    })}
                </Stack>
            </Panel>

            <Panel icon={<EventBusy />} title="Días cerrados" subtitle="Festivos, vacaciones o cualquier día en que no se acepten reservas.">
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                    <TextField type="date" size="small" label="Fecha" InputLabelProps={{ shrink: true }}
                        value={newClosedDate} onChange={(e) => setNewClosedDate(e.target.value)} />
                    <Button variant="outlined" onClick={addClosedDate} disabled={!newClosedDate}>Añadir día cerrado</Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {config.closed_dates.map((date) => (
                        <Chip key={date} variant="outlined" color="error"
                            label={new Date(`${date}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                            onDelete={() => update({ closed_dates: config.closed_dates.filter((d) => d !== date) })} />
                    ))}
                    {config.closed_dates.length === 0 && (
                        <Typography variant="body2" color="text.secondary">No hay días cerrados.</Typography>
                    )}
                </Box>
            </Panel>

            <Snackbar open={!!message} autoHideDuration={4000} onClose={() => setMessage(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setMessage(null)} severity={message?.type || 'info'} sx={{ width: '100%' }}>
                    {message?.text}
                </Alert>
            </Snackbar>
        </Stack>
    );
}
