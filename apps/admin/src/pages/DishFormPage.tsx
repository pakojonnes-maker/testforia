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
  Switch,
  MenuItem,
  Autocomplete,
  Chip,
  Button,
  IconButton,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  Avatar,
  Stack,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  ErrorOutline as ErrorOutlineIcon,
} from '@mui/icons-material';

// Esquema de validación con Zod - SOLO campos básicos
const dishSchema = z.object({
  // Campos básicos
  status: z.enum(['active', 'out_of_stock', 'seasonal', 'hidden']),
  is_vegetarian: z.boolean().default(false),
  is_vegan: z.boolean().default(false),
  is_gluten_free: z.boolean().default(false),
  is_new: z.boolean().default(false),
  is_featured: z.boolean().default(false),

  // Traducciones básicas (solo español)
  translations: z.object({
    name: z.object({
      es: z.string().min(1, 'El nombre es obligatorio')
    }),
    description: z.object({
      es: z.string()
    })
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

  // Estados UI
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Consultas para cargar datos
  const {
    data: dish,
    isLoading: isLoadingDish,
    error: dishError,
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

  // Setup del formulario con React Hook Form
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty, isSubmitting }
  } = useForm<DishFormData>({
    resolver: zodResolver(dishSchema),
    defaultValues: {
      status: 'active',
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: false,
      is_new: false,
      is_featured: false,
      translations: {
        name: { es: '' },
        description: { es: '' }
      },
      section_ids: [],
      allergen_ids: [],
    }
  });

  // Cuando el plato se carga (en modo edición), actualizar el formulario
  useEffect(() => {
    if (dish && isEditMode) {
      setValue('status', dish.status);
      setValue('is_vegetarian', dish.is_vegetarian);
      setValue('is_vegan', dish.is_vegan);
      setValue('is_gluten_free', dish.is_gluten_free);
      setValue('is_new', dish.is_new);
      setValue('is_featured', dish.is_featured);
      setValue('translations', {
        name: { es: dish.translations?.name?.es || '' },
        description: { es: dish.translations?.description?.es || '' }
      });
      setValue('section_ids', dish.section_ids || []);
      setValue('allergen_ids', dish.allergens?.map(a => a.id) || []);
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
      queryClient.invalidateQueries({ queryKey: ['dishes', restaurantId] });
      if (isEditMode) {
        queryClient.invalidateQueries({ queryKey: ['dish', id] });
      }

      setSnackbar({
        open: true,
        message: isEditMode ? 'Plato actualizado correctamente' : 'Plato creado correctamente',
        severity: 'success'
      });

      if (!isEditMode && response?.dishId) {
        navigate(`/dishes/${response.dishId}`);
      }
    },
    onError: (error: any) => {
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
    onError: (error: any) => {
      console.error('Error al eliminar:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error?.response?.data?.message || 'Error desconocido'}`,
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

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      {/* Header */}
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
              {isMobile ? 'Eliminar' : 'Eliminar'}
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

      {/* Formulario - SOLO PESTAÑA GENERAL */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4, borderRadius: { xs: 1, sm: 2 } }}>
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
                        const { key, ...tagProps } = getTagProps({ index });
                        return (
                          <Chip
                            key={key}
                            label={option.translations?.name?.es || 'Sin nombre'}
                            {...tagProps}
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

          {/* Nombre en español */}
          <Grid item xs={12}>
            <Controller
              name="translations.name.es"
              control={control}
              rules={{ required: 'El nombre en español es obligatorio' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Nombre del Plato"
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
                  label="Descripción"
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

          {/* Características */}
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

          {/* Alérgenos */}
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
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <li key={key} {...otherProps}>
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
                        </li>
                      );
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => {
                        const { key, ...tagProps } = getTagProps({ index });
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
                            {...tagProps}
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
            {/* Previsualización de alérgenos */}
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
      </Paper>

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
            Esta acción no se puede deshacer.
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
          severity={snackbar.severity}
          sx={{ width: '100%', boxShadow: 3 }}
          icon={snackbar.severity === 'success' ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
