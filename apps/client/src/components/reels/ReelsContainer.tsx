// apps/client/src/components/reels/ReelsContainer.tsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Virtual } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Hooks y contextos
import { useReelsConfig } from '../../hooks/useReelsConfig';
import { useDishTracking, useTracking } from '../../providers/TrackingAndPushProvider';

// Template components
import ClassicDishCard from './templates/classic/DishCard';
import ClassicSectionBar from './templates/classic/SectionBar';
import ClassicHeader from './templates/classic/Header';
import SocialMenu from './SocialMenu';
import WelcomeModal from './WelcomeModal';

// CSS
// @ts-ignore
import 'swiper/css';

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
  Drawer,
  List,
  ListItem,
  Alert,
  Button
} from '@mui/material';
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
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const [muted, setMuted] = useState(true);

  // Extract marketing campaign
  const marketingCampaign = useMemo(() => {
    console.log('🔍 [ReelsContainer] Extracting marketing campaign from config:', reelConfig?.marketing);
    return reelConfig?.marketing;
  }, [reelConfig]);

  // Auto-open Welcome Modal
  useEffect(() => {
    console.log('🔍 [ReelsContainer] Checking auto-open conditions:', {
      hasCampaign: !!marketingCampaign,
      restaurantId: reelConfig?.restaurant?.id,
      settings: marketingCampaign?.settings
    });

    if (!marketingCampaign || !reelConfig?.restaurant?.id) return;

    // Check if enabled in config (default to true if no config provided, or false if explicitly disabled)
    const isEnabled = marketingCampaign.settings?.auto_open !== false;
    const delay = marketingCampaign.settings?.delay || 1500;

    console.log('🔍 [ReelsContainer] Auto-open enabled:', isEnabled, 'Delay:', delay);

    if (!isEnabled) return;

    const hasSeenWelcome = localStorage.getItem(`welcome_seen_${reelConfig.restaurant.id}`);
    const hasSubscribed = localStorage.getItem(`subscribed_${reelConfig.restaurant.id}`);

    console.log('🔍 [ReelsContainer] LocalStorage checks:', { hasSeenWelcome, hasSubscribed });

    if (!hasSeenWelcome && !hasSubscribed) {
      console.log('🔍 [ReelsContainer] Scheduling modal open...');
      // Delay slightly for better UX
      const timer = setTimeout(() => {
        console.log('🔍 [ReelsContainer] Opening modal now!');
        setWelcomeModalOpen(true);
        localStorage.setItem(`welcome_seen_${reelConfig.restaurant.id}`, 'true');
      }, delay);
      return () => clearTimeout(timer);
    } else {
      console.log('🔍 [ReelsContainer] Modal suppressed (already seen or subscribed)');
    }
  }, [reelConfig?.restaurant?.id, marketingCampaign]);

  const handleOpenOffer = () => {
    console.log('🔍 [ReelsContainer] Manual open offer triggered');
    console.log('🔍 [ReelsContainer] Current campaign state:', marketingCampaign);
    setWelcomeModalOpen(true);
  };

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
  const sectionDishesViewedRef = useRef<Set<string>>(new Set());

  // ======================================================================
  // CART STATE & LOGIC
  // ======================================================================
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [cartCreatedAt, setCartCreatedAt] = useState<string | null>(null);
  const [openCartDrawer, setOpenCartDrawer] = useState(false);

  // ✅ FIX: Usar sessionId del TrackingProvider en lugar de crear uno propio
  const { sessionId: trackingSessionId } = useTracking();

  // Sincronizar con el sessionId del TrackingProvider
  const sessionId = trackingSessionId || undefined;

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

  const trackItemAdded = useCallback(async (dishId: string, quantity: number, price: number, sequence: number, updatedCart: CartItem[]) => {
    if (!sessionId || !restaurantData.restaurant?.id || !cartId) return;

    const totalItems = updatedCart.reduce((acc, item) => acc + item.quantity, 0);
    const totalValue = updatedCart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const uniqueDishes = updatedCart.length;
    const itemsSnapshot = updatedCart.map(item => ({ dishId: item.dishId, name: item.name, quantity: item.quantity, price: item.price }));

    try {
      await apiClient.tracking.sendEvents({
        sessionId: sessionId,
        restaurantId: restaurantData.restaurant.id,
        events: [{
          type: 'cart_item_added',
          entityId: dishId,
          entityType: 'dish',
          value: JSON.stringify({
            cartId,
            quantity,
            price,
            sequence,
            totalItems,
            totalValue,
            uniqueDishes,
            items: itemsSnapshot
          }),
          ts: new Date().toISOString()
        }]
      });
    } catch (error) { console.error('❌ [Tracking] Error adding item:', error); }
  }, [sessionId, restaurantData.restaurant, cartId]);

  const trackItemRemoved = useCallback(async (dishId: string, updatedCart: CartItem[]) => {
    if (!sessionId || !restaurantData.restaurant?.id || !cartId) return;

    const totalItems = updatedCart.reduce((acc, item) => acc + item.quantity, 0);
    const totalValue = updatedCart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const uniqueDishes = updatedCart.length;
    const itemsSnapshot = updatedCart.map(item => ({ dishId: item.dishId, name: item.name, quantity: item.quantity, price: item.price }));

    try {
      await apiClient.tracking.sendEvents({
        sessionId: sessionId,
        restaurantId: restaurantData.restaurant.id,
        events: [{
          type: 'cart_item_removed',
          entityId: dishId,
          entityType: 'dish',
          value: JSON.stringify({
            cartId,
            totalItems,
            totalValue,
            uniqueDishes,
            items: itemsSnapshot
          }),
          ts: new Date().toISOString()
        }]
      });
    } catch (error) { console.error('❌ [Tracking] Error removing item:', error); }
  }, [sessionId, restaurantData.restaurant, cartId]);

  const trackItemQuantityUpdated = useCallback(async (dishId: string, newQuantity: number, oldQuantity: number, updatedCart: CartItem[]) => {
    if (!sessionId || !restaurantData.restaurant?.id || !cartId) return;

    const totalItems = updatedCart.reduce((acc, item) => acc + item.quantity, 0);
    const totalValue = updatedCart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const uniqueDishes = updatedCart.length;
    const itemsSnapshot = updatedCart.map(item => ({ dishId: item.dishId, name: item.name, quantity: item.quantity, price: item.price }));

    try {
      await apiClient.tracking.sendEvents({
        sessionId: sessionId,
        restaurantId: restaurantData.restaurant.id,
        events: [{
          type: 'cart_item_quantity',
          entityId: dishId,
          entityType: 'dish',
          value: JSON.stringify({
            cartId,
            newQuantity,
            oldQuantity,
            totalItems,
            totalValue,
            uniqueDishes,
            items: itemsSnapshot
          }),
          ts: new Date().toISOString()
        }]
      });
    } catch (error) { console.error('❌ [Tracking] Error updating quantity:', error); }
  }, [sessionId, restaurantData.restaurant, cartId]);

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

    let updatedCart: CartItem[];

    if (existingItem) {
      const oldQuantity = existingItem.quantity;
      updatedCart = cart.map(item =>
        item.dishId === dish.id ? { ...item, quantity: item.quantity + quantity } : item
      );
      setCart(updatedCart);
      await trackItemQuantityUpdated(dish.id, existingItem.quantity + quantity, oldQuantity, updatedCart);
    } else {
      const newItem: CartItem = {
        dishId: dish.id,
        name: dishName,
        price: dish.price || 0,
        quantity: quantity,
        image,
        addedAt: new Date().toISOString()
      };
      updatedCart = [...cart, newItem];
      setCart(updatedCart);
      await trackItemAdded(dish.id, quantity, dish.price || 0, cart.length + 1, updatedCart);
    }
  }, [cart, cartId, currentLanguage, generateCartId, trackCartCreated, trackItemAdded, trackItemQuantityUpdated]);

  const removeFromCart = useCallback(async (dishId: string) => {
    const updatedCart = cart.filter(item => item.dishId !== dishId);
    setCart(updatedCart);
    await trackItemRemoved(dishId, updatedCart);
  }, [cart, trackItemRemoved]);

  const updateCartItemQuantity = useCallback(async (dishId: string, newQuantity: number) => {
    const item = cart.find(i => i.dishId === dishId);
    if (!item) return;

    if (newQuantity <= 0) {
      await removeFromCart(dishId);
    } else {
      const updatedCart = cart.map(i => i.dishId === dishId ? { ...i, quantity: newQuantity } : i);
      setCart(updatedCart);
      await trackItemQuantityUpdated(dishId, newQuantity, item.quantity, updatedCart);
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
    trackScrollDepth,
    trackSectionTime
  } = useDishTracking();

  // ✅ NUEVO: Refs para tracking de tiempo en sección
  const sectionStartTimeRef = useRef<number>(Date.now());
  const prevSectionIdRef = useRef<string | null>(null);



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

  // ✅ EFFECT: Trackear tiempo en sección al cambiar
  useEffect(() => {
    // Si es la primera carga o cambio de sección
    if (currentSection?.id) {
      const now = Date.now();

      // Si había una sección anterior, enviar su tiempo
      if (prevSectionIdRef.current && prevSectionIdRef.current !== currentSection.id) {
        const duration = Math.floor((now - sectionStartTimeRef.current) / 1000);
        const dishesViewed = sectionDishesViewedRef.current.size;

        if (duration > 0) {
          trackSectionTime(prevSectionIdRef.current, duration, dishesViewed);
        }

        // Resetear contador de platos para la nueva sección
        sectionDishesViewedRef.current.clear();
      }

      // Actualizar refs para la nueva sección
      if (prevSectionIdRef.current !== currentSection.id) {
        sectionStartTimeRef.current = now;
        prevSectionIdRef.current = currentSection.id;
      }
    }
  }, [currentSection?.id, trackSectionTime]);

  // ✅ EFFECT: Cleanup al desmontar (enviar tiempo de última sección)
  useEffect(() => {
    return () => {
      if (prevSectionIdRef.current) {
        const duration = Math.floor((Date.now() - sectionStartTimeRef.current) / 1000);
        const dishesViewed = sectionDishesViewedRef.current.size;
        if (duration > 0) {
          trackSectionTime(prevSectionIdRef.current, duration, dishesViewed);
        }
      }
    };
  }, [trackSectionTime]);

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

  // ✅ Desktop Background & Pattern
  // Log branding to debug color issues
  console.log('🎨 [ReelsContainer] Branding:', reelConfig.restaurant?.branding);

  // ✅ FIX: Use background_color to match Hero Section (not accent_color)
  const brandColor = (reelConfig.restaurant?.branding as any)?.background_color || reelConfig.restaurant?.branding?.primaryColor || '#000000';

  // Use pattern from config or assets, similar to HeroPremiumSection
  const patternUrl = (reelConfig.config as any)?.pattern_url ||
    (reelConfig.config as any)?.background_pattern_url ||
    (reelConfig.restaurant as any)?.assets?.landing_pattern_url ||
    "https://visualtasteworker.franciscotortosaestudios.workers.dev/media/System/patterns/waves.svg";

  return (
    // ✅ Outer Container: Desktop Background
    <Box
      sx={{
        width: '100vw',
        height: '100svh',
        bgcolor: brandColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* ✅ Pattern Overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url('${patternUrl}')`,
          backgroundSize: '160px auto',
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center top', // Match HeroPremiumSection
          opacity: 0.12, // Match HeroPremiumSection
          mixBlendMode: 'soft-light', // Match HeroPremiumSection
          pointerEvents: 'none'
        }}
      />

      {/* ✅ Inner Container: Mobile Phone Simulation */}
      <Box
        sx={{
          height: '100%',
          width: '100%',
          maxWidth: '430px', // ✅ iPhone Pro Max width
          position: 'relative',
          background: 'linear-gradient(145deg, #0f0f0f 0%, #1a1a1a 100%)',
          overflow: 'hidden',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          WebkitOverflowScrolling: 'touch',
          boxShadow: '0 0 50px rgba(0,0,0,0.5)', // ✅ Shadow to pop out
          zIndex: 1 // ✅ Ensure it's above the pattern
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

        <SocialMenu
          restaurant={reelConfig.restaurant}
          onOpenOffer={handleOpenOffer}
        />

        <WelcomeModal
          open={welcomeModalOpen}
          onClose={() => setWelcomeModalOpen(false)}
          restaurant={reelConfig.restaurant}
          campaign={marketingCampaign}
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
                  ? reelConfig.restaurant?.branding?.primaryColor || '#FF6B6B'
                  : 'rgba(255,255,255,0.4)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: index === currentDishIndex
                  ? `0 0 8px ${reelConfig.restaurant?.branding?.primaryColor || '#FF6B6B'}40`
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
                        <Typography sx={{ color: reelConfig.restaurant?.branding?.primaryColor || '#FF6B6B', fontWeight: 700, fontSize: '1.1rem', fontFamily: '"Fraunces", serif' }}>
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
                            bgcolor: reelConfig.restaurant?.branding?.secondaryColor || '#4ECDC4',
                            color: '#fff',
                            width: 32,
                            height: 32,
                            '&:hover': { bgcolor: reelConfig.restaurant?.branding?.secondaryColor || '#4ECDC4', opacity: 0.8 }
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
                <Typography variant="h4" sx={{ color: reelConfig.restaurant?.branding?.primaryColor || '#FF6B6B', fontWeight: 700, fontFamily: '"Fraunces", serif' }}>
                  €{getTotalPrice().toFixed(2)}
                </Typography>
              </Box>

              <Alert
                icon={<Restaurant />}
                severity="info"
                sx={{
                  bgcolor: `${reelConfig.restaurant?.branding?.secondaryColor || '#4ECDC4'}20`,
                  color: '#fff',
                  border: `1px solid ${reelConfig.restaurant?.branding?.secondaryColor || '#4ECDC4'}40`,
                  borderRadius: 2,
                  mb: 2,
                  '& .MuiAlert-icon': {
                    color: reelConfig.restaurant?.branding?.secondaryColor || '#4ECDC4'
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
                  bgcolor: reelConfig.restaurant?.branding?.secondaryColor || '#4ECDC4',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  py: 2,
                  textTransform: 'none',
                  borderRadius: 2,
                  boxShadow: `0 8px 32px ${reelConfig.restaurant?.branding?.secondaryColor || '#4ECDC4'}80`,
                  '&:hover': {
                    bgcolor: reelConfig.restaurant?.branding?.secondaryColor || '#4ECDC4',
                    opacity: 0.9,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 12px 40px ${reelConfig.restaurant?.branding?.secondaryColor || '#4ECDC4'}99`
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
            width: '100%', // ✅ Changed from 100vw to 100% to respect container width
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
              width: '100%', // ✅ Changed from 100vw to 100%
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
                    width: '100%', // ✅ Changed from 100vw to 100%
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
      </Box >
    </Box >
  );
});

ReelsContainer.displayName = 'ReelsContainer';

export default ReelsContainer;
