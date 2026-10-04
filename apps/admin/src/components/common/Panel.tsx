import type { ReactNode } from 'react';
import { Box, Divider, Paper, Typography, type SxProps, type Theme } from '@mui/material';

interface PanelProps {
  title?: ReactNode;
  icon?: ReactNode;
  subtitle?: ReactNode;
  /** Algo a la derecha del título (un botón, un filtro, un chip). */
  action?: ReactNode;
  children: ReactNode;
  /** Sin relleno interior (tablas que van de borde a borde). */
  flush?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * Bloque del panel con el patrón de las pantallas del guidebook: icono en
 * cobalto, título h6, subtítulo opcional y una línea antes del contenido.
 */
export function Panel({ title, icon, subtitle, action, children, flush, sx }: PanelProps) {
  return (
    <Paper sx={{ p: flush ? 0 : 3, height: '100%', display: 'flex', flexDirection: 'column', ...sx as object }}>
      {title && (
        <Box sx={{ p: flush ? 3 : 0, pb: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: subtitle ? 0.5 : 2, flexWrap: 'wrap' }}>
            {icon && <Box sx={{ display: 'flex', color: 'primary.main' }}>{icon}</Box>}
            <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1 }}>{title}</Typography>
            {action}
          </Box>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {subtitle}
            </Typography>
          )}
          <Divider sx={{ mb: flush ? 0 : 2 }} />
        </Box>
      )}
      <Box sx={{ flexGrow: 1, minHeight: 0 }}>{children}</Box>
    </Paper>
  );
}
