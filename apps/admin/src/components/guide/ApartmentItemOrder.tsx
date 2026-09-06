// src/components/guide/ApartmentItemOrder.tsx
// Orden y visibilidad, POR APARTAMENTO, de los tres catálogos que el alojamiento
// no posee: experiencias y restaurantes (son de la zona) y productos de la
// tienda (los 'platform' son de VisualTaste).
//
// Qué resuelve: hasta ahora el anfitrión tragaba con el orden global y con el
// catálogo entero. Ni podía subir la experiencia con la que tiene trato, ni
// quitar de su guía un producto que no quiere vender.
//
// La lista llega de GET /apartments/:id/orderable YA en el orden en que la va a
// ver el huésped (misma cláusula SQL que workerGuide.js), así que lo que se ve
// aquí es literalmente lo que sale en la guía y en la TV.
//
// Flechas y no drag&drop a propósito: es el mismo patrón que ya usan los
// bloques de información y los POIs del apartamento en esta misma pantalla
// (@dnd-kit sólo se usa en el constructor de landings).
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Stack, IconButton, Chip, CircularProgress, Alert,
  Tooltip, Button,
} from '@mui/material';
import {
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Visibility as VisibleIcon,
  VisibilityOff as HiddenIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';
import { apiClient } from '../../lib/apiClient';

export type OrderableItemType = 'experience' | 'store_item' | 'restaurant';

interface OrderableItem {
  id: string;
  name: string;
  subtitle?: string | null;
  cover_image_url?: string | null;
  is_featured?: number | boolean | null;
  is_promoted?: number | boolean | null;
  order_override?: number | null;
  is_hidden?: number | boolean | null;
}

interface Props {
  apartmentId: string;
  itemType: OrderableItemType;
  /** Texto que explica QUÉ lista es esta, en la voz del anfitrión. */
  description: string;
  /** Aviso cuando la lista está vacía. */
  emptyLabel: string;
  /** El orden cambió: la vista previa del apartamento debe recargarse. */
  onSaved?: () => void;
}

const isOn = (v: number | boolean | null | undefined): boolean => v === true || v === 1;

export default function ApartmentItemOrder({
  apartmentId, itemType, description, emptyLabel, onSaved,
}: Props) {
  const [items, setItems] = useState<OrderableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.request(
        `/guide/admin/apartments/${apartmentId}/orderable?item_type=${itemType}`
      );
      setItems(res.items || []);
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar la lista');
    } finally {
      setLoading(false);
    }
  }, [apartmentId, itemType]);

  useEffect(() => { load(); }, [load]);

  /**
   * Se persiste SIEMPRE la lista completa, no sólo el par que se ha movido.
   * Después del primer guardado todos los ítems tienen posición explícita, así
   * que no queda ninguna mezcla ambigua de "unos colocados y otros heredando el
   * orden global" que pudiera reordenarse sola al cambiar el catálogo de zona.
   */
  const persist = async (next: OrderableItem[]) => {
    setItems(next); // optimista
    setSaving(true);
    setError(null);
    try {
      await apiClient.request(`/guide/admin/apartments/${apartmentId}/item-order`, {
        method: 'PUT',
        body: JSON.stringify({
          item_type: itemType,
          order: next.map(i => i.id),
          hidden: next.filter(i => isOn(i.is_hidden)).map(i => i.id),
        }),
      });
      onSaved?.();
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el orden');
      await load(); // revertir a lo que hay de verdad en el servidor
    } finally {
      setSaving(false);
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
  };

  const toggleHidden = (id: string) => {
    persist(items.map(i => (i.id === id ? { ...i, is_hidden: isOn(i.is_hidden) ? 0 : 1 } : i)));
  };

  /** Vuelve al orden global de la zona: se borran todos los overrides. */
  const reset = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiClient.request(`/guide/admin/apartments/${apartmentId}/item-order`, {
        method: 'PUT',
        body: JSON.stringify({ item_type: itemType, order: [], hidden: [] }),
      });
      onSaved?.();
      await load();
    } catch (err: any) {
      setError(err.message || 'No se pudo restablecer el orden');
    } finally {
      setSaving(false);
    }
  };

  const hasOverrides = items.some(i => i.order_override != null || isOn(i.is_hidden));

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {description}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {items.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5, border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
          <Typography color="text.secondary">{emptyLabel}</Typography>
        </Box>
      ) : (
        <>
          <Stack spacing={1}>
            {items.map((item, idx) => (
              <Paper
                key={item.id}
                elevation={0}
                sx={{
                  p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider',
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  opacity: isOn(item.is_hidden) ? 0.45 : 1,
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ width: 22, textAlign: 'right' }}>
                  {idx + 1}
                </Typography>

                {item.cover_image_url ? (
                  <Box sx={{ width: 44, height: 44, borderRadius: 1.5, overflow: 'hidden', flexShrink: 0 }}>
                    <img src={item.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </Box>
                ) : (
                  <Box sx={{ width: 44, height: 44, borderRadius: 1.5, bgcolor: 'action.hover', flexShrink: 0 }} />
                )}

                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                    <Typography fontWeight={600} noWrap title={item.name}>{item.name}</Typography>
                    {/* Promocionado va primero porque manda sobre el destacado:
                        verlos separados evita prometer un puesto que ya está
                        vendido a otro. */}
                    {isOn(item.is_promoted) && <Chip size="small" color="secondary" label="Promocionado" />}
                    {isOn(item.is_featured) && <Chip size="small" color="warning" label="Destacado" />}
                  </Box>
                  {item.subtitle && (
                    <Typography variant="caption" color="text.secondary" noWrap>{item.subtitle}</Typography>
                  )}
                </Box>

                <Tooltip title={isOn(item.is_hidden) ? 'Mostrar en esta guía' : 'Ocultar solo en esta guía'}>
                  <span>
                    <IconButton size="small" disabled={saving} onClick={() => toggleHidden(item.id)}>
                      {isOn(item.is_hidden) ? <HiddenIcon fontSize="small" /> : <VisibleIcon fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>
                <span>
                  <IconButton size="small" disabled={idx === 0 || saving} onClick={() => move(idx, -1)}>
                    <ArrowUpIcon fontSize="small" />
                  </IconButton>
                </span>
                <span>
                  <IconButton size="small" disabled={idx === items.length - 1 || saving} onClick={() => move(idx, 1)}>
                    <ArrowDownIcon fontSize="small" />
                  </IconButton>
                </span>
              </Paper>
            ))}
          </Stack>

          {hasOverrides && (
            <Button
              size="small" startIcon={<ResetIcon />} sx={{ mt: 2 }}
              disabled={saving} onClick={reset}
            >
              Volver al orden global
            </Button>
          )}
        </>
      )}
    </Box>
  );
}
