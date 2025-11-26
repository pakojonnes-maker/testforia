// apps/admin/src/components/dashboard/SmartRecommendations.tsx

import {
    Paper,
    Typography,
    Box,
    Button,
    Avatar,
    Skeleton,
    Fade
} from '@mui/material';
import {
    ArrowForward as ArrowForwardIcon,
    Lightbulb as LightbulbIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { Recommendation } from '../../types/dashboard';

interface SmartRecommendationsProps {
    recommendations: Recommendation[];
    loading?: boolean;
}

export function SmartRecommendations({ recommendations, loading }: SmartRecommendationsProps) {
    const navigate = useNavigate();

    if (loading) {
        return (
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                    <Skeleton variant="text" width={150} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                </Box>
                <Skeleton variant="rectangular" height={60} sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2 }} />
            </Paper>
        );
    }

    if (recommendations.length === 0) {
        return null;
    }

    // Only show the top recommendation prominently
    const topRec = recommendations[0];

    return (
        <Fade in>
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    borderRadius: 4,
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)'
                }}
            >
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Avatar
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.2)',
                                color: 'inherit',
                                width: 32,
                                height: 32
                            }}
                        >
                            <LightbulbIcon fontSize="small" />
                        </Avatar>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ opacity: 0.9, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Recomendación
                        </Typography>
                    </Box>

                    <Typography variant="h6" fontWeight={700} gutterBottom>
                        {topRec.title}
                    </Typography>

                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 3, maxWidth: '90%' }}>
                        {topRec.description}
                    </Typography>

                    {topRec.actionable && topRec.action && (
                        <Button
                            variant="contained"
                            color="inherit"
                            endIcon={<ArrowForwardIcon />}
                            onClick={() => navigate(topRec.action!.href)}
                            sx={{
                                color: 'primary.main',
                                bgcolor: 'white',
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.9)'
                                },
                                fontWeight: 600,
                                borderRadius: 2
                            }}
                        >
                            {topRec.action.label}
                        </Button>
                    )}
                </Box>

                {/* Decorative background element */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: -20,
                        right: -20,
                        width: 150,
                        height: 150,
                        borderRadius: '50%',
                        bgcolor: 'rgba(255,255,255,0.05)',
                        zIndex: 0
                    }}
                />
            </Paper>
        </Fade>
    );
}
