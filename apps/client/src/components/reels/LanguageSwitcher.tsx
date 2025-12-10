// apps/client/src/components/reels/LanguageSwitcher.tsx

import React, { useState } from 'react';
import { Box, Typography, Menu, MenuItem } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

interface Language {
  code: string;
  name: string;
  native_name: string;
  flag_emoji: string;
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

  // ✅ Don't render if only one language
  if (languages.length <= 1) return null;

  const currentLang = languages.find(l => l.code === currentLanguage);

  // ✅ Fallback flags
  const flagMap: { [key: string]: string } = {
    'es': '🇪🇸', 'en': '🇬🇧', 'fr': '🇫🇷', 'de': '🇩🇪', 'it': '🇮🇹'
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!disabled) setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleLanguageSelect = (languageCode: string) => {
    if (languageCode !== currentLanguage) {
      console.log(`[LanguageSwitcher] 🌍 ${currentLanguage} → ${languageCode}`);
      onLanguageChange(languageCode);
    }
    handleClose();
  };

  return (
    <>
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
          borderRadius: 25,
          bgcolor: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.3s ease',
          ...(!disabled ? {
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.25)',
              transform: 'translateY(-1px)'
            }
          } : {})
        }}
      >
        <Typography sx={{ fontSize: '1.1rem' }}>
          {currentLang?.flag_emoji || flagMap[currentLanguage] || '🌐'}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: 600,
            textTransform: 'uppercase'
          }}
        >
          {currentLanguage}
        </Typography>
        <ExpandMore sx={{ fontSize: 16, color: '#fff' }} />
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0,0,0,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 2,
            mt: 1,
            minWidth: 180
          }
        }}
      >
        {languages.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageSelect(language.code)}
            selected={currentLanguage === language.code}
            sx={{
              color: '#fff',
              '&.Mui-selected': {
                bgcolor: 'rgba(255,107,107,0.2)',
                color: '#FF6B6B'
              },
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography sx={{ fontSize: '1.2rem' }}>
                {language.flag_emoji || flagMap[language.code] || '🌍'}
              </Typography>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {language.native_name || language.name}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {language.code.toUpperCase()}
                </Typography>
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguageSwitcher;
