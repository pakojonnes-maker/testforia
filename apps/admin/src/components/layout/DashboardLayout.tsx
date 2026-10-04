import { useState, useEffect, useMemo, Fragment, Suspense } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AppBar, Alert, Avatar, Badge, Box, Button, Drawer, FormControl, IconButton, LinearProgress, List,
  ListItem, ListItemButton, ListItemIcon, ListItemText, MenuItem, Select, Snackbar, Toolbar, Tooltip,
  Typography, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Restaurant as RestaurantIcon,
  Apartment as ApartmentIcon,
  EventAvailable,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useIdleDetection } from '../../hooks/useIdleDetection';
import { apiClient } from '../../lib/apiClient';
import { RestaurantSelectorDialog } from '../common/RestaurantSelectorDialog';
import AccountMenu from './AccountMenu';
import { agencyNav, parseFeatures, restaurantNav } from './navigation';

const drawerWidth = 248;

// La barra lateral es "Mar Profundo" (theme.MuiDrawer) con una paleta clara:
// los grises del tema no se leen sobre ella, así que todo lo de dentro va en
// blancos translúcidos. Un mismo estilo para los dos modos.
const onSea = {
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.72)',
  faint: 'rgba(255,255,255,0.45)',
  hover: 'rgba(255,255,255,0.06)',
  active: 'rgba(255,255,255,0.1)',
  line: 'rgba(255,255,255,0.15)',
};

const sectionLabelSx = {
  display: 'block', px: 2, pt: 2, pb: 0.5, fontSize: 11, color: onSea.faint,
} as const;

export default function DashboardLayout() {
  const {
    user, logout, switchRestaurant, currentRestaurant, currentAgency, switchAgency,
    adminMode, setAdminMode, hasRestaurants, hasAgencies,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [restaurantDialogOpen, setRestaurantDialogOpen] = useState(false);
  const isAgency = adminMode === 'agency';

  // Reservas pendientes (aviso de la barra superior). Solo en modo restaurante
  // y solo las pendientes: antes se descargaban TODAS las reservas cada 5
  // minutos, también gestionando el guidebook.
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pending-reservations', currentRestaurant?.id],
    queryFn: async () => {
      const response = await apiClient.getReservationsList(currentRestaurant!.id, { status: 'pending' });
      return response?.reservations?.length ?? 0;
    },
    enabled: !isAgency && !!currentRestaurant?.id,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  // Cierre de sesión por inactividad: aviso 60 s antes, fuera a los 15 min.
  const { timeUntilLogout } = useIdleDetection({
    idleTimeout: 5 * 60 * 1000,
    logoutTimeout: 15 * 60 * 1000,
    onActive: () => setShowIdleWarning(false),
    onLogout: () => {
      logout();
      navigate('/login');
    },
  });

  useEffect(() => {
    if (timeUntilLogout <= 60 && timeUntilLogout > 0) setShowIdleWarning(true);
  }, [timeUntilLogout]);

  // Una entrada se oculta solo si su feature está a false; el superadmin lo ve todo.
  const menuItems = useMemo(() => {
    if (isAgency) return agencyNav(!!user?.is_superadmin);
    const features = parseFeatures(currentRestaurant?.features);
    return restaurantNav.filter((item) =>
      !item.featureKey || user?.is_superadmin || features[item.featureKey] !== false);
  }, [isAgency, user?.is_superadmin, currentRestaurant?.features]);

  const restaurants: any[] = user?.restaurants ?? [];
  const agencies: any[] = user?.agencies ?? [];

  const modeButtonSx = (active: boolean) => ({
    py: 0.7,
    fontSize: '0.72rem',
    fontWeight: active ? 700 : 500,
    bgcolor: active ? 'secondary.main' : 'transparent',
    color: active ? 'secondary.contrastText' : onSea.muted,
    '&:hover': { bgcolor: active ? 'secondary.dark' : onSea.hover },
  });

  const drawer = (
    <div>
      <Toolbar sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
        <Box component="img" src="/logo.png" alt="VisualTaste" sx={{ width: 72, height: 72 }} />
      </Toolbar>

      {/* Modo: lo primero, porque decide qué selector y qué menú salen debajo. */}
      {hasRestaurants && hasAgencies && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Box sx={{ display: 'flex', gap: 0.5, p: 0.5, bgcolor: onSea.hover }}>
            <Button size="small" fullWidth startIcon={<RestaurantIcon sx={{ fontSize: 16 }} />}
              onClick={() => { setAdminMode('restaurant'); navigate('/'); }} sx={modeButtonSx(!isAgency)}>
              Restaurantes
            </Button>
            <Button size="small" fullWidth startIcon={<ApartmentIcon sx={{ fontSize: 16 }} />}
              onClick={() => { setAdminMode('agency'); navigate('/guide'); }} sx={modeButtonSx(isAgency)}>
              Guidebook
            </Button>
          </Box>
        </Box>
      )}

      {/* Selector de restaurante: solo en modo restaurante y con más de uno. */}
      {!isAgency && restaurants.length > 1 && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Typography variant="overline" sx={{ ...sectionLabelSx, px: 0, pt: 0 }}>Restaurante</Typography>
          <ListItemButton
            onClick={() => setRestaurantDialogOpen(true)}
            sx={{ border: `1px solid ${onSea.line}`, py: 1, '&:hover': { bgcolor: onSea.hover } }}
          >
            {currentRestaurant?.logo_url ? (
              <Avatar src={currentRestaurant.logo_url} alt={currentRestaurant.name} sx={{ width: 24, height: 24, mr: 1 }} />
            ) : (
              <RestaurantIcon sx={{ mr: 1, fontSize: 20, color: onSea.muted }} />
            )}
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: onSea.text }}>
                {currentRestaurant?.name || 'Seleccionar restaurante'}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: onSea.faint }}>
                Cambiar ({restaurants.length})
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
            restaurants={restaurants}
            currentRestaurantId={currentRestaurant?.id}
          />
        </Box>
      )}

      {/* Selector de agencia: solo en modo agencia y con más de una. */}
      {isAgency && agencies.length > 1 && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Typography variant="overline" sx={{ ...sectionLabelSx, px: 0, pt: 0 }}>Agencia</Typography>
          <FormControl size="small" fullWidth>
            <Select
              value={currentAgency?.id || ''}
              onChange={(e) => switchAgency(e.target.value)}
              sx={{
                bgcolor: onSea.hover,
                color: onSea.text,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: onSea.line },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'secondary.light' },
                '& .MuiSvgIcon-root': { color: onSea.muted },
              }}
            >
              {agencies.map((agency) => (
                <MenuItem key={agency.id} value={agency.id}>{agency.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      <List>
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          const showSectionLabel = !!item.section && item.section !== menuItems[index - 1]?.section;
          return (
            <Fragment key={item.path}>
              {showSectionLabel && (
                <Typography variant="overline" sx={sectionLabelSx}>{item.section}</Typography>
              )}
              <ListItem disablePadding onClick={isMobile ? () => setMobileOpen(false) : undefined}>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  selected={isActive}
                  sx={{
                    borderLeft: '4px solid',
                    borderLeftColor: isActive ? 'secondary.light' : 'transparent',
                    '&:hover': { bgcolor: onSea.hover },
                    '&.Mui-selected, &.Mui-selected:hover': { bgcolor: onSea.active },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: isActive ? onSea.text : onSea.muted }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{ color: isActive ? onSea.text : onSea.muted, fontWeight: isActive ? 700 : 500 }}
                  />
                </ListItemButton>
              </ListItem>
            </Fragment>
          );
        })}
      </List>
    </div>
  );

  // Título de la barra superior: el restaurante o la agencia en la que se está.
  const context = isAgency ? currentAgency : currentRestaurant;

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar position="fixed" sx={{ width: { md: `calc(100% - ${drawerWidth}px)` }, ml: { md: `${drawerWidth}px` } }}>
        <Toolbar>
          <IconButton color="inherit" aria-label="Abrir menú" edge="start" onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
            {context && (
              <>
                {!isAgency && currentRestaurant?.logo_url && (
                  <Avatar src={currentRestaurant.logo_url} alt={currentRestaurant.name} sx={{ width: 32, height: 32, mr: 1.5 }} />
                )}
                <Typography variant="h6" noWrap component="div" sx={{ fontFamily: '"Newsreader", serif', fontWeight: 500 }}>
                  {context.name}
                </Typography>
              </>
            )}
          </Box>

          {!isAgency && currentRestaurant && (
            <Tooltip title={pendingCount > 0 ? `${pendingCount} reservas pendientes` : 'Sin reservas pendientes'}>
              <IconButton color="inherit" component={Link} to="/reservations" aria-label="Reservas pendientes">
                <Badge badgeContent={pendingCount} color="warning" max={99}>
                  <EventAvailable sx={{ color: pendingCount > 0 ? 'warning.dark' : 'inherit' }} />
                </Badge>
              </IconButton>
            </Tooltip>
          )}
          <AccountMenu />
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }} aria-label="Navegación">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, overflowX: 'hidden' } }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` }, overflow: 'auto' }}
      >
        <Toolbar /> {/* Espaciador bajo la AppBar fija */}
        <Suspense fallback={<LinearProgress />}>
          <Outlet />
        </Suspense>
      </Box>

      <Snackbar open={showIdleWarning} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="warning" variant="filled" sx={{ width: '100%' }} onClose={() => setShowIdleWarning(false)}>
          Sesión inactiva. Se cerrará en {timeUntilLogout} segundos. Mueve el ratón para continuar.
        </Alert>
      </Snackbar>
    </Box>
  );
}
