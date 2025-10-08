// src/components/reels/LanguageSwitcher.tsx
import React from 'react';
import { IconButton, Menu, MenuItem, Box } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';

interface LanguageSwitcherProps {
  language: string;
  onLanguageChange: (language: string) => void;
  color?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ language, onLanguageChange, color = 'inherit' }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLanguageChange = (lang: string) => {
    onLanguageChange(lang);
    handleClose();
  };
  
  // Mapeo de idioma a bandera
  const flags: Record<string, string> = {
    es: '🇪🇸',
    en: '🇬🇧',
    fr: '🇫🇷',
    de: '🇩🇪',
    it: '🇮🇹',
  };
  
  return (
    <>
      <IconButton onClick={handleClick} color="inherit" sx={{ color }}>
        <Box component="span" sx={{ mr: 0.5, fontSize: '1.2rem' }}>
          {flags[language] || '🌐'}
        </Box>
        <LanguageIcon fontSize="small" />
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => handleLanguageChange('es')}>
          <Box component="span" sx={{ mr: 1 }}>🇪🇸</Box> Español
        </MenuItem>
        <MenuItem onClick={() => handleLanguageChange('en')}>
          <Box component="span" sx={{ mr: 1 }}>🇬🇧</Box> English
        </MenuItem>
        <MenuItem onClick={() => handleLanguageChange('fr')}>
          <Box component="span" sx={{ mr: 1 }}>🇫🇷</Box> Français
        </MenuItem>
        <MenuItem onClick={() => handleLanguageChange('de')}>
          <Box component="span" sx={{ mr: 1 }}>🇩🇪</Box> Deutsch
        </MenuItem>
        <MenuItem onClick={() => handleLanguageChange('it')}>
          <Box component="span" sx={{ mr: 1 }}>🇮🇹</Box> Italiano
        </MenuItem>
      </Menu>
    </>
  );
};

export default LanguageSwitcher;