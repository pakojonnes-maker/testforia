// src/pages/guide/GuideStorePage.tsx
// Catálogo de la Tienda: TODOS los productos, agrupados por su ÁMBITO.
//
// Antes esta pantalla enseñaba sólo el catálogo global de VisualTaste
// (owner_type='platform', superadmin). El resultado era que el panel no
// coincidía con lo que salía en la guía y en la TV: la tienda de un huésped
// mezcla el catálogo global con los productos del alojamiento, y esos últimos
// sólo se veían entrando en cada piso. "Parece que no son gestionables desde el
// admin" fue el diagnóstico, y era razonable.
//
// El cambio de fondo no es enseñar más filas, es el ÁMBITO "agencia". Un
// property manager ofrece los mismos extras en todas sus propiedades; con un
// producto por piso, seis extras en cinco pisos eran treinta fichas con sus
// treinta juegos de traducciones a 13 idiomas. Ahora son seis, y las
// excepciones se resuelven ocultando el producto en el piso donde no aplica,
// desde su propia pestaña Tienda (no hace falta duplicar nada).
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import {
  Box, Typography, Paper, Alert, Button, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, InputLabel, FormControl, Grid,
  Card, CardContent, IconButton, Chip, Switch, FormControlLabel,
  Tabs, Tab, Tooltip, Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Storefront as StoreIcon,
  CheckCircle as CheckCircleIcon,
  Public as PublicIcon,
  Business as BusinessIcon,
  Apartment as ApartmentIcon,
  ImageNotSupported as NoImageIcon,
  VisibilityOff as HiddenIcon,
} from '@mui/icons-material';

// Categorías de la Tienda — agrupaciones, no nombres de producto (ver
// migrations/0081_store_categories_cleanup.sql). Misma lista que
// GuideApartmentDetail.tsx (tienda por apartamento) — mantener sincronizadas.
const STORE_CATEGORIES = [
  { key: 'local_product', label: 'Producto local' },
  { key: 'grocery', label: 'Compra / grocery' },
  { key: 'checkinout', label: 'Check-in / Check-out' },
  { key: 'service', label: 'Servicios de la estancia' },
  { key: 'welcome', label: 'Bienvenida' },
  { key: 'custom', label: 'Personalizado' },
];

// 13 idiomas activos del proyecto (CLAUDE.md §5). Mismo listado que GuideApartmentDetail.tsx.
const LANGUAGES = [
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'it', label: '🇮🇹 Italiano' },
  { code: 'pt', label: '🇵🇹 Português' },
  { code: 'ca', label: '🏴󠁥󠁳󠁣󠁴󠁿 Català' },
  { code: 'ar', label: '🇦🇪 العربية' },
  { code: 'ru', label: '🇷🇺 Русский' },
  { code: 'uk', label: '🇺🇦 Українська' },
  { code: 'zh', label: '🇨🇳 中文' },
  { code: 'ja', label: '🇯🇵 日本語' },
  { code: 'ko', label: '🇰🇷 한국어' },
];

/**
 * Claves anteriores a la migración 0081, que fusionó "cada servicio es su propia
 * categoría" en agrupaciones reales. Siguen apareciendo en filas sembradas por
 * scripts que iban detrás de la migración, y sin esto la tarjeta enseñaba
 * "late_checkout" tal cual. Etiquetar no es migrar: la fila se corrige cuando se
 * guarda desde el formulario, que ya sólo ofrece el vocabulario vigente.
 */
const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  late_checkout: 'Check-in / Check-out', early_checkin: 'Check-in / Check-out',
  cleaning: 'Servicios de la estancia', crib: 'Servicios de la estancia',
  transfer: 'Servicios de la estancia', parking: 'Servicios de la estancia',
  rental: 'Servicios de la estancia', welcome_pack: 'Bienvenida',
};

const categoryLabel = (key: string): string =>
  STORE_CATEGORIES.find(c => c.key === key)?.label
  || LEGACY_CATEGORY_LABELS[key]
  || key.replace(/_/g, ' ');

type Scope = 'platform' | 'agency' | 'apartment';

interface StoreItem {
  id: string;
  scope: Scope;
  can_edit: boolean;
  owner_type: string;
  agency_id: string | null;
  agency_name: string | null;
  apartment_id: string | null;
  apartment_name: string | null;
  /** En cuántos alojamientos lo ha ocultado su anfitrión (sólo platform/agency). */
  hidden_count: number;
  category: string;
  name: string;
  description: string;
  translations?: Record<string, { name?: string; description?: string }>;
  price_amount: number | null;
  price_currency: string;
  price_display: string | null;
  cover_image_url: string | null;
  contact_whatsapp: string | null;
  is_featured: boolean;
  is_active: boolean;
  order_index: number;
}

interface Apartment {
  id: string;
  name: string;
}

const MEDIA_BASE = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

const SCOPE_META: Record<Scope, { label: string; icon: JSX.Element; color: 'default' | 'primary' | 'secondary' }> = {
  platform: { label: 'Todas las guías', icon: <PublicIcon sx={{ fontSize: 15 }} />, color: 'secondary' },
  agency: { label: 'Todas mis propiedades', icon: <BusinessIcon sx={{ fontSize: 15 }} />, color: 'primary' },
  apartment: { label: 'Un solo alojamiento', icon: <ApartmentIcon sx={{ fontSize: 15 }} />, color: 'default' },
};

export default function GuideStorePage() {
  const { user, currentAgency } = useAuth();
  const isSuperAdmin = !!user?.is_superadmin;
  const agencyId: string | undefined = currentAgency?.id;
  const agencyName: string = currentAgency?.name || 'mi agencia';

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<StoreItem[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [formLang, setFormLang] = useState('es');
  const [formData, setFormData] = useState<
    Partial<StoreItem> & { scope: Scope; translations: Record<string, { name?: string; description?: string }> }
  >({ category: STORE_CATEGORIES[0].key, scope: 'agency', is_active: true, is_featured: false, translations: {} });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Una portada puede apuntar a un objeto de R2 que ya no está (la demo de The
  // Host Edition tiene las seis así: la fila se sembró, las imágenes nunca se
  // subieron). Distinguir "sin foto" de "foto rota" importa, porque la segunda
  // se arregla subiendo el fichero y la primera eligiéndolo.
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = agencyId ? `?agency_id=${encodeURIComponent(agencyId)}` : '';
      const [catalog, apts] = await Promise.all([
        apiClient.request(`/guide/admin/store-items${query}`),
        agencyId
          ? apiClient.request(`/guide/admin/apartments?agency_id=${encodeURIComponent(agencyId)}`)
          : Promise.resolve({ apartments: [] }),
      ]);
      setItems(catalog.items || []);
      setApartments(apts.apartments || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el catálogo');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => ({
    platform: items.filter(i => i.scope === 'platform'),
    agency: items.filter(i => i.scope === 'agency'),
    apartment: items.filter(i => i.scope === 'apartment'),
  }), [items]);

  const handleOpenDialog = (item?: StoreItem, presetScope?: Scope) => {
    setFormLang('es');
    if (item) {
      setEditingItem(item);
      // Precarga las traducciones que ya existan: si el backend no devolviera nada
      // para un idioma, dejarlo vacío aquí y guardar sobrescribiría ese idioma con
      // "" (saveTranslations no distingue "vacío a propósito" de "no lo he tocado").
      setFormData({ ...item, scope: item.scope, translations: { ...(item.translations || {}) } });
    } else {
      setEditingItem(null);
      setFormData({
        category: STORE_CATEGORIES[0].key,
        // El ámbito por defecto es el de agencia, que es el que casi siempre
        // quieres: un producto que se ofrece en todas las propiedades. Sin
        // agencia seleccionada sólo cabe el catálogo global (superadmin).
        scope: presetScope || (agencyId ? 'agency' : 'platform'),
        agency_id: agencyId || null,
        apartment_id: apartments[0]?.id || null,
        is_active: true,
        is_featured: false,
        translations: {},
      });
    }
    setOpenDialog(true);
  };

  const scopePayload = (scope: Scope) => ({
    scope,
    agency_id: scope === 'agency' ? agencyId : null,
    apartment_id: scope === 'apartment' ? formData.apartment_id : null,
  });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const scope = formData.scope;
      if (scope === 'apartment' && !formData.apartment_id) {
        throw new Error('Elige el alojamiento al que pertenece este producto.');
      }
      if (scope === 'agency' && !agencyId) {
        throw new Error('Selecciona una agencia arriba para crear un producto de todas sus propiedades.');
      }
      const payload = {
        ...scopePayload(scope),
        category: formData.category,
        price_amount:
          formData.price_amount === undefined || formData.price_amount === null || (formData.price_amount as any) === ''
            ? null
            : Number(formData.price_amount),
        cover_image_url: formData.cover_image_url || null,
        contact_whatsapp: formData.contact_whatsapp || null,
        is_featured: !!formData.is_featured,
        is_active: formData.is_active !== false,
        translations: formData.translations || {},
      };

      if (editingItem) {
        await apiClient.request(`/guide/admin/store-items/${editingItem.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiClient.request('/guide/admin/store-items', { method: 'POST', body: JSON.stringify(payload) });
      }
      setOpenDialog(false);
      await load();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  /**
   * El atajo que da sentido a toda la pantalla: subir un producto de un piso al
   * catálogo de la agencia. Es un PUT con scope, no un alta nueva — mover la
   * fila conserva sus traducciones (13 idiomas) y sus pedidos históricos, que es
   * justo lo que se perdería copiándolo.
   */
  const handlePromoteToAgency = async (item: StoreItem) => {
    if (!agencyId) return;
    const question =
      `¿Ofrecer "${item.name}" en TODAS las propiedades de ${agencyName}?\n\n` +
      'Deja de estar atado a un alojamiento y pasa a salir en la tienda de todos. ' +
      'Donde no aplique, se oculta desde la pestaña Tienda de ese alojamiento.';
    if (!window.confirm(question)) return;
    try {
      await apiClient.request(`/guide/admin/store-items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ scope: 'agency', agency_id: agencyId }),
      });
      setNotice(`"${item.name}" ya se ofrece en todas las propiedades de ${agencyName}.`);
      await load();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar el ámbito del producto');
    }
  };

  const handleDelete = async (item: StoreItem) => {
    const where =
      item.scope === 'platform' ? 'todas las guías'
        : item.scope === 'agency' ? `todas las propiedades de ${agencyName}`
          : item.apartment_name || 'su alojamiento';
    if (!window.confirm(`¿Desactivar "${item.name}"? Dejará de verse en ${where}.`)) return;
    try {
      await apiClient.request(`/guide/admin/store-items/${item.id}`, { method: 'DELETE' });
      await load();
    } catch (err: any) {
      setError(err.message || 'Error al desactivar el producto');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = localStorage.getItem('auth_token') || '';
      // Subida propia del catálogo — NO el /media/upload compartido de
      // workerMedia.js, que exige dish_id y devuelve 400 para cualquier cosa
      // del guidebook.
      const res = await fetch(`${MEDIA_BASE}/guide/admin/store-items/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || data.error);
      setFormData(prev => ({ ...prev, cover_image_url: data.url || `${MEDIA_BASE}/media/${data.r2_key}` }));
    } catch (err: any) {
      setError(err.message || 'Error al subir imagen');
    } finally {
      setUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  const renderCard = (item: StoreItem) => (
    <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', opacity: item.is_active ? 1 : 0.5 }}>
        <Box sx={{ position: 'relative', height: 140, bgcolor: 'action.hover' }}>
          {item.cover_image_url && !brokenImages[item.id] ? (
            <img
              src={item.cover_image_url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setBrokenImages(prev => ({ ...prev, [item.id]: true }))}
            />
          ) : (
            // Un producto sin foto sale en la TV y en la guía como un bloque de
            // color con el título encima. Es un aviso, no una decoración: es
            // exactamente lo que hace que una demo parezca a medias.
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.disabled', gap: 0.5, px: 1, textAlign: 'center' }}>
              <NoImageIcon />
              <Typography variant="caption">
                {item.cover_image_url ? 'La foto no carga (404)' : 'Sin foto'}
              </Typography>
            </Box>
          )}
          {item.can_edit && (
            <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
              <Tooltip title="Editar">
                <IconButton size="small" sx={{ bgcolor: 'rgba(255,255,255,0.9)' }} onClick={() => handleOpenDialog(item)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Desactivar">
                <IconButton size="small" sx={{ bgcolor: 'rgba(255,255,255,0.9)' }} color="error" onClick={() => handleDelete(item)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap title={item.name}>{item.name}</Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1, mt: 0.75 }}>
            <Chip size="small" label={categoryLabel(item.category)} />
            {item.scope === 'apartment' && item.apartment_name && (
              <Chip size="small" variant="outlined" icon={<ApartmentIcon sx={{ fontSize: 15 }} />} label={item.apartment_name} />
            )}
            {/* Un superadmin sin agencia seleccionada ve las de TODAS bajo la
                misma cabecera; sin este chip no hay forma de saber de quién es
                cada producto. */}
            {item.scope === 'agency' && item.agency_name && !agencyId && (
              <Chip size="small" variant="outlined" icon={<BusinessIcon sx={{ fontSize: 15 }} />} label={item.agency_name} />
            )}
            {/* !! y no la variable tal cual: D1 devuelve 0/1, y en React un 0
                no es "no pintes nada", es un cero pintado. Ese "0" suelto llevaba
                tiempo en las tarjetas del catálogo. */}
            {!!item.is_featured && <Chip size="small" color="warning" label="Destacado" />}
            {!item.is_active && <Chip size="small" label="Inactivo" />}
            {item.scope !== 'apartment' && item.hidden_count > 0 && (
              <Tooltip title="Alojamientos donde su anfitrión lo ha ocultado, desde la pestaña Tienda de cada uno">
                <Chip
                  size="small" variant="outlined" icon={<HiddenIcon sx={{ fontSize: 15 }} />}
                  label={`Oculto en ${item.hidden_count}`}
                />
              </Tooltip>
            )}
          </Box>
          {item.price_amount != null && (
            <Typography variant="subtitle1" fontWeight={700}>
              {Number(item.price_amount).toFixed(2)} {item.price_currency || 'EUR'}
            </Typography>
          )}
        </CardContent>
        {item.scope === 'apartment' && item.can_edit && agencyId && (
          <Box sx={{ px: 2, pb: 1.5 }}>
            <Button size="small" fullWidth variant="outlined" startIcon={<BusinessIcon />} onClick={() => handlePromoteToAgency(item)}>
              Ofrecer en todas
            </Button>
          </Box>
        )}
      </Card>
    </Grid>
  );

  const renderSection = (scope: Scope, title: string, help: string, addable: boolean) => {
    const list = groups[scope];
    return (
      <Box sx={{ mb: 5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
          <Chip size="small" color={SCOPE_META[scope].color} icon={SCOPE_META[scope].icon} label={SCOPE_META[scope].label} />
          <Typography variant="h6" fontWeight={700}>{title}</Typography>
          <Typography variant="body2" color="text.secondary">{list.length}</Typography>
          <Box sx={{ flexGrow: 1 }} />
          {addable && (
            <Button size="small" startIcon={<AddIcon />} onClick={() => handleOpenDialog(undefined, scope)}>
              Añadir aquí
            </Button>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{help}</Typography>
        <Divider sx={{ mb: 2 }} />
        {list.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Todavía no hay ningún producto en este ámbito.</Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>{list.map(renderCard)}</Grid>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 0 } }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <StoreIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>Catálogo de la Tienda</Typography>
            <Typography variant="body2" color="text.secondary">
              Todo lo que se puede vender en la guía y en la TV, agrupado por dónde se ofrece
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Añadir producto
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        La tienda que ve un huésped es la <strong>suma de los tres bloques de abajo</strong>. Un producto
        del ámbito «{agencyName}» se escribe una sola vez —también sus traducciones a los 13 idiomas— y
        sale en todas las propiedades; si en alguna no aplica, se oculta desde{' '}
        <strong>Apartamentos → ese alojamiento → Tienda</strong> sin duplicarlo ni borrarlo.
      </Alert>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setNotice(null)}>{notice}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <>
          {renderSection(
            'agency',
            agencyId ? `Catálogo de ${agencyName}` : 'Catálogos de agencia',
            agencyId
              ? 'Se ofrece en todas las propiedades de esta agencia. Es el sitio por defecto para un extra que repites en todos tus pisos.'
              : 'Productos que cada agencia ofrece en todas sus propiedades. Selecciona una agencia arriba para añadir o mover productos aquí.',
            !!agencyId,
          )}
          {renderSection(
            'apartment',
            'Solo en un alojamiento',
            'Excepciones reales: algo que únicamente existe en ese piso. Si acabas repitiéndolo, súbelo al catálogo de la agencia con «Ofrecer en todas».',
            apartments.length > 0,
          )}
          {renderSection(
            'platform',
            'Catálogo de VisualTaste',
            isSuperAdmin
              ? 'Sale en TODAS las guías de la plataforma, de cualquier agencia. Solo superadmin.'
              : 'Productos de VisualTaste que salen en tu tienda. No se pueden editar desde aquí.',
            isSuperAdmin,
          )}
        </>
      )}

      <Dialog open={openDialog} onClose={() => !saving && setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* El ámbito va ARRIBA del todo: es la decisión que cambia dónde se
                ve el producto, y la que antes no existía. */}
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>¿Dónde se ofrece?</InputLabel>
                <Select
                  value={formData.scope}
                  label="¿Dónde se ofrece?"
                  onChange={e => setFormData({ ...formData, scope: e.target.value as Scope })}
                >
                  {agencyId && <MenuItem value="agency">Todas las propiedades de {agencyName}</MenuItem>}
                  <MenuItem value="apartment" disabled={apartments.length === 0}>Solo en un alojamiento</MenuItem>
                  {isSuperAdmin && <MenuItem value="platform">Catálogo de VisualTaste (todas las guías)</MenuItem>}
                </Select>
              </FormControl>
            </Grid>
            {formData.scope === 'apartment' && (
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Alojamiento</InputLabel>
                  <Select
                    value={formData.apartment_id || ''}
                    label="Alojamiento"
                    onChange={e => setFormData({ ...formData, apartment_id: e.target.value })}
                  >
                    {apartments.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Categoría</InputLabel>
                <Select value={formData.category || ''} label="Categoría" onChange={e => setFormData({ ...formData, category: e.target.value })}>
                  {STORE_CATEGORIES.map(c => <MenuItem key={c.key} value={c.key}>{c.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Tabs
                value={formLang}
                onChange={(_, v) => setFormLang(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 1.5, minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
              >
                {LANGUAGES.map(lang => {
                  const hasContent = !!formData.translations?.[lang.code]?.name;
                  return (
                    <Tab
                      key={lang.code}
                      value={lang.code}
                      label={lang.label}
                      iconPosition="end"
                      icon={hasContent ? <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} /> : undefined}
                      sx={{ fontWeight: 500, fontSize: '0.8125rem' }}
                    />
                  );
                })}
              </Tabs>
              <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <TextField
                  fullWidth size="small" sx={{ mb: 1.5 }}
                  label={formLang === 'es' ? 'Nombre (obligatorio)' : 'Nombre'}
                  value={formData.translations?.[formLang]?.name || ''}
                  onChange={e => setFormData({
                    ...formData, translations: { ...formData.translations, [formLang]: { ...formData.translations?.[formLang], name: e.target.value } }
                  })}
                />
                <TextField
                  fullWidth size="small" multiline rows={2}
                  label="Descripción"
                  value={formData.translations?.[formLang]?.description || ''}
                  onChange={e => setFormData({
                    ...formData, translations: { ...formData.translations, [formLang]: { ...formData.translations?.[formLang], description: e.target.value } }
                  })}
                />
              </Box>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="number" label="Precio (EUR)" value={formData.price_amount ?? ''} onChange={e => setFormData({ ...formData, price_amount: e.target.value as any })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="WhatsApp de contacto" placeholder="+34600000000" value={formData.contact_whatsapp || ''} onChange={e => setFormData({ ...formData, contact_whatsapp: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {formData.cover_image_url && <img src={formData.cover_image_url} alt="" style={{ height: 60, borderRadius: 4 }} />}
                <Button variant="outlined" component="label" disabled={uploading}>
                  {uploading ? 'Subiendo...' : 'Subir imagen'}
                  <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                </Button>
                {!formData.cover_image_url && (
                  <Typography variant="caption" color="text.secondary">
                    Sin foto, la tarjeta sale como un bloque de color en la guía y en la TV.
                  </Typography>
                )}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={!!formData.is_featured} onChange={e => setFormData({ ...formData, is_featured: e.target.checked })} />}
                label="Destacar en la tienda"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !formData.translations?.es?.name}>
            {saving ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
