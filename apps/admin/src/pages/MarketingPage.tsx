// apps/admin/src/pages/MarketingPage.tsx
// Complete rewrite with modern dark theme and neon effects

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
  LinearProgress
} from '@mui/material';
import {
  Campaign as CampaignIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  QrCode as QrCodeIcon,
  Notifications as NotificationsIcon,
  Event as EventIcon,
  CardGiftcard as GiftIcon,
  Celebration as CelebrationIcon,
  Person as PersonIcon,
  DateRange as DateIcon,
  CheckCircle as CheckIcon,
  Send as SendIcon
} from '@mui/icons-material';


// ============================================
// INTERFACES
// ============================================

interface Campaign {
  id: string;
  restaurant_id: string;
  name: string;
  type: 'scratch_win' | 'welcome_modal' | 'event';
  is_active: boolean;
  content: {
    title?: string;
    description?: string;
    image_url?: string;
    location?: string;
  };
  settings?: {
    show_email?: boolean;
    show_phone?: boolean;
    auto_open?: boolean;
    delay?: number;
  };
  start_date?: string;
  end_date?: string;
  created_at?: string;
  stats?: {
    leads: number;
    redeemed: number;
    opened: number;
  };
}


interface Reward {
  id: string;
  campaign_id: string;
  name: string;
  description: string;
  probability: number;
  max_quantity: number | null;
  claimed_count?: number;
  image_url?: string;
  is_active: boolean;
}

// ============================================
// THEME COLORS
// ============================================

const COLORS = {
  scratch: '#f59e0b',      // Amber for Scratch & Win
  welcome: '#6366f1',      // Indigo for Welcome Modal
  event: '#ec4899',        // Pink for Events
  success: '#22c55e',
  danger: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#14b8a6',
};

const CAMPAIGN_CONFIG = {
  scratch_win: {
    label: 'Rasca y Gana',
    emoji: '🎰',
    color: COLORS.scratch,
    icon: GiftIcon,
    description: 'Los clientes rascan para ganar premios'
  },
  welcome_modal: {
    label: 'Bienvenida',
    emoji: '👋',
    color: COLORS.welcome,
    icon: CampaignIcon,
    description: 'Captura leads al entrar al menú'
  },
  event: {
    label: 'Evento',
    emoji: '🎉',
    color: COLORS.event,
    icon: EventIcon,
    description: 'Promoción con código QR'
  },
};

// ============================================
// COMPONENT
// ============================================

const MarketingPage: React.FC = () => {
  const { currentRestaurant } = useAuth();
  const restaurantId = currentRestaurant?.id;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  });

  // Dialog states
  const [campaignDialog, setCampaignDialog] = useState(false);
  const [rewardDialog, setRewardDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);

  // Form states
  const [campaignForm, setCampaignForm] = useState<Partial<Campaign>>({
    type: 'welcome_modal',
    is_active: true,
    content: {},
    settings: { show_email: true, show_phone: true }
  });
  const [rewardForm, setRewardForm] = useState<Partial<Reward>>({
    probability: 0.1,
    is_active: true
  });

  // Push notification state
  const [pushEnabled, setPushEnabled] = useState(true);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    url: '',
    image_url: ''
  });
  const [isSending, setIsSending] = useState(false);
  const [qrUrl, setQrUrl] = useState(''); // For QR generator prefill


  // ============================================
  // QUERIES
  // ============================================

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ['campaigns', restaurantId],
    queryFn: async () => {
      const res = await apiClient.client.get(`/api/restaurants/${restaurantId}/campaigns`);
      return res.data.campaigns || [];
    },
    enabled: !!restaurantId
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

  const handleEditCampaign = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);

    // Parse content and settings if they come as JSON strings
    const parsedContent = typeof campaign.content === 'string'
      ? JSON.parse(campaign.content)
      : campaign.content || {};

    const parsedSettings = typeof campaign.settings === 'string'
      ? JSON.parse(campaign.settings)
      : campaign.settings || {};

    setCampaignForm({
      ...campaign,
      content: parsedContent,
      settings: parsedSettings
    });
    setCampaignDialog(true);
    // Load rewards
    try {
      const res = await apiClient.client.get(`/api/campaigns/${campaign.id}/rewards`);
      setRewards(res.data.rewards || []);
    } catch (e) {
      setRewards([]);
    }
  };

  const handleNewCampaign = () => {
    setSelectedCampaign(null);
    setCampaignForm({ type: 'welcome_modal', is_active: true, content: {} });
    setRewards([]);
    setCampaignDialog(true);
  };

  const handleSaveCampaign = async () => {
    // Date validation for event campaigns
    if (campaignForm.type === 'event' && campaignForm.start_date && campaignForm.end_date) {
      if (new Date(campaignForm.end_date) < new Date(campaignForm.start_date)) {
        setSnackbar({ open: true, message: 'La fecha de fin no puede ser anterior a la de inicio', severity: 'error' });
        return;
      }
    }

    try {
      const url = selectedCampaign
        ? `/api/campaigns/${selectedCampaign.id}`
        : `/api/campaigns`;
      const method = selectedCampaign ? 'put' : 'post';

      await apiClient.client[method](url, {
        ...campaignForm,
        restaurant_id: restaurantId,
        content: JSON.stringify(campaignForm.content || {}),
        settings: JSON.stringify(campaignForm.settings || {})
      });

      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setCampaignDialog(false);
      setSnackbar({ open: true, message: 'Campaña guardada ✅', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Error al guardar', severity: 'error' });
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('¿Eliminar esta campaña?')) return;
    try {
      await apiClient.client.delete(`/api/campaigns/${id}`);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setSnackbar({ open: true, message: 'Campaña eliminada', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: 'Error al eliminar', severity: 'error' });
    }
  };

  const handleSaveReward = async () => {
    if (!selectedCampaign) return;
    try {
      await apiClient.client.post(`/api/rewards`, {
        ...rewardForm,
        campaign_id: selectedCampaign.id,
        restaurant_id: restaurantId
      });
      const res = await apiClient.client.get(`/api/campaigns/${selectedCampaign.id}/rewards`);
      setRewards(res.data.rewards || []);
      setRewardDialog(false);
      setRewardForm({ probability: 0.1, is_active: true });
      setSnackbar({ open: true, message: 'Premio añadido ✅', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: 'Error al guardar premio', severity: 'error' });
    }
  };

  const handleDeleteReward = async (id: string) => {
    if (!selectedCampaign) return;
    try {
      await apiClient.client.delete(`/api/rewards/${id}`);
      setRewards(rewards.filter(r => r.id !== id));
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
      await apiClient.client.post(`/api/restaurants/${restaurantId}/notifications/send`, notificationForm);
      setSnackbar({ open: true, message: 'Notificación enviada 📲', severity: 'success' });
      setNotificationForm({ title: '', message: '', url: '', image_url: '' });
    } catch (error: any) {
      setSnackbar({ open: true, message: 'Error al enviar', severity: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  const getCampaignStats = (campaign: Campaign) => {

    return campaign.stats || { leads: 0, redeemed: 0, opened: 0 };
  };


  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderCampaignCard = (campaign: Campaign) => {
    const config = CAMPAIGN_CONFIG[campaign.type] || CAMPAIGN_CONFIG.welcome_modal;
    const Icon = config.icon;
    const stats = getCampaignStats(campaign);

    return (
      <Card
        key={campaign.id}
        sx={{
          background: `linear-gradient(135deg, ${alpha(config.color, 0.12)} 0%, ${alpha(config.color, 0.03)} 100%)`,
          border: `1px solid ${alpha(config.color, 0.2)}`,
          borderRadius: 3,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 16px 40px ${alpha(config.color, 0.25)}`,
            borderColor: alpha(config.color, 0.4),
          }
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box sx={{
                p: 1.25,
                borderRadius: 2,
                bgcolor: alpha(config.color, 0.15),
                color: config.color,
                display: 'flex',
                boxShadow: `0 4px 12px ${alpha(config.color, 0.2)}`
              }}>
                <Icon sx={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
                  {campaign.name}
                </Typography>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.5) }}>
                  {config.emoji} {config.label}
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

          {/* Content Preview */}
          {campaign.content?.title && (
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.7), mb: 2, fontSize: '0.85rem' }}>
              "{campaign.content.title}"
            </Typography>
          )}

          {/* Event dates */}
          {campaign.type === 'event' && campaign.start_date && (
            <Box display="flex" alignItems="center" gap={0.5} mb={2}>
              <DateIcon sx={{ fontSize: 14, color: config.color }} />
              <Typography variant="caption" sx={{ color: alpha('#fff', 0.5) }}>
                {new Date(campaign.start_date).toLocaleDateString()}
                {campaign.end_date && ` - ${new Date(campaign.end_date).toLocaleDateString()}`}
              </Typography>
            </Box>
          )}

          {/* Stats Grid */}
          <Divider sx={{ borderColor: alpha('#fff', 0.08), my: 2 }} />
          <Grid container spacing={1} mb={2}>
            <Grid item xs={4}>
              <Box textAlign="center" p={1} bgcolor={alpha('#fff', 0.03)} borderRadius={2}>
                <Typography variant="h6" color="white" fontWeight={700}>
                  {stats.leads}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  LEADS
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box textAlign="center" p={1} bgcolor={alpha('#fff', 0.03)} borderRadius={2}>
                <Typography variant="h6" color={COLORS.cyan} fontWeight={700}>
                  {stats.opened}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  ABIERTOS
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box textAlign="center" p={1} bgcolor={alpha('#fff', 0.03)} borderRadius={2}>
                <Typography variant="h6" color={COLORS.success} fontWeight={700}>
                  {stats.redeemed}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  CANJEADOS
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Actions */}
          <Box display="flex" gap={1} flexWrap="wrap">

            <Button
              size="small"
              startIcon={<EditIcon />}
              onClick={() => handleEditCampaign(campaign)}
              sx={{
                color: config.color,
                borderColor: alpha(config.color, 0.3),
                '&:hover': { bgcolor: alpha(config.color, 0.1) }
              }}
              variant="outlined"
            >
              Editar
            </Button>

            {campaign.type === 'event' && (
              <Button
                size="small"
                startIcon={<QrCodeIcon />}
                onClick={() => {
                  const eventUrl = `https://menu.visualtastes.com/${currentRestaurant?.slug || 'evento'}/evento/${campaign.id}`;
                  navigate(`/qr-generator?url=${encodeURIComponent(eventUrl)}`);
                }}
                sx={{ color: alpha('#fff', 0.7) }}
              >
                Generar QR
              </Button>
            )}

            {campaign.type === 'scratch_win' && (
              <Button
                size="small"
                startIcon={<QrCodeIcon />}
                onClick={() => {
                  const loyaltyUrl = `https://menu.visualtastes.com/${currentRestaurant?.slug}/loyalty/${campaign.id}`;
                  navigate(`/qr-generator?url=${encodeURIComponent(loyaltyUrl)}`);
                }}
                sx={{ color: config.color }}
              >
                Generar QR
              </Button>
            )}


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
            🎯 Marketing & Campañas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestiona campañas, notificaciones y captación de leads
          </Typography>
        </Box>
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
          Nueva Campaña
        </Button>
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
          <Tab icon={<CampaignIcon />} label="Campañas" iconPosition="start" />
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
                Sin campañas activas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                Crea tu primera campaña para captar leads, hacer promociones o fidelizar clientes
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleNewCampaign}
                sx={{ borderColor: alpha('#fff', 0.2), color: 'white' }}
              >
                Crear campaña
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
                  {isSending ? 'Enviando...' : 'Enviar a suscriptores'}
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
                <Box display="flex" gap={2}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(COLORS.event, 0.1), color: COLORS.event }}>
                    <CelebrationIcon />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">Resultados</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Las notificaciones push tienen mayor tasa de apertura que emails
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
              {selectedCampaign ? 'Editar Campaña' : 'Nueva Campaña'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={3}>
            {/* Basic Info */}
            <TextField
              fullWidth
              label="Nombre de la campaña"
              value={campaignForm.name || ''}
              onChange={e => setCampaignForm({ ...campaignForm, name: e.target.value })}
              placeholder="Ej: Promoción Verano 2024"
              InputLabelProps={{ shrink: true }}
            />

            <FormControl fullWidth>
              <InputLabel>Tipo de campaña</InputLabel>
              <Select
                value={campaignForm.type || 'welcome_modal'}
                label="Tipo de campaña"
                onChange={e => setCampaignForm({
                  ...campaignForm,
                  type: e.target.value as Campaign['type']
                })}
              >
                {Object.entries(CAMPAIGN_CONFIG).map(([key, cfg]) => (
                  <MenuItem key={key} value={key}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <span>{cfg.emoji}</span>
                      <Box>
                        <Typography variant="body2">{cfg.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {cfg.description}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={campaignForm.is_active}
                  onChange={e => setCampaignForm({ ...campaignForm, is_active: e.target.checked })}
                  color="success"
                />
              }
              label="Campaña activa"
            />

            <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />

            {/* Content Section */}
            <Typography variant="subtitle2" sx={{ color: alpha('#fff', 0.5), display: 'flex', alignItems: 'center', gap: 1 }}>
              <GiftIcon fontSize="small" /> Contenido de la oferta
            </Typography>

            <TextField
              fullWidth
              label="Título de la oferta"
              value={campaignForm.content?.title || ''}
              onChange={e => setCampaignForm({
                ...campaignForm,
                content: { ...campaignForm.content, title: e.target.value }
              })}
              placeholder="¡10% de descuento en tu próxima visita!"
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Descripción"
              value={campaignForm.content?.description || ''}
              onChange={e => setCampaignForm({
                ...campaignForm,
                content: { ...campaignForm.content, description: e.target.value }
              })}
              placeholder="Describe los beneficios..."
              multiline
              rows={2}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="URL de imagen (opcional)"
              value={campaignForm.content?.image_url || ''}
              onChange={e => setCampaignForm({
                ...campaignForm,
                content: { ...campaignForm.content, image_url: e.target.value }
              })}
              placeholder="https://..."
              InputLabelProps={{ shrink: true }}
            />

            {/* Event-specific */}
            {campaignForm.type === 'event' && (
              <>
                <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />
                <Typography variant="subtitle2" sx={{ color: alpha('#fff', 0.5), display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DateIcon fontSize="small" /> Detalles del evento
                </Typography>

                <Box display="flex" gap={2}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Fecha inicio"
                    value={campaignForm.start_date?.split('T')[0] || ''}
                    onChange={e => setCampaignForm({ ...campaignForm, start_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    fullWidth
                    type="date"
                    label="Fecha fin"
                    value={campaignForm.end_date?.split('T')[0] || ''}
                    onChange={e => setCampaignForm({ ...campaignForm, end_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>

                <TextField
                  fullWidth
                  label="Ubicación"
                  value={campaignForm.content?.location || ''}
                  onChange={e => setCampaignForm({
                    ...campaignForm,
                    content: { ...campaignForm.content, location: e.target.value }
                  })}
                  placeholder="Terraza, Salón VIP..."
                  InputLabelProps={{ shrink: true }}
                />
              </>
            )}

            {/* Welcome Modal Settings */}
            {campaignForm.type === 'welcome_modal' && (
              <>
                <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />
                <Typography variant="subtitle2" sx={{ color: alpha('#fff', 0.5), display: 'flex', alignItems: 'center', gap: 1 }}>
                  ⚙️ Configuración del formulario
                </Typography>
                <Box display="flex" gap={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={campaignForm.settings?.show_email !== false}
                        onChange={e => setCampaignForm({
                          ...campaignForm,
                          settings: { ...campaignForm.settings, show_email: e.target.checked }
                        })}
                        color="primary"
                      />
                    }
                    label="Mostrar Email"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={campaignForm.settings?.show_phone !== false}
                        onChange={e => setCampaignForm({
                          ...campaignForm,
                          settings: { ...campaignForm.settings, show_phone: e.target.checked }
                        })}
                        color="primary"
                      />
                    }
                    label="Mostrar Teléfono"
                  />
                </Box>
              </>
            )}

            {/* Scratch & Win Display Settings */}
            {campaignForm.type === 'scratch_win' && (
              <>
                <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />
                <Typography variant="subtitle2" sx={{ color: alpha('#fff', 0.5), display: 'flex', alignItems: 'center', gap: 1 }}>
                  📍 Visibilidad en el menú
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={campaignForm.settings?.display_mode || 'hidden'}
                    onChange={e => setCampaignForm({
                      ...campaignForm,
                      settings: { ...campaignForm.settings, display_mode: e.target.value }
                    })}
                  >
                    <MenuItem value="hidden">🔒 Solo QR físico (El camarero trae el QR)</MenuItem>
                    <MenuItem value="fab">🎁 Botón flotante en el menú</MenuItem>
                    <MenuItem value="timer">⏱️ Aparece tras 2 min viendo el menú</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.4), mt: -1 }}>
                  {campaignForm.settings?.display_mode === 'hidden'
                    ? 'Ideal para después de la cena. El camarero entrega un QR exclusivo.'
                    : campaignForm.settings?.display_mode === 'fab'
                      ? 'Un botón "🎁 Juega" aparece en la esquina del menú.'
                      : 'Aparece automáticamente para usuarios que "esperan" viendo el menú.'}
                </Typography>
              </>
            )}

            {/* Event Display Settings */}
            {campaignForm.type === 'event' && (
              <>
                <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />
                <Typography variant="subtitle2" sx={{ color: alpha('#fff', 0.5), display: 'flex', alignItems: 'center', gap: 1 }}>
                  📍 Visibilidad en el menú
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={campaignForm.settings?.show_in_menu === true}
                      onChange={e => setCampaignForm({
                        ...campaignForm,
                        settings: { ...campaignForm.settings, show_in_menu: e.target.checked }
                      })}
                      color="secondary"
                    />
                  }
                  label="Mostrar banner en el menú digital"
                />
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.4), mt: -1 }}>
                  {campaignForm.settings?.show_in_menu
                    ? 'Los clientes verán este evento al navegar por el menú.'
                    : 'El evento solo será visible mediante el QR de promoción.'}
                </Typography>
              </>
            )}

            {/* Rewards Section (for Scratch & Win) */}
            {selectedCampaign && campaignForm.type === 'scratch_win' && (
              <>
                <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" sx={{ color: alpha('#fff', 0.5), display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GiftIcon fontSize="small" /> Premios ({rewards.length})
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setRewardForm({ probability: 0.1, is_active: true });
                      setRewardDialog(true);
                    }}
                    sx={{ color: COLORS.scratch }}
                  >
                    Añadir premio
                  </Button>
                </Box>

                <Stack spacing={1}>
                  {rewards.map(r => (
                    <Paper
                      key={r.id}
                      sx={{
                        p: 2,
                        bgcolor: alpha(COLORS.scratch, 0.08),
                        border: `1px solid ${alpha(COLORS.scratch, 0.15)}`,
                        borderRadius: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2">{r.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(r.probability * 100).toFixed(0)}% probabilidad
                          {r.max_quantity && ` • ${r.claimed_count || 0}/${r.max_quantity} canjeados`}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteReward(r.id)}
                        sx={{ color: alpha(COLORS.danger, 0.7) }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  ))}
                  {rewards.length === 0 && (
                    <Typography variant="caption" color="text.secondary" textAlign="center" py={2}>
                      Añade premios para el juego
                    </Typography>
                  )}
                </Stack>
              </>
            )}
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
            {selectedCampaign ? 'Guardar cambios' : 'Crear campaña'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ============================================ */}
      {/* REWARD DIALOG */}
      {/* ============================================ */}
      <Dialog
        open={rewardDialog}
        onClose={() => setRewardDialog(false)}
        PaperProps={{
          sx: { bgcolor: '#1a1a2e', backgroundImage: 'none', borderRadius: 3 }
        }}
      >
        <DialogTitle>🎁 Nuevo Premio</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 300 }}>
            <TextField
              fullWidth
              label="Nombre del premio"
              value={rewardForm.name || ''}
              onChange={e => setRewardForm({ ...rewardForm, name: e.target.value })}
              placeholder="Café gratis"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Descripción"
              value={rewardForm.description || ''}
              onChange={e => setRewardForm({ ...rewardForm, description: e.target.value })}
              placeholder="Un café de cualquier tamaño"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              type="number"
              label="Probabilidad (%)"
              value={(rewardForm.probability || 0) * 100}
              onChange={e => setRewardForm({ ...rewardForm, probability: Number(e.target.value) / 100 })}
              inputProps={{ min: 1, max: 100 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              type="number"
              label="Cantidad máxima (vacío = ilimitado)"
              value={rewardForm.max_quantity || ''}
              onChange={e => setRewardForm({ ...rewardForm, max_quantity: e.target.value ? Number(e.target.value) : null })}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRewardDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveReward} sx={{ bgcolor: COLORS.scratch }}>
            Añadir premio
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
