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
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        bgcolor: config.colors.background,
        fontFamily: config.fonts?.body || "'Montserrat', sans-serif",
        overflow: 'hidden'
      }}
    >
      {children}
    </Box>
  );
};

export default DynamicTemplate;
