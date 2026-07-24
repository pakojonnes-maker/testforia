import { useState, useEffect, useMemo, Fragment } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import {
  Box, Typography, Grid, Card, CardContent, Paper,
  CircularProgress, Chip, Divider, Alert, Button, ToggleButtonGroup, ToggleButton,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  People as PeopleIcon,
  Timer as TimerIcon,
  Visibility as VisibilityIcon,
  TouchApp as TouchAppIcon,
  TrendingUp as TrendingUpIcon,
  Language as LanguageIcon,
  Apartment as ApartmentIcon,
  LocalActivity as LocalActivityIcon,
  Devices as DevicesIcon,
  PublicOutlined as PublicIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
  History as HistoryIcon,
  Repeat as RepeatIcon,
  PersonOutline as PersonOutlineIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';

interface StatsData {
  total_sessions: number;
  unique_devices: number;
  avg_duration_seconds: number;
  total_intents: number;
  conversion_rate: number;
  sessions_by_day: Array<{ date: string; count: number }>;
  languages: Array<{ code: string; count: number }>;
  top_experiences: Array<{ id: string; name: string; clicks: number }>;
  apartments_activity: Array<{ id: string; name: string; unique_devices_today: number; last_session_at: string | null }>;
}

interface SessionLogRow {
  id: string;
  apartment_id: string;
  apartment_name: string;
  device_type: string | null;
  os_name: string | null;
  browser: string | null;
  country: string | null;
  city: string | null;
  language_code: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  device_fingerprint: string | null;
  intents_count: number;
  sections_count: number;
}

interface TimelineEvent {
  type: 'intent' | 'section';
  target_type?: string;
  target_name?: string;
  action?: string;
  section?: string;
  duration_seconds?: number;
  at: string;
}

// A "visitor" groups every session that shares the same device_fingerprint within an
// apartment — this is what lets the agency tell "same guest checked the guide 5 times"
// apart from "5 different guests checked it once each". Sessions with no fingerprint
// (older data, or a fingerprint that failed to compute) are never merged with anything
// else — each becomes its own singleton group — since we can't safely assume they're
// the same person.
interface VisitorGroup {
  key: string;
  apartment_id: string;
  apartment_name: string;
  device_fingerprint: string | null;
  sessionIds: string[];
  visitCount: number;
  firstSeen: string;
  lastSeen: string;
  totalDurationSeconds: number;
  totalIntents: number;
  totalSections: number;
  latest: SessionLogRow;
}

function groupSessionsIntoVisitors(rows: SessionLogRow[]): VisitorGroup[] {
  const map = new Map<string, VisitorGroup>();
  for (const row of rows) {
    const visitorKey = row.device_fingerprint || `anon:${row.id}`;
    const key = `${row.apartment_id}::${visitorKey}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        apartment_id: row.apartment_id,
        apartment_name: row.apartment_name,
        device_fingerprint: row.device_fingerprint,
        sessionIds: [row.id],
        visitCount: 1,
        firstSeen: row.started_at,
        lastSeen: row.started_at,
        totalDurationSeconds: row.duration_seconds ?? 0,
        totalIntents: row.intents_count,
        totalSections: row.sections_count,
        latest: row,
      });
    } else {
      existing.sessionIds.push(row.id);
      existing.visitCount += 1;
      existing.totalDurationSeconds += row.duration_seconds ?? 0;
      existing.totalIntents += row.intents_count;
      existing.totalSections += row.sections_count;
      if (new Date(row.started_at).getTime() < new Date(existing.firstSeen).getTime()) existing.firstSeen = row.started_at;
      if (new Date(row.started_at).getTime() > new Date(existing.lastSeen).getTime()) {
        existing.lastSeen = row.started_at;
        existing.latest = row;
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
}

const SECTION_LABELS: Record<string, string> = {
  info: 'Información del alojamiento', discover: 'Descubre la zona', restaurants: 'Restaurantes', services: 'Servicios',
};

function StatCard({ icon, title, value, subtitle, color }: {
  icon: React.ReactNode; title: string; value: string | number; subtitle?: string; color: string;
}) {
  return (
    <Card elevation={0} sx={{
      background: `linear-gradient(135deg, ${color}15, ${color}08)`,
      border: `1px solid ${color}25`,
      borderRadius: 3,
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${color}20` }
    }}>
      <CardContent sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Box sx={{
            p: 1, borderRadius: 2,
            background: `${color}20`,
            color: color,
            display: 'flex', alignItems: 'center'
          }}>
            {icon}
          </Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" fontWeight={700} sx={{ color }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

const LANG_NAMES: Record<string, string> = {
  es: '🇪🇸 Español', en: '🇬🇧 English', fr: '🇫🇷 Français', de: '🇩🇪 Deutsch',
  it: '🇮🇹 Italiano', pt: '🇵🇹 Português', ca: '🇪🇸 Català', ar: '🇦🇪 العربية',
  ru: '🇷🇺 Русский', uk: '🇺🇦 Українська', zh: '🇨🇳 中文', ja: '🇯🇵 日本語',
  ko: '🇰🇷 한국어'
};

export default function GuideAgencyDashboard() {
  const { currentAgency, adminMode } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');

  const [sessions, setSessions] = useState<SessionLogRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailVisitor, setDetailVisitor] = useState<VisitorGroup | null>(null);
  const [detailTimeline, setDetailTimeline] = useState<Array<TimelineEvent & { sessionStartedAt: string }>>([]);

  const visitors = useMemo(() => groupSessionsIntoVisitors(sessions), [sessions]);
  const visitorsByApartment = useMemo(() => {
    const map = new Map<string, { apartment_name: string; totalSessions: number; visitors: VisitorGroup[] }>();
    for (const v of visitors) {
      const entry = map.get(v.apartment_id) || { apartment_name: v.apartment_name, totalSessions: 0, visitors: [] };
      entry.totalSessions += v.visitCount;
      entry.visitors.push(v);
      map.set(v.apartment_id, entry);
    }
    return Array.from(map.entries()).sort((a, b) =>
      new Date(b[1].visitors[0].lastSeen).getTime() - new Date(a[1].visitors[0].lastSeen).getTime()
    );
  }, [visitors]);

  useEffect(() => {
    if (adminMode !== 'agency') return;

    const loadStats = async () => {
      if (!currentAgency?.id) return;
      setLoading(true);
      try {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - parseInt(dateRange, 10));

        const response = await apiClient.request(`/guide/admin/stats/dashboard?agency_id=${currentAgency.id}&from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}`);
        if (response.success && response.dashboard) {
          setStats(response.dashboard);
        } else {
          // If the endpoint doesn't exist yet, we can mock it based on prompt requirements, but we will try the endpoint.
          setError('Could not load stats');
        }
      } catch (err: any) {
        setError(err.message || 'Error loading stats');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [currentAgency?.id, adminMode, dateRange]);

  useEffect(() => {
    if (adminMode !== 'agency') return;

    const loadSessions = async () => {
      if (!currentAgency?.id) return;
      setSessionsLoading(true);
      setSessionsError(null);
      try {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - parseInt(dateRange, 10));
        const response = await apiClient.request(`/guide/admin/stats/sessions?agency_id=${currentAgency.id}&from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}&limit=200`);
        if (response.success) setSessions(response.sessions || []);
      } catch (err: any) {
        setSessionsError(err.message || 'Error al cargar el registro de sesiones');
      } finally {
        setSessionsLoading(false);
      }
    };

    loadSessions();
  }, [currentAgency?.id, adminMode, dateRange]);

  const handleOpenVisitorDetail = async (group: VisitorGroup) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailVisitor(group);
    setDetailTimeline([]);
    try {
      const results = await Promise.all(
        group.sessionIds.map(id => apiClient.request(`/guide/admin/stats/sessions/${id}`).catch(() => null))
      );
      const merged: Array<TimelineEvent & { sessionStartedAt: string }> = [];
      for (const r of results) {
        if (r?.success) {
          for (const ev of (r.timeline || [])) merged.push({ ...ev, sessionStartedAt: r.session.started_at });
        }
      }
      merged.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
      setDetailTimeline(merged);
    } catch (err) {
      console.error('Error loading visitor detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDeviceLabel = (row: SessionLogRow) => {
    const parts = [row.device_type, row.os_name, row.browser].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : 'Desconocido';
  };

  const formatLocation = (row: SessionLogRow) => {
    const parts = [row.city, row.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Ubicación desconocida';
  };

  if (adminMode !== 'agency') {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="info" sx={{ maxWidth: 500, mx: 'auto' }}>
          Cambia al modo <strong>Agencia</strong> en la barra lateral para ver el dashboard del Guidebook.
        </Alert>
      </Box>
    );
  }

  if (!currentAgency) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="warning" sx={{ maxWidth: 500, mx: 'auto' }}>
          No tienes acceso a ninguna agencia. Contacta con el administrador.
        </Alert>
      </Box>
    );
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const safeStats = stats ? {
    total_sessions: stats.total_sessions ?? 0,
    unique_devices: stats.unique_devices ?? 0,
    avg_duration_seconds: stats.avg_duration_seconds ?? 0,
    total_intents: stats.total_intents ?? 0,
    conversion_rate: stats.conversion_rate ? (stats.conversion_rate * 100).toFixed(1) : '0',
    sessions_by_day: stats.sessions_by_day ?? [],
    languages: stats.languages ?? [],
    top_experiences: stats.top_experiences ?? [],
    apartments_activity: stats.apartments_activity ?? [],
  } : null;

  return (
    <Box sx={{ p: { xs: 2, md: 0 } }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ApartmentIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>
              {currentAgency.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Panel de Guidebook
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup
            value={dateRange}
            exclusive
            onChange={(_, newValue) => newValue && setDateRange(newValue)}
            size="small"
          >
            <ToggleButton value="7">7 días</ToggleButton>
            <ToggleButton value="30">30 días</ToggleButton>
            <ToggleButton value="90">90 días</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" color="primary" component={Link} to="/guide/apartments">
            Ir a Apartamentos
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : safeStats ? (
        <>
          {/* Main KPI Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <StatCard
                icon={<PeopleIcon />}
                title="Visitantes Únicos"
                value={safeStats.unique_devices.toLocaleString()}
                color="#1E3A5F"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <StatCard
                icon={<VisibilityIcon />}
                title="Sesiones Totales"
                value={safeStats.total_sessions.toLocaleString()}
                color="#C96D4B"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <StatCard
                icon={<TimerIcon />}
                title="Tiempo Medio"
                value={formatDuration(safeStats.avg_duration_seconds)}
                color="#6B7D54"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <StatCard
                icon={<TouchAppIcon />}
                title="Clicks (Intents)"
                value={safeStats.total_intents.toLocaleString()}
                color="#D4A853"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <StatCard
                icon={<TrendingUpIcon />}
                title="Tasa de Conversión"
                value={`${safeStats.conversion_rate}%`}
                color="#9C27B0"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2} />
          </Grid>

          {/* Secondary insights */}
          <Grid container spacing={3}>
            {/* Language breakdown */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LanguageIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>Idiomas de tus Huéspedes</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {safeStats.languages && safeStats.languages.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {safeStats.languages.map(({ code, count }) => (
                      <Chip
                        key={code}
                        label={`${LANG_NAMES[code] || code}  ·  ${count}`}
                        variant="outlined"
                        sx={{ fontWeight: 500, borderRadius: 2 }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Aún no hay datos de idioma. Los huéspedes que escaneen tu QR aparecerán aquí.
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Top Experiences */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LocalActivityIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>Top Experiencias</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {safeStats.top_experiences && safeStats.top_experiences.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {safeStats.top_experiences.map((exp, i) => (
                      <Box key={exp.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 2, bgcolor: i === 0 ? 'action.hover' : 'transparent' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', minWidth: 24 }}>
                            #{i + 1}
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>{exp.name}</Typography>
                        </Box>
                        <Chip label={`${exp.clicks} clicks`} size="small" color="primary" variant="outlined" />
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Cuando los huéspedes hagan click en experiencias, las más populares aparecerán aquí.
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Apartments Activity */}
          <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PeopleIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" fontWeight={600}>Personas en el Apartamento (Hoy)</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Dispositivos únicos detectados en las últimas 24h — una estimación del número de huéspedes activos.
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {safeStats.apartments_activity && safeStats.apartments_activity.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {safeStats.apartments_activity.map(apt => (
                  <Box key={apt.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 2, mb: 0.5, bgcolor: apt.unique_devices_today > 0 ? '#e8f5e9' : 'transparent', '&:hover': { bgcolor: 'action.hover' } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: apt.unique_devices_today > 0 ? 'success.main' : 'text.disabled' }} />
                      <Typography variant="body2" fontWeight={500}>{apt.name}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip label={`${apt.unique_devices_today} dispositivo${apt.unique_devices_today !== 1 ? 's' : ''}`} size="small" color={apt.unique_devices_today > 0 ? 'primary' : 'default'} variant="outlined" />
                      {apt.last_session_at && (
                        <Typography variant="caption" color="text.secondary">
                          {new Date(apt.last_session_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No hay actividad reciente en los apartamentos.
              </Typography>
            )}
          </Paper>

          {/* Detailed Session Log */}
          <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <HistoryIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" fontWeight={600}>Registro de Sesiones</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Agrupado por visitante único, no por sesión — para que 5 aperturas del mismo huésped no se cuenten como 5 personas distintas.
              Haz click en una fila para ver el detalle completo de esas visitas.
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {sessionsError && <Alert severity="error" sx={{ mb: 2 }}>{sessionsError}</Alert>}

            {sessionsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : sessions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay sesiones registradas en este periodo todavía.
              </Typography>
            ) : (
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Visitante</TableCell>
                      <TableCell>Dispositivo</TableCell>
                      <TableCell>Ubicación</TableCell>
                      <TableCell>Idioma</TableCell>
                      <TableCell>Última visita</TableCell>
                      <TableCell align="right">Duración total</TableCell>
                      <TableCell align="right">Interacciones</TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visitorsByApartment.map(([aptId, apt]) => (
                      <Fragment key={aptId}>
                        <TableRow>
                          <TableCell colSpan={8} sx={{ bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider', py: 1 }}>
                            <Typography variant="body2" fontWeight={700}>
                              {apt.apartment_name}
                              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 500 }}>
                                {apt.totalSessions} sesión{apt.totalSessions !== 1 ? 'es' : ''} · {apt.visitors.length} visitante{apt.visitors.length !== 1 ? 's' : ''} único{apt.visitors.length !== 1 ? 's' : ''}
                              </Typography>
                            </Typography>
                          </TableCell>
                        </TableRow>
                        {apt.visitors.map(group => (
                          <TableRow
                            key={group.key}
                            hover
                            onClick={() => handleOpenVisitorDetail(group)}
                            sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                          >
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                {group.visitCount > 1 ? (
                                  <Chip icon={<RepeatIcon sx={{ fontSize: 14 }} />} label={`Recurrente ×${group.visitCount}`} size="small" color="warning" sx={{ fontWeight: 700 }} />
                                ) : (
                                  <Chip icon={<PersonOutlineIcon sx={{ fontSize: 14 }} />} label="Primera visita" size="small" variant="outlined" />
                                )}
                                {!group.device_fingerprint && (
                                  <Tooltip title="No se pudo identificar de forma única este dispositivo; podría ser el mismo huésped que otra sesión anónima.">
                                    <HelpOutlineIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                                  </Tooltip>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <DevicesIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="caption">{formatDeviceLabel(group.latest)}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PublicIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="caption">{formatLocation(group.latest)}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">{LANG_NAMES[group.latest.language_code || ''] || group.latest.language_code || '—'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {new Date(group.lastSeen).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                              {group.visitCount > 1 && (
                                <Typography variant="caption" color="text.secondary">
                                  1ª visita: {new Date(group.firstSeen).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">{formatDuration(group.totalDurationSeconds)}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip label={group.totalIntents + group.totalSections} size="small" color={(group.totalIntents + group.totalSections) > 0 ? 'primary' : 'default'} variant="outlined" />
                            </TableCell>
                            <TableCell align="right">
                              <IconButton size="small">
                                <ChevronRightIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </>
      ) : null}

      {/* Visitor Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {detailVisitor && detailVisitor.visitCount > 1 ? 'Visitante Recurrente' : 'Detalle de la Visita'}
            </Typography>
            {detailVisitor && (
              <Typography variant="body2" color="text.secondary">
                {detailVisitor.apartment_name} · {detailVisitor.visitCount} visita{detailVisitor.visitCount !== 1 ? 's' : ''}
                {detailVisitor.visitCount > 1 && ` (${new Date(detailVisitor.firstSeen).toLocaleDateString('es-ES')} — ${new Date(detailVisitor.lastSeen).toLocaleDateString('es-ES')})`}
              </Typography>
            )}
          </Box>
          <IconButton onClick={() => setDetailOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : detailVisitor ? (
            <Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                <Chip icon={<DevicesIcon />} label={formatDeviceLabel(detailVisitor.latest)} size="small" variant="outlined" />
                <Chip icon={<PublicIcon />} label={formatLocation(detailVisitor.latest)} size="small" variant="outlined" />
                <Chip label={LANG_NAMES[detailVisitor.latest.language_code || ''] || detailVisitor.latest.language_code || '—'} size="small" variant="outlined" />
                <Chip icon={<TimerIcon />} label={`${formatDuration(detailVisitor.totalDurationSeconds)} total`} size="small" variant="outlined" />
              </Box>

              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                Cronología {detailVisitor.visitCount > 1 ? 'combinada de todas sus visitas' : 'de la visita'}
              </Typography>
              {detailTimeline.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No se registraron interacciones (solo abrió la guía).
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {detailTimeline.map((event, i) => {
                    const showDivider = i === 0 || event.sessionStartedAt !== detailTimeline[i - 1].sessionStartedAt;
                    return (
                      <Box key={i}>
                        {showDivider && detailVisitor.visitCount > 1 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: i > 0 ? 1 : 0, mb: 1, fontWeight: 700 }}>
                            — Visita del {new Date(event.sessionStartedAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} —
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                          <Box sx={{
                            mt: 0.3, width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: event.type === 'intent' ? 'primary.main' : 'action.hover',
                            color: event.type === 'intent' ? 'white' : 'text.secondary',
                          }}>
                            {event.type === 'intent' ? <TouchAppIcon sx={{ fontSize: 15 }} /> : <VisibilityIcon sx={{ fontSize: 15 }} />}
                          </Box>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2" fontWeight={500}>
                              {event.type === 'intent'
                                ? `${event.action === 'click' ? 'Clic en' : event.action} ${event.target_type === 'restaurant' ? 'restaurante' : 'experiencia'}: ${event.target_name}`
                                : `Vio la sección "${SECTION_LABELS[event.section || ''] || event.section}"${event.duration_seconds ? ` (${formatDuration(event.duration_seconds)})` : ''}`
                              }
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(event.at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
