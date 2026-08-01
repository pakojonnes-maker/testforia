import { createTheme } from '@mui/material/styles';

// Tema MUI del modo "agencia" del admin (guidebook) — sigue la paleta
// "Modern Mediterranean Editorial" del guide (ver apps/guide/src/index.css y
// frontend-stich/modern_mediterranean_editorial/DESIGN.md). Reemplaza el
// tema anterior "Mediterranean Horizon" (terracota/Playfair, esquinas
// redondeadas, sombra al hover) para que la Vista Previa en vivo del admin
// no desentone con lo que ve el huésped.
export const guideTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      // Azul Cobalto — "el motor de la interfaz"
      main: '#0038AE',
      light: '#1A4FD8',
      dark: '#001550',
      contrastText: '#FFFFFF',
    },
    secondary: {
      // "Agua" — acento secundario/etiquetas
      main: '#48607E',
      light: '#6B8099',
      dark: '#304865',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#48607E',
    },
    warning: {
      // "Sol" — precios/destacados
      main: '#F7BE29',
    },
    background: {
      default: '#FAF9F5',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1B1C1A',
      secondary: '#434655',
    },
    divider: 'rgba(8, 36, 63, 0.1)',
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
    h1: { fontFamily: '"Newsreader", serif', fontWeight: 600 },
    h2: { fontFamily: '"Newsreader", serif', fontWeight: 600 },
    h3: { fontFamily: '"Newsreader", serif', fontWeight: 500 },
    h4: { fontFamily: '"Newsreader", serif', fontWeight: 500 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  // El sistema es plano: esquinas a 0, sin sombras — la única curva
  // permitida en el guide es el arch-mask de imágenes, que no aplica a
  // controles MUI.
  shape: { borderRadius: 0 },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid rgba(8, 36, 63, 0.1)',
          borderRadius: 0,
          boxShadow: 'none',
          '&:hover': { borderColor: '#0038AE' },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid rgba(8, 36, 63, 0.1)',
          borderRadius: 0,
          boxShadow: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 0, textTransform: 'none', fontWeight: 600, fontFamily: '"Inter", sans-serif', boxShadow: 'none' },
        containedPrimary: { background: '#0038AE', boxShadow: 'none', '&:hover': { background: '#001550', boxShadow: 'none' } },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 0, fontFamily: '"Inter", sans-serif' } },
    },
    MuiTab: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600, fontFamily: '"Inter", sans-serif' } },
    },
    MuiTableHead: {
      styleOverrides: { root: { backgroundColor: '#F4F4F0' } },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(250, 249, 245, 0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(8, 36, 63, 0.1)',
          boxShadow: 'none',
          color: '#1B1C1A',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          // "Mar Profundo"
          backgroundColor: '#001550',
          color: '#FFFFFF',
          border: 'none',
        },
      },
    },
  },
});
