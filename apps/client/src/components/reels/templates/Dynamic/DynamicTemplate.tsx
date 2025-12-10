// apps/client/src/components/reels/templates/dynamic/DynamicTemplate.tsx
import React from 'react';
import { Box } from '@mui/material';
import type { ReelConfig } from '../../../../hooks/useReelsConfig';

interface DynamicTemplateProps {
  config: ReelConfig;
  showUI: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

const DynamicTemplate: React.FC<DynamicTemplateProps> = ({
  config,
  children
}) => {
  const branding = config.restaurant?.branding || {};

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        bgcolor: branding.background_color || branding.backgroundColor || '#000000',
        fontFamily: branding.fontFamily || "'Montserrat', sans-serif",
        overflow: 'hidden'
      }}
    >
      {(children as any)}
    </Box>
  );
};

export default DynamicTemplate;
