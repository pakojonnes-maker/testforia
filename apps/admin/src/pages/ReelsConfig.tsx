// apps/admin/src/pages/ReelsConfig.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Slider,
  Alert,
  Snackbar,
  Chip,
  Paper,
  Divider,
  Stack,
  CircularProgress
} from '@mui/material';
import { ChromePicker } from 'react-color';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/apiClient';
import { Palette, Brush, Settings, Preview } from '@mui/icons-material';

interface ReelTemplate {
  id: string;
  name: string;
  description: string;
  is_premium: boolean;
}

interface ReelColors {
  primary: string;
  secondary: string;
  accent?: string;
  text: string;
  background: string;
}

const ReelsConfig: React.FC = () => {
  const { currentRestaurant, token } = useAuth();
  
  // Estados
  const [templates, setTemplates] = useState<ReelTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [colors, setColors] = useState<ReelColors>({
    primary: '#ff6b6b',
    secondary: '#4ecdc4',
    accent: '#f39c12',
    text: '#ffffff',
    background: '#000000'
  });
  const [customConfig, setCustomConfig] = useState<Record<string, any>>({
    auto_hide_delay: 3000,
    show_progress: true,
    auto_hide_ui: true,
    glassmorphism: true,
    blur_intensity: 20
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Cargar templates disponibles
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await apiClient.getReelTemplates();
        if (response.success) {
          setTemplates(response.data);
        }
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    };
    fetchTemplates();
  }, []);

  // Cargar configuración actual del restaurante
  useEffect(() => {
    const fetchConfig = async () => {
      if (!currentRestaurant?.slug) return;
      
      try {
        setLoading(true);
        const response = await apiClient.getReelsConfig(currentRestaurant.slug);
        
        if (response.success) {
          setSelectedTemplate(response.data.template.id);
          setColors(response.data.colors);
          setCustomConfig(response.data.config);
        }
      } catch (error) {
        console.error('Error loading config:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [currentRestaurant]);

  // Guardar configuración
  const handleSave = async () => {
    if (!currentRestaurant?.id || !token) return;
    
    try {
      setSaving(true);
      
      const payload = {
        template_id: selectedTemplate,
        custom_colors: colors,
        config_overrides: customConfig
      };
      
      const response = await apiClient.updateReelsConfig(
        currentRestaurant.id,
        payload,
        token
      );
      
      if (response.success) {
        setSnackbar({
          open: true,
          message: 'Configuración guardada correctamente',
          severity: 'success'
        });
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Error al guardar configuración',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  // Preview URL
  const previewUrl = currentRestaurant?.slug 
    ? `${window.location.origin}/${currentRestaurant.slug}/r`
    : '';

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          Configuración de Reels
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Personaliza la experiencia visual de tu menú
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Left Panel - Configuration */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {/* Template Selection */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Brush sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    Seleccionar Plantilla
                  </Typography>
                </Box>
                
                <FormControl fullWidth>
                  <InputLabel>Plantilla</InputLabel>
                  <Select
                    value={selectedTemplate}
                    label="Plantilla"
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                  >
                    {templates.map((template) => (
                      <MenuItem key={template.id} value={template.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <Typography sx={{ flex: 1 }}>
                            {template.name}
                          </Typography>
                          {template.is_premium && (
                            <Chip 
                              label="Premium" 
                              size="small" 
                              color="primary" 
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {templates.find(t => t.id === selectedTemplate)?.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    {templates.find(t => t.id === selectedTemplate)?.description}
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Color Configuration */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Palette sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    Colores Personalizados
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  {Object.entries(colors).map(([key, value]) => (
                    <Grid item xs={12} sm={6} key={key}>
                      <Paper
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          border: showColorPicker === key ? '2px solid' : '1px solid',
                          borderColor: showColorPicker === key ? 'primary.main' : 'divider',
                          '&:hover': {
                            borderColor: 'primary.main'
                          }
                        }}
                        onClick={() => setShowColorPicker(showColorPicker === key ? null : key)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 1,
                              bgcolor: value,
                              border: '1px solid #ccc',
                              mr: 2
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                              {key.replace('_', ' ')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {value}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {showColorPicker === key && (
                          <Box sx={{ mt: 2 }}>
                            <ChromePicker
                              color={value}
                              onChange={(color) => {
                                setColors(prev => ({ ...prev, [key]: color.hex }));
                              }}
                              disableAlpha
                            />
                          </Box>
                        )}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Settings sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    Configuración Avanzada
                  </Typography>
                </Box>

                <Stack spacing={3}>
                  {/* Auto-hide UI */}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={customConfig.auto_hide_ui}
                        onChange={(e) => setCustomConfig(prev => ({
                          ...prev,
                          auto_hide_ui: e.target.checked
                        }))}
                      />
                    }
                    label="Auto-ocultar controles"
                  />

                  {/* Auto-hide delay */}
                  {customConfig.auto_hide_ui && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Tiempo antes de ocultar (ms): {customConfig.auto_hide_delay}
                      </Typography>
                      <Slider
                        value={customConfig.auto_hide_delay}
                        onChange={(_, value) => setCustomConfig(prev => ({
                          ...prev,
                          auto_hide_delay: value
                        }))}
                        min={1000}
                        max={10000}
                        step={500}
                        marks={[
                          { value: 1000, label: '1s' },
                          { value: 5000, label: '5s' },
                          { value: 10000, label: '10s' }
                        ]}
                      />
                    </Box>
                  )}

                  {/* Show progress */}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={customConfig.show_progress}
                        onChange={(e) => setCustomConfig(prev => ({
                          ...prev,
                          show_progress: e.target.checked
                        }))}
                      />
                    }
                    label="Mostrar indicador de progreso"
                  />

                  {/* Glassmorphism (solo para premium) */}
                  {selectedTemplate === 'tpl_premium' && (
                    <>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={customConfig.glassmorphism}
                            onChange={(e) => setCustomConfig(prev => ({
                              ...prev,
                              glassmorphism: e.target.checked
                            }))}
                          />
                        }
                        label="Efecto glassmorphism"
                      />

                      {customConfig.glassmorphism && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Intensidad de desenfoque: {customConfig.blur_intensity}px
                          </Typography>
                          <Slider
                            value={customConfig.blur_intensity}
                            onChange={(_, value) => setCustomConfig(prev => ({
                              ...prev,
                              blur_intensity: value
                            }))}
                            min={5}
                            max={40}
                            step={5}
                            marks={[
                              { value: 5, label: '5px' },
                              { value: 20, label: '20px' },
                              { value: 40, label: '40px' }
                            ]}
                          />
                        </Box>
                      )}
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Right Panel - Preview & Actions */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3} sx={{ position: 'sticky', top: 20 }}>
            {/* Preview */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Preview sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    Vista Previa
                  </Typography>
                </Box>

                <Box
                  sx={{
                    width: '100%',
                    aspectRatio: '9/16',
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: colors.background,
                    position: 'relative',
                    backgroundImage: `linear-gradient(135deg, ${colors.primary}30 0%, ${colors.secondary}30 100%)`
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      p: 2,
                      background: `linear-gradient(transparent, ${colors.background}dd)`
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ color: colors.text, mb: 0.5 }}>
                      Nombre del Plato
                    </Typography>
                    <Typography variant="h6" sx={{ color: colors.primary, fontWeight: 700 }}>
                      €12.50
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      position: 'absolute',
                      right: 16,
                      bottom: '30%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1
                    }}
                  >
                    {['❤️', '🔗', 'ℹ️'].map((emoji, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: 'rgba(255,255,255,0.2)',
                          backdropFilter: 'blur(10px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem'
                        }}
                      >
                        {emoji}
                      </Box>
                    ))}
                  </Box>
                </Box>

                {previewUrl && (
                  <Button
                    fullWidth
                    variant="outlined"
                    sx={{ mt: 2 }}
                    onClick={() => window.open(previewUrl, '_blank')}
                  >
                    Ver en Vivo
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card>
              <CardContent>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Los cambios se aplicarán inmediatamente en tu menú público
                </Alert>

                <Stack spacing={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleSave}
                    disabled={saving || !selectedTemplate}
                  >
                    {saving ? <CircularProgress size={24} /> : 'Guardar Configuración'}
                  </Button>

                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => {
                      // Reset to defaults
                      setColors({
                        primary: '#ff6b6b',
                        secondary: '#4ecdc4',
                        accent: '#f39c12',
                        text: '#ffffff',
                        background: '#000000'
                      });
                      setCustomConfig({
                        auto_hide_delay: 3000,
                        show_progress: true,
                        auto_hide_ui: true,
                        glassmorphism: true,
                        blur_intensity: 20
                      });
                    }}
                  >
                    Restaurar Valores por Defecto
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* Template Info */}
            {selectedTemplate && (
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Plantilla Seleccionada
                  </Typography>
                  <Typography variant="h6" gutterBottom>
                    {templates.find(t => t.id === selectedTemplate)?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {templates.find(t => t.id === selectedTemplate)?.description}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>
      </Grid>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReelsConfig;
