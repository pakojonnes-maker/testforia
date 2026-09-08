// src/pages/guide/TvTileImages.tsx
// Imágenes de las cuatro teselas del mosaico de VisualTaste TV y del fondo de
// pantalla, por apartamento.
//
// Las cinco de serie viven DENTRO del APK de la TV (apps/tv/src/assets/tiles):
// la pantalla arranca con su aspecto definitivo aunque el WiFi del apartamento
// no levante, que es justo el momento en que menos se puede contar con él. Este
// panel sólo guarda las EXCEPCIONES — el anfitrión que quiere su propia foto —
// y "Restaurar" borra la fila para volver a la de serie.
//
// Las miniaturas de aquí son copias de esos mismos webp en assets/tv/. Están
// duplicadas a propósito: cada app se construye y se despliega por su cuenta
// (Pages vs APK) y el admin no debe depender del dominio de la TV para pintar
// una vista previa. Son 432 KB entre las cinco; si alguna cambia, hay que
// copiarla a los dos sitios.
import { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, CircularProgress, Alert, Card, Chip, Stack,
} from '@mui/material';
import {
  Image as ImageIcon,
  RestartAlt as RestoreIcon,
  Wallpaper as WallpaperIcon,
} from '@mui/icons-material';
import { apiClient } from '../../lib/apiClient';

import eatDefault from '../../assets/tv/eat.webp';
import doDefault from '../../assets/tv/do.webp';
import storeDefault from '../../assets/tv/store.webp';
import infoDefault from '../../assets/tv/info.webp';
import backgroundDefault from '../../assets/tv/background.webp';

const MEDIA_BASE = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

/** Mismas claves que TileSlot en apps/tv y que el CHECK de guide_tv_tile_images. */
type TileSlot = 'eat' | 'do' | 'store' | 'info' | 'background';

interface SlotSpec {
  slot: TileSlot;
  title: string;
  hint: string;
  defaultImage: string;
  /** El fondo se ve entero y detrás de todo; las teselas son cajas recortadas. */
  wide?: boolean;
}

const SLOTS: SlotSpec[] = [
  { slot: 'eat', title: 'Dónde comer', hint: 'Tesela grande del mosaico. Es la que mira primero el huésped.', defaultImage: eatDefault },
  { slot: 'do', title: 'Qué hacer', hint: 'Columna derecha, alta y estrecha: funcionan mejor las fotos con horizonte.', defaultImage: doDefault },
  { slot: 'store', title: 'Tienda', hint: 'Tesela ancha y baja. Evita fotos con el motivo en el centro.', defaultImage: storeDefault },
  { slot: 'info', title: 'Normas de la casa', hint: 'Tesela pequeña, arriba a la izquierda, con el texto encima.', defaultImage: infoDefault },
  { slot: 'background', title: 'Fondo de pantalla', hint: 'Detrás de todo y muy atenuado: da ambiente, no protagonismo. Mejor una foto sin motivo central.', defaultImage: backgroundDefault, wide: true },
];

type TileMap = Partial<Record<TileSlot, string>>;

export function TvTileImages({ apartmentId }: { apartmentId: string }) {
  const [tiles, setTiles] = useState<TileMap>({});
  const [loading, setLoading] = useState(true);
  const [busySlot, setBusySlot] = useState<TileSlot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.request(`/guide/admin/tv/tiles?apartment_id=${encodeURIComponent(apartmentId)}`);
      setTiles(res.tiles || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las imágenes');
    } finally {
      setLoading(false);
    }
  }, [apartmentId]);

  useEffect(() => { load(); }, [load]);

  // Sube a R2 por el endpoint del guidebook (sólo devuelve la URL, no crea fila
  // en guide_apartment_media) y persiste la ranura. El /media/upload compartido
  // de workerMedia.js NO sirve: exige un dish_id — ver GuideApartmentDetail.
  const save = async (slot: TileSlot, file: File | null) => {
    setBusySlot(slot);
    setError(null);
    try {
      let imageUrl: string | null = null;

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${MEDIA_BASE}/guide/admin/apartments/${apartmentId}/media`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
          body: formData,
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.message || result.error || 'Error al subir la imagen');
        imageUrl = result.url || `${MEDIA_BASE}/media/${result.r2_key}`;
      }

      await apiClient.request('/guide/admin/tv/tiles', {
        method: 'PUT',
        body: JSON.stringify({ apartmentId, slot, imageUrl }),
      });

      setTiles(prev => {
        const next = { ...prev };
        if (imageUrl) next[slot] = imageUrl;
        else delete next[slot];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la imagen');
    } finally {
      setBusySlot(null);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WallpaperIcon color="primary" /> Imágenes de la pantalla
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 640 }}>
        Los botones del mosaico y el fondo ya vienen con una imagen de serie incluida en la app
        de la TV. Sube una propia sólo si quieres cambiarla: se verá en el siguiente encendido
        del televisor.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } }}>
          {SLOTS.map(spec => {
            const override = tiles[spec.slot];
            const busy = busySlot === spec.slot;
            return (
              <Card
                key={spec.slot}
                elevation={0}
                sx={{
                  borderRadius: 2, overflow: 'hidden',
                  border: '1px solid', borderColor: override ? 'primary.main' : 'divider',
                  gridColumn: spec.wide ? { lg: 'span 2' } : undefined,
                }}
              >
                <Box sx={{ position: 'relative', aspectRatio: '16 / 9', bgcolor: 'action.hover' }}>
                  <Box
                    component="img"
                    src={override || spec.defaultImage}
                    alt=""
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <Chip
                    size="small"
                    label={override ? 'Personalizada' : 'De serie'}
                    color={override ? 'primary' : 'default'}
                    sx={{ position: 'absolute', top: 8, left: 8, bgcolor: override ? undefined : 'background.paper' }}
                  />
                  {busy && (
                    <Box sx={{
                      position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                      bgcolor: 'rgba(0,0,0,0.45)',
                    }}>
                      <CircularProgress size={28} sx={{ color: '#fff' }} />
                    </Box>
                  )}
                </Box>

                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700}>{spec.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, minHeight: 32 }}>
                    {spec.hint}
                  </Typography>

                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small" variant="outlined" component="label" disabled={busy}
                      startIcon={<ImageIcon fontSize="small" />}
                    >
                      {override ? 'Cambiar' : 'Subir'}
                      <input
                        type="file" hidden accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          // Se limpia el input para que volver a elegir el MISMO
                          // fichero (tras un fallo de subida) dispare el change.
                          e.target.value = '';
                          if (file) save(spec.slot, file);
                        }}
                      />
                    </Button>
                    {override && (
                      <Button
                        size="small" color="inherit" disabled={busy}
                        startIcon={<RestoreIcon fontSize="small" />}
                        onClick={() => save(spec.slot, null)}
                      >
                        Restaurar
                      </Button>
                    )}
                  </Stack>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}
    </Paper>
  );
}
