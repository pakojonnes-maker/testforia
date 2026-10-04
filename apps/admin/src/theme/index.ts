import { createTheme, alpha } from '@mui/material/styles';

// Tema único del admin (restaurantes y guidebook). Hasta oct-2026 había dos: el
// modo agencia usaba este, "Modern Mediterranean Editorial" (el del guide, ver
// apps/guide/src/styles/guide.css), y el de restaurantes uno oscuro pizarra/azul.
// Francisco quiso el del guidebook para todo el panel.
//
// Plano: esquinas a 0 y sin sombras. Ojo: con shape.borderRadius = 0, cualquier
// `borderRadius: N` numérico en un sx también vale 0 (MUI lo multiplica); solo
// un string ('50%', '8px') redondea de verdad.

/** Tinta, papel y marca. Lo que no sale de aquí sale de la paleta MUI. */
export const INK = '#1B1C1A';
export const PAPER = '#FAF9F5';
export const COBALT = '#0038AE';
export const DEEP_SEA = '#001550';
export const LINE = 'rgba(8, 36, 63, 0.1)';

/**
 * Colores para datos (gráficas, KPIs, estados). Son los del dashboard del
 * guidebook, oscurecidos lo justo para leerse como texto sobre el papel
 * (≥ 4,5:1 contra PAPER), así una cifra o una etiqueta en ese color es legible.
 */
export const DATA = {
  cobalt: COBALT,
  sea: '#1E3A5F',
  terracotta: '#A9532F',
  olive: '#55683F',
  sand: '#8A6A1F',
  water: '#48607E',
  plum: '#7A3E78',
  muted: '#6B6E76',
} as const;

/** Estados de reservas y pedidos: siempre la misma pareja color/etiqueta. */
export const STATUS_COLORS = {
  pending: DATA.sand,
  confirmed: DATA.olive,
  preparing: DATA.water,
  delivered: DATA.olive,
  completed: DATA.cobalt,
  cancelled: '#B3261E',
  no_show: DATA.muted,
  waitlist: DATA.plum,
} as const;

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      // Azul Cobalto — "el motor de la interfaz"
      main: COBALT,
      light: '#1A4FD8',
      dark: DEEP_SEA,
      contrastText: '#FFFFFF',
    },
    secondary: {
      // "Agua" — acento secundario/etiquetas
      main: DATA.water,
      light: '#6B8099',
      dark: '#304865',
      contrastText: '#FFFFFF',
    },
    success: { main: DATA.olive, contrastText: '#FFFFFF' },
    warning: {
      // "Sol" — precios/destacados. Como relleno es claro: texto en tinta.
      main: '#F7BE29',
      dark: DATA.sand,
      contrastText: INK,
    },
    error: { main: STATUS_COLORS.cancelled, contrastText: '#FFFFFF' },
    info: { main: COBALT, contrastText: '#FFFFFF' },
    background: {
      default: PAPER,
      paper: '#FFFFFF',
    },
    text: {
      primary: INK,
      secondary: '#434655',
    },
    divider: LINE,
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
    h1: { fontFamily: '"Newsreader", serif', fontWeight: 600 },
    h2: { fontFamily: '"Newsreader", serif', fontWeight: 600 },
    h3: { fontFamily: '"Newsreader", serif', fontWeight: 500 },
    h4: { fontFamily: '"Newsreader", serif', fontWeight: 500 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    overline: { fontWeight: 600, letterSpacing: '0.08em', lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  // El sistema es plano: esquinas a 0, sin sombras — la única curva
  // permitida en el guide es el arch-mask de imágenes, que no aplica a
  // controles MUI.
  shape: { borderRadius: 0 },
  components: {
    MuiCssBaseline: {
      styleOverrides: { body: { backgroundColor: PAPER, color: INK } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${LINE}`,
          borderRadius: 0,
          boxShadow: 'none',
          '&:hover': { borderColor: COBALT },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${LINE}`,
          borderRadius: 0,
          boxShadow: 'none',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 0, textTransform: 'none', fontWeight: 600, fontFamily: '"Inter", sans-serif', boxShadow: 'none' },
        containedPrimary: { background: COBALT, boxShadow: 'none', '&:hover': { background: DEEP_SEA, boxShadow: 'none' } },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          textTransform: 'none',
          fontWeight: 600,
          color: '#434655',
          '&.Mui-selected': {
            color: COBALT,
            backgroundColor: alpha(COBALT, 0.08),
            '&:hover': { backgroundColor: alpha(COBALT, 0.14) },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 0, fontFamily: '"Inter", sans-serif' } },
    },
    MuiTabs: {
      styleOverrides: { indicator: { backgroundColor: COBALT, height: 2 } },
    },
    MuiTab: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600, fontFamily: '"Inter", sans-serif' } },
    },
    MuiTableHead: {
      styleOverrides: { root: { backgroundColor: '#F4F4F0' } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${LINE}` },
        head: { fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.04em', color: '#434655' },
      },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 0, border: '1px solid currentColor' } },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { backgroundColor: DEEP_SEA, borderRadius: 0, fontSize: '0.75rem' } },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 0 }, bar: { borderRadius: 0 } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 0 } },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(250, 249, 245, 0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${LINE}`,
          boxShadow: 'none',
          color: INK,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          // "Mar Profundo"
          backgroundColor: DEEP_SEA,
          color: '#FFFFFF',
          border: 'none',
        },
      },
    },
  },
});

export default theme;
