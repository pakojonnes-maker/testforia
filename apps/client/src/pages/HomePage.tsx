import React from 'react';
import { Container, Typography, Box, Button, Grid, Card, CardMedia, CardContent } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';

// Lista de restaurantes de ejemplo para pruebas
const DEMO_RESTAURANTS = [
  { slug: 'bottega', name: 'Bottega Italiana', description: 'Auténtica cocina italiana', primary: '#942c2c', secondary: '#2c6e49' },
  { slug: 'sabor-mediterraneo', name: 'Sabor Mediterráneo', description: 'Delicias mediterráneas', primary: '#1976d2', secondary: '#ff9800' },
  { slug: 'asador-central', name: 'Asador Central', description: 'Carnes a la parrilla', primary: '#d32f2f', secondary: '#ffc107' },
  { slug: 'sushi-fusion', name: 'Sushi Fusion', description: 'Cocina japonesa de autor', primary: '#000000', secondary: '#e91e63' }
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          pt: 8,
          pb: 6,
          boxShadow: 1
        }}
      >
        <Container maxWidth="sm">
          <Typography
            component="h1"
            variant="h2"
            align="center"
            color="text.primary"
            gutterBottom
          >
            VisualTaste
          </Typography>
          <Typography variant="h5" align="center" color="text.secondary" paragraph>
            Experimenta el nuevo menú visual tipo reels
          </Typography>
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              component={Link}
              to="/r/bottega"
              size="large"
            >
              Ver Demo de Bottega Italiana
            </Button>
          </Box>
        </Container>
      </Box>
      
      {/* Contenido principal */}
      <Container sx={{ py: 8 }} maxWidth="md">
        <Typography variant="h4" gutterBottom align="center">
          Demo de Restaurantes
        </Typography>
        <Typography variant="body1" paragraph align="center" color="text.secondary" sx={{ mb: 4 }}>
          Selecciona un restaurante para ver sus platos en formato reels
        </Typography>
        
        <Grid container spacing={4}>
          {DEMO_RESTAURANTS.map((restaurant) => (
            <Grid item key={restaurant.slug} xs={12} sm={6}>
              <Card
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: '0.3s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  },
                  borderTop: 5,
                  borderColor: restaurant.primary,
                }}
                onClick={() => navigate(`/r/${restaurant.slug}`)}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={`https://source.unsplash.com/featured/?restaurant,${restaurant.slug}&sig=${restaurant.slug}`}
                  alt={restaurant.name}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h5" component="h2">
                    {restaurant.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {restaurant.description}
                  </Typography>
                  <Button 
                    variant="contained" 
                    sx={{ 
                      mt: 2,
                      bgcolor: restaurant.primary,
                      '&:hover': {
                        bgcolor: restaurant.primary + 'dd'
                      } 
                    }}
                    fullWidth
                  >
                    Ver menú en reels
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
      
      {/* Footer simple */}
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider'
        }}
      >
        <Container maxWidth="sm">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} VisualTaste - Demo de Reels
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;