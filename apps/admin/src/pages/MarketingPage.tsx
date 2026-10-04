// apps/admin/src/pages/MarketingPage.tsx
// Modal de bienvenida (único tipo de campaña: informativo, sin captación) y
// notificaciones push. La tarjeta de sellos tiene su propia pantalla (Lealtad).

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Card, CardActions, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, FormControlLabel, Grid, IconButton, InputLabel, MenuItem, Select, Slider,
  Snackbar, Stack, Switch, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Add as AddIcon, Campaign as CampaignIcon, Delete as DeleteIcon, Edit as EditIcon, Notifications as NotificationsIcon, Send as SendIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/apiClient';
import { parseFeatures } from '../components/layout/navigation';
import { PageHeader } from '../components/common/PageHeader';
import { Panel } from '../components/common/Panel';
import { STATUS_COLORS } from '../theme';

interface CampaignContent {
  title?: string;
  body?: string;
  media_type?: 'image' | 'video' | 'none';
  media_url?: string;
  video_poster?: string;
  cta_label?: string;
  secondary_cta?: { label?: string; url?: string } | null;
}

interface CampaignSettings {
  auto_open?: boolean;
  delay?: number;
  frequency?: 'once' | 'session' | 'daily' | 'always';
  dismissible?: boolean;
  use_branding?: boolean;
}

interface WelcomeCampaign {
  id: string;
  name: string;
  is_active: boolean;
  content: CampaignContent;
  settings: CampaignSettings;
}

type CampaignForm = Omit<WelcomeCampaign, 'id'> & { id?: string };
type Toast = { message: string; severity: 'success' | 'error' | 'warning' } | null;

const FREQUENCY_LABELS: Record<string, string> = {
  once: 'Una vez (nunca más)',
  session: 'Una vez por sesión',
  daily: 'Una vez al día',
  always: 'Cada vez que entre',
};

const emptyCampaign = (): CampaignForm => ({
  name: '',
  is_active: true,
  content: { media_type: 'none' },
  settings: { auto_open: true, delay: 1500, frequency: 'once', dismissible: true, use_branding: true },
});

const errorMessage = (err: any, fallback: string) => err?.response?.data?.message || err?.message || fallback;

function CampaignDialog({ form, onChange, onClose, onSave, saving, otherActive }: {
  form: CampaignForm | null;
  onChange: (form: CampaignForm) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  otherActive: boolean;
}) {
  if (!form) return null;
  const content = (patch: Partial<CampaignContent>) => onChange({ ...form, content: { ...form.content, ...patch } });
  const settings = (patch: Partial<CampaignSettings>) => onChange({ ...form, settings: { ...form.settings, ...patch } });
  const autoOpen = form.settings.auto_open !== false;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{form.id ? 'Editar modal de bienvenida' : 'Nuevo modal de bienvenida'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <TextField fullWidth label="Nombre interno" placeholder="Bienvenida 2026" InputLabelProps={{ shrink: true }}
            helperText="Solo para identificarlo aquí; el cliente no lo ve"
            value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} />
          <FormControlLabel label="Modal activo"
            control={<Switch checked={form.is_active} onChange={(e) => onChange({ ...form, is_active: e.target.checked })} />} />
          {otherActive && form.is_active && (
            <Alert severity="warning">Ya hay otro modal activo. La carta solo enseña uno: el más reciente.</Alert>
          )}

          <Divider />
          <Typography variant="overline" color="text.secondary">Contenido</Typography>
          <TextField fullWidth label="Título" placeholder="¡Bienvenido!" InputLabelProps={{ shrink: true }}
            value={form.content.title || ''} onChange={(e) => content({ title: e.target.value })} />
          <TextField fullWidth multiline rows={3} label="Texto" InputLabelProps={{ shrink: true }}
            placeholder="Esperamos que disfrutes tu experiencia con nosotros…"
            value={form.content.body || ''} onChange={(e) => content({ body: e.target.value })} />
          <FormControl fullWidth>
            <InputLabel>Cabecera</InputLabel>
            <Select label="Cabecera" value={form.content.media_type || 'none'}
              onChange={(e) => content({ media_type: e.target.value as CampaignContent['media_type'] })}>
              <MenuItem value="none">Sin imagen</MenuItem>
              <MenuItem value="image">Imagen</MenuItem>
              <MenuItem value="video">Vídeo</MenuItem>
            </Select>
          </FormControl>
          {form.content.media_type && form.content.media_type !== 'none' && (
            <TextField fullWidth label={form.content.media_type === 'video' ? 'URL del vídeo' : 'URL de la imagen'} placeholder="https://…"
              InputLabelProps={{ shrink: true }} value={form.content.media_url || ''} onChange={(e) => content({ media_url: e.target.value })} />
          )}
          {form.content.media_type === 'video' && (
            <TextField fullWidth label="Imagen de portada del vídeo (opcional)" placeholder="https://…" InputLabelProps={{ shrink: true }}
              value={form.content.video_poster || ''} onChange={(e) => content({ video_poster: e.target.value })} />
          )}
          <TextField fullWidth label="Texto del botón principal" placeholder="¡Entendido!" InputLabelProps={{ shrink: true }}
            value={form.content.cta_label || ''} onChange={(e) => content({ cta_label: e.target.value })} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField fullWidth label="Enlace secundario: texto" placeholder="Síguenos en Instagram" InputLabelProps={{ shrink: true }}
              value={form.content.secondary_cta?.label || ''}
              onChange={(e) => content({ secondary_cta: { ...form.content.secondary_cta, label: e.target.value } })} />
            <TextField fullWidth label="Enlace secundario: URL" placeholder="https://instagram.com/…" InputLabelProps={{ shrink: true }}
              value={form.content.secondary_cta?.url || ''}
              onChange={(e) => content({ secondary_cta: { ...form.content.secondary_cta, url: e.target.value } })} />
          </Stack>

          <Divider />
          <Typography variant="overline" color="text.secondary">Comportamiento</Typography>
          <FormControlLabel label="Abrir automáticamente al entrar"
            control={<Switch checked={autoOpen} onChange={(e) => settings({ auto_open: e.target.checked })} />} />
          {autoOpen && (
            <>
              <Box sx={{ px: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Retardo antes de mostrarlo: {((form.settings.delay || 1500) / 1000).toFixed(1)} s
                </Typography>
                <Slider min={500} max={10000} step={500} value={form.settings.delay || 1500}
                  onChange={(_, value) => settings({ delay: value as number })}
                  marks={[{ value: 500, label: '0,5 s' }, { value: 3000, label: '3 s' }, { value: 5000, label: '5 s' }, { value: 10000, label: '10 s' }]} />
              </Box>
              <FormControl fullWidth size="small">
                <InputLabel>Frecuencia</InputLabel>
                <Select label="Frecuencia" value={form.settings.frequency || 'once'}
                  onChange={(e) => settings({ frequency: e.target.value as CampaignSettings['frequency'] })}>
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                </Select>
              </FormControl>
            </>
          )}
          <FormControlLabel label="Permitir cerrarlo (X o tocar fuera)"
            control={<Switch checked={form.settings.dismissible !== false} onChange={(e) => settings({ dismissible: e.target.checked })} />} />
          <FormControlLabel label="Usar el color de marca del restaurante"
            control={<Switch checked={form.settings.use_branding !== false} onChange={(e) => settings({ use_branding: e.target.checked })} />} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={onSave} disabled={saving || !form.name.trim()}>
          {saving ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear modal'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function MarketingPage() {
  const { currentRestaurant, setCurrentRestaurant } = useAuth();
  const restaurantId: string | undefined = currentRestaurant?.id;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'welcome' | 'push'>('welcome');
  const [form, setForm] = useState<CampaignForm | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [notification, setNotification] = useState({ title: '', message: '', url: '', image_url: '' });

  const features = parseFeatures(currentRestaurant?.features);
  const [pushEnabled, setPushEnabled] = useState(features.push_notifications_enabled !== false);
  useEffect(() => {
    setPushEnabled(parseFeatures(currentRestaurant?.features).push_notifications_enabled !== false);
  }, [currentRestaurant?.features]);

  const { data: campaigns = [], isLoading } = useQuery<WelcomeCampaign[]>({
    queryKey: ['campaigns', restaurantId],
    queryFn: async () => (await apiClient.client.get(`/api/restaurants/${restaurantId}/campaigns`)).data.campaigns || [],
    enabled: !!restaurantId,
  });
  // Solo mientras se mira la pestaña de push (antes, cada 30 s siempre).
  const { data: subscriberCount } = useQuery<number>({
    queryKey: ['subscriberCount', restaurantId],
    queryFn: async () => (await apiClient.client.get(`/api/restaurants/${restaurantId}/notifications/subscribers`)).data.subscriber_count ?? 0,
    enabled: !!restaurantId && tab === 'push',
    refetchInterval: tab === 'push' ? 30_000 : false,
  });

  const invalidateCampaigns = () => queryClient.invalidateQueries({ queryKey: ['campaigns', restaurantId] });

  // content y settings van como objetos: antes se mandaban ya convertidos a
  // texto, el worker los volvía a codificar y la carta no leía la frecuencia ni
  // el retardo.
  const saveCampaign = useMutation({
    mutationFn: async (f: CampaignForm) => {
      const payload = { name: f.name, is_active: f.is_active, content: f.content, settings: f.settings, type: 'welcome_modal', restaurant_id: restaurantId };
      return f.id ? apiClient.client.put(`/api/campaigns/${f.id}`, payload) : apiClient.client.post('/api/campaigns', payload);
    },
    onSuccess: () => {
      invalidateCampaigns();
      setForm(null);
      setToast({ message: 'Guardado', severity: 'success' });
    },
    onError: (err) => setToast({ message: errorMessage(err, 'Error al guardar'), severity: 'error' }),
  });
  const deleteCampaign = useMutation({
    mutationFn: (id: string) => apiClient.client.delete(`/api/campaigns/${id}`),
    onSuccess: () => {
      invalidateCampaigns();
      setToast({ message: 'Eliminado', severity: 'success' });
    },
    onError: (err) => setToast({ message: errorMessage(err, 'Error al eliminar'), severity: 'error' }),
  });
  // features puede venir como JSON en texto: hacer spread de ese string
  // guardaba un objeto carácter a carácter.
  const togglePush = useMutation({
    mutationFn: (enabled: boolean) => apiClient.updateRestaurant(restaurantId!, {
      features: { ...parseFeatures(currentRestaurant?.features), push_notifications_enabled: enabled },
    }),
    onMutate: (enabled) => setPushEnabled(enabled),
    onSuccess: (_, enabled) => {
      setCurrentRestaurant({ ...currentRestaurant, features: { ...parseFeatures(currentRestaurant?.features), push_notifications_enabled: enabled } });
      setToast({ message: `Captación ${enabled ? 'activada' : 'desactivada'}`, severity: 'success' });
    },
    onError: (err, enabled) => {
      setPushEnabled(!enabled);
      setToast({ message: errorMessage(err, 'Error al actualizar'), severity: 'error' });
    },
  });
  const sendNotification = useMutation({
    mutationFn: async () => (await apiClient.client.post(`/api/restaurants/${restaurantId}/notifications/send`, notification)).data,
    onSuccess: (data) => {
      const sent = data.sent_count || 0;
      const errors = data.errors?.length || 0;
      setToast(sent > 0
        ? { message: `Enviada a ${sent} de ${data.total_attempted || 0} dispositivos${errors ? ` (${errors} errores)` : ''}`, severity: errors ? 'warning' : 'success' }
        : { message: data.message || 'No hay suscriptores activos', severity: 'warning' });
      setNotification({ title: '', message: '', url: '', image_url: '' });
    },
    onError: (err) => setToast({ message: errorMessage(err, 'Error al enviar'), severity: 'error' }),
  });

  if (!restaurantId) return <Alert severity="info">Selecciona un restaurante.</Alert>;

  const otherActive = campaigns.some((c) => c.is_active && c.id !== form?.id);

  return (
    <Box>
      <PageHeader
        icon={<CampaignIcon />}
        title="Marketing"
        subtitle="Modal de bienvenida y notificaciones push"
        actions={tab === 'welcome' && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setForm(emptyCampaign())}>Nuevo modal</Button>
        )}
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="welcome" label="Modal de bienvenida" />
        <Tab value="push" label="Notificaciones push" />
      </Tabs>

      {tab === 'welcome' && (
        isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : campaigns.length === 0 ? (
          <Panel>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CampaignIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="h6" gutterBottom>Sin modal de bienvenida</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 420, mx: 'auto' }}>
                Un mensaje que recibe a tus clientes al abrir la carta: una oferta, una novedad o tu Instagram.
              </Typography>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setForm(emptyCampaign())}>Crear modal</Button>
            </Box>
          </Panel>
        ) : (
          <Grid container spacing={3}>
            {campaigns.map((c) => (
              <Grid item xs={12} md={6} lg={4} key={c.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                      <Typography variant="h6">{c.name}</Typography>
                      <Chip size="small" label={c.is_active ? 'Activo' : 'Inactivo'}
                        sx={{ bgcolor: c.is_active ? alpha(STATUS_COLORS.confirmed, 0.1) : 'action.hover', color: c.is_active ? STATUS_COLORS.confirmed : 'text.secondary', fontWeight: 600 }} />
                    </Box>
                    {c.content?.title && <Typography variant="body2" color="text.secondary">«{c.content.title}»</Typography>}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      {c.settings?.auto_open === false ? 'Se abre a mano' : `Se abre solo · ${FREQUENCY_LABELS[c.settings?.frequency || 'once'].toLowerCase()}`}
                    </Typography>
                  </CardContent>
                  <Divider />
                  <CardActions>
                    <Button size="small" startIcon={<EditIcon />} onClick={() => setForm({ ...c })}>Editar</Button>
                    <IconButton size="small" color="error" sx={{ ml: 'auto' }} aria-label="Eliminar" disabled={deleteCampaign.isPending}
                      onClick={() => window.confirm('¿Eliminar este modal de bienvenida?') && deleteCampaign.mutate(c.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )
      )}

      {tab === 'push' && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Panel
              icon={<NotificationsIcon />}
              title="Enviar notificación"
              action={
                <FormControlLabel label="Captación activa" sx={{ mr: 0 }}
                  control={<Switch checked={pushEnabled} disabled={togglePush.isPending} onChange={(e) => togglePush.mutate(e.target.checked)} />} />
              }
            >
              <Stack spacing={2}>
                <TextField fullWidth label="Título" placeholder="¡Nueva oferta especial!" InputLabelProps={{ shrink: true }}
                  value={notification.title} onChange={(e) => setNotification({ ...notification, title: e.target.value })} />
                <TextField fullWidth multiline rows={3} label="Mensaje" placeholder="Descubre nuestro nuevo plato…" InputLabelProps={{ shrink: true }}
                  value={notification.message} onChange={(e) => setNotification({ ...notification, message: e.target.value })} />
                <TextField fullWidth label="URL de destino (opcional)" placeholder="https://…" InputLabelProps={{ shrink: true }}
                  value={notification.url} onChange={(e) => setNotification({ ...notification, url: e.target.value })} />
                <TextField fullWidth label="URL de imagen (opcional)" placeholder="https://…/imagen.jpg" InputLabelProps={{ shrink: true }}
                  helperText="Imagen grande dentro de la notificación"
                  value={notification.image_url} onChange={(e) => setNotification({ ...notification, image_url: e.target.value })} />
                <Button variant="contained" size="large" startIcon={sendNotification.isPending ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                  disabled={sendNotification.isPending || !notification.title || !notification.message}
                  onClick={() => sendNotification.mutate()}>
                  {sendNotification.isPending ? 'Enviando…' : `Enviar a ${subscriberCount ?? '…'} dispositivos`}
                </Button>
              </Stack>
            </Panel>
          </Grid>
          <Grid item xs={12} md={5}>
            <Panel title="Cómo funciona">
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2">Captación automática</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Los clientes que aceptan recibir avisos en la carta quedan suscritos a este restaurante.
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Sin spam</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Envía solo lo que le interesa a quien ya ha estado: una novedad, un evento, una oferta.
                  </Typography>
                </Box>
              </Stack>
            </Panel>
          </Grid>
        </Grid>
      )}

      <CampaignDialog form={form} onChange={setForm} onClose={() => setForm(null)} otherActive={otherActive}
        saving={saveCampaign.isPending} onSave={() => form && saveCampaign.mutate(form)} />

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast?.severity || 'success'} variant="filled" onClose={() => setToast(null)}>{toast?.message}</Alert>
      </Snackbar>
    </Box>
  );
}
