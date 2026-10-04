import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  /** Botones o filtros a la derecha (bajan debajo del título en móvil). */
  actions?: ReactNode;
}

/** Cabecera de pantalla del panel: título en Newsreader (h4 del tema), subtítulo y acciones. */
export function PageHeader({ title, subtitle, icon, actions }: PageHeaderProps) {
  return (
    <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
        {icon && <Box sx={{ display: 'flex', color: 'primary.main', '& svg': { fontSize: 32 } }}>{icon}</Box>}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" component="h1" fontWeight={700}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
      {actions && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>{actions}</Box>}
    </Box>
  );
}
