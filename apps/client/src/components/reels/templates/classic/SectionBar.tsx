import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Restaurant, ChevronRight } from '@mui/icons-material';
import { useTranslation } from '../../../../contexts/TranslationContext';

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

  onSectionChange,
  config,

}) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  // State for scroll indicator
  const [showRightArrow, setShowRightArrow] = useState(false);

  const themeColors = useMemo(() => {
    const overrides = config?.overrides || {};
    const branding = config?.restaurant?.branding || {};
    return {
      primary: overrides.reel_primary_color || branding.primary_color || '#FF6B6B',
      secondary: overrides.reel_secondary_color || branding.secondary_color || '#4ECDC4',
      text: overrides.reel_text_color || branding.text_color || '#FFFFFF',
      background: overrides.reel_background_color || branding.background_color || '#000000',
      // Section bar specific colors - fully independent, no linked fallbacks
      sectionIconActive: overrides.reel_section_icon_active || '#4ECDC4',
      sectionIconInactive: overrides.reel_section_icon_inactive || 'rgba(255, 255, 255, 0.6)',
      sectionTextActive: overrides.reel_section_text_active || '#FFFFFF',
      sectionTextInactive: overrides.reel_section_text_inactive || 'rgba(255, 255, 255, 0.75)'
    };
  }, [config]);


  const hexToRgba = (hex: string, alpha = 1) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt("0x" + hex[1] + hex[1]);
      g = parseInt("0x" + hex[2] + hex[2]);
      b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 7) {
      r = parseInt("0x" + hex[1] + hex[2]);
      g = parseInt("0x" + hex[3] + hex[4]);
      b = parseInt("0x" + hex[5] + hex[6]);
    }
    return `rgba(${r},${g},${b},${alpha})`;
  };

  const getSectionIconUrl = useCallback((section: Section) => {
    const API_URL = import.meta.env.VITE_API_URL || "https://visualtasteworker.franciscotortosaestudios.workers.dev";
    const iconFile = section.icon_url || section.iconurl;

    if (iconFile) {
      return `${API_URL}/media/System/icons/${iconFile}`;
    }

    return null;
  }, []);

  const getSectionName = useCallback((section: Section) => {
    return section.name || t('default_section_name', 'Sección');
  }, [t]);

  const handleSectionClick = useCallback((index: number) => {
    console.log(`🔥 [SectionBar] Click en sección ${index}, actual: ${currentSectionIndex}`);

    if (index !== currentSectionIndex) {
      onSectionChange(index);
    }
  }, [currentSectionIndex, onSectionChange]);

  // Check if scrolling is needed and update arrow indicator
  const updateScrollIndicator = useCallback(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const hasMoreOnRight = container.scrollLeft + container.clientWidth < container.scrollWidth - 10;
      setShowRightArrow(hasMoreOnRight);
    }
  }, []);

  // Update scroll indicator on mount and when sections change
  useEffect(() => {
    updateScrollIndicator();
    // Add resize observer for responsive behavior
    const observer = new ResizeObserver(updateScrollIndicator);
    if (scrollRef.current) {
      observer.observe(scrollRef.current);
    }
    return () => observer.disconnect();
  }, [sections.length, updateScrollIndicator]);

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
    // Update indicator after scroll
    setTimeout(updateScrollIndicator, 400);
  }, [currentSectionIndex, sections.length, updateScrollIndicator]);

  const SectionIcon: React.FC<{ section: Section; isActive: boolean }> = ({
    section,
    isActive
  }) => {
    const iconUrl = getSectionIconUrl(section);
    const [imageError, setImageError] = React.useState(false);
    const iconSize = 24;

    return (
      <Box
        sx={{
          width: iconSize,
          height: iconSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        {iconUrl && !imageError ? (
          <Box
            sx={{
              width: iconSize,
              height: iconSize,
              backgroundColor: isActive ? themeColors.sectionIconActive : themeColors.sectionIconInactive,
              WebkitMaskImage: `url(${iconUrl})`,
              maskImage: `url(${iconUrl})`,
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              transition: 'all 0.25s ease-out'
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
              fontSize: iconSize,
              color: isActive ? themeColors.sectionIconActive : themeColors.sectionIconInactive,
              transition: 'all 0.25s ease-out'
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
        position: 'absolute', // ✅ Changed from fixed to absolute to stay within container
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: `linear-gradient(180deg, transparent 0%, ${hexToRgba(themeColors.background, 0.3)} 20%, ${hexToRgba(themeColors.background, 0.8)} 100%)`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        pb: { xs: 'env(safe-area-inset-bottom, 8px)', sm: 1 },
        pt: { xs: 1.5, sm: 1.5 }
      }}
    >
      <Box
        ref={scrollRef}
        data-allow-scroll
        className="allow-scroll"
        onScroll={updateScrollIndicator}
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          touchAction: 'pan-x',  // Allow horizontal touch scroll
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none'
          },
          px: { xs: 1, sm: 2 },
          gap: { xs: 0, sm: 0 },
          justifyContent: sections.length <= 4 ? 'space-evenly' : 'flex-start'
        }}
      >
        {sections.map((section, index) => {
          const isActive = index === currentSectionIndex;
          const sectionName = getSectionName(section);
          const shouldScroll = isActive && sectionName.length > 12;

          return (
            <React.Fragment key={`section-${section.id}-${index}`}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.04,
                  type: 'spring',
                  stiffness: 300,
                  damping: 24
                }}
                style={{
                  flex: sections.length <= 4 ? 1 : '0 0 auto',
                  display: 'flex',
                  justifyContent: 'center',
                  transform: isActive ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                <Box
                  component="button"
                  onClick={() => handleSectionClick(index)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.75,
                    minWidth: isActive ? { xs: 82, sm: 92 } : { xs: 72, sm: 80 },
                    py: 1,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    '&:active': {
                      transform: 'scale(0.96)'
                    }
                  }}
                >
                  {/* Icon Container */}
                  <motion.div
                    animate={isActive ? {
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    } : {}}
                    transition={{
                      duration: 0.6,
                      ease: "easeInOut",
                      times: [0, 0.3, 0.6, 1]
                    }}
                  >
                    <Box
                      sx={{
                        width: { xs: 48, sm: 52 },
                        height: { xs: 48, sm: 52 },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        borderRadius: '50%',
                        border: `2px solid ${isActive ? themeColors.sectionIconActive : 'rgba(255, 255, 255, 0.15)'}`,
                        background: isActive
                          ? `linear-gradient(135deg, ${themeColors.sectionIconActive}20, transparent)`
                          : 'transparent',
                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        boxShadow: isActive
                          ? `0 0 0 4px ${themeColors.sectionIconActive}10, 0 4px 12px ${themeColors.sectionIconActive}30`
                          : 'none',
                        '&:hover': {
                          transform: !isActive ? 'rotate(5deg)' : 'none',
                          borderColor: !isActive ? 'rgba(255, 255, 255, 0.3)' : themeColors.sectionIconActive
                        },
                        '&::after': isActive ? {
                          content: '""',
                          position: 'absolute',
                          inset: -8,
                          borderRadius: '50%',
                          background: `radial-gradient(circle, ${themeColors.sectionIconActive}25, transparent 70%)`,
                          zIndex: -1,
                          animation: 'pulse 2s ease-in-out infinite'
                        } : {}
                      }}
                    >
                      <motion.div
                        animate={isActive ? {
                          scale: [1, 1.15, 1]
                        } : {}}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          repeatDelay: 2,
                          ease: "easeInOut"
                        }}
                      >
                        <SectionIcon section={section} isActive={isActive} />
                      </motion.div>
                    </Box>
                  </motion.div>

                  {/* Section Name with Marquee Effect */}
                  <Box
                    sx={{
                      maxWidth: isActive ? { xs: '100px', sm: '120px' } : { xs: '68px', sm: '76px' },
                      overflow: 'hidden',
                      position: 'relative',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                  >
                    <Typography
                      component="div"
                      sx={{
                        color: isActive ? themeColors.sectionTextActive : themeColors.sectionTextInactive,
                        fontWeight: isActive ? 600 : 400,
                        fontSize: isActive
                          ? { xs: '0.75rem', sm: '0.813rem' }
                          : { xs: '0.688rem', sm: '0.75rem' },
                        lineHeight: 1.2,
                        textAlign: 'center',
                        overflow: 'hidden',
                        textOverflow: shouldScroll ? 'initial' : 'ellipsis',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        letterSpacing: '0.02em',
                        textTransform: 'capitalize',
                        textShadow: isActive
                          ? `0 1px 3px rgba(0, 0, 0, 0.3), 0 0 8px ${themeColors.sectionIconActive}40`
                          : 'none',
                        ...(shouldScroll ? {
                          animation: 'marquee 8s linear infinite',
                          paddingRight: '20px',
                          display: 'inline-block',
                          '&::after': {
                            content: `"  •  ${sectionName}"`,
                            paddingLeft: '20px'
                          }
                        } : {})
                      }}
                    >
                      {sectionName}
                    </Typography>
                  </Box>

                  {/* Active Indicator Line */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        exit={{ scaleX: 0, opacity: 0 }}
                        transition={{
                          type: 'spring',
                          stiffness: 380,
                          damping: 30
                        }}
                        style={{
                          position: 'absolute',
                          bottom: -8,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '60%',
                          height: 3,
                          borderRadius: '2px',
                          background: `linear-gradient(90deg, transparent, ${themeColors.sectionIconActive}, transparent)`,
                          boxShadow: `0 0 8px ${themeColors.sectionIconActive}80`
                        }}
                      />
                    )}
                  </AnimatePresence>
                </Box>
              </motion.div>

              {/* Divider between sections (except last) */}
              {index < sections.length - 1 && sections.length > 4 && (
                <Box
                  sx={{
                    width: '1px',
                    height: 32,
                    background: 'linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
                    margin: 'auto 0',
                    flexShrink: 0
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </Box>

      {/* Scroll Right Indicator Arrow */}
      <AnimatePresence>
        {showRightArrow && sections.length > 4 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              zIndex: 10
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                borderRadius: '50%',
                width: 28,
                height: 28,
                border: `1px solid ${themeColors.sectionIconActive}40`,
                boxShadow: `0 0 12px ${themeColors.sectionIconActive}30`
              }}
            >
              <ChevronRight
                sx={{
                  color: themeColors.sectionIconActive,
                  fontSize: 20,
                  animation: 'bounceRight 1.5s ease-in-out infinite'
                }}
              />
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global CSS animations */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 0.6;
            }
            50% {
              opacity: 1;
            }
          }

          @keyframes marquee {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }

          @keyframes bounceRight {
            0%, 100% {
              transform: translateX(0);
            }
            50% {
              transform: translateX(4px);
            }
          }
        `}
      </style>
    </Box>
  );
};

export default SectionBar;
