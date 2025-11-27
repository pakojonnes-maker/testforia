// apps/client/src/components/reels/ReelsContainer.tsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Virtual } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Hooks y contextos
import { useReelsConfig } from '../../hooks/useReelsConfig';
import { useDishTracking } from '../../providers/TrackingAndPushProvider';

// Template components
import ClassicDishCard from './templates/classic/DishCard';
import ClassicSectionBar from './templates/classic/SectionBar';
import ClassicHeader from './templates/classic/Header';

// CSS
import 'swiper/css';
import 'swiper/css/virtual';

// MUI Icons
import {
  ShoppingCart,
  Close,
  DeleteOutline,
  Remove,
  Add,
  Restaurant
} from '@mui/icons-material';
import {
  IconButton,
  Badge,
  Drawer,
  List,
  ListItem,
  Alert,
  Button
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../lib/apiClient';

// ======================================================================
// TIPOS
// ======================================================================

interface ReelsContainerProps {
  restaurantData: {
    restaurant: any;
    sections: any[];
    dishesBySection: any[];
    languages?: any[];
  };
  initialSectionIndex?: number;
  initialDishIndex?: number;
  onClose?: () => void;
}

interface CartItem {
  dishId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  addedAt: string;
}

const UI_CONFIG = {
  SWIPER_SPEED: 300,
  SWIPER_RESISTANCE_RATIO: 0.65,
  TOUCH_RATIO: 1,
  THRESHOLD: 5,
  LONG_SWIPES: false,
  FOLLOW_FINGER: true,
  SHORT_SWIPES: true
} as const;

// ======================================================================
// TEMPLATE COMPONENTS CACHE
// ======================================================================

const TEMPLATE_COMPONENTS_CACHE = {
  'tpl_classic': {
    DishCard: ClassicDishCard,
    SectionBar: ClassicSectionBar,
    Header: ClassicHeader
  }
};

const getTemplateComponents = (templateId: string) => {
  const components = TEMPLATE_COMPONENTS_CACHE[templateId as keyof typeof TEMPLATE_COMPONENTS_CACHE]
    || TEMPLATE_COMPONENTS_CACHE['tpl_classic'];

  return components;
};

// ======================================================================
// COMPONENTE PRINCIPAL
// ======================================================================

const ReelsContainer: React.FC<ReelsContainerProps> = React.memo(({
  restaurantData,
  initialSectionIndex = 0,
  initialDishIndex = 0,
  onClose
}) => {
  console.log('🎬 [ReelsContainer] Fixed Navigation & UI');

  // ======================================================================
  // HOOKS & STATE
  // ======================================================================

  const restaurantSlug = restaurantData.restaurant?.slug;

  const [currentLanguage, setCurrentLanguage] = useState('es');

  const { config: reelConfig, loading: configLoading, error: configError } = useReelsConfig(restaurantSlug, currentLanguage);

  const templateComponents = useMemo(() => {
    if (!reelConfig?.template?.id) return null;
    return getTemplateComponents(reelConfig.template.id);
  }, [reelConfig?.template?.id]);

  const [currentSectionIndex, setCurrentSectionIndex] = useState(initialSectionIndex);
  const [currentDishIndex, setCurrentDishIndex] = useState(initialDishIndex);
  const [muted, setMuted] = useState(true);

  // ======================================================================
  // REFS
  // ======================================================================

  const verticalSwiperRef = useRef<SwiperType | null>(null);
  const horizontalSwiperRef = useRef<SwiperType | null>(null);
  const verticalSwiperRefs = useRef<{ [key: number]: SwiperType | null }>({});
  const lastUpdateRef = useRef<number>(0);
  const isClickNavigationRef = useRef<boolean>(false);
  const currentSectionIndexRef = useRef<number>(initialSectionIndex);
  // ✅ NUEVO: Refs para tracking de tiempo en sección
  const sectionStartTimeRef = useRef<number | null>(null);
  const sectionDishesViewedRef = useRef<Set<string>>(new Set());

  // ======================================================================
  // CART STATE & LOGIC
  // ======================================================================
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [cartCreatedAt, setCartCreatedAt] = useState<string | null>(null);
  const [openCartDrawer, setOpenCartDrawer] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  // Initialize session ID
  useEffect(() => {
    // Simple session ID generation if not provided via props/context
    const storedSession = localStorage.getItem('vt_session_id');
    if (storedSession) {
      setSessionId(storedSession);
    } else {
      const newSession = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('vt_session_id', newSession);
      setSessionId(newSession);
    }
  }, []);

  // Generar UUID para carrito
  const generateCartId = useCallback(() => {
    return 'cart_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }, []);

  // Tracking helpers
  const trackCartCreated = useCallback(async (newCartId: string) => {
    if (!sessionId || !restaurantData.restaurant?.id) return;
    try {
      await apiClient.tracking.sendEvents({
        sessionId: sessionId,
        restaurantId: restaurantData.restaurant.id,
        events: [{
          type: 'cart_created',
          entityId: newCartId,
          entityType: 'cart',
          ts: new Date().toISOString()
        }]
      });
    } catch (error) { console.error('❌ [Tracking] Error creating cart:', error); }
  }, [sessionId, restaurantData.restaurant]);

  const trackItemAdded = useCallback(async (dishId: string, quantity: number, price: number, sequence: number) => {
    if (!sessionId || !restaurantData.restaurant?.id || !cartId) return;
    try {
      await apiClient.tracking.sendEvents({
        sessionId: sessionId,
        restaurantId: restaurantData.restaurant.id,
        events: [{
          type: 'cart_item_added',
          entityId: dishId,
          entityType: 'dish',
          value: JSON.stringify({ cartId, quantity, price, sequence, totalItems: cart.length + 1 }),
          ts: new Date().toISOString()
        }]
      });
    } catch (error) { console.error('❌ [Tracking] Error adding item:', error); }
  }, [sessionId, restaurantData.restaurant, cartId, cart]);

  const trackItemRemoved = useCallback(async (dishId: string) => {
    if (!sessionId || !restaurantData.restaurant?.id || !cartId) return;
    try {
      await apiClient.tracking.sendEvents({
        sessionId: sessionId,
        restaurantId: restaurantData.restaurant.id,
        events: [{
          type: 'cart_item_removed',
          entityId: dishId,
          entityType: 'dish',
          value: JSON.stringify({ cartId, totalItems: cart.length - 1 }),
          ts: new Date().toISOString()
        }]
      });
    } catch (error) { console.error('❌ [Tracking] Error removing item:', error); }
  }, [sessionId, restaurantData.restaurant, cartId, cart]);

  const trackItemQuantityUpdated = useCallback(async (dishId: string, newQuantity: number, oldQuantity: number) => {
    if (!sessionId || !restaurantData.restaurant?.id || !cartId) return;
    try {
      await apiClient.tracking.sendEvents({
        sessionId: sessionId,
        restaurantId: restaurantData.restaurant.id,
        events: [{
          type: 'cart_item_quantity',
          entityId: dishId,
          entityType: 'dish',
          value: JSON.stringify({ cartId, newQuantity, oldQuantity, totalItems: cart.reduce((acc, item) => acc + item.quantity, 0) }),
          ts: new Date().toISOString()
        }]
      });
    } catch (error) { console.error('❌ [Tracking] Error updating quantity:', error); }
  }, [sessionId, restaurantData.restaurant, cartId, cart]);

  const trackCartOpened = useCallback(async () => {
    if (!sessionId || !restaurantData.restaurant?.id || !cartId) return;
    try {
      await apiClient.tracking.sendEvents({
        sessionId: sessionId,
        restaurantId: restaurantData.restaurant.id,
        events: [{
          type: 'cart_opened',
          entityId: cartId,
          entityType: 'cart',
          value: JSON.stringify({
            totalItems: cart.reduce((acc, item) => acc + item.quantity, 0),
            totalValue: cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
          }),
          ts: new Date().toISOString()
        }]
      });
    } catch (error) { console.error('❌ [Tracking] Error opening cart:', error); }
  }, [sessionId, restaurantData.restaurant, cartId, cart]);

  const trackCartShownToStaff = useCallback(async () => {
    if (!sessionId || !restaurantData.restaurant?.id || !cartId || !cartCreatedAt) return;
    const timeSpent = Math.floor((Date.now() - new Date(cartCreatedAt).getTime()) / 1000);
    try {
      await apiClient.tracking.sendEvents({
        sessionId: sessionId,
        restaurantId: restaurantData.restaurant.id,
        events: [{
          type: 'cart_shown_to_staff',
          entityId: cartId,
          entityType: 'cart',
          value: JSON.stringify({
            totalItems: cart.reduce((acc, item) => acc + item.quantity, 0),
            uniqueDishes: cart.length,
            totalValue: cart.reduce((acc, item) => acc + (item.price * item.quantity), 0),
            timeSpentSeconds: timeSpent,
            items: cart.map(item => ({ dishId: item.dishId, name: item.name, quantity: item.quantity, price: item.price }))
          }),
          ts: new Date().toISOString()
        }]
      });
    } catch (error) { console.error('❌ [Tracking] Error showing cart to staff:', error); }
  }, [sessionId, restaurantData.restaurant, cartId, cartCreatedAt, cart]);

  // Cart Actions
  const addToCart = useCallback(async (dish: any, quantity: number) => {
    const existingItem = cart.find(item => item.dishId === dish.id);
    let currentCartId = cartId;

    if (!currentCartId) {
      currentCartId = generateCartId();
      setCartId(currentCartId);
      setCartCreatedAt(new Date().toISOString());
      await trackCartCreated(currentCartId);
    }

    const dishName = dish?.translations?.name?.[currentLanguage] || dish?.name || 'Plato';
    const media = dish?.media?.[0];
    const image = media?.thumbnail_url || media?.url;

    if (existingItem) {
      const oldQuantity = existingItem.quantity;
      setCart(prev => prev.map(item =>
        item.dishId === dish.id ? { ...item, quantity: item.quantity + quantity } : item
      ));
      await trackItemQuantityUpdated(dish.id, existingItem.quantity + quantity, oldQuantity);
    } else {
      const newItem: CartItem = {
        dishId: dish.id,
        name: dishName,
        price: dish.price || 0,
        quantity: quantity,
        image,
        addedAt: new Date().toISOString()
      };
      setCart(prev => [...prev, newItem]);
      await trackItemAdded(dish.id, quantity, dish.price || 0, cart.length + 1);
    }
  }, [cart, cartId, currentLanguage, generateCartId, trackCartCreated, trackItemAdded, trackItemQuantityUpdated]);

  const removeFromCart = useCallback(async (dishId: string) => {
    await trackItemRemoved(dishId);
    setCart(prev => prev.filter(item => item.dishId !== dishId));
  }, [trackItemRemoved]);

  const updateCartItemQuantity = useCallback(async (dishId: string, newQuantity: number) => {
    const item = cart.find(i => i.dishId === dishId);
    if (!item) return;

    if (newQuantity <= 0) {
      await removeFromCart(dishId);
    } else {
      setCart(prev => prev.map(i => i.dishId === dishId ? { ...i, quantity: newQuantity } : i));
      await trackItemQuantityUpdated(dishId, newQuantity, item.quantity);
    }
  }, [cart, removeFromCart, trackItemQuantityUpdated]);

  const getTotalPrice = useCallback(() => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cart]);
  const getTotalItems = useCallback(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

  const handleOpenCartDrawer = useCallback(async () => {
    setOpenCartDrawer(true);
    await trackCartOpened();
  }, [trackCartOpened]);

  const handleShowToStaff = useCallback(async () => {
    await trackCartShownToStaff();
    alert('¡Tu pedido ha sido registrado! Consulta con el personal de sala.');
    setOpenCartDrawer(false);
  }, [trackCartShownToStaff]);

  // ======================================================================
  // TRACKING
  // ======================================================================

  const {
    setCurrentSection,
    trackSectionTime,
    trackScrollDepth
  } = useDishTracking();

  // ======================================================================
  // COMPUTED VALUES
  // ======================================================================

  const currentSection = useMemo(() =>
    reelConfig?.sections?.[currentSectionIndex],
    [reelConfig?.sections, currentSectionIndex]
  );

  const currentDishes = useMemo(() =>
    reelConfig?.sections?.[currentSectionIndex]?.dishes || [],
    [reelConfig?.sections, currentSectionIndex]
  );

  const availableLanguages = useMemo(() =>
    reelConfig?.languages || [],
    [reelConfig?.languages]
  );

  // ======================================================================
  // EFFECTS
  // ======================================================================

  useEffect(() => {
    currentSectionIndexRef.current = currentSectionIndex;
  }, [currentSectionIndex]);

  useEffect(() => {
    if (currentSection?.id) {
      setCurrentSection(currentSection.id);
    }
  }, [currentSection?.id, setCurrentSection]);

  useEffect(() => {
    console.log(`🎯 [ReelsContainer] State - Section: ${currentSectionIndex}, Dish: ${currentDishIndex}, Language: ${currentLanguage}`);
  }, [currentSectionIndex, currentDishIndex, currentLanguage]);

  // ✅ NUEVO: Tracking de tiempo en sección
  useEffect(() => {
    if (!currentSection?.id) return;

    // Iniciar timer para la nueva sección
    sectionStartTimeRef.current = Date.now();
    sectionDishesViewedRef.current = new Set();
    console.log('⏱️ [ReelsContainer] Iniciando timer de sección:', currentSection.id);

    return () => {
      // Al salir de la sección, enviar el tiempo
      if (sectionStartTimeRef.current && currentSection.id) {
        const duration = Math.floor((Date.now() - sectionStartTimeRef.current) / 1000);
        const dishesViewed = sectionDishesViewedRef.current.size;

        if (duration >= 1) {
          console.log('⏱️ [ReelsContainer] Enviando tiempo de sección:', {
            sectionId: currentSection.id,
            duration,
            dishesViewed
          });
          trackSectionTime(currentSection.id, duration, dishesViewed);
        }
      }
    };
  }, [currentSection?.id, trackSectionTime]);

  // ✅ NUEVO: Tracking de scroll depth (profundidad de visualización)
  useEffect(() => {
    if (!currentSection?.id) return;

    // Agregar el plato actual a los vistos en esta sección
    const dishId = currentDishes[currentDishIndex]?.id;
    if (dishId) {
      sectionDishesViewedRef.current.add(dishId);
    }

    // Trackear profundidad de scroll
    if (currentDishes.length > 0) {
      trackScrollDepth(currentSection.id, currentDishIndex, currentDishes.length);
    }
  }, [currentSection?.id, currentDishIndex, currentDishes, trackScrollDepth]);

  // ======================================================================
  // EVENT HANDLERS
  // ======================================================================

  const handleSectionChange = useCallback((newIndex: number) => {
    const now = Date.now();

    if (now - lastUpdateRef.current < 300) {
      console.log(`⏱️ [ReelsContainer] Debounce activo, ignorando click`);
      return;
    }

    const current = currentSectionIndexRef.current;

    if (newIndex === current ||
      newIndex < 0 ||
      newIndex >= (reelConfig?.sections?.length || 0)) {
      console.log(`⚠️ [ReelsContainer] Invalid index or same section: ${newIndex} (current: ${current})`);
      return;
    }

    console.log(`📂 [ReelsContainer] 🔥 Section change via CLICK: ${current} → ${newIndex}`);

    lastUpdateRef.current = now;
    isClickNavigationRef.current = true;

    setCurrentSectionIndex(newIndex);
    setCurrentDishIndex(0);

    const section = reelConfig?.sections?.[newIndex];
    if (section) {
      setCurrentSection(section.id);
    }

    if (horizontalSwiperRef.current) {
      console.log(`🎯 [ReelsContainer] Moving horizontal swiper to slide: ${newIndex}`);
      horizontalSwiperRef.current.slideTo(newIndex, UI_CONFIG.SWIPER_SPEED, false);
    } else {
      console.error(`❌ [ReelsContainer] horizontalSwiperRef.current is NULL!`);
    }

    setTimeout(() => {
      isClickNavigationRef.current = false;
      console.log(`✅ [ReelsContainer] Navigation completed`);
    }, UI_CONFIG.SWIPER_SPEED + 100);
  }, [reelConfig?.sections, setCurrentSection]);

  const handleDishChange = useCallback((newIndex: number, sectionIndex: number) => {
    if (sectionIndex !== currentSectionIndex) return;

    const now = Date.now();
    if (now - lastUpdateRef.current < 50) return;
    lastUpdateRef.current = now;

    if (newIndex === currentDishIndex ||
      newIndex < 0 ||
      newIndex >= currentDishes.length) {
      return;
    }

    console.log(`🍽️ [ReelsContainer] Dish change: ${currentDishIndex} → ${newIndex}`);
    setCurrentDishIndex(newIndex);
  }, [currentDishIndex, currentDishes.length, currentSectionIndex]);

  const toggleMuted = useCallback(() => {
    setMuted(prev => !prev);
  }, []);

  const handleLanguageChange = useCallback((languageCode: string) => {
    console.log(`🌍 [ReelsContainer] Language change: ${currentLanguage} → ${languageCode}`);
    setCurrentLanguage(languageCode);
  }, [currentLanguage]);

  // ======================================================================
  // SWIPER CONFIG
  // ======================================================================

  const swiperConfigs = useMemo(() => ({
    vertical: {
      modules: [Virtual],
      direction: 'vertical' as const,
      slidesPerView: 1,
      spaceBetween: 0,
      touchRatio: UI_CONFIG.TOUCH_RATIO,
      threshold: UI_CONFIG.THRESHOLD,
      shortSwipes: UI_CONFIG.SHORT_SWIPES,
      longSwipes: UI_CONFIG.LONG_SWIPES,
      followFinger: UI_CONFIG.FOLLOW_FINGER,
      virtual: {
        enabled: true,
        addSlidesBefore: 1,
        addSlidesAfter: 1,
        cache: true
      },
      speed: UI_CONFIG.SWIPER_SPEED,
      allowTouchMove: true,
      simulateTouch: true,
      resistance: true,
      resistanceRatio: UI_CONFIG.SWIPER_RESISTANCE_RATIO,
      cssMode: false,
      freeMode: false,
      centeredSlides: true,
      lazy: {
        enabled: true,
        loadPrevNext: true,
        loadPrevNextAmount: 1,
        loadOnTransitionStart: true
      }
    },
    horizontal: {
      modules: [Virtual],
      direction: 'horizontal' as const,
      slidesPerView: 1,
      spaceBetween: 0,
      touchRatio: UI_CONFIG.TOUCH_RATIO,
      threshold: UI_CONFIG.THRESHOLD,
      shortSwipes: UI_CONFIG.SHORT_SWIPES,
      longSwipes: UI_CONFIG.LONG_SWIPES,
      followFinger: UI_CONFIG.FOLLOW_FINGER,
      virtual: {
        enabled: true,
        cache: true
      },
      speed: UI_CONFIG.SWIPER_SPEED,
      allowTouchMove: true,
      simulateTouch: true,
      resistance: true,
      resistanceRatio: UI_CONFIG.SWIPER_RESISTANCE_RATIO,
      cssMode: false,
      centeredSlides: true,
      lazy: {
        enabled: true,
        loadPrevNext: true,
        loadPrevNextAmount: 1,
        loadOnTransitionStart: true
      }
    }
  }), []);

  // ======================================================================
  // LOADING STATES
  // ======================================================================

  if (configLoading || !reelConfig || !templateComponents) {
    return (
      <Box
        sx={{
          height: '100svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden'
        }}
      >
        <Box textAlign="center">
          <CircularProgress
            sx={{
              color: 'white',
              mb: 2,
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              }
            }}
            thickness={4}
            size={60}
          />
          <Typography variant="h6" sx={{ fontWeight: 300, letterSpacing: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Cargando experiencia gastronómica...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (configError) {
    return (
      <Box
        sx={{
          height: '100svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
          color: 'white',
          p: { xs: 2, sm: 4 },
          textAlign: 'center',
          transform: 'translateZ(0)'
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 300, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            Error al cargar la configuración
          </Typography>
        </Box>
      </Box>
    );
  }

  // ======================================================================
  // RENDER PRINCIPAL
  // ======================================================================

  const { DishCard, SectionBar, Header } = templateComponents;

  return (
    <Box
      sx={{
        height: '100svh',
        width: '100vw',
        position: 'relative',
        background: 'linear-gradient(145deg, #0f0f0f 0%, #1a1a1a 100%)',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <Header
        restaurant={reelConfig.restaurant}
        currentSection={currentSection}
        currentDishIndex={currentDishIndex}
        totalDishesInSection={currentDishes.length}
        config={reelConfig}
        languages={availableLanguages}
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageChange}
        onClose={onClose}
      />

      <Box
        sx={{
          position: 'fixed',
          left: { xs: 12, sm: 16 },
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 15,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.8
        }}
      >
        {Array.from({ length: Math.min(currentDishes.length, 12) }).map((_, index) => (
          <Box
            key={index}
            sx={{
              width: { xs: 3, sm: 4 },
              height: index === currentDishIndex ? { xs: 24, sm: 28 } : { xs: 8, sm: 10 },
              borderRadius: 2,
              bgcolor: index === currentDishIndex
                ? reelConfig.restaurant?.branding?.primary_color || '#FF6B6B'
                : 'rgba(255,255,255,0.4)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: index === currentDishIndex
                ? `0 0 8px ${reelConfig.restaurant?.branding?.primary_color || '#FF6B6B'}40`
                : 'none'
            }}
          />
        ))}
        {currentDishes.length > 12 && (
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: { xs: '0.6rem', sm: '0.7rem' },
              textAlign: 'center',
              mt: 0.5,
              fontFamily: '"Fraunces", serif'
            }}
          >
            +{currentDishes.length - 12}
          </Typography>
        )}
      </Box>



      {/* Cart Drawer */}
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
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, fontFamily: '"Fraunces", serif' }}>
            Mi Carrito
          </Typography>
          <IconButton onClick={() => setOpenCartDrawer(false)} sx={{ color: '#fff' }}>
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
              <Typography sx={{ fontFamily: '"Fraunces", serif' }}>Tu carrito está vacío</Typography>
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
                      <Typography sx={{ color: '#fff', fontWeight: 600, mb: 0.5, fontFamily: '"Fraunces", serif' }}>
                        {item.name}
                      </Typography>
                      <Typography sx={{ color: reelConfig.restaurant?.branding?.primary_color || '#FF6B6B', fontWeight: 700, fontSize: '1.1rem', fontFamily: '"Fraunces", serif' }}>
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
                          color: '#fff',
                          width: 32,
                          height: 32,
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                        }}
                      >
                        <Remove fontSize="small" />
                      </IconButton>

                      <Typography sx={{
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        minWidth: 30,
                        textAlign: 'center',
                        fontFamily: '"Fraunces", serif'
                      }}>
                        {item.quantity}
                      </Typography>

                      <IconButton
                        size="small"
                        onClick={() => updateCartItemQuantity(item.dishId, item.quantity + 1)}
                        sx={{
                          bgcolor: reelConfig.restaurant?.branding?.secondary_color || '#4ECDC4',
                          color: '#fff',
                          width: 32,
                          height: 32,
                          '&:hover': { bgcolor: reelConfig.restaurant?.branding?.secondary_color || '#4ECDC4', opacity: 0.8 }
                        }}
                      >
                        <Add fontSize="small" />
                      </IconButton>
                    </Box>

                    <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', fontFamily: '"Fraunces", serif' }}>
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
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, fontFamily: '"Fraunces", serif' }}>
                Total:
              </Typography>
              <Typography variant="h4" sx={{ color: reelConfig.restaurant?.branding?.primary_color || '#FF6B6B', fontWeight: 700, fontFamily: '"Fraunces", serif' }}>
                €{getTotalPrice().toFixed(2)}
              </Typography>
            </Box>

            <Alert
              icon={<Restaurant />}
              severity="info"
              sx={{
                bgcolor: `${reelConfig.restaurant?.branding?.secondary_color || '#4ECDC4'}20`,
                color: '#fff',
                border: `1px solid ${reelConfig.restaurant?.branding?.secondary_color || '#4ECDC4'}40`,
                borderRadius: 2,
                mb: 2,
                '& .MuiAlert-icon': {
                  color: reelConfig.restaurant?.branding?.secondary_color || '#4ECDC4'
                },
                fontFamily: '"Fraunces", serif'
              }}
            >
              <Typography sx={{ fontWeight: 500, fontSize: '0.9rem', fontFamily: '"Fraunces", serif' }}>
                Para completar tu pedido, consulta con el personal de sala
              </Typography>
            </Alert>

            <Button
              fullWidth
              variant="contained"
              startIcon={<Restaurant />}
              onClick={handleShowToStaff}
              sx={{
                bgcolor: reelConfig.restaurant?.branding?.secondary_color || '#4ECDC4',
                color: '#fff',
                fontWeight: 700,
                fontSize: '1.1rem',
                py: 2,
                textTransform: 'none',
                borderRadius: 2,
                boxShadow: `0 8px 32px ${reelConfig.restaurant?.branding?.secondary_color || '#4ECDC4'}80`,
                '&:hover': {
                  bgcolor: reelConfig.restaurant?.branding?.secondary_color || '#4ECDC4',
                  opacity: 0.9,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 12px 40px ${reelConfig.restaurant?.branding?.secondary_color || '#4ECDC4'}99`
                },
                transition: 'all 0.3s ease',
                fontFamily: '"Fraunces", serif'
              }}
            >
              Solicitar al Personal ({getTotalItems()} items)
            </Button>
          </Box>
        )}
      </Drawer>

      <Box
        sx={{
          position: 'relative',
          height: '100svh',
          width: '100vw',
          pt: '80px',
          pb: '90px'
        }}
      >
        {/* ✅ HORIZONTAL SWIPER CON onSwiper */}
        <Swiper
          {...swiperConfigs.horizontal}
          onSwiper={(swiper) => {
            horizontalSwiperRef.current = swiper;
            console.log('🎯 [Horizontal Swiper] onSwiper executed, ref assigned:', !!swiper);
          }}
          initialSlide={initialSectionIndex}
          onSlideChange={(swiper) => {
            if (!isClickNavigationRef.current) {
              const newIndex = swiper.activeIndex;
              console.log(`🎯 [Horizontal Swiper] Slide changed via SWIPE to: ${newIndex}`);
              if (newIndex !== currentSectionIndex) {
                setCurrentSectionIndex(newIndex);
                setCurrentDishIndex(0);
                const section = reelConfig?.sections?.[newIndex];
                if (section) {
                  setCurrentSection(section.id);
                }
              }
            } else {
              console.log(`🎯 [Horizontal Swiper] Slide changed via CLICK (ignoring onSlideChange)`);
            }
          }}
          style={{
            height: '100%',
            width: '100vw',
            transform: 'translateZ(0)'
          }}
        >
          {reelConfig?.sections?.map((section, sectionIdx) => (
            <SwiperSlide key={section.id} virtualIndex={sectionIdx}>
              {/* ✅ VERTICAL SWIPER CON onSwiper */}
              <Swiper
                {...swiperConfigs.vertical}
                onSwiper={(swiper) => {
                  verticalSwiperRefs.current[sectionIdx] = swiper;
                  if (sectionIdx === currentSectionIndex) {
                    verticalSwiperRef.current = swiper;
                  }
                  console.log(`🎯 [Vertical Swiper ${sectionIdx}] onSwiper executed`);
                }}
                initialSlide={sectionIdx === initialSectionIndex ? initialDishIndex : 0}
                onSlideChange={(swiper) => {
                  handleDishChange(swiper.activeIndex, sectionIdx);
                }}
                style={{
                  height: '100%',
                  width: '100vw',
                  transform: 'translateZ(0)'
                }}
              >
                {section?.dishes?.map((dish: any, dishIdx: number) => (
                  <SwiperSlide key={dish.id} virtualIndex={dishIdx}>
                    <DishCard
                      dish={dish}
                      restaurant={reelConfig.restaurant}
                      section={section}
                      isActive={sectionIdx === currentSectionIndex && dishIdx === currentDishIndex}
                      config={reelConfig}
                      muted={muted}
                      onMuteToggle={toggleMuted}
                      currentDishIndex={dishIdx}
                      totalDishes={section?.dishes?.length || 0}
                      currentLanguage={currentLanguage}
                      onAddToCart={addToCart}
                      cartItemCount={cart.find(i => i.dishId === dish.id)?.quantity || 0}
                      onOpenCart={handleOpenCartDrawer}
                      totalCartItems={getTotalItems()}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            </SwiperSlide>
          ))}
        </Swiper>
      </Box>

      <SectionBar
        sections={reelConfig?.sections || []}
        currentSectionIndex={currentSectionIndex}
        currentDishIndex={currentDishIndex}
        totalDishesInSection={currentDishes.length}
        onSectionChange={handleSectionChange}
        config={reelConfig}
        currentLanguage={currentLanguage}
      />
    </Box>
  );
});

ReelsContainer.displayName = 'ReelsContainer';

export default ReelsContainer;
