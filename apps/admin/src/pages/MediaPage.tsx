// apps/admin/src/components/media/MediaPage.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import VideoThumbnailPlaceholder from '../components/media/VideoThumbnailPlaceholder';
import { apiClient } from '../lib/apiClient';
import type { DishMedia } from '@visualtaste/api';
import { 
  Container, Typography, Grid, Paper, Box, Card, CardMedia, 
  CardContent, CardActions, Button, TextField, Dialog, 
  DialogTitle, DialogContent, DialogActions, LinearProgress, 
  IconButton, FormControl, InputLabel, Select, MenuItem, Chip, 
  Tabs, Tab, Tooltip, CircularProgress, Alert, AlertTitle, Snackbar, 
  Checkbox, FormControlLabel, Divider, useTheme, useMediaQuery,
  ToggleButtonGroup, ToggleButton, Stack, InputAdornment, 
  Menu, ListItemIcon, ListItemText, List, ListItem, Avatar, Pagination,
  Badge, Switch, Tab as MuiTab, Collapse
} from '@mui/material';
import {
  BrokenImage as BrokenImageIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Add as AddIcon,
  CloudUpload as CloudUploadIcon,
  PhotoLibrary as PhotoLibraryIcon,
  FilterList as FilterIcon,
  GridView as GridViewIcon,
  ViewList as ListViewIcon,
  Search as SearchIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  PlayCircleOutline as PlayIcon,
  Clear as ClearIcon,
  MoreVert as MoreVertIcon,
  Link as LinkIcon,
  VisibilityOutlined as EyeIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  ErrorOutline as ErrorIcon,
  BugReport as DebugIcon,
  Help as HelpIcon,
  VideoFile as VideoFileIcon,
  PhotoCamera as PhotoCameraIcon,
  PhotoLibrary as GalleryIcon,
  Info as InfoIcon,
  HelpOutline as HelpOutlineIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

// Constante para el tamaño máximo de archivos (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;
/**
 * Componente principal para la gestión de medios
 */
export default function MediaPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Estado general
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = user?.currentRestaurant?.id;
  
  // Estados para UI
  const [view, setView] = useState(isMobile ? 'list' : 'grid');
  const [mediaTab, setMediaTab] = useState('all'); // 'all', 'videos', 'images', 'gallery'
  const [filter, setFilter] = useState({
    searchTerm: '',
    mediaType: 'all',
    dishId: '',
    role: 'all'
  });
  
  // Estado para diálogos y modales
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [debugMode, setDebugMode] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  // Detectar errores repetidos para evitar bucles
  const [erroredUrls] = useState(new Set());
  const itemsPerPage = 12;
  
  // Estados para subida de archivos
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedDishId, setSelectedDishId] = useState('');
  const [selectedRole, setSelectedRole] = useState('GALLERY_IMAGE');
  const [isUploading, setIsUploading] = useState(false);
  
  // Estado para notificaciones
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Consulta para obtener todos los medios
  const {
    data: mediaList = [],
    isLoading: isLoadingMedia,
    isError: isMediaError,
    error: mediaError,
    refetch: refetchMedia
  } = useQuery({
    queryKey: ['media', restaurantId],
    queryFn: async () => {
      if (!restaurantId) throw new Error("No hay restaurante seleccionado");
      
      try {
        console.log("[MediaPage] Cargando medios para restaurante:", restaurantId);
        const data = await apiClient.getRestaurantMedia(restaurantId);
        console.log("[MediaPage] Medios cargados:", data?.length || 0);
        return data;
      } catch (error) {
        console.error("[MediaPage] Error completo:", error);
        throw error;
      }
    },
    enabled: !!restaurantId,
    staleTime: 60000, // 1 minuto
    ...(apiClient.queryDefaults || {})
  });

  // Consulta para obtener platos
  const {
    data: dishes = [],
    isLoading: isLoadingDishes
  } = useQuery({
    queryKey: ['dishes', restaurantId],
    queryFn: () => {
      if (!restaurantId) throw new Error("No hay restaurante seleccionado");
      return apiClient.getDishes(restaurantId);
    },
    enabled: !!restaurantId,
    staleTime: 120000, // 2 minutos
    ...(apiClient.queryDefaults || {})
  });

  // Estadísticas calculadas a partir de los datos
  const mediaStats = useMemo(() => {
    return {
      total: mediaList.length,
      videos: mediaList.filter(m => m.media_type === 'video').length,
      primaryVideos: mediaList.filter(m => m.role === 'PRIMARY_VIDEO').length,
      images: mediaList.filter(m => m.media_type === 'image').length,
      primaryImages: mediaList.filter(m => m.role === 'PRIMARY_IMAGE').length,
      galleryImages: mediaList.filter(m => m.role === 'GALLERY_IMAGE' && m.media_type === 'image').length,
      unused: mediaList.filter(m => !m.dish_id).length,
      problematic: mediaList.filter(m => !m.url || !m.r2_key).length
    };
  }, [mediaList]);

  // Mutaciones
  // 1. Subida de medios
  const uploadMutation = useMutation({
    mutationFn: async ({ file, dishId, role }) => {
      console.log("[MediaPage] Subiendo archivo:", { 
        fileName: file.name, 
        fileType: file.type,
        fileSize: file.size,
        dishId, 
        role 
      });
      
      try {
        return await apiClient.uploadMedia(dishId, file, role);
      } catch (error) {
        console.error("[MediaPage] Error al subir archivo:", error);
        
        if (error.response) {
          console.error("[MediaPage] Respuesta del servidor:", error.response.data);
          console.error("[MediaPage] Estado HTTP:", error.response.status);
        } else if (error.request) {
          console.error("[MediaPage] No se recibió respuesta. Detalles:", error.request);
        }
        
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['media', restaurantId]);
      
      setSnackbar({
        open: true,
        message: `Archivo "${variables.file.name}" subido correctamente`,
        severity: 'success'
      });
      
      console.log("[MediaPage] Archivo subido con éxito:", data);
    },
    onError: (error, variables) => {
      setSnackbar({
        open: true,
        message: `Error al subir "$${variables.file.name}": $${error?.message || 'Error desconocido'}`,
        severity: 'error'
      });
    }
  });

  // 2. Eliminación de medios
  const deleteMutation = useMutation({
    mutationFn: (mediaId) => apiClient.deleteMedia(mediaId),
    onSuccess: (data, mediaId) => {
      queryClient.invalidateQueries(['media', restaurantId]);
      setSnackbar({
        open: true,
        message: 'Archivo eliminado correctamente',
        severity: 'success'
      });
      setAnchorEl(null);
      if (previewDialogOpen && selectedMedia?.id === mediaId) {
        setPreviewDialogOpen(false);
      }
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error al eliminar archivo: ${error?.message || 'Error desconocido'}`,
        severity: 'error'
      });
    }
  });

  // 3. Actualización de rol de medios
  const updateRoleMutation = useMutation({
    mutationFn: ({mediaId, dishId, role}) => apiClient.updateMediaRole(mediaId, dishId, role),
    onSuccess: () => {
      queryClient.invalidateQueries(['media', restaurantId]);
      setSnackbar({
        open: true,
        message: 'Rol del medio actualizado correctamente',
        severity: 'success'
      });
      setAnchorEl(null);
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error al actualizar rol: ${error?.message || 'Error desconocido'}`,
        severity: 'error'
      });
    }
  });

  // Configuración de dropzone para subida de archivos
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': [],
      'video/mp4': [],
      'video/quicktime': [],
      'video/webm': []
    },
    maxSize: MAX_FILE_SIZE,
    onDrop: (acceptedFiles) => {
      const newFiles = acceptedFiles.map(file => 
        Object.assign(file, {
          preview: URL.createObjectURL(file)
        })
      );
      
      // Notificar si se subieron archivos
      if (newFiles.length > 0) {
        setSnackbar({
          open: true,
          message: `${newFiles.length} archivos preparados para subir`,
          severity: 'info'
        });
      }
      
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
    },
    onDropRejected: (rejectedFiles) => {
      const reasons = rejectedFiles.map(file => {
        if (file.errors.some(e => e.code === 'file-too-large')) {
          return `${file.file.name} (demasiado grande, máximo 10MB)`;
        }
        return `$${file.file.name} ($${file.errors.map(e => e.message).join(', ')})`;
      });
      
      setSnackbar({
        open: true,
        message: `Archivos rechazados: ${reasons.join(', ')}`,
        severity: 'error'
      });
    }
  });

  // Limpiar las URLs de vista previa cuando ya no se necesiten
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
    };
  }, [files]);

  // Actualizar la vista según el tamaño de la pantalla
  useEffect(() => {
    setView(isMobile ? 'list' : 'grid');
  }, [isMobile]);

  // Reset página cuando cambian los datos o filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [mediaList, filter, mediaTab]);

  // Mostrar diálogo de ayuda en el primer uso
  useEffect(() => {
    const hasSeenHelp = localStorage.getItem('media_help_seen');
    if (!hasSeenHelp && mediaList.length > 0) {
      setHelpDialogOpen(true);
      localStorage.setItem('media_help_seen', 'true');
    }
  }, [mediaList]);

  // Manejo de subida de archivos
  const handleUploadFiles = async () => {
    if (files.length === 0 || !selectedDishId) {
      setSnackbar({
        open: true,
        message: 'Selecciona archivos y un plato para continuar',
        severity: 'warning'
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Subir archivos secuencialmente para evitar sobrecarga
      for (const file of files) {
        // Validar que el tipo de archivo coincida con el rol seleccionado
        const isVideo = file.type.startsWith('video/');
        if (selectedRole === 'PRIMARY_VIDEO' && !isVideo) {
          setSnackbar({
            open: true,
            message: `"${file.name}" no es un video. Solo se pueden subir videos como video principal.`,
            severity: 'error'
          });
          continue;
        }
        
        if (selectedRole === 'PRIMARY_IMAGE' && isVideo) {
          setSnackbar({
            open: true,
            message: `"${file.name}" no es una imagen. Solo se pueden subir imágenes como imagen principal.`,
            severity: 'error'
          });
          continue;
        }
        
        // Subir el archivo con el rol adecuado
        await uploadMutation.mutateAsync({
          file,
          dishId: selectedDishId,
          role: selectedRole
        });
        
        // Actualizar progreso
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 100
        }));
      }
      
      // Limpiar después de subir todos los archivos
      setFiles([]);
      setUploadProgress({});
      setUploadDialogOpen(false);
      
    } catch (error) {
      console.error('[MediaPage] Error en la carga por lotes:', error);
      setSnackbar({
        open: true,
        message: 'Ocurrieron errores durante la carga de algunos archivos',
        severity: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Manejadores de eventos
  const handleChangeFilter = useCallback((name, value) => {
    setFilter(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  }, []);

  const handleRemoveFile = useCallback((index) => {
    setFiles(prevFiles => {
      const newFiles = [...prevFiles];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  }, []);

  const handleMediaTabChange = useCallback((event, newValue) => {
    setMediaTab(newValue);
    
    // Actualizar filtro de rol según la pestaña
    if (newValue === 'videos') {
      handleChangeFilter('role', 'PRIMARY_VIDEO');
    } else if (newValue === 'thumbnails') {
      handleChangeFilter('role', 'PRIMARY_IMAGE');
    } else if (newValue === 'gallery') {
      handleChangeFilter('role', 'GALLERY_IMAGE');
    } else {
      handleChangeFilter('role', 'all');
    }
  }, [handleChangeFilter]);

  
  const handleMenuOpen = useCallback((event, media) => {
    setSelectedMedia(media);
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const handlePreviewMedia = useCallback((media) => {
    setSelectedMedia(media);
    setPreviewDialogOpen(true);
  }, []);

  const handleDeleteMedia = useCallback(() => {
    if (selectedMedia) {
      deleteMutation.mutate(selectedMedia.id);
    }
  }, [deleteMutation, selectedMedia]);

  const handleUpdateRole = useCallback((newRole) => {
    if (selectedMedia && selectedMedia.dish_id) {
      updateRoleMutation.mutate({
        mediaId: selectedMedia.id,
        dishId: selectedMedia.dish_id,
        role: newRole
      });
    }
  }, [updateRoleMutation, selectedMedia]);

  // Función para obtener URL correcta de imagen sin placeholders base64
const getImageUrl = useCallback((path) => {
  if (!path) return ''; // Devolver cadena vacía que generará error controlado
  
  // Si esta URL ya ha fallado, devolver cadena vacía para forzar el error controlado
  if (erroredUrls.has(path)) {
    return '';
  }
  
  return path;
}, [erroredUrls]);

// Función para marcar URLs con error (mantener igual)
const markUrlAsErrored = useCallback((url) => {
  if (url) erroredUrls.add(url);
}, [erroredUrls]);


  // Aplicar filtros a los medios
  const filteredMedia = useMemo(() => {
    if (!Array.isArray(mediaList)) return [];
    
    return mediaList.filter(media => {
      // Filtrar elementos inválidos
      if (!media) return false;
      
      // Filtrar por tipo de medio
      if (filter.mediaType !== 'all' && media.media_type !== filter.mediaType) return false;
      
      // Filtrar por plato
      if (filter.dishId && media.dish_id !== filter.dishId) return false;
      
      // Filtrar por rol
      if (filter.role !== 'all' && media.role !== filter.role) return false;
      
      // Filtrar por término de búsqueda (en varios campos)
      if (filter.searchTerm) {
        const searchTerm = filter.searchTerm.toLowerCase();
        const displayNameMatch = media.display_name?.toLowerCase().includes(searchTerm);
        const idMatch = media.id?.toLowerCase().includes(searchTerm);
        const dishNameMatch = media.dish_name?.toLowerCase().includes(searchTerm);
        
        if (!(displayNameMatch || idMatch || dishNameMatch)) return false;
      }
      
      return true;
    });
  }, [mediaList, filter]);

  // Ordenar medios según criterios específicos
  const sortedMedia = useMemo(() => {
    // Ordenar por: rol (primarios primero), fecha de creación (más recientes primero)
    return [...filteredMedia].sort((a, b) => {
      // 1. Primero por rol
      const getRoleWeight = (role) => {
        switch(role) {
          case 'PRIMARY_VIDEO': return 1;
          case 'PRIMARY_IMAGE': return 2;
          case 'GALLERY_IMAGE': return 3;
          default: return 4;
        }
      };
      
      const roleA = getRoleWeight(a.role);
      const roleB = getRoleWeight(b.role);
      
      if (roleA !== roleB) return roleA - roleB;
      
      // 2. Luego por orden_index
      if (a.order_index !== b.order_index) {
        return a.order_index - b.order_index;
      }
      
      // 3. Finalmente por fecha de creación (más recientes primero)
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [filteredMedia]);

  // Paginación
  const paginatedMedia = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedMedia.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedMedia, currentPage, itemsPerPage]);
  
  const pageCount = Math.ceil(sortedMedia.length / itemsPerPage);
  
  // Renderizado condicional para estados de carga y error
  if (isLoadingMedia) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Biblioteca de medios
          </Typography>
        </Box>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          Cargando biblioteca de medios...
        </Typography>
      </Container>
    );
  }

  if (isMediaError) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Biblioteca de medios
          </Typography>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={() => refetchMedia()}
          >
            Reintentar
          </Button>
        </Box>
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => setDebugMode(!debugMode)}>
              {debugMode ? "Ocultar detalles" : "Ver detalles"}
            </Button>
          }
        >
          <AlertTitle>Error al cargar la biblioteca de medios</AlertTitle>
          {mediaError?.message || "Error desconocido"}
          
          {debugMode && (
            <Box sx={{ mt: 2, fontSize: '0.8rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(mediaError, null, 2)}
            </Box>
          )}
        </Alert>
      </Container>
    );
  }

  // Renderizado de vista previa de archivos para subir
  const renderFilePreview = (file, index) => {
    const progress = uploadProgress[file.name] || 0;
    const isVideo = file.type.startsWith('video/');
    
    return (
      <Box 
        key={index} 
        sx={{ 
          position: 'relative', 
          mb: 2,
          borderRadius: 1,
          overflow: 'hidden',
          boxShadow: 1,
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 3
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, bgcolor: 'background.paper' }}>
          <Box sx={{ mr: 1, flexShrink: 0 }}>
            {isVideo ? (
              <VideoIcon color="secondary" />
            ) : (
              <ImageIcon color="primary" />
            )}
          </Box>
          
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap title={file.name}>
              {file.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
              {isVideo && " • Video"}
            </Typography>
          </Box>
          
          <IconButton 
            size="small" 
            onClick={() => handleRemoveFile(index)}
            disabled={isUploading}
            sx={{
              '&:hover': {
                color: 'error.main'
              }
            }}
          >
            <ClearIcon fontSize="small" />
          </IconButton>
        </Box>
        
        {file.preview && !isVideo && (
          <Box 
            component="img" 
            src={file.preview} 
            alt={file.name}
            sx={{ 
              width: '100%', 
              height: 120, 
              objectFit: 'cover',
              display: 'block'
            }} 
          />
        )}
        
        {isVideo && (
          <Box sx={{ 
            height: 120, 
            bgcolor: 'black', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center'
          }}>
            <VideoIcon sx={{ fontSize: 48, opacity: 0.7, color: 'white' }} />
          </Box>
        )}
        
        {progress > 0 && (
          <Box sx={{ position: 'relative', pt: 0.5 }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ height: 6, borderRadius: 0 }}
            />
            <Typography 
              variant="caption" 
              sx={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)',
                color: 'white',
                textShadow: '0px 0px 2px rgba(0,0,0,0.7)',
                fontWeight: 'bold'
              }}
            >
              {progress}%
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

// 3. Actualizar el renderizado de tarjetas de medios
const renderMediaCard = (media) => {
  const isVideo = media.media_type === 'video';
  const isPrimary = media.role === 'PRIMARY_VIDEO' || media.role === 'PRIMARY_IMAGE';
  const isGallery = media.role === 'GALLERY_IMAGE';
  const displayName = media.display_name || media.id.split('_').slice(1).join('_');
  
  // Detectar medios problemáticos
  const hasMediaError = !media.url || !media.r2_key;
  
  // Determinar si hay thumbnail para videos
  const hasVideoThumbnail = isVideo && media.thumbnail_url;
    
  // Determinar color por rol
  const getRoleColor = () => {
    switch(media.role) {
      case 'PRIMARY_VIDEO': return 'error.main';
      case 'PRIMARY_IMAGE': return 'primary.main';
      case 'GALLERY_IMAGE': return 'info.main';
      default: return 'text.secondary';
    }
  };
  
  // Determinar icono por rol
  const getRoleIcon = () => {
    switch(media.role) {
      case 'PRIMARY_VIDEO': return <VideoFileIcon fontSize="small" />;
      case 'PRIMARY_IMAGE': return <PhotoCameraIcon fontSize="small" />;
      case 'GALLERY_IMAGE': return <GalleryIcon fontSize="small" />;
      default: return <ImageIcon fontSize="small" />;
    }
  };
  
  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        position: 'relative',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4
        },
        ...(hasMediaError && {
          border: '1px solid',
          borderColor: 'warning.light',
        })
      }}
    >
      {/* Indicador de error */}
      {hasMediaError && (
        <Tooltip title="Este archivo puede tener problemas de ruta">
          <IconButton 
            size="small"
            color="warning"
            sx={{
              position: 'absolute',
              top: 4,
              left: 4,
              zIndex: 2,
              bgcolor: 'background.paper',
              boxShadow: 1
            }}
            onClick={() => {
              setSelectedMedia(media);
              setSnackbar({
                open: true,
                message: 'Este medio puede necesitar reparación.',
                severity: 'warning'
              });
            }}
          >
            <ErrorIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      
      <Box sx={{ position: 'relative' }}>
        {/* Para videos, mostrar el thumbnail si existe o un placeholder si no */}
        {isVideo ? (
          <>
            {hasVideoThumbnail ? (
              <CardMedia
                component="img"
                height={view === 'grid' ? 180 : 100}
                image={getImageUrl(media.thumbnail_url)}
                alt={displayName}
                onError={(e) => {
                  console.warn(`[MediaPage] Error al cargar thumbnail para: ${media.id}`);
                  markUrlAsErrored(media.thumbnail_url);
                  
                  // Reemplazar con el placeholder cuando hay un error
                  const container = e.target.parentNode;
                  if (container) {
                    // Ocultar la imagen con error
                    e.target.style.display = 'none';
                    
                    // Crear contenedor para el placeholder
                    const placeholderDiv = document.createElement('div');
                    placeholderDiv.style.height = `${view === 'grid' ? 180 : 100}px`;
                    container.appendChild(placeholderDiv);
                    
                    // Renderizar el placeholder usando ReactDOM
                    ReactDOM.render(
                      <VideoThumbnailPlaceholder 
                        height="100%" 
                        text="No se pudo cargar la miniatura"
                      />, 
                      placeholderDiv
                    );
                  }
                }}
                sx={{ 
                  cursor: 'pointer',
                  objectFit: 'cover',
                }}
                onClick={() => handlePreviewMedia(media)}
              />
            ) : (
              // Si no hay thumbnail, mostrar el placeholder directamente
              <Box 
                onClick={() => handlePreviewMedia(media)} 
                sx={{ 
                  cursor: 'pointer',
                  height: view === 'grid' ? 180 : 100
                }}
              >
                <VideoThumbnailPlaceholder 
                  height="100%"
                  text={`Video sin miniatura`}
                />
              </Box>
            )}
          </>
        ) : (
          // Para imágenes, mostrar normalmente
          <CardMedia
            component="img"
            height={view === 'grid' ? 180 : 100}
            image={media.url ? getImageUrl(media.url) : ''}
            alt={displayName}
            onError={(e) => {
              console.warn(`[MediaPage] Error al cargar imagen: ${media.id}`);
              markUrlAsErrored(media.url);
              
              // Reemplazar con un placeholder de imagen rota
              const container = e.target.parentNode;
              if (container) {
                // Ocultar la imagen con error
                e.target.style.display = 'none';
                
                // Crear contenedor para el placeholder
                const placeholderDiv = document.createElement('div');
                placeholderDiv.style.height = `${view === 'grid' ? 180 : 100}px`;
                container.appendChild(placeholderDiv);
                
                // Renderizar placeholder de imagen rota
                ReactDOM.render(
                  <Box
                    sx={{
                      height: '100%',
                      backgroundColor: '#f5f5f5',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'text.secondary',
                    }}
                  >
                    <BrokenImageIcon sx={{ fontSize: '3rem', mb: 1 }} />
                    <Typography variant="caption">Imagen no disponible</Typography>
                  </Box>,
                  placeholderDiv
                );
              }
            }}
            sx={{ 
              cursor: 'pointer',
              objectFit: 'cover',
              filter: hasMediaError ? 'grayscale(50%)' : 'none',
            }}
            onClick={() => handlePreviewMedia(media)}
          />
        )}
        
        {/* Icono de reproducción para videos */}
        {isVideo && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none', // Para que no interfiera con clicks
            }}
          >
            <PlayIcon sx={{ color: 'white', fontSize: 30 }} />
          </Box>
        )}
        
        {/* Badge por rol */}
        <Chip
          icon={getRoleIcon()}
          label={media.role.replace('PRIMARY_', '').replace('_', ' ')}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: getRoleColor(),
            color: 'white',
            fontWeight: 500,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        />
      </Box>
      
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Typography variant="body2" noWrap title={displayName}>
          {displayName}
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {media.width && media.height ? `${media.width}x${media.height}` : 'Dimensiones desconocidas'}
          </Typography>
          
          <Typography variant="caption" color="text.secondary">
            {isVideo && media.duration ? `${Math.floor(media.duration / 1000)}s` : ''}
          </Typography>
        </Box>
        
        {/* Nombre del plato */}
        {media.dish_id && (
          <Tooltip title={`Asignado a: ${media.dish_name || "Plato"}`}>
            <Chip
              variant="outlined"
              size="small"
              label={media.dish_name || "Plato asignado"}
              sx={{ 
                mt: 1, 
                fontSize: '0.675rem', 
                height: 20,
                maxWidth: '100%',
                textOverflow: 'ellipsis'
              }}
            />
          </Tooltip>
        )}
      </CardContent>
      
      <CardActions sx={{ p: 1, pt: 0 }}>
        <Tooltip title="Ver detalles">
          <IconButton size="small" onClick={() => handlePreviewMedia(media)}>
            <EyeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        {/* Mostrar opciones según el rol actual */}
        {media.dish_id && (
          <Box>
            {media.role !== 'PRIMARY_VIDEO' && isVideo && (
              <Tooltip title="Establecer como video principal">
                <IconButton 
                  size="small" 
                  onClick={() => handleUpdateRole('PRIMARY_VIDEO')}
                >
                  <VideoFileIcon fontSize="small" color="error" />
                </IconButton>
              </Tooltip>
            )}
            
            {media.role !== 'PRIMARY_IMAGE' && !isVideo && (
              <Tooltip title="Establecer como imagen principal">
                <IconButton 
                  size="small" 
                  onClick={() => handleUpdateRole('PRIMARY_IMAGE')}
                >
                  <PhotoCameraIcon fontSize="small" color="primary" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
        
        <Box flexGrow={1} />
        
        <IconButton 
          size="small"
          onClick={(e) => handleMenuOpen(e, media)}
          aria-label="Más opciones"
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );
};

  // Renderizado de vista de lista para dispositivos móviles
// En la función renderMediaItem
const renderMediaItem = (media) => {
  const isVideo = media.media_type === 'video';
  const isPrimary = media.role === 'PRIMARY_VIDEO' || media.role === 'PRIMARY_IMAGE';
  const displayName = media.display_name || media.id.split('_').slice(1).join('_');
  
  // Determinar si hay thumbnail para videos
  const hasVideoThumbnail = isVideo && media.thumbnail_url;
  
  // Detectar medios problemáticos
  const hasMediaError = !media.url || !media.r2_key;
  
  // Determinar color por rol
  const getRoleColor = (role) => {
    switch(role) {
      case 'PRIMARY_VIDEO': return 'error.main';
      case 'PRIMARY_IMAGE': return 'primary.main';
      case 'GALLERY_IMAGE': return 'info.main';
      default: return 'text.secondary';
    }
  };
  
  return (
    <ListItem
      disablePadding
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: 1,
        ...(hasMediaError && {
          bgcolor: alpha('#ff9800', 0.1)
        })
      }}
    >
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          alignItems: 'center'
        }}
      >
        {/* Miniatura */}
        <Box
          sx={{
            position: 'relative',
            width: 60,
            height: 60,
            mr: 2,
            borderRadius: 1,
            overflow: 'hidden',
            flexShrink: 0
          }}
          onClick={() => handlePreviewMedia(media)}
        >
          {isVideo ? (
            hasVideoThumbnail ? (
              <img
                src={getImageUrl(media.thumbnail_url)}
                alt={displayName}
                onError={(e) => {
                  markUrlAsErrored(media.thumbnail_url);
                  e.target.onerror = null;
                  
                  // Renderizar placeholder en su lugar
                  const container = e.target.parentNode;
                  if (container) {
                    // Ocultar la imagen con error
                    e.target.style.display = 'none';
                    
                    // Crear contenedor para el placeholder
                    const placeholderDiv = document.createElement('div');
                    placeholderDiv.style.width = '100%';
                    placeholderDiv.style.height = '100%';
                    container.appendChild(placeholderDiv);
                    
                    // Renderizar el placeholder
                    ReactDOM.render(
                      <VideoThumbnailPlaceholder width="100%" height="100%" fontSize="0.6rem" iconSize="1.5rem" />,
                      placeholderDiv
                    );
                  }
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              // No hay thumbnail, mostrar placeholder directamente
              <VideoThumbnailPlaceholder 
                width="100%" 
                height="100%" 
                fontSize="0.6rem" 
                iconSize="1.5rem" 
                text=""
              />
            )
          ) : (
            // Es una imagen normal
            <img
              src={getImageUrl(media.url)}
              alt={displayName}
              onError={(e) => {
                markUrlAsErrored(media.url);
                e.target.onerror = null;
                
                // Renderizar placeholder de imagen rota
                const container = e.target.parentNode;
                if (container) {
                  // Ocultar la imagen con error
                  e.target.style.display = 'none';
                  
                  // Crear contenedor para el placeholder
                  const placeholderDiv = document.createElement('div');
                  placeholderDiv.style.width = '100%';
                  placeholderDiv.style.height = '100%';
                  container.appendChild(placeholderDiv);
                  
                  // Renderizar el placeholder
                  ReactDOM.render(
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <BrokenImageIcon sx={{ color: 'text.secondary' }} />
                    </Box>,
                    placeholderDiv
                  );
                }
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: hasMediaError ? 'grayscale(50%)' : 'none'
              }}
            />
          )}
          
          {/* Icono de play para videos */}
          {isVideo && (
            <PlayIcon
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'white',
                fontSize: 24,
                filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.5))',
                pointerEvents: 'none'
              }}
            />
          )}
          
          {/* Insignia de rol */}
          <Chip
            label={media.role.split('_')[0]}
            size="small"
            sx={{
              position: 'absolute',
              bottom: 2,
              left: 2,
              height: 16,
              fontSize: '0.6rem',
              color: 'white',
              backgroundColor: getRoleColor(media.role),
              '& .MuiChip-label': {
                px: 0.5,
                py: 0
              }
            }}
          />
          
          {hasMediaError && (
            <ErrorIcon
              sx={{
                position: 'absolute',
                top: 2,
                right: 2,
                color: 'warning.main',
                fontSize: 14,
                filter: 'drop-shadow(0px 0px 2px rgba(255,255,255,0.8))'
              }}
            />
          )}
        </Box>
        
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap>
            {displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {isVideo ? 'Video' : 'Imagen'} • 
            {media.width && media.height ? ` ${media.width}x${media.height}` : ' Desconocido'}
            {isVideo && !hasVideoThumbnail && ' • Sin miniatura'}
          </Typography>
          {media.dish_name && (
            <Typography variant="caption" color="primary" display="block" noWrap>
              {media.dish_name}
            </Typography>
          )}
        </Box>
        
        <IconButton
          size="small"
          edge="end"
          onClick={(e) => handleMenuOpen(e, media)}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Box>
    </ListItem>
  );
};
  // Componente principal
  return (
    <Container maxWidth="lg">
      {/* Cabecera con título y acciones */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Biblioteca de medios
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Ayuda">
            <IconButton 
              color="info" 
              onClick={() => setHelpDialogOpen(true)}
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
          
          {/* Botón de modo depuración para desarrolladores */}
          <IconButton 
            color={debugMode ? "primary" : "default"} 
            onClick={() => setDebugMode(!debugMode)}
            sx={{ display: { xs: 'none', md: 'flex' } }}
          >
            <DebugIcon />
          </IconButton>
          
          {!isMobile && (
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => setUploadDialogOpen(true)}
            >
              Subir archivos
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Pestañas para filtrar por tipo de medio */}
      <Box sx={{ width: '100%', mb: 2 }}>
  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
    <Tabs 
      value={mediaTab}
      onChange={handleMediaTabChange}
      variant="scrollable"
      scrollButtons="auto"
      allowScrollButtonsMobile
      aria-label="media type tabs"
    >
      <Tab 
        label={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PhotoLibraryIcon sx={{ mr: 0.5 }} fontSize="small" />
            <span>Todos</span>
            <Chip 
              label={mediaStats.total} 
              size="small" 
              sx={{ ml: 0.5, height: 16, fontSize: '0.6rem' }}
            />
          </Box>
        } 
        value="all" 
      />
      <Tab 
        label={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <VideoFileIcon sx={{ mr: 0.5 }} fontSize="small" color="error" />
            <span>Videos principales</span>
            <Chip 
              label={mediaStats.primaryVideos} 
              size="small" 
              color="error" 
              sx={{ ml: 0.5, height: 16, fontSize: '0.6rem' }}
            />
          </Box>
        } 
        value="videos" 
      />
      <Tab 
        label={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PhotoCameraIcon sx={{ mr: 0.5 }} fontSize="small" color="primary" />
            <span>Imágenes principales</span>
            <Chip 
              label={mediaStats.primaryImages} 
              size="small" 
              color="primary" 
              sx={{ ml: 0.5, height: 16, fontSize: '0.6rem' }}
            />
          </Box>
        } 
        value="thumbnails" 
      />
      <Tab 
        label={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <GalleryIcon sx={{ mr: 0.5 }} fontSize="small" color="info" />
            <span>Galería</span>
            <Chip 
              label={mediaStats.galleryImages} 
              size="small" 
              color="info" 
              sx={{ ml: 0.5, height: 16, fontSize: '0.6rem' }}
            />
          </Box>
        } 
        value="gallery" 
      />
    </Tabs>
  </Box>
</Box>
      
      {/* Información de nueva estructura para desarrolladores */}
      {debugMode && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <AlertTitle>Nueva estructura de medios</AlertTitle>
          <Typography variant="body2">
            Los medios ahora se organizan en roles: <code>PRIMARY_VIDEO</code>, <code>PRIMARY_IMAGE</code> y <code>GALLERY_IMAGE</code>.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Estructura de rutas actual: <code>restaurants/{restaurantId}/dishes/[dish_id]/[videos|thumbnails|gallery]/[media_id].[ext]</code>
          </Typography>
        </Alert>
      )}
      
      {/* Barra de filtros para pantallas grandes */}
      {!isMobile && (
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            p: 2,
            mb: 3,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 2
          }}
        >
          <TextField
            placeholder="Buscar medios..."
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
            sx={{ width: 200 }}
            value={filter.searchTerm}
            onChange={(e) => handleChangeFilter('searchTerm', e.target.value)}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={filter.mediaType}
              label="Tipo"
              onChange={(e) => handleChangeFilter('mediaType', e.target.value)}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="image">Imágenes</MenuItem>
              <MenuItem value="video">Videos</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Plato</InputLabel>
            <Select
              value={filter.dishId}
              label="Plato"
              onChange={(e) => handleChangeFilter('dishId', e.target.value)}
              disabled={isLoadingDishes}
              MenuProps={{ style: { maxHeight: 400 } }}
            >
              <MenuItem value="">Todos los platos</MenuItem>
              {Array.isArray(dishes) && dishes.map((dish) => (
                <MenuItem key={dish.id} value={dish.id}>
                  {(dish.translations?.name?.es) || dish.name || dish.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={(e, value) => value && setView(value)}
            size="small"
          >
            <ToggleButton value="grid">
              <GridViewIcon />
            </ToggleButton>
            <ToggleButton value="list">
              <ListViewIcon />
            </ToggleButton>
          </ToggleButtonGroup>
          
          <Button
            startIcon={<ClearIcon />}
            size="small"
            onClick={() => {
              setFilter({
                searchTerm: '',
                mediaType: 'all',
                dishId: '',
                role: 'all'
              });
              setMediaTab('all');
            }}
          >
            Limpiar filtros
          </Button>
        </Paper>
      )}
      
      {/* Resultados y contador */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {sortedMedia.length} {sortedMedia.length === 1 ? 'archivo' : 'archivos'} encontrados
        </Typography>
        
        {isMobile && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              size="small"
              onClick={() => setMobileFilterOpen(true)}
            >
              <FilterIcon />
            </IconButton>
            
            <IconButton
              size="small"
              color="primary"
              onClick={() => setUploadDialogOpen(true)}
            >
              <AddIcon />
            </IconButton>
          </Box>
        )}
      </Box>
      
      {/* Contenido principal: Galería de medios */}
      <Paper 
        elevation={0} 
        variant="outlined" 
        sx={{ 
          p: 2, 
          mb: 3,
          minHeight: 300,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {sortedMedia.length === 0 ? (
          // Estado vacío
          <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            {filter.searchTerm || filter.mediaType !== 'all' || filter.dishId || filter.role !== 'all' ? (
              // No hay resultados para los filtros
              <>
                <FilterIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.7 }} />
                <Typography variant="h6" gutterBottom>
                  No se encontraron resultados
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Prueba a cambiar los filtros de búsqueda
                </Typography>
                <Button 
                  variant="outlined"
                  onClick={() => {
                    setFilter({
                      searchTerm: '',
                      mediaType: 'all',
                      dishId: '',
                      role: 'all'
                    });
                    setMediaTab('all');
                  }}
                  startIcon={<ClearIcon />}
                >
                  Limpiar filtros
                </Button>
              </>
            ) : mediaStats.total === 0 ? (
              // No hay medios en la biblioteca
              <>
                <PhotoLibraryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.7 }} />
                <Typography variant="h6" gutterBottom>
                  Biblioteca de medios vacía
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Sube videos e imágenes para tus platos
                </Typography>
                <Button 
                  variant="contained"
                  onClick={() => setUploadDialogOpen(true)}
                  startIcon={<CloudUploadIcon />}
                >
                  Subir archivos
                </Button>
              </>
            ) : (
              // Caso improbable: hay medios pero ninguno pasó el filtro
              <>
                <FilterIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.7 }} />
                <Typography variant="h6" gutterBottom>
                  No hay archivos que mostrar
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Prueba a buscar con otros criterios
                </Typography>
              </>
            )}
          </Box>
        ) : (
          // Vista de galería de medios
          <>
            {view === 'grid' ? (
              // Vista de cuadrícula
              <Grid container spacing={2}>
                {paginatedMedia.map((media) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={media.id}>
                    {renderMediaCard(media)}
                  </Grid>
                ))}
              </Grid>
            ) : (
              // Vista de lista
              <List disablePadding>
                {paginatedMedia.map((media) => (
                  <React.Fragment key={media.id}>
                    {renderMediaItem(media)}
                  </React.Fragment>
                ))}
              </List>
            )}
            
            {/* Paginación */}
            {pageCount > 1 && (
              <Box sx={{ mt: 'auto', pt: 3, display: 'flex', justifyContent: 'center' }}>
                <Pagination 
                  count={pageCount} 
                  page={currentPage} 
                  onChange={(e, page) => setCurrentPage(page)} 
                  color="primary"
                  size={isMobile ? "small" : "medium"}
                />
              </Box>
            )}
          </>
        )}
      </Paper>
      
      {/* Estadísticas en una fila para pantallas grandes */}
      {!isMobile && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={0} 
              variant="outlined"
              sx={{ 
                p: 2, 
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Avatar 
                sx={{ 
                  bgcolor: 'primary.main', 
                  mr: 2,
                  width: 40,
                  height: 40
                }}
              >
                <PhotoLibraryIcon />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {mediaStats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de archivos
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={0} 
              variant="outlined"
              sx={{ 
                p: 2, 
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Avatar 
                sx={{ 
                  bgcolor: 'error.main', 
                  mr: 2,
                  width: 40,
                  height: 40
                }}
              >
                <VideoIcon />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {mediaStats.primaryVideos}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Videos principales
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={0} 
              variant="outlined"
              sx={{ 
                p: 2, 
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Avatar 
                sx={{ 
                  bgcolor: 'primary.main', 
                  mr: 2,
                  width: 40,
                  height: 40
                }}
              >
                <PhotoCameraIcon />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {mediaStats.primaryImages}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Imágenes principales
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={0} 
              variant="outlined"
              sx={{ 
                p: 2, 
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Avatar 
                sx={{ 
                  bgcolor: 'info.main', 
                  mr: 2,
                  width: 40,
                  height: 40
                }}
              >
                <GalleryIcon />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {mediaStats.galleryImages}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Imágenes de galería
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {/* Botón flotante para móviles */}
      {isMobile && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 10
          }}
        >
          <Button
            variant="contained"
            color="primary"
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              boxShadow: 4
            }}
            onClick={() => setUploadDialogOpen(true)}
          >
            <CloudUploadIcon />
          </Button>
        </Box>
      )}
      
      {/* Diálogo para subir archivos */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => !isUploading && setUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Subir archivos</Typography>
            {!isUploading && (
              <IconButton onClick={() => setUploadDialogOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              {/* Área para arrastrar archivos */}
              <Box
                {...getRootProps()}
                sx={{
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  p: 3,
                  textAlign: 'center',
                  mb: 2,
                  cursor: 'pointer',
                  minHeight: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
                  transition: 'all 0.2s ease',
                }}
              >
                <input {...getInputProps()} />
                <CloudUploadIcon color="action" sx={{ fontSize: 48, mb: 2, opacity: 0.7 }} />
                <Typography gutterBottom>
                  {isDragActive ? 'Suelta los archivos aquí' : 'Arrastra imágenes o videos aquí'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  o haz clic para seleccionar archivos
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Formatos admitidos: JPG, PNG, GIF, MP4 • Máx. 10MB por archivo
                </Typography>
              </Box>

              {/* Configuración para la subida */}
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Asignar a plato</InputLabel>
                <Select
                  label="Asignar a plato"
                  value={selectedDishId}
                  onChange={(e) => setSelectedDishId(e.target.value)}
                  disabled={isUploading || isLoadingDishes}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                      },
                    },
                  }}
                >
                  {isLoadingDishes ? (
                    <MenuItem value="" disabled>
                      Cargando platos...
                    </MenuItem>
                  ) : !dishes?.length ? (
                    <MenuItem value="" disabled>
                      No hay platos disponibles
                    </MenuItem>
                  ) : [
                    <MenuItem key="placeholder" value="" disabled>
                      Selecciona un plato
                    </MenuItem>,
                    ...(Array.isArray(dishes) ? dishes : []).map((dish) => (
                      <MenuItem key={dish.id} value={dish.id}>
                        {(dish.translations?.name?.es) || dish.name || dish.id}
                      </MenuItem>
                    ))
                  ]}
                </Select>
              </FormControl>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
  <InputLabel>Tipo de medio</InputLabel>
  <Select
    label="Tipo de medio"
    value={selectedRole}
    onChange={(e) => setSelectedRole(e.target.value)}
    disabled={isUploading}
  >
    <MenuItem value="PRIMARY_VIDEO">
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <VideoIcon sx={{ mr: 1 }} color="error" />
        <Box>
          <Typography variant="body2">Video principal</Typography>
          <Typography variant="caption" color="text.secondary">
            Video que se mostrará en la vista de reels
          </Typography>
        </Box>
      </Box>
    </MenuItem>
    <MenuItem value="PRIMARY_IMAGE">
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <ImageIcon sx={{ mr: 1 }} color="primary" />
        <Box>
          <Typography variant="body2">Imagen principal</Typography>
          <Typography variant="caption" color="text.secondary">
            Imagen de portada y miniatura para videos
          </Typography>
        </Box>
      </Box>
    </MenuItem>
    <MenuItem value="GALLERY_IMAGE">
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <PhotoLibraryIcon sx={{ mr: 1 }} color="info" />
        <Box>
          <Typography variant="body2">Imagen de galería</Typography>
          <Typography variant="caption" color="text.secondary">
            Imagen adicional para mostrar en galería del plato
          </Typography>
        </Box>
      </Box>
    </MenuItem>
  </Select>
</FormControl>
              
              <Alert severity="info" sx={{ mt: 3 }}>
                <AlertTitle>Información importante</AlertTitle>
                <Typography variant="body2">
                  • <strong>Video principal:</strong> El video que se mostrará en la vista de reels
                </Typography>
                <Typography variant="body2">
                  • <strong>Imagen principal:</strong> Se usa como thumbnail cuando el video no se puede reproducir
                </Typography>
                <Typography variant="body2">
                  • <strong>Imágenes de galería:</strong> Imágenes adicionales para el plato
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                  Cada plato solo puede tener un video principal y una imagen principal.
                </Typography>
              </Alert>
            </Grid>
            
            <Grid item xs={12} md={6}>
              {/* Previsualización de archivos seleccionados */}
              <Typography variant="subtitle2" gutterBottom>
                Archivos seleccionados ({files.length})
              </Typography>
              
              {files.length === 0 ? (
                <Box 
                  sx={{ 
                    border: '1px solid', 
                    borderColor: 'divider', 
                    borderRadius: 1, 
                    p: 3, 
                    textAlign: 'center',
                    color: 'text.secondary',
                    bgcolor: 'action.hover'
                  }}
                >
                  <Typography variant="body2">
                    Aún no has seleccionado ningún archivo
                  </Typography>
                </Box>
              ) : (
                <Box 
                  sx={{ 
                    maxHeight: 300, 
                    overflow: 'auto',
                    p: 1,
                    '&::-webkit-scrollbar': {
                      width: '6px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'rgba(0,0,0,0.05)',
                      borderRadius: '10px'
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      borderRadius: '10px',
                    }
                  }}
                >
                  {files.map((file, index) => renderFilePreview(file, index))}
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            variant="outlined"
            onClick={() => !isUploading && setUploadDialogOpen(false)}
            disabled={isUploading}
          >
            Cancelar
          </Button>
          
          <Button
            variant="contained"
            onClick={handleUploadFiles}
            disabled={isUploading || files.length === 0 || !selectedDishId}
            startIcon={isUploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
          >
            {isUploading ? 'Subiendo...' : 'Subir archivos'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo para previsualizar medio */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        {selectedMedia && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" noWrap>
                  {selectedMedia.display_name || selectedMedia.id.split('_').slice(1).join('_')}
                </Typography>
                <IconButton onClick={() => setPreviewDialogOpen(false)} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            
            <DialogContent>
  <Box sx={{ textAlign: 'center', mb: 3 }}>
    {/* Contenido multimedia con manejo de errores */}
    {selectedMedia.media_type === 'video' ? (
      <Box sx={{ position: 'relative' }}>
        <Box
          component="video"
          src={getImageUrl(selectedMedia.url)}
          controls
          autoPlay
          // No usar poster si no hay thumbnail - renderizaremos un componente si falla
          poster={selectedMedia.thumbnail_url ? getImageUrl(selectedMedia.thumbnail_url) : undefined}
          onError={(e) => {
            console.error(`[MediaPage] Error al cargar video: ${selectedMedia.id}`);
            e.target.onerror = null;
            
            // Mostrar mensaje de error
            setSnackbar({
              open: true,
              message: `Error al cargar el video. La ruta puede ser incorrecta.`,
              severity: 'error'
            });
            
            // Reemplazar con componente React en lugar de HTML directo
            if (e.target.parentNode) {
              const errorContainer = document.createElement('div');
              errorContainer.style.width = '100%';
              errorContainer.style.height = '300px';
              
              e.target.parentNode.replaceChild(errorContainer, e.target);
              
              // Renderizar un componente React más elegante
              ReactDOM.render(
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#1a1a1a',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    borderRadius: 1,
                    padding: 3,
                  }}
                >
                  <VideoIcon sx={{ fontSize: 60, mb: 2, opacity: 0.7 }} />
                  <Typography variant="h6" gutterBottom>
                    Error al cargar el video
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.7, mb: 2 }}>
                    La ruta del archivo puede ser incorrecta
                  </Typography>
                  <Button 
                    variant="outlined" 
                    color="inherit" 
                    size="small"
                    startIcon={<LinkIcon />}
                    onClick={() => {
                      navigator.clipboard.writeText(selectedMedia.url);
                      setSnackbar({
                        open: true,
                        message: 'URL copiada al portapapeles',
                        severity: 'info'
                      });
                    }}
                  >
                    Copiar URL del video
                  </Button>
                </Box>,
                errorContainer
              );
            }
          }}
          sx={{
            maxWidth: '100%',
            maxHeight: 500,
            objectFit: 'contain',
            borderRadius: 1,
            boxShadow: 1,
            backgroundColor: '#000', // Fondo negro para el video
          }}
        />
        
        {/* Si no hay thumbnail, mostrar un aviso */}
        {!selectedMedia.thumbnail_url && selectedMedia.media_type === 'video' && (
          <Box sx={{ mt: 1 }}>
            <Alert severity="info" sx={{ textAlign: 'left' }}>
              <AlertTitle>Este video no tiene miniatura</AlertTitle>
              <Typography variant="body2" paragraph>
                Para añadir una miniatura, sube una imagen y establécela como "Imagen principal" para este mismo plato.
              </Typography>
              <Button 
                size="small" 
                variant="outlined"
                color="info"
                onClick={() => {
                  setUploadDialogOpen(true);
                  setSelectedDishId(selectedMedia.dish_id);
                  setSelectedRole('PRIMARY_IMAGE');
                  setPreviewDialogOpen(false);
                }}
              >
                Subir imagen principal
              </Button>
            </Alert>
          </Box>
        )}
      </Box>
    ) : (
      <Box sx={{ position: 'relative' }}>
        <Box
          component="img"
          src={getImageUrl(selectedMedia.url)}
          alt={selectedMedia.display_name}
          onError={(e) => {
            console.error(`[MediaPage] Error al cargar imagen: ${selectedMedia.id}`);
            e.target.onerror = null;
            
            // Mostrar mensaje de error
            setSnackbar({
              open: true,
              message: `Error al cargar la imagen. La ruta puede ser incorrecta.`,
              severity: 'error'
            });
            
            // Reemplazar con componente React
            if (e.target.parentNode) {
              const errorContainer = document.createElement('div');
              errorContainer.style.width = '100%';
              errorContainer.style.height = '300px';
              
              e.target.parentNode.replaceChild(errorContainer, e.target);
              
              ReactDOM.render(
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 1,
                    padding: 3,
                  }}
                >
                  <BrokenImageIcon sx={{ fontSize: 60, mb: 2, color: 'text.secondary' }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No se pudo cargar la imagen
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    La imagen no está disponible o la ruta es incorrecta
                  </Typography>
                </Box>,
                errorContainer
              );
            }
          }}
          sx={{
            maxWidth: '100%',
            maxHeight: 500,
            objectFit: 'contain',
            borderRadius: 1,
            boxShadow: 1
          }}
        />
      </Box>
    )}
  </Box>
  
  <Grid container spacing={3}>
    <Grid item xs={12} sm={6}>
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
        Detalles
      </Typography>
      
      <Box component="dl" sx={{ m: 0 }}>
        <Box sx={{ display: 'flex', py: 0.5 }}>
          <Typography component="dt" sx={{ fontWeight: 'bold', width: 120 }}>Tipo:</Typography>
          <Typography component="dd" sx={{ m: 0 }}>
            {selectedMedia.media_type === 'video' ? 'Video' : 'Imagen'}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', py: 0.5 }}>
          <Typography component="dt" sx={{ fontWeight: 'bold', width: 120 }}>Rol:</Typography>
          <Typography component="dd" sx={{ m: 0 }}>
            {selectedMedia.role.replace('PRIMARY_', '').replace('_', ' ')}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', py: 0.5 }}>
          <Typography component="dt" sx={{ fontWeight: 'bold', width: 120 }}>Formato:</Typography>
          <Typography component="dd" sx={{ m: 0 }}>
            {selectedMedia.content_type || 'Desconocido'}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', py: 0.5 }}>
          <Typography component="dt" sx={{ fontWeight: 'bold', width: 120 }}>Dimensiones:</Typography>
          <Typography component="dd" sx={{ m: 0 }}>
            {selectedMedia.width && selectedMedia.height 
              ? `${selectedMedia.width}x${selectedMedia.height} px` 
              : 'No disponible'}
          </Typography>
        </Box>
        
        {selectedMedia.media_type === 'video' && (
          <Box sx={{ display: 'flex', py: 0.5 }}>
            <Typography component="dt" sx={{ fontWeight: 'bold', width: 120 }}>Duración:</Typography>
            <Typography component="dd" sx={{ m: 0 }}>
              {selectedMedia.duration ? `${Math.floor(selectedMedia.duration / 1000)} segundos` : 'No disponible'}
            </Typography>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', py: 0.5 }}>
          <Typography component="dt" sx={{ fontWeight: 'bold', width: 120 }}>ID:</Typography>
          <Typography component="dd" sx={{ m: 0 }}>
            {selectedMedia.id}
          </Typography>
        </Box>
      </Box>
    </Grid>
    
    <Grid item xs={12} sm={6}>
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
        Uso
      </Typography>
      
      <Box component="dl" sx={{ m: 0 }}>
        <Box sx={{ display: 'flex', py: 0.5 }}>
          <Typography component="dt" sx={{ fontWeight: 'bold', width: 120 }}>Asignado a:</Typography>
          <Typography component="dd" sx={{ m: 0 }}>
            {selectedMedia.dish_name || 'No asignado'}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', py: 0.5 }}>
          <Typography component="dt" sx={{ fontWeight: 'bold', width: 120 }}>URL:</Typography>
          <Typography 
            component="dd" 
            sx={{ 
              m: 0, 
              whiteSpace: 'nowrap', 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: { xs: '150px', sm: '250px' }
            }}
          >
            <Tooltip title={selectedMedia.url}>
              <span>{selectedMedia.url}</span>
            </Tooltip>
          </Typography>
        </Box>
        
        {debugMode && selectedMedia.r2_key && (
          <Box sx={{ display: 'flex', py: 0.5 }}>
            <Typography component="dt" sx={{ fontWeight: 'bold', width: 120 }}>R2 Key:</Typography>
            <Typography 
              component="dd" 
              sx={{ 
                m: 0, 
                whiteSpace: 'nowrap', 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: { xs: '150px', sm: '250px' },
                fontFamily: 'monospace',
                fontSize: '0.85rem'
              }}
            >
              <Tooltip title={selectedMedia.r2_key}>
                <span>{selectedMedia.r2_key}</span>
              </Tooltip>
            </Typography>
          </Box>
        )}
      </Box>
      
      <Box sx={{ display: 'flex', mt: 2, gap: 1 }}>
        <Button
          startIcon={<LinkIcon />}
          size="small"
          variant="outlined"
          onClick={() => {
            navigator.clipboard.writeText(selectedMedia.url);
            setSnackbar({
              open: true,
              message: 'URL copiada al portapapeles',
              severity: 'success'
            });
          }}
        >
          Copiar URL
        </Button>
      </Box>
    </Grid>
    
    {debugMode && (
      <Grid item xs={12}>
        <Collapse in={debugMode}>
          <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2">Datos completos del medio:</Typography>
            <Box 
              component="pre"
              sx={{ 
                mt: 1, 
                p: 1, 
                bgcolor: 'grey.100', 
                borderRadius: 1, 
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: 200
              }}
            >
              {JSON.stringify(selectedMedia, null, 2)}
            </Box>
          </Paper>
        </Collapse>
      </Grid>
    )}
  </Grid>
</DialogContent>
            
            <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 3 }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteMedia}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </Button>
              
              <Box>
                {/* Opciones de cambio de rol según el tipo de medio */}
                {selectedMedia.dish_id && (
                  <>
                    {/* Si es video y no es video principal */}
                    {selectedMedia.media_type === 'video' && selectedMedia.role !== 'PRIMARY_VIDEO' && (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<VideoFileIcon />}
                        onClick={() => handleUpdateRole('PRIMARY_VIDEO')}
                        disabled={updateRoleMutation.isPending}
                        sx={{ mr: 1 }}
                      >
                        Establecer como video principal
                      </Button>
                    )}
                    
                    {/* Si es imagen y no es imagen principal */}
                    {selectedMedia.media_type === 'image' && selectedMedia.role !== 'PRIMARY_IMAGE' && (
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<PhotoCameraIcon />}
                        onClick={() => handleUpdateRole('PRIMARY_IMAGE')}
                        disabled={updateRoleMutation.isPending}
                        sx={{ mr: 1 }}
                      >
                        Establecer como imagen principal
                      </Button>
                    )}
                    
                    {/* Si no es imagen de galería */}
                    {selectedMedia.role !== 'GALLERY_IMAGE' && (
                      <Button
                        variant="outlined"
                        color="info"
                        startIcon={<GalleryIcon />}
                        onClick={() => handleUpdateRole('GALLERY_IMAGE')}
                        disabled={updateRoleMutation.isPending}
                        sx={{ mr: 1 }}
                      >
                        Mover a galería
                      </Button>
                    )}
                  </>
                )}
                
                <Button
                  variant="contained"
                  onClick={() => setPreviewDialogOpen(false)}
                >
                  Cerrar
                </Button>
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Menú de opciones para medios */}
      <Menu
  anchorEl={anchorEl}
  open={Boolean(anchorEl)}
  onClose={handleMenuClose}
>
  <MenuItem onClick={() => {
    handlePreviewMedia(selectedMedia);
    handleMenuClose();
  }}>
    <ListItemIcon>
      <EyeIcon fontSize="small" />
    </ListItemIcon>
    <ListItemText primary="Ver detalles" />
  </MenuItem>
  
  {/* Opciones condicionales sin usar Fragment */}
  {selectedMedia?.dish_id && selectedMedia?.media_type === 'video' && selectedMedia?.role !== 'PRIMARY_VIDEO' && (
    <MenuItem onClick={() => {
      handleUpdateRole('PRIMARY_VIDEO');
      handleMenuClose();
    }}>
      <ListItemIcon>
        <VideoFileIcon fontSize="small" color="error" />
      </ListItemIcon>
      <ListItemText primary="Establecer como video principal" />
    </MenuItem>
  )}
  
  {selectedMedia?.dish_id && selectedMedia?.media_type === 'image' && selectedMedia?.role !== 'PRIMARY_IMAGE' && (
    <MenuItem onClick={() => {
      handleUpdateRole('PRIMARY_IMAGE');
      handleMenuClose();
    }}>
      <ListItemIcon>
        <PhotoCameraIcon fontSize="small" color="primary" />
      </ListItemIcon>
      <ListItemText primary="Establecer como imagen principal" />
    </MenuItem>
  )}
  
  {selectedMedia?.dish_id && selectedMedia?.role !== 'GALLERY_IMAGE' && (
    <MenuItem onClick={() => {
      handleUpdateRole('GALLERY_IMAGE');
      handleMenuClose();
    }}>
      <ListItemIcon>
        <GalleryIcon fontSize="small" color="info" />
      </ListItemIcon>
      <ListItemText primary="Mover a galería" />
    </MenuItem>
  )}
  
  <MenuItem onClick={() => {
    navigator.clipboard.writeText(selectedMedia.url);
    setSnackbar({
      open: true,
      message: 'URL copiada al portapapeles',
      severity: 'success'
    });
    handleMenuClose();
  }}>
    <ListItemIcon>
      <LinkIcon fontSize="small" />
    </ListItemIcon>
    <ListItemText primary="Copiar URL" />
  </MenuItem>
  
  <Divider />
  
  <MenuItem onClick={handleDeleteMedia} sx={{ color: 'error.main' }}>
    <ListItemIcon>
      <DeleteIcon fontSize="small" color="error" />
    </ListItemIcon>
    <ListItemText primary="Eliminar" />
  </MenuItem>
</Menu>
      
      {/* Panel de filtros móvil */}
      <Dialog
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Filtrar medios</Typography>
            <IconButton size="small" onClick={() => setMobileFilterOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={2}>
            <TextField
              label="Buscar"
              fullWidth
              size="small"
              variant="outlined"
              value={filter.searchTerm}
              onChange={(e) => handleChangeFilter('searchTerm', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
            />
            
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de archivo</InputLabel>
              <Select
                value={filter.mediaType}
                label="Tipo de archivo"
                onChange={(e) => handleChangeFilter('mediaType', e.target.value)}
              >
                <MenuItem value="all">Todos los archivos</MenuItem>
                <MenuItem value="image">Sólo imágenes</MenuItem>
                <MenuItem value="video">Sólo videos</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth size="small">
              <InputLabel>Rol</InputLabel>
              <Select
                value={filter.role}
                label="Rol"
                onChange={(e) => handleChangeFilter('role', e.target.value)}
              >
                <MenuItem value="all">Todos los roles</MenuItem>
                <MenuItem value="PRIMARY_VIDEO">Videos principales</MenuItem>
                <MenuItem value="PRIMARY_IMAGE">Imágenes principales</MenuItem>
                <MenuItem value="GALLERY_IMAGE">Imágenes de galería</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth size="small">
              <InputLabel>Plato</InputLabel>
              <Select
                value={filter.dishId}
                label="Plato"
                onChange={(e) => handleChangeFilter('dishId', e.target.value)}
                disabled={isLoadingDishes}
              >
                <MenuItem value="">Todos los platos</MenuItem>
                {Array.isArray(dishes) && dishes.map((dish) => (
                  <MenuItem key={dish.id} value={dish.id}>
                    {(dish.translations?.name?.es) || dish.name || dish.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        
        <DialogActions>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => {
              setFilter({
                searchTerm: '',
                mediaType: 'all',
                dishId: '',
                role: 'all'
              });
              setMediaTab('all');
            }}
          >
            Limpiar filtros
          </Button>
          
          <Button
            variant="contained"
            fullWidth
            onClick={() => setMobileFilterOpen(false)}
          >
            Aplicar filtros
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de ayuda */}
      <Dialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
        maxWidth="md"
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <InfoIcon sx={{ mr: 1 }} color="info" />
            <Typography variant="h6">Gestión de medios - Guía rápida</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Tipos de medios
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    height: '100%'
                  }}
                >
                  <VideoFileIcon fontSize="large" color="error" sx={{ mb: 1 }} />
                  <Typography variant="subtitle2" fontWeight="bold">
                    Video Principal
                  </Typography>
                  <Typography variant="body2">
                    Se muestra en la vista de reels. Cada plato puede tener solo un video principal.
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    height: '100%'
                  }}
                >
                  <PhotoCameraIcon fontSize="large" color="primary" sx={{ mb: 1 }} />
                  <Typography variant="subtitle2" fontWeight="bold">
                    Imagen Principal
                  </Typography>
                  <Typography variant="body2">
                    Se usa como thumbnail cuando el video no puede reproducirse. Cada plato puede tener solo una imagen principal.
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    height: '100%'
                  }}
                >
                  <GalleryIcon fontSize="large" color="info" sx={{ mb: 1 }} />
                  <Typography variant="subtitle2" fontWeight="bold">
                    Imágenes de Galería
                  </Typography>
                  <Typography variant="body2">
                    Imágenes adicionales para mostrar más detalles del plato. Un plato puede tener múltiples imágenes en su galería.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Recomendaciones
            </Typography>
            <ul>
              <li>
                <Typography variant="body2">
                  <strong>Videos:</strong> Duración recomendada de 5-15 segundos. Formato vertical (9:16) para mejor experiencia en móviles.
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Imágenes principales:</strong> Mismas proporciones que los videos (9:16 o 3:4) para evitar recortes.
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Mejor práctica:</strong> Sube siempre tanto un video principal como una imagen principal para cada plato.
                </Typography>
              </li>
            </ul>
          </Box>
          
          <Box>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Acciones disponibles
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                  <EyeIcon fontSize="small" sx={{ mb: 0.5 }} />
                  <Typography variant="body2">Ver detalles</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                  <LinkIcon fontSize="small" sx={{ mb: 0.5 }} />
                  <Typography variant="body2">Copiar URL</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                  <VideoFileIcon fontSize="small" sx={{ mb: 0.5 }} color="error" />
                  <Typography variant="body2">Establecer como video principal</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                  <PhotoCameraIcon fontSize="small" sx={{ mb: 0.5 }} color="primary" />
                  <Typography variant="body2">Establecer como imagen principal</Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)} variant="contained">
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}