// apps/client/src/components/reels/templates/classic/Header.tsx

import React, { useState } from 'react';
import { Box, Typography, Popover, IconButton, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import { Home, Close } from '@mui/icons-material';
import type { RestaurantConfig } from '../../../../hooks/useReelsConfig';
import { useTranslation } from '../../../../contexts/TranslationContext';

interface Language {
  code: string;
  name: string;
  native_name: string;
  flag_emoji?: string;
}

interface HeaderProps {
  restaurant: any;
  currentSection: any;
  currentDishIndex?: number;
  totalDishesInSection?: number;
  config: RestaurantConfig;
  languages?: Language[];
  currentLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  onClose?: () => void;
  showMenu?: boolean;
  hidden?: boolean; // ✅ Hide header when dish content is expanded
  rightIcons?: any;
}

// ✅ FALLBACK: Emojis si las banderas SVG fallan
const flagEmojiMap: { [key: string]: string } = {
  'es': '🇪🇸',
  'en': '🇬🇧',
  'fr': '🇫🇷',
  'de': '🇩🇪',
  'it': '🇮🇹',
  'pt': '🇵🇹',
  'ca': '🏴󠁥󠁳󠁣󠁴󠁿',
  'ko': '🇰🇷',
  'ja': '🇯🇵',
  'ar': '🇸🇦',
  'ru': '🇷🇺',
  'uk': '🇺🇦',
  'zh': '🇨🇳'
};

// ✅ Función para obtener URL de bandera desde R2
const getFlagUrl = (languageCode: string) => {
  const API_URL = import.meta.env.VITE_API_URL || "https://visualtasteworker.franciscotortosaestudios.workers.dev";

  // Map language codes (ISO 639-1) to country codes (ISO 3166-1) for available flags
  const fileMap: Record<string, string> = {
    'ar': 'ae',    // Arabic → UAE
    'ca': 'es-ct', // Catalan → Catalonia
    'en': 'gb',    // English → UK
    'ja': 'jp',    // Japanese → Japan
    'ko': 'kr',    // Korean → South Korea
    'uk': 'ua',    // Ukrainian → Ukraine
    'zh': 'cn',    // Chinese → China
  };

  const fileName = fileMap[languageCode] || languageCode.toLowerCase();
  return `${API_URL}/media/System/flags/${fileName}.svg`;
};

// ✅ COMPONENTE: Bandera desde R2 con fallback robusto
const FlagIcon: React.FC<{
  languageCode: string;
  size?: number;
  showFallback?: boolean;
}> = ({
  languageCode,
  size = 20,
  showFallback = true
}) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const flagUrl = getFlagUrl(languageCode);
    const fallbackEmoji = flagEmojiMap[languageCode] || '🌍';

    // Reset state when language changes
    React.useEffect(() => {
      setImageError(false);
      setImageLoaded(false);
    }, [languageCode]);

    if (imageError || !showFallback) {
      return (
        <Typography sx={{ fontSize: `${size}px` }}>
          {fallbackEmoji}
        </Typography>
      );
    }

    return (
      <Box
        sx={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          borderRadius: '2px',
          overflow: 'hidden'
        }}
      >
        {!imageLoaded && (
          <Typography sx={{
            fontSize: `${Math.floor(size * 0.8)}px`,
            position: 'absolute',
            zIndex: 1
          }}>
            {fallbackEmoji}
          </Typography>
        )}

        <img
          src={flagUrl}
          alt={`${languageCode} flag`}
          style={{
            width: size,
            height: size,
            objectFit: 'cover',
            borderRadius: '2px',
            display: imageLoaded ? 'block' : 'none',
            position: imageLoaded ? 'static' : 'absolute',
            zIndex: imageLoaded ? 2 : 0
          }}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      </Box>
    );
  };

const ClassicHeader: React.FC<HeaderProps> = ({
  restaurant,
  currentSection,
  config,
  languages = [],
  currentLanguage,
  onLanguageChange,
  onClose,
  showMenu = true,
  hidden = false,
  rightIcons
}) => {
  const { t } = useTranslation();
  const [languageMenuAnchor, setLanguageMenuAnchor] = useState<null | HTMLElement>(null);


  // ✅ Función auxiliar para convertir HEX a RGBA
  const hexToRgba = (hex: string, alpha = 1) => {
    let r = 0, g = 0, b = 0;
    // Manejar formato corto #RGB
    if (hex.length === 4) {
      r = parseInt("0x" + hex[1] + hex[1]);
      g = parseInt("0x" + hex[2] + hex[2]);
      b = parseInt("0x" + hex[3] + hex[3]);
    }
    // Manejar formato largo #RRGGBB
    else if (hex.length === 7) {
      r = parseInt("0x" + hex[1] + hex[2]);
      g = parseInt("0x" + hex[3] + hex[4]);
      b = parseInt("0x" + hex[5] + hex[6]);
    }
    return `rgba(${r},${g},${b},${alpha})`;
  };

  // Get reel-specific colors from overrides, with fallback to base branding/theme
  const overrides = config.overrides || {};
  const branding = config.restaurant?.branding || {};

  const colors = {
    primary: overrides.reel_primary_color || branding.primary_color || '#FF6B6B',
    secondary: overrides.reel_secondary_color || branding.secondary_color || '#4ECDC4',
    accent: overrides.reel_accent_color || branding.accent_color || branding.accentColor || '#FF8C42',
    text: overrides.reel_text_color || branding.text_color || '#FFFFFF',
    background: overrides.reel_background_color || branding.background_color || '#000000',
    // Header-specific colors
    headerTitle: overrides.reel_header_title || '#FFFFFF',
    headerSubtitle: overrides.reel_header_subtitle || overrides.reel_primary_color || branding.primary_color || '#FFC100'
  };

  const getSectionName = (section: any) => {
    return section?.translations?.name?.[currentLanguage] || section?.name || t('default_menu_name', 'Menú');
  };

  const getRestaurantName = (restaurant: any) => {
    return restaurant?.translations?.name?.[currentLanguage] || restaurant?.name || t('default_restaurant_name', 'Restaurante');
  };

  // ✅ Obtener URL del sitio web del restaurante
  const getRestaurantWebsite = () => {
    return restaurant?.website || restaurant?.website_url || config.restaurant?.website || null;
  };

  // ✅ Handler para el botón Home
  const handleHomeClick = () => {
    const websiteUrl = getRestaurantWebsite();
    if (websiteUrl) {
      const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('⚠️ [Header] No website URL found for restaurant');
    }
  };

  const handleLanguageClick = (event: React.MouseEvent<HTMLElement>) => {
    setLanguageMenuAnchor(event.currentTarget);
  };

  const handleLanguageClose = () => {
    setLanguageMenuAnchor(null);
  };

  const handleLanguageSelect = (languageCode: string) => {
    onLanguageChange(languageCode);
    handleLanguageClose();
  };



  return (
    <>
      {/* ✅ HEADER REDISEÑADO */}
      <Box
        sx={{
          position: 'absolute', // ✅ Changed from fixed to absolute to stay within container
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: { xs: `linear-gradient(180deg, ${hexToRgba(colors.background, 0.45)} 0%, ${hexToRgba(colors.background, 0.25)} 85%, transparent 100%)`, md: 'transparent' },
          backdropFilter: { xs: 'blur(20px) saturate(180%)', md: 'none' },
          WebkitBackdropFilter: { xs: 'blur(20px) saturate(180%)', md: 'none' },
          pt: { xs: 1.25, sm: 1.25 },
          pb: 1.25,
          px: { xs: 2.5, sm: 3 },
          transform: 'translateZ(0)',
          willChange: 'transform',
          minHeight: '80px',
          display: 'flex',
          alignItems: 'center',
          // ✅ Hide when dish content is expanded
          opacity: hidden ? 0 : 1,
          visibility: hidden ? 'hidden' : 'visible',
          pointerEvents: hidden ? 'none' : 'auto',
          transition: 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out'
        }}
      >
        {/* ✅ CONTENEDOR PRINCIPAL - 3 COLUMNAS */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: '100%',
            position: 'relative'
          }}
        >
          {/* ✅ COLUMNA IZQUIERDA - Iconos Home y Close */}
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start', gap: 1 }}>
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            >
              {showMenu && (
                <IconButton
                  onClick={handleHomeClick}
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.5)',
                      transform: 'scale(1.05)'
                    }
                  }}
                >
                  <Home sx={{ fontSize: 20, color: colors.accent || colors.secondary }} />
                </IconButton>
              )}
            </motion.div>
            
            {onClose && (
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
              >
                <IconButton
                  onClick={onClose}
                  sx={{
                    display: 'none',
                    width: 40,
                    height: 40,
                    bgcolor: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.5)',
                      transform: 'scale(1.05)'
                    }
                  }}
                >
                  <Close sx={{ fontSize: 20, color: '#fff' }} />
                </IconButton>
              </motion.div>
            )}
          </Box>

          {/* ✅ COLUMNA CENTRAL - Texto centrado */}
          <Box
            sx={{
              flex: 2,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 2,
              overflow: 'hidden'
            }}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              style={{ textAlign: 'center', width: '100%' }}
            >
              <Typography
                variant="h5"
                sx={{
                  color: colors.headerTitle,
                  fontWeight: 700,
                  fontSize: { xs: '1.2rem', sm: '1.5rem' },
                  lineHeight: 1.2,
                  mb: 0.5,
                  fontFamily: '"Playfair Display", "Georgia", serif',
                  letterSpacing: 0.5,
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 2px 12px rgba(0,0,0,0.6)'
                }}
              >
                {getRestaurantName(restaurant)}
              </Typography>

              {/* ✅ NOMBRE DE SECCIÓN - Color Secundario con Marquee si es largo */}
              <Box sx={{
                width: '100%',
                overflow: 'hidden',
                position: 'relative',
                height: '24px', // Fixed height for the text
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Typography
                  className="marquee-text"
                  sx={{
                    color: colors.headerSubtitle,
                    fontSize: { xs: '0.9rem', sm: '1.1rem' },
                    fontWeight: 600,
                    fontFamily: '"Fraunces", serif',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 2px 12px rgba(0,0,0,0.6)',
                    // Animation logic will be handled by CSS if content overflows
                    animation: getSectionName(currentSection).length > 20 ? 'marquee 10s linear infinite' : 'none',
                    paddingLeft: getSectionName(currentSection).length > 20 ? '100%' : 0,
                    display: 'inline-block'
                  }}
                >
                  {getSectionName(currentSection)}
                </Typography>
                <style>{`
                  @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                  }
                `}</style>
              </Box>
            </motion.div>
          </Box>

          {/* ✅ COLUMNA DERECHA - Social/Custom Icons + Language Selector */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 1,
              pr: { xs: 0.5, sm: 0 }
            }}
          >
            {rightIcons}

            {languages.length > 1 && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              >
                <IconButton
                  onClick={handleLanguageClick}
                  sx={{
                    width: 40,
                    height: 40,
                    p: 0,
                    border: `1px solid rgba(255,255,255,0.2)`,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    bgcolor: 'rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      bgcolor: 'rgba(0,0,0,0.5)'
                    }
                  }}
                >
                  <FlagIcon languageCode={currentLanguage} size={26} showFallback={true} />
                </IconButton>
              </motion.div>
            )}
          </Box>
        </Box>
      </Box>

      {/* ✅ ICON-ONLY VERTICAL LANGUAGE POPOVER */}
      <Popover
        open={Boolean(languageMenuAnchor)}
        anchorEl={languageMenuAnchor}
        onClose={handleLanguageClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'rgba(10, 10, 10, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 3,
              mt: 1,
              py: 1,
              minWidth: 60, // Much narrower for icon-only
              maxWidth: 80,
              maxHeight: 320,
              overflowY: 'auto',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center', // Center icons
              '&::-webkit-scrollbar': { width: 0, display: 'none' }, // Check if user wants visible scrollbar or hidden. "manten lo del scroll" usually means functionality. I'll keep it cleaner.
              scrollbarWidth: 'none'
            }
          }
        }}
      >
        {languages.map((language, index) => {
          const isSelected = currentLanguage === language.code;

          return (
            <motion.div
              key={language.code}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
            >
              <Tooltip title={language.native_name || language.name} arrow placement="left">
                <Box
                  onClick={() => handleLanguageSelect(language.code)}
                  sx={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 1,
                    cursor: 'pointer',
                    '&:hover > div': {
                      transform: 'scale(1.1)',
                      borderColor: isSelected ? colors.accent : 'rgba(255,255,255,0.5)'
                    }
                  }}
                >
                  {/* Rectangular Flag Container */}
                  <Box
                    sx={{
                      width: 42,
                      height: 30, // Rectangular aspect ratio ~1.4
                      borderRadius: '4px', // Small border radius as requested
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'transparent',
                      border: isSelected
                        ? `2px solid ${colors.accent}`
                        : '1px solid rgba(255,255,255,0.2)', // Small border
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isSelected ? `0 0 10px ${colors.accent}40` : 'none',
                    }}
                  >
                    <FlagIcon languageCode={language.code} size={30} showFallback={true} />
                  </Box>
                </Box>
              </Tooltip>
            </motion.div>
          );
        })}
      </Popover>
    </>
  );
};

export default ClassicHeader;
