// apps/admin/src/components/analytics/RecommendationsPanel.tsx
import React, { useMemo } from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemIcon, ListItemText, Alert, Box } from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';

interface Props {
    data: any;
}

export default function RecommendationsPanel({ data }: Props) {
    const recommendations = useMemo(() => {
        const recs = [];
        const { summary, topDishes = [], breakdowns = {} } = data;

        // Platos estrella
        const starDishes = topDishes.filter((d: any) => d.favorites > 5 && d.views > 50);
        if (starDishes.length > 0) {
            recs.push({
                type: 'success',
                icon: <TrendingUpIcon />,
                text: `Promociona tus ${starDishes.length} platos estrella con alto engagement`,
            });
        }

        // Optimización móvil
        const mobileUsers = breakdowns.devices?.find((d: any) => d.key === 'mobile')?.count || 0;
        const totalUsers = summary.totalSessions || 1;
        if (mobileUsers / totalUsers > 0.7) {
            recs.push({
                type: 'info',
                icon: <InfoIcon />,
                text: 'El 70%+ de usuarios son móviles - asegúrate de que las imágenes carguen rápido',
            });
        }

        // Bajo engagement
        if (summary.favorites < summary.dishViews * 0.05) {
            recs.push({
                type: 'warning',
                icon: <WarningIcon />,
                text: 'Bajo engagement: considera mejorar fotos y descripciones de platos',
            });
        }

        // Sin datos
        if (summary.totalViews === 0) {
            recs.push({
                type: 'info',
                icon: <InfoIcon />,
                text: 'Comparte tu menú digital con códigos QR en mesas y redes sociales',
            });
        }

        return recs;
    }, [data]);

    return (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <LightbulbIcon color="warning" />
                    <Typography variant="h6">Recomendaciones</Typography>
                </Box>
                <List dense>
                    {recommendations.map((rec, index) => (
                        <ListItem key={index} sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                {rec.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={rec.text}
                                primaryTypographyProps={{ variant: 'body2' }}
                            />
                        </ListItem>
                    ))}
                </List>
            </CardContent>
        </Card>
    );
}
