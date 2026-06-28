// src/pages/guide/GuideApartmentsPage.tsx
// List and manage apartments for the current agency
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import {
  Box, Typography, Grid, Card, CardContent, CardActions,
  Button, IconButton, Chip, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Apartment as ApartmentIcon,
  Edit as EditIcon,
  QrCode2 as QrIcon,
  LocationOn as LocationIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';

interface Apartment {
  id: string;
  name: string;
  slug: string;
  address: string;
  zone_id: string;
  zone_name: string;
  is_active: boolean;
  created_at: string;
}

interface Zone {
  id: string;
  name: string;
  slug: string;
}

export default function GuideApartmentsPage() {
  const { currentAgency, user } = useAuth();
  const navigate = useNavigate();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApt, setEditingApt] = useState<Apartment | null>(null);
  const [form, setForm] = useState({ name: '', address: '', zone_id: '' });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!currentAgency?.id) return;
    setLoading(true);
    try {
      const [aptRes, zoneRes] = await Promise.all([
        apiClient.request(`/guide/admin/apartments?agency_id=${currentAgency.id}`),
        apiClient.request('/guide/admin/zones'),
      ]);
      setApartments(aptRes.apartments || []);
      setZones(zoneRes.zones || []);
    } catch (err) {
      console.error('Error loading apartments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [currentAgency?.id]);

  const handleOpenCreate = () => {
    setEditingApt(null);
    setForm({ name: '', address: '', zone_id: zones[0]?.id || '' });
    setDialogOpen(true);
  };

  const handleOpenEdit = (apt: Apartment) => {
    setEditingApt(apt);
    setForm({ name: apt.name, address: apt.address || '', zone_id: apt.zone_id });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingApt) {
        await apiClient.request(`/guide/admin/apartments/${editingApt.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await apiClient.request('/guide/admin/apartments', {
          method: 'POST',
          body: JSON.stringify({ ...form, agency_id: currentAgency.id }),
        });
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!currentAgency) {
    return (
      <Alert severity="warning" sx={{ m: 3 }}>
        No tienes agencia seleccionada.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Apartamentos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentAgency.name} — {apartments.length} apartamento{apartments.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ borderRadius: 2 }}
        >
          Nuevo Apartamento
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : apartments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ApartmentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No hay apartamentos todavía
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Crea tu primer apartamento para generar su QR del guidebook.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            Crear apartamento
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {apartments.map((apt) => (
            <Grid item xs={12} sm={6} md={4} key={apt.id}>
              <Card elevation={0} sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.main', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
              }}>
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                    <Typography variant="h6" fontWeight={600} noWrap sx={{ maxWidth: '70%' }}>
                      {apt.name}
                    </Typography>
                    <Chip
                      label={apt.is_active ? 'Activo' : 'Inactivo'}
                      size="small"
                      color={apt.is_active ? 'success' : 'default'}
                      variant="outlined"
                      sx={{ borderRadius: 1.5 }}
                    />
                  </Box>
                  {apt.address && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                      <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {apt.address}
                      </Typography>
                    </Box>
                  )}
                  <Chip
                    label={apt.zone_name}
                    size="small"
                    variant="outlined"
                    sx={{ borderRadius: 1.5, mt: 0.5 }}
                  />
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                  <Tooltip title="Editar apartamento">
                    <IconButton size="small" onClick={() => handleOpenEdit(apt)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Gestionar información">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/guide/apartments/${apt.id}`)}
                      color="primary"
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Ver QR">
                    <IconButton size="small" onClick={() => navigate(`/guide/apartments/${apt.id}`)}>
                      <QrIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingApt ? 'Editar Apartamento' : 'Nuevo Apartamento'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nombre"
              fullWidth
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Piso Playa Burriana 2B"
            />
            <TextField
              label="Dirección"
              fullWidth
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Ej: Calle Carabeo 15, Nerja"
            />
            <FormControl fullWidth>
              <InputLabel>Zona</InputLabel>
              <Select
                value={form.zone_id}
                label="Zona"
                onChange={(e) => setForm({ ...form, zone_id: e.target.value })}
              >
                {zones.map((z) => (
                  <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !form.name || !form.zone_id}
          >
            {saving ? <CircularProgress size={20} /> : editingApt ? 'Guardar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
