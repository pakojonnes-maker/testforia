// apps/client/src/components/reels/templates/premium/DishCard.tsx
// Similar a ClassicDishCard pero con efectos glassmorphism
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, IconButton, Typography, Chip, alpha } from '@mui/material';
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

const PremiumDishCard: React.FC<DishCardProps> = ({
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
  const { viewDish, favoriteDish, shareDish, trackDishViewDuration, isFavorited } = useDishTracking();
  const [isFavorite, setIsFavorite] = useState(() => isFavorited(dish.id));

  const { ref: inViewRef, inView } = useInView({ threshold: 0.7 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showDetails, setShowDetails] = useState(false);
  // ✅ Video-First Loading Pattern
  const [videoReady, setVideoReady] = useState(false);
  const [showFallbackImage, setShowFallbackImage] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ FIX: Refs for duration tracking to avoid closure issues
  const viewStartTimeRef = useRef<number | null>(null);
  const lastTrackedDishRef = useRef<string | null>(null);

  const branding = config.restaurant?.branding || {};
  const colors = {
    primary: branding.primary_color || branding.primaryColor || '#FF6B6B',
    secondary: branding.secondary_color || branding.secondaryColor || '#4ECDC4',
    text: branding.text_color || branding.textColor || '#FFFFFF',
    background: branding.background_color || branding.backgroundColor || '#000000'
  };

  const media = dish?.media?.[0];
  const isVideo = media?.type === 'video';
  const dishName = dish?.translations?.name?.es || dish?.name || 'Plato';
  const description = dish?.translations?.description?.es || '';

  const glassmorphism = config.config.glassmorphism !== false;
  const blurIntensity = config.config.blur_intensity || 20;

  // ✅ Reset video state when dish changes
  useEffect(() => {
    setVideoReady(false);
    setShowFallbackImage(false);
    setVideoError(false);
    if (videoLoadTimeoutRef.current) {
      clearTimeout(videoLoadTimeoutRef.current);
      videoLoadTimeoutRef.current = null;
    }
  }, [dish?.id]);

  // ✅ Video-First: Start timeout when video should play
  useEffect(() => {
    if (!isVideo || !isActive || !inView) {
      if (videoLoadTimeoutRef.current) {
        clearTimeout(videoLoadTimeoutRef.current);
        videoLoadTimeoutRef.current = null;
      }
      return;
    }

    videoLoadTimeoutRef.current = setTimeout(() => {
      if (!videoReady) {
        setShowFallbackImage(true);
      }
    }, 500);

    return () => {
      if (videoLoadTimeoutRef.current) {
        clearTimeout(videoLoadTimeoutRef.current);
        videoLoadTimeoutRef.current = null;
      }
    };
  }, [isVideo, isActive, inView, videoReady]);

  // Auto-play logic
  useEffect(() => {
    if (!videoRef.current || !isVideo || videoError) return;
    const video = videoRef.current;
    if (isActive && inView) {
      video.currentTime = 0;
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {
          setVideoError(true);
          setShowFallbackImage(true);
        });
      });
    } else {
      video.pause();
    }
  }, [isActive, inView, isVideo, videoError]);

  // ✅ FIX: Unified view and duration tracking with refs
  useEffect(() => {
    const isCurrentlyViewing = isActive && inView && dish?.id;

    // Start tracking when dish becomes visible
    if (isCurrentlyViewing && !viewStartTimeRef.current) {
      viewDish(dish.id, section?.id);
      viewStartTimeRef.current = Date.now();
      lastTrackedDishRef.current = dish.id;
    }

    // Send duration when dish becomes invisible
    if (!isCurrentlyViewing && viewStartTimeRef.current && lastTrackedDishRef.current) {
      const duration = Math.floor((Date.now() - viewStartTimeRef.current) / 1000);
      if (duration > 0) {
        trackDishViewDuration(lastTrackedDishRef.current, duration, section?.id);
      }
      viewStartTimeRef.current = null;
      lastTrackedDishRef.current = null;
    }
  }, [isActive, inView, dish?.id, section?.id, viewDish, trackDishViewDuration]);

  // ✅ FIX: Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (viewStartTimeRef.current && lastTrackedDishRef.current) {
        const duration = Math.floor((Date.now() - viewStartTimeRef.current) / 1000);
        if (duration > 0) {
          trackDishViewDuration(lastTrackedDishRef.current, duration, section?.id);
        }
      }
    };
  }, []);

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
        text: `¡Descubre ${dishName} en ${restaurant?.name}!`,
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
        bgcolor: colors.background
      }}
    >
      {/* Media con efectos premium */}
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
        {isVideo && !videoError ? (
          <>
            {/* ✅ Video-First: starts invisible, fades in when ready */}
            <video
              ref={videoRef}
              src={media?.url}
              loop
              muted={muted}
              playsInline
              preload={isActive ? 'auto' : 'metadata'}
              onCanPlayThrough={() => {
                setVideoReady(true);
                setShowFallbackImage(false);
                if (videoLoadTimeoutRef.current) {
                  clearTimeout(videoLoadTimeoutRef.current);
                  videoLoadTimeoutRef.current = null;
                }
              }}
              onError={() => {
                setVideoError(true);
                setShowFallbackImage(true);
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'saturate(110%) brightness(105%)',
                opacity: videoReady ? 1 : 0,
                transition: 'opacity 0.3s ease-in'
              }}
            />

            {/* ✅ Fallback Image: Only shown if timeout or error */}
            {showFallbackImage && (
              <img
                src={media?.thumbnail_url || media?.url || '/placeholder.jpg'}
                alt={dishName}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: 'saturate(110%) brightness(105%)',
                  opacity: videoReady ? 0 : 1,
                  transition: 'opacity 0.3s ease-out',
                  pointerEvents: 'none'
                }}
              />
            )}
          </>
        ) : (
          /* ✅ Image-only display with blurred background for better mobile viewing */
          <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Blurred background layer - fills empty space aesthetically */}
            <img
              src={media?.url || '/placeholder.jpg'}
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'blur(30px) brightness(0.4) saturate(110%)',
                transform: 'scale(1.1)', // Prevent blur edge artifacts
                zIndex: 0
              }}
            />
            {/* Main image - fully visible without cropping */}
            <img
              src={media?.url || '/placeholder.jpg'}
              alt={dishName}
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                objectFit: 'contain', // ✅ Show full image without cropping
                filter: 'saturate(110%) brightness(105%)',
                zIndex: 1
              }}
            />
          </Box>
        )}

        {/* Premium gradient overlay with radial */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '50%',
            background: `radial-gradient(ellipse at bottom, ${alpha(colors.background, 0.9)} 0%, ${alpha(colors.background, 0.4)} 50%, transparent 100%)`,
            zIndex: 2
          }}
        />
      </Box>

      {/* Visual Indicators */}


      {/* Action buttons with glassmorphism */}
      {showUI && (
        <motion.div
          initial={{ x: 100, opacity: 0, scale: 0.8 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 100, opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        >
          <Box
            sx={{
              position: 'absolute',
              right: 16,
              bottom: '25%',
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
              zIndex: 10
            }}
          >
            {[
              { icon: isFavorite ? <Favorite /> : <FavoriteBorder />, onClick: handleFavorite, color: isFavorite ? colors.primary : colors.text },
              { icon: <Share />, onClick: handleShare, color: colors.text },
              { icon: <Info />, onClick: (e: React.MouseEvent) => { e.stopPropagation(); setShowDetails(!showDetails); onInteraction(); }, color: colors.text },
              ...(isVideo ? [{ icon: muted ? <VolumeOff /> : <VolumeUp />, onClick: (e: React.MouseEvent) => { e.stopPropagation(); onMuteToggle(); }, color: colors.text }] : [])
            ].map((btn, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <IconButton
                  onClick={btn.onClick}
                  sx={{
                    bgcolor: glassmorphism
                      ? alpha(colors.text, 0.15)
                      : alpha(colors.background, 0.6),
                    backdropFilter: glassmorphism ? `blur(${blurIntensity}px) saturate(180%)` : 'blur(10px)',
                    WebkitBackdropFilter: glassmorphism ? `blur(${blurIntensity}px) saturate(180%)` : 'blur(10px)',
                    color: btn.color,
                    width: 58,
                    height: 58,
                    border: `1px solid ${alpha(colors.text, 0.2)}`,
                    boxShadow: `0 8px 32px ${alpha(colors.background, 0.4)}`,
                    '&:hover': {
                      bgcolor: alpha(colors.text, 0.25),
                      borderColor: alpha(btn.color, 0.5)
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  {btn.icon}
                </IconButton>
              </motion.div>
            ))}
          </Box>
        </motion.div>
      )}

      {/* Dish info with glassmorphism */}
      {showUI && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 80,
              p: 3,
              zIndex: 5,
              ...(glassmorphism && {
                bgcolor: alpha(colors.background, 0.2),
                backdropFilter: `blur(${blurIntensity}px) saturate(180%)`,
                WebkitBackdropFilter: `blur(${blurIntensity}px) saturate(180%)`,
                borderTop: `1px solid ${alpha(colors.text, 0.1)}`,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24
              })
            }}
          >
            <Chip
              icon={<Restaurant sx={{ fontSize: 16 }} />}
              label={restaurant?.name}
              size="small"
              sx={{
                bgcolor: alpha(colors.text, 0.15),
                backdropFilter: 'blur(10px)',
                color: colors.text,
                border: `1px solid ${alpha(colors.text, 0.2)}`,
                mb: 1.5
              }}
            />

            <Typography
              variant="h4"
              sx={{
                color: colors.text,
                fontWeight: 400,
                mb: 1,
                fontFamily: "'Playfair Display', serif",
                textShadow: `0 2px 20px ${alpha(colors.background, 0.8)}`
              }}
            >
              {dishName}
            </Typography>

            {dish?.price && (
              <Typography
                variant="h5"
                sx={{
                  color: colors.primary,
                  fontWeight: 700,
                  mb: 1.5,
                  textShadow: `0 2px 10px ${alpha(colors.primary, 0.5)}`
                }}
              >
                €{dish.price.toFixed(2)}
              </Typography>
            )}

            <Typography
              sx={{
                color: colors.text,
                fontSize: '1.05rem',
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: showDetails ? 'unset' : 2,
                overflow: 'hidden',
                opacity: 0.95
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

export default PremiumDishCard;
