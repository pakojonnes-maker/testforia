// src/components/landing/section/ContactPremiumSection.tsx
import { useMemo } from 'react';

type Restaurant = {
  name?: string;
  logo_url?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  cover_image_url?: string;
};

type RestaurantDetails = {
  opening_hours?: string;
  reservation_phone?: string;
  reservation_email?: string;
  whatsapp_number?: string;
  google_maps_url?: string;
};

type Theme = {
  background_color?: string;
  text_color?: string;
  accent_color?: string;
  secondary_color?: string;
  primary_color?: string;
  font_accent?: string;
};

type Props = {
  restaurant?: Restaurant;
  restaurantDetails?: RestaurantDetails;
  theme?: Theme;
  translations?: Record<string, string>;
  config?: { show_newsletter?: boolean };
  images?: string[];          // opcional, pero ya NO prioritario
  restaurant_media?: any;     // ✅ MISMAS slides que usa el Hero
};

const hexToRgba = (hex: string, a = 1) => {
  const h = (hex || '#000000').replace('#', '');
  const r = parseInt(h.slice(0, 2) || '00', 16);
  const g = parseInt(h.slice(2, 4) || '00', 16);
  const b = parseInt(h.slice(4, 6) || '00', 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const autoContrast = (hex: string) => {
  const h = (hex || '#ffffff').replace('#', '');
  const r = parseInt(h.slice(0, 2) || 'ff', 16);
  const g = parseInt(h.slice(2, 4) || 'ff', 16);
  const b = parseInt(h.slice(4, 6) || 'ff', 16);
  const y = (r * 299 + g * 587 + b * 114) / 1000;
  return y > 155 ? '#161616' : '#F7F7F5';
};

const parseHours = (json?: string) => {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
};

export default function ContactPremiumSection({
  restaurant,
  restaurantDetails,
  theme,
  translations,
  config,
  images = [],
  restaurant_media,
}: Props) {
  const bg = theme?.background_color || theme?.primary_color || '#0F2E29';
  const accent = theme?.accent_color || theme?.secondary_color || '#D6AA52';
  const txt = theme?.text_color || autoContrast(bg);
  const fontHead = theme?.font_accent || '"Fraunces Variable","Georgia",serif';

  // Datos BD
  const hours = useMemo(() => parseHours(restaurantDetails?.opening_hours), [restaurantDetails]);
  const address = useMemo(() => {
    return [restaurant?.address, restaurant?.city, restaurant?.postal_code, restaurant?.country]
      .filter(Boolean).join(', ');
  }, [restaurant]);
  const phone = restaurantDetails?.reservation_phone || restaurant?.phone || '';
  const email = restaurantDetails?.reservation_email || restaurant?.email || '';
  const openingCompact = useMemo(() => {
    if (!hours) return '';
    const firstOpen = Object.values(hours as any).find((d: any) => d && !d.closed) as any;
    return firstOpen ? `${firstOpen.open} - ${firstOpen.close}` : (translations?.contact_closed || 'Closed');
  }, [hours, translations]);

  const showNewsletter = config?.show_newsletter !== false;

  // ✅ 1) Leer hero_slides igual que en HeroPremiumSection
  const heroSlides = useMemo(() => {
    const placeholder = 'https://placehold.co/600x400/EEE/31343C';
    const cover =
      restaurant_media?.hero_slides?.[0]?.image_url ||
      restaurant?.cover_image_url ||
      (restaurant as any)?.coverimageurl ||
      placeholder;

    if (Array.isArray(restaurant_media?.hero_slides) && restaurant_media.hero_slides.length) {
      return restaurant_media.hero_slides.map((s: any, i: number) => ({
        url: s.image_url || cover,
        alt: s.alt || restaurant?.name || `Slide ${i + 1}`,
      }));
    }

    return [{ url: cover, alt: restaurant?.name || 'Slide' }];
  }, [restaurant_media, restaurant]);

  const placeholderLeft = 'https://placehold.co/400x560/1E3A34/D6AA52?text=Left&font=playfair';
  const placeholderRight = 'https://placehold.co/400x560/1E3A34/D6AA52?text=Right&font=playfair';

  // ✅ 2) Prioridad: heroSlides[0] y heroSlides[1]
  const PH_LEFT =
    heroSlides[0]?.url || images[0] || placeholderLeft;

  const PH_RIGHT =
    heroSlides[1]?.url || heroSlides[0]?.url || images[1] || placeholderRight;

  // (en móvil solo se ve el óvalo izquierdo, por lo que de forma natural usa sólo la primera slide)

  const styles = `
    .contact-prem-root{ 
      position:relative; 
      background:${bg}; 
      color:${txt}; 
      padding:clamp(48px, 8vw, 72px) clamp(16px, 3vw, 24px); 
    }

    .contact-prem-wrap{ 
      max-width:1200px; 
      margin:0 auto; 
      display:flex; 
      flex-direction:column;
      gap:clamp(24px, 4vw, 40px); 
      align-items:center;
    }

    .contact-prem-oval{ 
      width:min(220px, 70vw);
      aspect-ratio: 4 / 5;
      margin:0 auto;
      position:relative;
      border-radius:999px;
      overflow:hidden;
    }

    .contact-prem-oval::before{
      content:"";
      position:absolute;
      inset:10px;
      border-radius:999px;
      border:2px solid ${accent};
      pointer-events:none;
      z-index:2;
    }

    .contact-prem-oval::after{
      content:"";
      position:absolute;
      left:50%;
      bottom:-14px;
      width:70%;
      height:28px;
      transform:translateX(-50%);
      background:radial-gradient(ellipse at center, ${hexToRgba('#000', 0.35)} 0%, transparent 65%);
      opacity:0.85;
      z-index:0;
    }

    .contact-prem-oval img{ 
      position:absolute; 
      inset:0;
      width:100%; 
      height:100%;
      object-fit:cover; 
      object-position:center;
      border-radius:inherit;
      z-index:1;
    }

    .contact-prem-center{ 
      text-align:center; 
      max-width:600px;
      margin:0 auto;
    }
    
    .contact-prem-brand{ 
      display:grid; 
      place-items:center; 
      margin-bottom:clamp(12px, 2vw, 20px); 
    }
    
    .contact-prem-brand img{ 
      max-height:clamp(48px, 8vw, 64px); 
      width:auto; 
      object-fit:contain; 
    }

    .contact-prem-visit{ 
      display:inline-flex; 
      align-items:center; 
      gap:clamp(8px, 2vw, 12px); 
      color:${accent}; 
      font-weight:700; 
      letter-spacing:clamp(1.5px, 0.3vw, 2.5px);
      text-transform:uppercase; 
      font-size:clamp(11px, 2vw, 13px); 
      margin:clamp(8px, 2vw, 12px) 0 clamp(14px, 3vw, 20px); 
    }
    
    .contact-prem-visit::before,
    .contact-prem-visit::after{ 
      content:""; 
      display:block; 
      width:clamp(20px, 4vw, 28px); 
      height:1px; 
      background:${hexToRgba(accent, .6)}; 
    }
    
    .contact-prem-visit span{ 
      display:inline-flex; 
      align-items:center; 
      gap:clamp(4px, 1vw, 8px); 
    }
    
    .contact-prem-visit span::before{ content:"✦"; font-size:10px; }
    .contact-prem-visit span::after{ content:"✦"; font-size:10px; }

    .contact-prem-info{ 
      display:grid; 
      gap:clamp(6px, 1.5vw, 10px); 
      margin:0 auto clamp(12px, 2vw, 18px); 
      font-size:clamp(13px, 2.5vw, 15px); 
      opacity:.95; 
      line-height:1.6;
    }
    
    .contact-prem-info a{ 
      color:${txt}; 
      text-decoration:none; 
      border-bottom:1px solid transparent;
      transition:all 0.2s ease;
    }
    
    .contact-prem-info a:hover{ 
      color:${accent}; 
      border-bottom-color:${hexToRgba(accent, .5)}; 
    }

    .contact-prem-orn-col{ 
      display:grid; 
      place-items:center; 
      gap:clamp(8px, 1.5vw, 12px); 
      margin:clamp(10px, 2vw, 16px) 0 clamp(18px, 3vw, 28px); 
    }
    
    .contact-prem-dot{ 
      width:2px; 
      height:clamp(12px, 2vw, 18px); 
      background:${hexToRgba(accent, .5)}; 
    }
    
    .contact-prem-star{ 
      color:${accent}; 
      font-size:clamp(12px, 2vw, 16px); 
      line-height:1; 
    }

    .contact-prem-nl{ 
      max-width:560px; 
      margin:0 auto; 
    }
    
    .contact-prem-nl h3{ 
      font-family:${fontHead}; 
      color:${txt}; 
      font-size:clamp(20px, 4vw, 28px); 
      margin:0 0 clamp(6px, 1.5vw, 10px);
      font-weight:600;
    }
    
    .contact-prem-nl p{ 
      margin:0 0 clamp(14px, 3vw, 20px); 
      color:${hexToRgba(txt, .85)}; 
      font-size:clamp(13px, 2.5vw, 15px);
    }
    
    .contact-prem-nl-row{ 
      display:flex; 
      gap:clamp(8px, 2vw, 12px); 
      flex-wrap:wrap;
    }
    
    .contact-prem-nl input{ 
      flex:1; 
      min-width:200px;
      padding:clamp(12px, 2vw, 14px) clamp(14px, 2.5vw, 18px); 
      border-radius:clamp(8px, 1.5vw, 10px); 
      border:1px solid ${hexToRgba(accent, .35)};
      background:${hexToRgba(txt, .04)}; 
      color:${txt}; 
      outline:none;
      font-size:clamp(13px, 2.5vw, 15px);
      transition:all 0.2s ease;
    }
    
    .contact-prem-nl input:focus{
      border-color:${accent};
      background:${hexToRgba(txt, .06)};
    }
    
    .contact-prem-nl input::placeholder{ 
      color:${hexToRgba(txt, .6)}; 
    }
    
    .contact-prem-nl button{ 
      padding:clamp(12px, 2vw, 14px) clamp(16px, 3vw, 22px); 
      border-radius:clamp(8px, 1.5vw, 10px); 
      border:1px solid ${accent}; 
      background:${accent};
      color:${bg}; 
      font-weight:700; 
      letter-spacing:.5px; 
      cursor:pointer;
      font-size:clamp(12px, 2.5vw, 14px);
      transition:all 0.2s ease;
    }
    
    .contact-prem-nl button:hover{ 
      background:${hexToRgba(accent, .9)};
      transform:translateY(-1px);
      box-shadow:0 4px 12px ${hexToRgba(accent, .3)};
    }

    /* Móvil: contenido primero, luego solo óvalo izquierdo */
    @media(max-width:1023px){
      .contact-prem-center{ order:1; }
      .contact-prem-oval-left{ order:2; }
      .contact-prem-oval-right{ display:none; }
      .contact-prem-wrap{ gap:clamp(32px, 6vw, 48px); }
    }

    /* Desktop: 3 columnas y se muestran los 2 óvalos */
    @media(min-width:1024px){ 
      .contact-prem-wrap{ 
        display:grid; 
        grid-template-columns: minmax(180px, 230px) 1fr minmax(180px, 230px); 
        gap:clamp(32px, 5vw, 64px); 
        align-items:center;
      } 
      .contact-prem-center{ order:0; }
      .contact-prem-oval-left,
      .contact-prem-oval-right{ display:block; }
    }
  `;

  return (
    <section className="contact-prem-root" aria-label="Contact section">
      <style>{styles}</style>
      <div className="contact-prem-wrap">
        {/* Óvalo izquierdo → 1ª slide del hero (también el único visible en móvil) */}
        <figure className="contact-prem-oval contact-prem-oval-left" aria-hidden="true">
          <img src={PH_LEFT} alt="" loading="lazy" />
        </figure>

        {/* Centro */}
        <div className="contact-prem-center">
          <div className="contact-prem-brand">
            {restaurant?.logo_url ? (
              <img src={restaurant.logo_url} alt={restaurant?.name || 'Logo'} />
            ) : (
              <h3
                style={{
                  margin: 0,
                  color: accent,
                  fontFamily: fontHead,
                  fontSize: 'clamp(20px, 4vw, 28px)',
                }}
              >
                {restaurant?.name || 'Restaurant'}
              </h3>
            )}
          </div>

          <div className="contact-prem-visit">
            <span>{translations?.contact_visit_us || 'VISIT US'}</span>
          </div>

          <div className="contact-prem-info">
            {address && <div>{address}</div>}
            {openingCompact && (
              <div>{(translations?.contact_daily || 'Daily')} - {openingCompact}</div>
            )}
            {email && (
              <div>
                <a href={`mailto:${email}`}>{email}</a>
              </div>
            )}
            {(phone || restaurantDetails?.whatsapp_number) && (
              <div>
                <a href={`tel:${phone || restaurantDetails?.whatsapp_number}`}>
                  {(translations?.contact_booking || 'Booking Request')} : {phone || restaurantDetails?.whatsapp_number}
                </a>
              </div>
            )}
            {restaurantDetails?.google_maps_url && (
              <div>
                <a
                  href={restaurantDetails.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {translations?.contact_directions || 'Get directions'}
                </a>
              </div>
            )}
          </div>

          <div className="contact-prem-orn-col" aria-hidden="true">
            <span className="contact-prem-dot" />
            <span className="contact-prem-star">✦</span>
            <span className="contact-prem-dot" />
          </div>

          {showNewsletter && (
            <div className="contact-prem-nl" role="form" aria-label="Newsletter">
              <h3>{translations?.contact_newsletter_title || 'Our Newsletter'}</h3>
              <p>
                {translations?.contact_newsletter_text ||
                  'Subscribe us & Get 25% Off. Get latest updates.'}
              </p>
              <div className="contact-prem-nl-row">
                <input
                  type="email"
                  placeholder={
                    translations?.contact_newsletter_placeholder || 'Enter Your Email'
                  }
                  required
                />
                <button type="button">
                  {translations?.contact_subscribe || 'SUBSCRIBE'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Óvalo derecho → 2ª slide del hero (solo desktop) */}
        <figure className="contact-prem-oval contact-prem-oval-right" aria-hidden="true">
          <img src={PH_RIGHT} alt="" loading="lazy" />
        </figure>
      </div>
    </section>
  );
}
