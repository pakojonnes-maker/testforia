// apps/admin/src/components/media/MediaEditDialog.tsx

import React, { useState } from 'react';
import type { DishMedia } from '@visualtaste/api';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Alert,
    AlertTitle,
    Divider,
    Stack,
    Chip,
} from '@mui/material';
import {
    Close as CloseIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    Warning as WarningIcon,
    VideoLibrary as VideoIcon,
    Image as ImageIcon,
} from '@mui/icons-material';

interface MediaEditDialogProps {
    open: boolean;
    onClose: () => void;
    media: DishMedia | null;
    dishName: string;
    onUpdateRole: (newRole: string) => Promise<void>;
    onDelete: () => Promise<void>;
}

const ROLE_LABELS = {
    PRIMARY_VIDEO: 'Video Principal',
    PRIMARY_IMAGE: 'Imagen Principal',
    GALLERY_IMAGE: 'Galería',
};

const ROLE_DESCRIPTIONS = {
    PRIMARY_VIDEO: 'Este video se muestra en los reels del menú',
    PRIMARY_IMAGE: 'Thumbnail del plato y respaldo si el video falla',
    GALLERY_IMAGE: 'Parte de la galería en vista detallada del plato',
};

export default function MediaEditDialog({
    open,
    onClose,
    media,
    dishName,
    onUpdateRole,
    onDelete,
}: MediaEditDialogProps) {
    const [selectedRole, setSelectedRole] = useState<string>(media?.role || 'GALLERY_IMAGE');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    React.useEffect(() => {
        if (media?.role) {
            setSelectedRole(media.role);
        }
    }, [media]);

    if (!media) return null;

    const isVideo = media.media_type === 'video';
    const hasChanged = selectedRole !== media.role;

    // Advertencia: video sin thumbnail
    const isVideoWithoutThumbnail = isVideo && !media.thumbnail_url;

    const handleSave = async () => {
        if (!hasChanged) {
            onClose();
            return;
        }

        setIsUpdating(true);
        try {
            await onUpdateRole(selectedRole);
            onClose();
        } catch (error) {
            console.error('Error updating role:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await onDelete();
            setShowDeleteConfirm(false);
            onClose();
        } catch (error) {
            console.error('Error deleting media:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const formatFileSize = (bytes: number | undefined) => {
        if (!bytes) return 'N/A';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    const formatDuration = (seconds: number | undefined) => {
        if (!seconds) return 'N/A';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 2 },
            }}
        >
            <DialogTitle>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={1}>
                        {isVideo ? (
                            <VideoIcon color="secondary" />
                        ) : (
                            <ImageIcon color="primary" />
                        )}
                        <Typography variant="h6">Editar medio</Typography>
                    </Box>
                    <IconButton size="small" onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {dishName}
                </Typography>
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={3}>
                    {/* Preview del medio */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            Vista previa
                        </Typography>
                        <Box
                            sx={{
                                position: 'relative',
                                width: '100%',
                                height: 300,
                                borderRadius: 2,
                                overflow: 'hidden',
                                bgcolor: 'black',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {isVideo ? (
                                <video
                                    src={media.url}
                                    poster={media.thumbnail_url || undefined}
                                    controls
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                    }}
                                />
                            ) : (
                                <img
                                    src={media.url}
                                    alt={media.display_name || 'Media'}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                    }}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            )}
                        </Box>
                    </Box>

                    {/* Selector de rol */}
                    <FormControl fullWidth>
                        <InputLabel>Rol del medio</InputLabel>
                        <Select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            label="Rol del medio"
                            disabled={isUpdating || isDeleting}
                        >
                            <MenuItem value="PRIMARY_VIDEO" disabled={!isVideo}>
                                <Box>
                                    <Typography variant="body2" fontWeight={600}>
                                        {ROLE_LABELS.PRIMARY_VIDEO}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {ROLE_DESCRIPTIONS.PRIMARY_VIDEO}
                                    </Typography>
                                </Box>
                            </MenuItem>
                            <MenuItem value="PRIMARY_IMAGE" disabled={isVideo}>
                                <Box>
                                    <Typography variant="body2" fontWeight={600}>
                                        {ROLE_LABELS.PRIMARY_IMAGE}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {ROLE_DESCRIPTIONS.PRIMARY_IMAGE}
                                    </Typography>
                                </Box>
                            </MenuItem>
                            <MenuItem value="GALLERY_IMAGE">
                                <Box>
                                    <Typography variant="body2" fontWeight={600}>
                                        {ROLE_LABELS.GALLERY_IMAGE}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {ROLE_DESCRIPTIONS.GALLERY_IMAGE}
                                    </Typography>
                                </Box>
                            </MenuItem>
                        </Select>
                    </FormControl>

                    {/* Advertencias */}
                    {isVideoWithoutThumbnail && (
                        <Alert severity="warning" icon={<WarningIcon />}>
                            <AlertTitle>Video sin thumbnail</AlertTitle>
                            Este video no tiene una imagen de vista previa. Se recomienda subir una imagen principal para mejorar la experiencia del usuario.
                        </Alert>
                    )}

                    {hasChanged && (
                        <Alert severity="info">
                            El rol del medio ha cambiado. Recuerda guardar los cambios.
                        </Alert>
                    )}

                    <Divider />

                    {/* Metadata */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            Información del archivo
                        </Typography>
                        <Stack spacing={1}>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                    Nombre:
                                </Typography>
                                <Typography variant="body2" fontWeight={500}>
                                    {media.display_name || 'Sin nombre'}
                                </Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                    Tipo:
                                </Typography>
                                <Chip
                                    label={isVideo ? 'Video' : 'Imagen'}
                                    size="small"
                                    color={isVideo ? 'secondary' : 'primary'}
                                />
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                    Tamaño:
                                </Typography>
                                <Typography variant="body2" fontWeight={500}>
                                    {formatFileSize(media.file_size)}
                                </Typography>
                            </Box>
                            {media.width && media.height && (
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">
                                        Dimensiones:
                                    </Typography>
                                    <Typography variant="body2" fontWeight={500}>
                                        {media.width} × {media.height}
                                    </Typography>
                                </Box>
                            )}
                            {isVideo && media.duration && (
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">
                                        Duración:
                                    </Typography>
                                    <Typography variant="body2" fontWeight={500}>
                                        {formatDuration(media.duration)}
                                    </Typography>
                                </Box>
                            )}
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                    Rol actual:
                                </Typography>
                                <Chip
                                    label={ROLE_LABELS[media.role as keyof typeof ROLE_LABELS] || media.role}
                                    size="small"
                                    color={media.role === 'PRIMARY_VIDEO' ? 'error' : media.role === 'PRIMARY_IMAGE' ? 'primary' : 'info'}
                                />
                            </Box>
                        </Stack>
                    </Box>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
                {/* Botón eliminar a la izquierda */}
                <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    color="error"
                    variant="outlined"
                    startIcon={<DeleteIcon />}
                    disabled={isUpdating || isDeleting}
                >
                    Eliminar
                </Button>

                {/* Botones de acción a la derecha */}
                <Box display="flex" gap={1}>
                    <Button
                        onClick={onClose}
                        disabled={isUpdating || isDeleting}
                        variant="outlined"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanged || isUpdating || isDeleting}
                        variant="contained"
                        startIcon={<SaveIcon />}
                    >
                        {isUpdating ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                </Box>
            </DialogActions>

            {/* Diálogo de confirmación de eliminación */}
            <Dialog
                open={showDeleteConfirm}
                onClose={() => !isDeleting && setShowDeleteConfirm(false)}
                maxWidth="xs"
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <DeleteIcon color="error" />
                        <Typography variant="h6">Confirmar eliminación</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        ¿Estás seguro de que deseas eliminar este medio?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Esta acción no se puede deshacer.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeleting}
                        variant="outlined"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        variant="contained"
                        color="error"
                        startIcon={<DeleteIcon />}
                    >
                        {isDeleting ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
}
