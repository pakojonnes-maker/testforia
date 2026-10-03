import { createTheme } from '@mui/material';

/**
 * Tema oscuro de las pantallas hechas con MUI (portada, landing, reservas, legal y los
 * diálogos heredados que abre la carta: pedido, sellos, oferta, valoración). Es el que
 * antes ponía App.tsx para toda la app.
 */
export const createCustomTheme = (primaryColor?: string, secondaryColor?: string) => createTheme({
  palette: {
    mode: 'dark',
    primary: { main: primaryColor || '#9c27b0' },
    secondary: { main: secondaryColor || '#2196f3' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 500 },
  },
});
