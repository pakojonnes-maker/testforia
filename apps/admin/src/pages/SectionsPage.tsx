import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/apiClient';
import IconPicker from '../components/IconPicker';

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
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from '@mui/icons-material';

// Componente para un elemento de sección
function SectionItem({
  section,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  isMobile,
  isUpdating
}) {
  return (
    <>
      {index > 0 && <Divider />}
      <ListItem
        sx={{
          py: isMobile ? 2 : 1.5,
          bgcolor: 'background.paper',
          '&:hover': { bgcolor: 'action.hover' },
          transition: 'background-color 0.2s',
        }}
      >
        {/* Controles de ordenamiento */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            mr: 2,
            gap: isMobile ? 0.5 : 1
          }}
        >
          <IconButton
            size="small"
            onClick={() => onMoveUp(index)}
            disabled={index === 0 || isUpdating}
            color="primary"
            sx={{
              bgcolor: isMobile ? 'action.hover' : 'transparent',
              p: isMobile ? 1 : 0.5
            }}
          >
            <ArrowUpIcon fontSize="small" />
          </IconButton>

          <Chip
            label={`#${index + 1}`}
            size="small"
            variant="outlined"
            sx={{
              minWidth: 32,
              height: 24,
              fontSize: '0.75rem',
              fontWeight: 'bold',
              borderColor: 'divider'
            }}
          />

          <IconButton
            size="small"
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1 || isUpdating}
            color="primary"
            sx={{
              bgcolor: isMobile ? 'action.hover' : 'transparent',
              p: isMobile ? 1 : 0.5
            }}
          >
            <ArrowDownIcon fontSize="small" />
          </IconButton>
        </Box>

        <ListItemText
          primary={
            <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500 }}>
              {section.translations?.name?.es || 'Sin nombre'}
            </Typography>
          }
          secondary={
            <Stack component="span" spacing={0.5} sx={{ mt: 0.5 }}>
              <Typography variant="body2" component="span" color="text.secondary">
                {section.menu_name} • {section.dish_count} platos
              </Typography>
              {!isMobile && section.translations?.name?.en && (
                <Typography variant="caption" component="span" color="text.disabled">
                  Inglés: {section.translations.name.en}
                </Typography>
              )}
            </Stack>
          }
          sx={{
            my: 0,
            mr: 2
          }}
        />

        <ListItemSecondaryAction>
          <IconButton
            edge="end"
            aria-label="edit"
            onClick={() => onEdit(section)}
            sx={{ mr: 1 }}
          >
            <EditIcon />
          </IconButton>
          <IconButton
            edge="end"
            aria-label="delete"
            onClick={() => onDelete(section)}
            disabled={section.dish_count > 0}
            color={section.dish_count > 0 ? 'default' : 'error'}
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
  const { currentRestaurant } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = currentRestaurant?.id;

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
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [orderedSections, setOrderedSections] = useState([]);

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
      return Promise.all(
        updatedSections.map((section, index) =>
          apiClient.updateSection(section.id, {
            restaurant_id: restaurantId,
            menu_id: section.menu_id,
            order_index: index + 1,
            icon_url: section.icon_url,
            bg_color: section.bg_color,
            translations: section.translations
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sections', restaurantId]);
      // No mostramos snackbar para no saturar, la UI ya refleja el cambio
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error al guardar el orden: ${error?.message}`,
        severity: 'error',
      });
      // Revertir cambios en caso de error recargando
      queryClient.invalidateQueries(['sections', restaurantId]);
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
      setIconUrl(section.icon_url || null);
    } else {
      setEditSection(null);
      setName('');
      setNameEn('');
      setSelectedMenuId(menus?.[0]?.id || '');
      setIconUrl(null);
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
      icon_url: iconUrl || null,
      translations: {
        name: {
          es: name.trim(),
        },
        description: {}
      }
    };

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

  // Lógica de reordenamiento manual
  const moveSection = (index, direction) => {
    if (isUpdatingOrder) return; // Evitar múltiples clics rápidos

    const newSections = [...orderedSections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // Verificar límites
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    // Intercambiar elementos
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];

    // Actualizar estado local inmediatamente (optimista)
    setOrderedSections(newSections);

    // Enviar al servidor
    updateSectionsOrderMutation.mutate(newSections);
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
    <Container maxWidth="md" sx={{ px: isMobile ? 1 : 2, pb: 10 }}>
      <Box sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        mb: 3,
        mt: 2
      }}>
        <Box>
          <Typography
            variant={isMobile ? "h5" : "h4"}
            component="h1"
            sx={{ fontWeight: 'bold' }}
          >
            Secciones
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Organiza las categorías de tu menú
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          fullWidth={isMobile}
          sx={{
            mt: isMobile ? 2 : 0,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: theme.shadows[2]
          }}
        >
          Nueva sección
        </Button>
      </Box>

      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          overflow: 'hidden',
          borderRadius: 2,
          bgcolor: 'background.paper'
        }}
      >
        <List sx={{ p: 0 }}>
          {orderedSections && orderedSections.length > 0 ? (
            orderedSections.map((section, index) => (
              <SectionItem
                key={section.id}
                section={section}
                index={index}
                total={orderedSections.length}
                onMoveUp={() => moveSection(index, 'up')}
                onMoveDown={() => moveSection(index, 'down')}
                onEdit={handleOpenDialog}
                onDelete={handleOpenDeleteDialog}
                isMobile={isMobile}
                isUpdating={isUpdatingOrder}
              />
            ))
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" gutterBottom>
                No hay secciones creadas
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleOpenDialog()}
                startIcon={<AddIcon />}
              >
                Crear primera sección
              </Button>
            </Box>
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
        PaperProps={{
          sx: { borderRadius: isMobile ? 0 : 2 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>
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

          {/* Icon Picker */}
          <IconPicker
            value={iconUrl}
            onChange={setIconUrl}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleSaveSection}
            variant="contained"
            disabled={!name.trim() || isSubmitting || !selectedMenuId}
            sx={{ borderRadius: 2 }}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación para eliminar */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>Eliminar sección</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar la sección <strong>{sectionToDelete?.translations?.name?.es}</strong>?
          </DialogContentText>
          {sectionToDelete?.dish_count > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Esta sección contiene {sectionToDelete.dish_count} platos. Debes moverlos a otra sección antes de eliminarla.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDeleteDialog} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteSection}
            color="error"
            variant="contained"
            disabled={isDeleting || (sectionToDelete?.dish_count > 0)}
            sx={{ borderRadius: 2 }}
          >
            {isDeleting ? <CircularProgress size={24} /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para mensajes */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center'
        }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
