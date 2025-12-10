import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import {
    Container,
    Typography,
    Button,
    Box,
    Alert,
    Snackbar,
    Fab,
} from '@mui/material';
import { Add, Preview } from '@mui/icons-material';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import AddSectionDialog from '../../pages/landing/AddSectionDialog';
import SectionConfigDialog from '../../pages/landing/SectionConfigDialog';
import SectionCard from '../../pages/landing/SectionCard';

export default function LandingSectionsBuilder() {
    const { authToken, currentRestaurant } = useAuth();
    const restaurantId = currentRestaurant?.id;
    const queryClient = useQueryClient();
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [configDialogOpen, setConfigDialogOpen] = useState(false);
    const [selectedSection, setSelectedSection] = useState<any>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    // Fetch configured sections
    const { data: sections = [], isLoading, error } = useQuery({
        queryKey: ['landing-sections', restaurantId],
        queryFn: async () => {
            if (!restaurantId) throw new Error("No hay restaurante seleccionado");
            const response = await apiClient.client.get(
                `/admin/landing/sections?restaurant_id=${restaurantId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                }
            );
            return response.data.data || [];
        },
        enabled: !!restaurantId && !!authToken,
    });

    // Fetch section library
    const { data: library = [] } = useQuery({
        queryKey: ['landing-library'],
        queryFn: async () => {
            const response = await apiClient.client.get('/admin/landing/library', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            return response.data.data || [];
        },
        enabled: !!authToken,
    });

    // Add section mutation
    const addMutation = useMutation({
        mutationFn: async (data: { section_key: string; variant: string }) => {
            return apiClient.client.post('/admin/landing/sections', {
                restaurant_id: restaurantId,
                ...data,
            }, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['landing-sections'] });
            setSnackbar({ open: true, message: 'Sección añadida', severity: 'success' });
            setAddDialogOpen(false);
        },
        onError: (error: any) => {
            setSnackbar({ open: true, message: `Error: ${error.response?.data?.message || 'Error al añadir sección'}`, severity: 'error' });
        },
    });

    // Update section mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            return apiClient.client.put(`/admin/landing/sections/${id}`, data, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['landing-sections'] });
            setSnackbar({ open: true, message: 'Configuración guardada', severity: 'success' });
            setConfigDialogOpen(false);
        },
        onError: () => {
            setSnackbar({ open: true, message: 'Error al guardar', severity: 'error' });
        },
    });

    // Delete section mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return apiClient.client.delete(`/admin/landing/sections/${id}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['landing-sections'] });
            setSnackbar({ open: true, message: 'Sección eliminada', severity: 'success' });
        },
        onError: () => {
            setSnackbar({ open: true, message: 'Error al eliminar', severity: 'error' });
        },
    });

    // Toggle section mutation
    const toggleMutation = useMutation({
        mutationFn: async (id: string) => {
            return apiClient.client.post(`/admin/landing/sections/${id}/toggle`, {}, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['landing-sections'] });
            setSnackbar({ open: true, message: 'Estado actualizado', severity: 'success' });
        },
        onError: () => {
            setSnackbar({ open: true, message: 'Error al actualizar', severity: 'error' });
        },
    });

    // Reorder sections mutation
    const reorderMutation = useMutation({
        mutationFn: async (reordered: Array<{ id: string; order_index: number }>) => {
            return apiClient.client.put('/admin/landing/sections/reorder', {
                restaurant_id: restaurantId,
                sections: reordered,
            }, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['landing-sections'] });
        },
    });

    // Drag & Drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = sections.findIndex((s: any) => s.id === active.id);
            const newIndex = sections.findIndex((s: any) => s.id === over.id);

            const reordered = arrayMove(sections, oldIndex, newIndex);
            const reorderedData = reordered.map((item: any, index: number) => ({
                id: item.id,
                order_index: index + 1,
            }));

            // Optimistic update
            queryClient.setQueryData(['landing-sections', restaurantId], reordered);
            reorderMutation.mutate(reorderedData);
        }
    };

    const handleAddSection = (sectionKey: string, variant: string) => {
        addMutation.mutate({ section_key: sectionKey, variant });
    };

    const handleConfigSection = (section: any) => {
        setSelectedSection(section);
        setConfigDialogOpen(true);
    };

    const handleSaveConfig = (config: any) => {
        updateMutation.mutate({ id: selectedSection.id, data: config });
    };

    const handleDeleteSection = (id: string) => {
        if (confirm('¿Eliminar esta sección?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleToggleSection = (id: string) => {
        toggleMutation.mutate(id);
    };

    const handlePreview = () => {
        window.open(`/${currentRestaurant?.slug}`, '_blank');
    };

    if (isLoading) {
        return (
            <Container maxWidth="lg" sx={{ pt: 4 }}>
                <Typography>Cargando...</Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="lg" sx={{ pt: 4 }}>
                <Alert severity="error">Error al cargar: {(error as any).message}</Alert>
            </Container>
        );
    }

    return (
        <Box sx={{ minHeight: '100%', pb: 10 }}>
            <Container maxWidth="lg" sx={{ pt: 4, pb: 4 }}>
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                                Constructor de Landing
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666' }}>
                                Organiza las secciones de tu página principal
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Button
                                variant="outlined"
                                startIcon={<Preview />}
                                onClick={handlePreview}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                }}
                            >
                                Vista Previa
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<Add />}
                                onClick={() => setAddDialogOpen(true)}
                                sx={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                                }}
                            >
                                Añadir Sección
                            </Button>
                        </Box>
                    </Box>

                    {sections.length === 0 && (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            No tienes secciones configuradas. Haz clic en "Añadir Sección" para comenzar.
                        </Alert>
                    )}
                </Box>

                {/* Drag and Drop List */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={sections.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {sections.map((section: any) => (
                                <SectionCard
                                    key={section.id}
                                    section={section}
                                    onEdit={handleConfigSection}
                                    onDelete={handleDeleteSection}
                                    onToggle={handleToggleSection}
                                />
                            ))}
                        </Box>
                    </SortableContext>
                </DndContext>

                {/* FAB para móvil */}
                <Box sx={{ display: { xs: 'block', sm: 'none' }, position: 'fixed', bottom: 16, right: 16 }}>
                    <Fab
                        color="primary"
                        onClick={() => setAddDialogOpen(true)}
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                        }}
                    >
                        <Add />
                    </Fab>
                </Box>
            </Container>

            {/* Dialogs */}
            <AddSectionDialog
                open={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
                library={library}
                onAdd={handleAddSection}
            />

            <SectionConfigDialog
                open={configDialogOpen}
                onClose={() => setConfigDialogOpen(false)}
                section={selectedSection}
                onSave={handleSaveConfig}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
