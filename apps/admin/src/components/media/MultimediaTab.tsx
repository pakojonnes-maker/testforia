// apps/admin/src/components/media/MultimediaTab.tsx

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DishMedia } from '@visualtaste/api';
import { apiClient } from '../../lib/apiClient';
import MediaUploadDialog from './MediaUploadDialog';
import MediaEditDialog from './MediaEditDialog';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardMedia,
    CardContent,
    CardActions,
    Button,
    Chip,
    Alert,
    AlertTitle,
    TextField,
    InputAdornment,
    CircularProgress,
    IconButton,
    Skeleton,
    Snackbar,
    Stack,
    Divider,
    Autocomplete,
} from '@mui/material';
import {
    Search as SearchIcon,
    VideoLibrary as VideoIcon,
    PhotoCamera as ImageIcon,
    PhotoLibrary as GalleryIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CloudUpload as UploadIcon,
    CheckCircle as CompleteIcon,
    Warning as WarningIcon,
    ErrorOutline as ErrorIcon,
    Close as CloseIcon,
} from '@mui/icons-material';

interface MultimediaTabProps {
    restaurantId: string;
    dishes: any[];
}

export default function MultimediaTab({ restaurantId, dishes }: MultimediaTabProps) {
    const queryClient = useQueryClient();
    const [selectedDish, setSelectedDish] = useState<any | null>(null);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<DishMedia | null>(null);
    const [uploadRole, setUploadRole] = useState<string>('GALLERY_IMAGE');
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info' | 'warning';
    }>({ open: false, message: '', severity: 'success' });

    // Query para obtener medios del plato seleccionado
    const {
        data: dishMedia = [],
        isLoading: isLoadingMedia,
        refetch: refetchMedia,
    } = useQuery({
        queryKey: ['dish-media', selectedDish?.id],
        queryFn: () => apiClient.getDishMedia(selectedDish!.id),
        enabled: !!selectedDish?.id,
    });

    // Mutación para subir medios
    const uploadMutation = useMutation({
        mutationFn: async ({ file, role }: { file: File; role: string }) => {
            return apiClient.uploadMedia(selectedDish!.id, file, role);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dish-media', selectedDish?.id] });
            setSnackbar({
                open: true,
                message: 'Archivo subido correctamente',
                severity: 'success',
            });
        },
        onError: (error: any) => {
            setSnackbar({
                open: true,
                message: `Error al subir: ${error?.message || 'Error desconocido'}`,
                severity: 'error',
            });
        },
    });

    // Mutación para actualizar rol
    const updateRoleMutation = useMutation({
        mutationFn: async ({ mediaId, role }: { mediaId: string; role: string }) => {
            return apiClient.updateMediaRole(mediaId, selectedDish!.id, role);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dish-media', selectedDish?.id] });
            setSnackbar({
                open: true,
                message: 'Rol actualizado correctamente',
                severity: 'success',
            });
        },
        onError: (error: any) => {
            setSnackbar({
                open: true,
                message: `Error al actualizar: ${error?.message || 'Error desconocido'}`,
                severity: 'error',
            });
        },
    });

    // Mutación para eliminar medio
    const deleteMutation = useMutation({
        mutationFn: (mediaId: string) => apiClient.deleteMedia(mediaId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dish-media', selectedDish?.id] });
            setSnackbar({
                open: true,
                message: 'Medio eliminado correctamente',
                severity: 'success',
            });
        },
        onError: (error: any) => {
            setSnackbar({
                open: true,
                message: `Error al eliminar: ${error?.message || 'Error desconocido'}`,
                severity: 'error',
            });
        },
    });

    // Agrupar medios por rol
    const groupedMedia = useMemo(() => {
        return {
            primaryVideo: dishMedia.find((m) => m.role === 'PRIMARY_VIDEO') || null,
            primaryImage: dishMedia.find((m) => m.role === 'PRIMARY_IMAGE') || null,
            gallery: dishMedia.filter((m) => m.role === 'GALLERY_IMAGE'),
        };
    }, [dishMedia]);

    // Determinar estado de validación
    const mediaStatus = useMemo(() => {
        const hasVideo = !!groupedMedia.primaryVideo;
        const hasImage = !!groupedMedia.primaryImage;

        if (hasVideo && hasImage) {
            return { status: 'complete', label: 'Multimedia completa', color: 'success' as const };
        } else if (hasVideo || hasImage) {
            const missing = !hasVideo ? 'video principal' : 'imagen principal';
            return {
                status: 'incomplete',
                label: `Incompleto - Falta ${missing}`,
                color: 'warning' as const,
            };
        } else {
            return { status: 'empty', label: 'Sin medios', color: 'error' as const };
        }
    }, [groupedMedia]);

    const handleUpload = async (file: File, role: string) => {
        await uploadMutation.mutateAsync({ file, role });
    };

    const handleUpdateRole = async (newRole: string) => {
        if (selectedMedia) {
            await updateRoleMutation.mutateAsync({
                mediaId: selectedMedia.id,
                role: newRole,
            });
        }
    };

    const handleDelete = async () => {
        if (selectedMedia) {
            await deleteMutation.mutateAsync(selectedMedia.id);
            setEditDialogOpen(false);
            setSelectedMedia(null);
        }
    };

    const handleOpenUploadDialog = (role: string) => {
        setUploadRole(role);
        setUploadDialogOpen(true);
    };

    const handleOpenEditDialog = (media: DishMedia) => {
        setSelectedMedia(media);
        setEditDialogOpen(true);
    };

    return (
        <Box sx={{ py: 3 }}>
            {/* Selector de platos */}
            <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }} elevation={1}>
                <Typography variant="h6" gutterBottom>
                    Seleccionar plato
                </Typography>
                <Autocomplete
                    options={dishes}
                    getOptionLabel={(option) => option?.translations?.name?.es || 'Sin nombre'}
                    value={selectedDish}
                    onChange={(_, newValue) => setSelectedDish(newValue)}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            placeholder="Buscar plato..."
                            InputProps={{
                                ...params.InputProps,
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    )}
                    renderOption={(props, option) => (
                        <li {...props} key={option.id}>
                            <Box display="flex" alignItems="center" gap={2} width="100%">
                                <Box
                                    component="img"
                                    src={option?.thumbnailurl || 'placeholder-dish.jpg'}
                                    alt={option?.translations?.name?.es}
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 1,
                                        objectFit: 'cover',
                                    }}
                                    onError={(e: any) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                                <Box flexGrow={1}>
                                    <Typography variant="body2" fontWeight={600}>
                                        {option?.translations?.name?.es || 'Sin nombre'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {option?.translations?.description?.es?.substring(0, 50) || ''}
                                    </Typography>
                                </Box>
                            </Box>
                        </li>
                    )}
                    noOptionsText="No se encontraron platos"
                />
            </Paper>

            {/* Contenido principal */}
            {!selectedDish ? (
                <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
                    <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        Selecciona un plato
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Usa el buscador para seleccionar un plato y gestionar sus medios
                    </Typography>
                </Paper>
            ) : (
                <>
                    {/* Estado de validación */}
                    <Alert
                        severity={mediaStatus.color}
                        icon={
                            mediaStatus.status === 'complete' ? (
                                <CompleteIcon />
                            ) : mediaStatus.status === 'incomplete' ? (
                                <WarningIcon />
                            ) : (
                                <ErrorIcon />
                            )
                        }
                        sx={{ mb: 3 }}
                    >
                        <AlertTitle>{mediaStatus.label}</AlertTitle>
                        {mediaStatus.status === 'complete' && (
                            <Typography variant="body2">
                                Este plato tiene video principal e imagen principal. ¡Todo listo!
                            </Typography>
                        )}
                        {mediaStatus.status === 'incomplete' && (
                            <Typography variant="body2">
                                Sube los medios faltantes para completar la configuración multimedia del plato
                            </Typography>
                        )}
                        {mediaStatus.status === 'empty' && (
                            <Typography variant="body2">
                                Este plato no tiene medios. Comienza subiendo un video principal y una imagen
                                principal
                            </Typography>
                        )}
                    </Alert>

                    {isLoadingMedia ? (
                        <Grid container spacing={3}>
                            {[1, 2, 3].map((i) => (
                                <Grid item xs={12} md={4} key={i}>
                                    <Skeleton variant="rounded" height={300} />
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Grid container spacing={3}>
                            {/* Video Principal */}
                            <Grid item xs={12} md={4}>
                                <MediaCard
                                    title="Video Principal"
                                    media={groupedMedia.primaryVideo}
                                    icon={<VideoIcon />}
                                    color="error"
                                    description="Se muestra en los reels"
                                    onEdit={() => handleOpenEditDialog(groupedMedia.primaryVideo!)}
                                    onUpload={() => handleOpenUploadDialog('PRIMARY_VIDEO')}
                                    onDelete={() => {
                                        setSelectedMedia(groupedMedia.primaryVideo);
                                        handleDelete();
                                    }}
                                />
                            </Grid>

                            {/* Imagen Principal */}
                            <Grid item xs={12} md={4}>
                                <MediaCard
                                    title="Imagen Principal"
                                    media={groupedMedia.primaryImage}
                                    icon={<ImageIcon />}
                                    color="primary"
                                    description="Thumbnail y respaldo del video"
                                    onEdit={() => handleOpenEditDialog(groupedMedia.primaryImage!)}
                                    onUpload={() => handleOpenUploadDialog('PRIMARY_IMAGE')}
                                    onDelete={() => {
                                        setSelectedMedia(groupedMedia.primaryImage);
                                        handleDelete();
                                    }}
                                />
                            </Grid>

                            {/* Galería */}
                            <Grid item xs={12} md={4}>
                                <GalleryCard
                                    images={groupedMedia.gallery}
                                    onEdit={handleOpenEditDialog}
                                    onUpload={() => handleOpenUploadDialog('GALLERY_IMAGE')}
                                />
                            </Grid>
                        </Grid>
                    )}
                </>
            )}

            {/* Diálogo de subida */}
            <MediaUploadDialog
                open={uploadDialogOpen}
                onClose={() => setUploadDialogOpen(false)}
                dishId={selectedDish?.id || ''}
                dishName={selectedDish?.translations?.name?.es || ''}
                existingPrimaryVideo={!!groupedMedia.primaryVideo}
                existingPrimaryImage={!!groupedMedia.primaryImage}
                onUploadComplete={() => {
                    setUploadDialogOpen(false);
                    refetchMedia();
                }}
                onUpload={handleUpload}
            />

            {/* Diálogo de edición */}
            <MediaEditDialog
                open={editDialogOpen}
                onClose={() => {
                    setEditDialogOpen(false);
                    setSelectedMedia(null);
                }}
                media={selectedMedia}
                dishName={selectedDish?.translations?.name?.es || ''}
                onUpdateRole={handleUpdateRole}
                onDelete={handleDelete}
            />

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

// Componente para tarjetas de medios individuales
function MediaCard({
    title,
    media,
    icon,
    color,
    description,
    onEdit,
    onUpload,
    onDelete,
}: {
    title: string;
    media: DishMedia | null;
    icon: React.ReactNode;
    color: 'primary' | 'secondary' | 'error' | 'info';
    description: string;
    onEdit: () => void;
    onUpload: () => void;
    onDelete: () => void;
}) {
    const isVideo = media?.media_type === 'video';

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, bgcolor: `${color}.50`, borderBottom: 1, borderColor: 'divider' }}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    {icon}
                    <Typography variant="h6" fontWeight={600}>
                        {title}
                    </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                    {description}
                </Typography>
                <Box mt={1}>
                    <Chip
                        label={media ? 'OK' : 'Falta'}
                        size="small"
                        color={media ? 'success' : 'default'}
                        sx={{ fontWeight: 600 }}
                    />
                </Box>
            </Box>

            <CardContent sx={{ flexGrow: 1, p: 0 }}>
                {media ? (
                    <Box sx={{ position: 'relative', width: '100%', height: 200, bgcolor: 'black' }}>
                        {isVideo ? (
                            <video
                                src={media.url}
                                poster={media.thumbnail_url || undefined}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                            />
                        ) : (
                            <img
                                src={media.url}
                                alt={media.display_name || title}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                                onError={(e: any) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        )}
                    </Box>
                ) : (
                    <Box
                        sx={{
                            height: 200,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'action.hover',
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            Sin medio
                        </Typography>
                    </Box>
                )}
            </CardContent>

            <CardActions sx={{ p: 2, gap: 1, justifyContent: 'space-between' }}>
                {media ? (
                    <>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={onEdit}
                        >
                            Editar
                        </Button>
                        <IconButton size="small" color="error" onClick={onDelete}>
                            <DeleteIcon />
                        </IconButton>
                    </>
                ) : (
                    <Button
                        fullWidth
                        variant="contained"
                        color={color}
                        startIcon={<UploadIcon />}
                        onClick={onUpload}
                    >
                        Subir {title === 'Video Principal' ? 'Video' : 'Imagen'}
                    </Button>
                )}
            </CardActions>
        </Card>
    );
}

// Componente para tarjeta de galería
function GalleryCard({
    images,
    onEdit,
    onUpload,
}: {
    images: DishMedia[];
    onEdit: (media: DishMedia) => void;
    onUpload: () => void;
}) {
    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, bgcolor: 'info.50', borderBottom: 1, borderColor: 'divider' }}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <GalleryIcon />
                    <Typography variant="h6" fontWeight={600}>
                        Galería ({images.length})
                    </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                    Vista detallada del plato
                </Typography>
            </Box>

            <CardContent sx={{ flexGrow: 1, p: 2 }}>
                {images.length > 0 ? (
                    <Grid container spacing={1}>
                        {images.map((img) => (
                            <Grid item xs={6} key={img.id}>
                                <Box
                                    onClick={() => onEdit(img)}
                                    sx={{
                                        position: 'relative',
                                        width: '100%',
                                        paddingTop: '100%',
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        '&:hover': {
                                            opacity: 0.8,
                                        },
                                    }}
                                >
                                    <img
                                        src={img.url}
                                        alt={img.display_name || 'Galería'}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                        }}
                                        onError={(e: any) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    <Box
                        sx={{
                            height: 150,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'action.hover',
                            borderRadius: 1,
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            Sin imágenes en galería
                        </Typography>
                    </Box>
                )}
            </CardContent>

            <CardActions sx={{ p: 2 }}>
                <Button
                    fullWidth
                    variant="contained"
                    color="info"
                    startIcon={<AddIcon />}
                    onClick={onUpload}
                >
                    Añadir a Galería
                </Button>
            </CardActions>
        </Card>
    );
}
