// apps/client/src/components/layout/ClientLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Container, IconButton } from '@mui/material';
import { Home, Search, Favorite } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

const ClientLayout: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography 
            variant="h6" 
            component={RouterLink}
            to="/"
            sx={{ 
              flexGrow: 1, 
              color: 'inherit',
              textDecoration: 'none'
            }}
          >
            VisualTaste
          </Typography>
          
          <IconButton 
            color="inherit" 
            component={RouterLink}
            to="/"
          >
            <Home />
          </IconButton>
          
          <IconButton 
            color="inherit"
            component={RouterLink}
            to="/search"
          >
            <Search />
          </IconButton>
          
          <IconButton 
            color="inherit"
            component={RouterLink}
            to="/favorites"
          >
            <Favorite />
          </IconButton>
        </Toolbar>
      </AppBar>
      
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>
      
      <Box 
        component="footer" 
        sx={{ 
          py: 3, 
          mt: 'auto', 
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} VisualTaste. Todos los derechos reservados.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default ClientLayout;