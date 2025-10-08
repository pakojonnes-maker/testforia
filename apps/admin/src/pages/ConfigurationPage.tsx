import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Grid,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Divider,
  Card,
  CardContent,
  CardActions,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  Language as LanguageIcon,
  Palette as PaletteIcon,
  QrCode as QrCodeIcon,
  Save as SaveIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Link as LinkIcon,
  Schedule as ScheduleIcon,
  Slideshow as ReelsIcon,
  Preview as PreviewIcon,
  MobileFriendly as MobileIcon,
  PhoneIphone as PhoneIcon,
} from '@mui/icons-material';

// Interfaces para tipar datos
interface RestaurantDetails {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  logo_url?: string;
  google_maps_url?: string;
  active_languages?: string[];
  language_completion?: Record<string, number>;
  opening_hours?: {
    [key: string]: {
      open?: string;
      close?: string;
    }
  };
  theme?: {
    primary_color?: string;
    secondary_color?: string;
    text_color?: string;
    background_color?: string;
  };
}

interface LandingConfig {
  template_id: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  font_heading: string;
  font_body: string;
  show_reservation: boolean;
  show_social_links: boolean;
  show_menu_preview: boolean;
  seo: {
    [key: string]: {
      title?: string;
      description?: string;
      keywords?: string;
    }
  };
}

interface ReelsConfig {
  enabled: boolean;
  primary_color: string;
  secondary_color: string;
  show_badge_icons: boolean;
  autoplay_videos: boolean;
  show_price: boolean;
  transition_effect: string;
}

interface Language {
  code: string;
  name: string;
  native_name: string;
  flag_emoji: string;
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

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`configuration-tabpanel-${index}`}
      aria-labelledby={`configuration-tab-${index}`}
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

const ConfigurationPage: React.FC = () => {
  const { user } = useAuth();
  const restaurantId = user?.currentRestaurant?.id;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });

  // Nuevos estados para la configuración de reels
  const [reelsConfig, setReelsConfig] = useState<ReelsConfig>({
    enabled: true,
    primary_color: '#9c27b0',
    secondary_color: '#2196f3',
    show_badge_icons: true,
    autoplay_videos: true,
    show_price: true,
    transition_effect: 'slide'
  });

  // Consultas para cargar datos
  const {
    data: restaurantDetails,
    isLoading: isLoadingRestaurant,
  } = useQuery<RestaurantDetails>({
    queryKey: ['restaurant-details', restaurantId],
    queryFn: () => apiClient.getRestaurantDetails(restaurantId as string),
    enabled: !!restaurantId,
    onSuccess: (data) => {
      // Si el restaurante ya tiene colores definidos para reels, usarlos
      if (data.theme?.primary_color) {
        setReelsConfig(prev => ({
          ...prev,
          primary_color: data.theme.primary_color || prev.primary_color,
          secondary_color: data.theme.secondary_color || prev.secondary_color
        }));
      }
    }
  });

  const {
    data: landingConfig,
    isLoading: isLoadingLanding,
  } = useQuery<LandingConfig>({
    queryKey: ['landing-config', restaurantId],
    queryFn: () => apiClient.getLandingConfig(restaurantId as string),
    enabled: !!restaurantId,
  });

  const {
    data: availableLanguages,
    isLoading: isLoadingLanguages,
  } = useQuery<Language[]>({
    queryKey: ['available-languages'],
    queryFn: () => apiClient.getLanguages(),
  });

  // Mutaciones
  const saveRestaurantMutation = useMutation({
    mutationFn: (data: Partial<RestaurantDetails>) => 
      apiClient.updateRestaurantDetails(restaurantId as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['restaurant-details', restaurantId]);
      setSnackbar({
        open: true,
        message: 'Configuración de restaurante guardada correctamente',
        severity: 'success',
      });
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: `Error: ${error?.response?.data?.message || 'No se pudo guardar la configuración'}`,
        severity: 'error',
      });
    },
  });

  const saveLandingMutation = useMutation({
    mutationFn: (data: Partial<LandingConfig>) => 
      apiClient.updateLandingConfig(restaurantId as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['landing-config', restaurantId]);
      setSnackbar({
        open: true,
        message: 'Configuración de la landing page guardada correctamente',
        severity: 'success',
      });
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: `Error: ${error?.response?.data?.message || 'No se pudo guardar la configuración'}`,
        severity: 'error',
      });
    },
  });

  // Nueva mutación para guardar la configuración de reels
  const saveReelsConfigMutation = useMutation({
    mutationFn: (data: Partial<ReelsConfig>) => {
      // Actualizar el tema del restaurante con los colores de reels
      return apiClient.updateRestaurant(restaurantId as string, {
        theme: {
          primary_color: data.primary_color,
          secondary_color: data.secondary_color,
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['restaurant-details', restaurantId]);
      setSnackbar({
        open: true,
        message: 'Configuración de experiencia de cliente guardada correctamente',
        severity: 'success',
      });
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: `Error: ${error?.response?.data?.message || 'No se pudo guardar la configuración'}`,
        severity: 'error',
      });
    },
  });

  const isLoading = isLoadingRestaurant || isLoadingLanding || isLoadingLanguages;

  // Funciones auxiliares
  const handleCopyUrl = (): void => {
    const url = `https://visualtaste.com/${user?.currentRestaurant?.slug || ''}`;
    navigator.clipboard.writeText(url);
    setSnackbar({
      open: true,
      message: 'URL copiada al portapapeles',
      severity: 'success',
    });
  };

  const downloadQrCode = (format: 'png' | 'svg' | 'pdf'): void => {
    // Implementación futura: Descargar QR en diferentes formatos
    setSnackbar({
      open: true,
      message: `Descargando código QR en formato ${format}`,
      severity: 'success',
    });
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number): void => {
    setActiveTab(newValue);
  };

  const handleToggleLanguage = (langCode: string, isActive: boolean): void => {
    if (langCode === 'es') return; // No permitir desactivar español
    
    // Lógica para activar/desactivar idioma
    console.log(`${isActive ? 'Activando' : 'Desactivando'} idioma: ${langCode}`);
    
    // Aquí iría la mutación para actualizar idiomas
  };

  const handleChangeRestaurantField = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: keyof RestaurantDetails
  ): void => {
    if (!restaurantDetails) return;
    
    const updatedDetails = {
      ...restaurantDetails,
      [field]: e.target.value
    };
    
    // No guardar automáticamente, solo actualizar la vista
    console.log(`Campo actualizado: ${field} = ${e.target.value}`);
  };

  const handleSaveRestaurantDetails = (): void => {
    if (!restaurantDetails) return;
    
    // Aquí se recopilan todos los valores actualizados desde los inputs
    const formData: Partial<RestaurantDetails> = {
      name: (document.querySelector('[name="restaurant-name"]') as HTMLInputElement)?.value || restaurantDetails.name,
      slug: (document.querySelector('[name="restaurant-slug"]') as HTMLInputElement)?.value || restaurantDetails.slug,
      phone: (document.querySelector('[name="restaurant-phone"]') as HTMLInputElement)?.value || restaurantDetails.phone,
      email: (document.querySelector('[name="restaurant-email"]') as HTMLInputElement)?.value || restaurantDetails.email,
      address: (document.querySelector('[name="restaurant-address"]') as HTMLTextAreaElement)?.value || restaurantDetails.address,
      city: (document.querySelector('[name="restaurant-city"]') as HTMLInputElement)?.value || restaurantDetails.city,
      country: (document.querySelector('[name="restaurant-country"]') as HTMLInputElement)?.value || restaurantDetails.country,
      instagram: (document.querySelector('[name="restaurant-instagram"]') as HTMLInputElement)?.value || restaurantDetails.instagram,
      facebook: (document.querySelector('[name="restaurant-facebook"]') as HTMLInputElement)?.value || restaurantDetails.facebook,
      tiktok: (document.querySelector('[name="restaurant-tiktok"]') as HTMLInputElement)?.value || restaurantDetails.tiktok,
      google_maps_url: (document.querySelector('[name="restaurant-maps"]') as HTMLInputElement)?.value || restaurantDetails.google_maps_url,
    };
    
    saveRestaurantMutation.mutate(formData);
  };

  const handleSaveLanding = (): void => {
    if (!landingConfig) return;
    
    // Aquí se recopilan los datos de la configuración de la landing
    const formData: Partial<LandingConfig> = {
      template_id: (document.querySelector('[name="landing-template"]') as HTMLSelectElement)?.value || landingConfig.template_id,
      primary_color: (document.querySelector('[name="landing-primary-color"]') as HTMLInputElement)?.value || landingConfig.primary_color,
      secondary_color: (document.querySelector('[name="landing-secondary-color"]') as HTMLInputElement)?.value || landingConfig.secondary_color,
      background_color: (document.querySelector('[name="landing-background-color"]') as HTMLInputElement)?.value || landingConfig.background_color,
      font_heading: (document.querySelector('[name="landing-font-heading"]') as HTMLSelectElement)?.value || landingConfig.font_heading,
      show_reservation: (document.querySelector('[name="landing-show-reservation"]') as HTMLInputElement)?.checked ?? landingConfig.show_reservation,
      show_social_links: (document.querySelector('[name="landing-show-social"]') as HTMLInputElement)?.checked ?? landingConfig.show_social_links,
      seo: {
        ...landingConfig.seo,
        es: {
          title: (document.querySelector('[name="landing-seo-title"]') as HTMLInputElement)?.value || landingConfig.seo?.es?.title || '',
          description: (document.querySelector('[name="landing-seo-description"]') as HTMLInputElement)?.value || landingConfig.seo?.es?.description || '',
        }
      }
    };
    
    saveLandingMutation.mutate(formData);
  };

  const handleChangeSchedule = (
    day: string,
    field: 'open' | 'close',
    value: string
  ): void => {
    if (!restaurantDetails?.opening_hours) return;
    
    const updatedHours = {
      ...restaurantDetails.opening_hours,
      [day]: {
        ...restaurantDetails.opening_hours[day],
        [field]: value
      }
    };
    
    // Actualizar el campo opening_hours
    console.log(`Horario actualizado: ${day} ${field} = ${value}`);
  };

  // Nueva función para manejar los cambios en la configuración de reels
  const handleChangeReelsConfig = (field: keyof ReelsConfig, value: any): void => {
    setReelsConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Nueva función para guardar la configuración de reels
  const handleSaveReelsConfig = (): void => {
    saveReelsConfigMutation.mutate(reelsConfig);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom component="h1">
        Configuración
      </Typography>

      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<RestaurantIcon />} iconPosition="start" label="General" />
          <Tab icon={<LanguageIcon />} iconPosition="start" label="Idiomas" />
          <Tab icon={<PaletteIcon />} iconPosition="start" label="Apariencia" />
          <Tab icon={<ReelsIcon />} iconPosition="start" label="Experiencia cliente" />
          <Tab icon={<QrCodeIcon />} iconPosition="start" label="Código QR" />
          <Tab icon={<ScheduleIcon />} iconPosition="start" label="Horarios" />
        </Tabs>

        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Pestaña General */}
            <TabPanel value={activeTab} index={0}>
              <Box component="form" noValidate>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Información del restaurante
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Nombre del restaurante"
                      variant="outlined"
                      name="restaurant-name"
                      defaultValue={restaurantDetails?.name}
                      onChange={(e) => handleChangeRestaurantField(e, 'name')}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Slug (URL amigable)"
                      variant="outlined"
                      name="restaurant-slug"
                      defaultValue={restaurantDetails?.slug}
                      onChange={(e) => handleChangeRestaurantField(e, 'slug')}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">visualtaste.com/</InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Teléfono"
                      variant="outlined"
                      name="restaurant-phone"
                      defaultValue={restaurantDetails?.phone}
                      onChange={(e) => handleChangeRestaurantField(e, 'phone')}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      variant="outlined"
                      name="restaurant-email"
                      defaultValue={restaurantDetails?.email}
                      onChange={(e) => handleChangeRestaurantField(e, 'email')}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Dirección completa"
                      variant="outlined"
                      name="restaurant-address"
                      defaultValue={restaurantDetails?.address}
                      onChange={(e) => handleChangeRestaurantField(e, 'address')}
                      multiline
                      rows={2}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Ciudad"
                      variant="outlined"
                      name="restaurant-city"
                      defaultValue={restaurantDetails?.city}
                      onChange={(e) => handleChangeRestaurantField(e, 'city')}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="País"
                      variant="outlined"
                      name="restaurant-country"
                      defaultValue={restaurantDetails?.country}
                      onChange={(e) => handleChangeRestaurantField(e, 'country')}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Google Maps URL"
                      variant="outlined"
                      name="restaurant-maps"
                      defaultValue={restaurantDetails?.google_maps_url}
                      onChange={(e) => handleChangeRestaurantField(e, 'google_maps_url')}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              component="a"
                              href={restaurantDetails?.google_maps_url}
                              target="_blank"
                              disabled={!restaurantDetails?.google_maps_url}
                            >
                              <LinkIcon />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Redes Sociales
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Instagram"
                      variant="outlined"
                      name="restaurant-instagram"
                      defaultValue={restaurantDetails?.instagram}
                      onChange={(e) => handleChangeRestaurantField(e, 'instagram')}
                      placeholder="@usuarioInstagram"
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Facebook"
                      variant="outlined"
                      name="restaurant-facebook"
                      defaultValue={restaurantDetails?.facebook}
                      onChange={(e) => handleChangeRestaurantField(e, 'facebook')}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="TikTok"
                      variant="outlined"
                      name="restaurant-tiktok"
                      defaultValue={restaurantDetails?.tiktok}
                      onChange={(e) => handleChangeRestaurantField(e, 'tiktok')}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box sx={{ mt: 2 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveRestaurantDetails}
                        disabled={saveRestaurantMutation.isPending}
                      >
                        {saveRestaurantMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>

            {/* Pestaña de Idiomas */}
            <TabPanel value={activeTab} index={1}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Idiomas activos
                </Typography>
                <Typography variant="body2" paragraph>
                  Los idiomas activos estarán disponibles para los clientes en la visualización del menú.
                </Typography>

                <Grid container spacing={2}>
                  {availableLanguages?.map((language) => (
                    <Grid item xs={12} sm={6} md={4} key={language.code}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="h6" sx={{ mr: 1 }}>
                              {language.flag_emoji}
                            </Typography>
                            <Typography variant="h6">
                              {language.native_name}
                            </Typography>
                          </Box>
                          <Typography color="text.secondary">
                            {language.name}
                          </Typography>
                          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={restaurantDetails?.active_languages?.includes(language.code) || language.code === 'es'}
                                  onChange={(e) => handleToggleLanguage(language.code, e.target.checked)}
                                  disabled={language.code === 'es'} // El español no se puede desactivar
                                />
                              }
                              label={
                                language.code === 'es' 
                                  ? "Idioma principal" 
                                  : restaurantDetails?.active_languages?.includes(language.code) 
                                    ? "Activo" 
                                    : "Inactivo"
                              }
                            />
                            {restaurantDetails?.active_languages?.includes(language.code) && (
                              <Chip 
                                label={`${restaurantDetails?.language_completion?.[language.code] || 0}% completo`}
                                color={
                                  (restaurantDetails?.language_completion?.[language.code] || 0) > 80
                                    ? "success"
                                    : (restaurantDetails?.language_completion?.[language.code] || 0) > 40
                                    ? "warning"
                                    : "error"
                                }
                                size="small"
                              />
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={() => {
                      // Guardar configuración de idiomas
                    }}
                  >
                    Guardar configuración de idiomas
                  </Button>
                </Box>
              </Box>
            </TabPanel>

            {/* Pestaña de Apariencia */}
            <TabPanel value={activeTab} index={2}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Apariencia de la landing page
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="template-label">Plantilla</InputLabel>
                      <Select
                        labelId="template-label"
                        name="landing-template"
                        value={landingConfig?.template_id || ''}
                        label="Plantilla"
                      >
                        <MenuItem value="template_1">Moderna</MenuItem>
                        <MenuItem value="template_2">Clásica</MenuItem>
                        <MenuItem value="template_3">Gourmet (Premium)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="font-heading-label">Fuente de títulos</InputLabel>
                      <Select
                        labelId="font-heading-label"
                        name="landing-font-heading"
                        value={landingConfig?.font_heading || ''}
                        label="Fuente de títulos"
                      >
                        <MenuItem value="Poppins, sans-serif">Poppins</MenuItem>
                        <MenuItem value="Playfair Display, serif">Playfair Display</MenuItem>
                        <MenuItem value="Montserrat, sans-serif">Montserrat</MenuItem>
                        <MenuItem value="Roboto, sans-serif">Roboto</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Color primario"
                      type="color"
                      name="landing-primary-color"
                      value={landingConfig?.primary_color || '#942c2c'}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Box sx={{ 
                              width: 24, 
                              height: 24, 
                              bgcolor: landingConfig?.primary_color || '#942c2c',
                              borderRadius: '4px'
                            }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Color secundario"
                      type="color"
                      name="landing-secondary-color"
                      value={landingConfig?.secondary_color || '#2c6e49'}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Color de fondo"
                      type="color"
                      name="landing-background-color"
                      value={landingConfig?.background_color || '#f8f8f8'}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      SEO y Metadatos
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Título SEO (Español)"
                      variant="outlined"
                      name="landing-seo-title"
                      defaultValue={landingConfig?.seo?.es?.title}
                      placeholder="Ej: Restaurante Bottega - Auténtica cocina italiana en Madrid"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Descripción SEO (Español)"
                      variant="outlined"
                      name="landing-seo-description"
                      multiline
                      rows={2}
                      defaultValue={landingConfig?.seo?.es?.description}
                      placeholder="Descripción breve del restaurante para motores de búsqueda (max. 160 caracteres)"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          name="landing-show-reservation"
                          checked={landingConfig?.show_reservation || false}
                        />
                      }
                      label="Mostrar botón de reservas"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          name="landing-show-social"
                          checked={landingConfig?.show_social_links || true}
                        />
                      }
                      label="Mostrar redes sociales"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box sx={{ mt: 2 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveLanding}
                        disabled={saveLandingMutation.isPending}
                      >
                        {saveLandingMutation.isPending ? 'Guardando...' : 'Guardar apariencia'}
                      </Button>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box sx={{ mt: 2 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        component="a"
                        href={`https://visualtaste.com/${user?.currentRestaurant?.slug || ''}`}
                        target="_blank"
                        startIcon={<LinkIcon />}
                      >
                        Vista previa
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>
            {/* Nueva pestaña de Experiencia Cliente (Reels) */}
            <TabPanel value={activeTab} index={3}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Experiencia de visualización de menú
                </Typography>
                <Typography variant="body2" paragraph>
                  Personaliza cómo los clientes verán tus platos en el formato interactivo tipo "reels".
                </Typography>

                <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIcon color="primary" />
                    <Typography variant="body2">
                      La experiencia "reels" permite a los clientes navegar entre tus platos deslizando vertical y horizontalmente, 
                      similar a las historias de Instagram o videos de TikTok.
                    </Typography>
                  </Box>
                </Paper>

                <Grid container spacing={3}>
                  {/* Colores */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      Colores y apariencia
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Color primario"
                      type="color"
                      value={reelsConfig.primary_color}
                      onChange={(e) => handleChangeReelsConfig('primary_color', e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Box sx={{ 
                              width: 24, 
                              height: 24, 
                              bgcolor: reelsConfig.primary_color,
                              borderRadius: '4px'
                            }} />
                          </InputAdornment>
                        ),
                      }}
                      helperText="Color principal para botones y elementos destacados"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Color secundario"
                      type="color"
                      value={reelsConfig.secondary_color}
                      onChange={(e) => handleChangeReelsConfig('secondary_color', e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Box sx={{ 
                              width: 24, 
                              height: 24, 
                              bgcolor: reelsConfig.secondary_color,
                              borderRadius: '4px'
                            }} />
                          </InputAdornment>
                        ),
                      }}
                      helperText="Color para acentos y elementos secundarios"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      border: '1px dashed',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <Typography variant="subtitle1">Vista previa de colores</Typography>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Box sx={{ 
                          height: 40, 
                          width: 100, 
                          bgcolor: reelsConfig.primary_color, 
                          borderRadius: 1, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 'bold'
                        }}>
                          Primario
                        </Box>
                        <Box sx={{ 
                          height: 40, 
                          width: 100, 
                          bgcolor: reelsConfig.secondary_color, 
                          borderRadius: 1, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 'bold'
                        }}>
                          Secundario
                        </Box>
                      </Box>
                    </Box>
                  </Grid>

                  {/* Opciones de visualización */}
                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      Opciones de visualización
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel id="transition-effect-label">Efecto de transición</InputLabel>
                      <Select
                        labelId="transition-effect-label"
                        value={reelsConfig.transition_effect}
                        label="Efecto de transición"
                        onChange={(e) => handleChangeReelsConfig('transition_effect', e.target.value)}
                      >
                        <MenuItem value="slide">Deslizar</MenuItem>
                        <MenuItem value="fade">Desvanecer</MenuItem>
                        <MenuItem value="cube">Cubo</MenuItem>
                        <MenuItem value="flip">Voltear</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={reelsConfig.autoplay_videos}
                          onChange={(e) => handleChangeReelsConfig('autoplay_videos', e.target.checked)}
                        />
                      }
                      label="Reproducir videos automáticamente"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={reelsConfig.show_badge_icons}
                          onChange={(e) => handleChangeReelsConfig('show_badge_icons', e.target.checked)}
                        />
                      }
                      label="Mostrar iconos de características (vegano, sin gluten, etc.)"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={reelsConfig.show_price}
                          onChange={(e) => handleChangeReelsConfig('show_price', e.target.checked)}
                        />
                      }
                      label="Mostrar precio de los platos"
                    />
                  </Grid>

                  {/* Vista previa y acciones */}
                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      Vista previa y acciones
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<PreviewIcon />}
                      component="a"
                      href={`/r/${user?.currentRestaurant?.slug || ''}`}
                      target="_blank"
                    >
                      Vista previa en nueva pestaña
                    </Button>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      onClick={handleSaveReelsConfig}
                      startIcon={<SaveIcon />}
                      disabled={saveReelsConfigMutation.isPending}
                    >
                      {saveReelsConfigMutation.isPending ? 'Guardando...' : 'Guardar configuración'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>

            {/* Pestaña de Código QR */}
            <TabPanel value={activeTab} index={3}>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Código QR del menú
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Este código QR dirige directamente a tu menú digital interactivo. Puedes imprimirlo para mesas, mostrador, o añadirlo a tus materiales promocionales.
                  </Typography>

                  <Box sx={{ textAlign: 'center', my: 3 }}>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://visualtaste.com/${user?.currentRestaurant?.slug || ''}`} 
                      alt="QR Code" 
                      style={{ width: 200, height: 200 }} 
                    />
                  </Box>

                  <Typography variant="body2" gutterBottom>
                    URL del menú:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      value={`https://visualtaste.com/${user?.currentRestaurant?.slug || ''}`}
                      InputProps={{
                        readOnly: true,
                      }}
                      size="small"
                    />
                    <IconButton color="primary" onClick={handleCopyUrl}>
                      <CopyIcon />
                    </IconButton>
                  </Box>

                  <Typography variant="h6" gutterBottom>
                    Descargar QR
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Button 
                        fullWidth 
                        variant="outlined" 
                        onClick={() => downloadQrCode('png')}
                      >
                        PNG
                      </Button>
                    </Grid>
                    <Grid item xs={4}>
                      <Button 
                        fullWidth 
                        variant="outlined"
                        onClick={() => downloadQrCode('svg')}
                      >
                        SVG
                      </Button>
                    </Grid>
                    <Grid item xs={4}>
                      <Button 
                        fullWidth 
                        variant="outlined"
                        onClick={() => downloadQrCode('pdf')}
                      >
                        PDF
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Personalización del código QR
                  </Typography>
                  
                  <Alert severity="info" sx={{ mb: 2 }}>
                    La personalización avanzada de QR está disponible en planes Profesional o superior.
                  </Alert>

<Box sx={{ opacity: user?.plan === 'professional' ? 1 : 0.6, pointerEvents: user?.plan === 'professional' ? 'auto' : 'none' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Color principal"
                          type="color"
                          defaultValue="#000000"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Color de fondo"
                          type="color"
                          defaultValue="#FFFFFF"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <InputLabel id="qr-style-label">Estilo</InputLabel>
                          <Select
                            labelId="qr-style-label"
                            defaultValue="square"
                          >
                            <MenuItem value="square">Cuadrado</MenuItem>
                            <MenuItem value="rounded">Redondeado</MenuItem>
                            <MenuItem value="dot">Puntos</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={<Switch />}
                          label="Incluir logo en el centro"
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Pestaña de Horarios */}
            <TabPanel value={activeTab} index={4}>
              <Typography variant="h6" gutterBottom>
                Horarios de apertura
              </Typography>
              <Typography variant="body2" paragraph>
                Configura los horarios de apertura de tu restaurante para mostrarlos en tu landing page y menú digital.
              </Typography>

              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                const dayNames: Record<string, string> = {
                  monday: 'Lunes',
                  tuesday: 'Martes',
                  wednesday: 'Miércoles',
                  thursday: 'Jueves',
                  friday: 'Viernes',
                  saturday: 'Sábado',
                  sunday: 'Domingo'
                };
                
                const isDayOpen = restaurantDetails?.opening_hours?.[day]?.open !== undefined;
                
                return (
                  <Grid container spacing={2} key={day} sx={{ mb: 2, alignItems: 'center' }}>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body1">
                        {dayNames[day]}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={3}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={isDayOpen}
                            onChange={(e) => {
                              // Lógica para abrir/cerrar el día
                              if (!e.target.checked) {
                                // Si se desmarca, eliminar horas
                                handleChangeSchedule(day, 'open', '');
                                handleChangeSchedule(day, 'close', '');
                              } else {
                                // Si se marca, poner horas por defecto
                                handleChangeSchedule(day, 'open', '12:00');
                                handleChangeSchedule(day, 'close', '23:00');
                              }
                            }}
                          />
                        }
                        label="Abierto"
                      />
                    </Grid>
                    
                    {isDayOpen && (
                      <>
                        <Grid item xs={6} sm={3}>
                          <TextField
                            fullWidth
                            label="Apertura"
                            type="time"
                            defaultValue={restaurantDetails?.opening_hours?.[day]?.open || "12:00"}
                            InputLabelProps={{ shrink: true }}
                            onChange={(e) => handleChangeSchedule(day, 'open', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <TextField
                            fullWidth
                            label="Cierre"
                            type="time"
                            defaultValue={restaurantDetails?.opening_hours?.[day]?.close || "23:00"}
                            InputLabelProps={{ shrink: true }}
                            onChange={(e) => handleChangeSchedule(day, 'close', e.target.value)}
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>
                );
              })}

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={() => {
                    // Guardar horarios
                    const updatedHours = {
                      opening_hours: restaurantDetails?.opening_hours
                    };
                    saveRestaurantMutation.mutate(updatedHours);
                  }}
                >
                  Guardar horarios
                </Button>
              </Box>
            </TabPanel>
          </>
        )}
      </Paper>

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

export default ConfigurationPage;