// Crear un nuevo componente en apps/admin/src/components/media/VideoThumbnailPlaceholder.tsx

import React from 'react';
import { Box, Typography } from '@mui/material';
import { VideoLibrary as VideoIcon, BrokenImage as BrokenImageIcon } from '@mui/icons-material';

interface VideoThumbnailPlaceholderProps {
  width?: string | number;
  height?: string | number;
  fontSize?: string | number;
  iconSize?: string | number;
  backgroundColor?: string;
  color?: string;
  text?: string;
}

/**
 * Componente que muestra un placeholder con icono para videos sin thumbnail
 */
const VideoThumbnailPlaceholder: React.FC<VideoThumbnailPlaceholderProps> = ({
  width = '100%',
  height = 180,
  fontSize = '0.75rem',
  iconSize = '3rem',
  backgroundColor = '#1a1a1a',
  color = 'rgba(255, 255, 255, 0.8)',
  text = 'Video sin miniatura'
}) => {
  return (
    <Box
      sx={{
        width,
        height,
        backgroundColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 1,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.2) 100%)',
          zIndex: 0
        }
      }}
    >
      <VideoIcon sx={{ fontSize: iconSize, mb: 1, position: 'relative', zIndex: 1 }} />
      <Typography 
        variant="caption" 
        sx={{ 
          fontSize, 
          position: 'relative', 
          zIndex: 1,
          textAlign: 'center',
          px: 1
        }}
      >
        {text}
      </Typography>
    </Box>
  );
};

export default VideoThumbnailPlaceholder;