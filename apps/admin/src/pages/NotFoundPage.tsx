import { Box, Button, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon } from '@mui/icons-material';

export default function NotFoundPage() {
  const navigate = useNavigate();
  
  return (
    <Container maxWidth="md" sx={{ textAlign: 'center', py: 8 }}>
      <Typography variant="h1" component="h1" gutterBottom>
        404
      </Typography>
      <Typography variant="h4" component="h2" gutterBottom>
        Página no encontrada
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        La página que estás buscando no existe o ha sido movida.
      </Typography>
      <Box sx={{ mt: 4 }}>
        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={() => navigate('/')}
        >
          Volver al Dashboard
        </Button>
      </Box>
    </Container>
  );
}