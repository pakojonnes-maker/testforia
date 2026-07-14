// src/pages/GuidebookPage.tsx — Guest-facing guidebook
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { fetchGuidebook, trackSessionStart, trackSessionEnd, trackIntent, trackSectionView } from '../lib/api';

import WelcomeHero from '../components/WelcomeHero';
import QuickInfoBar from '../components/QuickInfoBar';
import NavigationTabs from '../components/NavigationTabs';
import InfoSection from '../components/InfoSection';
import DiscoverSection from '../components/DiscoverSection';
import EatSection from '../components/EatSection';
import ServicesSection from '../components/ServicesSection';
import { getTranslation } from '../lib/i18n';

// Types
interface GuidebookData {
  apartment: {
    id: string; name: string; slug: string; address: string;
    cover_image_url: string;
    info: Array<{ id: string; key: string; icon: string; title: string; content: string; media: any[] }>;
  };
  zone: { id: string; name: string; slug: string; region: string; description: string; cover_image_url: string };
  agency: { 
    id: string; name: string; logo_url: string; 
    primary_color: string | null; secondary_color: string | null; accent_color: string | null;
  };
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
    service_subcategory: string | null;
    action_type: string; action_data: string; prefilled_message: string;
    price_display: string; is_featured: boolean; cta_label: string;
    cover_image_url?: string;
  }>;
  meta: { lang: string; available_langs: string[]; active_devices_24h?: number };
}

type TabKey = 'info' | 'discover' | 'restaurants' | 'services';

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

  // Handle agency theming
  useEffect(() => {
    if (data?.agency?.primary_color) {
      document.documentElement.style.setProperty('--brand-primary', data.agency.primary_color);
      document.documentElement.style.setProperty('--brand-secondary', data.agency.secondary_color || data.agency.primary_color);
    } else {
      // Reset to defaults
      document.documentElement.style.setProperty('--brand-primary', 'var(--mar-azul)');
      document.documentElement.style.setProperty('--brand-secondary', 'var(--mar-profundo)');
    }
  }, [data?.agency]);

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
  }, [data?.apartment?.id, lang]);

  // Track section view when tab changes
  useEffect(() => {
    if (data?.apartment?.id) {
      trackSectionView(data.apartment.id, sessionIdRef.current, activeTab);
      // Scroll to top of tab content smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab, data?.apartment?.id]);

  // Track intent
  const logIntent = (targetType: 'restaurant' | 'experience' | 'product', targetId: string, action: string) => {
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p style={{ fontSize: '0.9rem', opacity: 0.8, fontWeight: 600 }}>{getTranslation('loading', lang)}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="loading-container" style={{ background: 'var(--blanco-puro)' }}>
        <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--mar-claro)', lineHeight: 1 }}>404</div>
        <p style={{ fontSize: '1rem', color: 'var(--gris-texto)', marginTop: 'var(--sp-md)' }}>
          {error || 'Guidebook no encontrado'}
        </p>
      </div>
    );
  }

  const { apartment, zone, agency, pois, restaurants, experiences } = data;

  return (
    <div className="guide-app">
      <WelcomeHero 
        apartmentName={apartment.name}
        address={apartment.address}
        coverImageUrl={apartment.cover_image_url}
        agencyLogoUrl={agency.logo_url}
        agencyName={agency.name}
        currentLang={lang}
        onLanguageChange={handleLanguageChange}
        brandPrimaryColor={agency.primary_color || undefined}
      />

      <NavigationTabs 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        lang={lang} 
      />

      <div style={{ minHeight: '50vh' }}>
        {activeTab === 'info' && (
          <div style={{ animation: 'fadeIn 0.4s ease forwards' }}>
            <QuickInfoBar infoItems={apartment.info} lang={lang} />
            <InfoSection infoItems={apartment.info} lang={lang} />
          </div>
        )}

        {activeTab === 'discover' && (
          <DiscoverSection 
            pois={pois} 
            zoneName={zone.name} 
            zoneDescription={zone.description} 
            lang={lang} 
            onIntent={(type, id, action) => logIntent(type, id, action)} 
          />
        )}

        {activeTab === 'restaurants' && (
          <EatSection 
            restaurants={restaurants} 
            zoneName={zone.name} 
            lang={lang} 
            onIntent={(type, id, action) => logIntent(type, id, action)} 
          />
        )}

        {activeTab === 'services' && (
          <ServicesSection 
            experiences={experiences} 
            zoneName={zone.name} 
            lang={lang} 
            onIntent={(type, id, action) => logIntent(type, id, action)} 
          />
        )}
      </div>

      <footer style={{
        textAlign: 'center',
        padding: '32px 16px',
        marginTop: 'var(--sp-2xl)',
        fontSize: '0.75rem',
        color: 'var(--gris-medio)'
      }}>
        <p>Powered by <a href="https://visualtastes.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>VisualTastes Guidebook</a></p>
      </footer>
    </div>
  );
}
