import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Alert, Box, Button, Chip, CircularProgress, Collapse, FormControl, Grid, InputLabel, MenuItem, Select, Stack,
    Tab, Tabs, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    TwoWheeler, Phone, WhatsApp, ExpandMore, ExpandLess, LocationOn, Receipt, HourglassEmpty, LocalShipping, Euro,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { apiClient, type DeliveryOrder, type DeliveryStatus } from '../lib/apiClient';
import DeliverySettingsTab from '../components/delivery/DeliverySettingsTab';
import { PageHeader } from '../components/common/PageHeader';
import { Panel } from '../components/common/Panel';
import { StatCard } from '../components/common/StatCard';
import { DATA, STATUS_COLORS } from '../theme';

const STATUS: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pendiente', color: STATUS_COLORS.pending },
    confirmed: { label: 'Confirmado', color: STATUS_COLORS.completed },
    preparing: { label: 'Preparando', color: STATUS_COLORS.preparing },
    delivered: { label: 'Entregado', color: STATUS_COLORS.delivered },
    cancelled: { label: 'Cancelado', color: STATUS_COLORS.cancelled },
};
const statusOf = (s: string) => STATUS[s] ?? { label: s, color: DATA.muted };

// Siguiente paso de cada estado (el cancelar se ofrece aparte).
const NEXT: Record<string, { status: DeliveryStatus; label: string } | undefined> = {
    pending: { status: 'confirmed', label: 'Confirmar' },
    confirmed: { status: 'preparing', label: 'Preparando' },
    preparing: { status: 'delivered', label: 'Entregado' },
};

const euros = (n: number) => `${(n ?? 0).toFixed(2)} €`;

function OrderCard({ order, onStatus, busy }: {
    order: DeliveryOrder;
    onStatus: (id: string, status: DeliveryStatus) => void;
    busy: boolean;
}) {
    const [open, setOpen] = useState(false);
    const status = statusOf(order.status);
    const created = new Date(order.created_at);
    const next = NEXT[order.status];

    return (
        <Box sx={{ border: 1, borderColor: 'divider', borderLeft: `3px solid ${status.color}`, mb: 1.5, bgcolor: 'background.paper' }}>
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
                <Box sx={{ minWidth: 64, textAlign: 'center' }}>
                    <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                        {created.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {created.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={600} noWrap>{order.customer_name || order.customer_phone}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>{order.customer_address}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="subtitle1" fontWeight={700}>{euros(order.total)}</Typography>
                    <Chip size="small" label={status.label} sx={{ bgcolor: alpha(status.color, 0.1), color: status.color, fontWeight: 600 }} />
                </Box>
                {open ? <ExpandLess /> : <ExpandMore />}
            </Box>
            <Collapse in={open}>
                <Box sx={{ px: 2, pb: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
                        <Button variant="outlined" size="small" startIcon={<Phone />} href={`tel:${order.customer_phone}`}>{order.customer_phone}</Button>
                        <Button variant="outlined" size="small" startIcon={<WhatsApp />} target="_blank" rel="noopener noreferrer"
                            href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`}>
                            WhatsApp
                        </Button>
                    </Stack>
                    <Typography variant="body2" sx={{ mb: 1, display: 'flex', gap: 0.5 }}>
                        <LocationOn sx={{ fontSize: 18, color: 'text.secondary' }} /> {order.customer_address}
                    </Typography>
                    {order.customer_notes && (
                        <Typography variant="body2" sx={{ mb: 2, p: 1, bgcolor: alpha(STATUS_COLORS.pending, 0.08) }}>
                            <strong>Notas:</strong> {order.customer_notes}
                        </Typography>
                    )}
                    <Box sx={{ border: 1, borderColor: 'divider', p: 1.5, mb: 2 }}>
                        {order.items.map((item, i) => (
                            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                                <Typography variant="body2">{item.quantity} × {item.name}</Typography>
                                <Typography variant="body2" fontWeight={600}>{euros(item.price * item.quantity)}</Typography>
                            </Box>
                        ))}
                        <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                                <Typography variant="body2">{euros(order.subtotal)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Envío</Typography>
                                <Typography variant="body2">{order.shipping_cost > 0 ? euros(order.shipping_cost) : 'Gratis'}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="subtitle2" fontWeight={700}>Total</Typography>
                                <Typography variant="subtitle2" fontWeight={700}>{euros(order.total)}</Typography>
                            </Box>
                        </Box>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {next && (
                            <Button size="small" variant="contained" disabled={busy} onClick={() => onStatus(order.id, next.status)}>{next.label}</Button>
                        )}
                        {['pending', 'confirmed', 'preparing'].includes(order.status) && (
                            <Button size="small" variant="outlined" color="error" disabled={busy} onClick={() => onStatus(order.id, 'cancelled')}>Cancelar</Button>
                        )}
                    </Stack>
                </Box>
            </Collapse>
        </Box>
    );
}

export default function DeliveryPage() {
    const { currentRestaurant } = useAuth();
    const restaurantId: string | undefined = currentRestaurant?.id;
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<'orders' | 'settings'>('orders');
    const [statusFilter, setStatusFilter] = useState('all');

    const { data: isEnabled = false } = useQuery({
        queryKey: ['delivery-enabled', restaurantId],
        queryFn: async () => !!(await apiClient.getDeliverySettings(restaurantId!)).settings?.is_enabled,
        enabled: !!restaurantId,
    });
    const { data: orders = [], isLoading, isError, refetch } = useQuery({
        queryKey: ['delivery-orders', restaurantId, statusFilter],
        queryFn: async () => (await apiClient.getDeliveryOrders(restaurantId!, statusFilter)).orders ?? [],
        enabled: !!restaurantId && tab === 'orders',
        refetchInterval: 60 * 1000, // pedidos nuevos sin recargar la página
    });
    const setStatus = useMutation({
        mutationFn: ({ id, status }: { id: string; status: DeliveryStatus }) => apiClient.updateDeliveryOrderStatus(id, status),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['delivery-orders', restaurantId] }),
    });

    const stats = useMemo(() => ({
        total: orders.length,
        pending: orders.filter((o) => o.status === 'pending').length,
        delivered: orders.filter((o) => o.status === 'delivered').length,
        revenue: orders.filter((o) => o.status === 'delivered').reduce((sum, o) => sum + (o.total || 0), 0),
    }), [orders]);

    if (!restaurantId) return <Alert severity="info">Selecciona un restaurante.</Alert>;

    return (
        <Box>
            <PageHeader
                icon={<TwoWheeler />}
                title="Delivery"
                subtitle={isEnabled ? 'Los clientes pueden pedir a domicilio desde la carta' : 'El delivery está desactivado en la carta'}
                actions={
                    <Chip variant="outlined" label={isEnabled ? 'Activo' : 'Desactivado'}
                        sx={{ color: isEnabled ? STATUS_COLORS.confirmed : 'text.secondary', borderColor: isEnabled ? STATUS_COLORS.confirmed : 'divider', fontWeight: 600 }} />
                }
            />

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tab value="orders" label="Pedidos" />
                <Tab value="settings" label="Ajustes" />
            </Tabs>

            {tab === 'orders' && (
                <>
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={6} md={3}><StatCard icon={<Receipt />} title="Pedidos" value={stats.total} color={DATA.sea} /></Grid>
                        <Grid item xs={6} md={3}><StatCard icon={<HourglassEmpty />} title="Pendientes" value={stats.pending} color={STATUS_COLORS.pending} /></Grid>
                        <Grid item xs={6} md={3}><StatCard icon={<LocalShipping />} title="Entregados" value={stats.delivered} color={STATUS_COLORS.delivered} /></Grid>
                        <Grid item xs={6} md={3}><StatCard icon={<Euro />} title="Ingresos" value={`${stats.revenue.toFixed(0)} €`} color={DATA.cobalt} /></Grid>
                    </Grid>
                    <Panel
                        title="Pedidos"
                        subtitle="Los 50 más recientes"
                        action={
                            <Stack direction="row" spacing={1} alignItems="center">
                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                    <InputLabel>Estado</InputLabel>
                                    <Select label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                        <MenuItem value="all">Todos</MenuItem>
                                        {Object.entries(STATUS).map(([key, s]) => <MenuItem key={key} value={key}>{s.label}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <Button size="small" onClick={() => refetch()}>Actualizar</Button>
                            </Stack>
                        }
                    >
                        {setStatus.isError && <Alert severity="error" sx={{ mb: 2 }}>No se pudo cambiar el estado del pedido.</Alert>}
                        {isLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
                        ) : isError ? (
                            <Alert severity="error">No se pudieron cargar los pedidos.</Alert>
                        ) : orders.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 6, color: 'text.disabled' }}>
                                <TwoWheeler sx={{ fontSize: 44 }} />
                                <Typography color="text.secondary">No hay pedidos</Typography>
                            </Box>
                        ) : orders.map((order) => (
                            <OrderCard key={order.id} order={order} busy={setStatus.isPending}
                                onStatus={(id, status) => setStatus.mutate({ id, status })} />
                        ))}
                    </Panel>
                </>
            )}

            {tab === 'settings' && <DeliverySettingsTab restaurantId={restaurantId} />}
        </Box>
    );
}
