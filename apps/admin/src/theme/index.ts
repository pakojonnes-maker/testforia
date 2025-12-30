import { createTheme } from '@mui/material/styles';

// Dark Premium Palette (Slate/Blue/Neon)
const palette = {
    mode: 'dark' as const,
    primary: {
        main: '#3b82f6', // Blue 500
        light: '#60a5fa',
        dark: '#2563eb',
        contrastText: '#ffffff',
    },
    secondary: {
        main: '#10b981', // Emerald 500
        light: '#34d399',
        dark: '#059669',
        contrastText: '#ffffff',
    },
    success: {
        main: '#10b981',
        light: '#34d399',
        dark: '#059669',
        contrastText: '#ffffff',
    },
    warning: {
        main: '#f59e0b', // Amber 500
        light: '#fbbf24',
        dark: '#d97706',
        contrastText: '#ffffff',
    },
    error: {
        main: '#ef4444', // Red 500
        light: '#f87171',
        dark: '#b91c1c',
        contrastText: '#ffffff',
    },
    background: {
        default: '#0f172a', // Slate 900
        paper: '#1e293b',   // Slate 800
    },
    text: {
        primary: '#f8fafc', // Slate 50
        secondary: '#94a3b8', // Slate 400
    },
    divider: 'rgba(255, 255, 255, 0.08)',
    action: {
        hover: 'rgba(255, 255, 255, 0.05)',
        selected: 'rgba(59, 130, 246, 0.12)', // Blue tint
    }
};

// Typography - Modern & Bold
const typography = {
    fontFamily: [
        'Inter',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        'sans-serif',
    ].join(','),
    h1: { fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' },
    h3: { fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' },
    h4: { fontWeight: 700, letterSpacing: '-0.01em', color: '#fff' },
    h5: { fontWeight: 600, color: '#fff' },
    h6: { fontWeight: 600, color: '#fff' },
    subtitle1: { color: '#94a3b8' },
    subtitle2: { color: '#94a3b8' },
    body1: { color: '#cbd5e1' },
    body2: { color: '#94a3b8' },
    button: { textTransform: 'none' as const, fontWeight: 600 },
};

// Component Overrides for Dark Premium Look
const components = {
    MuiCssBaseline: {
        styleOverrides: {
            body: {
                backgroundColor: '#0f172a', // Force Slate 900 body
                color: '#f8fafc',
            },
        },
    },
    MuiPaper: {
        styleOverrides: {
            root: {
                backgroundImage: 'none',
                backgroundColor: '#1e293b', // Slate 800
                borderRadius: 16,
                border: '1px solid rgba(255, 255, 255, 0.05)',
            },
            elevation1: {
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
            },
        },
    },
    MuiCard: {
        styleOverrides: {
            root: {
                backgroundImage: 'none',
                backgroundColor: '#1e293b',
                borderRadius: 16,
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
            },
        },
    },
    MuiAppBar: {
        styleOverrides: {
            root: {
                backgroundColor: 'rgba(15, 23, 42, 0.8)', // Glassmorphism Slate 900
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: 'none',
            },
        },
    },
    MuiDrawer: {
        styleOverrides: {
            paper: {
                backgroundColor: '#0f172a', // Slate 900 for sidebar
                borderRight: '1px solid rgba(255, 255, 255, 0.05)',
            },
        },
    },
    MuiButton: {
        styleOverrides: {
            root: {
                borderRadius: 10,
                padding: '8px 20px',
                fontSize: '0.95rem',
            },
            contained: {
                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)', // Blue shadow
                '&:hover': {
                    boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.4)',
                },
            },
        },
    },
    MuiTableCell: {
        styleOverrides: {
            root: {
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '16px',
            },
            head: {
                color: '#94a3b8',
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                fontSize: '0.75rem',
                letterSpacing: '0.05em',
            },
        },
    },
    MuiListItemButton: {
        styleOverrides: {
            root: {
                borderRadius: 8,
                margin: '4px 8px',
                '&.Mui-selected': {
                    backgroundColor: 'rgba(59, 130, 246, 0.15)', // Blue tint selected
                    borderLeft: '4px solid #3b82f6',
                    '&:hover': {
                        backgroundColor: 'rgba(59, 130, 246, 0.25)',
                    },
                },
            },
        },
    },
    MuiListItemIcon: {
        styleOverrides: {
            root: {
                minWidth: 40,
                color: '#94a3b8',
                '.Mui-selected &': {
                    color: '#60a5fa', // Light blue selected
                },
            },
        },
    },
    MuiChip: {
        styleOverrides: {
            root: {
                borderRadius: 6,
                fontWeight: 600,
            },
            filled: {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
            },
        },
    },
    // Form Components
    MuiTextField: {
        defaultProps: {
            variant: 'outlined' as const,
        },
        styleOverrides: {
            root: {
                '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 10,
                    '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&.Mui-focused fieldset': {
                        borderColor: '#3b82f6',
                    },
                },
                '& .MuiInputLabel-root': {
                    color: '#94a3b8',
                },
                '& .MuiInputBase-input': {
                    color: '#f8fafc',
                },
            },
        },
    },
    MuiSelect: {
        styleOverrides: {
            root: {
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 10,
            },
            icon: {
                color: '#94a3b8',
            },
        },
    },
    MuiInputBase: {
        styleOverrides: {
            root: {
                color: '#f8fafc',
            },
        },
    },
    // Dialog
    MuiDialog: {
        styleOverrides: {
            paper: {
                backgroundColor: '#1e293b',
                backgroundImage: 'none',
                borderRadius: 16,
                border: '1px solid rgba(255, 255, 255, 0.05)',
            },
        },
    },
    MuiDialogTitle: {
        styleOverrides: {
            root: {
                color: '#f8fafc',
                fontWeight: 700,
            },
        },
    },
    // Tabs
    MuiTabs: {
        styleOverrides: {
            root: {
                minHeight: 44,
            },
            indicator: {
                backgroundColor: '#3b82f6',
                height: 3,
                borderRadius: 2,
            },
        },
    },
    MuiTab: {
        styleOverrides: {
            root: {
                textTransform: 'none' as const,
                fontWeight: 600,
                fontSize: '0.9rem',
                minHeight: 44,
                color: '#94a3b8',
                '&.Mui-selected': {
                    color: '#f8fafc',
                },
            },
        },
    },
    // Switch
    MuiSwitch: {
        styleOverrides: {
            root: {
                width: 52,
                height: 30,
                padding: 0,
            },
            switchBase: {
                padding: 3,
                '&.Mui-checked': {
                    transform: 'translateX(22px)',
                    '& + .MuiSwitch-track': {
                        backgroundColor: '#3b82f6',
                        opacity: 1,
                    },
                },
            },
            thumb: {
                width: 24,
                height: 24,
                backgroundColor: '#fff',
            },
            track: {
                borderRadius: 15,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                opacity: 1,
            },
        },
    },
    // Alert
    MuiAlert: {
        styleOverrides: {
            root: {
                borderRadius: 12,
            },
            standardSuccess: {
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
            },
            standardError: {
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
            },
            standardWarning: {
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
            },
            standardInfo: {
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
            },
        },
    },
    // Table
    MuiTableContainer: {
        styleOverrides: {
            root: {
                borderRadius: 12,
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.05)',
            },
        },
    },
    MuiTableRow: {
        styleOverrides: {
            root: {
                '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                },
            },
        },
    },
    // Tooltip
    MuiTooltip: {
        styleOverrides: {
            tooltip: {
                backgroundColor: '#334155',
                color: '#f8fafc',
                fontSize: '0.8rem',
                borderRadius: 8,
            },
        },
    },
    // Menu (Dropdowns)
    MuiMenu: {
        styleOverrides: {
            paper: {
                backgroundColor: '#1e293b',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.05)',
            },
        },
    },
    MuiMenuItem: {
        styleOverrides: {
            root: {
                '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                },
                '&.Mui-selected': {
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                },
            },
        },
    },
    // Skeleton (loading states)
    MuiSkeleton: {
        styleOverrides: {
            root: {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
