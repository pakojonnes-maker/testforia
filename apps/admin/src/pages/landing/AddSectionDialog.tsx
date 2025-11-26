// src/pages/admin/landing/AddSectionDialog.tsx
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Radio,
  RadioGroup,
  Chip,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Home,
  Info,
  RestaurantMenu,
  PhotoLibrary,
  LocationOn,
  ContactMail,
  CheckCircle,
} from '@mui/icons-material';

const SECTION_ICONS: { [key: string]: JSX.Element } = {
  hero: <Home fontSize="large" />,
  about: <Info fontSize="large" />,
  menu: <RestaurantMenu fontSize="large" />,
  gallery: <PhotoLibrary fontSize="large" />,
  location: <LocationOn fontSize="large" />,
  contact: <ContactMail fontSize="large" />,
};

interface Props {
  open: boolean;
  onClose: () => void;
  library: any[];
  onAdd: (sectionKey: string, variant: string) => void;
}

export default function AddSectionDialog({ open, onClose, library, onAdd }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('');

  const handleSectionSelect = (section: any) => {
    setSelectedSection(section);
    const variants = section.available_variants;
    setSelectedVariant(variants[0]?.key || '');
  };

  const handleAdd = () => {
    if (selectedSection && selectedVariant) {
      onAdd(selectedSection.section_key, selectedVariant);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedSection(null);
    setSelectedVariant('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : 3,
          maxHeight: fullScreen ? '100%' : '90vh',
        },
      }}
    >
<DialogTitle sx={{ pb: 2 }}>
  <Box>  {/* ← Envuelve en Box */}
    <Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>  {/* ← Añade component="div" */}
      Añadir Sección
    </Typography>
    <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>
      Selecciona una sección y elige su variante
    </Typography>
  </Box>
</DialogTitle>


      <DialogContent dividers>
        {/* Step 1: Seleccionar Sección */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            1. Elige una sección
          </Typography>
          <Grid container spacing={2}>
            {library.map((section) => (
              <Grid item xs={12} sm={6} md={4} key={section.section_key}>
                <Card
                  onClick={() => handleSectionSelect(section)}
                  sx={{
                    cursor: 'pointer',
                    border: selectedSection?.section_key === section.section_key
                      ? `2px solid ${theme.palette.primary.main}`
                      : '2px solid transparent',
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    position: 'relative',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    },
                  }}
                >
                  {selectedSection?.section_key === section.section_key && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: theme.palette.primary.main,
                      }}
                    >
                      <CheckCircle />
                    </Box>
                  )}
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        display: 'inline-flex',
                        mb: 2,
                      }}
                    >
                      {SECTION_ICONS[section.section_key]}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {section.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#666', fontSize: '0.875rem' }}>
                      {section.description}
                    </Typography>
                    <Chip
                      label={section.category}
                      size="small"
                      sx={{
                        mt: 1.5,
                        fontSize: '0.75rem',
                        height: 24,
                        backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                        color: theme.palette.secondary.main,
                      }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Step 2: Seleccionar Variante */}
        {selectedSection && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              2. Elige una variante
            </Typography>
            <RadioGroup value={selectedVariant} onChange={(e) => setSelectedVariant(e.target.value)}>
              <Grid container spacing={2}>
                {selectedSection.available_variants.map((variant: any) => (
                  <Grid item xs={12} sm={6} key={variant.key}>
                    <Card
                      sx={{
                        border: selectedVariant === variant.key
                          ? `2px solid ${theme.palette.primary.main}`
                          : '2px solid #e0e0e0',
                        borderRadius: 2,
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        '&:hover': {
                          borderColor: theme.palette.primary.main,
                        },
                      }}
                      onClick={() => setSelectedVariant(variant.key)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <Radio
                            checked={selectedVariant === variant.key}
                            value={variant.key}
                            sx={{ mt: -0.5 }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                              {variant.name}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666', fontSize: '0.875rem' }}>
                              {variant.description}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </RadioGroup>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={!selectedSection || !selectedVariant}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            px: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:disabled': {
              background: '#ccc',
            },
          }}
        >
          Añadir Sección
        </Button>
      </DialogActions>
    </Dialog>
  );
}
