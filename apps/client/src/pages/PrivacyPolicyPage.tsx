import 'react';
import { Box, Container, Typography, Paper, Button, Stack, Divider } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PrivacyContent } from '../components/legal/PrivacyContent';
import { LegalNoticeContent } from '../components/legal/LegalNoticeContent';

export type LegalDoc = 'privacy' | 'legal-notice';

interface Props {
    /** Qué documento mostrar. Por defecto la política de privacidad, que es la ruta histórica. */
    doc?: LegalDoc;
}

const TITLES: Record<LegalDoc, string> = {
    privacy: 'Política de Privacidad',
    'legal-notice': 'Aviso Legal',
};

const PrivacyPolicyPage = ({ doc = 'privacy' }: Props) => {
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

                <Paper sx={{ p: { xs: 2.5, sm: 4 }, bgcolor: '#1E1E1E', borderRadius: 2 }}>
                    <Typography variant="h4" gutterBottom sx={{ fontFamily: 'Fraunces', color: '#FFD700' }}>
                        {TITLES[doc]}
                    </Typography>

                    {doc === 'privacy' ? <PrivacyContent /> : <LegalNoticeContent />}

                    <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.12)' }} />

                    <Stack direction="row" spacing={2} flexWrap="wrap">
                        <Button href="/legal/privacy" size="small" sx={{ color: '#aaa', textTransform: 'none' }}>
                            Política de Privacidad
                        </Button>
                        <Button href="/legal/aviso" size="small" sx={{ color: '#aaa', textTransform: 'none' }}>
                            Aviso Legal
                        </Button>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
};

export default PrivacyPolicyPage;
