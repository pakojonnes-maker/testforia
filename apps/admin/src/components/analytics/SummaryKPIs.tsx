// apps/admin/src/components/analytics/SummaryKPIs.tsx
import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';

interface Props {
    data: {
        totalViews: number;
        uniqueVisitors: number;
        totalSessions: number;
        avgSessionDuration: number;
        dishViews: number;
        favorites: number;
        ratings: number;
        shares: number;
    };
    timeRange: string;
}

export default function SummaryKPIs({ data, timeRange }: Props) {
    const avgSessionMinutes = ((data?.avgSessionDuration || 0) / 60).toFixed(1);
    const engagementRate = (data?.dishViews || 0) > 0
        ? (((data?.favorites || 0) + (data?.shares || 0)) / (data?.dishViews || 1) * 100).toFixed(1)
        : '0.0';

    const kpis = [
        {
            title: 'Visitas Totales',
            value: (data?.totalViews || 0).toLocaleString(),
            color: 'primary.main',
            subtitle: `${(data?.uniqueVisitors || 0).toLocaleString()} únicos`,
        },
        {
            title: 'Sesiones',
            value: (data?.totalSessions || 0).toLocaleString(),
            color: 'info.main',
            subtitle: `${avgSessionMinutes} min promedio`,
        },
        {
            title: 'Engagement',
            value: `${engagementRate}%`,
            color: 'success.main',
            subtitle: `${(data?.favorites || 0)} favoritos`,
        },
        {
            title: 'Interacciones',
            value: ((data?.favorites || 0) + (data?.ratings || 0) + (data?.shares || 0)).toLocaleString(),
            color: 'warning.main',
            subtitle: `${(data?.ratings || 0)} valoraciones`,
        },
    ];

    return (
        <Grid container spacing={3} sx={{ mb: 4 }}>
            {kpis.map((kpi, idx) => (
                <Grid item xs={12} sm={6} md={3} key={idx}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                {kpi.title}
                            </Typography>
                            <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: kpi.color, mb: 1 }}>
                                {kpi.value}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {kpi.subtitle}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
}
