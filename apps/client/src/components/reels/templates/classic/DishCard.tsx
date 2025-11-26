// apps/client/src/components/reels/templates/classic/DishCard.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Box, 
  IconButton, 
  Typography, 
  Chip, 
  Tooltip, 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogActions, 
  Button, 
  Badge, 
  Drawer, 
  List, 
  ListItem, 
  Alert
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  FavoriteBorder,
  Favorite,
  ExpandLess,
  Spa,
  LocalDining,
  Add,
  Remove,
  ShoppingCart,
  Close,
  DeleteOutline,
  Restaurant
} from '@mui/icons-material';
import { useDishTracking } from '../../../../providers/TrackingAndPushProvider';
import type { RestaurantConfig } from '../../../../lib/apiClient';
import apiClient from '../../../../lib/apiClient';

interface Allergen {
  id: string;
  name?: string;
  iconurl?: string;
  icon_url?: string;
  translations?: {
    name: { [key: string]: string };
  };
}

interface CartItem {
  dishId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  addedAt: string;
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
  sessionId?: string; // ID de sesión para tracking
}

const ClassicDishCard: React.FC<DishCardProps> = ({
  dish,
  restaurant,
  section,
  isActive,
  config,
  currentLanguage = 'es',
  sessionId
}) => {
  // Estados principales
  const [isFavorite, setIsFavorite] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [allergenImageErrors, setAllergenImageErrors] = useState<Set<string>>(new Set());
  
  // Estados del carrito
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [cartCreatedAt, setCartCreatedAt] = useState<string | null>(null);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openCartDrawer, setOpenCartDrawer] = useState(false);
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const { viewDish, favoriteDish } = useDishTracking();
  
  const { ref: inViewRef, inView } = useInView({ threshold: 0.7 });
  
  const media = dish?.media?.[0];
  const isVideo = media?.type === 'video';
  const dishName = dish?.translations?.name?.[currentLanguage] || dish?.name || 'Plato Delicioso';
  const description = dish?.translations?.description?.[currentLanguage] || dish?.description || '';

  // Colores del branding
  const colors = {
    primary: config.branding?.primaryColor || '#FF6B6B',
    secondary: config.branding?.secondaryColor || '#4ECDC4',
    accent: config.branding?.accent_color || '#FF8C42',
    text: config.branding?.text_color || '#FFFFFF',
    background: config.branding?.background_color || '#000000'
  };

  // Generar UUID para carrito
  const generateCartId = useCallback(() => {
    return 'cart_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }, []);

  // Tracking: Crear carrito (solo la primera vez)
  const trackCartCreated = useCallback(async (newCartId: string) => {
    if (!sessionId || !restaurant?.id) return;

    try {
      await apiClient.tracking.sendEvents({
        sessionId: sessionId,
        restaurantId: restaurant.id,
        events: [{
          type: 'cart_created',
          entityId: newCartId,
          entityType: 'cart',
          ts: new Date().toISOString()
        }]
      });
      console.log('🛒 [Tracking] Cart created:', newCartId);
    } catch (error) {
      console.error('❌ [Tracking] Error creating cart:', error);
    }
  }, [sessionId, restaurant]);

  // Tracking: Agregar item al carrito
  const trackItemAdded = useCallback(async (dishId: string, quantity: number, price: number, sequence: number) => {
    if (!sessionId || !restaurant?.id || !cartId) return;

    try {
      await apiClient.tracking.sendEvents({
        sessionId: sessionId,
        restaurantId: restaurant.id,
        events: [{
          type: 'cart_item_added',
          entityId: dishId,
          entityType: 'dish',
          value: JSON.stringify({
            cartId: cartId,
            quantity: quantity,
            price: price,
            sequence: sequence,
            totalItems: cart.length + 1
          }),
          ts: new Date().toISOString()
        }]
      });
      console.log('➕ [Tracking] Item added:', dishId, 'x', quantity);
    } catch (error) {
      console.error('❌ [Tracking] Error adding item:', error);
    }
  }, [sessionId, restaurant, cartId, cart]);

  // Tracking: Eliminar item del carrito
  const trackItemRemoved = useCallback(async (dishId: string) => {
    if (!sessionId || !restaurant?.id || !cartId) return;

    try {
      await apiClient.tracking.sendEvents({
        sessionId: sessionId,
        restaurantId: restaurant.id,
        events: [{
          type: 'cart_item_removed',
          entityId: dishId,
          entityType: 'dish',
          value: JSON.stringify({
            cartId: cartId,
            totalItems: cart.length - 1
          }),
          ts: new Date().toISOString()
        }]
      });
      console.log('➖ [Tracking] Item removed:', dishId);
    } catch (error) {
      console.error('❌ [Tracking] Error removing item:', error);
    }
  }, [sessionId, restaurant, cartId, cart]);

  // Tracking: Actualizar cantidad de item
  const trackItemQuantityUpdated = useCallback(async (dishId: string, newQuantity: number, oldQuantity: number) => {
    if (!sessionId || !restaurant?.id || !cartId) return;

    try {
      await apiClient.tracking.sendEvents({
        sessionId: sessionId,
        restaurantId: restaurant.id,
        events: [{
          type: 'cart_item_quantity',
          entityId: dishId,
          entityType: 'dish',
          value: JSON.stringify({
            cartId: cartId,
            newQuantity: newQuantity,
            oldQuantity: oldQuantity,
            totalItems: getTotalItems()
          }),
          ts: new Date().toISOString()
        }]
      });
      console.log('🔄 [Tracking] Quantity updated:', dishId, oldQuantity, '→', newQuantity);
    } catch (error) {
      console.error('❌ [Tracking] Error updating quantity:', error);
    }
  }, [sessionId, restaurant, cartId]);

  // Tracking: Abrir carrito
  const trackCartOpened = useCallback(async () => {
    if (!sessionId || !restaurant?.id || !cartId) return;

    try {
      await apiClient.tracking.sendEvents({
        sessionId: sessionId,
        restaurantId: restaurant.id,
        events: [{
          type: 'cart_opened',
          entityId: cartId,
          entityType: 'cart',
          value: JSON.stringify({
            totalItems: getTotalItems(),
            totalValue: getTotalPrice()
          }),
          ts: new Date().toISOString()
        }]
      });
      console.log('👀 [Tracking] Cart opened');
    } catch (error) {
      console.error('❌ [Tracking] Error opening cart:', error);
    }
  }, [sessionId, restaurant, cartId]);

  // Tracking: Mostrar al personal (CONVERSIÓN)
  const trackCartShownToStaff = useCallback(async () => {
    if (!sessionId || !restaurant?.id || !cartId || !cartCreatedAt) return;

    const timeSpent = Math.floor((Date.now() - new Date(cartCreatedAt).getTime()) / 1000);

    try {
      await apiClient.tracking.sendEvents({
        sessionId: sessionId,
        restaurantId: restaurant.id,
        events: [{
          type: 'cart_shown_to_staff',
          entityId: cartId,
          entityType: 'cart',
          value: JSON.stringify({
            totalItems: getTotalItems(),
            uniqueDishes: cart.length,
            totalValue: getTotalPrice(),
            timeSpentSeconds: timeSpent,
            items: cart.map(item => ({
              dishId: item.dishId,
              name: item.name,
              quantity: item.quantity,
              price: item.price
            }))
          }),
          ts: new Date().toISOString()
        }]
      });
      console.log('✅ [Tracking] Cart shown to staff - CONVERSION!');
    } catch (error) {
      console.error('❌ [Tracking] Error showing cart to staff:', error);
    }
  }, [sessionId, restaurant, cartId, cartCreatedAt, cart]);

  // Funciones del carrito
  const getCartItemQuantity = useCallback((dishId: string) => {
    const item = cart.find(item => item.dishId === dishId);
    return item ? item.quantity : 0;
  }, [cart]);

  const addToCart = useCallback(async () => {
    const existingItem = cart.find(item => item.dishId === dish.id);
    let newCartId = cartId;
    
    // Si es el primer item, crear carrito
    if (!cartId) {
      newCartId = generateCartId();
      setCartId(newCartId);
      const now = new Date().toISOString();
      setCartCreatedAt(now);
      await trackCartCreated(newCartId);
    }
    
    if (existingItem) {
      // Actualizar cantidad
      const oldQuantity = existingItem.quantity;
      setCart(cart.map(item => 
        item.dishId === dish.id 
          ? { ...item, quantity: item.quantity + quantityToAdd }
          : item
      ));
      await trackItemQuantityUpdated(dish.id, existingItem.quantity + quantityToAdd, oldQuantity);
    } else {
      // Agregar nuevo item
      const newItem: CartItem = {
        dishId: dish.id,
        name: dishName,
        price: dish.price || 0,
        quantity: quantityToAdd,
        image: media?.thumbnail_url || media?.url,
        addedAt: new Date().toISOString()
      };
      setCart([...cart, newItem]);
      await trackItemAdded(dish.id, quantityToAdd, dish.price || 0, cart.length + 1);
    }
    
    setOpenAddModal(false);
    setQuantityToAdd(1);
  }, [cart, dish, dishName, media, quantityToAdd, cartId, generateCartId, trackCartCreated, trackItemAdded, trackItemQuantityUpdated]);

  const removeFromCart = useCallback(async (dishId: string) => {
    await trackItemRemoved(dishId);
    setCart(cart.filter(item => item.dishId !== dishId));
  }, [cart, trackItemRemoved]);

  const updateCartItemQuantity = useCallback(async (dishId: string, newQuantity: number) => {
    const item = cart.find(item => item.dishId === dishId);
    if (!item) return;

    const oldQuantity = item.quantity;

    if (newQuantity <= 0) {
      await removeFromCart(dishId);
    } else {
      setCart(cart.map(item => 
        item.dishId === dishId 
          ? { ...item, quantity: newQuantity }
          : item
      ));
      await trackItemQuantityUpdated(dishId, newQuantity, oldQuantity);
    }
  }, [cart, removeFromCart, trackItemQuantityUpdated]);

  const getTotalPrice = useCallback(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  const getTotalItems = useCallback(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  // Manejar apertura del drawer del carrito
  const handleOpenCartDrawer = useCallback(async () => {
    setOpenCartDrawer(true);
    await trackCartOpened();
  }, [trackCartOpened]);

  // Manejar "Solicitar al Personal"
  const handleShowToStaff = useCallback(async () => {
    await trackCartShownToStaff();
    // Aquí podrías mostrar un mensaje de confirmación o cerrar el drawer
    alert('¡Tu pedido ha sido registrado! Consulta con el personal de sala.');
    setOpenCartDrawer(false);
  }, [trackCartShownToStaff]);

  // Obtener URL del icono de alérgeno
  const getAllergenIconUrl = useCallback((allergen: Allergen) => {
    const API_URL = import.meta.env.VITE_API_URL || "https://visualtasteworker.franciscotortosaestudios.workers.dev";
    
    if (allergen.iconurl) {
      return `${API_URL}/media/System/allergens/${allergen.iconurl}`;
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

  // Obtener nombre del alérgeno
  const getAllergenName = useCallback((allergen: Allergen) => {
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
  }, [currentLanguage]);

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
      }).catch(() => {
        setVideoError(true);
      });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isActive, inView, isVideo, videoError]);

  // Tracking de vista de plato
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
    setShowDetails(prev => !prev);
  }, []);

  // Componente: Icono de alérgeno
  const AllergenIcon: React.FC<{ allergen: Allergen; size?: number }> = ({ allergen, size = 24 }) => {
    const iconUrl = getAllergenIconUrl(allergen);
    const hasError = allergenImageErrors.has(allergen.id);
    const allergenName = getAllergenName(allergen);

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

  const currentQuantity = getCartItemQuantity(dish.id);

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
          <video
            ref={videoRef}
            src={media?.url}
            poster={media?.thumbnail_url}
            loop
            muted
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
            zIndex: 2,
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
          bottom: { xs: 220, sm: 140 },
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 2, sm: 2.5 },
          zIndex: 10
        }}
      >
        {/* Botón Favorito */}
        <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}>
          <IconButton
            onClick={handleFavorite}
            sx={{
              width: { xs: 52, sm: 60 },
              height: { xs: 52, sm: 60 },
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
            {isFavorite ? <Favorite sx={{ fontSize: { xs: 24, sm: 28 } }} /> : <FavoriteBorder sx={{ fontSize: { xs: 24, sm: 28 } }} />}
          </IconButton>
        </motion.div>

        {/* Botón Agregar con badge */}
        <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}>
          <Badge 
            badgeContent={currentQuantity} 
            color="error"
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: colors.primary,
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.85rem',
                minWidth: 24,
                height: 24,
                border: '2px solid rgba(0,0,0,0.8)'
              }
            }}
          >
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setOpenAddModal(true);
              }}
              sx={{
                width: { xs: 52, sm: 60 },
                height: { xs: 52, sm: 60 },
                bgcolor: colors.secondary,
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                boxShadow: `0 8px 32px ${colors.secondary}80`,
                '&:hover': {
                  bgcolor: colors.secondary,
                  opacity: 0.9,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 12px 40px ${colors.secondary}99`
                },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <Add sx={{ fontSize: { xs: 24, sm: 28 } }} />
            </IconButton>
          </Badge>
        </motion.div>

        {/* Botón Carrito - Siempre visible cuando hay items */}
        <AnimatePresence>
          {cart.length > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
            >
              <Badge 
                badgeContent={getTotalItems()} 
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: colors.primary,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    minWidth: 24,
                    height: 24,
                    border: '2px solid rgba(0,0,0,0.8)'
                  }
                }}
              >
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCartDrawer();
                  }}
                  sx={{
                    width: { xs: 52, sm: 60 },
                    height: { xs: 52, sm: 60 },
                    bgcolor: colors.secondary,
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    boxShadow: `0 8px 32px ${colors.secondary}80`,
                    '&:hover': {
                      bgcolor: colors.secondary,
                      opacity: 0.9,
                      transform: 'translateY(-2px)',
                      boxShadow: `0 12px 40px ${colors.secondary}99`
                    },
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <ShoppingCart sx={{ fontSize: { xs: 24, sm: 28 } }} />
                </IconButton>
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {/* Modal: Agregar al carrito */}
      <Dialog
        open={openAddModal}
        onClose={() => {
          setOpenAddModal(false);
          setQuantityToAdd(1);
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
          alignItems: 'center'
        }}>
          Agregar al carrito
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

          <Typography variant="h6" sx={{ color: colors.text, fontWeight: 600, mb: 1 }}>
            {dishName}
          </Typography>
          
          <Typography variant="h5" sx={{ color: colors.primary, fontWeight: 700, mb: 3 }}>
            €{(dish.price || 0).toFixed(2)}
          </Typography>

          {description && (
            <Typography 
              sx={{ 
                color: 'rgba(255,255,255,0.7)', 
                fontSize: '0.95rem',
                mb: 3,
                lineHeight: 1.6
              }}
            >
              {description.substring(0, 120)}{description.length > 120 ? '...' : ''}
            </Typography>
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
              textAlign: 'center'
            }}>
              {quantityToAdd}
            </Typography>
            
            <IconButton
              onClick={() => setQuantityToAdd(quantityToAdd + 1)}
              sx={{
                bgcolor: colors.secondary,
                color: '#fff',
                '&:hover': { bgcolor: colors.secondary, opacity: 0.8 }
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
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}>
              Subtotal:
            </Typography>
            <Typography sx={{ color: colors.primary, fontWeight: 700, fontSize: '1.4rem' }}>
              €{((dish.price || 0) * quantityToAdd).toFixed(2)}
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={() => {
              setOpenAddModal(false);
              setQuantityToAdd(1);
            }}
            sx={{ 
              color: 'rgba(255,255,255,0.6)',
              fontSize: '1rem',
              textTransform: 'none',
              px: 3
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={addToCart}
            variant="contained"
            sx={{
              bgcolor: colors.primary,
              color: '#fff',
              fontWeight: 600,
              fontSize: '1rem',
              px: 4,
              py: 1.5,
              textTransform: 'none',
              borderRadius: 2,
              boxShadow: `0 8px 24px ${colors.primary}60`,
              '&:hover': {
                bgcolor: colors.primary,
                opacity: 0.9,
                boxShadow: `0 12px 32px ${colors.primary}80`
              }
            }}
          >
            Agregar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Drawer: Carrito completo */}
      <Drawer
        anchor="right"
        open={openCartDrawer}
        onClose={() => setOpenCartDrawer(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 400 },
            bgcolor: 'rgba(20,20,20,0.98)',
            backdropFilter: 'blur(40px)',
            borderLeft: '1px solid rgba(255,255,255,0.1)'
          }
        }}
      >
        <Box sx={{ 
          p: 3, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Typography variant="h5" sx={{ color: colors.text, fontWeight: 700 }}>
            Mi Carrito
          </Typography>
          <IconButton onClick={() => setOpenCartDrawer(false)} sx={{ color: colors.text }}>
            <Close />
          </IconButton>
        </Box>

        <List sx={{ 
          flexGrow: 1, 
          overflowY: 'auto', 
          p: 2,
          '&::-webkit-scrollbar': { width: 8 },
          '&::-webkit-scrollbar-thumb': { 
            bgcolor: 'rgba(255,255,255,0.2)',
            borderRadius: 4
          }
        }}>
          {cart.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              py: 8,
              color: 'rgba(255,255,255,0.5)'
            }}>
              <ShoppingCart sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
              <Typography>Tu carrito está vacío</Typography>
            </Box>
          ) : (
            cart.map((item) => (
              <React.Fragment key={item.dishId}>
                <ListItem
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.05)',
                    borderRadius: 2,
                    mb: 2,
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    p: 2
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    {item.image && (
                      <Box
                        component="img"
                        src={item.image}
                        alt={item.name}
                        sx={{
                          width: 80,
                          height: 80,
                          objectFit: 'cover',
                          borderRadius: 2
                        }}
                      />
                    )}
                    
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography sx={{ color: colors.text, fontWeight: 600, mb: 0.5 }}>
                        {item.name}
                      </Typography>
                      <Typography sx={{ color: colors.primary, fontWeight: 700, fontSize: '1.1rem' }}>
                        €{item.price.toFixed(2)}
                      </Typography>
                    </Box>

                    <IconButton
                      onClick={() => removeFromCart(item.dishId)}
                      sx={{
                        color: 'rgba(255,100,100,0.8)',
                        alignSelf: 'flex-start',
                        '&:hover': { color: 'rgba(255,100,100,1)' }
                      }}
                    >
                      <DeleteOutline />
                    </IconButton>
                  </Box>

                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pt: 1,
                    borderTop: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <IconButton
                        size="small"
                        onClick={() => updateCartItemQuantity(item.dishId, item.quantity - 1)}
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.1)',
                          color: colors.text,
                          width: 32,
                          height: 32,
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                        }}
                      >
                        <Remove fontSize="small" />
                      </IconButton>
                      
                      <Typography sx={{ 
                        color: colors.text, 
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        minWidth: 30,
                        textAlign: 'center'
                      }}>
                        {item.quantity}
                      </Typography>
                      
                      <IconButton
                        size="small"
                        onClick={() => updateCartItemQuantity(item.dishId, item.quantity + 1)}
                        sx={{
                          bgcolor: colors.secondary,
                          color: '#fff',
                          width: 32,
                          height: 32,
                          '&:hover': { bgcolor: colors.secondary, opacity: 0.8 }
                        }}
                      >
                        <Add fontSize="small" />
                      </IconButton>
                    </Box>

                    <Typography sx={{ color: colors.text, fontWeight: 700, fontSize: '1.1rem' }}>
                      €{(item.price * item.quantity).toFixed(2)}
                    </Typography>
                  </Box>
                </ListItem>
              </React.Fragment>
            ))
          )}
        </List>

        {cart.length > 0 && (
          <Box sx={{ 
            p: 3, 
            borderTop: '1px solid rgba(255,255,255,0.1)',
            bgcolor: 'rgba(0,0,0,0.3)'
          }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3
            }}>
              <Typography variant="h6" sx={{ color: colors.text, fontWeight: 600 }}>
                Total:
              </Typography>
              <Typography variant="h4" sx={{ color: colors.primary, fontWeight: 700 }}>
                €{getTotalPrice().toFixed(2)}
              </Typography>
            </Box>

            <Alert 
              icon={<Restaurant />}
              severity="info"
              sx={{
                bgcolor: `${colors.secondary}20`,
                color: colors.text,
                border: `1px solid ${colors.secondary}40`,
                borderRadius: 2,
                mb: 2,
                '& .MuiAlert-icon': {
                  color: colors.secondary
                }
              }}
            >
              <Typography sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
                Para completar tu pedido, consulta con el personal de sala
              </Typography>
            </Alert>

            <Button
              fullWidth
              variant="contained"
              startIcon={<Restaurant />}
              onClick={handleShowToStaff}
              sx={{
                bgcolor: colors.secondary,
                color: '#fff',
                fontWeight: 700,
                fontSize: '1.1rem',
                py: 2,
                textTransform: 'none',
                borderRadius: 2,
                boxShadow: `0 8px 32px ${colors.secondary}80`,
                '&:hover': {
                  bgcolor: colors.secondary,
                  opacity: 0.9,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 12px 40px ${colors.secondary}99`
                },
                transition: 'all 0.3s ease'
              }}
            >
              Solicitar al Personal ({getTotalItems()} items)
            </Button>
          </Box>
        )}
      </Drawer>

      {/* Información del plato (resto del código igual...) */}
      <Box
        sx={{
          position: 'absolute',
          bottom: { xs: 0, sm: 90 },
          left: 0,
          right: { xs: 75, sm: 90 },
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
              mb: 1
            }}
          >
            {description}
          </Typography>

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

          {/* Sección expandible con información nutricional y alérgenos (igual que antes) */}
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

                {dish?.allergens && dish.allergens.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        color: colors.text,
                        fontWeight: 600,
                        mb: 3,
                        fontSize: { xs: '1rem', sm: '1.1rem' }
                      }}
                    >
                      Alérgenos
                    </Typography>
                    
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
                          <AllergenIcon allergen={allergen} size={40} />
                          
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
