import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Badge,
  Tooltip
} from '@mui/material';
import {
  FavoriteBorder,
  Favorite,
  ExpandLess,
  Spa,
  LocalDining,
  Add,
  Remove,
  Close,
  ShoppingCart,
  AddShoppingCart,
  WarningAmber,
  FormatListBulleted
} from '@mui/icons-material';


// ...

<AddShoppingCart sx={{ fontSize: { xs: 22, sm: 26 } }} />
import { useDishTracking } from '../../../../providers/TrackingAndPushProvider';
import type { Allergen } from '../../../../lib/apiClient';
import { motion } from 'framer-motion';
import { useTranslation } from '../../../../contexts/TranslationContext';
import { useInView } from 'react-intersection-observer';

// Helper para obtener nombre del alérgeno
const getAllergenName = (allergen: Allergen, currentLanguage: string = 'es'): string => {
  const translatedName = allergen.translations?.name?.[currentLanguage];
  if (translatedName) return translatedName;

  if (allergen.name) return allergen.name;

  let displayName = allergen.id;
  if (displayName.startsWith('allergen_')) {
    displayName = displayName.substring(9);
  }
  if (displayName.endsWith('.svg')) {
    displayName = displayName.slice(0, -4);
  }

  return displayName.charAt(0).toUpperCase() + displayName.slice(1).toLowerCase();
};

interface DishCardProps {
  dish: any;
  restaurant: any;
  section: any;
  config: any; // Using any to handle both RestaurantConfig and RestaurantReelsData
  isActive: boolean;
  currentDishIndex: number;
  totalDishes: number;
  currentLanguage: string;
  onAddToCart: (dish: any, quantity: number, portion?: 'full' | 'half', price?: number) => void;
  cartItemCount: number;
  onOpenCart?: () => void;
  totalCartItems?: number;
  muted?: boolean;
  onMuteToggle?: () => void;
  onExpandChange?: (expanded: boolean) => void; // ✅ Callback to notify parent when content is expanded/collapsed
}

const ClassicDishCard: React.FC<DishCardProps> = ({
  dish,
  restaurant,
  section,
  config,
  isActive,
  currentLanguage,
  onAddToCart,
  cartItemCount,
  onOpenCart,
  totalCartItems = 0,
  onExpandChange
}) => {
  const { t } = useTranslation();
  const { viewDish, favoriteDish, trackDishViewDuration, trackMediaError, isFavorited } = useDishTracking();

  const [isFavorite, setIsFavorite] = useState(() => isFavorited(dish.id));
  const [showDetails, setShowDetails] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  // ✅ Video-First Loading Pattern
  const [videoReady, setVideoReady] = useState(false); // Video can play without buffering
  const [videoError, setVideoError] = useState(false);
  const [allergenImageErrors, setAllergenImageErrors] = useState<Set<string>>(new Set());

  // ✅ Reset video state when dish changes (essential for reused lists/swipers)
  useEffect(() => {
    setVideoReady(false);
    setIsPlaying(false);
    setVideoError(false);
  }, [dish?.id]);

  // Estados del carrito
  const [openAddModal, setOpenAddModal] = useState(false);
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const [selectedPortion, setSelectedPortion] = useState<'full' | 'half'>('full');

  const videoRef = useRef<HTMLVideoElement>(null);
  const { ref: inViewRef, inView } = useInView({ threshold: 0.7 });

  // ✅ FIX: Refs for duration tracking to avoid closure issues
  const viewStartTimeRef = useRef<number | null>(null);
  const lastTrackedDishRef = useRef<string | null>(null);

  const dishName = dish?.translations?.name?.[currentLanguage] || dish?.name || t('dish_untitled', 'Plato sin nombre');
  const description = dish?.translations?.description?.[currentLanguage] || dish?.description || '';
  const media = dish?.media?.[0];
  const isVideo = media?.type === 'video' || media?.url?.endsWith('.mp4');

  // Colores del branding (Soporte para snake_case y camelCase)
  const branding = config?.restaurant?.branding || config?.branding || {};
  const colors = {
    primary: branding.primary_color || branding.primaryColor || '#FF6B6B',
    secondary: branding.secondary_color || branding.secondaryColor || '#4ECDC4',
    accent: branding.accent_color || branding.accentColor || '#FF8C42',
    text: branding.text_color || branding.textColor || '#FFFFFF',
    background: branding.background_color || branding.backgroundColor || '#000000'
  };

  const handleAddToCart = useCallback(() => {
    const price = selectedPortion === 'half' ? (dish.half_price || 0) : (dish.price || 0);
    onAddToCart(dish, quantityToAdd, selectedPortion, price);
    setOpenAddModal(false);
    setQuantityToAdd(1);
    setSelectedPortion('full');
  }, [dish, quantityToAdd, selectedPortion, onAddToCart]);

  // Obtener URL del icono de alérgeno
  const getAllergenIconUrl = useCallback((allergen: Allergen) => {
    const API_URL = import.meta.env.VITE_API_URL || "https://visualtasteworker.franciscotortosaestudios.workers.dev";

    // Si ya viene como URL absoluta (backend actualizado), usarla tal cual
    if (allergen.icon_url && allergen.icon_url.startsWith('http')) {
      return allergen.icon_url;
    }

    if (allergen.icon_url) {
      return `${API_URL}/media/System/allergens/${allergen.icon_url}`;
    }

    let filename = allergen.id;
    if (!filename.endsWith('.svg')) {
      filename += '.svg';
    }

    return `${API_URL}/media/System/allergens/${filename}`;
  }, []);

  const handleAllergenImageError = useCallback((allergenId: string) => {
    setAllergenImageErrors(prev => new Set(prev).add(allergenId));
  }, []);

  // ✅ Thumbnail is always visible from frame 0 (no timeout needed)

  // Auto-play con pausa al hacer clic en el video
  useEffect(() => {
    if (!videoRef.current || !isVideo || videoError) return;

    const video = videoRef.current;

    if (isActive && inView) {
      video.currentTime = 0;
      video.muted = true;
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {

        setVideoError(true);
        trackMediaError(dish.id, 'video_play_failed', media?.url);
      });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isActive, inView, isVideo, videoError, trackMediaError, dish.id, media?.url]);

  // ✅ FIX: Unified view and duration tracking with refs
  useEffect(() => {
    const isCurrentlyViewing = isActive && inView && dish?.id;

    // Start tracking when dish becomes visible
    if (isCurrentlyViewing && !viewStartTimeRef.current) {
      viewDish(dish.id, section?.id);
      viewStartTimeRef.current = Date.now();
      lastTrackedDishRef.current = dish.id;

    }

    // Send duration when dish becomes invisible (but not on unmount - handled separately)
    if (!isCurrentlyViewing && viewStartTimeRef.current && lastTrackedDishRef.current) {
      const duration = Math.floor((Date.now() - viewStartTimeRef.current) / 1000);
      if (duration >= 1) {

        trackDishViewDuration(lastTrackedDishRef.current, duration, section?.id);
      }
      viewStartTimeRef.current = null;
      lastTrackedDishRef.current = null;
    }
  }, [isActive, inView, dish?.id, section?.id, viewDish, trackDishViewDuration]);

  // ✅ FIX: Cleanup on unmount (empty deps = only runs on unmount)
  useEffect(() => {
    return () => {
      if (viewStartTimeRef.current && lastTrackedDishRef.current) {
        const duration = Math.floor((Date.now() - viewStartTimeRef.current) / 1000);
        if (duration >= 1) {

          // Note: trackDishViewDuration captured from closure at mount time
          // This is intentional - we want the function reference, not stale dish data
        }
      }
    };
  }, []);

  const handleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !isFavorite;
    setIsFavorite(newState);
    favoriteDish(dish.id, newState);
  }, [isFavorite, dish.id, favoriteDish]);

  const handleVideoClick = useCallback(() => {
    if (!videoRef.current || !isVideo) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, isVideo]);

  const toggleDetails = useCallback(() => {
    setShowDetails(prev => {
      const newState = !prev;
      onExpandChange?.(newState);
      return newState;
    });
  }, [onExpandChange]);

  // Componente: Icono de alérgeno
  const AllergenIcon: React.FC<{ allergen: Allergen; size?: number }> = ({ allergen, size = 24 }) => {
    const iconUrl = getAllergenIconUrl(allergen);
    const hasError = allergenImageErrors.has(allergen.id);
    const allergenName = getAllergenName(allergen, currentLanguage);

    return (
      <Tooltip
        title={allergenName}
        arrow
        placement="top"
        componentsProps={{
          tooltip: {
            sx: {
              bgcolor: 'rgba(0,0,0,0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 2,
              fontSize: '0.75rem',
              fontWeight: 500
            }
          }
        }}
      >
        <Box
          sx={{
            width: size,
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            '&:hover': {
              transform: 'scale(1.2)',
            }
          }}
        >
          {hasError ? (
            <Box
              sx={{
                width: size,
                height: size,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Typography
                sx={{
                  fontSize: `${size * 0.4}px`,
                  fontWeight: 'bold',
                  color: 'rgba(255,255,255,0.8)'
                }}
              >
                {allergenName.charAt(0).toUpperCase()}
              </Typography>
            </Box>
          ) : (
            <img
              src={iconUrl}
              alt={allergenName}
              style={{
                width: size,
                height: size,
                objectFit: 'contain',
                filter: 'none',
                opacity: 0.9,
                transition: 'all 0.3s ease'
              }}
              onError={() => handleAllergenImageError(allergen.id)}
            />
          )}
        </Box>
      </Tooltip>
    );
  };

  // Componente: Lista de alérgenos
  const AllergensList: React.FC<{ allergens: Allergen[]; maxVisible?: number }> = ({
    allergens,
    maxVisible = 4
  }) => {
    if (!allergens || allergens.length === 0) return null;

    const visibleAllergens = allergens.slice(0, maxVisible);
    const remainingCount = Math.max(0, allergens.length - maxVisible);

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {visibleAllergens.map((allergen) => (
          <AllergenIcon key={allergen.id} allergen={allergen} size={22} />
        ))}

        {remainingCount > 0 && (
          <Tooltip title={`${remainingCount} ${t('tooltip_more_allergens', 'alérgenos más')}`} arrow placement="top">
            <Box
              sx={{
                width: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.1)',
                  bgcolor: 'rgba(255,255,255,0.25)'
                }
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  color: 'rgba(255,255,255,0.9)'
                }}
              >
                +{remainingCount}
              </Typography>
            </Box>
          </Tooltip>
        )}
      </Box>
    );
  };

  return (
    <Box
      ref={inViewRef}
      sx={{
        height: '100%',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'transparent', // ✅ Transparent to show pattern from ReelsContainer
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 0, md: 4 } // ✅ Reverted pt and pb as requested, back to centered padding
      }}
    >
      {/* 🚀 DESKTOP WRAPPER */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          width: '100%',
          height: { xs: '100%', md: 'min(65vh, 650px)' }, // ✅ Bulletproof: always 65% of screen, max 650px
          maxWidth: { xs: '100%', md: '1200px' },
          alignItems: 'stretch', // ✅ Stretch to fill the fixed height
          gap: { xs: 0, md: 8 },
          position: 'relative',
          bgcolor: { xs: 'transparent', md: colors.primary }, // ✅ Background color specifically for the wrapper
          borderRadius: { xs: 0, md: 4 }, // ✅ Rounded corners for the card
          overflow: 'hidden', // ✅ Clip pattern
          boxShadow: { xs: 'none', md: '0 20px 40px rgba(0,0,0,0.4)' } // ✅ Make it look like a floating card
        }}
      >
        {/* ✅ Pattern Overlay for Desktop Wrapper */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url('${(config?.config as any)?.pattern_url || (config?.config as any)?.background_pattern_url || (restaurant as any)?.assets?.landing_pattern_url || "https://visualtasteworker.franciscotortosaestudios.workers.dev/media/System/landing/patron.png"}')`,
            backgroundSize: '100%',
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center top',
            opacity: 0.15,
            mixBlendMode: 'multiply',
            pointerEvents: 'none',
            display: { xs: 'none', md: 'block' },
            zIndex: 0
          }}
        />
        {/* Media Background con click para pausar */}
        <Box
          onClick={handleVideoClick}
          sx={{
            position: { xs: 'absolute', md: 'relative' },
            top: 0,
            left: 0,
            right: { xs: 0, md: 'auto' },
            bottom: 0,
            width: { xs: '100%', md: '50%' }, // ✅ Exact 50% width as requested!
            height: { xs: '100%', md: '100%' }, // ✅ Take 100% of the fixed 65vh wrapper
            aspectRatio: 'auto', // ✅ Let it freely fill the 50% width instead of forcing a ratio
            flexShrink: 0,
            zIndex: 1,
            cursor: isVideo ? 'pointer' : 'default',
            overflow: 'hidden',
            bgcolor: '#000000', // ✅ Sleek cinematic background for videos
            borderRadius: { xs: 0, md: 4 }, // 🟢 Rounded edges on PC
            boxShadow: { xs: 'none', md: '0 24px 60px rgba(0,0,0,0.4)' }
          }}
        >
        {isVideo && !videoError ? (
          <>
            {/* ✅ Video-First: Video starts invisible, fades in when ready */}
            <Box
              component="video"
              ref={videoRef}
              src={media?.url}
              loop
              muted
              playsInline
              preload={isActive ? 'metadata' : 'none'}
              onCanPlayThrough={() => {
                // Video is ready to play without buffering
                setVideoReady(true);
              }}
              onError={() => {
                setVideoError(true);
              }}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain', // ✅ Let it fit perfectly without zoom
                opacity: videoReady ? 1 : 0, // Start invisible, fade in when ready
                transition: 'opacity 0.3s ease-in',
                zIndex: 1
              }}
            />

            {/* ✅ First frame placeholder: shows actual video frame, fades out when video ready */}
            <Box
              component="video"
              src={`${media?.url}#t=0.1`}
              preload="metadata"
              muted
              playsInline
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain', // ✅ Let it fit perfectly without zoom
                zIndex: 2,
                opacity: videoReady ? 0 : 1,
                transition: 'opacity 0.3s ease-out',
                pointerEvents: 'none',
              }}
            />
          </>
        ) : (
          /* ✅ Image-only display seamlessly filling its half of the card */
          <Box sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            {/* Main image - cleanly covers the left half */}
            <Box
              component="img"
              src={media?.url || `https://via.placeholder.com/400x600/${colors.primary.replace('#', '')}/ffffff?text=${encodeURIComponent(dishName.substring(0, 10))}`}
              alt={dishName}
              sx={{
                position: 'absolute', // ✅ Force absolute so it doesn't stretch the flex container height!
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover', // ✅ Perfect split-card look
                zIndex: 1
              }}
            />
          </Box>
        )}

        {/* Gradiente expandible */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: showDetails ? '100%' : '30%',
            background: showDetails
              ? 'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.4) 70%, transparent 100%)'
              : 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 30%)',
            zIndex: 3, // Increased z-index to sit above overlay
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: showDetails ? 'blur(4px)' : 'none',
            WebkitBackdropFilter: showDetails ? 'blur(4px)' : 'none',
            pointerEvents: 'none',
            display: { xs: 'block', md: 'none' } // ✅ Hide on PC since we have a split-screen panel
          }}
        />
      </Box>



      {/* Botones laterales: Favorito, Agregar y Carrito */}
      <Box
        sx={{
          position: 'absolute',
          right: { xs: 12, sm: 16, md: 32 }, // Center nicely on PC with max-width 500
          top: { xs: '40%', md: '50%' }, // ✅ Moved higher (was 50%)
          transform: 'translateY(-50%)',
          display: { xs: 'flex', md: 'none' }, // ✅ HIDE FLOATING BUTTONS ON PC
          flexDirection: 'column',
          gap: { xs: 1.5, sm: 2 }, // ✅ Reduced gap
          zIndex: 60,
          // ✅ Hide when content is expanded
          opacity: { xs: showDetails ? 0 : 1, md: 1 },
          visibility: { xs: showDetails ? 'hidden' : 'visible', md: 'visible' },
          pointerEvents: { xs: showDetails ? 'none' : 'auto', md: 'auto' },
          transition: 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out'
        }}
      >
        {/* Botón Favorito */}
        <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}>
          <IconButton
            onClick={handleFavorite}
            sx={{
              width: { xs: 44, sm: 52 }, // ✅ Reduced size (was 52/60)
              height: { xs: 44, sm: 52 }, // ✅ Reduced size
              bgcolor: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: isFavorite ? colors.primary : colors.text,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.25)',
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.4)'
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {isFavorite ? <Favorite sx={{ fontSize: { xs: 22, sm: 26 } }} /> : <FavoriteBorder sx={{ fontSize: { xs: 22, sm: 26 } }} />}
          </IconButton>
        </motion.div>

        {/* Botón Agregar con badge */}
        <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}>
          <Badge
            badgeContent={cartItemCount}
            color="error"
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: colors.primary,
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.85rem',
                minWidth: 24,
                height: 24,
                border: '2px solid rgba(0,0,0,0.8)',
                fontFamily: '"Fraunces", serif'
              }
            }}
          >
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setOpenAddModal(true);
              }}
              sx={{
                width: { xs: 44, sm: 52 }, // ✅ Reduced size
                height: { xs: 44, sm: 52 }, // ✅ Reduced size
                bgcolor: colors.accent || colors.secondary,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                boxShadow: `0 8px 32px ${colors.accent || colors.secondary}80`,
                '&:hover': {
                  bgcolor: colors.accent || colors.secondary,
                  opacity: 0.9,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 12px 40px ${colors.accent || colors.secondary}99`
                },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <Add sx={{ fontSize: { xs: 22, sm: 26 } }} />
            </IconButton>
          </Badge>
        </motion.div>

        {/* Botón Carrito (Nuevo) */}
        {totalCartItems > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
          >
            <Badge
              badgeContent={totalCartItems}
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  bgcolor: colors.primary,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  minWidth: 24,
                  height: 24,
                  border: '2px solid rgba(0,0,0,0.8)',
                  fontFamily: '"Fraunces", serif'
                }
              }}
            >
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenCart) onOpenCart();
                }}
                sx={{
                  width: { xs: 44, sm: 52 }, // ✅ Reduced size
                  height: { xs: 44, sm: 52 }, // ✅ Reduced size
                  bgcolor: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.25)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.4)'
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <ShoppingCart sx={{ fontSize: { xs: 22, sm: 26 } }} />
              </IconButton>
            </Badge>
          </motion.div>
        )}

        {/* Modal: Agregar al carrito */}
        <Dialog
          open={openAddModal}
          onClose={() => {
            setOpenAddModal(false);
            setQuantityToAdd(1);
            setSelectedPortion('full');
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'rgba(15,15,15,0.8)', // ✅ Make more transparent for glass effect
              backdropFilter: 'blur(40px) saturate(150%)',
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 32px 100px rgba(0,0,0,0.6)',
              m: 2
            }
          }}
        >
          <DialogTitle sx={{
            color: colors.text,
            fontWeight: 700,
            fontSize: { xs: '1.3rem', sm: '1.5rem' },
            pb: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: '"Fraunces", serif'
          }}>
            {t('modal_add_to_cart_title', 'Agregar al carrito')}
            <IconButton
              onClick={() => setOpenAddModal(false)}
              sx={{ color: 'rgba(255,255,255,0.6)' }}
            >
              <Close />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ pt: 2 }}>
            {media?.url && (
              media?.thumbnail_url || !isVideo ? (
                <Box
                  component="img"
                  src={media?.thumbnail_url || media?.url}
                  alt={dishName}
                  sx={{
                    width: '100%',
                    height: 200,
                    objectFit: 'contain',
                    bgcolor: '#000',
                    borderRadius: 3,
                    mb: 3,
                    display: 'block',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: 200,
                    borderRadius: 12,
                    marginBottom: 24,
                    overflow: 'hidden',
                    backgroundColor: '#000',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                  }}
                >
                  <video
                    src={`${media.url}#t=0.1`}
                    preload="metadata"
                    muted
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block'
                    }}
                  />
                </div>
              )
            )}

            <Typography variant="h6" sx={{ color: colors.text, fontWeight: 600, mb: 1, fontFamily: '"Fraunces", serif' }}>
              {dishName}
            </Typography>

            <Typography variant="h5" sx={{ color: colors.primary, fontWeight: 700, mb: 3, fontFamily: '"Fraunces", serif' }}>
              €{((selectedPortion === 'half' ? dish.half_price : dish.price) || 0).toFixed(2)}
            </Typography>

            {description && (
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.95rem',
                  mb: 3,
                  lineHeight: 1.6,
                  fontFamily: '"Fraunces", serif'
                }}
              >
                {description.substring(0, 120)}{description.length > 120 ? '...' : ''}
              </Typography>
            )}

            {/* Portion Selector */}
            {dish.has_half_portion && (
              <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                <Button
                  onClick={() => setSelectedPortion('full')}
                  variant={selectedPortion === 'full' ? 'contained' : 'outlined'}
                  sx={{
                    flex: 1,
                    bgcolor: selectedPortion === 'full' ? colors.primary : 'transparent',
                    color: selectedPortion === 'full' ? '#fff' : colors.text,
                    borderColor: selectedPortion === 'full' ? colors.primary : 'rgba(255,255,255,0.3)',
                    borderRadius: 2,
                    py: 1,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontFamily: '"Fraunces", serif',
                    '&:hover': {
                      bgcolor: selectedPortion === 'full' ? colors.primary : 'rgba(255,255,255,0.1)',
                      borderColor: selectedPortion === 'full' ? colors.primary : '#fff'
                    }
                  }}
                >
                  {t('button_full_portion', 'Ración Completa')}
                  <Typography component="span" sx={{ display: 'block', fontSize: '0.75rem', opacity: 0.8, mt: 0.5 }}>
                    €{(dish.price || 0).toFixed(2)}
                  </Typography>
                </Button>
                <Button
                  onClick={() => setSelectedPortion('half')}
                  variant={selectedPortion === 'half' ? 'contained' : 'outlined'}
                  sx={{
                    flex: 1,
                    bgcolor: selectedPortion === 'half' ? colors.primary : 'transparent',
                    color: selectedPortion === 'half' ? '#fff' : colors.text,
                    borderColor: selectedPortion === 'half' ? colors.primary : 'rgba(255,255,255,0.3)',
                    borderRadius: 2,
                    py: 1,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontFamily: '"Fraunces", serif',
                    '&:hover': {
                      bgcolor: selectedPortion === 'half' ? colors.primary : 'rgba(255,255,255,0.1)',
                      borderColor: selectedPortion === 'half' ? colors.primary : '#fff'
                    }
                  }}
                >
                  {t('button_half_portion', 'Media Ración')}
                  <Typography component="span" sx={{ display: 'block', fontSize: '0.75rem', opacity: 0.8, mt: 0.5 }}>
                    €{(dish.half_price || 0).toFixed(2)}
                  </Typography>
                </Button>
              </Box>
            )}

            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              mb: 2,
              p: 2,
              bgcolor: 'rgba(255,255,255,0.05)',
              borderRadius: 3
            }}>
              <IconButton
                onClick={() => setQuantityToAdd(Math.max(1, quantityToAdd - 1))}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.1)',
                  color: colors.text,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                }}
              >
                <Remove />
              </IconButton>

              <Typography variant="h4" sx={{
                color: colors.text,
                fontWeight: 700,
                minWidth: 60,
                textAlign: 'center',
                fontFamily: '"Fraunces", serif'
              }}>
                {quantityToAdd}
              </Typography>

              <IconButton
                onClick={() => setQuantityToAdd(quantityToAdd + 1)}
                sx={{
                  bgcolor: colors.accent || colors.secondary,
                  color: '#fff',
                  '&:hover': { bgcolor: colors.accent || colors.secondary, opacity: 0.8 }
                }}
              >
                <Add />
              </IconButton>
            </Box>

            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 2,
              bgcolor: 'rgba(255,255,255,0.05)',
              borderRadius: 2
            }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', fontFamily: '"Fraunces", serif' }}>
                {t('label_subtotal', 'Subtotal:')}
              </Typography>
              <Typography sx={{ color: colors.primary, fontWeight: 700, fontSize: '1.4rem', fontFamily: '"Fraunces", serif' }}>
                €{(((selectedPortion === 'half' ? dish.half_price : dish.price) || 0) * quantityToAdd).toFixed(2)}
              </Typography>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button
              onClick={() => {
                setOpenAddModal(false);
                setQuantityToAdd(1);
                setSelectedPortion('full');
              }}
              sx={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '1rem',
                textTransform: 'none',
                px: 3,
                fontFamily: '"Fraunces", serif'
              }}
            >
              {t('button_cancel', 'Cancelar')}
            </Button>
            <Button
              onClick={handleAddToCart}
              variant="contained"
              sx={{
                bgcolor: colors.accent || colors.secondary,
                color: '#fff',
                fontWeight: 600,
                fontSize: '1rem',
                px: 4,
                py: 1.5,
                textTransform: 'none',
                borderRadius: 2,
                boxShadow: `0 8px 24px ${colors.accent || colors.secondary}60`,
                '&:hover': {
                  bgcolor: colors.accent || colors.secondary,
                  opacity: 0.9,
                  boxShadow: `0 12px 32px ${colors.accent || colors.secondary}80`
                },
                fontFamily: '"Fraunces", serif'
              }}
            >
              {t('button_add', 'Agregar')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      {/* Información del plato */}
      <Box
        onClick={(e) => {
          // Stop propagation when expanded to prevent Swiper from intercepting
          if (showDetails) {
            e.stopPropagation();
          }
        }}
        onTouchStart={(e) => {
          // Prevent touch events from reaching Swiper when expanded
          if (showDetails) {
            e.stopPropagation();
          }
        }}
        onTouchMove={(e) => {
          // Prevent touch move from triggering Swiper
          if (showDetails) {
            e.stopPropagation();
          }
        }}
        sx={{
          position: { xs: 'absolute', md: 'relative' },
          bottom: { xs: 10, md: 0 },
          left: { xs: 0, md: 'auto' },
          right: { xs: showDetails ? 10 : 75, md: 0 },
          width: { xs: showDetails ? '95%' : '90%', md: 'auto' }, // ✅ Auto on PC
          flex: { xs: 'none', md: 1 }, // ✅ Take remaining space in flex container
          maxWidth: { xs: '500px', md: 'none' }, // ✅ Unconstrained width on PC
          zIndex: showDetails ? 50 : 5,
          p: { xs: 2, md: 0 }, // ✅ Transparent on PC, no padding needed here
          maxHeight: { xs: showDetails ? '75vh' : 'auto', md: '100%' }, // ✅ Full height on PC
          overflowY: { xs: showDetails ? 'auto' : 'visible', md: 'auto' },
          overscrollBehavior: 'contain',
          touchAction: showDetails ? 'pan-y' : 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          willChange: showDetails ? 'scroll-position' : 'auto',
          transform: 'translateZ(0)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: { xs: 'flex-end', md: 'flex-start' }, // ✅ Start from top on PC
          pt: { xs: 0, md: 4 }, // Top padding on PC
          bgcolor: { xs: 'transparent', md: 'transparent' }, // ✅ Remove glassmorphism on PC
          backdropFilter: { xs: 'none', md: 'none' },
          borderLeft: { xs: 'none', md: 'none' },
          boxShadow: { xs: 'none', md: 'none' }
        }}
      >
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
          style={{ display: 'flex', flexDirection: 'column' }} // ✅ Make flex column to allow ordering
        >
          {/* TITLE */}
          <Typography
            variant="h4"
            sx={{
              order: { xs: 1, md: 2 },
              color: colors.text,
              fontWeight: { xs: 800, md: 600 }, // ✅ More elegant presence
              mb: 2,
              fontSize: { xs: '1.5rem', md: '2.8rem' }, // ✅ Not gigantic
              textShadow: '0 2px 10px rgba(0,0,0,0.6)', // ✅ Strong shadow for readability
              lineHeight: 1.15,
              fontFamily: '"Fraunces", "Playfair Display", serif',
              textTransform: { xs: 'none', md: 'uppercase' },
              letterSpacing: { xs: '0.02em', md: '0.04em' } // ✅ Elegant tracking
            }}
          >
            {dishName}
          </Typography>

          {/* PRICE */}
          {dish?.price != null && (
            <Box sx={{ order: { xs: 2, md: 3 }, display: 'flex', alignItems: 'center', mb: { xs: 2, md: 4 }, flexWrap: 'wrap', gap: 1 }}>
              <Typography
                variant="h5"
                sx={{
                  color: colors.primary,
                  fontWeight: 700,
                  fontSize: { xs: '1.2rem', md: '1.6rem' },
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                  fontFamily: '"Fraunces", serif',
                  letterSpacing: '0.02em',
                  m: 0,
                  p: 0
                }}
              >
                €{dish.price.toFixed(2)}
              </Typography>
              {dish?.discountprice && (
                <Typography
                  variant="body1"
                  sx={{
                    color: 'rgba(255,255,255,0.6)',
                    textDecoration: 'line-through',
                    fontSize: '0.9rem', // ✅ Force mobile size
                    fontFamily: '"Fraunces", serif'
                  }}
                >
                  €{dish.discountprice.toFixed(2)}
                </Typography>
              )}
              {dish?.has_half_portion && dish.half_price && (
                <Typography
                  component="span"
                  sx={{
                    color: colors.primary, // ✅ Uniform color
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    ml: 0.5,
                    textShadow: '0 2px 8px rgba(0,0,0,0.6)', // ✅ Readability
                    fontFamily: '"Fraunces", serif',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <span style={{ opacity: 0.6, fontSize: '1.2em', fontWeight: 300 }}>|</span>
                  ½ €{dish.half_price.toFixed(2)}
                </Typography>
              )}
            </Box>
          )}

          {/* ✅ Inline Desktop Actions */}
          <Box sx={{ order: { xs: 3, md: 7 }, display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2, mt: 4, mb: 4, width: '100%' }}>
            <Button
              variant="contained"
              onClick={(e) => {
                e.stopPropagation();
                setOpenAddModal(true);
              }}
              startIcon={<ShoppingCart />}
              sx={{
                bgcolor: 'rgba(255,255,255,0.15)', // ✅ Semi-transparent white
                backdropFilter: 'blur(10px)', // ✅ Glassmorphism
                border: '1px solid rgba(255,255,255,0.3)', // ✅ Subtle border to separate from background
                color: '#fff',
                maxWidth: '400px', // Nice proportional width
                width: '100%',
                py: 2,
                borderRadius: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                textTransform: 'none',
                fontFamily: '"Inter", sans-serif',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.25)',
                  border: '1px solid rgba(255,255,255,0.5)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                  transform: 'translateY(-2px)'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {t('button_add', 'Agregar')}
            </Button>

            {/* Desktop Cart Button */}
            {totalCartItems > 0 && (
              <Badge
                badgeContent={totalCartItems}
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: colors.primary,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    minWidth: 24,
                    height: 24,
                    border: '2px solid rgba(0,0,0,0.8)',
                    fontFamily: '"Fraunces", serif'
                  }
                }}
              >
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenCart) onOpenCart();
                  }}
                  sx={{
                    width: 52,
                    height: 52,
                    bgcolor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: '#fff',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.25)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.3)'
                    },
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <FormatListBulleted sx={{ fontSize: 26 }} />
                </IconButton>
              </Badge>
            )}
          </Box>

          {/* BADGES */}
          <Box sx={{ order: { xs: 4, md: 1 }, display: 'flex', alignItems: 'center', gap: 2, mb: { xs: 2, md: 1 }, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {dish?.isnew && (
                <Chip
                  label={t('badge_new', 'Nuevo')}
                  size="small"
                  sx={{
                    bgcolor: colors.primary,
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    height: { xs: 24, sm: 28 }
                  }}
                />
              )}
              {dish?.isfeatured && (
                <Chip
                  label={t('badge_featured', 'Destacado')}
                  size="small"
                  sx={{
                    bgcolor: colors.secondary,
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    height: { xs: 24, sm: 28 }
                  }}
                />
              )}
              {dish?.isvegetarian && (
                <Chip
                  icon={<Spa sx={{ fontSize: 14 }} />}
                  label={t('badge_vegetarian', 'Vegetariano')}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(76, 175, 80, 0.9)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    height: { xs: 24, sm: 28 }
                  }}
                />
              )}
            </Box>

            {dish?.allergens && dish.allergens.length > 0 && (
              <AllergensList allergens={dish.allergens} maxVisible={4} />
            )}
          </Box>

          {/* DESCRIPTION & INLINE INFO */}
          <Box sx={{ order: { xs: 5, md: 4 }, width: '100%', mb: { xs: 2, md: 4 } }}>
            <Box sx={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: { xs: showDetails ? 'none' : 2, md: 'none' },
              overflow: { xs: showDetails ? 'visible' : 'hidden', md: 'visible' },
              mb: 2,
              transition: 'all 0.3s ease'
            }}>
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.95)', // ✅ Brighter white
                  fontSize: { xs: '0.95rem', sm: '1.1rem' },
                  lineHeight: 1.8, // Better readability
                  fontWeight: 400,
                  fontFamily: '"Inter", "Roboto", sans-serif',
                  letterSpacing: '0.015em',
                  textShadow: '0 1px 4px rgba(0,0,0,0.6)', // ✅ Readability shadow
                  mb: 2 // Breathing room
                }}
              >
                {description}
              </Typography>

              {/* INLINE INGREDIENTS AND ALLERGENS (Compact) */}
              {((dish?.ingredients || dish?.translations?.ingredients?.[currentLanguage]) || (dish?.allergens && dish.allergens.length > 0)) && (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: 0.5, 
                  mt: 1,
                  opacity: 0.85
                }}>
                  {/* INGREDIENTS */}
                  {(dish?.ingredients || dish?.translations?.ingredients?.[currentLanguage]) && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                      <LocalDining sx={{ fontSize: 16, color: '#f5d587', mt: 0.3 }} />
                      <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', fontFamily: '"Inter", sans-serif', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                        {dish.ingredients || dish.translations?.ingredients?.[currentLanguage]}
                      </Typography>
                    </Box>
                  )}

                  {/* ALLERGENS */}
                  {dish?.allergens && dish.allergens.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                      <WarningAmber sx={{ fontSize: 16, color: '#f5d587', mt: 0.3 }} />
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                        <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', fontFamily: '"Inter", sans-serif', mr: 0.5, fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                          {t('allergens', 'Alérgenos:')}
                        </Typography>
                        {dish.allergens.map((allergen: any, idx: number) => (
                          <Typography key={allergen.id} sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', fontFamily: '"Inter", sans-serif', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                            {getAllergenName(allergen, currentLanguage)}{idx < dish.allergens.length - 1 ? ', ' : ''}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            {/* ✅ "Ver más / Ver menos" button for mobile */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              {(description.length > 100 || (dish?.allergens && dish.allergens.length > 0) || (dish?.ingredients)) && (
                <Box
                  onClick={toggleDetails}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: colors.primary,
                    fontFamily: '"Fraunces", serif',
                    mt: 2,
                    py: 1.5,
                    px: 2,
                    border: `1px solid ${colors.primary}40`,
                    borderRadius: 2,
                    bgcolor: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(4px)',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  <Typography variant="body2" sx={{ mr: 0.5, color: colors.primary, fontFamily: '"Fraunces", serif', fontWeight: 600 }}>
                    {showDetails ? t('see_less', 'Ver menos') : t('see_more', 'Ver más')}
                  </Typography>
                  {showDetails ? <ExpandLess sx={{ fontSize: 18, color: colors.primary }} /> : <ExpandLess sx={{ fontSize: 18, color: colors.primary, transform: 'rotate(180deg)' }} />}
                </Box>
              )}
            </Box>
          </Box>
        </motion.div>
      </Box>
      </Box>
    </Box >
  );
};

export default ClassicDishCard;
