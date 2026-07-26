import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import {
  Box, Typography, Paper, Alert, Button, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, InputLabel, FormControl, Grid,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Chip, Switch, FormControlLabel, Avatar, Card, CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Upload as UploadIcon,
  LocalActivity as LocalActivityIcon,
  Star as StarIcon,
} from '@mui/icons-material';

interface Zone {
  id: string;
  name: string;
}

interface Experience {
  id: string;
  zone_id: string;
  category: string;
  service_subcategory?: string;
  action_type: string;
  action_data?: string;
  action_prefilled_message?: string;
  name_es: string;
  name_en: string;
  description_es?: string;
  description_en?: string;
  cta_label_es?: string;
  cta_label_en?: string;
  price_display: string;
  original_price_display?: string;
  discount_display?: string;
  badge_type: string;
  commission_type?: string;
  commission_value?: number;
  cover_image_url: string;
  address?: string;
  phone?: string;
  website_url?: string;
  booking_url?: string;
  duration_text?: string;
  opening_hours?: string;
  is_featured: boolean;
  is_active: boolean;
  order_index: number;
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  'Restaurantes': 'linear-gradient(135deg, #C96D4B 0%, #D4896C 100%)',
  'Playas': 'linear-gradient(135deg, #1E88E5 0%, #42A5F5 100%)',
  'Cultura': 'linear-gradient(135deg, #7B1FA2 0%, #AB47BC 100%)',
  'Naturaleza': 'linear-gradient(135deg, #388E3C 0%, #66BB6A 100%)',
  'Actividades': 'linear-gradient(135deg, #F57C00 0%, #FFB74D 100%)',
  'Compras': 'linear-gradient(135deg, #C2185B 0%, #F06292 100%)',
};
const getCategoryGradient = (category: string): string =>
  CATEGORY_GRADIENTS[category] || 'linear-gradient(135deg, #1E3A5F 0%, #2D5F9E 100%)';

const BADGE_LABELS: Record<string, string> = {
  discount: 'Descuento', courtesy: 'Cortesía', exclusive: 'Exclusivo', new: 'Nuevo',
};

export default function GuideExperiencesPage() {
  const { user, currentAgency, adminMode } = useAuth();
  const isSuperAdmin = !!user?.is_superadmin;

  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingExp, setEditingExp] = useState<Experience | null>(null);
  const [formData, setFormData] = useState<Partial<Experience>>({});
  const [saving, setSaving] = useState(false);

  // Superadmin manages the full zone catalog. Agency staff only ever see the
  // zone(s) their own apartments belong to — derived from their apartment list,
  // since agencies have no access to the global /guide/admin/zones catalog.
  useEffect(() => {
    const loadZones = async () => {
      try {
        if (isSuperAdmin) {
          const response = await apiClient.request('/guide/admin/zones');
          if (response.success) {
            setZones(response.zones);
            if (response.zones.length > 0) setSelectedZone(response.zones[0].id);
            else setLoading(false);
          }
        } else {
          if (!currentAgency?.id) { setLoading(false); return; }
          const aptRes = await apiClient.request(`/guide/admin/apartments?agency_id=${currentAgency.id}`);
          const apts = aptRes.apartments || [];
          const zoneMap = new Map<string, Zone>();
          for (const a of apts) {
            if (a.zone_id && !zoneMap.has(a.zone_id)) {
              zoneMap.set(a.zone_id, { id: a.zone_id, name: a.zone_name || a.zone_id });
            }
          }
          const agencyZones = Array.from(zoneMap.values());
          setZones(agencyZones);
          if (agencyZones.length > 0) setSelectedZone(agencyZones[0].id);
          else setLoading(false);
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar zonas');
        setLoading(false);
      }
    };

    loadZones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, currentAgency?.id]);

  useEffect(() => {
    if (!selectedZone) return;

    const loadExperiences = async () => {
      setLoading(true);
      try {
        const response = await apiClient.request(`/guide/admin/experiences?zone_id=${selectedZone}`);
        if (response.success) setExperiences(response.experiences || []);
      } catch (err: any) {
        setError(err.message || 'Error al cargar experiencias');
      } finally {
        setLoading(false);
      }
    };

    loadExperiences();
  }, [selectedZone]);

  if (!isSuperAdmin && adminMode !== 'agency') {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="info" sx={{ maxWidth: 500, mx: 'auto' }}>
          Cambia al modo <strong>Agencia</strong> en la barra lateral para ver las experiencias activas.
        </Alert>
      </Box>
    );
  }

  const handleOpenDialog = (exp?: Experience) => {
    if (exp) {
      setEditingExp(exp);
      setFormData({ ...exp });
    } else {
      setEditingExp(null);
      setFormData({
        zone_id: selectedZone,
        action_type: 'URL',
        badge_type: 'none',
        commission_type: 'none',
        is_active: true,
        is_featured: false,
        order_index: 0
      });
    }
    setOpenDialog(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingExp) {
        await apiClient.request(`/guide/admin/experiences/${editingExp.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await apiClient.request('/guide/admin/experiences', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      setOpenDialog(false);
      const response = await apiClient.request(`/guide/admin/experiences?zone_id=${selectedZone}`);
      if (response.success) setExperiences(response.experiences || []);
    } catch (err: any) {
      setError(err.message || 'Error al guardar experiencia');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (exp: Experience) => {
    try {
      const updated = { ...exp, is_active: !exp.is_active };
      await apiClient.request(`/guide/admin/experiences/${exp.id}`, {
        method: 'PUT',
        body: JSON.stringify(updated)
      });
      setExperiences(experiences.map(e => e.id === exp.id ? updated : e));
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = localStorage.getItem('auth_token') || '';
      const uploadRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev'}/media/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      });
      const data = await uploadRes.json();
      if (data.success && data.url) {
        setFormData({ ...formData, cover_image_url: data.url });
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      alert(err.message || 'Error al subir imagen');
    }
  };

  // ============ AGENCY: read-only view ============
  // No commission data (already stripped server-side), no edit/create controls —
  // agencies can see which promotions are currently active for their guests, nothing more.
  if (!isSuperAdmin) {
    return (
      <Box sx={{ p: { xs: 2, md: 0 } }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocalActivityIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight={700}>Experiencias y Promociones</Typography>
              <Typography variant="body2" color="text.secondary">Qué está activo ahora mismo para tus huéspedes</Typography>
            </Box>
          </Box>

          {zones.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Zona</InputLabel>
              <Select value={selectedZone} label="Zona" onChange={e => setSelectedZone(e.target.value)}>
                {zones.map(z => <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>)}
              </Select>
            </FormControl>
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : zones.length === 0 ? (
          <Alert severity="info">
            Todavía no tienes apartamentos asignados a una zona turística. Crea un apartamento para ver sus experiencias disponibles.
          </Alert>
        ) : experiences.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No hay experiencias activas en esta zona por ahora.</Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {experiences.map(exp => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={exp.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{
                    height: 140,
                    background: exp.cover_image_url ? `url(${exp.cover_image_url}) center/cover` : getCategoryGradient(exp.category),
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    p: 1.5,
                  }}>
                    <Chip label={exp.category} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: '0.7rem' }} />
                    {exp.is_featured && (
                      <Chip icon={<StarIcon sx={{ fontSize: 14 }} />} label="Destacado" size="small" color="warning" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                    )}
                  </Box>
                  <CardContent sx={{ flexGrow: 1, pt: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom noWrap>
                      {exp.name_es || exp.category}
                    </Typography>
                    {exp.name_en && exp.name_en !== exp.name_es && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        {exp.name_en}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                      {exp.price_display && (
                        <Typography variant="body2" fontWeight={600} color="primary.main">{exp.price_display}</Typography>
                      )}
                      {exp.original_price_display && (
                        <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                          {exp.original_price_display}
                        </Typography>
                      )}
                      {exp.badge_type && exp.badge_type !== 'none' && (
                        <Chip label={BADGE_LABELS[exp.badge_type] || exp.badge_type} size="small" color="secondary" variant="outlined" />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    );
  }

  // ============ SUPERADMIN: full management table ============
  return (
    <Box sx={{ p: { xs: 2, md: 0 } }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LocalActivityIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>Experiencias y Upselling</Typography>
            <Typography variant="body2" color="text.secondary">Gestión global de promociones (Superadmin)</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Zona</InputLabel>
            <Select value={selectedZone} label="Zona" onChange={e => setSelectedZone(e.target.value)}>
              {zones.map(z => <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>)}
            </Select>
          </FormControl>

          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} disabled={!selectedZone}>
            Añadir Experiencia
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Imagen</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell>Precio</TableCell>
                <TableCell>Acción</TableCell>
                <TableCell>Badge</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="right">Opciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {experiences.map(exp => (
                <TableRow key={exp.id} sx={{ opacity: exp.is_active ? 1 : 0.6 }}>
                  <TableCell>
                    <Avatar variant="rounded" src={exp.cover_image_url} sx={{ width: 50, height: 50 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{exp.name_es}</Typography>
                  </TableCell>
                  <TableCell>{exp.category}</TableCell>
                  <TableCell>{exp.price_display}</TableCell>
                  <TableCell>
                    <Chip size="small" label={exp.action_type} color={exp.action_type === 'WHATSAPP' ? 'success' : 'primary'} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {exp.badge_type !== 'none' && <Chip size="small" label={exp.badge_type} />}
                  </TableCell>
                  <TableCell align="center">
                    <Switch checked={exp.is_active} onChange={() => handleToggleActive(exp)} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenDialog(exp)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {experiences.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary">No hay experiencias en esta zona.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog */}
      <Dialog open={openDialog} onClose={() => !saving && setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingExp ? 'Editar Experiencia' : 'Nueva Experiencia'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* Basic Info */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Zona</InputLabel>
                <Select value={formData.zone_id || ''} label="Zona" onChange={e => setFormData({...formData, zone_id: e.target.value})}>
                  {zones.map(z => <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Categoría" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Subcategoría Servicio (opcional)" value={formData.service_subcategory || ''} onChange={e => setFormData({...formData, service_subcategory: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" type="number" label="Orden" value={formData.order_index || 0} onChange={e => setFormData({...formData, order_index: parseInt(e.target.value)})} />
            </Grid>

            {/* Names & Descriptions */}
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
              <TextField fullWidth size="small" label="Botón CTA (ES)" value={formData.cta_label_es || ''} onChange={e => setFormData({...formData, cta_label_es: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Botón CTA (EN)" value={formData.cta_label_en || ''} onChange={e => setFormData({...formData, cta_label_en: e.target.value})} />
            </Grid>

            {/* Action config */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de Acción</InputLabel>
                <Select value={formData.action_type || ''} label="Tipo de Acción" onChange={e => setFormData({...formData, action_type: e.target.value})}>
                  <MenuItem value="URL">Enlace Web (URL)</MenuItem>
                  <MenuItem value="WHATSAPP">WhatsApp</MenuItem>
                  <MenuItem value="PHONE">Teléfono</MenuItem>
                  <MenuItem value="COUPON">Cupón de Descuento</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Action Data (URL, número, cupón)" value={formData.action_data || ''} onChange={e => setFormData({...formData, action_data: e.target.value})} />
            </Grid>
            {formData.action_type === 'WHATSAPP' && (
              <Grid item xs={12}>
                <TextField fullWidth size="small" multiline rows={2} label="Mensaje Predefinido WhatsApp" value={formData.action_prefilled_message || ''} onChange={e => setFormData({...formData, action_prefilled_message: e.target.value})} />
              </Grid>
            )}

            {/* Practical info */}
            <Grid item xs={12} md={8}>
              <TextField fullWidth size="small" label="Dirección" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" label="Teléfono" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" label="Web oficial" value={formData.website_url || ''} onChange={e => setFormData({...formData, website_url: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" label="URL de reserva (si difiere de Action Data)" value={formData.booking_url || ''} onChange={e => setFormData({...formData, booking_url: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" label="Duración (ej. 1-2 h)" value={formData.duration_text || ''} onChange={e => setFormData({...formData, duration_text: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Horario (texto libre)" value={formData.opening_hours || ''} onChange={e => setFormData({...formData, opening_hours: e.target.value})} />
            </Grid>

            {/* Pricing & Badges */}
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" label="Precio Display (ej. €200/persona)" value={formData.price_display || ''} onChange={e => setFormData({...formData, price_display: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" label="Precio Original (opcional)" value={formData.original_price_display || ''} onChange={e => setFormData({...formData, original_price_display: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" label="Descuento (opcional)" value={formData.discount_display || ''} onChange={e => setFormData({...formData, discount_display: e.target.value})} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Badge</InputLabel>
                <Select value={formData.badge_type || ''} label="Badge" onChange={e => setFormData({...formData, badge_type: e.target.value})}>
                  <MenuItem value="none">Ninguno</MenuItem>
                  <MenuItem value="discount">Descuento</MenuItem>
                  <MenuItem value="courtesy">Cortesía</MenuItem>
                  <MenuItem value="exclusive">Exclusivo</MenuItem>
                  <MenuItem value="new">Nuevo</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Superadmin Commission Config */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo Comisión (Admin)</InputLabel>
                <Select value={formData.commission_type || ''} label="Tipo Comisión (Admin)" onChange={e => setFormData({...formData, commission_type: e.target.value})}>
                  <MenuItem value="none">Ninguna</MenuItem>
                  <MenuItem value="percentage">Porcentaje</MenuItem>
                  <MenuItem value="fixed">Fija</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" type="number" label="Valor Comisión (Admin)" value={formData.commission_value || 0} onChange={e => setFormData({...formData, commission_value: parseFloat(e.target.value)})} disabled={formData.commission_type === 'none'} />
            </Grid>

            {/* Image & Switches */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {formData.cover_image_url && <img src={formData.cover_image_url} alt="Cover" style={{ height: 60, borderRadius: 4 }} />}
                <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
                  Subir Imagen Portada
                  <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <FormControlLabel control={<Switch checked={formData.is_active || false} onChange={e => setFormData({...formData, is_active: e.target.checked})} />} label="Activo" />
                <FormControlLabel control={<Switch checked={formData.is_featured || false} onChange={e => setFormData({...formData, is_featured: e.target.checked})} />} label="Destacado" />
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
    </Box>
  );
}
