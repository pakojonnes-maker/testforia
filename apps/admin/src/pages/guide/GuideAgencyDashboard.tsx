// src/pages/guide/GuideAgencyDashboard.tsx
// Agency dashboard with minimal stats: QR scans, avg duration, restaurant/experience clicks
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import {
  Box, Typography, Grid, Card, CardContent, Paper,
  CircularProgress, Chip, Divider, Alert
} from '@mui/material';
import {
  QrCode2 as QrIcon,
  Timer as TimerIcon,
  Restaurant as RestaurantIcon,
  Explore as ExploreIcon,
  Language as LanguageIcon,
  TrendingUp as TrendingIcon,
  Apartment as ApartmentIcon,
} from '@mui/icons-material';

interface StatsData {
  qr_scans: number;
  avg_duration: number;
  restaurant_clicks: number;
  experience_clicks: number;
  by_language: Array<{ lang: string; count: number }>;
  top_restaurants: Array<{ id: string; name: string; clicks: number }>;
}

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
  it: '🇮🇹 Italiano', pt: '🇵🇹 Português', nl: '🇳🇱 Nederlands', ru: '🇷🇺 Русский',
  zh: '🇨🇳 中文', ja: '🇯🇵 日本語', ko: '🇰🇷 한국어', ar: '🇸🇦 العربية'
};

export default function GuideAgencyDashboard() {
  const { currentAgency, adminMode } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (adminMode !== 'agency') return;

    const loadStats = async () => {
      if (!currentAgency?.id) return;
      setLoading(true);
      try {
        const response = await apiClient.request(`/guide/admin/stats?agency_id=${currentAgency.id}`);
        if (response.success) {
          setStats(response.stats);
        }
      } catch (err: any) {
        setError(err.message || 'Error loading stats');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [currentAgency?.id, adminMode]);

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

  return (
    <Box sx={{ p: { xs: 2, md: 0 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <ApartmentIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>
              {currentAgency.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Panel de Guidebook — Últimos 30 días
            </Typography>
          </Box>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : stats ? (
        <>
          {/* Main KPI Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<QrIcon />}
                title="Escaneos QR"
                value={stats.qr_scans.toLocaleString()}
                subtitle="Total de visitas al guidebook"
                color="#2196F3"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<TimerIcon />}
                title="Tiempo Medio"
                value={formatDuration(stats.avg_duration)}
                subtitle="Duración de cada visita"
                color="#4CAF50"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<RestaurantIcon />}
                title="Clicks Restaurantes"
                value={stats.restaurant_clicks.toLocaleString()}
                subtitle="Interés en restaurantes"
                color="#FF9800"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<ExploreIcon />}
                title="Clicks Experiencias"
                value={stats.experience_clicks.toLocaleString()}
                subtitle="Interés en actividades"
                color="#9C27B0"
              />
            </Grid>
          </Grid>

          {/* Secondary insights */}
          <Grid container spacing={3}>
            {/* Language breakdown */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LanguageIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>Idiomas de tus Huéspedes</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {stats.by_language.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {stats.by_language.map(({ lang, count }) => (
                      <Chip
                        key={lang}
                        label={`${LANG_NAMES[lang] || lang}  ·  ${count}`}
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

            {/* Top restaurants */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TrendingIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>Top Restaurantes</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {stats.top_restaurants.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {stats.top_restaurants.map((r, i) => (
                      <Box key={r.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 2, bgcolor: i === 0 ? 'action.hover' : 'transparent' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', minWidth: 24 }}>
                            #{i + 1}
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>{r.name}</Typography>
                        </Box>
                        <Chip label={`${r.clicks} clicks`} size="small" color="primary" variant="outlined" />
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Cuando los huéspedes hagan click en restaurantes, los más populares aparecerán aquí.
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      ) : null}
    </Box>
  );
}
