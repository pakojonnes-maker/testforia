// apps/client/src/components/landing/section/AboutSection.tsx
import { Box, Typography, Container, Grid, Stack, Chip } from '@mui/material';
import { CheckCircle, EmojiEvents, Favorite, LocalDining } from '@mui/icons-material';

interface Props {
  restaurant: any;
  translations: any;
  theme: any;
  variant: string;
  config: any;
}

export default function AboutSection({ restaurant, translations, theme, variant, config }: Props) {
  const imagePosition = config.image_position || 'right';

  const features = [
    { icon: <EmojiEvents />, title: 'Calidad Premium', description: 'Ingredientes de primera calidad' },
    { icon: <Favorite />, title: 'Recetas Auténticas', description: 'Tradición en cada plato' },
    { icon: <LocalDining />, title: 'Experiencia Única', description: 'Servicio excepcional' },
  ];

  return (
    <Box
      id="about"
      sx={{
        py: { xs: 8, md: 12 },
        background: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          left: '-10%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.secondary_color}10 0%, transparent 70%)`,
          filter: 'blur(80px)',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={6} alignItems="center">
          {/* Text Content */}
          <Grid item xs={12} md={6} order={{ xs: 2, md: imagePosition === 'right' ? 1 : 2 }}>
            <Stack spacing={4}>
              <Box>
                <Chip
                  label="Sobre Nosotros"
                  sx={{
                    mb: 2,
                    background: `${theme.primary_color}15`,
                    color: theme.primary_color || '#FF6B6B',
                    fontWeight: 600,
                    borderRadius: '8px',
                    px: 2,
                  }}
                />
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    color: '#1a1a1a',
                    mb: 3,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                  }}
                >
                  {config.title_override || restaurant.name}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: '#666',
                    fontWeight: 400,
                    lineHeight: 1.8,
                    fontSize: '1.1rem',
                  }}
                >
                  {config.description_override ||
                    translations.long_description ||
                    restaurant.description ||
                    'Descubre una experiencia gastronómica única donde la tradición se encuentra con la innovación.'}
                </Typography>
              </Box>

              {/* Features */}
              <Stack spacing={3}>
                {features.map((feature, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      gap: 2,
                      p: 3,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                      border: '1px solid #f0f0f0',
                      transition: 'all 0.3s ease',
                      animation: `fadeInLeft 0.6s ease-out ${index * 0.1}s both`,
                      '@keyframes fadeInLeft': {
                        from: { opacity: 0, transform: 'translateX(-30px)' },
                        to: { opacity: 1, transform: 'translateX(0)' },
                      },
                      '&:hover': {
                        transform: 'translateX(8px)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                        borderColor: theme.primary_color || '#FF6B6B',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '12px',
                        background: `linear-gradient(135deg, ${theme.primary_color || '#FF6B6B'}, ${theme.secondary_color || '#4ECDC4'})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#fff',
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: '#1a1a1a' }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.6 }}>
                        {feature.description}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Grid>

          {/* Image */}
          <Grid item xs={12} md={6} order={{ xs: 1, md: imagePosition === 'right' ? 2 : 1 }}>
            <Box
              sx={{
                position: 'relative',
                borderRadius: 4,
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                animation: 'fadeInUp 0.8s ease-out',
                '@keyframes fadeInUp': {
                  from: { opacity: 0, transform: 'translateY(40px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              <Box
                component="img"
                src={restaurant.cover_image_url || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800'}
                alt={restaurant.name}
                sx={{
                  width: '100%',
                  height: { xs: 300, md: 500 },
                  objectFit: 'cover',
                  transition: 'transform 0.6s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },
                }}
              />
              {/* Overlay decoration */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '50%',
                  background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 100%)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  p: 4,
                }}
              >
                <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
                  {restaurant.name}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
