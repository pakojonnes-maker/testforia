import { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useIdleDetection } from '../../hooks/useIdleDetection';
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
  Menu,
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
  Logout as LogoutIcon,
  BarChart as StatsIcon,
  Campaign as CampaignIcon,
  Web as WebIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  QrCode as QrCodeIcon,
  EventAvailable,
} from '@mui/icons-material';
import { RestaurantSelectorDialog } from '../common/RestaurantSelectorDialog';

const drawerWidth = 240;

export default function DashboardLayout() {
  const { user, logout, switchRestaurant } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [restaurantDialogOpen, setRestaurantDialogOpen] = useState(false);

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

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
    navigate('/login');
  };

  const handleRestaurantChange = (event: SelectChangeEvent<string>) => {
    const restaurantId = event.target.value;
    switchRestaurant(restaurantId);
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

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Notificaciones">
              <IconButton color="inherit" sx={{ mr: 1 }}>
                <Badge badgeContent={3} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              {user?.photo_url ? (
                <Avatar
                  src={user.photo_url}
                  alt={user?.name || "Usuario"}
                  sx={{ width: 32, height: 32 }}
                />
              ) : (
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.dark' }}>
                  {user?.name?.charAt(0) || 'U'}
                </Avatar>
              )}
            </IconButton>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleProfileMenuClose}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              Mi perfil
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Cerrar sesión
            </MenuItem>
          </Menu>
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
    </Box>
  );
}
