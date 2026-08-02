import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import GuidePoisImportDialog from './GuidePoisImportDialog';
import {
  Box, Typography, Paper, Alert, Button, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, InputLabel, FormControl, Grid,
  Card, CardMedia, CardContent, IconButton, Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  LocationOn as LocationOnIcon,
  Star as StarIcon,
  DirectionsWalk as WalkIcon,
  DirectionsCar as DriveIcon,
  DirectionsBike as BikeIcon,
  Upload as UploadIcon,
  TravelExplore as TravelExploreIcon
} from '@mui/icons-material';

const CATEGORIES = ['Restaurantes', 'Playas', 'Cultura', 'Naturaleza', 'Actividades', 'Compras', 'Otro'];

interface Zone {
  id: string;
  name: string;
}

const ACCESS_TYPES = [
  { value: 'free', label: 'Gratuito' },
  { value: 'paid', label: 'De pago' },
  { value: 'mixed', label: 'Mixto' },
];

interface POI {
  id: string;
  zone_id: string;
  category: string;
  access_type: string;
  /** Texto libre que ve el huésped cuando access_type !== 'free' (ej. "12 €"). */
  price_display?: string;
  name_es: string;
  name_en: string;
  description_es: string;
  description_en: string;
  short_tip_es?: string;
  short_tip_en?: string;
  google_maps_url: string;
  google_place_id?: string;
  address?: string;
  latitude: number;
  longitude: number;
  rating: number;
  travel_mode: string;
  travel_time_text: string;
  distance_text: string;
  phone?: string;
  website_url?: string;
  opening_hours?: string;
  duration_text?: string;
  cover_image_url: string;
  is_active: boolean;
}

export default function GuidePoisPage() {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [pois, setPois] = useState<POI[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [editingPoi, setEditingPoi] = useState<POI | null>(null);
  const [formData, setFormData] = useState<Partial<POI>>({
    is_active: true, travel_mode: 'walk', rating: 0
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.is_superadmin) return;

    const loadZones = async () => {
      try {
        const response = await apiClient.request('/guide/admin/zones');
        if (response.success) {
          setZones(response.zones);
          if (response.zones.length > 0) {
            setSelectedZone(response.zones[0].id);
          } else {
            setLoading(false);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar zonas');
        setLoading(false);
      }
    };

    loadZones();
  }, [user]);

  const reloadPois = async (zoneId: string) => {
    if (!zoneId) return;
    setLoading(true);
    try {
      const response = await apiClient.request(`/guide/admin/pois?zone_id=${zoneId}`);
      if (response.success) {
        setPois(response.pois || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar POIs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadPois(selectedZone);
  }, [selectedZone]);

  if (!user?.is_superadmin) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ maxWidth: 500, mx: 'auto' }}>
          No tienes permisos de superadmin para acceder a esta página.
        </Alert>
      </Box>
    );
  }

  const handleOpenDialog = (poi?: POI) => {
    if (poi) {
      setEditingPoi(poi);
      setFormData({ ...poi });
    } else {
      setEditingPoi(null);
      setFormData({
        zone_id: selectedZone,
        category: CATEGORIES[0],
        access_type: 'free',
        travel_mode: 'walk',
        rating: 4.5,
        is_active: true
      });
    }
    setOpenDialog(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        zone_id: formData.zone_id,
        category: formData.category,
        access_type: formData.access_type,
        price_display: formData.price_display,
        google_maps_url: formData.google_maps_url,
        google_place_id: formData.google_place_id,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        rating: formData.rating,
        travel_mode: formData.travel_mode,
        travel_time_text: formData.travel_time_text,
        distance_text: formData.distance_text,
        phone: formData.phone,
        website_url: formData.website_url,
        opening_hours: formData.opening_hours,
        duration_text: formData.duration_text,
        name_es: formData.name_es,
        name_en: formData.name_en,
        description_es: formData.description_es,
        description_en: formData.description_en,
        short_tip_es: formData.short_tip_es,
        short_tip_en: formData.short_tip_en,
        cover_image_url: formData.cover_image_url,
      };

      if (editingPoi) {
        await apiClient.request(`/guide/admin/pois/${editingPoi.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiClient.request('/guide/admin/pois', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      setOpenDialog(false);
      await reloadPois(selectedZone);
    } catch (err: any) {
      setError(err.message || 'Error al guardar POI');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (poiId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este POI?')) return;
    try {
      // Trying DELETE, if it fails fallback to PUT is_active=false depending on API
      await apiClient.request(`/guide/admin/pois/${poiId}`, { method: 'DELETE' }).catch(() => 
        apiClient.request(`/guide/admin/pois/${poiId}`, { method: 'PUT', body: JSON.stringify({ is_active: false }) })
      );
      setPois(pois.filter(p => p.id !== poiId));
    } catch (err: any) {
      setError(err.message || 'Error al eliminar POI');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!editingPoi?.id) {
      alert('Guarda el POI antes de subir una foto.');
      event.target.value = '';
      return;
    }

    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = localStorage.getItem('auth_token') || '';
      // guide_poi_media (no dish_id: los POIs del guidebook son una entidad
      // aparte de los platos, no comparten /media/upload con el restaurante).
      const uploadRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev'}/guide/admin/pois/${editingPoi.id}/media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      });
      const data = await uploadRes.json();
      if (data.success && data.url) {
        setFormData({ ...formData, cover_image_url: data.url });
      } else {
        throw new Error(data.message || data.error);
      }
    } catch (err: any) {
      alert(err.message || 'Error al subir imagen');
    }
  };

  const getCategoryGradient = (category: string): string => {
    const gradients: Record<string, string> = {
      'Restaurantes': 'linear-gradient(135deg, #C96D4B 0%, #D4896C 100%)',
      'Playas': 'linear-gradient(135deg, #1E88E5 0%, #42A5F5 100%)',
      'Cultura': 'linear-gradient(135deg, #7B1FA2 0%, #AB47BC 100%)',
      'Naturaleza': 'linear-gradient(135deg, #388E3C 0%, #66BB6A 100%)',
      'Actividades': 'linear-gradient(135deg, #F57C00 0%, #FFB74D 100%)',
      'Compras': 'linear-gradient(135deg, #C2185B 0%, #F06292 100%)',
    };
    return gradients[category] || 'linear-gradient(135deg, #1E3A5F 0%, #2D5F9E 100%)';
  };

  return (
    <Box sx={{ p: { xs: 2, md: 0 } }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LocationOnIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>Puntos de Interés (POIs)</Typography>
            <Typography variant="body2" color="text.secondary">Gestión global de localizaciones (Superadmin)</Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Zona</InputLabel>
            <Select value={selectedZone} label="Zona" onChange={e => setSelectedZone(e.target.value)}>
              {zones.map(z => <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>)}
            </Select>
          </FormControl>
          
          <Button variant="outlined" startIcon={<TravelExploreIcon />} onClick={() => setOpenImportDialog(true)} disabled={!selectedZone}>
            Importar de Google
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} disabled={!selectedZone}>
            Añadir POI
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {pois.map(poi => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={poi.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'visible' }}>
                {/* Action buttons */}
                <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, display: 'flex', gap: 0.5 }}>
                  <IconButton size="small" sx={{ bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: 'white' } }} onClick={() => handleOpenDialog(poi)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" sx={{ bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: 'white' } }} color="error" onClick={() => handleDelete(poi.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                
                {/* Image or gradient fallback */}
                <Box sx={{
                  height: 160,
                  background: getCategoryGradient(poi.category),
                  display: 'flex',
                  alignItems: 'flex-end',
                  p: 2,
                  gap: 0.5,
                }}>
                  <Chip
                    label={poi.category}
                    size="small"
                    sx={{ bgcolor: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: '0.7rem' }}
                  />
                  {/* Mismo dato que ve el huésped en la tarjeta del guidebook */}
                  <Chip
                    label={(poi.access_type || 'free') === 'free'
                      ? 'Gratis'
                      : (poi.price_display || ACCESS_TYPES.find(a => a.value === poi.access_type)?.label || 'De pago')}
                    size="small"
                    sx={{
                      bgcolor: (poi.access_type || 'free') === 'free' ? 'rgba(220,252,231,0.92)' : 'rgba(30,64,175,0.92)',
                      color: (poi.access_type || 'free') === 'free' ? '#166534' : '#fff',
                      fontWeight: 600, fontSize: '0.7rem',
                    }}
                  />
                </Box>

                <CardContent sx={{ flexGrow: 1, pt: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom noWrap>
                    {poi.name_es || poi.category}
                  </Typography>
                  {poi.name_en && poi.name_en !== poi.name_es && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      {poi.name_en}
                    </Typography>
                  )}
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    {poi.rating > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: '#f59e0b' }}>
                        <StarIcon sx={{ fontSize: 16 }} />
                        <Typography variant="body2" fontWeight={600}>{poi.rating}</Typography>
                      </Box>
                    )}
                    {poi.travel_time_text && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: 'text.secondary' }}>
                        {poi.travel_mode === 'walk' ? <WalkIcon sx={{ fontSize: 16 }} /> : poi.travel_mode === 'drive' ? <DriveIcon sx={{ fontSize: 16 }} /> : <BikeIcon sx={{ fontSize: 16 }} />}
                        <Typography variant="caption">{poi.travel_time_text}</Typography>
                      </Box>
                    )}
                  </Box>
                  
                  {poi.google_maps_url && (
                    <Button 
                      size="small" 
                      href={poi.google_maps_url} 
                      target="_blank" 
                      sx={{ mt: 1, textTransform: 'none', fontSize: '0.75rem' }}
                      startIcon={<LocationOnIcon sx={{ fontSize: 14 }} />}
                    >
                      Ver en Maps
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
          {pois.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">No hay POIs en esta zona. ¡Añade el primero!</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Dialog for Create/Edit */}
      <Dialog open={openDialog} onClose={() => !saving && setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingPoi ? 'Editar POI' : 'Nuevo POI'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Zona</InputLabel>
                <Select value={formData.zone_id || ''} label="Zona" onChange={e => setFormData({...formData, zone_id: e.target.value})}>
                  {zones.map(z => <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Categoría</InputLabel>
                <Select value={formData.category || ''} label="Categoría" onChange={e => setFormData({...formData, category: e.target.value})}>
                  {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Nombre (ES)" value={formData.name_es || ''} onChange={e => setFormData({...formData, name_es: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Nombre (EN)" value={formData.name_en || ''} onChange={e => setFormData({...formData, name_en: e.target.value})} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" multiline rows={3} label="Descripción (ES)" value={formData.description_es || ''} onChange={e => setFormData({...formData, description_es: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" multiline rows={3} label="Descripción (EN)" value={formData.description_en || ''} onChange={e => setFormData({...formData, description_en: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Tip rápido (ES)" placeholder="Ej. Entrada gratuita. Cerrado los lunes." value={formData.short_tip_es || ''} onChange={e => setFormData({...formData, short_tip_es: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Tip rápido (EN)" value={formData.short_tip_en || ''} onChange={e => setFormData({...formData, short_tip_en: e.target.value})} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Dirección" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Acceso</InputLabel>
                <Select value={formData.access_type || 'free'} label="Acceso" onChange={e => setFormData({...formData, access_type: e.target.value})}>
                  {ACCESS_TYPES.map(a => <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth size="small" label="Precio / entrada"
                placeholder="Ej. 12 €"
                value={formData.price_display || ''}
                disabled={(formData.access_type || 'free') === 'free'}
                helperText="Se muestra en la tarjeta del huésped"
                onChange={e => setFormData({...formData, price_display: e.target.value})}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Google Maps URL" value={formData.google_maps_url || ''} onChange={e => setFormData({...formData, google_maps_url: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Google Place ID (opcional, para sync futuro)" value={formData.google_place_id || ''} onChange={e => setFormData({...formData, google_place_id: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Web oficial" value={formData.website_url || ''} onChange={e => setFormData({...formData, website_url: e.target.value})} />
            </Grid>

            <Grid item xs={6} md={3}>
              <TextField fullWidth size="small" type="number" label="Latitud" value={formData.latitude || ''} onChange={e => setFormData({...formData, latitude: parseFloat(e.target.value)})} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth size="small" type="number" label="Longitud" value={formData.longitude || ''} onChange={e => setFormData({...formData, longitude: parseFloat(e.target.value)})} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth size="small" type="number" inputProps={{ min: 0, max: 5, step: 0.1 }} label="Rating" value={formData.rating || ''} onChange={e => setFormData({...formData, rating: parseFloat(e.target.value)})} />
            </Grid>
            <Grid item xs={6} md={3}>
               <FormControl fullWidth size="small">
                <InputLabel>Modo Viaje</InputLabel>
                <Select value={formData.travel_mode || ''} label="Modo Viaje" onChange={e => setFormData({...formData, travel_mode: e.target.value})}>
                  <MenuItem value="walk">Caminando</MenuItem>
                  <MenuItem value="drive">Coche</MenuItem>
                  <MenuItem value="bike">Bici</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} md={3}>
              <TextField fullWidth size="small" label="Tiempo (ej. 5 min)" value={formData.travel_time_text || ''} onChange={e => setFormData({...formData, travel_time_text: e.target.value})} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth size="small" label="Distancia (ej. 450 m)" value={formData.distance_text || ''} onChange={e => setFormData({...formData, distance_text: e.target.value})} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth size="small" label="Teléfono" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth size="small" label="Duración visita (ej. 1-2 h)" value={formData.duration_text || ''} onChange={e => setFormData({...formData, duration_text: e.target.value})} />
            </Grid>

            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Horario (texto libre, ej. Mar-Sáb 10:00-18:00, Dom 10:00-16:00, cerrado Lun)" value={formData.opening_hours || ''} onChange={e => setFormData({...formData, opening_hours: e.target.value})} />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {formData.cover_image_url && <img src={formData.cover_image_url} alt="POI" style={{ height: 60, borderRadius: 4 }} />}
                <Button variant="outlined" component="label" startIcon={<UploadIcon />} disabled={!editingPoi?.id}>
                  Subir Imagen
                  <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                </Button>
                {!editingPoi?.id && (
                  <Typography variant="caption" color="text.secondary">
                    Guarda el POI primero para poder subir una foto
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !formData.name_es}>
            {saving ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <GuidePoisImportDialog
        open={openImportDialog}
        onClose={() => setOpenImportDialog(false)}
        zones={zones}
        defaultZoneId={selectedZone}
        onImported={() => reloadPois(selectedZone)}
      />
    </Box>
  );
}
