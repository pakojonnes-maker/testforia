import { Box, Container, Typography, Grid, Paper, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import MovieFilterIcon from '@mui/icons-material/MovieFilter'; // Using similar icon for Reels/Video
import InsightsIcon from '@mui/icons-material/Insights';
import LanguageIcon from '@mui/icons-material/Language';

const features = [
    {
        icon: <MovieFilterIcon fontSize="large" />,
        title: 'Video-First Menus',
        description: 'Replace boring text lists with mouth-watering short videos that showcase your dishes in all their glory.'
    },
    {
        icon: <QrCode2Icon fontSize="large" />,
        title: 'Smart QR Codes',
        description: 'Instant access. No app download required. Generate and customize your QRs to match your brand.'
    },
    {
        icon: <InsightsIcon fontSize="large" />,
        title: 'Real-Time Analytics',
        description: 'Know exactly what drives your sales. Track views, clicks, and popular dishes to optimize your menu.'
    },
    {
        icon: <LanguageIcon fontSize="large" />,
        title: 'Multi-Language',
        description: 'Automatically translate your menu into multiple languages to welcome tourists and international guests.'
    }
];

const Features = () => {
    const theme = useTheme();

    return (
        <Box sx={{ py: 12, bgcolor: theme.palette.secondary.main, color: 'white' }}>
            <Container maxWidth="lg">
                <Typography
                    variant="h2"
                    align="center"
                    gutterBottom
                    sx={{ fontWeight: 700, mb: 2, color: theme.palette.primary.main }}
                    component={motion.h2}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    Curated for Excellence
                </Typography>
                <Typography
                    variant="h6"
                    align="center"
                    sx={{ mb: 8, maxWidth: '750px', mx: 'auto', opacity: 0.8, fontWeight: 300 }}
                    component={motion.p}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                >
                    Sophisticated tools designed to enhance the dining journey, from the first glance to the final order.
                </Typography>

                <Grid container spacing={4}>
                    {features.map((feature, index) => (
                        <Grid item xs={12} sm={6} md={3} key={index}>
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ y: -10 }}
                            >
                                <Paper
                                    elevation={4}
                                    sx={{
                                        p: 4,
                                        height: '100%',
                                        textAlign: 'center',
                                        borderRadius: 4,
                                        bgcolor: 'rgba(255,255,255,0.05)', // Glassmorphism-ish
                                        backdropFilter: 'blur(10px)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        transition: 'all 0.3s',
                                        color: 'white',
                                        '&:hover': {
                                            borderColor: theme.palette.primary.main,
                                            transform: 'translateY(-10px)',
                                            boxShadow: `0 10px 30px -10px ${theme.palette.primary.main}40`
                                        }
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: 'inline-flex',
                                            p: 2,
                                            borderRadius: '50%',
                                            bgcolor: `${theme.palette.primary.main}15`,
                                            color: theme.palette.primary.main,
                                            mb: 2
                                        }}
                                    >
                                        {feature.icon}
                                    </Box>
                                    <Typography variant="h6" gutterBottom fontWeight="bold">
                                        {feature.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {feature.description}
                                    </Typography>
                                </Paper>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
};

export default Features;
