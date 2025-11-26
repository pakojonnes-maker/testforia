// apps/client/src/components/landing/section/HeroSection.tsx - ULTRA MODERNO CON VIDEO
import { Box, Typography, Button, Container, Stack, IconButton, AppBar, Toolbar } from '@mui/material';
import { ArrowForward, PlayCircle, Restaurant, Menu as MenuIcon, Close } from '@mui/icons-material';
import { useState } from 'react';

interface Props {
  restaurant: any;
  translations: any;
  theme: any;
  variant: string;
  config: any;
}

export default function HeroSection({ restaurant, translations, theme, variant, config }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const height = config.height || '100vh';
  const ctaText = config.cta_text || 'Explorar Menú';
  
  // Video URL - puedes usar el cover_image_url si es video, o un video por defecto
  const videoUrl = config.video_url || 'https://cdn.coverr.co/videos/coverr-cooking-delicious-food-5670/1080p.mp4';

  return (
    <>
      {/* Modern Navbar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'all 0.3s ease',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
            {/* Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 45,
                  height: 45,
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${theme.primary_color || '#FF6B6B'}, ${theme.secondary_color || '#4ECDC4'})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}
              >
                <Restaurant sx={{ fontSize: 24, color: '#fff' }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  color: '#fff',
                  fontWeight: 800,
                  letterSpacing: '-0.5px',
                  textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                }}
              >
                {restaurant.name}
              </Typography>
            </Box>

            {/* Desktop Menu */}
            <Stack
              direction="row"
              spacing={1}
              sx={{
                display: { xs: 'none', md: 'flex' },
              }}
            >
              {['Menú', 'Sobre Nosotros', 'Galería', 'Contacto'].map((item) => (
                <Button
                  key={item}
                  href={`#${item.toLowerCase().replace(' ', '-')}`}
                  sx={{
                    color: 'rgba(255,255,255,0.9)',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 2,
                    py: 1,
                    borderRadius: '10px',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'rgba(255,255,255,0.15)',
                      color: '#fff',
                    },
                  }}
                >
                  {item}
                </Button>
              ))}
            </Stack>

            {/* Mobile Menu Button */}
            <IconButton
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              sx={{
                display: { xs: 'flex', md: 'none' },
                color: '#fff',
              }}
            >
              {mobileMenuOpen ? <Close /> : <MenuIcon />}
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <Box
          onClick={() => setMobileMenuOpen(false)}
          sx={{
            position: 'fixed',
            top: 70,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(20px)',
            zIndex: 1200,
            display: { xs: 'flex', md: 'none' },
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            animation: 'fadeIn 0.3s ease',
            '@keyframes fadeIn': {
              from: { opacity: 0 },
              to: { opacity: 1 },
            },
          }}
        >
          {['Menú', 'Sobre Nosotros', 'Galería', 'Contacto'].map((item) => (
            <Button
              key={item}
              href={`#${item.toLowerCase().replace(' ', '-')}`}
              sx={{
                color: '#fff',
                fontSize: '1.5rem',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': {
                  color: theme.primary_color || '#FF6B6B',
                },
              }}
            >
              {item}
            </Button>
          ))}
        </Box>
      )}

      {/* Hero Section with Video */}
      <Box
        id="hero"
        sx={{
          height,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Video Background */}
        <Box
          component="video"
          autoPlay
          muted
          loop
          playsInline
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            minWidth: '100%',
            minHeight: '100%',
            width: 'auto',
            height: 'auto',
            transform: 'translate(-50%, -50%)',
            objectFit: 'cover',
            zIndex: 0,
          }}
        >
          <source src={videoUrl} type="video/mp4" />
        </Box>

        {/* Gradient Overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(135deg, ${theme.primary_color}dd 0%, ${theme.secondary_color}dd 100%)`,
            mixBlendMode: 'multiply',
            zIndex: 1,
          }}
        />

        {/* Animated particles overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            zIndex: 2,
            animation: 'moveGradient 15s ease infinite',
            '@keyframes moveGradient': {
              '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
              '50%': { transform: 'translate(50px, 50px) scale(1.1)' },
            },
          }}
        />

        {/* Content */}
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 3 }}>
          <Stack spacing={5} alignItems="center" textAlign="center">
            {/* Badge */}
            <Box
              sx={{
                px: 3,
                py: 1,
                borderRadius: '50px',
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                animation: 'slideDown 0.8s ease-out',
                '@keyframes slideDown': {
                  from: { opacity: 0, transform: 'translateY(-30px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#4ade80',
                  boxShadow: '0 0 10px #4ade80',
                  animation: 'pulse 2s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                  },
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                }}
              >
                Abierto Ahora
              </Typography>
            </Box>

            {/* Main Title */}
            <Typography
              variant="h1"
              sx={{
                color: '#fff',
                fontWeight: 900,
                fontSize: { xs: '3rem', sm: '4rem', md: '6rem' },
                textShadow: '0 10px 40px rgba(0,0,0,0.5)',
                fontFamily: theme.font_accent || 'Playfair Display, serif',
                letterSpacing: '-0.03em',
                lineHeight: 1,
                animation: 'fadeInUp 1s ease-out 0.2s both',
                '@keyframes fadeInUp': {
                  from: { opacity: 0, transform: 'translateY(50px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              {config.title_override || restaurant.name}
            </Typography>

            {/* Subtitle */}
            <Typography
              variant="h4"
              sx={{
                color: 'rgba(255,255,255,0.95)',
                fontWeight: 400,
                fontSize: { xs: '1.3rem', md: '1.8rem' },
                maxWidth: '800px',
                textShadow: '0 4px 20px rgba(0,0,0,0.4)',
                lineHeight: 1.5,
                animation: 'fadeInUp 1s ease-out 0.4s both',
              }}
            >
              {config.subtitle_override || translations.short_description || restaurant.description || 'Una experiencia gastronómica inolvidable'}
            </Typography>

            {/* CTA Buttons */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{
                animation: 'fadeInUp 1s ease-out 0.6s both',
              }}
            >
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                href="#menu"
                sx={{
                  px: 5,
                  py: 2,
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  borderRadius: '50px',
                  background: '#fff',
                  color: theme.primary_color || '#FF6B6B',
                  textTransform: 'none',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                  '&:hover': {
                    background: '#fff',
                    transform: 'translateY(-4px) scale(1.02)',
                    boxShadow: '0 15px 50px rgba(0,0,0,0.4)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {ctaText}
              </Button>

              <Button
                variant="outlined"
                size="large"
                startIcon={<PlayCircle />}
                href={`/${restaurant.slug}/r`}
                sx={{
                  px: 5,
                  py: 2,
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  borderRadius: '50px',
                  borderColor: 'rgba(255,255,255,0.6)',
                  borderWidth: '2px',
                  color: '#fff',
                  textTransform: 'none',
                  backdropFilter: 'blur(10px)',
                  background: 'rgba(255,255,255,0.1)',
                  '&:hover': {
                    borderColor: '#fff',
                    borderWidth: '2px',
                    background: 'rgba(255,255,255,0.2)',
                    transform: 'translateY(-4px) scale(1.02)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                Ver Reels
              </Button>
            </Stack>

            {/* Stats */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 3, sm: 6 }}
              sx={{
                mt: 4,
                animation: 'fadeInUp 1s ease-out 0.8s both',
              }}
            >
              {[
                { value: '10K+', label: 'Clientes' },
                { value: '4.9★', label: 'Rating' },
                { value: '15+', label: 'Años' },
              ].map((stat, index) => (
                <Box key={index} sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h3"
                    sx={{
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '2.5rem',
                      mb: 0.5,
                      textShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: 'rgba(255,255,255,0.8)',
                      fontWeight: 600,
                      textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                    }}
                  >
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Stack>
        </Container>

        {/* Scroll Indicator */}
        {config.show_scroll_indicator !== false && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 40,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 3,
              animation: 'bounce 2s infinite',
              '@keyframes bounce': {
                '0%, 100%': { transform: 'translateX(-50%) translateY(0)' },
                '50%': { transform: 'translateX(-50%) translateY(-15px)' },
              },
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 52,
                border: '3px solid rgba(255,255,255,0.5)',
                borderRadius: '20px',
                display: 'flex',
                justifyContent: 'center',
                pt: 1,
                backdropFilter: 'blur(10px)',
                background: 'rgba(255,255,255,0.1)',
              }}
            >
              <Box
                sx={{
                  width: 4,
                  height: 10,
                  background: '#fff',
                  borderRadius: '2px',
                  animation: 'scrollDot 2s infinite',
                  '@keyframes scrollDot': {
                    '0%': { opacity: 1, transform: 'translateY(0)' },
                    '100%': { opacity: 0, transform: 'translateY(25px)' },
                  },
                }}
              />
            </Box>
          </Box>
        )}
      </Box>
    </>
  );
}
