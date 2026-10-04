// apps/admin/src/components/analytics/HourlyTrafficChart.tsx
// Sesiones por hora local del visitante. Más intensidad = más actividad; la
// hora pico va en terracota.
import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import type { ChartOptions, TooltipItem } from 'chart.js';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Panel } from '../common/Panel';
import { DATA } from '../../theme';
import { chartGrid, chartTicks, chartTooltip, withAlpha } from '../../theme/charts';

function period(hour: number) {
    if (hour >= 12 && hour < 16) return ' (comida)';
    if (hour >= 19 && hour < 24) return ' (cena)';
    if (hour >= 6 && hour < 12) return ' (mañana)';
    return '';
}

const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            ...chartTooltip,
            displayColors: false,
            callbacks: {
                label: (ctx: TooltipItem<'bar'>) => `${ctx.raw} sesiones${period(ctx.dataIndex)}`,
            },
        },
    },
    scales: {
        x: {
            grid: { display: false },
            border: { display: false },
            ticks: { ...chartTicks, maxRotation: 0, callback: (_: unknown, index: number) => ([0, 6, 12, 18].includes(index) ? `${index} h` : '') },
        },
        y: { grid: chartGrid, ticks: { ...chartTicks, precision: 0 }, border: { display: false }, beginAtZero: true },
    },
};

export default function HourlyTrafficChart({ data }: { data: Array<{ hour: string; sessions: number }> }) {
    const { chartData, peakHour } = useMemo(() => {
        const hourly = Array.from({ length: 24 }, (_, i) => data.find(d => parseInt(d.hour, 10) === i)?.sessions ?? 0);
        const max = Math.max(...hourly);
        const peak = max > 0 ? hourly.indexOf(max) : null;
        return {
            peakHour: peak,
            chartData: {
                labels: hourly.map((_, i) => `${String(i).padStart(2, '0')}:00`),
                datasets: [{
                    label: 'Sesiones',
                    data: hourly,
                    backgroundColor: hourly.map((v, i) =>
                        i === peak ? DATA.terracotta : withAlpha(DATA.cobalt, v === 0 ? 0.12 : 0.3 + 0.6 * (v / (max || 1)))),
                    borderSkipped: false,
                }],
            },
        };
    }, [data]);

    return (
        <Panel
            icon={<AccessTimeIcon />}
            title="Horas pico"
            subtitle="Para programar promociones cuando hay más actividad"
            action={peakHour !== null && (
                <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="overline" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>Hora pico</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: DATA.terracotta }}>
                        {String(peakHour).padStart(2, '0')}:00
                    </Typography>
                </Box>
            )}
        >
            <Box sx={{ height: 250 }}>
                <Bar data={chartData} options={options} />
            </Box>
        </Panel>
    );
}
