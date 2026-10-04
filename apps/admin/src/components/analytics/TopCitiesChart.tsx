// apps/admin/src/components/analytics/TopCitiesChart.tsx
import { Typography } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Panel } from '../common/Panel';
import { DATA } from '../../theme';
import { EmptyPanelState, RankedList } from './RankedList';

interface CityData {
    key: string;
    count: number;
}

const cityName = (city: string) =>
    !city || city === 'unknown' ? 'Ubicación desconocida' : city.charAt(0).toUpperCase() + city.slice(1);

/**
 * @param totalSessions denominador de los porcentajes: TODAS las sesiones del
 *   periodo. Antes se usaba la suma de las seis ciudades mostradas, así que los
 *   porcentajes salían inflados en cuanto había más de seis.
 */
export default function TopCitiesChart({ cities, totalSessions }: { cities: CityData[]; totalSessions: number }) {
    const top = cities.slice(0, 6);
    const total = Math.max(totalSessions, top.reduce((sum, c) => sum + c.count, 0), 1);

    return (
        <Panel icon={<LocationOnIcon />} title="Origen de clientes" subtitle="Ciudad desde la que abren la carta">
            {top.length === 0 ? (
                <EmptyPanelState icon={<LocationOnIcon />} text="Aún no hay datos de ubicación" />
            ) : (
                <>
                    <RankedList
                        color={DATA.water}
                        rows={top.map(c => ({
                            key: c.key,
                            label: cityName(c.key),
                            value: `${((c.count / total) * 100).toFixed(1)} %`,
                            detail: `(${c.count})`,
                            percent: (c.count / total) * 100,
                        }))}
                    />
                    {top[0].key !== 'unknown' && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
                            La mayoría de tus clientes vienen de <strong>{cityName(top[0].key)}</strong>.
                        </Typography>
                    )}
                </>
            )}
        </Panel>
    );
}
