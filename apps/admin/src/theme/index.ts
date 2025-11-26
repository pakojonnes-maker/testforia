import { createTheme } from '@mui/material/styles';

// Apple-like Color Palette
const palette = {
    primary: {
        main: '#007AFF', // Apple Blue
        light: '#47a3ff',
        dark: '#0055b3',
        contrastText: '#ffffff',
    },
    secondary: {
        main: '#5856D6', // Apple Purple
        light: '#7c7af2',
        dark: '#3a38b0',
        contrastText: '#ffffff',
    },
    success: {
        main: '#34C759', // Apple Green
        light: '#5dde7d',
        dark: '#248a3d',
        contrastText: '#ffffff',
    },
    warning: {
        main: '#FF9500', // Apple Orange
        light: '#ffb347',
        dark: '#b36800',
        contrastText: '#ffffff',
    },
    error: {
        main: '#FF3B30', // Apple Red
        light: '#ff6b63',
        dark: '#b32921',
        contrastText: '#ffffff',
    },
    background: {
        default: '#F5F5F7', // Light Gray Background
        paper: '#FFFFFF',
    },
    text: {
        primary: '#1D1D1F', // Almost Black
        secondary: '#86868B', // Gray Text
    },
    divider: 'rgba(0, 0, 0, 0.08)',
};

// Typography - San Francisco Style
const typography = {
    fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
    ].join(','),
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.015em' },
    h3: { fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none' as const, fontWeight: 500 },
};

// Component Overrides with Glassmorphism
const components = {
    MuiCssBaseline: {
        styleOverrides: {
            body: {
                background: 'linear-gradient(135deg, #f5f7fa 0%, #e8edf2 100%)',
                backgroundAttachment: 'fixed',
                color: '#1D1D1F',
            },
        },
    },
    MuiCard: {
        styleOverrides: {
            root: {
                borderRadius: 16,
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backgroundImage: 'none',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
                },
            },
        },
    },
    MuiPaper: {
        styleOverrides: {
            root: {
                backgroundImage: 'none',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            },
        },
    },
    MuiAppBar: {
        styleOverrides: {
            root: {
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                color: '#1D1D1F',
            },
        },
    },
    MuiDrawer: {
        styleOverrides: {
            paper: {
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                borderRight: '1px solid rgba(0, 0, 0, 0.06)',
            },
        },
    },
    MuiButton: {
        styleOverrides: {
            root: {
                borderRadius: 10,
                padding: '8px 16px',
                boxShadow: 'none',
                '&:hover': {
                    boxShadow: 'none',
                },
            },
            contained: {
                '&:hover': {
                    boxShadow: '0 4px 12px rgba(0, 122, 255, 0.2)',
                },
            },
        },
    },
    MuiChip: {
        styleOverrides: {
            root: {
                borderRadius: 8,
                fontWeight: 500,
            },
            filled: {
                backgroundColor: 'rgba(0, 0, 0, 0.06)',
            },
        },
    },
    MuiTableCell: {
        styleOverrides: {
            root: {
                borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
                padding: '16px',
            },
            head: {
                fontWeight: 600,
                color: '#86868B',
                backgroundColor: 'transparent',
            },
        },
    },
    MuiLinearProgress: {
        styleOverrides: {
            root: {
                borderRadius: 4,
                backgroundColor: 'rgba(0, 0, 0, 0.06)',
            },
        },
    },
    MuiTab: {
        styleOverrides: {
            root: {
                textTransform: 'none' as const,
                fontWeight: 500,
                fontSize: '0.95rem',
                minHeight: 48,
                '&.Mui-selected': {
                    color: '#1D1D1F',
                    fontWeight: 600,
                },
            },
        },
    },
};

const theme = createTheme({
    palette,
    typography,
    components,
    shape: {
        borderRadius: 12,
    },
});

export default theme;
