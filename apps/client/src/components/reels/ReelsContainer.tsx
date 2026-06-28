// apps/client/src/components/reels/ReelsContainer.tsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Virtual, Mousewheel } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Hooks y contextos
// Hooks y contextos
import { useReelsConfig } from '../../hooks/useReelsConfig';
import { useDishTracking, useTracking } from '../../providers/TrackingAndPushProvider';
import { TranslationProvider } from '../../contexts/TranslationContext';

// Template components
import ClassicDishCard from './templates/classic/DishCard';
import ClassicSectionBar from './templates/classic/SectionBar';
import ClassicHeader from './templates/classic/Header';
import ClassicListView from './templates/classic/ListView';
import ClassicDishDetailModal from './templates/classic/DishDetailModal';

import { ShoppingCart } from '@mui/icons-material';
import SocialMenu from './SocialMenu';
import ViewModeToggle from './ViewModeToggle';
import WelcomeModal from './WelcomeModal';
import FloatingLauncher from '../marketing/FloatingLauncher';
import DeliveryModal from '../delivery/DeliveryModal';
// EventBanner ready but requires section-level integration
// import _EventBanner from '../marketing/EventBanner';

// CSS
// @ts-ignore
import 'swiper/css';

// MUI Icons
import {
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
  Alert
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
  portion: 'full' | 'half';
  image?: string;
  videoUrl?: string;
  addedAt: string;
}

const MobileSocialMenu = ({ children }: { children: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      <IconButton
        onClick={() => setIsOpen(!isOpen)}
        sx={{
          width: 40, height: 40,
          bgcolor: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(10px)',
          color: '#fff',
          boxShadow: 'none',
          zIndex: 2,
          transition: 'all 0.3s ease',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)'
        }}
      >
        <Add sx={{ fontSize: 20 }} />
      </IconButton>
      
      <Box sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 1,
          overflow: 'hidden',
          maxWidth: isOpen ? 500 : 0,
          opacity: isOpen ? 1 : 0,
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {children}
      </Box>
    </Box>
  );
};

const UI_CONFIG = {
  SWIPER_SPEED: 280,             // ✅ Fast snappy speed for fluid swiping
  SWIPER_RESISTANCE_RATIO: 0.85, // ✅ High resistance at edges (Rubber band effect)
  TOUCH_RATIO: 1,                // ✅ 1:1 Touch response (Immediate)
  THRESHOLD: 5,                  // ✅ Standard threshold
  LONG_SWIPES: false,            // Disable long swipes - only 1 slide at a time
  LONG_SWIPES_RATIO: 0.25,       // Even if long swipes trigger, move min distance
  FOLLOW_FINGER: true,
  SHORT_SWIPES: true,
  FREE_MODE_MOMENTUM_RATIO: 0.5  // ✅ Standard momentum
} as const;

// ======================================================================
// TEMPLATE COMPONENTS CACHE
// ======================================================================

const TEMPLATE_COMPONENTS_CACHE = {
  'tpl_classic': {
    DishCard: ClassicDishCard,
    SectionBar: ClassicSectionBar,
    Header: ClassicHeader,
    ListView: ClassicListView,
    DishDetailModal: ClassicDishDetailModal
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


  // ======================================================================
  // HOOKS & STATE
  // ======================================================================

  const restaurantSlug = restaurantData.restaurant?.slug;

  const [viewMode, setViewMode] = useState<'reels' | 'list'>('reels');
  const [selectedDish, setSelectedDish] = useState<any>(null); // For Details Modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('es');

  const { config: reelConfig, loading: configLoading, error: configError } = useReelsConfig(restaurantSlug, currentLanguage);

  useEffect(() => {
    if (reelConfig) {

      // console.log('🌍 [ReelsContainer] Translations content:', reelConfig.translations);
    }
  }, [reelConfig]);

  // ✅ Helper for internal translations (since we are outside TranslationProvider's context)
  const t = useCallback((key: string, defaultText: string) => {
    return reelConfig?.translations?.[key] || defaultText;
  }, [reelConfig?.translations]);

  const templateComponents = useMemo(() => {
    if (!reelConfig?.template?.id) return null;
    return getTemplateComponents(reelConfig.template.id);
  }, [reelConfig?.template?.id]);

  const [currentSectionIndex, setCurrentSectionIndex] = useState(initialSectionIndex);
  const [currentDishIndex, setCurrentDishIndex] = useState(initialDishIndex);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [isDishExpanded, setIsDishExpanded] = useState(false); // ✅ Track dish expansion for UI hiding
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false); // ✅ Delivery modal state
  // const [showFavorites, setShowFavorites] = useState(false); // NEW: Favorites Modal State

  // Extract marketing campaign
  const marketingCampaign = useMemo(() => {

    return reelConfig?.marketing;
  }, [reelConfig]);

  // Extract Scratch & Win campaign (if visible in menu)
  const scratchWinCampaign = useMemo(() => {
    return (reelConfig as any)?.scratchWin;
  }, [reelConfig]);

  // ✅ Extract delivery settings from config
  const deliveryConfig = useMemo(() => {
    return (reelConfig as any)?.deliverySettings || null;
  }, [reelConfig]);

  // ✅ Check if delivery is enabled
  const deliveryEnabled = useMemo(() => {
    return deliveryConfig?.is_enabled || false;
  }, [deliveryConfig]);

  // Extract visible Event campaigns (ready for future integration)
  // const eventCampaigns = useMemo(() => {
  //   return (reelConfig as any)?.events || [];
  // }, [reelConfig]);

  // Auto-open Welcome Modal
  useEffect(() => {


    if (!marketingCampaign || !reelConfig?.restaurant?.id) return;

    // Check if enabled in config (default to true if no config provided, or false if explicitly disabled)
    const isEnabled = marketingCampaign.settings?.auto_open !== false;
    const delay = marketingCampaign.settings?.delay || 1500;



    if (!isEnabled) return;

    // ✅ FIX: Use campaignId instead of restaurantId so new campaigns are shown to returning visitors
    const hasSeenWelcome = localStorage.getItem(`welcome_seen_${marketingCampaign.id}`);
    const hasSubscribed = localStorage.getItem(`subscribed_${reelConfig.restaurant.id}`);



    if (!hasSeenWelcome && !hasSubscribed) {

      // Delay slightly for better UX
      const timer = setTimeout(() => {

        setWelcomeModalOpen(true);
        localStorage.setItem(`welcome_seen_${marketingCampaign.id}`, 'true');
      }, delay);
      return () => clearTimeout(timer);
    } else {

    }
  }, [reelConfig?.restaurant?.id, marketingCampaign]);

  const navigate = useNavigate();

  // ✅ FIX: Usar sessionId del TrackingProvider en lugar de crear uno propio
  const { sessionId: trackingSessionId } = useTracking();

  // Sincronizar con el sessionId del TrackingProvider
  const sessionId = trackingSessionId || undefined;

  // ======================================================================
  // REFS
  // ======================================================================

  const verticalSwiperRef = useRef<SwiperType | null>(null);
  const horizontalSwiperRef = useRef<SwiperType | null>(null);
  const verticalSwiperRefs = useRef<{ [key: number]: SwiperType | null }>({});
  const lastUpdateRef = useRef<number>(0);
  const isClickNavigationRef = useRef<boolean>(false);
  const currentSectionIndexRef = useRef<number>(initialSectionIndex);
  const isHorizontalTransitioningRef = useRef<boolean>(false); // ✅ Lock for horizontal scroll
  const isVerticalTransitioningRef = useRef<boolean>(false);   // ✅ Lock for vertical scroll
  const currentDishIndexRef = useRef<number>(initialDishIndex); // ✅ Track dish index for clamp
  // ✅ NUEVO: Refs para tracking de tiempo en sección
  const sectionDishesViewedRef = useRef<Set<string>>(new Set());

  // ======================================================================
  // CART STATE & LOGIC
  // ======================================================================
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);

  const [openCartDrawer, setOpenCartDrawer] = useState(false);

  // Generar UUID para carrito
  const generateCartId = useCallback(() => {
    return 'cart_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }, []);

  // ✅ FIX: Open offer directly without push prompt interception
  const handleOpenOffer = () => {
    setWelcomeModalOpen(true);
  };

  const handleOpenReservation = useCallback(() => {

    navigate(`/reserve/${restaurantSlug}`);
  }, [navigate, restaurantSlug]);

  // ✅ Handler for opening delivery modal
  const handleOpenDelivery = useCallback(() => {

    setDeliveryModalOpen(true);
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



  // Cart Actions
  const addToCart = useCallback(async (dish: any, quantity: number, portion: 'full' | 'half' = 'full', price?: number) => {
    // Determine uniqueness based on dishId AND portion
    const existingItem = cart.find(item => item.dishId === dish.id && item.portion === portion);
    let currentCartId = cartId;

    if (!currentCartId) {
      currentCartId = generateCartId();
      setCartId(currentCartId);

      await trackCartCreated(currentCartId);
    }

    let dishName = dish?.translations?.name?.[currentLanguage] || dish?.name || reelConfig?.translations?.['dish_untitled'] || 'Plato';

    // Add portion indicator to name if it's a half portion
    if (portion === 'half') {
      const suffix = t('half_portion_suffix', ' (½)');
      dishName = `${dishName}${suffix}`;
    }

    const media = dish?.media?.[0];
    const isVideoMedia = media?.media_type === 'video' || media?.type === 'video' || media?.url?.endsWith('.mp4');
    const image = media?.thumbnail_url || (!isVideoMedia ? media?.url : undefined);
    const videoUrl = isVideoMedia ? media?.url : undefined;

    // Use provided price or fallback to dish prices
    const itemPrice = price !== undefined ? price : (portion === 'half' ? (dish.half_price || 0) : (dish.price || 0));

    let updatedCart: CartItem[];

    if (existingItem) {
      const oldQuantity = existingItem.quantity;
      updatedCart = cart.map(item =>
        (item.dishId === dish.id && item.portion === portion) ? { ...item, quantity: item.quantity + quantity } : item
      );
      setCart(updatedCart);
      await trackItemQuantityUpdated(dish.id, existingItem.quantity + quantity, oldQuantity, updatedCart);
    } else {
      const newItem: CartItem = {
        dishId: dish.id,
        name: dishName,
        price: itemPrice,
        quantity: quantity,
        portion,
        image,
        videoUrl,
        addedAt: new Date().toISOString()
      };
      updatedCart = [...cart, newItem];
      setCart(updatedCart);
      await trackItemAdded(dish.id, quantity, itemPrice, cart.length + 1, updatedCart);
    }
  }, [cart, cartId, currentLanguage, generateCartId, trackCartCreated, trackItemAdded, trackItemQuantityUpdated]);

  const removeFromCart = useCallback(async (dishId: string, portion: 'full' | 'half') => {
    const updatedCart = cart.filter(item => !(item.dishId === dishId && item.portion === portion));
    setCart(updatedCart);
    await trackItemRemoved(dishId, updatedCart);
  }, [cart, trackItemRemoved]);

  const updateCartItemQuantity = useCallback(async (dishId: string, newQuantity: number, portion: 'full' | 'half') => {
    const item = cart.find(i => i.dishId === dishId && i.portion === portion);
    if (!item) return;

    if (newQuantity <= 0) {
      await removeFromCart(dishId, portion);
    } else {
      const updatedCart = cart.map(i => (i.dishId === dishId && i.portion === portion) ? { ...i, quantity: newQuantity } : i);
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

  // ✅ EFFECT: Bloquear scroll del body cuando se monta el componente de reels
  useEffect(() => {
    // Agregar clase al montar
    document.documentElement.classList.add('reels-mode');
    document.body.classList.add('reels-mode');

    // Guardar el scroll position actual
    const scrollY = window.scrollY;

    // Prevenir scroll en cualquier touchmove fuera del swiper
    const preventDefaultScroll = (e: TouchEvent) => {
      // Solo prevenir si no es dentro de un elemento scrollable permitido
      const target = e.target as HTMLElement;
      // Allow scroll in: Swiper, elements with data-allow-scroll, allow-scroll class,
      // MUI Drawer/Dialog papers (for cart drawer, modals, etc.)
      if (!target.closest('.swiper') &&
        !target.closest('[data-allow-scroll]') &&
        !target.closest('.allow-scroll') &&
        !target.closest('.MuiDrawer-paper') &&
        !target.closest('.MuiDialog-paper')) {
        e.preventDefault();
      }
    };

    // ✅ FIX: Global mouseup to release stuck drag state on nested swipers
    // This handles the case where cursor leaves the "phone" container
    const handleGlobalMouseUp = () => {
      // Force horizontal swiper to recognize mouse release
      if (horizontalSwiperRef.current) {
        const swiper = horizontalSwiperRef.current as any;
        // Always try to release - check various internal states
        if (swiper.touches?.diff || swiper.animating === false) {

          swiper.slideTo(swiper.activeIndex, 300);
        }
      }
      // Also release vertical swiper
      if (verticalSwiperRef.current) {
        const swiper = verticalSwiperRef.current as any;
        if (swiper.touches?.diff || swiper.animating === false) {

          swiper.slideTo(swiper.activeIndex, 300);
        }
      }
    };

    // ✅ FIX: Prevent native image/video drag behavior
    const preventDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.tagName === 'VIDEO' || target.closest('.swiper')) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('touchmove', preventDefaultScroll, { passive: false });
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('dragstart', preventDragStart);

    return () => {
      // Remover clase al desmontar
      document.documentElement.classList.remove('reels-mode');
      document.body.classList.remove('reels-mode');
      document.removeEventListener('touchmove', preventDefaultScroll);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('dragstart', preventDragStart);

      // Restaurar scroll position
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    if (currentSection?.id) {
      setCurrentSection(currentSection.id);
    }
  }, [currentSection?.id, setCurrentSection]);

  useEffect(() => {

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

      return;
    }

    const current = currentSectionIndexRef.current;

    if (newIndex === current ||
      newIndex < 0 ||
      newIndex >= (reelConfig?.sections?.length || 0)) {

      return;
    }



    lastUpdateRef.current = now;
    isClickNavigationRef.current = true;

    setCurrentSectionIndex(newIndex);
    setCurrentDishIndex(0);

    const section = reelConfig?.sections?.[newIndex];
    if (section) {
      setCurrentSection(section.id);
    }

    if (horizontalSwiperRef.current) {
      horizontalSwiperRef.current.slideTo(newIndex, UI_CONFIG.SWIPER_SPEED, false);


      setTimeout(() => {
        isClickNavigationRef.current = false;
      }, UI_CONFIG.SWIPER_SPEED + 100);
    }
  }, [reelConfig?.sections, setCurrentSection]);

  const handleDishChange = useCallback((newIndex: number, sectionIndex: number, swiperInstance?: SwiperType) => {
    if (sectionIndex !== currentSectionIndex) return;

    const prevIndex = currentDishIndexRef.current;
    const maxIndex = currentDishes.length - 1;

    // ✅ Force single-slide movement: clamp to ±1 from previous
    let targetIndex = newIndex;
    if (newIndex > prevIndex + 1) {
      targetIndex = Math.min(prevIndex + 1, maxIndex);
    } else if (newIndex < prevIndex - 1) {
      targetIndex = Math.max(prevIndex - 1, 0);
    }

    // Validate bounds
    if (targetIndex < 0 || targetIndex > maxIndex || targetIndex === prevIndex) {
      // If we need to correct position, do it
      if (swiperInstance && targetIndex !== newIndex) {
        swiperInstance.slideTo(targetIndex, 400, false);
      }
      return;
    }



    // Correct swiper position if needed
    if (swiperInstance && targetIndex !== newIndex) {
      swiperInstance.slideTo(targetIndex, 400, false);
    }

    currentDishIndexRef.current = targetIndex;
    setCurrentDishIndex(targetIndex);
  }, [currentDishes.length, currentSectionIndex]);

  const toggleMuted = useCallback(() => {
    setMuted(prev => !prev);
  }, []);

  const handleLanguageChange = useCallback((languageCode: string) => {

    setCurrentLanguage(languageCode);
  }, [currentLanguage]);

  // ======================================================================
  // SWIPER CONFIG
  // ======================================================================

  const swiperConfigs = useMemo(() => ({
    vertical: {
      modules: [Virtual, Mousewheel],
      direction: 'vertical' as const,
      slidesPerView: 1,
      slidesPerGroup: 1,          // ✅ Only move 1 slide per gesture
      spaceBetween: 0,
      touchRatio: UI_CONFIG.TOUCH_RATIO,
      threshold: UI_CONFIG.THRESHOLD,
      shortSwipes: UI_CONFIG.SHORT_SWIPES,
      longSwipes: UI_CONFIG.LONG_SWIPES,
      longSwipesRatio: UI_CONFIG.LONG_SWIPES_RATIO,
      followFinger: UI_CONFIG.FOLLOW_FINGER,
      touchReleaseOnEdges: false, // ✅ Don't release to parent scroll
      touchEventsTarget: 'container' as const, // ✅ Capture touch on container
      edgeSwipeDetection: true,   // ✅ Better edge detection
      edgeSwipeThreshold: 50,
      touchStartPreventDefault: false, // ✅ Allow some native behavior
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
      preventInteractionOnTransition: false, // ✅ Allow queueing swipes during animation for fluid feel
      mousewheel: {               // ✅ Mouse/trackpad wheel control
        forceToAxis: true,
        sensitivity: 1,           // ✅ Standard sensitivity
        thresholdDelta: 50,       // ✅ Standard threshold
        thresholdTime: 300,       // ✅ Standard debounce
        releaseOnEdges: false     // ✅ Don't release to page scroll
      },
      lazy: {
        enabled: true,
        loadPrevNext: true,
        loadPrevNextAmount: 1,
        loadOnTransitionStart: true
      }
    },
    horizontal: {
      modules: [Virtual, Mousewheel],  // ✅ Restored Virtual for performance
      direction: 'horizontal' as const,
      slidesPerView: 1,
      slidesPerGroup: 1,              // ✅ Only 1 section per swipe
      spaceBetween: 0,
      // ✅ VERY EASY horizontal swipe - matching vertical sensitivity
      touchRatio: 1.5,                // ✅ HIGH: amplifies finger movement 
      threshold: 3,                   // ✅ VERY LOW: starts responding immediately
      shortSwipes: true,              // ✅ Enable short/quick swipes
      longSwipes: false,              // ✅ Disabled to prevent multi-section jumps
      longSwipesRatio: 0.15,          // ✅ Safety margin
      longSwipesMs: 150,              // ✅ Short window
      followFinger: true,
      touchReleaseOnEdges: false,
      touchEventsTarget: 'container' as const,
      edgeSwipeDetection: true,
      edgeSwipeThreshold: 20,         // ✅ Very easy edge starts
      touchStartPreventDefault: false,
      freeMode: false,
      watchSlidesProgress: true,
      virtual: {
        enabled: true,
        cache: true
      },
      speed: 350,                     // ✅ Fast, snappy transition
      allowTouchMove: true,
      simulateTouch: true,            // ✅ Desktop mouse drag
      grabCursor: true,               // ✅ Show grab cursor on desktop
      resistance: true,
      resistanceRatio: 0.5,           // ✅ LOW: minimal resistance = very easy swipe
      cssMode: false,
      centeredSlides: true,
      preventInteractionOnTransition: true,
      mousewheel: {
        forceToAxis: true,
        sensitivity: 1,               // ✅ Full sensitivity for wheel
        thresholdDelta: 30,           // ✅ Low threshold
        thresholdTime: 200,           // ✅ Quick response
        releaseOnEdges: false
      },
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
    return <Box sx={{ height: '100svh', bgcolor: '#000' }} />;
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

  const { DishCard, SectionBar, Header, ListView, DishDetailModal } = templateComponents;

  // ✅ Desktop Background & Pattern
  // Log branding to debug color issues


  // ✅ FIX: Use primary color as background as requested by user
  const brandColor = reelConfig.restaurant?.branding?.primaryColor || (reelConfig.restaurant?.branding as any)?.primary_color || '#000000';

  return (
    // ✅ Outer Container: Desktop Background
    <Box
      sx={{
        width: '100vw',
        height: '100svh',
        background: `linear-gradient(135deg, ${brandColor} 0%, #000000 100%)`, // ✅ Gradient from primary to black
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* ✅ Inner Container: Full Width Responsive */}
      <Box
        sx={{
          height: '100%',
          width: '100%',
          position: 'relative',
          background: 'transparent', // ✅ Transparent to show gradient
          borderRadius: 0,
          overflow: 'hidden',
          overscrollBehavior: 'none', // ✅ Prevent overscroll bounce
          touchAction: 'none', // ✅ Prevent native scroll - let Swiper handle it
          userSelect: 'none',
          WebkitUserSelect: 'none',
          // ✅ FIX: Prevent native browser image drag
          WebkitUserDrag: 'none',
          userDrag: 'none',
          // ✅ FIX: Apply to all images inside
          '& img': {
            WebkitUserDrag: 'none',
            userDrag: 'none',
            pointerEvents: 'none', // Images don't capture pointer - parent swiper does
            draggable: 'false'
          },
          '& video': {
            WebkitUserDrag: 'none',
            userDrag: 'none',
            pointerEvents: 'none'
          },
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          zIndex: 1 // ✅ Ensure it's above the pattern
        }}
      >
        <TranslationProvider translations={reelConfig?.translations}>
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
            hidden={isDishExpanded}
            rightIcons={
              <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
                <SocialMenu
                  restaurant={reelConfig.restaurant}
                  onOpenOffer={handleOpenOffer}
                  hasCampaign={!!marketingCampaign}
                  reservationsEnabled={reelConfig?.reservationsEnabled}
                  onOpenReservation={handleOpenReservation}
                  deliveryEnabled={deliveryEnabled}
                  onOpenDelivery={handleOpenDelivery}
                  previousRating={(reelConfig as any)?.userStatus?.previousRating}
                />
              </Box>
            }
          />

          {/* ✅ Floating SocialMenu for Mobile (Expandable Horizontal on Left) */}
          <Box
            sx={{
              position: 'absolute',
              top: 85, // Below header
              left: { xs: 12, sm: 16 },
              zIndex: 50,
              display: { xs: 'flex', md: 'none' },
              opacity: isDishExpanded ? 0 : 1,
              visibility: isDishExpanded ? 'hidden' : 'visible',
              pointerEvents: isDishExpanded ? 'none' : 'auto',
              transition: 'all 0.3s ease-in-out'
            }}
          >
            <MobileSocialMenu>
              <SocialMenu
                restaurant={reelConfig.restaurant}
                onOpenOffer={handleOpenOffer}
                hasCampaign={!!marketingCampaign}
                reservationsEnabled={reelConfig?.reservationsEnabled}
                onOpenReservation={handleOpenReservation}
                deliveryEnabled={deliveryEnabled}
                onOpenDelivery={handleOpenDelivery}
                previousRating={(reelConfig as any)?.userStatus?.previousRating}
              />
            </MobileSocialMenu>
          </Box>

          {/* ✅ Delivery Modal */}
          <DeliveryModal
            open={deliveryModalOpen}
            onClose={() => setDeliveryModalOpen(false)}
            cartItems={cart.map(item => ({
              id: item.dishId,
              name: item.name,
              quantity: item.quantity,
              price: item.price
            }))}
            cartTotal={getTotalPrice()}
            deliveryConfig={deliveryConfig}
            restaurantName={reelConfig.restaurant?.name || ''}
            restaurantId={reelConfig.restaurant?.id}
            currentLanguage={currentLanguage}
            isAvailable={deliveryConfig?.is_enabled}
          />

          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            colors={{
              secondary: reelConfig.restaurant?.branding?.secondaryColor || '#4ECDC4',
              accent: reelConfig.restaurant?.branding?.accent_color || reelConfig.restaurant?.branding?.accentColor
            }}
            hidden={isDishExpanded}
          />

          <WelcomeModal
            open={welcomeModalOpen}
            onClose={() => setWelcomeModalOpen(false)}
            restaurant={reelConfig.restaurant}
            campaign={marketingCampaign}
          />

          {viewMode === 'reels' && (
            <Box
              sx={{
                position: 'fixed',
                left: { xs: 12, sm: 16 },
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 15,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.8,
                // ✅ Hide when dish content is expanded
                opacity: isDishExpanded ? 0 : 1,
                visibility: isDishExpanded ? 'hidden' : 'visible',
                pointerEvents: isDishExpanded ? 'none' : 'auto',
                transition: 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out'
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
                      ? reelConfig.restaurant?.branding?.accent_color || reelConfig.restaurant?.branding?.accentColor || '#FFC100'
                      : 'rgba(255,255,255,0.4)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: index === currentDishIndex
                      ? `0 0 8px ${reelConfig.restaurant?.branding?.accent_color || reelConfig.restaurant?.branding?.accentColor || '#FFC100'}40`
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
          )}



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
                {t('cart_title', 'Mi Carrito')}
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
                  <Typography sx={{ fontFamily: '"Fraunces", serif' }}>{t('cart_empty', 'Tu carrito está vacío')}</Typography>
                </Box>
              ) : (
                cart.map((item) => (
                  <React.Fragment key={`${item.dishId}_${item.portion}`}>
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
                        {item.image ? (
                          <Box
                            component="img"
                            src={item.image}
                            alt={item.name}
                            sx={{
                              width: 80,
                              height: 80,
                              minWidth: 80,
                              objectFit: 'cover',
                              borderRadius: 2,
                              display: 'block'
                            }}
                          />
                        ) : item.videoUrl ? (
                          <Box
                            sx={{
                              width: 80,
                              height: 80,
                              minWidth: 80,
                              borderRadius: 2,
                              overflow: 'hidden'
                            }}
                          >
                            <Box
                              component="video"
                              src={`${item.videoUrl}#t=0.1`}
                              preload="metadata"
                              muted
                              playsInline
                              sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block'
                              }}
                            />
                          </Box>
                        ) : null}

                        <Box sx={{ flexGrow: 1 }}>
                          <Typography sx={{ color: '#fff', fontWeight: 600, mb: 0.5, fontFamily: '"Fraunces", serif' }}>
                            {item.name}
                          </Typography>
                          <Typography sx={{ color: reelConfig.restaurant?.branding?.primary_color || reelConfig.restaurant?.branding?.primaryColor || '#FF6B6B', fontWeight: 700, fontSize: '1.1rem', fontFamily: '"Fraunces", serif' }}>
                            €{item.price.toFixed(2)}
                          </Typography>
                        </Box>

                        <IconButton
                          onClick={() => removeFromCart(item.dishId, item.portion)}
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
                            onClick={() => updateCartItemQuantity(item.dishId, item.quantity - 1, item.portion)}
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
                            onClick={() => updateCartItemQuantity(item.dishId, item.quantity + 1, item.portion)}
                            sx={{
                              bgcolor: reelConfig.restaurant?.branding?.secondary_color || reelConfig.restaurant?.branding?.secondaryColor || '#4ECDC4',
                              color: '#fff',
                              width: 32,
                              height: 32,
                              '&:hover': { bgcolor: reelConfig.restaurant?.branding?.secondary_color || reelConfig.restaurant?.branding?.secondaryColor || '#4ECDC4', opacity: 0.8 }
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
                    {t('cart_total', 'Total:')}
                  </Typography>
                  <Typography variant="h4" sx={{ color: reelConfig.restaurant?.branding?.primary_color || reelConfig.restaurant?.branding?.primaryColor || '#FF6B6B', fontWeight: 700, fontFamily: '"Fraunces", serif' }}>
                    €{getTotalPrice().toFixed(2)}
                  </Typography>
                </Box>

                <Alert
                  icon={<Restaurant />}
                  severity="info"
                  sx={{
                    bgcolor: `${reelConfig.restaurant?.branding?.secondary_color || reelConfig.restaurant?.branding?.secondaryColor || '#4ECDC4'}20`,
                    color: '#fff',
                    border: `1px solid ${reelConfig.restaurant?.branding?.secondary_color || reelConfig.restaurant?.branding?.secondaryColor || '#4ECDC4'}40`,
                    borderRadius: 2,
                    mb: 2,
                    '& .MuiAlert-icon': {
                      color: reelConfig.restaurant?.branding?.secondary_color || reelConfig.restaurant?.branding?.secondaryColor || '#4ECDC4'
                    },
                    fontFamily: '"Fraunces", serif'
                  }}
                >
                  <Typography sx={{ fontWeight: 500, fontSize: '0.9rem', fontFamily: '"Fraunces", serif' }}>
                    {t('cart_msg_staff', 'Para completar tu pedido, consulta con el personal de sala')}
                  </Typography>
                </Alert>


              </Box>
            )}
          </Drawer>



          {viewMode === 'reels' ? (
            <Box
              sx={{
                position: 'absolute',
                top: 0,                // ✅ Extend behind header for blur effect
                left: 0,
                right: 0,
                bottom: '90px',        // Above section bar
                width: '100%',
                overflow: 'hidden',    // Prevent any overflow issues
                touchAction: 'none',   // ✅ Prevent native scroll
                overscrollBehavior: 'contain' // ✅ Contain overscroll
              }}
            >
              {/* ✅ HORIZONTAL SWIPER CON onSwiper */}
              <Swiper
                {...swiperConfigs.horizontal}
                onSwiper={(swiper) => {
                  horizontalSwiperRef.current = swiper;
                }}
                initialSlide={currentSectionIndex}
                onSlideChangeTransitionStart={() => {
                  isHorizontalTransitioningRef.current = true;
                }}
                onSlideChangeTransitionEnd={() => {
                  isHorizontalTransitioningRef.current = false;
                }}
                onSlideChange={(swiper) => {
                  // Skip if triggered by click navigation (handled separately)
                  if (isClickNavigationRef.current) {

                    return;
                  }

                  const newIndex = swiper.activeIndex;
                  const prevIndex = currentSectionIndexRef.current;

                  // No change, skip
                  if (newIndex === prevIndex) {
                    return;
                  }

                  // ✅ Get the actual dish index from the vertical swiper of the new section
                  const verticalSwiper = verticalSwiperRefs.current[newIndex];
                  const actualDishIndex = verticalSwiper?.activeIndex ?? 0;

                  // ✅ Update state with the ACTUAL position, not always 0
                  currentSectionIndexRef.current = newIndex;
                  currentDishIndexRef.current = actualDishIndex;
                  setCurrentSectionIndex(newIndex);
                  setCurrentDishIndex(actualDishIndex);

                  const section = reelConfig?.sections?.[newIndex];
                  if (section) {
                    setCurrentSection(section.id);
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
                      }}
                      initialSlide={sectionIdx === initialSectionIndex ? initialDishIndex : 0}
                      onSlideChangeTransitionStart={() => {
                        isVerticalTransitioningRef.current = true;
                      }}
                      onSlideChangeTransitionEnd={() => {
                        isVerticalTransitioningRef.current = false;
                      }}
                      onSlideChange={(swiper) => {
                        handleDishChange(swiper.activeIndex, sectionIdx, swiper);
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
                            onExpandChange={setIsDishExpanded}
                          />
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  </SwiperSlide>
                ))}
              </Swiper>
            </Box>
          ) : (
            <ListView
              sections={reelConfig?.sections || []}
              config={reelConfig}
              currentLanguage={currentLanguage}
              onAddToCart={addToCart}
              cart={cart}
              activeSectionId={currentSection?.id}
              onActiveSectionChange={handleSectionChange}
              onOpenCart={handleOpenCartDrawer}
              onDishClick={(dish) => {
                setSelectedDish(dish);
                setIsDetailOpen(true);
              }}
            />
          )}

          {/* Dish Detail Modal */}
          {viewMode === 'list' && (
            <DishDetailModal
              dish={selectedDish}
              isOpen={isDetailOpen}
              onClose={() => setIsDetailOpen(false)}
              currentLanguage={currentLanguage}
              colors={{
                primary: reelConfig.restaurant?.branding?.primaryColor || '#FF6B6B',
                secondary: reelConfig.restaurant?.branding?.secondaryColor || '#4ECDC4',
                accent: reelConfig.restaurant?.branding?.accent_color || reelConfig.restaurant?.branding?.accentColor || '#FF8C42',
                text: reelConfig.restaurant?.branding?.textColor || '#FFFFFF',
                background: reelConfig.restaurant?.branding?.backgroundColor || '#fff'
              }}
              onAddToCart={addToCart}
            />
          )}

          {viewMode === 'reels' && (
            <SectionBar
              sections={reelConfig?.sections || []}
              currentSectionIndex={currentSectionIndex}
              currentDishIndex={currentDishIndex}
              totalDishesInSection={currentDishes.length}
              onSectionChange={handleSectionChange}
              config={reelConfig}
              currentLanguage={currentLanguage}
            />
          )}

          {/* Scratch & Win Floating Launcher */}
          {scratchWinCampaign && (
            <FloatingLauncher
              campaign={scratchWinCampaign}
              restaurantSlug={reelConfig?.restaurant?.slug}
            />
          )}
        </TranslationProvider>
      </Box >
    </Box >
  );
});

ReelsContainer.displayName = 'ReelsContainer';

export default ReelsContainer;
