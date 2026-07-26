// apps/admin/src/components/analytics/AttributionPanel.tsx
// De dónde llegan los clientes al menú: guidebook de un alojamiento, TV de la
// habitación, QR físico o acceso directo. Es el bucle que antes no se podía
// cerrar: la sesión de menú no guardaba ninguna referencia al apartamento de
// origen, así que era imposible responder "cuántos clientes me manda este piso".
import { Card, CardContent, Typography, Box, alpha, Stack, Chip, Tooltip, LinearProgress } from '@mui/material';
import RouteIcon from '@mui/icons-material/Route';
import ApartmentIcon from '@mui/icons-material/Apartment';
import TvIcon from '@mui/icons-material/Tv';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import LanguageIcon from '@mui/icons-material/Language';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

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

interface Props {
    attribution: AttributionRow[];
    topApartments: TopApartmentRow[];
}

const SOURCE_META: Record<string, { label: string; color: string; icon: JSX.Element }> = {
    guide: { label: 'Guidebook', color: '#0ea5e9', icon: <ApartmentIcon sx={{ fontSize: 16 }} /> },
    tv: { label: 'TV del alojamiento', color: '#8b5cf6', icon: <TvIcon sx={{ fontSize: 16 }} /> },
    qr: { label: 'QR físico', color: '#f59e0b', icon: <QrCode2Icon sx={{ fontSize: 16 }} /> },
    direct: { label: 'Directo', color: '#64748b', icon: <LanguageIcon sx={{ fontSize: 16 }} /> },
};

function metaFor(source: string) {
    return SOURCE_META[source] ?? { label: source, color: '#64748b', icon: <LanguageIcon sx={{ fontSize: 16 }} /> };
}

export default function AttributionPanel({ attribution, topApartments }: Props) {
    const totalSessions = attribution.reduce((sum, row) => sum + row.sessions, 0);
    const referred = attribution
        .filter(row => row.source !== 'direct')
        .reduce((sum, row) => sum + row.sessions, 0);

    return (
        <Card sx={{
            height: '100%',
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.04) 0%, rgba(139, 92, 246, 0.04) 100%)',
            border: '1px solid rgba(14, 165, 233, 0.12)',
        }}>
            <CardContent sx={{ height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                    <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: alpha('#0ea5e9', 0.12), display: 'flex' }}>
                        <RouteIcon sx={{ color: '#0ea5e9', fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                            Origen del tráfico
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {referred > 0
                                ? `${referred} de ${totalSessions} sesiones vienen de alojamientos`
                                : 'Aún sin sesiones atribuidas'}
                        </Typography>
                    </Box>
                </Box>

                {totalSessions === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <RouteIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary" variant="body2">
                            Sin datos de origen en este periodo
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={2}>
                        {/* Reparto por fuente */}
                        <Stack spacing={1.25}>
                            {attribution.map(row => {
                                const meta = metaFor(row.source);
                                const pct = totalSessions > 0 ? (row.sessions / totalSessions) * 100 : 0;
                                return (
                                    <Box key={row.source}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                            <Stack direction="row" spacing={0.75} alignItems="center">
                                                <Box sx={{ color: meta.color, display: 'flex' }}>{meta.icon}</Box>
                                                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                                    {meta.label}
                                                </Typography>
                                                {row.apartments > 0 && (
                                                    <Chip
                                                        size="small"
                                                        label={`${row.apartments} aloj.`}
                                                        sx={{
                                                            height: 18, fontSize: '0.65rem', fontWeight: 600,
                                                            bgcolor: alpha(meta.color, 0.1), color: meta.color
                                                        }}
                                                    />
                                                )}
                                            </Stack>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: meta.color }}>
                                                {row.sessions} ({pct.toFixed(0)}%)
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={pct}
                                            sx={{
                                                height: 6, borderRadius: 3,
                                                bgcolor: alpha(meta.color, 0.1),
                                                '& .MuiLinearProgress-bar': { bgcolor: meta.color, borderRadius: 3 }
                                            }}
                                        />
                                    </Box>
                                );
                            })}
                        </Stack>

                        {/* Alojamientos que más clientes envían */}
                        {topApartments.length > 0 && (
                            <Box>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Alojamientos que más envían
                                </Typography>
                                <Stack spacing={1} sx={{ mt: 1 }}>
                                    {topApartments.slice(0, 5).map(apt => (
                                        <Tooltip
                                            key={apt.apartment_id}
                                            title={`${apt.visitors} visitantes distintos · ${apt.with_cart} llegaron a montar carrito`}
                                            arrow
                                        >
                                            <Box sx={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                p: 1.25, borderRadius: 2,
                                                bgcolor: alpha('#0ea5e9', 0.06),
                                                border: `1px solid ${alpha('#0ea5e9', 0.1)}`,
                                                cursor: 'default'
                                            }}>
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                                                    <ApartmentIcon sx={{ fontSize: 16, color: '#0ea5e9' }} />
                                                    <Typography variant="caption" noWrap sx={{ fontWeight: 600 }}>
                                                        {apt.name}
                                                    </Typography>
                                                </Stack>
                                                <Stack direction="row" spacing={1.5} alignItems="center">
                                                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#0ea5e9' }}>
                                                        {apt.sessions}
                                                    </Typography>
                                                    {apt.with_cart > 0 && (
                                                        <Stack direction="row" spacing={0.25} alignItems="center">
                                                            <ShoppingCartIcon sx={{ fontSize: 13, color: '#22c55e' }} />
                                                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#22c55e' }}>
                                                                {apt.with_cart}
                                                            </Typography>
                                                        </Stack>
                                                    )}
                                                </Stack>
                                            </Box>
                                        </Tooltip>
                                    ))}
                                </Stack>
                            </Box>
                        )}
                    </Stack>
                )}
            </CardContent>
        </Card>
    );
}
