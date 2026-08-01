// src/pages/guide/GuideTvPage.tsx
// Fleet-level management of VisualTaste TV devices for the current agency:
// pick an apartment, pair/manage its TVs, see its activity. Previously buried
// as a tab inside GuideApartmentDetail; moved to its own top-level section so
// managing TVs doesn't require opening a specific apartment's settings first.
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import {
  Box, Typography, Paper, Button, IconButton, TextField, Chip,
  CircularProgress, Alert, Tooltip, Card, CardContent,
  Switch, FormControl, InputLabel, Select, MenuItem,
  ToggleButtonGroup, ToggleButton, Stack, alpha, LinearProgress,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title as ChartTitle, Tooltip as ChartTooltip, Legend, Filler,
} from 'chart.js';
import {
  Add as AddIcon,
  Wifi as WifiIcon,
  Download as DownloadIcon,
  Tv as TvIcon,
  ContentCopy as ContentCopyIcon,
  FiberManualRecord as DotIcon,
  Visibility as ImpressionIcon,
  Explore as ExploreIcon,
  Insights as InsightsIcon,
  DevicesOther as DevicesIcon,
  Apartment as ApartmentIcon,
} from '@mui/icons-material';
import QRCodeGenerator, { type QRCodeHandle } from '../../components/QRCodeGenerator';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTitle, ChartTooltip, Legend, Filler);

interface ApartmentOption {
  id: string;
  name: string;
  slug: string;
}

interface TvDevice {
  id: string;
  pairing_code: string;
  device_label: string | null;
  is_active: boolean;
  paired_at: string | null;
  last_seen_at: string | null;
}

interface TvDailyRow {
  day: string;
  impression: number;
  screen_view: number;
  wifi_reveal: number;
  poi_select: number;
  menu_qr_shown: number;
  booking_qr_shown: number;
}

interface TvStats {
  range: string;
  totals: Record<string, number>;
  byScreen: { screen: string; count: number }[];
  daily: TvDailyRow[];
  devices: { total: number; active: number };
}

type TvRange = '7d' | '30d' | '90d' | 'all';

const TV_RANGE_OPTIONS: { value: TvRange; label: string }[] = [
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
  { value: 'all', label: 'Todo' },
];

const TV_SCREEN_LABELS: Record<string, string> = {
  home: 'Inicio',
  wifi: 'WiFi',
  guide: 'Guía',
  nearby: 'Alrededores',
  info: 'Información',
};

const TV_CSV_COLUMNS: { key: keyof Omit<TvDailyRow, 'day'>; label: string }[] = [
  { key: 'impression', label: 'Impresiones' },
  { key: 'wifi_reveal', label: 'WiFi mostrado' },
  { key: 'poi_select', label: 'Localizaciones vistas' },
  { key: 'menu_qr_shown', label: 'QR carta mostrado' },
  { key: 'booking_qr_shown', label: 'QR reserva mostrado' },
  { key: 'screen_view', label: 'Vistas de pantalla' },
];

export default function GuideTvPage() {
  const { currentAgency } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [apartments, setApartments] = useState<ApartmentOption[]>([]);
  const [apartmentsLoading, setApartmentsLoading] = useState(true);
  const [aptId, setAptId] = useState<string>(searchParams.get('apartment') || '');

  const [tvDevices, setTvDevices] = useState<TvDevice[]>([]);
  const [tvStats, setTvStats] = useState<TvStats | null>(null);
  const [tvLoading, setTvLoading] = useState(false);
  const [tvStatsLoading, setTvStatsLoading] = useState(false);
  const [tvError, setTvError] = useState<string | null>(null);
  const [tvRange, setTvRange] = useState<TvRange>('30d');
  const [pairing, setPairing] = useState(false);
  const [deviceLabelInput, setDeviceLabelInput] = useState('');
  const [newDevice, setNewDevice] = useState<{ pairingCode: string; deviceLabel: string | null } | null>(null);
  const tvQrRef = useRef<QRCodeHandle>(null);

  // Carga la lista de apartamentos de la agencia para el selector.
  useEffect(() => {
    if (!currentAgency?.id) return;
    setApartmentsLoading(true);
    apiClient.request(`/guide/admin/apartments?agency_id=${currentAgency.id}`)
      .then(res => {
        const list: ApartmentOption[] = res.apartments || [];
        setApartments(list);
        setAptId(prev => {
          if (prev && list.some(a => a.id === prev)) return prev;
          return list[0]?.id || '';
        });
      })
      .catch(err => console.error('Error loading apartments:', err))
      .finally(() => setApartmentsLoading(false));
  }, [currentAgency?.id]);

  // Mantiene ?apartment= en la URL sincronizado con la selección (deep-linkable).
  useEffect(() => {
    if (!aptId) return;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('apartment', aptId);
      return next;
    }, { replace: true });
  }, [aptId]);

  const loadTvDevices = async (apartmentId: string) => {
    setTvLoading(true);
    setTvError(null);
    try {
      const devicesRes = await apiClient.request(`/guide/admin/tv/devices?apartment_id=${apartmentId}`);
      setTvDevices(devicesRes.devices || []);
    } catch (err: any) {
      setTvError(err.message || 'Error al cargar las TVs');
    } finally {
      setTvLoading(false);
    }
  };

  const loadTvStats = async (apartmentId: string, range: TvRange) => {
    setTvStatsLoading(true);
    try {
      const statsRes = await apiClient.request(`/guide/admin/tv/stats/${apartmentId}?range=${range}`);
      setTvStats(statsRes);
    } catch (err: any) {
      setTvStats(null);
      setTvError(err.message || 'Error al cargar las estadísticas');
    } finally {
      setTvStatsLoading(false);
    }
  };

  useEffect(() => {
    if (!aptId) return;
    setNewDevice(null);
    setDeviceLabelInput('');
    loadTvDevices(aptId);
    loadTvStats(aptId, tvRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aptId]);

  useEffect(() => {
    if (!aptId) return;
    loadTvStats(aptId, tvRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tvRange]);

  const handlePairDevice = async () => {
    if (!aptId) return;
    setPairing(true);
    setTvError(null);
    try {
      const res = await apiClient.request('/guide/admin/tv/devices', {
        method: 'POST',
        body: JSON.stringify({ apartmentId: aptId, deviceLabel: deviceLabelInput || undefined }),
      });
      setNewDevice({ pairingCode: res.device.pairingCode, deviceLabel: res.device.deviceLabel });
      setDeviceLabelInput('');
      await Promise.all([loadTvDevices(aptId), loadTvStats(aptId, tvRange)]);
    } catch (err: any) {
      setTvError(err.message || 'Error al emparejar la TV');
    } finally {
      setPairing(false);
    }
  };

  const copyPairingCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
  };

  const handleToggleDevice = async (deviceId: string, nextActive: boolean) => {
    setTvError(null);
    setTvDevices(prev => prev.map(d => d.id === deviceId ? { ...d, is_active: nextActive } : d));
    try {
      await apiClient.request(`/guide/admin/tv/devices/${deviceId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextActive }),
      });
    } catch (err: any) {
      setTvError(err.message || 'Error al actualizar la TV');
      setTvDevices(prev => prev.map(d => d.id === deviceId ? { ...d, is_active: !nextActive } : d)); // revert
    }
  };

  const isRecentlySeen = (lastSeenAt: string | null) => {
    if (!lastSeenAt) return false;
    return Date.now() - new Date(lastSeenAt).getTime() < 15 * 60 * 1000; // 15 min
  };

  const formatRelativeTime = (iso: string | null) => {
    if (!iso) return 'Nunca conectada';
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours} h`;
    return `Hace ${Math.floor(hours / 24)} d`;
  };

  // Exporta la serie diaria a CSV (extracción de datos para el anfitrión/agencia).
  const exportTvCsv = () => {
    if (!tvStats || tvStats.daily.length === 0) return;
    const header = ['Fecha', ...TV_CSV_COLUMNS.map(c => c.label)];
    const rows = tvStats.daily.map(d => [d.day, ...TV_CSV_COLUMNS.map(c => d[c.key] ?? 0)]);
    const total = ['TOTAL', ...TV_CSV_COLUMNS.map(c => tvStats.daily.reduce((s, d) => s + (d[c.key] ?? 0), 0))];
    const csv = [header, ...rows, total].map(r => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tv-stats-${apartments.find(a => a.id === aptId)?.slug || aptId}-${tvStats.range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderTvStats = () => {
    const header = (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h6" fontWeight={600}>Actividad de las TVs</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <ToggleButtonGroup
            value={tvRange} exclusive size="small"
            onChange={(_, v) => v && setTvRange(v)}
          >
            {TV_RANGE_OPTIONS.map(o => (
              <ToggleButton key={o.value} value={o.value} sx={{ px: 1.5, py: 0.4, textTransform: 'none', fontWeight: 600 }}>
                {o.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Button
            size="small" variant="outlined" startIcon={<DownloadIcon />}
            disabled={!tvStats || tvStats.daily.length === 0}
            onClick={exportTvCsv}
          >
            CSV
          </Button>
        </Stack>
      </Box>
    );

    let body: React.ReactNode;
    if (tvStatsLoading) {
      body = <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>;
    } else if (!tvStats) {
      body = <Typography variant="body2" color="text.secondary">No se pudieron cargar las estadísticas.</Typography>;
    } else {
      const t = tvStats.totals;
      const impressions = t.impression || 0;
      const wifi = t.wifi_reveal || 0;
      const guideInteractions = (t.poi_select || 0) + (t.menu_qr_shown || 0) + (t.booking_qr_shown || 0);
      const wifiRate = impressions > 0 ? Math.round((wifi / impressions) * 100) : 0;
      const hasActivity = impressions > 0 || wifi > 0 || guideInteractions > 0;

      const cards = [
        { icon: <ImpressionIcon />, color: '#128099', value: impressions, label: 'Impresiones', sub: 'veces que se encendió la pantalla' },
        { icon: <WifiIcon />, color: '#2e7d32', value: wifi, label: 'WiFi consultado', sub: 'huéspedes que vieron la contraseña' },
        { icon: <ExploreIcon />, color: '#e07a5f', value: guideInteractions, label: 'Interacción con la guía', sub: 'recomendaciones y QRs abiertos' },
        { icon: <DevicesIcon />, color: '#6a1b9a', value: tvStats.devices.active, label: 'TVs activas', sub: `de ${tvStats.devices.total} emparejadas` },
      ];

      const chartLabels = tvStats.daily.map(d => new Date(d.day).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }));
      const chartData = {
        labels: chartLabels,
        datasets: [
          {
            label: 'Impresiones', data: tvStats.daily.map(d => d.impression),
            borderColor: '#128099', backgroundColor: 'rgba(18,128,153,0.12)', fill: true,
            borderWidth: 2.5, tension: 0.35, pointRadius: tvStats.daily.length > 20 ? 0 : 3, pointHoverRadius: 5,
          },
          {
            label: 'WiFi consultado', data: tvStats.daily.map(d => d.wifi_reveal),
            borderColor: '#2e7d32', backgroundColor: 'transparent',
            borderWidth: 2, tension: 0.35, pointRadius: tvStats.daily.length > 20 ? 0 : 3, pointHoverRadius: 5,
          },
        ],
      };
      const chartOptions = {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
          legend: { display: true, position: 'top' as const, labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } },
          tooltip: { cornerRadius: 10, padding: 10 },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 }, autoSkip: true, maxTicksLimit: 10 } },
          y: { beginAtZero: true, ticks: { color: '#94a3b8', font: { size: 10 }, precision: 0 }, grid: { color: 'rgba(148,163,184,0.1)' } },
        },
      };

      const screenTotal = tvStats.byScreen.reduce((s, x) => s + x.count, 0);

      body = (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 2, mb: 3 }}>
            {cards.map(c => (
              <Box key={c.label} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(c.color, 0.12), color: c.color, display: 'flex' }}>{c.icon}</Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h4" fontWeight={800} lineHeight={1.1}>{c.value.toLocaleString('es-ES')}</Typography>
                  <Typography variant="subtitle2" fontWeight={600}>{c.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{c.sub}</Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {impressions > 0 && (
            <Alert icon={<InsightsIcon />} severity="success" sx={{ mb: 3, borderRadius: 2, bgcolor: 'rgba(46,125,50,0.08)' }}>
              <strong>{wifiRate}%</strong> de las veces que se encendió la pantalla, el huésped consultó el WiFi
              {guideInteractions > 0 && <> · <strong>{guideInteractions}</strong> interacciones con tus recomendaciones</>}.
            </Alert>
          )}

          {!hasActivity ? (
            <Box sx={{ textAlign: 'center', py: 5, border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
              <ImpressionIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">Todavía no hay actividad registrada en este periodo.</Typography>
            </Box>
          ) : (
            <>
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
                Evolución diaria
              </Typography>
              <Box sx={{ height: 240, mb: 3 }}>
                <Line data={chartData} options={chartOptions} />
              </Box>

              {screenTotal > 0 && (
                <>
                  <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1.5 }}>
                    Pantallas más vistas
                  </Typography>
                  <Stack spacing={1.2}>
                    {tvStats.byScreen.map(s => {
                      const pct = Math.round((s.count / screenTotal) * 100);
                      return (
                        <Box key={s.screen}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                            <Typography variant="body2" fontWeight={600}>{TV_SCREEN_LABELS[s.screen] || s.screen}</Typography>
                            <Typography variant="caption" color="text.secondary">{s.count} · {pct}%</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 5 }} />
                        </Box>
                      );
                    })}
                  </Stack>
                </>
              )}
            </>
          )}
        </>
      );
    }

    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        {header}
        {body}
      </Paper>
    );
  };

  const selectedApartment = apartments.find(a => a.id === aptId);

  if (!currentAgency) {
    return (
      <Alert severity="warning" sx={{ m: 3 }}>
        No tienes agencia seleccionada.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header + selector de apartamento */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TvIcon color="primary" /> Pantalla TV
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Empareja Android TVs y revisa su actividad, apartamento a apartamento.
          </Typography>
        </Box>

        {apartmentsLoading ? (
          <CircularProgress size={24} />
        ) : apartments.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>Crea primero un apartamento.</Alert>
        ) : (
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel>Apartamento</InputLabel>
            <Select
              value={aptId}
              label="Apartamento"
              onChange={(e) => setAptId(e.target.value as string)}
            >
              {apartments.map(a => (
                <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {!aptId ? null : (
        <>
          {selectedApartment && (
            <Button
              size="small"
              startIcon={<ApartmentIcon fontSize="small" />}
              onClick={() => navigate(`/guide/apartments/${selectedApartment.id}`)}
              sx={{ mb: 2 }}
            >
              Ver ficha de {selectedApartment.name}
            </Button>
          )}

          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            Empareja una Android TV con este apartamento para mostrar la pantalla de bienvenida
            (WiFi, guía y alrededores). El código se introduce una sola vez en la app de la TV.
          </Alert>
          {tvError && <Alert severity="error" sx={{ mb: 2 }}>{tvError}</Alert>}

          {/* Emparejar nueva TV */}
          <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TvIcon color="primary" /> Emparejar una TV nueva
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 560 }}>
              Genera un código y ábrelo en la app de VisualTaste TV instalada en el televisor
              (o en <code>tv.visualtastes.com/#CODIGO</code> durante las pruebas).
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                label="Etiqueta (opcional)" size="small" sx={{ minWidth: 220 }}
                placeholder="Ej: TV Salón"
                value={deviceLabelInput}
                onChange={(e) => setDeviceLabelInput(e.target.value)}
              />
              <Button
                variant="contained"
                startIcon={pairing ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}
                disabled={pairing}
                onClick={handlePairDevice}
              >
                {pairing ? 'Generando...' : 'Generar código'}
              </Button>
            </Box>

            {newDevice && (
              <Box sx={{ mt: 3, p: 3, borderRadius: 3, border: '1px dashed', borderColor: 'primary.main', bgcolor: 'rgba(18,128,153,0.06)', display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                <QRCodeGenerator
                  ref={tvQrRef}
                  data={`https://tv.visualtastes.com/#${newDevice.pairingCode}`}
                  size={120}
                  dotsOptions={{ color: '#128099', type: 'rounded' }}
                  cornersSquareOptions={{ type: 'extra-rounded' }}
                  imageOptions={{ margin: 0 }}
                />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    Código de emparejamiento{newDevice.deviceLabel ? ` · ${newDevice.deviceLabel}` : ''}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h4" fontWeight={800} letterSpacing={4} fontFamily="monospace">
                      {newDevice.pairingCode}
                    </Typography>
                    <Tooltip title="Copiar código">
                      <IconButton size="small" onClick={() => copyPairingCode(newDevice.pairingCode)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            )}
          </Paper>

          {/* TVs emparejadas */}
          <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>TVs emparejadas</Typography>
            {tvLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : tvDevices.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
                <TvIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Todavía no hay ninguna TV emparejada.</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {tvDevices.map(d => (
                  <Card key={d.id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, opacity: d.is_active ? 1 : 0.55 }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '12px 16px !important' }}>
                      <DotIcon sx={{ fontSize: 14, color: isRecentlySeen(d.last_seen_at) ? 'success.main' : 'text.disabled' }} />
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {d.device_label || 'TV sin nombre'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Última conexión: {formatRelativeTime(d.last_seen_at)}
                        </Typography>
                      </Box>
                      <Chip label={d.pairing_code} size="small" sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
                      <Tooltip title={d.is_active ? 'Desactivar TV' : 'Activar TV'}>
                        <Switch
                          size="small"
                          checked={d.is_active}
                          onChange={(e) => handleToggleDevice(d.id, e.target.checked)}
                        />
                      </Tooltip>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>

          {/* Estadísticas */}
          {renderTvStats()}
        </>
      )}
    </Box>
  );
}
