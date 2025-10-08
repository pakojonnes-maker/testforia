import { useState } from 'react';
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
  Divider,
  Paper,
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
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Notifications as NotificationsIcon,
  Campaign as CampaignIcon,
  Discount as DiscountIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

// Interfaces para tipado
interface Promotion {
  id: string;
  dish_id: string;
  dish_name: string;
  restaurant_id: string;
  type: 'discount' | 'featured' | 'new';
  original_price: number;
  discount_price: number | null;
  active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

interface PromotionFormData {
  dish_id: string;
  type: 'discount' | 'featured' | 'new';
  discount_price?: number;
  active: boolean;
  start_date?: string;
  end_date?: string;
}

interface Dish {
  id: string;
  name: string;
  price: number;
  image_url?: string;
}

interface Notification {
  id: string;
  restaurant_id: string;
  title: string;
  message: string;
  deep_link?: string;
  image_url?: string;
  scheduled_for?: string;
  sent_at?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  target_type: 'all' | 'favorites' | 'recent' | 'custom';
  open_rate?: number;
  click_rate?: number;
  created_at: string;
}

interface NotificationFormData {
  title: string;
  message: string;
  target_type: 'all' | 'favorites' | 'recent' | 'custom';
  send_time: 'now' | 'scheduled';
  scheduled_for?: string;
  image_url?: string;
  deep_link?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

// Componente TabPanel para las pestañas
const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`marketing-tabpanel-${index}`}
      aria-labelledby={`marketing-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const MarketingPage: React.FC = () => {
  const { user } = useAuth();
  const restaurantId = user?.currentRestaurant?.id;
  const queryClient = useQueryClient();
  
  // Estados
  const [activeTab, setActiveTab] = useState<number>(0);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState<boolean>(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });
  
  // Estados del formulario de promoción
  const [promotionForm, setPromotionForm] = useState<PromotionFormData>({
    dish_id: '',
    type: 'discount',
    discount_price: undefined,
    active: true,
    start_date: undefined,
    end_date: undefined,
  });
  
  // Estados del formulario de notificación
  const [notificationForm, setNotificationForm] = useState<NotificationFormData>({
    title: '',
    message: '',
    target_type: 'all',
    send_time: 'now',
    scheduled_for: undefined,
    image_url: undefined,
    deep_link: undefined,
  });

  // Consulta de promociones existentes
  const {
    data: promotions,
    isLoading: isLoadingPromotions,
    error: promotionsError,
  } = useQuery<Promotion[]>({
    queryKey: ['promotions', restaurantId],
    queryFn: () => apiClient.getPromotions(restaurantId as string),
    enabled: !!restaurantId,
  });

  // Consulta de notificaciones enviadas
  const {
    data: notifications,
    isLoading: isLoadingNotifications,
    error: notificationsError,
  } = useQuery<Notification[]>({
    queryKey: ['notifications', restaurantId],
    queryFn: () => apiClient.getNotifications(restaurantId as string),
    enabled: !!restaurantId,
  });

  // Consulta de platos disponibles para promoción
  const {
    data: dishes,
    isLoading: isLoadingDishes,
  } = useQuery<Dish[]>({
    queryKey: ['dishes-simple', restaurantId],
    queryFn: () => apiClient.getDishesSimple(restaurantId as string),
    enabled: !!restaurantId && promotionDialogOpen,
  });

  // Mutación para crear promoción
  const createPromotionMutation = useMutation({
    mutationFn: (data: PromotionFormData) => 
      apiClient.createPromotion(restaurantId as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions', restaurantId] });
      setSnackbar({ 
        open: true, 
        message: 'Promoción creada correctamente', 
        severity: 'success'
      });
      setPromotionDialogOpen(false);
      resetPromotionForm();
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: `Error: ${error?.message || 'No se pudo crear la promoción'}`,
        severity: 'error',
      });
    },
  });

  // Mutación para crear notificación
  const createNotificationMutation = useMutation({
    mutationFn: (data: NotificationFormData) => 
      apiClient.createNotification(restaurantId as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', restaurantId] });
      setSnackbar({
        open: true,
        message: 'Notificación creada correctamente',
        severity: 'success',
      });
      setNotificationDialogOpen(false);
      resetNotificationForm();
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: `Error: ${error?.message || 'No se pudo crear la notificación'}`,
        severity: 'error',
      });
    },
  });

  // Mutación para cancelar notificación programada
  const cancelNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => 
      apiClient.cancelNotification(restaurantId as string, notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', restaurantId] });
      setSnackbar({
        open: true,
        message: 'Notificación cancelada correctamente',
        severity: 'success',
      });
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: `Error: ${error?.message || 'No se pudo cancelar la notificación'}`,
        severity: 'error',
      });
    },
  });

  // Resetear formulario de promoción
  const resetPromotionForm = () => {
    setPromotionForm({
      dish_id: '',
      type: 'discount',
      discount_price: undefined,
      active: true,
      start_date: undefined,
      end_date: undefined,
    });
  };

  // Resetear formulario de notificación
  const resetNotificationForm = () => {
    setNotificationForm({
      title: '',
      message: '',
      target_type: 'all',
      send_time: 'now',
      scheduled_for: undefined,
      image_url: undefined,
      deep_link: undefined,
    });
  };

  // Handlers para cambios en los formularios
  const handlePromotionFormChange = (field: keyof PromotionFormData, value: any) => {
    setPromotionForm({
      ...promotionForm,
      [field]: value,
    });
  };

  const handleNotificationFormChange = (field: keyof NotificationFormData, value: any) => {
    setNotificationForm({
      ...notificationForm,
      [field]: value,
    });
  };

  // Handler para cambio de pestaña
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Handler para crear promoción
  const handleCreatePromotion = () => {
    if (!promotionForm.dish_id) {
      setSnackbar({
        open: true,
        message: 'Selecciona un plato para la promoción',
        severity: 'warning',
      });
      return;
    }

    if (promotionForm.type === 'discount' && !promotionForm.discount_price) {
      setSnackbar({
        open: true,
        message: 'Ingresa un precio con descuento',
        severity: 'warning',
      });
      return;
    }

    createPromotionMutation.mutate(promotionForm);
  };

  // Handler para crear notificación
  const handleCreateNotification = () => {
    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      setSnackbar({
        open: true,
        message: 'El título y mensaje son obligatorios',
        severity: 'warning',
      });
      return;
    }

    if (notificationForm.send_time === 'scheduled' && !notificationForm.scheduled_for) {
      setSnackbar({
        open: true,
        message: 'Selecciona una fecha para la notificación programada',
        severity: 'warning',
      });
      return;
    }

    createNotificationMutation.mutate(notificationForm);
  };

  // Handler para cancelar notificación
  const handleCancelNotification = (notificationId: string) => {
    cancelNotificationMutation.mutate(notificationId);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom component="h1">
        Marketing y Promociones
      </Typography>

      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<DiscountIcon />} iconPosition="start" label="Promociones" />
          <Tab icon={<NotificationsIcon />} iconPosition="start" label="Notificaciones" />
          <Tab icon={<CampaignIcon />} iconPosition="start" label="Campañas" />
        </Tabs>

        {/* Pestaña de Promociones */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Platos en promoción
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={() => setPromotionDialogOpen(true)}
            >
              Nueva promoción
            </Button>
          </Box>

          {isLoadingPromotions ? (
            <LinearProgress />
          ) : promotionsError ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              Error al cargar las promociones. Por favor, intenta nuevamente.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Plato</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Precio normal</TableCell>
                    <TableCell align="right">Precio promoción</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {promotions && promotions.length > 0 ? (
                    promotions.map((promo) => (
                      <TableRow key={promo.id}>
                        <TableCell>{promo.dish_name}</TableCell>
                        <TableCell>
                          <Chip 
                            label={
                              promo.type === 'discount' ? 'Descuento' : 
                              promo.type === 'featured' ? 'Destacado' : 'Nuevo'
                            } 
                            color={
                              promo.type === 'discount' ? 'primary' : 
                              promo.type === 'featured' ? 'secondary' : 'info'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">{promo.original_price.toFixed(2)}€</TableCell>
                        <TableCell align="right">{promo.discount_price ? `${promo.discount_price.toFixed(2)}€` : '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={promo.active ? 'Activa' : 'Inactiva'} 
                            color={promo.active ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No hay promociones activas actualmente
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Pestaña de Notificaciones */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Notificaciones a clientes
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={() => setNotificationDialogOpen(true)}
            >
              Nueva notificación
            </Button>
          </Box>

          {isLoadingNotifications ? (
            <LinearProgress />
          ) : notificationsError ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              Error al cargar las notificaciones. Por favor, intenta nuevamente.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {notifications && notifications.length > 0 ? (
                notifications.map((notification) => (
                  <Grid item xs={12} md={6} key={notification.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="h6">
                            {notification.title}
                          </Typography>
                          <Chip 
                            label={
                              notification.status === 'sent' ? 'Enviada' :
                              notification.status === 'scheduled' ? 'Programada' :
                              notification.status === 'sending' ? 'Enviando' :
                              notification.status === 'failed' ? 'Fallida' : 'Borrador'
                            } 
                            color={
                              notification.status === 'sent' ? 'success' : 
                              notification.status === 'scheduled' ? 'info' : 
                              notification.status === 'sending' ? 'primary' :
                              notification.status === 'failed' ? 'error' : 'default'
                            }
                            size="small"
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {notification.message}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            {notification.status === 'scheduled' ? 
                              `Programada: ${new Date(notification.scheduled_for || '').toLocaleString()}` : 
                              notification.sent_at ? 
                                `Enviada: ${new Date(notification.sent_at).toLocaleString()}` : 
                                `Creada: ${new Date(notification.created_at).toLocaleString()}`
                            }
                          </Typography>
                          {notification.open_rate !== undefined && (
                            <Chip 
                              label={`${notification.open_rate}% apertura`} 
                              size="small" 
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Button size="small">Ver detalles</Button>
                        {notification.status === 'scheduled' && (
                          <Button 
                            size="small" 
                            color="error"
                            onClick={() => handleCancelNotification(notification.id)}
                            disabled={cancelNotificationMutation.isPending}
                          >
                            Cancelar
                          </Button>
                        )}
                      </CardActions>
                    </Card>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography>
                      No se han enviado notificaciones aún
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </TabPanel>

        {/* Pestaña de Campañas */}
        <TabPanel value={activeTab} index={2}>
          <Box textAlign="center" py={4}>
            <CampaignIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6">
              Campañas de marketing
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              ¡Próximamente! Crea campañas automáticas de marketing para atraer más clientes.
            </Typography>
            <Button variant="outlined">
              Explorar planes Premium
            </Button>
          </Box>
        </TabPanel>
      </Paper>

      {/* Diálogo para crear nueva promoción */}
      <Dialog
        open={promotionDialogOpen}
        onClose={() => setPromotionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nueva promoción</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="dish-select-label">Plato</InputLabel>
                <Select
                  labelId="dish-select-label"
                  value={promotionForm.dish_id}
                  label="Plato"
                  onChange={(e: SelectChangeEvent) => handlePromotionFormChange('dish_id', e.target.value)}
                >
                  <MenuItem value="">Selecciona un plato</MenuItem>
                  {isLoadingDishes ? (
                    <MenuItem disabled>Cargando platos...</MenuItem>
                  ) : (
                    dishes?.map((dish) => (
                      <MenuItem key={dish.id} value={dish.id}>
                        {dish.name} - {dish.price.toFixed(2)}€
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="promo-type-label">Tipo de promoción</InputLabel>
                <Select
                  labelId="promo-type-label"
                  value={promotionForm.type}
                  label="Tipo de promoción"
                  onChange={(e: SelectChangeEvent) => handlePromotionFormChange('type', e.target.value)}
                >
                  <MenuItem value="discount">Descuento</MenuItem>
                  <MenuItem value="featured">Destacado</MenuItem>
                  <MenuItem value="new">Nuevo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {promotionForm.type === 'discount' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Precio con descuento"
                  type="number"
                  InputProps={{
                    endAdornment: '€',
                  }}
                  value={promotionForm.discount_price || ''}
                  onChange={(e) => handlePromotionFormChange('discount_price', parseFloat(e.target.value))}
                />
              </Grid>
            )}
            
            <Grid item xs={12} sm={promotionForm.type === 'discount' ? 6 : 12}>
              <FormControl fullWidth>
                <InputLabel id="promo-status-label">Estado</InputLabel>
                <Select
                  labelId="promo-status-label"
                  value={promotionForm.active ? 'active' : 'inactive'}
                  label="Estado"
                  onChange={(e: SelectChangeEvent) => handlePromotionFormChange('active', e.target.value === 'active')}
                >
                  <MenuItem value="active">Activa</MenuItem>
                  <MenuItem value="inactive">Inactiva</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>Programación (Opcional)</Divider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha de inicio"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={promotionForm.start_date || ''}
                onChange={(e) => handlePromotionFormChange('start_date', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha de fin"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={promotionForm.end_date || ''}
                onChange={(e) => handlePromotionFormChange('end_date', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromotionDialogOpen(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleCreatePromotion}
            disabled={createPromotionMutation.isPending}
          >
            {createPromotionMutation.isPending ? <CircularProgress size={24} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para crear nueva notificación */}
      <Dialog
        open={notificationDialogOpen}
        onClose={() => setNotificationDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Nueva notificación</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Título"
                placeholder="Ej: ¡Nuevas ofertas esta semana!"
                value={notificationForm.title}
                onChange={(e) => handleNotificationFormChange('title', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mensaje"
                multiline
                rows={4}
                placeholder="Escribe aquí el mensaje que quieres enviar a tus clientes..."
                value={notificationForm.message}
                onChange={(e) => handleNotificationFormChange('message', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="notification-target-label">Destinatarios</InputLabel>
                <Select
                  labelId="notification-target-label"
                  value={notificationForm.target_type}
                  label="Destinatarios"
                  onChange={(e: SelectChangeEvent) => handleNotificationFormChange('target_type', e.target.value)}
                >
                  <MenuItem value="all">Todos los clientes</MenuItem>
                  <MenuItem value="favorites">Clientes con favoritos</MenuItem>
                  <MenuItem value="recent">Clientes recientes (30 días)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="notification-when-label">Cuándo enviar</InputLabel>
                <Select
                  labelId="notification-when-label"
                  value={notificationForm.send_time}
                  label="Cuándo enviar"
                  onChange={(e: SelectChangeEvent) => handleNotificationFormChange('send_time', e.target.value)}
                >
                  <MenuItem value="now">Ahora</MenuItem>
                  <MenuItem value="scheduled">Programar</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha y hora"
                type="datetime-local"
                disabled={notificationForm.send_time !== 'scheduled'}
                InputLabelProps={{
                  shrink: true,
                }}
                value={notificationForm.scheduled_for || ''}
                onChange={(e) => handleNotificationFormChange('scheduled_for', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotificationDialogOpen(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateNotification}
            disabled={createNotificationMutation.isPending}
          >
            {createNotificationMutation.isPending ? <CircularProgress size={24} /> : 'Crear notificación'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para mensajes */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MarketingPage;