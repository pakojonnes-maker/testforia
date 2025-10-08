// src/components/reels/DishInfo.tsx
import React from 'react';
import { 
  Box, Typography, Button, Chip, Divider, 
  List, ListItem, ListItemText, Paper
} from '@mui/material';
import { motion } from 'framer-motion';

interface DishInfoProps {
  dish: any;
  language: string;
  onClose: () => void;
  primaryColor: string;
  secondaryColor: string;
}

const DishInfo: React.FC<DishInfoProps> = ({
  dish,
  language,
  onClose,
  primaryColor,
  secondaryColor
}) => {
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: '75vh',
        overflowY: 'auto'
      }}
      className="info-panel"
    >
      {/* Barra superior con título y botón cerrar */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          p: 2,
          position: 'sticky',
          top: 0,
          zIndex: 2
        }}
        className="info-panel-header"
      >
        <Typography variant="h5" sx={{ color: 'white', fontWeight: '600' }}>
          {dish.translations.name[language] || dish.translations.name.es}
        </Typography>
        
        <Button 
          onClick={onClose}
          variant="text" 
          sx={{ 
            color: 'white', 
            minWidth: '40px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ✕
        </Button>
      </Box>
      
      <Box sx={{ p: 3 }}>
        {/* Precio con diseño moderno */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'flex-end', 
            mb: 3,
            background: `linear-gradient(to right, ${dish.discount_active ? secondaryColor : primaryColor}22, transparent)`,
            p: 2,
            borderRadius: 2
          }}
        >
          <Typography 
            variant="h3" 
            sx={{ 
              color: dish.discount_active ? secondaryColor : 'white',
              fontWeight: 'bold'
            }}
          >
            {dish.discount_active && dish.discount_price
              ? `${dish.discount_price.toFixed(2)}€`
              : `${dish.price.toFixed(2)}€`}
          </Typography>
          
          {dish.discount_active && dish.discount_price && (
            <Box sx={{ display: 'flex', flexDirection: 'column', ml: 2, mb: 1 }}>
              <Typography
                variant="body2"
                sx={{ 
                  color: 'white',
                  opacity: 0.7,
                  textDecoration: 'line-through'
                }}
              >
                {dish.price.toFixed(2)}€
              </Typography>
              <Typography
                variant="caption"
                sx={{ 
                  color: secondaryColor,
                  fontWeight: 'bold'
                }}
              >
                {Math.round((1 - dish.discount_price / dish.price) * 100)}% DESCUENTO
              </Typography>
            </Box>
          )}
        </Box>
        
        {/* Características con chips modernos */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }} className="info-section">
          {dish.is_vegetarian && (
            <Chip
              label="Vegetariano"
              className="feature-chip"
              sx={{ 
                bgcolor: 'rgba(76, 175, 80, 0.2)',
                backdropFilter: 'blur(10px)',
                color: 'white' 
              }}
            />
          )}
          
          {dish.is_vegan && (
            <Chip
              label="Vegano"
              className="feature-chip"
              sx={{ bgcolor: 'rgba(76, 175, 80, 0.2)', color: 'white' }}
            />
          )}
          
          {dish.is_gluten_free && (
            <Chip
              label="Sin gluten"
              className="feature-chip"
              sx={{ bgcolor: 'rgba(33, 150, 243, 0.2)', color: 'white' }}
            />
          )}
          
          {dish.is_new && (
            <Chip
              label="Nuevo"
              className="feature-chip"
              sx={{ bgcolor: primaryColor, color: 'white' }}
            />
          )}
        </Box>
        
        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', my: 3 }} />
        
        {/* Descripción completa con estilo moderno */}
        <Box className="info-section">
          <Typography variant="h6" className="info-section-title">
            Descripción
          </Typography>
          <Paper
            elevation={0}
            sx={{
              bgcolor: 'rgba(255,255,255,0.05)',
              p: 2,
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <Typography variant="body1" sx={{ color: 'white', opacity: 0.9, lineHeight: 1.7 }}>
              {dish.translations.description[language] || dish.translations.description.es}
            </Typography>
          </Paper>
        </Box>
        
        {/* Alérgenos */}
        {dish.allergens && dish.allergens.length > 0 && (
          <Box sx={{ mt: 4 }} className="info-section">
            <Typography variant="h6" className="info-section-title">
              Alérgenos
            </Typography>
            <Box 
              sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                gap: 2 
              }}
            >
              {dish.allergens.map(allergen => (
                <Box 
                  key={allergen.id}
                  className="allergen-item"
                  sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1
                  }}
                >
                  <Box
                    component="img"
                    src={allergen.icon}
                    alt={allergen.name}
                    sx={{ width: 32, height: 32, mb: 1 }}
                  />
                  <Typography variant="caption" sx={{ color: 'white', textAlign: 'center' }}>
                    {allergen.name}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Información nutricional si está disponible */}
        {dish.nutritional_info && (
          <Box sx={{ mt: 4 }} className="info-section">
            <Typography variant="h6" className="info-section-title">
              Información nutricional
            </Typography>
            <Paper 
              elevation={0}
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.05)', 
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  p: 2,
                  bgcolor: 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <Typography variant="subtitle2" sx={{ color: 'white' }}>Calorías:</Typography>
                <Typography variant="subtitle2" sx={{ color: secondaryColor, fontWeight: 'bold' }}>
                  {dish.nutritional_info.calories} kcal
                </Typography>
              </Box>
              
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>Proteínas:</Typography>
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    {dish.nutritional_info?.protein || "-"}g
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>Carbohidratos:</Typography>
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    {dish.nutritional_info?.carbs || "-"}g
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>Grasas:</Typography>
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    {dish.nutritional_info?.fat || "-"}g
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        )}
        
        {/* Espaciado adicional para mobile */}
        <Box sx={{ height: 40 }} />
      </Box>
    </motion.div>
  );
};

export default DishInfo;