// src/pages/guide/GuideCategoriesPage.tsx
// Imágenes por defecto del catálogo global de categorías de info (migración
// 0083): guide_info_categories.image_r2_key nace NULL para las 58 categorías.
// Esta página es donde el superadmin sube esa foto compartida por TODOS los
// apartamentos. Cada anfitrión sigue pudiendo subir su propia foto por bloque
// desde GuideApartmentDetail — esa foto de apartamento gana siempre sobre la
// de aquí (ver el comentario de category_image_url en workerGuide.js). Solo
// superadmin, igual que GuideStorePage.tsx (catálogo global de Tienda).
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import {
  Box, Typography, Paper, Alert, Button, CircularProgress, Grid,
  Card, CardContent, IconButton, Tooltip,
} from '@mui/material';
import {
  Collections as CollectionsIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
} from '@mui/icons-material';

interface InfoCategory {
  key: string;
  group_key: string;
  icon_name: string;
  color: string;
  image_r2_key: string | null;
  order_index: number;
  name: string;
}

// Renders a guide_info_categories.icon_name (Material Symbols) straight from
// the catalog — same helper as GuideApartmentDetail.tsx's category picker.
function CategoryIcon({ name, color, size = 22 }: { name?: string | null; color?: string | null; size?: number }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{ fontSize: size, color: color || 'inherit', fontVariationSettings: "'FILL' 1" }}
    >
      {name || 'info'}
    </span>
  );
}

// Mismo orden/etiquetas que CATEGORY_GROUP_LABELS en GuideApartmentDetail.tsx
// — mantener sincronizadas si cambia migration 0083.
const CATEGORY_GROUP_LABELS: Record<string, string> = {
  arrival: 'Llegada y salida',
  connectivity: 'Conectividad y ocio',
  comfort: 'Clima y confort',
  appliances: 'Electrodomésticos',
  house: 'La casa',
  outdoor: 'Exterior y extras',
  safety: 'Seguridad y ayuda',
  nearby: 'Servicios de la zona',
  hotel: 'Hotel',
  other: 'Otro',
};
const GROUP_ORDER = Object.keys(CATEGORY_GROUP_LABELS);

const MEDIA_BASE = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

export default function GuideCategoriesPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<InfoCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.request('/guide/admin/info-categories');
      setCategories(res.categories || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el catálogo de categorías');
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

  const handleUpload = async (key: string, file: File) => {
    setUploadingKey(key);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch(`${MEDIA_BASE}/guide/admin/info-categories/${key}/media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || data.error);
      setCategories(prev => prev.map(c => c.key === key ? { ...c, image_r2_key: data.r2_key } : c));
    } catch (err: any) {
      setError(err.message || 'Error al subir la imagen');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleRemove = async (key: string) => {
    if (!window.confirm('¿Quitar la imagen por defecto de esta categoría? Los apartamentos sin foto propia volverán a mostrar icono + color.')) return;
    setError(null);
    try {
      await apiClient.request(`/guide/admin/info-categories/${key}/media`, { method: 'DELETE' });
      setCategories(prev => prev.map(c => c.key === key ? { ...c, image_r2_key: null } : c));
    } catch (err: any) {
      setError(err.message || 'Error al quitar la imagen');
    }
  };

  const byGroup: Record<string, InfoCategory[]> = {};
  for (const c of categories) {
    (byGroup[c.group_key] ||= []).push(c);
  }
  const withImage = categories.filter(c => c.image_r2_key).length;

  return (
    <Box sx={{ p: { xs: 2, md: 0 } }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <CollectionsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight={700}>Imágenes de categorías</Typography>
          <Typography variant="body2" color="text.secondary">
            Foto por defecto de cada categoría, visible en TODOS los apartamentos que no suban la suya propia (Superadmin)
            {!loading && ` · ${withImage}/${categories.length} con imagen`}
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        GROUP_ORDER.filter(g => byGroup[g]?.length).map(group => (
          <Box key={group} sx={{ mb: 4 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              {CATEGORY_GROUP_LABELS[group]}
            </Typography>
            <Grid container spacing={2}>
              {byGroup[group].map(cat => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={cat.key}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <Box sx={{ position: 'relative', height: 110, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {cat.image_r2_key ? (
                        <img
                          src={`${MEDIA_BASE}/media/${cat.image_r2_key}`}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <CategoryIcon name={cat.icon_name} color={cat.color} size={36} />
                      )}
                      {cat.image_r2_key && (
                        <Tooltip title="Quitar imagen por defecto">
                          <IconButton
                            size="small"
                            sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'rgba(255,255,255,0.9)' }}
                            onClick={() => handleRemove(cat.key)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                    <CardContent sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                        <CategoryIcon name={cat.icon_name} color={cat.color} size={16} />
                        <Typography variant="body2" fontWeight={600} noWrap title={cat.name}>{cat.name}</Typography>
                      </Box>
                      <Button
                        fullWidth size="small" variant="outlined" component="label"
                        disabled={uploadingKey === cat.key}
                        startIcon={uploadingKey === cat.key ? <CircularProgress size={14} /> : <ImageIcon fontSize="small" />}
                      >
                        {uploadingKey === cat.key ? 'Subiendo...' : cat.image_r2_key ? 'Cambiar' : 'Subir imagen'}
                        <input
                          type="file" hidden accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(cat.key, file);
                            if (e.target) e.target.value = '';
                          }}
                        />
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))
      )}

      {!loading && categories.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No se ha podido cargar el catálogo de categorías.</Typography>
        </Paper>
      )}
    </Box>
  );
}
