// apps/admin/src/pages/LoyaltyPage.tsx
// Tarjeta de sellos: configuración del programa, PIN de sala y actividad de tarjetas.

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Card, CardActionArea, Chip, CircularProgress, Divider, FormControlLabel, Grid,
  Slider, Snackbar, Stack, Switch, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { CardGiftcard as GiftIcon, CheckCircle as CheckIcon, Lock as LockIcon, Loyalty as LoyaltyIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/apiClient';
import { PageHeader } from '../components/common/PageHeader';
import { Panel } from '../components/common/Panel';
import { DATA, STATUS_COLORS } from '../theme';

interface LoyaltyProgram {
  is_active: boolean;
  stamps_required: number;
  reward_name?: string;
  reward_description?: string;
  reward_image_url?: string;
  stamp_icon?: string;
  card_color?: string;
  expiry_days?: number | null;
  terms?: string;
}

interface LoyaltyCard {
  id: string;
  stamps: number;
  status: 'active' | 'completed' | 'redeemed' | 'expired';
  created_at: string;
  redeemed_at: string | null;
}

const CARD_STATUS: Record<string, { label: string; color: string }> = {
  active: { label: 'En curso', color: DATA.water },
  completed: { label: 'Completada', color: STATUS_COLORS.pending },
  redeemed: { label: 'Canjeada', color: STATUS_COLORS.confirmed },
  expired: { label: 'Expirada', color: STATUS_COLORS.cancelled },
};

const emptyProgram: LoyaltyProgram = { is_active: false, stamps_required: 8, stamp_icon: '⭐' };
type Toast = { message: string; severity: 'success' | 'error' } | null;

function ProgramForm({ restaurantId, onToast }: { restaurantId: string; onToast: (t: Toast) => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<LoyaltyProgram>(emptyProgram);
  const { data: program, isLoading } = useQuery<LoyaltyProgram | null>({
    queryKey: ['loyaltyProgram', restaurantId],
    queryFn: async () => (await apiClient.client.get(`/api/restaurants/${restaurantId}/loyalty-program`)).data.program || null,
  });
  useEffect(() => {
    setForm(program ? { ...program, is_active: !!program.is_active } : emptyProgram);
  }, [program]);

  const save = useMutation({
    mutationFn: () => apiClient.client.put(`/api/restaurants/${restaurantId}/loyalty-program`, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyaltyProgram', restaurantId] });
      onToast({ message: 'Programa guardado', severity: 'success' });
    },
    onError: (e: Error) => onToast({ message: e.message || 'Error al guardar', severity: 'error' }),
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;

  return (
    <Panel icon={<GiftIcon />} title="Programa" sx={{ maxWidth: 720 }}>
      <Stack spacing={3}>
        <FormControlLabel label="Programa activo"
          control={<Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />} />
        {form.is_active && (
          <Alert severity="info">
            El sello solo se suma cuando el camarero lo valida con el PIN de sala (pestaña «Tarjetas»). Sin PIN, nadie puede sumar sellos.
          </Alert>
        )}
        <Divider />
        <Typography variant="overline" color="text.secondary">Premio</Typography>
        <TextField fullWidth label="Nombre del premio" placeholder="Postre gratis" InputLabelProps={{ shrink: true }}
          value={form.reward_name || ''} onChange={(e) => setForm({ ...form, reward_name: e.target.value })} />
        <TextField fullWidth multiline rows={2} label="Descripción" placeholder="Un postre a elegir de la carta" InputLabelProps={{ shrink: true }}
          value={form.reward_description || ''} onChange={(e) => setForm({ ...form, reward_description: e.target.value })} />
        <TextField fullWidth label="URL de imagen del premio (opcional)" placeholder="https://…" InputLabelProps={{ shrink: true }}
          value={form.reward_image_url || ''} onChange={(e) => setForm({ ...form, reward_image_url: e.target.value })} />
        <Divider />
        <Typography variant="overline" color="text.secondary">Tarjeta</Typography>
        <Box sx={{ px: 1 }}>
          <Typography variant="body2" color="text.secondary">Sellos para completarla: {form.stamps_required}</Typography>
          <Slider min={3} max={15} step={1} value={form.stamps_required}
            onChange={(_, value) => setForm({ ...form, stamps_required: value as number })}
            marks={[{ value: 3, label: '3' }, { value: 8, label: '8' }, { value: 15, label: '15' }]} />
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField fullWidth label="Icono del sello" inputProps={{ maxLength: 4 }} InputLabelProps={{ shrink: true }}
            value={form.stamp_icon || '⭐'} onChange={(e) => setForm({ ...form, stamp_icon: e.target.value })} />
          <TextField fullWidth type="number" label="Caducidad tras completar (días)" helperText="Vacío = no caduca" InputLabelProps={{ shrink: true }}
            value={form.expiry_days ?? ''} onChange={(e) => setForm({ ...form, expiry_days: e.target.value ? Number(e.target.value) : null })} />
        </Stack>
        <TextField fullWidth label="Condiciones (opcional)" placeholder="Válido de lunes a jueves. Un sello por visita." InputLabelProps={{ shrink: true }}
          helperText="Se muestran en pequeño en la tarjeta"
          value={form.terms || ''} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
        <Box>
          <Button variant="contained" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Guardando…' : 'Guardar programa'}
          </Button>
        </Box>
      </Stack>
    </Panel>
  );
}

function CardsTab({ restaurantId, onToast }: { restaurantId: string; onToast: (t: Toast) => void }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [pin, setPin] = useState('');

  const pinQuery = useQuery({
    queryKey: ['redeemPin', restaurantId],
    queryFn: async () => (await apiClient.client.get(`/api/restaurants/${restaurantId}/redeem-pin`)).data.pin || '',
  });
  useEffect(() => { if (pinQuery.data !== undefined) setPin(pinQuery.data); }, [pinQuery.data]);

  const cardsQuery = useQuery({
    queryKey: ['loyaltyCards', restaurantId, filter],
    queryFn: async () => {
      const qs = filter !== 'all' ? `?status=${filter}` : '';
      const data = (await apiClient.client.get(`/api/restaurants/${restaurantId}/loyalty-cards${qs}`)).data;
      return { cards: (data.cards || []) as LoyaltyCard[], counts: data.counts || {} };
    },
    keepPreviousData: true,
  });

  const savePin = useMutation({
    mutationFn: () => apiClient.client.put(`/api/restaurants/${restaurantId}/redeem-pin`, { pin: pin || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redeemPin', restaurantId] });
      onToast({ message: pin ? 'PIN guardado' : 'PIN desactivado', severity: 'success' });
    },
    onError: () => onToast({ message: 'Error al guardar el PIN', severity: 'error' }),
  });
  const redeem = useMutation({
    mutationFn: (cardId: string) => apiClient.client.post(`/api/loyalty/cards/${cardId}/admin-redeem`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyaltyCards', restaurantId] });
      onToast({ message: 'Canjeada', severity: 'success' });
    },
    onError: () => onToast({ message: 'Error al canjear', severity: 'error' }),
  });

  const counts = cardsQuery.data?.counts ?? {};
  const cards = cardsQuery.data?.cards ?? [];
  const filters = [
    { key: 'active', label: 'En curso', value: counts.active || 0, color: CARD_STATUS.active.color },
    { key: 'completed', label: 'Completadas', value: counts.completed || 0, color: CARD_STATUS.completed.color },
    { key: 'redeemed', label: 'Canjeadas', value: counts.redeemed || 0, color: CARD_STATUS.redeemed.color },
    { key: 'all', label: 'Todas', value: counts.total || 0, color: DATA.sea },
  ];

  return (
    <Stack spacing={3}>
      <Panel icon={<LockIcon />} title="PIN de sala" subtitle="El camarero lo introduce para validar un sello y para confirmar el canje del premio."
        action={<Chip size="small" variant="outlined" label={pinQuery.data ? 'Activado' : 'Sin PIN'} />}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField size="small" label="PIN (4 dígitos)" sx={{ width: 170 }} value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputProps={{ maxLength: 4, inputMode: 'numeric', style: { letterSpacing: '6px', fontFamily: 'monospace' } }} />
          <Button variant="contained" disabled={savePin.isPending || (pin.length > 0 && pin.length < 4)} onClick={() => savePin.mutate()}>
            {savePin.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </Stack>
      </Panel>

      <Grid container spacing={2}>
        {filters.map((f) => (
          <Grid item xs={6} md={3} key={f.key}>
            <Card sx={{ borderColor: filter === f.key ? f.color : undefined, bgcolor: filter === f.key ? alpha(f.color, 0.06) : undefined }}>
              <CardActionArea onClick={() => setFilter(f.key)} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: f.color }}>{f.value}</Typography>
                <Typography variant="body2" color="text.secondary">{f.label}</Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Panel title="Tarjetas">
        {cardsQuery.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : cards.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <LoyaltyIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
            <Typography color="text.secondary">Cuando los clientes empiecen a sumar sellos, aparecerán aquí.</Typography>
          </Box>
        ) : cards.map((card) => {
          const status = CARD_STATUS[card.status] ?? CARD_STATUS.active;
          return (
            <Box key={card.id} sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle2">{card.stamps} sello{card.stamps === 1 ? '' : 's'}</Typography>
                  <Chip size="small" label={status.label} sx={{ bgcolor: alpha(status.color, 0.1), color: status.color, fontWeight: 600 }} />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {new Date(card.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {card.redeemed_at && ` · canjeada el ${new Date(card.redeemed_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`}
                </Typography>
              </Box>
              {card.status === 'completed' && (
                <Button size="small" variant="outlined" color="success" startIcon={<CheckIcon />} disabled={redeem.isPending}
                  onClick={() => redeem.mutate(card.id)}>
                  Marcar canjeada
                </Button>
              )}
            </Box>
          );
        })}
      </Panel>
    </Stack>
  );
}

export default function LoyaltyPage() {
  const { currentRestaurant } = useAuth();
  const restaurantId: string | undefined = currentRestaurant?.id;
  const [tab, setTab] = useState<'program' | 'cards'>('program');
  const [toast, setToast] = useState<Toast>(null);

  if (!restaurantId) return <Alert severity="info">Selecciona un restaurante.</Alert>;

  return (
    <Box>
      <PageHeader icon={<LoyaltyIcon />} title="Lealtad"
        subtitle="Tarjeta de sellos: el cliente suma un sello, validado por el camarero, en cada visita" />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="program" label="Programa" />
        <Tab value="cards" label="Tarjetas" />
      </Tabs>
      {tab === 'program'
        ? <ProgramForm restaurantId={restaurantId} onToast={setToast} />
        : <CardsTab restaurantId={restaurantId} onToast={setToast} />}
      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast?.severity || 'success'} variant="filled" onClose={() => setToast(null)}>{toast?.message}</Alert>
      </Snackbar>
    </Box>
  );
}
