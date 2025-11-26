// apps/admin/src/components/media/MediaUploadDialog.tsx

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
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
    LinearProgress,
    IconButton,
    Alert,
    AlertTitle,
    Chip,
    Stack,
} from '@mui/material';
import {
    Close as CloseIcon,
    CloudUpload as CloudUploadIcon,
    Image as ImageIcon,
    VideoLibrary as VideoIcon,
    Clear as ClearIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface MediaUploadDialogProps {
    open: boolean;
    onClose: () => void;
    dishId: string;
    dishName: string;
    existingPrimaryVideo: boolean;
    existingPrimaryImage: boolean;
    onUploadComplete: () => void;
    onUpload: (file: File, role: string) => Promise<void>;
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

export default function MediaUploadDialog({
    open,
    onClose,
    dishId,
    dishName,
    existingPrimaryVideo,
    existingPrimaryImage,
    onUploadComplete,
    onUpload,
}: MediaUploadDialogProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [selectedRole, setSelectedRole] = useState<string>('GALLERY_IMAGE');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [error, setError] = useState<string>('');

    // Auto-detectar rol según tipo de archivo
    useEffect(() => {
        if (files.length > 0) {
            const firstFile = files[0];
            const isVideo = firstFile.type.startsWith('video/');

            // Auto-seleccionar rol basado en el tipo y lo que ya existe
            if (isVideo && !existingPrimaryVideo) {
                setSelectedRole('PRIMARY_VIDEO');
            } else if (!isVideo && !existingPrimaryImage) {
                setSelectedRole('PRIMARY_IMAGE');
            } else {
                setSelectedRole('GALLERY_IMAGE');
            }
        }
    }, [files, existingPrimaryVideo, existingPrimaryImage]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
            'video/mp4': ['.mp4'],
            'video/quicktime': ['.mov'],
            'video/webm': ['.webm'],
        },
        maxSize: MAX_FILE_SIZE,
        multiple: true,
        onDrop: (acceptedFiles, rejectedFiles) => {
            if (rejectedFiles.length > 0) {
                const reasons = rejectedFiles.map(file => {
                    if (file.errors.some(e => e.code === 'file-too-large')) {
                        return `${file.file.name} (demasiado grande, máximo 10MB)`;
                    }
                    return `${file.file.name} (${file.errors.map(e => e.message).join(', ')})`;
                });
                setError(`Archivos rechazados: ${reasons.join(', ')}`);
            } else {
                setError('');
            }

            setFiles(prev => [...prev, ...acceptedFiles]);
        },
    });

    const handleRemoveFile = useCallback((index: number) => {
        setFiles(prev => {
            const newFiles = [...prev];
            newFiles.splice(index, 1);
            return newFiles;
        });
    }, []);

    const handleUpload = async () => {
        if (files.length === 0) return;

        setIsUploading(true);
        setError('');

        try {
            for (const file of files) {
                const isVideo = file.type.startsWith('video/');

                // Validar tipo de archivo según rol
                if (selectedRole === 'PRIMARY_VIDEO' && !isVideo) {
                    setError(`"${file.name}" no es un video. Solo se pueden subir videos como video principal.`);
                    continue;
                }

                if (selectedRole === 'PRIMARY_IMAGE' && isVideo) {
                    setError(`"${file.name}" no es una imagen. Solo se pueden subir imágenes como imagen principal.`);
                    continue;
                }

                // Simular progreso
                setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

                // Subir archivo
                await onUpload(file, selectedRole);

                // Completar progreso
                setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
            }

            // Limpiar y cerrar
            setFiles([]);
            setUploadProgress({});
            onUploadComplete();
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Error al subir archivos');
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        if (!isUploading) {
            setFiles([]);
            setUploadProgress({});
            setError('');
            onClose();
        }
    };

    const willReplaceExisting =
        (selectedRole === 'PRIMARY_VIDEO' && existingPrimaryVideo) ||
        (selectedRole === 'PRIMARY_IMAGE' && existingPrimaryImage);

    const isVideoRole = selectedRole === 'PRIMARY_VIDEO';
    const hasVideoFiles = files.some(f => f.type.startsWith('video/'));
    const hasImageFiles = files.some(f => !f.type.startsWith('video/'));

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 2 },
            }}
        >
            <DialogTitle>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={1}>
                        <CloudUploadIcon color="primary" />
                        <Typography variant="h6">Subir medios</Typography>
                    </Box>
                    <IconButton
                        size="small"
                        onClick={handleClose}
                        disabled={isUploading}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {dishName}
                </Typography>
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2}>
                    {/* Dropzone */}
                    <Box
                        {...getRootProps()}
                        sx={{
                            border: '2px dashed',
                            borderColor: isDragActive ? 'primary.main' : 'divider',
                            borderRadius: 2,
                            p: 3,
                            textAlign: 'center',
                            cursor: 'pointer',
                            bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                            transition: 'all 0.2s',
                            '&:hover': {
                                borderColor: 'primary.main',
                                bgcolor: 'action.hover',
                            },
                        }}
                    >
                        <input {...getInputProps()} />
                        <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                        <Typography variant="body1" gutterBottom>
                            {isDragActive
                                ? 'Suelta los archivos aquí'
                                : 'Arrastra archivos aquí o haz click para seleccionar'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Imágenes (JPG, PNG, WebP) o Videos (MP4, MOV, WebM) - Máximo 10MB
                        </Typography>
                    </Box>

                    {/* Lista de archivos */}
                    {files.length > 0 && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Archivos seleccionados ({files.length})
                            </Typography>
                            {files.map((file, index) => {
                                const isVideo = file.type.startsWith('video/');
                                const progress = uploadProgress[file.name] || 0;

                                return (
                                    <Box
                                        key={index}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            p: 1.5,
                                            mb: 1,
                                            borderRadius: 1,
                                            bgcolor: 'background.default',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                        }}
                                    >
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
                                            </Typography>
                                            {progress > 0 && (
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={progress}
                                                    sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                                                />
                                            )}
                                        </Box>

                                        <IconButton
                                            size="small"
                                            onClick={() => handleRemoveFile(index)}
                                            disabled={isUploading}
                                            sx={{ ml: 1 }}
                                        >
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                );
                            })}
                        </Box>
                    )}

                    {/* Selector de rol */}
                    <FormControl fullWidth>
                        <InputLabel>Rol del medio</InputLabel>
                        <Select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            label="Rol del medio"
                            disabled={isUploading}
                        >
                            <MenuItem value="PRIMARY_VIDEO">
                                <Box>
                                    <Typography variant="body2" fontWeight={600}>
                                        {ROLE_LABELS.PRIMARY_VIDEO}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {ROLE_DESCRIPTIONS.PRIMARY_VIDEO}
                                    </Typography>
                                </Box>
                            </MenuItem>
                            <MenuItem value="PRIMARY_IMAGE">
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

                    {/* Advertencias y mensajes */}
                    {willReplaceExisting && (
                        <Alert severity="warning" icon={<WarningIcon />}>
                            <AlertTitle>Se reemplazará el medio actual</AlertTitle>
                            Ya existe {selectedRole === 'PRIMARY_VIDEO' ? 'un video principal' : 'una imagen principal'} para este plato. Será reemplazado por el nuevo archivo.
                        </Alert>
                    )}

                    {isVideoRole && hasImageFiles && (
                        <Alert severity="error">
                            Has seleccionado imágenes pero el rol es "Video Principal".
                            Cambia el rol o selecciona solo archivos de video.
                        </Alert>
                    )}

                    {!isVideoRole && hasVideoFiles && selectedRole === 'PRIMARY_IMAGE' && (
                        <Alert severity="error">
                            Has seleccionado videos pero el rol es "Imagen Principal".
                            Cambia el rol o selecciona solo imágenes.
                        </Alert>
                    )}

                    {error && (
                        <Alert severity="error" onClose={() => setError('')}>
                            {error}
                        </Alert>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                    onClick={handleClose}
                    disabled={isUploading}
                    variant="outlined"
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleUpload}
                    disabled={files.length === 0 || isUploading}
                    variant="contained"
                    startIcon={isUploading ? null : <CloudUploadIcon />}
                >
                    {isUploading ? 'Subiendo...' : `Subir ${files.length} archivo${files.length !== 1 ? 's' : ''}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
