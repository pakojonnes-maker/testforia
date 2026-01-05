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
  Kitchen
} from '@mui/icons-material';


// ...

<AddShoppingCart sx={{ fontSize: { xs: 22, sm: 26 } }} />
import { useDishTracking } from '../../../../providers/TrackingAndPushProvider';
import type { Allergen } from '../../../../lib/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [, setVideoLoaded] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false); // ✅ Track if video playback truly started
  const [videoError, setVideoError] = useState(false);
  const [allergenImageErrors, setAllergenImageErrors] = useState<Set<string>>(new Set());

  // ✅ Reset video state when dish changes (essential for reused lists/swipers)
  useEffect(() => {
    setVideoStarted(false);
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

  // Auto-play con pausa al hacer clic en el video
  useEffect(() => {
    if (!videoRef.current || !isVideo || videoError) return;

    const video = videoRef.current;

    if (isActive && inView) {
      video.currentTime = 0;
      video.muted = true;
      video.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.error('❌ [DishCard] Error reproduciendo video:', error);
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
      console.log('⏱️ [DishCard] Iniciando timer de visualización:', dish.id);
    }

    // Send duration when dish becomes invisible (but not on unmount - handled separately)
    if (!isCurrentlyViewing && viewStartTimeRef.current && lastTrackedDishRef.current) {
      const duration = Math.floor((Date.now() - viewStartTimeRef.current) / 1000);
      if (duration >= 1) {
        console.log('⏱️ [DishCard] Enviando duración (visibility change):', {
          dishId: lastTrackedDishRef.current,
          duration
        });
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
          console.log('⏱️ [DishCard] Enviando duración (unmount):', {
            dishId: lastTrackedDishRef.current,
            duration
          });
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
        width: '100%', // ✅ Changed from 100vw to 100% to respect container width
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#000',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }}
    >
      {/* Media Background con click para pausar */}
      <Box
        onClick={handleVideoClick}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          cursor: isVideo ? 'pointer' : 'default'
        }}
      >
        {isVideo ? (
          <>
            <video
              ref={videoRef}
              src={media?.url}
              /* poster={media?.thumbnail_url} // Removed to prevent native ghost image */
              loop
              muted
              playsInline
              onLoadedData={() => setVideoLoaded(true)}
              onPlaying={() => setVideoStarted(true)} // ✅ Trigger fade out
              onTimeUpdate={(e) => {
                // Fallback: if video advances > 0.1s, ensure overlay is gone
                if (e.currentTarget.currentTime > 0.1 && !videoStarted) {
                  setVideoStarted(true);
                }
              }}
              onError={() => setVideoError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />

            {/* ✅ Custom Poster Overlay for Smooth Transition */}
            <Box
              component="img"
              src={media?.thumbnail_url || media?.url}
              alt={dishName}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 2, // Above video
                opacity: videoStarted ? 0 : 1, // Smooth fade
                transition: 'opacity 0.5s ease-out',
                pointerEvents: 'none', // Let clicks pass to video
                willChange: 'opacity'
              }}
            />
          </>
        ) : (
          <Box
            component="img"
            src={media?.url || `https://via.placeholder.com/400x600/${colors.primary.replace('#', '')}/ffffff?text=${encodeURIComponent(dishName.substring(0, 10))}`}
            alt={dishName}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
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
            backdropFilter: showDetails ? 'blur(8px)' : 'none',
            WebkitBackdropFilter: showDetails ? 'blur(8px)' : 'none',
            pointerEvents: 'none'
          }}
        />
      </Box>



      {/* Botones laterales: Favorito, Agregar y Carrito */}
      <Box
        sx={{
          position: 'absolute',
          right: { xs: 12, sm: 16 },
          top: '40%', // ✅ Moved higher (was 50%)
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 1.5, sm: 2 }, // ✅ Reduced gap
          zIndex: 10,
          // ✅ Hide when content is expanded
          opacity: showDetails ? 0 : 1,
          visibility: showDetails ? 'hidden' : 'visible',
          pointerEvents: showDetails ? 'none' : 'auto',
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
              backdropFilter: 'blur(20px)',
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
                backdropFilter: 'blur(20px)',
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
                  bgcolor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(20px)',
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
              bgcolor: 'rgba(20,20,20,0.98)',
              backdropFilter: 'blur(40px)',
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
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
              <Box
                component="img"
                src={media?.thumbnail_url || media?.url}
                alt={dishName}
                sx={{
                  width: '100%',
                  height: 200,
                  objectFit: 'cover',
                  borderRadius: 3,
                  mb: 3,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                }}
              />
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
                  Ración Completa
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
                  Media Ración
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
          position: 'absolute',
          bottom: 10,
          left: 0,
          right: showDetails ? 10 : 75, // ✅ Full width when expanded
          width: showDetails ? '95%' : '90%',
          zIndex: showDetails ? 50 : 5, // ✅ Higher z-index when expanded
          p: 2,
          maxHeight: showDetails ? '75vh' : 'auto', // ✅ More space for reading
          overflowY: showDetails ? 'auto' : 'visible',
          overscrollBehavior: 'contain', // ✅ Prevent scroll chaining
          touchAction: showDetails ? 'pan-y' : 'auto', // ✅ Isolate vertical touch
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          // ✅ Performance optimizations
          willChange: showDetails ? 'scroll-position' : 'auto',
          transform: 'translateZ(0)',
        }}
      >
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
        >
          <Typography
            variant="h4"
            sx={{
              color: colors.text,
              fontWeight: 800,
              mb: 1,
              fontSize: '1.25rem', // ✅ Force mobile size
              textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              lineHeight: 1.2,
              fontFamily: '"Fraunces", serif'
            }}
          >
            {dishName}
          </Typography>

          {dish?.price != null && ( // ✅ Fix: Check for null/undefined to avoid rendering "0"
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography
                variant="h5"
                sx={{
                  color: colors.primary,
                  fontWeight: 700,
                  fontSize: '1.1rem', // ✅ Force mobile size
                  textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                  fontFamily: '"Fraunces", serif'
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
                    textShadow: '0 2px 8px rgba(0,0,0,0.6)',
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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {dish?.isnew && (
                <Chip
                  label="Nuevo"
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
                  label="Destacado"
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
                  label="Vegetariano"
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

          <Typography
            sx={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: { xs: '0.9rem', sm: '1rem' },
              lineHeight: 1.5,
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              fontWeight: 400,
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: showDetails ? 'none' : 2,
              overflow: showDetails ? 'visible' : 'hidden',
              mb: 1,
              fontFamily: '"Fraunces", serif'
            }}
          >
            {description}
          </Typography>

          {/* ✅ "Ver más" button - only when collapsed */}
          {!showDetails && (description.length > 100 || dish?.allergens?.length > 0) && (
            <Box
              onClick={toggleDetails}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                width: '100%',
                '&:hover': { opacity: 0.8 },
                color: colors.accent,
                fontFamily: '"Fraunces", serif'
              }}
            >
              <Typography variant="body2" sx={{ mr: 0.5, color: colors.accent, fontFamily: '"Fraunces", serif' }}>
                {t('see_more', 'Ver más')}
              </Typography>
              <ExpandLess
                sx={{
                  fontSize: 16,
                  transform: 'rotate(180deg)',
                }}
              />
            </Box>
          )}

          {/* Sección expandible con información nutricional y alérgenos */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                {(dish?.calories || dish?.protein) && (
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        color: colors.text,
                        fontWeight: 600,
                        mb: 2,
                        fontSize: { xs: '1rem', sm: '1.1rem' },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center', // Centrado
                        gap: 1
                      }}
                    >
                      <LocalDining sx={{ fontSize: 20 }} />
                      {t('nutritional_info', 'Información Nutricional')}
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 2 }}>
                      {dish?.calories && (
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                          <Typography variant="h6" sx={{ color: colors.primary, fontWeight: 700 }}>
                            {dish.calories}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            {t('calories', 'Calorías')}
                          </Typography>
                        </Box>
                      )}
                      {dish?.protein && (
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                          <Typography variant="h6" sx={{ color: colors.secondary, fontWeight: 700 }}>
                            {dish.protein}g
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            {t('protein', 'Proteína')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}



                {(dish?.ingredients || dish?.translations?.ingredients?.[currentLanguage]) && (
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        color: colors.text,
                        fontWeight: 600,
                        mb: 2,
                        fontSize: { xs: '1rem', sm: '1.1rem' },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        fontFamily: '"Fraunces", serif'
                      }}
                    >
                      <Kitchen sx={{ fontSize: 20 }} />
                      {t('ingredients', 'Ingredientes')}
                    </Typography>
                    <Typography
                      sx={{
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: '0.95rem',
                        lineHeight: 1.6,
                        textAlign: 'center',
                        fontFamily: '"Fraunces", serif',
                        px: 2
                      }}
                    >
                      {dish.ingredients || dish.translations?.ingredients?.[currentLanguage]}
                    </Typography>
                  </Box>
                )}

                {/* Alérgenos */}
                {dish?.allergens && dish.allergens.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        color: colors.text,
                        fontWeight: 600,
                        mb: 2,
                        fontSize: { xs: '1rem', sm: '1.1rem' },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        fontFamily: '"Fraunces", serif'
                      }}
                    >
                      <Spa sx={{ fontSize: 20 }} />
                      {t('allergens', 'Alérgenos')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                      {dish.allergens.map((allergen: any) => (
                        <Box
                          key={allergen.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            bgcolor: 'rgba(255,255,255,0.1)',
                            px: 1.5,
                            py: 0.75,
                            borderRadius: 2,
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}
                        >
                          <img
                            src={getAllergenIconUrl(allergen)}
                            alt={getAllergenName(allergen, currentLanguage)}
                            style={{ width: 20, height: 20, objectFit: 'contain', filter: 'none' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <Typography
                            sx={{
                              color: 'rgba(255,255,255,0.9)',
                              fontSize: '0.85rem',
                              fontWeight: 500,
                              fontFamily: '"Fraunces", serif'
                            }}
                          >
                            {getAllergenName(allergen, currentLanguage)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* ✅ "Ver menos" button - at the END of all content, like Instagram */}
                <Box
                  onClick={toggleDetails}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: { xs: '0.85rem', sm: '0.95rem' },
                    mt: 2,
                    mb: 1,
                    py: 1.5,
                    width: '100%',
                    bgcolor: 'rgba(255,255,255,0.08)',
                    borderRadius: 2,
                    border: `1px solid ${colors.accent}40`,
                    '&:hover': {
                      opacity: 0.9,
                      bgcolor: 'rgba(255,255,255,0.12)'
                    },
                    '&:active': {
                      transform: 'scale(0.98)'
                    },
                    color: colors.accent,
                    fontFamily: '"Fraunces", serif',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Typography variant="body2" sx={{ mr: 0.5, color: colors.accent, fontFamily: '"Fraunces", serif', fontWeight: 600 }}>
                    {t('see_less', 'Ver menos')}
                  </Typography>
                  <ExpandLess
                    sx={{
                      fontSize: 18,
                      transform: 'rotate(0deg)',
                    }}
                  />
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Box>
    </Box>
  );
};

export default ClassicDishCard;
