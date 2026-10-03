import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createCustomTheme } from './muiTheme';
// Fraunces: la usan la portada, las landings, reservas y legal (no la carta).
import '@fontsource-variable/fraunces/index.css';

interface Props {
  primaryColor?: string;
  secondaryColor?: string;
  children: ReactNode;
}

/** MUI para las páginas que lo usan. Va en su propio chunk: la carta no lo descarga. */
const MuiShell = ({ primaryColor, secondaryColor, children }: Props) => {
  const theme = useMemo(() => createCustomTheme(primaryColor, secondaryColor), [primaryColor, secondaryColor]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

export default MuiShell;
