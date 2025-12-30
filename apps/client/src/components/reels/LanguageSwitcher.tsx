import React, { useState } from 'react';
import { Box, Typography, Popover, IconButton, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';

interface Language {
  code: string;
  name: string;
  native_name: string;
  flag_emoji?: string;
}

interface LanguageSwitcherProps {
  languages: Language[];
  currentLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  disabled?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  languages = [],
  currentLanguage,
  onLanguageChange,
  disabled = false
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Don't render if only one language or less
  if (languages.length <= 1) return null;

  // -- Helpers copied from ClassicHeader --

  const getFlagUrl = (languageCode: string) => {
    const API_URL = import.meta.env.VITE_API_URL || "https://visualtasteworker.franciscotortosaestudios.workers.dev";

    const fileMap: Record<string, string> = {
      'ar': 'ae',    // Emirates flag for Arabic
      'ja': 'jp',
      'bn': 'bd',
      'hi': 'in',
      'kr': 'kr',
      'cn': 'cn',
    };

    const fileName = fileMap[languageCode] || languageCode.toLowerCase();
    return `${API_URL}/media/System/flags/${fileName}.svg`;
  };

  const flagEmojiMap: { [key: string]: string } = {
    'es': '🇪🇸', 'en': '🇬🇧', 'fr': '🇫🇷', 'de': '🇩🇪', 'it': '🇮🇹',
    'pt': '🇵🇹', 'ca': '🏴󠁥󠁳󠁣󠁴󠁿', 'kr': '🇰🇷', 'ja': '🇯🇵', 'bn': '🇧🇩',
    'ar': '🇸🇦', 'ru': '🇷🇺', 'ua': '🇺🇦', 'cn': '🇨🇳', 'in': '🇮🇳'
  };

  const FlagIcon: React.FC<{ languageCode: string; size?: number; showFallback?: boolean; }> = ({
    languageCode,
    size = 20,
    showFallback = true
  }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const flagUrl = getFlagUrl(languageCode);
    const fallbackEmoji = flagEmojiMap[languageCode] || '🌍';

    if (imageError || !showFallback) {
      return <Typography sx={{ fontSize: `${size}px` }}>{fallbackEmoji}</Typography>;
    }

    return (
      <Box sx={{
        width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', borderRadius: '2px', overflow: 'hidden'
      }}>
        {!imageLoaded && (
          <Typography sx={{ fontSize: `${Math.floor(size * 0.8)}px`, position: 'absolute', zIndex: 1 }}>
            {fallbackEmoji}
          </Typography>
        )}
        <img
          src={flagUrl}
          alt={`${languageCode} flag`}
          style={{
            width: size, height: size, objectFit: 'cover', borderRadius: '2px',
            display: imageLoaded ? 'block' : 'none', position: imageLoaded ? 'static' : 'absolute', zIndex: imageLoaded ? 2 : 0
          }}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      </Box>
    );
  };

  // -- Handlers --

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!disabled) setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleLanguageSelect = (languageCode: string) => {
    if (languageCode !== currentLanguage) {
      onLanguageChange(languageCode);
    }
    handleClose();
  };

  // Color theme for current selection highlight (using generic accent color if not passed, but we hardcode a nice gold/white for now)
  const accentColor = '#FF8C42'; // Matches default accent

  return (
    <>
      {/* Trigger Button */}
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <IconButton
          onClick={handleClick}
          disabled={disabled}
          sx={{
            width: 44,
            height: 44,
            p: 0,
            border: `2px solid rgba(255,255,255,0.2)`,
            borderRadius: '50%',
            overflow: 'hidden',
            bgcolor: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: accentColor,
              boxShadow: `0 0 15px ${accentColor}40`
            }
          }}
        >
          <FlagIcon languageCode={currentLanguage} size={28} showFallback={true} />
        </IconButton>
      </motion.div>

      {/* Popover Menu */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
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
              minWidth: 60,
              maxWidth: 80,
              maxHeight: 320,
              overflowY: 'auto',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              '&::-webkit-scrollbar': { width: 0, display: 'none' },
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
                      borderColor: isSelected ? accentColor : 'rgba(255,255,255,0.5)'
                    }
                  }}
                >
                  <Box
                    sx={{
                      width: 42,
                      height: 30,
                      borderRadius: '4px',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'transparent',
                      border: isSelected ? `2px solid ${accentColor}` : '1px solid rgba(255,255,255,0.2)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isSelected ? `0 0 10px ${accentColor}40` : 'none',
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

export default LanguageSwitcher;
