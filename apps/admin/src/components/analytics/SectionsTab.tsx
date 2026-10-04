import { useQuery } from '@tanstack/react-query';
import { Typography } from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { MetricsTable, type MetricColumn } from './MetricsTable';

interface SectionRow extends Record<string, unknown> {
    section_id: string;
    name: string;
    views: number;
    dish_views: number;
    avg_dwell_seconds: number;
    avg_scroll_depth: number;
}

const columns: MetricColumn<SectionRow>[] = [
    { id: 'name', label: 'Sección', render: (row) => <Typography variant="subtitle2">{row.name}</Typography> },
    { id: 'views', label: 'Vistas de sección', align: 'right', tooltip: 'Veces que se ha visto la sección' },
    { id: 'dish_views', label: 'Vistas de platos', align: 'right', tooltip: 'Vistas de platos dentro de la sección' },
    { id: 'avg_dwell_seconds', label: 'Tiempo medio', align: 'right', tooltip: 'Tiempo medio en la sección', render: (row) => (row.avg_dwell_seconds > 0 ? `${row.avg_dwell_seconds.toFixed(1)} s` : '—') },
    { id: 'avg_scroll_depth', label: 'Profundidad', align: 'right', tooltip: 'Porcentaje medio de la sección recorrido', render: (row) => (row.avg_scroll_depth > 0 ? `${row.avg_scroll_depth.toFixed(0)} %` : '—') },
];

export default function SectionsTab({ timeRange }: { timeRange: string }) {
    const { currentRestaurant } = useAuth();
    const { data, isLoading, isError } = useQuery({
        queryKey: ['analytics-sections', currentRestaurant?.id, timeRange],
        queryFn: () => apiClient.getSectionAnalytics(currentRestaurant!.id, { timeRange }),
        enabled: !!currentRestaurant?.id,
    });

    return (
        <MetricsTable<SectionRow>
            icon={<ViewListIcon />}
            title="Rendimiento de secciones"
            subtitle="Qué partes de la carta atraen más atención."
            rows={data?.data}
            columns={columns}
            rowKey={(row) => row.section_id}
            initialSort="views"
            loading={isLoading}
            error={isError}
        />
    );
}
