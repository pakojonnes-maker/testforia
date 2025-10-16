// apps/client/src/components/reels/templates/classic/Header.tsx

import React, { useState } from 'react';
import { Box, Typography, Menu, MenuItem } from '@mui/material';
import { motion } from 'framer-motion';
import { ExpandMore } from '@mui/icons-material';
import type { RestaurantConfig } from '../../../../hooks/useReelsConfig';

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
}

const ClassicHeader: React.FC<HeaderProps> = ({
  restaurant,
  currentSection,
  config,
  languages = [],
  currentLanguage,
  onLanguageChange
}) => {
  const [languageMenuAnchor, setLanguageMenuAnchor] = useState<null | HTMLElement>(null);

  const colors = {
    primary: config.restaurant?.branding?.primaryColor || '#FF6B6B',
    secondary: config.restaurant?.branding?.secondaryColor || '#4ECDC4',
    text: '#FFFFFF'
  };

  // ✅ NUEVA: Función para obtener URL de bandera desde R2
  const getFlagUrl = (languageCode: string) => {
    const API_URL = import.meta.env.VITE_API_URL || "https://visualtasteworker.franciscotortosaestudios.workers.dev";
    // ✅ MATCH DIRECTO: usar el code tal como está en la BD
    return `${API_URL}/media/System/flags/${languageCode.toLowerCase()}.svg`;
  };

  const getSectionName = (section: any) => {
    return section?.translations?.name?.[currentLanguage] || section?.name || 'Menú';
  };

  const getRestaurantName = (restaurant: any) => {
    return restaurant?.translations?.name?.[currentLanguage] || restaurant?.name || 'Restaurante';
  };

  const handleLanguageClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setLanguageMenuAnchor(event.currentTarget);
  };

  const handleLanguageClose = () => {
    setLanguageMenuAnchor(null);
  };

  const handleLanguageSelect = (languageCode: string) => {
    console.log(`🌍 [Header] Language selected: ${languageCode}`);
    onLanguageChange(languageCode);
    handleLanguageClose();
  };

  const currentLangData = languages.find(lang => lang.code === currentLanguage) || languages[0];

  // ✅ FALLBACK: Emojis si las banderas SVG fallan
  const flagEmojiMap: { [key: string]: string } = {
    'es': '🇪🇸',
    'en': '🇬🇧',
    'fr': '🇫🇷',
    'de': '🇩🇪',
    'it': '🇮🇹',
    'pt': '🇵🇹',
    'ca': '🏴󠁥󠁳󠁣󠁴󠁿',
    'kr': '🇰🇷' // Para Korea si lo tienes
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

    // ✅ Si hay error o no queremos fallback, mostrar emoji
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
        {/* ✅ Emoji mientras carga */}
        {!imageLoaded && (
          <Typography sx={{ 
            fontSize: `${Math.floor(size * 0.8)}px`,
            position: 'absolute',
            zIndex: 1
          }}>
            {fallbackEmoji}
          </Typography>
        )}
        
        {/* ✅ Bandera SVG desde R2 */}
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
          onLoad={() => {
            console.log(`✅ [FlagIcon] Loaded: ${languageCode} from ${flagUrl}`);
            setImageLoaded(true);
          }}
          onError={() => {
            console.warn(`❌ [FlagIcon] Failed: ${languageCode} from ${flagUrl}`);
            setImageError(true);
          }}
        />
      </Box>
    );
  };

  return (
    <>
      {/* ✅ HEADER REDISEÑADO */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          pt: { xs: 6, sm: 3 },
          pb: 3,
          px: 3,
          transform: 'translateZ(0)',
          willChange: 'transform',
          minHeight: '80px',
          display: 'flex',
          alignItems: 'center'
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
          {/* ✅ COLUMNA IZQUIERDA - Vacía (para balance) */}
          <Box sx={{ width: '80px', flexShrink: 0 }} />

          {/* ✅ COLUMNA CENTRAL - Texto centrado */}
          <Box
            sx={{
              flex: 1,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              maxWidth: 'calc(100% - 160px)',
              mx: 2
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
                  color: colors.text,
                  fontWeight: 400,
                  fontSize: { xs: '1.3rem', sm: '1.5rem' },
                  lineHeight: 1.2,
                  mb: 0.5,
                  fontFamily: '"Playfair Display", "Georgia", serif',
                  letterSpacing: 0.5,
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {getRestaurantName(restaurant)}
              </Typography>
              
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: { xs: '0.85rem', sm: '0.95rem' },
                  fontWeight: 300,
                  fontFamily: '"Inter", sans-serif',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {getSectionName(currentSection)}
              </Typography>
            </motion.div>
          </Box>

          {/* ✅ COLUMNA DERECHA - Language Selector con banderas R2 */}
          <Box
            sx={{
              width: '80px',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              flexShrink: 0
            }}
          >
            {languages.length > 1 && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              >
                <Box
                  onClick={handleLanguageClick}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 20,
                    px: { xs: 1.5, sm: 2 },
                    py: { xs: 0.6, sm: 0.8 },
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    minWidth: { xs: '60px', sm: '70px' },
                    justifyContent: 'center',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.25)',
                      transform: 'scale(1.02)'
                    }
                  }}
                >
                  {/* ✅ BANDERA DESDE R2 */}
                  <FlagIcon 
                    languageCode={currentLanguage} 
                    size={18} 
                    showFallback={true}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      color: colors.text,
                      fontSize: { xs: '0.7rem', sm: '0.8rem' },
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      ml: 0.5,
                      mr: 0.3,
                      display: { xs: 'none', sm: 'block' }
                    }}
                  >
                    {currentLanguage}
                  </Typography>
                  <ExpandMore sx={{ fontSize: { xs: 14, sm: 16 }, color: colors.text }} />
                </Box>
              </motion.div>
            )}
          </Box>
        </Box>
      </Box>

      {/* ✅ MENÚ DE IDIOMAS - Con banderas R2 */}
      <Menu
        anchorEl={languageMenuAnchor}
        open={Boolean(languageMenuAnchor)}
        onClose={handleLanguageClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0,0,0,0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
            mt: 1,
            minWidth: 180,
            maxHeight: 300,
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'rgba(255,255,255,0.3)',
              borderRadius: 3,
            }
          }
        }}
      >
        {languages.map((language) => {
          const isSelected = currentLanguage === language.code;
          
          return (
            <MenuItem
              key={language.code}
              onClick={() => handleLanguageSelect(language.code)}
              selected={isSelected}
              sx={{
                color: '#fff',
                minHeight: 48,
                px: 2,
                py: 1.5,
                '&.Mui-selected': {
                  bgcolor: 'rgba(255,107,107,0.2)',
                  color: colors.primary,
                  '&:hover': { bgcolor: 'rgba(255,107,107,0.3)' }
                },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5, 
                width: '100%',
                justifyContent: 'space-between'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {/* ✅ BANDERA DESDE R2 */}
                  <FlagIcon 
                    languageCode={language.code} 
                    size={22} 
                    showFallback={true}
                  />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {language.native_name || language.name}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                      {language.code.toUpperCase()}
                    </Typography>
                  </Box>
                </Box>
                
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: colors.primary
                      }}
                    />
                  </motion.div>
                )}
              </Box>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export default ClassicHeader;
