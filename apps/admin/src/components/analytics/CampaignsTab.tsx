// apps/admin/src/components/analytics/CampaignsTab.tsx
// Campaign Analytics Tab - Displays campaign performance statistics

import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    alpha,
    Skeleton,
    Alert,
} from '@mui/material';
import {
    Email as EmailIcon,
    Phone as PhoneIcon,
    Campaign as CampaignIcon,
    CheckCircle as RedeemIcon,
    Visibility as OpenIcon,
    WhatsApp as WhatsAppIcon,
    Send as SendIcon,
} from '@mui/icons-material';
import { Bar } from 'react-chartjs-2';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';

interface Props {
    timeRange: string;
}

// Color palette matching the existing design
const COLORS = {
    leads: '#6366f1',      // Indigo for total leads
    email: '#3b82f6',      // Blue for email
    phone: '#10b981',      // Green for phone
    opened: '#f59e0b',     // Amber for opened
    redeemed: '#22c55e',   // Success green for redeemed
    conversion: '#8b5cf6', // Purple for conversion
    whatsapp: '#25D366',   // WhatsApp green
};

const CAMPAIGN_TYPES = {
    scratch_win: { label: 'Rasca y Gana', color: '#f59e0b', emoji: '🎰' },
    welcome_modal: { label: 'Modal Bienvenida', color: '#6366f1', emoji: '👋' },
    event: { label: 'Evento', color: '#ec4899', emoji: '🎉' },
};

export default function CampaignsTab({ timeRange }: Props) {
    const { currentRestaurant } = useAuth();
    const restaurantId = currentRestaurant?.id;

    const { data, isLoading, error } = useQuery({
        queryKey: ['campaignAnalytics', restaurantId, timeRange],
        queryFn: async () => {
            if (!restaurantId) throw new Error('No restaurant selected');
            return await apiClient.getCampaignAnalytics(restaurantId, { timeRange });
        },
        enabled: !!restaurantId,
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return <LoadingState />;
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mb: 3 }}>
                Error al cargar estadísticas de campañas: {(error as any)?.message}
            </Alert>
        );
    }

    if (!data?.success) {
        return (
            <Alert severity="warning" sx={{ mb: 3 }}>
                No se pudieron obtener los datos de campañas.
            </Alert>
        );
    }

    const { summary, timeseries, campaigns, breakdowns } = data;

    return (
        <Box>
            {/* KPI Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <KPICard
                    title="Total Leads"
                    value={summary?.total_leads || 0}
                    subtitle={`${summary?.email_leads || 0} emails · ${summary?.phone_leads || 0} teléfonos`}
                    color={COLORS.leads}
                    icon={<CampaignIcon />}
                />
                <KPICard
                    title="Campañas Activas"
                    value={summary?.active_campaigns || 0}
                    subtitle={`${summary?.total_campaigns || 0} en total`}
                    color={COLORS.conversion}
                    icon={<SendIcon />}
                />
                <KPICard
                    title="Enlaces Abiertos"
                    value={summary?.opened_count || 0}
                    subtitle={`${summary?.open_rate || 0}% tasa de apertura`}
                    color={COLORS.opened}
                    icon={<OpenIcon />}
                />
                <KPICard
                    title="Canjeados"
                    value={summary?.redeemed_count || 0}
                    subtitle={`${summary?.conversion_rate || 0}% conversión`}
                    color={COLORS.redeemed}
                    icon={<RedeemIcon />}
                />
            </Grid>

            {/* Charts Row */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Leads Over Time Chart */}
                <Grid item xs={12} lg={8}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                📈 Leads Capturados
                            </Typography>
                            {timeseries && timeseries.length > 0 ? (
                                <Box sx={{ height: 300 }}>
                                    <Bar
                                        data={{
                                            labels: timeseries.map((t: any) => {
                                                const date = new Date(t.date);
                                                return `${date.getDate()}/${date.getMonth() + 1}`;
                                            }),
                                            datasets: [
                                                {
                                                    label: 'Email',
                                                    data: timeseries.map((t: any) => t.emails || 0),
                                                    backgroundColor: alpha(COLORS.email, 0.7),
                                                    borderRadius: 4,
                                                },
                                                {
                                                    label: 'Teléfono',
                                                    data: timeseries.map((t: any) => t.phones || 0),
                                                    backgroundColor: alpha(COLORS.phone, 0.7),
                                                    borderRadius: 4,
                                                },
                                            ],
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: { position: 'top' as const },
                                            },
                                            scales: {
                                                x: { stacked: true },
                                                y: { stacked: true, beginAtZero: true },
                                            },
                                        }}
                                    />
                                </Box>
                            ) : (
                                <EmptyChart message="Sin datos en este período" />
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Channel Breakdown */}
                <Grid item xs={12} lg={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                📱 Canales de Captura
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <ChannelBar
                                    label="Email"
                                    value={breakdowns?.channels?.email || 0}
                                    total={summary?.total_leads || 1}
                                    color={COLORS.email}
                                    icon={<EmailIcon fontSize="small" />}
                                />
                                <ChannelBar
                                    label="Teléfono"
                                    value={breakdowns?.channels?.phone || 0}
                                    total={summary?.total_leads || 1}
                                    color={COLORS.phone}
                                    icon={<PhoneIcon fontSize="small" />}
                                />
                            </Box>

                            <Typography variant="h6" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
                                💾 Método de Guardado
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <ChannelBar
                                    label="WhatsApp"
                                    value={breakdowns?.saveMethods?.whatsapp || 0}
                                    total={summary?.total_claims || 1}
                                    color={COLORS.whatsapp}
                                    icon={<WhatsAppIcon fontSize="small" />}
                                />
                                <ChannelBar
                                    label="Directo"
                                    value={breakdowns?.saveMethods?.direct || 0}
                                    total={summary?.total_claims || 1}
                                    color="#6b7280"
                                    icon={<SendIcon fontSize="small" />}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Campaigns Table */}
            <Card>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        🎯 Rendimiento por Campaña
                    </Typography>
                    {campaigns && campaigns.length > 0 ? (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Campaña</TableCell>
                                        <TableCell>Tipo</TableCell>
                                        <TableCell align="center">Estado</TableCell>
                                        <TableCell align="right">Leads</TableCell>
                                        <TableCell align="right">Abiertos</TableCell>
                                        <TableCell align="right">Canjeados</TableCell>
                                        <TableCell align="right">Conversión</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {campaigns.map((campaign: any) => {
                                        const typeInfo = CAMPAIGN_TYPES[campaign.type as keyof typeof CAMPAIGN_TYPES] || { label: campaign.type, color: '#6b7280', emoji: '📋' };
                                        return (
                                            <TableRow key={campaign.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {campaign.name}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={`${typeInfo.emoji} ${typeInfo.label}`}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: alpha(typeInfo.color, 0.1),
                                                            color: typeInfo.color,
                                                            fontWeight: 600,
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={campaign.is_active ? 'Activa' : 'Pausada'}
                                                        size="small"
                                                        color={campaign.is_active ? 'success' : 'default'}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography fontWeight={600}>{campaign.leads || 0}</Typography>
                                                </TableCell>
                                                <TableCell align="right">{campaign.opened || 0}</TableCell>
                                                <TableCell align="right">{campaign.redeemed || 0}</TableCell>
                                                <TableCell align="right">
                                                    <Typography
                                                        sx={{
                                                            color: parseFloat(campaign.conversion_rate) > 0 ? COLORS.redeemed : 'text.secondary',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {campaign.conversion_rate}%
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                            <CampaignIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                            <Typography>No hay campañas creadas aún</Typography>
                            <Typography variant="body2">Crea tu primera campaña en la sección de Marketing</Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function KPICard({ title, value, subtitle, color, icon }: {
    title: string;
    value: number;
    subtitle: string;
    color: string;
    icon: React.ReactElement;
}) {
    return (
        <Grid item xs={6} sm={3}>
            <Card
                sx={{
                    height: '100%',
                    background: `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(color, 0.02)} 100%)`,
                    border: `1px solid ${alpha(color, 0.15)}`,
                    transition: 'all 0.25s ease',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: `0 12px 28px ${alpha(color, 0.2)}`,
                    },
                }}
            >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Box
                            sx={{
                                p: 0.75,
                                borderRadius: 2,
                                bgcolor: alpha(color, 0.12),
                                color: color,
                                display: 'flex',
                            }}
                        >
                            {icon}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                            {title}
                        </Typography>
                    </Box>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 800,
                            color: color,
                            mb: 0.5,
                            lineHeight: 1.1,
                            fontSize: { xs: '1.5rem', md: '1.75rem' },
                        }}
                    >
                        {value.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                        {subtitle}
                    </Typography>
                </CardContent>
            </Card>
        </Grid>
    );
}

function ChannelBar({ label, value, total, color, icon }: {
    label: string;
    value: number;
    total: number;
    color: string;
    icon: React.ReactElement;
}) {
    const percentage = total > 0 ? (value / total * 100).toFixed(0) : 0;
    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color }}>
                    {icon}
                    <Typography variant="body2" fontWeight={500}>{label}</Typography>
                </Box>
                <Typography variant="body2" fontWeight={600}>{value} ({percentage}%)</Typography>
            </Box>
            <Box sx={{ height: 8, bgcolor: alpha(color, 0.1), borderRadius: 1, overflow: 'hidden' }}>
                <Box
                    sx={{
                        height: '100%',
                        width: `${percentage}%`,
                        bgcolor: color,
                        borderRadius: 1,
                        transition: 'width 0.3s ease',
                    }}
                />
            </Box>
        </Box>
    );
}

function EmptyChart({ message }: { message: string }) {
    return (
        <Box
            sx={{
                height: 300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'action.hover',
                borderRadius: 2,
            }}
        >
            <Typography color="text.secondary">{message}</Typography>
        </Box>
    );
}

function LoadingState() {
    return (
        <Box>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {[...Array(4)].map((_, i) => (
                    <Grid item xs={6} sm={3} key={i}>
                        <Skeleton variant="rounded" height={120} />
                    </Grid>
                ))}
            </Grid>
            <Grid container spacing={3}>
                <Grid item xs={12} lg={8}>
                    <Skeleton variant="rounded" height={350} />
                </Grid>
                <Grid item xs={12} lg={4}>
                    <Skeleton variant="rounded" height={350} />
                </Grid>
            </Grid>
        </Box>
    );
}
