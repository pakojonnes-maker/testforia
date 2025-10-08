// packages/ui/src/reels/BadgeOverlay.tsx
import React from 'react';
import { Box, Chip, alpha } from '@mui/material';
import {
  LocalOffer,
  GrassOutlined,
  NoMeals,
  Spa,
  NewReleases
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Dish } from '@visualtaste/api';

interface BadgeOverlayProps {
  dish: Dish;
  primaryColor?: string;
}

export default function BadgeOverlay({ dish, primaryColor = '#9c27b0' }: BadgeOverlayProps) {
  if (!dish) return null;
  
  const { discount_active, is_vegetarian, is_vegan, is_gluten_free, is_new, is_featured } = dish;
  
  // Variantes de animación para las badges
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { x: -20, opacity: 0 },
    show: { x: 0, opacity: 1 }
  };
  
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      style={{
        position: 'absolute',
        top: 80,
        left: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 2,
      }}
    >
      {discount_active && (
        <motion.div variants={itemVariants}>
          <Chip
            icon={<LocalOffer />}
            label="OFERTA"
            size="small"
            color="error"
            sx={{ 
              fontWeight: 'bold',
              backgroundColor: 'error.main',
              color: 'white',
              px: 0.5,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          />
        </motion.div>
      )}
      {is_vegetarian && (
        <motion.div variants={itemVariants}>
          <Chip
            icon={<GrassOutlined />}
            label="VEGETARIANO"
            size="small"
            sx={{ 
              fontWeight: 'bold',
              backgroundColor: primaryColor,
              color: 'white',
              px: 0.5,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          />
        </motion.div>
      )}
      {is_vegan && (
        <motion.div variants={itemVariants}>
          <Chip
            icon={<Spa />}
            label="VEGANO"
            size="small"
            sx={{ 
              fontWeight: 'bold',
              backgroundColor: '#2e7d32',
              color: 'white',
              px: 0.5,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          />
        </motion.div>
      )}
      {is_gluten_free && (
        <motion.div variants={itemVariants}>
          <Chip
            icon={<NoMeals />}
            label="SIN GLUTEN"
            size="small"
            sx={{ 
              fontWeight: 'bold',
              backgroundColor: '#d81b60',
              color: 'white',
              px: 0.5,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          />
        </motion.div>
      )}
      {is_new && (
        <motion.div variants={itemVariants}>
          <Chip
            icon={<NewReleases />}
            label="NUEVO"
            size="small"
            sx={{ 
              fontWeight: 'bold',
              backgroundColor: '#f57c00',
              color: 'white',
              px: 0.5,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          />
        </motion.div>
      )}
      {is_featured && (
        <motion.div variants={itemVariants}>
          <Chip
            icon={<NewReleases />}
            label="DESTACADO"
            size="small"
            sx={{ 
              fontWeight: 'bold',
              backgroundColor: '#ab47bc',
              color: 'white',
              px: 0.5,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}