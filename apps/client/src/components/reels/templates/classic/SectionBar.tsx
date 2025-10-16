// apps/client/src/components/reels/templates/classic/SectionBar.tsx

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Restaurant } from '@mui/icons-material';

interface Section {
  id: string;
  translations: {
    name: { [key: string]: string };
  };
  bg_color?: string;
  icon_url?: string;
}

interface SectionBarProps {
  sections: Section[];
  currentSectionIndex: number;
  currentDishIndex: number;
  totalDishesInSection: number;
  onSectionChange: (index: number) => void;
  config: any;
  currentLanguage: string;
}

const SectionBar: React.FC<SectionBarProps> = ({
  sections,
  currentSectionIndex,
  currentDishIndex,
  totalDishesInSection,
  onSectionChange,
  config,
  currentLanguage
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // ✅ THEME COLORS - Siempre del config/theme
  const themeColors = useMemo(() => ({
    primary: config?.restaurant?.branding?.primaryColor || '#FF6B6B',
    secondary: config?.restaurant?.branding?.secondaryColor || '#4ECDC4',
    text: config?.restaurant?.branding?.textColor || '#FFFFFF',
    background: config?.restaurant?.branding?.backgroundColor || '#000000'
  }), [config]);

  // ✅ RESPONSIVE SIZING - Dinámico según número de secciones
  const sectionSizing = useMemo(() => {
    const sectionCount = sections.length;
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 390;
    const availableWidth = screenWidth - 32;
    const maxSectionWidth = Math.min(120, availableWidth / sectionCount - 8);
    
    return {
      minWidth: Math.max(85, maxSectionWidth),
      iconSize: {
        inactive: Math.min(44, maxSectionWidth * 0.45),
        active: Math.min(52, maxSectionWidth * 0.55)
      },
      fontSize: {
        xs: sectionCount > 5 ? '0.6rem' : '0.65rem',
        sm: sectionCount > 5 ? '0.65rem' : '0.7rem'
      }
    };
  }, [sections.length]);

  const getSectionIconUrl = useCallback((section: Section) => {
    const API_URL = import.meta.env.VITE_API_URL || "https://visualtasteworker.franciscotortosaestudios.workers.dev";
    
    if (section.icon_url) {
      return `${API_URL}/media/System/icons/${section.icon_url}`;
    }
    
    return null;
  }, []);

  const getSectionName = useCallback((section: Section) => {
    return section.translations?.name?.[currentLanguage] || 
           section.translations?.name?.es || 
           section.translations?.name?.en || 
           'Sección';
  }, [currentLanguage]);

  const handleSectionClick = useCallback((index: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (index !== currentSectionIndex) {
      onSectionChange(index);
    }
  }, [currentSectionIndex, onSectionChange]);

  // ✅ SMOOTH SCROLL
  useEffect(() => {
    if (scrollRef.current && sections.length > 0 && currentSectionIndex < sections.length) {
      const container = scrollRef.current;
      const activeButton = container.children[currentSectionIndex] as HTMLElement;
      
      if (activeButton) {
        const containerWidth = container.offsetWidth;
        const buttonLeft = activeButton.offsetLeft;
        const buttonWidth = activeButton.offsetWidth;
        const scrollLeft = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);
        
        container.scrollTo({
          left: Math.max(0, scrollLeft),
          behavior: 'smooth'
        });
      }
    }
  }, [currentSectionIndex, sections.length]);

  // ✅ CLEAN ICON COMPONENT - Solo theme colors
  const SectionIcon: React.FC<{ section: Section; size: number; isActive: boolean }> = ({ 
    section, 
    size,
    isActive 
  }) => {
    const iconUrl = getSectionIconUrl(section);
    
    return (
      <Box
        sx={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          borderRadius: '50%',
          // ✅ CLEAN BACKGROUND - Color secundario del theme
          backgroundColor: isActive ? themeColors.secondary : 'transparent',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          // ✅ SUBTLE SHADOW
          boxShadow: isActive 
            ? `0 4px 12px ${themeColors.secondary}40`
            : '0 2px 8px rgba(0,0,0,0.2)'
        }}
      >
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={getSectionName(section)}
            style={{
              width: size * 0.9,
              height: size * 0.9,
              objectFit: 'contain',
              // ✅ THEME-BASED FILTERING
              filter: isActive 
                ? `brightness(0) saturate(100%) ${getColorFilter(themeColors.primary)}`
                : 'brightness(0) saturate(100%) invert(100%) opacity(0.7)',
              transition: 'all 0.3s ease'
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <Restaurant 
            sx={{ 
              fontSize: size * 0.9,
              color: isActive ? themeColors.primary : 'rgba(255,255,255,0.7)',
              transition: 'all 0.3s ease'
            }} 
          />
        )}
      </Box>
    );
  };

  if (!sections || sections.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: { xs: 110, sm: 100 },
        background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.75) 20%, rgba(0,0,0,0.95) 100%)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        px: { xs: 1, sm: 2 },
        borderTop: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      {/* ✅ SCROLL CONTAINER */}
      <Box
        ref={scrollRef}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: sections.length > 4 ? { xs: 0.5, sm: 1 } : { xs: 1, sm: 1.5 },
          width: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none'
          },
          px: sections.length <= 4 ? 2 : 1,
          justifyContent: sections.length <= 4 ? 'space-evenly' : 'flex-start'
        }}
      >
        {sections.map((section, index) => {
          const isActive = index === currentSectionIndex;
          const sectionName = getSectionName(section);

          return (
            <motion.div
              key={`section-${section.id}-${index}`}
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ 
                delay: index * 0.08, 
                type: 'spring', 
                stiffness: 200,
                damping: 20
              }}
              whileTap={{ scale: 0.95 }}
              style={{ flexShrink: 0 }}
            >
              <Box
                onClick={(e) => handleSectionClick(index, e)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: sectionSizing.minWidth,
                  maxWidth: sections.length > 4 ? sectionSizing.minWidth + 10 : 'none',
                  height: { xs: 85, sm: 80 },
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isActive ? 'translateY(-8px)' : 'translateY(0)',
                  '&:hover': {
                    transform: isActive 
                      ? 'translateY(-8px) scale(1.05)' 
                      : 'translateY(-4px) scale(1.02)',
                  }
                }}
              >
                {/* ✅ ICON CONTAINER */}
                <Box sx={{ mb: 1.5 }}>
                  <SectionIcon 
                    section={section} 
                    size={isActive ? sectionSizing.iconSize.active : sectionSizing.iconSize.inactive}
                    isActive={isActive}
                  />
                </Box>

                {/* ✅ SECTION NAME - Theme primary color cuando activo */}
                <Typography
                  variant="caption"
                  sx={{
                    color: isActive ? themeColors.primary : 'rgba(255,255,255,0.8)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: sectionSizing.fontSize,
                    textAlign: 'center',
                    lineHeight: 1.2,
                    maxWidth: sectionSizing.minWidth - 8,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: sectionName.length > 12 ? 'nowrap' : 'normal',
                    transition: 'all 0.3s ease',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    letterSpacing: '0.2px'
                  }}
                >
                  {sectionName}
                </Typography>

                {/* ✅ SIMPLE INDICATOR - Theme primary color */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                      style={{
                        position: 'absolute',
                        bottom: -4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: themeColors.primary,
                        boxShadow: `0 0 8px ${themeColors.primary}80`
                      }}
                    />
                  )}
                </AnimatePresence>
              </Box>
            </motion.div>
          );
        })}
      </Box>
    </Box>
  );
};

// ✅ HELPER: Convierte color hex a CSS filter para colorear SVGs
function getColorFilter(hexColor: string): string {
  // Convierte hex a RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Fórmula aproximada para generar CSS filter
  // Esta es una aproximación, puede necesitar ajustes finos
  const hue = Math.round(Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180 / Math.PI);
  const saturation = Math.round(Math.sqrt(0.3 * r * r + 0.59 * g * g + 0.11 * b * b));
  
  return `hue-rotate(${hue}deg) saturate(${Math.min(saturation, 200)}%)`;
}

export default SectionBar;
