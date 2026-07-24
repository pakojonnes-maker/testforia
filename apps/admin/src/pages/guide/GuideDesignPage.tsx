import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import {
  Box, Typography, Paper, Alert, Button, CircularProgress,
  TextField, Select, MenuItem, InputLabel, FormControl, Divider, Grid
} from '@mui/material';
import { Save as SaveIcon, Upload as UploadIcon, Palette as PaletteIcon, TextFields as TextIcon, Image as ImageIcon } from '@mui/icons-material';

const FONT_OPTIONS = ['Montserrat', 'Inter', 'Lato', 'Nunito', 'Open Sans', 'Poppins'];

export default function GuideDesignPage() {
  const { currentAgency, adminMode } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [primaryColor, setPrimaryColor] = useState('#1E3A5F');
  const [secondaryColor, setSecondaryColor] = useState('#C96D4B');
  const [accentColor, setAccentColor] = useState('#D4A853');
  const [fontFamily, setFontFamily] = useState('Montserrat');
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
          setFontFamily(response.agency.font_family || 'Montserrat');
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
        font_family: fontFamily
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
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      // Assuming a generic media upload endpoint that accepts formData and returns { url }
      const token = localStorage.getItem('auth_token') || '';
      const uploadRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev'}/media/upload`, {
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
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="font-family-label">Fuente Principal</InputLabel>
              <Select
                labelId="font-family-label"
                value={fontFamily}
                label="Fuente Principal"
                onChange={(e) => setFontFamily(e.target.value)}
              >
                {FONT_OPTIONS.map(font => (
                  <MenuItem key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ 
              p: 2, 
              border: '1px dashed', 
              borderColor: 'divider', 
              borderRadius: 1,
              bgcolor: 'background.default',
              fontFamily: fontFamily 
            }}>
              <Typography variant="h5" style={{ fontFamily }} gutterBottom>
                Ejemplo de Título
              </Typography>
              <Typography variant="body1" style={{ fontFamily }}>
                Este es un ejemplo de cómo se verá el texto en tus guidebooks usando la fuente seleccionada.
              </Typography>
            </Box>
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
