// apps/admin/src/components/analytics/SummaryKPIs.tsx
import { Grid } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PersonIcon from '@mui/icons-material/Person';
import { StatCard } from '../common/StatCard';
import { DATA } from '../../theme';

export interface SummaryData {
    uniqueVisitors: number;
    totalSessions: number;
    avgSessionDuration: number;
    dishViews: number;
    favorites: number;
    avgDishViewDuration: number;
}

export interface CartSummary {
    totalItems: number;
    avgValue: number;
}

const fmt = (n: number) => n.toLocaleString('es-ES');

export default function SummaryKPIs({ data, cartMetrics }: { data: SummaryData; cartMetrics: CartSummary }) {
    const { uniqueVisitors, totalSessions, avgSessionDuration, dishViews, favorites, avgDishViewDuration } = data;
    const dishesPerSession = totalSessions > 0 ? (dishViews / totalSessions).toFixed(1) : '0';
    const engagement = dishViews > 0 ? (((favorites + cartMetrics.totalItems) / dishViews) * 100).toFixed(1) : '0.0';

    const kpis = [
        { title: 'Visitantes únicos', value: fmt(uniqueVisitors), icon: <PersonIcon />, color: DATA.sea, subtitle: `${fmt(totalSessions)} sesiones` },
        { title: 'Tiempo medio', value: `${(avgSessionDuration / 60).toFixed(1)} min`, icon: <AccessTimeIcon />, color: DATA.olive, subtitle: `${avgDishViewDuration.toFixed(1)} s por plato` },
        { title: 'Platos por sesión', value: dishesPerSession, icon: <RestaurantMenuIcon />, color: DATA.terracotta, subtitle: `${fmt(dishViews)} vistas` },
        { title: 'Interacción', value: `${engagement} %`, icon: <FavoriteIcon />, color: DATA.plum, subtitle: `${favorites} favoritos` },
        { title: 'Al carrito', value: fmt(cartMetrics.totalItems), icon: <ShoppingCartIcon />, color: DATA.sand, subtitle: cartMetrics.avgValue > 0 ? `${cartMetrics.avgValue.toFixed(2)} € de media` : 'Sin datos' },
        { title: 'Sesiones', value: fmt(totalSessions), icon: <PeopleIcon />, color: DATA.water, subtitle: `${fmt(uniqueVisitors)} visitantes` },
    ];

    return (
        <Grid container spacing={3}>
            {kpis.map(kpi => (
                <Grid item xs={12} sm={6} md={4} lg={2} key={kpi.title}>
                    <StatCard {...kpi} />
                </Grid>
            ))}
        </Grid>
    );
}
