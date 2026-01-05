// apps/admin/src/pages/ConfigurationPage.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Tabs,
  Tab,
  Divider,
  CircularProgress,
  Alert,
  alpha,
  InputAdornment,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Restaurant,
  LocationOn,
  Wifi,
  Share,
  Save,
  Store,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/apiClient';

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

type TabValue = 'info' | 'location' | 'services' | 'social';

const neonColors = {
  info: '#6366f1',      // Purple
  location: '#22c55e',  // Green
  services: '#f59e0b',  // Amber
  social: '#ec4899',    // Pink
};

export default function ConfigurationPage() {
  const { currentRestaurant } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = currentRestaurant?.id;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [activeTab, setActiveTab] = useState<TabValue>('info');
  const [formData, setFormData] = useState<RestaurantData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Query: Obtener datos del restaurante
  const { data: restaurantResponse, isLoading, error } = useQuery({
    queryKey: ['restaurant-settings', restaurantId],
    queryFn: () => apiClient.getRestaurant(restaurantId),
    enabled: !!restaurantId,
  });

  // Efecto para cargar datos del restaurante
  useEffect(() => {
    if (restaurantResponse?.restaurant) {
      const r = restaurantResponse.restaurant;
      setFormData({
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
        tripadvisor_url: r.tripadvisor_url || ''
      });
      setHasChanges(false);
    }
  }, [restaurantResponse]);

  // Mutation: Actualizar restaurante
  const mutation = useMutation({
    mutationFn: async (data: RestaurantData) => {
      // Prepare clean payload for API
      const payload = {
        name: data.name,
        description: data.description,
        email: data.email,
        phone: data.phone,
        website: data.website,
        city: data.city,
        country: data.country,
        timezone: data.timezone,
        accepts_reservations: data.accepts_reservations,
        reservation_url: data.reservation_url,
        reservation_phone: data.reservation_phone,
        reservation_email: data.reservation_email,
        has_wifi: data.has_wifi,
        has_delivery: data.has_delivery,
        has_outdoor_seating: data.has_outdoor_seating,
        capacity: data.capacity,
        google_maps_url: data.google_maps_url,
        facebook_url: data.facebook_url,
        instagram_url: data.instagram_handle,
        tiktok_url: data.tiktok_handle,
        youtube_url: data.youtube_url,
        tripadvisor_url: data.tripadvisor_url
      };
      return apiClient.updateRestaurant(restaurantId!, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-settings', restaurantId] });
      setHasChanges(false);
    },
  });

  const updateField = (field: keyof RestaurantData, value: string | boolean | number) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (formData) {
      mutation.mutate(formData);
    }
  };

  const getTabColor = () => neonColors[activeTab];

  if (!restaurantId) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="warning">No hay restaurante seleccionado</Alert>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">Error al cargar la configuración: {(error as Error)?.message}</Alert>
      </Container>
    );
  }

  if (isLoading || !formData) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress size={48} />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Configuración
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Personaliza la información de tu restaurante
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="large"
          startIcon={mutation.isPending ? <CircularProgress size={20} color="inherit" /> : <Save />}
          onClick={handleSave}
          disabled={!hasChanges || mutation.isPending}
          sx={{
            px: 4,
            py: 1.5,
            borderRadius: 3,
            fontWeight: 600,
            background: hasChanges ? `linear-gradient(135deg, ${neonColors.info} 0%, ${alpha(neonColors.info, 0.8)} 100%)` : undefined,
            boxShadow: hasChanges ? `0 4px 20px ${alpha(neonColors.info, 0.4)}` : 'none',
            '&:hover': {
              boxShadow: hasChanges ? `0 6px 24px ${alpha(neonColors.info, 0.5)}` : 'none',
            }
          }}
        >
          {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </Box>

      {/* Success/Error Messages */}
      {mutation.isSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          ✅ Cambios guardados correctamente
        </Alert>
      )}
      {mutation.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          ❌ Error al guardar: {(mutation.error as Error)?.message}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons={isMobile ? 'auto' : false}
          allowScrollButtonsMobile
          sx={{
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              background: getTabColor(),
              boxShadow: `0 0 10px ${getTabColor()}`,
            },
            '& .MuiTab-root': {
              fontSize: '1rem',
              mr: 2,
              textTransform: 'none',
              fontWeight: 600,
              minHeight: 48,
              '&.Mui-selected': {
                color: getTabColor(),
              }
            }
          }}
        >
          <Tab icon={<Store sx={{ mr: 1 }} />} iconPosition="start" label="Información" value="info" />
          <Tab icon={<LocationOn sx={{ mr: 1 }} />} iconPosition="start" label="Localización" value="location" />
          <Tab icon={<Wifi sx={{ mr: 1 }} />} iconPosition="start" label="Servicios" value="services" />
          <Tab icon={<Share sx={{ mr: 1 }} />} iconPosition="start" label="Redes Sociales" value="social" />
        </Tabs>
        <Divider sx={{ mt: '-1px' }} />
      </Box>

      {/* Tab Content */}
      <Box>
        {/* Información Básica */}
        {activeTab === 'info' && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  background: `linear-gradient(135deg, ${alpha(neonColors.info, 0.08)} 0%, ${alpha(neonColors.info, 0.02)} 100%)`,
                  border: `1px solid ${alpha(neonColors.info, 0.15)}`,
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    borderColor: alpha(neonColors.info, 0.3),
                    boxShadow: `0 8px 24px ${alpha(neonColors.info, 0.15)}`,
                  }
                }}
              >
                <CardHeader
                  title="Datos del Restaurante"
                  titleTypographyProps={{ variant: 'h6', fontWeight: 700, color: neonColors.info }}
                  avatar={
                    <Box sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: alpha(neonColors.info, 0.12),
                      boxShadow: `0 2px 8px ${alpha(neonColors.info, 0.2)}`
                    }}>
                      <Restaurant sx={{ color: neonColors.info }} />
                    </Box>
                  }
                />
                <CardContent>
                  <Grid container spacing={2.5}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Nombre del restaurante"
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Descripción"
                        value={formData.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        multiline
                        rows={4}
                        placeholder="Describe tu restaurante..."
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  background: `linear-gradient(135deg, ${alpha(neonColors.info, 0.08)} 0%, ${alpha(neonColors.info, 0.02)} 100%)`,
                  border: `1px solid ${alpha(neonColors.info, 0.15)}`,
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    borderColor: alpha(neonColors.info, 0.3),
                    boxShadow: `0 8px 24px ${alpha(neonColors.info, 0.15)}`,
                  }
                }}
              >
                <CardHeader
                  title="Contacto"
                  titleTypographyProps={{ variant: 'h6', fontWeight: 700, color: neonColors.info }}
                />
                <CardContent>
                  <Grid container spacing={2.5}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Teléfono"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Sitio web"
                        type="url"
                        value={formData.website}
                        onChange={(e) => updateField('website', e.target.value)}
                        placeholder="https://..."
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Localización */}
        {activeTab === 'location' && (
          <Card
            elevation={0}
            sx={{
              background: `linear-gradient(135deg, ${alpha(neonColors.location, 0.08)} 0%, ${alpha(neonColors.location, 0.02)} 100%)`,
              border: `1px solid ${alpha(neonColors.location, 0.15)}`,
              transition: 'all 0.25s ease',
              '&:hover': {
                borderColor: alpha(neonColors.location, 0.3),
                boxShadow: `0 8px 24px ${alpha(neonColors.location, 0.15)}`,
              }
            }}
          >
            <CardHeader
              title="Ubicación"
              titleTypographyProps={{ variant: 'h6', fontWeight: 700, color: neonColors.location }}
              avatar={
                <Box sx={{
                  p: 1,
                  borderRadius: 2,
                  bgcolor: alpha(neonColors.location, 0.12),
                  boxShadow: `0 2px 8px ${alpha(neonColors.location, 0.2)}`
                }}>
                  <LocationOn sx={{ color: neonColors.location }} />
                </Box>
              }
            />
            <CardContent>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Ciudad"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="País"
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Zona horaria"
                    select
                    value={formData.timezone}
                    onChange={(e) => updateField('timezone', e.target.value)}
                    SelectProps={{ native: true }}
                  >
                    <option value="Europe/Madrid">Europe/Madrid (CET)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="URL de Google Maps"
                    type="url"
                    value={formData.google_maps_url}
                    onChange={(e) => updateField('google_maps_url', e.target.value)}
                    placeholder="https://maps.google.com/..."
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Servicios */}
        {activeTab === 'services' && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card
                elevation={0}
                sx={{
                  background: `linear-gradient(135deg, ${alpha(neonColors.services, 0.08)} 0%, ${alpha(neonColors.services, 0.02)} 100%)`,
                  border: `1px solid ${alpha(neonColors.services, 0.15)}`,
                }}
              >
                <CardHeader
                  title="Servicios disponibles"
                  titleTypographyProps={{ variant: 'h6', fontWeight: 700, color: neonColors.services }}
                  avatar={
                    <Box sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: alpha(neonColors.services, 0.12),
                      boxShadow: `0 2px 8px ${alpha(neonColors.services, 0.2)}`
                    }}>
                      <Wifi sx={{ color: neonColors.services }} />
                    </Box>
                  }
                />
                <CardContent>
                  <Grid container spacing={2}>
                    {[
                      { key: 'has_wifi', label: 'WiFi Gratis', desc: 'Ofreces WiFi a tus clientes', color: '#10b981' },
                      { key: 'has_delivery', label: 'Delivery', desc: 'Servicio de entrega a domicilio', color: '#3b82f6' },
                      { key: 'has_outdoor_seating', label: 'Terraza exterior', desc: 'Mesas al aire libre', color: '#f59e0b' },
                    ].map((service) => (
                      <Grid item xs={12} sm={4} key={service.key}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            p: 3,
                            borderRadius: 3,
                            bgcolor: formData[service.key as keyof RestaurantData] ? alpha(service.color, 0.12) : 'transparent',
                            border: '1px solid',
                            borderColor: formData[service.key as keyof RestaurantData] ? alpha(service.color, 0.4) : 'divider',
                            boxShadow: formData[service.key as keyof RestaurantData] ? `0 4px 16px ${alpha(service.color, 0.2)}` : 'none',
                            transition: 'all 0.3s ease',
                          }}
                        >
                          <Typography variant="subtitle1" fontWeight={700} sx={{ color: formData[service.key as keyof RestaurantData] ? service.color : 'text.primary' }}>
                            {service.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                            {service.desc}
                          </Typography>
                          <Switch
                            checked={formData[service.key as keyof RestaurantData] as boolean}
                            onChange={(e) => updateField(service.key as keyof RestaurantData, e.target.checked)}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: service.color,
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: service.color,
                              },
                            }}
                          />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  background: `linear-gradient(135deg, ${alpha('#8b5cf6', 0.08)} 0%, ${alpha('#8b5cf6', 0.02)} 100%)`,
                  border: `1px solid ${alpha('#8b5cf6', 0.15)}`,
                }}
              >
                <CardHeader
                  title="Capacidad"
                  titleTypographyProps={{ variant: 'h6', fontWeight: 700, color: '#8b5cf6' }}
                />
                <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: 'calc(100% - 72px)' }}>
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography variant="h2" fontWeight={800} sx={{ color: '#8b5cf6' }}>
                      {formData.capacity}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      personas máximo
                    </Typography>
                  </Box>
                  <TextField
                    fullWidth
                    label="Capacidad total"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => updateField('capacity', parseInt(e.target.value) || 0)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">👥</InputAdornment>,
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Redes Sociales */}
        {activeTab === 'social' && (
          <Card
            elevation={0}
            sx={{
              background: `linear-gradient(135deg, ${alpha(neonColors.social, 0.08)} 0%, ${alpha(neonColors.social, 0.02)} 100%)`,
              border: `1px solid ${alpha(neonColors.social, 0.15)}`,
              transition: 'all 0.25s ease',
              '&:hover': {
                borderColor: alpha(neonColors.social, 0.3),
                boxShadow: `0 8px 24px ${alpha(neonColors.social, 0.15)}`,
              }
            }}
          >
            <CardHeader
              title="Redes Sociales"
              titleTypographyProps={{ variant: 'h6', fontWeight: 700, color: neonColors.social }}
              avatar={
                <Box sx={{
                  p: 1,
                  borderRadius: 2,
                  bgcolor: alpha(neonColors.social, 0.12),
                  boxShadow: `0 2px 8px ${alpha(neonColors.social, 0.2)}`
                }}>
                  <Share sx={{ color: neonColors.social }} />
                </Box>
              }
            />
            <CardContent>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Facebook"
                    type="url"
                    value={formData.facebook_url}
                    onChange={(e) => updateField('facebook_url', e.target.value)}
                    placeholder="https://facebook.com/..."
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Instagram"
                    value={formData.instagram_handle}
                    onChange={(e) => updateField('instagram_handle', e.target.value)}
                    placeholder="@usuario"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">@</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="TikTok"
                    value={formData.tiktok_handle}
                    onChange={(e) => updateField('tiktok_handle', e.target.value)}
                    placeholder="@usuario"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">@</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="YouTube"
                    type="url"
                    value={formData.youtube_url}
                    onChange={(e) => updateField('youtube_url', e.target.value)}
                    placeholder="https://youtube.com/..."
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Tripadvisor"
                    type="url"
                    value={formData.tripadvisor_url}
                    onChange={(e) => updateField('tripadvisor_url', e.target.value)}
                    placeholder="https://tripadvisor.com/..."
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Box>
    </Container>
  );
}
