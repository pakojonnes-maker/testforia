// apps/client/src/components/landing/section/LocationSection.tsx
import { Box, Typography, Container, Grid, Stack, Card, CardContent } from '@mui/material';
import { LocationOn, Phone, Schedule, Directions } from '@mui/icons-material';

interface Props {
  restaurant: any;
  translations: any;
  theme: any;
  variant: string;
  config: any;
  details: any;
}

export default function LocationSection({ restaurant, translations: _translations, theme, variant: _variant, config, details }: Props) {
  return (
    <Box
      id="location"
      sx={{
        py: { xs: 8, md: 12 },
        background: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative blob */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '-10%',
          left: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.primary_color}15 0%, transparent 70%)`,
          filter: 'blur(60px)',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <Stack spacing={2} alignItems="center" textAlign="center" sx={{ mb: 8 }}>
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${theme.primary_color || '#FF6B6B'}, ${theme.secondary_color || '#4ECDC4'})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            }}
          >
            <LocationOn sx={{ fontSize: 32, color: '#fff' }} />
          </Box>

          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              background: `linear-gradient(135deg, ${theme.primary_color || '#FF6B6B'}, ${theme.secondary_color || '#4ECDC4'})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
            }}
          >
            {config.title_override || 'Encuéntranos'}
          </Typography>

          <Typography
            variant="h6"
            sx={{
              color: '#666',
              maxWidth: '600px',
              fontWeight: 400,
              lineHeight: 1.6,
            }}
          >
            {config.subtitle_override || 'Ven a visitarnos'}
          </Typography>
        </Stack>

        <Grid container spacing={4}>
          {/* Info Cards */}
          <Grid item xs={12} md={4}>
            <Stack spacing={3}>
              {/* Address Card */}
              <Card
                sx={{
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: 'none',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '12px',
                      background: `${theme.primary_color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                    }}
                  >
                    <LocationOn sx={{ color: theme.primary_color || '#FF6B6B' }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    Dirección
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.6 }}>
                    {restaurant.address || 'Calle Principal 123'}
                    <br />
                    {restaurant.city && `${restaurant.city}, ${restaurant.country}`}
                  </Typography>
                </CardContent>
              </Card>

              {/* Phone Card */}
              <Card
                sx={{
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: 'none',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '12px',
                      background: `${theme.secondary_color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                    }}
                  >
                    <Phone sx={{ color: theme.secondary_color || '#4ECDC4' }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    Teléfono
                  </Typography>
                  <Typography
                    variant="body2"
                    component="a"
                    href={`tel:${restaurant.phone}`}
                    sx={{
                      color: theme.primary_color || '#FF6B6B',
                      textDecoration: 'none',
                      fontWeight: 600,
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {restaurant.phone || '+34 123 456 789'}
                  </Typography>
                </CardContent>
              </Card>

              {/* Hours Card */}
              <Card
                sx={{
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: 'none',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '12px',
                      background: `${theme.accent_color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                    }}
                  >
                    <Schedule sx={{ color: theme.accent_color || '#FFE66D' }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    Horario
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.8 }}>
                    Lunes - Viernes: 12:00 - 23:00
                    <br />
                    Sábado - Domingo: 13:00 - 00:00
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* Map */}
          <Grid item xs={12} md={8}>
            <Box
              sx={{
                height: { xs: 400, md: '100%' },
                minHeight: 500,
                borderRadius: 4,
                overflow: 'hidden',
                boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
                position: 'relative',
                background: '#f0f0f0',
              }}
            >
              {details?.google_maps_url ? (
                <iframe
                  src={details.google_maps_url}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                />
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <Directions sx={{ fontSize: 80, color: '#ccc' }} />
                  <Typography variant="h6" sx={{ color: '#999' }}>
                    Mapa no disponible
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
