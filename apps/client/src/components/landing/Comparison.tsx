import { Box, Container, Typography, Grid, Paper, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

const Comparison = () => {
    const theme = useTheme();

    const oldWay = [
        "Static PDF files (Hard to read on mobile)",
        "No food photos or low quality images",
        "Updates require designer & re-upload",
        "No data on what customers like",
        "Boring, flat experience"
    ];

    const newWay = [
        "Interactive, mobile-first design",
        "Mouth-watering 4K video reels",
        "Real-time updates in seconds",
        "Detailed analytics & insights",
        "Immersive experience that sells more"
    ];

    return (
        <Box sx={{ py: 12, bgcolor: '#0f1f1d' }}>
            <Container maxWidth="lg">
                <Typography
                    variant="h3"
                    align="center"
                    gutterBottom
                    sx={{ fontWeight: 800, mb: 1, color: '#fff' }}
                >
                    Don't Let a Static Menu Hide Your Art
                </Typography>
                <Typography
                    variant="h6"
                    align="center"
                    sx={{ mb: 8, color: 'rgba(255,255,255,0.7)', fontWeight: 300 }}
                >
                    The difference between a visitor and a loyal customer is the experience you provide.
                </Typography>

                <Grid container spacing={4} alignItems="center">
                    {/* The Old Way */}
                    <Grid item xs={12} md={6}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 5,
                                borderRadius: 4,
                                bgcolor: '#e0e0e0',
                                height: '100%',
                                opacity: 0.8,
                                transition: '0.3s',
                                '&:hover': { opacity: 1 }
                            }}
                        >
                            <Typography variant="h5" gutterBottom fontWeight="bold" color="text.secondary">
                                ❌ The Old Way (PDF)
                            </Typography>
                            <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {oldWay.map((item, index) => (
                                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <CancelIcon sx={{ color: '#757575' }} />
                                        <Typography variant="body1" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                                            {item}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Paper>
                    </Grid>

                    {/* The VisualTaste Way */}
                    <Grid item xs={12} md={6}>
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <Paper
                                elevation={10}
                                sx={{
                                    p: 5,
                                    borderRadius: 4,
                                    bgcolor: '#fff',
                                    height: '100%',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    border: `2px solid ${theme.palette.primary.main}`
                                }}
                            >
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        bgcolor: theme.palette.primary.main,
                                        color: '#fff',
                                        px: 3,
                                        py: 1,
                                        borderBottomLeftRadius: 20,
                                        fontWeight: 'bold',
                                        boxShadow: 3
                                    }}
                                >
                                    Recommended
                                </Box>

                                <Typography variant="h5" gutterBottom fontWeight="bold" color={theme.palette.primary.main}>
                                    ✅ The VisualTaste Way
                                </Typography>
                                <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {newWay.map((item, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ x: 20, opacity: 0 }}
                                            whileInView={{ x: 0, opacity: 1 }}
                                            transition={{ delay: index * 0.1 }}
                                            viewport={{ once: true }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <CheckCircleIcon color="primary" />
                                                <Typography variant="body1" fontWeight={500}>
                                                    {item}
                                                </Typography>
                                            </Box>
                                        </motion.div>
                                    ))}
                                </Box>
                            </Paper>
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default Comparison;
