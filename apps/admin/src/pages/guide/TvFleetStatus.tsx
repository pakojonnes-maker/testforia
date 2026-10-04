// src/pages/guide/TvFleetStatus.tsx
// «Estado de las pantallas»: todas las TVs de un vistazo, sin ir piso a piso.
// Cuenta cuántas hay en cada estado y lista primero las que hay que revisar.
// El estado sale de la última señal (ver tvHealth.ts).
import { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Chip, CircularProgress, Alert, Button, Tooltip, ButtonBase,
} from '@mui/material';
import { FiberManualRecord as DotIcon } from '@mui/icons-material';
import { apiClient } from '../../lib/apiClient';
import { formatLastSeen, tvHealth, TV_HEALTH, TV_HEALTH_ORDER, type TvHealth } from './tvHealth';

interface FleetDevice {
  id: string;
  pairing_code: string;
  device_label: string | null;
  is_active: boolean | number;
  paired_at: string | null;
  last_seen_at: string | null;
  apartment_id: string;
  apartment_name: string;
  agency_id: string | null;
  agency_name: string | null;
}

/** Filas visibles antes de «Ver todas»: las que hay que revisar salen siempre arriba. */
const COLLAPSED_ROWS = 6;

interface TvFleetStatusProps {
  /** Cambia cuando la página empareja o desactiva una TV, para recargar. */
  refreshKey: number;
  /** Pisos que la página sabe abrir; una fila de otro piso no es clicable. */
  apartmentIds: string[];
  onSelectApartment: (apartmentId: string) => void;
}

export function TvFleetStatus({ refreshKey, apartmentIds, onSelectApartment }: TvFleetStatusProps) {
  const [devices, setDevices] = useState<FleetDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    apiClient.request('/guide/admin/tv/fleet')
      .then(res => { if (!cancelled) setDevices(res.devices || []); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar el estado de las TVs'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const rows = useMemo(() => {
    const now = Date.now();
    return devices
      .map(d => ({ ...d, health: tvHealth(d, now) }))
      .sort((a, b) => TV_HEALTH_ORDER.indexOf(a.health) - TV_HEALTH_ORDER.indexOf(b.health)
        || (a.last_seen_at || '').localeCompare(b.last_seen_at || ''));
  }, [devices]);

  const counts = useMemo(() => {
    const c: Record<TvHealth, number> = { lost: 0, never: 0, off: 0, online: 0, disabled: 0 };
    rows.forEach(r => { c[r.health] += 1; });
    return c;
  }, [rows]);

  // El nombre de la agencia solo aporta si la lista mezcla varias (superadmin).
  const multiAgency = new Set(rows.map(r => r.agency_id)).size > 1;
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);

  return (
    <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1 }}>
        <Typography variant="h6" fontWeight={600}>Estado de las pantallas</Typography>
        {rows.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {TV_HEALTH_ORDER.filter(h => counts[h] > 0).map(h => (
              <Tooltip key={h} title={TV_HEALTH[h].hint}>
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<DotIcon sx={{ fontSize: 12 }} />}
                  label={`${counts[h]} ${TV_HEALTH[h].label.toLowerCase()}`}
                  // El Chip pinta su icono con su propio color: hay que ganarle desde aquí.
                  sx={{ fontWeight: 600, '& .MuiChip-icon': { color: TV_HEALTH[h].color } }}
                />
              </Tooltip>
            ))}
          </Box>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        Una TV encendida da señal cada 30 minutos. «Sin señal» es que lleva más de 3 días callada:
        puede estar desenchufada, sin WiFi o sin la app.
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
      ) : error ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Todavía no hay ninguna TV emparejada.</Typography>
      ) : (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            {visible.map((d, i) => {
              const meta = TV_HEALTH[d.health];
              const canOpen = apartmentIds.includes(d.apartment_id);
              return (
                <ButtonBase
                  key={d.id}
                  disabled={!canOpen}
                  onClick={() => onSelectApartment(d.apartment_id)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, textAlign: 'left',
                    justifyContent: 'flex-start', borderTop: i === 0 ? 'none' : '1px solid', borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Tooltip title={meta.hint}>
                    <DotIcon sx={{ fontSize: 14, color: meta.color, flex: 'none' }} />
                  </Tooltip>
                  {/* Ancho base 0: sin él, el nombre entero (sin saltos) fija el ancho mínimo de la página en móvil. */}
                  <Box sx={{ flex: '1 1 0', width: 0, minWidth: 0 }}>
                    {/* El piso primero: es lo que identifica la tele (casi todos tienen una). */}
                    <Typography variant="subtitle2" fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>
                      {d.apartment_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                      {d.device_label || 'TV sin nombre'}{multiAgency ? ` · ${d.agency_name || 'Sin agencia'}` : ''}
                    </Typography>
                  </Box>
                  <Chip label={d.pairing_code} size="small" sx={{ fontFamily: 'monospace', fontWeight: 700, display: { xs: 'none', sm: 'inline-flex' } }} />
                  <Box sx={{ textAlign: 'right', flex: 'none', minWidth: 120 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ color: d.health === 'off' || d.health === 'disabled' ? 'text.secondary' : meta.color }}>
                      {meta.label}
                    </Typography>
                    {d.health !== 'never' && (
                      <Typography variant="caption" color="text.secondary">{formatLastSeen(d.last_seen_at)}</Typography>
                    )}
                  </Box>
                </ButtonBase>
              );
            })}
          </Box>
          {rows.length > COLLAPSED_ROWS && (
            <Button size="small" onClick={() => setExpanded(v => !v)} sx={{ mt: 1 }}>
              {expanded ? 'Ver menos' : `Ver las ${rows.length}`}
            </Button>
          )}
        </>
      )}
    </Paper>
  );
}
