import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import {
  Box, Typography, Paper, Alert, Button, CircularProgress,
  TextField, Select, MenuItem, InputLabel, FormControl, Divider, Grid
} from '@mui/material';
import { Save as SaveIcon, Upload as UploadIcon, Palette as PaletteIcon, TextFields as TextIcon, Image as ImageIcon } from '@mui/icons-material';

// Roles del sistema tipográfico del guidebook (apps/guide/src/index.css
// @theme). El default de cada rol es el que usa el guidebook cuando la
// agencia no personaliza nada; las alternativas son las mismas que
// GuidebookPage.tsx sabe cargar bajo demanda (GOOGLE_FONT_QUERY) — si se
// añade una fuente aquí, hay que añadirla también allí, o se aplicará la
// variable CSS sin el archivo de fuente real.
const HEADLINE_FONT_OPTIONS = ['Newsreader', 'Playfair Display', 'Lora', 'Fraunces'];
const BODY_FONT_OPTIONS = ['Inter', 'Work Sans', 'Nunito Sans', 'Poppins'];
const LABEL_FONT_OPTIONS = ['Archivo Narrow', 'Oswald', 'Barlow Condensed'];

export default function GuideDesignPage() {
  const { currentAgency, adminMode } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [primaryColor, setPrimaryColor] = useState('#1E3A5F');
  const [secondaryColor, setSecondaryColor] = useState('#C96D4B');
  const [accentColor, setAccentColor] = useState('#D4A853');
  const [headlineFont, setHeadlineFont] = useState('Newsreader');
  const [bodyFont, setBodyFont] = useState('Inter');
  const [labelFont, setLabelFont] = useState('Archivo Narrow');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    if (adminMode !== 'agency') return;

    const loadDesign = async () => {
      if (!currentAgency?.id) return;
      setLoading(true);
      try {
        const response = await apiClient.request(`/guide/admin/agencies/${currentAgency.id}`);
        if (response.success && response.agency) {
          setPrimaryColor(response.agency.primary_color || '#1E3A5F');
          setSecondaryColor(response.agency.secondary_color || '#C96D4B');
          setAccentColor(response.agency.accent_color || '#D4A853');
          setHeadlineFont(response.agency.headline_font || 'Newsreader');
          setBodyFont(response.agency.body_font || 'Inter');
          setLabelFont(response.agency.label_font || 'Archivo Narrow');
          setLogoUrl(response.agency.logo_url || '');
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar el diseño');
      } finally {
        setLoading(false);
      }
    };

    loadDesign();
  }, [currentAgency?.id, adminMode]);

  const handleSave = async () => {
    if (!currentAgency?.id) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        logo_url: logoUrl,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        headline_font: headlineFont,
        body_font: bodyFont,
        label_font: labelFont
      };
      const response = await apiClient.request(`/guide/admin/agencies/${currentAgency.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (response.success) {
        setSuccess('Diseño guardado correctamente.');
      } else {
        setError('No se pudo guardar el diseño.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar el diseño');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentAgency) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      // Agency-scoped upload — NOT the shared /media/upload in workerMedia.js,
      // which requires a dish_id and 400s for anything guidebook-related.
      const token = localStorage.getItem('auth_token') || '';
      const uploadRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev'}/guide/admin/agencies/${currentAgency.id}/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await uploadRes.json();
      if (data.success && data.url) {
        setLogoUrl(data.url);
      } else {
        throw new Error(data.message || 'Error al subir la imagen');
      }
    } catch (err: any) {
      setError(err.message || 'Error al subir la imagen');
    }
  };

  if (adminMode !== 'agency') {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="info" sx={{ maxWidth: 500, mx: 'auto' }}>
          Cambia al modo <strong>Agencia</strong> en la barra lateral para editar el diseño.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 0 }, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700}>
          Diseño del Guidebook
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Personaliza la apariencia de los guidebooks para todos tus apartamentos
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Alert severity="info" sx={{ mb: 4 }}>
        Los colores se aplican automáticamente al guidebook de todos tus apartamentos.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PaletteIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>Colores</Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>Color Primario</Typography>
                <TextField 
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  fullWidth
                  sx={{ '& input': { height: 50, cursor: 'pointer' } }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>Color Secundario</Typography>
                <TextField 
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  fullWidth
                  sx={{ '& input': { height: 50, cursor: 'pointer' } }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>Color de Acento</Typography>
                <TextField 
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  fullWidth
                  sx={{ '& input': { height: 50, cursor: 'pointer' } }}
                />
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TextIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>Tipografía</Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />

            {([
              { label: 'Titulares', value: headlineFont, setValue: setHeadlineFont, options: HEADLINE_FONT_OPTIONS, sample: 'Ejemplo de Título', variant: 'h5' as const },
              { label: 'Cuerpo', value: bodyFont, setValue: setBodyFont, options: BODY_FONT_OPTIONS, sample: 'Así se verá el texto de cuerpo en tus guidebooks.', variant: 'body1' as const },
              { label: 'Labels', value: labelFont, setValue: setLabelFont, options: LABEL_FONT_OPTIONS, sample: 'ETIQUETA DE EJEMPLO', variant: 'body2' as const },
            ]).map(role => (
              <Box key={role.label} sx={{ mb: 3 }}>
                <FormControl fullWidth sx={{ mb: 1 }}>
                  <InputLabel id={`font-${role.label}-label`}>{`Fuente — ${role.label}`}</InputLabel>
                  <Select
                    labelId={`font-${role.label}-label`}
                    value={role.value}
                    label={`Fuente — ${role.label}`}
                    onChange={(e) => role.setValue(e.target.value)}
                  >
                    {role.options.map(font => (
                      <MenuItem key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box sx={{
                  p: 1.5,
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.default',
                }}>
                  <Typography variant={role.variant} style={{ fontFamily: role.value }}>
                    {role.sample}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ImageIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>Logo de la Agencia</Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            
            {logoUrl && (
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
                <img src={logoUrl} alt="Logo de Agencia" style={{ maxHeight: 100, maxWidth: '100%', objectFit: 'contain' }} />
              </Box>
            )}

            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<UploadIcon />}
            >
              {logoUrl ? 'Reemplazar Logo' : 'Subir Logo'}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleLogoUpload}
              />
            </Button>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          color="primary" 
          size="large"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Guardando...' : 'Guardar Diseño'}
        </Button>
      </Box>
    </Box>
  );
}
