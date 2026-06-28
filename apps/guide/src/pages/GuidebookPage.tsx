// src/pages/GuidebookPage.tsx — Guest-facing guidebook
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { fetchGuidebook, trackSessionStart, trackSessionEnd, trackIntent, buildWhatsAppUrl } from '../lib/api';

// Types
interface GuidebookData {
  apartment: {
    id: string; name: string; slug: string; address: string;
    cover_image_url: string;
    info: Array<{ id: string; key: string; icon: string; title: string; content: string; media: any[] }>;
  };
  zone: { id: string; name: string; slug: string; region: string; description: string; cover_image_url: string };
  agency: { id: string; name: string; logo_url: string };
  pois: Array<{
    id: string; name: string; description: string; category: string;
    google_maps_url: string; media: any[];
  }>;
  restaurants: Array<{
    id: string; name: string; slug: string; cuisine_type: string;
    tier: string; cover_image: string;
  }>;
  experiences: Array<{
    id: string; name: string; description: string; category: string;
    action_type: string; action_data: string; prefilled_message: string;
    price_display: string; is_featured: boolean; cta_label: string;
  }>;
  meta: { lang: string; available_langs: string[] };
}

type TabKey = 'info' | 'discover' | 'restaurants' | 'experiences';

const LANG_FLAGS: Record<string, string> = {
  es: '🇪🇸', en: '🇬🇧', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹', pt: '🇵🇹',
  nl: '🇳🇱', ru: '🇷🇺', zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷', ar: '🇸🇦',
};

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  es: { viewpoint: 'Mirador', beach: 'Playa', monument: 'Monumento', park: 'Parque', water_sport: 'Acuático', adventure: 'Aventura', class: 'Clase' },
  en: { viewpoint: 'Viewpoint', beach: 'Beach', monument: 'Monument', park: 'Park', water_sport: 'Water Sport', adventure: 'Adventure', class: 'Class' },
};

const MENU_URL = import.meta.env.VITE_MENU_URL || 'https://menu.visualtastes.com';

export default function GuidebookPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<GuidebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState(() => {
    const browserLang = navigator.language?.split('-')[0] || 'es';
    return ['es', 'en', 'fr', 'de', 'it', 'pt', 'nl'].includes(browserLang) ? browserLang : 'es';
  });
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const sessionIdRef = useRef<string | null>(null);

  // Fetch guidebook data
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);

    fetchGuidebook(slug, lang)
      .then(result => {
        if (!cancelled && result.success) {
          setData(result);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [slug, lang]);

  // Track session
  useEffect(() => {
    if (!data?.apartment?.id) return;

    trackSessionStart(data.apartment.id, lang).then(res => {
      if (res?.sessionId) sessionIdRef.current = res.sessionId;
    });

    const handleUnload = () => {
      if (sessionIdRef.current) trackSessionEnd(sessionIdRef.current);
    };
    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && sessionIdRef.current) {
        trackSessionEnd(sessionIdRef.current);
      }
    });

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      if (sessionIdRef.current) trackSessionEnd(sessionIdRef.current);
    };
  }, [data?.apartment?.id]);

  // Track intent
  const logIntent = (targetType: 'restaurant' | 'experience', targetId: string, action: string) => {
    if (!data?.apartment?.id) return;
    trackIntent({
      sessionId: sessionIdRef.current || undefined,
      apartmentId: data.apartment.id,
      targetType,
      targetId,
      actionTaken: action,
    });
  };

  const handleLanguageChange = (newLang: string) => {
    setLang(newLang);
  };

  const getCategoryLabel = (cat: string) => {
    return CATEGORY_LABELS[lang]?.[cat] || CATEGORY_LABELS['en']?.[cat] || cat;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Cargando guidebook...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="error-screen">
        <div className="error-screen__code">404</div>
        <p className="error-screen__message">
          {error || 'Guidebook no encontrado'}
        </p>
      </div>
    );
  }

  const { apartment, zone, agency, pois, restaurants, experiences } = data;

  return (
    <div className="guide-page">
      {/* Hero */}
      <header className="guide-hero">
        <div className="guide-hero__agency">
          {agency.logo_url && <img src={agency.logo_url} alt="" style={{ width: 20, height: 20, borderRadius: 4 }} />}
          <span>{agency.name}</span>
        </div>
        <h1 className="guide-hero__title">{apartment.name}</h1>
        {apartment.address && (
          <p className="guide-hero__address">
            <span className="material-icons-round" style={{ fontSize: 16 }}>location_on</span>
            {apartment.address}
          </p>
        )}
        {/* Language bar */}
        <div className="guide-hero__lang-bar">
          {['es', 'en', 'fr', 'de', 'it', 'pt'].map(code => (
            <button
              key={code}
              className={`guide-hero__lang-btn ${lang === code ? 'guide-hero__lang-btn--active' : ''}`}
              onClick={() => handleLanguageChange(code)}
            >
              {LANG_FLAGS[code]} {code.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* Wave separator */}
      <svg className="guide-wave" viewBox="0 0 1440 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,0 C360,50 1080,50 1440,0 L1440,50 L0,50 Z" fill="#FAFBFE" />
        <path d="M0,0 C360,50 1080,50 1440,0" stroke="none" fill="#1565C0" />
      </svg>

      {/* Tabs */}
      <nav className="guide-tabs">
        <button className={`guide-tab ${activeTab === 'info' ? 'guide-tab--active' : ''}`} onClick={() => setActiveTab('info')}>
          <span className="material-icons-round">home</span>
          {lang === 'en' ? 'Info' : 'Info'}
        </button>
        <button className={`guide-tab ${activeTab === 'discover' ? 'guide-tab--active' : ''}`} onClick={() => setActiveTab('discover')}>
          <span className="material-icons-round">explore</span>
          {lang === 'en' ? 'Discover' : 'Descubrir'}
        </button>
        <button className={`guide-tab ${activeTab === 'restaurants' ? 'guide-tab--active' : ''}`} onClick={() => setActiveTab('restaurants')}>
          <span className="material-icons-round">restaurant</span>
          {lang === 'en' ? 'Eat' : 'Comer'}
        </button>
        <button className={`guide-tab ${activeTab === 'experiences' ? 'guide-tab--active' : ''}`} onClick={() => setActiveTab('experiences')}>
          <span className="material-icons-round">local_activity</span>
          {lang === 'en' ? 'Activities' : 'Actividades'}
        </button>
      </nav>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <section className="info-cards">
          {apartment.info.length > 0 ? (
            apartment.info.map(item => (
              <div key={item.id} className="info-card">
                <div className="info-card__icon">
                  <span className="material-icons-round">{item.icon || 'info'}</span>
                </div>
                <div className="info-card__content">
                  <div className="info-card__title">{item.title}</div>
                  <div className="info-card__text">{item.content}</div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--gris-medio)' }}>
              <span className="material-icons-round" style={{ fontSize: 48, opacity: 0.3 }}>info</span>
              <p style={{ marginTop: 8 }}>
                {lang === 'en' ? 'No apartment info available yet.' : 'Sin información del apartamento todavía.'}
              </p>
            </div>
          )}
        </section>
      )}

      {activeTab === 'discover' && (
        <section className="poi-section">
          <h2 className="section-title">
            {lang === 'en' ? `Explore ${zone.name}` : `Explora ${zone.name}`}
          </h2>
          {zone.description && (
            <p className="section-subtitle">{zone.description}</p>
          )}
          <div className="poi-grid">
            {pois.map(poi => (
              <div key={poi.id} className="poi-card">
                {poi.media?.[0] ? (
                  <img className="poi-card__image" src={poi.media[0].url} alt={poi.name} />
                ) : (
                  <div className="poi-card__image" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span className="material-icons-round" style={{ fontSize: 48, color: 'var(--azul-ocean)', opacity: 0.4 }}>photo_camera</span>
                  </div>
                )}
                <div className="poi-card__body">
                  <span className="poi-card__category">{getCategoryLabel(poi.category)}</span>
                  <h3 className="poi-card__name">{poi.name}</h3>
                  <p className="poi-card__desc">{poi.description}</p>
                  {poi.google_maps_url && (
                    <div className="poi-card__actions">
                      <a
                        href={poi.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="poi-card__maps-btn"
                        onClick={() => logIntent('experience', poi.id, 'click_directions')}
                      >
                        <span className="material-icons-round" style={{ fontSize: 16 }}>directions</span>
                        {lang === 'en' ? 'Directions' : 'Cómo llegar'}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'restaurants' && (
        <section className="restaurant-section">
          <h2 className="section-title" style={{ color: 'var(--azul-deep)' }}>
            {lang === 'en' ? `Where to eat in ${zone.name}` : `Dónde comer en ${zone.name}`}
          </h2>
          {restaurants.length > 0 ? (
            restaurants.map(r => (
              <a
                key={r.id}
                href={`${MENU_URL}/${r.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="restaurant-card"
                onClick={() => logIntent('restaurant', r.id, 'click_menu')}
              >
                <div className="restaurant-card__image" style={
                  r.cover_image ? { backgroundImage: `url(${r.cover_image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}
                }>
                  {!r.cover_image && (
                    <span className="material-icons-round" style={{ fontSize: 28, color: 'white', margin: 'auto', display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>restaurant</span>
                  )}
                </div>
                <div className="restaurant-card__info">
                  <div className="restaurant-card__name">{r.name}</div>
                  {r.cuisine_type && <div className="restaurant-card__cuisine">{r.cuisine_type}</div>}
                  {r.tier === 'featured' && (
                    <span className="restaurant-card__featured">
                      ⭐ {lang === 'en' ? 'Recommended' : 'Recomendado'}
                    </span>
                  )}
                </div>
                <span className="material-icons-round restaurant-card__arrow">chevron_right</span>
              </a>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--gris-medio)' }}>
              <span className="material-icons-round" style={{ fontSize: 48, opacity: 0.3 }}>restaurant</span>
              <p style={{ marginTop: 8 }}>
                {lang === 'en' ? 'No restaurants listed yet.' : 'Sin restaurantes listados todavía.'}
              </p>
            </div>
          )}
        </section>
      )}

      {activeTab === 'experiences' && (
        <section className="experience-section">
          <h2 className="section-title">
            {lang === 'en' ? `Things to do in ${zone.name}` : `Qué hacer en ${zone.name}`}
          </h2>
          {experiences.length > 0 ? (
            experiences.map(exp => (
              <div key={exp.id} className={`experience-card ${exp.is_featured ? 'experience-card--featured' : ''}`}>
                <div className="experience-card__body">
                  {exp.is_featured && (
                    <div className="experience-card__featured-badge">
                      ⭐ {lang === 'en' ? 'Popular' : 'Popular'}
                    </div>
                  )}
                  <div className="experience-card__header">
                    <h3 className="experience-card__name">{exp.name}</h3>
                    {exp.price_display && (
                      <span className="experience-card__price">{exp.price_display}</span>
                    )}
                  </div>
                  <p className="experience-card__desc">{exp.description}</p>
                  <CTAButton
                    experience={exp}
                    lang={lang}
                    onIntent={(action) => logIntent('experience', exp.id, action)}
                  />
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--gris-medio)' }}>
              <span className="material-icons-round" style={{ fontSize: 48, opacity: 0.3 }}>explore</span>
              <p style={{ marginTop: 8 }}>
                {lang === 'en' ? 'No activities listed yet.' : 'Sin actividades listadas todavía.'}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '24px 16px',
        background: 'var(--blanco-arena)',
        borderTop: '1px solid var(--gris-suave)',
        fontSize: '0.75rem',
        color: 'var(--gris-medio)'
      }}>
        <p>Powered by <a href="https://visualtastes.com" target="_blank" rel="noopener" style={{ color: 'var(--azul-ocean)', fontWeight: 600 }}>VisualTastes</a></p>
      </footer>
    </div>
  );
}

// CTA Button component — polymorphic based on action_type
function CTAButton({ experience, lang, onIntent }: {
  experience: any;
  lang: string;
  onIntent: (action: string) => void;
}) {
  const { action_type, action_data, prefilled_message, cta_label } = experience;

  const handleClick = () => {
    switch (action_type) {
      case 'WHATSAPP': {
        const url = buildWhatsAppUrl(action_data, prefilled_message);
        onIntent('click_whatsapp');
        window.open(url, '_blank');
        break;
      }
      case 'URL':
        onIntent('click_url');
        window.open(action_data, '_blank');
        break;
      case 'PHONE':
        onIntent('click_phone');
        window.location.href = `tel:${action_data}`;
        break;
      default:
        onIntent('click_other');
        break;
    }
  };

  const getIconName = () => {
    switch (action_type) {
      case 'WHATSAPP': return '💬';
      case 'URL': return '🌐';
      case 'PHONE': return '📞';
      default: return '→';
    }
  };

  const ctaClass = action_type === 'WHATSAPP'
    ? 'experience-card__cta--whatsapp'
    : action_type === 'PHONE'
      ? 'experience-card__cta--phone'
      : 'experience-card__cta--url';

  return (
    <button className={`experience-card__cta ${ctaClass}`} onClick={handleClick}>
      <span>{getIconName()}</span>
      {cta_label}
    </button>
  );
}
