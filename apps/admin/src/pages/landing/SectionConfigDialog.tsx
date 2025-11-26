// src/pages/admin/landing/SectionConfigDialog.tsx
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Slider,
  Typography,
  Box,
  Divider,
  Chip,
  Paper,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Upload } from '@mui/icons-material';

interface Props {
  open: boolean;
  onClose: () => void;
  section: any;
  onSave: (config: any) => void;
}

export default function SectionConfigDialog({ open, onClose, section, onSave }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [config, setConfig] = useState<any>({});
  const [variant, setVariant] = useState<string>('');

  useEffect(() => {
    if (section) {
      setConfig(section.config_data || {});
      setVariant(section.variant || '');
    }
  }, [section]);

  if (!section) return null;

  const handleSave = () => {
    onSave({ variant, config_data: config });
  };

  const renderConfigField = (prop: any) => {
    const value = config[prop.key] ?? prop.default;

    switch (prop.type) {
      case 'text':
        return (
          <TextField
            fullWidth
            label={prop.label}
            value={value || ''}
            onChange={(e) => setConfig({ ...config, [prop.key]: e.target.value })}
            inputProps={{ maxLength: prop.maxLength }}
            helperText={prop.maxLength ? `${(value?.length || 0)}/${prop.maxLength}` : ''}
            sx={{ mb: 3 }}
          />
        );

      case 'textarea':
        return (
          <TextField
            fullWidth
            label={prop.label}
            value={value || ''}
            onChange={(e) => setConfig({ ...config, [prop.key]: e.target.value })}
            multiline
            rows={4}
            inputProps={{ maxLength: prop.maxLength }}
            helperText={prop.maxLength ? `${(value?.length || 0)}/${prop.maxLength}` : ''}
            sx={{ mb: 3 }}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>{prop.label}</InputLabel>
            <Select
              value={value || ''}
              label={prop.label}
              onChange={(e) => setConfig({ ...config, [prop.key]: e.target.value })}
            >
              {prop.options.map((option: any) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={!!value}
                onChange={(e) => setConfig({ ...config, [prop.key]: e.target.checked })}
              />
            }
            label={prop.label}
            sx={{ mb: 3 }}
          />
        );

      case 'slider':
        return (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              {prop.label}: {value}
            </Typography>
            <Slider
              value={value || prop.min || 0}
              onChange={(e, newValue) => setConfig({ ...config, [prop.key]: newValue })}
              min={prop.min || 0}
              max={prop.max || 100}
              step={prop.step || 1}
              marks
              valueLabelDisplay="auto"
            />
          </Box>
        );

      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            label={prop.label}
            value={value || ''}
            onChange={(e) => setConfig({ ...config, [prop.key]: Number(e.target.value) })}
            inputProps={{ min: prop.min, max: prop.max }}
            sx={{ mb: 3 }}
          />
        );

      case 'color':
        return (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              {prop.label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <input
                type="color"
                value={value || '#000000'}
                onChange={(e) => setConfig({ ...config, [prop.key]: e.target.value })}
                style={{
                  width: 60,
                  height: 40,
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              />
              <TextField
                value={value || '#000000'}
                onChange={(e) => setConfig({ ...config, [prop.key]: e.target.value })}
                size="small"
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>
        );

      case 'media':
        return (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              {prop.label}
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                borderRadius: 2,
                border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                '&:hover': {
                  borderColor: theme.palette.primary.main,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                },
              }}
            >
              <Upload sx={{ fontSize: 40, color: theme.palette.primary.main, mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#666' }}>
                Haz clic para subir o arrastra aquí
              </Typography>
              <Typography variant="caption" sx={{ color: '#999' }}>
                {prop.accept || 'Imágenes y videos'}
              </Typography>
            </Paper>
            {value && (
              <Chip
                label={value}
                onDelete={() => setConfig({ ...config, [prop.key]: '' })}
                sx={{ mt: 1 }}
              />
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  const customizableProps = section.customizable_props || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : 3,
          maxHeight: fullScreen ? '100%' : '90vh',
        },
      }}
    >
<DialogTitle>
  <Box>  {/* ← Añade Box */}
    <Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>  {/* ← component="div" */}
      Configurar: {section.section_name}
    </Typography>
    <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>
      Personaliza esta sección
    </Typography>
  </Box>
</DialogTitle>


      <DialogContent dividers>
        {/* Variante */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Variante
          </Typography>
          <Select
            fullWidth
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
          >
            {(section.available_variants || []).map((v: any) => (
              <MenuItem key={v.key} value={v.key}>
                {v.name}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Propiedades configurables */}
        {customizableProps.length > 0 ? (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Personalización
            </Typography>
            {customizableProps.map((prop: any) => (
              <Box key={prop.key}>{renderConfigField(prop)}</Box>
            ))}
          </>
        ) : (
          <Typography variant="body2" sx={{ color: '#666', textAlign: 'center', py: 4 }}>
            Esta sección no tiene opciones de personalización disponibles
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            px: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          Guardar Cambios
        </Button>
      </DialogActions>
    </Dialog>
  );
}
