// apps/admin/src/components/analytics/SummaryKPIs.tsx
import { Grid, Card, CardContent, Typography, Box, alpha } from '@mui/material';
import type { SvgIconProps } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PersonIcon from '@mui/icons-material/Person';

interface Props {
    data: {
        // Support both camelCase and snake_case from backend
        totalViews?: number;
        total_views?: number;
        uniqueVisitors?: number;
        unique_visitors?: number;
        totalSessions?: number;
        total_sessions?: number;
        avgSessionDuration?: number;
        avg_session_duration?: number;
        dishViews?: number;
        dish_views?: number;
        favorites?: number;
        ratings?: number;
        shares?: number;
        avgDishViewDuration?: number;
        avg_dish_view_duration?: number;
        avgSectionTime?: number;
        avgScrollDepth?: number;
        // ✅ NEW: Visitor recurrence from backend
        new_visitors?: number;
        returning_visitors?: number;
    };
    timeRange: string;
    cartMetrics?: {
        totalCarts?: number;
        total_carts_created?: number;
        totalItems?: number;
        total_items_added?: number;
        avgValue?: number;
        avg_cart_value?: number;
    };
}

type IconComponent = React.ComponentType<SvgIconProps>;

interface KpiItem {
    title: string;
    value: string;
    Icon: IconComponent;
    color: string;
    subtitle: string;
    emoji: string;
}

export default function SummaryKPIs({ data, cartMetrics }: Props) {
    // Normalize data to handle both snake_case and camelCase
    const totalSessions = data?.totalSessions || data?.total_sessions || 0;
    const uniqueVisitors = data?.uniqueVisitors || data?.unique_visitors || 0;
    const avgSessionDuration = data?.avgSessionDuration || data?.avg_session_duration || 0;
    const dishViews = data?.dishViews || data?.dish_views || 0;
    const favorites = data?.favorites || 0;
    const avgDishViewDuration = data?.avgDishViewDuration || data?.avg_dish_view_duration || 0;
    // ✅ NEW: Get returning visitors from backend
    const returningVisitors = data?.returning_visitors || 0;

    const cartTotalItems = cartMetrics?.totalItems || cartMetrics?.total_items_added || 0;
    const cartAvgValue = cartMetrics?.avgValue || cartMetrics?.avg_cart_value || 0;

    // Calculate derived metrics
    const avgSessionMinutes = (avgSessionDuration / 60).toFixed(1);
    const dishesPerSession = totalSessions > 0
        ? (dishViews / totalSessions).toFixed(1)
        : '0';
    const engagementRate = dishViews > 0
        ? ((favorites + cartTotalItems) / dishViews * 100).toFixed(1)
        : '0.0';
    // ✅ FIX: Use returning_visitors from backend instead of incorrect formula
    const returnRate = uniqueVisitors > 0
        ? ((returningVisitors / uniqueVisitors) * 100).toFixed(0)
        : '0';

    const kpis: KpiItem[] = [
        {
            title: 'Visitantes Únicos',
            value: uniqueVisitors.toLocaleString(),
            Icon: PersonIcon,
            color: '#6366f1',
            subtitle: `${totalSessions.toLocaleString()} sesiones totales`,
            emoji: '👥'
        },
        {
            title: 'Tiempo Medio',
            value: `${avgSessionMinutes} min`,
            Icon: AccessTimeIcon,
            color: '#22c55e',
            subtitle: `${avgDishViewDuration.toFixed(1)}s por plato`,
            emoji: '⏱️'
        },
        {
            title: 'Platos por Sesión',
            value: dishesPerSession,
            Icon: RestaurantMenuIcon,
            color: '#f59e0b',
            subtitle: `${dishViews.toLocaleString()} vistas totales`,
            emoji: '🍽️'
        },
        {
            title: 'Tasa de Engagement',
            value: `${engagementRate}%`,
            Icon: FavoriteIcon,
            color: '#ec4899',
            subtitle: `${favorites} favoritos`,
            emoji: '💖'
        },
        {
            title: 'Añadidos al Carrito',
            value: cartTotalItems.toLocaleString(),
            Icon: ShoppingCartIcon,
            color: '#14b8a6',
            subtitle: cartAvgValue > 0 ? `€${cartAvgValue.toFixed(2)} valor medio` : 'Sin datos',
            emoji: '🛒'
        },
        {
            title: 'Tasa de Retorno',
            value: `${returnRate}%`,
            Icon: VisibilityIcon,
            color: '#8b5cf6',
            subtitle: `${returningVisitors} Visitantes recurrentes`,
            emoji: '🔄'
        },
    ];

    return (
        <Grid container spacing={2} sx={{ mb: 3 }}>


            {kpis.map((kpi, idx) => (
                <Grid item xs={6} sm={4} md={2} key={idx}>
                    <Card
                        sx={{
                            height: '100%',
                            background: `linear-gradient(135deg, ${alpha(kpi.color, 0.08)} 0%, ${alpha(kpi.color, 0.02)} 100%)`,
                            border: `1px solid ${alpha(kpi.color, 0.15)}`,
                            transition: 'all 0.25s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: `0 12px 28px ${alpha(kpi.color, 0.2)}`,
                                borderColor: alpha(kpi.color, 0.3),
                            }
                        }}
                    >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <Box sx={{
                                    p: 0.75,
                                    borderRadius: 2,
                                    bgcolor: alpha(kpi.color, 0.12),
                                    color: kpi.color,
                                    display: 'flex',
                                    boxShadow: `0 2px 8px ${alpha(kpi.color, 0.15)}`
                                }}>
                                    <kpi.Icon sx={{ fontSize: 18 }} />
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                                    {kpi.title}
                                </Typography>
                            </Box>
                            <Typography
                                variant="h4"
                                sx={{
                                    fontWeight: 800,
                                    color: kpi.color,
                                    mb: 0.5,
                                    lineHeight: 1.1,
                                    fontSize: { xs: '1.5rem', md: '1.75rem' }
                                }}
                            >
                                {kpi.value}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', lineHeight: 1.3 }}>
                                {kpi.subtitle}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
}
