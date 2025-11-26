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

  // ======================================================================
  // TRACKING
  // ======================================================================
  
  const { setCurrentSection } = useDishTracking();

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
              mt: 0.5
            }}
          >
            +{currentDishes.length - 12}
          </Typography>
        )}
      </Box>

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
