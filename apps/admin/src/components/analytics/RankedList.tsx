import type { ReactNode } from 'react';
import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

export interface RankedRow {
  key: string;
  label: ReactNode;
  /** Cifra a la derecha (en el color de la fila). */
  value: ReactNode;
  /** Texto pequeño junto a la cifra. */
  detail?: ReactNode;
  /** 0–100: largo de la barra. */
  percent: number;
  /** Color de la barra y la cifra; por defecto el del componente. */
  color?: string;
}

/** Lista ordenada con barra proporcional: top platos, ciudades, origen del tráfico. */
export function RankedList({ rows, color }: { rows: RankedRow[]; color: string }) {
  return (
    <Stack spacing={1.75}>
      {rows.map((row, index) => {
        const c = row.color ?? color;
        return (
          <Box key={row.key}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2, mb: 0.5 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: index === 0 ? 700 : 500, minWidth: 0 }}>
                {row.label}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexShrink: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: c }}>{row.value}</Typography>
                {row.detail && <Typography variant="caption" color="text.secondary">{row.detail}</Typography>}
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.max(0, Math.min(100, row.percent))}
              sx={{
                height: 6,
                bgcolor: alpha(c, 0.1),
                '& .MuiLinearProgress-bar': { bgcolor: index === 0 ? c : alpha(c, 0.6) },
              }}
            />
          </Box>
        );
      })}
    </Stack>
  );
}

/** Estado vacío de un panel de analítica. */
export function EmptyPanelState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <Box sx={{ py: 5, textAlign: 'center', color: 'text.disabled', '& svg': { fontSize: 44, mb: 1 } }}>
      {icon}
      <Typography color="text.secondary" variant="body2">{text}</Typography>
    </Box>
  );
}
