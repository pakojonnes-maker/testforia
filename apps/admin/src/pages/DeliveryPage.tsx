import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Paper, Switch, Tabs, Tab, Chip, IconButton, CircularProgress,
    Select, MenuItem, FormControl, InputLabel, Card, CardContent, Avatar,
    alpha, useTheme, useMediaQuery, Stack, Collapse, Button, Tooltip, Badge
} from '@mui/material';
import {
    TwoWheeler, Refresh, CheckCircle, LocalShipping, AccessTime,
    Phone, WhatsApp, ExpandMore, ExpandLess, LocationOn, Person,
    Cancel, Settings, Receipt, Warning, Restaurant, HourglassEmpty,
    AttachMoney
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import DeliverySettingsTab from '../components/delivery/DeliverySettingsTab';

// Order interface
interface DeliveryOrder {
    id: string;
    customer_name: string | null;
    customer_phone: string;
    customer_address: string;
    customer_notes: string | null;
    items: Array<{ dish_id: string; name: string; quantity: number; price: number }>;
    subtotal: number;
    shipping_cost: number;
    total: number;
    payment_method: string | null;
    status: string;
    order_source: string;
    created_at: string;
    confirmed_at: string | null;
    delivered_at: string | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

const DeliveryPage: React.FC = () => {
    const { currentRestaurant } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // State
    const [currentTab, setCurrentTab] = useState(0);
    const [orders, setOrders] = useState<DeliveryOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [isEnabled, setIsEnabled] = useState(false);

    const restaurantId = currentRestaurant?.id;
    const neonColor = '#8b5cf6'; // Purple for delivery

    // Load delivery settings status
    useEffect(() => {
        if (!restaurantId) return;
        fetch(`${API_URL}/delivery/config/${restaurantId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) setIsEnabled(Boolean(data.settings?.is_enabled));
            })
            .catch(console.error);
    }, [restaurantId]);

    // Load orders
    const loadOrders = async () => {
        if (!restaurantId) return;
        setLoading(true);
        try {
            const url = `${API_URL}/delivery/orders/${restaurantId}${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) setOrders(data.orders || []);
        } catch (error) {
            console.error('[Delivery] Error loading orders:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentTab === 0) loadOrders();
    }, [restaurantId, currentTab, statusFilter]);

    // Update order status
    const handleStatusChange = async (orderId: string, newStatus: string) => {
        try {
            await fetch(`${API_URL}/delivery/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            loadOrders();
        } catch (error) {
            console.error('[Delivery] Error updating status:', error);
        }
    };

    // Stats
    const stats = useMemo(() => ({
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        preparing: orders.filter(o => o.status === 'preparing').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        revenue: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total, 0)
    }), [orders]);

    // Status config
    const getStatusConfig = (status: string) => {
        const configs: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
            pending: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: <HourglassEmpty />, label: 'Pendiente' },
            confirmed: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', icon: <CheckCircle />, label: 'Confirmado' },
            preparing: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', icon: <Restaurant />, label: 'Preparando' },
            delivered: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: <LocalShipping />, label: 'Entregado' },
            cancelled: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: <Cancel />, label: 'Cancelado' },
        };
        return configs[status] || { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', icon: null, label: status };
    };

    // Stat Card Component
    const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) => (
        <Card sx={{ background: `linear-gradient(135deg, rgba(30, 41, 59, 0.8), ${alpha(color, 0.2)})`, border: 'none' }}>
            <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Box display="flex" alignItems="center" gap={isMobile ? 1.5 : 2}>
                    <Avatar sx={{ bgcolor: alpha(color, 0.2), color: color, width: isMobile ? 40 : 44, height: isMobile ? 40 : 44 }}>{icon}</Avatar>
                    <Box>
                        <Typography variant={isMobile ? "h5" : "h4"} fontWeight="800" color="#fff">{value}</Typography>
                        <Typography variant="caption" sx={{ color: alpha('#fff', 0.7), fontWeight: 500 }}>{label}</Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );

    // Order Card Component
    const OrderCard = ({ order }: { order: DeliveryOrder }) => {
        const status = getStatusConfig(order.status);
        const isExpanded = expandedOrder === order.id;
        const orderTime = new Date(order.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const orderDate = new Date(order.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

        return (
            <Paper
                elevation={0}
                sx={{
                    mb: 2,
                    borderRadius: 3,
                    border: `1px solid ${alpha(status.color, 0.3)}`,
                    bgcolor: alpha(status.color, 0.05),
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <Box
                    sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                    <Box sx={{ minWidth: 60, textAlign: 'center', py: 1, px: 1, borderRadius: 2, bgcolor: alpha(neonColor, 0.15) }}>
                        <Typography variant="caption" color="text.secondary">{orderDate}</Typography>
                        <Typography variant="subtitle2" fontWeight="800" sx={{ color: neonColor }}>{orderTime}</Typography>
                    </Box>
                    <Box flex={1} overflow="hidden">
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1" fontWeight="700" noWrap>
                                {order.customer_name || order.customer_phone}
                            </Typography>
                            <Chip
                                size="small"
                                icon={order.order_source === 'whatsapp' ? <WhatsApp sx={{ fontSize: 14 }} /> : <Phone sx={{ fontSize: 14 }} />}
                                label={order.order_source}
                                sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.05)' }}
                            />
                        </Box>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationOn sx={{ fontSize: 14 }} /> {order.customer_address}
                        </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" fontWeight="800" sx={{ color: '#10b981' }}>{order.total.toFixed(2)}€</Typography>
                        <Chip label={status.label} size="small" sx={{ bgcolor: status.bg, color: status.color, fontWeight: 600, fontSize: '0.7rem' }} />
                    </Box>
                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </Box>

                {/* Expanded Content */}
                <Collapse in={isExpanded}>
                    <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {/* Contact Info */}
                        <Stack spacing={1} mb={2}>
                            <Button
                                fullWidth
                                variant="outlined"
                                size="small"
                                startIcon={<Phone />}
                                href={`tel:${order.customer_phone}`}
                                sx={{ justifyContent: 'flex-start', color: '#f8fafc' }}
                            >
                                {order.customer_phone}
                            </Button>
                            <Button
                                fullWidth
                                variant="outlined"
                                size="small"
                                startIcon={<WhatsApp />}
                                href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`}
                                target="_blank"
                                sx={{ justifyContent: 'flex-start', color: '#25D366', borderColor: '#25D366' }}
                            >
                                Enviar WhatsApp
                            </Button>
                        </Stack>

                        {/* Address */}
                        <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>
                            <Typography variant="caption" color="text.secondary">📍 Dirección</Typography>
                            <Typography variant="body2" fontWeight={500}>{order.customer_address}</Typography>
                        </Paper>

                        {/* Notes */}
                        {order.customer_notes && (
                            <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                <Typography variant="caption" color="text.secondary">📝 Notas</Typography>
                                <Typography variant="body2">{order.customer_notes}</Typography>
                            </Paper>
                        )}

                        {/* Order Items */}
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>🛒 Pedido</Typography>
                        <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>
                            {order.items.map((item, i) => (
                                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: i < order.items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                    <Typography variant="body2">{item.name} x{item.quantity}</Typography>
                                    <Typography variant="body2" fontWeight={600}>{(item.price * item.quantity).toFixed(2)}€</Typography>
                                </Box>
                            ))}
                            <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                <Box display="flex" justifyContent="space-between" mb={0.5}>
                                    <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                                    <Typography variant="body2">{order.subtotal.toFixed(2)}€</Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between" mb={0.5}>
                                    <Typography variant="body2" color="text.secondary">Envío</Typography>
                                    <Typography variant="body2">{order.shipping_cost > 0 ? `${order.shipping_cost.toFixed(2)}€` : 'Gratis'}</Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="subtitle2" fontWeight={700}>Total</Typography>
                                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#10b981' }}>{order.total.toFixed(2)}€</Typography>
                                </Box>
                            </Box>
                        </Paper>

                        {/* Status Actions */}
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>📌 Cambiar estado</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {order.status === 'pending' && (
                                <>
                                    <Button size="small" variant="contained" color="primary" onClick={() => handleStatusChange(order.id, 'confirmed')}>✓ Confirmar</Button>
                                    <Button size="small" variant="outlined" color="error" onClick={() => handleStatusChange(order.id, 'cancelled')}>✗ Cancelar</Button>
                                </>
                            )}
                            {order.status === 'confirmed' && (
                                <Button size="small" variant="contained" sx={{ bgcolor: '#8b5cf6' }} onClick={() => handleStatusChange(order.id, 'preparing')}>🍳 Preparando</Button>
                            )}
                            {order.status === 'preparing' && (
                                <Button size="small" variant="contained" color="success" onClick={() => handleStatusChange(order.id, 'delivered')}>🚚 Entregado</Button>
                            )}
                            {['confirmed', 'preparing'].includes(order.status) && (
                                <Button size="small" variant="outlined" color="error" onClick={() => handleStatusChange(order.id, 'cancelled')}>✗ Cancelar</Button>
                            )}
                        </Stack>
                    </Box>
                </Collapse>
            </Paper>
        );
    };

    return (
        <Box sx={{ minHeight: '100vh', px: isMobile ? 1 : 0 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 2, mb: 3, pb: 2, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Box>
                    <Typography
                        variant={isMobile ? "h5" : "h4"}
                        fontWeight="800"
                        sx={{ background: 'linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                    >
                        Delivery
                    </Typography>
                </Box>
                <Paper
                    elevation={0}
                    sx={{
                        p: isMobile ? 1.5 : 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        borderRadius: 2,
                        bgcolor: isEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${isEnabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}
                >
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isEnabled ? '#10b981' : '#ef4444', boxShadow: `0 0 8px ${isEnabled ? '#10b981' : '#ef4444'}` }} />
                    <Typography variant="body2" fontWeight="600" color={isEnabled ? '#10b981' : '#ef4444'}>
                        {isEnabled ? 'Activo' : 'Inactivo'}
                    </Typography>
                    {stats.pending > 0 && (
                        <Badge badgeContent={stats.pending} color="warning" sx={{ ml: 1 }}>
                            <HourglassEmpty sx={{ color: '#f59e0b' }} />
                        </Badge>
                    )}
                </Paper>
            </Box>

            {/* Stats */}
            {currentTab === 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: isMobile ? 1.5 : 2, mb: 3 }}>
                    <StatCard icon={<Receipt />} label="Total Pedidos" value={stats.total} color="#3b82f6" />
                    <StatCard icon={<HourglassEmpty />} label="Pendientes" value={stats.pending} color="#f59e0b" />
                    <StatCard icon={<LocalShipping />} label="Entregados" value={stats.delivered} color="#10b981" />
                    <StatCard icon={<AttachMoney />} label="Ingresos" value={`${stats.revenue.toFixed(0)}€`} color="#8b5cf6" />
                </Box>
            )}

            {/* Tabs */}
            <Paper elevation={0} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                <Tabs
                    value={currentTab}
                    onChange={(_, v) => setCurrentTab(v)}
                    variant={isMobile ? "fullWidth" : "standard"}
                    sx={{ '& .MuiTab-root': { minWidth: isMobile ? 'auto' : 120, py: 1.5, px: isMobile ? 2 : 3 } }}
                >
                    <Tab icon={<TwoWheeler />} iconPosition="start" label={isMobile ? "" : "Pedidos"} />
                    <Tab icon={<Settings />} iconPosition="start" label={isMobile ? "" : "Configuración"} />
                </Tabs>
            </Paper>

            {/* Tab Content */}
            <Box>
                {/* Tab 0: Orders */}
                {currentTab === 0 && (
                    <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, borderRadius: 2 }}>
                        {/* Filters */}
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                            <Typography variant="h6" fontWeight="700">📦 Pedidos</Typography>
                            <Box display="flex" gap={1} alignItems="center">
                                <FormControl size="small" sx={{ minWidth: 140 }}>
                                    <InputLabel>Estado</InputLabel>
                                    <Select
                                        value={statusFilter}
                                        label="Estado"
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <MenuItem value="all">Todos</MenuItem>
                                        <MenuItem value="pending">Pendientes</MenuItem>
                                        <MenuItem value="confirmed">Confirmados</MenuItem>
                                        <MenuItem value="preparing">Preparando</MenuItem>
                                        <MenuItem value="delivered">Entregados</MenuItem>
                                        <MenuItem value="cancelled">Cancelados</MenuItem>
                                    </Select>
                                </FormControl>
                                <IconButton onClick={loadOrders} disabled={loading}>
                                    <Refresh />
                                </IconButton>
                            </Box>
                        </Box>

                        {/* Orders List */}
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
                        ) : orders.length === 0 ? (
                            <Box textAlign="center" py={6}>
                                <TwoWheeler sx={{ fontSize: 48, color: 'rgba(255,255,255,0.1)', mb: 1 }} />
                                <Typography color="text.secondary">No hay pedidos</Typography>
                            </Box>
                        ) : (
                            orders.map(order => <OrderCard key={order.id} order={order} />)
                        )}
                    </Paper>
                )}

                {/* Tab 1: Settings */}
                {currentTab === 1 && (
                    <DeliverySettingsTab restaurantId={restaurantId || ''} neonColor={neonColor} />
                )}
            </Box>
        </Box>
    );
};

export default DeliveryPage;
