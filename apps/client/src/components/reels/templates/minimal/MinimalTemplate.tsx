// apps/client/src/components/reels/templates/minimal/MinimalTemplate.tsx
import React from 'react';
import { Box } from '@mui/material';
import type { ReelConfig } from '../../../../hooks/useReelsConfig';

interface MinimalTemplateProps {
  config: ReelConfig;
  showUI: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

const MinimalTemplate: React.FC<MinimalTemplateProps> = ({
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
        fontFamily: "'Inter', -apple-system, sans-serif"
      }}
    >
      {children}
    </Box>
  );
};

export default MinimalTemplate;
