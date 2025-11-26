import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/apiClient'; // import nombrado para evitar error de default export
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import MultimediaTab from '../components/media/MultimediaTab';

// dnd-kit
import {
  DndContext,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// MUI
import {
  Box, Button, Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, TextField, InputAdornment, Grid, Card, CardMedia, CardContent, CardActions,
  Alert, AlertTitle, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Snackbar, CircularProgress, Skeleton, Fab, SwipeableDrawer, Divider, Avatar,
  useScrollTrigger, Zoom, ToggleButtonGroup, ToggleButton, alpha, Tabs, Tab,
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
  InfoOutlined as InfoIcon,
  PhotoLibrary as PhotoLibraryIcon,
} from '@mui/icons-material';

// ===== QuickHelpMenu =====
const QuickHelpMenu: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>
      <Box display="flex" alignItems="center" gap={1}>
        <InfoIcon color="primary" />
        Cómo reorganizar tu menú
      </Box>
    </DialogTitle>
    <DialogContent dividers>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom color="primary">Ordenar platos en una sección</Typography>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <DragIcon color="action" />
          <Typography>Arrastra y suelta los platos para cambiar su orden dentro de cada sección.</Typography>
        </Box>
      </Box>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom color="primary">Mover platos entre secciones</Typography>
        <Typography>Arrastra un plato y suéltalo sobre otra sección para moverlo; quedará al final de la sección destino.</Typography>
      </Box>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom color="primary">Guardar cambios</Typography>
        <Typography>Cuando termines, pulsa “Guardar orden” para aplicar los cambios.</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Los cambios no se guardarán hasta que confirmes pulsando “Guardar orden”.
        </Typography>
      </Box>
      <Alert severity="info" sx={{ mt: 2 }}>
        <AlertTitle>Consejo</AlertTitle>
        Las secciones vacías muestran un área punteada donde puedes soltar platos.
      </Alert>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 3 }}>
      <Button onClick={onClose} color="primary" variant="contained">Entendido</Button>
    </DialogActions>
  </Dialog>
);

// ===== Helper para imagen de plato =====
const getDishDisplayImage = (dish: any) => {
  if (!dish) return 'placeholder-dish.jpg';
  const media = dish.media || [];

  // 1. Primary Image
  const primary = media.find((m: any) => m.role === 'PRIMARY_IMAGE' || m.isprimary);
  if (primary?.url) return primary.url;

  // 2. Gallery Image
  const gallery = media.find((m: any) => m.role === 'GALLERY_IMAGE' || m.type === 'image');
  if (gallery?.url) return gallery.url;

  // 3. Thumbnail
  if (dish.thumbnailurl) return dish.thumbnailurl;

  return 'placeholder-dish.jpg';
};

// ===== Tarjeta ordenable con badge de orden =====
const SortableDishCard: React.FC<{
  dish: any;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  listeners?: any;
  attributes?: any;
  setNodeRef?: any;
  transform?: any;
  transition?: string;
  isDragging?: boolean;
}> = React.memo(({ dish, index, onEdit, onDelete, listeners, attributes, setNodeRef, transform, transition, isDragging }) => {
  const imageUrl = getDishDisplayImage(dish);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        borderRadius: 3,
        overflow: 'hidden',
        border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.12)}`,
        boxShadow: isDragging ? '0 16px 32px rgba(0,0,0,0.25)' : '0 8px 24px rgba(0,0,0,0.08)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 10px 28px rgba(0,0,0,0.12)' },
        cursor: 'grab',
        touchAction: 'none',
      }}
    >
      {/* Drag handle */}
      <Box
        {...attributes}
        {...listeners}
        sx={{
          position: 'absolute', top: 10, left: 10, zIndex: 12,
          bgcolor: 'rgba(0,0,0,0.55)', color: 'white', p: 0.5, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.75)', transform: 'scale(1.06)' }, transition: 'all 0.2s'
        }}
      >
        <DragIcon fontSize="small" />
      </Box>

      {/* Badge de orden */}
      <Box sx={{
        position: 'absolute', top: 10, left: 44, zIndex: 12,
        bgcolor: 'rgba(25,118,210,0.92)', color: '#fff',
        borderRadius: 1.5, px: 1, py: 0.25, fontSize: 12, fontWeight: 800,
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
      }}>
        {index + 1}
      </Box>

      <CardMedia
        component="div"
        sx={{
          height: 170,
          position: 'relative',
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0)), url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Estado y etiquetas */}
        {dish?.status !== 'active' && (
          <Chip
            label={dish?.status === 'outofstock' ? 'Agotado' : dish?.status === 'hidden' ? 'Oculto' : 'Inactivo'}
            size="small" color="error"
            sx={{ position: 'absolute', top: 8, right: 8, fontWeight: 'bold', backdropFilter: 'blur(4px)', background: 'rgba(211,47,47,0.8)' }}
          />
        )}
        {dish?.isnew && (
          <Chip
            label="Nuevo"
            size="small" color="secondary" icon={<NewIcon />}
            sx={{ position: 'absolute', top: 36, right: 8, fontWeight: 'bold', backdropFilter: 'blur(4px)', background: 'rgba(156,39,176,0.8)' }}
          />
        )}
        {/* Precio */}
        <Chip
          label={Number(dish?.price || 0).toFixed(2)}
          color="primary"
          sx={{ position: 'absolute', bottom: 8, right: 8, fontWeight: 'bold', backdropFilter: 'blur(4px)', background: 'rgba(25,118,210,0.85)', fontSize: '0.9rem' }}
        />
        {/* Dietas */}
        <Box sx={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: 0.5 }}>
          {dish?.isvegetarian && <Chip size="small" label="Veg" color="success" variant="outlined" />}
          {dish?.isvegan && <Chip size="small" label="Vegan" color="success" variant="outlined" />}
          {dish?.isglutenfree && <Chip size="small" label="SG" color="info" variant="outlined" />}
        </Box>
      </CardMedia>

      <CardContent sx={{ pt: 2, pb: 1 }}>
        <Typography variant="subtitle1" fontWeight={800} noWrap>
          {dish?.translations?.name?.es || 'Sin nombre'}
        </Typography>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2, pt: 0 }}>
        <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={onEdit}>Editar</Button>
        <IconButton size="small" color="error" onClick={onDelete}><DeleteIcon /></IconButton>
      </CardActions>
    </Card>
  );
});
// ===== Item ordenable que encapsula useSortable =====
const SortableDishItem: React.FC<{
  dish: any;
  index: number;
  sectionId: string;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ dish, index, sectionId, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: dish.id,
    data: { currentSectionId: sectionId },
  });

  return (
    <SortableDishCard
      dish={dish}
      index={index}
      onEdit={onEdit}
      onDelete={onDelete}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
      transform={transform}
      transition={transition}
      isDragging={isDragging}
    />
  );
};

// ===== Sección droppable con lista de platos ordenables =====
const DroppableSection: React.FC<{
  section: any;
  dishes: any[];
  onEditDish: (id: string) => void;
  onDeleteDish: (dish: any) => void;
  isMobile: boolean;
}> = ({ section, dishes, onEditDish, onDeleteDish, isMobile }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-${section.id}`,
    data: { type: 'section', sectionId: section.id },
  });

  return (
    <Box sx={{ mb: 4 }}>
      <Paper
        elevation={2}
        sx={{
          p: 2,
          backgroundColor: (t) =>
            t.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(0,0,0,0.02)',
          borderRadius: '8px 8px 0 0',
          borderBottom: '2px solid',
          borderColor: 'primary.main',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: isMobile ? 0 : 64,
          zIndex: 5,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          {section?.translations?.name?.es || 'Sin nombre'}
        </Typography>
        <Chip label={`${dishes.length} platos`} size="small" color="primary" />
      </Paper>

      <Box
        ref={setNodeRef}
        sx={{
          backgroundColor: isOver ? alpha('#1976d2', 0.08) : undefined,
          borderRadius: 2,
          p: 2,
          transition: 'background-color 0.2s ease',
          border: `2px ${isOver ? 'dashed' : 'solid'} ${isOver ? 'primary.main' : 'transparent'
            }`,
          minHeight: dishes.length === 0 ? 120 : 'auto',
        }}
      >
        {dishes.length > 0 ? (
          <SortableContext
            items={dishes.map((d) => d.id)}
            strategy={verticalListSortingStrategy}
          >
            <Grid container spacing={2}>
              {dishes.map((dish, idx) => (
                <Grid item xs={12} sm={6} md={4} key={dish.id}>
                  <SortableDishItem
                    dish={dish}
                    index={idx}
                    sectionId={section.id}
                    onEdit={() => onEditDish(dish.id)}
                    onDelete={() => onDeleteDish(dish)}
                  />
                </Grid>
              ))}
            </Grid>
          </SortableContext>
        ) : (
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              backgroundColor: isOver ? alpha('#1976d2', 0.12) : undefined,
            }}
          >
            <Typography color="text.secondary">Arrastra platos aquí</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ===== Principal =====
export default function DishesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId =
    user?.currentRestaurant?.id ??
    JSON.parse(localStorage.getItem('currentrestaurant') || 'null')?.id ??
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

  // Orden por sección
  const [sectionOrderMode, setSectionOrderMode] = useState(false);
  const [dishOrdersBySection, setDishOrdersBySection] = useState<Record<string, string[]>>({});
  const [initialSectionOrders, setInitialSectionOrders] = useState<Record<string, string[]>>({});
  const [hasSectionOrderChanges, setHasSectionOrderChanges] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [showQuickHelp, setShowQuickHelp] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dishToDelete, setDishToDelete] = useState<any>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'success' });

  // Queries
  const { data: dishes = [], isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['dishes', restaurantId],
    queryFn: async () => {
      if (!restaurantId) throw new Error('No hay restaurante seleccionado');
      return apiClient.getDishes(restaurantId);
    },
    enabled: !!restaurantId,
  });

  const { data: sections = [], isLoading: isLoadingSections } = useQuery({
    queryKey: ['sections', restaurantId],
    queryFn: () => apiClient.getSections(restaurantId!),
    enabled: !!restaurantId,
  });

  const { data: dishSectionRelations = [], isLoading: isLoadingRelations } = useQuery({
    queryKey: ['dish-section-relations', restaurantId],
    queryFn: () => apiClient.getDishSectionRelations(restaurantId!),
    enabled: !!restaurantId && sectionOrderMode,
  });

  // Inicializar orden al entrar en modo por sección
  useEffect(() => {
    if (!sectionOrderMode) return;
    if (!sections?.length || !dishes?.length) return;

    if (dishSectionRelations?.length) {
      // Construir estado por sección con order_index del backend
      const bySection: Record<string, { dishid: string; orderindex: number }[]> = {};
      sections.forEach((s: any) => (bySection[s.id] = []));
      dishSectionRelations.forEach((r: any) => {
        if (bySection[r.section_id]) bySection[r.section_id].push({ dishid: r.dish_id, orderindex: Number(r.order_index) || 0 });
      });
      Object.keys(bySection).forEach((sid) => {
        bySection[sid].sort((a, b) => a.orderindex - b.orderindex);
      });
      const idsOnly: Record<string, string[]> = {};
      Object.keys(bySection).forEach((sid) => (idsOnly[sid] = bySection[sid].map((x) => x.dishid)));
      setDishOrdersBySection(idsOnly);
      setInitialSectionOrders(JSON.parse(JSON.stringify(idsOnly)));
      // Tutorial la primera vez
      const seen = localStorage.getItem('menuOrderTutorialSeen');
      if (!seen) {
        setShowQuickHelp(true);
        localStorage.setItem('menuOrderTutorialSeen', 'true');
      }
    } else {
      // Fallback: secciones vacías listas para recibir platos
      const idsOnly: Record<string, string[]> = {};
      sections.forEach((s: any) => (idsOnly[s.id] = []));
      setDishOrdersBySection(idsOnly);
      setInitialSectionOrders(JSON.parse(JSON.stringify(idsOnly)));
    }
  }, [sectionOrderMode, sections, dishes, dishSectionRelations]);

  // Detectar cambios vs estado inicial
  useEffect(() => {
    if (!sectionOrderMode) return;
    let changed = false;
    for (const sid of Object.keys(dishOrdersBySection)) {
      const cur = dishOrdersBySection[sid] || [];
      const ini = initialSectionOrders[sid] || [];
      if (cur.length !== ini.length) { changed = true; break; }
      for (let i = 0; i < cur.length; i++) {
        if (cur[i] !== ini[i]) { changed = true; break; }
      }
      if (changed) break;
    }
    setHasSectionOrderChanges(changed);
  }, [dishOrdersBySection, initialSectionOrders, sectionOrderMode]);

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

  const saveSectionOrderMutation = useMutation({
    mutationFn: (orderData: Array<{ section_id: string; dish_orders: Array<{ dish_id: string; order_index: number }> }>) =>
      apiClient.updateDishesOrderBySection(restaurantId!, orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['dish-section-relations', restaurantId] });
      setInitialSectionOrders(JSON.parse(JSON.stringify(dishOrdersBySection)));
      setHasSectionOrderChanges(false);
      setSnackbar({ open: true, message: 'Menú reorganizado correctamente', severity: 'success' });
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: `Error: ${err?.response?.data?.message || 'No se pudo guardar el orden'}`, severity: 'error' });
    },
  });

  // DnD handlers
  const handleDragStart = (event: any) => {
    setActiveId(event?.active?.id ?? null);
    const currentSectionId = event?.active?.data?.current?.currentSectionId;
    if (currentSectionId) setActiveSectionId(currentSectionId);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event || {};
    if (!over) { setActiveId(null); setActiveSectionId(null); return; }

    const dishId = active?.id;
    const overId = over?.id;
    if (!dishId || !overId) { setActiveId(null); setActiveSectionId(null); return; }

    const isOverSection = overId.toString().startsWith('section-');
    let targetSectionId: string | undefined;

    if (isOverSection) {
      targetSectionId = overId.toString().replace('section-', '');
    } else {
      // buscar a qué sección pertenece el plato destino
      for (const [sid, ids] of Object.entries(dishOrdersBySection)) {
        if ((ids as string[]).includes(overId)) { targetSectionId = sid; break; }
      }
    }
    if (!targetSectionId) { setActiveId(null); setActiveSectionId(null); return; }

    const sourceSectionId = activeSectionId || targetSectionId;
    const isChangingSection = targetSectionId !== sourceSectionId;

    if (isChangingSection) {
      setDishOrdersBySection((prev) => {
        const next = { ...prev };
        // quitar del origen
        if (sourceSectionId) next[sourceSectionId] = (next[sourceSectionId] || []).filter((id) => id !== dishId);
        // insertar en destino
        next[targetSectionId!] = next[targetSectionId!] || [];
        if (isOverSection) {
          next[targetSectionId!].push(dishId);
        } else {
          const idx = next[targetSectionId!].indexOf(overId);
          if (idx >= 0) {
            const arr = [...next[targetSectionId!]];
            arr.splice(idx, 0, dishId);
            next[targetSectionId!] = arr;
          } else {
            next[targetSectionId!].push(dishId);
          }
        }
        return next;
      });
      setHasSectionOrderChanges(true);
    } else {
      // reorden dentro de la misma sección
      const ids = dishOrdersBySection[targetSectionId] || [];
      const oldIndex = ids.indexOf(dishId);
      const newIndex = ids.indexOf(isOverSection ? dishId : overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setDishOrdersBySection((prev) => ({
          ...prev,
          [targetSectionId!]: arrayMove(ids, oldIndex, newIndex),
        }));
        setHasSectionOrderChanges(true);
      }
    }

    setActiveId(null);
    setActiveSectionId(null);
  };

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
        case 'views': return (b?.viewcount || 0) - (a?.viewcount || 0);
        case 'order_index':
        default: return 0;
      }
    });
  }, [filteredDishes, sortBy]);

  // Construir platos por sección para el modo ordenar
  const sectionDishes = useMemo(() => {
    const result: Record<string, any[]> = {};
    sections.forEach((s: any) => {
      const ids = dishOrdersBySection[s.id] || [];
      result[s.id] = ids.map((id) => dishes.find((d: any) => d.id === id)).filter(Boolean);
    });
    return result;
  }, [sections, dishOrdersBySection, dishes]);

  const totalCount = dishes?.length || 0;
  const filteredCount = sortedAndFilteredDishes?.length || 0;

  // Guardar orden
  const handleSaveSectionOrder = () => {
    const orders = Object.entries(dishOrdersBySection).map(([section_id, ids]) => ({
      section_id,
      dish_orders: ids.map((dish_id, idx) => ({ dish_id, order_index: idx + 1 })),
    }));
    saveSectionOrderMutation.mutate(orders);
  };

  // UI estados de carga/error
  if (isLoading || (sectionOrderMode && isLoadingRelations)) {
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
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, pb: sectionOrderMode ? 10 : 2 }}>
      {/* Sistema de Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => {
            setCurrentTab(newValue);
            setSectionOrderMode(newValue === 1);
          }}
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
        <Box sx={{
          display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 3, gap: 2,
        }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Gestión de menú
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<CloseIcon />}
              onClick={() => {
                setSectionOrderMode(false);
                setHasSectionOrderChanges(false);
                setCurrentTab(0);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={saveSectionOrderMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              onClick={handleSaveSectionOrder}
              disabled={!hasSectionOrderChanges || saveSectionOrderMutation.isPending}
            >
              {saveSectionOrderMutation.isPending ? 'Guardando...' : 'Guardar orden'}
            </Button>
          </Box>
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
                  startIcon={<SortIcon />}
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

      {/* Contenido principal */}
      {currentTab === 1 && (
        <>
          <Alert severity="info" sx={{ mb: 3 }}>
            <AlertTitle>Gestión de menú</AlertTitle>
            Arrastra platos para reorganizarlos dentro de cada sección o muévelos a otra sección soltándolos sobre su cabecera.
            <Button size="small" startIcon={<InfoIcon />} onClick={() => setShowQuickHelp(true)} sx={{ ml: 1 }}>
              Ver ayuda
            </Button>
          </Alert>

          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sections.map((section: any) => (
                <DroppableSection
                  key={section.id}
                  section={section}
                  dishes={sectionDishes[section.id] || []}
                  onEditDish={handleEditDish}
                  onDeleteDish={handleOpenDeleteDialog}
                  isMobile={isMobile}
                />
              ))}
            </Box>

            <DragOverlay adjustScale>
              {activeId ? (
                <Box sx={{ width: { xs: 280, sm: 300, md: 320 }, opacity: 0.85 }}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}>
                    <CardContent sx={{ pt: 2, pb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>Moviendo...</Typography>
                    </CardContent>
                  </Card>
                </Box>
              ) : null}
            </DragOverlay>
          </DndContext>
        </>
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
            // Tabla lista en desktop
            <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Table>
                <TableHead sx={{ bgcolor: 'background.default' }}>
                  <TableRow>
                    <TableCell width="30%">Nombre</TableCell>
                    <TableCell width="40%">Descripción</TableCell>
                    <TableCell align="right">Precio</TableCell>
                    <TableCell align="center">Estado</TableCell>
                    <TableCell align="center">Vistas</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedAndFilteredDishes.map((dish: any) => (
                    <TableRow key={dish.id} hover>
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
                      <TableCell align="right">{Number(dish?.price || 0).toFixed(2)}</TableCell>
                      <TableCell align="center">
                        {dish?.status === 'active'
                          ? <Chip label="Activo" size="small" color="success" variant="outlined" />
                          : <Chip label={dish?.status === 'outofstock' ? 'Agotado' : dish?.status === 'hidden' ? 'Oculto' : 'Inactivo'} size="small" color="error" variant="outlined" />}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          <VisibilityIcon fontSize="small" color="action" />
                          <Typography variant="body2">{dish?.viewcount || 0}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="outlined" onClick={() => handleEditDish(dish.id)} startIcon={<EditIcon />} sx={{ mr: 1 }}>Editar</Button>
                        <IconButton size="small" color="error" onClick={() => handleOpenDeleteDialog(dish)}><DeleteIcon /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                  }
                  {
                    filteredCount === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                          No se encontraron platos.
                        </TableCell>
                      </TableRow>
                    )
                  }
                </TableBody >
              </Table >
            </TableContainer >
          )}
        </Box >
      )}

      {
        currentTab === 2 && (
          <MultimediaTab restaurantId={restaurantId!} dishes={dishes} />
        )
      }


      {/* FABs móviles (UNO solo, sin duplicado) */}
      <Zoom in={!sectionOrderMode}>
        <Fab
          color="primary" aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16, display: { xs: 'flex', sm: 'none' }, zIndex: (t) => t.zIndex.appBar + 2 }}
          onClick={() => navigate('/dishes/new')}
        >
          <AddIcon />
        </Fab>
      </Zoom>

      <Zoom in={!sectionOrderMode}>
        <Fab
          color="secondary" aria-label="section-order"
          sx={{ position: 'fixed', bottom: 16, right: 76, display: { xs: 'flex', sm: 'none' }, zIndex: (t) => t.zIndex.appBar + 2 }}
          onClick={() => setSectionOrderMode(true)}
        >
          <SectionOrderIcon />
        </Fab>
      </Zoom>

      {/* Scroll to top en móvil/desktop */}
      <Zoom in={!sectionOrderMode && trigger}>
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

      {/* Drawer móvil de filtros/orden (plantilla cerrada) */}
      <SwipeableDrawer
        anchor="bottom"
        open={false}
        onClose={() => { }}
        onOpen={() => { }}
        disableSwipeToOpen={false}
        swipeAreaWidth={56}
        ModalProps={{ keepMounted: true }}
        sx={{ '& .MuiDrawer-paper': { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%' } }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Filtros y Ordenación</Typography>
            <IconButton onClick={() => { /* cerrar */ }}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Filtrar por estado</Typography>
            <Box sx={{ mb: 3 }}>
              <Button variant={filterStatus === 'all' ? 'contained' : 'outlined'} onClick={() => setFilterStatus('all')} sx={{ mr: 1, mb: 1 }}>
                Todos
              </Button>
              <Button variant={filterStatus === 'active' ? 'contained' : 'outlined'} onClick={() => setFilterStatus('active')} startIcon={<ActiveIcon />} sx={{ mr: 1, mb: 1 }}>
                Activos
              </Button>
              <Button variant={filterStatus === 'inactive' ? 'contained' : 'outlined'} onClick={() => setFilterStatus('inactive')} startIcon={<InactiveIcon />} sx={{ mb: 1 }}>
                Inactivos
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Ordenar por</Typography>
            <Box sx={{ mb: 2 }}>
              <Button variant={sortBy === 'order_index' ? 'contained' : 'outlined'} onClick={() => setSortBy('order_index')} startIcon={<DragIcon />} sx={{ mr: 1, mb: 1 }}>
                Orden personalizado
              </Button>
              <Button variant={sortBy === 'name_asc' ? 'contained' : 'outlined'} onClick={() => setSortBy('name_asc')} startIcon={<ArrowUpIcon />} sx={{ mr: 1, mb: 1 }}>
                Nombre A-Z
              </Button>
              <Button variant={sortBy === 'name_desc' ? 'contained' : 'outlined'} onClick={() => setSortBy('name_desc')} startIcon={<ArrowDownIcon />} sx={{ mr: 1, mb: 1 }}>
                Nombre Z-A
              </Button>
              <Button variant={sortBy === 'price_asc' ? 'contained' : 'outlined'} onClick={() => setSortBy('price_asc')} startIcon={<PriceIcon />} sx={{ mr: 1, mb: 1 }}>
                Precio menor
              </Button>
              <Button variant={sortBy === 'price_desc' ? 'contained' : 'outlined'} onClick={() => setSortBy('price_desc')} startIcon={<PriceIcon />} sx={{ mr: 1, mb: 1 }}>
                Precio mayor
              </Button>
              <Button variant={sortBy === 'views' ? 'contained' : 'outlined'} onClick={() => setSortBy('views')} startIcon={<VisibilityIcon />} sx={{ mb: 1 }}>
                Más vistos
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Modo de visualización</Typography>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, v) => v && setViewMode(v)}
              size="medium"
              fullWidth
              sx={{ mb: 2 }}
            >
              <ToggleButton value="grid"><GridViewIcon sx={{ mr: 1 }} />Cuadrícula</ToggleButton>
              <ToggleButton value="list"><ViewListIcon sx={{ mr: 1 }} />Lista</ToggleButton>
            </ToggleButtonGroup>

            <Button variant="contained" fullWidth onClick={() => { /* cerrar */ }} sx={{ mt: 2 }}>
              Aplicar
            </Button>
          </Box>
        </Box>
      </SwipeableDrawer>

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

      <QuickHelpMenu open={showQuickHelp} onClose={() => setShowQuickHelp(false)} />

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
      {/* Overlay de refetch */}
      {
        isRefetching && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: (t) => t.zIndex.drawer + 1,
            }}
          >
            <CircularProgress sx={{ color: '#fff' }} />
          </Box>
        )
      }
    </Container >
  );
}
