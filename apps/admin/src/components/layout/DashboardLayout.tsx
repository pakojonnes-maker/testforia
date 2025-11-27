import { useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';

import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Restaurant as RestaurantIcon,
  ViewList as SectionsIcon,
  MenuBook as DishesIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  BarChart as StatsIcon,
  Campaign as CampaignIcon,
  Web as WebIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';

const drawerWidth = 240;

export default function DashboardLayout() {
  const { user, logout, switchRestaurant } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/'
    },
    {
      text: 'Platos',
      icon: <DishesIcon />,
      path: '/dishes'
    },
    {
      text: 'Secciones',
      icon: <SectionsIcon />,
      path: '/sections'
    },
    {
      text: 'Estadísticas',
      icon: <StatsIcon />,
      path: '/analytics'
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
        alignItems: 'flex-start',
        py: 1.5
      }}>
        <Typography variant="h6" noWrap component="div" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <RestaurantIcon sx={{ mr: 1 }} />
          VisualTaste
        </Typography>
        {hasMultipleRestaurants && (
          <FormControl
            size="small"
            sx={{ mt: 1, minWidth: '100%' }}
            fullWidth
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
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.12)',
                    }
                  }
                }}
              >
                <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    color: isActive ? 'primary' : 'inherit',
                    fontWeight: isActive ? 500 : 400
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
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
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
    </Box>
  );
}
