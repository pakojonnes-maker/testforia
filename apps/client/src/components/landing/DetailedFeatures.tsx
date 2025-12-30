import { Box, Container, Typography, Grid, Paper, Chip, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import CampaignIcon from '@mui/icons-material/Campaign';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PaletteIcon from '@mui/icons-material/Palette';
import TranslateIcon from '@mui/icons-material/Translate';

const featuresList = [
    {
        title: "Immersive Menu Management",
        icon: <RestaurantMenuIcon fontSize="large" />,
        description: "Curate your offerings with elegance. Manage allergens, pricing, and availability instantly, ensuring your guests always have accurate information.",
        tags: ["Real-time", "Allergens", "Prices"]
    },
    {
        title: "Visual Intelligence",
        icon: <AnalyticsIcon fontSize="large" />,
        description: "Understand guest preferences through their eyes. Track engagement and identifying your star dishes to refine your culinary strategy.",
        tags: ["Views", "Clicks", "Sales Data"]
    },
    {
        title: "Guest Engagement Suite",
        icon: <CampaignIcon fontSize="large" />,
        description: "Extend your hospitality digitally. Capture interest with elegant popups and personalized messaging that resonates.",
        tags: ["Lead Gen", "Popups", "Banners"]
    },
    {
        title: "Bespoke QR Access",
        icon: <QrCodeScannerIcon fontSize="large" />,
        description: "Your digital gateway, tailored to your aesthetic. Generate high-resolution, branded QR codes that complement your table setting.",
        tags: ["Custom Colors", "Logos", "High Res"]
    },
    {
        title: "Signature Branding",
        icon: <PaletteIcon fontSize="large" />,
        description: "A seamless extension of your venue. Customize every pixel—colors, fonts, and layouts—to honor your brand's unique identity.",
        tags: ["Themes", "Fonts", "Colors"]
    },
    {
        title: "Global Hospitality",
        icon: <TranslateIcon fontSize="large" />,
        description: "Speak every guest's language. Instantly translate your menu to welcome international visitors with the warmth of understanding.",
        tags: ["Multi-language", "AI Powered"]
    }
];

const DetailedFeatures = () => {
    const theme = useTheme();

    return (
        <Box sx={{ py: 12, bgcolor: theme.palette.secondary.main, color: 'white' }}>
            <Container maxWidth="lg">
                <Box sx={{ textAlign: 'center', mb: 8 }}>
                    <Typography variant="overline" color="primary" fontWeight="bold" letterSpacing={2}>
                        UNCOMPROMISING QUALITY
                    </Typography>
                    <Typography variant="h3" fontWeight={800} gutterBottom>
                        A Suite Worthy of Your Kitchen
                    </Typography>
                    <Typography variant="h6" sx={{ maxWidth: 700, mx: 'auto', opacity: 0.8, fontWeight: 300 }}>
                        We've crafted a platform that champions your culinary art and operational excellence.
                    </Typography>
                </Box>

                <Grid container spacing={4}>
                    {featuresList.map((feature, index) => (
                        <Grid item xs={12} md={4} key={index}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                viewport={{ once: true }}
                            >
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 4,
                                        height: '100%',
                                        borderRadius: 4,
                                        bgcolor: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        transition: 'all 0.3s',
                                        color: 'white',
                                        '&:hover': {
                                            transform: 'translateY(-5px)',
                                            boxShadow: `0 10px 40px -10px ${theme.palette.primary.main}20`,
                                            borderColor: theme.palette.primary.main,
                                            bgcolor: 'rgba(255,255,255,0.08)'
                                        }
                                    }}
                                >
                                    <Box sx={{
                                        width: 60,
                                        height: 60,
                                        borderRadius: '16px',
                                        bgcolor: `${theme.palette.primary.main}10`,
                                        color: theme.palette.primary.main,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mb: 3
                                    }}>
                                        {feature.icon}
                                    </Box>
                                    <Typography variant="h5" gutterBottom fontWeight="bold">
                                        {feature.title}
                                    </Typography>
                                    <Typography variant="body1" sx={{ mb: 3, opacity: 0.7 }}>
                                        {feature.description}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {feature.tags.map((tag, i) => (
                                            <Chip
                                                key={i}
                                                label={tag}
                                                size="small"
                                                sx={{
                                                    bgcolor: 'rgba(255,255,255,0.1)',
                                                    color: 'white',
                                                    fontWeight: 500
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Paper>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
};

export default DetailedFeatures;
