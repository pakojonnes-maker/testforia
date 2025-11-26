// apps/client/src/components/reels/templates/classic/SectionBar.tsx

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Restaurant } from '@mui/icons-material';

interface Section {
  id: string;
  name: string;
  description?: string;
  bg_color?: string;
  icon_url?: string;
  iconurl?: string;
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

  const themeColors = useMemo(() => ({
    primary: config?.restaurant?.branding?.primary_color || '#FF6B6B',
    secondary: config?.restaurant?.branding?.secondary_color || '#4ECDC4',
    text: config?.restaurant?.branding?.text_color || '#FFFFFF',
    background: config?.restaurant?.branding?.background_color || '#000000'
  }), [config]);

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

    const iconFile = section.icon_url || section.iconurl;

    if (iconFile) {
      return `${API_URL}/media/System/icons/${iconFile}`;
    }

    return null;
  }, []);

  const getSectionName = useCallback((section: Section) => {
    return section.name || 'Sección';
  }, []);

  const handleSectionClick = useCallback((index: number) => {
    console.log(`🔥 [SectionBar] Click en sección ${index}, actual: ${currentSectionIndex}`);

    if (index !== currentSectionIndex) {
      onSectionChange(index);
    }
  }, [currentSectionIndex, onSectionChange]);

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

  const SectionIcon: React.FC<{ section: Section; size: number; isActive: boolean }> = ({
    section,
    size,
    isActive
  }) => {
    const iconUrl = getSectionIconUrl(section);
    const [imageError, setImageError] = React.useState(false);

    return (
      <Box
        sx={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        {iconUrl && !imageError ? (
          <Box
            sx={{
              width: size * 0.6,
              height: size * 0.6,
              backgroundColor: themeColors.secondary,
              WebkitMaskImage: `url(${iconUrl})`,
              maskImage: `url(${iconUrl})`,
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              opacity: isActive ? 1 : 0.7,
              transition: 'all 0.3s ease'
            }}
          >
            <img
              src={iconUrl}
              alt={getSectionName(section)}
              style={{ display: 'none' }}
              onError={() => setImageError(true)}
            />
          </Box>
        ) : (
          <Restaurant
            sx={{
              fontSize: size * 0.6,
              color: themeColors.secondary,
              opacity: isActive ? 1 : 0.7,
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
        background: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(30px) saturate(180%)',
        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        maskImage: 'linear-gradient(0deg, black 60%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(0deg, black 60%, transparent 100%)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        px: { xs: 1, sm: 2 },
        borderTop: '1px solid rgba(255, 255, 255, 0.15)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-20px',
          left: 0,
          right: 0,
          height: '20px',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.15) 0%, transparent 100%)',
          pointerEvents: 'none'
        }
      }}
    >
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
                component="button"
                onClick={() => handleSectionClick(index)}
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
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  outline: 'none',
                  '&:hover': {
                    transform: isActive
                      ? 'translateY(-8px) scale(1.05)'
                      : 'translateY(-4px) scale(1.02)',
                  }
                }}
              >
                <Box sx={{ mb: 0.5 }}>
                  <Box
                    sx={{
                      width: isActive ? sectionSizing.iconSize.active : sectionSizing.iconSize.inactive,
                      height: isActive ? sectionSizing.iconSize.active : sectionSizing.iconSize.inactive,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      borderRadius: '50%',
                      bgcolor: isActive
                        ? 'rgba(255, 255, 255, 0.25)'
                        : 'rgba(255, 255, 255, 0.15)',
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${isActive ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.25)'}`,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isActive
                        ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                        : '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <SectionIcon
                      section={section}
                      size={isActive ? sectionSizing.iconSize.active : sectionSizing.iconSize.inactive}
                      isActive={isActive}
                    />
                  </Box>
                </Box>

                <Typography
                  variant="caption"
                  sx={{
                    color: isActive ? themeColors.secondary : 'rgba(255, 255, 255, 0.9)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: sectionSizing.fontSize,
                    textAlign: 'center',
                    lineHeight: 1.2,
                    maxWidth: sectionSizing.minWidth - 8,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: sectionName.length > 12 ? 'nowrap' : 'normal',
                    transition: 'all 0.3s ease',
                    textShadow: `
                      0 2px 4px rgba(0, 0, 0, 0.4),
                      0 4px 8px rgba(0, 0, 0, 0.3),
                      0 1px 0 rgba(0, 0, 0, 0.6)
                    `,
                    letterSpacing: '0.2px',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
                  }}
                >
                  {sectionName}
                </Typography>

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
                        backgroundColor: themeColors.secondary,
                        boxShadow: `0 0 12px ${themeColors.secondary}cc, 0 0 4px ${themeColors.secondary}`
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

export default SectionBar;
