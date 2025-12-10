import React, { useState, useEffect, useRef } from 'react';
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
    CardContent
} from '@mui/material';
import {
    Download as DownloadIcon,
    QrCode as QrCodeIcon
} from '@mui/icons-material';
import QRCodeGenerator, { QRCodeHandle } from '../components/QRCodeGenerator';

// --- Types ---
interface QRColorState {
    dark: string;
    light: string;
    eyeFrame: string;
    eyeBall: string;
}

interface QROptions {
    text: string;
    style: 'square' | 'rounded' | 'dots';
    color: QRColorState;
    logo: {
        url: string;
        size: number;
        removeBehind: boolean;
    };
    ecl: 'L' | 'M' | 'Q' | 'H'; // Error Correction Level
}

const QRGeneratorPage: React.FC = () => {
    // --- State ---
    const [options, setOptions] = useState<QROptions>({
        text: 'https://visualtaste.app',
        style: 'square',
        color: {
            dark: '#000000',
            light: '#ffffff',
            eyeFrame: '#000000',
            eyeBall: '#000000',
        },
        logo: {
            url: '',
            size: 0.2, // 20%
            removeBehind: true
        },
        ecl: 'M'
    });

    const [debouncedOptions, setDebouncedOptions] = useState(options);
    const qrRef = useRef<QRCodeHandle>(null);

    // --- Debounce Effect ---
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedOptions(options);
        }, 300); // Wait 300ms after last change
        return () => clearTimeout(timer);
    }, [options]);

    // --- Handlers ---
    const handleChange = (field: keyof QROptions, value: any) => {
        setOptions(prev => ({ ...prev, [field]: value }));
    };

    const handleColorChange = (field: keyof QRColorState, value: string) => {
        setOptions(prev => ({
            ...prev,
            color: { ...prev.color, [field]: value }
        }));
    };

    const handleLogoChange = (field: keyof typeof options.logo, value: any) => {
        setOptions(prev => ({
            ...prev,
            logo: { ...prev.logo, [field]: value }
        }));
    };

    const handleDownload = () => {
        if (qrRef.current) {
            qrRef.current.download('svg');
        }
    };

    // --- Render Helpers ---
    const renderColorPicker = (label: string, field: keyof QRColorState) => (
        <FormControl fullWidth size="small">
            <Typography variant="caption" gutterBottom>{label}</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
                <input
                    type="color"
                    value={options.color[field]}
                    onChange={(e) => handleColorChange(field, e.target.value)}
                    style={{ width: 40, height: 40, padding: 0, border: 'none', cursor: 'pointer' }}
                />
                <TextField
                    size="small"
                    value={options.color[field]}
                    onChange={(e) => handleColorChange(field, e.target.value)}
                    sx={{ flexGrow: 1 }}
                />
            </Stack>
        </FormControl>
    );

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Generador de Códigos QR
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Crea códigos QR personalizados para tus restaurantes, menús o promociones.
                </Typography>
            </Box>

            <Grid container spacing={4}>
                {/* --- Left Column: Controls --- */}
                <Grid item xs={12} md={7} lg={8}>
                    <Paper sx={{ p: 3 }}>
                        <Stack spacing={3}>
                            {/* 1. Content */}
                            <Box>
                                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <QrCodeIcon fontSize="small" /> Contenido
                                </Typography>
                                <TextField
                                    fullWidth
                                    label="Enlace o Texto"
                                    value={options.text}
                                    onChange={(e) => handleChange('text', e.target.value)}
                                    placeholder="https://visualtaste.app/menu/..."
                                />
                            </Box>

                            <Divider />

                            {/* 2. Style & Shape */}
                            <Box>
                                <Typography variant="h6" gutterBottom>Estilo</Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <FormControl fullWidth>
                                            <InputLabel>Forma de los Módulos</InputLabel>
                                            <Select
                                                value={options.style}
                                                label="Forma de los Módulos"
                                                onChange={(e) => handleChange('style', e.target.value)}
                                            >
                                                <MenuItem value="square">Cuadrados (Clásico)</MenuItem>
                                                <MenuItem value="dots">Puntos (Moderno)</MenuItem>
                                                <MenuItem value="rounded">Redondeado (Suave)</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <FormControl fullWidth>
                                            <InputLabel>Corrección de Error</InputLabel>
                                            <Select
                                                value={options.ecl}
                                                label="Corrección de Error"
                                                onChange={(e) => handleChange('ecl', e.target.value)}
                                            >
                                                <MenuItem value="L">Baja (7%)</MenuItem>
                                                <MenuItem value="M">Media (15%)</MenuItem>
                                                <MenuItem value="Q">Cuartil (25%)</MenuItem>
                                                <MenuItem value="H">Alta (30%) - Mejor para logos</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                </Grid>
                            </Box>

                            <Divider />

                            {/* 3. Colors */}
                            <Box>
                                <Typography variant="h6" gutterBottom>Colores</Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6} sm={3}>
                                        {renderColorPicker("Color Principal", "dark")}
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        {renderColorPicker("Fondo", "light")}
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        {renderColorPicker("Marco de Ojos", "eyeFrame")}
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        {renderColorPicker("Centro de Ojos", "eyeBall")}
                                    </Grid>
                                </Grid>
                            </Box>

                            <Divider />

                            {/* 4. Logo */}
                            <Box>
                                <Typography variant="h6" gutterBottom>Logotipo (Opcional)</Typography>
                                <Stack spacing={2}>
                                    <TextField
                                        fullWidth
                                        label="URL del Logo (https://...)"
                                        value={options.logo.url}
                                        onChange={(e) => handleLogoChange('url', e.target.value)}
                                        helperText="Recomendamos usar una imagen cuadrada y simple. Asegura que tenga CORS habilitado."
                                    />
                                    <Box>
                                        <Typography variant="caption">Tamaño del Logo</Typography>
                                        <Slider
                                            value={options.logo.size}
                                            min={0.1}
                                            max={0.5}
                                            step={0.05}
                                            valueLabelDisplay="auto"
                                            valueLabelFormat={(x) => `${Math.round(x * 100)}%`}
                                            onChange={(_, val) => handleLogoChange('size', val)}
                                            disabled={!options.logo.url}
                                        />
                                    </Box>
                                </Stack>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>

                {/* --- Right Column: Preview --- */}
                <Grid item xs={12} md={5} lg={4}>
                    <Box sx={{ position: 'sticky', top: 24 }}>
                        <Card elevation={3}>
                            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
                                <Typography variant="h6" gutterBottom>Vista Previa</Typography>

                                <Box
                                    sx={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mb: 3,
                                        p: 2,
                                        bgcolor: '#f5f5f5',
                                        borderRadius: 2,
                                        border: '1px solid #eee'
                                    }}
                                >
                                    <QRCodeGenerator
                                        ref={qrRef}
                                        data={debouncedOptions.text}
                                        size={300}
                                        image={debouncedOptions.logo.url}
                                        dotsOptions={{
                                            color: debouncedOptions.color.dark,
                                            type: debouncedOptions.style as any // Casting 'square' | 'rounded' | etc to DotType
                                        }}
                                        cornersSquareOptions={{
                                            color: debouncedOptions.color.eyeFrame,
                                            type: debouncedOptions.style === 'dots' ? 'dot' : 'square' // Simplification
                                        }}
                                        cornersDotOptions={{
                                            color: debouncedOptions.color.eyeBall,
                                            type: debouncedOptions.style === 'dots' ? 'dot' : undefined
                                        }}
                                        backgroundOptions={{
                                            color: debouncedOptions.color.light
                                        }}
                                        imageOptions={{
                                            crossOrigin: 'anonymous',
                                            margin: 10,
                                            imageSize: debouncedOptions.logo.size
                                        }}
                                    />
                                </Box>

                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={<DownloadIcon />}
                                    fullWidth
                                    onClick={handleDownload}
                                >
                                    Descargar SVG
                                </Button>
                                <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary', textAlign: 'center' }}>
                                    Generado en cliente.
                                </Typography>
                            </CardContent>
                        </Card>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
};

export default QRGeneratorPage;
