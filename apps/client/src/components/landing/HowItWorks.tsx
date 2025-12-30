import { Box, Container, Typography, Grid, useTheme } from '@mui/material';
import { motion } from 'framer-motion';

const steps = [
    {
        number: "01",
        title: "Sign Up & Customize",
        description: "Create your free account and set your restaurant's branding. Choose your colors, fonts, and upload your logo."
    },
    {
        number: "02",
        title: "Upload Your Menu",
        description: "Add your dishes and upload short vertical videos (Reels) for each item. Our AI helps you translate everything."
    },
    {
        number: "03",
        title: "Print & Launch",
        description: "Download your custom generated QR codes, place them on your tables, and watch your sales grow."
    }
];

const HowItWorks = () => {
    const theme = useTheme();

    return (
        <Box sx={{ py: 12, bgcolor: '#0f1f1d', color: '#fff' }}>
            <Container maxWidth="lg">
                <Typography variant="h2" align="center" fontWeight={800} gutterBottom>
                    Go Live in Minutes
                </Typography>
                <Typography variant="h6" align="center" sx={{ mb: 10, opacity: 0.7 }}>
                    Modernizing your restaurant shouldn't be complicated.
                </Typography>

                <Grid container spacing={6}>
                    {steps.map((step, index) => (
                        <Grid item xs={12} md={4} key={index}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.2 }}
                                viewport={{ once: true }}
                            >
                                <Box sx={{ position: 'relative', p: 2 }}>
                                    <Typography
                                        variant="h1"
                                        sx={{
                                            fontSize: '8rem',
                                            fontWeight: 900,
                                            color: 'transparent',
                                            WebkitTextStroke: '2px rgba(255,255,255,0.1)',
                                            position: 'absolute',
                                            top: -60,
                                            left: -20,
                                            zIndex: 0
                                        }}
                                    >
                                        {step.number}
                                    </Typography>
                                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                                        <Typography variant="h4" gutterBottom fontWeight="bold">
                                            {step.title}
                                        </Typography>
                                        <Box sx={{ width: 50, height: 4, bgcolor: theme.palette.primary.main, mb: 3 }} />
                                        <Typography variant="body1" sx={{ fontSize: '1.1rem', opacity: 0.8, lineHeight: 1.6 }}>
                                            {step.description}
                                        </Typography>
                                    </Box>
                                </Box>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
};

export default HowItWorks;
