// apps/admin/src/pages/ConfigurationPage.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, CircularProgress, Grid, InputAdornment, Switch, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { AdminPanelSettings, LocationOn, Restaurant, Save, Settings as SettingsIcon, Share, Wifi, ContactMail } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/apiClient';
import { parseFeatures } from '../components/layout/navigation';
import { PageHeader } from '../components/common/PageHeader';
import { Panel } from '../components/common/Panel';
import { DATA, STATUS_COLORS } from '../theme';

interface RestaurantData {
  name: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  country: string;
  timezone: string;
  accepts_reservations: boolean;
  reservation_url: string;
  reservation_phone: string;
  reservation_email: string;
  has_wifi: boolean;
  has_delivery: boolean;
  has_outdoor_seating: boolean;
  capacity: number;
  google_maps_url: string;
  facebook_url: string;
  instagram_handle: string;
  tiktok_handle: string;
  youtube_url: string;
  tripadvisor_url: string;
}

type TabValue = 'info' | 'location' | 'services' | 'social' | 'features';

// Las mismas claves que filtran el menú lateral (components/layout/navigation.tsx).
const FEATURES = [
  { key: 'statistics', label: 'Estadísticas', desc: 'Analítica de la carta' },
  { key: 'menu', label: 'Platos', desc: 'Carta, secciones y multimedia' },
  { key: 'website', label: 'Web', desc: 'Landing y colores de la carta' },
  { key: 'qr_generator', label: 'Generador QR', desc: 'Códigos QR personalizados' },
  { key: 'reservations', label: 'Reservas', desc: 'Reservas online' },
  { key: 'delivery', label: 'Delivery', desc: 'Pedidos a domicilio' },
  { key: 'marketing', label: 'Marketing', desc: 'Modal de bienvenida y push' },
  { key: 'loyalty', label: 'Lealtad', desc: 'Tarjeta de sellos' },
  { key: 'users', label: 'Usuarios', desc: 'Personal y permisos' },
];

const SERVICES: Array<{ key: 'has_wifi' | 'has_delivery' | 'has_outdoor_seating'; label: string; desc: string }> = [
  { key: 'has_wifi', label: 'WiFi gratis', desc: 'Para tus clientes' },
  { key: 'has_delivery', label: 'Delivery', desc: 'Entrega a domicilio' },
  { key: 'has_outdoor_seating', label: 'Terraza', desc: 'Mesas al aire libre' },
];

function toForm(r: any): RestaurantData {
  return {
    name: r.name || '',
    description: r.description || '',
    email: r.email || '',
    phone: r.phone || '',
    website: r.website || '',
    city: r.city || '',
    country: r.country || '',
    timezone: r.timezone || 'Europe/Madrid',
    accepts_reservations: !!r.accepts_reservations,
    reservation_url: r.reservation_url || '',
    reservation_phone: r.reservation_phone || '',
    reservation_email: r.reservation_email || '',
    has_wifi: !!r.has_wifi,
    has_delivery: !!r.has_delivery,
    has_outdoor_seating: !!r.has_outdoor_seating,
    capacity: r.capacity || 50,
    google_maps_url: r.google_maps_url || '',
    facebook_url: r.facebook_url || '',
    instagram_handle: r.instagram_url || '',
    tiktok_handle: r.tiktok_url || '',
    youtube_url: r.youtube_url || '',
    tripadvisor_url: r.tripadvisor_url || '',
  };
}

export default function ConfigurationPage() {
  const { currentRestaurant, setCurrentRestaurant, user } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId: string | undefined = currentRestaurant?.id;

  const [activeTab, setActiveTab] = useState<TabValue>('info');
  const [formData, setFormData] = useState<RestaurantData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [featuresChanged, setFeaturesChanged] = useState(false);

  const { data: restaurantResponse, isLoading, error } = useQuery({
    queryKey: ['restaurant-settings', restaurantId],
    queryFn: () => apiClient.getRestaurant(restaurantId!),
    enabled: !!restaurantId,
  });

  useEffect(() => {
    const r = restaurantResponse?.restaurant;
    if (!r) return;
    setFormData(toForm(r));
    setHasChanges(false);
    const parsed = parseFeatures(r.features) as Record<string, boolean>;
    setFeatureFlags(Object.fromEntries(FEATURES.map((f) => [f.key, parsed[f.key] !== false])));
    setFeaturesChanged(false);
  }, [restaurantResponse]);

  const mutation = useMutation({
    mutationFn: (data: RestaurantData) => {
      const { instagram_handle, tiktok_handle, ...rest } = data;
      return apiClient.updateRestaurant(restaurantId!, { ...rest, instagram_url: instagram_handle, tiktok_url: tiktok_handle });
    },
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-settings', restaurantId] });
      // El nombre sale en la barra superior: se actualiza sin esperar a recargar.
      setCurrentRestaurant({ ...currentRestaurant, name: data.name });
      setHasChanges(false);
    },
  });

  const featuresMutation = useMutation({
    mutationFn: (features: Record<string, boolean>) => apiClient.updateRestaurant(restaurantId!, { features }),
    onSuccess: (_, features) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-settings', restaurantId] });
      // El menú lateral se filtra con currentRestaurant.features. Antes se invalidaba
      // una consulta 'current-user' que no existe y el menú no cambiaba hasta recargar.
      setCurrentRestaurant({ ...currentRestaurant, features: { ...parseFeatures(currentRestaurant?.features), ...features } });
      setFeaturesChanged(false);
    },
  });

  const updateField = <K extends keyof RestaurantData>(field: K, value: RestaurantData[K]) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
    setHasChanges(true);
  };
  const text = (field: keyof RestaurantData, label: string, extra: Record<string, unknown> = {}) => (
    <TextField fullWidth label={label} value={formData?.[field] ?? ''} onChange={(e) => updateField(field, e.target.value as never)} {...extra} />
  );

  if (!restaurantId) return <Alert severity="warning">No hay restaurante seleccionado.</Alert>;
  if (error) return <Alert severity="error">Error al cargar la configuración: {(error as Error)?.message}</Alert>;
  if (isLoading || !formData) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  const at = { InputProps: { startAdornment: <InputAdornment position="start">@</InputAdornment> }, placeholder: 'usuario' };

  return (
    <Box>
      <PageHeader
        icon={<SettingsIcon />}
        title="Configuración"
        subtitle="Los datos de tu restaurante"
        actions={activeTab !== 'features' && (
          <Button variant="contained" startIcon={mutation.isPending ? <CircularProgress size={18} color="inherit" /> : <Save />}
            onClick={() => mutation.mutate(formData)} disabled={!hasChanges || mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        )}
      />

      {mutation.isSuccess && !hasChanges && <Alert severity="success" sx={{ mb: 3 }}>Cambios guardados.</Alert>}
      {mutation.isError && <Alert severity="error" sx={{ mb: 3 }}>Error al guardar: {(mutation.error as Error)?.message}</Alert>}

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Información" value="info" />
        <Tab label="Localización" value="location" />
        <Tab label="Servicios" value="services" />
        <Tab label="Redes sociales" value="social" />
        {user?.is_superadmin && <Tab label="Funcionalidades" value="features" />}
      </Tabs>

      {activeTab === 'info' && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Panel icon={<Restaurant />} title="Datos del restaurante">
              <Grid container spacing={2.5}>
                <Grid item xs={12}>{text('name', 'Nombre del restaurante', { required: true })}</Grid>
                <Grid item xs={12}>{text('description', 'Descripción', { multiline: true, rows: 4, placeholder: 'Describe tu restaurante…' })}</Grid>
              </Grid>
            </Panel>
          </Grid>
          <Grid item xs={12} md={6}>
            <Panel icon={<ContactMail />} title="Contacto">
              <Grid container spacing={2.5}>
                <Grid item xs={12}>{text('email', 'Email', { type: 'email' })}</Grid>
                <Grid item xs={12} sm={6}>{text('phone', 'Teléfono', { type: 'tel' })}</Grid>
                <Grid item xs={12} sm={6}>{text('website', 'Sitio web', { type: 'url', placeholder: 'https://…' })}</Grid>
              </Grid>
            </Panel>
          </Grid>
        </Grid>
      )}

      {activeTab === 'location' && (
        <Panel icon={<LocationOn />} title="Ubicación">
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6} md={4}>{text('city', 'Ciudad')}</Grid>
            <Grid item xs={12} sm={6} md={4}>{text('country', 'País')}</Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth select label="Zona horaria" value={formData.timezone}
                onChange={(e) => updateField('timezone', e.target.value)} SelectProps={{ native: true }}>
                <option value="Europe/Madrid">Europe/Madrid (CET)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>{text('google_maps_url', 'URL de Google Maps', { type: 'url', placeholder: 'https://maps.google.com/…' })}</Grid>
          </Grid>
        </Panel>
      )}

      {activeTab === 'services' && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Panel icon={<Wifi />} title="Servicios">
              <Grid container spacing={2}>
                {SERVICES.map((service) => {
                  const on = formData[service.key];
                  return (
                    <Grid item xs={12} sm={4} key={service.key}>
                      <Box sx={{
                        p: 2.5, textAlign: 'center', border: 1, borderColor: on ? 'primary.main' : 'divider',
                        bgcolor: on ? alpha(DATA.cobalt, 0.05) : 'transparent', transition: 'all 0.2s',
                      }}>
                        <Typography variant="subtitle1" fontWeight={600}>{service.label}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{service.desc}</Typography>
                        <Switch checked={on} onChange={(e) => updateField(service.key, e.target.checked)} inputProps={{ 'aria-label': service.label }} />
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Panel>
          </Grid>
          <Grid item xs={12} md={4}>
            <Panel title="Capacidad">
              <Typography variant="h2" sx={{ textAlign: 'center', color: DATA.cobalt }}>{formData.capacity}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>personas como máximo</Typography>
              <TextField fullWidth type="number" label="Capacidad total" value={formData.capacity}
                onChange={(e) => updateField('capacity', parseInt(e.target.value, 10) || 0)} />
            </Panel>
          </Grid>
        </Grid>
      )}

      {activeTab === 'social' && (
        <Panel icon={<Share />} title="Redes sociales">
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>{text('facebook_url', 'Facebook', { type: 'url', placeholder: 'https://facebook.com/…' })}</Grid>
            <Grid item xs={12} sm={6}>{text('instagram_handle', 'Instagram', at)}</Grid>
            <Grid item xs={12} sm={6}>{text('tiktok_handle', 'TikTok', at)}</Grid>
            <Grid item xs={12} sm={6}>{text('youtube_url', 'YouTube', { type: 'url', placeholder: 'https://youtube.com/…' })}</Grid>
            <Grid item xs={12}>{text('tripadvisor_url', 'Tripadvisor', { type: 'url', placeholder: 'https://tripadvisor.com/…' })}</Grid>
          </Grid>
        </Panel>
      )}

      {activeTab === 'features' && user?.is_superadmin && (
        <Panel
          icon={<AdminPanelSettings />}
          title="Funcionalidades"
          subtitle="Qué secciones del panel ve el personal de este restaurante (el superadmin las ve todas)."
          action={
            <Button variant="contained" size="small" startIcon={<Save />} onClick={() => featuresMutation.mutate(featureFlags)}
              disabled={!featuresChanged || featuresMutation.isPending}>
              {featuresMutation.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          }
        >
          {featuresMutation.isSuccess && !featuresChanged && <Alert severity="success" sx={{ mb: 3 }}>Funcionalidades actualizadas.</Alert>}
          {featuresMutation.isError && <Alert severity="error" sx={{ mb: 3 }}>Error al guardar: {(featuresMutation.error as Error)?.message}</Alert>}
          <Grid container spacing={2}>
            {FEATURES.map((feature) => {
              const on = featureFlags[feature.key] !== false;
              return (
                <Grid item xs={12} sm={6} md={4} key={feature.key}>
                  <Box sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, border: 1,
                    borderColor: on ? alpha(STATUS_COLORS.confirmed, 0.4) : 'divider', bgcolor: on ? alpha(STATUS_COLORS.confirmed, 0.05) : 'transparent',
                  }}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>{feature.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{feature.desc}</Typography>
                    </Box>
                    <Switch checked={on} inputProps={{ 'aria-label': feature.label }}
                      onChange={() => { setFeatureFlags((prev) => ({ ...prev, [feature.key]: !on })); setFeaturesChanged(true); }} />
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Panel>
      )}
    </Box>
  );
}
