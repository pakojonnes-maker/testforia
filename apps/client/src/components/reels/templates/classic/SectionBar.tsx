// apps/client/src/components/reels/templates/classic/SectionsBar.tsx
import React from 'react';
import { Box, Typography, Paper, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import type { ReelConfig } from '../../../../hooks/useReelsConfig';

interface Section {
  id: string;
  name: string;
  translations?: {
    name?: { [key: string]: string };
  };
}

interface SectionsBarProps {
  sections: Section[];
  currentSectionIndex: number;
  currentDishIndex: number;
  totalDishesInSection: number;
  onSectionChange: (index: number) => void;
  config: ReelConfig;
}

const ClassicSectionsBar: React.FC<SectionsBarProps> = ({
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
          background: `linear-gradient(to top, ${alpha(config.colors.background, 0.95)} 0%, ${alpha(config.colors.background, 0.7)} 100%)`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: `1px solid ${alpha(config.colors.text, 0.1)}`,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          pb: 3,
          pt: 2
        }}
      >
        {/* Handle */}
        <Box
          sx={{
            width: 40,
            height: 4,
            bgcolor: alpha(config.colors.text, 0.3),
            borderRadius: 2,
            mx: 'auto',
            mb: 2
          }}
        />
        
        {/* Sections */}
        <Box
          sx={{
            display: 'flex',
            overflowX: 'auto',
            px: 2,
            gap: 1,
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
                onClick={() => onSectionChange(index)}
                style={{
                  padding: '12px 20px',
                  borderRadius: 20,
                  background: isActive 
                    ? config.colors.primary 
                    : alpha(config.colors.text, 0.1),
                  color: config.colors.text,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  border: `1px solid ${isActive ? config.colors.primary : alpha(config.colors.text, 0.2)}`,
                  boxShadow: isActive ? `0 4px 12px ${alpha(config.colors.primary, 0.4)}` : 'none'
                }}
                animate={{
                  scale: isActive ? 1.05 : 1
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '0.9rem'
                  }}
                >
                  {getSectionName(section)}
                </Typography>
              </motion.div>
            );
          })}
        </Box>
        
        {/* Progress indicator */}
        {config.config.show_progress && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 0.5 }}>
            {Array.from({ length: totalDishesInSection }).map((_, index) => (
              <Box
                key={index}
                sx={{
                  width: index === currentDishIndex ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: index === currentDishIndex 
                    ? config.colors.primary 
                    : alpha(config.colors.text, 0.3),
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </Box>
        )}
      </Paper>
    </motion.div>
  );
};

export default ClassicSectionsBar;
