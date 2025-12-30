// MenuManagementTab.tsx - Gestión unificada de menús con acordeones anidados
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    IconButton,
    Chip,
    Button,
    Alert,
    AlertTitle,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    FormControlLabel,
    Snackbar,
    Tooltip,
    Card,
    Avatar,
    Skeleton,
    alpha,
    useTheme,
    useMediaQuery,
    Checkbox,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    ListItemAvatar,
    InputAdornment,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Add as AddIcon,
    Edit as EditIcon,
    ArrowUpward as ArrowUpIcon,
    ArrowDownward as ArrowDownIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Restaurant as RestaurantIcon,
    MenuBook as MenuBookIcon,
    Category as CategoryIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import { apiClient } from '../../lib/apiClient';
import IconPicker from '../IconPicker';

interface MenuManagementTabProps {
    restaurantId: string;
}

// ============ DISH ITEM ============
const DishItem: React.FC<{
    dish: any;
    index: number;
    total: number;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onEdit: () => void;
    isUpdating: boolean;
}> = ({ dish, index, total, onMoveUp, onMoveDown, onEdit, isUpdating }) => {
    const getDishImage = (d: any) => {
        const media = d?.media || [];
        const primary = media.find((m: any) => m.role === 'PRIMARY_IMAGE' || m.isprimary);
        if (primary?.url) return primary.url;
        const gallery = media.find((m: any) => m.role === 'GALLERY_IMAGE' || m.type === 'image');
        if (gallery?.url) return gallery.url;
        if (d?.thumbnailurl) return d.thumbnailurl;
        return null;
    };

    return (
        <Card
            sx={{
                display: 'flex',
                alignItems: 'center',
                p: 1,
                mb: 0.5,
                borderRadius: 1.5,
                boxShadow: 'none',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' },
            }}
        >
            {/* Controles de orden */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 1, gap: 0.25 }}>
                <IconButton
                    size="small"
                    onClick={onMoveUp}
                    disabled={index === 0 || isUpdating}
                    sx={{ p: 0.25 }}
                >
                    <ArrowUpIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <Chip
                    label={index + 1}
                    size="small"
                    sx={{ height: 18, fontSize: '0.65rem', minWidth: 20, '& .MuiChip-label': { px: 0.5 } }}
                />
                <IconButton
                    size="small"
                    onClick={onMoveDown}
                    disabled={index === total - 1 || isUpdating}
                    sx={{ p: 0.25 }}
                >
                    <ArrowDownIcon sx={{ fontSize: 16 }} />
                </IconButton>
            </Box>

            {/* Imagen */}
            <Avatar
                src={getDishImage(dish)}
                variant="rounded"
                sx={{ width: 44, height: 44, mr: 1.5, borderRadius: 1 }}
            >
                <RestaurantIcon />
            </Avatar>

            {/* Info */}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                    {dish?.translations?.name?.es || 'Sin nombre'}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {Number(dish?.price || 0).toFixed(2)} €
                </Typography>
            </Box>

            {/* Editar */}
            <IconButton size="small" onClick={onEdit} sx={{ color: 'text.secondary' }}>
                <EditIcon fontSize="small" />
            </IconButton>
        </Card>
    );
};

// ============ SECTION ACCORDION ============
const SectionAccordion: React.FC<{
    section: any;
    dishes: any[];
    index: number;
    total: number;
    onMoveSection: (direction: 'up' | 'down') => void;
    onMoveDish: (dishIndex: number, direction: 'up' | 'down') => void;
    onEditSection: () => void;
    onToggleVisibility: () => void;
    onEditDish: (dishId: string) => void;
    onAddDish: () => void;
    isUpdating: boolean;
    expanded: boolean;
    onToggleExpand: () => void;
}> = ({
    section,
    dishes,
    index,
    total,
    onMoveSection,
    onMoveDish,
    onEditSection,
    onToggleVisibility,
    onEditDish,
    onAddDish,
    isUpdating,
    expanded,
    onToggleExpand,
}) => {
        const isHidden = section.is_visible === false;

        return (
            <Accordion
                expanded={expanded}
                onChange={onToggleExpand}
                disableGutters
                sx={{
                    boxShadow: 'none',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '8px !important',
                    mb: 1,
                    opacity: isHidden ? 0.6 : 1,
                    '&:before': { display: 'none' },
                    overflow: 'hidden',
                }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                        bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
                        minHeight: 48,
                        '& .MuiAccordionSummary-content': { my: 0.5, alignItems: 'center', gap: 1 },
                    }}
                >
                    {/* Controles de orden */}
                    <Box
                        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 0.5 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); onMoveSection('up'); }}
                            disabled={index === 0 || isUpdating}
                            sx={{ p: 0.25 }}
                        >
                            <ArrowUpIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); onMoveSection('down'); }}
                            disabled={index === total - 1 || isUpdating}
                            sx={{ p: 0.25 }}
                        >
                            <ArrowDownIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                    </Box>

                    {/* Icono de sección si existe */}
                    {section.icon_url && (
                        <Box
                            component="img"
                            src={`${import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev'}/media/System/icons/${section.icon_url}`}
                            sx={{ width: 24, height: 24, objectFit: 'contain' }}
                            onError={(e: any) => { e.target.style.display = 'none'; }}
                        />
                    )}

                    {/* Nombre */}
                    <Typography variant="subtitle2" fontWeight={600} sx={{ flexGrow: 1 }}>
                        {section.translations?.name?.es || 'Sin nombre'}
                    </Typography>

                    {/* Chip platos */}
                    <Chip
                        label={`${dishes.length} platos`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 22, fontSize: '0.7rem' }}
                    />

                    {/* Acciones */}
                    <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', gap: 0.25 }}>
                        <Tooltip title={isHidden ? 'Hacer visible' : 'Ocultar'}>
                            <IconButton
                                size="small"
                                onClick={onToggleVisibility}
                                disabled={isUpdating}
                                color={isHidden ? 'default' : 'primary'}
                            >
                                {isHidden ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar sección">
                            <IconButton size="small" onClick={onEditSection}>
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ p: 1.5, bgcolor: 'background.default' }}>
                    {dishes.length > 0 ? (
                        dishes.map((dish, idx) => (
                            <DishItem
                                key={dish.id}
                                dish={dish}
                                index={idx}
                                total={dishes.length}
                                onMoveUp={() => onMoveDish(idx, 'up')}
                                onMoveDown={() => onMoveDish(idx, 'down')}
                                onEdit={() => onEditDish(dish.id)}
                                isUpdating={isUpdating}
                            />
                        ))
                    ) : (
                        <Box sx={{ p: 2, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                Sin platos asignados
                            </Typography>
                        </Box>
                    )}

                    {/* Botón añadir plato */}
                    <Button
                        startIcon={<AddIcon />}
                        onClick={onAddDish}
                        sx={{ mt: 1 }}
                        size="small"
                        variant="text"
                        color="primary"
                        fullWidth
                    >
                        Añadir plato
                    </Button>
                </AccordionDetails>
            </Accordion>
        );
    };

// ============ MENU ACCORDION ============
const MenuAccordion: React.FC<{
    menu: any;
    sections: any[];
    dishes: any[];
    dishSectionRelations: any[];
    onAddSection: () => void;
    onEditSection: (section: any) => void;
    onToggleSectionVisibility: (section: any) => void;
    onMoveSection: (sectionId: string, direction: 'up' | 'down') => void;
    onMoveDish: (sectionId: string, dishIndex: number, direction: 'up' | 'down') => void;
    onEditDish: (dishId: string) => void;
    onAddDishToSection: (sectionId: string) => void;
    isUpdating: boolean;
    expanded: boolean;
    onToggleExpand: () => void;
    expandedSections: Record<string, boolean>;
    onToggleSectionExpand: (sectionId: string) => void;
}> = ({
    menu,
    sections,
    dishes,
    dishSectionRelations,
    onAddSection,
    onEditSection,
    onToggleSectionVisibility,
    onMoveSection,
    onMoveDish,
    onEditDish,
    onAddDishToSection,
    isUpdating,
    expanded,
    onToggleExpand,
    expandedSections,
    onToggleSectionExpand,
}) => {
        // Filtrar secciones de este menú
        const menuSections = useMemo(() => {
            return sections
                .filter((s) => s.menu_id === menu.id)
                .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        }, [sections, menu.id]);

        // Construir platos por sección
        const getDishesForSection = (sectionId: string) => {
            const relations = dishSectionRelations
                .filter((r) => r.section_id === sectionId)
                .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            return relations
                .map((r) => dishes.find((d) => d.id === r.dish_id))
                .filter(Boolean);
        };

        return (
            <Accordion
                expanded={expanded}
                onChange={onToggleExpand}
                disableGutters
                sx={{
                    boxShadow: 'none',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '12px !important',
                    mb: 1.5,
                    '&:before': { display: 'none' },
                    overflow: 'hidden',
                }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                        bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                        minHeight: 56,
                        '& .MuiAccordionSummary-content': { my: 1, alignItems: 'center', gap: 1.5 },
                    }}
                >
                    <MenuBookIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={700} sx={{ flexGrow: 1 }}>
                        {menu.name}
                    </Typography>
                    <Chip
                        label={`${menuSections.length} secciones`}
                        size="small"
                        color="primary"
                        variant="outlined"
                    />
                </AccordionSummary>

                <AccordionDetails sx={{ p: 2, bgcolor: 'background.paper' }}>
                    {/* Lista de secciones */}
                    {menuSections.length > 0 ? (
                        menuSections.map((section, idx) => (
                            <SectionAccordion
                                key={section.id}
                                section={section}
                                dishes={getDishesForSection(section.id)}
                                index={idx}
                                total={menuSections.length}
                                onMoveSection={(dir) => onMoveSection(section.id, dir)}
                                onMoveDish={(dishIdx, dir) => onMoveDish(section.id, dishIdx, dir)}
                                onEditSection={() => onEditSection(section)}
                                onToggleVisibility={() => onToggleSectionVisibility(section)}
                                onEditDish={onEditDish}
                                onAddDish={() => onAddDishToSection(section.id)}
                                isUpdating={isUpdating}
                                expanded={expandedSections[section.id] || false}
                                onToggleExpand={() => onToggleSectionExpand(section.id)}
                            />
                        ))
                    ) : (
                        <Box sx={{ p: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                            <CategoryIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                                Este menú no tiene secciones
                            </Typography>
                        </Box>
                    )}

                    {/* Botón añadir sección */}
                    <Button
                        startIcon={<AddIcon />}
                        onClick={(e) => { e.stopPropagation(); onAddSection(); }}
                        sx={{ mt: 1.5 }}
                        size="small"
                        variant="outlined"
                        fullWidth
                    >
                        Añadir sección a {menu.name}
                    </Button>
                </AccordionDetails>
            </Accordion>
        );
    };

// ============ SECTION DIALOG ============
const SectionDialog: React.FC<{
    open: boolean;
    onClose: () => void;
    section: any | null;
    menus: any[];
    selectedMenuId: string;
    restaurantId: string;
    onSuccess: () => void;
}> = ({ open, onClose, section, menus, selectedMenuId, restaurantId, onSuccess }) => {
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [nameEn, setNameEn] = useState('');
    const [menuId, setMenuId] = useState('');
    const [iconUrl, setIconUrl] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    useEffect(() => {
        if (open) {
            if (section) {
                setName(section.translations?.name?.es || '');
                setNameEn(section.translations?.name?.en || '');
                setMenuId(section.menu_id || selectedMenuId);
                setIconUrl(section.icon_url || null);
                setIsVisible(section.is_visible !== false);
            } else {
                setName('');
                setNameEn('');
                setMenuId(selectedMenuId);
                setIconUrl(null);
                setIsVisible(true);
            }
        }
    }, [open, section, selectedMenuId]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const data = {
                restaurant_id: restaurantId,
                menu_id: menuId,
                icon_url: iconUrl,
                is_visible: isVisible,
                translations: {
                    name: { es: name.trim(), ...(nameEn.trim() ? { en: nameEn.trim() } : {}) },
                    description: {},
                },
            };
            if (section) {
                return apiClient.updateSection(section.id, { ...data, order_index: section.order_index });
            } else {
                return apiClient.createSection(data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sections', restaurantId] });
            onSuccess();
            onClose();
        },
        onError: (err: any) => {
            setSnackbar({ open: true, message: err?.message || 'Error al guardar', severity: 'error' });
        },
    });

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle fontWeight="bold">
                    {section ? 'Editar sección' : 'Nueva sección'}
                </DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Menú</InputLabel>
                        <Select value={menuId} label="Menú" onChange={(e) => setMenuId(e.target.value)}>
                            {menus.map((m) => (
                                <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        label="Nombre (Español) *"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        margin="normal"
                        required
                    />

                    <TextField
                        label="Nombre (Inglés)"
                        value={nameEn}
                        onChange={(e) => setNameEn(e.target.value)}
                        fullWidth
                        margin="normal"
                    />

                    <IconPicker value={iconUrl} onChange={setIconUrl} />

                    <FormControlLabel
                        control={<Switch checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} />}
                        label={isVisible ? 'Visible para clientes' : 'Oculta (borrador)'}
                        sx={{ mt: 2, display: 'flex', p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={onClose} color="inherit">Cancelar</Button>
                    <Button
                        onClick={() => saveMutation.mutate()}
                        variant="contained"
                        disabled={!name.trim() || !menuId || saveMutation.isPending}
                    >
                        {saveMutation.isPending ? <CircularProgress size={20} /> : 'Guardar'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </>
    );
};

// ============ ADD DISH DIALOG ============
const AddDishDialog: React.FC<{
    open: boolean;
    onClose: () => void;
    sectionId: string;
    sectionName: string;
    allDishes: any[];
    currentDishIds: string[];
    dishSectionRelations: any[];
    restaurantId: string;
    onSuccess: () => void;
}> = ({ open, onClose, sectionId, sectionName, allDishes, currentDishIds, dishSectionRelations, restaurantId, onSuccess }) => {
    const queryClient = useQueryClient();
    const [selectedDishes, setSelectedDishes] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Platos disponibles (no asignados a esta sección)
    const availableDishes = useMemo(() => {
        return allDishes.filter(d => !currentDishIds.includes(d.id));
    }, [allDishes, currentDishIds]);

    const filteredDishes = useMemo(() => {
        if (!searchTerm.trim()) return availableDishes;
        const term = searchTerm.toLowerCase();
        return availableDishes.filter(d => {
            const name = d.translations?.name?.es || '';
            return name.toLowerCase().includes(term);
        });
    }, [availableDishes, searchTerm]);

    useEffect(() => {
        if (open) {
            setSelectedDishes([]);
            setSearchTerm('');
        }
    }, [open]);

    const toggleDish = (dishId: string) => {
        setSelectedDishes(prev =>
            prev.includes(dishId)
                ? prev.filter(id => id !== dishId)
                : [...prev, dishId]
        );
    };

    const addDishesMutation = useMutation({
        mutationFn: async () => {
            // Obtener platos actuales de la sección con su orden
            const currentRelations = dishSectionRelations
                .filter(r => r.section_id === sectionId)
                .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

            const existingDishOrders = currentRelations.map((r, idx) => ({
                dish_id: r.dish_id,
                order_index: idx + 1
            }));

            // Añadir los nuevos platos al final
            const newDishOrders = selectedDishes.map((dishId, idx) => ({
                dish_id: dishId,
                order_index: existingDishOrders.length + idx + 1
            }));

            const allDishOrders = [...existingDishOrders, ...newDishOrders];

            return apiClient.updateDishesOrderBySection(restaurantId, [{
                section_id: sectionId,
                dish_orders: allDishOrders
            }]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dish-section-relations', restaurantId] });
            onSuccess();
            onClose();
        },
    });

    const getDishImage = (d: any) => {
        const media = d?.media || [];
        const primary = media.find((m: any) => m.role === 'PRIMARY_IMAGE' || m.isprimary);
        if (primary?.url) return primary.url;
        return d?.thumbnail_url || null;
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle fontWeight="bold">
                Añadir platos a {sectionName}
            </DialogTitle>
            <DialogContent>
                <TextField
                    placeholder="Buscar platos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ mb: 2, mt: 1 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                />

                {filteredDishes.length > 0 ? (
                    <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                        {filteredDishes.map((dish) => {
                            const isSelected = selectedDishes.includes(dish.id);
                            return (
                                <ListItem key={dish.id} disablePadding>
                                    <ListItemButton onClick={() => toggleDish(dish.id)} dense>
                                        <ListItemIcon sx={{ minWidth: 36 }}>
                                            <Checkbox
                                                edge="start"
                                                checked={isSelected}
                                                tabIndex={-1}
                                                disableRipple
                                            />
                                        </ListItemIcon>
                                        <ListItemAvatar>
                                            <Avatar
                                                src={getDishImage(dish)}
                                                variant="rounded"
                                                sx={{ width: 40, height: 40 }}
                                            >
                                                <RestaurantIcon />
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={dish.translations?.name?.es || 'Sin nombre'}
                                            secondary={`${Number(dish.price || 0).toFixed(2)} €`}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </List>
                ) : (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            {availableDishes.length === 0
                                ? 'Todos los platos ya están asignados a esta sección'
                                : 'No se encontraron platos'}
                        </Typography>
                    </Box>
                )}

                {selectedDishes.length > 0 && (
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                        <Typography variant="body2">
                            <strong>{selectedDishes.length}</strong> plato(s) seleccionado(s)
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button onClick={onClose} color="inherit">Cancelar</Button>
                <Button
                    onClick={() => addDishesMutation.mutate()}
                    variant="contained"
                    disabled={selectedDishes.length === 0 || addDishesMutation.isPending}
                >
                    {addDishesMutation.isPending ? <CircularProgress size={20} /> : `Añadir ${selectedDishes.length} plato(s)`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ============ MAIN COMPONENT ============
const MenuManagementTab: React.FC<MenuManagementTabProps> = ({ restaurantId }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Estado
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
    const [editingSection, setEditingSection] = useState<any>(null);
    const [selectedMenuIdForNewSection, setSelectedMenuIdForNewSection] = useState('');
    const [addDishDialogOpen, setAddDishDialogOpen] = useState(false);
    const [addDishTargetSection, setAddDishTargetSection] = useState<any>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    // Queries
    const { data: menus = [], isLoading: loadingMenus } = useQuery({
        queryKey: ['menus', restaurantId],
        queryFn: () => apiClient.getMenus(restaurantId),
        enabled: !!restaurantId,
    });

    const { data: sections = [], isLoading: loadingSections } = useQuery({
        queryKey: ['sections', restaurantId],
        queryFn: () => apiClient.getSections(restaurantId),
        enabled: !!restaurantId,
    });

    const { data: dishes = [], isLoading: loadingDishes } = useQuery({
        queryKey: ['dishes', restaurantId],
        queryFn: () => apiClient.getDishes(restaurantId),
        enabled: !!restaurantId,
    });

    const { data: dishSectionRelations = [] } = useQuery({
        queryKey: ['dish-section-relations', restaurantId],
        queryFn: () => apiClient.getDishSectionRelations(restaurantId),
        enabled: !!restaurantId,
    });

    // Expandir primer menú por defecto
    useEffect(() => {
        if (menus.length > 0 && Object.keys(expandedMenus).length === 0) {
            setExpandedMenus({ [menus[0].id]: true });
        }
    }, [menus, expandedMenus]);

    // Mutations
    const updateSectionOrderMutation = useMutation({
        mutationFn: async ({ sectionId, newOrder, menuId }: { sectionId: string; newOrder: number; menuId: string }) => {
            const section = sections.find((s: any) => s.id === sectionId);
            if (!section) throw new Error('Section not found');
            return apiClient.updateSection(sectionId, {
                restaurant_id: restaurantId,
                menu_id: menuId,
                order_index: newOrder,
                icon_url: section.icon_url,
                is_visible: section.is_visible,
                translations: section.translations,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sections', restaurantId] });
        },
    });

    const toggleVisibilityMutation = useMutation({
        mutationFn: async ({ section, newVisibility }: { section: any; newVisibility: boolean }) => {
            return apiClient.updateSection(section.id, {
                restaurant_id: restaurantId,
                menu_id: section.menu_id,
                order_index: section.order_index,
                icon_url: section.icon_url,
                is_visible: newVisibility,
                translations: section.translations,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sections', restaurantId] });
            setSnackbar({ open: true, message: 'Visibilidad actualizada', severity: 'success' });
        },
    });

    const updateDishOrderMutation = useMutation({
        mutationFn: (orders: Array<{ section_id: string; dish_orders: Array<{ dish_id: string; order_index: number }> }>) =>
            apiClient.updateDishesOrderBySection(restaurantId, orders),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dish-section-relations', restaurantId] });
        },
    });

    // Handlers
    const handleMoveSection = (sectionId: string, direction: 'up' | 'down') => {
        const section = sections.find((s: any) => s.id === sectionId);
        if (!section) return;

        const menuSections = sections
            .filter((s: any) => s.menu_id === section.menu_id)
            .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

        const currentIndex = menuSections.findIndex((s: any) => s.id === sectionId);
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (targetIndex < 0 || targetIndex >= menuSections.length) return;

        const targetSection = menuSections[targetIndex];

        // Swap orders
        updateSectionOrderMutation.mutate({ sectionId, newOrder: targetSection.order_index, menuId: section.menu_id });
        updateSectionOrderMutation.mutate({ sectionId: targetSection.id, newOrder: section.order_index, menuId: section.menu_id });
    };

    const handleMoveDish = (sectionId: string, dishIndex: number, direction: 'up' | 'down') => {
        const relations = dishSectionRelations
            .filter((r: any) => r.section_id === sectionId)
            .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

        const targetIndex = direction === 'up' ? dishIndex - 1 : dishIndex + 1;
        if (targetIndex < 0 || targetIndex >= relations.length) return;

        // Swap
        const newRelations = [...relations];
        [newRelations[dishIndex], newRelations[targetIndex]] = [newRelations[targetIndex], newRelations[dishIndex]];

        const orders = [{
            section_id: sectionId,
            dish_orders: newRelations.map((r: any, idx: number) => ({ dish_id: r.dish_id, order_index: idx + 1 })),
        }];

        updateDishOrderMutation.mutate(orders);
    };

    const handleAddSection = (menuId: string) => {
        setSelectedMenuIdForNewSection(menuId);
        setEditingSection(null);
        setSectionDialogOpen(true);
    };

    const handleEditSection = (section: any) => {
        setEditingSection(section);
        setSelectedMenuIdForNewSection(section.menu_id);
        setSectionDialogOpen(true);
    };

    const handleToggleVisibility = (section: any) => {
        toggleVisibilityMutation.mutate({ section, newVisibility: section.is_visible === false });
    };

    const handleAddDishToSection = (sectionId: string) => {
        const section = sections.find((s: any) => s.id === sectionId);
        if (section) {
            setAddDishTargetSection(section);
            setAddDishDialogOpen(true);
        }
    };

    const isLoading = loadingMenus || loadingSections || loadingDishes;
    const isUpdating = updateSectionOrderMutation.isPending || updateDishOrderMutation.isPending || toggleVisibilityMutation.isPending;

    // Supress unused variable warning
    void isMobile;

    if (isLoading) {
        return (
            <Box sx={{ p: 2 }}>
                {[1, 2].map((i) => (
                    <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 2, borderRadius: 2 }} />
                ))}
            </Box>
        );
    }

    return (
        <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
                <AlertTitle>Gestión de Menú</AlertTitle>
                Expande los menús para ver y organizar secciones y platos. Usa las flechas para reordenar.
            </Alert>

            {menus.length > 0 ? (
                menus.map((menu: any) => (
                    <MenuAccordion
                        key={menu.id}
                        menu={menu}
                        sections={sections}
                        dishes={dishes}
                        dishSectionRelations={dishSectionRelations}
                        onAddSection={() => handleAddSection(menu.id)}
                        onEditSection={handleEditSection}
                        onToggleSectionVisibility={handleToggleVisibility}
                        onMoveSection={handleMoveSection}
                        onMoveDish={handleMoveDish}
                        onEditDish={(dishId) => navigate(`/dishes/${dishId}`)}
                        onAddDishToSection={handleAddDishToSection}
                        isUpdating={isUpdating}
                        expanded={expandedMenus[menu.id] || false}
                        onToggleExpand={() => setExpandedMenus((prev) => ({ ...prev, [menu.id]: !prev[menu.id] }))}
                        expandedSections={expandedSections}
                        onToggleSectionExpand={(sectionId) => setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))}
                    />
                ))
            ) : (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <MenuBookIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">No hay menús creados</Typography>
                </Box>
            )}

            {/* Dialog de sección */}
            <SectionDialog
                open={sectionDialogOpen}
                onClose={() => setSectionDialogOpen(false)}
                section={editingSection}
                menus={menus}
                selectedMenuId={selectedMenuIdForNewSection}
                restaurantId={restaurantId}
                onSuccess={() => setSnackbar({ open: true, message: 'Sección guardada', severity: 'success' })}
            />

            {/* Dialog añadir platos */}
            {addDishTargetSection && (
                <AddDishDialog
                    open={addDishDialogOpen}
                    onClose={() => setAddDishDialogOpen(false)}
                    sectionId={addDishTargetSection.id}
                    sectionName={addDishTargetSection.translations?.name?.es || 'Sección'}
                    allDishes={dishes}
                    currentDishIds={dishSectionRelations
                        .filter((r: any) => r.section_id === addDishTargetSection.id)
                        .map((r: any) => r.dish_id)}
                    dishSectionRelations={dishSectionRelations}
                    restaurantId={restaurantId}
                    onSuccess={() => setSnackbar({ open: true, message: 'Platos añadidos', severity: 'success' })}
                />
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
};

export default MenuManagementTab;
