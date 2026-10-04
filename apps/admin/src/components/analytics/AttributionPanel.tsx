// apps/admin/src/components/analytics/AttributionPanel.tsx
// De dónde llegan los clientes al menú: guidebook de un alojamiento, TV de la
// habitación, QR físico o acceso directo. Es el bucle que antes no se podía
// cerrar: la sesión de menú no guardaba ninguna referencia al apartamento de
// origen, así que era imposible responder "cuántos clientes me manda este piso".
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import RouteIcon from '@mui/icons-material/Route';
import { Panel } from '../common/Panel';
import { DATA } from '../../theme';
import { EmptyPanelState, RankedList } from './RankedList';

export interface AttributionRow {
    source: string;
    sessions: number;
    apartments: number;
    with_cart: number;
}

export interface TopApartmentRow {
    apartment_id: string;
    name: string;
    sessions: number;
    visitors: number;
    with_cart: number;
}

const SOURCE_META: Record<string, { label: string; color: string }> = {
    guide: { label: 'Guidebook', color: DATA.cobalt },
    tv: { label: 'TV del alojamiento', color: DATA.plum },
    qr: { label: 'QR físico', color: DATA.sand },
    direct: { label: 'Directo', color: DATA.muted },
};

const metaFor = (source: string) => SOURCE_META[source] ?? { label: source, color: DATA.muted };

export default function AttributionPanel({ attribution, topApartments }: {
    attribution: AttributionRow[];
    topApartments: TopApartmentRow[];
}) {
    const totalSessions = attribution.reduce((sum, row) => sum + row.sessions, 0);
    const referred = attribution.filter(row => row.source !== 'direct').reduce((sum, row) => sum + row.sessions, 0);

    return (
        <Panel
            icon={<RouteIcon />}
            title="Origen del tráfico"
            subtitle={referred > 0 ? `${referred} de ${totalSessions} sesiones vienen de alojamientos` : 'Aún sin sesiones atribuidas'}
        >
            {totalSessions === 0 ? (
                <EmptyPanelState icon={<RouteIcon />} text="Sin datos de origen en este periodo" />
            ) : (
                <Stack spacing={3}>
                    <RankedList
                        color={DATA.muted}
                        rows={attribution.map(row => {
                            const meta = metaFor(row.source);
                            const pct = (row.sessions / totalSessions) * 100;
                            return {
                                key: row.source,
                                label: row.apartments > 0 ? `${meta.label} · ${row.apartments} aloj.` : meta.label,
                                value: row.sessions,
                                detail: `${pct.toFixed(0)} %`,
                                percent: pct,
                                color: meta.color,
                            };
                        })}
                    />

                    {topApartments.length > 0 && (
                        <Box>
                            <Typography variant="overline" color="text.secondary">Alojamientos que más envían</Typography>
                            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                {topApartments.slice(0, 5).map(apt => (
                                    <Tooltip
                                        key={apt.apartment_id}
                                        title={`${apt.visitors} visitantes distintos · ${apt.with_cart} llegaron a montar carrito`}
                                    >
                                        <Box sx={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            py: 1, borderBottom: 1, borderColor: 'divider', cursor: 'default',
                                        }}>
                                            <Typography variant="body2" noWrap sx={{ fontWeight: 500, minWidth: 0 }}>{apt.name}</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: DATA.cobalt, flexShrink: 0, ml: 2 }}>
                                                {apt.sessions}
                                                {apt.with_cart > 0 && (
                                                    <Typography component="span" variant="caption" sx={{ color: DATA.olive, ml: 1 }}>
                                                        {apt.with_cart} con carrito
                                                    </Typography>
                                                )}
                                            </Typography>
                                        </Box>
                                    </Tooltip>
                                ))}
                            </Stack>
                        </Box>
                    )}
                </Stack>
            )}
        </Panel>
    );
}
