// apps/client/src/components/reels/templates/classic/DishCard.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, IconButton, Typography, Chip, Tooltip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  FavoriteBorder,
  Favorite,
  VolumeOff,
  VolumeUp,
  PlayArrow,
  Pause,
  ExpandLess,
  Spa,
  LocalDining
} from '@mui/icons-material';
import { useDishTracking } from '../../../../providers/TrackingAndPushProvider';
import type { RestaurantConfig } from '../../../../hooks/useReelsConfig';

interface Allergen {
  id: string;
  name?: string;
  iconurl?: string;
  icon_url?: string;
  translations?: {
    name: { [key: string]: string };
  };
}

interface DishCardProps {
  dish: any;
  restaurant: any;
  section: any;
  isActive: boolean;
  config: RestaurantConfig;
  muted: boolean;
  onMuteToggle: () => void;
  currentDishIndex: number;
  totalDishes: number;
  currentLanguage: string;
}

const ClassicDishCard: React.FC<DishCardProps> = ({
  dish,
  restaurant,
  section,
  isActive,
  config,
  muted,
  onMuteToggle,
  currentLanguage = 'es'
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [allergenImageErrors, setAllergenImageErrors] = useState<Set<string>>(new Set());
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const { viewDish, favoriteDish } = useDishTracking();
  
  const { ref: inViewRef, inView } = useInView({ threshold: 0.7 });
  
  const media = dish?.media?.[0];
  const isVideo = media?.type === 'video';
  const dishName = dish?.translations?.name?.[currentLanguage] || dish?.name || 'Plato Delicioso';
  const description = dish?.translations?.description?.[currentLanguage] || dish?.description || '';

  const colors = {
    primary: config.restaurant?.branding?.primaryColor || '#FF6B6B',
    secondary: config.restaurant?.branding?.secondaryColor || '#4ECDC4',
    text: '#FFFFFF',
    background: 'rgba(0,0,0,0.4)'
  };

  // ✅ URL de icono desde BD
  const getAllergenIconUrl = useCallback((allergen: Allergen) => {
    const API_URL = import.meta.env.VITE_API_URL || "https://visualtasteworker.franciscotortosaestudios.workers.dev";
    
    if (allergen.iconurl) {
      const fullUrl = `${API_URL}/media/System/allergens/${allergen.iconurl}`;
      console.log(`🎯 [AllergenIcon] Using BD iconurl for ${allergen.id}: ${fullUrl}`);
      return fullUrl;
    }
    
    if (allergen.icon_url) {
      console.log(`🎯 [AllergenIcon] Using worker icon_url for ${allergen.id}: ${allergen.icon_url}`);
      return allergen.icon_url;
    }
    
    let filename = allergen.id;
    if (!filename.endsWith('.svg')) {
      filename += '.svg';
    }
    
    const generatedUrl = `${API_URL}/media/System/allergens/${filename}`;
    console.log(`🎯 [AllergenIcon] Generated URL for ${allergen.id}: ${generatedUrl}`);
    return generatedUrl;
  }, []);

  // ✅ Obtener nombre del alérgeno
  const getAllergenName = useCallback((allergen: Allergen) => {
    const translatedName = allergen.translations?.name?.[currentLanguage];
    if (translatedName) {
      return translatedName;
    }
    
    if (allergen.name) {
      return allergen.name;
    }
    
    let displayName = allergen.id;
    if (displayName.startsWith('allergen_')) {
      displayName = displayName.substring(9);
    }
    if (displayName.endsWith('.svg')) {
      displayName = displayName.slice(0, -4);
    }
    
    return displayName.charAt(0).toUpperCase() + displayName.slice(1).toLowerCase();
  }, [currentLanguage]);

  const handleAllergenImageError = useCallback((allergenId: string) => {
    console.warn(`❌ [AllergenIcon] Failed to load icon for: ${allergenId}`);
    setAllergenImageErrors(prev => new Set(prev).add(allergenId));
  }, []);

  // Auto-play logic
  useEffect(() => {
    if (!videoRef.current || !isVideo || videoError) return;
    
    const video = videoRef.current;
    
    if (isActive && inView) {
      video.currentTime = 0;
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        video.muted = true;
        video.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setVideoError(true);
        });
      });
    } else {
      video.pause();
      setIsPlaying(false);
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
  }, [isFavorite, dish.id, favoriteDish]);

  const toggleVideo = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
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
    setShowDetails(prev => !prev);
  }, []);

  // ✅ COMPONENTE: Icono Elegante SIN fondo, imagen original
  const AllergenIcon: React.FC<{ allergen: Allergen; size?: number }> = ({ allergen, size = 24 }) => {
    const iconUrl = getAllergenIconUrl(allergen);
    const hasError = allergenImageErrors.has(allergen.id);
    const allergenName = getAllergenName(allergen);

    console.log(`🔍 [AllergenIcon] Rendering allergen:`, {
      id: allergen.id,
      iconurl: allergen.iconurl,
      icon_url: allergen.icon_url,
      name: allergen.name,
      translations: allergen.translations,
      generatedUrl: iconUrl,
      hasError,
      finalName: allergenName
    });

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
                // ✅ SIN FILTROS - Imagen original
                filter: 'none',
                opacity: 0.9,
                transition: 'all 0.3s ease'
              }}
              onLoad={() => {
                console.log(`✅ [AllergenIcon] Successfully loaded: ${allergen.id} from ${iconUrl}`);
              }}
              onError={(e) => {
                console.error(`❌ [AllergenIcon] Failed to load: ${allergen.id} from ${iconUrl}`, e);
                handleAllergenImageError(allergen.id);
              }}
            />
          )}
        </Box>
      </Tooltip>
    );
  };

  // ✅ COMPONENTE: Lista elegante SIN warning icon
  const AllergensList: React.FC<{ allergens: Allergen[]; maxVisible?: number }> = ({ 
    allergens, 
    maxVisible = 4 
  }) => {
    if (!allergens || allergens.length === 0) {
      console.log('🔍 [AllergensList] No allergens found in dish');
      return null;
    }

    console.log('🔍 [AllergensList] Received allergens:', allergens);

    const visibleAllergens = allergens.slice(0, maxVisible);
    const remainingCount = Math.max(0, allergens.length - maxVisible);

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {visibleAllergens.map((allergen) => (
          <AllergenIcon key={allergen.id} allergen={allergen} size={22} />
        ))}
        
        {remainingCount > 0 && (
          <Tooltip title={`${remainingCount} alérgenos más`} arrow placement="top">
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

  // DEBUG: Log completo del dish
  useEffect(() => {
    console.log('🔍 [DishCard] Complete dish data:', {
      dishId: dish?.id,
      dishName: dish?.name,
      allergens: dish?.allergens,
      allergensLength: dish?.allergens?.length,
      allergensDetail: dish?.allergens?.map((a: any) => ({
        id: a.id,
        name: a.name,
        iconurl: a.iconurl,
        icon_url: a.icon_url,
        translations: a.translations
      }))
    });
  }, [dish]);

  return (
    <Box
      ref={inViewRef}
      sx={{
        height: '100%',
        width: '100vw',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#000',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }}
    >
      {/* Media Background */}
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
              objectFit: 'cover'
            }}
          />
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
        
        {/* Expandable gradient overlay */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: showDetails ? '100%' : '30%',
            background: showDetails 
              ? 'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.4) 70%, transparent 100%)'
              : 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
            zIndex: 2,
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: showDetails ? 'blur(8px)' : 'none',
            WebkitBackdropFilter: showDetails ? 'blur(8px)' : 'none'
          }}
        />
      </Box>

      {/* Side Actions */}
      <Box
        sx={{
          position: 'absolute',
          right: { xs: 8, sm: 12 },
          bottom: { xs: 140, sm: 120 },
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 2, sm: 3 },
          zIndex: 10
        }}
      >
        {/* Favorite Button */}
        <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}>
          <IconButton
            onClick={handleFavorite}
            sx={{
              width: { xs: 48, sm: 56 },
              height: { xs: 48, sm: 56 },
              bgcolor: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: isFavorite ? colors.primary : colors.text,
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.25)',
                transform: 'translateY(-2px)'
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {isFavorite ? <Favorite sx={{ fontSize: { xs: 20, sm: 24 } }} /> : <FavoriteBorder sx={{ fontSize: { xs: 20, sm: 24 } }} />}
          </IconButton>
        </motion.div>

        {/* Video Controls */}
        {isVideo && (
          <>
            <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}>
              <IconButton
                onClick={toggleVideo}
                sx={{
                  width: { xs: 48, sm: 56 },
                  height: { xs: 48, sm: 56 },
                  bgcolor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: colors.text,
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.25)',
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {isPlaying ? <Pause sx={{ fontSize: { xs: 20, sm: 24 } }} /> : <PlayArrow sx={{ fontSize: { xs: 20, sm: 24 } }} />}
              </IconButton>
            </motion.div>

            <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onMuteToggle();
                }}
                sx={{
                  width: { xs: 48, sm: 56 },
                  height: { xs: 48, sm: 56 },
                  bgcolor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: colors.text,
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.25)',
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {muted ? <VolumeOff sx={{ fontSize: { xs: 20, sm: 24 } }} /> : <VolumeUp sx={{ fontSize: { xs: 20, sm: 24 } }} />}
              </IconButton>
            </motion.div>
          </>
        )}
      </Box>

      {/* Bottom Info - Always visible, expandable upwards */}
      <Box
        sx={{
          position: 'absolute',
          bottom: { xs: 100, sm: 90 },
          left: 0,
          right: { xs: 65, sm: 80 },
          zIndex: 5,
          p: { xs: 2, sm: 3 },
          maxHeight: showDetails ? '60vh' : 'auto',
          overflowY: showDetails ? 'auto' : 'visible',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' }
        }}
      >
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
        >
          {/* Dish Name - Always visible */}
          <Typography
            variant="h4"
            sx={{
              color: colors.text,
              fontWeight: 800,
              mb: 1,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.2rem' },
              textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              lineHeight: 1.2
            }}
          >
            {dishName}
          </Typography>

          {/* Price - Always visible */}
          {dish?.price && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography
                variant="h5"
                sx={{
                  color: colors.primary,
                  fontWeight: 700,
                  fontSize: { xs: '1.1rem', sm: '1.4rem' },
                  textShadow: '0 2px 8px rgba(0,0,0,0.6)'
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
                    ml: 2,
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                  }}
                >
                  €{dish.discountprice.toFixed(2)}
                </Typography>
              )}
            </Box>
          )}

          {/* Tags & Allergens Row - Always visible */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            {/* Tags */}
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

            {/* ✅ ALÉRGENOS ELEGANTES - SIN warning icon */}
            {dish?.allergens && dish.allergens.length > 0 && (
              <AllergensList allergens={dish.allergens} maxVisible={4} />
            )}
          </Box>

          {/* Short Description - Always visible */}
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
              mb: 1
            }}
          >
            {description}
          </Typography>

          {/* Expand Details Button */}
          {(description.length > 100 || dish?.allergens?.length > 0) && (
            <Box
              onClick={toggleDetails}
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 500,
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                mb: showDetails ? 2 : 0,
                '&:hover': { opacity: 0.8 }
              }}
            >
              <Typography variant="body2" sx={{ mr: 0.5 }}>
                {showDetails ? 'Ver menos' : 'Ver más'}
              </Typography>
              <ExpandLess 
                sx={{ 
                  fontSize: 16,
                  transform: showDetails ? 'rotate(0deg)' : 'rotate(180deg)',
                  transition: 'transform 0.3s ease'
                }} 
              />
            </Box>
          )}

          {/* Expandable Details */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                {/* Nutritional Info */}
                {(dish?.calories || dish?.protein || dish?.carbs || dish?.fat) && (
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
                        gap: 1
                      }}
                    >
                      <LocalDining sx={{ fontSize: 20 }} />
                      Información Nutricional
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 2 }}>
                      {dish?.calories && (
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                          <Typography variant="h6" sx={{ color: colors.primary, fontWeight: 700 }}>
                            {dish.calories}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            Calorías
                          </Typography>
                        </Box>
                      )}
                      {dish?.protein && (
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                          <Typography variant="h6" sx={{ color: colors.secondary, fontWeight: 700 }}>
                            {dish.protein}g
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            Proteína
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}

                {/* ✅ ALÉRGENOS EXPANDIDOS - Elegante SIN warning */}
                {dish?.allergens && dish.allergens.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        color: colors.text,
                        fontWeight: 600,
                        mb: 3,
                        fontSize: { xs: '1rem', sm: '1.1rem' },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      Alérgenos
                    </Typography>
                    
                    {/* ✅ GRID ELEGANTE CON IMAGEN ORIGINAL */}
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
                      gap: 3 
                    }}>
                      {dish.allergens.map((allergen: Allergen) => (
                        <Box
                          key={allergen.id}
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            p: 2,
                            // ✅ FONDO SUTIL SIN COLORES DE WARNING
                            bgcolor: 'rgba(255,255,255,0.05)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: 3,
                            border: '1px solid rgba(255,255,255,0.1)',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: 'rgba(255,255,255,0.1)',
                              borderColor: 'rgba(255,255,255,0.2)',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
                            }
                          }}
                        >
                          {/* ✅ ICONO GRANDE Y ELEGANTE */}
                          <AllergenIcon allergen={allergen} size={40} />
                          
                          {/* ✅ NOMBRE ELEGANTE */}
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'rgba(255,255,255,0.9)',
                              fontSize: { xs: '0.7rem', sm: '0.75rem' },
                              fontWeight: 500,
                              mt: 1.5,
                              textAlign: 'center',
                              lineHeight: 1.2
                            }}
                          >
                            {getAllergenName(allergen)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Box>
    </Box>
  );
};

export default ClassicDishCard;
