'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  TextField,
  Button,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Stack,
  Paper,
  Skeleton
} from '@mui/material';
import { 
  Palette, 
  Save, 
  RotateLeft, 
  CheckCircle,
  Smartphone,
  ErrorOutline
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';

interface CustomColors {
  primary: string;
  secondary: string;
  text?: string;
  background?: string;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

export default function ConfigurationPage() {
  // Obtener restaurantId desde el contexto de autenticación
  const { selectedRestaurant } = useAuth();
  const restaurantId = selectedRestaurant?.id;
  
  // Estados principales
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Estados de colores
  const [primaryColor, setPrimaryColor] = useState('#FF6B6B');
  const [secondaryColor, setSecondaryColor] = useState('#4ECDC4');
  const [textColor, setTextColor] = useState('#2C3E50');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  
  // Estados originales para detectar cambios
  const [originalColors, setOriginalColors] = useState<CustomColors>({
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    text: '#2C3E50',
    background: '#FFFFFF'
  });
  
  // Estado de notificaciones
  const [snackbar, setSnackbar] = useState<SnackbarState>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });

  // Cargar configuración al montar el componente o cambiar el restaurante
  useEffect(() => {
    if (restaurantId) {
      loadStyling(restaurantId);
    } else {
      setLoading(false);
    }
  }, [restaurantId]);

  // Detectar cambios en los colores
  useEffect(() => {
    const changed = 
      primaryColor !== originalColors.primary ||
      secondaryColor !== originalColors.secondary ||
      textColor !== (originalColors.text || '#2C3E50') ||
      backgroundColor !== (originalColors.background || '#FFFFFF');
    
    setHasChanges(changed);
  }, [primaryColor, secondaryColor, textColor, backgroundColor, originalColors]);

  const loadStyling = async (restId: string) => {
    try {
      setLoading(true);
      
      // Usar apiClient para obtener el styling
      const response = await apiClient.getRestaurantStyling(restId);
      
      if (response.success) {
        const styling = response.styling;
        
        if (styling?.customColors) {
          const colors = styling.customColors;
          
          // Establecer colores actuales
          setPrimaryColor(colors.primary || '#FF6B6B');
          setSecondaryColor(colors.secondary || '#4ECDC4');
          setTextColor(colors.text || '#2C3E50');
          setBackgroundColor(colors.background || '#FFFFFF');
          
          // Guardar colores originales
          setOriginalColors({
            primary: colors.primary || '#FF6B6B',
            secondary: colors.secondary || '#4ECDC4',
            text: colors.text || '#2C3E50',
            background: colors.background || '#FFFFFF'
          });
        }
      }
    } catch (error: any) {
      console.error('Error loading styling:', error);
      showNotification('Error al cargar la configuración', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!restaurantId) {
      showNotification('No hay restaurante seleccionado', 'error');
      return;
    }

    try {
      setSaving(true);
      
      const customColors: CustomColors = {
        primary: primaryColor,
        secondary: secondaryColor,
        text: textColor,
        background: backgroundColor
      };

      // Usar apiClient para actualizar
      const response = await apiClient.updateRestaurantStyling(
        restaurantId, 
        customColors
      );

      if (response.success) {
        showNotification('✅ Colores guardados correctamente', 'success');
        
        // Actualizar colores originales
        setOriginalColors(customColors);
        setHasChanges(false);
        
        // Recargar para confirmar
        await loadStyling(restaurantId);
      } else {
        throw new Error(response.message || 'Error al guardar');
      }
    } catch (error: any) {
      console.error('Error saving styling:', error);
      showNotification(`Error al guardar: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPrimaryColor(originalColors.primary);
    setSecondaryColor(originalColors.secondary);
    setTextColor(originalColors.text || '#2C3E50');
    setBackgroundColor(originalColors.background || '#FFFFFF');
    showNotification('Colores restaurados', 'info');
  };

  const handleResetToDefaults = () => {
    setPrimaryColor('#FF6B6B');
    setSecondaryColor('#4ECDC4');
    setTextColor('#2C3E50');
    setBackgroundColor('#FFFFFF');
    showNotification('Colores restablecidos a valores por defecto', 'info');
  };

  const showNotification = (message: string, severity: SnackbarState['severity']) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Componente de preview de color individual
  const ColorPreviewItem = ({ color, label }: { color: string; label: string }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      <Box 
        sx={{ 
          width: 60, 
          height: 60, 
          borderRadius: 2, 
          backgroundColor: color,
          border: '2px solid #e0e0e0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'scale(1.05)'
          }
        }} 
      />
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="body2" fontWeight="600" fontFamily="monospace">
          {color.toUpperCase()}
        </Typography>
      </Box>
    </Box>
  );

  // Render de loading
  if (loading) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
        <Skeleton variant="text" width={300} height={50} sx={{ mb: 2 }} />
        <Skeleton variant="text" width={500} height={30} sx={{ mb: 4 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card elevation={2}>
              <CardContent sx={{ p: 3 }}>
                <Skeleton variant="rectangular" height={400} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card elevation={2}>
              <CardContent sx={{ p: 3 }}>
                <Skeleton variant="rectangular" height={500} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (!restaurantId) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="60vh"
        gap={2}
      >
        <ErrorOutline sx={{ fontSize: 64, color: 'warning.main' }} />
        <Typography variant="h5" fontWeight="600">
          No hay restaurante seleccionado
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Por favor, selecciona un restaurante para continuar
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box mb={4}>
        <Typography 
          variant="h4" 
          fontWeight="700" 
          mb={1} 
          display="flex" 
          alignItems="center" 
          gap={1.5}
        >
          <Palette sx={{ fontSize: 32 }} /> 
          Configuración de Estilo
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Personaliza los colores de tus reels para que coincidan con la identidad de tu marca
        </Typography>
        {selectedRestaurant && (
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            Restaurante: <strong>{selectedRestaurant.name}</strong>
          </Typography>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Panel de edición de colores */}
        <Grid item xs={12} md={7}>
          <Card elevation={2}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="600" mb={3} display="flex" alignItems="center" gap={1}>
                <Palette fontSize="small" />
                Colores del tema
              </Typography>

              <Stack spacing={3}>
                {/* Color primario */}
                <Box>
                  <Typography variant="body2" fontWeight="500" mb={1.5} color="text.secondary">
                    Color primario
                  </Typography>
                  <TextField
                    type="color"
                    fullWidth
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    InputProps={{ 
                      sx: { 
                        height: 56,
                        cursor: 'pointer'
                      } 
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Utilizado en títulos y elementos destacados
                  </Typography>
                </Box>

                {/* Color secundario */}
                <Box>
                  <Typography variant="body2" fontWeight="500" mb={1.5} color="text.secondary">
                    Color secundario
                  </Typography>
                  <TextField
                    type="color"
                    fullWidth
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    InputProps={{ 
                      sx: { 
                        height: 56,
                        cursor: 'pointer'
                      } 
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Usado en botones y elementos secundarios
                  </Typography>
                </Box>

                {/* Color de texto */}
                <Box>
                  <Typography variant="body2" fontWeight="500" mb={1.5} color="text.secondary">
                    Color de texto
                  </Typography>
                  <TextField
                    type="color"
                    fullWidth
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    InputProps={{ 
                      sx: { 
                        height: 56,
                        cursor: 'pointer'
                      } 
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Color principal del texto
                  </Typography>
                </Box>

                {/* Color de fondo */}
                <Box>
                  <Typography variant="body2" fontWeight="500" mb={1.5} color="text.secondary">
                    Color de fondo
                  </Typography>
                  <TextField
                    type="color"
                    fullWidth
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    InputProps={{ 
                      sx: { 
                        height: 56,
                        cursor: 'pointer'
                      } 
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Fondo de las tarjetas de productos
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 3 }} />

              {/* Botones de acción */}
              <Stack direction="row" spacing={2} mb={2}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  fullWidth
                  sx={{ 
                    py: 1.5,
                    fontWeight: 600
                  }}
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<RotateLeft />}
                  onClick={handleReset}
                  disabled={saving || !hasChanges}
                  sx={{ 
                    py: 1.5,
                    fontWeight: 600,
                    minWidth: 140
                  }}
                >
                  Deshacer
                </Button>
              </Stack>

              <Button
                variant="text"
                size="small"
                onClick={handleResetToDefaults}
                disabled={saving}
                fullWidth
              >
                Restablecer valores por defecto
              </Button>

              {hasChanges && (
                <Alert 
                  severity="warning" 
                  sx={{ mt: 2 }}
                >
                  Tienes cambios sin guardar
                </Alert>
              )}

              {!hasChanges && (
                <Alert 
                  severity="success" 
                  icon={<CheckCircle />}
                  sx={{ mt: 2 }}
                >
                  Configuración guardada correctamente
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Panel de vista previa */}
        <Grid item xs={12} md={5}>
          <Card elevation={2} sx={{ position: 'sticky', top: 24 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="600" mb={3} display="flex" alignItems="center" gap={1}>
                <Smartphone fontSize="small" />
                Vista previa
              </Typography>

              {/* Previews de colores individuales */}
              <Box mb={3}>
                <ColorPreviewItem color={primaryColor} label="Color primario" />
                <ColorPreviewItem color={secondaryColor} label="Color secundario" />
                <ColorPreviewItem color={textColor} label="Color de texto" />
                <ColorPreviewItem color={backgroundColor} label="Color de fondo" />
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Simulación de reel (móvil) */}
              <Typography variant="body2" fontWeight="600" mb={2} color="text.secondary">
                Simulación de Reel
              </Typography>
              <Paper
                elevation={4}
                sx={{ 
                  borderRadius: 3,
                  overflow: 'hidden',
                  position: 'relative',
                  aspectRatio: '9/16',
                  background: backgroundColor,
                  maxHeight: 500
                }}
              >
                <Box sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* Header del reel */}
                  <Box 
                    sx={{ 
                      backgroundColor: primaryColor, 
                      color: '#fff',
                      p: 2, 
                      borderRadius: 2,
                      mb: 'auto',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}
                  >
                    <Typography variant="h6" fontWeight="700" fontSize={18}>
                      Paella Valenciana
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mt: 0.5 }}>
                      Plato tradicional
                    </Typography>
                  </Box>
                  
                  {/* Área de contenido central */}
                  <Box 
                    sx={{ 
                      flex: 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      my: 2
                    }}
                  >
                    <Box 
                      sx={{ 
                        width: '100%',
                        aspectRatio: '1/1',
                        backgroundColor: 'rgba(0,0,0,0.05)',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px dashed rgba(0,0,0,0.1)'
                      }}
                    >
                      <Typography color={textColor} textAlign="center" fontSize={14}>
                        📷 Imagen del plato
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Footer con precio */}
                  <Box 
                    sx={{ 
                      backgroundColor: secondaryColor, 
                      color: '#fff',
                      p: 1.5, 
                      borderRadius: 2,
                      textAlign: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}
                  >
                    <Typography variant="h6" fontWeight="700">
                      15,99 €
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              <Alert severity="info" sx={{ mt: 2 }} icon={false}>
                <Typography variant="caption" display="block">
                  💡 <strong>Tip:</strong> Los cambios se aplicarán a todos los reels del restaurante una vez guardados.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Snackbar de notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ 
            width: '100%',
            fontSize: '0.95rem',
            fontWeight: 500
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
