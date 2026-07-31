// src/pages/guide/GuideStorePage.tsx
// Catálogo global de la Tienda (owner_type='platform'): productos de VisualTaste
// visibles en TODAS las guías, junto a los propios de cada anfitrión. Solo
// superadmin — es el slot reservado que un anfitrión no puede tocar ni borrar
// (ver migrations/0080_guide_store.sql).
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import {
  Box, Typography, Paper, Alert, Button, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, InputLabel, FormControl, Grid,
  Card, CardContent, IconButton, Chip, Switch, FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Storefront as StoreIcon,
} from '@mui/icons-material';

const STORE_CATEGORIES = [
  { key: 'local_product', label: 'Producto local' },
  { key: 'welcome_pack', label: 'Pack de bienvenida' },
  { key: 'custom', label: 'Personalizado' },
];

interface StoreItem {
  id: string;
  category: string;
  price_amount: number | null;
  price_currency: string;
  price_display: string | null;
  cover_image_url: string | null;
  contact_whatsapp: string | null;
  is_featured: boolean;
  is_active: boolean;
  order_index: number;
}

const MEDIA_BASE = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

export default function GuideStorePage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<StoreItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [formData, setFormData] = useState<Partial<StoreItem> & { name_es?: string; name_en?: string; description_es?: string; description_en?: string }>({
    category: STORE_CATEGORIES[0].key, is_active: true, is_featured: false,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.request('/guide/admin/store-items?owner_type=platform');
      setItems(res.items || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el catálogo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.is_superadmin) load();
  }, [user]);

  if (!user?.is_superadmin) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ maxWidth: 500, mx: 'auto' }}>
          No tienes permisos de superadmin para acceder a esta página.
        </Alert>
      </Box>
    );
  }

  const handleOpenDialog = (item?: StoreItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({ ...item });
    } else {
      setEditingItem(null);
      setFormData({ category: STORE_CATEGORIES[0].key, is_active: true, is_featured: false });
    }
    setOpenDialog(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        category: formData.category,
        price_amount: formData.price_amount === undefined || formData.price_amount === null || (formData.price_amount as any) === ''
          ? null : Number(formData.price_amount),
        cover_image_url: formData.cover_image_url || null,
        contact_whatsapp: formData.contact_whatsapp || null,
        is_featured: !!formData.is_featured,
        is_active: formData.is_active !== false,
        translations: {
          es: { name: formData.name_es || '', description: formData.description_es || '' },
          en: { name: formData.name_en || '', description: formData.description_en || '' },
        },
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

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('¿Desactivar este producto del catálogo global? Dejará de verse en todas las guías.')) return;
    try {
      await apiClient.request(`/guide/admin/store-items/${itemId}`, { method: 'DELETE' });
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
      const res = await fetch(`${MEDIA_BASE}/media/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || data.error);
      setFormData(prev => ({ ...prev, cover_image_url: data.url || `${MEDIA_BASE}/media/${data.r2_key}` }));
    } catch (err: any) {
      alert(err.message || 'Error al subir imagen');
    } finally {
      setUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 0 } }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <StoreIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>Catálogo de la Tienda</Typography>
            <Typography variant="body2" color="text.secondary">
              Productos de VisualTaste visibles en la tienda de TODOS los alojamientos (Superadmin)
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Añadir producto
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {items.map(item => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', opacity: item.is_active ? 1 : 0.5 }}>
                <Box sx={{ position: 'relative', height: 140, bgcolor: 'action.hover' }}>
                  {item.cover_image_url && (
                    <img src={item.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
                    <IconButton size="small" sx={{ bgcolor: 'rgba(255,255,255,0.9)' }} onClick={() => handleOpenDialog(item)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" sx={{ bgcolor: 'rgba(255,255,255,0.9)' }} color="error" onClick={() => handleDelete(item.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Chip size="small" label={STORE_CATEGORIES.find(c => c.key === item.category)?.label || item.category} />
                    {item.is_featured && <Chip size="small" color="warning" label="Destacado" />}
                    {!item.is_active && <Chip size="small" label="Inactivo" />}
                  </Box>
                  {item.price_amount != null && (
                    <Typography variant="subtitle1" fontWeight={700}>{Number(item.price_amount).toFixed(2)} {item.price_currency || 'EUR'}</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
          {items.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">Todavía no hay ningún producto en el catálogo global.</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      <Dialog open={openDialog} onClose={() => !saving && setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Editar producto' : 'Nuevo producto del catálogo'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Categoría</InputLabel>
                <Select value={formData.category || ''} label="Categoría" onChange={e => setFormData({ ...formData, category: e.target.value })}>
                  {STORE_CATEGORIES.map(c => <MenuItem key={c.key} value={c.key}>{c.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Nombre (ES)" value={formData.name_es || ''} onChange={e => setFormData({ ...formData, name_es: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Nombre (EN)" value={formData.name_en || ''} onChange={e => setFormData({ ...formData, name_en: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" multiline rows={2} label="Descripción (ES)" value={formData.description_es || ''} onChange={e => setFormData({ ...formData, description_es: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" multiline rows={2} label="Descripción (EN)" value={formData.description_en || ''} onChange={e => setFormData({ ...formData, description_en: e.target.value })} />
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
          <Button variant="contained" onClick={handleSave} disabled={saving || !formData.name_es}>
            {saving ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
