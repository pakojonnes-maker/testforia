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
import GuidePoisImportDialog from './GuidePoisImportDialog';
import GuideCatalogFormDialog from '../../components/guide/GuideCatalogFormDialog';
import { isTrue, displayName } from '../../components/guide/catalogTypes';
import type { CatalogItem } from '../../components/guide/catalogTypes';
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
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Edit as EditIcon,
  TravelExplore as TravelExploreIcon,
  Visibility as VisibleIcon,
  VisibilityOff as HiddenIcon,
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

// Un restaurante traído de Google es una fila de guide_pois (categoría "Restaurantes"): el
// mismo ítem del catálogo que editan las experiencias, con los datos de Google al lado.
type GoogleRestaurant = CatalogItem & {
  business_status?: string | null;
  google_rating?: number | null;
  google_rating_count?: number | null;
};

const BUSINESS_STATUS_LABEL: Record<string, string> = {
  CLOSED_PERMANENTLY: 'Cerrado definitivamente',
  CLOSED_TEMPORARILY: 'Cerrado temporalmente',
  FUTURE_OPENING: 'Aún no ha abierto',
};

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
  const [reordering, setReordering] = useState(false);
  // Tipo de cocina: alimenta el filtro de la pestaña Restaurantes de la guía.
  const [cuisine, setCuisine] = useState('');
  const [editingLink, setEditingLink] = useState<ZoneRestaurant | null>(null);
  const [editCuisine, setEditCuisine] = useState('');
  const [savingCuisine, setSavingCuisine] = useState(false);
  // Restaurantes importados de Google en la zona (guide_pois, categoría "Restaurantes").
  const [imported, setImported] = useState<GoogleRestaurant[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [editingImported, setEditingImported] = useState<GoogleRestaurant | null>(null);

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
      // Los lugares de la zona (también los ocultos), quedándonos con los restaurantes. En su
      // propio try: si esto falla, la lista de clientes de arriba se sigue viendo.
      try {
        const pois = await apiClient.request(`/guide/admin/pois?zone_id=${selectedZone}&kind=place&include_inactive=1`);
        setImported((pois.pois || []).filter(
          (p: GoogleRestaurant) => (p.category || '').trim().toLowerCase() === 'restaurantes'
        ));
      } catch (err: any) {
        setImported([]);
        setError(err.message || 'Error al cargar los restaurantes importados de Google');
      }
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
    setCuisine('');
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
        // Sin cocina se omite (undefined no viaja en el JSON): el backend sólo
        // toca cuisine_type_override si el campo llega.
        body: JSON.stringify({
          zone_id: selectedZone, restaurant_id: selectedRestaurant.id, tier,
          cuisine_type_override: cuisine.trim() || undefined,
        }),
      });
      setDialogOpen(false);
      await loadLinks();
    } catch (err: any) {
      setError(err.message || 'Error al vincular el restaurante');
    } finally {
      setSaving(false);
    }
  };

  // Las cocinas que ya usa esta zona, como sugerencias: el filtro de la guía agrupa
  // por el texto (sin distinguir mayúsculas), así que reutilizar la grafía evita
  // que "Marisco" y "Mariscos" acaben como dos pestañas distintas.
  const cuisineOptions = Array.from(
    new Set(links.map(l => l.cuisine_type_override?.trim()).filter((c): c is string => !!c))
  ).sort((a, b) => a.localeCompare(b));

  const handleSaveCuisine = async () => {
    if (!editingLink) return;
    setSavingCuisine(true);
    setError(null);
    try {
      // Reenvía tier y order_override tal cual (el upsert los exige); '' borra la cocina.
      await apiClient.request('/guide/admin/zone-restaurants', {
        method: 'POST',
        body: JSON.stringify({
          zone_id: editingLink.zone_id, restaurant_id: editingLink.restaurant_id,
          tier: editingLink.tier, order_override: editingLink.order_override,
          cuisine_type_override: editCuisine.trim(),
        }),
      });
      setEditingLink(null);
      await loadLinks();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el tipo de cocina');
    } finally {
      setSavingCuisine(false);
    }
  };

  // Destacar / ocultar un restaurante importado: es un PUT a su fila de guide_pois (el mismo
  // endpoint que el catálogo), que además invalida la caché de la guía de la zona.
  const handleToggleImported = async (poi: GoogleRestaurant, patch: { is_active?: boolean; is_featured?: boolean }) => {
    setError(null);
    try {
      await apiClient.request(`/guide/admin/pois/${poi.id}`, { method: 'PUT', body: JSON.stringify(patch) });
      await loadLinks();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el restaurante');
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

  /**
   * Orden base de la zona. Hasta ahora `order_override` existía en la tabla pero
   * no había forma de fijarlo desde ninguna parte, así que quedaba siempre a
   * NULL y workerGuide.js caía en `ABS(RANDOM()) % 1000` — orden aleatorio, y
   * encima congelado dentro de la caché KV hasta que caducara la entrada.
   *
   * Se reescribe la lista entera en cada movimiento (no sólo el par que se
   * mueve) para que ningún restaurante se quede sin posición explícita y vuelva
   * al fondo por el COALESCE.
   */
  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= links.length) return;

    const reordered = [...links];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setLinks(reordered.map((l, i) => ({ ...l, order_override: i }))); // optimista
    setReordering(true);
    try {
      for (const [i, link] of reordered.entries()) {
        await apiClient.request('/guide/admin/zone-restaurants', {
          method: 'POST',
          body: JSON.stringify({
            zone_id: link.zone_id, restaurant_id: link.restaurant_id,
            tier: link.tier, order_override: i,
          }),
        });
      }
      await loadLinks();
    } catch (err: any) {
      setError(err.message || 'Error al reordenar');
      await loadLinks();
    } finally {
      setReordering(false);
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
              Qué restaurantes aparecen en la guía: clientes de VisualTaste y los importados de Google (Superadmin)
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
          <Button variant="outlined" startIcon={<TravelExploreIcon />} onClick={() => setImportOpen(true)} disabled={!selectedZone}>
            Importar de Google
          </Button>
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
            {imported.length === 0
              ? 'Ningún restaurante en esta zona todavía. La pestaña "Restaurantes" de la guía se ve vacía hasta que vincules un cliente o importes uno de Google.'
              : 'Ningún cliente de VisualTaste vinculado a esta zona (los importados de Google están debajo).'}
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
                    <IconButton
                      size="small" disabled={idx === 0 || reordering}
                      onClick={() => handleMove(idx, -1)}
                    >
                      <ArrowUpIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small" disabled={idx === links.length - 1 || reordering}
                      onClick={() => handleMove(idx, 1)}
                    >
                      <ArrowDownIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small" title="Tipo de cocina (filtro de la guía)"
                      onClick={() => { setEditingLink(link); setEditCuisine(link.cuisine_type_override || ''); }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleUnlink(link)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText
                  primary={link.restaurant_name}
                  secondary={link.cuisine_type_override
                    ? `Cocina: ${link.cuisine_type_override}`
                    : 'Sin tipo de cocina: solo sale en «Todos» del filtro de la guía'}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {!loading && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" fontWeight={700}>Importados de Google</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Restaurantes que no son clientes de VisualTaste. Salen en la pestaña «Restaurantes» de la guía
            (sin carta en vídeo, con «Reservar» y «Cómo llegar») y no en Explorar. Los datos de Google no
            traen foto: súbela desde «Editar».
          </Typography>
          {imported.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Ninguno todavía. Pulsa «Importar de Google» y pega la URL de Google Maps o el nombre del sitio.
              </Typography>
            </Paper>
          ) : (
            <Paper variant="outlined">
              <List disablePadding>
                {imported.map((poi, idx) => {
                  const cuisine = poi.subcategory || poi.service_subcategory;
                  return (
                    <ListItem
                      key={poi.id}
                      divider={idx < imported.length - 1}
                      sx={{ opacity: isTrue(poi.is_active) ? 1 : 0.55 }}
                      secondaryAction={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {poi.business_status && poi.business_status !== 'OPERATIONAL' && (
                            <Chip
                              size="small" color="error" variant="outlined"
                              label={BUSINESS_STATUS_LABEL[poi.business_status] || poi.business_status}
                            />
                          )}
                          <Chip
                            icon={<StarIcon sx={{ fontSize: 16 }} />}
                            label={isTrue(poi.is_featured) ? 'Destacado' : 'Básico'}
                            size="small"
                            color={isTrue(poi.is_featured) ? 'warning' : 'default'}
                            variant={isTrue(poi.is_featured) ? 'filled' : 'outlined'}
                            onClick={() => handleToggleImported(poi, { is_featured: !isTrue(poi.is_featured) })}
                            sx={{ cursor: 'pointer' }}
                          />
                          <IconButton
                            size="small" title="Editar (foto, teléfono, WhatsApp, cocina…)"
                            onClick={() => setEditingImported(poi)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            title={isTrue(poi.is_active) ? 'Ocultar de la guía' : 'Volver a mostrar'}
                            onClick={() => handleToggleImported(poi, { is_active: !isTrue(poi.is_active) })}
                          >
                            {isTrue(poi.is_active) ? <VisibleIcon fontSize="small" /> : <HiddenIcon fontSize="small" />}
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={displayName(poi)}
                        secondary={[
                          cuisine ? `Cocina: ${cuisine}` : 'Sin tipo de cocina',
                          poi.google_rating ? `★ ${poi.google_rating} (${poi.google_rating_count ?? '—'})` : null,
                          poi.cover_image_url || poi.media_url ? null : 'Sin foto',
                          isTrue(poi.is_active) ? null : 'Oculto en la guía',
                        ].filter(Boolean).join(' · ')}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Paper>
          )}
        </Box>
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
          <Autocomplete
            freeSolo
            options={cuisineOptions}
            inputValue={cuisine}
            onInputChange={(_, v) => setCuisine(v)}
            renderInput={(params) => (
              <TextField
                {...params} label="Tipo de cocina (opcional)" size="small"
                helperText="Es el filtro de la pestaña Restaurantes de la guía. Escríbelo igual en todos los de la misma cocina."
              />
            )}
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

      <Dialog open={editingLink !== null} onClose={() => !savingCuisine && setEditingLink(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Tipo de cocina</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="body2" color="text.secondary">{editingLink?.restaurant_name}</Typography>
          <Autocomplete
            freeSolo
            options={cuisineOptions}
            inputValue={editCuisine}
            onInputChange={(_, v) => setEditCuisine(v)}
            renderInput={(params) => (
              <TextField
                {...params} label="Tipo de cocina" size="small" autoFocus
                helperText="Es el filtro de la pestaña Restaurantes de la guía. Vacío: solo sale en «Todos»."
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingLink(null)} disabled={savingCuisine}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveCuisine} disabled={savingCuisine}>
            {savingCuisine ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <GuidePoisImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        zones={zones}
        defaultZoneId={selectedZone}
        onImported={() => loadLinks()}
        mode="restaurant"
      />

      <GuideCatalogFormDialog
        open={editingImported !== null}
        zones={zones}
        item={editingImported}
        initialKind="place"
        defaultZoneId={selectedZone}
        onClose={() => setEditingImported(null)}
        onSaved={() => { loadLinks(); }}
      />
    </Box>
  );
}
