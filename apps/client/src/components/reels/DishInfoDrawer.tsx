// apps/client/src/components/reels/DishInfoDrawer.tsx
import React from 'react';
import { motion } from 'framer-motion';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Chip,
  Fab,
  Divider,
  Avatar,
  Grid,
  Stack,
} from '@mui/material';
import {
  Close,
  Restaurant,
  GrassOutlined,
  NoMeals,
  LocalOffer,
  Star,
} from '@mui/icons-material';
import { Dish, Allergen } from '@visualtaste/api';

interface DishInfoDrawerProps {
  dish: Dish;
  open: boolean;
  onClose: () => void;
  languageCode: string;
  primaryColor: string;
  secondaryColor: string;
}

export default function DishInfoDrawer({ 
  dish, 
  open, 
  onClose, 
  languageCode = 'es',
  primaryColor,
  secondaryColor
}: DishInfoDrawerProps) {
  if (!dish) return null;
  
  // Helper para obtener el texto traducido o un valor por defecto
  const getTranslation = (field: string, defaultVal = '') => {
    return dish.translations?.[field]?.[languageCode] || 
           dish.translations?.[field]?.['es'] || 
           defaultVal;
  };
  
  const getName = () => getTranslation('name', 'Sin nombre');
  const getDescription = () => getTranslation('description', '');
  
  // Formato de precio con descuento si aplica
  const formatPrice = () => {
    if (dish.discount_active && dish.discount_price !== null) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography
            variant="h6"
            component="span"
            sx={{
              textDecoration: 'line-through',
              color: 'text.secondary',
              fontSize: '1rem',
              mr: 1,
            }}
          >
            {dish.price.toFixed(2)}€
          </Typography>
          <Typography variant="h6" component="span" color="error">
            {dish.discount_price.toFixed(2)}€
          </Typography>
        </Box>
      );
    }
    return <Typography variant="h6">{dish.price.toFixed(2)}€</Typography>;
  };
  
  // Animaciones para el contenido
  const containerAnimation = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1
      }
    }
  };
  
  const itemAnimation = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };
  
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          maxHeight: '80%',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          px: 2,
          pb: 4,
          pt: 1,
        },
      }}
    >
      <Box sx={{ textAlign: 'center', position: 'relative' }}>
        <IconButton 
          onClick={onClose}
          sx={{ position: 'absolute', right: 0, top: 0 }}
        >
          <Close />
        </IconButton>
        
        <Box 
          sx={{ 
            width: 40, 
            height: 5, 
            bgcolor: 'grey.300', 
            borderRadius: 5, 
            mx: 'auto', 
            my: 1 
          }} 
        />
      </Box>
      
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerAnimation}
        style={{ overflow: 'hidden' }}
      >
        {/* Imagen destacada */}
        {dish.media && dish.media.length > 0 && dish.media[0].thumbnail_url && (
          <motion.div variants={itemAnimation}>
            <Box
              sx={{
                height: 150,
                width: '100%',
                borderRadius: 2,
                overflow: 'hidden',
                mb: 2,
                position: 'relative',
              }}
            >
              <Box
                component="img"
                src={dish.media[0].thumbnail_url}
                alt={getName()}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              
              {/* Overlay con rating si está disponible */}
              {dish.avg_rating && dish.avg_rating > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    px: 1,
                    py: 0.5,
                    borderTopLeftRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Star sx={{ fontSize: 18, color: 'gold', mr: 0.5 }} />
                  <Typography variant="body2" fontWeight="bold">
                    {dish.avg_rating.toFixed(1)}
                  </Typography>
                </Box>
              )}
            </Box>
          </motion.div>
        )}
        
        <motion.div variants={itemAnimation}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            {getName()}
          </Typography>
        </motion.div>
        
        <motion.div variants={itemAnimation}>
          <Box sx={{ mb: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {dish.is_vegetarian && <Chip icon={<GrassOutlined />} label="Vegetariano" size="small" color="success" />}
            {dish.is_vegan && <Chip icon={<GrassOutlined />} label="Vegano" size="small" color="success" />}
            {dish.is_gluten_free && <Chip icon={<NoMeals />} label="Sin gluten" size="small" color="secondary" />}
            {dish.discount_active && <Chip icon={<LocalOffer />} label="Oferta" size="small" color="error" />}
          </Box>
        </motion.div>
        
        {getDescription() && (
          <motion.div variants={itemAnimation}>
            <Typography variant="body1" paragraph>
              {getDescription()}
            </Typography>
          </motion.div>
        )}
        
        {/* Alérgenos */}
        {dish.allergens && dish.allergens.length > 0 && (
          <motion.div variants={itemAnimation}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2 }}>
              Alérgenos:
            </Typography>
            <Grid container spacing={1} sx={{ mt: 0.5 }}>
              {dish.allergens.map((allergen) => (
                <Grid item key={allergen.id}>
                  <Chip
                    avatar={allergen.icon_url ? 
                      <Avatar src={allergen.icon_url} alt="" /> : null
                    }
                    label={allergen.translations?.[languageCode] || 
                           allergen.translations?.es || 
                           'Alérgeno'}
                    size="small"
                    variant="outlined"
                  />
                </Grid>
              ))}
            </Grid>
          </motion.div>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        <motion.div variants={itemAnimation}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              {formatPrice()}
            </Box>
            
            <Fab 
              variant="extended" 
              size="medium" 
              sx={{ 
                bgcolor: primaryColor, 
                color: 'white', 
                '&:hover': { bgcolor: `${primaryColor}CC` },
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <Restaurant sx={{ mr: 1 }} />
              Pedir
            </Fab>
          </Box>
        </motion.div>
      </motion.div>
    </Drawer>
  );
}