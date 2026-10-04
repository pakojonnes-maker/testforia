import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Box, Button, ButtonGroup, Card, CardActionArea, Chip, Divider, FormControl, Grid, IconButton, InputLabel,
    MenuItem, Select, Slider, Stack, Switch, TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    AutoAwesome as PresetIcon, Download as DownloadIcon, Gradient as GradientIcon, Image as ImageIcon,
    Link as LinkIcon, Palette as PaletteIcon, QrCode as QrCodeIcon, RestartAlt as ResetIcon, Style as StyleIcon,
} from '@mui/icons-material';
import QRCodeGenerator, { type QRCodeHandle } from '../components/QRCodeGenerator';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader } from '../components/common/PageHeader';
import { Panel } from '../components/common/Panel';
import { COBALT } from '../theme';

const MENU_URL = import.meta.env.VITE_MENU_URL || 'https://menu.visualtastes.com';

// --- Tipos ---
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
    logo: { url: string; size: number };
    ecl: 'L' | 'M' | 'Q' | 'H';
}

interface DesignPreset {
    id: string;
    name: string;
    description: string;
    options: Partial<QROptions>;
}

const noGradient: GradientConfig = { enabled: false, type: 'linear', rotation: 0, colorStops: [] };

// Los colores de los ajustes son los del QR que se imprime, no los del panel.
const DESIGN_PRESETS: DesignPreset[] = [
    {
        id: 'classic', name: 'Clásico', description: 'Negro sobre blanco',
        options: { dotStyle: 'square', cornerSquareStyle: 'square', cornerDotStyle: 'square', color: { dark: '#000000', light: '#ffffff', eyeFrame: '#000000', eyeBall: '#000000', gradient: noGradient } },
    },
    {
        id: 'modern', name: 'Moderno', description: 'Azul con puntos',
        options: { dotStyle: 'dots', cornerSquareStyle: 'dot', cornerDotStyle: 'dot', color: { dark: '#3b82f6', light: '#ffffff', eyeFrame: '#2563eb', eyeBall: '#1d4ed8', gradient: noGradient } },
    },
    {
        id: 'premium', name: 'Premium', description: 'Degradado dorado',
        options: {
            dotStyle: 'classy-rounded', cornerSquareStyle: 'extra-rounded', cornerDotStyle: 'dot',
            color: {
                dark: '#f59e0b', light: '#0f172a', eyeFrame: '#d97706', eyeBall: '#fbbf24',
                gradient: { enabled: true, type: 'linear', rotation: Math.PI / 4, colorStops: [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: '#dc2626' }] },
            },
        },
    },
    {
        id: 'restaurant', name: 'Restaurante', description: 'Verde elegante',
        options: { dotStyle: 'classy', cornerSquareStyle: 'extra-rounded', cornerDotStyle: 'square', color: { dark: '#10b981', light: '#ffffff', eyeFrame: '#059669', eyeBall: '#047857', gradient: noGradient } },
    },
    { id: 'custom', name: 'Personalizado', description: 'Tu diseño', options: {} },
];

const defaultOptions = (text: string): QROptions => ({
    text,
    dotStyle: 'square',
    cornerSquareStyle: 'square',
    cornerDotStyle: 'square',
    color: {
        dark: '#000000', light: '#ffffff', eyeFrame: '#000000', eyeBall: '#000000',
        gradient: { enabled: false, type: 'linear', rotation: 0, colorStops: [{ offset: 0, color: COBALT }, { offset: 1, color: '#001550' }] },
    },
    logo: { url: '', size: 0.2 },
    ecl: 'M',
});

function ColorInput({ label, value, onChange }: { label: ReactNode; value: string; onChange: (value: string) => void }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{label}</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
                <Box component="input" type="color" value={value}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                    sx={{
                        width: 40, height: 40, p: 0, border: 1, borderColor: 'divider', cursor: 'pointer', bgcolor: 'transparent',
                        '&::-webkit-color-swatch-wrapper': { p: 0 }, '&::-webkit-color-swatch': { border: 'none' },
                    }} />
                <TextField size="small" value={value} onChange={(e) => onChange(e.target.value)} sx={{ flexGrow: 1 }}
                    inputProps={{ style: { fontFamily: 'monospace' } }} />
            </Stack>
        </Box>
    );
}

/** Muestra del ajuste predefinido: sus colores en una tesela. */
function PresetSwatch({ preset }: { preset: DesignPreset }) {
    const c = preset.options.color;
    if (!c) return <PaletteIcon sx={{ fontSize: 32, color: 'text.secondary' }} />;
    const fill = c.gradient?.enabled ? `linear-gradient(135deg, ${c.gradient.colorStops.map((s) => s.color).join(', ')})` : c.dark;
    return (
        <Box sx={{ width: 32, height: 32, mx: 'auto', p: '5px', bgcolor: c.light, border: 1, borderColor: 'divider' }}>
            <Box sx={{ width: '100%', height: '100%', background: fill }} />
        </Box>
    );
}

export default function QRGeneratorPage() {
    const location = useLocation();
    const { currentRestaurant } = useAuth();
    // Por defecto, la carta del restaurante (antes "https://visualtaste.app", que no es nuestro).
    const menuUrl = currentRestaurant?.slug ? `${MENU_URL}/${currentRestaurant.slug}` : MENU_URL;
    const [options, setOptions] = useState<QROptions>(() => defaultOptions(menuUrl));
    const [selectedPreset, setSelectedPreset] = useState('classic');
    const [debounced, setDebounced] = useState(options);
    const qrRef = useRef<QRCodeHandle>(null);

    // ?url= o ?text= en la dirección rellenan el contenido.
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const fromUrl = params.get('url') || params.get('text');
        if (fromUrl) setOptions((prev) => ({ ...prev, text: fromUrl }));
    }, [location.search]);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(options), 300);
        return () => clearTimeout(timer);
    }, [options]);

    const custom = (next: (prev: QROptions) => QROptions) => {
        setOptions(next);
        setSelectedPreset('custom');
    };
    const setField = <K extends keyof QROptions>(field: K, value: QROptions[K]) => custom((prev) => ({ ...prev, [field]: value }));
    const setColor = (field: keyof Omit<QRColorState, 'gradient'>, value: string) =>
        custom((prev) => ({ ...prev, color: { ...prev.color, [field]: value } }));
    const setGradient = <K extends keyof GradientConfig>(field: K, value: GradientConfig[K]) =>
        custom((prev) => ({ ...prev, color: { ...prev.color, gradient: { ...prev.color.gradient, [field]: value } } }));
    const setGradientStop = (index: number, color: string) =>
        custom((prev) => {
            const colorStops = [...prev.color.gradient.colorStops];
            colorStops[index] = { offset: index, color };
            return { ...prev, color: { ...prev.color, gradient: { ...prev.color.gradient, colorStops } } };
        });

    const applyPreset = (id: string) => {
        setSelectedPreset(id);
        const preset = DESIGN_PRESETS.find((p) => p.id === id);
        if (preset && Object.keys(preset.options).length > 0) {
            setOptions((prev) => ({ ...prev, ...preset.options, color: { ...prev.color, ...preset.options.color } }));
        }
    };

    const qrProps = useMemo(() => {
        const c = debounced.color;
        return {
            dotsOptions: {
                color: c.dark,
                type: debounced.dotStyle,
                ...(c.gradient.enabled ? { gradient: { type: c.gradient.type, rotation: c.gradient.rotation, colorStops: c.gradient.colorStops } } : {}),
            },
            cornersSquareOptions: { color: c.eyeFrame, type: debounced.cornerSquareStyle },
            cornersDotOptions: { color: c.eyeBall, type: debounced.cornerDotStyle },
            backgroundOptions: { color: c.light },
        };
    }, [debounced]);

    const select = <K extends 'dotStyle' | 'ecl' | 'cornerSquareStyle' | 'cornerDotStyle'>(
        field: K, label: string, items: Array<[QROptions[K], string]>,
    ) => (
        <FormControl fullWidth>
            <InputLabel>{label}</InputLabel>
            <Select label={label} value={options[field]} onChange={(e) => setField(field, e.target.value as QROptions[K])}>
                {items.map(([value, text]) => <MenuItem key={value} value={value}>{text}</MenuItem>)}
            </Select>
        </FormControl>
    );

    return (
        <Box>
            <PageHeader
                icon={<QrCodeIcon />}
                title="Generador de QR"
                subtitle="Códigos QR con tu estilo para las mesas, la puerta o la publicidad"
                actions={
                    <Tooltip title="Volver a los valores iniciales">
                        <IconButton onClick={() => { setOptions(defaultOptions(menuUrl)); setSelectedPreset('classic'); }} aria-label="Restablecer">
                            <ResetIcon />
                        </IconButton>
                    </Tooltip>
                }
            />

            <Grid container spacing={3}>
                <Grid item xs={12} lg={7}>
                    <Stack spacing={3}>
                        <Panel icon={<PresetIcon />} title="Diseños">
                            <Grid container spacing={1.5}>
                                {DESIGN_PRESETS.map((preset) => {
                                    const active = selectedPreset === preset.id;
                                    return (
                                        <Grid item xs={6} sm={4} md={2.4} key={preset.id}>
                                            <Card sx={{ borderColor: active ? 'primary.main' : undefined, bgcolor: active ? alpha(COBALT, 0.06) : undefined, height: '100%' }}>
                                                <CardActionArea onClick={() => applyPreset(preset.id)} sx={{ py: 2, px: 1, textAlign: 'center', height: '100%' }}>
                                                    <PresetSwatch preset={preset} />
                                                    <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>{preset.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{preset.description}</Typography>
                                                </CardActionArea>
                                            </Card>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </Panel>

                        <Panel icon={<LinkIcon />} title="Contenido">
                            <TextField fullWidth label="Enlace o texto" value={options.text}
                                onChange={(e) => setField('text', e.target.value)} placeholder={menuUrl}
                                helperText="Lo que abre el móvil al escanearlo. Por defecto, la carta del restaurante." />
                        </Panel>

                        <Panel icon={<StyleIcon />} title="Estilo">
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    {select('dotStyle', 'Módulos', [
                                        ['square', 'Cuadrado (clásico)'], ['rounded', 'Redondeado'], ['dots', 'Puntos'],
                                        ['classy', 'Elegante'], ['classy-rounded', 'Elegante redondeado'], ['extra-rounded', 'Extra redondeado'],
                                    ])}
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    {select('ecl', 'Corrección de errores', [
                                        ['L', 'Baja (7 %)'], ['M', 'Media (15 %)'], ['Q', 'Alta (25 %)'], ['H', 'Máxima (30 %), mejor con logo'],
                                    ])}
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    {select('cornerSquareStyle', 'Esquinas exteriores', [['square', 'Cuadradas'], ['dot', 'Circulares'], ['extra-rounded', 'Muy redondeadas']])}
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    {select('cornerDotStyle', 'Puntos de las esquinas', [['square', 'Cuadrados'], ['dot', 'Circulares']])}
                                </Grid>
                            </Grid>
                        </Panel>

                        <Panel icon={<PaletteIcon />} title="Colores">
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={6} sm={3}><ColorInput label="Principal" value={options.color.dark} onChange={(v) => setColor('dark', v)} /></Grid>
                                <Grid item xs={6} sm={3}><ColorInput label="Fondo" value={options.color.light} onChange={(v) => setColor('light', v)} /></Grid>
                                <Grid item xs={6} sm={3}><ColorInput label="Marco de las esquinas" value={options.color.eyeFrame} onChange={(v) => setColor('eyeFrame', v)} /></Grid>
                                <Grid item xs={6} sm={3}><ColorInput label="Centro de las esquinas" value={options.color.eyeBall} onChange={(v) => setColor('eyeBall', v)} /></Grid>
                            </Grid>
                            <Divider sx={{ mb: 2 }} />
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <GradientIcon fontSize="small" /> Degradado
                                </Typography>
                                <Switch size="small" checked={options.color.gradient.enabled} onChange={(e) => setGradient('enabled', e.target.checked)} />
                            </Stack>
                            {options.color.gradient.enabled && (
                                <Box sx={{ p: 2, bgcolor: 'background.default', border: 1, borderColor: 'divider' }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Tipo</InputLabel>
                                                <Select label="Tipo" value={options.color.gradient.type}
                                                    onChange={(e) => setGradient('type', e.target.value as GradientConfig['type'])}>
                                                    <MenuItem value="linear">Lineal</MenuItem>
                                                    <MenuItem value="radial">Radial</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        {options.color.gradient.type === 'linear' && (
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="caption" color="text.secondary">Ángulo</Typography>
                                                <Slider min={0} max={360} valueLabelDisplay="auto" valueLabelFormat={(v) => `${Math.round(v)}°`}
                                                    value={options.color.gradient.rotation * (180 / Math.PI)}
                                                    onChange={(_, val) => setGradient('rotation', (val as number) * (Math.PI / 180))} />
                                            </Grid>
                                        )}
                                        <Grid item xs={6}>
                                            <ColorInput label="Color inicial" value={options.color.gradient.colorStops[0]?.color || COBALT} onChange={(v) => setGradientStop(0, v)} />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <ColorInput label="Color final" value={options.color.gradient.colorStops[1]?.color || '#001550'} onChange={(v) => setGradientStop(1, v)} />
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}
                        </Panel>

                        <Panel icon={<ImageIcon />} title="Logotipo (opcional)">
                            <Stack spacing={2}>
                                <TextField fullWidth label="URL del logo" placeholder="https://…" value={options.logo.url}
                                    onChange={(e) => setOptions((prev) => ({ ...prev, logo: { ...prev.logo, url: e.target.value } }))}
                                    helperText="Mejor una imagen cuadrada y sencilla, servida con CORS. Sube la corrección de errores a «Máxima»." />
                                {options.logo.url && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Tamaño del logo</Typography>
                                        <Slider min={0.1} max={0.5} step={0.05} valueLabelDisplay="auto" valueLabelFormat={(x) => `${Math.round(x * 100)} %`}
                                            value={options.logo.size}
                                            onChange={(_, val) => setOptions((prev) => ({ ...prev, logo: { ...prev.logo, size: val as number } }))} />
                                    </Box>
                                )}
                            </Stack>
                        </Panel>
                    </Stack>
                </Grid>

                <Grid item xs={12} lg={5}>
                    <Box sx={{ position: 'sticky', top: 88 }}>
                        <Panel title="Vista previa">
                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, p: 3, bgcolor: options.color.light, border: 1, borderColor: 'divider', transition: 'background-color 0.3s' }}>
                                <QRCodeGenerator
                                    ref={qrRef}
                                    data={debounced.text}
                                    size={280}
                                    image={debounced.logo.url}
                                    errorCorrectionLevel={debounced.ecl}
                                    {...qrProps}
                                    imageOptions={{ crossOrigin: 'anonymous', margin: 10, imageSize: debounced.logo.size }}
                                />
                            </Box>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
                                <Chip size="small" variant="outlined" label={`Módulos: ${options.dotStyle}`} />
                                <Chip size="small" variant="outlined" label={`Corrección: ${options.ecl}`} />
                                {options.color.gradient.enabled && <Chip size="small" variant="outlined" label="Degradado" />}
                                {options.logo.url && <Chip size="small" variant="outlined" label="Con logo" />}
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 1 }}>Descargar</Typography>
                            <ButtonGroup fullWidth variant="contained">
                                <Button startIcon={<DownloadIcon />} onClick={() => qrRef.current?.download('svg')}>SVG</Button>
                                <Button onClick={() => qrRef.current?.download('png')}>PNG</Button>
                                <Button onClick={() => qrRef.current?.download('jpeg')}>JPEG</Button>
                                <Button onClick={() => qrRef.current?.download('webp')}>WebP</Button>
                            </ButtonGroup>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                                SVG para imprimir: no pierde calidad a ningún tamaño.
                            </Typography>
                        </Panel>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}
