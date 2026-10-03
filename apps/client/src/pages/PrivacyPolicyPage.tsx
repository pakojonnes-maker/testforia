import { useState } from 'react';
import { Box, Container, Typography, Paper, Button, Stack, Divider, Switch, FormControlLabel } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PrivacyContent } from '../components/legal/PrivacyContent';
import { LegalNoticeContent } from '../components/legal/LegalNoticeContent';
import { getRememberChoice, setRememberConsent } from '../lib/visitor';

export type LegalDoc = 'privacy' | 'legal-notice';

interface Props {
    /** Qué documento mostrar. Por defecto la política de privacidad, que es la ruta histórica. */
    doc?: LegalDoc;
}

const TITLES: Record<LegalDoc, string> = {
    privacy: 'Política de Privacidad',
    'legal-notice': 'Aviso Legal',
};

/**
 * «Recordar este dispositivo»: la misma pregunta que hace la carta en su bienvenida
 * («¿Te reconocemos la próxima vez que vengas?»), para cambiar la respuesta cuando se quiera.
 */
const RememberSwitch = () => {
    const [on, setOn] = useState(() => getRememberChoice() === 'yes');
    return (
        <Box sx={{ mb: 3, p: 2, borderRadius: 2, border: '1px solid rgba(255,255,255,0.12)', bgcolor: 'rgba(255,255,255,0.03)' }}>
            <FormControlLabel
                control={<Switch checked={on} onChange={(e) => { setOn(e.target.checked); setRememberConsent(e.target.checked); }} />}
                label={<Typography sx={{ color: '#fff', fontWeight: 600 }}>Reconocerme cuando vuelva a la carta</Typography>}
            />
            <Typography variant="body2" sx={{ color: '#aaa', mt: 0.5 }}>
                Guarda un número al azar en este dispositivo durante 12 meses para que el restaurante sepa
                que has vuelto. Desactivado, la carta funciona igual y no guarda nada para medir.
            </Typography>
        </Box>
    );
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
                    <Typography variant="h4" gutterBottom sx={{ fontFamily: '"Fraunces Variable", "Fraunces", serif', color: '#FFD700' }}>
                        {TITLES[doc]}
                    </Typography>

                    {doc === 'privacy' && <RememberSwitch />}
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
