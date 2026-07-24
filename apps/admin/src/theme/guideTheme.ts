import { createTheme } from '@mui/material/styles';

export const guideTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1E3A5F',
      light: '#2D5F9E',
      dark: '#142943',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#C96D4B',
      light: '#D4896C',
      dark: '#A55538',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#6B7D54',
    },
    warning: {
      main: '#D4A853',
    },
    background: {
      default: '#FAF8F4',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1C1C19',
      secondary: '#55433D',
    },
    divider: '#E8E2D9',
  },
  typography: {
    fontFamily: '"Montserrat", "Inter", sans-serif',
    h1: { fontFamily: '"Playfair Display", serif', fontWeight: 700 },
    h2: { fontFamily: '"Playfair Display", serif', fontWeight: 700 },
    h3: { fontFamily: '"Playfair Display", serif', fontWeight: 700 },
    h4: { fontFamily: '"Playfair Display", serif', fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid #E8E2D9',
          borderRadius: 16,
          '&:hover': { boxShadow: '0 4px 20px rgba(201,109,75,0.08)' },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid #E8E2D9',
          borderRadius: 16,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, textTransform: 'none', fontWeight: 600, fontFamily: '"Montserrat", sans-serif' },
        containedPrimary: { background: '#1E3A5F', '&:hover': { background: '#142943' } },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8, fontFamily: '"Montserrat", sans-serif' } },
    },
    MuiTab: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600, fontFamily: '"Montserrat", sans-serif' } },
    },
    MuiTableHead: {
      styleOverrides: { root: { backgroundColor: '#F5F2EC' } },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(250, 248, 244, 0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #E8E2D9',
          boxShadow: 'none',
          color: '#1C1C19',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1E3A5F',
          color: '#FFFFFF',
          border: 'none',
        },
      },
    },
  },
});
