import { useState, useEffect } from 'react';
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
import type { SelectChangeEvent } from '@mui/material';

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

const drawerWidth = 240;

export default function DashboardLayout() {
  const { user, logout, switchRestaurant, currentRestaurant } = useAuth();
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

  const handleRestaurantChange = (event: SelectChangeEvent<string>) => {
    const restaurantId = event.target.value;
    switchRestaurant(restaurantId);
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
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
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

  const onLogout = () => {
    handleUserMenuClose();
    logout();
    navigate('/login');
  };

  // Verificar si hay múltiples restaurantes disponibles
  const hasMultipleRestaurants = user?.restaurants && user.restaurants.length > 1;

  // Actualización de items del menú lateral
  const menuItems = [
    {
      text: 'Estadísticas',
      icon: <StatsIcon />,
      path: '/'
    },
    {
      text: 'Platos',
      icon: <DishesIcon />,
      path: '/dishes'
    },

    {
      text: 'Marketing',
      icon: <CampaignIcon />,
      path: '/marketing'
    },
    {
      text: 'Web',
      icon: <WebIcon />,
      path: '/admin/landing'
    },
    {
      text: 'Usuarios',
      icon: <PersonIcon />,
      path: '/users'
    },
    {
      text: 'Generador QR',
      icon: <QrCodeIcon />,
      path: '/qr-generator'
    },
    {
      text: 'Reservas',
      icon: <EventAvailable />,
      path: '/reservations'
    },
    {
      text: 'Delivery',
      icon: <TwoWheeler />,
      path: '/delivery'
    },
    {
      text: 'Configuración',
      icon: <SettingsIcon />,
      path: '/settings'
    },
  ];

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
          user.restaurants.length > 1 ? (
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
                {user.currentRestaurant?.logo_url ? (
                  <Avatar
                    src={user.currentRestaurant.logo_url}
                    alt={user.currentRestaurant.name}
                    sx={{ width: 24, height: 24, mr: 1 }}
                  />
                ) : (
                  <RestaurantIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                )}
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                    {user.currentRestaurant?.name || 'Seleccionar Restaurante'}
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
                currentRestaurantId={user.currentRestaurant?.id}
              />
            </>
          ) : (
            <FormControl
              size="small"
              sx={{ mt: 1, minWidth: '90%', mx: 'auto' }}
            >
              <InputLabel id="restaurant-select-label">Restaurante</InputLabel>
              <Select
                labelId="restaurant-select-label"
                id="restaurant-select"
                value={user?.currentRestaurant?.id || ''}
                label="Restaurante"
                onChange={handleRestaurantChange}
              >
                {user?.restaurants.map((restaurant) => (
                  <MenuItem
                    key={restaurant.id}
                    value={restaurant.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5
                    }}
                  >
                    {restaurant.logo_url && (
                      <Avatar
                        src={restaurant.logo_url}
                        alt={restaurant.name}
                        sx={{ width: 24, height: 24 }}
                      />
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2">
                        {restaurant.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {restaurant.role === 'owner' ? 'Propietario' :
                          restaurant.role === 'manager' ? 'Gerente' : 'Staff'}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )
        )}
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <ListItem
              disablePadding
              key={item.text}
              onClick={isMobile ? handleDrawerToggle : undefined}
            >
              <ListItemButton
                component={Link}
                to={item.path}
                selected={isActive}
              // Theme handles selected state colors
              >
                <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    color: isActive ? 'primary.main' : 'text.primary',
                    fontWeight: isActive ? 600 : 500
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
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
            {!hasMultipleRestaurants && user?.currentRestaurant && (
              <>
                {user.currentRestaurant.logo_url && (
                  <Avatar
                    src={user.currentRestaurant.logo_url}
                    alt={user.currentRestaurant.name}
                    sx={{ width: 32, height: 32, mr: 1 }}
                  />
                )}
                <Typography variant="h6" noWrap component="div">
                  {user.currentRestaurant.name || 'Panel de Administración'}
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
              helperText="Mínimo 6 caracteres"
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
    </Box>
  );
}
