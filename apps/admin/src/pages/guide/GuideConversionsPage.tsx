// src/pages/guide/GuideConversionsPage.tsx
// Embudo real guía → restaurante, SOLO superadmin: clic (guide_affiliate_intents)
// → aterrizado (sessions.referral_apartment_id) → convertido (además
// sessions.qr_code_id: el huésped escaneó de verdad el QR físico de mesa del
// restaurante). "Convertido" es la única prueba de visita real que existe hoy
// — es la palanca para negociar comisión o colocación de pago con un
// restaurante, y por eso no se comparte ni con la agencia ni con el propio
// restaurante (ver workerGuideAdmin.js getRestaurantConversions).
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import {
  Box, Typography, Paper, Alert, CircularProgress,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  ToggleButtonGroup, ToggleButton, Chip,
} from '@mui/material';
import { Insights as InsightsIcon } from '@mui/icons-material';

interface ConversionRow {
  restaurant_id: string;
  restaurant_name: string;
  apartment_id: string;
  apartment_name: string;
  clicks: number;
  landed: number;
  converted: number;
}

const RANGE_OPTIONS = [
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
  { value: '90', label: '90 días' },
];

export default function GuideConversionsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ConversionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState('30');

  useEffect(() => {
    if (!user?.is_superadmin) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.request(`/guide/admin/stats/conversions?days=${days}`);
        setRows(res.rows || []);
      } catch (err: any) {
        setError(err.message || 'Error al cargar la conversión');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, days]);

  if (!user?.is_superadmin) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ maxWidth: 500, mx: 'auto' }}>
          No tienes permisos de superadmin para acceder a esta página.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 0 } }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <InsightsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>Conversión Guía → Restaurante</Typography>
            <Typography variant="body2" color="text.secondary">
              Clic en la guía → aterrizó en el menú → confirmado con el QR físico de mesa. Solo superadmin.
            </Typography>
          </Box>
        </Box>
        <ToggleButtonGroup value={days} exclusive size="small" onChange={(_, v) => v && setDays(v)}>
          {RANGE_OPTIONS.map(o => (
            <ToggleButton key={o.value} value={o.value} sx={{ px: 1.5, textTransform: 'none', fontWeight: 600 }}>{o.label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : rows.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Sin datos todavía en este rango.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Restaurante</TableCell>
                <TableCell>Apartamento</TableCell>
                <TableCell align="right">Clics</TableCell>
                <TableCell align="right">Aterrizado</TableCell>
                <TableCell align="right">Convertido</TableCell>
                <TableCell align="right">Tasa conversión</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => {
                const rate = r.clicks > 0 ? Math.round((r.converted / r.clicks) * 100) : 0;
                return (
                  <TableRow key={`${r.restaurant_id}-${r.apartment_id}-${i}`} hover>
                    <TableCell>{r.restaurant_name}</TableCell>
                    <TableCell>{r.apartment_name}</TableCell>
                    <TableCell align="right">{r.clicks}</TableCell>
                    <TableCell align="right">{r.landed}</TableCell>
                    <TableCell align="right">
                      <Chip size="small" color={r.converted > 0 ? 'success' : 'default'} label={r.converted} />
                    </TableCell>
                    <TableCell align="right">{rate}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
