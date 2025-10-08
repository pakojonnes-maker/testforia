// src/pages/RestaurantLanding.tsx
import React from 'react';
import { useRestaurant } from '../App';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function RestaurantLanding() {
  const restaurantData = useRestaurant();
  const navigate = useNavigate();

  if (!restaurantData) {
    return <div>No restaurant data available</div>;
  }

  const { restaurant } = restaurantData;

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: restaurant.theme?.background_color || '#fff',
      color: restaurant.theme?.text_color || '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: 4
    }}>
      <Typography variant="h2" gutterBottom>
        {restaurant.name}
      </Typography>
      
      <Typography variant="h5" color="textSecondary" gutterBottom>
        Bienvenido a nuestro menú digital
      </Typography>

      <Button
        variant="contained"
        size="large"
        onClick={() => navigate(`/${restaurant.slug}/r`)}
        sx={{ 
          mt: 4,
          bgcolor: restaurant.theme?.primary_color || '#9c27b0',
          '&:hover': {
            bgcolor: restaurant.theme?.secondary_color || '#2196f3'
          }
        }}
      >
        Ver Menú
      </Button>
    </Box>
  );
}

export default RestaurantLanding;
