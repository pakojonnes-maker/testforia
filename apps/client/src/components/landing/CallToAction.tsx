import { Box, Container, Typography, Button, Stack, useTheme } from '@mui/material';
import { motion } from 'framer-motion';

const CallToAction = () => {
    const theme = useTheme();

    return (
        <Box
            sx={{
                py: 10,
                position: 'relative',
                overflow: 'hidden',
                background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, #000 100%)`,
                color: 'white',
                textAlign: 'center'
            }}
        >
            {/* Background Glow */}
            <Box
                component={motion.div}
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ repeat: Infinity, duration: 8 }}
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '600px',
                    height: '600px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${theme.palette.secondary.main} 0%, transparent 70%)`,
                    filter: 'blur(100px)',
                    zIndex: 0,
                    pointerEvents: 'none'
                }}
            />

            <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <Typography variant="h2" gutterBottom fontWeight={800} sx={{ mb: 3 }}>
                        Ready to Transform Your Restaurant?
                    </Typography>
                    <Typography variant="h5" sx={{ mb: 5, color: 'rgba(255,255,255,0.8)', fontWeight: 300 }}>
                        Join hundreds of restaurants increasing their revenue with visual menus.
                    </Typography>

                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={3}
                        justifyContent="center"
                    >
                        <Button
                            variant="contained"
                            size="large"
                            sx={{
                                py: 2,
                                px: 5,
                                fontSize: '1.2rem',
                                borderRadius: '50px',
                                background: '#fff',
                                color: theme.palette.primary.dark,
                                '&:hover': {
                                    background: '#f0f0f0'
                                }
                            }}
                        >
                            Start for Free
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            sx={{
                                py: 2,
                                px: 5,
                                fontSize: '1.2rem',
                                borderRadius: '50px',
                                borderColor: 'rgba(255,255,255,0.5)',
                                color: '#fff',
                                '&:hover': {
                                    borderColor: '#fff',
                                    background: 'rgba(255,255,255,0.1)'
                                }
                            }}
                        >
                            Contact Sales
                        </Button>
                    </Stack>
                </motion.div>
            </Container>
        </Box>
    );
};

export default CallToAction;
