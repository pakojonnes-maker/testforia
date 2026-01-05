// apps/admin/src/components/delivery/DeliverySettingsTab.tsx
// Componente para configuración de Delivery en Admin Panel

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Grid,
    Card,
    CardContent,
    CardHeader,
    TextField,
    Switch,
    FormControlLabel,
    Typography,
    Alert,
    CircularProgress,
    Divider,
    Chip,
    alpha,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    InputAdornment,
} from '@mui/material';
import {
    TwoWheeler,
    WhatsApp,
    Phone,
    CreditCard,
    Money,
    Schedule,
    LocationOn,
    ExpandMore,
    LocalShipping,
} from '@mui/icons-material';

interface DeliverySettingsTabProps {
    restaurantId: string;
    neonColor: string;
}

interface DeliverySettings {
    is_enabled: boolean;
    show_whatsapp: boolean;
    show_phone: boolean;
    custom_whatsapp: string;
    custom_phone: string;
    payment_methods: { cash: boolean; card: boolean };
    shipping_cost: number;
    free_shipping_threshold: number;
    minimum_order: number;
    delivery_hours: Record<string, Array<{ start: string; end: string }>>;
    closed_dates: string[];
}

interface DeliveryTranslations {
    [lang: string]: {
        delivery_zones: string;
        custom_message: string;
    };
}

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

export default function DeliverySettingsTab({ restaurantId, neonColor }: DeliverySettingsTabProps) {
    const queryClient = useQueryClient();
    const [settings, setSettings] = useState<DeliverySettings>({
        is_enabled: false,
        show_whatsapp: true,
        show_phone: false,
        custom_whatsapp: '',
        custom_phone: '',
        payment_methods: { cash: true, card: false },
        shipping_cost: 0,
        free_shipping_threshold: 0,
        minimum_order: 0,
        delivery_hours: {},
        closed_dates: [],
    });
    const [translations, setTranslations] = useState<DeliveryTranslations>({
        es: { delivery_zones: '', custom_message: '' },
        en: { delivery_zones: '', custom_message: '' },
    });
    const [hasChanges, setHasChanges] = useState(false);

    // Query: Get delivery settings
    const { data: configData, isLoading } = useQuery({
        queryKey: ['delivery-settings', restaurantId],
        queryFn: async () => {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev'}/delivery/config/${restaurantId}`,
                { headers: { 'Content-Type': 'application/json' } }
            );
            return response.json();
        },
        enabled: !!restaurantId,
    });

    // Query: Get translations
    const { data: translationsData } = useQuery({
        queryKey: ['delivery-translations', restaurantId],
        queryFn: async () => {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev'}/delivery/translations/${restaurantId}`,
                { headers: { 'Content-Type': 'application/json' } }
            );
            return response.json();
        },
        enabled: !!restaurantId,
    });

    // Load data into state
    useEffect(() => {
        if (configData) {
            setSettings({
                is_enabled: configData.is_enabled || false,
                show_whatsapp: configData.show_whatsapp !== false,
                show_phone: configData.show_phone || false,
                custom_whatsapp: configData.whatsapp_number || '',
                custom_phone: configData.phone_number || '',
                payment_methods: configData.payment_methods || { cash: true, card: false },
                shipping_cost: configData.shipping_cost || 0,
                free_shipping_threshold: configData.free_shipping_threshold || 0,
                minimum_order: configData.minimum_order || 0,
                delivery_hours: configData.delivery_hours || {},
                closed_dates: configData.closed_dates || [],
            });
        }
    }, [configData]);

    useEffect(() => {
        if (translationsData?.translations) {
            setTranslations({
                es: translationsData.translations.es || { delivery_zones: '', custom_message: '' },
                en: translationsData.translations.en || { delivery_zones: '', custom_message: '' },
            });
        }
    }, [translationsData]);

    // Mutations
    const settingsMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev'}/delivery/config/${restaurantId}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings),
                }
            );
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delivery-settings', restaurantId] });
        },
    });

    const translationsMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev'}/delivery/translations/${restaurantId}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(translations),
                }
            );
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delivery-translations', restaurantId] });
        },
    });

    const handleSave = async () => {
        await Promise.all([settingsMutation.mutateAsync(), translationsMutation.mutateAsync()]);
        setHasChanges(false);
    };

    const updateSetting = <K extends keyof DeliverySettings>(key: K, value: DeliverySettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const updateTranslation = (lang: string, field: 'delivery_zones' | 'custom_message', value: string) => {
        setTranslations(prev => ({
            ...prev,
            [lang]: { ...prev[lang], [field]: value },
        }));
        setHasChanges(true);
    };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    const isSaving = settingsMutation.isPending || translationsMutation.isPending;

    return (
        <Box>
            {/* Save Button (floating) */}
            {hasChanges && (
                <Alert
                    severity="info"
                    sx={{ mb: 3 }}
                    action={
                        <Box
                            component="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            sx={{
                                px: 3,
                                py: 1,
                                borderRadius: 2,
                                border: 'none',
                                bgcolor: neonColor,
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'pointer',
                                '&:disabled': { opacity: 0.5 },
                            }}
                        >
                            {isSaving ? 'Guardando...' : 'Guardar'}
                        </Box>
                    }
                >
                    Tienes cambios sin guardar
                </Alert>
            )}

            {(settingsMutation.isSuccess || translationsMutation.isSuccess) && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    ✅ Configuración de Delivery guardada
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Master Toggle & Contact */}
                <Grid item xs={12} md={6}>
                    <Card
                        elevation={0}
                        sx={{
                            background: `linear-gradient(135deg, ${alpha(neonColor, 0.08)} 0%, ${alpha(neonColor, 0.02)} 100%)`,
                            border: `1px solid ${alpha(neonColor, 0.15)}`,
                        }}
                    >
                        <CardHeader
                            title="Configuración General"
                            titleTypographyProps={{ variant: 'h6', fontWeight: 700, color: neonColor }}
                            avatar={
                                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(neonColor, 0.12) }}>
                                    <TwoWheeler sx={{ color: neonColor }} />
                                </Box>
                            }
                        />
                        <CardContent>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.is_enabled}
                                        onChange={(e) => updateSetting('is_enabled', e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label={
                                    <Typography fontWeight={600}>
                                        {settings.is_enabled ? 'Delivery Activo' : 'Delivery Desactivado'}
                                    </Typography>
                                }
                                sx={{ mb: 3 }}
                            />

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                                Opciones de Contacto
                            </Typography>

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.show_whatsapp}
                                        onChange={(e) => updateSetting('show_whatsapp', e.target.checked)}
                                    />
                                }
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <WhatsApp sx={{ color: '#25D366', fontSize: 20 }} />
                                        <span>Mostrar WhatsApp</span>
                                    </Box>
                                }
                            />
                            {settings.show_whatsapp && (
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="WhatsApp (override)"
                                    value={settings.custom_whatsapp}
                                    onChange={(e) => updateSetting('custom_whatsapp', e.target.value)}
                                    placeholder="34612345678"
                                    sx={{ mt: 1, mb: 2 }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <WhatsApp sx={{ color: '#25D366', fontSize: 18 }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            )}

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.show_phone}
                                        onChange={(e) => updateSetting('show_phone', e.target.checked)}
                                    />
                                }
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Phone sx={{ fontSize: 20 }} />
                                        <span>Mostrar Teléfono</span>
                                    </Box>
                                }
                            />
                            {settings.show_phone && (
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Teléfono (override)"
                                    value={settings.custom_phone}
                                    onChange={(e) => updateSetting('custom_phone', e.target.value)}
                                    placeholder="912345678"
                                    sx={{ mt: 1 }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Phone sx={{ fontSize: 18 }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Payment & Costs */}
                <Grid item xs={12} md={6}>
                    <Card
                        elevation={0}
                        sx={{
                            background: `linear-gradient(135deg, ${alpha(neonColor, 0.08)} 0%, ${alpha(neonColor, 0.02)} 100%)`,
                            border: `1px solid ${alpha(neonColor, 0.15)}`,
                        }}
                    >
                        <CardHeader
                            title="Pagos y Costes"
                            titleTypographyProps={{ variant: 'h6', fontWeight: 700, color: neonColor }}
                            avatar={
                                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(neonColor, 0.12) }}>
                                    <CreditCard sx={{ color: neonColor }} />
                                </Box>
                            }
                        />
                        <CardContent>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                                Métodos de Pago
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                                <Chip
                                    icon={<Money />}
                                    label={settings.payment_methods.cash ? '✓ Efectivo' : 'Efectivo'}
                                    variant="filled"
                                    onClick={() =>
                                        updateSetting('payment_methods', {
                                            ...settings.payment_methods,
                                            cash: !settings.payment_methods.cash,
                                        })
                                    }
                                    sx={{
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        bgcolor: settings.payment_methods.cash ? alpha('#22c55e', 0.2) : 'rgba(255,255,255,0.05)',
                                        color: settings.payment_methods.cash ? '#22c55e' : 'rgba(255,255,255,0.5)',
                                        border: `2px solid ${settings.payment_methods.cash ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                                        '&:hover': {
                                            bgcolor: settings.payment_methods.cash ? alpha('#22c55e', 0.3) : 'rgba(255,255,255,0.1)',
                                        }
                                    }}
                                />
                                <Chip
                                    icon={<CreditCard />}
                                    label={settings.payment_methods.card ? '✓ Tarjeta' : 'Tarjeta'}
                                    variant="filled"
                                    onClick={() =>
                                        updateSetting('payment_methods', {
                                            ...settings.payment_methods,
                                            card: !settings.payment_methods.card,
                                        })
                                    }
                                    sx={{
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        bgcolor: settings.payment_methods.card ? alpha('#3b82f6', 0.2) : 'rgba(255,255,255,0.05)',
                                        color: settings.payment_methods.card ? '#3b82f6' : 'rgba(255,255,255,0.5)',
                                        border: `2px solid ${settings.payment_methods.card ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                                        '&:hover': {
                                            bgcolor: settings.payment_methods.card ? alpha('#3b82f6', 0.3) : 'rgba(255,255,255,0.1)',
                                        }
                                    }}
                                />
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Coste de Envío"
                                        type="number"
                                        value={settings.shipping_cost}
                                        onChange={(e) => updateSetting('shipping_cost', parseFloat(e.target.value) || 0)}
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">€</InputAdornment>,
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <LocalShipping sx={{ fontSize: 18 }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Envío Gratis desde"
                                        type="number"
                                        value={settings.free_shipping_threshold}
                                        onChange={(e) => updateSetting('free_shipping_threshold', parseFloat(e.target.value) || 0)}
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">€</InputAdornment>,
                                        }}
                                        helperText="0 = siempre cobrar"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Pedido Mínimo"
                                        type="number"
                                        value={settings.minimum_order}
                                        onChange={(e) => updateSetting('minimum_order', parseFloat(e.target.value) || 0)}
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">€</InputAdornment>,
                                        }}
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Delivery Zones & Translations */}
                <Grid item xs={12}>
                    <Card
                        elevation={0}
                        sx={{
                            background: `linear-gradient(135deg, ${alpha(neonColor, 0.08)} 0%, ${alpha(neonColor, 0.02)} 100%)`,
                            border: `1px solid ${alpha(neonColor, 0.15)}`,
                        }}
                    >
                        <CardHeader
                            title="Zonas y Mensajes"
                            titleTypographyProps={{ variant: 'h6', fontWeight: 700, color: neonColor }}
                            avatar={
                                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(neonColor, 0.12) }}>
                                    <LocationOn sx={{ color: neonColor }} />
                                </Box>
                            }
                        />
                        <CardContent>
                            {LANGUAGES.map((lang) => (
                                <Accordion key={lang.code} defaultExpanded={lang.code === 'es'}>
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <Typography fontWeight={600}>{lang.label}</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    label="Zona de Reparto"
                                                    value={translations[lang.code]?.delivery_zones || ''}
                                                    onChange={(e) => updateTranslation(lang.code, 'delivery_zones', e.target.value)}
                                                    placeholder="Málaga capital y alrededores"
                                                    helperText="Describe dónde entregas"
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    label="Mensaje Personalizado"
                                                    value={translations[lang.code]?.custom_message || ''}
                                                    onChange={(e) => updateTranslation(lang.code, 'custom_message', e.target.value)}
                                                    placeholder="Entrega en 30-45 min"
                                                    helperText="Mensaje opcional para el cliente"
                                                />
                                            </Grid>
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Schedule */}
                <Grid item xs={12}>
                    <Card
                        elevation={0}
                        sx={{
                            background: `linear-gradient(135deg, ${alpha(neonColor, 0.08)} 0%, ${alpha(neonColor, 0.02)} 100%)`,
                            border: `1px solid ${alpha(neonColor, 0.15)}`,
                        }}
                    >
                        <CardHeader
                            title="Horarios de Reparto"
                            titleTypographyProps={{ variant: 'h6', fontWeight: 700, color: neonColor }}
                            avatar={
                                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(neonColor, 0.12) }}>
                                    <Schedule sx={{ color: neonColor }} />
                                </Box>
                            }
                        />
                        <CardContent>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Configura los horarios de disponibilidad para cada día. Deja vacío para no ofrecer delivery ese día.
                            </Typography>
                            <Grid container spacing={2}>
                                {DAYS.map((day) => (
                                    <Grid item xs={12} sm={6} md={4} key={day.key}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography sx={{ width: 90, fontWeight: 500 }}>{day.label}</Typography>
                                            <TextField
                                                size="small"
                                                type="time"
                                                placeholder="12:00"
                                                value={settings.delivery_hours[day.key]?.[0]?.start || ''}
                                                onChange={(e) => {
                                                    const currentSlots = settings.delivery_hours[day.key] || [];
                                                    const newSlot = { start: e.target.value, end: currentSlots[0]?.end || '' };
                                                    updateSetting('delivery_hours', {
                                                        ...settings.delivery_hours,
                                                        [day.key]: [newSlot],
                                                    });
                                                }}
                                                sx={{ width: 100 }}
                                            />
                                            <Typography>-</Typography>
                                            <TextField
                                                size="small"
                                                type="time"
                                                placeholder="22:00"
                                                value={settings.delivery_hours[day.key]?.[0]?.end || ''}
                                                onChange={(e) => {
                                                    const currentSlots = settings.delivery_hours[day.key] || [];
                                                    const newSlot = { start: currentSlots[0]?.start || '', end: e.target.value };
                                                    updateSetting('delivery_hours', {
                                                        ...settings.delivery_hours,
                                                        [day.key]: [newSlot],
                                                    });
                                                }}
                                                sx={{ width: 100 }}
                                            />
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
