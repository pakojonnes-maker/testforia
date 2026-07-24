// apps/admin/src/pages/MarketingPage.tsx
// Welcome modal editor + push notifications. Rework: single campaign type
// (welcome_modal, purely informative — no lead capture) after removing
// scratch&win / events / leads. Loyalty (stamp card) has its own admin page.

import { useState, useEffect } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  alpha,
  Tabs,
  Tab,
  Snackbar,
  LinearProgress,
  Slider
} from '@mui/material';
import {
  Campaign as CampaignIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Notifications as NotificationsIcon,
  CardGiftcard as GiftIcon,
  Celebration as CelebrationIcon,
  Person as PersonIcon,
  CheckCircle as CheckIcon,
  Send as SendIcon
} from '@mui/icons-material';


// ============================================
// INTERFACES
// ============================================

interface WelcomeCampaign {
  id: string;
  restaurant_id: string;
  name: string;
  type: 'welcome_modal';
  is_active: boolean;
  content: {
    title?: string;
    body?: string;
    media_type?: 'image' | 'video' | 'none';
    media_url?: string;
    video_poster?: string;
    cta_label?: string;
    secondary_cta?: { label?: string; url?: string } | null;
  };
  settings?: {
    auto_open?: boolean;
    delay?: number;
    frequency?: 'once' | 'session' | 'daily' | 'always';
    dismissible?: boolean;
    use_branding?: boolean;
  };
  created_at?: string;
}

// ============================================
// THEME COLORS
// ============================================

const COLORS = {
  welcome: '#6366f1',      // Indigo for Welcome Modal
  success: '#22c55e',
  danger: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#14b8a6',
};

const FREQUENCY_LABELS: Record<string, string> = {
  once: 'Una vez (nunca más)',
  session: 'Una vez por sesión',
  daily: 'Una vez al día',
  always: 'Cada vez que entre',
};

// ============================================
// COMPONENT
// ============================================

const MarketingPage: React.FC = () => {
  const { currentRestaurant } = useAuth();
  const restaurantId = currentRestaurant?.id;
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  });

  // Dialog state
  const [campaignDialog, setCampaignDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<WelcomeCampaign | null>(null);

  // Form state
  const emptyForm: Partial<WelcomeCampaign> = {
    type: 'welcome_modal',
    is_active: true,
    content: { media_type: 'none' },
    settings: { auto_open: true, delay: 1500, frequency: 'once', dismissible: true, use_branding: true }
  };
  const [campaignForm, setCampaignForm] = useState<Partial<WelcomeCampaign>>(emptyForm);

  // Push notification state
  const [pushEnabled, setPushEnabled] = useState(true);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    url: '',
    image_url: ''
  });
  const [isSending, setIsSending] = useState(false);

  // ============================================
  // QUERIES
  // ============================================

  const { data: campaigns, isLoading } = useQuery<WelcomeCampaign[]>({
    queryKey: ['campaigns', restaurantId],
    queryFn: async () => {
      const res = await apiClient.client.get(`/api/restaurants/${restaurantId}/campaigns`);
      return res.data.campaigns || [];
    },
    enabled: !!restaurantId
  });

  const { data: subscriberData } = useQuery<{ subscriber_count: number }>({
    queryKey: ['subscriberCount', restaurantId],
    queryFn: async () => {
      const res = await apiClient.client.get(`/api/restaurants/${restaurantId}/notifications/subscribers`);
      return res.data;
    },
    enabled: !!restaurantId,
    refetchInterval: 30000
  });

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    if (currentRestaurant?.features) {
      setPushEnabled(currentRestaurant.features.push_notifications_enabled !== false);
    }
  }, [currentRestaurant]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleEditCampaign = (campaign: WelcomeCampaign) => {
    setSelectedCampaign(campaign);
    const parsedContent = typeof campaign.content === 'string'
      ? JSON.parse(campaign.content)
      : campaign.content || {};
    const parsedSettings = typeof campaign.settings === 'string'
      ? JSON.parse(campaign.settings as any)
      : campaign.settings || {};

    setCampaignForm({
      ...campaign,
      content: parsedContent,
      settings: parsedSettings
    });
    setCampaignDialog(true);
  };

  const handleNewCampaign = () => {
    setSelectedCampaign(null);
    setCampaignForm(emptyForm);
    setCampaignDialog(true);
  };

  const handleSaveCampaign = async () => {
    if (!campaignForm.name) {
      setSnackbar({ open: true, message: 'Ponle un nombre a la campaña', severity: 'error' });
      return;
    }
    try {
      const url = selectedCampaign
        ? `/api/campaigns/${selectedCampaign.id}`
        : `/api/campaigns`;
      const method = selectedCampaign ? 'put' : 'post';

      await apiClient.client[method](url, {
        ...campaignForm,
        restaurant_id: restaurantId,
        type: 'welcome_modal',
        content: JSON.stringify(campaignForm.content || {}),
        settings: JSON.stringify(campaignForm.settings || {})
      });

      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setCampaignDialog(false);
      setSnackbar({ open: true, message: 'Guardado ✅', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Error al guardar', severity: 'error' });
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('¿Eliminar este modal de bienvenida?')) return;
    try {
      await apiClient.client.delete(`/api/campaigns/${id}`);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setSnackbar({ open: true, message: 'Eliminado', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: 'Error al eliminar', severity: 'error' });
    }
  };

  const handleTogglePush = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setPushEnabled(newValue);
    try {
      await apiClient.client.put(`/restaurants/${restaurantId}`, {
        features: { ...currentRestaurant?.features, push_notifications_enabled: newValue }
      });
      setSnackbar({ open: true, message: `Captación ${newValue ? 'activada' : 'desactivada'}`, severity: 'success' });
    } catch (error) {
      setPushEnabled(!newValue);
      setSnackbar({ open: true, message: 'Error al actualizar', severity: 'error' });
    }
  };

  const handleSendNotification = async () => {
    if (!notificationForm.title || !notificationForm.message) return;
    setIsSending(true);
    try {
      const res = await apiClient.client.post(`/api/restaurants/${restaurantId}/notifications/send`, notificationForm);
      const data = res.data;
      const sentCount = data.sent_count || 0;
      const totalAttempted = data.total_attempted || 0;
      const errorCount = data.errors?.length || 0;

      if (sentCount > 0) {
        setSnackbar({
          open: true,
          message: `📲 Enviada a ${sentCount}/${totalAttempted} dispositivos${errorCount > 0 ? ` (${errorCount} errores)` : ''}`,
          severity: errorCount > 0 ? 'warning' as const : 'success' as const
        });
      } else {
        setSnackbar({ open: true, message: data.message || 'No hay suscriptores activos', severity: 'warning' });
      }
      setNotificationForm({ title: '', message: '', url: '', image_url: '' });
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || 'Error al enviar';
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderCampaignCard = (campaign: WelcomeCampaign) => {
    const content = typeof campaign.content === 'string' ? JSON.parse(campaign.content) : campaign.content || {};

    return (
      <Card
        key={campaign.id}
        sx={{
          background: `linear-gradient(135deg, ${alpha(COLORS.welcome, 0.12)} 0%, ${alpha(COLORS.welcome, 0.03)} 100%)`,
          border: `1px solid ${alpha(COLORS.welcome, 0.2)}`,
          borderRadius: 3,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 16px 40px ${alpha(COLORS.welcome, 0.25)}`,
            borderColor: alpha(COLORS.welcome, 0.4),
          }
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box sx={{
                p: 1.25,
                borderRadius: 2,
                bgcolor: alpha(COLORS.welcome, 0.15),
                color: COLORS.welcome,
                display: 'flex',
                boxShadow: `0 4px 12px ${alpha(COLORS.welcome, 0.2)}`
              }}>
                <CampaignIcon sx={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
                  {campaign.name}
                </Typography>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.5) }}>
                  👋 Modal de Bienvenida
                </Typography>
              </Box>
            </Box>
            <Chip
              size="small"
              label={campaign.is_active ? 'Activa' : 'Inactiva'}
              sx={{
                bgcolor: campaign.is_active ? alpha(COLORS.success, 0.15) : alpha('#666', 0.15),
                color: campaign.is_active ? COLORS.success : '#888',
                fontWeight: 600,
                fontSize: '0.7rem'
              }}
            />
          </Box>

          {content?.title && (
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.7), mb: 2, fontSize: '0.85rem' }}>
              "{content.title}"
            </Typography>
          )}

          <Divider sx={{ borderColor: alpha('#fff', 0.08), my: 2 }} />

          <Box display="flex" gap={1} flexWrap="wrap">
            <Button
              size="small"
              startIcon={<EditIcon />}
              onClick={() => handleEditCampaign(campaign)}
              sx={{
                color: COLORS.welcome,
                borderColor: alpha(COLORS.welcome, 0.3),
                '&:hover': { bgcolor: alpha(COLORS.welcome, 0.1) }
              }}
              variant="outlined"
            >
              Editar
            </Button>
            <IconButton
              size="small"
              onClick={() => handleDeleteCampaign(campaign.id)}
              sx={{ color: alpha(COLORS.danger, 0.7), ml: 'auto' }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  if (!restaurantId) {
    return (
      <Box p={4} textAlign="center">
        <Typography color="text.secondary">Selecciona un restaurante</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            🎯 Marketing
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Modal de bienvenida y notificaciones push
          </Typography>
        </Box>
        {activeTab === 0 && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewCampaign}
            sx={{
              bgcolor: COLORS.purple,
              px: 3,
              py: 1.25,
              borderRadius: 2,
              fontWeight: 600,
              boxShadow: `0 8px 24px ${alpha(COLORS.purple, 0.35)}`,
              '&:hover': {
                bgcolor: alpha(COLORS.purple, 0.85),
                boxShadow: `0 12px 32px ${alpha(COLORS.purple, 0.45)}`
              }
            }}
          >
            Nuevo modal
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Paper sx={{
        bgcolor: alpha('#1a1a2e', 0.6),
        backdropFilter: 'blur(8px)',
        borderRadius: 3,
        border: `1px solid ${alpha('#fff', 0.05)}`,
        mb: 3
      }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            '& .MuiTab-root': {
              fontWeight: 600,
              textTransform: 'none',
              minHeight: 56
            }
          }}
        >
          <Tab icon={<CampaignIcon />} label="Modal de Bienvenida" iconPosition="start" />
          <Tab icon={<NotificationsIcon />} label="Push Notifications" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          {isLoading ? (
            <LinearProgress sx={{ borderRadius: 1 }} />
          ) : campaigns && campaigns.length > 0 ? (
            <Grid container spacing={3}>
              {campaigns.map(c => (
                <Grid item xs={12} md={6} lg={4} key={c.id}>
                  {renderCampaignCard(c)}
                </Grid>
              ))}
            </Grid>
          ) : (
            <Paper sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: alpha('#1a1a2e', 0.4),
              borderRadius: 3,
              border: `1px dashed ${alpha('#fff', 0.1)}`
            }}>
              <CelebrationIcon sx={{ fontSize: 64, color: alpha('#fff', 0.15), mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Sin modal de bienvenida
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                Crea un modal informativo para recibir a tus clientes al entrar al menú
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleNewCampaign}
                sx={{ borderColor: alpha('#fff', 0.2), color: 'white' }}
              >
                Crear modal
              </Button>
            </Paper>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{
              p: 3,
              bgcolor: alpha('#1a1a2e', 0.6),
              borderRadius: 3,
              border: `1px solid ${alpha(COLORS.cyan, 0.15)}`
            }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  📲 Enviar Notificación
                </Typography>
                <FormControlLabel
                  control={<Switch checked={pushEnabled} onChange={handleTogglePush} color="success" />}
                  label={<Typography variant="caption">Captación activa</Typography>}
                />
              </Box>

              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Título"
                  value={notificationForm.title}
                  onChange={e => setNotificationForm({ ...notificationForm, title: e.target.value })}
                  placeholder="¡Nueva oferta especial!"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="Mensaje"
                  value={notificationForm.message}
                  onChange={e => setNotificationForm({ ...notificationForm, message: e.target.value })}
                  placeholder="Descubre nuestro nuevo plato..."
                  multiline
                  rows={3}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="URL de destino (opcional)"
                  value={notificationForm.url}
                  onChange={e => setNotificationForm({ ...notificationForm, url: e.target.value })}
                  placeholder="https://..."
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="URL de imagen (opcional)"
                  value={notificationForm.image_url}
                  onChange={e => setNotificationForm({ ...notificationForm, image_url: e.target.value })}
                  placeholder="https://...imagen.jpg"
                  helperText="Imagen grande que aparecerá en la notificación"
                  InputLabelProps={{ shrink: true }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={isSending ? <CircularProgress size={18} /> : <SendIcon />}
                  onClick={handleSendNotification}
                  disabled={isSending || !notificationForm.title || !notificationForm.message}
                  sx={{
                    bgcolor: COLORS.cyan,
                    py: 1.5,
                    fontWeight: 600,
                    '&:hover': { bgcolor: alpha(COLORS.cyan, 0.85) }
                  }}
                >
                  {isSending ? 'Enviando...' : `Enviar a ${subscriberData?.subscriber_count ?? '...'} dispositivos`}
                </Button>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{
              p: 3,
              bgcolor: alpha('#1a1a2e', 0.6),
              borderRadius: 3,
              border: `1px solid ${alpha('#fff', 0.05)}`,
              height: '100%'
            }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                ℹ️ Cómo funciona
              </Typography>
              <Stack spacing={2}>
                <Box display="flex" gap={2}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(COLORS.welcome, 0.1), color: COLORS.welcome }}>
                    <PersonIcon />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">Captación automática</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Los usuarios que acepten recibir notificaciones se suscriben automáticamente
                    </Typography>
                  </Box>
                </Box>
                <Box display="flex" gap={2}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(COLORS.success, 0.1), color: COLORS.success }}>
                    <CheckIcon />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">Sin spam</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Envía notificaciones relevantes para mantener a tus clientes informados
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ============================================ */}
      {/* CAMPAIGN DIALOG */}
      {/* ============================================ */}
      <Dialog
        open={campaignDialog}
        onClose={() => setCampaignDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1a2e',
            backgroundImage: 'none',
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{
          borderBottom: `1px solid ${alpha('#fff', 0.05)}`,
          pb: 2
        }}>
          <Box display="flex" alignItems="center" gap={2}>
            <CampaignIcon sx={{ color: COLORS.purple }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {selectedCampaign ? 'Editar Modal de Bienvenida' : 'Nuevo Modal de Bienvenida'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Nombre interno de la campaña"
              value={campaignForm.name || ''}
              onChange={e => setCampaignForm({ ...campaignForm, name: e.target.value })}
              placeholder="Ej: Bienvenida 2026"
              helperText="Solo para identificarla aquí en el panel, el cliente no la ve"
              InputLabelProps={{ shrink: true }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={campaignForm.is_active}
                  onChange={e => setCampaignForm({ ...campaignForm, is_active: e.target.checked })}
                  color="success"
                />
              }
              label="Modal activo"
            />

            {campaigns && campaigns.filter(c => c.is_active && c.id !== selectedCampaign?.id).length > 0 && campaignForm.is_active && (
              <Alert severity="warning" sx={{ bgcolor: alpha('#f59e0b', 0.1), color: '#f59e0b', borderRadius: 2 }}>
                ⚠️ Ya tienes otro modal de bienvenida activo. Solo se mostrará uno.
              </Alert>
            )}

            <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />

            {/* Content Section */}
            <Typography variant="subtitle2" sx={{ color: alpha('#fff', 0.5), display: 'flex', alignItems: 'center', gap: 1 }}>
              <GiftIcon fontSize="small" /> Contenido
            </Typography>

            <TextField
              fullWidth
              label="Título"
              value={campaignForm.content?.title || ''}
              onChange={e => setCampaignForm({
                ...campaignForm,
                content: { ...campaignForm.content, title: e.target.value }
              })}
              placeholder="¡Bienvenido!"
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Texto"
              value={campaignForm.content?.body || ''}
              onChange={e => setCampaignForm({
                ...campaignForm,
                content: { ...campaignForm.content, body: e.target.value }
              })}
              placeholder="Esperamos que disfrutes tu experiencia con nosotros..."
              multiline
              rows={3}
              InputLabelProps={{ shrink: true }}
            />

            <FormControl fullWidth>
              <InputLabel>Cabecera</InputLabel>
              <Select
                value={campaignForm.content?.media_type || 'none'}
                label="Cabecera"
                onChange={e => setCampaignForm({
                  ...campaignForm,
                  content: { ...campaignForm.content, media_type: e.target.value as 'image' | 'video' | 'none' }
                })}
              >
                <MenuItem value="none">Sin imagen (solo icono)</MenuItem>
                <MenuItem value="image">🖼️ Imagen</MenuItem>
                <MenuItem value="video">🎬 Vídeo</MenuItem>
              </Select>
            </FormControl>

            {campaignForm.content?.media_type !== 'none' && (
              <TextField
                fullWidth
                label={campaignForm.content?.media_type === 'video' ? 'URL del vídeo' : 'URL de la imagen'}
                value={campaignForm.content?.media_url || ''}
                onChange={e => setCampaignForm({
                  ...campaignForm,
                  content: { ...campaignForm.content, media_url: e.target.value }
                })}
                placeholder="https://..."
                InputLabelProps={{ shrink: true }}
              />
            )}

            {campaignForm.content?.media_type === 'video' && (
              <TextField
                fullWidth
                label="Imagen de portada del vídeo (poster, opcional)"
                value={campaignForm.content?.video_poster || ''}
                onChange={e => setCampaignForm({
                  ...campaignForm,
                  content: { ...campaignForm.content, video_poster: e.target.value }
                })}
                placeholder="https://..."
                InputLabelProps={{ shrink: true }}
              />
            )}

            <TextField
              fullWidth
              label="Texto del botón principal"
              value={campaignForm.content?.cta_label || ''}
              onChange={e => setCampaignForm({
                ...campaignForm,
                content: { ...campaignForm.content, cta_label: e.target.value }
              })}
              placeholder="¡Entendido!"
              InputLabelProps={{ shrink: true }}
            />

            <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />
            <Typography variant="subtitle2" sx={{ color: alpha('#fff', 0.5) }}>
              🔗 Enlace secundario (opcional)
            </Typography>
            <Box display="flex" gap={2}>
              <TextField
                fullWidth
                label="Texto del enlace"
                value={campaignForm.content?.secondary_cta?.label || ''}
                onChange={e => setCampaignForm({
                  ...campaignForm,
                  content: {
                    ...campaignForm.content,
                    secondary_cta: { ...campaignForm.content?.secondary_cta, label: e.target.value }
                  }
                })}
                placeholder="Síguenos en Instagram"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="URL"
                value={campaignForm.content?.secondary_cta?.url || ''}
                onChange={e => setCampaignForm({
                  ...campaignForm,
                  content: {
                    ...campaignForm.content,
                    secondary_cta: { ...campaignForm.content?.secondary_cta, url: e.target.value }
                  }
                })}
                placeholder="https://instagram.com/..."
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />
            <Typography variant="subtitle2" sx={{ color: alpha('#fff', 0.5), display: 'flex', alignItems: 'center', gap: 1 }}>
              🚀 Comportamiento
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={campaignForm.settings?.auto_open !== false}
                  onChange={e => setCampaignForm({
                    ...campaignForm,
                    settings: { ...campaignForm.settings, auto_open: e.target.checked }
                  })}
                  color="primary"
                />
              }
              label="Abrir automáticamente al entrar"
            />

            {campaignForm.settings?.auto_open !== false && (
              <>
                <Box sx={{ px: 1 }}>
                  <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), mb: 1, display: 'block' }}>
                    ⏱️ Retardo antes de mostrar: {((campaignForm.settings?.delay || 1500) / 1000).toFixed(1)}s
                  </Typography>
                  <Slider
                    value={campaignForm.settings?.delay || 1500}
                    onChange={(_, value) => setCampaignForm({
                      ...campaignForm,
                      settings: { ...campaignForm.settings, delay: value as number }
                    })}
                    min={500}
                    max={10000}
                    step={500}
                    marks={[
                      { value: 500, label: '0.5s' },
                      { value: 3000, label: '3s' },
                      { value: 5000, label: '5s' },
                      { value: 10000, label: '10s' }
                    ]}
                    sx={{
                      color: COLORS.welcome,
                      '& .MuiSlider-markLabel': {
                        color: alpha('#fff', 0.4),
                        fontSize: '0.65rem'
                      }
                    }}
                  />
                </Box>

                <FormControl fullWidth size="small">
                  <InputLabel>Frecuencia</InputLabel>
                  <Select
                    label="Frecuencia"
                    value={campaignForm.settings?.frequency || 'once'}
                    onChange={e => setCampaignForm({
                      ...campaignForm,
                      settings: { ...campaignForm.settings, frequency: e.target.value as any }
                    })}
                  >
                    {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                      <MenuItem key={value} value={value}>{label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={campaignForm.settings?.dismissible !== false}
                  onChange={e => setCampaignForm({
                    ...campaignForm,
                    settings: { ...campaignForm.settings, dismissible: e.target.checked }
                  })}
                  color="primary"
                />
              }
              label="Permitir cerrar (X / tocar fuera)"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={campaignForm.settings?.use_branding !== false}
                  onChange={e => setCampaignForm({
                    ...campaignForm,
                    settings: { ...campaignForm.settings, use_branding: e.target.checked }
                  })}
                  color="primary"
                />
              }
              label="Usar color de marca del restaurante"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: `1px solid ${alpha('#fff', 0.05)}` }}>
          <Button onClick={() => setCampaignDialog(false)} sx={{ color: alpha('#fff', 0.5) }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCampaign}
            sx={{
              bgcolor: COLORS.purple,
              px: 4,
              '&:hover': { bgcolor: alpha(COLORS.purple, 0.85) }
            }}
          >
            {selectedCampaign ? 'Guardar cambios' : 'Crear modal'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MarketingPage;
