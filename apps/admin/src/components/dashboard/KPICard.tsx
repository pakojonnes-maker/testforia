// apps/admin/src/components/dashboard/KPICard.tsx

import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    Skeleton,
    Tooltip
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Remove as RemoveIcon
} from '@mui/icons-material';
import type { TrendDirection } from '../../types/dashboard';
import { getTrendColor } from '../../lib/utils/dashboardHelpers';

interface KPICardProps {
    title: string;
    value: string | number;
    change?: number; // Percentage change
    trend?: TrendDirection;
    icon?: React.ReactNode;
    loading?: boolean;
    subtitle?: string;
}

export function KPICard({
    title,
    value,
    change,
    trend = 'neutral',
    icon,
    loading,
    subtitle
}: KPICardProps) {
    if (loading) {
        return (
            <Card elevation={2} sx={{ height: '100%' }}>
                <CardContent>
                    <Skeleton variant="text" width="60%" height={24} />
                    <Skeleton variant="text" width="80%" height={48} sx={{ mt: 1 }} />
                    <Skeleton variant="rectangular" width={80} height={24} sx={{ mt: 2, borderRadius: 1 }} />
                </CardContent>
            </Card>
        );
    }

    const trendIcon = trend === 'up'
        ? <TrendingUpIcon fontSize="small" />
        : trend === 'down'
            ? <TrendingDownIcon fontSize="small" />
            : <RemoveIcon fontSize="small" />;

    const trendColor = getTrendColor(trend);

    return (
        <Card
            elevation={2}
            sx={{
                height: '100%',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: (theme) => theme.shadows[8]
                }
            }}
        >
            <CardContent>
                {/* Header with title and optional icon */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            fontSize: '0.75rem'
                        }}
                    >
                        {title}
                    </Typography>
                    {icon && (
                        <Box
                            sx={{
                                color: 'primary.main',
                                opacity: 0.7,
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            {icon}
                        </Box>
                    )}
                </Box>

                {/* Main value */}
                <Typography
                    variant="h3"
                    component="div"
                    sx={{
                        fontWeight: 700,
                        fontSize: { xs: '2rem', sm: '2.5rem' },
                        mb: 1,
                        letterSpacing: '-0.02em'
                    }}
                >
                    {value}
                </Typography>

                {/* Subtitle if provided */}
                {subtitle && (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 1 }}
                    >
                        {subtitle}
                    </Typography>
                )}

                {/* Change indicator */}
                {change !== undefined && (
                    <Tooltip
                        title={`${trend === 'up' ? 'Incremento' : trend === 'down' ? 'Disminución' : 'Sin cambios'} respecto al período anterior`}
                        arrow
                    >
                        <Chip
                            icon={trendIcon}
                            label={`${change > 0 ? '+' : ''}${change.toFixed(1)}%`}
                            size="small"
                            sx={{
                                color: trendColor,
                                bgcolor: (theme) => {
                                    const baseColor = trend === 'up'
                                        ? theme.palette.success.main
                                        : trend === 'down'
                                            ? theme.palette.error.main
                                            : theme.palette.text.secondary;
                                    return `${baseColor}15`;
                                },
                                fontWeight: 600,
                                '& .MuiChip-icon': {
                                    color: trendColor
                                }
                            }}
                        />
                    </Tooltip>
                )}
            </CardContent>
        </Card>
    );
}
