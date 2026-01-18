import { Box, Container, Typography, Button, Grid, Stack, Accordion, AccordionSummary, AccordionDetails, Modal, IconButton } from '@mui/material';
import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import TranslateIcon from '@mui/icons-material/Translate';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupsIcon from '@mui/icons-material/Groups';
import CloseIcon from '@mui/icons-material/Close';

// ============================================================================
// DESIGN TOKENS
// ============================================================================
const colors = {
  bg: '#0B1414', // Deeper, almost black-green for better contrast
  bgCard: '#132422', // Richer Emerald
  accent: '#D4AF37', // Metallic Gold
  accentLight: '#F3E5AB', // Champagne
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.65)',
  border: 'rgba(212, 175, 55, 0.2)', // Subtle gold border
  success: '#10B981',
  danger: '#EF4444',
};

const gradients = {
  hero: 'radial-gradient(circle at 50% -20%, rgba(212, 175, 55, 0.15), transparent 70%)',
  card: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
  button: `linear-gradient(135deg, #D4AF37 0%, #F5D094 50%, #D4AF37 100%)`, // Metallic Gold Effect
  goldText: `linear-gradient(135deg, #F3E5AB 0%, #D4AF37 100%)`, // Champagne to Gold
  glass: 'rgba(19, 36, 34, 0.7)',
};

const shadows = {
  glow: `0 0 40px -10px rgba(212, 175, 55, 0.3)`,
  card: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
};

// ============================================================================
// ANIMATED COUNTER HOOK
// ============================================================================
function useCounter(end: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!startOnView || !isInView) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, isInView, startOnView]);

  return { count, ref };
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Reusable Gold Button for consistency
const GoldButton = ({ children, sx = {}, ...props }: any) => (
  <Button
    variant="contained"
    size="large"
    sx={{
      background: gradients.button,
      color: '#000', // ALWAYS Black on Gold
      fontWeight: 800,
      letterSpacing: '0.02em',
      px: 4,
      py: 1.5,
      borderRadius: '8px', // Sharper corners for modern look
      textTransform: 'none',
      fontSize: '1rem',
      boxShadow: shadows.glow,
      border: '1px solid rgba(255,255,255,0.2)', // Metallic rim
      backgroundSize: '200% auto',
      transition: 'all 0.5s ease',
      '&:hover': {
        backgroundPosition: 'right center',
        transform: 'translateY(-2px)',
        boxShadow: `0 10px 40px -10px rgba(212, 175, 55, 0.5)`,
      },
      ...sx,
    }}
    {...props}
  >
    {children}
  </Button>
);

// Reusable Section Title
const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 10 }, px: { xs: 2, md: 0 } }}>
    <Typography
      variant="overline"
      sx={{
        background: gradients.goldText,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontWeight: 800,
        letterSpacing: { xs: '0.1em', md: '0.2em' },
        fontSize: { xs: '0.7rem', sm: '0.875rem' },
        mb: 2,
        display: 'inline-block',
      }}
    >
      {title}
    </Typography>
    <Typography
      variant="h2"
      sx={{
        fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3.5rem' },
        fontWeight: 700,
        color: colors.text,
        lineHeight: 1.1,
      }}
    >
      {subtitle}
    </Typography>
  </Box>
);

// ============================================================================
// HERO SECTION
// ============================================================================
function HeroSection() {
  return (
    <Box
      component="section"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: colors.bg,
      }}
    >
      <title>VisualTaste | Carta Digital QR para Restaurantes - Menú con Video</title>
      <meta name="description" content="Crea tu Carta Digital QR para restaurantes gratis. La única carta digital interactiva con vídeo 4K, traducción IA y pedidos. Aumenta tus ventas hoy." />

      {/* Background Noise/Texture */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.4,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }}
      />

      {/* Glow Effects */}
      <Box
        sx={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '60vw',
          height: '60vw',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 60%)',
          filter: 'blur(100px)',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: { xs: 12, md: 0 } }}>
        <Grid container spacing={8} alignItems="center">
          {/* Left: Copy */}
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Box
                sx={{
                  display: 'inline-block',
                  mb: 3,
                  px: 2,
                  py: 1,
                  borderRadius: '50px',
                  background: 'rgba(212, 175, 55, 0.1)',
                  border: `1px solid ${colors.border}`,
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Typography variant="caption" sx={{ color: colors.accentLight, fontWeight: 700, letterSpacing: '0.1em' }}>
                  ✨ LA CARTA DIGITAL QUE VENDE
                </Typography>
              </Box>

              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2.2rem', sm: '3rem', md: '4rem', lg: '5rem' },
                  fontWeight: 800,
                  lineHeight: 1.1,
                  color: colors.text,
                  mb: { xs: 3, md: 4 },
                  letterSpacing: '-0.02em',
                }}
              >
                La Carta Digital QR <Box component="br" sx={{ display: { xs: 'none', sm: 'block' } }} />
                <Box
                  component="span"
                  sx={{
                    background: gradients.goldText,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    display: 'block',
                  }}
                >
                  que Vende por Ti.
                </Box>
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  color: colors.textMuted,
                  fontWeight: 400,
                  fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
                  lineHeight: 1.6,
                  mb: { xs: 4, md: 6 },
                  maxWidth: 540,
                }}
              >
                Transforma tu PDF en una <strong>Carta Digital Interactiva</strong>.
                Tus platos en vídeo 4K, traducción automática y <strong>Menú QR</strong> sin contacto.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                <GoldButton onClick={() => window.open('https://wa.me/34633747033', '_blank')}>
                  Contactar
                </GoldButton>
                <Button
                  variant="text"
                  size="large"
                  startIcon={<PlayArrowRoundedIcon />}
                  onClick={() => window.open('https://menu.visualtastes.com/xpecado', '_blank')}
                  sx={{
                    color: colors.text,
                    fontWeight: 600,
                    px: 3,
                    fontSize: '1rem',
                    '&:hover': { color: colors.accent },
                  }}
                >
                  Ver Demo en Vivo
                </Button>
              </Stack>
            </motion.div>
          </Grid>

          {/* Right: Phone Mockup */}
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, delay: 0.2, type: 'spring' }}
            >
              <Box
                sx={{
                  position: 'relative',
                  maxWidth: 340,
                  mx: 'auto',
                }}
              >
                {/* Phone Frame */}
                <Box
                  sx={{
                    borderRadius: '48px',
                    border: '8px solid #1A1A1A',
                    overflow: 'hidden',
                    aspectRatio: '9/19.5',
                    boxShadow: `0 50px 100px -30px rgba(0,0,0,0.9), ${shadows.glow}`,
                    background: '#000',
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  <Box
                    component="video"
                    autoPlay
                    muted
                    loop
                    playsInline
                    src="https://visualtasteworker.franciscotortosaestudios.workers.dev/media/System/landing/video_principal.mp4"
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'contrast(1.1)',
                    }}
                  />
                </Box>

                {/* Decorative Elements around phone */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: '10%',
                    right: '-40px',
                    width: 100,
                    height: 100,
                    background: 'radial-gradient(circle, rgba(212, 175, 55, 0.2), transparent 70%)',
                    zIndex: 1,
                  }}
                />
              </Box>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

// ============================================================================
// STATS SECTION
// ============================================================================
function StatsSection() {
  // Using the same stats array, but styling enhanced
  const stats = [
    { value: 20, suffix: '%', label: 'Más Reseñas' },
    { value: 20, suffix: '%', label: 'Menos Espera' },
    { value: 15, suffix: '%', label: '+ Ventas (Platos Rentables)' },
    { value: 22, suffix: '', label: 'Idiomas Nativos' },
  ];

  return (
    <Box
      component="section"
      sx={{
        py: 10,
        background: 'rgba(255,255,255,0.02)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} justifyContent="center">
          {stats.map((stat, index) => {
            const { count, ref } = useCounter(stat.value);
            return (
              <Grid item xs={6} md={3} key={index}>
                <Box ref={ref} sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontSize: { xs: '3rem', md: '4rem' },
                      fontWeight: 800,
                      background: gradients.goldText,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 1,
                    }}
                  >
                    +{count}{stat.suffix}
                  </Typography>
                  <Typography variant="overline" sx={{ color: colors.textMuted, letterSpacing: '0.1em' }}>
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}

// ============================================================================
// FEATURES SECTION (Premium Cards)
// ============================================================================
// ============================================================================
// BUSINESS VALUES SECTION (Storytelling)
// ============================================================================
function BusinessValuesSection() {
  const values = [
    {
      icon: <TranslateIcon sx={{ fontSize: 40, color: colors.accent }} />,
      title: 'Solución Multilingüe & Crisis de Personal',
      subtitle: 'Tu carta "habla" 14 idiomas por ti.',
      description: 'En zonas turísticas, encontrar personal políglota es difícil y caro. VisualTaste elimina la barrera del idioma. El cliente entiende el plato perfectamente (vídeo + traducción), reduciendo tiempos de explicación y errores en comanda.',
      points: ['Onboarding de camareros inmediato', 'Cero malentendidos con turistas', 'Experiencia fluida para el cliente'],
      video: 'https://visualtasteworker.franciscotortosaestudios.workers.dev/media/System/landing/idiomas.mp4',
    },
    {
      icon: <TrendingUpIcon sx={{ fontSize: 40, color: colors.accent }} />,
      title: 'Menu Engineering "Video-First"',
      subtitle: 'Vende lo que TE interesa vender.',
      description: 'No dejes que el cliente "solo mire precios". Con nuestra estructura de Reels, colocas tus platos de mayor margen al principio. Guía su decisión visualmente y dispara tu hit-rate en los productos estrella.',
      points: ['Carrusel de Videos (Reels) adictivo', 'Control total del orden de platos', 'Métrica de "Deseo" (Corazones) real'],
      video: 'https://visualtasteworker.franciscotortosaestudios.workers.dev/media/System/landing/orden.mp4',
      isLandscape: true, // ✅ Este video está en formato horizontal
    },
    {
      icon: <GroupsIcon sx={{ fontSize: 40, color: colors.accent }} />,
      title: 'Ecosistema de Crecimiento',
      subtitle: 'De comensal a seguidor leal.',
      description: 'Convierte el tráfico físico de tu local en reputación digital. Nuestra "Máquina de Reseñas" filtra inteligentemente el feedback: gestiona las críticas de forma privada para tu mejora interna y canaliza las experiencias positivas hacia Google, garantizando un aumento constante de valoraciones de 5 estrellas.',
      points: ['+20% en Reseñas de Google', 'Captura de Email/Teléfono', 'Redirección a Instagram'],
      video: 'https://visualtasteworker.franciscotortosaestudios.workers.dev/media/System/landing/rating.mp4',
    },
  ];

  return (
    <Box component="section" sx={{ py: { xs: 8, md: 16 }, background: colors.bg, px: { xs: 2, sm: 3, md: 0 } }}>
      <Container maxWidth="lg">
        <SectionHeader title="VALOR OPERATIVO" subtitle="Más que una carta, una herramienta de negocio" />

        <Stack spacing={{ xs: 8, md: 12 }}>
          {values.map((item, index) => (
            <Grid
              container
              spacing={{ xs: 0, md: 6 }} // ✅ No spacing on mobile to prevent shift
              key={index}
              alignItems="center"
              direction={{ xs: 'column', md: index % 2 === 1 ? 'row-reverse' : 'row' }}
              sx={{ px: { xs: 0, md: 0 }, width: '100%', m: 0 }} // ✅ Ensure container is reset
            >
              {/* Text Content */}
              <Grid item xs={12} md={6} sx={{ width: '100%', mb: { xs: 6, md: 0 } }}> {/* ✅ Manual spacing */}
                <Box
                  initial={{ opacity: 0, x: index % 2 === 1 ? 50 : -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  component={motion.div}
                  sx={{
                    textAlign: { xs: 'center', md: 'left' },
                    width: '100%',
                    maxWidth: '100%',
                  }}
                >
                  <Box sx={{
                    display: 'inline-flex',
                    p: 2,
                    borderRadius: '50%',
                    background: 'rgba(212, 175, 55, 0.1)',
                    mb: 3
                  }}>
                    {item.icon}
                  </Box>
                  <Typography variant="h3" sx={{
                    fontWeight: 700,
                    color: colors.text,
                    mb: 1,
                    fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2.5rem' },
                    wordBreak: 'break-word', // ✅ Prevent overflow
                    overflowWrap: 'break-word',
                  }}>
                    {item.title}
                  </Typography>
                  <Typography variant="h5" sx={{
                    color: colors.accent,
                    mb: 3,
                    fontWeight: 500,
                    fontSize: { xs: '0.9rem', sm: '1rem', md: '1.5rem' },
                  }}>
                    {item.subtitle}
                  </Typography>
                  <Typography variant="body1" sx={{
                    color: colors.textMuted,
                    lineHeight: 1.7,
                    mb: 4,
                    fontSize: { xs: '0.875rem', sm: '0.95rem', md: '1.1rem' },
                  }}>
                    {item.description}
                  </Typography>

                  <Stack spacing={1.5} sx={{ alignItems: { xs: 'center', md: 'flex-start' } }}>
                    {item.points.map((point, i) => (
                      <Stack key={i} direction="row" spacing={1.5} alignItems="center">
                        <CheckCircleOutlineIcon sx={{ color: colors.success, fontSize: { xs: 18, md: 20 } }} />
                        <Typography variant="body2" sx={{
                          color: colors.text,
                          fontWeight: 600,
                          fontSize: { xs: '0.8rem', md: '0.875rem' },
                        }}>
                          {point}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              </Grid>

              {/* Phone Mockup with Video */}
              <Grid item xs={12} md={6}>
                <Box
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6 }}
                  component={motion.div}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    py: { xs: 4, md: 0 },
                  }}
                >
                  {/* Phone Frame Container */}
                  <Box
                    sx={{
                      position: 'relative',
                      mx: 'auto', // ✅ Center the phone horizontally
                      // ✅ Larger size for landscape videos
                      maxWidth: (item as any).isLandscape
                        ? { xs: '90%', md: 500 }  // Wide for horizontal videos
                        : { xs: 220, md: 320 },   // Taller for vertical videos
                      width: '100%',
                    }}
                  >
                    {/* Glow Effect Behind Phone */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '120%',
                        height: '120%',
                        background: `radial-gradient(circle, ${colors.accent}20 0%, transparent 70%)`,
                        filter: 'blur(40px)',
                        zIndex: 0,
                      }}
                    />

                    {/* Phone Frame */}
                    <Box
                      sx={{
                        position: 'relative',
                        zIndex: 1,
                        borderRadius: '40px',
                        border: '6px solid #1A1A1A',
                        overflow: 'hidden',
                        // ✅ Landscape mode: rotate phone and use inverted aspect ratio
                        aspectRatio: (item as any).isLandscape ? '19.5/9' : '9/19.5',
                        transform: (item as any).isLandscape ? 'rotate(0deg)' : 'none', // Landscape videos shown in horizontal phone
                        boxShadow: `0 30px 60px -15px rgba(0,0,0,0.8), ${shadows.glow}`,
                        background: '#000',
                      }}
                    >
                      {/* Video - Full Display */}
                      <Box
                        component="video"
                        src={(item as any).video}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata" // ✅ Performance: Only load metadata initially
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain', // ✅ Show full video without cropping
                          background: '#000',
                        }}
                      />

                      {/* Notch/Dynamic Island - Hide for landscape */}
                      {!(item as any).isLandscape && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 80,
                            height: 24,
                            background: '#000',
                            borderRadius: 12,
                            zIndex: 2,
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}

// ============================================================================
// COMPARISON SECTION (Modern Grid)
// ============================================================================
// ============================================================================
// FEATURE MATRIX TABLE
// ============================================================================
function ComparisonTableSection() {
  const rows = [
    { name: 'Multilingüe (Idiomas)', traditional: 'Depende del Staff', visual: '14 Idiomas Automáticos', highlight: true },
    { name: 'Formato Visual', traditional: 'Texto / Foto Estática', visual: 'Video Reels 4K', highlight: true },
    { name: 'Actualización Precios', traditional: 'Costosa (Reimpresión)', visual: 'Instantánea (Click)', highlight: false },
    { name: 'Captación Leads', traditional: 'Nula', visual: 'Email & Teléfono', highlight: true },
    { name: 'Generación Reseñas', traditional: 'Pasiva', visual: 'Proactiva (Incentivos)', highlight: true },
    { name: 'Ordenación Platos', traditional: 'Fija / Estática', visual: 'Dinámica (Menu Engineering)', highlight: false },
    { name: 'Soporte Ventas', traditional: 'Solo Informativo', visual: 'Venta Sugestiva (Upsell)', highlight: false },
  ];

  return (
    <Box component="section" sx={{ py: 16, background: colors.bgCard }}>
      <Container maxWidth="md">
        <SectionHeader title="LA DECISIÓN INTELIGENTE" subtitle="Deja de perder dinero con PDFs" />

        <Box sx={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          overflow: 'hidden',
          backdropFilter: 'blur(10px)',
        }}>
          {/* Header Row */}
          <Grid container sx={{ p: { xs: 2, sm: 4 }, borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
            <Grid item xs={4}><Typography variant="h6" sx={{ color: colors.textMuted, fontSize: { xs: '0.7rem', sm: '1.25rem' } }}>Característica</Typography></Grid>
            <Grid item xs={4} sx={{ textAlign: 'center' }}><Typography variant="h6" sx={{ color: '#EF4444', fontWeight: 700, fontSize: { xs: '0.7rem', sm: '1.25rem' } }}>Tradicional</Typography></Grid>
            <Grid item xs={4} sx={{ textAlign: 'center' }}><Typography variant="h6" sx={{ color: colors.accent, fontWeight: 700, fontSize: { xs: '0.7rem', sm: '1.25rem' } }}>VisualTaste</Typography></Grid>
          </Grid>

          {/* Data Rows */}
          {rows.map((row, i) => (
            <Grid container key={i} alignItems="center" sx={{
              p: 3,
              borderBottom: i === rows.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
              background: row.highlight ? 'rgba(212, 175, 55, 0.03)' : 'transparent',
              transition: 'background 0.3s',
              '&:hover': { background: 'rgba(255,255,255,0.05)' }
            }}>
              <Grid item xs={4}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: colors.text, fontSize: { xs: '0.7rem', sm: '1rem' } }}>{row.name}</Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: { xs: 0.5, sm: 1 } }}>
                  <CancelOutlinedIcon sx={{ color: '#EF4444', fontSize: { xs: 16, sm: 20 }, opacity: 0.8 }} />
                  <Typography variant="body2" sx={{ color: colors.textMuted, fontSize: { xs: '0.65rem', sm: '0.875rem' } }}>{row.traditional}</Typography>
                </Box>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: { xs: 0.5, sm: 1 } }}>
                  <CheckCircleOutlineIcon sx={{ color: colors.success, fontSize: { xs: 16, sm: 20 } }} />
                  <Typography variant="body2" sx={{ color: row.highlight ? colors.accentLight : colors.text, fontWeight: 700, fontSize: { xs: '0.65rem', sm: '0.875rem' } }}>{row.visual}</Typography>
                </Box>
              </Grid>
            </Grid>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

// ============================================================================
// PRODUCT SHOWCASE (Refined)
// ============================================================================
function ProductShowcaseSection() {
  const [selectedMedia, setSelectedMedia] = useState<{ type: string; src: string; title: string } | null>(null);

  const showcaseItems = [
    {
      type: 'video',
      src: 'https://visualtasteworker.franciscotortosaestudios.workers.dev/media/System/demo-reel.mp4',
      title: 'Menú Interactivo',
      description: 'Interfaz tipo Instagram que enamora.',
    },
    {
      type: 'image',
      src: 'https://visualtasteworker.franciscotortosaestudios.workers.dev/media/System/landing/gestionar_menu.png',
      title: 'Control Total',
      description: 'Panel de gestión intuitivo y potente.',
    },
    {
      type: 'image',
      src: 'https://visualtasteworker.franciscotortosaestudios.workers.dev/media/System/landing/KPI_restaurante.png',
      title: 'ROI Inteligente',
      description: 'Toma decisiones basadas en datos reales.',
    },
  ];

  return (
    <>
      <Box component="section" sx={{ py: 16, background: colors.bg }}>
        <Container maxWidth="lg">
          <SectionHeader title="PLATAFORMA INTEGRAL" subtitle="Diseñado para vender" />

          <Grid container spacing={4}>
            {showcaseItems.map((item, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Box
                  onClick={() => setSelectedMedia(item)}
                  sx={{
                    borderRadius: '24px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: '#000',
                    height: '100%',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'scale(1.02)',
                      borderColor: colors.accent,
                      boxShadow: shadows.glow
                    }
                  }}
                >
                  <Box sx={{
                    aspectRatio: '4/3',
                    overflow: 'hidden',
                    position: 'relative',
                    background: '#000'
                  }}>
                    {item.type === 'video' ? (
                      <Box component="video" src={item.src} autoPlay muted loop playsInline sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Box component="img" src={item.src} sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 2 }} />
                    )}
                    {/* Overlay hint */}
                    <Box sx={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.3)',
                      opacity: 0,
                      transition: 'opacity 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '&:hover': { opacity: 1 }
                    }}>
                      <Typography variant="button" sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,0.6)', px: 2, py: 1, borderRadius: 2 }}>
                        Ver Ampliado
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ p: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: colors.text, mb: 1 }}>{item.title}</Typography>
                    <Typography variant="body2" sx={{ color: colors.textMuted }}>{item.description}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Lightbox Modal */}
      <Modal
        open={Boolean(selectedMedia)}
        onClose={() => setSelectedMedia(null)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}
      >
        <Box sx={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '90vh',
          outline: 'none',
          bgcolor: 'transparent'
        }}>
          {/* Close Button */}
          <IconButton
            onClick={() => setSelectedMedia(null)}
            sx={{
              position: 'absolute',
              top: -40,
              right: 0,
              color: '#fff',
              bgcolor: 'rgba(0,0,0,0.5)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
            }}
          >
            <CloseIcon fontSize="large" />
          </IconButton>

          {/* Media Content */}
          {selectedMedia?.type === 'video' ? (
            <Box
              component="video"
              src={selectedMedia.src}
              controls
              autoPlay
              sx={{
                maxWidth: '100%',
                maxHeight: '85vh',
                borderRadius: 4,
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }}
            />
          ) : (
            <Box
              component="img"
              src={selectedMedia?.src}
              sx={{
                maxWidth: '100%',
                maxHeight: '85vh',
                display: 'block',
                borderRadius: 4,
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                objectFit: 'contain',
                bgcolor: '#000'
              }}
            />
          )}

          {/* Caption */}
          <Typography variant="h6" sx={{ color: '#fff', textAlign: 'center', mt: 2, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            {selectedMedia?.title}
          </Typography>
        </Box>
      </Modal>
    </>
  );
}

// ============================================================================
// FAQ SECTION (Clean)
// ============================================================================
function FAQSection() {
  const faqList = [
    {
      question: '¿Sirve si tengo pocos camareros (Crisis de Personal)?',
      answer: 'Es la solución ideal. Tu carta digital se convierte en un "camarero extra" que explica cada plato en 14 idiomas. Reduce drásticamente el tiempo de toma de comanda y las preguntas repetitivas, permitiendo a tu equipo atender más mesas con menos estrés.',
    },
    {
      question: '¿Cómo aumento mis Reseñas en Google con esto?',
      answer: 'VisualTaste incluye una "Máquina de Reseñas". Al finalizar la experiencia o mediante campañas de "Postre Gratis", el sistema  redirige a los clientes felices directamente a tu perfil de Google Reviews. Nuestros clientes aumentan su volumen de reseñas positivas un 40% en el primer mes.',
    },
    {
      question: '¿Puedo cambiar precios o menús del día al instante?',
      answer: 'Sí. Olvídate de reimprimir o esperar a un diseñador. Desde tu móvil, cambias un precio, ocultas un plato agotado o subes el menú del día, y se actualiza en todos los códigos QR del restaurante en tiempo real.',
    },
    {
      question: '¿El cliente tiene que descargar una App?',
      answer: 'No. Rotundamente no. Es una tecnología "Sin Fricción". El cliente escanea el QR con su cámara habitual y la carta se abre instantáneamente en el navegador. Sin descargas, sin registros, sin esperas.',
    },
    {
      question: '¿Traduce la carta automáticamente?',
      answer: 'Sí. Detecta el idioma del móvil del turista (ej. Alemán) y le muestra toda la carta, ingredientes y alérgenos traducidos perfectamente. Atiende al turismo internacional como si tuvieras staff nativo.',
    },
  ];

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 10, md: 16 },
        background: colors.bgCard,
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, color: colors.text }}>Preguntas Frecuentes</Typography>
        </Box>
        <Stack spacing={2}>
          {faqList.map((faq, i) => (
            <Accordion
              key={i}
              disableGutters
              elevation={0}
              sx={{
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid rgba(255,255,255,0.05)`,
                borderRadius: '12px !important',
                '&:before': { display: 'none' },
                '&.Mui-expanded': {
                  background: 'rgba(255,255,255,0.05)',
                  borderColor: colors.accent,
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: colors.textMuted }} />}
                sx={{ px: 3, py: 1 }}
              >
                <Typography variant="body1" sx={{ fontWeight: 600, color: colors.text }}>
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, pb: 3 }}>
                <Typography variant="body2" sx={{ color: colors.textMuted, lineHeight: 1.7 }}>
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}


// ============================================================================
// CTA SECTION (High Impact)
// ============================================================================
function CTASection() {
  return (
    <Box
      component="section"
      sx={{
        py: { xs: 12, md: 20 },
        background: colors.bg,
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
      }}
    >
      {/* Massive Glow Background */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80vw',
          height: '80vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%)',
          filter: 'blur(120px)',
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: '1.75rem', sm: '2.5rem', md: '4rem' },
            fontWeight: 800,
            color: colors.text,
            mb: 3,
          }}
        >
          ¿Listo para vender más?
        </Typography>
        <Typography
          variant="h5"
          sx={{
            color: colors.textMuted,
            fontWeight: 400,
            mb: 6,
            maxWidth: 600,
            mx: 'auto',
          }}
        >
          Únete a la revolución visual hoy mismo.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center" alignItems="center">
          <GoldButton
            onClick={() => window.open('https://wa.me/34633747033', '_blank')}
            sx={{ px: { xs: 4, md: 6 }, py: 2, fontSize: { xs: '1rem', md: '1.2rem' }, width: { xs: '100%', sm: 'auto' } }}
          >
            Empezar Completamente Gratis
          </GoldButton>
        </Stack>

        <Typography variant="body2" sx={{ mt: 3, color: colors.textMuted, opacity: 0.5 }}>
          Sin tarjeta de crédito • Cancela cuando quieras
        </Typography>
      </Container>
    </Box>
  );
}


// ============================================================================
// FOOTER
// ============================================================================
function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 4,
        background: colors.bg,
        borderTop: `1px solid ${colors.border}`,
        textAlign: 'center',
      }}
    >
      <Typography variant="body2" sx={{ color: colors.textMuted }}>
        © {new Date().getFullYear()} VisualTaste. Todos los derechos reservados.
      </Typography>
    </Box>
  );
}

// ============================================================================
// MAIN PAGE EXPORT
// ============================================================================
const HomePage: React.FC = () => {
  return (
    <Box sx={{
      bgcolor: colors.bg,
      minHeight: '100vh',
      overflowX: 'hidden', // ✅ Prevent horizontal scroll on mobile
      width: '100%',
    }}>
      <HeroSection />
      <StatsSection />
      <BusinessValuesSection />
      <ComparisonTableSection />
      <ProductShowcaseSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </Box>
  );
};

export default HomePage;
