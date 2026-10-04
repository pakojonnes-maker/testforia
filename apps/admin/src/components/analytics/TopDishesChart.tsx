// apps/admin/src/components/analytics/TopDishesChart.tsx
import { Typography } from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { Panel } from '../common/Panel';
import { DATA } from '../../theme';
import { EmptyPanelState, RankedList } from './RankedList';

interface Dish {
    dish_id: string;
    name: string;
    views: number;
    favorites: number;
}

export default function TopDishesChart({ dishes }: { dishes: Dish[] }) {
    const top = dishes.slice(0, 5);
    const maxViews = Math.max(1, ...top.map(d => d.views));

    return (
        <Panel icon={<RestaurantMenuIcon />} title="Platos más vistos" subtitle="Los que más atraen a tus clientes">
            {top.length === 0 ? (
                <EmptyPanelState icon={<RestaurantMenuIcon />} text="Aún no hay datos de platos" />
            ) : (
                <>
                    <RankedList
                        color={DATA.olive}
                        rows={top.map(d => ({
                            key: d.dish_id,
                            label: d.name,
                            value: d.views.toLocaleString('es-ES'),
                            detail: d.favorites > 0 ? `${d.favorites} fav.` : 'vistas',
                            percent: (d.views / maxViews) * 100,
                        }))}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
                        <strong>{top[0].name}</strong> es tu plato estrella: es buen candidato para destacarlo en la carta.
                    </Typography>
                </>
            )}
        </Panel>
    );
}
