// apps/client/src/components/reels/templates/classic/ClassicTemplate.tsx
import React from 'react';
import { Box } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import type { ReelConfig } from '../../../../hooks/useReelsConfig';
import ClassicHeader from './Header';

interface ClassicTemplateProps {
  config: ReelConfig;
  showUI: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

const ClassicTemplate: React.FC<ClassicTemplateProps> = ({
  config,
  showUI,
  onClose,
  children
}) => {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        bgcolor: config.colors.background,
        fontFamily: config.fonts?.body || 'Inter, sans-serif'
      }}
    >
      {/* Header */}
      <AnimatePresence>
        {showUI && (
          <ClassicHeader
            restaurantName={config.restaurantName}
            onClose={onClose}
            colors={config.colors}
          />
        )}
      </AnimatePresence>

      {/* Main content (swipers) */}
      {children}
    </Box>
  );
};

export default ClassicTemplate;
