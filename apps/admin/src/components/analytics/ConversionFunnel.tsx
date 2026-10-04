// apps/admin/src/components/analytics/ConversionFunnel.tsx
// Embudo sesión → plato visto → favorito → carrito.
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { Panel } from '../common/Panel';
import { DATA } from '../../theme';
import { EmptyPanelState } from './RankedList';

interface Props {
    data: { totalSessions: number; dishViews: number; favorites: number; cartItems: number };
}

export default function ConversionFunnel({ data }: Props) {
    const stages = [
        { label: 'Sesiones', value: data.totalSessions, color: DATA.sea },
        { label: 'Vistas de platos', value: data.dishViews, color: DATA.cobalt },
        { label: 'Favoritos', value: data.favorites, color: DATA.plum },
        { label: 'Al carrito', value: data.cartItems, color: DATA.olive },
    ];
    const max = Math.max(1, ...stages.map(s => s.value));
    const conversion = data.totalSessions > 0 ? ((data.cartItems / data.totalSessions) * 100).toFixed(1) : '0';

    return (
        <Panel icon={<FilterAltIcon />} title="Embudo de conversión" subtitle="Cómo avanzan los clientes por la carta">
            {stages.every(s => s.value === 0) ? (
                <EmptyPanelState icon={<FilterAltIcon />} text="Aún no hay datos del embudo" />
            ) : (
                <>
                    <Stack spacing={1}>
                        {stages.map((stage, i) => {
                            const next = stages[i + 1];
                            const drop = next && stage.value > 0 ? Math.round(((stage.value - next.value) / stage.value) * 100) : 0;
                            return (
                                <Box key={stage.label}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{stage.label}</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: stage.color }}>
                                            {stage.value.toLocaleString('es-ES')}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ height: 24, bgcolor: alpha(stage.color, 0.08) }}>
                                        <Box sx={{ height: '100%', width: `${Math.max((stage.value / max) * 100, 2)}%`, bgcolor: stage.color, transition: 'width 0.5s ease-out' }} />
                                    </Box>
                                    {next && drop > 0 && (
                                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                                            ↓ {drop} % no sigue
                                        </Typography>
                                    )}
                                </Box>
                            );
                        })}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                        <strong>Conversión total:</strong> {conversion} % de las sesiones añaden algo al carrito.
                    </Typography>
                </>
            )}
        </Panel>
    );
}
