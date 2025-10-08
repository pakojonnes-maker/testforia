import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/apiClient';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  DialogContentText,
  CircularProgress,
  Chip,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  SaveAlt as SaveOrderIcon,
  TouchApp as TouchIcon,
} from '@mui/icons-material';

// Componente para un elemento arrastrable
function SortableItem({section, index, onEdit, onDelete, isMobile}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({id: section.id});
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    backgroundColor: isDragging ? 'action.selected' : 'inherit',
    '&:hover': { bgcolor: 'action.hover' },
    // Mayor padding para dedos en móvil
    py: isMobile ? 1.5 : 1,
  };

  return (
    <>
      {index > 0 && <Divider />}
      <ListItem 
        ref={setNodeRef}
        sx={style}
      >
        <Box 
          {...attributes}
          {...listeners}
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mr: 1,
            cursor: 'grab',
            // Área de toque mayor en móvil
            p: isMobile ? 1 : 0.5,
            // Indicador visual para móviles
            border: isMobile ? '1px dashed' : 'none',
            borderColor: 'divider',
            borderRadius: 1,
            minWidth: isMobile ? 50 : 'auto',
          }}
          role="button"
          aria-label="Arrastrar para reordenar"
        >
          {isMobile ? <TouchIcon color="action" /> : <DragIcon color="action" />}
          <Chip 
            label={`#${index + 1}`} 
            size={isMobile ? "medium" : "small"} 
            color="primary"
            variant="outlined"
            sx={{ ml: 1 }}
          />
        </Box>
        
        <ListItemText 
          primary={section.translations?.name?.es || 'Sin nombre'} 
          secondary={
            <>
              {section.menu_name} - {section.dish_count} platos
              {!isMobile && section.translations?.name?.en && ` - Inglés: ${section.translations.name.en}`}
            </>
          } 
          primaryTypographyProps={{
            fontSize: isMobile ? '1rem' : 'inherit'
          }}
          sx={{
            // Menos texto en móvil para dar más espacio
            maxWidth: isMobile ? '50%' : '70%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        />
        <ListItemSecondaryAction>
          <IconButton 
            edge="end" 
            aria-label="edit" 
            onClick={() => onEdit(section)}
            sx={{ 
              // Mayor tamaño en móvil para facilitar toque
              p: isMobile ? 1.5 : 1 
            }}
          >
            <EditIcon />
          </IconButton>
          <IconButton 
            edge="end" 
            aria-label="delete" 
            sx={{ 
              ml: 1,
              p: isMobile ? 1.5 : 1
            }}
            onClick={() => onDelete(section)}
            disabled={section.dish_count > 0}
          >
            <DeleteIcon />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
    </>
  );
}

export default function SectionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = user?.currentRestaurant?.id;
  
  // Detectar si es móvil
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Estados para la UI
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [selectedMenuId, setSelectedMenuId] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [orderedSections, setOrderedSections] = useState([]);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [showHelpToast, setShowHelpToast] = useState(isMobile);

  // Configuración de sensores optimizada para móvil y desktop
  const sensors = useSensors(
    // Sensor específico para pantallas táctiles con configuración optimizada
    useSensor(TouchSensor, {
      // Prevenir scroll mientras se arrastra
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    // Sensor para ratón
    useSensor(PointerSensor, {
      // Solo activar en botón primario (click izquierdo)
      activationConstraint: {
        distance: 10,
      },
    }),
    // Soporte de teclado para accesibilidad
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Consultas
  const {
    data: sections,
    isLoading: isLoadingSections,
    error: sectionsError
  } = useQuery({
    queryKey: ['sections', restaurantId],
    queryFn: () => apiClient.getSections(restaurantId),
    enabled: !!restaurantId
  });

  // Efecto para inicializar las secciones ordenadas cuando los datos están disponibles
  useEffect(() => {
    if (sections && sections.length > 0) {
      // Asegurarse de ordenar por order_index
      const sorted = [...sections].sort((a, b) => a.order_index - b.order_index);
      setOrderedSections(sorted);
    } else {
      setOrderedSections([]);
    }
  }, [sections]);

  // Mostrar ayuda en móviles al cargar
  useEffect(() => {
    if (isMobile) {
      setShowHelpToast(true);
      // Ocultar después de 6 segundos
      const timer = setTimeout(() => {
        setShowHelpToast(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  const {
    data: menus,
    isLoading: isLoadingMenus,
  } = useQuery({
    queryKey: ['menus', restaurantId],
    queryFn: () => apiClient.getMenus(restaurantId),
    enabled: !!restaurantId,
  });

  // Mutaciones
  const createSectionMutation = useMutation({
    mutationFn: (sectionData) => {
      return apiClient.createSection(sectionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sections', restaurantId]);
      setSnackbar({
        open: true,
        message: 'Sección creada correctamente',
        severity: 'success',
      });
      handleCloseDialog();
      setHasOrderChanged(false);
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error: ${error?.response?.data?.message || 'No se pudo crear la sección'}`,
        severity: 'error',
      });
    }
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ sectionId, data }) => {
      return apiClient.updateSection(sectionId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sections', restaurantId]);
      setSnackbar({
        open: true,
        message: 'Sección actualizada correctamente',
        severity: 'success',
      });
      handleCloseDialog();
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error: ${error?.response?.data?.message || 'No se pudo actualizar la sección'}`,
        severity: 'error',
      });
    }
  });

  const updateSectionsOrderMutation = useMutation({
    mutationFn: (updatedSections) => {
      // Esta función debe hacer una llamada a tu API para actualizar el orden de las secciones
      return Promise.all(
        updatedSections.map((section, index) => 
          apiClient.updateSection(section.id, {
            restaurant_id: restaurantId,
            menu_id: section.menu_id,
            order_index: index + 1
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sections', restaurantId]);
      setSnackbar({
        open: true,
        message: 'Orden actualizado correctamente',
        severity: 'success',
      });
      setHasOrderChanged(false);
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error: ${error?.message || 'No se pudo actualizar el orden'}`,
        severity: 'error',
      });
    }
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (sectionId) => {
      return apiClient.deleteSection(sectionId, restaurantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sections', restaurantId]);
      setSnackbar({
        open: true,
        message: 'Sección eliminada correctamente',
        severity: 'success',
      });
      handleCloseDeleteDialog();
      setHasOrderChanged(false);
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error: ${error?.response?.data?.message || 'No se pudo eliminar la sección'}`,
        severity: 'error',
      });
      handleCloseDeleteDialog();
    }
  });

  const handleOpenDialog = (section = null) => {
    if (section) {
      setEditSection(section);
      setName(section.translations?.name?.es || '');
      setNameEn(section.translations?.name?.en || '');
      setSelectedMenuId(section.menu_id);
    } else {
      setEditSection(null);
      setName('');
      setNameEn('');
      setSelectedMenuId(menus?.[0]?.id || '');
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditSection(null);
  };

  const handleOpenDeleteDialog = (section) => {
    setSectionToDelete(section);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSectionToDelete(null);
  };

  const handleSaveSection = () => {
    if (!name.trim()) {
      setSnackbar({
        open: true,
        message: 'El nombre en español es obligatorio',
        severity: 'error',
      });
      return;
    }

    const sectionData = {
      restaurant_id: restaurantId,
      menu_id: selectedMenuId,
      translations: {
        name: {
          es: name.trim(),
        },
        description: {}
      }
    };

    // Añadir nombre en inglés si existe
    if (nameEn.trim()) {
      sectionData.translations.name.en = nameEn.trim();
    }

    if (editSection) {
      updateSectionMutation.mutate({
        sectionId: editSection.id,
        data: {
          ...sectionData,
          order_index: editSection.order_index
        }
      });
    } else {
      createSectionMutation.mutate(sectionData);
    }
  };

  const handleDeleteSection = () => {
    if (sectionToDelete) {
      deleteSectionMutation.mutate(sectionToDelete.id);
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setOrderedSections((sections) => {
        const oldIndex = sections.findIndex(s => s.id === active.id);
        const newIndex = sections.findIndex(s => s.id === over.id);
        
        const newSections = arrayMove(sections, oldIndex, newIndex);
        setHasOrderChanged(true);
        return newSections;
      });
    }
    
    setActiveId(null);
  };

  const handleSaveOrder = () => {
    updateSectionsOrderMutation.mutate(orderedSections);
  };

  const isSubmitting = createSectionMutation.isPending || updateSectionMutation.isPending;
  const isDeleting = deleteSectionMutation.isPending;
  const isUpdatingOrder = updateSectionsOrderMutation.isPending;

  if (isLoadingSections || isLoadingMenus) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Secciones del menú
        </Typography>
        <LinearProgress />
      </Container>
    );
  }

  if (sectionsError) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Secciones del menú
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          Error al cargar las secciones: {sectionsError.message}
        </Alert>
        <Button
          variant="contained"
          onClick={() => queryClient.invalidateQueries(['sections', restaurantId])}
          sx={{ mt: 2 }}
        >
          Reintentar
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ px: isMobile ? 1 : 2 }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'center', 
        mb: 2 
      }}>
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          component="h1"
          sx={{ mb: isMobile ? 2 : 0 }}
        >
          Secciones del menú
        </Typography>
        <Box sx={{ 
          display: 'flex',
          width: isMobile ? '100%' : 'auto',
        }}>
          {hasOrderChanged && (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<SaveOrderIcon />}
              onClick={handleSaveOrder}
              disabled={isUpdatingOrder}
              sx={{ 
                mr: 2,
                flex: isMobile ? 1 : 'auto'
              }}
              fullWidth={isMobile}
            >
              {isUpdatingOrder ? 'Guardando...' : 'Guardar orden'}
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            fullWidth={isMobile && !hasOrderChanged}
            sx={{ flex: isMobile ? 1 : 'auto' }}
          >
            {isMobile ? 'Nueva' : 'Nueva sección'}
          </Button>
        </Box>
      </Box>

      <Alert 
        severity="info" 
        sx={{ 
          mb: 3,
          fontSize: isMobile ? '0.875rem' : 'inherit'
        }}
        action={
          isMobile && (
            <IconButton size="small" color="info">
              <TouchIcon />
            </IconButton>
          )
        }
      >
        {isMobile ? 
          'Mantén presionado y arrastra para cambiar el orden' : 
          'Arrastra las secciones para cambiar el orden en que aparecerán en el menú'}
      </Alert>

      <Paper elevation={2} sx={{ overflow: 'hidden' }}>
        <List 
          sx={{ 
            bgcolor: 'background.paper',
            px: 0
          }}
          dense={isMobile}
        >
          {orderedSections && orderedSections.length > 0 ? (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={orderedSections.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {orderedSections.map((section, index) => (
                  <SortableItem 
                    key={section.id} 
                    section={section} 
                    index={index}
                    onEdit={handleOpenDialog}
                    onDelete={handleOpenDeleteDialog}
                    isMobile={isMobile}
                  />
                ))}
              </SortableContext>
              <DragOverlay>
                {activeId ? (
                  <ListItem sx={{ 
                    bgcolor: 'background.paper', 
                    boxShadow: 3,
                    borderRadius: 1,
                    width: isMobile ? '90vw' : 400
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mr: 1,
                      p: 1,
                      border: '1px dashed',
                      borderColor: 'primary.main',
                      borderRadius: 1
                    }}>
                      {isMobile ? <TouchIcon color="primary" /> : <DragIcon color="primary" />}
                      <Chip 
                        label={`#${orderedSections.findIndex(s => s.id === activeId) + 1}`} 
                        size="small" 
                        color="primary"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                    <ListItemText 
                      primary={orderedSections.find(s => s.id === activeId)?.translations?.name?.es || 'Sin nombre'} 
                    />
                  </ListItem>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <ListItem>
              <ListItemText 
                primary="No hay secciones" 
                secondary="Añade secciones para organizar los platos de tu menú" 
              />
            </ListItem>
          )}
        </List>
      </Paper>

      {/* Diálogo para crear/editar sección */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          {editSection ? 'Editar sección' : 'Nueva sección'}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel id="menu-select-label">Menú</InputLabel>
<Select
  labelId="menu-select-label"
  value={selectedMenuId}
  label="Menú"
  onChange={(e) => setSelectedMenuId(e.target.value)}
>
  {Array.isArray(menus) ? menus.map((menu) => (
    <MenuItem key={menu.id} value={menu.id}>
      {menu.name} {menu.is_default && '(Predeterminado)'}
    </MenuItem>
  )) : (
    <MenuItem disabled>Cargando menús...</MenuItem>
  )}
</Select>
          </FormControl>

          <TextField
            autoFocus={!isMobile}
            margin="dense"
            label="Nombre (Español) *"
            type="text"
            fullWidth
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            error={!name.trim()}
            helperText={!name.trim() ? 'El nombre es obligatorio' : ''}
            sx={{ mt: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Nombre (Inglés)"
            type="text"
            fullWidth
            variant="outlined"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: isMobile ? 3 : 2, pb: isMobile ? 4 : 2 }}>
          <Button onClick={handleCloseDialog} fullWidth={isMobile}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveSection}
            variant="contained"
            disabled={!name.trim() || isSubmitting || !selectedMenuId}
            fullWidth={isMobile}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación para eliminar */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={handleCloseDeleteDialog}
        fullScreen={isMobile}
      >
        <DialogTitle>Eliminar sección</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar la sección <strong>{sectionToDelete?.translations?.name?.es}</strong>?
            {sectionToDelete?.dish_count > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Esta sección contiene {sectionToDelete.dish_count} platos. Debes moverlos a otra sección antes de eliminarla.
              </Alert>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: isMobile ? 3 : 2, pb: isMobile ? 4 : 2 }}>
          <Button 
            onClick={handleCloseDeleteDialog}
            fullWidth={isMobile}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteSection} 
            color="error" 
            disabled={isDeleting || (sectionToDelete?.dish_count > 0)}
            fullWidth={isMobile}
          >
            {isDeleting ? <CircularProgress size={24} /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para mensajes */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ 
          vertical: 'bottom', 
          horizontal: isMobile ? 'center' : 'right'
        }}
        sx={{ bottom: isMobile ? '20px !important' : undefined }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Toast de ayuda específico para móviles */}
      <Snackbar
        open={showHelpToast}
        autoHideDuration={6000}
        onClose={() => setShowHelpToast(false)}
        anchorOrigin={{ 
          vertical: 'top', 
          horizontal: 'center'
        }}
        sx={{ mt: isMobile ? 1 : 0 }}
      >
        <Alert 
          onClose={() => setShowHelpToast(false)} 
          severity="info"
          icon={<TouchIcon />}
          sx={{ width: '100%' }}
        >
          Mantén presionado un elemento para arrastrarlo
        </Alert>
      </Snackbar>
    </Container>
  );
}