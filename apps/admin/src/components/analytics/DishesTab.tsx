import { useQuery } from '@tanstack/react-query';
import { Avatar, Box, Typography } from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { MetricsTable, type MetricColumn } from './MetricsTable';

interface DishRow extends Record<string, unknown> {
    dish_id: string;
    name: string;
    image: string | null;
    views: number;
    favorites: number;
    cart_additions: number;
    avg_dwell_seconds: number;
}

const columns: MetricColumn<DishRow>[] = [
    {
        id: 'name', label: 'Plato', render: (row) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar src={row.image || undefined} variant="square" sx={{ width: 44, height: 44 }}>
                    {row.name?.charAt(0)}
                </Avatar>
                <Typography variant="subtitle2">{row.name}</Typography>
            </Box>
        ),
    },
    { id: 'views', label: 'Vistas', align: 'right', tooltip: 'Veces que se ha visto el plato' },
    { id: 'favorites', label: 'Favoritos', align: 'right', tooltip: 'Veces marcado como favorito' },
    { id: 'cart_additions', label: 'Carrito', align: 'right', tooltip: 'Veces añadido al carrito' },
    { id: 'avg_dwell_seconds', label: 'Tiempo medio', align: 'right', tooltip: 'Tiempo medio viendo el plato', render: (row) => `${(row.avg_dwell_seconds || 0).toFixed(1)} s` },
];

export default function DishesTab({ timeRange }: { timeRange: string }) {
    const { currentRestaurant } = useAuth();
    const { data, isLoading, isError } = useQuery({
        queryKey: ['analytics-dishes', currentRestaurant?.id, timeRange],
        queryFn: () => apiClient.getDishAnalytics(currentRestaurant!.id, { timeRange }),
        enabled: !!currentRestaurant?.id,
    });

    return (
        <MetricsTable<DishRow>
            icon={<RestaurantMenuIcon />}
            title="Rendimiento de platos"
            subtitle="Cómo interactúan los clientes con cada plato de la carta."
            rows={data?.data}
            columns={columns}
            rowKey={(row) => row.dish_id}
            initialSort="views"
            loading={isLoading}
            error={isError}
        />
    );
}
