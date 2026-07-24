// apps/admin/src/pages/LoyaltyPage.tsx
// Loyalty stamp-card program: configuration + redeem PIN + card activity.

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  TextField,
  FormControlLabel,
  Switch,
  Stack,
  Divider,
  Alert,
  alpha,
  Tabs,
  Tab,
  Snackbar,
  LinearProgress,
  Slider,
} from '@mui/material';
import {
  Loyalty as LoyaltyIcon,
  CardGiftcard as GiftIcon,
  Lock as LockIcon,
  CheckCircle as CheckIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';

interface LoyaltyProgram {
  restaurant_id: string;
  is_active: number | boolean;
  stamps_required: number;
  reward_name?: string;
  reward_description?: string;
  reward_image_url?: string;
  stamp_icon?: string;
  card_color?: string;
  expiry_days?: number | null;
  terms?: string;
}

const COLORS = {
  loyalty: '#f59e0b',
  success: '#22c55e',
  danger: '#ef4444',
  cyan: '#14b8a6',
};

const emptyProgram: LoyaltyProgram = {
  restaurant_id: '',
  is_active: false,
  stamps_required: 8,
  stamp_icon: '⭐',
};

const LoyaltyPage: React.FC = () => {
  const { currentRestaurant } = useAuth();
  const restaurantId = currentRestaurant?.id;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  });

  const [form, setForm] = useState<LoyaltyProgram>(emptyProgram);
  const [saving, setSaving] = useState(false);

  const [redeemPin, setRedeemPin] = useState('');
  const [pinLoaded, setPinLoaded] = useState(false);
  const [savingPin, setSavingPin] = useState(false);

  const [cardsFilter, setCardsFilter] = useState<string>('all');
  const [cardsData, setCardsData] = useState<{ cards: any[]; counts: any }>({ cards: [], counts: {} });
  const [cardsLoading, setCardsLoading] = useState(false);

  const { data: program, isLoading } = useQuery<LoyaltyProgram | null>({
    queryKey: ['loyaltyProgram', restaurantId],
    queryFn: async () => {
      const res = await apiClient.client.get(`/api/restaurants/${restaurantId}/loyalty-program`);
      return res.data.program || null;
    },
    enabled: !!restaurantId
  });

  useEffect(() => {
    setForm(program ? { ...program, is_active: !!program.is_active } : { ...emptyProgram, restaurant_id: restaurantId || '' });
  }, [program, restaurantId]);

  useEffect(() => {
    if (activeTab === 1 && restaurantId && !pinLoaded) {
      loadPin();
    }
  }, [activeTab, restaurantId]);

  useEffect(() => {
    if (activeTab === 1 && restaurantId) {
      loadCards();
    }
  }, [activeTab, restaurantId, cardsFilter]);

  const loadPin = async () => {
    try {
      const res = await apiClient.client.get(`/api/restaurants/${restaurantId}/redeem-pin`);
      setRedeemPin(res.data.pin || '');
      setPinLoaded(true);
    } catch (e) { /* ignore */ }
  };

  const savePin = async () => {
    setSavingPin(true);
    try {
      await apiClient.client.put(`/api/restaurants/${restaurantId}/redeem-pin`, { pin: redeemPin || null });
      setSnackbar({ open: true, message: redeemPin ? 'PIN guardado' : 'PIN desactivado', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: 'Error al guardar PIN', severity: 'error' });
    } finally {
      setSavingPin(false);
    }
  };

  const loadCards = async () => {
    setCardsLoading(true);
    try {
      const params = cardsFilter !== 'all' ? `?status=${cardsFilter}` : '';
      const res = await apiClient.client.get(`/api/restaurants/${restaurantId}/loyalty-cards${params}`);
      setCardsData({ cards: res.data.cards || [], counts: res.data.counts || {} });
    } catch (e) {
      setCardsData({ cards: [], counts: {} });
    } finally {
      setCardsLoading(false);
    }
  };

  const handleAdminRedeem = async (cardId: string) => {
    try {
      await apiClient.client.post(`/api/loyalty/cards/${cardId}/admin-redeem`);
      setSnackbar({ open: true, message: 'Canjeado correctamente', severity: 'success' });
      loadCards();
    } catch (e) {
      setSnackbar({ open: true, message: 'Error al canjear', severity: 'error' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.client.put(`/api/restaurants/${restaurantId}/loyalty-program`, form);
      queryClient.invalidateQueries({ queryKey: ['loyaltyProgram', restaurantId] });
      setSnackbar({ open: true, message: 'Programa guardado ✅', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Error al guardar', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!restaurantId) {
    return (
      <Box p={4} textAlign="center">
        <Typography color="text.secondary">Selecciona un restaurante</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box mb={4}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
          🎟️ Lealtad
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tarjeta de sellos: el cliente acumula un sello validado por el camarero en cada visita
        </Typography>
      </Box>

      <Paper sx={{
        bgcolor: alpha('#1a1a2e', 0.6),
        backdropFilter: 'blur(8px)',
        borderRadius: 3,
        border: `1px solid ${alpha('#fff', 0.05)}`,
        mb: 3
      }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 56 } }}
        >
          <Tab icon={<LoyaltyIcon />} label="Configuración" iconPosition="start" />
          <Tab icon={<ReceiptIcon />} label="Tarjetas" iconPosition="start" />
        </Tabs>
      </Paper>

      {isLoading ? (
        <LinearProgress sx={{ borderRadius: 1 }} />
      ) : activeTab === 0 ? (
        <Paper sx={{
          p: 3,
          bgcolor: alpha('#1a1a2e', 0.6),
          borderRadius: 3,
          border: `1px solid ${alpha(COLORS.loyalty, 0.15)}`,
          maxWidth: 640
        }}>
          <Stack spacing={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={!!form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  color="success"
                />
              }
              label="Programa activo"
            />

            {form.is_active && (
              <Alert severity="info" sx={{ bgcolor: alpha(COLORS.cyan, 0.1), color: COLORS.cyan, borderRadius: 2 }}>
                El sello se otorga solo cuando el camarero valida con el PIN de la pestaña "Tarjetas".
                Si no configuras un PIN, los clientes no podrán sumar sellos.
              </Alert>
            )}

            <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />
            <Typography variant="subtitle2" sx={{ color: alpha('#fff', 0.5), display: 'flex', alignItems: 'center', gap: 1 }}>
              <GiftIcon fontSize="small" /> Premio
            </Typography>

            <TextField
              fullWidth
              label="Nombre del premio"
              value={form.reward_name || ''}
              onChange={e => setForm({ ...form, reward_name: e.target.value })}
              placeholder="Postre gratis"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Descripción"
              value={form.reward_description || ''}
              onChange={e => setForm({ ...form, reward_description: e.target.value })}
              placeholder="Un postre a elegir de la carta"
              multiline
              rows={2}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="URL de imagen del premio (opcional)"
              value={form.reward_image_url || ''}
              onChange={e => setForm({ ...form, reward_image_url: e.target.value })}
              placeholder="https://..."
              InputLabelProps={{ shrink: true }}
            />

            <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />
            <Typography variant="subtitle2" sx={{ color: alpha('#fff', 0.5) }}>
              🎫 Tarjeta
            </Typography>

            <Box sx={{ px: 1 }}>
              <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), mb: 1, display: 'block' }}>
                Sellos necesarios para completar: {form.stamps_required}
              </Typography>
              <Slider
                value={form.stamps_required}
                onChange={(_, value) => setForm({ ...form, stamps_required: value as number })}
                min={3}
                max={15}
                step={1}
                marks={[{ value: 3, label: '3' }, { value: 8, label: '8' }, { value: 15, label: '15' }]}
                sx={{ color: COLORS.loyalty }}
              />
            </Box>

            <Box display="flex" gap={2}>
              <TextField
                fullWidth
                label="Icono de sello (emoji)"
                value={form.stamp_icon || '⭐'}
                onChange={e => setForm({ ...form, stamp_icon: e.target.value })}
                inputProps={{ maxLength: 4 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                type="number"
                label="Caducidad tras completar (días, vacío = sin caducidad)"
                value={form.expiry_days ?? ''}
                onChange={e => setForm({ ...form, expiry_days: e.target.value ? Number(e.target.value) : null })}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <TextField
              fullWidth
              label="Términos (opcional, se muestra pequeño en la tarjeta)"
              value={form.terms || ''}
              onChange={e => setForm({ ...form, terms: e.target.value })}
              placeholder="Válido de lunes a jueves. Un sello por visita."
              InputLabelProps={{ shrink: true }}
            />

            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              sx={{
                bgcolor: COLORS.loyalty, py: 1.5, fontWeight: 600, alignSelf: 'flex-start', px: 4,
                '&:hover': { bgcolor: alpha(COLORS.loyalty, 0.85) }
              }}
            >
              {saving ? 'Guardando...' : 'Guardar programa'}
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Box>
          {/* PIN Configuration */}
          <Paper sx={{
            p: 3, mb: 3,
            bgcolor: alpha('#1a1a2e', 0.6),
            borderRadius: 3,
            border: `1px solid ${alpha(COLORS.cyan, 0.15)}`
          }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <LockIcon sx={{ color: COLORS.cyan, fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  PIN de Sala
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ opacity: 0.5 }}>
                {redeemPin ? 'Activado' : 'Desactivado'}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.5, mb: 2, fontSize: '0.8rem' }}>
              El camarero introduce este PIN para validar un sello nuevo y para confirmar el canje del premio.
            </Typography>
            <Box display="flex" gap={1.5} alignItems="center">
              <TextField
                size="small"
                label="PIN (4 dígitos)"
                value={redeemPin}
                onChange={e => setRedeemPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputProps={{ maxLength: 4, inputMode: 'numeric', style: { letterSpacing: '6px', fontFamily: 'monospace' } }}
                sx={{ width: 160 }}
              />
              <Button
                variant="contained"
                size="small"
                disabled={savingPin}
                onClick={savePin}
                sx={{ bgcolor: COLORS.cyan, '&:hover': { bgcolor: alpha(COLORS.cyan, 0.85) } }}
              >
                {savingPin ? 'Guardando...' : 'Guardar'}
              </Button>
            </Box>
          </Paper>

          {/* Status Counters */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'En curso', value: cardsData.counts.active || 0, color: COLORS.cyan, filter: 'active' },
              { label: 'Completadas', value: cardsData.counts.completed || 0, color: COLORS.loyalty, filter: 'completed' },
              { label: 'Canjeadas', value: cardsData.counts.redeemed || 0, color: COLORS.success, filter: 'redeemed' },
              { label: 'Total', value: cardsData.counts.total || 0, color: '#8b5cf6', filter: 'all' }
            ].map(stat => (
              <Grid item xs={6} md={3} key={stat.filter}>
                <Paper
                  onClick={() => setCardsFilter(stat.filter)}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    textAlign: 'center',
                    bgcolor: cardsFilter === stat.filter ? alpha(stat.color, 0.15) : alpha('#1a1a2e', 0.5),
                    border: `1px solid ${cardsFilter === stat.filter ? alpha(stat.color, 0.4) : alpha('#fff', 0.05)}`,
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: alpha(stat.color, 0.3) }
                  }}
                >
                  <Typography variant="h4" sx={{ fontWeight: 800, color: stat.color }}>{stat.value}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.6 }}>{stat.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Cards list */}
          {cardsLoading ? (
            <LinearProgress sx={{ borderRadius: 1 }} />
          ) : cardsData.cards.length > 0 ? (
            <Stack spacing={1.5}>
              {cardsData.cards.map((card: any) => {
                const statusColor = card.status === 'redeemed' ? COLORS.success
                  : card.status === 'completed' ? COLORS.loyalty
                  : card.status === 'expired' ? COLORS.danger
                  : COLORS.cyan;
                const statusLabel = card.status === 'redeemed' ? 'Canjeada'
                  : card.status === 'completed' ? 'Completada'
                  : card.status === 'expired' ? 'Expirada'
                  : 'En curso';

                return (
                  <Paper
                    key={card.id}
                    sx={{
                      p: 2.5,
                      bgcolor: alpha('#1a1a2e', 0.5),
                      border: `1px solid ${alpha(statusColor, 0.15)}`,
                      borderRadius: 2,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 1.5
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <LoyaltyIcon sx={{ fontSize: 18, color: statusColor }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {card.stamps} sello{card.stamps === 1 ? '' : 's'}
                        </Typography>
                        <Chip
                          size="small"
                          label={statusLabel}
                          sx={{ bgcolor: alpha(statusColor, 0.15), color: statusColor, fontWeight: 600, fontSize: '0.65rem', height: 20 }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ opacity: 0.5, display: 'block' }}>
                        {new Date(card.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {card.redeemed_at && ` → Canjeada ${new Date(card.redeemed_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`}
                      </Typography>
                    </Box>
                    {card.status === 'completed' && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CheckIcon />}
                        onClick={() => handleAdminRedeem(card.id)}
                        sx={{
                          borderColor: alpha(COLORS.success, 0.3), color: COLORS.success,
                          '&:hover': { borderColor: COLORS.success, bgcolor: alpha(COLORS.success, 0.08) }
                        }}
                      >
                        Marcar canjeada
                      </Button>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          ) : (
            <Paper sx={{ p: 6, textAlign: 'center', bgcolor: alpha('#1a1a2e', 0.4), borderRadius: 3, border: `1px dashed ${alpha('#fff', 0.1)}` }}>
              <ReceiptIcon sx={{ fontSize: 64, color: alpha('#fff', 0.15), mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>Sin tarjetas aún</Typography>
              <Typography variant="body2" color="text.secondary">Cuando los clientes empiecen a sumar sellos, aparecerán aquí</Typography>
            </Paper>
          )}
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LoyaltyPage;
