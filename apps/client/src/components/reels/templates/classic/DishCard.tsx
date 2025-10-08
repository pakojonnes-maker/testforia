// apps/client/src/components/reels/templates/classic/DishCard.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, IconButton, Typography, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  FavoriteBorder,
  Favorite,
  Share,
  Info,
  VolumeOff,
  VolumeUp,
  Restaurant
} from '@mui/icons-material';
import { useDishTracking } from '../../../../providers/TrackingAndPushProvider';
import type { ReelConfig } from '../../../../hooks/useReelsConfig';

interface DishCardProps {
  dish: any;
  restaurant: any;
  section: any;
  isActive: boolean;
  showUI: boolean;
  config: ReelConfig;
  muted: boolean;
  onMuteToggle: () => void;
  onInteraction: () => void;
}

const ClassicDishCard: React.FC<DishCardProps> = ({
  dish,
  restaurant,
  section,
  isActive,
  showUI,
  config,
  muted,
  onMuteToggle,
  onInteraction
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const { viewDish, favoriteDish, shareDish } = useDishTracking();
  
  const { ref: inViewRef, inView } = useInView({ threshold: 0.7 });
  
  const media = dish?.media?.[0];
  const isVideo = media?.type === 'video';
  const dishName = dish?.translations?.name?.es || dish?.name || 'Plato';
  const description = dish?.translations?.description?.es || '';

  // Auto-play
  useEffect(() => {
    if (!videoRef.current || !isVideo || videoError) return;
    
    const video = videoRef.current;
    
    if (isActive && inView) {
      video.currentTime = 0;
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(console.warn);
      });
    } else {
      video.pause();
    }
  }, [isActive, inView, isVideo, videoError]);

  // Tracking
  useEffect(() => {
    if (isActive && inView && dish?.id) {
      viewDish(dish.id, section?.id);
    }
  }, [isActive, inView, dish?.id, section?.id, viewDish]);

  const handleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !isFavorite;
    setIsFavorite(newState);
    favoriteDish(dish.id, newState);
    onInteraction();
  }, [isFavorite, dish.id, favoriteDish, onInteraction]);

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    shareDish(dish.id, 'native');
    
    if (navigator.share) {
      navigator.share({
        title: dishName,
        text: `¡Mira este delicioso ${dishName} en ${restaurant?.name}!`,
        url: window.location.href
      });
    }
    onInteraction();
  }, [dish.id, dishName, restaurant?.name, shareDish, onInteraction]);

  return (
    <Box
      ref={inViewRef}
      sx={{
        height: '100vh',
        width: '100vw',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: config.colors.background
      }}
    >
      {/* Media */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1
        }}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={media?.url}
            poster={media?.thumbnail_url}
            loop
            muted={muted}
            playsInline
            onLoadedData={() => setVideoLoaded(true)}
            onError={() => setVideoError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              backgroundColor: config.colors.background
            }}
          />
        ) : (
          <img
            src={media?.url || '/placeholder.jpg'}
            alt={dishName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        )}
        
        {/* Gradient overlay */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40%',
            background: `linear-gradient(transparent, ${config.colors.background}dd)`,
            zIndex: 2
          }}
        />
      </Box>

      {/* Action buttons */}
      {showUI && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
        >
          <Box
            sx={{
              position: 'absolute',
              right: 16,
              bottom: '25%',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              zIndex: 10
            }}
          >
            <IconButton
              onClick={handleFavorite}
              sx={{
                bgcolor: 'rgba(0,0,0,0.5)',
                color: isFavorite ? config.colors.primary : config.colors.text,
                width: 56,
                height: 56,
                '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
              }}
            >
              {isFavorite ? <Favorite /> : <FavoriteBorder />}
            </IconButton>

            <IconButton
              onClick={handleShare}
              sx={{
                bgcolor: 'rgba(0,0,0,0.5)',
                color: config.colors.text,
                width: 56,
                height: 56,
                '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
              }}
            >
              <Share />
            </IconButton>

            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(!showDetails);
                onInteraction();
              }}
              sx={{
                bgcolor: 'rgba(0,0,0,0.5)',
                color: config.colors.text,
                width: 56,
                height: 56,
                '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
              }}
            >
              <Info />
            </IconButton>

            {isVideo && (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onMuteToggle();
                }}
                sx={{
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: config.colors.text,
                  width: 56,
                  height: 56,
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                }}
              >
                {muted ? <VolumeOff /> : <VolumeUp />}
              </IconButton>
            )}
          </Box>
        </motion.div>
      )}

      {/* Dish info */}
      {showUI && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
        >
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 80,
              p: 3,
              zIndex: 5
            }}
          >
            <Chip
              icon={<Restaurant sx={{ fontSize: 16 }} />}
              label={restaurant?.name}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.15)',
                color: config.colors.text,
                mb: 1
              }}
            />

            <Typography
              variant="h4"
              sx={{
                color: config.colors.text,
                fontWeight: 700,
                mb: 1,
                fontFamily: config.fonts?.title || "'Playfair Display', serif"
              }}
            >
              {dishName}
            </Typography>

            {dish?.price && (
              <Typography
                variant="h5"
                sx={{
                  color: config.colors.primary,
                  fontWeight: 700,
                  mb: 1
                }}
              >
                €{dish.price.toFixed(2)}
              </Typography>
            )}

            <Typography
              sx={{
                color: config.colors.text,
                fontSize: '1rem',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: showDetails ? 'unset' : 2,
                overflow: 'hidden'
              }}
            >
              {description}
            </Typography>
          </Box>
        </motion.div>
      )}
    </Box>
  );
};

export default ClassicDishCard;
