import 'react';
import { Box, Container, Typography, Paper, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PrivacyContent } from '../components/legal/PrivacyContent';

const PrivacyPolicyPage = () => {
    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#121212', color: 'white', py: 4 }}>
            <Container maxWidth="md">
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => window.history.back()}
                    sx={{ mb: 4, color: '#FFD700' }}
                >
                    Volver
                </Button>

                <Paper sx={{ p: 4, bgcolor: '#1E1E1E', borderRadius: 2 }}>
                    <Typography variant="h4" gutterBottom sx={{ fontFamily: 'Fraunces', color: '#FFD700' }}>
                        Política de Privacidad
                    </Typography>

                    <Typography variant="subtitle1" sx={{ mb: 3, opacity: 0.7 }}>
                        Última actualización: {new Date().toLocaleDateString()}
                    </Typography>

                    <PrivacyContent />
                </Paper>
            </Container>
        </Box>
    );
};

export default PrivacyPolicyPage;
