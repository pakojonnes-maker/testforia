// apps/admin/src/components/IconPicker.tsx

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    CircularProgress,
    Alert,
    Paper,
    IconButton,
    Tooltip
} from '@mui/material';
import { Clear as ClearIcon } from '@mui/icons-material';
import { apiClient } from '../lib/apiClient';

interface Icon {
    filename: string;
    url: string;
    size?: number;
}

interface IconPickerProps {
    value: string | null;
    onChange: (filename: string | null) => void;
    API_URL?: string;
}

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, API_URL }) => {
    const [icons, setIcons] = useState<Icon[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadIcons();
    }, []);

    const loadIcons = async () => {
        try {
            setLoading(true);
            setError(null);
            const iconsList = await apiClient.getSystemIcons();
            setIcons(iconsList);
        } catch (err: any) {
            console.error('[IconPicker] Error al cargar iconos:', err);
            setError('No se pudieron cargar los iconos disponibles');
        } finally {
            setLoading(false);
        }
    };

    const handleIconSelect = (filename: string) => {
        onChange(filename === value ? null : filename);
    };

    const handleClear = () => {
        onChange(null);
    };

    const getIconUrl = (filename: string) => {
        const baseUrl = API_URL || import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';
        return `${baseUrl}/media/System/icons/${filename}`;
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                <CircularProgress size={40} />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ my: 2 }}>
                {error}
            </Alert>
        );
    }

    if (icons.length === 0) {
        return (
            <Alert severity="info" sx={{ my: 2 }}>
                No hay iconos disponibles
            </Alert>
        );
    }

    return (
        <Box sx={{ my: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    Selecciona un icono {value && '(o haz clic en el mismo para deseleccionar)'}
                </Typography>
                {value && (
                    <Tooltip title="Limpiar selección">
                        <IconButton size="small" onClick={handleClear} color="default">
                            <ClearIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            {/* Preview del icono seleccionado */}
            {value && (
                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        mb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        bgcolor: 'action.hover'
                    }}
                >
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            border: '2px solid',
                            borderColor: 'primary.main'
                        }}
                    >
                        <Box
                            component="img"
                            src={getIconUrl(value)}
                            alt={value}
                            sx={{
                                width: 32,
                                height: 32,
                                objectFit: 'contain'
                            }}
                        />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                            Icono seleccionado
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {value}
                        </Typography>
                    </Box>
                </Paper>
            )}

            {/* Grid de iconos disponibles */}
            <Grid container spacing={1.5}>
                {icons.map((icon) => {
                    const isSelected = icon.filename === value;

                    return (
                        <Grid item xs={3} sm={2} md={1.5} key={icon.filename}>
                            <Tooltip title={icon.filename} arrow>
                                <Paper
                                    onClick={() => handleIconSelect(icon.filename)}
                                    elevation={isSelected ? 4 : 0}
                                    variant={isSelected ? 'elevation' : 'outlined'}
                                    sx={{
                                        p: 1.5,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        borderWidth: 2,
                                        borderColor: isSelected ? 'primary.main' : 'divider',
                                        bgcolor: isSelected ? 'primary.lighter' : 'background.paper',
                                        '&:hover': {
                                            transform: 'scale(1.05)',
                                            borderColor: 'primary.main',
                                            bgcolor: isSelected ? 'primary.lighter' : 'action.hover'
                                        },
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        aspectRatio: '1/1'
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={icon.url}
                                        alt={icon.filename}
                                        sx={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'contain',
                                            opacity: isSelected ? 1 : 0.8
                                        }}
                                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                </Paper>
                            </Tooltip>
                        </Grid>
                    );
                })}
            </Grid>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                {icons.length} iconos disponibles
            </Typography>
        </Box>
    );
};

export default IconPicker;
