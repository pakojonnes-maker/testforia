import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
} from '@mui/material';
import {
  RestaurantMenu as MenuIcon,
  PhotoLibrary as GalleryIcon,
  QrCode as QrIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const restaurantId = user?.currentRestaurant?.id;
  
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['dashboardStats', restaurantId],
    queryFn: async () => {
      if (!restaurantId) throw new Error("No hay restaurante seleccionado");
      const response = await apiClient.getDashboardStats(restaurantId);
      return response.stats;
    },
    enabled: !!restaurantId,
  });

  const stats = statsData || {
    totalDishes: 0,
    totalSections: 0,
    totalViews: 0,
    lastWeekViews: 0,
    mostViewedDish: "Cargando...",
    mostViewedDishCount: 0,
    topDishes: [],
    updatedAt: new Date().toISOString()
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom component="h1">
        Dashboard
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        Bienvenido de nuevo, {user?.name}. Aquí tienes una visión general de {user?.currentRestaurant?.name}.
      </Typography>
      
      {isLoading ? (
        <LinearProgress />
      ) : (
        <Grid container spacing={3}>
          {/* Tarjetas de estadísticas */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total de platos
                </Typography>
                <Typography variant="h4">{stats.totalDishes}</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total de secciones
                </Typography>
                <Typography variant="h4">{stats.totalSections}</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Visualizaciones totales
                </Typography>
                <Typography variant="h4">{stats.totalViews}</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Visualizaciones última semana
                </Typography>
                <Typography variant="h4">{stats.lastWeekViews}</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Acciones rápidas */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Acciones rápidas
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Button 
                    variant="outlined" 
                    startIcon={<MenuIcon />} 
                    fullWidth 
                    sx={{ justifyContent: 'flex-start', py: 1.5 }}
                    href="/dishes/new"
                  >
                    Añadir nuevo plato
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Button 
                    variant="outlined" 
                    startIcon={<GalleryIcon />} 
                    fullWidth
                    sx={{ justifyContent: 'flex-start', py: 1.5 }}
                    href="/media"
                  >
                    Gestionar multimedia
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Button 
                    variant="outlined" 
                    startIcon={<QrIcon />} 
                    fullWidth
                    sx={{ justifyContent: 'flex-start', py: 1.5 }}
                    href="/qr"
                  >
                    Descargar código QR
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Button 
                    variant="outlined" 
                    startIcon={<ViewIcon />} 
                    fullWidth
                    sx={{ justifyContent: 'flex-start', py: 1.5 }}
                    target="_blank"
                    href={`https://visualtaste.com/${user?.currentRestaurant?.slug || ''}`}
                  >
                    Ver menú publicado
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {/* Platos más vistos */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Platos más populares
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <List>
                {stats.topDishes && stats.topDishes.length > 0 ? (
                  stats.topDishes.map((dish, index) => (
                    <ListItem key={dish.id}>
                      <ListItemIcon>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'primary.main',
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        >
                          {index + 1}
                        </Box>
                      </ListItemIcon>
                      <ListItemText 
                        primary={dish.name} 
                        secondary={`${dish.view_count} visualizaciones`} 
                      />
                    </ListItem>
                  ))
                ) : (
                  <ListItem>
                    <ListItemText primary="No hay datos de visualizaciones disponibles" />
                  </ListItem>
                )}
              </List>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}