import { useState, useEffect, Fragment } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useIdleDetection } from '../../hooks/useIdleDetection';
import { apiClient } from '../../lib/apiClient';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme,
  FormControl,
  Select,
  InputLabel,
  ListItemButton,
  Tooltip,
  Badge,
  Snackbar,
  Alert as MuiAlert,
} from '@mui/material';

import {
  Menu as MenuIcon,
  Restaurant as RestaurantIcon,
  MenuBook as DishesIcon,
  Settings as SettingsIcon,
  BarChart as StatsIcon,
  Campaign as CampaignIcon,
  Web as WebIcon,
  Person as PersonIcon,
  QrCode as QrCodeIcon,
  EventAvailable,
  Key as KeyIcon,
  Logout as LogoutIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  TwoWheeler,
  Apartment as ApartmentIcon,
  Dashboard as GuideDashboardIcon,
  SwapHoriz as SwapIcon,
  Palette as PaletteIcon,
  LocationOn as LocationOnIcon,
  LocalActivity as LocalActivityIcon,
  Storefront as StoreIcon,
  Insights as ConversionsIcon,
  Loyalty as LoyaltyIcon,
  Shield as ShieldIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import {
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  Alert as AlertComponent,
  CircularProgress,
} from '@mui/material';
import { RestaurantSelectorDialog } from '../common/RestaurantSelectorDialog';
import QRCodeGenerator from '../QRCodeGenerator';

const drawerWidth = 240;

export default function DashboardLayout() {
  const { user, logout, switchRestaurant, currentRestaurant, currentAgency, switchAgency, adminMode, setAdminMode, hasRestaurants, hasAgencies } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [restaurantDialogOpen, setRestaurantDialogOpen] = useState(false);

  // User menu state
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // MFA (TOTP)
  const [mfaSetupOpen, setMfaSetupOpen] = useState(false);
  const [mfaSetupData, setMfaSetupData] = useState<{ secret: string; provisioningUri: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<string[] | null>(null);
  const [mfaDisableOpen, setMfaDisableOpen] = useState(false);
  const [mfaDisablePassword, setMfaDisablePassword] = useState('');

  // ✅ Query para obtener reservas pendientes (polling cada 5 minutos)
  const { data: pendingReservations = [] } = useQuery({
    queryKey: ['pending-reservations', currentRestaurant?.id],
    queryFn: async () => {
      if (!currentRestaurant?.id) return [];
      const response = await apiClient.getReservationsList(currentRestaurant.id);
      if (response?.success && Array.isArray(response.reservations)) {
        return response.reservations.filter((r: any) => r.status === 'pending');
      }
      return [];
    },
    enabled: !!currentRestaurant?.id,
    refetchInterval: 5 * 60 * 1000, // 5 minutos
    staleTime: 4 * 60 * 1000, // 4 minutos
  });

  const pendingCount = pendingReservations.length;

  // ✅ Detección de inactividad global - Aplicable a todo el admin
  const { isIdle, timeUntilLogout } = useIdleDetection({
    idleTimeout: 5 * 60 * 1000,        // 5 minutos → marcar como inactivo
    logoutTimeout: 15 * 60 * 1000,     // 15 minutos → cerrar sesión automática
    onIdle: () => {
      console.log('[Admin] Usuario inactivo - pausando consultas automáticas');
    },
    onActive: () => {
      console.log('[Admin] Usuario activo - reanudando actividad');
      setShowIdleWarning(false);
    },
    onLogout: () => {
      console.log('[Admin] Cerrando sesión por inactividad');
      logout();
      navigate('/login');
    },
    enabled: true
  });

  // ✅ Mostrar advertencia 60 segundos antes del logout
  useEffect(() => {
    if (timeUntilLogout <= 60 && timeUntilLogout > 0 && !showIdleWarning) {
      setShowIdleWarning(true);
    }
  }, [timeUntilLogout, showIdleWarning]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Navegar a reservas al hacer clic en el icono de pendientes
  const handlePendingReservationsClick = () => {
    navigate('/reservations');
  };

  // User menu handlers
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleOpenChangePassword = () => {
    handleUserMenuClose();
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError(null);
    setPasswordSuccess(false);
    setChangePasswordOpen(true);
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }
    // Debe coincidir con MIN_PASSWORD_LENGTH en workerAuthentication.js.
    // Esto solo evita un viaje al servidor; la validación real está allí.
    if (passwordForm.newPassword.length < 12) {
      setPasswordError('La nueva contraseña debe tener al menos 12 caracteres');
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordError(null);
      await apiClient.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordSuccess(true);
      setTimeout(() => {
        setChangePasswordOpen(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || err.message || 'Error al cambiar contraseña');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleOpenMfaSetup = async () => {
    handleUserMenuClose();
    setMfaError(null);
    setMfaCode('');
    setMfaRecoveryCodes(null);
    setMfaSetupOpen(true);
    setMfaLoading(true);
    try {
      const data = await apiClient.mfaSetup();
      setMfaSetupData(data);
    } catch (err: any) {
      setMfaError(err.response?.data?.message || 'No se pudo iniciar la activación de MFA');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleConfirmMfaEnable = async () => {
    if (!mfaSetupData) return;
    setMfaLoading(true);
    setMfaError(null);
    try {
      const { recoveryCodes } = await apiClient.mfaEnable(mfaSetupData.secret, mfaCode.trim());
      setMfaRecoveryCodes(recoveryCodes);
    } catch (err: any) {
      setMfaError(err.response?.data?.message || 'Código incorrecto');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleCloseMfaSetup = () => {
    setMfaSetupOpen(false);
    setMfaSetupData(null);
    setMfaCode('');
    setMfaRecoveryCodes(null);
    setMfaError(null);
  };

  const handleOpenMfaDisable = () => {
    handleUserMenuClose();
    setMfaDisablePassword('');
    setMfaError(null);
    setMfaDisableOpen(true);
  };

  const handleConfirmMfaDisable = async () => {
    setMfaLoading(true);
    setMfaError(null);
    try {
      await apiClient.mfaDisable(mfaDisablePassword);
      setMfaDisableOpen(false);
      window.location.reload(); // refresca user.mfaEnabled vía /auth/me
    } catch (err: any) {
      setMfaError(err.response?.data?.message || 'Contraseña incorrecta');
    } finally {
      setMfaLoading(false);
    }
  };

  const onLogout = async () => {
    handleUserMenuClose();
    await logout();
    navigate('/login');
  };

  // Verificar si hay múltiples restaurantes disponibles
  const hasMultipleRestaurants = user?.restaurants && user.restaurants.length > 1;

  // Actualización de items del menú lateral con feature keys
  const restaurantMenuItems = [
    {
      text: 'Estadísticas',
      icon: <StatsIcon />,
      path: '/',
      featureKey: 'statistics'
    },
    {
      text: 'Platos',
      icon: <DishesIcon />,
      path: '/dishes',
      featureKey: 'menu'
    },
    {
      text: 'Marketing',
      icon: <CampaignIcon />,
      path: '/marketing',
      featureKey: 'marketing'
    },
    {
      text: 'Web',
      icon: <WebIcon />,
      path: '/admin/landing',
      featureKey: 'website'
    },
    {
      text: 'Usuarios',
      icon: <PersonIcon />,
      path: '/users',
      featureKey: 'users'
    },
    {
      text: 'Generador QR',
      icon: <QrCodeIcon />,
      path: '/qr-generator',
      featureKey: 'qr_generator'
    },
    {
      text: 'Reservas',
      icon: <EventAvailable />,
      path: '/reservations',
      featureKey: 'reservations'
    },
    {
      text: 'Delivery',
      icon: <TwoWheeler />,
      path: '/delivery',
      featureKey: 'delivery'
    },
    {
      text: 'Lealtad',
      icon: <LoyaltyIcon />,
      path: '/loyalty',
      featureKey: 'loyalty'
    },
    {
      text: 'Configuración',
      icon: <SettingsIcon />,
      path: '/settings',
      featureKey: null // Always visible for owners/admins
    },
  ];

  // ✅ Guidebook Agency menu items
  // `section` groups items under a labeled header in the sidebar (agency mode only);
  // items without a `section` render at the top, unlabeled.
  const agencyMenuItems = [
    {
      text: 'Dashboard',
      icon: <GuideDashboardIcon />,
      path: '/guide',
      featureKey: null
    },
    {
      text: 'Apartamentos',
      icon: <ApartmentIcon />,
      path: '/guide/apartments',
      featureKey: null,
      section: 'GESTIÓN'
    },
    {
      text: 'Diseño',
      icon: <PaletteIcon />,
      path: '/guide/design',
      featureKey: null,
      section: 'GESTIÓN'
    },
    // Read-only for agency staff (they see which promotions are active, nothing more);
    // full CRUD + commission data is gated server-side to superadmin.
    {
      text: 'Experiencias',
      icon: <LocalActivityIcon />,
      path: '/guide/experiences',
      featureKey: null,
      section: 'CATÁLOGO'
    },
    ...(user?.is_superadmin ? [
      {
        text: 'Localizaciones',
        icon: <LocationOnIcon />,
        path: '/guide/pois',
        featureKey: null,
        section: 'CATÁLOGO'
      },
      {
        text: 'Tienda (catálogo)',
        icon: <StoreIcon />,
        path: '/guide/store',
        featureKey: null,
        section: 'CATÁLOGO'
      },
      {
        text: 'Conversión Restaurantes',
        icon: <ConversionsIcon />,
        path: '/guide/conversions',
        featureKey: null,
        section: 'CATÁLOGO'
      },
    ] : [])
  ];

  const allMenuItems = adminMode === 'agency' ? agencyMenuItems : restaurantMenuItems;

  // Parse features from current restaurant (may be JSON string or object)
  const getFeatures = () => {
    if (!currentRestaurant?.features) return {};
    if (typeof currentRestaurant.features === 'string') {
      try {
        return JSON.parse(currentRestaurant.features);
      } catch {
        return {};
      }
    }
    return currentRestaurant.features;
  };

  // Filter menu items based on restaurant features
  // Super admins see all items, features default to enabled if not explicitly set to false
  const menuItems = allMenuItems.filter(item => {
    if (!item.featureKey) return true; // Items without featureKey always visible
    if (user?.is_superadmin) return true; // Super admins see everything
    const features = getFeatures();
    return features[item.featureKey] !== false; // Default to enabled
  });

  const drawer = (
    <div>
      <Toolbar sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center', // Centered alignment
        py: 3
      }}>
        <Box
          component="img"
          src="/logo.png"
          alt="VisualTaste Logo"
          sx={{
            width: 80,
            height: 80,
            mb: 2,
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        />
        {hasMultipleRestaurants && (
          <>
            <ListItemButton
              onClick={() => setRestaurantDialogOpen(true)}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mt: 1,
                mb: 1,
                py: 1,
                mx: 2,
                width: 'auto'
              }}
            >
              {currentRestaurant?.logo_url ? (
                <Avatar
                  src={currentRestaurant.logo_url}
                  alt={currentRestaurant.name}
                  sx={{ width: 24, height: 24, mr: 1 }}
                />
              ) : (
                <RestaurantIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
              )}
              <Box sx={{ overflow: 'hidden' }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                  {currentRestaurant?.name || 'Seleccionar Restaurante'}
                </Typography>
                <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                  Cambiar ({user.restaurants.length})
                </Typography>
              </Box>
            </ListItemButton>

            <RestaurantSelectorDialog
              open={restaurantDialogOpen}
              onClose={() => setRestaurantDialogOpen(false)}
              onSelect={(id) => {
                switchRestaurant(id);
                setRestaurantDialogOpen(false);
              }}
              restaurants={user.restaurants}
              currentRestaurantId={currentRestaurant?.id}
            />
          </>
        )}
      </Toolbar>
      <Divider />

      {/* ✅ Mode Toggle for users with both restaurants and agencies */}
      {(hasRestaurants && hasAgencies) && (
        <Box sx={{ px: 2, py: 1.5 }}>
          <Box sx={{
            display: 'flex',
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }}>
            <Button
              size="small"
              fullWidth
              onClick={() => { setAdminMode('restaurant'); navigate('/'); }}
              startIcon={<RestaurantIcon sx={{ fontSize: 16 }} />}
              sx={{
                borderRadius: 0,
                py: 0.8,
                fontSize: '0.72rem',
                fontWeight: adminMode === 'restaurant' ? 700 : 400,
                bgcolor: adminMode === 'restaurant' ? 'primary.main' : 'transparent',
                color: adminMode === 'restaurant' ? 'white' : 'text.secondary',
                '&:hover': {
                  bgcolor: adminMode === 'restaurant' ? 'primary.dark' : 'action.hover',
                },
              }}
            >
              Restaurantes
            </Button>
            <Button
              size="small"
              fullWidth
              onClick={() => { setAdminMode('agency'); navigate('/guide'); }}
              startIcon={<ApartmentIcon sx={{ fontSize: 16 }} />}
              sx={{
                borderRadius: 0,
                py: 0.8,
                fontSize: '0.72rem',
                fontWeight: adminMode === 'agency' ? 700 : 400,
                bgcolor: adminMode === 'agency' ? 'primary.main' : 'transparent',
                color: adminMode === 'agency' ? 'white' : 'text.secondary',
                '&:hover': {
                  bgcolor: adminMode === 'agency' ? 'primary.dark' : 'action.hover',
                },
              }}
            >
              Guidebook
            </Button>
          </Box>
        </Box>
      )}

      {/* ✅ Agency Selector (when in agency mode with multiple agencies) */}
      {adminMode === 'agency' && user?.agencies && user.agencies.length > 1 && (
        <Box sx={{ px: 2, pb: 1 }}>
          <FormControl size="small" fullWidth>
            <InputLabel id="agency-select-label">Agencia</InputLabel>
            <Select
              labelId="agency-select-label"
              value={currentAgency?.id || ''}
              label="Agencia"
              onChange={(e) => switchAgency(e.target.value)}
            >
              {user.agencies.map((agency: any) => (
                <MenuItem key={agency.id} value={agency.id}>
                  <Typography variant="body2">{agency.name}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
      <List>
        {(() => {
          const isAgency = adminMode === 'agency';
          let lastSection: string | undefined;

          return menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const section = isAgency ? (item as { section?: string }).section : undefined;
            const showSectionLabel = isAgency && !!section && section !== lastSection;
            lastSection = section;

            return (
              <Fragment key={item.text}>
                {showSectionLabel && (
                  <Typography
                    variant="overline"
                    sx={{
                      display: 'block',
                      px: 2,
                      pt: 2,
                      pb: 0.5,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      lineHeight: 1.5,
                      color: 'rgba(255,255,255,0.45)',
                    }}
                  >
                    {section}
                  </Typography>
                )}
                <ListItem
                  disablePadding
                  onClick={isMobile ? handleDrawerToggle : undefined}
                >
                  <ListItemButton
                    component={Link}
                    to={item.path}
                    selected={isActive}
                    sx={isAgency ? {
                      borderLeft: '4px solid',
                      borderLeftColor: isActive ? 'secondary.main' : 'transparent',
                      bgcolor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                      '&:hover': {
                        bgcolor: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
                      },
                      '&.Mui-selected': {
                        bgcolor: 'rgba(255,255,255,0.08)',
                      },
                      '&.Mui-selected:hover': {
                        bgcolor: 'rgba(255,255,255,0.08)',
                      },
                    } : undefined}
                  // Restaurant mode: theme handles selected state colors
                  >
                    <ListItemIcon
                      sx={{
                        color: isAgency
                          ? (isActive ? '#FFFFFF' : 'rgba(255,255,255,0.75)')
                          : (isActive ? 'primary.main' : 'text.secondary'),
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        color: isAgency
                          ? (isActive ? '#FFFFFF' : 'rgba(255,255,255,0.75)')
                          : (isActive ? 'primary.main' : 'text.primary'),
                        fontWeight: isActive ? (isAgency ? 700 : 600) : 500
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              </Fragment>
            );
          });
        })()}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            {!hasMultipleRestaurants && currentRestaurant && (
              <>
                {currentRestaurant.logo_url && (
                  <Avatar
                    src={currentRestaurant.logo_url}
                    alt={currentRestaurant.name}
                    sx={{ width: 32, height: 32, mr: 1 }}
                  />
                )}
                <Typography variant="h6" noWrap component="div">
                  {currentRestaurant.name || 'Panel de Administración'}
                </Typography>
              </>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={pendingCount > 0 ? `${pendingCount} reservas pendientes` : 'Sin reservas pendientes'}>
              <IconButton
                color="inherit"
                onClick={handlePendingReservationsClick}
                sx={{
                  animation: pendingCount > 0 ? 'pulse 2s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.1)' },
                    '100%': { transform: 'scale(1)' },
                  }
                }}
              >
                <Badge
                  badgeContent={pendingCount}
                  color="warning"
                  max={99}
                >
                  <EventAvailable sx={{ color: pendingCount > 0 ? '#f59e0b' : 'inherit' }} />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* User Profile Menu */}
            <Tooltip title="Mi cuenta">
              <IconButton
                color="inherit"
                onClick={handleUserMenuOpen}
                sx={{ ml: 1 }}
              >
                <Avatar
                  src={user?.photo_url}
                  alt={user?.display_name || user?.email}
                  sx={{ width: 32, height: 32 }}
                >
                  <PersonIcon />
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={handleUserMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2">{user?.display_name || 'Usuario'}</Typography>
                <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
              </Box>
              <Divider />
              <MenuItem onClick={handleOpenChangePassword}>
                <ListItemIcon><KeyIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Cambiar Contraseña</ListItemText>
              </MenuItem>
              <MenuItem onClick={user?.mfaEnabled ? handleOpenMfaDisable : handleOpenMfaSetup}>
                <ListItemIcon><ShieldIcon fontSize="small" /></ListItemIcon>
                <ListItemText>{user?.mfaEnabled ? 'Desactivar verificación en 2 pasos' : 'Activar verificación en 2 pasos'}</ListItemText>
              </MenuItem>
              <MenuItem onClick={onLogout}>
                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Cerrar Sesión</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="menu navigation"
      >
        {/* Drawer para móvil */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Mejor rendimiento en móviles
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>

        {/* Drawer permanente para desktop */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              overflowX: 'hidden', // Hide horizontal scrollbar
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 7, sm: 8 },
          overflow: 'auto',
        }}
      >
        <Toolbar /> {/* Espaciador para que el contenido no quede bajo el AppBar */}
        <Outlet />
      </Box>

      {/* ✅ Advertencia de inactividad */}
      <Snackbar
        open={showIdleWarning}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 90, sm: 24 } }}
      >
        <MuiAlert
          severity="warning"
          variant="filled"
          sx={{ width: '100%' }}
          onClose={() => setShowIdleWarning(false)}
        >
          ⚠️ Sesión inactiva. Se cerrará en {timeUntilLogout} segundos. Mueve el ratón para continuar.
        </MuiAlert>
      </Snackbar>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <KeyIcon color="primary" />
          Cambiar Mi Contraseña
        </DialogTitle>
        <DialogContent>
          {passwordError && (
            <AlertComponent severity="error" sx={{ mb: 2 }}>
              {passwordError}
            </AlertComponent>
          )}
          {passwordSuccess && (
            <AlertComponent severity="success" sx={{ mb: 2 }}>
              ¡Contraseña actualizada correctamente!
            </AlertComponent>
          )}
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Contraseña Actual"
              type={showCurrentPassword ? 'text' : 'password'}
              fullWidth
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)} edge="end">
                      {showCurrentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              label="Nueva Contraseña"
              type={showNewPassword ? 'text' : 'password'}
              fullWidth
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              helperText="Mínimo 12 caracteres. Una frase que recuerdes es mejor que algo corto y retorcido."
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end">
                      {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              label="Confirmar Nueva Contraseña"
              type="password"
              fullWidth
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              error={passwordForm.confirmPassword !== '' && passwordForm.newPassword !== passwordForm.confirmPassword}
              helperText={passwordForm.confirmPassword !== '' && passwordForm.newPassword !== passwordForm.confirmPassword ? 'Las contraseñas no coinciden' : ''}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePasswordOpen(false)} disabled={passwordLoading}>Cancelar</Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            disabled={passwordLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
          >
            {passwordLoading ? <CircularProgress size={20} /> : 'Cambiar Contraseña'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MFA Setup Dialog */}
      <Dialog open={mfaSetupOpen} onClose={handleCloseMfaSetup} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShieldIcon color="primary" />
          Verificación en 2 pasos
        </DialogTitle>
        <DialogContent>
          {mfaError && <AlertComponent severity="error" sx={{ mb: 2 }}>{mfaError}</AlertComponent>}

          {mfaRecoveryCodes ? (
            <>
              <AlertComponent severity="success" sx={{ mb: 2 }}>
                Activado. Guarda estos códigos de recuperación — cada uno
                sirve una sola vez si pierdes el acceso a tu app de
                autenticación. No se volverán a mostrar.
              </AlertComponent>
              <Box
                sx={{
                  fontFamily: 'monospace', fontSize: '1rem', display: 'grid',
                  gridTemplateColumns: '1fr 1fr', gap: 1, p: 2, bgcolor: 'grey.100', borderRadius: 1,
                }}
              >
                {mfaRecoveryCodes.map((code) => <div key={code}>{code}</div>)}
              </Box>
              <Button
                startIcon={<ContentCopyIcon />}
                sx={{ mt: 2 }}
                onClick={() => navigator.clipboard.writeText(mfaRecoveryCodes.join('\n'))}
              >
                Copiar todos
              </Button>
            </>
          ) : mfaLoading && !mfaSetupData ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
          ) : mfaSetupData ? (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Escanea este código con Google Authenticator, Authy o similar,
                y escribe el código de 6 dígitos que te muestre.
              </Typography>
              <Box display="flex" justifyContent="center" mb={2}>
                <QRCodeGenerator data={mfaSetupData.provisioningUri} size={200} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, textAlign: 'center' }}>
                ¿No puedes escanear? Clave manual: <code>{mfaSetupData.secret}</code>
              </Typography>
              <TextField
                label="Código de 6 dígitos"
                fullWidth
                autoFocus
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                disabled={mfaLoading}
                inputProps={{ maxLength: 6 }}
              />
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMfaSetup}>{mfaRecoveryCodes ? 'Cerrar' : 'Cancelar'}</Button>
          {!mfaRecoveryCodes && mfaSetupData && (
            <Button
              onClick={handleConfirmMfaEnable}
              variant="contained"
              disabled={mfaLoading || mfaCode.length !== 6}
            >
              {mfaLoading ? <CircularProgress size={20} /> : 'Activar'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* MFA Disable Dialog */}
      <Dialog open={mfaDisableOpen} onClose={() => setMfaDisableOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShieldIcon color="warning" />
          Desactivar verificación en 2 pasos
        </DialogTitle>
        <DialogContent>
          {mfaError && <AlertComponent severity="error" sx={{ mb: 2 }}>{mfaError}</AlertComponent>}
          <Typography variant="body2" sx={{ mb: 2 }}>
            Confirma tu contraseña para desactivarla.
          </Typography>
          <TextField
            label="Contraseña actual"
            type="password"
            fullWidth
            autoFocus
            value={mfaDisablePassword}
            onChange={(e) => setMfaDisablePassword(e.target.value)}
            disabled={mfaLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMfaDisableOpen(false)} disabled={mfaLoading}>Cancelar</Button>
          <Button onClick={handleConfirmMfaDisable} variant="contained" color="warning" disabled={mfaLoading || !mfaDisablePassword}>
            {mfaLoading ? <CircularProgress size={20} /> : 'Desactivar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
