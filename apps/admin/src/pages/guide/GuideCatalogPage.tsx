// src/pages/guide/GuideCatalogPage.tsx
// Catálogo de la zona: lugares + experiencias en UNA pantalla.
//
// Antes esto eran dos páginas (GuidePoisPage y GuideExperiencesPage) que editaban
// la misma tabla: desde la migración 0059 todo vive en `guide_pois` y lo único
// que distingue una experiencia de un lugar es `is_bookable`. Mantenerlas
// separadas obligaba a duplicar formulario, subida de fotos y borrado, y no había
// ningún sitio donde ver el catálogo completo de una zona. Aquí el tipo es un
// filtro (pestañas) y un campo del formulario, no una entrada del menú.
//
// Dos consumidores muy distintos:
//   · superadmin → gestiona el catálogo global de la zona (CRUD completo).
//   · agencia    → solo lectura de las experiencias activas de sus zonas, sin
//                  comisiones (el worker las elimina en /guide/admin/experiences).
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import GuidePoisImportDialog from './GuidePoisImportDialog';
import GuidePoiDeleteDialog from '../../components/guide/GuidePoiDeleteDialog';
import GuideCatalogCard from '../../components/guide/GuideCatalogCard';
import GuideCatalogTable from '../../components/guide/GuideCatalogTable';
import GuideCatalogFormDialog from '../../components/guide/GuideCatalogFormDialog';
import {
  CatalogItem, CatalogKind, Zone, isExperience, isTrue, displayName,
} from '../../components/guide/catalogTypes';
import {
  Box, Typography, Paper, Alert, Button, CircularProgress, Grid, Tabs, Tab,
  TextField, Select, MenuItem, InputLabel, FormControl, FormControlLabel, Switch,
  ToggleButton, ToggleButtonGroup, Menu, InputAdornment, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  TravelExplore as TravelExploreIcon,
  Translate as TranslateIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  Place as PlaceIcon,
  LocalActivity as LocalActivityIcon,
  Explore as ExploreIcon,
} from '@mui/icons-material';

type KindFilter = 'all' | 'place' | 'experience';
type ViewMode = 'grid' | 'table';

const VIEW_STORAGE_KEY = 'guide_catalog_view';
const GRID_PAGE_SIZE = 48;
/** MAX_ENTITIES_PER_REQUEST en workerGuideTranslate.js */
const TRANSLATE_BATCH = 25;

interface TranslateUsage {
  budget_remaining: number;
  budget_limit: number;
  budget_tracked: boolean;
  neurons_spent?: number;
}

export default function GuideCatalogPage() {
  const { user, currentAgency, adminMode } = useAuth();
  const isSuperAdmin = !!user?.is_superadmin;

  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros (todos en cliente sobre el catálogo ya cargado de la zona)
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [view, setView] = useState<ViewMode>(
    () => (localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode) || 'grid'
  );
  const [gridLimit, setGridLimit] = useState(GRID_PAGE_SIZE);

  // Diálogos
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [newKind, setNewKind] = useState<CatalogKind>('place');
  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<CatalogItem | null>(null);

  // Traducción de zona
  const [translating, setTranslating] = useState(false);
  const [translateInfo, setTranslateInfo] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem(VIEW_STORAGE_KEY, view); }, [view]);

  // ---- Zonas -------------------------------------------------------------
  // El superadmin gestiona el catálogo global. El personal de agencia no tiene
  // acceso a /guide/admin/zones, así que sus zonas se derivan de sus apartamentos.
  useEffect(() => {
    const loadZones = async () => {
      try {
        if (isSuperAdmin) {
          const res = await apiClient.request('/guide/admin/zones');
          if (res.success) {
            setZones(res.zones);
            if (res.zones.length > 0) setSelectedZone(res.zones[0].id);
            else setLoading(false);
          }
        } else {
          if (!currentAgency?.id) { setLoading(false); return; }
          const res = await apiClient.request(`/guide/admin/apartments?agency_id=${currentAgency.id}`);
          const zoneMap = new Map<string, Zone>();
          for (const apt of (res.apartments || [])) {
            if (apt.zone_id && !zoneMap.has(apt.zone_id)) {
              zoneMap.set(apt.zone_id, { id: apt.zone_id, name: apt.zone_name || apt.zone_id });
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

  // ---- Catálogo ----------------------------------------------------------
  const loadItems = useCallback(async (zoneId: string) => {
    if (!zoneId) return;
    setLoading(true);
    try {
      if (isSuperAdmin) {
        // Una sola llamada: lugares + experiencias, incluidos los archivados
        // (que antes desaparecían del admin para siempre al archivarlos).
        const res = await apiClient.request(
          `/guide/admin/pois?zone_id=${zoneId}&kind=all&include_inactive=1`
        );
        if (res.success) setItems(res.pois || []);
      } else {
        const res = await apiClient.request(`/guide/admin/experiences?zone_id=${zoneId}`);
        if (res.success) {
          setItems((res.experiences || []).map((exp: CatalogItem) => ({ ...exp, is_bookable: 1 })));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar el catálogo');
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    setGridLimit(GRID_PAGE_SIZE);
    loadItems(selectedZone);
  }, [selectedZone, loadItems]);

  // ---- Filtrado ----------------------------------------------------------
  const categories = useMemo(
    () => Array.from(new Set(items.map(i => i.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es')),
    [items]
  );

  /** Todo menos el filtro de tipo: así las pestañas pueden contar lo que darían. */
  const preFiltered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter(item => {
      if (!showArchived && !isTrue(item.is_active)) return false;
      if (category && item.category !== category) return false;
      if (!term) return true;
      return [item.name_es, item.name_en, item.address, item.category, item.subcategory]
        .some(value => (value || '').toLowerCase().includes(term));
    });
  }, [items, search, category, showArchived]);

  const counts = useMemo(() => ({
    all: preFiltered.length,
    place: preFiltered.filter(i => !isExperience(i)).length,
    experience: preFiltered.filter(i => isExperience(i)).length,
  }), [preFiltered]);

  const filtered = useMemo(() => {
    if (kindFilter === 'all') return preFiltered;
    const wantExperience = kindFilter === 'experience';
    return preFiltered.filter(i => isExperience(i) === wantExperience);
  }, [preFiltered, kindFilter]);

  useEffect(() => { setGridLimit(GRID_PAGE_SIZE); }, [kindFilter, search, category, showArchived]);

  // ---- Acciones ----------------------------------------------------------
  const handleOpenNew = (kind: CatalogKind) => {
    setAddMenuAnchor(null);
    setEditingItem(null);
    setNewKind(kind);
    setFormOpen(true);
  };

  const handleEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleToggleActive = async (item: CatalogItem) => {
    const nextActive = !isTrue(item.is_active);
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, is_active: nextActive ? 1 : 0 } : i)));
    try {
      await apiClient.request(`/guide/admin/pois/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: nextActive }),
      });
    } catch (err: any) {
      setItems(prev => prev.map(i => (i.id === item.id ? { ...i, is_active: nextActive ? 0 : 1 } : i)));
      setError(err.message || 'Error al cambiar el estado');
    }
  };

  /**
   * Backfill de traducciones de toda la zona (lugares y experiencias: el
   * traductor trabaja sobre entity_type='poi' para las dos). Solo rellena los
   * idiomas que faltan, así que es seguro relanzarlo: lo ya traducido sale como
   * "al día" sin gastar una neurona. Si se agota el presupuesto diario, corta y
   * lo dice — se retoma al día siguiente.
   */
  const handleTranslateZone = async () => {
    if (items.length === 0) return;
    setTranslating(true);
    setTranslateInfo(null);
    setError(null);

    const ids = items.map(i => i.id);
    let translated = 0, upToDate = 0, failed = 0, neurons = 0;
    let budgetExhausted = false;
    let usage: TranslateUsage | null = null;

    try {
      for (let i = 0; i < ids.length; i += TRANSLATE_BATCH) {
        const res = await apiClient.request('/guide/admin/translate', {
          method: 'POST',
          body: JSON.stringify({ entity_type: 'poi', entity_ids: ids.slice(i, i + TRANSLATE_BATCH) }),
        });
        if (res.usage) {
          usage = res.usage;
          neurons += res.usage.neurons_spent || 0;
        }
        for (const result of (res.results || [])) {
          if (result.status === 'translated' || result.status === 'partial') translated++;
          else if (result.status === 'up_to_date') upToDate++;
          else if (result.status === 'budget_exhausted') budgetExhausted = true;
          else failed++;
        }
        if ((res.pending_ids || []).length > 0) { budgetExhausted = true; break; }
      }
      setTranslateInfo(
        `${translated} traducidos, ${upToDate} ya estaban al día` +
        (failed > 0 ? `, ${failed} sin traducir` : '') +
        (budgetExhausted ? '. Límite diario de IA alcanzado — relanza mañana para el resto' : '') +
        `. Coste: ${Math.round(neurons)} neuronas` +
        // "del traductor" a propósito: el asistente de los huéspedes gasta de la
        // misma bolsa diaria de la cuenta y no está contado aquí.
        (usage?.budget_tracked
          ? ` · quedan ${usage.budget_remaining.toLocaleString('es-ES')} de ${usage.budget_limit.toLocaleString('es-ES')} del presupuesto diario del traductor.`
          : '.')
      );
      await loadItems(selectedZone);
    } catch (err: any) {
      setError(err.message || 'Error al traducir la zona');
    } finally {
      setTranslating(false);
    }
  };

  // ---- Guardas de acceso -------------------------------------------------
  if (!isSuperAdmin && adminMode !== 'agency') {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="info" sx={{ maxWidth: 520, mx: 'auto' }}>
          Cambia al modo <strong>Agencia</strong> en la barra lateral para ver las experiencias activas.
        </Alert>
      </Box>
    );
  }

  const title = isSuperAdmin ? 'Lugares y experiencias' : 'Experiencias y promociones';
  const subtitle = isSuperAdmin
    ? 'Catálogo de la zona: lo que los huéspedes ven en Explorar y en el carrusel de reservables'
    : 'Qué está activo ahora mismo para tus huéspedes';

  return (
    <Box sx={{ p: { xs: 2, md: 0 } }}>
      {/* ---------- Cabecera ---------- */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ExploreIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>{title}</Typography>
            <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {(isSuperAdmin || zones.length > 1) && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Zona</InputLabel>
              <Select value={selectedZone} label="Zona" onChange={e => setSelectedZone(e.target.value)}>
                {zones.map(z => <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>)}
              </Select>
            </FormControl>
          )}

          {isSuperAdmin && (
            <>
              <Button
                variant="outlined"
                startIcon={<TravelExploreIcon />}
                onClick={() => setImportOpen(true)}
                disabled={!selectedZone}
              >
                Importar de Google
              </Button>
              <Tooltip title="Rellena los 11 idiomas que faltan en todo el catálogo de la zona">
                <span>
                  <Button
                    variant="outlined"
                    startIcon={translating ? <CircularProgress size={18} /> : <TranslateIcon />}
                    onClick={handleTranslateZone}
                    disabled={!selectedZone || translating || items.length === 0}
                  >
                    {translating ? 'Traduciendo…' : 'Traducir zona'}
                  </Button>
                </span>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={e => setAddMenuAnchor(e.currentTarget)}
                disabled={!selectedZone}
              >
                Añadir
              </Button>
              <Menu
                anchorEl={addMenuAnchor}
                open={Boolean(addMenuAnchor)}
                onClose={() => setAddMenuAnchor(null)}
              >
                <MenuItem onClick={() => handleOpenNew('place')}>
                  <PlaceIcon fontSize="small" sx={{ mr: 1 }} /> Lugar
                </MenuItem>
                <MenuItem onClick={() => handleOpenNew('experience')}>
                  <LocalActivityIcon fontSize="small" sx={{ mr: 1 }} /> Experiencia
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {translateInfo && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setTranslateInfo(null)}>{translateInfo}</Alert>
      )}

      {/* ---------- Filtros ---------- */}
      {(isSuperAdmin || items.length > 0) && (
        <Paper
          elevation={0}
          sx={{
            mb: 3, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2,
            position: 'sticky', top: 8, zIndex: 3, backdropFilter: 'blur(6px)',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {isSuperAdmin && (
              <Tabs
                value={kindFilter}
                onChange={(_, value) => setKindFilter(value as KindFilter)}
                sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none' } }}
              >
                <Tab value="all" label={`Todos (${counts.all})`} />
                <Tab value="place" label={`Lugares (${counts.place})`} />
                <Tab value="experience" label={`Experiencias (${counts.experience})`} />
              </Tabs>
            )}

            <TextField
              size="small"
              placeholder="Buscar por nombre, dirección…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ minWidth: 240, flexGrow: 1, maxWidth: 360 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Categoría</InputLabel>
              <Select value={category} label="Categoría" onChange={e => setCategory(e.target.value)}>
                <MenuItem value="">Todas</MenuItem>
                {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>

            {isSuperAdmin && (
              <FormControlLabel
                control={<Switch size="small" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />}
                label={<Typography variant="body2">Mostrar archivados</Typography>}
              />
            )}

            <Box sx={{ flexGrow: 1 }} />

            {isSuperAdmin && (
              <ToggleButtonGroup
                exclusive
                size="small"
                value={view}
                onChange={(_, value) => value && setView(value as ViewMode)}
              >
                <ToggleButton value="grid" aria-label="Rejilla"><GridViewIcon fontSize="small" /></ToggleButton>
                <ToggleButton value="table" aria-label="Tabla"><ListViewIcon fontSize="small" /></ToggleButton>
              </ToggleButtonGroup>
            )}
          </Box>
        </Paper>
      )}

      {/* ---------- Listado ---------- */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : zones.length === 0 ? (
        <Alert severity="info">
          {isSuperAdmin
            ? 'No hay zonas turísticas creadas todavía.'
            : 'Todavía no tienes apartamentos asignados a una zona turística. Crea un apartamento para ver sus experiencias disponibles.'}
        </Alert>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {items.length === 0
              ? (isSuperAdmin
                ? 'Esta zona no tiene nada en el catálogo todavía. Importa lugares de Google o añade el primero a mano.'
                : 'No hay experiencias activas en esta zona por ahora.')
              : 'Nada coincide con estos filtros.'}
          </Typography>
        </Paper>
      ) : view === 'table' && isSuperAdmin ? (
        <GuideCatalogTable
          items={filtered}
          onEdit={handleEdit}
          onDelete={setDeletingItem}
          onToggleActive={handleToggleActive}
        />
      ) : (
        <>
          <Grid container spacing={2.5}>
            {filtered.slice(0, gridLimit).map(item => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                <GuideCatalogCard
                  item={item}
                  readOnly={!isSuperAdmin}
                  onEdit={handleEdit}
                  onDelete={setDeletingItem}
                  onToggleActive={handleToggleActive}
                />
              </Grid>
            ))}
          </Grid>
          {filtered.length > gridLimit && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button variant="outlined" onClick={() => setGridLimit(limit => limit + GRID_PAGE_SIZE)}>
                Cargar más ({filtered.length - gridLimit} restantes)
              </Button>
            </Box>
          )}
        </>
      )}

      {/* ---------- Diálogos (solo superadmin) ---------- */}
      {isSuperAdmin && (
        <>
          <GuideCatalogFormDialog
            open={formOpen}
            zones={zones}
            item={editingItem}
            initialKind={newKind}
            defaultZoneId={selectedZone}
            onClose={() => { setFormOpen(false); setEditingItem(null); }}
            onSaved={() => loadItems(selectedZone)}
          />

          <GuidePoisImportDialog
            open={importOpen}
            onClose={() => setImportOpen(false)}
            zones={zones}
            defaultZoneId={selectedZone}
            onImported={() => loadItems(selectedZone)}
          />

          <GuidePoiDeleteDialog
            open={deletingItem !== null}
            poiId={deletingItem?.id ?? null}
            poiName={deletingItem ? displayName(deletingItem) : ''}
            kind={deletingItem && isExperience(deletingItem) ? 'experiencia' : 'poi'}
            onClose={() => setDeletingItem(null)}
            onDeleted={id => setItems(prev => prev.filter(i => i.id !== id))}
            onArchived={id => setItems(prev => prev.map(i => (i.id === id ? { ...i, is_active: 0 } : i)))}
          />
        </>
      )}
    </Box>
  );
}
