import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress, Alert, Container } from '@mui/material';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';

import HeroSection from '../components/landing/section/HeroSection';
import HeroPremiumSection from '../components/landing/section/HeroPremiumSection';
import AboutSection from '../components/landing/section/AboutSection';
import AboutPremiumSection from '../components/landing/section/AboutPremiumSection';
import MenuSection from '../components/landing/section/MenuSection';
import MenuVideoGallerySection from '../components/landing/section/MenuSectionPremium';
import GallerySection from '../components/landing/section/GallerySection';
import GalleryPremiumSection from '../components/landing/section/GalleryPremiumSection';
import LocationSection from '../components/landing/section/LocationSection';
import ContactSection from '../components/landing/section/ContactSection';
import ContactPremiumSection from '../components/landing/section/ContactPremiumSection';
import HeaderNav from '../components/landing/section/HeaderPremiumSection';

const SECTION_COMPONENTS: Record<string, any> = {
  hero: HeroSection,
  about: AboutSection,
  menu: MenuSection,
  gallery: GallerySection,
  location: LocationSection,
  contact: ContactSection,
};

const API_URL = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

type Props = { slugProp?: string };

// ✅ Component interno que usa el Language Context
function RestaurantLandingContent({ slug }: { slug: string }) {
  const { currentLanguage } = useLanguage(); // ✅ NUEVO: Usar idioma del contexto
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) { setIsLoading(false); return; }
    const fetchLandingData = async () => {
      setIsLoading(true); setError(null);
      try {
        const url = `${API_URL}/restaurants/${slug}/landing?lang=${currentLanguage}`; // ✅ Usar currentLanguage del contexto
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        if (!json.success) throw new Error(json.message || 'Error al cargar');
        setData(json);
      } catch (err: any) {
        setError(err?.message || 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLandingData();
  }, [slug, currentLanguage]); // ✅ Dependencia actualizada

  useEffect(() => {
    if (!data?.data) return;
    const { restaurant, seo } = data.data;
    document.title = seo?.seo_title || restaurant?.name || 'Restaurant';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', seo?.seo_description || restaurant?.description || '');
  }, [data]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f7fa' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !data?.success) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          <strong>Error al cargar la página</strong>
          <br />
          {error || 'Por favor, inténtalo de nuevo más tarde.'}
        </Alert>
      </Container>
    );
  }

  const {
    restaurant,
    sections,
    translations,
    theme,
    menu_preview,
    gallery,
    languages,
    restaurant_media = {}, // ✅ DEFAULT para evitar crash si el worker es viejo
    details,
    assets,
    ui = {}, // ✅ NUEVO: UI strings traducidos
    currentLanguage: dataLanguage, // ✅ NUEVO: Idioma del backend
  } = data.data;

  // ✅ Usar el idioma del backend como fuente de verdad
  const effectiveLanguage = dataLanguage || currentLanguage;

  const activeSections =
    (sections || [])
      .filter((section: any) => section?.is_active)
      .sort((a: any, b: any) => (a?.order_index ?? 0) - (b?.order_index ?? 0));

  const headerSection = activeSections.find((s: any) => s.section_key === 'header');

  return (
    <Box sx={{
      position: 'relative',
      minHeight: '100vh',
      backgroundColor: theme?.background_color || theme?.primary_color || '#fff',
      backgroundImage: 'url(https://visualtasteworker.franciscotortosaestudios.workers.dev/media/System/landing/patron.png)',
      backgroundRepeat: 'repeat',
      backgroundSize: '300px' // Adjust size as needed
    }}>
      {/* Header */}
      {headerSection && (
        <HeaderNav
          restaurant={restaurant}
          theme={theme}
          sections={activeSections}
          translations={translations}
          config={headerSection?.config_data}
          languages={languages}
          currentLanguage={effectiveLanguage}
        // onLanguageChange ya no es necesario, HeaderNav usará setLanguage del context
        />
      )}

      {activeSections.length === 0 ? (
        <Container maxWidth="md" sx={{ py: 8 }}>
          <Alert severity="info">No hay secciones configuradas.</Alert>
        </Container>
      ) : (
        activeSections.map((section: any) => {
          const key = section?.section_key;
          const variant = section?.variant;
          const config = section?.config_data || {};

          // -------------------------------------------
          // HERO PREMIUM
          // -------------------------------------------
          if (key === 'hero' && variant === 'premium') {
            return (
              <div id="hero" key={section.id}>
                <HeroPremiumSection
                  restaurant={restaurant}
                  translations={translations}
                  theme={theme}
                  variant={variant}
                  config={config}
                  restaurant_media={restaurant_media}
                  assets={assets}
                  ui={ui}
                  currentLanguage={effectiveLanguage}
                />
              </div>
            );
          }

          // -------------------------------------------
          // ABOUT PREMIUM
          // -------------------------------------------
          if (key === 'about' && variant === 'premium') {
            const content = {
              subtitle: 'OUR STORY',
              title: 'Enjoy Every Moment with Tasty',
              description: translations?.about_description || restaurant?.description || '',
              tag_images: restaurant_media?.tag_images || [],
              about_images: restaurant_media?.about_images || [],
              button_link: '/about-us',
            };
            const labels = {
              subtitle: 'OUR STORY',
              about_us_button: 'ABOUT US',
            };
            return (
              <div id="about" key={section.id}>
                <AboutPremiumSection
                  restaurant={restaurant}
                  translations={translations}
                  theme={theme}
                  variant={variant}
                  config={config}
                  content={content}
                  labels={labels}
                  restaurant_media={restaurant_media} // ✅ Pasa el objeto seguro
                  ui={ui}
                  currentLanguage={effectiveLanguage}
                />
              </div>
            );
          }

          // -------------------------------------------
          // MENU PREMIUM
          // -------------------------------------------
          if (key === 'menu' && variant === 'premium') {
            return (
              <div id="menu" key={section.id}>
                <MenuVideoGallerySection
                  theme={theme}
                  translations={translations}
                  premium={section.premium}
                  apiUrl={API_URL}
                />
              </div>
            );
          }

          // -------------------------------------------
          // GALLERY PREMIUM (Nuevo)
          // -------------------------------------------
          if (key === 'gallery' && variant === 'premium') {
            // ✅ ADAPTADOR DE SEGURIDAD: Si gallery son strings (worker viejo), convertirlos a objetos
            let premiumGalleryItems = gallery || [];
            if (Array.isArray(gallery) && gallery.length > 0 && typeof gallery[0] === 'string') {
              premiumGalleryItems = gallery.map((url: string, i: number) => ({
                id: `gal_legacy_${i}`,
                image_url: url.startsWith('http') ? url : `${API_URL}/media/${url}`,
                alt: 'Gallery Image',
                title: '',
                description: '',
                category: 'Restaurant',
                is_featured: false,
              }));
            }

            return (
              <div id="gallery" key={section.id}>
                <GalleryPremiumSection
                  theme={theme}
                  translations={translations}
                  config={config}
                  items={premiumGalleryItems}
                />
              </div>
            );
          }

          // -------------------------------------------
          // CONTACT PREMIUM
          // -------------------------------------------
          if (key === 'contact' && variant === 'premium') {
            return (
              <div id="contact" key={section.id}>
                <ContactPremiumSection
                  restaurant={restaurant}
                  restaurantDetails={details}
                  theme={theme}
                  translations={translations}
                  config={config}
                  restaurant_media={restaurant_media} // ✅ Pasa el objeto seguro para heredar imágenes del hero
                />
              </div>
            );
          }

          // -------------------------------------------
          // SECCIONES GENÉRICAS (Estándar)
          // -------------------------------------------
          const SectionComponent = SECTION_COMPONENTS[key];
          if (!SectionComponent) {
            console.warn(`Section not found: ${key}`);
            return null;
          }

          // Fix de compatibilidad para Galería Estándar si el worker nuevo devuelve objetos
          let standardGallery = gallery;
          if (key === 'gallery' && Array.isArray(gallery) && gallery.length > 0 && typeof gallery[0] === 'object') {
            standardGallery = gallery.map((item: any) => item.image_url);
          }

          return (
            <div id={key} key={section.id}>
              <SectionComponent
                restaurant={restaurant}
                translations={translations}
                theme={theme}
                details={details}
                variant={variant}
                config={config}
                menuPreview={menu_preview}
                gallery={standardGallery}
                restaurant_media={restaurant_media}
                assets={assets}
              />
            </div>
          );
        })
      )}
    </Box>
  );
}

// \u2705 Wrapper component que inicializa el LanguageProvider
export default function RestaurantLanding({ slugProp }: Props) {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const slug = slugProp || slugParam;

  if (!slug) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error">No se proporcionó un slug de restaurante</Alert>
      </Container>
    );
  }

  // \u2705 Envolver con LanguageProvider pasando el slug como restaurantId
  return (
    <LanguageProvider restaurantId={slug}>
      <RestaurantLandingContent slug={slug} />
    </LanguageProvider>
  );
}
