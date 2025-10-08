// apps/client/src/components/reels/SectionsNav.tsx - SIN IMPORTAR Section
import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, Paper, alpha, useTheme, IconButton } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

// ✅ DEFINIR SECTION LOCALMENTE (en lugar de importarla)
interface Section {
  id: string;
  name: string;
  translations?: {
    name?: {
      [key: string]: string;
    };
  };
}

// Iconos (importar si no están ya en tu proyecto)
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

interface SectionsNavProps {
  sections: Section[];
  currentSectionIndex: number;
  currentDishIndex: number;
  totalDishesInSection: number;
  onSectionChange: (index: number) => void;
  languageCode: string;
  primaryColor: string;
  secondaryColor: string;
}

export default function SectionsNav({ 
  sections = [], 
  currentSectionIndex = 0,
  currentDishIndex = 0,
  totalDishesInSection = 0,
  onSectionChange,
  languageCode = 'es',
  primaryColor,
  secondaryColor
}: SectionsNavProps) {
  const theme = useTheme();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  // Fonts para aspecto premium
  const fontTitle = "'Playfair Display', 'Georgia', serif";
  const fontBase = "'Montserrat', 'Inter', -apple-system, sans-serif";
  
  // Verificar si es necesario mostrar botones de scroll
  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        
        // Mostrar botones solo si hay overflow
        const hasOverflow = container.scrollWidth > container.clientWidth;
        setShowScrollButtons(hasOverflow);
        
        // Verificar si podemos hacer scroll en cada dirección
        setCanScrollLeft(container.scrollLeft > 0);
        setCanScrollRight(
          container.scrollLeft < container.scrollWidth - container.clientWidth
        );
      }
    };
    
    checkScroll();
    
    // Recheck cuando cambia el tamaño de la ventana
    window.addEventListener('resize', checkScroll);
    
    // Recheck cuando se hace scroll
    if (scrollContainerRef.current) {
      scrollContainerRef.current.addEventListener('scroll', checkScroll);
    }
    
    return () => {
      window.removeEventListener('resize', checkScroll);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.removeEventListener('scroll', checkScroll);
      }
    };
  }, [sections]);
  
  // Scroll al elemento activo cuando cambia la sección
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeItem = container.querySelector(`[data-section-index="${currentSectionIndex}"]`);
      
      if (activeItem) {
        const containerWidth = container.offsetWidth;
        const itemWidth = (activeItem as HTMLElement).offsetWidth;
        const itemLeft = (activeItem as HTMLElement).offsetLeft;
        
        // Centrar el elemento en el scroll
        container.scrollTo({
          left: itemLeft - (containerWidth / 2) + (itemWidth / 2),
          behavior: 'smooth'
        });
      }
    }
  }, [currentSectionIndex]);
  
  // Traducir nombre de la sección
  const getSectionName = (section: Section) => {
    return section.translations?.name?.[languageCode] || 
           section.translations?.name?.es || 
           section.name ||
           'Sin nombre';
  };
  
  // Funciones para scroll manual
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -200,
        behavior: 'smooth'
      });
    }
  };
  
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 200,
        behavior: 'smooth'
      });
    }
  };
  
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ 
        type: 'spring', 
        damping: 30, 
        stiffness: 200, 
        delay: 0.2 
      }}
    >
      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: `linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 70%, rgba(0,0,0,0.6) 100%)`,
          backdropFilter: 'blur(15px)',
          WebkitBackdropFilter: 'blur(15px)',
          borderTop: `1px solid ${alpha('#ffffff', 0.08)}`,
          borderTopLeftRadius: '26px',
          borderTopRightRadius: '26px',
          pb: 2,
          overflow: 'hidden',
          boxShadow: '0 -10px 20px rgba(0,0,0,0.15)'
        }}
        className="premium-sections-nav"
      >
        {/* Línea indicadora en la parte superior */}
        <Box sx={{ 
          width: '40px', 
          height: '4px', 
          bgcolor: alpha('#ffffff', 0.2),
          borderRadius: '2px',
          mx: 'auto',
          mt: 1,
          mb: 2
        }}/>
        
        {/* Contenedor de secciones con botones de scroll */}
        <Box sx={{ position: 'relative', px: 1 }}>
          {/* Botón de scroll izquierdo */}
          <AnimatePresence>
            {showScrollButtons && canScrollLeft && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 5
                }}
              >
                <IconButton
                  onClick={scrollLeft}
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.common.black, 0.7),
                    color: 'white',
                    backdropFilter: 'blur(5px)',
                    WebkitBackdropFilter: 'blur(5px)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.common.black, 0.9),
                    },
                    width: 32,
                    height: 32,
                    ml: 0.5,
                    border: `1px solid ${alpha('#ffffff', 0.1)}`
                  }}
                >
                  <KeyboardArrowLeftIcon fontSize="small" />
                </IconButton>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Contenedor de secciones con scroll */}
          <Box
            ref={scrollContainerRef}
            sx={{
              display: 'flex',
              overflowX: 'auto',
              scrollbarWidth: 'none', // Firefox
              '&::-webkit-scrollbar': { display: 'none' }, // Chrome
              px: 2,
              py: 1.5,
              scrollBehavior: 'smooth',
              // Desvanecimiento en los bordes
              maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
            }}
          >
            {sections.map((section, index) => {
              const isActive = currentSectionIndex === index;
              
              return (
                <motion.div
                  key={section.id}
                  data-section-index={index}
                  onClick={() => onSectionChange(index)}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    padding: '8px 16px',
                    margin: '0 4px',
                    borderRadius: '14px',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    minWidth: 'auto',
                    background: isActive 
                      ? primaryColor 
                      : 'rgba(255,255,255,0.05)',
                    color: isActive 
                      ? '#ffffff' 
                      : alpha('#ffffff', 0.7),
                    transition: 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: isActive 
                      ? `1px solid ${alpha(primaryColor, 0.6)}` 
                      : `1px solid ${alpha('#ffffff', 0.08)}`,
                    boxShadow: isActive 
                      ? `0 4px 12px ${alpha(primaryColor, 0.4)}` 
                      : 'none',
                  }}
                  animate={{
                    y: isActive ? -2 : 0,
                    scale: isActive ? 1.02 : 1,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 30
                  }}
                >
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: isActive ? 600 : 400,
                      fontSize: '0.9rem',
                      letterSpacing: '0.3px',
                      fontFamily: fontBase,
                      transition: 'all 0.2s ease',
                      textShadow: isActive ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
                    }}
                  >
                    {getSectionName(section)}
                  </Typography>
                </motion.div>
              );
            })}
          </Box>
          
          {/* Botón de scroll derecho */}
          <AnimatePresence>
            {showScrollButtons && canScrollRight && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 5
                }}
              >
                <IconButton
                  onClick={scrollRight}
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.common.black, 0.7),
                    color: 'white',
                    backdropFilter: 'blur(5px)',
                    WebkitBackdropFilter: 'blur(5px)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.common.black, 0.9),
                    },
                    width: 32,
                    height: 32,
                    mr: 0.5,
                    border: `1px solid ${alpha('#ffffff', 0.1)}`
                  }}
                >
                  <KeyboardArrowRightIcon fontSize="small" />
                </IconButton>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
        
        {/* Indicador de plato actual con diseño premium */}
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            mt: 0.5,
            mb: 1
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
          >
            <Box 
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                px: 1.5,
                py: 0.5,
                borderRadius: 10,
                backgroundColor: alpha(secondaryColor || '#333', 0.3),
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: `1px solid ${alpha(secondaryColor || '#ffffff', 0.2)}`,
                boxShadow: `0 2px 6px ${alpha(secondaryColor || '#000', 0.2)}`
              }}
            >
              <Typography 
                variant="caption" 
                sx={{ 
                  color: alpha('#ffffff', 0.95),
                  fontWeight: 500,
                  letterSpacing: 0.8,
                  fontFamily: fontBase,
                  fontSize: '0.7rem',
                  textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }}
              >
                {currentDishIndex + 1} / {totalDishesInSection}
              </Typography>
            </Box>
          </motion.div>
        </Box>
        
        {/* Indicadores visuales de platos como puntos */}
        {totalDishesInSection > 1 && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            gap: 0.5,
            mb: 0.5
          }}>
            {Array.from({ length: totalDishesInSection }).map((_, index) => (
              <Box
                key={index}
                sx={{
                  width: index === currentDishIndex ? '18px' : '6px',
                  height: '6px',
                  borderRadius: index === currentDishIndex ? '4px' : '50%',
                  backgroundColor: index === currentDishIndex 
                    ? primaryColor 
                    : alpha('#ffffff', 0.3),
                  transition: 'all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)',
                  boxShadow: index === currentDishIndex 
                    ? `0 0 8px ${alpha(primaryColor, 0.6)}` 
                    : 'none'
                }}
              />
            ))}
          </Box>
        )}
      </Paper>
    </motion.div>
  );
}
