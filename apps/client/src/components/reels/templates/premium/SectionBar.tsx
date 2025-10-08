// apps/client/src/components/reels/templates/premium/SectionsBar.tsx
// Similar a Classic pero con efectos glassmorphism más intensos
import React from 'react';
import { Box, Typography, Paper, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import type { ReelConfig } from '../../../../hooks/useReelsConfig';

interface Section {
  id: string;
  name: string;
  translations?: { name?: { [key: string]: string } };
}

interface SectionsBarProps {
  sections: Section[];
  currentSectionIndex: number;
  currentDishIndex: number;
  totalDishesInSection: number;
  onSectionChange: (index: number) => void;
  config: ReelConfig;
}

const PremiumSectionsBar: React.FC<SectionsBarProps> = ({
  sections,
  currentSectionIndex,
  currentDishIndex,
  totalDishesInSection,
  onSectionChange,
  config
}) => {
  const getSectionName = (section: Section) => {
    return section.translations?.name?.es || section.name || 'Sin nombre';
  };

  const glassmorphism = config.config.glassmorphism !== false;
  const blurIntensity = config.config.blur_intensity || 20;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 200 }}
    >
      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: glassmorphism
            ? `linear-gradient(to top, ${alpha(config.colors.background, 0.8)} 0%, ${alpha(config.colors.background, 0.5)} 100%)`
            : `linear-gradient(to top, ${alpha(config.colors.background, 0.95)} 0%, ${alpha(config.colors.background, 0.7)} 100%)`,
          backdropFilter: glassmorphism ? `blur(${blurIntensity}px) saturate(180%)` : 'blur(20px)',
          WebkitBackdropFilter: glassmorphism ? `blur(${blurIntensity}px) saturate(180%)` : 'blur(20px)',
          borderTop: `1px solid ${alpha(config.colors.text, 0.15)}`,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          pb: 3,
          pt: 2,
          boxShadow: `0 -10px 40px ${alpha(config.colors.background, 0.3)}`
        }}
      >
        <Box
          sx={{
            width: 50,
            height: 5,
            bgcolor: alpha(config.colors.text, 0.3),
            borderRadius: 3,
            mx: 'auto',
            mb: 2.5
          }}
        />
        
        <Box
          sx={{
            display: 'flex',
            overflowX: 'auto',
            px: 2,
            gap: 1.5,
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' }
          }}
        >
          {sections.map((section, index) => {
            const isActive = currentSectionIndex === index;
            
            return (
              <motion.div
                key={section.id}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => onSectionChange(index)}
                style={{
                  padding: '14px 24px',
                  borderRadius: 24,
                  background: isActive 
                    ? `linear-gradient(135deg, ${config.colors.primary} 0%, ${config.colors.secondary} 100%)`
                    : alpha(config.colors.text, 0.12),
                  color: config.colors.text,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  border: `1px solid ${isActive ? alpha(config.colors.primary, 0.5) : alpha(config.colors.text, 0.2)}`,
                  boxShadow: isActive 
                    ? `0 8px 24px ${alpha(config.colors.primary, 0.5)}`
                    : 'none',
                  backdropFilter: 'blur(10px)'
                }}
                animate={{
                  scale: isActive ? 1.05 : 1,
                  y: isActive ? -4 : 0
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.95rem',
                    letterSpacing: '0.02em'
                  }}
                >
                  {getSectionName(section)}
                </Typography>
              </motion.div>
            );
          })}
        </Box>
        
        {config.config.show_progress && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2.5, gap: 0.7 }}>
            {Array.from({ length: totalDishesInSection }).map((_, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0.8 }}
                animate={{ 
                  scale: index === currentDishIndex ? 1 : 0.8,
                  width: index === currentDishIndex ? 24 : 7
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <Box
                  sx={{
                    height: 7,
                    borderRadius: 4,
                    bgcolor: index === currentDishIndex 
                      ? config.colors.primary 
                      : alpha(config.colors.text, 0.25),
                    boxShadow: index === currentDishIndex 
                      ? `0 0 12px ${alpha(config.colors.primary, 0.6)}`
                      : 'none'
                  }}
                />
              </motion.div>
            ))}
          </Box>
        )}
      </Paper>
    </motion.div>
  );
};

export default PremiumSectionsBar;
