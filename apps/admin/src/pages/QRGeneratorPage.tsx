import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Grid,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Slider,
    Stack,
    Divider,
    Card,
    CardContent,
    Switch,
    FormControlLabel,
    Tooltip,
    IconButton,
    Chip,
    ButtonGroup,
    alpha
} from '@mui/material';
import {
    Download as DownloadIcon,
    QrCode as QrCodeIcon,
    Palette as PaletteIcon,
    Style as StyleIcon,
    Image as ImageIcon,
    Gradient as GradientIcon,
    AutoAwesome as PresetIcon,
    Tune as TuneIcon,
    RestartAlt as ResetIcon
} from '@mui/icons-material';
import QRCodeGenerator, { QRCodeHandle } from '../components/QRCodeGenerator';

// --- Types ---
interface GradientConfig {
    enabled: boolean;
    type: 'linear' | 'radial';
    rotation: number;
    colorStops: Array<{ offset: number; color: string }>;
}

interface QRColorState {
    dark: string;
    light: string;
    eyeFrame: string;
    eyeBall: string;
    gradient: GradientConfig;
}

interface QROptions {
    text: string;
    dotStyle: 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded';
    cornerSquareStyle: 'square' | 'dot' | 'extra-rounded';
    cornerDotStyle: 'square' | 'dot';
    color: QRColorState;
    logo: {
        url: string;
        size: number;
        removeBehind: boolean;
    };
    ecl: 'L' | 'M' | 'Q' | 'H';
}

interface DesignPreset {
    id: string;
    name: string;
    description: string;
    icon: string;
    options: Partial<QROptions>;
}

// --- Presets ---
const DESIGN_PRESETS: DesignPreset[] = [
    {
        id: 'classic',
        name: 'Clásico',
        description: 'Negro sobre blanco',
        icon: '⬛',
        options: {
            dotStyle: 'square',
            cornerSquareStyle: 'square',
            cornerDotStyle: 'square',
            color: {
                dark: '#000000',
                light: '#ffffff',
                eyeFrame: '#000000',
                eyeBall: '#000000',
                gradient: { enabled: false, type: 'linear', rotation: 0, colorStops: [] }
            }
        }
    },
    {
        id: 'modern',
        name: 'Moderno',
        description: 'Azul con puntos',
        icon: '🔵',
        options: {
            dotStyle: 'dots',
            cornerSquareStyle: 'dot',
            cornerDotStyle: 'dot',
            color: {
                dark: '#3b82f6',
                light: '#ffffff',
                eyeFrame: '#2563eb',
                eyeBall: '#1d4ed8',
                gradient: { enabled: false, type: 'linear', rotation: 0, colorStops: [] }
            }
        }
    },
    {
        id: 'premium',
        name: 'Premium',
        description: 'Gradiente dorado',
        icon: '✨',
        options: {
            dotStyle: 'classy-rounded',
            cornerSquareStyle: 'extra-rounded',
            cornerDotStyle: 'dot',
            color: {
                dark: '#f59e0b',
                light: '#0f172a',
                eyeFrame: '#d97706',
                eyeBall: '#fbbf24',
                gradient: {
                    enabled: true,
                    type: 'linear',
                    rotation: Math.PI / 4,
                    colorStops: [
                        { offset: 0, color: '#f59e0b' },
                        { offset: 1, color: '#dc2626' }
                    ]
                }
            }
        }
    },
    {
        id: 'restaurant',
        name: 'Restaurante',
        description: 'Verde elegante',
        icon: '🍽️',
        options: {
            dotStyle: 'classy',
            cornerSquareStyle: 'extra-rounded',
            cornerDotStyle: 'square',
            color: {
                dark: '#10b981',
                light: '#ffffff',
                eyeFrame: '#059669',
                eyeBall: '#047857',
                gradient: { enabled: false, type: 'linear', rotation: 0, colorStops: [] }
            }
        }
    },
    {
        id: 'custom',
        name: 'Personalizado',
        description: 'Tu diseño',
        icon: '🎨',
        options: {}
    }
];

const DEFAULT_OPTIONS: QROptions = {
    text: 'https://visualtaste.app',
    dotStyle: 'square',
    cornerSquareStyle: 'square',
    cornerDotStyle: 'square',
    color: {
        dark: '#000000',
        light: '#ffffff',
        eyeFrame: '#000000',
        eyeBall: '#000000',
        gradient: {
            enabled: false,
            type: 'linear',
            rotation: 0,
            colorStops: [
                { offset: 0, color: '#3b82f6' },
                { offset: 1, color: '#8b5cf6' }
            ]
        }
    },
    logo: {
        url: '',
        size: 0.2,
        removeBehind: true
    },
    ecl: 'M'
};

const QRGeneratorPage: React.FC = () => {
    const location = useLocation();

    // --- State ---
    const [options, setOptions] = useState<QROptions>(DEFAULT_OPTIONS);
    const [selectedPreset, setSelectedPreset] = useState<string>('classic');
    const [debouncedOptions, setDebouncedOptions] = useState(options);
    const qrRef = useRef<QRCodeHandle>(null);

    // --- Effect: Load from URL query ---
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const urlParam = params.get('url') || params.get('text');
        if (urlParam) {
            setOptions(prev => ({ ...prev, text: urlParam }));
        }
    }, [location.search]);


    // --- Debounce Effect ---
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedOptions(options);
        }, 300);
        return () => clearTimeout(timer);
    }, [options]);

    // --- Handlers ---
    const handlePresetChange = (presetId: string) => {
        setSelectedPreset(presetId);
        const preset = DESIGN_PRESETS.find(p => p.id === presetId);
        if (preset && preset.options && Object.keys(preset.options).length > 0) {
            setOptions(prev => ({
                ...prev,
                ...preset.options,
                color: { ...prev.color, ...preset.options.color }
            }));
        }
    };

    const handleChange = <K extends keyof QROptions>(field: K, value: QROptions[K]) => {
        setOptions(prev => ({ ...prev, [field]: value }));
        setSelectedPreset('custom');
    };

    const handleColorChange = (field: keyof Omit<QRColorState, 'gradient'>, value: string) => {
        setOptions(prev => ({
            ...prev,
            color: { ...prev.color, [field]: value }
        }));
        setSelectedPreset('custom');
    };

    const handleGradientChange = <K extends keyof GradientConfig>(field: K, value: GradientConfig[K]) => {
        setOptions(prev => ({
            ...prev,
            color: {
                ...prev.color,
                gradient: { ...prev.color.gradient, [field]: value }
            }
        }));
        setSelectedPreset('custom');
    };

    const handleGradientColorChange = (index: number, color: string) => {
        setOptions(prev => {
            const newColorStops = [...prev.color.gradient.colorStops];
            newColorStops[index] = { ...newColorStops[index], color };
            return {
                ...prev,
                color: {
                    ...prev.color,
                    gradient: { ...prev.color.gradient, colorStops: newColorStops }
                }
            };
        });
        setSelectedPreset('custom');
    };

    const handleLogoChange = (field: keyof typeof options.logo, value: any) => {
        setOptions(prev => ({
            ...prev,
            logo: { ...prev.logo, [field]: value }
        }));
    };

    const handleDownload = (format: 'svg' | 'png' | 'jpeg' | 'webp') => {
        if (qrRef.current) {
            qrRef.current.download(format);
        }
    };

    const handleReset = () => {
        setOptions(DEFAULT_OPTIONS);
        setSelectedPreset('classic');
    };

    // --- Build QR Options ---
    const buildQROptions = () => {
        const baseDotsOptions: any = {
            color: options.color.dark,
            type: options.dotStyle
        };

        if (options.color.gradient.enabled) {
            baseDotsOptions.gradient = {
                type: options.color.gradient.type,
                rotation: options.color.gradient.rotation,
                colorStops: options.color.gradient.colorStops
            };
        }

        return {
            dotsOptions: baseDotsOptions,
            cornersSquareOptions: {
                color: options.color.eyeFrame,
                type: options.cornerSquareStyle
            },
            cornersDotOptions: {
                color: options.color.eyeBall,
                type: options.cornerDotStyle
            },
            backgroundOptions: {
                color: options.color.light
            }
        };
    };

    const qrOptions = buildQROptions();

    // --- Render Helpers ---
    const renderColorPicker = (label: string, field: keyof Omit<QRColorState, 'gradient'>, icon?: React.ReactNode) => (
        <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                {icon} {label}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
                <Box
                    component="input"
                    type="color"
                    value={options.color[field]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleColorChange(field, e.target.value)}
                    sx={{
                        width: 44,
                        height: 44,
                        padding: 0,
                        border: '2px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        '&::-webkit-color-swatch-wrapper': { padding: 0 },
                        '&::-webkit-color-swatch': { border: 'none', borderRadius: 1 }
                    }}
                />
                <TextField
                    size="small"
                    value={options.color[field]}
                    onChange={(e) => handleColorChange(field, e.target.value)}
                    sx={{ flexGrow: 1 }}
                    inputProps={{ style: { fontFamily: 'monospace' } }}
                />
            </Stack>
        </Box>
    );

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <QrCodeIcon sx={{ fontSize: 36, color: 'primary.main' }} />
                            Generador de Códigos QR
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                            Crea códigos QR personalizados con estilos premium para tu restaurante
                        </Typography>
                    </Box>
                    <Tooltip title="Restablecer valores">
                        <IconButton onClick={handleReset} sx={{ color: 'text.secondary' }}>
                            <ResetIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            <Grid container spacing={3}>
                {/* --- Left Column: Controls --- */}
                <Grid item xs={12} lg={7}>
                    <Stack spacing={3}>
                        {/* Presets Section */}
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PresetIcon fontSize="small" sx={{ color: 'primary.main' }} />
                                Presets de Diseño
                            </Typography>
                            <Grid container spacing={1.5}>
                                {DESIGN_PRESETS.map((preset) => (
                                    <Grid item xs={6} sm={4} md={2.4} key={preset.id}>
                                        <Card
                                            onClick={() => handlePresetChange(preset.id)}
                                            sx={{
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                py: 2,
                                                px: 1,
                                                transition: 'all 0.2s',
                                                border: '2px solid',
                                                borderColor: selectedPreset === preset.id ? 'primary.main' : 'transparent',
                                                bgcolor: selectedPreset === preset.id ? alpha('#3b82f6', 0.1) : 'background.paper',
                                                '&:hover': {
                                                    borderColor: selectedPreset === preset.id ? 'primary.main' : 'divider',
                                                    transform: 'translateY(-2px)'
                                                }
                                            }}
                                        >
                                            <Typography variant="h5" sx={{ mb: 0.5 }}>{preset.icon}</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{preset.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{preset.description}</Typography>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>

                        {/* Content Section */}
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <QrCodeIcon fontSize="small" sx={{ color: 'primary.main' }} />
                                Contenido
                            </Typography>
                            <TextField
                                fullWidth
                                label="Enlace o Texto"
                                value={options.text}
                                onChange={(e) => handleChange('text', e.target.value)}
                                placeholder="https://visualtaste.app/menu/..."
                                helperText="La URL o texto que se codificará en el QR"
                            />
                        </Paper>

                        {/* Style Section */}
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <StyleIcon fontSize="small" sx={{ color: 'primary.main' }} />
                                Estilo
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Estilo de Módulos</InputLabel>
                                        <Select
                                            value={options.dotStyle}
                                            label="Estilo de Módulos"
                                            onChange={(e) => handleChange('dotStyle', e.target.value as any)}
                                        >
                                            <MenuItem value="square">Cuadrado (Clásico)</MenuItem>
                                            <MenuItem value="rounded">Redondeado</MenuItem>
                                            <MenuItem value="dots">Puntos</MenuItem>
                                            <MenuItem value="classy">Elegante</MenuItem>
                                            <MenuItem value="classy-rounded">Elegante Redondeado</MenuItem>
                                            <MenuItem value="extra-rounded">Extra Redondeado</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Corrección de Error</InputLabel>
                                        <Select
                                            value={options.ecl}
                                            label="Corrección de Error"
                                            onChange={(e) => handleChange('ecl', e.target.value as any)}
                                        >
                                            <MenuItem value="L">Baja (7%)</MenuItem>
                                            <MenuItem value="M">Media (15%)</MenuItem>
                                            <MenuItem value="Q">Cuartil (25%)</MenuItem>
                                            <MenuItem value="H">Alta (30%) - Mejor para logos</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Esquinas Exteriores</InputLabel>
                                        <Select
                                            value={options.cornerSquareStyle}
                                            label="Esquinas Exteriores"
                                            onChange={(e) => handleChange('cornerSquareStyle', e.target.value as any)}
                                        >
                                            <MenuItem value="square">Cuadrado</MenuItem>
                                            <MenuItem value="dot">Circular</MenuItem>
                                            <MenuItem value="extra-rounded">Extra Redondeado</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Puntos Centrales</InputLabel>
                                        <Select
                                            value={options.cornerDotStyle}
                                            label="Puntos Centrales"
                                            onChange={(e) => handleChange('cornerDotStyle', e.target.value as any)}
                                        >
                                            <MenuItem value="square">Cuadrado</MenuItem>
                                            <MenuItem value="dot">Circular</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* Colors Section */}
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PaletteIcon fontSize="small" sx={{ color: 'primary.main' }} />
                                Colores
                            </Typography>

                            {/* Basic Colors */}
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={6} sm={3}>
                                    {renderColorPicker("Principal", "dark")}
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    {renderColorPicker("Fondo", "light")}
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    {renderColorPicker("Marco Ojos", "eyeFrame")}
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    {renderColorPicker("Centro Ojos", "eyeBall")}
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 2 }} />

                            {/* Gradient Section */}
                            <Box>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <GradientIcon fontSize="small" />
                                        Gradiente
                                        <Chip label="Pro" size="small" color="primary" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />
                                    </Typography>
                                    <Switch
                                        checked={options.color.gradient.enabled}
                                        onChange={(e) => handleGradientChange('enabled', e.target.checked)}
                                        size="small"
                                    />
                                </Stack>

                                {options.color.gradient.enabled && (
                                    <Box sx={{
                                        p: 2,
                                        bgcolor: 'rgba(255,255,255,0.03)',
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: 'divider'
                                    }}>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} sm={6}>
                                                <FormControl fullWidth size="small">
                                                    <InputLabel>Tipo</InputLabel>
                                                    <Select
                                                        value={options.color.gradient.type}
                                                        label="Tipo"
                                                        onChange={(e) => handleGradientChange('type', e.target.value as any)}
                                                    >
                                                        <MenuItem value="linear">Lineal</MenuItem>
                                                        <MenuItem value="radial">Radial</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Grid>
                                            {options.color.gradient.type === 'linear' && (
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="caption" color="text.secondary">Rotación</Typography>
                                                    <Slider
                                                        value={options.color.gradient.rotation * (180 / Math.PI)}
                                                        min={0}
                                                        max={360}
                                                        onChange={(_, val) => handleGradientChange('rotation', (val as number) * (Math.PI / 180))}
                                                        valueLabelDisplay="auto"
                                                        valueLabelFormat={(v) => `${Math.round(v)}°`}
                                                    />
                                                </Grid>
                                            )}
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="text.secondary">Color Inicio</Typography>
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                                                    <Box
                                                        component="input"
                                                        type="color"
                                                        value={options.color.gradient.colorStops[0]?.color || '#3b82f6'}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleGradientColorChange(0, e.target.value)}
                                                        sx={{
                                                            width: 36,
                                                            height: 36,
                                                            padding: 0,
                                                            border: '2px solid',
                                                            borderColor: 'divider',
                                                            borderRadius: 1.5,
                                                            cursor: 'pointer'
                                                        }}
                                                    />
                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                                        {options.color.gradient.colorStops[0]?.color || '#3b82f6'}
                                                    </Typography>
                                                </Stack>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="text.secondary">Color Fin</Typography>
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                                                    <Box
                                                        component="input"
                                                        type="color"
                                                        value={options.color.gradient.colorStops[1]?.color || '#8b5cf6'}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleGradientColorChange(1, e.target.value)}
                                                        sx={{
                                                            width: 36,
                                                            height: 36,
                                                            padding: 0,
                                                            border: '2px solid',
                                                            borderColor: 'divider',
                                                            borderRadius: 1.5,
                                                            cursor: 'pointer'
                                                        }}
                                                    />
                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                                        {options.color.gradient.colorStops[1]?.color || '#8b5cf6'}
                                                    </Typography>
                                                </Stack>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                )}
                            </Box>
                        </Paper>

                        {/* Logo Section */}
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ImageIcon fontSize="small" sx={{ color: 'primary.main' }} />
                                Logotipo (Opcional)
                            </Typography>
                            <Stack spacing={2}>
                                <TextField
                                    fullWidth
                                    label="URL del Logo (https://...)"
                                    value={options.logo.url}
                                    onChange={(e) => handleLogoChange('url', e.target.value)}
                                    helperText="Usa una imagen cuadrada y simple. Asegura que tenga CORS habilitado."
                                />
                                {options.logo.url && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Tamaño del Logo</Typography>
                                        <Slider
                                            value={options.logo.size}
                                            min={0.1}
                                            max={0.5}
                                            step={0.05}
                                            valueLabelDisplay="auto"
                                            valueLabelFormat={(x) => `${Math.round(x * 100)}%`}
                                            onChange={(_, val) => handleLogoChange('size', val)}
                                        />
                                    </Box>
                                )}
                            </Stack>
                        </Paper>
                    </Stack>
                </Grid>

                {/* --- Right Column: Preview --- */}
                <Grid item xs={12} lg={5}>
                    <Box sx={{ position: 'sticky', top: 24 }}>
                        <Paper
                            sx={{
                                p: 3,
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                                border: '1px solid',
                                borderColor: alpha('#3b82f6', 0.2)
                            }}
                        >
                            <Typography variant="h6" sx={{ mb: 3, textAlign: 'center' }}>
                                Vista Previa
                            </Typography>

                            {/* QR Preview Container */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mb: 3,
                                    p: 3,
                                    bgcolor: options.color.light,
                                    borderRadius: 3,
                                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
                                    transition: 'background-color 0.3s'
                                }}
                            >
                                <QRCodeGenerator
                                    ref={qrRef}
                                    data={debouncedOptions.text}
                                    size={280}
                                    image={debouncedOptions.logo.url}
                                    {...qrOptions}
                                    imageOptions={{
                                        crossOrigin: 'anonymous',
                                        margin: 10,
                                        imageSize: debouncedOptions.logo.size
                                    }}
                                />
                            </Box>

                            {/* Current Settings Summary */}
                            <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
                                <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
                                    <Chip
                                        size="small"
                                        label={`Estilo: ${options.dotStyle}`}
                                        sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}
                                    />
                                    {options.color.gradient.enabled && (
                                        <Chip
                                            size="small"
                                            label="Gradiente"
                                            color="primary"
                                            icon={<GradientIcon />}
                                        />
                                    )}
                                    {options.logo.url && (
                                        <Chip
                                            size="small"
                                            label="Con Logo"
                                            color="secondary"
                                        />
                                    )}
                                </Stack>
                            </Box>

                            {/* Download Buttons */}
                            <Stack spacing={1.5}>
                                <Typography variant="caption" color="text.secondary" textAlign="center">
                                    Descargar en formato:
                                </Typography>
                                <ButtonGroup fullWidth variant="contained">
                                    <Button
                                        startIcon={<DownloadIcon />}
                                        onClick={() => handleDownload('svg')}
                                    >
                                        SVG
                                    </Button>
                                    <Button onClick={() => handleDownload('png')}>PNG</Button>
                                    <Button onClick={() => handleDownload('jpeg')}>JPEG</Button>
                                    <Button onClick={() => handleDownload('webp')}>WebP</Button>
                                </ButtonGroup>
                                <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                                    SVG recomendado para máxima calidad y escalabilidad
                                </Typography>
                            </Stack>
                        </Paper>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
};

export default QRGeneratorPage;
