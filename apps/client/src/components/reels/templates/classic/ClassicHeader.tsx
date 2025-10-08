// apps/client/src/components/reels/templates/classic/ClassicHeader.tsx
import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { motion } from 'framer-motion';
import { ArrowBack } from '@mui/icons-material';
import type { ReelColors } from '../../../../hooks/useReelsConfig';

interface ClassicHeaderProps {
  restaurantName: string;
  onClose?: () => void;
  colors: ReelColors;
}

const ClassicHeader: React.FC<ClassicHeaderProps> = ({
  restaurantName,
  onClose,
  colors
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
          background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          pt: 6,
          pb: 2,
          px: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {onClose && (
            <IconButton
              onClick={onClose}
              sx={{
                color: colors.text,
                bgcolor: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
              }}
            >
              <ArrowBack />
            </IconButton>
          )}
          
          <Box sx={{ flex: 1, textAlign: 'center', px: 2 }}>
            <Typography
              variant="h6"
              sx={{
                color: colors.text,
                fontWeight: 400,
                fontFamily: "'Playfair Display', serif"
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

export default ClassicHeader;
