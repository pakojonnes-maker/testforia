// apps/client/src/components/landing/section/AboutPremiumSection.tsx
import { Box, Container } from '@mui/material';
import { useMemo } from 'react';

interface TagImage {
  text: string;
  image_url: string;
  alt: string;
}

interface Theme {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color: string;
  background_color: string;
}

interface AboutImage {
  id: string;
  image_url: string;
  alt: string;
  position: 'left' | 'center' | 'right';
  parallax_depth: number;
}

interface Content {
  subtitle?: string;
  title?: string;
  description?: string;
  tag_images?: TagImage[];
  about_images?: AboutImage[];
}

interface Labels {
  subtitle: string;
}

interface Config {
  show_subtitle?: boolean;
  section_padding?: string;
}

interface Props {
  restaurant: any;
  translations: any;
  theme: Theme;
  variant: string;
  config: Config;
  content?: Content;
  labels?: Labels;
  restaurant_media?: any;
}

export default function AboutPremiumSection({
  restaurant,
  translations,
  theme,
  config,
  content,
  labels,
  restaurant_media,
}: Props) {
  // Config
  const showSubtitle = config.show_subtitle ?? true;
  const sectionPadding = config.section_padding || 'clamp(60px, 8vw, 100px) 0';

  // Content
  const subtitle = labels?.subtitle || content?.subtitle || 'OUR STORY';
  const title = content?.title || 'Enjoy Every Moment with Tasty';
  const description =
    content?.description ||
    translations.about_description ||
    'Experience culinary artistry at its finest where traditional flavors meet modern innovation creating unforgettable dining moments.';

  const tagImages = content?.tag_images || [];

  // Helper colores
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Logic para imágenes (Hero fallback o DB)
  const heroSlides = useMemo(() => {
    const placeholder = 'https://placehold.co/600x400/EEE/31343C';
    const cover =
      restaurant_media?.hero_slides?.[0]?.image_url ||
      restaurant?.cover_image_url ||
      restaurant?.coverimageurl ||
      placeholder;

    if (Array.isArray(restaurant_media?.hero_slides) && restaurant_media.hero_slides.length) {
      return restaurant_media.hero_slides.map((s: any, i: number) => ({
        url: s.image_url || cover,
        alt: s.alt || restaurant?.name || `Slide ${i + 1}`,
      }));
    }
    return [{ url: cover, alt: restaurant?.name || 'Slide' }];
  }, [restaurant_media, restaurant]);

  const aboutImages: AboutImage[] = useMemo(() => {
    if (content?.about_images && content.about_images.length) {
      return content.about_images;
    }
    const first = heroSlides[0];
    const second = heroSlides[1] ?? heroSlides[0];
    const result: AboutImage[] = [];

    if (first) {
      result.push({
        id: 'hero-left',
        image_url: first.url,
        alt: first.alt,
        position: 'left',
        parallax_depth: 1,
      });
    }
    if (second) {
      result.push({
        id: 'hero-right',
        image_url: second.url,
        alt: second.alt,
        position: 'right',
        parallax_depth: 1,
      });
    }
    return result;
  }, [content?.about_images, heroSlides]);

  // Imagen principal para móvil
  const primaryMobileImage =
    aboutImages[0]?.image_url ||
    heroSlides[0]?.url ||
    'https://placehold.co/600x400/EEE/31343C';

  const renderTitle = () => {
    const TitleWrapper = (props: any) => (
      <Box
        component="h2"
        sx={{
          fontSize: { xs: '2.25rem', md: '3.5rem', lg: '4rem' },
          fontWeight: 800,
          lineHeight: 1.1,
          color: theme.text_color,
          m: 0,
          fontFamily: '"Fraunces", "Playfair Display", serif',
          letterSpacing: '-0.02em',
        }}
      >
        {props.children}
      </Box>
    );

    if (tagImages.length === 0) return <TitleWrapper>{title}</TitleWrapper>;

    const [tag1, tag2, tag3] = tagImages;

    const Tag = ({ img }: { img: TagImage }) => (
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          verticalAlign: 'middle',
          mx: 1,
          position: 'relative',
          top: '-4px',
        }}
      >
        <Box
          component="span"
          sx={{
            height: { xs: '36px', md: '52px' },
            px: 2,
            borderRadius: '999px',
            border: `1px solid ${hexToRgba(theme.text_color, 0.15)}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1.5,
            background: hexToRgba(theme.background_color, 0.5),
            backdropFilter: 'blur(4px)',
          }}
        >
          <Box
            component="img"
            src={img.image_url}
            alt={img.alt}
            sx={{
              height: { xs: '20px', md: '28px' },
              width: 'auto',
              display: 'block',
            }}
          />
          <Box
            component="span"
            sx={{
              fontSize: { xs: '0.4em', md: '0.35em' },
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 700,
              color: theme.accent_color,
              mt: '2px',
            }}
          >
            {img.text}
          </Box>
        </Box>
      </Box>
    );

    return (
      <TitleWrapper>
        Enjoy Every Moment with Tasty
        {tag1 && <Tag img={tag1} />}
        {!tag1 && ' Breakfast'}
        , Hearty
        {tag2 && <Tag img={tag2} />}
        {!tag2 && ' Mains'}
        {' & '}
        {tag3 && <Tag img={tag3} />}
        {!tag3 && ' Drinks'}
      </TitleWrapper>
    );
  };

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        padding: sectionPadding,
        background: theme.background_color,
        overflow: 'hidden',
      }}
    >
      {/* Background decorative blob */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '-10%',
          width: '60%',
          height: '60%',
          background: `radial-gradient(circle, ${hexToRgba(theme.accent_color, 0.08)} 0%, transparent 70%)`,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        
        {/* --- MOBILE LAYOUT (< 900px) --- */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 4 }}>
          {/* Header Mobile */}
          <Box sx={{ textAlign: 'center' }}>
            {showSubtitle && (
              <Box
                sx={{
                  display: 'inline-block',
                  mb: 2,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: '6px',
                  background: hexToRgba(theme.accent_color, 0.1),
                  color: theme.accent_color,
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                {subtitle}
              </Box>
            )}
            {renderTitle()}
          </Box>

          {/* Image Card Mobile */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4/3',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: `0 20px 40px -10px ${hexToRgba('#000', 0.3)}`,
            }}
          >
            <Box
              component="img"
              src={primaryMobileImage}
              alt="Restaurant interior"
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Box>

          {/* Text Mobile */}
          <Box sx={{ textAlign: 'center', px: 1 }}>
            <Box
              sx={{
                fontSize: '16px',
                lineHeight: 1.7,
                color: hexToRgba(theme.text_color, 0.85),
                fontFamily: '"Urbanist", sans-serif',
              }}
            >
              {description}
            </Box>
          </Box>
        </Box>

        {/* --- DESKTOP LAYOUT (>= 900px) --- */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', minHeight: '600px' }}>
          
          {/* Left Content */}
          <Box sx={{ flex: 1, pr: 8, position: 'relative', zIndex: 2 }}>
            {showSubtitle && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{ width: '40px', height: '1px', bgcolor: theme.accent_color }} />
                <Box
                  sx={{
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: theme.accent_color,
                  }}
                >
                  {subtitle}
                </Box>
              </Box>
            )}

            <Box sx={{ mb: 4 }}>
              {renderTitle()}
            </Box>

            <Box
              sx={{
                fontSize: '17px',
                lineHeight: 1.8,
                color: hexToRgba(theme.text_color, 0.8),
                fontFamily: '"Urbanist", sans-serif',
                maxWidth: '90%',
                borderLeft: `2px solid ${hexToRgba(theme.accent_color, 0.3)}`,
                pl: 3,
              }}
            >
              {description}
            </Box>
          </Box>

          {/* Right Visual Composition */}
          <Box sx={{ flex: 1, position: 'relative', height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {aboutImages.map((img, i) => {
              // Styles for scatter effect
              const isCenter = img.position === 'center' || i === 1;
              const isLeft = img.position === 'left' || i === 0;
              const isRight = img.position === 'right' || i === 2;

              return (
                <Box
                  key={img.id}
                  sx={{
                    position: 'absolute',
                    transition: 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: `0 25px 50px -12px ${hexToRgba('#000', 0.4)}`,
                    border: `1px solid ${hexToRgba('#FFF', 0.1)}`,
                    
                    ...(isLeft && {
                      width: '45%',
                      aspectRatio: '3/4',
                      top: '0%',
                      left: '0%',
                      zIndex: 1,
                      transform: 'rotate(-3deg)',
                    }),
                    ...(isCenter && {
                      width: '55%',
                      aspectRatio: '4/3',
                      top: '30%',
                      left: '25%',
                      zIndex: 3,
                      transform: 'rotate(0deg)',
                    }),
                    ...(isRight && {
                      width: '45%',
                      aspectRatio: '3/4',
                      bottom: '5%',
                      right: '0%',
                      zIndex: 2,
                      transform: 'rotate(3deg)',
                    }),

                    '&:hover': {
                      zIndex: 10,
                      transform: 'scale(1.05) rotate(0deg)',
                      boxShadow: `0 30px 60px -10px ${hexToRgba(theme.accent_color, 0.25)}`,
                    }
                  }}
                >
                  <Box
                    component="img"
                    src={img.image_url}
                    alt={img.alt}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </Box>
              );
            })}
          </Box>
        </Box>

      </Container>
    </Box>
  );
}
