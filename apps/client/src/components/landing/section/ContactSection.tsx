// apps/client/src/components/landing/section/ContactSection.tsx
import { Box, Typography, Container, Grid, Stack, Button, IconButton } from '@mui/material';
import {
  Phone,
  Email,
  Instagram,
  Facebook,
  Twitter,
  WhatsApp,
  Restaurant,
  ArrowForward,
} from '@mui/icons-material';

interface Props {
  restaurant: any;
  translations: any;
  theme: any;
  variant: string;
  config: any;
  details: any;
}

export default function ContactSection({ restaurant, translations, theme, variant, config, details }: Props) {
  const socialLinks = [
    { icon: <Instagram />, url: details?.instagram_url, color: '#E4405F' },
    { icon: <Facebook />, url: details?.facebook_url, color: '#1877F2' },
    { icon: <Twitter />, url: details?.twitter_url, color: '#1DA1F2' },
    { icon: <WhatsApp />, url: details?.whatsapp_number ? `https://wa.me/${details.whatsapp_number}` : null, color: '#25D366' },
  ].filter(link => link.url);

  return (
    <Box
      id="contact"
      sx={{
        py: { xs: 10, md: 14 },
        background: `linear-gradient(135deg, ${theme.primary_color || '#FF6B6B'} 0%, ${theme.secondary_color || '#4ECDC4'} 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated background pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          animation: 'movePattern 20s linear infinite',
          '@keyframes movePattern': {
            '0%': { backgroundPosition: '0 0' },
            '100%': { backgroundPosition: '60px 60px' },
          },
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={6} alignItems="center">
          {/* Left Content */}
          <Grid item xs={12} md={7}>
            <Stack spacing={4}>
              <Box>
                <Box
                  sx={{
                    width: 70,
                    height: 70,
                    borderRadius: '18px',
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  }}
                >
                  <Restaurant sx={{ fontSize: 36, color: '#fff' }} />
                </Box>

                <Typography
                  variant="h2"
                  sx={{
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: { xs: '2.5rem', md: '4rem' },
                    mb: 2,
                    letterSpacing: '-0.02em',
                    textShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  }}
                >
                  {config.title_override || '¿Listo para una experiencia única?'}
                </Typography>

                <Typography
                  variant="h6"
                  sx={{
                    color: 'rgba(255,255,255,0.95)',
                    fontWeight: 400,
                    fontSize: { xs: '1.1rem', md: '1.3rem' },
                    lineHeight: 1.6,
                    textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  }}
                >
                  {config.subtitle_override || 'Reserva tu mesa ahora y descubre el sabor auténtico'}
                </Typography>
              </Box>

              {/* Action Buttons */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Phone />}
                  href={`tel:${restaurant.phone}`}
                  sx={{
                    px: 4,
                    py: 1.8,
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    borderRadius: '50px',
                    background: '#fff',
                    color: theme.primary_color || '#FF6B6B',
                    textTransform: 'none',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                    '&:hover': {
                      background: '#fff',
                      transform: 'translateY(-3px)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Llamar ahora
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  endIcon={<ArrowForward />}
                  href={`mailto:${restaurant.email}`}
                  sx={{
                    px: 4,
                    py: 1.8,
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    borderRadius: '50px',
                    borderColor: 'rgba(255,255,255,0.5)',
                    color: '#fff',
                    textTransform: 'none',
                    backdropFilter: 'blur(10px)',
                    background: 'rgba(255,255,255,0.1)',
                    '&:hover': {
                      borderColor: '#fff',
                      background: 'rgba(255,255,255,0.2)',
                      transform: 'translateY(-3px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Enviar email
                </Button>
              </Stack>

              {/* Social Links */}
              {socialLinks.length > 0 && (
                <Box>
                  <Typography
                    variant="body1"
                    sx={{
                      color: 'rgba(255,255,255,0.9)',
                      fontWeight: 600,
                      mb: 2,
                      textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                    }}
                  >
                    Síguenos en redes sociales
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    {socialLinks.map((social, index) => (
                      <IconButton
                        key={index}
                        href={social.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          width: 56,
                          height: 56,
                          background: 'rgba(255,255,255,0.2)',
                          backdropFilter: 'blur(10px)',
                          border: '2px solid rgba(255,255,255,0.3)',
                          color: '#fff',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            background: '#fff',
                            color: social.color,
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                          },
                        }}
                      >
                        {social.icon}
                      </IconButton>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Grid>

          {/* Right Stats */}
          <Grid item xs={12} md={5}>
            <Stack spacing={3}>
              {[
                { label: 'Clientes Satisfechos', value: '10K+' },
                { label: 'Platos Servidos', value: '50K+' },
                { label: 'Años de Experiencia', value: '15+' },
              ].map((stat, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    animation: `fadeInRight 0.6s ease-out ${index * 0.1}s both`,
                    '@keyframes fadeInRight': {
                      from: { opacity: 0, transform: 'translateX(30px)' },
                      to: { opacity: 1, transform: 'translateX(0)' },
                    },
                    '&:hover': {
                      transform: 'translateX(-8px)',
                      background: 'rgba(255,255,255,0.25)',
                    },
                  }}
                >
                  <Typography
                    variant="h2"
                    sx={{
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '3rem',
                      mb: 1,
                      textShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: 'rgba(255,255,255,0.9)',
                      fontWeight: 600,
                      textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                    }}
                  >
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
