// apps/admin/src/components/analytics/TopDishesChart.tsx
import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress, alpha, Chip, Stack } from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

interface Dish {
    dish_id: string;
    name: string;
    views: number;
    favorites: number;
}

interface Props {
    dishes: Dish[];
}

export default function TopDishesChart({ dishes }: Props) {
    const topDishes = dishes?.slice(0, 5) || [];
    const maxViews = topDishes.length > 0 ? Math.max(...topDishes.map(d => d.views)) : 1;

    if (topDishes.length === 0) {
        return (
            <Card sx={{
                height: '100%',
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.03) 0%, rgba(16, 185, 129, 0.03) 100%)',
                border: '1px solid rgba(34, 197, 94, 0.1)',
            }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 300 }}>
                    <RestaurantMenuIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                    <Typography color="text.secondary">Aún no hay datos de platos</Typography>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{
            height: '100%',
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.03) 0%, rgba(16, 185, 129, 0.03) 100%)',
            border: '1px solid rgba(34, 197, 94, 0.1)',
        }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <RestaurantMenuIcon sx={{ color: '#22c55e' }} />
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            🍽️ Top Platos Populares
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Los platos que más atraen a tus clientes
                        </Typography>
                    </Box>
                </Box>

                <Stack spacing={2}>
                    {topDishes.map((dish, index) => {
                        const progress = (dish.views / maxViews) * 100;
                        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

                        return (
                            <Box key={dish.dish_id}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontSize: '1.1rem' }}>{medals[index]}</Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight: index === 0 ? 700 : 500,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {dish.name}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                                        <Chip
                                            icon={<VisibilityIcon sx={{ fontSize: '14px !important' }} />}
                                            label={dish.views}
                                            size="small"
                                            sx={{
                                                bgcolor: alpha('#6366f1', 0.1),
                                                color: '#818cf8',
                                                fontSize: '0.7rem',
                                                height: 24,
                                                '& .MuiChip-icon': { color: '#818cf8', ml: 0.5 }
                                            }}
                                        />
                                        {dish.favorites > 0 && (
                                            <Chip
                                                icon={<FavoriteIcon sx={{ fontSize: '14px !important' }} />}
                                                label={dish.favorites}
                                                size="small"
                                                sx={{
                                                    bgcolor: alpha('#ec4899', 0.1),
                                                    color: '#f472b6',
                                                    fontSize: '0.7rem',
                                                    height: 24,
                                                    '& .MuiChip-icon': { color: '#f472b6', ml: 0.5 }
                                                }}
                                            />
                                        )}
                                    </Box>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={progress}
                                    sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        bgcolor: alpha('#22c55e', 0.1),
                                        '& .MuiLinearProgress-bar': {
                                            borderRadius: 4,
                                            background: index === 0
                                                ? 'linear-gradient(90deg, #22c55e, #10b981)'
                                                : `linear-gradient(90deg, ${alpha('#22c55e', 0.7)}, ${alpha('#10b981', 0.7)})`
                                        }
                                    }}
                                />
                            </Box>
                        );
                    })}
                </Stack>

                {/* Quick insight */}
                {topDishes[0] && (
                    <Box sx={{
                        mt: 3,
                        p: 2,
                        borderRadius: 2,
                        bgcolor: alpha('#22c55e', 0.08),
                        border: '1px solid',
                        borderColor: alpha('#22c55e', 0.15)
                    }}>
                        <Typography variant="caption" color="text.secondary">
                            💡 <strong>{topDishes[0].name}</strong> es tu plato estrella. Considera destacarlo en portada o hacer promociones especiales.
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}
