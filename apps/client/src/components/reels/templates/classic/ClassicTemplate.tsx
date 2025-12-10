// apps/client/src/components/reels/templates/classic/ClassicTemplate.tsx
import React from 'react';
import { Box } from '@mui/material';
import { AnimatePresence } from 'framer-motion';
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
        fontFamily: branding.fontFamily || 'Inter, sans-serif'
      }}
    >
      {/* Header */}
      <AnimatePresence>
        {showUI && (
          <ClassicHeader
            restaurant={config.restaurant}
            config={config as any}
            currentSection={null}
            currentLanguage={'es'}
            languages={config.languages || []}
            onLanguageChange={() => { }}
            onClose={onClose}
          />
        )}
      </AnimatePresence>

      {/* Main content (swipers) */}
      {(children as any)}
    </Box>
  );
};

export default ClassicTemplate;
