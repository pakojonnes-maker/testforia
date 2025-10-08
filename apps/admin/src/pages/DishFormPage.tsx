import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Container,
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  FormControl,
  FormLabel,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Switch,
  MenuItem,
  Autocomplete,
  Chip,
  Button,
  IconButton,
  Divider,
  Tabs,
  Tab,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Drawer,
  Tooltip,
  Avatar,
  Badge,
  Skeleton,
  AlertTitle,
  Collapse,
  Stack,
  Fade,
  Zoom,
  SwipeableDrawer,
  useScrollTrigger,
  Backdrop,
  Menu
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Language as LanguageIcon,
  Euro as EuroIcon,
  MenuBook as MenuBookIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Add as AddIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  PhotoCamera as PhotoCameraIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  VolumeOff as VolumeOffIcon,
  VolumeUp as VolumeUpIcon,
  PhotoLibrary as PhotoLibraryIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Edit as EditIcon,
  ErrorOutline as ErrorOutlineIcon,
  Info as InfoIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
} from '@mui/icons-material';

// Esquema de validación con Zod
const dishSchema = z.object({
  // Campos básicos
  status: z.enum(['active', 'out_of_stock', 'seasonal', 'hidden']),
  price: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  discount_price: z.number().min(0).nullable(),
  discount_active: z.boolean().default(false),
  is_vegetarian: z.boolean().default(false),
  is_vegan: z.boolean().default(false),
  is_gluten_free: z.boolean().default(false),
  is_new: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  
  // Traducciones
  translations: z.object({
    name: z.record(z.string(), z.string().min(1, 'El nombre es obligatorio')),
    description: z.record(z.string(), z.string())
  }),
  
  // Relaciones
  section_ids: z.array(z.string()).min(1, 'Selecciona al menos una sección'),
  allergen_ids: z.array(z.string()),
});

type DishFormData = z.infer<typeof dishSchema>;

export default function DishFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = user?.currentRestaurant?.id;
  const isEditMode = Boolean(id);
  
  // Theme y responsive
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMedium = useMediaQuery(theme.breakpoints.down('md'));
  
  // Estado para pestañas y UI
  const [tabIndex, setTabIndex] = useState(0);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [mediaPreviewDialogOpen, setMediaPreviewDialogOpen] = useState(false);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadType, setUploadType] = useState(''); // 'image' o 'video'
  const [isPrimaryMedia, setIsPrimaryMedia] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [availableLanguages] = useState(['es', 'en', 'fr', 'it', 'de']);
  const [activeLanguages, setActiveLanguages] = useState(['es', 'en']);
  
  // Estado para drag and drop de archivos
  const [isDragging, setIsDragging] = useState(false);
  
  // Referencias para videos
  const videoPreviewRef = React.useRef(null);

  // Componente VideoPlayer para reproducir videos con thumbnail
const VideoPlayer = React.memo(({ video, thumbnail, onError }) => {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef(null);

  // Manejo de interacción del video
  const togglePlay = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => {
          console.error("Error reproduciendo video:", err);
          onError?.(err);
        });
      }
      setPlaying(!playing);
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  return (
    <Card sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: 3 }}>
      <Box sx={{ position: 'relative', bgcolor: '#000', aspectRatio: '9/16', maxHeight: 500 }}>
        {/* Contenedor del video */}
        <Box sx={{ height: '100%', width: '100%' }}>
          {playing ? (
            <Box
              component="video"
              ref={videoRef}
              src={video.url}
              autoPlay
              muted={muted}
              loop
              onError={onError}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                bgcolor: 'black',
              }}
            />
          ) : (
            <Box
              component="img"
              src={thumbnail?.url || '/placeholder-thumbnail.jpg'}
              alt="Video thumbnail"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.3s ease',
                filter: 'brightness(0.85)',
                '&:hover': {
                  transform: 'scale(1.02)',
                  filter: 'brightness(1)',
                }
              }}
              onError={(e) => {
                console.warn("Error loading thumbnail");
                e.target.style.opacity = '0.5';
                e.target.style.backgroundColor = '#121212';
              }}
            />
          )}
        </Box>

        {/* Controles de video superpuestos */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: playing ? 'transparent' : 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
          }}
          onClick={togglePlay}
        >
          {/* Botón central de reproducción */}
          <IconButton
  sx={{
    color: 'white',
    bgcolor: playing ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.5)',
    transition: 'all 0.2s',
    p: 1.5,
    opacity: playing ? 0 : 1,
    '&:hover': {
      bgcolor: 'rgba(0,0,0,0.7)',
      transform: 'scale(1.1)',
      opacity: 1  // Combinamos todos los efectos hover en un solo bloque
    }
  }}
>
  {playing ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
</IconButton>
        </Box>

        {/* Barra inferior con controles secundarios */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            p: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            opacity: playing ? 1 : 0,
            transition: 'opacity 0.3s ease',
            '&:hover': {
              opacity: 1
            }
          }}
        >
          <Chip
            label="VIDEO"
            color="error"
            size="small"
            sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}
          />
          
          <IconButton
            size="small"
            onClick={toggleMute}
            sx={{ color: 'white' }}
          >
            {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
          </IconButton>
        </Box>
      </Box>

      <CardContent sx={{ py: 1.5 }}>
        <Typography variant="body2" noWrap>
          {video.display_name || 'Video principal'}
        </Typography>
      </CardContent>
    </Card>
  );
});

  // Consultas para cargar datos
  const { 
    data: dish, 
    isLoading: isLoadingDish,
    error: dishError,
    refetch: refetchDish
  } = useQuery({
    queryKey: ['dish', id],
    queryFn: () => apiClient.getDish(id),
    enabled: isEditMode && !!restaurantId,
  });

  const { 
    data: sections = [], 
    isLoading: isLoadingSections 
  } = useQuery({
    queryKey: ['sections', restaurantId],
    queryFn: () => apiClient.getSections(restaurantId),
    enabled: !!restaurantId,
  });

  const { 
    data: allergens = [], 
    isLoading: isLoadingAllergens 
  } = useQuery({
    queryKey: ['allergens'],
    queryFn: () => apiClient.getAllergens(),
  });

  // Consulta para medios del plato (separada para mejor gestión)
  const { 
    data: dishMedia = [],
    isLoading: isLoadingMedia,
    refetch: refetchMedia
  } = useQuery({
    queryKey: ['dish-media', id],
    queryFn: () => apiClient.getDishMedia(id),
    enabled: isEditMode && !!id,
  });

  // Agrupar medios por tipo
  const mediaSorted = useMemo(() => {
    if (!Array.isArray(dishMedia)) return { videos: [], images: [] };
    
    return {
      videos: dishMedia.filter(m => m.media_type === 'video'),
      images: dishMedia.filter(m => m.media_type === 'image')
    };
  }, [dishMedia]);
  
  // Obtener imagen principal y video principal
  const primaryMedia = useMemo(() => {
    if (!Array.isArray(dishMedia)) return { primaryVideo: null, primaryImage: null };
    
    return {
      primaryVideo: dishMedia.find(m => m.role === 'PRIMARY_VIDEO' || (m.is_primary && m.media_type === 'video')),
      primaryImage: dishMedia.find(m => m.role === 'PRIMARY_IMAGE' || (m.is_primary && m.media_type === 'image'))
    };
  }, [dishMedia]);

  // Setup del formulario con React Hook Form
  const { 
    control, 
    handleSubmit, 
    reset, 
    setValue, 
    watch,
    formState: { errors, isDirty, isSubmitting } 
  } = useForm<DishFormData>({
    resolver: zodResolver(dishSchema),
    defaultValues: {
      status: 'active',
      price: 0,
      discount_price: null,
      discount_active: false,
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: false,
      is_new: false,
      is_featured: false,
      translations: {
        name: { es: '', en: '' },
        description: { es: '', en: '' }
      },
      section_ids: [],
      allergen_ids: [],
    }
  });

  // Cuando el plato se carga (en modo edición), actualizar el formulario
  useEffect(() => {
    if (dish && isEditMode) {
      // Mapear el plato a los valores del formulario
      setValue('status', dish.status);
      setValue('price', dish.price);
      setValue('discount_price', dish.discount_price);
      setValue('discount_active', dish.discount_active);
      setValue('is_vegetarian', dish.is_vegetarian);
      setValue('is_vegan', dish.is_vegan);
      setValue('is_gluten_free', dish.is_gluten_free);
      setValue('is_new', dish.is_new);
      setValue('is_featured', dish.is_featured);
      setValue('translations', dish.translations);
      setValue('section_ids', dish.section_ids || []);
      setValue('allergen_ids', dish.allergens?.map(a => a.id) || []);
      
      // Actualizar idiomas activos basados en traducciones disponibles
      if (dish.translations?.name) {
        setActiveLanguages(Object.keys(dish.translations.name));
      }
    }
  }, [dish, isEditMode, setValue]);

  // Mutación para guardar el plato
  const saveMutation = useMutation({
    mutationFn: (data: DishFormData) => {
      const dishData = {
        ...data,
        restaurant_id: restaurantId
      };

      if (isEditMode) {
        return apiClient.updateDish(id, dishData);
      } else {
        return apiClient.createDish(dishData);
      }
    },
    onSuccess: (response) => {
      // Invalidar consultas para actualizar datos
      queryClient.invalidateQueries({ queryKey: ['dishes', restaurantId] });
      if (isEditMode) {
        queryClient.invalidateQueries({ queryKey: ['dish', id] });
      }
      
      // Mostrar mensaje de éxito
      setSnackbar({
        open: true,
        message: isEditMode ? 'Plato actualizado correctamente' : 'Plato creado correctamente',
        severity: 'success'
      });
      
      // Si es nuevo plato, redirigir a la lista o al detalle del nuevo plato
      if (!isEditMode && response?.dishId) {
        navigate(`/dishes/${response.dishId}`);
      }
    },
    onError: (error) => {
      console.error('Error al guardar:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error?.response?.data?.message || 'Error desconocido'}`,
        severity: 'error'
      });
    }
  });

  // Mutación para eliminar el plato
  const deleteMutation = useMutation({
    mutationFn: () => {
      return apiClient.deleteDish(id, restaurantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes', restaurantId] });
      setSnackbar({
        open: true,
        message: 'Plato eliminado correctamente',
        severity: 'success'
      });
      navigate('/dishes');
    },
    onError: (error) => {
      console.error('Error al eliminar:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error?.response?.data?.message || 'Error desconocido'}`,
        severity: 'error'
      });
    }
  });
  
  // Mutación para subir un medio
  const uploadMediaMutation = useMutation({
    mutationFn: ({ file, isPrimary }: { file: File, isPrimary: boolean }) => {
      // Determinar el tipo de rol en base al tipo de archivo y si es principal
      const isVideo = file.type.startsWith('video/');
      let role = 'GALLERY_IMAGE'; // Valor por defecto
      
      if (isPrimary) {
        role = isVideo ? 'PRIMARY_VIDEO' : 'PRIMARY_IMAGE';
      }
      
      return apiClient.uploadMedia(id, file, role, 0);
    },
    onSuccess: (data) => {
      // Actualizar la lista de medios
      queryClient.invalidateQueries({ queryKey: ['dish-media', id] });
      
      setSnackbar({
        open: true,
        message: 'Archivo subido correctamente',
        severity: 'success'
      });
      
      setMediaDialogOpen(false);
      setUploadFile(null);
      setIsPrimaryMedia(false);
    },
    onError: (error) => {
      console.error('Error al subir el archivo:', error);
      setSnackbar({
        open: true,
        message: `Error al subir el archivo: ${error?.message || 'Error desconocido'}`,
        severity: 'error'
      });
    }
  });
  
  // Mutación para actualizar el rol de un medio (principal/galería)
  const updateMediaRoleMutation = useMutation({
    mutationFn: ({ mediaId, role }: { mediaId: string, role: string }) => {
      return apiClient.updateMediaRole(mediaId, id, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dish-media', id] });
      setSnackbar({
        open: true,
        message: 'Medio actualizado correctamente',
        severity: 'success'
      });
    },
    onError: (error) => {
      console.error('Error al actualizar el rol del medio:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error?.message || 'Error desconocido'}`,
        severity: 'error'
      });
    }
  });
  
  // Mutación para eliminar un medio
  const deleteMediaMutation = useMutation({
    mutationFn: (mediaId: string) => {
      return apiClient.deleteMedia(mediaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dish-media', id] });
      setSnackbar({
        open: true,
        message: 'Medio eliminado correctamente',
        severity: 'success'
      });
      
      // Cerrar el diálogo si está abierto
      setMediaPreviewDialogOpen(false);
      setSelectedMedia(null);
    },
    onError: (error) => {
      console.error('Error al eliminar el medio:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error?.message || 'Error desconocido'}`,
        severity: 'error'
      });
    }
  });

  const handleSaveDish = (data: DishFormData) => {
    saveMutation.mutate(data);
  };

  const handleDeleteDish = () => {
    setConfirmDeleteDialogOpen(false);
    deleteMutation.mutate();
  };

  const handleAddMedia = () => {
    if (uploadFile) {
      uploadMediaMutation.mutate({ 
        file: uploadFile, 
        isPrimary: isPrimaryMedia 
      });
    }
  };
  
  const handleSetPrimaryMedia = (media) => {
    if (!media || !media.id) return;
    
    const isVideo = media.media_type === 'video';
    const role = isVideo ? 'PRIMARY_VIDEO' : 'PRIMARY_IMAGE';
    
    updateMediaRoleMutation.mutate({ 
      mediaId: media.id, 
      role 
    });
  };
  
  const handleDeleteMedia = (media) => {
    if (!media || !media.id) return;
    
    deleteMediaMutation.mutate(media.id);
  };

  const handleAddLanguage = (lang: string) => {
    if (!activeLanguages.includes(lang)) {
      setActiveLanguages([...activeLanguages, lang]);
    }
  };

  const handleRemoveLanguage = (lang: string) => {
    // No permitir eliminar el idioma principal (español)
    if (lang === 'es') return;
    setActiveLanguages(activeLanguages.filter(l => l !== lang));
  };
  
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setUploadFile(file);
    
    // Determinar tipo de archivo
    if (file.type.startsWith('video/')) {
      setUploadType('video');
    } else if (file.type.startsWith('image/')) {
      setUploadType('image');
    }
  };
  
  const handleFileDrop = useCallback((event) => {
    event.preventDefault();
    setIsDragging(false);
    
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      
      setUploadFile(file);
      
      if (file.type.startsWith('video/')) {
        setUploadType('video');
      } else if (file.type.startsWith('image/')) {
        setUploadType('image');
      }
    }
  }, []);
  
  const handlePreviewMedia = (media) => {
    setSelectedMedia(media);
    setMediaPreviewDialogOpen(true);
    
    // Reset player state
    setIsPlayingVideo(false);
    setIsMuted(true);
  };
  
  const toggleVideoPlay = () => {
    if (!videoPreviewRef.current) return;
    
    if (isPlayingVideo) {
      videoPreviewRef.current.pause();
    } else {
      videoPreviewRef.current.play();
    }
    
    setIsPlayingVideo(!isPlayingVideo);
  };
  
  const toggleMute = () => {
    if (!videoPreviewRef.current) return;
    
    videoPreviewRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Estados de carga y error
  if (isLoadingDish || isLoadingSections || isLoadingAllergens) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/dishes')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            {isEditMode ? 'Cargando plato...' : 'Nuevo plato'}
          </Typography>
        </Box>
        <LinearProgress />
      </Container>
    );
  }

  if (dishError && isEditMode) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error al cargar el plato. Por favor, inténtalo de nuevo.
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dishes')}
        >
          Volver a platos
        </Button>
      </Container>
    );
  }

  // Mapeo de códigos de idioma a nombres
  const languageNames: Record<string, string> = {
    es: 'Español',
    en: 'Inglés',
    fr: 'Francés',
    it: 'Italiano',
    de: 'Alemán',
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/dishes')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h1" sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
            {isEditMode ? 'Editar plato' : 'Nuevo plato'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isEditMode && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setConfirmDeleteDialogOpen(true)}
              disabled={deleteMutation.isPending}
              size={isMobile ? "small" : "medium"}
            >
              {isMobile ? '' : 'Eliminar'}
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSubmit(handleSaveDish)}
            disabled={saveMutation.isPending}
            size={isMobile ? "small" : "medium"}
          >
            {saveMutation.isPending ? 'Guardando...' : (isMobile ? 'Guardar' : 'Guardar cambios')}
          </Button>
        </Box>
      </Box>

      {/* Tabs - Mejor adaptado para móvil */}
      <Paper sx={{ mb: 2, overflow: 'hidden', borderRadius: { xs: 1, sm: 2 } }}>
        <Tabs 
          value={tabIndex} 
          onChange={(_, newValue) => setTabIndex(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="dish form tabs"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            '& .MuiTab-root': {
              minHeight: { xs: 48, sm: 64 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' }
            }
          }}
        >
          <Tab 
            label="General" 
            icon={<MenuBookIcon />} 
            iconPosition={isMobile ? "top" : "start"} 
          />
          <Tab 
            label="Multimedia" 
            icon={<ImageIcon />} 
            iconPosition={isMobile ? "top" : "start"}
            sx={{ 
              '& .MuiBadge-root': { right: -8 } 
            }}
          />
          <Tab 
            label="Traducciones" 
            icon={<LanguageIcon />} 
            iconPosition={isMobile ? "top" : "start"} 
          />
          <Tab 
            label="Precios" 
            icon={<EuroIcon />} 
            iconPosition={isMobile ? "top" : "start"} 
          />
        </Tabs>
      </Paper>

      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4, borderRadius: { xs: 1, sm: 2 } }}>
        {/* Contenido pestaña GENERAL */}
        <Box hidden={tabIndex !== 0}>
          <Grid container spacing={2}>
            {/* Estado del plato */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.status}>
                    <FormLabel sx={{ mb: 1, fontWeight: 'medium' }}>Estado del plato</FormLabel>
                    <TextField
                      select
                      {...field}
                      variant="outlined"
                      fullWidth
                      error={!!errors.status}
                      helperText={errors.status?.message}
                      size={isMobile ? "small" : "medium"}
                    >
                      <MenuItem value="active">Activo</MenuItem>
                      <MenuItem value="out_of_stock">Agotado</MenuItem>
                      <MenuItem value="seasonal">De temporada</MenuItem>
                      <MenuItem value="hidden">Oculto</MenuItem>
                    </TextField>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Secciones */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="section_ids"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.section_ids}>
                    <FormLabel sx={{ mb: 1, fontWeight: 'medium' }}>Secciones</FormLabel>
                    <Autocomplete
                      multiple
                      size={isMobile ? "small" : "medium"}
                      options={sections}
                      getOptionLabel={(option) => option.translations?.name?.es || 'Sin nombre'}
                      value={sections.filter(section => field.value.includes(section.id))}
                      onChange={(_, newValue) => {
                        field.onChange(newValue.map(item => item.id));
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="outlined"
                          error={!!errors.section_ids}
                          helperText={errors.section_ids?.message}
                          placeholder="Selecciona secciones"
                        />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                          const tagProps = getTagProps({ index });
                          const { key, ...chipProps } = tagProps;
                          return (
                            <Chip
                              key={key}
                              label={option.translations?.name?.es || 'Sin nombre'}
                              {...chipProps}
                              size="small"
                            />
                          );
                        })
                      }
                      limitTags={isMobile ? 1 : 2}
                    />
                  </FormControl>
                )}
              />
            </Grid>

            {/* Nombre en español (siempre visible) */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="translations.name.es"
                control={control}
                rules={{ required: 'El nombre en español es obligatorio' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nombre (Español)"
                    variant="outlined"
                    fullWidth
                    required
                    size={isMobile ? "small" : "medium"}
                    error={!!errors.translations?.name?.es}
                    helperText={errors.translations?.name?.es?.message}
                  />
                )}
              />
            </Grid>

            {/* Descripción en español */}
            <Grid item xs={12}>
              <Controller
                name="translations.description.es"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Descripción (Español)"
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={isMobile ? 3 : 4}
                    size={isMobile ? "small" : "medium"}
                    error={!!errors.translations?.description?.es}
                    helperText={errors.translations?.description?.es?.message}
                    placeholder="Añade una descripción detallada del plato"
                  />
                )}
              />
            </Grid>

            {/* Switches para características - ahora con iconos y mejor espaciado */}
            <Grid item xs={12}>
              <FormControl component="fieldset" variant="standard" sx={{ width: '100%' }}>
                <FormLabel component="legend" sx={{ mb: 1, fontWeight: 'medium' }}>
                  Características
                </FormLabel>
                <Box sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 1, 
                  border: '1px solid', 
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2
                }}>
                  <Controller
                    name="is_vegetarian"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={field.value} 
                            onChange={(e) => field.onChange(e.target.checked)}
                            color="success"
                          />
                        }
                        label="Vegetariano"
                        sx={{ 
                          border: field.value ? '1px solid' : 'none',
borderColor: field.value ? 'success.light' : 'transparent',
                          borderRadius: 1,
                          px: field.value ? 1 : 0,
                          transition: 'all 0.2s',
                          background: field.value ? 'rgba(76, 175, 80, 0.08)' : 'transparent'
                        }}
                      />
                    )}
                  />
                  <Controller
                    name="is_vegan"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={field.value} 
                            onChange={(e) => field.onChange(e.target.checked)}
                            color="success"
                          />
                        }
                        label="Vegano"
                        sx={{ 
                          border: field.value ? '1px solid' : 'none',
                          borderColor: field.value ? 'success.light' : 'transparent',
                          borderRadius: 1,
                          px: field.value ? 1 : 0,
                          transition: 'all 0.2s',
                          background: field.value ? 'rgba(76, 175, 80, 0.08)' : 'transparent'
                        }}
                      />
                    )}
                  />
                  <Controller
                    name="is_gluten_free"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={field.value} 
                            onChange={(e) => field.onChange(e.target.checked)}
                            color="info"
                          />
                        }
                        label="Sin gluten"
                        sx={{ 
                          border: field.value ? '1px solid' : 'none',
                          borderColor: field.value ? 'info.light' : 'transparent',
                          borderRadius: 1,
                          px: field.value ? 1 : 0,
                          transition: 'all 0.2s',
                          background: field.value ? 'rgba(33, 150, 243, 0.08)' : 'transparent'
                        }}
                      />
                    )}
                  />
                  <Controller
                    name="is_new"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={field.value} 
                            onChange={(e) => field.onChange(e.target.checked)}
                            color="secondary"
                          />
                        }
                        label="Nuevo"
                        sx={{ 
                          border: field.value ? '1px solid' : 'none',
                          borderColor: field.value ? 'secondary.light' : 'transparent',
                          borderRadius: 1,
                          px: field.value ? 1 : 0,
                          transition: 'all 0.2s',
                          background: field.value ? 'rgba(156, 39, 176, 0.08)' : 'transparent'
                        }}
                      />
                    )}
                  />
                  <Controller
                    name="is_featured"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={field.value} 
                            onChange={(e) => field.onChange(e.target.checked)}
                            color="warning"
                          />
                        }
                        label="Destacado"
                        sx={{ 
                          border: field.value ? '1px solid' : 'none',
                          borderColor: field.value ? 'warning.light' : 'transparent',
                          borderRadius: 1,
                          px: field.value ? 1 : 0,
                          transition: 'all 0.2s',
                          background: field.value ? 'rgba(255, 152, 0, 0.08)' : 'transparent'
                        }}
                      />
                    )}
                  />
                </Box>
              </FormControl>
            </Grid>

            {/* Alérgenos - Completamente rediseñado para mejor visualización */}
            <Grid item xs={12}>
              <Controller
                name="allergen_ids"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.allergen_ids}>
                    <FormLabel sx={{ mb: 1, fontWeight: 'medium' }}>Alérgenos</FormLabel>
                    <Autocomplete
                      multiple
                      size={isMobile ? "small" : "medium"}
                      options={allergens}
                      getOptionLabel={(option) => option.translations?.name?.es || 'Sin nombre'}
                      value={allergens.filter(allergen => field.value.includes(allergen.id))}
                      onChange={(_, newValue) => {
                        field.onChange(newValue.map(item => item.id));
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="outlined"
                          placeholder="Selecciona alérgenos"
                          error={!!errors.allergen_ids}
                          helperText={errors.allergen_ids?.message}
                        />
                      )}
                      renderOption={(props, option) => (
                        <MenuItem {...props}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar 
                              src={option.icon_url} 
                              alt={option.translations?.name?.es || 'Sin nombre'} 
                              sx={{ width: 28, height: 28 }}
                              variant="rounded"
                            >
                              {option.translations?.name?.es?.charAt(0) || '?'}
                            </Avatar>
                            <Typography variant="body2">
                              {option.translations?.name?.es || 'Sin nombre'}
                            </Typography>
                          </Box>
                        </MenuItem>
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                          const tagProps = getTagProps({ index });
                          const { key, ...chipProps } = tagProps;
                          return (
                            <Chip
                              key={key}
                              avatar={
                                <Avatar 
                                  src={option.icon_url} 
                                  alt={option.translations?.name?.es || '?'}
                                >
                                  {option.translations?.name?.es?.charAt(0) || '?'}
                                </Avatar>
                              }
                              label={option.translations?.name?.es || 'Sin nombre'}
                              {...chipProps}
                              size="small"
                            />
                          );
                        })
                      }
                      limitTags={isMobile ? 2 : 5}
                    />
                  </FormControl>
                )}
              />
              {/* Previsualización de alérgenos seleccionados */}
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                {watch('allergen_ids').length > 0 && (
                  <Typography variant="caption" sx={{ width: '100%', color: 'text.secondary', mb: 1 }}>
                    Alérgenos seleccionados:
                  </Typography>
                )}
                {allergens
                  .filter(allergen => watch('allergen_ids').includes(allergen.id))
                  .map((allergen) => (
                    <Tooltip key={allergen.id} title={allergen.translations?.name?.es || 'Sin nombre'}>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 0.5
                        }}
                      >
                        <Avatar
                          src={allergen.icon_url}
                          alt={allergen.translations?.name?.es || 'Sin nombre'}
                          sx={{ width: 40, height: 40 }}
                          variant="rounded"
                        >
                          {allergen.translations?.name?.es?.charAt(0) || '?'}
                        </Avatar>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', textAlign: 'center' }}>
                          {allergen.translations?.name?.es || 'Sin nombre'}
                        </Typography>
                      </Box>
                    </Tooltip>
                  ))}
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Contenido pestaña MULTIMEDIA - Completamente renovado */}
        <Box hidden={tabIndex !== 1}>
          {/* Panel superior con botón de añadir y estadísticas */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: 1,
            mb: 3 
          }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                Multimedia del plato
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isEditMode ? (
                  mediaSorted.videos.length > 0 || mediaSorted.images.length > 0 ? (
                    <>
                      {mediaSorted.videos.length} {mediaSorted.videos.length === 1 ? 'video' : 'videos'} y{' '}
                      {mediaSorted.images.length} {mediaSorted.images.length === 1 ? 'imagen' : 'imágenes'}
                    </>
                  ) : (
                    'No hay archivos multimedia'
                  )
                ) : (
                  'Podrás añadir archivos después de crear el plato'
                )}
              </Typography>
            </Box>
            {isEditMode && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setMediaDialogOpen(true)}
                sx={{ 
                  borderRadius: 8,
                  px: 2.5,
                  py: isMobile ? 1 : 1.2,
                  boxShadow: 2
                }}
              >
                Añadir medio
              </Button>
            )}
          </Box>
          
          {/* Contenedor principal de multimedia con secciones */}
          {isEditMode ? (
            <Box>
              {/* Video principal */}
{/* Video principal con reproductor interactivo */}
<Box sx={{ mb: 4 }}>
  <Typography variant="subtitle1" sx={{ 
    mb: 2, 
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 1
  }}>
    <VideoIcon color="error" fontSize="small" />
    Video principal
  </Typography>
  
  {isLoadingMedia ? (
    <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
  ) : primaryMedia.primaryVideo ? (
    <VideoPlayer
      video={primaryMedia.primaryVideo}
      thumbnail={primaryMedia.primaryImage}
      onError={() => {
        setSnackbar({
          open: true,
          message: 'Error al reproducir el video',
          severity: 'error'
        });
      }}
    />
  ) : (
    <Paper
      sx={{
        height: 180,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: 'divider',
        bgcolor: 'background.default',
        p: 3,
        gap: 2,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          bgcolor: 'action.hover',
          borderColor: 'primary.light'
        }
      }}
      onClick={() => {
        setMediaDialogOpen(true);
        setIsPrimaryMedia(true);
        setUploadType('video');
      }}
    >
      <VideoIcon color="action" sx={{ fontSize: 40, opacity: 0.5 }} />
      <Typography align="center" color="text.secondary">
        No hay video principal.
        <Box component="span" display="block">
          Haz clic para añadir uno.
        </Box>
      </Typography>
    </Paper>
  )}
  
  {/* Alerta cuando hay video pero no thumbnail */}
  {primaryMedia.primaryVideo && !primaryMedia.primaryImage && (
    <Alert 
      severity="info" 
      sx={{ 
        mt: 1.5, 
        fontSize: '0.8rem', 
        py: 0.5,
        '& .MuiAlert-message': { width: '100%' }
      }}
      action={
        <Button 
          size="small" 
          onClick={() => {
            setMediaDialogOpen(true);
            setIsPrimaryMedia(true);
            setUploadType('image');
          }}
          sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
        >
          Añadir imagen
        </Button>
      }
    >
      Este video no tiene imagen de portada. Añade una para mejorar la experiencia.
    </Alert>
  )}
</Box> 
              
              {/* Imagen principal */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" sx={{ 
                  mb: 2, 
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <PhotoCameraIcon color="primary" fontSize="small" />
                  Imagen principal (thumbnail)
                </Typography>
                
                {isLoadingMedia ? (
                  <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
                ) : primaryMedia.primaryImage ? (
                  <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <Box sx={{ position: 'relative' }}>
                      <CardMedia
                        component="img"
                        height={isMobile ? 180 : 240}
                        image={primaryMedia.primaryImage.url}
                        alt="Imagen principal"
                        sx={{ objectFit: 'cover' }}
                      />
                      
                      {/* Indicador de imagen principal */}
                      <Chip
                        label="PRINCIPAL"
                        size="small"
                        color="primary"
                        sx={{
                          position: 'absolute',
                          top: 12,
                          left: 12,
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          textTransform: 'uppercase'
                        }}
                      />
                      
                      {/* Menú de acciones */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          display: 'flex',
                          gap: 1
                        }}
                      >
                        <Tooltip title="Eliminar imagen">
                          <IconButton
                            size="small"
                            sx={{
                              bgcolor: 'rgba(0, 0, 0, 0.5)',
                              '&:hover': { bgcolor: 'rgba(255, 0, 0, 0.7)' },
                              color: 'white'
                            }}
                            onClick={() => handleDeleteMedia(primaryMedia.primaryImage)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="body2" noWrap>
                        {primaryMedia.primaryImage.display_name || 'Imagen principal'}
                      </Typography>
                    </CardContent>
                  </Card>
                ) : (
                  <Paper
                    sx={{
                      height: 180,
                      borderRadius: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderStyle: 'dashed',
                      borderWidth: 2,
                      borderColor: 'divider',
                      bgcolor: 'background.default',
                      p: 3,
                      gap: 2
                    }}
                    onClick={() => setMediaDialogOpen(true)}
                  >
                    <PhotoCameraIcon color="action" sx={{ fontSize: 40, opacity: 0.5 }} />
                    <Typography align="center" color="text.secondary">
                      No hay imagen principal.
                      <Box component="span" display="block">
                        Haz clic para añadir una.
                      </Box>
                    </Typography>
                  </Paper>
                )}
              </Box>
              
              {/* Imágenes de galería */}
              {mediaSorted.images.length > 1 || mediaSorted.images.some(img => img.role === 'GALLERY_IMAGE') ? (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ 
                    mb: 2, 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <PhotoLibraryIcon color="info" fontSize="small" />
                    Galería de imágenes
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {mediaSorted.images
                      .filter(img => img.role === 'GALLERY_IMAGE' || (!img.is_primary && img.role !== 'PRIMARY_IMAGE'))
                      .map((image) => (
                        <Grid item xs={6} sm={4} md={3} key={image.id}>
                          <Card sx={{ borderRadius: 2, height: '100%' }}>
                            <Box sx={{ position: 'relative' }}>
                              <CardMedia
                                component="img"
                                height={140}
                                image={image.url}
                                alt={image.display_name}
                                sx={{ objectFit: 'cover' }}
                                onClick={() => handlePreviewMedia(image)}
                              />
                              
                              {/* Menú de acciones */}
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  display: 'flex',
                                  gap: 1
                                }}
                              >
                                <Tooltip title="Establecer como principal">
                                  <IconButton
                                    size="small"
                                    sx={{
                                      bgcolor: 'rgba(0, 0, 0, 0.5)',
                                      '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.7)' },
                                      color: 'white'
                                    }}
                                    onClick={() => handleSetPrimaryMedia(image)}
                                  >
                                    <StarIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Eliminar imagen">
                                  <IconButton
                                    size="small"
                                    sx={{
                                      bgcolor: 'rgba(0, 0, 0, 0.5)',
                                      '&:hover': { bgcolor: 'rgba(255, 0, 0, 0.7)' },
                                      color: 'white'
                                    }}
                                    onClick={() => handleDeleteMedia(image)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>
                            <CardContent sx={{ py: 1 }}>
                              <Typography variant="caption" noWrap>
                                {image.display_name || 'Imagen'}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    {/* Card para añadir más imágenes */}
                    <Grid item xs={6} sm={4} md={3}>
                      <Card 
                        sx={{ 
                          borderRadius: 2, 
                          height: '100%', 
                          display: 'flex', 
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderStyle: 'dashed',
                          borderWidth: 1,
                          borderColor: 'divider',
                          bgcolor: 'background.default',
                          cursor: 'pointer',
                          minHeight: 178
                        }}
                        onClick={() => setMediaDialogOpen(true)}
                      >
                        <CardContent sx={{ textAlign: 'center' }}>
                          <AddIcon sx={{ fontSize: 40, color: 'action.active', opacity: 0.6 }} />
                          <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                            Añadir imagen
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              ) : null}
              
              {/* Mensaje informativo */}
              {mediaSorted.videos.length === 0 && mediaSorted.images.length === 0 && (
                <Alert severity="info" sx={{ mt: 3 }}>
                  <AlertTitle>¿Por qué añadir medios?</AlertTitle>
                  <Typography variant="body2">
                    Las imágenes y videos permiten a los clientes ver el plato antes de pedirlo. Recomendamos:
                  </Typography>
                  <ul style={{ marginBottom: 0, paddingLeft: '1.5rem' }}>
                    <li><Typography variant="body2">Un video atractivo del plato (formato vertical 9:16)</Typography></li>
                    <li><Typography variant="body2">Una imagen principal que se usará como portada</Typography></li>
                    <li><Typography variant="body2">Imágenes adicionales que muestren diferentes ángulos</Typography></li>
                  </ul>
                </Alert>
              )}
            </Box>
          ) : (
            <Alert severity="info">
              Podrás añadir imágenes y videos después de crear el plato.
            </Alert>
          )}
        </Box>

        {/* Contenido pestaña TRADUCCIONES */}
        <Box hidden={tabIndex !== 2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {/* Selector de idiomas mejorado */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 1.5 }}>
                  Idiomas activos:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {activeLanguages.map(lang => (
                    <Chip 
                      key={lang}
                      label={languageNames[lang] || lang}
                      onDelete={lang === 'es' ? undefined : () => handleRemoveLanguage(lang)}
                      color={lang === 'es' ? 'primary' : 'default'}
                      sx={{
                        fontWeight: lang === 'es' ? 'bold' : 'normal',
                        px: 1
                      }}
                    />
                  ))}
                </Box>
              </Box>
              
              {/* Añadir idioma - más intuitivo */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Añadir otro idioma:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {availableLanguages
                    .filter(lang => !activeLanguages.includes(lang))
                    .map(lang => (
                      <Chip
                        key={lang}
                        label={languageNames[lang] || lang}
                        onClick={() => handleAddLanguage(lang)}
                        icon={<AddIcon />}
                        variant="outlined"
                        clickable
                        color="primary"
                      />
                    ))}
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />
{/* Traducciones por idioma (excepto español, que ya está en pestaña general) */}
              {activeLanguages.filter(lang => lang !== 'es').map(lang => (
                <Box key={lang} sx={{ mb: 4 }}>
                  <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, bgcolor: 'background.default' }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      mb: 2
                    }}>
                      <Typography variant="h6" sx={{ 
                        fontWeight: 600, 
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <Box 
                          component="span" 
                          sx={{ 
                            bgcolor: 'primary.main', 
                            color: 'white',
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.875rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {lang.toUpperCase()}
                        </Box>
                        {languageNames[lang] || lang}
                      </Typography>
                      
                      {lang !== 'es' && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveLanguage(lang)}
                          sx={{ ml: 'auto' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                    
                    <Grid container spacing={2}>
                      {/* Nombre */}
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name={`translations.name.${lang}`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label={`Nombre (${languageNames[lang]})`}
                              variant="outlined"
                              fullWidth
                              size={isMobile ? "small" : "medium"}
                              error={!!errors.translations?.name?.[lang]}
                              helperText={errors.translations?.name?.[lang]?.message}
                            />
                          )}
                        />
                      </Grid>
                      
                      {/* Descripción */}
                      <Grid item xs={12}>
                        <Controller
                          name={`translations.description.${lang}`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label={`Descripción (${languageNames[lang]})`}
                              variant="outlined"
                              fullWidth
                              multiline
                              rows={isMobile ? 3 : 4}
                              size={isMobile ? "small" : "medium"}
                              error={!!errors.translations?.description?.[lang]}
                              helperText={errors.translations?.description?.[lang]?.message}
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Box>
              ))}
              
              {/* Mensaje cuando no hay idiomas adicionales */}
              {activeLanguages.length <= 1 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <AlertTitle>¡Añade más idiomas!</AlertTitle>
                  <Typography variant="body2">
                    Añade traducciones para hacer tu menú accesible a clientes internacionales.
                    Selecciona los idiomas que quieras añadir de la lista superior.
                  </Typography>
                </Alert>
              )}
            </Grid>
          </Grid>
        </Box>

        {/* Contenido pestaña PRECIOS - Mejorado visualmente */}
        <Box hidden={tabIndex !== 3}>
          <Grid container spacing={3}>
            {/* Explicación sobre precios */}
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <AlertTitle>Configuración de precios</AlertTitle>
                <Typography variant="body2">
                  Establece el precio normal del plato y, opcionalmente, un precio con descuento. 
                  Los precios se mostrarán con el formato adecuado en la aplicación.
                </Typography>
              </Alert>
            </Grid>
            
            {/* Precio base - Diseño mejorado */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 2 }}>
                  Precio normal
                </Typography>
                <Controller
                  name="price"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Precio (€)"
                      type="number"
                      variant="outlined"
                      fullWidth
                      InputProps={{
                        startAdornment: <EuroIcon sx={{ color: 'action.active', mr: 1 }} />,
                      }}
                      error={!!errors.price}
                      helperText={errors.price?.message}
                      onChange={e => field.onChange(Number(e.target.value))}
                      size={isMobile ? "small" : "medium"}
                    />
                  )}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Este es el precio normal del plato, sin ningún descuento aplicado.
                </Typography>
              </Paper>
            </Grid>
            
            {/* Precio con descuento - Diseño mejorado */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 2, height: '100%', 
                position: 'relative',
                bgcolor: watch('discount_active') ? 'success.50' : undefined,
                borderColor: watch('discount_active') ? 'success.light' : undefined,
                borderWidth: watch('discount_active') ? 1 : undefined,
                borderStyle: watch('discount_active') ? 'solid' : undefined,
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    Precio con descuento
                  </Typography>
                  <Controller
                    name="discount_active"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={field.value} 
                            onChange={(e) => field.onChange(e.target.checked)}
                            color="success"
                          />
                        }
                        label={field.value ? "Activo" : "Inactivo"}
                        sx={{ m: 0 }}
                      />
                    )}
                  />
                </Box>
                
                <Controller
                  name="discount_price"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Precio con descuento (€)"
                      type="number"
                      variant="outlined"
                      fullWidth
                      InputProps={{
                        startAdornment: <EuroIcon sx={{ color: 'action.active', mr: 1 }} />,
                      }}
                      error={!!errors.discount_price}
                      helperText={errors.discount_price?.message}
                      disabled={!watch('discount_active')}
                      onChange={e => {
                        const value = e.target.value !== "" ? Number(e.target.value) : null;
                        field.onChange(value);
                      }}
                      size={isMobile ? "small" : "medium"}
                    />
                  )}
                />
                
                {/* Cálculo de porcentaje de descuento */}
                {watch('discount_active') && watch('price') > 0 && watch('discount_price') !== null && (
                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                    <Chip 
                      label={`${Math.round((1 - (watch('discount_price') / watch('price'))) * 100)}% de descuento`}
                      color="success"
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      {watch('price')}€ → {watch('discount_price')}€
                    </Typography>
                  </Box>
                )}
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {watch('discount_active') 
                    ? 'El precio con descuento se mostrará como precio principal en la aplicación.'
                    : 'Activa esta opción para añadir un precio con descuento.'
                  }
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Diálogo para subir multimedia - Diseño moderno con drag and drop */}
      <Dialog open={mediaDialogOpen} onClose={() => setMediaDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          pb: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AddIcon sx={{ mr: 1 }} />
            Añadir multimedia
          </Box>
          <IconButton edge="end" color="inherit" onClick={() => setMediaDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" paragraph>
            Selecciona una imagen o video para el plato. Recomendamos usar archivos en formato vertical (9:16) para una mejor visualización.
          </Typography>
          
          {/* Area de arrastrar y soltar */}
          <Box 
            sx={{ 
              border: '2px dashed', 
              borderColor: isDragging ? 'primary.main' : 'divider', 
              borderRadius: 2, 
              p: 4, 
              textAlign: 'center',
              mb: 3,
              bgcolor: isDragging ? 'primary.50' : 'background.default',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => document.getElementById('upload-media-file').click()}
          >
            <input
              accept="image/*,video/*"
              style={{ display: 'none' }}
              id="upload-media-file"
              type="file"
              onChange={handleFileChange}
            />
            
            <CloudUploadIcon sx={{ fontSize: 48, color: isDragging ? 'primary.main' : 'text.secondary', mb: 2 }} />
            
            <Typography variant="body1" gutterBottom>
              {isDragging ? 'Suelta para subir' : 'Arrastra un archivo aquí o haz clic para seleccionar'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Formatos aceptados: JPG, PNG, GIF, MP4, MOV (máx. 10MB)
            </Typography>
          </Box>
          
          {/* Vista previa del archivo seleccionado */}
          {uploadFile && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Archivo seleccionado:
              </Typography>
              <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2 }}>
                {uploadType === 'video' ? (
                  <VideoIcon fontSize="large" color="error" />
                ) : (
                  <ImageIcon fontSize="large" color="primary" />
                )}
                
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" noWrap>
                    {uploadFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(uploadFile.size / 1024 / 1024).toFixed(2)} MB • {uploadType === 'video' ? 'Video' : 'Imagen'}
                  </Typography>
                </Box>
                
                <IconButton size="small" onClick={() => {
                  setUploadFile(null);
                  setUploadType('');
                }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Paper>
            </Box>
          )}
          
          {/* Opción para establecer como medio principal */}
          <FormControlLabel
            control={
              <Switch 
                checked={isPrimaryMedia} 
                onChange={(e) => setIsPrimaryMedia(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                Establecer como {uploadType === 'video' ? 'video principal' : 'imagen principal'}
                {uploadType && (
                  <Tooltip title={`Este será el ${uploadType} principal del plato`}>
                    <InfoIcon fontSize="small" color="action" />
                  </Tooltip>
                )}
              </Box>
            }
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setMediaDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleAddMedia}
            disabled={!uploadFile || uploadMediaMutation.isPending}
            startIcon={uploadMediaMutation.isPending ? <CircularProgress size={20} /> : null}
          >
            {uploadMediaMutation.isPending ? 'Subiendo...' : 'Subir'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo para previsualizar medios */}
      <Dialog 
        open={mediaPreviewDialogOpen} 
        onClose={() => setMediaPreviewDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        {selectedMedia && (
          <>
            <DialogTitle sx={{ 
              pb: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: '80%' }}>
                {selectedMedia.media_type === 'video' ? (
                  <VideoIcon color="error" />
                ) : (
                  <ImageIcon color="primary" />
                )}
                <Typography variant="h6" noWrap>
                  {selectedMedia.display_name || 'Vista previa'}
                </Typography>
              </Box>
              <IconButton edge="end" color="inherit" onClick={() => setMediaPreviewDialogOpen(false)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ py: 2 }}>
             {/* Vista previa del medio */}
<Box sx={{ mb: 3, position: 'relative', borderRadius: 2, overflow: 'hidden' }}>
  {selectedMedia.media_type === 'video' ? (
    <Box sx={{ position: 'relative', bgcolor: '#000' }}>
      <Box
        component="video"
        ref={videoPreviewRef}
        src={selectedMedia.url}
        controls={false}
        muted={isMuted}
        loop
        sx={{
          width: '100%',
          maxHeight: 500,
          objectFit: 'contain',
          borderRadius: 2
        }}
      />
      
      {/* Controles personalizados */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
        }}
      >
        <IconButton
          color="inherit"
          onClick={toggleVideoPlay}
          sx={{ color: 'white' }}
        >
          {isPlayingVideo ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        
        <IconButton
          color="inherit"
          onClick={toggleMute}
          sx={{ color: 'white' }}
        >
          {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </IconButton>
      </Box>
    </Box>
  ) : (
                  <Box
                    component="img"
                    src={selectedMedia.url}
                    alt={selectedMedia.display_name}
                    sx={{
                      width: '100%',
                      maxHeight: 500,
                      objectFit: 'contain',
                      borderRadius: 2,
                      boxShadow: 1
                    }}
                  />
                )}
              </Box>
              
              {/* Detalles y opciones */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Detalles
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Tipo:
                      </Typography>
                      <Typography variant="body2">
                        {selectedMedia.media_type === 'video' ? 'Video' : 'Imagen'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Rol:
                      </Typography>
                      <Chip 
                        label={selectedMedia.role?.replace('PRIMARY_', 'Principal ').replace('_', ' ') || 'Galería'} 
                        size="small"
                        color={
                          selectedMedia.role === 'PRIMARY_VIDEO' ? 'error' : 
                          selectedMedia.role === 'PRIMARY_IMAGE' ? 'primary' : 'default'
                        }
                      />
                    </Box>
                    {selectedMedia.width && selectedMedia.height && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Dimensiones:
                        </Typography>
                        <Typography variant="body2">
                          {selectedMedia.width} x {selectedMedia.height}
                        </Typography>
                      </Box>
                    )}
                    {selectedMedia.media_type === 'video' && selectedMedia.duration && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Duración:
                        </Typography>
                        <Typography variant="body2">
                          {Math.floor(selectedMedia.duration / 1000)} segundos
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Acciones
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {selectedMedia.media_type === 'video' && selectedMedia.role !== 'PRIMARY_VIDEO' && (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<VideoIcon />}
                        size="small"
                        onClick={() => {
                          handleSetPrimaryMedia(selectedMedia);
                          setMediaPreviewDialogOpen(false);
                        }}
                      >
                        Establecer como video principal
                      </Button>
                    )}
                    {selectedMedia.media_type === 'image' && selectedMedia.role !== 'PRIMARY_IMAGE' && (
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<PhotoCameraIcon />}
                        size="small"
                        onClick={() => {
                          handleSetPrimaryMedia(selectedMedia);
                          setMediaPreviewDialogOpen(false);
                        }}
                      >
                        Establecer como imagen principal
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      size="small"
                      onClick={() => {
                        handleDeleteMedia(selectedMedia);
                        setMediaPreviewDialogOpen(false);
                      }}
                    >
                      Eliminar {selectedMedia.media_type === 'video' ? 'video' : 'imagen'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={() => setMediaPreviewDialogOpen(false)}>
                Cerrar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Diálogo de confirmación para eliminar */}
      <Dialog 
        open={confirmDeleteDialogOpen} 
        onClose={() => setConfirmDeleteDialogOpen(false)}
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          display: 'flex', 
          alignItems: 'center',
          gap: 1
        }}>
          <WarningIcon color="warning" />
          Confirmar eliminación
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography paragraph>
            ¿Estás seguro de que quieres eliminar este plato?
          </Typography>
          <Typography variant="body2" color="error">
            Esta acción no se puede deshacer y eliminará todas las imágenes y videos asociados.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setConfirmDeleteDialogOpen(false)}
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeleteDish}
            disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
          >
            {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para mensajes de éxito/error */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity === 'success' ? 'success' : 'error'}
          sx={{ width: '100%', boxShadow: 3 }}
          icon={snackbar.severity === 'success' ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}