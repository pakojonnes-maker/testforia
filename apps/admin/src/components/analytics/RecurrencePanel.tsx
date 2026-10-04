// apps/admin/src/components/analytics/RecurrencePanel.tsx
// Visitantes nuevos frente a recurrentes (pestaña KPIs).
import { useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Doughnut } from 'react-chartjs-2';
import type { ChartOptions, TooltipItem } from 'chart.js';
import LoopIcon from '@mui/icons-material/Loop';
import { Panel } from '../common/Panel';
import { DATA } from '../../theme';
import { chartTooltip } from '../../theme/charts';
import { EmptyPanelState } from './RankedList';

interface Props {
    newVisitors: number;
    returningVisitors: number;
    uniqueVisitors: number;
    totalSessions: number;
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', py: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color }}>{value}</Typography>
        </Box>
    );
}

export default function RecurrencePanel({ newVisitors, returningVisitors, uniqueVisitors, totalSessions }: Props) {
    // La tasa de retorno se calcula sobre nuevos+recurrentes, no sobre
    // uniqueVisitors: el backend garantiza que cada visitante cae en un solo cubo.
    const classified = newVisitors + returningVisitors;
    const returnRate = classified > 0 ? (returningVisitors / classified) * 100 : 0;

    const chartData = useMemo(() => ({
        labels: ['Nuevos', 'Recurrentes'],
        datasets: [{
            data: [newVisitors, returningVisitors],
            backgroundColor: [DATA.olive, DATA.cobalt],
            borderColor: '#FFFFFF',
            borderWidth: 2,
            cutout: '72%',
        }],
    }), [newVisitors, returningVisitors]);

    const options = useMemo<ChartOptions<'doughnut'>>(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                ...chartTooltip,
                callbacks: {
                    label: (ctx: TooltipItem<'doughnut'>) =>
                        `${ctx.label}: ${ctx.raw} (${classified > 0 ? ((Number(ctx.raw) / classified) * 100).toFixed(1) : 0} %)`,
                },
            },
        },
    }), [classified]);

    return (
        <Panel icon={<LoopIcon />} title="Recurrencia" subtitle="Visitantes nuevos frente a los que vuelven">
            {classified === 0 ? (
                <EmptyPanelState icon={<LoopIcon />} text="Sin visitantes en este periodo" />
            ) : (
                <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                    <Box sx={{ position: 'relative', width: 140, height: 140, flexShrink: 0, mx: { xs: 'auto', sm: 0 } }}>
                        <Doughnut data={chartData} options={options} />
                        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                            <Typography variant="h4" sx={{ fontWeight: 600, color: DATA.cobalt, lineHeight: 1 }}>
                                {returnRate.toFixed(0)} %
                            </Typography>
                            <Typography variant="caption" color="text.secondary">vuelven</Typography>
                        </Box>
                    </Box>
                    <Stack sx={{ flex: 1, minWidth: 0 }}>
                        <Metric label="Nuevos" value={String(newVisitors)} color={DATA.olive} />
                        <Metric label="Recurrentes" value={String(returningVisitors)} color={DATA.cobalt} />
                        <Metric label="Visitas por persona" value={`${uniqueVisitors > 0 ? (totalSessions / uniqueVisitors).toFixed(1) : '0'}×`} color={DATA.sea} />
                    </Stack>
                </Box>
            )}
        </Panel>
    );
}
