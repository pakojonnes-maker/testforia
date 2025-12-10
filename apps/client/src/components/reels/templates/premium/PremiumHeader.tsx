// apps/client/src/components/reels/templates/premium/PremiumHeader.tsx
import React from 'react';
import { Box, Typography, IconButton, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import { ArrowBack } from '@mui/icons-material';
interface PremiumHeaderProps {
  restaurantName: string;
  onClose?: () => void;
  colors: {
    primary: string;
    secondary: string;
    text: string;
    background: string;
  };
  glassmorphism: boolean;
  blurIntensity: number;
}

const PremiumHeader: React.FC<PremiumHeaderProps> = ({
  restaurantName,
  onClose,
  colors,
  glassmorphism,
  blurIntensity
}) => {
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: glassmorphism
            ? `linear-gradient(135deg, ${alpha(colors.primary, 0.1)} 0%, ${alpha(colors.secondary, 0.1)} 100%)`
            : `linear-gradient(180deg, ${alpha(colors.background, 0.9)} 0%, transparent 100%)`,
          backdropFilter: glassmorphism ? `blur(${blurIntensity}px) saturate(180%)` : 'blur(10px)',
          WebkitBackdropFilter: glassmorphism ? `blur(${blurIntensity}px) saturate(180%)` : 'blur(10px)',
          borderBottom: `1px solid ${alpha(colors.text, 0.1)}`,
          pt: 6,
          pb: 3,
          px: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {onClose && (
            <IconButton
              onClick={onClose}
              sx={{
                color: colors.text,
                bgcolor: glassmorphism
                  ? alpha(colors.text, 0.15)
                  : alpha(colors.text, 0.1),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(colors.text, 0.2)}`,
                '&:hover': {
                  bgcolor: alpha(colors.text, 0.25),
                  transform: 'scale(1.05)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              <ArrowBack />
            </IconButton>
          )}

          <Box sx={{ flex: 1, textAlign: 'center', px: 2 }}>
            <Typography
              variant="h5"
              sx={{
                color: colors.text,
                fontWeight: 300,
                fontFamily: "'Playfair Display', serif",
                letterSpacing: '0.05em',
                textShadow: `0 2px 10px ${alpha(colors.background, 0.5)}`
              }}
            >
              {restaurantName}
            </Typography>
          </Box>

          <Box sx={{ width: 48 }} />
        </Box>
      </Box>
    </motion.div>
  );
};

export default PremiumHeader;
