// apps/client/src/components/reels/templates/premium/PremiumTemplate.tsx
import React from 'react';
import { Box } from '@mui/material';
import { AnimatePresence } from 'framer-motion';
import type { ReelConfig } from '../../../../hooks/useReelsConfig';
import PremiumHeader from './PremiumHeader';

interface PremiumTemplateProps {
  config: ReelConfig;
  showUI: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

const PremiumTemplate: React.FC<PremiumTemplateProps> = ({
  config,
  showUI,
  onClose,
  children
}) => {
  const glassmorphism = config.config.glassmorphism !== false;
  const blurIntensity = config.config.blur_intensity || 20;

  const branding = config.restaurant?.branding || {};
  const colors = {
    primary: branding.primary_color || branding.primaryColor || '#FF6B6B',
    secondary: branding.secondary_color || branding.secondaryColor || '#4ECDC4',
    text: branding.text_color || branding.textColor || '#FFFFFF',
    background: branding.background_color || branding.backgroundColor || '#000000'
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        bgcolor: colors.background,
        fontFamily: branding.fontFamily || "'Montserrat', sans-serif",
        // Premium gradient overlay
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 20% 50%, ${colors.primary}15 0%, transparent 50%), 
                       radial-gradient(circle at 80% 80%, ${colors.secondary}15 0%, transparent 50%)`,
          pointerEvents: 'none',
          zIndex: 0
        }
      }}
    >
      <AnimatePresence>
        {showUI && (
          <PremiumHeader
            restaurantName={config.restaurant?.name || 'Restaurant'}
            onClose={onClose}
            colors={colors}
            glassmorphism={glassmorphism}
            blurIntensity={blurIntensity}
          />
        )}
      </AnimatePresence>

      {(children as any)}
    </Box>
  );
};

export default PremiumTemplate;
