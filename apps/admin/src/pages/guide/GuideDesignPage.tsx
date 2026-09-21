import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import {
  Box, Typography, Paper, Alert, Button, CircularProgress,
  TextField, Select, MenuItem, InputLabel, FormControl, Divider, Grid
} from '@mui/material';
import { Save as SaveIcon, Upload as UploadIcon, Palette as PaletteIcon, TextFields as TextIcon, Image as ImageIcon } from '@mui/icons-material';
import {
  DEFAULT_FONTS, defaultColor, fontFamilyCss, fontOptions, isLegacyFontTrio, readSavedColors, readSavedFonts,
  shownFonts, toInputColor,
  type AgencyDesignRow, type ColorChoices, type ColorRole, type FontChoices, type FontRole
} from '../../lib/guideDesign';

// Colores y tipografía del guidebook. Lo que la agencia no personaliza se queda en `null` («Por defecto») y así
// se guarda: los valores por defecto, las fuentes que la guía sabe renderizar por rol y las reglas para leer lo
// guardado viven en lib/guideDesign.ts (espejo de apps/guide/src/theme/).
const COLOR_FIELDS: { role: ColorRole; label: string }[] = [
  { role: 'primary', label: 'Color Primario' },
  { role: 'secondary', label: 'Color Secundario' },
  { role: 'accent', label: 'Color de Acento' },
];

const FONT_FIELDS: { role: FontRole; label: string; sample: string; variant: 'h5' | 'body1' | 'body2' }[] = [
  { role: 'headline', label: 'Titulares', sample: 'Ejemplo de Título', variant: 'h5' },
  { role: 'body', label: 'Cuerpo', sample: 'Así se verá el texto de cuerpo en tus guidebooks.', variant: 'body1' },
  { role: 'label', label: 'Labels', sample: 'ETIQUETA DE EJEMPLO', variant: 'body2' },
];

const NO_COLORS: ColorChoices = { primary: null, secondary: null, accent: null };
const NO_FONTS: FontChoices = { headline: null, body: null, label: null };

export default function GuideDesignPage() {
  const { currentAgency, adminMode } = useAuth();

  const [loading, setLoading] = useState(true);
  // Solo se puede guardar tras leer bien la agencia: con la lectura fallida el formulario está en null y
  // guardar borraría el diseño real.
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // null = sin elegir: la guía usa su diseño por defecto.
  const [colors, setColors] = useState<ColorChoices>(NO_COLORS);
  const [fonts, setFonts] = useState<FontChoices>(NO_FONTS);
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    if (adminMode !== 'agency') return;

    const loadDesign = async () => {
      if (!currentAgency?.id) return;
      setLoading(true);
      setLoaded(false);
      setError(null);
      try {
        const response = await apiClient.request(`/guide/admin/agencies/${currentAgency.id}`);
        if (response.success && response.agency) {
          const agency: AgencyDesignRow = response.agency;
          setColors(readSavedColors(agency));
          setFonts(readSavedFonts(agency));
          setLogoUrl(agency.logo_url || '');
          setLoaded(true);
        } else {
          setError('No se pudo cargar el diseño.');
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
    if (!currentAgency?.id || !loaded) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        logo_url: logoUrl,
        // null = sin elegir: se guarda NULL y la guía usa su diseño por defecto. Nunca se escribe un valor
        // por defecto como si lo hubiera elegido la agencia.
        primary_color: colors.primary,
        secondary_color: colors.secondary,
        accent_color: colors.accent,
        headline_font: fonts.headline,
        body_font: fonts.body,
        label_font: fonts.label
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

  // Lo que la guía pinta con estas elecciones (con el trío antiguo completo, las de por defecto).
  const shown = shownFonts(fonts);

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
        Lo que dejes en «Por defecto» sigue el diseño de VisualTaste; solo se guarda lo que elijas.
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
              {COLOR_FIELDS.map(({ role, label }) => {
                const chosen = colors[role];
                const fallback = defaultColor(role, colors);
                return (
                  <Box key={role} sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>{label}</Typography>
                    <TextField
                      type="color"
                      value={toInputColor(chosen ?? fallback.hex)}
                      onChange={(e) => setColors(prev => ({ ...prev, [role]: e.target.value }))}
                      inputProps={{ 'aria-label': label }}
                      fullWidth
                      sx={{ '& input': { height: 50, cursor: 'pointer' } }}
                    />
                    <Box sx={{ mt: 0.5, minHeight: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        {chosen
                          ? chosen.toUpperCase()
                          : `${fallback.fromPrimary ? 'Derivado del primario' : 'Por defecto'} · ${fallback.hex}`}
                      </Typography>
                      {chosen && (
                        <Button size="small" onClick={() => setColors(prev => ({ ...prev, [role]: null }))}>
                          Restablecer
                        </Button>
                      )}
                    </Box>
                  </Box>
                );
              })}
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

            {isLegacyFontTrio(fonts) && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                Newsreader + Inter + Archivo Narrow juntas eran el diseño por defecto antiguo: la guía las trata
                como «sin elegir» y usa las de por defecto. Cambia alguna de las tres para que se apliquen.
              </Alert>
            )}

            {FONT_FIELDS.map(({ role, label, sample, variant }) => {
              const value = fonts[role];
              const fieldLabel = `Fuente — ${label}`;
              return (
                <Box key={role} sx={{ mb: 3 }}>
                  <FormControl fullWidth sx={{ mb: 1 }}>
                    <InputLabel id={`font-${role}-label`} shrink>{fieldLabel}</InputLabel>
                    <Select
                      labelId={`font-${role}-label`}
                      value={value ?? ''}
                      label={fieldLabel}
                      displayEmpty
                      notched
                      onChange={(e) => setFonts(prev => ({ ...prev, [role]: e.target.value || null }))}
                    >
                      <MenuItem value="" style={{ fontFamily: fontFamilyCss(role, DEFAULT_FONTS[role]) }}>
                        Por defecto — {DEFAULT_FONTS[role]}
                      </MenuItem>
                      {fontOptions(role, value).map(font => (
                        <MenuItem key={font} value={font} style={{ fontFamily: fontFamilyCss(role, font) }}>
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
                    <Typography variant={variant} style={{ fontFamily: fontFamilyCss(role, shown[role]) }}>
                      {sample}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
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
          disabled={saving || !loaded}
        >
          {saving ? 'Guardando...' : 'Guardar Diseño'}
        </Button>
      </Box>
    </Box>
  );
}
