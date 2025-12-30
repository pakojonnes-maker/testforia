// apps/admin/src/components/analytics/ConversionFunnel.tsx
import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, alpha, Stack } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import type { SvgIconProps } from '@mui/material';

interface Props {
    data: {
        totalSessions: number;
        dishViews: number;
        favorites: number;
        cartItems: number;
    };
}

interface Stage {
    label: string;
    value: number;
    color: string;
    Icon: React.ComponentType<SvgIconProps>;
}

export default function ConversionFunnel({ data }: Props) {
    const stages: Stage[] = useMemo(() => [
        { label: 'Sesiones', value: data?.totalSessions || 0, color: '#6366f1', Icon: PeopleIcon },
        { label: 'Vistas de Platos', value: data?.dishViews || 0, color: '#8b5cf6', Icon: VisibilityIcon },
        { label: 'Favoritos', value: data?.favorites || 0, color: '#ec4899', Icon: FavoriteIcon },
        { label: 'Al Carrito', value: data?.cartItems || 0, color: '#22c55e', Icon: ShoppingCartIcon },
    ], [data]);

    const maxValue = Math.max(...stages.map(s => s.value), 1);

    const calculateDropoff = (current: number, next: number) => {
        if (current === 0) return 0;
        return ((current - next) / current * 100).toFixed(0);
    };

    if (stages.every(s => s.value === 0)) {
        return (
            <Card sx={{
                height: '100%',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.1)',
            }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 300 }}>
                    <PeopleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                    <Typography color="text.secondary">Aún no hay datos del funnel</Typography>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{
            height: '100%',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.1)',
        }}>
            <CardContent>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        📊 Funnel de Conversión
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Visualiza cómo se comportan los usuarios en cada paso
                    </Typography>
                </Box>

                <Stack spacing={0}>
                    {stages.map((stage, index) => {
                        const widthPercent = (stage.value / maxValue) * 100;
                        const nextStage = stages[index + 1];
                        const dropoff = nextStage ? calculateDropoff(stage.value, nextStage.value) : null;

                        return (
                            <Box key={stage.label}>
                                {/* Stage bar */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 2,
                                        bgcolor: alpha(stage.color, 0.15),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <stage.Icon sx={{ color: stage.color, fontSize: 20 }} />
                                    </Box>

                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {stage.label}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: stage.color }}>
                                                {stage.value.toLocaleString()}
                                            </Typography>
                                        </Box>
                                        <Box
                                            sx={{
                                                height: 28,
                                                borderRadius: 2,
                                                bgcolor: alpha(stage.color, 0.1),
                                                position: 'relative',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    top: 0,
                                                    height: '100%',
                                                    width: `${Math.max(widthPercent, 2)}%`,
                                                    borderRadius: 2,
                                                    background: `linear-gradient(90deg, ${stage.color}, ${alpha(stage.color, 0.7)})`,
                                                    transition: 'width 0.5s ease-out',
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Dropoff indicator */}
                                {dropoff !== null && Number(dropoff) > 0 && (
                                    <Box sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        ml: 6,
                                        my: 1,
                                        pl: 2
                                    }}>
                                        <Box sx={{
                                            width: 2,
                                            height: 16,
                                            bgcolor: alpha('#ef4444', 0.3),
                                            borderRadius: 1,
                                            mr: 1.5
                                        }} />
                                        <Typography variant="caption" sx={{ color: '#ef4444', fontSize: '0.7rem' }}>
                                            ↓ {dropoff}% abandono
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        );
                    })}
                </Stack>

                {/* Conversion rate summary */}
                <Box sx={{
                    mt: 3,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha('#6366f1', 0.08),
                    border: '1px solid',
                    borderColor: alpha('#6366f1', 0.15)
                }}>
                    <Typography variant="caption" color="text.secondary">
                        📈 <strong>Tasa de conversión total:</strong>{' '}
                        {stages[0].value > 0
                            ? ((stages[stages.length - 1].value / stages[0].value) * 100).toFixed(1)
                            : 0
                        }% de sesiones añaden al carrito
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
}
