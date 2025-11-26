// apps/client/src/components/landing/section/SpecialOfferSection.tsx
// SPECIAL OFFER SECTION - Carousel de platos destacados con diseño premium

import { Box, Container, IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useRef, useState } from 'react';

interface Dish {
  id: string;
  name: string;
  category: string;
  description: string;
  price: string;
  image_url: string;
  link?: string;
  rounded?: boolean;
}

interface Theme {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color: string;
  background_color: string;
}

interface Content {
  subtitle?: string;
  title?: string;
  dishes?: Dish[];
  button_link?: string;
}

interface Labels {
  subtitle: string;
  view_menu_button: string;
}

interface Config {
  show_subtitle?: boolean;
  show_button?: boolean;
  items_per_view?: number;
  auto_play?: boolean;
}

interface Props {
  restaurant: any;
  translations: any;
  theme: Theme;
  variant: string;
  config: Config;
  content?: Content;
  labels?: Labels;
}

export default function SpecialOfferSection({
  restaurant,
  translations,
  theme,
  variant,
  config,
  content,
  labels,
}: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Configuration defaults
  const showSubtitle = config.show_subtitle ?? true;
  const showButton = config.show_button ?? true;
  const itemsPerView = config.items_per_view || 3;

  // Content defaults
  const subtitle = labels?.subtitle || content?.subtitle || 'Popular';
  const title = content?.title || 'Special Dishes';
  const buttonLink = content?.button_link || '/menu';
  const buttonText = labels?.view_menu_button || 'view menu';

  // HARDCODED DISHES - URLs desde Restoria
  const dishes: Dish[] = content?.dishes || [
    {
      id: '1',
      name: 'Stuffed Mushrooms',
      category: 'Appetizers',
      description: 'Flavorful, filled with panko bread crumbs, pine nuts, parsley, sun-dried tomatoe...',
      price: '25.00',
      image_url: 'https://restoria.botble.com/storage/resource/special-dish2.png',
      link: '/menu/stuffed-mushrooms',
      rounded: false,
    },
    {
      id: '2',
      name: 'Jalapeno Poppers',
      category: 'Appetizers',
      description: 'Greek yogurt filling instead of a traditional cream cheese one. its every bit a...',
      price: '29.00',
      image_url: 'https://restoria.botble.com/storage/resource/dish2.png',
      link: '/menu/jalapeno-poppers',
      rounded: true,
    },
    {
      id: '3',
      name: 'Caprese Skewers',
      category: 'Appetizers',
      description: 'Drizzle these colorful skewers with an easy balsamic reduction for a pop of swee...',
      price: '45.00',
      image_url: 'https://restoria.botble.com/storage/resource/dish3.png',
      link: '/menu/caprese-skewers',
      rounded: false,
    },
    {
      id: '4',
      name: 'Greek Salad',
      category: 'Appetizers',
      description: 'Tomatoes, green bell pepper, sliced cucumber onion, olives, and feta cheese.',
      price: '50.00',
      image_url: 'https://restoria.botble.com/storage/resource/dish4.png',
      link: '/menu/greek-salad',
      rounded: true,
    },
    {
      id: '5',
      name: 'Roasted Salmon',
      category: 'Main Dishes',
      description: 'Tomatoes, green bell pepper, sliced cucumber onion, olives, and feta cheese.',
      price: '25.50',
      image_url: 'https://restoria.botble.com/storage/resource/dish5.png',
      link: '/menu/roasted-salmon',
      rounded: false,
    },
    {
      id: '6',
      name: 'Baked Eggplant',
      category: 'Main Dishes',
      description: 'Vegetables, cheeses, ground meats, tomato sauce, seasonings and spices',
      price: '40.00',
      image_url: 'https://restoria.botble.com/storage/resource/dessertdish3.png',
      link: '/menu/baked-eggplant',
      rounded: true,
    },
    {
      id: '7',
      name: 'Steamed Crab Legs',
      category: 'Main Dishes',
      description: 'Succulent crab legs steamed to perfection, served with drawn butter and fresh le...',
      price: '10.00',
      image_url: 'https://restoria.botble.com/storage/resource/special-dish4.png',
      link: '/menu/steamed-crab-legs',
      rounded: false,
    },
    {
      id: '8',
      name: 'Skirt Steak',
      category: 'Main Dishes',
      description: 'Vegetables, cheeses, ground meats, tomato sauce, seasonings and spices.',
      price: '39.00',
      image_url: 'https://restoria.botble.com/storage/resource/dessertdish4.png',
      link: '/menu/skirt-steak',
      rounded: true,
    },
  ];

  // Scroll functions
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollAmount = container.offsetWidth * 0.8;

    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.offsetWidth - 10);
  };

  return (
    <Box
      component="section"
      className="special-offer section-kt"
      sx={{
        position: 'relative',
        padding: { xs: '60px 0', md: '80px 0' },
        background: theme.background_color,
        overflow: 'hidden',
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          maxWidth: '1400px',
          position: 'relative',
        }}
      >
        {/* Title Box Centered */}
        <Box
          className="title-box centered"
          sx={{
            textAlign: 'center',
            mb: { xs: 4, md: 6 },
          }}
        >
          {/* Subtitle */}
          {showSubtitle && (
            <Box
              className="subtitle"
              sx={{
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box
                component="span"
                sx={{
                  fontSize: { xs: '12px', md: '14px' },
                  fontWeight: 500,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: theme.accent_color,
                  position: 'relative',
                  padding: '0 20px',
                  '&::before, &::after': {
                    content: '""',
                    position: 'absolute',
                    top: '50%',
                    width: '30px',
                    height: '1px',
                    background: theme.accent_color,
                  },
                  '&::before': {
                    left: '-35px',
                  },
                  '&::after': {
                    right: '-35px',
                  },
                }}
              >
                {subtitle}
              </Box>
            </Box>
          )}

          {/* Title */}
          <Box
            component="h2"
            sx={{
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              fontWeight: 700,
              lineHeight: 1.3,
              color: theme.text_color,
              m: 0,
              fontFamily: '"Fraunces", "Playfair Display", serif',
            }}
          >
            {title}
          </Box>
        </Box>

        {/* Dish Gallery Slider */}
        <Box
          sx={{
            position: 'relative',
          }}
        >
          {/* Navigation Buttons */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              transform: 'translateY(-50%)',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            <IconButton
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              sx={{
                position: 'absolute',
                left: '-60px',
                width: '44px',
                height: '44px',
                border: `1px solid ${theme.accent_color}30`,
                color: theme.accent_color,
                pointerEvents: 'all',
                transition: 'all 0.3s',
                '&:hover': {
                  background: theme.accent_color,
                  color: theme.background_color,
                  border: `1px solid ${theme.accent_color}`,
                },
                '&:disabled': {
                  opacity: 0.3,
                  cursor: 'not-allowed',
                },
              }}
            >
              <ChevronLeft />
            </IconButton>

            <IconButton
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              sx={{
                position: 'absolute',
                right: '-60px',
                width: '44px',
                height: '44px',
                border: `1px solid ${theme.accent_color}30`,
                color: theme.accent_color,
                pointerEvents: 'all',
                transition: 'all 0.3s',
                '&:hover': {
                  background: theme.accent_color,
                  color: theme.background_color,
                  border: `1px solid ${theme.accent_color}`,
                },
                '&:disabled': {
                  opacity: 0.3,
                  cursor: 'not-allowed',
                },
              }}
            >
              <ChevronRight />
            </IconButton>
          </Box>

          {/* Dishes Container */}
          <Box
            ref={scrollContainerRef}
            onScroll={handleScroll}
            sx={{
              display: 'flex',
              gap: { xs: 2, md: 3 },
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              pb: 2,
            }}
          >
            {dishes.map((dish, index) => (
              <Box
                key={dish.id}
                className={`offer-block-two ${dish.rounded ? 'rounded' : ''}`}
                sx={{
                  flex: '0 0 auto',
                  width: { xs: '280px', sm: '320px', md: '380px' },
                  scrollSnapAlign: 'start',
                }}
              >
                <Box
                  className="inner-box"
                  sx={{
                    background: theme.background_color,
                    border: `1px solid ${theme.accent_color}20`,
                    borderRadius: dish.rounded ? '200px 200px 0 0' : '12px',
                    overflow: 'hidden',
                    transition: 'all 0.4s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: `0 20px 40px ${theme.accent_color}15`,
                    },
                  }}
                >
                  {/* Category Badge */}
                  <Box
                    className="cat-name"
                    sx={{
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      background: theme.accent_color,
                      color: theme.background_color,
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      padding: '6px 16px',
                      borderRadius: '20px',
                      zIndex: 2,
                    }}
                  >
                    {dish.category}
                  </Box>

                  {/* Dish Image */}
                  <Box
                    className="image"
                    sx={{
                      position: 'relative',
                      width: '100%',
                      height: { xs: '280px', md: '320px' },
                      overflow: 'hidden',
                      borderRadius: dish.rounded ? '200px 200px 0 0' : '12px 12px 0 0',
                    }}
                  >
                    <Box
                      component="a"
                      href={dish.link}
                      sx={{
                        display: 'block',
                        width: '100%',
                        height: '100%',
                      }}
                    >
                      <Box
                        component="img"
                        src={dish.image_url}
                        alt={dish.name}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.5s ease',
                          '&:hover': {
                            transform: 'scale(1.1)',
                          },
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Dish Info */}
                  <Box
                    sx={{
                      padding: { xs: '25px 20px', md: '30px 25px' },
                      textAlign: 'center',
                    }}
                  >
                    {/* Dish Name */}
                    <Box
                      component="h3"
                      sx={{
                        fontSize: { xs: '18px', md: '20px' },
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        mb: 2,
                        m: 0,
                      }}
                    >
                      <Box
                        component="a"
                        href={dish.link}
                        sx={{
                          color: theme.text_color,
                          textDecoration: 'none',
                          transition: 'color 0.3s',
                          '&:hover': {
                            color: theme.accent_color,
                          },
                        }}
                      >
                        {dish.name}
                      </Box>
                    </Box>

                    {/* Description */}
                    <Box
                      className="text desc"
                      sx={{
                        fontSize: { xs: '14px', md: '15px' },
                        lineHeight: 1.7,
                        color: theme.text_color,
                        opacity: 0.75,
                        mb: 2,
                      }}
                    >
                      {dish.description}
                    </Box>

                    {/* Price */}
                    <Box
                      className="price"
                      sx={{
                        fontSize: { xs: '24px', md: '28px' },
                        fontWeight: 700,
                        color: theme.accent_color,
                        fontFamily: '"Fraunces", serif',
                      }}
                    >
                      ${dish.price}
                    </Box>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* View Menu Button */}
        {showButton && (
          <Box
            className="lower-link-box"
            sx={{
              textAlign: 'center',
              mt: { xs: 4, md: 5 },
            }}
          >
            <Box
              component="a"
              href={buttonLink}
              className="theme-btn"
              sx={{
                display: 'inline-block',
                padding: '14px 35px',
                background: theme.primary_color,
                color: theme.background_color,
                fontSize: '15px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderRadius: '6px',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
                border: '2px solid transparent',
                '&:hover': {
                  background: theme.accent_color,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 10px 25px ${theme.primary_color}33`,
                },
              }}
            >
              {buttonText}
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
}