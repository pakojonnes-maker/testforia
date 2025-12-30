
import { Box, Container, Typography, Button, Grid, useTheme } from '@mui/material';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
    const theme = useTheme();
    const navigate = useNavigate();

    // Parallax effect for the background or elements
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 200]);
    const y2 = useTransform(scrollY, [0, 500], [0, -150]);

    return (
        <Box
            sx={{
                position: 'relative',
                overflow: 'hidden',
                background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, #0f1f1d 100%)`,
                color: 'white',
                minHeight: '90vh', // Almost full screen
                display: 'flex',
                alignItems: 'center',
                pt: { xs: 8, md: 0 },
            }}
        >
            {/* Background Decorative Elements */}
            <Box
                component={motion.div}
                style={{ y: y1, opacity: 0.15 }}
                sx={{
                    position: 'absolute',
                    top: '-10%',
                    right: '-5%',
                    width: '60vw',
                    height: '60vw',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${theme.palette.primary.main} 0%, transparent 70%)`,
                    filter: 'blur(80px)',
                    zIndex: 0,
                }}
            />
            <Box
                component={motion.div}
                style={{ y: y2, opacity: 0.1 }}
                sx={{
                    position: 'absolute',
                    bottom: '-10%',
                    left: '-5%',
                    width: '40vw',
                    height: '40vw',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${theme.palette.primary.main} 0%, transparent 70%)`,
                    filter: 'blur(80px)',
                    zIndex: 0,
                }}
            />

            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                <Grid container spacing={4} alignItems="center">
                    {/* Left Content */}
                    <Grid item xs={12} md={6}>
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        >
                            <Typography
                                variant="overline"
                                sx={{
                                    color: theme.palette.primary.main,
                                    fontWeight: 700,
                                    letterSpacing: '0.2em',
                                    fontSize: '0.9rem'
                                }}
                            >
                                PREMIUM DINING EXPERIENCE
                            </Typography>
                            <Typography
                                variant="h1"
                                sx={{
                                    fontSize: { xs: '2.5rem', md: '4.5rem' },
                                    fontWeight: 800,
                                    lineHeight: 1.1,
                                    mb: 3,
                                    fontFamily: '"Playfair Display", serif', // Use serif for classier look if avail, or standard
                                    background: `linear-gradient(45deg, #fff 30%, ${theme.palette.primary.main} 90%)`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                Where Taste Begins With Sight.
                            </Typography>
                            <Typography
                                variant="h5"
                                sx={{
                                    color: 'rgba(255,255,255,0.85)',
                                    mb: 4,
                                    maxWidth: '550px',
                                    fontWeight: 300,
                                    lineHeight: 1.6,
                                    fontSize: '1.2rem'
                                }}
                            >
                                Elevate your guest experience with a cinematic menu that speaks every language. Show the true artistry of your kitchen and watch appetite—and sales—soar.
                            </Typography>

                            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={() => navigate('/signup')}
                                    component={motion.button}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    sx={{
                                        borderRadius: '50px',
                                        padding: '12px 32px',
                                        fontSize: '1.1rem',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                        boxShadow: `0 8px 20px -5px ${theme.palette.primary.main}80`,
                                    }}
                                >
                                    Get Started Free
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="large"
                                    onClick={() => navigate('/r/bottega')} // Demo link
                                    component={motion.button}
                                    whileHover={{ scale: 1.05, borderColor: '#fff', color: '#fff' }}
                                    whileTap={{ scale: 0.95 }}
                                    sx={{
                                        borderRadius: '50px',
                                        padding: '12px 32px',
                                        fontSize: '1.1rem',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderColor: 'rgba(255,255,255,0.3)',
                                        color: 'rgba(255,255,255,0.8)',
                                        backdropFilter: 'blur(5px)',
                                    }}
                                >
                                    View Live Demo
                                </Button>
                            </Box>
                        </motion.div>
                    </Grid>

                    {/* Right Visual (Phone Mockup) */}
                    <Grid item xs={12} md={6}>
                        <motion.div
                            initial={{ opacity: 0, y: 50, rotate: 5 }}
                            animate={{ opacity: 1, y: 0, rotate: 0 }}
                            transition={{ duration: 1, delay: 0.3, type: "spring" }}
                            style={{ perspective: 1000 }}
                        >
                            <Box
                                component={motion.div}
                                animate={{ y: [0, -15, 0] }}
                                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                                sx={{
                                    position: 'relative',
                                    width: '100%',
                                    maxWidth: '350px',
                                    margin: 'auto',
                                    // Phone Border
                                    border: '8px solid #333',
                                    borderRadius: '40px',
                                    overflow: 'hidden',
                                    aspectRatio: '9/19',
                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                    backgroundColor: '#000',
                                }}
                            >
                                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', position: 'absolute', top: 0, width: '100%', zIndex: 10 }}>
                                    <Box
                                        component="img"
                                        src="/logo.png"
                                        alt="VisualTaste Logo"
                                        sx={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                                    />
                                    <Box sx={{ height: 10, width: 100, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 5 }} />
                                </Box>

                                {/* Simulated Reels Content (Image/Video Placeholder) */}
                                <Box
                                    component="img"
                                    src="https://images.unsplash.com/photo-1544025162-d23edb18c4f7?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                                    alt="App Interface"
                                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />

                                {/* Floating Elements/badges */}
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 1.5 }}
                                    style={{ position: 'absolute', bottom: '20%', right: '-20px', background: 'white', padding: '10px 20px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}
                                >
                                    <Typography variant="body2" sx={{ color: '#333', fontWeight: 'bold' }}>Sales +30% 🚀</Typography>
                                </motion.div>
                            </Box>
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default Hero;
