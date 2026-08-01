// src/pages/guide/GuideZoneRestaurantsPage.tsx
// Vincula restaurantes (tenants reales de restaurants) a una zona del guidebook,
// para que aparezcan en la pestaña "Restaurantes" de la guía y en las
// recomendaciones del chat IA (workerGuide.js / workerGuideAI.js leen
// guide_zone_restaurants). Antes de esta página, los endpoints existían
// (workerGuideAdmin.js: GET/POST/DELETE /guide/admin/zone-restaurants) pero no
// había ninguna pantalla que los llamara — la tabla estaba siempre vacía.
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import {
  Box, Typography, Paper, Alert, Button, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, InputLabel, FormControl,
  IconButton, Chip, List, ListItem, ListItemText, Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Restaurant as RestaurantIcon,
  Star as StarIcon,
} from '@mui/icons-material';

interface Zone {
  id: string;
  name: string;
}

interface ZoneRestaurant {
  zone_id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  tier: 'basic' | 'featured';
  cuisine_type_override: string | null;
  order_override: number | null;
}

interface RestaurantOption {
  id: string;
  name: string;
  slug: string;
}

export default function GuideZoneRestaurantsPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [links, setLinks] = useState<ZoneRestaurant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchOptions, setSearchOptions] = useState<RestaurantOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantOption | null>(null);
  const [tier, setTier] = useState<'basic' | 'featured'>('basic');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.is_superadmin) return;
    (async () => {
      try {
        const res = await apiClient.request('/guide/admin/zones');
        setZones(res.zones || []);
        if (res.zones?.length > 0) setSelectedZone(res.zones[0].id);
        else setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Error al cargar zonas');
        setLoading(false);
      }
    })();
  }, [user]);

  const loadLinks = useCallback(async () => {
    if (!selectedZone) return;
    setLoading(true);
    try {
      const res = await apiClient.request(`/guide/admin/zone-restaurants?zone_id=${selectedZone}`);
      setLinks(res.restaurants || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar restaurantes de la zona');
    } finally {
      setLoading(false);
    }
  }, [selectedZone]);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  if (!user?.is_superadmin) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ maxWidth: 500, mx: 'auto' }}>
          No tienes permisos de superadmin para acceder a esta página.
        </Alert>
      </Box>
    );
  }

  const handleOpenDialog = () => {
    setSelectedRestaurant(null);
    setSearchOptions([]);
    setSearchQuery('');
    setTier('basic');
    setDialogOpen(true);
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchOptions([]); return; }
    setSearching(true);
    try {
      const res = await apiClient.request(`/guide/admin/restaurants-search?q=${encodeURIComponent(q)}`);
      // Ya vinculados en esta zona no se ofrecen de nuevo.
      const linkedIds = new Set(links.map(l => l.restaurant_id));
      setSearchOptions((res.restaurants || []).filter((r: RestaurantOption) => !linkedIds.has(r.id)));
    } catch {
      setSearchOptions([]);
    } finally {
      setSearching(false);
    }
  };

  const handleLink = async () => {
    if (!selectedRestaurant || !selectedZone) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.request('/guide/admin/zone-restaurants', {
        method: 'POST',
        body: JSON.stringify({ zone_id: selectedZone, restaurant_id: selectedRestaurant.id, tier }),
      });
      setDialogOpen(false);
      await loadLinks();
    } catch (err: any) {
      setError(err.message || 'Error al vincular el restaurante');
    } finally {
      setSaving(false);
    }
  };

  const handleSetTier = async (link: ZoneRestaurant, newTier: 'basic' | 'featured') => {
    try {
      await apiClient.request('/guide/admin/zone-restaurants', {
        method: 'POST',
        body: JSON.stringify({ zone_id: link.zone_id, restaurant_id: link.restaurant_id, tier: newTier, order_override: link.order_override }),
      });
      await loadLinks();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el destacado');
    }
  };

  const handleUnlink = async (link: ZoneRestaurant) => {
    if (!window.confirm(`¿Quitar "${link.restaurant_name}" de esta zona? Dejará de verse en la guía.`)) return;
    try {
      await apiClient.request('/guide/admin/zone-restaurants', {
        method: 'DELETE',
        body: JSON.stringify({ zone_id: link.zone_id, restaurant_id: link.restaurant_id }),
      });
      await loadLinks();
    } catch (err: any) {
      setError(err.message || 'Error al desvincular el restaurante');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 0 } }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <RestaurantIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>Restaurantes por zona</Typography>
            <Typography variant="body2" color="text.secondary">
              Qué restaurantes aparecen en la guía y en las recomendaciones de la IA (Superadmin)
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Zona</InputLabel>
            <Select value={selectedZone} label="Zona" onChange={e => setSelectedZone(e.target.value)}>
              {zones.map(z => <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog} disabled={!selectedZone}>
            Vincular restaurante
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : links.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Ningún restaurante vinculado a esta zona todavía. La pestaña "Restaurantes" de la guía y
            las recomendaciones de la IA se ven vacías hasta que vincules al menos uno aquí.
          </Typography>
        </Paper>
      ) : (
        <Paper variant="outlined">
          <List disablePadding>
            {links.map((link, idx) => (
              <ListItem
                key={link.restaurant_id}
                divider={idx < links.length - 1}
                secondaryAction={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      icon={<StarIcon sx={{ fontSize: 16 }} />}
                      label={link.tier === 'featured' ? 'Destacado' : 'Básico'}
                      size="small"
                      color={link.tier === 'featured' ? 'warning' : 'default'}
                      variant={link.tier === 'featured' ? 'filled' : 'outlined'}
                      onClick={() => handleSetTier(link, link.tier === 'featured' ? 'basic' : 'featured')}
                      sx={{ cursor: 'pointer' }}
                    />
                    <IconButton size="small" color="error" onClick={() => handleUnlink(link)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText
                  primary={link.restaurant_name}
                  secondary={link.cuisine_type_override || undefined}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Vincular restaurante a la zona</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Autocomplete
            options={searchOptions}
            loading={searching}
            getOptionLabel={(o) => o.name}
            value={selectedRestaurant}
            onChange={(_, v) => setSelectedRestaurant(v)}
            onInputChange={(_, v) => handleSearch(v)}
            renderInput={(params) => (
              <TextField {...params} label="Buscar restaurante por nombre" size="small" autoFocus />
            )}
            noOptionsText={searchQuery.trim() ? 'Sin resultados para esa búsqueda' : 'Escribe para buscar'}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Destacado</InputLabel>
            <Select value={tier} label="Destacado" onChange={e => setTier(e.target.value as 'basic' | 'featured')}>
              <MenuItem value="basic">Básico</MenuItem>
              <MenuItem value="featured">Destacado (aparece primero, más grande)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleLink} disabled={saving || !selectedRestaurant}>
            {saving ? <CircularProgress size={20} /> : 'Vincular'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
