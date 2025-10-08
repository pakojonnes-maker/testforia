// apps/client/src/components/reels/ReelsContainer.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Keyboard, Virtual } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { AnimatePresence } from 'framer-motion';

import { TemplateFactory } from './templates/TemplateFactory';
import { useReelsConfig } from '../../hooks/useReelsConfig';
import { useDishTracking } from '../../providers/TrackingAndPushProvider';

import 'swiper/css';
import 'swiper/css/virtual';

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

const ReelsContainer: React.FC<ReelsContainerProps> = ({
  restaurantData,
  initialSectionIndex = 0,
  initialDishIndex = 0,
  onClose
}) => {
  // Cargar configuración del template
  const { config: reelConfig, isLoading: configLoading, error: configError } = useReelsConfig(
    restaurantData.restaurant.slug
  );

  // Estados principales
  const [currentSectionIndex, setCurrentSectionIndex] = useState(initialSectionIndex);
  const [currentDishIndex, setCurrentDishIndex] = useState(initialDishIndex);
  const [showUI, setShowUI] = useState(true);
  const [muted, setMuted] = useState(true);

  // Referencias
  const verticalSwiperRef = useRef<SwiperType | null>(null);
  const horizontalSwiperRef = useRef<SwiperType | null>(null);
  const uiTimerRef = useRef<NodeJS.Timeout>();

  // Tracking
  const { setCurrentSection } = useDishTracking();

  // Datos actuales
  const currentSection = restaurantData.sections[currentSectionIndex];
  const currentDishes = restaurantData.dishesBySection[currentSectionIndex]?.dishes || [];

  // Auto-hide UI
  const autoHideDelay = reelConfig?.config?.auto_hide_delay || 3000;
  const autoHideEnabled = reelConfig?.config?.auto_hide_ui !== false;

  const resetUITimer = useCallback(() => {
    if (!autoHideEnabled) {
      setShowUI(true);
      return;
    }

    setShowUI(true);
    if (uiTimerRef.current) {
      clearTimeout(uiTimerRef.current);
    }
    uiTimerRef.current = setTimeout(() => {
      setShowUI(false);
    }, autoHideDelay);
  }, [autoHideDelay, autoHideEnabled]);

  // Handlers
  const handleSectionChange = useCallback((newIndex: number) => {
    if (newIndex !== currentSectionIndex && newIndex >= 0 && newIndex < restaurantData.sections.length) {
      setCurrentSectionIndex(newIndex);
      setCurrentDishIndex(0);

      const section = restaurantData.sections[newIndex];
      if (section) {
        setCurrentSection(section.id);
      }

      if (verticalSwiperRef.current) {
        verticalSwiperRef.current.slideTo(0, 300);
      }

      resetUITimer();
    }
  }, [currentSectionIndex, restaurantData.sections, setCurrentSection, resetUITimer]);

  const handleDishChange = useCallback((newIndex: number) => {
    if (newIndex !== currentDishIndex && newIndex >= 0 && newIndex < currentDishes.length) {
      setCurrentDishIndex(newIndex);
      resetUITimer();
    }
  }, [currentDishIndex, currentDishes.length, resetUITimer]);

  const handleInteraction = useCallback(() => {
    resetUITimer();
  }, [resetUITimer]);

  const toggleMuted = useCallback(() => {
    setMuted(prev => !prev);
    handleInteraction();
  }, [handleInteraction]);

  // Inicialización
  useEffect(() => {
    resetUITimer();
    if (currentSection) {
      setCurrentSection(currentSection.id);
    }

    return () => {
      if (uiTimerRef.current) {
        clearTimeout(uiTimerRef.current);
      }
    };
  }, [currentSection, setCurrentSection, resetUITimer]);

  // Swiper configs
  const verticalSwiperConfig = useMemo(() => ({
    modules: [Mousewheel, Keyboard, Virtual],
    direction: 'vertical' as const,
    slidesPerView: 1,
    spaceBetween: 0,
    mousewheel: {
      enabled: true,
      forceToAxis: true,
      sensitivity: 1,
      releaseOnEdges: true
    },
    keyboard: {
      enabled: true,
      onlyInViewport: true
    },
    virtual: {
      enabled: true,
      addSlidesBefore: 1,
      addSlidesAfter: 1
    },
    speed: 300,
    allowTouchMove: true,
    simulateTouch: true,
    resistance: true,
    resistanceRatio: 0.85
  }), []);

  const horizontalSwiperConfig = useMemo(() => ({
    modules: [Virtual],
    direction: 'horizontal' as const,
    slidesPerView: 1,
    spaceBetween: 0,
    virtual: { enabled: true },
    speed: 300,
    allowTouchMove: true,
    simulateTouch: true,
    resistance: true,
    resistanceRatio: 0.85
  }), []);

  // Loading state
  if (configLoading || !reelConfig) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#000',
          color: 'white'
        }}
      >
        <Box textAlign="center">
          <CircularProgress sx={{ color: 'white', mb: 2 }} />
          <Typography>Cargando experiencia gastronómica...</Typography>
        </Box>
      </Box>
    );
  }

  // Error state
  if (configError) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#000',
          color: 'white',
          p: 4
        }}
      >
        <Typography>Error al cargar la configuración del menú</Typography>
      </Box>
    );
  }

  if (!currentDishes.length) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#000',
          color: 'white'
        }}
      >
        <Typography>No hay platos disponibles</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        position: 'relative',
        bgcolor: reelConfig.colors.background,
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
      onTouchStart={handleInteraction}
      onClick={handleInteraction}
    >
      {/* Template Factory - Renderiza el template correcto */}
      <TemplateFactory
        template={reelConfig.template.id}
        config={reelConfig}
        showUI={showUI}
        onClose={onClose}
      >
        {/* Swiper Horizontal - Secciones */}
        <Swiper
          {...horizontalSwiperConfig}
          ref={(swiper) => {
            if (swiper) horizontalSwiperRef.current = swiper.swiper;
          }}
          initialSlide={initialSectionIndex}
          onSlideChange={(swiper) => handleSectionChange(swiper.activeIndex)}
          style={{ height: '100vh', width: '100vw' }}
        >
          {restaurantData.sections.map((section, sectionIdx) => (
            <SwiperSlide key={section.id} virtualIndex={sectionIdx}>
              {/* Swiper Vertical - Platos */}
              <Swiper
                {...verticalSwiperConfig}
                ref={(swiper) => {
                  if (swiper && sectionIdx === currentSectionIndex) {
                    verticalSwiperRef.current = swiper.swiper;
                  }
                }}
                initialSlide={sectionIdx === initialSectionIndex ? initialDishIndex : 0}
                onSlideChange={(swiper) => {
                  if (sectionIdx === currentSectionIndex) {
                    handleDishChange(swiper.activeIndex);
                  }
                }}
                style={{ height: '100vh', width: '100vw' }}
              >
                {restaurantData.dishesBySection[sectionIdx]?.dishes?.map((dish: any, dishIdx: number) => (
                  <SwiperSlide key={dish.id} virtualIndex={dishIdx}>
                    {/* El contenido específico lo renderiza cada template */}
                    {React.createElement(
                      require(`./templates/${reelConfig.template.id.replace('tpl_', '')}/DishCard`).default,
                      {
                        dish,
                        restaurant: restaurantData.restaurant,
                        section,
                        isActive: sectionIdx === currentSectionIndex && dishIdx === currentDishIndex,
                        showUI,
                        config: reelConfig,
                        muted,
                        onMuteToggle: toggleMuted,
                        onInteraction: handleInteraction
                      }
                    )}
                  </SwiperSlide>
                ))}
              </Swiper>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Navegación de secciones (renderizado por el template) */}
        <AnimatePresence>
          {showUI && React.createElement(
            require(`./templates/${reelConfig.template.id.replace('tpl_', '')}/SectionsBar`).default,
            {
              sections: restaurantData.sections,
              currentSectionIndex,
              currentDishIndex,
              totalDishesInSection: currentDishes.length,
              onSectionChange: handleSectionChange,
              config: reelConfig
            }
          )}
        </AnimatePresence>
      </TemplateFactory>
    </Box>
  );
};

export default ReelsContainer;
