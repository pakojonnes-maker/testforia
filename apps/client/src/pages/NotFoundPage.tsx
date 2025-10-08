import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default'
      }}
    >
      <Container maxWidth="md">
        <Typography variant="h1" align="center" gutterBottom>
          404
        </Typography>
        <Typography variant="h5" align="center" color="text.secondary" paragraph>
          Página no encontrada
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button variant="contained" onClick={() => navigate('/')}>
            Volver al inicio
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default NotFoundPage;