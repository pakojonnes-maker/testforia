import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/apiClient'; // import nombrado para evitar error de default export
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import MultimediaTab from '../components/media/MultimediaTab';
import MenuManagementTab from '../components/menu/MenuManagementTab';



// MUI
import {
  Box, Button, Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, TextField, InputAdornment, Grid, Card, CardMedia, CardContent, CardActions,
  Alert, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Snackbar, CircularProgress, Skeleton, Fab, Avatar,
  useScrollTrigger, Zoom, ToggleButtonGroup, ToggleButton, Tabs, Tab,
} from '@mui/material';

// Icons
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  CheckCircle as ActiveIcon,
  Warning as InactiveIcon,
  SortByAlpha as SortIcon,
  Refresh as RefreshIcon,
  GridView as GridViewIcon,
  ViewList as ViewListIcon,
  DragIndicator as DragIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  Restaurant as RestaurantIcon,
  NewReleases as NewIcon,
  NaturePeople as VeganIcon,
  Spa as VegetarianIcon,
  DoNotTouch as GlutenFreeIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  AttachMoney as PriceIcon,
  ViewModule as SectionOrderIcon,
  PhotoLibrary as PhotoLibraryIcon,
} from '@mui/icons-material';

// ===== Helper para imagen de plato =====
const getDishDisplayImage = (dish: any) => {
  if (!dish) return '';
  const media = dish.media || [];

  // 1. Primary Image
  const primary = media.find((m: any) => m.role === 'PRIMARY_IMAGE' || m.is_primary);
  if (primary?.url) return primary.url;

  // 2. Gallery Image
  const gallery = media.find((m: any) => m.role === 'GALLERY_IMAGE' || m.type === 'image');
  if (gallery?.url) return gallery.url;

  // 3. Thumbnail
  if (dish.thumbnail_url) return dish.thumbnail_url;

  return '';
};

export default function DishesPage() {
  const navigate = useNavigate();
  const { currentRestaurant } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId =
    currentRestaurant?.id ??
    JSON.parse(localStorage.getItem('current_restaurant') || 'null')?.id ??
    undefined;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const trigger = useScrollTrigger({ disableHysteresis: true, threshold: 100 });

  // Filtros/orden
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(isMobile ? 'list' : 'grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [sortBy, setSortBy] = useState<'order_index' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'views'>('order_index');

  // Tab state
  const [currentTab, setCurrentTab] = useState(0);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dishToDelete, setDishToDelete] = useState<any>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'success' });

  // Queries
  const { data: dishes = [], isLoading, error, refetch } = useQuery({
    queryKey: ['dishes', restaurantId],
    queryFn: async () => {
      if (!restaurantId) throw new Error('No hay restaurante seleccionado');
      return apiClient.getDishes(restaurantId);
    },
    enabled: !!restaurantId,
  });

  // Mutaciones
  const deleteDishMutation = useMutation({
    mutationFn: (dishId: string) => apiClient.deleteDish(dishId, restaurantId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes', restaurantId] });
      setSnackbar({ open: true, message: 'Plato eliminado correctamente', severity: 'success' });
      setDeleteDialogOpen(false);
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: `Error: ${err?.response?.data?.message || 'No se pudo eliminar el plato'}`, severity: 'error' });
      setDeleteDialogOpen(false);
    },
  });

  // Handlers UI
  const handleFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => setFilterAnchorEl(e.currentTarget);
  const handleFilterClose = () => setFilterAnchorEl(null);
  const handleSortClick = (e: React.MouseEvent<HTMLButtonElement>) => setSortAnchorEl(e.currentTarget);
  const handleSortClose = () => setSortAnchorEl(null);
  const handleOpenDeleteDialog = (dish: any) => { setDishToDelete(dish); setDeleteDialogOpen(true); };
  const handleCloseDeleteDialog = () => { setDeleteDialogOpen(false); setDishToDelete(null); };
  const handleDeleteDish = () => { if (dishToDelete) deleteDishMutation.mutate(dishToDelete.id); };
  const handleEditDish = useCallback((dishId: string) => navigate(`/dishes/${dishId}`), [navigate]);

  // Dishes filtrados/ordenados para vista normal
  const filteredDishes = useMemo(() => {
    if (!dishes?.length) return [];
    return dishes.filter((dish: any) => {
      const searchMatch =
        !searchTerm ||
        dish?.translations?.name?.es?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dish?.translations?.name?.en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dish?.translations?.description?.es?.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch =
        filterStatus === 'all' ||
        (filterStatus === 'active' && dish?.status === 'active') ||
        (filterStatus === 'inactive' && dish?.status !== 'active');
      return searchMatch && statusMatch;
    });
  }, [dishes, searchTerm, filterStatus]);

  const sortedAndFilteredDishes = useMemo(() => {
    const arr = [...filteredDishes];
    return arr.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'name_asc': return (a?.translations?.name?.es || '').localeCompare(b?.translations?.name?.es || '');
        case 'name_desc': return (b?.translations?.name?.es || '').localeCompare(a?.translations?.name?.es || '');
        case 'price_asc': return (a?.price || 0) - (b?.price || 0);
        case 'price_desc': return (b?.price || 0) - (a?.price || 0);
        case 'views': return (b?.view_count || 0) - (a?.view_count || 0);
        case 'order_index':
        default: return 0;
      }
    });
  }, [filteredDishes, sortBy]);

  const totalCount = dishes?.length || 0;
  const filteredCount = sortedAndFilteredDishes?.length || 0;

  // UI estados de carga/error
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1">Platos</Typography>
          <Skeleton variant="rounded" width={120} height={36} />
        </Box>
        <Skeleton variant="rounded" height={40} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Skeleton variant="text" width={100} />
          <Skeleton variant="text" width={150} />
        </Box>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {Array.from({ length: isMobile ? 3 : 6 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={300} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1">Platos</Typography>
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={() => refetch()}>Reintentar</Button>
        </Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600}>Error al cargar los platos</Typography>
          <Typography variant="body2">{(error as any)?.message}</Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, pb: 2 }}>
      {/* Sistema de Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Platos" icon={<RestaurantIcon />} iconPosition="start" />
          <Tab label="Gestionar Menú" icon={<SectionOrderIcon />} iconPosition="start" />
          <Tab label="Multimedia" icon={<PhotoLibraryIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab 0: Header Platos */}
      {currentTab === 0 && (
        <Box sx={{
          display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 3, gap: 2,
        }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Platos
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => navigate('/dishes/new')}>
              {isMobile ? 'Nuevo' : 'Nuevo plato'}
            </Button>
          </Box>
        </Box>
      )}

      {/* Tab 1: Header Gestionar Menú */}
      {currentTab === 1 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
            Gestión de menú
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Organiza tus menús, secciones y platos
          </Typography>
        </Box>
      )}

      {/* Tab 2: Header Multimedia */}
      {currentTab === 2 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
            Multimedia
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestiona imágenes y videos de tus platos
          </Typography>
        </Box>
      )}

      {/* Barra de búsqueda y filtros (solo fuera de modo ordenar) */}
      {currentTab === 0 && (
        <Paper sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: 2 }} elevation={1}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={5}>
              <TextField
                variant="outlined" size="small" placeholder="Buscar platos..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start"><SearchIcon /></InputAdornment>
                  ),
                  endAdornment: searchTerm ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 28 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={7}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  startIcon={<ActiveIcon />}
                  variant="outlined"
                  size="small"
                  onClick={(e) => handleFilterClick(e as any)}
                  color={filterStatus !== 'all' ? 'secondary' : 'inherit'}
                  sx={{ borderRadius: 28, textTransform: 'none' }}
                >
                  Filtrar
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={(e) => handleSortClick(e as any)}
                  sx={{ borderRadius: 28, textTransform: 'none' }}
                >
                  Ordenar
                </Button>
                <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small" sx={{ ml: 1 }}>
                  <ToggleButton value="grid"><GridViewIcon fontSize="small" /></ToggleButton>
                  <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Mostrando {filteredCount} de {totalCount} platos
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {filterStatus !== 'all' && <Chip label={filterStatus === 'active' ? 'Activos' : 'Inactivos'} size="small" onDelete={() => setFilterStatus('all')} color="secondary" />}
              {searchTerm && <Chip label={`Búsqueda: ${searchTerm}`} size="small" onDelete={() => setSearchTerm('')} />}
              {(filterStatus !== 'all' || searchTerm) && (
                <Button size="small" variant="text" onClick={() => { setSearchTerm(''); setFilterStatus('all'); }} sx={{ ml: 0.5 }}>
                  Limpiar todo
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      )}

      {/* Contenido Tab 1: Gestión de Menú */}
      {currentTab === 1 && restaurantId && (
        <MenuManagementTab restaurantId={restaurantId} />
      )}

      {currentTab === 0 && (
        <Box sx={{ mb: 4 }}>
          {viewMode === 'grid' ? (
            <Grid container spacing={3}>
              {sortedAndFilteredDishes.map((dish: any) => (
                <Grid item xs={12} sm={6} md={4} key={dish.id}>
                  {/* Card de vista normal simple */}
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden' }}>
                    <CardMedia component="div" sx={{
                      height: 180, backgroundImage: `url(${getDishDisplayImage(dish)})`,
                      backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundColor: '#f5f5f5'
                    }} />
                    <CardContent sx={{ flexGrow: 1, pt: 2 }}>
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }} noWrap>
                        {dish?.translations?.name?.es || 'Sin nombre'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{
                        mb: 1.5, display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, textOverflow: 'ellipsis', height: '4.5em'
                      }}>
                        {dish?.translations?.description?.es || 'Sin descripción'}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2, pt: 0 }}>
                      <Button size="small" variant="outlined" onClick={() => handleEditDish(dish.id)} startIcon={<EditIcon />}>Editar</Button>
                      <IconButton size="small" color="error" onClick={() => handleOpenDeleteDialog(dish)}><DeleteIcon /></IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
              {filteredCount === 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                    <Typography variant="body1" sx={{ mb: 2 }}>No se encontraron platos que coincidan con los filtros aplicados.</Typography>
                    <Button variant="outlined" onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}>Limpiar filtros</Button>
                  </Paper>
                </Grid>
              )}
            </Grid>
          ) : (
            // Vista lista mobile-first
            <Box>
              {/* Vista móvil - Cards compactas */}
              {isMobile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {sortedAndFilteredDishes.map((dish: any) => (
                    <Paper
                      key={dish.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        '&:active': { bgcolor: 'action.selected' }
                      }}
                      onClick={() => handleEditDish(dish.id)}
                    >
                      <Avatar
                        src={getDishDisplayImage(dish)}
                        alt={dish?.translations?.name?.es}
                        variant="rounded"
                        sx={{ width: 56, height: 56, flexShrink: 0 }}
                      >
                        <RestaurantIcon />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap>
                          {dish?.translations?.name?.es || 'Sin nombre'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="body2" color="primary" fontWeight={600}>
                            {Number(dish?.price || 0).toFixed(2)} €
                          </Typography>
                          <Chip
                            label={dish?.status === 'active' ? 'Activo' : 'Inactivo'}
                            size="small"
                            color={dish?.status === 'active' ? 'success' : 'error'}
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => { e.stopPropagation(); handleOpenDeleteDialog(dish); }}
                          sx={{ p: 0.5 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Paper>
                  ))}
                  {filteredCount === 0 && (
                    <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        No se encontraron platos.
                      </Typography>
                    </Paper>
                  )}
                </Box>
              ) : (
                // Vista desktop - Tabla completa
                <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'background.default' }}>
                      <TableRow>
                        <TableCell width="35%">Nombre</TableCell>
                        <TableCell width="40%">Descripción</TableCell>
                        <TableCell align="right">Precio</TableCell>
                        <TableCell align="center">Estado</TableCell>
                        <TableCell align="right">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedAndFilteredDishes.map((dish: any) => (
                        <TableRow key={dish.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleEditDish(dish.id)}>
                          <TableCell component="th" scope="row">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar
                                src={getDishDisplayImage(dish)}
                                alt={dish?.translations?.name?.es}
                                variant="rounded" sx={{ width: 40, height: 40 }}
                              >
                                <RestaurantIcon />
                              </Avatar>
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {dish?.translations?.name?.es || 'Sin nombre'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{
                              overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.3em', maxHeight: '2.6em',
                            }}>
                              {dish?.translations?.description?.es || 'Sin descripción'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{Number(dish?.price || 0).toFixed(2)} €</TableCell>
                          <TableCell align="center">
                            {dish?.status === 'active'
                              ? <Chip label="Activo" size="small" color="success" variant="outlined" />
                              : <Chip label={dish?.status === 'out_of_stock' ? 'Agotado' : dish?.status === 'hidden' ? 'Oculto' : 'Inactivo'} size="small" color="error" variant="outlined" />}
                          </TableCell>
                          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                            <Button size="small" variant="outlined" onClick={() => handleEditDish(dish.id)} startIcon={<EditIcon />} sx={{ mr: 1 }}>Editar</Button>
                            <IconButton size="small" color="error" onClick={() => handleOpenDeleteDialog(dish)}><DeleteIcon /></IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredCount === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                            No se encontraron platos.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </Box >
      )}

      {
        currentTab === 2 && (
          <MultimediaTab restaurantId={restaurantId!} dishes={dishes} />
        )
      }


      {/* FABs eliminados - la navegación ahora es a través del header */}

      {/* Scroll to top en móvil/desktop */}
      <Zoom in={trigger}>
        <Fab
          color="default" size="small" aria-label="scroll back to top"
          sx={{
            position: 'fixed',
            bottom: isMobile ? 80 : 16,
            right: isMobile ? 16 : 76,
            zIndex: (t) => t.zIndex.appBar + 2
          }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <ArrowUpIcon />
        </Fab>
      </Zoom>

      {/* Menú de filtros desktop */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={handleFilterClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ elevation: 3, sx: { width: 200, mt: 0.5 } }}
      >
        <MenuItem onClick={() => { setFilterStatus('all'); handleFilterClose(); }} selected={filterStatus === 'all'}>
          <ListItemText primary="Todos los platos" />
        </MenuItem>
        <MenuItem onClick={() => { setFilterStatus('active'); handleFilterClose(); }} selected={filterStatus === 'active'}>
          <ListItemIcon><ActiveIcon fontSize="small" color="success" /></ListItemIcon>
          <ListItemText primary="Activos" />
        </MenuItem>
        <MenuItem onClick={() => { setFilterStatus('inactive'); handleFilterClose(); }} selected={filterStatus === 'inactive'}>
          <ListItemIcon><InactiveIcon fontSize="small" color="warning" /></ListItemIcon>
          <ListItemText primary="Inactivos" />
        </MenuItem>
      </Menu>

      {/* Menú de orden desktop */}
      <Menu
        anchorEl={sortAnchorEl}
        open={Boolean(sortAnchorEl)}
        onClose={handleSortClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ elevation: 3, sx: { width: 240, mt: 0.5 } }}
      >
        <MenuItem onClick={() => { setSortBy('order_index'); handleSortClose(); }} selected={sortBy === 'order_index'}>
          <ListItemIcon><DragIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Orden personalizado" />
        </MenuItem>
        <MenuItem onClick={() => { setSortBy('name_asc'); handleSortClose(); }} selected={sortBy === 'name_asc'}>
          <ListItemIcon><ArrowUpIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Nombre A-Z" />
        </MenuItem>
        <MenuItem onClick={() => { setSortBy('name_desc'); handleSortClose(); }} selected={sortBy === 'name_desc'}>
          <ListItemIcon><ArrowDownIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Nombre Z-A" />
        </MenuItem>
        <MenuItem onClick={() => { setSortBy('price_asc'); handleSortClose(); }} selected={sortBy === 'price_asc'}>
          <ListItemIcon><PriceIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Precio menor a mayor" />
        </MenuItem>
        <MenuItem onClick={() => { setSortBy('price_desc'); handleSortClose(); }} selected={sortBy === 'price_desc'}>
          <ListItemIcon><PriceIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} /></ListItemIcon>
          <ListItemText primary="Precio mayor a menor" />
        </MenuItem>
        <MenuItem onClick={() => { setSortBy('views'); handleSortClose(); }} selected={sortBy === 'views'}>
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Más vistos" />
        </MenuItem>
      </Menu>

      {/* Diálogo eliminar */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        PaperProps={{ sx: { borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteIcon color="error" />
            <Typography variant="h6">Confirmar eliminación</Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar el plato <b>{dishToDelete?.translations?.name?.es}</b>?
          </DialogContentText>
          <DialogContentText sx={{ mt: 2, color: 'error.main' }}>
            Esta acción no se puede deshacer y eliminará todas las imágenes y videos asociados.
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDeleteDialog} variant="outlined">Cancelar</Button>
          <Button
            onClick={handleDeleteDish}
            color="error"
            variant="contained"
            disabled={deleteDishMutation.isPending}
            startIcon={deleteDishMutation.isPending ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {deleteDishMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={(_, r) => {
          if (r === 'clickaway') return;
          setSnackbar((s) => ({ ...s, open: false }));
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container >
  );
}
