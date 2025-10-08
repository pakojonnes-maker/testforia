// packages/ui/src/reels/LanguageSelector.tsx
import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
  Tooltip,
  Badge
} from '@mui/material';
import { Language } from '@mui/icons-material';
import { Language as LanguageType } from '@visualtaste/api';

interface LanguageSelectorProps {
  currentLanguage: string;
  availableLanguages: LanguageType[];
  onLanguageChange: (code: string) => void;
}

export default function LanguageSelector({ 
  currentLanguage, 
  availableLanguages, 
  onLanguageChange 
}: LanguageSelectorProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLanguageChange = (code: string) => {
    onLanguageChange(code);
    handleClose();
  };
  
  // Encontrar el idioma actual para mostrar su bandera
  const currentLang = availableLanguages.find(lang => lang.code === currentLanguage);
  const flagUrl = currentLang?.flag_emoji 
    ? `https://flagcdn.com/w20/${currentLang.code}.png` 
    : undefined;
  
  return (
    <>
      <Tooltip title="Cambiar idioma">
        <IconButton onClick={handleOpen} sx={{ color: 'white' }}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={flagUrl && (
              <Box 
                component="img" 
                src={flagUrl} 
                alt={currentLang?.name || ''}
                sx={{ 
                  width: 14, 
                  height: 'auto', 
                  borderRadius: '50%',
                  border: '1px solid white' 
                }}
              />
            )}
          >
            <Language />
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {availableLanguages.map(lang => {
          const flagUrl = `https://flagcdn.com/w20/${lang.code}.png`;
          return (
            <MenuItem 
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              selected={currentLanguage === lang.code}
              dense
            >
              <ListItemIcon>
                <Box 
                  component="img" 
                  src={flagUrl} 
                  alt={lang.name} 
                  sx={{ width: 20, height: 'auto' }}
                />
              </ListItemIcon>
              <ListItemText primary={lang.native_name || lang.name} />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}