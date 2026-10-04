// apps/admin/src/components/delivery/DeliverySettingsTab.tsx
// Configuración de Delivery (pestaña de DeliveryPage).

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, CircularProgress, Divider,
    FormControlLabel, Grid, InputAdornment, Stack, Switch, TextField, Typography,
} from '@mui/material';
import { CreditCard, ExpandMore, LocationOn, Schedule, TwoWheeler } from '@mui/icons-material';
import { apiClient, type DeliverySettings } from '../../lib/apiClient';
import { Panel } from '../common/Panel';

type Translations = Record<string, { delivery_zones: string; custom_message: string }>;

const DAYS = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' },
];

const LANGUAGES = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
];

const emptyTranslation = { delivery_zones: '', custom_message: '' };

export default function DeliverySettingsTab({ restaurantId }: { restaurantId: string }) {
    const queryClient = useQueryClient();
    const [settings, setSettings] = useState<DeliverySettings | null>(null);
    const [translations, setTranslations] = useState<Translations>({ es: emptyTranslation, en: emptyTranslation });
    const [dirty, setDirty] = useState(false);

    const settingsQuery = useQuery({
        queryKey: ['delivery-settings', restaurantId],
        queryFn: async () => (await apiClient.getDeliverySettings(restaurantId)).settings,
    });
    const translationsQuery = useQuery({
        queryKey: ['delivery-translations', restaurantId],
        queryFn: async () => (await apiClient.getDeliveryTranslations(restaurantId)).translations ?? {},
    });

    useEffect(() => {
        if (settingsQuery.data) setSettings(settingsQuery.data);
    }, [settingsQuery.data]);
    useEffect(() => {
        const t = translationsQuery.data;
        if (t) setTranslations({ es: t.es || emptyTranslation, en: t.en || emptyTranslation });
    }, [translationsQuery.data]);

    const save = useMutation({
        mutationFn: () => Promise.all([
            apiClient.updateDeliveryConfig(restaurantId, settings),
            apiClient.updateDeliveryTranslations(restaurantId, translations),
        ]),
        onSuccess: () => {
            setDirty(false);
            queryClient.invalidateQueries({ queryKey: ['delivery-settings', restaurantId] });
            queryClient.invalidateQueries({ queryKey: ['delivery-translations', restaurantId] });
            queryClient.invalidateQueries({ queryKey: ['delivery-enabled', restaurantId] });
        },
    });

    if (settingsQuery.isError) return <Alert severity="error">No se pudo cargar la configuración de delivery.</Alert>;
    if (!settings) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

    const update = <K extends keyof DeliverySettings>(key: K, value: DeliverySettings[K]) => {
        setSettings({ ...settings, [key]: value });
        setDirty(true);
    };
    const updateTranslation = (lang: string, field: 'delivery_zones' | 'custom_message', value: string) => {
        setTranslations((prev) => ({ ...prev, [lang]: { ...(prev[lang] ?? emptyTranslation), [field]: value } }));
        setDirty(true);
    };
    const setHours = (day: string, part: 'start' | 'end', value: string) => {
        const current = settings.delivery_hours[day]?.[0] ?? { start: '', end: '' };
        update('delivery_hours', { ...settings.delivery_hours, [day]: [{ ...current, [part]: value }] });
    };
    const togglePayment = (method: 'cash' | 'card') =>
        update('payment_methods', { ...settings.payment_methods, [method]: !settings.payment_methods[method] });
    const euro = { endAdornment: <InputAdornment position="end">€</InputAdornment> };

    return (
        <Stack spacing={3}>
            {(dirty || save.isSuccess || save.isError) && (
                <Alert
                    severity={save.isError ? 'error' : dirty ? 'info' : 'success'}
                    action={dirty && (
                        <Button color="inherit" size="small" onClick={() => save.mutate()} disabled={save.isPending}>
                            {save.isPending ? 'Guardando…' : 'Guardar'}
                        </Button>
                    )}
                >
                    {save.isError ? 'No se pudo guardar' : dirty ? 'Tienes cambios sin guardar' : 'Configuración guardada'}
                </Alert>
            )}

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Panel icon={<TwoWheeler />} title="General">
                        <FormControlLabel
                            control={<Switch checked={settings.is_enabled} onChange={(e) => update('is_enabled', e.target.checked)} />}
                            label={<Typography fontWeight={600}>{settings.is_enabled ? 'Delivery activo' : 'Delivery desactivado'}</Typography>}
                        />
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="overline" color="text.secondary">Contacto en la carta</Typography>
                        <FormControlLabel
                            sx={{ display: 'flex' }}
                            control={<Switch checked={settings.show_whatsapp} onChange={(e) => update('show_whatsapp', e.target.checked)} />}
                            label="Mostrar WhatsApp"
                        />
                        {settings.show_whatsapp && (
                            <TextField fullWidth size="small" label="WhatsApp propio para pedidos" placeholder="34612345678"
                                helperText="Vacío = el WhatsApp del restaurante" sx={{ mt: 1, mb: 2 }}
                                value={settings.custom_whatsapp} onChange={(e) => update('custom_whatsapp', e.target.value)} />
                        )}
                        <FormControlLabel
                            sx={{ display: 'flex' }}
                            control={<Switch checked={settings.show_phone} onChange={(e) => update('show_phone', e.target.checked)} />}
                            label="Mostrar teléfono"
                        />
                        {settings.show_phone && (
                            <TextField fullWidth size="small" label="Teléfono propio para pedidos" placeholder="912345678"
                                helperText="Vacío = el teléfono del restaurante" sx={{ mt: 1 }}
                                value={settings.custom_phone} onChange={(e) => update('custom_phone', e.target.value)} />
                        )}
                    </Panel>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Panel icon={<CreditCard />} title="Pagos y costes">
                        <Typography variant="overline" color="text.secondary">Métodos de pago</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5, mb: 3 }}>
                            {(['cash', 'card'] as const).map((method) => (
                                <Chip
                                    key={method}
                                    label={method === 'cash' ? 'Efectivo' : 'Tarjeta'}
                                    color={settings.payment_methods[method] ? 'primary' : 'default'}
                                    variant={settings.payment_methods[method] ? 'filled' : 'outlined'}
                                    onClick={() => togglePayment(method)}
                                />
                            ))}
                        </Stack>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth size="small" type="number" label="Coste de envío" InputProps={euro}
                                    value={settings.shipping_cost} onChange={(e) => update('shipping_cost', parseFloat(e.target.value) || 0)} />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth size="small" type="number" label="Envío gratis desde" InputProps={euro} helperText="0 = siempre se cobra"
                                    value={settings.free_shipping_threshold} onChange={(e) => update('free_shipping_threshold', parseFloat(e.target.value) || 0)} />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth size="small" type="number" label="Pedido mínimo" InputProps={euro}
                                    value={settings.minimum_order} onChange={(e) => update('minimum_order', parseFloat(e.target.value) || 0)} />
                            </Grid>
                        </Grid>
                    </Panel>
                </Grid>

                <Grid item xs={12}>
                    <Panel icon={<LocationOn />} title="Zonas y mensajes">
                        {LANGUAGES.map((lang) => (
                            <Accordion key={lang.code} defaultExpanded={lang.code === 'es'} disableGutters variant="outlined" sx={{ mb: 1 }}>
                                <AccordionSummary expandIcon={<ExpandMore />}>
                                    <Typography fontWeight={600}>{lang.label}</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={6}>
                                            <TextField fullWidth label="Zona de reparto" placeholder="Málaga capital y alrededores" helperText="Dónde entregas"
                                                value={translations[lang.code]?.delivery_zones || ''}
                                                onChange={(e) => updateTranslation(lang.code, 'delivery_zones', e.target.value)} />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField fullWidth label="Mensaje para el cliente" placeholder="Entrega en 30–45 min" helperText="Opcional"
                                                value={translations[lang.code]?.custom_message || ''}
                                                onChange={(e) => updateTranslation(lang.code, 'custom_message', e.target.value)} />
                                        </Grid>
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </Panel>
                </Grid>

                <Grid item xs={12}>
                    <Panel icon={<Schedule />} title="Horario de reparto" subtitle="Deja un día vacío para no ofrecer delivery ese día.">
                        <Grid container spacing={2}>
                            {DAYS.map((day) => (
                                <Grid item xs={12} sm={6} md={4} key={day.key}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography sx={{ width: 90, fontWeight: 500 }}>{day.label}</Typography>
                                        <TextField size="small" type="time" sx={{ width: 120 }}
                                            value={settings.delivery_hours[day.key]?.[0]?.start || ''}
                                            onChange={(e) => setHours(day.key, 'start', e.target.value)} />
                                        <Typography color="text.secondary">–</Typography>
                                        <TextField size="small" type="time" sx={{ width: 120 }}
                                            value={settings.delivery_hours[day.key]?.[0]?.end || ''}
                                            onChange={(e) => setHours(day.key, 'end', e.target.value)} />
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Panel>
                </Grid>
            </Grid>
        </Stack>
    );
}
