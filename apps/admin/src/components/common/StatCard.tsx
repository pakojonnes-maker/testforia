import type { ReactNode } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';

interface StatCardProps {
  icon?: ReactNode;
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  /** Un color de DATA (theme/index.ts): se lee como texto sobre el papel. */
  color: string;
}

/**
 * Tarjeta de cifra del panel (la del dashboard del guidebook, compartida ahora
 * por las pantallas de restaurantes): tinte suave del color, icono y la cifra
 * en ese color.
 */
export function StatCard({ icon, title, value, subtitle, color }: StatCardProps) {
  return (
    <Card sx={{
      height: '100%',
      background: `linear-gradient(135deg, ${color}15, ${color}08)`,
      borderColor: `${color}30`,
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${color}20`, borderColor: color },
    }}>
      <CardContent sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          {icon && (
            <Box sx={{ p: 1, background: `${color}20`, color, display: 'flex', alignItems: 'center' }}>
              {icon}
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" fontWeight={700} sx={{ color }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
