// apps/client/src/components/landing/section/GallerySection.tsx
import { Box, Typography, Container, Grid, Stack } from '@mui/material';
import { Collections, ZoomIn } from '@mui/icons-material';
import { useState } from 'react';

interface Props {
  restaurant: any;
  translations: any;
  theme: any;
  variant: string;
  config: any;
  gallery: string[];
}

export default function GallerySection({ restaurant: _restaurant, translations: _translations, theme, variant: _variant, config, gallery }: Props) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Placeholder images si no hay gallery
  const images = gallery && gallery.length > 0
    ? gallery
    : [
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
      'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    ];

  return (
    <Box
      id="gallery"
      sx={{
        py: { xs: 8, md: 12 },
        background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)',
        position: 'relative',
      }}
    >
      <Container maxWidth="lg">
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
            <Collections sx={{ fontSize: 32, color: '#fff' }} />
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
            {config.title_override || 'Galería'}
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
            {config.subtitle_override || 'Descubre nuestros platos en imágenes'}
          </Typography>
        </Stack>

        {/* Masonry Grid */}
        <Grid container spacing={3}>
          {images.slice(0, config.max_images || 9).map((image, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Box
                onClick={() => setSelectedImage(image)}
                sx={{
                  position: 'relative',
                  paddingBottom: '100%',
                  borderRadius: 4,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
                  '@keyframes fadeInUp': {
                    from: { opacity: 0, transform: 'translateY(30px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                  },
                  '&:hover': {
                    '& .gallery-image': {
                      transform: 'scale(1.1)',
                    },
                    '& .gallery-overlay': {
                      opacity: 1,
                    },
                  },
                }}
              >
                <Box
                  component="img"
                  src={image}
                  alt={`Gallery ${index + 1}`}
                  className="gallery-image"
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.5s ease',
                  }}
                />
                {/* Hover Overlay */}
                <Box
                  className="gallery-overlay"
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `linear-gradient(135deg, ${theme.primary_color}cc, ${theme.secondary_color}cc)`,
                    opacity: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'opacity 0.3s ease',
                  }}
                >
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.3)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid rgba(255,255,255,0.5)',
                    }}
                  >
                    <ZoomIn sx={{ fontSize: 32, color: '#fff' }} />
                  </Box>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Lightbox Modal */}
      {selectedImage && (
        <Box
          onClick={() => setSelectedImage(null)}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            backdropFilter: 'blur(20px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            animation: 'fadeIn 0.3s ease',
            '@keyframes fadeIn': {
              from: { opacity: 0 },
              to: { opacity: 1 },
            },
          }}
        >
          <Box
            component="img"
            src={selectedImage}
            alt="Gallery"
            sx={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: 3,
              boxShadow: '0 20px 80px rgba(0,0,0,0.5)',
              animation: 'zoomIn 0.3s ease',
              '@keyframes zoomIn': {
                from: { transform: 'scale(0.8)', opacity: 0 },
                to: { transform: 'scale(1)', opacity: 1 },
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
}
