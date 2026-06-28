// src/pages/guide/GuideApartmentDetail.tsx
// Manage info items (wifi, rules, checkout, etc.) for a single apartment
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import {
  Box, Typography, Paper, Button, IconButton, TextField, Chip,
  CircularProgress, Alert, Divider, Tooltip, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Tabs, Tab,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Wifi as WifiIcon,
  Gavel as RulesIcon,
  Schedule as ScheduleIcon,
  LocalParking as ParkingIcon,
  Info as InfoIcon,
  Translate as TranslateIcon,
  QrCode as QrCodeIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import QRCodeGenerator, { QRCodeHandle } from '../../components/QRCodeGenerator';

interface ApartmentInfo {
  id: string;
  info_key: string;
  icon_name: string;
  order_index: number;
  title: string;
  content: string;
  media?: { r2_key: string; media_type: string }[];
}

const ICON_MAP: Record<string, any> = {
  wifi: <WifiIcon />,
  gavel: <RulesIcon />,
  schedule: <ScheduleIcon />,
  local_parking: <ParkingIcon />,
  delete: <DeleteIcon />,
  info: <InfoIcon />,
};

const AVAILABLE_KEYS = [
  { key: 'wifi', label: 'WiFi', icon: 'wifi' },
  { key: 'rules', label: 'Normas', icon: 'gavel' },
  { key: 'checkout', label: 'Check-out', icon: 'schedule' },
  { key: 'checkin', label: 'Check-in', icon: 'schedule' },
  { key: 'parking', label: 'Parking', icon: 'local_parking' },
  { key: 'trash', label: 'Basura', icon: 'delete' },
  { key: 'appliances', label: 'Electrodomésticos', icon: 'info' },
  { key: 'emergency', label: 'Emergencias', icon: 'info' },
  { key: 'pool', label: 'Piscina', icon: 'info' },
  { key: 'beach', label: 'Playa', icon: 'info' },
  { key: 'custom', label: 'Personalizado', icon: 'info' },
];

const LANGUAGES = [
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'it', label: '🇮🇹 Italiano' },
  { code: 'pt', label: '🇵🇹 Português' },
  { code: 'nl', label: '🇳🇱 Nederlands' },
];

export default function GuideApartmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentAgency } = useAuth();
  const [apartment, setApartment] = useState<any>(null);
  const [infoItems, setInfoItems] = useState<ApartmentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLang, setCurrentLang] = useState('es');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ApartmentInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const qrRef = useRef<QRCodeHandle>(null);

  // Form for the dialog
  const [form, setForm] = useState({
    info_key: '',
    icon_name: 'info',
    translations: {} as Record<string, { title: string; content: string }>,
    media: [] as { r2_key: string; media_type: string }[],
  });
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const loadInfo = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Fetch both apartment details and info items
      const [aptRes, infoRes] = await Promise.all([
        apiClient.request(`/guide/admin/apartments/${id}`),
        apiClient.request(`/guide/admin/apartments/${id}/info?lang=${currentLang}`)
      ]);
      setApartment(aptRes.apartment);
      setInfoItems(infoRes.info || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInfo(); }, [id, currentLang]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setForm({
      info_key: '',
      icon_name: 'info',
      translations: {
        es: { title: '', content: '' },
        en: { title: '', content: '' },
      },
      media: [],
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: ApartmentInfo) => {
    setEditingItem(item);
    setForm({
      info_key: item.info_key,
      icon_name: item.icon_name || 'info',
      translations: {
        [currentLang]: { title: item.title || '', content: item.content || '' },
      },
      media: item.media || [],
    });
    setDialogOpen(true);
  };

  const handleSelectKey = (key: string) => {
    const preset = AVAILABLE_KEYS.find(k => k.key === key);
    setForm(prev => ({
      ...prev,
      info_key: key,
      icon_name: preset?.icon || 'info',
    }));
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await apiClient.request(`/guide/admin/apartments/${id}/info`, {
        method: 'POST',
        body: JSON.stringify({
          info_key: form.info_key,
          icon_name: form.icon_name,
          translations: form.translations,
          media: form.media,
        }),
      });
      setDialogOpen(false);
      loadInfo();
    } catch (err) {
      console.error('Error saving info:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingMedia(true);
    try {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload to R2 endpoint
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev'}/media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('vt_token')}`
        },
        body: formData
      });
      
      const result = await response.json();
      if (result.success && result.r2_key) {
        setForm(prev => ({
          ...prev,
          media: [...prev.media, { r2_key: result.r2_key, media_type: file.type.startsWith('video/') ? 'video' : 'image' }]
        }));
      }
    } catch (err) {
      console.error('Error uploading file:', err);
    } finally {
      setUploadingMedia(false);
      // Reset input
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveMedia = (index: number) => {
    setForm(prev => {
      const newMedia = [...prev.media];
      newMedia.splice(index, 1);
      return { ...prev, media: newMedia };
    });
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/guide/apartments')}>
          <BackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            {apartment ? apartment.name : 'Cargando...'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestión de información y código QR del apartamento
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate} sx={{ borderRadius: 2 }}>
          Nueva Info
        </Button>
      </Box>

      {/* QR Code Section */}
      {apartment && (
        <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <Box 
            sx={{ flexShrink: 0, cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.05)' } }}
            onClick={() => window.open(`https://guide.visualtastes.com/${apartment.slug}`, '_blank')}
            title="Haz click para probar el enlace"
          >
             <QRCodeGenerator
                ref={qrRef}
                data={`https://guide.visualtastes.com/${apartment.slug}`}
                size={180}
                dotsOptions={{ color: '#0f172a', type: 'rounded' }}
                cornersSquareOptions={{ type: 'extra-rounded' }}
                imageOptions={{ margin: 10 }}
             />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <QrCodeIcon color="primary" /> Código QR del Apartamento
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 500 }}>
              Descarga o imprime este código QR y colócalo en un lugar visible (nevera, marco, puerta). Los huéspedes lo escanearán para acceder directamente a la guía del apartamento.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button 
                variant="contained" 
                startIcon={<QrCodeIcon />}
                onClick={() => window.open(`https://guide.visualtastes.com/${apartment.slug}`, '_blank')}
              >
                Abrir Guía
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<DownloadIcon />}
                onClick={() => qrRef.current?.download('svg')}
              >
                Descargar SVG (Alta Calidad)
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<DownloadIcon />}
                onClick={() => qrRef.current?.download('png')}
              >
                Descargar PNG
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Language Tabs */}
      <Paper elevation={0} sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={currentLang}
          onChange={(_, v) => setCurrentLang(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 1 }}
        >
          {LANGUAGES.map(lang => (
            <Tab key={lang.code} value={lang.code} label={lang.label} sx={{ fontWeight: 500 }} />
          ))}
        </Tabs>
      </Paper>

      {/* Info Cards */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : infoItems.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <InfoIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">Sin información todavía</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Añade WiFi, normas, check-out y todo lo que tus huéspedes necesitan saber.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            Añadir primera info
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {infoItems.map(item => (
            <Card
              key={item.id}
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.light' },
              }}
            >
              <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'start' }}>
                <Box sx={{
                  p: 1.5, borderRadius: 2,
                  bgcolor: 'primary.main',
                  color: 'white',
                  display: 'flex', alignItems: 'center',
                  minWidth: 44, justifyContent: 'center'
                }}>
                  {ICON_MAP[item.icon_name] || <InfoIcon />}
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {item.title || item.info_key}
                    </Typography>
                    <Box>
                      <Chip label={item.info_key} size="small" sx={{ mr: 1, borderRadius: 1 }} />
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => handleOpenEdit(item)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                    {item.content || (
                      <em style={{ opacity: 0.6 }}>
                        Sin contenido en {LANGUAGES.find(l => l.code === currentLang)?.label || currentLang}
                      </em>
                    )}
                  </Typography>
                  {item.media && item.media.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                      {item.media.map((m, i) => (
                        <Box key={i} sx={{ width: 80, height: 80, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                          <img src={`https://visualtasteworker.franciscotortosaestudios.workers.dev/media/${m.r2_key}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TranslateIcon color="primary" />
          {editingItem ? `Editar: ${editingItem.info_key}` : 'Nueva Información'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            {/* Key selector (only for new) */}
            {!editingItem && (
              <FormControl fullWidth>
                <InputLabel>Tipo de información</InputLabel>
                <Select
                  value={form.info_key}
                  label="Tipo de información"
                  onChange={(e) => handleSelectKey(e.target.value)}
                >
                  {AVAILABLE_KEYS.map(k => (
                    <MenuItem key={k.key} value={k.key}>
                      {k.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Divider>
              <Chip label="Traducciones" size="small" />
            </Divider>

            {/* Translation inputs for each language */}
            {LANGUAGES.slice(0, 4).map(lang => (
              <Box key={lang.code} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                  {lang.label}
                </Typography>
                <TextField
                  label="Título"
                  fullWidth
                  size="small"
                  value={form.translations[lang.code]?.title || ''}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    translations: {
                      ...prev.translations,
                      [lang.code]: {
                        ...prev.translations[lang.code],
                        title: e.target.value,
                        content: prev.translations[lang.code]?.content || '',
                      },
                    },
                  }))}
                  sx={{ mb: 1.5 }}
                />
                <TextField
                  label="Contenido"
                  fullWidth
                  multiline
                  minRows={2}
                  maxRows={6}
                  size="small"
                  value={form.translations[lang.code]?.content || ''}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    translations: {
                      ...prev.translations,
                      [lang.code]: {
                        title: prev.translations[lang.code]?.title || '',
                        content: e.target.value,
                      },
                    },
                  }))}
                  placeholder="Escribe aquí la información..."
                />
              </Box>
            ))}

            <Divider>
              <Chip label="Fotos y Vídeos" size="small" />
            </Divider>
            
            <Box sx={{ p: 2, borderRadius: 2, border: '1px dashed', borderColor: 'divider', bgcolor: 'action.hover' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Sube fotos para ayudar al huésped (ej: foto del router, de los mandos de la TV, etc).
              </Typography>
              
              {form.media.length > 0 && (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                  {form.media.map((m, index) => (
                    <Box key={index} sx={{ position: 'relative', width: 100, height: 100 }}>
                      <Box sx={{ width: '100%', height: '100%', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                        {m.media_type === 'video' ? (
                          <Box sx={{ width: '100%', height: '100%', bgcolor: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography variant="caption" color="white">VIDEO</Typography>
                          </Box>
                        ) : (
                          <img src={`https://visualtasteworker.franciscotortosaestudios.workers.dev/media/${m.r2_key}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={() => handleRemoveMedia(index)}
                        sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'error.main', color: 'white' } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
              
              <Button 
                variant="outlined" 
                component="label" 
                disabled={uploadingMedia}
                startIcon={uploadingMedia ? <CircularProgress size={20} /> : <AddIcon />}
              >
                {uploadingMedia ? 'Subiendo...' : 'Añadir Imagen'}
                <input type="file" hidden accept="image/*,video/*" onChange={handleFileUpload} />
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !form.info_key}
          >
            {saving ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
