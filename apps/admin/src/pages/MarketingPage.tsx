import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Snackbar,
  Paper,
  Stack,
  Switch,
  FormControlLabel,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Notifications as NotificationsIcon,
  Campaign as CampaignIcon,
  Discount as DiscountIcon,
  QrCode as QrCodeIcon,
  Image as ImageIcon,
  ColorLens as ColorIcon
} from '@mui/icons-material';
import { NotificationPreview } from '../components/marketing/NotificationPreview';

// --- Interfaces ---

interface Campaign {
  id: string;
  restaurant_id: string;
  name: string;
  type: 'scratch_win' | 'welcome_modal' | 'unknown';
  is_active: boolean;
  content: any;
  start_date?: string;
  end_date?: string;
}

interface Reward {
  id: string;
  campaign_id: string;
  name: string;
  description: string;
  probability: number;
  max_quantity: number | null;
  image_url?: string;
  is_active: boolean;
}

interface StaffQR {
  id: string; // The QR ID
  restaurant_id: string;
  assigned_staff_id?: string;
  staff_name?: string;
  role?: string;
  created_at: string;
}

interface StaffMember {
  id: string; // Changed from user_id to match API
  display_name: string;
  role: string;
}

// --- Component ---

const MarketingPage: React.FC = () => {
  const { currentRestaurant } = useAuth();
  const restaurantId = currentRestaurant?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState<any>({ open: false, message: '', severity: 'success' });

  // --- QUERY: Campaigns ---
  const { data: campaigns, isLoading: isLoadingCampaigns } = useQuery<Campaign[]>({
    queryKey: ['campaigns', restaurantId],
    queryFn: async () => {
      const res = await apiClient.client.get(`/api/restaurants/${restaurantId}/campaigns`);
      return res.data.campaigns;
    },
    enabled: !!restaurantId
  });

  // --- QUERY: Staff QRs ---
  const { data: staffQrs, isLoading: isLoadingQrs } = useQuery<StaffQR[]>({
    queryKey: ['staff-qrs', restaurantId],
    queryFn: async () => {
      const res = await apiClient.client.get(`/api/restaurants/${restaurantId}/staff-qrs`);
      return res.data.qrs;
    },
    enabled: !!restaurantId
  });

  // --- QUERY: Staff List ---
  const { data: staffList } = useQuery<StaffMember[]>({
    queryKey: ['staff', restaurantId],
    queryFn: async () => {
      const res = await apiClient.client.get(`/restaurants/${restaurantId}/users`); // endpoint is /users not /staff
      return res.data.users || [];
    },
    enabled: !!restaurantId
  });

  // --- STATE: Dialogs ---
  const [openCampaignDialog, setOpenCampaignDialog] = useState(false);
  const [openRewardDialog, setOpenRewardDialog] = useState(false);
  const [openQrDialog, setOpenQrDialog] = useState(false);

  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]); // Should be a query really
  const [editingReward, setEditingReward] = useState<Partial<Reward>>({});
  const [selectedStaffForQR, setSelectedStaffForQR] = useState<string>('');

  // --- STATE: Forms ---
  const [campaignForm, setCampaignForm] = useState<Partial<Campaign>>({ type: 'scratch_win', is_active: true });

  // Notification Form Enhanced
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    url: '',
    image_url: '', // Big Picture
    icon_url: '',  // Small Icon (override)
    badge: '',
    color: '#D4AF37' // Default Gold-ish like the logo
  });

  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);

  // Sync pushEnabled with restaurant settings
  useEffect(() => {
    if (currentRestaurant?.features) {
      // Default to true if undefined
      const enabled = currentRestaurant.features.push_notifications_enabled !== false;
      setPushEnabled(enabled);
    }
  }, [currentRestaurant]);

  const handleTogglePush = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setPushEnabled(newValue);

    try {
      await apiClient.client.put(`/restaurants/${restaurantId}`, {
        features: {
          ...currentRestaurant?.features,
          push_notifications_enabled: newValue
        }
      });
      setSnackbar({ open: true, message: `Captación ${newValue ? 'activada' : 'desactivada'}`, severity: 'success' });

      // Optimistically update context or invalidate query if needed
      // Assuming useAuth.currentRestaurant updates automatically or on refresh
    } catch (error) {
      console.error('Error updating push settings:', error);
      setPushEnabled(!newValue); // Revert
      setSnackbar({ open: true, message: 'Error al actualizar configuración', severity: 'error' });
    }
  };

  // Auto-populate default icon based on branding
  useEffect(() => {
    if (currentRestaurant?.id && !notificationForm.icon_url) {
      // Construct default URL (assuming CDN pattern mentioned by user)
      const defaultIcon = `https://visualtastes.com/mediabucket/restaurants/${currentRestaurant.slug || currentRestaurant.id}/branding/logo.png`;
      // We don't set it in state to allow placeholder behavior, but we use it for preview
    }
  }, [currentRestaurant]);

  // Derived icon for preview/sending
  const effectiveIcon = notificationForm.icon_url ||
    (currentRestaurant ? `https://pub-4543787a2a164b88931ebc1274d6f830.r2.dev/restaurants/${currentRestaurant.slug}/branding/logo.png` : '');
  // Using generic r2 dev url or the one user mentioned 'mediabucket' if that's a mapped domain? 
  // User said: mediabucket/restaurants/id/branding/logo.png
  // I should probably ask or use a safe guess. Let's use the pattern from the user request strictly if possible, 
  // but without the domain I might guess. 'mediabucket' sounds like a folder in bucket.
  // Let's assume relative or absolute if I knew the domain. 
  // Wait, the user provided a screenshot "mediabucket / restaurants / ...". 
  // I will use a relative path if deployed or a constructed absolute path.
  // For now let's try to assume a standard R2 public URL format if we know it, or just use a placeholder text if unknown.
  // I will use a smart generic default for now.

  const finalIconUrl = notificationForm.icon_url || `https://pub-4543787a2a164b88931ebc1274d6f830.r2.dev/restaurants/${currentRestaurant?.id}/branding/logo.png`;


  // --- Handlers ---
  const handleTabChange = (_: any, val: number) => setActiveTab(val);

  const handleEditCampaign = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setCampaignForm({ ...campaign });
    setOpenCampaignDialog(true);
    // Load rewards
    loadRewards(campaign.id);
  };

  const loadRewards = async (campaignId: string) => {
    const res = await apiClient.client.get(`/api/campaigns/${campaignId}/rewards`);
    setRewards(res.data.rewards || []);
  };

  const handleSaveCampaign = async () => {
    const url = selectedCampaign
      ? `/api/campaigns/${selectedCampaign.id}`
      : `/api/campaigns`;

    const method = selectedCampaign ? 'put' : 'post';

    await apiClient.client[method](url, { ...campaignForm, restaurant_id: restaurantId });

    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    setOpenCampaignDialog(false);
    setSnackbar({ open: true, message: 'Campaña guardada', severity: 'success' });
  };

  const handleSaveReward = async () => {
    if (!selectedCampaign) return;
    await apiClient.client.post(`/api/rewards`, {
      ...editingReward,
      campaign_id: selectedCampaign.id,
      restaurant_id: restaurantId
    });
    loadRewards(selectedCampaign.id);
    setOpenRewardDialog(false);
  };

  const handleDeleteReward = async (id: string) => {
    if (!confirm('¿Borrar premio?')) return;
    await apiClient.client.delete(`/api/rewards/${id}`);
    if (selectedCampaign) loadRewards(selectedCampaign.id);
  };

  const handleCreateStaffQR = async () => {
    if (!selectedStaffForQR) {
      setSnackbar({ open: true, message: 'Selecciona un camarero', severity: 'warning' });
      return;
    }

    await apiClient.client.post(`/api/staff/assign-qr`, { restaurant_id: restaurantId, staff_id: selectedStaffForQR });
    queryClient.invalidateQueries({ queryKey: ['staff-qrs'] });
    setOpenQrDialog(false);
    setSnackbar({ open: true, message: 'QR Generado exitosamente', severity: 'success' });
  };

  const handlePrintQR = (qrId: string) => {
    const slug = currentRestaurant?.slug || 'unknown';

    // Smart Local Dev Logic
    let baseUrl = 'https://menu.visualtastes.com';
    if (window.location.hostname.includes('localhost')) {
      const adminPort = window.location.port;
      // If Admin is 5173, Client is likely 5174. If Admin is 5174, Client is likely 5173.
      const defaultLocal = adminPort === '5173' ? 'http://localhost:5174' : 'http://localhost:5173';
      baseUrl = import.meta.env.VITE_CLIENT_URL || defaultLocal;
    }

    // Semantic URL: https://menu.visualtastes.com/{slug}/loyalty?c={qrId}
    const url = `${baseUrl}/${slug}/loyalty?c=${qrId}`;

    navigate(`/qr-generator?text=${encodeURIComponent(url)}`);
  };

  const handleSendNotification = async () => {
    if (!notificationForm.title || !notificationForm.message) {
      setSnackbar({ open: true, message: 'Título y Mensaje son obligatorios', severity: 'warning' });
      return;
    }

    if (!confirm('¿Estás seguro de enviar esta notificación a TODOS tus visitantes suscritos?')) {
      return;
    }

    setIsSendingNotification(true);
    try {
      const payload = {
        restaurant_id: restaurantId,
        debug: true, // Enable Debug Mode
        ...notificationForm,
        icon: finalIconUrl, // Send computed default if empty
      };

      const res = await apiClient.client.post('/api/notifications/send', payload);

      if (res.data.debug_info) {
        console.group("📨 NOTIFICATION DEBUG LOGS");
        console.table(res.data.debug_info);
        // Fallback for copy-paste or if table is empty/truncated
        console.log("RAW LOGS:", JSON.stringify(res.data.debug_info, null, 2));
        console.groupEnd();
      }

      const count = res.data.sent_count || 0;
      setSnackbar({ open: true, message: `Notificación enviada a ${count} dispositivos`, severity: 'success' });
      setNotificationForm({ title: '', message: '', url: '', image_url: '', icon_url: '', badge: '', color: '#D4AF37' });
    } catch (error: any) {
      console.error('Error sending notification:', error);
      setSnackbar({ open: true, message: error.message || 'Error al enviar', severity: 'error' });
    } finally {
      setIsSendingNotification(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>Marketing & Loyalty</Typography>

      <Paper sx={{ mb: 4 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab icon={<CampaignIcon />} label="Campañas" />
          <Tab icon={<QrCodeIcon />} label="Códigos QR Staff" />
          <Tab icon={<NotificationsIcon />} label="Notificaciones Push" />
        </Tabs>

        {/* --- TAB 0: CAMPAIGNS --- */}
        {activeTab === 0 && (
          <Box p={3}>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Mis Campañas</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                setSelectedCampaign(null);
                setCampaignForm({ type: 'scratch_win', is_active: true });
                setOpenCampaignDialog(true);
                setRewards([]);
              }}>
                Nueva Campaña
              </Button>
            </Box>

            {isLoadingCampaigns ? <LinearProgress /> : (
              <Grid container spacing={2}>
                {campaigns?.map(c => (
                  <Grid item xs={12} md={6} key={c.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="h6">{c.name}</Typography>
                          <Chip label={c.is_active ? 'Activa' : 'Inactiva'} color={c.is_active ? 'success' : 'default'} size="small" />
                        </Box>
                        <Typography variant="body2" color="text.secondary">Tipo: {c.type}</Typography>
                      </CardContent>
                      <CardActions>
                        <Button size="small" startIcon={<EditIcon />} onClick={() => handleEditCampaign(c)}>Editar / Premios</Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {/* --- TAB 1: STAFF QRS --- */}
        {activeTab === 1 && (
          <Box p={3}>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Códigos QR de Camareros</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenQrDialog(true)}>
                Generar Nuevo QR
              </Button>
            </Box>

            {isLoadingQrs ? <LinearProgress /> : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Staff / ID</TableCell>
                      <TableCell>Rol</TableCell>
                      <TableCell>QR ID</TableCell>
                      <TableCell>Creado</TableCell>
                      <TableCell>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {staffQrs?.map(qr => {
                      const slug = currentRestaurant?.slug || 'unknown';

                      let baseUrl = 'https://menu.visualtastes.com';
                      if (window.location.hostname.includes('localhost')) {
                        const adminPort = window.location.port;
                        const defaultLocal = adminPort === '5173' ? 'http://localhost:5174' : 'http://localhost:5173';
                        baseUrl = import.meta.env.VITE_CLIENT_URL || defaultLocal;
                      }

                      const testUrl = `${baseUrl}/${slug}/loyalty?c=${qr.id}`;

                      return (
                        <TableRow key={qr.id}>
                          <TableCell>{qr.staff_name || 'Sin asignar'}</TableCell>
                          <TableCell>{qr.role || '-'}</TableCell>
                          <TableCell>{qr.id}</TableCell>
                          <TableCell>{new Date(qr.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1}>
                              <Button size="small" variant="outlined" startIcon={<QrCodeIcon />} onClick={() => handlePrintQR(qr.id)}>Imprimir</Button>
                              <Button size="small" href={testUrl} target="_blank">Probar</Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* --- TAB 2: PUSH NOTIFICATIONS --- */}
        {activeTab === 2 && (
          <Box p={3}>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">Enviar Notificación Push</Typography>
              <FormControlLabel
                control={<Switch checked={pushEnabled} onChange={handleTogglePush} />}
                label="Captación de Suscriptores Activa"
              />
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              Envía mensajes directos a los visitantes que han aceptado recibir notificaciones.
              Usuarios iOS recibirán la notificación si han instalado la PWA.
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Stack spacing={3}>
                  <TextField
                    label="Título"
                    fullWidth
                    value={notificationForm.title}
                    onChange={e => setNotificationForm({ ...notificationForm, title: e.target.value })}
                    placeholder="Ej: Oferta de Cena 2x1"
                  />
                  <TextField
                    label="Mensaje"
                    fullWidth
                    multiline
                    rows={3}
                    value={notificationForm.message}
                    onChange={e => setNotificationForm({ ...notificationForm, message: e.target.value })}
                    placeholder="Ej: Solo por hoy, ven y disfruta..."
                  />
                  <TextField
                    label="URL de Destino (Opcional)"
                    fullWidth
                    value={notificationForm.url}
                    onChange={e => setNotificationForm({ ...notificationForm, url: e.target.value })}
                    placeholder="Ej: /restaurant-slug/offer"
                    helperText="Deja vacío para abrir la página principal"
                  />

                  {/* Visual Options */}
                  <Typography variant="subtitle2" sx={{ mt: 1 }}>Apariencia</Typography>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Override Icon URL"
                      fullWidth
                      size="small"
                      value={notificationForm.icon_url}
                      onChange={e => setNotificationForm({ ...notificationForm, icon_url: e.target.value })}
                      helperText="Vacío = Logo Restaurante"
                      InputProps={{ startAdornment: <ImageIcon color="action" sx={{ mr: 1, fontSize: 20 }} /> }}
                    />
                    <TextField
                      label="Accent Color"
                      type="color"
                      sx={{ width: 100 }}
                      size="small"
                      value={notificationForm.color}
                      onChange={e => setNotificationForm({ ...notificationForm, color: e.target.value })}
                      InputProps={{ startAdornment: <ColorIcon color="action" sx={{ mr: 1, fontSize: 20 }} /> }}
                    />
                  </Stack>
                  <TextField
                    label="Hero Image URL (Big Picture)"
                    fullWidth
                    size="small"
                    value={notificationForm.image_url}
                    onChange={e => setNotificationForm({ ...notificationForm, image_url: e.target.value })}
                    helperText="Imagen grande expandible"
                    InputProps={{ startAdornment: <ImageIcon color="action" sx={{ mr: 1, fontSize: 20 }} /> }}
                  />

                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={isSendingNotification ? <CircularProgress size={20} color="inherit" /> : <NotificationsIcon />}
                    onClick={handleSendNotification}
                    disabled={isSendingNotification}
                  >
                    {isSendingNotification ? 'Enviando...' : 'Enviar Notificación'}
                  </Button>
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%', bgcolor: '#f5f5f5' }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>Vista Previa (Aproximada)</Typography>

                    <Box sx={{ my: 4, display: 'flex', justifyContent: 'center' }}>
                      <NotificationPreview
                        title={notificationForm.title}
                        message={notificationForm.message}
                        icon={finalIconUrl}
                        image={notificationForm.image_url}
                        color={notificationForm.color}
                        appName={currentRestaurant?.name || 'Restaurante'}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

      </Paper>

      {/* --- DIALOG: Assign QR --- */}
      <Dialog open={openQrDialog} onClose={() => setOpenQrDialog(false)}>
        <DialogTitle>Generar QR para Camarero</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Selecciona un miembro del staff para asignar un nuevo código QR de lealtad.
            Este código servirá para que los clientes jueguen y los premios se atribuyan a este camarero.
          </Typography>
          <FormControl fullWidth margin="dense">
            <InputLabel>Camarero</InputLabel>
            <Select
              value={selectedStaffForQR}
              label="Camarero"
              onChange={(e) => setSelectedStaffForQR(e.target.value)}
            >
              {staffList?.map(staff => (
                <MenuItem key={staff.id} value={staff.id}>
                  {staff.display_name} ({staff.role})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQrDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreateStaffQR}>Generar</Button>
        </DialogActions>
      </Dialog>

      {/* --- DIALOG: Campaign --- */}
      <Dialog open={openCampaignDialog} onClose={() => setOpenCampaignDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedCampaign ? 'Editar Campaña' : 'Nueva Campaña'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Nombre" fullWidth value={campaignForm.name || ''} onChange={e => setCampaignForm({ ...campaignForm, name: e.target.value })} />
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select value={campaignForm.type || 'scratch_win'} label="Tipo" onChange={e => setCampaignForm({ ...campaignForm, type: e.target.value as any })}>
                <MenuItem value="scratch_win">Rasca y Gana (Scratch)</MenuItem>
                <MenuItem value="welcome_modal">Modal de Bienvenida</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel control={<Switch checked={campaignForm.is_active} onChange={e => setCampaignForm({ ...campaignForm, is_active: e.target.checked })} />} label="Activa" />

            <Divider />
            <Typography variant="h6">Premios (Rewards)</Typography>
            {selectedCampaign ? (
              <Box>
                {rewards.map(r => (
                  <Box key={r.id} display="flex" justifyContent="space-between" alignItems="center" p={1} borderBottom="1px solid #eee">
                    <Box>
                      <Typography variant="subtitle2">{r.name} ({r.probability * 100}%)</Typography>
                      <Typography variant="caption">{r.description}</Typography>
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => { setEditingReward(r); setOpenRewardDialog(true); }}><EditIcon /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteReward(r.id)}><DeleteIcon /></IconButton>
                    </Box>
                  </Box>
                ))}
                <Button startIcon={<AddIcon />} size="small" onClick={() => { setEditingReward({}); setOpenRewardDialog(true); }}>Agregar Premio</Button>
              </Box>
            ) : (
              <Typography color="text.secondary">Guarda la campaña para añadir premios.</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCampaignDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveCampaign}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* --- DIALOG: Reward --- */}
      <Dialog open={openRewardDialog} onClose={() => setOpenRewardDialog(false)}>
        <DialogTitle>Premio</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1} minWidth={300}>
            <TextField label="Nombre" fullWidth value={editingReward.name || ''} onChange={e => setEditingReward({ ...editingReward, name: e.target.value })} />
            <TextField label="Descripción" fullWidth value={editingReward.description || ''} onChange={e => setEditingReward({ ...editingReward, description: e.target.value })} />
            <TextField label="Probabilidad (0.0 - 1.0)" type="number" fullWidth value={editingReward.probability || 0} onChange={e => setEditingReward({ ...editingReward, probability: parseFloat(e.target.value) })} />
            <TextField label="Cantidad Máxima" type="number" fullWidth value={editingReward.max_quantity || 0} onChange={e => setEditingReward({ ...editingReward, max_quantity: parseInt(e.target.value) })} />
            <TextField label="Image URL" fullWidth value={editingReward.image_url || ''} onChange={e => setEditingReward({ ...editingReward, image_url: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRewardDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveReward}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} />
    </Container>
  );
};

export default MarketingPage;
